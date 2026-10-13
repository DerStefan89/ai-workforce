/**
 * Datei: src/sammlung/pruefbericht.ts
 *
 * Zweck: Prüfbericht des Prüflaufs (F45 F-2b-2, F-1056):
 * - validiereErgebnisEignungspruefung: prüft das Modellergebnis gegen schemas/ergebnis-eignungspruefung.schema.json
 *   (handgeschrieben, Muster validiereErgebnisScout) und zusätzlich, dass typ und gepinnte_version exakt dem Pin des Auftrags
 *   entsprechen.
 *
 * - validierePruefberichtDaten: Payload des Kernartefakts pruefbericht-<schluessel>
 *   (schemas/kontrollzustand-pruefbericht-payload.schema.json, handgeschrieben).
 * - registrierePruefbericht / ladePruefberichte: Ablage im Kontrollzustand (Lineage auf die Laufakte des Prüflaufs) und Lesen
 *   aller Versionen aller Berichte einer Ablage.
 * - vergleicheInhalt (F-1075): die Installation vergleicht, was sie geschrieben hat, mit der geprüften Dateiliste des Berichts
 *   (Pfad + sha256); jede Abweichung (fehlend, zusätzlich, anderer Hash) bricht ab — installiert wird nur Geprüftes.
 * - waehleBericht: welcher Bericht für eine angezeigte, gepinnte Version gilt (Plan v3 §4, Advisor A2/A15, C11) — Suche nach
 *   QUELLE (nicht nach Schlüssel), es gilt der neueste passende Bericht; NICHT_GEEIGNET, ein Bericht nur für eine andere
 *   Version oder gar keiner sperren „Freigeben & installieren“ (409).
 *
 * Wird aufgerufen von: scripts/leitstand/routen-pruefung.mjs (Nachbereitung des Prüflaufs, Sammlung-Stand),
 * scripts/leitstand-server.mjs (Rückruf pruefeBericht der Installation), src/sammlung/pruefbericht.test.ts,
 * scripts/check-f45-f2b2-pruefung.mjs, scripts/check-f36-ws5a-installation.mjs, scripts/check-f36-ws5b-skill.mjs (Testhilfe:
 * passender Bericht vor der Installation, Advisor C5).
 *
 * Wichtig: Der Bericht ist Daten, keine Freigabe. Ein Ergebnis mit anderem typ/gepinnte_version als vorgegeben wird verworfen
 * (der Prüfer hätte eine andere Version beschrieben als die, die angezeigt und später installiert wird).
 */

import { createHash } from 'node:crypto'
import { lstatSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ProfilReferenz } from '../checkpoint-store/types.ts'
import { listeVersionen, registriereKernArtefakt } from '../lineage-registry/index.ts'
import type { LineageSchreiber } from '../lineage-registry/types.ts'
import { GRENZEN, type InhaltFakten, SHA512_INTEGRITY } from './inhalt.ts'

/** Urteile des Prüfberichts. */
export const PRUEF_URTEILE = Object.freeze(['GEEIGNET', 'MIT_AUFLAGEN', 'NICHT_GEEIGNET'] as const)
export type PruefUrteil = (typeof PRUEF_URTEILE)[number]

/** Typen, die der Prüflauf prüft. */
export const PRUEF_TYPEN = Object.freeze(['skill', 'mcp', 'agent'] as const)
export type PruefTyp = (typeof PRUEF_TYPEN)[number]

/** Prüfbereiche (werkzeug-auswahl + Abweichung von der Sammlung). */
export const PRUEF_BEREICHE = Object.freeze(['bedarf_fit', 'herkunft', 'lizenz', 'installationsweg', 'modell_anweisungen', 'hooks_hintergrund', 'kosten', 'abweichung_sammlung'] as const)
export const PRUEF_SCHWEREN = Object.freeze(['hoch', 'mittel', 'gering', 'info'] as const)

