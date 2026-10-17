/**
 * Datei: src/rueckfrage/index.ts
 *
 * Zweck: Reine Regel des Rückfrage-Kanals im Lauf (F45 B2b-3b-1a, E-B2b-3-1 = A, Spike features/F45/nachweise/b2b3a/spike.md,
 * features/F45/plan-b2b3b1a-v2.md §1/§5). Drei Teile:
 * - `vorentscheidung`: entscheidet über eine Rechte-Anfrage der CLI (`--permission-prompt-tool`), bevor jemand gefragt wird.
 *   Nur ein Bash-Befehl geht an Stefan; alles andere — auch ein Datei-Werkzeug außerhalb des Arbeitsordners — wird
 *   automatisch abgelehnt (Spike Frage 3: mit „allow“ gingen Write und Bash außerhalb durch, die Grenze muss hier liegen).
 *   Seit B2b-3b-2a auch ein Befehl mit Steuer- oder Formatzeichen (TAEUSCHENDE_ZEICHEN, F-1126 (3)).
 * - `liegtImArbeitsordner`: Pfadgrenze, fail closed (relativ gegen den Arbeitsordner, `..`, `/` und `\`, Groß/klein unter
 *   Windows, Laufwerk, UNC, Gerätepfade, Datenströme, Symlink/Junction-Auflösung des längsten existierenden Präfixes).
 *   Bei der heutigen Regel (nur Bash an Stefan) ändert sie keine Entscheidung, nur den Grund — Vorsorge (Delta-Pass).
 * - `ergaenzeRueckfrageAufruf`: Argv-Baustein — ohne Kanal dasselbe Objekt (Argv bitgleich), mit Kanal Server `rueckfrage` in
 *   der mcp-config, `frage_stefan` im Werkzeugsatz und `permissionPromptTool`. Wirft nie (A1: der Aufrufer liegt vor der
 *   D13-Belegung im normalen Ablehnungsweg).
 * Einziges I/O: realpath (injizierbar). Das Protokoll (Schema-Prüfung, Neutralisierung, Abgleich A6 für den Result
 * Evaluator) liegt seit B2b-3b-1b daneben in `protokoll.ts`.
 *
 * Grenzen der Pfadregel (Vorsorge, heute ohne Wirkung auf eine Entscheidung — Regel 5 lehnt jedes Nicht-Bash-Werkzeug ab;
 * vor einer Regel, die ein Datei-Werkzeug an Stefan gibt, zu schärfen, F-1126): `..` wird textuell aufgelöst, bevor realpath
 * greift — unter Windows wie Win32 selbst, unter posix löst der Kernel `link/..` dagegen physisch auf; Groß/klein über
 * toLowerCase statt NTFS-Regeln; reservierte Gerätenamen (CON, NUL, COM1 …) und `??`-Pfade werden nicht eigens erkannt.
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs (loeseAusfuehrungsEingabenAuf), scripts/leitstand/rueckfrage-vermittlung.mjs,
 * scripts/check-f45-b2b3b1-rueckfrage.mjs, scripts/check-f45-b2b3b2a-absicherung.mjs (z1), src/rueckfrage/rueckfrage.test.ts.
 */

import { realpathSync } from 'node:fs'
import { pruefeAufrufparameter, toolInputZuTokens } from '../invocation-policy/index.ts'
import type { PfadErgebnis, PfadOptionen, RueckfrageAufrufBasis, RueckfrageKanal, Vorentscheidung } from './types.ts'

export type { PfadErgebnis, PfadOptionen, RueckfrageAufrufBasis, RueckfrageKanal, Vorentscheidung } from './types.ts'

