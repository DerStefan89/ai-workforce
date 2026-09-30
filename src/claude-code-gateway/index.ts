/**
 * Datei: src/claude-code-gateway/index.ts
 *
 * Zweck: Claude-Code-Gateway (F6a WS1 + WS2,
 * state/tasks/f6a-claude-code-gateway-ws1.md,
 * state/tasks/f6a-ws2-prozessstart.md). WS1: Aufrufkonstruktion und
 * Startfreigabe für den Lesepfad, ohne jeden Prozessstart. baueAufruf
 * konstruiert den Aufruf ausschließlich als Tokens-Array (AK1).
 * pruefeUndVerweigereBeiTreffer führt jeden Aufruf vor jeder Weitergabe
 * durch F4s pruefeAufrufparameter (E-182, AK2/AK4) — ruft bei Treffer F4s
 * verweigereStart auf, startet selbst nie einen Prozess (D5-Muster: kein
 * Nachbau von F4).
 *
 * WS2 + WS4: starteGateway orchestriert den tatsächlichen Prozessstart —
 * pruefeUndVerweigereBeiTreffer (tokens gegen F4s pruefeAufrufparameter,
 * E-182) → zweiter pruefeAufrufparameter-Aufruf gegen
 * werkzeugStartziel.slice(1) (F-119: werkzeugStartziel[1..n] landet
 * unverändert in execFiles argv, siehe prozessstart.ts' echterStarter,
 * passierte bisher weder diesen Guard noch F4s E-188-Gültigkeitsschlüssel
 * — additive Prüfung, kein Schemabruch, werkzeugStartziel bleibt bewusst
 * außerhalb des F4-Gültigkeitsschlüssels, state/findings.md F-119) →
 * prozessstart.ts' pruefeStartziel (AK15, Hygiene-Guard, keine
 * Vertrauensgrenze — die Vertrauensfrage liegt per E2 beim Aufrufer) →
 * bei allen dreien ok:true eine RUN_PREPARED-Wirkungsmarke
 * (F1B) → starteProzess (prozessstart.ts, Argv-Array, F-057) → Ergebnis
 * OHNE Klassifikation auswerten (kein ergebnis-Feld, keine Auswertung der
 * gemeldeten Genehmigungsverweigerungen, F7-Grenze, AK12) →
 * Rohereignisstrom (inkl. werkzeugStartziel + startfehler, F-071) nach
 * kontrollzustand-roh/ schreiben
 * → Laufakte über F2s registriereKernArtefakt registrieren. Schreibt
 * bewusst NIE eine Terminal-Wirkungsmarke für den Prozessausgang selbst
 * (weder bei validem noch bei fehlendem Ergebnisobjekt) — das bliebe eine
 * Klassifikation und ist F7 vorbehalten (AK5); der Lauf bleibt bis dahin
 * KLAERUNG_ERFORDERLICH (F1B), das ist der vorgesehene Zustand, kein
 * Fehler.
 *
 * F4-Startfreigabe (F6b WS-G, hebt Option B auf, Stefan 03.09.2026 —
 * vorher Option B, Stefans Entscheidung 31.08.2026): zwischen dem
 * AK15-Hygiene-Guard und der RUN_PREPARED-Wirkungsmarke ruft starteGateway
 * real F4s pruefeStartfreigabe auf (E-183/E-188, voller
 * Gültigkeitsschlüssel-Vergleich) — nicht mehr nur WS1s
 * pruefeAufrufparameter (E-182). baselineReferenz/wirksamkeitsnachweisReferenz
 * kommen NICHT vom Aufrufer (der könnte sonst selbst bestimmen, gegen
 * welche Autorisierung geprüft wird): starteGateway liest sie aus
 * STANDARD_AKTUELLE_AUTORISIERUNG_PFAD (state/aktuelle-autorisierung.json,
 * überschreibbar über optionen.aktuelleAutorisierungPfad, u.a. für Tests).
 * istZustand misst starteGateway selbst über F4s ermittleIstZustand
 * (dasselbe .claude/settings.json wie im echten Repo, Pfad überschreibbar
 * über optionen.settingsPfad); istUebrigeFelder baut es aus bereits
 * vorhandenen GatewayEingaben ab (kein Doppel-Input). Fehlt die
 * Referenzdatei oder liefert pruefeStartfreigabe ABGELEHNT: verweigereStart
 * (Muster wie der E-182-Zweig), kein Prozessstart, keine
 * RUN_PREPARED-Wirkungsmarke.
 *
 * F14 WS-1 (AK2): GatewayOptionen.zeitgrenzeMs ist reine Durchreichung an
 * prozessstart.ts' starteProzess, unverändert im Rohstrom mitgeführt
 * (beendigungsart). starteGateway interpretiert den Wert selbst nicht.
 *
 * F14 WS-4 (AK7): GatewayOptionen.abbruchSignal folgt demselben Muster wie
 * zeitgrenzeMs — reine Durchreichung an starteProzess, starteGateway liest
 * den Wert selbst nicht.
 *
 * F31 WS-3c (Stefan 20.09.2026, löst F-502): baueAufruf hängt
 * `--strict-mcp-config --mcp-config '{"mcpServers":{}}'` jetzt an JEDEN
 * Aufruf an, nicht mehr nur an den Jarvis-Chat-Pfad (F31 WS-3b) —
 * AufrufEingaben.mcpConfig ist damit keine An-/Abwesenheits-Fahne mehr,
 * sondern eine reine Wertüberschreibung des Defaults. Real gemessen für
 * eine schreibende Rolle (`features/F31/nachweis-mcp-begrenzung.md`):
 * dieselbe Lücke wie bei jarvis (Account-MCP-Server laden trotz
 * `--tools`-Begrenzung) besteht für jede Rolle gleichermaßen, E-187 gilt
 * jetzt für alle als ERZWUNGEN (docs/projekt/zielfassung.md §9.1).
 *
 * F40 WS-1 (Grundlage state/spike-f40-streaming.md): baueAufruf setzt
 * `--output-format stream-json --verbose` statt `json` (ohne `--verbose`
 * lehnt die CLI stream-json im `-p`-Modus mit Exit 1 ab). Das stdout ist
 * damit NDJSON; die letzte Zeile `type:"result"` trägt real denselben
 * Feldsatz wie das frühere gepufferte `json`-Objekt (Spike Punkt 2) —
 * leseErgebnisobjekt liest deshalb weiterhin EIN result-Objekt, jetzt aus
 * der letzten result-Zeile. Ein vor F40 geschriebener Rohstrom (ein
 * einziges JSON-Objekt) bleibt unverändert lesbar. starteGateway lässt den
 * Starter bei der result-Zeile auflösen statt beim Prozessende
 * (StarterOptionen.ergebnisZeileBeendet) und meldet tool_use-Zeilen über
 * GatewayOptionen.beiWerkzeugaufruf als Fortschritt. Kein Token-Streaming
 * der Antwort (Spike Punkt 5).
 *
 * F40 WS-3 (löst F-567): baueAufruf hängt `--disallowedTools <wert>` an, wenn
 * AufrufEingaben.disallowedTools gesetzt ist (additiv, kein Default) — real
 * belegt (state/nachweis-jarvis-latenz.md Abschnitt "F40 WS-2"), dass ein
 * claude-code-Prozess trotz `--setting-sources ''` per Read-Werkzeug
 * `~/.claude/projects/…/memory/MEMORY.md` liest (Entwickler-Kontext statt
 * Projektkontext, plus eine zusätzliche Werkzeug-Runde). `--bare` bleibt für
 * jeden Aufruf per E-182 verboten (VERBOTENE_AUFRUFPARAMETER) und schaltet
 * ohnehin mehr ab als nur Auto-Memory — kein gezielter Abschaltweg. Siehe
 * types.ts' AufrufEingaben.disallowedTools für die Details.
 *
 * E-F754 (löst F-754, docs/adr/ausfuehrung-bash-allowlist.md): der Werkzeugsatz 'schreibend' trägt
 * Bash-Präfixregeln wie 'Bash(npm run check:*)'. Real gemessen (claude 2.1.258, 28.09.2026):
 * `--tools` versteht nur Werkzeugnamen — mit 'Bash(…)' in `--tools` fehlt Bash im Werkzeugsatz
 * ganz. baueAufruf gibt `--tools` deshalb die abgeleiteten Werkzeugnamen, `--allowedTools`
 * unverändert die vollen Regeln (für Sätze ohne Klammer-Regel bleibt das Argv bitgenau gleich).
 * Trägt der Satz eine Bash-Regel, kommt 'Bash(git:*)' als Sperrregel dazu: eine Sperre schlägt
 * real auch ein 'allow: ["Bash"]' aus den Projekteinstellungen (--setting-sources project).
 *
 * F36 WS-5b (E-F36-8 = B, V4a): baueAufruf hängt bei AufrufEingaben.ortB je Ort-B-Skill `--add-dir` und
 * `--settings` vor `-p` an (sonst Argv unverändert). starteGateway prüft mit optionen.initGate die
 * init-Zeile (pruefeInitZeile: init.skills ⊆ Ort-B-Namen, kein Agent in init.tools, mcp_servers =
 * übergebene, F-831: slash_commands ⊆ Referenzmenge ∪ gesperrt ∪ Ort-B) und beendet den Prozess bei
 * einem Verstoß über den Abbruchweg, sobald die init-Zeile im Strom steht (ein tool_use davor wird
 * beendet, nicht verhindert); der Grund steht als init_gate_verstoss im Rohstrom.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ermittleIstZustand, pruefeAufrufparameter, pruefeStartfreigabe, verweigereStart } from '../invocation-policy/index.ts'
import type { BaselineReferenz, IstUebrigeFelder, IstZustand, WirksamkeitsnachweisReferenz } from '../invocation-policy/types.ts'
import { schreibeWirkungsmarke, sha256Hex } from '../checkpoint-store/index.ts'
import type { ProfilReferenz, Schreiber as CheckpointSchreiber } from '../checkpoint-store/types.ts'
import { registriereKernArtefakt } from '../lineage-registry/index.ts'
import { pruefeStartziel, starteProzess } from './prozessstart.ts'
import type { AufrufEingaben, AufrufTokens, GatewayEingaben, GatewayErgebnis, BeobachtungV0, LaufakteV0Daten, Starter, VerbrauchV0, Werkzeugaufruf } from './types.ts'

/**
 * Von Stefan bestätigter Pfad zur aktuell gültigen Autorisierungsreferenz
 * (state/aktuelle-autorisierung.json, dieses Repo) — absolut, damit er auch
 * nach einem process.chdir() in eine Wegwerf-Kopie (E6-Muster,
 * scripts/verify-f6b-ws-f-rotfall.mjs) noch auf die reale Datei zeigt.
 * Überschreibbar über optionen.aktuelleAutorisierungPfad, u.a. für Tests.
 */
