# Spike F45 B2b-3a — Rückfrage im Lauf über einen MCP-Kanal

Stand 15.10.2026, Branch `f45/b2b3a-spike-rueckfrage`. Claude-Code-CLI 2.1.300 (`claude.exe` direkt). Frage (F-1011,
F-980 (4)): Kann ein Workforce-Lauf über einen je Lauf per `--mcp-config` mitgegebenen lokalen stdio-MCP-Server
(a) Rechte-Anfragen über `--permission-prompt-tool` an uns weiterreichen und (b) eine „Frage an Stefan“ als
MCP-Werkzeug stellen, deren Antwort wir liefern?

## Aufbau

- `mcp-rueckfrage.mjs`: Mini-stdio-MCP-Server ohne Abhängigkeit, Werkzeuge `rechte_pruefen` und
  `frage_stefan(frage, optionen)`, Antwort nach Richtliniendatei, Protokoll `mcp-protokoll-<lauf>.ndjson`.
- `spike-rueckfrage.mjs`: Wegwerf-Wurzel unter dem Temp-Ordner, je Lauf ein Wegwerf-Git-Projekt mit
  Skelett-`.claude` (`settings.json` + Hooks aus `vorlagen/projekt-skelett`, zusätzlich die Deny-Regel
  `Bash(echo DENY_PROBE_B2B3A)` nur in dieser Kopie). Argv aus `baueAufruf` (Werkzeugsatz `schreibend` der
  Startvorlage plus `mcp__rueckfrage__frage_stefan` wie `baueMcpAufruf`, `mcpConfig` mit dem Server), zusätzlich
  `--permission-prompt-tool mcp__rueckfrage__rechte_pruefen` vor `-p`; Prompt über stdin; Umgebung
  `WORKFORCE_LAUF_UMGEBUNG`. Die Wegwerf-Wurzel wird am Ende entfernt.
- Läufe: `allow`, `deny`, `warten` (je `claude-haiku-4-5`), `frage` (`claude-sonnet-5`, Modell des
  Ausführungsschritts in `workflow-vorlagen/standard.json`).
- Nachweise je Lauf: `rohstrom-<lauf>.ndjson` (stdout der CLI), `mcp-protokoll-<lauf>.ndjson`,
  `zaehlung-<lauf>.json`; alle mit `features/F45/nachweise/b2b1b/schwaerze.mjs` geschwärzt (NDJSON- bzw.
  `--json`-Modus), Restprüfung `hatRestpfad` für jede Datei `false`. „Z<n>“ unten = Zeile im Rohstrom.
  Nach den Läufen (code-reviewer) schwärzt das Skript beim Schreiben und hält Startfehler (`fehler`) fest; Argv,
  Prompts und Läufe sind unverändert.

| Lauf | Exit | Dauer (Wand) | Kosten USD | Turns | result |
|---|---|---|---|---|---|
| allow | 0 | 37,4 s | 0,0453 | 9 | success, 4 `permission_denials` |
| deny | 0 | 8,4 s | 0,0316 | 2 | success, 1 `permission_denials` |
| warten | 0 | 102,5 s | 0,0152 | 2 | success, 0 `permission_denials` |
| frage | 0 | 12,7 s | 0,0848 | 3 | success, 0 `permission_denials` |

## Ergebnis je Frage

### 1 Existiert `--permission-prompt-tool`, Format?

Ja, wirksam — aber in `claude --help` (2.1.300) **nicht als eigene Option** gelistet, nur erwähnt in der
Beschreibung von `--permission-prompts <target>` („"host" (the SDK host or --permission-prompt-tool)“). Die CLI
nimmt das Flag an und ruft das Werkzeug auf.
- Eingabe (`mcp-protokoll-deny.ndjson`, `tools/call`): `{"tool_name":"Bash","input":{"command":"node -e …",
  "description":"…"},"tool_use_id":"toolu_…"}` plus `_meta` mit `claudecode/toolUseId`.
- Antwort: ein Textinhalt mit JSON — `{"behavior":"allow","updatedInput":{…}}` oder
  `{"behavior":"deny","message":"…"}`. Die `message` landet wörtlich als `tool_result` beim Modell
  (`rohstrom-deny.ndjson` Z9: `"Stefan hat abgelehnt (Spike)."`, `is_error=true`).
- `rechte_pruefen` ist für das Modell **nicht sichtbar**: `init.tools` = `Bash, Edit, Glob, Grep, Read, Write,
  mcp__rueckfrage__frage_stefan` (Z1 jedes Rohstroms) — `--tools` aus `baueAufruf` filtert in 2.1.300 auch
  MCP-Werkzeuge. Ein eigener Verstecken-Lauf war damit überflüssig.

