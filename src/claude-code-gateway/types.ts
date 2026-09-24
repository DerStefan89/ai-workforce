/**
 * Datei: src/claude-code-gateway/types.ts
 *
 * Zweck: Typen für das Claude-Code-Gateway (F6a WS1 + WS2 + WS4,
 * state/tasks/f6a-claude-code-gateway-ws1.md,
 * state/tasks/f6a-ws2-prozessstart.md,
 * state/tasks/f6a-ws4-windows-prozessstart.md). AufrufTokens ist die
 * einzige zulässige Aufrufrepräsentation (kein zusammengesetzter
 * Kommandozeilen-String, AK1). WerkzeugsatzBegrenzung bleibt wie F4
 * ausschließlich im Rang 'DEKLARIERT' (E-187).
 *
 * modell_beobachtet (LaufakteV0Daten) ist bewusst 'string | null' statt
 * 'string': das reale JSON-Feld für die Modellidentität aus der
 * Claude-Code-Laufausgabe ist durch state/tp-nachtrag.md nicht belegt
 * (Volltextsuche nach "model": kein Treffer) — WS2 rät nicht, sondern
 * lässt den Wert null (TECH_DEBT, siehe state/findings.md, Klärung mit
 * echtem Nachweislauf in WS3).
 *
 * F14 WS-1 (features/F14/feature.md, AK1/AK3): StarterOptionen ergänzt
 * Starter additiv um zeitgrenzeMs/abbruchSignal, ProzessErgebnis additiv um
 * beendigungsart — löst F-176.
 */

import type { ProfilReferenz } from '../checkpoint-store/types.ts'

export type AufrufTokens = string[]

export interface WerkzeugsatzBegrenzung {
  modus: 'DEKLARIERT'
  erlaubte_werkzeuge: string[]
}

export interface AufrufEingaben {
  modell: string
  werkzeugsatz: WerkzeugsatzBegrenzung
  /** Von F5s Kontextpaket abgeleiteter Prompttext, unverändert als `-p`-Argument durchgereicht (F-124) — baueAufruf baut den Text nicht selbst, das leistet F8s fuehreAufgabeDurch. */
  prompt: string
  /** F31 WS-3 (Stefan 20.09.2026, Option A): überschreibt baueAufrufs Standardwert 'project' für `--setting-sources`. Ausschließlich vom Jarvis-Chat-Pfad gesetzt (leerer String — CLAUDE.md/Hooks bleiben für den Ein-Schuss-Lauf aus dem Kontext); jeder andere Aufrufer lässt das Feld unbesetzt und bekommt unverändert 'project'. scripts/leitstand-server.mjs' pruefeStartauftrag lehnt das Feld im Body von POST /api/laeufe ab (Muster aufrufEingaben.werkzeugsatz) — es ist kein Eingabekanal für einen Body-getriebenen Lauf. */
  settingSources?: string
  /** F31 WS-3b (Stefan 20.09.2026, MCP-Start), Standard für ALLE Rollen seit F31 WS-3c (Stefan 20.09.2026, löst F-502): überschreibt baueAufrufs Standardwert `'{"mcpServers":{}}'` für `--mcp-config` — begrenzt die in E-187 (`docs/projekt/zielfassung.md` §9.4) benannte Lücke, dass `--tools`/`--allowedTools` MCP-Werkzeuge nicht abdecken (real gemessen, F31 WS-3b für `jarvis`, F31 WS-3c für eine schreibende Rolle: Account-MCP-Server laden trotz `--tools`-Begrenzung, sichtbar an `mcp_servers`/zusätzlichen `mcp__*`-Werkzeugen im `stream-json`-Init, siehe `features/F31/nachweis-mcp-begrenzung.md`). Fehlt das Feld, hängt baueAufruf trotzdem `--strict-mcp-config --mcp-config '{"mcpServers":{}}'` an (kein Aufrufer bekommt mehr ungeprüfte MCP-Server) — nur ein davon abweichender Wert (bislang ausschließlich `starteJarvisChatLauf`, unverändert derselbe leere Wert) überschreibt den Default. scripts/leitstand-server.mjs' pruefeStartauftrag lehnt das Feld im Body von POST /api/laeufe weiterhin ab (Muster settingSources). */
  mcpConfig?: string
  /** Task "Jarvis-Chat-Latenz senken" (state/nachweis-jarvis-latenz.md), Schritt 3: reine Durchreichung zusätzlicher Umgebungsvariablen an den Kindprozess (prozessstart.ts' echterStarter, execFiles env-Option), NICHT Teil des Argv — baueAufruf liest dieses Feld nicht. Ausschließlich vom Jarvis-Chat-Pfad gesetzt (MAX_THINKING_TOKENS: '0', real dokumentiert unter code.claude.com/docs/en/model-config: schaltet Extended Thinking auf der Anthropic-API ab, außer bei Fable-Modellen — dieses Repo nutzt firstParty/Anthropic, kein Fable). Muster settingSources/mcpConfig: scripts/leitstand-server.mjs' pruefeStartauftrag lehnt das Feld im Body von POST /api/laeufe ab. */
  umgebungsvariablen?: Record<string, string>
  /** F40 WS-3 (löst F-567): überschreibt baueAufrufs Standardwert (kein `--disallowedTools`) — real belegt (`state/nachweis-jarvis-latenz.md` Abschnitt "F40 WS-2", Turn 4, sowie `state/spike-f40-streaming.md` §3, 4/15 Läufe), dass ein claude-code-Prozess trotz `--setting-sources ''` per Read-Werkzeug `~/.claude/projects/…/memory/MEMORY.md` liest — kein Projekt-, sondern Entwickler-Kontext in einer Produktrolle, plus eine zusätzliche Werkzeug-Runde. `--bare` (der einzige Abschaltweg der CLI für "auto memory", `claude --help`) ist für JEDEN Aufruf per E-182 (`VERBOTENE_AUFRUFPARAMETER`) verboten und schaltet zusätzlich Hooks/CLAUDE.md/Attribution ab — kein gezielter Weg. Ausschließlich von `starteJarvisChatLauf` und dem Router-Lauf-Handler gesetzt (`Read(~/.claude/**)`, Permission-Rule-Syntax `code.claude.com/docs/en/permissions#read-and-edit`: `Read`-Deny-Regeln gelten laut Doku auch für Grep/Glob). scripts/leitstand-server.mjs' pruefeStartauftrag lehnt das Feld im Body von POST /api/laeufe ab (Muster settingSources/mcpConfig/umgebungsvariablen). */
  disallowedTools?: string
}

