/**
 * Datei: src/plugin-lauf/index.ts
 *
 * Zweck: Einziger Weg eines Plugins aus Stefans Claude Code in einen Workforce-Lauf (F45 F-3b-2, Plan features/F45/plan-f3b.md
 * v3/v3.1; Spike features/F45/nachweise/f3b2/spike.md):
 * - pluginZuordnungDerRolle, pluginKennungen (rein): Zuordnung eines Projekts je Rolle aus der lokalen Datei und die Kennungen
 *   'plugin:<typ>:<plugin-id>:<name>@<kopie_hash>' für „Anzeige = Start“ (nur Einträge mit Freigabe — ohne Freigabe wirkt eine
 *   Zuordnung nicht, Plan v3.1 Punkt 2);
 * - bereitePluginStartVor (async, liest nur): vor jedem Lauf Bestand frisch, Freigabe-Zustand muss 'freigegeben' sein (Quelle =
 *   kopie_hash, gepinnte Kopie = Prüfbericht, Bericht gilt), jeder zugeordnete Teil übernommen, Agent-tools im Werkzeugsatz des
 *   Schritts, Manifest-Name eindeutig — sonst ein sichtbarer Grund, der Lauf startet nicht;
 * - baueLaufKopie (synchron, I/O): Teilmenge der gepinnten Kopie (Manifest, Lizenz, zugeordnete Skills/Agents) aus den gegen
 *   den Bericht geprüften Bytes nach <laufWurzel>/<lauf_kopie_hash>/ (inhaltsadressiert); vergleicheLaufKopie nach dem Lauf;
 * - erfassePluginDatenordner, vergleichePluginDatenordner (nur lesend): Vorher/Nachher von <claude>/plugins/data (Variante A).
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs (Startweg), src/execution-controller/index.ts (Datenordner, Lauf-Kopie
 * nach dem Lauf), src/plugin-lauf/plugin-lauf.test.ts, scripts/check-f45-f3b2-lauf.mjs, features/F45/nachweise/f3b2/beleg.mjs.
 *
 * Wichtig:
 * - Unter ~/.claude wird nie geschrieben. Geschrieben wird nur die Lauf-Kopie unter <pluginKopienWurzel>/_lauf (ARCHITECTURE §2).
 * - Hooks, MCP, LSP und Commands kommen nie in eine Lauf-Kopie (E-F3b-1, E-F3b-5); die gepinnte Kopie enthält Hooks/MCP/LSP ohnehin
 *   nicht, Commands lässt die Teilmenge weg.
 * - Fehlertexte nennen Plugin-id, Teil und Zustand, keine absoluten Pfade (sichtbar in der Oberfläche).
 */

import { createHash } from 'node:crypto'
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { hashAusDateien } from '../claude-plugins/index.ts'
import type { PluginEintrag } from '../claude-plugins/types.ts'
import { leseFrontmatterStreng, NAME_MUSTER, projektEinstellungen } from '../faehigkeiten/index.ts'
import type { FaehigkeitenLokal } from '../faehigkeiten/types.ts'
import { berichtDerFreigabe, ermittlePluginStand, loesePluginAuf } from '../plugin-kopie/index.ts'
import type { FreigabeZustand } from '../plugin-kopie/types.ts'
import type { GespeicherterBericht } from '../sammlung/pruefbericht.ts'

/** Ein Eintrag der Zuordnung einer Rolle. */
export interface ZuordnungEintrag {
  typ: 'skill' | 'agent'
  pluginId: string
  name: string
  /** '<typ>:<plugin-id>:<name>' wie in der lokalen Datei */
  eintrag: string
}