const STANDARD_AKTUELLE_AUTORISIERUNG_PFAD = 'C:\\Users\\stefa\\Projekte\\ai-workforce\\state\\aktuelle-autorisierung.json'

/** F41 WS-1: exportiert für src/projekt-anlegen/index.ts (Muster D5) — dieselbe Form wird dort gebraucht, um die kopierte state/aktuelle-autorisierung.json eines neu angelegten Projekts zu lesen. */
export interface AktuelleAutorisierung {
  baselineReferenz: BaselineReferenz
  wirksamkeitsnachweisReferenz: WirksamkeitsnachweisReferenz
}

/** pfad/commit_hash/datei_hash sind bei BaselineReferenz und WirksamkeitsnachweisReferenz identisch geformt (beide non-leere Strings) — eine gemeinsame Formprüfung statt zwei fast gleicher. */
function istGueltigeCommitGepinnteReferenz(wert: unknown): wert is { pfad: string; commit_hash: string; datei_hash: string } {
  if (typeof wert !== 'object' || wert === null) return false
  const obj = wert as Record<string, unknown>
  return typeof obj.pfad === 'string' && obj.pfad.length > 0 && typeof obj.commit_hash === 'string' && obj.commit_hash.length > 0 && typeof obj.datei_hash === 'string' && obj.datei_hash.length > 0
}

/**
 * Liefert null statt zu werfen, wenn die Referenzdatei fehlt, kein gültiges
 * JSON ist, oder nicht die erwartete Form { baselineReferenz,
 * wirksamkeitsnachweisReferenz } trägt — kein Absturz, ABGELEHNT-artiges
 * Verhalten (siehe CONTEXT des Auftrags; die Formprüfung verhindert eine
 * ungefangene TypeError weiter unten in pruefeStartbedingung1/2 bei
 * valide-JSON-aber-falsch-geformtem Inhalt). Ein führendes UTF-8-BOM
 * (übliches Artefakt von Windows-Editoren) wird toleriert, JSON.parse
 * selbst tut das nicht.
 */
export function leseAktuelleAutorisierung(pfad: string): AktuelleAutorisierung | null {
  let geparst: unknown
  try {
    let inhalt = readFileSync(pfad, 'utf8')
    if (inhalt.charCodeAt(0) === 0xfeff) inhalt = inhalt.slice(1)
    geparst = JSON.parse(inhalt)
  } catch {
    return null
  }
  if (typeof geparst !== 'object' || geparst === null) return null
  const obj = geparst as Record<string, unknown>
  if (!istGueltigeCommitGepinnteReferenz(obj.baselineReferenz) || !istGueltigeCommitGepinnteReferenz(obj.wirksamkeitsnachweisReferenz)) return null
  return obj as unknown as AktuelleAutorisierung
}

interface Optionen {
  schreiber?: CheckpointSchreiber
  basisVerzeichnis?: string
}

/**
 * Eigene, breitere Optionen für starteGateway (WS2): schreiber ist bewusst
 * nullstellig typisiert (Muster F9, src/human-transport/index.ts) — der
 * Wert wird unverändert an F1Bs schreibeWirkungsmarke UND F2s
 * registriereKernArtefakt durchgereicht, die je eine eigene, nicht
 * kompatible Ereignis-Form erwarten. Ein nullstelliger Aufrufer (Tests,
 * Gate-Skript: `() => {}`) ist in beide Richtungen zuweisungskompatibel,
 * ohne WS1s eigene Optionen oben anzufassen.
 */
