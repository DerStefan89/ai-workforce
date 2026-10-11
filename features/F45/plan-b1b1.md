# F45 B1b-1 — Plan (Harness im Lauf, Teil 1)

Branch `feat/f45-b1b1-harness-lauf` (Basis `cf433fd` = main mit B1a-2). Grundlage: Bauauftrag B1b-1 (Challenger,
11.10.2026), `docs/projekt/fixpaket-f45.md` (B1b), F-1026, F-1027, F-932, F-937, F-818, F-1035.

## Plan v1

### 1 Hintergrund (F-1026, P1)
- **1a Beobachtung.** `leseBeobachtung` (`src/claude-code-gateway/index.ts`) zählt jeden `tool_use`, dessen
  `input.run_in_background === true` ist (Bash, Agent/Task, jedes andere Werkzeug ebenso), in ein neues, optionales Feld
  `beobachtung.hintergrund_aufrufe: string[]` (Werkzeugname je Aufruf, Reihenfolge, Duplikate — Muster der übrigen
  `*_aufrufe`; Länge = Anzahl). Optional wie `navigate_adressen` (append-only, ältere Laufakten bleiben gültig).
  Schema `schemas/kontrollzustand-laufakte-payload.schema.json`, Typ `BeobachtungV0`, `validiereLaufakteDaten` nachziehen.
  Eine reine Hilfsfunktion `zaehleHintergrundAufrufe(zeilen)` (exportiert) ist die einzige Zählregel.
- **1a Klassifikation.** Result Evaluator: neuer FEHLGESCHLAGEN-Grund `hintergrund_ausfuehrung`, `daten:
  { grund, hintergrund_aufrufe: <Anzahl> }`. Gezählt wird aus dem hash-geprüften Rohstrom (Evaluator rechnet selbst nach,
  Muster Codex-Zweig „nachrechnen statt glauben“), nicht aus dem Laufakten-Feld. Stelle: im Claude-Code-Zweig nach
  `kein_ergebnisobjekt`, vor VERWEIGERT/ERFOLGREICH. Begründung ARCHITECTURE §4: ein Lauf, dessen Befehle im Hintergrund
  liefen, hat keine vollständige Beobachtungsbasis (Ergebnis nie gesehen) → FEHLGESCHLAGEN schlägt VERWEIGERT und ERFOLGREICH.
  Codex-Zweig unverändert (kein `run_in_background`).
- **1a Halt.** Kein neuer Status: FEHLGESCHLAGEN führt über Regel 1 (`ermittleNaechstenSchritt`) bereits zu
  `haltKlaerung` → KLAERUNG_ERFORDERLICH. Damit der Grund klar ist, baut der Server (Nachlauf in `starteWorkflowSchritt`,
  Muster `verweigertHalt`/F-760) bei `klassifikation.grund === 'hintergrund_ausfuehrung'` einen eigenen `haltKlaerung`
  mit dem Satz „Lauf hat Befehle in den Hintergrund geschoben — Ergebnis unvollständig (<n> Aufrufe, Lauf '<id>'). Schritt
  erneut starten; Prüfbefehle laufen nur im Vordergrund.“ Gilt für jede Rolle.
- **1b CLI-Abschaltung — belegt.** `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1`: Doku code.claude.com/docs/en/env-vars
  („Set to `1` to disable all background task functionality, including the `run_in_background` parameter on Bash and
  subagent tools, auto-backgrounding, and the Ctrl+B shortcut“); String im installierten CLI-Binary (6 Vorkommen).
  Wird für jeden Claude-Code-Lauf gesetzt (siehe 2a). Wirkung zusätzlich im realen Lauf belegt (Nachweis R1/R2).
  1a bleibt als deterministisches Netz (ändert die CLI ihr Verhalten, greift die Klassifikation).
- **1c Tests:** `src/claude-code-gateway/beobachtung.test.ts` (Zählung, ohne → Feld leer), `src/result-evaluator/…test`
  (Rohstrom-Attrappe mit `run_in_background:true` → FEHLGESCHLAGEN/`hintergrund_ausfuehrung`; ohne → ERFOLGREICH unverändert;
  mit Denials + Hintergrund → FEHLGESCHLAGEN), Server-Test für den Halt-Grund.