/** Ein geprüftes Plugin für den Start (Ergebnis von bereitePluginStartVor). */
export interface PluginImStart {
  pluginId: string
  /** Manifest-name der gepinnten Kopie = Präfix im Lauf */
  name: string
  kopieHash: string
  /** '<artefakt_id>@<version>' des Prüfberichts der Freigabe */
  pruefbericht: string
  bericht: GespeicherterBericht
  /** <pluginKopienWurzel>/<plugin-id>/<kopie_hash> */
  gepinntOrdner: string
  skills: string[]
  agents: string[]
  /** tools je zugeordnetem Agent (Frontmatter der gepinnten Kopie) — der Start prüft sie erneut gegen den Werkzeugsatz des Schritts */
  agentWerkzeuge: Record<string, string[]>
}

/** Grund, aus dem ein zugeordneter Teil nicht in den Lauf kommt, ohne dass der Lauf abbricht. */
export type NichtGeladenGrund = 'nur_claude_code' | 'nur_schreibend' | 'keine_freigabe'

/** Ein zugeordneter, aber nicht geladener Teil (sichtbar in Laufakte und Anzeige). */
export interface NichtGeladen extends ZuordnungEintrag {
  grund: NichtGeladenGrund
}

/** Ergebnis von bereitePluginStartVor. */
export type PluginStart = { art: 'keine' } | { art: 'fehler'; grund: string } | { art: 'start'; kennungen: string[]; plugins: PluginImStart[]; nichtGeladen: NichtGeladen[] }

/** Ergebnis von baueLaufKopie. */
export type LaufKopie = { ok: true; ordner: string; laufKopieHash: string; neu: boolean; dateien: Array<{ pfad: string; sha256: string }> } | { ok: false; grund: string }

/** Ergebnis von erfassePluginDatenordner. */
export type DatenordnerStand = { ok: true; stand: Map<string, string> } | { ok: false; grund: string }

/** Höchstzahl der Einträge unter plugins/data (darüber „nicht prüfbar“). */
export const DATENORDNER_GRENZE = 20_000

/** Felder eines Agent-Frontmatters (wie die Positivliste der Kopie). */
const AGENT_FELDER: ReadonlySet<string> = new Set(['name', 'description', 'tools', 'model', 'color'])

/** Lesbarer Text je Freigabe-Zustand (Grund eines abgelehnten Starts). */
const ZUSTAND_TEXT: Record<FreigabeZustand, string> = {
  unbestimmbar: 'Plugin-Bestand nicht bestimmbar',
  mehrdeutig: 'Plugin mehrfach installiert, nicht eindeutig',
  quelle_fehlt: 'in Claude Code nicht mehr installiert',
  keine: 'keine Freigabe',
  bericht_fehlt: 'Prüfbericht der Freigabe fehlt oder lautet NICHT_GEEIGNET',
  bericht_ueberholt: 'Prüfbericht überholt — neu freigeben',
  kopie_veraendert: 'gespeicherte Kopie weicht vom Prüfbericht ab',
  veraltet: 'Plugin in Claude Code geändert, die Freigabe gilt für einen älteren Stand — neu prüfen und freigeben',
  freigegeben: 'freigegeben',
}

/**
 * Sichtbarer Kurzgrund eines Fehlers ohne Pfad (Code-Review K1): Fehlercode bzw. Fehlername; die volle Meldung geht nur ins Log.
 * @param fehler - gefangener Fehler
 * @returns z. B. 'ENOENT'
 */
function fehlerKurz(fehler: unknown): string {
  const f = fehler as NodeJS.ErrnoException
  return typeof f?.code === 'string' && f.code !== '' ? f.code : typeof f?.name === 'string' && f.name !== '' ? f.name : 'Fehler'
}

/**
 * Entfernt absolute Pfade (Windows und POSIX) aus einem fremden Text, bevor er sichtbar wird (Code-Review K1).
 * @param text - z. B. Abweichung aus vergleicheInhalt
 * @returns Text mit '<Pfad>' statt absoluter Pfade
 */
