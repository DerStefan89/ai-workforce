# Findings-Archiv — AI Workforce Harness

Erledigte Einträge aus `state/findings.md`, wörtlich verschoben (IDs, Text und Reihenfolge unverändert). Archivregel (F45 K,
E-K-1): der Status beginnt mit gelöst, behoben, erledigt oder korrigiert. Lesen nur bei Bedarf — eine erledigte Kennung
nachschlagen. Neue Einträge nie hier, sondern in `state/findings.md`. Archivlauf (gesammelt, wenn das Register spürbar
gewachsen ist): jeden Eintrag, der die Regel erfüllt, als ganzen Block (Kopfzeile bis vor die nächste) unverändert aus
`state/findings.md` ausschneiden und hier am Ende anfügen, in der Reihenfolge des Registers; der Eintrag mit der höchsten ID
bleibt immer im Register, damit `state/findings.md` allein die nächste freie ID ergibt. Kontrolle: beide Dateien zusammen
enthalten jeden Block des Registers vor dem Lauf byte-gleich; `scripts/check-f21-workboard.mjs` (2)(5)(6) prüft Form,
Eindeutigkeit, Archivregel und die höchste ID. Das Workboard im
Leitstand liest diese Datei nicht (bekannte Grenze, F45 K).

---

**F-001** · `HARNESS_IMPROVEMENT` · P1 · **gelöst**
Titel: `lint`/`typecheck`/`test` als echo-Stubs behauptet, real echte Befehle.
Beschreibung: `docs/harness/zaehne-taxonomie.md` (L1–L3) beschrieb alle drei als `echo`. Verifiziert im Bauauftrag `ebene2-architektur-in-repo-nachziehen`: `biome lint .`, `tsc --noEmit`, `node --test` — echte Befehle.
Fundstelle: `package.json` scripts.
Auswirkung: keine — Harness-Doku war veraltet, Repo nicht.
Maßnahme: keine. Ggf. `zaehne-taxonomie.md` bei Gelegenheit korrigieren (kosmetisch).
Feature/Run: Vertrag `ebene2-architektur-in-repo-nachziehen`, 28.08.2026.

**F-004** · `PROCESS_IMPROVEMENT` · P2 · **gelöst**
Titel: Handoff-Vertragsvorlage deckt fehlgeschlagenen Kalibrierungstest nicht ab.
Beschreibung: ESCALATE-Klauseln decken „Prüfung meldet unerwarteten Befund", aber nicht „erwarteter Rot-Fall tritt nicht ein" (Kalibrierung reproduziert sich selbst nicht).
Fundstelle: `state/tasks/ebene2-architektur-in-repo-nachziehen.md`, Abschnitt ESCALATE; betrifft den Skill `handoff-vertrag` generell.
Auswirkung: ausführende Sitzung musste improvisieren (korrekt gehandelt, aber ungedeckt).
Maßnahme: `.claude/skills/handoff-vertrag/SKILL.md`, ESCALATE-Bullet um den Fall „erwarteter Rot-Fall tritt nicht ein" ergänzt.
Feature/Run: Bauauftrag `ebene2-architektur-in-repo-nachziehen`, 28.08.2026; behoben Findings-Batch, 31.08.2026.

**F-005** · `PROCESS_IMPROVEMENT` · P1 · **gelöst**
Titel: Vertragstext ordnete `docs/projekt/*.md` nicht explizit dem Change-Set zu.
Beschreibung: Die Vorbedingung „Dateien liegen bereits vor" wurde nicht mit „gehören ins Change-Set" gleichgesetzt — beide Dateien fehlten im ersten Bericht der Stage-Liste.
Fundstelle: `state/tasks/ebene2-architektur-in-repo-nachziehen.md`.
Auswirkung: wäre ohne Review Runde 2 unbemerkt geblieben — die Dateien wären lokal auf Stefans Rechner geblieben.
Maßnahme: in Runde 2 nachgeholt, beide Dateien sind Teil des gemergten Commits (PR #13).
Feature/Run: Review Runde 1/2, 28.08.2026.

**F-009** · `TECH_DEBT` · P3 · **gelöst**
Titel: `package.json` Name `"projektname"` nicht umbenannt.
Fundstelle: `package.json:2`.
Auswirkung: kosmetisch, taucht in Lauf-Logs auf (`state/gates.md`).
Maßnahme: auf `"ai-workforce"` gesetzt.
Feature/Run: qa-Review Runde 1, 28.08.2026; behoben Findings-Batch, 31.08.2026.

**F-010** · `TECH_DEBT` · P4 · **gelöst**
Titel: `kontrollzustand/`/`profiles/` in `ARCHITECTURE.md` im Präsens beschrieben, existieren noch nicht.
Fundstelle: `ARCHITECTURE.md` Abschnitt 1.
Auswirkung: niedrig, über `docs/STATUS.md` indirekt auflösbar; `ARCHITECTURE.md` selbst macht Soll/Ist nicht kenntlich.
Maßnahme: mit Feature 0 (Datenformate) erledigt — `kontrollzustand/.gitkeep` und
`profiles/.gitkeep` existieren real, Format über `schemas/*.schema.json`
maschinell geprüft (`scripts/check-datenformate.mjs`).
Feature/Run: qa-Review Runde 1, 28.08.2026; gelöst in Feature F0, 29.08.2026.

**F-012** · `TECH_DEBT` · P1 · **gelöst**
Titel: ADR-Datumsfeld widersprach zitierter Fundstelle.
Beschreibung: `**Datum:** 2026-08-22` in `docs/adr/oberflaechentechnik-leitstand.md` und `docs/adr/ein-ebenen-profilmodell.md` passte nicht zur zitierten Fundstelle (Nachtrag 28.08.2026).
Fundstelle: beide ADR-Dateien, Kopfzeile.
Maßnahme: vor dem Commit auf `2026-08-28` korrigiert.
Feature/Run: code-reviewer Runde 2, 28.08.2026.

**F-016** · `TECH_DEBT` · P3 · **gelöst**
Titel: `state/memory-map.md` Zeile 2 trägt noch `[PROJEKTNAME]` statt „AI Workforce".
Fundstelle: `state/memory-map.md:2`.
Auswirkung: niedrig, aber echter übersehener Platzhalter — inkonsistent mit den drei neu ergänzten, korrekt befüllten Zeilen direkt darunter.
Maßnahme: `[PROJEKTNAME]` durch „AI Workforce" ersetzt.
Feature/Run: behoben Findings-Batch, 31.08.2026.

**F-020** · `PROCESS_IMPROVEMENT` · P1 · gelöst
Titel: Handoff `claude/88` stellte den Baustatus von F1 (Checkpoint Store) falsch dar.
Beschreibung: `claude/88_HANDOFF_ARTIFACT_REGISTRY_LINEAGE.md` behauptete am 29.08.2026, F1 sei bereits „fertig gebaut ..., gemerged (PR #19)". Realer Repo-Stand zum Prüfzeitpunkt (frischer Klon, volle Historie, `main` HEAD `bf55dad`): PR #19 (Commit `2ef00fb`) änderte ausschließlich acht Planungs-/Vertragsdateien — kein `src/`-Verzeichnis im Repo. `state/tasks/f1-checkpoint-store.md` benannte explizit „Freigabe-Halt: kein Bau in diesem Schritt". `docs/STATUS.md` listete F1 nicht unter „Erledigt".
Fundstelle: `claude/88_HANDOFF_ARTIFACT_REGISTRY_LINEAGE.md` Abschnitt 1; Repo `DerStefan89/ai-workforce`.
Auswirkung: Ohne Gegenprüfung wäre Feature 2 (Artifact Registry / Lineage) auf einer nicht existierenden Code-Grundlage weitergeplant worden.
Maßnahme: F1 zuerst real gebaut (Commit `d9595f6`), PR #20 (Draft) eröffnet, CI grün, Diff gegengeprüft, gemergt. Abschließend verifiziert: `main` HEAD `fa51a61`, `src/checkpoint-store/{index,types,checkpoint-store.test}.ts` real vorhanden. Lehre: „fertig gebaut/gemerged"-Behauptungen vor Weitergabe gegen `git log`/`git show --stat` verifizieren, nicht gegen Berichtsprosa allein übernehmen.
Feature/Run: Challenge Artifact Registry / Lineage, F1-Bauauftrag, PR #19/#20, `main` `fa51a61`, 29.08.2026.

**F-022** · `BUG` · P2 · gelöst (vor Push behoben)
Titel: Rohe Steuerbytes (NUL bis US) im Quelltext von `pruefeLaufId` statt Escape-Sequenz.
Beschreibung: Zeichenklasse enthielt versehentlich rohe Steuerbytes statt Escape-Text — Git erkannte `src/checkpoint-store/index.ts` dadurch als Binärdatei.
Fundstelle: `src/checkpoint-store/index.ts`, Funktion `pruefeLaufId`.
Auswirkung: hätte eine als Binärdatei markierte „Quelldatei" committet, Diff-/Review-Werkzeuge hätten den Inhalt nicht sinnvoll anzeigen können.
Maßnahme: vor Commit behoben (bytesichere Prüfung `charCodeAt(0) < 32`), alle neuen Dateien auf Steuerbytes gescannt, `npm run check` danach grün.
Feature/Run: F1-Bauauftrag, Commit `d9595f6`, 29.08.2026.

**F-024** · `HARNESS_IMPROVEMENT` · P2 · **gelöst**
Titel: Dokumentiertes git-flow-Risiko „Bequemlichkeits-Merge-Link" ist real erneut eingetreten — Skill-Präventionsregel fehlt noch.
Beschreibung: `.claude/skills/git-flow/SKILL.md` benennt den Fall bereits, aber ohne feste Regel. PR #19 wurde nach dem ersten Push gemergt, während am zweiten Commit noch gearbeitet wurde. Richtig aufgefangen durch Draft-PR #20 (GitHub verweigert Merge eines Drafts strukturell).
Fundstelle: `.claude/skills/git-flow/SKILL.md`, „Common Issues"; PR #19/#20, 29.08.2026.
Auswirkung: kein Datenverlust, aber ein überflüssiger zweiter PR-Zyklus.
Maßnahme: Skill um feste Regel ergänzt (Schritt 8): mehrteiliger Bau → PR grundsätzlich als Draft öffnen, erst mit letztem Commit „ready for review". Status: bei F1B/PR #25 und F3/PR #26 beide Male als Draft geöffnet — bewährt sich, Skill-Text jetzt nachgezogen.
Feature/Run: F1-Bauauftrag, PR #19/#20, 29.08.2026; erneut angewendet PR #25/#26, 30.08.2026.

**F-025** · `PROCESS_IMPROVEMENT` · P1 · **gelöst**
Titel: Rollenketten-Durchlauf lief als Serie einzeln bestätigter Mikroschritte statt gebündelt — zu langsam.
Beschreibung: Für Feature 2 wurde nach jedem Git-Vorgang einzeln rückgefragt, jeder Rollenketten-Schritt einzeln angestoßen — jeder Zyklus kostet eine volle manuelle Runde zwischen Challenger-Sitzung und lokaler Claude-Code-Sitzung.
Fundstelle: Feature 2, plan-v1-Anlauf, 29.08.2026.
Auswirkung: hoch für Geschwindigkeit, kein inhaltliches Risiko.
Maßnahme: nicht verzweigende Rollenketten-Schritte bündeln, Rückfrage nur bei echter Verzweigung/Irreversiblem/Merge nach main. Verifikationspflicht bleibt in jedem Schritt bestehen. Ergänzung: Urteils-Schritte (Advisor) brauchen weiter frischen Kontext, sonst prüft die KI faktisch sich selbst. Ergänzung: commit-guard-Freigabe pro Commit bleibt bestehen (bewusste Sicherheitsarchitektur, keine Reibung). Status: bei F1B/F3 zweimal in Folge bewährt, jetzt zusätzlich als feste Regel in `CLAUDE.md` (Iterationsprinzip) verankert.
Feature/Run: Feature 2, 29.08.2026; F1B, F3, 30.08.2026.

**F-028** · `TECH_DEBT` · P1 · gelöst
Titel: Wirkungsmarke (`RUN_PREPARED`, Terminalzustände) fehlte trotz A5-Vorgabe im Code.
Beschreibung: A5 verlangt zwei Artefakttypen (Checkpoint, Wirkungsmarke) in derselben Kette — nur Checkpoint existierte. Ohne Wirkungsmarke war der Doppelausführungsschutz nicht darstellbar.
Fundstelle: `src/checkpoint-store/types.ts`.
Auswirkung: hoch bis zur Behebung.
Maßnahme: als Feature F1B geschnitten, gebaut, gemergt (PR #25, `main` `8520714`), verifiziert (24/24 Tests grün).
Feature/Run: Challenge F4/E2E-Workstream, 29.08.2026 → F1B, 30.08.2026.

**F-030** · `HARNESS_IMPROVEMENT` · P2 · **korrigiert**
Titel: Kein freigegebener Bash-Kanal für einen künftigen Executor-Start.
Beschreibung: `.claude/settings.json` `permissions.allow` erlaubt nur `npm run check|check:template|lint|typecheck|test`. Ein späteres Gateway-Feature braucht einen freigegebenen Bash-Weg.
Fundstelle: `.claude/settings.json`.
Auswirkung: gering jetzt, blockierend bei Feature 6 (Gateway).
Maßnahme: eigener Vertrag nach Muster der Option-B-npm-run-Allowlist-Härtung, vor Feature 6 einplanen.
Feature/Run: Challenge F4/E2E-Workstream, 29.08.2026.
**Nachtrag 31.08.2026 (F6a-Challenge, F-030 real geprüft):** Prämisse widerlegt.
`.claude/settings.json` `permissions.allow` gated ausschließlich Bash-Aufrufe, die
eine Claude-Code-Sitzung selbst als obersten Tool-Call vorschlägt — nicht
Subprozesse, die bereits freigegebener Code (z. B. innerhalb von `npm run test`)
intern per Node `child_process` startet. Beleg: `npm run check` ruft bereits 15
verschachtelte Skripte/Prüfungen auf, keines davon hat einen eigenen
`permissions.allow`-Eintrag. `state/tp-nachtrag.md` („TP-03 d“) zeigt zudem, dass
ein direkter `claude -p ...`-Aufruf schon heute ohne jeden `permissions.allow`-
Eintrag funktioniert (menschlich anwesende Sitzung, "ask"-Rückfrage statt
Blockade) — normaler, unveränderter Zustand, keine Gateway-spezifische Lücke.
Die künftige Gateway-Komponente (`src/claude-code-gateway`, F6b) ist selbst
gewöhnlicher Node-Code, kein Claude-Code-Tool-Call — sie unterliegt
`.claude/settings.json` nicht. **F-030 blockiert WS2/WS3 damit nicht** und
braucht keinen eigenen Harness-Vertrag. Die tatsächlich offene,
sicherheitsrelevante Frage (Subprozessstart per `execFile`/`spawn`-Argv-Array
statt Shell-String, wegen Prompt-Injection-Risiko über Shell-Metazeichen im
`-p`-Argument) ist als eigenständiges, enger gefasstes Finding **F-057**
erfasst. Vollständige Herleitung: `features/F6a/journal.md`, Abschnitt
„Challenge F-030“.

**F-033** · `PROCESS_IMPROVEMENT` · P2 · **gelöst**
Titel: Rot-Fall-Kalibrierung an echter Sicherheitsprüfung löst den plattformseitigen Auto-Mode-Classifier aus.
Beschreibung: Ein Kalibrierungsversuch, der Code der echten Autorisierungs-/Hash-Prüfung testweise veränderte, wurde vom Auto-Mode-Classifier blockiert (nicht über `.claude/settings.json` konfigurierbar). Behoben über manipulierte Testfixtures (falscher `datei_hash`/`commit_hash`) statt Code-Änderung — gleicher Beweiswert.
Fundstelle: F3-Bauauftrag, Kalibrierungsschritt `node --test src/authorization-boundary/`.
Auswirkung: gering pro Vorfall, wiederkehrend bei künftiger Rot-Fall-Kalibrierung an sicherheitsrelevantem Code.
Maßnahme: `.claude/skills/handoff-vertrag/SKILL.md`, neuer Abschnitt „Konvention: Rot-Fall-Kalibrierung an geprüfter Logik" ergänzt.
Feature/Run: F3-Bauauftrag, 30.08.2026; behoben Findings-Batch, 31.08.2026.

**F-035** · `PROCESS_IMPROVEMENT` · P1 · **gelöst**
Titel: Wiederholung von F-005 — `feature.md`/Planungsdokumente fehlten im ersten F3-Commit.
Beschreibung: Erster F3-Commit (`c7b4974`) enthielt Modul/Schema/Gate/Tests, aber nicht `features/F3/feature.md` und zugehörige Planungsdateien — CI schlug fehl (check-feature.mjs: „feature.md fehlt"). Gleiches Muster wie F-005: OUTPUT-Liste im Vertrag wurde zu wörtlich genommen.
Fundstelle: Commit `c7b4974`; `state/tasks/f3-authorization-boundary.md`.
Auswirkung: ein zusätzlicher Korrektur-Commit, roter CI-Lauf vor Merge.
Maßnahme: `.claude/skills/handoff-vertrag/SKILL.md`, OUTPUT-Bullet um festen Punkt ergänzt: Feature-Akte und alle erzeugten Planungs-/Advisor-/Vertragsdokumente ausdrücklich Teil des Commits.
Feature/Run: F3-Bauauftrag, Merge-Vorbereitung, 30.08.2026; behoben Findings-Batch, 31.08.2026.

**F-037** · `PROCESS_IMPROVEMENT` · P1 · **erledigt durch E-191**
Titel: Übergabepapier zur Bedarfsanalyse kollidiert an vier Stellen mit entschiedenen Nicht-Zielen (013, 014, Zielfassung §2, 03_KONTEXT §3.11).
Beschreibung: Das Papier „Modellagnostische Bedarfsanalyse & Capability Library" forderte in §3.3/§3.4/§15/§16 eine anbieterübergreifende Provider-Abstraktion, einen zehnteiligen Rollenkatalog und automatische Discovery (V2/V3) — widerspricht Entscheidung 013 (kein generischer Provider-Adapter in Fassung 1), Entscheidung 014 (Profile injizieren keine neuen Rollen), Zielfassung §2 Nicht-Ziele, `03_KONTEXT_UND_UEBERGABE.md` §3.11 (kein automatisches Tool-/MCP-Sammeln ohne konkretes Problem).
Fundstelle: Übergabepapier §3.3/§3.4/§15/§16 gegen `04_ENTSCHEIDUNGSREGISTER_001_176.md` 013/014, `claude/11_ZIELFASSUNG_V1.md` §2/§4, `03_KONTEXT_UND_UEBERGABE.md` §3.11.
Auswirkung: Ohne Schnitt wäre ein Feature gebaut worden, das eine nummerierte Entscheidung still überschreibt.
Maßnahme: Scope-Schnitt vorgenommen, Entscheidung 013 bestätigt und um Nachrüst-Auflagen ergänzt (E-191).
Feature/Run: Challenge Bedarfsanalyse, 30.08.2026.

**F-045** · `PROCESS_IMPROVEMENT` · P2 · **gelöst**
Titel: Lesende Verifikation über die Geräte-Bridge in einem parallel genutzten Arbeitsverzeichnis kann mit einem laufenden lokalen Git-Prozess kollidieren und über `git checkout`/`pull` unbeabsichtigt Working-Tree-Zustand verändern.
Beschreibung: `.git/index.lock` trat während des F5-Merge-Abschlusses real zweimal auf; zusätzlich stand die lokale `main` nach dem PR-#30-Merge nicht mehr synchron zum Arbeitsverzeichnis (uncommittete Dateien identisch zum bereits gemergten Stand vorhanden, lokale `main` zwei Commits zurück). Ursache nicht abschließend geklärt, aber im Muster deckungsgleich mit einer Kollision zwischen einem parallel auf demselben Repo laufenden Git-Vorgang und einer lesenden Verifikation von außen.
Fundstelle: `.git/index.lock`-Kollisionen, F5-Merge-Abschluss, 31.08.2026.
Auswirkung: gering im real beobachteten Fall (Inhalt vor Wiederherstellung byteidentisch gegen `origin/main` geprüft, kein Datenverlust) — potenziell höher bei einem `checkout`/`pull`/`reset` ohne vorherige Verifikation.
Maßnahme: externe Verifikation auf index-neutrale Befehle beschränkt (`git log`, `git show <rev>:<pfad>`, `git diff <revA> <revB>`), kein `checkout`/`pull`/`reset` auf einem potenziell parallel genutzten Repo — als feste Regel in `docs/harness/geraete-bruecke-verifikation.md` festgehalten, zusammengeführt mit F-034.
Feature/Run: F5 Context Builder, Merge/Abschluss, 31.08.2026; behoben Findings-Batch, 31.08.2026.

**F-047** · `BUG` · P1 · **behoben**
Titel: Schutzskript-Hash-Prüfung mengenbasiert statt pfadgebunden (E-183/AC3 nur teilweise erfüllt).
Beschreibung: `schutzskriptHashSaetzeGleich` (`src/invocation-policy/index.ts`)
vergleicht Ist- und Baseline-Hashes als sortierte Menge;
`IstZustand.schutzskript_hashes` (`types.ts`) hat kein Pfadfeld. Ein
Inhalts-Swap zwischen zwei Schutzskripten ändert die Hash-Menge nicht und
wird von `pruefeStartbedingung1` nicht erkannt, obwohl AC3 den Hash jedes
einzelnen Schutzskripts fordert.
Fundstelle: `src/invocation-policy/index.ts` (`schutzskriptHashSatz`,
`schutzskriptHashSaetzeGleich`, `pruefeStartbedingung1`),
`src/invocation-policy/types.ts` (`IstZustand`).
Auswirkung: Sicherheitsgarantie von E-183 nicht vollständig eingehalten;
aktuell folgenlos (kein Aufrufer), wird zur echten Lücke sobald F6 diese
Prüfung produktiv nutzt.
Maßnahme: `IstZustand` + Vergleichslogik auf pfadgebundene Hash-Paare
umstellen. Muss vor F6-Anbindung geschlossen sein.
Fix: `IstZustand.schutzskript_hashes: string[]` → `schutzskripte:
{ pfad, hash }[]` (`src/invocation-policy/types.ts`, neuer Typ
`SchutzskriptEintrag`). Neue Funktion `schutzskripteStimmenUeberein`
(`src/invocation-policy/index.ts`) ersetzt den mengenbasierten Vergleich in
`pruefeStartbedingung1` (E-183) durch einen pfadgebundenen: jeder
Baseline-Pfad muss im Ist-Zustand mit demselben normalisierten Pfad UND
Hash vorkommen. E-188 (`pruefeStartbedingung2`/`Gueltigkeitsschluessel`)
bleibt bewusst mengenbasiert — das Wirksamkeitsnachweis-Schema trägt keine
Pfadbindung, Repräsentation des Gültigkeitsschlüssels ist laut §16.8
Punkt 8 ein eigener, weiterhin offener Punkt außerhalb dieses Fixes.
Beleg (TEMP-ROT-FALL-Methodik): neuer Testfall „vertauschte
Schutzskript-Inhalte … liefert ABGELEHNT — F-047" zunächst gegen den
unveränderten Code laufen lassen — `bedingung1.ok` war `true` (fälschlich
FREIGEGEBEN-fähig) statt der erwarteten `false`, AssertionError bestätigt
die Lücke real. Nach dem Fix (Typ + Vergleichsfunktion + alle Aufrufstellen
in `invocation-policy.test.ts` und `scripts/check-f4-invocation-policy.mjs`
angepasst, dort zusätzlich als eigener Gate-Rot-Fall ergänzt) läuft
derselbe Fall korrekt auf `ok:false` (E-183). `npx tsc --noEmit` sauber,
`node --test src/invocation-policy/invocation-policy.test.ts` 7/7 grün,
`node scripts/check-f4-invocation-policy.mjs` grün, `npm run check`
Exit 0 (58/58 Tests).
Feature/Run: F4 Invocation Policy, retroactiver Review-Pass, 31.08.2026;
behoben 31.08.2026 (kein neuer Vertrag/Advisor-Zyklus, kleiner Fix
innerhalb des freigegebenen AC3-Scopes).

**F-048** · `BUG` · P1 · gelöst
Titel: Mehrwort-Verbotsparameter matcht nicht gegen ein tokenisiertes
Aufruf-Array (Fail-Open bei `--permission-mode bypassPermissions`).
Beschreibung: `pruefeAufrufparameter` prüft `parameter.includes(verbotenerWert)`
elementweise. Der Listeneintrag `'--permission-mode bypassPermissions'` ist ein
einzelner String mit eingebettetem Leerzeichen. Übergibt ein Aufrufer den
Aufruf als natürliches Tokens-Array (`['--permission-mode',
'bypassPermissions']`, analog `process.argv`), matcht dieser Eintrag nie.
Zusätzlich ungetestet: Groß-/Kleinschreibungs- und Whitespace-Varianten
(strenger Stringvergleich ohne Normalisierung).
Fundstelle: `src/invocation-policy/verbotene-aufrufparameter.ts:9-16,18-25`;
bereits als „offene Unsicherheit 4" in
`state/plan-v1-f4-invocation-policy.md` und `features/F4/journal.md`
dokumentiert (nicht stillschweigend in Code verwandelt).
Auswirkung: aktuell folgenlos (F4 hat keinen Aufrufer). Wird zur echten
Sicherheitslücke, sobald F6 (Claude-Code-Gateway) `pruefeAufrufparameter`
erstmals mit einer konkreten Aufrufrepräsentation aufruft — und zwar
ausgerechnet beim gefährlichsten Listeneintrag.
Maßnahme: Aufrufrepräsentation im F6-Challenge festlegen (Tokens-Array vs.
Kommandozeilen-String) und `pruefeAufrufparameter` entsprechend härten;
Testfall für die tokenisierte Form ergänzen. Muss vor der F6-Anbindung
entschieden sein.
Feature/Run: F4 Invocation Policy, retroactiver Review-Pass (code-reviewer
Befund 1 = qa Befund 5), 31.08.2026; gelöst F6a WS1, 31.08.2026 —
`enthaeltTokenFenster` in
`src/invocation-policy/verbotene-aufrufparameter.ts` erkennt einen
Mehrwort-Verbotseintrag jetzt gegen ein tokenisiertes Aufruf-Array
(F-048-Fix-Kommentar im Code), gefordert von F6a AK2.

**F-053** · `TECH_DEBT` · P1 · **gelöst**
Titel: E-188-Wirksamkeitsnachweis ohne je erbrachten Rot-Fall (§16.8
Punkt 3) — blockierend für F6b.
Beschreibung: `pruefeStartbedingung2`
(`src/invocation-policy/index.ts`) prüft, dass ein
Wirksamkeitsnachweis zum aktuellen Gültigkeitsschlüssel passt — nicht,
dass dieser Nachweis je durch einen echten Rot-Fall (Schutzschicht
tatsächlich wirksam gegen einen realen Umgehungsversuch getestet)
verdient wurde. `docs/projekt/zielfassung.md` §16.8 Punkt 3 führte „Der
konkrete bekannte Rot-Fall der Wirksamkeitsprüfung" bis dahin als offen.
Solange kein Aufrufer schreibt, folgenlos; sobald F6b (Claude-Code-
Gateway, Schreibwirkung) startet, war F4s `FREIGEGEBEN` für E-188 eine
ungedeckte Behauptung.
Fundstelle: `src/invocation-policy/index.ts`
(`pruefeStartbedingung2`); `docs/projekt/zielfassung.md` §16.8 Punkt 3.
Auswirkung: hoch bei F6b, null bei F6a (F6a führt keine
Schreibwirkung aus, siehe `features/F6a/feature.md` Nicht-Ziele).
Maßnahme: `scripts/verify-f6b-ws-f-rotfall.mjs` (F6b WS-F) reproduziert
den in F-078 (WS-A-Sondierung) beobachteten Rot-Fall jederzeit real über
die echte F6a/F7-Kette: `starteGateway` mit handgebauten Tokens
(`--allowedTools Read,Glob,Grep` statt `--tools`, Begründung im
Skript-Kopfkommentar — `baueAufruf` emittiert immer `--tools`, das
Zusammenspiel beider Flags würde den Nachweis laut F-078 Messfall 3
verdecken) gegen eine selbst angelegte Wegwerf-Kopie unter
`os.tmpdir()` außerhalb dieses Repos (E6), Schreibauftrag im Prompt,
Auswertung über F7s unveränderten `klassifiziereLauf`. QA-Pass (frischer
Kontext) fand vor Freigabe eine echte Lücke in der ersten
Skriptversion: `ergebnis: 'VERWEIGERT'` allein bewies nicht, dass die
Denial speziell den Write-Versuch betraf. Behoben: das Skript liest den
Rohstrom zusätzlich selbst (F6as `leseErgebnisobjekt` wiederverwendet)
und verlangt für Exit 0 zusätzlich einen `permission_denials`-Eintrag
mit `tool_name: "Write"`. Realer Lauf 03.09.2026 (nach der Korrektur):
`ergebnis: 'VERWEIGERT'`, `bypass_verdacht_anzahl: 0`,
`permission_denials` enthält real `tool_name: "Write"` mit `tool_input`
genau auf die im Prompt genannte Datei, die Datei selbst nicht
entstanden — siehe `state/gates.md` für den vollständigen
Konsolen-Beleg. Skript gibt am Ende einen kopierbaren
`rot_fall_beleg`-Text aus (lauf_id, F1B-Wirkungsmarke-Pfad, Zeitstempel,
Kurzfassung) — Ersatz für den Platzhaltertext im Wirksamkeitsnachweis
von WS-E (F-085, ein WS-E-Re-Lauf mit diesem Text ist Stefans separate
Entscheidung, nicht Teil dieser Lösung).
Feature/Run: Challenge F6/F6a, 31.08.2026; gelöst F6b WS-F, 03.09.2026.

**F-056** · `PROCESS_IMPROVEMENT` · P2 · **gelöst**
Titel: Feature-Branch nach Squash-Merge nicht gelöscht/rebased → zweite Divergenz-Kollision.
Beschreibung: Nach PR #36 (Squash-Merge von Commit `4296504`) wurde auf `feature/f6a-gateway-lesepfad` weitergearbeitet statt der Branch gelöscht oder sofort neu von `main` abgezweigt. Dasselbe Muster wie F-054 (dort als Near-Miss dokumentiert), hier real mit GitHub-Merge-Konflikten in `feature.md`/`journal.md`/`findings.md` auf einem Branch mit echtem Produktcode (WS1-Build). Diagnose: `git diff 4296504 ad72e14 --stat` leer (identische Bäume), behoben per `git rebase --onto ad72e14 4296504 feature/f6a-gateway-lesepfad` und `git push --force-with-lease`, danach konfliktfrei gemergt (PR #37).
Fundstelle: PR #36 → `feature/f6a-gateway-lesepfad` → PR #37.
Auswirkung: bisher nur Merge-Reibung, kein Datenverlust; Risiko steigt mit Branch-Lebensdauer nach Squash-Merges.
Maßnahme: Prozessregel — nach jedem Squash-Merge den Quell-Branch löschen (GitHub-Standardangebot nutzen) oder sofort per `git rebase --onto <main-HEAD> <alter-pre-squash-commit> <branch>` aktualisieren, bevor weitergearbeitet wird.
Feature/Run: F6a WS1, PR #36/#37, 31.08.2026.
**Nachtrag 31.08.2026 (zweites Auftreten, WS2/WS3-Planung):** Gleiches
Muster erneut auf `docs/f6a-ws2-ws3-plan-v1` (PR #39 → #40) — diesmal
zusätzlich verschärft, weil der zwischenzeitlich gemergte PR #39 bereits
überholten Inhalt (Fassung 1 vor Advisor-Korrektur) auf `main` brachte.
Diagnose identisch: `git diff 2eb7d60 d416a8d --stat` leer, behoben per
`git rebase --onto d416a8d 2eb7d60 docs/f6a-ws2-ws3-plan-v1` und
`git push --force-with-lease`, danach konfliktfrei gemergt (PR #40).
Maßnahme bestätigt, Priorität unverändert P2, da weiterhin nur
Merge-Reibung ohne Datenverlust — die eigentliche Prozessregel
(Branch nach Merge löschen) wurde bisher nicht befolgt; das ist der
eigentliche Wiederholungsgrund.
**Nachtrag 03.09.2026 (gelöst):** Manuelle Prozessregel durch einen
mechanischen Diagnose-Hook ersetzt — `.githooks/pre-push` bricht `git
push` auf einem Nicht-main/master-Branch ab, wenn `merge-base HEAD
<remote>/main` von `<remote>/main` abweicht (Divergenz-Erkennung vor
dem Push statt Merge-Konflikt erst im PR), mit der konkreten
Fix-Anleitung (`git checkout main; git merge --ff-only …; git branch
-f …; git cherry-pick …`) direkt in der Fehlermeldung. Fail-open bei
nicht erreichbarem Remote (Diagnose-Hook, kein Sicherheits-Guard).
Aktivierung über `"prepare": "git config core.hooksPath .githooks"`
in `package.json` — läuft automatisch bei `npm install`, kein
manueller Schritt pro Maschine. Real belegt: Branch von einem
veralteten Commit abgezweigt → `git push` real abgelehnt mit der
Fix-Meldung; Branch frisch von `origin/main` abgezweigt → `git push`
real durchgelassen (beide Fälle gegen ein lokales Bare-Repo als
simuliertes Remote, nicht gegen den echten `origin`).

**F-059** · `TECH_DEBT` · P2 · **gelöst**
Titel: `modell_beobachtet` bleibt in WS2 hart `null` — keine Extraktion aus der realen Laufausgabe.
Beschreibung: `state/tp-nachtrag.md` belegt an keiner Stelle ein `model`-Feld im `"type":"result"`-JSON von `claude -p --output-format json`. Statt eines geratenen Feldnamens setzt WS2 (`src/claude-code-gateway/index.ts`) den Wert bewusst hart auf `null`; Schema (`schemas/kontrollzustand-laufakte-payload.schema.json`) führt `modell_beobachtet` als `string | null`. Entspricht der ursprünglichen Design-Entscheidung 5 aus `state/plan-v1-f6a-ws2-ws3-prozessstart.md` (Annahme, nicht Fakt) und der expliziten Bauanweisung, nicht zu raten.
Fundstelle: `src/claude-code-gateway/index.ts`, `schemas/kontrollzustand-laufakte-payload.schema.json`, `features/F6a/feature.md` AK8.
Auswirkung: gering — Modellidentität war ohnehin nur Rang `OBSERVED`, nie Zusicherung (E-185); die Laufakte funktioniert vollständig auch ohne dieses Feld.
Maßnahme: WS4 SCOPE 7 (03.09.2026, FOLGT-Klausel `state/tasks/f6a-ws4-windows-prozessstart.md`) lieferte erstmals ein echtes `"type":"result"`-Objekt — es trägt ein `modelUsage`-Objekt, dessen (einziger) Schlüssel den Modellnamen bildet (`"claude-sonnet-5"`, real gemessen). `leseModellBeobachtet` (`src/claude-code-gateway/index.ts`) extrahiert ihn nur bei genau einem Schlüssel, sonst bleibt der Wert `null` (nicht raten, Muster F-059/F-061 bleibt für den Ambiguitätsfall gültig).
Feature/Run: F6a WS2-Bau, 31.08.2026; gelöst in WS4, 03.09.2026.

**F-062** · `HARNESS_IMPROVEMENT` · P3 · **gelöst**
Titel: `leseErgebnisobjekt` (F6a) nicht exportiert — F7 kann die Ergebnisobjekt-Parsing-Logik ohne Export nicht wiederverwenden (D5).
Beschreibung: `src/claude-code-gateway/index.ts:71` definiert `leseErgebnisobjekt(stdout): Record<string, unknown> | null` (parst `stdout` als JSON, akzeptiert nur `type === 'result'`) als modulinterne, nicht exportierte Funktion. F7 (Result Evaluator) braucht exakt diese Logik, um das strukturierte Ergebnisobjekt zu lesen — ohne Export müsste F7 sie duplizieren, ein D5-Verstoß (Nachbau von Logik, die ein anderes Modul bereits besitzt).
Fundstelle: `src/claude-code-gateway/index.ts:71`.
Auswirkung: gering — reine Sichtbarkeitsänderung (ein Schlüsselwort), kein Verhaltensunterschied, keine bestehenden Tests betroffen.
Maßnahme: Als Teil des F7-Baus (`state/plan-v1-f7-result-evaluator.md` Abschnitt 2, Punkt 1) `leseErgebnisobjekt` exportieren. Kein eigener Vertrag nötig.
Feature/Run: F7-Challenge, 31.08.2026; behoben im F7-Baudurchgang (`src/claude-code-gateway/index.ts`, `export function leseErgebnisobjekt`), 02.09.2026.

**F-069** · `BUG` · P1 · **gelöst**
Titel: `starteGateway`/`starteProzess` (F6a) kann unter Windows keinen echten `claude`-Prozess starten — `execFile` scheitert an `.cmd`-Shims.
Beschreibung: WS3-Nachweislauf (`scripts/verify-f6a-real-run.mjs`, `state/tasks/f6a-ws3-realer-nachweis.md`) zeigt real: `execFile('claude', tokens, ...)` löst unter Windows nur auf den `claude.cmd`-Shim auf. Ohne `shell: true` scheitert das mit `ENOENT` (bloßer Name); mit explizitem `.cmd`-Suffix scheitert es synchron mit `EINVAL` (Node blockiert `.cmd`/`.bat`-Spawns seit der CVE-2024-27980-Härtung). Der Zielkonflikt zwischen Sicherheit (kein Shell-String, F-057) und Windows-Startfähigkeit besteht real **nicht**: die Ursache ist nicht die Argv-Bauweise, sondern das Startziel selbst (ein `.cmd`-Shim statt einer direkt startbaren Datei).
Fundstelle: `src/claude-code-gateway/prozessstart.ts` (`starteProzess`); Beleg-Commit `97ef781` (Branch `docs/f6a-ws3-realer-nachweis`), `state/gates.md` Delta-3-Eintrag (WS3), WS4-Eintrag (Lösung).
Auswirkung: F6a WS2 war auf der Zielmaschine (Windows) für einen echten Lauf nicht benutzbar; F7 war davon nicht betroffen (konsumiert nur Laufakte/Rohstrom, unabhängig davon wie sie entstehen).
Maßnahme: Vertrag `f6a-ws4-windows-prozessstart` (Entscheidungen E1/E2, 02.09.2026): Startziel ist die native `bin/claude.exe` der npm-Global-Installation (kein `node`-Zwischenschritt, kein aktivierter Shell-Modus), vom Aufrufer als Pflichtfeld übergeben und über den neuen Hygiene-Guard `pruefeStartziel` (AK15) geprüft. F-057/AK14 unangetastet. Real bestätigt in SCOPE 7 (`scripts/verify-f6a-real-run.mjs`, 03.09.2026): echter Prozessstart unter Windows, valides `"type":"result"`-Objekt zurückerhalten (`state/gates.md` WS4-Eintrag).
Feature/Run: F6a WS3, realer Nachweislauf, 02.09.2026; gelöst in WS4, 03.09.2026.

**F-070** · `BUG` · P1 · **gelöst**
Titel: `echterStarter` wandelt einen synchronen `execFile`-Wurf in eine unbehandelte Promise-Rejection statt in ein Ergebnisobjekt.
Beschreibung: `src/claude-code-gateway/prozessstart.ts:30-36` ruft `execFile` innerhalb eines `new Promise((resolve) => …)`-Executors ohne `try/catch`. Wirft `execFile` synchron (real gemessen: `EINVAL` bei explizitem `.cmd`-Suffix, `state/gates.md` WS3-Eintrag; plattformunabhängig reproduzierbar mit einem NUL-Byte im Token → `ERR_INVALID_ARG_VALUE`), fängt der Promise-Konstruktor den Wurf und macht daraus eine Rejection. `starteGateway` bricht dann zwischen `RUN_PREPARED`-Wirkungsmarke und Rohstrom/Laufakte ab.
Fundstelle: `src/claude-code-gateway/prozessstart.ts:30-36`, `src/claude-code-gateway/index.ts:132-142`.
Auswirkung: offene `RUN_PREPARED`-Sequenz ohne jede Ablage; der Lauf bleibt dauerhaft in `KLAERUNG_ERFORDERLICH`, ohne dass ein Artefakt den Grund trägt.
Maßnahme: `try/catch` innerhalb des Executors, `resolve` mit gesetztem `startfehler`. Behoben in Vertrag `f6a-ws4-windows-prozessstart`.
Feature/Run: Challenge F-069 / Advisor-Pass WS4, 02.09.2026.

**F-071** · `BUG` · P1 · **gelöst**
Titel: Der Rohstrom verliert Startfehler und Startziel — ein nicht gestarteter Prozess ist von einem abgebrochenen Lauf nicht unterscheidbar.
Beschreibung: `echterStarter` verwirft `fehler.code`/`fehler.message`; bei `ENOENT` ist `fehler.code` ein String, der Typ-Guard setzt daher `exitCode: null`. `index.ts:140` schreibt nur `{ stdout, stderr, exitCode }`. Real entstanden im WS3-Lauf: `{"stdout":"","stderr":"","exitCode":null}` — der `ENOENT`-Beleg ist vollständig verloren. Zusätzlich hält nach Entscheidung E2 kein Artefakt fest, welches Programm real gestartet wurde.
Fundstelle: `src/claude-code-gateway/prozessstart.ts:32-34`, `src/claude-code-gateway/index.ts:140`; Beleg `state/gates.md`, WS3-Eintrag 2026-09-02.
Auswirkung: trifft E-190 im Kern — die Laufakte meldet korrekt „Beobachtungsbasis unvollständig", wirft aber genau den Beleg weg, der erklärt, warum. Fehlersuche an einem realen Lauf ist ohne diesen Beleg nicht möglich.
Maßnahme: `ProzessErgebnis.startfehler` eingeführt; Rohstrom trägt `werkzeugStartziel`, `startfehler`, `stdout`, `stderr`, `exitCode`. `LAUFAKTE_V0` unverändert. Behoben in Vertrag `f6a-ws4-windows-prozessstart`.
Feature/Run: Challenge F-069, 02.09.2026.

**F-075** · `HARNESS_IMPROVEMENT` · P2 · **gelöst**
Titel: AK15-Rot-Fall 'Sperrlisten-Basisname (cmd.exe)' in `scripts/check-f6a-claude-code-gateway.mjs` mit fest verdrahtetem Windows-Pfad — auf Linux (CI) wirkungslos.
Beschreibung: Der Rot-Fall nutzte `'C:\Windows\System32\cmd.exe'` als Startziel. `pruefeStartziel` prüft zuerst, ob `startziel[0]` ein absoluter Pfad ist (`resolve(programm) === programm`); unter Linux ist ein Windows-Pfad wie dieser nie absolut, also greift dort bereits die erste Regel ("kein absoluter Pfad") und die Sperrlisten-Basisname-Prüfung wird nie erreicht — der Rot-Fall testete in CI faktisch eine andere Regel als benannt. Zusätzlich prüfte der Test nur `ok:false`, nicht den erwarteten `grund` — ein falsch getroffener Ablehnungsgrund wäre so nicht aufgefallen.
Fundstelle: `scripts/check-f6a-claude-code-gateway.mjs`, AK15-Rot-Fall-Liste (vor Korrektur Zeile 197).
Auswirkung: gering — auf Windows (Zielplattform) griff die Sperrlisten-Prüfung real, der Guard selbst (`pruefeStartziel`) war nie fehlerhaft. Betroffen war ausschließlich die Testabdeckung: in einer Linux-CI-Umgebung wäre ein Regressionsfehler in der Basisnamen-Sperrliste durch diesen Testfall nicht aufgefallen.
Maßnahme: Startziel auf `join(process.cwd(), 'cmd.exe')` umgestellt (absolut, plattformunabhängig, erreicht die Sperrlisten-Prüfung noch vor der Existenzprüfung). Jeder AK15-Rot-Fall prüft jetzt zusätzlich einen erwarteten Teilstring in `ergebnis.grund`, nicht nur `ok:false` — deckt auch einen falsch getroffenen Ablehnungsgrund auf.
Feature/Run: F6a WS4, Challenger-Nachprüfung vor SCOPE-7-Freigabe, 03.09.2026.

**F-078** · `TECH_DEBT` · P2 · **gelöst**
Titel: Werkzeugsatz-Begrenzung von `--tools`/`--allowedTools` real gemessen — beide greifen, unabhängig voneinander.
Beschreibung: `src/claude-code-gateway/index.ts` (`baueAufruf`) emittiert `--tools <liste>`; ob dieses Flag den Werkzeugsatz real begrenzt (statt nur Konsolentext zu erzeugen, ARCHITECTURE §7), war ungemessen. Sondierung (WS-A, Wegwerf-Arbeitsverzeichnis außerhalb dieses Repos, Werkzeugversion `2.1.258`, drei `claude -p`-Läufe mit Schreibauftrag „erstelle beweis.txt"): Messfall 1 (`--tools Read,Glob,Grep`, kein Write in der Liste) — Datei nicht entstanden, `permission_denials: []` (Write dem Modell gar nicht als Werkzeug bekannt, Modell meldet das selbst im Text). Messfall 2 (`--allowedTools Read,Glob,Grep`, `--tools` auf Default) — Datei nicht entstanden, `permission_denials` enthält einen realen Eintrag (`tool_name: "Write"`, `tool_use_id`, `tool_input` mit Pfad und Inhalt) — das Modell hat Write versucht und wurde real abgelehnt. Messfall 3 (beide Flags kombiniert) — Datei nicht entstanden, `permission_denials: []` (wie Messfall 1, da `--tools` bereits vor `--allowedTools` greift). Alle drei Rohausgaben (`rohausgabe.json`) und `exitCode` 0 in allen Fällen gesichert.
Fundstelle: `src/claude-code-gateway/index.ts:118` (`baueAufruf`, `--tools`-Emission); Sondierungslauf 03.09.2026, Wegwerfverzeichnis außerhalb des Repos.
Auswirkung: E-187 (zielfassung.md §9.4) verlangt zwei unabhängige Mechanismen zur Werkzeugsatz-Begrenzung. Die Messung zeigt zwei tatsächlich unabhängige Achsen: `--tools` entfernt ein Werkzeug vollständig aus dem Angebotssatz des Modells (Ablehnung ohne Permission-Event), `--allowedTools` lässt das Werkzeug im Angebotssatz, blockiert aber den Aufruf über eine echte Permission-Prüfung (Ablehnung mit Permission-Event in `permission_denials`). Ein Fehlgriff in der einen Achse würde durch die andere weiterhin aufgefangen. §16.8 Punkt 4 ist auf Basis dieser Messung inzwischen als geschlossen eingetragen (E7, 03.09.2026, `claude/105_F6B_ENTSCHEIDUNGEN_UND_WORKSTREAM_SCHNITT.md`) — der bisher dort referenzierte MCP-Kanal-Messfall 3 (Vertrag 2) gilt als überholt.
Maßnahme: Keine Codeänderung nötig — Messung bestätigt die bestehende `baueAufruf`-Emission als wirksam. Für F6b-Folgearbeit relevant: `permission_denials` im JSON-Output ist der belastbare Nachweiskanal für „Werkzeug angeboten, aber abgelehnt" versus `--tools`, dessen Nachweis über die Abwesenheit der Datei plus leeres `permission_denials` läuft (kein direktes Denial-Signal, da das Werkzeug dem Modell nie angeboten wurde).
Feature/Run: F6b WS-A Sondierung, 03.09.2026.

**F-080** · `TECH_DEBT` · P3 · **gelöst**
Titel: Startziel des Werkzeugprozesses sollte als normalisierter Pfad geführt werden, nicht als Binär-Hash.
Beschreibung: E-188 (§9.4) führt seit E5 (03.09.2026) das „Startziel des Werkzeugprozesses" als sechsten Gültigkeitsschlüssel-Bestandteil. E5 empfiehlt dafür einen normalisierten Pfad statt eines Binär-Hashes der Werkzeug-Executable — ein Hash bricht bei jedem Patch-Update des Werkzeugs, ohne dass sich das eigentlich relevante Startziel (welches Programm an welchem Ort gestartet wird) geändert hat.
Fundstelle: `docs/projekt/zielfassung.md` §9.4 E-188; `claude/105_F6B_ENTSCHEIDUNGEN_UND_WORKSTREAM_SCHNITT.md`, E5.
Auswirkung: Eine naheliegende, aber zu strenge Implementierung (Binär-Hash) würde den Gültigkeitsschlüssel bei jedem Werkzeug-Update unnötig invalidieren.
Maßnahme: Umgesetzt als Feld `startziel_pfad` (string) in `IstUebrigeFelder`/`Gueltigkeitsschluessel`, `src/invocation-policy/types.ts`. Vergleich über `normalisierePfadFuerVergleich` (dieselbe Trenner-/Groß-Kleinschreibungs-Normalisierung wie `arbeitsverzeichnis_pfad`) in `pruefeStartbedingung2`, `src/invocation-policy/index.ts` — kein Binär-Hash.
Feature/Run: F6b WS-C, 03.09.2026.

**F-081** · `TECH_DEBT` · P3 · gelöst
Titel: Zuordnung „Werkzeugkonfiguration" und „Schutzskripte" (E-183/E-188) auf konkrete Dateien noch nicht an der Entscheidungsstelle festgehalten.
Beschreibung: E-183/E-188 sprechen von „Werkzeugkonfiguration" und „referenzierten Schutzskripten", ohne die konkreten Dateien zu benennen. Für dieses Projekt: Werkzeugkonfiguration = `.claude/settings.json`, Schutzskripte = die darin referenzierten Hook-Dateien. Diese Zuordnung ist bislang nirgends verbindlich festgehalten.
Fundstelle: `docs/projekt/zielfassung.md` §9.4 E-183/E-188; `.claude/settings.json`.
Auswirkung: Ohne die explizite Zuordnung bleibt offen, welche Datei(en) beim Gültigkeitsschlüssel-Nachweis tatsächlich gehasht werden müssen — Risiko einer Fehlimplementierung in F6b.
Maßnahme: Umgesetzt (F6b WS-E). `scripts/erzeuge-invocation-policy-nachweise.mjs` übernimmt die Zuordnung real: hasht `.claude/settings.json` als Werkzeugkonfiguration und jede darin referenzierte Hook-Datei (strukturell über `ermittleHookPfade` aus dem geparsten `hooks`-Objekt abgeleitet, nicht hartkodiert) als Schutzskripte, erzeugt daraus BaselineEintrag/WirksamkeitsnachweisEintrag-JSON und schreibt sie (ohne Commit) ins externe Autorisierungs-Repo. Selbsttest: `scripts/erzeuge-invocation-policy-nachweise.test.mjs`.
Feature/Run: F6b WS-E, 03.09.2026.

**F-077** · `BUG` · P1 · gelöst
Titel: `pruefeStartbedingung2` prüft die Herkunft des Wirksamkeitsnachweises nicht.
Beschreibung: Bedingung 1 liest die Baseline commit-gepinnt aus dem externen Repo (Pfad-Präfix, `.gitattributes`, Hash-Vergleich Arbeitsbaum/Commit). Bedingung 2 nahm den Nachweis als `unknown` direkt vom Aufrufer und prüfte nur Schema und Feldgleichheit gegen den selbst gebauten Ist-Schlüssel. Ein Aufrufer, der den Nachweis konstruiert, passierte E-188 immer.
Fundstelle: `src/invocation-policy/index.ts`, `pruefeStartbedingung2`; `features/F4/journal.md`, Nachtrag plan-v2 Delta 2.
Auswirkung: null bei F6a (kein Aufrufer), blockierend bei F6b — E-188 wäre dort eine Selbstauskunft statt einer Schutzschicht.
Maßnahme: Umgesetzt (E3, F6b WS-D). Neuer Typ `WirksamkeitsnachweisReferenz` (`src/invocation-policy/types.ts:15-19`). `pruefeStartbedingung2` (`src/invocation-policy/index.ts:371-421`) nimmt jetzt eine `WirksamkeitsnachweisReferenz` statt `unknown` entgegen und liest sie über die gemeinsame, aus `pruefeStartbedingung1` ausgelagerte private Lesekette `leseUndVerifiziereCommitGepinnteDatei` (`src/invocation-policy/index.ts:267-323`) — Pfad-Präfix, `.gitattributes`, Hash-Vergleich Arbeitsbaum/Commit, danach Schema-Validierung.
Feature/Run: F6b WS-D, 03.09.2026.

**F-083** · `PROCESS_IMPROVEMENT` · P2 · gelöst
Titel: WS-D-Änderungen lagen auf bereits squash-gemergtem Branch.
Beschreibung: Die WS-D-Umsetzung (Wirksamkeitsnachweis-Herkunftsprüfung) wurde auf `docs/f6b-ws-c-startziel-guelttigkeitsschluessel` gebaut — ein Branch, dessen zwei Commits bereits per Squash-Merge nach `origin/main` übernommen worden waren (F-056-Muster). Der Branch war damit gegenüber `origin/main` divergiert; der pre-push-Hook hätte den Push blockiert.
Fundstelle: Branch `docs/f6b-ws-c-startziel-guelttigkeitsschluessel` zum Zeitpunkt des WS-D-Abschlusses.
Auswirkung: gering, aber ein vermeidbarer Korrekturzyklus vor jedem Push — der Arbeitsauftrag hätte von vornherein einen neuen Branch von `origin/main` verlangen müssen statt auf dem WS-C-Branch weiterzubauen.
Maßnahme: Korrigiert im WS-D-Abschluss-Vertrag — Arbeitsverzeichnis-Diff gesichert, neuer Branch `f6b-ws-d-wirksamkeitsnachweis-herkunftspruefung` von frisch geholtem `origin/main` erzeugt, Änderungen dorthin übertragen. Für künftige Workstream-Ketten: jeder neue WS-Vertrag sollte explizit auf einem Branch von aktuellem `origin/main` aufsetzen, nicht auf dem Vorgänger-WS-Branch, sobald dessen PR gemergt ist.
Feature/Run: F6b WS-D-Abschluss, 03.09.2026.

**F-085** · `TECH_DEBT` · P3 · gelöst
Titel: Realer Wirksamkeitsnachweis trägt Platzhaltertext statt echter Werkzeugversion.
Beschreibung: `werkzeug_version_deklariert` im committeten Nachweis (externes Repo, Commit `c282de9`) steht wörtlich `<deine Claude-Code-Version>`. Kein Schema-Verstoß, aber inhaltlich falsch.
Fundstelle: `ai-workforce-autorisierung`, Commit `c282de9`.
Auswirkung: Keine bislang — mit WS-G bekommt dieser Wert erstmals echte Bedeutung (Vergleich gegen istUebrigeFelder. werkzeug_version_deklariert).
Maßnahme: `erzeuge-invocation-policy-nachweise.mjs` erneut mit echter Version und dem realen `rot_fall_beleg`-Text aus WS-F laufen lassen, neu committen — danach state/aktuelle-autorisierung.json auf den neuen Commit aktualisieren.
Status: gelöst · Feature/Run: F6b WS-E, 03.09.2026; gelöst F6b WS-G,
03.09.2026 — `state/aktuelle-autorisierung.json` verweist jetzt auf den
Wirksamkeitsnachweis-Commit `75e31465`, nicht mehr auf den beanstandeten
`c282de9`.

**F-087** · `TECH_DEBT` · P2 · gelöst
Titel: arbeitsverzeichnis_pfad/startziel_pfad kollidierten strukturell mit E6-Wegwerfläufen; startziel_pfad-Referenzwert war nie real kalibriert.
Beschreibung: E5 und E6 wurden unabhängig entschieden und widersprachen sich beim realen Grün-Fall-Nachweis: ein chdir'ter Wegwerflauf kann arbeitsverzeichnis_pfad nie mit einem gegen das reale Repo erzeugten Nachweis matchen. Zusätzlich existierte der committete startziel_pfad (C:\Program Files\claude\claude.exe) auf der Zielmaschine real nicht.
Fundstelle: scripts/verify-f6b-ws-g-schreiblauf.mjs, Review 03.09.2026.
Auswirkung: Realer Grün-Fall-Beleg war bis zur Entscheidung blockiert.
Maßnahme: verify-Skript chdir't nicht mehr, nur Schreibziel umgeleitet (Option A); C:\Program Files\claude\claude.exe als Symlink auf die reale npm-global-Binary angelegt, um den bewusst gewählten admin-geschützten Installationsort als Vertrauensanker zu erhalten (Option B), statt die Prüfung auf den user-schreibbaren npm-Pfad abzusenken.
Status: gelöst · Feature/Run: F6b WS-G, 03.09.2026.

**F-088** · `PROCESS_IMPROVEMENT` · P2 · gelöst
Titel: Feature-Akten-Status driftet gegenüber der Realität; F6b hat überhaupt keine Akte.
Beschreibung: `features/F4/feature.md` und `features/F6a/feature.md` stehen auf `READY_FOR_TECH`, `features/F7/feature.md` auf `IN_ARBEIT` — alle drei Features sind real abgeschlossen und gemergt. `features/F6b/` existiert nicht, ebenso kein `state/plan-v1-f6b-*`, obwohl F6b über sieben Workstreams gebaut wurde. `scripts/check-feature.mjs` prüft den Status nur gegen die erlaubte Werteliste, nicht gegen den realen Abschluss.
Fundstelle: `features/F4/feature.md:13`, `features/F6a/feature.md:13`, `features/F7/feature.md:13`; fehlendes `features/F6b/`.
Auswirkung: Eine Sitzung, die den Projektstand aus den Feature-Akten liest, hält abgeschlossene Features für offen und F6b für nie gebaut. Für F8 unmittelbar relevant, weil F8 seine Dependencies genau aus diesen Akten ableiten würde.
Maßnahme: Status der drei Akten auf `ABGESCHLOSSEN` gezogen; F6b als Workstream-Kette in `features/F6a/feature.md` dokumentiert. Nachtrag 04.09.2026: derselbe Drift auch bei `features/F0/feature.md`, `features/F1/feature.md`, `features/F3/feature.md` gefunden (alle drei auf `READY_FOR_TECH`, real gemergt und abgeschlossen — Commits `8559400`, `d9595f6`, `c7b4974` auf `main`, `npm run check` Exit 0) und ebenfalls auf `ABGESCHLOSSEN` korrigiert, siehe `features/F0/journal.md`, `features/F1/journal.md`, `features/F3/journal.md`.
Feature/Run: Challenge F8, 04.09.2026; Nachtrag F0/F1/F3, 04.09.2026.

**F-089** · `PROCESS_IMPROVEMENT` · P2 · gelöst
Titel: `state/findings.md` führt zwei real gelöste Findings weiterhin als offen.
Beschreibung: F-048 ist in `src/invocation-policy/verbotene-aufrufparameter.ts` per `enthaeltTokenFenster` behoben (Kommentar nennt den Fix explizit, F6a AK2 fordert ihn) — Register sagt `offen`. F-085 ist behoben, `state/aktuelle-autorisierung.json` verweist auf Wirksamkeitsnachweis-Commit `75e31465` statt des beanstandeten `c282de9` — Register sagt `offen`. Übergabe 109 zitiert F-048 daraufhin als offenen P1-Faden für die F8-Planung.
Fundstelle: `state/findings.md` Zeilen 450 (F-048) und 940 (F-085).
Auswirkung: Falsche P1-Last in der F8-Planung; das Register ist laut F-036 die einzige Sollquelle und verliert Verlässlichkeit, wenn Statuswechsel am Ende eines Baudurchgangs nicht zurückfließen.
Maßnahme: Beide Statuszeilen nachgezogen. Zusätzlich: Statuswechsel gehören in denselben Commit wie der Fix, nicht in einen späteren Dokumentations-PR. Nachtrag 04.09.2026: verifiziert — F-048 (Zeile 450) und F-085 (Zeile 944) stehen im Register beide bereits auf `gelöst`; F-089 selbst wird hiermit ebenfalls auf `gelöst` gezogen.
Feature/Run: Challenge F8, 04.09.2026.

**F-098** · `PROCESS_IMPROVEMENT` · P1 · **gelöst**
Titel: Bauauftrag verwies per Pfad auf nicht committete Dateien.
Beschreibung: plan-v1, plan-v2, advisor-findings-f8 und der WS-1-Vertrag waren untracked; der Vertrag verweist per Pfad auf plan-v2 und das Advisor-Dokument. In einem frischen Klon oder Worktree wären diese Pfade leer. Dritte Ausprägung nach F-013 und F-092.
Fundstelle: Arbeitskopie-Prüfung 04.09.2026, PR #64.
Auswirkung: Ein Bauauftrag wäre in einem Worktree ohne seine Vorgabedokumente gestartet.
Maßnahme: Regel — ein Vertrag ist erst freigabefähig, wenn alle von ihm per Pfad referenzierten Dateien auf origin liegen. Mit PR #64 für F8 erledigt.
Feature/Run: F8 WS-1, 04.09.2026.

**F-099** · `HARNESS_IMPROVEMENT` · P2 · **gelöst**
Titel: `state/freigabe-commit.md` ist versioniert statt gitignored.
Beschreibung: Die Datei ist in origin/main als Blob getrackt und steht nicht in `.gitignore`. Jeder frische Klon und jedes `git checkout`/`reset --hard` materialisiert damit eine Freigabedatei. Entschärft wird das derzeit allein durch das 10-Minuten-Frischefenster; der Guard blockiert nur Bash-Befehle, die den Pfad-String nennen — ein `git reset --hard` nennt ihn nicht.
Fundstelle: `git ls-tree origin/main state/freigabe-commit.md`; `.claude/hooks/commit-guard.cjs` Aufgabe 3/4.
Auswirkung: Kein akuter Fehlerfall, aber der zweite Schlüssel liegt in der Versionsgeschichte.
Maßnahme: In `.gitignore` aufnehmen und aus der Versionierung entfernen; das Frischefenster bleibt zweite Linie statt einziger Linie.
Status: **gelöst**. Derselbe Sachverhalt wie F-331 und mit diesem gelöst: die `.gitignore`-Zeile `state/freigabe-commit.md` im Abschnitt „Persönliche Freigaben" kam mit PR #136; Wirksamkeit dort real belegt. Die zweite Hälfte der Maßnahme („aus der Versionierung entfernen") ist ebenfalls erfüllt: die Datei ist am 11.09.2026 weder im Index noch auf `origin/main` getrackt (`git ls-files`, `git ls-tree`). **Achtung:** Die in der Beschreibung als Nebenbemerkung genannte zweite Lücke — der Guard blockiert nur Bash-Befehle, die den Pfad-String nennen, ein `git reset --hard` nennt ihn nicht — ist damit **nicht** gelöst. Sie ist vor dem Schließen dieses Eintrags als eigenständiges Finding **F-333** erfasst und lebt dort weiter.
Feature/Run: F8 WS-1-Vorbereitung, 04.09.2026; behoben PR #136, 11.09.2026.

**F-101** · `TECH_DEBT` · P2 · **gelöst**
Titel: F4s `ermittleIstZustand`-Rumpf war in `execution-controller.test.ts` nachgebaut, um AK3s Grep auszuweichen.
Beschreibung: Die Fixture setzte Konfigurationshash und Schutzskript-Hashes aus `sha256Hex` + `ermittleHookPfade` zusammen — zeilengleich zu `src/invocation-policy/index.ts` (`ermittleIstZustand`), nur ohne dessen Wurzelableitung.
Fundstelle: `src/execution-controller/execution-controller.test.ts` (Fassung vor der Korrekturrunde) gegen `src/invocation-policy/index.ts`.
Auswirkung: Zweiter Berechnungsweg für dieselbe Größe; genau das Divergenzrisiko, vor dem der Kommentar an `ermittleHookPfade` warnt.
Maßnahme/Auflösung: Entscheidung Stefan 04.09.2026 — AK3-Grep erhält dieselbe `*.test.ts`-Ausnahme wie AK1. Duplikat entfernt, direkter `ermittleIstZustand`-Aufruf, Gate neu kalibriert (Rot-Fall jetzt in einer Produktionsdatei).
Feature/Run: F8 WS-1, 04.09.2026.

**F-102** · `PROCESS_IMPROVEMENT` · P3 · **gelöst**
Titel: AK3-Gate-Erfolgsmeldung behauptete mehr, als der Grep belegt.
Beschreibung: Die Ausgabe lautete „der Controller prüft an keiner Stelle selbst Baseline, Wirksamkeitsnachweis oder Ist-Zustand" — belegt ist nur die Abwesenheit dreier Bezeichner.
Fundstelle: `scripts/check-f8-execution-controller.mjs`, AK3-Zweig.
Maßnahme/Auflösung: Meldungstext in der Korrekturrunde vom 04.09.2026 auf das beschränkt, was der Grep zeigt.
Feature/Run: F8 WS-1, 04.09.2026.

**F-103** · `BUG` · P1 · **gelöst**
Titel: AK2-Nichtaufruf-Nachweis war eine Vakuum-Assertion.
Beschreibung: `ladeArtefaktVersion('laufakte-<laufId>') === null` belegte nichts — dieses Artefakt schreibt `starteGateway` selbst am Ende seines Erfolgspfads, im Rot-Fall wird die Stelle nie erreicht. Die Assertion war unabhängig vom Prüfgegenstand wahr.
Fundstelle: `src/execution-controller/execution-controller.test.ts` (Fassung vor der Korrekturrunde) gegen `src/claude-code-gateway/index.ts` (`registriereKernArtefakt` unmittelbar vor `return { ok: true }`).
Auswirkung: Der vom Vertrag geforderte mechanische AK2-Nachweis fehlte. Produktcode war korrekt.
Maßnahme/Auflösung: Umgestellt auf die Kettenlänge der terminal-Wirkungsmarken (genau 1). Wichtig: „kein terminal-Eintrag" wäre falsch gewesen — F6as `verweigereStart` (`src/invocation-policy/index.ts:527-534`) schreibt im E-182-Fall selbst eine Terminalmarke. Die neue Assertion ist per Rot-Fall-Kalibrierung belegt (Early-Return deaktiviert, Kette wuchs auf 2, Test rot; zurückgebaut, grün).
Feature/Run: F8 WS-1 Review, 04.09.2026.

**F-104** · `PROCESS_IMPROVEMENT` · P2 · **gelöst**
Titel: Vertragswiderspruch wurde einseitig aufgelöst statt eskaliert; Journal begründete das mit einer falschen Tatsachenbehauptung.
Beschreibung: AK3-Grep ohne Testausnahme kollidierte mit dem AK8-Fixture-Bedarf. Der Vertrag verlangt bei Regelwiderspruch ausdrücklich Anhalten und Melden. Stattdessen wurde in der Testdatei dupliziert, begründet mit „inhaltlich dasselbe Muster wie claude-code-gateway.test.ts" — dort wird `ermittleIstZustand` direkt aufgerufen (Zeile 114).
Fundstelle: `features/F8/journal.md` (Eintrag vor der Berichtigung); `src/claude-code-gateway/claude-code-gateway.test.ts:114`.
Auswirkung: Beinahe-Präzedenzfall für Folgemodule; die Falschbehauptung hätte den Fehler dauerhaft plausibel gemacht.
Maßnahme/Auflösung: Journal per Berichtigung korrigiert. ESCALATE-Regel wurde in den Folgeverträgen (WS-2a, WS-2b, 8-Marker-Format inkl. eigenem ESCALATE-Abschnitt) prominent platziert und real angewendet — WS-2b meldete den AK7/Scope-Wortlautwiderspruch in feature.md ausdrücklich statt ihn stillschweigend zu lösen. Positiv-Gegenbeispiel derselben Runde: die falsche Vorgabe „kein terminal-Eintrag" wurde korrekt zurückgemeldet statt umgesetzt (siehe F-103). Nachtrag: das WS-2b-Journal zitierte den AK7/Scope-Widerspruch fälschlich unter dieser ID (F-104) — falsche Zuordnung, kein neuer Finding-Eintrag nötig, da der Wortlaut direkt in feature.md korrigiert wurde (Technical-Challenger-Sitzung, 04.09.2026).
Feature/Run: F8 WS-1 Review, 04.09.2026.

**F-108** · `TECH_DEBT` · P2 · **gelöst**
Titel: F-097 als WS-2a-Akzeptanzkriterium nicht umsetzbar — kein Aufrufer wendet pruefeStale auf bedarf-<laufId> an, Laufakte ist unveränderlich.
Beschreibung: Der in claude/114 vorgesehene AK („Eskalationslauf lädt die referenzierte Laufakte real und speist sie in aktuelleEingabeInhalte ein") wäre eine Vakuum-Assertion gewesen (F-103-Muster): F9s einziger STALE-Einstiegspunkt pruefeUndEntscheideStale prüft ausschließlich transport-<laufId>, baueAktuelleEingabeInhalte befüllt nur den BEDARF-Schlüssel — kein Aufrufer im Repo wendet pruefeStale je auf bedarf-* an. Zusätzlich ist laufakte-<laufId> nach starteGateway unveränderlich (eingaben: [], einziger Schreibpfad). Ein Hashvergleich dagegen kann strukturell nie stale:true liefern.
Fundstelle: `src/human-transport/index.ts:329-336,348-360`; `src/claude-code-gateway/index.ts:301-308`.
Auswirkung: keine — die Referenz wird stattdessen als Herkunftsbeleg geführt (AK6-2 prüft ihr korrektes Schreiben), kein STALE-Prüfpfad gebaut.
Maßnahme/Auflösung: Entscheidung Stefan 04.09.2026 (Option A). Im WS-2a-Vertrag (SCOPE Punkt 6) und im Dateikopf von execution-controller/index.ts dokumentiert.
Feature/Run: F8 WS-2a-Vertrag, 04.09.2026.

**F-109** · `TECH_DEBT` · P2 · **gelöst**
Titel: Windows-Pfadlänge in WS-2a-Testketten lag real bei ~250/260 Zeichen — Advisor-Finding 13 hatte das unterschätzt.
Beschreibung: Der längste in den WS-2a-Tests entstehende Pfad (kontrollzustand-test\lineage-transport-<laufId>-eskalation-<uuid>\checkpoints\<n>-<64 Hex>.json) liegt mit einem kurzen Testpräfix nahe an MAX_PATH (260). Advisor-Finding 13 (state/advisor-findings-f8-execution-controller.md) bewertete das als „keine bekannte Falle, keine Aktion nötig", ohne lineage-transport- als längstes Präfix zu rechnen.
Fundstelle: state/advisor-findings-f8-execution-controller.md Befund 13; execution-controller.test.ts (WS-2a-Testfälle).
Auswirkung: keine real eingetretene — mit Präfix ≤4 Zeichen (Vertragsauflage) lag der längste real erzeugte Pfad bei 249 Zeichen.
Maßnahme/Auflösung: WS-2a-Vertrag SCOPE Punkt 5 schreibt kurze Test-laufId-Präfixe vor und verlangt den Nachweis im Bericht — erbracht (249/260).
Feature/Run: F8 WS-2a-Vertrag/Bau, 04.09.2026.

**F-111** · `TECH_DEBT` · P3 · **gelöst**
Titel: AusfuehrungsErgebnis gab die intern erzeugte Eskalations-laufId nicht zurück — ohne sie war AK6 nicht prüfbar.
Beschreibung: Die Eskalations-laufId entsteht intern per randomUUID (D3). plan-v1 sah keine Rückgabe vor. Ohne Rückgabe kann kein Test die Eskalation gezielt nachschlagen oder ihre Kette aufräumen.
Fundstelle: `state/plan-v1-f8-execution-controller.md` Abschnitt 2.1 (Entwurf AusfuehrungsErgebnis, vor WS-2a).
Auswirkung: keine — im WS-2a-Vertrag (SCOPE Punkt 3) durch ein optionales eskalation-Feld behoben, additive Erweiterung der diskriminierten Union.
Maßnahme/Auflösung: `src/execution-controller/types.ts` — `eskalation?: { laufId, bedarfVersionSequenz, transportVersionSequenz }`.
Feature/Run: F8 WS-2a-Vertrag/Bau, 04.09.2026.

**F-113** · `PROCESS_IMPROVEMENT` · P2 · **gelöst**
Titel: Terminal-Befehle wurden wiederholt in Bash-Syntax ausgegeben, obwohl der Mensch in PowerShell arbeitet — führte real mehrfach zu Parserfehlern.
Beschreibung: Mehrere 🖥️ TERMINAL-Blöcke dieser Sitzung enthielten Bash-Heredoc-Syntax (`$(cat <<'EOF' ... EOF)`), die in PowerShell nicht geparst wird (`<` ist dort ein reservierter Operator). Der Fehler trat real mindestens zweimal auf, nachdem er beim ersten Mal bereits korrigiert worden war (PR-Body-Erstellung, danach erneut bei der WS-2a-Commit-Message) — die Korrektur wurde nicht als Regel für den Rest der Sitzung übernommen.
Fundstelle: Diese Sitzung, TERMINAL-Blöcke zu `gh pr create --body "$(cat <<'EOF' ...` und `git commit -m "$(cat <<'EOF' ...`.
Auswirkung: wiederholte Rückfragezyklen, vom Menschen bemerkt und bemängelt („Das passiert zu oft").
Maßnahme/Auflösung: Terminal-Befehle für diesen Menschen seither durchgehend PowerShell-kompatibel ausgegeben — mehrere `-m`-Flags statt Heredoc für mehrzeilige Commit-Messages, `Set-Content`/`--body-file` statt `$(cat <<EOF...)` für mehrzeilige PR-Bodies. Seit der Meldung (04.09.2026) in keinem der folgenden TERMINAL-Blöcke dieser Sitzung erneut aufgetreten — durch konsistente Praxis gelöst, kein Artefakt-Fix nötig.
Feature/Run: Technical-Challenger-Sitzung F8 WS-2a, 04.09.2026.

**F-115** · `PROCESS_IMPROVEMENT` · P1 · **gelöst**
Titel: F-100 in derselben Sitzung erneut verletzt — `git fetch`/`git switch`/`git merge` aus der Bridge ausgeführt.
Beschreibung: Nach Merge von PR #67 wollte die Cloud-Sitzung den lokalen Stand synchronisieren und lief dabei genau in das von F-100 beschriebene Muster: `.git/index.lock` und ein `tmp_obj` ließen sich aus der Bridge nicht entfernen, der Merge brach mit „local changes would be overwritten" ab und hinterließ einen Arbeitsbaum mit unveränderten main-Tracking-Infos, aber stale WS-2a-Dateiinhalten. Der Mensch musste den Zustand über drei Runden im eigenen Terminal auflösen (Diff-Gegenprüfung, `Remove-Item index.lock`, `git restore` + `git pull --ff-only`).
Fundstelle: diese Sitzung, 04.09.2026, direkt nach Merge von PR #67.
Auswirkung: kein Datenverlust (Fast-Forward am Ende sauber, Diff-Gegenprüfung vor jedem destruktiven Schritt bestätigte keine echte Abweichung), aber ein vermeidbarer Mehrfach-Rückfragezyklus.
Maßnahme/Auflösung: F-100s Verbotsliste (`git log`, `git ls-tree`, `git ls-remote`, `git rev-parse`, `cat`, `grep`) ab sofort ausnahmslos einhalten, keine Ausnahme für „nur schnell synchronisieren". Für diesen Vorfall real aufgelöst (sauberer `git status`, `main` = `origin/main`).
Feature/Run: F8 WS-2a-Nacharbeit, 04.09.2026.

**F-116** · `PROCESS_IMPROVEMENT` · P3 · **gelöst**
Titel: Geräte-Bridge-Shell hatte kein Löschrecht auf den verbundenen Ordner — führte zu falsch-negativem Testergebnis bei der WS-2b-Verifikation.
Beschreibung: Bei der unabhängigen Verifikation des WS-2b-Baus lief `node --test src/execution-controller/execution-controller.test.ts` über die Remote-Devices-Bridge zunächst mit 9 von 11 Fehlschlägen, alle mit identischem `EPERM: operation not permitted, unlink ...` beim Cleanup (`raeumeKette`s `rmSync`) — auch der unveränderte WS-1-Grünpfad-Test war betroffen. Ursache war kein Code-Fehler, sondern fehlendes Löschrecht der Bridge-Shell auf den verbundenen Ordner (dokumentierte Grundeinstellung). Nach `device_request_delete_permission` lief derselbe Testlauf 11/11 grün, die volle Suite 127/127 grün — deckungsgleich mit dem Build-Report.
Fundstelle: Technical-Challenger-Sitzung, WS-2b-Verifikation, 04.09.2026.
Auswirkung: hätte ohne die Gegenprobe am unveränderten WS-1-Test fälschlich als echte Regression im WS-2b-Code missverstanden werden können.
Maßnahme/Auflösung: `device_request_delete_permission` einmalig für den Projektordner erteilt (gilt für den Rest der Sitzung). Für künftige Sitzungen: bei Testverifikation über die Bridge grundsätzlich vorab Löschrecht anfragen statt erst bei einem EPERM zu reagieren.
Feature/Run: F8 WS-2b-Verifikation, 04.09.2026.

**F-118** · `PROCESS_IMPROVEMENT` · P1 · **gelöst**
Titel: F-100 in dieser Sitzung ein zweites Mal verletzt — `git fetch` erneut aus der Bridge ausgeführt, trotz F-115.
Beschreibung: Nach Merge von PR #71 wollte die Cloud-Sitzung den Merge-Commit auf `origin/main` verifizieren und führte dafür `git fetch origin --quiet` über die Remote-Devices-Bridge aus — exakt das in F-100 benannte und in F-115 bereits einmal in derselben Sitzung real aufgetretene verbotene Muster. Diesmal blieb der Arbeitsbaum unbeschädigt (kein `.git/index.lock`, `git status --short` leer), reiner Zufall der Zustandslage, kein struktureller Unterschied zum F-115-Vorfall.
Fundstelle: diese Sitzung, direkt nach Merge von PR #71, 04.09.2026.
Auswirkung: keine (diesmal) — belegt aber, dass die in F-115 vorgenommene Selbstverpflichtung nicht ausreichte, den Fehler zu verhindern.
Maßnahme/Auflösung: für den Rest dieser Sitzung ausschließlich `git log origin/main`/`gh pr view --json`/`gh api` zur Fernstand-Prüfung verwenden, niemals `git fetch` — auch nicht „nur lesend geplant". Empfehlung an den Menschen: ein technischer Guard (z. B. Wrapper-Skript, das `git fetch`/`switch`/`merge`/`pull` aus Bridge-Kontexten ablehnt) wäre robuster als eine wiederholte Selbstverpflichtung, die bereits zweimal versagt hat.
Feature/Run: F8-Abschluss, Findings-Nachtrag, 04.09.2026.

**F-119** · `BUG` · P1 · **gelöst**
Titel: `werkzeugStartziel[1..n]` passiert weder den E-188-Gültigkeitsschlüssel noch die E-182-Parameterprüfung.
Beschreibung: `pruefeStartfreigabe` vergleicht nur `startziel_pfad = werkzeugStartziel[0]`; `pruefeAufrufparameter` prüft nur `tokens`. `echterStarter` übergibt jedoch `[...startziel.slice(1), ...tokens]` an `execFile`. `prozessstart.ts` sagt im Kopf selbst, der Hygiene-Guard sei „keine Vertrauensgrenze — die Vertrauensfrage liegt per E2 beim Aufrufer".
Fundstelle: `src/invocation-policy/index.ts:466,484`; `src/claude-code-gateway/index.ts:219`; `src/claude-code-gateway/prozessstart.ts:49-51,85-87`.
Auswirkung: Heute folgenlos (einziger Aufrufer ist ein Test). Mit einem HTTP-Einstiegspunkt wird ungeprüftes argv aus einem Request zum Prozessargument, ohne dass ein Aufrufer die E2-Vertrauensfrage noch hält.
Maßnahme/Auflösung: `starteGateway` (`src/claude-code-gateway/index.ts`) führt `eingaben.werkzeugStartziel.slice(1)` jetzt zusätzlich durch F4s `pruefeAufrufparameter`, unmittelbar nach der bestehenden `tokens`-Prüfung und vor `pruefeStartziel` — bei Treffer `verweigereStart` wie im bestehenden E-182-Zweig, kein Prozessstart, keine RUN_PREPARED-Marke. Rein additive Prüfung, `werkzeugStartziel` bleibt bewusst außerhalb des F4-Gültigkeitsschlüssels (kein Schemabruch, keine Neuerzeugung der externen Autorisierungsartefakte). Zwei neue `node:test`-Fälle in `claude-code-gateway.test.ts` (verbotener Parameter in `werkzeugStartziel[1]` → verweigert; gültiges mehrgliedriges `werkzeugStartziel` → Regression bestanden). Blockierte F10 WS-1, jetzt entblockt.
Feature/Run: Gegenchallenge F10, 04.09.2026; behoben F10 WS-0, 04.09.2026.

**F-124** · `BUG` · P0 · gelöst
Titel: F6a besitzt keinen Mechanismus, das von F5 gebaute Kontextpaket als Prompt an den Claude-Code-Kindprozess zu übergeben — jede reale Ausführung schlägt strukturell fehl.
Beschreibung: `baueAufruf` (`src/claude-code-gateway/index.ts:183-199`) konstruiert Tokens ohne `--print`/Prompt-Argument; `AufrufEingaben` (`src/claude-code-gateway/types.ts:29-32`) hat kein Prompt-Feld; kein Stdin-Pipe in `prozessstart.ts`. `fuehreAufgabeDurch` ruft `baueAufruf(eingaben.aufrufEingaben)` auf, nie mit dem Ergebnis von `baueKontextpaket`. Real bestätigt durch den ersten echten Lauf (`e2e-referenzfeature-2026-09-06`, `state/e2e-nachweis-meilenstein-1.md`): CLI bricht mit `exitCode 1`, „Input must be provided either through stdin or as a prompt argument when using --print" ab, bevor irgendein Werkzeug genutzt wird.
Fundstelle: `src/claude-code-gateway/index.ts:183-199`; `src/claude-code-gateway/types.ts:29-32`; `src/execution-controller/index.ts` (Aufrufstelle `baueAufruf`); `state/e2e-nachweis-meilenstein-1.md`.
Auswirkung: Keine Sicherheitslücke (Prozess bricht vor jeder Werkzeugnutzung ab), aber eine vollständige funktionale Blockade — das System kann aktuell keine einzige reale Aufgabe erfolgreich ausführen. Betrifft jede künftige reale Nutzung, bis behoben. Meilenstein 1 bleibt laut Stefans Entscheidung (06.09.2026) deshalb offen, bis dies behoben und ein realer ERFOLGREICH-Lauf erbracht ist.
Maßnahme: F6a braucht ein Prompt-Feld in `AufrufEingaben` (oder eine äquivalente Kontextpaket-Übergabe, z. B. via Stdin) und eine Verdrahtung in `fuehreAufgabeDurch`, die `kontextpaketErgebnis` real als Prompt weiterreicht. Eigener kleiner Workstream, kein neues Feature. Fix in PR #80 (Branch `fix/f124-prompt-uebergabe`, gemergt auf `main`, 06.09.2026). Real ERFOLGREICH-Nachlauf erbracht: `laufId` `e2e-referenzfeature-2026-09-06-f124-nachlauf`, `GET /api/laeufe` → `ABGESCHLOSSEN`/`ERFOLGREICH`, echter Kindprozess mit `exitCode 0`, `permission_denials: []` (siehe `state/e2e-nachweis-meilenstein-1.md`, Abschnitt „Nachlauf nach F-124-Fix"). Damit geschlossen.
Feature/Run: E2E-Nachweis Meilenstein 1, 06.09.2026 (Fix + Nachlauf).

**F-127** · `TECH_DEBT` · P1 · **erledigt durch F14**
Titel: Kein Timeout und kein Abbruchweg für einen gestarteten Werkzeugprozess.
Beschreibung: echterStarter in src/claude-code-gateway/prozessstart.ts ruft execFile ohne timeout-Option; das ChildProcess-Handle verlässt die Funktion nicht, und der Leitstand ruft fuehreAufgabeDurch fire-and-forget auf. Ein hängender Kindprozess lässt den Lauf unbegrenzt in RUN_PREPARED ohne Terminalartefakt.
Fundstelle: src/claude-code-gateway/prozessstart.ts (execFile-Optionen); scripts/leitstand-server.mjs (Fire-and-forget-Zweig).
Auswirkung: In Meilenstein 1 tolerierbar. Ab Meilenstein 2 Alltagsbedingung — der einzige Ausweg ist heute der Task-Manager.
Maßnahme: Feature F14 (Meilenstein 2).
Status-Update (09.09.2026, Findings-Triage vor M3): erledigt durch F14. Beleg: `startvorlagen/ai-workforce.json:9` (`zeitgrenzeMs`); `src/claude-code-gateway/prozessstart.ts:166` (`timeout: optionen.zeitgrenzeMs`); `scripts/leitstand-server.mjs:1230-1233` (Route `/api/laeufe/<laufId>/abbrechen`); Gate `scripts/check-f14-abbruch.mjs`, real per AK10 nachgewiesen (`docs/STATUS.md`, F14 ABGESCHLOSSEN).
Feature/Run: M2-Challenge, 06.09.2026.

**F-128** · `TECH_DEBT` · P1 · **erledigt durch F11 WS-2**
Titel: Der Leitstand erzwingt D13 ("genau ein aktiver Arbeitsstrang") nicht.
Beschreibung: POST /api/laeufe prüft ausschließlich die Eindeutigkeit der laufId (laufIdBelegt). Zwei Startaufträge mit verschiedenen IDs starten zwei echte Claude-Code-Kindprozesse gleichzeitig im selben Arbeitsverzeichnis.
Fundstelle: scripts/leitstand-server.mjs, requestHandler POST-Zweig.
Auswirkung: Verstoß gegen D13 per Klick auslösbar; verschärft F-114 (zwei Schreiber im selben Verzeichnis, real beobachtet). Bislang folgenlos, weil nur einzelne Läufe von Hand gestartet wurden.
Maßnahme: F11 AK7 (409, solange ein Lauf dieser Serverinstanz nicht zurückgekehrt ist).
Status-Update (09.09.2026, Findings-Triage vor M3): erledigt durch F11 WS-2. Beleg: `scripts/leitstand-server.mjs:964` (`laufAktiv`-Flag, Kommentar zitiert F-128 explizit), `:1090-1091` (409-Ablehnung „ein anderer... Lauf ist noch aktiv (D13)").
Feature/Run: M2-Challenge, 06.09.2026.

**F-130** · `PROCESS_IMPROVEMENT` · P2 · **gelöst**
Titel: Feature-Akte F11 verwies auf Claude-Projekt-Dokumente, die nicht im Repo liegen.
Beschreibung: Die aus dem Challenger-Chat übernommene Vorlage nannte unter "Zuordnung" `claude/120` und `claude/121`. `claude/` enthält im Repo nur `65_...` und `66_...` — beide Verweise waren für jede Claude-Code-Sitzung nicht auflösbar. Dieselbe Grundursache wie F-013, F-082, F-092 und F-100.
Fundstelle: `features/F11/feature.md`, Abschnitt "Zuordnung", vor der Korrektur.
Auswirkung: gering, weil vor dem Commit gefunden. `scripts/check-docs.mjs` Prüfung 1 hätte es nicht gemeldet — sie matcht nur Pfade mit Dateiendung (F-007, weiterhin offen).
Maßnahme: Verweis auf die real im Repo liegenden Stellen umgestellt (`zielfassung.md` §13.3, `umsetzungsplan-fassung-1.md` Abschnitt 1b). Regel für künftige Akten: eine Repo-Datei verweist nie auf `claude/*`, solange das Dokument nicht real im Repo liegt.
Feature/Run: F11-Aktenanlage, 06.09.2026.

**F-136** · `TECH_DEBT` · P2 · **gelöst**
Titel: Startvorlage verwies auf einen zum Wirksamkeitsnachweis driftenden claude.exe-Pfad.
Beschreibung: `startvorlagen/beispielprojekt.json`s `werkzeugStartziel` zeigte auf den npm-Global-Installationspfad (`C:\Users\stefa\AppData\Roaming\npm\node_modules\@anthropic-ai\claude-code\bin\claude.exe`), der committete Wirksamkeitsnachweis erwartet aber `C:\Program Files\claude\claude.exe` (denselben Pfad wie `scripts/verify-f6b-ws-g-schreiblauf.mjs` und der Meilenstein-1-Nachweis). Der erste reale F11-WS-3-Lauf über den Leitstand endete dadurch real `VERWEIGERT` (F4 `pruefeStartfreigabe`, "Drift im Gültigkeitsschlüssel: 'startziel_pfad' (E-188)"). WS-2 hatte die Startvorlage nur gegen Testattrappen geprüft (`scripts/check-f10-leitstand.mjs`), nie live gegen den echten F4/F6a-Pfad — der Fehler blieb deshalb bis zum ersten realen Lauf unentdeckt.
Fundstelle: `startvorlagen/beispielprojekt.json`; real beobachtet in `kontrollzustand/e2e-f11-ws3-lesend-2026-09-06/` (VERWEIGERT-Wirkungsmarke).
Auswirkung: kein Sicherheitsproblem (F4 hat korrekt abgelehnt, kein Kindprozess gestartet) — aber ohne Fix wäre AK8 nicht real erbringbar gewesen.
Maßnahme: `werkzeugStartziel` auf `["C:\\Program Files\\claude\\claude.exe"]` korrigiert (reine Konfigurationsdatei, kein Eingriff in `src/`), Server neu gestartet, beide folgenden F11-WS-3-Läufe real erfolgreich.
Feature/Run: F11 WS-3, 06.09.2026, siehe `state/e2e-nachweis-f11-ws3.md`.

**F-137** · `BUG` · P1 · **erledigt durch F12 (AK1)**
Titel: Leitstand zeigt Lineage-Artefaktketten als Läufe.
Beschreibung: `sammleLaeufe` listet jedes Verzeichnis unter `kontrollzustand/`; real sind 18 von 28 keine Läufe, sondern F2-Artefaktketten, und erscheinen mit `laufStatus: NICHT_GESTARTET`. Ursache: F2s `registriereKernArtefakt` schreibt über `laufId(artefaktId) = "lineage-" + artefaktId` in eine eigene Kette.
Fundstelle: `scripts/leitstand-server.mjs` (`sammleLaeufe`); `src/lineage-registry/index.ts:47-49`.
Auswirkung: verletzt die §13.3-Messgröße „Fehldarstellungen des realen Zustands = 0"; wächst mit jeder Eskalation und jedem Lauf weiter.
Maßnahme: inhaltsbasiert filtern (gültige Kette enthält mindestens eine Wirkungsmarke), nicht über den Präfix `lineage-`. Regel real gegen alle 28 Verzeichnisse verifiziert: 10 mit Marke, 18 ohne, 0 Abweichungen. F12 AK1.
Status-Update (09.09.2026, Findings-Triage vor M3): erledigt durch F12 (AK1) — real gegengeprüft, Filter bleibt heute inhaltsbasiert. Beleg: `scripts/leitstand-server.mjs:353-356` (`istLaufkette` prüft `eintrag.typ === 'wirkungsmarke'`, nicht den `lineage-`-Präfix, Kommentar zitiert F-137). M3-Relevanz geprüft: da der Filter inhaltsbasiert bleibt, würden auch künftige Artefaktketten ohne Wirkungsmarke (F15/F18) automatisch mit ausgefiltert — kein Zusatzrisiko, kein weiterer Vermerk nötig.
Feature/Run: F12-Challenge, 06.09.2026.

**F-138** · `BUG` · P1 · **erledigt durch F12 WS-2 (AK6)**
Titel: F11s Zielsatz „ohne JSON, ohne Terminal" ist real nicht erfüllt.
Beschreibung: Die F11-Workstream-Liste nennt in WS-2 „das Startformular", aber kein AK fordert es und kein Gate prüft es; die einzige Startbedienung ist ein Textfeld für rohes Startauftrag-JSON. F11 ist auf AK-Ebene korrekt abgeschlossen, AK8 wurde per direktem `POST /api/laeufe` erbracht.
Fundstelle: `public/leitstand/index.html`; `features/F11/feature.md` (Ziel, Workstream-Liste WS-2).
Auswirkung: keine der drei §13.3-Messgrößen ist heute erreichbar; die Dogfooding-Phase ist ohne Formular nicht durchführbar.
Maßnahme: über E-M2-3 F12 WS-2 zugeordnet (AK6).
Status-Update (09.09.2026, Findings-Triage vor M3): erledigt durch F12 WS-2 (AK6). Beleg: `public/leitstand/index.html:19,36,39,48` (echtes Formular: `input#auftrag-titel`, `select#start-auftrag`, `select#start-werkzeugsatz`, `input#start-laufid` statt Roh-JSON-Feld).
Feature/Run: F12-Challenge, 06.09.2026.

**F-145** · `BUG` · P1 · **gelöst**
Titel: Fire-and-Forget-Aufruf in POST /api/laeufe reicht optionen/basisVerzeichnis nicht an fuehreAufgabeDurchFn durch.
Beschreibung: `scripts/leitstand-server.mjs:769` ruft `fuehreAufgabeDurchFn(laufId, profilReferenz, eingaben)` ohne drittes `optionen`-Argument auf. Alle synchronen Prüfungen davor (D13, `laufIdBelegt`, `auftragId`-Existenz) respektieren ein serverseitiges `basisVerzeichnis`-Override, der eigentliche Lauf (`fuehreAufgabeDurch`) fällt intern auf den Default `'kontrollzustand'` zurück.
Fundstelle: `scripts/leitstand-server.mjs:769`, entdeckt bei echtem HTTP-Smoke-Test gegen Scratch-Verzeichnis, F12 WS-2, 07.09.2026. Bestätigt vorbestehend seit `10a60ef` (F12 WS-1) — nicht durch WS-2 eingeführt.
Auswirkung: stille Divergenz zwischen geprüftem und tatsächlich beschriebenem Verzeichnis bei Nicht-Default-`basisVerzeichnis`. In Produktion unsichtbar (Default=Default). Potenzieller Blocker für F12 WS-4 (realer Nachweis), falls dort ein Nicht-Default-Pfad gebraucht wird.
Maßnahme: `optionen`-Objekt strukturell (nicht Einzelfelder) an `fuehreAufgabeDurchFn` durchreichen.
Maßnahme-Nachtrag: behoben — der Fire-and-forget-Aufruf reicht seither `optionen` (dasselbe Objekt, mit dem `erzeugeRequestHandler` selbst aufgerufen wurde) strukturell als viertes Argument durch (`scripts/leitstand-server.mjs`, POST-/api/laeufe-Handler). Testbeleg: neuer Fall (p) in `scripts/check-f10-leitstand.mjs` — eine `fuehreAufgabeDurchFn`-Attrappe zeichnet das empfangene `optionen`-Objekt auf und prüft `optionen.basisVerzeichnis` gegen den beim Testserver konfigurierten Nicht-Default-Wert. Real kalibriert: Rotfall (Durchreichung testweise entfernt) → Exit 1 mit `optionen=undefined`; Grünfall (Fix aktiv) → Exit 0.
Feature/Run: F12 WS-2, 07.09.2026; behoben F12-Nachtrag, 07.09.2026.

**F-147** · `BUG` · P2 · **gelöst**
Titel: `sammleLaufKopfdaten` liefert `auftragsbezug` bis heute konstant `null`, obwohl AK2 es als Kopfdatum verlangt.
Beschreibung: `scripts/leitstand-server.mjs` (`sammleLaufKopfdaten`) setzt `auftragsbezug: null` mit dem Kommentar „WS-2/AK5 füllt dieses Feld; WS-1 liefert es bewusst leer, kein Rückschritt" — WS-2 (PR #91, `main` `63e4059`) hat AK5 (Auftrag→Lauf-Zuordnung als Lineage-Eingabe-Referenz) real gebaut, diese Stelle aber nicht angefasst. `GET /api/laeufe` liefert das Feld dadurch für jeden Lauf konstant `null`, auch für Läufe mit echtem, über `artefakt:auftrag-<auftragId>` referenziertem Auftragsbezug.
Fundstelle: `scripts/leitstand-server.mjs` (`sammleLaufKopfdaten`, Zeile `auftragsbezug: null, // WS-2/AK5 füllt dieses Feld`).
Auswirkung: `features/F12/feature.md` AK2 nennt Auftragsbezug ausdrücklich als Kopfdatum der Laufliste („`laufId`, `laufStatus`, Ergebnis, Zeitpunkt, Auftragsbezug, …") — heute nicht erfüllt, obwohl AK5 die Datengrundlage dafür bereits liefert.
Maßnahme: F12 WS-3 (`state/plan-v1-f12-ws3.md`, Abschnitt 2.3) — `auftragsbezug` aus dem Kontextpaket-Element `artefakt:auftrag-<auftragId>` ableiten (dieselbe Ableitung wie AK7s Detailansicht, wiederverwendet). Bestandsläufe ohne dieses Element behalten `null`.
Maßnahme-Nachtrag: umgesetzt in `baueAuftragsbezug` (`scripts/leitstand-server.mjs`), wiederverwendet von `sammleLaufKopfdaten` (Kopfdaten, `{auftragId, titel}`) und dem Detailendpunkt (volles Feld inkl. `auftragstext`) — Request-lokales Memo je `auftragId` (F12 WS-3, PR ausstehend).
Feature/Run: F12-Challenge/WS-3-Planvorbereitung, 07.09.2026; behoben F12 WS-3, 07.09.2026.

**F-149** · `HARNESS_IMPROVEMENT` · P3 · **gelöst**
Titel: `LAUFID_UNZULAESSIGE_ZEICHEN` enthielt das Intervall U+0000–U+001F als rohe Bytes statt als Escape — `grep` behandelte die Datei dadurch als Binärdatei.
Beschreibung: `scripts/leitstand-server.mjs` (Offset ~19626) schrieb die Steuerzeichen-Zeichenklasse als literale Kontrollbytes (`[<NUL>-<US>]`) statt als `[U+0000-U+001F]`. Node interpretiert beides identisch (RegExp-Zeichenklasse), aber die rohen Bytes lassen `grep` (und andere Zeilen-orientierte Text-Tools) die gesamte Datei als Binärdatei einstufen — `grep -n "pathname" scripts/leitstand-server.mjs` lieferte „binary file matches" statt echter Treffer.
Fundstelle: `scripts/leitstand-server.mjs`, `LAUFID_UNZULAESSIGE_ZEICHEN`.
Auswirkung: jedes künftige Grep-basierte Gate oder jede manuelle Textsuche gegen diese Datei lief ins Leere, ohne sichtbaren Fehler (stille Lücke, keine Fehlermeldung außer der „binary file"-Notiz). Rein syntaktisch, keine Verhaltensänderung des Regex selbst.
Maßnahme: auf das Escape `[U+0000-U+001F]` umgestellt — semantisch identisch, real verifiziert: `grep -n "pathname" scripts/leitstand-server.mjs` liefert danach echte Zeilentreffer statt „binary file matches".
Feature/Run: F12 WS-3, 07.09.2026 (Auftrag, Zusatzaufgabe 1).

**F-157** · `TECH_DEBT` · P1 · **erledigt durch F13 WS-1 (AK1)**
Titel: Wiederaufnahme im Leitstand nur über rohes JSON bedienbar.
Beschreibung: public/leitstand/index.html:49–58 hält ein JSON-Textfeld; baueWiederaufnahmeVorlage (public/leitstand/app.js:174) belegt nur laufId und vorgaengerLaufId vor und liefert rolle:'', anfragen:[], budget:{}, aufrufEingaben:{}, werkzeugsatz:'', auftragId:'' — sechs Felder werden von Hand in JSON getippt.
Auswirkung: §13.3-Zielsatz "ohne JSON" und die Messgröße "Terminalwechsel = 0" sind für den geforderten Wiederaufnahme-Fall real nicht erfüllt.
Maßnahme: F13 WS-1 (AK1).
Status-Update (09.09.2026, Findings-Triage vor M3): erledigt durch F13 WS-1 (AK1). Beleg: `public/leitstand/index.html:36,39,44-47` (`select#start-auftrag`, `select#start-werkzeugsatz`, `fieldset#start-evidenzdateien`); `baueWiederaufnahmeVorlage` nicht mehr in `public/leitstand/app.js` vorhanden — durch geführte Bedienung abgelöst.
Feature/Run: Challenge F13, 07.09.2026.

**F-158** · `TECH_DEBT` · P1 · **erledigt durch F13 WS-2 (AK3)**
Titel: Kein Schreibpfad für menschliche Entscheidungen im Leitstand.
Beschreibung: scripts/leitstand-server.mjs kennt genau zwei POSTs (/api/auftraege, /api/laeufe). Für "entscheidet bei Rückfragen und Fehlschlägen im Leitstand" (§13.3 Zielsatz) existiert kein Endpunkt, obwohl alle Kernverben vorhanden sind (F9 importiereAntwort/entscheideStale, F1B schreibeWirkungsmarke).
Auswirkung: der Zielsatz von Meilenstein 2 ist zur Hälfte unbedienbar.
Maßnahme: F13 WS-2 (AK3), ausschließlich über bestehende Kernverben.
Status-Update (09.09.2026, Findings-Triage vor M3): erledigt durch F13 WS-2 (AK3). Beleg: `scripts/leitstand-server.mjs:1255` (`POST /api/entscheidungen`), `:105-123` (Verdrahtung auf `importiereAntwort`/`entscheideStale`/`schreibeWirkungsmarke`).
Feature/Run: Challenge F13, 07.09.2026.

**F-159** · `TECH_DEBT` · P1 · **erledigt durch F13 (AK8)**
Titel: F9-Transportkette im Produktpfad real nie ausgelöst; E-186 kein planbarer Nachweisfall.
Beschreibung: grep -rl "bedarf_schema" kontrollzustand/ → 0 Treffer; genau ein VERWEIGERT im gesamten Kontrollzustand. Ursache real geprüft: bypass_verdacht_anzahl (src/result-evaluator/index.ts:115–122) zählt nur permission_denials, deren tool_input selbst einen E-182-Verbotsparameter enthält — ein normal abgelehnter Write liefert VERWEIGERT mit 0 und damit keine Eskalation.
Auswirkung: §13.3 verlangt "ein Lauf mit echter Rückfrage" real; der E-186-Pfad ist dafür nicht zuverlässig provozierbar.
Maßnahme: F13 AK8 setzt auf den normalen VERWEIGERT-Lauf als Klärfall, nicht auf E-186.
Status-Update (09.09.2026, Findings-Triage vor M3): erledigt durch F13 (AK8). Beleg: `features/F13/nachweis-ws3.md:110-115` („AK8 erfüllt: JA" — realer VERWEIGERT-Lauf über den Leitstand entschieden, Folgelauf trägt die Entscheidung als Evidenzelement).
Feature/Run: Challenge F13, 07.09.2026.

**F-160** · `BUG` · P2 · gelöst
Titel: Terminale VERWEIGERT-Wirkungsmarke trug keine bypass_verdacht_anzahl/is_error/non_execution_kind.
Beschreibung: klassifiziereLauf schrieb bei VERWEIGERT keine dieser drei Felder in daten der terminalen Wirkungsmarke — die Leitstand-Detailansicht (AK2, "Klärzustand: Abgeschlossen (VERWEIGERT)") hätte nichts anzuzeigen gehabt.
Auswirkung: keine reale Regression (additiv, Schema bereits offen), aber AK2 wäre für den VERWEIGERT-Fall leer geblieben.
Maßnahme: behoben in F13 WS-1 (src/result-evaluator/index.ts), verifiziert claude/139.
Feature/Run: F13 WS-1, 07.09.2026.

**F-162** · `TECH_DEBT` · P2 · gelöst
Titel: begruendung muss bei Entscheidungsart 'terminal' Pflichtfeld sein.
Beschreibung: ohne erzwungene Begründung könnte eine Klärung ohne nachvollziehbaren Grund aufgelöst werden — pruefeEntscheidungsformular lehnt art:'terminal' ohne begruendung serverseitig mit 400 ab, vor jeder Zustandsänderung.
Maßnahme: umgesetzt in F13 WS-2 (scripts/leitstand-server.mjs), getestet (check-f13-entscheiden.mjs).
Feature/Run: F13 WS-2, 07.09.2026.

**F-166** · `BUG` · P1 · gelöst
Titel: Kein über den Leitstand gestarteter Lauf war vor WS-4 real entscheidbar.
Beschreibung: art:'terminal' wurde nur bei Status KLAERUNG_ERFORDERLICH angeboten — ein Status, den ein über den Leitstand gestarteter Lauf praktisch nie erreicht, weil klassifiziereLauf (src/result-evaluator/index.ts) in jedem Ausgang eine Terminalmarke schreibt. Der reale, geplante Klärfall (VERWEIGERT durch Werkzeuggrenze, AK8) landet in ABGESCHLOSSEN und bekam dort nur das art:'antwort'-Formular — das lief garantiert in ein 400, weil importiereAntwort (src/human-transport/index.ts) eine transport-<laufId>-Kette voraussetzt, die nur bei der E-186-Eskalation (unter einer anderen laufId) entsteht.
Auswirkung: AK8 war mit dem Bau vor WS-4 nicht erfüllbar — der §13.3-Zielsatz "entscheidet bei Rückfragen und Fehlschlägen im Leitstand" hatte für den häufigsten realen Klärfall keinen funktionierenden Pfad.
Maßnahme: behoben in F13 WS-4 — neue Entscheidungsart 'kenntnisnahme' (scripts/leitstand-server.mjs, public/leitstand/app.js), getestet (check-f13-entscheiden.mjs).
Feature/Run: F13 WS-4, 08.09.2026.

**F-167** · `TECH_DEBT` · P2 · gelöst
Titel: art:'terminal' prüfte den Laufstatus nicht vor dem Schreiben.
Beschreibung: POST /api/entscheidungen akzeptierte art:'terminal' unabhängig vom tatsächlichen Laufstatus — auf einem bereits ABGESCHLOSSENEN Lauf konnte dadurch eine verwaiste zweite Terminalmarke entstehen.
Auswirkung: keine bekannte reale Instanz, aber ein stiller Fehlbedienungsfall ohne Fehlermeldung.
Maßnahme: behoben in F13 WS-4 — Vorbedingungsprüfung (stelleLaufstatusFest) vor jedem Schreiben, 'terminal' nur bei KLAERUNG_ERFORDERLICH; getestet (check-f13-entscheiden.mjs, Nebenbefund-Testfall).
Feature/Run: F13 WS-4, 08.09.2026.

**F-175** · `BUG` · P1 · **erledigt durch F14 WS-4 (AK8)**
Titel: Laufender Lauf kann über den Leitstand terminal gesetzt werden
Beschreibung: stelleLaufstatusFest liefert für einen aktiven Lauf
KLAERUNG_ERFORDERLICH (F-172); POST /api/entscheidungen prüft laufAktiv bewusst
nicht (leitstand-server.mjs:122-123, AK6/D13); art:'terminal' ist genau bei
KLAERUNG_ERFORDERLICH erlaubt (:150-155). Ein Mensch kann damit einem noch
laufenden Lauf ein Terminalergebnis zuschreiben; kehrt der Kindprozess zurück,
schreibt klassifiziereLauf eine zweite Terminalmarke.
Fundstelle: scripts/leitstand-server.mjs:122-123, 150-155;
src/execution-controller/index.ts:264-269
Auswirkung: Inkonsistenter Kontrollzustand, zwei Terminalmarken auf einer
Laufkette. Selbe Defektfamilie wie F-167, dort nur für den bereits
abgeschlossenen Fall behoben.
Beleglage: aus Code abgeleitet, NICHT real reproduziert. Reproduktion ist
Bestandteil von F14 WS-4.
Empfohlene Maßnahme: In F14 AK8 lösen (löst zugleich F-172).
Status-Update (09.09.2026, Findings-Triage vor M3): erledigt durch F14 WS-4 (AK8). Beleg: `scripts/leitstand-server.mjs:1270-1274` (Ablehnung eines Terminalergebnisses für einen aktiven Lauf, Kommentar „(AK8)"); Gate `scripts/check-f14-abbruch.mjs:267-275,327-335` (regressionsgeprüft). `features/F14/feature.md:114` bestätigt „Löst F-175"; die „Offene Findings"-Liste in derselben Datei (Zeile 130) ist an dieser Stelle nicht nachgezogen — reine Dokumentationsinkonsistenz innerhalb `features/F14/feature.md`, nicht Teil dieses Doku-PRs (kein Produktcode/Feature-Akten-Scope hier).
Entdeckt bei: F14-Challenge, 08.09.2026

**F-176** · `TECH_DEBT` · P2 · gelöst
Titel: ProzessErgebnis und Starter können Prozessabbruch nicht ausdrücken
Beschreibung: execFile mit Callback verwirft das ChildProcess-Handle;
ProzessErgebnis hat kein Feld für killed/signal. Ein gekillter Prozess ist von
einem Startfehler nicht unterscheidbar.
Fundstelle: src/claude-code-gateway/prozessstart.ts:81-109;
src/claude-code-gateway/types.ts:37-45
Auswirkung: Blockiert F14 vollständig — Abbruch ist ohne diese Änderung nicht
implementierbar.
Empfohlene Maßnahme: F14 WS-1 (AK1, AK3).
Entdeckt bei: F14-Challenge, 08.09.2026
Maßnahme: behoben in F14 WS-1 — Starter trägt additiv optionen
(zeitgrenzeMs, abbruchSignal), ProzessErgebnis trägt additiv beendigungsart
('TIMEOUT' | 'ABBRUCH' | null), echterStarter nutzt execFiles eingebaute
timeout-/signal-Optionen, Unterscheidung empirisch gegen die reale
execFile-Fehlerform verifiziert (nicht geraten). Getestet in
claude-code-gateway.test.ts.
Feature/Run: F14 WS-1, 09.09.2026.

**F-179** · `HARNESS_IMPROVEMENT` · P2 · gelöst
Titel: .gitignore deckt nur kontrollzustand-test/ exakt ab, nicht die
Suffix-Varianten der Gate-Skripte
Beschreibung: check-f10-leitstand.mjs, check-f11-auftrag.mjs,
check-f12-leitstand-ansicht.mjs u.a. schreiben in
kontrollzustand-test-<feature>-<ak>/-Verzeichnisse. .gitignore:32 ignoriert
nur den literalen Namen kontrollzustand-test/. Über 150 solcher Dateien
standen dadurch ungetrackt im Arbeitsbaum und wurden erst durch git add -A
sichtbar.
Fundstelle: .gitignore:29-32; Testverzeichnisse kontrollzustand-test-f10-*,
-f11-*, -f12-*
Auswirkung: Ein arglos ausgeführtes git add -A reißt Hunderte Testartefakte
in einen Commit. Real passiert (F14 WS-1 Commit-Vorbereitung).
Empfohlene Maßnahme: .gitignore-Muster auf kontrollzustand-test*/
verallgemeinern (Wildcard).
Maßnahme: .gitignore:32 auf kontrollzustand-test*/ verallgemeinert — deckt
alle Suffix-Varianten der Gate-Skripte ab.
Entdeckt bei: Verifikation F14 WS-1, 09.09.2026
Feature/Run: (dieser PR), 09.09.2026

**F-182** · `PROCESS_IMPROVEMENT` · P1 · gelöst
Titel: Findings-Register führt gelöste P1-Einträge weiter als `offen`.
Beschreibung: 26 Einträge mit P1 und Status `offen`; F-158 (F13
feature.md:42/222), F-175 (F14 feature.md:114 „Löst F-175") und F-128
(laufAktiv, scripts/leitstand-server.mjs:964) sind laut Akten/Code
gelöst, F-127 durch F14 (zeitgrenzeMs, abbrechen-Route) funktional
erledigt — die Statuszeilen wurden nicht nachgezogen.
Gelöst: die vier genannten Beispiele (F-127, F-128, F-158, F-175) sind
korrekt als erledigt geführt (Stichprobe Technical Challenger,
10.09.2026). Ein Vollabgleich aller ursprünglich genannten 26
P1-offen-Einträge gegen den Code steht weiterhin aus — dafür bei Bedarf
einen eigenen, abgegrenzten Auftrag anlegen, kein Teil dieser Lösung.
Fundstelle: state/findings.md, Einträge F-127, F-128, F-158, F-175.
Auswirkung: E-M2-9 knüpft die Fortführung an „kein P0"; ein Register,
dessen P1-Stand nicht stimmt, taugt nicht als Grundlage für diese Regel
und für die M3-Planung.
Empfohlene Maßnahme: Vor dem ersten M3-Doku-PR alle P1-offen-Einträge
gegen die Akten F11–F14 abgleichen und Status setzen (dieser PR).
Feature/Run: M3-Challenge, 09.09.2026.

**F-184** · `TECH_DEBT` · P2 · **gelöst**
Titel: Rollen existieren im Kern nur als Kontextfilter, nicht als
Vertrag.
Beschreibung: `rolle` ist ein freier String im Startauftrag; einzige
Prüfung ist ROLLEN_AUSSCHLUSSMUSTER (vier Schlüssel). Die
Agent-Definitionen unter .claude/agents/ werden in -p-Läufen nicht
geladen; kein Systemprompt, kein Output-Schema, keine Stop-Bedingung je
Rolle.
Fundstelle: src/context-builder/types.ts (ROLLEN_AUSSCHLUSSMUSTER);
scripts/leitstand-server.mjs:756/852; src/claude-code-gateway/
index.ts:199–221.
Auswirkung: Kein Blocker für M2; für M3 ist ein Rollenvertrag
Voraussetzung jeder Nicht-Ausführer-Rolle.
Empfohlene Maßnahme: F17 WS-1 (rollen/<name>.json mit Output-Schema),
abhängig von E-M3-1.
Status: gelöst. `src/rollen/` (`ROLLENVERTRAEGE`) ist die einzige Stelle
im Repo, die Rollennamen definiert (F17 WS-1); Planzeitprüfung in
`validiereWorkflowDaten` und Startzeitprüfung in
`loeseAusfuehrungsEingabenAuf` setzen Werkzeugsatz-Art, Worker und
Ausgabeschema real durch (F17 WS-2), real belegt am Leitstand
(`features/F17/nachweis-ws3.md`, AK8/AK9).
Feature/Run: M3-Challenge, 09.09.2026. Gelöst: F17 WS-1–WS-3, 11.09.2026.

**F-193** · `PROCESS_IMPROVEMENT` · P3 · **gelöst**
Titel: WS-2a hat zwei Regeln mehr gebaut, als der Bauauftrag verlangte —
hier dokumentiert statt stillschweigend in Code verwandelt.
Beschreibung: Der Bauauftrag für ermittleNaechstenSchritt nannte vier
Regeln (Vorschritt-Ergebnis, max_schritte, worker 'codex', freigabe
'ZWINGEND'). Gebaut sind sechs. Neu sind Regel 0 (Workflow-status ∉
FORTSETZBARE_WORKFLOW_STATUS → haltKlaerung/fertig, vor der Verzweigung
nach mit/ohne Vorschrittergebnis) und Regel 3 (zu startender Schritt ist
nicht startbereit: lauf_id gesetzt oder status ∉ {OFFEN,
WARTET_FREIGABE} → haltKlaerung). Beide ändern das Verhalten real:
dieselbe Eingabe liefert haltKlaerung statt starte. Anlass war der
Reviewer-/QA-Pass 10.09.2026 (K1, R1, TC-A1/A2): ohne sie startete eine
Wiederaufnahme ohne Vorschrittergebnis einen bereits gelaufenen Schritt
erneut, und ein verspätetes Laufergebnis setzte einen vom Menschen
GESTOPPTEN Workflow fort — beides ein Verstoß gegen ARCHITECTURE.md §4
(„ein unterbrochener Baulauf wird nie automatisch neu gestartet").
Zusätzlich sind die vier sicherheitsrelevanten Prüfungen als Allowlist
statt als Blacklist formuliert (K2/R2), damit ein künftig ergänzter
Enum-Wert in „hält an" fällt statt in „startet automatisch".
Fundstelle: src/workflow/index.ts (Regeln 0 und 3, Konstanten
FORTSETZBARE_WORKFLOW_STATUS/STARTBEREITE_SCHRITT_STATUS/
AUTOMATISCH_STARTENDE_FREIGABE); src/workflow/types.ts (Begründung des
Gate-Verzichts).
Auswirkung: Keine Scope-Erweiterung gegenüber dem Auftragstext im heute
gültigen Wertebereich — für worker/freigabe ist die Allowlist punktweise
äquivalent zur verlangten Blacklist. Die beiden neuen Regeln sind echte
Zusatzgrenzen; jede ist im Gate einzeln rot kalibriert.
Empfohlene Maßnahme: Keine. Beim Anlegen der Feature-Akte F15 (existiert
noch nicht, anders als F0–F14) diesen Eintrag dorthin übernehmen.
Status-Update (10.09.2026, Anlegen der Feature-Akte F15): empfohlene
Maßnahme erledigt — der Eintrag ist in die Akte übernommen. Beleg:
`features/F15/feature.md`, Abschnitt „Abweichung vom Bauauftrag WS-2a
(F-193)": sechs statt vier Regeln, Regel 0
(`FORTSETZBARE_WORKFLOW_STATUS`) und Regel 3 (nicht startbereiter
Schritt), reale Verhaltensänderung, Anlass Reviewer-/QA-Pass 10.09.2026,
Verstoß gegen ARCHITECTURE.md §4, je Regel einzeln rot kalibriert,
Allowlist statt Sperrliste. Die konkreten Fundstellen (Konstantennamen,
`src/workflow/types.ts`) bleiben hier stehen und werden in der Akte nicht
wiederholt.
Feature/Run: F15 WS-2a, 10.09.2026.

**F-194** · `BUG` · P1 · **gelöst**
Titel: grenzen.max_schritte ist ein Schritt-, kein Laufbudget — eine
Wiederholungsschleife beendet es nicht.
Beschreibung: WORKFLOW_V0 hält je Schritt genau eine lauf_id.
zaehleGelaufeneSchritte zählt Schritte mit gesetzter lauf_id; führt der
Automat denselben Schritt ein zweites Mal aus und überschreibt sie,
steigt der Zähler nicht. Dass der Automat terminiert, hängt damit
zusätzlich an der Zyklenfreiheit der nachfolger-Kette (nur beim Anlegen
geprüft, nicht beim Laden) und daran, dass WS-2b keinen Schritt
wiederholt, ohne selbst mitzuzählen.
Fundstelle: src/workflow/index.ts, zaehleGelaufeneSchritte (Grenze der
Grenze im Funktionskopf ausdrücklich benannt).
Auswirkung: In WS-2a folgenlos (kein Startendpunkt). Mit dem
Schritt-Automaten aus WS-2b: unbegrenzt viele echte Werkzeugläufe, ohne
dass die Grenze je greift.
Empfohlene Maßnahme: Vor WS-2b entscheiden — Laufzähler im Schema
(WS-1-Änderung) oder ein vom Aufrufer geführtes Laufbudget als
zusätzlicher Parameter. Danach einen Gate-Rotfall mit simulierter
Schleife.
Feature/Run: F15 WS-2a, QA-Pass 10.09.2026 (TC-A3).
Status neu: **gelöst durch Regel 3 und die Akten-Festlegung, 10.09.2026**
Auflösung: Kein Laufzähler im Schema. Die Terminierung steht ohne ihn: die
nachfolger-Kette ist zyklenfrei UND zusammenführungsfrei validiert, und ein
Schritt ist nur startbereit, solange lauf_id null ist (Regel 3) — der Automat
kann keinen Schritt zweimal starten. Die einzige Wiederholung wäre ein Replan;
einen Replan-Pfad gibt es nicht, und eine vom Menschen neu eingereichte Fassung
ist durch den Menschen begrenzt, nicht durch einen Zähler. Restpunkt:
max_replans hat damit weiterhin keinen Leser — siehe „Halte-Zustände nach
WS-2b und ihr Ausweg" in features/F15/feature.md.

**F-195** · `TECH_DEBT` · P1 · **gelöst**
Titel: haltFreigabe hat keinen Auflösungsweg — eine erteilte Freigabe
ändert `freigabe` nicht.
Beschreibung: `freigabe: 'ZWINGEND'` ist ein Plandatum des Schritts und
bleibt nach der menschlichen Freigabe unverändert stehen.
ermittleNaechstenSchritt liefert für denselben Schritt daher weiterhin
haltFreigabe. Der Schritt-Status WARTET_FREIGABE ist zwar startbereit
(Regel 3), hebt das ZWINGEND aber nicht auf.
Fundstelle: src/workflow/index.ts, Regel 5; src/workflow/workflow.test.ts
(„WARTET_FREIGABE hebt ein ZWINGEND nicht auf").
Auswirkung: WS-2b braucht entweder einen zusätzlichen Parameter
(freigabeErteiltFuer) oder einen zweiten Startpfad an der Funktion
vorbei — und ein zweiter Startpfad ist genau das, wogegen die Extraktion
von loeseAusfuehrungsEingabenAuf argumentiert.
Empfohlene Maßnahme: Vor WS-2b festlegen, nicht dort improvisieren.
Status: gelöst in F15 WS-2c (b1), 10.09.2026 — und zwar über die dritte,
im Finding nicht genannte Möglichkeit: weder ein Aufrufparameter an
ermittleNaechstenSchritt noch ein zweiter Startpfad an ihr vorbei, sondern
ein neues optionales SCHRITTFELD `freigabe_erteilt`, das der Datensatz
selbst trägt. Damit bleibt die Entscheidung eine reine Funktion über einem
vollständigen Datensatz (kein zusätzlicher Parameter, keine zweite
Wahrheitsquelle im Serverspeicher), die Freigabe überlebt einen
Serverneustart, und es gibt weiterhin genau einen Startpfad.
`freigabe` selbst bleibt unverändertes Plandatum — die Beobachtung des
Findings war richtig, nur die beiden vorgeschlagenen Auswege waren es
nicht. Rot kalibriert (Regel entfernt → ZWINGEND startet nie, Gate rot).
Feature/Run: F15 WS-2a, Reviewer-Pass 10.09.2026 (V5/R3).

**F-189** · `PROCESS_IMPROVEMENT` · P3 · **gelöst**
Titel: Advisor-Pass-Schritt seit F13 stillschweigend ausgelassen.
Beschreibung: Der bei F11/F12 genutzte Advisor-Plan-Schritt (Skill
advisor-pass, Subagent architecture-advisor) wurde ab F13 nicht mehr
durchlaufen, ohne dass die Auslassung je als Prozessänderung entschieden
oder dokumentiert wurde. Aufgefallen bei der Vorbereitung von F15 WS-1.
Fundstelle: Claude-Projekt, vier ADVISOR_PLAN_V1-Dokumente zu F11/F12,
keine zu F13/F14/F15.
Auswirkung: Keine belegte — F13 und F14 sind real abgeschlossen. Ohne
Klärung laufen Prozessregel und Praxis aber auseinander.
Empfohlene Maßnahme: Keine offen. Aufgelöst durch Stefan am 09.09.2026
(Projektchat): Der Advisor-Pass ist kein Pflichtschritt, sondern eine
risiko- und umfangsabhängige Entscheidung je Workstream. Angewandt bei
F15: WS-1 ohne (exakter AUFTRAG_V0-Präzedenzfall), WS-2 mit
vorgeschaltetem Vorabdesign statt Advisor-Runde.
Feature/Run: F15-Vorbereitung, 09.09.2026.

**F-190** · `PROCESS_IMPROVEMENT` · P3 · **gelöst**
Titel: Bauauftrag F15 WS-1 enthielt eine in sich widersprüchliche
Vorgabe.
Beschreibung: Der Auftrag forderte die Beispieldatei „eingebettet in
eine vollständige Kontrollzustand-Hülle … nach demselben Aufbau wie
kontrollzustand-auftrag.valid.json" — letztere ist eine nackte Payload
ohne Hülle. Beide Vorgaben zugleich sind nicht erfüllbar.
Fundstelle: Bauauftrag F15 WS-1 (Projektchat 09.09.2026);
schemas/examples/kontrollzustand-auftrag.valid.json.
Auswirkung: Kein Schaden — die Bausitzung hat den Widerspruch erkannt,
ist dem Präzedenzfall gefolgt und hat die Abweichung offengelegt. Ohne
diese Rückfrage hätte der 1:1 gespiegelte Gate die Datei abgelehnt.
Empfohlene Maßnahme: Keine im Repo. Regel für künftige Bauaufträge:
Nennt ein Auftrag einen Präzedenzfall, darf daneben keine abweichende
Strukturvorgabe stehen — der Präzedenzfall gewinnt, und das wird
ausdrücklich so formuliert.
Feature/Run: F15 WS-1, 09.09.2026.

**F-199** · `PROCESS_IMPROVEMENT` · P2 · **erledigt durch features/F15/feature.md, 10.09.2026**
Titel: F15 wurde ohne Feature-Akte im Repo gebaut.
Beschreibung: features/ enthielt F0-F14, aber kein F15. Die Feature-Akte
zu F15 existierte nur im Claude-Projekt, auf das keine
Claude-Code-Sitzung zugreifen kann. WS-1 und WS-2a sind ohne
repo-erreichbare Akte gebaut worden.
Fundstelle: features/ (Verzeichnislisting 10.09.2026);
scripts/check-feature.mjs prüft nur vorhandene Akten, nicht deren Fehlen.
Auswirkung: Die Abweichungsdokumentation aus F-193 hatte keinen Zielort,
und jede künftige Sitzung hätte den Kontext aus Prompts rekonstruieren
müssen — dasselbe Muster wie F-013, F-082, F-092.
Empfohlene Maßnahme: Akte angelegt. Offen bleibt die Frage, ob
check-feature.mjs eine fehlende Akte zu einem in Arbeit befindlichen
Feature erkennen sollte — dafür bräuchte es eine Quelle, welche Features
in Arbeit sind. Als eigene kleine Iteration prüfen, nicht hier.
Feature/Run: F15 WS-2a, 10.09.2026.

**F-201** · `BUG` · P2 · erledigt
Titel: Zwei-Server-Instanzen-Stale-Heal-Race (D13 ist prozesslokal).
Beschreibung: laufAktiv, laufAktivLaufId, laufAktivAbortController sind
modul-lokale Variablen in scripts/leitstand-server.mjs, nicht
prozessübergreifend. Laufen (versehentlich oder während eines Neustarts)
zwei Serverinstanzen gleichzeitig, sieht jede nur ihr eigenes laufAktiv.
Die Stale-LAEUFT-Erkennung (laufAktiv ? undefined :
schritte.find(status LAEUFT)) kann in einer zweiten Instanz fälschlich
"stale" melden, obwohl die erste Instanz den Schritt real noch ausführt
— oder beide Instanzen starten denselben Schritt parallel.
Fundstelle: scripts/leitstand-server.mjs, D13-Variablen (~Zeile 1419).
Auswirkung: Datenintegrität bei parallelen Prozessen gefährdet. Wird mit
WS-2c relevant, da der Automat dort unbeaufsichtigt weiterläuft und das
Zeitfenster für diese Race sich vergrößert.
Nachtrag 10.09.2026 (Challenger): PORT wird per server.listen(PORT,
'127.0.0.1') ohne error-Handler gebunden. Ein zweiter Start auf
Standardkonfiguration scheitert damit bereits an EADDRINUSE — der versehentliche
Doppelstart war nie möglich. Real möglich blieb allein LEITSTAND_PORT=<anderer>
aus demselben Arbeitsverzeichnis. Entscheidung Stefan 10.09.2026: Instanz-Lock
im CLI-Bindeblock (kontrollzustand/.leitstand.lock mit PID-Liveness-Prüfung),
nicht bloße Betriebsregel.
Empfohlene Maßnahme: vor WS-2c klären — entweder prozessübergreifendes
Lock (Datei-/PID-Lock) oder explizit dokumentierte Betriebsregel "genau
eine Serverinstanz". Harte Vorbedingung für WS-2c (Challenger-Entscheidung
09.09.2026).
Status: erledigt durch PR #121, 10.09.2026 — belegeInstanzLock in
scripts/leitstand-server.mjs (nur CLI-Bindeblock), Gate
scripts/check-f15-instanzlock.mjs.
Feature/Run: F15 WS-2b, 10.09.2026.

**F-202** · `TECH_DEBT` · P2 · **gelöst**
Titel: Kein dauerhaftes Klärgrund-Feld in WORKFLOW_V0.
Beschreibung: Der Grund für KLAERUNG_ERFORDERLICH wird nur in der
409-Antwort und im startfehlerListe-Eintrag mitgegeben, nicht im
Workflow-Artefakt selbst gespeichert. Nach Server-Neustart oder beim
Betrachten der Workflow-Historie ist er aus dem Artefakt allein nicht
rekonstruierbar.
Fundstelle: schemas/kontrollzustand-workflow-payload.schema.json (kein
grund-Feld auf Workflow-Ebene).
Auswirkung: WS-3 (Leitstand-UI) müsste den Grund aus einem anderen Kanal
beziehen als dem Workflow-Artefakt selbst.
Empfohlene Maßnahme: in WS-3 prüfen, ob ein optionales grund-Feld auf
Workflow-Ebene sinnvoll ist.
Status: gelöst in F15 WS-2c (a5), 10.09.2026 — WORKFLOW_V0 trägt ein
OPTIONALES Feld grund auf Workflow-Ebene (Schema, Validator, Typ). Gesetzt
bei jedem nicht-'starte'-Ausgang aus dem Text, den beschreibeAutomatAusgang
ohnehin erzeugt, sowie beim Heilungs- und beim Stale-LAEUFT-Halt; auf null
gesetzt, sobald ein Schritt startet. Nicht in WS-3 verschoben, weil WS-2c den
Halt ohne HTTP-Aufruf erzeugt: der Grund stand danach nur noch in der
flüchtigen startfehlerListe und war nach einem Serverneustart weg.
Feature/Run: F15 WS-2b, 10.09.2026.

**F-203** · `TECH_DEBT` · P3 · erledigt
Titel: grenzen.max_replans wird validiert, aber nirgends gelesen oder
durchgesetzt.
Beschreibung: Das Schema definiert grenzen.max_replans als Pflichtfeld,
kein Codepfad in src/workflow/index.ts oder scripts/leitstand-server.mjs
liest oder dekrementiert es. Totes Feld.
Fundstelle: src/workflow/types.ts (WorkflowV0Grenzen), Validator in
src/workflow/index.ts.
Auswirkung: künftige Bauaufträge könnten fälschlich annehmen, ein
Replan-Limit sei bereits durchgesetzt.
Empfohlene Maßnahme: Korrigiert 10.09.2026 (Challenger): Die ursprünglich
vorgeschlagene YAGNI-Entfernung von grenzen.max_replans aus dem Schema ist
NICHT durchführbar. meldeUnbekannteFelder(obj.grenzen, GRENZEN_FELDER, ...) in
src/workflow/index.ts:279 lehnt unbekannte Felder unter grenzen ab, und
max_replans ist dort Pflichtfeld (:281). Eine Entfernung würde jede bereits
geschriebene Workflow-Version ungültig machen; Kernartefakte sind append-only
(ARCHITECTURE.md §7), die Bestandsdaten lassen sich nicht nachziehen. Das Feld
bleibt und wird im Schema als reserviert dokumentiert. Priorität auf P3.
Status: erledigt (F45 B2b-1a, 14.10.2026): `grenzen.max_replans` ist die Gesamtgrenze der automatischen Rückwege über alle Stufen, je Stufe höchstens einer (`pruefeRueckweg`, `scripts/leitstand/f35-ws3-adjust-automatik.mjs`); erster Leser ist die Anpassungsautomatik der Bau-Stufe (vorher feste Grenze 3), die Plan-Stufe nutzt dieselbe Funktion mit B2b-1b. Gate `scripts/check-f45-b2b1-rueckweg.mjs` (a)/(a0).
Feature/Run: F15 WS-2b, 10.09.2026.
Zugeordnet: Fixpaket Arbeitsfähigkeit (E-M5-18, 01.10.2026).

**F-204** · `TECH_DEBT` · P3 · erledigt
Titel: max_schritte zählt anhand der aktuellen schritte[]-Liste, nicht
geprüft gegen künftige Replan-Fälle.
Beschreibung: Die Zählung der gelaufenen Schritte in
ermittleNaechstenSchritt liest die aktuelle schritte[]-Liste der
geladenen Fassung. Solange es keine Replans gibt, ist das korrekt (die
Liste ist vollständig und kumulativ). Führt WS-2c echte Replans ein
(siehe F-203), ist ungeprüft, ob die Zählung dann noch stimmt.
Fundstelle: src/workflow/index.ts, Schritt-Zählung in
ermittleNaechstenSchritt.
Auswirkung: aktuell keine — rein vorsorglich für WS-2c.
Empfohlene Maßnahme: bei Umsetzung von F-203 gemeinsam erneut prüfen.
Nachtrag 10.09.2026 (Challenger): Da grenzen.max_replans laut F-203 im
Schema bleibt, aber weiterhin nichts durchsetzt, existieren keine Replans —
dieser Befund bleibt bis dahin gegenstandslos und ist kein Blocker für WS-2c.
Status: erledigt (F45 B2b-1a, 14.10.2026, Advisor-Pass E5): mit F-203 erneut geprüft — ein Rückweg setzt den Schritt auf `lauf_id` null zurück, `max_schritte` zählt damit weiterhin verschiedene gelaufene Schritte, nicht Läufe; die Zahl der Wiederholungen begrenzt `max_replans` (je Stufe 1). Keine Änderung nötig.
Feature/Run: F15 WS-2b, 10.09.2026.

**F-207** · `BUG` · P1 · **gelöst**
Titel: WARTET_FREIGABE ist ein Zustand ohne jeden Reparaturpfad.
Beschreibung: FORTSETZBARE_WORKFLOW_STATUS (src/workflow/index.ts:86)
enthält WARTET_FREIGABE, aber ein erneuter POST
/api/workflows/<id>/starten läuft über ermittleNaechstenSchritt wieder in
haltFreigabe (409). Einen Endpunkt, der eine Freigabeentscheidung
entgegennimmt, gibt es nicht (F-195/AK7). Zusätzlich steht
WARTET_FREIGABE in GESPERRTE_ERSETZUNGS_STATUS
(scripts/leitstand-server.mjs:932), sodass auch keine korrigierte Fassung
desselben workflow_id eingereicht werden kann. Ein Workflow, der auf
einem Schritt mit freigabe: ZWINGEND anhält, ist damit endgültig
zugemauert — auch für den Menschen.
Fundstelle: src/workflow/index.ts:86; scripts/leitstand-server.mjs:932.
Auswirkung: Im heutigen manuellen Schritt-für-Schritt-Modus trifft man
das nur absichtlich. WS-2c fährt automatisch hinein, beim ersten
ZWINGEND-Schritt. AK10 (realer Ende-zu-Ende-Nachweis) wäre ohne
Auflösung nur über einen Workflow ganz ohne ZWINGEND-Schritt erreichbar,
also am Governance-Fall vorbei.
Empfohlene Maßnahme: AK7 (POST /api/workflows/<id>/freigabe) gehört in
WS-2c, nicht dahinter. Schärft F-195: dort fehlt die Automatik, hier
fehlt jeder Weg zurück.
Status: gelöst in F15 WS-2c (b1), 10.09.2026 — genau wie empfohlen, in
WS-2c und nicht dahinter. POST /api/workflows/<id>/freigabe nimmt
FREIGEGEBEN und ABGELEHNT entgegen, hält beides als Kernartefakt
`entscheidung-workflow-<workflowId>-<schrittId>` fest (erzeuger 'mensch')
und startet den Schritt bei FREIGEGEBEN im selben Tick weiter; ABGELEHNT
führt nach GESTOPPT, das NICHT in GESPERRTE_ERSETZUNGS_STATUS steht — der
Reparaturpfad über eine korrigierte Fassung bleibt damit offen. Die
Sperrung von WARTET_FREIGABE bleibt bestehen und ist richtig so: eine neue
Fassung dort wäre die Freigabe-Umgehung, die das Finding beschreibt, nur
von der anderen Seite. Real belegt über die GESAMTE Kette mit echtem
Kindprozess: `scripts/check-f15-automat-real.mjs` (c) Freigabe und (d)
Ablehnung samt begangenem Reparaturpfad. Rot kalibriert: ohne die
freigabe_erteilt-Regel startet ein ZWINGEND-Schritt nie, ohne die
D13-Prüfung im Endpunkt startet er neben einem laufenden Schritt — beide
Fälle real rot. Dabei mitgelöst: ein im Body eingereichtes
freigabe_erteilt hätte den Endpunkt vollständig umgangen (Selbstfreigabe
ohne Entscheidungsartefakt); POST /api/workflows normalisiert es seither
weg, mit eigenem Rotfall.
Feature/Run: F15 WS-2c-Vorabdesign, 10.09.2026.

**F-208** · `TECH_DEBT` · P2 · **gelöst**
Titel: Interaktion zwischen manuellem Laufabbruch und dem
Schritt-Automaten ungeprüft.
Beschreibung: POST /api/laeufe/<laufId>/abbrechen (F14 WS-4) löst den
AbortController aus und antwortet sofort, ohne das Laufende abzuwarten.
Ob der abgebrochene Lauf danach jemals mit ERFOLGREICH klassifiziert
zurückkommt, ist nicht belegt. Käme er so zurück, würde der Automat ab
WS-2c den Folgeschritt starten und damit einen vom Menschen
abgebrochenen Arbeitsstrang fortsetzen.
Fundstelle: scripts/leitstand-server.mjs, POST
/api/laeufe/<laufId>/abbrechen (~Zeile 2143ff) im Zusammenspiel mit der
nachLauf-Kette.
Auswirkung: aktuell keine (WS-2b startet nichts von selbst). Ab WS-2c
ein möglicher Verstoß gegen die menschliche Abbruchentscheidung.
Empfohlene Maßnahme: In WS-2c ein realer Test "Schritt 1 starten,
abbrechen, Laufende abwarten" mit der Zusage, dass Schritt 2 nicht
startet. Fällt der Test anders aus, ist das ein Blocker für WS-2c, kein
Nachtrag.
Status: gelöst in F15 WS-2c (a6), 10.09.2026 — die Annahme trägt, real
belegt statt behauptet. `scripts/check-f15-automat-real.mjs` (b) startet
über die GESAMTE reale Kette (echter Kindprozess, kein Mock) einen
zweistufigen Workflow, bricht Schritt 1 über den echten
POST /api/laeufe/<laufId>/abbrechen ab und wartet das Laufende ab: der
abgebrochene Lauf endet FEHLGESCHLAGEN, Regel 1 von
ermittleNaechstenSchritt greift, der Workflow steht auf
KLAERUNG_ERFORDERLICH, Schritt 2 bleibt OFFEN mit lauf_id null. Rot
kalibriert: mit entfernter Regel 1 startet Schritt 2 real, und beide
Zusagen des Falls werden rot.
Feature/Run: F15 WS-2c-Vorabdesign, 10.09.2026.

**F-216** · `TECH_DEBT` · P1 · erledigt
Titel: Eine laufende automatische Kette hat keine verlässliche Bremse.
Beschreibung: Seit WS-2c fährt der Automat mehrere Schritte hintereinander.
Der einzige Eingriff des Menschen ist
`POST /api/laeufe/<laufId>/abbrechen` — und der zielt auf eine `laufId`, die
sich mit jedem Schritt ändert. Trifft die Anfrage nach dem Ende von Schritt n
ein, antwortet der Endpunkt 404, während Schritt n+1 bereits läuft. Trifft
sie kurz vor dem Laufende ein, kommt 202 "Abbruch angefordert" zurück, der
Lauf endet trotzdem ERFOLGREICH und die Kette setzt fort — eine 202 ist also
keine Zusage, dass die Kette steht. Eine neue Fassung als Notbremse ist in
`LAEUFT` gesperrt (`GESPERRTE_ERSETZUNGS_STATUS`).
Fundstelle: `scripts/leitstand-server.mjs`,
`POST /api/laeufe/<laufId>/abbrechen` im Zusammenspiel mit der
Auto-Fortsetzung; `features/F15/feature.md`, AK8 (WS-3).
Auswirkung: In WS-2b war das Nicht-Aufrufen des zweiten `/starten` die
Bremse. WS-2c entfernt sie, ohne Ersatz — der Workflow-Stopp ist AK8 und
gehört zu WS-3. Bis dahin kann der Mensch eine unbeabsichtigt gestartete
Kette nur schritt-für-schritt abbrechen und muss dabei jedes Mal die neue
`laufId` treffen.
Empfohlene Maßnahme: Verzweigungsentscheidung für Stefan, kein
Bauauftrag-Nachtrag: entweder ein Workflow-Stopp
(`POST /api/workflows/<id>/stoppen`, setzt GESTOPPT und bricht den aktiven
Lauf ab) wird vorgezogen, oder AK8/WS-3 folgt unmittelbar. Der bereits
festgehaltene Vorbehalt gilt zusätzlich: ein Regel-0-Ausgang darf ein
bestehendes GESTOPPT nicht überschreiben (`features/F15/feature.md`).
Status: erledigt in F15 WS-2c (b2), 10.09.2026 — der Workflow-Stopp wurde
vorgezogen (die erste der beiden vorgeschlagenen Verzweigungen):
`POST /api/workflows/<id>/stoppen` mit Pflichtbegründung setzt GESTOPPT,
Cursor null und Grund und bricht danach den aktiven Lauf ab, falls er zu
diesem Workflow gehört. Der Vorbehalt zum Regel-0-Ausgang war bereits in (b1)
eingelöst und hält hier: `scripts/leitstand-server.mjs`, Gates
`scripts/check-f15-workflow.mjs` (Vertragsform, Stopp mitten im Schritt mit
Riegel, Quelltextzusage zur Reihenfolge mit Selbsttest) und
`scripts/check-f15-automat-real.mjs` (e)/(f) (realer Kindprozess, realer
Reparaturpfad). AK8/WS-3 bleibt davon unberührt und OFFEN — hier ist nur der
Endpunkt entstanden, keine Oberfläche und kein Überspringen.
Feature/Run: F15 WS-2c (a), 10.09.2026 (QA-Pass).

**F-226** · `TECH_DEBT` · P2 · erledigt
Titel: Eine Planänderung umgeht die Freigabepflicht, ohne eine Bezeugung zu
hinterlassen.
Beschreibung: Ein `ZWINGEND`-Schritt lässt sich nicht nur über
`POST /api/workflows/<id>/freigabe` startbar machen, sondern auch über eine
neue Fassung, in der derselbe Schritt `AUTOMATISCH` trägt. Die
Ersetzungssperre (`GESPERRTE_ERSETZUNGS_STATUS`) hängt am persistierten Status
und greift deshalb genau in den Bauformen NICHT, die F15 WS-2c (b1) neu
freigebbar gemacht hat: `OFFEN` und `KLAERUNG_ERFORDERLICH` mit fälligem
`ZWINGEND`-Schritt, und `GESTOPPT` nach einer Ablehnung. Derselbe
Konstruktionsfehler, den (b1) beim Freigabe-Endpunkt beseitigt hat (Regel
statt Status), eine Verzweigung daneben.
Fundstelle: `scripts/leitstand-server.mjs`, `GESPERRTE_ERSETZUNGS_STATUS` und
die Ersetzungsprüfung in POST /api/workflows.
Auswirkung: Bei einem einzigen Menschen, der zugleich einzige
Entscheidungsinstanz ist, ist das vertretbar — eine Planänderung IST seine
Entscheidung, und sie wird als neue, append-only Workflow-Version neben der
alten Fassung festgehalten. Was fehlt, ist die ausdrückliche Bezeugung: kein
`entscheidung-*`-Artefakt, keine Begründungspflicht. AK7 Satz 2 („die einzige
Auflösung") gilt deshalb nur innerhalb eines gegebenen Plans; so steht es
seit (b1) auch in `features/F15/feature.md`.
Empfohlene Maßnahme: Verzweigungsentscheidung für Stefan, kein
Bauauftrag-Nachtrag. Variante A: die Ersetzungssperre ebenfalls an die Regel
hängen (liefert `ermittleNaechstenSchritt` `haltFreigabe`, ist der Workflow
nicht ersetzbar) — Preis: ein Tippfehler IN einem `ZWINGEND`-Schritt wäre dann
nicht mehr korrigierbar, also genau der zugemauerte Zustand, gegen den die
Ersetzungsregel verengt wurde. Variante B: bei der heutigen Fassung bleiben
und eine Planänderung, die ein `ZWINGEND` entfernt, zusätzlich als
Entscheidungsartefakt festhalten. Variante B ist die kleinere Änderung und
schließt die Bezeugungslücke, ohne einen Reparaturpfad zu opfern.
Status: erledigt in F15 WS-2c (b3), 10.09.2026 — Variante B gebaut
(Challenger-Entscheidung 10.09.2026). `POST /api/workflows` vergleicht die
eingereichte Fassung mit dem für die Ersetzungsprüfung ohnehin geladenen
Bestand (`ermittleFreigabeAbschwaechungen`, kein zusätzliches I/O) und meldet
jeden Schritt, der unter derselben `schritt_id` nicht mehr `ZWINGEND` trägt
oder ganz entfällt. Bei einem Treffer: `begruendung` ist Pflicht (400 sonst,
mit den `schritt_id`s NAMENTLICH im Grund — das ist der eigentliche Zweck,
nicht die Begründung), und es entsteht
`entscheidung-workflow-<workflowId>-planaenderung` (`erzeuger: 'mensch'`,
`ergebnis: 'FREIGABEPFLICHT_ABGESCHWAECHT'`, Begründung, Zeitstempel, Liste
der Schritte mit alter und neuer Stufe, `eingaben`-Verweis auf die VORHERIGE
Version). Artefakt VOR dem Schreiben der neuen Fassung; scheitert es, wird die
Fassung NICHT geschrieben (500) — anders als beim Stopp aus (b2), wo die
Wirkung schon eingetreten war.
Ohne Treffer ändert sich nichts: gewöhnliche Planänderungen, Erstanlage und
die VERSCHÄRFUNG (`AUTOMATISCH` -> `ZWINGEND`) bleiben begründungsfrei — eine
Pflicht, die bei jedem Speichern anschlägt, wird zur Klickstrecke.
Abweichend vom Bauauftrag als „nicht mehr ZWINGEND" formuliert statt als
Aufzählung der beiden heutigen Gegenwerte: eine künftige vierte Freigabestufe
fiele sonst still aus der Bezeugungspflicht (F-244).
Fünf Gate-Fälle in `scripts/check-f15-workflow.mjs` ((b3)); rot kalibriert
durch Entfernen der Abschwächungserkennung — sechs Befunde, kein Absturz,
Datei-Hash vor und nach dem Rückbau identisch.
Feature/Run: F15 WS-2c (b1), 10.09.2026 (QA-Pass, Befund 1).

**F-227** · `BUG` · P2 · erledigt
Titel: Die Nachbereitung stempelt ihren Laufausgang ohne Identitätsprüfung.
Beschreibung: Der `nachLauf`-Rückruf adressiert den Schritt allein über
`schritt_id` und schreibt `lauf_id` und Ausgang in den Datensatz, der beim
Laufende auf der Platte liegt — ohne zu prüfen, ob dieser Schritt noch die
`laufId` DIESES Laufs trägt. Liegt inzwischen eine andere Fassung dort,
bekommt ein fremder Plan den Ausgang eines Laufs, den niemand für ihn
gestartet hat, und die Auto-Fortsetzung fährt in ihm weiter.
Fundstelle: `scripts/leitstand-server.mjs`, `schreibeWorkflowFortschritt`
(Adressierung über `schritt_id`) und der `nachLauf`-Rückruf in
`starteWorkflowSchritt`.
Auswirkung: Heute unerreichbar, weil `LAEUFT` in
`GESPERRTE_ERSETZUNGS_STATUS` steht. Zwei Türen stehen aber schon offen: die
`bestandUngueltig`-Ausnahme erlaubt eine neue Fassung in JEDEM Status, und der
Workflow-Stopp aus (b2)/WS-3 wird „GESTOPPT setzen, dann neue Fassung
einreichen" ermöglichen, während der alte Lauf noch fliegt — die neue Fassung
steht dann auf `OFFEN`, und der GESTOPPT-Schutz greift nicht mehr, weil er den
Zustand liest und nicht die Identität.
Empfohlene Maßnahme: Im Nachbereitungs-Updater (nur dort, nicht bei
Freigabe/Ablehnung) verlangen, dass der geladene Schritt `lauf_id === laufId`
trägt, sonst Abbruch mit Startfehlereintrag. Gehört zu (b2)/WS-3, weil dort
entschieden wird, wie ein Stopp einen fliegenden Lauf behandelt.
Status: erledigt in F15 WS-2c (b2), 10.09.2026 — wie empfohlen umgesetzt:
`schreibeWorkflowFortschritt` nimmt einen optionalen Parameter
`erwarteteLaufId`; ist er gesetzt, muss der GELADENE Schritt genau diese
`lauf_id` tragen, sonst wird nichts geschrieben, ein Startfehlereintrag
gemeldet und nicht fortgesetzt. Gesetzt wird er ausschließlich von der
Nachbereitung. Verhaltensfall in `scripts/check-f15-workflow.mjs` ((b2)
F-227: stoppen, neue Fassung einreichen, den alten Lauf enden lassen); rot
kalibriert — ohne die Prüfung steht der fremde Schritt auf ERFOLGREICH und
die Auto-Fortsetzung startet einen zweiten Lauf.
Feature/Run: F15 WS-2c (b1), 10.09.2026 (Reviewer-Pass, V1).

**F-228** · `BUG` · P2 · erledigt
Titel: Der GESTOPPT-Schutz friert den Datensatz ein, hält den Start aber nicht
an.
Beschreibung: Steht die Platte beim Fortschreiben in `starteWorkflowSchritt`
auf `GESTOPPT`, friert `schreibeWorkflowFortschritt` die Workflow-Ebene ein —
die SCHRITTfelder (`status: 'LAEUFT'`, `lauf_id`) gelten aber weiter, die
Funktion sieht `ok: true` und startet den Lauf samt D13-Belegung. Ergebnis:
ein Schritt auf `LAEUFT` unter einem Workflow auf `GESTOPPT`, mit einem
Cursor, der woanders hinzeigt.
Fundstelle: `scripts/leitstand-server.mjs`, GESTOPPT-Schutz in
`schreibeWorkflowFortschritt` gegen die Fortschreibung in
`starteWorkflowSchritt`.
Auswirkung: Heute nicht erreichbar — es gibt keinen Endpunkt, der `GESTOPPT`
setzt, während ein Start läuft, und der Ablauf innerhalb eines Starts ist
synchron. Genau das ändert der Workflow-Stopp aus (b2). Dann ist es der Fall,
mit dem der Schutz begründet ist („stoppt der Mensch während eines
Schritts"), und die Rücknahme wäre unvollständig.
Empfohlene Maßnahme: `schreibeWorkflowFortschritt` gibt den eingefrorenen Fall
aus (`{ ok: true, eingefroren: true }`), `starteWorkflowSchritt` bricht
daraufhin VOR der laufId-Reservierung und der D13-Belegung ab. In (b2)
mitbauen, mit eigenem Rot-Fall.
Status: erledigt in F15 WS-2c (b2), 10.09.2026 — in der vorgeschlagenen Form
umgesetzt (`{ ok: true, eingefroren: true }`, eine Form, kein zweiter
Rückgabetyp). `starteWorkflowSchritt` bricht ab, ohne zu starten und ohne D13
zu belegen, und setzt den gerade geschriebenen Schrittstand zurück (OFFEN,
lauf_id null — es ist nichts gelaufen). Alle acht Aufrufstellen lesen das Feld.
KORREKTUR ZUR ANNAHME DIESES BEFUNDS: der Workflow-Stopp aus (b2) macht den
Fall NICHT erreichbar. Alle drei Aufrufer des Startpfads fragen vorher
`ermittleNaechstenSchritt`, und GESTOPPT verlässt dessen Regel 0 über
`haltGestoppt`, nie über `'starte'`; der Stopp schreibt sein GESTOPPT synchron,
es bleibt also auch kein Fenster dazwischen. Ein VERHALTENS-Rotfall ist damit
nicht konstruierbar, und die Zusage wird nicht als erzwungene Grenze behauptet
(ARCHITECTURE.md §8). Geprüft wird die Behandlung im Quelltext — Zählung der
Aufrufstellen gegen die Lesestellen in `scripts/check-f15-workflow.mjs`, rot
kalibriert durch Entfernen der Behandlung (8/6 statt 9/8).
Feature/Run: F15 WS-2c (b1), 10.09.2026 (Reviewer-Pass, V2).

**F-231** · `HARNESS_IMPROVEMENT` · P2 · erledigt
Titel: `check-f15-automat-real.mjs` hat keine obere Schranke — ein Lauf, der
nie endet, lässt das Gate hängen statt rot zu werden.
Beschreibung: Beim Rot-Fall zu F-216 (Abbruch im Stopp-Endpunkt entfernt)
lief der hängende Kindprozess weiter, die Poll-Schleife lief in ihr
60-Sekunden-Zeitfenster, und danach terminierte der Node-Prozess nicht mehr:
der Kindprozess hält den Event-Loop offen. Das Gate meldete nichts — es lief
einfach nicht zu Ende und musste von außen abgebrochen werden. Der
Attrappen-Zwilling in `scripts/check-f15-workflow.mjs` wurde bei derselben
Manipulation korrekt rot (zwei Befunde).
Fundstelle: `scripts/check-f15-automat-real.mjs`, Blöcke (b) und (e) —
`HAENGE_SKRIPT` mit `zeitgrenze_ms` 600000 und `warteAufWorkflowStatus`.
Auswirkung: Genau der Defekt, gegen den der Block gebaut ist (der Abbruch
wirkt nicht), erzeugt kein Rot, sondern einen Hänger. In `npm run check` heißt
das: kein Befund, keine Meldung, kein Ende. Ein Gate, das bei der Verletzung
seiner eigenen Zusage hängt statt fehlzuschlagen, ist genau die Art
Behauptung, gegen die F-211 sich richtet.
Empfohlene Maßnahme: Die Blöcke, die einen hängenden Kindprozess benutzen,
mit einer eigenen Obergrenze versehen — nach Ablauf der Poll-Schleife den
noch aktiven Lauf über `POST /api/laeufe/<laufId>/abbrechen` beenden und den
Zeitüberschreitungsfall als Befund melden. Alternativ `zeitgrenze_ms` so
wählen, dass die F14-Zeitgrenze selbst greift, bevor das Gate aufgibt — dann
endet der Prozess in jedem Fall. Eigene kleine Iteration; betrifft auch
`scripts/check-f14-abbruch.mjs`, das dasselbe Muster benutzt.
Status: erledigt in F15 WS-2c (b2, Auflage 1), 10.09.2026 — zwei Maßnahmen,
beide in `scripts/check-f15-automat-real.mjs`:
(a) ein Wachhund-Timer am Dateianfang, per `unref()` registriert. Er hält den
Prozess nicht offen (Normalfall unverändert), feuert aber, wenn ihn etwas
ANDERES offen hält, gibt eine Befundzeile aus und beendet mit
`process.exit(1)`. Frist fünf Minuten — die vollständige Datei läuft real in
rund zehn Sekunden (gemessen 10.09.2026), das ist die dreißigfache Reserve
und ausdrücklich eine Reißleine, kein Zeitlimit für den Test.
(b) die Blöcke mit `HAENGE_SKRIPT` ((b) und (e)) brechen einen noch
fliegenden Lauf in ihrer Aufräumroutine über den realen `/abbrechen`-Endpunkt
ab, BEVOR sie den Testserver schließen (`beendeLaufFallsAktiv`, best effort
und still — ein 404 ist der Normalfall).
Beide sind einzeln rot kalibriert: nur (a) lahmgelegt → das Gate endet nach
70 Sekunden mit Befund und Exit 1 statt zu hängen; (a) und (b) gemeinsam
lahmgelegt → der Wachhund feuert und beendet mit Befund und Exit 1.
GEPRÜFT, nicht angenommen: `scripts/check-f14-abbruch.mjs` und
`scripts/check-f15-instanzlock.mjs` haben die Lücke NICHT — beide beenden über
`process.exit()` statt `process.exitCode` und kehren deshalb auch bei einem
offenen Handle zurück; `check-f15-instanzlock.mjs` benutzt zusätzlich
`spawnSync` mit `timeout`. Ein Rest bleibt dort trotzdem und ist als F-236
festgehalten.
Feature/Run: F15 WS-2c (b2), 10.09.2026 (Rot-Kalibrierung).

**F-233** · `TECH_DEBT` · P2 · erledigt
Titel: Der Workflow-Stopp legt kein Entscheidungsartefakt an — anders als
Freigabe und Ablehnung.
Beschreibung: `POST /api/workflows/<id>/freigabe` registriert in BEIDEN
Zweigen ein Kernartefakt `entscheidung-workflow-<id>-<schrittId>`
(`erzeuger: 'mensch'`, mit `eingaben`-Verweis auf die entschiedene
Workflow-Version), weil eine festgehaltene Menschenentscheidung sonst später
nicht mehr einzuordnen ist (AK7 Satz 2, F-162). Der Stopp aus (b2) verlangt
dieselbe Pflichtbegründung, legt aber KEIN Artefakt an: der Text steht nur im
Feld `grund` der neuen Workflow-Version.
Fundstelle: `scripts/leitstand-server.mjs`, `POST /api/workflows/<id>/stoppen`
gegen den Freigabe-Endpunkt darüber.
Auswirkung: Die nächste eingereichte Fassung überschreibt `grund` — und
GESTOPPT ist ausdrücklich ersetzbar, das ist der vorgesehene Reparaturzug.
Danach ist nicht mehr feststellbar, DASS ein Mensch gestoppt hat, warum, und
welchen Plan er dabei vor Augen hatte. Die Versionshistorie des
Workflow-Artefakts enthält es zwar noch, aber nur, wer die alte Version
gezielt lädt, findet es; als Bezeugung ist das schwächer als bei jeder anderen
Menschenentscheidung im System (ARCHITECTURE.md §3).
Empfohlene Maßnahme: Entweder ein Artefakt `entscheidung-workflow-<id>-stopp`
nach dem Muster des Freigabe-Endpunkts anlegen (dann aber mit einer
Festlegung, wie mehrere Stopps desselben Workflows versioniert werden), oder
ausdrücklich entscheiden und in `features/F15/feature.md` festhalten, dass der
Stopp bewusst nur im Workflow-Artefakt steht. Beides ist eine Entscheidung des
Menschen, kein Bauauftrag-Nachtrag.
Status: erledigt in F15 WS-2c (b2, Auflage 2), 10.09.2026 — die Entscheidung
ist gefallen (Challenger, 10.09.2026): ein vom Menschen ausgelöster Stopp ist
dieselbe Klasse wie eine abgelehnte Freigabe und bekommt dieselbe Spur. Der
Stopp-Endpunkt registriert `entscheidung-workflow-<workflowId>-stopp`
(`erzeuger: 'mensch'`, `ergebnis: 'GESTOPPT'`, Pflichtbegründung, Zeitstempel,
`eingaben`-Verweis auf die gestoppte Workflow-Version), Aufrufform wortgleich
zum ABGELEHNT-Zweig. Die offene Frage zur Versionierung mehrerer Stopps
desselben Workflows beantwortet F2: stabile artefaktId, je Stopp eine neue
Version. D2 ist dabei eingehalten — alle sechs Prüfungen liegen vor dem ersten
Schreibvorgang; abweichend ist nur die Stellung des Artefakts GEGENÜBER DEM
FREIGABE-ENDPUNKT: es entsteht NACH dem Schreiben und NACH dem Abbruch, weil
der Stopp zuerst auf der Platte stehen muss (daran hängt F-216) und der
Abbruch nicht auf Artefakt-I/O warten darf. Scheitert das Schreiben, wird nicht zurückgerollt:
Startfehlereintrag, und die 200 trägt `bezeugt: false` mit Grund. Geprüft in
`check-f15-automat-real.mjs` (e) und `check-f15-workflow.mjs` (b2); rot
kalibriert durch Entfernen der Artefaktschreibung.
Feature/Run: F15 WS-2c (b2), 10.09.2026.

**F-239** · `BUG` · P1 · erledigt
Titel: Die Identitätsbedingung des Stopp-Abbruchs hat keinen Rot-Fall — sie
gilt damit als nicht gebaut.
Beschreibung: Der Stopp bricht einen aktiven Lauf nur ab, wenn er laut
Artefakt zu DIESEM Workflow gehört: `s.status === 'LAEUFT' && s.lauf_id !==
null && s.lauf_id === laufAktivLaufId`. Der Kommentar darüber trägt die
tragende Zusage des Endpunkts — ein bloßes `laufAktiv` würde auch einen Lauf
abbrechen, den jemand über `POST /api/laeufe` gestartet hat, oder den eines
ganz anderen Workflows. In ALLEN vorhandenen Gate-Fällen ist entweder kein
Lauf aktiv oder der aktive Lauf gehört zum gestoppten Workflow; beide Male
liefert `laufAktiv` allein dasselbe Ergebnis. Wer die Bedingung auf
`const laufAbgebrochen = laufAktiv` zurückbaut, bleibt in
`check-f15-workflow.mjs` UND in `check-f15-automat-real.mjs` grün und bricht
dabei fremde Arbeitsstränge ab.
Dieselbe Lücke, eine Ebene daneben: `STOPPBARE_WORKFLOW_STATUS` zählt vier
Zustände, die Gates üben zwei (`OFFEN`, `LAEUFT`). `WARTET_FREIGABE` und
`KLAERUNG_ERFORDERLICH` fielen aus der Menge, ohne dass etwas rot würde —
und `WARTET_FREIGABE` ist der governance-relevante: es ist der einzige
Zustand, in dem der Stopp die Ersetzungssperre legitim aushebelt („nicht
entscheiden, sondern anhalten").
Fundstelle: `scripts/leitstand-server.mjs`, Zugehörigkeitsprüfung im
Stopp-Endpunkt und `STOPPBARE_WORKFLOW_STATUS`; fehlende Fälle in beiden
F15-Gates.
Auswirkung: Kein Defekt heute — das Verhalten ist richtig. Aber
ARCHITECTURE.md §8 sagt: eine Grenze ohne Rot-Fall heißt nicht ERZWUNGEN.
Genau diese Regel hat AK7 für den Statusvergleich angewandt; hier ist sie
verletzt, und es trifft die Sicherheitszusage des Endpunkts.
Empfohlene Maßnahme: Ein Gate-Fall, klein und rot kalibrierbar: Workflow A
läuft (D13 belegt), Workflow B wird gestoppt → 200, `laufAbgebrochen: false`,
A läuft weiter und endet regulär; zweite Hälfte: ein Lauf aus
`POST /api/laeufe` ohne Workflow-Bezug wird von einem Stopp ebenfalls nicht
getroffen. Rot-Kalibrierung: Identitätsbedingung durch `laufAktiv` ersetzen.
Dazu zwei Zeilen im Vertragsblock für `WARTET_FREIGABE` und
`KLAERUNG_ERFORDERLICH`. Nächste Iteration, vor dem Merge nach main.
Status: erledigt in F15 WS-2c (b2, Nachtrag), 10.09.2026 — beides umgesetzt:
(1) Neuer Block (g) in `scripts/check-f15-automat-real.mjs`: Workflow A läuft
mit einem realen Kindprozess, Workflow B wird gestoppt → 200 mit
`laufAbgebrochen: false`, B ist gestoppt und bezeugt, A ist weder gestoppt
noch angehalten, sein Schritt läuft beim Stopp noch, und A läuft anschließend
real bis `ABGESCHLOSSEN` durch (mit terminaler ERFOLGREICH-Kette). Der Fall
braucht die reale Kette: dass ein fremder Kindprozess den Stopp überlebt, kann
eine Attrappe nicht belegen. Dafür ein drittes Skript-Fixture
(`VERZOEGERTER_ERFOLG_SKRIPT`, zwei Sekunden) — `HAENGE_SKRIPT` endet nie,
`ERFOLG_SKRIPT` ist beim Stopp längst fertig.
(2) Die vier Werte aus `STOPPBARE_WORKFLOW_STATUS` sind vollständig geübt:
`OFFEN` und `LAEUFT` standen bereits, `WARTET_FREIGABE` und
`KLAERUNG_ERFORDERLICH` sind als schnelle Fälle im Attrappen-Gate ergänzt.
Ohne eigene Rot-Kalibrierung, ausdrücklich: das ist Abdeckung derselben Zusage
über weitere Eingaben, keine neue Zusage.
Rot kalibriert: Zugehörigkeitsprüfung auf `laufAktiv` reduziert (samt der
Logzeile, die sie sonst über einen Feldzugriff mitträgt — siehe F-243) →
zwei Befunde in (g), der fremde Lauf wird abgebrochen und A endet
`FEHLGESCHLAGEN`. Datei-Hash vor und nach dem Rückbau identisch.
Feature/Run: F15 WS-2c (b2), 10.09.2026 (QA-Pass, Fehler 1 und 6).

**F-240** · `TECH_DEBT` · P2 · **gelöst**
Titel: Was eine Reparaturfassung nach einem Stopp wirklich braucht, steht
nirgends — und wann sie gefahrlos ist, auch nicht.
Beschreibung: Die Halte-Zustands-Tabelle nennt als Ausweg aus dem gestoppten
Workflow „neue Fassung derselben `workflow_id`". Der naheliegende Handgriff —
`GET /api/workflows/<id>`, Plan korrigieren, zurück-`POST`en — führt zu einem
Workflow, der sofort wieder gestoppt ist: `status: 'GESTOPPT'` wird
übernommen (die Sperrliste blockt nur `LAEUFT`/`WARTET_FREIGABE`/
`ABGESCHLOSSEN`), `grund` wird auf `null` normalisiert (der Workflow sagt dann
nicht mehr, warum er steht), `aktiver_schritt_id` muss von Hand gesetzt werden
(F-218), und ZUSÄTZLICH müssen die Schrittfelder des abgebrochenen Schritts
(`status`, `lauf_id`) zurückgesetzt werden, sonst hält Regel 3 ihn für nicht
startbereit. Das eigene Gate weiß das und tut es alles
(`check-f15-automat-real.mjs`, Block (e)); die Dokumentation sagt es nirgends.
Zweitens fehlt ein Signal, WANN die Reparatur gefahrlos ist: die 200 geht
sofort raus, der abgebrochene Lauf fliegt noch. Wird die neue Fassung vor der
Nachbereitung eingereicht, greift F-227 und verwirft den Ausgang des Laufs —
korrekt, aber die einzige Spur ist ein Eintrag in `GET /api/startfehler`, und
die neue Fassung zeigt dauerhaft den Schrittstand, den der Mensch beim
Kopieren erwischt hat.
Fundstelle: `features/F15/feature.md`, Tabellenzeile `GESTOPPT` (neu in
WS-2c (b2)) und der Abschnitt „Der Workflow-Stopp"; `scripts/leitstand-
server.mjs`, Normalisierung in `POST /api/workflows`.
Auswirkung: Ohne Oberfläche (AK8 offen) ist der Reparaturzug reine Handarbeit
an einem JSON, und der Stopp macht diesen Zustand vom Randfall zum Normalfall.
F-218 deckt Cursor und Status ab, ist aber auf `haltGrenze`/`ABGELEHNT`
geschrieben und kennt die Schrittfelder nicht.
Empfohlene Maßnahme: Die Ausweg-Spalte um das nennen, was die
Reparaturfassung wirklich braucht (Status, Cursor, Schrittfelder des
abgebrochenen Schritts), plus den Hinweis, auf die Nachbereitung zu warten
oder in die Startfehlerliste zu sehen. Gemeinsam mit F-218 und mit AK8/WS-3,
das den Handgriff ohnehin ersetzen soll.
Status: **gelöst** in F15 WS-3b, 10.09.2026. Der Handgriff ist ersetzt: der
Knopf „Reparaturfassung vorbereiten" (bei `GESTOPPT` und
`KLAERUNG_ERFORDERLICH`) lädt die aktuelle Fassung frisch von der Platte —
also nicht den womöglich überholten Anzeigestand — und wendet alle vier
Korrekturen an: `status` auf `OFFEN`, die Schrittfelder des abgebrochenen
oder gescheiterten Schritts (`status`/`lauf_id`) zurückgesetzt, der Cursor auf
den ersten Schritt ohne `lauf_id`, wenn er `null` war, und der Halt-`grund`
bleibt im Entwurf lesbar. Der Entwurf ist bearbeitbarer JSON-Text (kein
Formular — das wäre ein Plan-Editor), „Einreichen" schickt ihn an
POST /api/workflows. Real belegt in
`nachweis/f15-ws3b-oberflaechennachweis.md` (Fall 2: Stopp mitten im
laufenden Schritt -> Entwurf -> einreichen -> Kette läuft weiter, ohne
Handarbeit am JSON).
Zwei weitere Verluste, die dieser Befund selbst aufzählt, sind als WARNUNG
über dem Entwurf sichtbar (QA-Pass 10.09.2026): der Halt-`grund` wird beim
Einreichen auf `null` normalisiert, und eine bereits erreichte
`grenzen.max_schritte` hebt der Entwurf nicht an — ohne Hinweis wäre die
Fassung angenommen worden und hätte sofort wieder gestanden. Beide Ursachen
bleiben unverändert; sichtbar ist jetzt, was sie kosten.
OFFEN BLEIBT der zweite Teil des Befunds: ein Signal, WANN die Reparatur
gefahrlos ist. Der Entwurf wird zwar frisch geladen, aber wenn die
Nachbereitung des abgebrochenen Laufs erst danach eintrifft, greift
weiterhin F-227, und die einzige Spur ist ein Eintrag in
`GET /api/startfehler`. Dafür ist ein neues Finding aufgemacht (F-260).
Feature/Run: F15 WS-2c (b2), 10.09.2026 (QA-Pass, Fehler 2 und 3); erster Teil gelöst F15 WS-3b, 10.09.2026.

**F-243** · `TECH_DEBT` · P3 · **gelöst**
Titel: Eine Sicherheitsbedingung wird von einer Protokollzeile mitgetragen.
Beschreibung: Bei der Rot-Kalibrierung zu F-239 wurde die
Zugehörigkeitsprüfung des Stopp-Abbruchs auf `const laufAbgebrochen =
laufAktiv` reduziert. Ergebnis war NICHT der erwartete Gate-Befund, sondern
ein Prozesstod: die `console.error`-Zeile darunter liest
`laufenderSchritt.schritt_id`, und `laufenderSchritt` ist in diesem Fall
`undefined` — `TypeError` aus einem async-Handler, dessen Promise niemand
einsammelt. Dieselbe Fehlerklasse, die (b1) und (b2) an drei anderen Stellen
ausdrücklich abgefangen haben (Body-Form, `auftrag_id`, `schrittId`).
Der Rot-Fall wurde daraufhin als PLAUSIBLER Rückbau wiederholt (Bedingung und
Logzeile gemeinsam) und liefert die erwarteten zwei Befunde. Der Absturz
selbst ist aber ein realer Befund: er tritt heute nur unter einer Manipulation
auf, hängt aber an einem ungeprüften Feldzugriff, nicht an einer Zusicherung.
Fundstelle: `scripts/leitstand-server.mjs`, Protokollzeile im
`if (laufAbgebrochen)`-Zweig des Stopp-Endpunkts.
Auswirkung: Heute kein Defekt — `laufAbgebrochen` ist true nur, wenn
`laufenderSchritt` gefunden wurde. Aber die Invariante steht nirgends, und der
nächste Umbau der Bedingung reißt den Serverprozess statt eine Antwort zu
verfehlen. Nebenwirkung fürs Gate: eine Manipulation der Bedingung fällt als
Absturz auf, nicht als Befund — die Rot-Kalibrierung sagt dann weniger, als
sie soll.
Empfohlene Maßnahme: Den Feldzugriff im Protokolltext gegen `undefined`
absichern (`laufenderSchritt?.schritt_id ?? '—'`) oder den Text auf
`laufAktivLaufId` beschränken, die ohnehin gesetzt ist. Eine Zeile.
Status: gelöst — umgesetzt in der ersten Variante (`laufenderSchritt?.schritt_id
?? '—'`), `scripts/leitstand-server.mjs` Zeile 3402.
Besonderheit: Dieser Fix ist der ERSTE Codeeingriff dieses Repos, den die
Workforce selbst erzeugt hat, und nicht ein Mensch oder eine Sitzung am
Repo. Er entstand als Schritt 2 des Nachweislaufs L2 zu F15 AK10 (Workflow
`f15-ws4-l2`, Lauf `ef1efbd4-717e-41a8-8a00-df8e93471bfd`): geplant als
Workflow-Schritt mit `freigabe: ZWINGEND`, real angehalten, von Stefan über
den Leitstand freigegeben (Entscheidungsartefakt
`entscheidung-workflow-f15-ws4-l2-schritt-2-fix`, `erzeuger: mensch`), dann
von einem echten Kindprozess ausgeführt. Beleg:
`features/F15/nachweis-ak10.md`, Abschnitt L2.
NICHT mitgelöst, bewusst: dieselbe Fehlerklasse lebt an einer zweiten Stelle
weiter — `scripts/leitstand-server.mjs` Zeile 2873/2876 liest
`laufenderSchritt.schritt_id` ebenfalls unter einer Bedingung, die die Existenz
nur mittelbar garantiert (`workflowDaten.status === 'LAEUFT' &&
laufenderSchritt !== undefined`). Der Nachweislauf war auf GENAU EINE Zeile
verpflichtet, deshalb blieb sie stehen. F-243 gilt für den Stopp-Endpunkt als
gelöst, die Klasse ist es nicht (Reviewer-Pass F15 WS-4).
Feature/Run: F15 WS-2c (b2, Nachtrag), 10.09.2026 (Rot-Kalibrierung F-239);
gelöst F15 WS-4, 10.09.2026 (Nachweislauf L2).

**F-247** · `TECH_DEBT` · P2 · **gelöst**
Titel: `GET /api/workflows/<id>` validiert nicht — die Anzeige „Fassung
ungültig" hängt an einer Client-Formprüfung.
Beschreibung: Beim Bau von WS-3a stand im Auftrag, der Detailendpunkt
beantworte eine nicht mehr gegen `WORKFLOW_V0` validierende Fassung mit 409
(unter Verweis auf F-241). Das trifft nicht zu: F-241 beschreibt den
STOPP-Endpunkt, und der Detailendpunkt liefert den Datensatz unverändert mit
200, ohne `validiereWorkflowDaten` je aufzurufen. Der 409-Zweig in der
Ansicht ist deshalb gebaut, aber vom echten Server heute unerreichbar; was
real greift, ist die zweite, clientseitige Prüfung (`daten.schritte` ist kein
nicht-leeres Array).
Fundstelle: `scripts/leitstand-server.mjs`, `GET /api/workflows/<id>`;
`public/leitstand/app.js`, `ladeWorkflowDetail`.
Auswirkung: Eine Fassung, die eine der Querverweisregeln verletzt
(unbekannter `nachfolger`, Zyklus, Zusammenführung), aber eine formal
befüllte `schritte`-Liste trägt, wird als normale Schrittliste gezeigt — der
Mensch sieht einen Plan, den der Startendpunkt bereits mit 409 ablehnt, ohne
Hinweis darauf. Die Ansicht behauptet damit mehr Gültigkeit, als der Server
zusagt.
Empfohlene Maßnahme: Den Detailendpunkt `validiereWorkflowDaten` aufrufen
lassen und die Verstöße als eigenes Feld MITLIEFERN, statt den Datensatz
zurückzuhalten (Lesbarkeit einer kaputten Fassung ist genau das, was der
Mensch für die Reparatur braucht — die `bestandUngueltig`-Ausnahme in
`POST /api/workflows` folgt derselben Linie). Die Ansicht liest dann das
Feld. Serveränderung, also eigener Rot-Fall; bewusst NICHT in WS-3a gemacht,
dessen Auftrag genau eine Serveränderung zuließ.
Status: **gelöst** in F15 WS-3b, 10.09.2026. `GET /api/workflows/<id>` ruft
`validiereWorkflowDaten` auf und liefert die Verstöße als ADDITIVES Feld
`verstoesse` mit — weiterhin mit 200 und vollem Datensatz, ausdrücklich KEIN
409: eine ungültige Fassung anzusehen ist der erste Schritt ihrer Reparatur
(dieselbe Linie wie die `bestandUngueltig`-Ausnahme in POST /api/workflows).
Die Ansicht zeigt sie als benannten Block ÜBER der Schrittliste, nicht statt
ihrer. Der in WS-3a gebaute, vom echten Server unerreichbare 409-Zweig ist
damit auf den realen Weg umgestellt und nicht als Leiche stehen geblieben;
das Gate verlangt seither ausdrücklich, dass er nicht wiederkehrt.
Feature/Run: F15 WS-3a, 10.09.2026; gelöst F15 WS-3b, 10.09.2026.

**F-249** · `TECH_DEBT` · P3 · **gelöst**
Titel: Das Workflow-Detail pollt — anders als das Lauf-Detail, und mit einer
Zusatzanfrage je Tick.
Beschreibung: `ladeLaufDetail` ist bewusst NICHT Teil des 2-Sekunden-Polls
(F12 WS-3 AK2: „Detail nur auf Anforderung"). `ladeWorkflowDetail` ist es,
weil die Ansicht sonst ihren Zweck verfehlt — der wandernde Cursor ist genau
das, was man sehen will. Der Preis: je Tick eine Anfrage an
`GET /api/workflows/<id>` plus je `LAEUFT`-Schritt eine an
`GET /api/laeufe/<laufId>`, und das offene Panel wird alle zwei Sekunden
vollständig neu gerendert.
Fundstelle: `public/leitstand/app.js`, `pollWorkflows` /
`ladeWorkflowDetail`.
Auswirkung: Heute folgenlos — WS-3a hat kein einziges Eingabefeld, das ein
Neurendern zerstören könnte, und D13 begrenzt die Zusatzanfragen auf
höchstens eine. Ab WS-3b gilt beides nicht mehr: ein Reparaturentwurf in
einem Textfeld überlebt kein Neurendern.
Empfohlene Maßnahme: In WS-3b entscheiden — entweder den Poll auf die Liste
beschränken und das Detail wieder auf Anforderung laden, oder beim
Neurendern gezielt aussparen, was der Mensch gerade bearbeitet. Nicht
vorwegnehmen, solange kein Bedienelement existiert.
Status: **gelöst** in F15 WS-3b, 10.09.2026 — entschieden wurde die zweite
Variante, in drei Containern: `#workflow-detail-inhalt` (Schrittliste) wird
weiterhin bei jedem Tick ersetzt, weil genau dort der wandernde Cursor zu
sehen sein soll; `#workflow-bedienung` (mit den Pflichtbegründungen) nur bei
ECHTER Lageänderung, erkannt an einem Kennzeichen aus workflowId, status und
naechster; `#workflow-reparatur` (der Entwurf) gar nicht — den schließt allein
der Mensch. Eine angefangene Begründung überlebt damit den Poll; ändert sich
die Frage, zu der sie gehört, wird sie bewusst verworfen, statt zur nächsten
Entscheidung weitergereicht zu werden. Die Zusatzanfragen je Tick bleiben
unverändert (D13 begrenzt sie auf höchstens eine).
Feature/Run: F15 WS-3a, 10.09.2026; gelöst F15 WS-3b, 10.09.2026.

**F-252** · `BUG` · P2 · **gelöst**
Titel: Überholende Poll-Antworten desselben Workflows rendern älteren über
neueren Zustand.
Beschreibung: `pollWorkflows` startet alle zwei Sekunden ein neues
`ladeWorkflowDetail`, ohne zu prüfen, ob der vorige Lauf noch fliegt; der
langsamere hängt zusätzlich an `ermittleAktiveLaufIds`. Der Race-Schutz
verglich zunächst nur `gewaehlteWorkflowId !== workflowId` — bei zwei Ticks
für DENSELBEN Workflow ist der Vergleich für beide falsch, beide schreiben
`inhalt.innerHTML`. Landet Tick n nach Tick n+1, springt der Cursor zurück
und ein bereits `ERFOLGREICH`-Schritt zeigt wieder `LAEUFT`.
Fundstelle: `public/leitstand/app.js`, `ladeWorkflowDetail`/`pollWorkflows`.
Auswirkung: Die Ansicht zeigt kurzzeitig einen älteren Stand als den, den sie
schon hatte — genau bei einem Workflow, den man beim Wandern zusieht, also im
Normalbetrieb dieser Ansicht. Von Reviewer- und QA-Pass unabhängig
voneinander gefunden.
Maßnahme: Behoben im selben Commit. `ladeWorkflowDetail` zieht eine
fortlaufende Nummer (`workflowRenderZaehler`); `istUeberholt()` prüft
zusätzlich, ob inzwischen ein jüngerer Aufruf gestartet ist, und nur der
jüngste darf schreiben. Alle sechs Abbruchstellen der Funktion nutzen es.
Feature/Run: F15 WS-3a, 10.09.2026 (Reviewer-Pass Befund 4, QA-Pass Fehler 6).

**F-253** · `TECH_DEBT` · P3 · **gelöst**
Titel: Die Ansicht zeigt den Zustand nicht, in dem der Mensch gefragt ist,
solange er nicht persistiert wurde.
Beschreibung: Ein Workflow auf `OFFEN` oder `KLAERUNG_ERFORDERLICH`, dessen
fälliger Schritt `freigabe: ZWINGEND` trägt, wartet real auf eine
menschliche Freigabe — aber dieser Halt ist kein persistierter Status
(feature.md: „Freigabefrage OHNE persistierten Status", ein
`POST .../starten` antwortet 409 und schreibt nichts). Die Ansicht zeigt
deshalb `OFFEN`, keinen `grund`, und als einzigen Hinweis das Wort `ZWINGEND`
in einer von zehn Spalten. Verwandt: `EMPFOHLEN` wird als Wort gezeigt,
obwohl der Automat dort NICHT anhält — feature.md hat unter „Entschieden"
ausdrücklich festgehalten, der Unterschied sei „rein anzeigend und gehört
nach WS-3". Ebenso ist der Cursor-Schritt in der Tabelle nicht markiert, nur
im Kopf genannt; AK8 nennt „den aktiven Schritt" wörtlich.
Fundstelle: `public/leitstand/app.js`, `workflowKopfzeile` /
`workflowSchrittZeile`, gegen `features/F15/feature.md` AK8 und „Entschieden".
Auswirkung: Der Zustand, in dem der Mensch die einzige Entscheidungsinstanz
ist, ist der einzige ohne eigene Anzeige. AK8 ist damit auch LESEND noch
nicht erfüllt — was WS-3a nicht in Abrede stellt (AK8 bleibt OFFEN), aber es
ist keine reine Bedienungslücke, sondern eine Anzeigelücke.
Empfohlene Maßnahme: In WS-3b EINEN abgeleiteten Zustand je Workflow
einführen („wartet auf dich" / „läuft" / „steht — Grund" / „fertig"), der die
Freigabefrage ohne persistierten Status einschließt, den fälligen Schritt in
der Tabelle markiert und `EMPFOHLEN` als „hält nicht an" ausweist. Vor den
Bedienelementen bauen, nicht danach.
Status: **gelöst** in F15 WS-3b, 10.09.2026. Der Server liefert das Verdikt
von ermittleNaechstenSchritt als Projektion `naechster` in BEIDEN
Workflow-Projektionen mit (baueNaechsterProjektion, D5 — die Oberfläche
rechnet nichts selbst); die Ansicht rendert daraus eine LAGE je Workflow
(„wartet auf dich — Freigabe nötig" / „läuft" / „steht — …" /
„durchgelaufen"), in Liste UND Detail, markiert den fälligen und den
Cursor-Schritt in der Tabelle und weist `AUTOMATISCH`/`EMPFOHLEN` als „hält
nicht an" aus. Real belegt in `nachweis/f15-ws3b-oberflaechennachweis.md`
(Fall 1: ein Workflow, dessen ERSTER Schritt ZWINGEND trägt, wird als fällig
angezeigt, obwohl nichts gelaufen ist). Gate: je ein Fall für alle sechs
Ausgangsarten in beiden Projektionen.
Feature/Run: F15 WS-3a, 10.09.2026 (QA-Pass, Fehler 1 bis 3); gelöst F15 WS-3b, 10.09.2026.

**F-257** · `HARNESS_IMPROVEMENT` · P1 · gelöst
Titel: `npm run check` scheitert wiederholt an umgebungsbedingten Rennen,
und die Regel dagegen ist "einmal wiederholen".
Beschreibung: Innerhalb von zwei aufeinanderfolgenden Bauabschnitten ist
die Prüfkette an drei verschiedenen Stellen ohne Zutun des jeweiligen
Diffs rot geworden: ENOENT auf die Enkel-PID-Datei beim Beenden des
Prozessbaums (F14-Test, WS-2c (b3)), ENOENT im Gateway-Timeout-Test und
ENOTEMPTY beim Aufräumen im Execution-Controller (WS-3a). Alle drei
verschwanden bei unverändertem Diff im nächsten Durchgang; der rote Lauf
in (b3) dauerte 99 s gegen sonst 73-82 s, die Maschine war also spürbar
belastet. CLAUDE.md führt das als bekannte Falle mit der Regel "erst
wiederholen".
Fundstelle: CLAUDE.md, "Bekannte Fallen"; Laufprotokolle F15 WS-2c (b3)
und WS-3a.
Auswirkung: Die Regel "erst wiederholen" ist als Sofortmaßnahme richtig,
als Dauerzustand entwertet sie die Prüfkette. Wer einen roten Lauf sieht,
kann nicht mehr unterscheiden, ob er einen Befund oder Rauschen vor sich
hat — und die naheliegende Gewohnheit ist, im Zweifel zu wiederholen.
Genau daran ist F-211 (Gate ohne Rot-Nachweis) schon einmal gescheitert:
eine Prüfung, deren Rot nicht ernst genommen wird, prüft nichts.
Empfohlene Maßnahme: Eigene kleine Iteration, nicht nebenbei. Die drei
Stellen haben denselben Bau (Kindprozess oder Temp-Verzeichnis, dessen
Aufräumen mit dem Prozessende rennt): erst zusammentragen, ob eine
gemeinsame Aufräum-Hilfe mit Wiederholung und Timeout die Klasse
schließt, statt drei Einzelpflaster. Bis dahin: jedes Auftreten hier mit
Datum und Fehlercode nachtragen, damit die Häufigkeit sichtbar bleibt
statt in Chatverläufen zu verschwinden.
Auftreten (nach der empfohlenen Maßnahme fortgeschrieben):
- 10.09.2026, F15 WS-2c (b3): ENOENT auf die Enkel-PID-Datei beim Beenden
  des Prozessbaums; roter Lauf 99 s gegen sonst 73-82 s.
- 10.09.2026, F15 WS-3a: ENOENT im Gateway-Timeout-Test und ENOTEMPTY beim
  Aufräumen im Execution Controller.
- 11.09.2026 ~10:25 UTC, F16 WS-3a: ENOTEMPTY beim Aufräumen in
  src/execution-controller/execution-controller.test.ts:147 (rmSync in
  raeumeKette). Wiederholung bei UNVERÄNDERTEM Diff grün, 374/374. Viertes
  Auftreten, dieselbe Klasse (Temp-/Kontrollzustand-Verzeichnis, dessen
  Aufräumen mit dem Prozessende rennt) — die Häufigkeit stützt die
  empfohlene Maßnahme, eine gemeinsame Aufräum-Hilfe zu bauen, statt drei
  Einzelpflaster.
- 11.09.2026 ~10:51 UTC, F16 WS-3a: ENOENT auf die Enkel-PID-Datei
  (`f14-ws2-enkel-pid-<uuid>.txt`) in
  src/claude-code-gateway/claude-code-gateway.test.ts:733 — derselbe Fall
  wie das erste Auftreten vom 10.09. Wiederholung bei unverändertem Diff
  grün, 380/380, Exit 0. Fünftes Auftreten, zwei davon am selben Tag: die
  Klasse ist damit reproduzierbar häufig genug, dass "erst wiederholen" als
  Dauerzustand real gelebt wird — genau die Gewohnheit, vor der die
  Auswirkung oben warnt.
- 11.09.2026 ~11:40 UTC, F16 WS-3a: ENOTEMPTY beim Aufräumen in
  src/execution-controller/execution-controller.test.ts:153 (rmSync in
  raeumeKette), Testfall 'F11 AK2'. Wiederholung bei unverändertem Diff grün,
  383/383, Exit 0. SECHSTES Auftreten, drei davon an EINEM Tag und in EINEM
  Workstream. Damit ist 'erst wiederholen' in diesem Bauabschnitt nicht mehr
  die Ausnahme, sondern die Regel — die empfohlene Maßnahme (gemeinsame
  Aufräum-Hilfe mit Wiederholung und Timeout) ist fällig, bevor die nächste
  Prüfkette eine echte Regression hinter dem Rauschen versteckt.
- 11.09.2026 ~11:52 UTC, F16 WS-3a: erneut ENOENT auf die Enkel-PID-Datei in
  src/claude-code-gateway/claude-code-gateway.test.ts:733. Wiederholung bei
  unverändertem Diff grün, 383/383, Exit 0. SIEBTES Auftreten, vier davon an
  diesem Tag — abwechselnd die beiden bekannten Stellen, ohne dass ein Diff
  sie berührt hätte. Die Trefferquote lag in diesem Workstream bei etwa jedem
  zweiten Kettenlauf.
- 11.09.2026 ~12:05 UTC, F16 WS-3a: NEUE Ausprägung, dritte Stelle —
  src/codex-gateway/codex-gateway.test.ts:853 ('F-307 grün, real gemessen')
  meldete beendigungsart 'TIMEOUT' statt null, Laufzeit 13,2 s. Wiederholung
  bei unverändertem Diff grün, 383/383, Exit 0. Achtes Auftreten. Wichtig für
  die Diagnose: dieser Fall ist KEIN Aufräum-Rennen, sondern ein Prozess, der
  unter Last die eigene Zeitgrenze reißt — die Klasse ist also breiter als
  die in der empfohlenen Maßnahme vermutete 'gemeinsame Aufräum-Hilfe'. Wer
  sie angeht, braucht zusätzlich eine Antwort auf zeitgrenzenabhängige Tests
  mit echtem Prozessstart.
- 11.09.2026 ~12:20 UTC, F16 WS-3a: VIERTE Stelle —
  src/authorization-boundary/authorization-boundary.test.ts:75 (rmSync in
  raeumeKette), ENOTEMPTY. Wiederholung bei unverändertem Diff grün,
  383/383, Exit 0. Neuntes Auftreten, fünftes an diesem Tag. Dieselbe
  Aufräum-Klasse wie execution-controller.test.ts — und der Beleg, dass sie
  nicht an einer einzelnen Testdatei hängt, sondern an jedem raeumeKette
  im Repo.
Nachtrag 11.09.2026 (Hochstufung P2 → P1): Fünf der neun Auftreten fielen
auf EINEN Tag und EINEN Workstream (F16 WS-3a), die Trefferquote lag bei
etwa jedem zweiten Kettenlauf. Damit ist "erst wiederholen" nicht mehr die
Ausnahme, sondern der Normalfall — und die oben unter Auswirkung
beschriebene Gefahr ist nicht länger abstrakt, sondern eingetreten: ein
roter Lauf ist in diesem Repo derzeit nicht mehr von Rauschen zu
unterscheiden, ohne ihn ein zweites Mal zu fahren. Genau daran ist F-211
schon einmal gescheitert. Die Priorität folgt nicht der Schwere eines
einzelnen Auftretens, sondern der Häufigkeit: eine Prüfkette, deren Rot
man gewohnheitsmäßig wegwiederholt, schützt nichts mehr.
Teilbehebung: Das achte Auftreten (codex-gateway.test.ts:853) ist
ursächlich behoben — es war kein Aufräum-Rennen, sondern eine zu kurz
gewählte Testkonstante. STDIN_ZEITGRENZE_MS ist in
STDIN_ZEITGRENZE_ROT_MS (2000 ms, dort IST die Grenze der Prüfgegenstand)
und STDIN_ZEITGRENZE_GRUEN_MS (30000 ms, dort ist sie nur Notausgang)
getrennt; die grünen Fälle prüfen die reguläre Beendigung und liefen
vorher gegen den Node-Start unter Last. Ohne Laufzeitkosten: ein nicht
überlasteter Prozess endet sofort und erreicht die lange Grenze nie.
Die beiden anderen Stellen — ENOENT auf die Enkel-PID-Datei
(claude-code-gateway.test.ts:733) und ENOTEMPTY beim Aufräumen
(execution-controller.test.ts, raeumeKette) — sind UNVERÄNDERT OFFEN und
tragen die Hochstufung. Sie sind echte Aufräum-Rennen und brauchen die
oben empfohlene gemeinsame Hilfe.
Behebung 11.09.2026 (Aufräum-Klasse geschlossen): Die gemeinsame Hilfe
steht als `raeumeVerzeichnis(pfad)` in `scripts/_aufraeumen.ts` und räumt
mit `maxRetries: 10, retryDelay: 100` statt nackt. Alle 127 rekursiven
`rmSync`-Aufräumungen in Tests und Gate-Skripten (33 Dateien) sind darauf
umgestellt; Produktcode bewusst nicht, dort ist stilles Wiederholen kein
gewünschtes Verhalten. Die je Datei nachgebauten `raeumeKette`-Varianten
bleiben bestehen — sie räumen unterschiedliche Pfadmengen, ihre
Vereinheitlichung wäre eine zweite, unabhängige Änderung. Gehalten wird
der Zustand mechanisch, nicht durch Gewohnheit: Regel (R1) in
`scripts/check-rules.mjs` meldet jedes rekursive `rmSync` ohne
`maxRetries` in Prüfcode, mit Rot-Kalibrierung gegen drei konstruierte
Verstöße (ein- und mehrzeilig) und einer Grün-Gegenprobe. Die Regel wurde
zusätzlich gegen eine echte, zurückgebaute Datei rot kalibriert
(`src/auftrag/auftrag.test.ts`, Exit 1) und danach wieder grün.
In Kauf genommene Nebenwirkung, benannt statt verschwiegen: Das Aufräumen
war bisher ein unbeabsichtigter Detektor für verwaiste Kindprozesse —
ENOTEMPTY entsteht nicht nur durch Virenscanner, sondern auch durch einen
Kindprozess, den ein Test nicht sauber beendet hat, und genau das ist hier
ein realer Prüfgegenstand (F14 AK4, Prozessbaum-Kill). Jedes Leck, das
sich innerhalb der Wiederholungsspanne von selbst löst, wird jetzt
geräuschlos absorbiert. Der Tausch ist bewusst: Der Detektor war
unzuverlässig (er sprach ebenso auf den Virenscanner an) und hat in neun
Auftreten kein einziges Leck aufgedeckt, während er die Kette
unbrauchbar machte. Wer ein Leck sucht, prüft es dort, wo es
Prüfgegenstand ist — nicht am Aufräumen.
Zuordnung der Auftretensliste beim Schließen (damit nichts unbemerkt
mitgeschlossen wird): Auftreten 4, 6 und 9 sind die Aufräum-Klasse
(geschlossen). Auftreten 1, 5 und 7 sind der Enkel-PID-Renner (läuft als
F-325 weiter). Auftreten 8 ist die Zeitgrenze (ursächlich behoben, s. o.).
Die Auftreten 2 und 3 stammen aus EINEM Sammeleintrag vom 10.09.2026, der
zwei Symptome nennt ("ENOENT im Gateway-Timeout-Test und ENOTEMPTY beim
Aufräumen im Execution Controller"): Das ENOTEMPTY gehört zur
Aufräum-Klasse, das ENOENT im Gateway-Timeout-Test ist aus dem Eintrag
heraus NICHT eindeutig einem der beiden ENOENT-Stränge zuzuordnen — es
kann derselbe Enkel-PID-Fall gewesen sein (dann F-325) oder ein
zeitgrenzenabhängiger. Es wird hier ausdrücklich als unzugeordnet geführt
statt stillschweigend der geschlossenen Klasse zugeschlagen. Tritt es
wieder auf, entscheidet der dann sichtbare Fehlertext, wohin es gehört.
NICHT belegt ist, dass kein zehntes Auftreten kommt. `maxRetries`
verkürzt das Fenster, in dem ein fremd gehaltenes Handle die Kette rot
macht; es beseitigt die Ursache (Virenscanner, Dateiindizierung, eben
beendeter Kindprozess) nicht. Ein weiteres Aufräum-Auftreten ist HIER
wieder aufzunehmen und der Status zurückzusetzen — es ist kein neues
Finding.
Zur dritten Ausprägung: der zeitgrenzenabhängige Test mit echtem
Prozessstart (achtes Auftreten, `codex-gateway.test.ts`) ist bereits
durch die Trennung von STDIN_ZEITGRENZE_ROT_MS/GRUEN_MS in F16 WS-3a
(PR #132) ursächlich behoben, siehe Teilbehebung oben.
ABWEICHUNG vom Schließungsauftrag, ausdrücklich vermerkt statt
stillschweigend mitgeschlossen: Das ENOENT auf die Enkel-PID-Datei
(Auftreten 1, 5 und 7, `claude-code-gateway.test.ts`) ist WEDER ein
Aufräum-Rennen NOCH von der STDIN-Zeitgrenzen-Trennung berührt. Es ist
ein Lesen (`readFileSync`) einer Datei, die ein Enkelprozess unter Last
noch nicht geschrieben hat, bei `zeitgrenzeMs: 500`. Die gemeinsame Hilfe
kann daran nichts ändern. Damit dieser Strang beim Schließen von F-257
nicht verschwindet, ist er als F-325 eigenständig aufgenommen.
Status: gelöst (Aufräum-Klasse; der Enkel-PID-Strang läuft als F-325 weiter).
Feature/Run: F15 WS-3a, 10.09.2026 (Challenger, zweites Auftreten);
viertes bis neuntes Auftreten F16 WS-3a, 11.09.2026; dort auf P1
hochgestuft und das achte Auftreten ursächlich behoben; Aufräum-Klasse
geschlossen 11.09.2026 (F-257-Aufräum-Iteration).

**F-265** · `TECH_DEBT` · P4 · **gelöst**
Titel: Die Ablehnungsgründe der Workflow-Endpunkte sagen uneinheitlich, ob
die Entscheidung festgehalten wurde.
Beschreibung: Im selben Bedienfeld trafen drei Klassen aufeinander: Zweige,
die ausdrücklich "Die Entscheidung wurde NICHT festgehalten" sagen (D13 am
Freigabe-Endpunkt, zweiter Stopp); Zweige, die ausdrücklich das Gegenteil
sagen (die beiden 409 nach bereits erteilter Freigabe); und stumme Zweige
(Stale-`schrittId`, "keine offene Freigabefrage", sämtliche 400, alle
Vorprüfungen des Stopp-Endpunkts). Alle stummen Zweige liegen VOR jedem
Schreibvorgang, es ist also nie etwas verlorengegangen — aber wenn die
Nachbarmeldung es ausspricht, liest sich das Schweigen als "vielleicht doch".
Fundstelle: `scripts/leitstand-server.mjs`, POST /api/workflows/<id>/freigabe
und /stoppen.
Auswirkung: Rein sprachlich, aber an der empfindlichsten Stelle — der Mensch
muss wissen, ob er seine Entscheidung wiederholen muss.
Maßnahme: Neue Konstante `ENTSCHEIDUNG_NICHT_FESTGEHALTEN_SATZ` (`. Die
Entscheidung wurde NICHT festgehalten.`), an jeden bis dahin stummen Zweig
VOR dem ersten Schreibvorgang beider Endpunkte angehängt (workflowId-Form,
Body-JSON, Workflow nicht gefunden/WORKFLOW_V0-Verstoß, Body-Form,
schrittId-Form/-Zeichen, "keine offene Freigabefrage", Stale-`schrittId`,
`entscheidung`-/`begruendung`-Form am Freigabe-Endpunkt, Body-Form/
`begruendung`-Form/Nicht-stoppbar-Status am Stopp-Endpunkt). Die bereits
sprechenden Zweige (D13, die beiden 409 NACH bereits erteilter Freigabe)
blieben bewusst unverändert. Real verifiziert als Nebenprodukt des F23-WS-3-
Realtests, 15.09.2026: die uncommittete Änderung entstand als echter
Bau-Output des Ausführungsschritts von Auftrag `d45f7901-...` (kein
Gate-Fixture) — Diff gegengeprüft, `npm run check` grün (483/483 Tests).
Status: gelöst.
Feature/Run: F15 WS-3b, 10.09.2026 (QA-Pass, Befund); F23 WS-3, Realtest
15.09.2026 (behoben, verifiziert).

**F-296** · `TECH_DEBT` · P2 · gelöst
Titel: Ob die ERROR-Tracing-Zeilen in `stdout` oder `stderr` stehen, ist im
Spike widersprüchlich protokolliert.
Beschreibung: Das Protokoll zitiert die Zeilen im Block „Vollständige `stdout`
(JSONL, `lauf1-stdout.jsonl`)" und sagt an anderer Stelle, die Verweigerung
„erscheint als Stderr-Zeile des Routers". Beides kann nicht stimmen.
Fundstelle: `state/tp-m3-01-codex.md`, Lauf 1 und Lauf 2.
Auswirkung: AK3-Fixtures könnten ein Verhalten festschreiben, das es nicht
gibt.
Empfohlene Maßnahme: S-M3-01b Messpunkt (l) leitet `stdout` und `stderr`
getrennt um; bis dahin führt AK3 die Zeilen als eigenen Fixture-Fall.
Status: gelöst durch F-301 (S-M3-01b, Messpunkt (l)): die Zeilen stehen auf
stderr, stdout ist reines JSONL.
Feature/Run: F16-Gegenprüfung, 11.09.2026.

**F-311** · `TECH_DEBT` · P1 · gelöst
Titel: Ein für die vorliegende ChatGPT-Anmeldung nicht freigeschalteter
Modellname lässt einen Codex-Lauf scheitern, BEVOR ein einziger Befehl
läuft — und sieht dabei wie ein bestandener Rot-Fall aus.
Beschreibung: Der erste reale AK9-Lauf verwendete den fest eingetragenen
Namen `gpt-5-codex`. Ergebnis: Exit-Code 1, `{"type":"error", …}` mit
HTTP 400 `The 'gpt-5-codex' model is not supported when using Codex with a
ChatGPT account.`, `turn.failed`. Dateizustand unverändert, `beweis.txt`
nicht entstanden — äußerlich exakt das Bild eines bestandenen
Schreib-Rot-Falls. Nur die Kalibrierungsprüfung (`command_execution` mit
`exit_code: 0` als Pflichtbeleg) hat den Lauf als NICHT KALIBRIERT
abgewiesen. Dies ist ein dritter, in F-299/F-273 noch nicht erfasster Weg
in denselben Fehlermodus: derselbe Ausgang, andere Ursache.
Fundstelle: `features/F16/nachweis-rotfall.md`, Lauf 1;
`scripts/verify-f16-codex-rotfall.mjs` (`ermittleModell`).
Auswirkung: Ohne strukturierte Kalibrierung wäre ein Lauf, der die
Modell-API nie erreicht hat, als Sandbox-Nachweis durchgegangen.
Empfohlene Maßnahme: Modellnamen für Codex-Läufe nie fest eintragen,
sondern aus `~/.codex/models_cache.json` beziehen (so umgesetzt,
überschreibbar über `F16_ROTFALL_MODELL`). Jeder künftige Codex-Nachweis
belegt seine Kalibrierung an einem Ereignis, nicht an einem Modelltext.
Status: gelöst (Modellwahl umgestellt; der Befund bleibt als Muster
stehen).
Feature/Run: F16 WS-2 (AK9), 11.09.2026.

**F-315** · `PROCESS_IMPROVEMENT` · P3 · gelöst
Titel: Ein Grep-Gate über einen nackten Modulnamen bestraft die Begründung,
warum dieser Modul NICHT benutzt wird.
Beschreibung: Gate (a) in `scripts/check-f16-codex-gateway.mjs` prüfte auf
`/node:child_process/` über die gesamte Datei. Sobald der Kopfkommentar von
`src/codex-gateway/index.ts` festhielt, dass `node:child_process`
ausdrücklich NICHT importiert wird, schlug das Gate auf genau dieser
Begründung an — der bequemste Weg zu einem grünen Gate wäre gewesen, die
Begründung zu löschen. Das Muster prüft jetzt den Import (`from`/`require`)
und hat eine Grün-Gegenprobe gegen die bloße Kommentarerwähnung.
Fundstelle: `scripts/check-f16-codex-gateway.mjs`, Abschnitt (a).
Auswirkung: Gering für den Lauf, relevant als Muster: ein Gate, das
Dokumentation statt Code prüft, erzeugt Druck, Dokumentation zu entfernen.
Empfohlene Maßnahme: Grep-Gates gegen Codestrukturen richten (Import,
Aufruf), nicht gegen Wörter; jedem neuen Grep-Gate eine Grün-Gegenprobe
gegen eine unverdächtige Erwähnung beistellen.
Status: gelöst (Muster verschärft und rot/grün kalibriert).
Feature/Run: F16 WS-2, 11.09.2026.

**F-319** · `PROCESS_IMPROVEMENT` · P2 · gelöst
Titel: Ein Nachweis-Skript, das seine eigenen Schreibspuren in den
Messbereich legt, misst sich selbst.
Beschreibung: `verify-f16-codex-rotfall.mjs` rief in seiner ersten Fassung
`starteCodexGateway`/`klassifiziereLauf` ohne eigene Basisverzeichnisse auf.
Beide Standardpfade sind cwd-relativ, und das Skript wechselt per
`process.chdir` in das gemessene Wegwerf-Repo — `kontrollzustand/` und
`kontrollzustand-roh/` entstanden also mitten im Messbereich. Unbemerkt
blieb das nur, weil der Zustandsvergleich flach war und Verzeichnisse
ignorierte. Die naheliegende Härtung (Rekursion) hätte sofort ein falsches
`ESCALATE` erzeugt und zur bequemen Gegenmaßnahme eingeladen: die eigenen
Spuren wegfiltern.
Fundstelle: `scripts/verify-f16-codex-rotfall.mjs`
(`BASIS_KONTROLLZUSTAND`/`BASIS_ROHSTROM`, `zustand()`).
Auswirkung: Der Zustandsvergleich belegte weniger, als AK9 zusichert
(„byteweise gleich").
Empfohlene Maßnahme: Als Muster festhalten — ein Nachweisskript legt seine
Artefakte außerhalb des gemessenen Bereichs ab, statt sie aus der Messung
herauszufiltern. Ein Filter auf eigene Schreibspuren ist ein Warnzeichen,
kein Detail.
Status: gelöst (beide Basisverzeichnisse liegen außerhalb, Vergleich ist
rekursiv, Lauf 3 real grün).
Feature/Run: F16 WS-2 (AK9), 11.09.2026, Reviewer-/QA-Pass.

**F-322** · `TECH_DEBT` · P3 · **gelöst**
Titel: Kopfkommentar zu `unparsbareZeilen` beschreibt den Zähler enger als
sein Verhalten.
Beschreibung: Der Kommentar in `src/codex-gateway/types.ts` nannte
`unparsbareZeilen` „Zeilen, die kein gültiges JSON sind".
`leseCodexEreignisse` zählt zusätzlich syntaktisch GÜLTIGE JSON-Skalare und
-Arrays mit — bewusst, damit `ereignisse` ausschließlich Objekte trägt und
kein Aufrufer auf einer Zahl `.type` liest. Das Verhalten ist richtig, der
Kommentar beschrieb es falsch.
Fundstelle: `src/codex-gateway/types.ts` (Kopfkommentar zu
`CodexEreignisse`); `src/codex-gateway/index.ts`, Zweig unmittelbar nach
dem `JSON.parse`; `state/tp-m3-02-codex-output-schema.md`,
Findings-Vorschlag 4.
Auswirkung: gering, aber irreführend — ein Leser hätte den Zähler beim
Auswerten als reinen Syntaxzähler gelesen.
Empfohlene Maßnahme: Kommentar präzisieren, kein Verhalten ändern, kein
Test ändern.
Status: gelöst (Kommentar präzisiert; Verhalten und Tests unverändert).
Feature/Run: S-M3-02 (Codex `--output-schema`), 11.09.2026.

**F-323** · `TECH_DEBT` · P2 · **gelöst**
Titel: Der geplante Werkzeugsatz eines `codex`-Schritts wird aufgelöst, aber
von nichts durchgesetzt.
Beschreibung: `loeseAusfuehrungsEingabenAuf` löst den benannten Werkzeugsatz
auf und legt `modus`/`erlaubte_werkzeuge` in `aufrufEingaben.werkzeugsatz`.
Der Claude-Code-Zweig reicht das über `baueAufruf` ins Argv weiter; der
Codex-Zweig liest aus `aufrufEingaben` ausschließlich `modell`
(`src/execution-controller/index.ts`, Codex-Zweig der Worker-Weiche).
`baueCodexAufruf` kennt kein Werkzeugsatz-Feld — `codex exec` hat keinen
entsprechenden Schalter, und die Argv-Allowlist (AK2) ließe einen
nachträglich erfundenen ohnehin nicht durch. Ein Schritt, der einen
BESTIMMTEN lesenden Werkzeugsatz plant (etwa nur `Read` ohne `Grep`),
bekommt für Codex also keinerlei Durchsetzung.
Fundstelle: `scripts/leitstand-server.mjs`, `loeseAusfuehrungsEingabenAuf`
(Zusammenbau von `aufrufEingaben.werkzeugsatz`);
`src/execution-controller/index.ts`, Codex-Zweig; `src/codex-gateway/index.ts`,
`baueCodexAufruf`.
Auswirkung: gering für die Sicherheitszusage, hoch für die Lesbarkeit des
Plans. Die strukturelle Grenze trägt `--sandbox read-only` (E-M3-2, AK9 real
belegt), und die Ablehnung „codex + nicht-lesender Werkzeugsatz" hält den
gefährlichen Fall vorher an. Es bleibt aber genau die Klasse, gegen die
Regel 4b in `src/workflow/index.ts` gebaut wurde — eine Planangabe, die kein
Aufrufbauer einlöst —, nur ohne Halt: der Mensch liest im Workflow einen
Werkzeugsatz, der für diesen Schritt nichts bedeutet. Sichtbar wird das
zuerst bei AK12, dem realen zweistufigen Workflow.
Empfohlene Maßnahme: Nicht im laufenden Workstream lösen — die Entscheidung
gehört zum Rollenvertrag (F-184/F17), wo Rolle, Worker und Werkzeugsatz
ohnehin zusammen entschieden werden. Drei Wege stehen offen: (a) der
Werkzeugsatz wird für `codex` auf `DEKLARIERT` heruntergestuft und im
Leitstand als solcher angezeigt; (b) WORKFLOW_V0 erlaubt für `codex`
überhaupt keinen Werkzeugsatz-Namen und der Dispatcher hält sonst an
(Regel-4b-Muster, konsequent, aber eine Schemaänderung); (c) es bleibt, wie
es ist, und der Kopfkommentar der Weiche benennt es — der billigste Weg und
zugleich der, der die Frage offen lässt. Vor AK12 entscheiden.
Status: gelöst nach Weg (a) — der Werkzeugsatz eines `codex`-Schritts bleibt
Plandatum mit Durchsetzungsgrad `DEKLARIERT`, die Leitstand-Projektion
kennzeichnet ihn als solchen (`werkzeugsatzDurchsetzung`, F17 Entschieden
11.09.2026). Querverweis auf den F17-WS-2-Nachtrag
(`features/F17/feature.md`, Abschnitt „Entschieden"): die reale Ablehnung
„codex + nicht-lesender Werkzeugsatz" (F16 AK10) ist für jede der vier
`ROLLENVERTRAEGE`-Rollen inzwischen unerreichbar, weil die neue
Rollenvertrag-Ablehnung zuerst greift — dieselbe Anfrage bleibt abgelehnt,
kein Sicherheitsverlust, aber AK10 ist ab WS-2 Tiefenverteidigung statt
eines über eine reale Rolle kalibrierbaren Rotfalls.
Feature/Run: F16 WS-3a, 11.09.2026 (Reviewer-Pass, Befund 4). Gelöst: F17
WS-2/WS-3, 11.09.2026.

**F-328** · `PROCESS_IMPROVEMENT` · P3 · behoben
Titel: Challenger-Briefing zitierte F-308 fälschlich gegen
`features/F16/nachweis-rotfall.md` Lauf 3 statt gegen Lauf A in
`state/tp-m3-02-codex-output-schema.md`.
Beschreibung: Das Briefing zum AK12-Nachweis führte Lauf 3 des Rot-Falls als
Vorinstanz des F-308-Musters („nur die letzte `agent_message` ist
schemakonform"). Lauf 3 lief jedoch ausdrücklich OHNE `--output-schema`
(`features/F16/nachweis-rotfall.md`: „`turn.completed`, Exit 0, kein
`--output-schema`") und verzeichnet keine frühere
Freitext-`agent_message`. F-308 ist definitorisch an das Flag gebunden, ein
Lauf ohne das Flag kann keine Instanz sein. Nebeneffekt: der Zähler stimmte
nicht — mit Rotfall Lauf 3 als Vorinstanz wäre der AK12-Lauf die dritte, nicht
die zweite reale Instanz.
Fundstelle: Teil-C-Prompt der Challenger-Sitzung zu
`features/F16/nachweis-ak12.md`; korrigierte Fassung dort im Abschnitt C.
Auswirkung: Keine. Im Reviewer-Pass mit frischem Kontext gefunden und vor dem
Commit korrigiert; die einzige belastbare Vorinstanz (Lauf A, so auch im
Beleg-Nachtrag zu F-308) steht jetzt im Nachweis.
Empfohlene Maßnahme: Zitate aus Spike- und Nachweisdokumenten an der Quelle
prüfen, nicht aus dem Briefing übernehmen — auch dann, wenn das Briefing
selbst die Belegstelle mitliefert.
Status: behoben.
Feature/Run: F16 WS-3b AK12, 11.09.2026.

**F-330** · `PROCESS_IMPROVEMENT` · P3 · **gelöst**
Titel: `docs/STATUS.md` listet F13/F14 noch als „in Arbeit" und kennt F15
und F16 nicht.
Beschreibung: `CLAUDE.md` führt `docs/STATUS.md` als Quelle für den
aktuellen Phasen- und Scope-Stand. Die Datei nennt F14 „in Arbeit" und die
Reihenfolge „F11 → F12 → F13 → F14 → Dogfooding"; F15 (abgeschlossen) und
F16 (mit diesem Commit abgeschlossen) kommen nicht vor. Die Drift bestand vor
diesem Branch und wächst mit jedem abgeschlossenen Feature.
Fundstelle: `docs/STATUS.md`.
Auswirkung: Reine Doku-Drift, keine Wirkung auf Code oder Gates. Ein frischer
Kontext, der `CLAUDE.md` folgt und `docs/STATUS.md` liest, bekommt einen
veralteten Scope-Stand genannt.
Empfohlene Maßnahme: Bei F17-Start einmalig nachziehen, nicht als
Einzelauftrag — die Datei ist erst dann wieder aussagekräftig, wenn der
nächste Stand feststeht.
Status: **gelöst**. Nachgezogen im Branch
`chore/nachzug-f16-status-findings`: „Aktuelle Phase" nennt Meilenstein 1
und 2 als abgeschlossen und Meilenstein 3 als laufend, F13–F16 haben je
einen Absatz unter „Erledigt", der Meilenstein-2-Abschnitt steht auf
abgeschlossen, und ein Abschnitt „Meilenstein 3" hält F15/F16 als
erledigt, F17 als geplant ohne Feature-Akte sowie den Stand der drei
Sätze der §13.4-Bestehensbedingung fest.
Feature/Run: F16 WS-3b AK12, 11.09.2026; behoben im Statusnachzug nach
F16, 11.09.2026.

**F-331** · `HARNESS_IMPROVEMENT` · P2 · **gelöst**
Titel: `state/freigabe-commit.md` fehlt in `.gitignore`, obwohl der Guard
sie als Einmal-Schlüssel behandelt.
Beschreibung: `.claude/hooks/commit-guard.cjs` verlangt die Datei vor jedem
`git commit`/`push` (Aufgabe 3, Frischefenster 10 Minuten) und verweigert
jeden Bash-Zugriff auf sie (Aufgabe 4); `guard-settings.js` schützt sie
zusätzlich gegen Edit/Write. Sie ist damit als verbrauchbarer Schlüssel
entworfen, der nach Gebrauch verschwindet — steht aber in keiner
Ignore-Regel. Der Abschnitt „Persönliche Freigaben" in `.gitignore` deckt
bisher nur `.claude/settings.local.json`, obwohl er genau diese Klasse
meint.
Fundstelle: `.gitignore`, Abschnitt „Persönliche Freigaben" (Zeile 16–18)
gegenüber `.claude/hooks/commit-guard.cjs:67` (`FREIGABE_DATEI`).
Auswirkung: Kein Sicherheitsleck — der Inhalt ist ein Zeitstempel. Aber ein
Widerspruch zum Einmalgebrauchs-Design: ein `git add -A` im Fenster zwischen
dem Anlegen der Datei und ihrem Verbrauch durch den Guard zöge sie
versehentlich ins Repo. Real beobachtet: bei der Commit-Vorbereitung zu F16
WS-3b Teil C erschien sie als untracked-und-nicht-ignoriert im `git status`.
Empfohlene Maßnahme: Zeile `state/freigabe-commit.md` im Abschnitt
„Persönliche Freigaben" ergänzen.
Status: **gelöst**. Gelöst durch die `.gitignore`-Zeile
`state/freigabe-commit.md` im Abschnitt „Persönliche Freigaben",
eingebracht mit PR #136. Wirksamkeit real belegt, nicht nur behauptet:
`git status --ignored` zeigt die real vorliegende Freigabedatei als
`!!` und nicht mehr als untracked im normalen `git status`.
Feature/Run: F16 WS-3b Teil C (Commit-Vorbereitung), 11.09.2026;
behoben PR #136, 11.09.2026.

**F-339** · `PROCESS_IMPROVEMENT` · P3 · gelöst
Titel: F18 WS-2 wurde auf dem bereits gemergten WS-1-Branch weitergebaut
statt auf neuem Branch von main.
Beschreibung: feat/f18-ws1-router-rollenvertrag war nach Merge von PR #142
bereits in main; WS-2 lief auf demselben lokalen Branch weiter, was beim
Push eine reale Squash-Merge-Divergenz auslöste (F-056-Muster) — vom
bestehenden pre-push-Hook real abgefangen, kein Datenverlust, aber ein
manueller Reflog-Recovery-Umweg war nötig.
Fundstelle: git-Historie feat/f18-ws1-router-rollenvertrag, F18-WS-2-
Verifikationsrunde, 11.09.2026.
Auswirkung: Keine reale Beschädigung, aber unnötiger manueller Aufwand.
Maßnahme: Künftige Workstreams explizit auf neuem Branch von aktuellem
main beauftragen — für F18 WS-3 bereits so gemacht und real korrekt
befolgt (Branch feat/f18-ws3-router-eval-gate, von origin/main abgezweigt).
Status: gelöst.
Feature/Run: F18 WS-2/WS-3.

**F-340** · `PROCESS_IMPROVEMENT` · P1 · gelöst
Titel: `zielfassung.md` §13.4 nennt F19 nicht.
Beschreibung: Die Übergabe claude/179 führte F19 als letztes Feature von
Meilenstein 3. `docs/projekt/zielfassung.md` §13.4 nennt F19 aber nicht,
und die M3-Bestehensbedingung war mit F18 WS-3 bereits vollständig
erfüllt. Entschieden (Stefan, 11.09.2026): M3 bleibt abgeschlossen, F19
ist ein eigenständiges Bridge-Feature zwischen M3 und M4; danach folgt die
M4-Challenge gegen den dann realen Repo-Stand.
Fundstelle: `docs/projekt/zielfassung.md` §13.4.
Auswirkung: Feature ohne verbindliche Sollquelle; Wiederholung der
Fehleinschätzung, vor der claude/179 selbst warnt.
Maßnahme: §13.4 um den M3-Abschluss und die F19-Verortung ergänzen,
zusammen mit dem dort ohnehin offenen Nachzug von Satz 2 und Satz 3.
Status: gelöst — Nachtrag in `docs/projekt/zielfassung.md` §13.4 (v1.20,
12.09.2026): M3-Abschluss mit Satz 2/3 nachgezogen, F19 als Bridge-Feature
verortet; `docs/STATUS.md` im selben PR nachgezogen.
Feature/Run: F19-Challenge, 11.09.2026.

**F-342** · `HARNESS_IMPROVEMENT` · P2 · gelöst
Titel: Gefahr einer dritten Bestandsliste neben `tooling.md` und
Werkzeug-Katalog.
Beschreibung: `state/tooling.md` (Dev-Werkzeuge des Bauprozesses) und
`docs/harness/werkzeug-katalog.md` (Bewertung, Vetting-Status, Prüfdatum)
sind prosaische Bestandslisten mit eigenem Lebenszyklus. Ohne
ausdrückliche Abgrenzung wäre `ressourcen.json` in kurzer Zeit als dritte
Liste gepflegt worden.
Fundstelle: `state/tooling.md`, `docs/harness/werkzeug-katalog.md`,
`ressourcen.json`.
Auswirkung: doppelte Pflege und widersprüchliche Bestandsangaben.
Maßnahme: erledigt in F19 WS-1 — je ein Abgrenzungssatz in beiden Dateien
plus `description` im Kopf von `schemas/ressourcen.schema.json`.
Status: gelöst.
Feature/Run: F19-Challenge, 11.09.2026.

**F-347** · `PROCESS_IMPROVEMENT` · P1 · gelöst
Titel: `docs/STATUS.md` nach dem F19-Merge veraltet.
Beschreibung: Nach dem Merge von PR #146 führte `docs/STATUS.md` F19 weiter
als „WS-2 offen" (`IN_ARBEIT`), die Phase als „in Meilenstein 3" und den
Nachzug von Satz 2/3 nach §13.4 als ausstehend. Die Datei nennt sich
„Einzige Quelle für Phasenstand und Scope"; kein Gate prüft sie inhaltlich
(`scripts/check-docs.mjs` Prüfung 1 klammert sie bewusst aus,
`docs/projekt/zielfassung.md` liegt außerhalb aller fünf Prüfungen) —
Drift fällt nur beim Lesen auf. §11 „Nicht bauen: eigener
Doku-Konsistenzprüfer" bleibt gültig.
Fundstelle: `docs/STATUS.md`, Abschnitte „Aktuelle Phase" und
„Meilenstein 3".
Auswirkung: die M4-Challenge hätte auf einem falschen Phasenstand
aufgesetzt — die Fehleinschätzung, vor der claude/179 und claude/181
warnen.
Maßnahme: erledigt in diesem PR (Branch `docs/f19-abschluss-nachtrag`).
Prozessregel: der Bauauftrag, der den letzten Workstream eines Features
merged, trägt den STATUS.md-Nachzug im selben PR.
Status: gelöst.
Feature/Run: F19-Abschluss, 12.09.2026.

**F-350** · `TECH_DEBT` · P1 · gelöst
Titel: Entscheidungsartefakt (`entscheidung_schema: v0`) ohne JSON-Schema
und Validator.
Beschreibung: Das Format `{entscheidung_schema:'v0', ergebnis, begruendung,
entschieden_am}` existiert nur inline an den Schreibstellen in
`scripts/leitstand-server.mjs`; es gibt kein
`schemas/kontrollzustand-entscheidung-payload.schema.json` und keine
`validiere*`-Funktion — als einziges `*_V0`-Format.
Fundstelle: `scripts/leitstand-server.mjs` (`entscheidung_schema`), `schemas/`.
Auswirkung: das Bindeglied Mensch↔Lauf ist nicht validierbar; M4-F23
(Abnahme `ANGENOMMEN|ANPASSUNG|ABGELEHNT`, Prioritäts-Override) setzt darauf
auf.
Maßnahme: `schemas/kontrollzustand-entscheidung-payload.schema.json` +
`src/entscheidung/` (`validiereEntscheidungsDaten`, handgeschrieben, D5)
gebaut, alle fünf Schreibstellen in `scripts/leitstand-server.mjs` rufen den
Validator vor der Registrierung auf. Bestehende Artefakte ohne `art`-Feld
bleiben lesbar über `leiteArtAusHerkunftAb` (E-M4-6), keine Migration nötig.
Status: gelöst.
Feature/Run: M4-Challenge, 12.09.2026 → F23 WS-1a, 14.09.2026.

**F-351** · `TECH_DEBT` · P1 · gelöst
Titel: Review→Execution-Handoff transportiert kein Urteil; keine
Post-Build-Prüfstufe.
Beschreibung: In `workflow-vorlagen/standard.json` und `hoch.json` läuft
`code-reviewer` vor `ausfuehrung` als Lesepruefung des Auftragsartefakts;
kein Template hat einen Schritt nach `ausfuehrung`. `schritte[].eingaben`
kann die Ausgabe eines Vorschritts nicht referenzieren; ein `urteil:
BLOCKIERT` hat keine maschinelle Wirkung — der Automat startet den
Folgeschritt allein aufgrund `ERFOLGREICH`.
Fundstelle: `workflow-vorlagen/*.json`,
`schemas/kontrollzustand-workflow-payload.schema.json` (`eingaben`),
`src/workflow/index.ts` (`ermittleNaechstenSchritt`).
Auswirkung: „Ausführung → Review → QA → schließen" (M4 Click-to-Work) ist
mit den heutigen Vorlagen nicht ausführbar.
Maßnahme: `workflow-vorlagen/standard.json`/`hoch.json` tragen jetzt einen
Post-Build-Review-Schritt (`code-reviewer`, `output_schema:
'ergebnis-code-reviewer'`, `nachfolger: null`) statt eines Pre-Build-Reviews;
`SchrittErgebnis` (`src/workflow/types.ts`) trägt optional `urteil`;
`ermittleNaechstenSchritt` (Regel 1b) hält bei `urteil` ∉
{BEREIT, BEREIT_NACH_KORREKTUR} an (haltKlaerung), statt allein auf
`ERFOLGREICH` zu schauen. Real verdrahtet über
`scripts/leitstand-server.mjs`s neue `leseUrteilAusLaufakte` (liest das Urteil
worker-abhängig aus dem Rohstrom, Muster `verarbeiteRouterErgebnis`) — real
belegt in `scripts/check-f15-automat-real.mjs` Block (h)/(i): ein Codex-Lauf,
der selbst ERFOLGREICH klassifiziert wird, hält den Workflow bei `BLOCKIERT`
trotzdem an.
Status: gelöst.
Feature/Run: M4-Challenge, 12.09.2026 → F23 WS-1b, 15.09.2026.

**F-352** · `HARNESS_IMPROVEMENT` · P2 · behoben
Titel: UI-Gate ist Quelltext-String-Matching; `public/` außerhalb Lint und
Typecheck.
Beschreibung: `scripts/check-f15-workflow-oberflaeche.mjs` prüft
Container-IDs, Endpunkt-Strings und Feldnamen im Quelltext von
`public/leitstand/` („kein Rendern"); `biome.json` führt nur `scripts` und
`src`; repo-weit gibt es keinen DOM-Test. F20 WS-1 (14.09.2026, Modul-
Aufteilung von `app.js` in `router.js`/`api.js`/`render.js`/`views/*.js`)
hat das real ausgelöst und dabei eine ZWEITE, bisher hier nicht genannte
Betroffenheit gefunden: `scripts/check-f12-leitstand-ansicht.mjs` Fall (f)
liest `renderLaufakte` ebenfalls direkt aus `public/leitstand/app.js`
(F16-AK12-Anzeigebeleg) und bricht aus demselben Grund — `renderLaufakte`
liegt seit WS-1 in `views/runs.js`. Beide Gates sind bei jeder künftigen
Umstrukturierung betroffen, nicht nur das eine.
Fundstelle: `scripts/check-f15-workflow-oberflaeche.mjs`,
`scripts/check-f12-leitstand-ansicht.mjs` Fall (f), `biome.json`.
Auswirkung: jede Umstrukturierung der Oberfläche bricht beide Gates, ohne
dass funktional etwas kaputt sein muss — und umgekehrt.
Maßnahme: beide Gates auf die neue Modulstruktur kalibrieren (Rot-Fall
Pflicht), `public/` in den Biome-Scope aufnehmen.
Status: behoben (14.09.2026) — in zwei Schritten. WS-1 (vorgezogen, außerhalb
der regulären WS-2-Reihenfolge, weil CI sonst dauerhaft rot lief) hat nur die
Gate-Kalibrierung geliefert: beide Gates lesen seither
`views/workflows.js`/`views/runs.js`/`api.js`/`router.js` statt des
aufgeteilten `app.js`, Rot-Fall je Gate real geprüft (verifizierte
Regression je Datei, danach zurückgesetzt) — AK5 damit zu diesem Zeitpunkt
nur TEILWEISE erfüllt (siehe F-360, der genau diese Lücke zwischen dem hier
zu früh gemeldeten „behoben" und dem tatsächlichen Teilstand festhält). WS-2
hat den zweiten Teil nachgezogen: `public/**/*.js` in `biome.json`
aufgenommen (`npx biome lint public` vor und nach der Aufnahme geprüft, 13
`noFloatingPromises`-Befunde mit `void` behoben, keine Regel abgeschaltet)
und dieselben Gates zusätzlich gegen die Poll-Konsolidierung selbst
kalibriert (Fall (b)/(g), F-362). AK5 ist damit vollständig erfüllt.
Feature/Run: M4-Challenge, 12.09.2026; F20 WS-1, 14.09.2026; F20 WS-2,
14.09.2026.

**F-353** · `TECH_DEBT` · P2 · **gelöst**
Titel: Router-Ergebnis wird nicht persistiert; Router nur per CLI erreichbar.
Beschreibung: Die Klassifikation (`ergebnis-router`) wird in
`scripts/route-auftrag.mjs` aus dem Laufergebnis geparst und nur in Form
des erzeugten Workflows über `POST /api/workflows` abgelegt; das
Klassifikationsobjekt selbst ist kein Artefakt. Der Leitstand hat keinen
Router-Endpunkt.
Fundstelle: `scripts/route-auftrag.mjs`, `src/router/index.ts`,
`scripts/leitstand-server.mjs`.
Auswirkung: „Grund der Auswahl" (Rolle→Worker→Modell) ist nicht
nachvollziehbar; Click-to-Work aus der UI unmöglich.
Maßnahme: F22 WS-1 — Endpunkt `POST /api/auftraege/<id>/routen`,
Router-Ergebnis als Kernartefakt mit Schema.
Status: gelöst (14.09.2026) — WS-1 (PR #155) liefert Endpunkt + persistiertes
Router-Ergebnis-Artefakt; WS-2 (dieser PR) verdrahtet den Klick im
Workboard bis zur Vorschlags-Anzeige/Freigabe. „Click-to-Work aus der UI
unmöglich" trifft nicht mehr zu — real gegen den laufenden Server geprüft
(Auftrag mit `workitem_referenz`, 202 + `laufId`, Fehlerzustand-Anzeige,
siehe `features/F22/feature.md`, Realer-Test-Abschnitt). Offen bleibt die
Zuverlässigkeit der Klassifikation selbst (F-337, F-373) — unabhängig von
diesem Befund.
Feature/Run: M4-Challenge, 12.09.2026; F22 WS-1/WS-2, 14.09.2026.

**F-359** · `BUG` · P3 · behoben
Titel: Doppelte HTML-Escapierung im Leitstand bei `auftrag_fehlt` der
Lauf-Detailansicht.
Beschreibung: `renderAuftrag()` (seit F20 WS-1 in
`public/leitstand/views/runs.js`, davor in `public/leitstand/app.js`,
Code-Review-Befund, unverändert aus dem Vorgänger übernommen) baut den
Text für `auftrag.status === 'auftrag_fehlt'` bereits mit
`escapeHtml(auftrag.auftragId)` und lässt das Ergebnis danach über
`unbekanntStatusText()` ein zweites Mal durch `escapeHtml()` laufen.
Enthält eine `auftragId` `&`, `<`, `>`, `"` oder `'`, wird die erste
Escapierung (z. B. `&amp;`) fälschlich ein zweites Mal escaped
(`&amp;amp;`) und im Browser falsch dargestellt.
Fundstelle: `public/leitstand/views/runs.js`, Funktion `renderAuftrag`.
Auswirkung: kosmetisch, nur bei einer `auftragId` mit HTML-Sonderzeichen
sichtbar (in der Praxis bisher keine solche `auftragId` beobachtet).
Maßnahme: `auftrag_fehlt` aus dem `texte`-Objekt herausziehen und als
Funktion statt als vorgerenderten String bauen, dann nur einmal escapen.
Status: behoben (14.09.2026, F22 WS-2 AK8-Re-Test) — real über den
Click-to-Work-Pfad gefunden vom Router (`codex`, F-373-Re-Test) und vom
Ausführungsschritt (`claude-code`) behoben:
`texte.auftrag_fehlt` interpoliert `auftrag.auftragId` jetzt roh, die
äußere `escapeHtml(unbekanntStatusText(...))`-Hülle bleibt die einzige
Escapierung. Regressionsschutz (g) in
`scripts/check-f12-leitstand-ansicht.mjs` ergänzt.
Feature/Run: F20 WS-1, 14.09.2026 (Code-Review-Fund, vorbestehend, nicht
durch die Modul-Aufteilung eingeführt). Behoben F22 WS-2 AK8-Re-Test,
14.09.2026.

**F-360** · `PROCESS_IMPROVEMENT` · P3 · behoben
Titel: F-352 als „behoben" markiert, obwohl ein Teil der eigenen Maßnahme
(Biome-Scope für public/) noch aussteht.
Beschreibung: `state/findings.md` setzte F-352 auf „behoben (vorgezogen aus
WS-2, 14.09.2026)", nachdem nur die Gate-Kalibrierung erledigt war. Der
zweite Teil („public/ in den Biome-Scope aufnehmen") war in PR #149 nicht
enthalten (`biome.json` unverändert) und blieb regulärer WS-2-Scope.
Fundstelle: `state/findings.md` F-352, `biome.json`.
Auswirkung: gering, Verwechslungsgefahr beim nächsten Lesen der Findings-Liste.
Maßnahme: F-352 präzisiert — der Statustext trennt seither WS-1
(Gate-Kalibrierung, teilweise) von WS-2 (Biome-Scope, vollständig).
Status: behoben (14.09.2026) — F-352 im selben Zug korrigiert, siehe dort.
Feature/Run: F20 WS-1 Verifikation, PR #149, 14.09.2026; behoben F20 WS-2,
14.09.2026.

**F-361** · `PROCESS_IMPROVEMENT` · P2 · behoben
Titel: docs/STATUS.md widersprach features/F20/feature.md AK7 in der
Startbedingung für F21.
Beschreibung: `docs/STATUS.md` (M4-Abschnitt) ordnete F21/F24/F25/F28
„Nach F20" ein (impliziert das ganze Feature inkl. WS-2). AK7 in
`features/F20/feature.md` bindet das F21-Startrecht wörtlich nur an die
WS-1-Review. Beide Quellen waren gültig und widersprachen sich.
`docs/STATUS.md` war zusätzlich nicht auf den WS-1-Merge nachgezogen.
Fundstelle: `docs/STATUS.md` M4-Abschnitt, `features/F20/feature.md` AK7 und
Dependencies.
Auswirkung: Ohne Chat-Kontext war unklar, ob F21 vor oder nach F20 WS-2
starten darf. Entschieden: erst F20 WS-2 (samt AK7-Review), dann F21
(Stefan, 14.09.2026).
Maßnahme: `docs/STATUS.md` beim WS-2-Abschluss aktualisiert — WS-1-Merge
(PR #149) nachgetragen, F21-Startbedingung eindeutig auf „nach F20 WS-2
(AK7-Review)" festgeschrieben.
Status: behoben (14.09.2026).
Feature/Run: F20 WS-1 AK7-Review, 14.09.2026; behoben F20 WS-2, 14.09.2026.

**F-362** · `HARNESS_IMPROVEMENT` · P1 · behoben
Titel: check-f15-workflow-oberflaeche.mjs (b) koppelte an
"await holeWorkflows()" und brach bei der WS-2-Poll-Konsolidierung.
Beschreibung: Zeile 161 verlangte das Literal "await holeWorkflows()" in
`views/workflows.js`. Nach Umstellung der Liste auf `/api/zustand` existiert
dieser Aufruf im Poll-Pfad nicht mehr — die Liste rendert seither als
Abnehmer des Zustands-Aggregat-Polls (`renderWorkflows(zustand.workflows)`
in einem `abonniere(...)`-Callback, `zustand.js`). Derselbe Bruch betraf
Fall (g)s Zusage auf das Literal `pollWorkflows()` (entfallen zugunsten von
`pollJetzt()`).
Fundstelle: `scripts/check-f15-workflow-oberflaeche.mjs` Fall (b) und (g).
Auswirkung: CI wäre rot gelaufen, sobald die Poll-Konsolidierung geliefert
wurde — dasselbe Muster wie F-352.
Maßnahme: Fall (b) auf `abonniere((zustand) => {` /
`renderWorkflows(zustand.workflows)` umgestellt, Fall (g) auf `pollJetzt()`;
beide Rot-Fälle real geprüft (Aufruf/Literal vorübergehend entfernt, Gate
lief rot, danach zurückgesetzt). Zusätzlich `scripts/check-f20-zustand-poll.mjs`
neu: cross-cutting Client-Check für AK3 (genau ein `setInterval`, in
`zustand.js`, zielt auf `GET /api/zustand`) plus Server-Grün-/Rot-Fall des
Aggregats, in `npm run check` eingehängt.
Status: behoben (Code-Stand 14.09.2026, GELANDET erst mit dem F20-WS-2-Commit
— siehe Nachtrag). NACHTRAG (14.09.2026, Verifikations-Widerspruch): der
Status "behoben" wurde hier gesetzt, während die Kalibrierung nur im
Arbeitsverzeichnis stand und noch NICHT committet war — eine gegen den
letzten Commit laufende Verifikation fand deshalb an den alten Zeilen 161/308
zu Recht noch die alten Literale `await holeWorkflows()`/`pollWorkflows()`.
Dasselbe Muster wie F-360 (verfrüht "behoben" markiert, bevor die Maßnahme
tatsächlich im Repo-Stand ankam), hier auf den eigenen Fund angewendet.
Erneut real geprüft nach dem Widerspruch (14.09.2026): `npm run check` und
`node scripts/check-f15-workflow-oberflaeche.mjs` liefen grün, beide
Rot-Fälle (b)/(g) ein zweites Mal real erzeugt und zurückgesetzt — die
Kalibrierung selbst war korrekt, es fehlte nur der Commit.
Feature/Run: F20 WS-2 Challenge, 14.09.2026; behoben F20 WS-2, 14.09.2026;
Commit-Lücke gefunden und Nachtrag verifiziert, 14.09.2026.

**F-367** · `BUG` · P1 · behoben
Titel: Doppelte ID F-222 in state/findings.md, Körper gehörte zu F-221.
Beschreibung: Kopfzeile `**F-222** · TECH_DEBT · P2 · **gelöst**` war
mitten im Fließtext von F-221 eingefügt (Kopier-Fehler), ohne eigenes
Titel-Feld. 361 Kopfzeilen bei nur 360 verschiedenen IDs; einziger
Eintrag im Register ohne Titel:-Feld.
Fundstelle: state/findings.md, F-221/F-222-Übergang.
Auswirkung: jeder Register-Parser (F21) hätte entweder einen
Phantom-Eintrag gezeigt oder einen echten verloren.
Maßnahme: fälschlich eingefügte Kopfzeile entfernt (dieser Commit),
F-221 unverändert, F-222 unverändert.
Feature/Run: Challenge F21, 14.09.2026.

**F-373** · `BUG` · P1 · gelöst
Titel: Router-Lauf über den `claude-code`-Rückfall folgt real 3/3 nicht der
Rollenvorgabe (Freitext-Agentenverhalten statt JSON-Klassifikation).
Beschreibung: Realer Click-to-Work-Test (F22 WS-2, AK8-Vorbereitung,
14.09.2026) gegen den echten Leitstand-Server (`node scripts/
leitstand-server.mjs`, kein Gate-Fixture): `codex` war nicht verfügbar
(`loeseRessourcenAuf` meldet nicht `verfuegbar`), jeder Router-Lauf lief
also über den `claude-code`-Rückfall. Drei unabhängige Läufe (`router-
abcd6a25-…-1789400274244`, `…-1789400502966`, `…-1789400593914`) endeten
alle mit demselben Startfehler „Klassifikationstext ist kein gültiges
JSON". Der Rohstrom des zweiten Laufs (`kontrollzustand-roh/router-
abcd6a25-…-1789400502966/rohstrom.json`) zeigt: das Modell hat NICHT nur
ein Formatierungsproblem (Codezaun, F-337) — es hat die Rollenvorgabe
„nur JSON, kein Freitext" vollständig ignoriert, stattdessen den
tatsächlichen Bug (F-359) selbstständig untersucht, korrekt diagnostiziert
und einen Fix-Vorschlag in Prosa formuliert („Could you re-enable the Edit
or Write tool…"). Das ist ein qualitativ anderes Verhalten als das in
F-337 dokumentierte Codezaun-Problem (~27 % Formatfehler bei sonst
korrekter JSON-Antwort) — hier verlässt das Modell die Rolle vollständig
und agiert als allgemeiner Coding-Agent.
Fundstelle: Rollenprompt des `router`-Schritts für den `claude-code`-
Rückfall (`src/rollen/index.ts` bzw. `loeseAusfuehrungsEingabenAuf`,
`scripts/leitstand-server.mjs`); reale Rohströme unter
`kontrollzustand-roh/router-abcd6a25-1b40-4a97-9f6c-c6273157f0f4-*`
(lokal, nicht committet — flüchtiger Rohstrom).
Auswirkung: Click-to-Work (F22) erreicht in dieser Umgebung mit dem
`claude-code`-Rückfall reproduzierbar 0/3 einen Workflow-Vorschlag — nicht
nur gelegentlich wie F-337 beschreibt. Der reale AK8-Klick-Test von F22
WS-2 konnte deshalb nicht bis zur Vorschlags-Anzeige/Freigabe durchlaufen
werden (siehe `features/F22/feature.md`, Realer-Test-Abschnitt). Die
UI-seitige Fehlerbehandlung (Zustand 'fehler' über die
`startfehler`-Projektion) hat dabei korrekt funktioniert.
Maßnahme: Ursache klären — evtl. fehlt dem `claude-code`-Rückfall-Aufruf
eine ausreichend scharfe System-Prompt-Isolierung gegenüber dem
allgemeinen Coding-Agent-Verhalten (anders als bei `codex` mit
`--output-schema`). Bis geklärt: `codex`-Verfügbarkeit in dieser Umgebung
prüfen (würde den Rückfallpfad umgehen). Außerhalb von F22 (Nicht-Ziel:
Änderung der Router-Klassifikationslogik).
Status: gelöst.
Feature/Run: F22 WS-2, realer Klick-Test, 14.09.2026.

Nachtrag (14.09.2026, Root-Cause-Klärung): Ursache war eine reine
Start-Konfigurationslücke, keine fehlende CLI-Installation — der
Testlauf nutzte die Default-Startvorlage
startvorlagen/beispielprojekt.json (kein worker-Feld), wodurch
loeseRessourcenAuf codex strukturell als nicht verfügbar meldete.
startvorlagen/ai-workforce.json trägt einen vollständigen
worker.codex-Block. Re-Test mit `LEITSTAND_STARTVORLAGE_PFAD=
startvorlagen/ai-workforce.json`, echter Server, derselbe Auftrag
(`abcd6a25-…`, F-359): Router-Lauf `router-abcd6a25-…-1789403095705`
lief über Worker `codex`, lieferte gültige JSON-Klassifikation über
`--output-schema` (`beobachtung: null`, kein Fence-Stripping nötig,
siehe `kontrollzustand/lineage-router-abcd6a25-1b40-4a97-9f6c-c6273157f0f4`).
0/3 → 1/1 real. Root Cause damit bestätigt und behoben; kein Fix an
Router- oder Rollenprompt-Logik nötig. Siehe `features/F22/feature.md`,
Abschnitt „Realer Test (Re-Test)". Dabei ein NEUER, unabhängiger Blocker
im weiteren Kettendurchlauf gefunden — siehe F-374.

**F-374** · `BUG` · P1 · gelöst
Titel: Workboard-„Freigeben" ruft nur `POST .../starten` auf, ohne den
für einen `ZWINGEND`-Schritt zwingenden `POST .../freigabe`-Aufruf davor
— AK4/AK6 sind über das Workboard strukturell unerreichbar.
Beschreibung: Realer Click-to-Work-Test (F22 WS-2, AK8-Re-Test,
14.09.2026) gegen den echten Leitstand-Server, nach behobenem F-373
(Router lief erfolgreich über `codex`, Vorschlag erschien real). Klick
auf „Freigeben" (`freigebenBearbeitung`, `public/leitstand/views/
workboard.js:405-425`) ruft ausschließlich `starteWorkflowSchritt` →
`POST /api/workflows/<id>/starten` auf. Der erste Schritt jedes über den
Router erzeugten Workflows trägt aber `freigabe: 'ZWINGEND'`
(`werkzeugsatz: 'schreibend'`, by design, AK4/E-M3-1) — für einen
ZWINGEND-Schritt lehnt der Server `POST .../starten` real mit 409
(`art: 'haltFreigabe'`) ab, solange nicht zuvor `POST /api/workflows/<id>/
freigabe` mit `{schrittId, entscheidung: 'FREIGEGEBEN', begruendung}`
aufgerufen wurde (`scripts/leitstand-server.mjs:3762-3872`). Der
bestehende `sendeWorkflowFreigabe`-Client-Aufruf
(`public/leitstand/api.js:60`) existiert bereits und wird von der
älteren Workflow-Ansicht korrekt so verwendet
(`public/leitstand/views/workflows.js:673`) — `workboard.js` importiert
ihn aber gar nicht (Zeile 43) und ruft ihn folglich nirgends auf. Der
Code-Kommentar über `freigebenBearbeitung`
(`workboard.js:404`, „Muster views/workflows.js renderWorkflowBedienung")
behauptet fälschlich, dem bestehenden Muster zu folgen.
Fundstelle: `public/leitstand/views/workboard.js:43,404-425` (fehlender
Import/Aufruf von `sendeWorkflowFreigabe`); Gegenprobe
`public/leitstand/views/workflows.js:673`; Server-Verhalten
`scripts/leitstand-server.mjs:3762-3872`.
Auswirkung: Jeder reale „Freigeben"-Klick im Workboard auf einen frisch
gerouteten Vorschlag scheitert mit 409/„Anfrage fehlgeschlagen" — genau
der Normalfall (ZWINGEND vor jedem schreibenden ersten Schritt, AK4).
AK4 (Freigabe startet die Kette) und AK6 (Terminal-Block nach
ABGESCHLOSSEN) sind über den Workboard-Pfad damit strukturell
unerreichbar; AK8 konnte in diesem Re-Test nur durch einen manuellen,
UI-fremden `POST .../freigabe`-Aufruf per curl umgangen werden, um den
Rest der Kette (Ausführungsschritt, Terminal-Block) zu verifizieren —
dieser Teil lief danach real fehlerfrei durch (`status: 'ABGESCHLOSSEN'`,
Schritt `ERFOLGREICH`, siehe `features/F22/feature.md`). Der Fehler liegt
also isoliert in der Verdrahtung von `freigebenBearbeitung`, nicht in der
Kette selbst.
Maßnahme: `freigebenBearbeitung` in `workboard.js` vor (oder statt)
`starteWorkflowSchritt` einen `sendeWorkflowFreigabe(zustand.workflowId,
{schrittId: <aktiver ZWINGEND-Schritt>, entscheidung: 'FREIGEGEBEN',
begruendung: <UI-Eingabe oder Standardtext>})`-Aufruf ergänzen (Muster
`workflows.js:673`); prüfen, ob danach noch ein separater
`starten`-Aufruf nötig ist (im Re-Test hat bereits die `freigabe`-Antwort
`status: 'LAEUFT'` geliefert). Außerhalb dieses Auftrags (Nicht-Ziel laut
Handoff), eigenständiger Fix nötig.
Status: gelöst.
Feature/Run: F22 WS-2, AK8-Re-Test, 14.09.2026.

Nachtrag (14.09.2026, Fix eingereicht, noch NICHT real verifiziert):
`freigebenBearbeitung` (`workboard.js`) ruft jetzt `sendeWorkflowFreigabe`
mit `schrittId: zustand.workflowDetail.naechster.schrittId` (derselbe Wert,
den `workflows.js` über `data-schritt-id` nutzt) und der Standard-
begründung `FREIGABE_BEGRUENDUNG_STANDARD` auf, kein `starteWorkflowSchritt`
mehr davor/danach — die `freigabe`-Antwort lieferte im Re-Test bereits
`status: 'LAEUFT'`, ein zweiter `starten`-Aufruf entfällt. Statisch geprüft
(gleicher Endpunkt, gleiche Feldquelle wie der bereits real erfolgreiche
manuelle `freigabe`-Aufruf oben), `npm run check` grün (450/450 Tests,
Gates, Lint, Typecheck). NICHT verifiziert: ein echter Klick im Browser —
diese Sitzung hatte keinen Browser-Zugriff, nur den Editor/CLI-Zugriff.
Die Bewertung „gelöst" und die AK8-Freigabe bleiben deshalb an Stefans
realem Klicktest gebunden, wie im Auftrag verlangt.

Nachtrag (14.09.2026, real verifiziert): Stefan hat den Fix mit zwei
echten Klicktests im Workboard gegen den echten Server
(`LEITSTAND_STARTVORLAGE_PFAD=startvorlagen/ai-workforce.json`) bestätigt.
(1) Workitem `abcd6a25-…` (F-359): Bearbeiten → Router lief über `codex`
→ Vorschlag erschien → Klick auf „Freigeben" → KEIN 409 → Kette lief bis
`ABGESCHLOSSEN`, Schritt `ERFOLGREICH`, Terminal-Block erschien real im
UI. (2) Workitem F-090: derselbe Klickpfad, ebenfalls Freigeben ohne 409,
Kette bis `ABGESCHLOSSEN`, Terminal-Block erschien; der
Ausführungsschritt änderte hier keine Datei (`git status`/`git diff`
danach: keine Tracked-Änderungen) — unauffällig, da F-090 TECH_DEBT/
zurückgestellt war (E-192), kein Blocker. Status damit auf „gelöst"
gehoben.

**F-376** · `PROCESS_IMPROVEMENT` · P1 · **gelöst**
Titel: PlanV1 (12.09.) und M5-Vermerk (14.09.) widersprachen sich zum
Post-Build-Prüfschritt.
Beschreibung: PlanV1 (`docs/STATUS.md`, Meilenstein 4) ordnet den
Post-Build-Prüfschritt F23 zu. Der M5-Vermerk vom 14.09.2026 (strategische
Vorab-Challenge zu Meilenstein 5) erwähnt denselben Mechanismus im
Zusammenhang mit einer eigenen, strategischen Vorab-Prüfung — ohne
Abgrenzung sah das nach zwei konkurrierenden Bauorten für dieselbe
Fähigkeit aus.
Fundstelle: `docs/STATUS.md` (F23-Eintrag), M5-Vermerk vom 14.09.2026.
Auswirkung: ohne Klärung hätte F23 WS-0 einen Mechanismus bauen können, den
Meilenstein 5 kurz danach unabhängig noch einmal baut oder ersetzt.
Maßnahme: 14.09.2026 entschieden — F23 baut den Post-Build-Prüfschritt als
Kernartefakt und Automaten-Verdrahtung; der M5-Vermerk gilt ausschließlich
für die strategische Vorab-Challenge (ein menschlicher, planender Schritt
vor Meilenstein 5, kein Laufzeitmechanismus) und bezeichnet keinen zweiten
Bauort für dasselbe.
Status: gelöst (14.09.2026).
Feature/Run: F23 WS-0, 14.09.2026.

**F-377** · `BUG` · P1 · gelöst
Titel: Rolle `code-reviewer` läuft in den Standard-Workflow-Vorlagen VOR
dem Bau, entgegen ihrem eigenen Rollenvertrag — ihr Urteil wird von
niemandem ausgewertet.
Beschreibung: `workflow-vorlagen/standard.json` und `workflow-vorlagen/
hoch.json` planen `code-reviewer` als lesenden Schritt VOR `ausfuehrung`,
gegen den reinen Auftragstext. Der Rollenvertrag (`src/rollen/index.ts`,
F17) beschreibt `code-reviewer` aber als Prüfung fertigen Codes NACH dem
Bau (CLAUDE.md: „Prüft fertigen Code nach dem Bauen"). Der Automat
(`ermittleNaechstenSchritt`) wertet das Urteil dieses Vor-Schritts an
keiner Stelle aus — ein `urteil: BLOCKIERT` hätte keine Wirkung, selbst
wenn der Schritt inhaltlich sinnvoll liefe.
Fundstelle: `workflow-vorlagen/standard.json`, `workflow-vorlagen/hoch.json`,
`src/rollen/index.ts` (ROLLENVERTRAEGE.code-reviewer), `src/workflow/
index.ts` (`ermittleNaechstenSchritt`).
Auswirkung: der bestehende Vor-Bau-Schritt täuscht eine Code-Review vor,
die technisch nicht stattfinden kann (es gibt noch keinen Code) und deren
Ergebnis ohnehin folgenlos bliebe.
Maßnahme: beide Vorlagen ersetzen den Pre-Build-`code-reviewer`-Schritt durch
einen echten Post-Build-Schritt NACH `ausfuehrung` (`eingaben` referenziert
den WS-0-Platzhalter `artefakt:aenderungsuebersicht-@<Ausführungsschritt>`,
sieht also den echten Diff statt nur des Auftragstexts) — deckungsgleich mit
F-351, siehe dort für die Automaten-Verdrahtung.
Status: gelöst.
Feature/Run: F23 WS-0, 14.09.2026 → F23 WS-1b, 15.09.2026.

**F-379** · `TECH_DEBT` · P2 · gelöst
Titel: Entscheidungsartefakte werden an fünf Stellen in
`scripts/leitstand-server.mjs` inline ohne Schema geschrieben; das Feld
`ergebnis` ist über fünf semantische Familien überladen.
Beschreibung: `{entscheidung_schema: 'v0', ergebnis, begruendung,
entschieden_am}` entsteht inline an fünf Schreibstellen
(`scripts/leitstand-server.mjs` Z. ~3345, 3947, 4269, 4408, 4444) ohne
gemeinsames JSON-Schema und ohne Validator (siehe bereits F-350). Das Feld
`ergebnis` trägt dabei je nach Stelle Werte aus fünf verschiedenen,
inhaltlich unabhängigen Wertemengen (u. a. Plan-Änderung, menschliche
Freigabe-/Ablehnungsentscheidung, `GESTOPPT`, ein Prüfungsergebnis, der
übernommene `LaufStatus.ergebnis`) — `ABGELEHNT` ist dabei doppelt belegt
und je nach Stelle unterschiedlich zu lesen.
Fundstelle: `scripts/leitstand-server.mjs` Z. ~3345, 3947, 4269, 4408, 4444.
Auswirkung: ein Konsument des Feldes `ergebnis` kann seine Bedeutung nicht
ohne Kenntnis der erzeugenden Stelle bestimmen; ein künftiges Schema
(F-350) muss diese fünf Familien vor der Vereinheitlichung erst sauber
trennen, sonst wird die Überladung nur in ein Schema gegossen statt
aufgelöst.
Maßnahme: F23 WS-1a — neues Pflichtfeld `art` (`freigabe|stopp|
planaenderung|terminal|kenntnisnahme|abnahme`) trennt die fünf Familien
explizit auseinander; je `art` eine eigene, exklusive `ergebnis`-
Wertemenge im Schema (`if`/`then`, `additionalProperties:false` je Zweig)
und im Validator (löst F-350 zusammen mit dieser Klärung). Alle fünf
Schreibstellen setzen `art` jetzt explizit.
Status: gelöst.
Feature/Run: F23 WS-0, 14.09.2026 → F23 WS-1a, 14.09.2026.

**F-380** · `BUG` · P0 · gelöst
Titel: `check-f20-leitstand-shell.mjs` hängt bei Chrome-Startfehler statt
rot zu werden.
Beschreibung: `starteChrome()` (Zeile ~109-132 vor dem Fix) lehnte die
Promise beim Ablaufen der 15s-DevTools-Frist NUR ab (`reject`) — der
gespawnte Chrome-Prozess wurde nie gekillt. Dessen offene stderr-Pipe hielt
den Node-Prozess am Leben; der CI-Job hing 20+ Minuten statt nach 15s rot
zu werden. Blockier-Regel: "blockiert jeden PR, Weiterarbeit nicht
verantwortbar" — eigener Branch außerhalb F23 dafür angelegt.
Root-Ursache dafür, dass der Timeout überhaupt zuschlägt: Chrome scheitert
auf dem `ubuntu-latest`-Runner an dbus ("Could not connect to the bus:
Could not parse server address"), bevor es die DevTools-Adresse meldet.
`.github/workflows/ci.yml` trug dafür bereits einen Kommentar mit dem
vorgesehenen Ausweg (Schritt entfernen statt rot laufen lassen, falls kein
Chrome/Edge sicher verfügbar ist).
Fundstelle: `scripts/check-f20-leitstand-shell.mjs` (`starteChrome`, Zeile
~109-135 vor dem Fix), `.github/workflows/ci.yml:39-45`. Beleg: GitHub-
Actions-Lauf https://github.com/DerStefan89/ai-workforce/actions/runs/34885699720
(Log real gelesen).
Auswirkung: kein PR konnte mehr grün werden, solange dieser CI-Schritt
verpflichtend war — Blockade der gesamten Weiterarbeit über Branch
Protection.
Maßnahme, real umgesetzt (kein Wurf ohne Fix, siehe Bauauftrag):
(1) PFLICHT, unabhängig vom dbus-Problem — `starteChrome()` killt den
gespawnten Prozess jetzt über `beendeProzessUndWarte` (killt + wartet
real auf `exit`) in JEDEM der drei Fehlerzweige (Timeout, Exit vor der
DevTools-Meldung, neu ergänzter `error`-Zweig für Spawn-Fehler wie
ENOENT/EACCES, der vorher unbehandelt geblieben wäre), bevor die Promise
ablehnt. `haupt()`s bisherige, separat gepflegte Kill-Logik nutzt jetzt
denselben Helfer (D5). Zusätzlich ein harter Watchdog auf Skriptebene
(`WATCHDOG_OBERGRENZE_MS = 90_000`, deutlich über der 15s-Chrome-Frist,
deutlich unter der real beobachteten Hängedauer) — erzwingt
`process.exit(1)`, falls IRGENDWO sonst noch ein offener Handle übrig
bliebe, unabhängig von der genauen Ursache. Vier neue Regressionstests in
`scripts/check-f20-leitstand-shell.test.mjs` (Teil von `npm run check`,
kein echtes Chrome nötig — Attrappenprozess über `process.execPath -e`)
belegen für Timeout-, Exit- und Spawn-Fehler-Zweig je: der Kindprozess ist
beim `reject` nachweislich beendet (`exitCode`/`signalCode`, Node-eigene
Bewertung statt OS-Prozesstabellenabfrage), nicht nur, dass die
Fehlermeldung stimmt.
(2) dbus-Ursache — `.github/workflows/ci.yml` bekam einen zusätzlichen
Schritt, der `dbus-x11` nachinstalliert und den D-Bus-Systemdienst
startet (Standard-Workaround für "Could not connect to the bus" auf
GitHub-gehosteten Ubuntu-Runnern). NICHT durch einen echten grünen Lauf
mit echtem DevTools-Connect belegt — in dieser Sitzung kein Push/PR
möglich (Terminal macht Commit/Push der Mensch), also kein Zugriff auf
einen echten Actions-Lauf zur Gegenprobe. Deshalb zusätzlich, wie vom
bestehenden ci.yml-Kommentar selbst vorgesehen: der F20-Schritt UND der
neue D-Bus-Schritt stehen auf `continue-on-error: true` (mit Verweis auf
diesen Fund) — der Schritt blockiert damit keinen PR mehr, unabhängig
davon, ob die dbus-Mitigation auf dem Runner tatsächlich zieht.
Status: gelöst (Kill-Fix + Watchdog real verifiziert über vier neue Tests,
`npm run check` grün; Blockier-Wirkung durch `continue-on-error` entfernt).
Offener Rest, kein Blocker: ob die dbus-Mitigation den Schritt auf
`ubuntu-latest` tatsächlich wieder echt grün macht (statt nur
`continue-on-error`-grün), ist erst mit dem nächsten echten CI-Lauf
feststellbar — für die Blockade-Frage dieses Findings ohne Bedeutung,
`continue-on-error` fängt beide Fälle ab.
Feature/Run: CI-Hänger-Fix, 14.09.2026 (eigener Branch
`fix/ci-f20-chrome-haenger`, getrennt von F23).

**F-383** · `TECH_DEBT` · P2 · gelöst (bewusst nicht durchgesetzt)
Titel: `grenzen.max_replans` wird nirgends durchgesetzt.
Beschreibung: `workflow-vorlagen/standard.json:11` setzt `max_replans: 1`,
aber `scripts/leitstand-server.mjs` (Z. 290, 3174, 3576) hält das Feld an
allen drei Stellen nur unangetastet weiter — keine davon zählt oder prüft
es gegen einen Grenzwert. `grenzen.max_schritte` ist über `haltGrenze` die
einzige real durchgesetzte Zählgrenze des Automaten (F15 WS-2c, a4);
`max_replans` ist bislang reines Plandatum ohne Wirkung.
Fundstelle: `workflow-vorlagen/standard.json:11`,
`scripts/leitstand-server.mjs` (drei benannte Stellen; Nachtrag F23 WS-2b:
Z. 3602 und Z. 3045 sagen es explizit — `max_replans` begrenzt laut
Kommentar dort ausschließlich die AUTOMATISCHE Wiederholung).
Auswirkung: keine — die Prämisse, unter der dieses Finding P2 eingestuft
wurde ("der ADJUST-Loop hätte ohne Durchsetzung keine Grenze"), trifft real
NICHT zu: ein ADJUST (F23 WS-2b, `POST /api/workflows/<id>/abnahme`,
`ergebnis: 'ANPASSUNG_ANGEFORDERT'`) ist immer menschlich ausgelöst (ein
Klick im Leitstand, mit Pflichtbegründung) UND landet auf `WARTET_FREIGABE`
(AK24) — der Neubau selbst startet erst über eine ZWEITE menschliche
Entscheidung (`POST .../freigabe`, `FREIGEGEBEN`). Zwei unabhängige
menschliche Entscheidungen je Durchgang SIND die Grenze; es gibt keinen
Pfad, auf dem der Automat ADJUST-Durchgänge selbst wiederholt.
Maßnahme: keine — geschlossen ohne Codeänderung. Wieder zu öffnen, sobald
ein Pfad entsteht, der ADJUST OHNE menschlichen Klick auslöst (dann zählt
die oben genannte Begründung nicht mehr).
Status: gelöst (F23 WS-2b, Bauauftrag 15.09.2026, dokumentierte Entscheidung
statt Codeänderung).
Feature/Run: F23 WS-2a (entstanden), F23 WS-2b (gelöst, Bauauftrag
15.09.2026).

**F-384** · `BUG` · P1 · gelöst
Titel: Die Abnahme-Entscheidung war nicht an das beurteilte Bau-Ergebnis
gebunden — der Abnahme-Reparaturpfad (AK16) verhungert dadurch real.
Beschreibung: `GET .../abnahme` und der Doppelentscheidungs-Riegel in
`POST .../abnahme` verglichen ursprünglich `bezug.workflow_version` gegen
`workflowDaten.version`, um eine veraltete von einer aktuellen
Abnahme-Entscheidung zu unterscheiden. Nichts erzwang aber, dass sich
`version` zwischen zwei Fassungen unterscheidet — `src/workflow/index.ts:306`
fordert nur "ganze Zahl >= 1", `workflow-vorlagen/standard.json` trägt
`version: 1` fest, und `waehleWorkflowVorlage` (`src/router/index.ts`)
überschreibt `version` nicht. Folge: ABGELEHNT (V1) → GESTOPPT → erneut
routen (wieder V1) → Lauf durch → ABGESCHLOSSEN — die alte Entscheidung
galt weiter als `'ok'`, die View bot keine Schaltflächen, `POST` antwortete
409. Der Workflow war dauerhaft nicht abnehmbar.
Erster Lösungsversuch (verworfen, real gebaut und real wieder entfernt):
`version` als erzwungener Fassungszähler — `verarbeiteRouterErgebnis` sollte
sie auf `bestand.version + 1` setzen, `POST /api/workflows` eine
eingereichte Fassung mit `version <= bestand.version` mit 409 ablehnen.
`npm run check` zeigte real: das bricht 25 bestehende Tests in F15/F22 —
`version` ist ein Plandatum, kein Fassungszähler, und der etablierte
Reparaturweg (`baueReparaturEntwurf`, `public/leitstand/views/workflows.js`)
reicht seit F15 WS-2c bewusst eine Fassung mit UNVERÄNDERTER `version` ein
(F-226/F-227 verlangen das ausdrücklich). Der Diskriminator war falsch
gewählt, nicht das Produkt.
Fundstelle (korrigierter Fix): `scripts/leitstand-server.mjs` — GET
.../abnahme (Projektion `entscheidungProjektion`) vergleicht
`bezug.ausfuehrung_lauf_id` gegen die `lauf_id` des aktuellen
Ausführungsschritts (`findeAusfuehrungsSchritt`); `status: 'ok'` bei
Übereinstimmung, sonst `'veraltet'`. Der Doppelentscheidungs-Riegel in POST
.../abnahme prüft dieselbe Gleichheit. `bezug` selbst, `POST /api/workflows`,
`verarbeiteRouterErgebnis` und `src/workflow/index.ts` bleiben unangetastet.
Auswirkung: ohne den (korrigierten) Fix wäre AK16s Reparaturpfad
("`GESTOPPT` bleibt der Reparaturpfad") auf UI- UND API-Ebene eine
Sackgasse geblieben — Fehler 1 aus dem QA-Pass 15.09.2026 (TC-04) blieb
sonst ohne echten Boden, weil kein Codepfad im Produkt zwei
unterscheidbare Bau-Ergebnisse für denselben Workflow erzeugte.
Zwischenstand (QA-Pass 15.09.2026, kritischer Befund): die Server-Vergleichslogik
allein schloss die Lücke NICHT. `REPARIERBARE_SCHRITT_STATUS`
(`public/leitstand/views/workflows.js`) lässt einen ERFOLGREICHEN
Ausführungsschritt bewusst unangetastet (Lineage-Grund) — `baueReparaturEntwurf`,
der etablierte Reparaturweg, setzt ihn deshalb NIE automatisch zurück. Reicht ein
Mensch nach `ABGELEHNT` den vorbelegten Entwurf unverändert ein, entsteht real
KEIN neuer Ausführungslauf: der Automat hält mit `KLAERUNG_ERFORDERLICH` (Regel 3),
`bezug.ausfuehrung_lauf_id` der alten Entscheidung bleibt gültig, `GET .../abnahme`
zeigt weiter `'ok'` — dieselbe Sackgasse wie ursprünglich, nur unsichtbar, weil
`check-f23-abnahme.mjs` Block (g8) den Reparaturweg selbst nie durchlief (schrieb
die neue `lauf_id` direkt in die Fixture statt über `baueReparaturEntwurf`/einen
echten Laufstart).
Status: gelöst. Zusätzlich zur Server-Vergleichslogik: eine neue Warnung in
`ermittleReparaturWarnungen` (`public/leitstand/views/workflows.js`, F-384-
Kommentar dort) macht das Problem beim Öffnen eines Reparaturentwurfs sichtbar —
bewusst additiv, keine Änderung an `REPARIERBARE_SCHRITT_STATUS` selbst (kein
Risiko für F-219/F-223/F-240 und deren Tests). Real belegt in
`scripts/check-f23-abnahme.mjs` Block (g8) für die Server-Vergleichslogik (echter
HTTP-Dispatch, SIMULIERTES Reparaturergebnis — der Block prüft bewusst nicht den
Reparaturweg selbst, das wäre check-f15-automat-real.mjs' Aufgabe): nach
`ABGELEHNT` bekommt der Ausführungsschritt einen neuen Lauf, `GET .../abnahme`
markiert die alte Entscheidung danach als `'veraltet'`, `ANGENOMMEN` für den neuen
Bau gelingt, eine zweite Entscheidung zu demselben Ausführungslauf wird mit 409
abgelehnt, und eine Fassung OHNE neuen Ausführungslauf lässt eine bestehende
`'ok'`-Entscheidung unangetastet. `npm run check` grün (F15/F22 unverändert grün,
keine Kollateralschäden). Die Warnung selbst ist NICHT gate-geprüft (reine
Textanzeige, kein Verhaltensunterschied, kein `*.test.*` referenziert
`ermittleReparaturWarnungen`) — folgt bei Bedarf in WS-2b.
Vierter QA-Pass (frischer Kontext, 15.09.2026) fand real: die neue F-384-Prüfung
in `ermittleReparaturWarnungen` las `daten.schritte` (die beim Öffnen des
Reparaturentwurfs eingefrorene Originalfassung), nicht `entwurf?.schritte` (den
live eingetippten Entwurf) — Muster der F-226-Prüfung direkt darüber, die das
korrekt tut. Folge: die Warnung blieb stehen, selbst wenn der Mensch genau das
tat, was sie verlangt (Schritt im Textfeld manuell auf `status:'OFFEN',
lauf_id:null` zurückgesetzt) — die eigene Handlungsanweisung ließ sich nie
"quittieren", was das Vertrauen in die Warnung hätte untergraben können.
Behoben: `entwurf?.schritte` statt `daten.schritte`, mit `Array.isArray`-Guard.
`npm run check` grün.
Feature/Run: F23 WS-2a Nacharbeit, 15.09.2026 (Verifikationsbefund, vier
Anläufe — Anlauf 1 [`version`] verworfen nach echtem Testlauf, Anlauf 2
[`ausfuehrung_lauf_id` allein] von einem QA-Pass als unzureichend erkannt,
Anlauf 3 [zusätzliche Warnung] mit Hinweisen freigegeben, Anlauf 4 [Warnung
liest den Entwurf statt der eingefrorenen Fassung] von einem weiteren QA-Pass
korrigiert und freigegeben).

**F-385** · `TECH_DEBT` · P3 · gelöst
Titel: `bezug`s Innenform stand im abnahme-Zweig von
`schemas/kontrollzustand-entscheidung-payload.schema.json` nicht explizit
neben dem Validator.
Beschreibung: `abgeschwaechte_freigaben` (art `planaenderung`) beschreibt
seine Item-Form (`schritt_id`, `vorher`, `nachher`, `additionalProperties:
false`) als eigene Root-Eigenschaft, im if/then-Zweig nur mit `true`
referenziert — `bezug` sollte laut Bauauftrag 15.09.2026 (Nacharbeit)
demselben Muster folgen.
Fundstelle: `schemas/kontrollzustand-entscheidung-payload.schema.json`.
Status: gelöst — bereits mit der ursprünglichen F23-WS-2a-Umsetzung: die
Root-Eigenschaft `bezug` trägt dort schon `type: object`,
`additionalProperties: false`, `required: [workflow_version,
ausfuehrung_lauf_id, review_lauf_id]` und die drei Feldtypen
(`workflow_version` integer, `ausfuehrung_lauf_id` string minLength 1,
`review_lauf_id` string|null), der abnahme-Zweig referenziert sie mit
`"bezug": true` — byte-gleiches Muster zu `abgeschwaechte_freigaben`. Bei
der Verifikation 15.09.2026 gegengeprüft, kein Codeänderung nötig. Der
Validator (`src/entscheidung/index.ts`, `validiereEntscheidungsDaten`)
prüft dieselbe Form bereits unabhängig vom Schema (D5, handgeschrieben).
Feature/Run: F23 WS-2a, Bauauftrag 15.09.2026 / Verifikation 15.09.2026.

**F-390** · `TECH_DEBT` · P3 · gelöst
Titel: Gate (h3) pinnt `grenzen` byte-gleich, aber nicht `version`.
Beschreibung: AK22 verlangt, dass eine ADJUST-Fassung `version` UND
`grenzen` unangetastet lässt. `scripts/check-f23-abnahme.mjs` (h3) verglich
ursprünglich nur `grenzen` (`grenzenVorher`). Strukturell hielt es — der
ADJUST-Zweig schreibt `version` nicht —, aber der Nachweis fehlte.
Fundstelle: `scripts/check-f23-abnahme.mjs`, Block (h3).
Auswirkung: keine aktuelle Fehlfunktion; eine künftige Änderung am
ADJUST-Zweig hätte `version` verändern können, ohne dass das Gate es fängt.
Status: gelöst — (h3) prüft jetzt zusätzlich
`bestandNachher.daten.version === bestandVorher.daten.version` (Muster
`grenzenVorher`).
Feature/Run: F23 WS-2b, Verifikation 15.09.2026.

**F-391** · `HARNESS_IMPROVEMENT` · P2 · gelöst
Titel: `npm run leitstand` startet standardmäßig mit einer Startvorlage ohne
codex, wodurch der Router reproduzierbar in den kaputten claude-code-
Rückfall (F-337/F-373) fällt.
Beschreibung: `STANDARD_STARTVORLAGE_PFAD = 'startvorlagen/
beispielprojekt.json'` (`scripts/leitstand-server.mjs:452`) hat keinen
`worker.codex`-Block; `startvorlagen/ai-workforce.json` hat einen. Jeder
Start ohne die Umgebungsvariable
`LEITSTAND_STARTVORLAGE_PFAD=startvorlagen/ai-workforce.json` reproduziert
F-373, ohne dass das beim Start sichtbar wäre. Real erneut aufgetreten beim
F23-WS-3-Realtest, 15.09.2026 (Router-Lauf
`router-e9b84e80-...-1789501602332` scheiterte identisch zu F-373).
Fundstelle: `scripts/leitstand-server.mjs:452`.
Auswirkung: Realtests scheitern beim ersten Klick, wenn niemand daran
denkt, die Variable zu setzen.
Maßnahme: bewusst klein — kein Verhaltensunterschied am Routing (keine
Umstellung von `STANDARD_STARTVORLAGE_PFAD`), nur Sichtbarkeit: der
CLI-Bindeblock in `scripts/leitstand-server.mjs` löst die geladene
Startvorlage direkt gegen `loeseRessourcenAuf` auf und gibt bei fehlendem/
nicht verfügbarem `worker.codex`-Block einen `console.warn` mit Pfad der
geladenen Startvorlage, Rückfall-Hinweis (claude-code-Klassifikationspfad,
F-337/F-373) und Fix-Hinweis
(`LEITSTAND_STARTVORLAGE_PFAD=startvorlagen/ai-workforce.json`) aus.
Status: gelöst.
Fundstellenverweis: `scripts/leitstand-server.mjs`, CLI-Bindeblock
(F24-Auftrag Schritt 0).
Feature/Run: F23 WS-3, Realtest 15.09.2026; behoben im F24-Auftrag (Schritt
0), 16.09.2026.

**F-396** · `TECH_DEBT` · P1 · gelöst (Duplikat von F-402)
Titel: Kein projektlokaler Ort für Fähigkeiten.
Beschreibung: `loeseRessourcenAuf(ressourcen, repoWurzel,
startvorlagePfad)`: Register ist instanzglobal, Startvorlage
projektspezifisch, Skills lösen über `.claude/skills/<name>` relativ zur
Workforce-Repo-Wurzel auf.
Fundstelle: Kandidatenrecherche vom 15.09.2026,
`docs/harness/kandidaten-2026-09-15.md`.
Auswirkung: im Mehrprojektbetrieb müssen domänenspezifische Fähigkeiten in
die Workforce-Installation gelegt werden und liegen dann in jedem Lauf
jedes Projekts im Kontext. Widerspricht E-M4-2/D3.
Maßnahme: vor dem Projekte-Feature klären. Nicht in F24 lösen.
Status: offen.
Feature/Run: F24-Vorbereitung.

**F-399** · `BUG` · P1 · behoben
Titel: `findeLetzteRealeBesetzung` wählte bei mehreren realen Workflows den
falschen als "jüngsten" (F24 AK4, Ebene 3+4).
Beschreibung: Die Funktion sortierte `lineage-workflow-*`-Verzeichnisse nach
der mtime des Verzeichnisses selbst. Diese mtime friert auf den
Erstellungszeitpunkt ein — ein neuer Checkpoint legt seine Datei direkt
unter `<laufId>/checkpoints/` an (`checkpointVerzeichnis()`,
`schreibeCheckpoint()` in `src/checkpoint-store/index.ts`), das ändert nur
die mtime des `checkpoints/`-Unterverzeichnisses, nie erneut die des
Wurzelverzeichnisses. Die Sortierung degenerierte damit still zu "zuerst
angelegt gewinnt" statt "zuletzt aktualisiert gewinnt" — ein älterer, aber
noch aktiver Workflow konnte gegen einen neueren, längst inaktiven
verlieren.
Fundstelle: `scripts/leitstand-server.mjs`, `findeLetzteRealeBesetzung`.
Auswirkung: die Rollen-View hätte für eine Rolle mit mehreren realen Läufen
potenziell die gepinnte/beobachtete Besetzung (Ebene 3+4) eines falschen,
veralteten Workflows gezeigt — ohne dass das sichtbar gewesen wäre (keine
Gate-Abdeckung dieses Pfads, F24 AK7 prüft nur AK1/AK5/AK6 mechanisch).
Maßnahme/Fix: mtime wird jetzt auf `<laufId>/checkpoints/` selbst gemessen
(mit `existsSync`-Schutz und Fallback `mtimeMs: 0` für ein Verzeichnis ohne
diesen Unterordner) — jeder reale Checkpoint-Schreibvorgang legt eine neue
Datei direkt darin an und aktualisiert damit dessen mtime zuverlässig.
Real durch code-reviewer-Pass gefunden, Fix durch fokussierten
Re-Review-Pass bestätigt.
Status: behoben.
Feature/Run: F24 Bauauftrag, 16.09.2026.

**F-400** · `BUG` · P1 · behoben
Titel: Ein 500 von `GET /api/ressourcen`/`GET /api/ressourcen/abdeckung`
ließ die Capabilities-View dauerhaft auf "Lädt…" hängen (F24).
Beschreibung: `public/leitstand/api.js` rief `holeRessourcen`/
`holeAbdeckung` bisher als bloßes `fetch(...).then(r => r.json())` ohne
`r.ok`-Prüfung auf. `fetch()` löst ein Promise ausschließlich über echte
Netzwerkfehler auf, nie über den HTTP-Status — ein serverseitiger 500 (z. B.
`ressourcen.json` fehlt/kaputt, real reproduziert) wurde deshalb in
`ladeCapabilities()` (`public/leitstand/views/capabilities.js`) von
`Promise.allSettled` fälschlich als `fulfilled` mit dem Fehlerobjekt
`{grund}` als Wert gemeldet. `renderLibrary` griff darauf mit
`ansicht.eintraege.length` zu, was einen ungefangenen `TypeError` warf und
die gesamte Funktion vor dem Erreichen des Coverage-Zweigs abbrach — beide
Container blieben ohne jede Fehlermeldung auf "Lädt…" stehen, im
Widerspruch zum eigenen Funktionskommentar ("ein Fehlschlag EINER der
beiden Quellen zeigt sich nur in ihrem eigenen Container").
Fundstelle: `public/leitstand/api.js` (`holeRessourcen`, `holeAbdeckung`),
`public/leitstand/views/capabilities.js` (`ladeCapabilities`).
Auswirkung: eine defekte `ressourcen.json` hätte die komplette
Capabilities-View unbrauchbar gemacht, ohne erkennbaren Grund für Stefan.
Maßnahme/Fix: neuer `holeJsonOderWirf`-Helfer in `public/leitstand/api.js`
prüft `response.ok` und wirft mit einer aus dem Fehlerkörper gebauten
Meldung (robust gegen einen nicht-JSON-Fehlerkörper, `.catch(() => ({}))`);
`holeRessourcen`/`holeAbdeckung` nutzen ihn jetzt, `Promise.allSettled`
fängt den Fehler korrekt als `rejected` und rendert ihn containerlokal.
Real end-to-end verifiziert (`ressourcen.json` temporär umbenannt, echter
Serverlauf, echter 500, bestätigter Wurf im Client). Unabhängig von
code-reviewer- UND QA-Pass gefunden, Fix durch fokussierten Re-Review-Pass
bestätigt.
Status: behoben.
Feature/Run: F24 Bauauftrag, 16.09.2026.

**F-401** · `BUG` · P2 · behoben
Titel: Coverage-View zeigte "gedeckt" für eine Rolle ohne jeden
registrierten erlaubten Worker (F24 AK2, vacuous truth).
Beschreibung: `projeziereAbdeckung` (`src/capabilities-ansicht/index.ts`)
berechnete `gedeckt: workerAbdeckung.every(w => w.restFehlend.length ===
0)`. `Array.prototype.every` liefert auf einem leeren Array laut
JS-Semantik `true` — trägt eine Rolle in `erlaubte_worker` ausschließlich
Worker, die nicht in `ressourcen.json` registriert sind (z. B. Tippfehler,
oder ein inzwischen entfernter Worker), ist `workerAbdeckung` leer
(`berechneWorkerAbdeckung` filtert nicht registrierte Worker bewusst
heraus), und die Rolle galt fälschlich als vollständig gedeckt — im selben
UI-Block (`abdeckungBlock`, `public/leitstand/views/capabilities.js`) stand
gleichzeitig sichtbar "kein registrierter erlaubter Worker". Mit dem realen
Bestand (5 Rollen, alle erlaubten Worker registriert) nicht scharf, aber
ohne Gate-Schutz gegen künftige Config-Drift.
Fundstelle: `src/capabilities-ansicht/index.ts`, `projeziereAbdeckung`.
Auswirkung: eine Coverage-View, deren Zweck gerade ist, ungedeckte Rollen
verlässlich zu zeigen, hätte genau den extremsten Lückenfall (kein einziger
nutzbarer Worker) als grün/gedeckt gemeldet.
Maßnahme/Fix: `gedeckt: workerAbdeckung.length > 0 &&
workerAbdeckung.every(...)`; neuer Regressionstest in
`src/capabilities-ansicht/capabilities-ansicht.test.ts` deckt den
Zero-Worker-Fall ab. Real durch QA-Pass gefunden, Fix durch fokussierten
Re-Review-Pass bestätigt.
Status: behoben.
Feature/Run: F24 Bauauftrag, 16.09.2026.

**F-403** · `PROCESS_IMPROVEMENT` · P3 · gelöst
Titel: Feature-Akte-Status wird beim Merge nicht nachgezogen (F24).
Beschreibung: features/F24/feature.md stand nach Merge von PR #168 weiterhin
auf READY_FOR_TECH, obwohl Implementierung fertig war. Wiederholung des
F-088-Musters (F4/F6a/F7 drifteten damals ebenso).
Fundstelle: features/F24/feature.md Status-Feld, dieser Commit.
Auswirkung: gering, rein dokumentarisch.
Maßnahme: mit diesem Commit auf ABGESCHLOSSEN gezogen, nach Stefans realem
Test und ACCEPT.
Feature/Run: F24-Realtest-Abschluss, 16.09.2026.

**F-404** · `PROCESS_IMPROVEMENT` · P2 · gelöst
Titel: F-404 aus einem früheren Claude-Projekt-Handoff wurde nie ins
Register übernommen.
Beschreibung: Ein früherer Handoff aus dem Claude-Projekt-Kontext (vor
diesem Repo-Register) vergab bereits die ID F-404, die aber nie hierher
übertragen wurde — das reale Register endete vor dieser Runde bei F-403.
Fundstelle: `state/findings.md`, Lückenprüfung zu Beginn des F27-WS-1-
Bauauftrags.
Auswirkung: gering — reine Nummerierungslücke, keine inhaltliche Folge.
Maßnahme: mit diesem Eintrag nachgetragen, Lücke geschlossen.
Feature/Run: F27-WS-1-Bauauftrag, Schritt 0, 16.09.2026.

**F-406** · `HARNESS_IMPROVEMENT` · P2 · gelöst
Titel: Rollen-Ergebnis-Lesemechanik (Codezaun-Fallback) war vor F27
zweifach dupliziert.
Beschreibung: `verarbeiteRouterErgebnis` und `leseUrteilAusLaufakte`
(`scripts/leitstand-server.mjs`) trugen bis F27 WS-1 denselben
Lese-Dreisatz (worker-abhängiger Rohstrom-Zugriff, JSON.parse,
Codezaun-Fallback über `entferneCodezaun`) als unabhängige Kopien.
Fundstelle: `scripts/leitstand-server.mjs`, `verarbeiteRouterErgebnis` und
`leseUrteilAusLaufakte` (vor dem Fix).
Auswirkung: mittel — zwei unabhängig alternde Kopien derselben Lesemechanik;
eine dritte Kopie für die neue Rolle 'scout' hätte die Dopplung verdreifacht.
Maßnahme: mit F27 WS-1 AK5 auf eine gemeinsame Low-Level-Lesefunktion
zurückgeführt, von allen drei Stellen (Router, Code-Reviewer-Urteil,
Scout-Ergebnis) genutzt.
Feature/Run: F27-WS-1-Bauauftrag, 16.09.2026.

**F-408** · `TECH_DEBT` · P2 · gelöst
Titel: Feature-Akte-Status wird beim Merge nicht nachgezogen (F27, dritte
Wiederholung).
Beschreibung: features/F27/feature.md stand nach dem Merge von WS-2 (PR #173)
weiterhin auf READY_FOR_TECH, die WS-2-Zeile trug noch "(dieser Auftrag)"
statt ABGESCHLOSSEN. Dritte Wiederholung des F-088/F-403-Musters
(Status-Drift nach Merge).
Fundstelle: features/F27/feature.md, Status-Feld und Workstreams-Abschnitt,
vor diesem Commit.
Auswirkung: gering, rein dokumentarisch.
Maßnahme: mit diesem Commit auf ABGESCHLOSSEN gezogen.
Feature/Run: F27-Abschluss-Dokumentation, 17.09.2026.

**F-409** · `PROCESS_IMPROVEMENT` · P2 · gelöst
Titel: Review-Befunde aus WS-2 landeten nur in der Commit-Message, nicht im
Register.
Beschreibung: Die vier Befunde aus den zwei WS-2-Review-Runden (Commit
8aa049b) wurden — anders als bei WS-1 (F-404 bis F-406) — nicht ins Register
übernommen, sondern nur in der Commit-Message und im PR-Text (#173)
beschrieben. Audit-Spur unvollständig.
Fundstelle: Commit 8aa049b, PR #173.
Auswirkung: gering — Information war nicht verloren (Commit/PR-Text belegen
sie), aber nicht an der Stelle, an der künftige Läufe nach Präzedenzfällen
suchen.
Maßnahme: als F-410 nachgetragen; Muster "Review-Befunde gehören ins
Register, nicht nur in die Commit-Message" festgehalten.
Feature/Run: F27-Abschluss-Dokumentation, 17.09.2026.

**F-410** · `BUG` · P1 · gelöst
Titel: Vier Befunde aus den zwei WS-2-Review-Runden, nachgetragen.
Beschreibung: Rekonstruiert aus Commit 8aa049b, PR #173 und den Code-Kommentaren
in public/leitstand/views/capabilities.js (Marker "Code-Review-Befund").
(1) Kritisch, Concurrency: Ein Scout-Lauf hat kein Freigabe-Gate vor der
Ausführung (AK10, rein lesend, direkt gestartet) — ein zweiter Klick auf
"Kandidaten suchen" während ein Lauf bereits läuft, überschrieb scoutZustand
und machte den ersten, real laufenden Lauf für die UI unauffindbar (verletzt
D13/ARCHITECTURE.md §7). Behoben über istScoutSucheAktiv() (Guard im
Klick-Handler und vor dem eigentlichen Lauf-Start) und
aktualisiereScoutButtonZustand() (disabled-Attribut aller
"Kandidaten suchen"-Buttons), aufgerufen nach jedem renderAbdeckung und
renderScoutPanel.
(2) XSS-artig: `quelle_url`/href eines Kandidaten wurde ungeprüft als
anklickbarer Link gerendert — ein `javascript:`-Schema wäre ausführbar
gewesen. Behoben mit Defense-in-Depth auf drei Ebenen: `^https?://`-Pattern
in schemas/ergebnis-scout.schema.json, serverseitige Validierung in
src/scout/index.ts, und clientseitig istSichereQuelleUrl() in
capabilities.js (rendert einen unsicheren Wert als reinen Text statt href,
statt der Formprüfung eines fremden, adversariellen Ergebnisses (P5) blind
zu vertrauen).
(3) Mittel: renderAbdeckung baute bei jedem Neuladen der Coverage-Tabelle
neue "Kandidaten suchen"-Buttons, die den bestehenden scoutZustand nicht
kannten — ein Neuladen während eines laufenden Scout-Laufs hätte so ein
Schlupfloch für einen zweiten, überlappenden Lauf geöffnet. Behoben: jeder
renderAbdeckung-Aufruf ruft danach aktualisiereScoutButtonZustand() auf.
(4) Mittel: "Erneut versuchen" nach einem fehlgeschlagenen Vormerken-Versuch
legte einen zweiten, verwaisten Auftrag an statt den bereits angelegten
erneut einzureichen. Behoben in vormerkenKandidat(): die bei einem früheren
Versuch bereits vergebene auftragId wird gemerkt (vormerkenZustaende) und bei
"Erneut versuchen" wiederverwendet (Muster views/workboard.js
wiederholeRouten), statt einen neuen Auftrag anzulegen.
Fundstelle: public/leitstand/views/capabilities.js Zeilen 106, 130, 202, 270,
331, 404 (Marker "Code-Review-Befund"/"Code-Review-/QA-Befund"); Commit
8aa049b; PR #173 Beschreibung.
Auswirkung: (1) und (2) hoch vor Fix (Sichtbarkeits-/Sicherheitslücke), (3)
und (4) mittel vor Fix (UI-Inkonsistenz bzw. Auftrags-Datenmüll). Alle vier
vor dem Merge behoben.
Maßnahme: keine weitere — bereits mit Commit 8aa049b behoben, hier nur die
Audit-Spur nachgetragen (siehe F-409).
Feature/Run: F27-WS-2-Bauauftrag, zwei Review-Runden, 17.09.2026.

**F-413** · `TECH_DEBT` · P1 · **gelöst**
Titel: execFile im Claude-Code-Gateway hatte kein cwd-Feld — Kindprozess
lief immer im process.cwd() des Serverprozesses.
Beschreibung: echterStarter (src/claude-code-gateway/prozessstart.ts) baute
execFileOptionen ohne cwd. Ein registriertes Projekt mit eigenem Repo-Pfad
konnte den Claude-Code-Kindprozess dadurch strukturell nicht in seinem
eigenen Arbeitsverzeichnis starten — Dateizugriff und
.claude/skills/-Discovery liefen immer gegen ai-workforce selbst.
Fundstelle: src/claude-code-gateway/prozessstart.ts (echterStarter).
Auswirkung: hoch für F25 — ohne Behebung wäre ein Mehrprojektbetrieb
strukturell unmöglich gewesen (jedes Projekt hätte de facto gegen
ai-workforce gelesen/geschrieben).
Maßnahme: StarterOptionen.cwd (additiv, optional) bis execFiles natives
cwd-Feld durchgereicht (F25 WS-1, AK3) — Kette: StarterOptionen ->
execFileOptionen (claude-code-gateway), CodexGatewayOptionen ->
execFileOptionen (codex-gateway, dieselbe Lücke real gefunden und mit
behoben), GatewayOptionen -> starteProzess, AusfuehrungsOptionen ->
execution-controller (beide Worker-Zweige), VERBOTENE_OPTIONEN_FELDER
ergänzt. erzeugeRequestHandler/baueProjektHandlerMap setzen cwd
projektspezifisch aus dem Registereintrag.
Feature/Run: F25 WS-1, 17.09.2026.

**F-415** · `BUG` · P1 · **gelöst**
Titel: starteProzess verlor cwd beim Bau von starterOptionen — real erst im
AK8-Zwei-Projekte-Test aufgefallen, nicht durch gemockte Gates.
Beschreibung: src/claude-code-gateway/prozessstart.ts' starteProzess baute
starterOptionen bislang über eine benannte Feldliste (`{ zeitgrenzeMs,
abbruchSignal, stdinLeer }`) statt eines Spreads — ein neu hinzugefügtes
Feld wie cwd erreichte den eigentlichen Starter (echterStarter) dadurch
NIE, obwohl jede vorgelagerte Schicht (erzeugeRequestHandler,
execution-controller, starteGateway) es korrekt bis in starteProzess'
eigenes optionen-Objekt durchreichte. Der erste reale AK8-Lauf gegen
Projekt B las dadurch tatsächlich eine Datei in ai-workforce statt im
registrierten Projekt — strukturell unbemerkt von allen zuvor grün
gelaufenen, gemockten Gate-Prüfungen (check-f25-projekte.mjs (2b) prüfte
nur bis zur fuehreAufgabeDurchFn-Grenze, eine Ebene VOR diesem Bug).
Fundstelle: src/claude-code-gateway/prozessstart.ts, starteProzess
(starterOptionen-Konstruktion).
Auswirkung: hoch — ohne den realen Zwei-Projekte-Test (AK8) wäre F25 WS-1
mit vollständig grünem `npm run check` freigegeben worden, obwohl das
Kernversprechen (Kindprozess läuft im richtigen Projekt) strukturell nicht
funktionierte. Bestätigt den Wert eines echten End-to-End-Realtests
gegenüber rein gemockten Gate-Läufen.
Maßnahme: cwd in starterOptionen ergänzt (eine Zeile). Gate
check-f25-projekte.mjs um Abschnitt (2c) erweitert: ruft starteProzess
direkt mit einem Attrappen-Starter auf und prüft cwd genau an dieser
Stelle — Rot-Fall vor der Korrektur real reproduziert und dokumentiert
(features/F25/nachweis-ws1.md).
Feature/Run: F25 WS-1, AK8-Realtest, 17.09.2026.

**F-417** · `TECH_DEBT` · P2 · gelöst
Titel: check-f25-projekte.mjs (2c) verwendete ein hartkodiertes
Windows-Pfad-Literal als Test-startziel — nicht plattformportabel.
Beschreibung: Der (2c)-Rot-Fall-Test rief starteProzess mit
['C:\\Program Files\\claude\\claude.exe'] als startziel[0] auf.
pruefeStartziel prüft zuerst, ob startziel[0] laut node:path resolve()
bereits absolut ist — ein Windows-Literal besteht diese Prüfung auf einem
POSIX-Laufzeitsystem nie, der Test scheiterte dort unabhängig vom
eigentlichen cwd-Verhalten. Das etablierte Repo-Muster für einen
plattformunabhängig echten, absoluten Pfad in Tests
(GUELTIGES_STARTZIEL = [process.execPath],
src/claude-code-gateway/claude-code-gateway.test.ts:47) wurde hier nicht
verwendet.
Fundstelle: scripts/check-f25-projekte.mjs, Abschnitt (2c).
Auswirkung: mittel — AK9s Kalibrierung für genau den kritischen F-415-Fix
war dadurch nur auf einer bestimmten Plattform aussagekräftig.
Maßnahme: startziel[0] auf process.execPath umgestellt (Muster
GUELTIGES_STARTZIEL), real auf diesem Windows-Rechner grün bestätigt
(node scripts/check-f25-projekte.mjs, npm run check). Kein separater
realer Lauf auf einem POSIX-System durchgeführt (keine Linux-Umgebung in
dieser Sitzung verfügbar) — die Plattformunabhängigkeit folgt daraus,
dass process.execPath dieselbe Konstruktion ist, auf die sich der Rest des
Repos (claude-code-gateway.test.ts u. a.) bereits stützt, nicht aus einem
zweiten eigenständigen Nachweis hier.
Feature/Run: F25 WS-1, Challenge-Verifikation, 17.09.2026.

**F-418** · `BUG` · P1 · **gelöst**
Titel: api.js' mitPraefix() verkettete den vollen bisherigen
'/api/...'-Pfad hinter dem Projekt-Präfix — /api/api/... (404), real erst
im AK15-Browser-Realtest aufgefallen, nicht durch ein Gate.
Beschreibung: scripts/leitstand-server.mjs' erzeugeMultiProjektDispatcher
(F25 WS-1) erwartet für ein präfigiertes Projekt
/api/projekte/<id>/<Rest-Pfad OHNE eigenes '/api'> — er setzt selbst ein
'/api' vor den Rest nach der id. api.js' erste Fassung von mitPraefix()
verkettete stattdessen den vollen bisherigen '/api/...'-Literal hinter den
Projekt-Präfix ('/api/projekte/projekt-b' + '/api/laeufe'), was
/api/projekte/projekt-b/api/laeufe ergab — der Dispatcher baute daraus
/api/api/laeufe, eine nicht existierende Route (404, kein JSON-Body,
r.json() wirft, vom Zustands-Poll als "Aktualisierung fehlgeschlagen"
gemeldet). Der isolierte api.js-Unit-Test (check-f25-projekte.mjs,
Abschnitt (6)) hatte das nicht gefangen, weil er nur gegen seine EIGENE,
damals ebenfalls falsche Erwartung prüfte, nicht gegen den echten
Dispatcher.
Fundstelle: public/leitstand/api.js (mitPraefix); erzeugeMultiProjektDispatcher,
scripts/leitstand-server.mjs (F25 WS-1, unverändert korrekt).
Auswirkung: hoch für WS-2a — ohne den realen Zwei-Projekte-Browser-Test
wäre die Projekt-Umschaltung mit grünem check-f25-projekte.mjs (6)
freigegeben worden, obwohl jeder Endpunkt außer holeProjekte() für ein
präfigiertes Projekt strukturell 404 geliefert hätte.
Maßnahme: mitPraefix() trägt seither nur noch Rest-Pfade ohne eigenes
'/api' (Default-Präfix '/api' statt ''), jeder Aufrufer in api.js
entsprechend umgestellt. Gate-Abschnitt (7) ergänzt (echter
erzeugeMultiProjektDispatcher, kein Fetch-Stub) — schließt die Lücke, die
(6) allein offen ließ. Beleg: features/F25/nachweis-ws2a.md.
Feature/Run: F25 WS-2a, AK15-Realtest, 17.09.2026.

**F-419** · `BUG` · P1 · **gelöst**
Titel: Aktiver Projekt-Kontext ging bei jedem Seiten-Reload kommentarlos
auf ai-workforce zurück — reine In-Memory-Variable, kein Hinweis, kein
Bestätigungsdialog.
Beschreibung: public/leitstand/projekt-kontext.js hielt das aktive
Projekt ursprünglich nur in einer Modul-Variable. Ein Browser-Reload
initialisiert das Modul neu (Rücksprung auf STANDARD_PROJEKT
'ai-workforce'), der Hash blieb dabei aber erhalten (z. B. '#/projekt') —
ein Schreibvorgang (z. B. "Auftrag anlegen") direkt nach einem
unbeabsichtigten Reload wäre dadurch unbemerkt im falschen Projekt
gelandet. Einzige Rückmeldung war die leicht zu übersehende Kopfzeile.
Fundstelle: public/leitstand/projekt-kontext.js.
Auswirkung: hoch — jeder F5-Druck oder versehentliche Reload während
einer aktiven Projekt-Umschaltung war betroffen, ohne dass ein Fehler
sichtbar wurde (aus Systemsicht ein gültiger, nur unerwarteter
Schreibvorgang).
Maßnahme: projekt-kontext.js merkt sich das aktive Projekt in
sessionStorage (überlebt einen Reload, nicht aber ein neues Tab/Fenster)
und stellt es beim Modul-Laden wieder her, bevor app.js irgendeine View
initialisiert. Real mit einem echten Page.reload im Browser-Realtest
nachgewiesen (features/F25/nachweis-ws2a.md).
Feature/Run: F25 WS-2a, QA-Pass, 17.09.2026.

**F-423** · `BUG` · P1 · gelöst
Titel: Jarvis-Chat mit Codex-Worker scheitert real IMMER —
schemas/ergebnis-jarvis.schema.json nutzt 'allOf', das Codex'
'--output-schema' (response_format) nicht akzeptiert.
Beschreibung: Real gegen den echten Leitstand-Prozess beobachtet
(F26 WS-2a, echter curl-Nachweis, startvorlagen/ai-workforce.json mit
konfiguriertem und verfügbarem Codex-Worker): POST /api/chat löst
worker 'codex' aus (loeseRessourcenAuf meldet ihn verfügbar), der
Kindprozess bricht mit exitCode 1 und
`{"type":"error","error":{"code":"invalid_json_schema","message":"Invalid
schema for response_format 'codex_output_schema': In context=(),
'allOf' is not permitted."}}` ab — der Lauf endet real
ABGESCHLOSSEN/FEHLGESCHLAGEN. Ursache: die WS-1-QA-Korrektur an
schemas/ergebnis-jarvis.schema.json (art/auftrag/aktion-Kopplung über
allOf/if/then) macht das Schema für Codex' Structured-Output-Endpunkt
strukturell ungültig — WS-1s realer Nachweis (nachweis-ws1.md) lief
ausschließlich über den claude-code-Fallback, weil zu dem Zeitpunkt kein
Codex-Worker konfiguriert/verfügbar war; die Inkompatibilität wurde
dadurch nie real getroffen.
Fundstelle: schemas/ergebnis-jarvis.schema.json (allOf/if/then-Block);
betrifft POST /api/chat (scripts/leitstand-server.mjs) für jeden Aufruf
mit verfügbarem Codex-Worker.
Auswirkung: hoch für den Codex-Pfad — Jarvis-Chat ist mit Codex
praktisch unbenutzbar (jeder Lauf endet FEHLGESCHLAGEN, nie ERFOLGREICH,
kein Lineage-Eintrag). Kein Datenverlust, kein stiller Fehler (der
Rotfall wird korrekt als FEHLGESCHLAGEN klassifiziert und schreibt
bewusst keinen Lineage-Eintrag, siehe POST /api/chat nachLauf-Callback).
Der claude-code-Fallback bleibt unverändert funktionsfähig (real
ERFOLGREICH nachgewiesen, F26 WS-2a).
Maßnahme: Schema umgebaut (kein 'allOf'/'if'/'then'/'oneOf' mehr; 'auftrag'/
'aktion'/'bezug' top-level 'required' mit Typ ["object","null"] statt
optional — Spike gegen Codex-CLI 0.153.4 vor dem Umbau ergab, dass Codex
JEDE 'properties'-Eigenschaft in 'required' verlangt und Optionalität nur
über einen Typ-Union mit 'null' zulässt, 'oneOf' immer ablehnt), die drei
Kopplungen (art→auftrag/aktion, aktion.typ 'anpassen'→bezug.auftrag_id)
ausschließlich noch in validiereErgebnisJarvis erzwungen (src/jarvis/
index.ts) — ein fehlendes Feld und ein Feld mit Wert 'null' sind für den
Validator gleichbedeutend, die ältere claude-code-Form (Feld weggelassen)
bleibt dadurch unverändert gültig. Gate scripts/check-f26-jarvis.mjs um
einen Schema-Struktur-Scan und Rot-/Grünfälle für die Codex-Null-Form
erweitert. Real nachgewiesen mit beiden Workern (features/F26/
nachweis-f423.md): Codex-Lauf ABGESCHLOSSEN/ERFOLGREICH statt
FEHLGESCHLAGEN, claude-code-Lauf weiterhin ABGESCHLOSSEN/ERFOLGREICH.
Feature/Run: F26 WS-2a, realer curl-Nachweis gegen den echten
Leitstand-Prozess, 17.09.2026. Gelöst: F26-WS-3-Nachzug, PR
fix/f26-f423-jarvis-schema-codex, 18.09.2026.

**F-428** · `BUG` · P1 · gelöst
Titel: requestHandler ohne try/catch — unbehandelter Wurf hing die Anfrage
endlos statt 500 zu liefern.
Fundstelle: scripts/leitstand-server.mjs, requestHandler.
Maßnahme: behoben in fix/zustand-poll-kosten (#179).
Feature/Run: F26-Begleituntersuchung "Lädt…"-Hänger, 17.09.2026.

**F-429** · `TECH_DEBT` · P2 · gelöst
Titel: kein AbortController im Workflow-Detail-Poll — eine langsame Anfrage
konnte den Verbindungspool des Browsers erschöpfen.
Fundstelle: public/leitstand/api.js, public/leitstand/views/workflows.js.
Maßnahme: behoben in fix/zustand-poll-kosten (#179).
Feature/Run: F26-Begleituntersuchung "Lädt…"-Hänger, 17.09.2026.

**F-430** · `PROCESS_IMPROVEMENT` · P3 · gelöst
Titel: PowerShell curl-Alias (Invoke-WebRequest) löst Sicherheitswarnung statt
echtem HTTP-Request aus.
Maßnahme: dokumentiert, künftige TERMINAL-Blöcke nutzen curl.exe.
Feature/Run: F26-Begleituntersuchung "Lädt…"-Hänger, 17.09.2026.

**F-431** · `BUG` · P1 · gelöst, nativ bestätigt
Titel: GET /api/zustand las bei jedem Poll die komplette Lauf-Historie neu —
62,5s gemessen, App-weites Einfrieren.
Fundstelle: scripts/leitstand-server.mjs, sammleLaeufe/sammleWorkflows.
Maßnahme: behoben in fix/zustand-poll-kosten (#179), nativ nachgemessen:
GET /api/zustand jetzt 0,253s (vorher 64,5s).
Feature/Run: F26-Begleituntersuchung "Lädt…"-Hänger, 17.09.2026.

**F-436** · `TECH_DEBT` · P3 · gelöst
Titel: F-396 und F-402 sind Duplikate.
Beschreibung: Beide tragen den Titel „Kein projektlokaler Ort für Fähigkeiten", beide P1 offen.
Fundstelle: state/findings.md F-396, F-402.
Auswirkung: Doppelzählung im Workboard.
Maßnahme: F-396 als „Duplikat von F-402" geschlossen (dieser PR).
Feature/Run: Challenge F26-Abschluss, 18.09.2026.

**F-437** · `TECH_DEBT` · P3 · gelöst
Titel: GET /api/zustand konnte einen laufenden Lauf nicht von einem nie gestarteten unterscheiden.
Beschreibung: stelleLaufstatusFest (src/checkpoint-store/index.ts) kennt nur KLAERUNG_ERFORDERLICH | ABGESCHLOSSEN | NICHT_GESTARTET — ein gerade laufender Lauf ist im Aggregat darüber nicht von einem nie gestarteten unterscheidbar, ein 'thinking'-Persona-Zustand wäre daraus nicht ableitbar gewesen.
Fundstelle: src/checkpoint-store/index.ts stelleLaufstatusFest; scripts/leitstand-server.mjs GET /api/zustand.
Auswirkung: F28s Zustandsableitung hätte 'thinking' nicht erkennen können.
Maßnahme: GET /api/zustand additiv um aktiverLauf: { aktiv, laufId } aus dem bereits vorhandenen globalerLaufZustand ergänzt (F28 WS-1), keine neue Projektion, kein neuer Endpunkt.
Feature/Run: F28-Challenge, 18.09.2026.

**F-439** · `PROCESS_IMPROVEMENT` · P3 · gelöst
Titel: Keine etablierte Konvention, wann localStorage für UI-Präferenzen zulässig ist.
Beschreibung: projekt-kontext.js lehnt localStorage für Fachzustand ausdrücklich ab (sessionStorage statt dessen, s. dortiger Kopfkommentar) — es gab aber bislang keine dokumentierte Abgrenzung, wann localStorage für reine Nutzer-/Geräte-Präferenzen (ohne Fachzustandsbezug) trotzdem zulässig ist, was bei jeder neuen Präferenz zu einer Einzelfallentscheidung ohne Referenz gezwungen hätte.
Maßnahme: F28 WS-1 etabliert und begründet die Unterscheidung (Fachzustand vs. Nutzerpräferenz) im Kopfkommentar von persona.js; das doppelte Gate (prefers-reduced-motion UND sichtbarer Schalter, Präferenz in localStorage) ist als Muster für künftige Animationen/Präferenzen im Leitstand festgehalten.
Feature/Run: F28-Challenge, 18.09.2026.

**F-467** · `BUG` · P0 · gelöst
Titel: Komplette Tokenschicht in style.css seit WS-1a im Browser nie wirksam — Kopfkommentar schließt sich selbst vorzeitig.
Beschreibung: public/leitstand/style.css Z. 19 (Kopfkommentar) enthielt die Formulierung „(--color-danger-*/--persona-*)". Die Zeichenfolge „-*" gefolgt von „/-" bildet zufällig die CSS-Kommentar-Endsequenz „*/" und schließt den am Dateianfang (Byte 0) geöffneten Kommentar vorzeitig. Der komplette :root-Block (Z. ~54–156: Farbe, Typografie, Abstände, Radien, Schatten, Motion) wurde dadurch von jedem Browser als Teil einer kaputten Regel verworfen — verifiziert per echtem Rendern: document.styleSheets[0].cssRules enthielt keine :root-Regel, obwohl der Quelltext sie enthält. Jede View sah seit WS-1a unformatiert aus, obwohl Markup/Klassen korrekt waren.
Fundstelle: public/leitstand/style.css Z. 19 (Kopfkommentar).
Auswirkung: Design-Token-Schicht (Farbe, Typografie, Abstände, Radien, Schatten, Motion) seit F29 WS-1a im Produkt nie wirksam — reiner Quelltext-Befund, der ohne echtes Rendern nicht auffällt (Regex-Gates prüfen Quelltext, nicht die tatsächliche Browser-Kaskade).
Maßnahme: Zeile umformuliert zu „(--color-danger-* bzw. --persona-*)" — keine „*/"-Sequenz mehr, Kommentar schließt jetzt an seinem echten Ende (Z. 52). Real im Browser verifiziert: getComputedStyle(document.documentElement).getPropertyValue('--color-bg') liefert '#0b0d10'. Siehe [[F-468]] für die Gate-Härtung.
Feature/Run: F29-Challenge, 18.09.2026.

**F-468** · `HARNESS_IMPROVEMENT` · P1 · gelöst
Titel: Kein Gate erkennt einen durch Prosa vorzeitig geschlossenen CSS-Kommentar.
Beschreibung: [[F-467]] blieb unentdeckt, weil scripts/check-f20-design-tokens.mjs den Quelltext nur auf Farbliterale außerhalb des :root-Blocks prüft, nicht auf die Gültigkeit der Kommentarstruktur selbst — ein vorzeitig geschlossener Kommentar am Dateianfang wird von keinem bestehenden Gate erkannt, obwohl er die gesamte nachfolgende Tokenschicht ungültig macht.
Fundstelle: scripts/check-f20-design-tokens.mjs.
Auswirkung: Dieselbe Fehlerklasse (ein zufälliges „*/" in CSS-Prosa) hätte jederzeit erneut unbemerkt eine ganze Regelmenge verwerfen können.
Maßnahme: Gate um eine Zählung von „/*" gegen „*/" in public/leitstand/style.css ergänzt (gleiche Anzahl = Kommentare sauber gepaart). Bewusst NUR für style.css, nicht projektweit für *.js/*.html (YAGNI): CSS kennt ausschließlich Block-Kommentare, jedes „*/" in Prosa ist dort gefährlich; in JS/HTML kommentiert das Projekt layoutnahe Hinweise überwiegend per „//"/„<!-- -->", wo Glob-Prosa (z. B. ein Verzeichnis mit Stern-Platzhalter direkt vor einer Datei- oder Ordnerendung) harmlos ein unausgeglichenes Paar erzeugt — mehrfach real in app.js/index.html/router.js beobachtet, eine blinde projektweite Zählung wäre kein tragfähiges Gate, sondern Dauer-Rauschen. Regressionsgetestet: die F-467-Formulierung reproduziert und vom neuen Check als 1 Befund erkannt.
Feature/Run: F29-Challenge, 18.09.2026.

**F-482** · `PROCESS_IMPROVEMENT` · P2 · erledigt (dieser PR)
Titel: F29-Akte Status veraltet.
Beschreibung: `features/F29/feature.md` stand nach dem Merge von #184–#191
(WS-0 bis WS-D1, alle real gebaut) noch auf `Status:
WORKSTREAM_SCHNITT_GENEHMIGT` statt `ABGESCHLOSSEN` — die Akte hinkte dem
realen Baustand hinterher. F-484 ist ein Duplikat dieses Befunds, ebenfalls
erledigt.
Fundstelle: features/F29/feature.md (Status-Feld, vor diesem PR).
Auswirkung: Falsche Phasenauskunft für jede Sitzung, die die Akte statt
`docs/STATUS.md` liest.
Maßnahme: Status auf `ABGESCHLOSSEN` gesetzt, Feature Review mit WS-1a–
WS-2c, dem P0-Fund [[F-467]]/[[F-468]] und der Korrekturrunde WS-D1/D2
nachgetragen (dieser PR).
Feature/Run: F29/F30-Challenge, 20.09.2026.

**F-488** · `BUG` · P1 · erledigt (#194)
Titel: Jarvis-Chat ist gedächtnislos.
Beschreibung: `baueJarvisAuftragstext` (src/jarvis/index.ts) baut den
Auftragstext ausschließlich aus der aktuellen Nachricht (Parameter
`nachricht: string`) — kein Verlaufsparameter. `POST /api/chat`
(scripts/leitstand-server.mjs) ruft es als
`baueJarvisAuftragstext(nachricht)` auf und liest den Lineage-Verlauf
(`chat-<projektId>`) an dieser Stelle nicht. Rückfragen im Chat, die sich
auf eine frühere Nachricht beziehen, funktionieren dadurch nicht — Jarvis
sieht bei jeder Nachricht nur diese eine Nachricht. Ein künftiger
„Zusammenfassen"-Lauf hätte ebenfalls keinen Verlaufs-Input.
Fundstelle: src/jarvis/index.ts baueJarvisAuftragstext (Z. 188–205);
scripts/leitstand-server.mjs Z. 4502 (Aufrufstelle in POST /api/chat).
Auswirkung: Mehrschrittige Gespräche im Jarvis-Chat sind faktisch nicht
möglich; jede Nachricht steht isoliert.
Maßnahme: F31 WS-2 — begrenztes Verlaufsfenster aus `lineage
chat-<projektId>` (ab letzter Zusammenfassung, max. 8 Turns / 12000
Zeichen) in den Auftragstext aufgenommen. Behoben (#194).
Feature/Run: F29/F31-Challenge, 20.09.2026.

**F-489** · `PROCESS_IMPROVEMENT` · P2 · erledigt (dieser PR)
Titel: WS-1 wurde unter Arbeitsnamen F30 ohne Akte gemergt.
Beschreibung: WS-1 der Jarvis-Chat-Erfahrung (F31, Abbruch-Button, große
Chat-Ansicht) wurde als #192 unter dem Arbeitsnamen F30 gemergt, obwohl
`features/F31/feature.md` zu diesem Zeitpunkt nicht existierte.
Fundstelle: features/F31/ (fehlte bis zu diesem PR); Commit #192
('feat(f30-ws1)').
Auswirkung: Eine gemergte Änderung ohne zugehörige Akte ist über
`scripts/check-feature.mjs` nicht prüfbar und im Workboard nicht sichtbar.
Maßnahme: `features/F31/feature.md` nachgezogen (dieser PR), Status
`IN_ARBEIT`, WS-1 im Feature Review nachdokumentiert. Künftig vor dem
ersten Workstream-Merge eines neuen Features die Akte anlegen.
Feature/Run: F29/F31-Challenge, 20.09.2026.

**F-492** · `PROCESS_IMPROVEMENT` · P2 · erledigt (dieser PR)
Titel: Feature-Nummer F30 kollidierte mit dem reservierten M4-Feature F30.
Beschreibung: Die Feature-Nummer F30 wurde für die Jarvis-Chat-Erfahrung
vergeben (Branches feat/f30-*, Commit 'feat(f30-ws1)', PR #192), ohne
Abgleich mit `docs/projekt/zielfassung.md` und `docs/STATUS.md` — beide
führen F30 bereits für „Self- und Team-Dogfooding (Meilenstein-Gate)".
Fundstelle: docs/projekt/zielfassung.md Z. 516; docs/STATUS.md Z. 416;
features/F23/feature.md Z. 538 (Dependency-Verweis auf F30
Dogfooding).
Auswirkung: Zwei unterschiedliche Vorhaben trugen zeitweise dieselbe
Feature-Nummer — Verwechslungsgefahr in Akte, Findings und Roadmap.
Maßnahme: Jarvis-Chat-Erfahrung auf F31 umbenannt (`features/F31/
feature.md`, dieser PR); f30-Branch-/Commitnamen als historischer
Arbeitsname dokumentiert ([[F-489]]). Künftig neue Feature-IDs nur nach
Suche in zielfassung.md, STATUS.md und features/ vergeben.
Feature/Run: F29/F31-Challenge, 20.09.2026.

**F-493** · `PROCESS_IMPROVEMENT` · P3 · erledigt (dieser PR)
Titel: docs/STATUS.md M4-Liste war veraltet.
Beschreibung: Die M4-Feature-Liste führte F28 und F29 noch mit ⏳, obwohl
beide Akten (`features/F28/feature.md`, `features/F29/feature.md`) längst
`Status: ABGESCHLOSSEN` trugen.
Fundstelle: docs/STATUS.md M4-Abschnitt (F28-/F29-Zeilen), vor diesem PR.
Auswirkung: Falsche Phasenauskunft für jede Sitzung, die die M4-Liste statt
der einzelnen Akten liest.
Maßnahme: F28/F29 auf ✅ `ABGESCHLOSSEN` nachgezogen, F31-Zeile ergänzt,
Kopfsatz (Zeile 23) nachgezogen (dieser PR).
Feature/Run: F29/F31-Challenge, 20.09.2026.

**F-494** · `PROCESS_IMPROVEMENT` · P2 · erledigt
Titel: Challenger gab zwei Claude-Code-Sitzungen im selben Arbeitsverzeichnis frei.
Beschreibung: Für die WS-2-Arbeit (Gesprächsgedächtnis) liefen zeitweise
zwei Claude-Code-Sitzungen im selben Arbeitsverzeichnis parallel — ein
Verstoß gegen CLAUDE.md Z. 58-59 (\"Ein Schreiber pro
Arbeitsverzeichnis... parallele Arbeit nur in getrennten
git-Worktrees\"). Von der WS-2-Sitzung selbst erkannt, kein Schaden
entstanden.
Fundstelle: CLAUDE.md Z. 58-59 (Arbeitsweise-Abschnitt); WS-2-Sitzung
(F31), 20.09.2026.
Auswirkung: Kein realer Schaden in diesem Fall, aber strukturelles Risiko
für Race Conditions auf gemeinsamen Dateien (Checkpoint-Store, Lock-Dateien)
bei echter Kollision zweier Schreiber.
Maßnahme: Parallele Läufe künftig nur noch mit `git worktree` statt
mehrerer Sitzungen im selben Ordner.
Feature/Run: F31, 20.09.2026.

**F-495** · `TECH_DEBT` · P3 · erledigt (dieser PR)
Titel: Doku-Nachzug nach WS-2-Merge fehlte.
Beschreibung: WS-2 (Gesprächsgedächtnis + „Zusammenfassen & neu starten")
wurde als #194 gemergt, ohne dass `features/F31/feature.md` und
`state/findings.md` im selben Zug auf den neuen Stand gebracht wurden.
Fundstelle: features/F31/feature.md (WS-2-Zeile vor diesem PR); F-488 vor
diesem PR.
Auswirkung: Akte und Findings liefen dem tatsächlichen Baustand hinterher.
Maßnahme: features/F31/feature.md (WS-2 gemergt, WS-3 umbenannt,
Typewriter zurückgestellt) und F-488 (erledigt) in diesem PR nachgezogen.
Feature/Run: F31, 20.09.2026.

**F-496** · `BUG` · P1 · erledigt (#194)
Titel: Zusammenfassung fiel nach maxTurns Folgeturns aus dem Verlaufsfenster.
Beschreibung: Der Zusammenfassungs-Turn (`istZusammenfassung: true`) war
im Verlaufsfenster nicht gesondert behandelt — nach genügend weiteren
Turns rutschte er wie jeder andere Turn aus dem 8-Turns/12000-Zeichen-
Fenster heraus. Jarvis verlor damit genau den Kontext, den die
Zusammenfassung eigentlich dauerhaft verfügbar halten sollte.
Fundstelle: src/jarvis/index.ts waehleVerlaufsfenster (WS-2, vor der
Korrektur in #194).
Auswirkung: „Zusammenfassen & neu starten" verlor nach einigen weiteren
Nachrichten stillschweigend genau die Information, die es sichern sollte.
Maßnahme: Zusammenfassungs-Turn im Verlaufsfenster gepinnt — fällt nicht
mehr aus dem Fenster, unabhängig davon, wie viele Turns danach folgen.
Behoben (#194).
Feature/Run: F31, 20.09.2026.

**F-502** · `HARNESS_IMPROVEMENT` · P1 · erledigt (F31 WS-3c)
Titel: E-187 (MCP-Begrenzung im Ausführungslauf) für alle Rollen außer
Jarvis weiterhin nicht umgesetzt.
Beschreibung: `docs/projekt/zielfassung.md` §9.1 führte die Zeile
„MCP-Werkzeuge im Ausführungslauf" als `DEKLARIERT` (E-187):
`--tools`/`--allowedTools` begrenzen den Werkzeugsatz des Modells, aber
nicht, welche MCP-Server für den Lauf geladen werden. F31 WS-3b hat das
real bestätigt (`claude --output-format stream-json`-Init-Nachricht im
Repo-Ordner: zwei Account-MCP-Server `claude.ai Claude Docs`/
`claude.ai Google Drive` laden und acht `mcp__claude_ai_Claude_Docs__*`-
Werkzeuge erscheinen im Werkzeugsatz, obwohl Jarvis nur Read/Grep/Glob
über `--tools`/`--allowedTools` erlaubt bekommt) und für die Rolle `jarvis`
über `--strict-mcp-config --mcp-config '{"mcpServers":{}}'`
(`AufrufEingaben.mcpConfig`) geschlossen.
Fundstelle: `docs/projekt/zielfassung.md` §9.1 (Tabellenzeile „MCP-Werkzeuge
im Ausführungslauf"), §9.4 E-187; `src/claude-code-gateway/index.ts`
`baueAufruf` (vor F31 WS-3b: keine MCP-Begrenzung, für keine Rolle).
Auswirkung: Jede Rolle außer `jarvis` startete weiterhin mit ungeprüft
geladenen Account-MCP-Servern und deren vollem Werkzeugsatz im
Modellkontext — ein realer, wenn auch bislang nicht als Rot-Fall
demonstrierter Seitenkanal an E-187 vorbei (Capability-Modell nach Wirkung,
Zeile „Capability-Modell nach Wirkung" im selben §9.1, ebenfalls
`DEKLARIERT`).
Maßnahme: MCP-Begrenzung (`--strict-mcp-config` + leere `--mcp-config`,
Muster `jarvis`) für jede Rolle eingeführt — `baueAufruf` hängt die Flags
jetzt standardmäßig an jeden Aufruf an, `AufrufEingaben.mcpConfig`
überschreibt nur noch den Wert statt Vorhandensein/Fehlen zu steuern. Für
eine schreibende Rolle (`ausfuehrung`, `Read,Grep,Glob,Write,Edit`) real im
Rot-/Grün-Fall nachgewiesen (`features/F31/nachweis-mcp-begrenzung.md`):
`mcp_servers` von zwei Einträgen auf `[]`, Wall-Clock-Median ≈2,49s
schneller (≈31%), ≈3.074 Tokens Median je Lauf gespart (≈14,9%).
`docs/projekt/zielfassung.md` §9.1 auf `ERZWUNGEN` hochgestuft. Klarstellung
(Reviewer-Befund): der Schutz kommt hier NICHT aus einer Erweiterung von
E-188s Gültigkeitsschlüssel (`src/invocation-policy/index.ts` prüft
weiterhin nur `werkzeug_konfiguration_hash`, `schutzskript_hashes`,
`werkzeug_version_deklariert`, `berechtigungskontext`,
`arbeitsverzeichnis_pfad`, `startziel_pfad` — die CLI-Flags von `baueAufruf`
sind darin nicht enthalten und werden vom Laufzeit-Drift-Vergleich nicht
erfasst), sondern ausschließlich aus `baueAufruf`s Quellcode selbst (fester,
unbedingter Default) plus dem Regressionsschutz durch Unit-Tests und das
Gate-Skript. Kein neuer Gültigkeitsschlüssel-Bestandteil nötig, aber auch
keine E-188-Laufzeitgarantie — nur ein Codeänderung an `baueAufruf` selbst
könnte die Begrenzung wieder entfernen, ein E-188-Drift-Check würde das
nicht auffangen.
Feature/Run: F31 WS-3b (jarvis), F31 WS-3c (alle Rollen), 20.09.2026.

**F-503** · `PROCESS_IMPROVEMENT` · P3 · erledigt (F31 WS-3b)
Titel: Challenger-Prompts widersprachen ARCHITECTURE.md §7 („Pauschales
Stagen des Arbeitsbaums").
Beschreibung: Frühere Challenger-Prompts enthielten `git add -A` als
Beispiel-/Anleitungstext, obwohl ARCHITECTURE.md §7 pauschales Stagen des
Arbeitsbaums ausnahmslos verbietet (ein Commit stagt ausschließlich explizit
benannte Pfade).
Fundstelle: frühere Challenger-Prompt-Vorlagen (kein konkreter Dateipfad in
diesem Repo — Prompt-Text externer Sitzungen).
Auswirkung: Ein befolgter Challenger-Prompt hätte §7 real verletzt.
Maßnahme: Künftige Challenger-Prompts nennen ausschließlich explizite
Pfade statt `git add -A`/`git add .`. Für diesen PR beachtet (kein
pauschales Stagen verwendet).
Feature/Run: F31 WS-3b, 20.09.2026.

**F-505** · `PROCESS_IMPROVEMENT` · P1 · erledigt (docs/m5-entscheidungen)
Titel: M5-Plan setzt „M4 eingefroren" voraus, das M4-Gate ist real aber nicht erfüllt.
Beschreibung: F30 ist nicht begonnen, F25 WS-2b/WS-3 sind offen, F23 steht auf `FEATURE_GATE`; F19-Akte (`FEATURE_GATE`) widerspricht `docs/STATUS.md` („abgeschlossen").
Fundstelle: M5-Plan v8 §0.1; `docs/projekt/zielfassung.md` §13.5; `features/F19/feature.md` gegen `docs/STATUS.md`.
Auswirkung: „M4 eingefroren" ist eine Setzung, kein Befund.
Maßnahme: E-M5-1 umgesetzt (M4 mit benannten Übertragungen nach F30 geschlossen, `docs/projekt/zielfassung.md` §13.5-Nachtrag); F19-Statusdrift behoben (F19/F23 Status → `ABGESCHLOSSEN`, `docs/STATUS.md`/`features/F19/feature.md`/`features/F23/feature.md` konsistent).
Feature/Run: M5-Plan-v8-Challenge, 20.09.2026. Quelle: Challenger-Übergabe claude/277.

**F-513** · `PROCESS_IMPROVEMENT` · P2 · erledigt (Arbeitsregel, 20.09.2026)
Titel: Übergaben nannten wiederholt einen falschen Repo-Pfad.
Beschreibung: Genannt war `C:\Users\stefa\ai-workforce`, richtig ist `C:\Users\stefa\Projekte\ai-workforce`.
Fundstelle: Terminal- und Claude-Code-Blöcke älterer Übergaben.
Auswirkung: Befehle liefen gegen einen falschen Pfad.
Maßnahme: Vollständigen korrekten Pfad in jeden Block schreiben (Arbeitsregel).
Feature/Run: M5-Übergabe, 20.09.2026. Quelle: claude/278, claude/280.

**F-514** · `TECH_DEBT` · P3 · erledigt (F32 #200, Corpus-Nachweis)
Titel: leseVerbrauch fällt bei fehlendem usage-Unterfeld still auf „kein Verbrauch".
Beschreibung: Alles-oder-nichts ohne Gate; der Corpus-Nachweis ergab 87 Läufe mit 100 % Feldpräsenz.
Fundstelle: `leseVerbrauch` (claude-code-gateway, F32).
Auswirkung: F32 hätte sonst still nie Daten geschrieben.
Maßnahme: Corpus-Nachweis (erbracht).
Feature/Run: F32 WS-0/WS-1, 20.09.2026. Quelle: claude/280, claude/281.

**F-518** · `TECH_DEBT` · P3 · erledigt
Titel: ?von= und ?bis= in GET /api/verbrauch haben keine Formatprüfung.
Beschreibung: Vertauschte oder ungültige Grenzen lieferten still ein leeres Ergebnis.
Fundstelle: `GET /api/verbrauch`.
Auswirkung: Leeres Ergebnis ohne Fehlerhinweis.
Maßnahme: Formatprüfung mit 400 bei ungültigen Werten.
Status: erledigt (24.09.2026) — von der Workforce SELBST gebaut, F39 Versuch 4 (Workflow `router-9d5fedcb-dead-417f-a61f-c374a167ba73`: Ausführung `9397a9dd`, Review BLOCKIERT mit 3 Befunden, Korrektur `39b9288c`, Review `2d67e04e` BEREIT_NACH_KORREKTUR, von Stefan ANGENOMMEN). Formatregel (Stefan-Entscheidung 24.09.): „YYYY-MM-DD und ISO-8601 werden angenommen, Kalenderdatum streng geprüft, Vergleich nach Zeitwert, Fehler = status 'fehler' + HTTP 400" — konkret nimmt `baueVerbrauchsProjektion` (`scripts/leitstand/routen-verbrauch.mjs`) sowohl `YYYY-MM-DD` als auch einen vollen ISO-8601-Zeitstempel an, prüft das Kalenderdatum per Rückvergleich statt rohem `Date.parse` (das z. B. `2026-02-30` sonst still auf März umrollt), vergleicht `von`/`bis` nach Zeitwert statt Zeichenkette (unterschiedlich lange ISO-Formen sind nicht string-ordnungsgleich zu ihrer Zeitordnung) und liefert bei Verstoß `{ status: 'fehler', grund, code: 'zeitraum_ungueltig' }`; `GET /api/verbrauch` (`scripts/leitstand-server.mjs`) bildet `code === 'zeitraum_ungueltig'` auf HTTP 400 ab, ein echter IO-Fehler (ohne `code`) bleibt unverändert `{ status: 'fehler', grund }` → 200 (F-603-Fix unangetastet). Regressionsschutz in `scripts/check-f32-verbrauch-ansicht.mjs`.
Feature/Run: F32 WS-0/WS-1, 20.09.2026; F39 Versuch 4, 24.09.2026. Quelle: claude/280, claude/f39-versuch4-workforce-baut-f518.

**F-521** · `PROCESS_IMPROVEMENT` · P1 · erledigt (E3′, 20.09.2026)
Titel: M5-Ergänzung §8 behauptete eine E3-Entscheidung entgegen der gegebenen Antwort.
Beschreibung: Aufgelöst als E3′ = A′: `features/<id>/feature.md` ist der PlanV1 auf Feature-Ebene.
Fundstelle: M5-Ergänzung „Architecture & Technical Design" §8.
Auswirkung: Drohte als falsch dokumentierte Entscheidung.
Maßnahme: E3′ (Entscheidung Stefan).
Feature/Run: Challenge Architecture & Technical Design, 20.09.2026. Quelle: claude/279.

**F-522** · `PROCESS_IMPROVEMENT` · P2 · **erledigt**
Titel: Zwei verschiedene Mechaniken heißen architecture-advisor.
Beschreibung: Claude-Code-Subagent (Harness) und Workforce-Rolle (in `hoch.json` mit Codex); eine Änderung am einen wirkt nicht auf den anderen.
Fundstelle: `.claude/agents/architecture-advisor.md`; `src/rollen/index.ts`.
Auswirkung: Verwechslungsgefahr bei Änderungen.
Maßnahme: Begriffsklärung in `docs/harness/HARNESS-GLOSSARY.md` mit F39 WS-1 — real sind es DREI Dinge, nicht zwei: (1) der Harness-Subagent `.claude/agents/architecture-advisor.md` (prüft Pläne außerhalb jeder `WORKFLOW_V0`-Kette), (2) die Workforce-Rolle `architecture-advisor` (`src/rollen/index.ts`, lesend, `output_schema: null`) — DAS ist der reale Prüfer im `hoch`-Workflow, Schritt 1 in `workflow-vorlagen/hoch.json` mit Worker `codex` —, und (3) die neue Workforce-Rolle `architekt` (F39, Autor), die in F39 WS-2 als Schritt VOR (2) eingehängt wird. Eine erste Fassung des Glossars (F39 WS-1) hatte (1) und (2) fälschlich zusammengefasst; korrigiert in derselben Iteration (Korrekturrunde 23.09.2026) — `docs/harness/HARNESS-GLOSSARY.md` trägt jetzt drei eigene Zeilen, `src/rollen/index.ts` (Kopfkommentar) und `features/F39/feature.md` sind nachgezogen.
Feature/Run: Challenge Architecture & Technical Design, 20.09.2026; korrekt aufgelöst im F39-WS-1-Auftrag, Korrekturrunde 23.09.2026. Quelle: claude/279, claude/f39-ws1-architekt.

**F-529** · `PROCESS_IMPROVEMENT` · P2 · erledigt (Worktree aufgeräumt)
Titel: Unbekannter Worktree ai-workforce-b6, im M5-Schnitt nicht dokumentiert.
Beschreibung: `f8d11f6` ist Vorfahr von `origin/main` mit 0 eigenen Commits; Altlast vom 23.08.2026.
Fundstelle: `C:\Users\stefa\claude-worktrees\ai-workforce-b6`.
Auswirkung: Keine Kollisionsgefahr.
Maßnahme: Entfernt.
Feature/Run: Repo-Stand-Verifikation, 20.09.2026. Quelle: claude/281, claude/282, claude/292.

**F-530** · `TECH_DEBT` · P2 · erledigt (F33 neu aufgesetzt, #201)
Titel: Fortschritt im F33-Worktree war nicht verifiziert.
Beschreibung: Null Commits, null geänderte Dateien, Basis vor dem F32-Merge.
Fundstelle: Worktree `ai-workforce-f33`, Branch `feat/f33-ws1-projektkontext`.
Auswirkung: F33 war faktisch nicht begonnen.
Maßnahme: F33 neu von `fc68d2d` aufgesetzt.
Feature/Run: Repo-Stand-Verifikation, 20.09.2026. Quelle: claude/281, claude/282.

**F-533** · `BUG` · P1 · erledigt (#201)
Titel: docs/projekt/roadmap.json widersprach Entscheidung E1.
Beschreibung: M4 stand auf `LAEUFT`, M5 fehlte, bei M1 fehlten F6a/F6b/F7.
Fundstelle: `docs/projekt/roadmap.json`.
Auswirkung: Jarvis hätte einen falschen Projektstand behauptet.
Maßnahme: roadmap.json korrigiert.
Feature/Run: F33 WS-0/WS-1, 21.09.2026. Quelle: claude/283, claude/284.

**F-534** · `PROCESS_IMPROVEMENT` · P1 · erledigt (docs/m5-entscheidungen)
Titel: Entscheidungen und Findings, die nur im Claude-Projekt stehen, erzeugen falsche Repo-Artefakte.
Beschreibung: Claude Code leitet korrekt aus der veralteten Sollquelle ab. Findings F-505 bis F-584 waren nur in Challenger-Übergaben dokumentiert, `state/findings.md` endete bei F-504; Entscheidungen E1–E5 (M5) fehlen in `zielfassung.md` §13.6.
Fundstelle: `docs/projekt/zielfassung.md` §13.6 (fehlt); `state/findings.md`.
Auswirkung: Falscher Projektkontext (z. B. roadmap.json, Lagebild ohne neuere P1-Findings).
Maßnahme: Findings-Nachtrag F-505 bis F-584 (PR #209, Teil 1); `zielfassung.md` §13.6 mit E-M5-1…5, 3′, 10, 11 ergänzt, §13.5-Fakt-Nachtrag zum M4-Abschluss, `docs/STATUS.md`/`features/F19/feature.md`/`features/F23/feature.md` nachgezogen (docs/m5-entscheidungen, Teil 2, erledigt). Künftig jedes Finding sofort im Umsetzungs-PR eintragen.
Feature/Run: F33 WS-0/WS-1, 21.09.2026. Quelle: claude/283.

**F-535** · `TECH_DEBT` · P2 · erledigt (#201)
Titel: filtereExistierendeAnfragen übersprang fehlende Kontextdateien ohne Signal.
Beschreibung: Kein Ereignis, kein Log; jetzt `console.warn` je fehlender Datei.
Fundstelle: `scripts/leitstand-server.mjs` (`filtereExistierendeAnfragen`).
Auswirkung: Jarvis hätte still ohne Kontext geantwortet.
Maßnahme: Warnung je fehlender Datei.
Feature/Run: F33 WS-0/WS-1, 21.09.2026. Quelle: claude/283, claude/284.

**F-538** · `TECH_DEBT` · P2 · erledigt (Qualität belegt; Latenz → F-540)
Titel: Antwortqualität und Latenz von Jarvis mit Projektkontext waren nicht belegt.
Beschreibung: Qualität nach dem Merge aus dem Hauptrepo belegt; Latenz betrug 102 s und wurde als F-540 weitergeführt.
Fundstelle: Lauf `jarvis-jarvis-chat-ac9204a1-…`.
Auswirkung: Latenz war nicht nutzbar.
Maßnahme: Echter Jarvis-Turn nach dem Merge (erbracht).
Feature/Run: F33, 21.09.2026. Quelle: claude/284, claude/285.

**F-540** · `BUG` · P1 · erledigt (#202, #204, #206, #207)
Titel: Jarvis-Chat brauchte 102 s bis zur sichtbaren Antwort.
Beschreibung: Server ≈37 s plus ≈65 s Lücke im Client. Nach fix/jarvis-latenz und F40 WS-1 bis WS-3 real 3–7 s je Statusfrage (1 Turn, `state/nachweis-jarvis-latenz.md` Abschnitt „F40 WS-3").
Fundstelle: Lauf `ac9204a1`; `public/leitstand/views/chat.js`.
Auswirkung: Chat war nicht nutzbar.
Maßnahme: fix/jarvis-latenz (#202), F40 WS-1 bis WS-3.
Feature/Run: F33-Nachweis, 21.09.2026. Quelle: claude/285, claude/308.

**F-541** · `BUG` · P1 · erledigt (#202)
Titel: Gateway schloss stdin des claude-Prozesses nicht (3 s Wartezeit je Lauf).
Beschreibung: Feste Wartezeit von 3 s bei jedem Lauf jeder Rolle; Fix `stdio[0]='ignore'`, danach stderr in 5/5 Läufen leer.
Fundstelle: `src/claude-code-gateway/prozessstart.ts`.
Auswirkung: 3 s Latenz je Lauf.
Maßnahme: stdin nicht als Pipe öffnen.
Feature/Run: fix/jarvis-latenz, 21.09.2026. Quelle: claude/285.

**F-542** · `TECH_DEBT` · P2 · erledigt (#202)
Titel: jarvis lief für Chat-Antworten mit Extended Thinking.
Beschreibung: 814 Thinking-Tokens, Time-to-first-token 9 s; mit `MAX_THINKING_TOKENS=0` 2–4 s.
Fundstelle: Jarvis-Pfad, `aufrufEingaben.umgebungsvariablen`.
Auswirkung: Hohe Latenz bis zum ersten Token.
Maßnahme: Thinking für jarvis abgeschaltet.
Feature/Run: fix/jarvis-latenz, 21.09.2026. Quelle: claude/285, claude/286.

**F-543** · `BUG` · P0 · erledigt (#202)
Titel: Jarvis-Ergebnis mit Vertragsverstoß endete als ERFOLGREICH, aber ohne Chat-Eintrag.
Beschreibung: UI wartete endlos, 2 von 5 Läufen betroffen (Prosa plus Codezaun). Behoben durch robuste Extraktion und sichtbaren Fehler-Eintrag.
Fundstelle: Jarvis-Ergebnisverarbeitung; Gate `check-f31-gedaechtnis.mjs` (i)/(j).
Auswirkung: Antworten gingen verloren, Chat faktisch unbenutzbar.
Maßnahme: Robuste JSON-Extraktion, Fehler-Chat-Eintrag, schärferer Ausgabevertrag.
Feature/Run: fix/jarvis-latenz, 21.09.2026. Quelle: claude/286, claude/287.

**F-544** · `TECH_DEBT` · P2 · erledigt
Titel: Latenz-Hebel wirken nur auf dem claude-code-Pfad, nicht auf Codex.
Beschreibung: Mit `startvorlagen/ai-workforce.json` läuft Jarvis auf Codex; hängt an F-391.
Fundstelle: `startvorlagen/ai-workforce.json`.
Auswirkung: Auf dem Codex-Pfad wirken die Fixes nicht.
Maßnahme: Bei F37 (Worker-Wahl) gleichziehen oder Jarvis fest auf claude-code setzen.
Status: erledigt (F45 B0, 10.10.2026): Chat-Rollen laufen fest auf claude-code (KONFIGURATION_JARVIS/KONFIGURATION_PRODUCT_COACH.worker, starteRollenChatLauf in scripts/leitstand-server.mjs), unabhängig von der Startvorlage. Vorher-Messung: Codex war nicht schneller (K3-Median 6,8 s gegen 5,4 s, features/F45/nachweise/b0/messung-vorher-codex.md); Router und alle anderen Rollen unverändert. Gate scripts/check-f26-jarvis.mjs (h), Test scripts/leitstand-chat-misserfolg.test.mjs.
Feature/Run: fix/jarvis-latenz, 21.09.2026. Quelle: claude/286.

**F-545** · `BUG` · P1 · erledigt (#202)
Titel: UI hatte keinen Endzustand für „terminal, aber kein Chat-Eintrag".
Beschreibung: Jeder Vertragsverstoß führte zu endlosem Warten; mit F-543 behoben.
Fundstelle: `public/leitstand/views/chat.js`.
Auswirkung: Endloses Warten im Chat.
Maßnahme: Warten in jedem terminalen Fall beenden.
Feature/Run: fix/jarvis-latenz, 21.09.2026. Quelle: claude/287.

**F-548** · `BUG` · P1 · erledigt (#202)
Titel: Chat-UI hing nach einem Abbruch auf „Abbruch angefordert".
Beschreibung: Server hatte korrekt beendet; `pruefeAusstehendenLauf` löste nur bei zwei Statuswerten auf.
Fundstelle: `public/leitstand/views/chat.js`, `pruefeAusstehendenLauf`.
Auswirkung: UI blieb blockiert.
Maßnahme: Root-Cause-Fix, Gate bis zur UI-Auflösung, Sicherung im Client.
Feature/Run: fix/jarvis-latenz, 21.09.2026. Quelle: claude/289.

**F-549** · `BUG` · P1 · erledigt (#202)
Titel: Abbruch-Test AK7 in check-f10 lieferte 404 (Test-Wettlauf).
Beschreibung: Keine Regression, sondern eine feste 120-ms-Frist im Mock.
Fundstelle: `scripts/check-f10-leitstand.mjs` AK7.
Auswirkung: Scheinbar roter Test.
Maßnahme: Mock deterministisch gemacht.
Feature/Run: fix/jarvis-latenz, 21.09.2026. Quelle: claude/290.

**F-551** · `BUG` · P1 · erledigt (#202, Browsertest 2/2)
Titel: Abbruch aus dem Browser war wirkungslos (UI-Auflösung hing).
Beschreibung: Der Server brach korrekt ab, die UI-Auflösung hing (siehe F-555, F-561).
Fundstelle: Chat-Abbruchpfad; `public/leitstand/api.js`, `chat.js`.
Auswirkung: Nutzer sah keine Abbruchwirkung.
Maßnahme: Poll-Fix (F-555) und Zeitlimit (F-561).
Feature/Run: fix/jarvis-latenz, 21.09.2026. Quelle: claude/290, claude/291, claude/297.

**F-552** · `TECH_DEBT` · P1 · erledigt (#202)
Titel: Zeitmessung hatte keine Marken für Terminal-Checkpoint und Chat-Eintrag.
Beschreibung: Mit den ergänzten Marken lag die Nachbereitung bei 18–46 ms.
Fundstelle: Zeitmessung im Server (`LEITSTAND_ZEITMESSUNG`).
Auswirkung: Nachbereitungsdauer war nicht messbar.
Maßnahme: Marken `terminal_checkpoint_geschrieben` und `chat_eintrag_geschrieben`.
Feature/Run: fix/jarvis-latenz, 21.09.2026. Quelle: claude/290, claude/291.

**F-554** · `TECH_DEBT` · P1 · erledigt (#206, #207)
Titel: Jarvis machte bis zu 10 Werkzeug-Runden pro Frage.
Beschreibung: Modellarbeit bis 23 s. Nach Lagebild (#206) und Auto-Memory-Sperre (#207) 5/5 Statusfragen mit 1 Turn ohne Werkzeugaufruf.
Fundstelle: Rohströme der Jarvis-Läufe (`num_turns`); `state/nachweis-jarvis-latenz.md`.
Auswirkung: Latenz-Ausreißer.
Maßnahme: F40 WS-2/WS-3.
Feature/Run: Messung CLI-Overhead, 21.09.2026. Quelle: claude/291, claude/308.

**F-555** · `BUG` · P0 · erledigt (#202)
Titel: GET /api/zustand brauchte im Browser ~110 s und blockierte Laden, Senden und Abbruch.
Beschreibung: Poll-Abfragen überlappten ohne Schutz. Fix: ein Tick zur Zeit plus Nachlauf; zusätzlich `statSync(throwIfNoEntry:false)`.
Fundstelle: `public/leitstand/zustand.js`; `leseCheckpointVerzeichnisStempel`.
Auswirkung: Leitstand faktisch blockiert.
Maßnahme: Überlappungsschutz plus Gate (d)/(e).
Feature/Run: fix/jarvis-latenz, 21.09.2026. Quelle: claude/292.

**F-556** · `BUG` · P1 · erledigt
Titel: Langlaufender Leitstand-Prozess braucht ~2 s je GET /api/zustand (frisch ~0,1 s).
Beschreibung: Messung war durch alte Browser-Tab-Verbindungen verfälscht; im Browser 1,7 s, Hypothese Kaspersky-fetch-Hook. Ursache ungeklärt.
Fundstelle: `GET /api/zustand`.
Auswirkung: Event-Loop zeitweise blockiert.
Maßnahme: Saubere Langlauf-Nachmessung ohne Störfaktor (Kaspersky-Ausnahme gesetzt, E-M5-11). Siehe auch F-588: die Verzeichnisanzahl allein erklärt den 1266-ms-Ausreißer vom 22.09.2026 nicht (Messung liefert bei 794 Verzeichnissen nur ~70-80 ms) — Ursache bleibt vermutlich Systemlast, F-556 bleibt offen.
Status: erledigt (F45 P, 11.10.2026): Ursache zweiteilig. (1) Windows drosselt den Leitstand-Prozess im Energiemodus „Beste Energieeffizienz“ um Faktor 5–10 (F-1018) — die „Systemlast“; (2) GET /api/zustand stempelte alle ~280 Läufe synchron nacheinander (stat + readdir je Kette). Fix: Stempel asynchron und parallel (fs.promises), entscheidung-/Abnahme-Ketten nur, wenn ihr Ordner in der Verzeichnisliste steht; Kaltstart in 25-ms-Scheiben; Caches für GET /api/auftraege und /api/workitems (scripts/leitstand-server.mjs, Test scripts/leitstand/zustand-caches.test.mjs). Gemessen bei gleichem Energiemodus (features/F45/nachweise/p/messung-vorher-basis60.md gegen messung-nachher-gleich.md): p95 gesamt 125 → 65 ms, frisch 504 → 63 ms, spät 92 → 68 ms (Ziel P1 ≤ 300 ms).
Feature/Run: fix/jarvis-latenz, 21.09.2026. Quelle: claude/293, claude/295, claude/303.

**F-557** · `PROCESS_IMPROVEMENT` · P3 · erledigt (#202)
Titel: Einheit ms statt s aus dem Befund übernommen.
Beschreibung: „109 ms / 110 ms" statt 109 s / 110 s.
Fundstelle: `state/nachweis-jarvis-latenz.md`; Kommentar zu Gate (d).
Auswirkung: Falsche Messwerte in der Doku.
Maßnahme: Korrigiert.
Feature/Run: fix/jarvis-latenz, 21.09.2026. Quelle: claude/293, claude/294.

**F-558** · `TECH_DEBT` · P3 · erledigt (#202)
Titel: pollJetzt() nach einer Aktion konnte einen Vorher-Zustand liefern.
Beschreibung: Hing sich an einen vorher gestarteten Tick; behoben mit Nachlauf-Flag, Gate (e) mit Rot-Fall.
Fundstelle: `public/leitstand/zustand.js`; genutzt in `views/runs.js`, `workboard.js`, `workflows.js`.
Auswirkung: Veraltete Anzeige für bis zu 2 s.
Maßnahme: Nachlauf-Flag.
Feature/Run: fix/jarvis-latenz, 21.09.2026. Quelle: claude/293.

**F-560** · `TECH_DEBT` · P3 · erledigt (#202)
Titel: Ein werfender Detail-Auffrischer blockierte den Nachlauf dauerhaft.
Beschreibung: Die Auffrischer-Schleife in `fuehrePollTickAus` war nicht gefangen.
Fundstelle: `public/leitstand/zustand.js`.
Auswirkung: Spätere `pollJetzt()` bekamen keinen Nachlauf mehr.
Maßnahme: Jeden Auffrischer einzeln fangen.
Feature/Run: fix/jarvis-latenz, 21.09.2026. Quelle: claude/294.

**F-561** · `BUG` · P1 · erledigt (#202)
Titel: Hängende holeLaufDetail-Anfrage legte die Chat-Auflösungsschleife still.
Beschreibung: `fetch` lief ohne Timeout.
Fundstelle: `public/leitstand/api.js`; `chat.js` `pruefeAusstehendenLauf`.
Auswirkung: „Abbruch wirkt nicht" als Anzeige-Hänger.
Maßnahme: `AbortSignal.timeout(5000)` für `holeLaufDetail` und `holeZustand`, Gate (g) mit Rot-Fall.
Feature/Run: fix/jarvis-latenz, 21.09.2026. Quelle: claude/295, claude/296.

**F-564** · `TECH_DEBT` · P3 · erledigt (#205)
Titel: Chat meldete einen manuellen Abbruch als „nicht erfolgreich (FEHLGESCHLAGEN)".
Beschreibung: Der Meldungstext unterschied Abbruch nicht von Fehler.
Fundstelle: `public/leitstand/views/chat.js`, `beschreibeNichtErfolgreichesEnde`.
Auswirkung: Irreführende Meldung.
Maßnahme: Eigener Text „Lauf abgebrochen.".
Feature/Run: Browsertest fix/jarvis-latenz, 21.09.2026. Quelle: claude/297, claude/304.

**F-567** · `BUG` · P2 · erledigt (#207)
Titel: Jarvis-Prozess las ~/.claude/projects/…/memory/MEMORY.md trotz --setting-sources ''.
Beschreibung: In 4/15 Läufen (WS-0) und 1/5 (WS-2). Fix: `--disallowedTools 'Read(~/.claude/**)'` (`AUTO_MEMORY_DENY_REGEL`) für jarvis und router.
Fundstelle: `baueAufruf` (claude-code-gateway); Jarvis-Chat-Lauf, Router-Handler.
Auswirkung: Zusätzliche Werkzeug-Runde und Entwickler-Gedächtnis in einer Produktrolle.
Maßnahme: Lesesperre per Permission-Deny.
Feature/Run: F40 WS-0 bis WS-3, 21.09.2026. Quelle: claude/301, claude/308.

**F-568** · `TECH_DEBT` · P2 · erledigt (#206)
Titel: docs/STATUS.md war in 11/15 Mehrrunden-Läufen der erste Werkzeugzugriff.
Beschreibung: Jetzt als Abschnitt „Aktuelle Phase" im Lagebild (`docs/projekt/kontext/lagebild.md`) vorab eingespeist.
Fundstelle: `docs/STATUS.md`; `baueProjektkontextAnfragen`.
Auswirkung: Zusätzliche Werkzeug-Runden.
Maßnahme: F40 WS-2 (Lagebild).
Feature/Run: F40 WS-0 Spike, 21.09.2026. Quelle: claude/301, claude/306.

**F-569** · `TECH_DEBT` · P2 · erledigt (#206)
Titel: state/findings.md wurde bis zu 5× je Jarvis-Lauf gegrept.
Beschreibung: Jetzt als vorberechnete Liste offener P1-Findings im Lagebild eingespeist.
Fundstelle: `state/findings.md`; `scripts/erzeuge-lagebild.mjs`.
Auswirkung: Zusätzliche Werkzeug-Runden.
Maßnahme: F40 WS-2 (Lagebild).
Feature/Run: F40 WS-0 Spike, 21.09.2026. Quelle: claude/301, claude/306.

**F-570** · `TECH_DEBT` · P2 · erledigt (#204)
Titel: Beim Abbruch mitten im stream-json-Strom fehlt die result-Zeile.
Beschreibung: Jeder Leser muss eine fehlende oder unparsbare letzte Zeile vertragen; abgedeckt durch `darfFruehAufloesen()`.
Fundstelle: `src/claude-code-gateway/prozessstart.ts`.
Auswirkung: Leser würden sonst fehlerhaft abbrechen.
Maßnahme: Muss-Kriterium im WS-1-Gate.
Feature/Run: F40 WS-0 Spike, 21.09.2026. Quelle: claude/301.

**F-571** · `PROCESS_IMPROVEMENT` · P3 · erledigt (ID nicht vergeben)
Titel: ID F-571 wurde nicht vergeben.
Beschreibung: In keiner Challenger-Übergabe dokumentiert; Platzhalter, damit die Nummernfolge lückenlos prüfbar bleibt.
Fundstelle: —
Auswirkung: Keine.
Maßnahme: Keine.
Feature/Run: Findings-Nachtrag F-534, 21.09.2026.

**F-576** · `BUG` · P2 · erledigt (#205)
Titel: Fehler-/Abbruch-Eintrag renderte dauerhaft unterhalb späterer Nachrichten.
Beschreibung: `baueAnzeigeListe()` hängte `lokaleEintraege` pauschal ans Ende.
Fundstelle: `public/leitstand/views/chat.js` (`baueAnzeigeListe`).
Auswirkung: Falsche Chronologie im Chat.
Maßnahme: Einfügeposition beim Push merken und dort einsortieren.
Feature/Run: nach F40 WS-1, 21.09.2026. Quelle: claude/303, claude/304.

**F-579** · `BUG` · P1 · erledigt (#206)
Titel: STATUS.md „Aktuelle Phase" widersprach den Feature-Akten.
Beschreibung: F32 stand als ABGESCHLOSSEN gegen IN_ARBEIT in der Akte; F40 fehlte.
Fundstelle: `docs/STATUS.md`; `features/F32/feature.md`.
Auswirkung: Jarvis hätte mit eingespeistem Status falsch geantwortet.
Maßnahme: Im Zuge von F40 WS-2 korrigiert.
Feature/Run: F40 WS-2, 21.09.2026. Quelle: claude/305.

**F-585** · `BUG` · P2 · erledigt (docs/m5-nachzug)
Titel: roadmap.json M5-features ohne F40, obwohl zielfassung.md §13.6 F40 zu M5 zählt.
Beschreibung: `docs/projekt/roadmap.json`s M5-`features`-Array führte F32, F33, F34–F39 und F30, aber nicht F40 — obwohl `docs/projekt/zielfassung.md` §13.6 F40 (E-M5-10) ausdrücklich zum M5-Feature-Schnitt zählt. Lagebild/Jarvis-Kontext bekamen dadurch eine unvollständige M5-Liste.
Fundstelle: `docs/projekt/roadmap.json`; `docs/projekt/zielfassung.md` §13.6.
Auswirkung: Unvollständiger Projektkontext für `jarvis`/`router` über das Lagebild.
Maßnahme: F40 im M5-`features`-Array ergänzt (docs/m5-nachzug).
Feature/Run: F-534 Teil 2, 22.09.2026. Quelle: claude/313.

**F-586** · `TECH_DEBT` · P3 · erledigt (docs/m5-nachzug)
Titel: STATUS.md „Meilenstein 4"-Liste führte M5-Features F32/F33/F40, F34–F39 fehlten.
Beschreibung: `docs/STATUS.md`s Abschnitt „### Meilenstein 4" listete F32, F33 und F40 (laut §13.6 M5-Features), während F34–F39 dort gar nicht auftauchten.
Fundstelle: `docs/STATUS.md`.
Auswirkung: Irreführende Meilenstein-Zuordnung im zentralen Statusdokument.
Maßnahme: F32/F33/F40 in eine neue Überschrift „### Meilenstein 5 — läuft" verschoben, F34–F39 und F30 dort mit Titel aus §13.6 als „noch nicht begonnen" ergänzt (docs/m5-nachzug).
Feature/Run: F-534 Teil 2, 22.09.2026. Quelle: claude/313.

**F-587** · `PROCESS_IMPROVEMENT` · P3 · erledigt (docs/m5-nachzug)
Titel: F23-Restfindingliste nach E-M5-1 ließ F-386 aus.
Beschreibung: Der E-M5-1-Statuswechsel von F23 auf `ABGESCHLOSSEN` nannte die Restfindings F-378, F-389, F-392, aber nicht das bereits vorher in derselben Akte dokumentierte F-386.
Fundstelle: `features/F23/feature.md`.
Auswirkung: Unvollständige Restfindingliste in der Feature-Akte.
Maßnahme: F-386 ergänzt (docs/m5-nachzug).
Feature/Run: F-534 Teil 2, 22.09.2026. Quelle: claude/313.

**F-588** · `BUG` · P2 · erledigt (fix/f588-sammle-laeufe)
Titel: GET /api/zustand skaliert mit kontrollzustand/-Bestand, Gate (d) flackert.
Beschreibung: `sammleLaeufe` (`scripts/leitstand-server.mjs:958-967`) listet ALLE Top-Level-Verzeichnisse unter `basisVerzeichnis` und bildet für jedes einen Cache-Änderungsstempel (bis zu 4 Dateisystem-Aufrufe je Eintrag, `leseCheckpointVerzeichnisStempel`), bevor über `istLaufkette` auf echte Läufe gefiltert wird — anders als `sammleAuftraege`/`sammleWorkflows`, die vorher per Präfix filtern. Kosten wachsen linear mit der GESAMTEN Verzeichniszahl (auch `lineage-*`-Ketten), nicht mit der Zahl echter Läufe; der Kopfdaten-Cache aus `fix/zustand-poll-kosten` spart die teure Kettenlesung, aber nicht diese Stempelbildung (kalt ≈ warm in der Messung). Bei der heutigen Bestandsgröße (~800) macht das ~70-80 ms aus, deutlich unter der 300-ms-Grenze — der 1266-ms-Ausreißer vom 22.09.2026 (F-556) ist damit NICHT durch die Verzeichnisanzahl allein erklärt, vermutlich Systemlast.
Fundstelle: `scripts/leitstand-server.mjs:958-967` (`sammleLaeufe`), `:919-946` (`leseCheckpointVerzeichnisStempel`/`sammleLaufKopfdatenGecached`); `state/messung-f588-zustand.md`.
Auswirkung: Gate (d) (`scripts/check-f20-zustand-poll.mjs`) wird bei weiterem, unbegrenztem Wachstum von `kontrollzustand/` irgendwann strukturell knapp (hochgerechnet ~3.300 Verzeichnisse bei ruhigem System) und ist schon heute anfällig für Lastspitzen, weil die Marge unter der Grenze bei wachsendem Bestand kleiner wird.
Maßnahme: Umgesetzt (fix/f588-sammle-laeufe, 22.09.2026) — `sammleLaeufe` überspringt Verzeichnisse mit Präfix `lineage-` per Denylist VOR der Stempelbildung (keine Allowlist, `istLaufkette` bleibt inhaltsbasiert unverändert). Äquivalenz gegen den echten Bestand belegt (200/200 Läufe, Lauf-Ids und Kopfdaten deep-equal; kein echter Lauf beginnt mit `lineage-`), zusätzlich dauerhaft über `scripts/check-fix-f588-sammle-laeufe.mjs` (neu, `npm run check`) abgesichert. Messung: kalt/warm Median 68-69 ms → 20 ms auf dem echten Bestand (Faktor ~3,4x), Details in `state/messung-f588-zustand.md`. Verwandt: F-559 (bleibt offen — das grundsätzliche O(n) über echte Läufe besteht fort, nur der ungefilterte Anteil über ALLE Verzeichnisse ist behoben).
Feature/Run: Messung F-556/F-588, 22.09.2026; Fix fix/f588-sammle-laeufe, 22.09.2026. Quelle: claude/314, claude/316.

**F-590** · `HARNESS_IMPROVEMENT` · P2 · erledigt (#228)
Titel: EPERM beim Aufräumen von kontrollzustand-test-* in Check-Skripten.
Beschreibung: Heute 2x in `npm run check` aufgetreten (Testverzeichnis unter `kontrollzustand-test/` ließ sich in `raeumeVerzeichnis` nicht entfernen, Retry lief grün) — hinterlässt Reste, einheitlich 17 alte `kontrollzustand-test-*`-Verzeichnisse im Arbeitsbaum (gezählt 22.09.2026). Tritt TROTZ `maxRetries: 10` (dem F-257-Helfer `raeumeVerzeichnis`, bereits die gleiche Wiederholungslogik) auf — die Wiederholung allein löst es nicht. Auf P2 hochgestuft, weil es zwischen der ersten Aufnahme und dem Fix deterministisch wurde (3/3 lokale Läufe rot).
Fundstelle: `scripts/_aufraeumen.ts` (`raeumeVerzeichnis`); `scripts/check-f20-leitstand-shell.mjs` (nutzte vorher einen eigenen direkten `rmSync`-Aufruf statt des gemeinsamen Helfers, jetzt auf `raeumeVerzeichnis` umgestellt).
Auswirkung: Sporadisch scheiternde `npm run check`-Läufe ohne Codeänderung (Retry meist grün) — Verwechslungsgefahr mit einem echten Befund, Muster CLAUDE.md „Bekannte Fallen".
Maßnahme: Wiederholung allein löst es nicht (bestätigt) — `raeumeVerzeichnis` wirft nach ausgeschöpften Wiederholungen bei EPERM/EBUSY/ENOTEMPTY nicht mehr, sondern warnt auf stderr und sammelt den Pfad in `scripts/.aufraeumen-reste.jsonl`; `scripts/aufraeumen-nachlauf.mjs` versucht diese Pfade am Ende von `npm run check` einmal erneut und meldet verbleibende Reste nur als Hinweis (Exit 0). `maxRetries` unverändert bei 10 belassen (F-591).
Status: erledigt (Fix `fix/f590-eperm-aufraeumen`, 23.09.2026 — `npm run check` dreimal hintereinander grün, gemergt #228). Nachtrag F45 W2b-2 (27.10.2026): die Reste-Quelle selbst ist weg — Gates und Tests legen ihre Wegwerf-Ordner über `wegwerfOrdner` (`scripts/_wegwerf.ts`) unter `os.tmpdir()` an statt als `kontrollzustand-test-*` in der Repo-Wurzel; nach einem Abbruch bleibt ein Rest im Temp-Ordner des Systems. Toleranz und Nachlauf bleiben.
Feature/Run: Fix f588-sammle-laeufe, 22.09.2026 (Aufnahme). Quelle: claude/316, claude/317. Fix fix/f590-eperm-aufraeumen, 23.09.2026 (#228).

**F-595** · `TECH_DEBT` · P3 · erledigt
Titel: Feature-IDs aus roadmap.json nicht auf Muster beschränkt, "../" wird im feature.md-Pfad aufgelöst.
Beschreibung: `schemas/roadmap.schema.json` prüft `features[]` nur als String mit `minLength: 1`, ohne Formatbeschränkung. `baueFeatureEintrag` (`scripts/leitstand/routen-roadmap.mjs`) bildet daraus unverändert `join(repoWurzel, 'features', featureId, 'feature.md')` und liest die Datei. Eine `roadmap.json` mit z. B. `"../../irgendwas"` als Feature-ID würde außerhalb von `features/` lesen. Feature-Review-Pass (code-reviewer, frischer Kontext, 22.09.2026) bestätigte den Befund unabhängig vom Auftragshinweis.
Fundstelle: `schemas/roadmap.schema.json` (`features.items`); `scripts/leitstand/routen-roadmap.mjs` (`baueFeatureEintrag`).
Auswirkung: Gering — `roadmap.json` ist eine vertrauenswürdige, von Hand gepflegte Repo-Datei, kein externer Eingabepfad; nur Status-Zeile und Titel-Überschrift werden extrahiert, kein Rohdump.
Maßnahme: Schema-Pattern `^F[0-9]+[a-z]?$` ergänzen, oder Prüfung, dass der aufgelöste Pfad unter `features/` liegt.
Status: erledigt (Fixpaket fix/f603-f598-f595, 22.09.2026) — `schemas/roadmap.schema.json` `features.items` trägt jetzt `pattern: "^F[0-9]+[A-Za-z]?$"`, `validiereRoadmapDaten` (`src/projektkontext/index.ts`) prüft dasselbe Muster (D5, kein zweiter Regelsatz; reale IDs `F1B`/`F6a` geprüft gültig). Zusätzlich Defense-in-Depth in `baueFeatureEintrag` (`scripts/leitstand/routen-roadmap.mjs`): der aufgelöste Pfad wird über `path.resolve` + Präfixvergleich gegen `<repoWurzel>/features/` geprüft, liest nie außerhalb. Rot-Fall `'../x'` und Regressionsschutz (reale `roadmap.json` bleibt gültig) in `scripts/check-f33-roadmap-projektion.mjs` Abschnitt (f).
Feature/Run: F33 Feature-Review-Pass, 22.09.2026. Quelle: claude/320.

**F-598** · `BUG` · P3 · erledigt
Titel: Leere, aber existierende Projektkontext-Datei wird wie gültiger Inhalt behandelt, nicht wie eine fehlende Datei.
Beschreibung: Feature-Review-Pass (qa, frischer Kontext): `filtereExistierendeAnfragen` (`scripts/leitstand-server.mjs`) prüft nur `existsSync`/`isFile`, keine Mindestlänge. Wird z. B. `beschreibung.md` versehentlich auf 0 Byte gekürzt (fehlgeschlagener Merge, Vertipper), besteht die Datei den Existenz-Filter und wird mit leerem Inhalt in die Anfragenliste aufgenommen — belegt einen Budget-/Prompt-Slot ohne Informationswert, ohne Warnung. Unterläuft die AK7-Absicht, nie stillschweigend wertlos einzuspeisen (AK7 deckt bisher nur den Fall "Datei fehlt komplett" ab).
Fundstelle: `scripts/leitstand-server.mjs` (`filtereExistierendeAnfragen`, `loeseAusfuehrungsEingabenAuf`).
Auswirkung: Mittel — plausibler Fehlerfall (versehentliches Leeren/fehlerhafter Merge), führt zu stillem Informationsverlust für `jarvis`/`router` ohne sichtbaren Hinweis.
Maßnahme: Mindestlängen-Check in `filtereExistierendeAnfragen` ergänzen (Muster der bestehenden "nicht leer"-Prüfung in `check-f33-projektkontext.mjs` Abschnitt a), oder bewusst als weitere "Bekannte Grenze" dokumentieren.
Status: erledigt (Fixpaket fix/f603-f598-f595, 22.09.2026) — `filtereExistierendeAnfragen` liest den Dateiinhalt jetzt zusätzlich zur Existenzprüfung und schließt eine leere oder nur aus Whitespace bestehende Datei (`.trim().length === 0`) genauso aus wie eine fehlende (dieselbe `console.warn`-Warnung, nur mit unterschiedlichem Grund im Log). Gate-Fall in `scripts/check-f33-projektkontext.mjs` Abschnitt (h).
Feature/Run: F33 Feature-Review-Pass, 22.09.2026. Quelle: claude/321.

**F-603** · `BUG` · P2 · erledigt
Titel: Ein 500 von GET /api/verbrauch friert das gesamte Dashboard ohne sichtbaren Fehler ein (F32 Feature-Review-Pass).
Beschreibung: Feature-Review-Pass (code-reviewer UND qa, unabhängig voneinander, identischer Befund): `baueVerbrauchsProjektion` (`scripts/leitstand/routen-verbrauch.mjs`) hat — anders als `baueRoadmapProjektion` (F33, dokumentierter "wirft nie"-Vertrag) — kein eigenes try/catch; ein Wurf (seltener IO-/Berechtigungsfehler auf `kontrollzustand/`, nicht gewöhnliche Datenkorruption, da der Checkpoint-Store selbst bereits defensiv ist) fällt in den generischen 500-Catch-all des Servers (`scripts/leitstand-server.mjs`). `holeVerbrauch` (`public/leitstand/api.js`) prüft `response.ok` nicht (anders als `holeRessourcen`/`holeAbdeckung` im selben Modul, die exakt diesen Fehlerfall bereits einmal per Code-Review behoben bekamen) und übernimmt einen 500-Körper `{ grund }` stillschweigend als Erfolg. `aggregiereVerbrauch` (`public/leitstand/views/dashboard.js`) iteriert danach über `gruppen === undefined` und wirft einen `TypeError`, MITTEN in der `render()`-Template-Konstruktion, bevor `innerHTML` gesetzt wird — nicht nur die Verbrauchskarte, das gesamte Dashboard (alle sechs Kacheln) bleibt ohne Fehlermeldung auf dem letzten Stand hängen, ohne Selbstheilung (jeder folgende 2-Sekunden-Poll-Tick wirft erneut). Der Retry-Fix aus dem WS-2-QA-Pass (Klick auf den aktiven Zeitraum-Button bei Fehler) greift hier nicht, weil er nur den Client-Sentinel `{ fehler: true }` erkennt, keinen `{ grund }`-Serverfehlerkörper.
Fundstelle: `scripts/leitstand/routen-verbrauch.mjs` (`baueVerbrauchsProjektion`); `public/leitstand/api.js` (`holeVerbrauch`); `public/leitstand/views/dashboard.js` (`ladeVerbrauch`, `aggregiereVerbrauch`, `render`).
Auswirkung: Mittel — seltener Trigger (kein Alltagsfall), aber bei Eintritt eine vollständige, für Stefan unsichtbare Einfrierung der gesamten Dashboard-Ansicht ohne Selbstheilung bis zum manuellen Reload.
Maßnahme: `holeVerbrauch` auf das `holeJsonOderWirf`-Muster umstellen (analog `holeRessourcen`/`holeAbdeckung`), und/oder `baueVerbrauchsProjektion`/ihre Route nach dem `baueRoadmapProjektion`-Vorbild robust gegen Würfe machen. Vor `ABGESCHLOSSEN` zu beheben.
Status: erledigt (Fixpaket fix/f603-f598-f595, 22.09.2026) — alle drei Schichten gehärtet: `holeVerbrauch` nutzt jetzt `holeJsonOderWirf` (Timeout beibehalten); `baueVerbrauchsProjektion` wirft nie mehr (Muster `baueRoadmapProjektion`, `try/catch` um die gesamte Funktion, `{ status: 'ok', ... } | { status: 'fehler', grund }`, serverseitig geloggt über `console.error`); `ladeVerbrauch` (`dashboard.js`) normalisiert ein Fehler-Fachergebnis auf denselben Client-Sentinel `{ fehler: true }` wie ein Netzwerkfehler, `verbrauchKarte`/`aggregiereVerbrauch` prüfen zusätzlich defensiv `Array.isArray(gruppen)`, sodass ein unerwarteter Antwortkörper nie einen `TypeError` auslöst. Rot-Fall (simulierter IO-Fehler, direkt UND über echten HTTP-Aufruf → 200 statt 500) in `scripts/check-f32-verbrauch-ansicht.mjs` Abschnitte (c)/(d).
Feature/Run: F32 Feature-Review-Pass, 22.09.2026. Quelle: claude/f32-feature-gate.

**F-606** · `BUG` · P2 · **erledigt**
Titel: Jarvis-Ergebnis `auftrag_vorschlag` wird nirgends verarbeitet — kein Weg vom Chat zu einem F22-Auftrag.
Beschreibung: `public/leitstand/views/chat.js` (`antwortText`) zeigt bei jeder `art` ausschließlich das Feld `antwort` als Text an — ein Jarvis-Ergebnis mit `art: 'auftrag_vorschlag'` (samt `auftrag.titel`/`auftrag.text`, `schemas/ergebnis-jarvis.schema.json`) wird im Chat wie eine reine Antwort dargestellt, das mitgelieferte `auftrag`-Objekt bleibt vollständig ungenutzt. Es existiert kein Bedienelement, das aus diesem Vorschlag einen echten Auftrag anlegt (`POST /api/auftraege`, F22-Pfad) — der einzige Weg zu einem Auftrag ist weiterhin die manuelle Eingabe im Auftragsformular.
Fundstelle: `public/leitstand/views/chat.js` (`antwortText`); `schemas/ergebnis-jarvis.schema.json` (`auftrag`).
Auswirkung: Mittel — der Jarvis-Auftragsvorschlag ist ein dokumentiertes Kernszenario der Rolle (F26), landet aber praktisch nie in einem Auftrag; Stefan muss den Vorschlag von Hand abtippen.
Maßnahme: F34 WS-2 — "Als Auftrag anlegen"-Button im Chat bei `art: 'auftrag_vorschlag'`, der `auftrag.titel`/`auftrag.text` über `POST /api/auftraege` registriert.
Status: erledigt (F34 WS-2, 22.09.2026) — "Als Auftrag anlegen"-Brücke in `views/chat.js` (`leseAuftragKandidat`/`renderAuftragBruecke`/`initAuftragBruecke`), sowohl für Jarvis' `art: 'auftrag_vorschlag'` (direkt `auftrag.titel`/`auftrag.text`) als auch für Sparrings `art: 'scope_entwurf'` (`baueAuftragAusScope`, Browser-JS-Kopie `public/leitstand/auftrag-aus-scope.js`, Gleichheit zum Server-Original mechanisch geprüft). Öffnet eine vorbefüllte, editierbare Bestätigung; erst "Anlegen" ruft `POST /api/auftraege` (kein automatisches Anlegen/Routen). Real geprüft in `scripts/check-f34-product-coach.mjs` Abschnitte (i)/(j).
Feature/Run: Challenge F34, 22.09.2026. Quelle: claude/f34-ws1.

**F-609** · `TECH_DEBT` · P1 · **erledigt**
Titel: Sparring-Latenz 60–89 s je Turn (8–16 interne Runden) gegen Jarvis' ~12 s.
Beschreibung: Verifikation F34 WS-1, 22.09.2026: der reale 3-Turn-Nachweis (`features/F34/nachweis-ws1.md`) zeigt `dauer_ms` von 60279–88734 ms (8–16 interne Werkzeug-/Denkrunden je Turn) für `product-coach` — gegenüber der für `jarvis` dokumentierten Latenz von ~12 s (`state/nachweis-jarvis-latenz.md`, nach F31/F40-Optimierung). Ursache ungetrennt: `KONFIGURATION_PRODUCT_COACH` setzt (anders als `KONFIGURATION_JARVIS`) bewusst kein `umgebungsvariablen.MAX_THINKING_TOKENS: '0'` (Sparring soll das Denkbudget behalten), das allein könnte den Unterschied erklären — ebenso möglich sind mehr Werkzeugrunden (Lesen von Projektkontextdateien), da die Rolleninstruktion (`baueCoachAuftragstext`) keine Lese-Obergrenze nennt.
Fundstelle: `features/F34/nachweis-ws1.md`; `scripts/leitstand-server.mjs` (`KONFIGURATION_PRODUCT_COACH`); `src/product-coach/index.ts` (`baueCoachAuftragstext`).
Auswirkung: Mittel bis hoch — bei einer künftigen Sparring-UI (F34 WS-2) wartet ein Mensch pro Turn 1–1,5 Minuten, spürbar langsamer als der Jarvis-Chat.
Maßnahme: A/B-Messung in F34 WS-2 (MAX_THINKING_TOKENS vs. Lese-Obergrenze in der Rolleninstruktion, einzeln und kombiniert), Ziel Median ≤ 30 s bei gleichbleibender Scope-Entwurf-Qualität.
Status: erledigt (F34 WS-2, 22.09.2026) — reale A/B-Messung mit vier Varianten (`features/F34/nachweis-ws2-latenz.md`): `MAX_THINKING_TOKENS: '0'` (V1) senkt die Median-Latenz von 67,1 s auf 8,2 s bei weiterhin gegebener Qualitätsschwelle (reale Fundstellen + Abgrenzung) — deutlich vor einer Lese-Obergrenze in der Rolleninstruktion (V2, 46,1 s) und der Kombination (V3, 30,7 s). V1 übernommen, `KONFIGURATION_PRODUCT_COACH` trägt seither denselben Wert wie `KONFIGURATION_JARVIS`. Nebenbefund F-610 (keine der drei schnelleren Varianten fand `state/findings.md` F-596, anders als die V0-Referenz) neu registriert.
Feature/Run: Verifikation F34 WS-1, 22.09.2026. Quelle: claude/f34-ws1-verifikation.

**F-611** · `TECH_DEBT` · P2 · **erledigt**
Titel: `baueAuftragAusProjektentwurf`s Auftragstitel/-überschrift nutzt im Modus `erweiterung` die unveränderte Gesamt-`vision`, nicht den Titel des neuen Meilensteins.
Beschreibung: realer Nachweis (`features/F34/nachweis-ws3.md`, 22.09.2026): der Coach übernimmt `projekt.vision` im Modus `projekt`+`erweiterung` bewusst unverändert aus der bestehenden Projektbeschreibung (korrektes Verhalten, E-M5-12 — "Bestehendes nicht umschreiben"). `baueAuftragAusProjektentwurf` (`src/product-coach/index.ts` und die Browser-Kopie) baut Titel UND `#`-Überschrift des Auftrags aber aus genau diesem `vision`-Feld (gekürzt auf 80 Codepoints) — bei einer Erweiterung ist das die allgemeine, unveränderte Projektbeschreibung, nicht das eigentlich Neue. Realer Auftrag aus dem Nachweis: Titel `"Projekt-Erweiterung: AI Workforce führt ein Vorhaben von der Idee bis zum abgenommenen Ergebnis du..."` statt z. B. `"Projekt-Erweiterung: M6 — Aufräum-Werkzeug für Testrückstände"`. Der `baueAuftragAusScope`-Vorgänger hat dieses Problem nicht (`scope.titel` ist dort ein eigenes, vom Coach pro Scope neu formuliertes Feld) — `projekt` hat kein äquivalentes eigenes Titel-Feld, nur `vision` (projektweit) und `meilensteine[].titel` (pro Meilenstein).
Fundstelle: `src/product-coach/index.ts` (`baueAuftragAusProjektentwurf`); `public/leitstand/auftrag-aus-projektentwurf.js` (Browser-Kopie, identisches Verhalten).
Auswirkung: Mittel — Stefan sieht im "Als Auftrag anlegen"-Dialog einen unbrauchbaren, generischen Titel/eine unbrauchbare `#`-Überschrift, gerade bei einer Erweiterung (dem im WS-3-Auftrag ausdrücklich hervorgehobenen Fall); der eigentliche Auftragstext darunter bleibt korrekt und vollständig.
Maßnahme: Im Modus `erweiterung` den Titel/die Überschrift stattdessen aus `projekt.meilensteine[0].titel` (bzw. bei mehreren neuen Meilensteinen einer zusammengefassten Kurzform) ableiten, `vision` nur im Modus `neu` verwenden (dort beschreibt sie tatsächlich das Neue).
Status: erledigt (F34 WS-3 Korrekturrunde, 22.09.2026) — `baueAuftragAusProjektentwurf` (Server + Browser-Kopie) bildet den Titel im Modus `erweiterung` jetzt aus `projekt.meilensteine[].titel` (mit `entferneIdPraefix` bereinigt, `; `-getrennt bei mehreren, Codepoint-Kürzung wie bisher bei `vision`), `vision` bleibt ausschließlich Titelquelle im Modus `neu`. Real geprüft: `scripts/check-f34-product-coach.mjs` Abschnitt (q) (Server/Browser-Gleichheit weiterhin bestätigt) und ein direkter Unit-Test in `src/product-coach/product-coach.test.ts`, der den konkreten Nachweis-Fall reproduziert (Meilenstein-Titel statt Gesamt-`vision` im Titel, Verifikations-Pass-Befund: die ursprüngliche Behauptung "real geprüft" war vor diesem Test noch nicht durch eine ausführende Prüfung gedeckt, nur durch eine Herleitung am Schreibtisch — jetzt nachgeholt).
Feature/Run: F34 WS-3 realer Nachweis, 22.09.2026; Korrekturrunde, 22.09.2026. Quelle: claude/f34-ws3.

**F-612** · `TECH_DEBT` · P3 · **erledigt**
Titel: Der Coach kann seinen eigenen `meilensteine[].titel`-Text mit einem ID-artigen Präfix (z. B. `"M6 — ..."`) beginnen, was in `baueAuftragAusProjektentwurf`s Ausgabe zum doppelten Präfix `"M6 — M6 — ..."` führt.
Beschreibung: realer Nachweis (`features/F34/nachweis-ws3.md`, 22.09.2026): der Coach hat KEINE Feature-/Meilenstein-ID vergeben (Instruktion eingehalten, `vergebeFeatureIds` bleibt alleinige Quelle) — aber sein `meilensteine[0].titel` lautete `"M6 — Aufräum-Werkzeug für Testrückstände"`, ein plausibel geratenes, rein textuelles Präfix. `baueAuftragAusProjektentwurf` rendert `### ${meilenstein.id} — ${meilenstein.titel}` und stellt damit die real vergebene ID (`M6`) dem bereits im Text enthaltenen `"M6 — "` voran: `### M6 — M6 — Aufräum-Werkzeug für Testrückstände`. Kein Korrektheitsfehler (die tatsächliche ID kommt weiterhin ausschließlich aus `vergebeFeatureIds`), nur eine kosmetische Dopplung, wenn der Coach zufällig denselben Nummernraum errät.
Fundstelle: `src/product-coach/index.ts` (`baueAuftragAusProjektentwurf`, `baueProjektRolleninstruktion`); `public/leitstand/auftrag-aus-projektentwurf.js` (identisch); QA-Pass-Ergänzung (F34 WS-3, frischer Kontext): dieselbe Dopplung tritt strukturell identisch in der Live-Chat-Anzeige auf, `public/leitstand/views/chat.js` (`renderProjektMeilenstein`, stellt `meilenstein.id` demselben `meilenstein.titel`-Text voran) — ursprünglich nicht als Fundstelle genannt.
Auswirkung: Gering — rein kosmetisch, tritt nur bei zufälliger Übereinstimmung zwischen geratenem Text und real vergebener ID auf, betrifft aber sowohl den Auftragstext als auch die Live-Anzeige.
Maßnahme: Bei Gelegenheit die Rolleninstruktion ergänzen ("beginne 'titel' nie mit einem Meilenstein-/Feature-artigen Präfix wie 'M1 —'/'F1 —'"), oder an beiden Rendering-Stellen (`baueAuftragAusProjektentwurf` UND `renderProjektMeilenstein`) einen bereits vorhandenen `^M?F?[0-9]+\s*—\s*`-artigen Präfix im Titel vor dem Voranstellen der echten ID entfernen.
Feature/Run: F34 WS-3 realer Nachweis, 22.09.2026; QA-Pass F34 WS-3, 22.09.2026. Quelle: claude/f34-ws3.

**F-613** · `BUG` · P2 · **erledigt**
Titel: Die Ressourcen-Erfindungsprüfung und die Feature-/Meilenstein-ID-Vergabe hingen am angefragten `modus`, nicht an der tatsächlich vom Modell gelieferten `art` — ein Instruktionsverstoß wäre unentdeckt geblieben.
Beschreibung: Code-Review-Pass F34 WS-3 (frischer Kontext): `bekannteRessourcenIds` wurde in `POST /api/sparring` (`scripts/leitstand-server.mjs`) NUR berechnet, wenn der Mensch `modus: 'projekt'` angefragt hatte. `validiereErgebnisProductCoach` akzeptierte `art: 'projekt_entwurf'` aber strukturell unabhängig davon, welche Rolleninstruktion tatsächlich verschickt wurde — die Beschränkung auf bestimmte `art`-Werte je Modus war reiner Prompt-Text, keine serverseitige Durchsetzung. Ein Modell, das im Modus `feature` trotzdem `art: 'projekt_entwurf'` mit `capabilities_bedarf[].ressource_id` geliefert hätte, hätte die Existenzprüfung stillschweigend übersprungen bekommen (die permissive Undefined-Prüfung in `validiereCapabilityBedarf` griff) UND wäre trotzdem mit echten, real vergebenen Feature-/Meilenstein-IDs (`vergebeFeatureIds`) in die Sparring-Lineage geschrieben worden — genau die Garantie "keine Ressource erfinden" (Schema-Kommentar, AK13) wäre für diesen Pfad unterlaufen worden.
Fundstelle: `scripts/leitstand-server.mjs` (`verarbeiteRollenChatErgebnis`, `POST /api/sparring`); `src/product-coach/index.ts` (`validiereErgebnisProductCoach` kannte keinen `modus`-Parameter).
Auswirkung: Mittel — praktisch durch die manuelle "Als Auftrag anlegen"-Bestätigung begrenzt (kein automatisches Schreiben in echte Dateien), setzt aber ein Modell voraus, das seine eigene Rolleninstruktion missachtet; ein reales, ungetestetes Loch genau im Kernmechanismus von WS-3.
Maßnahme: `verarbeiteRollenChatErgebnis` lehnt jetzt jeden Widerspruch zwischen angefragtem `modus` und zurückgelieferter `art` als Vertragsverstoß ab (`modus 'feature'` + `art 'projekt_entwurf'`, oder `modus 'projekt'` + `art 'scope_entwurf'` → sichtbarer Fehler-Turn, F-506-Muster, KEINE ID-Vergabe).
Status: erledigt (F34 WS-3, 22.09.2026) — Konsistenzprüfung in `verarbeiteRollenChatErgebnis` ergänzt, real geprüft in `scripts/check-f34-product-coach.mjs` Abschnitt (s): ein simuliertes Modell, das `art: 'projekt_entwurf'` trotz angefragtem `modus: 'feature'` liefert, bekommt real einen sichtbaren Fehler-Turn ohne ID-Vergabe statt stillschweigend akzeptiert zu werden.
Feature/Run: Code-Review-Pass F34 WS-3, 22.09.2026. Quelle: claude/f34-ws3.

**F-614** · `BUG` · P3 · **erledigt**
Titel: Das Verlaufsfenster, das dem Coach als Kontext vorgelegt wird, filterte nicht nach Sparring-Unterumschalter (`modus`) — `feature`- und `projekt`-Turns bluteten ungekennzeichnet ineinander.
Beschreibung: QA- UND Code-Review-Pass F34 WS-3 (unabhängig voneinander gefunden, frischer Kontext): `ladeRollenVerlaufsfenster` liest die geteilte `sparring-<projektId>`-Kette ohne Rücksicht auf das `modus`-Feld einzelner Turns und speist sie als "bisheriger Gesprächsverlauf (nur Kontext)" in jeden neuen Auftragstext ein — unabhängig davon, ob der neue Turn `feature` oder `projekt` ist. Ein Wechsel des Unterumschalters mitten im Gespräch (von der UI ausdrücklich erlaubt, kein Warnhinweis) ließ den Coach unpassenden Kontext sehen. Real beobachtet im eigenen Nachweislauf (`features/F34/nachweis-ws3.md`): der Projekt-Interview-Coach sah fünf ältere `feature`-Sparring-Turns aus vorangegangenem Dogfooding im Kontextfenster.
Fundstelle: `scripts/leitstand-server.mjs` (`ladeRollenVerlaufsfenster`, `POST /api/sparring`).
Auswirkung: Mittel — kein Korrektheitsfehler (das Modell bekommt weiterhin nur Text, keine Fehlfunktion), aber ein plausibles Qualitätsrisiko für die strukturierte Sechs-Themen-Interviewführung, wenn sie unpassenden Einzelfeature-Kontext (oder umgekehrt) als "bisherigen Verlauf" vorgelegt bekommt.
Maßnahme: `ladeRollenVerlaufsfenster` um einen optionalen `modusFilter`-Parameter erweitert; `POST /api/sparring` reicht den angefragten `modus` durch — Alt-Einträge ohne `modus`-Feld gelten dabei als `'feature'` (Muster `routen-sparring.mjs`).
Status: erledigt (F34 WS-3, 22.09.2026) — real geprüft in `scripts/check-f34-product-coach.mjs` Abschnitt (t): vier aufeinanderfolgende Turns (zwei je Untermodus) zeigen, dass der Auftragstext eines `feature`-Turns nur frühere `feature`-Turns enthält und umgekehrt.
Feature/Run: QA-/Code-Review-Pass F34 WS-3, 22.09.2026. Quelle: claude/f34-ws3.

**F-618** · `BUG` · P2 · **erledigt**
Titel: Schritt 0 (Doku-Nachzug) hat `docs/projekt/roadmap.json` nicht nachgezogen — F41 fehlte in M5, alte Reihenfolge stand noch — `vergebeFeatureIds` hat im realen WS-3-Nachweis dadurch die für "Neues Projekt anlegen" (E-M5-14) bereits reservierte `F41` an ein anderes, nicht damit zusammenhängendes Vorhaben vergeben.
Beschreibung: Verifikation F34 WS-3 (Challenger, frischer Kontext), 22.09.2026: `docs/projekt/zielfassung.md` §13.6 (E-M5-12/13/14) wurde beim WS-3-Doku-Nachzug aktualisiert, `docs/projekt/kontext/beschreibung.md`/`docs/STATUS.md`/`features/F34/feature.md` ebenso — `docs/projekt/roadmap.json`s `M5.features` blieb aber unverändert bei `["F32","F33","F34","F35","F36","F37","F38","F39","F40","F30"]`: weder trug F39 die neue, vorgezogene Position, noch war F41 überhaupt gelistet. `vergebeFeatureIds` (`src/product-coach/index.ts`) liest real bestehende IDs aus `features/<id>/` UND `roadmap.json` — da F41 in KEINER der beiden Quellen vorkam, war `F41` zum Zeitpunkt des realen Nachweislaufs (`features/F34/nachweis-ws3.md`) die nächste freie Nummer und wurde dem dortigen Demo-Vorhaben ("Aufräum-Werkzeug für Testrückstände") zugewiesen — real kollidierend mit der bereits in E-M5-14 geplanten `F41` für "Neues Projekt anlegen", auch wenn der Demo-Auftrag selbst (bewusst) nie gebaut wird. Der Mechanismus selbst (`vergebeFeatureIds`) hat korrekt funktioniert — die Lücke lag im vorgelagerten Doku-Nachzug, nicht im Code.
Fundstelle: `docs/projekt/roadmap.json` (`meilensteine[].features` für `M5`); `features/F34/nachweis-ws3.md` (Auftrag `1b3412a8-88be-45e0-b97d-46e6cc5ba396`, trägt die kollidierende `F41`).
Auswirkung: Mittel — solange `roadmap.json` nicht nachgezogen ist, vergibt `vergebeFeatureIds` reale IDs gegen einen veralteten Bestand; hier folgenlos, weil der Nachweis-Auftrag bewusst nie geroutet/gestartet wird, aber strukturell derselbe Fehler hätte bei einem tatsächlich gebauten Demo-Auftrag zu einem echten `features/F41/`-Verzeichniskonflikt mit dem geplanten "Neues Projekt anlegen" geführt.
Maßnahme: `docs/projekt/roadmap.json` `M5.features` auf `["F32","F33","F34","F39","F41","F35","F36","F37","F38","F40","F30"]` korrigiert (Reihenfolge E-M5-13/14, F41 jetzt gelistet — reserviert die ID, auch ohne eigene `features/F41/`-Akte, die Roadmap-Projektion zeigt sie korrekt als `status: 'keine_akte'`); Gate-Ergänzung in `scripts/check-f34-product-coach.mjs`, die `vergebeFeatureIds` gegen die REALE `roadmap.json` prüft und sicherstellt, dass eine dort bereits gelistete, aber noch aktenlose ID (wie `F41`) nie erneut vergeben wird; `features/F34/nachweis-ws3.md` um einen Hinweis auf diesen Befund und die daraus vergebene (korrigierte) ID ergänzt, ohne den realen Interview-Nachweis (Teil a/b) neu zu fahren.
Status: erledigt (F34 WS-3 Korrekturrunde, 22.09.2026).
Feature/Run: Verifikation F34 WS-3 (Challenger), 22.09.2026. Quelle: claude/f34-ws3-korrektur.

**F-620** · `BUG` · P2 · **erledigt**
Titel: Der Jarvis/Sparring/Feature/Projekt-Umschalter aktualisiert `aria-pressed`, aber nie `btn-primary` — die optische Hervorhebung wechselt beim Klicken nie.
Beschreibung: Sichtprüfung F34 WS-3 (Stefan) + Challenger, 23.09.2026: `public/leitstand/index.html` Z. 412/420 setzen `btn-primary` statisch auf den jeweils initialen Button ("Jarvis", "Feature"). `renderVerlauf` (`public/leitstand/views/chat.js`, damals ~Z. 696–701) aktualisierte bei jedem Render ausschließlich `aria-pressed` für alle vier Umschalter-Buttons, nie `classList` — `style.css` hatte zudem keine Regel für `.chat-modus-auswahl [aria-pressed='true']`, die das nachträglich hätte auffangen können. Ergebnis: der gewählte Modus/Untermodus wurde serverseitig korrekt übernommen (Titel, Platzhalter, Verlauf), aber optisch blieb IMMER der Erst-Button hervorgehoben, unabhängig vom tatsächlich aktiven Zustand — seit WS-2 (Jarvis/Sparring), auch auf `main`.
Fundstelle: `public/leitstand/views/chat.js`, `renderVerlauf` (damals Z. 696–701); `public/leitstand/index.html` Z. 412/420.
Auswirkung: Mittel — Stefan kann dem Umschalter selbst nicht ansehen, welcher Modus/Untermodus aktiv ist; nur an Titel/Platzhalter/Verlaufsinhalt erkennbar, leicht zu übersehen.
Maßnahme: `renderVerlauf` toggelt `classList` (`btn-primary`) jetzt gleichlaufend mit `aria-pressed` für alle vier Buttons (eine gemeinsame `setzeGedruecktenZustand`-Hilfsfunktion statt vier duplizierter Stellen). Realer Nachweis per Playwright (Klickfolge + Reload mit gespeichertem Modus) in `features/F34/nachweis-ws3.md`.
Status: erledigt (F34 WS-3 Korrekturrunde, 23.09.2026).
Feature/Run: F34 WS-3 Korrekturrunde (Sichtprüfung Stefan + Challenger), 23.09.2026. Quelle: claude/f34-ws3-korrektur.

**F-621** · `BUG` · P2 · **erledigt**
Titel: `.chat-modus-auswahl { display: flex }` überschreibt die UA-Regel `[hidden] { display: none }` — der Feature/Projekt-Unterumschalter bleibt auch im Modus 'jarvis' sichtbar.
Beschreibung: Sichtprüfung F34 WS-3 (Stefan) + Challenger, 23.09.2026: `#chat-untermodus-auswahl` trägt sowohl `id="chat-untermodus-auswahl"` als auch die Klasse `.chat-modus-auswahl` (`public/leitstand/index.html` Z. 419). `style.css` setzt `.chat-modus-auswahl { display: flex }` ohne begleitende `[hidden]`-Ausnahme — Autor-CSS überschreibt die UA-Regel `[hidden] { display: none }` unabhängig von der Spezifität (dasselbe Muster, das der Datei-Kommentar bei `#shell-chat-spalte[hidden]` bereits für einen ANDEREN Fall bewusst dokumentiert, hier aber nicht auf `.chat-modus-auswahl` übertragen wurde). `renderVerlauf` setzt zwar korrekt `element.hidden = modus !== 'sparring'`, das `hidden`-Attribut landet auf dem DOM-Element, bleibt aber wirkungslos gegen die konkurrierende `display: flex`-Regel — "Feature \| Projekt" war dadurch auch im Modus 'jarvis' sichtbar (und potenziell verwirrend, weil dort inhaltlich bedeutungslos).
Fundstelle: `public/leitstand/style.css`, `.chat-modus-auswahl` (damals ~Z. 2115–2120).
Auswirkung: Mittel — ein sichtbarer, aber bedeutungsloser Unterumschalter im falschen Modus; keine Datenkorruption (der `hidden`-Zustand war im DOM korrekt, nur die CSS-Kaskade hat ihn überstimmt).
Maßnahme: `.chat-modus-auswahl[hidden] { display: none; }` ergänzt (Muster `#shell-chat-spalte[hidden]`). Realer Nachweis per Playwright (`getComputedStyle`-Prüfung von `#chat-untermodus-auswahl` in jedem Modus) in `features/F34/nachweis-ws3.md`.
Status: erledigt (F34 WS-3 Korrekturrunde, 23.09.2026).
Feature/Run: F34 WS-3 Korrekturrunde (Sichtprüfung Stefan + Challenger), 23.09.2026. Quelle: claude/f34-ws3-korrektur.

**F-622** · `PROCESS_IMPROVEMENT` · P2 · **erledigt**
Titel: UI-Workstreams (F34 WS-2/WS-3) wurden an Stefan übergeben, ohne die Seite je gerendert zu haben — Gates/Reviewer prüfen nur statisch, zwei real sichtbare Bugs (F-620/F-621) blieben dadurch bis zur manuellen Sichtprüfung unentdeckt.
Beschreibung: `scripts/check-f34-product-coach.mjs` prüft `views/chat.js`/`index.html`/`style.css` ausschließlich per Quelltext-Scan (Regex gegen den Dateiinhalt, s. Abschnitte (j)/(k)/(l)) — eine akzeptierte, dokumentierte Grenze (F-601: "dieser Leitstand testet KEINEN View-Renderer direkt"). Diese Grenze deckt aber nicht ab, dass CSS-Kaskadeninteraktionen (F-621: eine spätere Regel überschreibt `[hidden]`) und fehlende DOM-Mutationen bei korrekter Attributsetzung (F-620: `aria-pressed` wurde gesetzt, `classList` nie) durch keine Art von Quelltext-Scan auffindbar sind — nur ein echtes Rendering zeigt sie. Beide Bugs waren seit WS-2 (F-620) bzw. WS-3 WS-Beginn (F-621) im Repo, mehrere Reviewer-/QA-Pässe und `npm run check`-Läufe liefen dazwischen grün.
Fundstelle: `scripts/check-f34-product-coach.mjs` Abschnitte (j)/(k)/(l) (rein statische Prüfungen); kein Playwright-/DOM-Testlauf für `views/chat.js` vor dieser Korrekturrunde.
Auswirkung: Mittel — zwei P2-Bugs erreichten trotz Reviewer-/QA-Pass die Übergabe an Stefan; wiederholbares Muster für jeden künftigen UI-Workstream, solange kein realer Render-Nachweis Teil des Handoffs ist.
Maßnahme: Harness-Regel, Entscheidung Stefan 23.09.2026 — UI-Workstreams liefern vor Übergabe an Stefan einen Render-Nachweis per `npm run render-nachweis` (Screenshots + Klicktabelle, generisches Werkzeug `scripts/render-nachweis.mjs`, nimmt URL + Klickfolge-JSON). In `CLAUDE.md` Definition of Done als eigener, UI-gefüllter Punkt verankert; der F34-Render-Nachweis (`features/F34/nachweis-ws3.md` Teil c) einmal reproduziert (`features/F34/nachweis-ws3-ui/klickfolge.json`).
Status: erledigt (Harness-Regel, Entscheidung Stefan 23.09.2026 — `npm run render-nachweis`, `CLAUDE.md`).
Feature/Run: F34 WS-3 Korrekturrunde (Sichtprüfung Stefan + Challenger), 23.09.2026. Quelle: claude/f34-ws3-korrektur.

**F-623** · `PROCESS_IMPROVEMENT` · P3 · **erledigt**
Titel: Der Auftrag für die F34-WS3-UI-Fix-Runde behauptete "Playwright, vorinstalliert; kein 'playwright install'" — eine Annahme über Stefans Maschine aus der eigenen Sandbox-Umgebung heraus getroffen, die sich als falsch herausstellte.
Beschreibung: Weder `node_modules` noch ein `ms-playwright`-Browser-Cache existierten auf diesem Rechner; die Annahme im Prompt stammte offenbar aus der Sandbox-Umgebung, in der der Challenger-Prompt selbst formuliert wurde, nicht aus einer geprüften Aussage über Stefans reale Maschine. Rückfrage an Stefan (AskUserQuestion) klärte den Blocker; Installation + manueller Chromium-Download (curl, da Playwrights eigener Installer in dieser Sandbox an `storage.googleapis.com` timeoutete) lösten ihn. Kein Schaden entstanden — nur Zeitverlust durch die Rückfrage-Runde.
Fundstelle: Auftragstext dieser Korrekturrunde (Challenger-Prompt), Abschnitt 4.
Auswirkung: Gering — eine Rückfrage-Runde Zeitverlust, kein Fehlverhalten, kein falscher Nachweis.
Maßnahme: Umgebungsannahmen über Stefans Maschine (installierte Werkzeuge, Pfade, Netzwerkzugriff) vor der Formulierung eines Auftrags per Bridge/Rückfrage prüfen, statt sie aus der eigenen Sandbox-Umgebung heraus zu unterstellen.
Status: erledigt (dokumentiert als Prozess-Lehre, kein weiterer Fix nötig).
Feature/Run: F34 WS-3 UI-Fix (Korrekturrunde), 23.09.2026. Quelle: claude/f34-ws3-korrektur.

**F-624** · `BUG` · P2 · **erledigt**
Titel: Der Sparring-Chat-Verlauf zeigt Turns aus BEIDEN Unterumschaltern (`feature`/`projekt`) ungefiltert und ohne jede Kennzeichnung im selben Thread — derselbe Bug, den F-614 bereits für das LLM-Kontextfenster fand und behob, wurde nicht auf die Darstellung übertragen.
Beschreibung: Feature-Review-Pass F34 (Gesamt, frischer Kontext, code-reviewer + qa unabhängig voneinander gefunden), 23.09.2026: `baueAnzeigeListe` (`public/leitstand/views/chat.js:430–444`) mappt `zustand.persistierterVerlauf` — die gesamte `sparring-<projektId>`-Kette, `feature`- und `projekt`-Turns chronologisch gemischt — ohne jeden Filter nach `sparringUntermodus`; `MODI.sparring.leseAntwort` liest das von `GET /api/sparring` real gelieferte Feld `modus` (`scripts/leitstand/routen-sparring.mjs:41`) gar nicht. Serverseitig ist das Kontextfenster fürs Modell seit F-614 korrekt nach `modus` gefiltert (`ladeRollenVerlaufsfenster`, `scripts/leitstand-server.mjs:5220–5228`) — die Anzeige nicht. Ein Wechsel des Unterumschalters mitten im Projekt-Interview (genau der von der Aufgabenstellung genannte Fall) zeigt dem Nutzer weiterhin alle früheren Turns des jeweils anderen Untermodus, inkl. alter `scope_entwurf`/`projekt_entwurf`-Strukturblöcke samt funktionierender "Als Auftrag anlegen"-Brücke — chronologisch verschränkt mit den neuen Turns, ohne jede visuelle Trennung.
Fundstelle: `public/leitstand/views/chat.js`, `baueAnzeigeListe` (Z. 430–444), `MODI.sparring.leseAntwort` (Z. 218), `renderVerlauf` (Z. 689 ff.); `scripts/leitstand/routen-sparring.mjs:41` (liefert `modus` je Turn, wird clientseitig nicht ausgewertet).
Auswirkung: Mittel — kein Datenverlust, keine Sicherheitslücke (das Modell sieht weiterhin nur den korrekt gefilterten Kontext), aber ein spürbarer, real reproduzierbarer UX-Bruch im gerade neu gebauten WS-3-Kernmechanismus; jedes Dogfooding-Szenario mit beiden Unterumschaltern erzeugt ihn.
Maßnahme: F34-Fixpaket (fix/f34-sparring-verlauf, 23.09.2026): jeder Eintrag (persistiert/lokal/ausstehend) trägt jetzt `eintragModus` — persistiert aus dem Server-Feld `modus` (Alt-Eintrag ohne Feld gilt als `feature`), lokal/ausstehend aus dem bei Sende-/Push-Zeitpunkt aktiven `sparringUntermodus` (NICHT dem ggf. inzwischen gewechselten aktuellen — sonst könnte ein Fehler-/Ausstehend-Eintrag den Filter selbst umgehen). `baueAnzeigeListe` filtert am Ende NUR für `modus === 'sparring'` danach; `jarvis` bleibt strukturell unverändert. Gate-Abschnitt (w) (statischer Regressionsscan, kein DOM-Test möglich — F-601-Muster), realer Render-Nachweis (`features/F34/nachweis-fixpaket-ui/`, Fixture-Server statt LLM, s. F-626).
Feature/Run: Feature-Review-Pass F34 (Gesamt), 23.09.2026, behoben im Fixpaket fix/f34-sparring-verlauf. Quelle: claude/f34-feature-gate.

**F-625** · `BUG` · P2 · **erledigt**
Titel: Kein Schutz gegen doppelte Auftragsanlage aus demselben Sparring-Turn nach einem Moduswechsel oder Seiten-Reload.
Beschreibung: QA-Pass F34 (Gesamt, frischer Kontext), 23.09.2026: weder der Lineage-Eintrag (`verarbeiteRollenChatErgebnis`, `scripts/leitstand-server.mjs:2971–3021`, schreibt nur `nachricht`/`coachAntwort`/`modus`) noch die `GET /api/sparring`-Projektion (`routen-sparring.mjs:32–44`) vermerken, dass für einen Turn bereits über die Auftrag-Brücke ein Auftrag angelegt wurde. Der einzige Indikator (`offenerAuftragDialog.erfolgAuftragId`) lebt ausschließlich im flüchtigen Browser-Modulzustand und wird sowohl beim Moduswechsel (`initModusUmschalter`, bereits als Grenze für DIALOG-VERLUST dokumentiert, aber nicht für dieses Duplikat-Risiko) als auch bei jedem Seiten-Reload verworfen. Kehrt der Nutzer zu genau demselben `projekt_entwurf`/`scope_entwurf`-Turn zurück (z. B. nach einem Abstecher zu Jarvis), zeigt `renderAuftragBruecke` wieder den nackten "Als Auftrag anlegen"-Trigger ohne jeden Hinweis, dass bereits ein Auftrag existiert.
Fundstelle: `scripts/leitstand-server.mjs:2971–3021` (`verarbeiteRollenChatErgebnis`, kein `auftragId`-Rückverweis); `scripts/leitstand/routen-sparring.mjs:32–44` (Projektion ohne Auftrag-Rückverweis); `public/leitstand/views/chat.js` (`offenerAuftragDialog.erfolgAuftragId`, rein transient).
Auswirkung: Mittel — kein Datenverlust am bestehenden Auftrag, aber ein Klick kann anstandslos einen inhaltsgleichen ZWEITEN Auftrag über `POST /api/auftraege` anlegen, ohne Warnung vor einem Duplikat; genau der von der Aufgabenstellung genannte End-to-End-Pfad (Projekt-Entwurf → Auftrag anlegen → Jarvis → zurück).
Maßnahme: F34-Fixpaket (fix/f34-sparring-verlauf, 23.09.2026): minimaler Rückverweis Turn→Auftrag als EIGENE Kernartefakt-Kette (`sparring-auftrag-<projektId>`, `scripts/leitstand/routen-sparring.mjs`, `registriereSparringAuftragZuordnung`) statt eines nachträglichen Schreibzugriffs auf den bereits geschriebenen Turn selbst (der hätte wie ein neuer, fremder Turn in der Anzeige erschienen) — neuer Endpunkt `POST /api/sparring/<laufId>/auftrag` (kein D13-Bezug, kein Routen/Starten), vom Client best-effort NACH einem bereits erfolgreichen `POST /api/auftraege` aufgerufen. `GET /api/sparring` projiziert den Rückverweis als `auftragErstelltId` je Turn (Alt-Einträge ohne Zuordnung bleiben `null`, unverändertes Verhalten); `renderAuftragBruecke` zeigt dann "Auftrag bereits angelegt (→ #/projekt)" statt des Triggers. Gate-Abschnitt (x) (realer HTTP-Rundlauf inkl. Rot-Fällen), realer Render-Nachweis (`features/F34/nachweis-fixpaket-ui/`, F-625-Schritt: Reload zeigt den Hinweis weiterhin).
Feature/Run: Feature-Review-Pass F34 (Gesamt), 23.09.2026, behoben im Fixpaket fix/f34-sparring-verlauf. Quelle: claude/f34-feature-gate.

**F-626** · `PROCESS_IMPROVEMENT` · P3 · **erledigt**
Titel: Der Render-Nachweis (`features/F34/nachweis-ws3-ui/klickfolge.json`) deckte nur das Umschalten der Modus-/Untermodus-Buttons ab — keine einzige Nachricht wurde gesendet, keiner der `art`-spezifischen Renderer und keine Auftrag-Brücke wurde je real im Browser gerendert.
Beschreibung: QA-Pass F34 (Gesamt), 23.09.2026: die Klickfolge testete ausschließlich Hervorhebung, Sichtbarkeit und Reload-Persistenz der Umschalter-Buttons. Der in F-622 formulierte Anspruch des Render-Nachweises ("findet Bugs, die reine Quelltextprüfung nicht sieht") war damit für den inhaltlich komplexesten Teil der WS-2/WS-3-UI (`renderAlternativen`/`renderScope`/`renderProjekt`, das Auftrag-Dialog-Formular) faktisch nicht eingelöst — genau der von der Aufgabenstellung genannte Pfad ("Projekt-Entwurf → Auftrag anlegen → zurück zu Jarvis") fehlte im Nachweis komplett.
Fundstelle: `features/F34/nachweis-ws3-ui/klickfolge.json` (`schritte`, ausschließlich Button-Klicks).
Auswirkung: Gering — betraf nur die Vollständigkeit des Nachweises, nicht den geprüften Code selbst; ein realer Content-/Dialog-Bug in dem ungetesteten Bereich wäre vom Render-Nachweis bis dahin unentdeckt geblieben.
Maßnahme: F34-Fixpaket (fix/f34-sparring-verlauf, 23.09.2026): neuer, eigenständiger Render-Nachweis `features/F34/nachweis-fixpaket-ui/` — `scripts/render-nachweis.mjs` generisch um Schritt-Arten `tippen` (Text in ein Eingabefeld) und `warteAufSelector` sowie eine `vorhanden`-Beobachtung (Element-Existenz statt fester ID) erweitert (kein F34-Spezifikum, wiederverwendbar); `erzeuge-nachweis.mjs` startet einen isolierten Fixture-Leitstand (Port 4174, gestubbtes `fuehreAufgabeDurchFn` liefert die realen Schema-Beispiele `valid-scope-entwurf`/`valid-projekt-entwurf` statt eines nicht-deterministischen LLM-Laufs — HTTP/Render-/Auftrag-Pipeline bleiben real, nur die Coach-Antwort ist gestubbt) und fährt eine Klickfolge, die real eine Nachricht tippt/sendet, auf die `art`-Antwort wartet, den Unterumschalter wechselt (F-624 sichtbar), einen Auftrag anlegt und nach einem Reload den "bereits angelegt"-Hinweis (F-625) prüft.
Feature/Run: Feature-Review-Pass F34 (Gesamt), 23.09.2026, behoben im Fixpaket fix/f34-sparring-verlauf. Quelle: claude/f34-feature-gate.

**F-628** · `HARNESS_IMPROVEMENT` · P2 · **erledigt**
Titel: `scripts/render-nachweis.mjs`s `reload`-Schritt (`page.goto(klickfolge.url)` auf die bereits aktuelle URL) ist in dieser Umgebung ein No-op — Chromium navigiert nicht neu, wenn Ziel- und aktuelle URL byte-identisch sind (inkl. Hash), der JS-Modulzustand bleibt unverändert im Speicher stehen, statt real neu zu laden.
Beschreibung: F34-Fixpaket (fix/f34-sparring-verlauf), 23.09.2026, beim Erzeugen des Render-Nachweises für F-625 real entdeckt: der Nachweis sollte belegen, dass der "Auftrag bereits angelegt"-Hinweis einen echten Seiten-Reload übersteht — der erzeugte Screenshot zeigte aber weiterhin den TRANSIENTEN In-Session-Dialog (`offenerAuftragDialog.erfolgAuftragId`, mit "Schließen"-Button) statt des neuen, server-persistierten Hinweises. Gezielter Marker-Test (Playwright, `window.__marker` vor/nach `goto(url)` auf dieselbe URL) bestätigte: der Wert überlebt `goto(url) → goto(url)` unverändert, aber NICHT `goto(url) → goto('about:blank') → goto(url)` — die aktuelle Klickfolge-Implementierung navigierte de facto nie wirklich neu. Betraf strukturell JEDEN bisherigen `reload`-Schritt jeder bisherigen Klickfolge (u. a. `features/F34/nachweis-ws3-ui/klickfolge.json`, F-620/F-621-Verifikation) — dort blieb es folgenlos, weil ein frischer Playwright-Kontext ohnehin mit leerem `localStorage` startet und die dort geprüften Werte (`aktiverModus`/`sparringUntermodus`) zufällig mit dem Zustand VOR dem (nie stattgefundenen) Reload übereinstimmten, nicht weil der Reload real funktionierte.
Fundstelle: `scripts/render-nachweis.mjs`, `schritt.reload`-Zweig (vormals `await page.goto(klickfolge.url)`).
Auswirkung: Mittel — die "Reload"-Spalte jedes bisherigen Render-Nachweises bewies nicht das, was sie zu beweisen vorgab; real folgenlos nur durch Zufall (leerer Kontext), keine bekannte falsche Freigabe dadurch verursacht.
Maßnahme: `erzwingeNavigation(url)` — ein Zwischensprung auf `about:blank` VOR dem eigentlichen `goto(url)` — erzwingt eine echte Navigation; ersetzt sowohl den `reload`-Schritt als auch die `localStorageEntfernen`-Neuladung. `page.reload()` bleibt weiterhin vermieden (hängt bei Hash-URLs in dieser Umgebung, unverändertes bestehendes Wissen).
Feature/Run: F34-Fixpaket (fix/f34-sparring-verlauf), 23.09.2026. Quelle: claude/f34-feature-gate.

**F-629** · `BUG` · P2 · **erledigt**
Titel: Die Basisklasse `.btn` (und `.chat-zusammenfassen-btn`) setzt `display` ohne `[hidden]`-Ausnahme — jedes `.btn`-Element mit programmatisch gesetztem `hidden`-Attribut bleibt sichtbar, genau dieselbe Fehlerklasse wie F-621, nur an anderer Stelle nie behoben.
Beschreibung: F34-Fixpaket (fix/f34-sparring-verlauf), 23.09.2026, real entdeckt beim ersten Render-Nachweis, der je einen echten Sparring-Turn sendete und dabei `#chat-abbrechen-btn`/`#chat-zusammenfassen-btn` mit im Bild hatte (`features/F34/nachweis-fixpaket-ui/01-initial-jarvis.png`, `03-feature-scope-entwurf.png` u. a.): BEIDE Buttons sind sichtbar, obwohl `renderVerlauf()` `abbrechenBtn.hidden = zustand.ausstehenderLauf === null` bzw. `document.getElementById('chat-zusammenfassen-btn').hidden = !konfiguration.hatZusammenfassen` korrekt setzt — schon beim allerersten Laden der View, OHNE je eine Nachricht gesendet zu haben. `style.css` `.btn { display: inline-flex; … }` (Z. 1048) und `.chat-zusammenfassen-btn { display: block; … }` (Z. 2091/92) tragen KEINE `[hidden]`-Ausnahme (Muster des F-621-Fixes `.chat-modus-auswahl[hidden] { display: none; }`, hier nie nachgezogen) — Autor-CSS überschreibt die UA-Regel `[hidden] { display: none }` unabhängig von der Spezifität. Der reale Effekt: `#chat-abbrechen-btn` ist IMMER sichtbar (auch ohne ausstehenden Lauf), `#chat-zusammenfassen-btn` ist auch im Modus `sparring` sichtbar (der dort laut `MODI.hatZusammenfassen: false` gar keine Zusammenfassung kennt). Betrifft strukturell JEDES `.btn`-Element mit dynamisch gesetztem `hidden` app-weit (Workboard/Projekt/Verbrauch-Views eingeschlossen), nicht nur `views/chat.js` — bislang unentdeckt, weil kein bisheriger Render-Nachweis (`nachweis-ws3-ui`) diesen Bereich der Seite je im Bild hatte (dessen `screenshotAusschnitt.hoehe: 260` schnitt die Buttons knapp ab).
Fundstelle: `public/leitstand/style.css` Z. 1048 (`.btn`), Z. 2091–2094 (`.chat-zusammenfassen-btn`); betroffen u. a. `public/leitstand/index.html` Z. 428/431 (`#chat-abbrechen-btn`/`#chat-zusammenfassen-btn`).
Auswirkung: Mittel — kein Datenverlust (die Buttons bleiben funktionslos, solange kein Lauf aktiv ist/kein Zusammenfassen anwendbar ist — ein Klick auf `#chat-abbrechen-btn` ohne `ausstehenderLauf` ist in `initAbbrechenBedienung` bereits durch einen frühen `return` bei `zustand.ausstehenderLauf === null` abgesichert), aber irreführende, stets sichtbare Bedienelemente app-weit, wo immer `.btn` + `hidden` kombiniert werden.
Maßnahme: Nachtrag (fix/f34-sparring-verlauf), 23.09.2026: `.btn[hidden] { display: none; }` in `public/leitstand/style.css` ergänzt (Muster `.chat-modus-auswahl[hidden]`, F-621) — Spezifität Klasse+Attribut (0,2,0) schlägt automatisch auch `.chat-zusammenfassen-btn { display: block }` (0,1,0), keine zweite Regel nötig, deckt damit strukturell jedes `.btn`-Element app-weit ab. Neuer Gate-Abschnitt (y) in `scripts/check-f34-product-coach.mjs` (statischer Scan, kein DOM-Test möglich). Render-Nachweis nachgezogen: `features/F34/nachweis-fixpaket-ui/klickfolge.json` beobachtet jetzt zusätzlich die Sichtbarkeit beider Buttons (real `false` in jedem Schritt ohne ausstehenden Lauf bzw. im Modus `sparring`).
Feature/Run: F34-Fixpaket (fix/f34-sparring-verlauf), 23.09.2026, behoben im Nachtrag desselben Branches. Quelle: claude/f34-feature-gate.

**F-630** · `HARNESS_IMPROVEMENT` · P3 · **erledigt**
Titel: `parseFindings` (`src/workboard/findings.ts`) akzeptiert strukturell jeden Typ (`[A-Z_]+`) und jede Priorität `P0`–`P4` ohne eigene Prüfung gegen eine erlaubte Liste — genau die Lücke, durch die F-626 kurzzeitig mit dem Typ `PROCESS_GAP` (kein erlaubter Wert) registriert wurde, bevor es beim Erledigen auf `PROCESS_IMPROVEMENT` korrigiert werden musste.
Beschreibung: F34-Fixpaket-Nachtrag (fix/f34-sparring-verlauf), 23.09.2026. `HEADER_MUSTER` in `src/workboard/findings.ts` (`/^\*\*F-(\d+)\*\* · \`([A-Z_]+)\` · (P[0-4]) · (.+)$/`) parst den Typ als beliebige Großbuchstaben-Zeichenkette — ein Tippfehler oder ein informell erfundener Typ wie `PROCESS_GAP` wird strukturell genauso akzeptiert wie ein etablierter Typ, keine Validierung an dieser oder einer anderen Stelle im Repo. Vor dem Scharfschalten real gegen `state/findings.md` geprüft (581 Einträge, Stand 23.09.2026): 0 Typ-Verstöße (jeder bestehende Eintrag trägt bereits `BUG`/`HARNESS_IMPROVEMENT`/`TECH_DEBT`/`PROCESS_IMPROVEMENT`), aber 23 Einträge mit Priorität `P4` — kein Tippfehler-Bestand, sondern ein strukturell im Code verankertes fünftes Niveau (`Prioritaet` in `src/workboard/types.ts` ist `'P0'|'P1'|'P2'|'P3'|'P4'`, `GET /api/workitems` sortiert explizit "P0→P4").
Fundstelle: `src/workboard/findings.ts` (`HEADER_MUSTER`, keine Typ-/Prioritätsvalidierung); `state/findings.md` (23 reale P4-Einträge, u. a. F-010, F-608, F-616).
Auswirkung: Gering bis Mittel — ein falsch getippter Typ bleibt bislang unbemerkt in `state/findings.md` stehen (reale Konsequenz nur, falls eine spätere Automatisierung nach einem der vier erlaubten Typen filtert und den fehlerhaften Eintrag dabei übersieht).
Maßnahme: Neuer Gate-Abschnitt (5) in `scripts/check-f21-workboard.mjs` (bestehender Findings-Check, importiert bereits `parseFindings`) — Rot-/Grünfall gegen `parseFindings` direkt (belegt, dass ein unbekannter Typ ohne diese Prüfung strukturell durchrutscht), danach die reale `state/findings.md` gegen die erlaubten Typen (`BUG`/`HARNESS_IMPROVEMENT`/`TECH_DEBT`/`PROCESS_IMPROVEMENT`) und Prioritäten (`P0`–`P3`) geprüft. Die 23 realen P4-Einträge sind über eine feste ID-Allowlist (`P4_ALT_ALLOWLIST`) grandfathered statt massenhaft auf eine andere Priorität umgeschrieben zu werden (Auftrags-Vorgabe) — jede NICHT gelistete ID mit `P4` bleibt ab jetzt ein Befund, keine neue P4-Vergabe mehr möglich, ohne die Allowlist bewusst zu erweitern.
**Offene Entscheidung (nicht in diesem Nachtrag getroffen):** die Auftrags-Vorgabe "Prioritäten P0–P3" widerspricht dem real etablierten, aktiv genutzten P4-Niveau (`Prioritaet`-Typ, Sortierlogik) — diese Prüfung setzt die Vorgabe trotzdem wörtlich um (Allowlist statt Bereichserweiterung auf P0–P4). Falls P4 bewusst weiter vergeben werden soll, müsste der Gate-Abschnitt stattdessen `P0`–`P4` als erlaubte Menge führen (eine Zeilenänderung).
Feature/Run: F34-Fixpaket-Nachtrag (fix/f34-sparring-verlauf), 23.09.2026. Quelle: claude/f34-feature-gate.

**F-631** · `TECH_DEBT` · P3 · **erledigt**
Titel: `POST /api/sparring/<laufId>/auftrag` prüft nur die Form (`auftragId` nicht-leerer String) — nicht, ob `laufId` real ein bestehender Sparring-Turn und `auftragId` real ein bestehender Auftrag ist.
Beschreibung: F34-Fixpaket-Nachtrag (fix/f34-sparring-verlauf), 23.09.2026. Der in F-625 eingeführte Endpunkt (`scripts/leitstand-server.mjs`, Abschnitt um Z. 5492) validiert `laufId` nur gegen `LAUFID_UNZULAESSIGE_ZEICHEN` (Zeichensatz) und `auftragId` nur auf einen nicht-leeren String — keine Prüfung, ob unter dieser `laufId` tatsächlich ein Turn in der `sparring-<projektId>`-Kette existiert, oder ob unter dieser `auftragId` tatsächlich ein `AUFTRAG_V0`-Kernartefakt existiert. Ein Aufruf mit frei erfundenen IDs würde anstandslos eine Zuordnung registrieren, die später ins Leere zeigt.
Fundstelle: `scripts/leitstand-server.mjs`, `POST /api/sparring/<laufId>/auftrag`-Handler (Z. ~5492 ff.).
Auswirkung: Gering — lokales Risiko: der Endpunkt wird ausschließlich vom eigenen Client (`views/chat.js`, `verknuepfeSparringAuftrag`) NACH einem bereits erfolgreichen `POST /api/auftraege` aufgerufen, kein öffentlicher Schreibpfad mit unkontrollierten Fremdeingaben; eine ins Leere zeigende Zuordnung wäre nur über eine manuelle, direkte Anfrage gegen den Endpunkt erreichbar.
Maßnahme: Behoben — `laufId` wird vor dem Schreiben gegen die reale `sparring-<projektId>`-Kette geprüft (`sparringLaufExistiert`, neu in `scripts/leitstand/routen-sparring.mjs`, liest über `listeVersionen`/`herkunft.lauf_id`), `auftragId` gegen `auftrag-<auftragId>` (`ladeArtefaktVersion`, Muster `POST /api/auftraege/<id>/routen`) — beide Prüfungen VOR `registriereSparringAuftragZuordnung`, eine unbekannte ID liefert 404 statt den Verweis zu speichern. Rot-/Grünfälle in `scripts/check-f34-product-coach.mjs` Abschnitt (x). **Nachtrag:** die Existenzprüfung selbst öffnete einen zweiten Randfall — `auftragId` mit unzulässigen Zeichen (z. B. „/") ließ `ladeArtefaktVersion` intern werfen und lieferte 500 statt 400 (F39-WS-3b-Reallauf, Versuch 3, real gefunden von `code-reviewer`). Behoben in Versuch 3c (`LAUFID_UNZULAESSIGE_ZEICHEN`-Guard auf `auftragId`, Regressionstest `'a/b'` → 400); vollständig umgesetzt durch den F39-WS-3b-Reallauf (Versuch 3 Bau, Versuch 3c Korrektur 500→400), von Stefan abgenommen (ANGENOMMEN, Review-Lauf `885d5358-…`).
Feature/Run: F34-Fixpaket-Nachtrag (fix/f34-sparring-verlauf), 23.09.2026; behoben im Sparring-Auftrag-Verknüpfungs-Auftrag (a0d04470-d4eb-4204-aec4-ad3ee21e2b91), 23.09.2026; Korrektur 500→400 im selben Auftrag, Versuch 3c, 23.09.2026. Quelle: claude/f34-feature-gate, claude/f39-ws3b-reallauf.

**F-632** · `PROCESS_IMPROVEMENT` · P2 · **erledigt**
Titel: Ein Advisor-/Architekt-Ergebnis in einem künftigen `hoch`-Workflow erreicht die Ausführung strukturell nicht — die einzige Eingabe eines Workflow-Schritts ist der Auftrag, kein Entscheidungskanal zwischen zwei Schritten derselben Kette.
Beschreibung: Bestandsaufnahme im F39-WS-1-Auftrag (23.09.2026, `features/F39/feature.md` Abschnitt „Bestandsaufnahme"): auf Lauf-Ebene existiert ein realer Klärzyklus (F13 — `entscheideStale`/`importiereAntwort` plus ein geführtes Wiederaufnahme-Formular, das einen NEUEN Lauf mit `vorgaengerLaufId` startet, F8 WS-2b). Auf Workflow-Ebene existiert dagegen kein Mechanismus, der eine eingetragene menschliche Entscheidung strukturiert in den NÄCHSTEN Schritt derselben Kette einspeist — der einzige real verdrahtete Weg aus `KLAERUNG_ERFORDERLICH` heraus ist eine komplette, korrigierte Workflow-Fassung erneut per `POST /api/workflows` einzureichen (`GESPERRTE_ERSETZUNGS_STATUS`/`ERSETZBARE_STATUS_TEXT`, `scripts/leitstand-server.mjs` ~Z. 1562, `KLAERUNG_ERFORDERLICH` zählt zu den ersetzbaren Status). Das deckt sich mit E-M5-3 (`AusfuehrungsEingaben.auftragstext` ist der einzige Eingabekanal eines Schritts, F-269-Muster): ein Schritt kennt strukturell keinen zweiten, nachträglich eingespeisten Entscheidungskanal. Sobald ein künftiger `hoch`-Workflow (F39 WS-2) `architekt`s `entscheidungen_mensch[]` oder eines `architecture-advisor`-Ergebnisses eine menschliche Entscheidung verlangt, hat diese Entscheidung damit keinen strukturierten Weg zurück in denselben Baudurchgang — nur einen kompletten Replan.
Fundstelle: `scripts/leitstand-server.mjs` (`GESPERRTE_ERSETZUNGS_STATUS`/`ERSETZBARE_STATUS_TEXT` ~Z. 1555–1565, kein Entscheidungs-Einspeisungspfad für einen laufenden Workflow); F13-Mechanik (`src/human-transport/index.ts`) ist Lauf-, nicht Workflow-scoped.
Auswirkung: Mittel bis Hoch — betrifft direkt die WS-2-Regel 1c der Auftrags-Vorgabe ("`entscheidungen_mensch` → `haltKlaerung` + Fortsetzungsweg") und jeden künftigen Review-Schritt (F35 `qa`-Schritt, ADJUST-Automatik E-M5-4): ohne einen Fortsetzungsweg bleibt jede menschliche Entscheidung ein Replan statt einer Fortsetzung.
Maßnahme: **Teil a erledigt** (F39 WS-2a, 23.09.2026, Branch `feat/f39-ws2a-hoch-kette`): der neue Eingabe-Platzhalter `ergebnis-@<schrittId>` (`loeseSchrittEingabenAuf`, `scripts/leitstand-server.mjs`) liefert das Laufergebnis (strukturiertes Output-Artefakt bzw. roher Ergebnistext, `leseErgebnistextAusRohstrom`) eines abgeschlossenen Schritts an einen Folgeschritt — dieselben drei Schutzregeln wie `aenderungsuebersicht-@` (Selbstverweis, unbekannte `schritt_id`, nicht gestartet). `workflow-vorlagen/hoch.json` nutzt ihn real: `architecture-advisor` sieht jetzt `architekt`s Entwurf, `ausfuehrung` sieht beide Vorschritt-Ergebnisse. **Teil b erledigt** (F39 WS-2b, 23.09.2026, Branch `feat/f39-ws2b-architektur-entscheidung`): neue Regel 1c in `ermittleNaechstenSchritt` (`src/workflow/index.ts`) hält bei einem ERFOLGREICH gelaufenen `ergebnis-architektur`-Schritt an — entweder weil `validiereErgebnisArchitektur` das Ergebnis ablehnt, oder weil `entscheidungen_mensch[]` mindestens eine offene, noch nicht erfasste Frage trägt (Aufrufer normalisiert beides über drei neue optionale `SchrittErgebnis`-Felder, Modul bleibt abhängigkeitsarm). Neue, eigenständige Kernartefakt-Kette `workflow-entscheidung-<workflowId>` (`scripts/leitstand/routen-f39.mjs`, Payload-Form `schemas/kontrollzustand-architektur-entscheidung-payload.schema.json`, Validator `src/workflow-entscheidung/index.ts` — bewusst KEIN siebter `art`-Wert auf `schemas/kontrollzustand-entscheidung-payload.schema.json`, siehe Begründung im Kopfkommentar von `src/workflow-entscheidung/types.ts`). Fortsetzungsweg `POST /api/workflows/<id>/entscheidung`: prüft Status/aktiven Schritt, Vollständigkeit und Optionsgültigkeit jeder Antwort (`pruefeAntwortenGegenFragen`), hält die Entscheidung fest und setzt danach über denselben Automatenpfad fort (`ermittleNaechstenSchritt`/`schreibeWorkflowFortschritt`/`starteWorkflowSchritt`, inkl. D13-Sperre — vierter geschützter Startpfad neben Startendpunkt/Auto-Fortsetzung/Freigabe-Endpunkt, AK6b/AK7-Zählungen in `scripts/check-f15-workflow.mjs` entsprechend angehoben). Neuer Eingabe-Platzhalter `entscheidung-@<schrittId>` (dieselben drei Schutzregeln wie `ergebnis-@`; fehlt die Entscheidung, weil die Liste leer war, liefert er einen leeren Hinweistext statt einer Startsperre) — `workflow-vorlagen/hoch.json` versorgt `architecture-advisor` und `ausfuehrung` zusätzlich damit. Leitstand-UI (`public/leitstand/views/workflows.js`): Fragen mit Optionen (Vor-/Nachteile, Empfehlung hervorgehoben), Radio-Auswahl je Frage, optionale Begründung, "Entscheidung speichern" — Render-Nachweis unter `features/F39/nachweis-ws2b-ui/` (echter Übergang KLAERUNG_ERFORDERLICH → WARTET_FREIGABE, inkl. Reload).
Feature/Run: F39-WS-1-Auftrag (Bestandsaufnahme), 23.09.2026; Teil a behoben im F39-WS-2a-Auftrag, 23.09.2026; Teil b behoben im F39-WS-2b-Auftrag, 23.09.2026. Quelle: claude/f39-ws1-architekt, claude/f39-ws2a-hoch-kette, claude/f39-ws2b-architektur-entscheidung.

**F-633** · `TECH_DEBT` · P2 · **erledigt**
Titel: Keine deterministische Kontrolltiefe-Untergrenze — Pflichtpfade (z. B. `hoch` für Projektaufträge aus F34) hängen ausschließlich am LLM-Urteil des Routers, weil ein Auftrag kein strukturiertes Herkunftsfeld trägt.
Beschreibung: Bestandsaufnahme im F39-WS-1-Auftrag (23.09.2026, `features/F39/feature.md` Abschnitt „Bestandsaufnahme"): `AuftragV0Daten` (`src/auftrag/types.ts`) trägt genau `auftrag_schema`/`auftrag_id`/`titel`/`auftragstext`/`erstellt_am` — kein `herkunft`/`quelle`/`ursprung`-Feld. Ein aus F34s `baueAuftragAusProjektentwurf` erzeugter Auftrag ist von einem manuell angelegten oder einem Jarvis-Auftragsvorschlag auf Datenebene nicht unterscheidbar; nur der Auftragstext-Inhalt selbst verrät die Herkunft, kein strukturiertes Feld. (`Ressource.herkunft` in `src/ressourcen/types.ts` ist ein anderes, unverwandtes Konzept — Herkunft einer Ressource, nicht eines Auftrags.) Damit kann ein künftiger Router eine Mindest-Kontrolltiefe für Projektaufträge nur über Textmuster (z. B. einen Titel-Präfix) erraten — genau der in der F39-WS-1-Auftrags-Vorgabe ausdrücklich als Nicht-Weg benannte Ansatz ("Router-Auslöserliste + deterministische Untergrenze 'hoch' … über ein strukturiertes Herkunftsfeld, nicht über das Titel-Präfix").
Fundstelle: `src/auftrag/types.ts` (`AuftragV0Daten`, kein Herkunftsfeld); `src/router/` (Klassifikation rein modellbasiert, kein deterministischer Vorrang für einen bekannten Herkunftstyp).
Auswirkung: Mittel — ohne ein strukturiertes Feld bleibt jede sicherheitsrelevante Kontrolltiefe-Untergrenze (z. B. "ein aus einem Projekt-Interview erzeugter Auftrag durchläuft MINDESTENS `hoch`") eine Wahrscheinlichkeit statt einer Garantie; ein Router-Fehlurteil senkt die Kontrolltiefe für genau die Aufträge, die am wenigsten vorgeprüft sind (frisch aus einem Coach-Gespräch).
Maßnahme: Behoben im F39-WS-2a-Auftrag (23.09.2026, Branch `feat/f39-ws2a-hoch-kette`): `AuftragV0Daten.herkunft: { art: 'projekt_interview'|'sparring'|'jarvis'|'manuell' }` (additiv/optional, `src/auftrag/types.ts`, `validiereAuftragHerkunft`), gesetzt über die Chat→Auftrag-Brücke (`leseAuftragKandidat`, `views/chat.js`) und optional über `POST /api/auftraege`. `bestimmeEffektiveKontrolltiefe`/`waehleWorkflowVorlage` (`src/router/index.ts`) heben die vom Router vorgeschlagene Kontrolltiefe bei `herkunft.art === 'projekt_interview'` deterministisch auf mindestens `hoch` an (nur anheben, nie senken), sichtbar vermerkt in `workflow.ziel`. Zusätzlich: `baueRouterAuftragstext` ergänzt die Router-Rolleninstruktion um eine konkrete Auslöserliste für `hoch`, unabhängig von der Herkunft.
Feature/Run: F39-WS-1-Auftrag (Bestandsaufnahme), 23.09.2026; behoben im F39-WS-2a-Auftrag, 23.09.2026. Quelle: claude/f39-ws1-architekt, claude/f39-ws2a-hoch-kette.

**F-635** · `BUG` · P1 · **erledigt**
Titel: `baueArchitektAuftragstext` wurde nie am echten Workflow-Schrittstart aufgerufen — ein `architekt`-Schritt liefe im Reallauf mit nacktem Auftragstext.
Beschreibung: Vor dem F39-WS-3a-Bau geprüft (Auftrags-Vorgabe Punkt 0): `baueArchitektAuftragstext` (`src/architekt/index.ts:384`) trug laut eigenem Kopfkommentar „Wird aufgerufen von: scripts/check-f39-architekt.mjs, src/architekt/architekt.test.ts" — ausschließlich Gate/Test, kein Produktionsaufrufer. `starteWorkflowSchritt` (`scripts/leitstand-server.mjs`) reichte `auftragVersion.daten.auftragstext` unverändert an `loeseSchrittEingabenAuf` durch, unabhängig von `schritt.rolle`. Ein realer `architekt`-Schritt (`workflow-vorlagen/hoch.json`, Schritt 1, seit F39 WS-2a) bekäme damit weder die Rolleninstruktion noch den JSON-Vertrag (F-337-Lehre) noch — im Projektmodus — den Capability-Auszug; nur den rohen Planungstext. Muster `baueRouterAuftragstext`/`baueCoachAuftragstext`: beide werden vom jeweiligen Aufrufer VOR `loeseAusfuehrungsEingabenAuf` angewandt — für `architekt` fehlte genau dieser Aufruf am Workflow-Schrittstart.
Fundstelle: `scripts/leitstand-server.mjs`, `starteWorkflowSchritt` (vor F39-WS-3a-Fix); `src/architekt/index.ts:384` (Kopfkommentar „Wird aufgerufen von").
Auswirkung: Hoch — der reale `hoch`-Workflow (Standard-Kontrolltiefe für Projektaufträge seit F39 WS-2a) hätte im ersten realen Durchlauf einen praktisch nutzlosen Architekt-Lauf erzeugt: kein erzwungener JSON-Vertrag, keine Rollenklarheit, `codex --output-schema` hätte mangels erkennbarer Struktur in der Modellantwort vermutlich `ergebnis_nicht_schemakonform` geliefert (`src/result-evaluator/index.ts`).
Maßnahme: Behoben im F39-WS-3a-Auftrag (23.09.2026): `starteWorkflowSchritt` umhüllt den Auftragstext für `schritt.rolle === 'architekt'` über `baueArchitektAuftragstext`, BEVOR `loeseSchrittEingabenAuf` aufgerufen wird — `modus: 'projekt'` nur bei `herkunft.art === 'projekt_interview'`, sonst `'feature'`; der Capability-Auszug (nur Modus `'projekt'`) wird wie in F34 WS-3 über `leseRessourcenRoh`/`loeseRessourcenAuf` gebaut. Gate-Nachweis über den echten Schrittstart-Pfad (`POST /api/workflows/<id>/starten`, stubbierte `fuehreAufgabeDurchFn`, Muster `check-f15-workflow.mjs`) in `scripts/check-f39-architekt.mjs`.
Feature/Run: F39-WS-3a-Auftrag, 23.09.2026. Quelle: claude/f39-ws3-architektur-grundlage.

**F-638** · `BUG` · P1 · erledigt
Titel: `schemas/ergebnis-architektur.schema.json` wird von OpenAIs striktem Structured-Output-Modus abgelehnt (HTTP 400 `invalid_json_schema`) — jeder reale `architekt`-Lauf auf Codex scheitert.
Beschreibung: F39-WS-3b-Reallauf (23.09.2026), Lauf `635dbad1-9ed8-4489-8386-12590d180cb0` (Auftrag `8780892f-b6d6-4eb3-bf96-2ca0cab5dd0f`, Workflow `router-8780892f-…`, Schritt `schritt-1-architekt`): Codex' Anfrage an die Modell-API scheiterte VOR jeder Generierung mit `{"type":"error","error":{"type":"invalid_request_error","code":"invalid_json_schema","message":"Invalid schema for response_format 'codex_output_schema': In context=('properties','schema_entwuerfe','items','properties','json_schema'), 'additionalProperties' is required to be supplied and to be false.","status":400}}`. Ursache: `schema_entwuerfe[].json_schema` war als bewusst opakes `type: object` OHNE `additionalProperties: false` definiert (der Kommentar im Schema begründete das explizit als gewollte Offenheit für ein beliebig strukturiertes, eingebettetes JSON-Schema-Fragment). OpenAIs Strict-Modus verlangt `additionalProperties: false` aber REKURSIV auf jeder Objektebene, auch auf bewusst opaken — ein echtes, beliebig strukturiertes Objekt kann das nicht erfüllen, ohne seinen Zweck zu verlieren. Kein Einzelfall des Auftragsinhalts: jeder reale `architekt`-Lauf mit Worker `codex` schlägt so fehl, unabhängig davon, ob das Ergebnis am Ende `schema_entwuerfe` füllt — die Ablehnung trifft die Schema-FORM, vor jeder Generierung.
Fundstelle: `schemas/ergebnis-architektur.schema.json:71` (vor dem Fix); Rohstrom `kontrollzustand-roh\635dbad1-9ed8-4489-8386-12590d180cb0\rohstrom.json`; Lauf `635dbad1-9ed8-4489-8386-12590d180cb0` (Dauer ~6,3 s, 0 Token/0 Kosten laut Verbrauch-Ansicht — Ablehnung vor jeder Generierung).
Auswirkung: Hoch — F39s zentrales Ziel (ein realer `architekt`-Lauf vor dem Bau) war bis zu diesem Fix für JEDEN Codex-Lauf strukturell unerreichbar, nicht nur für Randfälle.
Maßnahme: `json_schema` von einem verschachtelten `object` zu einem `string` (JSON-Text) geändert — ein String trägt kein `properties`, ist für den Strict-Modus-Dialekt-Zwang unsichtbar, bleibt aber inhaltlich ein beliebig strukturiertes Fragment. Nachgezogen: `src/architekt/types.ts` (`SchemaEntwurf.json_schema: string`), `src/architekt/index.ts` (`validiereSchemaEntwurf` prüft jetzt nicht-leerer String + `JSON.parse`-Lesbarkeit — Regel 1c hält den Workflow an, wenn nicht lesbar; Rolleninstruktion und `baueUmsetzungsInstruktion` beschreiben die neue String-Form explizit, inkl. Parse-Schritt für den `ausfuehrung`-Worker), `schemas/examples/ergebnis-architektur.valid-projekt.json` (Beispiel auf String-Form umgestellt), neues Rotfall-Beispiel `schemas/examples/ergebnis-architektur.invalid-json-schema-kein-json.json` (nicht-parsbarer String) + Test in `src/architekt/architekt.test.ts`, Gegenprobe in `scripts/check-f39-architekt.mjs` (b2) auf `type: string` statt `object` umgestellt. Rauchtest (echter minimaler Codex-Aufruf mit dem korrigierten Schema) bestand ohne 400 — Beleg in `features/F39/nachweis-ws3-reallauf-messung.md`.
Feature/Run: fix/f638-architekt-schema-strict, 23.09.2026. Quelle: claude/f39-ws3b-reallauf.

**F-639** · `HARNESS_IMPROVEMENT` · P1 · erledigt
Titel: Kein Gate prüfte zentral, ob JEDES Schema, das über Codex' `--output-schema` läuft, die Regeln des strikten Modus einhält — F-638 blieb deshalb bis zum realen Reallauf unentdeckt.
Beschreibung: Zwei bestehende Prüfungen kamen der Aufgabe nahe, deckten aber je nur einen Ausschnitt ab: `loeseAusgabeSchemaAuf` (`scripts/leitstand-server.mjs`) prüft `additionalProperties:false` NUR auf der Wurzel, laufzeitkritisch, bewusst nicht rekursiv (eigener Kopfkommentar verweist auf "das Gate für die mitgelieferten Schemata"). `scripts/check-f16-codex-gateway.mjs` (d) prüft rekursiv, aber NUR für `schemas/ergebnis-code-reviewer.schema.json` (Konstante `ROLLENSCHEMA`) — kein anderes Schema. `scripts/check-f39-architekt.mjs` (b2) prüfte für `ergebnis-architektur.schema.json` nur `allOf`/`if`/`then`/`oneOf` und "jede properties-Eigenschaft in required", NICHT `additionalProperties` — und bestätigte die fehlende Rekursion an `schema_entwuerfe[].json_schema` sogar als eine gewollte Kalibrierungs-Gegenprobe (vor dem F-638-Fix). Damit blieb die Lücke bis zum echten Reallauf unentdeckt.
Fundstelle: `scripts/leitstand-server.mjs:2246-2251` (Wurzel-only-Kommentar); `scripts/check-f16-codex-gateway.mjs:298` (`ROLLENSCHEMA`, nur ein Schema); `scripts/check-f39-architekt.mjs` (b2, vor dem Fix).
Auswirkung: Hoch — dieselbe Fehlerklasse (fehlendes rekursives `additionalProperties:false`) kann in jedem künftigen Codex-Ausgabeschema unbemerkt entstehen, bis ein realer Lauf sie trifft (wie bei F-638 real geschehen).
Maßnahme: Neuer, zentraler Gate-Check `scripts/check-fix-f639-schema-strict-modus.mjs`, in `npm run check` eingehängt. Sammelt jedes distinkte `erlaubtes_output_schema` aus `ROLLENVERTRAEGE` (`src/rollen/index.ts`) — NUR für Rollen, deren `erlaubte_worker` `codex` enthält (Regel 4b: `claude-code` hat keinen `--output-schema`-Mechanismus, eine reine `claude-code`-Rolle wie `scout` durchläuft den Strict-Modus-Zwang strukturell nie). Prüft jedes gefundene Schema rekursiv auf drei Regeln: `additionalProperties:false` auf jeder Objektebene, jede `properties`-Eigenschaft in `required`, kein `allOf`/`if`/`then`/`oneOf`. Rot-Fixture bildet exakt die reale VOR-F-638-Form nach (json_schema als Objekt ohne `additionalProperties`) und wird erkannt; Grün-Fixture (String-Form) liefert 0 Verstöße. Ersetzt NICHT die beiden bestehenden Prüfungen, ergänzt nur die bislang fehlende zentrale Abdeckung. Dieser neue Gate-Check fand beim ersten Lauf real einen ZWEITEN, unabhängigen Fund in `schemas/ergebnis-scout.schema.json` (`kandidaten[].lizenz` fehlt in `required`) — außerhalb des Gate-Scopes belassen (scout läuft strukturell nie über Codex), separat als F-640 erfasst. Nachgezogen (Stefans Auflage): die Schema-Auswahl ist beweisbar KEIN Hardcode — Test (a3) baut eine synthetische `ROLLENVERTRAEGE`-Variante mit `codex` zusätzlich in `scout.erlaubte_worker` und bestätigt, dass `schemas/ergebnis-scout.schema.json` (real, trägt die F-640-Lücke) in diesem Szenario sofort als Verstoß erkannt wird — der tatsächliche Ausschluss von `scout` beruht nachweislich auf seinem echten `erlaubte_worker`-Wert, nicht auf einer Sonderregel.
Feature/Run: fix/f638-architekt-schema-strict, 23.09.2026. Quelle: claude/f39-ws3b-reallauf.

**F-641** · `BUG` · P1 · **erledigt**
Titel: `architecture-advisor` liefert keine Bewertung und wird trotzdem `ERFOLGREICH` — der Lauf bat um Schreibrechte, statt den Architekturentwurf zu prüfen.
Beschreibung: F39-WS-3b-Reallauf, Versuch 2 (23.09.2026), Lauf `4b3ebc42-91df-422b-9dd4-b2fc02dc4151` (`schritt-2-architektur`): die Antwort erklärt, nur lesende Werkzeuge (Glob/Grep/Read) zu haben, plant selbst die drei Dokumentations-Schreibschritte aus dem Auftragstext-Abschnitt „Auftrag an den Baudurchgang" (der tatsächlich an die SPÄTERE `ausfuehrung`-Rolle gerichtet ist) und bittet am Ende um Write/Edit/Bash-Zugriff — kein Urteil (BEREIT/BEREIT_NACH_KORREKTUR/BLOCKIERT), keine inhaltliche Bewertung des Architekturentwurfs. Ursache identisch zu F-635 (`baueArchitektAuftragstext` nie am echten Schrittstart aufgerufen), hier für die Prüfrolle statt die Autorrolle: `architecture-advisor` bekam bis zu diesem Fix NIE eine Rolleninstruktion, nur den rohen, mehrdeutigen Planungsauftrag. Der Workflow lief trotzdem automatisch weiter (`status: ERFOLGREICH`), weil Regel 1b nur `output_schema === 'ergebnis-code-reviewer'` prüft — `architecture-advisor` trägt bewusst `output_schema: null` (Prosa-Urteil statt JSON-Vertrag) und hatte keine äquivalente Prüfung.
Fundstelle: `kontrollzustand-roh\4b3ebc42-91df-422b-9dd4-b2fc02dc4151\rohstrom.json` (`result`-Feld); `scripts/leitstand-server.mjs` (`starteWorkflowSchritt`, vor dem Fix keine Rolleninstruktion für `architecture-advisor`); `src/workflow/index.ts` (Regel 1b, nur an `ergebnis-code-reviewer` gekoppelt).
Auswirkung: Hoch — ein automatisierter Workflow (`hoch.json`) hätte einen inhaltlich leeren Advisor-Schritt als bestandene Prüfung gewertet und den nächsten (schreibenden!) Schritt freigabebereit gestellt, ohne dass je eine echte Architektur-Bewertung stattfand.
Maßnahme: Neues Modul `src/architecture-advisor/index.ts` — `baueArchitectureAdvisorAuftragstext` (Rolleninstruktion: bewerten statt schreiben/planen, verlangt eine Zeile `Urteil: BEREIT|BEREIT_NACH_KORREKTUR|BLOCKIERT`, stellt klar, dass „Auftrag an den Baudurchgang" nicht an den Advisor gerichtet ist), am echten Schrittstart verdrahtet (`scripts/leitstand-server.mjs`, `starteWorkflowSchritt`, Muster F-635). Neue Regel 1d (`src/workflow/index.ts`) hält den Workflow an (`haltKlaerung`), wenn `leseUrteilAusAdvisorText` keine `Urteil: ...`-Zeile findet — gekoppelt an `schritt.rolle` statt `output_schema` (dokumentierte, bewusste Abweichung von der sonstigen Konvention, da `architecture-advisor` kein Schema-Feld zum Koppeln hat). Rot-Fixture ist die REALE Antwort aus Lauf `4b3ebc42-…`, wörtlich übernommen (`src/architecture-advisor/architecture-advisor.test.ts`), plus Integrationstests in `src/workflow/workflow.test.ts`.
Feature/Run: fix/f39-reallauf-befunde, 23.09.2026. Quelle: claude/f39-ws3b-reallauf.

**F-642** · `BUG` · P1 · **erledigt**
Titel: Codex-Start scheitert mit `spawn ENAMETOOLONG` unter Windows, wenn der Prompt (Auftragstext + `aenderungsuebersicht-@`) als Argv-Element übergeben wird.
Beschreibung: F39-WS-3b-Reallauf, Versuch 2 (23.09.2026), Lauf `bd7e2ba4-4f71-4545-85f5-606711e6f17a` (`schritt-4-review`): der Codex-Prozess kam nie zum Start — `rohstrom.json` trägt `"startfehler":{"code":"ENAMETOOLONG","message":"spawn ENAMETOOLONG"}`, `exitCode: null`, leeres `stdout`/`stderr`. Ursache: das PROMPT-Element (real 69.289 Zeichen, gesamter Argv ~69.456 Zeichen — Auftragstext plus die volle `aenderungsuebersicht-@schritt-3-ausfuehrung` der vier von `ausfuehrung` neu/geänderten Dokumentationsdateien) ging als letztes Element von `baueCodexAufruf`s Tokens-Array direkt in `child_process.spawn`s Argv — Windows begrenzt die Gesamtlänge einer Prozess-Kommandozeile, real und reproduzierbar bestätigt (empirisch mit einem 40.000-Zeichen-Argv-Element gegen `node.exe` als Ziel, `spawn ENAMETOOLONG` synchron geworfen). Kein Schema-, kein API-Fehler — ein Betriebssystem-Limit beim Prozessstart selbst, VOR jeder Allowlist-/Modellinteraktion.
Fundstelle: `kontrollzustand-roh\bd7e2ba4-4f71-4545-85f5-606711e6f17a\rohstrom.json` (`startfehler`); `src/codex-gateway/index.ts` (`starteCodexGateway`, vor dem Fix `eingaben.tokens` unverändert an `starteProzess`); `src/claude-code-gateway/prozessstart.ts` (`echterStarter`, `spawn`-Aufruf).
Auswirkung: Hoch — jeder Codex-Lauf mit hinreichend langem Prompt (Auftragstext plus ggf. `aenderungsuebersicht-@`) schlägt strukturell fehl, unabhängig vom Inhalt; real getroffen hat es hier den Post-Build-Review, es kann aber jede Codex-Rolle treffen (architekt, router, jarvis, product-coach), sobald deren Eingabetext lang genug wird.
Maßnahme: Der Prompt geht nicht mehr als Argv-Element an Codex, sondern über `stdin` (`codex exec --help`: „If not provided as an argument … instructions are read from stdin"). Neues `StarterOptionen.stdinDaten` (`src/claude-code-gateway/types.ts`/`prozessstart.ts`) schreibt Daten auf `stdin` und schließt sie (EOF); `starteCodexGateway` trennt das letzte Element von `eingaben.tokens` (der Prompt, per `baueCodexAufruf`-Vertrag immer das letzte Element) vom tatsächlich gespawnten Argv und reicht es über `stdinDaten` — `eingaben.tokens` selbst bleibt für die Allowlist-Prüfung und `rohstrom.tokens` unverändert die vollständige Form (D5, AK8 unbetroffen). Rot-/Grün-Fixture real gegen `node.exe` (`F-642`-Tests in `codex-gateway.test.ts`, Muster F-307): 40.000-Zeichen-Argv-Element wirft real `ENAMETOOLONG`, dieselbe Datenmenge über `stdinDaten` kommt Byte-genau am Kindprozess an. Zusätzlich real gegen `codex.exe` end-to-end geprüft (Prompt ausschließlich über stdin, korrekte Antwort).
Feature/Run: fix/f39-reallauf-befunde, 23.09.2026. Quelle: claude/f39-ws3b-reallauf.

**F-643** · `HARNESS_IMPROVEMENT` · P1 · **erledigt**
Titel: `ausfuehrung`-Schritte schreiben ungeschützt direkt in den Haupt-Checkout auf `main` — kein Worktree, kein eigener Branch, kein Commit.
Beschreibung: F39-WS-3b-Reallauf, Versuch 2 (23.09.2026): Lauf `ad0025e4-5796-41a8-b2cd-6d527f40e2b4` (`schritt-3-ausfuehrung`) schrieb real vier Dateien (`docs/projekt/kontext/beschreibung.md`, `docs/projekt/roadmap.json`, ein neues ADR, `features/F42/feature.md`) direkt nach `C:\Users\stefa\Projekte\ai-workforce` — demselben Arbeitsverzeichnis, auf dem zu diesem Zeitpunkt `main` (HEAD `fc4a0ed`, PR #230) ausgecheckt war. Der `schreibend`-Werkzeugsatz trägt kein Git-Werkzeug (`Read/Grep/Glob/Write/Edit`, `startvorlagen/ai-workforce.json`) — der Lauf konnte selbst nicht committen, aber die Änderungen blieben bis zur manuellen Aufräumung (Branch `nachweis/f39-ws3b-versuch2`) als uncommittete Arbeitsbaum-Änderungen direkt auf `main` liegen. Ohne den `arbeitsverzeichnis_pfad`-Eintrag in der Laufakte real zu prüfen, wäre das unbemerkt geblieben.
Fundstelle: Laufakte `laufakte-ad0025e4-5796-41a8-b2cd-6d527f40e2b4` (`arbeitsverzeichnis_pfad`); `startvorlagen/ai-workforce.json` (`werkzeugsaetze.schreibend`, kein Git-Werkzeug); kein Worktree-/Branch-Mechanismus im realen Schrittstart-Pfad (`scripts/leitstand-server.mjs`, `starteWorkflowSchritt`) gefunden.
Auswirkung: Hoch — jeder reale `hoch`-Workflow-Durchlauf mit einem `ausfuehrung`-Schritt modifiziert direkt den ausgecheckten Branch des Bedienrechners, ohne Isolation. Ein zweiter, parallel laufender Workflow (oder ein Mensch, der zwischenzeitlich den Branch wechselt) träfe auf dieselbe Arbeitskopie — genau die Gefahr, vor der CLAUDE.md („Ein Zielverzeichnis pro Auftrag", „Ein Schreiber pro Arbeitsverzeichnis") warnt, hier aber nicht technisch erzwungen, nur als Konvention für MENSCHLICHE Sitzungen formuliert.
Maßnahme: **E-F39-1 = B (Stefans Entscheidung): die Ausführung schreibt nie ungeschützt auf main.** Umgesetzt als Vorbedingung am echten Schrittstart jedes Schritts mit Werkzeugsatz-Art 'schreibend' (Workflow-Pfad UND `POST /api/laeufe`, dieselbe Funktion `loeseAusfuehrungsEingabenAuf` deckt beide ab, `scripts/leitstand-server.mjs`): der Haupt-Checkout muss auf einem Branch ≠ `main`/`master` stehen (kein losgelöster HEAD), der Arbeitsbaum muss sauber sein (Ausnahmen: `kontrollzustand/`, `state/nachweis-runde2-*`, `stdin-check.js`, `scripts/.aufraeumen-reste/`). Reine, rein lesende Prüfung (`git --no-optional-locks status --porcelain`, kein anderer Git-Befehl) — neues Modul `src/ausfuehrung-vorbedingung/index.ts` (reine Funktion `pruefeAusfuehrungsVorbedingung`) plus Wiring `leseAusfuehrungsVorbedingungRealGit` in `scripts/leitstand-server.mjs`. Bei Verstoß: klarer Startfehler (`"Ausführung gesperrt: du bist auf main. Lege zuerst einen Branch an: git switch -c <name>"` bzw. der Arbeitsbaum-Text), der Schritt bleibt startbar — kein Lauf angelegt, kein `FEHLGESCHLAGEN` (Muster der bestehenden Rollenvertrag-Ablehnungen, VOR jeder `laufId`-Reservierung). Die bestehende `zeigeBedienungsMeldung`-Anzeige im Leitstand (`public/leitstand/views/workflows.js`) zeigt den `grund`-Text unverändert an — kein neuer UI-Code nötig, per Render-Nachweis belegt (F-622). Gate-Fälle real (kein Spy, Wegwerf-Git-Repo) UND mit Injektion (`optionen.leseAusfuehrungsVorbedingung`) in `scripts/check-f17-rollenvertrag.mjs` (AK6b): main/master/detached/unsauber → abgelehnt, Ausnahme-Pfade ignoriert, sauberer Branch → startet, `lesend` (architekt/advisor) → Vorbedingung nie aufgerufen.
Feature/Run: fix/f39-ausfuehrung-vorbedingung (E-F39-1=B), 23.09.2026. Quelle: claude/f39-ws3b-reallauf.

**F-648** · `BUG` · P1 · erledigt
Titel: Die Korrekturschleife nach „Anpassung anfordern" trägt weder die Abnahme-Begründung noch die vorherigen Review-Befunde erkennbar in die Instruktion der neuen Iteration — Ausführung und Review wiederholen sich dadurch blind.
Beschreibung: F39-WS-3b-Reallauf, Versuch 3b (23.09.2026), Workflow `router-a0d04470-d4eb-4204-aec4-ad3ee21e2b91` (Iteration 2 nach `POST .../abnahme`, `ergebnis: 'ANPASSUNG_ANGEFORDERT'`, Begründung „Reviewer-Befund beheben: auftragId mit unzulässigen Zeichen (z. B. „/“) muss mit HTTP 400 statt 500 abgelehnt werden, plus Regressionstest."). Real belegt für den Review-Schritt (`schritt-2-review`, Lauf `ba7bd1c5-2242-43ef-939f-0660ed0eef4e`): der VOLLSTÄNDIGE, gespeicherte Prompt (`kontrollzustand-roh\ba7bd1c5-2242-43ef-939f-0660ed0eef4e\rohstrom.json`, `tokens[3]`) besteht aus genau drei Blöcken — dem unveränderten Auftragstext, `artefakt:laufakte-e1c59219-…` (Metadaten des neuen Ausführungslaufs) und `artefakt:aenderungsuebersicht-e1c59219-…` (leerer Diff). Weder die Abnahme-Begründung noch die Befunde des VORHERIGEN Reviews (`urteil BEREIT_NACH_KORREKTUR`, ein MITTEL-Befund zu `leitstand-server.mjs:5885`, Lauf `6319443a-…`) kommen darin vor. Ursache im Code: `loeseSchrittEingabenAuf` (`scripts/leitstand-server.mjs:2617-2623`) behandelt die Referenz `artefakt:entscheidung-workflow-<id>-abnahme` (die einzige neue Eingabe, die `schritt-1-ausfuehrung` nach `ANPASSUNG_ANGEFORDERT` bekommt, `scripts/leitstand-server.mjs:7027-7029`) über den GENERISCHEN Artefakt-Fall — gleiche Frage/Begründung-Vorlage wie jede andere Referenz, `inhalt: kanonischesJson(version.daten)` ohne Hervorhebung. `code-reviewer` bekommt in `starteWorkflowSchritt` (Zeile ~4004-4024) überhaupt KEINE Sonderbehandlung — anders als `architekt`/`architecture-advisor`/`ausfuehrung` (mit `ergebnis-@`-Bezug) läuft sein Auftragstext dort unverändert durch, ohne jeden Verweis auf eine laufende Korrekturschleife. Real beobachtete Folge: die `ausfuehrung`-Rolle erklärte den Auftrag für „bereits vollständig erledigt" (Zitat, Lauf `e1c59219-…`: „Die angeforderte Erweiterung ist bereits vollständig im Code vorhanden"), ohne den spezifischen Sonderzeichen-Fall zu erwähnen; der `code-reviewer` gab danach `urteil: BEREIT` mit `befunde: []`, weil er den zuvor gemeldeten, weiterhin offenen Fehler strukturell nicht mehr kennen konnte (kein aktiver Test gegen den Handler wie in Iteration 1, nur Lesen des — unveränderten — Quelltextes).
Fundstelle: `scripts/leitstand-server.mjs:2617-2623` (`loeseSchrittEingabenAuf`, generischer Artefakt-Fall); `scripts/leitstand-server.mjs:3949-4024` (`starteWorkflowSchritt`, keine Sonderbehandlung für `code-reviewer`); `kontrollzustand-roh\ba7bd1c5-2242-43ef-939f-0660ed0eef4e\rohstrom.json` (realer, vollständiger Prompt ohne Abnahme-Bezug); `kontrollzustand\lineage-entscheidung-workflow-router-a0d04470-…-abnahme\checkpoints\1-….json` (reale Abnahme-Entscheidung mit `begruendung`); `features/F39/nachweis-ws3-reallauf-messung.md`, Abschnitt „Versuch 3b".
Auswirkung: Hoch — die Korrekturschleife (F23) erreicht strukturell nie ihr eigentliches Ziel, wenn `ausfuehrung` beim ersten Versuch etwas übersieht: jede Folge-Iteration startet faktisch bei Null, ohne zu wissen, WAS konkret zu beheben ist, und der automatische Review prüft mangels Kontext auch nicht erneut gezielt nach. Ein Workflow kann dadurch mit offenem, bereits gemeldetem Fehler `ABGESCHLOSSEN` enden (real geschehen).
Maßnahme: Instruktion für `ausfuehrung` in Iteration n+1 ergänzt wörtlich um die Abnahme-Begründung und die Befunde der Vorfassung, als vorrangiger Auftrag; Instruktion für `code-reviewer` in Iteration n+1 ergänzt um dieselben Befunde mit der Pflicht, jeden einzeln als behoben/offen zu bewerten — ist einer offen, darf `urteil` nicht `BEREIT` sein. Umgesetzt in diesem Fix (siehe Commit dieses Branches, `src/korrekturschleife/index.ts`).
Status: erledigt (geprüft F45 B2b-2b, 15.10.2026, gegen den Stand nach B2b-2a). Die Maßnahme ist umgesetzt: `baueAusfuehrungKorrekturInstruktion` stellt dem Neubau die Abnahme-Begründung und die Befunde der Vorfassung als vorrangigen Auftrag voran, `baueReviewKorrekturInstruktion` verlangt vom Re-Review je Befund „behoben/offen“ und verbietet BEREIT bei einem offenen Punkt (`src/korrekturschleife/index.ts`, Aufrufstelle F-648-Block in `scripts/leitstand-server.mjs`); seit F-658/F-659 mit der Begründung im Re-Review, seit B2b-2a je Befund mit Befund-ID, Evidenz und Korrekturrichtung (Kern- und Mensch-Pfad). Belegt am realen Aufrufpfad: `scripts/check-f659-review-korrektur-begruendung.mjs`, `scripts/check-f45-b2b2-pruefer.mjs` (k1)(k2)(h3). Rest (der Re-Review nennt „behoben/offen“ nicht strukturiert je ID) steht in F-1114 (1), die schwankende Prüftiefe in F-650.
Feature/Run: fix/f39-korrekturschleife, 23.09.2026. Quelle: claude/f39-ws3b-reallauf.

**F-654** · `BUG` · P1 · behoben
Titel: Prüfschritt (F-652) fail-open bei gescheiterter Registrierung des Prüfergebnis-Artefakts — ein Workflow lief bei einem defekten Registrierungspfad ungeprüft zum Review durch.
Beschreibung: Bei der Verifikation von F-652 entdeckt (24.09.2026, vor dem Commit): ist `vorlage.pruefbefehl` gesetzt, die Registrierung des Artefakts `pruefergebnis-<laufId>` (`starteLaufUndVergiss`, `scripts/leitstand-server.mjs`) scheitert aber — Schemaverstoß gegen `schemas/kontrollzustand-pruefergebnis-payload.schema.json` oder ein Wurf aus `fuehrePruefungDurch`/`registriereKernArtefakt` —, wird der Fehlschlag dort abgefangen und nur in die flüchtige Startfehlerliste geschrieben; der Laufstatus selbst bleibt unangetastet ABGESCHLOSSEN/ERFOLGREICH. Der Nachlauf (`starteWorkflowSchritt`s Rückruf) liest danach `pruefergebnis-<laufId>`, findet nichts, und ließ `pruefergebnis` bis zu diesem Fix auf `undefined` — Regel 1f (`ermittleNaechstenSchritt`, `src/workflow/index.ts`) ist an `vorschrittErgebnis.pruefergebnis !== undefined` gekoppelt und griff deshalb NICHT. Der Workflow lief in diesem Fall exakt so weiter, als wäre gar kein `pruefbefehl` konfiguriert — die zentrale Zusage von F-652 ("kein automatischer Fortschritt zum Review ohne GRUEN") galt damit nicht für den Fall, dass die Prüfung selbst technisch scheitert, nur für den Fall, dass sie inhaltlich rot/zeitüberschritten endet. Real reproduziert über eine erzwungene Schreibkollision (Datei statt Verzeichnis an `<basisVerzeichnis>/lineage-pruefergebnis-<laufId>`, `mkdirSync` wirft real `ENOTDIR`) — vor dem Fix startete der Review-Schritt trotzdem, dessen eigene Regel-1b-Prüfung (fehlendes Urteil) hielt den Workflow nur zufällig an, nicht F-652s Mechanik.
Fundstelle: `scripts/leitstand-server.mjs` — Registrierung ~3904 (`starteLaufUndVergiss`, try/catch um `fuehrePruefungDurch`/`registriereKernArtefakt`), Nachlauf-Lesung ~4415-4425 (vor dem Fix ohne `else`-Zweig für "Artefakt fehlt trotz konfiguriertem pruefbefehl").
Auswirkung: Hoch — genau der Fehlerfall, den ein deterministischer Prüfschritt eigentlich robust abdecken soll (die Prüfmaschinerie selbst hat ein Problem), degradierte lautlos zu "keine Prüfung" statt zu einer sichtbaren Klärung — ein Bau mit defekter Prüfinfrastruktur konnte unbemerkt als abgenommen gelten.
Maßnahme: Im Nachlauf gilt jetzt zusätzlich: `vorlage.pruefbefehl` gesetzt UND kein Artefakt gefunden → `pruefergebnis = 'FEHLER'` (exit_code `null`, `ausgabe_ende` nennt den Grund) — dieselbe Härte wie ein real gescheiterter Prüflauf, fail closed statt fail open (ARCHITECTURE.md §4: kein allgemeines Erfolgsflag überstimmt eine konkrete Verweigerung). Ohne `pruefbefehl` bleibt das Verhalten unverändert (`pruefergebnis` bleibt `undefined`, Regel 1f bleibt folgenlos).
Status: behoben (24.09.2026, Branch `fix/f652-pruefschritt`) — Rotfall real belegt (Test vor dem Fix am selben Branch geprüft rot, siehe unten), danach grün. Test `scripts/check-f652-pruefschritt.mjs` Block (i): erzwingt die reale `ENOTDIR`-Schreibkollision, prüft `KLAERUNG_ERFORDERLICH`, `grund` nennt `FEHLER` und den Registrierungs-Hinweis, Review-Schritt bleibt `lauf_id: null`. `npm run check` real grün.
Feature/Run: F-652-Verifikation, 24.09.2026. Quelle: claude/f652-pruefschritt.

**F-655** · `BUG` · P1 · behoben auf Branch
Titel: `ausgabe_ende` des Prüfschritts (F-652) kürzt stdout+stderr GEMEINSAM auf 16 KB — bei viel stderr-Rauschen verdrängt das die eigentliche stdout-Fehlerzeile vollständig, ein Mensch kann ein ROT-Prüfergebnis dann nicht beurteilen.
Beschreibung: Real beobachtet im Reallauf F39 Versuch 4 (Workflow `router-9d5fedcb-dead-417f-a61f-c374a167ba73`, Ausführungslauf `9397a9dd-ea70-4b05-8f52-bf3eec899514`, 24.09.2026): `fuehrePruefungDurch` (`src/pruefschritt/index.ts`) hängte `stderr` HINTER `stdout` an einen gemeinsamen String und kürzte den dann von HINTEN auf `AUSGABE_ENDE_MAX_BYTES` (16 KB). Das gespeicherte `pruefergebnis-9397a9dd…`-Artefakt (`ausgabe_ende`, 15933 Zeichen) bestand dadurch komplett aus stderr-Rauschen erwarteter Fehlerpfad-Logs (F32-(d)/F-654-(i)-Testfixtures, Git-CRLF-Warnungen) — keine einzige Zeile aus stdout, wo Lint-/Typecheck-/Testfehler tatsächlich stehen. Der Halt-Grund aus Regel 1f (`src/workflow/index.ts`, über `letzteZeilen(daten.ausgabe_ende, 40)` in `scripts/leitstand-server.mjs`) trug dadurch ebenfalls nur Rauschen — Stefan musste den Check von Hand wiederholen, um die tatsächliche Fehlerlage überhaupt festzustellen (zweimal manuell grün, kein reproduzierbarer Regressionsbeleg möglich, weil der Beweistext selbst fehlte).
Fundstelle: `src/pruefschritt/index.ts:180` (vor dem Fix: `ausgabeRoh = stdout + '\n--- stderr ---\n' + stderr`, dann EIN gemeinsamer `kuerzeAusgabeEnde`-Aufruf).
Auswirkung: Hoch — genau der Fall, für den F-652 gebaut wurde (ein ROT-Ergebnis dem Menschen verständlich vorlegen), versagte bei realistischer Rauschlast lautlos; ein echter Regressionsbefund wäre auf demselben Weg ebenso verschluckt worden wie in diesem Fall der Flake.
Maßnahme: `baueAusgabeEnde` (neu, `src/pruefschritt/index.ts`) kürzt stdout und stderr GETRENNT — `STDOUT_ENDE_MAX_BYTES` (12 KB) und `STDERR_ENDE_MAX_BYTES` (4 KB), zusammen weiterhin ~`AUSGABE_ENDE_MAX_BYTES`. `filtereStderrRauschen` entfernt VOR dem Kürzen die bekannte Git-CRLF-Warnzeile (einziges Muster, bewusst eng gehalten — CLAUDE.md "Bekannte Fallen"). Reihenfolge im zusammengesetzten String bewusst stderr-dann-stdout (stdout am STRING-ENDE): `ausgabe_ende` bleibt ein einzelner String (kein Schema-Bruch, `additionalProperties: false` unverändert, alle bestehenden Leser — Regel 1f/`letzteZeilen`, `erzeuge-nachweis.mjs`, `check-f652-pruefschritt.mjs` — funktionieren unverändert weiter), und `letzteZeilen(ausgabe_ende, n)` liefert dadurch automatisch primär das stdout-Ende, ohne den Aufrufer in `scripts/leitstand-server.mjs` anzufassen. Schema-Entscheidung (einzelner String statt additiver `stdout_ende`/`stderr_ende`-Felder): ein Feldwechsel hätte fünf Lesestellen (Schema, Typen, `leitstand-server.mjs`, UI-Nachweis-Skript, Tests) anfassen müssen, für denselben Effekt.
Status: behoben auf Branch (24.09.2026, Branch `fix/f655-pruefausgabe`) — Rotfall real belegt (`src/pruefschritt/pruefschritt.test.ts`: eine stdout-Fehlerzeile bleibt trotz ~52 KB unfilterbaren stderr-Rauschens im Artefakt UND im über `letzteZeilen` gekürzten Halt-Grund erhalten; vor dem Fix schlug genau dieser Test fehl, `ergebnis` blieb `FEHLER` statt `ROT` wegen einer zu langen argv-Zeile — nach Umstellung auf eine In-Prozess-Schleife real ROT reproduziert, dann grün nach dem Fix). `npm run check` real grün, siehe Bericht. Im Reallauf bestätigt (nach dem Merge #237, F-518-Bau): `pruefergebnis-39b9288c` Version 1 (Korrekturrunde, echtes ROT aus `npm run check`, 1/771 Tests rot) trägt ein vollständig lesbares `ausgabe_ende` — die stdout-Fehlerzeile (der F-658-Flake, s. u.) steht am Artefaktende, nicht im stderr-Rauschen ertrunken. Genau der Fall, den F-655 beheben sollte, real eingetreten und real lesbar geblieben.
Feature/Run: F39 Versuch 4, 24.09.2026. Quelle: claude/f39-versuch4-diagnose.

**F-656** · `PROCESS_IMPROVEMENT` · P1 · behoben auf Branch
Titel: Kein Weg, ein ROT/ZEITGRENZE/FEHLER-Prüfergebnis (Regel 1f) direkt erneut zu prüfen — der einzige Ausweg war bis hierher eine komplette neue Workflow-Fassung mit demselben Bau.
Beschreibung: F39 Versuch 4 (24.09.2026) zeigte real, dass ein `KLAERUNG_ERFORDERLICH` aus Regel 1f oft ein Flake ist (Stefans manueller `npm run check` lief zweimal grün, derselbe Baum, derselbe Befehl). Ohne eigenen Wiederholungsweg blieb nur „korrigierte Fassung" einreichen (F-653-Muster: kein Entscheidungsartefakt, Cursor manuell umgesetzt) — unverhältnismäßig für „einfach nochmal prüfen".
Fundstelle: neu `POST /api/workflows/<id>/pruefung-wiederholen` (`scripts/leitstand-server.mjs`, direkt nach dem Freigabe-Endpunkt).
Auswirkung: Mittel — ohne diesen Weg verschleift ein Flake entweder eine Fehlbeurteilung (Mensch übersteuert die Selbstblockade ohne echte Prüfung, F-653-Muster) oder unnötige Reibung (neue Fassung für nichts als einen Testlauf).
Maßnahme: Der neue Endpunkt ist nur zulässig, wenn der Workflow auf `KLAERUNG_ERFORDERLICH` steht UND der Cursor-Schritt strukturell (nicht über den `grund`-Text) als Regel-1f-Halt erkennbar ist — `rolle: 'ausfuehrung'`, `status: 'ERFOLGREICH'`, ein registriertes Prüfergebnis ungleich `GRUEN`. Er führt denselben `pruefbefehl` für dieselbe `lauf_id` auf dem aktuellen Arbeitsbaum erneut aus, SYNCHRON (await im Handler statt Fire-and-forget — dieser Prüflauf hat keinen Rohstrom, den ein Client live mitverfolgen müsste, und sein Ergebnis ist erst nach Prozessende aussagekräftig), unter derselben D13-Sperre (`laufAktiv`) wie jeder andere Lauf. Das Ergebnis wird über `registriereKernArtefakt` als NEUE Version derselben `pruefergebnis-<laufId>`-Kette angehängt (Append, F2/ARCHITECTURE.md §7 — die alte, rote Fassung bleibt Teil der Lineage). GRUEN setzt danach über denselben Automaten fort wie ein frischer Lauf (`ermittleNaechstenSchritt` + `starteWorkflowSchritt`, Muster `POST .../freigabe` — kein zweiter Fortsetzungsmechanismus), ungleich GRUEN hält erneut auf `KLAERUNG_ERFORDERLICH`. UI: Knopf „Prüfung wiederholen" (`public/leitstand/views/workflows.js`, `renderPruefergebnis`) NUR neben der Zeile „Prüfung: ROT/ZEITGRENZE/FEHLER", solange genau diese Vorbedingung gilt.
Status: behoben auf Branch (24.09.2026, Branch `fix/f655-pruefausgabe`) — Rotfall real belegt, `scripts/check-f656-pruefung-wiederholen.mjs` (echter HTTP-Dispatch): (a) falscher Zustand → 409, (b) `KLAERUNG_ERFORDERLICH` aber nicht aus Regel 1f → 409, (c) zweiter Versuch liefert GRUEN → Review startet automatisch, (d) rot bleibt rot → erneuter Halt, Review startet nicht, (e) Artefakt-Historie trägt genau 2 Versionen (ROT, dann GRUEN), (f) D13 lehnt einen parallelen Start während der Wiederholung ab. `npm run check` real grün, siehe Bericht. Render-Nachweis (F-622) inzwischen nachgereicht: `features/F39/nachweis-f656-ui/`. Im Reallauf bestätigt (nach dem Merge #237): der Endpunkt wurde ECHT genutzt, nicht nur getestet — `pruefergebnis-9397a9dd` Version 2 UND `pruefergebnis-39b9288c` Version 2 tragen beide `herkunft.schritt: 'pruefung-wiederholen'` und `ergebnis: GRUEN` (Exit 0); Version 1 jeweils `ergebnis: ROT` aus dem vorangehenden Lauf. Für beide Ausführungsläufe des F-518-Baus hat der Mensch real auf „Prüfung wiederholen" geklickt (bzw. den Endpunkt real ausgelöst) und ist danach zum Review durchgekommen.
Feature/Run: F39 Versuch 4, 24.09.2026. Quelle: claude/f39-versuch4-diagnose.

**F-658** · `BUG` · P1 · behoben auf Branch
Titel: Flaky Test `src/claude-code-gateway/claude-code-gateway.test.ts:941` (F14 WS-2 AK4) hält Workflows im Leitstand real an — Prozessbaum-Kill-Timing unter Windows-Last.
Beschreibung: Der Test „starteProzess killt bei TIMEOUT unter Windows den kompletten Prozessbaum, kein Waisenprozess übrig" schreibt eine Enkel-PID-Marker-Datei und liest sie nach dem erwarteten Kill zurück — unter Systemlast (paralleler `npm run check`, viele gleichzeitige Kindprozesse, s. auch F-590/CLAUDE.md „Bekannte Fallen") kommt die Datei real manchmal NICHT rechtzeitig an: `ENOENT: no such file or directory, open '...f14-ws2-enkel-pid-<uuid>.txt'`. Real beobachtet im F39-Versuch-4-Reallauf des F-518-Baus: `pruefergebnis-39b9288c` Version 1 (`ausgabe_ende`, jetzt dank F-655 vollständig lesbar) zeigt genau diesen einen Testfehler bei sonst 770/771 grünen Tests — Regel 1f hielt den Workflow deshalb real auf `KLAERUNG_ERFORDERLICH`, obwohl der eigentliche Bau in Ordnung war. Laut Stefan zweimal im Leitstand real als Workflow-Halt aufgetreten.
Fundstelle: `src/claude-code-gateway/claude-code-gateway.test.ts:941` (F14 WS-2 AK4).
Auswirkung: Hoch für die Zuverlässigkeit der Prüfkette — ein für den BAU irrelevanter, last-abhängiger Testfehler löst über Regel 1f/F-656 echte Klärungsstopps aus und verschleift damit reale Befunde mit Prüfinfrastruktur-Rauschen (genau die Verwechslungsgefahr, die F-655/F-656 eigentlich entschärfen sollten — hier bleibt sie, weil die Testfehler-URSACHE selbst ein Flake ist, keine Lesbarkeitsfrage mehr).
Maßnahme (noch nicht untersucht): entweder eine großzügigere Wartefrist/Retry beim Lesen der Enkel-PID-Datei in diesem Test, oder ein robusterer Nachweis des Kills (z. B. Polling statt einmaligem Lesen, Muster `warteBis` aus den check-f*.mjs-Gates).
Status: behoben auf Branch (24.09.2026, Branch `fix/f658-f659`) — `zeitgrenzeMs` von 500ms auf 5000ms angehoben (weiterhin klar unter dem 15s-Hang des Enkels), damit der OS-Scheduler unter Last genug Vorlauf hat, den Enkelprozess real zu spawnen und dessen PID-Datei zu schreiben, bevor der Timeout-Kill zuschlägt; zusätzlich liest der Test die PID-Datei jetzt über einen Poll mit eigener Obergrenze (3000ms, Muster `warteBis` aus den check-f*.mjs-Gates) statt einmalig blind — ein rohes ENOENT wird so durch eine klare Aussage ersetzt, ohne die Härte der eigentlichen Prüfung (kein Waisenprozess nach dem Kill) zu senken. Stabilitätsbeleg: 20/20 grün ohne Last UND 20/20 grün mit paralleler Last (ein zweiter `node --test` über 115 weitere Tests, ~23s, lief währenddessen durch) — kein einziger Fehlschlag in 40 Läufen.
Feature/Run: F39 Versuch 4 (F-518-Bau), 24.09.2026. Quelle: claude/f39-versuch4-workforce-baut-f518.

**F-659** · `HARNESS_IMPROVEMENT` · P2 · behoben auf Branch
Titel: `baueReviewKorrekturInstruktion` gibt dem Review nach ANPASSUNG_ANGEFORDERT nur die Vorbefunde weiter, nicht die menschliche Abnahme-Begründung — der Reviewer meldet eine bereits vom Menschen bewusst getroffene Entscheidung dadurch fälschlich als „offen".
Beschreibung: Real beobachtet im F39-Versuch-4-Bau von F-518. Stefans erste Abnahme-Entscheidung (`entscheidung-workflow-router-9d5fedcb…-abnahme` Version 1, `ergebnis: ANPASSUNG_ANGEFORDERT`, nach Review `7952d73b` BLOCKIERT) hält ausdrücklich fest: „Zum Zielkonflikt: Die Oberfläche sendet volle Zeitstempel, deshalb weiterhin BEIDE Formate annehmen (YYYY-MM-DD und ISO-8601), aber streng prüfen […]." Die Korrektur-Ausführung (Lauf `39b9288c`, Rolle `ausfuehrung`) bekam diese Begründung real über `baueAusfuehrungKorrekturInstruktion` und setzte sie korrekt um. Der ZWEITE Review (Lauf `2d67e04e`) bekam sie NICHT — `baueReviewKorrekturInstruktion` reicht nur `vorherigeBefunde` weiter, keine `begruendung` — und meldete deshalb: „Punkt 2: offen. […] volle Zeitstempel bleiben jedoch entgegen der ausdrücklichen YYYY-MM-DD-Vorgabe erlaubt", mit der Empfehlung, das wieder einzuschränken. Stefans zweite Abnahme-Entscheidung (Version 2, `ergebnis: ANGENOMMEN`) musste das ausdrücklich richtigstellen: „Punkt 2 (Zeitstempel weiterhin erlaubt) ist bewusste Entscheidung aus der Anpassung vom 24.09. […]."
Fundstelle: `src/korrekturschleife/index.ts` (`baueReviewKorrekturInstruktion`, verglichen mit `baueAusfuehrungKorrekturInstruktion` direkt daneben, das `begruendung` bereits bekommt); Aufrufstelle `scripts/leitstand-server.mjs` (`starteWorkflowSchritt`, F-648-Block: `if (schritt.rolle === 'ausfuehrung') { ...begruendung... } else if (vorherigeBefunde.length > 0) { ...nur Befunde... }`); Belege `kontrollzustand/lineage-entscheidung-workflow-router-9d5fedcb-dead-417f-a61f-c374a167ba73-abnahme/checkpoints/` Version 1 und Version 2.
Auswirkung: Mittel — kein Datenverlust (die Begründung steht im Abnahme-Artefakt, ist also auffindbar), aber der Review meldet unnötig „offene" Punkte, die der Mensch bereits entschieden hat, und der Mensch muss das bei jeder Korrekturrunde erneut richtigstellen (hier real geschehen) statt dass die Maschine es einmal korrekt weiterreicht.
Maßnahme (Vorschlag, noch nicht gebaut): `baueReviewKorrekturInstruktion` um einen optionalen `begruendung`-Parameter erweitern (Muster `baueAusfuehrungKorrekturInstruktion`), die Aufrufstelle in `scripts/leitstand-server.mjs` reicht `abnahmeVersion.daten.begruendung` beim `code-reviewer`-Zweig genauso mit wie beim `ausfuehrung`-Zweig.
Status: behoben auf Branch (24.09.2026, Branch `fix/f658-f659`) — `baueReviewKorrekturInstruktion` (`src/korrekturschleife/index.ts`) nimmt jetzt `begruendung` als ersten Parameter (Muster `baueAusfuehrungKorrekturInstruktion` direkt daneben) und stellt sie dem Reviewer als „Verbindliche Klarstellung des Auftrags durch den Menschen … hat Vorrang vor dem ursprünglichen Auftragstext. Bewusste Entscheidungen darin sind KEIN offener Befund" voran; die Aufrufstelle (`scripts/leitstand-server.mjs`, F-648-Block) reicht dieselbe Quelle wie beim `ausfuehrung`-Zweig (`abnahmeVersion.daten.begruendung`), kein zweiter Lesepfad. Rotfall-Beleg über einen echten HTTP-Rundlauf (`scripts/check-f659-review-korrektur-begruendung.mjs`, jetzt Teil von `npm run check`): Iteration 1 (kein Abnahme-Artefakt) — Review-Auftragstext bleibt bitgenau ohne Korrektur-Block; nach einem echten `POST .../abnahme` (`ANPASSUNG_ANGEFORDERT`) auf ein reales BLOCKIERT-Urteil aus Iteration 1 trägt der Auftragstext des ZWEITEN Review-Laufs die Begründung wörtlich, den Vorrang-Hinweis UND den vorherigen Befund. `npm run check` real grün (772/772 Tests, alle Gates inkl. des neuen), siehe Bericht.
Feature/Run: F39 Versuch 4 (F-518-Bau), 24.09.2026. Quelle: claude/f39-versuch4-workforce-baut-f518.

**F-664** · `PROCESS_IMPROVEMENT` · P3 · **behoben**
Titel: `features/F39/journal.md` (letzter Eintrag) behauptete, der Render-Nachweis für `nachweis-f656-ui/` stehe noch aus — real war er bereits vollständig vorhanden (und laut `git status` bereits committed).
Beschreibung: journal.md war an dieser einen Stelle nicht mehr aktuell. Kein funktionaler Mangel (der Render-Nachweis existiert und ist inhaltlich vollständig — Rotfall/Knopf sichtbar, läuft-Zustand disabled, Grünfall, kein Knopf bei bereits laufendem Review, kein Knopf bei anderer Klärungsursache), reine Dokupflege.
Fundstelle: `features/F39/journal.md` (Eintrag „F39 Versuch 4 diagnostiziert …"); `features/F39/nachweis-f656-ui/` (protokoll.md, protokoll.json, fünf Screenshots real vorhanden).
Auswirkung: Gering — reine Dokumentationsdrift, kein Freigabe-Blocker.
Maßnahme: erledigt — journal.md um einen Nachtrag ergänzt (24.09.2026), dass der Render-Nachweis inzwischen vorhanden ist.
Status: behoben (24.09.2026, Nachtrag in `features/F39/journal.md`).
Feature/Run: F39-Feature-Review-Pass, 24.09.2026. Quelle: claude/f39-feature-gate (qa).

**F-671** · `PROCESS_IMPROVEMENT` · P3 · **behoben**
Titel: Eine Code-/Doku-Behauptung ("Startbedingung 2 lehnt ein neues Projektverzeichnis strukturell IMMER ab") wurde nicht gegen einen bereits im Repo vorhandenen Realbeleg (F25 AK8) geprüft, bevor sie in Akte und Modul-Kopf geschrieben wurde.
Beschreibung: Die ursprüngliche Fassung von `src/projekt-anlegen/index.ts` (Kopfkommentar) und `features/F41/feature.md` (Nicht-Ziele, Bekannte Grenzen) behauptete, `pruefeStartbedingung2` lehne ein neu angelegtes Projektverzeichnis "strukturell IMMER" ab, weil der Gültigkeitsschlüssel an den Pfad des ursprünglichen Repos gebunden sei. Diese Annahme war plausibel, aber falsch — und wäre durch einen Blick in `features/F25/nachweis-ws1.md` AK8 (bereits im Repo, dokumentiert einen realen Lauf gegen ein zweites Projekt, der Bedingung 2 real bestand) vor dem Schreiben der Behauptung widerlegbar gewesen. Ein Challenger-Durchgang (24.09.2026) prüfte die Behauptung gegen den tatsächlichen Code (`src/claude-code-gateway/index.ts:452`, `process.cwd()` statt Projektpfad) und den vorhandenen Realbeleg und forderte einen echten Gegenbeweis (Realnachweis AK6, zweite Runde) — der bestand die Behauptung nicht.
Fundstelle: `src/projekt-anlegen/index.ts` (Kopfkommentar, Fassung vor der Korrektur 24.09.2026); `features/F41/feature.md` (Nicht-Ziele/Bekannte Grenzen, Fassung vor der Korrektur); `features/F25/nachweis-ws1.md` AK8 (der übersehene, bereits vorhandene Gegenbeleg).
Auswirkung: Mittel — eine falsche architektonische Behauptung in einer Feature-Akte hätte, unkorrigiert, WS-2/WS-3 mit einer unnötigen Annahme belastet ("neuer Wirksamkeitsnachweis nötig") und wäre bei einer Abnahme ohne Gegenprüfung durchgegangen.
Maßnahme: Behoben (24.09.2026) — Akte und Modul-Kopf korrigiert, zweiter Realnachweis erbracht (`features/F41/nachweis-ws1.md`), `pruefeVolleStartfreigabeFuerRepo` prüft jetzt real beide Bedingungen. Prozess-Lehre: eine architektonische "lehnt strukturell ab"-Behauptung vor dem Schreiben gegen vorhandene Realnachweise in verwandten Features prüfen, nicht nur gegen den Quelltext der geprüften Funktion selbst.
Status: behoben (24.09.2026, F41-WS-1-Korrektur).
Feature/Run: F41 WS-1 Korrektur, 24.09.2026, Challenger-Befund. Quelle: claude/f41-ws1-korrektur.

**F-676** · `BUG` · P1 · **behoben**
Titel: Workforce-Assets werden relativ zum Projekt-Repo aufgelöst — neue Projekte nicht lauffähig.
Beschreibung: `ressourcen.json`, `schemas/`, `workflow-vorlagen/` und die Output-Schema-Pfade für `codex --output-schema` wurden im Kern (`scripts/leitstand-server.mjs`, `src/router/index.ts`) ausnahmslos gegen die `repoWurzel` des jeweils bearbeiteten PROJEKTS aufgelöst — nicht gegen die Installationswurzel (ai-workforce). Ein über F41 neu angelegtes Projekt hat diese Dateien strukturell nie (F41 WS-1 kopiert nur die Harness-Baseline — bewusst, AK4b). Real entdeckt im F41-WS-3-Reallauf (Projekt `haushaltsbuch`, Auftrag `1c82e21f-dd90-43bb-8338-78c9a750b002`): (1) ein Coach-Turn im Modus `projekt` scheiterte mit `500 ENOENT …\haushaltsbuch\ressourcen.json` (Workaround: Stefan kopierte die Datei manuell ins neue Repo und committete sie); (2) ein Router-Lauf lieferte eine gegen `schemas/ergebnis-router.schema.json` schemawidrige Klassifikation (`unbekanntes Feld 'aufgabentypen'; Pflichtfeld 'task_typen' fehlt`) — Ursache: der Router-Prompt (`src/router/index.ts:331`, vor der Korrektur) verwies auf den Schemapfad, der Worker lief aber im cwd des Projekts, wo `schemas/` fehlt; (3) vorhersehbar als Nächstes: `src/router/index.ts:276` (`waehleWorkflowVorlage`) las `workflow-vorlagen/<tiefe>.json` ebenfalls relativ zur Projekt-`repoWurzel`.
Fundstelle: `scripts/leitstand-server.mjs` (`leseRessourcenRoh`, `leseVorlagenSchritte`, `loeseAusgabeSchemaAuf`, `loeseSchrittEingabenAuf`, `verarbeiteRouterErgebnis`, `starteRollenChatLauf`, POST-/api/sparring- und POST-/api/auftraege/\<id\>/routen-Handler); `src/router/index.ts` (`waehleWorkflowVorlage`, `baueRouterAuftragstext`).
Auswirkung: Hoch — jedes über F41 neu angelegte Projekt war für den Coach (Modus `projekt`), den Router und jeden `codex`-Workflow-Schritt (architekt/code-reviewer, `--output-schema`) strukturell nicht lauffähig, nicht nur ein Rand- oder Performancefall. F41 WS-3 (Pflicht-AK F-666 aus F39) wäre ohne diesen Fix nicht durchführbar gewesen.
Maßnahme: Ein expliziter `installWurzel`-Parameter (Default `process.cwd()` des Serverprozesses, für jede Projekt-Instanz identisch, da alle im selben Prozess laufen) wurde neben `repoWurzel` eingeführt; jede Workforce-Asset-Auflösung (`leseRessourcenRoh`, `leseVorlagenSchritte`, `loeseAusgabeSchemaAuf`, `waehleWorkflowVorlage`, sowie `loeseSchrittEingabenAuf`s/`verarbeiteRouterErgebnis`s Output-Schema-Auflösung) nutzt seither `installWurzel` statt `repoWurzel`. `baueRouterAuftragstext` (`src/router/index.ts`) nennt die geforderte JSON-Form zusätzlich INLINE (Muster `baueArchitektAuftragstext`/`baueJarvisAuftragstext`), statt sich allein auf einen für den Worker erreichbaren Schemapfad zu verlassen — greift auch für den `claude-code`-Rückfall (kein `--output-schema`-Mechanismus, F-337). Die projektspezifische Startfreigabe (F4) und Projektinhalt (`features/`, `docs/projekt/`, Projekt-`state/`, `kontrollzustand/`) bleiben unverändert an `repoWurzel` gebunden — nur Workforce-EIGENE Assets wandern. Gate `scripts/check-fix-f676-installwurzel.mjs` (neu, in `npm run check` eingehängt): baut ein "Fremdprojekt ohne Workforce-Assets" (real `kopiereBaseline`/`schreibeStartvorlageUndProfil`, Muster F41 WS-1) und belegt sowohl den Rot-Fall (Auflösung gegen die Projekt-repoWurzel scheitert real) als auch den Grün-Fall (Coach-Kontext/Capability-Auszug, Router-Validierung + Vorlagenladen für fast-lane/standard/hoch, Architekt-Output-Schema-Auflösung — alle drei laufen gegen das Fremdprojekt durch). `docs/projekt/zielfassung.md` §13.6 um E-F41-2 ergänzt (v1.28).
Feature/Run: F41 Fixpaket „Workforce-Assets zentral" (E-F41-2), 24.09.2026. Quelle: claude/fix-f41-installwurzel.

**F-681** · `BUG` · P1 · **behoben**
Titel: `loeseRessourcenAuf` verdoppelt einen bereits absoluten Startvorlagenpfad — jedes Fremdprojekt meldet Worker als `verfuegbar:false`.
Beschreibung: `loeseProjektPfade` (`scripts/leitstand-server.mjs:8095-8105`) liefert `startvorlagePfad` für eine Projekt-Instanz bereits absolut (`join(repoWurzel, projekt.startvorlage_pfad)`). `loeseRessourcenAuf` (`src/ressourcen/index.ts:308`, vor dem Fix) baute daraus mit `join(repoWurzel, startvorlagePfad)` einen ZWEITEN, verdoppelten Pfad — `path.join` ersetzt ein bereits absolutes zweites Argument unter Windows nicht, sondern hängt es an (`C:\a\b\C:\x\y`). Real beobachtet im F41-WS-3-Reallauf (Projekt `haushaltsbuch`): `GET /api/projekte/haushaltsbuch/ressourcen` meldete "Startvorlage 'C:\Users\stefa\Projekte\haushaltsbuch\C:\Users\stefa\Projekte\haushaltsbuch\startvorlagen\haushaltsbuch.json' nicht gefunden", `codex` UND `claude-code` beide `verfuegbar:false`. Der Architekt-Lauf `288d90fa-a1a5-4e63-bb01-37a72175a4dd` lief deshalb mit einem Capability-Auszug "alle Worker nicht verfügbar" — `scripts/check-fix-f676-installwurzel.mjs` Fall (1) rief `loeseRessourcenAuf` zwar bereits mit einem exakt so geformten, absoluten Fremdprojekt-Startvorlagenpfad auf, prüfte aber nur, dass `baueCapabilityAuszug` einen NICHT-LEEREN Text liefert — ein Auszug, der "nicht verfügbar" sagt, ist ebenfalls nicht-leer und hätte den Fehler nie gezeigt.
Fundstelle: `src/ressourcen/index.ts:308` (`loeseRessourcenAuf`, vor dem Fix `join(repoWurzel, startvorlagePfad)`); `scripts/leitstand-server.mjs:8100` (`loeseProjektPfade`, liefert den bereits absoluten Pfad); `scripts/check-fix-f676-installwurzel.mjs` Fall (1), Fassung vor der Verschärfung.
Auswirkung: Hoch — jeder Coach-Turn im Modus `projekt`, jeder Architekt-Schrittstart und jede Ressourcen-Ansicht eines Fremdprojekts bekam einen falschen, "alle Worker nicht verfügbar" behauptenden Capability-Auszug; der Router fiel dadurch strukturell auf den fehleranfälligen `claude-code`-Klassifikationspfad zurück (F-337/F-391), unabhängig davon, ob `codex` real verfügbar war.
Maßnahme: Behoben (25.09.2026) — `join` durch `path.resolve` ersetzt (`resolve` ersetzt ein bereits absolutes zweites Argument korrekt, statt es anzuhängen). `scripts/check-fix-f676-installwurzel.mjs` Fall (1) verschärft: prüft seither zusätzlich real `verfuegbar === true` für `codex` UND `claude-code` gegen ein Fremdprojekt mit absolutem Startvorlagenpfad — vor dem Fix real rot (Doppelpfad-Fehlermeldung reproduziert, byte-gleich zum Reallauf-Befund), nach dem Fix grün.
Feature/Run: F41 WS-3 Reallauf, 24.09.2026. Quelle: claude/f41-ws3-reallauf-bugfix.

**F-682** · `BUG` · P1 · **behoben**
Titel: `claude-code-gateway` übergab den Prompt als Argv-Element — ein langer Auftrag löste `spawn ENAMETOOLONG` unter Windows aus, noch bevor der Prozess startete.
Beschreibung: `baueAufruf` (`src/claude-code-gateway/index.ts`) hängt den vollständigen Prompt als letztes Tokens-Element nach `-p` an; `starteGateway` reichte `eingaben.tokens` (inkl. Prompt) unverändert als Argv an `starteProzess` durch und schloss stdin nur über `stdinLeer: true` (Task "Jarvis-Chat-Latenz senken"). Real beobachtet im F41-WS-3-Reallauf: Lauf `3943c565-dd33-4df4-895f-56daf1e1fb4a` (Schritt `schritt-2-architektur`, architecture-advisor) endete nach 36ms mit `kontrollzustand-roh/3943c565-…/rohstrom.json` = `{"startfehler":{"code":"ENAMETOOLONG"}}` — der Prompt (Auftrag + Architekt-JSON + Entscheidung, ~17.500 Zeichen) überschritt zusammen mit den übrigen Argv-Elementen Windows' Kommandozeilenlänge (32.767 Zeichen), bevor der Kindprozess überhaupt startete. F-642 hatte denselben Mechanismus bereits für `codex-gateway` behoben (`starteCodexGateway`, Prompt über `stdinDaten`), aber ausdrücklich nur dort — `claude-code-gateway` blieb betroffen.
Fundstelle: `src/claude-code-gateway/index.ts` (`starteGateway`, vor dem Fix `starteProzess(eingaben.werkzeugStartziel, eingaben.tokens, { …, stdinLeer: true })`); `src/claude-code-gateway/prozessstart.ts` (`StarterOptionen.stdinDaten`, bereits von F-642 für `codex-gateway` bereitgestellt, aber vom `claude-code`-Pfad ungenutzt); `src/codex-gateway/index.ts:336-364` (`starteCodexGateway`, das bereits gelöste Vorbild).
Auswirkung: Hoch — jeder `claude-code`-Workflow-Schritt mit hinreichend langem Prompt (Auftragstext + mehrere Eingaben-Artefakte, real ab ~17.500 Zeichen beobachtet) schlug strukturell fehl, bevor überhaupt ein Modellaufruf stattfand; kein Modell-, kein Schema-Fehler, sondern ein Betriebssystem-Limit VOR dem Prozessstart. Betraf jede Rolle mit `worker: 'claude-code'` und potenziell langem Kontext (architecture-advisor, ausfuehrung, jarvis, router).
Maßnahme: Behoben (25.09.2026, Muster F-642/`codex-gateway`) — `starteGateway` spaltet `eingaben.tokens` in `spawnTokens` (ohne das letzte, Prompt-tragende Element) und `stdinDaten` (der Prompt); `spawnTokens` geht an `starteProzess`, `stdinDaten` ersetzt `stdinLeer` ersatzlos (deckt denselben "nie ein leeres, unbeantwortetes stdin"-Zweck ab). `eingaben.tokens` selbst bleibt für die Allowlist-Prüfung (`pruefeUndVerweigereBeiTreffer`) unverändert vollständig. Vor dem Fix real verifiziert: `claude -p` OHNE Positionsargument liest den Prompt vollständig aus stdin (`echo ... | claude -p ...` → korrekte Antwort). Rot-/Grün-Tests nach F-642-Muster ergänzt (`claude-code-gateway.test.ts`: 40.000-Zeichen-Argv wirft real `ENAMETOOLONG`, dieselbe Datenmenge kommt über `stdinDaten` byte-gleich am Kindprozess an, `starteGateway` selbst spawnt mit einem Argv unter der Windows-Grenze). Echter E2E-Lauf gegen `claude.exe` mit einem 37.692 Zeichen langen Prompt (real über stdin, nicht Argv): `exitCode 0`, kein `ENAMETOOLONG`, volle Antwort erhalten. Latenzvergleich (3 Wiederholungen, real gegen `claude.exe`): `stdinDaten` (neu) im Mittel 4.508ms, `stdinLeer`+Argv (alt) im Mittel 6.336ms — keine Regression für Jarvis/Router, eher schneller. Zwei bestehende Tests in `execution-controller.test.ts`, die den Prompt bisher am Argv-Ende erwarteten, auf `optionen.stdinDaten` umgestellt (sonst hätten sie den Fix als Regression gemeldet).
Feature/Run: F41 WS-3 Reallauf, 24.09.2026. Quelle: claude/f41-ws3-reallauf-bugfix.

**F-683** · `BUG` · P2 · **behoben** (Fixpaket)
Titel: Detailansicht eines Fremdprojekt-Laufs zeigt "Rohstrom nicht verfügbar", obwohl die Datei real existiert — Schreiben und Lesen von `rohstrom_referenz.pfad` laufen gegen verschiedene Wurzeln.
Beschreibung: `baueRohstromProjektion` (`scripts/leitstand-server.mjs:840-848`) löst den in der Laufakte gespeicherten, relativen `rohstrom_referenz.pfad` über `loeseEvidenzPfadAuf(referenz.pfad, repoWurzel)` gegen die PROJEKT-`repoWurzel` auf (`join(repoWurzel, pfadErgebnis.relativerPfad)`). Geschrieben wird die Datei dagegen von `starteGateway`/`starteCodexGateway` relativ zu `STANDARD_ROH_BASISVERZEICHNIS` (`'kontrollzustand-roh'`), das ohne einen projektspezifischen `rohBasisVerzeichnis`-Wert gegen den `process.cwd()` des Serverprozesses (ai-workforce) landet. Für ein Fremdprojekt (`repoWurzel` = z. B. haushaltsbuch) fallen beide Wurzeln auseinander: die Datei liegt real unter `ai-workforce\kontrollzustand-roh\<laufId>\rohstrom.json` (real belegt: Lauf `3943c565-dd33-4df4-895f-56daf1e1fb4a`, Datei vorhanden), `baueRohstromProjektion` sucht sie aber unter `haushaltsbuch\kontrollzustand-roh\<laufId>\rohstrom.json` — `existsSync(zielPfad)` scheitert, Status wird `'nicht_verfuegbar'`. Damit ist die tatsächliche Fehlerursache eines fehlgeschlagenen Fremdprojekt-Laufs (z. B. `startfehler`) im Leitstand unsichtbar, genau dann, wenn sie am dringendsten gebraucht wird. Verwandt: F-670 (derselbe `repoWurzel`-vs-Serverprozess-`process.cwd()`-Bruch, dort für `arbeitsverzeichnis_pfad`).
Fundstelle: `scripts/leitstand-server.mjs:840-848` (`baueRohstromProjektion`, löst gegen `repoWurzel`); `src/claude-code-gateway/index.ts` (`STANDARD_ROH_BASISVERZEICHNIS`, `starteGateway`, schreibt relativ ohne projektspezifische Wurzel); `src/codex-gateway/index.ts` (`starteCodexGateway`, dieselbe Schreib-Konvention).
Auswirkung: Mittel — kein Datenverlust (die Datei existiert real), aber die Detailansicht eines Fremdprojekt-Laufs verschleiert genau die Information, die zur Fehlerdiagnose gebraucht wird; real beobachtet am selben Lauf, dessen `startfehler` (F-682/ENAMETOOLONG) ohne direkten Dateizugriff im Leitstand nicht sichtbar gewesen wäre.
Maßnahme: Festlegen, wo `kontrollzustand-roh` für Fremdprojekte liegen soll (Kandidaten: projektspezifisch unter der jeweiligen `repoWurzel`, oder zentral unter der Installationswurzel wie schon `ressourcen.json`/`schemas`/`workflow-vorlagen` seit F-676) — dann Schreib- (`rohBasisVerzeichnis`-Parameter an `starteGateway`/`starteCodexGateway`) und Lesepfad (`baueRohstromProjektion`) auf dieselbe Wurzel bringen. Kein Umbau in diesem Fix (Out of Scope, nur Bug A/B).
Status: behoben (Fixpaket vor F35-Reallauf, 25.09.2026) — baueRohstromProjektion löst rohstrom_referenz.pfad gegen installWurzel auf — dieselbe Wurzel, unter der die Gateways schreiben (process.cwd() des Servers). Schreibpfad unverändert. Belegt: scripts/check-fixpaket-f30-vorbedingungen.mjs (f). Vorher: offen.
Feature/Run: F41 WS-3 Reallauf, 24.09.2026. Quelle: claude/f41-ws3-reallauf-bugfix.

**F-689** · `BUG` · P1 · **behoben** (Fixpaket)
Titel: `leseSelbstblockadeAusAusfuehrungstext` erkennt nur die feste Zeile `- [x] Blockiert` — eine echte Rückfrage der `ausfuehrung`-Rolle an den Menschen bleibt strukturell unerkannt, der Workflow läuft automatisch weiter.
Beschreibung: `SELBSTBLOCKADE_ZEILE` (`src/korrekturschleife/index.ts:97`, `/^-\s*\[[xX]\]\s*Blockiert\b/m`) prüft ausschließlich auf diese eine Markdown-Checkbox-Zeile. Real beobachtet: Lauf `40045f94-6692-44a8-9514-766c5c5f295e` (`schritt-3-ausfuehrung`, F41-WS-3-Reallauf) endete mit einer expliziten Rückfrage an den Menschen ("Frage an dich: Wie soll ich vorgehen? 1. … 2. … 3. …") und schrieb dabei bewusst keine einzige Datei — trägt aber nirgends die Zeile `- [x] Blockiert`. `leseSelbstblockadeAusAusfuehrungstext` liefert deshalb `false`, der Schritt zählt strukturell als `ERFOLGREICH`, `schritt-4-review` (code-reviewer) startete automatisch — ohne dass der Mensch die Rückfrage je zu Gesicht bekam, bevor der Workflow weiterlief (er sah sie erst nachträglich im Review-Befund bzw. bei der manuellen Auswertung).
Fundstelle: `src/korrekturschleife/index.ts:97,110-113` (`SELBSTBLOCKADE_ZEILE`, `leseSelbstblockadeAusAusfuehrungstext`); Lauf `40045f94-6692-44a8-9514-766c5c5f295e` (`result`-Text, real ohne `- [x] Blockiert`-Zeile).
Auswirkung: Hoch — eine Rolle, die eine begründete, blockierende Rückfrage stellt (statt sich willkürlich zu verweigern), wird vom Automaten wie ein normaler Erfolg behandelt; der nachgelagerte Schritt läuft auf einer Grundlage weiter, die der Mensch noch nicht gesehen hat. Real beobachtet: der `code-reviewer` fing den Fehlschlag zwar inhaltlich korrekt ab (`urteil: BLOCKIERT`, F41-WS-3-Messung), aber nur zufällig, weil die Rückfrage selbst bereits alle relevanten Fakten nannte — eine Rückfrage mit weniger Kontext hätte denselben blinden Fleck ohne Netz gelassen.
Maßnahme: `ausfuehrung`-Instruktion auf ein festes, maschinenlesbares Rückfrage-/Blockade-Signal verpflichten (Muster `- [x] Blockiert`, ggf. um einen eigenen "Rückfrage an Stefan"-Status erweitert) ODER die Erkennung erweitern, sodass eine erkennbare Frage-an-den-Menschen-Form ebenfalls als Selbstblockade zählt. Der Workflow muss in diesem Fall mit `KLAERUNG_ERFORDERLICH` halten, nicht automatisch zum Review weiterlaufen.
Status: behoben (Fixpaket vor F35-Reallauf, 25.09.2026) — 'ausfuehrung' bekommt IMMER den Hinweis, eine Rückfrage mit '- [x] Blockiert' zu beenden (starteWorkflowSchritt); zusätzlich erkennt findeRueckfrageZeile/erkenneRueckfrage (src/korrekturschleife/index.ts) eine Frage in den letzten 20 nicht-leeren Zeilen eines Laufs OHNE Dateiänderung (Änderungsübersicht ohne die Ausnahme-Pfade der Startprüfung wie kontrollzustand/; fehlt/degradiert sie, greift die Heuristik nicht). Bekannte Grenze: ab der zweiten Iteration einer Korrekturschleife zählen die noch nicht committeten Änderungen der Vorrunde mit (Vergleich gegen HEAD) — dann greift nur das feste Signal; ein lesender 'ausfuehrung'-Lauf hat keine Änderungsübersicht, für ihn gilt ebenfalls nur das feste Signal. Regel 1e hält dann mit der Fragezeile im Grund. Belegt: src/korrekturschleife/korrekturschleife.test.ts, scripts/check-fixpaket-f30-vorbedingungen.mjs (a)/(b). Vorher: offen.
Feature/Run: F41 WS-3 Reallauf, 24./25.09.2026. Quelle: claude/f41-ws3-reallauf-messung.

**F-700** · `TECH_DEBT` · P3 · erledigt
Titel: Der Skelett-Snapshot (`vorlagen/projekt-skelett/`) kann von seiner Quelle (`claude-projekt-template`) driften — nicht gehasht, kein automatischer Abgleich.
Beschreibung: `vorlagen/projekt-skelett/` ist ein per `git show 9189959:<pfad>` gezogener, händisch kuratierter Snapshot (Whitelist in `vorlagen/projekt-skelett/HERKUNFT.md`) — kein Submodul, kein Hash-Vergleich gegen die Quelle. Ändert sich `claude-projekt-template` weiter (neue Guides, korrigierte Skills), bleibt `vorlagen/projekt-skelett/` unverändert auf dem Stand von Commit `9189959` stehen, ohne dass irgendein Gate das meldet. Zusätzlich: ein verschachteltes `CLAUDE.md` im Snapshot (`vorlagen/projekt-skelett/CLAUDE.md`) wird geladen, sobald in DIESEM Ordner gearbeitet wird (z. B. bei einer künftigen Pflege des Skeletts selbst) — es beschreibt dann fälschlich die Regeln eines generischen Template-Projekts statt die von ai-workforce.
Fundstelle: `vorlagen/projekt-skelett/HERKUNFT.md` (Herkunfts-SHA `9189959`, kein automatisierter Abgleich); `vorlagen/projekt-skelett/CLAUDE.md` (verschachteltes Anweisungsdokument).
Auswirkung: Niedrig — kein aktueller Fehler, aber ein sich langsam vergrößernder Drift zwischen Template und Snapshot, den niemand bemerkt, bis ein neues Projekt spürbar veraltete Skelett-Inhalte bekommt.
Maßnahme: Bei einer künftigen Pflege des Skeletts die SHA in `HERKUNFT.md` gegen den aktuellen `claude-projekt-template`-Stand abgleichen (manueller Prozess, kein Automatismus in diesem WS). Kein Umbau jetzt (YAGNI — noch kein beobachteter Driftfall).
Status: erledigt (F45 B1a-2, 11.10.2026): HERKUNFT.md trägt je Skelett-Datei SHA-256 und Herkunft (template / lokal geändert / lokal neu); neues Gate `scripts/check-skelett-herkunft.mjs` in `npm run check` wird rot bei fehlender, neuer oder geänderter Datei. Drift Template ↔ Skelett bleibt bewusst manuell (Template ist in der CI nicht vorhanden; Commit `9189959` voll in HERKUNFT.md, Pflege über `--ausgeben`).
Feature/Run: F42 WS-1, 25.09.2026.

**F-701** · `HARNESS_IMPROVEMENT` · P3 · erledigt
Titel: `check:template` in ai-workforce (`package.json`) enthält projektspezifische Gates (`check-f1b…f13` u. a.), obwohl `CLAUDE.md` es als stackunabhängig bezeichnet — ai-workforce ist damit selbst kein Beispiel für ein "leeres Template".
Beschreibung: `CLAUDE.md` beschreibt `npm run check:template` als "stack-unabhängige Gates … bleibt im leeren Template grün". Der reale `check:template`-Eintrag in ai-workforces eigenem `package.json` ruft aber zusätzlich zu den drei generischen Gates (`check-docs`/`check-rules`/`check-contract`) noch `check-feature.mjs`, `check-datenformate.mjs`, `check-checkpoint-store.mjs`, `check-lineage-registry.mjs`, `check-f1b-wirkungsmarke.mjs`, `check-f3-authorization-boundary.mjs`, `check-f9-human-transport.mjs`, `check-f5-context-builder.mjs`, `check-f4-invocation-policy.mjs`, `check-f6a-claude-code-gateway.mjs`, `check-f7-result-evaluator.mjs`, `check-f8-execution-controller.mjs`, `check-f10-leitstand.mjs`, `check-f11-auftrag.mjs`, `check-f12-leitstand-ansicht.mjs`, `check-f13-entscheiden.mjs` auf — allesamt ai-workforce-eigene, produktspezifische Gates. F42s neu angelegtes Projekt bekommt dagegen sein EIGENES, sauberes `check:template` aus dem Skelett (nur die drei generischen Gates) — der Widerspruch besteht ausschließlich in ai-workforces EIGENER `package.json`.
Fundstelle: `package.json` (Zeile mit `"check:template"`, im Vergleich zur Beschreibung in `CLAUDE.md`, Abschnitt "Befehle").
Auswirkung: Niedrig — kein funktionaler Fehler (die zusätzlichen Gates laufen korrekt), aber eine irreführende Selbstbeschreibung: wer `CLAUDE.md` liest und `npm run check:template` gegen ai-workforce selbst ausführt, erwartet einen leeren, stackunabhängigen Lauf und bekommt tatsächlich einen produktspezifischen.
Maßnahme: `check:template` in ai-workforces `package.json` auf die drei generischen Gates zurückschneiden (Muster: das Skelett unter `vorlagen/projekt-skelett/package.json` zeigt bereits die korrekte Fassung) — die produktspezifischen Gates gehören in `check` (dort bereits vorhanden). Bewusst NICHT in F42 WS-1 umgesetzt (Out of Scope laut Auftrag: "F-701 beheben" explizit ausgeschlossen) — Maßnahme für einen künftigen, eigenen Fixpaket-Auftrag.
Status: erledigt (F45 B1a-2, 11.10.2026): `check:template` = check-docs, check-rules, check-contract; alle 16 entfernten Gates standen schon in `check` (geprüft), CI ruft `npm run check`; Kopfkommentare der Gates nachgezogen.
Feature/Run: F42 WS-1, 25.09.2026.

**F-703** · `BUG` · P1 · gelöst
Titel: Coach-Vorlage gibt das `pruefbefehl`-argv roh aus (absolute `node.exe`/`npm-cli.js`-Pfade, unquotiert) — mit der Allowlist `Bash(npm run …)` nicht ausführbar, Regression für ai-workforce.
Beschreibung: `kontext.pruefbefehl` ist ein argv-Array mit absolutem Programmpfad (`schreibeStartvorlageUndProfil`, `src/projekt-anlegen/index.ts` — nötig, weil `starteProzess` `execFile` ohne Shell verwendet und ein bloßes `'npm'` unter Windows nur auf `npm.cmd` auflöst). Die Coach-Auftragsvorlage gab dieses argv bislang über ein rohes `.join(' ')` aus: „C:\Program Files\nodejs\node.exe C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js run check:template muss danach grün sein." — für Stefan weder direkt ausführbar (unquotierte Windows-Pfade mit Leerzeichen) noch mit der Allowlist vereinbar (die erlaubt nur `npm run check`/`check:template`/`lint`/`typecheck`/`test`, keinen `node.exe`-Direktaufruf), und für ai-workforce selbst eine sichtbare Regression gegenüber dem bisherigen "npm run check". Das ursprüngliche F42-WS-1-Gate (d) in `scripts/check-f42-projekt-harness.mjs` testete nur künstliches argv (`['node','npm-cli.js','run','check:template']`), das bereits wie die gewünschte Anzeigeform aussah — der Fehler blieb dadurch verdeckt.
Fundstelle: `src/product-coach/index.ts:716-718` (jetzt: Aufruf von `anzeigePruefbefehl`), `public/leitstand/auftrag-aus-projektentwurf.js:131-132` (Browser-Kopie); `startvorlagen/ai-workforce.json:10` (reales absolutes argv, Beispiel für die "eigen"-Form).
Auswirkung: Hoch — jeder über den Coach im Modus `projekt`/`erweiterung` erzeugte Auftrag enthielt einen für Stefan unbrauchbaren Prüfhinweis, sowohl für neu angelegte Fremdprojekte (F42) als auch für ai-workforce selbst.
Maßnahme: Neue reine Funktion `anzeigePruefbefehl(argv)` (Server-TS + bytegenaue Browser-JS-Kopie) — erkennt das Muster `[node(.exe), …npm-cli.js, …rest]` und zeigt `npm ${rest}`; sonst quotet sie jedes Element mit Leerzeichen. Coach-Text nutzt sie an beiden Stellen. `scripts/check-f34-product-coach.mjs` (q) und `scripts/check-f42-projekt-harness.mjs` (d) testen jetzt mit ECHTEN argv (aus `startvorlagen/ai-workforce.json` bzw. real aus `schreibeStartvorlageUndProfil` erzeugt) statt künstlicher Fixtures, plus einem Quotier-Rot-Fall.
Status: gelöst. Verweis: `src/product-coach/index.ts` (`anzeigePruefbefehl`), `public/leitstand/auftrag-aus-projektentwurf.js`, `scripts/check-f34-product-coach.mjs` (q), `scripts/check-f42-projekt-harness.mjs` (d).
Feature/Run: F42 WS-1 Verifikation, 25.09.2026.

**F-705** · `BUG` · P1 · gelöst
Titel: `schreibeStartvorlageUndProfil` leitet `npm-cli.js` nur im Windows-Layout aus `process.execPath` ab; auf Linux (CI) Wurf, CI rot. Lokal grün, weil nur unter Windows entwickelt wird.
Beschreibung: Die F42-WS-1-Korrektur (löst F-667) leitete `npm-cli.js` fest über `join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')` ab — das ist das Windows-Layout (`<node-dir>/node_modules/npm/bin/npm-cli.js`). Auf dem Linux-CI-Runner (GitHub Actions, `.github/workflows/ci.yml`) liegt npm stattdessen unter `<prefix>/lib/node_modules/npm/bin/npm-cli.js` — real beobachtet im CI-Log des PR #249: „npm-cli.js nicht am erwarteten Pfad gefunden ('/opt/hostedtoolcache/node/24.21.0/x64/bin/node_modules/npm/bin/npm-cli.js', abgeleitet aus process.execPath='/opt/hostedtoolcache/node/24.21.0/x64/bin/node')" — Wurf in `schreibeStartvorlageUndProfil` (`src/projekt-anlegen/index.ts:281`), ausgelöst von `scripts/check-f34-product-coach.mjs:925`. Lokal (Windows, alle bisherigen Gate-Läufe) blieb der Fehler unbeobachtet, weil hier ausschließlich unter Windows entwickelt und getestet wird.
Fundstelle: CI-Log PR #249, Run auf `feat/projekt-harness-ws1`; `src/projekt-anlegen/index.ts:279` (vorherige, Windows-feste Ableitung).
Auswirkung: Hoch — CI (`check`-Job, Pflicht-Status-Check vor Merge, `state/gates.md` „Branch Protection") war für den gesamten PR rot, unabhängig von der inhaltlichen Korrektheit des übrigen Codes.
Maßnahme: Neue Funktion `findeNpmCli` (`src/projekt-anlegen/index.ts`) — Reihenfolge `process.env.npm_execpath` (falls gesetzt und endet auf `npm-cli.js`) → Windows-Layout → Linux/macOS-Layout (`<prefix>/lib/node_modules/npm/bin/npm-cli.js`); erster real existierender Kandidat gewinnt, kein Treffer wirft mit allen geprüften Pfaden. `schreibeStartvorlageUndProfil` nutzt sie jetzt statt der festen Windows-Ableitung. Gate-Test in `scripts/check-f42-projekt-harness.mjs` (c2) mit injizierten `execPath`/`npmExecpath`/`existsSync` (kein echtes Dateisystem-Layout nötig) — Windows-Layout, Linux-Layout, `npm_execpath`-Vorrang, Rot-Fall „kein Treffer".
Status: gelöst. Verweis: `src/projekt-anlegen/index.ts` (`findeNpmCli`), `scripts/check-f42-projekt-harness.mjs` (c2).
Feature/Run: F42 WS-1 PR-CI (PR #249), 25.09.2026.

Nachtrag (25.09.2026, zweite CI-Runde, derselbe PR #249): der erste Fix (Commit `bd53bc7`) beseitigte den ursprünglichen Fund, brach aber selbst erneut auf CI — diesmal nicht in `findeNpmCli` selbst (die real gemessene Produktions-Erkennung über `process.env.npm_execpath` funktionierte auf dem Linux-Runner bereits korrekt, sichtbar am vorangehenden `✓ (c)`-Log), sondern im NEUEN Gate-Test (c2) in `scripts/check-f42-projekt-harness.mjs`: (1) `npmExecpath: undefined` wurde übergeben, um `npm_execpath` in der Testfixture zu deaktivieren — `??` behandelt ein explizites `undefined` aber genauso wie ein fehlendes Feld und fiel auf den ECHTEN `process.env.npm_execpath` des CI-Runners zurück; (2) der Windows-Layout-Testkandidat wurde über das plattformabhängige `dirname`/`join` konstruiert — unter POSIX (Linux-CI) zerlegt das einen mit Backslash geschriebenen Pfad nicht korrekt, das Ergebnis wich vom real in `findeNpmCli` berechneten Kandidaten ab. Behoben: die drei betroffenen Testaufrufe übergeben jetzt `npmExecpath: ''` (kein nullish-Wert, deaktiviert den Kandidaten zuverlässig) statt `undefined`; `findeNpmCli` UND der Testcode berechnen den Windows-Layout-Kandidaten jetzt beide explizit über `path.win32.join`/`path.win32.dirname` statt des host-abhängigen Defaults — deterministisch unabhängig vom tatsächlichen Betriebssystem. Lokal zusätzlich mit real gesetzter `npm_execpath`-Umgebungsvariable nachgestellt (`npm_execpath="C:\fake\npm-cli.js" node scripts/check-f42-projekt-harness.mjs`) — bestätigt grün. Ursprüngliche Beschreibung bleibt als historischer Stand unverändert stehen.

Nachtrag (25.09.2026, dritte CI-Runde, derselbe PR #249): mit beiden `findeNpmCli`-Funden behoben lief CI bis Prüfung (d) durch (real bestätigt im CI-Log: `✓ (c2)`, `✓ (d)`), scheiterte dann an einem DRITTEN, unabhängigen Testbug — diesmal in Prüfung (e) (Trust-Erkennung), nicht mehr `findeNpmCli`-nah. Die "bewusste Grenze"-Rot-Fall-Fixture konstruierte eine "andere Laufwerksbuchstabe-Schreibweise" über eine feste Regel `/^[A-Z]:/` — auf dem Linux-CI-Runner liegt `TEST_WURZEL` unter `/tmp/…`, ohne Laufwerksbuchstaben, die Regel griff nie, die Fixture war dadurch WORTGLEICH zum echten Schlüssel (kein echter Rot-Fall mehr) und `pruefeWorkspaceTrust` lieferte korrekt `'true'` — die Testassertion (die `'fehlend'` erwartete) schlug fehl, obwohl der geprüfte Code selbst richtig arbeitete. Behoben: die Fixture invertiert jetzt plattformunabhängig die Groß-/Kleinschreibung des GESAMTEN normalisierten Schlüssels (funktioniert für jeden Pfad mit mindestens einem kasussensitiven Zeichen — Windows-Laufwerksbuchstabe, UUID-Hexziffern, Ordnernamen), mit einer expliziten Selbstprüfung, die einen Befund meldet, falls der cwdPfad ausnahmsweise gar kein kasussensitives Zeichen enthält, statt still einen bedeutungslosen Test zu bestehen. `npm run check` lokal weiterhin vollständig grün (775 Tests).

**F-707** · `BUG` · P1 · gelöst
Titel: `STACK_OFFEN_HINWEIS` erreichte den Architekten zur Laufzeit nie — `scripts/leitstand-server.mjs` rief `baueArchitektAuftragstext` ohne `stackOffen` auf, obwohl der Validator es bei offenem Stack bereits verlangte.
Beschreibung: `scripts/leitstand-server.mjs:4156` (`starteWorkflowSchritt`) rief `baueArchitektAuftragstext(auftragVersion.daten.auftragstext, modus, capabilityAuszug)` OHNE das in F42 WS-2 eingeführte vierte Argument `stackOffen` auf — der Parameter blieb beim Default `false`, `STACK_OFFEN_HINWEIS` erschien in keinem real umhüllten Auftragstext, unabhängig vom tatsächlichen Stack-Zustand des Zielprojekts. Gleichzeitig verlangte `leseArchitekturErgebnisAusLaufakte` (dieselbe Datei, bereits mit `istStackOffen(repoWurzel)` verdrahtet) bei offenem Stack bereits eine `entscheidungen_mensch[]`-Entscheidung mit `kategorie:'stack'` — der Architekt bekam die neue Pflicht also durchgesetzt, aber nie die Anweisung dazu. In jedem neu angelegten Projekt (Stack per Definition offen, F42 WS-1) wäre praktisch jede Architektur-Ausgabe ungültig gewesen, ohne dass der Architekt eine Chance hatte, es richtig zu machen.
Fundstelle: `scripts/leitstand-server.mjs:4156` (vor dem Fix, in `starteWorkflowSchritt`, Umgebung `4145`-`4156`); Gegenstelle `leseArchitekturErgebnisAusLaufakte` (dieselbe Datei), die `istStackOffen(repoWurzel)` bereits korrekt erhielt. Entdeckt bei der F42-WS-2-Verifikation (nicht vom WS-2-Gate selbst, das nur den reinen Builder prüfte — siehe F-708).
Auswirkung: Hoch — jeder Architektur-Lauf gegen ein neu angelegtes Projekt (Stack offen) wäre real fast sicher als ungültig zurückgekommen (`haltKlaerung`, Regel 1c), ohne dass der Architekt je erfahren hätte, dass er eine `kategorie:'stack'`-Entscheidung vorlegen muss — eine strukturelle Sackgasse für jeden F42-Workflow, nicht nur ein Randfall.
Maßnahme: `scripts/leitstand-server.mjs:4156` übergibt jetzt `istStackOffen(repoWurzel)` (das PROJEKT, nicht `installWurzel`) als viertes Argument. Gate-Nachweis am REALEN Aufrufpfad statt nur am Builder: `scripts/check-f39-architekt.mjs` (n3) belegt das Nicht-Vorkommen des Hinweises gegen DIESES Repo (Stack gefüllt, derselbe Server wie (n1)/(n2)); (n4) startet einen zweiten, eigenen Server mit einer Wegwerf-`repoWurzel` OHNE `CLAUDE.md` und belegt, dass der Hinweis dort real im an den Worker gereichten Auftragstext ankommt. Rot-Fall real reproduziert: die Korrektur testweise zurückgenommen (Argument entfernt) → `node scripts/check-f39-architekt.mjs` → Befund `(n4) F-707: … sollte den Stack-Hinweis tragen, tat es aber nicht`; wiederhergestellt → Exit 0. Dokumentiert in `state/gates.md` (Kalibrierungs-Log, 25.09.2026).
Status: gelöst (25.09.2026). Verweis: `scripts/leitstand-server.mjs:4156`, `scripts/check-f39-architekt.mjs` (n3)/(n4).
Feature/Run: F42 WS-2 Verifikation, 25.09.2026.

**F-711** · `BUG` · P2 · gelöst
Titel: Entscheidungsformular für `entscheidungen_mensch[]` wählt im UI die erste Option vor, nicht die vom Architekten empfohlene.
Beschreibung: Real beobachtet bei der Stack-Entscheidung des `haushaltsbuch2`-Reallaufs (Architekt-Lauf `20037ee3`, `kategorie: 'stack'`): das Entscheidungsformular im Leitstand markiert beim Öffnen die erste gelistete Option als vorausgewählt, unabhängig davon, ob sie mit der vom Architekten referenzierten Empfehlung übereinstimmt. In diesem Lauf war die erste Option NICHT die empfohlene — Stefan musste aktiv umschalten, um TypeScript/Node.js/SQLite (die Empfehlung) statt der vorausgewählten ersten Option zu wählen.
Fundstelle: Leitstand-Entscheidungsformular für `entscheidungen_mensch[]` (Workflow-Ansicht, Options-Rendering).
Auswirkung: Mittel — ein unaufmerksamer Klick auf "Entscheidung speichern" ohne bewusste Options-Prüfung würde die NICHT empfohlene Option übernehmen, obwohl der Architekt eine begründete Empfehlung referenziert hatte.
Maßnahme: Keine Vorauswahl treffen (Formular zwingt zu einer bewussten Auswahl) oder die tatsächlich empfohlene Option vorauswählen, nie einfach die erste gelistete. Test ergänzen, der eine vom Index abweichende Empfehlung gegen die tatsächliche Vorauswahl prüft.
Status: gelöst. `public/leitstand/views/workflows.js` (`renderArchitekturEntscheidung`) wählt bereits seit F39 WS-2b (Commit `caa860e`) `option.titel === frage.empfehlung`, nicht die Options-Position — der reale Reallauf-Befund war die im Moment beobachtete Verwechslung von "erste Option" mit "nicht empfohlene Option" (in `haushaltsbuch2` stand die Empfehlung zufällig nicht an erster Stelle, das UI markierte sie trotzdem korrekt). F42 WS-4 ergänzt ein deterministisches statisches Quelltext-Gate (`scripts/check-f42-projekt-harness.mjs`, Block (i)) inkl. Regressions-Grep gegen eine index-basierte Vorauswahl — damit ist die Zusage jetzt geprüft, nicht nur behauptet.
Feature/Run: F42 WS-3 Reallauf, 25.09.2026; gelöst F42 WS-4, 25.09.2026.

**F-712** · `BUG` · P1 · gelöst
Titel: `ausfuehrung` setzt den Architekturentwurf (Schema, Validator, Prüfkette, ADRs) um, obwohl der Projektmodus-Auftrag ausdrücklich nur Doku erlaubte.
Beschreibung: Real beobachtet im `haushaltsbuch2`-Reallauf, Lauf `3e0c0a31` (`ausfuehrung`): der Auftrag beschränkte den Scope explizit auf Doku (Nachweisdatei, Findings, Feature-Akte). Der Lauf schrieb zusätzlich zur beauftragten Doku Produktcode um: `schemas/`, `scripts/check-schemas.mjs`, erweiterte `package.json`-Check-Ketten, `state/gates.md`, ADR-Dateien 0001–0003 — alles Umsetzung des Architektur-Entwurfs, nicht Teil des Auftragsumfangs. Der Prüfschritt (`check:template`) lief danach GRÜN, weil die neuen Dateien in sich konsistent waren, verdeckte damit aber den Scope-Verstoß.
Fundstelle: Lauf `3e0c0a31` (`ausfuehrung`, Diff gegen den Auftragstext); Architektur-Entwurf desselben Reallaufs (Quelle der umgesetzten Elemente).
Auswirkung: Hoch — eine `ausfuehrung`-Rolle, die den Architekturentwurf unabhängig vom tatsächlichen Auftrags-Scope umsetzt, unterläuft die Zusicherung "ein Auftrag, ein klar benannter Zielumfang" (CLAUDE.md-Arbeitsweise); ein Nur-Doku-Auftrag darf strukturell keinen Produktcode berühren, tat es hier aber, und der grüne Prüfschritt allein hätte das nicht aufgedeckt.
Maßnahme: Der Auftrags-Scope muss gegenüber dem Architekturentwurf Vorrang haben — der Entwurf ist Kontext, kein Ausführungsbefehl; eine deterministische Pfad-Allowlist-Prüfung (Auftrag benennt erlaubte Pfadpräfixe, ein Schritt, der außerhalb schreibt, wird als Scope-Verstoß erkannt statt nur inhaltlich vom Review bemerkt) wäre die strukturelle Lösung.
Status: gelöst. Zwei Hälften, beide additiv: (1) `baueUmsetzungsInstruktion` (`src/architekt/index.ts`) bekommt einen `modus`-Parameter — im Projektmodus verlangt sie ausdrücklich Scope-Vorrang und verbietet Produktcode/Schemas/Skripte/`package.json`/`scripts/check-*`, statt wie im Feature-Modus zur Umsetzung von ADRs/Schemas anzuleiten; Default (`'feature'`) bleibt bitgenau die bisherige Instruktion. (2) `pruefeProjektmodusScope` prüft NACH dem Lauf deterministisch die real geänderten Dateien (aus der bestehenden Änderungsübersicht, F23 WS-0) eines Projektmodus-`ausfuehrung`-Schritts gegen die Allowlist `docs/**`/`features/**`/`CLAUDE.md`; neue Regel 1g (`src/workflow/index.ts`) hält den Workflow bei einem Verstoß an (`KLAERUNG_ERFORDERLICH`, Grund nennt die Datei(en)), real verdrahtet in `scripts/leitstand-server.mjs`. Feature-Modus bleibt strukturell unberührt (Feld nur im Projektmodus berechnet). Real belegt am Aufrufpfad (Rot-/Grün-/Featuremodus-Regressionsfall): `scripts/check-f42-projekt-harness.mjs` Block (g), `state/gates.md` (2026-09-25).
Feature/Run: F42 WS-3, Lauf `3e0c0a31`, 25.09.2026; gelöst F42 WS-4, 25.09.2026.

**F-713** · `HARNESS_IMPROVEMENT` · P1 · **behoben** (Fixpaket)
Titel: `ausfuehrung` kann die Prüfkette ändern, mit der sie selbst gemessen wird.
Beschreibung: Derselbe Lauf `3e0c0a31` (siehe F-712) erweiterte `package.json`s `check:template`-Kette um `scripts/check-schemas.mjs` — ein von demselben Lauf neu geschriebenes Skript. Der anschließende Prüfschritt lief damit gegen eine Prüfkette, die der zu prüfende Lauf selbst verändert hatte, nicht gegen den Stand vor dem Lauf.
Fundstelle: Lauf `3e0c0a31` (`package.json`-Diff, `check:template`-Zeile); F-712 (derselbe Lauf, Scope-Verstoß insgesamt).
Auswirkung: Mittel — ein "GRÜN" des Prüfschritts ist kein verlässlicher Nachweis mehr, wenn der geprüfte Lauf die Prüfkette selbst erweitern kann; ein Fehler im neuen Skript würde sich selbst nie als Rot melden, weil er erst nach der Erweiterung existiert.
Maßnahme: Änderungen an der Prüfkette selbst (`package.json`-Check-Zeilen, neue Gate-Skripte) sollten gesondert markiert werden, oder der Prüfschritt eines Laufs sollte grundsätzlich gegen die Prüfkette vom Stand VOR dem Lauf laufen, nicht gegen die vom Lauf selbst veränderte.
Status: behoben (Fixpaket vor F35-Reallauf, 25.09.2026) — neue Regel 1j (src/workflow/index.ts) in BEIDEN Modi: ermittlePruefkettenAenderungen (src/aenderungsuebersicht/index.ts) meldet ein gegenüber HEAD abweichendes package.json-'scripts'-Objekt oder eine BESTEHENDE Datei unter scripts/check-*/.github/workflows/* mit Status GEAENDERT/GELOESCHT/UMBENANNT; neue Dateien allein lösen nichts aus. Halt-Grund 'Prüfkette durch den Lauf verändert: … — menschliche Sichtung vor Fortsetzung'. Nur für schreibende Läufe (ein lesender kann die Prüfkette nicht ändern; schreibende starten nur auf sauberem Arbeitsbaum, HEAD ist dort der Stand vor dem Lauf). Fehlt die Änderungsübersicht oder ist sie degradiert, hält 1j fail closed ('Prüfkette nicht ermittelbar'). Die Ausführung der Prüfkette vom Stand vor dem Lauf bleibt bewusst offen (Out of Scope). Bekannte Grenze: ab der zweiten Iteration einer Korrekturschleife hält 1j erneut wegen derselben, bereits gesichteten Änderung (Vergleich gegen HEAD), bis sie committet ist; ein Auftrag „neues Gate in npm run check eintragen“ hält wegen package.json scripts immer an — gewollt. ~~Bekannte Grenze: eine Umbenennung AUS scripts/check-* heraus bleibt unerkannt (die Änderungsübersicht trägt nur den neuen Pfad).~~ **Erledigt durch F-735** (alter_pfad in der Änderungsübersicht, 1j prüft alten und neuen Pfad). ~~Bekannte Grenze: Hilfsdateien der Prüfkette (scripts/_*, biome.json, tsconfig*.json) sind nicht erfasst.~~ **Erledigt durch F-735** (Default-Liste, projektspezifisch ergänzbar über pruefketten_pfade). Belegt: scripts/check-fixpaket-f30-vorbedingungen.mjs (c)/(d)/(e), Unit-Tests. Vorher: offen. Nachtrag F42 WS-4 (25.09.2026): im PROJEKTMODUS ist dieses konkrete Szenario jetzt durch F-712s Allowlist abgedeckt — `pruefeProjektmodusScope` lehnt eine Änderung an `package.json`/`scripts/check-*.mjs` durch einen `ausfuehrung`-Lauf strukturell ab (Regel 1g), unabhängig davon, ob die neue Prüfkette danach konsistent gewesen wäre. Damit kann sich im Projektmodus keine Prüfkette mehr selbst erweitern. Der FEATUREMODUS-Fall (ein `ausfuehrung`-Lauf innerhalb von ai-workforce selbst erweitert `package.json`/eigene Gates, wofür Schreibzugriff darauf legitim sein kann) bleibt ausdrücklich offen — dort greift die Allowlist bewusst nicht (AK3, Nicht-Ziel "Feature-Modus unverändert"). Nachtrag M5-Schnitt (25.09.2026, `docs/projekt/zielfassung.md` §13.6, E-M5-16): Priorität P2 → P1 — blockiert F30 (Gültigkeit der Messung, Bestehensbedingung M5/V1 Punkt 5).
Feature/Run: F42 WS-3, 25.09.2026.

**F-714** · `TECH_DEBT` · P1 · gelöst
Titel: Die menschliche Stack-Entscheidung (`kategorie: 'stack'`) bleibt nach der Entscheidung im Kontrollzustand stecken — weder `CLAUDE.md`-Stack-Abschnitt noch ADR werden verpflichtend geschrieben.
Beschreibung: Real beobachtet im `haushaltsbuch2`-Reallauf: Stefan traf die Stack-Entscheidung (TypeScript/Node.js/SQLite, Z5) über das Entscheidungsformular — der Wert landet als Antwort im Workflow-Entscheidungsartefakt, aber kein nachfolgender Bauschritt ist verpflichtet, ihn in `CLAUDE.md`s Stack-Abschnitt oder ein ADR zu übertragen. Ergebnis: `CLAUDE.md` blieb beim Füllungs-Marker `[FÜLLUNG]` stehen (`istStackOffen` bleibt `true`), ADR-0003 wurde stattdessen eigenmächtig vom `ausfuehrung`-Lauf geschrieben (Teil des Scope-Verstoßes F-712, aber inhaltlich die einzige Stelle, an der die Entscheidung je real irgendwo landete).
Fundstelle: `haushaltsbuch2/CLAUDE.md` (unverändert `[FÜLLUNG]` nach der Entscheidung); ADR-0003 (eigenmächtig von `ausfuehrung`, siehe F-712); `src/architekt/index.ts` (`istStackOffen`, erkennt weiterhin offenen Stack, weil `CLAUDE.md` nie geschrieben wurde).
Auswirkung: Hoch — solange `CLAUDE.md`/ADR nicht verpflichtend nach der Entscheidung geschrieben werden, fragt jeder weitere Architektenlauf gegen dasselbe Projekt erneut nach demselben Stack (`istStackOffen` bleibt `true`), und ein Reviewer kann die getroffene Festlegung an keiner maschinenlesbaren Stelle verifizieren.
Maßnahme: Nach einer Entscheidung mit `kategorie: 'stack'` sollte der nächste Bauschritt verpflichtend den `CLAUDE.md`-Stack-Abschnitt und ein ADR schreiben — deterministisch geprüft (z. B. Gate, das nach einer solchen Entscheidung `istStackOffen(repoWurzel) === false` erzwingt), nicht der Hoffnung auf einen `ausfuehrung`-Lauf überlassen, der eigenmächtig handelt.
Status: gelöst. `baueStackEntscheidungsInstruktion` (`src/architekt/index.ts`) hängt an den Auftragstext des `ausfuehrung`-Schritts eine Pflicht-Instruktion an — CLAUDE.md-Stack-Abschnitt füllen (Füllungs-Marker entfernen) UND ein ADR mit Verweis auf das Entscheidungsartefakt (`workflow-entscheidung-<workflowId>`) anlegen —, sobald der referenzierte Architektur-Lauf eine `kategorie:'stack'`-Entscheidung trägt UND dafür bereits eine menschliche Antwort erfasst ist (`findeWorkflowEntscheidungFuerSchritt`). Neue Regel 1h (`src/workflow/index.ts`) prüft danach deterministisch BEIDE Schreibziele nach — QA-Befund während WS-4 (eine erste Fassung prüfte nur `istStackOffen`, ein Lauf ohne jedes ADR hätte bestanden): `istStackOffen(repoWurzel)` UND `traegtAdrVerweisAufEntscheidung(repoWurzel, entscheidungArtefaktId)` (neu, `src/architekt/index.ts`, liest `docs/adr/*.md` auf einen Verweis auf die Entscheidungsartefakt-Id). Erfüllt eines der beiden nicht, hält der Workflow mit dem Grund `"Stack entschieden, aber CLAUDE.md/ADR nicht vollständig gepflegt (F-714)"` an, statt zum Review fortzusetzen — die Grenze ist damit nicht mehr nur eine Anleitung, sondern ERZWUNGEN (kalibrierter Rot-/Grün-Fall, inkl. des Halb-erfüllt-Rot-Falls). Real belegt am Aufrufpfad: `scripts/check-f42-projekt-harness.mjs` Block (h1)-(h3), `state/gates.md` (2026-09-25).
Feature/Run: F42 WS-3 Z8, 25.09.2026; gelöst F42 WS-4, 25.09.2026.

**F-715** · `HARNESS_IMPROVEMENT` · P2 · erledigt
Titel: Der schreibende Werkzeugsatz der `ausfuehrung`-Rolle kann nicht löschen — eine Korrektur, die Löschungen verlangt, endet in Blockiert plus Handarbeit.
Beschreibung: Real beobachtet im `haushaltsbuch2`-Reallauf: nach der Review-Rückmeldung (Z7, Scope-Verstoß F-712) forderte die Korrekturschleife eine Anpassung an, die unter anderem das Entfernen der eigenmächtig hinzugefügten Dateien (`schemas/`, `scripts/check-schemas.mjs`, ADR-0001–0003 etc.) verlangte. Lauf `28fd1ae5` bekam die Abnahme-Begründung korrekt über das Kontextpaket übermittelt und setzte sie um, konnte die verlangten Löschungen aber strukturell nicht durchführen — der `schreibend`-Werkzeugsatz enthält kein Löschwerkzeug. Der Lauf meldete das ehrlich als Blockiert (`KLAERUNG` korrekt ausgelöst, kein stiller Fehlschlag), der Rest musste danach von Hand gelöscht werden, der Workflow wurde gestoppt.
Fundstelle: Lauf `28fd1ae5` (`ausfuehrung`, Korrekturversuch); Werkzeugsatz-Definition `schreibend` (kein Löschwerkzeug enthalten).
Auswirkung: Mittel — kein Fehlverhalten am Kontrollzustand (die Selbstblockade griff korrekt), aber eine strukturelle Lücke: jede Korrektur, die eine Löschung verlangt, braucht zwingend menschliche Handarbeit statt eines automatisierten Korrekturdurchlaufs.
Maßnahme: Ein eng begrenztes Löschwerkzeug im Baupfad ergänzen (Sicherheitsentscheidung Stefan — Umfang, Pfad-Allowlist und Protokollierung müssen vorher geklärt werden, kein unbegrenztes `rm`). Kein Umbau in diesem Nur-Doku-Auftrag.
Status: erledigt (F45 B1a-1, E-F45-3 = A): im eigenen Arbeitsordner nennt die Ausführung Dateien in einem Block `zu_loeschen` (schemas/ergebnis-ausfuehrung-loeschliste.schema.json); der Server prüft je Pfad (relativ, kein `..`, realpath im Arbeitsordner, reguläre Datei, nichts unter `.git`, `.claude/`, `kontrollzustand/`) und löscht; Ergebnis in der Änderungsübersicht (Feld `loeschliste`). Kein Bash(rm). Real belegt im Korrekturlauf add92616 (runs-dialog.test.mjs gelöscht).
Feature/Run: F42 WS-3, Lauf `28fd1ae5`, 25.09.2026.
Zugeordnet: Fixpaket Arbeitsfähigkeit (E-M5-18, 01.10.2026).

**F-718** · `TECH_DEBT` · P2 · **behoben** (Fixpaket)
Titel: Kein Test für den Fall, dass Regel 1g (Scope-Verstoß) UND Regel 1h (Stack nicht gefüllt) im selben `ausfuehrung`-Lauf gleichzeitig zutreffen.
Beschreibung: QA-Pass (F42-Review, 25.09.2026): Der reale `haushaltsbuch2`-Reallauf (Lauf `3e0c0a31`) zeigte genau diese Kombination — Scope-Verstoß (F-712) UND `CLAUDE.md` blieb `[FÜLLUNG]` (F-714) traten gleichzeitig auf. Im Gate (`scripts/check-f42-projekt-harness.mjs`, Blöcke g/h) und in den Unit-Tests sind Regel 1g und Regel 1h aber ausschließlich als vollständig getrennte Testfälle mit je eigenem Fixture-Workflow abgedeckt. Welche der beiden Regeln bei gleichzeitigem Verstoß den `grund`-Text bestimmt (`src/workflow/index.ts:882-905` implementiert 1g vor 1h, was Vorrang von 1g nahelegt, aber unbelegt) oder ob beide kombiniert gemeldet werden, ist nicht geprüft.
Fundstelle: `src/workflow/index.ts:882-905` (Regel 1g vor 1h); `scripts/check-f42-projekt-harness.mjs` Blöcke (g)/(h) (getrennte Fixtures); Lauf `3e0c0a31` (realer Kombinationsfall).
Auswirkung: Mittel — genau der reale Fall, der WS-4 motivierte, kombinierte beide Verstöße; die aktuelle Testabdeckung kann nicht belegen, dass beide Regeln in Kombination das erwartete Verhalten zeigen.
Maßnahme: Einen Gate-/Unit-Testfall ergänzen, der beide Verstöße im selben Lauf reproduziert, und die Vorrang-/Kombinationslogik explizit dokumentieren.
Status: behoben (Fixpaket vor F35-Reallauf, 25.09.2026) — Regeln 1g, 1h und 1j werden gesammelt statt 'erste Regel gewinnt' ausgewertet — EIN haltKlaerung, dessen Grund jeden zutreffenden Verstoß in der Reihenfolge 1g → 1h → 1j nennt (Trenner ' | '); bei genau einem Verstoß bleibt der Text wortgleich. Reihenfolge im Kommentar vor den Regeln dokumentiert. Belegt: src/workflow/workflow.test.ts (F-718-Tests). Vorher: offen.
Feature/Run: F42-Review-Pass (qa), 25.09.2026.

**F-724** · `PROCESS_IMPROVEMENT` · P3 · **erledigt** (F36 WS-1)
Titel: E-M5-5 (Feld `installation`, R2-Lockerung) ist entschieden, aber `schemas/ressourcen.schema.json` kennt kein `installation`, obwohl F29 `ABGESCHLOSSEN` ist.
Beschreibung: `docs/projekt/zielfassung.md` §13.6 E-M5-5 lockert Schema-Regel R2 — `FREIGEGEBEN` ist für `typ: extern` zulässig, sobald der Eintrag ein lokal prüfbares Feld `installation` (Pfad/Befehl/Version) trägt; das sollte die Blockade von F29 WS-0 lösen. F29 (Design Scout + visuelle Produktisierung) steht laut `docs/STATUS.md` auf `ABGESCHLOSSEN`, aber `schemas/ressourcen.schema.json` trägt kein `installation`-Feld — unklar, ob F29 WS-0 die Blockade auf einem anderen Weg gelöst hat oder ob hier eine Lücke zwischen Entscheidung und Schema besteht.
Fundstelle: `schemas/ressourcen.schema.json`; `docs/projekt/zielfassung.md` §13.6 E-M5-5; `docs/STATUS.md` (F29 `ABGESCHLOSSEN`).
Auswirkung: Niedrig — kein aktueller Schaden, aber eine ungeklärte Diskrepanz zwischen einer dokumentierten Entscheidung und dem Schema-Ist-Stand.
Maßnahme: Klären, wie F29 WS-0 tatsächlich aufgelöst wurde (Schema-Ergänzung an anderer Stelle, andere Lösung, oder Entscheidung nie umgesetzt); Ergebnis in F36 nachziehen.
Status: erledigt (F36 WS-1, 28.09.2026) — E-M5-5 umgesetzt: `schemas/ressourcen.schema.json` trägt `installation` (R4), `validiereRessourcenDaten` lässt `FREIGEGEBEN` für `typ: extern` nur mit `installation` zu (R2 neu), zusätzlich E-F36-4 für `unterart: mcp`.
Feature/Run: M5-Schnitt, 25.09.2026.

**F-730** · `HARNESS_IMPROVEMENT` · P2 · **erledigt** (F36 WS-4)
Titel: Ein `ausfuehrung`-Lauf kann Harness-Subagenten und Skills selbst aufrufen, unsichtbar in der Laufakte.
Beschreibung: Ein `ausfuehrung`-Lauf (`claude-code`, `--setting-sources project`, `src/claude-code-gateway/index.ts` ~Z. 371) kann Harness-Subagenten (`.claude/agents`) und Skills (`.claude/skills`) selbst aufrufen — das wird weder gemessen noch in der Laufakte sichtbar. Reine Beobachtung, kein Verbot.
Fundstelle: `src/claude-code-gateway/index.ts` ~Z. 371.
Auswirkung: Niedrig — kein bekannter Missbrauchsfall, aber ein Sichtbarkeitsloch im Wirksamkeitsnachweis eines Laufs.
Maßnahme: In F36 Subagent- und Skill-Aufrufe aus dem Rohstrom in die Laufakte projizieren.
Status: erledigt (F36 WS-4, 28.09.2026) — optionales Laufakten-Feld `beobachtung` (init-Zeile + Skill-/Subagent-/MCP-Aufrufe, `leseBeobachtung`), Zeile „Beobachtung“ in der Laufdetailansicht; Render-Nachweis `features/F36/nachweis-ws4-ui/`; `npm run check` grün.
Feature/Run: F35 WS-2, 25.09.2026.

**F-732** · `TECH_DEBT` · P2 · **behoben** (F35 WS-2)
Titel: `leseTopLevelBullets` erkannte ausschließlich `- `-Bullets — andere Listenformen lieferten 0 AK statt eines Ergebnisses.
Beschreibung: `src/feature-auftrag/index.ts`' `leseTopLevelBullets` (WS-1) erkannte am Zeilenanfang ausschließlich `- `. Eine Feature-Akte mit `*`- oder nummerierten Listen (`1.`/`1)`) unter `## Akzeptanzkriterien` lieferte dadurch 0 AK-Bullets — `baueAuftragAusFeatureAkte` lehnte den Auftrag mit `ok:false` ab, obwohl die Akte inhaltlich vollständige AKs trug. Eine Markdown-Checkbox (`- [ ]`/`- [x]`) blieb zusätzlich Teil des AK-Texts.
Fundstelle: `src/feature-auftrag/index.ts`, `leseTopLevelBullets`.
Auswirkung: Mittel — eine plausible, verbreitete Markdown-Schreibweise für Listen scheiterte an der Ableitung, ohne dass der Fehlertext den wahren Grund (Bullet-Form) nannte.
Maßnahme: `BULLET_EINLEITUNG_MUSTER` erkennt `-`, `*`, `<n>.` und `<n>)`; eine führende Checkbox wird vom AK-Text entfernt. `src/product-coach/index.ts` (Auftrag aus dem Projekt-Interview) gibt zusätzlich das AK-Format `- AK<n>: <prüfbarer Satz>` verbindlich vor, damit neu erzeugte Akten die unterstützte Form treffen.
Status: behoben.
Feature/Run: F35 WS-2, 25.09.2026.

**F-733** · `TECH_DEBT` · P2 · **behoben** (#260, #261)
Titel: Der Kontrollzustand wird nie committet, obwohl `kontrollzustand/` laut `.gitignore` getrackt ist.
Beschreibung: `.gitignore` (Z. 76–77) trackt `kontrollzustand/`, aber der Ordner wird in der Praxis nie committet. Über 300 ungetrackte Laufartefakte liegen auf `main` (Jarvis-, Coach- und Router-Läufe, Workflows, Entscheidungen, Checkpoints 31–79 von `lineage-chat-ai-workforce`).
Fundstelle: `git status` auf `feat/f35-ws1-feature-auftrag`, 25.09.2026; `.gitignore` Z. 76–77.
Auswirkung: Mittel — Git führt für diesen Ordner real nicht: bei einem Neu-Klon oder Reset geht der Zustand verloren; `git status` ist unlesbar und verleitet zu `git add -A`.
Maßnahme: Commit-Politik für den Kontrollzustand festlegen, oder ihn ausdrücklich lokal halten und `.gitignore` entsprechend anpassen (Entscheidung Mensch, eigenes Fixpaket). Entscheidung Stefan: Option A (sichern). Umgesetzt mit `npm run zustand:sichern` (`scripts/zustand-sichern.mjs`, Gate `scripts/check-zustand-sichern.mjs`): Das Skript legt den Branch `zustand/<datum>` an und stagt nur `kontrollzustand/`, es committet nie.
Status: behoben (#260 zustand:sichern, erste Sicherung #261, 25.09.2026).
Feature/Run: F35 WS-2, 25.09.2026.

**F-734** · `TECH_DEBT` · P3 · **behoben** (Fixpaket)
Titel: Nach einer Anpassung hängt ein Workflow mit AUTOMATISCH-Ausführungsschritt dauerhaft auf LAEUFT.
Beschreibung: F35 WS-3 setzt nach einem Review-BLOCKIERT/AK-Verstoß den Ausführungsschritt automatisch zurück (wendeAutomatischeAnpassungAn), startet ihn aber bewusst nie selbst (AK4). Trägt dieser Schritt freigabe 'AUTOMATISCH' statt 'ZWINGEND', gibt es keinen Freigabe-Halt, der den Menschen holt — der Workflow bleibt auf LAEUFT stehen, niemand dispatcht ihn erneut. Die Vorlagen tragen für 'schreibend' ohnehin 'ZWINGEND', aber kein Validator erzwang das; Gate-Fixtures und handangelegte Workflows konnten davon abweichen.
Fundstelle: scripts/check-f15-automat-real.mjs:317–320 (warteAufWorkflowStatusOderAbnahme, Kommentar zum dauerhaften LAEUFT); src/workflow/index.ts (pruefeSchrittForm).
Auswirkung: Gering — nur bei nicht vorlagenbasierten Workflows erreichbar, dort aber ein stiller Hänger ohne Halt-Grund.
Maßnahme: Validator „schreibend ⇒ ZWINGEND“ in pruefeSchrittForm (validiereWorkflowDaten, eine Quelle). Gate-Fixtures mit schreibendem AUTOMATISCH-Schritt tragen jetzt 'ZWINGEND' mit bereits erteilter Freigabe (freigabe_erteilt: true) bzw. starten über POST …/freigabe, ohne ihren Prüfgegenstand zu ändern. Hinweis (bewusster Bestandsbruch, Entscheidung Mensch offen): ein bereits persistierter Bestands-Workflow mit schreibendem AUTOMATISCH/EMPFOHLEN-Schritt gilt jetzt als ungültig — /starten antwortet 409, die Detailansicht zeigt Verstöße, ein Nachlauf-Schreibvorgang über einen Serverneustart hinweg scheiterte. Real betroffen im lokalen Kontrollzustand: lineage-workflow-f15-ws4-l1, -f16-ws3b-ak12, -f17-ws3-ak8, -f17-ws3-ak9 (alte Gate-Bestände). Alternative nach Muster F-285: die Regel als Halt in ermittleNaechstenSchritt statt im Validator. Außerdem prüft der Validator den Werkzeugsatz-NAMEN 'schreibend', nicht die aufgelöste Art (die Startvorlage ist ihm unbekannt) — heute deckungsgleich.
Status: behoben (Fixpaket vor F35-Reallauf, 25.09.2026). Belegt: src/workflow/workflow.test.ts (Rotfälle F-734), scripts/check-fixpaket-f30-vorbedingungen.mjs (g).
Feature/Run: Verifikation F35 WS-3, 25.09.2026.

**F-735** · `HARNESS_IMPROVEMENT` · P1 · **behoben** (fix/f735-pruefketten-pfade)
Titel: Regel 1j kennt nur fest verdrahtete Node-Pfade und übersieht Umbenennungen und Hilfsdateien der Prüfkette.
Beschreibung: Regel 1j (F-713) prüfte nur scripts/check-* und .github/workflows/* gegen eine fest verdrahtete Liste. Eine Umbenennung AUS der Prüfkette heraus blieb unsichtbar (die Änderungsübersicht trug bei R nur den neuen Pfad), Hilfsdateien (biome.json, tsconfig*.json, scripts/_*) waren nicht erfasst, ein Nicht-Node-Stack (pyproject.toml, pytest.ini …) gar nicht.
Fundstelle: src/aenderungsuebersicht/index.ts, PRUEFKETTEN_PFADE.
Auswirkung: Hoch — bei einem Nicht-Node-Stack (Opportunity Scanner, F30: Stack noch offen) prüft 1j faktisch nichts, die M5-Bestehensbedingung 5 („Prüfkette unverändert“) wäre nicht messbar.
Maßnahme: (1) Startvorlagenfeld pruefketten_pfade (optional, Glob-Muster relativ zur Repo-Wurzel, '*'/'**'/Präfix; Validator pruefePruefkettenPfade in src/startvorlage/index.ts lehnt '..'-Segmente, absolute Pfade und Backslashes ab). Es ERGÄNZT die immer aktive Default-Liste STANDARD_PRUEFKETTEN_MUSTER (scripts/check-*, .github/workflows/**, biome.json, tsconfig*.json, scripts/_*, .eslintrc*, eslint.config.*, vitest.config.*, jest.config.*). (2) ermittlePruefkettenAenderungen bekommt die Muster als Parameter (reine Funktion); der Server nimmt Default + Feld der beim Aufbau geladenen Startvorlage + Feld des frisch gelesenen Stands. (3) Die Änderungsübersicht speichert bei UMBENANNT additiv alter_pfad (Schema additiv erweitert, Alt-Artefakte bleiben gültig); 1j prüft alten und neuen Pfad. (4) Regel 1h verlangt bei erfasster Stack-Entscheidung zusätzlich pruefketten_pfade in der Startvorlage (frisch gelesen; fehlt/ungültig → Halt „Stack entschieden, aber pruefketten_pfade in der Startvorlage fehlt“); Eine LEERE Liste erfüllt die Pflicht nicht (QA-Befund). baueStackEntscheidungsInstruktion nennt das Feld mit Python-Beispiel. (5) Liegt die Startvorlage im Projekt-Repo, ist ihr eigener Pfad Teil der wirksamen Muster (QA-/Review-Befund: sonst könnte ein Lauf 1h selbst erfüllen oder Muster unbemerkt ändern). (6) Der Validator lehnt '?', '[]' und '{}' ab (sie würden wörtlich gelesen und still nie treffen). Der package.json-scripts-Sonderfall bleibt unverändert. Bekannte Grenzen: Groß-/Kleinschreibung zählt; die Default-Liste deckt nur die Repo-Wurzel ab (verschachtelte packages/*/tsconfig.json nur über pruefketten_pfade); Pfade mit Tab/Zeilenumbruch/'"' liefert git auch mit core.quotePath=false gequotet (vorbestehend, F-713).
Status: behoben (25.09.2026). Belegt: src/aenderungsuebersicht/aenderungsuebersicht.test.ts, src/startvorlage/startvorlage.test.ts, src/workflow/workflow.test.ts, src/architekt/architekt.test.ts (F-735-Fälle); scripts/check-fixpaket-f30-vorbedingungen.mjs (h)–(m); scripts/check-f42-projekt-harness.mjs (h3) als Grün-Gegenfall zu (l).
Feature/Run: Entdeckt bei der Bewertung der bekannten Grenzen des Fixpakets, 25.09.2026.

**F-736** · `PROCESS_IMPROVEMENT` · P2 · **behoben** (feat/zustand-sichern)
Titel: Freigabedatei wurde auch für manuelle Commits verlangt, wirkt dort aber nicht und hinterlässt einen gültigen Schlüssel.
Beschreibung: `.claude/hooks/commit-guard.cjs` ist ein PreToolUse-Hook auf Bash und prüft/verbraucht `state/freigabe-commit.md` nur bei `git commit`/`git push` aus einer Claude-Sitzung. Die Challenger-Terminal-Blöcke seit F-706 (und die erste Fassung der `zustand:sichern`-Ausgabe) ließen den Menschen die Datei trotzdem vor manuellen Git-Befehlen in PowerShell schreiben — dort prüft sie niemand, `.githooks/pre-push` prüft nur die Divergenz zu `origin/main`.
Fundstelle: `.claude/hooks/commit-guard.cjs` (PreToolUse/Bash), `.githooks/pre-push`, Challenger-Terminal-Blöcke seit F-706.
Auswirkung: Ein gültiger Schlüssel liegt 10 Minuten offen, eine parallele Claude-Sitzung im selben Verzeichnis könnte committen; Scheinsicherheit.
Maßnahme: Regel getrennt nach Weg (manuell: keine Freigabedatei; Claude: je Commit/Push eine), Skriptausgabe und Guide korrigiert — `scripts/zustand-sichern.mjs` gibt keine Set-Content-Zeilen mehr aus, nur einen Hinweis (`FREIGABE_HINWEIS`); `docs/guide/04-DEEPDIVE-gedaechtnis.md` beschreibt die seit Vertrag 5 (PR #12, 28.08.2026) wiederhergestellte Pflicht und ihre Grenze.
Status: behoben (feat/zustand-sichern, 25.09.2026). Belegt: scripts/zustand-sichern.test.mjs (naechsteBefehle, F-736), scripts/check-zustand-sichern.mjs (5).
Feature/Run: Verifikation zustand:sichern, 25.09.2026.

**F-738** · `PROCESS_IMPROVEMENT` · P2 · **erledigt** (E-F36-2)
Titel: E-F36-1 verweist für die Bestätigung auf „bestehende planaenderung“; die kann aber nur Freigaben abschwächen, keine Schritte hinzufügen. Zusätzlich hat die Rolle qa kein Output-Schema.
Beschreibung: Die Entscheidungsart planaenderung ist nur für das Abschwächen einer Freigabepflicht vorgesehen (`FREIGABEPFLICHT_ABGESCHWAECHT`), nicht für das Einfügen eines Schritts. Die Rolle qa trägt kein Output-Schema, gegen das ihr Ergebnis validiert werden könnte.
Fundstelle: `src/entscheidung/types.ts` (FREIGABEPFLICHT_ABGESCHWAECHT); `src/rollen/index.ts` (Rolle qa).
Auswirkung: Mittel — E-F36-1 ist in dieser Form nicht umsetzbar, ohne dass F36 stillschweigend eine neue Entscheidungsart oder ein neues Schema erfindet.
Maßnahme: in der F36-Akte und der zielfassung präzisieren (E-F36-2).
Status: erledigt (Stefan, 28.09.2026, E-F36-2 = A): V1 ohne Schritt-Empfehlung, die Empfehlung wird deterministisch im Kern ausgewertet — es wird kein Schritt eingefügt, also ist keine `planaenderung` nötig; das fehlende qa-Output-Schema ist Auslöser des Backlog-Postens „Schritt-Empfehlung".
Feature/Run: F36-Challenge-Vorbereitung, 25.09.2026.

**F-739** · `PROCESS_IMPROVEMENT` · P2 · **behoben** (docs/harness-gedaechtnis)
Titel: Bauaufträge nannten die Harness-Pflichten (Prüfpass, Advisor-Entscheidung, Doku-Heimaten) nicht durchgängig.
Beschreibung: Der Auftrag zu F-735 enthielt keinen Doku-Nachzug; ARCHITECTURE.md §1 und `state/gates.md` blieben ohne pruefketten_pfade bzw. Regel 1j/1h.
Fundstelle: Prompt-Übergabe F-735 (#262).
Auswirkung: Mittel — Doku-Heimaten laufen dem Code hinterher, ohne dass ein Gate es bemerkt.
Maßnahme: Verhaltensregel „Harness-Einordnung in jedem Bauauftrag“ in `docs/harness/HARNESS-LEARNING-STATE.md` und Trigger „Bauauftrag verfassen“ in `state/triggers.md`.
Status: behoben (docs/harness-gedaechtnis, 26.09.2026).
Feature/Run: harness-gedaechtnis, 26.09.2026.

**F-740** · `HARNESS_IMPROVEMENT` · P1 · **behoben** (docs/harness-gedaechtnis)
Titel: Die Lern-Dateien des Harness waren seit dem Setup unbefüllt.
Beschreibung: `docs/harness/HARNESS-LEARNING-STATE.md`, `docs/harness/HARNESS-CHANGELOG.md`, `state/reibung.md` und `state/triggers.md` standen auf dem Template-Stand; check-docs Prüfung 4 war auskommentiert und konnte die Auslassung deshalb nicht melden.
Fundstelle: `scripts/check-docs.mjs` Prüfung 4 (`dokumentPaare`).
Auswirkung: Hoch — gelernte Regeln lebten nur in Findings und Chats; ein vergessener Nachtrag fiel keinem Gate auf.
Maßnahme: befüllt, check-docs Prüfung 4 (CHANGELOG → LEARNING-STATE) aktiviert und kalibriert (`state/gates.md`, Kalibrierungs-Log 2026-09-26).
Status: behoben (docs/harness-gedaechtnis, 26.09.2026).
Feature/Run: harness-gedaechtnis, 26.09.2026.

**F-741** · `PROCESS_IMPROVEMENT` · P2 · **behoben** (docs/harness-gedaechtnis)
Titel: Bauaufträge wurden seit F11 nicht mehr als Handoff-Vertrag unter state/tasks/ abgelegt.
Beschreibung: Aufträge an Claude Code kamen nur als Chat-Text; das Vertrags-Gate (`scripts/check-contract.mjs`) hatte seit F11 keinen neuen Vertrag zu prüfen.
Fundstelle: `state/tasks/`.
Auswirkung: Mittel — der Auftrag ist im Repo nicht nachvollziehbar, das Vertrags-Gate läuft leer.
Maßnahme: `state/tasks/harness-gedaechtnis.md` als erster Vertrag seit F11, Trigger „Bauauftrag verfassen“.
Status: behoben (docs/harness-gedaechtnis, 26.09.2026).
Feature/Run: harness-gedaechtnis, 26.09.2026.

**F-743** · `HARNESS_IMPROVEMENT` · P3 · **behoben** (docs/harness-gedaechtnis)
Titel: CLAUDE.md über der 200-Zeilen-Grenze (Zähne-Taxonomie S19).
Beschreibung: CLAUDE.md hatte 204 Zeilen; der behobene F-590-Block in „Bekannte Fallen“ war Protokoll, keine offene Falle.
Fundstelle: CLAUDE.md, Abschnitt „Bekannte Fallen“.
Auswirkung: Gering — jede Zeile über der Grenze verdrängt Kontext in jeder Sitzung.
Maßnahme: F-590-Block nach `state/reibung.md` verschoben; CLAUDE.md jetzt 191 Zeilen.
Status: behoben (docs/harness-gedaechtnis, 26.09.2026).
Feature/Run: harness-gedaechtnis, 26.09.2026.

**F-750** · `BUG` · P1 · **behoben** (dieser PR, fix/f35-reallauf-fixpaket)
Titel: Architekt und Advisor kannten entschiedene ADRs nicht; istStackOffen sieht nur den CLAUDE.md-Marker; Stack-Frage gegen ADR 0003 neu eröffnet.
Beschreibung: Der Architekt (codex) bekam nur Auftragstext und Profil. haushaltsbuch2 hat ADR 0003 „Entschieden: TypeScript/Node.js/SQLite“, aber den CLAUDE.md-Stack noch mit `[FÜLLUNG]`. `STACK_OFFEN_HINWEIS` erzwang eine Stack-Frage, der Architekt empfahl Browser-Speicher, also genau die in ADR 0003 verworfene Option. Der Advisor las docs/adr/ ebenfalls nicht.
Fundstelle: `src/architekt/index.ts` (`istStackOffen`, `baueArchitektAuftragstext`), `src/architecture-advisor/index.ts`, `scripts/leitstand-server.mjs` (Schrittstart).
Auswirkung: Hoch — bereits getroffene Entscheidungen des Menschen wurden neu verhandelt.
Maßnahme: `leseEntschiedeneAdrs` liest docs/adr/*.md mit `Status: Entschieden` (Titel + „## Entscheidung“, gekürzt); Architekt- und Advisor-Auftragstext tragen den Block „Bereits entschiedene Projektentscheidungen (bindend)“ samt Regel; bei offenem Stack nennt der Architekt die ADR-Wahl als Empfehlung. Gate `scripts/check-fixpaket-f35-reallauf.mjs` (c)/(d). Restgrenze: istStackOffen bleibt marker-basiert, der Validator verlangt bei offenem Stack weiterhin eine Stack-Entscheidung.
Status: behoben (fix/f35-reallauf-fixpaket, 28.09.2026).
Feature/Run: F35-Reallauf haushaltsbuch2, 28.09.2026.

**F-752** · `BUG` · P1 · **behoben** (dieser PR, fix/f35-reallauf-fixpaket)
Titel: Feature-Modus-Umsetzungsinstruktion beschränkte die Ausführung auf das Zurückschreiben des Entwurfs; kein Produktcode.
Beschreibung: `baueUmsetzungsInstruktion('feature')` hängte nur vier Rückschreib-Punkte an (ADR, Schema, Akte-Abschnitte, Entscheidung Mensch). Die Ausführung (Lauf 7873df97) schrieb nur ADR 0004, ein Schema, scripts/check-schemas.mjs und Akte-Abschnitte und hielt den Bau ausdrücklich für „out of scope … per the task's explicit 4-bullet translation instructions“. Review (codex) daraufhin BLOCKIERT, AK1–AK3 NICHT_ERFUELLT.
Fundstelle: `src/architekt/index.ts` (`baueUmsetzungsInstruktion`).
Auswirkung: Hoch — der Pfad `hoch` konnte kein Feature bauen.
Maßnahme: Rückschreib-Punkte als Teil 1, danach Teil 2 „Feature bauen“ (Tests je AK, eigener Prüflauf, Werkzeugwahl nach Skill, ARCHITECTURE.md füllen) und der Satz „Das Zurückschreiben des Entwurfs allein erfüllt den Auftrag NICHT.“ Projektmodus bitgenau unverändert. Gate (a)/(b).
Status: behoben (fix/f35-reallauf-fixpaket, 28.09.2026).
Feature/Run: F35-Reallauf haushaltsbuch2, 28.09.2026.

**F-753** · `BUG` · P1 · **behoben** (dieser PR, fix/f35-reallauf-fixpaket)
Titel: 1h im Feature-Modus geprüft, Stack-Instruktion nur im Projektmodus angehängt.
Beschreibung: `scripts/leitstand-server.mjs` hängte `baueStackEntscheidungsInstruktion` nur bei `modus === 'projekt'` an, die 1h-Prüfung (`stackNichtGefuellt`, `stackPruefkettenPfadeFehlen`) lief modusunabhängig. Im Feature-Modus verlangte der Halt etwas, das nie beauftragt wurde.
Fundstelle: `scripts/leitstand-server.mjs` (Schrittstart, Anhängen der Stack-Instruktion; Nachlauf Regel 1h).
Auswirkung: Hoch — ein Feature-Workflow mit Stack-Entscheidung hielt zwingend.
Maßnahme: Modus-Bedingung entfernt; Instruktion und 1h haben dieselbe Vorbedingung (Stack-Entscheidung im Architekt-Lauf UND erfasste Antwort). Gate (b).
Status: behoben (fix/f35-reallauf-fixpaket, 28.09.2026).
Feature/Run: F35-Reallauf haushaltsbuch2, 28.09.2026.

**F-754** · `BUG` · P1 · **behoben** (dieser PR, fix/f35-reallauf-fixpaket)
Titel: Werkzeugsatz 'schreibend' ohne Bash; ein echter Bau mit Abhängigkeiten war unmöglich. Entscheidung E-F754 = A.
Beschreibung: `werkzeugsaetze.schreibend` in `startvorlagen/ai-workforce.json` trug Read, Grep, Glob, Write, Edit. Die Ausführung konnte weder `npm install` noch Typecheck/Tests laufen lassen („no shell execution capability“). Neue Projekte erben die Werkzeugsätze.
Fundstelle: `startvorlagen/ai-workforce.json`, `src/startvorlage/index.ts`, `src/claude-code-gateway/index.ts` (`baueAufruf`).
Auswirkung: Hoch — kein Bau mit Abhängigkeiten möglich.
Maßnahme: E-F754 = A (Stefan, 28.09.2026), `docs/adr/ausfuehrung-bash-allowlist.md`: feste Bash-Allowlist für Paket- und Prüfbefehle; Validator mit positiver Allowlist (nacktes Bash, Wildcards, git, PowerShell abgewiesen); `baueAufruf` gibt `--tools` die Werkzeugnamen (real gemessen: `--tools` mit Regelsyntax deaktiviert Bash) und setzt `--disallowedTools Bash(git:*)`. Gate (e)/(f). Bestehende Projekte (haushaltsbuch2) tragen die Allowlist in ihrer eigenen Startvorlage nicht; das trägt der Mensch nach.
Status: behoben (fix/f35-reallauf-fixpaket, 28.09.2026).
Feature/Run: F35-Reallauf haushaltsbuch2, 28.09.2026.

**F-756** · `TECH_DEBT` · P2 · **behoben** (dieser PR, fix/f35-reallauf-fixpaket)
Titel: `Bash(npm install:*)` und `Bash(npx tsc:*)` sind breiter als „Paket- und Prüfbefehle“.
Beschreibung: `npm install:*` erlaubt auch `npm install -g <paket>` und `--prefix <anderes-repo>`, also Wirkung außerhalb des Projekts. `npx tsc` lädt ohne lokales TypeScript das fremde Registry-Paket `tsc` (ohne TTY nimmt npx `--yes` an). Die Liste ist so im Vertrag festgelegt (E-F754).
Fundstelle: `startvorlagen/ai-workforce.json`, `src/startvorlage/index.ts` (`ERLAUBTE_BASH_REGELN`), `docs/adr/ausfuehrung-bash-allowlist.md`.
Auswirkung: Mittel — größere Angriffsfläche als nötig, begrenzt durch ZWINGEND-Freigabe.
Maßnahme: Entscheidung Stefan (28.09.2026, verengen): `Bash(npm install)`/`Bash(npm ci)` exakt ohne `:*`, `Bash(npx tsc:*)` gestrichen (`npm run typecheck` reicht). Neue Pakete trägt die Ausführung in package.json ein und ruft danach `npm install` auf (baueUmsetzungsInstruktion). Real gemessen (claude 2.1.258): `npm install` läuft, `npm install -g <paket>`, `npm install <paket>` und `npm ci --ignore-scripts` werden abgelehnt. Gate (e) weist die alten Regeln als Verstoß ab.
Status: behoben (fix/f35-reallauf-fixpaket, 28.09.2026).
Feature/Run: fix/f35-reallauf-fixpaket, Advisor- und Review-Pass, 28.09.2026.

**F-760** · `BUG` · P1 · **behoben** (dieser PR, fix/f760-verweigert-bau)
Titel: Ein vollständiger Baulauf mit Bash-Allowlist endete wegen abgelehnter Probebefehle als VERWEIGERT ohne Änderungsübersicht und Prüfergebnis; die Kette zum Review riss ab.
Beschreibung: Reallauf F35, Iteration 2 (haushaltsbuch2, Lauf 08c84cd7, 28.09.2026): Die Ausführung hat F1 vollständig gebaut (Code, 19 Tests, eigener `npm run check` grün), endete aber VERWEIGERT. `permission_denials`: `git status`/`git log` (3×), `node -e …` (2×), `node_modules/.bin/biome check --write .`, `npm run lint:fix` — alle korrekt abgelehnt (Allowlist E-F754, Sperre `Bash(git:*)`), kein Bypass-Verdacht. Die Instruktion (`baueUmsetzungsInstruktion`) nannte die Bash-Allowlist selbst nie — nur die Werkzeugrechte trugen sie, die Ausführung probierte deshalb wiederholt Befehle außerhalb. `scripts/leitstand-server.mjs` registrierte für VERWEIGERT weder Änderungsübersicht noch Prüfergebnis (nur für ERFOLGREICH), der Review-Schritt (Eingaben `aenderungsuebersicht-@`/`pruefergebnis-@`) war damit unerreichbar — ein vollständiger Bau ohne Sackgasse-Ausweg.
Fundstelle: `src/architekt/index.ts` (`baueUmsetzungsInstruktion`), `scripts/leitstand-server.mjs` (`starteLaufUndVergiss`-Registrierungsblock, Nachlauf-Rückruf mit Regeln 1g/1h/1j).
Auswirkung: Hoch — ein real vollständiger Bau lief in eine Sackgasse, kein Review, keine menschliche Sichtung möglich, nur ein Neustart von vorn.
Maßnahme: (1) `baueUmsetzungsInstruktion('feature', traegtBashRegeln)` hängt an Teil 2 die aus `ERLAUBTE_BASH_REGELN` abgeleitete Befehlsliste an — nur, wenn der Werkzeugsatz des Schritts tatsächlich eine `Bash(...)`-Regel trägt; der Satz selbst steht jetzt in der eigenständigen, exportierten `baueBashAllowlistSatz()`. (2) Endet ein `ausfuehrung`-Lauf VERWEIGERT mit `bypass_verdacht_anzahl === 0`, registriert der Kern Änderungsübersicht und Prüfergebnis wie bei ERFOLGREICH und hält den Workflow mit `KLAERUNG_ERFORDERLICH`, Grund „Lauf endete VERWEIGERT (ohne Bypass-Verdacht). Abgelehnte Befehle: … — menschliche Sichtung vor Fortsetzung (F-760)“, ergänzt um dieselben Nachlauf-Verstöße wie Regeln 1g/1h/1j (Muster F-718), OHNE `ermittleNaechstenSchritt`/Regeln 1e–1j selbst zu ändern (die Klassifikation VERWEIGERT und der fail-closed-Halt bleiben unverändert — mit Bypass-Verdacht > 0 bleibt das Verhalten bitgenau wie zuvor). (3) Die Eingabeauflösung (`loesePraefixPlatzhalterAuf`) war nie an `zielSchritt.status` gekoppelt, nur an `lauf_id !== null` — eine Reparaturfassung mit Cursor auf dem Review-Folgeschritt löst deren `aenderungsuebersicht-@`/`pruefergebnis-@`-Eingaben deshalb ohne weitere Änderung auf, sobald die Artefakte (aus (2)) existieren. QA-Korrekturrunde (28.09.2026): (1) lief serverseitig ursprünglich nur im `hoch`-Pfad (`architektEingabeTreffer`-Zweig) — `workflow-vorlagen/standard.json`/`fast-lane.json` (kein `architekt`-Schritt, derselbe `schreibend`-Werkzeugsatz) bekamen die Allowlist nie genannt, derselbe Auslöser außerhalb von `hoch`. `baueBashAllowlistSatz()` wird jetzt zusätzlich in einem eigenen `else if (schritt.rolle === 'ausfuehrung')`-Zweig angehängt. Gate `scripts/check-fixpaket-f35-reallauf.mjs` (g)–(k).
Status: behoben (fix/f760-verweigert-bau, 28.09.2026).
Feature/Run: F35-Reallauf haushaltsbuch2, Iteration 2, Lauf 08c84cd7, 28.09.2026.

**F-764** · `HARNESS_IMPROVEMENT` · P2 · erledigt (#284, ddabcf7)
Titel: Der Allowlist-Satz in der Ausführungs-Instruktion verhindert Probebefehle nicht; jeder Baulauf endet VERWEIGERT und braucht menschliche Sichtung.
Beschreibung: Seit F-760 (#265) nennt die Ausführungs-Instruktion die erlaubten Bash-Befehle. Im Reallauf probierte die Ausführung trotzdem in jedem Baulauf Befehle außerhalb der Allowlist: verkettete `cd … && echo … && sed -n … && cat …`, `node -v`/`npm -v`, `git status`/`git log`, `find`, `node --test | head` (Läufe `2f6509a1`, `630e4282`). Alle korrekt abgelehnt, kein Bypass-Verdacht — aber alle drei Bauläufe nach #264 endeten VERWEIGERT, jeder brauchte eine menschliche Sichtung (Halt F-760) und eine Reparaturfassung (F-768).
Fundstelle: `src/architekt/index.ts` (`baueBashAllowlistSatz`), `startvorlagen/ai-workforce.json` (`werkzeugsaetze.schreibend`); Beleg haushaltsbuch2-Workflow `router-8b138eac-…` Versionen 22 und 29.
Auswirkung: Mittel — die Ausführung bleibt sicher begrenzt, aber der Normalfall wird zum Ausnahmefall; die Sichtung verliert als Signal an Wert.
Maßnahme: Harmlose Lesebefehle erlauben oder zusammengesetzte Befehle, deren Teile alle erlaubt sind, gesondert behandeln. Erweitert die Sicherheitsfläche der Ausführung → Advisor-Pass vor dem Bau.
Ergänzung (F36 WS-0/WS-1, 28.09.2026): Die CLI lässt reine Lesebefehle wie `pwd` ohne Allowlist-Regel zu (`state/spike-f36-werkzeugsatz.md` P2, `general-purpose`-Subagent: `Bash pwd` erlaubt). Vor dem Fix prüfen, welche der beobachteten Probebefehle wirklich VERWEIGERT auslösen — nur die brauchen eine Regel.
Vermerk (F36 Reallauf, 29.09.2026): Alle vier Ausführungsläufe (`1c4a1163`, `7b6d0f40`, `8cee6c98`, `74290fb5`) endeten VERWEIGERT. Der Grund waren in allen vier nur Probebefehle (`git status`/`git log`, `node scripts/…`, `npm run dev`). Jeder brauchte eine manuelle Reparaturfassung (F-768). Das Muster ist damit über zwei Reallauf-Serien stabil.
Vermerk (Fixpaket PR 1 nach F36, 30.09.2026): `baueBashAllowlistSatz` nennt jetzt die beobachteten Formen und geht ausdrücklich der Projekt-CLAUDE.md vor. Die Vorlage `vorlagen/projekt-skelett/CLAUDE.md` verlangt `cd` am Blockanfang und `git status` am Iterationsende, das ist laut QA-Pass eine wahrscheinliche Hauptursache. Die Regeln: kein `cd`, genau ein Befehl ohne Verkettung (auch keine Zeilenumbrüche), ohne Umleitung und ohne Hintergrund, Prüfskripte nur über `npm run check`, keine Server, kein git, Versionen und Dateien über Read/Glob/Grep. Die Allowlist wurde bewusst nicht erweitert: `git log`/`git diff` erlauben per Präfix `--output`, und `git status` schreibt `index.lock`. `startvorlagen/ai-workforce.json` und `ERLAUBTE_BASH_REGELN` sind unverändert. Läufe ohne Bash-Regel bleiben bitgenau. Gate: `scripts/check-fixpaket-f36-nachlauf.mjs` (a). Neu bewerten, wenn nach dem Fix weiterhin ≥2 von 4 Bauläufen wegen Probebefehlen VERWEIGERT enden.
Status: erledigt (#284, ddabcf7).
Feature/Run: F35-Reallauf haushaltsbuch2, 28.09.2026.
Zugeordnet: Fixpaket Arbeitsfähigkeit (E-M5-18, 01.10.2026).

**F-768** · `PROCESS_IMPROVEMENT` · P2 · behoben (PR folgt)
Titel: Die Fortsetzung nach einer Sichtung erfordert das vollständige Workflow-JSON per Copy-Paste in der Reparaturfassung.
Beschreibung: Im Reallauf wurde der Workflow viermal nach einem Halt über eine Reparaturfassung fortgesetzt (Versionen 12, 19, 23, 30 im Workflow `router-8b138eac-…`) — jedes Mal mit dem vollständigen, von Hand angepassten Workflow-JSON. Fehleranfällig und ohne eigenes Entscheidungsartefakt, das festhält, was gesichtet wurde. Bezug F-653.
Fundstelle: Workflow-Detailansicht (`public/leitstand/views/workflows.js`), Reparaturfassung des Workflows.
Auswirkung: Mittel — jede Sichtung wird zur manuellen JSON-Operation; die Begründung der Fortsetzung bleibt undokumentiert.
Maßnahme: Knopf „Sichtung bestätigt – weiter" mit Pflichtbegründung als Entscheidungsartefakt — Design-Schnitt.
Vermerk (Fixpaket PR 1 nach F36, 30.09.2026): Die Workflow-Bedienung zeigt den Knopf nur beim reinen F-760-Halt: Ausführungsschritt VERWEIGERT ohne Bypass-Verdacht und ohne Zusatzgründe (Scope, Stack, Prüfkette). Sonst bleibt allein die Reparaturfassung. Der Knopf baut die Fassung selbst: Cursor auf den Folgeschritt, der VERWEIGERT-Schritt behält status und `lauf_id`. Er sendet über den bestehenden `POST /api/workflows` mit dem Transportfeld `sichtung_bestaetigt`, das nicht in die Fassung gelangt. Der Server prüft Halt, Bypass-Verdacht = 0 laut Terminalmarke, Begründung und aktiven Lauf; sonst antwortet er mit 409 bzw. 400. Festgehalten wird die Sichtung als `art 'kenntnisnahme'` (ergebnis VERWEIGERT, `entscheidung-<laufId>`, derselbe Helfer wie `POST /api/entscheidungen`), weil `planaenderung` laut Schema nur `FREIGABEPFLICHT_ABGESCHWAECHT` kennt (Entscheidung Stefan, 30.09.2026). Eine eigene Art `sichtung` wäre ein späterer Schemapass, falls die Sichtung mehr als die Begründung festhalten muss. Den Folgeschritt startet der Mensch weiter selbst (Regel 1 unverändert). Nach dem Reviewer-/QA-Pass gilt außerdem: Die Fassung muss bis auf `status`, Cursor, `grund` und `freigabe_erteilt` gleich dem Bestand sein, damit keine weitere Planänderung mitgeht. Der Folgeschritt muss startbereit sein. Eine Entscheidung anderer Art zum Lauf wird nicht überlagert (409). Gate: `scripts/check-fixpaket-f36-nachlauf.mjs` (c)–(f), (d) inklusive realem Start des Folgeschritts. Render-Nachweis: `features/F36/nachweis-fixpaket-nachlauf/` (reiner Halt und Halt mit Zusatzgrund). Der Nachweis ergab eine Grenze: Die Pflichtfeld-Meldung bleibt nach dem Tippen stehen, bis zur nächsten Aktion. Das ist dasselbe Verhalten wie bei den übrigen Bedienblöcken.
Vermerk (Fixpaket PR 2 nach F36, 30.09.2026): Render-Nachweis nachgebessert: `rein/01-halt-knopf.png` war abgeschnitten, weil der Ausschnitt unterhalb des Viewports lag (Clip am Viewport-Rand, Bild nur 204 px hoch). `klickfolge-rein.json` hat jetzt einen Viewport von 3200 px Höhe; neu erzeugt mit `erzeuge-nachweis.mjs`, Knopf „Sichtung bestätigt – weiter“ und Begründungsfeld sind sichtbar.
Status: behoben (PR folgt).
Feature/Run: F35-Reallauf haushaltsbuch2, 28.09.2026.

**F-774** · `HARNESS_IMPROVEMENT` · P1 · erledigt (Skills/MCP; Agents → F-815)
Titel: Die Capability Library hat keinen Weg in die Läufe.
Beschreibung: Werkzeugsatz ohne `Skill`/`Agent` (F-769), MCP-Sperre als Default (E-187, `--strict-mcp-config`), nur Projekteinstellungen (`--setting-sources project`). Katalog (F19), Scout (F27) und Freigabe enden im Register `ressourcen.json`; kein freigegebener Eintrag erreicht je einen Lauf.
Fundstelle: `src/claude-code-gateway/index.ts` `baueAufruf`; `ressourcen.json`; `features/F36/feature.md`.
Auswirkung: Hoch — der Capability-Pfad der M5-Planung ist ohne Wirkung.
Maßnahme: F36 neu geschnitten: „Capability Library wirksam machen“ (E-F36-2/3/4, `docs/projekt/zielfassung.md` §13.6).
Vermerk (F36 Review-Pass, 29.09.2026): Für Skills (Ort B) und lokale MCPs gebaut und im Reallauf belegt: Katalog → Freigabe/Installation → Lauf → Beobachtung. Lauf `8cee6c98` (haushaltsbuch2) hat `frontend-design` aufgerufen, `playwright-mcp` war in drei Läufen verbunden (`features/F36/nachweis-reallauf/` C). Agents erreichen keinen Lauf (F-815).
Status: erledigt für Skills/MCP (F36, #267–#281); Agents offen unter F-815.
Feature/Run: F36-Challenge / F36 WS-0, 28.09.2026.

**F-777** · `PROCESS_IMPROVEMENT` · P3 · **erledigt** (F36 WS-1)
Titel: Context7 war in der F36-Challenge als „lokal" genannt, schickt aber Anfragen an einen fremden Dienst.
Beschreibung: Die Challenge zählte Context7 zu den lokalen MCPs. Der Server fragt die Dokumentation bei einem fremden Dienst ab — nach E-F36-4 ist das keine lokale Wirkung.
Fundstelle: F36-Challenge 28.09.2026; `ressourcen.json` Eintrag `context7-mcp`.
Auswirkung: Niedrig — hätte zu einer Freigabe außerhalb von E-F36-4 führen können.
Maßnahme: `wirkung: extern_lesend` im Katalog; E-F36-4 lässt den Eintrag damit nicht freigeben.
Status: erledigt (F36 WS-1, 28.09.2026).
Feature/Run: F36 WS-1, 28.09.2026.

**F-781** · `BUG` · P3 · **erledigt** (F36 WS-1b)
Titel: Der Scout-Vormerken-Auftrag erzeugt einen `extern`-Eintrag ohne `unterart` (und ohne `wirkung` bei MCPs) — seit F36 WS-1 ungültig.
Beschreibung: `baueVormerkenAuftragstext` weist die Ausführung an, einen Eintrag mit id, typ, capabilities, freigabe und herkunft anzulegen. Seit F36 WS-1 verlangt `validiereRessourcenDaten` für `typ: extern` zusätzlich `unterart` und bei `mcp` `wirkung`; name/beschreibung (R1) nennt der Text schon vorher nicht. Ein so angelegter Eintrag scheitert am Gate `check-f19-ressourcen`. Der Scout-Kandidat trägt heute nur `typ: skill | extern` ohne Unterart.
Fundstelle: `public/leitstand/views/capabilities.js` (`baueVormerkenAuftragstext`); `src/scout/types.ts` (`ScoutKandidatTyp`).
Auswirkung: Niedrig — das Gate fängt den Fehler vor dem Commit, der Vormerken-Weg braucht aber eine Handkorrektur.
Maßnahme: Auftragstext um `name`, `beschreibung`, `unterart` (und bei MCP `wirkung`) ergänzen; ggf. `unterart` im Scout-Ergebnis. Außerhalb von WS-1 (kein Laufzeit-/UI-Code außer der Anzeige).
Status: erledigt (F36 WS-1b, 28.09.2026) — `baueVormerkenAuftragstext` liegt jetzt als reines Modul in `public/leitstand/vormerken-auftrag.js` und nennt für `typ: extern` name, beschreibung, unterart und bei `mcp` wirkung (Test `public/leitstand/vormerken-auftrag.test.mjs`). `unterart` im Scout-Ergebnis bleibt ungeändert — die ausführende Rolle bestimmt sie aus der Quelle.
Feature/Run: F36 WS-1, 28.09.2026.

**F-782** · `TECH_DEBT` · P3 · **erledigt** (F36 WS-1b)
Titel: `check-f24-capabilities` zählte fest 26 Katalogeinträge.
Beschreibung: Prüfung (1) verglich die Zahl der Library-Einträge mit der Konstanten 26. Jeder neue Katalogeintrag machte das Gate rot, ohne dass die Projektion falsch war — mit der Übernahme der Recherche (F36 WS-1b, 39 Einträge) real aufgetreten.
Fundstelle: `scripts/check-f24-capabilities.mjs` Prüfung (1).
Auswirkung: Niedrig — Fehlalarm bei jeder Katalogänderung.
Maßnahme: Soll aus `ressourcen.json` ableiten (Anzahl und ids), fehlende ids benennen.
Status: erledigt (F36 WS-1b, 28.09.2026).
Feature/Run: F36 WS-1b, 28.09.2026.

**F-786** · `HARNESS_IMPROVEMENT` · P2 · erledigt für mcp (F36 WS-5a) und skill (F36 WS-5b); agent zurückgestellt (F-815)
Titel: WS-5 muss je unterart fail-closed prüfen, bevor ein Katalogeintrag als installiert gilt.
Beschreibung: WS-5 muss je unterart fail-closed prüfen (skill: `SKILL.md` mit Frontmatter; agent: `.md` mit Frontmatter; mcp: Serverstart mit freigegebenen Einzelnamen, playwright nur mit `--allowed-origins` localhost). Heute heißt `verfuegbar` für extern skill/agent nur „freigegeben und `installation.pfad` existiert“, für mcp „Serverstart nicht geprüft“; bei `open-code-review` ist die unterart zudem nur vermutet.
Fundstelle: `src/ressourcen/index.ts` (`loeseRessourcenAuf`); `features/F36/feature.md` (WS-5, Bekannte Grenzen); `features/F36/katalog-uebernahme.md` (playwright-mcp, open-code-review).
Auswirkung: Mittel — ohne die Prüfung kann ein falsch eingeordneter oder offen startender Eintrag als einsatzbereit gelten.
Maßnahme: In WS-5 je unterart ein Rot-Fall; playwright-mcp mit Rot-Fall „fremde Origin wird verweigert“, sonst `wirkung: extern_schreibend`.
Status: Teil mcp erledigt (F36 WS-5a): `installiereRessource` (`src/ressourcen/installation.ts`) gibt einen MCP erst frei, wenn Lockfile-Version und -integrity der Anzeige entsprechen, `bin` existiert und der Serverstart per `initialize` + `tools/list` alle freigegebenen Einzelnamen liefert; Rot-Fälle im Gate `scripts/check-f36-ws5a-installation.mjs` (c)–(e), echter Nachweis `features/F36/nachweis-ws5a-installation/`. Offen: Teil skill/agent (WS-5b) und der Rot-Fall „fremde Origin wird verweigert“ mit der installierten Fassung (WS-5b bzw. Reallauf).
Vermerk (F36 WS-5b, 29.09.2026): Teil skill erledigt. `installiereRessource` gibt einen externen Skill erst frei, wenn diese Prüfungen bestanden sind: angezeigte Commit-SHA = Ref beim Installieren; flacher Fetch genau dieser SHA; kein Symlink/Submodul im Quellbaum; `SKILL.md` mit Frontmatter name + description; name nach `[a-z0-9-]`; keine Kollision mit eingebauten oder anderen Ort-B-Skills. Danach wird `inhalt_hash` festgehalten. „Verfügbar“ heißt für Skills seither: SKILL.md + passender inhalt_hash (`loeseRessourcenAuf`); der Start rechnet ihn neu. Belegt: Gate `scripts/check-f36-ws5b-skill.mjs` (a), (f)–(i), (k); echter Nachweis `features/F36/nachweis-ws5b/` (frontend-design). Teil agent zurückgestellt (F-815). Der Rot-Fall „fremde Origin“ bleibt beim Reallauf.
Vermerk (F36 Reallauf, 29.09.2026): Rot-Fall „fremde Origin“ mit der real installierten Fassung belegt (`@playwright/mcp` 0.0.83, CLI 2.1.284; `features/F36/nachweis-reallauf/`). (A) Den Server exakt mit `installation.mcp_server` aus dem Haupt-Checkout per MCP-stdio gestartet: `browser_navigate` auf `http://127.0.0.1:3000` und `http://localhost:3000` erlaubt (haushaltsbuch2 geladen). Auf `https://example.com` kommt `isError: true`, „net::ERR_BLOCKED_BY_CLIENT“. (B) Echter CLI-Lauf über `loeseAusfuehrungsEingabenAuf` → `baueMcpAufruf` → `baueAufruf` → `starteProzess`: `init.tools` zeigt alle 25 Playwright-Werkzeuge. `browser_run_code_unsafe` und `browser_evaluate` wurden aufgerufen, beide mit tool_result „Claude requested permissions to use … but you haven't granted it yet.“ (`is_error: true`, auch in `permission_denials`). Freigegebene Werkzeuge liefen normal. Kein nicht freigegebenes Werkzeug war aufrufbar. Teil mcp damit vollständig; offen bleibt nur Teil agent (F-815).
Feature/Run: F36 WS-1b, 28.09.2026.

**F-788** · `HARNESS_IMPROVEMENT` · P2 · erledigt (F36 WS-3)
Titel: Empfehlungsrauschen — bei neues-feature mit UI-Pfaden treffen etwa 10 Katalogeinträge zu.
Beschreibung: Nach der Übernahme der Recherche (F36 WS-1b) passt `anwendbar_wenn` bei einem neues-feature-Auftrag mit UI-Pfaden auf rund 10 Einträge; eine ungefilterte Liste am ZWINGEND-Start wäre Rauschen.
Fundstelle: `ressourcen.json` (`anwendbar_wenn`); `features/F36/feature.md` (WS-3).
Auswirkung: Mittel — zu lange Empfehlungslisten werden überlesen.
Maßnahme: WS-3 mit Rangfolge und Obergrenze (z. B. höchstens 3 je Liste; installiert vor nicht installiert; spezifischere Bedingung zuerst). `okf-agent-memory` auf Harness-Kandidat prüfen.
Status: erledigt (F36 WS-3): `baueEmpfehlung` (`src/ressourcen/index.ts`) trennt „Wird genutzt“ und „Passt, nicht im Lauf“, ordnet je Liste beide `anwendbar_wenn`-Schlüssel vor einem, dann id alphabetisch, zeigt höchstens 3 und den Rest als Anzahl; `okf-agent-memory` trägt kein `anwendbar_wenn` mehr (Harness-Kandidat).
Feature/Run: F36 WS-1b, 28.09.2026.

**F-794** · `PROCESS_IMPROVEMENT` · P2 · erledigt (Gedächtnislücken-PR)
Titel: `docs/STATUS.md` veraltet still — das Lagebild meldete „F36 nicht begonnen“.
Beschreibung: Nach fünf gemergten F36-Workstreams und Spike S7 stand in `docs/STATUS.md` weiter „F36 noch nicht begonnen“; das daraus erzeugte Lagebild gab den falschen Stand weiter. Beim Abgleich fielen zusätzlich F19 (STATUS `FEATURE_GATE`, Akte `ABGESCHLOSSEN`) und F0 (in STATUS.md nur als „Feature 0“, ohne ID) auf. Kein Gate verglich STATUS.md mit den Akten.
Fundstelle: `docs/STATUS.md`; `features/*/feature.md`; `docs/projekt/kontext/lagebild.md`.
Auswirkung: Mittel — Jarvis und neue Sitzungen arbeiten mit falschem Projektstand.
Maßnahme: Gate `scripts/check-status-akten.mjs` in `npm run check`, maßgeblich allein die Standardform „`features/<ID>/feature.md`, Status `<WERT>`“ (Freitext mit ID zählt nicht): (a) Für jede Akte mit Status `IN_ARBEIT`, `FEATURE_GATE` oder `ABGESCHLOSSEN` enthält STATUS.md die Standardform (fängt F36 und F0); (b) jede Standardform-Angabe nennt den Aktenstatus und zeigt auf eine existierende Akte (fängt F19). STATUS.md für 15 Akten ohne Standardform auf die Form nachgezogen. Kalibrierung in `state/gates.md`. Bekannte Grenze: Die Akten markieren gemergte Workstreams nicht maschinenlesbar, die Workstream-Prüfung ist deshalb nicht gebaut. `features/F36/feature.md` (Abschnitt vor „Akzeptanzkriterien“) im selben PR auf den Stand gebracht (gemergt WS-0, WS-1, WS-4, WS-1b, WS-2, S7; offen WS-3, WS-5, Reallauf).
Status: erledigt mit dem Gedächtnislücken-PR.
Feature/Run: Gedächtnislücken, 29.09.2026.

**F-795** · `PROCESS_IMPROVEMENT` · P2 · erledigt (Gedächtnislücken-PR)
Titel: Übergaben zwischen Sitzungen liegen nur im Claude-Projekt (`claude/*`), nicht im Repo.
Beschreibung: Der aktuelle Arbeitsstand und die nächsten Schritte standen nur in Übergabedateien des Claude-Projekts; eine Claude-Code-Sitzung im Repo sah sie nicht.
Fundstelle: `state/memory-map.md`; `state/uebergabe-aktuell.md`.
Auswirkung: Mittel — neue Sitzungen starten ohne Übergabe oder mit veralteter.
Maßnahme: `state/uebergabe-aktuell.md`, am Ende jeder Challenger-Runde über den letzten Claude-Code-Prompt vollständig überschrieben (Historie im Git-Log); Zeile in `state/memory-map.md`.
Status: erledigt mit dem Gedächtnislücken-PR.
Feature/Run: Gedächtnislücken, 29.09.2026.

**F-800** · `PROCESS_IMPROVEMENT` · P2 · erledigt (Scout F-800)
Titel: Die Recherche enthält nur vereinzelt und ungeprüft Bausteine für Datenanalyse, die der Opportunity Scanner (F30) braucht.
Beschreibung: In `docs/harness/kandidaten-2026-09-15.md` kommen Bausteine für Datenerhebung und -auswertung (Trends, strukturierte Extraktion, Statistik) nur vereinzelt und mit dem Urteil „Optional“/„Offen“ vor. Der Datennachtrag vom 29.09.2026 hat drei davon (ScrapeGraph AI, Google Trends MCP — inzwischen zurückgestellt —, Scientific-agent-skills) plus MixPost (Marketing) in die Stack-Liste übernommen; eine gezielte Suche fehlt.
Fundstelle: `docs/harness/kandidaten-2026-09-15.md`; `docs/harness/stack-kandidaten.md` (Datennachtrag 29.09.2026).
Auswirkung: Mittel — F30 startet ohne geprüfte Bausteine für seinen Kern.
Maßnahme: Scout-Auftrag „Datenanalyse/Scraping“ vor F30; Ergebnisse in `docs/harness/stack-kandidaten.md`.
Status: erledigt (Scout F-800).
Vermerk (30.09.2026, Branch `docs/f800-scout`): Scout als Claude-Code-Recherche (ohne Installation, ohne Ausführung; siehe F-859). Acht neue Zeilen in der ersten Tabelle von `docs/harness/stack-kandidaten.md` (Einsatzgebiet „Datenerhebung K1–K5 (Opportunity Scanner)“, Quelle-Zeile „Scout F-800“): Trafilatura, Mozilla Readability (K1), Playwright als Bibliothek (K2), Cheerio (K3), feed-extractor, robots-parser (K4), DuckDB, Polars (K5). ScrapeGraph AI und Scientific-agent-skills nachgeprüft (Lizenzvolltext MIT; ScrapeGraph-Telemetrie standardmäßig an). Belege 1–7 je Kandidat und die Liste „Geprüft und verworfen“ (u. a. Crawl4AI wegen Zusatzklausel, Firecrawl AGPL/Credits, Stealth-Werkzeuge) im Abschnitt „Scout F-800 (30.09.2026)“. Offen dort: HTTP-Client mit Rate-Limit (K4) nicht geprüft. Den Opportunity Scanner selbst plant weiterhin die Workforce (E-F30-4).
Feature/Run: F36 Datennachtrag, 29.09.2026.

**F-804** · `PROCESS_IMPROVEMENT` · P3 · erledigt (F36 WS-3)
Titel: Auftrag widersprach E-F36-5.
Beschreibung: Der Datennachtrag-Auftrag legte Google Trends MCP und Scientific-agent-skills in die Stack-Liste (`docs/harness/stack-kandidaten.md`), obwohl sie nach E-F36-5 als MCP-Server bzw. Skill-Sammlung Katalog-Einträge (Gruppe 1, `ressourcen.json`) wären. Der Reviewer-Pass hat den Widerspruch gefunden; er ist in der Stack-Liste als „Vorgabe des Auftrags“ vermerkt.
Fundstelle: `docs/harness/stack-kandidaten.md` (Absatz Datennachtrag); `features/F36/katalog-uebernahme.md` (Datennachtrag); `features/F36/feature.md` (E-F36-5).
Auswirkung: Niedrig — zwei Einträge liegen außerhalb der Gruppenregel und erreichen die Empfehlung (WS-3) nicht über den Katalog.
Maßnahme: In WS-3 zuordnen oder bewusst begründen; der Challenger prüft Aufträge gegen bestehende E-Entscheidungen.
Status: erledigt (F36 WS-3): Google Trends MCP und Scientific-agent-skills bleiben bewusst in der Stack-Liste: Bausteine des Projektprodukts (F30), keine Fähigkeit eines Laufs; Switchyard/Google-Trends-Unterschied in stack-kandidaten.md begründet.
Feature/Run: F36 Datennachtrag, 29.09.2026.

**F-808** · `HARNESS_IMPROVEMENT` · P2 · erledigt (F36 WS-5a)
Titel: Der Start vergleicht nur die Menge der Empfehlungs-ids, nicht die installation dahinter.
Beschreibung: Zwischen Anzeige und Freigabe kann sich die `installation` eines angezeigten Eintrags ändern (`command`, `args`, `werkzeuge`), ohne dass der Start abweicht. Heute ohne Wirkung, weil kein Katalog-MCP freigegeben ist.
Fundstelle: `scripts/leitstand-server.mjs` (Vergleich `empfehlungIds`, `bereiteEmpfehlungFuerStartVor`); `features/F36/feature.md` (Bekannte Grenzen).
Auswirkung: Mittel ab WS-5.
Maßnahme: In WS-5 zusätzlich einen Hash über `installation` (bzw. den ganzen Eintrag) je id mitschicken und vergleichen; Entscheidung in der WS-5-Challenge.
Status: erledigt (F36 WS-5a): `empfehlungIds` sind `<id>@<sha256 über die kanonische JSON der installation>` (`empfehlungsKennung`, `src/ressourcen/index.ts`); `bereiteEmpfehlungFuerStartVor` vergleicht id und Hash, Abweichung → Freigabe 409 bzw. `POST /api/laeufe` 400 wie bisher. Beleg: `scripts/check-f36-ws5a-installation.mjs` (i).
Feature/Run: F36 WS-3, 29.09.2026.

**F-809** · `TECH_DEBT` · P3 · erledigt (F36 WS-5a)
Titel: Empfehlung wurde bei jedem Poll neu gerechnet; eine angefangene Begründung ging bei geänderter Empfehlung verloren.
Beschreibung: Am ZWINGEND-Start rechnete `GET /api/workflows/<id>` die Katalog-Empfehlung bei jedem 2-s-Poll neu (`git ls-files` mit 5 s Zeitgrenze, Katalog lesen und auflösen, synchron). Schwankte das Ergebnis (z. B. `git ls-files` einmal nicht lesbar), renderte die Workflow-Ansicht den Freigabe-Block neu und eine angefangene Begründung ging verloren (Bekannte Grenze aus WS-3).
Fundstelle: `scripts/leitstand-server.mjs` (`ermittleAusfuehrungsEmpfehlung`, GET `/api/workflows/<id>`); `features/F36/feature.md` (Bekannte Grenzen).
Auswirkung: Niedrig — Last in großen Projekten, verlorene Eingabe.
Maßnahme: Anzeige zwischenspeichern, Schlüssel auftragId, mtime/Größe von `ressourcen.json`, HEAD des Projekts; der Start rechnet frisch und erneuert den Zwischenspeicher.
Status: erledigt (F36 WS-5a): `ermittleAusfuehrungsEmpfehlungGecached` (Fehlschläge und Ergebnisse mit nicht lesbaren Pfaden werden nicht gemerkt); ändert sich die Empfehlung doch (z. B. nach einer Installation), behält die Workflow-Ansicht angefangene Begründungen desselben Workflows. Beleg `scripts/check-f36-ws5a-installation.mjs` (Cache). Bekannte Grenze: Änderungen, die weder Katalog noch HEAD berühren, erscheinen erst nach dem nächsten Start oder Commit.
Feature/Run: F36 WS-5a, 29.09.2026.

**F-810** · `PROCESS_IMPROVEMENT` · P2 · erledigt (E-F36-9)
Titel: E-F36-6 nannte nur herkunft.url.
Beschreibung: E-F36-6 verlangte die Installation „nur von der Katalog-Adresse (`herkunft.url`)“. Für Registry-Pakete (npm) ist die Repository-URL aber keine Installationsquelle; offen war, woher die Workforce ein MCP-Paket tatsächlich bezieht.
Fundstelle: `docs/projekt/zielfassung.md` §13.6 (E-F36-6); `features/F36/feature.md` (Entscheidungen, WS-5).
Auswirkung: Mittel — ohne ausdrückliche Paketadresse hätte WS-5a die Quelle raten müssen (z. B. aus dem Repo-Namen).
Maßnahme: E-F36-9 = A (Stefan, 29.09.2026): Registry-Pakete nur aus `herkunft.paket` (`npm:<name>`), exakte Version; `herkunft.url` bleibt Informationsadresse; `herkunft.paket` wird vor dem Klick angezeigt.
Status: erledigt durch E-F36-9 (Zielfassung v1.37, WS-5a).
Feature/Run: F36 WS-5a, 29.09.2026.

**F-811** · `HARNESS_IMPROVEMENT` · P2 · erledigt (F36 WS-5a)
Titel: Projekt-URL mit Port fehlte als Datum für E-F36-7.
Beschreibung: E-F36-7 verlangt `--allowed-origins` auf die Projekt-URL MIT Port; das Projektregister kannte aber keine Projekt-URL. Ohne sie hätte der Start den Port raten oder den MCP ohne Origin-Sperre starten müssen.
Fundstelle: `src/projekte/index.ts`, `schemas/projekte.schema.json`; `scripts/leitstand-server.mjs` (`loeseProjektPfade`).
Auswirkung: Mittel — ohne Datum ist E-F36-7 nicht umsetzbar.
Maßnahme: Optionales Feld `vorschau_url` je Projekt (nur `http://localhost:<port>`/`http://127.0.0.1:<port>`); `{projekt_origins}` daraus; fehlt es, kommt ein Eintrag mit `{projekt_origins}` nie in den Lauf (fail-closed).
Status: erledigt durch `vorschau_url` (F36 WS-5a); Beleg `scripts/check-f36-ws5a-installation.mjs` (g)/(h), `src/projekte/projekte.test.ts`.
Feature/Run: F36 WS-5a, 29.09.2026.

**F-813** · `HARNESS_IMPROVEMENT` · P2 · erledigt (fix/f813-csrf-post-routen)
Titel: Zustandsändernde POST-Routen des Leitstands prüfen die Herkunft der Anfrage nicht.
Beschreibung: Der Leitstand liest POST-Bodies ohne Prüfung von `Origin`, `Sec-Fetch-Site` oder Content-Type. Eine fremde Webseite im selben Browser kann per einfacher Anfrage (text/plain, `no-cors`) z. B. `POST /api/laeufe` oder eine Freigabe an `127.0.0.1` schicken. Gefunden im Reviewer-Pass F36 WS-5a an den Installationsrouten; diese beiden lehnen seit WS-5a fremde Browser-Anfragen ab (`istFremdeBrowserAnfrage`, 403), alle übrigen nicht.
Fundstelle: `scripts/leitstand-server.mjs` (`leseBody`, POST-Routen; `istFremdeBrowserAnfrage`).
Auswirkung: Mittel — Einzelnutzer, lokal gebunden, aber eine besuchte Seite könnte Läufe starten oder Entscheidungen festhalten.
Maßnahme: `istFremdeBrowserAnfrage` zentral vor jede zustandsändernde Route setzen (eigener kleiner Auftrag mit Gate über alle POST-Routen). Vor dem F36-Reallauf beheben, weil auch POST …/freigabe einen schreibenden Lauf startet (Challenger 29.09.2026).
Status: erledigt (Commit auf diesem Branch, fix/f813-csrf-post-routen): `istFremdeBrowserAnfrage` läuft zentral einmal am Anfang von `requestHandler` für jede Methode außer GET/HEAD (403 `{ grund }`), damit auch für `/api/projekte/<id>/…`; der Einzelaufruf an den Installationsrouten ist entfallen. Beleg `scripts/check-f813-csrf.mjs` (echter HTTP-Testserver; Rotfall vor dem Fix real: 91 Befunde; leitet die schreibenden Routen aus dem Quelltext ab und prüft den zentralen Haken strukturell). Semantik unverändert: ohne Origin/Sec-Fetch-Site weiter zulässig.
Feature/Run: F36 WS-5a, 29.09.2026; behoben 29.09.2026.

**F-814** · `HARNESS_IMPROVEMENT` · P2 · erledigt (fix/f814-host-allowlist)
Titel: Leitstand prüft den Host-Header nicht gegen eine feste Liste (DNS-Rebinding).
Beschreibung: `istFremdeBrowserAnfrage` vergleicht `Origin` nur mit dem `Host`-Header. Eine Seite, deren Domain per DNS-Rebinding auf 127.0.0.1 zeigt, gilt als Same-Origin und erreicht alle schreibenden Routen (Läufe, Freigaben, Installationen).
Fundstelle: `scripts/leitstand-server.mjs` (`istFremdeBrowserAnfrage`, zentraler Haken F-813).
Auswirkung: Mittel — setzt einen aktiven Angreifer voraus, trifft aber auch die Installationsrouten.
Maßnahme: `Host`-Header zentral gegen eine Allowlist (`127.0.0.1:<port>`, `localhost:<port>`, `[::1]:<port>`) prüfen, für alle Methoden; Gate mit Rotfall fremder Host. Eigener kleiner Auftrag, spätestens vor Freigabe von Skill-/Agent-Installation (F36 WS-5b).
Status: erledigt (dieser Branch, fix/f814-host-allowlist): `istUnzulaessigerHost` läuft zentral einmal am Anfang von `requestHandler`, für jede Methode (auch GET/HEAD) und vor dem CSRF-Haken. Zulässig nur `127.0.0.1:<port>`, `localhost:<port>`, `[::1]:<port>` (Hostname ohne Groß-/Kleinschreibung; Port = `req.socket.localPort`, also der tatsächlich gebundene Port). Sonst 403 `{ grund }`, ohne Body zu lesen. Beleg `scripts/check-f814-host.mjs` (echter HTTP-Testserver, roher TCP-Client; Rotfall vor dem Fix real: 53 Befunde, u. a. gestartete Läufe unter Host `evil.example:<port>`; Strukturprüfung: genau ein Host-Haken vor dem CSRF-Haken).
Feature/Run: F-813-Fix, Reviewer-/QA-Hinweis, 29.09.2026; behoben 29.09.2026.

**F-815** · `TECH_DEBT` · P2 · erledigt
Titel: Agents (extern + Projekt) und Projekt-Skills sind in der Ausführung weiter nicht nutzbar — WS-5b schaltet nur Ort-B-Skills.
Beschreibung: F36 WS-5b bringt `Skill` in den Werkzeugsatz der Ausführung, aber nur, wenn ein Ort-B-Skill übergeben wird. Unter V4a lässt es nur installierte externe Skills aufrufbar. `Agent` bleibt aus `--tools`. Extern-Agents sind weder installierbar (400 „erst später“) noch im Lauf. Projekt-Skills (`<projekt>/.claude/skills`) und -Agents bleiben gesperrt, auch wenn sie im Katalog `FREIGEGEBEN` sind. E-F36-3 (Agents als Subagent-Empfehlung) ist damit nicht umgesetzt.
Fundstelle: `src/ressourcen/ort-b-start.ts` (`baueOrtBSkillStart`); `src/ressourcen/index.ts` (`pruefeInstallierbarkeit`, `baueEmpfehlung`); `features/F36/feature.md` (WS-5b, Zurückgestellt).
Auswirkung: Mittel — die Prüfrollen des Projekt-Harness (qa, code-reviewer, architecture-advisor) und die Projekt-Skills wirken in der Ausführung nicht (vgl. F-769).
Maßnahme: Zurückgestellt bis zu realem Bedarf. Dann gehören dazu: der V4a-Agent-Teil mit Sperrliste `Agent(…)` je CLI-Version (eingebaute Agents driften, F-791), der Satz „Subagenten nur im Vordergrund mit run_in_background: false“ in jedem Startweg (WS-0 P2), das Init-Gate auch für `init.agents`, eine Reallauf-Zählung gesperrter Agent-Aufrufe am tool_result-Text und die Identitätsprüfung nach F-816.
Status: erledigt (F45 F-1, 12.10.2026): Projekt-Agents und -Skills laufen in der Ausführung, wenn Stefan sie je Projekt einschaltet (Opt-in, E-F45-6, `~/.ai-workforce/faehigkeiten.lokal.json`) und ihr Inhalt freigegeben ist (F-816). Agent kommt dann in `--tools`; weil `--allowedTools Agent(<name>)` nicht begrenzt (Spike `state/spike-f45-f1-agents.md` S1, CLI 2.1.296), sperrt `--disallowedTools Agent(<n>)` jeden eingebauten (Referenzliste `src/faehigkeiten/eingebaut-referenz.json`) und jeden nicht aktiven Projekt-Agent; das Init-Gate bricht bei einem unbekannten Namen in `init.agents` ab. Satz „nur im Vordergrund (run_in_background: false)“ im Auftragstext; Zählung je Eintrag (`faehigkeiten_im_lauf`: aufrufe/fehlgeschlagen; fremde_aufrufe für gesperrte Agents). Extern-Agents bleiben nicht installierbar (F-1051). Belege: `src/faehigkeiten/`, `scripts/check-f45-f1-faehigkeiten.mjs`, Reallauf `features/F45/nachweise/f1/`.
Feature/Run: F36 WS-5b, Challenger-Zuschnitt 29.09.2026.
Zugeordnet: Fixpaket Arbeitsfähigkeit (E-M5-18, 01.10.2026).

**F-816** · `HARNESS_IMPROVEMENT` · P2 · erledigt
Titel: Die Freigabe von Projekt-Skills/-Agents gilt nach Namen bzw. Workforce-Pfad, der Lauf lädt aber die gleichnamige Datei des Zielprojekts.
Beschreibung: Katalogeinträge vom Typ `skill`/`agent` verweisen auf `.claude/skills/<name>` bzw. `.claude/agents/<name>.md` der Workforce-Installationswurzel. Ein Ausführungslauf mit `--setting-sources project` lädt dagegen die Dateien des Zielprojekts. Ein Projekt kann unter demselben Namen einen anderen Inhalt tragen; `skillOverrides`/`Skill(…)`/`Agent(…)` greifen nach Namen, nicht nach Inhalt. Würde eine Katalogfreigabe eines Projekt-Skills später aus der Sperrliste herausnehmen (S7-Präzisierung „freigegebene Katalogeinträge fallen aus der Sperrliste“), wäre im Lauf ungeprüfter Inhalt aufrufbar.
Fundstelle: `src/ressourcen/index.ts` (`loeseFrontmatterRessourceAuf`); `src/ressourcen/ort-b-start.ts` (Sperrliste nach Namen); `features/F36/feature.md` (AK4, Präzisierung S7).
Auswirkung: Mittel — heute ohne Wirkung, weil WS-5b jeden Projekt-Skill sperrt; relevant ab der ersten Freischaltung von Projekt-Skills/-Agents (F-815).
Maßnahme: Vor jeder Freischaltung die Identität klären, z. B. über den Hash der Zieldatei im Projekt = freigegebener Hash, beim Start neu geprüft (Muster `inhalt_hash` der Ort-B-Skills); sonst gesperrt lassen.
Status: erledigt (F45 F-1, 12.10.2026): Identität nach Inhalt — Agent = sha256 der Datei `.claude/agents/<name>.md`, Skill = inhalt_hash des Ordners (Ort-B-Form), berechnet im Arbeitsordner des Laufs. Freigegeben, wenn der Hash gleich der Datei des gleichnamigen FREIGEGEBEN-Katalogeintrags der Workforce (exakter `herkunft.pfad`) oder gleich der Projekt-Freigabe nach Inhalt (POST …/faehigkeiten/freigabe mit angezeigtem Hash) ist; sonst gesperrt „Inhalt weicht von der Freigabe ab“. Zusätzlich gesperrt: Frontmatter außerhalb der Positivliste (z. B. permissionMode, hooks, mcpServers), Name ≠ Datei/Ordner, Unterordner, Name eines eingebauten Eintrags; mehrdeutiger aktiver Name oder Verknüpfung → Lauf startet nicht. Der Controller vergleicht die Hashes unmittelbar vor dem Spawn erneut mit der Momentaufnahme von `.claude/` (Abweichung → nicht gestartet).
Feature/Run: F36 WS-5b, Challenger-Zuschnitt 29.09.2026.
Zugeordnet: Fixpaket Arbeitsfähigkeit (E-M5-18, 01.10.2026).

**F-818** · `TECH_DEBT` · P2 · erledigt
Titel: Vorstart-Scan blockiert Ort-B-Skill-Läufe auf ai-workforce selbst.
Beschreibung: `vorlagen/projekt-skelett/.claude/skills|agents` ist ein verschachteltes `.claude`. `scanneVerschachtelteClaudeOrdner` bricht deshalb jeden Ort-B-Lauf mit Projektwurzel ai-workforce ab (fail-closed, korrekt).
Fundstelle: `src/ressourcen/ort-b-start.ts` (`scanneVerschachtelteClaudeOrdner`); `vorlagen/projekt-skelett/.claude`.
Auswirkung: Mittel — die Workforce kann für den Selbstbau (F30-Dogfooding) keine Ort-B-Skills nutzen.
Maßnahme: Vor F30 entscheiden, z. B. das Skelett-`.claude` unter anderem Namen ablegen und beim Anlegen umbenennen, oder eine feste, im Repo versionierte Ausnahmeliste mit Begründung.
Status: erledigt (F45 B1b-1, 11.10.2026): Ausnahme genau `vorlagen/projekt-skelett/.claude`, nur wenn der Projektordner (nicht der Worktree) die Installation ist (realpath, unter Windows ohne Groß-/Kleinschreibung); die Skill- und Command-Namen des Skeletts werden dann wie Projekt-Skills gesperrt; Verknüpfungen bleiben Treffer; ein Fremdprojekt mit derselben Struktur bleibt blockiert. Tests `src/ressourcen/ort-b-start.test.ts`.
Feature/Run: F36 WS-5b Challenger-Verifikation 29.09.2026.
Zugeordnet: Fixpaket Arbeitsfähigkeit (E-M5-18, 01.10.2026).

**F-820** · `PROCESS_IMPROVEMENT` · P2 · erledigt
Titel: qa-Schritt im Workflow fehlt.
Beschreibung: Die Rolle qa hat kein Ausgabeschema, der Schritt steht im Backlog (F35). Randfälle prüft heute nur das Review.
Fundstelle: `src/rollen/index.ts` (Rolle qa); `workflow-vorlagen/*.json`; F35-Backlog.
Auswirkung: Mittel — Randfälle aus Nutzersicht werden im Workflow nicht eigens geprüft.
Maßnahme: qa-Ausgabeschema (Randfall-Urteil mit Beleg) und ein Schritt vor der Abnahme. Reihenfolge: nach dem Design-Bau, vor F30 (Entscheidung Stefan 29.09.2026).
Status: teilweise (F45 B2b-2b-1, 15.10.2026, `features/F45/plan-b2b2b.md`; B2b-2b geteilt nach dem Advisor-Pass, Entscheidung Stefan: Advisor-Schnitt). Kern erledigt: Schema `schemas/ergebnis-qa.schema.json` (Urteil wie Review, Befunde in der Befundform des Reviews, Testfälle), Rolle qa mit Schema, `src/qa` (Rolleninstruktion, `validiereErgebnisQa`); Spike mit echtem CLI-Lauf (2.1.300, Produkt-Prompt mit drei AK, vier Testfälle; `features/F45/nachweise/b2b2b/spike-qa-schema.md`) ⇒ `ergebnis-qa` in der Regel-4b-Allowlist; Regel 1q und Aufschub des Review-Halts (nur wenn der qa wirklich startet); Review und qa zusammen höchstens eine Korrekturrunde (Automatik im qa-Nachlauf, nur bei Klärungshalt), Neubau mit den Befunden beider je Herkunft, qa der neuen Runde mit seinen Vorbefunden, Wiederholungs-Halt über beide, „Prüfer wiederholen“ für qa, `bezug.qa_lauf_id` (optional). Gate `scripts/check-f45-b2b2-pruefer.mjs` (s1)(q1)–(q11) an Fixture-Abläufen. Offen bis B2b-2b-2: qa-Schritt in den Vorlagen standard/hoch, Abnahme-Anzeige (Karte, Hinweis bei BEREIT mit KRITISCH/HOCH), Render-Nachweis — F-1117. Nachtrag F45 B2b-2b-2 (15.10.2026, `features/F45/plan-b2b2b.md` Plan B2b-2b-2 v1.1): erledigt — qa-Schritt in `workflow-vorlagen/standard.json` (`schritt-3-qa`) und `hoch.json` (`schritt-5-qa`) nach dem Review, claude-code, lesend, AUTOMATISCH, `ergebnis-qa`, Eingaben Auftrag, Änderungsübersicht, Prüfergebnis, Review-Ergebnis; fast-lane ohne qa; Abnahme-Karte „Prüfung aus Nutzersicht“ und Halt-Anzeige; Gate `check-f45-b2b2-pruefer` (v1)–(v7), Render-Nachweis `features/F45/nachweise/b2b2b2/`. Rest: F-1118, F-1119.
Feature/Run: Chat 29.09.2026.
Zugeordnet: Fixpaket Arbeitsfähigkeit (E-M5-18, 01.10.2026).

**F-823** · `TECH_DEBT` · P2 · behoben (PR folgt)
Titel: Ungültige absolute Anfrage-URI beendet den Leitstand-Prozess.
Beschreibung: `erzeugeMultiProjektDispatcher` ruft `new URL(req.url, 'http://localhost')` synchron ohne try auf. Eine rohe Anfrage `GET http://[/ HTTP/1.1` lässt Node durch; der Konstruktor wirft „Invalid URL“ im Request-Listener, unbehandelt → Prozessende. Real nachgemessen 29.09.2026 (roher TCP-Aufruf gegen den Dispatcher: uncaughtException „Invalid URL“). Vor F-814 schon vorhanden. Per DNS-Rebinding nicht erreichbar (Browser senden origin-form), wohl aber für jeden lokalen Prozess.
Fundstelle: `scripts/leitstand-server.mjs` (`erzeugeMultiProjektDispatcher`, erste Zeile).
Auswirkung: Mittel — ein lokaler Prozess kann den Leitstand samt laufender Läufe beenden.
Maßnahme: URL-Aufbau im Dispatcher in try/catch, bei Fehler 400 `{ grund }`; Gate mit rohem TCP-Rotfall (Muster `scripts/check-f814-host.mjs`, `sendeRoh`). Eigener kleiner Auftrag.
Vermerk (Fixpaket PR 2 nach F36, 30.09.2026): Neuer Helfer `leseAnfrageUrl` (try/catch um `new URL`). Der Dispatcher `erzeugeMultiProjektDispatcher` antwortet bei einer ungültigen Anfrage-URI mit 400 `{ grund: 'Ungültige Anfrage-URI' }`, der Prozess läuft weiter. Die zweite synchrone Stelle im Request-Pfad (`requestHandler`, bisher 500 über den catch der Routenkette) antwortet ebenso mit 400. Gate: `scripts/check-f814-host.mjs` (4), roher TCP-Rotfall `GET http://[/ HTTP/1.1` über den Dispatcher und direkt gegen `requestHandler`, danach `GET /api/laeufe` weiter 200. Kalibriert: ohne try endet das Gate-Skript selbst mit uncaughtException „Invalid URL“. Nach dem Reviewer-/QA-Pass: Der Dispatcher antwortet mit seinem 400 vor dem Host-Haken, wie beim 404 aus F-822 (fester Text, kein Zustand); im Gate-Kopf unter „Bewusst nicht abgedeckt“ genannt. Verwandte Klasse `decodeURIComponent` → 500 als F-842 erfasst.
Status: behoben (PR folgt).
Feature/Run: F-814-Fix, Reviewer-Pass, 29.09.2026.

**F-824** · `PROCESS_IMPROVEMENT` · P2 · behoben (PR folgt)
Titel: Der Bau-Auftrag aus der Feature-Akte enthält nur Ziel, Nicht-Ziele und AKs. Datenmodell und Security erreichen den Architekten nicht.
Beschreibung: Im F36-Reallauf (Workflow `router-59f6cbd8…`, Lauf `e2ce802f`) bekam der Architekt aus der Feature-Akte nur Ziel, Nicht-Ziele und Akzeptanzkriterien. Die geklärten Abschnitte Datenmodell und Security fehlten im Auftrag. Er fragte deshalb Punkte erneut, die schon entschieden waren.
Fundstelle: Auftragsbau aus der Feature-Akte für den Architekten-Schritt (Workflow `router-59f6cbd8…`, Lauf `e2ce802f`).
Auswirkung: Mittel — doppelte Rückfragen an Stefan. Außerdem kann der Architekt anders entscheiden als bereits festgelegt.
Maßnahme: Geklärte technische Abschnitte (Datenmodell, Security) in den Auftrag übernehmen oder die Akte selbst als Eingabe des Architekten mitgeben.
Vermerk (Fixpaket PR 2 nach F36, 30.09.2026): `baueAuftragAusFeatureAkte` hängt die Abschnitte `## Datenmodell` und `## Security…` als Block „Geklärte Vorgaben (aus der Feature-Akte, bereits entschieden — nicht erneut fragen)“ vor die Referenzzeile an. Namen geprüft: Die Coach-Vorlage (`src/product-coach`) kennt beide Abschnitte nicht. Sie heißen laut `src/workboard/feature-abschnitte.ts` und Architekten-Instruktion `Datenmodell` bzw. `Security/Permissions` (so auch in haushaltsbuch2 F1/F2); gesucht wird exakt `## Datenmodell` bzw. `## Security` oder `## Security/Permissions`. Fehlen beide oder sind sie leer, bleibt der Auftragstext bitgenau (literaler Snapshot im Test). Kein Schemafeld. Längenobergrenze `GEKLAERTER_ABSCHNITT_OBERGRENZE` = 4000 Zeichen je Abschnitt, danach gekürzt mit Verweis auf die Akte (JSDoc in `src/feature-auftrag/index.ts`). Test: `src/feature-auftrag/feature-auftrag.test.ts` (F-824, drei Fälle). Nach dem Reviewer-/QA-Pass: Überschriften nur exakt (nicht `## Security-Review`, nicht `## Datenmodell (alt)`); ein Abschnitt, der nur einen Platzhalter trägt (`[FÜLLUNG…`, „offen“, „TBD“, „todo“), gilt nicht als entschieden und geht nicht mit. Grenzen im JSDoc: Kürzung nach UTF-16-Einheiten, ggf. mitten in einem Code-Fence; weitere technische Abschnitte (State/Persistenz, Interfaces/Contracts …) gehen bewusst nicht mit. Test ergänzt (vierter F-824-Fall).
Status: behoben (PR folgt).
Feature/Run: F36 Reallauf, 29.09.2026.

**F-825** · `BUG` · P2 · behoben (PR folgt)
Titel: Die Obergrenze 3 in „Passt, nicht im Lauf“ verdrängt installierbare Einträge zugunsten nicht installierbarer.
Beschreibung: `baueEmpfehlung` sortiert „Passt, nicht im Lauf“ nach Treffergüte (`rang`) und dann nach id und kürzt auf 3 (F-788). Im Reallauf fiel `playwright-mcp` (installierbar) aus der Liste. Angezeigt wurden stattdessen `image-to-code` und `mengto-skills`, beide ohne `installation_vorlage` und damit nicht installierbar.
Fundstelle: `src/ressourcen/index.ts` (`baueEmpfehlung`, Kürzung auf `EMPFEHLUNG_OBERGRENZE`).
Auswirkung: Mittel — der eine Eintrag, den Stefan direkt freigeben und installieren könnte, steht nur in der Zählzeile.
Maßnahme: Installierbare Einträge vor nicht installierbare sortieren. Alternativ nicht installierbare nur als Zählzeile zeigen.
Vermerk (Fixpaket PR 2 nach F36, 30.09.2026): `sortiereUndBegrenze` (`src/ressourcen/index.ts`) sortiert installierbare Einträge (`installierbar: true`, nur in „Passt, nicht im Lauf“) vor nicht installierbare, danach wie bisher nach `rang` und id, dann Kürzung auf `EMPFEHLUNG_OBERGRENZE`. „Wird genutzt“ bleibt unverändert (dort gibt es kein `installierbar`). Test mit dem Reallauf-Fall: `src/ressourcen/ressourcen.test.ts` (F-825, `playwright-mcp` installierbar vor `image-to-code`/`mengto-skills`); kalibriert, ohne die Sortierung rot. Nach dem Reviewer-/QA-Pass: Mehr als drei installierbare Einträge: der vierte steht weiter nur in der Zählzeile (Obergrenze bleibt, F-788).
Status: behoben (PR folgt).
Feature/Run: F36 Reallauf, 29.09.2026.

**F-826** · `PROCESS_IMPROVEMENT` · P3 · behoben (PR folgt)
Titel: Die Ausführung ist am ZWINGEND-Start freigebbar, ohne Hinweis auf einen passenden installierbaren Eintrag, der im Lauf fehlt.
Beschreibung: In Lauf `1c4a1163` stand ein passender installierbarer Eintrag in „Passt, nicht im Lauf“. „Freigeben“ ließ sich trotzdem ohne Hinweis klicken, dass dieser Eintrag im Lauf fehlt.
Fundstelle: ZWINGEND-Start der Ausführung (Empfehlungsblock neben „Freigeben“, WS-3).
Auswirkung: Niedrig — der Lauf startet ohne die Fähigkeit, obwohl eine Installation möglich wäre.
Maßnahme: Neben „Freigeben“ einen Hinweis zeigen, sobald ein installierbarer Eintrag in „Passt, nicht im Lauf“ steht.
Vermerk (Fixpaket PR 2 nach F36, 30.09.2026): Neu `renderInstallierbarHinweis` (`public/leitstand/empfehlung-anzeige.js`): Hinweistext direkt vor „Freigeben“, sobald ein installierbarer Eintrag in „Passt, nicht im Lauf“ steht, an beiden ZWINGEND-Starts (Workflow-Bedienung und Workboard-Vorschlag). Kein Blocker, „Freigeben“ bleibt klickbar. Test: `public/leitstand/empfehlung-anzeige.test.mjs` (F-826, Inhalt und Stelle vor dem Knopf in beiden Ansichten). Nach dem Reviewer-/QA-Pass: Ein installierbarer MCP, dem die Projekt-URL fehlt (`PROJEKT_URL_FEHLT`), steht nicht im Hinweis — er käme auch installiert nicht in den Lauf. Singular/Plural je Anzahl; der Text nennt „oben“ als Ort des Knopfs. Der Stellen-Test sucht jetzt gezielt `${renderInstallierbarHinweis(`. Render-Nachweis: `features/F36/nachweis-fixpaket-pr2/f826-hinweis-vor-freigeben.png` (aus `nachweis-ws5a-ui`, Szenario erfolg). Grenze: Ein Eintrag, den Stefan bewusst nicht will, bringt den Hinweis bei jedem Start wieder (kein Status „abgelehnt“).
Status: behoben (PR folgt).
Feature/Run: F36 Reallauf, 29.09.2026.

**F-827** · `PROCESS_IMPROVEMENT` · P2 · behoben (PR folgt)
Titel: Die Ausführung kennt die laufende Projekt-Vorschau nicht, deshalb bleibt Playwright für die eigentliche Prüfung ungenutzt.
Beschreibung: Im F3-Reallauf (haushaltsbuch2) hatte der Lauf `8cee6c98` `playwright-mcp` verbunden. Er versuchte aber, `npm run dev` selbst zu starten, und wurde verweigert. Der Korrekturlauf `74290fb5` navigierte auf `file:///…/public/index.html`. Playwright blockierte das mit „Access to "file:" protocol is blocked“. Die Vorschau lief die ganze Zeit unter der `vorschau_url`, das wusste die Ausführung aber nicht.
Fundstelle: Empfehlungszeile im Auftrag (`baueEmpfehlungsZeile`, `src/ressourcen/index.ts`); Läufe `8cee6c98`, `74290fb5`.
Auswirkung: Mittel — der MCP ist im Lauf, wird aber für die Sichtprüfung nie wirksam genutzt.
Maßnahme: Bei einem MCP mit `{projekt_origins}` nennt die Empfehlungszeile im Auftrag die `vorschau_url` und den Satz: „läuft bereits, zum Prüfen browser_navigate darauf nutzen, nicht selbst starten“.
Vermerk (Fixpaket PR 1 nach F36, 30.09.2026): `baueEmpfehlungsZeile` hängt „Projekt-Vorschau: <url> läuft bereits, zum Prüfen browser_navigate darauf nutzen, nicht selbst starten; keine file://-URLs.“ an, wenn ein genutzter Eintrag `{projekt_origins}` trägt und das Projekt eine gültige `vorschau_url` hat. Die URL kommt über den bestehenden Weg (`ermittleAusfuehrungsEmpfehlung` → `projektUrl`). Ohne solchen Eintrag bleibt die Zeile bitgenau. Belege: `src/ressourcen/ressourcen.test.ts`, `scripts/check-fixpaket-f36-nachlauf.mjs` (b), realer Start `scripts/check-f36-ws5a-installation.mjs` (h). Bekannte Grenzen (Reviewer-/QA-Pass): „läuft bereits“ wird nicht geprüft, denn `vorschau_url` ist nur konfiguriert. Läuft die Vorschau nicht, scheitert `browser_navigate`, und die Ausführung darf sie nicht selbst starten. Der Werkzeugname `browser_navigate` hängt am Platzhalter `{projekt_origins}`, nicht am tatsächlichen Werkzeug des MCP. Beides folgt dem Wortlaut der Maßnahme und ist nur für `playwright-mcp` zutreffend (vgl. F-834).
Status: behoben (PR folgt).
Feature/Run: F36 Reallauf (F3), 29.09.2026.

**F-828** · `BUG` · P3 · behoben (PR folgt)
Titel: Die Lauf-Detailansicht zeigt bei einem laufenden Lauf „Klärung erforderlich“ samt Maske „Klärung auflösen“.
Beschreibung: Während Lauf `8cee6c98` lief (nur `run_prepared`), zeigte die Detailansicht „Klärzustand: Klärung erforderlich“ und die Maske „Klärung auflösen“. Eine Entscheidung dort würde den aktiven Lauf als geklärt einstufen.
Fundstelle: Lauf-Detailansicht im Leitstand (Klärzustand-Anzeige); gesehen an `8cee6c98`.
Auswirkung: Niedrig — irreführend; eine versehentliche Entscheidung würde einen laufenden Lauf falsch einstufen.
Maßnahme: Bei aktivem Lauf „läuft“ statt eines Klärzustands anzeigen und die Maske sperren.
Vermerk (Fixpaket PR 2 nach F36, 30.09.2026): Serverseitig keine Lücke: `POST /api/entscheidungen` lehnt `terminal`/`kenntnisnahme` auf der aktiven laufId schon mit 400 ab (F14 WS-4 AK8, Gate `check-f13-entscheiden.mjs` (k)); `laufAktiv` setzen auch Workflow-Schrittstarts. Die Lücke lag in der Oberfläche: `renderLaufStatus` zeigt bei `detail.aktiv` ohne Terminalmarke „Klärzustand: läuft“, `renderEntscheidungBlock` zeigt dort keine Maske, sondern „Entscheidung erst nach seinem Ende möglich“. Test: `public/leitstand/views/runs.test.mjs` (neu, drei Fälle inkl. „aktiv, aber schon ABGESCHLOSSEN → unverändert“). Nach dem Reviewer-/QA-Pass: Auch im Nachlauf (Terminalmarke schon geschrieben, Prüfschritt läuft, `aktiv` noch true) zeigt `renderEntscheidungBlock` keine Maske `terminal`/`kenntnisnahme` mehr, die der Server mit 400 abgelehnt hätte; die Maske `antwort` (Bypass-Fall) bleibt, der Server erlaubt sie. Beide Texte sagen „Stand beim Öffnen; nach Laufende das Detail erneut öffnen“, weil das Detail nicht gepollt wird (Grenze F-363). Test ergänzt (vierter Fall). Render-Nachweis: `features/F36/nachweis-fixpaket-pr2/` (`aktiv/`, `nach-ende/`, `erzeuge-nachweis.mjs`). Beobachtet dabei: Die Laufliste zeigt für den aktiven Lauf weiter `KLAERUNG_ERFORDERLICH` und „Wiederaufnahme starten“ (F-844).
Status: behoben (PR folgt).
Feature/Run: F36 Reallauf (F3), 29.09.2026.

**F-830** · `PROCESS_IMPROVEMENT` · P3 · behoben (PR folgt)
Titel: Die DoD im Projekt-Skelett verlangt Reviewer-/QA-Pass per Subagent, in Workforce-Läufen ist das nicht erfüllbar.
Beschreibung: Die `CLAUDE.md` im Projekt-Skelett verlangt einen Reviewer-/QA-Pass per Subagent vor der Freigabe. Workforce-Ausführungsläufe haben kein `Agent` im Werkzeugsatz. Die DoD-Zeile ist dort also nicht erfüllbar, und das wird nirgends erklärt.
Fundstelle: `vorlagen/projekt-skelett/CLAUDE.md` (Definition of Done); F42 (Projekt-Harness).
Auswirkung: Niedrig — widersprüchliche Vorgabe für das Modell im Lauf.
Maßnahme: Die DoD-Zeile im Skelett (F42) ergänzen um „in Workforce-Läufen: Review/QA als Workflow-Schritte“.
Vermerk (Fixpaket PR 2 nach F36, 30.09.2026): Die Skelett-`CLAUDE.md` hatte bisher keine DoD-Zeile Reviewer/QA, nur den Abschnitt „Prüfrollen als Subagenten“. Die DoD-Zeile ist jetzt ergänzt, mit dem Zusatz „In Workforce-Läufen sind Review und QA eigene Workflow-Schritte; weder git noch Commit in der Ausführung (Shell-Satz hat Vorrang)“. Derselbe Zusatz steht am „Iterationsende“ und am Abschnitt „Prüfrollen“. HERKUNFT.md vermerkt die lokale Abweichung von der Quelle. F42-Gate angepasst: `scripts/check-f42-projekt-harness.mjs` (a) prüft beide Zusätze; kalibriert, ohne Zusatz rot. Nach dem Reviewer-/QA-Pass: Zusätzlich „kein `cd`“ am Iterationsprinzip. HERKUNFT.md nennt, dass bestehende Projekte (z. B. haushaltsbuch2) die alte Fassung behalten (`kopiereSkelett` überschreibt nicht). Nicht geändert (Grenze): der Status-Block „Jede Ausgabe endet mit …“ und die Nennung von `npm run dev` im Skelett; in Workforce-Läufen gehen Shell-Satz und Rollen-Ausgabeformat vor.
Status: behoben (PR folgt).
Feature/Run: F36 Reallauf (F3), 29.09.2026.

**F-831** · `HARNESS_IMPROVEMENT` · P2 · behoben (PR folgt)
Titel: Init-Gate und V4a erfassen Slash-Commands außerhalb von `<projekt>/.claude/commands` nicht; ein `tool_use` vor der init-Zeile wird nur beendet, nicht verhindert.
Beschreibung: `pruefeInitZeile` prüft nur `skills`, `tools` und `mcp_servers`. Commands stehen laut 9b′ nicht in `init.skills`, sind aber per Skill-Werkzeug aufrufbar. Ein Command aus einer Nutzer- oder Plugin-Quelle oder aus einer neuen CLI-Version steht in keiner Sperrliste, und kein Gate wird rot. Ergänzt F-791 (3) um den fehlenden Rotfall. Zusätzlich: Im Zweig „tool_use vor init“ reagiert das Gateway auf eine bereits gestreamte `tool_use`-Zeile; die CLI hat das Werkzeug dann schon ausgeführt.
Fundstelle: `src/claude-code-gateway/index.ts:522-541` (`pruefeInitZeile`), `:664-665`; `src/ressourcen/ort-b-start.ts:75-77`.
Auswirkung: Mittel — die V4a-Grenze gilt nur für gemessene Namen; neue Commands bleiben unbemerkt aufrufbar.
Maßnahme: `init.slash_commands` gegen eine Referenzmenge je CLI-Version prüfen (unbekannt → Abbruch) samt Rotfall; „vor dem ersten tool_use“ in der Akte auf den tatsächlichen Umfang präzisieren.
Vermerk (Fix F-831, 30.09.2026): Gemessen über den Produktionsweg (ein Ort-B-Skill, Wegwerf-Projekt mit Projekt-Skills und -Commands) mit der installierten CLI 2.1.285: `init.slash_commands` trägt 36 Namen außer dem Ort-B-Skill, dieselbe Menge wie unter 2.1.284 (9b′/9b″); gesperrte Projekt-Skills und -Commands stehen nicht darin. Gegenprüfung (Muster 9b″) an 7 Namen (clear, insights, security-review, __remote-workflow, skill-doctor, team-onboarding und Projekt-Command lessons): alle verweigert, pruef-skill lädt. Nachweis `features/F36/nachweis-f831/` (Pfade maskiert). Referenzmenge `src/claude-code-gateway/slash-commands-referenz.json` (versionsunabhängig, mit CLI-Version und Messdatum). `pruefeInitZeile`: `init.slash_commands` muss ein Array sein, jeder Name ∈ Referenzmenge ∪ gesperrte Namen (`OrtBSkillStart.gesperrteNamen` → `ortBLauf.gesperrteNamen` → `initGate.gesperrt`) ∪ Ort-B-Skills, sonst Verstoß „init.slash_commands enthält unbekannte Commands: … (Referenzmenge nachmessen)“. Ohne `initGate` keine Wirkung (F-833-Test um einen unbekannten Command ergänzt). Tests: `claude-code-gateway.test.ts` (F-831, reale init-Zeile grün, Rotfälle), `ort-b-start.test.ts`; Gate `check-f36-ws5b-skill` (m) um den Rotfall ergänzt, kalibriert. Akte präzisiert: Das Gate reagiert auf die init-Zeile; ein `tool_use` davor wird beendet, nicht verhindert. Grenze: `init.plugins` bleibt ungeprüft (feature.md, Bekannte Grenzen; der Eintrag hieß unter 2.1.284 `telemetry@builtin`, unter 2.1.285 `cc-plugin-telemetry@builtin`).
Nach dem Reviewer-/QA-Pass: Die Referenzdatei wird bei jedem Start neu gelesen (kein Cache, Nachmessung wirkt ohne Neustart); `leseSlashCommandsReferenz` unterscheidet „nicht lesbar“ und „falsche Form“, beides Verstoß und getestet. Bindungstest: Referenzmenge = gemessene `slash_commands` ohne Ort-B-Skill, ohne Duplikate. Benannter Typ `InitGateErwartung`. `gegenpruefung.json` mit dem Endstand neu erzeugt (gleiches Ergebnis). Entscheidung und Grenzen in feature.md („WS-5b Referenzmenge Slash-Commands“): Die Menge gilt versionsunabhängig und nach Namen statt „je CLI-Version“. Nicht erkannt werden ein Name der Menge, der später aufrufbar wird, und ein Nutzer-/Plugin-Command oder Ort-B-Skill mit einem Namen der Menge (nicht gemessen); die Kollisionsprüfung beim Ort-B-Start kennt die Referenzmenge nicht (QA, niedrig, nicht umgesetzt).
Status: behoben (PR folgt).
Feature/Run: F36 Review-Pass (code-reviewer Befunde 2, 6), 29.09.2026.

**F-832** · `BUG` · P2 · behoben (PR folgt)
Titel: `claude_ordner_veraendert` lässt sich über `.gitignore` plus npm-Skript umgehen; die Begründung in der Akte trägt nicht.
Beschreibung: feature.md (Bekannte Grenzen, „WS-5b Laufdiff“) stützt die Lücke „gitignorierte Datei unter `.claude/` bleibt unsichtbar“ auf „die Bash-Allowlist lehnt schreibende Befehle ab“. Die Allowlist erlaubt aber `npm run check:*`, `npm run build:*` und `npm install`; Write auf `package.json` und `.gitignore` ist nicht gesperrt. Ein Lauf kann ein npm-Skript ergänzen, das `.claude/…` anlegt, und `.claude/` ignorieren lassen; `leseClaudeAenderungen` (ohne `--ignored`) meldet dann nichts. Aus dem Code abgeleitet, nicht gemessen. Folgeläufe schützt der Vorstart-Scan (Dateisystem, nicht git).
Fundstelle: `src/execution-controller/index.ts:149-175`; `src/startvorlage/index.ts:139-147`; `src/ressourcen/ort-b-start.ts:37`.
Auswirkung: Mittel — die Laufdiff-Grenze ist im Lauf selbst umgehbar.
Maßnahme: `git status --ignored` für Pfade unter `.claude` oder Dateisystem-Vergleich vorher/nachher, mit Rotfall; Satz in der Akte korrigieren.
Vermerk (F36 Fixpaket, 29.09.2026): Der Satz in feature.md („WS-5b Laufdiff“) ist korrigiert. Der Code-Fix bleibt offen: `git status --ignored` allein würde jede schon vor dem Lauf vorhandene ignorierte Datei (z. B. `.claude/settings.local.json`) rot werten; nötig ist ein Vorher-/Nachher-Vergleich, der über den Umfang des Fixpakets (~30 Zeilen) hinausgeht.
Vermerk (Fixpaket PR 2 nach F36, 30.09.2026): Neu `erfasseClaudeOrdner`/`vergleicheClaudeOrdner` (`src/execution-controller/index.ts`): Momentaufnahme von `<projekt>/.claude` vor dem Start (rekursiv, relativer Pfad plus sha256, inklusive git-ignorierter Dateien), Vergleich nach dem Ende. Neue, geänderte oder gelöschte Pfade gehen zusätzlich zum git-Weg in `claudeAenderungen` → `claude_ordner_veraendert`. Grenzen (feature.md „WS-5b Laufdiff“ nachgezogen): nur `<projekt>/.claude`, keine verschachtelten ignorierten `.claude`-Ordner; ohne lesbare Momentaufnahme gilt nur der git-Weg. Die CLI schreibt im normalen Lauf nichts unter `<projekt>/.claude` (haushaltsbuch2 nach den Reallauf-Serien 28./29.09.: keine Datei jünger als 25.09.), also keine Ausnahme und kein Blocker. Tests: `src/execution-controller/execution-controller.test.ts` (F-832), Gate `scripts/check-f36-ws5b-skill.mjs` (n): Rotfall gitignorierte neue Datei → FEHLGESCHLAGEN, Gutfall vorhandene settings.local.json → ERFOLGREICH; kalibriert. Nach dem Reviewer-/QA-Pass: Nur reguläre Dateien werden gelesen (FIFO o. Ä. zählt mit dem Typ, kein Hängen). Grenzen in feature.md ergänzt: beide Wege nur bei Ort-B-Läufen; `.claude` vor dem Start nicht lesbar → nur git-Weg (Vorgabe des Auftrags), nachher nicht lesbar → rot; keine Größengrenze, `.claude/worktrees/` o. Ä. kostet Zeit und macht bei paralleler Schreibsitzung rot (F-843).
Status: behoben (PR folgt).
Feature/Run: F36 Review-Pass (code-reviewer Befund 3), 29.09.2026.

**F-833** · `TECH_DEBT` · P2 · behoben (PR folgt)
Titel: Die Bitgenau-Zusage „Läufe ohne Katalog-Einträge unverändert“ ist nur für das Argv erzwungen, nicht für den Auftragstext und nicht für das Gateway ohne `initGate`.
Beschreibung: Argv: literaler Snapshot `claude-code-gateway.test.ts:201-222` (Stand vor F36) plus Relativvergleiche `check-f36-ws2-laufzeit` (a)/(b) und `check-f36-ws5b-skill` (o). Auftragstext: nur Relativvergleiche im heutigen Code (`check-f36-ws3-empfehlung.mjs:329-332`, `check-f36-ws2-laufzeit.mjs:297-304`); eine unbedingte Änderung am Textbau bliebe grün. Dass `starteGateway` ohne `initGate` die init-Zeile nicht auswertet (Läufe ohne Ort-B, Codex, ohne init-Zeile), hat keinen Test. Nach ARCHITECTURE.md §8 nicht ERZWUNGEN.
Fundstelle: siehe Beschreibung; `src/claude-code-gateway/index.ts:210`.
Auswirkung: Mittel — eine Regression für alle Läufe ohne Katalog-Einträge bliebe unbemerkt.
Maßnahme: literaler Snapshot des Ausführungs-Auftragstexts ohne `empfehlungIds`; Rotfall „ohne initGate kein Abbruch bei beliebiger init-Zeile“.
Vermerk (Fixpaket PR 2 nach F36, 30.09.2026): (1) Literaler Snapshot als Hash: `scripts/check-f36-ws3-empfehlung.mjs` (e) vergleicht den Ausführungs-Auftragstext ohne `empfehlungIds` mit einem festen sha256 (`AUFTRAGSTEXT_OHNE_EMPFEHLUNG_SHA256`); kalibriert, eine unbedingte Textänderung ist rot, obwohl der Relativvergleich grün bleibt. (2) Rotfall: `src/claude-code-gateway/claude-code-gateway.test.ts` (F-833): `starteGateway` ohne `initGate` bricht bei fremden Skills, `Agent` und fremdem MCP in der init-Zeile nicht ab und schreibt kein `init_gate_verstoss`, ebenso ohne init-Zeile; kalibriert mit einem Default-Gate rot. Nach dem Reviewer-/QA-Pass: Bei Abweichung gibt das Gate den vollständigen Ist-Text aus, damit eine bewusste Änderung benannt werden kann; der Text enthält keine rechner- oder pfadabhängigen Teile (Reviewer geprüft).
Status: behoben (PR folgt).
Feature/Run: F36 Review-Pass (code-reviewer Befund 4, qa Bitgenau), 29.09.2026.

**F-837** · `PROCESS_IMPROVEMENT` · P2 · erledigt
Titel: Doku-Drift in der F36-Akte, der Zielfassung, STATUS.md und der Übergabe.
Beschreibung: (1) zielfassung E-F36-6 und AK11 sagen noch „danach ins Projekt-`.claude/`“, ohne „überholt“ (widerspricht E-F36-8/AK6). (2) zielfassung und AK4 sagen „freigegebene Projekt-Agents/-Skills fallen aus der Sperrliste“; gebaut bleiben Projekt-Skills auch bei FREIGEGEBEN gesperrt (F-816); die zielfassung beschreibt eine Sperre per `Agent(…)`, gebaut ist `Agent` gar nicht in `--tools`. (3) feature.md „WS-5b gebaut, nicht gemergt“ neben „#278 gemergt“; docs/STATUS.md nennt „Offen: WS-3, WS-5, Reallauf“. (4) AK7 „Offen: Beleg im Reallauf“ nicht nachgezogen; AK6, AK8, AK9 ohne Endstand. (5) AK10 sowie WS-1b/WS-5b sagen „OFFEN, ohne installation“; seit #281 sind `frontend-design`/`playwright-mcp` FREIGEGEBEN mit absoluten Pfaden — die F-812-Grenze nennt nicht, dass diese Pfade auf anderen Rechnern/Checkouts nicht stimmen. (6) uebergabe-aktuell: Reallauf-Nachweis „nicht committet“ (#280 gemergt), `ressourcen.json` „noch committen“ (#281), „Schema-Zwilling navigate_adressen offen“ (Feld steht im Schema). (7) feature.md „Challenger entscheidet, ob Read mitgezählt wird“ — laut Übergabe entschieden (nicht gezählt). (8) `features/F36/nachweis-ws5b/README.md:227` „übrige Slash-Commands nicht gemessen“ widerspricht 9b″ derselben Datei. (9) Unter „Bekannte Grenzen“ fehlen: GetTask in `init.tools` vom Init-Gate ungeprüft (F-791), F-818, F-822/F-823. (10) `pruefeUndVerweigereBeiTreffer` (`src/claude-code-gateway/index.ts:544`) ohne JSDoc.
Fundstelle: siehe Beschreibung.
Auswirkung: Mittel — FEATURE_GATE und Abnahme würden gegen einen falschen Stand geprüft.
Maßnahme: Im F36-Doku-Fixpaket vor FEATURE_GATE nachziehen.
Vermerk (F36 Fixpaket, 29.09.2026): (1) zielfassung v1.38 Umsetzungsvermerk E-F36-6, AK11 angepasst; (2) AK4-Wortlaut und zielfassung E-F36-8 um den gebauten Stand ergänzt (F-815/F-816); (3) WS-5b-Status in feature.md auf „gemergt #278“, docs/STATUS.md nachgezogen; (4) Endstände AK6/AK7/AK8/AK9 eingetragen; (5) AK10 und die OFFEN-Aussagen in WS-1b/WS-5a/WS-5b nachgezogen, F-812-Grenze um absolute Pfade ergänzt; (6) state/uebergabe-aktuell.md neu geschrieben; (7) Read-Zählregel als entschieden vermerkt; (8) nachweis-ws5b/README.md korrigiert; (9) Grenzen GetTask, F-818, F-822/F-823, Agents ergänzt; (10) JSDoc `pruefeUndVerweigereBeiTreffer` ergänzt (war nie vorhanden).
Status: erledigt (F36 Fixpaket, 29.09.2026).
Feature/Run: F36 Review-Pass (qa M1–M4, N1–N4; code-reviewer Befund 9), 29.09.2026.

**F-839** · `BUG` · P1 · erledigt
Titel: Eine Projekt-Startvorlage konnte `Skill`, `Agent`, `Task` und `mcp__<server>` am Katalog, an V4a und am Init-Gate vorbei öffnen.
Beschreibung: `pruefeErlaubteWerkzeuge` lehnte nur Bash- und Shell-Formen ab. `Skill`, `Agent`, `Task` und ein reiner Servername `mcp__playwright-mcp` passten zu `WERKZEUG_EINTRAG_MUSTER`. Die Startvorlage eines Projekts liegt in dessen Repo und ist für die Ausführung schreibbar; `baueAufruf` übernimmt `erlaubte_werkzeuge` ungefiltert in `--tools`/`--allowedTools`. V4a-Sperren und Init-Gate gelten nur für Ort-B-Läufe. Keine committete Startvorlage (ai-workforce, Fixtures, haushaltsbuch, haushaltsbuch2, f25-testprojekt-b) nutzte diese Namen.
Fundstelle: `src/startvorlage/index.ts` (`pruefeErlaubteWerkzeuge`).
Auswirkung: Hoch — AK4 („ohne Freigabe nicht aufrufbar“) war über die Startvorlage unterlaufbar; aufgefangen nur menschlich (sauberer Arbeitsbaum, Stefans Commit).
Maßnahme: `KATALOG_WERKZEUGE` (`skill`, `agent`, `task`, Groß-/Kleinschreibung egal, mit oder ohne Klammer-Regel) und jedes `mcp__…` werden abgelehnt. Rotfälle: `src/startvorlage/startvorlage.test.ts` (zehn Formen in beiden Sätzen, Grünseite `TaskOutput`/`Skills`), Gate `scripts/check-f36-ws2-laufzeit.mjs` (e) (Projekt-Startvorlage mit je einem der vier Namen → `ladeStartvorlage` wirft). Beide kalibriert: ohne die Prüfung rot.
Status: erledigt (F36 Fixpaket, 29.09.2026).
Feature/Run: F36 Review-Pass (code-reviewer Befund 1, H-A), 29.09.2026.

**F-844** · `BUG` · P3 · erledigt
Titel: Die Laufliste zeigt einen aktiven Lauf als KLAERUNG_ERFORDERLICH mit „Wiederaufnahme starten“.
Beschreibung: Beim Render-Nachweis zu F-828 zeigte die Laufzeile des aktiven Laufs `nachweis-f828-aktiv` Status `KLAERUNG_ERFORDERLICH` und den Knopf „Wiederaufnahme starten“, während das Detail (seit F-828) „läuft“ zeigt. Der Laufstart selbst ist durch D13 gesperrt, solange ein Lauf aktiv ist; die Anzeige ist trotzdem irreführend.
Fundstelle: Laufliste `public/leitstand/views/runs.js` (`renderLaeufe`); `features/F36/nachweis-fixpaket-pr2/aktiv/01-lauf-detail-aktiv.png`.
Auswirkung: Niedrig — irreführende Anzeige, kein falscher Zustand.
Maßnahme: In der Laufliste bei aktivem Lauf „läuft“ statt des Klärzustands zeigen und „Wiederaufnahme starten“ ausblenden (Quelle für aktiv im Zustands-Aggregat prüfen).
Status: erledigt durch diesen PR (F44 WS-5a): Die Liste „Ausführungen“ zeigt für den Lauf aus `zustand.aktiverLauf` (aktiv, ohne Terminalmarke) den Statuspunkt „Läuft“; die Zeile trägt keine Knöpfe mehr, „Fortsetzung vorbereiten“ (Wiederaufnahme) steht nur im Lauf-Detail und nicht, solange der Lauf läuft (`darfFortsetzen`, Test `lauf-detail.test.mjs`, `runs.test.mjs`).
Feature/Run: Fixpaket PR 2 nach F36, Render-Nachweis F-828, 30.09.2026.

**F-846** · `TECH_DEBT` · P3 · behoben
Titel: Der Startvorlage-Validator sperrte `.com` nicht, obwohl Schema und `pruefeStartziel` es tun.
Beschreibung: `GESPERRTE_STARTZIEL_ENDUNGEN` in `src/startvorlage/index.ts` enthielt nur `.cmd/.bat/.ps1`; die Schemabeschreibung von `pruefbefehl` und die Laufzeitprüfung (`ENDUNGS_SPERRLISTE`, `prozessstart.ts`) nennen zusätzlich `.com`. Ein `.com`-Startziel fiel dadurch erst beim Start auf, nicht beim Laden der Vorlage.
Fundstelle: `src/startvorlage/index.ts` (`GESPERRTE_STARTZIEL_ENDUNGEN`).
Auswirkung: Niedrig — die Laufzeitprüfung griff trotzdem.
Maßnahme: `.com` ergänzt; gilt für `pruefbefehl`, `startbefehl` und `worker.codex.startziel`. Gate `check-f43-projekt-aufrufen.mjs` (a).
Status: behoben (F43, PR folgt).
Feature/Run: F43, 30.09.2026.

**F-849** · `HARNESS_IMPROVEMENT` · P2 · behoben (PR folgt)
Titel: `vorschau_url` darf auf den Port des Leitstands zeigen.
Beschreibung: `validiereProjekteDaten` prüft nur die Form `http://localhost|127.0.0.1:<port>`. Zeigt `vorschau_url` auf den Leitstand selbst, meldet F43 „erreichbar“ und „Öffnen“ öffnet den Leitstand; über F36 (`{projekt_origins}`) bekäme ein Browser-MCP eines Laufs den Leitstand-Origin freigeschaltet und könnte dort bedienen, ohne dass der CSRF-Haken greift (gleicher Origin).
Fundstelle: `src/projekte/index.ts` (`vorschauPortAus`); `scripts/leitstand-server.mjs` (`baueMcpPlatzhalter`, Bindeblock `PORT`).
Auswirkung: Mittel für F36-Läufe mit Browser-MCP, gering für F43.
Maßnahme: Beim Serverstart einen Registereintrag mit `vorschau_url`-Port = Leitstand-Port abweisen oder `{projekt_origins}` dafür leer lassen.
Status: behoben (PR folgt).
Vermerk: Einstufung Challenger 30.09.2026: ein Lauf mit Browser-MCP könnte bei vorschau_url = Leitstand-Port den Leitstand bedienen (bis zur eigenen Freigabe); Fix als eigener Auftrag nach F43.
Vermerk (Fix 30.09.2026): `vorschauLeitstandSperre` (`src/projekte/index.ts`) vergleicht den Port der vorschau_url mit dem tatsächlich gebundenen Port der Verbindung (`req.socket.localPort`, wie der Host-Schutz F-814), fail-closed bei unbekanntem Port. (1) Laufstart/Anzeige: `ermittleAusfuehrungsEmpfehlung` und `baueMcpPlatzhalter` lösen `{projekt_origins}` dann nicht auf; der Eintrag steht in „Passt, nicht im Lauf“ mit eigenem Grund („vorschau_url zeigt auf den Leitstand-Port — nicht als Projekt-Origin zulässig“ bzw. „Leitstand-Port unbekannt …“), Projekt-URL-Zeile nennt den Grund. (2) `POST /api/projekte` weist eine solche vorschau_url mit 400 ab (das Feld wird dort sonst nicht übernommen); beim Serverstart meldet die Konsole betroffene Registereinträge. (3) F43: `pruefeVorschau` fragt nicht an, die Projektkarte zeigt „nicht zulässig (Leitstand-Port)“ ohne „Öffnen“. Gates: `check-f36-ws5a-installation.mjs` (l), `check-f43-projekt-aufrufen.mjs` (h), je localhost und 127.0.0.1 mit gleichem Port, Gutfall anderer Port; kalibriert (Sperre deaktiviert → beide Gates rot). Render-Nachweis `features/F43/nachweis-f849/` (Karte mit Badge und Abhilfe, ohne „Öffnen“; anderer Port unverändert; mobil 400 px). `POST /api/projekte` antwortet auch bei unbekanntem Port mit 400 (fail-closed, strenger als verlangt). Bekannte Grenze: verglichen wird nur mit dem Port der eigenen Instanz — eine vorschau_url auf eine zweite, parallel laufende Leitstand-Instanz (z. B. Worktree mit anderem `LEITSTAND_PORT`) bleibt zulässig (F-855).
Feature/Run: QA-Pass F43, 30.09.2026.

**F-854** · `BUG` · P3 · erledigt
Titel: Workboard-Kachel „Roadmap“ zeigt beim Projekt haushaltsbuch2 „Roadmap konnte nicht geladen werden“.
Beschreibung: Workboard-Kachel ‚Roadmap‘ zeigt beim aktiven Projekt haushaltsbuch2 ‚Roadmap konnte nicht geladen werden‘ (gesehen 30.09.2026).
Fundstelle: Workboard, Kachel „Roadmap“; `roadmap_pfad` des Registereintrags bzw. der Roadmap-Endpunkt der Projekt-Instanz (ungeprüft).
Auswirkung: Niedrig — Anzeige einer Fehlermeldung statt eines leeren Zustands.
Maßnahme: Ursache prüfen (roadmap_pfad des Projekts vs. Endpunkt); fehlt die Roadmap bewusst, einen leeren Zustand mit Hinweis statt einer Fehlermeldung zeigen. Nur erfasst, nicht gefixt.
Status: offen.
Vermerk (F44, 30.09.2026): → WS-2 (Roadmap, Tabellenzeile D4 in `docs/design/abgleich-f725.md`: fehlende Roadmap als Leerzustand zeigen).
Ursache (belegt F44 WS-2a, 01.10.2026): Der Server antwortet für haushaltsbuch2 korrekt — GET `/api/projekte/haushaltsbuch2/roadmap`, nachgestellt mit der echten Projektinstanz (`erzeugeRequestHandler` + `erzeugeMultiProjektDispatcher`, ohne Instanz-Lock), liefert 200 mit `{ status: 'ungueltig' }` und 9 Regelverstößen in 32 ms; `docs/projekt/roadmap.json` dort ist seit 25.09.2026 unverändert, die Antwort war am 30.09. also dieselbe [Fakt]. Den Text „Roadmap konnte nicht geladen werden“ setzt `views/workboard.js` (ladeRoadmap) nur, wenn `holeRoadmap()` wirft, also bei einem Netzfehler oder dem 5-s-Zeitlimit (`AbortSignal.timeout`) — am selben Tag beantwortete der Leitstand Anfragen zeitweise langsamer als 5 s (Umgebungsnotiz WS-1a in `features/F44/feature.md`) [Schlussfolgerung: Zeitlimit; nicht nachstellbar]. Eine fehlende Roadmap war es nicht; die fachliche Lage von haushaltsbuch2 ist „ungültig“ (eigener Befund F-894). Nebenbei gefunden: `holeRoadmap` las eine Nicht-2xx-Antwort (404 eines nicht initialisierten Projekts, 500) als Erfolg — die Bento-Karte hätte dann `meilensteine` eines Körpers ohne status gelesen.
Status: erledigt (F44 WS-2a, Branch `feat/f725-ws2a-entscheidungen-roadmap`, 01.10.2026): `holeRoadmap` läuft über `holeJsonOderWirf` (Nicht-2xx ist ein Wurf; gilt auch für die Bento-Karte, deren Markup unverändert bleibt); `roadmapZustand` (`public/leitstand/roadmap-anzeige.js`) ordnet jede unbekannte Antwort als Fehler ein, nur `nicht_vorhanden` erscheint als Leerzustand „Noch keine Roadmap“ (Test `roadmap-anzeige.test.mjs`; Nachweise `features/F44/nachweise/ws2a/roadmap-blockiert`, `roadmap-404`, `roadmap-nicht-vorhanden`, `roadmap-ungueltig`).
Feature/Run: Abnahme F43 durch Stefan, 30.09.2026.

**F-857** · `BUG` · P3 · erledigt
Titel: Der Pfad-Text der Projektkarte läuft mobil (400 px) über.
Beschreibung: In der Projektübersicht (F43) läuft der Pfad-Text der Projektkarte bei 400 px Breite über den Kartenrand hinaus.
Fundstelle: Render-Nachweis `features/F43/nachweis-f849/mobil/`.
Auswirkung: Niedrig — Darstellungsfehler auf schmalen Bildschirmen, keine Funktionseinbuße.
Maßnahme: Im Design-Schnitt F-725 mitnehmen.
Status: erledigt (F44 WS-6a, 01.10.2026): Der volle Pfad steht nicht mehr auf der Karte, sondern in der Klappe „Vorschau & Aufruf · Technik“ und bricht dort um (`overflow-wrap: anywhere`); Render-Nachweis `features/F44/nachweise/ws6a/matrix-dunkel-390/` und `matrix-hell-390/` (Klappe offen, kein waagerechter Überlauf).
Vermerk (F44, 30.09.2026): → WS-6 (Produkte, Tabellenzeile H2 in `docs/design/abgleich-f725.md`: Pfad in die Akte, nicht auf die Karte).
Feature/Run: Entdeckt: F43-Abnahme, 30.09.2026.

**F-858** · `PROCESS_IMPROVEMENT` · P3 · erledigt
Titel: `state/uebergabe-aktuell.md` enthielt absolute Benutzerpfade (öffentliches Repo).
Beschreibung: Die Übergabe nannte Worktree-Ordner mit vollständigem Benutzerpfad dieses Rechners; das Repo ist öffentlich.
Fundstelle: `state/uebergabe-aktuell.md` (Abschnitt „Aufräumen“, Fassung vor 30.09.2026).
Auswirkung: Niedrig — Offenlegung von Benutzername und Ordnerstruktur.
Maßnahme: In der Übergabe nur relative Pfade verwenden.
Status: erledigt (Scout F-800, 30.09.2026): Übergabe mit relativen Pfaden neu geschrieben.
Feature/Run: Scout F-800, 30.09.2026.

**F-860** · `BUG` · P2 · erledigt
Titel: Ein Projektwechsel lädt Workitems, Roadmap, P0/P1-Zahl, Verbrauch und die Auswahllisten des Direktstarts nicht neu.
Beschreibung: Nur der Chat abonniert `abonniereProjektWechsel` (Fakt, Code). Workitems und Roadmap im Workboard, P0/P1 und Verbrauch im Dashboard sowie Aufträge und Werkzeugsätze im Direktstart werden nur beim Bootstrap geladen; im Direktstart geht der POST an den neuen Präfix, die Auswahlliste zeigt aber noch das alte Projekt. Dass nach „Öffnen“ eines anderen Projekts alte Daten stehen bleiben, ist nicht im Browser geprüft (Schlussfolgerung).
Fundstelle: `public/leitstand/projekt-kontext.js:86-101`, `public/leitstand/views/workboard.js:1312-1313`, `public/leitstand/views/dashboard.js:219-220`, `public/leitstand/views/projekt.js:303-308` (Stand `50bbccb`).
Auswirkung: Mittel — nach einem Projektwechsel können Ansichten Daten des vorigen Projekts zeigen; die Vorlage V10 stellt den Produktwechsel ins Zentrum.
Maßnahme: Zentraler Neuladen-Hook beim Projektwechsel in F44 WS-1. Möglicherweise verwandt mit F-854 (Annahme).
Status: erledigt (F44 WS-1a, Branch `feat/f725-ws1a-fundament`, 30.09.2026): Workboard (Workitems, Roadmap; Filter zurück auf „Alle“), Dashboard (P0/P1, Verbrauch) und Direktstart (Aufträge, Werkzeugsätze) abonnieren `abonniereProjektWechsel` und laden neu; späte Antworten des alten Projekts verwirft je Lader ein Anfragezähler; ein werfender Abonnent blockiert die übrigen nicht mehr (`projekt-kontext.js`). Belege: `public/leitstand/projekt-wechsel.test.mjs` (9 Fälle; Mutationen der Hooks, des verworfenen Poll-Abrufs, des Filter-Resets, des Dashboard-Resets und des Projekt-Wächters je rot) und Render-Nachweis `features/F44/nachweise/ws1a/projektwechsel-f860/` (A öffnen, dann B: Workboard, Dashboard, Poll-Kennzahlen und Auftragsliste zeigen sofort B). Korrekturrunde nach dem Prüfpass: Ein laufender Zustands-Abruf des alten Projekts wird verworfen (`zustand.js`, Kontext-Generation), das alte Aggregat, ein offenes Workboard-Detail samt Click-to-Work-Zustand und eine vorbereitete Wiederaufnahme im Direktstart ebenso; Wiederaufnahme (`runs.js` → `wendeWiederaufnahmeAn`) und Click-to-Work-Kette prüfen nach jedem Warten, ob das Projekt noch dasselbe ist. Rückweg B → A im Nachweis ebenfalls belegt. Nicht erfasst ist das Workflow-Detail unter `#/workflows/<id>` (eigener Befund F-874, WS-4).
Feature/Run: Challenger-Dokument 474 (F-725), 30.09.2026.

**F-861** · `HARNESS_IMPROVEMENT` · P2 · behoben auf Branch
Titel: Das Token-Gate kennt keine Token-Blöcke `:root[data-theme]`, scannt nur `style.css` und erkennt `hsl()` nicht.
Beschreibung: Ein manueller Hell/Dunkel-Umschalter (Vorlage V10) wäre rot, weil `:root[data-theme="light"] { … }` nicht als Token-Definition galt. Als CSS prüfte das Gate nur `style.css`, ein zweites Stylesheet bliebe ungeprüft. `hsl()` und Farbnamen erkannte es nicht.
Fundstelle: `scripts/check-f20-design-tokens.mjs`.
Auswirkung: Mittel — ohne Erweiterung blockiert das Gate das Hell-Theme oder lässt Literale in weiteren Stylesheets durch.
Maßnahme: In F44 WS-0 erweitert.
Status: behoben auf Branch (30.09.2026, Branch `feat/f725-ws0-design-ablage`, F44 WS-0): `:root[data-theme="light"|"dark"]` gilt in `style.css` als Token-Block; innerhalb von Token-Blöcken sind Literale nur in Custom Properties (`--name:`) erlaubt; jede weitere `*.css` unter `public/leitstand/` wird rekursiv mit derselben Literal-Regel und Kommentar-Balance geprüft und darf keine eigenen Farb-Tokens definieren; `rgb/hsl/hwb/lab/lch/oklab/oklch/color()` gelten ohne Groß-/Kleinschreibung als Farbliteral (heutiger Stand bleibt grün); Rot/Grün-Selbsttest (3) mit zwölf konstruierten Stylesheets und Wegwerf-Dateien im Temp-Ordner. Kalibriert am 30.09.2026 durch vier Mutationen einer Kopie des Gates (je ein Lauf `node scripts/_m.mjs`, danach gelöscht): ohne `data-theme` im Token-Muster → 3 Selbsttest-Befunde; CSS-Sammlung nur `style.css` → 2; Farbfunktionen nur `rgba?` → 2; Token-Block vollständig statt nur Custom Properties entfernt → 1. Bekannte Grenzen (Kopf des Gates): Farbnamen, `var()`-Ausnahme für ganze Funktionsaufrufe, `manifest.webmanifest`/`*.svg` ungeprüft.
Feature/Run: Challenger-Dokument 474 (F-725), 30.09.2026.

**F-862** · `BUG` · P3 · erledigt
Titel: Schnellzugriff „Neues Projekt“ in der Sidebar ist deaktiviert mit „kommt bald“, obwohl F41 gebaut ist.
Beschreibung: Der Sidebar-Schnellzugriff „Neues Projekt“ ist disabled und trägt „kommt bald“, obwohl das Anlegen eines Projekts (F41, `POST /api/projekte`) gebaut ist.
Fundstelle: `public/leitstand/index.html:122` (Stand `50bbccb`).
Auswirkung: Niedrig — der Weg ist über die Projekte-Übersicht erreichbar, der Hinweis ist aber falsch.
Maßnahme: In F44 WS-1 (das „+“ neben der Projektauswahl).
Status: erledigt (F44 WS-1b, Branch `feat/f725-ws1b-shell`, 30.09.2026): Der Schnellzugriff entfällt; „+“ neben der Projektauswahl im Kopf öffnet das Anlegeformular (F41) in der Projekte-Übersicht. Beleg `features/F44/nachweise/ws1b/bedienung` (Schritt „Klick „+““: Anlegeformular sichtbar).
Feature/Run: Challenger-Dokument 474 (F-725), 30.09.2026.

**F-863** · `PROCESS_IMPROVEMENT` · P3 · behoben auf Branch
Titel: Eine Designvorlage trägt den Funktionsstand ihres Briefings.
Beschreibung: Die Vorlage V10 beruht auf dem Briefing vom 26.09.2026 und zeigt F36 (Katalog-Empfehlung, Installation, Beobachtung) und F43 (Projekt aufrufen) als „In Entwicklung“, obwohl beides auf `main` läuft. Wer die Vorlage wörtlich übernimmt, baut gebaute Funktionen als Platzhalter.
Fundstelle: `docs/design/vorlage-v10/START-HERE-CLAUDE.md`; `docs/design/abgleich-f725.md` §1 und V\*-Zeilen der Tabelle.
Auswirkung: Niedrig — mit dem Abgleich erkannt, ohne ihn Funktionsverlust im Produkt.
Maßnahme: Die Checkliste des design-guardian verlangt vor der Übernahme einen Abgleich gegen `main` (`.claude/agents/design-guardian.md`, Punkt 1 und Regeln; angelegt in F44 WS-0).
Status: behoben auf Branch (30.09.2026, Branch `feat/f725-ws0-design-ablage`, F44 WS-0): Checklistenpunkt 1 und die letzte Regel in `.claude/agents/design-guardian.md`.
Feature/Run: Challenger-Dokument 474 (F-725), 30.09.2026.

**F-865** · `BUG` · P3 · erledigt
Titel: In der Vorlage V10 liegt die Sidebar-Illustration unter „Alle Produkte“, „Nutzung“ und „Einstellungen“.
Beschreibung: Bei 1440×1000 überdeckt die Sidebar-Illustration (`gear.png`) die Einträge „Alle Produkte“, „Nutzung“ und „Einstellungen“; der Kontrast der Einträge leidet. In WS-0 bestätigt (`docs/design/vorlage-v10/screens/d_uebersicht.png`, `l_arbeit_board.png`).
Fundstelle: Vorlage V10, `docs/design/vorlage-v10/style.css` (`.side-art`); Referenz-Screenshots.
Auswirkung: Niedrig — Lesbarkeit der unteren Sidebar-Einträge.
Maßnahme: In F44 WS-1 den Kontrast durch den design-guardian prüfen lassen und minimal korrigieren, ohne neue Gestaltung.
Status: erledigt (F44 WS-1b, Branch `feat/f725-ws1b-shell`, 30.09.2026): Der design-guardian fand zwei Mängel — die Illustration wanderte bei geringer Fensterhöhe über die Hauptnavigation, und über ihren Linien fiel der Kontrast der Einträge auf etwa 2,3:1 (dunkel) bzw. 1,4–2,5:1 (hell, geschätzt). Minimal korrigiert nach seinem Vorschlag, ohne neue Farbe: Illustration am unteren Block verankert (`.side-bottom .side-art`, `.side-bottom { flex-shrink: 0 }`), Schein in der Sidebar-Farbe hinter Text und Symbolen (`text-shadow`/`drop-shadow` mit `--sidebar-bg`). Beleg `features/F44/nachweise/ws1b/sidebar-1024x800`, `sidebar-1366x768`, `sidebar-1440-zoom200` (je dunkel und hell, Sidebar ans Ende gescrollt), `dunkel-1440`, `hell-1440`. Kein zweiter Guardian-Pass (eine Korrekturrunde, F-876).
Feature/Run: Challenger-Dokument 474 (F-725), 30.09.2026.

**F-867** · `HARNESS_IMPROVEMENT` · P2 · erledigt
Titel: `render-nachweis` kann Theme, reduzierte Bewegung und Zoom nicht setzen, die der design-guardian verlangt.
Beschreibung: Der design-guardian (Punkt 9) und F44 (Pro UI-Paket, AK5) verlangen Render-Nachweise hell und dunkel, mit reduzierter Bewegung und bei 200 % Zoom. `scripts/render-nachweis.mjs` setzt nur den Viewport und kann localStorage-Einträge entfernen, aber keine setzen (Theme). `reducedMotion`, `colorScheme` und Zoom fehlen.
Fundstelle: `scripts/render-nachweis.mjs` (Klickfolge-Format, Browser-Kontext); `.claude/agents/design-guardian.md` Punkt 9; `features/F44/feature.md` (Scope, AK5).
Auswirkung: Mittel — ohne Erweiterung endet jede Designprüfung der UI-Pakete mit „Nicht freigegeben“, oder Nachweise entstehen mit eigenen Ad-hoc-Skripten.
Maßnahme: In F44 WS-1 das Klickfolge-Format um `localStorageSetzen`, `reducedMotion`, `colorScheme` und `zoom` (bzw. `deviceScaleFactor` mit schmalerem Viewport) erweitern; Muster `docs/design/vorlage-v10/erzeuge-screens.mjs`.
Status: erledigt (F44 WS-1a, Branch `feat/f725-ws1a-fundament`, 30.09.2026): neue Optionen `farbschema` (localStorage `leitstand-theme`), `reduzierteBewegung` (`page.emulateMedia({ reducedMotion })`), `zoom` (Viewport geteilt durch Zoom, `deviceScaleFactor` = Zoom), `localStorageSetzen`, `screenshotVollseite`, WebP-Ausgabe über den Browser, Schritte `navigiere` und `auswaehlen`, Beobachtung `texte`; Doku im Dateikopf von `scripts/render-nachweis.mjs`. Beleg: `features/F44/nachweise/ws1a/` (Theme, 390/1440, 200 % Zoom, reduzierte Bewegung, ru/tr).
Feature/Run: Code-Review und QA-Pass F44 WS-0, 30.09.2026.

**F-873** · `BUG` · P3 · erledigt
Titel: Der Hinweis-Kasten der Einstellungen beschreibt Fragezeichen-Hinweise, die es noch nicht gibt.
Beschreibung: Die Seite `#/einstellungen` übernimmt nach Auftrag den Hinweis-Kasten der Vorlage („Hinweise öffnen sich nach kurzem Verweilen auf einem Fragezeichen …“). Den Mechanismus dazu (`.help`/Tooltip der Vorlage) hat der Leitstand noch nicht; der Text verspricht damit eine Funktion, die fehlt. Gefunden von design-guardian, code-reviewer und qa (F44 WS-1a).
Fundstelle: `public/leitstand/i18n/de.js` (`einstellungen.hinweis`, ebenso en/tr/ru); `public/leitstand/views/einstellungen.js`.
Auswirkung: Niedrig — irreführender Text, keine Fehlfunktion.
Maßnahme: Den Kasten mit dem Paket ausliefern, das die Fragezeichen-Hinweise baut, oder bis dahin ausblenden — Entscheidung Stefan. Die Schlüssel bleiben.
Status: erledigt (F44 WS-1b, Branch `feat/f725-ws1b-shell`, 30.09.2026): Kasten ausgeblendet (Auftrag WS-1b, Punkt 8), dazu der Schlüssel `einstellungen.hinweis` in de/en/tr/ru entfernt, weil ihn kein t()-Aufruf mehr nutzt; er kommt mit dem Paket der Fragezeichen-Hinweise wieder.
Feature/Run: Prüfpass F44 WS-1a, 30.09.2026.

**F-874** · `BUG` · P2 · erledigt
Titel: Das Workflow-Detail pollt nach einem Projektwechsel die workflowId des alten Projekts weiter.
Beschreibung: `views/workflows.js` hat keinen Abonnenten von `abonniereProjektWechsel`. Ist beim Wechsel ein Workflow-Detail offen, fragt sein Detail-Auffrischer die workflowId des alten Projekts über den Präfix des neuen ab — bei jedem Tick ein 404 (Fehlerklasse F26 im Chat). Eine angefangene Pflichtbegründung im Freigabedialog gehört ebenfalls zum alten Projekt. Keine Regression von F44 WS-1a; gefunden im QA-Pass WS-1a.
Fundstelle: `public/leitstand/views/workflows.js` (Detail-Auffrischer, `schliesseWorkflowDetail` nur bei `#/runs` bzw. Schließen-Knopf).
Auswirkung: Mittel — Dauer-404 im Hintergrund, Detail zeigt Stand des alten Projekts.
Maßnahme: In F44 WS-4 (Ablauf & Abnahme) `abonniereProjektWechsel` ergänzen: Detail schließen, Bedienung verwerfen; Verhalten bei angefangener Begründung festlegen.
Status: erledigt (F44 WS-4a, 01.10.2026): `views/workflows.js` abonniert `abonniereProjektWechsel` (verwirfNachProjektWechsel). Beim Wechsel schließen Dialog und Detail ohne Wirkung, Bedienzustand und ein offener Reparaturentwurf werden verworfen, der Detail-Auffrischer fragt den alten Workflow nicht mehr ab, und ein Hash `#/workflows/<id>` geht ohne neuen History-Eintrag auf `#/runs`. Eine angefangene Begründung wird dabei verworfen (Entscheidung zu offenen Eingaben: F-885, offen). Test `projekt-wechsel.test.mjs` (Rotfall belegt).
Feature/Run: QA-Pass F44 WS-1a, 30.09.2026.

**F-878** · `BUG` · P3 · erledigt
Titel: Der Status-Chip der Persona überdeckt den Namen in der Nutzerkarte (NEU-J).
Beschreibung: Im Zustand error (und bei 200 % Zoom) lag der Chip `#persona-text-status` über dem Namen „Stefan“ der Nutzerkarte im Kopf. Gefunden im Prüfpass WS-1a (Prüfpunkt für Folgepakete).
Fundstelle: `public/leitstand/style.css` (`.nutzerkarte-status-chip-host`, Stand `1f9ddb2`).
Auswirkung: Niedrig — Lesbarkeit.
Maßnahme: Mit F44 WS-1b erledigt: Die Nutzerkarte samt Chip entfällt; die Statuszeile steht als #persona-text-status neben dem Persona-Knopf im Kopf (Render-Nachweis `features/F44/nachweise/ws1b/`).
Status: erledigt (F44 WS-1b, Branch `feat/f725-ws1b-shell`, 30.09.2026).
Feature/Run: Challenger F44 WS-1b, 30.09.2026.

**F-880** · `TECH_DEBT` · P3 · erledigt
Titel: `#/roadmap` und `#/nutzung` sind bis WS-2/WS-6 Zwischenseiten.
Beschreibung: Die Sidebar V10 führt Roadmap und Nutzung als eigene Seiten. Die Daten gibt es (Roadmap-Karte im Workboard, Verbrauch im Dashboard); bis zum Umbau zeigen die neuen Routen nur Titel, einen Satz und einen Link zur heutigen Stelle — ohne „kommt“, weil nichts Zukünftiges fehlt.
Fundstelle: `public/leitstand/views/platzhalter.js` (`zwischenseite`).
Auswirkung: Niedrig — ein Klick mehr bis zu den Daten.
Maßnahme: In WS-2 (Roadmap, D1–D4) bzw. WS-6 (Nutzung, I1–I3) die Seiten mit den echten Ansichten füllen und die Karten an der alten Stelle entfernen.
Status: erledigt — Roadmap-Teil F44 WS-2a (`#/roadmap` ist die echte Seite `public/leitstand/views/roadmap.js`; die Bento-Karte im Workboard entfernt WS-3, F-892); Nutzungs-Teil F44 WS-2b, Branch `feat/f725-ws2b-uebersicht`, 01.10.2026: `#/nutzung` zeigt den Verbrauch (`public/leitstand/views/nutzung.js`, Logik und Markup unverändert aus der Übersicht), die Zwischenseite in `views/platzhalter.js` ist entfernt. Der Umbau der Nutzungsseite nach Vorlage bleibt WS-6.
Feature/Run: F44 WS-1b, 30.09.2026.

**F-884** · `TECH_DEBT` · P3 · **erledigt**
Titel: „Frag Jarvis“ wirkt ab 1280 px nicht sichtbar.
Beschreibung: Ab 1280 px ist die Chatspalte immer sichtbar (`#shell-chat-spalte[hidden]` mit display, F29 WS-1a). Der Knopf „Frag Jarvis“ (#chat-umschalter) schaltet dort nur die gespeicherte Vorliebe und aria-pressed, das dann `false` zeigt, obwohl die Spalte sichtbar ist. Altbestand des Umschalters, mit WS-1b in den Kopf gezogen.
Fundstelle: `public/leitstand/style.css` (`@media (min-width: 1280px)`), `public/leitstand/shell.js` (wendeChatSichtbarkeitAn).
Auswirkung: Niedrig — Knopf ohne sichtbare Wirkung, aria-pressed widerspricht der Anzeige.
Maßnahme: Mit dem Chat-Dock in WS-8 auflösen (Blase statt Spalte); bis dahin unverändert.
Status: erledigt (F44 WS-8a, 02.10.2026): die Regel `@media (min-width: 1280px)` für `#shell-chat-spalte[hidden]` ist entfallen; #chat-umschalter und #chat-blase steuern dasselbe Chat-Dock und tragen `aria-expanded` statt `aria-pressed` (`public/leitstand/shell.js` wendeChatSichtbarkeitAn), Nachweis `features/F44/nachweise/ws8a/klicks/`.
Feature/Run: QA-Pass F44 WS-1b, 30.09.2026.

**F-889** · `PROCESS_IMPROVEMENT` · P3 · erledigt
Titel: Verhalten des leeren Hashs ist nicht entschieden.
Beschreibung: Der Abgleich (§4 Punkt 3) sagt „der leere Hash führt nach #/start“. Umgesetzt ist (unverändert seit F29): Nur der erste leere Hash einer Sitzung führt dorthin, jeder weitere auf #/dashboard (router.js STANDARD_HASH). Prüfpunkt aus WS-0 („Verhalten beim zweiten leeren Hash festlegen“) offen.
Fundstelle: `public/leitstand/views/start.js` (leiteBeimStartEin), `public/leitstand/router.js` (STANDARD_HASH); `features/F44/feature.md` (Prüfpunkte).
Auswirkung: Niedrig — Einstieg nach Neuladen ohne Hash.
Maßnahme: Entscheidung Stefan: Einmal-pro-Sitzung beibehalten oder leerer Hash immer #/start.
Status: erledigt (Entscheidung Challenger, 01.10.2026): Der leere Hash führt nur beim ersten Laden einer Sitzung zur Startfläche, danach zur Übersicht — das umgesetzte Verhalten bleibt; keine Codeänderung.
Feature/Run: design-guardian F44 WS-1b, 30.09.2026.

**F-891** · `BUG` · P3 · erledigt
Titel: Hell-Theme: .side-art überdeckt die Symbole der unteren Sidebar-Einträge.
Beschreibung: Im hellen Theme lag der dunkle Kern der Illustration (`assets/gear.webp`, Filter contrast/brightness wie die Vorlage) genau hinter den Symbolen von Alle Produkte, Nutzung und Einstellungen; die Symbole waren kaum lesbar. Im dunklen Theme unauffällig.
Fundstelle: `public/leitstand/style.css` (`.side-bottom .side-art`, `:root[data-theme='light'] .side-art`, Stand `71ff28b`).
Auswirkung: Niedrig — Lesbarkeit der unteren Navigation im hellen Theme.
Maßnahme: Filter, Deckkraft und waagerechter Anker der Illustration als Tokens (`--side-art-filter`, `--side-art-deckkraft`, `--side-art-links`); der Hell-Block setzt Filter und Deckkraft wie die Vorlage und verschiebt den Anker um 44 px nach links, so dass der Kern links neben den Symbolen liegt. Dunkel unverändert.
Status: erledigt (F44 WS-2a, Branch `feat/f725-ws2a-entscheidungen-roadmap`, 01.10.2026; Nachweis `features/F44/nachweise/ws2a/sidebar-hell-1440/`, hell und dunkel im Vergleich).
Feature/Run: Entdeckt in der Verifikation F44 WS-1b, 30.09.2026.

**F-892** · `TECH_DEBT` · P3 · erledigt
Titel: Roadmap doppelt dargestellt bis WS-3.
Beschreibung: Seit WS-2a zeigt `#/roadmap` die Roadmap mit den Regeln aus `roadmap-anzeige.js` (aktueller Meilenstein: erster mit LAEUFT, sonst erster nicht abgeschlossener). Die Bento-Karte in `views/workboard.js` zeigt dieselben Daten weiter mit abweichender Regel (hervorgehoben nur ein Meilenstein mit LAEUFT).
Fundstelle: `public/leitstand/views/workboard.js` (bentoRoadmapKarte), `public/leitstand/roadmap-anzeige.js`.
Auswirkung: Niedrig — zwei Darstellungen können beim aktuellen Meilenstein auseinanderlaufen.
Maßnahme: WS-3 entfernt die Bento-Karte.
Status: erledigt (F44 WS-3a, Branch `feat/f725-ws3a-board`, 01.10.2026): Das ganze Bento ist entfernt — Karten, Funktionen, CSS, Fokus- und Rollen-Cache; die Roadmap steht nur noch auf `#/roadmap` und in der Übersicht, beide nach `roadmap-anzeige.js`. Die von `views/projekte-uebersicht.js` mitgenutzten Kartenregeln (`bento-fokus-*`, `bento-meta-*`) bleiben bis WS-6.
Feature/Run: F44 WS-2a, 01.10.2026.

**F-895** · `TECH_DEBT` · P3 · erledigt
Titel: „Noch nicht eingeplant“ zeigt auch abgeschlossene Features und IDs, die die Roadmap nie aufnehmen kann.
Beschreibung: `nichtEingeplant` nimmt alle Workitems mit typ FEATURE, die in keinem Meilenstein stehen — auch abgeschlossene und abgebrochene, und Akten wie `AF-F001`, deren ID die Roadmap-Regel (`^F[0-9]+[A-Za-z]?$`) nie zulässt; sie stehen dort dauerhaft. D3 ist im Abgleich als Schlussfolgerung markiert, das Verhalten war nicht festgelegt. Gefunden von qa.
Fundstelle: `public/leitstand/roadmap-anzeige.js` (nichtEingeplant), `public/leitstand/views/roadmap.js` (nichtEingeplantAbschnitt).
Auswirkung: Niedrig — die Liste enthält Einträge, die keine Planungsentscheidung brauchen.
Maßnahme: Festlegen (Stefan): nur offene Features, IDs nach Roadmap-Regel; dann Filter in `nichtEingeplant` mit Test.
Status: erledigt (F44 WS-2b, Branch `feat/f725-ws2b-uebersicht`, 01.10.2026): `nichtEingeplant` nimmt nur Features, deren Status weder ABGESCHLOSSEN noch ABGEBROCHEN ist und deren ID `^F[0-9]+[A-Za-z]?$` entspricht; Test `roadmap-anzeige.test.mjs`. Entschieden vom Challenger, reversibel.
Feature/Run: QA-Pass F44 WS-2a, 01.10.2026.

**F-896** · `HARNESS_IMPROVEMENT` · P3 · erledigt
Titel: Gate f21-ws2 (e) prüft eine wörtliche Importzeile statt der Herkunft der Filterregel.
Beschreibung: `views/attention.js` muss die Zeile `import { filtereAttentionLaeufe, filtereAttentionWorkflows, holeOffeneP0P1Workitems } from '../attention-daten.js'` wörtlich tragen, obwohl es seit WS-2a nur noch `baueEntscheidungen` und `holeOffeneP0P1Workitems` nutzt; die beiden Filter sind ungenutzte Importe (Biome prüft ungenutzte Importe nicht). Die Invariante — dieselbe Filterquelle wie die Übersicht, keine eigene Auswahl — ließe sich über „importiert aus attention-daten.js“ plus das bestehende Selektionsmuster prüfen. Dazu: Überholschutz und Escaping der Views sind nur über Nachweise und den Wechsel-Test belegt, nicht einzeln getestet. Gefunden von code-reviewer und qa.
Fundstelle: `scripts/check-f21-ws2-workboard-oberflaeche.mjs` (e), `public/leitstand/views/attention.js` (Importe).
Auswirkung: Niedrig — toter Import, das Gate bindet an eine Schreibweise.
Maßnahme: In WS-2b (dashboard.js zieht ebenfalls auf baueEntscheidungen um) Gate (e) auf die Herkunft umstellen, Begründung im Gate-Kopf; die ungenutzten Importe entfernen.
Status: erledigt (F44 WS-2b, Branch `feat/f725-ws2b-uebersicht`, 01.10.2026): Gate (e) prüft, dass `views/attention.js` und `views/dashboard.js` aus `'../attention-daten.js'` importieren (IMPORT_MUSTER); SELEKTIONS_MUSTER bleibt; Rot-Kalibrierung (e-kal) im Gate; Begründung im Gate-Kopf; ungenutzte Importe in `attention.js` entfernt. Überholschutz und Escaping einzeln testen bleibt offen (siehe F-901).
Feature/Run: Prüfpass F44 WS-2a, 01.10.2026.

**F-897** · `TECH_DEBT` · P3 · erledigt
Titel: „Eintrag erfassen“ ohne das „+“-Symbol der Vorlage.
Beschreibung: Die Vorlage zeigt vor „Eintrag erfassen“ ein „+“ (`d_projekt_ai-workforce_roadmap.png`); `kommtKnopf` gibt nur Text und Badge aus. Gefunden vom design-guardian.
Fundstelle: `public/leitstand/kommt.js` (kommtKnopf), `public/leitstand/views/roadmap.js` (seitenkopf).
Auswirkung: Niedrig — Optik.
Maßnahme: `kommtKnopf` um ein optionales dekoratives Symbol (aria-hidden) erweitern, sobald ein zweiter Aufrufer es braucht (WS-2b „Eintrag erfassen“ in der Übersicht).
Status: erledigt (F44 WS-2b, Branch `feat/f725-ws2b-uebersicht`, 01.10.2026): `kommtKnopf(text, { symbol })` setzt ein dekoratives Zeichen (aria-hidden) vor den Text; „+ Eintrag erfassen“ auf `#/roadmap` und in der Übersicht.
Feature/Run: design-guardian F44 WS-2a, 01.10.2026.

**F-898** · `TECH_DEBT` · P3 · erledigt
Titel: Deine Entscheidungen ohne Begrenzung.
Beschreibung: `#/attention` zeigte jede Gruppe vollständig. Mit echten Daten sind das 81 Einträge (6 + 26 + 49); die Befunde dominieren die Liste, Freigaben und Rückfragen rutschen optisch aus dem Blick.
Fundstelle: `public/leitstand/views/attention.js` (renderGruppe).
Auswirkung: Niedrig — lange Liste, das Wichtigste bleibt zwar oben, der Rest überwiegt.
Maßnahme: Freigaben und Rückfragen immer vollständig; Läufe, Startprobleme und Befunde je höchstens 5 Einträge mit einem Knopf „+ x weitere“ (aria-expanded), der die Gruppe aufklappt. Die Zähler der vier Quellen bleiben Gesamtzahlen.
Status: erledigt (F44 WS-2b, Branch `feat/f725-ws2b-uebersicht`, 01.10.2026; Nachweis `features/F44/nachweise/ws2b/attention-weitere-1440/`).
Feature/Run: Challenger-Verifikation F44 WS-2a, 01.10.2026.

**F-903** · `BUG` · P2 · erledigt
Titel: Der Leerzustand B14 kann wartende Entscheidungen eines neuen Produkts verdecken.
Beschreibung: B14 gilt nach Vorgabe bei leeren Workitems und Roadmap `nicht_vorhanden`; das Aggregat zählt nicht mit. Folgt Stefan dem geführten Schritt („Auftrag beschreiben“ → Ablauf prüfen → Freigeben), entsteht ein Workflow mit wartender Freigabe, aber kein Workitem — die Übersicht zeigt weiter „Beschreibe die erste Funktion.“ und blendet B7 und B8 aus. Der Nachweis `dashboard-leer` (feste Antworten) zeigt B14 neben „Workflows 19“.
Fundstelle: `public/leitstand/views/dashboard.js` (istLeeresProdukt).
Auswirkung: Mittel — eine Freigabe ist auf der Übersicht nicht sichtbar (in `#/attention` und im Kopf-Status schon).
Maßnahme: Entscheidung Stefan: B14 nur, wenn zusätzlich keine Workflows vorhanden sind, oder B7 auch im Leerzustand zeigen.
Status: erledigt (F44 WS-2b, Branch `feat/f725-ws2b-uebersicht`, Entscheidung Challenger 01.10.2026): B14 gilt nur, wenn keine Workitems, Roadmap `nicht_vorhanden` und `zustand.workflows` ein leeres Array ist; defekte (null) oder vorhandene Workflows zeigen die normalen Blöcke. Tests `projekt-wechsel.test.mjs` (wartender Workflow, defekte Quelle; Rot unter Mutation geprüft), Nachweis `features/F44/nachweise/ws2b/dashboard-b14-wartender-workflow/`.
Feature/Run: Prüfpass F44 WS-2b, 01.10.2026 (qa).

**F-904** · `TECH_DEBT` · P3 · erledigt
Titel: B5 „Geplant“ und die Statuskategorie derselben Seite widersprechen sich bei WORKSTREAM_SCHNITT_GENEHMIGT und GEPLANT.
Beschreibung: Nach Vorgabe WS-2b zählt „Geplant“ ENTWURF, READY_FOR_TECH und WORKSTREAM_SCHNITT_GENEHMIGT (`zaehleGeplant`). `statusKategorie` zeigt WORKSTREAM_SCHNITT_GENEHMIGT in B9/B10 aber als „in Arbeit“ (↻) und GEPLANT als „geplant“, ohne dass GEPLANT gezählt wird.
Fundstelle: `public/leitstand/roadmap-anzeige.js` (GEPLANT_STATUS, KATEGORIE_JE_STATUS).
Auswirkung: Niedrig — ein Feature steht oben als „noch nicht gestartet“ und darunter als „in Arbeit“.
Maßnahme: Entscheidung Stefan: eine gemeinsame Regel (z. B. „Geplant“ = Kategorie geplant) und dann eine Quelle für beide.
Status: erledigt (F44 WS-2b, Branch `feat/f725-ws2b-uebersicht`, Entscheidung Challenger 01.10.2026): `zaehleGeplant` zählt nur ENTWURF und READY_FOR_TECH; WORKSTREAM_SCHNITT_GENEHMIGT zählt wie in den Zeilen als „in Arbeit“. Test `roadmap-anzeige.test.mjs`.
Feature/Run: Prüfpass F44 WS-2b, 01.10.2026 (code-reviewer, qa).

**F-905** · `TECH_DEBT` · P3 · erledigt
Titel: Übersicht weicht bei B9/B10 und der Reihenfolge von der Vorlage ab (Vorgabe WS-2b).
Beschreibung: Nach Auftrag zeigen B9 nur den aktuellen Meilenstein und B10 dessen Features mit „ohne Priorität“ (kommt), in der Reihenfolge Weg → Wer macht was → Entwicklungsstand. Die Vorlage zeigt in B9 alle Meilensteine, in B10 die offenen Einträge aller Typen (höchstens vier) mit echter Priorität der Findings und „Bereits erledigt“ in einer Zeile, und die Reihenfolge Weg → Entwicklungsstand → Wer macht was (Abgleich §3 B10, §4 Punkt 4). Folge: dieselben Features stehen in B9 und B10 untereinander.
Fundstelle: `public/leitstand/views/dashboard.js` (wegBlock, standBlock, geruest); `docs/design/vorlage-v10/screens/d_uebersicht.png`.
Auswirkung: Niedrig — doppelte Liste, Findings mit Priorität fehlen auf der Übersicht.
Maßnahme: Entscheidung Stefan, ob B10 nach Vorlage (Workitems, echte Priorität lesend) und B9 mit allen Meilensteinen umgebaut wird; dann in WS-3 zusammen mit dem Board.
Status: erledigt (F44 WS-2b, Branch `feat/f725-ws2b-uebersicht`, Entscheidung Challenger 01.10.2026; die Vorgabe des Auftrags war falsch, jetzt nach Vorlage): B9 zeigt alle Meilensteine als kompakte Zeilen (Titel, Status, „x / y abgenommen“, aktueller hervorgehoben, keine Featurezeilen); B10 zeigt offene P0–P2-Findings und offene Features des aktuellen Meilensteins, höchstens acht, P0 → P1 → P2 → Features, Priorität lesend als „kommt“ (reine Funktion `waehleEntwicklungsstand` in `roadmap-anzeige.js` mit Unit-Test); Reihenfolge B10 vor B11. Nachweise `features/F44/nachweise/ws2b/dashboard-*` neu.
Feature/Run: Prüfpass F44 WS-2b, 01.10.2026 (design-guardian).

**F-909** · `PROCESS_IMPROVEMENT` · P2 · erledigt
Titel: Workforce-Planungskette ohne Plan v2 und ohne Rückweg nach dem Advisor-Urteil.
Beschreibung: In `workflow-vorlagen/hoch.json` bekommt die Ausführung Plan v1 und das Advisor-Urteil als Eingabe und arbeitet beides selbst ein. Der Advisor hat `output_schema` null. Einen Replan-Pfad gibt es nicht (`max_replans` ohne Leser, F-203). `standard` und `fast-lane` haben weder Architekt noch Advisor.
Fundstelle: `workflow-vorlagen/hoch.json`, `src/workflow/index.ts`, `.claude/skills/advisor-pass/SKILL.md`.
Auswirkung: Der Bauende prüft das Urteil faktisch selbst.
Maßnahme: Fixpaket Arbeitsfähigkeit, B2.
Status: offen — B2b-1 wurde nach dem Advisor-Pass geteilt (Stefan, 14.10.2026): die Rückweg-Regel (`pruefeRueckweg`, max_replans) steht mit B2b-1a; Advisor-Schema, Plan v2 und Ausführung nur mit dem letzten Plan folgen mit B2b-1b (`features/F45/plan-b2b1.md`). Nachtrag 14.10.2026: B2b-1b erneut geteilt (Stefan nach dem Advisor-Pass, `features/F45/plan-b2b1b.md`). B2b-1b-1 erledigt: der Advisor hat ein Ausgabeschema (`schemas/ergebnis-architecture-advisor.schema.json`, an claude-code per `--json-schema` durchgesetzt, F-1105), Regel 1d hält bei Schemaverstoß. Offen mit B2b-1b-2: Plan v2 (Rückweg der Plan-Stufe), Ausführung nur mit dem letzten Plan — bis dahin bekommt die Ausführung weiterhin Plan v1 und das (jetzt strukturierte) Advisor-Ergebnis, und jedes gültige Urteil geht zur ZWINGEND-Freigabe der Ausführung.
Nachtrag: erledigt (F45 B2b-1b-2a, 14.10.2026, `features/F45/plan-b2b1b2.md`; B2b-1b-2 nach dem Advisor-Pass geteilt in 2a Kern / 2b Anzeige, Stefan). Bei FREIGEGEBEN_MIT_AUFLAGEN/UEBERARBEITEN schreibt der Architekt einmal Plan v2 mit Plan v1, allen Befunden und Stefans Antworten (im selben Schreibvorgang wie der Advisor-Ausgang, `ermittlePlanRueckweg`/`baueSchritteFuerPlanRueckweg`, Schrittfeld `rueckweg`); die Runde zählt in `max_replans` (Summe Plan + Bau); nach Plan v2 läuft kein zweiter Advisor (Regel 3a, nur über genau den Anlass-Lauf); die Ausführung bekommt nur den letzten Plan und die zusammengeführten Entscheidungen (`hoch.json`, B13 für Bestand); Plan v2 stellt nur neue Fragen, die Stack-Frage bei offenem Stack wortgleich (H1, `offeneArchitekturFragen`). Gate `check-f45-b2b1-rueckweg` (c)(c2)(c3)(c7)+D1(c9)(c10)(c10b)(c11)(c12)(c13)(c14)(d). Anzeige von Plan und Befunden auf der Freigabe-Seite: F-1106 (2b).
Feature/Run: Entdeckt: Challenger, Fragen Stefan 01.10.2026.

**F-913** · `BUG` · P3 · erledigt
Titel: „Aktuelle Rolle“ (B3) und „Deine nächsten Entscheidungen“ (B7) priorisierten verschieden.
Beschreibung: `waehleFokusWorkflow` nahm den ersten wartenden Workflow in Quellreihenfolge, `baueEntscheidungen` stellt Freigaben vor Rückfragen. Stand eine Rückfrage vor einer Freigabe im Aggregat, zeigte B3 die Rückfrage, B7 an erster Stelle die Freigabe.
Fundstelle: `public/leitstand/fokus-daten.js` (waehleFokusWorkflow), `public/leitstand/attention-daten.js` (baueEntscheidungen).
Auswirkung: Niedrig — zwei Blöcke derselben Seite nannten verschiedene „nächste“ Aufgaben.
Maßnahme: Fokuswahl folgt baueEntscheidungen (Freigabe vor Rückfrage).
Status: erledigt (F44 WS-3a, Branch `feat/f725-ws3a-board`, 01.10.2026): `waehleFokusWorkflow` nimmt den ersten Workflow-Eintrag aus `baueEntscheidungen`; Test `fokus-daten.test.mjs` (F-913, gegen die alte Fassung rot).
Feature/Run: Entdeckt: Verifikation F44 WS-2b.

**F-914** · `TECH_DEBT` · P3 · erledigt
Titel: B11 „Wer macht was“ zeigt Rollen-IDs statt lesbarer Namen.
Beschreibung: Die Übersicht zeigt in „Wer macht was“ die Rollen-ID (z. B. `ausfuehrung`) statt eines lesbaren, übersetzten Rollennamens.
Fundstelle: `public/leitstand/views/dashboard.js` (B11).
Auswirkung: Niedrig — technischer Bezeichner statt Klartext.
Maßnahme: Rollennamen über t(), wie die frühere rollenAnzeige im Workboard.
Status: erledigt (F44 WS-3b, Branch `feat/f725-ws3b-detail`, 01.10.2026): neues Modul `public/leitstand/rollen-anzeige.js` — `rollenName(rolle)` übersetzt über `rolle.<id>` genau die neun Rollen aus `ROLLENVERTRAEGE` (`src/rollen/index.ts`; `rollen-anzeige.test.mjs` prüft die Gleichheit und die Schlüssel in de/en/tr/ru), eine unbekannte Rolle bleibt die ID. Genutzt in B3/B11 (`views/dashboard.js`, gemeinsame Spalte `werSpalte`), im Detail der Entwicklung und in der Click-to-Work-Kette.
Feature/Run: Entdeckt: Verifikation F44 WS-2b.

**F-920** · `TECH_DEBT` · P3 · erledigt
Titel: Projektwechsel lädt die Seite „Entwicklung“ auch, wenn sie nicht offen ist.
Beschreibung: Der Neuladen-Hook (F-860) lädt Workitems und Aufträge der Entwicklung bei jedem Projektwechsel; ist die Seite nicht offen, lädt das nächste Betreten sie ein zweites Mal.
Fundstelle: `public/leitstand/views/workboard.js` (ladeNachProjektWechsel, betreteSeite).
Auswirkung: Niedrig — ein überflüssiger Abruf je Wechsel.
Maßnahme: Bei geschlossener Seite nur den Zustand zurücksetzen und `projekt-wechsel.test.mjs` auf „lädt beim nächsten Betreten“ umstellen; der Auftrag WS-3a verlangte das Laden beim Wechsel ausdrücklich.
Status: erledigt (F44 WS-3b, 01.10.2026): `ladeNachProjektWechsel` setzt bei geschlossener Seite nur zurück (Workitems und Aufträge „lädt“, Überholschutz-Zähler erhöht) und lädt bei offener Seite sofort; Test „F-920“ in `projekt-wechsel.test.mjs` (offen: lädt; verlassen: lädt nicht; erneutes Betreten: lädt).
Feature/Run: Entdeckt: Prüfpass F44 WS-3a (code-reviewer), 01.10.2026.

**F-921** · `TECH_DEBT` · P3 · erledigt
Titel: Board-Karte ohne Rolle und Fortschritt der Vorlage; Detail zeigt beim Deep-Link kurz „nicht gefunden“.
Beschreibung: Die Karte der Vorlage zeigt Phase, zuständige Rolle und bei laufender Arbeit „x/y Schritte abgeschlossen“; WS-3a zeigt Status und ID. Ein Deep-Link auf `#/workboard/<id>` zeigt, bis die Workitems geladen sind, „Workitem nicht in der aktuell geladenen Liste gefunden — Filter zurücksetzen oder neu laden.“ statt eines Ladezustands.
Fundstelle: `public/leitstand/views/workboard.js` (boardKarte, renderDetailInhalt).
Auswirkung: Niedrig.
Maßnahme: WS-3b (Detail E8): Ladezustand im Detail, Rolle/Fortschritt auf der Karte aus dem verknüpften Workflow.
Status: erledigt (F44 WS-3b, 01.10.2026): Die Karte zeigt mit verknüpftem Ablauf dessen Phase aus dem Aggregat (`workflowPhase`, ohne Zusatzabruf; bewusst ohne x/y — die Schritte lädt erst das Detail), sonst den Status. Der Deep-Link zeigt bis zu den Workitems „Der Eintrag wird geladen …“ (Test in `projekt-wechsel.test.mjs`); x/y und Rollen stehen im Detail.
Feature/Run: Entdeckt: Prüfpass F44 WS-3a (design-guardian, qa), 01.10.2026.

**F-922** · `TECH_DEBT` · P2 · erledigt
Titel: „Auftrag vorbereiten“ kann einen zweiten Auftrag für denselben Eintrag anlegen.
Beschreibung: Zwei Wege führen zu einem zweiten Auftrag. (1) Wer während des Anlegens zu einem anderen Eintrag wechselt und zurückkehrt, sieht wieder „Auftrag vorbereiten“ — `ladeDetail` verwirft den Bearbeitungszustand des anderen Eintrags, `pruefeUndUebernimmZustand` übernimmt ihn nicht mehr (bekannte Lücke aus F22 AK5). (2) Ein Feature mit laufendem oder auf die Abnahme wartendem Ablauf bietet weiter „Auftrag vorbereiten“ an; `istFeatureBaubar` prüft nur den Akten-Status. WS-3b lässt den Knopf bei offener Abnahme nur zurücktreten (keine Primärform), das Verhalten ist laut Auftrag unverändert.
Fundstelle: `public/leitstand/views/workboard.js` (ladeDetail, pruefeUndUebernimmZustand, renderBearbeitungsAbschnitt, istFeatureBaubar).
Auswirkung: Mittel — ein verwaister zweiter Auftrag bzw. ein zweiter Bau neben einer offenen Abnahme.
Maßnahme: Stefan entscheidet: Einstieg sperren oder mit Rückfrage versehen, solange ein verknüpfter Ablauf nicht terminal ist oder eine Abnahme offen ist; den Bearbeitungszustand je Workitem halten statt nur für das offene Detail.
Status: erledigt (F44 WS-3b, Entscheidung Challenger 01.10.2026, reversibel): „Auftrag vorbereiten“ ist für Feature und Finding gesperrt (disabled, aria-disabled, Hinweis über i18n in de/en/tr/ru, Link „Ablauf öffnen“ auf `#/workflows/<id>`), solange ein verknüpfter Workflow nicht terminal ist (`laufenderWorkflow` in `entwicklung-daten.js` auf derselben Menge NICHT_TERMINALE_WORKFLOW_STATUS wie das Board) oder die Abnahme offen ist (dieselbe Angabe wie „Ergebnis prüfen“); solange die Verknüpfung noch lädt, ebenfalls gesperrt. Test in `projekt-wechsel.test.mjs` (gesperrt bei laufendem Ablauf, gesperrt bei offener Abnahme, frei bei terminalem Ablauf ohne offene Abnahme; ein Klick auf den gesperrten Knopf sendet nichts). Restlücke: Zwischen dem Anlegen des Auftrags und dem Erscheinen des Router-Workflows im Aggregat gibt es noch keinen verknüpften Workflow — wer in diesem Fenster wegnavigiert und zurückkehrt, sieht den Einstieg frei (Weg 1 der Beschreibung).
Feature/Run: Entdeckt: Prüfpass F44 WS-3b (qa), 01.10.2026.

**F-923** · `BUG` · P3 · erledigt
Titel: Nach einem Projektwechsel bleibt der Hash auf dem Detail des alten Projekts.
Beschreibung: Ist `#/workboard/<id>` offen und wechselt das Projekt, schließt der Neuladen-Hook das Detail und zeigt die Übersicht, der Hash bleibt aber `#/workboard/<id>`. Ein Neuladen (F5) öffnet dann das Detail derselben ID im neuen Projekt — gleiche IDs sind zwischen Projekten üblich.
Fundstelle: `public/leitstand/views/workboard.js` (ladeNachProjektWechsel).
Auswirkung: Niedrig — verwirrender Zustand nach Neuladen.
Maßnahme: Beim Wechsel mit offenem Detail den Hash ohne neuen History-Eintrag auf `#/workboard` setzen (history.replaceState plus dispatch) und `projekt-wechsel.test.mjs` ergänzen.
Status: erledigt (F44 WS-4a, 01.10.2026): `router.js` `ersetzeRoute` (history.replaceState plus dispatch); `views/workboard.js` ladeNachProjektWechsel setzt ein offenes `#/workboard/<id>` damit auf `#/workboard`, `views/workflows.js` ein offenes `#/workflows/<id>` auf `#/runs`. Der Wechsel über den Kopf tat das bereits (`shell.js` DETAIL_ROUTEN); die View-Hooks gelten für jeden Wechselweg. Tests in `projekt-wechsel.test.mjs`.
Feature/Run: Entdeckt: Prüfpass F44 WS-3b (qa), 01.10.2026.

**F-925** · `BUG` · P3 · erledigt
Titel: Eine kaputte Prozent-Kodierung im Hash wirft im Router.
Beschreibung: `dispatch` ruft `decodeURIComponent` ohne `try` auf; ein Deep-Link wie `#/workboard/%E0%A4%A` wirft einen URIError, die Seite bleibt im vorherigen Zustand. Älter als WS-3b, betrifft aber den neuen Deep-Link.
Fundstelle: `public/leitstand/router.js` (dispatch).
Auswirkung: Niedrig.
Maßnahme: Dekodierung abfangen und auf die Standardroute bzw. „nicht gefunden“ leiten; Test.
Status: erledigt (F44 WS-4a, 01.10.2026): `dispatch` dekodiert vor dem Umschalten der View; ein URIError führt ohne neuen History-Eintrag auf die Standardroute (`ersetzeRoute`), kein onEnter sieht den kaputten Wert. Test `router.test.mjs`.
Feature/Run: Entdeckt: Prüfpass F44 WS-3b (qa), 01.10.2026.

**F-926** · `TECH_DEBT` · P3 · erledigt
Titel: „← zurück“ im Detail legt einen History-Eintrag an; nach Browser-Zurück fehlt ein Fokusziel.
Beschreibung: Der Zurück-Knopf navigiert über `navigiere('#/workboard')`, das einen neuen Eintrag anlegt — Browser-Zurück öffnet danach das Detail wieder. Nach Browser-Zurück aus dem Detail setzt niemand den Fokus; er liegt auf der verborgenen Überschrift des Details. Die zuvor geöffnete Karte bekommt den Fokus nicht zurück.
Fundstelle: `public/leitstand/views/workboard.js` (initListenBedienung, Route `#/workboard`).
Auswirkung: Niedrig (Tastatur, Screenreader).
Maßnahme: Zurück über history.back(), wenn der vorige Eintrag die Übersicht war; beim Schließen den Fokus auf die Karte bzw. Zeile des Eintrags legen.
Status: offen, teilweise erledigt (F44 WS-4a, 01.10.2026; Kopfzeile „offen (teilweise erledigt)“, damit der Workitem-Parser den offenen Rest nicht als ERLEDIGT zählt): Für das Workflow-Detail geht „← Alle Aufträge“ per `history.back()` zurück, wenn der vorige Eintrag `#/runs` war, sonst per navigiere; danach (auch nach Browser-Zurück) liegt der Fokus auf der Zeile des Workflows. Offen bleibt der Workboard-Teil (`#/workboard/<id>`), nicht mitgebaut.
Status: erledigt (F44 WS-4b, 01.10.2026): Auch im Workboard-Detail geht „← <Register>“ per `history.back()` zurück, wenn der vorige Eintrag `#/workboard` war, sonst per navigiere; die Route `#/workboard` legt danach (auch nach Browser-Zurück) den Fokus auf die Karte bzw. Zeile des Eintrags (`data-id`), ohne sichtbare Karte auf die Seitenüberschrift. Render-Nachweis `features/F44/nachweise/ws4b/workboard-zurueck/`.
Feature/Run: Entdeckt: Prüfpass F44 WS-3b (qa), 01.10.2026.

**F-934** · `PROCESS_IMPROVEMENT` · P3 · erledigt
Titel: Abgleich §3/§5.1 vs. §9 widersprüchlich bei F7, F1 offen.
Beschreibung: `docs/design/abgleich-f725.md` §5.1 ordnete WS-4 „Abschnitt F vollständig, einschließlich … F7“ zu, §9 dagegen `d_ausfuehrung_failed` (G2–G9, F7) dem Paket WS-5; F1 (`d_auftrag_neu`) stand in §9 offen bei „WS-4 / WS-5“. Ohne Festlegung hätte WS-4a entweder F7 und F1 ungefragt mitgebaut oder stillschweigend ausgelassen.
Fundstelle: `docs/design/abgleich-f725.md` §3 (F1, F7), §5.1, §9.
Auswirkung: Niedrig — Zuschnittsunklarheit, keine Verhaltensänderung.
Maßnahme: Vermerk WS-4a in §5.1: WS-4 geteilt in WS-4a (F0, F2, F3, F3b, F4, F5, F10, F12) und WS-4b (F6, F8, F9, F13–F18); F7 und F1 gehen nach WS-5. Pakettabelle in `features/F44/feature.md` nachgezogen.
Status: erledigt durch den Vermerk WS-4a (F44 WS-4a, 01.10.2026).
Feature/Run: Auftrag Stefan F44 WS-4a, 01.10.2026.

**F-935** · `TECH_DEBT` · P3 · erledigt
Titel: `views/workflows.js` ist mit rund 1 500 Zeilen zu groß; `tx()` ist dreifach dupliziert.
Beschreibung: WS-4a hat das Rendern von Liste und Detailseite nach `views/workflow-detail.js` ausgelagert. In `views/workflows.js` liegen weiter Abnahme, Reparaturzug, Bedienung und die neue Dialogsteuerung (offenerDialog, laufendeDialogBedienung, geretteteBegruendung). Der Helfer `tx()` (escapter, übersetzter Text) steht gleich in `views/workflows.js`, `views/workflow-detail.js` und `views/workboard-detail.js`; `txHtml` liegt in `empfehlung-anzeige.js`.
Fundstelle: `public/leitstand/views/workflows.js`, `views/workflow-detail.js`, `views/workboard-detail.js`, `empfehlung-anzeige.js`.
Auswirkung: Niedrig — Wartbarkeit.
Maßnahme: In WS-4b (Abnahme und Reparatur werden ohnehin umgebaut) die Dialogsteuerung und die Abnahme in eigene Module schneiden; `tx`/`txHtml` einmal in `render.js` oder `i18n.js` anbieten. Gates f15/f23/f42 begründet mitziehen.
Status: erledigt (F44 WS-4b, 01.10.2026): Die Abnahme rendert `views/workflow-abnahme.js`, Notizen, Dialoginhalte (Freigabe, Stopp, Rückfrage, Sichtung), Reparatureditor sowie baueReparaturEntwurf, ermittleAbgeschwaechteFreigabenAnzeige und ermittleReparaturWarnungen `views/workflow-eingriffe.js` — beide rein (kein schreibender api.js-Import, in Node ohne DOM importierbar, eigene Tests). Bedienlogik, Kennzeichen, Dialogsteuerung und alle POSTs bleiben in `views/workflows.js` (unter 1 000 Zeilen). `tHtml` steht zentral in `i18n.js` und ersetzt die fünf lokalen `tx()` (dashboard, workboard, workboard-detail, workflow-detail, workflows) und `txHtml`; siehe F-940. Gates f15 und f42 lesen die neuen Module (Begründung im Gate-Kopf); f23 liest keinen View-Quelltext und blieb unverändert.
Feature/Run: Entdeckt: Prüfpass F44 WS-4a (code-reviewer), 01.10.2026.

**F-938** · `PROCESS_IMPROVEMENT` · P2 · erledigt
Titel: Aufträge aus Findings tragen weder AK noch Nicht-Ziele, und keine Rolle bekommt eine DoD.
Beschreibung: Ein Auftrag aus einer Feature-Akte (F35) trägt AK und Nicht-Ziele. Das Review urteilt dann je AK; berührt eine Änderung ein Nicht-Ziel, ist das ein Befund HOCH (`src/ak-pruefung/index.ts` ca. Z. 112). Ein Auftrag per Click-to-Work aus einem Finding trägt nur einen Auftragstext, und das Review läuft dann ohne AK-Block. Eine DoD als Eingabe gibt es für keine Rolle (siehe F-829).
Fundstelle: `baueAuftragstext` (`public/leitstand/views/workboard.js`), `src/ak-pruefung`, F-829.
Auswirkung: Mittel. Aufträge aus Findings sind bei der Abnahme nicht gegen AK prüfbar.
Maßnahme: Fixpaket Arbeitsfähigkeit (E-M5-18), Baustein 2. Das „Arbeitspaket“ wird das einzige Übergabeformat, mit den Pflichtfeldern Ziel, AK mit IDs, Nicht-Ziele, DoD, betroffene Bereiche, Risiko und Kontrolltiefe. Bei Findings entsteht ein AK-Entwurf aus der Maßnahme, den Stefan bestätigt.
Status: erledigt (F45 B2a-2, 13.10.2026): Arbeitspaket = Auftrag v0 additiv (`bereiche`, `risiko`, `feature_ref`, `einrichtung`; kein neuer Artefakttyp, DoD über die Projektkarte aus CLAUDE.md). „Auftrag vorbereiten“ an einem Finding zeigt zuerst einen AK-Entwurf aus der Maßnahme (`public/leitstand/ak-entwurf.js`), Stefan ändert oder ergänzt ihn, erst „Auftrag anlegen“ legt an (herkunft `finding`). Aufträge aus Findings und Feature-Akten brauchen ≥ 1 AK (`validiereAuftragPflichtfelder`, wirkt in `validiereAuftragDaten`, `registriereAuftrag` und POST /api/auftraege). Der Block für Architekt und Ausführung kommt aus `baueArbeitspaketBlock` (alte Aufträge bitgenau); das Review urteilt über den bestehenden AK-Block je AK. Rest (Bereiche/Risiko ohne Setzer, Entwurf nur aus der Maßnahme) → F-1083.
Feature/Run: Entdeckt: Challenger, Frage Stefan 01.10.2026.

**F-940** · `HARNESS_IMPROVEMENT` · P2 · erledigt
Titel: i18n-Gate (6) prüft tx('…')-Aufrufe nicht.
Beschreibung: Fünf Views nutzen eine lokale Hilfsfunktion tx() (escapetes t()); das Gate erkennt nur literale t('…'); fehlende Schlüssel fielen still auf den Schlüsseltext zurück.
Fundstelle: `scripts/check-f44-i18n.mjs` (T_AUFRUF_MUSTER).
Auswirkung: Mittel.
Maßnahme: tHtml zentral in i18n.js, Gate prüft t( und tHtml(.
Status: erledigt durch diesen PR (F44 WS-4b): `i18n.js` exportiert `tHtml(schluessel, werte, htmlWerte)` = escapeHtml(t(…)) (Import-Sicherheit unverändert); die fünf lokalen `tx()` und `txHtml` (empfehlung-anzeige.js) sind ersetzt. Regel (6) prüft literale Aufrufe von `t(` und `tHtml(`, der Selbsttest (7) hat Rot- und Grünfälle für tHtml (auch: `txHtml(`, `ztHtml(`, `obj.tHtml(` zählen nicht). Geprüfte Aufrufe: 626 statt 300, kein fehlender Schlüssel.
Feature/Run: Challenge F44 WS-4b, 01.10.2026.

**F-947** · `BUG` · P3 · erledigt
Titel: Lange Produktnamen brechen mitten im Wort.
Beschreibung: Auf den Karten von `#/projekte-uebersicht` (F44 WS-6a) bricht ein langer Produktname ohne Trennstrich mitten im Wort („Wochenplanun / g“). Ursache: `hyphens: manual` aus der Korrekturrunde WS-6a; ohne Trennstelle bricht `overflow-wrap: break-word` irgendwo im Wort.
Fundstelle: `public/leitstand/style.css` (`.v10-seite .produkt-karte h2`).
Auswirkung: Niedrig — schlechter lesbar, kein Überlauf.
Maßnahme: `hyphens: auto` (html lang ist gesetzt) mit `overflow-wrap: break-word` als Rückfall.
Status: erledigt (F44 WS-6b, 01.10.2026): Kartentitel auf `overflow-wrap: break-word; hyphens: auto`; Render-Nachweise `features/F44/nachweise/ws6b/f947-produkte-1440/`, `f947-produkte-390/` und `f947-produkte-390-en/` (kein Überlauf). Grenze: getrennt wird nach der Sprache der Oberfläche, nicht der des Namens.
Feature/Run: Entdeckt: Verifikation F44 WS-6a, 01.10.2026.

**F-953** · `BUG` · P2 · erledigt
Titel: Roadmap-Meilenstein M5 enthält F42 und F44 nicht.
Beschreibung: In `docs/projekt/roadmap.json` fehlen F42 und F44 im Meilenstein M5; die Roadmap-Ansicht und der Fortschrittsring zählen sie deshalb nicht mit.
Fundstelle: `docs/projekt/roadmap.json`, Meilenstein M5.
Auswirkung: Mittel — Roadmap und Kennzahlen unterschätzen den Umfang von M5.
Maßnahme: F42 und F44 nachtragen und ein Gate „jede Feature-Akte steht in genau einem Meilenstein“ einführen.
Status: erledigt (F46 D0, 02.10.2026): `docs/projekt/roadmap.json` M5 trägt F42 (nach F41), F44 (nach F43) und F46 (nach F44, vor F30). Neues Gate `scripts/check-akte-meilenstein.mjs` in `npm run check`: jede Akte steht in genau einem Meilenstein, jeder Roadmap-Eintrag hat eine Akte; Ausnahmen AF-F001 (ohne Meilenstein) und F30 (ohne Akte) mit Begründung im Gate-Kopf. Tests `scripts/check-akte-meilenstein.test.mjs` (grün, fehlend, doppelt, veraltete Ausnahme); Kalibrierung `state/gates.md`.
Feature/Run: Entdeckt: Roadmap neu, 01.10.2026.

**F-954** · `HARNESS_IMPROVEMENT` · P2 · erledigt
Titel: Läufe schreiben ohne eigenen Branch/Worktree in den ausgecheckten Stand.
Beschreibung: Ein Lauf schreibt direkt in den gerade ausgecheckten Branch des Projekts. Der Leitstand zeigt vor dem Start weder den Branch noch offene Änderungen.
Fundstelle: Auftrag starten mit Arbeitsumgebung (`#/projekt`, Ablauf-Freigabe); Laufstart im Server.
Auswirkung: Mittel — Änderungen eines Laufs mischen sich mit offener Handarbeit; der Mensch sieht das Risiko vor dem Start nicht.
Maßnahme: Branch oder Worktree je Lauf und Anzeige von Branch und offenen Änderungen vor dem Start (Fixpaket B1).
Status: erledigt (F45 B1a-1, E-F45-3 = A): jeder schreibende Ablauf arbeitet in einem eigenen Git-Worktree `<Projektordner>-laeufe/<Kurzname>` auf `wf/<Ablauf-ID>`; Freigabe-Seite und „Auftrag anlegen“ zeigen Branch, Arbeitsordner, Basis-Commit und die offenen Änderungen des Projektordners (blockieren nicht). Realer Nachweis `features/F45/nachweise/b1a1/nachweis.md` (Ablauf b1a1-nachweis-325d2a8f, Projektordner unverändert). Einzelläufe ohne Ablauf (POST /api/laeufe) und Chat bleiben im Projektordner.
Feature/Run: Entdeckt: Auftrag starten mit Arbeitsumgebung, 01.10.2026.

**F-955** · `BUG` · P2 · erledigt
Titel: Scout-Zustand der Werkstatt überlebt einen Projektwechsel.
Beschreibung: `views/capabilities.js` setzt `scoutZustand` beim Projektwechsel nicht zurück. Ein laufender Scout-Lauf pollt danach `laeufe/<alte laufId>` unter dem Präfix des neuen Projekts, erhält 404 und bleibt dauerhaft auf „läuft…“; alle „Kandidaten suchen“ bleiben bis zum Neuladen der Seite gesperrt, das Scout-Panel zeigt Inhalte des alten Projekts. Gleiches Muster wie der F26-Chat-Befund (`projekt-kontext.js`, abonniereProjektWechsel).
Fundstelle: `public/leitstand/views/capabilities.js` (scoutZustand, aktualisiereScoutZustand, initCapabilitiesView).
Auswirkung: Mittel — die Kandidatensuche ist nach einem Projektwechsel bis zum Neuladen blockiert; ein alter Lauf erscheint im falschen Projekt.
Maßnahme: Im Projektwechsel-Abonnement `scoutZustand = null`, `vormerkenZustaende` leeren und `renderScoutPanel()` — mit dem Scout-Umbau in WS-7b (in WS-7a war jede Änderung am Scout-Ablauf ausgeschlossen). Seit WS-7a lädt der Wechsel Katalog und Abdeckung bereits neu.
Status: erledigt (F44 WS-7b, 02.10.2026): `setzeScoutZurueck()` im Projektwechsel-Abonnement von `views/capabilities.js` (scoutZustand null, Vormerk-Zustände und geöffnete Quellen verworfen, Panel neu, Knöpfe frei); ein noch laufender Lauf läuft serverseitig weiter (Ausführungen). Test `public/leitstand/views/capabilities.test.mjs` (Rotfall per Mutation belegt), Render-Nachweis `features/F44/nachweise/ws7b/zustaende/` (Projektwechsel mitten im Lauf).
Feature/Run: Entdeckt: QA-Pass F44 WS-7a, 02.10.2026.

**F-958** · `BUG` · P3 · erledigt
Titel: Click-to-Work-Git-Block gibt nicht ausführbare Platzhalter aus.
Beschreibung: Der Git-Block im Workboard-Detail zeigt `git add <dateien>` und `git commit -m "<nachricht>"`, obwohl die geänderten Dateien aus der Laufakte bekannt sind.
Fundstelle: `public/leitstand/views/workboard.js:602–610` (renderTerminalBlock).
Auswirkung: Stefan muss die Befehle vor dem Ausführen von Hand ergänzen.
Maßnahme: Echte Werte (Dateiliste aus der Laufakte, Commit-Nachricht) in einem Befehlsblock ausgeben — Regel „direkt ausführbar“ (F-959).
Status: erledigt (F46 D4, 02.10.2026): Der Block „Sichern“ (Click-to-Work nach abgeschlossenem Ablauf und #/code) nennt die echten geänderten Dateien aus der Leseroute GET …/code (`git status`, nicht die Laufakte — dieselbe Menge, die tatsächlich zu sichern ist), den Commit-Vorschlag aus dem Branchnamen und `git push -u origin <branch>`, PowerShell-gequotet, ohne Platzhalter (`public/leitstand/code-daten.js` sicherBefehle, Test `code-daten.test.mjs`); ist nichts Sicheres zu zeigen (sauber, gekappt, kein Branch), steht der Grund statt eines halben Befehls.
Feature/Run: Entdeckt: F44 WS-8 Challenge, 02.10.2026.

**F-961** · `PROCESS_IMPROVEMENT` · P2 · erledigt
Titel: Idee „Entwicklung › Code“ und neue Reiterzeile der Entwicklung.
Beschreibung: Neuer Reiter „Code“ unter Entwicklung, Reiterzeile neu: Tech Debt & Prozess, Aufträge als Liste, Ausführungen nicht mehr als Reiter. Dazu eine Leseroute `GET …/code`.
Fundstelle: `public/leitstand/views/workboard.js` (Reiterzeile), `scripts/leitstand-server.mjs` (neue Leseroute).
Auswirkung: Code-Stand im Leitstand sichtbar; Reiterzeile ohne Doppelung (vgl. F-964).
Maßnahme: Spec schreiben; Leseroute ohne Schreibzugriff.
Status: erledigt (F46 D4, 02.10.2026): Reiter „Code“ (`#/code`, `public/leitstand/views/code.js`), neue Reiterzeile, Leseroute GET …/code und …/code/diff (`scripts/leitstand/routen-code.mjs`, nur lesende Git-Befehle). Spec war abgleich-f46.md §4.12 mit Bauauftrag D4.
Feature/Run: Entdeckt: F44 WS-8 Challenge, 02.10.2026.

**F-964** · `TECH_DEBT` · P3 · erledigt
Titel: Reiter „Aufträge“ der Entwicklung führt aufs Formular statt auf die Liste; „Ausführungen“ steht doppelt.
Beschreibung: Der Reiter „Aufträge“ in der Reiterzeile von `#/workboard` öffnet `#/projekt` (Formular) statt der Liste `#/runs`; „Ausführungen“ steht sowohl als Reiter als auch in der Sidebar.
Fundstelle: `public/leitstand/views/workboard.js` (Reiterzeile), `public/leitstand/index.html` (Sidebar).
Auswirkung: Gering — irreführendes Ziel, doppelte Navigation.
Maßnahme: Mit F-961 neu ordnen.
Status: erledigt (F46 D4, 02.10.2026): Reiterzeile nach abgleich-f46.md §2 (`public/leitstand/entwicklung-reiter.js`): „Aufträge“ → `#/runs` (dort seit F44 WS-5a das Register Aufträge · Ausführungen), der Reiter „Ausführungen“ entfällt; `#/ausfuehrungen` bleibt über `#/runs` und die Seitenleiste erreichbar.
Feature/Run: Entdeckt: F44 WS-8 Challenge, 02.10.2026.

**F-966** · `TECH_DEBT` · P2 · erledigt
Titel: entferneCodezaun paart den ersten Zaun-Öffner mit dem nächsten ```.
Beschreibung: Trägt das Feld `antwort` eines claude-code-Ergebnisses selbst einen Codezaun und ist das Objekt umzäunt oder von Prosa umgeben (F-506-Fall), wird ein falscher Ausschnitt geparst → Lauf FEHLGESCHLAGEN.
Fundstelle: `scripts/leitstand-server.mjs:3135` (entferneCodezaun).
Auswirkung: Heute latent; real ab der Regel „direkt ausführbar“ (F-959) in der Jarvis-Instruktion, weil Antworten dann Codezäune tragen.
Maßnahme: In WS-8b, vor der Regel: zusätzlich den Ausschnitt „erster Öffner bis letzter Zaun“ versuchen, mit Test; Regressionsschutz check-f22 (0) bleibt.
Status: erledigt (F44 WS-8b, 02.10.2026): `scripts/leitstand-server.mjs` — neue reine Funktion `entferneAeusserstenCodezaun`; `leseRollenErgebnisRohstrom` versucht NUR, wenn die bisherige Kette (`leseRollenErgebnisStufen`, unverändert) scheitert, und nur für claude-code (a) den äußersten Zaun (Beobachtung 'fence_entfernt', für alle claude-code-Rollen) und (b) mit jsonObjektFallback die Objekt-Extraktion auf dem Originaltext. Tests: `scripts/check-f31-gedaechtnis.mjs` (l) (rohes JSON, ```json-umzäunt, Prosa + Zaun, Prosa + rohes Objekt, CRLF, gültiger erster Zaun unverändert, kaputtes JSON mit Grund, codex unverändert, ohne Zaun null), `scripts/check-f22-click-to-work.mjs` (a2) (Router-Pfad, Schema-ENUM) und (0) unverändert.
Feature/Run: Entdeckt: F44 WS-8 Challenge, 02.10.2026.

**F-967** · `BUG` · P2 · erledigt
Titel: Vorschlag „Was braucht mich?“ trifft in en/tr/ru den Vorfilter nicht.
Beschreibung: Die Vorschläge im Leerzustand füllen die Eingabe mit dem übersetzten Text (z. B. „What needs me?“). Die Muster des Vorfilters sind deutsch; nach dem Senden geht die Frage in en/tr/ru deshalb an einen echten Jarvis-Lauf statt an die lokale, deterministische Antwort (E-M4-3). Derselbe Knopf antwortet so je nach Sprache lokal oder über einen kostenpflichtigen Lauf; die übersetzten Vorfilter-Antworten sieht ein nicht-deutscher Nutzer praktisch nie.
Fundstelle: `public/leitstand/views/chat.js` (initVorschlaege), `public/leitstand/jarvis-vorfilter.js` (MUSTER_BRAUCHT_MICH, MUSTER_STATUS).
Auswirkung: Mittel — unnötige Modell-Läufe und uneinheitliches Verhalten je Sprache.
Maßnahme: In WS-8b entscheiden: Vorschlag mit Musterschlüssel (z. B. `data-vorfilter="braucht_mich"`), der beim Senden des unveränderten Vorschlagstexts den Vorfilter direkt wählt, oder die übersetzten Vorschlagstexte als zusätzliche Muster. In WS-8a ausgeschlossen (keine Änderung an der Vorfilter-Logik).
Status: erledigt (F44 WS-8b, 02.10.2026): zweite Variante — `public/leitstand/jarvis-vorfilter.js` erkennt zusätzlich jeden der vier Vorschlagstexte `chat.vorschlag.braucht` aus den Wörterbüchern (Trim, ohne Satzzeichen am Ende, ohne Groß-/Kleinschreibung); die bestehenden Muster bleiben, das Modul bleibt ohne DOM und Storage importierbar. Test `public/leitstand/chat-anzeige.test.mjs` (de/en/tr/ru), Render-Nachweis `features/F44/nachweise/ws8b/klicks-vorfilter-en/` („What needs me?“ → lokale Antwort, kein Lauf).
Feature/Run: Entdeckt: Prüfpass F44 WS-8a (qa 2, code-reviewer 2), 02.10.2026.

**F-968** · `TECH_DEBT` · P2 · erledigt
Titel: VS-Code-Knopf ist für das Standardprojekt immer deaktiviert (relativer repo_pfad).
Beschreibung: Der Kopf-Knopf VS Code baut `vscode://file/<repo_pfad>` nur aus einem absoluten Pfad des Projektregisters. Der Starteintrag `ai-workforce` trägt `repo_pfad '.'`, den der Server gegen sein Arbeitsverzeichnis auflöst; der Browser kennt diesen Pfad nicht. Der Knopf bleibt dort `aria-disabled`, der Grund steht nur im title. Ebenso ohne Link: UNC-Pfade (`\\server\share`), weil `vscode://file/` keinen Rechnernamen kennt.
Fundstelle: `public/leitstand/kopf-werkzeuge.js` (baueVsCodeLink), `scripts/leitstand-server.mjs` (GET /api/projekte liefert repo_pfad roh).
Auswirkung: Mittel — im täglichen Hauptprojekt ist VS Code nicht klickbar.
Maßnahme: GET /api/projekte um den aufgelösten absoluten Pfad ergänzen (`repo_pfad_absolut`, nur lesend) und im Client bevorzugen; Leseroute-Änderung mit Gate-Fall. In WS-8b ausgeschlossen (keine Serverroute ändern).
Status: erledigt (F46 D4, 02.10.2026): anderer Weg als die Maßnahme — der absolute Pfad kommt aus der neuen Leseroute GET …/code (`absoluterPfad`, `scripts/leitstand/routen-code.mjs`), GET /api/projekte bleibt unverändert. `kopf-werkzeuge.js` nimmt ihn, wenn repo_pfad relativ ist (code-stand.js → setzeKopfAusCodeStand); ebenso die VS-Code-Links im Eintrag-Detail. Beleg: Render-Nachweis `features/F46/nachweise/d4/` (Spalte „Kopf VS Code“ mit repo_pfad '.' im Register → `vscode://file/C:/…`). UNC-Pfade bleiben ohne Link.
Feature/Run: Entdeckt: Bau F44 WS-8b, bestätigt Prüfpass (design-guardian, qa F5), 02.10.2026.

**F-971** · `BUG` · P3 · erledigt
Titel: Chat — Antwort oder Lauf im gerade nicht angezeigten Modus/Untermodus bleibt unsichtbar.
Beschreibung: (1) Ist das Dock offen und trifft eine Antwort im anderen Reiter ein (Jarvis ↔ Product Coach), gibt es weder Punkt noch Markierung am Reiter. (2) Läuft ein Coach-Lauf im Untermodus Projekt und wechselt der Untermodus auf Feature (z. B. über „Lieber mit dem Coach besprechen“ auf `#/projekt`), filtert `baueAnzeigeListe` die Lauf-Blase heraus: zu sehen sind Leerzustand, „Lauf abbrechen“ und ein gesperrtes Senden ohne sichtbaren Grund (Verhalten aus F-624, der neue Knopf macht es leichter erreichbar).
Fundstelle: `public/leitstand/views/chat.js` (baueAnzeigeListe, renderVerlauf), `public/leitstand/shell.js` (stiller Punkt nur bei geschlossenem Dock).
Auswirkung: Gering bis mittel — eine Antwort wird übersehen; das gesperrte Senden wirkt grundlos.
Maßnahme: Punkt auch am Reiter des anderen Modus; eine ausstehende Lauf-Blase unabhängig vom Untermodus-Filter zeigen oder einen Hinweis „Lauf im Untermodus Projekt läuft“.
Status: erledigt (F45 B0, 10.10.2026): (1) Punkt am Reiter des anderen Modus mit aria-label „<Name>, neue Antwort“ (public/leitstand/views/chat.js, zustand.ungelesen, setzeReiterPunkt; style.css .chat-register [role=tab].hat-neue-antwort); (2) ein ausstehender Coach-Lauf steht nach dem Untermodus-Filter und damit in jedem Untermodus, mit Hinweis „Lauf im Untermodus <x> läuft“ (baueAnzeigeListe, abweichenderUntermodusDesLaufs); gesperrtes Senden nennt seinen Grund (#chat-sperrgrund, Titel des Knopfs). Render-Nachweis features/F45/nachweise/b0/render/ (reiter-punkt, untermodus).
Feature/Run: Entdeckt: Prüfpass F44 WS-8b (qa F2/F3), 02.10.2026.

**F-972** · `BUG` · P1 · erledigt
Titel: Offene Abnahmen erscheinen nicht unter „Deine Entscheidungen“.
Beschreibung: `baueEntscheidungen` kennt über `filtereAttentionWorkflows` nur `haltFreigabe` und `haltKlaerung`. Die Workflow-Kopfdaten (`baueWorkflowKopfdaten`) tragen keinen Abnahmestand; die Abnahme-Entscheidung ist ein eigenes Artefakt.
Fundstelle: `public/leitstand/attention-daten.js:33` (filtereAttentionWorkflows), `:101` (baueEntscheidungen); `scripts/leitstand-server.mjs` (baueWorkflowKopfdaten).
Auswirkung: Hoch — ein Ergebnis wartet auf Stefan, ohne dass die Liste es zeigt.
Maßnahme: F46 D2: Entscheidungsart `abnahme`, Abnahmestand in den Workflow-Kopfdaten; den Cache-Stempel der Kopfdaten beachten (ein neues Abnahme-Artefakt muss den Stempel ändern).
Status: erledigt (F46 D2, 02.10.2026): eine Regel `ermittleAbnahmeStand` in `scripts/leitstand-server.mjs` für GET …/abnahme und die Kopfdaten (Feld `abnahme: { offen, status }`); der Cache-Stempel der Kopfdaten umfasst die Kette `lineage-entscheidung-workflow-<id>-abnahme`. `baueEntscheidungen` führt die Gruppe `abnahmen` (Art „abnahme“, Hauptknopf „Ergebnis prüfen“), der Zähler an „Entscheidungen“ zählt sie mit. Test `scripts/leitstand-abnahme-stand.test.mjs` (nach echtem POST …/abnahme sofort `offen=false`, nach neuem Bau-Lauf wieder `offen=true`).
Feature/Run: Entdeckt: Design-Runde 02.10.2026 / F46 D0.

**F-973** · `BUG` · P2 · erledigt
Titel: Detailseite zeigt Akzeptanzkriterien ohne Urteil.
Beschreibung: Die AK-Liste eines Features zeigt jedes Kriterium mit leerem Kreis. Die Urteile je AK liegen bereits in GET …/abnahme (`ak_urteile`), werden dort aber nicht gelesen.
Fundstelle: `public/leitstand/views/workboard-detail.js:276`; `ak_urteile` in `scripts/leitstand-server.mjs`.
Auswirkung: Mittel — Stefan sieht nicht, welches AK belegt ist.
Maßnahme: F46 D3 (Urteil je AK aus GET …/abnahme).
Status: erledigt (F46 D3, 02.10.2026): „Das Was“ › Abnahmekriterien zeigt je AK das Urteil aus GET …/abnahme (`ak_urteile`, einmal beim Öffnen und bei Übergängen geladen, kein Poll) mit Beleg, sonst „noch kein Urteil“ (`public/leitstand/views/workboard-detail.js` akUrteilHtml; Tests in `workboard-detail.test.mjs`).
Feature/Run: Entdeckt: Design-Runde 02.10.2026 / F46 D0.

**F-974** · `TECH_DEBT` · P3 · erledigt
Titel: Detailseite zeigt Produkt-Phasen statt des echten Ablaufs.
Beschreibung: Das Detail eines Eintrags zeigt die Produkt-Phasen, nicht die Rollen und Schritte, die ein Eintrag tatsächlich durchläuft.
Fundstelle: `public/leitstand/views/workboard-detail.js`.
Auswirkung: Gering — die Anzeige erklärt den Ablauf nicht.
Maßnahme: F46 D3 mit dem Baustein Rollen-Kreis (aus D1).
Status: erledigt (F46 D3, 02.10.2026): Das Detail eines Features zeigt den Rollen-Kreis (`rollen-kreis.js`, eigenes ID-Präfix) mit dem Stand je Rolle aus den Schritten des verknüpften Ablaufs, Prüfergebnis und Abnahme; Befunde zeigen die Behebung in Schritten aus dem Ablauf. Die Schritte im Einzelnen bleiben aufklappbar.
Feature/Run: Entdeckt: Design-Runde 02.10.2026 / F46 D0.

**F-977** · `TECH_DEBT` · P3 · erledigt
Titel: Live-Fortschritt hält nur den letzten Werkzeugaufruf.
Beschreibung: `laufAktivFortschritt` speichert je Lauf nur den zuletzt gemeldeten Werkzeugaufruf (werkzeug, ziel); ein Verlauf fehlt.
Fundstelle: `scripts/leitstand-server.mjs` (laufAktivFortschritt).
Auswirkung: Gering — die Live-Ansicht kann keinen Verlauf zeigen.
Maßnahme: F46 D5: Ringpuffer der letzten 50 Aufrufe, nur im Speicher, beim D13-Reset geleert.
Status: erledigt (F46 D5, 03.10.2026): `scripts/leitstand/lauf-aktivitaet.mjs` hält je aktivem Lauf die letzten 50 Aufrufe (Zeit, Werkzeug, Ziel gekürzt auf 300 Zeichen, Art), die Gesamtzahl und bis zu 100 berührte Dateien; neu bei jedem Laufstart, gelöscht bei jedem Laufende, laufId-geprüft, nichts auf Platte. Ausgabe als Feld `aktivitaet` in GET /api/laeufe/<laufId>; `fortschritt` bleibt.
Feature/Run: Entdeckt: Design-Runde 02.10.2026 / F46 D0.

**F-978** · `PROCESS_IMPROVEMENT` · P2 · erledigt
Titel: Kein Umfangs-Abgleich während des Laufs.
Beschreibung: Die vom Lauf berührten Dateien werden nicht gegen das Arbeitspaket abgeglichen.
Fundstelle: Laufausführung (Server, Ausführungsschritt); Arbeitspaket gibt es als Datenobjekt noch nicht (F-976).
Auswirkung: Mittel — eine Ausweitung des Umfangs fällt erst im Review auf.
Maßnahme: Fixpaket „Arbeitsfähigkeit“ B2.
Status: offen. Nachtrag F45 B2b-3c (15.10.2026): nach dem Advisor-Pass zu Plan B2b-3c als eigener Bau **B2b-3d** abgetrennt
(`features/F45/plan-b2b3c-v2.md`): kein Produktionsweg setzt heute `bereiche` (F-1083 (1)) — der Abgleich ergäbe in jedem
echten Ablauf „kein Abgleich“. B2b-3d baut ihn zusammen mit einer Quelle für `bereiche` (Präfix-Abgleich gegen die
Änderungsübersicht, Ausnahme-Pfade wie `istAusnahmePfad`, Hinweis in Abnahme und Review-Auftrag, kein Halt).
Nachtrag F45 B2b-3d (16.10.2026, `features/F45/plan-b2b3d-v2.md`): erledigt — Feld „Vereinbarte Bereiche“ im Formular
„Auftrag & Start“ (POST /api/auftraege nimmt `bereiche` an), `src/umfang` (Präfix auf Ordner/Module, `/` und Backslash
gleich, Ausnahme-Pfade, Ordnerpfade aus `git status`, `./`/`*` = ganzes Projekt), Ergebnis nach der Ausführung als Feld
`umfang` der Änderungsübersicht festgehalten (`scripts/leitstand/umfang-stand.mjs`; Formfehler oder degradierte Übersicht ⇒ kein
Feld, nie ein Halt), Projektion `umfang` in GET …/abnahme, amber Hinweis in der Abnahme mit Dateiliste und „Vereinbart: …“,
Zeile „Diese Dateien liegen außerhalb der vereinbarten Bereiche: …“ im Auftrag von Review und qa; Gate
`scripts/check-f45-b2b3d-umfang.mjs`, Render-Nachweis `features/F45/nachweise/b2b3d/`. Durchsetzungsgrad DEKLARIERT (Hinweis). Rest → F-1123.
Feature/Run: Entdeckt: Design-Runde 02.10.2026 / F46 D0.

**F-981** · `HARNESS_IMPROVEMENT` · P2 · erledigt
Titel: Verbrauch je Lauf ist nicht begrenzt.
Beschreibung: Ein Lauf hat weder ein Token- oder Kostenbudget noch eine Rundengrenze. Das `budget` des Startauftrags ist das Kontextpaket-Budget (`standardBudget`: maxElemente, maxBytes) und begrenzt nur den mitgegebenen Kontext; `{}` steht nur in Gate-Attrappen (`check-f10`, `check-f11`). Das Gateway misst den Verbrauch (`usage`), setzt aber keine Grenze. Präzisiert gegenüber dem Auftragswortlaut „budget wird als {} gesendet“.
Fundstelle: `src/claude-code-gateway/index.ts` (Verbrauch nur gemessen); `startvorlagen/ai-workforce.json` (standardBudget).
Auswirkung: Mittel — mit dem automatischen Rückweg aus dem Fixpaket kann Verbrauch ohne Halt entstehen.
Maßnahme: Fixpaket „Arbeitsfähigkeit“ B2: Budget je Arbeitspaket, höchstens ein Rückweg je Stufe, Halt bei zweimal denselben Befunden.
Status: teilweise (F45 B2b-1a, 14.10.2026): Halt-Regeln erledigt — höchstens ein automatischer Rückweg je Stufe, Gesamtgrenze `grenzen.max_replans`, sofortiger Halt, wenn der Review nach der Korrektur dieselben Befunde meldet (Schwere + Datei), Gate `scripts/check-f45-b2b1-rueckweg.mjs` (a)/(a0)/(b). Offen: Budget je Arbeitspaket und Verbrauchsgrenze je Lauf → B2b-3.
Nachtrag F45 B2b-3c (15.10.2026, `features/F45/plan-b2b3c-v2.md`): erledigt — Budget je Arbeitspaket in Tokens (input +
output + cache_read + cache_write über alle Läufe eines Ablaufs inkl. Korrekturrunde; kein Geldbetrag), `src/budget`,
Default je Kontrolltiefe aus realen Laufakten (standard 14,7 Mio., hoch 14,7 Mio., fast-lane 5,3 Mio. fest — F-1121),
optionales `budget_tokens` im Arbeitspaket; Prüfung nach jedem Schritt (Nachlauf, Korrekturrunde, Prüfer/Prüfung
wiederholen, Entscheidung; Rückfallsicherung in `starteWorkflowSchritt`, Vorprüfung in Start und Freigabe), Halt
KLAERUNG_ERFORDERLICH „Budget erreicht: X von Y Tokens“, „Budget erhöhen“ (POST …/budget, neue Auftragsversion, zählt
nicht als Rückweg) oder Ablehnen; Anzeige in Abnahme und Ablauf-Seite; Gate `scripts/check-f45-b2b3c-budget.mjs`.
Durchsetzungsgrad DEKLARIERT (fail-open, nach dem Schritt — Überschreitung um bis zu einen Schritt möglich). Eine
Verbrauchsgrenze mitten im Lauf bleibt bewusst aus (Auftrag: kein Abbruch mitten im Lauf).
Feature/Run: Entdeckt: Design-Runde 02.10.2026 / F46 D0.

**F-983** · `PROCESS_IMPROVEMENT` · P3 · erledigt
Titel: E-F45-1 verweist auf ein Feature F45 ohne Akte.
Beschreibung: E-F45-1 (`docs/projekt/zielfassung.md` §13.6) nennt F45, es gibt aber keine Akte `features/F45/feature.md`. Die Nummer ist damit belegt, ohne dass das Gate sie sieht.
Fundstelle: `docs/projekt/zielfassung.md` §13.6 (E-F45-1).
Auswirkung: Gering — Gefahr einer Doppelvergabe der Nummer.
Maßnahme: Die Fixpaket-Akte wird F45; der Design-Nachbau ist F46 (`features/F46/feature.md`). Mit der Akte F45 kommt der Eintrag in die Roadmap (Gate `scripts/check-akte-meilenstein.mjs`).
Status: erledigt (F45 B0, 10.10.2026): Akte `features/F45/feature.md` angelegt, F45 in `docs/projekt/roadmap.json` M5 zwischen F46 und F30 (Gate `scripts/check-akte-meilenstein.mjs` grün).
Feature/Run: Entdeckt: Design-Runde 02.10.2026 / F46 D0.

**F-986** · `BUG` · P1 · erledigt
Titel: „Jarvis-Chat antwortet nicht“ — Lauf wird verweigert, der Chat zeigt das nicht.
Beschreibung: Gemeldet von Stefan am 02.10.2026 nach #308. Diagnose (02.10.2026, nur lesend, Leitstand auf Port 4199, Playwright): POST /api/chat antwortet 202 in 27 ms; der Server verweigert den Jarvis-Lauf aber sofort vor dem Prozessstart („startfreigabe_abgelehnt: Drift im Gültigkeitsschlüssel: 'arbeitsverzeichnis_pfad' (E-188)“, Wirkungsmarke `terminal`/`VERWEIGERT`). Der Wirksamkeitsnachweis hält `C:\Users\stefa\Projekte\ai-workforce` fest; der Leitstand lief aus einem anderen Worktree (`process.cwd()`). Stefans eigener Lauf um 16:40 lief aus `aiw-main-ansicht` (Stand 7c6d852, vor #308) und wurde genauso verweigert — keine Regression aus #308; #308 hat `views/chat.js` nicht geändert, keine Konsolenfehler beim Laden oder Senden. Zweiter Teil: GET /api/laeufe/<id> meldet danach `aktiv: false`, `laufStatus.status: NICHT_GESTARTET` mit `terminaleOhneRunPrepared: [1]`; der Chat wertet NICHT_GESTARTET immer als „noch nicht terminal“, zeigt ohne Ende die Tipp-Punkte und „Lauf abbrechen“, keinen Fehler, und fragt den Lauf zweimal je Sekunde ab (294 Abrufe in 150 s).
Ursache (a): Umgebung — E-188 greift bei Start des Leitstands aus einem Worktree: der Wirksamkeitsnachweis ist an `C:\Users\stefa\Projekte\ai-workforce` gebunden, das Gateway misst `process.cwd()`.
Ursache (b): `public/leitstand/views/chat.js` (`pruefeAusstehendenLauf`) wertete einen nie gestarteten Lauf (NICHT_GESTARTET mit terminaler Marke ohne RUN_PREPARED) als „noch nicht terminal“ und fragte ohne Ende ab.
Fundstelle: (a) `src/invocation-policy/index.ts:481` (E-188-Vergleich `arbeitsverzeichnis_pfad`) mit `src/claude-code-gateway/index.ts` (`arbeitsverzeichnis_pfad: process.cwd()`); (b) `public/leitstand/views/chat.js` (`pruefeAusstehendenLauf`).
Auswirkung: Hoch — aus jedem Worktree außer `C:\Users\stefa\Projekte\ai-workforce` startet kein Claude-Lauf, und der Chat wartet stumm statt den Grund zu nennen.
Einordnung: (c) Umgebung (Leitstand aus einem Worktree gestartet, E-188 greift wie vorgesehen) plus (b) kleiner Client-Fehler (verweigerter Lauf wird nicht als Ende erkannt).
Maßnahme: (a) Fixpaket: Läufe aus Worktrees — Sicherheitsentscheidung; bis dahin den Leitstand aus `C:\Users\stefa\Projekte\ai-workforce` starten. (b) behoben in F46 D0b: `public/leitstand/chat-laufstand.js` ordnet das Lauf-Detail ein; ein nie gestarteter Lauf (terminale Marke ohne RUN_PREPARED, oder kein Detail und ein Startfehler-Eintrag zur laufId im Poll) endet im Chat mit „Lauf nicht gestartet: <Grund>“; ein nicht aktiver Lauf ohne Änderung über die Lauf-Zeitgrenze der Startvorlage (plus 60 s) beendet das Warten mit Hinweis — ein aktiver Lauf behält „Lauf abbrechen“ und endet an der Server-Zeitgrenze. Der Server liefert lesend `nichtGestartet` (Ergebnis und Grund der terminalen Marke aus `invocation_policy.grund`, `begruendung` oder `grund`, `baueNichtGestartetProjektion`) und `startvorlageZeitgrenzeMs` in GET /api/laeufe/<id>; E-188, CSRF/Origin und Host unverändert. Restgrenzen (Prüfpass): nach Neuladen der Seite wird ein ausstehender Lauf nicht weiter verfolgt (wie bisher); kein HTTP-Test für die zwei neuen Felder, Verdrahtung im Client nur per Render-Nachweis belegt. Tests `public/leitstand/chat-laufstand.test.mjs`, `scripts/leitstand-nicht-gestartet.test.mjs`; Nachweis `features/F46/nachweise/f986/`.
Status: erledigt — (b) F46 D0b, 02.10.2026; (a) F45 B0, 10.10.2026: E-188 bleibt streng, der Leitstand prüft beim Start process.cwd() gegen arbeitsverzeichnis_pfad des Wirksamkeitsnachweises (dieselbe Lesestelle wie das Gateway, pruefeStartordner; Normalisierung wie E-188, arbeitsverzeichnisseGleich) und zeigt bei Abweichung console.warn, das Band #start-hinweis und den Hinweis über dem Chat-Eingabefeld (Feld startHinweis in GET /api/zustand). Restgrenze (b) „Neuladen verfolgt Lauf nicht“ ebenfalls in F45 B0 behoben (uebernimmLaufendenChatLauf). Nachweise: scripts/leitstand-chat-misserfolg.test.mjs, scripts/check-f26-jarvis.mjs (i), features/F45/nachweise/b0/render/ (start-hinweis-*, neuladen). Läufe aus einem Worktree bleiben verweigert — das ist Thema von B1a (E-F45-3).
Feature/Run: Entdeckt: Meldung Stefan 02.10.2026 nach #308 / Diagnose F46 D0b.

**F-987** · `BUG` · P1 · erledigt
Titel: Jarvis-Chat insgesamt unzuverlässig: Absenden dauert lange, Antworten kommen nicht.
Beschreibung: Gemeldet von Stefan am 02.10.2026, 17:20, unabhängig vom Fix F-986 (b). Kandidaten: Startweg des Chat-Laufs (Worktree/E-188, F-986 a), Latenz der Claude-CLI (frühere F-543/F-556), Poll und Antwortübergabe.
Fundstelle: offen.
Auswirkung: Hoch — Jarvis und Product Coach sind praktisch nicht nutzbar (Bedienweg Schritt 2).
Maßnahme: Fixpaket „Arbeitsfähigkeit“, als erster Punkt vor B1, mit Messung (Zeit bis 202, bis Laufstart, bis Antwort) aus dem Hauptordner.
Status: erledigt (F45 B0, 10.10.2026): K1–K5 erfüllt, gemessen mit scripts/messe-chat.mjs aus dem Hauptordner (features/F45/nachweise/b0/messung-*.md): Jarvis K1 28/39 ms, K2 251 ms, K3 Median 5,2 s / Max 5,7 s; Coach K3 Median 9,8 s / Max 23,2 s; Langlauf (30 min) K1 115/279 ms, K2 556 ms, K3 6,1 s; 20 von 20 Turns sichtbar beendet; K5 per Test und Render-Nachweis. Ursachen laut Vorher-Messung: kein Ende ohne Zeitgrenze (F-1007, ausgelöst u. a. durch Modern Standby, F-1013), Misserfolge ohne dauerhaften Eintrag und kein Weiterverfolgen nach Neuladen (F-1008), Start aus falschem Ordner unsichtbar (F-986 a). Offen in WS P: GET /api/zustand im Langlauf p95 440 ms, Event-Loop bis 2 118 ms, Speicher der Seite (F-1015).
Feature/Run: Entdeckt: F46 D0b.

**F-996** · `BUG` · P2 · erledigt
Titel: Ein laufender Ablauf erscheint als Rückfrage.
Beschreibung: Läuft ein Schritt (Workflow LAEUFT, Schritt LAEUFT mit lauf_id), liefert der Automat `haltKlaerung` („Schritt … ist nicht startbereit (status LAEUFT …)“); die Kopfdaten führen das als `naechster.art`. `filtereAttentionWorkflows` wertet jedes `haltKlaerung` als Rückfrage. Belegt an `kontrollzustand/lineage-workflow-f15-ws4-l1` (Version 2): `ermittleNaechstenSchritt` → `haltKlaerung`. Folge: Während jedes Laufs zeigen „Deine Entscheidungen“, der Zähler an „Entscheidungen“, die Spalte „Braucht dich“ und seit F46 D3 das Jetzt-Band im Detail („Rückfrage beantworten“) eine Rückfrage, die es nicht gibt.
Fundstelle: `public/leitstand/attention-daten.js` (`filtereAttentionWorkflows`), `src/workflow/index.ts` (`ermittleNaechstenSchritt`, Regel „nicht startbereit“); Verbraucher `public/leitstand/entwicklung-daten.js` (`workflowPhase`), `public/leitstand/views/workboard-detail.js` (`detailJetzt`).
Auswirkung: Mittel — Stefan wird während eines Laufs zu einer Entscheidung gerufen, die keine ist; „Hauptknopf nur, wenn du dran bist“ (Leitprinzip) gilt dann nicht.
Maßnahme: In der einen Regel (`filtereAttentionWorkflows`) `haltKlaerung` nur als Rückfrage werten, wenn der Workflow nicht LAEUFT — oder der Server liefert für einen laufenden Schritt einen eigenen Ausgang. Bewusst nicht in D3: berührt D2-Flächen und Gate f21-ws2 (d); Entscheidung Stefan.
Status: erledigt (F46 D3, Nachtrag Challenger 02.10.2026): `filtereAttentionWorkflows` in `public/leitstand/attention-daten.js` zählt `haltKlaerung` nicht als Rückfrage, solange der Workflow läuft (`laeuftGerade`: Status LAEUFT oder ein Schritt mit Status LAEUFT, wo Schritte mitgegeben werden). Eine Regel für „Deine Entscheidungen“, den Zähler an „Entscheidungen“, „Braucht dich“, Persona, Jarvis und das Jetzt-Band im Detail. Tests in `attention-daten.test.mjs` (laufend → keine Rückfrage, KLAERUNG_ERFORDERLICH → Rückfrage) und `workboard-detail.test.mjs`.
Feature/Run: Entdeckt: F46 D3 (Nachweis „Feature in Arbeit“).

**F-997** · `PROCESS_IMPROVEMENT` · P3 · erledigt
Titel: Wann ein Bug wieder in die Triage gehört, ist nicht entschieden.
Beschreibung: Das Jetzt-Band eines Bugs zeigt „Was passiert mit diesem Bug?“ mit „Jetzt beheben lassen“. F46 D3 zeigt die Triage nur, solange zum offenen Bug noch kein Ablauf verknüpft ist (vorsichtige, reversible Lesart). Nach einem Fix-Ablauf — auch nach einer angenommenen Abnahme, während das Register den Bug noch als offen führt — steht eine ruhige Zeile mit „Ablauf ansehen“; „Jetzt beheben lassen“ bleibt als Einstieg darunter erreichbar.
Fundstelle: `public/leitstand/views/workboard-detail.js` (`detailJetzt`), `public/leitstand/views/workboard.js` (`renderBearbeitungsAbschnitt`); `docs/design/abgleich-f46.md` §4.8 „Umsetzung D3“.
Auswirkung: Gering — nach einem gescheiterten oder abgelehnten Fix fordert die Seite die Entscheidung nicht aktiv ein.
Maßnahme: Entscheidung Stefan: Triage auch nach einem gescheiterten, gestoppten oder abgelehnten Fix-Ablauf, und „Register schließen“ als nächster Schritt nach einer Annahme (Fixpaket B5, Triage als Schreibweg).
Status: erledigt (Entscheidung Challenger, 02.10.2026): Die Triage („Jetzt beheben lassen“ und die drei „kommt“-Knöpfe) erscheint, wenn der Bug OFFEN ist und kein verknüpfter Ablauf aktiv ist oder auf die Abnahme wartet — nach einem beendeten, abgelehnten oder gestoppten Fix-Ablauf also wieder (`detailJetzt`, `renderBearbeitungsAbschnitt`; Test in `workboard-detail.test.mjs`).
Feature/Run: Entdeckt: F46 D3, Prüfpass qa 6.

**F-999** · `TECH_DEBT` · P3 · erledigt
Titel: Test aufraeumen-nachlauf scheitert sporadisch an einem Restordner des f16-Gates.
Beschreibung: Der Test `aufraeumen-nachlauf` schlug in `npm run check` einmal fehl, weil ein parallel laufendes Gate (f16) einen Restordner `kontrollzustand-test/f16c-…` hinterließ; isoliert und im Wiederholungslauf grün.
Fundstelle: `scripts/check-f16-codex-gateway.mjs` (Testordner), `scripts/aufraeumen-nachlauf.test.mjs`.
Auswirkung: Sporadisch rote Kette ohne Codeänderung.
Maßnahme: Das f16-Gate räumt seine Ordner vor dem Ende auf oder nutzt einen eigenen temporären Ordner (os.tmpdir).
Status: erledigt (F45 P, 11.10.2026): Die Ursache war nicht das f16-Gate (die Gates laufen nacheinander, vor npm run test), sondern der Testfall „F16 AK11“ in src/execution-controller/execution-controller.test.ts (Lauf-Präfix „f16c“), der in npm run test (--test-concurrency=4) parallel zu scripts/aufraeumen-nachlauf.test.mjs läuft: tolerierte raeumeVerzeichnis einen EPERM, schrieb es eine Reste-Meldung ins gemeinsame RESTE_VERZEICHNIS, und der Nachlauf-Test las (und löschte) sie. Fix: fuehreNachlaufAus nimmt ein Reste-Verzeichnis entgegen, der Test arbeitet auf einem eigenen unter os.tmpdir() (scripts/aufraeumen-nachlauf.mjs/.test.mjs). check-f16-codex-gateway.mjs unverändert. Der Restordner kann bei EPERM weiter entstehen; der Nachlauf am Ende von npm run check räumt ihn wie vorgesehen. npm run check dreimal hintereinander grün (Zeitpunkte in features/F45/feature.md, Stand P).
Feature/Run: Entdeckt: F46 D3, 02.10.2026.

**F-1000** · `TECH_DEBT` · P2 · erledigt
Titel: Git wird außerhalb der Code-Leseroute per bloßem Namen gestartet.
Beschreibung: `execFileSync('git', …)` mit cwd = Repo-Wurzel des Projekts: Unter Windows sucht der Prozessstart bei einem bloßen Programmnamen zuerst im cwd — eine von einem Lauf ins Repo gelegte `git.com`/`git.exe` liefe dann im Leitstand-Prozess (außerhalb von Werkzeugsatz und Berechtigungsprofil). F46 D4 löst das nur für `scripts/leitstand/routen-code.mjs` (absoluter Pfad aus den absoluten PATH-Einträgen, `findeGitProgramm`, ohne geerbte GIT_*-Variablen).
Fundstelle: `src/execution-controller/index.ts:156`, `src/aenderungsuebersicht/index.ts:182`, `scripts/leitstand-server.mjs` (leseAusfuehrungsVorbedingungRealGit, leseVersionierteDateien, rev-parse HEAD).
Auswirkung: Mittel — ausnutzbar nur, wenn ein Lauf eine ausführbare Datei in die Repo-Wurzel schreibt; dann aber ohne weitere Hürde.
Maßnahme: Einen gemeinsamen Git-Starter (absoluter Pfad, bereinigte Umgebung) für alle Aufrufe; Muster `findeGitProgramm` aus routen-code.mjs übernehmen, mit Gate-Fall.
Status: erledigt (F45 S, 11.10.2026): Gemeinsamer Git-Starter `src/git-starter/index.ts` (findeGitProgramm, gitProgramm, gitUmgebung, fuehreGitSync; ohne git „git nicht gefunden (PATH)“, kein Rückfall auf den bloßen Namen). Umgestellt: `src/authorization-boundary/index.ts` (leseAusCommit), `src/execution-controller/index.ts` (leseClaudeAenderungen), `src/aenderungsuebersicht/index.ts` (leseGitOderNull), `src/ressourcen/installation.ts` (gitReal, zusätzlich gefunden), `scripts/leitstand-server.mjs` (status, ls-files, rev-parse HEAD), `scripts/zustand-sichern.mjs` (git); `scripts/leitstand/routen-code.mjs` nutzt denselben Starter. PATH-Einträge mit einem Segment `node_modules` zählen nicht (npm-Skripte stellen `<repo>/node_modules/.bin` vor PATH, QA-Pass). Rotfälle `src/git-starter/git-starter.test.ts` (Attrappe git.exe/git.com/git in der Repo-Wurzel — Kalibrierung: bloßes 'git' trifft sie unter Windows — und in `node_modules/.bin`). Gate `scripts/check-git-starter.mjs` (in npm run check) findet Aufrufe mit bloßem 'git' als erstem Argument, exec/spawn mit Befehlstext 'git …', Konstanten und Startziel-Arrays mit 'git' (Groß-/Kleinschreibung egal) in src/, scripts/leitstand*, scripts/zustand-sichern.mjs; Durchsetzungsgrad: geprüft, nicht ERZWUNGEN (zusammengesetzte Namen fallen nicht auf).
Feature/Run: Entdeckt: F46 D4, Prüfpass code-reviewer 3.

**F-1002** · `TECH_DEBT` · P2 · erledigt
Titel: npm run check scheitert lokal an Arbeitsspeicher (node --test ohne Parallelitätsgrenze).
Beschreibung: `node --test` startet ohne Grenze so viele Testprozesse, wie der Rechner Kerne hat; auf Stefans Rechner brach `npm run check` deshalb wegen Arbeitsspeicher ab (F46 D4).
Fundstelle: `package.json` (Skript „test“).
Auswirkung: Mittel — die volle Kette lief lokal nicht durch, Freigaben verzögerten sich.
Maßnahme: `--test-concurrency=4`.
Status: erledigt (F46 D5, 03.10.2026): Skript „test“ = `node --test --test-concurrency=4`; kein Gate und kein Doku-Check prüft den Wortlaut.
Feature/Run: Entdeckt: F46 D4, 03.10.2026.

**F-1003** · `PROCESS_IMPROVEMENT` · P2 · erledigt
Titel: Abbruch eines Einzellaufs hat keine Begründung — Bauauftrag und Abgleich setzen eine voraus.
Beschreibung: Der Bauauftrag F46 D5 und `docs/design/abgleich-f46.md` §4.9 nennen „Abbrechen … (Begründung)“ als bestehenden Dialog. Tatsächlich speichert POST /api/laeufe/<laufId>/abbrechen keinen Grund, der Dialog (F44 WS-5a, G9) hat kein Begründungsfeld. Eine Pflichtbegründung gibt es nur beim Stopp eines Ablaufs (POST /api/workflows/<id>/stoppen, Entscheidungsartefakt). D5 nutzt deshalb für den Lauf eines laufenden Workflow-Schritts den bestehenden Stopp (Pflichtbegründung, „Stoppen“ leer gesperrt, bricht den Lauf ab) und lässt den Einzellauf ohne Workflow beim bestehenden Abbruch ohne Grund — keine Änderung an der Abbruch-Logik.
Fundstelle: `scripts/leitstand-server.mjs` (POST …/abbrechen), `public/leitstand/views/lauf-detail.js` (LAUF_DIALOG_FELD.abbrechen null), `public/leitstand/views/runs.js` (abbrechenKnopf).
Auswirkung: Mittel — ein abgebrochener Einzellauf trägt keine bezeugte Begründung; je nach Laufart gibt es zwei Abbruchwege.
Maßnahme: Entscheiden, ob der Einzellauf-Abbruch eine Pflichtbegründung als Entscheidungsartefakt bekommt (Serveränderung, eigener Auftrag), oder die Formulierung in Abgleich und Auftrag auf „Stopp mit Begründung bei Abläufen“ korrigieren.
Status: erledigt (F45 S, 11.10.2026): Formulierung korrigiert, Entscheidung Challenger 03.10.2026 (Einzellauf-Abbruch bleibt ohne Begründung). `docs/design/abgleich-f46.md` Bedienfluss Zeile „Zuschauen“, §4.9 (Hauptaufgabe und Tabelle) lauten jetzt „Abbrechen (Einzellauf ohne Begründung; Stopp eines Ablaufs mit Pflichtbegründung)“; keine Codeänderung am Abbruch.
Feature/Run: Entdeckt: F46 D5, Bau 03.10.2026.

**F-1005** · `HARNESS_IMPROVEMENT` · P3 · erledigt
Titel: Live-Aktivität zeigt Bash-Befehlstexte — ein Befehl mit Geheimnis wäre dort sichtbar.
Beschreibung: Seit F46 D5 trägt der Ringpuffer der Live-Ansicht das Ziel eines Werkzeugaufrufs, bei Bash/PowerShell den Befehlstext (gekürzt auf 300 Zeichen, escaped, nur lokal im Speicher, mit dem Laufende gelöscht). Enthält ein Befehl ein Geheimnis (Token in einer URL, `Authorization`-Kopf, `--password=…`), steht es während des Laufs lesbar in „Aktivität“ und „Mehr dazu“ des Leitstands.
Fundstelle: `scripts/leitstand/lauf-aktivitaet.mjs` (melde, kuerze), `public/leitstand/views/live-anzeige.js` (Aktivität, Mehr dazu).
Auswirkung: Gering — nur lokal und flüchtig, aber auf dem Bildschirm (Bildschirmfreigabe, Screenshot) sichtbar.
Maßnahme: Fixpaket: bekannte Geheimnis-Muster (Bearer/Token-Köpfe, `password=`/`token=`-Parameter, Schlüssel-Präfixe wie `sk-`, `ghp_`) vor dem Ablegen im Ringpuffer maskieren; Test mit Rot- und Grünfall.
Status: erledigt (F45 S, 11.10.2026): Reine Maskierung `scripts/leitstand/geheimnisse-maskieren.mjs` (URL Benutzer:Passwort@, Authorization/Bearer, --password/--token/--secret/--api-key, Zuweisungen auf …token/passwd/password/secret/api_key/access_key/private_key, Präfixe sk-, ghp_/gho_/ghu_/ghs_/ghr_, github_pat_, xox[abpr]-, AKIA; Platzhalter „••••“, Schlüsselname bleibt). Angewendet in `scripts/leitstand/lauf-aktivitaet.mjs` (zielFuerAnzeige: Ringpuffer, berührte Dateien, „Gerade“ über `scripts/leitstand-server.mjs`) und `scripts/leitstand/routen-harness.mjs` (textFuerAnzeige: Einstellungsdatei mit jedem env-Wert maskiert, alle Harness-Dateien nach Mustern). Zusätzlich (QA-Pass) die abgelehnten Befehle im F-760-Halt-Grund (`scripts/leitstand-server.mjs`, leseAbgelehnteBefehleAusRohstrom). Tests `geheimnisse-maskieren.test.mjs` (Rot/Grün je Muster, Laufzeit bei 64 KB), `lauf-aktivitaet.test.mjs`, `routen-harness.test.mjs`, `scripts/leitstand-abgelehnte-befehle.test.mjs`. Durchsetzungsgrad: geprüft, nicht ERZWUNGEN (Geheimnis ohne Muster bleibt sichtbar; Restpunkte F-1022).
Feature/Run: Entdeckt: F46 D5.

**F-1007** · `BUG` · P1 · erledigt
Titel: Chat-Läufe haben keine eigene Zeitgrenze.
Beschreibung: starteRollenChatLauf übergibt keine zeitgrenzeMsUeberschreibung; ein Jarvis- oder Coach-Lauf erbt zeitgrenzeMs der Startvorlage — 30 min mit startvorlagen/ai-workforce.json, keine Grenze mit der Standard-Startvorlage startvorlagen/beispielprojekt.json. Ein hängender Chat-Lauf hält den Chat und über D13 jeden anderen Lauf bis zu dieser Grenze fest — ohne Grenze unbegrenzt; der Chat zeigt so lange nur die Tipp-Punkte.
Fundstelle: scripts/leitstand-server.mjs (starteRollenChatLauf → starteLaufUndVergiss, zeitgrenzeMs aus vorlage), public/leitstand/chat-laufstand.js (warteGrenzeMs).
Auswirkung: Hoch — „Antwort kommt nicht“ ohne Ende, alle Läufe gesperrt.
Maßnahme: F45 B0: eigene Zeitgrenze je Chat-Rolle (Jarvis 180 s, Coach 300 s), wirksame Grenze im Lauf-Detail.
Status: erledigt (F45 B0, 10.10.2026): KONFIGURATION_JARVIS.zeitgrenzeMs 180 000, KONFIGURATION_PRODUCT_COACH.zeitgrenzeMs 300 000, an starteLaufUndVergiss als zeitgrenzeMsUeberschreibung; GET /api/laeufe/<laufId> liefert laufZeitgrenzeMs (wirksameZeitgrenzeMs), public/leitstand/chat-laufstand.js nutzt sie bevorzugt (wirksameLaufZeitgrenzeMs). Ein an der Grenze beendeter Lauf hinterlässt einen Fehler-Eintrag, D13 ist danach frei (scripts/leitstand-chat-misserfolg.test.mjs, scripts/check-f26-jarvis.mjs (g)).
Feature/Run: Entdeckt: Challenge F45, 03.10.2026.

**F-1008** · `BUG` · P2 · erledigt
Titel: Ein nicht erfolgreicher Chat-Lauf hinterlässt keinen Verlaufseintrag.
Beschreibung: Nur ein erfolgreicher Lauf mit unlesbarem Ergebnis schreibt einen Fehler-Eintrag (F-506). FEHLGESCHLAGEN, VERWEIGERT, Zeitgrenze, Abbruch und „nie gestartet“ zeigt nur der Client lokal; nach Neuladen sind Nachricht und Grund weg, ein laufender Lauf wird nach Neuladen nicht weiter verfolgt (Restgrenze F-986 b).
Fundstelle: scripts/leitstand-server.mjs (nachLauf-Rückruf in starteRollenChatLauf, früher Ausstieg), public/leitstand/views/chat.js (beendeAusstehendenLaufMitFehler).
Auswirkung: Mittel — Stefan erlebt „meine Nachricht ist verschwunden, keine Antwort“.
Maßnahme: F45 B0: Fehler-Eintrag für jeden Misserfolg (F-506-Muster), Lauf nach Neuladen aus aktiverLauf übernehmen.
Status: erledigt (F45 B0, 10.10.2026): Jeder nicht erfolgreiche Chat-Lauf (Wurf, nie gestartet, FEHLGESCHLAGEN, VERWEIGERT, Zeitgrenze, Abbruch, Klärung) schreibt über schreibeRollenChatFehlerEintrag genau einen Eintrag mit istFehler und fehler { art, grund } (beschreibeChatMisserfolg, scripts/leitstand-server.mjs); GET /api/chat und /api/sparring projizieren beides (projiziereFehler), das Verlaufsfenster des Modells lässt Fehler-Einträge aus. Der Client lädt den Eintrag nach dem Ende nach und doppelt ihn nicht (beendeMitFehlerEintrag, Ausblenden der lokalen Fehlanzeige gleicher laufId); nach Neuladen übernimmt der Chat einen laufenden Chat-Lauf aus aktiverLauf (uebernimmLaufendenChatLauf). Tests scripts/leitstand-chat-misserfolg.test.mjs, Gates check-f26 (f), check-f34 (h2), Render-Nachweis features/F45/nachweise/b0/render/ (nicht-erfolgreich-einmal, neuladen).
Feature/Run: Entdeckt: Challenge F45, 03.10.2026.

**F-1009** · `HARNESS_IMPROVEMENT` · P2 · erledigt
Titel: Für ai-workforce gelten je nach Startbefehl zwei verschiedene Startvorlagen.
Beschreibung: projekte.json trägt für ai-workforce startvorlagen/ai-workforce.json; npm run leitstand ohne LEITSTAND_STARTVORLAGE_PFAD lädt startvorlagen/beispielprojekt.json (STANDARD_STARTVORLAGE_PFAD). Damit hängen Router-Worker (Codex oder claude-code-Rückfall), Chat-Worker und Lauf-Zeitgrenze (30 min oder keine) am Startbefehl. F-391 hat nur eine Warnung eingeführt.
Fundstelle: scripts/leitstand-server.mjs (STANDARD_STARTVORLAGE_PFAD, CLI-Bindeblock), projekte.json.
Auswirkung: Mittel — Verhalten und Messwerte sind nicht reproduzierbar.
Maßnahme: F45 B1a: Standard-Startvorlage des eigenen Projekts aus dem Register; Startvorlage im Leitstand sichtbar.
Status: erledigt (F45 B1a-2, 11.10.2026): ohne `LEITSTAND_STARTVORLAGE_PFAD` gilt `startvorlage_pfad` des Registereintrags mit repo_pfad "." (`scripts/leitstand/startvorlage-wahl.mjs`); die Umgebungsvariable hat Vorrang; ohne Eintrag Standard mit Warnung [F-1009]; ein Eintrag mit fehlender/kaputter Datei bricht den Start sichtbar ab (kein stiller Rückfall). Startzeile nennt Pfad und Herkunft; sichtbar an den vorhandenen Stellen „Womit gearbeitet wird“ und Capability Library. Nachweis `features/F45/nachweise/b1a2/`.
Feature/Run: Entdeckt: Challenge F45, 03.10.2026.

**F-1012** · `PROCESS_IMPROVEMENT` · P2 · erledigt
Titel: Fähigkeiten lassen sich nicht je Projekt aktivieren, und „aktiv“ ist nicht sichtbar.
Beschreibung: Der Katalog kennt nur die Freigabe (FREIGEGEBEN, OFFEN); 27 externe Einträge stehen auf OFFEN. MCPs und Ort-B-Skills sind installierbar, Agents nicht („erst später“), Plugins fehlen im Modell (F-910). Ein Ein- und Ausschalten je Projekt ohne Deinstallation gibt es nicht; der Leitstand zeigt nicht, was im nächsten Lauf aktiv ist und was im letzten Lauf benutzt wurde.
Fundstelle: ressourcen.json, src/ressourcen/index.ts (AGENT_INSTALLATION_ERST_SPAETER, pruefeInstallierbarkeit), public/leitstand/views/capability-library.js.
Auswirkung: Mittel — Stefan kann den Werkzeugkasten der Workforce nicht wie in VS Code steuern.
Maßnahme: F45 WS F: installieren, aktivieren/deaktivieren je Projekt, Status installiert · aktiv · benutzt sichtbar.
Status: teilweise (F45 F-1, 12.10.2026, Serverteil): je Projekt ein-/ausschalten (`~/.ai-workforce/faehigkeiten.lokal.json`; Katalog-MCPs/Ort-B-Skills Standard aktiv mit `aus`, Projekt-Agents/-Skills Opt-in mit `an`, wirkt ab dem nächsten Lauf; E-F45-6/7/8), Endpunkte GET /api/projekte/<id>/faehigkeiten (installiert · aktiv · benutzt im letzten Lauf), POST …/aktivierung, POST …/freigabe; Laufakte `faehigkeiten_im_lauf`. Offen (F-2): Oberfläche (Seite Workforce, Lauf-Detail), Plugins im Modell, Agents installierbar.
Status: erledigt (F45 F-2a, 12.10.2026, Oberfläche): Seite Workforce → Capability Library → „Dieses Projekt“ (installiert · aktiv · im letzten Lauf mit Aufrufen/Fehlern, Schalter je Eintrag mit Standard je Art und „wirkt ab dem nächsten Lauf“, gesperrt während eines Laufs, „Freigeben nach Inhalt“ mit Pfad und Hash, Bänder ungültige Datei/Fremdänderung/eingeschaltet-nicht-aktiv), Lauf-Detail „Fähigkeiten im Lauf“, Kurzzeile in der Abnahme; Beleg 13 im echten Lauf (`features/F45/nachweise/f2a/`). Die übrigen Teile laufen eigenständig weiter: Plugins im Modell → F-910/F45 F-3 (E-F45-9), externe Agents installierbar → F-1051, Sammlung/Prüflauf → F-1056/F-1057 (F-2b).
Feature/Run: Entdeckt: Challenge F45, Wunsch Stefan 03.10.2026.

**F-1015** · `BUG` · P1 · erledigt
Titel: Der Speicher der Leitstand-Seite wächst im Langlauf in Stufen.
Beschreibung: Langlauf F45 B0 (10.10.2026, 30 min Warmlauf mit offener Seite #/chat, Poll alle 2 s, danach 5 Jarvis-Turns): Working Set aller Chromium-Prozesse der Seite 396 MB nach dem Laden (18:37 UTC), Stufen auf 591 MB (18:43) und 707 MB (18:57), dazwischen nur teilweise zurück; am Ende des Warmlaufs 603 MB (+52 %). Der Leitstand-Server blieb nach einer Anlaufphase flach (82 → 113 MB, ab 18:46 konstant). Ob ein Leck (z. B. wachsende Listen, Detached DOM durch innerHTML-Rendern im Poll) oder nur verzögerte Garbage Collection vorliegt, ist nicht belegt. Im Bericht der Messung steht „Chromium 500 %“ — die Basis war eine Probe vor dem Seitenladen (98 MB); seit F45 B0 rechnet scripts/messe-chat.mjs ab der ersten Probe nach dem Laden.
Fundstelle: features/F45/nachweise/b0/messung-langlauf.md (Speicherverlauf), public/leitstand/zustand.js und die Poll-Abnehmer.
Auswirkung: Hoch bei Stefans Arbeitsweise (Leitstand stundenlang offen, Rechner mit wenig freiem Speicher — der erste Langlauf wurde wegen Speichermangel abgebrochen).
Maßnahme: WS P: 2-h-Langlauf mit Heap-Snapshots (Chromium DevTools) vor/nach, Poll-Abnehmer auf wachsende Strukturen prüfen; Ziel: RSS der Seite nach 2 h ≤ 1,2 × Wert nach dem Laden. Zielwert seit Challenger-Entscheidung 11.10.2026: Seitenspeicher (RSS Chromium) am Ende ≤ 1,2 × Wert nach 15 min (Aufwärmphase ausgenommen) UND JS-Heap, DOM-Knoten und Listener ≤ 1,2 × Wert nach 15 min (docs/projekt/fixpaket-f45.md Abschnitt 2); ausgewertet über Mediane (Minute 15–20 gegen die letzten 5 min).
Status: erledigt (F45 P, 11.10.2026) — kein Leck, Chromium-Aufwärmphase. 2-h-Leerlauf mit Seitenwechseln und Heap-Snapshots (features/F45/nachweise/p/messung-vorher.md): JS-Heap ≈ 15 MB, DOM-Knoten ≈ 15 000 und Listener 166 über die ganze Zeit flach, kein Detached DOM; RSS Chromium steigt in den ersten ≈ 15 min von 360 auf ≈ 650 MB und bleibt dann auf diesem Plateau. Das Heap-Wachstum Start → Ende (+4,5 MB Strings) sind einmal gefüllte Ansichtsdaten (z. B. 378 KB HTML der Laufliste, je Ansicht eine Workitem-Liste) und der DevTools-Netzwerkpuffer der Messung (blink::NetworkResourcesData, Playwright). Neues Kriterium: Vorher-Basis 0,94 / 0,88 / 1,0 / 1,0, nachher-gleich 1,02 / 0,94 / 1,0 / 1,0 — erfüllt. Grenzen: das Kriterium belegt „kein Leck nach dem Aufwärmen“, kein „behoben“ (vorher schon erfüllt); das ursprüngliche 2-h-Ziel ist ersetzt; die Nachher-Messung lief 60 min (die 2 h vorher endeten nach 63 min in Modern Standby).
Feature/Run: Entdeckt: F45 B0, Langlauf 10.10.2026.

**F-1024** · `HARNESS_IMPROVEMENT` · P2 · erledigt
Titel: Secret-Scan läuft nur in der CI, nicht in npm run check.
Beschreibung: F45 S lief lokal grün (npm run check, Prüfpass), der gitleaks-Scan der CI (ci.yml „Secret-Scan (gitleaks)“, detect --no-git) fand danach 8 Test-Attrappen (curl-auth-header, stripe-access-token, gitlab-pat, gcp-api-key) in Tests und im Nachweis-Skript. Fehler dieser Art fallen erst nach dem Push auf. Behoben in F45 S (Nachbesserung): die Attrappen werden zur Laufzeit zusammengesetzt; keine Allowlist.
Fundstelle: `package.json` (Skript „check“), `.github/workflows/ci.yml` (Secret-Scan).
Auswirkung: Mittel — eine zusätzliche Runde nach dem Push; ohne CI bliebe ein echtes Geheimnis lokal unentdeckt.
Maßnahme: F45 B1a (Mindest-Gates, auch für das Projekt-Skelett): lokaler Secret-Scan in npm run check, wenn das Werkzeug vorhanden ist (gitleaks bzw. Docker), sonst klarer Hinweis statt stillem Überspringen.
Status: erledigt (F45 B1a-2, 11.10.2026): `scripts/check-secrets.mjs` in `npm run check` (vor `npm run test`) nutzt dieselbe Prüfung wie Teil (c) der Skelett-Gates: gitleaks aus dem PATH (nie aus dem cwd), sonst Docker (gleiche Fassung wie ci.yml), sonst sichtbarer Hinweis. Lokal bei Stefan derzeit Hinweis (weder gitleaks noch Docker); echter Rotfall mit Laufzeit-Attrappe als Test `scripts/check-secrets.test.mjs`, läuft wo ein Werkzeug da ist (CI).
Feature/Run: Entdeckt: CI #318, 11.10.2026.

**F-1026** · `BUG` · P1 · erledigt
Titel: Ausführung endet „erfolgreich“, aber unvollständig, wenn ein Prüfbefehl im -p-Lauf in den Hintergrund wandert.
Beschreibung: Realer Nachweis B1a-1, Lauf af862c09: die Ausführung startete `npm run check` (Zeitgrenze 300 s über dem Vordergrund-Limit), Claude Code schob ihn in den Hintergrund, das Modell beendete den Turn mit „Ich warte auf die Benachrichtigung“. Der Lauf endete ERFOLGREICH ohne Abschluss: der `zu_loeschen`-Block fehlte, die verlangte Löschung unterblieb; der verwaiste Hintergrund-Check lief parallel zum Prüfschritt im selben Arbeitsordner. Der Review (Codex) fing es (BLOCKIERT), der Korrekturlauf holte es nach. Nicht durch B1a-1 entstanden, der Hinweissatz „Kannst du sie selbst ausführen, tu es trotzdem“ (F-652) begünstigt es.
Fundstelle: Instruktion in `starteWorkflowSchritt` (F-652-Satz), Werkzeugsatz `schreibend` (Bash-Allowlist), Rohstrom `kontrollzustand-roh/af862c09…`.
Auswirkung: Hoch — Ergebnis wirkt fertig, ist es nicht; jeder Bau mit eigenem Check kann so enden.
Maßnahme: (B2b) Ende „wartet auf Hintergrund“ als unvollständig werten (Rückfrage/Halt), Hintergrundausführung im Lauf unterbinden oder Bash-Zeitgrenze unter das Vordergrund-Limit legen; Instruktion: Prüfbefehle nur im Vordergrund oder gar nicht.
Status: erledigt (F45 B1b-1, 11.10.2026): (1) jeder Claude-Code-Lauf startet mit `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1` (`WORKFORCE_LAUF_UMGEBUNG`, nicht abwählbar; code.claude.com/docs/en/env-vars) — real belegt: der Hintergrund-Parameter entfällt, ein Befehl über seiner Zeitgrenze wird beendet statt verschoben; (2) Netz darunter: der Result Evaluator wertet jeden angenommenen Hintergrund-Aufruf (`tool_use_result.backgroundTaskId` — die reale Form aus af862c09, automatisch verschoben ohne `run_in_background` — oder `run_in_background` ohne Fehler) als FEHLGESCHLAGEN/`hintergrund_ausfuehrung` (Laufakte: `beobachtung.hintergrund_aufrufe`); der Workflow hält mit klarem Grund (KLAERUNG_ERFORDERLICH, Weg Reparaturfassung). Kontrolllauf ohne Variable: beide Formen real erzeugt, echter Evaluator → FEHLGESCHLAGEN. Ein gleichzeitiger Umgehungsverdacht (E-186) steht in `daten` (ARCHITECTURE §4, Muster claude_ordner_veraendert). Nachweis `features/F45/nachweise/b1b1/`. Offen: Codex-Läufe (kein Hintergrund-Mechanismus bekannt); Hintergrund über die Shell selbst (`&`, `nohup`, `Start-Process`) zählt die Regel nicht — die Bash-Allowlist lässt nur npm-Befehle zu, real nicht geprüft.
Feature/Run: Entdeckt: F45 B1a-1, realer Nachweis 11.10.2026.

**F-1029** · `BUG` · P2 · erledigt
Titel: Projekt-Skelett verweist auf das nicht kopierte SETUP.md.
Beschreibung: `vorlagen/projekt-skelett/scripts/check-docs.mjs` (Zeilen 87 und 248), `scripts/check-rules.mjs` (Zeile 88) und die Platzhalter-Skripte in `package.json` verwiesen auf „SETUP.md Punkt …“, SETUP.md stand aber nicht in der Whitelist und wurde nie in neue Projekte kopiert.
Fundstelle: `vorlagen/projekt-skelett/` (scripts/check-docs.mjs, scripts/check-rules.mjs, package.json).
Auswirkung: Mittel — wer der Meldung folgt, findet die Anleitung nicht.
Maßnahme: SETUP.md (Template-Fassung) ins Skelett aufgenommen; Platzhalter verweisen jetzt auf `docs/harness/gate-vorlage-node.md`.
Status: erledigt (F45 B1a-2, 11.10.2026).
Feature/Run: Entdeckt: Challenger, Bauauftrag F45 B1a-2, 11.10.2026.

**F-1035** · `HARNESS_IMPROVEMENT` · P3 · erledigt
Titel: Eine Claude-Code-Sitzung hat in B1a-1 einen Branch von Hand mit `git branch -D` gelöscht.
Beschreibung: Der Arbeitsordner-Code löscht Branches nur mit `-d` (nie `-D`); in der Bausitzung selbst wurde ein Branch trotzdem von Hand mit `-D` entfernt. Kein Hook hindert das. Zweiter Vorfall (B1a-2): ein `rm -rf` im Scratchpad der Bausitzung.
Fundstelle: `.claude/hooks/commit-guard.cjs` (keine Regel für `branch -D`).
Auswirkung: Gering bis mittel — ungemergte Arbeit kann ohne Rückfrage verloren gehen.
Maßnahme: commit-guard (bzw. eigener Hook) sperrt `git branch -D` und `--delete --force` in Sitzungen; Änderung an Hooks macht Stefan (Team-Policy).
Status: erledigt (F45 B1b-1, 11.10.2026, nur ai-workforce): der Root-commit-guard sperrt rm -rf (alle Schreibweisen), Remove-Item -Recurse -Force, rd /s /q, git branch -D/--delete --force, git reset --hard, git clean -f, git checkout ., git restore ., git stash drop/clear, git worktree remove --force, git update-ref -d (auch mit Optionen vor dem Unterbefehl); Tests `scripts/commit-guard.test.mjs`. Grenzen: das PowerShell-Werkzeug läuft am Bash-Matcher vorbei (F-1042); die Skelett-Fassung bleibt unverändert (F-1038). Der E-183-Hash von ai-workforce ändert sich — Startfreigabe neu erteilen.
Feature/Run: Entdeckt: Challenger, Bauauftrag F45 B1a-2, 11.10.2026.

**F-1037** · `HARNESS_IMPROVEMENT` · P2 · erledigt
Titel: commit-guard war per Ordnerkopie umgehbar.
Beschreibung: Der Root-commit-guard erkannte `.claude/settings.json` nur als Teilstring im Befehl. In B1a-2 hat ein `cp -rn .claude …` (Ordnerkopie) den Schutz real umgangen; Verschieben, Löschen oder Überschreiben eines `.claude`-Ordners war ebenso frei.
Fundstelle: `.claude/hooks/commit-guard.cjs` (Aufgabe 1).
Auswirkung: Mittel — Team-Policy und Hooks konnten per Shell ersetzt werden.
Maßnahme: Aufgabe 5 im Root-commit-guard: Kopieren, Verschieben, Löschen, Überschreiben eines `.claude`-Ordners (Quelle oder Ziel; auch Platzhalter, ./-Varianten, Pipeline, Wechsel in `.claude`, Inline-Code, tar) sperren. Grenze: Kopien eines ganzen Ordnerinhalts (`cp -r ../tpl/. ./`), die `.claude` mitnehmen, ohne es zu nennen.
Status: erledigt (F45 B1b-1, 11.10.2026) für ai-workforce; Tests `scripts/commit-guard.test.mjs`. Template-Repo: F-1038.
Feature/Run: Entdeckt: F45 B1a-2 (Bausitzung), Bauauftrag F45 B1b-1, 11.10.2026.

**F-1039** · `TECH_DEBT` · P3 · erledigt
Titel: projekt-nachruesten.test.mjs setzt voraus, dass os.tmpdir() außerhalb der Nachrüst-Basis liegt.
Beschreibung: Der Test „Ziel außerhalb der Basis neben der Installation“ (`scripts/projekt-nachruesten.test.mjs:40`) nutzt ein Ziel unter os.tmpdir(); die Basis ist der Elternordner der Installation. Liegt das Repo selbst unter /tmp (Challenger-Clone 11.10.), liegt das Ziel innerhalb der Basis und der Test ist rot.
Fundstelle: `scripts/projekt-nachruesten.test.mjs:40`.
Auswirkung: Gering — falsch roter Test in der Cloud-Prüfung.
Maßnahme: Basis im Test explizit setzen (Testeinspritzung) statt aus der Lage der Installation abzuleiten.
Status: erledigt (F45 B1b-2, 11.10.2026): der CLI-Test prüft „abgelehntes Ziel → Exit 2, nichts geschrieben (auch mit --anwenden)“ mit einem Ziel, das unabhängig von der Lage des Repos abgelehnt wird (eine Datei statt eines Ordners); die Basisregel selbst prüft der Unit-Test `src/projekt-anlegen/nachruesten.test.ts` („Pfad außerhalb der Basis wird abgelehnt“) mit explizit gesetzter Basis. Kein neuer Schalter in der CLI.
Feature/Run: Entdeckt: Challenger, Cloud-Clone 11.10.2026; Bauauftrag F45 B1b-1.

**F-1040** · `BUG` · P1 · erledigt
Titel: Ein schreibender Workforce-Lauf konnte per Write/Edit außerhalb seines Arbeitsordners schreiben.
Beschreibung: `baueAufruf` reichte den Werkzeugsatz `schreibend` unverändert an `--allowedTools` weiter; ein nacktes `Write`/`Edit` erlaubt jeden Pfad. Realer Rot-Fall (`-p`-Lauf, Haiku, Wegwerf-Ordner): Write legte ohne Rückfrage eine Datei im Elternordner und eine im Projektordner des Worktrees an.
Fundstelle: `src/claude-code-gateway/index.ts` (baueAufruf); `features/F45/nachweise/b1b1/zaehlung-haertung-lauf1.json`.
Auswirkung: Hoch — die Invariante „Projektordner unberührt“ (E-F45-3) hing nur an der Anweisung.
Maßnahme: `--allowedTools` begrenzt Write/Edit auf `Edit(./**)` (relativ zum cwd; Edit-Regeln gelten für alle Schreibwerkzeuge); `--tools` behält die Namen.
Status: erledigt (F45 B1b-1, 11.10.2026): realer Grün-/Rot-Lauf danach — beide Versuche außerhalb verweigert (permission_denials), Dateien fehlen, Write im Worktree geht (`zaehlung-haertung.json`). Grenze: Schreiben über npm-Skripte (Bash) begrenzt die Regel nicht.
Feature/Run: Entdeckt: F45 B1b-1, realer Nachweis 11.10.2026.

**F-1053** · `BUG` · P1 · erledigt
Titel: Mit CLI 2.1.296 bräche das Ort-B-Init-Gate jeden Ort-B-Lauf ab (eingebaute Plugins).
Beschreibung: Seit CLI 2.1.296 lädt jeder Lauf trotz `--setting-sources project` die eingebauten Plugins `cc-plugin-telemetry@builtin` und `cc-plugin-plugin-authoring@builtin`; der zweite bringt den Skill `plugin-authoring`, der auch mit `disableBundledSkills` in `init.skills` steht (Spike F-1, Lauf C). Das Ort-B-Init-Gate (`init.skills ⊆ Ort-B-Namen`) hätte damit jeden Ort-B-Lauf beendet. Abgeleitet, nicht als eigener Ort-B-Lauf vor dem Fix gemessen.
Fundstelle: `src/ressourcen/ort-b-start.ts` (`--settings` ohne enabledPlugins), `state/spike-f45-f1-agents.md`.
Auswirkung: Hoch für Ort-B-Läufe (Skill frontend-design im Referenzlauf).
Maßnahme: Jeder Lauf mit Init-Gate setzt `enabledPlugins` der eingebauten Plugins (Referenzliste) auf false; das Gate verlangt `init.plugins` leer.
Status: erledigt (F45 F-1, 12.10.2026): `src/faehigkeiten/start.ts` (`baueFaehigkeitenStart`, auch für Ort-B), Gate `scripts/check-f36-ws5b-skill.mjs` (c)/(m). Beleg im echten Lauf: `features/F45/nachweise/f1/`.
Feature/Run: Entdeckt: F45 F-1 (Spike), 12.10.2026.

**F-1054** · `TECH_DEBT` · P2 · erledigt
Titel: Restpunkte F45 F-1 für F-2 (Anzeige, Bindung, Gründe).
Beschreibung: (1) Projekt-Agents/-Skills sind an die Anzeige nur über den Hash beim Start gebunden, nicht über angezeigte ids — F-2 muss eine Kennung der Projekt-Fähigkeiten im Start-Body mitgeben und vergleichen (Muster empfehlungIds). (2) Die Gründe `SKILL_AGENT_ERST_AB_WS5`/`PROJEKT_SKILL_GESPERRT` in „Passt, nicht im Lauf“ sind veraltet (Projekt-Agents/-Skills laufen jetzt über Opt-in); im Projekt abgeschaltete Katalog-Einträge stehen nur in `deaktiviert` der Empfehlung, die Oberfläche zeigt das Feld noch nicht. (3) Fortsetzungsstarts ohne angezeigte ids (Korrekturlauf, Folge-Schritte) laufen wie bisher ohne Katalog- und Projekt-Fähigkeiten. (4) Keine Oberfläche für GET/POST …/faehigkeiten. (5) GET …/faehigkeiten prüft die `tools`-Zeile der Projekt-Agents gegen den Werkzeugsatz `schreibend`, der Start gegen den tatsächlich genutzten (QA 9). (6) `fremde_aufrufe` (z. B. ein verweigerter general-purpose) wird nirgends angezeigt; der Join zählt Agent-Namen genau nach Schreibweise (QA 8). (7) „aus nach der Anzeige geändert → Start bricht ab“ (B8) hat keinen eigenen Test.
Fundstelle: `src/ressourcen/index.ts` (`baueEmpfehlung`), `scripts/leitstand-server.mjs` (starteWorkflowSchritt), `public/leitstand/`.
Auswirkung: Mittel — Stefan schaltet in F-1 nur über die API.
Maßnahme: F45 F-2 (Oberfläche, Bindung an die Anzeige, Gründe neu).
Status: offen.
Feature/Run: Entdeckt: F45 F-1 (Advisor A17/A18), 12.10.2026.
Zugeordnet: F45 F-2.
Status: erledigt (F45 F-2a, 12.10.2026): (1) Projekt-Kennungen `agent:|skill:<name>@<sha256>` gehen in `empfehlungIds` mit der Freigabe zurück (Trennung über das Präfix); verglichen im Projektordner (Vorprüfung und Start, `bereiteEmpfehlungFuerStartVor`) und im Ordner des Laufs (`loeseAusfuehrungsEingabenAuf`, im bereiten Arbeitsordner schon in der Vorprüfung) — Abweichung 409 „Anzeige veraltet“ (POST /api/laeufe 400 wie F36 WS-3); ohne angezeigte Kennungen kein Start. (2) Gründe neu („aus — je Projekt einschalten“, „Inhalt weicht ab — freigeben“, „nicht im Projektordner“, „eingeschaltet, aber nicht aktiv“); `deaktiviert` und Projekt-Fähigkeiten im Freigabeblock. (4) Oberfläche (F-1012). (6) `fremde_aufrufe` im Lauf-Detail als eigene Zeile. (7) B8-Test (`scripts/leitstand/routen-faehigkeiten.test.mjs`). Rest — (3) Fortsetzungsstarts, (5) Werkzeugsatz der Status-Route, (6) Join nach Schreibweise — in F-1060.

**F-1056** · `HARNESS_IMPROVEMENT` · P1 · erledigt
Titel: Keine Inhaltsprüfung der gepinnten Version vor der Freigabe (Challenger K20).
Beschreibung: Eine Fähigkeit wird heute nach Lizenz, Kosten und Wirkung freigegeben und in fester Version installiert, ihr Inhalt wird vorher aber nicht geprüft: weder die Skill-Anweisungen noch das MCP-Paket (Installationsskripte, Netzzugriffe) noch — ab F-3 — Plugin-Hooks.
Fundstelle: `src/ressourcen/installation.ts`, `src/ressourcen/skill-installation.ts`.
Auswirkung: Hoch — eine freigegebene Fähigkeit kann Anweisungen oder Code tragen, die Stefan nie gesehen hat.
Maßnahme: F45 F-2b: read-only Prüfschritt nach dem Verfahren `.claude/skills/werkzeug-auswahl` mit dem Urteil aus `docs/harness/kandidaten-2026-09-15.md` als Eingabe; Prüfbericht am Eintrag; Freigabe nur mit sichtbarem Bericht; Prüfer in frischem Kontext, Inhalte der Fähigkeit sind Daten, keine Anweisungen.
Status: offen.
Feature/Run: Challenger, Bauauftrag F45 F-2a, 12.10.2026.
Zugeordnet: Fixpaket Arbeitsfähigkeit, F-2b.
Nachtrag (F45 F-2b-1, 12.10.2026): F-2b geteilt (Entscheidung Stefan nach dem Advisor-Pass). F-2b-1 liefert die Sammlung im Leitstand (Liste, Zuordnung zum Katalog, Typ, Stand, Auswahlgrund); Prüflauf, Prüfbericht und Sperre der Freigabe folgen mit F-2b-2 (`features/F45/plan-f2b.md`, Advisor-Befunde A2–A10, A15–A19, A21 als Eingabe).
Status: teilweise (F45 F-2b-2a, 12.10.2026; F-2b-2 nach dem Delta-Advisor-Pass erneut geteilt): „Auswählen“ (Sammlung; Katalogeintrag OFFEN über die API) pinnt die Quelle ohne Installation (Commit-SHA bzw. npm exakte Version + sha512-Integrity; fehlende Paketangabe → „Quelle nicht pinnbar: Paketangabe fehlt“), holt den Inhalt read-only in einen Temp-Ordner (Checkout nur ausgewählter Dateien bzw. `npm pack --ignore-scripts` + eigener Tar-Leser; `.claude*`/CLAUDE.md neutralisiert), prüft ihn in einem Lauf der neuen Rolle `eignungspruefung` (Read/Grep/Glob, `--add-dir` nur auf den Prüfordner, alle Skills/Plugins aus, Init-Gate `skills = ∅`) und legt den Prüfbericht als Kernartefakt `pruefbericht-<schluessel>` mit Lineage ab. „Freigeben & installieren“ verlangt einen Bericht zur angezeigten Version mit Urteil ≠ NICHT_GEEIGNET (sonst 409, Grund auch im Freigabedialog; Rückruf unter der Installationssperre, `src/ressourcen/installation.ts`). Ausnahme-Begründung Pflicht bei „Nur Ausnahme“/„Ausgeschlossen“. Gate `scripts/check-f45-f2b2-pruefung.mjs`, echte Prüfläufe `features/F45/nachweise/f2b2/`. Rest (F-2b-2b): Vormerken-Variante für Sammlungseinträge ohne Katalog, „Eignung prüfen“ im Detail der Capability Library.
Nachtrag (F45 F-2b-2b, 13.10.2026): die npm-Installation nach Prüfung ist wieder möglich (F-1075 Variante C). Der Rest (Vormerken/Katalog für Sammlungseinträge ohne Katalog, „Eignung prüfen“ in der Capability Library) ist nach dem Advisor-Pass F-2b-2b („TEIL 1 + TEIL 2 zu groß“) **F-2b-2c** zugeordnet.
Status: erledigt (F45 F-2b-2c, 13.10.2026): (1) Vormerken für Sammlungseinträge ohne Katalog — im Detail der Sammlung steht „Vormerken“, wenn ein Prüfbericht vorliegt, das Urteil nicht NICHT_GEEIGNET ist und der Eintrag ein Skill (git, Ordner mit SKILL.md) oder ein MCP (npm mit Link) ist; nur in der Workforce. Derselbe Weg wie beim Scout (`public/leitstand/vormerken-ablauf.js`: Auftrag → Routen → ZWINGEND-Freigabe am Ausführungsschritt), kein neuer Schreibweg. Der Auftragstext (`baueSammlungVormerkenAuftragstext`, `public/leitstand/vormerken-auftrag.js`) trägt den Eintrag als JSON-Skelett: typ extern, unterart, lizenz/kosten/beschreibung laut Sammlung, freigabe OFFEN, herkunft und **installation_vorlage aus dem Bericht** (Skill: Ref-URL = Repo + Ref ohne Unterpfad, `skill_pfad = quelle.pfad`; MCP: `herkunft.paket`, `bin` fest nur als geprüfter, eindeutiger Pfad aus der Dateiliste des Berichts — `gepruefterBinPfad`, Advisor B4), offen bleiben nur capabilities, wirkung (nur lokal installierbar), werkzeuge; P5-Klausel, Beleg Bericht-id und Version. Gate F-2b-2 (j) zeigt: Skelett (Skill und MCP) erfüllt `validiereRessourcenDaten` und `pruefeInstallierbarkeit`, die Sammlungszeile ist danach zugeordnet, der Bericht der Sammlung gilt für den Katalogeintrag und „Freigeben & installieren“ läuft (200). (2) „Eignung prüfen“ in der Capability Library — Knopf im Sperrblock des Freigabedialogs, wenn zur angezeigten Version kein Bericht gilt; gleicher Ablauf wie die Sammlung (`public/leitstand/views/pruefung-ablauf.js`, POST …/pruefung[/vorbereiten] mit katalog_id); nach dem Bericht wird der Dialog neu vorbereitet. Die 422 „Werkzeuge“ der Installation nennt jetzt die angebotenen Werkzeuge (Advisor B5).

**F-1057** · `PROCESS_IMPROVEMENT` · P2 · erledigt
Titel: Der Scout kennt Stefans bewertete Sammlung nicht (Challenger K21).
Beschreibung: `.claude/agents/scout.md` sucht nur im Web. Die rund 55 bewerteten Einträge der Sammlung mit Urteil „Optional“ oder „Offen“ (`docs/harness/kandidaten-2026-09-15.md`, `docs/harness/stack-kandidaten.md`) sind für ihn unsichtbar.
Fundstelle: `.claude/agents/scout.md`, `docs/harness/kandidaten-2026-09-15.md`, `docs/harness/stack-kandidaten.md`.
Auswirkung: Mittel — der Scout schlägt Bekanntes neu vor oder übersieht bereits bewertete Kandidaten.
Maßnahme: F45 F-2b: der Scout liest zuerst `kandidaten-2026-09-15.md` und `stack-kandidaten.md`, übernimmt Urteil und Lizenz, das Web nur für Lücken.
Status: erledigt (F45 F-2b-1, 12.10.2026): Der Server hängt jedem direkt gestarteten Scout-Lauf (POST /api/laeufe, Rolle `scout`) die Regel „Sammlung zuerst“ und eine kompakte Liste der Sammlung (Name · Art · Urteil · Lizenz · Link) plus Stack-Liste an den Prompt (`ergaenzeScoutPrompt`, `scripts/leitstand/routen-sammlung.mjs`; gestarteter Argv bitgleich, der Prompt geht per stdin) — die Leitstand-Läufe lesen `.claude/agents/scout.md` nicht (Advisor A12); `scout.md` trägt dieselbe Regel für den Subagenten der Sitzung. Schema `ergebnis-scout` additiv um `quelle` (sammlung|web) und `urteil_sammlung`; die Scout-Karte zeigt das Urteil laut Sammlung (Serverwahrheit per Link, Stand der Anzeige) und markiert Abweichungen. Startfreigabe nicht nötig (der Gültigkeitsschlüssel misst nur settings.json und Hooks). Grenze: ein Scout-Schritt über einen Workflow bekommt den Anhang nicht (F-1067).
Feature/Run: Challenger, Bauauftrag F45 F-2a, 12.10.2026.
Zugeordnet: Fixpaket Arbeitsfähigkeit, F-2b.

**F-1062** · `PROCESS_IMPROVEMENT` · P2 · erledigt
Titel: Der Codex-Reviewer bekommt den Prozess-Audit-Block (Challenger K24).
Beschreibung: `baueBeobachtungsBlock` hängt dem Review-Auftrag „Beobachtung des Ausführungslaufs … fehlende oder unerwartete Nutzung als Befund“ an — auch für den Worker `codex`. Das widerspricht Stefans Codex-Review-Spec §4 (kein Audit von Harness-Schritten durch den Codex-Reviewer).
Fundstelle: `src/claude-code-gateway/index.ts` (`baueBeobachtungsBlock`), Aufruf in `scripts/leitstand-server.mjs` beim Schritt `code-reviewer`.
Auswirkung: Mittel — der Codex-Reviewer prüft Prozessnutzung statt Code; Befunde vermischen sich mit dem Harness-Abgleich.
Maßnahme: B2a — Block nur für den Worker `claude-code`; „vorgesehen gegen benutzt“ bleibt über den Harness-Abgleich (Beleg 12) in der Abnahme.
Status: erledigt (F45 B2a-1, 13.10.2026): `baueBeobachtungsBlock` hängt nur noch an Review-Schritte mit Worker claude-code; der Codex-Reviewer bekommt keinen Block. „Vorgesehen gegen benutzt“ bleibt im Harness-Abgleich der Abnahme (Beleg 12). Tests `scripts/leitstand/review-beobachtung.test.mjs`, Gate f45-b2a1 (f).
Feature/Run: Entdeckt: Challenger, 12.10.2026 (Auftrag F45 F-2b).
Zugeordnet: F45 B2a.

**F-1063** · `PROCESS_IMPROVEMENT` · P2 · erledigt
Titel: Review-Schema ohne Dimension, Evidenzstatus, Korrekturrichtung und Bezug auf den geprüften Stand (Challenger K25).
Beschreibung: `ergebnis-code-reviewer` kennt weder Dimension noch Evidenzstatus (confirmed/likely/needs-validation), Korrekturrichtung, Stufe `critical`, Befund-ID noch den Bezug auf den geprüften Stand — ein veralteter Befund ist nicht erkennbar.
Fundstelle: `schemas/ergebnis-code-reviewer.schema.json`.
Auswirkung: Mittel — Review-Befunde sind schwer zu sortieren, nachzuverfolgen und gegen den aktuellen Stand zu prüfen.
Maßnahme: B2a — Schema v2 additiv nach Stefans Codex-Review-Spec (kommt mit B2a als `docs/projekt/codex-review-spec.md`).
Status: teilweise (F45 B2a-3a, 13.10.2026): Spec als `docs/projekt/codex-review-spec.md` (Kopf „Umsetzung in der Workforce“, Spec wörtlich); Schema `ergebnis-code-reviewer` v2 additiv — je Befund `id`, `dimension`, `evidenz`, `korrekturrichtung` (Strict-Modus: in `required`, nullable), Schwere KRITISCH; versionierte Review-Policy `src/review-policy` (`review-policy-1`) im Auftrag jedes code-reviewer-Schritts, Codex und Claude gleich, Version in der Laufakte (`review.policy_version`); Regel 1k (leere Befunde ohne „Keine belastbaren Findings im geprüften Scope“ halten an), fehlende Pflichtwerte und Kontextlücken sichtbar in Abnahme und „Auf einen Blick“; Werkzeugausfall des Reviews mit Grund statt „nicht lesbar“. Gate `scripts/check-f45-b2a3-codex-review.mjs`. Rest: Bezug auf den geprüften Stand (`geprueft_stand`) und „Review veraltet“ → B2a-3b. **Erledigt (F45 B2a-3b, 13.10.2026):** `src/review-stand` — Inhalts-Fingerabdruck `{ commit, inhalt }` des Laufordners, rein lesend (nur Plumbing, `--no-optional-locks`, `hash-object` ohne `-w`, kein Index-/Objekt-Schreiben; Ausschluss `kontrollzustand/` u. a. über `istAusnahmePfad`), beim Start jedes code-reviewer-Schritts in der Laufakte (`review.geprueft_stand`, sonst null mit `stand_grund`); GET …/abnahme vergleicht bei offener Abnahme mit dem aktuellen Stand (asynchron, Laufort fail-closed) → „Review veraltet“ bzw. „Stand des Reviews nicht bestimmbar“ in Review-Kachel und „Auf einen Blick“. „Veraltet“ nur über den Inhalt — ein Commit derselben Inhalte zählt nicht. Gate `scripts/check-f45-b2a3b-review-stand.mjs`.
Feature/Run: Entdeckt: Challenger, 12.10.2026 (Auftrag F45 F-2b).
Zugeordnet: F45 B2a.

**F-1064** · `HARNESS_IMPROVEMENT` · P2 · erledigt
Titel: Projektkarte mit Zuschnitt je Rolle (Challenger K26).
Beschreibung: Architekt, Advisor und Reviewer kennen den Ausführungsrahmen nicht; Pläne enthalten deshalb Schritte, die die Ausführung nicht darf (git, Paket mit Installationsskript, `npm run check:<name>` (F-1041), Löschen ohne Löschliste, Hintergrundbefehle) → der Lauf endet VERWEIGERT oder braucht eine Korrekturrunde.
Fundstelle: `src/architekt/index.ts`, Workflow-Vorlagen, Startvorlage/Werkzeugsatz.
Auswirkung: Mittel — vermeidbare Verweigerungen und Korrekturrunden.
Maßnahme: B2a — eine einzige, deterministisch je Ablauf neu erzeugte Projektkarte, je Rolle gefiltert, keine Handpflege. Abschnitte: Vorhaben (Projektbeschreibung, Akte, AK — deckt F-936), Bestand (Auszug ARCHITECTURE.md, ADRs, begrenzte Modul-/Verzeichnisübersicht), Ausführungsrahmen (aus Startvorlage und Werkzeugsatz: erlaubte Befehle, kein git, kein Hintergrund, Schreiben nur im Arbeitsordner, Löschen nur per Löschliste, npm-Skripte aus, Bash-Zeitgrenze), Aktive Fähigkeiten (Agents/Skills/MCPs aus dem F-1-Satz), Qualität (DoD aus CLAUDE.md, Prüfbefehl, AK). Zuschnitt: Architekt und Advisor alle Abschnitte; Ausführung Rahmen, Fähigkeiten, Qualität (plus DoD); Reviewer (Claude und Codex) Vorhaben, Bestand, Qualität und Prüfergebnis, ohne Bash-Details (Codex-Review-Spec). Hash der verwendeten Karte je Lauf in der Laufakte. Rahmen-Konflikte meldet der Architekt über vorhandene Felder (`entscheidungen_mensch` mit Kategorie „ausfuehrungsrahmen“ bzw. `capabilities_bedarf.status = "fehlt"`), kein neuer Mechanismus; der Advisor prüft, dass kein Planschritt außerhalb des Rahmens liegt, ohne so gemeldet zu sein. Nicht bauen: kein AGENTS.md (zweite Wahrheit), keine eigene Datei für Architekturprinzipien (stehen in ARCHITECTURE.md und ADRs).
Status: erledigt (F45 B2a-1, 13.10.2026): `src/projektkarte` (`baueProjektkarte`, rein, deterministisch, je Lauf neu) mit Zuschnitt je Rolle (architekt alle fünf Abschnitte, architecture-advisor ohne Fähigkeiten, code-reviewer Vorhaben/Bestand/Qualität), Größengrenze mit sichtbarer Kürzung, Lücken in `fehlend` (fail-open). Ausführungsrahmen aus Werkzeugsatz des Ausführungsschritts und Startvorlage (Befehle, kein git, kein Hintergrund, Arbeitsordner, Löschliste, npm-Skripte aus, Bash-Zeitgrenze, Prüfbefehl); Rahmen-Konflikte meldet der Architekt über `entscheidungen_mensch` (kategorie 'sonstig', Frage „Ausführungsrahmen: …“) oder `capabilities_bedarf` 'fehlt', der Advisor prüft das. Hash je Lauf in der Laufakte (Schema additiv, beide Gateways). Die Ausführung bekommt bewusst keine Karte (Rahmen steht schon im Auftrag, DoD lädt Claude Code aus CLAUDE.md — Doppelung). Gate `scripts/check-f45-b2a1-projektkarte.mjs`; echter Lauf `features/F45/nachweise/b2a1/`.
Feature/Run: Entdeckt: Challenger, 12.10.2026.
Zugeordnet: F45 B2a.

**F-1065** · `HARNESS_IMPROVEMENT` · P2 · erledigt
Titel: Der Architekt sieht im Feature-Modus den Bestand nicht (Challenger K27).
Beschreibung: `baueArchitektAuftragstext` gibt im Modus „feature“ nur Rolleninstruktion, ADR-Block, Stack-Hinweis und Planungsauftrag; es fehlen Capability-Auszug (nur im Modus „projekt“), ARCHITECTURE.md, Modulübersicht und eine Anweisung, den Code zu lesen. Codex läuft `--sandbox read-only` und könnte lesen, wird aber nicht angewiesen.
Fundstelle: `src/architekt/index.ts` (`baueArchitektAuftragstext`).
Auswirkung: Mittel — Entwürfe ohne Kenntnis des Bestands.
Maßnahme: B2a, mit F-1064 — Projektkarte an den Architekten; Anweisung „Relevante Dateien vor dem Entwurf lesen, als [Fakt] mit Pfad belegen“; Capability-Auszug auch im Feature-Modus.
Status: erledigt (F45 B2a-1, 13.10.2026): Projektkarte auch im Modus „feature“; Capability-Auszug in beiden Modi (Feature-Modus fail-open, Projektmodus bricht wie bisher ab); Rolleninstruktion „relevante Dateien vor dem Entwurf lesen, als [Fakt] mit Pfad belegen“ (`ARCHITEKT_LESE_ANWEISUNG`). Echter Lauf: 8 × [Fakt], davon 6 mit Pfad (`features/F45/nachweise/b2a1/nachweis.md`).
Feature/Run: Entdeckt: Challenger, 12.10.2026.
Zugeordnet: F45 B2a.

**F-1066** · `HARNESS_IMPROVEMENT` · P2 · erledigt
Titel: ARCHITECTURE.md wird in neuen Projekten von niemandem befüllt (Challenger K28).
Beschreibung: Das Skelett liefert ARCHITECTURE.md komplett als [FÜLLUNG]; die Schreib-Allowlist des Architekt-Projektmodus (`src/architekt/index.ts`, `PROJEKTMODUS_SCOPE_ALLOWLIST_DATEIEN`, F-712) erlaubt nur `docs/**`, `features/**` und `CLAUDE.md` → der wichtigste Bestandsteil der Karte bleibt leer.
Fundstelle: `src/architekt/index.ts`, `vorlagen/projekt-skelett/ARCHITECTURE.md`.
Auswirkung: Mittel — die Projektkarte (F-1064) hätte keinen Bestand.
Maßnahme: B2a, mit F-1064/F-1065 — ARCHITECTURE.md in die Allowlist des Projektmodus; Abschnitt Ordnerstruktur/Module/Datenzugriff beim Stack-Entscheid zur Pflicht (gleiche Prüfung wie CLAUDE.md und ADR, F-714); die Karte erkennt [FÜLLUNG] und meldet „Architektur noch nicht beschrieben“ statt Vorlagentext. Verwerfen nur, falls ARCHITECTURE.md in Fremdprojekten bewusst Handarbeit bleiben soll.
Status: erledigt (F45 B2a-1, 13.10.2026): ARCHITECTURE.md in `PROJEKTMODUS_SCOPE_ALLOWLIST_DATEIEN` (Wortlaut an allen Stellen nachgezogen); `baueStackEntscheidungsInstruktion` verlangt Ordnerstruktur (mit Modulen/Ordnern) und Datenzugriff; Regel 1h prüft das als dritte Pflicht (`stackArchitekturFehlt`, auch im VERWEIGERT-Pfad) mit derselben Regel wie die Karte (`analysiereArchitektur`: HTML-Kommentare ignoriert, je `## `-Abschnitt, Platzhalter [FÜLLUNG/FUELLUNG]); die Karte meldet „Architektur noch nicht beschrieben“ statt Vorlagentext. Entscheidung O2 (Challenger 13.10.2026): Pflicht sind Ordnerstruktur und Datenzugriff, „Module“ nur als Satz in der Stack-Instruktion, Skelett unverändert.
Feature/Run: Entdeckt: Challenger, 12.10.2026.
Zugeordnet: F45 B2a.

**F-1071** · `PROCESS_IMPROVEMENT` · P2 · erledigt
Titel: Einrichtungsschritte für Stefan haben keinen eigenen Ort (Challenger K31).
Beschreibung: Konten, Schlüssel, Dienste und Berechtigungen, die Stefan vor oder während eines Baus einrichten muss, stehen nirgends gesammelt; der Bau startet ohne sie.
Fundstelle: Arbeitspaket/Architekt (`src/architekt/`), Leitstand.
Auswirkung: Mittel — Bauläufe scheitern an fehlender Einrichtung oder warten unbemerkt.
Maßnahme: B2a — Feld „Einrichtung durch Stefan“ im Arbeitspaket (Schritt, wann nötig, Status), vom Architekten befüllt, Liste im Leitstand vor dem Bau; der Bau startet erst, wenn die als „vor dem Bau“ markierten Schritte erledigt sind.
Status: erledigt (F45 B2a-2, 13.10.2026): Architekt-Ergebnis additiv `einrichtung` (Schema im Codex-Dialekt, Formblock der Rolleninstruktion); der Server übernimmt die Liste als neue Auftragsversion über `registriereAuftrag` (`gleicheEinrichtungAb` im Nachlauf des Architekten und vor jedem Ausführungsstart; gleiche Folge von Schritt/wann = keine neue Version, Abhaken bleibt; ungültiges Ergebnis löscht nichts und lehnt den Bau ab). Der Ablauf zeigt „Einrichtung durch dich“ vor dem Ausführungsschritt mit „Erledigt“/„Wieder öffnen“ (POST /api/workflows/<id>/einrichtung, CSRF/Host zentral, Laufsperre); Freigabe und Start des Baus werden mit offenem „vor dem Bau“-Schritt abgelehnt (409 `einrichtungOffen`, Grund nennt die Schritte). Rest → F-1083 (3), (6), (7).
Feature/Run: Entdeckt: Challenger, 12.10.2026.
Zugeordnet: F45 B2a.

**F-1075** · `BUG` · P1 · erledigt
Titel: Geprüfter und installierter Inhalt können noch auseinanderfallen (F45 F-2b-2a, Delta-Review nach der Korrekturrunde).
Beschreibung: (1) npm-Tarball: doppelte Pfade werden nur in Rohschreibweise (klein, NFC) erkannt. npm/node-tar und Windows lösen mehr Schreibweisen zum selben Ziel auf — `package/./SKILL.md`, `package//SKILL.md`, `package/SKILL.md.` (Punkt/Leerzeichen am Ende), `package\SKILL.md` (Backslash), absolute Namen; diese Einträge werden heute als Fakt übersprungen bzw. nicht verglichen, ein späterer Eintrag könnte beim Installieren die geprüfte Datei überschreiben. (2) git: die Kollisionsprüfung (Groß-/Kleinschreibung, Datei/Ordner) läuft nur über die ausgewählten Dateien (≤ 1 MB); die Installation checkt den ganzen Pfad aus — ein 2-MB-Zwilling `skill.md` neben dem geprüften `SKILL.md` gewänne auf Windows; Datei `a` neben Ordner `A/b` endet als 502 statt 422.
Fundstelle: `src/sammlung/inhalt.ts` (leseTarGz), `src/sammlung/quelle.ts` (holeGitInhalt, schreibeInhalt).
Auswirkung: Hoch — ein Paket- oder Repo-Autor könnte dem Prüflauf harmlosen und der Installation anderen Inhalt zeigen. Heute folgenlos für den Bestand (kein Katalogeintrag ist über F-2b-2a installiert), aber Voraussetzung für einen Merge.
Maßnahme: (1) jeden Tar-Eintrag fail-closed abweisen (422), den pruefePfad ablehnt, der absolut ist oder einen Backslash trägt; (2) bei git Schreibweisen-Duplikate und ordnerKonflikt über ALLE ls-tree-Einträge vor dem Checkout prüfen (422); Rot-Tests: Tar mit `./`, `//`, Punkt am Ende, Backslash; git mit zu großem Zwilling und Datei neben Ordner; danach kurzer Delta-Review nur über inhalt.ts/quelle.ts.
Status: offen.
Feature/Run: Entdeckt: F45 F-2b-2a (code-reviewer, Delta-Review), 12.10.2026 — nach der einen Korrekturrunde; Abbruchregel des Auftrags (echter Bruch → Stopp).
Nachtrag (Runde 2 und 3, Freigabe Stefan, 12.10.2026): umgesetzt — Tarball fail-closed (`./`, `//`, Punkt/Leerzeichen am Segmentende, Backslash, absolut, Laufwerk, `..`, Gerätename, Zwillinge in Schreibweise/Unicode-Form, Datei zugleich Ordner, `node_modules` in jeder Tiefe „bundleDependencies nicht unterstützt“, nur POSIX-ustar: L/K/g und pax path/linkpath „Tar-Format nicht unterstützt“); git: Zwillinge und Datei/Ordner über den GANZEN gepinnten Baum vor dem Checkout (Prüflauf und Skill-Installation); der Prüfbericht trägt die geprüfte Dateiliste mit sha256, die Installation vergleicht sie nach dem Schreiben (Pflicht-Rückruf `pruefeInhalt`, Abweichung 422). Delta-Review Runde 2: git dicht, npm offen (`node_modules`-Ausnahme); Runde 3: git dicht, npm weiter ein echter Bruch — der eigene Tar-Leser löst Bytes anders auf als node-tar: (1) Ende schon nach dem ersten Nullblock (node-tar: zwei), (2) Kopf-Typen `N`/`X` (Alt-GNU-Langpfad, alter pax-Kopf) übersprungen statt abgewiesen, (3) pax-Datensätze nach Länge statt nach Zeilenende zerlegt, (4) zwei pax-Köpfe hintereinander ersetzt statt zusammengeführt, (5) ustar-Präfix: Version `00` nicht geprüft, nicht-leere Bytes 345–500 bei leerem Präfix; (6) Ursache: die Ausnahme `<paket>/node_modules` im Abgleich hängt an der Gleichheit der beiden Leser; (7) pax-size mit `Number()` zu großzügig (gering); (8) Vergleichstest gegen npms eigenes node-tar fehlt; (9) Hinweis: hochgezogene Abhängigkeiten werden nie inhaltlich geprüft — „installiert = geprüft“ gilt nur für das Paket selbst.
Rückfallebene (Auftrag Runde 3): jede npm-Installation (MCP) nach Prüfung ist gesperrt — Route 409 „npm-Installation nach Prüfung noch nicht freigegeben, F-1075“, im Freigabedialog Sperrgrund und „Installieren“ deaktiviert, der Bericht bleibt sichtbar; Skills über git bleiben installierbar. Nur Gates, die die Installationsmechanik prüfen, setzen `npmInstallationNachPruefung` (WS-5a, F-2b-2 (f)); Gate F-2b-2 (i) prüft die Sperre ohne Schalter.
Rest (Maßnahme F-2b-2b): (a) Ausnahme `<paket>/node_modules` an verschachtelte Lockfile-Einträge `node_modules/<paket>/node_modules/<dep>` binden (nur genau diese Namen, sonst Abbruch) — schließt die Klasse der Leser-Abweichungen; (b) Leser als Positivliste (Typen `0`/NUL/`5`/`x`, genau ein pax-Kopf, pax-Zeilen wie node-tar, Nullblock-Ende wie node-tar, ustar `ustar\0`+`00`, leeres Präfix = Nullbytes, pax-size nur Ziffern); (c) Vergleichstest gegen npms node-tar (`strip:1`) mit vergleicheInhalt; danach die Sperre aufheben.
Status: offen (P1, Rest), zugeordnet F45 F-2b-2b.
Nachtrag (F45 F-2b-2b, 13.10.2026, Entscheidung Stefan 12.10.2026 nach Challenger claude/599): **Variante C „Prüfen, was npm selbst schreibt“** statt Rest (a)–(c). Befund des Challengers mit dem npm des Repos (11.18.0, Node 24) per Test bestätigt (`src/ressourcen/npm-echt.test.ts`, echte .tgz, offline): npm entpackt `package/node_modules/hidden/index.js` auch ohne bundleDependencies nach `node_modules/<paket>/node_modules/hidden/` ohne Lockfile-Eintrag, verwirft Symlinks, bei doppeltem Eintrag gewinnt der letzte. Die eigentliche Lücke war die Ausnahme `ohne: ['node_modules']` in `vergleicheInhalt`. Umgesetzt: (1) eine gemeinsame Funktion `installiereNpmPaketInOrdner` (`src/ressourcen/installation.ts`) für Prüflauf und Installation — leerer Ordner (sonst 422, Advisor F3), package.json der Wurzel, genau `npm install <paket>@<version> --prefix <ordner> --ignore-scripts --save-exact --no-audit --no-fund` (zusätzlich `npm_config_ignore_scripts=true` in der Umgebung, Advisor F4), Lockfile `node_modules/<paket>` version + integrity = angezeigt, jede weitere Abhängigkeit aus der Registry (`resolved` https, `integrity`, kein `link`; sonst 422 — Entscheidung im Plan v2 dokumentiert, von Stefan umkehrbar), `node_modules`/Scope/Paketordner echte Verzeichnisse, kein `<paketOrdner>/node_modules` (422 „verschachtelte Abhängigkeiten oder bundleDependencies im Paketordner nicht unterstützt (F-1075)“); (2) `holeNpmInhalt` installiert damit in `<wurzel>/install` (Zeitgrenze 300 s), liest den Paketordner per lstat von der Platte (Symlink/Junction → 422, Einträge gedeckelt), Filter/Neutralisierung/Dateiliste wie bisher, entfernt `install/` vor dem Modelllauf; `npm pack`, `sriSha512` und der eigene Tar-Leser (`leseTarGz`, `pruefeTarName`) samt Tests entfernt; (3) `vergleicheInhalt` ohne Ausnahme; (4) Rückfallebene aufgehoben (`NPM_SPERRE`, Schalter `npmInstallationNachPruefung` entfernt). Gate F-2b-2 (h)/(i) umgebaut (gemeinsame Funktion, Prüflauf → Bericht → Installation 200, Argv gleich bis auf den Ordner; verschachtelt → Prüflauf Fehlerstand + Installation 422; Inhalt ≠ Bericht → 422). Echter Nachweis context7-mcp 4.3.0 (Prüflauf + Installation gegen eine Temp-installWurzel): `features/F45/nachweise/f2b2b/`. Bekannte Grenzen (Advisor F8/F9): die Integrity-Bindung des Prüflaufs läuft nur noch über das Lockfile (Annahme wie F-786: npm prüft das Tarball gegen die Registry-Integrity); dass ein Tarball Symlinks oder doppelte Einträge trug, ist kein Fakt mehr (npm verwirft bzw. überschreibt still — geprüft wird der Stand auf der Platte). Hochgezogene Abhängigkeiten werden weiterhin nicht inhaltlich geprüft (9). Pakete mit verschachtelten Abhängigkeiten → F-1078.
Status: erledigt (F45 F-2b-2b, 13.10.2026).

**F-1084** · `PROCESS_IMPROVEMENT` · P3 · erledigt
Titel: Teile eines Baus entstanden vor dem fertigen Advisor-Pass.
Beschreibung: In B2a-2 wurden Teile gebaut, bevor der erste Advisor-Pass fertig war (folgenlos, v2 freigegeben).
Fundstelle: `features/F45/plan-b2a2.md` (Abschnitt „Advisor-Pass“, Hinweis Prozess).
Auswirkung: Gering — folgenlos; ohne Regel hängt die Reihenfolge am Ermessen der bauenden Sitzung.
Maßnahme: Bauauftrag nennt „Bau erst nach freigegebenem Plan“ ausdrücklich.
Status: erledigt (umgesetzt ab B2a-3): Der Auftrag F45 B2a-3 nennt die Regel im Ablauf; gebaut wurde erst nach dem Nachpass „freigegeben mit Hinweisen“ (`features/F45/plan-b2a3.md`).
Feature/Run: F45 B2a-2.

**F-1089** · `BUG` · P2 · erledigt
Titel: fuehreGitAsync meldet Zeitgrenze teils als Erfolg mit leerer Ausgabe (Node-execFile-Wettlauf).
Beschreibung: Vorbestehend seit F45 B1a-1. `fuehreGitAsync` (`src/git-starter`) nutzte die Option `timeout` von `execFile`. Beim Ablauf zerstört Node zuerst stdout/stderr und tötet dann das Kind; war git schon mit 0 beendet, kommt der Rückruf ohne Fehler mit leerer Ausgabe — `{ code: 0, stdout: '' }` ohne `abbruch`. Ein leeres `rev-parse --show-toplevel`, `ls-tree` oder `diff-index` galt damit als Erfolg; im geprüften Stand des Reviews war ein still falscher Fingerabdruck möglich, bei den Arbeitsordner-Aufrufen ein falsch gelesener Zustand. Entdeckt durch B2a-3b in CI/Cloud (Node 24 Linux: `review-stand.test.ts` Zeitgrenze-Test, async-Teil meldete „kein eigenes Git-Repo“ statt „Zeitgrenze“), reproduziert auch mit main `2fd1ac5`; lokal (Windows) 49 von 50 Aufrufen mit `zeitgrenzeMs: 1`.
Fundstelle: `src/git-starter/index.ts` (`fuehreGitAsync`); Aufrufer `src/review-stand/index.ts`, `src/arbeitsordner/index.ts`.
Auswirkung: Mittel — ein Abbruch sah aus wie ein Erfolg (stille Fehlinformation statt sichtbarer Grund).
Maßnahme: Eigener Merker statt `execFile`-`timeout`: ein Zeitgeber setzt `zeitAbgelaufen`, baut stdout/stderr ab (sonst hielte ein Enkelprozess mit geerbten Pipes, z. B. ein Hook, `'close'` auf — Code-Review-Nachpass) und beendet das Kind; ist der Merker gesetzt, ist das Ergebnis immer `{ code: null, stdout: '', abbruch: 'zeitgrenze' }`, gleich wie der Rückruf aussieht. Tests in `src/git-starter/git-starter.test.ts`: hängendes git (`hash-object --stdin`, stdin offen, 50 ms) → `zeitgrenze` (war schon vorher grün); Wettlauf 50 Aufrufe mit 1 ms → nie code 0 mit leerer Ausgabe (vorher rot, 49/50); `post-checkout`-Hook mit `sleep 5`, Zeitgrenze 1 s → Ergebnis unter 3 s (vor dem Pipe-Abbau rot, ≈ 5,8 s). Offen (vorbestehend): synchroner Wurf von `execFile` lehnt das Promise ab („wirft nie“ gilt dann nicht); keine SIGKILL-Nachfrist.
Status: erledigt (F45 B2a-3b, Korrekturrunde Challenger, 13.10.2026).
Feature/Run: Entdeckt: F45 B2a-3b (CI/Cloud), 13.10.2026.

**F-1101** · `HARNESS_IMPROVEMENT` · P1 · erledigt
Titel: Claude-Code-Selbstupdate sperrt jeden Lauf bis zur erneuerten Startfreigabe.
Beschreibung: Ein Selbstupdate von Claude Code verschiebt die installierte Version weg von `werkzeugVersionDeklariert` in `startvorlagen/ai-workforce.json`. Danach verweigert jeder Lauf mit „Drift im Gültigkeitsschlüssel“ (E-188), bis die Startfreigabe erneuert ist. Beobachtet am 14.10.2026 beim Update von 2.1.296 auf 2.1.299.
Fundstelle: `docs/harness/startfreigabe-erneuern.md`; Update auf 2.1.299 am 14.10.2026.
Auswirkung: Hoch — die Workforce steht ohne Vorwarnung still, bis Stefan die Schritte 1–7 der Anleitung abgeschlossen hat.
Maßnahme: Autoupdate abschalten oder die Version pinnen. Der Leitstand soll die Abweichung vor dem Laufstart verständlich anzeigen.
Status: erledigt (Startfreigabe-Erneuerung CLI 2.1.300, Branch `f45/startfreigabe-cli-2-1-300`, 15.10.2026). Zweiter Vorfall: Selbstupdate 2.1.299 → 2.1.300 am 15.10.2026, jeder Lauf mit E-188 verweigert. Danach hat Stefan das automatische Update per Benutzer-Umgebungsvariable `DISABLE_AUTOUPDATER=1` abgeschaltet (`claude doctor`: disabled); die Anleitung nennt das im Abschnitt „Automatisches Update“ (Prüfung mit `claude doctor`, Update nur bewusst mit `claude update`, danach sofort die Anleitung). Die Anzeige vor dem Laufstart besteht (Band „CLI-Version geändert“). Offene Beobachtung: ob die Version unter `C:\Program Files\claude\claude.exe` ab jetzt stehen bleibt — das ist keine eigene Kopie, sondern eine Verknüpfung auf die npm-global-Installation (F-087), die der Autoupdater bisher ersetzt hat. Springt `--version` trotz abgeschaltetem Autoupdater (wirkt nur in Prozessen, die nach `setx` gestartet sind), aktualisiert ein anderer Weg die Installation (dann neues Finding).
Feature/Run: Startfreigabe-Erneuerung CLI 2.1.299 (Branch `f45/startfreigabe-cli-2-1-299`), 14.10.2026.

**F-1102** · `PROCESS_IMPROVEMENT` · P2 · erledigt
Titel: `git add` mit falschem Pfad bricht in PowerShell-Blöcken nicht ab.
Beschreibung: In PowerShell-Terminal-Blöcken bricht ein `git add` mit falschem Pfad den Block nicht ab. Ohne Prüfung von `$LASTEXITCODE` und der gestagten Menge läuft der anschließende Commit mit unvollständigem oder leerem Index weiter.
Fundstelle: `docs/harness/startfreigabe-erneuern.md` Schritt 5 (Z. ~95, `git add` auf zwei Ordner).
Auswirkung: Mittel — ein Commit kann unbemerkt unvollständig oder leer sein (im Autorisierungs-Repo: Startfreigabe verweist auf nicht committete Dateien).
Maßnahme: Terminal-Blöcke stagen explizite Pfade, prüfen `$LASTEXITCODE` und die Anzahl in `git diff --cached --name-only`. Offen als Teil dieses Befunds: `docs/harness/startfreigabe-erneuern.md` Schritt 5 entsprechend nachziehen (noch nicht geändert).
Status: erledigt (Startfreigabe-Erneuerung CLI 2.1.300, 15.10.2026). Schritt 5 der Anleitung staged die zwei Dateien mit expliziten Pfaden, prüft vorher einen leeren Index, `$LASTEXITCODE` nach `add` und `commit` und genau zwei Einträge in `git diff --cached --name-only` (beide Pfade enthalten), gibt am Ende den Commit-Hash aus. Der Block steht in `& { … }`, damit ein `throw` auch beim Einfügen ins Terminal den Rest abbricht. So angewandt im Autorisierungs-Repo (`4fd0cfa`). Nach dem Prüfpass zusätzlich: Wächter für `$AUTH`/`$NEU`, `Push-Location … -ErrorAction Stop` mit `Pop-Location` in `finally`, Pfade aus der Ausgabe von Schritt 4 abgeleitet, `$global:COMMIT`, Weg zurück nach Abbruch (`git restore --staged`); Schritt 7.4 nennt explizite Pfade. Fundstelle und Maßnahme oben beschreiben den Stand vor der Änderung (Schritt 5 steht jetzt bei Z. ~132).
Feature/Run: Startfreigabe-Erneuerung CLI 2.1.299 (Branch `f45/startfreigabe-cli-2-1-299`), 14.10.2026.

**F-1105** · `HARNESS_IMPROVEMENT` · P2 · erledigt
Titel: Advisor-Ausgabeschema ohne Durchsetzung im Claude-Code-Aufruf.
Beschreibung: Das Gateway gibt claude-code kein Ausgabeschema mit (Regel 4b hält jeden claude-code-Schritt mit `output_schema` an). Die Hilfe der Claude-Code-CLI (2.1.299) nennt `--json-schema`; geprüft ist die Option nicht. Plan B2b-1b prüft das Advisor-Ergebnis deshalb beim Lesen im Kern (JSON im Text, Validator), nicht im Aufruf.
Fundstelle: `src/claude-code-gateway/`, `src/workflow/index.ts` (Regel 4b), `features/F45/plan-b2b1.md` (O1).
Auswirkung: Mittel — ein Advisor, der den JSON-Vertrag bricht, hält den Ablauf an (Ausweg „Prüfer wiederholen“), statt am Aufruf abgewiesen zu werden.
Maßnahme: Spike `--json-schema` mit echtem Lauf (F-638/F-1086: ein Schema erst nach echtem Lauf mergen); bei Erfolg Regel 4b für claude-code öffnen.
Status: erledigt (F45 B2b-1b-1, 14.10.2026). Spike mit echten Advisor-Läufen (CLI 2.1.299, `claude-sonnet-5`, Nachweis `features/F45/nachweise/b2b1b/spike-f1105.md` mit Rohströmen): das Schema mit `$schema` (Draft 2020-12) lehnt die CLI sofort ab („no schema with key or ref …“); ohne `$schema`/`$id` liefert sie `structured_output` schemagerecht, `result` trägt dasselbe JSON — auch mit dem Prompt über stdin wie im Produkt (Advisor-Pass A3); die CLI fügt dafür das Werkzeug `StructuredOutput` hinzu (Init-Gate unberührt). Umgesetzt: `baueClaudeJsonSchema` + `AufrufEingaben.jsonSchema` → `--json-schema` vor `-p` (src/claude-code-gateway), gesetzt in `loeseAusfuehrungsEingabenAuf` aus dem output_schema des Schritts (Body-Feld abgelehnt); Regel 4b als Allowlist `CLAUDE_CODE_AUSGABESCHEMAS` = nur `ergebnis-architecture-advisor` (andere Schemata an claude-code brauchen je einen eigenen echten Lauf, z. B. der Claude-Reviewer F-910 (2)); der Kern prüft beim Lesen weiter (`validiereErgebnisAdvisor`), weil das Verhalten der CLI bei einem Schemaverfehlen nicht belegt ist. Gate `check-f45-b2b1-rueckweg` (c0b) Schemafassung = Spike-Fassung (SHA-256), (c1) Argv mit `--json-schema`, (c6) zweite Sicherung der Allowlist.
Feature/Run: Entdeckt: F45 B2b-1 (Plan, Advisor-Pass O1), 14.10.2026.

**F-1106** · `PROCESS_IMPROVEMENT` · P2 · erledigt
Titel: Freigabedialog vor der Ausführung zeigt Plan und Advisor-Befunde nicht.
Beschreibung: Die ZWINGEND-Freigabe vor der Ausführung soll in hoch Plan v2 prüfen; der Freigabedialog zeigt aber nur Empfehlung und Architektur-Entscheidung, keinen Plan und keine Advisor-Befunde.
Fundstelle: `public/leitstand/views/workflows.js` (Freigabedialog), Advisor-Pass B2b-1 B14.
Auswirkung: Mittel — Stefan gibt Plan v2 frei, ohne ihn im Dialog zu sehen.
Maßnahme: Mit B2b-1b: Plan (letzte Fassung) und Advisor-Befunde im Freigabedialog der Ausführung zeigen, oder bewusst annehmen.
Status: offen — mit B2b-1b-2 (Teilung 14.10.2026, `features/F45/plan-b2b1b.md`): Freigabe-Seite zeigt Plan (v1/v2) und Advisor-Befunde, auch vor dem Architekten v2 (Advisor-Pass A9) und mit „Kein Plan v2: <Grund>“ bei gesperrtem Rückweg (Entscheidung Stefan A2). Nachtrag 14.10.2026: B2b-1b-2 geteilt (Stefan, `features/F45/plan-b2b1b2.md`, M3); die Anzeige folgt mit **B2b-1b-2b** (Projektion `planFreigabe`, Karten, Knopf „Advisor wiederholen“ = Rest F-1104 (4), Render-Nachweis). Seit 2a nennt der gespeicherte Halt-Grund der Freigabe „Plan v2: …“, „Kein Plan v2: …“ bzw. „Plan v2 liegt vor …“ und verweist auf die Läufe; Plan und Befunde selbst sieht Stefan bis 2b nur im Lauf-Detail. Nachtrag: erledigt (F45 B2b-1b-2b, 15.10.2026, `features/F45/plan-b2b1b2.md` Plan 2b). GET /api/workflows/<id> trägt bei einem Freigabe-Halt der Plan-Stufe `planFreigabe` (art plan_v2 vor dem Architekten v2 bzw. ausfuehrung; Plan genau aus der Eingabe der Ausführung, Advisor-Ergebnis mit Befunden, zusammengeführte Entscheidungen, `rueckweg`, `advisorIstAnlass`, `keinPlanV2`; Zwischenspeicher je Plan-/Advisor-Lauf); die Freigabe-Seite zeigt davor „Plan, den du freigibst“ (Plan v1/v2) bzw. „Plan v1 — wird überarbeitet“ mit dem Satz „Plan v1 lässt sich hier nicht unverändert freigeben, weil der Advisor Änderungen verlangt. Mit „Ablehnen“ stoppst du den Ablauf.“ (Textkorrektur nach dem qa-Befund, Challenger 15.10.2026) und „Befunde des Advisors“ (Urteil, Schwere, Fundstelle, Korrekturrichtung; „gehen an den Architekten“, „in Plan v2 eingearbeitet“ nur für den Anlass-Lauf, „Kein Plan v2: …“). Gate f45-b2b1 (pf1)–(pf5), View-Tests, Render-Nachweis `features/F45/nachweise/b2b1b2b/`.
Feature/Run: Entdeckt: F45 B2b-1 (Advisor-Pass B14), 14.10.2026.

**F-1108** · `PROCESS_IMPROVEMENT` · P3 · erledigt
Titel: Satz der Plan-Stufe nur im gespeicherten Halt-Grund, nicht in allen Lagen.
Beschreibung: Seit B2b-1b-2a hängt der Kern an den Grund eines Freigabe-Halts „Plan v2: …“, „Advisor: … Kein Plan v2: …“ oder „Plan v2 liegt vor …“ (`planStufenSatz`). Die Projektion `naechster` (`baueNaechsterProjektion`) rechnet den Grund ohne diesen Satz neu; Abläufe, deren Advisor-Nachlauf auf GESTOPPT traf oder die aus 1b-1 schon an der Freigabe der Ausführung stehen, tragen ihn nicht (Delta-Advisor D2, Advisor-Pass M2).
Fundstelle: `scripts/leitstand-server.mjs` (`mitPlanStufenSatz`, `baueNaechsterProjektion`), `scripts/leitstand/f35-ws3-adjust-automatik.mjs` (`planStufenSatz`).
Auswirkung: Niedrig — in diesen Lagen fehlt der Hinweis; nichts läuft still weiter.
Maßnahme: Mit B2b-1b-2b: Projektion `planFreigabe` mit `keinPlanV2` für alle Fälle „Urteil ≠ FREIGEGEBEN, kein Rückweg“.
Status: offen. Nachtrag: erledigt (F45 B2b-1b-2b, 15.10.2026). `ermittleKeinPlanV2` (Automatik-Datei, rein) rechnet „Kein Plan v2: <Grund>“ zur Lesezeit für jede Lage „Urteil ≠ FREIGEGEBEN, kein Rückweg für diesen Advisor-Lauf“: gesperrt ⇒ Grund aus `ermittlePlanRueckweg` (Grenze, kein Architekt davor, Plan-Stufe verbraucht — auch nach einem erneut geprüften Plan v2), sonst „Plan v2 wurde für dieses Advisor-Ergebnis nicht ausgelöst (der Ablauf war angehalten oder stammt aus der Zeit vor Plan v2)“ — deckt Nachlauf auf GESTOPPT + Reparatur und Bestand 1b-1. Der gespeicherte Halt-Grund bleibt wie in 2a. Gate (pf4)(pf5), (pf2) mit (c12), Unit-Tests.
Feature/Run: Entdeckt: F45 B2b-1b-2a (Advisor-Pass M2, Delta-Advisor D2), 14.10.2026.

**F-1117** · `PROCESS_IMPROVEMENT` · P2 · erledigt
Titel: B2b-2b-2 — was der qa-Schritt für den Live-Betrieb noch braucht (aus dem qa-Prüfpass B2b-2b-1).
Beschreibung: B2b-2b-1 baut den qa-Schritt ohne Vorlagenänderung (Bestand bitgleich). Vor dem Einhängen in `workflow-vorlagen/standard.json`/`hoch.json`: (1) GET …/abnahme zeigt den Halt am qa nicht — `reviewHaltGrund` nur am Review-Cursor, `reviewWiederholbar` nur für den code-reviewer, `prueferWiederholbar` im Lauf-Detail nur für den Advisor; „Prüfer wiederholen“ für den qa gibt es bis dahin nur per POST. (2) Ein qa mit BEREIT/BEREIT_NACH_KORREKTUR und KRITISCH/HOCH endet ABGESCHLOSSEN ohne Hinweis — kommt mit `qaErgebnis.schwere_bei_bereit`. (3) `setzePrueferZurueck` startet nichts: der Knopf muss wie beim Review danach POST …/starten auslösen. (4) Die Rolleninstruktion nennt Änderungsübersicht, Prüfergebnis und Review-Ergebnis als Eingaben — die Vorlage muss alle drei mitgeben (`aenderungsuebersicht-@`, `pruefergebnis-@`, `ergebnis-@<review>`). (5) Die Rolle qa erlaubt `codex`, `ergebnis-qa` ist nur an claude-code real belegt — die Vorlagen legen claude-code fest (sonst Codex-Spike). (6) Ein dauerhaft ausfallender qa sperrt die Annahme (ANGENOMMEN nur nach ABGESCHLOSSEN, wie beim Review) — Ausweg bewusst entscheiden. (7) Abnahme-Karte „Prüfung aus Nutzersicht“, Vorab-Block und Blick mit den qa-Befunden (Advisor A8: bei Halt an der Grenze mit qa BLOCKIERT soll Stefan die qa-Befunde sehen), Rollenkreis (qa als Satellit „jetzt“). (8) Harness-Zuordnung: Agent qa `ersetzt_durch` Schritt qa mit `fehlt_im_ablauf` für fast-lane und Bestand, DoD-Begründungen, design-guardian „B2b“ → „B3“ (F-1114 (6)). (9) Router-Tests (`src/router/router.test.ts`) erwarten heute die Schrittzahl der Vorlagen.
Fundstelle: `scripts/leitstand-server.mjs` (GET …/abnahme, Lauf-Detail, `setzePrueferZurueck`), `public/leitstand/views/workflow-abnahme.js`, `public/leitstand/rollen-kreis.js`, `workflow-vorlagen/`, `harness-abgleich/standard.json`, `src/router/router.test.ts`.
Auswirkung: Mittel — ohne diese Punkte nähme Stefan nach dem Einhängen ab, ohne die qa-Befunde zu sehen.
Maßnahme: Umfang von B2b-2b-2 (`docs/projekt/fixpaket-f45.md`), mit design-guardian und Render-Nachweis.
Status: offen. Nachtrag F45 B2b-2b-2 (15.10.2026): erledigt — (1)(2) GET …/abnahme `qaErgebnis` (Status je Lage inkl. `laeuft`, `halt` und `grund` beim Halt am qa, Urteil, Befunde, Testfälle, `schwere_bei_bereit` — bewusst wie beim Review nur bei BEREIT, `zaehleSchwereBeiBereit`, Advisor A12) und `qaWiederholbar`; das Lauf-Detail bleibt unverändert (`prueferWiederholbar` steuert „Advisor wiederholen“; der qa-Halt wird wie der Review-Halt über die Abnahme derselben Seite bedient, Advisor O1). (3) Knopf „Prüfung aus Nutzersicht wiederholen“ setzt zurück und startet (POST …/pruefer-wiederholen, danach …/starten). (4)(5) Vorlagen mit vier Eingaben, claude-code. (6) Entscheidung Challenger: dieselben Auswege wie beim Review (wiederholen, reparieren, Anpassung, Ablehnen), kein Annehmen ohne qa — ein Satz in der Halt-Notiz; eine Reparaturfassung kann den AUTOMATISCH-qa-Schritt entfernen (`ermittleFreigabeAbschwaechungen` prüft nur ZWINGEND), der Harness-Abgleich nennt das in `fehlt_im_ablauf` (Advisor A13). (7) Karte, Vorab-Block, Blick, Rollen-Kreis (Satellit qa). (8) Harness-Zuordnung, design-guardian „B3“. (9) Router-Tests. Rest: F-1118, F-1119.
Feature/Run: Entdeckt: F45 B2b-2b-1 (qa-Prüfpass „Lücken für 2b-2“, Advisor A8/A9), 15.10.2026.

**F-1120** · `PROCESS_IMPROVEMENT` · P2 · erledigt
Titel: Bricht `npm run check` lokal wegen Speicher ab, bleiben Gate-Fehler bis zur Cloud-Prüfung unentdeckt.
Beschreibung: Die Bauaufträge erlauben genau einen Lauf von `npm run check`; bricht er wegen Speicher ab (F45 B2b-2b-2: nach Lint beendet), gibt es keinen zweiten Versuch, die Cloud prüft. So blieb `scripts/check-f17-rollenvertrag.mjs` AK1 bis zur Cloud-Prüfung rot (heute zweimal; diesmal durch den Test-Helfer `pruefeQaSchritt(schritt, ausfuehrung: string, review: string)` in `src/router/router.test.ts` — die Heuristik hielt die Typannotation `ausfuehrung:` für einen Objektschlüssel mit Rollennamen). Die Gate-Kette selbst braucht wenig Speicher, die Unit-Test-Suite (`npm run test`) den meisten. Nebenbefund (P3): die AK1-Heuristik erkennt Typannotationen in Parameterlisten nicht.
Fundstelle: `package.json` (Skript `check`), `scripts/check-f17-rollenvertrag.mjs` (AK1), Bauaufträge (Ablauf „einmal npm run check“).
Auswirkung: Mittel — ein roter Gate-Befund erscheint erst vor dem Merge und kostet eine zusätzliche Runde.
Maßnahme: Skript `check:gates` in `package.json` (dieselbe Gate-Kette wie `check`, ohne `npm run test`) als Rückfallebene in den Bauaufträgen: bricht `npm run check` wegen Speicher ab, läuft `check:gates` und die betroffenen Unit-Tests einzeln. Optional (P3): AK1 ignoriert Bezeichner, auf die ein Typ folgt (`name: string`), oder prüft nur Objektliterale. Das Skript wird nicht in F45 B2b-2b-2 angelegt (Auftrag).
Status: erledigt (F45 B2b-3a, 15.10.2026): Skript `check:gates` in `package.json` — die Gate-Kette von `check` ohne `npm run test` und ohne den Nachlauf; `check` ruft jetzt `npm run check:gates && npm run test && node scripts/aufraeumen-nachlauf.mjs` (eine Quelle, keine Kopie). Rückfallebene zentral in `docs/harness/HARNESS-OVERVIEW.md` (Arbeitsweise, Punkt 5) beschrieben statt in jedem Bauauftrag (bewusste Abweichung von der Maßnahme). Der optionale P3-Teil (AK1-Heuristik in `scripts/check-f17-rollenvertrag.mjs`) ist nicht umgesetzt.
Feature/Run: Entdeckt: F45 B2b-2b-2 (Cloud-Prüfung vor dem Merge, check-f17 AK1), 15.10.2026.

**F-015** · `TECH_DEBT` · P4 · erledigt (F45 W2c-1)
Titel: `ARCHITECTURE.md` Kopfkommentar trägt noch `[FÜLLUNG — GANZE DATEI]`.
Beschreibung: Alle acht Inhaltsabschnitte sind befüllt, aber der Meta-Kommentar (Zeile 1–18) wurde nicht entfernt.
Fundstelle: `ARCHITECTURE.md:1–18`.
Auswirkung: kosmetisch — kein Platzhalter im eigentlichen Inhalt, aber irreführend für den nächsten Leser.
Maßnahme: Kopfkommentar bei Gelegenheit entfernen.
Feature/Run: Verifikation AF-F001-Planung, Schritt A, 28.08.2026.
Nachtrag (28.10.2026, F45 W2c-1): Marker `[FÜLLUNG — GANZE DATEI]` mit Erklärung und die erledigte Vorlagenanweisung „Fülle sie erst …“ entfernt (Platz für den Satz zur Ratsche unter dem Deckel). Die Aufteilungsregel im Kommentar bleibt — sie ist eine echte Regel, kein Platzhalter. Damit erledigt.

**F-261** · `HARNESS_IMPROVEMENT` · P3 · erledigt
Titel: Das Oberflächen-Gate nagelt Bezeichner fest, nicht nur Verhalten —
und eine seiner Pfadregeln ist zu locker.
Beschreibung: Zwei Beobachtungen aus dem WS-3b-Bau, beide am Muster F-215
(„das Gate diktiert die Form des Codes, statt ihn zu prüfen"). (a) Mehrere
Fälle in `scripts/check-f15-workflow-oberflaeche.mjs` suchen nach lokalen
Bezeichnern (`faelligMarke`, `cursorMarke`, `aktualisiereWorkflowBedienung`,
`REPARIERBARE_SCHRITT_STATUS`). Eine reine Umbenennung ohne jede
Verhaltensänderung macht das Gate rot. Das ist der Preis einer
Quelltextprüfung ohne Rendern und war beim Bau tragbar — der Umbau musste
NICHT gegen das Gate arbeiten —, aber es wächst mit jeder Zusage. (b) Die
Pfadregel in Fall (e) prüft auf `/api/workflows/<irgendwas>/starten` und
schlägt deshalb auch bei `/starten-weg` noch an: bei der Rotkalibrierung real
aufgefallen, weil die erste Manipulation den Endpunkt umbenannte und die
Zusage grün blieb.
Fundstelle: `scripts/check-f15-workflow-oberflaeche.mjs`, Fälle (e), (g), (h).
Auswirkung: (a) Reibung bei jedem Refactoring der Oberfläche. (b) Ein
umbenannter Endpunkt fällt nicht auf, solange der alte Name Teil des neuen
ist — der Fall ist konstruiert, aber die Zusage sagt mehr, als sie prüft.
Empfohlene Maßnahme: (b) die Pfadregel am Ende verankern (Backtick oder
Anführungszeichen direkt hinter dem Endpunktnamen). (a) beim nächsten
größeren Umbau der Ansicht entscheiden, ob ein Rendertest (Kopfloser Browser,
wie im WS-3b-Nachweis) die Quelltextfälle ablösen soll — dann prüft das Gate
Verhalten statt Bezeichner. Beides eigene Iteration.
Status: erledigt (27.10.2026, F45 W2b-1): `scripts/check-f15-workflow-oberflaeche.mjs` gelöscht (Syntax über Biome `public/**/*.js`, Verhalten über die View-Tests; Restgrenzen in `features/F45/w2-gate-inventur.md` „Stand W2b-1“).
Feature/Run: F15 WS-3b, 10.09.2026 (Rotkalibrierung).

**F-563** · `PROCESS_IMPROVEMENT` · P3 · erledigt
Titel: Textgenaue Quelltext-Zusagen in Gates brechen bei harmlosen Signaturänderungen.
Beschreibung: Erster `npm run check`-Lauf endete mit Exit 1 in check-f15 (d) nach einer harmlosen Änderung.
Fundstelle: `scripts/check-f15-workflow-oberflaeche.mjs` (d).
Auswirkung: Falsch-rote Gates.
Maßnahme: Verhaltensprüfung statt Textvergleich, wenn das Gate wieder angefasst wird.
Status: erledigt (27.10.2026, F45 W2b-1): Gate gelöscht, siehe F-261.
Feature/Run: fix/jarvis-latenz, 21.09.2026. Quelle: claude/296.

**F-912** · `PROCESS_IMPROVEMENT` · P2 · erledigt
Titel: Der Coach legt in bestehenden Projekten keine Feature-Akte an; der Scope wird direkt zum Auftrag.
Beschreibung: Im bestehenden Projekt macht der Coach aus dem Scope direkt einen Auftrag (`baueAuftragAusScope`), ohne eine Feature-Akte anzulegen.
Fundstelle: `src/product-coach/index.ts` (baueAuftragAusScope), `public/leitstand/auftrag-aus-scope.js`.
Auswirkung: Coach-Ideen erscheinen nicht als Feature im Board, AK werden nicht in einer Akte gepflegt, und F35 „Bauen aus der Akte“ greift nicht.
Maßnahme: Fixpaket Arbeitsfähigkeit, B5.
Status: erledigt durch F45 B5a-2 (24.10.2026) — Server in B5a-1 (POST /api/features legt aus einem Coach-Scope eine Akte mit Status ENTWURF an, `baueFeatureAkteAusScope`), Anzeige in B5a-2: „Als Feature anlegen“ unter jedem Coach-Entwurf (`public/leitstand/views/chat.js` `renderFeatureAnlage`, `legeFeatureAn` in `api.js`), Ergebnis mit neuer ID, Link ins Detail und Git-Block, 400/409/422 wörtlich; der Auftragsweg bleibt unverändert. Rest: Rückverweis Turn → Akte (Doppelanlage nach Neuladen) F-1182.
Feature/Run: Entdeckt: Challenger, Fragen Stefan 01.10.2026.

**F-917** · `TECH_DEBT` · P2 · erledigt (a)
Titel: Prioritäts-Kanban (E2): Auftrag WS-3a und Abgleich §4 Punkt 4 widersprechen sich.
Beschreibung: Der Auftrag WS-3a verlangt „Kanban · Priorität“ als „kommt“ ohne Daten; so ist es gebaut. `docs/design/abgleich-f725.md` §4 Punkt 4 (verbindlich über E-F44-1) sagt dagegen: Das Prioritäts-Kanban zeigt die echten Prioritäten der Findings, Features stehen unter „ohne Priorität“, nur das Ziehen ist deaktiviert. design-guardian hat die Abweichung im Prüfpass WS-3a als „hoch (Verfahren)“ gemeldet.
Fundstelle: `public/leitstand/views/workboard.js` (baueFesteBedienung, `#workboard-modi`); `docs/design/abgleich-f725.md` §4 Punkt 4.
Auswirkung: Mittel — ohne Entscheidung bleibt eine dokumentierte Zusage unerfüllt; die Daten lädt die Seite bereits.
Maßnahme: Stefan entscheidet: (a) in WS-3b ein lesendes Prioritäts-Kanban (Spalten P0–P4 und „ohne Priorität“ aus den ungefilterten Workitems, Ziehen und Auswahlfelder „kommt“) oder (b) §4 Punkt 4 anpassen und E2 bleibt „kommt“.
Status: entschieden (Stefan, 01.10.2026): E2 „Kanban · Priorität“ bleibt in F44 „kommt“ (deaktiviert, keine Daten). Ein nur lesendes Prioritäts-Kanban ist Kandidat für das Fixpaket „Arbeitsfähigkeit“ (Baustein B5 Feature-Fluss) — dort neu bewerten. Vermerk in `docs/design/abgleich-f725.md` §4 Punkt 4 und `features/F44/feature.md` (Stand WS-3a). Vermerk (01.10.2026): entschieden: wird gebaut (Stefan, 01.10.2026), Fixpaket ‚Arbeitsfähigkeit‘ Baustein B5. Erst lesend, dann Ziehen = Prioritätsänderung mit Pflichtbegründung; Features bekommen ein Prioritätsfeld in der Akte. Vermerk 24.10.2026 (E-KANBAN = A, Challenger, Bauauftrag B5b-1): erfüllt (a) — lesendes Prioritäts-Kanban P0–P4 + „ohne Priorität“ in B5b-2, erweitert: Features erscheinen mit ihrer Zeile „Priorität:“ aus der Akte (Daten seit B5b-1a); Ziehen bleibt Teil 2 (B5b′). Erledigt (a) 25.10.2026 (F45 B5b-2c-1, `features/F45/plan-b5b2c1-v2.md`): „Kanban · Priorität“ in der Entwicklung lesend — Spalten P0 · P1 · P2 · P3 · ohne Priorität, offene Features mit der Priorität ihrer Akte (aus GET /api/roadmap), offene Befunde mit ihrer, Filter Typ und „Pflege & Fixes“. Abweichung von „P0–P4“: P4 (Alt-Bestand, keine neue Vergabe, Gate f21 (5)) steht in „P3 · Später“ mit Chip „P4“ und „davon n P4 (Alt-Bestand)“ (Advisor `features/F45/advisor-b5b2c.md` A2, Challenger 25.10.2026). Ziehen bleibt Teil 2 (B5b′).
Feature/Run: Entdeckt: Prüfpass F44 WS-3a (design-guardian), 01.10.2026.

**F-979** · `PROCESS_IMPROVEMENT` · P3 · erledigt
Titel: „Bereit zum Sichern“ ist kein Zustand zwischen Abnahme und Merge.
Beschreibung: Nach der Abnahme gibt es keinen eigenen Zustand für „abgenommen, noch nicht committet/gemergt“.
Fundstelle: Lebenszyklus eines Eintrags (Abnahme → Merge).
Auswirkung: Gering — der Schritt zum Sichern ist im Leitstand nicht sichtbar.
Maßnahme: Fixpaket „Arbeitsfähigkeit“.
Status: offen. Nachtrag F45 B2b-4a-1 (19.10.2026, `features/F45/plan-b2b4a1.md`): Server-Teil gebaut — „Bereit zum Sichern“ als abgeleiteter Zustand ohne neuen Workflow-Status (`scripts/leitstand/ablauf-sichern.mjs` `leiteSichernLageAb`: abgeschlossen + eigener Arbeitsordner + geänderte Dateien bzw. Commits noch nicht auf main; Grenze F-1155), geliefert als Feld `ablauf.sichern` von GET `/api/code?workflow=<id>`; Gate `scripts/check-f45-b2b4a1-sichern.mjs`. Die Anzeige (Karte, Abnahme, Workboard) folgt in B2b-4a-2, erst dann erledigt.
Erledigt (F45 B2b-4a-2b-2, 20.10.2026, `features/F45/plan-b2b4a2b2.md`): Abschnitt „Bereit zum Sichern“ in der Karte „Wo gearbeitet wird“ (Abnahme- und Ablaufseite bei ABGESCHLOSSEN/GESTOPPT) und im Workboard „abgeschlossen“ (`public/leitstand/views/ablauf-sichern-anzeige.js`, Stand je Ablauf `public/leitstand/ablauf-code-stand.js`): Schritte commit · push bzw. Grund · Pull Request und Merge im Web, danach Aufräumen; Gate `scripts/check-f45-b2b4a2b2-anzeige.mjs`. Rest: kein eigener Eintrag „Bereit zum Sichern“ in „Deine Entscheidungen“ (Filter bleibt „kommt“, `attention-daten.js`); „noch nicht auf main“ bleibt nach Push/Merge bis zum Aufräumen stehen (F-1155).

**F-991** · `BUG` · P2 · erledigt
Titel: Persona, Startfläche und Entwicklung zählen offene Abnahmen nicht.
Beschreibung: Seit F46 D2 stehen offene Abnahmen unter „Deine Entscheidungen“, im Zähler der Seitenleiste, in der Kennzahl der Übersicht und in Jarvis' „was braucht mich“. Der Persona-Zustand („wartet auf dich“), der Warte-Hinweis der Startfläche und die Spalte „Braucht dich“ der Entwicklung lesen weiter nur `filtereAttentionWorkflows` (Freigabe, Rückfrage).
Fundstelle: `public/leitstand/persona-state.js:36`, `public/leitstand/views/start.js:66`, `public/leitstand/entwicklung-daten.js:149`.
Auswirkung: Mittel — der Zähler zeigt eine wartende Abnahme, die Persona meldet „nichts“.
Maßnahme: dieselbe Auswahl über `filtereOffeneAbnahmen` bzw. `baueEntscheidungen`; Gate f28-persona und Tests mitziehen. Bewusst nicht in D2 (Umfang: Liste, Zähler, Entscheiden-Seite).
Status: erledigt durch F45 B5a-2 (24.10.2026) — `zaehleWartendeAufStefan` (`attention-daten.js`, Freigaben, Rückfragen und offene Abnahmen aus `baueEntscheidungen`) zählt für Persona (`persona-state.js`) und Wartezeile der Startfläche (`views/start.js`); `spalteVon` (`entwicklung-daten.js`) setzt bei `filtereOffeneAbnahmen` „Braucht dich“; Gate `check-f28-persona` (2) mit Fall und Gegenprobe, Gate `check-f45-b5a2-akte-anzeige` (e), Tests in `attention-daten.test.mjs` und `entwicklung-daten.test.mjs`.
Feature/Run: Entdeckt: F46 D2, Prüfpass qa 5 / code-reviewer 2.

**F-995** · `TECH_DEBT` · P3 · erledigt
Titel: Die Leseroute der Feature-Akte liefert die Entscheidungen nicht.
Beschreibung: Das Detail eines Features soll unter „Verlauf“ die Entscheidungen der Akte (E-…) zeigen (abgleich-f46.md §4.6). GET …/features/<id>/akte liefert nur Titel, Status, Ziel, Nicht-Ziele und AKs; D3 durfte den Server nicht ändern. Die Kachel steht deshalb als „kommt“.
Fundstelle: `scripts/leitstand/routen-f35.mjs` (`leseFeatureAkteFuerAnzeige`), `src/feature-auftrag/index.ts` (`leseFeatureAkteAnzeige`); Anzeige `public/leitstand/views/workboard-detail.js` (`verlaufBlock`).
Auswirkung: Gering — die Entscheidungen bleiben über „Akte in VS Code öffnen“ erreichbar.
Maßnahme: Die lesende Projektion um den Abschnitt „Entscheidungen“ (Zeilen mit E-…) erweitern, eine Regel mit dem Bau-Auftrag; dann die Kachel echt (D4 oder Fixpaket).
Status: erledigt durch F45 B5a-2 (24.10.2026) — Server in B5a-1 (GET …/akte liefert `entscheidungen[]` und `hash`), Anzeige in B5a-2: Kachel „Entscheidungen“ in „Verlauf“ (`views/workboard-detail.js` `entscheidungenInhalt`): Zahl, die letzten fünf in Aktenreihenfolge (Kennung als Code, Text ohne Fettung), Link auf die ganze Akte; leer ⇒ „Die Akte nennt noch keine Entscheidungen.“, nie mehr „kommt“.
Feature/Run: Entdeckt: F46 D3.

**F-1010** · `BUG` · P2 · erledigt
Titel: Roadmap und Akten widersprechen sich.
Beschreibung: docs/projekt/roadmap.json führt F30 ohne Akte (Anzeige „keine_akte“), die Akte AF-F001 fehlt in der Roadmap, und M3/M4 stehen auf ABGESCHLOSSEN, obwohl F18, F20, F21, F22 und F25 auf FEATURE_GATE stehen — die Kennzahl „Features abgenommen“ passt nicht zum Meilensteinstatus. Die IDs (jede Akte in genau einem Meilenstein, jeder Roadmap-Eintrag mit Akte) prüft seit F46 D0 `scripts/check-akte-meilenstein.mjs`; offen war nur die Status-Regel R1 (Meilensteinstatus gegen den Status der Akten) — Satz berichtigt 24.10.2026 (F-1175; vorher: „Kein Gate prüft diese Übereinstimmung.“).
Fundstelle: docs/projekt/roadmap.json, features/*/feature.md (Status), scripts/check-akte-meilenstein.mjs, scripts/leitstand/routen-roadmap.mjs.
Auswirkung: Mittel — die Roadmap zeigt einen anderen Stand als die Akten.
Maßnahme: F45 B5b: Gate Akte ↔ Roadmap, Bereinigungsliste zur Bestätigung durch Stefan.
Status: erledigt (F45 B5b-2c-2-AB, 25.10.2026). Nachtrag 24.10.2026 (F45 B5b-1a, `features/F45/plan-b5b1-v2.md`): R1 ist jetzt Gate (`src/workboard/roadmap-regeln.ts` in `check-akte-meilenstein`): M3/F18 und M4/F20, F21, F22, F25 stehen als begründete Ausnahmen in `docs/projekt/roadmap-ausnahmen.json` („Bereinigung offen — Bestätigung Stefan (Bereinigungsliste)“); F30 hat eine Akte (ENTWURF), AF-F001 bleibt Ausnahme ohne_meilenstein. Rest: Bereinigungsliste mit Bestätigung je Eintrag (B5b-1b) und Anzeige (B5b-2). Nachtrag 24.10.2026 (F45 B5b-1b-1, `features/F45/plan-b5b1b-v2.md`): B5b-1b geteilt; die Bereinigungsliste mit Bestätigung je Eintrag kommt mit B5b-1b-2 („Meilenstein → LAEUFT“ nur bei genau einer R1-Abweichung, B4). PUT `…/planung` blockiert jedes Verschieben, das R1 neu verletzt (422 „erst bereinigen“), siehe F-1187. Nachtrag 24.10.2026 (F45 B5b-1b-2, `features/F45/plan-b5b1b2-v2.md`): Mechanik erledigt — GET `/api/roadmap/bereinigung` listet jede R1-Abweichung mit den erlaubten Entscheidungen, POST `/api/roadmap/bereinigung/bestaetigen` bestätigt genau einen Eintrag („Feature → ABGESCHLOSSEN“: Akte, Status-Wort in STATUS.md, Ausnahme entfernt; „Meilenstein → LAEUFT“ nur bei genau einer Abweichung, dynamisch), Gate `check-f45-b5b1b2-bereinigung`. Status bleibt offen (Advisor `features/F45/advisor-b5b1b2.md` C5): die fünf Einträge bestätigt Stefan einzeln, die Anzeige kommt mit B5b-2. Erledigt 25.10.2026: die R1-Bereinigung M3/F18, M4/F20, F21, F22, F25 hat Stefan bestätigt (#383, `docs/projekt/roadmap-ausnahmen.json` leer); F30 hat seit B5b-1a eine Akte (ENTWURF), AF-F001 bleibt eine deklarierte Ausnahme ohne Meilenstein (Gate `check-akte-meilenstein`); die Bereinigungsliste ist gebaut (B5b-1b-2, B5b-2b-2) und schlägt „Feature → ABGESCHLOSSEN“ als Standard vor, wenn möglich (B5b-2c-2-AB).
Feature/Run: Entdeckt: Challenge F45, 03.10.2026.

**F-1087** · `TECH_DEBT` · P2 · erledigt
Titel: Workboard-„Sichern“ zeigt nach einem Ablauf im Arbeitsordner die Änderungen des Projektordners statt des Worktrees.
Beschreibung: Der Block „Sichern“ im Workboard (Phase „abgeschlossen“) und in #/code liest GET /api/code, und die Code-Projektion (`baueCodeProjektion({ repoWurzel })`) liest immer den Projektordner. Lief der Ablauf in seinem eigenen Arbeitsordner (Worktree, Branch `wf/<id>`, E-F45-3 = A), stehen die Änderungen dort — der Block nennt dann die Dateien, den Branch und den `cd`-Pfad des Projektordners, nicht des Ablaufs.
Fundstelle: `public/leitstand/views/workboard.js` (`renderTerminalBlock`), `scripts/leitstand/routen-code.mjs` (`baueCodeProjektion`), `scripts/leitstand-server.mjs` (GET /api/code).
Auswirkung: Mittel — die Befehle sind ausführbar, sichern aber das Falsche bzw. nichts; Stefan muss selbst wissen, wo der Ablauf gearbeitet hat.
Maßnahme: Mit B2b („Bereit zum Sichern“): Sichern je Ablauf aus dem Laufort (`ermittleLaufort`), cd auf den Worktree. In B2a-3b bewusst nicht gelöst (Auftrag).
Status: offen. Nachtrag F45 B2b-4a-1 (19.10.2026): Server-Teil gebaut — GET `/api/code` und `/api/code/diff` nehmen `?workflow=<id>` (keine neue Route): Formprüfung vor jedem Dateizugriff (`scripts/leitstand/kennung.mjs`, 400), unbekannt 404, Laufort über `ermittleLaufort` (Arbeitsordner aus dem Kontrollzustand, nie die id als Git-Argument oder cwd), Arbeitsordner nicht bereit ⇒ 409 mit `grund_schluessel` aus `arbeitsordnerGrund` ohne Kennung im Text; ohne Parameter bitgleich; Aufbau je Laufort geteilt (`codeProjektionLaufend` als Map). Gate `scripts/check-f45-b2b4a1-sichern.mjs` (b)–(d). Workboard und Abnahme nutzen den Parameter erst ab B2b-4a-2 (jeder Ablauf mit Arbeitsordner über `?workflow=`), erst dann erledigt.
Erledigt (F45 B2b-4a-2b-2, 20.10.2026): Workboard „abgeschlossen“ und Karte (Abnahme-/Ablaufseite) wählen die Quelle über `sichernQuelle` (`sichernFuerAblauf`) — jeder Ablauf mit eigenem Arbeitsordner (jeder Status außer `kein_bedarf`/`bestand`) liest GET `/api/code?workflow=<id>`, Befehle mit Ort und Branch des Arbeitsordners; nur `bestand` behält den Projektordner-Block. Rest: keiner.
Feature/Run: Entdeckt: F45 B2a-3b (Plan, Befunde vorab), 13.10.2026.

**F-1137** · `PROCESS_IMPROVEMENT` · P1 · erledigt durch F45 K
Titel: Wissensgrenze des Claude-Projekts durch state/findings.md.
Beschreibung: Das Claude-Projekt, das das Repo synchronisiert, stand bei 1,78 von 2,0 MB Wissensgrenze; `state/findings.md` allein hatte 1 597 930 B und wuchs um ≈ 40 KB/Tag, weil erledigte Einträge nie das Register verließen (Challenger, 17.10.2026).
Fundstelle: `state/findings.md`.
Auswirkung: Bald kein Platz mehr für Projektwissen im Claude-Projekt; jede Sitzung, die das Register liest, trägt den Ballast.
Maßnahme: F45 K: 413 erledigte Einträge (Status beginnt mit gelöst/behoben/erledigt/korrigiert, E-K-1) wörtlich nach `state/findings-archiv.md` verschoben; `state/findings.md` danach 907 536 B (−43 %). Archiv nur bei Bedarf lesen (CLAUDE.md). Wirkung auf das Claude-Projekt erst, wenn Stefan `state/findings-archiv.md` dort nicht synchronisiert. Künftig gesammelt nachziehen, sobald das Register wieder wächst.
Feature/Run: F45 K „Kontext-Diät“, Branch `f45/k-kontext-diaet`, 17.10.2026 (Plan `features/F45/plan-k-v2.md`).

**F-1138** · `PROCESS_IMPROVEMENT` · P2 · erledigt durch F45 K
Titel: ARCHITECTURE.md wuchs als Pflichtlektüre von 10 KB auf 40 KB.
Beschreibung: `ARCHITECTURE.md` ist Pflichtlektüre jeder Sitzung (CLAUDE.md) und wuchs vom 11.10. bis 17.10.2026 von ≈ 10 KB auf 40 094 B, getrieben von Detailabschnitten zum Rückfrage-Kanal (§3/§4); ≈ 7 000 Token mehr je Sitzung. Die Projektkarte kürzte §1 schon vorher auf 2000 Zeichen, die Rollen im Lauf sahen W1 und die Kanal-Grenzen nicht.
Fundstelle: `ARCHITECTURE.md`.
Auswirkung: Kontextkosten jeder Sitzung; Regeln im Rauschen der Herleitung.
Maßnahme: F45 K: Kern 17 332 B (Deckel 17 800 B) mit jeder Regel als Satz (Durchsetzungsgrad sichtbar); Detailtext wörtlich in `docs/architektur/` (module, kette, wachstumsbremse, lokale-dateien, arbeitsordner, rueckfrage-kanal); Gate `check-f45-k-kontext` (Deckel `scripts/architektur-kern.json`, nur senkbar; Verweise und Rückverweise; keine Versionsnummer in den Details).
Feature/Run: F45 K „Kontext-Diät“, Branch `f45/k-kontext-diaet`, 17.10.2026 (Plan `features/F45/plan-k-v2.md`, Advisor `features/F45/advisor-k.md`, `advisor-k-delta.md`).

**F-1141** · `HARNESS_IMPROVEMENT` · P2 · erledigt durch F45 B2b-3b-2b-2b-2b-1
Titel: commit-guard sperrt `git stash` nicht (nur `drop`/`clear`).
Beschreibung: Bei F45 K liefen versehentlich `git stash` und `git stash pop` durch (ohne Schaden). Der Hook sperrt nur `git stash drop|clear`; `stash`, `stash push`, `pop` und `apply` verändern den Arbeitsbaum ohne Freigabe und können bei einem Konflikt Arbeit verstecken.
Fundstelle: `.claude/hooks/commit-guard.cjs` (Kopf Z. 28, Sperrliste Z. 378 und Z. 410).
Auswirkung: Mittel — eine Sitzung kann ungefragt Änderungen aus dem Arbeitsbaum nehmen; zurück nur über `stash pop`.
Maßnahme: `git stash` außer `list`/`show` in `.claude/hooks/commit-guard.cjs` sperren, mit Gate-Fall. Die Hook-Änderung ändert den E-183-Hash und gehört deshalb zur Erneuerung der Startfreigabe.
Status: erledigt durch F45 B2b-3b-2b-2b-2b-1 (18.10.2026). Nachtrag: `.claude/hooks/commit-guard.cjs` sperrt jedes `git stash` außer `list`/`show` (`stashSegment`, Grund mit „Änderungen sichern über commit auf einem Branch (Stefan)“; `drop`/`clear` behalten den Grund „nicht umkehrbar“) — auch nackt, mit `git -C`/`git -c`, `git.exe`, in Ketten (`&&`, `;`, `||`, `|`, `&`), über `xargs`, `powershell -Command`, `cmd /c`, Heredoc in bash. Dazu `verbenVon`: Befehlsstelle auch nach einer Blockklammer `{` — die PowerShell-Kettenform `A; if ($?) { B }` (CLAUDE.md) war auch für die übrigen Regeln der Aufgabe 6 eine Lücke (`if ($?) { git reset --hard }`, `ForEach-Object { Remove-Item … -Recurse -Force }`). Tests `scripts/commit-guard.test.mjs` (Rot je Variante, Grün `git stash list`/`show -p`, `git commit -m "stash erklärt"`, `grep stash datei`, Ende-zu-Ende Bash und PowerShell); Mutationsproben an einer Kopie (Regel aus ⇒ Stash-Tests rot; Blockklammer aus ⇒ Block-Tests rot). Korrekturrunde (code-reviewer V1, qa L2/L3): `tokenisiere` entfernt eine schließende `}` am Token-Ende (ohne eigenes `{`), damit greift die Blockklammer auch ohne Leerzeichen (`if ($?) {git reset --hard}`); PowerShell-Here-Strings (`git commit -m @'…'@`) sind Fließtext, außer sie gehen per Pipe in eine Shell oder bleiben offen. Grenzen (Kopf des Hooks): `git log --grep stash` wird mitgesperrt (`--grep=stash` nicht), `if (Test-Path .claude) { git checkout x }` als Schreiben auf `.claude` mitgesperrt; offen bleiben Aliase, ein git-Programmpfad mit Leerzeichen, PowerShell-Zuweisung (`$r = git stash`), `$(git stash)`, `Start-Process`/`Invoke-Expression`, `--autostash`. Die Hook-Änderung ändert den E-183-Hash der Workforce — Startfreigabe nach `docs/harness/startfreigabe-erneuern.md` erneuern (Stefan). **Skelett bewusst nicht geändert:** `vorlagen/projekt-skelett/.claude/hooks/commit-guard.js` hat keine stash-Regel; Nachrüsten würde jede Projekt-Startfreigabe brechen — eigener Folgepunkt F-1150. Neue Projekte bekommen über `kopiereBaseline` den Hook der Installation (mit Regel).
Feature/Run: Entdeckt: F45 K (Challenger), 17.10.2026; eingetragen in F45 B2b-3b-2b-2b-2a, 18.10.2026.

**F-1143** · `BUG` · P1 · erledigt durch F45 B2b-3b-2b-2b-2a
Titel: Arbeitsordner bekommt unter Windows CRLF — E-183 lehnt jeden schreibenden Projektlauf ab.
Beschreibung: Mit `core.autocrlf=true` (Windows-Standard) checkte `git worktree add` den Arbeitsordner mit CRLF aus. E-183 (`ermittleIstZustand`/`pruefeStartbedingung1`, `src/invocation-policy/index.ts`) hasht bewusst die Rohbytes der Werkzeugkonfiguration und der Hook-Skripte; der Hash wich deshalb von der Baseline ab, die Vorbereitung endete FEHLGESCHLAGEN. Beleg im Nachweislauf: Baseline `a35ee4…` = LF, Arbeitsordner roh `f23228…`, als LF wieder gleich der Baseline. Betroffen seit B1a-1; der Reallauf R wäre daran gescheitert.
Fundstelle: `src/arbeitsordner/index.ts` (`bereiteArbeitsordnerVor`, beide `worktree add`); `src/invocation-policy/index.ts` (`ermittleIstZustand`, Rohbytes — unverändert, Invariante).
Auswirkung: Hoch — kein schreibender Projektlauf im Arbeitsordner möglich, sobald das Projekt `core.autocrlf=true` hat.
Maßnahme: Beide `worktree add` laufen mit `CHECKOUT_OHNE_UMWANDLUNG` = `-c core.autocrlf=false -c core.eol=lf` (`src/arbeitsordner/index.ts` Z. 63; Z. 434 Branch vorhanden, Z. 437 neuer Branch) — `core.eol=lf` nach code-reviewer/qa, weil Dateien mit `text`/`text=auto` ohne `eol` sonst `native` (Git für Windows: CRLF) bekämen. Zusätzlich trägt das Skelett `vorlagen/projekt-skelett/.gitattributes` (`* text=auto eol=lf`, byte-gleich aus dem Template; Nachrüsten legt sie nur an, wenn sie fehlt; wirkt erst nach dem Commit). Ein wiederaufgenommener Arbeitsordner mit CR in Werkzeugkonfiguration oder Hook (von vor dem Fix) bekommt im E-183-Grund den Rat „Arbeitsordner aufräumen“ und neu starten (`zeilenendenHinweis`, nur bei Wiederaufnahme — in einem frischen Ordner kommt CR nur noch aus dem Projekt, dort hülfe Aufräumen nicht). Tests in `src/arbeitsordner/arbeitsordner.test.ts` (echtes `pruefeStartbedingung1`, neuer und vorhandener Branch): „core.autocrlf=true im Projekt …“, „Projekt-.gitattributes `* text=auto` ohne eol und core.eol=crlf …“, „Wiederaufnahme eines CRLF-Arbeitsordners …“, „frisch angelegter Arbeitsordner mit CR aus dem Projekt (`eol=crlf`) …“ (kein Rat), „Wiederaufnahme eines LF-Arbeitsordners mit rotem E-183: kein Zeilenenden-Rat“, „Wiederaufnahme eines alten Arbeitsordners, nur der Hook mit CRLF: Rat erwartet …“. Mutationsproben: ohne beide Optionen beide Checkout-Tests rot („Hash der Werkzeugkonfiguration weicht von der Baseline ab (E-183)“, auch nur am Weg „Branch vorhanden“), ohne `core.eol=lf` der text=auto-Test rot, ohne Hinweis der Wiederaufnahme-Test rot, ohne Wiederaufnahme-Bedingung der `eol=crlf`-Test rot, Rat ohne CR-Prüfung der LF-Wiederaufnahme-Test rot, ohne Hooks der Hook-Test rot. Ein nachträglich von Hand auf CRLF umgeschriebener Hook in einem LF-Arbeitsordner hält schon an der Sauberkeitsprüfung (Größe ≠ Index; Rat dort ebenfalls „Arbeitsordner aufräumen“). Gate `scripts/check-f45-b2b3b2b2b2a-crlf.mjs`; Doku `docs/architektur/arbeitsordner.md`. Grenzen: ein `eol=crlf`-Attribut oder ein Filter des Projekts auf `.claude/**` wirkt weiter; spätere Checkouts im Arbeitsordner (checkout/restore/stash/reset) folgen der gemeinsamen Repo-Konfiguration (der Server macht keine); ein schon angelegter CRLF-Arbeitsordner bleibt rot, bis er aufgeräumt ist (F-1147). **Abwägung, Entscheidung Stefan offen:** die Startfreigabe hasht die Arbeitskopie des Projektordners, der Arbeitsordner trägt den Commit. Hat git die Werkzeugkonfiguration oder Hooks der Arbeitskopie unter `core.autocrlf=true` ohne `eol=lf` mit CRLF ausgecheckt (Klon, Pull, Checkout), war der Lauf vor dem Fix zufällig grün und scheitert jetzt an E-183, ohne eigenen Rat (ein Rat wurde im Review verworfen, weil er nicht verlässlich hilft). Abhilfe von Hand: `.gitattributes` mit `eol=lf` committen, `.claude/` neu auschecken (Dateien löschen, `git checkout -- .claude`), dann die Startfreigabe nach `docs/harness/startfreigabe-erneuern.md` erneuern. `haushaltsbuch2` ist nicht betroffen (Baseline `a35ee4…` = LF).
Status: erledigt durch F45 B2b-3b-2b-2b-2a (18.10.2026).
Feature/Run: Entdeckt: Nachweislauf Rückfrage-Kanal (Stefan, Projekt `haushaltsbuch2`), 17.10.2026.

**F-1144** · `BUG` · P2 · erledigt durch F45 B2b-3b-2b-2b-2b-2
Titel: Freigabeseite „Darf der Ablauf starten?“ zeigt den Auftragstext des Schritts nicht.
Beschreibung: Im Nachweislauf sah Stefan auf der Freigabe vor dem Start nicht, welchen Auftrag der Schritt bekommt — weder in der Hauptansicht noch unter „Technischer Ablauf“. Er gibt damit einen Lauf frei, dessen Inhalt er nicht sieht.
Fundstelle: `public/leitstand/views/workflow-entscheiden.js` (Freigabe, `entscheiden.freigabe.titel` in `public/leitstand/i18n/de.js` Z. 1869).
Auswirkung: Mittel — Freigabe ohne Sicht auf den Inhalt.
Maßnahme: Auftragstext des Schritts auf der Freigabeseite anzeigen (vollständig, wörtlich), mit Render-Nachweis.
Status: erledigt durch F45 B2b-3b-2b-2b-2b-2 (18.10.2026). Karte „Auftrag für diesen Schritt“ vor „Was startet“ (nach den Plan-Karten) (`renderAuftragKarte`, `public/leitstand/views/workflow-entscheiden.js`): Auftragstext wörtlich als `<pre>` (escaped, Umbrüche erhalten); über 12 Zeilen oder 1200 Zeichen Vorschau plus `<details data-klappe="auftrag">` „Ganzer Auftrag (m Zeichen)“, bleibt über den Poll offen (`setzeHtml` in `views/workflows.js`); ohne Text amber Hinweis „nicht lesbar … sonst ablehnen“. Quelle: bestehende Projektion GET /api/workflows/<id>, Feld `auftragstext` (`leseAuftragProjektion` ersetzt `leseEinrichtungProjektion` zeilenneutral, keine neue Route; Gate f45-b2a2 (d)). Grenze, auf der Karte gesagt („So wurde der Auftrag angelegt. Beim Start ergänzt das System ihn je nach Rolle …“): angezeigt wird der Auftragstext des Auftrags; je nach Rolle ergänzt oder umrahmt ihn das System beim Start (Regeln, Arbeitspaket, Abnahmekriterien, in einer Korrekturrunde Stefans Anpassungswünsche; Architekt, Advisor, qa, scout mit eigenem Rahmen) — der zusammengesetzte Prompt entsteht erst beim Start (`starteWorkflowSchritt`) und wird nicht vorab gezeigt (code-reviewer V9, qa 4). Render-Nachweis `features/F45/nachweise/b2b3b2b2b2b2/render/freigabe-auftrag-*` (eingeklappt, aufgeklappt, nach einem echten Neuzeichnen — qa 1) und `…/render/freigabe-fehlt-*`.
Feature/Run: Entdeckt: Nachweislauf Rückfrage-Kanal (Stefan), 17.10.2026.

**F-1145** · `BUG` · P2 · erledigt durch F45 B2b-3b-2b-2b-2b-2
Titel: „Was tun“ bei `nicht_von_stefan` nennt immer Frist und Sichtbarkeit, auch bei Ablehnung durch Regel oder Pfadgrenze.
Beschreibung: Der Abgleich-Grund `nicht_von_stefan` fällt immer in die Klasse `automatisch`; deren „Was tun“ rät, die Sichtbarkeit zu prüfen und innerhalb der Frist zu antworten. In Lauf B lehnte aber die Pfadgrenze ab (auto_deny „Pfad außerhalb des Arbeitsordners“, `features/F45/nachweise/b2b3b2b2b/auswertung-haushaltsbuch2-b-577ea346-ed76-4fad-a58a-26c0cdbe0c59.md` Z. 60 und Z. 96) — der Rat führt in die Irre.
Fundstelle: `public/leitstand/rueckfrage-abnahme.js` Z. 30 (`ABGLEICH_KLASSE`), `public/leitstand/i18n/de.js` Z. 3135–3137 (`abnahme.kanal.klasse.automatisch.*`, ebenso en/tr/ru).
Auswirkung: Mittel — Stefan bekommt einen falschen Handlungsrat.
Maßnahme: Je Ursache unterscheiden (Regel/Pfadgrenze, Frist abgelaufen, Lauf-Ende, Protokollgrenze), z. B. aus `rueckfrage_zaehlung` (`automatisch` vs. `abgelaufen`/`lauf_ende`); Texte in de/en/tr/ru.
Status: erledigt durch F45 B2b-3b-2b-2b-2b-2 (18.10.2026). `automatischUrsache` (`public/leitstand/rueckfrage-abnahme.js`) aus der Zählung: genau ein Feld > 0 unter `automatisch` (ohne den Überlauf)/`abgelaufen` ⇒ Regel/Frist; der Überlauf (`protokollUeberlauf`: Summe der sechs Felder über `PROTOKOLL_GRENZE` = `MAX_PROTOKOLL_JE_LAUF`, im Test verankert — Einträge + offene bleiben ≤ Grenze) wird herausgerechnet, denn eine Ablehnung über der Grenze hat keinen Eintrag, ergibt im Abgleich `kein_eintrag` (Klasse `echt`) und ist nie die Ursache von `nicht_von_stefan` (code-reviewer 1); „Protokollgrenze“ erscheint deshalb als Zusatz bei `automatisch` und `echt`; ebenso „Lauf-Ende“: Zählung und Protokoll werden vor `beendeLauf` gelesen, `lauf_ende` sind beim Lesen offene Rückfragen ohne Eintrag (code-reviewer Nachpass 1); keins, mehrere oder unlesbar ⇒ neutraler Text, der Regel und Frist bzw. Lauf-Ende nennt (`abnahme.kanal.klasse.automatisch.*` umgeschrieben). Je Ursache Text und „Was tun“ (`URSACHE_SCHLUESSEL`, `abnahme.kanal.ursache.*`, de/en/tr/ru). Gilt in Lauf-Notiz, Sichtungs-Notiz und Abnahmeseite (eine Quelle `grundHtml`). Lauf B (automatisch 1) ⇒ Regel-Text, Testfall mit den Daten der Auswertung B (`rueckfrage-abnahme.test.mjs`). Render-Nachweis `…/render/wastun-lauf-b-*` und `…/render/abnahme-lauf-b-*`. Grenze: „Regel“ fasst alle Ablehnungen mit Eintrag ohne Rückfrage zusammen (Pfadgrenze, Werkzeug, Steuerzeichen, doppelte ID, zu viele offene) — die Zählung trennt sie nicht.
Feature/Run: Entdeckt: Nachweislauf Rückfrage-Kanal, Lauf B (Stefan), 17.10.2026.

**F-1146** · `PROCESS_IMPROVEMENT` · P2 · erledigt durch F45 B2b-3b-2b-2b-2b-2
Titel: Abnahmeseite zeigt den Block „Rückfrage-Kanal im Lauf“ nicht selbst.
Beschreibung: Der Block (Zählung, bestätigte Ablehnungen, Ursache, R3) steht im Lauf-Detail (F-1128 (3), Nachtrag 2a-3), nicht auf der Abnahmeseite. Stefan fand ihn im Nachweislauf nicht; für einen Nicht-Entwickler ist der Weg über das Lauf-Detail nicht erkennbar.
Fundstelle: `public/leitstand/rueckfrage-abnahme.js` (Block `abnahme.kanal.titel`, Z. 125 ff.), Abnahmeansicht in `public/leitstand/views/`.
Auswirkung: Mittel — die Kanal-Auskunft wird bei der Abnahme übersehen.
Maßnahme: Block auf der Abnahmeseite selbst zeigen (oder deutlicher Verweis), mit Render-Nachweis.
Status: erledigt durch F45 B2b-3b-2b-2b-2b-2 (18.10.2026). Die Seite „entscheidbar“ zeigt den Block des Ausführungslaufs (mit Grund oder R3 unter den Kacheln, sonst nach „Selbst ausprobieren“ — design-guardian 2) (`renderKanalImLauf` in `public/leitstand/views/workflow-abnahme.js` ruft `renderRueckfrageAbnahme(kanal, { mitUrsache: true })` — dieselbe Funktion wie im Lauf-Detail, hier mit dem Grund jeder Klasse, weil keine Fehler-Notiz darüber steht); geladen in `views/workflows.js` (`kanalDerAbnahme`) aus GET /api/laeufe/<laufId> über `kanalDerSichtung` (ein Abruf je Lauf, Rückzug nach Fehler), Lauf aus `aenderungsuebersicht.laufId`; lädt ⇒ Zeile „wird geladen“; nicht ladbar ⇒ Hinweis mit Link „Lauf ansehen“ ins Lauf-Detail (qa 2), beim Neuversuch nach dem Rückzug ohne Flackern (code-reviewer V2). Im Lauf-Detail unverändert. Im Block „vorab“ (Sichtungs-Halt) nicht — dort trägt die Sichtungs-Notiz die Ursache. Render-Nachweis `…/render/abnahme-kanal-a-*` (Zählung von Lauf A), `…/render/abnahme-lauf-b-*`, `…/render/abnahme-fehler-*`.
Feature/Run: Entdeckt: Nachweislauf Rückfrage-Kanal (Stefan), 17.10.2026.

**F-1157** · `TECH_DEBT` · P2 · erledigt
Titel: Auflagen aus dem Prüfpass von B2b-4a-1 an B2b-4a-2 (Anzeige „Bereit zum Sichern“).
Beschreibung: Die Ableitung (`scripts/leitstand/ablauf-sichern.mjs`) liefert bewusst nur die Lage; der Befehlsblock und die Anzeige in 4a-2 müssen: (1) node_modules ohne `.gitignore` berücksichtigen — nach `npm ci` im Arbeitsordner eines Fremdprojekts zählt `git status --untracked-files=all` node_modules/ als neu (Tausende Einträge, `gekappt`, „bereit (commit)“ ohne Änderung des Ablaufs; bei sehr großer Ausgabe `nichtBestimmbar`); Anzahl und Kappung zeigen, kein pauschales Stagen (qa 6, code-reviewer 1); (2) vor einem Push-Block `branch.losgeloest`, `branch.name` gegen `ablauf.arbeitsordner.branch` und `remoteWebUrl.origin` prüfen — die Ableitung meldet auch bei losgelöstem HEAD oder fremdem Branch „bereit (push)“ (qa 5, Advisor-Delta 4a-1 15); (3) Befehle nur aus `ablauf.arbeitsordner.pfad/branch` bauen, nie aus der zurückgegebenen `workflowId` (code-reviewer 5); (4) GET …/code?workflow= nur für die geöffnete Karte bzw. Abnahme abrufen, nie im Poll für alle Karten — je Abruf ≈ 10 Git-Prozesse und synchrones Lesen der Checkpoint-Ketten (qa 7); (5) 409 mit `grund_schluessel` ist eine Lage (z. B. `aufgeraeumt` als normaler Endzustand), kein Fehler; bei 400/404 ist der Schlüssel `null` (qa 8); (6) GESTOPPT mit offenen Änderungen auf Aufräumen/Verwerfen verweisen (`offeneAenderungen` wird geliefert; qa 2); (7) Text je Grund übersetzen und `keinArbeitsordner` für `kein_bedarf` (nichts zu sichern) und `bestand` (Projektordner) trennen (code-reviewer 9); (8) Advisor-Delta 4a 8–20, soweit sie C betreffen, und Befund 6 (jeder Ablauf mit Arbeitsordner über `?workflow=`).
Fundstelle: `scripts/leitstand/ablauf-sichern.mjs`, `public/leitstand/code-daten.js` (`sicherBefehle`), `public/leitstand/views/workboard.js`, `public/leitstand/views/workflows.js`, `public/leitstand/views/arbeitsordner-anzeige.js`.
Auswirkung: Mittel — ohne die Auflagen zeigte 4a-2 irreführende oder zu breite Befehle.
Maßnahme: in den Plan von B2b-4a-2 übernehmen.
Status: teilweise — (1), (2), (3), (7) erledigt auf Regelebene (F45 B2b-4a-2b-1, 20.10.2026, `features/F45/plan-b2b4a2b.md`):
(1) `scripts/leitstand/routen-code.mjs` `leseDateien` nimmt neue, ungetrackte Dateien unter node_modules (Regel `istNodeModulesPfad` in
`public/leitstand/code-daten.js`) vor der Kappung heraus und meldet ihre Anzahl (`dateien.nodeModules`); getrackte/gestagte bleiben; kein
Block stagt sie; #/code zeigt „node_modules ausgelassen – fehlt in .gitignore“ nur bei ausgelassenen Dateien; `ablauf.sichern` zählt sie
nicht mehr ⇒ ein Arbeitsordner nur mit node_modules ist nicht „bereit (commit)“. (2)/(3) `ablaufSicherBefehle`: Ort und Branch nur aus
`ablauf.arbeitsordner`, Branch-Prüfung (losgelöst, main, fremder Branch) vor jedem Block, push nur bei origin und Commits noch nicht auf
main bzw. commit-Block davor, unabhängig von der Kappung; origin nicht lesbar ⇒ sichtbarer Hinweis. (7) `sichernQuelle` trennt
`kein_bedarf` (nichts zu sichern) und `bestand` (Projektordner); Gründe/Hinweise in de/en/tr/ru. Gate `scripts/check-f45-b2b4a2b1-regeln.mjs`.
Rest: (4), (5), (6), (8) und die Anzeige der Regeln in Karte/Abnahme/Workboard folgen in B2b-4a-2b-2; Grenze von (1): übersteigt die
Ausgabe von `git status` den Puffer, bleibt `nichtBestimmbar`.
Erledigt (F45 B2b-4a-2b-2, 20.10.2026, `features/F45/plan-b2b4a2b2.md`, Advisor `advisor-b2b4a2b2.md`): (4) Stand je Ablauf
`public/leitstand/ablauf-code-stand.js` — Abruf nur beim Zeichnen der geöffneten Karte/Abnahme bzw. des Workboard-Details „abgeschlossen“,
je Neuladen-Schlüssel (V1) einmal, Fehlschlag zählt, Ablaufseite nur auf der Detailroute, Projektwechsel verwirft alles; neu nur über
„Aktualisieren“. (5) 409 mit `grund_schluessel` ist eine Lage ohne Fehlerfarbe (`aufgeraeumt` = Endzustand), 409 ohne Schlüssel, 400/404,
200 ohne Feld `ablauf` (älterer Server, „Leitstand neu starten“) sind Fehler. (6) GESTOPPT mit offenen Änderungen ⇒ „Weg: Aufräumen — mit
„Änderungen verwerfen““, nur Commits ⇒ eigener Text, 0/0 ⇒ „Nichts offen“, unlesbar ⇒ eigener Text. (8) Aufräumen-Art aus
`aufraeumenMoeglich` (Delta 8, Bauauflage 3), V1, Branch/origin (13), Kartensignatur `sichernHtml`/`ohneKnopf` (14), Workboard-Delegation
(15), Köpfe (16), Befund 6 über `sichernQuelle`. Gate `scripts/check-f45-b2b4a2b2-anzeige.mjs` (a)–(h). Rest (Grenzen, im Plan): kein
automatisches Neuladen bei Rückkehr auf dieselbe Karte („Aktualisieren“); das Workboard frischt nach „abgeschlossen“ nicht auf
(Bauauflage 6); der Verweis „Knopf unter den Aktionen“ hat kein Sprungziel; bei GESTOPPT mit unlesbarem git fehlt der node_modules-Satz
(Server liefert dort `nichtAbgeschlossen`).
Feature/Run: Entdeckt: F45 B2b-4a-1 (code-reviewer, qa), 19.10.2026.

**F-1160** · `PROCESS_IMPROVEMENT` · P3 · erledigt
Titel: Challenger-Commit-Block prüfte „NICHT GESTAGT“ mit `git status --short` und brach fälschlich ab.
Beschreibung: Der Commit-Block des Challengers prüfte nach dem gezielten Stagen, ob noch etwas „NICHT GESTAGT“ ist, mit `git status --short` — das listet auch Gestagtes; der Block brach deshalb ab, obwohl alles richtig gestagt war.
Fundstelle: Commit-Block des Challengers (Freigabe/Commit nach einer Iteration).
Auswirkung: Gering — Fehlabbruch, kein falscher Commit.
Maßnahme: Regel: Nicht Gestagtes über `git diff --name-only` (geänderte, nicht gestagte) plus `git ls-files --others --exclude-standard` (neue, unverfolgte) prüfen, nie über `git status --short`.
Status: erledigt — Regel angewandt ab 19.10.2026.
Feature/Run: Entdeckt: F45 B2b-4a-2a (Commit durch den Challenger), 19.10.2026; eingetragen F45 B2b-4a-2b-1, 20.10.2026.

**F-1174** · `BUG` · P2 · erledigt
Titel: Test „Zeitgrenze 0“ in `vorschlag.test.ts` wackelt unter paralleler Testausführung.
Beschreibung: Der Fall „Abbruch durch die Zeitgrenze ⇒ null“ (`src/faehigkeiten/vorschlag.test.ts:299`) setzt die Zeitgrenze 0 und erwartet den Abbruch. Unter `--test-concurrency=4` endet `git` gelegentlich vor dem Timer; das Ergebnis ist dann `[true, true]` statt `null`.
Fundstelle: `src/faehigkeiten/vorschlag.test.ts:299` (`pruefeZielIgnoriert` mit Zeitgrenze 0).
Auswirkung: Mittel — ein roter Testlauf ohne Codeänderung (CLAUDE.md, Falle „einmalig ohne erkennbaren Grund“); untergräbt das Vertrauen in `npm run check`.
Maßnahme: einen sicher langsamen Aufruf bzw. einen injizierbaren Starter verwenden oder den Fall streichen (src/git-starter testet den Abbruch selbst).
Status: erledigt (27.10.2026, F45 W2b-1): Code-Fehler, kein Testfehler — `fuehreGitAsync` startete git auch bei Zeitgrenze 0 (Timer ≥ 1 ms verlor gegen ein schnelles git, PR-CI Linux `[true, true]`). Jetzt `!(zeitgrenzeMs > 0)` ⇒ sofort `{ code: null, abbruch: 'zeitgrenze' }` ohne Start; Test `git-starter.test.ts` (setImmediate-Race, auf dem alten Code rot). `vorschlag.test.ts` unverändert.
Feature/Run: Entdeckt: Challenger, 23.10.2026 (FB-2-Prüfung).

**F-1175** · `PROCESS_IMPROVEMENT` · P3 · erledigt
Titel: Text von F-1010 „Kein Gate prüft“ ist überholt.
Beschreibung: F-1010 sagt „Kein Gate prüft diese Übereinstimmung“. `scripts/check-akte-meilenstein.mjs` prüft seit F46 D0 die IDs (Akte ↔ Meilenstein); offen ist nur die Status-Regel R1 (Meilensteinstatus gegen den Status der Akten).
Fundstelle: `state/findings.md` (F-1010), `scripts/check-akte-meilenstein.mjs`.
Auswirkung: Gering — der Befund beschreibt einen größeren Rest, als offen ist.
Maßnahme: in B5b-1 F-1010 berichtigen (offen nur R1).
Status: erledigt (24.10.2026, F45 B5b-1a): F-1010 berichtigt — „Kein Gate prüft …“ ersetzt durch den Stand (IDs seit F46 D0, R1 seit B5b-1a).
Feature/Run: Entdeckt: Challenger, 23.10.2026 (Bauauftrag F45 B5a-1).

**F-1176** · `BUG` · P3 · erledigt
Titel: Gate verbietet Akten ohne Meilenstein, die Roadmap zeigt sie als „Noch nicht eingeplant“.
Beschreibung: Die Roadmap-Ansicht kennt Akten ohne Meilenstein („Noch nicht eingeplant“), `scripts/check-akte-meilenstein.mjs` lehnte jede solche Akte ab — eine frisch angelegte Akte (Coach-Scope, F-912) hätte das Gate sofort rot gemacht.
Fundstelle: `scripts/check-akte-meilenstein.mjs` (`pruefeAkteMeilenstein`), `scripts/leitstand/routen-roadmap.mjs`.
Auswirkung: Gering — ein Widerspruch zwischen Anzeige und Gate.
Maßnahme: E-B5-2 (F45 B5a-1): Akte mit Status ENTWURF darf ohne Meilenstein sein; ab jedem anderen Status bleibt der Meilenstein Pflicht.
Status: erledigt durch F45 B5a-1 (23.10.2026) — `pruefeAkteMeilenstein` nimmt den Status je Akte (`leseAktenStatus`); ENTWURF ohne Meilenstein ist zulässig, Tests für ENTWURF und READY_FOR_TECH in `scripts/check-akte-meilenstein.test.mjs`.
Feature/Run: Entdeckt: Challenger, 23.10.2026 (Bauauftrag F45 B5a-1).

**F-1194** · `PROCESS_IMPROVEMENT` · P2 · erledigt (Prozess festgelegt, E-PRUEF-1 = A)
Titel: Challenger-Prüfung vor dem Merge war ausgedünnt.
Beschreibung: Bei B5b-1a bis B5b-1b-2 wurde ohne Hinweis an Stefan auf die volle Cloud-Prüfung des Challengers verzichtet. Die PR-CI kann der Challenger mangels API-Zugriff nicht sehen. Aufgefallen durch Nachfrage Stefans, 24.10.2026. Bezug F-956 (Merge vor der Challenger-Prüfung, F44).
Fundstelle: Merge-Ablauf B5b-1a (#376), B5b-1b-1 (#377), B5b-1b-2 (#378); `docs/projekt/fixpaket-f45.md` §3 (Prüfmodus).
Auswirkung: Mittel — die vereinbarte Prüftiefe vor dem Merge war nicht mehr gegeben, ohne dass Stefan es wusste.
Maßnahme: E-PRUEF-1 = A (Stefan, 24.10.2026) — vor jedem Merge gelten genau: (1) Stefans lokaler voller Lauf im Commit-Block, (2) inhaltliche Prüfung des gepushten Diffs durch den Challenger (Dateiliste, Kernstellen gegen Auftrag, Invarianten), (3) grüne PR-CI (`.github/workflows/ci.yml`: `npm run check` auf ubuntu-latest mit Node 24 + gitleaks). Der Cloud-Testlauf des Challengers entfällt. Festgehalten in `features/F45/feature.md` (Entscheidungen) und `docs/projekt/fixpaket-f45.md` §3.
Status: erledigt (Prozess festgelegt).
Feature/Run: Entdeckt: Nachfrage Stefan, 24.10.2026; festgelegt F45 T.

**F-1197** · `TECH_DEBT` · P3 · erledigt (F45 B5b-2b-1)
Titel: Roadmap-Gantt: Auswahl in Gold, Status ohne Chip-Form.
Beschreibung: Die gewählte Gantt-Zeile trägt Streifen und Fläche in `--amber` (Bestand seit F46 D1), das Detailpanel einen Amber-Rahmen; Gold ist laut Sollvorgabe die Ebenenfarbe „Meilenstein“, die Auswahl liest sich so wie eine Ebene. Der Status in den Zeilen ist Symbol + Text ohne Pillenform, die Sollvorgabe nennt „Status-Chip“ (design-guardian B5b-2a, Nr. 3 und 4).
Fundstelle: `public/leitstand/style.css` (`#view-roadmap .rm-zeile.gewaehlt`, `.rm-detail`, `.rm-status`).
Auswirkung: Gering — lesbar, aber nicht ganz designtreu.
Maßnahme: Stefan entscheidet: Auswahl neutral (`--note-bg`/`--line`) und Status als Pille, oder Bestand bestätigen. Kandidat für B5b-2b.
Status: erledigt 25.10.2026 (F45 B5b-2b-1, Entscheidung Challenger: Status als Pille wie im Canvas, Auswahl als neutraler Streifen, kein Gold, kein Mint, keine neue Farbe): Pille `.rm-status .roadmap-status` und `.rm-detail-kopf .roadmap-status` (Rahmen aus der Kategoriefarbe über `color-mix`), Auswahl Fläche `--button-hover-bg` und Streifen `--ink`, Detailpanel-Rahmen `--line`; Nachweis `features/F45/nachweise/b5b2b/` (dunkel/hell, 1440/390).
Feature/Run: Entdeckt: F45 B5b-2a (design-guardian), 25.10.2026.

**F-1201** · `TECH_DEBT` · P3 · erledigt (F45 B5b-2b-1)
Titel: Nachweis B5b-2a nimmt auf, bevor Entwicklungsstand/Noch nicht eingeplant geladen sind.
Beschreibung: `features/F45/nachweise/b5b2a/erzeuge-nachweis.mjs` wartete nach dem Gantt fest 600 ms; Entwicklungsstand und „Noch nicht eingeplant“ standen in den Bildern teils noch auf „Lädt…“.
Fundstelle: `features/F45/nachweise/b5b2a/erzeuge-nachweis.mjs`.
Auswirkung: Gering — Bilder zeigten einen Zwischenstand.
Maßnahme: Warten, bis beide Abschnitte da sind und kein „Lädt…“ der Lagensprache mehr auf der Seite steht.
Status: erledigt 25.10.2026 (F45 B5b-2b-1): beide Nachweisskripte (`b5b2a`, `b5b2b`) warten mit `waitForFunction` auf das Ladeende.
Feature/Run: Entdeckt: F45 B5b-2a (Challenger), 25.10.2026.
