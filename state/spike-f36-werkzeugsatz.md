# Spike F36 WS-0 — Probelauf Werkzeugsatz: Skill, Agent, lokales MCP

Stand 28.09.2026, Basis `main` `03aafbc`. Skript:
`scripts/spike-f36-werkzeugsatz.mjs` (Wegwerf). Reale Claude-CLI
(`C:\Program Files\claude\claude.exe`, `2.1.283`, `claude-sonnet-5`),
Tokens aus dem unveränderten `baueAufruf()`, Spawn über das unveränderte
`starteProzess()` (`prozessstart.ts`, Prompt über stdin,
`ergebnisZeileBeendet`). Je Probe variieren nur
`werkzeugsatz.erlaubte_werkzeuge` und `mcpConfig`; alles andere wie ein
`ausfuehrung`-Lauf (`--setting-sources project`, `--strict-mcp-config`,
`--disallowedTools Bash(git:*)` über `BASH_SPERRREGELN`).

**Basis-Werkzeugsatz** = `startvorlagen/ai-workforce.json`
`werkzeugsaetze.schreibend` (E-F754): `Read, Grep, Glob, Write, Edit,
Bash(npm install), Bash(npm ci), Bash(npm run check:*), Bash(npm run
lint:*), Bash(npm run typecheck:*), Bash(npm run test:*), Bash(npm run
build:*)`.

**Arbeitsverzeichnis** je Probe: frische Kopie von `vorlagen/projekt-skelett`
in `%TEMP%\spike-f36-<probe>-XXXXXX` mit eigenem `git init` + einem Commit
(trägt `.claude/skills/*` inkl. `ponytail` und `.claude/agents/qa.md` usw.).
Nie haushaltsbuch2, nie dieses Repo. Rohströme:
`%TEMP%\spike-f36\<probe>.ndjson`, Zusammenfassungen
`%TEMP%\spike-f36\zusammenfassung-*.json` (flüchtig, nicht versioniert).

## Gesamturteil

| Frage | Urteil | Beleg |
|---|---|---|
| P1 Skill: ist ein Projekt-Skill mit `Skill` im Werkzeugsatz aufrufbar? | **HÄLT** | `Skill` erscheint in `init.tools`; `tool_use` `Skill` mit `input: {"skill":"ponytail"}` → „Launching skill: ponytail“; Antwort nennt Regel 1 wörtlich; 0 Denials |
| P2 Agent: ist ein Subagent aufrufbar? | **HÄLT** | `Agent` wie `Task` in `--tools` angenommen; `init.tools` zeigt in beiden Fällen `Task`; der Aufruf heißt `Agent`, Feld `subagent_type` |
| P2 Agent: erbt der Subagent Allowlist und git-Sperre? | **HÄLT** (a, b) · **UNKLAR** (c) | `general-purpose`-Subagent: `git log -1` → „Permission … has been denied“, `npm view react version` → „This command requires approval“, beide in `permission_denials` des Elternlaufs. c) Schreiben außerhalb: 3× vom Modell selbst abgelehnt, kein Write-Aufruf → keine Werkzeug-Evidenz |
| P3 MCP: welche Variante gibt Werkzeuge frei? | **HÄLT** mit (ii) und (iii) | (i) Server verbunden, Aufruf verweigert; (ii) Wildcard gibt alle frei; (iii) nur die genannten Namen |
| P3 MCP: lässt `WERKZEUG_EINTRAG_MUSTER` die nötige Form zu? | **HÄLT** für (iii), **HÄLT NICHT** für (ii) | `mcp__playwright__*` verstößt gegen `/^[A-Za-z][A-Za-z0-9_-]*(\([^()]+\))?$/`; Einzelnamen `mcp__playwright__browser_navigate` bestehen |
| P4 Gegenprobe: ohne Zusätze kein Skill/Agent/MCP | **HÄLT** | `init.tools` = `Bash, Edit, GetTask, Glob, Grep, Read, Write`, `mcp_servers: []`; Modell meldet alle drei als nicht verfügbar, 0 Aufrufe |