export function ohnePfade(text: string): string {
  return text.replace(/[A-Za-z]:[\\/][^\s'"()]*/g, '<Pfad>').replace(/(^|[\s('"])\/(?:Users|home|root|tmp|var)\/[^\s'"()]*/g, '$1<Pfad>')
}

/**
 * Zerlegt einen Eintrag '<typ>:<plugin-id>:<name>' (die id enthält kein ':').
 * @param eintrag - Eintrag der Zuordnung
 * @returns Eintrag oder null bei falscher Form
 */
function zerlege(eintrag: string): ZuordnungEintrag | null {
  const teile = eintrag.split(':')
  if (teile.length !== 3 || (teile[0] !== 'skill' && teile[0] !== 'agent')) return null
  return { typ: teile[0], pluginId: teile[1], name: teile[2], eintrag }
}

/**
 * Zuordnung eines Projekts für eine Rolle (Reihenfolge der lokalen Datei). Rein.
 * @param lokal - gültige lokale Datei
 * @param projektId - Projekt
 * @param rolle - Rolle des Schritts
 * @returns Einträge
 */
export function pluginZuordnungDerRolle(lokal: FaehigkeitenLokal, projektId: string, rolle: string): ZuordnungEintrag[] {
  const liste = projektEinstellungen(lokal, projektId).plugin_zuordnung?.[rolle] ?? []
  return liste.flatMap((x) => zerlege(x) ?? [])
}

/**
 * Kennungen der wirksamen Zuordnung für „Anzeige = Start“: 'plugin:<eintrag>@<kopie_hash der Freigabe>', sortiert. Einträge
 * ohne Freigabe fehlen (sie wirken nicht). Rein.
 * @param lokal - gültige lokale Datei
 * @param projektId - Projekt
 * @param rolle - Rolle
 * @returns Kennungen
 */
export function pluginKennungen(lokal: FaehigkeitenLokal, projektId: string, rolle: string): string[] {
  const freigaben = lokal.plugin_freigaben ?? {}
  return pluginZuordnungDerRolle(lokal, projektId, rolle)
    .flatMap((z) => (Object.hasOwn(freigaben, z.pluginId) ? [`plugin:${z.eintrag}@${freigaben[z.pluginId].kopie_hash}`] : []))
    .sort()
}

/**
 * Zugeordnete Teile einer Rolle ohne Freigabe-Eintrag (Rücknahme): sie wirken nicht und stehen als „nicht geladen“ in der Laufakte
 * (Plan v3.1 Punkt 2). Rein, ohne Bestand — auch für Starts ohne plugin:-Kennung (Code-Review K2, QA M1).
 * @param lokal - gültige lokale Datei
 * @param projektId - Projekt
 * @param rolle - Rolle
 * @returns Einträge mit Grund keine_freigabe
 */
export function pluginOhneFreigabe(lokal: FaehigkeitenLokal, projektId: string, rolle: string): NichtGeladen[] {
  const freigaben = lokal.plugin_freigaben ?? {}
  return pluginZuordnungDerRolle(lokal, projektId, rolle)
    .filter((z) => !Object.hasOwn(freigaben, z.pluginId))
    .map((z) => ({ ...z, grund: 'keine_freigabe' as const }))
}

/** Eingabe von bereitePluginStartVor. */
export interface PluginStartEingabe {
  lokal: FaehigkeitenLokal
  projektId: string
  rolle: string
  worker: string
  /** Werkzeugsatz-Art des Schritts */
  art: string
  /** Bestand frisch (CLI-Liste), ungeschwärzt */
  leseBestand: () => Promise<{ status: string; plugins?: readonly PluginEintrag[]; grund?: string }>
  berichte: readonly GespeicherterBericht[]
  /** Wurzel der gepinnten Kopien (null = in dieser Instanz nicht gesetzt) */
  kopienWurzel: string | null
  /** Werkzeugsatz der Projektion (pluginWerkzeugsatz der Instanz, wie bei der Freigabe) */
  kopieWerkzeugsatz: readonly string[] | null
  /** Werkzeugnamen des Schritts — zugeordnete Agents dürfen nur diese tragen (Advisor A5) */
  schrittWerkzeugNamen: readonly string[]
}