### 2 Lauf-Härtung (F-1027)
- **2a** Eine Konstante `WORKFORCE_LAUF_UMGEBUNG = { npm_config_ignore_scripts: 'true', CLAUDE_CODE_DISABLE_BACKGROUND_TASKS: '1' }`
  im Gateway; `starteGateway` reicht `{ ...optionen.umgebungsvariablen, ...WORKFORCE_LAUF_UMGEBUNG }` an den Starter
  (Aufrufer können sie nicht überschreiben). Gilt für jeden Claude-Code-Lauf (Chat, Router, Ausführung, Review). Folge:
  `npm install`/`npm ci` im Lauf ohne Lifecycle-Skripte (`prepare` → `git config` im geteilten `.git` entfällt);
  `npm run <skript>` läuft, aber ohne `pre`/`post`-Skripte (npm-Doku) — ai-workforce und Skelett haben keine.
  Der Prüfschritt des Servers (eigener Prozess) ist nicht betroffen. Test: Spy-Starter sieht beide Variablen, auch wenn
  ein Aufrufer `npm_config_ignore_scripts: 'false'` übergibt.
- **2b Realer Rot-Fall** (`features/F45/nachweise/b1b1/realer-lauf.mjs`, nicht Teil von `check`): Temp-Struktur
  `<tmp>/b1b1-<id>/projekt` (Git-Repo über `src/git-starter`) + Worktree `<tmp>/…/laeufe/wf-test`; Lauf mit den Argumenten
  aus `baueAufruf` (Werkzeugsatz `schreibend` aus `startvorlagen/ai-workforce.json`, `--setting-sources project`,
  Modell `claude-haiku-4-5`) und `WORKFORCE_LAUF_UMGEBUNG`, cwd = Worktree. Anweisung: per Write `../ausserhalb.txt`
  (Elternordner) und `<projekt>/EINDRINGLING.txt` (Projektordner) anlegen. Erwartung: beide verweigert
  (`permission_denials` bzw. `is_error` im tool_result), beide Dateien existieren danach nicht. Rohstrom + Zählung als Nachweis.

### 3 Hooks belegen (F-932, PreToolUse)
- Zweiter realer Lauf im selben Skript: Temp-Projekt mit Skelett-`settings.json` und Skelett-Hooks (dateiweise per
  `copyFileSync` mit genauem Pfad, keine Ordnerkopie), `--setting-sources project`. Anweisung: per Edit in
  `.claude/settings.json` einen Wert ändern. Erwartung: tool_result trägt den Grund aus `guard-settings.js`, Datei
  byte-gleich. Zählung: tool_use Edit, Denials, Hook-Grund gefunden ja/nein.
- Dritter Lauf (Kontrolle für 1b): ohne `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS`, Anweisung `npm run check:schnell` mit
  `run_in_background`. Erwartung: `hintergrund_aufrufe` ≥ 1, `klassifiziereLauf`-Logik → FEHLGESCHLAGEN. Derselbe Auftrag
  mit der Variable (Lauf 1 oder eigener Lauf): kein angenommener Hintergrund-Aufruf. Kosten je Lauf aus `verbrauch`.

### 4 commit-guard härten (K10, F-1035) — nur `.claude/hooks/commit-guard.cjs` von ai-workforce
- **Aufgabe 5 (.claude als Ziel):** Befehl in Segmente (`;`, `&&`, `||`, `|`, Zeilenumbruch) zerlegt; ein Segment mit
  schreibendem Verb (`cp`, `mv`, `rm`, `rmdir`, `rsync`, `tee`, `sed -i`, `robocopy`, `xcopy`, `del`, `Copy-Item`,
  `Move-Item`, `Remove-Item`, `ri`, `Set-Content`, `Out-File`, `ln`) und einem Argument mit Pfadsegment `.claude`
  (groß/klein egal, `./`-Varianten, Backslash, Platzhalter `*`/`?`/`[..]`, deren Muster `.claude` treffen kann) → sperren;
  Umleitung `>`/`>>` mit Ziel unter `.claude` → sperren. Lesen (`cat`, `ls`, `grep` auf `.claude`) bleibt frei.
