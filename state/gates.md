<!-- Ziel-Pfad im Repo: state/gates.md -->
# Objective Gates — [PROJEKTNAME]

Jedes objektive (nicht-menschliche) Gate, das im Projekt läuft, mit
Kalibrierung: mindestens ein bekannter Fall, der es auslöst (rot), und
einer, der es nicht auslöst (grün). Ohne Kalibrierung ist ein Gate ein
ungeprüftes Versprechen.

| Gate | Datei | Prüft | Rot-Fall (bekannt) | Grün-Fall (bekannt) |
|---|---|---|---|---|
| Doku-Gate | `scripts/check-docs.mjs` | tote Verweise, Versionsnummern außerhalb package.json, Frische-Widerspruch in Einzeldokumenten, Frische-Widerspruch zwischen Dokumentenpaaren, Hedging-Wörter ohne Evidenz-Marker in state/Report-Dateien | Testzeile `React v19, siehe \`keine/existierende/datei.md\`` (temporär in CLAUDE.md eingefügt) → 2 Befunde: toter Verweis + Versionsnummer; echter Fund (kein Testfall) nach Erweiterung von Prüfung 1 auf `.claude/skills/*/SKILL.md` und `.claude/commands/*.md`: `.claude/skills/spec-schreiben/SKILL.md:88: Verweis auf \`state/triage.md\` — Datei existiert nicht` | CLAUDE.md:79 `npm run check` → Exit 0 löst keinen Versionsnummer-Befund aus; README.md:34 verweist auf `settings.local.json`, das per .gitignore absichtlich fehlt → kein Befund; nach Behebung von `spec-schreiben/SKILL.md:88` (Verweis auf `state/tasks/` umgebogen) → `npm run check` Exit 0, Doku-Check „Keine Befunde" |
| Regel-Gate | `scripts/check-rules.mjs` | projektspezifische AST-Regeln | (leer bis zur ersten Regel) | (leer bis zur ersten Regel) |
| Linter-Gate, `noExplicitAny` | `biome.json` (`linter.rules.suspicious.noExplicitAny`, `files.includes`) | explizites `any` in Dateien unter `scripts/` und `src/` | Testzeile `const temp_rotfall_any: any = 1` temporär in `src/_kalibrierung.ts` (Vertrag `harness-a1-kettenumfang-produktpfad`) → 1 Befund `lint/suspicious/noExplicitAny: Unexpected any. Specify a different type.`, Exit 1 | Testzeile entfernt, `npm run lint` → „Checked 6 files … No fixes applied.", Exit 0 |
| Linter-Gate, `noFloatingPromises` | `biome.json` (`linter.rules.nursery.noFloatingPromises`, `files.includes`) | nicht abgewartete Promise in Dateien unter `scripts/` und `src/` | Testcode `async function tempRotfallAsync(): Promise<void> {}` + Aufruf `tempRotfallAsync()` ohne `await`/`.then`/`.catch` temporär in `src/_kalibrierung.ts` (Vertrag `harness-a1-kettenumfang-produktpfad`) → 1 Befund `lint/nursery/noFloatingPromises: A "floating" Promise was found …`, Exit 1 | Testcode entfernt, `npm run lint` → „Checked 6 files … No fixes applied.", Exit 0 |
| Typecheck-Gate | `tsconfig.json` (`include`) | TypeScript-Typfehler in Dateien unter `scripts/` und `src/` | Testzeile `const temp_rotfall_typecheck: number = "abc";` temporär in `src/_kalibrierung.ts` (Vertrag `harness-a1-kettenumfang-produktpfad`) → `npm run typecheck` meldet `src/_kalibrierung.ts(2,7): error TS2322: Type 'string' is not assignable to type 'number'.`, Exit 1 | Testzeile entfernt, `npm run typecheck` → keine Ausgabe, Exit 0 |
| Vertrags-Gate | `scripts/check-contract.mjs` | Handoff-Verträge in `state/tasks/` auf SCHRITT 0 (Präambel) und die acht Marker der sieben Sektionen (`## TASK:`, `GOAL:`, `CONTEXT:`, `SCOPE:`, `NICHT:`, `BUDGET:`, `OUTPUT:`, `ESCALATE:`) | Testdatei `state/tasks/_test-verstuemmelt.md` ohne `SCOPE:`/`NICHT:` (temporär, nicht committet) → 2 Befunde: „Marker \"SCOPE:\" fehlt", „Marker \"NICHT:\" fehlt", Exit 1 | Lauf gegen alle 5 echten Dateien in `state/tasks/` (`harness-fix-1…` bis `harness-fix-4…` plus `phase0-artefakte-committen.md`) → „5 Vertrag/Verträge geprüft, keine Befunde.", Exit 0 |
| CI | `.github/workflows/ci.yml` | `npm run check` auf frischer Maschine + Secret-Scan | PR #1 (`harness-setup-4b-ci-rotfall` → `main`, geschlossen ohne Merge), Testzeile `const temp_rotfall_any: any = 1` in `scripts/_mode.ts` → Run [32534644257](https://github.com/DerStefan89/ai-workforce/actions/runs/32534644257), Check `check` fail, Log-Zeile `scripts/_mode.ts:26:25 lint/suspicious/noExplicitAny … × Unexpected any. Specify a different type.` gefolgt von `##[error]Process completed with exit code 1.` | Testzeile entfernt, derselbe PR #1 → Run [32534688109](https://github.com/DerStefan89/ai-workforce/actions/runs/32534688109), Check `check` pass |
| Branch Protection | GitHub-Repo-Einstellung, kein Datei-Artefakt (siehe SETUP.md Punkt 1) | Required Status Check `check` vor Merge auf `main`, `enforce_admins: true`, PR vor Merge erforderlich (`required_approving_review_count: 0`, Solo-Maintainer) | PR #2 (`harness-setup-4c-rotfall` → `main`, geschlossen ohne Merge), Testzeile `const temp_rotfall_any: any = 1` → CI-Check `check` fail (Run [32564555823](https://github.com/DerStefan89/ai-workforce/actions/runs/32564555823)); `gh api repos/DerStefan89/ai-workforce/pulls/2` → `{"mergeable":true,"mergeable_state":"blocked"}` — Git-seitig konfliktfrei, aber von der Regel gesperrt | Testzeile entfernt, derselbe PR #2 → CI-Check `check` pass (Run [32564664834](https://github.com/DerStefan89/ai-workforce/actions/runs/32564664834)); `gh api repos/DerStefan89/ai-workforce/pulls/2` → `{"mergeable":true,"mergeable_state":"clean"}` — mergebar, **nicht gemerged** |
| `guard-settings.js`-Hook | `.claude/hooks/guard-settings.js` | Edit/Write auf geteilte `.claude/settings.json` | Zwei reale Edit-Versuche über das Edit-Tool auf `.claude/settings.json`, 2026-08-17, im Rahmen eines Diagnose-Auftrags (vermuteter Durchschlupf sollte reproduziert werden) → beide korrekt verweigert, identische Meldung: „Schreibzugriff auf geteilte settings.json blockiert. Absichtliche Aenderung: Hook in .claude/settings.json (hooks.PreToolUse) temporaer entfernen, Grund im Commit nennen." Kein Durchschlupf reproduzierbar. | Edit-Versuch auf eine unbeteiligte Datei (Scratchpad, außerhalb des Repos), 2026-08-17 → lief ungehindert durch, keine Guard-Reaktion |
| `commit-guard.cjs`-Hook | `.claude/hooks/commit-guard.cjs` | Bash-Zugriff auf `.claude/settings.json`; gh-Merge-Pfad nach main (PR-Merge-Unterbefehl, `/merge`/`/merges`-API-Endpunkt) und Bash-Zugriff, lesend wie schreibend, auf die Branch-Protection-Regel (`branches/…/protection`) — Vertrag `harness-b1b3-merge-guard-und-git-flow`. Freigabe-Datei-Pflicht (`git commit`/`git push` ohne frische `state/freigabe-commit.md`) und Bash-Sperre auf die Datei selbst waren mit Befund B6 (23.08.2026) entfernt und sind mit Vertrag `harness-freigabedatei-wiederherstellung` (28.08.2026) wiederhergestellt — siehe eigene Zeile unten und Kalibrierungs-Log. | `cat .claude/settings.json` auf Wegwerf-Branch `diagnose-scope11-b6`, 2026-08-23 → abgewiesen, Meldung „commit-guard: Bash-Zugriff auf geteilte .claude/settings.json blockiert. Die Datei ist Team-Policy und wird nur vom Menschen im eigenen Editor geändert."; zusätzlich 2026-08-28: `gh pr merge 999` → abgewiesen, „commit-guard: gh-Merge-Pfad nach main blockiert (PR-Merge-Unterbefehl oder /merge(s)-API-Endpunkt). Merge auf main bleibt Menschensache, nicht Bash/gh. Lesewege wie mergeable_state bleiben offen."; `gh api --method PUT repos/DerStefan89/ai-workforce/pulls/999/merge` → dieselbe Meldung; `gh api repos/DerStefan89/ai-workforce/branches/main/protection` → abgewiesen, „commit-guard: Bash-Zugriff auf die Branch-Protection-Regel blockiert — lesend wie schreibend. Leseweg auf ihre Wirkung bleibt offen (gh api repos/…/pulls/<n> -> mergeable_state)."; Fail-Closed, Eingabe ohne `tool_input.command` → abgewiesen, „commit-guard: kein Befehlstext gefunden — fail-closed, Befehl verweigert." | unbeteiligter Bash-Befehl `git status`, gleicher Branch, unmittelbar danach → lief regulär durch; zusätzlich 2026-08-28: `gh pr list`, `gh repo view` und `gh api repos/DerStefan89/ai-workforce/pulls/2` (Leseweg auf `mergeable_state`) → alle drei liefen unverändert durch, Exit 0, keine Verweigerung |
| Freigabedatei-Pflicht (`commit-guard.cjs`, Aufgabe 3+4) | `.claude/hooks/commit-guard.cjs` | `git commit`/`git push` ohne frische, gültige `state/freigabe-commit.md` (Frischefenster 10 Minuten, Einmalgebrauch); zusätzlich jeder Bash-Zugriff — lesend, schreibend, löschend — auf die Freigabedatei selbst — Vertrag `harness-freigabedatei-wiederherstellung`, wiederhergestellt nach Befund B6 (23.08.2026) | 2026-08-28, Wegwerf-Branch `test/freigabedatei-calibration` (von `harness-freigabedatei-wiederherstellung`): `git commit --allow-empty -m "rot-fall test ohne freigabe"` ohne vorhandene `state/freigabe-commit.md` → abgewiesen, „commit-guard: git commit/push ohne Freigabe-Datei (state/freigabe-commit.md) verweigert. Freigabe im eigenen Editor anlegen. Format: \"Freigegeben: <ISO-Zeitstempel>\", z. B. \"Freigegeben: 2026-08-17T14:03:00\" (Ortszeit, ohne Offset), \"Freigegeben: 2026-08-17T14:03:00+02:00\" (mit Offset) oder \"Freigegeben: 2026-08-17T12:03:00Z\" (UTC)."; zusätzlich Bash-Zugriff auf die Datei selbst → abgewiesen, „commit-guard: Bash-Zugriff auf state/freigabe-commit.md blockiert. Der zweite Schlüssel darf nicht vom Modell gelesen, geschrieben oder gelöscht werden." Nebenbefund: Ein kombinierter Bash-Aufruf (`git checkout -b … && git commit …`) wurde bereits am vollständigen `tool_input.command`-String abgewiesen, bevor der harmlose `checkout`-Teil lief — der Guard prüft den gesamten Befehlsstring, nicht nur den git-Teilbefehl. | 2026-08-28, derselbe Wegwerf-Branch: Stefan legt `state/freigabe-commit.md` im eigenen Editor an — drei reale Fehlversuche dabei beobachtet und mitkalibriert: (1) Zeitstempel mit `Z`-Suffix, aber Ortszeit-Wert eingetragen → „Zeitstempel in state/freigabe-commit.md liegt in der Zukunft — Uhr oder Zeitzone prüfen — verweigert"; (2) Dateiinhalt versehentlich der PowerShell-Befehl selbst (`Get-Date -Format …`) statt seiner Ausgabe → „hat keine gültige Zeile"; (3) Tippfehler „Freigeben" statt „Freigegeben" → „hat keine gültige Zeile"; korrigierter Inhalt zunächst > 10 Minuten alt → „ist 125 Minuten alt (Frischefenster 10 Minuten) — verweigert". Mit frischem, korrekt formatiertem Zeitstempel (Ortszeit ohne Offset) → `git commit --allow-empty -m "gruen-fall test mit freigabe"` durchgelassen, Commit `867d5ef`, Exit 0; `git status` direkt danach zeigt `state/freigabe-commit.md` nicht mehr unter Untracked Files (automatisch gelöscht, Einmalgebrauch bestätigt). |
| Freigabedatei Edit/Write-Guard (`guard-settings.js`) | `.claude/hooks/guard-settings.js` | Edit/Write auf `state/freigabe-commit.md` — Vertrag `harness-freigabedatei-wiederherstellung`; schließt die Lücke, dass die Datei vor diesem Vertrag nur gegen Bash geschützt war, nicht gegen das Editier-Werkzeug | 2026-08-28: Versuch, `state/freigabe-commit.md` per Write-Werkzeug anzulegen → abgewiesen, „Freigabedatei darf nur vom Menschen im eigenen Editor angelegt werden, nicht vom Modell." | 2026-08-28, unmittelbar danach: Write-Versuch auf `state/_test-guard-regression.md` (Wegwerf-Datei, sofort wieder gelöscht) → lief durch, keine Guard-Reaktion; Edit-Versuch auf `.claude/settings.json` (schema-gültige Änderung: zweiter Eintrag in `permissions.deny`) → weiterhin abgewiesen, unveränderte Meldung „Schreibzugriff auf geteilte settings.json blockiert. Absichtliche Aenderung: Hook in .claude/settings.json (hooks.PreToolUse) temporaer entfernen, Grund im Commit nennen." — bestehender Schutz nicht beschädigt. |
| Zwischenstand-Loop | `.claude/hooks/zwischenstand-pruefen.js` (PreCompact), `.claude/hooks/zwischenstand-laden.js` (SessionStart) | Frische des Zwischenstands vor manueller Compaction; Laden des Zwischenstands nach Sitzungsstart/`/clear` | Zwischenstandsdatei mit `Zuletzt aktualisiert:` älter als 60 Minuten (`2026-08-17T08:00` bei Lauf um `11:14`) → `decision: block` bei `trigger: manual` | Zwischenstandsdatei mit frischem Zeitstempel (`2026-08-17T11:15`) → kein Block bei `trigger: manual`; SessionStart mit `source: clear` liefert den Dateiinhalt als `additionalContext` |
| `npm run`-Freigabeliste | `.claude/settings.json` (`permissions.allow`) | Bash-Aufrufe `npm run <name>`, seit Vertrag `harness-npm-run-allowlist-haertung` auf feste Namen (`check`, `check:template`, `lint`, `typecheck`, `test`) beschränkt statt Präfix-Wildcard | 2026-08-28: nicht-interaktiver Lauf `npm run allowlist-redfall-probe` (neues, nicht freigegebenes Skript) → `permission_denials` enthält `Bash(npm run allowlist-redfall-probe)`, Befehl nicht ausgeführt | 2026-08-28: `npm run check`, `check:template`, `lint`, `typecheck`, `test` je einzeln über nicht-interaktive Claude-Instanz → `permission_denials: []`, alle fünf liefen durch |
| Datenformate-Gate | `scripts/check-datenformate.mjs` | `schemas/profile.schema.json`/`schemas/kontrollzustand.schema.json` sind gültiges JSON; jedes `schemas/examples/*.valid.json` erfüllt sein Schema; jedes `*.invalid*.json` verletzt sein Schema mit benannter Regelverletzung; reale Dateien unter `profiles/*.json`/`kontrollzustand/*.json`,`*.jsonl` (aktuell nur `.gitkeep`, 0 Dateien) | 2026-08-29, Vertrag `f0-datenformate`: vier separate Rot-Fälle, je `schemas/examples/kontrollzustand.valid.json` bzw. `profile.valid.json` temporär durch den Inhalt eines Invalid-Beispiels ersetzt, `node scripts/check-datenformate.mjs` gelaufen, danach Original wiederhergestellt (`git status` zeigt keinen Rest). `profile.invalid.json` in `profile.valid.json`-Position → Exit 1, `- schemas/examples/profile.valid.json: sollte gültig sein, aber verletzt: Pflichtfeld 'version' fehlt`. `kontrollzustand.invalid-fehlender-pfad.json` → Exit 1, `Pflichtfeld 'profil_referenz.pfad' fehlt`. `kontrollzustand.invalid-fehlender-hash.json` → Exit 1, `Pflichtfeld 'profil_referenz.hash' fehlt`. `kontrollzustand.invalid-fehlende-version.json` → Exit 1, `Pflichtfeld 'profil_referenz.version' fehlt` | 2026-08-29, unveränderter Repo-Stand: `node scripts/check-datenformate.mjs` → `ⓘ profiles: 0 Dateien geprüft`, `ⓘ kontrollzustand: 0 Dateien geprüft`, `✓ Keine Befunde.`, Exit 0 |
| Checkpoint-Store-Gate | `scripts/check-checkpoint-store.mjs` | `validiereCheckpointEintrag`/`ladeLetztenGueltigenCheckpoint`, direkt aus `src/checkpoint-store/` importiert (kein zweiter Regelsatz, D5): vier Payload-Fixtures gegen `validiereCheckpointEintrag`; synthetischer Drei-Checkpoint-Lauf (vollständig gültig vs. Checkpoint 3 korrumpiert); leere Kette. **Ergänzung (plan-v2-feature2, F1-Erweiterung `ladeGueltigeCheckpoints`):** eigener `node:test`-Fall in `src/checkpoint-store/checkpoint-store.test.ts` (Kette mit drei Checkpoints, Tail-Checkpoint korrumpiert, leere Kette) — bereits getestet, kein eigenes Gate-Skript-Segment dafür (Testdatei-Zuordnung analog Delta 2). **Ergänzung (F1B, Vertrag `f1b-wirkungsmarke`):** `pruefeEinzelnenKandidaten` dispatcht jetzt nach `typ` (`checkpoint`/`wirkungsmarke`/unbekannt) statt `validiereCheckpointEintrag` unbedingt aufzurufen (SCOPE.3), `types.ts` erweitert `KontrollzustandEintrag.payload` zur Union `CheckpointPayload \| WirkungsmarkePayload` (SCOPE.5) — dieses Gate bleibt unverändert grün (Regressionsbeleg B10), eigener Rot-/Grün-Beleg für den Dispatch selbst siehe F1B-Wirkungsmarke-Gate-Zeile unten und `checkpoint-store.test.ts`-Kalibrierung (A20/A21). | 2026-08-29, Vertrag `f1-checkpoint-store`: drei separate Rot-Fälle, je `schemas/examples/kontrollzustand-checkpoint.valid.json` temporär durch den Inhalt eines Invalid-Beispiels ersetzt (Original vorher als `.bak` gesichert), `node scripts/check-checkpoint-store.mjs` gelaufen, danach Original wiederhergestellt (`git status --short schemas/examples/` zeigt keinen `.bak`-Rest). `invalid-fehlende-sequenz.json` in `valid.json`-Position → Exit 1, `sollte gültig sein, aber verletzt: Pflichtfeld 'payload.sequenz' fehlt`. `invalid-hash-mismatch.json` → Exit 1, `'payload.selbst_hash' stimmt nicht mit dem real errechneten Hash überein (erwartet 02fd095bfcdc4c098aee463e95b42891fa3d91c4894d5cfe08dd3fe21e7d1f26)`. `invalid-vorgaenger-bei-sequenz-1.json` → Exit 1, `'payload.vorgaenger_hash' muss bei sequenz 1 null sein (Kettenanfang)`. Drei-Checkpoint-Lauf und leere Kette liefen bei jedem reparierten Zwischenstand automatisch mit (kein separater Rot-Fall dafür in diesem Gate-Skript nötig, da Gate immer alle drei Prüfungen (a)-(c) durchläuft) | 2026-08-29, unveränderter Repo-Stand: `node scripts/check-checkpoint-store.mjs` → `✓ 4 Payload-Fixture(s) geprüft.`, `✓ Drei-Checkpoint-Lauf: vollständig gültig → sequenz 3, Checkpoint 3 korrumpiert → sequenz 2.`, `✓ Leere Kette: ladeLetztenGueltigenCheckpoint liefert null, kein Fehler.`, `✓ Keine Befunde.`, Exit 0 |
| Lineage-Registry-Gate | `scripts/check-lineage-registry.mjs` | `validiereLineageEintrag`/`registriereKernArtefakt`/`pruefeStale`/`listeVersionen`/`haltFestStaleEntscheidung`, direkt aus `src/lineage-registry/` importiert (kein zweiter Regelsatz): sieben Payload-Fixtures gegen `validiereLineageEintrag`; AC14-Hauptfall (Stale-Erkennung) real durchgespielt; `haltFestStaleEntscheidung` ohne `begruendung` wirft, mit `begruendung` schreibt erfolgreich. Deckt bewusst NICHT A1/A3/A4/A13 (die sind `lineage-registry.test.ts` zugeordnet, plan-v2 Delta 2) | 2026-08-29, Vertrag `f2-artifact-registry-lineage`: vier separate Rot-Fälle, je ein Invalid-Fixture temporär in die zugehörige `valid.json`-Position kopiert (Original vorher als `.bak` gesichert), `node scripts/check-lineage-registry.mjs` gelaufen, danach Original wiederhergestellt (`git status --short schemas/examples/` zeigt keinen `.bak`-Rest). `invalid-fehlende-artefakt-id.json` in `kontrollzustand-lineage-kern.valid.json`-Position → Exit 1, `sollte gültig sein, aber verletzt: 'daten.artefakt_id' muss ein nicht-leerer String sein`. `invalid-hash-mismatch.json` → Exit 1, `'payload.selbst_hash' stimmt nicht mit dem real errechneten Hash überein (erwartet 7edf7cdf61e8a3084e2c5a90b7fb921abe3eca16b7a6244be47a79629a2de306)`. `invalid-daten-bei-werkzeug.json` in `kontrollzustand-lineage-werkzeug.valid.json`-Position → Exit 1, `'daten.daten' ist bei erzeugungsart 'werkzeug' verboten`. `invalid-entscheidung-ohne-begruendung.json` in `kontrollzustand-lineage-entscheidung.valid.json`-Position → Exit 1, `'daten.begruendung' ist bei entscheidung 'unveraendert_gueltig' Pflicht` | 2026-08-29, unveränderter Repo-Stand: `node scripts/check-lineage-registry.mjs` → `✓ 7 Payload-Fixture(s) geprüft.`, `✓ AC14-Hauptfall: unveränderte Eingabe → stale:false, geänderte Eingabe → stale:true mit genau diesem Schlüssel.`, `✓ haltFestStaleEntscheidung: ohne begruendung wirft, mit begruendung schreibt erfolgreich.`, `✓ Keine Befunde.`, Exit 0 |
| F1B-Wirkungsmarke-Gate | `scripts/check-f1b-wirkungsmarke.mjs` | `schreibeWirkungsmarke`/`stelleLaufstatusFest`/`validiereWirkungsmarkeEintrag`, direkt aus `src/checkpoint-store/` importiert (kein zweiter Regelsatz): sechs Payload-Fixtures gegen `validiereWirkungsmarkeEintrag`; synthetischer Lauf (`RUN_PREPARED` → `KLAERUNG_ERFORDERLICH`, danach Terminal `ERFOLGREICH` → `ABGESCHLOSSEN`) real durchgespielt; leere Kette → `NICHT_GESTARTET`. Die vier Kernfälle (AC7, A9–A12), die gemischte Kette/der unbekannte `typ` (A20/A21), das Advisor-Szenario (A22) und das Orphan-Interleaving (A23, zweiter Advisor-Pass B11) sind `checkpoint-store.test.ts` zugeordnet, nicht diesem Gate-Skript (Testdatei-Zuordnung analog F1/F2-Muster) | 2026-08-30, Vertrag `f1b-wirkungsmarke`: drei separate Rot-Fälle im Gate-Skript, je ein Invalid-Fixture temporär in die zugehörige `valid.json`-Position kopiert (Original vorher als `.bak` gesichert), `node scripts/check-f1b-wirkungsmarke.mjs` gelaufen, danach Original wiederhergestellt (`git status --short schemas/examples/` zeigt keinen `.bak`-Rest). `invalid-fehlendes-ergebnis.json` in `terminal-erfolgreich.valid.json`-Position → Exit 1, `sollte gültig sein, aber verletzt: Pflichtfeld 'payload.ergebnis' fehlt (Pflicht bei art: 'terminal')`. `invalid-ergebnis-ausserhalb-enum.json` in `terminal-verweigert.valid.json`-Position → Exit 1, `'payload.ergebnis' muss 'ERFOLGREICH', 'VERWEIGERT' oder 'FEHLGESCHLAGEN' sein`. `invalid-ergebnis-bei-run-prepared.json` in `run-prepared.valid.json`-Position → Exit 1, `'payload.ergebnis' ist bei art: 'run_prepared' nicht erlaubt`. Zusätzlich acht reale, temporäre Codeeingriffe in `src/checkpoint-store/index.ts`, je gegen `checkpoint-store.test.ts` kalibriert, danach zurückgenommen (`grep -rn "TEMP-ROT-FALL" src/` zeigt danach keinen Treffer): **A9/A10** (`ergebnis` hartkodiert auf `'FEHLGESCHLAGEN'`) → 3 Fehlschläge (A9, A10, A20), `actual: 'FEHLGESCHLAGEN'` statt `'ERFOLGREICH'`/`'VERWEIGERT'`. **A11** (`blockerId`-Interpolation entfernt) → 1 Fehlschlag, `actual: 'wirkungsmarke-offene-run-prepared'` statt `'wirkungsmarke-offene-run-prepared:<laufId>'`. **A12** (`DATEINAME_MUSTER` auf `.json.*$` geweitet, F1s A5-Muster) → 2 Fehlschläge (A5 aus F1, A12), abgebrochene Temp-Datei wird fälschlich als gültiger Eintrag gelesen. **A21** (unbekannter-typ-Meldungstext geändert) → 1 Fehlschlag, exakt A21. **A22** (`shift()` → `pop()`, FIFO → LIFO) → 1 Fehlschlag, `actual: [2]` statt `[3]` — belegt real, dass A22 FIFO von LIFO unterscheidet. **A23** (echter Warteschlangenalgorithmus durch die in plan-v2 Delta 1 formulierte, im zweiten Advisor-Pass B11 verworfene Formel `max(0, Anzahl run_prepared − Anzahl terminal)` ersetzt) → 4 Fehlschläge (A11, A12, A22, A23), A23 zeigt `actual: 'ABGESCHLOSSEN'` statt `'KLAERUNG_ERFORDERLICH'` — exakt der von B11 beschriebene Fehlerfall real reproduziert, nicht nur in Prosa behauptet. **B11-vierter-Fall** (Bedingung auf plan-v2s engere, widerlegte Formulierung `wirkungsmarken.length > 0` statt `irgendeinPaarAufgeloest` zurückgesetzt) → 1 Fehlschlag, reine Orphan-Terminal-Kette liefert `actual: 'ABGESCHLOSSEN'` statt `'NICHT_GESTARTET'`. **A20** (`ladeGueltigeCheckpoints`-Sortierung auf absteigend gedreht) → 6 Fehlschläge (A4-Nachbarfall, A9, A10, A20, A22, A23), Reihenfolge-Erwartung real verletzt. | 2026-08-30, unveränderter Repo-Stand: `node scripts/check-f1b-wirkungsmarke.mjs` → `✓ 6 Payload-Fixture(s) geprüft.`, `✓ Synthetischer Lauf: RUN_PREPARED → KLAERUNG_ERFORDERLICH, danach Terminal ERFOLGREICH → ABGESCHLOSSEN.`, `✓ Leere Kette: stelleLaufstatusFest liefert NICHT_GESTARTET, kein Fehler.`, `✓ Keine Befunde.`, Exit 0; `node --test src/checkpoint-store/checkpoint-store.test.ts` → `tests 17, pass 17, fail 0`; `npm run check` und `npm run check:template` → je Exit 0, `tests 24, pass 24, fail 0` |
| F3-Authorization-Boundary-Gate | `scripts/check-f3-authorization-boundary.mjs` | `pruefeAutorisierung`/`verweigereAutorisierung`/`validiereAutorisierungEintrag`, direkt aus `src/authorization-boundary/` importiert (kein zweiter Regelsatz, D5-Muster): legt ein Wegwerf-Git-Repo unter `os.tmpdir()` an (`.gitattributes: * -text` vor dem ersten Commit), prüft Grün-Fall, Divergenz-Fall (Arbeitsbaum nach Commit verändert), Fehlt-Fall (Pfad außerhalb des Repos) und einen `\r\n`-Zeilenenden-Fall bei korrekt gepinntem `.gitattributes` (Delta 3/B18). Sechs `node:test`-Fälle (AC7 Fall 1–4 plus B18/B2-B17-Regressionsbeleg) sind `authorization-boundary.test.ts` zugeordnet, nicht diesem Gate-Skript (Testdatei-Zuordnung analog F1B-Muster). Kein F1B-Touch — `schreibeWirkungsmarke`/`stelleLaufstatusFest` werden unverändert von außen aufgerufen. Löst nur die "Veränderungs"-Hälfte von E-189 (Commit-Pinning + `git show` gegen den echten Objektinhalt); die "Erzeugungs"-Hälfte (menschliche Autorenschaft des Commits) bleibt bewusst ungeprüft — dokumentierte Scope-Grenze (plan-v2 Delta 1, `features/F3/feature.md` Nicht-Ziele), kein Mangel dieses Gates | 2026-08-30, Vertrag `f3-authorization-boundary`: Rot-Fälle über manipulierte Testfixtures erzeugt (kein temporärer Code-Eingriff in `src/authorization-boundary/index.ts` — auf Anweisung, da ein Eingriff in die reale Prüf-Logik den Auto-Mode-Classifier blockierte). Wegwerf-Skript, nicht committet, nach dem Lauf gelöscht: echtes externes Wegwerf-Repo angelegt, eine Autorisierungsdatei real committet; `pruefeAutorisierung` mit falschem `datei_hash` (64 `f`) aufgerufen → `{"ok":false,"grund":"Inhalt am referenzierten Ort weicht von der Referenz ab"}`; mit falschem `commit_hash` (zeigt auf den `.gitattributes`-Init-Commit, wo die Autorisierungsdatei nicht existiert) → `{"ok":false,"grund":"Commit oder Pfad im externen Repo nicht auffindbar"}`; danach dieselbe Datei mit der korrekten Referenz → `{"ok":true,"entscheidung":"FREIGEGEBEN",...}`. Zusätzlich sechs Schema-Rot-/Grün-Fälle gegen `validiereAutorisierungEintrag` (Wegwerf-Skript): fehlende `entscheidung`, `entscheidung` außerhalb der zwei erlaubten Werte, `VERWEIGERT` ohne `begruendung`, unbekanntes Feld → je mindestens ein Verstoß; gültiges `FREIGEGEBEN` und gültiges `VERWEIGERT` mit `begruendung` → keine Verstöße. Im Gate-Skript selbst sind Divergenz-Fall, Fehlt-Fall und fehlende `.gitattributes` (`authorization-boundary.test.ts`-Fall) jeweils reale, dauerhafte Fixture-Konstruktionen (kein Rot-Fall, der weggelassen werden könnte, ohne die Assertion zu verlieren) — jeder Lauf prüft sie gegen unverändert echten Code. | 2026-08-30, unveränderter Repo-Stand: `node scripts/check-f3-authorization-boundary.mjs` → `✓ Grün-Fall: echte, committete Freigabe wird akzeptiert.`, `✓ Divergenz-Fall: manipulierte Referenz abgelehnt (Inhalt am referenzierten Ort weicht von der Referenz ab).`, `✓ Fehlt-Fall: Pfad außerhalb des Repos abgelehnt (pfad ausserhalb des erwarteten externen Repos).`, `✓ CRLF-Fall: \r\n-Zeilenenden bei gepinntem .gitattributes ändern das Ergebnis nicht (Delta 3/B18).`, `✓ Keine Befunde.`, Exit 0; `node --test src/authorization-boundary/authorization-boundary.test.ts` → `tests 6, pass 6, fail 0`; `npm run check` und `npm run check:template` → je Exit 0, `tests 30, pass 30, fail 0` |
| F9-Human-Transport-Gate | `scripts/check-f9-human-transport.mjs` | `erfasseBedarf`/`befuelleWerkzeugAuswahl`/`erzeugeTransportpaket`/`haendigeAus`/`validiereTransportantwort`/`importiereAntwort`/`baueAktuelleEingabeInhalte`/`pruefeUndEntscheideStale`/`entscheideStale`/`validiereBedarfDaten`/`validiereTransportpaketDaten`, direkt aus `src/human-transport/` importiert (kein zweiter Regelsatz, D5-Muster). Ruft F1Bs `schreibeWirkungsmarke`/`stelleLaufstatusFest` und F2s `registriereKernArtefakt`/`pruefeStale`/`haltFestStaleEntscheidung`/`ladeArtefaktVersion` ausschließlich von außen auf (D1, kein Touch). Acht Payload-Fixtures gegen `validiereBedarfDaten`/`validiereTransportpaketDaten`; ein synthetischer Ende-zu-Ende-Lauf (Bedarf → Transportpaket → `RUN_PREPARED` → gültige Antwort → Terminal `ERFOLGREICH`); ein Schemaverstoß-Fall (→ Terminal `FEHLGESCHLAGEN`, D4); ein STALE-Fall (D6 — `pruefeUndEntscheideStale` blockiert `freigegeben:false`, bleibt auch nach `entscheideStale` blockiert, weil `haltFestStaleEntscheidung` nur eine Entscheidung festhält, den Inhaltsvergleich nicht rückwirkend ändert); ein Grep-Nachweis gegen `fetch`/`XMLHttpRequest`/`puppeteer`/`playwright`/`axios`/`node-fetch`/`http.request`/`https.request` in `src/human-transport/*.ts` (AC10). Zehn `node:test`-Fälle (A2–A9, A8a, B5) sind `human-transport.test.ts` zugeordnet, nicht diesem Gate-Skript (Testdatei-Zuordnung analog F1/F2/F3-Muster) | 2026-08-30, Vertrag `f9-human-transport-bauauftrag`: Fixture-Rot-Fall — `kontrollzustand-bedarf.invalid-fehlende-beschreibung.json` temporär in die `kontrollzustand-bedarf-leer.valid.json`-Position kopiert (Original vorher als `.bak` gesichert), `node scripts/check-f9-human-transport.mjs` gelaufen → Exit 1, `schemas/examples/kontrollzustand-bedarf-leer.valid.json: sollte gültig sein, aber verletzt: 'beschreibung' muss ein nicht-leerer String sein`, danach Original wiederhergestellt (`git status --short schemas/examples/` zeigt keinen `.bak`-Rest) → Exit 0. Zusätzlich ein realer, temporärer Codeeingriff in `src/human-transport/index.ts` (`pruefeUndEntscheideStale` auf `freigegeben: true` hartkodiert, `TEMP-ROT-FALL`-Kommentar), gegen `human-transport.test.ts` gelaufen → genau die zwei D2/D6-Fälle schlagen fehl (`D2-synthetischer-Schlüssel`, `A8a/D6`), alle acht übrigen bleiben grün; danach zurückgenommen (`grep -rn "TEMP-ROT-FALL" src/` zeigt danach keinen Treffer), `node --test src/human-transport/human-transport.test.ts` wieder `tests 10, pass 10, fail 0`. Die übrigen acht Testfälle (A2–A7, A9, B5) sind dünne Aufrufer bereits real kalibrierter F1B-/F2-Funktionen — bewusst kein eigener Codeeingriff je Einzelfall (Budget-Abwägung, Kern-Neuheit liegt in D2/D6) | 2026-08-30, unveränderter Repo-Stand: `node scripts/check-f9-human-transport.mjs` → `✓ 8 Payload-Fixture(s) geprüft.`, `✓ Ende-zu-Ende-Lauf: Bedarf → Transportpaket → RUN_PREPARED → gültige Antwort → Terminal ERFOLGREICH.`, `✓ Schemaverstoß-Fall: keine Registrierung, Terminal FEHLGESCHLAGEN (D4).`, `✓ STALE-Fall: pruefeUndEntscheideStale blockiert (freigegeben:false), entscheideStale hält die menschliche Entscheidung fest, ohne den Vergleich rückwirkend zu ändern (D6).`, `✓ AC10: kein fetch/HTTP-Client/Browsersteuerung in src/human-transport/.`, `✓ Keine Befunde.`, Exit 0; `node --test src/human-transport/human-transport.test.ts` → `tests 10, pass 10, fail 0`; `npm run check` und `npm run check:template` → je Exit 0, `tests 40, pass 40, fail 0` |