interface GatewayOptionen {
  schreiber?: () => void
  basisVerzeichnis?: string
  rohBasisVerzeichnis?: string
  starter?: Starter
  /** Überschreibt den Pfad zu .claude/settings.json für F4s ermittleIstZustand (Standard: process.cwd()-relativ) — u.a. für Tests und für Aufrufer, die nach einem process.chdir() (E6) noch das reale Repo messen müssen. */
  settingsPfad?: string
  /** Überschreibt STANDARD_AKTUELLE_AUTORISIERUNG_PFAD — u.a. für Tests gegen eine Attrappen-Referenzdatei. */
  aktuelleAutorisierungPfad?: string
  /** Überschreibt F4s STANDARD_REPO_WURZEL (externes Autorisierungs-Repo) — u.a. für Tests gegen ein Wegwerf-Git-Repo. */
  startfreigabeRepoWurzel?: string
  /** Harte Wanduhr-Grenze für den Prozessstart in Millisekunden (F14 WS-1, AK2) — unverändert an prozessstart.ts' starteProzess durchgereicht. Kein Default hier: fehlt der Wert, bleibt execFiles eigener Default (kein Timeout) unangetastet. */
  zeitgrenzeMs?: number
  /** Manuelles Abbruchsignal für den Prozessstart (F14 WS-4, AK7) — unverändert an prozessstart.ts' starteProzess durchgereicht, nach demselben Muster wie zeitgrenzeMs. Kein Default hier: fehlt der Wert, bleibt execFiles eigener Default (kein Signal) unangetastet. */
  abbruchSignal?: AbortSignal
  /** Arbeitsverzeichnis des Kindprozesses (F25 WS-1, AK3) — unverändert an prozessstart.ts' starteProzess durchgereicht, dort natives execFile-cwd. Kein Default hier: fehlt der Wert, startet der Kindprozess wie bisher im process.cwd() des Serverprozesses. Wirkt NUR auf den Kindprozess — F4s Gültigkeitsschlüssel (istUebrigeFelder.arbeitsverzeichnis_pfad unten) und die Laufakte bleiben bewusst bei process.cwd() des Serverprozesses (AK7: kein bestehender Vergleichswert für ai-workforce ändert sich). */
  cwd?: string
  /** F31 WS-3 (Latenzmessung): optionaler Rückruf, mit dem der Aufrufer benannte Zeitmarken innerhalb dieses Aufrufs sammeln kann — reiner Diagnose-Haken ohne Wirkung auf den Ablauf, fehlt er, ändert sich nichts (Muster schreiber). starteGateway ruft ihn an diesen Stellen: 'kontextpaket_startfreigabe' (F4-Startfreigabe geprüft, unmittelbar vor der RUN_PREPARED-Wirkungsmarke), 'prozess_gestartet'/'prozess_beendet' (um den Prozessstart-Await — seit F40 WS-1 markiert 'prozess_beendet' die Auflösung bei der result-Zeile, nicht das Prozessende), 'prozess_close' (F40 WS-1: tatsächliches Prozessende, real NACH allen übrigen Marken), 'rohstrom_geschrieben' und 'laufakte_rohstrom_geschrieben' (nach dem Registrieren der Laufakte). */
  zeitmessung?: (marke: string) => void
  /** Task "Jarvis-Chat-Latenz senken", Schritt 3: reine Durchreichung an prozessstart.ts' starteProzess (Muster cwd) — s. AufrufEingaben.umgebungsvariablen für den einzigen bestehenden Aufrufer (starteJarvisChatLauf). */
  umgebungsvariablen?: Record<string, string>
  /** F40 WS-1: optionaler Rückruf je live erkanntem Werkzeugaufruf (tool_use-Zeile im stream-json) — reine Fortschrittsanzeige, kein Checkpoint (D4), ohne Wirkung auf den Ablauf. Ein Wurf daraus wird gefangen und geloggt. */
  beiWerkzeugaufruf?: (aufruf: Werkzeugaufruf) => void
  /**
   * F36 WS-5b (Auftrag Punkt 5): Init-Gate nur für Läufe mit Ort-B-Skills — erwartete Menge der Skills
   * und MCP-Server. Verstößt die init-Zeile (pruefeInitZeile) oder kommt ein tool_use vor ihr, bricht
   * starteGateway den Prozess über den bestehenden Abbruchweg ab (beendigungsart ABBRUCH) und hält den
   * Grund als init_gate_verstoss im Rohstrom fest (Klassifikation: FEHLGESCHLAGEN, init_gate_verstoss).
   * Fehlt die Option, liest starteGateway die init-Zeile nicht (bitgenau wie vorher).
   */
  initGate?: InitGateErwartung
}

const STANDARD_ROH_BASISVERZEICHNIS = 'kontrollzustand-roh'

function jetzt(): string {
  return new Date().toISOString()
}

function laufakteArtefaktId(laufId: string): string {
  return `laufakte-${laufId}`
}

/** Parst genau ein JSON-Objekt (kein Array, kein Primitiv) oder liefert null — wirft nie. */
function parseObjekt(text: string): Record<string, unknown> | null {
  let geparst: unknown
  try {
    geparst = JSON.parse(text)
  } catch {
    return null
  }
  return typeof geparst === 'object' && geparst !== null && !Array.isArray(geparst) ? (geparst as Record<string, unknown>) : null
}

/**
 * Liefert das geparste Ergebnisobjekt nur bei validem "type":"result"-JSON, sonst null — nur zur Unterscheidung Erfolg/Fehllauf, keine inhaltliche Auswertung des Ergebnisses (F7-Grenze, AK12). Exportiert (F-062), damit F7 dieselbe Parsing-Logik wiederverwendet statt sie nachzubauen (D5).
 *
 * F40 WS-1: akzeptiert zwei Formen. (1) Das gesamte stdout ist EIN Objekt (gepuffertes `json`, jeder vor F40 geschriebene Rohstrom). (2) NDJSON aus `stream-json`: die LETZTE Zeile mit type "result" zählt. Eine unvollständige oder unparsbare Zeile (Abbruch mitten im Stream, Spike Punkt 4) wird übersprungen, nie geworfen — fehlt die result-Zeile, bleibt es bei null wie bisher.
 */
export function leseErgebnisobjekt(stdout: string): Record<string, unknown> | null {
  const ganz = parseObjekt(stdout)
  if (ganz !== null) return ganz.type === 'result' ? ganz : null
  const zeilen = stdout.split('\n')
  for (let i = zeilen.length - 1; i >= 0; i--) {
    const zeile = zeilen[i].trim()
    if (zeile === '') continue
    const obj = parseObjekt(zeile)
    if (obj !== null && obj.type === 'result') return obj
  }
  return null
}

/** Parameter, die ein Werkzeugziel benennen, in Prioritätsreihenfolge (Read: file_path, Grep/Glob: pattern vor path). */
const ZIEL_PARAMETER = ['file_path', 'pattern', 'path', 'notebook_path', 'url']

/**
 * Einzige Stelle, die die tool_use-Blöcke EINER stream-json-Zeile (type "assistant", message.content[]) liest — geteilt von leseWerkzeugaufrufe (F40 WS-1) und leseBeobachtung (F36 WS-4), damit eine Formänderung der CLI beide Pfade gleich trifft. Jede andere Zeile liefert []; wirft nie.
 * @param zeile - eine geparste stream-json-Zeile
 * @returns Name und Eingabeobjekt ({} ohne input) je tool_use-Block
 */
function leseToolUseBloecke(zeile: Record<string, unknown>): Array<{ name: string; eingabe: Record<string, unknown> }> {
  if (zeile.type !== 'assistant') return []
  const message = zeile.message
  if (typeof message !== 'object' || message === null) return []
  const inhalt = (message as Record<string, unknown>).content
  if (!Array.isArray(inhalt)) return []
  const bloecke: Array<{ name: string; eingabe: Record<string, unknown> }> = []
  for (const block of inhalt) {
    if (typeof block !== 'object' || block === null) continue
    const b = block as Record<string, unknown>
    if (b.type !== 'tool_use' || typeof b.name !== 'string') continue
    bloecke.push({ name: b.name, eingabe: typeof b.input === 'object' && b.input !== null ? (b.input as Record<string, unknown>) : {} })
  }
  return bloecke
}

/**
 * F40 WS-1: zieht die tool_use-Blöcke aus EINER stream-json-Zeile (type "assistant", message.content[]). Jede andere Zeile liefert []. Reine Funktion, wirft nie — die CLI-Zeilenform ist extern, ein unerwartetes Feld darf den Lauf nicht stören.
 */
export function leseWerkzeugaufrufe(zeile: Record<string, unknown>): Werkzeugaufruf[] {
  return leseToolUseBloecke(zeile).map(({ name, eingabe }) => {
    const zielFeld = ZIEL_PARAMETER.find((f) => typeof eingabe[f] === 'string' && (eingabe[f] as string).length > 0)
    return { werkzeug: name, ziel: zielFeld !== undefined ? (eingabe[zielFeld] as string) : null }
  })
}

/** F40 WS-1: übersetzt eine stream-json-Zeile in beiWerkzeugaufruf-Rückrufe. Ein Wurf des Rückrufs darf den Prozess-Ablauf nie stören (reine Anzeige) — gefangen und geloggt. */
function meldeWerkzeugaufrufe(beiWerkzeugaufruf: (aufruf: Werkzeugaufruf) => void, laufId: string): (zeile: Record<string, unknown>) => void {
  return (zeile) => {
    for (const aufruf of leseWerkzeugaufrufe(zeile)) {
      try {
        beiWerkzeugaufruf(aufruf)
      } catch (fehler) {
        console.error(`[claude-code-gateway] beiWerkzeugaufruf für Lauf '${laufId}' fehlgeschlagen:`, fehler)
      }
    }
  }
}

/**
 * Liefert den Modellnamen aus dem "type":"result"-Objekt (F6a AK8/F-059),
 * real gemessen in SCOPE 7 (state/tasks/f6a-ws4-windows-prozessstart.md,
 * FOLGT-Klausel): das Ergebnisobjekt trägt ein `modelUsage`-Objekt, dessen
 * Schlüssel der Modellname ist. Nur bei GENAU EINEM Schlüssel eindeutig —
 * kein Schlüssel oder mehr als einer bleibt null, es wird nicht geraten
 * (Muster F-059/F-061).
 */
