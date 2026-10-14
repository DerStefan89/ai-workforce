/**
 * Datei: src/plugin-kopie/index.ts
 *
 * Zweck: Gefilterte, gepinnte Kopie eines Plugins aus Stefans Claude Code (F45 F-3b-1, Plan features/F45/plan-f3b.md v2.1;
 * Entscheidungen E-F3b-1 … E-F3b-6):
 * - leseKopieQuelle (I/O, nur lesend): Manifest, Lizenzdateien der Wurzel und alles unter skills/, agents/, commands/;
 * - projiziereKopie (rein): Positivliste je Bestandteil — Skills (Frontmatter name/description/license/argument-hint, Name =
 *   Ordner), Agents (name/description/tools/model/color; tools Pflicht, ohne Agent/Task/Skill, jeder Name im Werkzeugsatz
 *   'schreibend'; model nur inherit), Commands (ohne Frontmatter oder description/argument-hint/disable-model-invocation; nie
 *   allowed-tools); Hooks, MCP, LSP und plugin.json-Pfade außerhalb der Standardordner nie; seit F-3b-2 kein Bestandteil, dessen
 *   Dateien CLAUDE_PLUGIN_DATA enthalten (Grund plugin_daten, Variante A). Frontmatter fail-closed (BOM,
 *   '--- ', Leerzeile davor → nicht eindeutig). Grenzen und Pfadregeln des Prüflaufs (src/sammlung/inhalt.ts). Manifest neu
 *   (name, version, description, license; LF). kopie_hash in der Form von berechneInhaltHash;
 * - schreibeKopie (I/O): <wurzel>/<plugin-id>/<kopie_hash>/ inhaltsadressiert, nie überschrieben (Temp-Geschwister + rename);
 * - loesePluginAuf, bestimmeFreigabeZustand (rein): eine Auflösung der id für alle Wege, Vorrang der Zustände (Advisor N6);
 * - ermittlePluginStand (I/O): Projektion, Freigabe-Zustand und Prüfbericht eines Plugins für GET /api/plugins.
 *
 * Wird aufgerufen von: scripts/leitstand/routen-plugin-freigabe.mjs, src/plugin-lauf/index.ts, src/plugin-kopie/kopie.test.ts, scripts/check-f45-f3b1-freigabe.mjs,
 * public/leitstand/plugins-workforce-anzeige.test.mjs (über ergaenzePluginBestand).
 *
 * Wichtig:
 * - Auf dem Startweg importiert nur src/plugin-lauf dieses Modul (Gate f45-f3b2). Unter ~/.claude wird nie geschrieben (nur gelesen).
 * - Bytes übernommener Dateien bleiben unverändert (Hash je Datei = Quelle); nur das Manifest entsteht neu.
 * - Die Regeln sind absichtlich strenger als die CLI: was nicht schlicht ist, wird nicht übernommen (sichtbar mit Grund).
 */

import { createHash } from 'node:crypto'
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { lstat, readdir, readFile } from 'node:fs/promises'
import { dirname, join, resolve, sep } from 'node:path'
import { hashAusDateien } from '../claude-plugins/index.ts'
import type { Bestandteile, PluginEintrag } from '../claude-plugins/types.ts'
import { leseFrontmatterStreng, NAME_MUSTER, PLUGIN_ID_MUSTER } from '../faehigkeiten/index.ts'
import type { PluginFreigabe } from '../faehigkeiten/types.ts'
import { findeNamensKonflikt, GRENZEN, type InhaltDatei, istBinaer, pfadSchluessel, pruefePfad } from '../sammlung/inhalt.ts'
import { type GespeicherterBericht, neuesterZuerst, vergleicheInhalt, waehleBericht } from '../sammlung/pruefbericht.ts'
import type { AufloesungArt, FreigabeZustand, KopieQuelle, KopieSchreiben, KopieTeil, NichtGrund, NichtTeil, Projektion, QuellDatei } from './types.ts'

export type * from './types.ts'

/** Standardordner, aus denen übernommen werden kann. */
export const STANDARD_ORDNER: readonly string[] = Object.freeze(['skills', 'agents', 'commands'])

/** Frontmatter-Positivlisten (Advisor F2; Muster F-1 Delta B2 — nur nach Messung erweitern). */
const SKILL_FELDER: ReadonlySet<string> = new Set(['name', 'description', 'license', 'argument-hint'])
const AGENT_FELDER: ReadonlySet<string> = new Set(['name', 'description', 'tools', 'model', 'color'])
const COMMAND_FELDER: ReadonlySet<string> = new Set(['description', 'argument-hint', 'disable-model-invocation'])
/** Werkzeuge, die ein Agent nie tragen darf (Subagent ruft Subagent/Skill) — wie VERBOTENE_AGENT_WERKZEUGE in F-1. */
const VERBOTENE_AGENT_WERKZEUGE = new Set(['Agent', 'Task', 'Skill'])
/** Lizenzdatei in der Plugin-Wurzel (wie src/claude-plugins). */
const LIZENZ_MUSTER = /^(licen[cs]e|copying)(\..*)?$/i
/** F45 F-3b-2 (Variante A): Text, der einen Bestandteil sperrt — die CLI legt sonst den Datenordner des Plugins unter ~/.claude an. */
export const PLUGIN_DATEN_MARKE = 'CLAUDE_PLUGIN_DATA'
/** Dateinamen in Normalform, die irgendwo in einem Bestandteil die Übernahme sperren (Advisor F2c). */
const SPERR_DATEIEN = new Set(['claude.md', 'claude.local.md', 'hooks.json', '.mcp.json', '.lsp.json', 'plugin.json', 'marketplace.json'])