/** Ergebnis eines einzelnen Prozessstart-Versuchs (F-057: Argv-Array, nie ein Shell-String). startfehler trägt den Code/die Meldung eines Callback-Fehlers ohne numerischen exitCode (F-071) — null bei jedem regulären Prozessende, auch bei einem nichtnullwertigen exitCode. beendigungsart unterscheidet additiv (F14 WS-1, AK3) einen durch zeitgrenzeMs oder abbruchSignal beendeten Prozess von einem regulären Ende oder einem Startfehler — null in beiden letzteren Fällen, bestehende Felder ändern ihre Bedeutung nicht. */
export interface ProzessErgebnis {
  stdout: string
  stderr: string
  exitCode: number | null
  startfehler: { code: string | null; message: string } | null
  beendigungsart: 'TIMEOUT' | 'ABBRUCH' | null
  /** F40 WS-1: true, wenn der Starter bei der stream-json-result-Zeile aufgelöst hat (StarterOptionen.ergebnisZeileBeendet), BEVOR der Prozess endete — exitCode ist dann null, weil zu diesem Zeitpunkt real noch keiner existiert (nicht geraten). Fehlt bei jedem anderen Ende; bestehende Felder ändern ihre Bedeutung nicht. */
  ergebnisZeileVorProzessende?: true
}