### 2 Befehl außerhalb von `--allowedTools`: gefragt? allow/deny?

Ja, das Werkzeug wird gefragt. allow ⇒ der Befehl läuft (`allow` Z17 `(Bash completed with no output)`,
`BASH_LIEF.txt` existiert). deny ⇒ der Befehl läuft nicht (`BASH_LIEF.txt` fehlt), das Modell bekommt die
Ablehnung als Werkzeugergebnis und macht weiter; der **Lauf endet regulär**: Exit 0, `subtype success`,
`is_error false`, `permission_denials` mit dem Bash-Aufruf (`rohstrom-deny.ndjson` Z15).

### 3 Reihenfolge: Sperrregeln, Deny-Regeln, Hooks vor dem Werkzeug?

Ja für alle drei — das Werkzeug wurde im Lauf `allow` nur für die Schritte 1, 2 und 7 gefragt
(`mcp-protokoll-allow.ndjson`: genau drei `tools/call`):
- `--disallowedTools Bash(git:*)`: Z23 `Permission to use Bash with command git status has been denied.`
- Deny-Regel aus `settings.json`: Z26 `Permission to use Bash with command echo DENY_PROBE_B2B3A has been denied.`
- `guard-settings` (Edit auf `.claude/settings.json`): Z34 `PreToolUse:Edit hook error: Schreibzugriff auf geteilte
  settings.json blockiert.` — Datei unverändert.
- `commit-guard` (Bash, der `.claude/settings.json` nennt — Befehl außerhalb des Werkzeugsatzes, wäre also
  gefragt worden): Z37 `PreToolUse:Bash hook error: commit-guard: …` — das Werkzeug wurde **nicht** gefragt.

**Aber:** Ein Schreibversuch außerhalb des Arbeitsordners geht mit allow durch. `Write` auf
`<TEMP>\…\allow\AUSSERHALB.txt` liegt außerhalb von `Edit(./**)`, wird deshalb dem Werkzeug vorgelegt und nach allow
ausgeführt (Z20 `File created successfully at: <TEMP>\b2b3a-spike-1azDAA\allow\AUSSERHALB.txt`, Datei existiert).
Ebenso ein Bash-Befehl, der außerhalb schreibt (Z41, `AUSSERHALB_BASH.txt` existiert). Die Forderung „auch mit allow
nicht“ erfüllt die CLI allein **nicht** — ohne Prompt-Werkzeug wurde derselbe Write im -p-Lauf verweigert
(`features/F45/nachweise/b1b1/`, Zählung „haertung“), mit Prompt-Werkzeug entscheidet unser Werkzeug. Die Grenze
muss also in unserem Server liegen (Pfadprüfung vor der Frage an Stefan, außerhalb ⇒ deny ohne Rückfrage) oder in
einem Hook (Hooks greifen nachweislich vorher).

Nebenbefund: stderr jedes Laufs meldet `Ignoring 1 permissions.allow entry from .claude/settings.json: this
workspace has not been trusted.` — im nicht vertrauten Wegwerf-Ordner wirken die Allow-Einträge der Projekt-Settings
nicht, Deny-Regeln und Hooks schon.

### 4 Wartezeit 90 s

Kein Abbruch. `rechte_pruefen` antwortete nach `dauer_ms: 90007` (`mcp-protokoll-warten.ndjson`), der Befehl lief
danach (Z9), `result` `duration_ms 97764`, Exit 0. Zeitgrenzen der CLI (aus der 2.1.300-Binärdatei gelesen, nicht
gemessen): stdio-MCP-Werkzeugaufrufe haben eine **Leerlaufgrenze, Standard 30 min** (`CLAUDE_CODE_MCP_TOOL_IDLE_TIMEOUT`,
0 schaltet ab) und eine harte Grenze je Aufruf über `MCP_TOOL_TIMEOUT` bzw. `timeout` je Server in der MCP-Konfiguration
(„progress notifications do not extend it“); den Standardwert der harten Grenze konnte ich nicht eindeutig lesen.
`zeitgrenze_ms` des Schritts (Ausführung 1 800 000 ms in `standard.json`) läuft in unserem Server und beendet den
Prozess unabhängig davon — eine offene Frage an Stefan endet dann mit dem Lauf. Nur festgehalten.

### 5 Frage-Werkzeug `frage_stefan`