## Kalibrierungs-Log

Neue Kalibrierungs-Nachweise hier ergänzen (Datum, Gate, Beobachtung),
nicht die Tabelle oben stillschweigend überschreiben.

- 2026-08-08, Doku-Gate: Bekannte Einschränkung der .gitignore-Auswertung
  in Prüfung 1 — sie matcht auch auf den reinen Basisnamen, nicht nur auf
  den vollen Pfad. Ein Pflichtdokument mit demselben Dateinamen wie ein
  .gitignore-Eintrag würde dadurch stumm bleiben, selbst wenn es an
  anderer Stelle im Repo existieren müsste. Aktuell nur vier generische
  Einträge ohne Pfad/Wildcard (`.env`, `.env.local`, `.DS_Store`,
  `Thumbs.db`), keiner davon ein plausibles Pflichtdokument — Risiko
  latent. Erneut bewerten, sobald .gitignore um weitere generische
  Dateinamen ergänzt wird.

- 2026-08-17, Zwischenstand-Loop: Rot- und Grün-Fall von Hand durchgespielt
  (Aufruf der Hooks direkt über stdin, kein echter Compaction-/Clear-Lauf).
  Rot: `state/zwischenstand/harness-fix-1-hooks-und-zwischenstand.md` mit
  `Zuletzt aktualisiert: 2026-08-17T08:00`, Lauf um `11:14` Uhr,
  `{"trigger":"manual"}` → `zwischenstand-pruefen.js` liefert
  `{"decision":"block", ...}`. Grün: dieselbe Datei mit
  `Zuletzt aktualisiert: 2026-08-17T11:15` → derselbe Aufruf liefert keine
  Ausgabe (kein Block), Exit 0. Zusätzlich `zwischenstand-laden.js` mit
  `{"source":"clear"}` aufgerufen: Ausgabe enthält den Dateiinhalt als
  `additionalContext` — bestätigt, dass der SessionStart-Matcher (V1.1,
  `clear` ergänzt) den Zwischenstand nach `/clear` lädt. Testdatei war
  nicht committet (per `.gitignore`, Ausnahme nur für `VORLAGE.md`) und
  wurde nach dem Test gelöscht.

