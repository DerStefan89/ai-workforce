# Findings-Register — AI Workforce Harness

Anhängeprotokoll. Neue Zeilen unten anfügen, bestehende nie löschen — Status ändern statt entfernen. Format je Zeile: `ID | Typ | Priorität | Status | Titel — Beschreibung | Fundstelle | Auswirkung | Maßnahme | Feature/Run`.

Typen: `BUG` · `HARNESS_IMPROVEMENT` · `TECH_DEBT` · `PROCESS_IMPROVEMENT`.
Priorität: `P0` kritisch · `P1` wichtig · `P2` sinnvoll · `P3` Verbesserungsidee · `P4` sehr niedrig.

---

**F-001** · `HARNESS_IMPROVEMENT` · P1 · **gelöst**
Titel: `lint`/`typecheck`/`test` als echo-Stubs behauptet, real echte Befehle.
Beschreibung: `docs/harness/zaehne-taxonomie.md` (L1–L3) beschrieb alle drei als `echo`. Verifiziert im Bauauftrag `ebene2-architektur-in-repo-nachziehen`: `biome lint .`, `tsc --noEmit`, `node --test` — echte Befehle.
Fundstelle: `package.json` scripts.
Auswirkung: keine — Harness-Doku war veraltet, Repo nicht.
Maßnahme: keine. Ggf. `zaehne-taxonomie.md` bei Gelegenheit korrigieren (kosmetisch).
Feature/Run: Vertrag `ebene2-architektur-in-repo-nachziehen`, 28.08.2026.

**F-002** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Entscheidungsregister 001–176 noch nicht im Repo.
Beschreibung: `docs/projekt/zielfassung.md` und `umsetzungsplan-fassung-1.md` liegen jetzt im Repo, das zugrundeliegende Entscheidungsregister (Claude-Projekt-Dokument `04_ENTSCHEIDUNGSREGISTER_001_176.md`) nicht. E-073 (lokaler Workspace = Single Source of Truth) bleibt dadurch teilweise verletzt.
Fundstelle: fehlt unter `docs/projekt/`.
Auswirkung: gering — die konsolidierten Fassungen sind im Repo, das Register ist Herleitung, nicht Sollquelle.
Maßnahme: eigener, kleiner Terminal-Nachtrag (analog `zielfassung.md`), keine Eile.
Feature/Run: Planung Vertrag `ebene2-architektur-in-repo-nachziehen`, 28.08.2026.

**F-003** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: `check-docs.mjs` Prüfung 2 erkennt bare zweistellige Versionszahlen nicht.
Beschreibung: Regex verlangt ein `v`-Präfix oder einen Punkt in der Zahl. „Node 24" (ohne beides) löst keinen Befund aus — verifiziert per Rot-Fall-Test, Exit 0 statt erwarteter Exit 1.
Fundstelle: `scripts/check-docs.mjs`, Prüfung 2, Regex.
Auswirkung: ein künftiger Eintrag wie „Node 20" in `CLAUDE.md`/`ARCHITECTURE.md` würde nicht erkannt, obwohl die Prüfung als `ERZWUNGEN`/kalibriert gilt.
Maßnahme: Regex um bare zwei-/dreistellige Zahlen direkt nach gelistetem Techniknamen erweitern.
Feature/Run: Bauauftrag `ebene2-architektur-in-repo-nachziehen`, Kalibrierungsschritt, 28.08.2026.

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