export function leseModellBeobachtet(ergebnisObjekt: Record<string, unknown> | null): string | null {
  if (ergebnisObjekt === null) return null
  const modelUsage = ergebnisObjekt.modelUsage
  if (typeof modelUsage !== 'object' || modelUsage === null || Array.isArray(modelUsage)) return null
  const schluessel = Object.keys(modelUsage)
  return schluessel.length === 1 ? schluessel[0] : null
}

/**
 * Grenzprüfung für ein einzelnes verbrauch-Zahlenfeld (F32 WS-1) — dieselbe
 * Regel wie das Schema (`integer`, `minimum: 0`), hier auf dem Lesepfad
 * angewendet: validiereLaufakteDaten prüft nur, was bereits geschrieben
 * wurde, ruft aber weder starteGateway noch starteCodexGateway selbst auf
 * (kein Schreib-Gate). Ohne diese Prüfung hier würde ein negativer oder
 * nicht-ganzzahliger Wert aus der Laufausgabe anstandslos in die Laufakte
 * geschrieben. Exportiert, damit src/codex-gateway/index.ts dieselbe Regel
 * verwendet statt sie nachzubauen (D5).
 */
export function istGueltigeVerbrauchsZahl(wert: unknown): wert is number {
  return typeof wert === 'number' && Number.isInteger(wert) && wert >= 0
}

/**
 * Liefert Verbrauchsdaten aus dem "type":"result"-Objekt (F32 WS-1) —
 * real gemessene Form, siehe die Feldliste unten. Die vier erwarteten
 * usage-Schlüssel (input_tokens, output_tokens, cache_read_input_tokens,
 * cache_creation_input_tokens) waren in ALLEN 87 real geprüften
 * claude-code-Läufen im Hauptrepo vorhanden (vier verschiedene Rollen:
 * jarvis, router, scout, ausfuehrung — F32-WS-1-Nachweis,
 * features/F32/nachweis-verbrauch.md Abschnitt 1), kein Alles-oder-nichts-
 * Fall dieser Prüfung ist dort real beobachtet. Nur bei GENAU den
 * erwarteten numerischen Feldern (nicht-negative Ganzzahlen) gültig; fehlt
 * eines, trägt einen anderen Typ oder verletzt die Grenze, wird nicht
 * teilweise befüllt oder geschätzt, sondern null zurückgegeben (Muster
 * leseModellBeobachtet, F-059/F-061).
 * total_cost_usd wird bewusst nie gelesen (Abo, Entscheidung 30).
 */
export function leseVerbrauch(ergebnisObjekt: Record<string, unknown> | null): VerbrauchV0 | null {
  if (ergebnisObjekt === null) return null
  const usage = ergebnisObjekt.usage
  if (typeof usage !== 'object' || usage === null || Array.isArray(usage)) return null
  const u = usage as Record<string, unknown>
  const inputTokens = u.input_tokens
  const outputTokens = u.output_tokens
  const cacheReadTokens = u.cache_read_input_tokens
  const cacheWriteTokens = u.cache_creation_input_tokens
  const dauerMs = ergebnisObjekt.duration_ms
  if (
    !istGueltigeVerbrauchsZahl(inputTokens) ||
    !istGueltigeVerbrauchsZahl(outputTokens) ||
    !istGueltigeVerbrauchsZahl(cacheReadTokens) ||
    !istGueltigeVerbrauchsZahl(cacheWriteTokens) ||
    !istGueltigeVerbrauchsZahl(dauerMs)
  ) {
    return null
  }
  const dauerApiMs = istGueltigeVerbrauchsZahl(ergebnisObjekt.duration_api_ms) ? ergebnisObjekt.duration_api_ms : null
  const turns = istGueltigeVerbrauchsZahl(ergebnisObjekt.num_turns) ? ergebnisObjekt.num_turns : null
  return {
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cache_read_tokens: cacheReadTokens,
    cache_write_tokens: cacheWriteTokens,
    dauer_ms: dauerMs,
    dauer_api_ms: dauerApiMs,
    turns,
    quelle: 'claude-code',
  }
}

/**
 * Nur die String-Einträge einer Liste; alles andere (fehlend, kein Array, fremde Typen) ergibt [].
 * @param wert - beliebiges Feld einer init-Zeile
 * @returns die String-Einträge, sonst []
 */
function stringListe(wert: unknown): string[] {
  return Array.isArray(wert) ? wert.filter((e): e is string => typeof e === 'string') : []
}

/**
 * F36 WS-4 (AK8, löst F-730): reine Beobachtung, was ein claude-code-Lauf
 * geladen und aufgerufen hat — aus den stream-json-Zeilen des Rohstroms.
 * Belegte Formen (state/spike-f36-werkzeugsatz.md): init-Zeile type
 * "system"/subtype "init" mit tools, agents, skills, mcp_servers[].name;
 * tool_use "Skill" mit input.skill; tool_use "Agent" (toleriert: "Task") mit
 * input.subagent_type; MCP als tool_use, dessen Name mit "mcp__" beginnt.
 * Aufrufe in Reihenfolge des Auftretens, Duplikate erhalten, Zeilen aus
 * Subagenten (parent_tool_use_id gesetzt) zählen mit. Ohne init-Zeile (Codex,
 * Abbruch vor init) null — das Laufakten-Feld entfällt dann, statt leer
 * gesetzt zu werden. Wirft nie: unparsbare Zeilen werden übersprungen.
 * F36 WS-5a (E-F36-7): zusätzlich navigate_adressen — je Aufruf mcp__<server>__browser_navigate die
 * input.url (ohne url: NAVIGATE_OHNE_URL), in Reihenfolge. Erfasst wird nur der ausdrückliche
 * browser_navigate — ein Seitenwechsel per Klick oder Weiterleitung steht nicht darin.
 * @param zeilen - NDJSON-Zeilen des stdout (einzelne Strings)
 * @returns BeobachtungV0, oder null ohne init-Zeile
 */
export function leseBeobachtung(zeilen: string[]): BeobachtungV0 | null {
  let init: Record<string, unknown> | null = null
  const skillAufrufe: string[] = []
  const subagentAufrufe: string[] = []
  const mcpAufrufe: string[] = []
  const navigateAdressen: string[] = []
  for (const text of zeilen) {
    const zeile = parseObjekt(text.trim())
    if (zeile === null) continue
    if (init === null && zeile.type === 'system' && zeile.subtype === 'init') {
      init = zeile
      continue
    }
    for (const { name, eingabe } of leseToolUseBloecke(zeile)) {
      if (name === 'Skill' && typeof eingabe.skill === 'string') skillAufrufe.push(eingabe.skill)
      else if ((name === 'Agent' || name === 'Task') && typeof eingabe.subagent_type === 'string') subagentAufrufe.push(eingabe.subagent_type)
      else if (name.startsWith('mcp__')) {
        mcpAufrufe.push(name)
        if (NAVIGATE_WERKZEUG.test(name)) navigateAdressen.push(typeof eingabe.url === 'string' && eingabe.url.length > 0 ? eingabe.url : NAVIGATE_OHNE_URL)
      }
    }
  }
  if (init === null) return null
  const mcpServer = Array.isArray(init.mcp_servers)
    ? init.mcp_servers.flatMap((s) => (typeof s === 'object' && s !== null && typeof (s as Record<string, unknown>).name === 'string' ? [(s as Record<string, unknown>).name as string] : []))
    : []
  return {
    init_tools: stringListe(init.tools),
    init_agents: stringListe(init.agents),
    init_skills: stringListe(init.skills),
    init_mcp_server: mcpServer,
    skill_aufrufe: skillAufrufe,
    subagent_aufrufe: subagentAufrufe,
    mcp_aufrufe: mcpAufrufe,
    navigate_adressen: navigateAdressen,
  }
}

/** F36 WS-5a: Werkzeugname eines browser_navigate-Aufrufs irgendeines MCP-Servers. */
const NAVIGATE_WERKZEUG = /^mcp__[^_].*__browser_navigate$/
/** F36 WS-5a: Platzhalter in navigate_adressen, wenn der Aufruf keine url trägt. */
export const NAVIGATE_OHNE_URL = '(keine url)'

/** Die sieben Listenfelder von BeobachtungV0 — einzige Quelle für den Validator. */
const BEOBACHTUNG_FELDER: readonly string[] = [
  'init_tools',
  'init_agents',
  'init_skills',
  'init_mcp_server',
  'skill_aufrufe',
  'subagent_aufrufe',
  'mcp_aufrufe',
] as const satisfies readonly (keyof BeobachtungV0)[]