/**
 * Prüft eine Plugin-id vor jedem Pfadbau: '<name>@<marketplace>' (PLUGIN_ID_MUSTER) und als Pfadsegment zulässig (pruefePfad,
 * Advisor N9: kein Punkt am Ende, kein Gerätename).
 * @param id - Plugin-id (fremde Eingabe aus der CLI-Liste)
 * @returns null oder Grund
 */
export function pruefePluginId(id: unknown): string | null {
  if (typeof id !== 'string' || !PLUGIN_ID_MUSTER.test(id)) return `Plugin-id '${String(id).slice(0, 80)}' hat nicht die Form <name>@<marketplace>`
  const pfad = pruefePfad(id)
  return pfad === null ? null : `Plugin-id '${id}' ist als Ordnername unzulässig (${pfad})`
}

/**
 * Normalform eines Segments (NFC, klein) wie neutralisierePfad.
 * @param segment - Segment
 * @returns Normalform
 */
function normal(segment: string): string {
  return segment.normalize('NFC').toLowerCase()
}

/**
 * true, wenn ein Pfadsegment die Übernahme sperrt (.claude*, CLAUDE.md, Konfigurationsdateien, settings*.json).
 * @param segment - Segment
 * @returns gesperrt
 */
function istSperrname(segment: string): boolean {
  const n = normal(segment)
  return n.startsWith('.claude') || SPERR_DATEIEN.has(n) || /^settings[^/]*\.json$/.test(n)
}

// ─── Lesen (nur lesend) ──────────────────────────────────────────────────────

/**
 * Liest die Quelle der Kopie aus dem Plugin-Ordner: Manifest, Lizenzdateien der Wurzel, alles unter den Standardordnern
 * (Links werden nicht verfolgt, sondern als „andere“ gemeldet; Dateien über GRENZEN.maxDateiBytes nicht gelesen). Mehr als
 * GRENZEN.maxEintraege Einträge oder mehr als GRENZEN.maxBytes gelesene Bytes → Grund (Code-Review 5: der Speicher bleibt auch bei
 * jedem GET begrenzt; gezählt wird alles unter den Standardordnern, auch später nicht übernommene Teile — fail-closed). Wirft nie.
 * @param ordner - absoluter Plugin-Ordner
 * @returns Quelle oder Grund
 */
export async function leseKopieQuelle(ordner: string): Promise<{ ok: true; quelle: KopieQuelle } | { ok: false; grund: string }> {
  const dateien: QuellDatei[] = []
  const andere: KopieQuelle['andere'] = []
  let eintraege = 0
  let gelesen = 0
  const liesDatei = async (absolut: string, rel: string, groesse: number): Promise<string | null> => {
    const lesen = groesse <= GRENZEN.maxDateiBytes
    if (lesen) gelesen += groesse
    if (gelesen > GRENZEN.maxBytes) return `mehr als ${GRENZEN.maxBytes} Bytes in den Standardordnern — nicht kopierbar`
    dateien.push({
      pfad: rel,
      groesse,
      bytes: lesen ? await readFile(absolut) : null,
    })
    return null
  }
  const gehe = async (absolut: string, rel: string): Promise<string | null> => {
    for (const e of await readdir(absolut, { withFileTypes: true })) {
      if (++eintraege > GRENZEN.maxEintraege) return `mehr als ${GRENZEN.maxEintraege} Einträge in den Standardordnern`
      const voll = join(absolut, e.name)
      const r = `${rel}/${e.name}`
      const st = await lstat(voll)
      if (st.isSymbolicLink()) andere.push({ pfad: r, art: 'link' })
      else if (st.isDirectory()) {
        const g = await gehe(voll, r)
        if (g !== null) return g
      } else if (st.isFile()) {
        const g = await liesDatei(voll, r, st.size)
        if (g !== null) return g
      } else andere.push({ pfad: r, art: 'eintragstyp' })
    }
    return null
  }
  try {
    let manifestText: string | null = null
    try {
      manifestText = await readFile(join(ordner, '.claude-plugin', 'plugin.json'), 'utf8')
    } catch (fehler) {
      // Code-Review H2: fehlt das Manifest, gilt der Name aus der id; jeder andere Lesefehler wird geloggt (nicht still).
      if ((fehler as NodeJS.ErrnoException).code !== 'ENOENT') console.error(`[plugin-kopie] Manifest in '${ordner}' nicht lesbar:`, fehler)
      manifestText = null
    }
    for (const e of await readdir(ordner, { withFileTypes: true })) {
      const voll = join(ordner, e.name)
      const st = await lstat(voll)
      if (STANDARD_ORDNER.includes(e.name)) {
        if (st.isSymbolicLink()) andere.push({ pfad: e.name, art: 'link' })
        else if (st.isDirectory()) {
          const g = await gehe(voll, e.name)
          if (g !== null) return { ok: false, grund: g }
        }
      } else if (st.isFile() && LIZENZ_MUSTER.test(e.name)) {
        const g = await liesDatei(voll, e.name, st.size)
        if (g !== null) return { ok: false, grund: g }
      }
    }
    dateien.sort((a, b) => (a.pfad < b.pfad ? -1 : a.pfad > b.pfad ? 1 : 0))
    return { ok: true, quelle: { manifestText, dateien, andere } }
  } catch (fehler) {
    return {
      ok: false,
      grund: `Plugin-Ordner nicht lesbar: ${(fehler as Error).message}`,
    }
  }
}