/** Name des MCP-Servers in der mcp-config (Präfix der Werkzeugnamen). */
export const RUECKFRAGE_SERVER = 'rueckfrage'
/** Ziel von `--permission-prompt-tool` — für das Modell nicht sichtbar (`--tools`, Spike Frage 1). */
export const RECHTE_WERKZEUG = `mcp__${RUECKFRAGE_SERVER}__rechte_pruefen`
/** Frage-Werkzeug für das Modell — muss in `--allowedTools` stehen (Spike Frage 5). */
export const FRAGE_WERKZEUG = `mcp__${RUECKFRAGE_SERVER}__frage_stefan`
/** Abstand der Skript-Frist zur Wartegrenze des Leitstands. */
export const SKRIPT_FRIST_ZUSATZ_MS = 60000
/** Abstand des CLI-timeouts je Server zur Wartegrenze (Advisor-Hinweis: Verhalten bestimmt statt unbekannter CLI-Grenze). */
export const CLI_TIMEOUT_ZUSATZ_MS = 120000

/**
 * F45 B2b-3b-2b-2a-1 (Punkt 4): Regelzeilen für den Ausführungsauftrag, nur bei eingeschaltetem Kanal (scripts/leitstand-server.mjs,
 * starteWorkflowSchritt). Unversioniert wie `baueCdRegelZeile` (src/jarvis) — die Ausführung hat keine versionierte Policy. Vorrang vor
 * dem F-689-Hinweis „- [x] Blockiert“ wörtlich (Advisor B9). B2b-3b-2b-2a-3 (F-1132 (5), ARCHITECTURE §3): eine als ungültig
 * zurückgewiesene Frage („Frage ungültig — nicht an Stefan gestellt“, scripts/leitstand/rueckfrage-mcp.mjs) wird einmal korrigiert neu
 * gestellt; scheitert auch das, gilt es wie „keine Antwort“. Keine Zeile beginnt mit „- [x]“ (SELBSTBLOCKADE_ZEILE, src/korrekturschleife).
 */
export const RUECKFRAGE_REGEL: readonly string[] = Object.freeze([
  'Rückfrage-Kanal zu Stefan:',
  `- Entscheidungen, die nur Stefan treffen kann, holst du über das Werkzeug ${FRAGE_WERKZEUG} ein — rate nicht. Zuerst ${FRAGE_WERKZEUG}; nur wenn keine Antwort kommt, gilt der Hinweis zu '- [x] Blockiert'.`,
  `- Wird eine Frage mit „Frage ungültig — nicht an Stefan gestellt“ zurückgewiesen, stelle sie einmal korrigiert neu (Frage nicht leer, höchstens 2000 Zeichen; höchstens 10 Optionen mit je höchstens 500 Zeichen); wird auch sie zurückgewiesen, gilt das wie keine Antwort.`,
  '- Bash-Befehle, die nicht freigegeben sind, legt der Leitstand Stefan zur Entscheidung vor (einmal erlauben oder ablehnen).',
  '- Lehnt Stefan ab, umgehe die Ablehnung nicht (kein anderer Befehl oder Weg zum selben Ziel); nenne sie im Ergebnis.',
])

/** Werkzeuge, die immer einen Pfad tragen (ohne Pfad ⇒ nicht prüfbar). */
const SCHREIB_WERKZEUGE = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit'])
/** Eingabefelder, die einen Pfad tragen — bei jedem Werkzeug geprüft. */
const PFAD_FELDER = ['file_path', 'notebook_path', 'path'] as const
/** Erlaubte Eingabefelder eines Bash-Aufrufs (A9: alles andere, z. B. dangerouslyDisableSandbox, ⇒ auto_deny). */
const BASH_FELDER = new Set(['command', 'description', 'timeout', 'run_in_background'])

/**
 * F45 B2b-3b-2a (F-1126 (3)): Zeichen, die einen wörtlich angezeigten Befehl täuschen können — Steuerzeichen (Cc: `\r`, ESC
 * und C1 der ANSI-Folgen), Formatzeichen (Cf: Bidi-Overrides U+202A–E/U+2066–9, Null-Breiten, U+FEFF, U+00AD, Tag-Zeichen),
 * einzelne Surrogate (Cs) und Zeilen-/Absatztrenner (Zl/Zp). `\t` und `\n` sind vorher entfernt (mehrzeilige Befehle bleiben
 * vorlegbar; CRLF-Zeilen dagegen nicht, `\r` bleibt stehen). Bewusst mit abgelehnt (sichere Richtung, Lauf wird VERWEIGERT):
 * Emoji-Sequenzen mit Zero-Width-Joiner U+200D, LRM/RLM U+200E/U+200F, Flaggen mit Tag-Zeichen. Nicht erfasst:
 * Variationsselektoren, NBSP und andere Leerzeichen, Homoglyphen.
 */
