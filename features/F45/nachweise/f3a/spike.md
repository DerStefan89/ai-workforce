# F45 F-3a — Spike und Nachweise: Plugins aus Stefans Claude Code

Stand 14.10.2026, Branch `f45/f3a-plugins-bestand` (Basis `bcffea7`), CLI `2.1.299 (Claude Code)`, Modell
`claude-sonnet-5` (Startvorlage `ai-workforce`). Plan `features/F45/plan-f3a.md` (v2, Delta-Advisor: freigegeben mit
Auflagen). Skripte neben dieser Datei; Rohströme in `%TEMP%\spike-f45-f3a\<Lauf>.ndjson` (gitignoriert/außerhalb des
Repos, nur per sha256 genannt). Persönliche Pfade und IDs geschwärzt (<HOME>, <KONTO-ID>).

## 1 Quelle des Bestands (H1, Entscheidung Stefan E-F3a-1 = CLI-Liste)

- `claude plugin list --json` liefert je installiertem Plugin `id`, `version`, `scope`, `enabled`, `installPath`, bei
  `scope local` zusätzlich `projectPath`, `projectEnabled`. `claude plugin details` hat kein JSON (nur Gegenprobe).
- Benutzer-Settings und `~/.claude.json` tragen keinen Aktiv-Stand der synced-Plugins → ohne CLI nicht bestimmbar.
- **Schreibwirkung** (`h1-messung.mjs`, lstat aller 8 130 Einträge unter `~/.claude` plus `~/.claude.json`):
  Kontrolle (`node -e ""`) 0 Abweichungen (`h1-kontrolle.json`); `plugin list` (1 437 ms) 3 Abweichungen — nur die
  mtime der Ordner `.in_use` in den drei synced-Plugins, Eintragszahl gleich (Marke angelegt und wieder gelöscht)
  (`h1-plugin-list.json`). Als Nebenwirkung angenommen (E-F3a-1); einmal gemessen.
- `~/.claude.json` führt Nutzungszähler u. a. für `cc-plugin-diff@builtin` (drittes eingebautes Plugin, nicht in der
  Referenzliste). Im `-p`-Lauf erscheint es nicht (S0a/S0b).

## 2 Stefans Plugins (Leser über den echten Handler, `gegenprobe.json`, 1 395 ms nach der Korrekturrunde)

| Plugin | Version / Commit | aktiv | Bestandteile | Risiken (Fakten) |
|---|---|---|---|---|
| `superpowers@claude-plugins-official` | 6.2.0 / `44c9b2d6…` | nein (scope local, Projekt `superpowers-test`, dort auch nein) | 14 Skills, 1 Hook | 1 `hook_befehl`: SessionStart (`startup\|clear\|compact`) → `"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.cmd" session-start`; Lizenz MIT |
| `gitkraken@synced` | 1.0.0 / – | ja | 1 MCP (`plugin.json` → `./mcp.json`) | 1 `mcp_ungepinnt`: `npx -y @gitkraken/gk mcp --plugin --host=claude`; Lizenzdatei ja |
| `cowork-plugin-management@synced` | 0.2.2 / – | ja | 2 Skills | keine Treffer der Regeln; Lizenzdatei ja |
| `design@synced` | 1.2.0 / – | ja | 7 Skills, 9 MCP (http) | 9 `mcp_entfernt` (slack, figma, linear, asana, atlassian, notion, intercom; google calendar und gmail mit leerer URL); keine Lizenzdatei |

Eingebaut (Referenzliste CLI 2.1.296): `cc-plugin-telemetry@builtin`, `cc-plugin-plugin-authoring@builtin`.
**Gegenprobe** gegen `claude plugin details` (Skills = Skills + Commands des Lesers, Agents, Hooks, MCP, LSP): 4 von 4
gleich. Abweichung unter `~/.claude/plugins` während des Abrufs: nur die drei `.in_use`-Ordner (CLI, siehe §1).

## 3 Spike: Plugin im Workforce-Lauf (`spike.mjs`)

Argv aus dem unveränderten `baueAufruf()` (Werkzeugsatz `schreibend`, `--setting-sources project`,
`--strict-mcp-config`, `--disallowedTools … Bash(git:*)`), `--settings` wie ein Lauf mit Fähigkeiten
(`disableBundledSkills`, `skillOverrides` design/doctor off, `enabledPlugins` der Referenzliste false), Spawn über
`starteProzess` mit `WORKFORCE_LAUF_UMGEBUNG`; nur für die Messung `--plugin-dir` vor `-p`. Arbeitsordner: Wegwerf-Repo
ohne `.claude` und ohne Remote. Test-Plugin: Skill, Agent, Command (`allowed-tools: Bash(gh pr comment:*)`), Hooks
SessionStart/UserPromptSubmit/PreToolUse(Bash) → je eine Zeile in `hook-marke.txt`. `gh` = Attrappe vorn im `PATH`
(schreibt nur `gh-marke.txt`), `GH_TOKEN`/`GITHUB_TOKEN` leer, `GH_CONFIG_DIR` leer — keine externe Wirkung möglich.