/** Das Modellergebnis (schemas/ergebnis-eignungspruefung.schema.json). */
export interface ErgebnisEignungspruefung {
  urteil: PruefUrteil
  typ: PruefTyp
  gepinnte_version: string
  befunde: Array<{ bereich: (typeof PRUEF_BEREICHE)[number]; schwere: (typeof PRUEF_SCHWEREN)[number]; beleg: string }>
  auflagen: string[]
  zusammenfassung: string
}

const FELDER = new Set(['urteil', 'typ', 'gepinnte_version', 'befunde', 'auflagen', 'zusammenfassung'])
const BEFUND_FELDER = new Set(['bereich', 'schwere', 'beleg'])

/**
 * Nicht-leerer String mit Höchstlänge.
 * @param wert - Wert
 * @param max - Höchstlänge
 * @returns true, wenn gültig
 */
function text(wert: unknown, max: number): wert is string {
  return typeof wert === 'string' && wert.length > 0 && wert.length <= max
}

/**
 * Prüft ein geparstes Ergebnis gegen das Schema und gegen den Pin.
 * @param ergebnis - geparstes Objekt
 * @param pin - { typ, version } aus dem Auftrag; ohne pin nur das Schema
 * @returns Liste der Verstöße (leer = gültig)
 */
export function validiereErgebnisEignungspruefung(ergebnis: unknown, pin?: { typ: string; version: string }): string[] {
  if (typeof ergebnis !== 'object' || ergebnis === null || Array.isArray(ergebnis)) return ['Ergebnis muss ein Objekt sein']
  const e = ergebnis as Record<string, unknown>
  const v: string[] = []
  for (const feld of Object.keys(e)) if (!FELDER.has(feld)) v.push(`unbekanntes Feld '${feld}' (additionalProperties: false)`)
  for (const feld of FELDER) if (!(feld in e)) v.push(`'${feld}' fehlt`)
  if ('urteil' in e && !(PRUEF_URTEILE as readonly unknown[]).includes(e.urteil)) v.push(`'urteil' muss ${PRUEF_URTEILE.join('|')} sein`)
  if ('typ' in e && !(PRUEF_TYPEN as readonly unknown[]).includes(e.typ)) v.push(`'typ' muss ${PRUEF_TYPEN.join('|')} sein`)
  if ('gepinnte_version' in e && !text(e.gepinnte_version, 200)) v.push("'gepinnte_version' muss ein nicht-leerer String sein")
  if ('zusammenfassung' in e && !text(e.zusammenfassung, 4000)) v.push("'zusammenfassung' muss ein nicht-leerer String (≤ 4000 Zeichen) sein")
  if ('befunde' in e) {
    if (!Array.isArray(e.befunde) || e.befunde.length > 40) v.push("'befunde' muss ein Array mit höchstens 40 Einträgen sein")
    else
      e.befunde.forEach((b, i) => {
        if (typeof b !== 'object' || b === null || Array.isArray(b)) {
          v.push(`'befunde[${i}]' muss ein Objekt sein`)
          return
        }
        const befund = b as Record<string, unknown>
        for (const feld of Object.keys(befund)) if (!BEFUND_FELDER.has(feld)) v.push(`'befunde[${i}]' trägt unbekanntes Feld '${feld}'`)
        if (!(PRUEF_BEREICHE as readonly unknown[]).includes(befund.bereich)) v.push(`'befunde[${i}].bereich' muss ${PRUEF_BEREICHE.join('|')} sein`)
        if (!(PRUEF_SCHWEREN as readonly unknown[]).includes(befund.schwere)) v.push(`'befunde[${i}].schwere' muss ${PRUEF_SCHWEREN.join('|')} sein`)
        if (!text(befund.beleg, 2000)) v.push(`'befunde[${i}].beleg' muss ein nicht-leerer String (≤ 2000 Zeichen) sein`)
      })
  }
  if ('auflagen' in e) {
    if (!Array.isArray(e.auflagen) || e.auflagen.length > 20 || !e.auflagen.every((a) => text(a, 1000))) v.push("'auflagen' muss ein Array mit höchstens 20 nicht-leeren Strings sein")
    else if (e.urteil === 'MIT_AUFLAGEN' && e.auflagen.length === 0) v.push("'auflagen' braucht bei MIT_AUFLAGEN mindestens einen Eintrag")
  }
  if (pin !== undefined && v.length === 0) {
    if (e.typ !== pin.typ) v.push(`'typ' ist '${String(e.typ)}', vorgegeben war '${pin.typ}'`)
    if (e.gepinnte_version !== pin.version) v.push(`'gepinnte_version' ist '${String(e.gepinnte_version)}', vorgegeben war '${pin.version}'`)
  }
  return v
}