/** Zusätzliche, additive Abbruchfähigkeit für einen Starter-Aufruf (F14 WS-1, AK1): zeitgrenzeMs setzt eine harte Wanduhr-Grenze, abbruchSignal erlaubt einen gezielten manuellen Abbruch derselben Invocation. Beide optional — ein Starter, der sie ignoriert, bleibt gültig. stdinLeer (F16 WS-2, F-307) schließt den stdin des Kindprozesses unmittelbar nach dem Spawn: Codex meldet ohne angebundenes stdin real `Reading additional input from stdin...` und wartet auf Eingabe, statt zu beenden (state/tp-m3-01b-codex-sandbox.md, stdin-Nebenbefund zu Lauf (a)). Default false — der Claude-Code-Pfad setzt das Feld nicht und bleibt damit unverändert. cwd (F25 WS-1, AK3) wird unverändert an execFiles natives cwd-Feld durchgereicht — kein process.chdir(), kein Shell. Fehlt der Wert, bleibt execFiles eigener Default (process.cwd() des Serverprozesses) unangetastet. */
export interface StarterOptionen {
  zeitgrenzeMs?: number
  abbruchSignal?: AbortSignal
  stdinLeer?: boolean
  /** F-642 (löst spawn ENAMETOOLONG unter Windows bei langem Argv, real gemessen Lauf bd7e2ba4-4f71-4545-85f5-606711e6f17a): schreibt diese Daten auf den stdin des Kindprozesses und schließt ihn danach (EOF) — Alternative zu einem Argv-Element für Werkzeuge, die (wie Codex' PROMPT-Argument) wahlweise ein Argument ODER stdin lesen. Schließt sich mit stdinLeer gegenseitig aus (beide adressieren stdio[0]); ein Aufrufer setzt nur eines von beiden. Default undefined — kein bestehender Aufrufer ist betroffen, stdio[0] bleibt wie zuvor (stdinLeer oder offenes Pipe). */
  stdinDaten?: string
  cwd?: string
  /** Task "Jarvis-Chat-Latenz senken", Schritt 3: zusätzliche Umgebungsvariablen für den Kindprozess, ergänzt process.env (nicht ersetzt) — s. AufrufEingaben.umgebungsvariablen. Fehlt der Wert, bleibt execFiles eigener Default (process.env unverändert) unangetastet, exakt wie cwd oben. */
  umgebungsvariablen?: Record<string, string>
  /** F-652: ERSETZT die Umgebung des Kindprozesses VOLLSTÄNDIG (kein Merge mit process.env) — anders als umgebungsvariablen oben, das nur ergänzt/überschreibt. Gebraucht, um einzelne Variablen (z. B. LEITSTAND_*) dem Kind gezielt VORZUENTHALTEN: ein Merge kann eine vorhandene process.env-Variable nicht entfernen, nur überschreiben. Schließt sich mit umgebungsvariablen gegenseitig aus (ein Aufrufer setzt nur eines von beiden); ist es gesetzt, gewinnt es. Fehlt der Wert, bleibt das bestehende Verhalten (process.env, ggf. per umgebungsvariablen ergänzt) unangetastet. */
  umgebungsvariablenVollstaendig?: Record<string, string>
  /** F40 WS-1: OPT-IN (Muster stdinLeer) — stdout wird zusätzlich zeilenweise als NDJSON gelesen; sobald eine vollständige Zeile type "result" trägt, löst der Starter mit dem bis dahin gepufferten stdout auf, statt auf das Prozessende zu warten (real 590-730ms früher, state/spike-f40-streaming.md). Nur ein FRÜHERER Erfolgspfad: ein Abbruch/Timeout/maxBuffer-Kill, der vor der result-Zeile greift, bleibt unverändert ABBRUCH/TIMEOUT/startfehler. Nur der Claude-Code-Pfad setzt das Feld (Codex-JSONL kennt keine result-Zeile). */
  ergebnisZeileBeendet?: boolean
  /** F40 WS-1: Rückruf je vollständig empfangener, als JSON-Objekt parsbarer stdout-Zeile (NDJSON) — für Live-Fortschritt. Eine unparsbare Zeile wird still übersprungen; ein Wurf des Rückrufs wird gefangen und geloggt, der Prozess-Ablauf bleibt unberührt. */
  beiStreamZeile?: (zeile: Record<string, unknown>) => void
  /** F40 WS-1: Rückruf beim tatsächlichen Prozessende ('close'), auch wenn der Starter wegen ergebnisZeileBeendet schon vorher aufgelöst hat — reine Diagnose (Zeitmessung, Log eines Exitcodes ungleich 0 nach der result-Zeile). */
  beiProzessende?: (ende: { exitCode: number | null; signal: string | null }) => void
  /** F40 WS-1: überschreibt prozessstart.ts' NACHLAUF_FRIST_MS (Kill eines nach der result-Zeile weiterlebenden Prozesses). Nur für Tests; kein Aufrufer im Produktpfad setzt das Feld. */
  nachlaufFristMs?: number
}

/** Ein live gemeldeter Werkzeugaufruf (F40 WS-1): Werkzeugname plus, falls vorhanden, sein Pfad-/Muster-Parameter. */
export interface Werkzeugaufruf {
  werkzeug: string
  ziel: string | null
}