- **Aufgabe 6 (destruktiv):** `rm` mit rekursiv+force (`-rf`, `-fr`, `-Rf`, `-r -f`, `--recursive --force`),
  `Remove-Item` mit `-Recurse` und `-Force` (auch abgekürzt `-r…`/`-fo…`), `git branch -D` / `--delete --force` /
  `-d -f`, `git reset --hard` → sperren.
- Reine Funktion `pruefeBefehl(command) → Grund | null` exportiert; Tests `scripts/commit-guard.test.mjs` (Spawn wie
  `skelett-hooks.test.mjs` + reine Funktion): Rot je Variante (inkl. `cp -rn .claude …` aus B1a-2), Grün für
  `npm run check`, `git status`, `git diff`, `git log`, `cat .claude/agents/x.md`, `rm datei.txt`.
- Skelett-Hooks unverändert (Template-Bytes, Drift-Gate `check-skelett-herkunft`). Finding für das Template-Repo.
- **E-183:** Der Ist-Zustand (settings.json + Schutzskripte) ändert seinen Hash → Startfreigabe von ai-workforce muss
  Stefan neu erteilen. Im Bericht ausdrücklich.

### 5 „Vorgesehen gegen benutzt“ ans Review (F-937, Teil Review)
- Reine Funktion `baueBeobachtungsBlock(beobachtung | null | undefined): string` (Gateway, neben `leseBeobachtung`):
  geladene vs. aufgerufene Skills, Subagenten, MCP-Server/-Aufrufe (dedupliziert mit Anzahl, je Liste höchstens 20
  Namen + „… und n weitere“), `hintergrund_aufrufe` (Anzahl). Keine Werkzeugliste, keine URLs, keine Pfade, kein Rohstrom.
  Ohne Beobachtung: „Beobachtung des Ausführungslaufs: keine Beobachtung (Codex-Lauf oder Lauf ohne init-Zeile) — ob
  vorgesehene Skills und Subagenten benutzt wurden, ist nicht belegt.“
- Server: im `code-reviewer`-Schritt (Worker Claude und Codex gleich) nach dem AK-Block; Ausführungslauf = der direkte
  gelaufene Vorschritt mit Rolle `ausfuehrung`, sonst der letzte gelaufene `ausfuehrung`-Schritt des Workflows; ohne
  Ausführungsschritt kein Block (Workflows ohne Ausführung bleiben bitgenau).
- Tests: Unit für den Block (mit/ohne Beobachtung, Kürzung); Server-Test (Muster `check-f35-ws2`-Attrappe) als
  `scripts/leitstand/review-beobachtung.test.mjs`: Review-Auftragstext enthält Block bzw. „keine Beobachtung“.

### 6 Vorstart-Scan (F-818)
- `scanneVerschachtelteClaudeOrdner(scanWurzel, ausnahmen = [])`: überspringt genau die relativen Pfade aus `ausnahmen`
  (ein Eintrag: `vorlagen/projekt-skelett/.claude`). `baueOrtBSkillStart(..., optionen?: { projektOrdner, installWurzel })`
  setzt die Ausnahme NUR, wenn `realpath(projektOrdner) === realpath(installWurzel)`. Der Scan läuft weiter auf der
  Laufwurzel (Projektordner oder dessen Worktree); verglichen wird der Projektordner (nicht der Worktree) mit der
  Installation. Begründung im Code: das Skelett ist Inhalt der Installation selbst (versioniert, Drift-Gate,
  Herkunft gehasht), kein Fremdinhalt; das Init-Gate prüft weiterhin init.skills/slash_commands fail-closed.
- Server reicht `projektOrdner` (= `repoWurzel` des Projekts) und `installWurzel` durch.
- Tests: Fake-Installation = Projekt mit `vorlagen/projekt-skelett/.claude/skills` → Start nicht blockiert; gleiche
  Struktur in einem Fremdprojekt (andere realpath) → blockiert; anderer verschachtelter Pfad in der Installation → blockiert.

### Akte, Findings, Doku
- Akte F45 „Stand B1b-1“, Statuszeile (B1a-2 gemergt #320), Zuschnitt B1b-1/B1b-2 + Verschiebungen (F-815/F-816 → F,
  F-929 → B2a, F-933 → Teil 2) in Akte und `fixpaket-f45.md`.