// ─── Kernartefakt pruefbericht-<schluessel> ─────────────────────────────────────

/** Gepinnte Quelle: git (Skill/Agent) oder npm (MCP). */
export type PruefQuelle = { art: 'git'; repo: string; ref: string; sha: string; pfad: string } | { art: 'npm'; paket: string; version: string; integrity: string }

/** Herkunftsdaten zur Quelle (mechanisch, nicht vom Modell): Commit-Zeit bzw. npm-Änderungszeit, Pfleger, Lizenz laut Registry. */
export interface PruefHerkunft {
  commit_zeit: string | null
  geaendert: string | null
  pfleger: string[]
  lizenz_registry: string | null
}

/** Payload des Kernartefakts (schemas/kontrollzustand-pruefbericht-payload.schema.json). */
export interface PruefberichtDaten {
  ergebnis: ErgebnisEignungspruefung
  quelle: PruefQuelle
  typ: PruefTyp
  katalog_id: string | null
  sammlung_id: string | null
  urteil_sammlung: string | null
  ausnahme_begruendung: string | null
  fakten: InhaltFakten
  /** F-1075: geprüfte Dateien (Pfad wie in der Quelle, relativ zum Paket bzw. gepinnten Pfad) mit sha256 */
  inhalt: { dateien: Array<{ pfad: string; sha256: string }> }
  herkunft: PruefHerkunft
  lauf_id: string
  auftrag_id: string
  erstellt_am: string
}

const DATEN_FELDER = new Set(['ergebnis', 'quelle', 'typ', 'katalog_id', 'sammlung_id', 'urteil_sammlung', 'ausnahme_begruendung', 'fakten', 'inhalt', 'herkunft', 'lauf_id', 'auftrag_id', 'erstellt_am'])
const SHA256 = /^[0-9a-f]{64}$/
const SHA = /^[0-9a-f]{40}$/

/**
 * String (nicht leer) oder null.
 * @param wert - Wert
 * @returns gültig
 */
function textOderNull(wert: unknown): boolean {
  return wert === null || (typeof wert === 'string' && wert.length > 0)
}

/**
 * Prüft die gepinnte Quelle.
 * @param q - Wert
 * @returns Verstöße
 */