/**
 * Prüft die Zuordnung einer Rolle vor dem Lauf (Regeln im Dateikopf). Ohne Zuordnung kein Bestandsabruf; Worker ≠ claude-code
 * bzw. Art ≠ schreibend → nicht geladen (heute nicht erreichbar, Netz); Einträge ohne Freigabe → nicht geladen. Wirft nie.
 * @param e - Eingabe
 * @returns PluginStart
 */
export async function bereitePluginStartVor(e: PluginStartEingabe): Promise<PluginStart> {
  const nein = (grund: string): PluginStart => ({ art: 'fehler', grund: `Plugin-Start abgelehnt: ${grund} — Lauf startet nicht` })
  try {
    const zuordnung = pluginZuordnungDerRolle(e.lokal, e.projektId, e.rolle)
    if (zuordnung.length === 0) return { art: 'keine' }
    const kennungen = pluginKennungen(e.lokal, e.projektId, e.rolle)
    const alleNicht = (grund: NichtGeladenGrund): PluginStart => ({ art: 'start', kennungen, plugins: [], nichtGeladen: zuordnung.map((z) => ({ ...z, grund })) })
    if (e.worker !== 'claude-code') return alleNicht('nur_claude_code')
    if (e.art !== 'schreibend') return alleNicht('nur_schreibend')
    const freigaben = e.lokal.plugin_freigaben ?? {}
    const nichtGeladen = pluginOhneFreigabe(e.lokal, e.projektId, e.rolle)
    if (e.kopienWurzel === null && zuordnung.some((z) => Object.hasOwn(freigaben, z.pluginId))) return nein('Ablage der Plugin-Kopien in dieser Instanz nicht gesetzt')
    const wirksam = zuordnung.filter((z) => Object.hasOwn(freigaben, z.pluginId))
    if (wirksam.length === 0) return { art: 'start', kennungen, plugins: [], nichtGeladen }
    const bestand = await e.leseBestand()
    const plugins: PluginImStart[] = []
    for (const pluginId of [...new Set(wirksam.map((z) => z.pluginId))]) {
      const eigene = wirksam.filter((z) => z.pluginId === pluginId)
      const aufl = loesePluginAuf(bestand, pluginId)
      if (aufl.art !== 'eindeutig' || aufl.plugin === undefined) {
        const zustand: FreigabeZustand = aufl.art === 'fehlt' ? 'quelle_fehlt' : aufl.art === 'mehrdeutig' ? 'mehrdeutig' : 'unbestimmbar'
        return nein(`Plugin '${pluginId}' nicht startbar (${zustand}: ${ZUSTAND_TEXT[zustand]})`)
      }
      const freigabe = freigaben[pluginId]
      const stand = await ermittlePluginStand({ plugin: aufl.plugin, aufloesung: aufl.art, freigabe, berichte: e.berichte, kopienWurzel: e.kopienWurzel, werkzeugsatz: e.kopieWerkzeugsatz })
      const zustand = stand.freigabe.zustand
      // Code-Review 8: ohne Kopie-Wurzel ein eigener Grund (der Zustand wäre sonst „freigegeben: freigegeben“).
      if (e.kopienWurzel === null) return nein(`Plugin '${pluginId}': Ablage der Plugin-Kopien in dieser Instanz nicht gesetzt`)
      if (zustand !== 'freigegeben') {
        const abweichung = stand.freigabe.abweichung !== null ? ` — ${ohnePfade(stand.freigabe.abweichung)}` : ''
        return nein(`Plugin '${pluginId}' nicht startbar (${zustand}: ${ZUSTAND_TEXT[zustand]}${abweichung}); Zuordnung entfernen oder neu prüfen und freigeben`)
      }
      for (const z of eigene) {
        if (!stand.kopie.uebernommen.some((t) => t.typ === z.typ && t.name === z.name)) return nein(`${z.typ} '${z.name}' aus Plugin '${pluginId}' ist in der Kopie nicht übernommen — Zuordnung entfernen`)
      }
      const bericht = berichtDerFreigabe(e.berichte, pluginId, freigabe)
      if (bericht === null) return nein(`Plugin '${pluginId}': Prüfbericht der Freigabe fehlt`)
      const gepinntOrdner = join(e.kopienWurzel, pluginId, freigabe.kopie_hash)
      let manifestName: unknown
      try {
        manifestName = (JSON.parse(readFileSync(join(gepinntOrdner, '.claude-plugin', 'plugin.json'), 'utf8')) as Record<string, unknown>).name
      } catch (fehler) {
        console.error(`[plugin-lauf] Manifest der gepinnten Kopie von '${pluginId}' nicht lesbar:`, fehler)
        return nein(`Plugin '${pluginId}': Manifest der gepinnten Kopie nicht lesbar (${fehlerKurz(fehler)})`)
      }
      if (typeof manifestName !== 'string' || !NAME_MUSTER.test(manifestName)) return nein(`Plugin '${pluginId}': Manifest-Name der Kopie ist nicht schlicht`)
      const agents = eigene.filter((z) => z.typ === 'agent').map((z) => z.name)
      const agentWerkzeuge: Record<string, string[]> = {}
      for (const a of agents) {
        const tools = agentTools(gepinntOrdner, a)
        if (!tools.ok) return nein(`Agent '${a}' aus Plugin '${pluginId}': ${tools.grund}`)
        const grund = werkzeugeAusserhalb(tools.tools, e.schrittWerkzeugNamen)
        if (grund !== null) return nein(`Agent '${a}' aus Plugin '${pluginId}': ${grund}`)
        agentWerkzeuge[a] = tools.tools
      }
      plugins.push({ pluginId, name: manifestName, kopieHash: freigabe.kopie_hash, pruefbericht: freigabe.pruefbericht, bericht, gepinntOrdner, skills: eigene.filter((z) => z.typ === 'skill').map((z) => z.name), agents, agentWerkzeuge })
    }
    const namen = new Map<string, string[]>()
    for (const p of plugins) namen.set(p.name, [...(namen.get(p.name) ?? []), p.pluginId])
    for (const [name, ids] of namen) if (ids.length > 1) return nein(`Manifest-Name '${name}' doppelt (${ids.join(', ')}) — kein eindeutiges Präfix im Lauf; eine Zuordnung entfernen`)
    return { art: 'start', kennungen, plugins, nichtGeladen }
  } catch (fehler) {
    console.error('[plugin-lauf] Vorbereitung gescheitert:', fehler)
    return nein(`nicht prüfbar (${fehlerKurz(fehler)})`)
  }
}