const TAEUSCHENDE_ZEICHEN = /[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/u

/** Einfaches Objekt (kein Array, nicht null). */
const istObjekt = (wert: unknown): wert is Record<string, unknown> => typeof wert === 'object' && wert !== null && !Array.isArray(wert)

/** Zerlegter absoluter Pfad: Laufwerk (win32, Großbuchstabe; posix leer) und Segmente ohne `.`/`..`. */
interface Zerlegt {
  laufwerk: string
  segmente: string[]
}

type Zerlegung = { ok: true; pfad: Zerlegt } | { ok: false; grund: string }

/**
 * Normalisiert Segmente: `.` fällt weg, `..` geht eine Stufe hoch (nie über die Wurzel hinaus). Unter win32 ist ein
 * Segment mit abschließendem Punkt oder Leerzeichen nicht prüfbar (Windows kürzt es still — `x.` wäre `x`).
 */
function normalisiereSegmente(roh: string[], plattform: 'win32' | 'posix'): string[] | null {
  const segmente: string[] = []
  for (const segment of roh) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') {
      segmente.pop()
      continue
    }
    if (plattform === 'win32' && /[. ]$/.test(segment)) return null
    segmente.push(segment)
  }
  return segmente
}

/**
 * Zerlegt einen Pfad nach den Regeln der Plattform; relativ wird gegen `basis` aufgelöst (null ⇒ relativ nicht erlaubt).
 * @param pfad - zu prüfender Pfad
 * @param basis - zerlegter Arbeitsordner oder null
 * @param plattform - Pfadregeln
 * @returns zerlegter absoluter Pfad oder Grund
 */