function validiereQuelle(q: unknown): string[] {
  if (typeof q !== 'object' || q === null || Array.isArray(q)) return ["'quelle' muss ein Objekt sein"]
  const o = q as Record<string, unknown>
  const v: string[] = []
  if (o.art === 'git') {
    for (const k of Object.keys(o)) if (!['art', 'repo', 'ref', 'sha', 'pfad'].includes(k)) v.push(`'quelle' trägt unbekanntes Feld '${k}'`)
    if (typeof o.repo !== 'string' || !o.repo.startsWith('https://')) v.push("'quelle.repo' muss eine https-Adresse sein")
    if (typeof o.ref !== 'string' || o.ref.length === 0) v.push("'quelle.ref' fehlt")
    if (typeof o.sha !== 'string' || !SHA.test(o.sha)) v.push("'quelle.sha' muss eine 40-stellige Commit-SHA sein")
    if (typeof o.pfad !== 'string') v.push("'quelle.pfad' muss ein String sein ('' = ganzes Repo)")
    return v
  }
  if (o.art === 'npm') {
    for (const k of Object.keys(o)) if (!['art', 'paket', 'version', 'integrity'].includes(k)) v.push(`'quelle' trägt unbekanntes Feld '${k}'`)
    for (const k of ['paket', 'version', 'integrity']) if (typeof o[k] !== 'string' || (o[k] as string).length === 0) v.push(`'quelle.${k}' fehlt`)
    // F-1074 (9): volle Form wie beim Pin (pinneNpm), nicht nur das Präfix.
    if (typeof o.integrity === 'string' && !SHA512_INTEGRITY.test(o.integrity)) v.push("'quelle.integrity' muss eine sha512-SRI sein")
    return v
  }
  return ["'quelle.art' muss 'git' oder 'npm' sein"]
}

/**
 * Prüft die Payload eines Prüfberichts (handgeschrieben, Muster validiereHarnessAbgleichDaten).
 * @param daten - geparstes Objekt
 * @returns Verstöße (leer = gültig)
 */
export function validierePruefberichtDaten(daten: unknown): string[] {
  if (typeof daten !== 'object' || daten === null || Array.isArray(daten)) return ['Payload muss ein Objekt sein']
  const d = daten as Record<string, unknown>
  const v: string[] = []
  for (const k of Object.keys(d)) if (!DATEN_FELDER.has(k)) v.push(`unbekanntes Feld '${k}'`)
  for (const k of DATEN_FELDER) if (!(k in d)) v.push(`'${k}' fehlt`)
  v.push(...validiereErgebnisEignungspruefung(d.ergebnis).map((x) => `ergebnis: ${x}`))
  v.push(...validiereQuelle(d.quelle))
  if (!(PRUEF_TYPEN as readonly unknown[]).includes(d.typ)) v.push(`'typ' muss ${PRUEF_TYPEN.join('|')} sein`)
  for (const k of ['katalog_id', 'sammlung_id', 'urteil_sammlung', 'ausnahme_begruendung']) if (!textOderNull(d[k])) v.push(`'${k}' muss ein String oder null sein`)
  if (d.katalog_id === null && d.sammlung_id === null) v.push("'katalog_id' oder 'sammlung_id' muss gesetzt sein")
  if (typeof d.fakten !== 'object' || d.fakten === null) v.push("'fakten' muss ein Objekt sein")
  if (typeof d.herkunft !== 'object' || d.herkunft === null) v.push("'herkunft' muss ein Objekt sein")
  const inhalt = d.inhalt as { dateien?: unknown } | null | undefined
  if (typeof inhalt !== 'object' || inhalt === null || !Array.isArray(inhalt.dateien) || inhalt.dateien.length === 0 || inhalt.dateien.length > 3000) v.push("'inhalt.dateien' muss eine nicht-leere Liste (höchstens 3000) sein")
  else if (!inhalt.dateien.every((x) => typeof x === 'object' && x !== null && typeof (x as { pfad?: unknown }).pfad === 'string' && SHA256.test(String((x as { sha256?: unknown }).sha256)))) v.push("'inhalt.dateien[]' braucht pfad und sha256")
  for (const k of ['lauf_id', 'auftrag_id', 'erstellt_am']) if (typeof d[k] !== 'string' || (d[k] as string).length === 0) v.push(`'${k}' fehlt`)
  if (v.length === 0) {
    const e = d.ergebnis as ErgebnisEignungspruefung
    const q = d.quelle as PruefQuelle
    if (e.typ !== d.typ) v.push("'ergebnis.typ' ≠ 'typ'")
    if (e.gepinnte_version !== versionVon(q)) v.push("'ergebnis.gepinnte_version' ≠ gepinnte Version der 'quelle'")
  }
  return v
}

