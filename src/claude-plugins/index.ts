/**
 * Datei: src/claude-plugins/index.ts
 *
 * Zweck: Leser des Plugin-Bestands aus Stefans Claude Code (F45 F-3a-1, Plan features/F45/plan-f3a.md v2, Entscheidung
 * Stefan E-F3a-1 = CLI-Liste):
 * - Liste und Aktiv-Stand aus `claude plugin list --json` (der Aufruf selbst liegt in scripts/leitstand/routen-plugins.mjs;
 *   hier nur parsePluginListe und listenErgebnisAusProzess),
 * - Bestandteile je Plugin aus dem Plugin-Ordner: Standardorte (skills/, agents/, commands/, hooks/hooks.json, .mcp.json,
 *   .lsp.json) und die sechs plugin.json-Felder hooks, commands, agents, skills, mcpServers, lspServers als Pfad, Liste oder
 *   eingebettet (Advisor H2); eine unbekannte Form wird ein Teilfehler,
 * - Inhalts-Hash des Plugin-Ordners in der Form von berechneInhaltHash, ohne .git/ und .in_use/ (flüchtige Marke jeder
 *   laufenden CLI-Sitzung), mit Grenze für Dateien und Bytes (Abbruch beim Durchlauf),
 * - Risiken als Fakten aus der Deklaration: Hook-Befehl je Ereignis, MCP ungepinnt bzw. entfernt, allowed-tools nicht
 *   wörtlich im Werkzeugsatz 'schreibend', Regel mit externer Wirkung (erstes Wort des Bash-Befehls, nacktes Bash/Bash(*)).
 *
 * Wird aufgerufen von: scripts/leitstand/routen-plugins.mjs, src/claude-plugins/plugins.test.ts,
 * scripts/check-f45-f3a-plugins.mjs, features/F45/nachweise/f3a/ (Gegenprobe).
 *
 * Wichtig:
 * - Nur lesend: readFile/readdir/lstat, nie ein Öffnen zum Schreiben. Kein Lauf importiert dieses Modul (Gate f45-f3a (d)).
 * - Wirft nie aus lesePluginBestand: Listenfehler → status 'fehler' mit Grund, Teilfehler je Plugin → fehler[].
 * - env und headers eines MCP/LSP-Servers werden nicht gelesen (Geheimnisse); Maskierung der übrigen Texte macht die Route.
 * - Spike-Befund (features/F45/nachweise/f3a/spike.md, S1): allowed-tools eines Plugin-Commands erweitert im -p-Lauf den
 *   Werkzeugsatz — deshalb ist rechte_ausserhalb ein Risiko und kein Hinweis.
 */

import { createHash } from 'node:crypto'
import { lstat, readdir, readFile } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import type { EingebautReferenz } from '../faehigkeiten/types.ts'
import { leseFrontmatter, leseFrontmatterFeld } from '../ressourcen/skill-dateien.ts'
import type {
  AgentTeil,
  Bestandteile,
  CliPluginEintrag,
  CommandTeil,
  EingebautEintrag,
  HashGrenzen,
  HookTeil,
  ListenErgebnis,
  LspTeil,
  McpTeil,
  PinArt,
  PluginBestand,
  PluginEintrag,
  Risiko,
  SkillTeil,
} from './types.ts'

export type * from './types.ts'

/** Befehl der Liste (Anzeige und Aufruf). */
export const PLUGIN_LISTE_ARGUMENTE: readonly string[] = ['plugin', 'list', '--json']

/** Standardgrenze beim Hashen (nach Ausschluss von .git/ und .in_use/). */
export const STANDARD_HASH_GRENZEN: HashGrenzen = { dateien: 5000, bytes: 50 * 1024 * 1024 }

/** Ordner im Plugin, die nicht zum Inhalt gehören (nur als erstes Segment). */
export const HASH_AUSSCHLUSS: readonly string[] = ['.git', '.in_use']

/** Programme, deren erstes Nicht-Flag-Argument eine Paketangabe ist. */
const PAKET_STARTER = new Set(['npx', 'bunx', 'pnpx', 'uvx', 'pipx'])
/** Paketmanager, die mit exec/dlx ein Paket starten. */
const PAKET_MANAGER = new Set(['npm', 'pnpm', 'yarn', 'bun'])

/** Erste Wörter eines Bash-Befehls mit Wirkung nach außen (Netz, Veröffentlichung, entfernte Rechner). */
const EXTERN_EIN_WORT = new Set(['gh', 'curl', 'wget', 'ssh', 'scp', 'sftp', 'rsync', 'invoke-webrequest', 'iwr', 'invoke-restmethod', 'irm'])
/** Zwei-Wort-Befehle mit Wirkung nach außen. */
const EXTERN_ZWEI_WORTE = new Set(['git push', 'npm publish', 'pnpm publish', 'yarn publish'])
/** Werkzeuge mit Netzzugriff. */
const EXTERN_WERKZEUGE = new Set(['WebFetch', 'WebSearch'])

/** Lizenzdatei in der Plugin-Wurzel. */
const LIZENZ_MUSTER = /^(licen[cs]e|copying)(\..*)?$/i

// ─── Rein ────────────────────────────────────────────────────────────────────

/**
 * Konfigurationsordner der CLI: CLAUDE_CONFIG_DIR (nicht leer), sonst <home>/.claude (Auflage 6).
 * @param env - Umgebung
 * @param home - Home-Verzeichnis
 * @returns absoluter Pfad
 */
export function bestimmeClaudeOrdner(env: Readonly<Record<string, string | undefined>>, home: string): string {
  const wert = env.CLAUDE_CONFIG_DIR
  return typeof wert === 'string' && wert.trim() !== '' ? wert : join(home, '.claude')
}