**F-006** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: `ARCHITECTURE.md` erklärt mehrere sicherheitsrelevante Kernbegriffe nicht selbst.
Beschreibung: Checkpoint, Wirkungsmarke, Checkpoint Store, Gültigkeitsschlüssel, Wirksamkeitsnachweis, Ergebnishülle, Beobachtungsbasis werden benutzt, aber nur in `docs/projekt/zielfassung.md` (§7, §16.2, §16.4, E-188) definiert, ohne Rückverweis aus `ARCHITECTURE.md`.
Fundstelle: `ARCHITECTURE.md` Abschnitt 1/2.
Auswirkung: mittel — verfehlt an dieser Stelle das eigentliche Ziel des Vertrags („ohne externe Quelle benennbar").
Maßnahme: pro Begriff an der ersten Nennung einen Satz oder gezielten Verweis „siehe `docs/projekt/zielfassung.md` §X" ergänzen.
Feature/Run: qa-Review Runde 1, Bauauftrag `ebene2-architektur-in-repo-nachziehen`, 28.08.2026.

**F-007** · `HARNESS_IMPROVEMENT` · P3 · offen
Titel: `check-docs.mjs` Prüfung 1 erkennt Ordnerverweise ohne Dateiendung nicht.
Beschreibung: `lib/utils/`, `lib/data/`, `lib/auth/` (Alt-Template-Reste in `CLAUDE.md`, Abschnitt „Bestehende Helper") werden vom Doku-Gate nicht als toter Verweis erkannt, weil Prüfung 1 nur Pfade mit Dateiendung matcht.
Fundstelle: `scripts/check-docs.mjs` Prüfung 1; `CLAUDE.md`, Abschnitt „Bestehende Helper".
Auswirkung: niedrig — Template-Leichen bleiben unbemerkt im laufenden Text stehen.
Maßnahme: Prüfung 1 auf Ordnerverweise erweitern (optional), oder den Abschnitt jetzt auf die reale Struktur (`src/`) umschreiben/entfernen.
Feature/Run: qa-Review Runde 1, 28.08.2026.

**F-008** · `TECH_DEBT` · P3 · offen
Titel: Terminologie „Arbeitsstrang" vs. „Workstream" nicht explizit gleichgesetzt.
Beschreibung: `ARCHITECTURE.md` (verbotene Patterns) nennt „Arbeitsstrang" (D13), `docs/STATUS.md`/Umsetzungsplan nennen „Workstream" — gleicher Sachverhalt, keine Datei spricht die Gleichsetzung aus. `docs/harness/HARNESS-GLOSSARY.md` ist dafür nur eine leere `[FÜLLUNG]`-Zeile.
Fundstelle: `ARCHITECTURE.md`, `docs/STATUS.md`, `docs/harness/HARNESS-GLOSSARY.md`.
Auswirkung: niedrig — aus Kontext erschließbar, nicht belegt.
Maßnahme: Glossar füllen oder Gleichsetzungssatz ergänzen.
Feature/Run: qa-Review Runde 1, 28.08.2026.

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

**F-011** · `TECH_DEBT` · P4 · offen, absichtlich zurückgestellt
Titel: `[FÜLLUNG, nur UI]`-Reste in `CLAUDE.md` trotz entschiedener Web-UI.
Beschreibung: DoD-Punkte, `design-guardian`-Zeile, Entscheidungsregel Punkt 1 unausgefüllt, obwohl der Leitstand inzwischen als Web-Oberfläche entschieden ist (`docs/adr/oberflaechentechnik-leitstand.md`).
Fundstelle: `CLAUDE.md`.
Auswirkung: niedrig, wird bei Feature 10 (Leitstand) fällig.
Maßnahme: bei Feature 10 ausfüllen, nicht vorher.
Feature/Run: qa-Review Runde 1, 28.08.2026.

**F-012** · `TECH_DEBT` · P1 · **gelöst**
Titel: ADR-Datumsfeld widersprach zitierter Fundstelle.
Beschreibung: `**Datum:** 2026-08-22` in `docs/adr/oberflaechentechnik-leitstand.md` und `docs/adr/ein-ebenen-profilmodell.md` passte nicht zur zitierten Fundstelle (Nachtrag 28.08.2026).
Fundstelle: beide ADR-Dateien, Kopfzeile.
Maßnahme: vor dem Commit auf `2026-08-28` korrigiert.
Feature/Run: code-reviewer Runde 2, 28.08.2026.

**F-013** · `PROCESS_IMPROVEMENT` · P1 · offen (Prio von P2 auf P1 angehoben)
Titel: Claude-Projekt-GitHub-Sync liefert keine Repo-Dateien in dieses Projekt.
Beschreibung: Direkt nach dem Merge von PR #13 zeigte project_search/project_read für ARCHITECTURE.md weiterhin alten Template-Inhalt. Bei erneuter Prüfung (Planungssitzung AF-F001, 28.08.2026) liefert project_info für dieses Projekt weiterhin ausschließlich die claude/*-Chat-Dokumente — kein einziger Repo-Pfad (ARCHITECTURE.md, CLAUDE.md, docs/*, scripts/*, state/*, features/*) erscheint, trotz konfigurierter GitHub-Sync-Quelle mit Include-Filter "/". Ist damit kein reines Merge-Lag, sondern ein strukturelles Sync-Problem.
Fundstelle: dieses Claude-Projekt, GitHub-Sync-Quelle main; project_info Doc-Liste.
Auswirkung: eine Claude-Projekt-Sitzung darf project_read/project_search für Repo-Fakten grundsätzlich nicht verwenden, nicht nur "kurz nach einem Merge".
Maßnahme: Sync-Konfiguration prüfen (Ursache klären), bis dahin Repo-Fakten ausschließlich über eine Claude-Code-Sitzung direkt einholen.
Feature/Run: AF-F001-Planung, 28.08.2026.

**F-014** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: GitKraken-MCP-Tool in Claude-Projekt-Sitzungen ohne Auth nutzbar.
Beschreibung: `repository_get_file_content` (Provider github) verlangt `gk auth login` auf dem verbundenen Gerät — in einer reinen Claude-Projekt-Sitzung ohne verbundenes Gerät nicht nutzbar. Damit ist der einzige belegte Fallback zu F-013 ebenfalls blockiert.
Fundstelle: mcp__remote-devices__plugin_gitkraken_gitkraken__repository_get_file_content.
Auswirkung: verschärft F-013 — keine funktionierende Alternative zur Verifikation innerhalb des Claude-Projekts.
Maßnahme: Auth einrichten, oder Verfahren dauerhaft auf "Repo-Fakten immer per Claude-Code-Prompt" festlegen.
Feature/Run: AF-F001-Planung, 28.08.2026.

**F-015** · `TECH_DEBT` · P4 · offen
Titel: `ARCHITECTURE.md` Kopfkommentar trägt noch `[FÜLLUNG — GANZE DATEI]`.
Beschreibung: Alle acht Inhaltsabschnitte sind befüllt, aber der Meta-Kommentar (Zeile 1–18) wurde nicht entfernt.
Fundstelle: `ARCHITECTURE.md:1–18`.
Auswirkung: kosmetisch — kein Platzhalter im eigentlichen Inhalt, aber irreführend für den nächsten Leser.
Maßnahme: Kopfkommentar bei Gelegenheit entfernen.
Feature/Run: Verifikation AF-F001-Planung, Schritt A, 28.08.2026.

**F-016** · `TECH_DEBT` · P3 · **gelöst**
Titel: `state/memory-map.md` Zeile 2 trägt noch `[PROJEKTNAME]` statt „AI Workforce".
Fundstelle: `state/memory-map.md:2`.
Auswirkung: niedrig, aber echter übersehener Platzhalter — inkonsistent mit den drei neu ergänzten, korrekt befüllten Zeilen direkt darunter.
Maßnahme: `[PROJEKTNAME]` durch „AI Workforce" ersetzt.
Feature/Run: behoben Findings-Batch, 31.08.2026.

**F-017** · `PROCESS_IMPROVEMENT` · P4 · offen
Titel: Zahlenfehler in der Selbstverifikation von plan-v1-feature0-datenformate.
Beschreibung: plan-v1 Abschnitt 0 behauptet „24 Gates" in `state/gates.md`. Die reale Gate-Tabelle enthält 14 Datenzeilen; „24" trifft eher auf die Zeilennummer des letzten Tabelleneintrags zu als auf die Gate-Anzahl.
Fundstelle: `state/plan-v1-feature0-datenformate.md` Abschnitt 0; `state/gates.md:9-24`.
Auswirkung: keine auf die Design-Entscheidungen — reine Ungenauigkeit, aber gerade in einem Abschnitt, der explizit Sorgfalt beansprucht („real geprüft, nicht aus den Handoff-Dokumenten übernommen").
Maßnahme: kosmetisch, kein Recheck nötig. Bei Gelegenheit in plan-v1 korrigieren.
Feature/Run: architecture-advisor-Pass auf plan-v1-feature0-datenformate, 29.08.2026.

**F-018** · `PROCESS_IMPROVEMENT` · P4 · offen
Titel: D5 in plan-v1-feature0-datenformate zitiert `ARCHITECTURE.md` Abschnitt 6 etwas weiter, als der Wortlaut trägt.
Beschreibung: plan-v1 D5 formuliert: „jedes neue Werkzeug verlangt laut `ARCHITECTURE.md` Abschnitt 6 vorher den Skill `werkzeug-auswahl`". `ARCHITECTURE.md:71` deckt wörtlich nur „Test-Framework" und „MCP-Werkzeug" ab, nicht jede neue npm-Dependency. Die gelebte Praxis in `state/tooling.md` (Biome, `tsc`, `gh` — reguläre Dependencies, trotzdem über `werkzeug-auswahl` geprüft) stützt die Schlussfolgerung von D5 (kein `ajv`) inhaltlich trotzdem — nur die Zitierschärfe ist ungenau.
Fundstelle: `state/plan-v1-feature0-datenformate.md` D5; `ARCHITECTURE.md:71`; `state/tooling.md`.
Auswirkung: keine auf das Ergebnis (kein `ajv` bleibt richtig), nur auf die Begründungsschärfe.
Maßnahme: kosmetisch, kein Recheck nötig. Bei Gelegenheit in plan-v1 auf die gelebte Praxis in `state/tooling.md` statt auf Abschnitt 6 stützen.
Feature/Run: architecture-advisor-Pass auf plan-v1-feature0-datenformate, 29.08.2026.

**F-019** · `TECH_DEBT` · P4 · offen
Titel: Typ des `version`-Felds in der Profil-Referenz ist eine unbelegte, aber offen benannte Festlegung.
Beschreibung: Weder ADR-0002 noch die geprüften Stellen aus `docs/projekt/zielfassung.md` legen den Datentyp von „Version" für `profiles/` fest. plan-v1 wählt `integer, minimum: 1` als eigene Festlegung. Der Plan benennt diese Interpretation selbst ausdrücklich als Auslegung, nicht als wörtliche Ausnahme — genau das erwartete Verhalten, kein verstecktes Risiko.
Fundstelle: `state/plan-v1-feature0-datenformate.md` D1.
Auswirkung: keine Blockade nötig. Eine künftige Monotonie-Prüfung bräuchte eine Historie, die Feature 0 nicht liefert (bereits im Plan so benannt).
Maßnahme: kein Recheck nötig, in plan-v2 unverändert stehen gelassen.
Feature/Run: architecture-advisor-Pass auf plan-v1-feature0-datenformate, 29.08.2026.
Feature/Run: Verifikation AF-F001-Planung, Schritt A, 28.08.2026.

**F-020** · `PROCESS_IMPROVEMENT` · P1 · gelöst
Titel: Handoff `claude/88` stellte den Baustatus von F1 (Checkpoint Store) falsch dar.
Beschreibung: `claude/88_HANDOFF_ARTIFACT_REGISTRY_LINEAGE.md` behauptete am 29.08.2026, F1 sei bereits „fertig gebaut ..., gemerged (PR #19)". Realer Repo-Stand zum Prüfzeitpunkt (frischer Klon, volle Historie, `main` HEAD `bf55dad`): PR #19 (Commit `2ef00fb`) änderte ausschließlich acht Planungs-/Vertragsdateien — kein `src/`-Verzeichnis im Repo. `state/tasks/f1-checkpoint-store.md` benannte explizit „Freigabe-Halt: kein Bau in diesem Schritt". `docs/STATUS.md` listete F1 nicht unter „Erledigt".
Fundstelle: `claude/88_HANDOFF_ARTIFACT_REGISTRY_LINEAGE.md` Abschnitt 1; Repo `DerStefan89/ai-workforce`.
Auswirkung: Ohne Gegenprüfung wäre Feature 2 (Artifact Registry / Lineage) auf einer nicht existierenden Code-Grundlage weitergeplant worden.
Maßnahme: F1 zuerst real gebaut (Commit `d9595f6`), PR #20 (Draft) eröffnet, CI grün, Diff gegengeprüft, gemergt. Abschließend verifiziert: `main` HEAD `fa51a61`, `src/checkpoint-store/{index,types,checkpoint-store.test}.ts` real vorhanden. Lehre: „fertig gebaut/gemerged"-Behauptungen vor Weitergabe gegen `git log`/`git show --stat` verifizieren, nicht gegen Berichtsprosa allein übernehmen.
Feature/Run: Challenge Artifact Registry / Lineage, F1-Bauauftrag, PR #19/#20, `main` `fa51a61`, 29.08.2026.

**F-021** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Claude-Projekt-Projektbeschreibung „AI Workforce" beschreibt eine bereits überholte Phase.
Beschreibung: Beschreibung nennt „Zielarchitektur final planen/Stack wählen/Produktcode schreiben" als „noch nicht erlaubt", obwohl Architektur-Baseline längst entschieden ist und F0-F3 real gebaut/gemergt sind. Nur die separate Projektbeschreibung ist stehengeblieben, die Project Instructions selbst sind aktuell.
Fundstelle: Claude-Projekt „AI Workforce", Feld Projektbeschreibung.
Auswirkung: Verwirrungsrisiko für frische Sitzungen ohne Chat-Historie.
Maßnahme: bei Gelegenheit aktualisieren.
Status: dritte Wiederholung (`claude/89` Befund 3, `claude/90` Abschnitt 6, `claude/94`), weiterhin offen.
Feature/Run: Challenge Artifact Registry / Lineage, 29.08.2026; dritte Wiederholung 30.08.2026.

**F-022** · `BUG` · P2 · gelöst (vor Push behoben)
Titel: Rohe Steuerbytes (NUL bis US) im Quelltext von `pruefeLaufId` statt Escape-Sequenz.
Beschreibung: Zeichenklasse enthielt versehentlich rohe Steuerbytes statt Escape-Text — Git erkannte `src/checkpoint-store/index.ts` dadurch als Binärdatei.
Fundstelle: `src/checkpoint-store/index.ts`, Funktion `pruefeLaufId`.
Auswirkung: hätte eine als Binärdatei markierte „Quelldatei" committet, Diff-/Review-Werkzeuge hätten den Inhalt nicht sinnvoll anzeigen können.
Maßnahme: vor Commit behoben (bytesichere Prüfung `charCodeAt(0) < 32`), alle neuen Dateien auf Steuerbytes gescannt, `npm run check` danach grün.
Feature/Run: F1-Bauauftrag, Commit `d9595f6`, 29.08.2026.

**F-023** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: „Von Git als Binärdatei erkannt" wurde einmal fälschlich als False Alarm abgetan, bevor F-022 real gefunden wurde.
Beschreibung: Ein ernstzunehmendes Signal (Git-Binärerkennung auf erwarteter Textdatei) wurde zunächst übergangen.
Fundstelle: F1-Bauauftrag, Prüfschritt vor Commit.
Auswirkung: hätte unentdeckt bis zum Commit durchlaufen können.
Maßnahme: „Git meldet Textdatei als binär" nie ohne Byte-Inspektion als False Positive abtun — Kandidat für code-reviewer/qa-Checkliste.
Feature/Run: F1-Bauauftrag, 29.08.2026.

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

**F-026** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Verwechslung, wofür der commit-guard-Freigabe-Mechanismus gilt, kostete mehrere unnötige Runden.
Beschreibung: Freigabe-Zwang (`state/freigabe-commit.md`) gilt nur für `git commit`/`git push` durch Claude Code selbst, nicht für `gh pr create/checks/merge` durch Stefan direkt — wurde einmal fälschlich mit angefordert.
Fundstelle: Merge-Ablauf PR #21/#22.
Auswirkung: mehrere unnötige Runden.
Maßnahme: vor jeder Freigabe-Anforderung prüfen, wer den Git-Befehl ausführt; Terminal-Anweisungen einzeln statt als Mehrzeilen-Block geben (PowerShell-Copy-Paste-Probleme). Status: seither angewendet, bewährt sich.
Feature/Run: Feature 2, Merge-Ablauf PR #21/#22, 29.08.2026.

**F-027** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Leitstand-Prototyp (F10) wurde ohne eigene Feature-Akte gebaut.
Beschreibung: `features/` enthält kein `F10`-Verzeichnis, kein zugehöriger plan-v1/plan-v2. Prototyp funktioniert nachweislich, aber außerhalb der AF-F001-Konvention.
Fundstelle: `features/` (fehlender Eintrag).
Auswirkung: gering, Nachvollziehbarkeit schwächer als bei anderen Features.
Maßnahme: Akte nachziehen oder bewusst als „Prototyp ohne Akte" deklarieren.
Feature/Run: Challenge F4/E2E-Workstream, 29.08.2026.

**F-028** · `TECH_DEBT` · P1 · gelöst
Titel: Wirkungsmarke (`RUN_PREPARED`, Terminalzustände) fehlte trotz A5-Vorgabe im Code.
Beschreibung: A5 verlangt zwei Artefakttypen (Checkpoint, Wirkungsmarke) in derselben Kette — nur Checkpoint existierte. Ohne Wirkungsmarke war der Doppelausführungsschutz nicht darstellbar.
Fundstelle: `src/checkpoint-store/types.ts`.
Auswirkung: hoch bis zur Behebung.
Maßnahme: als Feature F1B geschnitten, gebaut, gemergt (PR #25, `main` `8520714`), verifiziert (24/24 Tests grün).
Feature/Run: Challenge F4/E2E-Workstream, 29.08.2026 → F1B, 30.08.2026.

**F-029** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Product-Coach-Übergabe (F4) nutzte kollidierende Feature-Nummerierung und falsche Vorbedingungen.
Beschreibung: Übergabe ging von „F3 abgeschlossen" aus und nannte den nächsten Schritt „F4" — der Umsetzungsplan vergibt F3 bereits an Authorization Boundary, F4 an Invocation Policy. Beschriebener Umfang entsprach zudem dem gesamten Rest von Meilenstein 1, nicht einem Feature.
Fundstelle: Übergabe „AI_Workforce_Uebergabe_F4_E2E_Workstream.md".
Auswirkung: ohne Repo-Abgleich wäre auf falscher Vorbedingung weitergeplant worden.
Maßnahme: Product-Coach-Handoffs auf Ziel/Scope/AK begrenzen; IDs und Zustände holt der Challenger selbst aus dem Repo.
Feature/Run: Challenge F4/E2E-Workstream, 29.08.2026.

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

**F-031** · `PROCESS_IMPROVEMENT` · P1 · offen
Titel: Werkzeug-/Bedarfsauswahl (MCP, APIs, Agents, Tools, Skills) hat bereits einen manuellen Vorläufer im Harness — Feature direkt nach S3 einplanen.
Beschreibung: `docs/harness/werkzeug-katalog.md`, `state/tooling.md` und Skill `.claude/skills/werkzeug-auswahl/SKILL.md` bilden bereits eine Bedarf-zuerst-Auswahlprozedur. Stefan wünscht ein späteres AI-Workforce-Feature, das MCPs/APIs/Agents/Tools/Skills automatisch aus einer Library auswählt: (1) Bedarf (`BEDARF_V0`) auswerten, (2) prüfen was der Harness schon hat, (3) prüfen was fehlt, (4) Einträge aus der Bibliothek empfehlen, (5) nach Bestätigung umsetzen, (6) Ergebnis ist dauerhaft nutzbare Zuordnung, nicht nur einmalige Empfehlung.
Fundstelle: `docs/harness/werkzeug-katalog.md`, `state/tooling.md`, `.claude/skills/werkzeug-auswahl/SKILL.md`; `docs/projekt/zielfassung.md` §11 (automatisches Werkzeug-Sammeln = Nicht-Ziel Fassung 1, Auswahl aus gepflegtem Katalog erlaubt).
Auswirkung: keine jetzt — Backlog-Hinweis, damit kein Feature später eine zweite, konkurrierende Werkzeug-Library aufbaut.
Maßnahme: `BEDARF_V0` bekommt von Anfang an ein Feld, das auf Katalog-/`tooling.md`-Einträge zeigt, vorerst manuell befüllt (in F9s `feature.md`/plan-v1 bereits als `werkzeug_auswahl`-Platzhalterfeld übernommen). Priorität von P2 auf P1 angehoben (30.08.2026) — der manuelle Vorläufer ist schon heute nutzbar, die automatisierte Version wird direkt nach F9/S3 geplant, nicht erst nach ganz Meilenstein 1.
Feature/Run: Challenge F4/E2E-Workstream, 29.08.2026; präzisiert und Priorität geklärt, 30.08.2026.

**F-032** · `TECH_DEBT` · P2 · offen
Titel: F3 (Authorization Boundary) prüft nur Integrität („unverändert"), nicht Urheberschaft („von Mensch erzeugt").
Beschreibung: `pruefeAutorisierung` vergleicht Arbeitsverzeichnis-/Git-Show-Inhalt gegen den referenzierten Hash — beweist Integrität, nicht dass ein Mensch die Freigabedatei erzeugt hat. E-189/D16 verlangen wörtlich nur „außerhalb der Schreibreichweite des Ausführungswerkzeugs".
Fundstelle: `src/authorization-boundary/index.ts`, `pruefeAutorisierung`.
Auswirkung: gering jetzt, aber ein Skript mit Zugriff auf den externen Ordner könnte technisch eine gültige Freigabe erzeugen.
Maßnahme: als bewusste Vereinfachung für Fassung 1 akzeptiert. Bei Bedarf später: zusätzlicher Herkunftsnachweis.
Feature/Run: F3-Advisor-Pass, 30.08.2026.

**F-033** · `PROCESS_IMPROVEMENT` · P2 · **gelöst**
Titel: Rot-Fall-Kalibrierung an echter Sicherheitsprüfung löst den plattformseitigen Auto-Mode-Classifier aus.
Beschreibung: Ein Kalibrierungsversuch, der Code der echten Autorisierungs-/Hash-Prüfung testweise veränderte, wurde vom Auto-Mode-Classifier blockiert (nicht über `.claude/settings.json` konfigurierbar). Behoben über manipulierte Testfixtures (falscher `datei_hash`/`commit_hash`) statt Code-Änderung — gleicher Beweiswert.
Fundstelle: F3-Bauauftrag, Kalibrierungsschritt `node --test src/authorization-boundary/`.
Auswirkung: gering pro Vorfall, wiederkehrend bei künftiger Rot-Fall-Kalibrierung an sicherheitsrelevantem Code.
Maßnahme: `.claude/skills/handoff-vertrag/SKILL.md`, neuer Abschnitt „Konvention: Rot-Fall-Kalibrierung an geprüfter Logik" ergänzt.
Feature/Run: F3-Bauauftrag, 30.08.2026; behoben Findings-Batch, 31.08.2026.

**F-034** · `HARNESS_IMPROVEMENT` · P3 · **zusammengeführt mit F-045**
Titel: Geräte-Brücken-Lesebefehle (device_bash) können einen verwaisten `.git/index.lock` hinterlassen.
Beschreibung: Mehrfach beobachtet (zuletzt 30.08.2026, dritte Wiederholung): ein reiner Lese-Git-Befehl über die Geräte-Brücke hinterlässt eine 0-Byte `.git/index.lock`, die reales `git commit` blockieren würde.
Fundstelle: `mcp__remote-devices__device_bash`-Aufrufe gegen das lokale Repo.
Auswirkung: gering, aber wiederkehrend.
Maßnahme: mit F-045 zusammengeführt, gemeinsame Regel siehe `docs/harness/geraete-bruecke-verifikation.md`.
Feature/Run: wiederholt seit F1B, zuletzt 30.08.2026; zusammengeführt Findings-Batch, 31.08.2026.

**F-035** · `PROCESS_IMPROVEMENT` · P1 · **gelöst**
Titel: Wiederholung von F-005 — `feature.md`/Planungsdokumente fehlten im ersten F3-Commit.
Beschreibung: Erster F3-Commit (`c7b4974`) enthielt Modul/Schema/Gate/Tests, aber nicht `features/F3/feature.md` und zugehörige Planungsdateien — CI schlug fehl (check-feature.mjs: „feature.md fehlt"). Gleiches Muster wie F-005: OUTPUT-Liste im Vertrag wurde zu wörtlich genommen.
Fundstelle: Commit `c7b4974`; `state/tasks/f3-authorization-boundary.md`.
Auswirkung: ein zusätzlicher Korrektur-Commit, roter CI-Lauf vor Merge.
Maßnahme: `.claude/skills/handoff-vertrag/SKILL.md`, OUTPUT-Bullet um festen Punkt ergänzt: Feature-Akte und alle erzeugten Planungs-/Advisor-/Vertragsdokumente ausdrücklich Teil des Commits.
Feature/Run: F3-Bauauftrag, Merge-Vorbereitung, 30.08.2026; behoben Findings-Batch, 31.08.2026.

**F-036** · `PROCESS_IMPROVEMENT` · P1 · offen
Titel: Findings-Register war in zwei unabhängig fortgeschriebene Kopien gespalten (dieses Repo-Register vs. Claude-Projekt „AI Workforce").
Beschreibung: Repo-Register endete bei F-019 (29.08.2026), das Claude-Projekt-Register führte unabhängig F-020 bis F-036 fort, ohne Rückspielung. Grund, warum `grep F-031 state/findings.md` im F9-plan-v1 keinen Treffer lieferte.
Fundstelle: `state/findings.md` (dieses Repo) vs. `claude/75_FINDINGS_REGISTER_ANHANG.md` (Claude-Projekt).
Auswirkung: mittel — Repo-seitige Sitzungen sahen Challenger-Findings ab F-020 nicht.
Maßnahme: `state/findings.md` ist ab sofort einzige Sollquelle (dieser Nachtrag). Künftige Findings werden direkt am Ende jedes Bauauftrags hier angehängt, nicht mehr primär im Claude-Projekt.
Feature/Run: F9-plan-v1-Review, 30.08.2026.

**F-037** · `PROCESS_IMPROVEMENT` · P1 · **erledigt durch E-191**
Titel: Übergabepapier zur Bedarfsanalyse kollidiert an vier Stellen mit entschiedenen Nicht-Zielen (013, 014, Zielfassung §2, 03_KONTEXT §3.11).
Beschreibung: Das Papier „Modellagnostische Bedarfsanalyse & Capability Library" forderte in §3.3/§3.4/§15/§16 eine anbieterübergreifende Provider-Abstraktion, einen zehnteiligen Rollenkatalog und automatische Discovery (V2/V3) — widerspricht Entscheidung 013 (kein generischer Provider-Adapter in Fassung 1), Entscheidung 014 (Profile injizieren keine neuen Rollen), Zielfassung §2 Nicht-Ziele, `03_KONTEXT_UND_UEBERGABE.md` §3.11 (kein automatisches Tool-/MCP-Sammeln ohne konkretes Problem).
Fundstelle: Übergabepapier §3.3/§3.4/§15/§16 gegen `04_ENTSCHEIDUNGSREGISTER_001_176.md` 013/014, `claude/11_ZIELFASSUNG_V1.md` §2/§4, `03_KONTEXT_UND_UEBERGABE.md` §3.11.
Auswirkung: Ohne Schnitt wäre ein Feature gebaut worden, das eine nummerierte Entscheidung still überschreibt.
Maßnahme: Scope-Schnitt vorgenommen, Entscheidung 013 bestätigt und um Nachrüst-Auflagen ergänzt (E-191).
Feature/Run: Challenge Bedarfsanalyse, 30.08.2026.

**F-038** · `HARNESS_IMPROVEMENT` · P1 · offen
Titel: `docs/harness/werkzeug-katalog.md` ist leer und nicht maschinenlesbar — harte Vorbedingung für jedes Automatisierungs-Feature der Werkzeugauswahl.
Beschreibung: Abschnitt „Einträge" trägt nur `[FÜLLUNG]` mit Verweis auf ein externes Lern-Repo. Ein künftiges Bedarfsanalyse-Feature (F-031), das „die Capability Library prüft", liest heute eine leere Datei. Ohne reale Einträge ist kein Kalibrierungstest möglich (Zielfassung P3).
Fundstelle: `docs/harness/werkzeug-katalog.md`, Abschnitt „Einträge".
Auswirkung: blockierend für das geplante Bedarfsanalyse-Feature.
Maßnahme: Stefans externe Werkzeug-Bibliothek in das bestehende Eintragsformat überführen (mind. ca. 10 Einträge), danach abgeleiteten maschinenlesbaren Index definieren. Markdown bleibt führend.
Feature/Run: Challenge Bedarfsanalyse, 30.08.2026.

**F-039** · `TECH_DEBT` · P2 · offen
Titel: `BEDARF_V0.werkzeug_auswahl` ist ein Platzhalter ohne Schema und ohne Zielformat.
Beschreibung: Feld wurde in F9s `feature.md`/plan-v1 als Platzhalter übernommen (F-031), trägt aber kein definiertes Schema.
Fundstelle: `features/F9/feature.md`, zugehörige Bedarf-Schemas.
Auswirkung: gering jetzt; wird bei einem künftigen Bedarfsanalyse-Feature die erste zu klärende Frage.
Maßnahme: in einem künftigen plan-v1 ausspezifizieren, nicht vorher.
Feature/Run: Challenge Bedarfsanalyse, 30.08.2026.

**F-042** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Terminal-Befehle mit geratenem Pfad und in Unix-Notation ausgegeben, obwohl Zielmaschine Windows/PowerShell ist.
Beschreibung: In einer Challenger-Sitzung wurde „git -C ~/projekte/..." ausgegeben. Pfad geraten, `~` wird von PowerShell in `git -C` nicht expandiert, beide Befehle schlugen fehl. F-026 verlangt „echte Pfade", wurde nicht gegen die reale Zielumgebung geprüft.
Fundstelle: Challenger-Sitzung 30.08.2026, TERMINAL-Ausgabe.
Auswirkung: gering, ein Fehlversuch pro Vorkommen.
Maßnahme: `[EMPFEHLUNG]` F-026 um zwei Punkte ergänzen: Zielumgebung ist Windows/PowerShell, keine Unix-Notation, kein `~`; steht das Arbeitsverzeichnis bereits im Repo, keinen `-C`-Pfad konstruieren.
Feature/Run: Challenge Bedarfsanalyse, 30.08.2026.

**F-043** · `TECH_DEBT` · P2 · offen
Titel: F5-Rollentabelle bindet an Besetzungsnamen statt an die §4-Verantwortungskategorien — Spannung zu E-191/N2.
Beschreibung: `state/tasks/f5-context-builder.md` bzw. plan-v2 verwendet Besetzungsnamen (architecture-advisor, code-reviewer, qa, ausfuehrung) als Schlüssel der Rollentabelle statt der stabileren Verantwortungskategorien aus Zielfassung §4. E-191/N2 verlangt Rolle und Runtime als getrennte Felder — hier sind sie im selben Schlüssel vermischt. Bewusst so belassen (YAGNI, kein zweiter realer Aufrufer vorhanden).
Fundstelle: `state/tasks/f5-context-builder.md`, Rollentabelle.
Auswirkung: gering jetzt (N2 ist DEKLARIERT, nicht ERZWUNGEN); eine künftige Besetzungsänderung erzwingt sonst eine Änderung an dieser Kern-Datei statt einer Konfigurationszeile.
Maßnahme: bei F6 (zweiter realer Aufrufer) oder beim nächsten ohnehin anstehenden Bauauftrag auf getrennte Rolle/Runtime-Felder umstellen.
Feature/Run: F5 Context Builder, plan-v2, 31.08.2026.

**F-044** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: `state/freigabe-commit.md` kann zwischen Vorbereitung und tatsächlichem Commit-Versuch das 10-Minuten-Fenster von `commit-guard.cjs` überschreiten.
Beschreibung: Wird die Freigabedatei vorab angelegt (z. B. während noch Diff/Bericht geprüft werden), statt unmittelbar vor dem eigentlichen `git commit`/`git push`-Aufruf, kann das Frischefenster ablaufen, bevor der Befehl läuft — der Guard verweigert dann mit „ist N Minuten alt (Frischefenster 10 Minuten) — verweigert", obwohl die Freigabe inhaltlich noch galt.
Fundstelle: `.claude/hooks/commit-guard.cjs` (Frischefenster-Prüfung); real beobachtet während des F5-Merge-Vorgangs, 31.08.2026.
Auswirkung: gering — führt zu einem Fehlversuch und einer erneuten Freigabe-Anlage, kein Datenverlust, keine Sicherheitslücke.
Maßnahme: Freigabe unmittelbar vor dem Commit-Versuch anlegen, nicht vorab.
Feature/Run: F5 Context Builder, Merge/Abschluss, 31.08.2026.

**F-045** · `PROCESS_IMPROVEMENT` · P2 · **gelöst**
Titel: Lesende Verifikation über die Geräte-Bridge in einem parallel genutzten Arbeitsverzeichnis kann mit einem laufenden lokalen Git-Prozess kollidieren und über `git checkout`/`pull` unbeabsichtigt Working-Tree-Zustand verändern.
Beschreibung: `.git/index.lock` trat während des F5-Merge-Abschlusses real zweimal auf; zusätzlich stand die lokale `main` nach dem PR-#30-Merge nicht mehr synchron zum Arbeitsverzeichnis (uncommittete Dateien identisch zum bereits gemergten Stand vorhanden, lokale `main` zwei Commits zurück). Ursache nicht abschließend geklärt, aber im Muster deckungsgleich mit einer Kollision zwischen einem parallel auf demselben Repo laufenden Git-Vorgang und einer lesenden Verifikation von außen.
Fundstelle: `.git/index.lock`-Kollisionen, F5-Merge-Abschluss, 31.08.2026.
Auswirkung: gering im real beobachteten Fall (Inhalt vor Wiederherstellung byteidentisch gegen `origin/main` geprüft, kein Datenverlust) — potenziell höher bei einem `checkout`/`pull`/`reset` ohne vorherige Verifikation.
Maßnahme: externe Verifikation auf index-neutrale Befehle beschränkt (`git log`, `git show <rev>:<pfad>`, `git diff <revA> <revB>`), kein `checkout`/`pull`/`reset` auf einem potenziell parallel genutzten Repo — als feste Regel in `docs/harness/geraete-bruecke-verifikation.md` festgehalten, zusammengeführt mit F-034.
Feature/Run: F5 Context Builder, Merge/Abschluss, 31.08.2026; behoben Findings-Batch, 31.08.2026.

**F-046** · `PROCESS_IMPROVEMENT` · P1 · **entschieden**
Titel: F4 wurde ohne vorherigen Code-Reviewer-/QA-Pass gemergt — kein
strukturell erzwungener Review-Schritt zwischen Ausführung und Merge.
Beschreibung: Retroactiver Review-Pass auf F4 (bereits gemergt, PR #33, main
HEAD `2c3f6f3`) durchgeführt: Subagent `code-reviewer` auf
`src/invocation-policy/`, `src/authorization-boundary/index.ts`
(additiver Diff), `scripts/check-f4-invocation-policy.mjs`, die beiden
neuen Schemas angesetzt; Subagent `qa` auf F4 aus Nutzersicht angesetzt.
Beide Ergebnisse in `state/code-reviewer-findings-f4-invocation-policy.md`
und `state/qa-findings-f4-invocation-policy.md` abgelegt (erstmaliges
Muster für einen nachträglichen Review-Pass in diesem Projekt). Beide
Rollen: „Freigegeben mit Hinweisen", kein Blocker. Wichtigster
Sachbefund: Schutzskript-Prüfung vergleicht nur die Menge der Hashes
(Multiset), nicht Pfad-zu-Hash-Zuordnung — ein Vertauschen zweier gültiger
Skript-Inhalte bliebe FREIGEGEBEN, obwohl AC3 „jedes referenzierte" Skript
prüfen lassen will. Der eigentliche Prozess-Befund ist aber, dass diese
Befunde erst nachträglich entstanden, weil kein Review-Schritt vor dem
Merge strukturell erzwungen war — anders als beim üblichen Ablauf
(Advisor-Pass vor dem Bau, aber kein Reviewer-/QA-Pass danach, vor dem
Commit/Merge).
Fundstelle: Ablauf F4 (`features/F4/journal.md`, Abschnitt „Ausführung" —
endet direkt mit Diff-Vorlage/Freigabe/Commit, kein Reviewer-/QA-Schritt
dazwischen).
Auswirkung: mittel — kein Datenverlust, keine Sicherheitslücke im
gemergten Stand (kein Befund war blockierend), aber die Sachbefunde
(insbesondere der Multiset-Hash-Punkt) hätten vor dem Merge auffallen
können, wenn ein Reviewer-/QA-Pass Teil des Standardablaufs gewesen wäre.
Maßnahme: Reviewer-/QA-Pass (analog `code-reviewer`/`qa` Subagenten) als
festen Pflichtpunkt in `CLAUDE.md` Definition of Done ergänzt (gleichrangig
neben „`npm run check` → Exit 0"), zwischen Ausführung und Freigabe/Commit.
Der konkrete Sachbefund (Multiset-Hash-Vergleich) ist als eigenständiges
Finding **F-047** ausgelagert, statt hier mitgeführt zu werden.
Entschieden mit dieser Prozessänderung — der Sachbefund selbst bleibt über
F-047 offen und getrennt verfolgt.
Feature/Run: F4 Invocation Policy, retroactiver Review-Pass, 31.08.2026.

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

**F-048** · `BUG` · P1 · offen
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
Befund 1 = qa Befund 5), 31.08.2026.

**F-049** · `TECH_DEBT` · P2 · offen
Titel: Sammel-Finding F4-Testlücken aus dem retroactiven QA-Pass (fünf
ungetestete Randfälle).
Beschreibung: (1) AC10 Fall 2 deckt nur „manipuliertes", nicht „fehlendes"
Schutzskript ab — die Längenprüfung fängt das vermutlich korrekt ab, ist
aber unbewiesen. (2) Kein Testfall für mehrere gleichzeitige
Verbotsparameter. (3) Keine Fixture für eine teilweise korrupte
`schutzskripte`-Liste (einziger Negativfall ist „Array komplett leer").
(4) `normalisierePfadFuerVergleich` ohne eigenen Test — reine
Schreibvarianten (`C:\Foo\Bar` vs. `c:/foo/bar`) ungeprüft, eine
Regression bliebe unbemerkt. (5) Kein End-to-End-Test der Kette
`pruefeStartfreigabe()` → `ABGELEHNT` → `verweigereStart()`.
Fundstelle: `src/invocation-policy/invocation-policy.test.ts`,
`src/invocation-policy/index.ts:79-91`,
`schemas/examples/kontrollzustand-invocation-policy-baseline.invalid-leere-schutzskripte.json`;
Detailbelege in `state/qa-findings-f4-invocation-policy.md`
(Befunde 2, 3, 4, 6, 7).
Auswirkung: gering — kein bekanntes Fehlverhalten, der Kernablauf (AC10 vier
Fälle inkl. realem VERWEIGERT-Terminalartefakt) ist real getestet. Risiko ist
unbemerkte Regression, nicht aktueller Defekt.
Maßnahme: eine kleine Nachtrags-Iteration an `invocation-policy.test.ts`,
wenn ohnehin ein Workstream an F4 geöffnet wird (z. B. beim F-048-Fix vor
F6). Kein eigenes Feature nötig. Bewusst als ein Finding geführt statt als
fünf, weil es ein einziger Arbeitsschritt ist.
Feature/Run: F4 Invocation Policy, retroactiver Review-Pass, 31.08.2026.

**F-050** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: Schema-Dateien werden weder gegen das Draft-2020-12-Metaschema noch
gegen ihre Handvalidierer geprüft — projektweite Drift-Lücke.
Beschreibung: Zwei zusammenhängende Bestandslücken. (a) Die Gate-Skripte
validieren nur Fixtures gegen den handgeschriebenen Validierer, nie die
Schema-Datei selbst gegen das JSON-Schema-Draft-2020-12-Metaschema — ein
formal ungültiges Schema fällt nicht auf (AC1-artige Kriterien sind damit
faktisch DEKLARIERT, nicht ERZWUNGEN). (b) Schema-Datei und Handvalidierer
sind zwei unabhängige Wahrheitsquellen derselben Regeln; driften sie
auseinander, meldet kein Check das.
Fundstelle: durchgängiges Projektmuster —
`scripts/check-f4-invocation-policy.mjs` und die gleichartigen Gate-Skripte
von F0/F1B/F2/F3/F5/F9; `src/invocation-policy/index.ts:105-231` vs.
`schemas/kontrollzustand-invocation-policy-*.schema.json`.
Auswirkung: mittel auf Sicht — kein aktueller Defekt, aber die Zahl der
Schema/Validierer-Paare wächst mit jedem Feature, und die Drift-Gefahr
wächst mit.
Maßnahme: eigener Harness-Schritt, kein Feature-Nachtrag — ein gemeinsames
Check-Skript, das (a) jede Datei unter `schemas/` gegen das Metaschema
validiert und (b) mindestens die vorhandenen Fixtures gegen Schema UND
Handvalidierer laufen lässt, sodass ein Auseinanderlaufen einen Rot-Fall
erzeugt. Nicht F4-spezifisch, daher bewusst nicht in einem F4-Fix
mitgelöst.
Feature/Run: F4 Invocation Policy, retroactiver Review-Pass (qa Befund 8 +
code-reviewer Befund 3), 31.08.2026.

**F-051** · `PROCESS_IMPROVEMENT` · P1 · offen
Titel: Umsetzungsplan-Tabellenzeilen 6/7 verschweigen die F6/F7-
Systemgrenze zwischen Prozessstart und Klassifikation.
Beschreibung: `docs/projekt/umsetzungsplan-fassung-1.md` Abschnitt 2,
Zeile 6 („Startet erst, wenn Invocation Policy (4) freigibt und Context
Builder (5) liefert") und Zeile 7 („Verarbeitet die Ausgabe des
Gateways") legen für sich gelesen nahe, das Gateway könnte oder müsste
seine eigene Ausgabe selbst bewerten. Tatsächlich weist
`docs/projekt/zielfassung.md` §16.2 (Zeile 334/335) die Klassifikation
ausdrücklich dem Result Evaluator zu und dem Gateway „keine fachliche
Bewertung, keine Fließtextdeutung". Beim F6-Challenge wäre ein naiver
Zuschnitt (ein Feature #6) fast in dieses Duplikat-Muster gelaufen (D5).
Fundstelle: `docs/projekt/umsetzungsplan-fassung-1.md`, Abschnitt 2,
Tabellenzeilen 6/7.
Auswirkung: gering jetzt (im F6-Challenge rechtzeitig erkannt und in
F6a/F7-Zuschnitt aufgelöst), aber ein künftiger Leser der Tabelle allein
würde denselben Fehler wiederholen.
Maßnahme: `features/F6a/feature.md` benennt die Grenze bereits explizit
als Nicht-Ziel (AK12 prüft sie sogar mechanisch per Grep). Optional:
Tabellenzeile 6/7 im Umsetzungsplan um einen Verweis auf §16.2 Zeile
334/335 ergänzen, wenn ohnehin am Dokument gearbeitet wird.
Feature/Run: Challenge F6/F6a, 31.08.2026.

**F-052** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: Zielfassung §16.8 Punkt 5 (Absturz-Erkennung) als offen geführt,
obwohl real gemessen.
Beschreibung: `docs/projekt/zielfassung.md` §16.8 Punkt 5 lautet
„Erkennung eines nach Absturz möglicherweise noch laufenden
Werkzeugprozesses. (Weiterhin offen — an Vertrag 3 gebunden.)".
`state/tp-nachtrag.md`, Abschnitt „TP-01 e", enthält aber bereits zwei
reale Messfälle (A: Abbruch per `kill -9`, B: Zeitüberschreitung per
`timeout 5s`) mit dokumentiertem Befund: kein terminales Ergebnisobjekt,
leeres stderr, kein Rest- oder Kindprozess (per `Get-CimInstance
Win32_Process` geprüft). Der Punkt ist damit faktisch beantwortet, aber
die Zielfassung wurde nicht nachgezogen.
Fundstelle: `docs/projekt/zielfassung.md` §16.8 Punkt 5;
`state/tp-nachtrag.md`, Abschnitt „TP-01 e", Messfall A und B.
Auswirkung: gering direkt, aber erzeugt unnötige Nacharbeit — F6a hätte
sonst denselben Messvorgang für vermeintlich neu gehalten (im
F6-Challenge bereits vermieden, siehe `features/F6a/journal.md`).
Maßnahme: §16.8 Punkt 5 mit Verweis auf `state/tp-nachtrag.md`
schließen oder den verbleibenden Restumfang (z. B. Windows-PID-Mapping
von Git-Bash-Subshells, dort als offene Unsicherheit vermerkt) präzise
benennen, statt den Punkt pauschal offen zu lassen.
Feature/Run: Challenge F6/F6a, 31.08.2026.

**F-053** · `TECH_DEBT` · P1 · offen
Titel: E-188-Wirksamkeitsnachweis ohne je erbrachten Rot-Fall (§16.8
Punkt 3) — blockierend für F6b.
Beschreibung: `pruefeStartbedingung2`
(`src/invocation-policy/index.ts`) prüft, dass ein
Wirksamkeitsnachweis zum aktuellen Gültigkeitsschlüssel passt — nicht,
dass dieser Nachweis je durch einen echten Rot-Fall (Schutzschicht
tatsächlich wirksam gegen einen realen Umgehungsversuch getestet)
verdient wurde. `docs/projekt/zielfassung.md` §16.8 Punkt 3 führt „Der
konkrete bekannte Rot-Fall der Wirksamkeitsprüfung" weiterhin als offen.
Solange kein Aufrufer schreibt, folgenlos; sobald F6b (Claude-Code-
Gateway, Schreibwirkung) startet, ist F4s `FREIGEGEBEN` für E-188 eine
ungedeckte Behauptung.
Fundstelle: `src/invocation-policy/index.ts`
(`pruefeStartbedingung2`); `docs/projekt/zielfassung.md` §16.8 Punkt 3.
Auswirkung: hoch bei F6b, null bei F6a (F6a führt keine
Schreibwirkung aus, siehe `features/F6a/feature.md` Nicht-Ziele).
Maßnahme: Rot-Fall-Erzeugung und -Nachweis als Pflichtbestandteil von
F6b, blockierend vor dem ersten Lauf mit Schreibwirkung. Nicht Teil von
F6a.
Feature/Run: Challenge F6/F6a, 31.08.2026.

**F-054** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Mehrzeiliger `&&`-verketteter Terminalblock in PowerShell bricht
mitten im Ablauf ab und hinterlässt einen halb ausgeführten Zustand.
Beschreibung: Ein per 🖥️ TERMINAL ausgegebener Block der Form
`git checkout main && git pull --ff-only origin main` scheitert unter
Windows PowerShell mit `ParserError: Das Token "&&" ist in dieser
Version kein gültiges Anweisungstrennzeichen` (PowerShell < 7 kennt kein
`&&`). Zweimal in dieser Sitzung aufgetreten. Beim zweiten Mal blieb ein
`git checkout -b feature/f6a-gateway-lesepfad` auf einer veralteten
Branch-Basis stehen (`checkout main` war zuvor am `&&` gescheitert, ein
stales `.git/index.lock` verhinderte danach zusätzlich den Fallback-
Checkout), sodass der neue Feature-Branch 1 vor/1 hinter `origin/main`
divergierte, bevor überhaupt ein Commit stattfand — nur durch
`git reset --hard origin/main` vor dem ersten Commit folgenlos
korrigierbar.
Fundstelle: 🖥️ TERMINAL-Blöcke dieser Sitzung (PR-Merge- und
Branch-Wechsel-Sequenzen); `.claude/`-Umgebung des Nutzers ist Windows
PowerShell, nicht Git Bash/POSIX-sh.
Auswirkung: mittel — kein Datenverlust in dieser Sitzung, aber ein
Terminalblock, der stillschweigend mitten im Ablauf abbricht, kann bei
destruktiveren Folgebefehlen (z. B. einem `git reset` auf den falschen
Branch) real schaden.
Maßnahme: Terminalblöcke für diesen Nutzer künftig zeilenweise ohne
`&&`-Verkettung ausgeben (PowerShell-kompatibel), oder pro Zeile mit
`;` trennen, das PowerShell akzeptiert. Bei mehrschrittigen Git-
Sequenzen zusätzlich nach dem Lauf explizit den erreichten Zustand
gegenprüfen (Branch, HEAD, ahead/behind), statt den Erfolg aus dem
Terminaloutput anzunehmen.
Feature/Run: PR #35 Merge- und F6a-Branch-Erstellung, 31.08.2026.
**F-055** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Wiederholt stale `.git/index.lock` durch Lesebefehle über die
Geräte-Brücke blockiert nachfolgende echte Git-Operationen.
Beschreibung: In dieser Sitzung dreimal aufgetreten. Ein über
`mcp__remote-devices__device_bash` ausgeführter, rein lesender Git-Befehl
(`git status`, `git fetch`, `git log`) hinterlässt gelegentlich eine
`.git/index.lock`-Datei (0 Byte), die die Geräte-Brücke selbst nicht
löschen kann (`Operation not permitted` beim Versuch, sie zu entfernen —
vermutlich eine Dateisperren-Eigenheit der Windows/Bridge-Kombination,
Ursache nicht untersucht, außerhalb des Geltungsbereichs dieses
Findings). Jeder danach im echten Terminal des Nutzers ausgeführte
schreibende Git-Befehl (`git add`, `git commit`, `git checkout`)
scheitert mit „fatal: Unable to create '…/.git/index.lock': File
exists." — unabhängig davon, ob der Nutzer selbst gerade einen Git-
Prozess laufen hat. In einem Fall blieb dadurch ein `git checkout -b`
auf einer veralteten Branch-Basis stehen, bevor der stale Lock bemerkt
wurde (siehe F-054).
Fundstelle: `mcp__remote-devices__device_bash`-Aufrufe dieser Sitzung
(mehrere `git status`/`git fetch`/`git log`-Lesebefehle im Wechsel mit
🖥️ TERMINAL-Anweisungen an den Nutzer); `.git/index.lock` im lokalen
Repo-Klon des Nutzers (`C:\Users\stefa\Projekte\ai-workforce`).
Auswirkung: mittel — kein Datenverlust in dieser Sitzung (jedes Mal
rechtzeitig bemerkt, bevor destruktive Befehle liefen), aber
wiederkehrende Reibung: der Nutzer muss den Terminalblock abbrechen,
`Remove-Item .git\index.lock` manuell ausführen und den unterbrochenen
Schritt erneut anstoßen. Bei einem unbeaufsichtigten oder eiligen Ablauf
steigt das Risiko, einen halb ausgeführten Zustand zu übersehen.
Maßnahme: Vor jedem 🖥️ TERMINAL-Block, der auf zuvor über die
Geräte-Brücke gelesenen Git-Zustand aufbaut, den lesenden Git-Zugriff über
die Brücke minimieren oder den Nutzer routinemäßig `Remove-Item
.git\index.lock -ErrorAction SilentlyContinue` als ersten Schritt
ausführen lassen, bevor irgendein schreibender Git-Befehl folgt — statt
den Lock-Fehler erst nach dem Auftreten zu behandeln. Kein Code-Fix
nötig, reine Ablaufänderung dieser Rollenkette.
Feature/Run: Challenge/Planung F6a, PR-Merge- und Branch-Sequenzen,
31.08.2026.
**F-056** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Feature-Branch nach Squash-Merge nicht gelöscht/rebased → zweite Divergenz-Kollision.
Beschreibung: Nach PR #36 (Squash-Merge von Commit `4296504`) wurde auf `feature/f6a-gateway-lesepfad` weitergearbeitet statt der Branch gelöscht oder sofort neu von `main` abgezweigt. Dasselbe Muster wie F-054 (dort als Near-Miss dokumentiert), hier real mit GitHub-Merge-Konflikten in `feature.md`/`journal.md`/`findings.md` auf einem Branch mit echtem Produktcode (WS1-Build). Diagnose: `git diff 4296504 ad72e14 --stat` leer (identische Bäume), behoben per `git rebase --onto ad72e14 4296504 feature/f6a-gateway-lesepfad` und `git push --force-with-lease`, danach konfliktfrei gemergt (PR #37).
Fundstelle: PR #36 → `feature/f6a-gateway-lesepfad` → PR #37.
Auswirkung: bisher nur Merge-Reibung, kein Datenverlust; Risiko steigt mit Branch-Lebensdauer nach Squash-Merges.
Maßnahme: Prozessregel — nach jedem Squash-Merge den Quell-Branch löschen (GitHub-Standardangebot nutzen) oder sofort per `git rebase --onto <main-HEAD> <alter-pre-squash-commit> <branch>` aktualisieren, bevor weitergearbeitet wird.
Feature/Run: F6a WS1, PR #36/#37, 31.08.2026.

**F-057** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: Subprozessstart des Claude-Code-Gateways muss Argv-Array nutzen, nicht Shell-String.
Beschreibung: F6a (`src/claude-code-gateway/index.ts`) liefert den Aufruf bereits als Tokens-Array (`baueAufruf`). WS2/WS3 (Prozessstart, noch nicht gebaut) darf dieses Array beim tatsächlichen Subprozessstart nicht zu einem Shell-Kommandostring zusammenfügen (z. B. `child_process.exec`/`execSync` mit interpoliertem String) — dynamischer Prompt-Inhalt im `-p`-Argument könnte sonst über Shell-Metazeichen (`;`, Backtick, `$()`, Anführungszeichen-Escape) aus dem beabsichtigten Einzelbefehl ausbrechen. Node bietet mit `child_process.execFile`/`spawn` samt Argv-Array einen Weg, der den Shell-Parser vollständig umgeht.
Fundstelle: `src/claude-code-gateway/index.ts` (`baueAufruf`, liefert `AufrufTokens`), noch kein Subprozessstart-Code vorhanden (WS2/WS3 offen).
Auswirkung: real erst mit dem WS2-Bau — ohne diese Vorgabe könnte ein einziger Fehlgriff (Shell-String statt Argv-Array) E-182 faktisch aushöhlen, unabhängig davon, wie sorgfältig `pruefeAufrufparameter` selbst geprüft hat.
Maßnahme: In plan-v1 für WS2 als bindende Design-Entscheidung aufnehmen: Subprozessstart ausschließlich über `execFile`/`spawn` mit Argv-Array, nie über eine shell-interpretierte Kommandozeile. Kein eigener Vertrag nötig — normale Vorgabe im WS2-Plan.
Feature/Run: Challenge F-030 (Reprüfung), im Zuge von F6a, 31.08.2026.