/**
 * Alle regulären Dateien unter ordner mit sha256 (relativ, „/“). Symlinks und andere Einträge sind Abweichungen (fail-closed).
 * Seit F45 F-2b-2b (F-1075 Variante C) gibt es keine Ausnahme mehr: jeder Eintrag im installierten Ordner zählt, auch ein
 * node_modules (das die npm-Installation ohnehin schon mit 422 ablehnt).
 * @param ordner - installierter Ordner
 * @returns Karte Pfad → sha256 und fremde Einträge
 */
function leseInstalliert(ordner: string): { dateien: Map<string, string>; fremd: string[] } {
  const dateien = new Map<string, string>()
  const fremd: string[] = []
  const gehe = (absolut: string, relativ: string): void => {
    for (const e of readdirSync(absolut, { withFileTypes: true })) {
      const rel = relativ === '' ? e.name : `${relativ}/${e.name}`
      const pfad = join(absolut, e.name)
      const st = lstatSync(pfad)
      if (st.isDirectory()) gehe(pfad, rel)
      // Code-Review F-2b-2b 10: eine Datei über der Grenze des Prüflaufs kann nie geprüft sein — nicht erst vollständig lesen.
      else if (st.isFile()) dateien.set(rel, st.size > GRENZEN.maxDateiBytes ? `zu groß (${st.size} Bytes)` : createHash('sha256').update(readFileSync(pfad)).digest('hex'))
      else fremd.push(rel)
    }
  }
  gehe(ordner, '')
  return { dateien, fremd }
}

/**
 * Vergleicht den installierten Inhalt mit der geprüften Dateiliste eines Berichts (F-1075). Ein Bericht über einen höheren Pfad
 * (git, Präfix) gilt nur mit seinen Dateien unter dem installierten Pfad.
 * @param bericht - geltender Bericht
 * @param ordner - installierter Ordner (Skill-Ordner bzw. node_modules/<paket>)
 * @param optionen - { unterpfad: Pfad des installierten Ordners relativ zum Berichtspfad ('' = gleich) }
 * @returns null (gleich) oder Grund
 */
export function vergleicheInhalt(bericht: GespeicherterBericht, ordner: string, optionen: { unterpfad: string }): string | null {
  const praefix = optionen.unterpfad === '' ? '' : `${optionen.unterpfad}/`
  const geprueft = new Map(bericht.daten.inhalt.dateien.filter((d) => d.pfad.startsWith(praefix)).map((d) => [d.pfad.slice(praefix.length), d.sha256]))
  let ist: ReturnType<typeof leseInstalliert>
  try {
    ist = leseInstalliert(ordner)
  } catch (fehler) {
    console.error(`[pruefbericht] installierter Inhalt '${ordner}' nicht lesbar:`, fehler)
    return `installierter Inhalt nicht lesbar: ${(fehler as Error).message}`
  }
  const abweichungen: string[] = []
  for (const f of ist.fremd) abweichungen.push(`${f} (keine reguläre Datei)`)
  for (const [pfad, hash] of ist.dateien) {
    const soll = geprueft.get(pfad)
    if (soll === undefined) abweichungen.push(`${pfad} (nicht geprüft)`)
    else if (soll !== hash) abweichungen.push(`${pfad} (Inhalt anders als geprüft)`)
  }
  for (const pfad of geprueft.keys()) if (!ist.dateien.has(pfad)) abweichungen.push(`${pfad} (geprüft, aber nicht installiert)`)
  if (abweichungen.length === 0) return null
  return `installierter Inhalt ≠ geprüfter Inhalt (${abweichungen.length}): ${abweichungen.slice(0, 5).join('; ')}${abweichungen.length > 5 ? ' …' : ''} — abgebrochen`
}

/** Präfix der Artefakt-ids. */
export const PRUEFBERICHT_PRAEFIX = 'pruefbericht-'