**Kein Blocker für Agent aus P2:** Der Subagent erbt die Sperren des
Elternlaufs nachweislich für Bash (git-Sperre und Allowlist). Offen ist nur
c); dort fehlt die Messung, nicht die Sperre.

## Je Probe

Allen Proben gemeinsam: `init.agents` = `architecture-advisor, claude,
claude-code-guide, code-reviewer, Explore, general-purpose, Plan, qa,
statusline-setup`; `init.skills` = 28 Einträge — die 7 Projekt-Skills
(`advisor-pass, git-flow, handoff-vertrag, ponytail, repo-audit,
spec-schreiben, werkzeug-auswahl`) plus 21 Nutzer-/Plugin-/eingebaute Skills
(`deep-research, design, slides, design-sync, dataviz, artifact-diagramming,
artifact-capabilities, update-config, verify, debug, code-review, simplify,
batch, fewer-permission-prompts, doctor, loop, schedule, claude-api,
workflow-authoring, run, run-skill-generator`) trotz `--setting-sources
project` (→ F-770). `beendigungsart` überall `null` (regulär), `stderr` leer.

### P4 Gegenprobe — `P4_gegenprobe.ndjson`
- `--tools Read,Grep,Glob,Write,Edit,Bash`
- `init.tools`: `Bash, Edit, GetTask, Glob, Grep, Read, Write` · `mcp_servers: []`
- Aufrufe: keine · `permission_denials: []` · 1 Turn
- Antwort: „Keines der drei angefragten Werkzeuge ist in dieser Session tatsächlich aufrufbar“.
- Deckt sich mit den init-Zeilen der realen haushaltsbuch2-Läufe (F-769).

### P1 Skill — `P1_skill.ndjson`
- Werkzeugsatz: Basis + `Skill` (Muster-konform)
- `init.tools`: `Bash, Edit, GetTask, Glob, Grep, Read, Skill, Write` · `mcp_servers: []`
- Aufruf: `Skill` · `input: {"skill": "ponytail"}` (Feldname **`skill`**) → „Launching skill: ponytail“
- `permission_denials: []` · 3 Turns · Antwort: „Does this need to exist at all? Speculative need = skip it, say so in one line. (YAGNI)“

### P2 Agent — `P2_agent_qa.ndjson`, `P2_task_qa.ndjson`, `P2_agent_gp.ndjson`, `P2c_*.ndjson`
- Werkzeugsatz: Basis + `Agent` bzw. Basis + `Task` — beide Muster-konform,
  beide ergeben `--tools …,Agent` bzw. `…,Task` und **dasselbe**
  `init.tools`: `Task, Bash, Edit, GetTask, Glob, Grep, Read, Write`.
- Aufruf in allen Varianten: Name **`Agent`**, `input` mit
  `description`, **`subagent_type`**, `prompt`, optional `run_in_background`.
- Subagent-Zeilen tragen `parent_tool_use_id` = ID des `Agent`-Aufrufs;
  ihre Denials erscheinen in `permission_denials` des Elternlaufs.
- **Hintergrund-Falle:** erster Durchgang ohne Vorgabe → das Modell startete
  `qa` asynchron („Async agent launched successfully“); der `-p`-Lauf endete
  mit „läuft im Hintergrund“, der Bericht des Subagenten kam nie an. Erst mit
  `run_in_background: false` im Auftrag lief er im Vordergrund.
- `qa` (Vordergrund, beide Varianten): meldet a–c als „nicht ausführbar, kein
  Shell-/Write-Werkzeug“ — `qa.md` trägt `tools: Read, Grep, Glob`. Der
  Subagent bekommt also genau seine Frontmatter-Werkzeuge; zur Erbfrage sagt
  das nichts.