/**
 * tools eines Agents der gepinnten Kopie (Frontmatter, schlichte Komma-Liste wie in der Kopie geprüft).
 * @param gepinntOrdner - gepinnte Kopie
 * @param name - Agent-Name
 * @returns tools oder Grund
 */
function agentTools(gepinntOrdner: string, name: string): { ok: true; tools: string[] } | { ok: false; grund: string } {
  const fm = leseFrontmatterStreng(readFileSync(join(gepinntOrdner, 'agents', `${name}.md`), 'utf8'), AGENT_FELDER)
  if (!fm.ok) return { ok: false, grund: `Frontmatter nicht lesbar (${fm.grund})` }
  return {
    ok: true,
    tools: (fm.felder.get('tools') ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t !== ''),
  }
}

/**
 * Werkzeuge eines Agents außerhalb der Werkzeugnamen des Schritts (Advisor A5). Rein; auch vom Start synchron genutzt.
 * @param tools - tools des Agents
 * @param namen - Werkzeugnamen des Schritts
 * @returns null oder Grund
 */
export function werkzeugeAusserhalb(tools: readonly string[], namen: readonly string[]): string | null {
  const fremd = tools.filter((t) => !namen.includes(t))
  return fremd.length === 0 ? null : `Werkzeuge ${fremd.join(', ')} nicht im Werkzeugsatz dieses Schritts — Zuordnung entfernen`
}