/** Ein gelesener Bericht mit Ablage-Daten. */
export interface GespeicherterBericht {
  artefakt_id: string
  version: number
  daten: PruefberichtDaten
}

/**
 * Legt einen Prüfbericht als Kernartefakt an (Lineage: Laufakte des Prüflaufs). Validiert vorher (wirft bei Verstoß).
 * @param schluessel - Katalog-id oder 's-<sammlung_id>'
 * @param daten - Payload
 * @param laufakte - { inhaltsHash } der Laufakte (Lineage) oder null (Testhilfe ohne Lauf)
 * @param profilReferenz - Profilreferenz
 * @param optionen - { basisVerzeichnis, schreiber }
 * @returns { artefakt_id, version }
 */
export function registrierePruefbericht(
  schluessel: string,
  daten: PruefberichtDaten,
  laufakte: { inhaltsHash: string } | null,
  profilReferenz: ProfilReferenz,
  optionen: { basisVerzeichnis?: string; schreiber?: LineageSchreiber }
): { artefakt_id: string; version: number } {
  const verstoesse = validierePruefberichtDaten(daten)
  if (verstoesse.length > 0) throw new Error(`Prüfbericht verstößt gegen schemas/kontrollzustand-pruefbericht-payload.schema.json: ${verstoesse.join('; ')}`)
  const artefaktId = `${PRUEFBERICHT_PRAEFIX}${schluessel}`
  const eingaben = laufakte === null ? [] : [{ pfad: `artefakt:laufakte-${daten.lauf_id}`, zitierter_bereich: 'rohstrom-ergebnis', inhalts_hash: laufakte.inhaltsHash }]
  const r = registriereKernArtefakt(artefaktId, profilReferenz, { erzeuger: 'kern', schritt: 'eignungspruefung' }, daten, eingaben, optionen)
  return { artefakt_id: artefaktId, version: r.versionSequenz }
}

/**
 * Liest alle Versionen aller Prüfberichte einer Ablage (ungültige Payloads werden übersprungen und geloggt).
 * @param basisVerzeichnis - Kontrollzustand der Workforce
 * @param schreiber - stiller Schreiber
 * @returns Berichte
 */