- Findings: F-1026, F-1027, F-932 (Teil PreToolUse), F-937 (Teil Review), F-818, F-1035 nach Wirkung; F-1035 zweiter
  Vorfall. Neu ab F-1037 (drei aus dem Auftrag; weitere nur, wenn im Bau belegt).

### Risiken
- `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` greift im `-p`-Modus evtl. anders als dokumentiert → realer Lauf belegt; 1a bleibt Netz.
- Ein Lauf, der legitim auf Hintergrund setzt (keiner heute), endet künftig FEHLGESCHLAGEN — gewollt.
- commit-guard ist auch in dieser Bausitzung aktiv; zu breite Muster bremsen echte Arbeit → Grün-Tests.
- Der Hook-Matcher deckt nur `Bash`; das PowerShell-Werkzeug läuft am commit-guard vorbei (settings.json = Stefan).
- E-183-Hash ändert sich → bis zur neuen Startfreigabe startet kein Workforce-Lauf auf ai-workforce.

## Advisor-Pass (frischer Kontext, 11.10.2026)
Urteil **tragfähig mit Änderungen**. Pflicht: A1–A5; Hinweise H1–H7. Anmerkung des Advisors: Teile (Gateway-Zählregel,
Umgebung, Schema) waren beim Pass schon gebaut — sie werden unten an v2 angeglichen.

## Plan v2 (Änderungen gegenüber v1)
- **A1 (belegt):** Rohstrom af862c09 zeigt kein `run_in_background`: `npm run check` mit `timeout: 300000` wurde
  **automatisch** verschoben; strukturiertes Signal ist `tool_use_result.backgroundTaskId` der zugehörigen user-Zeile
  (kein Text). Zählregel neu (`ermittleHintergrundAufrufe`): ein tool_use zählt, wenn (a) sein tool_result ein
  `tool_use_result.backgroundTaskId` (nicht leerer String) trägt, oder (b) `input.run_in_background === true` und sein
  tool_result nicht `is_error` ist (fehlt das tool_result, zählt (b) — fail-closed). Lauf R3 löst beide Formen aus.
- **A2:** Abgelehnte Versuche (is_error, auch Denial/Hook) zählen nicht. Tests getrennt: abgelehnter Hintergrund-Versuch
  → nicht gezählt; angenommener → gezählt.
- **A3:** VERWEIGERT mit Umgehungsverdacht (> 0) gewinnt; nur ohne Verdacht wird `hintergrund_ausfuehrung` gesetzt.
- **A4:** Zahl im Halt-Text aus `laufakte.beobachtung.hintergrund_aufrufe.length` (gleiche Zählregel); ohne Feld
  „Anzahl unbekannt“. Rückgabetyp von `klassifiziereLauf` bleibt.
- **A5:** Im Ausnahmefall werden zusätzlich die Skill-/Command-Namen aus `vorlagen/projekt-skelett/.claude` gesperrt
  (`leseProjektSkillNamen` auf dem Skelett, Kollisionsprüfung mit Ort-B-Namen inklusive). Verknüpfung bleibt Treffer,
  Abstieg bleibt, realpath-Vergleich unter win32 ohne Groß-/Kleinschreibung. Die Begründung stützt sich nicht mehr auf das Init-Gate.
- **H1:** Halt-Text nennt den echten Weg: neu ansetzen über eine Reparaturfassung; Prüfbefehle nur im Vordergrund.
- **H2:** `prozessstart.ts` entfernt beim Zusammenführen Schlüssel aus `process.env`, die sich nur in Groß-/Kleinschreibung
  von einem übergebenen Schlüssel unterscheiden (Windows: erster Treffer gewinnt) — sonst schlüge `NPM_CONFIG_IGNORE_SCRIPTS=false`.
