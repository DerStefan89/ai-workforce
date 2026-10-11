/**
 * Datei: src/harness-abgleich/index.ts
 *
 * Zweck: Harness-Abgleich (F45 B1b-2, Beleg 12 in docs/projekt/fixpaket-f45.md). Liest das Inventar des
 * Projekt-Harness (DoD-Punkte aus CLAUDE.md, Hooks aus .claude/settings.json, Agents, Skills, Commands), legt die
 * versionierte Zuordnung (harness-abgleich/standard.json, optional eine Projektdatei aus der Startvorlage)
 * darüber und zitiert vorhandene Laufdaten (Workflow-Schritte, Prüfergebnis, Laufakten-Beobachtung). Jeder
 * Eintrag wird „wirksam“, „wirksam ohne Beleg“, „ersetzt durch <Schritt>“, „bewusst nicht“ oder „offen“.
 * Deterministisch: kein Modell, kein Urteil — was die Zuordnung nicht kennt, ist offen.
 *
 * Bewertung (Plan v2, features/F45/plan-b1b2.md):
 * - wirksam/statisch: Nachweis außerhalb des Laufs; bei Hooks nur, wenn Skript-Hash und Matcher dem Nachweis
 *   entsprechen, sonst „ohne Beleg“.
 * - wirksam/pruefschritt: Prüfergebnis GRÜN → wirksam; ROT/ZEITGRENZE/FEHLER → offen (negativer Beleg); keins →
 *   „ohne Beleg“.
 * - ersetzt_durch: nur, wenn der Schritt dieser Rolle im Ablauf ERFOLGREICH lief; steht er im Ablauf und lief
 *   nicht → offen; fehlt er → offen, außer die Zuordnung nennt `fehlt_im_ablauf` (→ bewusst nicht).
 * - bestanden (Beleg 12): mit Laufbelegen kein Eintrag offen und keiner ohne Beleg; ohne Laufbelege null.
 * - Liest der Kern den Harness des Arbeitsordners, vergleicht er ihn mit dem des Projektordners: was dort steht und im
 *   Arbeitsordner fehlt, ist offen („im Lauf entfernt“).
 *
 * Nicht im Inventar (bewusst): ARCHITECTURE.md §8 (projektspezifische DoD-Ergänzungen), settings.local.json und
 * der Block permissions — der Lauf startet mit --setting-sources project, Werkzeugrechte setzt der Werkzeugsatz.
 *
 * Wird aufgerufen von:
 * - scripts/leitstand-server.mjs (Kettenende: Artefakt 'harness-abgleich-<workflowId>'; GET
 *   /api/workflows/<id>/harness-abgleich; Feld abgleich in GET /api/harness)
 * - features/F45/nachweise/b1b2/abgleich-nachweis.mjs (Nachweis)
 * - src/harness-abgleich/harness-abgleich.test.ts (node:test)
 *
 * Wichtig:
 * - Rein lesend: keine Datei wird geschrieben, kein Prozess gestartet. Das Inventar wirft nie — jede fehlende,
 *   unlesbare oder nach außen verknüpfte Quelle wird ein eigener Eintrag (art 'quelle', immer offen).
 * - Der Befehl eines Hooks wird nicht übernommen (er könnte Geheimnisse tragen); Schlüssel ist der Skriptname.
 * - Die DoD-ID ist ein Kurz-Hash des normalisierten Texts: ändert sich der Wortlaut in CLAUDE.md, wird der Punkt
 *   offen, bis die Zuordnung nachgezogen ist (gewollt — sichtbar statt still).
 * - Validatoren handgeschrieben (Muster src/pruefschritt validierePruefergebnisDaten), keine Abhängigkeit.
 */

import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { isAbsolute, join, relative, sep } from 'node:path'
import { sha256Hex } from '../checkpoint-store/index.ts'
import { mcpServerName, zaehleNamen } from '../claude-code-gateway/index.ts'
import type {
  AbgleichBeleg,
  AbgleichEintrag,
  AbgleichErsatz,
  AbgleichStatus,
  AbgleichZaehlung,
  BelegArt,
  BeobachtungSicht,
  FaehigkeitenKurzliste,
  GeladeneZuordnung,
  HarnessArt,
  InventarArt,
  InventarEintrag,
  Laufbelege,
  OffenGrund,
  ZuordnungBeleg,
  ZuordnungEintrag,
} from './types.ts'

/** Zuordnung des Standards, relativ zur Installation von ai-workforce. */
export const STANDARD_ZUORDNUNG_PFAD = 'harness-abgleich/standard.json'

/** Harness-Arten, die eine Zuordnung tragen können. */
export const HARNESS_ARTEN: readonly HarnessArt[] = ['dod', 'hook', 'agent', 'skill', 'command']

/** Anzeige-/Ergebnisreihenfolge der Arten (offen-Zeilen stehen davor). */
const ART_REIHENFOLGE: readonly InventarArt[] = ['quelle', 'dod', 'hook', 'agent', 'skill', 'command']


const ZUORDNUNG_STATUS = new Set(['wirksam', 'ersetzt_durch', 'bewusst_nicht'])
const BELEG_ARTEN = new Set<BelegArt>(['statisch', 'pruefschritt'])
const ABGLEICH_STATUS = new Set<AbgleichStatus>(['wirksam', 'wirksam_ohne_beleg', 'ersetzt_durch', 'bewusst_nicht', 'offen'])
const OFFEN_GRUENDE = new Set<OffenGrund>(['nicht_in_zuordnung', 'quelle_fehlerhaft', 'zuordnung_fehlerhaft', 'beleg_negativ', 'ersatz_nicht_gelaufen', 'ersatz_fehlt', 'im_lauf_entfernt'])
const ERSATZ_LAGEN = new Set(['gelaufen', 'nicht_gelaufen', 'nicht_im_ablauf'])
const SHA256 = /^[0-9a-f]{64}$/

function istObjekt(wert: unknown): wert is Record<string, unknown> {
  return typeof wert === 'object' && wert !== null && !Array.isArray(wert)
}

function istNichtLeererString(wert: unknown): wert is string {
  return typeof wert === 'string' && wert.trim().length > 0
}

/**
 * Text eines Fehlers für einen Eintrag (ohne Stack).
 * @param fehler - gefangener Wert
 * @returns Meldung
 */
function fehlerText(fehler: unknown): string {
  return fehler instanceof Error ? fehler.message : String(fehler)
}

/**
 * Schlüssel eines Eintrags in der Zuordnung.
 * @param art - Harness-Art
 * @param name - Name bzw. DoD-ID
 * @returns 'art:name'
 */