export function ladePruefberichte(basisVerzeichnis: string, schreiber?: LineageSchreiber): GespeicherterBericht[] {
  let ordner: string[]
  try {
    ordner = readdirSync(basisVerzeichnis).filter((n) => n.startsWith(`lineage-${PRUEFBERICHT_PRAEFIX}`))
  } catch (fehler) {
    if ((fehler as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw fehler
  }
  const berichte: GespeicherterBericht[] = []
  for (const n of ordner) {
    const artefaktId = n.slice('lineage-'.length)
    for (const v of listeVersionen(artefaktId, { basisVerzeichnis, ...(schreiber !== undefined ? { schreiber } : {}) })) {
      const verstoesse = validierePruefberichtDaten(v.daten)
      if (verstoesse.length > 0) {
        console.error(`[pruefbericht] '${artefaktId}' Version ${v.versionSequenz} ungültig, übersprungen: ${verstoesse.join('; ')}`)
        continue
      }
      berichte.push({ artefakt_id: artefaktId, version: v.versionSequenz, daten: v.daten as PruefberichtDaten })
    }
  }
  return berichte
}

/**
 * Normalform einer git-Adresse für den Vergleich (klein, ohne „/“ und „.git“ am Ende).
 * @param url - Adresse
 * @returns Normalform
 */
export function normalisiereRepo(url: string): string {
  return url
    .toLowerCase()
    .replace(/\/+$/, '')
    .replace(/\.git$/, '')
}

/** Was vor „Installieren“ angezeigt wird — die Kennzeichen, an die ein Bericht passen muss. */
export type AngezeigteQuelle = { art: 'git'; repo: string; sha: string; quellPfad: string } | { art: 'npm'; paket: string; version: string; integrity: string }

/**
 * Gleiche Quelle (unabhängig von der Version)? git: gleiches Repo und Berichtspfad '' oder Präfix des angezeigten Pfads an einer
 * Segmentgrenze; npm: gleiches Paket.
 * @param q - Quelle des Berichts
 * @param a - angezeigte Quelle
 * @returns true bei gleicher Quelle
 */
function gleicheQuelle(q: PruefQuelle, a: AngezeigteQuelle): boolean {
  if (q.art === 'git' && a.art === 'git') return normalisiereRepo(q.repo) === normalisiereRepo(a.repo) && (q.pfad === '' || a.quellPfad === q.pfad || a.quellPfad.startsWith(`${q.pfad}/`))
  if (q.art === 'npm' && a.art === 'npm') return q.paket === a.paket
  return false
}

/**
 * Gepinnte Version einer Quelle (für Texte und Vergleiche).
 * @param q - Quelle
 * @returns SHA bzw. Version
 */
export function versionVon(q: PruefQuelle | AngezeigteQuelle): string {
  return q.art === 'git' ? q.sha : q.version
}

/**
 * Neuester zuerst: erstellt_am, dann Version, dann Artefakt-id (Advisor C11).
 * @param a - Bericht
 * @param b - Bericht
 * @returns Sortierwert
 */
export function neuesterZuerst(a: GespeicherterBericht, b: GespeicherterBericht): number {
  if (a.daten.erstellt_am !== b.daten.erstellt_am) return a.daten.erstellt_am < b.daten.erstellt_am ? 1 : -1
  if (a.version !== b.version) return b.version - a.version
  return a.artefakt_id < b.artefakt_id ? 1 : a.artefakt_id > b.artefakt_id ? -1 : 0
}

/** Ergebnis von waehleBericht. */
export interface BerichtWahl {
  /** der geltende Bericht zur angezeigten Version, sonst null */
  bericht: GespeicherterBericht | null
  /** Grund der Sperre (409) oder null, wenn „Freigeben & installieren“ zulässig ist */
  sperre: string | null
}

/**
 * Welcher Bericht gilt für die angezeigte, gepinnte Version (Kopf der Datei)?
 * @param berichte - alle Berichte der Ablage
 * @param angezeigt - angezeigte Quelle
 * @returns { bericht, sperre }
 */
export function waehleBericht(berichte: readonly GespeicherterBericht[], angezeigt: AngezeigteQuelle): BerichtWahl {
  const gleiche = berichte.filter((b) => gleicheQuelle(b.daten.quelle, angezeigt)).sort(neuesterZuerst)
  const passt = (q: PruefQuelle): boolean => (q.art === 'git' ? q.sha === versionVon(angezeigt) : angezeigt.art === 'npm' && q.version === angezeigt.version && q.integrity === angezeigt.integrity)
  const neuester = gleiche.find((b) => passt(b.daten.quelle))
  if (neuester !== undefined) {
    if (neuester.daten.ergebnis.urteil === 'NICHT_GEEIGNET') return { bericht: neuester, sperre: `Prüfbericht zu ${versionVon(angezeigt)} lautet NICHT_GEEIGNET — keine Freigabe dieser Version` }
    return { bericht: neuester, sperre: null }
  }
  const anderer = gleiche[0]
  const kennung = (q: PruefQuelle | AngezeigteQuelle): string => (q.art === 'npm' ? `${q.version} (${q.integrity.slice(0, 19)}…)` : q.sha)
  if (anderer !== undefined) return { bericht: null, sperre: `Prüfbericht nur für ${kennung(anderer.daten.quelle)}, angezeigt ist ${kennung(angezeigt)} — in der Sammlung erneut „Auswählen“ (Eignungsprüfung)` }
  return { bericht: null, sperre: 'ohne Prüfbericht zur angezeigten Version — erst in der Sammlung „Auswählen“ (Eignungsprüfung)' }
}
