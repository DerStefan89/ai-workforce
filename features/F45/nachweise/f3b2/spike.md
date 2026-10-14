# F45 F-3b-2 — Spike: Plugins als Lauf-Kopie im Ausführungslauf

Stand 14.10.2026, Branch `f45/f3b2-plugins-im-lauf` (Basis `340d823`), CLI `2.1.299 (Claude Code)` (Startziel der
Startvorlage `ai-workforce`), Modell `claude-sonnet-5`. Plan `features/F45/plan-f3b.md` „Plan — F-3b-2“ Punkt 1 und
„F-3b-2-Plan (15), ergänzt“. Skript `spike.mjs` neben dieser Datei; Rohströme in `%TEMP%\spike-f45-f3b2\<Lauf>.ndjson`
(außerhalb des Repos, nur per sha256 genannt); Zählungen `zaehlung-<Lauf>.json`, Ordnervergleich `claude-ordner-*.json`.
Pfade geschwärzt (`<HOME>`, `<WURZEL>` = Wegwerf-Wurzel unter `%TEMP%`), keine Sitzungs-ids.

## 1 Aufbau

Argv aus dem unveränderten `baueAufruf()` (Werkzeugsatz `schreibend`, `--setting-sources project`, `--strict-mcp-config`,
`--disallowedTools … Bash(git:*)`), Sperren und `--settings` aus dem unveränderten `baueFaehigkeitenStart()` (ohne
Projekt-Einträge: `disableBundledSkills`, `skillOverrides` design/doctor off, eingebaute Plugins false,
`Write/Edit(**/.claude/**)`), Spawn über `starteProzess` mit `WORKFORCE_LAUF_UMGEBUNG`. Nur für die Messung ergänzt:
`--plugin-dir` je Lauf-Kopie vor `-p`, `enabledPlugins["<name>@inline"] = true`, `Skill(<plugin>:<skill>)` und
`Agent(<plugin>:<agent>)` in `erlaubte_werkzeuge`, `Agent(<eingebaut>)` gesperrt (wie `start.ts` mit aktiven Agents).
Arbeitsordner: Wegwerf-Repo ohne `.claude` und ohne Remote, drei lokale Merge-Zweige. `gh` = Attrappe vorn im `PATH`
(schreibt nur `gh-marke.txt`), `GH_TOKEN`/`GITHUB_TOKEN` leer, `GH_CONFIG_DIR` leer — keine externe Wirkung möglich.

Lauf-Kopien (außerhalb des Arbeitsordners):
- **A** Ordner `lauf-kopie-a`, Manifest-`name` `spike-f3b2` (Ordnername absichtlich anders): Skills `at-gh`
  (`allowed-tools: Bash(gh pr comment:*)`), `git-text` (Text: `git merge spike-zweig`, `git push`, ohne `allowed-tools`),
  `git-at` (`allowed-tools: Bash(git:*)`); Agents `tools-todo` (`tools: Read, Bash, TodoWrite`), `tools-gh`
  (`tools: Read, Bash(gh pr comment:*)`).
- **S** Ordner `superpowers`: nur `skills/systematic-debugging` + Manifest + `LICENSE` aus Stefans gepinnter Kopie
  (`plugin-kopien/superpowers@claude-plugins-official/86c91777…`, nur gelesen).
- **D** Ordner `lauf-kopie-d`, Manifest-`name` `spike-f3b2-daten`: Skill `data-probe` mit `${CLAUDE_PLUGIN_DATA}` im Text.

## 2 Läufe (Rohzählungen)