/**
 * Prüft, dass das Startziel die Claude-CLI ist (Basisname claude bzw. claude.exe, Groß-/Kleinschreibung und nachgestellte
 * Punkte/Leerzeichen toleriert wie bereinigterBasisname in prozessstart.ts). Die übrigen Regeln (absolut, existiert, keine
 * Shell) prüft starteProzess selbst.
 * @param programm - werkzeugStartziel[0]
 * @returns null oder Grund
 */
export function pruefeClaudeProgramm(programm: unknown): string | null {
  if (typeof programm !== 'string' || programm === '') return 'Startziel der Startvorlage fehlt'
  const basis = (programm.split(/[\\/]/).pop() ?? '').replace(/[.\s]+$/, '').toLowerCase()
  return basis === 'claude' || basis === 'claude.exe' ? null : `Startziel ist nicht die Claude-CLI: ${programm}`
}

/**
 * Übersetzt das Ergebnis von starteProzess in ein Listenergebnis. Eine Zeitgrenze oder ein Abbruch liefert nie eine
 * Teilausgabe (Advisor: kein halbes JSON als Liste).
 * @param erg - { stdout, stderr, exitCode, startfehler, beendigungsart }
 * @returns stdout oder Grund
 */
export function listenErgebnisAusProzess(erg: { stdout: string; stderr: string; exitCode: number | null; startfehler: { message: string } | null; beendigungsart: string | null }): ListenErgebnis {
  if (erg.startfehler !== null) return { ok: false, grund: `claude plugin list nicht startbar: ${erg.startfehler.message}` }
  if (erg.beendigungsart === 'TIMEOUT') return { ok: false, grund: 'claude plugin list: Zeitgrenze überschritten' }
  if (erg.beendigungsart !== null) return { ok: false, grund: `claude plugin list abgebrochen (${erg.beendigungsart})` }
  if (erg.exitCode !== 0) return { ok: false, grund: `claude plugin list endete mit Exit ${erg.exitCode}: ${kuerzeAnWortgrenze(erg.stderr.trim(), 300) || '(ohne Fehlertext)'}` }
  return { ok: true, stdout: erg.stdout }
}

/**
 * Kürzt einen Text an der letzten Wortgrenze vor der Länge (Code-Review 7: ein abgeschnittenes Token entginge der Maskierung
 * in der Route). Ohne Wortgrenze bleibt nur '…'.
 * @param text - Text
 * @param laenge - Höchstlänge
 * @returns gekürzter Text
 */
export function kuerzeAnWortgrenze(text: string, laenge: number): string {
  if (text.length <= laenge) return text
  const grenze = text.slice(0, laenge + 1).search(/\s\S*$/)
  return grenze <= 0 ? '…' : `${text.slice(0, grenze)} …`
}

/**
 * Parst die Ausgabe von `claude plugin list --json`. Kein JSON oder keine Liste → Grund (fatal); ein einzelner Eintrag ohne
 * id/installPath bleibt als Eintrag mit leerem Pfad sichtbar (Code-Review 5: ein Teilfehler kippt nicht die Liste).
 * @param stdout - Ausgabe
 * @returns Einträge oder Grund
 */
export function parsePluginListe(stdout: string): { ok: true; eintraege: CliPluginEintrag[] } | { ok: false; grund: string } {
  let roh: unknown
  try {
    roh = JSON.parse(stdout)
  } catch (fehler) {
    return { ok: false, grund: `Ausgabe von claude plugin list ist kein JSON: ${(fehler as Error).message}` }
  }
  if (!Array.isArray(roh)) return { ok: false, grund: 'Ausgabe von claude plugin list ist keine Liste' }
  const eintraege: CliPluginEintrag[] = []
  for (const [i, e] of roh.entries()) {
    const o = istObjekt(e) ? e : {}
    eintraege.push({
      id: typeof o.id === 'string' && o.id !== '' ? o.id : `(Eintrag ${i} ohne id)`,
      version: typeof o.version === 'string' ? o.version : null,
      scope: typeof o.scope === 'string' ? o.scope : null,
      enabled: typeof o.enabled === 'boolean' ? o.enabled : null,
      installPath: typeof o.installPath === 'string' ? o.installPath : '',
      projectPath: typeof o.projectPath === 'string' ? o.projectPath : null,
      projectEnabled: typeof o.projectEnabled === 'boolean' ? o.projectEnabled : null,
    })
  }
  return { ok: true, eintraege }
}

/**
 * Zerlegt Rohteile eines allowed-tools/tools-Felds in Regeln: Komma und Leerraum auf Klammerebene 0 trennen (Leerzeichen-Form
 * des Agent-Skills-Standards, QA 2), Klammern bleiben ganz; Anführungszeichen um den ganzen Wert (Code-Review 1), [ ] und
 * Anführungszeichen je Regel fallen weg. 'Bash(a:*), Bash(b)', '"Bash(a:*), Read"' und 'Read WebFetch' → je zwei Regeln.
 * @param teile - Rohteile aus leseFrontmatterFeld (oder null)
 * @returns Regeln in Reihenfolge
 */
