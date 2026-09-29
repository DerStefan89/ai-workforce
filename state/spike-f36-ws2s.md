# Spike F36 WS-2s — Ort für externe Skills/Agents, Schreibgrenze, Playwright-Begrenzung

Stand 28.09.2026, Basis `main` `bc755e1` (#270). Skript:
`scripts/spike-f36-ws2s.mjs` (Wegwerf). Reale Claude-CLI (`2.1.284`,
`claude-sonnet-5`), Tokens aus dem unveränderten `baueAufruf()`, Spawn über
das unveränderte `starteProzess()`. Nur für die Messung werden `--add-dir`
bzw. `--agents` vor `-p` eingeschoben.

**Werkzeugsatz** = `startvorlagen/ai-workforce.json` `werkzeugsaetze.schreibend`
+ `Skill` + `Agent` (wie der WS-2-Entwurf vor S6 ihn vorsah — gebaut wurde nach S6 Variante 3b ohne beide); bei S5 zusätzlich
`mcp__playwright__browser_navigate`, `…_snapshot`, `…_take_screenshot`.

**Arbeitsverzeichnis** je Probe: frische Kopie von `vorlagen/projekt-skelett`
in `%TEMP%\spike-f36-ws2s-<probe>-XXXXXX` mit eigenem `git init` + Commit. Nie
haushaltsbuch2, nie dieses Repo. **Fähigkeiten-Ordner (Ort B)**:
`%TEMP%\spike-f36-ws2s-cap-XXXXXX` mit `.claude/skills/probe-skill/SKILL.md`
(Codewort `KAP-SKILL-4711`) und `.claude/agents/probe-agent.md` (`tools: Read`,
Codewort `KAP-AGENT-0815`). Rohströme: `%TEMP%\spike-f36-ws2s\<probe>.ndjson`,
Zusammenfassung daneben (flüchtig, nicht versioniert).

## Gesamturteil

| Frage | Urteil | Beleg |
|---|---|---|
| S1 Skill nur in `<cap>/.claude/skills/`: lädt `--add-dir <cap>` ihn? | **HÄLT** (Grün + Rot) | S1a: `init.skills` enthält `probe-skill`; `Skill {"skill":"probe-skill"}` → „Launching skill: probe-skill“, Antwort `KAP-SKILL-4711`, 0 Denials. S1b ohne `--add-dir`: nicht in `init.skills`, kein Aufruf |
| S2 Agent nur in `<cap>/.claude/agents/`: lädt `--add-dir <cap>` ihn? | **HÄLT** (Grün + Rot) | S2a: `init.agents` enthält `probe-agent`; `Agent {subagent_type:"probe-agent", run_in_background:false}` → `KAP-AGENT-0815`. S2b ohne `--add-dir`: nicht in `init.agents` |
| S3 `--agents '<json>'` inline | **HÄLT** (technisch) | `init.agents` enthält `probe-agent`; `Agent`-Aufruf im Vordergrund läuft im `-p`-Modus, 0 Denials. Aber: der Subagent wertete den Inline-`prompt` als eingeschleuste Anweisung und verweigerte das Codewort (Modellurteil, einmalig beobachtet) — die Datei-Variante (S2a) befolgte denselben Inhalt |
| S4 Schreibrecht in `<cap>` mit `--add-dir` | **HÄLT NICHT** (ohne Sperre) | S4a: `Write` nach `<cap>\geschrieben.txt` → „File created successfully“, Datei existiert, 0 Denials. `--add-dir` gibt Schreibrecht |
| S4 Sperre per `--disallowedTools "Write(<cap>/**)" "Edit(<cap>/**)"` | **HÄLT** mit Form `C:/…/cap/**` · **HÄLT NICHT** mit `//C:/…` | S4b (`Write(C:/Users/…/cap/**),Edit(…)`): Write erzwungen → „File is in a directory that is denied by your permission settings.“, `permission_denials` = 1× Write, Datei fehlt. S4c (`Write(//C:/Users/…/cap/**)`): Datei geschrieben, 0 Denials |
| S5 `--output-dir <tmp>/pw-out`: entsteht `.playwright-mcp/` im Projekt? | **HÄLT** | S5a/S5c: Snapshot `.yml` und Screenshot `.png` landen in `pw-out`, Projekt-`git status` leer. Gegenprobe S5b ohne Flag: drei Dateien unter `.playwright-mcp/` untracked im Projekt |
| S5 `--allowed-origins "http://localhost;http://127.0.0.1"` | **HÄLT NICHT** (in dieser Form) | S5a: auch `http://127.0.0.1:<port>` → `net::ERR_BLOCKED_BY_CLIENT` — die Origin schließt den Port ein. S5c mit `http://localhost:<port>;http://127.0.0.1:<port>`: lokal Titel `KAP-LOKAL`, `https://example.com` → `ERR_BLOCKED_BY_CLIENT`. Kalibrierung S5b ohne Flag: example.com erreichbar (`Example Domain`) |

### S6 — begrenzt `--allowedTools` Skill/Agent auf Einzelregeln? (Nachtest, Challenger 28.09.2026)

Gleiches Setup, Werkzeugsatz = schreibend + Einzelregeln; `baueAufruf`
leitet `--tools` daraus als `…,Skill,Agent` ab. Belegt über erzwungene
Aufrufe und `permission_denials`, nicht über Modellurteil. Je Probe ein
Lauf; Rohströme `%TEMP%\spike-f36-ws2s\S6a_skill_regel.ndjson`,
`S6b_agent_regel.ndjson`, `S6c_ohne_allowed.ndjson`, `S6d_sperrliste.ndjson`
(S6d = zweiter Versuch). Gegenstück ohne `Skill`/`Agent` in `--tools`: WS-0
P4 (`state/spike-f36-werkzeugsatz.md`) — dort nicht verfügbar, 0 Aufrufe.

| Frage | Urteil | Beleg |
|---|---|---|
| `Skill(ponytail)`/`Agent(qa)` bestehen `WERKZEUG_EINTRAG_MUSTER` und `pruefeErlaubteWerkzeuge` | **HÄLT** | Muster `true` für `Skill(ponytail)`, `Skill(advisor-pass)`, `Agent(qa)`, `Agent(code-reviewer)`, `Agent(architecture-advisor)`; `pruefeErlaubteWerkzeuge` → `[]` für `schreibend` und `lesend` |
| S6a `--allowedTools …,Skill(ponytail),Agent(qa)`: `ponytail` erlaubt, `advisor-pass` verweigert? | **HÄLT NICHT** | `Skill ponytail` → „Launching skill: ponytail“; `Skill advisor-pass` → „Launching skill: advisor-pass“; `permission_denials: []` |
| S6b dasselbe für Agent: `qa` erlaubt, `general-purpose`/`statusline-setup` verweigert? | **HÄLT NICHT** | alle drei `Agent`-Aufrufe (Vordergrund) liefen und berichteten; `permission_denials: []` |
| S6c Kalibrierung: `Skill`/`Agent` nur in `--tools`, gar nicht in `--allowedTools` | aufrufbar | `advisor-pass` und `general-purpose` laufen, 0 Denials — Skill/Agent brauchen im `-p`-Lauf keine Freigabe; `--allowedTools` kann sie nicht begrenzen |
| S6d Sperrliste `--disallowedTools Skill(advisor-pass),Agent(general-purpose)` | **HÄLT** (gezielte Sperre) | `ponytail` ok; `advisor-pass` → „Skill execution blocked by permission rules“ (in `permission_denials`); `qa` ok; `general-purpose` → „Agent type 'general-purpose' has been denied by permission rule 'Agent(general-purpose)' from cliArg.“ Erster Versuch mit „Messlauf“-Rahmung: Modell verweigerte alle Aufrufe, zweiter mit schlichtem Auftrag ausgewertet. `init.skills`/`init.agents` bleiben ungefiltert |

**Folge (Variante 3b):** Eine Freigabeliste über `--allowedTools` trägt
nicht; `Skill`/`Agent` in `--tools` öffnet jeden geladenen Skill/Agent,
also auch die ungeprüften Nutzer-/Plugin-Skills (F-770). WS-2 nimmt sie
deshalb nicht in den Werkzeugsatz; F-770 auf P1 („blockiert
F36-Reallauf“). Ein Weg über die Sperrliste (S6d) setzt voraus, dass die
nicht freigegebenen Einträge vor dem Start vollständig bekannt sind.

**Flag-Syntax `@playwright/mcp@0.0.82`** (`--help`):
`--allowed-origins <origins>` — semikolongetrennt, Default „allow all“; die
Hilfe sagt wörtlich: „*does not* serve as a security boundary and *does not*
affect redirects“. `--output-dir <path>` — für automatisch benannte Dateien;
„Files with an explicit name are resolved against the workspace root instead
and are not affected by this option“. Gestartet ohne `cmd /c` (Semikolon):
`command` = `node.exe`, `args` = `[npx-cli.js, -y, @playwright/mcp@0.0.82,
--headless, --isolated, --output-dir, <pw-out>, --allowed-origins,
http://localhost:<port>;http://127.0.0.1:<port>]`.

## Je Probe

Allen Proben gemeinsam: `init.tools` = `Task, Bash, Edit, GetTask, Glob, Grep,
Read, Skill, Write` (S5 zusätzlich alle 34 `mcp__playwright__browser_*`,
bestätigt WS-0 P3: `--tools` begrenzt MCP nicht). `beendigungsart` `null`,
`stderr` leer.

- **S1a** `--add-dir <cap>`: `skills` 26 Einträge inkl. `probe-skill`; Aufruf
  `Skill` → Codewort; 3 Turns.
- **S1b** ohne: `probe-skill` fehlt; Antwort „nicht in der Liste der
  verfügbaren Skills“.
- **S2a** `--add-dir <cap>`: `agents` inkl. `probe-agent`; Aufruf mit
  `run_in_background: false`, Bericht kam an (`KAP-AGENT-0815`). Nebenbefund:
  `--add-dir` lädt Skills UND Agents des Ordners zugleich.
- **S2b** ohne: `probe-agent` fehlt in `agents`.
- **S3** `--agents '{"probe-agent":{description,prompt,tools:["Read"]}}'`:
  in `agents`; Aufruf läuft, Bericht kommt an; Inhalt siehe Tabelle.
- **S4a** `--add-dir <cap>`, erzwungener Write: Datei geschrieben.
- **S4b** + `--disallowedTools Bash(git:*),Write(C:/…/cap/**),Edit(C:/…/cap/**)`
  (über `baueAufruf`, kommagetrennt): Write verweigert, 1 Denial.
- **S4c** wie S4b mit `//`-Präfix: Regel greift nicht, Datei geschrieben.
- **S4d** ohne `--add-dir`: Modell verweigerte den Aufruf selbst (Skelett-
  CLAUDE.md „ein Zielverzeichnis pro Auftrag“), kein Write-Aufruf → zur
  Frage „Write außerhalb ohne `--add-dir`“ weiter **UNKLAR** (F-780 bleibt offen).
- **S5a** `--output-dir` + Origins ohne Port: beide Navigationen blockiert,
  Screenshot der Chrome-Sperrseite in `pw-out`.
- **S5b** ohne Flags: alles erreichbar, `.playwright-mcp/` im Projekt.
- **S5c** `--output-dir` + Origins mit Port: lokal ok, extern blockiert,
  Projekt sauber.

## Feststellung Ort A / B (nur feststellend, ohne Umsetzung)

- **(B) Workforce-Ordner per `--add-dir`** trägt technisch: Skills und Agents
  aus einem Ordner außerhalb des Projekts erscheinen in `init` und sind
  aufrufbar (S1a, S2a); der Projekt-Arbeitsbaum bleibt sauber, die
  Vorbedingung „sauberer Arbeitsbaum“ schreibender Läufe wird nicht berührt.
  Voraussetzung: der Ordner wird zusätzlich schreibgesperrt, und zwar mit
  der Regelform `Write(C:/…/**)`/`Edit(C:/…/**)` (S4b) — nicht mit `//` (S4c),
  sonst darf der Lauf die freigegebenen Fähigkeiten selbst verändern (S4a).
  `--add-dir` lädt immer alles im Ordner (Skills und Agents gemeinsam), eine
  Auswahl je Lauf braucht also einen Ordner je Auswahl oder eine andere
  Begrenzung.
- **(B') `--agents '<json>'`** trägt für Agents technisch (S3), ist aber
  anfälliger: der Inline-Prompt wurde vom Subagenten als Injektion gewertet.
  Kein Weg für Skills.
- **(A) ins Projekt und committen** ist durch S1b/S2b indirekt bestätigt
  (nur geladen, was im Projekt oder per `--add-dir` liegt; WS-0 P1/P2 zeigt
  Projekt-Skills/-Agents aufrufbar). Es verlangt einen Commit im Projekt
  vor dem Lauf (Arbeitsbaum muss sauber sein) — also einen menschlichen
  Schritt oder einen Kern-Commit außerhalb der Laufvorbereitung.

Beide Orte tragen; B trägt ohne Eingriff ins Projekt, braucht aber die
Schreibsperre aus S4b.

**Festgehalten (Challenger, 28.09.2026): Ort = B.** Je Eintrag ein
`--add-dir <cap>/<id>` plus `--disallowedTools Write(C:/…/<id>/**),Edit(C:/…/<id>/**)`;
kein `--agents` (S3). Umsetzung in WS-5 (`features/F36/feature.md`).
Achtung aus S6: auch über `--add-dir` geladene Skills/Agents sind nur dann
auf die Freigabe begrenzt, wenn F-770 gelöst ist. Lösungsweg: S7, V4a.

**E-F36-7 = A** (Stefan, 28.09.2026) zu S5: playwright-mcp bleibt
`wirkung: lokal`, nur mit `--allowed-origins` auf die Projekt-URL mit Port
und `--output-dir` außerhalb des Projekts; Weiterleitungen bleiben bekannte
Grenze (F-790).

## Folgerungen für WS-3/WS-5 (nur feststellen)

1. Playwright-MCP: `--output-dir` außerhalb des Projekts ist Pflicht, sonst
   landet `.playwright-mcp/` im Arbeitsbaum. Snapshots mit explizitem
   Dateinamen folgen dem Flag laut Hilfe nicht — nicht gemessen.
2. `--allowed-origins` braucht den Port (`http://127.0.0.1:<port>`), der
   Katalogwert `http://localhost;http://127.0.0.1` sperrt jeden lokalen
   Server mit Port. Die Hilfe bezeichnet das Flag ausdrücklich als keine
   Sicherheitsgrenze und ohne Wirkung auf Redirects — relevant für die
   Entscheidung „bleibt `wirkung: lokal`“ (F-786).
3. Schreibsperren auf Windows in der Form `Write(C:/pfad/**)`; `//C:/…`
   greift nicht.

## S7 — Nur Ort-B-Skills/-Agents sichtbar und aufrufbar? (F-770, E-F36-8 = B, 29.09.2026)

Basis `spike/f36-s7` auf `573aebc` (#271). Skript `scripts/spike-f36-s7.mjs`,
CLI **`2.1.284`** (`init.claude_code_version`), `claude-sonnet-5`, Anmeldung
unverändert (claude.ai-Login, `apiKeySource: none`). Tokens aus dem
unveränderten `baueAufruf()`, Spawn über `starteProzess()`. Werkzeugsatz =
`schreibend` + `Skill` + `Agent`. Jeder Lauf: frische Skelett-Kopie in
`%TEMP%\spike-f36-s7-<variante>-XXXXXX` (eigenes `git init`), Ort B
`%TEMP%\spike-f36-s7-cap-XXXXXX` (`probe-skill`/`probe-agent` wie WS-2s) per
`--add-dir` plus Schreibsperre (S4b-Form). Ein schlichter Auftrag erzwingt
je Lauf: `probe-skill`, `probe-agent`, `ponytail` (Projekt), `design:ux-copy`
(Plugin), `pdf` (claude.ai-Sync), `loop` (eingebaut), ab Runde 2 `design`
(eingebaut), `qa` (Projekt-Agent), `general-purpose` (eingebauter Agent).
Gewertet über `init` und das Tool-Ergebnis (`is_error`/Text), nicht über
Modellurteil. **Jede Variante 2 Läufe, beide Läufe je Variante identisch**
(init-Listen und Aufrufergebnisse). Runde 1 (B0, V1, V1b, V2, V3, V4b) lief
ohne Schritt 6b, dort ist `design` nicht gemessen; Runde 2 (V1c, V2x, V2y,
V4a) lief mit 6b. Keine Variante wurde wiederholt. V2 nutzte in beiden
Läufen denselben Konfig-Ordner: Lauf 1 legte dort `.claude.json`,
`backups/`, `projects/` und `sessions/` an, Lauf 2 startete also nicht leer.
Die Anmeldung scheiterte in beiden Läufen gleich. Vor und nach jedem Lauf wurden die
Verzeichnislisten unter `~/.claude/skills`, `…/agents` und `…/plugins`
verglichen: unverändert in allen 20 Läufen. Sitzungsprotokolle, die die
CLI selbst anlegt (`~/.claude/projects/…`), sind davon nicht erfasst. Rohströme:
`%TEMP%\spike-f36-s7\<variante>-<n>.ndjson` (flüchtig).

### Herkunft (Punkt 1) — B0 = heutiger Start + `Skill`/`Agent` in `--tools` + `--add-dir`

| Quelle | Skills | Agents | Beleg |
|---|---|---|---|
| eingebaut (CLI-Bundle) | 18: `deep-research, design, design-sync, dataviz, update-config, verify, debug, code-review, simplify, batch, fewer-permission-prompts, doctor, loop, schedule, claude-api, workflow-authoring, run, run-skill-generator` | 5: `claude, Explore, general-purpose, Plan, statusline-setup` | bleiben bei `--setting-sources ''`/`local` (V1b/V1c) und bei leerem `CLAUDE_CONFIG_DIR` (V2); 16 der 18 Skills verschwinden mit `disableBundledSkills` (V4b), das laut Doku nur gebündelte Skills betrifft |
| Nutzer (`~/.claude`) | 0 | 0 | `~/.claude/skills` hat nur `synced/`, `~/.claude/agents` fehlt. Nachgestellt in V2x: `nutzer-probe-skill`/`-agent` im `CLAUDE_CONFIG_DIR` erscheinen bei `--setting-sources project` **nicht** im init |
| Plugin | 0 | 0 | `init.plugins` = nur `telemetry@builtin`; `design:ux-copy` → „Unknown skill“ |
| claude.ai-Sync | 0 | 0 | `pdf` → „Unknown skill: pdf“ (Doku: kein Sync bei `--setting-sources` ohne `user`) |
| Projekt (`.claude` im cwd) | 7: `advisor-pass, git-flow, handoff-vertrag, ponytail, repo-audit, spec-schreiben, werkzeug-auswahl` | 3: `architecture-advisor, code-reviewer, qa` | Skelett-`.claude/`; verschwinden mit `--setting-sources ''`/`local` |
| add-dir (Ort B) | `probe-skill` | `probe-agent` | nur mit `--add-dir`; verschwinden mit `--setting-sources ''`/`local` |

**Korrektur zu F-770:** Die „21 Nutzer-/Plugin-/eingebauten Skills“ aus WS-0
sind ausnahmslos **eingebaut**. `--setting-sources project` hält Nutzer-,
Plugin- und Sync-Quellen bereits heraus. Im B0-Lauf sind aufrufbar:
`ponytail`, `loop`, `qa` und `general-purpose`, jeweils 0 Denials.
**Versionsdrift:** Unter WS-0 (`2.1.283`) waren es 21 eingebaute Skills,
darunter `slides`, `artifact-diagramming` und `artifact-capabilities`, plus
der Agent `claude-code-guide`. Unter `2.1.284` sind es 18 Skills ohne diese
drei, und der Agent `claude-code-guide` fehlt. Ohne Anmeldung (V2) fehlt
zusätzlich `schedule`, und `init.plugins` enthält dann `agents-md@builtin`.

### Varianten (Punkt 2) — Belegstellen der Schalter

- **V1** Plugins abschalten: `--settings '{"enabledPlugins":{"<id>@synced":false,…}}'`.
  Doku `code.claude.com/docs/en/plugins/loading` („Find where a plugin is
  enabled“): Quelle `flag` = „The `--settings` value you pass at launch — This
  session only“. Die IDs stammen aus `claude plugin list --json` (nur
  lesend). `claude plugin disable` scheidet aus, weil es in die
  Nutzereinstellungen schreibt. V1b/V1c kombinieren V1 zusätzlich mit
  `--setting-sources ''` bzw. `local` (`claude --help`: „Comma-separated
  list of setting sources to load (user, project, local)“).
- **V2** `CLAUDE_CONFIG_DIR` = leerer Temp-Ordner. Doku `docs/en/env-vars`:
  „Override the configuration directory. Defaults to `~/.claude`.“
  Keine Anmeldedaten kopiert, verschoben oder verlinkt. V2x/V2y legen
  einen Nutzer-Probe-Skill in diesen Ordner (nur das init wird gewertet).
- **V3** `--disable-slash-commands`. `claude --help`: „Disable all skills“.
- **V4a** feste Namensliste für die übrigen Einträge:
  - `--settings` mit `disableBundledSkills: true` (Doku
    `docs/en/settings-reference`: „Turn off the skills and workflows
    included with Claude Code“);
  - `skillOverrides` auf `"off"` für `design`, `doctor` und die
    Projekt-Skills (Doku `docs/en/skills` „Override skill visibility from
    settings“);
  - `--disallowedTools Skill(<…>),Agent(<…>)` für dieselben Skills sowie
    die 5 eingebauten und die Projekt-Agents (Doku `docs/en/sub-agents`:
    „You can also use the `--disallowedTools` CLI flag“).
  - Die Projektnamen liest der Start aus `<projekt>/.claude/skills|agents`.
- **V4b** wie V1b, zusätzlich `disableBundledSkills` und
  `CLAUDE_CODE_AGENT_SDK_DISABLE_BUILTIN_AGENTS=1` (Doku `docs/en/sub-agents`:
  „In non-interactive mode … set … to remove all built-in types“).
- Weitere dokumentierte Schalter wurden nicht gemessen:
  - `--bare`: „Anthropic auth is strictly ANTHROPIC_API_KEY or
    apiKeyHelper“; hier ist kein API-Key gesetzt, also nach Regel (f) nicht
    tragfähig.
  - `--safe-mode`: schaltet laut Hilfe auch CLAUDE.md und Projekt-Agents
    ab und ist damit für den Ausführungslauf zu grob.
  - `syncClaudeAiPlugins`/`syncClaudeAiSkills`: laut Doku nur für User-,
    Local- und Managed-Scope; `false` verschiebt die synchronisierten
    Inhalte nach `.trash/`, würde also `~/.claude` verändern.

### Tabelle Variante × (a)–(g)

(a) Nutzer weg · (b) Projekt weg · (c) eingebaut weg · (d) add-dir geladen
UND aufgerufen · (e) nicht Freigegebenes erzwungen NICHT aufrufbar ·
(f) Anmeldung unverändert · (g) Testprojekt-Arbeitsbaum sauber.

| Variante | (a) | (b) | (c) | (d) | (e) | (f) | (g) |
|---|---|---|---|---|---|---|---|
| B0 heute (`project`) | ja (0 geladen; V2x) | **nein** (7+3) | **nein** (18+5) | ja | **nein**: `ponytail`, `loop`, `qa`, `general-purpose` laufen | ja | ja |
| V1 Plugins aus (`--settings enabledPlugins`) | ja | nein | nein | ja | nein (wie B0) | ja | ja |
| V1b V1 + `--setting-sources ''` | ja | ja | nein (18+5) | **nein**: `probe-skill` „Unknown skill“, `probe-agent` „not found“ | nein: `loop`, `general-purpose` laufen | ja | ja |
| V1c V1 + `--setting-sources local` | ja | ja | nein | **nein** (wie V1b) | nein: `loop`, `general-purpose` laufen | ja | ja |
| V2 leeres `CLAUDE_CONFIG_DIR` | ja | nein | nein | — (Lauf bricht ab) | — | **nein**: „Not logged in · Please run /login“ (nach ~1 s) | ja |
| V2x/V2y `CLAUDE_CONFIG_DIR` mit Nutzer-Probe (`project`/`local`) | ja: `nutzer-probe-*` nicht im init | nein / ja | nein | — / nein | — | **nein** (wie V2) | ja |
| V3 `--disable-slash-commands` | ja | Skills ja, Agents nein | Skills ja, Agents nein | **nein**: `init.skills` = `[]`, auch `probe-skill` weg (für Ort B unbrauchbar); `probe-agent` läuft | nein: `qa`, `general-purpose` laufen | ja | ja |
| V4b V1b + `disableBundledSkills` + `…DISABLE_BUILTIN_AGENTS=1` | ja | ja | Skills: bis auf `design`, `doctor`; **Agents: nein** (Env-Var ohne Wirkung, alle 5 bleiben) | **nein** (wie V1b) | nein: `general-purpose` läuft | ja | ja |
| **V4a** `project` + `disableBundledSkills` + `skillOverrides` off + Sperrliste | ja (abgeleitet: keine Nutzerquelle vorhanden; B0 + V2x ohne Anmeldung) | **Skills ja** (`init.skills` = nur `probe-skill`); **Agents nein** (bleiben in `init.agents`, erzwungen gesperrt) | Skills ja; Agents über Sperrliste gesperrt | **ja**: „Launching skill: probe-skill“, `probe-agent` liefert `KAP-AGENT-0815` | **ja**: `ponytail` → „disabled for model invocation in skillOverrides settings“; `loop`, `design:ux-copy`, `pdf` → „Unknown skill“; `design` → „cannot be used … disable-model-invocation“; `qa`/`general-purpose` → „has been denied by permission rule 'Agent(…)' from cliArg.“ | ja | ja |

Nebenbefunde:
- Im `-p`-Lauf lädt `--add-dir` Skills und Agents nur mit der Quelle
  `project`. Mit `''` oder `local` fehlen `probe-skill` und `probe-agent`.
  Die Anforderung „Ort B ohne Projektquelle“ ist damit nicht erfüllbar.
- Der eingebaute Skill `design` ist schon ab Werk nicht vom Modell
  aufrufbar (`disable-model-invocation`), bleibt aber bei
  `disableBundledSkills` im init. `skillOverrides` blendet ihn aus.
- In V4a lieferten gesperrte Agents einen Tool-Fehler, `permission_denials`
  blieb aber `[]`. In S6d stand die Sperre darin. Maßgeblich ist deshalb das
  Tool-Ergebnis.
- Der Test-Skill `loop` wurde in B0, V1, V1b und V1c geladen, aber nicht
  ausgeführt. Kein Lauf hat den Arbeitsbaum berührt.

### Urteil S7

**HÄLT NICHT im Wortlaut, und zwar an (b) für Agents.** Keine Kombination
entfernt die Projekt-Agents (`qa`, `code-reviewer`, `architecture-advisor`)
aus `init.agents`, solange die Ort-B-Agents geladen werden: Beides hängt an
der Quelle `project`. Ein dokumentierter Schalter, der Agents ausblendet,
existiert nicht; `CLAUDE_CODE_AGENT_SDK_DISABLE_BUILTIN_AGENTS` blieb ohne
Wirkung.

Alle anderen Kriterien erfüllt V4a in beiden Läufen:
- (a), (d), (f), (g) erfüllt;
- (b) für Skills erfüllt;
- (c) für Skills über `disableBundledSkills` plus `skillOverrides`, für
  Agents über die feste Sperrliste;
- (e) erfüllt: jeder nicht freigegebene Skill und Agent ist erzwungen
  nicht aufrufbar.

**Challenger-Präzisierung ([EMPFEHLUNG] 29.09.2026) zu E-F36-8 = B, keine
Entscheidung Stefans: „S7 HÄLT mit V4a.“** AK4 heißt „nicht aufrufbar ohne
Freigabe“, nicht „unsichtbar“:
- Projekt-Agents dürfen im init sichtbar sein, wenn `--disallowedTools` sie
  deterministisch sperrt.
- Freigegebene Katalogeinträge (auch Projekt-Agents/-Skills) fallen aus der
  Sperrliste heraus.
- Verwerfen, wenn das Modell im Reallauf wiederholt gesperrte Agents
  ansteuert.

Umsetzung in WS-5 zusammen mit dem Init-Gate und dem Vorstart-Scan
(F-791).

**Empfohlene Startkombination (V4a)** — zusätzlich zum heutigen `baueAufruf`
(`--setting-sources project`, `--strict-mcp-config`):
1. `--tools …,Skill,Agent` (nur für `ausfuehrung`, wenn ein Ort-B-Eintrag freigegeben ist);
2. je freigegebenem Eintrag `--add-dir <cap>/<id>` + `Write(C:/…/<id>/**),Edit(C:/…/<id>/**)` in `--disallowedTools` (S4b);
3. `--settings '{"enabledPlugins":{<aktive Plugins>:false},"disableBundledSkills":true,"skillOverrides":{"design":"off","doctor":"off",<nicht freigegebene Projekt-Skills>:"off"}}'`;
4. `--disallowedTools` + `Skill(design),Skill(doctor),Skill(<Projekt-Skills>)` + `Agent(claude),Agent(Explore),Agent(general-purpose),Agent(Plan),Agent(statusline-setup),Agent(<Projekt-Agents>)`;
5. Projektnamen beim Start aus `<projekt>/.claude/skills/` und `…/agents/` lesen;
6. Init-Gate: `init.skills` und `init.agents` ⊆ „freigegeben ∪ bewusst
   gesperrt“. Taucht ein unbekannter Name auf, Lauf abbrechen
   (fail-closed gegen Versionsdrift, F-791 (1)/(3));
7. Vorstart-Scan: Ein weiteres `.claude/skills` oder `.claude/agents`
   unterhalb der Projektwurzel bricht den Lauf ab (F-791 (2)).

`enabledPlugins` (V1) zeigte keine messbare Wirkung, weil `project`
Plugins bereits heraushält. V4a wurde mit diesem Schlüssel gemessen; ohne
ihn ist die Kombination nicht gemessen, daher bleibt er in Schritt 3. Nicht gemessen sind außerdem verschachtelte
`.claude/skills/` in Unterordnern des Projekts, die laut Doku erst beim
ersten Dateizugriff nachladen. Die Sperrliste deckt sie nicht ab, und das
Init-Gate (6) sieht sie nicht, weil sie erst nach dem init erscheinen.
Deshalb gibt es den Vorstart-Scan (7).