| Lauf | Zusatz | `init.plugins` | Hook-Marken | `gh`-tool_use / Ergebnis | permission_denials | sha256 Rohstrom (Zeilen) |
|---|---|---|---|---|---|---|
| S0a | – | `[]` | 0 | – | 0 | `20558f9d…` (4) |
| S0b | ohne `--settings` | `cc-plugin-telemetry@builtin`, `cc-plugin-plugin-authoring@builtin` | 0 | – | 0 | `9ad4ca0d…` (4) |
| S1k | `--plugin-dir`, Auftrag ohne Command | `spike-plugin@inline` | 3 | 1 / „This command requires approval“, Attrappe nicht gelaufen | 1 | `5cc7a9cb…` (12) |
| S1 | `--plugin-dir`, Prompt `/spike-plugin:spike-cmd` | `spike-plugin@inline` | 3 | 1 / `ATTRAPPE: gh pr comment 1 --body spike-f3a`, Attrappe gelaufen | 0 | `38ec4775…` (20) |
| S2 | wie S1 + `enabledPlugins["spike-plugin@inline"] = false` | `[]` | 0 | 0 / „command isn't installed“ | 0 | `bb29adb0…` (4) |

S1k: ein erster Versuch endete ohne tool_use (Modell fragte nach) und war damit „nicht belegt“; der wiederholte Lauf
nennt die Testumgebung ausdrücklich. Volle Hashes und Rohdaten in `zaehlung-<Lauf>.json`.

**(a) Inhalt und Format.** `init.plugins` = `[{ name, path, source: "spike-plugin@inline" }]`;
`init.skills` = `["spike-plugin:spike-skill"]`; `init.agents` = die 5 eingebauten + `spike-plugin:spike-agent`;
`init.slash_commands` +2: `spike-plugin:spike-cmd`, `spike-plugin:spike-skill` (Skill auch als Command). Namen tragen das
Präfix `<plugin>:`. `init.tools` unverändert (6). Ohne `--settings` bringt nur `cc-plugin-plugin-authoring@builtin` einen
Skill (`plugin-authoring`); `design` steht ohne jedes Plugin in `init.skills` (eingebauter Skill, nicht `design@synced`).
Stefans synced-Plugins erscheinen unter `--setting-sources project` in keinem Lauf.
**(b) Hooks laufen.** SessionStart, UserPromptSubmit und PreToolUse(Bash) des Plugins liefen in S1 und S1k (je 1 Marke),
auch beim verweigerten Bash-Aufruf (PreToolUse vor der Rechteprüfung).
**(c) allowed-tools erweitert den Werkzeugsatz: JA.** Gleicher Befehl, gleicher Werkzeugsatz: ohne Command verweigert
(S1k, `permission_denials` 1), über den Command ausgeführt (S1, `is_error: false`, Attrappe lief). Ein Plugin-Command
kann also Rechte außerhalb des Werkzeugsatzes des Laufs einräumen — `Bash(git:*)` bleibt über `--disallowedTools`
gesperrt (nicht gemessen für Commands, offen für F-3b).
**(d) `enabledPlugins:false` wirkt auf ein `--plugin-dir`-Plugin: JA.** S2: `init.plugins` = `[]`, keine Skills/Agents/
Commands des Plugins, kein Hook lief.

**Schreibwirkung des Spikes unter `~/.claude`** (E-F3a-3: wie jeder Lauf): `~/.claude/plugins/**` vor/nach je Lauf —
der erste Lauf mit `--plugin-dir` (erster S1k-Versuch, 08:50; seine Zählung wurde vom wiederholten S1k überschrieben,
Konsolenausgabe: `+ …\plugins\data\spike-plugin-inline`, `~ …\plugins\data`) legte den leeren Ordner
`~/.claude/plugins/data/spike-plugin-inline` an (Datenordner des Plugins); er ist leer und nicht entfernt (Löschen unter
`~/.claude` nur durch Stefan). Alle späteren Läufe (S1k, S1, S2 in den Zählungen): keine Abweichung in `plugins/**`.
Sitzungsdaten unter `projects/` wie jeder Lauf (nicht gemessen).

## 4 Folgen für F-3b (Schätzung)

1. Ein Plugin lädt im Lauf alles auf einmal (Skills, Agents, Commands, Hooks) — Einzelfreigabe heißt: gepinnte Kopie mit
   nur den freigegebenen Bestandteilen bauen und diese per `--plugin-dir` laden (nicht Stefans Ordner).
2. Hooks laufen ohne weitere Abfrage → nur nach Freigabe je Hook-Hash in die Kopie.
3. Commands (und Skills) mit `allowed-tools` erweitern den Werkzeugsatz → in der Kopie sperren oder `allowed-tools`
   entfernen (dann Hash der Kopie ≠ Original, Prüfbericht nennt das); Gate: `init.slash_commands` = Soll.
4. `enabledPlugins:false` wirkt auch auf `--plugin-dir` → Abschalten je Plugin trägt; Init-Gate `init.plugins` = Soll
   (`<name>@inline`), Namen mit Präfix `<plugin>:` in Skills/Agents/Commands-Gates aufnehmen.
5. Plugin-MCP nur gepinnt (gitkraken heute ungepinnt, design entfernte Server → nach E-F36-4 gesperrt).
6. Datenordner `~/.claude/plugins/data/<name>-inline` entsteht je Plugin — Laufakte und Vorher/Nachher-Hash beachten.

Schätzung F-3b: ≈ 1,0–1,25 AT (Kopie mit Inhalts-Hash und Freigabe je Plugin/Hook ≈ 0,4; Start mit `--plugin-dir`,
Init-Gate-Soll inkl. Präfixnamen und Command-Sperre ≈ 0,3; Leitstand-Freigabe ≈ 0,2–0,3; echter Lauf ≈ 0,2), Advisor-Pass
vorab.
