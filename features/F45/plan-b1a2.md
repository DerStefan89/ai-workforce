# F45 B1a-2 — Projekt-Skelett und Vorlage nachziehen, Mindest-Gates, check:template, Startvorlage aus dem Register, Nachrüsten — Plan

Grundlage: Bauauftrag B1a-2 (11.10.2026), `docs/projekt/fixpaket-f45.md` (WS B1a), `vorlagen/projekt-skelett/HERKUNFT.md`,
`state/findings.md` (F-939, F-701, F-1009, F-1024, F-700). Branch `feat/f45-b1a2-skelett`, Basis `fde3b06` (= main mit #319).

## Plan v1

### 0 Befunde vor dem Plan (belegt)
- **Template-Commit:** `template/main` = `9189959a7d4de0486a4fee1e30b57ea8e5644661` (nach `git fetch template` am
  11.10.2026 unverändert). Das Skelett bleibt also auf demselben Commit; es wird nur die Whitelist erweitert.
- **Skelett heute:** 37 Dateien; 36 byte-gleich zum Template-Blob, `CLAUDE.md` lokal geändert (F-830, in HERKUNFT.md benannt).
- **Template hat KEINEN `.claude/agents/design-guardian.md` und KEINEN `scout`.** design-guardian liegt dort nur als
  `docs/examples/design-guardian.example.md` (generisch, alle Pfade schon `[FUELLUNG]`, nicht auf `public/leitstand`
  festgelegt). scout gibt es im Template nicht; ai-workforces `scout.md` ist F27-spezifisch (ressourcen.json,
  Capability Gap im Workboard) → **weglassen, begründet**.
- **Neue Projekte bekommen settings.json und Hooks heute schon — aus ai-workforce, nicht aus dem Template.**
  `POST /api/projekte` ruft `kopiereBaseline` (ai-workforces `.claude/settings.json`, alle referenzierten Hooks
  `*.cjs`/`guard-settings.js`, `state/aktuelle-autorisierung.json`, byte-gleich, sonst scheitert E-183 am Ziel → 422)
  und DANACH `kopiereSkelett` (überschreibt nie). Eine `settings.json` im Skelett wird für neue Projekte deshalb
  **immer übersprungen**; E-183 neuer Projekte ändert sich nicht. Die Aussage im Auftrag („settings.json im Skelett
  wirkt in jedem Lauf und ändert den E-183-Hash“) trifft nur auf Projekte ohne eigene settings.json zu, also auf das
  **Nachrüsten** (Punkt 5) — dort gilt die Pflichtmeldung „Startfreigabe neu erteilen“.
- **Hooks Template ↔ ai-workforce:** Template: `commit-guard.js`, `guard-settings.js`, `session-reminder.js`,
  `zwischenstand-laden.js`, `zwischenstand-pruefen.js` (CommonJS mit `require`). ai-workforce: dieselben als `.cjs`
  (außer `guard-settings.js`), commit-guard dort zusätzlich mit Sperre für `gh pr merge`/Branch-Protection (Obermenge).
  Ohne Gegenmaßnahme bekäme ein neues Projekt beides: die referenzierten `.cjs` (Baseline) und tote `.js`-Kopien
  (Skelett) — `guard-settings.js` gleichnamig, Baseline gewinnt.
- **Tote Verweise heute:** Skelett-`package.json` (lint/typecheck/test → „SETUP.md Punkt 3“), `scripts/check-docs.mjs:87`
  (SETUP.md Punkt 7) und `:248` (Punkt 5), `scripts/check-rules.mjs:88` (Punkt 4) — SETUP.md wird nicht kopiert.
- **Lokale Werkzeuge:** gitleaks nicht im PATH, Docker nicht installiert (11.10.2026) → der Secret-Scan wird lokal den
  Hinweis zeigen; der Rot-Fall mit echter Attrappe ist lokal nicht real belegbar (nur die Verdrahtung, s. 2c).
- **`node --test` ohne Testdateien endet mit Exit 0** („tests 0“, gemessen Node 24 lokal) → Untergrenze nötig.
- **check:template-Abhängigkeiten:** CI ruft `npm run check` (nicht check:template). Code ruft check:template nur als
  Prüfbefehl NEUER Projekte (`schreibeStartvorlageUndProfil`, deren eigenes Skelett-Skript); ai-workforces eigene
  Startvorlage nutzt `run check`. Erwähnungen in Gate-Kopfkommentaren („Wird aufgerufen von: … check:template“) werden
  nachgezogen. `.claude/settings.json` erlaubt `Bash(npm run check:template)` — bleibt gültig, nicht angefasst.
- **Startvorlage im Leitstand:** wird heute schon an zwei Stellen angezeigt (Auftrag anlegen → „Womit gearbeitet wird“,
  Feld Startvorlage; Capability Library „Aktiv geladene Startvorlage: …“). Neu ist nur die **Herkunft** (Umgebung /
  Register / Standard).

### 1 Vorlage nachziehen
**Neu ins Skelett (byte-gleich aus `git show 9189959:<pfad>`):**
`.claude/settings.json`, `.claude/hooks/commit-guard.js`, `guard-settings.js`, `session-reminder.js`,
`zwischenstand-laden.js`, `zwischenstand-pruefen.js`, `.claude/commands/lessons.md`,
`docs/examples/design-guardian.example.md`, `.github/workflows/ci.yml` (nur Template-Schritte: Checkout, Node,
`npm install`, `npm run check:template`, gitleaks per Docker), `.worktreeinclude`, `.claudeignore`, `SETUP.md`.

**design-guardian:** als `docs/examples/design-guardian.example.md` (Template-Ort und -Fassung), NICHT als aktiver Agent:
SETUP.md Punkt 2 und Skelett-CLAUDE.md („`design-guardian` [FÜLLUNG, nur UI-Projekte]“) sehen das Aktivieren nur für
UI-Projekte vor; ein Prüfer ohne Referenzen prüft nichts. Aktivierung im Lauf ist B3/B2b.

**Hook-Gruppe (neue Regel, Kern):** `.claude/settings.json` und `.claude/hooks/**` sind eine Gruppe. Die Gruppe wird nur
kopiert, wenn im Ziel noch KEINE `.claude/settings.json` liegt. Sonst wird die ganze Gruppe übersprungen (gemeldet).
Grund: Hooks gehören zu der settings.json, die sie referenziert; sonst entstehen tote Hook-Kopien (Befund oben) und
eine halbe Gruppe könnte eine fremde settings.json auf fehlende Dateien zeigen lassen. Umsetzung als eine reine
Funktion `planeSkelettKopie(skelettDateien, ziel)` → `{ kopieren, vorhanden, gruppeUebersprungen }`, genutzt von
`kopiereSkelett` UND vom Nachrüsten (eine Regel, zwei Aufrufer). `kopiereSkelett` überschreibt weiterhin nie.

**Hooks im -p-Lauf (Beleg je Hook):**
| Hook | Ereignis | blockiert im Workforce-Lauf? | Beleg |
|---|---|---|---|
| commit-guard | PreToolUse Bash | nur `git commit`/`git push` ohne Freigabe-Datei und Befehle mit `.claude/settings.json` bzw. `state/freigabe-commit.md` im Text. Workforce-Läufe committen und pushen nicht (Skelett-CLAUDE.md F-830), Prüfbefehle sind `npm run …` | B1a-1-Nachweis: Bau, Prüfschritt und Korrekturlauf liefen im Worktree mit ai-workforces commit-guard (Obermenge der Template-Regeln) durch; zusätzlich Test: Template-Hook mit `npm run check`, `git status`, `git diff --stat`, `node --test` → kein deny |
| guard-settings | PreToolUse Edit/Write | nur Schreiben auf `.claude/settings.json`, `state/freigabe-commit.md` | dito, Test mit `src/x.ts` → kein deny |
| session-reminder | UserPromptSubmit | nie (nur `systemMessage` alle 30 Prompts; -p hat einen Prompt) | Test: Exit 0, keine Entscheidung |
| zwischenstand-laden | SessionStart | nie (Fehler → still Exit 0) | Test: ohne Git/Datei Exit 0 |
| zwischenstand-pruefen | PreCompact | blockiert nur `manual`; `auto` warnt nur. -p kennt kein manuelles /compact | Test: trigger auto → kein `decision: block` |
Der Test liegt in ai-workforce (`scripts/skelett-hooks.test.mjs`), läuft die Skelett-Hooks als Kindprozess mit
JSON auf stdin.

**HERKUNFT.md:** Whitelist um die neuen Dateien erweitert, „Ausgeschlossen“-Abschnitt angepasst (settings.json/Hooks
jetzt drin, mit Hook-Gruppen-Regel), Template-Commit voll ausgeschrieben, neuer Abschnitt **„Prüfsummen“**: Tabelle
`| Pfad | SHA-256 | Herkunft |` je Skelett-Datei (außer HERKUNFT.md selbst), Herkunft ∈ {`template`, `lokal geändert`,
`lokal neu`}. Hash = SHA-256 über die Bytes der Datei im Arbeitsbaum (eol=lf durch `.gitattributes` `* text=auto eol=lf`,
also auf Windows und in der CI gleich).

**Drift-Gate (neu) `scripts/check-skelett-herkunft.mjs`** (in `npm run check`, nicht in check:template):
rot, wenn (1) eine Skelett-Datei keine Zeile hat, (2) eine Zeile auf eine fehlende Datei zeigt, (3) der Hash abweicht.
Meldung nennt Pfad, erwarteten und tatsächlichen Hash. `--ausgeben` druckt die Tabelle für die Pflege (kein Schreiben).
Grün-/Rot-Fälle als Test (`scripts/check-skelett-herkunft.test.mjs`, Wegwerfordner). Löst F-700 (Drift Skelett ↔
HERKUNFT; Drift Template ↔ Skelett bleibt manuell, Commit steht in HERKUNFT.md).

### 2 Mindest-Gates (nur Node/TS)
**Skelett-`package.json` (lokal geändert):** Platzhalter bleiben Exit 1, Text: `lint: [PLATZHALTER] kein Linter
eingerichtet — Gate-Vorlage anwenden: docs/harness/gate-vorlage-node.md (Node/TS) bzw. Skill werkzeug-auswahl`
(analog typecheck/test). `check` = `node scripts/check-gates.mjs && npm run lint && …` (Gates zuerst, damit die
Platzhalter-Meldung die erste Zeile ist). `check:template` unverändert.

**Neu `docs/harness/gate-vorlage-node.md`** (lokal neu): Zweck, wann anwenden (Architekt bei Stack-Entscheidung Node/TS),
Schritte: `npm install -D eslint @eslint/js typescript-eslint typescript` (Versionen pinnt das Projekt, nicht die Vorlage),
`eslint.config.mjs` (Inhalt als Block), `tsconfig.json` (strict, noEmit, `module: preserve`,
`allowImportingTsExtensions`), Skripte `lint: eslint .`, `typecheck: tsc --noEmit`,
`test: node scripts/tests-mit-untergrenze.mjs 1`, Lock-Datei committen (dann läuft der Audit), CI auf `npm run check`
umstellen (SETUP.md Punkt 3). Warnung: kein `"type": "module"`, solange die Hooks `.js` (CommonJS) sind — sonst laufen
sie als ESM, scheitern und lassen den Befehl durch (siehe 2d). Für ESM-Quellen `.mts`/`.ts` mit Erkennung oder Hooks
nach `.cjs` umbenennen (Mensch, settings.json).

**Neu `scripts/tests-mit-untergrenze.mjs`** (lokal neu, im Skelett): startet `node --test --test-reporter=tap`
(plus weitergereichte Argumente), spiegelt die Ausgabe, liest `# pass N` / `# fail M`, rot bei Exit ≠ 0, fail > 0 oder
pass < Untergrenze (Argument, Pflicht, ganze Zahl ≥ 1).

**Neu `scripts/check-gates.mjs`** (lokal neu, im Skelett), Ausgabe je Teil, Exit 1 wenn ein Teil rot:
- (a) `lint`/`typecheck`/`test` fehlen oder tragen `[PLATZHALTER]` → rot, „Gate-Vorlage anwenden:
  docs/harness/gate-vorlage-node.md“.
- (b) `package-lock.json` vorhanden → `npm audit --audit-level=high` (npm über `npm_execpath`, sonst Hinweis);
  Exit ≠ 0 → rot (Befund oder Audit nicht ausführbar, z. B. offline — beides ausdrücklich benannt, nie still).
  Ohne Lock-Datei: Hinweis „Abhängigkeits-Scan übersprungen: keine package-lock.json“.
- (c) Secret-Scan: `gitleaks` im PATH → `gitleaks detect --source <wurzel> --no-git --redact`; sonst Docker erreichbar →
  `docker run --rm -v <wurzel>:/repo zricethezav/gitleaks:<gleiche Version wie ci.yml> detect --source /repo --no-git --redact`;
  sonst **sichtbarer Hinweis** „Secret-Scan NICHT gelaufen: weder gitleaks noch Docker gefunden — Funde erst in der CI“
  (gelb, kein Exit 1). Treffer → rot. Gleiches Ziel wie CI (Arbeitsbaum, `--no-git`).
- (d) **Vorschlag, zur Prüfung:** `"type": "module"` + in `.claude/settings.json` referenzierte `.js`-Hooks → rot
  („Hooks liefen als ESM und ließen still durch“). Klein (ein Lesen zweier JSON-Dateien), schließt eine stille
  Fail-open-Lücke genau der hier eingeführten Bremsen.
Exportiert die Teilprüfungen als Funktionen mit injizierbarem Prozess-Ausführer (Tests ohne gitleaks/Docker/Netz).
Läuft nur `if (import.meta.url === pathToFileURL(process.argv[1]).href)`.

**ai-workforce `npm run check` (F-1024):** neues `scripts/check-secrets.mjs` importiert die Teilprüfung (c) aus
`vorlagen/projekt-skelett/scripts/check-gates.mjs` (dasselbe Verhalten per Konstruktion, kein zweiter Code) und scannt
die Repo-Wurzel. Eingehängt in `check` direkt vor `npm run test`. Tests (`scripts/check-secrets.test.mjs`): Attrappe zur
Laufzeit zusammengesetzt (z. B. `'ghp_' + 'x'.repeat(36)` ähnlich, nie als Literal), injizierter Ausführer prüft
Argumente und Rot/Grün/Hinweis; keine Allowlist. Bekannte Grenze: lokal mit `--no-git` werden auch ungetrackte
`kontrollzustand/`-Ordner (345) und `node_modules/` gescannt — gewollt (liegt im Arbeitsbaum), Laufzeit nur messbar,
wenn gitleaks/Docker vorhanden.

**Skelett-CLAUDE.md** (lokal geändert, zweite Abweichung): im Abschnitt Befehle ein Satz „Node/TS: Gate-Vorlage
`docs/harness/gate-vorlage-node.md` bei der Stack-Entscheidung anwenden; bis dahin ist `npm run check` absichtlich
rot (`scripts/check-gates.mjs`).“ Skelett-ARCHITECTURE.md (lokal geändert): im §1-Kommentar derselbe Hinweis in einer
Zeile. Architekten-Rolle im Code unverändert.

**Tote SETUP.md-Verweise:** behoben durch Aufnahme von SETUP.md (Skelett-Scripts bleiben byte-gleich zum Template).

### 3 check:template in ai-workforce (F-701)
`check:template` = `node scripts/check-docs.mjs && node scripts/check-rules.mjs && node scripts/check-contract.mjs`.
Alle 16 entfernten Gates stehen schon in `check` (geprüft per Skript vor dem Schnitt, Liste im Bericht). Kopfkommentare
„Wird aufgerufen von: `npm run check`, `npm run check:template`“ der 13 betroffenen Gates auf `npm run check` kürzen.
CLAUDE.md-Beschreibung passt dann wörtlich.

### 4 Startvorlage aus dem Register (F-1009)
- Neue reine Funktion `ermittleStartvorlage({ umgebung, projekte, projekteBasis })` in `scripts/leitstand/`
  (`startvorlage-wahl.mjs`) → `{ pfad, herkunft: 'umgebung'|'register'|'standard' }`. Reihenfolge: Env
  `LEITSTAND_STARTVORLAGE_PFAD` (nicht leer) → Registereintrag mit `resolve(projekteBasis, repo_pfad) === projekteBasis`
  (dieselbe Regel wie `selbstEintrag`) → `STANDARD_STARTVORLAGE_PFAD` + `console.warn` (neu, nennt den fehlenden
  Eintrag); die F-391-Warnung bleibt unverändert und läuft danach.
- CLI-Bindeblock: Register zuerst laden, dann Startvorlage wählen (Reihenfolge tauschen; F-391-Block wandert hinter das
  Laden). Startzeile: `(Startvorlage: <pfad> — <Herkunft>, Projekte: …)`.
- Handler-Option `startvorlageHerkunft` (nur Default-Handler; Projekt-Instanzen implizit `register`) → `GET /api/code`
  Feld `startvorlage.herkunft` (über `baueStartvorlageAuszug`, additiv) und `/api/ressourcen` (`startvorlageHerkunft`,
  additiv).
- Anzeige an vorhandenen Stellen, kein neuer Bereich: „Womit gearbeitet wird“ → Unterzeile des Feldes Startvorlage
  „Profil … · aus dem Projektregister“; Capability Library → Satz „Aktiv geladene Startvorlage: … (aus dem
  Projektregister)“. Neue Schlüssel `startvorlage.herkunft.umgebung|register|standard` in de/en/ru/tr.
- Tests: Funktion (Env vor Register, Register, fehlender Eintrag, leere Env), Projektion (`herkunft` additiv),
  Anzeige-Test der Unterzeile; Render-Nachweis + design-guardian (UI berührt).

### 5 Nachrüsten (CLI)
`npm run projekt:nachruesten -- <Projektpfad> [--anwenden]` → `scripts/projekt-nachruesten.mjs` (dünn) →
`src/projekt-anlegen/nachruesten.ts` (Logik, getestet).
- **Pfadprüfung (Ablehnung mit Exit 2):** Pfad existiert, ist Ordner, realpath = Pfad (kein Symlink/Junction auf dem
  Weg; Muster `loeseZielordner`), liegt unter dem Elternordner der Installation (wie `POST /api/projekte`; für Tests
  injizierbar), ist NICHT die Installation selbst, ist Wurzel eines Git-Repos (`git rev-parse --show-toplevel` über
  `fuehreGitSync` aus `src/git-starter`, Vergleich über realpath).
- **Probelauf (Standard):** Liste je Skelett-Datei: `fehlt` / `gleich` / `weicht ab` (Hash-Vergleich, nur Meldung) /
  `Gruppe übersprungen` (Hook-Gruppe, wenn settings.json vorhanden). Hinweise zu `package.json`: fehlende Skripte
  (`check`, `check:template`, `lint`, `typecheck`, `test`) als Text, `package.json` selbst wird nie geschrieben (auch
  wenn sie fehlt → Hinweis). Schreibt nichts.
- **`--anwenden`:** kopiert nur `fehlt`-Dateien; vor jedem Schreiben: Ziel liegt im Projektpfad (realpath des
  nächstvorhandenen Elternordners innerhalb), Datei existiert nicht (`copyFileSync` mit `COPYFILE_EXCL` — kein
  Überschreiben auch bei Wettlauf). `.gitignore`/`package.json` nie. Kein Git-Schreibvorgang.
- **Pflichtzeile:** wenn `.claude/settings.json` kopiert wurde (bzw. im Probelauf kopiert würde):
  „.claude/settings.json neu → Startfreigabe für dieses Projekt neu erteilen“.
- Tests (`src/projekt-anlegen/nachruesten.test.ts`): Probelauf schreibt nichts (Verzeichnis-Snapshot vorher/nachher),
  `--anwenden` überschreibt keine vorhandene Datei (Inhalt + mtime), Pfad außerhalb der Basis abgelehnt, Junction im
  Projekt nach außen abgelehnt, Installation selbst abgelehnt, kein Git-Repo abgelehnt, Hook-Gruppe übersprungen bei
  vorhandener settings.json, Pflichtzeile genau dann.

### 6 Nachweise (`features/F45/nachweise/b1a2/`)
- `neues-projekt.md`: `kopiereBaseline` + `kopiereSkelett` + `schreibeStartvorlageUndProfil` in einen Temp-Ordner unter
  dem Scratchpad (Funktionsweg der Route; die Route selbst braucht Startfreigabe-Repo) → Dateiliste; `npm run check`
  rot mit Platzhalter-Meldung; Gate-Vorlage auf ein Mini-Beispiel (eine Funktion, ein Test) angewendet → grün
  (inkl. npm audit mit Lock-Datei); Secret-Scan: Hinweis belegt (gitleaks/Docker fehlen), Verdrahtung über Test.
- `nachruesten.md`: Kopie des Skelett-Stands `387f1a3` (`git archive 387f1a3 vorlagen/projekt-skelett`) als Projekt mit
  `git init`; Probelauf, `--anwenden`, Vorher/Nachher-Hashes aller vorhandenen Dateien gleich.
- `leitstand-start.md`: `npm run leitstand` ohne Env (eigener Port) → Startzeile mit `startvorlagen/ai-workforce.json —
  aus dem Projektregister`.

### 7 Risiken
- Hook-Gruppen-Regel ändert `kopiereSkelett` (bisher: jede fehlende Datei). Für neue Projekte identisches Ergebnis an
  settings.json/Hooks (Baseline gewinnt), nur ohne tote `.js`-Kopien. check-f42 (b) prüft „überschreibt nie“ mit einer
  Fixture-settings.json im Skelett — bleibt grün.
- Spikes (`spike-f36-*`) kopieren das ganze Skelett per `cpSync` → bekommen künftig settings.json + Hooks; nicht in
  check, nur Kopfkommentar-Hinweis? → nein, unverändert lassen und im Bericht nennen.
- Lokaler Secret-Scan mit `--no-git` über 140 MB `node_modules` per Docker auf Windows kann langsam sein (nicht messbar
  ohne Docker).
- Skelett-CI ruft `npm run check:template` (Template) — `check-gates` läuft in der Skelett-CI also nicht, bis SETUP.md
  Punkt 3 befolgt ist. Gewollt (Template-Fassung), im Gate-Vorlage-Text als Schritt genannt.

## Advisor-Pass (architecture-advisor, frischer Kontext, 11.10.2026)
Urteil **tragfähig mit Änderungen** (Freigabe unter Bedingung P1–P4). Entlastend belegt: Hook-Gruppe hält check-f42 (b)
und „überschreibt nie“; Baseline vor Skelett (neue Projekte bekommen nie die Template-settings.json, E-183 unverändert);
check:template-Schnitt ohne Abhängigkeiten; Template-Hooks blockieren im -p-Lauf nichts Nötiges; `beispielprojekt.json`
und `ai-workforce.json` tragen dieselben E-188-Felder. Prozesshinweis: Template-Dateien lagen vor dem Pass schon im
Skelett (nur Kopie, keine Logik) — HERKUNFT.md und die Gruppen-Regel müssen stehen, bevor ein Lauf gegen das echte
Skelett geht.

## Plan v2 (Änderungen gegenüber v1; der Rest gilt unverändert)

**P1 — Hooks am Verhalten prüfen, ESM beim Nachrüsten erkennen.**
- check-gates (d) neu gefasst: jeden in der settings.json referenzierten Hook der Form `node <pfad>` mit harmloser
  Eingabe (`{ cwd, session_id, tool_name: 'Bash', tool_input: { command: 'echo check-gates' } }`) starten, Exit 0
  verlangen, Zeitgrenze 10 s. Rot bei Absturz (z. B. `require` unter `"type": "module"`), fehlender Datei, Syntaxfehler.
  Andere Befehlsformen → Hinweis „nicht prüfbar“. Ohne settings.json → Hinweis.
- Nachrüsten: würde die Hook-Gruppe kopiert und hat das Ziel `"type": "module"` → Gruppe übersprungen mit Meldung
  (Template-Hooks sind CommonJS und stürzten unter type: module ab — Bremsen wären still offen; Hooks von Hand als `.cjs`
  einrichten). Test.
- Gate-Vorlage: kein pauschales „kein type: module“; stattdessen: geht, wenn die Hooks ohne `require` auskommen oder
  `.cjs` heißen — check-gates (d) prüft es.

**P2 — Hook-Gruppe ganz oder gar nicht.** Gruppe (settings.json + `.claude/hooks/**` des Skeletts) wird nur kopiert, wenn
KEINE ihrer Dateien im Ziel existiert; sonst ganz übersprungen, gemeldet als „vorhanden“ (settings.json da) bzw.
„teilweise vorhanden“. `planeSkelettKopie(skelettWurzel, ziel)` liest das Ziel (im Kopf dokumentiert, nicht „rein“).
`kopiereSkelett` nutzt sie und kopiert mit `COPYFILE_EXCL`. Tests für `kopiereSkelett`: Ziel mit settings.json bekommt
keine `.claude/hooks/*.js`; Ziel ohne settings.json bekommt die ganze Gruppe; Ziel mit fremdem Hook allein → Gruppe
übersprungen.

**P3 — Nachrüsten: Pfadprüfung schärfer.** Zusätzlich abgelehnt: verknüpfter Worktree (`git rev-parse --git-dir` ≠
`--git-common-dir`), common-dir gleich dem der Installation (Klon/Worktree von ai-workforce), Pfad mit einem Segment
`*-laeufe`. Installationswurzel über `import.meta.dirname`. `normalisierePfadFuerVergleich` aus `index.ts` exportiert und
wiederverwendet. `scripts/projekt-nachruesten.mjs` bleibt ohne Git (Git nur in `src/` über den Git-Starter). Hinweise zu
package.json nennen auch „`check` ruft `scripts/check-gates.mjs` nicht auf“.

**P4 — Tests in ai-workforce unter `scripts/`** (nie im Skelett, sonst kopiert): `scripts/skelett-check-gates.test.mjs`
mit (a) Platzhalter/fehlend/gefüllt, (b) ohne Lock (Hinweis), mit Lock grün/rot, Audit nicht ausführbar (rot, benannt),
(c) gitleaks/Docker/keins über injizierten Ausführer, (d) Hook ok / Hook stürzt ab / Datei fehlt; Untergrenze: pass < N,
fail > 0, kein TAP-Block, ungültiges Argument.

**Übernommene Hinweise.**
- Secret-Scan: `gitleaks`/`docker` über aufgelösten absoluten Pfad aus `PATH` (cwd wird nie durchsucht, Muster
  `findeGitProgramm`); Zeitgrenze (gitleaks 300 s, Docker 600 s). Echter Rotfall: Test schreibt zur Laufzeit eine
  Attrappe nach `os.tmpdir()` und scannt echt, wenn gitleaks oder Docker da ist (CI hat Docker) — sonst sichtbar
  übersprungen (`t.skip` mit Grund). check-gates.mjs bleibt ohne Abhängigkeiten, ohne Nebenwirkung beim Import.
- Gate-Vorlage: Schritt „`startvorlagen/<id>.json` des Projekts → `pruefbefehl` von `check:template` auf `check`“, sonst
  wirken die Gates nur für Menschen, nicht im Workforce-Prüfschritt (bis dahin gewollt).
- Nachweis neues Projekt zusätzlich: `npm run check:template` grün (echter Prüfbefehl neuer Projekte).
- Startvorlage aus dem Register: Pfad `resolve(projekteBasis, repo_pfad, startvorlage_pfad)` (für Anzeige repo-relativ);
  fehlende/ungültige Datei → **kein** stiller Rückfall, sichtbarer Startfehler. F-391-Text nennt den Registereintrag
  statt nur der Umgebungsvariable. Nachweis zeigt `startHinweis` leer.
- **Keine UI-Änderung** (Advisor-Empfehlung, übernommen): Der Pfad steht schon in „Womit gearbeitet wird“ und in der
  Capability Library und zeigt nach dem Fix `startvorlagen/ai-workforce.json`. Herkunft nur in Startzeile und additivem
  API-Feld (`GET /api/code` → `startvorlage.herkunft`). Damit keine neuen t()-Texte, kein Render-Nachweis, kein
  design-guardian. Als Entscheidung im Bericht genannt.
- Offenes Risiko (vorbestehend): zwischenstand-Hooks (Template und Baseline) starten bloßes `git`.

## Nachtrag Bau und Korrekturrunde (11.10.2026)
- **Abweichung von v2, bewusst:** das additive API-Feld `GET /api/code → startvorlage.herkunft` ist weggelassen — kein
  Verbraucher (keine UI-Änderung, Advisor-Empfehlung), YAGNI. Die Herkunft steht in der Startzeile; der Pfad selbst
  ist in „Womit gearbeitet wird“ und in der Capability Library sichtbar.
- Funde im Nachweis: eslint prüfte `.claude/hooks/` (Vorlage nimmt `.claude/**` aus); Nachrüsten-Vergleich meldete
  CRLF-only als Abweichung (jetzt zeilenenden-tolerant).
- Korrekturrunde nach code-reviewer/qa („nicht freigegeben“): package.json/.gitignore beim Nachrüsten nie anlegen;
  Kopierfehler je Datei sammeln (Bericht nennt Kopiertes und Fehler, Exit 1); Existenz über lstat (verwaiste Links);
  `findeProgramm` mit `path.win32`/`posix` je Zielplattform (Linux-Runner); gitleaks gefunden, aber nicht startbar → rot,
  Docker ohne Dienst → Hinweis mit echter Ursache; `$CLAUDE_PROJECT_DIR` im Hook-Probelauf; Test-Untergrenze wertet den
  letzten TAP-Block; `--ausgeben` meldet `?` bei fehlendem Template-Commit; Startabbruch bei kaputtem Registereintrag
  mit CLI-Test, Warnung unterscheidet „Register nicht geladen“; Pflichtzeile im Probelauf „würde neu“; Git-Fehlergrund
  aus stderr; Klon-Erkennung ehrlich als Grenze benannt.