/** E-F754 (Advisor-Pass K1): Sperrregel für jeden Werkzeugsatz mit Bash-Regel — git bleibt verboten, auch wenn Projekteinstellungen Bash allgemein erlauben. */
export const BASH_SPERRREGELN = 'Bash(git:*)'

/**
 * Wirft synchron (D4-Ausnahme wie F1Bs schreibeWirkungsmarke bei
 * ungültigem art/ergebnis), wenn eingaben.modell oder eingaben.prompt leer
 * oder fehlt — E-185 (modell explizit) bzw. F-124 (prompt) sind
 * Aufrufer-Vertragsverletzungen, kein externer Rot-Fall. `-p` ist das real
 * bestätigte Prompt-Argument dieser Claude-Code-Version (`claude --help`:
 * "Your prompt"; state/gates.md dokumentiert dasselbe Muster bereits aus
 * einem manuellen Verifikationslauf, F-124).
 */
export function baueAufruf(eingaben: AufrufEingaben): AufrufTokens {
  if (!eingaben.modell) {
    throw new Error('AufrufEingaben.modell ist Pflichtfeld (E-185) — leer oder fehlend')
  }
  if (!eingaben.prompt) {
    throw new Error('AufrufEingaben.prompt ist Pflichtfeld (F-124) — leer oder fehlend')
  }
  const regeln = eingaben.werkzeugsatz.erlaubte_werkzeuge
  const werkzeugListe = regeln.join(',')
  // E-F754: `--tools` kennt nur Werkzeugnamen — 'Bash(npm run check:*)' → 'Bash', dedupliziert, Reihenfolge stabil.
  const werkzeugNamen = [...new Set(regeln.map((regel) => regel.split('(')[0]))].join(',')
  const traegtBashRegel = regeln.some((regel) => regel.startsWith('Bash('))
  const disallowedTools = [eingaben.disallowedTools, traegtBashRegel ? BASH_SPERRREGELN : undefined].filter((wert) => wert !== undefined).join(',')
  return [
    '--model',
    eingaben.modell,
    '--output-format',
    'stream-json',
    // F40 WS-1: Pflicht für stream-json im -p-Modus (real gemessen, state/spike-f40-streaming.md).
    '--verbose',
    '--setting-sources',
    eingaben.settingSources ?? 'project',
    '--tools',
    werkzeugNamen,
    '--allowedTools',
    werkzeugListe,
    // F31 WS-3c (löst F-502): Standard für JEDEN Aufruf, nicht mehr nur für jarvis (F31 WS-3b) —
    // eingaben.mcpConfig überschreibt nur noch den Wert, keine An-/Abwesenheit mehr (E-187).
    '--strict-mcp-config',
    '--mcp-config',
    eingaben.mcpConfig ?? '{"mcpServers":{}}',
    // F40 WS-3 (löst F-567): additiv, kein Default — nur gesetzt, wenn eingaben.disallowedTools
    // einen Wert trägt (aktuell ausschließlich jarvis/router, 'Read(~/.claude/**)'). E-F754: bei
    // einer Bash-Regel im Werkzeugsatz zusätzlich BASH_SPERRREGELN.
    ...(disallowedTools !== '' ? ['--disallowedTools', disallowedTools] : []),
    // F36 WS-5b (V4a): nur mit Ort-B-Skills — je Skill ein --add-dir, dann --settings; beides wie im
    // Spike S7 gemessen unmittelbar vor -p. Ohne eingaben.ortB bleibt das Argv bitgenau gleich.
    ...(eingaben.ortB !== undefined ? [...eingaben.ortB.addDirs.flatMap((dir) => ['--add-dir', dir]), '--settings', eingaben.ortB.settings] : []),
    '-p',
    eingaben.prompt,
  ]
}

/** F-831: Referenzmenge der gemessenen, per Skill-Werkzeug nicht aufrufbaren Slash-Commands (Pfad relativ zu dieser Datei). */
export const SLASH_COMMANDS_REFERENZ_URL = new URL('./slash-commands-referenz.json', import.meta.url)

/** F36 WS-5b / F-831: erwartete Menge des Init-Gates (aus dem Start, siehe GatewayOptionen.initGate). */
export interface InitGateErwartung {
  /** Frontmatter-namen der übergebenen Ort-B-Skills. */
  skills: readonly string[]
  /** Namen der übergebenen MCP-Server. */
  mcpServer: readonly string[]
  /** Gesperrte Namen (Skill(…)/skillOverrides off); fehlt das Feld, gilt [] — das Gate wird nur strenger. */
  gesperrt?: readonly string[]
  /** Quelle der Referenzmenge; Standard SLASH_COMMANDS_REFERENZ_URL (anderer Wert nur für Tests). */
  slashCommandsReferenz?: URL | string
}

/**
 * F-831: liest die Referenzmenge (Feld namen) bei jedem Aufruf neu — eine nachgemessene Datei wirkt ohne
 * Neustart. Fehlt die Datei, ist sie kein JSON oder hat sie nicht die Form { namen: string[] } mit ≥1
 * Eintrag, ist das Ergebnis ein Fehler — das Init-Gate wertet ihn als Verstoß (fail-closed).
 * @param quelle - Pfad/URL der Referenzdatei
 * @returns { ok: true, namen } oder { ok: false, grund }
 */
export function leseSlashCommandsReferenz(quelle: URL | string = SLASH_COMMANDS_REFERENZ_URL): { ok: true; namen: readonly string[] } | { ok: false; grund: string } {
  let roh: unknown
  try {
    roh = JSON.parse(readFileSync(quelle, 'utf8'))
  } catch (fehler) {
    const grund = `Slash-Command-Referenzmenge nicht lesbar: ${(fehler as Error).message}`
    console.error(`[claude-code-gateway] ${grund}`)
    return { ok: false, grund }
  }
  const namenRoh = typeof roh === 'object' && roh !== null ? (roh as Record<string, unknown>).namen : undefined
  const namen = stringListe(namenRoh)
  if (!Array.isArray(namenRoh) || namen.length !== namenRoh.length || namen.length === 0) {
    const grund = 'Slash-Command-Referenzmenge hat nicht die Form { namen: string[] } mit mindestens einem Namen'
    console.error(`[claude-code-gateway] ${grund}`)
    return { ok: false, grund }
  }
  return { ok: true, namen }
}

/**
 * F36 WS-5b: Init-Gate eines Ort-B-Laufs (F-791 (1), Auftrag Punkt 5) — reine Prüfung der init-Zeile:
 * init.skills ⊆ übergebene Ort-B-Namen, 'Agent' (bzw. 'Task') ∉ init.tools, Menge init.mcp_servers[].name =
 * übergebene MCP-Server. F-831: init.slash_commands ⊆ Referenzmenge (slash-commands-referenz.json) ∪
 * gesperrte Namen ∪ Ort-B-Skills — ein unbekannter Command wäre sonst per Skill-Werkzeug aufrufbar.
 * Fehlt ein Feld oder ist es kein Array, gilt das als Verstoß (fail-closed). init.plugins wird nicht geprüft.
 * @param init - geparste init-Zeile (type 'system', subtype 'init')
 * @param erwartet - InitGateErwartung aus dem Start (gesperrt = Namen aus Skill(…)/skillOverrides)
 * @returns null, wenn alles passt, sonst der Klartext-Grund (unbekannte Namen aufgelistet)
 */
