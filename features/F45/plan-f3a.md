# F45 F-3a — Plan (Plugins aus Stefans Claude Code: Bestand lesen, zeigen, Spike)

Branch `f45/f3a-plugins-bestand`, Basis `origin/main` `bcffea7` (B2a-3b, #332). Grundlage: Auftrag F45 F-3a (14.10.2026),
Entscheidung Stefan 13.10.2026 („dieselben Plugins in der Workforce, die Claude ganz normal hat“ — Quelle sind Stefans in
Claude Code installierte/aktivierte Plugins, nicht die Sammlung), Fixpaket-Zeile F-3, Findings F-910, F-1051, F-1052,
F-1072. Schnitt (Challenger): F-3a = lesen, zeigen, Spike — **kein Lauf ändert sich, `init.plugins` bleibt `[]`**;
F-3b = Plugins im Lauf (eigener Auftrag). Bau erst nach freigegebenem Plan.

## Plan v1

### Befunde vorab (gemessen 14.10.2026, CLI `2.1.299 (Claude Code)`, nur lesend)
- **Maschinenlesbare Liste vorhanden:** `claude plugin list --json` (Hilfe: „List installed plugins“, `--json` „Output as
  JSON“) liefert ein Array je installiertem Plugin: `id` (`<name>@<marketplace>`), `version`, `scope`
  (`local`|`synced`|…), `enabled`, `installPath`, bei `local` zusätzlich `installedAt`, `lastUpdated`, `projectPath`,
  `projectEnabled`. Exit 0, ≈ 1,5 s. **Schreibt nichts unter `~/.claude`:** Momentaufnahme (mtime + Größe aller
  4 976 Dateien unter `~/.claude` ohne `projects/`, `todos/`, `shell-snapshots/`) vor/nach dem Aufruf identisch.
- `claude plugin details <id>` liefert das Bestandteil-Inventar nur als Text (kein `--json`) → **nicht** als Quelle,
  nur als Gegenprobe im Nachweis (Zählungen).
- **Stefans Bestand (CLI-Liste):** `superpowers@claude-plugins-official` 6.2.0, `scope local`, `enabled false`
  (nur Projekt `<HOME>\superpowers-test`, dort `projectEnabled false`); `gitkraken@synced` 1.0.0,
  `design@synced` 1.2.0, `cowork-plugin-management@synced` 0.2.2 — alle drei `enabled true`, `scope synced` (aus dem
  claude.ai-Konto synchronisiert, Ordner `~/.claude/plugins/synced/<konto>/<name>`).
- **Benutzer-Settings tragen `enabledPlugins` nicht:** `~/.claude/settings.json` hat keinen Schlüssel `enabledPlugins`,
  trotzdem sind die drei synced-Plugins aktiv. Ein Leser aus Settings + Ordnern müsste „aktiv“ für synced-Plugins
  raten → die CLI-Liste ist die Quelle für Liste und Aktivierung; die Ordner sind die Quelle der Bestandteile.
- **Commit-Pin:** nur `~/.claude/plugins/installed_plugins.json` (v2) trägt `gitCommitSha` (superpowers
  `44c9b2d6…`); synced-Plugins haben dort keinen Eintrag (Version im Konto-Manifest `manifest.json`, z. B. „0040“).
- **Ordner-Layout (gelesen):** `.claude-plugin/plugin.json` (Name, Version, Lizenz-Feld, optional `mcpServers` als
  Pfad, z. B. gitkraken `"./mcp.json"`), `skills/<n>/SKILL.md`, `agents/*.md`, `commands/*.md` (Frontmatter
  `allowed-tools`, z. B. code-review: `Bash(gh pr comment:*)`), `hooks/hooks.json` (`hooks.<Ereignis>[].hooks[]`,
  `type: command`, `command`), `.mcp.json` (`mcpServers.<name>` mit `command/args` oder `type: http, url`),
  LSP über `.lsp.json` bzw. `plugin.json lspServers`. Flüchtig und **nicht** Inhalt: `.in_use/<pid>` (von jeder
  laufenden CLI-Sitzung geschrieben, Zeitstempel heute 08:18) und `.git/` (Cache-Klon von superpowers mit
  `FETCH_HEAD`).
- **Eingebaute Plugins** stehen nicht in `plugin list`. Bekannt ist nur die gemessene Referenzliste
  `src/faehigkeiten/eingebaut-referenz.json` (CLI 2.1.296: `cc-plugin-telemetry@builtin`,
  `cc-plugin-plugin-authoring@builtin`). Unter `~/.claude/plugins/store/` liegt heute zusätzlich
  `cc-plugin-diff_builtin-….json` → möglicherweise ein drittes eingebautes Plugin in 2.1.299. Klärt der Spike (Lauf S0);
  ist es so, bräche das Init-Gate jeden Lauf mit Fähigkeiten fail-closed ab („init.plugins nicht leer“) — dann
  **Blocker an Stefan**, kein Fix in F-3a (Startargumente/Init-Gate sind NICHT ÄNDERN).
- Server: `starteWorkflowSchritt(` steht genau 6× in `scripts/leitstand-server.mjs`. Der Leitstand kennt das
  CLI-Programm aus der Startvorlage (`werkzeugStartziel[0]`, absoluter Pfad, `pruefeStartziel`).

### A Leser `src/claude-plugins/` (neu; rein + dünne I/O-Hülle)
- `types.ts`: `PluginBestand { status: 'ok', quelle, plugins: PluginEintrag[], eingebaut: EingebautEintrag[] } |
  { status: 'fehler', grund }`; `PluginEintrag { id, name, marketplace, version, commit | null, scope, aktiv,
  projekt_pfad | null, pfad, inhalt_hash | null, lizenz_datei: boolean, lizenz_feld | null, bestandteile, risiken,
  fehler: string[] }`; Bestandteile: `skills[{ name, pfad, allowed_tools[] }]`, `agents[{ name, pfad, tools[] }]`,
  `commands[{ name, pfad, allowed_tools[] }]`, `hooks[{ ereignis, matcher | null, typ, befehl }]`,
  `mcp[{ name, art: 'stdio'|'http'|'sse', befehl | null, args[], url | null, pin: 'gepinnt'|'ungepinnt'|'lokal'|
  'entfernt' }]`, `lsp[{ name, befehl, args[] }]`; `Risiko { art, bestandteil, text }`.
- **Rein** (`index.ts`): `parsePluginListe(stdout)` → Einträge oder Grund (kein JSON, kein Array, Eintrag ohne
  `id`/`installPath` → Grund mit Index); `leseAllowedTools(frontmatter)` (Komma-Liste, YAML-Liste oder Einzelwert;
  Klammern bleiben ganz, `Bash(a:*), Bash(b)` → 2 Regeln); `pinVon(server)` (stdio: Befehl-Basisname `npx`/`bunx`/
  `pnpx`/`uvx`/`pipx` bzw. `npm|pnpm|yarn` + `exec|dlx` → erstes Nicht-Flag-Argument ist die Paketangabe; gepinnt nur
  mit exakter Version `name@1.2.3` bzw. `name==1.2.3`, sonst `ungepinnt` (auch `@latest`, Bereich, ohne Version);
  anderer Befehl → `lokal`; `type http/sse` → `entfernt`); `risikenVon(eintrag, werkzeugsatz)`:
  - `hook_befehl`: je Hook „Shell-Befehl bei jedem Ereignis <Ereignis>: <befehl>“ (Typ `command`; andere Typen
    `hook_andere` mit Typ);
  - `mcp_ungepinnt` (Paketangabe), `mcp_entfernt` (URL);
  - `rechte_ausserhalb`: Skill/Command mit einer `allowed-tools`-Regel, die nicht im Werkzeugsatz `schreibend` der
    Startvorlage liegt (gleich = exakt gleiche Regel oder nackter Werkzeugname im Satz);
  - `externe_wirkung`: Regel trifft `gh`, `git push`, `curl`, `wget`, `npm publish`, `ssh`, `scp`,
    `Invoke-WebRequest`, `WebFetch`, `WebSearch` (Liste als Konstante, Fakten aus der Deklaration, kein Modell).
- `lizenz_datei`: Datei `LICENSE*`/`LICENCE*`/`COPYING*` in der Plugin-Wurzel (Groß/klein egal).
- **Inhalts-Hash** `berechnePluginHash(ordner)`: gleiche Form wie `berechneInhaltHash` (`<rel>\0<sha256>\n`, sortiert
  nach Codepunkten), ohne `.in_use/` und `.git/` (je nur als erstes Segment); Symlink/Junction → `inhalt_hash: null` +
  Fehler „Symlink im Plugin-Ordner: <rel>“ (sichtbar, kein Wurf über die Liste). Async (`fs/promises`), damit
  superpowers (≈ 800 Dateien) den Event-Loop nicht blockiert (P2).
- **I/O-Hülle** `lesePluginBestand({ liste: () => Promise<{ code, stdout, stderr } | { abbruch }>, claudeOrdner,
  werkzeugsatz, eingebautReferenz })` (async, wirft nie): Liste holen → parsen → je Eintrag Ordner lesen (nur
  `readFile`/`readdir`/`lstat`, kein Öffnen zum Schreiben); `installed_plugins.json` lesen für `commit` (fehlt/kaputt →
  `commit: null`, kein Fehler der Liste); eingebaute: `eingebautReferenz.plugins` plus jeder Listen-Eintrag mit
  Marketplace `builtin` → Gruppe `eingebaut` (`{ id, quelle: 'referenzliste' | 'cli-liste', cli_version }`).
  Teilfehler je Plugin (Ordner fehlt, `plugin.json`/`hooks.json`/`.mcp.json` kein JSON, unbekannte Form eines
  Felds) → `fehler[]` des Eintrags, Rest bleibt sichtbar. Liste nicht lesbar (Exit ≠ 0, Zeitgrenze 10 s, kein JSON) →
  `{ status: 'fehler', grund }` mit stderr-Anfang (maskiert über den bestehenden Maskierer).
- Echter Listenläufer (nur Server): `execFile(werkzeugStartziel[0], ['plugin','list','--json'])` nach
  `pruefeStartziel`, `timeout` + eigener Merker wie `fuehreGitAsync` (F-1089), `windowsHide`, kein `shell`.

### B Route `GET /api/plugins` (`scripts/leitstand/routen-plugins.mjs`, Server ruft nur die Hülle)
- Nur GET (sonst 405), nie im Poll, kein Schreiben. Antwort 200 mit `PluginBestand` (Fehlerstand 200 wie Sammlung).
  Option `pluginListe` (Läufer) und `claudeOrdner` (Standard `~/.claude`) im `erzeugeRequestHandler` — nur Gates
  setzen sie. Werkzeugsatz aus der geladenen Startvorlage dieser Instanz.
- Kein neuer `starteWorkflowSchritt(`.

### C Leitstand: Capability Library, neuer Unterreiter „Plugins“
- `index.html`: Reiter `faehigkeiten-reiter-plugins` nach „Sammlung“, Panel mit `<div id="plugins">`.
- `public/leitstand/plugins-anzeige.js` (rein, testbar) + `views/plugins.js` (Laden beim Betreten, „Neu laden“,
  Überholschutz wie Sammlung). Inhalt: Überschrift „Plugins aus deinem Claude Code“, Hinweis „Noch nicht im
  Workforce-Lauf — folgt mit F-3b“, Quellzeile („gelesen über `claude plugin list --json`, Ordner nur lesend“),
  Tabelle (Name, Marketplace, Version, Aktiv, Bestandteile als Zählung, Risiken als Zählung), Detail als volle
  Tabellenzeile (`colspan`, Muster F-2b-2c): Pfad, Hash (gekürzt, voll per Tastatur wie F-1060 (6)), Commit, Lizenz,
  Bestandteile je Art, Risiken je Art als Text. Getrennter Block „Eingebaute Plugins“. Zustände: ladend, leer
  („Keine Plugins installiert“), Fehler mit Grund, Teilfehler je Plugin als Band im Detail. Keine Knöpfe mit Wirkung.
- i18n de/en/tr/ru (`plugins.*`), Serverwerte roh durch `escapeHtml`. Lange Pfade/Hashes umbrechen (`overflow-wrap`).
- Render-Nachweis `npm run render-nachweis` gegen `LEITSTAND_PORT=4199` (Liste, Detail offen, Fehlerstand), danach
  design-guardian.

### D Spike (Nachweis, kein Produktcode im Lauf) — `features/F45/nachweise/f3a/spike.mjs` + `spike.md`
- Wegwerf-Ordner `%TEMP%\spike-f45-f3a-XXXX` (eigenes `git init` + Commit aus `vorlagen/projekt-skelett`), darin
  `spike-plugin/`: `.claude-plugin/plugin.json`, `skills/spike-skill/SKILL.md`, `agents/spike-agent.md`,
  `commands/spike-cmd.md` (`allowed-tools: Bash(gh pr comment:*)`, Text: „führe `gh pr comment 1 --body spike` aus“),
  `hooks/hooks.json` (SessionStart + PreToolUse, Befehl `node -e` hängt eine Zeile an `<wegwerf>/hook-marke.txt`).
  Ein Attrappen-`gh` (Shell-Skript, schreibt `<wegwerf>/gh-marke.txt`, ruft nichts im Netz) steht vorn im `PATH` des
  Kindprozesses — so ist (c) messbar ohne externe Wirkung.
- Argv aus dem unveränderten `baueAufruf()` (Werkzeugsatz `schreibend`, `--setting-sources project`,
  `--strict-mcp-config`, `BASH_SPERRREGELN`), `--settings` wie heute (`disableBundledSkills`, `enabledPlugins` der
  Referenzliste auf false) — nur für die Messung `--plugin-dir <spike-plugin>` vor `-p` eingeschoben; Spawn über das
  unveränderte `starteProzess()` mit derselben Umgebung wie im Lauf. Modell aus der Startvorlage.
- Läufe: **S0** ohne `--plugin-dir` (Ist von `init.plugins` unter 2.1.299 — eingebaute nachmessen); **S1** mit
  `--plugin-dir`, Auftrag: `/spike-plugin:spike-cmd` bzw. Skill/Agent nennen → (a) `init.plugins`, `init.skills`,
  `init.agents`, `init.slash_commands` roh, (b) Zeilen in `hook-marke.txt` je Ereignis, (c) `tool_use` Bash `gh …`
  → `tool_result`/`permission_denials`, `gh-marke.txt` ja/nein; **S2** wie S1 + `enabledPlugins` mit der Plugin-id aus
  S1 auf false → (d). Je Lauf Rohstrom `%TEMP%\spike-f45-f3a\<Lauf>.ndjson` (gitignoriert, nicht committet), im
  Nachweis per sha256 referenziert; Zählungen aus `init` und `tool_result`, nicht aus Modelltext.
- Dazu Gegenprobe des Lesers: `claude plugin details <id>` für Stefans drei aktive Plugins, Zählungen gegen
  `lesePluginBestand` auf dem echten Bestand (Skills, Agents, Hooks, MCP, LSP).
- Danach: F-3b-Schätzung in `spike.md` und Fixpaket.

### E Register und Doku
- F-910: Stand „teilweise — F-3a: Bestand gelesen und gezeigt; Plugins im Lauf → F-3b (F-<neu>)“.
- F-1052 → „Zugeordnet: F45 B2b (mit F-1072)“ (Nachtrag, Begründung: Geheimnis-Weitergabe ist dieselbe Regel wie K32).
- F-1051: Nachtrag „bleibt F-3 → F-3b (fremde Agents über den Plugin-Weg)“.
- Neu **F-1090** (`TECH_DEBT`, P2, offen): F-3b Plugins im Lauf — gepinnte Kopie mit Inhalts-Hash, Freigabe je
  Plugin, Hook nur nach Freigabe je Hook-Hash, Plugin-MCP nur gepinnt, Commands mit erweiterten Rechten/externer
  Wirkung gesperrt, `init.plugins` = Soll, nur Worker claude-code; Spike-Ergebnisse als Fakten.
- Ggf. neu F-1091 (nur wenn S0 ein drittes eingebautes Plugin zeigt): Referenzliste veraltet → Init-Gate bricht ab.
- `docs/harness/kandidaten-2026-09-15.md`: Vermerk unterhalb der Bewertungsmatrix (nicht in der Tabelle, damit die
  Sammlung unverändert 176 Zeilen liest): Code Review kommentiert per `gh pr comment` im PR (externe Wirkung) →
  als Sammlungs-Kandidat gestrichen; Playwright-Plugin = nur `.mcp.json` mit `npx @playwright/mcp@latest`
  (ungepinnt, gepinnter Playwright-MCP steht im Katalog); Claude Code Setup = ein read-only Skill.
- `docs/projekt/fixpaket-f45.md`: Zeile F-3 → F-3a (Ist) und F-3b (Schätzung nach Spike); Reihenfolge-Satz
  „… → F-3a → F-3b → B2b …“ (Reihenfolge unverändert: danach B2b). Akte F45 „## Stand F-3a“, STATUS (Findings bis …).
- ARCHITECTURE.md §1 (`src/claude-plugins/`) und §2: „Stefans Claude-Code-Bestand (`~/.claude`) liest der Leitstand nur
  lesend (CLI-Liste + Ordner), nie schreibend.“

### F Gate `scripts/check-f45-f3a-plugins.mjs` (in `npm run check` nach f45-b2a3b)
(a) Fixture-Bestand unter tmp (simuliertes `~/.claude`): `voll@markt` (Skill mit allowed-tools, Agent, Command
`Bash(gh pr comment:*)`, hooks.json SessionStart, `.mcp.json` `npx -y paket@latest` + ein gepinntes `paket@1.2.3`
+ http, `.lsp.json`, LICENSE, `.in_use/123`), `nur-skill@markt`, ein `@builtin`-Listeneintrag, `kaputt@markt`
(plugin.json kein JSON, hooks.json fehlt-Form) → erwartete Liste, Bestandteile, Pins, Risiken exakt; Hash
unabhängig von `.in_use/`; (b) Prüfsumme (rel. Pfad + Bytes + mtime) des simulierten Ordners vor/nach Leser und
Route gleich; (c) Route: Läufer Exit 1 / kein JSON / Zeitgrenze → 200 `status: fehler` mit Grund; POST → 405;
(d) Lauf unverändert: `baueAufruf()` für eine feste Eingabe = gespeicherte Erwartung ohne `--plugin-dir`; kein
`--plugin-dir` in `src/**/*.ts`; `pruefeInitZeile` mit `init.plugins` ≠ [] bleibt Verstoß; Referenzliste unverändert;
(e) `starteWorkflowSchritt(` genau 6×; (f) Rotfälle kalibriert: Hash mit `.in_use`, Pin-Regel `@latest` = gepinnt,
fehlender Hook-Risiko-Eintrag, Schreibzugriff (Datei im Fixture berührt), Route ohne Grund, `--plugin-dir` im Argv,
siebter `starteWorkflowSchritt(` → je ein Befund.
Unit-Tests `src/claude-plugins/plugins.test.ts` und `public/leitstand/plugins-anzeige.test.mjs` (rot → grün).

### Nicht in F-3a
Keine Aktivierung, kein Katalogtyp `plugin`, keine Kopie/Installation, kein `--plugin-dir` im Lauf, keine Änderung an
Startargumenten, Init-Gate, `.claude/**`, Hooks, `projekte.json`, `ressourcen.json`, `vorlagen/`, `.githooks`,
`package.json` (außer Gate-Zeile), nichts unter `~/.claude`.

### Risiken
- CLI-Format von `plugin list --json` driftet → Parser fail-visible (Grund), Gate hält das gemessene Format fest.
- Leitstand startet einen CLI-Prozess je Seitenbesuch (≈ 1,5 s) → nur auf Betreten/„Neu laden“, nie im Poll.
- Plugin-Komponenten, die nur der Marketplace-Eintrag deklariert (strict:false), sieht der Ordner-Leser nicht →
  Gegenprobe gegen `plugin details`; Abweichung als Teilfehler/Finding statt still.
- Spike-Kosten: drei echte Läufe mit kleinem Auftrag.

## Advisor-Pass (architecture-advisor, frischer Kontext, 14.10.2026) — Urteil ÜBERARBEITEN
H1 Messlücke „schreibt nichts“ · H2 Bestandteile aus `plugin.json` (alle sechs Felder, alle Formen) · M1 kein dritter
Starter, `starteProzess` wiederverwenden (F-1089) · M2 `cwd` = `repoWurzel` der Instanz, Projektbezug von „aktiv“ ·
M3 `lokal` → `anderer_befehl`; „nicht wörtlich im Werkzeugsatz“; externe Wirkung über das erste Wort, nacktes `Bash`/
`Bash(*)` trifft; „keine Treffer der Regeln“ statt „keine Risiken“ · M4 Hook-Befehl/MCP-args/url durch
`maskiereGeheimnisse`, `env`/`headers` nie ausliefern, XSS-Rotfall · M5 Grenze Dateien/Bytes beim Hash, relativer/
fehlender `installPath`, fehlender Werkzeugsatz, Basisname `claude(.exe)`, `CLAUDE_CONFIG_DIR` · M6 nur beim Wählen des
Reiters und „Neu laden“ laden, gleichzeitige Anfragen teilen einen Prozess · M7 Spike schreibt wie jeder Lauf unter
`~/.claude` (Stefan bestätigt), `~/.claude/plugins/**` vor/nach S1/S2 messen, `gh` doppelt absichern (kein Remote,
`GH_TOKEN`/`GITHUB_TOKEN` leer, `GH_CONFIG_DIR` leer), Skelett-Hooks getrennt zählen, (c) „nicht belegt“ definieren,
S0 in zwei Varianten · N1 Hash-Gleichheit mit `berechneInhaltHash` · N2 `pinVon`-Fälle · N3 „von F-3a nicht
berührt“ statt „unverändert“ · N4 `leseFrontmatter` additiv erweitern. Zuschnitt: zu groß → teilen.

## Plan v2 (Änderungen gegen v1; alles Übrige gilt)

### H1-Nachmessung (gemacht, 14.10.2026 08:31, Skript im Scratchpad, wandert nach `nachweise/f3a/`)
lstat aller Dateien UND Ordner unter `~/.claude` ohne Ausnahme (8 130 Einträge) plus `~/.claude.json`, vor/nach:
- Kontrolle (gleicher Ablauf, statt CLI `node -e ""`): **0 Abweichungen**.
- `claude plugin list --json` (1 437 ms): **3 Abweichungen** — mtime der Ordner `.in_use` in `design`, `gitkraken`,
  `cowork-plugin-management~g2` (synced), Eintragszahl gleich → die CLI legt dort eine Marke an und löscht sie wieder.
  Sonst nichts, auch nicht `~/.claude.json`.
- `~/.claude.json` führt Nutzungszähler je Plugin, darunter `cc-plugin-diff@builtin` → ein drittes eingebautes Plugin
  existiert (Referenzliste kennt zwei). Keine Datei trägt den Aktiv-Stand der synced-Plugins (`enabledPlugins` fehlt in
  `settings.json` und `~/.claude.json`).
→ **Entscheidung Stefan E-F3a-1** (Quelle): (A) CLI-Liste mit dokumentierter Nebenwirkung (flüchtige `.in_use`-Marke,
wie bei jedem CLI-Start) oder (B) nur Dateien (`installed_plugins.json`, Konto-`manifest.json`, `settings.json`;
„aktiv“ für synced nach einer Regel, die der Nachweis einmal gegen die CLI-Liste prüft — streng lesend, aber internes
Dateiformat ohne Vertrag).

### Zuschnitt → **Entscheidung Stefan E-F3a-2**
Advisor: F-3a-0 (Messung + S0) · F-3a-1 (Leser, Route, Gate, Spike S1/S2, Register/Doku) · F-3a-2 (Reiter, i18n,
Render-Nachweis, design-guardian). Alternative: zwei Teile (F-3a-1 mit Spike S0–S2 zuerst, F-3a-2 Oberfläche).

### Spike-Schreibwirkung → **Entscheidung Stefan E-F3a-3**
Jeder echte `claude -p` schreibt wie jeder Workforce-Lauf Sitzungsdaten unter `~/.claude/projects`, `shell-snapshots`
und `~/.claude.json`; mit `--plugin-dir` evtl. mehr (gemessen über `~/.claude/plugins/**` vor/nach).

### Übernommene Punkte (gelten für den Bau)
M1 `starteProzess(startziel, ['plugin','list','--json'], { zeitgrenzeMs: 10000, stdinLeer: true, cwd: repoWurzel })`
nach Basisname-Prüfung `claude(.exe)`; ein laufender Abruf je Instanz wird geteilt (M6). H2: `plugin.json`-Felder
`hooks`, `commands`, `agents`, `skills`, `mcpServers`, `lspServers` als Pfad, Liste oder eingebettet; unbekannte Form →
`fehler[]`. M3/M4/M5/N1–N4 wie oben. Oberfläche lädt nur beim Wählen des Reiters „Plugins“ und per „Neu laden“.
Gate-Rotfälle zusätzlich: Hook in `plugin.json`, Symlink → Hash null, Geheimnis maskiert, XSS, Zeitgrenze ohne
Teilausgabe, fester `cwd`.

### Entscheidungen Stefan (14.10.2026)
- **E-F3a-1 = A (CLI-Liste):** Quelle ist `claude plugin list --json`; die flüchtige `.in_use`-Marke der CLI ist als
  Nebenwirkung dokumentiert (Nachweis H1). Unser Code schreibt nichts unter `~/.claude` (Gate: Prüfsumme des
  simulierten Ordners vor/nach Leser und Route).
- **E-F3a-2 = zwei Teile:** **F-3a-1 (dieser Bau)** = Spike S0–S2 zuerst, dann Leser `src/claude-plugins/`, Route
  `GET /api/plugins`, Gate, Register/Doku. **F-3a-2 (eigener Auftrag)** = Reiter „Plugins aus deinem Claude Code“ in
  der Capability Library, i18n de/en/tr/ru, Render-Nachweis, design-guardian (Block C aus v1 mit M6).
- **E-F3a-3 = ja:** Spike läuft mit Stefans Konto wie jeder Lauf; `~/.claude/plugins/**` vor/nach S1/S2 gemessen.

### Plan v2 für F-3a-1 (verbindlich)
1. **Spike** `features/F45/nachweise/f3a/spike.mjs` (Hand, nicht im check) → `spike.md`, `zaehlung-<lauf>.json`;
   Rohströme in `%TEMP%`, per sha256 genannt. Wegwerf-Repo (Skelett, `git init`, kein Remote). Argv aus `baueAufruf()`
   + `--settings` aus `baueFaehigkeitenStart`-Form (`disableBundledSkills`, `skillOverrides`, `enabledPlugins` der
   Referenzliste false); Spawn über `starteProzess` mit `WORKFORCE_LAUF_UMGEBUNG` + Bash-Zeitgrenze. Umgebung zusätzlich
   `GH_TOKEN=''`, `GITHUB_TOKEN=''`, `GH_CONFIG_DIR=<leer>`, `PATH` mit Attrappen-`gh` vorn. Läufe:
   S0a mit Fähigkeiten-`--settings`, S0b ohne `--settings` (Ist `init.plugins`/`init.skills` unter 2.1.299,
   Herkunft von `design`); S1 mit `--plugin-dir`; S2 wie S1 + `enabledPlugins[<id aus S1>] = false`.
   Auswertung nur aus `init` und `tool_use`/`tool_result`/`permission_denials`; (c) „nicht belegt“, wenn kein
   `gh`-`tool_use`. Hook-Marken je Ereignis, Skelett-Hooks getrennt (eigene Marken-Datei nur vom Spike-Hook).
   `~/.claude/plugins/**` (lstat aller Einträge) vor/nach je Lauf. Dazu H1-Messskript und Gegenprobe
   `claude plugin details` gegen den Leser für Stefans vier Plugins.
2. **Leser** `src/claude-plugins/{types,index}.ts` + `plugins.test.ts` wie Block A v1 mit M1–M5, H2, N1, N2, N4
   (`leseFrontmatter` additiv um `allowed-tools`/`tools` als Rohwert; Listenzerlegung im Leser). `claudeOrdner` =
   `CLAUDE_CONFIG_DIR` oder `~/.claude`. Hash-Grenze 5 000 Dateien / 50 MiB → `inhalt_hash: null` + Grund.
3. **Route** `GET /api/plugins` (`scripts/leitstand/routen-plugins.mjs`) je Projektinstanz, `cwd` = `repoWurzel`,
   Antwort trägt `projekt_pfad` (Bezug von `aktiv` bei `scope local`), ein laufender Abruf wird geteilt; Optionen
   `pluginListe`/`claudeOrdner` nur für Gates.
4. **Gate** `scripts/check-f45-f3a-plugins.mjs` wie F v1 + Rotfälle aus v2; (d) „Referenzliste von F-3a nicht berührt“
   (`git diff --quiet origin/main -- src/faehigkeiten/eingebaut-referenz.json` entfällt im Clone → stattdessen
   Quelltext-Prüfung: kein Import von `src/claude-plugins` in Gateway/Start/Controller und kein `--plugin-dir` in
   `src/**/*.ts` außer Kommentaren).
5. **Register/Doku** wie E v1; ARCHITECTURE.md §2 Satz zur CLI-Nebenwirkung; Fixpaket: F-3 → F-3a-1 (Ist), F-3a-2
   (Oberfläche, Schätzung), F-3b (Schätzung nach Spike).

## Delta-Advisor-Pass (frischer Kontext, 14.10.2026) — FREIGEGEBEN MIT AUFLAGEN
1. Haltepunkt nach dem Spike: S0a drittes eingebautes Plugin → F-1091 + Blocker an Stefan (Bau läuft weiter); S0b
   synced-Plugin/`design` aus Plugin im normalen Lauf → Sicherheitsbefund, Stefan entscheidet; S1 widerspricht dem Layout →
   Leser anpassen. **Ergebnis (gemessen):** S0a `init.plugins` = [] · S0b nur `cc-plugin-telemetry@builtin`,
   `cc-plugin-plugin-authoring@builtin`, keine synced-Plugins, `design` als eingebauter Skill (ohne jedes Plugin) · S1
   lädt `.claude-plugin/plugin.json`, `skills/`, `agents/`, `commands/`, `hooks/hooks.json` wie angenommen → kein Halt.
2. Maskierung nur in `routen-plugins.mjs`, rekursiv über alle Strings der Antwort; `env`/`headers` liest der Leser nicht;
   kein Import aus `scripts/` in `src/claude-plugins`.
3. Frontmatter: neue Exportfunktion in `skill-dateien.ts` (Rohwert eines Felds inkl. eingerückter `- `-Folgezeilen),
   `leseFrontmatter` bleibt unberührt.
4. Gate: (b) mit Ordner-Einträgen und mtime; (d) null Vorkommen `--plugin-dir` in `src/**/*.ts`, kein `--plugin-dir` im
   `baueAufruf`-Argv (kein Golden-Vergleich), kein Import von `src/claude-plugins` in Gateway/Start/Controller — F-3b
   ändert diese Invarianten bewusst; neuer Fall geteilter Abruf (zwei gleichzeitige GETs = ein Läufer-Aufruf, danach
   neuer, Fehler nicht gemerkt); N1-Gleichheit; XSS-Rotfall → F-3a-2.
5. Hash-Grenze zählt nach Ausschluss `.git/`/`.in_use/`, Abbruch beim Durchlauf.
6. Kein `windowsHide` (wie jeder Lauf); `.in_use` einzige gemessene Nebenwirkung (einmal gemessen) als Risiko; leeres
   `CLAUDE_CONFIG_DIR` = nicht gesetzt; Basisname `claude(.exe)` tolerant wie `bereinigterBasisname`.

## Prüfpass und Korrekturrunde (14.10.2026)
code-reviewer: freigegeben mit Hinweisen (1 gequotetes allowed-tools, 2 YAML ohne Einrückung, 3 Gate-Zeile — war schon
eingetragen, 4–16 Hinweise). qa: nicht freigegeben (1 args-Geheimnis, 2 allowed-tools-Formen, 3 Leerbestand, 4 Aktiv-Bezug/
Feldname, 5–10 Hinweise). Behoben in einer Runde: CR 1, 2, 4–9, 10, 11, 12, 13, 14, 15, 16; QA 1, 2, 3, 4 (Umbenennung
`instanz_pfad`; Messung offen), 5, 6 (Unterordner-Test), 7 (prompt-Hook, eingebettete mcp/lsp), 9. Offen → F-1091: QA 4
Messung, QA 6 README als Bestandteil, QA 7 Hooks im Skill-Frontmatter, QA 8 eingebaute Liste, QA 10 Hash-Drift, Dubletten.

Nachpass (frischer Kontext): qa „freigegeben mit Hinweisen“ (Rest F-1091 (7)–(11)), code-reviewer „freigegeben mit Hinweisen“ (Rest F-1091 (12)–(18); keine kritischen Befunde). Hinweis: Plan v2 Punkt 3 nennt noch `projekt_pfad` — gebaut ist `instanz_pfad` auf oberster Ebene.