- **H3:** Die zwei Gateway-Tests (`umgebungsvariablen` durchgereicht / fehlt) ändern ihr Soll bewusst; ein dritter belegt „nicht abwählbar“.
- **H4:** Restgrenze in F-1027: in Fremdprojekten mit `pre`/`post`-Skripten sieht der Lauf ein anderes Ergebnis als der Prüfschritt.
- **H5:** Ausführungslauf für den Review-Block = `findeAusfuehrungsSchritt` (bestehender Helfer) mit `lauf_id !== null`; keine eigene Ersatzregel.
- **H6:** Der Block zeigt „geladen gegen aufgerufen“; „vorgesehen“ kommt erst mit dem Arbeitspaket (B2a). F-937 → teilweise.
- **H7:** Zuschnitt bleibt (Auftrag gibt ihn vor); commit-guard (Teil 4) im Bericht als eigener Commit vorgeschlagen.
- **commit-guard (Frage 5):** zusätzlich Pipeline-Regel (ein Glied verweist auf `.claude`, ein anderes schreibt, auch
  `xargs`, `find … -delete`), Wechsel in `.claude` (`cd`, `Set-Location`, `pushd`) mit späterem Schreiben, Verb als
  Basisname (`/bin/…`, `.exe`), Verben `touch`, `mkdir`, `git checkout/restore` auf `.claude`, `node -e`/`python -c` mit
  `.claude`; destruktiv zusätzlich `git clean -f`, `git checkout .`/`-- .`, `git restore .` (ohne `--staged`),
  `git stash drop|clear`, `git worktree remove --force`, `git update-ref -d`. Quelle `.claude` mit schreibendem Verb
  bleibt bewusst gesperrt (Rot-Test). Bekannt: Heredocs/Mehrzeiler mit `.claude` im Text werden mitgesperrt (Edit/Write nutzen).
- **Freigabe Hook-Änderung:** Der Bauauftrag B1b-1 (Stefan über Challenger) beauftragt Teil 4 ausdrücklich.

## Nachtrag Bau und Korrekturrunde
- **Realer Rot-Fall (2b) fiel zunächst rot aus:** Write schrieb im `-p`-Lauf in Eltern- und Projektordner (nacktes `Write`
  in `--allowedTools`). Fix in `baueAufruf`: Write/Edit → `Edit(./**)` (F-1040); zweiter Durchgang erfüllt.
- **Befund F-1041:** `Bash(npm run check:*)` deckt `npm run check:<name>` nicht (CLI: `:*` ≡ ` *`); Nachweisläufe nutzen
  deshalb `npm run check`/`npm run test`. Fix nach B2b (Werkzeugsätze hier nicht erweitert).
- **A3 revidiert (code-reviewer):** ARCHITECTURE §4 ist bindend — FEHLGESCHLAGEN/`hintergrund_ausfuehrung` bleibt, ein
  Umgehungsverdacht steht in `daten` (Muster `claude_ordner_veraendert`).
- **Rohströme:** bleiben lokal (gitignoriert), Nachweis referenziert per SHA-256 (ARCHITECTURE §4); committet: Zählungen.
- **commit-guard:** Befehlsstellen statt jedes Token, Commit-/PR-Texte und Heredoc-Körper ohne Shell entfernt,
  Kurzflaggen-Bündel ≤ 4 Zeichen (kein `-ErrorAction`), `tar`.
- **npm-Beleg real** (QA): `prepare` mit Variable nicht ausgeführt, ohne Variable ausgeführt.
- **Gate:** `check-f35-ws2` (e) vergleicht den Review-Text vor dem Beobachtungs-Block.

## Nachtrag 2 (Auftrag Challenger, 11.10.2026)
- **Bash-Zeitgrenze:** `BASH_DEFAULT_TIMEOUT_MS`/`BASH_MAX_TIMEOUT_MS` im CLI belegt; Startvorlagen-Feld `bashZeitgrenzeMs`
  (Standard 600000, nicht über `zeitgrenzeMs`), Gateway setzt beide Variablen = min(Feld, Lauf-Zeitgrenze).
- **PowerShell (F-1042):** Eingabeform real belegt, Tests mit dieser Form; Matcher ändert Stefan.
- **Startfreigabe:** `werkzeugVersionDeklariert` in `startvorlagen/ai-workforce.json` von 2.1.258 auf 2.1.296 (installiert);
  Nachweis-Erzeugung, Commit im Autorisierungs-Repo und `state/aktuelle-autorisierung.json` macht Stefan (E3).