- `general-purpose` (Vordergrund, erbt ohne `tools:`-Zeile):
  - a) `Bash git log -1` → „Permission to use Bash with command git log -1 has been denied.“ (auch `git rev-parse` und ein `cd … && git …` verweigert)
  - b) `Bash npm view react version` → „This command requires approval“
  - `Bash pwd` → erlaubt (Nur-Lese-Befehl, CLI-seitig), Ausgabe `/tmp/spike-f36-P2_agent_gp-…`
  - c) kein Write-Aufruf: Subagent lehnte ab mit Verweis auf die
    Skelett-CLAUDE.md-Regel „ein Zielverzeichnis pro Auftrag“. Nachversuch
    `P2c_agent_gp` und Direktversuch ohne Subagent `P2c_direkt`: ebenfalls
    vom Modell verweigert, kein Werkzeugaufruf. `aussen-geschrieben.txt`
    existierte in keinem Lauf. → **UNKLAR**, kein weiterer Workaround.
- `permission_denials` (gp): 4–5 Einträge `Bash` (git/npm view).

### P3 MCP — `P3i_mcp_nur_config.ndjson`, `P3ii_mcp_wildcard.ndjson`, `P3iii_mcp_namen.ndjson`
mcpConfig: `{"mcpServers":{"playwright":{"command":"cmd","args":["/c","npx","-y","@playwright/mcp@latest","--headless"]}}}` — npx war nicht blockiert, Server in allen drei Varianten `{"name":"playwright","status":"connected","source":"dynamic"}`.

| Variante | `--tools` | `init.tools` | Aufrufe | Denials | Muster |
|---|---|---|---|---|---|
| (i) nur `--mcp-config` | Basis | Basis + **alle 25** `mcp__playwright__browser_*` | `browser_navigate` → „… you haven't granted it yet“ | `browser_navigate` | ok |
| (ii) + `mcp__playwright__*` | Basis + `mcp__playwright__*` | wie (i) | `browser_navigate` ok, `browser_evaluate` → `""` | keine | **Verstoß** |
| (iii) + `browser_navigate`, `browser_snapshot` | Basis + die zwei Namen | wie (i) | `browser_navigate` ok, `browser_evaluate` verweigert | `browser_evaluate` | ok |

Befunde:
- **`--tools` begrenzt MCP-Werkzeuge nicht.** Alle 25 Playwright-Werkzeuge
  stehen in jeder Variante im Angebotssatz; nur `--allowedTools` entscheidet
  über den Aufruf (bestätigt E-187 und §9.1 für den Grün-Fall mit Server).
- (ii) ist eine Pauschalfreigabe inklusive `browser_run_code_unsafe`,
  `browser_file_upload`, `browser_evaluate`.
- (iii) ist die einzige Form, die das heutige Muster zulässt, und die
  einzige, die einzelne Werkzeuge gezielt freigibt. WS-2 braucht dafür die
  vollständige Werkzeugliste je Server im Katalog.
- **Nebenwirkung:** Playwright legt `.playwright-mcp/` (Snapshots) im
  Arbeitsverzeichnis des Laufs an → landet in `git status` des Projekts.
- Titel von `about:blank`: leer (`""`), korrekt.

## Folgerungen für WS-1/WS-2 (nur feststellen)

1. Skill: `Skill` in den Werkzeugsatz der Ausführung, sonst nichts nötig.
2. Agent: `Agent` in `--tools` genügt (`Task` gleichwertig). Die Ausführungs-
   Instruktion muss `run_in_background: false` verlangen, sonst geht der
   Bericht im `-p`-Lauf verloren. Subagenten ohne `tools:`-Zeile erben die
   Bash-Sperren; Katalog-Agents sollten trotzdem eine `tools:`-Zeile tragen.
3. MCP: pro freigegebenem Server gezielt Einzelnamen (iii) aus dem Katalog
   in den Werkzeugsatz; Wildcard erst nach bewusster Musteränderung.
   `.playwright-mcp/` (bzw. das Artefaktverzeichnis eines Servers) gehört in
   die Nachlauf-Prüfung.
4. c) (Schreiben außerhalb des Arbeitsverzeichnisses durch einen Subagenten)
   braucht einen Messweg ohne Modellurteil, z. B. einen Hook-Testfall — offen.
