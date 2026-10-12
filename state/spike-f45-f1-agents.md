# Spike F45 F-1 — Projekt-Agents und -Skills im Lauf (Allowlist, init.agents, init.plugins)

Stand 12.10.2026, Basis `main` `581269a`, Branch `f45/f1-faehigkeiten-im-lauf`. Reale CLI `2.1.296 (Claude Code)`,
Modell `claude-sonnet-5`. Tokens aus dem unveränderten `baueAufruf()`, Spawn über das unveränderte `starteProzess()`
mit `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1` und `npm_config_ignore_scripts=true` wie im Lauf. Nur für die Messung wird
`--settings` vor `-p` eingeschoben. Wegwerf-Skript außerhalb des Repos (Sitzungs-Scratchpad, nicht versioniert).

**Arbeitsverzeichnis** je Lauf: frische Kopie von `vorlagen/projekt-skelett` in `%TEMP%\spike-f45-f1-<Lauf>-XXXXXX` mit
eigenem `git init` + Commit (enthält `.claude/agents/{qa,code-reviewer,architecture-advisor}.md` und 7 Projekt-Skills,
1 Command). Nie haushaltsbuch2, nie dieses Repo. **Werkzeugsatz** = `startvorlagen/ai-workforce.json`
`werkzeugsaetze.schreibend` plus die je Lauf genannten Einträge. Rohströme `%TEMP%\spike-f45-f1\<Lauf>.ndjson`,
Zusammenfassung daneben (`<Lauf>.json`) — flüchtig, nicht committet. Kein Lauf hat den Arbeitsbaum berührt
(`git status --porcelain` leer).

Läufe: 4 von 6 (A war ungültig, siehe unten).

| Lauf | Zusatz zum Werkzeugsatz / Argv | Zweck |
|---|---|---|
| A (ungültig) | `Agent`, `Agent(qa)` | verworfen: das nackte `Agent` stand mit in `--allowedTools` — misst nicht S1 |
| A-2 | `Agent(qa)` → `--tools …,Agent`, `--allowedTools …,Agent(qa)` | S1, S2, S3 |
| B | wie A-2 + `--disallowedTools Agent(claude),Agent(Explore),Agent(general-purpose),Agent(Plan),Agent(statusline-setup),Agent(code-reviewer),Agent(architecture-advisor)` + `--settings {"enabledPlugins":{"cc-plugin-telemetry@builtin":false,"cc-plugin-plugin-authoring@builtin":false}}` | Fallback, S3-Gegenprobe |
| C | `Skill(ponytail)` → `--tools …,Skill`, `--allowedTools …,Skill(ponytail)`; `--settings {disableBundledSkills, skillOverrides off: design, doctor, alle Projekt-Skills/-Commands außer ponytail}`; `--disallowedTools Skill(<dieselben>)` | S4 |

Auftrag je Lauf schlicht (Lehre S6d): Subagenten `qa`, `general-purpose`, `Explore`, `code-reviewer` nacheinander im
Vordergrund (`run_in_background: false`) fragen bzw. Skills `ponytail`, `advisor-pass` laden; jeden Werkzeugfehler
zitieren. Belegt über `tool_result` (`is_error`, Text) und `permission_denials`, nicht über Modellurteil.

## Ergebnis