| Lauf | Kopien | Auftrag | Werkzeugaufrufe (✓ ok / ✗ Fehler) | `permission_denials` | gh-Marke | HEAD geändert | Δ `~/.claude/plugins` | sha256 (Zeilen) | ms |
|---|---|---|---|---|---|---|---|---|---|
| P1 | A+S | „Antworte nur mit OK.“ | – | 0 | 0 | nein | 0 | `b0ccf46a…` (4) | 4 511 |
| P0 | A+S | `git merge spike-zweig-kontrolle` direkt (Kontrolle) | Bash ✗ „Permission … denied“ | 1 | 0 | nein | 0 | `a82c7e54…` (10) | 7 096 |
| P2k | A+S | `gh pr comment …` direkt (Kontrolle) | Bash ✗ „This command requires approval“ | 1 | 0 | nein | 0 | `dbb2585a…` (10) | 6 617 |
| P2 | A+S | Skill `spike-f3b2:at-gh` | Skill ✓, Bash ✓ `ATTRAPPE: gh pr comment 1 --body spike-f3b2-skill` | 0 | 1 | nein | 0 | `e078f252…` (13) | 15 777 |
| P3a | A+S | Agent `spike-f3b2:tools-todo` | Agent ✓, im Subagenten Bash ✗ „requires approval“; Selbstauskunft „Read, Bash“, „TodoWrite fehlt“ | 1 | 0 | nein | 0 | `7ae30fc0…` (22) | 23 280 |
| P3b | A+S | Agent `spike-f3b2:tools-gh` | Agent ✓, im Subagenten Bash ✗ „requires approval“; Selbstauskunft „Read, Bash“ | 1 | 0 | nein | 0 | `336fdf6f…` (33) | 39 427 |
| P4a | A+S | Skill `spike-f3b2:git-text` | Skill ✓, Bash ✗ `git merge spike-zweig` denied, Bash ✗ `git push` denied | 2 | 0 | nein | 0 | `7c7ae278…` (20) | 12 959 |
| P4b | A+S | Skill `spike-f3b2:git-at` | Skill ✓, Bash ✗ `git merge spike-zweig-zwei` denied | 1 | 0 | nein | 0 | `3a8294fa…` (15) | 13 219 |
| P6a | D | Skill `spike-f3b2-daten:data-probe` | Skill ✓; Antwort `<HOME>/.claude/plugins/data/spike-f3b2-daten-inline` | 0 | 0 | nein | **2** (`~ data`, `+ data/spike-f3b2-daten-inline`) | `7e64f4bb…` (8) | 5 567 |
| P6b | D | wie P6a + `CLAUDE_CODE_PLUGIN_CACHE_DIR=<WURZEL>/plugin-wurzel-umgelenkt` | Skill ✓; Antwort `<WURZEL>/plugin-wurzel-umgelenkt/data/spike-f3b2-daten-inline` | 0 | 0 | nein | 0 (umgelenkt: `+ data`, `+ data/spike-f3b2-daten-inline`, `+ installed_plugins.json` = `{"version":2,"plugins":{}}`) | `85cc4e2b…` (8) | 7 296 |

Alle Läufe Exit 0, `init.apiKeySource` `none` (Anmeldung wie immer), `init.mcp_servers` `[]`.

## 3 Ergebnisse

**S3 — erweitert `allowed-tools` im Skill-Frontmatter den Werkzeugsatz? JA.** Gleicher Befehl, gleicher Werkzeugsatz:
direkt verweigert (P2k), über den Skill ausgeführt (P2, Attrappe lief). Wie der Command in F-3a (S1). Das Init-Gate sieht
das nicht (init zeigt nur Namen) — die Sperre muss in der Kopie liegen.
**S3 — erweitert `tools` im Agent-Frontmatter den Werkzeugsatz? NEIN.** `tools` begrenzt nur: ein Werkzeug außerhalb von
`--tools` fehlt im Subagenten (P3a: `TodoWrite` fehlt), eine Regel in `tools` gibt keine Freigabe (P3b:
`Bash(gh pr comment:*)` → Werkzeug Bash da, Befehl „requires approval“). Der Subagent erbt die Regeln des Laufs.

**S4 — Format.** `init.plugins` = `[{ name, path, source: "<name>@inline", version }]`, je `--plugin-dir` ein Eintrag.
Präfix = Manifest-`name`, nicht der Ordnername (`lauf-kopie-a` → `spike-f3b2:`). `init.skills` = genau die vier
Plugin-Skills mit Präfix (sortiert, keine anderen); `init.agents` = 5 eingebaute + `spike-f3b2:tools-gh`,
`spike-f3b2:tools-todo`; `init.slash_commands` beginnt mit denselben vier Plugin-Skills (Skill auch als Command) vor den
eingebauten; `init.tools` mit `Agent` in `--tools` zusätzlich `Task` (8), ohne (P6) 7. `Skill(<plugin>:<skill>)` und
`Agent(<plugin>:<agent>)` in `--allowedTools` funktionieren (P2–P4 Skill gestartet, P3a/b Agent gestartet, je ohne
Verweigerung des Skill-/Agent-Aufrufs).

**S5 — `enabledPlugins` nur für die Lauf-Kopie, eingebaute false.** `init.plugins` = genau die übergebenen Lauf-Kopien
(P1: `spike-f3b2@inline`, `superpowers@inline`; P6: nur `spike-f3b2-daten@inline`); keine eingebauten, keins von Stefans
installierten Plugins (auch nicht `superpowers@claude-plugins-official` trotz gleichem Manifest-`name`).