/** Austauschbares Prozessstart-Primitiv (Muster wie F1Bs optionen.schreiber) — echte Implementierung in prozessstart.ts, Attrappen für Tests/Gate. startziel ist das Argv-Präfix (F6a WS4, E1/E2): [0] ist das Programm, weitere Elemente stehen vor tokens. Der dritte, optionale Parameter (F14 WS-1, AK1) ist additiv: eine bestehende, zweiparametrige Starter-Implementierung (z.B. attrappeMitValidemErgebnis) bleibt ohne Anpassung zuweisungskompatibel. */
export type Starter = (startziel: string[], tokens: AufrufTokens, optionen?: StarterOptionen) => Promise<ProzessErgebnis>

/** Eingaben für starteGateway (WS2). tokens kommt vom Aufrufer bereits über WS1s baueAufruf konstruiert — starteGateway baut keinen zweiten Aufruf (D5). werkzeugStartziel ist Pflichtfeld (F6a WS4, E2): das Gateway rät nichts und liest nichts aus dem Arbeitsbaum, die Vertrauensfrage liegt beim Aufrufer. */
export interface GatewayEingaben {
  laufId: string
  profilReferenz: ProfilReferenz
  tokens: AufrufTokens
  werkzeugStartziel: string[]
  werkzeugVersionDeklariert: string
  berechtigungskontext: string
}

/** Payload-Form für die Laufakte (LAUFAKTE_V0, checkpoint.payload.daten.daten bei laufakte_schema === "v0"). Trägt bewusst kein ergebnis-Feld und keine Auswertung der vom Werkzeugaufruf gemeldeten Genehmigungsverweigerungen (F7-Grenze, AK12). */
export interface LaufakteV0Daten {
  laufakte_schema: 'v0'
  lauf_id: string
  werkzeug_version_deklariert: string
  berechtigungskontext: string
  arbeitsverzeichnis_pfad: string
  modell_beobachtet: string | null
  beobachtungsbasis_vollstaendig: boolean
  rohstrom_referenz: { pfad: string; inhalts_hash: string }
  erstellt_am: string
  /** Welcher Worker den Lauf ausgeführt hat (F16 WS-1, AK4). Optional und NICHT Pflicht: jede vor F16 geschriebene Laufakte ist append-only und trägt das Feld nicht — ein fehlendes worker bedeutet deshalb 'claude-code' (Muster freigabe_erteilt/F-207 und zeitgrenzeMs/F-177). starteGateway setzt das Feld in WS-1 noch nicht. */
  worker?: 'claude-code' | 'codex'
  /** Der dem Werkzeug im Argv übergebene Modellname, Rang DEKLARIERT (E-185) — nicht zu verwechseln mit modell_beobachtet (Rang OBSERVED). Für Codex bleibt modell_beobachtet null, weil der JSONL-Strom keine Modellkennung trägt (state/tp-m3-01-codex.md, „Modellidentität": kein Feld gefunden); erst dieses Feld macht den Lauf überhaupt einem Modell zuordenbar. Optional aus demselben Append-only-Grund wie worker. */
  modell_deklariert?: string
  /** F32 WS-1: Verbrauchsdaten des Laufs, Rang OBSERVED. Additiv und optional wie worker/modell_deklariert — fehlt die Beobachtungsbasis, bleibt das Feld weg statt geschätzt zu werden. */
  verbrauch?: VerbrauchV0
}

export type GatewayErgebnis =
  | { ok: false; grund: string }
  | { ok: true; laufakte: LaufakteV0Daten; pfad: string; versionSequenz: number }

/** Verbrauchsdaten eines Laufs (F32 WS-1, Rang OBSERVED). dauer_api_ms/turns bleiben null, wenn die Quelle sie nicht liefert (Codex-JSONL trägt keins von beidem) — dauer_ms ist dagegen für beide Worker immer eine echte Messung: bei claude-code das result-Objekt-Feld duration_ms, bei Codex eine vom Gateway selbst genommene Wanduhr-Differenz um den Prozessstart (kein CLI-Feld dafür vorhanden, aber ebenso eine reale Beobachtung, keine Schätzung). total_cost_usd wird bewusst NIE übernommen (Abo-Modell, keine Scheingenauigkeit, Entscheidung 30). */
export interface VerbrauchV0 {
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  cache_write_tokens: number
  dauer_ms: number
  dauer_api_ms: number | null
  turns: number | null
  quelle: 'claude-code' | 'codex'
}