| Frage | Urteil | Beleg |
|---|---|---|
| **S1** `--tools …,Agent --allowedTools …,Agent(qa)`: qa aufrufbar, general-purpose/Explore verweigert? | **HÄLT NICHT** | A-2: alle vier Agent-Aufrufe liefen (`is_error: false`, Antworten `OK-QA`, `OK-GP`, `OK-EX`; code-reviewer antwortete im eigenen Format), `permission_denials: []`. Bestätigt F36 S6b (CLI 2.1.284) für 2.1.296: Einzelregeln `Agent(<name>)` in `--allowedTools` begrenzen im `-p`-Lauf nichts. |
| **S2** Steht `qa` aus `--setting-sources project` in `init.agents`? | **JA** | A-2/B/C: `init.agents` = `architecture-advisor, claude, code-reviewer, Explore, general-purpose, Plan, qa, statusline-setup` (5 eingebaut + 3 Projekt). `init.tools` meldet den Agent als **`Task`**, nicht `Agent`. |
| **S3** Ist `init.plugins` in einem normalen Ausführungslauf leer? | **NEIN** | A-2/C: `init.plugins` = `cc-plugin-telemetry@builtin`, `cc-plugin-plugin-authoring@builtin` (je `path: "builtin"`), obwohl `--setting-sources project` Nutzer-Plugins heraushält. Der zweite bringt den Skill `plugin-authoring` mit — er bleibt auch mit `disableBundledSkills` in `init.skills` (C: `init.skills` = `ponytail, plugin-authoring`). Gegenprobe B mit `enabledPlugins` beider auf `false`: `init.plugins` = `[]`, `plugin-authoring` fehlt in `init.skills`. |
| **S4** Projekt-Skill aufrufbar, wenn nicht in `skillOverrides` off und `Skill(<name>)` erlaubt? | **JA** | C: `Skill ponytail` → „Launching skill: ponytail“; `Skill advisor-pass` (off + Sperre) → „Skill advisor-pass is disabled for model invocation in skillOverrides settings“ (`is_error: true`). `permission_denials: []` (Sperre greift über skillOverrides vor der Regel). |
| **Fallback** `Agent` in `--tools` + `--disallowedTools Agent(<jeder nicht freigegebene Name>)` | **HÄLT** | B: `qa` → `OK-QA`; `general-purpose`, `Explore`, `code-reviewer` → „Agent type '<name>' has been denied by permission rule 'Agent(<name>)' from cliArg.“ (`is_error: true`), `permission_denials: []` — wie V4a (F36 S7): maßgeblich ist das Tool-Ergebnis. `init.agents` bleibt ungefiltert (alle 8). |

## Folgen für F-1

1. **Allowlist trägt nicht → Fallback.** `Agent` kommt in `--tools`, sobald ≥ 1 Projekt-Agent aktiv ist. Gesperrt wird
   per `--disallowedTools Agent(<name>)` jeder Name, der nicht aktiv ist: die gemessene Liste der eingebauten Agents
   (`claude`, `Explore`, `general-purpose`, `Plan`, `statusline-setup`, Referenzmessung A-2/B) und jeder nicht aktive
   Projekt-Agent (Dateiname und Frontmatter-`name`). `Agent(<aktiv>)` steht zusätzlich in `--allowedTools` — als
   Absichtserklärung, ohne Sperrwirkung (S1). Das Init-Gate bricht bei jedem Namen in `init.agents` außerhalb
   „aktiv ∪ gesperrt“ fail-closed ab (neuer eingebauter Agent nach einem CLI-Update, Agent aus einer unerwarteten Quelle).
   Begründung: S1 hält auch in 2.1.296 nicht; die Sperrliste ist in F36 S6d/S7 und hier (B) gegen echte Aufrufe kalibriert.
2. **`init.plugins` leer verlangt eine Abschaltung.** Ohne sie bräche jedes Init-Gate „init.plugins leer“ ab. Jeder Lauf
   mit Init-Gate bekommt deshalb `enabledPlugins` mit den gemessenen eingebauten Plugins auf `false` in `--settings`;
   ein neues eingebautes Plugin nach einem CLI-Update bricht über das Gate fail-closed ab (Grund nennt den Namen,
   Referenzliste nachmessen).
3. **Nebenbefund Ort-B (abgeleitet, nicht als eigener Ort-B-Lauf gemessen):** Mit CLI 2.1.296 steht `plugin-authoring`
   trotz `disableBundledSkills` in `init.skills` (C). Das Ort-B-Init-Gate (`init.skills ⊆ Ort-B-Namen`) bräche damit
   jeden Ort-B-Lauf ab. Punkt 2 behebt das mit.
4. **`init.tools` meldet `Task`.** Das Init-Gate muss `Task` (und `Agent`) zulassen, wenn Agents aktiv sind — sonst
   unverändert verbieten.
5. **Projekt-Skills** nach V4a: aktive Projekt-Skills aus `skillOverrides` off und `Skill(…)`-Sperre nehmen, `Skill` in
   `--tools`; nicht aktive bleiben gesperrt (S4).

Nicht gemessen: ob ein aktiver Subagent einen gesperrten Agent weiter aufrufen kann (Subagent erbt Allowlist und
Sperren laut F36 P2; der Subagent selbst hat kein `Agent`-Werkzeug, wenn seine `tools`-Zeile es nicht nennt).