/**
 * Liest einen Ordner synchron (Pfade mit '/', sortiert). Links und andere Einträge → Grund.
 * @param ordner - Ordner
 * @returns Dateien oder Grund
 */
function leseOrdner(ordner: string): { ok: true; dateien: Map<string, Buffer> } | { ok: false; grund: string } {
  const dateien = new Map<string, Buffer>()
  const gehe = (absolut: string, rel: string): string | null => {
    for (const n of readdirSync(absolut).sort()) {
      const r = rel === '' ? n : `${rel}/${n}`
      const st = lstatSync(join(absolut, n))
      if (st.isDirectory()) {
        const g = gehe(join(absolut, n), r)
        if (g !== null) return g
      } else if (st.isFile()) dateien.set(r, readFileSync(join(absolut, n)))
      else return `${r} (keine reguläre Datei)`
    }
    return null
  }
  const g = gehe(ordner, '')
  return g === null ? { ok: true, dateien } : { ok: false, grund: g }
}

/**
 * sha256 als Hex.
 * @param bytes - Inhalt
 * @returns Hash
 */
function sha(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex')
}

/**
 * Vergleicht einen Ordner mit einer Dateiliste (Pfad + sha256).
 * @param ordner - Ordner
 * @param soll - Dateiliste
 * @returns null bei Gleichheit, sonst erste Abweichung
 */
function vergleiche(ordner: string, soll: ReadonlyArray<{ pfad: string; sha256: string }>): string | null {
  const ist = leseOrdner(ordner)
  return ist.ok ? vergleicheDateien(ist.dateien, soll) : ist.grund
}

/**
 * Vergleicht gelesene Dateien mit einer Dateiliste (Pfad + sha256) — eine Regel für Lauf-Kopie und gepinnte Kopie (Code-Review 2).
 * @param ist - Pfad → Bytes
 * @param soll - Dateiliste
 * @returns null bei Gleichheit, sonst erste Abweichung (relativer Pfad)
 */
function vergleicheDateien(ist: ReadonlyMap<string, Buffer>, soll: ReadonlyArray<{ pfad: string; sha256: string }>): string | null {
  const erwartet = new Map(soll.map((d) => [d.pfad, d.sha256]))
  for (const [p, b] of ist) if (erwartet.get(p) !== sha(b)) return `${p} (${erwartet.has(p) ? 'Inhalt anders' : 'zusätzlich'})`
  for (const p of erwartet.keys()) if (!ist.has(p)) return `${p} (fehlt)`
  return null
}

/**
 * Baut die Lauf-Kopie eines Plugins (Regeln im Dateikopf): gepinnte Kopie einmal lesen, Menge und sha256 gegen den Prüfbericht,
 * Teilmenge aus genau diesen Bytes nach <laufWurzel>/<lauf_kopie_hash>/. Vorhanden mit gleichem Inhalt → wiederverwendet; anders
 * oder Verknüpfung → Grund, nichts überschrieben. Synchron (kein await zwischen Prüfung und Start).
 * @param plugin - aus bereitePluginStartVor
 * @param laufWurzel - <pluginKopienWurzel>/_lauf
 * @returns LaufKopie
 */