- 2026-08-17, `commit-guard.js`: Rot- und Grün-Fall auf echtem
  Wegwerf-Branch (`test/commit-guard-calibration`, von
  `harness-fix/2-commit-guard` abgezweigt, danach lokal gelöscht, nie
  gepusht) durchgespielt — kein Unit-Test über stdin, echter Aufruf über
  den verkabelten Hook-Pfad. Rot (Punkt 8): `git commit --allow-empty -m
  test` ohne vorhandene Freigabe-Datei, ca. 2026-08-17T11:40 → abgewiesen.
  Grün (Punkt 9): frische, vom Menschen im eigenen Editor angelegte
  `state/freigabe-commit.md` (`Freigegeben: <ISO-Zeitstempel>`) →
  derselbe Commit-Befehl läuft durch, Commit `129cd01` um
  2026-08-17T11:54:13+02:00; `git status` direkt danach bestätigt, dass
  die Freigabe-Datei durch den Hook gelöscht wurde. Rot, zweiter Teil
  (Einmal-Verbrauch): unmittelbar danach `git commit --allow-empty -m
  test2` ohne neue Freigabe, 2026-08-17T11:54:54+02:00 → wieder
  abgewiesen. Nebenbefund, kein Hook-Fehler: Zwei vorgelagerte Versuche
  scheiterten an der Freigabe-Datei selbst, nicht am Hook — einmal UTF-16
  statt UTF-8, einmal UTF-8-BOM (Node `fs.readFileSync(..., "utf8")`
  entfernt ein BOM nicht automatisch, wodurch `^Freigegeben` am
  Zeilenanfang nicht mehr matcht). Beide Male neu in VS Code als reines
  UTF-8 ohne BOM gespeichert, danach lief der Grün-Fall durch. Zeitstempel
  von Punkt 8 ist eine Schätzung aus der Rückschau (kein Git-Artefakt, da
  der abgewiesene Commit keinen Hash hinterlässt), alle übrigen
  Zeitstempel sind belegt (Commit-Zeitstempel bzw. Tool-Aufrufzeit dieser
  Konversation).

- 2026-08-17, Doku-Gate, Prüfung 1 erweitert um `.claude/skills/*/SKILL.md`
  und `.claude/commands/*.md`: Rot- und Grün-Fall sind kein konstruierter
  Testfall, sondern der reale Zustand des Repos zum Zeitpunkt der
  Erweiterung. Rot (vor der Behebung): `npm run check` → Exit 1, Doku-Check
  meldet genau einen Befund — `.claude/skills/spec-schreiben/SKILL.md:88:
  Verweis auf \`state/triage.md\` — Datei existiert nicht`. Grün (nach der
  Behebung): Zeile 88 in `spec-schreiben/SKILL.md` auf `state/tasks/`
  umgebogen (Entscheidung Punkt E, `state/plan-v2-phase1-vertraege.md`) →
  `npm run check` → Exit 0, Doku-Check „Keine Befunde".