Ja. Mit einer allgemeinen Regel im Prompt („Lässt der Auftrag eine Entscheidung offen, … frage ihn mit dem Werkzeug
frage_stefan, statt zu raten“) und einem Auftrag ohne Portvorgabe rief `claude-sonnet-5` das Werkzeug als ersten
Schritt auf (`frage`: „Welcher Port soll in dev-server.json … verwendet werden?“, Optionen `3000, 8080, 5173,
Anderer Port (bitte angeben)`), bekam `Stefan entscheidet: Port 4711.` (Z5) und schrieb `{"port": 4711}`
(Z8, Inhalt in `zaehlung-frage.json`); Schlusszeile: „Port: 4711 — Entscheidung stammt von Stefan (per Rückfrage…)“.
Die Antwort ist bewusst keine der Optionen — das Modell übernahm sie trotzdem. `frage_stefan` muss in
`--allowedTools` stehen (wie `baueMcpAufruf` es für Katalog-MCPs tut), sonst löste das Werkzeug selbst eine
Rechte-Anfrage aus. Ein einzelner Lauf; ob das Modell auch ohne die Regelzeile fragt, ist nicht geprüft.

### 6 Gültigkeitsschlüssel der Startfreigabe (nur lesend)

Nicht berührt. Der Schlüssel (`src/invocation-policy/types.ts`, `Gueltigkeitsschluessel`) besteht aus
`werkzeug_konfiguration_hash` (Hash von `.claude/settings.json`), `schutzskript_hashes` (Hooks aus der settings),
`werkzeug_version_deklariert`, `berechtigungskontext`, `arbeitsverzeichnis_pfad`, `startziel_pfad`
(`ermittleIstZustand`, `src/invocation-policy/index.ts`). Argv-Tokens wie `--mcp-config` und
`--permission-prompt-tool` gehen nicht ein; `--mcp-config` variiert schon heute je Lauf (F36). Die Verbotsliste
E-182 (`src/invocation-policy/verbotene-aufrufparameter.ts`) enthält keines der beiden Flags. Zwei Folgen trotzdem:
das Init-Gate (`pruefeInitZeile`, `mcp_servers` = übergebene) muss den Rückfrage-Server als übergeben kennen, und der
Rot-Fall-Beleg der Startfreigabe („Write außerhalb verweigert“, b1b1) beschreibt einen Lauf ohne Prompt-Werkzeug —
mit Werkzeug gilt er nur, wenn unser Server außerhalb automatisch ablehnt (siehe Frage 3); der Nachweis müsste dann
einen Lauf mit Werkzeug enthalten.

## Empfehlung

**A — MCP-Kanal tragfähig, mit Grenzen.** Beide Wege (Rechte-Anfrage und Frage an Stefan) laufen real über einen
je Lauf mitgegebenen stdio-Server, ohne Änderung an `.claude/` oder am Gültigkeitsschlüssel. Grenzen für B2b-3b:
1. **Pfadgrenze im Server:** Write/Edit außerhalb des Arbeitsordners automatisch ablehnen, nie Stefan vorlegen; ein
   Bash-allow ist volles Vertrauen für genau diesen Befehl (Befehl wörtlich anzeigen, nur „einmal erlauben“).
2. **Nicht dokumentiertes Flag:** `--permission-prompt-tool` steht in 2.1.300 nicht in der Hilfe; die
   Startfreigabe-Erneuerung (`docs/harness/startfreigabe-erneuern.md`) braucht einen Nachweis-Lauf mit dem Werkzeug.
   Die Binärdatei enthält zudem den Hinweis, dass in einem Modus, in dem der Host über stdio spricht, ein MCP-Werkzeug
   Rechte-Anfragen nicht beantworten kann — unser `-p`-Aufruf mit Prompt über stdin ist davon nicht betroffen (belegt).
3. **Wartezeit:** Frage und Rechte-Anfrage blockieren den Lauf; Grenzen sind `zeitgrenze_ms` des Schritts und die
   30-min-Leerlaufgrenze der CLI. Offene Fragen müssen beim Lauf-Ende (Zeitgrenze, Abbruch) aufgeräumt werden.
4. **Auswertung:** Ein abgelehnter Befehl endet als `success` mit `permission_denials` — der Result Evaluator muss
   „Stefan hat abgelehnt“ von einer Werkzeugsatz-Sperre unterscheiden (F-764/F-768).
5. **Advisor-Pass** vor dem Bau (Nebenwirkung: neuer Rechteweg).

Rückfallebene B (Halt mit „einmal erlauben und fortsetzen“) bleibt möglich, ist aber nicht nötig.

## Kosten

Vier Läufe, zusammen **0,177 USD** (0,0453 + 0,0316 + 0,0152 + 0,0848), rund 2:40 min Laufzeit. Keine Wiederholung
nötig.