export function pruefeInitZeile(init: Record<string, unknown>, erwartet: InitGateErwartung): string | null {
  const verstoesse: string[] = []
  if (!Array.isArray(init.skills)) verstoesse.push('init.skills fehlt')
  else {
    const fremd = stringListe(init.skills).filter((name) => !erwartet.skills.includes(name))
    if (fremd.length > 0 || init.skills.length !== stringListe(init.skills).length) verstoesse.push(`init.skills enthält nicht übergebene Skills: ${fremd.join(', ') || '(kein String)'}`)
  }
  if (!Array.isArray(init.slash_commands)) verstoesse.push('init.slash_commands fehlt')
  else {
    const referenz = leseSlashCommandsReferenz(erwartet.slashCommandsReferenz)
    if (!referenz.ok) verstoesse.push(referenz.grund)
    else {
      const bekannt = new Set([...referenz.namen, ...(erwartet.gesperrt ?? []), ...erwartet.skills])
      const fremd = stringListe(init.slash_commands).filter((name) => !bekannt.has(name))
      if (fremd.length > 0 || init.slash_commands.length !== stringListe(init.slash_commands).length) verstoesse.push(`init.slash_commands enthält unbekannte Commands: ${fremd.join(', ') || '(kein String)'} (Referenzmenge nachmessen)`)
    }
  }
  if (!Array.isArray(init.tools)) verstoesse.push('init.tools fehlt')
  else {
    const agent = stringListe(init.tools).filter((name) => name === 'Agent' || name === 'Task')
    if (agent.length > 0) verstoesse.push(`init.tools enthält ${agent.join(', ')}`)
  }
  if (!Array.isArray(init.mcp_servers)) verstoesse.push('init.mcp_servers fehlt')
  else {
    const namen = init.mcp_servers.map((s) => (typeof s === 'object' && s !== null && typeof (s as Record<string, unknown>).name === 'string' ? ((s as Record<string, unknown>).name as string) : '(ohne Namen)'))
    const fremd = namen.filter((n) => !erwartet.mcpServer.includes(n))
    const fehlend = erwartet.mcpServer.filter((n) => !namen.includes(n))
    if (fremd.length > 0 || fehlend.length > 0) verstoesse.push(`init.mcp_servers ≠ übergebene MCPs (fremd: ${fremd.join(', ') || '—'}; fehlend: ${fehlend.join(', ') || '—'})`)
  }
  return verstoesse.length === 0 ? null : `Init-Gate: ${verstoesse.join('; ')} — Lauf vor dem ersten tool_use beendet`
}

/**
 * WS1 (E-182): prüft die Aufruf-Tokens mit pruefeAufrufparameter und hält bei einem Treffer die
 * Verweigerung fest (verweigereStart), bevor irgendein Prozess startet.
 * @param tokens - fertige Aufruf-Tokens aus baueAufruf
 * @param laufId - Lauf, dem die Verweigerung zugeordnet wird
 * @param profilReferenz - Profilreferenz für den Verweigerungs-Checkpoint
 * @param optionen - Speicheroptionen (Basisverzeichnis, Schreiber)
 * @returns { ok: true } oder { ok: false, grund } bei einem verbotenen Parameter
 */
export function pruefeUndVerweigereBeiTreffer(
  tokens: AufrufTokens,
  laufId: string,
  profilReferenz: ProfilReferenz,
  optionen: Optionen = {}
): { ok: true } | { ok: false; grund: string } {
  const ergebnis = pruefeAufrufparameter(tokens)
  if (!ergebnis.ok) {
    const grund = ergebnis.grund ?? 'verbotener Aufrufparameter (E-182)'
    verweigereStart(laufId, profilReferenz, grund, optionen)
    return { ok: false, grund }
  }
  return { ok: true }
}

/**
 * WS2: startet einen Prozess aus einem bereits konstruierten Tokens-Array
 * (WS1s baueAufruf, vom Aufrufer vorher aufgerufen — starteGateway baut
 * keinen zweiten Aufruf, D5). Ablauf siehe Kopfkommentar. Bei Verweigerung
 * durch WS1s Check: kein Prozessstart, keine Wirkungsmarke, keine
 * Laufakte — identisch zum bereits getesteten WS1-Verhalten.
 */