export function baueLaufKopie(plugin: PluginImStart, laufWurzel: string): LaufKopie {
  const nein = (grund: string): LaufKopie => ({ ok: false, grund: `Lauf-Kopie von '${plugin.pluginId}': ${grund} — Lauf startet nicht` })
  let gelesen: ReturnType<typeof leseOrdner>
  try {
    gelesen = leseOrdner(plugin.gepinntOrdner)
  } catch (fehler) {
    console.error(`[plugin-lauf] gepinnte Kopie von '${plugin.pluginId}' nicht lesbar:`, fehler)
    return nein(`gepinnte Kopie nicht lesbar (${fehlerKurz(fehler)})`)
  }
  if (!gelesen.ok) return nein(`gepinnte Kopie entspricht nicht dem Prüfbericht (${gelesen.grund})`)
  const gegenBericht = vergleicheDateien(gelesen.dateien, plugin.bericht.daten.inhalt.dateien)
  if (gegenBericht !== null) return nein(`gepinnte Kopie entspricht nicht dem Prüfbericht (${gegenBericht})`)
  const gehoert = (p: string): boolean => p === '.claude-plugin/plugin.json' || !p.includes('/') || plugin.skills.some((s) => p.startsWith(`skills/${s}/`)) || plugin.agents.some((a) => p === `agents/${a}.md`)
  const teil = [...gelesen.dateien].filter(([p]) => gehoert(p)).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  for (const s of plugin.skills) if (!teil.some(([p]) => p === `skills/${s}/SKILL.md`)) return nein(`Skill '${s}' fehlt in der gepinnten Kopie`)
  for (const a of plugin.agents) if (!teil.some(([p]) => p === `agents/${a}.md`)) return nein(`Agent '${a}' fehlt in der gepinnten Kopie`)
  const laufKopieHash = hashAusDateien(teil.map(([p, b]) => [p, b] as const))
  const dateien = teil.map(([pfad, b]) => ({ pfad, sha256: sha(b) }))
  const ziel = join(laufWurzel, laufKopieHash)
  const fertig = (neu: boolean): LaufKopie => ({ ok: true, ordner: ziel, laufKopieHash, neu, dateien })
  try {
    for (const p of [laufWurzel, ziel]) if (existsSync(p) && lstatSync(p).isSymbolicLink()) return nein('Ablage der Lauf-Kopien enthält eine Verknüpfung — nichts geschrieben, erst von Hand prüfen')
    if (existsSync(ziel)) {
      const abweichung = vergleiche(ziel, dateien)
      // QA N1: Ablage und gekürzter Hash nennen, damit Stefan den Ordner findet (relativ, ohne Home).
      return abweichung === null ? fertig(false) : nein(`gespeicherte Lauf-Kopie dieses Stands wurde verändert (${abweichung}) — nichts überschrieben; prüfen und von Hand entfernen: Ordner ${laufKopieHash} in der Ablage der Lauf-Kopien (_lauf)`)
    }
  } catch (fehler) {
    console.error(`[plugin-lauf] Ablage der Lauf-Kopien nicht prüfbar:`, fehler)
    return nein(`Ablage nicht prüfbar (${fehlerKurz(fehler)})`)
  }
  const temp = join(laufWurzel, `.tmp-${laufKopieHash.slice(0, 12)}-${process.pid}-${Date.now()}`)
  try {
    for (const [p, b] of teil) {
      const datei = join(temp, ...p.split('/'))
      mkdirSync(dirname(datei), { recursive: true })
      writeFileSync(datei, b, { flag: 'wx' })
    }
    renameSync(temp, ziel)
    return fertig(true)
  } catch (fehler) {
    rmSync(temp, { recursive: true, force: true })
    // Advisor A14: ein paralleler Start kann dasselbe Ziel inzwischen angelegt haben (rename scheitert unter Windows) — gleicher Inhalt = gut.
    if (existsSync(ziel) && vergleiche(ziel, dateien) === null) return fertig(false)
    console.error(`[plugin-lauf] Lauf-Kopie '${ziel}' nicht schreibbar:`, fehler)
    return nein(`nicht schreibbar (${fehlerKurz(fehler)})`)
  }
}