function zerlege(pfad: string, basis: Zerlegt | null, plattform: 'win32' | 'posix'): Zerlegung {
  if (pfad.length === 0) return { ok: false, grund: 'leerer Pfad' }
  if (pfad.includes('\u0000')) return { ok: false, grund: 'NUL im Pfad' }
  if (pfad.startsWith('~')) return { ok: false, grund: 'Pfad mit ~' }
  let laufwerk = ''
  let rest: string
  let relativ = false
  if (plattform === 'win32') {
    const s = pfad.replace(/\//g, '\\')
    if (s.startsWith('\\\\')) return { ok: false, grund: 'UNC- oder Gerätepfad' }
    const treffer = /^([A-Za-z]):(.*)$/s.exec(s)
    if (treffer !== null) {
      if (!treffer[2].startsWith('\\')) return { ok: false, grund: 'laufwerksrelativer Pfad' }
      laufwerk = treffer[1].toUpperCase()
      rest = treffer[2]
    } else if (s.startsWith('\\')) {
      return { ok: false, grund: 'Pfad ohne Laufwerk' }
    } else {
      relativ = true
      rest = s
    }
    if (rest.includes(':')) return { ok: false, grund: 'Doppelpunkt im Pfad (Datenstrom)' }
  } else {
    if (pfad.includes('\\')) return { ok: false, grund: 'Backslash im Pfad' }
    relativ = !pfad.startsWith('/')
    rest = pfad
  }
  const trenner = plattform === 'win32' ? '\\' : '/'
  if (relativ) {
    if (basis === null) return { ok: false, grund: 'Pfad nicht absolut' }
    laufwerk = basis.laufwerk
  }
  const roh = [...(relativ && basis !== null ? basis.segmente : []), ...rest.split(trenner)]
  const segmente = normalisiereSegmente(roh, plattform)
  if (segmente === null) return { ok: false, grund: 'Segment mit abschließendem Punkt oder Leerzeichen' }
  return { ok: true, pfad: { laufwerk, segmente } }
}

/** Baut den Text eines zerlegten Pfads für realpath. */
function baue(pfad: Zerlegt, plattform: 'win32' | 'posix'): string {
  return plattform === 'win32' ? `${pfad.laufwerk}:\\${pfad.segmente.join('\\')}` : `/${pfad.segmente.join('/')}`
}

/** true, wenn `innen` gleich `ordner` ist oder darunter liegt (segmentweise, unter win32 ohne Groß/klein). */
function liegtUnter(innen: Zerlegt, ordner: Zerlegt, plattform: 'win32' | 'posix'): boolean {
  const gleich = (a: string, b: string) => (plattform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b)
  if (innen.laufwerk !== ordner.laufwerk || innen.segmente.length < ordner.segmente.length) return false
  return ordner.segmente.every((segment, i) => gleich(segment, innen.segmente[i]))
}

/** realpath-Fehler „gibt es nicht“ (ENOENT/ENOTDIR) — dann wird der nächstkürzere Präfix versucht. */
const istFehlend = (fehler: unknown) => istObjekt(fehler) && (fehler.code === 'ENOENT' || fehler.code === 'ENOTDIR')

/**
 * Löst den längsten existierenden Präfix per realpath auf und hängt den Rest an — eine noch nicht existierende Datei
 * hinter einer Junction nach außen liegt damit außerhalb.
 * @returns aufgelöster, zerlegter Pfad oder null (nicht prüfbar)
 */
function loeseAuf(pfad: Zerlegt, plattform: 'win32' | 'posix', realpath: (p: string) => string): Zerlegt | null {
  for (let n = pfad.segmente.length; n >= 0; n--) {
    let real: string
    try {
      real = realpath(baue({ laufwerk: pfad.laufwerk, segmente: pfad.segmente.slice(0, n) }, plattform))
    } catch (fehler) {
      if (istFehlend(fehler)) continue
      return null
    }
    const zerlegt = zerlege(real, null, plattform)
    if (!zerlegt.ok) return null
    return { laufwerk: zerlegt.pfad.laufwerk, segmente: [...zerlegt.pfad.segmente, ...pfad.segmente.slice(n)] }
  }
  return null
}

/**
 * Pfadgrenze des Arbeitsordners, fail closed.
 * @param pfad - Pfadwert aus der Werkzeug-Eingabe (beliebiger Typ)
 * @param arbeitsordner - absoluter Arbeitsordner des Laufs
 * @param optionen - Plattform und realpath (nur Tests)
 * @returns { ok: true } oder { ok: false, grund } — grund beginnt mit „außerhalb“ oder „nicht prüfbar“
 */
export function liegtImArbeitsordner(pfad: unknown, arbeitsordner: string, optionen: PfadOptionen = {}): PfadErgebnis {
  const plattform = optionen.plattform ?? (process.platform === 'win32' ? 'win32' : 'posix')
  const realpath = optionen.realpath ?? ((p: string) => realpathSync.native(p))
  if (typeof pfad !== 'string') return { ok: false, grund: 'nicht prüfbar: kein Text' }
  const ordner = zerlege(arbeitsordner, null, plattform)
  if (!ordner.ok) return { ok: false, grund: `nicht prüfbar: Arbeitsordner (${ordner.grund})` }
  const ziel = zerlege(pfad, ordner.pfad, plattform)
  if (!ziel.ok) return { ok: false, grund: `nicht prüfbar: ${ziel.grund}` }
  if (!liegtUnter(ziel.pfad, ordner.pfad, plattform)) return { ok: false, grund: 'außerhalb des Arbeitsordners' }
  const realOrdner = loeseAuf(ordner.pfad, plattform, realpath)
  const realZiel = loeseAuf(ziel.pfad, plattform, realpath)
  if (realOrdner === null || realZiel === null) return { ok: false, grund: 'nicht prüfbar: realpath' }
  return liegtUnter(realZiel, realOrdner, plattform) ? { ok: true } : { ok: false, grund: 'außerhalb des Arbeitsordners (Symlink/Junction)' }
}

/**
 * Vorentscheidung über eine Rechte-Anfrage der CLI. Erste zutreffende Regel gewinnt, alles Unklare ⇒ auto_deny.
 * @param toolName - tool_name der Anfrage
 * @param input - input der Anfrage
 * @param arbeitsordner - absoluter Arbeitsordner des Laufs (vom Leitstand, nicht aus der Anfrage)
 * @param werkzeugNamen - Werkzeugnamen des Laufs (Regel von --tools, werkzeugNamenAus)
 * @param optionen - Pfadoptionen (nur Tests)
 * @returns { art: 'frage_stefan' } nur für einen gültigen Bash-Befehl, sonst { art: 'auto_deny', grund }
 */
export function vorentscheidung(toolName: unknown, input: unknown, arbeitsordner: string, werkzeugNamen: readonly string[], optionen: PfadOptionen = {}): Vorentscheidung {
  const ablehnen = (grund: string): Vorentscheidung => ({ art: 'auto_deny', grund })
  if (typeof toolName !== 'string' || toolName.length === 0 || !werkzeugNamen.includes(toolName)) return ablehnen(`Werkzeug '${String(toolName)}' nicht im Werkzeugsatz`)
  if (!istObjekt(input)) return ablehnen('Eingabe ungültig')
  // Regel 3 (Vorsorge): jedes Pfadfeld bei jedem Werkzeug; Schreibwerkzeuge ohne Pfad sind nicht prüfbar.
  const pfade = PFAD_FELDER.filter((feld) => feld in input).map((feld) => input[feld])
  if (SCHREIB_WERKZEUGE.has(toolName) && pfade.length === 0) return ablehnen('Pfad fehlt')
  for (const pfad of pfade) {
    const lage = liegtImArbeitsordner(pfad, arbeitsordner, optionen)
    if (!lage.ok) return ablehnen(`Pfad ${lage.grund}`)
  }
  if (toolName === 'Bash') {
    const fremd = Object.keys(input).filter((feld) => !BASH_FELDER.has(feld))
    if (fremd.length > 0) return ablehnen(`unbekanntes Eingabefeld: ${fremd.join(', ')}`)
    if (typeof input.command !== 'string' || input.command.trim().length === 0) return ablehnen('Befehl fehlt')
    if (TAEUSCHENDE_ZEICHEN.test(input.command.replace(/[\t\n]/g, ''))) return ablehnen('Befehl mit Steuer- oder Formatzeichen (\\r, ANSI, Bidi …) wird nicht vorgelegt')
    if (input.run_in_background === true) return ablehnen('Hintergrund-Ausführung wird nicht vorgelegt')
    if ('run_in_background' in input && input.run_in_background !== false) return ablehnen('Eingabe ungültig (run_in_background)')
    if ('description' in input && typeof input.description !== 'string') return ablehnen('Eingabe ungültig (description)')
    if ('timeout' in input && typeof input.timeout !== 'number') return ablehnen('Eingabe ungültig (timeout)')
    const verbot = pruefeAufrufparameter(toolInputZuTokens({ command: input.command }))
    if (!verbot.ok) return ablehnen(verbot.grund ?? 'verbotener Aufrufparameter (E-182)')
    return { art: 'frage_stefan' }
  }
  return ablehnen('nur Bash-Befehle werden Stefan vorgelegt')
}

/**
 * Werkzeugnamen nach der Regel von `--tools` (baueAufruf): Name vor der Klammer, eindeutig, Reihenfolge stabil.
 * @param erlaubteWerkzeuge - erlaubte_werkzeuge des Laufs
 * @returns Werkzeugnamen
 */
export function werkzeugNamenAus(erlaubteWerkzeuge: readonly string[]): string[] {
  return [...new Set(erlaubteWerkzeuge.map((regel) => regel.split('(')[0]))]
}

/** Prüft die Kanal-Daten (Loopback-URL, Token, Pfade, Wartegrenze). @returns null oder Grund */
function pruefeKanal(kanal: RueckfrageKanal): string | null {
  let url: URL
  try {
    url = new URL(kanal.url)
  } catch {
    return 'url ungültig'
  }
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) return 'url ist keine Loopback-Adresse'
  if (typeof kanal.token !== 'string' || !/^[0-9a-f]{64}$/.test(kanal.token)) return 'Token ungültig'
  if (typeof kanal.skriptPfad !== 'string' || kanal.skriptPfad.length === 0) return 'Skriptpfad fehlt'
  if (typeof kanal.nodePfad !== 'string' || kanal.nodePfad.length === 0) return 'Node-Pfad fehlt'
  if (!Number.isInteger(kanal.warteGrenzeMs) || kanal.warteGrenzeMs <= 0) return 'Wartegrenze ungültig'
  return null
}