export async function starteGateway(eingaben: GatewayEingaben, optionen: GatewayOptionen = {}): Promise<GatewayErgebnis> {
  const pruefung = pruefeUndVerweigereBeiTreffer(eingaben.tokens, eingaben.laufId, eingaben.profilReferenz, optionen)
  if (!pruefung.ok) {
    return { ok: false, grund: pruefung.grund }
  }

  const startzielArgvPruefung = pruefeAufrufparameter(eingaben.werkzeugStartziel.slice(1))
  if (!startzielArgvPruefung.ok) {
    const grund = startzielArgvPruefung.grund ?? 'verbotener Aufrufparameter (E-182)'
    verweigereStart(eingaben.laufId, eingaben.profilReferenz, grund, optionen)
    return { ok: false, grund }
  }

  const startzielPruefung = pruefeStartziel(eingaben.werkzeugStartziel)
  if (!startzielPruefung.ok) {
    return { ok: false, grund: startzielPruefung.grund }
  }

  const aktuelleAutorisierungPfad = optionen.aktuelleAutorisierungPfad ?? STANDARD_AKTUELLE_AUTORISIERUNG_PFAD
  const aktuelleAutorisierung = leseAktuelleAutorisierung(aktuelleAutorisierungPfad)
  if (aktuelleAutorisierung === null) {
    const grund = existsSync(aktuelleAutorisierungPfad)
      ? 'Referenzdatei ist kein gültiges JSON oder hat nicht die erwartete Form, siehe state/aktuelle-autorisierung.json'
      : 'Referenzdatei fehlt, siehe state/aktuelle-autorisierung.json'
    verweigereStart(eingaben.laufId, eingaben.profilReferenz, grund, optionen)
    return { ok: false, grund }
  }

  const settingsPfad = optionen.settingsPfad ?? join(process.cwd(), '.claude', 'settings.json')
  let istZustand: IstZustand
  try {
    istZustand = ermittleIstZustand(settingsPfad)
  } catch (fehler) {
    const grund = `Ist-Zustand (.claude/settings.json + Schutzskripte) nicht messbar: ${(fehler as Error).message}`
    verweigereStart(eingaben.laufId, eingaben.profilReferenz, grund, optionen)
    return { ok: false, grund }
  }
  const istUebrigeFelder: IstUebrigeFelder = {
    werkzeug_version_deklariert: eingaben.werkzeugVersionDeklariert,
    berechtigungskontext: eingaben.berechtigungskontext,
    arbeitsverzeichnis_pfad: process.cwd(),
    startziel_pfad: eingaben.werkzeugStartziel[0],
  }

  const starturteil = pruefeStartfreigabe(
    {
      baselineReferenz: aktuelleAutorisierung.baselineReferenz,
      istZustand,
      wirksamkeitsnachweisReferenz: aktuelleAutorisierung.wirksamkeitsnachweisReferenz,
      istUebrigeFelder,
    },
    { repoWurzel: optionen.startfreigabeRepoWurzel, schreiber: optionen.schreiber }
  )
  if (starturteil.starturteil === 'ABGELEHNT') {
    verweigereStart(eingaben.laufId, eingaben.profilReferenz, starturteil.grund, optionen)
    return { ok: false, grund: starturteil.grund }
  }

  optionen.zeitmessung?.('kontextpaket_startfreigabe')

  schreibeWirkungsmarke(eingaben.laufId, eingaben.profilReferenz, 'run_prepared', {}, optionen)

  optionen.zeitmessung?.('prozess_gestartet')

  // F-642 (löst spawn ENAMETOOLONG unter Windows bei langem Prompt, real gemessen Lauf
  // 3943c565-dd33-4df4-895f-56daf1e1fb4a, F41-WS-3-Reallauf, 24.09.2026: Auftrag +
  // Architekt-JSON + Entscheidung > Windows' Kommandozeilenlänge, Prozess kam nie zum Start —
  // dasselbe Bild wie F-642 bei Codex, bisher nur dort behoben): der Prompt (per baueAufrufs
  // eigenem Vertrag immer das LETZTE Element von eingaben.tokens, direkt nach '-p') geht nicht
  // mehr als Argv-Element an den Kindprozess, sondern über stdin — `claude -p` ohne
  // Positionsargument liest den Prompt vollständig aus stdin (real verifiziert, kein
  // dokumentiertes CLI-Verhalten). eingaben.tokens selbst bleibt UNVERÄNDERT die vollständige,
  // von baueAufruf gebaute Form — für die Allowlist-Prüfung oben (D5, kein zweiter Regelsatz),
  // nur der tatsächlich gespawnte Argv lässt das letzte Element weg (Muster
  // codex-gateway/index.ts' starteCodexGateway). stdinLeer entfällt ersatzlos: stdinDaten
  // deckt denselben Zweck (nie ein leeres, unbeantwortetes stdin) UND liefert den Prompt.
  const spawnTokens = eingaben.tokens.slice(0, -1)
  const promptFuerStdin = eingaben.tokens[eingaben.tokens.length - 1]

  // F36 WS-5b: Init-Gate (optionen.initGate) — eigener AbortController, mit einem manuellen
  // Abbruchsignal verknüpft; der Abbruch läuft damit über denselben Weg wie „Lauf abbrechen“.
  const initGate = optionen.initGate
  const initAbbruch = initGate !== undefined ? new AbortController() : null
  let initGesehen = false
  let initGateVerstoss: string | null = null
  const verletzeInitGate = (grund: string): void => {
    if (initGateVerstoss !== null) return
    initGateVerstoss = grund
    console.error(`[claude-code-gateway] Lauf '${eingaben.laufId}': ${grund}`)
    initAbbruch?.abort()
  }
  const pruefeZeileGegenInitGate = (zeile: Record<string, unknown>): void => {
    // Nur die erste init-Zeile wird geprüft (Bekannte Grenze: eine spätere system/init-Zeile nicht).
    if (initGate === undefined || initGateVerstoss !== null || initGesehen) return
    if (zeile.type === 'system' && zeile.subtype === 'init') {
      initGesehen = true
      const verstoss = pruefeInitZeile(zeile, initGate)
      if (verstoss !== null) verletzeInitGate(verstoss)
    } else if (leseToolUseBloecke(zeile).length > 0) {
      verletzeInitGate('Init-Gate: tool_use vor der init-Zeile — Lauf beendet')
    }
  }
  const abbruchSignal =
    initAbbruch === null ? optionen.abbruchSignal : optionen.abbruchSignal !== undefined ? AbortSignal.any([optionen.abbruchSignal, initAbbruch.signal]) : initAbbruch.signal
  const meldeAufrufe = optionen.beiWerkzeugaufruf !== undefined ? meldeWerkzeugaufrufe(optionen.beiWerkzeugaufruf, eingaben.laufId) : undefined
  const beiStreamZeile =
    initGate === undefined
      ? meldeAufrufe
      : (zeile: Record<string, unknown>) => {
          pruefeZeileGegenInitGate(zeile)
          meldeAufrufe?.(zeile)
        }

  const prozessErgebnis = await starteProzess(eingaben.werkzeugStartziel, spawnTokens, {
    starter: optionen.starter,
    zeitgrenzeMs: optionen.zeitgrenzeMs,
    abbruchSignal,
    cwd: optionen.cwd,
    stdinDaten: promptFuerStdin,
    umgebungsvariablen: optionen.umgebungsvariablen,
    // F40 WS-1: baueAufruf erzeugt immer stream-json — der Starter löst bei der result-Zeile auf
    // statt beim Prozessende (real 590-730ms früher, state/spike-f40-streaming.md Punkt 1).
    // Abbruch/Timeout vor der result-Zeile bleiben unverändert ABBRUCH/TIMEOUT.
    ergebnisZeileBeendet: true,
    beiProzessende: (ende) => {
      optionen.zeitmessung?.('prozess_close')
      // Nach einer bereits gelesenen result-Zeile ist der Exitcode nicht mehr im Rohstrom —
      // ein Wert ungleich 0 wird deshalb wenigstens geloggt, nicht still verloren.
      // Ein Signal-Kill (Nachlauffrist, Timeout, Abbruch) ebenso.
      if (ende.exitCode !== 0) {
        console.error(`[claude-code-gateway] Lauf '${eingaben.laufId}': Prozess endete mit Exitcode ${ende.exitCode ?? '—'}${ende.signal !== null ? `, Signal ${ende.signal}` : ''}`)
      }
    },
    ...(beiStreamZeile !== undefined ? { beiStreamZeile } : {}),
  })

  optionen.zeitmessung?.('prozess_beendet')

  // F36 WS-5b: ein Ort-B-Lauf ohne init-Zeile ist nicht geprüft — fail-closed ebenfalls ein Verstoß.
  // Ein manueller Abbruch/Timeout oder ein Startfehler vor der init-Zeile bleibt, was er ist (Reviewer:
  // sonst verdeckte „keine init-Zeile“ die echte Ursache). Exitcode und stderr-Auszug stehen im Grund.
  if (initGate !== undefined && !initGesehen && initGateVerstoss === null && prozessErgebnis.beendigungsart === null && prozessErgebnis.startfehler === null) {
    const stderrAuszug = prozessErgebnis.stderr.trim().slice(-300)
    verletzeInitGate(`Init-Gate: keine init-Zeile im Datenstrom (Exitcode ${prozessErgebnis.exitCode ?? '—'}${stderrAuszug !== '' ? `, stderr: ${stderrAuszug}` : ''})`)
  }

  const ergebnisObjekt = leseErgebnisobjekt(prozessErgebnis.stdout)
  const beobachtungsbasisVollstaendig = ergebnisObjekt !== null
  const modellBeobachtet = leseModellBeobachtet(ergebnisObjekt)
  const verbrauch = leseVerbrauch(ergebnisObjekt)
  const beobachtung = leseBeobachtung(prozessErgebnis.stdout.split('\n'))

  const rohBasisVerzeichnis = optionen.rohBasisVerzeichnis ?? STANDARD_ROH_BASISVERZEICHNIS
  const rohVerzeichnis = join(rohBasisVerzeichnis, eingaben.laufId)
  mkdirSync(rohVerzeichnis, { recursive: true })
  const rohInhalt = JSON.stringify({
    werkzeugStartziel: eingaben.werkzeugStartziel,
    stdout: prozessErgebnis.stdout,
    stderr: prozessErgebnis.stderr,
    exitCode: prozessErgebnis.exitCode,
    startfehler: prozessErgebnis.startfehler,
    // F14 WS-1: gleiches Audit-Motiv wie F-071 (werkzeugStartziel/startfehler oben) — TIMEOUT/ABBRUCH landen im Rohstrom, nicht nur im Rückgabewert.
    beendigungsart: prozessErgebnis.beendigungsart,
    // F40 WS-1: macht im Audit sichtbar, warum exitCode null ist (Auflösung vor Prozessende).
    ...(prozessErgebnis.ergebnisZeileVorProzessende === true ? { ergebnisZeileVorProzessende: true } : {}),
    // F36 WS-5b: Grund des Init-Gate-Abbruchs (nur Ort-B-Läufe) — der Result Evaluator liest ihn vor ABBRUCH.
    ...(initGateVerstoss !== null ? { init_gate_verstoss: initGateVerstoss } : {}),
  })
  const rohPfad = join(rohVerzeichnis, 'rohstrom.json')
  writeFileSync(rohPfad, rohInhalt, 'utf8')

  // Trennt den Rohstrom-Schreibvorgang (oben, potenziell mehrere MB stdout) vom
  // Lineage-Schreibvorgang der Laufakte (unten) — beide lagen bisher gemeinsam hinter
  // 'laufakte_rohstrom_geschrieben' und waren als Einzelposten nicht unterscheidbar.
  optionen.zeitmessung?.('rohstrom_geschrieben')

  const laufakte: LaufakteV0Daten = {
    laufakte_schema: 'v0',
    lauf_id: eingaben.laufId,
    werkzeug_version_deklariert: eingaben.werkzeugVersionDeklariert,
    berechtigungskontext: eingaben.berechtigungskontext,
    arbeitsverzeichnis_pfad: process.cwd(),
    modell_beobachtet: modellBeobachtet,
    beobachtungsbasis_vollstaendig: beobachtungsbasisVollstaendig,
    rohstrom_referenz: { pfad: rohPfad, inhalts_hash: sha256Hex(rohInhalt) },
    erstellt_am: jetzt(),
    ...(verbrauch !== null ? { verbrauch } : {}),
    ...(beobachtung !== null ? { beobachtung } : {}),
  }

  const { pfad, versionSequenz } = registriereKernArtefakt(
    laufakteArtefaktId(eingaben.laufId),
    eingaben.profilReferenz,
    { erzeuger: 'kern', schritt: 'claude-code-gateway-lauf' },
    laufakte,
    [],
    optionen
  )

  optionen.zeitmessung?.('laufakte_rohstrom_geschrieben')

  return { ok: true, laufakte, pfad, versionSequenz }
}