/**
 * Vergleicht eine Lauf-Kopie mit ihrer Dateiliste (nach dem Lauf, Advisor A9). Wirft nie.
 * @param kopie - { ordner, dateien } aus baueLaufKopie
 * @returns null (unverändert) oder Abweichung
 */
export function vergleicheLaufKopie(kopie: { ordner: string; dateien: ReadonlyArray<{ pfad: string; sha256: string }> }): string | null {
  try {
    return vergleiche(kopie.ordner, kopie.dateien)
  } catch (fehler) {
    console.error('[plugin-lauf] Lauf-Kopie nach dem Lauf nicht lesbar:', fehler)
    return `nicht lesbar (${fehlerKurz(fehler)})`
  }
}

/**
 * Momentaufnahme des Plugin-Datenordners (<claude>/plugins/data, rekursiv; Pfad relativ → Art, mtime, Größe), nur lesend.
 * Fehlt er, ist sie leer. Mit gesetztem CLAUDE_CODE_PLUGIN_CACHE_DIR liegt der Datenordner der CLI woanders → nicht prüfbar
 * (Advisor A10). Wirft nie.
 * @param ordner - <claude>/plugins/data
 * @param umgebung - Umgebung des Servers (process.env)
 * @param grenze - Höchstzahl der Einträge
 * @returns Stand oder Grund
 */
export function erfassePluginDatenordner(ordner: string, umgebung: Readonly<Record<string, string | undefined>>, grenze: number = DATENORDNER_GRENZE): DatenordnerStand {
  const umgelenkt = umgebung.CLAUDE_CODE_PLUGIN_CACHE_DIR
  if (typeof umgelenkt === 'string' && umgelenkt !== '') return { ok: false, grund: 'CLAUDE_CODE_PLUGIN_CACHE_DIR ist gesetzt — der Datenordner der CLI liegt woanders, nicht prüfbar' }
  const stand = new Map<string, string>()
  try {
    if (!existsSync(ordner)) return { ok: true, stand }
    const gehe = (absolut: string, rel: string): boolean => {
      for (const n of readdirSync(absolut)) {
        const r = rel === '' ? n : `${rel}/${n}`
        const st = lstatSync(join(absolut, n))
        stand.set(r, `${st.isDirectory() ? 'd' : st.isFile() ? 'f' : 'a'} ${st.mtimeMs} ${st.isDirectory() ? '' : st.size}`)
        if (stand.size > grenze) return false
        if (st.isDirectory() && !gehe(join(absolut, n), r)) return false
      }
      return true
    }
    return gehe(ordner, '') ? { ok: true, stand } : { ok: false, grund: `mehr als ${grenze} Einträge im Plugin-Datenordner — nicht prüfbar` }
  } catch (fehler) {
    console.error('[plugin-lauf] Plugin-Datenordner nicht lesbar:', fehler)
    return { ok: false, grund: `Plugin-Datenordner nicht lesbar (${fehlerKurz(fehler)})` }
  }
}

/**
 * Abweichungen zweier Momentaufnahmen, relativ ('+ neu', '- weg', '~ geändert'), sortiert. Rein.
 * @param vorher - Stand vor dem Lauf
 * @param nachher - Stand nach dem Lauf
 * @returns Abweichungen
 */
export function vergleichePluginDatenordner(vorher: ReadonlyMap<string, string>, nachher: ReadonlyMap<string, string>): string[] {
  const d: string[] = []
  for (const [k, v] of vorher) if (!nachher.has(k)) d.push(`- ${k}`)
  else if (nachher.get(k) !== v) d.push(`~ ${k}`)
  for (const k of nachher.keys()) if (!vorher.has(k)) d.push(`+ ${k}`)
  return d.sort((a, b) => (a.slice(2) < b.slice(2) ? -1 : a.slice(2) > b.slice(2) ? 1 : 0))
}