// ─── Projektion (rein) ───────────────────────────────────────────────────────

/**
 * Art des Frontmatters (Advisor F1/N11): BOM → unklar (wird nie entfernt); beginnt der Text nach trimStart mit '---', muss er
 * genau mit '---\n' bzw. '---\r\n' beginnen (sonst unklar); sonst keins.
 * @param text - Dateiinhalt
 * @returns 'keins' | 'streng' | 'unklar'
 */
export function frontmatterArt(text: string): 'keins' | 'streng' | 'unklar' {
  if (text.startsWith('\uFEFF')) return 'unklar'
  if (!text.trimStart().startsWith('---')) return 'keins'
  return text.startsWith('---\n') || text.startsWith('---\r\n') ? 'streng' : 'unklar'
}

/**
 * Liest ein streng erkanntes Frontmatter gegen eine Positivliste; allowed-tools wird eigens benannt.
 * @param text - Inhalt (frontmatterArt = 'streng')
 * @param erlaubt - Positivliste
 * @returns Felder oder { grund, detail }
 */
function leseFelder(text: string, erlaubt: ReadonlySet<string>): { ok: true; felder: Map<string, string> } | { ok: false; grund: NichtGrund; detail: string } {
  const ende = text.split(/\r?\n/).indexOf('---', 1)
  const kopf = ende > 0 ? text.split(/\r?\n/).slice(1, ende) : []
  if (kopf.some((z) => /^\s*["']?allowed-tools["']?\s*:/.test(z))) return { ok: false, grund: 'allowed_tools', detail: 'allowed-tools' }
  const gelesen = leseFrontmatterStreng(text, erlaubt)
  return gelesen.ok ? { ok: true, felder: gelesen.felder } : { ok: false, grund: 'frontmatter_feld', detail: gelesen.grund }
}

/**
 * Werkzeugname einer Regel ('Bash(npm install)' → 'Bash').
 * @param regel - Regel
 * @returns Name
 */
function werkzeugName(regel: string): string {
  return regel.split('(')[0].trim()
}

/** Eingabe von projiziereKopie. */
export interface ProjektionEingabe {
  /** Plugin-id aus der CLI-Liste */
  pluginId: string
  /** leseKopieQuelle(...).quelle */
  quelle: KopieQuelle
  /** Bestandteile laut F-3a-Leser (für Hooks/MCP/LSP „nicht übernommen“) */
  bestandteile: Bestandteile
  /** erlaubte_werkzeuge des Werkzeugsatzes 'schreibend' (E-F3b-3), null = nicht bestimmbar */
  werkzeugsatz: readonly string[] | null
}

/**
 * Prüft die Dateien eines Bestandteils (Links, Pfade, Sperrnamen, Größe, Binär); die Hauptdatei muss lesbar sein.
 * @param dateien - Dateien des Bestandteils
 * @param andere - Links/andere Einträge darin
 * @param weitereSkillMd - true, wenn eine weitere SKILL.md darunter liegt (nur Skills)
 * @returns null oder { grund, detail }
 */
function pruefeTeilDateien(dateien: readonly QuellDatei[], andere: readonly { pfad: string }[], weitereSkillMd: boolean): { grund: NichtGrund; detail: string | null } | null {
  if (andere.length > 0) return { grund: 'link', detail: andere[0].pfad }
  for (const d of dateien) {
    if (pruefePfad(d.pfad) !== null) return { grund: 'pfad_abgelehnt', detail: d.pfad }
    if (d.pfad.split('/').slice(1).some(istSperrname)) return { grund: 'sperrname', detail: d.pfad }
  }
  if (weitereSkillMd) return { grund: 'weitere_skill_md', detail: null }
  for (const d of dateien) {
    if (d.bytes === null) return { grund: 'zu_gross', detail: d.pfad }
    if (istBinaer(d.bytes)) return { grund: 'binaer', detail: d.pfad }
  }
  // F45 F-3b-2 (Variante A, Spike f3b2 S6): CLAUDE_PLUGIN_DATA im Text legt im Lauf ~/.claude/plugins/data/<name>-inline an —
  // mit oder ohne ${…}, auch in Hilfsdateien (fail-closed).
  for (const d of dateien) if (d.bytes?.includes(PLUGIN_DATEN_MARKE) === true) return { grund: 'plugin_daten', detail: d.pfad }
  return null
}

/**
 * Projiziert ein Plugin auf die gefilterte Kopie (Regeln im Dateikopf). Rein.
 * @param e - Eingabe
 * @returns Projektion (ok mit Dateien und kopie_hash) oder Grund, warum das Plugin nicht kopierbar ist
 */
export function projiziereKopie(e: ProjektionEingabe): Projektion {
  const nicht: NichtTeil[] = []
  const nein = (grund: string): Projektion => ({
    ok: false,
    grund,
    nicht_uebernommen: nicht,
  })
  const idGrund = pruefePluginId(e.pluginId)
  if (idGrund !== null) return nein(idGrund)

  // Nie übernommen: Hooks, MCP, LSP (je Name einmal).
  const einmal = (typ: NichtTeil['typ'], namen: readonly string[], grund: NichtGrund): void => {
    for (const n of [...new Set(namen)]) nicht.push({ typ, name: n, grund, detail: null })
  }
  einmal(
    'hook',
    e.bestandteile.hooks.map((h) => h.ereignis),
    'hook_nie'
  )
  einmal(
    'mcp',
    e.bestandteile.mcp.map((m) => m.name),
    'mcp_spaeter'
  )
  einmal(
    'lsp',
    e.bestandteile.lsp.map((l) => l.name),
    'lsp_nicht'
  )

  // Manifest: nur schlichte Strings übernehmen; Name (Präfix im Lauf) muss schlicht sein.
  let roh: Record<string, unknown> = {}
  if (e.quelle.manifestText !== null) {
    try {
      const geparst: unknown = JSON.parse(e.quelle.manifestText)
      if (typeof geparst === 'object' && geparst !== null && !Array.isArray(geparst)) roh = geparst as Record<string, unknown>
    } catch {
      roh = {}
    }
  }
  const name = typeof roh.name === 'string' ? roh.name : e.pluginId.slice(0, e.pluginId.indexOf('@'))
  if (!NAME_MUSTER.test(name)) return nein(`Plugin-Name '${name.slice(0, 60)}' ist nicht schlicht (nur Buchstaben, Ziffern, Punkt, Binde- und Unterstrich) — nicht kopierbar`)
  const text = (w: unknown): string | null => (typeof w === 'string' && w.trim() !== '' && w.length <= 2000 ? w : null)
  const manifest: Record<string, string> = { name }
  for (const feld of ['version', 'description', 'license']) {
    const wert = text(roh[feld])
    if (wert !== null) manifest[feld] = wert
  }
  // plugin.json-Pfade für skills/agents/commands außerhalb der Standardordner werden nicht übernommen.
  for (const feld of STANDARD_ORDNER) {
    const w = roh[feld]
    if (w === undefined) continue
    const liste = typeof w === 'string' ? [w] : Array.isArray(w) ? w : [w]
    const standard = (p: unknown): boolean =>
      typeof p === 'string' &&
      p
        .replace(/^\$\{CLAUDE_PLUGIN_ROOT\}[\\/]?/, '')
        .replace(/^\.\//, '')
        .replace(/[\\/]+$/, '') === feld
    if (!liste.every(standard))
      nicht.push({
        typ: 'pfad',
        name: feld,
        grund: 'nur_standardordner',
        detail: null,
      })
  }

  // Pfad-Zwillinge und Datei/Ordner-Konflikte über ALLE Einträge (Advisor N10, inhalt.ts: alle übergeben).
  const konflikt = findeNamensKonflikt([...e.quelle.dateien.map((d) => d.pfad), ...e.quelle.andere.map((a) => a.pfad)])
  if (konflikt !== null) return nein(`${konflikt} — nicht kopierbar`)

  for (const a of e.quelle.andere) {
    const teile = a.pfad.split('/')
    if (teile.length === 1) nicht.push({ typ: 'pfad', name: a.pfad, grund: 'link', detail: a.pfad })
    else if (teile.length === 2 && teile[0] === 'skills')
      nicht.push({
        typ: 'skill',
        name: teile[1],
        grund: 'link',
        detail: a.pfad,
      })
  }
  const uebernommen: KopieTeil[] = []
  const uebernommeneDateien: QuellDatei[] = []
  const unter = (praefix: string): { dateien: QuellDatei[]; andere: { pfad: string }[] } => ({
    dateien: e.quelle.dateien.filter((d) => d.pfad.startsWith(praefix)),
    andere: e.quelle.andere.filter((a) => a.pfad.startsWith(praefix) || `${a.pfad}/` === praefix),
  })
  const lies = (d: QuellDatei | undefined): string => (d?.bytes === null || d === undefined ? '' : d.bytes.toString('utf8'))

  // Skills: skills/<ordner>/SKILL.md (genau diese Schreibweise).
  const skillOrdner = [...new Set(e.quelle.dateien.filter((d) => d.pfad.startsWith('skills/') && d.pfad.split('/').length >= 3).map((d) => d.pfad.split('/')[1]))].sort()
  for (const ordner of skillOrdner) {
    const teil = unter(`skills/${ordner}/`)
    const haupt = teil.dateien.find((d) => d.pfad.split('/').length === 3 && normal(d.pfad.split('/')[2]) === 'skill.md')
    if (haupt === undefined) continue
    const hinzu = (grund: NichtGrund, detail: string | null = null): void => {
      nicht.push({ typ: 'skill', name: ordner, grund, detail })
    }
    if (haupt.pfad !== `skills/${ordner}/SKILL.md`) {
      hinzu('name_unzulaessig', haupt.pfad)
      continue
    }
    const weitere = teil.dateien.some((d) => d !== haupt && normal(d.pfad.split('/').pop() ?? '') === 'skill.md')
    const datei = pruefeTeilDateien(teil.dateien, teil.andere, weitere)
    if (datei !== null) {
      hinzu(datei.grund, datei.detail)
      continue
    }
    const inhalt = lies(haupt)
    const art = frontmatterArt(inhalt)
    if (art !== 'streng') {
      hinzu(art === 'unklar' ? 'frontmatter_unklar' : 'frontmatter_fehlt')
      continue
    }
    const fm = leseFelder(inhalt, SKILL_FELDER)
    if (!fm.ok) {
      hinzu(fm.grund, fm.detail)
      continue
    }
    if (!NAME_MUSTER.test(ordner)) hinzu('name_unzulaessig', ordner)
    else if (fm.felder.get('name') !== ordner) hinzu('name_abweichend', fm.felder.get('name') ?? '')
    else if ((fm.felder.get('description') ?? '') === '') hinzu('frontmatter_fehlt', 'description')
    else {
      uebernommen.push({ typ: 'skill', name: ordner, pfad: haupt.pfad })
      uebernommeneDateien.push(...teil.dateien)
    }
  }

  // Agents: agents/<n>.md direkt; tiefer liegende .md sind nicht übernommen (Unterordner).
  const werkzeugNamen = e.werkzeugsatz === null ? null : new Set(e.werkzeugsatz.map(werkzeugName))
  const agentDateien = e.quelle.dateien.filter((d) => d.pfad.startsWith('agents/') && d.pfad.toLowerCase().endsWith('.md'))
  for (const d of agentDateien) {
    const teile = d.pfad.split('/')
    const stamm = (teile.pop() ?? '').replace(/\.md$/i, '')
    const hinzu = (grund: NichtGrund, detail: string | null = null): void => {
      nicht.push({ typ: 'agent', name: stamm, grund, detail })
    }
    if (teile.length > 1) {
      hinzu('unterordner', d.pfad)
      continue
    }
    const datei = pruefeTeilDateien([d], [], false)
    if (datei !== null) {
      hinzu(datei.grund, datei.detail)
      continue
    }
    const inhalt = lies(d)
    const art = frontmatterArt(inhalt)
    if (art !== 'streng') {
      hinzu(art === 'unklar' ? 'frontmatter_unklar' : 'frontmatter_fehlt')
      continue
    }
    const fm = leseFelder(inhalt, AGENT_FELDER)
    if (!fm.ok) {
      hinzu(fm.grund, fm.detail)
      continue
    }
    const f = fm.felder
    const tools = (f.get('tools') ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t !== '')
    if (!NAME_MUSTER.test(stamm)) hinzu('name_unzulaessig', stamm)
    else if (f.get('name') !== stamm) hinzu('name_abweichend', f.get('name') ?? '')
    else if ((f.get('description') ?? '') === '') hinzu('frontmatter_fehlt', 'description')
    else if (tools.length === 0) hinzu('agent_tools_fehlt')
    else if (tools.some((t) => !/^[A-Za-z]+$/.test(t))) hinzu('frontmatter_feld', 'tools')
    else if (tools.some((t) => VERBOTENE_AGENT_WERKZEUGE.has(t))) hinzu('agent_tools_verboten', tools.filter((t) => VERBOTENE_AGENT_WERKZEUGE.has(t)).join(', '))
    else if (werkzeugNamen === null) hinzu('werkzeugsatz_unbestimmt')
    else if (tools.some((t) => !werkzeugNamen.has(t))) hinzu('agent_tools_ausserhalb', tools.filter((t) => !werkzeugNamen.has(t)).join(', '))
    else if (f.has('model') && f.get('model') !== 'inherit') hinzu('agent_model', f.get('model') ?? '')
    else if (f.has('color') && !/^[a-z]+$/.test(f.get('color') ?? '')) hinzu('frontmatter_feld', 'color')
    else {
      uebernommen.push({ typ: 'agent', name: stamm, pfad: d.pfad })
      uebernommeneDateien.push(d)
    }
  }
  for (const a of e.quelle.andere.filter((x) => x.pfad.startsWith('agents/') && x.pfad.toLowerCase().endsWith('.md')))
    nicht.push({
      typ: 'agent',
      name: (a.pfad.split('/').pop() ?? '').replace(/\.md$/i, ''),
      grund: 'link',
      detail: a.pfad,
    })

  // Commands: commands/**/*.md; Name relativ zu commands/ mit ':' (wie die CLI). Nicht zuordenbar (E-F3b-5).
  for (const d of e.quelle.dateien.filter((x) => x.pfad.startsWith('commands/') && x.pfad.toLowerCase().endsWith('.md'))) {
    const cname = d.pfad.slice('commands/'.length).replace(/\.md$/i, '').split('/').join(':')
    const hinzu = (grund: NichtGrund, detail: string | null = null): void => {
      nicht.push({ typ: 'command', name: cname, grund, detail })
    }
    const datei = pruefeTeilDateien([d], [], false)
    if (datei !== null) {
      hinzu(datei.grund, datei.detail)
      continue
    }
    const inhalt = lies(d)
    const art = frontmatterArt(inhalt)
    if (art === 'unklar') {
      hinzu('frontmatter_unklar')
      continue
    }
    if (art === 'streng') {
      const fm = leseFelder(inhalt, COMMAND_FELDER)
      if (!fm.ok) {
        hinzu(fm.grund, fm.detail)
        continue
      }
    }
    uebernommen.push({ typ: 'command', name: cname, pfad: d.pfad })
    uebernommeneDateien.push(d)
  }
  for (const a of e.quelle.andere.filter((x) => x.pfad.startsWith('commands/') && x.pfad.toLowerCase().endsWith('.md')))
    nicht.push({
      typ: 'command',
      name: a.pfad.slice('commands/'.length).replace(/\.md$/i, '').split('/').join(':'),
      grund: 'link',
      detail: a.pfad,
    })

  // Lizenzdateien der Wurzel (für die Lizenzprüfung im Bericht), nur regulär, lesbar, nicht binär.
  for (const d of e.quelle.dateien.filter((x) => !x.pfad.includes('/'))) if (d.bytes !== null && !istBinaer(d.bytes) && pruefePfad(d.pfad) === null) uebernommeneDateien.push(d)

  const dateien: InhaltDatei[] = [
    {
      pfad: '.claude-plugin/plugin.json',
      bytes: Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8'),
    },
    ...uebernommeneDateien.map((d) => ({
      pfad: d.pfad,
      bytes: d.bytes as Buffer,
    })),
  ]
  const bytes = dateien.reduce((s, d) => s + d.bytes.length, 0)
  if (dateien.length > GRENZEN.maxDateien) return nein(`übernommene Teile überschreiten die Grenze des Prüflaufs (${dateien.length} Dateien, höchstens ${GRENZEN.maxDateien}) — nicht kopierbar`)
  if (bytes > GRENZEN.maxBytes) return nein(`übernommene Teile überschreiten die Grenze des Prüflaufs (${bytes} Bytes, höchstens ${GRENZEN.maxBytes}) — nicht kopierbar`)
  dateien.sort((a, b) => (a.pfad < b.pfad ? -1 : a.pfad > b.pfad ? 1 : 0))
  const reihe = { skill: 0, agent: 1, command: 2 }
  uebernommen.sort((a, b) => reihe[a.typ] - reihe[b.typ] || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
  return {
    ok: true,
    kopie_hash: hashAusDateien(dateien.map((d) => [d.pfad, d.bytes] as const)),
    dateien,
    uebernommen,
    nicht_uebernommen: nicht,
    name,
    version: manifest.version ?? null,
  }
}

// ─── Schreiben ───────────────────────────────────────────────────────────────

/**
 * Vergleicht einen Ordner mit einer Dateiliste (Pfade + Bytes über sha256); Links und andere Einträge sind Abweichungen.
 * @param ordner - Ordner
 * @param dateien - Soll
 * @returns null bei Gleichheit, sonst erste Abweichung
 */
function vergleicheOrdner(ordner: string, dateien: readonly InhaltDatei[]): string | null {
  const soll = new Map(dateien.map((d) => [d.pfad, createHash('sha256').update(d.bytes).digest('hex')]))
  const ist = new Map<string, string>()
  const gehe = (absolut: string, rel: string): string | null => {
    for (const n of readdirSync(absolut)) {
      const r = rel === '' ? n : `${rel}/${n}`
      const st = lstatSync(join(absolut, n))
      if (st.isDirectory()) {
        const g = gehe(join(absolut, n), r)
        if (g !== null) return g
      } else if (st.isFile())
        ist.set(
          r,
          createHash('sha256')
            .update(readFileSync(join(absolut, n)))
            .digest('hex')
        )
      else return `${r} (keine reguläre Datei)`
    }
    return null
  }
  const fremd = gehe(ordner, '')
  if (fremd !== null) return fremd
  for (const [p, h] of ist) if (soll.get(p) !== h) return `${p} (${soll.has(p) ? 'Inhalt anders' : 'zusätzlich'})`
  for (const p of soll.keys()) if (!ist.has(p)) return `${p} (fehlt)`
  return null
}

/**
 * Schreibt die Kopie nach <wurzel>/<pluginId>/<kopie_hash>/ (inhaltsadressiert). Vorhanden mit gleichem Inhalt →
 * wiederverwendet; mit anderem Inhalt → 409 „Kopie verändert“, nichts überschrieben (Löschen nur durch Stefan). Neu: erst
 * Temp-Geschwister, dann rename. Synchron (Advisor N1: kein await zwischen Prüfung und Schreiben der Freigabe).
 * @param wurzel - Wurzel der Kopien (pluginKopienWurzel)
 * @param pluginId - Plugin-id
 * @param projektion - projiziereKopie(...) (ok)
 * @returns Ordner oder Fehler mit Status
 */
export function schreibeKopie(wurzel: string, pluginId: string, projektion: Projektion): KopieSchreiben {
  const idGrund = pruefePluginId(pluginId)
  if (idGrund !== null) return { ok: false, status: 400, grund: idGrund }
  if (!projektion.ok) return { ok: false, status: 409, grund: projektion.grund }
  const basis = resolve(wurzel)
  const ziel = resolve(basis, pluginId, projektion.kopie_hash)
  if (!ziel.startsWith(basis + sep))
    return {
      ok: false,
      status: 400,
      grund: 'Ziel der Kopie liegt außerhalb der Wurzel',
    }
  try {
    for (const pfad of [basis, dirname(ziel), ziel]) {
      if (existsSync(pfad) && lstatSync(pfad).isSymbolicLink())
        return {
          ok: false,
          status: 409,
          grund: 'Ablage der Plugin-Kopien enthält eine Verknüpfung — nichts geschrieben, erst von Hand prüfen',
        }
    }
    if (existsSync(ziel)) {
      const abweichung = vergleicheOrdner(ziel, projektion.dateien)
      // QA 5: kein absoluter Pfad im Grund (sichtbar in der Oberfläche); die Ablage nennt ARCHITECTURE.md §2.
      return abweichung === null
        ? { ok: true, ordner: ziel, neu: false }
        : {
            ok: false,
            status: 409,
            grund: `Die gespeicherte Kopie dieses Stands wurde verändert (${abweichung}) — nichts überschrieben, erst prüfen und von Hand entfernen`,
          }
    }
  } catch (fehler) {
    return {
      ok: false,
      status: 500,
      grund: `Kopie nicht prüfbar: ${(fehler as Error).message}`,
    }
  }
  const temp = join(dirname(ziel), `.tmp-${projektion.kopie_hash.slice(0, 12)}-${process.pid}-${Date.now()}`)
  try {
    for (const d of projektion.dateien) {
      const datei = join(temp, ...d.pfad.split('/'))
      mkdirSync(dirname(datei), { recursive: true })
      writeFileSync(datei, d.bytes, { flag: 'wx' })
    }
    renameSync(temp, ziel)
    return { ok: true, ordner: ziel, neu: true }
  } catch (fehler) {
    rmSync(temp, { recursive: true, force: true })
    console.error(`[plugin-kopie] Kopie '${ziel}' nicht schreibbar:`, fehler)
    return {
      ok: false,
      status: 500,
      grund: `Kopie nicht schreibbar: ${(fehler as Error).message}`,
    }
  }
}

// ─── Auflösung und Zustand ───────────────────────────────────────────────────

/**
 * Eine Auflösung der Plugin-id für GET, Prüfstart, Freigabe, Zuordnung (und F-3b-2): gleiche id in mehreren Scopes oder nur in
 * Schreibweise verschieden (pfadSchluessel) → mehrdeutig (Advisor F7/N9).
 * @param bestand - Bestand (status ok mit plugins) oder Fehlerstand
 * @param pluginId - gesuchte id
 * @returns { art, plugin? }
 */
export function loesePluginAuf(
  bestand: {
    status: string
    plugins?: readonly PluginEintrag[]
    grund?: string
  },
  pluginId: string
): { art: AufloesungArt; plugin?: PluginEintrag } {
  if (bestand.status !== 'ok' || !Array.isArray(bestand.plugins)) return { art: 'unbestimmbar' }
  const schluessel = pfadSchluessel(pluginId)
  const treffer = bestand.plugins.filter((p) => typeof p.id === 'string' && pfadSchluessel(p.id) === schluessel)
  if (treffer.length === 0) return { art: 'fehlt' }
  if (treffer.length > 1 || treffer[0].id !== pluginId) return { art: 'mehrdeutig' }
  return { art: 'eindeutig', plugin: treffer[0] }
}

/** Eingabe von bestimmeFreigabeZustand. */
export interface ZustandEingabe {
  aufloesung: AufloesungArt
  freigabe: PluginFreigabe | undefined
  /** kopie_hash der aktuellen Projektion, null = nicht kopierbar */
  aktuellerHash: string | null
  /** der in der Freigabe genannte Bericht ist da, gültig und passt zum kopie_hash */
  berichtGefunden: boolean
  /** Code-Review 4: zum Freigabe-Hash gilt inzwischen ein anderer Bericht bzw. eine Sperre (waehleBericht) */
  berichtUeberholt?: boolean
  /** Abweichung der gespeicherten Kopie vom Bericht (vergleicheInhalt) oder null */
  kopieAbweichung: string | null
}

/**
 * Zustand der Freigabe mit festem Vorrang (Advisor N6): unbestimmbar > mehrdeutig > quelle_fehlt > keine > bericht_fehlt >
 * bericht_ueberholt > kopie_veraendert > veraltet > freigegeben. Rein. bericht_ueberholt (Code-Review 4, fail-closed): zum
 * freigegebenen Hash gilt inzwischen ein anderer Bericht oder eine Sperre (etwa ein neuerer NICHT_GEEIGNET) — neu freigeben.
 * @param e - Eingabe
 * @returns Zustand
 */
export function bestimmeFreigabeZustand(e: ZustandEingabe): FreigabeZustand {
  if (e.aufloesung === 'unbestimmbar') return 'unbestimmbar'
  if (e.aufloesung === 'mehrdeutig') return 'mehrdeutig'
  if (e.aufloesung === 'fehlt') return 'quelle_fehlt'
  if (e.freigabe === undefined) return 'keine'
  if (!e.berichtGefunden) return 'bericht_fehlt'
  if (e.berichtUeberholt === true) return 'bericht_ueberholt'
  if (e.kopieAbweichung !== null) return 'kopie_veraendert'
  if (e.aktuellerHash !== e.freigabe.kopie_hash) return 'veraltet'
  return 'freigegeben'
}

/**
 * Der in einer Freigabe genannte Bericht ('<artefakt_id>@<version>'), wenn er gültig ist und genau zu diesem Plugin und Hash
 * passt (sonst null).
 * @param berichte - alle Berichte der Ablage
 * @param pluginId - Plugin-id
 * @param freigabe - Freigabe
 * @returns Bericht oder null
 */
export function berichtDerFreigabe(berichte: readonly GespeicherterBericht[], pluginId: string, freigabe: PluginFreigabe): GespeicherterBericht | null {
  const b = berichte.find((x) => `${x.artefakt_id}@${x.version}` === freigabe.pruefbericht)
  if (b === undefined) return null
  const q = b.daten.quelle
  return q.art === 'plugin' && q.plugin_id === pluginId && q.kopie_hash === freigabe.kopie_hash && b.daten.ergebnis.urteil !== 'NICHT_GEEIGNET' ? b : null
}

/** Stand eines Plugins für GET /api/plugins (additiv je Eintrag). */
export interface PluginStand {
  kopie: {
    ok: boolean
    kopie_hash: string | null
    grund: string | null
    uebernommen: KopieTeil[]
    nicht_uebernommen: NichtTeil[]
  }
  freigabe: {
    zustand: FreigabeZustand
    kopie_hash: string | null
    pruefbericht: string | null
    freigegeben_am: string | null
    abweichung: string | null
  }
  /** neuester Prüfbericht zu diesem Plugin (gleich welcher Hash) oder null */
  pruefbericht: null | {
    kennung: string
    kopie_hash: string
    urteil: string
    befunde: unknown[]
    auflagen: string[]
    zusammenfassung: string
    erstellt_am: string
    passt: boolean
  }
  /** Grund, aus dem „Freigeben“ jetzt nicht ginge (waehleBericht), oder null */
  freigabe_sperre: string | null
}

/**
 * Stand eines Plugins: Projektion der aktuellen Quelle, Zustand der Freigabe (mit Prüfung der gespeicherten Kopie gegen den
 * Bericht), neuester Bericht und Sperre der Freigabe. Liest nur; wirft nie.
 * @param e - { plugin, aufloesung, freigabe, berichte, kopienWurzel, werkzeugsatz }
 * @returns PluginStand
 */
export async function ermittlePluginStand(e: { plugin: PluginEintrag; aufloesung: AufloesungArt; freigabe: PluginFreigabe | undefined; berichte: readonly GespeicherterBericht[]; kopienWurzel: string | null; werkzeugsatz: readonly string[] | null }): Promise<PluginStand> {
  let projektion: Projektion
  const quelle =
    e.aufloesung === 'eindeutig'
      ? await leseKopieQuelle(e.plugin.pfad)
      : {
          ok: false as const,
          grund: e.aufloesung === 'mehrdeutig' ? 'Plugin mehrfach installiert — nicht eindeutig' : 'Plugin-Bestand nicht bestimmbar',
        }
  if (!quelle.ok) projektion = { ok: false, grund: quelle.grund, nicht_uebernommen: [] }
  else
    projektion = projiziereKopie({
      pluginId: e.plugin.id,
      quelle: quelle.quelle,
      bestandteile: e.plugin.bestandteile,
      werkzeugsatz: e.werkzeugsatz,
    })
  const aktuellerHash = projektion.ok ? projektion.kopie_hash : null
  const bericht = e.freigabe === undefined ? null : berichtDerFreigabe(e.berichte, e.plugin.id, e.freigabe)
  let kopieAbweichung: string | null = null
  if (e.freigabe !== undefined && bericht !== null) {
    if (e.kopienWurzel === null) kopieAbweichung = 'Ablage der Kopien in dieser Instanz nicht gesetzt'
    else if (pruefePluginId(e.plugin.id) !== null) kopieAbweichung = 'Plugin-id unzulässig'
    else {
      const ordner = join(e.kopienWurzel, e.plugin.id, e.freigabe.kopie_hash)
      kopieAbweichung = existsSync(ordner) ? vergleicheInhalt(bericht, ordner, { unterpfad: '' }) : 'gespeicherte Kopie fehlt'
    }
  }
  const ueberholt =
    e.freigabe !== undefined && bericht !== null
      ? (() => {
          const w = waehleBericht(e.berichte, {
            art: 'plugin',
            plugin_id: e.plugin.id,
            kopie_hash: e.freigabe.kopie_hash,
          })
          return w.sperre !== null || w.bericht === null || `${w.bericht.artefakt_id}@${w.bericht.version}` !== e.freigabe.pruefbericht
        })()
      : false
  const aufloesung = e.aufloesung === 'eindeutig' && !quelle.ok ? 'unbestimmbar' : e.aufloesung
  const zustand = bestimmeFreigabeZustand({
    aufloesung,
    freigabe: e.freigabe,
    aktuellerHash,
    berichtGefunden: bericht !== null,
    berichtUeberholt: ueberholt,
    kopieAbweichung,
  })
  const eigene = e.berichte.filter((b) => b.daten.quelle.art === 'plugin' && b.daten.quelle.plugin_id === e.plugin.id).sort(neuesterZuerst)
  const neuester = eigene[0]
  const nq = neuester?.daten.quelle
  const wahl =
    aktuellerHash === null
      ? null
      : waehleBericht(e.berichte, {
          art: 'plugin',
          plugin_id: e.plugin.id,
          kopie_hash: aktuellerHash,
        })
  return {
    kopie: {
      ok: projektion.ok,
      kopie_hash: aktuellerHash,
      grund: projektion.ok ? null : projektion.grund,
      uebernommen: projektion.ok ? projektion.uebernommen : [],
      nicht_uebernommen: projektion.nicht_uebernommen,
    },
    freigabe: {
      zustand,
      kopie_hash: e.freigabe?.kopie_hash ?? null,
      pruefbericht: e.freigabe?.pruefbericht ?? null,
      freigegeben_am: e.freigabe?.freigegeben_am ?? null,
      abweichung: zustand === 'kopie_veraendert' ? kopieAbweichung : null,
    },
    pruefbericht:
      neuester === undefined || nq?.art !== 'plugin'
        ? null
        : {
            kennung: `${neuester.artefakt_id}@${neuester.version}`,
            kopie_hash: nq.kopie_hash,
            urteil: neuester.daten.ergebnis.urteil,
            befunde: neuester.daten.ergebnis.befunde,
            auflagen: neuester.daten.ergebnis.auflagen,
            zusammenfassung: neuester.daten.ergebnis.zusammenfassung,
            erstellt_am: neuester.daten.erstellt_am,
            passt: nq.kopie_hash === aktuellerHash,
          },
    freigabe_sperre: wahl === null ? (projektion.ok ? null : projektion.grund) : wahl.sperre,
  }
}