**S6 — Datenordner `~/.claude/plugins/data/<name>-inline`.** Entsteht **nur mit Auslöser**: ohne Auslöser keine
Abweichung unter `~/.claude/plugins` (P1, P0, P2k, P2–P4b: je 0). Auslöser laut CLI-Code (Funktion, die den Ordner per
`mkdirSync` anlegt): Hooks, MCP-Server, Monitore und das Einsetzen von `${CLAUDE_PLUGIN_DATA}` in einen Text — die
Lauf-Kopie hat weder Hooks noch MCP, bleibt also nur der Text. Gemessen: `${CLAUDE_PLUGIN_DATA}` in einem Skill legt den
Ordner beim Aufruf an (P6a). **Umlenkbar:** `CLAUDE_CODE_PLUGIN_CACHE_DIR` ersetzt die ganze Plugin-Wurzel
(`~/.claude/plugins`) — der Ordner entsteht dann dort (P6b), `~/.claude/plugins` bleibt unverändert, `init` in allen
Feldern gleich P6a, Anmeldung unberührt. Nebenwirkung: die CLI legt in der umgelenkten Wurzel `installed_plugins.json`
(leer) an. Nicht gemessen: ein Projekt mit `enabledPlugins` eines Marktplatz-Plugins in seinen Projekt-Settings (mit
leerer Wurzel könnte die CLI versuchen nachzuinstallieren). `CLAUDE_CONFIG_DIR` ist nicht nötig und wurde nicht
verwendet (verschöbe Anmeldung und Sitzungsdaten).

**git — `Bash(git:*)` gegen Plugin-Skills.** Hält in beiden Fällen: Skill-Text mit `git merge`/`git push` (P4a, beide
„denied“) und Skill mit `allowed-tools: Bash(git:*)` (P4b, „denied“) — die Sperre in `--disallowedTools` geht vor die
Freigabe aus dem Frontmatter. HEAD in keinem Lauf geändert. Kontrolle P0 identisch verweigert.

**Unter `~/.claude` entstanden (nicht gelöscht):** `plugins/data/spike-f3b2-daten-inline` (leer, aus P6a — Messung des
Auslösers); je Spike-Aufruf ein Ordner unter `projects/` für das Wegwerf-Repo (2) und ein Ordner unter `session-env/` (1)
— wie bei jedem Lauf. Weiterhin vorhanden aus F-3a: `plugins/data/spike-plugin-inline` (leer).

## 4 Folgen für den Plan F-3b-2

1. Skill-`allowed-tools` bleibt ausgeschlossen (Positivliste aus F-3b-1 nicht lockern). Die Lauf-Kopie entsteht nur aus
   der gepinnten Kopie und wird vor dem Lauf mit `vergleicheInhalt` gegen den Bericht geprüft — das ist die einzige Sperre,
   init zeigt `allowed-tools` nicht.
2. Agent-`tools` ist unkritisch (begrenzt nur). E-F3b-6 (Pflicht) und die Prüfung gegen den Werkzeugsatz (N3) bleiben als
   Vorsicht; kein Lockern nötig. Mit zugeordnetem Agent: `Agent` in `--tools`, `Agent(<plugin>:<agent>)` erlaubt,
   eingebaute per `Agent(<n>)` gesperrt; Init-Gate-Zweig `agents` mit Präfixnamen, `Task` in `init.tools` zulässig.
3. `Bash(git:*)` trägt auch gegen Plugin-Skills — keine Zusatzsperre; Risiko-Fakt bleibt Anzeige.
4. Init-Gate: `init.plugins[].source` = Soll (`<name>@inline` je Lauf-Kopie), `init.skills`/`init.agents` mit Präfix ⊆
   Zuordnung (mehr = Abbruch), **Plugin-Skills zusätzlich in `init.slash_commands` zulassen** (sonst Verstoß gegen die
   Slash-Command-Referenzmenge F-831). Präfix kommt aus dem Manifest der Kopie → Ordnername der Lauf-Kopie frei (z. B.
   Hash); Manifest-`name` muss über alle zugeordneten Plugins eindeutig sein (Plan 15).
5. `enabledPlugins["<name>@inline"] = true` je Lauf-Kopie, eingebaute false — wie geplant.
6. Datenordner: ohne Hooks/MCP entsteht er nur über `${CLAUDE_PLUGIN_DATA}` im Text. Vermeidbar (Entscheidung Stefan,
   siehe Bericht): (A) Kopie lehnt Dateien mit `${CLAUDE_PLUGIN_DATA}` ab (fail-closed, „nicht übernommen“ mit Grund) und
   der Lauf vergleicht `~/.claude/plugins` vorher/nachher (Abweichung = Befund in der Laufakte); (B) zusätzlich
   `CLAUDE_CODE_PLUGIN_CACHE_DIR` je Lauf auf einen Lauf-Ordner (Nebenwirkung `installed_plugins.json`, Marktplatz-Fall
   ungemessen). Die gepinnte superpowers-Kopie enthält `${CLAUDE_PLUGIN_DATA}` nicht.