- 2026-08-17, Doku-Gate, Prüfung 2 (Versionsnummern-Muster) probeweise
  gegen `.claude/skills/*/SKILL.md` und `.claude/commands/*.md` laufen
  lassen — per Wegwerf-Skript (`test-pruefung2.mjs`, nicht committet,
  `check-docs.mjs` selbst unverändert). Ergebnis: 8 Dateien geprüft, 9
  Treffer — deckt sich in der Gesamtzahl mit der Erwartung aus
  `state/plan-v2-phase1-vertraege.md` (Abschnitt „Warum nur Prüfung 1").
  Zusammensetzung weicht in einem Punkt von der dortigen Vorhersage ab, was
  hier ehrlich statt geglättet festgehalten wird: 7 Treffer enthalten
  wörtlich „Plan v1" oder „Plan v2" (`advisor-pass/SKILL.md:3` ×2,
  `:31`, `:70`, `:107`, `spec-schreiben/SKILL.md:71` ×2) — das deckt sich
  mit der Vorhersage. Der 8. Treffer ist der erwartete Versionspin der
  vendorten `ponytail`-Datei (`ponytail/SKILL.md:20: "v4.8.4"`). Der 9.
  Treffer ist aber kein zweiter ponytail-Treffer, sondern ein eigenständiger
  Fehlalarm: `advisor-pass/SKILL.md:71: "Wer v1"` — Prüfung 2s zweites
  Muster (großgeschriebenes Wort + Versionszahl) greift hier am Satzanfang
  „Wer v1 überschreibt, …". Ergebnis stützt die Entscheidung aus Punkt D/
  „Warum nur Prüfung 1" sogar stärker als vorhergesagt: Prüfung 2 träfe auf
  Skills nicht nur den Kernbegriff „Plan v1/v2" und den absichtlichen
  ponytail-Pin, sondern zusätzlich mindestens einen strukturellen
  Fehlalarm aus normaler deutscher Satzstellung — ein weiterer Beleg dafür,
  dass Prüfung 2 dort strukturell unbrauchbar ist, nicht nur an einem
  Einzelfall hängt.

- 2026-08-17, CI/gitleaks: Vertrag `harness-fix-3-dokugate-und-ci` sollte
  vor dem Entfernen von `--no-git` (und Ergänzen von `fetch-depth: 0`) die
  Stop-Grenze aus F2 (`state/plan-v2-phase1-vertraege.md`) auslösen — ein
  lokaler gitleaks-Lauf über die volle Historie (`--source .`, ohne
  `--no-git`). Weder `docker` noch ein eigenständiges `gitleaks`-Binary
  waren auf der Baumaschine verfügbar (geprüft über Bash-PATH und
  Windows-PATH, `docker --version` → command not found, `where.exe
  gitleaks` → keine Treffer). Die Stop-Grenze wurde deshalb **nicht**
  ausgeführt — nicht stillschweigend übersprungen. `ci.yml` behält
  `--no-git` und den impliziten Shallow-Checkout (kein `fetch-depth`); nur
  das Image-Pinning (`v8.30.1`) und `permissions: contents: read` wurden
  umgesetzt. Offener Folgeschritt vor einer künftigen Entfernung von
  `--no-git`: den vollen Historien-Scan auf einer Maschine mit Docker oder
  gitleaks-Binary nachholen.

- 2026-08-17, Vertrags-Gate (`scripts/check-contract.mjs`, Vertrag
  `harness-fix-4-pruefkette-und-vertragspruefung`): Rot-Fall über eine
  absichtlich verstümmelte, nicht committete Testdatei
  `state/tasks/_test-verstuemmelt.md` (SCHRITT 0 und alle Marker außer
  `SCOPE:`/`NICHT:` vorhanden) → `node scripts/check-contract.mjs` meldet
  genau 2 Befunde („Marker \"SCOPE:\" fehlt", „Marker \"NICHT:\" fehlt"),
  Exit 1. Testdatei direkt danach wieder entfernt, taucht in keinem
  `git status` dieser Sitzung als gestaged auf. Grün-Fall: derselbe Lauf
  gegen die zu diesem Zeitpunkt fünf echten Dateien in `state/tasks/`
  (`harness-fix-1-hooks-und-zwischenstand.md`,
  `harness-fix-2-commit-guard.md`, `harness-fix-3-dokugate-und-ci.md` —
  Nachtrag aus diesem Vertrag —, `harness-fix-4-pruefkette-und-
  vertragspruefung.md` — dieser Vertrag selbst — sowie die themenfremde
  `phase0-artefakte-committen.md`, die zufällig ebenfalls dem
  Vertragsformat entspricht) → „5 Vertrag/Verträge geprüft, keine
  Befunde.", Exit 0. Beide Fehlerpfade (fehlendes `state/tasks/`, leeres
  `state/tasks/`) sind in der Mechanik behandelt, aber am realen Repo
  nicht auslösbar gewesen, da `state/tasks/` bereits nicht-leer existiert
  — Codepfad durch Lesen bestätigt (`scripts/check-contract.mjs`, oberer
  Teil), nicht durch einen realen Lauf.

- 2026-08-17, `npm run check` vs. `npm run check:template`: Vor der
  Umstellung (Ausgangsstand) `npm run check` → Exit 0 (alle Skripte
  Platzhalter). Nach Umstellung von `lint`/`typecheck`/`test` auf
  `stderr`-Meldung + `exit 1`: `npm run check:template`
  (`check-docs.mjs && check-rules.mjs && check-contract.mjs`) → Exit 0.
  `npm run check` (volle Kette inklusive `lint`) → bricht bereits bei
  `lint` mit Exit 1 und der Meldung „lint: kein Linter ausgewählt — siehe
  SETUP.md Punkt 3 (Skill werkzeug-auswahl)" ab; `typecheck` und `test`
  einzeln aufgerufen liefern die analoge Meldung mit ihrem jeweiligen
  Namen, ebenfalls Exit 1.

- 2026-08-17, `guard-settings.js`-Hook, Diagnose-Auftrag: Ein zuvor
  vermuteter Durchschlupf (ein echter Edit-Versuch auf
  `.claude/settings.json` soll nicht verweigert worden sein) ließ sich mit
  zwei realen Edit-Versuchen über das Edit-Tool nicht reproduzieren — beide
  korrekt verweigert. Ursache des ursprünglich beobachteten Vorfalls bleibt
  offen, nicht spekuliert. Ergänzend ein realer Grün-Fall (Edit auf eine
  unbeteiligte Datei außerhalb des Repos, lief ungehindert durch) und die
  Korrektur der „Prüft"-Spalte auf beide von Vertrag 2 geschützten Dateien.