export function zerlegeRegeln(teile: readonly string[] | null): string[] {
  const regeln: string[] = []
  for (const roh of teile ?? []) {
    const text = roh
      .trim()
      .replace(/^(["'])(.*)\1$/s, '$2')
      .trim()
      .replace(/^\[(.*)\]$/s, '$1')
    let tiefe = 0
    let aktuell = ''
    for (const z of text) {
      if (z === '(') tiefe++
      if (z === ')') tiefe = Math.max(0, tiefe - 1)
      if ((z === ',' || /\s/.test(z)) && tiefe === 0) {
        regeln.push(aktuell)
        aktuell = ''
      } else aktuell += z
    }
    regeln.push(aktuell)
  }
  return regeln.map((r) => r.trim().replace(/^(["'])(.*)\1$/, '$2').trim()).filter((r) => r !== '')
}

/**
 * Pin-Stand eines MCP-Servers (Fakt): http/sse oder url → entfernt; npx/bunx/pnpx/uvx/pipx bzw. npm|pnpm|yarn|bun exec|dlx
 * → Paketangabe (erstes Nicht-Flag-Argument; Paket-Flags je Starter: npx-Familie --package/-p, uvx --from, pipx --spec;
 * Flags mit Wert wie uvx --python werden übersprungen, pipx run ist ein Unterbefehl), gepinnt nur mit exakter Version
 * (name@1.2.3, @scope/name@1.2.3, name==1.2.3); `cmd /c <befehl …>` wird ausgepackt (übliche Windows-Form, QA 5); jeder andere
 * Befehl → anderer_befehl (nicht bewertet, Advisor M3).
 * @param server - { command, args, type, url }
 * @returns { pin, paket }
 */
export function pinVon(server: { command?: unknown; args?: unknown; type?: unknown; url?: unknown }): { pin: PinArt; paket: string | null } {
  if (server.type === 'http' || server.type === 'sse' || (typeof server.url === 'string' && server.command === undefined)) return { pin: 'entfernt', paket: null }
  if (typeof server.command !== 'string' || server.command.trim() === '') return { pin: 'unbestimmt', paket: null }
  const args = Array.isArray(server.args) ? server.args.filter((a): a is string => typeof a === 'string') : []
  const basis = (server.command.split(/[\\/]/).pop() ?? '').toLowerCase().replace(/\.(exe|cmd|bat)$/, '')
  if (basis === 'cmd' && /^\/c$/i.test(args[0] ?? '') && args.length > 1) return pinVon({ command: args[1], args: args.slice(2) })
  let rest: string[]
  if (PAKET_STARTER.has(basis)) rest = basis === 'pipx' && args[0] === 'run' ? args.slice(1) : args
  else if (PAKET_MANAGER.has(basis) && (args[0] === 'exec' || args[0] === 'dlx' || args[0] === 'x')) rest = args.slice(1)
  else return { pin: 'anderer_befehl', paket: null }
  const paketFlags = basis === 'uvx' ? ['--from'] : basis === 'pipx' ? ['--spec'] : ['--package', '-p']
  const wertFlags = basis === 'uvx' || basis === 'pipx' ? ['--python', '-p', '--with', '--index-url', '--extra-index-url', '--pip-args'] : ['--registry', '--cache']
  let paket: string | null = null
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]
    const [flag, wert] = a.startsWith('--') && a.includes('=') ? [a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1)] : [a, null]
    if (paketFlags.includes(flag)) {
      paket = wert ?? rest[i + 1] ?? null
      break
    }
    if (wertFlags.includes(flag)) {
      if (wert === null) i++
      continue
    }
    if (a === '--') continue
    if (!a.startsWith('-')) {
      paket = a
      break
    }
  }
  if (paket === null) return { pin: 'unbestimmt', paket: null }
  const exakt = /^(?:@[^/@\s]+\/)?[^@/\s=]+(?:@|==)\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/
  return { pin: exakt.test(paket) ? 'gepinnt' : 'ungepinnt', paket }
}

/**
 * Werkzeugname einer Regel ('Bash(gh pr comment:*)' → 'Bash').
 * @param regel - Regel
 * @returns Name
 */
function werkzeugName(regel: string): string {
  return regel.split('(')[0].trim()
}

/**
 * Liegt eine Regel wörtlich im Werkzeugsatz? Gleich = exakt gleiche Regel oder der nackte Werkzeugname steht im Satz
 * (z. B. 'Read' deckt 'Read(./x)'). Keine Muster-Auswertung (Advisor M3: „nicht wörtlich im Werkzeugsatz“).
 * @param regel - Regel aus allowed-tools
 * @param satz - erlaubte_werkzeuge des Werkzeugsatzes
 * @returns true, wenn wörtlich enthalten
 */
export function regelImWerkzeugsatz(regel: string, satz: readonly string[]): boolean {
  return satz.includes(regel) || satz.includes(werkzeugName(regel))
}

/**
 * Hat eine Regel Wirkung nach außen? WebFetch/WebSearch; nacktes Bash/PowerShell und Bash(*)/PowerShell(*) (unbegrenzt); sonst
 * das erste Wort (bzw. die ersten zwei) des Befehls in Bash(<befehl>) bzw. PowerShell(<befehl>) — kein Teilstring (ghost ≠ gh).
 * @param regel - Regel
 * @returns true bei Treffer
 */
export function regelExterneWirkung(regel: string): boolean {
  const name = werkzeugName(regel)
  if (EXTERN_WERKZEUGE.has(name)) return true
  if (name !== 'Bash' && name !== 'PowerShell') return false
  const innen = /^\w+\((.*)\)$/s.exec(regel.trim())?.[1]?.trim()
  if (innen === undefined || innen === '' || innen === '*') return true
  const woerter = innen.replace(/:\*$/, '').split(/[\s:]+/).filter((w) => w !== '')
  const erstes = (woerter[0] ?? '').toLowerCase()
  return EXTERN_EIN_WORT.has(erstes) || EXTERN_ZWEI_WORTE.has(`${erstes} ${(woerter[1] ?? '').toLowerCase()}`)
}

/**
 * Risiken eines Plugins als Fakten aus der Deklaration.
 * @param b - Bestandteile
 * @param werkzeugsatz - erlaubte_werkzeuge des Werkzeugsatzes 'schreibend', null = nicht bestimmbar
 * @returns Risiken in fester Reihenfolge (Hooks, MCP, Skills, Commands)
 */
export function risikenVon(b: Bestandteile, werkzeugsatz: readonly string[] | null): Risiko[] {
  const risiken: Risiko[] = []
  for (const h of b.hooks) {
    const wo = `${h.ereignis}${h.matcher !== null ? ` (matcher ${h.matcher})` : ''}`
    if (h.typ === 'command') risiken.push({ art: 'hook_befehl', bestandteil: `hook:${h.ereignis}`, text: `Shell-Befehl bei jedem Ereignis ${wo}: ${h.befehl ?? '(ohne command)'}` })
    else risiken.push({ art: 'hook_andere', bestandteil: `hook:${h.ereignis}`, text: `Hook vom Typ ${h.typ} bei jedem Ereignis ${wo}` })
  }
  for (const m of b.mcp) {
    if (m.pin === 'ungepinnt') risiken.push({ art: 'mcp_ungepinnt', bestandteil: `mcp:${m.name}`, text: `MCP-Server startet ${m.paket ?? '(Paket?)'} ohne feste Version (${m.befehl ?? ''} ${m.args.join(' ')})`.trim() })
    if (m.pin === 'entfernt') risiken.push({ art: 'mcp_entfernt', bestandteil: `mcp:${m.name}`, text: `Entfernter MCP-Server: ${m.url || '(ohne url)'}` })
  }
  const regelRisiken = (art: 'skill' | 'command', name: string, regeln: readonly string[]): void => {
    for (const r of regeln) {
      if (werkzeugsatz === null) risiken.push({ art: 'rechte_nicht_bestimmbar', bestandteil: `${art}:${name}`, text: `allowed-tools ${r}: Werkzeugsatz 'schreibend' nicht bestimmbar` })
      else if (!regelImWerkzeugsatz(r, werkzeugsatz)) risiken.push({ art: 'rechte_ausserhalb', bestandteil: `${art}:${name}`, text: `allowed-tools ${r} nicht wörtlich im Werkzeugsatz 'schreibend'` })
      if (regelExterneWirkung(r)) risiken.push({ art: 'externe_wirkung', bestandteil: `${art}:${name}`, text: `allowed-tools ${r} mit Wirkung nach außen` })
    }
  }
  for (const s of b.skills) regelRisiken('skill', s.name, s.allowed_tools)
  for (const c of b.commands) regelRisiken('command', c.name, c.allowed_tools)
  return risiken
}

/**
 * Hash in der Form von berechneInhaltHash über (relativer Pfad, Inhalt-sha256) — sortiert nach Codepunkten.
 * @param dateien - [rel, inhalt]
 * @returns sha256 hex
 */
export function hashAusDateien(dateien: readonly (readonly [string, Buffer])[]): string {
  const gesamt = createHash('sha256')
  for (const [rel, inhalt] of [...dateien].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    gesamt.update(`${rel}\0${createHash('sha256').update(inhalt).digest('hex')}\n`, 'utf8')
  }
  return gesamt.digest('hex')
}

// ─── Lesen (nur lesend, async) ───────────────────────────────────────────────

/**
 * Inhalts-Hash eines Plugin-Ordners ohne .git/ und .in_use/ (erstes Segment). Symlink/Junction oder Grenze überschritten
 * (gezählt nach dem Ausschluss, Abbruch beim Durchlauf) → hash null mit Grund. Wirft nie.
 * @param ordner - absoluter Plugin-Ordner
 * @param grenzen - Dateien/Bytes
 * @returns { hash, grund }
 */
export async function berechnePluginHash(ordner: string, grenzen: HashGrenzen = STANDARD_HASH_GRENZEN): Promise<{ hash: string | null; grund: string | null }> {
  const pfade: string[] = []
  let bytes = 0
  const gehe = async (absolut: string, rel: string): Promise<string | null> => {
    for (const eintrag of await readdir(absolut, { withFileTypes: true })) {
      const r = rel === '' ? eintrag.name : `${rel}/${eintrag.name}`
      if (rel === '' && HASH_AUSSCHLUSS.includes(eintrag.name)) continue
      const voll = join(absolut, eintrag.name)
      const info = await lstat(voll)
      if (info.isSymbolicLink()) return `Symlink/Junction im Plugin-Ordner: ${r}`
      if (info.isDirectory()) {
        const g = await gehe(voll, r)
        if (g !== null) return g
      } else if (info.isFile()) {
        pfade.push(r)
        bytes += info.size
        if (pfade.length > grenzen.dateien) return `mehr als ${grenzen.dateien} Dateien — nicht gehasht`
        if (bytes > grenzen.bytes) return `mehr als ${grenzen.bytes} Bytes — nicht gehasht`
      } else return `weder Datei noch Ordner im Plugin-Ordner: ${r}`
    }
    return null
  }
  try {
    const grund = await gehe(ordner, '')
    if (grund !== null) return { hash: null, grund }
    const dateien: [string, Buffer][] = []
    for (const rel of pfade) dateien.push([rel, await readFile(join(ordner, ...rel.split('/')))])
    return { hash: hashAusDateien(dateien), grund: null }
  } catch (fehler) {
    return { hash: null, grund: `Plugin-Ordner nicht lesbar: ${(fehler as Error).message}` }
  }
}

/** Kontext beim Lesen eines Plugin-Ordners. */
interface OrdnerKontext {
  wurzel: string
  fehler: string[]
}

/**
 * Löst einen Pfad aus plugin.json im Plugin auf; außerhalb → Teilfehler und null.
 * @param k - Kontext
 * @param pfad - relativer Pfad
 * @param feld - Feldname (für den Grund)
 * @returns absoluter Pfad oder null
 */
function imPlugin(k: OrdnerKontext, pfad: string, feld: string): string | null {
  const ziel = resolve(k.wurzel, pfad.replace(/^\$\{CLAUDE_PLUGIN_ROOT\}[\\/]?/, ''))
  const rel = relative(k.wurzel, ziel)
  if (rel.startsWith('..') || isAbsolute(rel)) {
    k.fehler.push(`plugin.json ${feld}: Pfad außerhalb des Plugin-Ordners: ${pfad}`)
    return null
  }
  return ziel
}

/**
 * Relativer Pfad im Plugin mit '/' als Trenner (für Anzeige und Gründe).
 * @param k - Kontext
 * @param absolut - absoluter Pfad
 * @returns relativer Pfad
 */
function relPfad(k: OrdnerKontext, absolut: string): string {
  return relative(k.wurzel, absolut).split(sep).join('/')
}

/** Ergebnis eines Dateilesens: fehlt, nicht lesbar (Teilfehler schon gemeldet) oder Inhalt. */
type Gelesen<T> = { art: 'fehlt' } | { art: 'fehler' } | { art: 'ok'; wert: T }

/**
 * Liest eine Textdatei. Fehlt sie, ist das kein Fehler; jeder andere Lesefehler wird genau einmal als Teilfehler gemeldet
 * (Code-Review 9).
 * @param k - Kontext
 * @param absolut - Datei
 * @returns fehlt | fehler | ok mit Text
 */
async function leseText(k: OrdnerKontext, absolut: string): Promise<Gelesen<string>> {
  try {
    return { art: 'ok', wert: await readFile(absolut, 'utf8') }
  } catch (fehler) {
    const code = (fehler as NodeJS.ErrnoException).code
    if (code === 'ENOENT') return { art: 'fehlt' }
    k.fehler.push(`${relPfad(k, absolut)} nicht lesbar: ${(fehler as Error).message}`)
    return { art: 'fehler' }
  }
}

/**
 * Liest eine JSON-Datei; kein JSON → Teilfehler. Ein JSON-Wert null bleibt ein Wert (die Formprüfung meldet ihn).
 * @param k - Kontext
 * @param absolut - Datei
 * @returns fehlt | fehler | ok mit Wert
 */
async function leseJson(k: OrdnerKontext, absolut: string): Promise<Gelesen<unknown>> {
  const text = await leseText(k, absolut)
  if (text.art !== 'ok') return text
  try {
    return { art: 'ok', wert: JSON.parse(text.wert) }
  } catch (fehler) {
    k.fehler.push(`${relPfad(k, absolut)} ist kein JSON: ${(fehler as Error).message}`)
    return { art: 'fehler' }
  }
}

/**
 * Art eines Pfads ohne Links zu folgen.
 * @param absolut - Pfad
 * @returns 'ordner' | 'datei' | 'link' | 'fehlt'
 */
async function artVon(absolut: string): Promise<'ordner' | 'datei' | 'link' | 'fehlt'> {
  try {
    const s = await lstat(absolut)
    return s.isSymbolicLink() ? 'link' : s.isDirectory() ? 'ordner' : 'datei'
  } catch {
    return 'fehlt'
  }
}

/**
 * Alle .md-Dateien unter einem Ordner (rekursiv, sortiert). Links werden nicht verfolgt, sondern als Teilfehler gemeldet; mehr
 * als die Dateigrenze → Teilfehler und Abbruch (Code-Review 11).
 * @param k - Kontext
 * @param ordner - absoluter Ordner
 * @returns absolute Pfade
 */
async function mdDateien(k: OrdnerKontext, ordner: string): Promise<string[]> {
  const ergebnis: string[] = []
  const gehe = async (p: string): Promise<boolean> => {
    for (const e of await readdir(p, { withFileTypes: true })) {
      const voll = join(p, e.name)
      if (e.isSymbolicLink()) k.fehler.push(`Symlink/Junction nicht gelesen: ${relPfad(k, voll)}`)
      else if (e.isDirectory()) {
        if (!(await gehe(voll))) return false
      } else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) {
        ergebnis.push(voll)
        if (ergebnis.length > STANDARD_HASH_GRENZEN.dateien) {
          k.fehler.push(`${relPfad(k, ordner)}: mehr als ${STANDARD_HASH_GRENZEN.dateien} .md-Dateien — Rest nicht gelesen`)
          return false
        }
      }
    }
    return true
  }
  await gehe(ordner)
  return ergebnis.sort()
}

/**
 * Normalisiert ein plugin.json-Pfadfeld (string | string[]) zu Pfaden; andere Form → Teilfehler.
 * @param k - Kontext
 * @param wert - Feldwert
 * @param feld - Feldname
 * @returns absolute Pfade im Plugin
 */
function pfadFeld(k: OrdnerKontext, wert: unknown, feld: string): string[] {
  if (wert === undefined) return []
  const liste = typeof wert === 'string' ? [wert] : Array.isArray(wert) && wert.every((w) => typeof w === 'string') ? (wert as string[]) : null
  if (liste === null) {
    k.fehler.push(`plugin.json ${feld}: unbekannte Form (erwartet Pfad oder Liste von Pfaden)`)
    return []
  }
  return liste.map((p) => imPlugin(k, p, feld)).filter((p): p is string => p !== null)
}

/**
 * Konfigurationsquellen eines Felds, das auch eingebettet sein darf (hooks, mcpServers, lspServers): Standarddatei plus
 * plugin.json-Wert als Pfad, Liste oder Objekt. Eine in plugin.json genannte, fehlende Datei ist ein Teilfehler.
 * @param k - Kontext
 * @param standard - Standarddatei relativ zur Wurzel
 * @param wert - plugin.json-Feldwert
 * @param feld - Feldname
 * @returns [quelle, Objekt]-Paare
 */
async function konfigQuellen(k: OrdnerKontext, standard: string, wert: unknown, feld: string): Promise<[string, unknown][]> {
  const quellen: [string, unknown][] = []
  const standardPfad = join(k.wurzel, standard)
  const standardObj = await leseJson(k, standardPfad)
  if (standardObj.art === 'ok') quellen.push([standard.split(sep).join('/'), standardObj.wert])
  if (wert === undefined) return quellen
  if (istObjekt(wert)) {
    quellen.push(['plugin.json', wert])
    return quellen
  }
  for (const pfad of pfadFeld(k, wert, feld)) {
    if (pfad === standardPfad) continue
    const obj = await leseJson(k, pfad)
    if (obj.art === 'ok') quellen.push([relPfad(k, pfad), obj.wert])
    else if (obj.art === 'fehlt') k.fehler.push(`plugin.json ${feld}: Datei fehlt: ${relPfad(k, pfad)}`)
  }
  return quellen
}

/**
 * Hooks aus einer Quelle ({ hooks: { Ereignis: [...] } } oder direkt { Ereignis: [...] }); jede andere Form → Teilfehler.
 * @param k - Kontext
 * @param quelle - Anzeige der Quelle
 * @param obj - gelesener Wert
 * @returns Hooks
 */
function hooksAus(k: OrdnerKontext, quelle: string, obj: unknown): HookTeil[] {
  const ereignisse = istObjekt(obj) && 'hooks' in obj ? obj.hooks : obj
  if (!istObjekt(ereignisse)) {
    k.fehler.push(`${quelle}: hooks hat eine unbekannte Form`)
    return []
  }
  const hooks: HookTeil[] = []
  for (const [ereignis, gruppen] of Object.entries(ereignisse)) {
    if (!Array.isArray(gruppen)) {
      k.fehler.push(`${quelle}: hooks.${ereignis} ist keine Liste`)
      continue
    }
    for (const g of gruppen) {
      const innen = istObjekt(g) ? g.hooks : undefined
      if (!Array.isArray(innen)) {
        k.fehler.push(`${quelle}: hooks.${ereignis} ohne hooks-Liste`)
        continue
      }
      for (const h of innen) {
        if (!istObjekt(h) || typeof h.type !== 'string') {
          k.fehler.push(`${quelle}: Hook bei ${ereignis} ohne type`)
          continue
        }
        hooks.push({ ereignis, matcher: istObjekt(g) && typeof g.matcher === 'string' ? g.matcher : null, typ: h.type, befehl: h.type === 'command' && typeof h.command === 'string' ? h.command : null, quelle })
      }
    }
  }
  return hooks
}

/**
 * Server-Map aus einer Quelle ({ mcpServers|lspServers: {…} } oder direkt die Map); andere Form → Teilfehler.
 * @param k - Kontext
 * @param quelle - Anzeige der Quelle
 * @param obj - gelesener Wert
 * @param schluessel - 'mcpServers' | 'lspServers'
 * @returns [name, Server]-Paare
 */
function serverMap(k: OrdnerKontext, quelle: string, obj: unknown, schluessel: string): [string, Record<string, unknown>][] {
  const map = istObjekt(obj) && schluessel in obj ? obj[schluessel] : obj
  if (!istObjekt(map)) {
    k.fehler.push(`${quelle}: ${schluessel} hat eine unbekannte Form`)
    return []
  }
  const ergebnis: [string, Record<string, unknown>][] = []
  for (const [name, s] of Object.entries(map)) {
    if (!istObjekt(s)) k.fehler.push(`${quelle}: Server ${name} ist kein Objekt`)
    else ergebnis.push([name, s])
  }
  return ergebnis
}

/**
 * args eines Servers als Stringliste (andere Einträge fallen weg); env/headers werden nie gelesen.
 * @param s - Server-Objekt
 * @returns args
 */
function argsVon(s: Record<string, unknown>): string[] {
  return Array.isArray(s.args) ? s.args.filter((a): a is string => typeof a === 'string') : []
}

/** Ergebnis von lesePluginOrdner. */
export interface PluginOrdnerErgebnis {
  bestandteile: Bestandteile
  lizenz_datei: boolean
  lizenz_feld: string | null
  fehler: string[]
  /** true, wenn der Ordner fehlt (dann kein Hash, Code-Review 10) */
  ordner_fehlt: boolean
}

/**
 * Liest die Bestandteile eines Plugin-Ordners. env/headers werden nie gelesen. Wirft nie (Teilfehler in fehler).
 * @param wurzel - absoluter Plugin-Ordner
 * @returns Bestandteile, Lizenz, Teilfehler, ordner_fehlt
 */
export async function lesePluginOrdner(wurzel: string): Promise<PluginOrdnerErgebnis> {
  const k: OrdnerKontext = { wurzel, fehler: [] }
  const b: Bestandteile = { skills: [], agents: [], commands: [], hooks: [], mcp: [], lsp: [] }
  if ((await artVon(wurzel)) !== 'ordner') return { bestandteile: b, lizenz_datei: false, lizenz_feld: null, fehler: [`Plugin-Ordner fehlt oder ist kein Ordner: ${wurzel}`], ordner_fehlt: true }
  try {
    const manifestRoh = await leseJson(k, join(wurzel, '.claude-plugin', 'plugin.json'))
    const manifest = manifestRoh.art === 'ok' && istObjekt(manifestRoh.wert) ? manifestRoh.wert : {}
    if (manifestRoh.art === 'ok' && !istObjekt(manifestRoh.wert)) k.fehler.push('.claude-plugin/plugin.json ist kein Objekt')

    // Skills: Standard skills/ und plugin.json skills (Ordner mit SKILL.md oder Ordner mit Skill-Unterordnern).
    for (const ort of [...new Set([join(wurzel, 'skills'), ...pfadFeld(k, manifest.skills, 'skills')])]) {
      if ((await artVon(ort)) !== 'ordner') continue
      const kandidaten = (await artVon(join(ort, 'SKILL.md'))) === 'datei' ? [ort] : (await readdir(ort, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => join(ort, e.name))
      for (const dir of kandidaten.sort()) {
        const text = await leseText(k, join(dir, 'SKILL.md'))
        if (text.art !== 'ok') continue
        b.skills.push({ name: leseFrontmatter(text.wert).name ?? (dir.split(sep).pop() as string), pfad: relPfad(k, join(dir, 'SKILL.md')), allowed_tools: zerlegeRegeln(leseFrontmatterFeld(text.wert, 'allowed-tools')) })
      }
    }
    // Agents und Commands: Standardordner und plugin.json-Pfade (Datei oder Ordner mit .md).
    const mdAus = async (standard: string, wert: unknown, feld: string): Promise<string[]> => {
      const dateien: string[] = []
      for (const ort of [...new Set([join(wurzel, standard), ...pfadFeld(k, wert, feld)])]) {
        const art = await artVon(ort)
        if (art === 'ordner') dateien.push(...(await mdDateien(k, ort)))
        else if (art === 'datei') dateien.push(ort)
        else if (art === 'link') k.fehler.push(`Symlink/Junction nicht gelesen: ${relPfad(k, ort)}`)
        else if (ort !== join(wurzel, standard)) k.fehler.push(`plugin.json ${feld}: Pfad fehlt: ${relPfad(k, ort)}`)
      }
      return [...new Set(dateien)]
    }
    for (const datei of await mdAus('agents', manifest.agents, 'agents')) {
      const text = await leseText(k, datei)
      if (text.art !== 'ok') continue
      const a: AgentTeil = { name: leseFrontmatter(text.wert).name ?? (datei.split(sep).pop() as string).replace(/\.md$/i, ''), pfad: relPfad(k, datei), tools: zerlegeRegeln(leseFrontmatterFeld(text.wert, 'tools')) }
      b.agents.push(a)
    }
    for (const datei of await mdAus('commands', manifest.commands, 'commands')) {
      const text = await leseText(k, datei)
      if (text.art !== 'ok') continue
      // Name wie die CLI: relativ zu commands/ (Unterordner mit ':'), sonst Dateiname.
      const imStandard = relative(join(wurzel, 'commands'), datei)
      const basis = imStandard.startsWith('..') ? (datei.split(sep).pop() as string) : imStandard
      const c: CommandTeil = { name: basis.replace(/\.md$/i, '').split(sep).join(':'), pfad: relPfad(k, datei), allowed_tools: zerlegeRegeln(leseFrontmatterFeld(text.wert, 'allowed-tools')) }
      b.commands.push(c)
    }
    // Hooks, MCP, LSP: Standarddatei + plugin.json (Pfad, Liste, eingebettet).
    for (const [quelle, obj] of await konfigQuellen(k, join('hooks', 'hooks.json'), manifest.hooks, 'hooks')) b.hooks.push(...hooksAus(k, quelle, obj))
    for (const [quelle, obj] of await konfigQuellen(k, '.mcp.json', manifest.mcpServers, 'mcpServers')) {
      for (const [name, s] of serverMap(k, quelle, obj, 'mcpServers')) {
        const { pin, paket } = pinVon(s)
        const art: McpTeil['art'] = s.type === 'http' || s.type === 'sse' ? s.type : typeof s.command === 'string' ? 'stdio' : typeof s.url === 'string' ? 'http' : 'unbekannt'
        b.mcp.push({ name, art, befehl: typeof s.command === 'string' ? s.command : null, args: argsVon(s), url: typeof s.url === 'string' ? s.url : null, pin, paket, quelle })
      }
    }
    for (const [quelle, obj] of await konfigQuellen(k, '.lsp.json', manifest.lspServers, 'lspServers')) {
      for (const [name, s] of serverMap(k, quelle, obj, 'lspServers')) {
        const l: LspTeil = { name, befehl: typeof s.command === 'string' ? s.command : null, args: argsVon(s), quelle }
        b.lsp.push(l)
      }
    }
    const lizenz_datei = (await readdir(wurzel, { withFileTypes: true })).some((e) => e.isFile() && LIZENZ_MUSTER.test(e.name))
    return { bestandteile: b, lizenz_datei, lizenz_feld: typeof manifest.license === 'string' ? manifest.license : null, fehler: k.fehler, ordner_fehlt: false }
  } catch (fehler) {
    return { bestandteile: b, lizenz_datei: false, lizenz_feld: null, fehler: [...k.fehler, `Plugin-Ordner nicht lesbar: ${(fehler as Error).message}`], ordner_fehlt: false }
  }
}

/** Eingabe von lesePluginBestand. */
export interface PluginBestandEingabe {
  /** Listenaufruf (echt: starteProzess mit PLUGIN_LISTE_ARGUMENTE; Gates: Attrappe) */
  liste: () => Promise<ListenErgebnis>
  /** Konfigurationsordner der CLI (bestimmeClaudeOrdner) */
  claudeOrdner: string
  /** erlaubte_werkzeuge des Werkzeugsatzes 'schreibend', null = nicht bestimmbar */
  werkzeugsatz: readonly string[] | null
  /** Referenzliste der eingebauten Plugins (leseEingebautReferenz) */
  eingebaut: { ok: true; referenz: EingebautReferenz } | { ok: false; grund: string }
  grenzen?: HashGrenzen
}

/**
 * gitCommitSha je (id, installPath) aus <claudeOrdner>/plugins/installed_plugins.json; fehlt/kaputt → leere Map (kein Fehler).
 * @param claudeOrdner - Konfigurationsordner der CLI
 * @returns Map (id + NUL + installPath klein) → Commit
 */
async function leseCommits(claudeOrdner: string): Promise<Map<string, string>> {
  const commits = new Map<string, string>()
  try {
    const roh: unknown = JSON.parse(await readFile(join(claudeOrdner, 'plugins', 'installed_plugins.json'), 'utf8'))
    const plugins = istObjekt(roh) && istObjekt(roh.plugins) ? roh.plugins : {}
    for (const [id, eintraege] of Object.entries(plugins)) {
      for (const e of Array.isArray(eintraege) ? eintraege : []) {
        if (istObjekt(e) && typeof e.installPath === 'string' && typeof e.gitCommitSha === 'string') commits.set(`${id}\0${resolve(e.installPath).toLowerCase()}`, e.gitCommitSha)
      }
    }
  } catch {
    // Kein Commit-Pin bekannt — commit bleibt null (kein Fehler der Liste).
  }
  return commits
}

/**
 * Liest den Plugin-Bestand: Liste über die CLI, je Plugin Ordner, Hash, Risiken; eingebaute getrennt. Wirft nie.
 * @param e - Eingabe
 * @returns Bestand oder Fehlerstand mit Grund
 */
export async function lesePluginBestand(e: PluginBestandEingabe): Promise<PluginBestand> {
  try {
    const liste = await e.liste()
    if (!liste.ok) return { status: 'fehler', grund: liste.grund }
    const geparst = parsePluginListe(liste.stdout)
    if (!geparst.ok) return { status: 'fehler', grund: geparst.grund }
    const commits = await leseCommits(e.claudeOrdner)
    const eingebaut: EingebautEintrag[] = e.eingebaut.ok ? e.eingebaut.referenz.plugins.map((id) => ({ id, quelle: 'referenzliste' as const, cli_version: e.eingebaut.ok ? e.eingebaut.referenz.cli_version : null })) : []
    const plugins: PluginEintrag[] = []
    for (const c of geparst.eintraege) {
      const at = c.id.lastIndexOf('@')
      const name = at > 0 ? c.id.slice(0, at) : c.id
      const marketplace = at > 0 ? c.id.slice(at + 1) : ''
      if (marketplace === 'builtin') {
        if (!eingebaut.some((x) => x.id === c.id)) eingebaut.push({ id: c.id, quelle: 'cli-liste', cli_version: null })
        continue
      }
      const basis = { id: c.id, name, marketplace, version: c.version, scope: c.scope, aktiv: c.enabled, projekt_pfad: c.projectPath, projekt_aktiv: c.projectEnabled, pfad: c.installPath }
      if (!isAbsolute(c.installPath)) {
        plugins.push({ ...basis, commit: null, inhalt_hash: null, hash_grund: 'installPath ist kein absoluter Pfad', lizenz_datei: false, lizenz_feld: null, bestandteile: { skills: [], agents: [], commands: [], hooks: [], mcp: [], lsp: [] }, risiken: [], fehler: [`installPath ist kein absoluter Pfad: ${c.installPath}`] })
        continue
      }
      const ordner = await lesePluginOrdner(c.installPath)
      const hash = ordner.ordner_fehlt ? { hash: null, grund: 'Plugin-Ordner fehlt' } : await berechnePluginHash(c.installPath, e.grenzen)
      plugins.push({
        ...basis,
        commit: commits.get(`${c.id}\0${resolve(c.installPath).toLowerCase()}`) ?? null,
        inhalt_hash: hash.hash,
        hash_grund: hash.grund,
        lizenz_datei: ordner.lizenz_datei,
        lizenz_feld: ordner.lizenz_feld,
        bestandteile: ordner.bestandteile,
        risiken: risikenVon(ordner.bestandteile, e.werkzeugsatz),
        fehler: ordner.fehler,
      })
    }
    return { status: 'ok', quelle: { befehl: `claude ${PLUGIN_LISTE_ARGUMENTE.join(' ')}`, claude_ordner: e.claudeOrdner }, plugins, eingebaut, eingebaut_fehler: e.eingebaut.ok ? null : e.eingebaut.grund }
  } catch (fehler) {
    return { status: 'fehler', grund: `Plugin-Bestand nicht lesbar: ${(fehler as Error).message}` }
  }
}

/**
 * true für ein einfaches Objekt (kein Array, nicht null).
 * @param w - Wert
 * @returns Typwächter
 */
function istObjekt(w: unknown): w is Record<string, unknown> {
  return typeof w === 'object' && w !== null && !Array.isArray(w)
}