/** Reine Funktion: prüft ein geparstes Objekt gegen schemas/kontrollzustand-laufakte-payload.schema.json. */
export function validiereLaufakteDaten(daten: unknown): string[] {
  if (typeof daten !== 'object' || daten === null || Array.isArray(daten)) {
    return ['Wurzel ist kein Objekt']
  }
  const obj = daten as Record<string, unknown>
  const verstoesse: string[] = []
  const erlaubt = new Set([
    'laufakte_schema',
    'lauf_id',
    'werkzeug_version_deklariert',
    'berechtigungskontext',
    'arbeitsverzeichnis_pfad',
    'modell_beobachtet',
    'beobachtungsbasis_vollstaendig',
    'rohstrom_referenz',
    'erstellt_am',
    // F16 WS-1 (AK4): additiv erlaubt, bewusst nicht Pflicht — siehe
    // Typkommentar in types.ts und die Schema-description.
    'worker',
    'modell_deklariert',
    // F32 WS-1: additiv erlaubt, bewusst nicht Pflicht (Muster worker/modell_deklariert).
    'verbrauch',
    // F36 WS-4: additiv erlaubt, bewusst nicht Pflicht (Muster verbrauch).
    'beobachtung',
  ])
  for (const feld of Object.keys(obj)) {
    if (!erlaubt.has(feld)) verstoesse.push(`unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  if (obj.laufakte_schema !== 'v0') verstoesse.push("'laufakte_schema' muss 'v0' sein")
  if (typeof obj.lauf_id !== 'string' || obj.lauf_id.length === 0) verstoesse.push("'lauf_id' muss ein nicht-leerer String sein")
  if (typeof obj.werkzeug_version_deklariert !== 'string' || obj.werkzeug_version_deklariert.length === 0) {
    verstoesse.push("'werkzeug_version_deklariert' muss ein nicht-leerer String sein")
  }
  if (typeof obj.berechtigungskontext !== 'string' || obj.berechtigungskontext.length === 0) {
    verstoesse.push("'berechtigungskontext' muss ein nicht-leerer String sein")
  }
  if (typeof obj.arbeitsverzeichnis_pfad !== 'string' || obj.arbeitsverzeichnis_pfad.length === 0) {
    verstoesse.push("'arbeitsverzeichnis_pfad' muss ein nicht-leerer String sein")
  }
  if (!('modell_beobachtet' in obj)) {
    verstoesse.push("Pflichtfeld 'modell_beobachtet' fehlt")
  } else if (obj.modell_beobachtet !== null && (typeof obj.modell_beobachtet !== 'string' || obj.modell_beobachtet.length === 0)) {
    verstoesse.push("'modell_beobachtet' muss null oder ein nicht-leerer String sein")
  }
  if (typeof obj.beobachtungsbasis_vollstaendig !== 'boolean') {
    verstoesse.push("'beobachtungsbasis_vollstaendig' muss ein Boolean sein")
  }
  const rohstromReferenz = obj.rohstrom_referenz
  if (typeof rohstromReferenz !== 'object' || rohstromReferenz === null || Array.isArray(rohstromReferenz)) {
    verstoesse.push("'rohstrom_referenz' muss ein Objekt sein")
  } else {
    const rr = rohstromReferenz as Record<string, unknown>
    const rrErlaubt = new Set(['pfad', 'inhalts_hash'])
    for (const feld of Object.keys(rr)) {
      if (!rrErlaubt.has(feld)) verstoesse.push(`unbekanntes Feld 'rohstrom_referenz.${feld}' (additionalProperties: false)`)
    }
    if (typeof rr.pfad !== 'string' || rr.pfad.length === 0) verstoesse.push("'rohstrom_referenz.pfad' muss ein nicht-leerer String sein")
    if (typeof rr.inhalts_hash !== 'string' || rr.inhalts_hash.length < 64) {
      verstoesse.push("'rohstrom_referenz.inhalts_hash' muss ein String mit mindestens 64 Zeichen sein")
    }
  }
  if (typeof obj.erstellt_am !== 'string' || obj.erstellt_am.length === 0) {
    verstoesse.push("'erstellt_am' muss ein nicht-leerer String sein")
  }
  // F16 WS-1 (AK4): beide Felder sind erlaubt, aber nicht Pflicht — geprüft
  // wird deshalb nur der Typ, und nur wenn das Feld überhaupt da ist. Eine
  // vor F16 geschriebene Laufakte bleibt dadurch unverändert gültig
  // (append-only, Muster freigabe_erteilt/F-207 und zeitgrenzeMs/F-177).
  if ('worker' in obj && obj.worker !== 'claude-code' && obj.worker !== 'codex') {
    verstoesse.push("'worker' muss, wenn angegeben, 'claude-code' oder 'codex' sein")
  }
  if ('modell_deklariert' in obj && (typeof obj.modell_deklariert !== 'string' || obj.modell_deklariert.length === 0)) {
    verstoesse.push("'modell_deklariert' muss, wenn angegeben, ein nicht-leerer String sein")
  }
  // F32 WS-1: additiv erlaubt, bewusst nicht Pflicht (Muster worker/modell_deklariert oben).
  if ('verbrauch' in obj) {
    const verbrauch = obj.verbrauch
    if (typeof verbrauch !== 'object' || verbrauch === null || Array.isArray(verbrauch)) {
      verstoesse.push("'verbrauch' muss, wenn angegeben, ein Objekt sein")
    } else {
      const v = verbrauch as Record<string, unknown>
      const vErlaubt = new Set(['input_tokens', 'output_tokens', 'cache_read_tokens', 'cache_write_tokens', 'dauer_ms', 'dauer_api_ms', 'turns', 'quelle'])
      for (const feld of Object.keys(v)) {
        if (!vErlaubt.has(feld)) verstoesse.push(`unbekanntes Feld 'verbrauch.${feld}' (additionalProperties: false)`)
      }
      for (const feld of vErlaubt) {
        if (!(feld in v)) verstoesse.push(`Pflichtfeld 'verbrauch.${feld}' fehlt`)
      }
      for (const feld of ['input_tokens', 'output_tokens', 'cache_read_tokens', 'cache_write_tokens', 'dauer_ms']) {
        if (feld in v && (typeof v[feld] !== 'number' || !Number.isInteger(v[feld]) || (v[feld] as number) < 0)) {
          verstoesse.push(`'verbrauch.${feld}' muss ein Integer >= 0 sein`)
        }
      }
      for (const feld of ['dauer_api_ms', 'turns']) {
        if (feld in v && v[feld] !== null && (typeof v[feld] !== 'number' || !Number.isInteger(v[feld]) || (v[feld] as number) < 0)) {
          verstoesse.push(`'verbrauch.${feld}' muss null oder ein Integer >= 0 sein`)
        }
      }
      if ('quelle' in v && v.quelle !== 'claude-code' && v.quelle !== 'codex') {
        verstoesse.push("'verbrauch.quelle' muss 'claude-code' oder 'codex' sein")
      }
    }
  }
  // F36 WS-4: additiv erlaubt, bewusst nicht Pflicht — wenn vorhanden, alle sieben Listen Pflicht.
  if ('beobachtung' in obj) {
    const beobachtung = obj.beobachtung
    if (typeof beobachtung !== 'object' || beobachtung === null || Array.isArray(beobachtung)) {
      verstoesse.push("'beobachtung' muss, wenn angegeben, ein Objekt sein")
    } else {
      const b = beobachtung as Record<string, unknown>
      for (const feld of Object.keys(b)) {
        if (!BEOBACHTUNG_FELDER.includes(feld) && feld !== 'navigate_adressen') verstoesse.push(`unbekanntes Feld 'beobachtung.${feld}' (additionalProperties: false)`)
      }
      for (const feld of BEOBACHTUNG_FELDER) {
        if (!(feld in b)) verstoesse.push(`Pflichtfeld 'beobachtung.${feld}' fehlt`)
        else if (!Array.isArray(b[feld]) || !(b[feld] as unknown[]).every((e) => typeof e === 'string')) {
          verstoesse.push(`'beobachtung.${feld}' muss ein Array aus Strings sein`)
        }
      }
      // F36 WS-5a: optional (append-only, ältere Laufakten ohne das Feld bleiben gültig).
      if ('navigate_adressen' in b && (!Array.isArray(b.navigate_adressen) || !b.navigate_adressen.every((e) => typeof e === 'string'))) {
        verstoesse.push("'beobachtung.navigate_adressen' muss, wenn angegeben, ein Array aus Strings sein")
      }
    }
  }
  return verstoesse
}