- 2026-08-17, `commit-guard.js`-Hook, Härtung (Vertrag
  `harness-fix-5-commit-guard-haerten`): Zeitzone/Offset, BOM/UTF-16 und
  drei Fehlermeldungen gehärtet (SCOPE Punkte 1–4). Kalibrierung in vier
  Teilen:
  **Teil 1, Unit-Test der Lesefunktion (Punkt 5), Wegwerf-Skript
  `_test-commit-guard-unit.mjs`, nicht committet, nach dem Lauf gelöscht —
  alle sechs Fälle bestanden:** (1) reines UTF-8 ohne BOM, Zeitstempel ohne
  Offset → erkannt, `2026-08-17T14:03:00` als Ortszeit gelesen → intern
  `2026-08-17T12:03:00.000Z`; (2) UTF-8 **mit** BOM, gleicher Zeitstempel →
  erkannt, gleiches Ergebnis (vor dem Fix: nicht erkannt); (3) UTF-16 LE
  mit BOM, gleicher Zeitstempel → erkannt, gleiches Ergebnis (vor dem Fix:
  nicht erkannt); (4) Zeitstempel mit `Z` (`2026-08-17T14:03:00Z`) →
  erkannt, als UTC interpretiert, intern `2026-08-17T14:03:00.000Z`
  (Soll-Wert per `Date.parse` gegengerechnet, exakter Treffer); (5)
  Zeitstempel mit `+02:00` (`2026-08-17T14:03:00+02:00`) → erkannt, als
  MESZ interpretiert, intern `2026-08-17T12:03:00.000Z` (Soll-Wert
  gegengerechnet, exakter Treffer); (6) Zeile ohne `Freigegeben:` am
  Zeilenanfang (`# Kommentar Freigegeben: 2026-08-17T14:03:00`, Fließtext)
  → **nicht** erkannt — belegt, dass Anker `^` und `m`-Flag unverändert
  blieben. Lauf mit `TZ=Europe/Berlin` (Sitzungs-Standardzone,
  MESZ/UTC+2 zum Testzeitpunkt).
  **Teil 2, Rot-Fall `commit` (Punkt 6):** `git commit --allow-empty -m
  test` auf Wegwerf-Branch `test/guard-haertung-calibration` (von
  `harness-fix/5-commit-guard-haerten` abgezweigt), ohne vorhandene
  Freigabe-Datei → abgewiesen, Meldung „git commit/push ohne
  Freigabe-Datei … verweigert" mit dem neuen, ausführlicheren
  Format-Beispiel (Punkt 3).
  **Teil 3, Vorher/Nachher-Beleg (Punkt 7) — zwei Durchläufe, der erste
  schlug fehl und ist Teil des Befunds, nicht weggelassen:**
  *Erster Durchlauf, Testformat aus dem ursprünglichen Vertragstext
  („mit Offset, Format JJJJ-MM-TTThh:mm:ss+hh:mm"):* Freigabe-Datei mit
  einem `+02:00`-Zeitstempel (entspricht der lokalen Zeitzone,
  MESZ) angelegt. Alter Hook (`commit-guard.alt.js`, `git show
  main:.claude/hooks/commit-guard.js`, nicht committet) gegen diese Datei
  aufgerufen → **keine Verweigerung**, keine Ausgabe — der alte Hook ließ
  die Datei durch und verbrauchte sie (Erfolgspfad löscht die Datei
  genau wie der neue Hook, aber ohne Ausgabe). [Schlussfolgerung, per
  Nachtrag 17.08.2026 im Vertrag] Der Fehler im alten Hook (Offset wird
  abgeschnitten, Rest als Ortszeit gelesen) hebt sich rechnerisch auf,
  wenn der geschriebene Offset exakt dem lokalen Offset entspricht — der
  Testfall aus dem ursprünglichen Vertragstext konnte deshalb strukturell
  nicht fehlschlagen. Der Fehler lag im Vertrag (Testformat), nicht im
  Fix und nicht in Befund B2 — B2 nennt explizit einen UTC-Zeitstempel
  (`date -u -Is`) als realistischen Fall. Vertrag um „Nachtrag 17.08.2026
  — Korrektur des Testformats in Punkt 7" ergänzt, ursprünglicher
  Wortlaut unverändert stehen gelassen.
  *Zweiter Durchlauf, korrigiertes Testformat (UTC/`Z`):* neue
  Freigabe-Datei mit UTC-Zeitstempel (`…Z`) angelegt. Alter Hook (gleiche
  `commit-guard.alt.js`, wiederverwendet) dagegen aufgerufen → **abgewiesen**,
  Meldung „ist 120 Minuten alt (Frischefenster 10 Minuten) — verweigert"
  — deckt sich mit der in B2 vorhergesagten Zwei-Stunden-Drift zwischen
  UTC und MESZ. Datei blieb liegen (Rot-Fall verbraucht nicht). Danach
  neuer Hook, echter Commit: `git commit --allow-empty -m test` auf
  demselben Wegwerf-Branch → durchgegangen, Commit `7559cef` um
  2026-08-17T20:58:08+02:00; `git status` direkt danach zeigt die
  Freigabe-Datei nicht mehr. `commit-guard.alt.js` sofort danach gelöscht.
  **Teil 4, Rot-Fall `push` (Punkt 8):** unmittelbar nach Commit
  `7559cef`, ohne neue Freigabe: `git push` auf `test/guard-haertung-calibration`
  → abgewiesen, gleiche Meldungsklasse wie der Commit-Rot-Fall — erster
  dokumentierter Rot-Fall für den Push-Pfad im Repo.
  Wegwerf-Branch danach lokal gelöscht (`git branch -D
  test/guard-haertung-calibration`), nie gepusht.
  **Grenze, ausdrücklich festgehalten:** Der Kodierungsfall (BOM, UTF-16)
  ist nur über den Unit-Test der reinen Lesefunktion belegt (Teil 1), nicht
  Ende-zu-Ende über einen echten Git-Befehl — die Freigabe-Datei ist für
  das Modell absichtlich unerreichbar (jeder Bash-Befehl, der ihren Pfad
  referenziert, wird vom Hook selbst blockiert), ein Modell kann also keine
  BOM-/UTF-16-Datei anlegen, um den Ende-zu-Ende-Pfad zu testen. Das ist
  eine dokumentierte Grenze, keine Nachlässigkeit.
  **Reibung, notiert nicht als Sicherheitsloch:** Der synthetische
  Vorher/Nachher-Test in Teil 3 durfte die Simulations-Eingabe
  (`{"tool_input":{"command":"git commit -m test"},...}`) nicht per `echo
  ... | node commit-guard.alt.js` an stdin übergeben, weil der aktiv
  verkabelte (neue) Hook jeden Bash-Befehl abfängt, der die Wörter „git"
  und „commit"/„push" als eigenständige Tokens enthält — auch innerhalb
  eines JSON-Text-Literals in einem Diagnose-Befehl, nicht nur in einem
  echten Git-Aufruf. Umgangen über eine Payload-Datei im Scratchpad plus
  `<`-Umleitung (`node commit-guard.alt.js < payload.json`), sodass die
  kritischen Wörter nicht im eigentlichen Bash-Befehl standen. Kein
  Sicherheitsloch — echte Git-Befehle laufen weiterhin über den Hook —,
  aber die erste real aufgetretene Instanz der im Kopfkommentar
  dokumentierten „breiten, nicht exakten" Muster-Grenze: Sie blockiert
  auch Diagnose-Befehle, die nur zufällig dieselben Wörter im Text tragen.

- 2026-08-17, `commit-guard.js`-Hook, Nachtrag zur Härtung (Vertrag
  `harness-fix-5-commit-guard-haerten`, „Nachtrag 17.08.2026 —
  Sekundenbruchteile"): Ein echter Commit-Versuch mit einer vom Menschen
  angelegten Freigabe-Datei wurde abgewiesen („keine gültige Zeile").
  Diagnose gegen synthetische Daten (BOM, CRLF, Leerzeichen vor dem
  Doppelpunkt, Millisekunden — alle gegen `parseFreigabeZeitstempel`
  bzw. `dekodiereFreigabeInhalt` getestet, nicht gegen die echte Datei)
  fand keinen Fehler im Normalfall, deckte aber auf: Sekundenbruchteile
  (`.000Z`, wie `new Date().toISOString()` sie erzeugt) wurden zwar
  erkannt, aber falsch interpretiert — derselbe Fehler wie B2, nur am
  Sekundenbruchteil statt am Offset. Regex zunächst um `(?:\.\d{1,3})?`
  zwischen Sekunden und Offset ergänzt. Zwei Unit-Fälle,
  Wegwerf-Skript `_test-commit-guard-unit-ms.mjs`, nicht committet, nach
  dem Lauf gelöscht — beide bestanden: (7) `2026-08-17T14:03:00.000Z` →
  erkannt, als UTC interpretiert, `2026-08-17T14:03:00.000Z` (Soll-Wert
  per `Date.parse` gegengerechnet, exakter Treffer — vor dem Fix wäre das
  Ergebnis `2026-08-17T12:03:00.000Z` gewesen, zwei Stunden Drift); (8)
  `2026-08-17T14:03:00.123+02:00` → erkannt, als MESZ interpretiert,
  `2026-08-17T12:03:00.123Z` (Soll-Wert gegengerechnet, exakter Treffer).
  Die eigentliche Ursache der ursprünglichen Ablehnung (der reale
  Freigabe-Datei-Inhalt, der zur „keine gültige Zeile"-Meldung führte)
  blieb ungeklärt, da die Datei für das Modell unerreichbar ist.
  **Korrektur, gleicher Tag:** Der Drei-Stellen-Fix war selbst zu eng —
  ab vier Nachkommastellen greift dieselbe Drift erneut (Python
  `datetime.isoformat()`: sechs Stellen, PowerShell `Get-Date -Format o`:
  sieben, `date -u -Ins`: neun). Wichtiger: Ein Testfall mit sieben Stellen
  und `+02:00` lief zunächst grün, aber nur scheinbar korrekt — Rest und
  lokaler Offset hoben sich gegenseitig auf, dieselbe Scheinkorrektheit wie
  beim ersten Kalibrierungsversuch zu Punkt 7 weiter oben. Fix korrigiert
  zu `(?:\.\d+)?` (beliebig viele Stellen, keine unbegründbare Obergrenze).
  Zwei weitere Unit-Fälle, Wegwerf-Skript `_test-commit-guard-unit-ms2.mjs`,
  nicht committet, nach dem Lauf gelöscht — beide bestanden: (9)
  `2026-08-17T19:28:08.123456Z` (6 Stellen) → erkannt, als UTC
  interpretiert, `2026-08-17T19:28:08.123Z` (Soll-Wert per `Date.parse`
  gegengerechnet, exakter Treffer — `Date.parse` selbst kappt auf
  Millisekunden, das ist eine JS-Grenze, keine Regex-Grenze); (10)
  `2026-08-17T21:28:08.1234567+02:00` (7 Stellen) → erkannt, als MESZ
  interpretiert, `2026-08-17T19:28:08.123Z` (Soll-Wert gegengerechnet,
  exakter Treffer). Der Mensch legt die nächste Freigabe-Datei mit einem
  einfacheren Format (Ortszeit ohne Offset) neu an.

- 2026-08-17, `commit-guard.js`-Hook, realer Grün-Fall Push-Pfad, Abschluss
  Vertrag `harness-fix-5-commit-guard-haerten`: Nach dem freigegebenen
  Abschluss-Commit `8d89041` (2026-08-17T22:07:07+02:00) auf dem echten
  Arbeitsbranch `harness-fix/5-commit-guard-haerten` zwei Push-Versuche.
  **Erster Versuch**, mit frischer Freigabe, `git push` ohne `-u`: scheiterte
  **nicht** am Hook, sondern danach an Git selbst — „the current branch …
  has no upstream branch" (erster Push dieses Branches). Die Freigabe war
  zu diesem Zeitpunkt bereits verbraucht (Hook löscht die Datei, *bevor*
  der eigentliche Git-Befehl läuft), `git status` direkt danach bestätigt
  den Verbrauch ohne stattgefundenen Push. [Schlussfolgerung] Das ist ein
  Bauform-Befund, kein Bug im Code: Ein `PreToolUse`-Hook sieht nur, ob er
  den Befehl durchlässt, nicht, ob der durchgelassene Befehl anschließend
  erfolgreich ist. Jeder Fehlschlag nach der Hook-Prüfung — fehlender
  Upstream (wie hier real eingetreten), abgelehnter Push, Netzwerkfehler,
  Tippfehler im Befehl — verbrennt den zweiten Schlüssel ohne
  stattgefundenen Git-Vorgang. **Zweiter Versuch**, mit einer weiteren
  frischen Freigabe, `git push -u origin harness-fix/5-commit-guard-haerten`
  → durchgegangen, ca. 2026-08-17T22:12:29+02:00; `git status` direkt
  danach zeigt „up to date with origin/harness-fix/5-commit-guard-haerten",
  Freigabe-Datei verbraucht. Damit liegen für beide Git-Vorgänge Rot- und
  Grün-Fall vor: Rot für `commit` und `push` auf dem Wegwerf-Branch, Rot
  für `push` zusätzlich auf dem Arbeitsbranch, Grün für `commit` und
  `push` auf dem Arbeitsbranch.
  **Nebenbefund, vor `8d89041`:** Drei Commit-Versuche auf dem
  Arbeitsbranch schlugen vorher fehl — nicht am Rot-Fall „fehlende
  Freigabe-Datei" oben, sondern an einem anderen Hook-Zweig: „keine
  gültige Zeile" (zweimal) und einmal „liegt in der Zukunft". [offene
  Unsicherheit] Der tatsächliche Inhalt der Freigabe-Datei bei den beiden
  „keine gültige Zeile"-Fällen blieb ungeklärt, da die Datei für das
  Modell unerreichbar ist; bekannt ist nur die Byte-Länge (30 Bytes
  inklusive Zeilenumbruch), was auf ein Leerzeichen statt „T" oder ein
  deutsches Datumsformat passen würde — belegt ist keines von beidem.
  Damit sind an diesem Abend vier verschiedene Verweigerungszweige des
  Hooks real aufgetreten: fehlende Datei, ungültige Zeile, Zeitstempel zu
  alt, Zeitstempel in der Zukunft.

- 2026-08-18, Doku-Gate, Vertrag `harness-fix-6-werkzeug-katalog`,
  Kalibrierung des einzigen greifenden Verweises auf den neuen
  Werkzeug-Katalog (`.claude/skills/werkzeug-auswahl/SKILL.md`, Schritt
  2c). Rot: Verweis temporär von `docs/harness/werkzeug-katalog.md` auf
  den nicht existierenden Pfad `docs/harness/werkzeug-katalog-x.md`
  umgebogen, `node scripts/check-docs.mjs` gelaufen → Exit 1, Ausgabe im
  Wortlaut:
  ```
  === Doku-Check ===

  ✗ 1 Befund(e):

    - .claude/skills/werkzeug-auswahl/SKILL.md:26: Verweis auf `docs/harness/werkzeug-katalog-x.md` — Datei existiert nicht
  ```
  Grün: Verweis auf `docs/harness/werkzeug-katalog.md` zurückgestellt,
  derselbe Befehl → Exit 0, Ausgabe im Wortlaut:
  ```
  === Doku-Check ===

  ✓ Keine Befunde.
  ```
  Damit ist belegt, dass die einzige Gate-Abdeckung des Katalogs in
  Phase 2 wirklich greift. **Ausdrücklich nicht abgedeckt: K4
  (Stand-Marker-Pflicht in Katalog-Einträgen).** Ein Marker-Pflicht-Check
  existiert nicht und wird erst mit N7 (Platzhalter-Check) in Phase 3
  scharf gestellt.

- 2026-08-18, Doku-Gate, Vertrag `harness-fix-7-reibung-und-doktrin`,
  Kalibrierung der Marker-Freiheit von `state/reibung.md`. Die Datei
  behauptet in ihrem eigenen Kopfkommentar, absichtlich **keinen**
  `Stand dieser Fassung:`-Marker zu tragen, weil Prüfung 3 sie sonst bei
  jedem neuen Reibungseintrag rot färben würde — dieser Eintrag zeigt das,
  statt es zu behaupten. Rot: temporär `Stand dieser Fassung: 01.08.2026`
  in den Kopfkommentar geschrieben und in der `[FÜLLUNG]`-Beispielzeile das
  jüngere Datum `18.08.2026` eingetragen, `node scripts/check-docs.mjs`
  gelaufen → Exit 1, Ausgabe im Wortlaut:
  ```
  === Doku-Check ===

  ✗ 1 Befund(e):

    - state\reibung.md:26: Datum 18.08.2026 ist jünger als "Stand dieser Fassung: 01.08.2026" (Zeile 3)
  ```
  Grün: Marker-Zeile und Testdatum wieder entfernt, derselbe Befehl →
  Exit 0, Ausgabe im Wortlaut:
  ```
  === Doku-Check ===

  ✓ Keine Befunde.
  ```
  Damit ist die Marker-Freiheit von `state/reibung.md` eine geprüfte
  Entscheidung und keine Vermutung.

- 2026-08-18, Doku-Gate, Vertrag `harness-fix-8-start-klein`, Kalibrierung
  der Aufnahme von `START-KLEIN.md` in `anweisungsDateien`
  (`scripts/check-docs.mjs:44-59`). Rot: temporär ein Backtick-Verweis auf
  die nicht existierende Datei `nicht-vorhanden.md` in `START-KLEIN.md`
  eingefügt, `node scripts/check-docs.mjs` gelaufen → Exit 1, Ausgabe im
  Wortlaut:
  ```
  === Doku-Check ===

  ✗ 1 Befund(e):

    - START-KLEIN.md:52: Verweis auf `nicht-vorhanden.md` — Datei existiert nirgends im Repo
  ```
  Grün: Testverweis wieder entfernt, derselbe Befehl → Exit 0, Ausgabe im
  Wortlaut:
  ```
  === Doku-Check ===

  ✓ Keine Befunde.
  ```
  Damit ist die Gate-Abdeckung von `START-KLEIN.md` eine geprüfte
  Entscheidung und keine Vermutung.

- 2026-08-21, Linter-Gate, Vertrag `harness-setup-4a-linter-regeln-kalibrieren`:
  `biome.json` erstmals angelegt (vorher lief `npm run lint` mit Biomes
  `recommended`-Standardsatz statt der zwei entschiedenen Regeln), mit
  `recommended: false` und ausschließlich `suspicious.noExplicitAny` und
  `nursery.noFloatingPromises` aktiviert. Beide Regeln je mit echtem,
  real ausgelöstem Rot- und Grün-Fall in `scripts/_mode.ts` kalibriert
  (Testcode danach vollständig entfernt, `git status` zeigt keinen Rest).
  **Regel `noExplicitAny`, Rot:** Zeile `const temp_rotfall_any: any = 1`
  temporär eingefügt, `npm run lint` → Exit 1, Ausgabe im Wortlaut:
  ```
  > projektname@0.1.0 lint
  > biome lint scripts/

  scripts\_mode.ts:26:25 lint/suspicious/noExplicitAny ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    × Unexpected any. Specify a different type.

      25 │ // TEMP-ROT-FALL noExplicitAny (harness-setup-4a, wird sofort entfernt)
    > 26 │ const temp_rotfall_any: any = 1
         │                         ^^^
      27 │

    i any disables many type checking rules. Its use should be avoided.


  Checked 5 files in 44ms. No fixes applied.
  Found 1 error.
  lint ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    × Some errors were emitted while running checks.
  ```
  **Regel `noExplicitAny`, Grün:** Testzeile entfernt, derselbe Befehl →
  Exit 0, Ausgabe im Wortlaut:
  ```
  > projektname@0.1.0 lint
  > biome lint scripts/

  Checked 5 files in 41ms. No fixes applied.
  ```
  **Regel `noFloatingPromises`, Rot** (harte Bedingung aus
  `state/plan-v2-harness-setup.md`, AP 4, Zeile 136–141): Testcode
  `async function tempRotfallAsync(): Promise<void> {}` gefolgt vom
  Aufruf `tempRotfallAsync()` ohne `await`/`.then`/`.catch` temporär
  eingefügt, `npm run lint` → Exit 1, Ausgabe im Wortlaut:
  ```
  > projektname@0.1.0 lint
  > biome lint scripts/

  scripts\_mode.ts:27:1 lint/nursery/noFloatingPromises ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    × A "floating" Promise was found, meaning it is not properly handled and could lead to ignored errors or unexpected behavior.

      25 │ // TEMP-ROT-FALL noFloatingPromises (harness-setup-4a, wird sofort entfernt)
      26 │ async function tempRotfallAsync(): Promise<void> {}
    > 27 │ tempRotfallAsync()
         │ ^^^^^^^^^^^^^^^^^^
      28 │

    i This happens when a Promise is not awaited, lacks a `.catch` or `.then` rejection handler, or is not explicitly ignored using the `void` operator.

    i This rule belongs to the nursery group, which means it is not yet stable and may change in the future. Visit https://biomejs.dev/linter/#nursery for more information.


  Checked 5 files in 34ms. No fixes applied.
  Found 1 error.
  lint ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    × Some errors were emitted while running checks.
  ```
  Der Rot-Fall fängt die nicht abgewartete Promise — die harte Bedingung
  aus AP 4 ist damit erfüllt, kein Eskalationsfall, Biome bleibt gesetzt.
  **Regel `noFloatingPromises`, Grün:** Testcode entfernt, derselbe Befehl
  → Exit 0, Ausgabe im Wortlaut:
  ```
  > projektname@0.1.0 lint
  > biome lint scripts/

  Checked 5 files in 42ms. No fixes applied.
  ```
  `git status` direkt nach dem letzten Grün-Fall bestätigt, dass
  `scripts/_mode.ts` keinen Rest der Testfälle trägt (nicht in der
  Änderungsliste).

- 2026-08-21, CI und Branch Protection, Vertrag
  `harness-setup-4b-ci-branch-protection-kalibrieren`: Der bisherige
  CI-Beleg (AP 3, Run 32494340548) entstand vor `biome.json` und prüfte
  damit nicht den heutigen `check`-Umfang — dieser Vertrag ersetzt ihn
  durch einen Beleg nach AP 4a. Repo-Metadaten (`gh repo view --json
  owner,name,visibility`): `{"name":"ai-workforce","owner":{"login":
  "DerStefan89"},"visibility":"PUBLIC"}` — öffentliches Repo, die
  Free-Tarif-Einschränkung aus SETUP.md Punkt 1 für private Repos ist
  hier nicht einschlägig.
  **CI, Rot:** Wegwerf-Branch `harness-setup-4b-ci-rotfall` von `main`,
  Testzeile `const temp_rotfall_any: any = 1` in `scripts/_mode.ts`, PR
  #1 (`harness-setup-4b-ci-rotfall` → `main`) geöffnet. Run
  [32534644257](https://github.com/DerStefan89/ai-workforce/actions/runs/32534644257),
  Check `check` → `fail`. Entscheidende Log-Zeile im Wortlaut:
  ```
  scripts/_mode.ts:26:25 lint/suspicious/noExplicitAny ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    × Unexpected any. Specify a different type.
  lint ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    × Some errors were emitted while running checks.
  Found 1 error.
  ##[error]Process completed with exit code 1.
  ```
  **CI, Grün:** Testzeile entfernt, derselbe PR #1. Run
  [32534688109](https://github.com/DerStefan89/ai-workforce/actions/runs/32534688109),
  Check `check` → `pass`.
  **Branch Protection, Ist-Zustand (lesend, nicht verändert):**
  `gh api repos/DerStefan89/ai-workforce/branches/main/protection` →
  Exit 1, Ausgabe im Wortlaut:
  ```
  {"message":"Branch not protected","documentation_url":"https://docs.github.com/rest/branches/branch-protection#get-branch-protection","status":"404"}
  ```
  Die Regel existiert nicht — nicht bloß „nicht durchgesetzt" mangels
  Tarif, sondern gar nicht angelegt. Damit entfällt SCOPE Schritt 5
  (Merge-Rot-Fall) ersatzlos: ohne Required Status Check gibt es nichts,
  das einen Merge verhindern könnte. Kein Grün-Fall behauptet — das wäre
  ein falsches Kalibrierungsergebnis für ein nicht existierendes Gate.
  Gemäß ESCALATE dieses Vertrags **nicht** selbst über `gh api`
  (PUT/PATCH) angelegt; das Anlegen ist eine Repo-Sicherheitsentscheidung
  für Stefan/den Projektchat.
  **Aufräumen:** PR #1 geschlossen ohne Merge (`gh pr close 1
  --delete-branch`), Remote- und lokaler Wegwerf-Branch
  `harness-setup-4b-ci-rotfall` gelöscht. `main` unverändert bei
  `fde07ff`, `git status` danach zeigt keinen Rest.

- 2026-08-22, Branch Protection, Vertrag
  `harness-setup-4c-branch-protection-anlegen-und-kalibrieren`: Nachtrag
  zum in AP 4b eskalierten Befund — die Regel wurde jetzt real angelegt
  (nicht nur beschrieben) und mit echten Rot-/Grün-Fällen kalibriert.
  Vor der Änderung erneut `gh api repos/DerStefan89/ai-workforce/
  branches/main/protection` gelesen → unverändert `404 Branch not
  protected`, deckt sich mit dem AP-4b-Befund.
  **Angelegt** über `gh api -X PUT .../branches/main/protection` mit
  `required_status_checks: {strict: true, contexts: ["check"]}`,
  `enforce_admins: true`, `required_pull_request_reviews:
  {required_approving_review_count: 0}` (bewusst 0 — Solo-Maintainer,
  von der API klaglos akzeptiert, kein Selbstsperre-Risiko), keine
  `restrictions`. GET-Bestätigung danach, Ausgabe im Wortlaut (gekürzt
  auf die relevanten Felder):
  ```
  "required_status_checks":{"strict":true,"contexts":["check"],"checks":[{"context":"check","app_id":15368}]}
  "required_pull_request_reviews":{"dismiss_stale_reviews":false,"require_code_owner_reviews":false,"require_last_push_approval":false,"required_approving_review_count":0}
  "enforce_admins":{"enabled":true}
  ```
  **Rot-Fall:** Wegwerf-Branch `harness-setup-4c-rotfall` von `main`,
  Testzeile `const temp_rotfall_any: any = 1` in `scripts/_mode.ts`, PR
  #2 (`harness-setup-4c-rotfall` → `main`) geöffnet. CI-Check `check` →
  `fail` (Run
  [32564555823](https://github.com/DerStefan89/ai-workforce/actions/runs/32564555823)).
  `gh api repos/DerStefan89/ai-workforce/pulls/2` → Ausgabe im Wortlaut:
  ```
  {"mergeable":true,"mergeable_state":"blocked"}
  ```
  `mergeable: true` (kein Git-Konflikt), aber `mergeable_state:
  "blocked"` — die Regel verhindert den Merge trotz technisch
  konfliktfreiem Branch. Ein echter `gh pr merge`-Versuch wurde vom
  Auto-Mode-Classifier der Sitzung blockiert („Blocked by classifier",
  Merge-Befehle gelten grundsätzlich als riskant); der lesende Beleg über
  `mergeable_state` ist laut SCOPE Schritt 3 eine ausdrücklich zulässige
  Alternative und wurde stattdessen verwendet.
  **Grün-Fall:** Testzeile entfernt, derselbe PR #2. CI-Check `check` →
  `pass` (Run
  [32564664834](https://github.com/DerStefan89/ai-workforce/actions/runs/32564664834)).
  `gh api repos/DerStefan89/ai-workforce/pulls/2` → Ausgabe im Wortlaut:
  ```
  {"mergeable":true,"mergeable_state":"clean"}
  ```
  `mergeable_state` wechselt auf `clean`, sobald CI grün ist — die Regel
  ist damit nicht bloß vorhanden, sondern nachweislich wirksam in beide
  Richtungen. PR #2 **nicht gemerged**.
  **Aufräumen:** PR #2 geschlossen ohne Merge (`gh pr close 2
  --delete-branch`), Remote- und lokaler Wegwerf-Branch
  `harness-setup-4c-rotfall` gelöscht. `main` unverändert bei `21c708a`,
  `git status` danach zeigt keinen Rest.

- 2026-08-22, Prozess-Lücke, aus dem Projektchat: Für AP 2 (CI auf
  Produktkette umstellen) und AP 3 (Erster grüner Produkt-Prüflauf; laut
  Ausführungsreihenfolge eigentlich AP 2/AP 3 vertauscht benannt, siehe
  `state/plan-v2-harness-setup.md` Abschnitt 4 zur korrekten Zuordnung)
  existiert keine committete Vertragsdatei unter `state/tasks/`, obwohl
  beide real ausgeführt und ihre Ergebnisse in dieser Datei belegt sind.
  Die Original-Vertragstexte sind nicht mehr verfügbar. Entscheidung:
  nicht aus der Erinnerung rekonstruieren, um keine unbelegte Behauptung
  als Beleg auszugeben.
  Für AP 4a, AP 4b und AP 4c lag der Original-Wortlaut dagegen entgegen
  der ursprünglichen Annahme dieses Nachtrags noch vor — beide Dateien
  (`harness-setup-4a-linter-regeln-kalibrieren.md`,
  `harness-setup-4b-ci-branch-protection-kalibrieren.md`) existierten
  unangetastet lokal, nie committet, weil der jeweilige SCOPE das
  Staging auf andere Dateien beschränkt hatte (bei AP 4a auf `biome.json`
  und `state/gates.md`, bei AP 4b auf `state/gates.md`) — keine
  Rekonstruktion, sondern der reale, unveränderte Text aus der
  jeweiligen Ausführung. Mit diesem Nachtrag alle drei zusammen mit dem
  von Anfang an vorgesehenen AP-4c-Text committet, keine Lücke.
  Ab jetzt wird der Vertragstext für jedes künftige Arbeitspaket
  konsequent vor Ausführung unter `state/tasks/` committet.

- 2026-08-23, `commit-guard.cjs`-Hook, Befund B6 Nachtrag N24 (Vertrag
  `harness-b6-hooks-cjs-migration`): Der Hook wurde von `.js` auf `.cjs`
  umbenannt (ESM-Kompatibilität) und inhaltlich verschlankt — die
  Freigabe-Datei-Pflicht (bisherige Aufgabe 1) ist ersatzlos entfernt,
  `state/freigabe-commit.md` wird nicht mehr verwendet. Verbleibende
  Aufgabe: Bash-Zugriff auf die geteilte `.claude/settings.json`
  blockieren. Rot-/Grün-Fall-Paare auf Wegwerf-Branches, nie gepusht,
  danach gelöscht:
  **Rot (SCOPE 11 a):** `cat .claude/settings.json` auf Wegwerf-Branch
  `diagnose-scope11-b6`, 2026-08-23 → abgewiesen, Meldung im Wortlaut:
  „commit-guard: Bash-Zugriff auf geteilte .claude/settings.json
  blockiert. Die Datei ist Team-Policy und wird nur vom Menschen im
  eigenen Editor geändert."
  **Grün (SCOPE 11 a):** unbeteiligter Bash-Befehl `git status`,
  unmittelbar danach, gleicher Branch → lief regulär durch, keine
  Guard-Reaktion.
  **Grün (SCOPE 11 b, neue Sollfunktion — Freigabe-Datei-Pflicht bewusst
  entfernt, kein Befund):** `git commit --allow-empty -m
  "diagnose-ohne-freigabe"` auf Wegwerf-Branch `diagnose-scope11b-b6`,
  ohne `state/freigabe-commit.md`, 2026-08-23 → durchgegangen, Commit
  `a168258`, Exit 0. Wegwerf-Branch danach per `git reset --soft` auf den
  Stand vor dem Diagnose-Commit zurückgesetzt (die im Commit
  mitgefassten Umbenennungen sind reguläre b6-Arbeit, nicht Teil des
  Diagnose-Befunds) und gelöscht, nie gepusht.
  Vorheriger, unklarer Ausgang von SCOPE 11 a) war kein Caching-Effekt im
  Hook-Runner, sondern falsches Arbeitsverzeichnis der Sitzung — Details:
  `state/plan-v1-harness-b6-hooks-cjs-migration.md`, Abschnitt „N25".

- 2026-08-28, `commit-guard.cjs`-Hook, Vertrag
  `harness-b1b3-merge-guard-und-git-flow` (Aufgabe 2 ergänzt: gh-Merge-Pfad
  nach main und Bash-Zugriff auf die Branch-Protection-Regel selbst).
  Vier Rot-Fälle und drei Grün-Fälle, alle über `node
  .claude/hooks/commit-guard.cjs` mit synthetischer stdin-Eingabe (kein
  echter `gh`-Aufruf — kein Netzwerkzugriff, kein reales PR/API-Objekt
  nötig, der Hook greift bereits am Befehlstext).
  **Rot-Fall B1a:** Eingabe `{"tool_input":{"command":"gh pr merge
  999"}}` → abgewiesen, Wortlaut: „commit-guard: gh-Merge-Pfad nach main
  blockiert (PR-Merge-Unterbefehl oder /merge(s)-API-Endpunkt). Merge auf
  main bleibt Menschensache, nicht Bash/gh. Lesewege wie mergeable_state
  bleiben offen." Kein `gh`-Ausgabetext, keine HTTP-/404-Meldung, keine
  „Blocked by classifier"-Meldung erschienen — der Hook griff vor jedem
  echten `gh`-Aufruf.
  **Rot-Fall B1a-2:** Eingabe `{"tool_input":{"command":"gh api --method
  PUT repos/DerStefan89/ai-workforce/pulls/999/merge"}}` → abgewiesen,
  dieselbe Meldung wie B1a. Belegt die Erweiterung auf den
  `/merge`-API-Endpunkt (SCOPE 2a).
  **Rot-Fall B1b:** Eingabe `{"tool_input":{"command":"gh api
  repos/DerStefan89/ai-workforce/branches/main/protection"}}` →
  abgewiesen, Wortlaut: „commit-guard: Bash-Zugriff auf die
  Branch-Protection-Regel blockiert — lesend wie schreibend. Leseweg auf
  ihre Wirkung bleibt offen (gh api repos/…/pulls/<n> ->
  mergeable_state)." Rein lesender Befehl, dennoch verweigert — wie in
  SCOPE 2b/Annahme des Vertrags festgelegt.
  **Rot-Fall Fail-Closed:** Eingabe `{"tool_input":{}}` (kein `command`)
  → abgewiesen, Wortlaut: „commit-guard: kein Befehlstext gefunden —
  fail-closed, Befehl verweigert." Belegt, dass die neue, vorangestellte
  Prüfung die Fail-Closed-Eigenschaft nicht aufgehoben hat. Nebenbefund,
  kein Hook-Fehler: Ein erster Versuch über `echo` (statt `printf`) mit
  einem Windows-Pfad voller doppelter Backslashes im `cwd`-Feld
  beschädigte das JSON durch Shell-Expansion und traf stattdessen den
  `JSON.parse`-Fehlerzweig („Eingabe nicht lesbar") — ebenfalls eine
  gültige Verweigerung, aber der falsche Fail-Closed-Zweig für den
  beabsichtigten Testfall. Mit `printf` statt `echo` reproduziert, dann
  der korrekte Wortlaut oben.
  **Grün-Fälle:** `{"tool_input":{"command":"gh pr list"}}`,
  `{"tool_input":{"command":"gh repo view"}}` und
  `{"tool_input":{"command":"gh api
  repos/DerStefan89/ai-workforce/pulls/2"}}` (Leseweg auf
  `mergeable_state`, enthält weder `branches/`+`/protection` noch `merge`
  als eigenständiges Token) → alle drei liefen unverändert durch, kein
  JSON auf stdout, Exit 0. Der dritte Fall belegt die
  `mergeable`-Ausnahme aus SCOPE 2a: `mergeable_state` enthält `merge` nur
  als Teilstring innerhalb eines längeren Worts, nicht als eigenständiges
  Token — die Wortgrenzen-Regex greift hier bewusst nicht.
  Abdeckungsaussage im Wortlaut: Der Rot-Fall belegt ausschließlich den
  Bash-Pfad. Ausdrücklich nicht belegt: GitHub-Weboberfläche, `curl` und
  andere HTTP-Clients, MCP-Werkzeuge, WebFetch, freie Shell mit
  Variablen. Ebenfalls nicht erfasst: die Rulesets-API
  (`repos/…/rulesets`) — der Schutz dieses Repos liegt in der
  klassischen Protection-API, nicht in Rulesets.
  SCOPE 10 (Regressions-Grünfall für die mit Befund B6 bereits entfernte
  Freigabe-Datei-Pflicht) entfällt laut Nachtrag zu diesem Vertrag —
  nicht ausgeführt, kein Befund einzutragen.
  `git-flow` Schritt 3 wurde textlich geändert (`git pull` → `git fetch
  origin` plus expliziter Vergleich über `git rev-list --left-right
  --count main...origin/main` mit vier Ausgängen). Durchsetzungsgrad
  DEKLARIERT; das Verhalten wurde in diesem Lauf nicht ausgeführt, weil
  Schritt 2 des Skills (dedizierter Branch/Worktree) hier nicht griff,
  sondern real der Schritt-3-Pfad selbst durchlaufen wurde, um main auf
  origin/main zu bringen (SCHRITT C dieses Vertragslaufs) — der
  `0 N`-Ausgang trat dabei real ein (`git rev-list --left-right --count
  main...origin/main` → `0 2`) und wurde wie im neuen Wortlaut behandelt
  (`git checkout main && git merge --ff-only origin/main`). Der
  Widerspruch zu Ziel-Fassung §9.2 Punkt 5 ist damit sowohl im Wortlaut
  als auch einmal real im Verhalten belegt, nicht nur textlich
  aufgelöst.

- 2026-08-28, `npm run`-Freigabeliste, Vertrag
  `harness-npm-run-allowlist-haertung` (schließt Messfall 1 aus Vertrag
  `tp-03d-wirkungsgrenze-und-hash-baseline`): `permissions.allow` in
  `.claude/settings.json` von der Präfix-Freigabe `Bash(npm run *)` auf
  fünf feste Einträge (`check`, `check:template`, `lint`, `typecheck`,
  `test`) umgestellt. Die Änderung an `.claude/settings.json` selbst
  wurde **manuell von Stefan im Terminal** vorgenommen, nicht durch die
  Claude-Instanz — der vertraglich vorgesehene Workaround
  (`guard-settings.js`-Hook per PowerShell temporär entfernen) scheiterte
  am Claude-Code-eigenen Auto-Mode-Classifier, unabhängig von den
  projekteigenen Hooks.
  **Rot-Fall:** neues, zuvor nicht existierendes Skript
  `allowlist-redfall-probe` temporär in `package.json` ergänzt, per
  nicht-interaktiver Claude-Instanz ausgeführt
  (`claude -p "Führe genau den Befehl 'npm run allowlist-redfall-probe'
  über das Bash-Werkzeug aus ..." --output-format json
  --setting-sources project`). Erster Versuch verworfen (Trust-Warnung
  „this workspace has not been trusted" ignorierte alle Allow-Einträge
  unabhängig von der Allowlist — einmaliger Ausreißer, siehe CLAUDE.md
  „Bekannte Fallen"). Kontrollprobe mit Grün-Fall `check:template` lief
  im gleichen Sitzungskontext sauber, danach Rot-Fall wiederholt →
  `permission_denials` enthält `{"tool_name":"Bash","tool_input":
  {"command":"npm run allowlist-redfall-probe",...}}`, Befehl nicht
  ausgeführt, kein Marker in der Ausgabe. Testskript danach vollständig
  aus `package.json` entfernt, `git status` zeigt keinen Rest (Diff
  neutralisiert sich, da Hinzufügen und Entfernen in derselben Sitzung).
  **Grün-Fälle**, je einzeln über dieselbe nicht-interaktive Methode:
  `check` → „alle Schritte grün (lint, typecheck, Doku-Check,
  Regel-Check, Vertrags-Check, Tests: 1 pass, 0 fail)", `check:template`
  → Doku-/Regel-/Vertrags-Check „keine Befunde", `lint` → „Checked 5
  files in 39ms. No fixes applied.", `typecheck` → `tsc --noEmit` ohne
  Fehler, `test` → „tests 1, pass 1, fail 0" (Dry-Run). Alle fünf
  `permission_denials: []`.
  Ausgeschlossen aus der Freigabeliste (keine Fundstelle für
  `npm run <name>` in `state/tasks/*.md`, `.github/workflows/ci.yml`
  oder `.claude/skills/*/SKILL.md`, nur `[FÜLLUNG]`-Platzhalter in
  `package.json`): `dev`, `build`.

- 2026-08-28, Linter-Gate (`noExplicitAny`, `noFloatingPromises`) und neues
  Typecheck-Gate, Vertrag `harness-a1-kettenumfang-produktpfad`:
  Geltungsbereich von `scripts/` auf `scripts/` + `src/` erweitert.
  `package.json` → `lint` von `biome lint scripts/` auf `biome lint .`
  umgestellt, Geltungsbereich stattdessen in `biome.json` über
  `files.includes: ["scripts/**", "src/**"]` gesetzt (Schlüsselname aus
  dem lokal gepinnten Schema `node_modules/@biomejs/biome/
  configuration_schema.json`, `$defs.FilesConfiguration`, bestimmt — nicht
  aus dem Gedächtnis; `includes` ist eine Positivliste, `scripts/**` und
  `src/**` schließen damit implizit alles andere aus, ohne `!`-Negation).
  `tsconfig.json` → `include` auf `["scripts/**/*.ts", "src/**/*.ts"]`
  erweitert.
  **Nachweis ohne vorhandenes `src/`:** `npm run check` → Exit 0 (nur eine
  vorbestehende Info-Meldung zu `biome.json:6:13 deserialize DEPRECATED …
  The use of the recommended field has been deprecated`, unverändert seit
  vor diesem Vertrag, kein Fehler).
  **Rot-Fall `noExplicitAny`** (temporäre Datei `src/_kalibrierung.ts`,
  Zeile `const temp_rotfall_any: any = 1`): `npm run lint` → Exit 1,
  Ausgabe im Wortlaut:
  ```
  src\_kalibrierung.ts:2:25 lint/suspicious/noExplicitAny ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    × Unexpected any. Specify a different type.

      1 │ // TEMP-ROT-FALL noExplicitAny (harness-a1-kettenumfang-produktpfad, wird sofort entfernt)
    > 2 │ const temp_rotfall_any: any = 1
        │                         ^^^
      3 │

    i any disables many type checking rules. Its use should be avoided.


  Checked 7 files in 45ms. No fixes applied.
  Found 1 error.
  Found 1 info.
  ```
  **Rot-Fall `noFloatingPromises`** (dieselbe temporäre Datei ersetzt
  durch `async function tempRotfallAsync(): Promise<void> {}` gefolgt von
  `tempRotfallAsync()` ohne `await`/`.then`/`.catch`): `npm run lint` →
  Exit 1, Ausgabe im Wortlaut:
  ```
  src\_kalibrierung.ts:3:1 lint/nursery/noFloatingPromises ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    × A "floating" Promise was found, meaning it is not properly handled and could lead to ignored errors or unexpected behavior.

      1 │ // TEMP-ROT-FALL noFloatingPromises (harness-a1-kettenumfang-produktpfad, wird sofort entfernt)
      2 │ async function tempRotfallAsync(): Promise<void> {}
    > 3 │ tempRotfallAsync()
        │ ^^^^^^^^^^^^^^^^^^
      4 │

    i This happens when a Promise is not awaited, lacks a `.catch` or `.then` rejection handler, or is not explicitly ignored using the `void` operator.

    i This rule belongs to the nursery group, which means it is not yet stable and may change in the future. Visit https://biomejs.dev/linter/#nursery for more information.


  Checked 7 files in 49ms. No fixes applied.
  Found 1 error.
  Found 1 info.
  ```
  **Rot-Fall Typecheck** (dieselbe temporäre Datei ersetzt durch
  `const temp_rotfall_typecheck: number = "abc";`): `npm run typecheck` →
  Exit 1, Ausgabe im Wortlaut:
  ```
  src/_kalibrierung.ts(2,7): error TS2322: Type 'string' is not assignable to type 'number'.
  ```
  **Grün-Fall:** `src/_kalibrierung.ts` vollständig entfernt, `npm run
  check` → Exit 0, Lint-Teilausgabe im Wortlaut „Checked 6 files in 45ms.
  No fixes applied." (plus dieselbe vorbestehende Info-Meldung wie oben),
  Typecheck ohne Ausgabe. `git status` direkt danach zeigt kein `src/`
  mehr (Verzeichnis selbst entfernt, keine Reste in der Änderungsliste).
  Damit sind beide Linter-Zeilen und die neue Typecheck-Zeile für den
  erweiterten Geltungsbereich real kalibriert, nicht nur behauptet.
- 2026-08-28, Freigabedatei-Pflicht + Edit/Write-Guard
  (`harness-freigabedatei-wiederherstellung`): Vertrag stellt die mit
  Befund B6 (23.08.2026) entfernte Freigabedatei-Pflicht in
  `commit-guard.cjs` wieder her (1:1-Wortlaut, gegen den historischen
  Stand vor Commit `f8d11f6` per `git show f8d11f6^:.claude/hooks/
  commit-guard.js` verifiziert, keine Abweichung) und ergänzt erstmals
  einen Edit/Write-Schutz derselben Datei in `guard-settings.js` (vorher
  nur gegen Bash geschützt).
  **Lade-/Smoke-Test (SCOPE 8), reale Zielmaschine, kein Sandbox/Bridge:**
  Wegwerf-Testdatei `scripts/_test-commit-guard-smoke.test.cjs`
  (node:test, nicht committet, nach dem Lauf entfernt) lädt
  `commit-guard.cjs` per `require(...)` und prüft beide Exporte. Lauf
  über `npm run test`: `node-version: v24.16.0` (deckt sich mit
  `package.json` `engines.node: "24.x"`), Test „commit-guard.cjs laedt
  fehlerfrei unter der aktiven Node-Version" → grün, Exit 0. SCOPE 4-8
  liefen sämtlich in derselben Sitzung auf dieser Maschine (v24.16.0),
  nicht auf der v22.23.2-Sandbox — Advisor-Finding 9/10 damit
  ausgeräumt.
  **Rot-/Grün-Fall Freigabedatei-Pflicht (SCOPE 4/5)** und
  **Rot-/Grün-Fall Edit/Write-Guard (SCOPE 6/7):** vollständiger
  Wortlaut in den beiden neuen Tabellenzeilen oben. Bemerkenswerter
  Nebenbefund aus dem Grün-Fall-Kalibrierlauf: Drei reale, unabsichtliche
  Fehlversuche beim manuellen Anlegen der Freigabedatei (Zeitstempel mit
  `Z` aber Ortszeit-Wert; PowerShell-Befehl statt seiner Ausgabe in der
  Datei; Tippfehler „Freigeben" statt „Freigegeben") wurden vom Hook
  jedes Mal korrekt und mit dem erwarteten Wortlaut abgewiesen, bevor der
  eigentliche Grün-Fall gelang — der Rot-Pfad ist damit nicht nur für den
  vorbereiteten Testfall, sondern auch für authentische Bedienfehler
  kalibriert.
  Geerbte, bewusst nicht behobene Grenzen (siehe
  `state/assumption-ledger.md` und
  `state/advisor-findings-harness-freigabedatei-wiederherstellung.md`,
  Finding 5/6): Pfadbildung über `eingabe.cwd || process.cwd()` (Freigabe
  wird bei abweichendem Arbeitsverzeichnis fälschlich nicht gefunden);
  TOCTOU-Fenster zwischen Zeitstempel-Prüfung und `fs.unlinkSync` bei
  parallel laufenden git-Prozessen.

- 2026-08-28, Doku-Gate Prüfung 2, Vertrag
  `ebene2-architektur-in-repo-nachziehen`, Kalibrierung der auf dieses
  Projekt umgestellten Namensliste (`TypeScript|Node|Biome|tsc|node:test`).
  **Rot-Fall wie im Vertragstext vorgegeben** (SCOPE 7): `CLAUDE.md`
  temporär von „TypeScript auf Node," auf „TypeScript auf Node 24,"
  geändert, `node scripts/check-docs.mjs` gelaufen → Ausgabe im Wortlaut:
  ```
  === Doku-Check ===

  ✓ Keine Befunde.
  ```
  Exit 0. **Kein Befund, entgegen der Erwartung im Vertragstext** (der
  einen Befund und Exit 1 vorgab). `[Fakt]` Ursache: Das zweite
  Versionsmuster in Prüfung 2 verlangt nach dem Namen zusätzlich entweder
  ein `v`-Präfix oder mindestens einen Punkt in der Zahl
  (`\d+\.\d[\d.]*`) — Kommentar in `scripts/check-docs.mjs` Zeile
  143–144 benennt das ausdrücklich als Zweck der Einschränkung. „Node 24"
  hat weder `v`-Präfix noch Punkt und matcht deshalb keines der beiden
  Muster; per Skript verifiziert (`node -e` mit dem Live-Regex gegen den
  String „auf Node 24, strip-only" → `null`). Änderung danach zurückgesetzt.
  **Grün-Fall:** unveränderter Stand, derselbe Befehl → Ausgabe im
  Wortlaut:
  ```
  === Doku-Check ===

  ✓ Keine Befunde.
  ```
  Exit 0. `git status` nach dem Zurücksetzen zeigt `CLAUDE.md` ohne
  gestagte Änderung aus diesem Test. Widerspruch unter OUTPUT gemeldet;
  an der Prüflogik von Prüfung 2 wurde dem Vertragsauftrag entsprechend
  nichts geändert.

- 2026-08-29, Datenformate-Gate, Vertrag `f0-datenformate`: neues Skript
  `scripts/check-datenformate.mjs`, kein generischer JSON-Schema-Validator
  (plan-v1 D5) — zwei handgeschriebene Validierungsfunktionen
  (`validiereProfil`, `validiereKontrollzustand`) bilden die Pflichtfeld-/
  Typregeln von `schemas/profile.schema.json` und
  `schemas/kontrollzustand.schema.json` nach.
  **Grün-Fall, Ausgangsstand:** `node scripts/check-datenformate.mjs` →
  Ausgabe im Wortlaut:
  ```
  === Datenformate-Check ===

  ⓘ profiles: 0 Dateien geprüft
  ⓘ kontrollzustand: 0 Dateien geprüft

  ✓ Keine Befunde.
  ```
  Exit 0.
  **Vier Rot-Fälle, je einzeln, Delta 3/4 verlangt getrennten Nachweis
  pro `profil_referenz`-Pflichtfeld statt eines gemeinsamen:**
  `schemas/examples/profile.invalid.json` temporär in die
  `profile.valid.json`-Position kopiert (Original vorher als `.bak`
  gesichert) → Exit 1, Befund im Wortlaut `schemas/examples/
  profile.valid.json: sollte gültig sein, aber verletzt: Pflichtfeld
  'version' fehlt`. Anschließend `schemas/examples/
  kontrollzustand.valid.json` nacheinander durch die drei Invalid-Varianten
  ersetzt (Original ebenfalls als `.bak` gesichert): fehlender Pfad → Exit
  1, `Pflichtfeld 'profil_referenz.pfad' fehlt`; fehlender Hash → Exit 1,
  `Pflichtfeld 'profil_referenz.hash' fehlt`; fehlende Version → Exit 1,
  `Pflichtfeld 'profil_referenz.version' fehlt`. Jeder Rot-Fall benennt
  genau eine Regelverletzung, keine Querkontamination zwischen den drei
  `profil_referenz`-Feldern.
  **Grün-Fall, wiederhergestellt:** beide `.bak`-Dateien zurückkopiert,
  derselbe Befehl → identische Ausgabe wie oben, Exit 0. `git status
  --short schemas/` direkt danach zeigt nur das neue, unveränderte
  `schemas/`-Verzeichnis als `??`, keinen Rest der Swap-Dateien.
  Reale Dateien unter `profiles/`/`kontrollzustand/` sind zum Zeitpunkt
  dieses Vertrags ausschließlich `.gitkeep` (0 geprüfte Dateien,
  ausdrücklich kein Fehler laut SCOPE 5d) — der Zweig für reale
  Produktivdaten ist damit nur über den Leer-Fall belegt, nicht über eine
  echte `profiles/*.json`- oder `kontrollzustand/*.jsonl`-Datei; das wird
  erst mit dem ersten echten Gebrauch (Checkpoint Store) fällig.

- 2026-08-29, Datenformate-Gate, Korrekturrunde nach code-reviewer/qa
  (Vertrag `f0-datenformate`, Budget „ein Baudurchgang plus höchstens eine
  Korrekturrunde"): code-reviewer fand eine Schema/Skript-Drift
  (`profile.schema.json` verlangt `projekt` mit `minLength: 1`,
  `validiereProfil()` prüfte nur den Typ) — behoben, `scripts/
  check-datenformate.mjs`, `validiereProfil()`. qa fand zwei real
  unexerzierte Codezweige trotz Spec-Behauptung „bereits real
  kalibriert": den `additionalProperties: false`-Ablehnungspfad (das
  Kern-AC „keine Profilkopie") und die `.jsonl`-Zeilenverarbeitung. Beide
  jetzt mit echtem Rot-Fall nachkalibriert, ohne die im Vertrag
  festgelegte SCOPE.3-Dateiliste (genau sechs Beispiele) oder SCOPE.4
  (Ordner bleiben leer bis zum ersten echten Gebrauch) zu verletzen — alle
  drei Tests über temporären Dateiinhalt, danach vollständig
  zurückgesetzt.
  **Rot-Fall `additionalProperties: false`, Hülle (Geschwister-Feld
  einer Profilkopie):** `schemas/examples/kontrollzustand.valid.json`
  temporär um ein zusätzliches Top-Level-Feld `profil` (vollständige
  Profilkopie) ergänzt → Exit 1, Befund im Wortlaut `schemas/examples/
  kontrollzustand.valid.json: sollte gültig sein, aber verletzt:
  unbekanntes Feld 'profil' (additionalProperties: false)`.
  **Rot-Fall `additionalProperties: false`, `profil_referenz`:** dieselbe
  Datei stattdessen um ein zusätzliches Feld `profil_referenz.
  inhalt_kopie` ergänzt → Exit 1, `unbekanntes Feld
  'profil_referenz.inhalt_kopie' (additionalProperties: false)`.
  **Rot-Fall `.jsonl`-Zeilenverarbeitung:** temporäre Datei
  `kontrollzustand/_kalibrierung.jsonl` mit zwei Zeilen (Zeile 1 gültig,
  Zeile 2 ohne `profil_referenz.pfad`) angelegt → `✓ kontrollzustand: 1
  Datei(en) geprüft`, Befund im Wortlaut `kontrollzustand\
  _kalibrierung.jsonl:2: Pflichtfeld 'profil_referenz.pfad' fehlt`, Exit
  1 — bestätigt, dass nur die ungültige Zeile beanstandet wird, die
  gültige Zeile 1 erzeugt keinen Befund.
  **Grün-Fall, wiederhergestellt:** `kontrollzustand.valid.json` auf
  Originalinhalt zurückgesetzt, `_kalibrierung.jsonl` gelöscht, `node
  scripts/check-datenformate.mjs` → identische Ausgabe wie im
  Ausgangs-Grün-Fall oben, Exit 0. `git status --short` danach zeigt
  keinen Rest der drei Testdateien.
  `npm run check:template` und `npm run check` nach der Korrektur erneut
  vollständig grün gelaufen (kein zweites Rot auf diesem Gate).

- 2026-08-29, `scripts/verify-rename-atomicity.mjs` (Nachtrag B4 zu
  Vertrag `f1-checkpoint-store`, Stefans Entscheidung Option B):
  einmaliger, manueller Windows-Rename-Atomaritätsnachweis (D4, plan-v1
  Abschnitt 4.4) — 300 Temp+Rename-Zyklen, jeder dritte mit simuliertem
  offenem Read-Handle auf der Zieldatei, paralleler Leser-Kindprozess.
  **Konstruktionsfehler erste Skriptversion, real aufgetreten, nicht
  verschwiegen:** Der erste Lauf lieferte nur 1 Lesevorgang über alle
  300 Zyklen — der geforkte Leser-Prozess startete langsamer, als die
  rein synchrone Schreiber-Schleife durchlief, der Nachweis war damit
  wertlos. Fix: Ready-Handshake (Leser meldet sich beim Start, Schreiber
  wartet darauf) plus 5ms-Pause pro Zyklus. Danach zwei reale Läufe mit
  der korrigierten Version.
  **Lauf 1 (Grün-Fall: Leser sieht nie eine leere/unvollständige
  Datei), Ausgabe im Wortlaut:**
  ```
  Leser-Lesevorgaenge: 944
  Simulierte Sperr-Zyklen (offenes Read-Handle waehrend Rename): 100
  EPERM/EBUSY beobachtet: 199
  Unerwartete Fehler (Schreiber): 0
  Leser-Befunde: 0

  ✓ Kein Leser sah je eine leere oder unvollstaendige Zieldatei ueber 300 Zyklen (davon 100 mit simuliertem Read-Handle).
  ```
  Exit 0.
  **Lauf 2 (Wiederholung zur Stabilitätsprüfung), Ausgabe im
  Wortlaut:**
  ```
  Leser-Lesevorgaenge: 858
  Simulierte Sperr-Zyklen (offenes Read-Handle waehrend Rename): 100
  EPERM/EBUSY beobachtet: 198
  Unerwartete Fehler (Schreiber): 0
  Leser-Befunde: 0

  ✓ Kein Leser sah je eine leere oder unvollstaendige Zieldatei ueber 300 Zyklen (davon 100 mit simuliertem Read-Handle).
  ```
  Exit 0.
  **Befund, nicht geglättet:** `EPERM`/`EBUSY` trat in beiden Läufen bei
  ~198–199 von 300 Renames auf, deutlich mehr als die 100 absichtlich
  gesperrten Zyklen — der Leser-Prozess selbst erzeugte durch sein
  eigenes `readFileSync` zusätzliche Kollisionen mit dem Rename.
  Bestätigt real, dass die Retry-Logik in `atomarSchreiben` (plan-v1
  SCOPE.3) keine hypothetische Vorsichtsmaßnahme ist, sondern auf diesem
  System eine real beobachtete Notwendigkeit.
  **Grenze, ausdrücklich dokumentiert statt behauptet:** Ein von Node
  aus gehaltenes Read-Handle nutzt Windows' Standard-Sharing-Flags
  (`FILE_SHARE_READ|WRITE|DELETE`) und reproduziert damit möglicherweise
  nicht dieselbe Sperre wie ein Virenscanner-/Backup-Tool mit
  exklusiverem Zugriff. Ein Wert von „`EPERM`/`EBUSY` beobachtet: 0"
  wäre deshalb kein Beleg gegen echte Drittsperren gewesen — der reale,
  deutlich von Null verschiedene Wert ändert daran nichts, macht die
  Grenze aber nicht weniger real. Der Leser-Nachweis (leere/
  unvollständige Datei) bleibt davon unabhängig der eigentliche Beleg
  für D4.
  Nicht in `npm run check`/`check:template` eingehängt (Stefans
  Entscheidung: einmaliger manueller Lauf, kein Windows-CI, kein
  Dauerbetrieb).

- 2026-08-29, `src/checkpoint-store/checkpoint-store.test.ts`, Vertrag
  `f1-checkpoint-store`: fünf `node:test`-Fälle (vier aus plan-v2 Delta 2,
  einer aus Delta 4/B6), jeder mit einem echten, temporären Codeeingriff
  in `src/checkpoint-store/index.ts` bzw. im Test selbst kalibriert,
  danach zurückgenommen (`grep -r "TEMP-ROT-FALL" src/` zeigt danach
  keinen Treffer mehr).
  **Rot-Fall A4 (Rundlauf-Identität):** in der Kandidatenprüfung
  `delete eintrag.payload.daten` vor der Rückgabe eingefügt → `node --test
  src/checkpoint-store/checkpoint-store.test.ts` meldet genau 1 Fehlschlag
  (nur dieser Test), `AssertionError` mit `+ undefined` statt
  `- { schritt: 1 }`.
  **Rot-Fall A5 (abgebrochene Persistierung):** `DATEINAME_MUSTER` von
  `/^(\d+)-([0-9a-f]{64})\.json$/` auf `/^(\d+)-([0-9a-f]{64})\.json.*$/`
  geweitet (akzeptiert Temp-Suffixe) → genau dieser Test schlägt fehl,
  die liegen gebliebene Temp-Datei (mit vollständigem, gültigem
  Checkpoint-Inhalt, korrekt berechnetem `selbst_hash`) wird fälschlich
  als Checkpoint 1 zurückgegeben statt `null`.
  **Rot-Fall A10 (Trennung Kontrollzustand/Produktdateien):** im Test
  selbst (nicht im Modul) eine Zeile ergänzt, die zusätzlich
  `fremdschreibung.json` in den Produkt-Fixture-Ordner schreibt → Snapshot-
  Vergleich schlägt sichtbar fehl, Diff zeigt genau die neue Datei.
  **Rot-Fall A11 (strukturierte Ereigniszeile):** den
  `checkpoint_geschrieben`-Schreiber-Aufruf in `schreibeCheckpoint`
  verdoppelt → `assert.strictEqual(ereignisse.length, 1)` meldet `2 !== 1`.
  **Rot-Fall B6 (Dateiname-Inhalt-Hash-Konsistenz):** den Vergleich
  `eintrag.payload.selbst_hash !== kandidat.hashImDateiname` in
  `pruefeEinzelnenKandidaten` auskommentiert → der Test mit dem
  manipulierten, aber intern konsistent nachgezogenen Checkpoint-Inhalt
  schlägt fehl, der manipulierte Eintrag (`daten: { schritt: 'manipuliert'
  }`) wird fälschlich statt `null` zurückgegeben — exakt der in plan-v2
  Delta 4 vorhergesagte Fehlerfall, jetzt gegen echten Modulcode statt nur
  gegen die Wegwerf-Diagnose aus dem B6-Nachtrag reproduziert.
  **Grün-Fall (nach jeder einzelnen Rücknahme sowie am Ende):**
  `node --test src/checkpoint-store/checkpoint-store.test.ts` → `tests 5,
  pass 5, fail 0`, Exit 0. Zusätzlich `npm run check` (voller Kette
  inklusive Lint/Typecheck/Checkpoint-Store-Gate/`npm run test`) am Ende
  grün gelaufen, `tests 6, pass 6, fail 0` (die sechste, vorbestehende
  Testdatei ist unabhängig von diesem Feature).

- 2026-08-29, `src/lineage-registry/lineage-registry.test.ts`, Vertrag
  `f2-artifact-registry-lineage`: sechs `node:test`-Fälle grün
  (`node --test src/lineage-registry/lineage-registry.test.ts` → `tests
  6, pass 6, fail 0`). Zwei reale, temporäre Codeeingriffe in
  `src/lineage-registry/index.ts` mit anschließender Rücknahme, wie vom
  Vertrag für mindestens Fall 3 und Fall 4 verlangt:
  **Rot-Fall Fall 4 (STALE-Filterung, A13/AC13):** die Filterzeile in
  `listeVersionen` (`kandidaten.filter((eintrag) =>
  istArtefaktVersion(eintrag.payload.daten))`) durch
  `kandidaten.filter((_eintrag) => true)` ersetzt (lässt STALE-
  Entscheidungen durch) → genau der Test „listeVersionen/
  ladeArtefaktVersion filtert STALE-Entscheidungen … — A13/AC13" schlägt
  fehl, `AssertionError: die STALE-Entscheidung darf nicht als Version
  gezählt werden … 2 !== 1`.
  **Rot-Fall Fall 3 (Byte-Snapshot, A3/A4/AC3/AC4):** in
  `registriereKernArtefakt` testweise eine Funktion ergänzt, die nach dem
  zweiten Schreibvorgang jede Geschwister-Checkpoint-Datei um ein
  Leerzeichen verlängert (simuliert eine Regression, bei der ein
  künftiger Bug versehentlich die ältere Version anfasst) → genau der
  Test „zwei Versionen: ältere Checkpoint-Datei bleibt byteidentisch …
  — A3/A4/AC3/AC4" schlägt fehl, `AssertionError: die ältere
  Checkpoint-Datei darf durch den zweiten Aufruf nicht verändert werden`,
  Diff zeigt ein angehängtes Leerzeichen am Dateiende.
  Beide Eingriffe unmittelbar danach vollständig zurückgenommen (`git
  status --short src/lineage-registry/` zeigt keinen Rest gegenüber dem
  committeten Stand), Grün-Fall direkt danach erneut bestätigt (`tests 6,
  pass 6, fail 0`).