/**
 * Argv-Baustein des Rückfrage-Kanals. Ohne Kanal ⇒ dasselbe Objekt (Argv bitgleich). Mit Kanal ⇒ neue Aufruf-Eingaben mit
 * Server `rueckfrage` in der mcp-config (Katalog-MCPs bleiben), `frage_stefan` im Werkzeugsatz und `permissionPromptTool`.
 * Wirft nie (A1): jede Unstimmigkeit — Schlüssel `rueckfrage` belegt, mcp-config kein JSON-Objekt, schon gesetztes
 * permission-prompt-tool, ungültige Kanal-Daten — ergibt { ok: false, grund }.
 * @param aufrufEingaben - fertig zusammengesetzte Aufruf-Eingaben (vor dem return von loeseAusfuehrungsEingabenAuf)
 * @param kanal - Kanal-Daten oder undefined (aus)
 * @returns { ok: true, aufrufEingaben } | { ok: false, grund }
 */
export function ergaenzeRueckfrageAufruf<T extends RueckfrageAufrufBasis>(
  aufrufEingaben: T,
  kanal: RueckfrageKanal | undefined
): { ok: true; aufrufEingaben: T & RueckfrageAufrufBasis } | { ok: false; grund: string } {
  if (kanal === undefined) return { ok: true, aufrufEingaben }
  const kanalFehler = pruefeKanal(kanal)
  if (kanalFehler !== null) return { ok: false, grund: kanalFehler }
  if (!istObjekt(aufrufEingaben) || !istObjekt(aufrufEingaben.werkzeugsatz) || !Array.isArray(aufrufEingaben.werkzeugsatz.erlaubte_werkzeuge)) return { ok: false, grund: 'Werkzeugsatz fehlt' }
  if (aufrufEingaben.permissionPromptTool !== undefined) return { ok: false, grund: 'permission-prompt-tool ist schon gesetzt' }
  let config: unknown
  try {
    config = JSON.parse(aufrufEingaben.mcpConfig ?? '{"mcpServers":{}}')
  } catch {
    return { ok: false, grund: 'mcp-config ist kein JSON' }
  }
  if (!istObjekt(config) || !istObjekt(config.mcpServers)) return { ok: false, grund: 'mcp-config ohne Objekt mcpServers' }
  if (Object.hasOwn(config.mcpServers, RUECKFRAGE_SERVER)) return { ok: false, grund: `MCP-Server '${RUECKFRAGE_SERVER}' ist schon belegt (Katalog-Eintrag mit derselben id)` }
  const mcpServers = {
    ...config.mcpServers,
    [RUECKFRAGE_SERVER]: {
      command: kanal.nodePfad,
      args: [kanal.skriptPfad],
      env: {
        WORKFORCE_RUECKFRAGE_URL: kanal.url,
        WORKFORCE_RUECKFRAGE_TOKEN: kanal.token,
        WORKFORCE_RUECKFRAGE_FRIST_MS: String(kanal.warteGrenzeMs + SKRIPT_FRIST_ZUSATZ_MS),
      },
      timeout: kanal.warteGrenzeMs + CLI_TIMEOUT_ZUSATZ_MS,
    },
  }
  return {
    ok: true,
    aufrufEingaben: {
      ...aufrufEingaben,
      mcpConfig: JSON.stringify({ ...config, mcpServers }),
      permissionPromptTool: RECHTE_WERKZEUG,
      werkzeugsatz: { ...aufrufEingaben.werkzeugsatz, erlaubte_werkzeuge: [...new Set([...aufrufEingaben.werkzeugsatz.erlaubte_werkzeuge, FRAGE_WERKZEUG])] },
    },
  }
}