export function zuordnungsSchluessel(art: string, name: string): string {
  return `${art}:${name}`
}

/**
 * Normalisiert den Text eines DoD-Punkts: Aufzählungs- und Kästchen-Präfix weg, Leerraum zusammengefasst.
 * @param roh - Text des Punkts (Folgezeilen bereits mit Leerzeichen verbunden)
 * @returns normalisierter Text
 */
export function normalisiereDodText(roh: string): string {
  return roh
    .replace(/^\s*[-*]\s+/, '')
    .replace(/^\[[ xX]\]\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Stabile ID eines DoD-Punkts: 'dod-' + erste 8 Hex des SHA-256 des normalisierten Texts.
 * @param text - Text des Punkts (wird normalisiert)
 * @returns ID
 */
export function dodId(text: string): string {
  return `dod-${sha256Hex(normalisiereDodText(text)).slice(0, 8)}`
}

/**
 * Liest die DoD-Punkte aus dem Text einer CLAUDE.md: der Abschnitt unter der ersten Überschrift
 * „Definition of Done“ (beliebige Ebene) bis zur nächsten Überschrift oder einer Linie '---'. Jeder
 * Aufzählungspunkt mit seinen eingerückten Folgezeilen wird ein Punkt.
 * @param text - Inhalt der CLAUDE.md
 * @returns { ok: true, punkte: [{ id, text }] } oder { ok: false, grund }
 */
export function leseDodPunkte(text: string): { ok: true; punkte: { id: string; text: string }[] } | { ok: false; grund: string } {
  const zeilen = text.split(/\r?\n/)
  const start = zeilen.findIndex((z) => /^#{1,6}\s+Definition of Done\s*$/i.test(z.trim()))
  if (start === -1) return { ok: false, grund: 'kein Abschnitt „Definition of Done“' }
  const roh: string[] = []
  for (const zeile of zeilen.slice(start + 1)) {
    if (/^#{1,6}\s/.test(zeile) || /^-{3,}\s*$/.test(zeile)) break
    if (/^\s{0,3}[-*]\s+/.test(zeile)) roh.push(zeile)
    else if (roh.length > 0 && /^\s+\S/.test(zeile)) roh[roh.length - 1] += ` ${zeile.trim()}`
  }
  const punkte = roh.map(normalisiereDodText).filter((t) => t.length > 0)
  if (punkte.length === 0) return { ok: false, grund: 'Abschnitt „Definition of Done“ ohne Aufzählungspunkte' }
  return { ok: true, punkte: punkte.map((t) => ({ id: dodId(t), text: t })) }
}

/**
 * Inventar-Eintrag mit allen Pflichtfeldern.
 * @param art - Art
 * @param name - Name
 * @param quelle - Datei
 * @param extra - weitere Felder
 * @returns Eintrag
 */
function eintrag(art: InventarArt, name: string, quelle: string, extra: Partial<InventarEintrag> = {}): InventarEintrag {
  return { art, name, quelle, detail: null, ereignis: null, matcher: null, skript_sha256: null, grund: null, ...extra }
}

/**
 * Liegt ein Pfad (nach realpath) unter der Wurzel (nach realpath)?
 * @param wurzelReal - realpath der Wurzel
 * @param pfad - zu prüfender Pfad (existiert)
 * @returns true, wenn innerhalb
 */
function liegtUnter(wurzelReal: string, pfad: string): boolean {
  const rel = relative(wurzelReal, realpathSync(pfad))
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel))
}

/**
 * Liest eine Datei unter der Wurzel als Text; eine Verknüpfung nach außen ist ein Fehler.
 * @param wurzelReal - realpath der Wurzel
 * @param pfad - absoluter Pfad
 * @returns Inhalt
 */
function leseInnen(wurzelReal: string, pfad: string): Buffer {
  if (!liegtUnter(wurzelReal, pfad)) throw new Error('Verknüpfung nach außerhalb des Projektordners')
  return readFileSync(pfad)
}

/**
 * Hook-Einträge aus dem geparsten Inhalt einer settings.json: je Ereignis, Matcher-Eintrag und Befehl einer.
 * Name = Dateiname des Skripts unter .claude/hooks/ ohne Endung; ohne erkennbares Skript 'ohne-skript-<8 Hex>'
 * (Hash des Befehls — der Befehl selbst wird nicht übernommen).
 * @param settings - geparste settings.json
 * @param quelle - repo-relativer Pfad (für die Einträge)
 * @param hashFuer - liefert den SHA-256 einer Hook-Datei zu ihrem Dateinamen, oder null
 * @returns Einträge; ein unlesbares hooks-Feld ergibt einen Eintrag art 'quelle'
 */
export function leseHookEintraege(settings: unknown, quelle: string, hashFuer: (dateiname: string) => string | null = () => null): InventarEintrag[] {
  if (!istObjekt(settings)) return [eintrag('quelle', quelle, quelle, { grund: 'Wurzel ist kein Objekt' })]
  const hooks = settings.hooks
  if (hooks === undefined) return []
  if (!istObjekt(hooks)) return [eintrag('quelle', quelle, quelle, { grund: "'hooks' ist kein Objekt" })]
  const ergebnis: InventarEintrag[] = []
  for (const [ereignis, gruppen] of Object.entries(hooks)) {
    if (!Array.isArray(gruppen)) {
      ergebnis.push(eintrag('quelle', `${quelle}#hooks.${ereignis}`, quelle, { grund: `'hooks.${ereignis}' ist keine Liste` }))
      continue
    }
    for (const gruppe of gruppen) {
      const matcher = istObjekt(gruppe) && typeof gruppe.matcher === 'string' ? gruppe.matcher : null
      const befehle = istObjekt(gruppe) && Array.isArray(gruppe.hooks) ? gruppe.hooks : null
      if (befehle === null) {
        ergebnis.push(eintrag('quelle', `${quelle}#hooks.${ereignis}`, quelle, { grund: `Eintrag unter 'hooks.${ereignis}' ohne Liste 'hooks'` }))
        continue
      }
      for (const hook of befehle) {
        const befehl = istObjekt(hook) && typeof hook.command === 'string' ? hook.command : null
        if (befehl === null) {
          ergebnis.push(eintrag('quelle', `${quelle}#hooks.${ereignis}`, quelle, { grund: `Hook unter 'hooks.${ereignis}' ohne 'command'` }))
          continue
        }
        const skript = befehl.match(/\.claude[\\/]+hooks[\\/]+([^\s"'\\/]+)/)?.[1] ?? null
        if (skript === null) {
          ergebnis.push(eintrag('hook', `ohne-skript-${sha256Hex(befehl).slice(0, 8)}`, quelle, { ereignis, matcher }))
          continue
        }
        ergebnis.push(eintrag('hook', skript.replace(/\.[^.]+$/, ''), `.claude/hooks/${skript}`, { ereignis, matcher, skript_sha256: hashFuer(skript) }))
      }
    }
  }
  return ergebnis
}

/**
 * Direkte Einträge eines Ordners (ohne Punktdateien), sortiert; ein fehlender Ordner ist leer, ein Ordner hinter
 * einer Verknüpfung nach außerhalb der Wurzel ein Fehler.
 * @param wurzelReal - realpath der Wurzel
 * @param ordner - absoluter Ordner
 * @returns { ok: true, namen } oder { ok: false, grund }
 */
function leseOrdner(wurzelReal: string, ordner: string): { ok: true; namen: { name: string; ordner: boolean }[] } | { ok: false; grund: string } {
  if (!existsSync(ordner)) return { ok: true, namen: [] }
  try {
    if (!liegtUnter(wurzelReal, ordner)) return { ok: false, grund: 'Verknüpfung nach außerhalb des Projektordners' }
    const namen = readdirSync(ordner, { withFileTypes: true })
      .filter((e) => !e.name.startsWith('.'))
      .map((e) => ({ name: e.name, ordner: e.isDirectory() }))
      .sort((a, b) => a.name.localeCompare(b.name))
    return { ok: true, namen }
  } catch (fehler) {
    return { ok: false, grund: fehlerText(fehler) }
  }
}

/**
 * Inventar des Projekt-Harness unter einer Wurzel. Wirft nie: jede fehlende, unlesbare oder nach außen
 * verknüpfte Quelle wird ein Eintrag art 'quelle' mit Grund. Fehlende Ordner agents/skills/commands sind kein Fehler.
 * @param wurzel - absoluter Projekt- oder Arbeitsordner
 * @returns Einträge in der Reihenfolge DoD, Hooks, Agents, Skills, Commands (Quellen-Fehler an ihrer Stelle)
 */
export function leseHarnessInventar(wurzel: string): InventarEintrag[] {
  let wurzelReal: string
  try {
    wurzelReal = realpathSync(wurzel)
  } catch (fehler) {
    return [eintrag('quelle', '.', '.', { grund: `Projektordner nicht lesbar: ${fehlerText(fehler)}` })]
  }
  const inventar: InventarEintrag[] = []

  const claudeMd = join(wurzelReal, 'CLAUDE.md')
  try {
    if (!existsSync(claudeMd)) inventar.push(eintrag('quelle', 'CLAUDE.md', 'CLAUDE.md', { grund: 'Datei fehlt' }))
    else {
      const dod = leseDodPunkte(leseInnen(wurzelReal, claudeMd).toString('utf8'))
      if (dod.ok) for (const p of dod.punkte) inventar.push(eintrag('dod', p.id, 'CLAUDE.md', { detail: p.text }))
      else inventar.push(eintrag('quelle', 'CLAUDE.md', 'CLAUDE.md', { grund: dod.grund }))
    }
  } catch (fehler) {
    inventar.push(eintrag('quelle', 'CLAUDE.md', 'CLAUDE.md', { grund: fehlerText(fehler) }))
  }

  const settingsRel = '.claude/settings.json'
  try {
    const settingsPfad = join(wurzelReal, '.claude', 'settings.json')
    if (!existsSync(settingsPfad)) inventar.push(eintrag('quelle', settingsRel, settingsRel, { grund: 'Datei fehlt' }))
    else {
      let geparst: unknown
      const text = leseInnen(wurzelReal, settingsPfad).toString('utf8')
      try {
        geparst = JSON.parse(text)
      } catch (fehler) {
        throw new Error(`kein gültiges JSON (${fehlerText(fehler)})`)
      }
      const hashFuer = (dateiname: string): string | null => {
        try {
          return createHash('sha256').update(leseInnen(wurzelReal, join(wurzelReal, '.claude', 'hooks', dateiname))).digest('hex')
        } catch {
          return null
        }
      }
      inventar.push(...leseHookEintraege(geparst, settingsRel, hashFuer))
    }
  } catch (fehler) {
    inventar.push(eintrag('quelle', settingsRel, settingsRel, { grund: fehlerText(fehler) }))
  }

  for (const [art, ordnerRel] of [
    ['agent', '.claude/agents'],
    ['skill', '.claude/skills'],
    ['command', '.claude/commands'],
  ] as const) {
    const gelesen = leseOrdner(wurzelReal, join(wurzelReal, ...ordnerRel.split('/')))
    if (!gelesen.ok) {
      inventar.push(eintrag('quelle', ordnerRel, ordnerRel, { grund: gelesen.grund }))
      continue
    }
    for (const { name, ordner } of gelesen.namen) {
      if (art === 'skill') {
        if (!ordner) continue
        const skillMd = join(wurzelReal, '.claude', 'skills', name, 'SKILL.md')
        let vorhanden = false
        try {
          vorhanden = existsSync(skillMd) && statSync(skillMd).isFile()
        } catch {
          vorhanden = false
        }
        if (vorhanden) inventar.push(eintrag('skill', name, `${ordnerRel}/${name}/SKILL.md`))
        else inventar.push(eintrag('quelle', `${ordnerRel}/${name}`, `${ordnerRel}/${name}`, { grund: 'Skill-Ordner ohne SKILL.md' }))
      } else if (!ordner && name.endsWith('.md') && name.length > 3) {
        inventar.push(eintrag(art, name.slice(0, -3), `${ordnerRel}/${name}`))
      }
    }
  }
  return inventar
}

/**
 * Prüft einen relativen Pfad (statischer Beleg, Projektdatei der Zuordnung): nicht leer, nicht absolut, kein
 * '..', kein Backslash.
 * @param pfad - Wert
 * @returns Grund oder null
 */
export function pruefeRelativenPfad(pfad: unknown): string | null {
  if (!istNichtLeererString(pfad)) return 'muss ein nicht-leerer String sein'
  if (isAbsolute(pfad) || /^[a-zA-Z]:/.test(pfad) || pfad.startsWith('/')) return 'muss relativ sein'
  if (pfad.includes('\\')) return "muss '/' als Trenner nutzen"
  if (pfad.split('/').includes('..')) return "darf kein '..' enthalten"
  return null
}

/**
 * Prüft die Felder eines Zuordnungseintrags mit Status wirksam.
 * @param e - Eintrag
 * @param ort - Ortsangabe
 * @param verstoesse - Sammlung
 */
function pruefeWirksam(e: Record<string, unknown>, ort: string, verstoesse: string[]): void {
  if ('schritt' in e || 'fehlt_im_ablauf' in e) verstoesse.push(`${ort}: 'schritt'/'fehlt_im_ablauf' gehören zu ersetzt_durch`)
  const b = e.beleg
  if (!istObjekt(b)) {
    verstoesse.push(`${ort}.beleg ist bei wirksam Pflicht`)
    return
  }
  for (const feld of Object.keys(b)) if (!['art', 'quelle', 'skript_sha256', 'matcher'].includes(feld)) verstoesse.push(`${ort}.beleg: unbekanntes Feld '${feld}'`)
  if (!BELEG_ARTEN.has(b.art as BelegArt)) verstoesse.push(`${ort}.beleg.art muss statisch oder pruefschritt sein`)
  if (b.art === 'statisch') {
    const grund = pruefeRelativenPfad(b.quelle)
    if (grund !== null) verstoesse.push(`${ort}.beleg.quelle ${grund}`)
    if (e.art === 'hook') {
      if (typeof b.skript_sha256 !== 'string' || !SHA256.test(b.skript_sha256)) verstoesse.push(`${ort}.beleg.skript_sha256 (64 Hex) ist bei Hooks Pflicht`)
      if (!('matcher' in b) || (b.matcher !== null && !istNichtLeererString(b.matcher))) verstoesse.push(`${ort}.beleg.matcher ist bei Hooks Pflicht (Text, null für Ereignisse ohne Matcher)`)
    } else if ('skript_sha256' in b || 'matcher' in b) verstoesse.push(`${ort}.beleg.skript_sha256/matcher nur bei Hooks`)
  } else if ('quelle' in b || 'skript_sha256' in b || 'matcher' in b) verstoesse.push(`${ort}.beleg: quelle/skript_sha256/matcher nur bei art 'statisch'`)
}

/**
 * Prüft ein geparstes Objekt gegen schemas/harness-zuordnung.schema.json (handgeschrieben).
 * @param daten - geparstes, sonst unbekanntes Objekt
 * @returns Liste der Regelverletzungen; leer = gültig
 */
export function validiereZuordnung(daten: unknown): string[] {
  if (!istObjekt(daten)) return ['Wurzel ist kein Objekt']
  const verstoesse: string[] = []
  for (const feld of Object.keys(daten)) {
    if (!['harness_zuordnung_schema', 'beschreibung', 'eintraege'].includes(feld)) verstoesse.push(`unbekanntes Feld '${feld}'`)
  }
  if (daten.harness_zuordnung_schema !== 'v0') verstoesse.push("'harness_zuordnung_schema' muss 'v0' sein")
  if ('beschreibung' in daten && typeof daten.beschreibung !== 'string') verstoesse.push("'beschreibung' muss ein String sein")
  if (!Array.isArray(daten.eintraege)) return [...verstoesse, "'eintraege' muss ein Array sein"]
  const gesehen = new Set<string>()
  daten.eintraege.forEach((e, i) => {
    const ort = `eintraege[${i}]`
    if (!istObjekt(e)) {
      verstoesse.push(`${ort} ist kein Objekt`)
      return
    }
    for (const feld of Object.keys(e)) {
      if (!['art', 'name', 'status', 'beleg', 'schritt', 'fehlt_im_ablauf', 'begruendung', 'text'].includes(feld)) verstoesse.push(`${ort}: unbekanntes Feld '${feld}'`)
    }
    if (!HARNESS_ARTEN.includes(e.art as HarnessArt)) verstoesse.push(`${ort}.art muss eins von ${HARNESS_ARTEN.join(', ')} sein`)
    if (!istNichtLeererString(e.name)) verstoesse.push(`${ort}.name muss ein nicht-leerer String sein`)
    else if (e.art === 'dod' && !/^dod-[0-9a-f]{8}$/.test(e.name)) verstoesse.push(`${ort}.name muss bei art 'dod' die Form dod-<8 Hex> haben`)
    if (typeof e.art === 'string' && typeof e.name === 'string') {
      const schluessel = zuordnungsSchluessel(e.art, e.name)
      if (gesehen.has(schluessel)) verstoesse.push(`${ort}: Schlüssel '${schluessel}' doppelt`)
      gesehen.add(schluessel)
    }
    if ('text' in e && typeof e.text !== 'string') verstoesse.push(`${ort}.text muss ein String sein`)
    if ('begruendung' in e && !istNichtLeererString(e.begruendung)) verstoesse.push(`${ort}.begruendung muss ein nicht-leerer String sein`)
    if (!ZUORDNUNG_STATUS.has(e.status as string)) {
      verstoesse.push(`${ort}.status muss eins von wirksam, ersetzt_durch, bewusst_nicht sein`)
      return
    }
    if (e.status === 'wirksam') pruefeWirksam(e, ort, verstoesse)
    else if (e.status === 'ersetzt_durch') {
      if ('beleg' in e) verstoesse.push(`${ort}: 'beleg' gehört zu wirksam`)
      const s = e.schritt
      if (!istObjekt(s)) verstoesse.push(`${ort}.schritt ist bei ersetzt_durch Pflicht`)
      else {
        for (const feld of Object.keys(s)) if (feld !== 'rolle') verstoesse.push(`${ort}.schritt: unbekanntes Feld '${feld}'`)
        if (!istNichtLeererString(s.rolle)) verstoesse.push(`${ort}.schritt.rolle muss ein nicht-leerer String sein`)
      }
      if ('fehlt_im_ablauf' in e) {
        const f = e.fehlt_im_ablauf
        if (!istObjekt(f) || !istNichtLeererString(f.begruendung) || Object.keys(f).length !== 1) verstoesse.push(`${ort}.fehlt_im_ablauf muss { begruendung } sein`)
      }
    } else {
      if ('beleg' in e || 'schritt' in e || 'fehlt_im_ablauf' in e) verstoesse.push(`${ort}: bewusst_nicht trägt weder 'beleg' noch 'schritt' noch 'fehlt_im_ablauf'`)
      if (!istNichtLeererString(e.begruendung)) verstoesse.push(`${ort}.begruendung ist bei bewusst_nicht Pflicht`)
    }
  })
  return verstoesse
}

/**
 * Lädt die Zuordnung: den Standard und optional eine Projektdatei, deren Einträge Standard-Einträge gleichen
 * Schlüssels ersetzen. Wirft nie; eine fehlende, unlesbare oder ungültige Datei steht in `fehler`.
 * @param installWurzel - Installation von ai-workforce (dort liegt harness-abgleich/standard.json)
 * @param projektPfad - optionaler installationsrelativer Pfad aus der Startvorlage (harnessZuordnungPfad)
 * @returns geladene Zuordnung
 */
export function ladeZuordnung(installWurzel: string, projektPfad: string | null = null): GeladeneZuordnung {
  const ergebnis: GeladeneZuordnung = { eintraege: new Map(), quellen: [], fehler: null }
  const pfade = projektPfad === null ? [STANDARD_ZUORDNUNG_PFAD] : [STANDARD_ZUORDNUNG_PFAD, projektPfad]
  for (const pfad of pfade) {
    const pfadGrund = pruefeRelativenPfad(pfad)
    if (pfadGrund !== null) {
      ergebnis.fehler = `Zuordnungspfad '${pfad}' ${pfadGrund}`
      return ergebnis
    }
    let text: string
    try {
      text = readFileSync(join(installWurzel, ...pfad.split('/')), 'utf8')
    } catch (fehler) {
      ergebnis.fehler = `Zuordnung '${pfad}' nicht lesbar: ${fehlerText(fehler)}`
      return ergebnis
    }
    let daten: unknown
    try {
      daten = JSON.parse(text)
    } catch (fehler) {
      ergebnis.fehler = `Zuordnung '${pfad}' ist kein gültiges JSON: ${fehlerText(fehler)}`
      return ergebnis
    }
    const verstoesse = validiereZuordnung(daten)
    if (verstoesse.length > 0) {
      ergebnis.fehler = `Zuordnung '${pfad}' verstößt gegen schemas/harness-zuordnung.schema.json: ${verstoesse.join('; ')}`
      return ergebnis
    }
    ergebnis.quellen.push({ pfad, sha256: sha256Hex(text) })
    for (const e of (daten as { eintraege: ZuordnungEintrag[] }).eintraege) ergebnis.eintraege.set(zuordnungsSchluessel(e.art, e.name), e)
  }
  return ergebnis
}

/**
 * Kurzliste der benutzten Fähigkeiten eines Laufs (F-937, Teil Abnahme): Skills, Subagenten und MCP-Server je mit
 * Zahl der Aufrufe (Zählregel des Gateways, zaehleNamen), dazu die Hintergrund-Aufrufe. Rein.
 * @param beobachtung - beobachtung der Laufakte (oder null/undefined: Codex, Lauf ohne init-Zeile)
 * @param laufId - Lauf, aus dem sie stammt
 * @returns Kurzliste oder null ohne Beobachtung
 */
export function baueFaehigkeitenKurzliste(beobachtung: BeobachtungSicht | null | undefined, laufId: string | null): FaehigkeitenKurzliste | null {
  if (!istObjekt(beobachtung) || laufId === null) return null
  const hintergrund = beobachtung.hintergrund_aufrufe
  return {
    lauf_id: laufId,
    skills: zaehleNamen(beobachtung.skill_aufrufe),
    subagenten: zaehleNamen(beobachtung.subagent_aufrufe),
    mcp_server: zaehleNamen(beobachtung.mcp_aufrufe, mcpServerName),
    hintergrund: Array.isArray(hintergrund) ? hintergrund.length : null,
  }
}

/**
 * Anzahl der Aufrufe eines Agents/Skills laut Beobachtung, oder null ohne Beobachtung bzw. für andere Arten.
 * @param art - Art der Zeile
 * @param name - Name
 * @param beobachtung - Beobachtung oder null
 * @returns Anzahl oder null
 */
function zaehleAufrufe(art: InventarArt, name: string, beobachtung: BeobachtungSicht | null): number | null {
  if (beobachtung === null || (art !== 'skill' && art !== 'agent')) return null
  const liste = art === 'skill' ? beobachtung.skill_aufrufe : beobachtung.subagent_aufrufe
  return Array.isArray(liste) ? liste.filter((w) => w === name).length : 0
}

/** Bewertung einer wirksamen Zeile: Status, Beleg und ggf. offen_grund/grund. */
interface WirksamBewertung {
  status: AbgleichStatus
  beleg: AbgleichBeleg
  offen_grund: OffenGrund | null
  grund: string | null
}

/**
 * Bewertet eine wirksame Zeile (Plan v2, A2/A3): statisch bei Hooks nur mit passendem Hash und Matcher;
 * Prüfschritt im Lauf GRÜN → wirksam, negativ → offen, fehlend → ohne Beleg.
 * @param z - Zuordnungseintrag (status wirksam)
 * @param inv - Inventar-Eintrag
 * @param laufbelege - Laufdaten oder null
 * @returns Bewertung
 */
function bewerteWirksam(z: ZuordnungEintrag, inv: InventarEintrag, laufbelege: Laufbelege | null): WirksamBewertung {
  const vorgabe: ZuordnungBeleg = z.beleg ?? { art: 'statisch' }
  const beleg: AbgleichBeleg = {
    art: vorgabe.art,
    statisch: vorgabe.art === 'statisch',
    im_lauf: null,
    quelle: vorgabe.quelle ?? null,
    lauf_id: null,
    ergebnis: null,
    skript_sha256: vorgabe.skript_sha256 ?? null,
    matcher: vorgabe.matcher ?? null,
  }
  if (vorgabe.art === 'statisch') {
    if (inv.art !== 'hook') return { status: 'wirksam', beleg, offen_grund: null, grund: null }
    const abweichungen: string[] = []
    if (inv.skript_sha256 !== vorgabe.skript_sha256) abweichungen.push(`Skript-Hash ${inv.skript_sha256 === null ? 'nicht lesbar' : `${inv.skript_sha256.slice(0, 12)}…`} statt ${String(vorgabe.skript_sha256).slice(0, 12)}…`)
    if (inv.matcher !== (vorgabe.matcher ?? null)) abweichungen.push(`Matcher '${inv.matcher ?? '—'}' statt '${vorgabe.matcher ?? '—'}'`)
    if (abweichungen.length === 0) return { status: 'wirksam', beleg, offen_grund: null, grund: null }
    return { status: 'wirksam_ohne_beleg', beleg, offen_grund: null, grund: `Hook weicht vom Nachweis ab: ${abweichungen.join('; ')}` }
  }
  if (laufbelege === null) return { status: 'wirksam', beleg, offen_grund: null, grund: null }
  const p = laufbelege.pruefergebnis
  const zitiert = { ...beleg, lauf_id: p?.lauf_id ?? laufbelege.ausfuehrung_lauf_id, ergebnis: p?.ergebnis ?? null }
  if (p === null) return { status: 'wirksam_ohne_beleg', beleg: { ...zitiert, im_lauf: false }, offen_grund: null, grund: 'kein Prüfergebnis in diesem Lauf' }
  if (p.ergebnis === 'GRUEN') return { status: 'wirksam', beleg: { ...zitiert, im_lauf: true }, offen_grund: null, grund: null }
  return { status: 'offen', beleg: { ...zitiert, im_lauf: false }, offen_grund: 'beleg_negativ', grund: `Prüfergebnis ${p.ergebnis}` }
}

/**
 * Bewertet eine ersetzte Zeile (Plan v2, A1): ersetzt nur, wenn der Schritt der Rolle ERFOLGREICH lief; sonst
 * offen bzw. bewusst nicht, wenn die Zuordnung `fehlt_im_ablauf` nennt und der Schritt im Ablauf fehlt.
 * @param z - Zuordnungseintrag (status ersetzt_durch)
 * @param laufbelege - Laufdaten oder null
 * @returns { status, ersatz, offen_grund, begruendung }
 */
function bewerteErsatz(z: ZuordnungEintrag, laufbelege: Laufbelege | null): { status: AbgleichStatus; ersatz: AbgleichErsatz; offen_grund: OffenGrund | null; begruendung: string | null } {
  const rolle = z.schritt?.rolle ?? ''
  const basis: AbgleichErsatz = { rolle, lage: null, schritt_id: null, lauf_id: null }
  const begruendung = z.begruendung ?? null
  if (laufbelege === null) return { status: 'ersetzt_durch', ersatz: basis, offen_grund: null, begruendung }
  const kandidaten = laufbelege.schritte.filter((s) => s.rolle === rolle)
  const gelaufen = kandidaten.find((s) => s.status === 'ERFOLGREICH' && s.lauf_id !== null)
  if (gelaufen !== undefined) return { status: 'ersetzt_durch', ersatz: { ...basis, lage: 'gelaufen', schritt_id: gelaufen.schritt_id, lauf_id: gelaufen.lauf_id }, offen_grund: null, begruendung }
  if (kandidaten.length > 0) return { status: 'offen', ersatz: { ...basis, lage: 'nicht_gelaufen', schritt_id: kandidaten[0].schritt_id, lauf_id: kandidaten[0].lauf_id }, offen_grund: 'ersatz_nicht_gelaufen', begruendung }
  const ersatz: AbgleichErsatz = { ...basis, lage: 'nicht_im_ablauf' }
  if (z.fehlt_im_ablauf !== undefined) return { status: 'bewusst_nicht', ersatz, offen_grund: null, begruendung: z.fehlt_im_ablauf.begruendung }
  return { status: 'offen', ersatz, offen_grund: 'ersatz_fehlt', begruendung }
}

/**
 * Gleicht das Inventar gegen die Zuordnung ab und zitiert vorhandene Laufbelege. Rein.
 * @param inventar - leseHarnessInventar
 * @param zuordnung - ladeZuordnung
 * @param laufbelege - Laufdaten des Workflows, oder null (Seite Workforce: Status laut Zuordnung)
 * @param referenzInventar - Inventar des Projektordners, wenn der Harness des Arbeitsordners gelesen wurde: jeder
 *   Eintrag, den es dort gibt und im Arbeitsordner nicht mehr, ist offen (`im_lauf_entfernt`) — ein Lauf kann eine
 *   Pflicht nicht durch Löschen loswerden. null = kein Vergleich.
 * @returns { eintraege (offen zuerst, dann ohne Beleg, dann DoD, Hooks, Agents, Skills, Commands), zaehlung, bestanden (null ohne Laufbelege) }
 */
export function berechneHarnessAbgleich(
  inventar: readonly InventarEintrag[],
  zuordnung: GeladeneZuordnung,
  laufbelege: Laufbelege | null,
  referenzInventar: readonly InventarEintrag[] | null = null
): { eintraege: AbgleichEintrag[]; zaehlung: AbgleichZaehlung; bestanden: boolean | null } {
  const beobachtung = laufbelege?.beobachtung ?? null
  const zeilen = inventar.map((inv): AbgleichEintrag => {
    const basis: AbgleichEintrag = {
      art: inv.art,
      name: inv.name,
      quelle: inv.quelle,
      detail: inv.detail,
      ereignis: inv.ereignis,
      matcher: inv.matcher,
      status: 'offen',
      beleg: null,
      ersatz: null,
      begruendung: null,
      aufrufe: zaehleAufrufe(inv.art, inv.name, beobachtung),
      offen_grund: null,
      grund: null,
    }
    if (inv.art === 'quelle') return { ...basis, offen_grund: 'quelle_fehlerhaft', grund: inv.grund }
    if (zuordnung.fehler !== null) return { ...basis, offen_grund: 'zuordnung_fehlerhaft', grund: zuordnung.fehler }
    const z = zuordnung.eintraege.get(zuordnungsSchluessel(inv.art, inv.name))
    if (z === undefined) return { ...basis, offen_grund: 'nicht_in_zuordnung' }
    if (z.status === 'bewusst_nicht') return { ...basis, status: 'bewusst_nicht', begruendung: z.begruendung ?? null }
    if (z.status === 'ersetzt_durch') return { ...basis, ...bewerteErsatz(z, laufbelege) }
    return { ...basis, ...bewerteWirksam(z, inv, laufbelege), begruendung: z.begruendung ?? null }
  })
  const vorhanden = new Set(inventar.map((inv) => zuordnungsSchluessel(inv.art, inv.name)))
  for (const ref of referenzInventar ?? []) {
    if (ref.art === 'quelle' || vorhanden.has(zuordnungsSchluessel(ref.art, ref.name))) continue
    zeilen.push({ art: ref.art, name: ref.name, quelle: ref.quelle, detail: ref.detail, ereignis: ref.ereignis, matcher: ref.matcher, status: 'offen', beleg: null, ersatz: null, begruendung: null, aufrufe: null, offen_grund: 'im_lauf_entfernt', grund: null })
  }
  const stufe = (z: AbgleichEintrag) => (z.status === 'offen' ? 0 : z.status === 'wirksam_ohne_beleg' ? 1 : 2)
  const rang = (z: AbgleichEintrag) => stufe(z) * 10 + ART_REIHENFOLGE.indexOf(z.art)
  const eintraege = zeilen
    .map((z, i) => ({ z, i }))
    .sort((a, b) => rang(a.z) - rang(b.z) || a.i - b.i)
    .map(({ z }) => z)
  const zaehlung: AbgleichZaehlung = { wirksam: 0, wirksam_ohne_beleg: 0, ersetzt_durch: 0, bewusst_nicht: 0, offen: 0 }
  for (const z of eintraege) zaehlung[z.status] += 1
  return { eintraege, zaehlung, bestanden: laufbelege === null ? null : zaehlung.offen === 0 && zaehlung.wirksam_ohne_beleg === 0 }
}

/**
 * Harness-Dateien unter den geänderten Dateien einer Änderungsübersicht (CLAUDE.md, .claude/**).
 * @param dateien - dateien[].pfad der Änderungsübersicht, oder null ohne Übersicht
 * @returns sortierte Pfade oder null
 */
export function filtereHarnessDateien(dateien: readonly unknown[] | null): string[] | null {
  if (dateien === null) return null
  return dateien
    .map((d) => (istObjekt(d) && typeof d.pfad === 'string' ? d.pfad.replace(/\\/g, '/') : null))
    .filter((p): p is string => p !== null && (p === 'CLAUDE.md' || p.startsWith('.claude/')))
    .sort()
}

const ERGEBNIS_FELDER = ['harness_abgleich_schema', 'workflow_id', 'wurzel', 'zuordnung_quellen', 'bezug', 'zaehlung', 'bestanden', 'eintraege', 'faehigkeiten', 'geaenderte_harness_dateien', 'berechnet_am']
const EINTRAG_FELDER = ['art', 'name', 'quelle', 'detail', 'ereignis', 'matcher', 'status', 'beleg', 'ersatz', 'begruendung', 'aufrufe', 'offen_grund', 'grund']
const BELEG_FELDER = ['art', 'statisch', 'im_lauf', 'quelle', 'lauf_id', 'ergebnis', 'skript_sha256', 'matcher']
const ERSATZ_FELDER = ['rolle', 'lage', 'schritt_id', 'lauf_id']
const ZAEHL_FELDER = ['wirksam', 'wirksam_ohne_beleg', 'ersetzt_durch', 'bewusst_nicht', 'offen'] as const

/**
 * Prüft genau die Felder eines Objekts (Pflicht, keine fremden).
 * @param obj - Objekt
 * @param felder - erlaubte = Pflichtfelder
 * @param ort - Ortsangabe
 * @param verstoesse - Sammlung
 */
function pruefeFeldmenge(obj: Record<string, unknown>, felder: readonly string[], ort: string, verstoesse: string[]): void {
  for (const feld of Object.keys(obj)) if (!felder.includes(feld)) verstoesse.push(`${ort}: unbekanntes Feld '${feld}'`)
  for (const feld of felder) if (!(feld in obj)) verstoesse.push(`${ort}: Pflichtfeld '${feld}' fehlt`)
}

const istStringOderNull = (w: unknown) => w === null || typeof w === 'string'
const istZahlOderNull = (w: unknown) => w === null || (Number.isInteger(w) && (w as number) >= 0)

/**
 * Prüft eine Liste { name, anzahl }.
 * @param liste - Wert
 * @param ort - Ortsangabe
 * @param verstoesse - Sammlung
 */
function pruefeNameAnzahlListe(liste: unknown, ort: string, verstoesse: string[]): void {
  if (!Array.isArray(liste)) {
    verstoesse.push(`${ort} muss ein Array sein`)
    return
  }
  liste.forEach((e, i) => {
    if (!istObjekt(e) || !istNichtLeererString(e.name) || !Number.isInteger(e.anzahl) || (e.anzahl as number) < 1 || Object.keys(e).length !== 2) verstoesse.push(`${ort}[${i}] muss { name, anzahl ≥ 1 } sein`)
  })
}

/**
 * Prüft eine Zeile des Ergebnisses.
 * @param e - Zeile
 * @param ort - Ortsangabe
 * @param verstoesse - Sammlung
 */
function pruefeErgebnisZeile(e: Record<string, unknown>, ort: string, verstoesse: string[]): void {
  pruefeFeldmenge(e, EINTRAG_FELDER, ort, verstoesse)
  if (!ART_REIHENFOLGE.includes(e.art as InventarArt)) verstoesse.push(`${ort}.art unbekannt`)
  if (!istNichtLeererString(e.name)) verstoesse.push(`${ort}.name muss ein nicht-leerer String sein`)
  if (!istNichtLeererString(e.quelle)) verstoesse.push(`${ort}.quelle muss ein nicht-leerer String sein`)
  for (const feld of ['detail', 'ereignis', 'matcher', 'begruendung', 'grund']) if (!istStringOderNull(e[feld])) verstoesse.push(`${ort}.${feld} muss String oder null sein`)
  if (!istZahlOderNull(e.aufrufe)) verstoesse.push(`${ort}.aufrufe muss eine ganze Zahl ≥ 0 oder null sein`)
  if (!ABGLEICH_STATUS.has(e.status as AbgleichStatus)) verstoesse.push(`${ort}.status unbekannt`)
  if (e.offen_grund !== null && !OFFEN_GRUENDE.has(e.offen_grund as OffenGrund)) verstoesse.push(`${ort}.offen_grund unbekannt`)
  if ((e.status === 'offen') !== (e.offen_grund !== null)) verstoesse.push(`${ort}: offen_grund genau bei status 'offen'`)
  if (e.beleg !== null) {
    if (!istObjekt(e.beleg)) verstoesse.push(`${ort}.beleg muss Objekt oder null sein`)
    else {
      pruefeFeldmenge(e.beleg, BELEG_FELDER, `${ort}.beleg`, verstoesse)
      if (!BELEG_ARTEN.has(e.beleg.art as BelegArt)) verstoesse.push(`${ort}.beleg.art unbekannt`)
      if (typeof e.beleg.statisch !== 'boolean') verstoesse.push(`${ort}.beleg.statisch muss boolean sein`)
      if (e.beleg.im_lauf !== null && typeof e.beleg.im_lauf !== 'boolean') verstoesse.push(`${ort}.beleg.im_lauf muss boolean oder null sein`)
      for (const feld of ['quelle', 'lauf_id', 'ergebnis', 'skript_sha256', 'matcher']) if (!istStringOderNull(e.beleg[feld])) verstoesse.push(`${ort}.beleg.${feld} muss String oder null sein`)
    }
  }
  if (e.ersatz !== null) {
    if (!istObjekt(e.ersatz)) verstoesse.push(`${ort}.ersatz muss Objekt oder null sein`)
    else {
      pruefeFeldmenge(e.ersatz, ERSATZ_FELDER, `${ort}.ersatz`, verstoesse)
      if (!istNichtLeererString(e.ersatz.rolle)) verstoesse.push(`${ort}.ersatz.rolle muss ein nicht-leerer String sein`)
      if (e.ersatz.lage !== null && !ERSATZ_LAGEN.has(e.ersatz.lage as string)) verstoesse.push(`${ort}.ersatz.lage unbekannt`)
      for (const feld of ['schritt_id', 'lauf_id']) if (!istStringOderNull(e.ersatz[feld])) verstoesse.push(`${ort}.ersatz.${feld} muss String oder null sein`)
    }
  }
}

/**
 * Prüft ein geparstes Objekt gegen schemas/kontrollzustand-harness-abgleich-payload.schema.json (handgeschrieben),
 * zusätzlich: Zählung passt zu den Einträgen, bestanden ⇔ kein Eintrag offen und keiner ohne Beleg.
 * @param daten - geparstes, sonst unbekanntes Objekt
 * @returns Liste der Regelverletzungen; leer = gültig
 */
export function validiereHarnessAbgleichDaten(daten: unknown): string[] {
  if (!istObjekt(daten)) return ['Wurzel ist kein Objekt']
  const verstoesse: string[] = []
  pruefeFeldmenge(daten, ERGEBNIS_FELDER, 'Wurzel', verstoesse)
  if (daten.harness_abgleich_schema !== 'v0') verstoesse.push("'harness_abgleich_schema' muss 'v0' sein")
  if (!istNichtLeererString(daten.workflow_id)) verstoesse.push("'workflow_id' muss ein nicht-leerer String sein")
  if (!istNichtLeererString(daten.wurzel)) verstoesse.push("'wurzel' muss ein nicht-leerer String sein")
  if (!istNichtLeererString(daten.berechnet_am) || Number.isNaN(Date.parse(daten.berechnet_am))) verstoesse.push("'berechnet_am' muss ein ISO-Zeitpunkt sein")
  if (daten.bestanden !== null && typeof daten.bestanden !== 'boolean') verstoesse.push("'bestanden' muss boolean oder null sein")
  if (!Array.isArray(daten.zuordnung_quellen) || daten.zuordnung_quellen.some((q) => !istObjekt(q) || !istNichtLeererString(q.pfad) || typeof q.sha256 !== 'string' || !SHA256.test(q.sha256) || Object.keys(q).length !== 2)) {
    verstoesse.push("'zuordnung_quellen' muss ein Array von { pfad, sha256 } sein")
  }
  if (!istObjekt(daten.bezug)) verstoesse.push("'bezug' muss ein Objekt sein")
  else {
    pruefeFeldmenge(daten.bezug, ['ausfuehrung_lauf_id', 'pruefergebnis_hash'], 'bezug', verstoesse)
    if (!istStringOderNull(daten.bezug.ausfuehrung_lauf_id)) verstoesse.push("'bezug.ausfuehrung_lauf_id' muss String oder null sein")
    if (daten.bezug.pruefergebnis_hash !== null && (typeof daten.bezug.pruefergebnis_hash !== 'string' || !SHA256.test(daten.bezug.pruefergebnis_hash))) verstoesse.push("'bezug.pruefergebnis_hash' muss 64 Hex oder null sein")
  }
  if (daten.geaenderte_harness_dateien !== null && (!Array.isArray(daten.geaenderte_harness_dateien) || daten.geaenderte_harness_dateien.some((p) => !istNichtLeererString(p)))) {
    verstoesse.push("'geaenderte_harness_dateien' muss ein Array nicht-leerer Strings oder null sein")
  }
  if (!istObjekt(daten.zaehlung)) verstoesse.push("'zaehlung' muss ein Objekt sein")
  else {
    pruefeFeldmenge(daten.zaehlung, ZAEHL_FELDER, 'zaehlung', verstoesse)
    for (const feld of ZAEHL_FELDER) if (!Number.isInteger(daten.zaehlung[feld]) || (daten.zaehlung[feld] as number) < 0) verstoesse.push(`'zaehlung.${feld}' muss eine ganze Zahl ≥ 0 sein`)
  }
  if (!Array.isArray(daten.eintraege)) verstoesse.push("'eintraege' muss ein Array sein")
  else {
    const gezaehlt: Record<string, number> = { wirksam: 0, wirksam_ohne_beleg: 0, ersetzt_durch: 0, bewusst_nicht: 0, offen: 0 }
    daten.eintraege.forEach((e, i) => {
      if (!istObjekt(e)) {
        verstoesse.push(`eintraege[${i}] ist kein Objekt`)
        return
      }
      pruefeErgebnisZeile(e, `eintraege[${i}]`, verstoesse)
      if (ABGLEICH_STATUS.has(e.status as AbgleichStatus)) gezaehlt[e.status as string] += 1
    })
    if (istObjekt(daten.zaehlung)) {
      for (const feld of ZAEHL_FELDER) if (daten.zaehlung[feld] !== gezaehlt[feld]) verstoesse.push(`'zaehlung.${feld}' passt nicht zu den Einträgen`)
      if (typeof daten.bestanden === 'boolean' && daten.bestanden !== (gezaehlt.offen === 0 && gezaehlt.wirksam_ohne_beleg === 0)) {
        verstoesse.push("'bestanden' muss genau dann true sein, wenn kein Eintrag offen und keiner ohne Beleg ist")
      }
    }
  }
  if (daten.faehigkeiten !== null) {
    if (!istObjekt(daten.faehigkeiten)) verstoesse.push("'faehigkeiten' muss Objekt oder null sein")
    else {
      pruefeFeldmenge(daten.faehigkeiten, ['lauf_id', 'skills', 'subagenten', 'mcp_server', 'hintergrund'], 'faehigkeiten', verstoesse)
      if (!istNichtLeererString(daten.faehigkeiten.lauf_id)) verstoesse.push("'faehigkeiten.lauf_id' muss ein nicht-leerer String sein")
      for (const feld of ['skills', 'subagenten', 'mcp_server']) pruefeNameAnzahlListe(daten.faehigkeiten[feld], `faehigkeiten.${feld}`, verstoesse)
      if (!istZahlOderNull(daten.faehigkeiten.hintergrund)) verstoesse.push("'faehigkeiten.hintergrund' muss eine ganze Zahl ≥ 0 oder null sein")
    }
  }
  return verstoesse
}
