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

**F-058** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Korrektur eines Findings propagiert nicht automatisch in referenzierende Feature-Akten.
Beschreibung: Die F-030-Reprüfung (31.08.2026, PR #38) korrigierte den Finding-Eintrag selbst korrekt (Status „korrigiert", Nachtrag), aktualisierte aber nicht die Dependencies-Sektion in `features/F6a/feature.md`, die F-030 wörtlich als „Hard, offen und blockierend" zitierte. Der Widerspruch blieb bis zur WS2/WS3-Statusprüfung (31.08.2026) unbemerkt in der Feature-Akte stehen.
Fundstelle: `features/F6a/feature.md`, Dependencies-Sektion, vor Korrektur in diesem Commit.
Auswirkung: gering hier (rein dokumentarisch, kein Code betroffen), aber ein Muster, das bei einer echten Blockade-Aufhebung zu falscher Zurückhaltung oder bei einer neu entstandenen Blockade zu übersehenem Risiko führen könnte.
Maßnahme: Konvention aufnehmen — wird ein Finding korrigiert, das in einer Feature-Akte wörtlich zitiert oder als Dependency referenziert ist, gehört die Prüfung dieser Referenzstellen zum selben Korrektur-Schritt, nicht zu einem späteren Zufallsfund.
Feature/Run: F6a WS2/WS3-Statusprüfung, 31.08.2026.

**F-059** · `TECH_DEBT` · P2 · **gelöst**
Titel: `modell_beobachtet` bleibt in WS2 hart `null` — keine Extraktion aus der realen Laufausgabe.
Beschreibung: `state/tp-nachtrag.md` belegt an keiner Stelle ein `model`-Feld im `"type":"result"`-JSON von `claude -p --output-format json`. Statt eines geratenen Feldnamens setzt WS2 (`src/claude-code-gateway/index.ts`) den Wert bewusst hart auf `null`; Schema (`schemas/kontrollzustand-laufakte-payload.schema.json`) führt `modell_beobachtet` als `string | null`. Entspricht der ursprünglichen Design-Entscheidung 5 aus `state/plan-v1-f6a-ws2-ws3-prozessstart.md` (Annahme, nicht Fakt) und der expliziten Bauanweisung, nicht zu raten.
Fundstelle: `src/claude-code-gateway/index.ts`, `schemas/kontrollzustand-laufakte-payload.schema.json`, `features/F6a/feature.md` AK8.
Auswirkung: gering — Modellidentität war ohnehin nur Rang `OBSERVED`, nie Zusicherung (E-185); die Laufakte funktioniert vollständig auch ohne dieses Feld.
Maßnahme: WS4 SCOPE 7 (03.09.2026, FOLGT-Klausel `state/tasks/f6a-ws4-windows-prozessstart.md`) lieferte erstmals ein echtes `"type":"result"`-Objekt — es trägt ein `modelUsage`-Objekt, dessen (einziger) Schlüssel den Modellnamen bildet (`"claude-sonnet-5"`, real gemessen). `leseModellBeobachtet` (`src/claude-code-gateway/index.ts`) extrahiert ihn nur bei genau einem Schlüssel, sonst bleibt der Wert `null` (nicht raten, Muster F-059/F-061 bleibt für den Ambiguitätsfall gültig).
Feature/Run: F6a WS2-Bau, 31.08.2026; gelöst in WS4, 03.09.2026.

**F-060** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: AK14-Grep-Regel (Shell-String-Verbot) im F6a-Gate hat reale Erkennungslücken.
Beschreibung: Reviewer-/QA-Pass (frischer Kontext, 31.08.2026) hat die Regel in `scripts/check-f6a-claude-code-gateway.mjs` gegen gedachte Verstoßfälle laufen lassen: `execSync(cmd)` (Wortgrenze `\bexec\(` matcht nicht „execSync("), `tokens.join(',')` (Regel verlangt exakt ein Leerzeichen als Trennzeichen) und Template-Literal-Zusammenbau ohne `.join` werden **nicht** erkannt. Der tatsächlich gebaute Code (`prozessstart.ts`) ist sauber (`execFile` mit Argv-Array, F-057 eingehalten) — die Lücke betrifft nur die Regression-Erkennung für künftige Änderungen. Zum Vergleich: `scripts/check-f4-invocation-policy.mjs:259` nutzt für ein ähnliches Verbot bereits ein wortgrenzensicheres Muster für `execSync`.
Fundstelle: `scripts/check-f6a-claude-code-gateway.mjs`, AK14-Grep-Regel; Vergleichsmuster `scripts/check-f4-invocation-policy.mjs:259`.
Auswirkung: kein aktueller Verstoß, aber die mechanische Absicherung von F-057 ist schwächer als angenommen — ein künftiger Fehlgriff (z. B. `execSync` statt `execFile`) würde vom Gate nicht zuverlässig erkannt.
Maßnahme: Regel härten (Wortgrenzen-sicheres Muster für `exec`/`execSync`, Trennzeichen-unabhängige Join-Erkennung, ggf. Template-Literal-Heuristik) — Muster aus F4s Gate übernehmen. Kein Blocker für den aktuellen Merge, vor dem nächsten Gateway-bezogenen Bau nachziehen.
Feature/Run: F6a WS2-Reviewer-/QA-Pass, 31.08.2026.

**F-061** · `TECH_DEBT` · P2 · offen
Titel: `is_error`/`non_execution_kind` (E-184) in `state/tp-nachtrag.md` an keiner Stelle real belegt.
Beschreibung: `docs/projekt/zielfassung.md` E-184 verlangt für die Erfolgs-/Verweigerungs-Klassifikation eines Laufs u. a. `is_error` und `non_execution_kind` aus der strukturierten Ergebnisausgabe. Volltextsuche in `state/tp-nachtrag.md` (allen bisherigen realen `claude -p --output-format json`-Messungen, TP-03d Messfall 1-3, TP-01e Messfall A/B): beide Feldnamen kommen nirgends vor. Real belegt sind ausschließlich `permission_denials` und `result` (TP-03d Messfall 1/2, Wortlaut-Zitate) sowie das Fehlen jedes Ergebnisobjekts bei Abbruch/Zeitüberschreitung (TP-01e). Gleiches Muster wie F-059 (`modell_beobachtet`): ein in der Zielfassung benanntes Feld ohne empirischen Beleg.
Fundstelle: `docs/projekt/zielfassung.md` Zeile 205 (E-184); `state/tp-nachtrag.md` (Volltextsuche negativ).
Auswirkung: gering für F7 selbst — die Kernklassifikation (FEHLGESCHLAGEN/VERWEIGERT/ERFOLGREICH) stützt sich laut `state/plan-v1-f7-result-evaluator.md` ausschließlich auf real belegte Signale (`beobachtungsbasis_vollstaendig`, `permission_denials`); beide unbelegten Felder werden nur informativ, nicht klassifikationsrelevant geführt.
Maßnahme: Feldnamen real klären, sobald ein echter Lauf ein vollständiges Ergebnisobjekt liefert — natürlicher Zeitpunkt ist WS3 (`state/tasks/f6a-ws3-realer-nachweis.md`). Danach kleiner Nachtrag an F7, keine Architekturänderung nötig.
Feature/Run: F7-Challenge, 31.08.2026.

**F-062** · `HARNESS_IMPROVEMENT` · P3 · **gelöst**
Titel: `leseErgebnisobjekt` (F6a) nicht exportiert — F7 kann die Ergebnisobjekt-Parsing-Logik ohne Export nicht wiederverwenden (D5).
Beschreibung: `src/claude-code-gateway/index.ts:71` definiert `leseErgebnisobjekt(stdout): Record<string, unknown> | null` (parst `stdout` als JSON, akzeptiert nur `type === 'result'`) als modulinterne, nicht exportierte Funktion. F7 (Result Evaluator) braucht exakt diese Logik, um das strukturierte Ergebnisobjekt zu lesen — ohne Export müsste F7 sie duplizieren, ein D5-Verstoß (Nachbau von Logik, die ein anderes Modul bereits besitzt).
Fundstelle: `src/claude-code-gateway/index.ts:71`.
Auswirkung: gering — reine Sichtbarkeitsänderung (ein Schlüsselwort), kein Verhaltensunterschied, keine bestehenden Tests betroffen.
Maßnahme: Als Teil des F7-Baus (`state/plan-v1-f7-result-evaluator.md` Abschnitt 2, Punkt 1) `leseErgebnisobjekt` exportieren. Kein eigener Vertrag nötig.
Feature/Run: F7-Challenge, 31.08.2026; behoben im F7-Baudurchgang (`src/claude-code-gateway/index.ts`, `export function leseErgebnisobjekt`), 02.09.2026.

**F-063** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Advisor-Korrektur (Design-Entscheidung 2) im Plan nachgezogen, aber nicht an der zitierenden Stelle in `features/F7/feature.md` — gleiches Muster wie F-058.
Beschreibung: `state/plan-v1-f7-result-evaluator.md` Design-Entscheidung 2 legt nach dem Advisor-Pass (31.08.2026) fest, dass der Aufrufer die bereits geladene `LaufakteV0Daten` an `klassifiziereLauf` übergibt (kein eigener Laufakte-Lesepfad in F7). `features/F7/feature.md`, Scope-Abschnitt, führte bis zum F7-Baudurchgang weiterhin die ältere Signatur `klassifiziereLauf(laufId, profilReferenz, optionen)` und die Formulierung „liest die Laufakte" — beides widerspricht der advisor-geprüften Planfassung. Im F7-Handoff-Vertrag (`state/tasks/f7-result-evaluator.md`, CONTEXT/OUTPUT) bereits vorab benannt und im selben Baudurchgang auf die Planfassung nachgezogen.
Fundstelle: `features/F7/feature.md`, Scope-Abschnitt (vor Korrektur); `state/plan-v1-f7-result-evaluator.md` Design-Entscheidung 2.
Auswirkung: gering hier (vor jedem Bau erkannt und korrigiert, kein Code auf der falschen Signatur aufgesetzt), aber ein wiederholtes Muster (siehe F-058): eine Advisor-Korrektur im Plan propagiert nicht automatisch in referenzierende Feature-Akten.
Maßnahme: in diesem Baudurchgang behoben (`features/F7/feature.md` Scope-Abschnitt auf die Planfassung nachgezogen). F-058s Maßnahme (Konvention: Referenzstellen einer Korrektur im selben Schritt prüfen) bleibt die zutreffende Prozessregel — kein neuer Maßnahmenpunkt nötig, dieses Finding ist der zweite reale Beleg dafür.
Feature/Run: F7-Baudurchgang, 02.09.2026.

**F-064** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: AK4-Grep-Regel im F7-Gate hat dieselbe Schwächenklasse wie die bereits als F-060 erfasste AK14-Regel.
Beschreibung: Reviewer-Pass (frischer Kontext, 02.09.2026) auf `scripts/check-f7-result-evaluator.mjs`: das Muster `/\.(includes|match|indexOf|search|test)\(/` erkennt keinen `.exec(`-Aufruf einer Regex (`/ERFOLG/.exec(result)` leitet dieselbe Konsolentext-Ableitung ab wie `.test(`, wird aber nicht erfasst), keine `.startsWith(`/`.endsWith(`/Substring-Vergleiche (`result.slice(0,3) === 'ERR'`) und keine Bracket-Notation-Umgehung (`stdout['includes'](...)`). Der Selbsttest deckt nur die vom Regelautor selbst gewählten Verstoßformen ab — strukturell dieselbe Blindheit wie F-060 (ein Selbsttest kann nur die antizipierten Formen prüfen, keine anderen).
Fundstelle: `scripts/check-f7-result-evaluator.mjs`, AK4-Grep-Regel und Selbsttest; Vergleichsmuster F-060 (`scripts/check-f6a-claude-code-gateway.mjs`).
Auswirkung: kein aktueller Verstoß im real gebauten Code — die mechanische Absicherung künftiger Änderungen an `src/result-evaluator/*.ts` ist aber schwächer, als der Name „AK4-Selbsttest bestanden" suggeriert.
Maßnahme: Regel härten (`.exec(` ergänzen, ggf. `.startsWith(`/`.endsWith(`/Bracket-Notation) — idealerweise gemeinsam mit F-060 in einem Harness-Schritt, der beide Gates gleichzeitig auf ein gemeinsames, robusteres Muster hebt, statt jedes Feature-Gate einzeln nachzuziehen. Kein Blocker für den aktuellen Merge.
Feature/Run: F7-Baudurchgang, Reviewer-Pass, 02.09.2026.

**F-065** · `TECH_DEBT` · P3 · offen
Titel: `tool_input`→Tokens-Adapter (F7) tokenisiert nur das Feld `command`; andere String-Felder bleiben ein Einzeltoken, Array-/Objekt-wertige Felder werden übersprungen.
Beschreibung: `toolInputZuTokens` (`src/result-evaluator/index.ts`) tokenisiert am Leerzeichen ausschließlich das Feld `command`; jedes andere String-Feld (z. B. `query`) wird unverändert als ein einzelnes Token behandelt — ein mehrwortig eingebetteter Verbotswert in einem Nicht-`command`-Feld (z. B. `tool_input: { query: 'x --dangerously-skip-permissions y' }`) würde nicht erkannt. Nicht-String-Feldwerte (Arrays, verschachtelte Objekte, z. B. `{ args: ['echo', '--dangerously-skip-permissions'] }`) werden komplett übersprungen, nicht zerlegt. Für die drei real belegten TP-03d-`tool_input`-Formen irrelevant (keine davon nutzt Arrays oder mehrwortige Nicht-`command`-Felder).
Fundstelle: `src/result-evaluator/index.ts`, `toolInputZuTokens`.
Auswirkung: gering jetzt (keine reale Fixture verlangt es, E-186 ist ohnehin nur Zählung ohne Eskalation), wird relevant, falls künftige Werkzeugtypen mehrwortige Nicht-`command`-Parameter oder Array-/Objektparameter mit Sicherheitsrelevanz einführen.
Maßnahme: bei Bedarf erweitern (alle String-Felder tokenisieren, Array-Elemente rekursiv aufnehmen) — kein aktueller Auftrag, da keine reale Evidenz für die Notwendigkeit vorliegt (YAGNI).
Feature/Run: F7-Baudurchgang, Reviewer-Pass, 02.09.2026.

**F-066** · `TECH_DEBT` · P2 · offen
Titel: `pruefeAufrufparameter` (F4) erkennt einen Verbotswert nur als eigenständiges Token — ein ohne Wortgrenze angehängter Verbotswert (kein Leerzeichen-/Quoting-Trenner) bleibt ungezählt.
Beschreibung: QA-/Reviewer-Pass (frischer Kontext, 02.09.2026) auf F7: der neue `tool_input`→Tokens-Adapter deckt die drei realen TP-03d-Formen und den im Plan (Abschnitt 8.4) benannten Shell-Quoting-Einbettungsfall real ab (eigener Test, `bypass_verdacht_anzahl: 1`). Ein Verbotswert, der ohne jede Wortgrenze an ein anderes Token angehängt ist (z. B. `command: 'npm run test--dangerously-skip-permissions'`), bleibt jedoch ungezählt — `pruefeAufrufparameter` vergleicht exakte Tokens (`Array.includes`), keine Teilstrings. Das ist keine F7-spezifische Lücke, sondern eine Eigenschaft von F4s Vergleichssemantik selbst (`src/invocation-policy/verbotene-aufrufparameter.ts`), die durch F7s Adapter erstmals sichtbar wird. Eigener Testfall in `result-evaluator.test.ts` belegt dieses Verhalten jetzt explizit, statt es unverifiziert zu lassen.
Fundstelle: `src/invocation-policy/verbotene-aufrufparameter.ts` (`pruefeAufrufparameter`); sichtbar gemacht über `src/result-evaluator/index.ts` (`toolInputZuTokens`) und den Testfall „bekannte Grenze des tool_input-Adapters …" in `result-evaluator.test.ts`.
Auswirkung: gering — E-186 ist in F7 ohnehin nur Zählung ohne Eskalation (kein Aufrufer, der auf Vollständigkeit dieser Zahl angewiesen wäre); ein künftiges F8, das `bypass_verdacht_anzahl` als vollständiges Sicherheitssignal behandelt, würde diese Lücke erben.
Maßnahme: Änderung an F4s `pruefeAufrufparameter` (außerhalb des F7-Scopes, NICHT-Abschnitt des Vertrags verbietet F4-Änderungen in diesem Baudurchgang) — bei Bedarf eigener, kleiner F4-Nachtrag (Substring- oder Grenzzeichen-sensitive Prüfung), erst wenn ein realer Aufrufer auf Vollständigkeit angewiesen ist.
Feature/Run: F7-Baudurchgang, Reviewer-/QA-Pass, 02.09.2026.

**F-067** · `TECH_DEBT` · P2 · offen
Titel: `stelleLaufstatusFest` (F1B) zeigt bei zwei Terminal-Schreibvorgängen für dieselbe `laufId` das ERSTE, nicht das zuletzt geschriebene `ergebnis`.
Beschreibung: QA-Pass (frischer Kontext, 02.09.2026) auf F7: bei genau einer `run_prepared`-Marke gefolgt von zwei `terminal`-Marken paart die FIFO-Logik in `stelleLaufstatusFest` (`src/checkpoint-store/index.ts`) die einzige offene Sequenz mit dem ERSTEN Terminal; der zweite Terminal landet unpaariert in `terminaleOhneRunPrepared` (Diagnosefeld). Der über `status.ergebnis` sichtbare Wert bleibt damit der des ersten Aufrufs — ein Doppelaufruf „verschwindet nicht still" (der zweite Terminal ist über `terminaleOhneRunPrepared` sichtbar), aber ein Aufrufer, der naiv „letzter Schreibvorgang gewinnt" erwartet, würde das falsche `ergebnis` lesen. Neuer Testfall in `result-evaluator.test.ts` (F-067) belegt dieses Verhalten jetzt explizit.
Fundstelle: `src/checkpoint-store/index.ts`, `stelleLaufstatusFest`, FIFO-Paarungslogik.
Auswirkung: gering jetzt (F7 selbst hat laut Vertrag ausdrücklich keine eigene Idempotenzprüfung zu bauen, `state/tasks/f7-result-evaluator.md` CONTEXT), relevant für ein künftiges F8, das `klassifiziereLauf` möglicherweise wiederholt aufruft (z. B. bei einem Retry) und dabei „letzter Wert gewinnt" annehmen könnte.
Maßnahme: keine Änderung an F1B in diesem Baudurchgang (außerhalb des F7-NICHT-Scopes). Bei F8-Planung berücksichtigen: entweder `terminaleOhneRunPrepared` aktiv auswerten, oder F1B um eine explizite „letzter Terminal gewinnt"-Semantik erweitern, falls ein realer Wiederholungsfall auftritt.
Feature/Run: F7-Baudurchgang, QA-Pass, 02.09.2026.

**F-068** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: Geräte-Brücke (`device_bash`) kann `npm run check`/`lint`/`typecheck` nicht ausführen — fehlende Linux-Plattform-Binärdateien für Biome/TypeScript.
Beschreibung: `node_modules` im Repo wurde unter Windows installiert (`stefans-laptop`, win32); die Geräte-Brücke läuft in einer separaten Linux-VM. `npx biome` bricht mit `Cannot find module '@biomejs/cli-linux-x64/biome'` ab, `npx tsc` mit `Unable to resolve @typescript/typescript-linux-x64`. `node --test` (reiner Node-Testrunner, keine plattformspezifischen nativen Binärdateien) läuft dagegen anstandslos — real geprüft im F7-Reviewer-Nachweis (86/86 Tests grün). Zusätzlich: `rm`/`rmdir` auf Testartefakte schlägt ohne vorherige `device_request_delete_permission`-Freigabe in EPERM fehl (jede Sitzung muss das neu anfordern).
Fundstelle: Geräte-Brücke gegen `~/Projekte/ai-workforce`, 02.09.2026; deckt sich mit der in `claude/100_UEBERGABE_NEUER_CHAT_18_F6A_ABGESCHLOSSEN_F7_GEPLANT.md` dokumentierten Beobachtung zu F6a WS2 (dort musste Stefan Lint/Typecheck manuell bestätigen).
Auswirkung: Eine Challenger-Sitzung kann `npm run check` über die Brücke nie vollständig eigenständig nachvollziehen — nur den Testrunner-Teil. Für Lint/Typecheck bleibt die bauende Terminalsitzung (Stefans Maschine, korrekte Plattform-Binärdateien) die einzige maßgebliche Quelle.
Maßnahme: Kein Fix nötig/möglich (Plattformgrenze der Brücke) — als bekannte Grenze für künftige Challenger-seitige Verifikationen dokumentieren: Testrunner-Teil selbst nachprüfen, Lint-/Typecheck-Ergebnis aus der bauenden Sitzung übernehmen, nicht wiederholen versuchen.
Feature/Run: F7-Reviewer-Nachprüfung (Challenger-Sitzung), 02.09.2026.

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

**F-057** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: Subprozessstart des Claude-Code-Gateways muss Argv-Array nutzen, nicht Shell-String.
Beschreibung: F6a (`src/claude-code-gateway/index.ts`) liefert den Aufruf bereits als Tokens-Array (`baueAufruf`). WS2/WS3 (Prozessstart, noch nicht gebaut) darf dieses Array beim tatsächlichen Subprozessstart nicht zu einem Shell-Kommandostring zusammenfügen (z. B. `child_process.exec`/`execSync` mit interpoliertem String) — dynamischer Prompt-Inhalt im `-p`-Argument könnte sonst über Shell-Metazeichen (`;`, Backtick, `$()`, Anführungszeichen-Escape) aus dem beabsichtigten Einzelbefehl ausbrechen. Node bietet mit `child_process.execFile`/`spawn` samt Argv-Array einen Weg, der den Shell-Parser vollständig umgeht.
Fundstelle: `src/claude-code-gateway/index.ts` (`baueAufruf`, liefert `AufrufTokens`), noch kein Subprozessstart-Code vorhanden (WS2/WS3 offen).
Auswirkung: real erst mit dem WS2-Bau — ohne diese Vorgabe könnte ein einziger Fehlgriff (Shell-String statt Argv-Array) E-182 faktisch aushöhlen, unabhängig davon, wie sorgfältig `pruefeAufrufparameter` selbst geprüft hat.
Maßnahme: In plan-v1 für WS2 als bindende Design-Entscheidung aufnehmen: Subprozessstart ausschließlich über `execFile`/`spawn` mit Argv-Array, nie über eine shell-interpretierte Kommandozeile. Kein eigener Vertrag nötig — normale Vorgabe im WS2-Plan.
Feature/Run: Challenge F-030 (Reprüfung), im Zuge von F6a, 31.08.2026.

**F-075** · `HARNESS_IMPROVEMENT` · P2 · **gelöst**
Titel: AK15-Rot-Fall 'Sperrlisten-Basisname (cmd.exe)' in `scripts/check-f6a-claude-code-gateway.mjs` mit fest verdrahtetem Windows-Pfad — auf Linux (CI) wirkungslos.
Beschreibung: Der Rot-Fall nutzte `'C:\Windows\System32\cmd.exe'` als Startziel. `pruefeStartziel` prüft zuerst, ob `startziel[0]` ein absoluter Pfad ist (`resolve(programm) === programm`); unter Linux ist ein Windows-Pfad wie dieser nie absolut, also greift dort bereits die erste Regel ("kein absoluter Pfad") und die Sperrlisten-Basisname-Prüfung wird nie erreicht — der Rot-Fall testete in CI faktisch eine andere Regel als benannt. Zusätzlich prüfte der Test nur `ok:false`, nicht den erwarteten `grund` — ein falsch getroffener Ablehnungsgrund wäre so nicht aufgefallen.
Fundstelle: `scripts/check-f6a-claude-code-gateway.mjs`, AK15-Rot-Fall-Liste (vor Korrektur Zeile 197).
Auswirkung: gering — auf Windows (Zielplattform) griff die Sperrlisten-Prüfung real, der Guard selbst (`pruefeStartziel`) war nie fehlerhaft. Betroffen war ausschließlich die Testabdeckung: in einer Linux-CI-Umgebung wäre ein Regressionsfehler in der Basisnamen-Sperrliste durch diesen Testfall nicht aufgefallen.
Maßnahme: Startziel auf `join(process.cwd(), 'cmd.exe')` umgestellt (absolut, plattformunabhängig, erreicht die Sperrlisten-Prüfung noch vor der Existenzprüfung). Jeder AK15-Rot-Fall prüft jetzt zusätzlich einen erwarteten Teilstring in `ergebnis.grund`, nicht nur `ok:false` — deckt auch einen falsch getroffenen Ablehnungsgrund auf.
Feature/Run: F6a WS4, Challenger-Nachprüfung vor SCOPE-7-Freigabe, 03.09.2026.

**F-072** · `PROCESS_IMPROVEMENT` · P1 · offen
Titel: Challenger-Sitzungen liefern Verträge aus, ohne sie gegen `scripts/check-contract.mjs` zu prüfen.
Beschreibung: Der Vertrag `f6a-ws4-windows-prozessstart` war inhaltlich vollständig, aber im falschen Format — neun Befunde, CI rot, obwohl das prüfende Skript seit Langem existiert und das Format in `.claude/skills/handoff-vertrag/SKILL.md` festgeschrieben ist. Die Prüfung fand erst in CI statt, nach Branch, Commit und PR. Ein vorangestellter HTML-Kommentar (`<!-- Ziel-Pfad im Repo: … -->`) hätte allein schon die `SCHRITT 0`-Präambelprüfung ausgelöst.
Fundstelle: `scripts/check-contract.mjs`, `.claude/skills/handoff-vertrag/SKILL.md`; Vorfall PR #48, 02.09.2026.
Auswirkung: ein vermeidbarer roter CI-Lauf plus Amend/Force-Push pro Vertrag; bei mehreren Verträgen je Feature ein wiederkehrender Reibungsposten.
Maßnahme: Eine Sitzung, die einen Vertrag nach `state/tasks/` schreibt, prüft ihn vor der Übergabe mechanisch (`node scripts/check-contract.mjs`). Zusätzlich prüfenswert: `check-contract.mjs` in einen Pre-Commit-Hook hängen, damit das Format nicht erst in CI auffällt.
Feature/Run: WS4-Vertragsübergabe, 02.09.2026.

**F-073** · `PROCESS_IMPROVEMENT` · P1 · offen
Titel: Challenger hat eine Abwesenheit aus einem einzigen Ort geschlossen und daraus eine Vertragsprämisse gemacht.
Beschreibung: Der WS4-Vertrag behauptete in CONTEXT „keine native `claude.exe`" — belegt allein dadurch, dass `C:\Users\stefa\.local` nicht existiert. Real liegt die native Binary im `bin`-Verzeichnis des npm-Global-Pakets (`bin/claude.exe`, PE32+, 218.507.936 Bytes). Die naheliegende Gegenprobe (`bin`-Feld der `package.json` lesen) wurde nicht gemacht, obwohl der Vertrag genau diese Messung für Messschritt M vorschrieb — nur eben erst nach der Prämisse. Die bauende Sitzung hat korrekt eskaliert statt auszuweichen; behoben über Nachtrag 1 zum Vertrag.
Fundstelle: `state/tasks/f6a-ws4-windows-prozessstart.md`, CONTEXT-Abschnitt und Nachtrag 1; Messschritt-M-Bericht vom 02.09.2026.
Auswirkung: E1 wurde auf einer falschen Grundlage formuliert; ein Vertragsnachtrag war nötig. Kein Schaden, weil die ESCALATE-Klausel griff — genau dafür war sie da.
Maßnahme: Eine Abwesenheitsaussage gehört nur dann als `[Fakt]` in einen Vertrag, wenn sie an der Stelle gemessen wurde, an der die Sache normalerweise liegt — bei npm-Paketen also am `bin`-Feld, nicht an einem vermuteten Installationspfad. Andernfalls als `[Offene Unsicherheit]` formulieren.
Feature/Run: WS4 Messschritt M, 02.09.2026.

**F-074** · `TECH_DEBT` · P2 · offen
Titel: Werkzeugversion driftet weiter — `state/tp-nachtrag.md` ist als E-188-Quelle nicht belastbar.
Beschreibung: In WS4 real gemessen: `2.1.258 (Claude Code)`. `state/tp-nachtrag.md` hält `2.1.241` (CLI) und `2.1.250` (VSCode-Extension). Dritter abweichender Wert. E-188 nennt die Version des Ausführungswerkzeugs als Bestandteil des Gültigkeitsschlüssels.
Fundstelle: `state/tp-nachtrag.md`; `state/gates.md`, WS4-Eintrag (Messschritt M), 02.09.2026.
Auswirkung: Ein aus Dokumentation gelesener Versionswert erzeugt einen falschen Gültigkeitsschlüssel und damit eine Prüfung, die formal besteht, ohne etwas zu belegen.
Maßnahme: `werkzeugVersionDeklariert` stammt immer aus einer Messung zum Laufzeitpunkt, nie aus `tp-nachtrag.md`. Relevant für die F8-Planung: wer misst, wann, und was passiert bei Abweichung gegen den gepinnten Schlüssel.
Feature/Run: WS4 Messschritt M, 02.09.2026.

**F-076** · `PROCESS_IMPROVEMENT` · P1 · offen
Titel: Git-Kommandos über die Geräte-Brücke hinterlassen eine stale `.git/index.lock` und blockieren Stefans Terminal.
Beschreibung: Die Challenger-Sitzung hat `git status`/`git diff` über die Geräte-Brücke (`device_bash`) im echten Arbeitsverzeichnis ausgeführt. Git legt dabei `.git/index.lock` an; die Brücke darf Dateien standardmäßig nicht löschen („Operation not permitted"), also bleibt die Lock-Datei liegen. Jeder nachfolgende schreibende Git-Befehl in Stefans Terminal scheitert mit „Unable to create '.git/index.lock': File exists" — im Vorfall gleich drei Befehle hintereinander (`add`, `commit`, `push`), gefolgt von einem irreführenden `error: src refspec … does not match any`.
Fundstelle: Vorfall 03.09.2026, nach dem F-072/F-073/F-074-Nachtrag; Warnung „unable to unlink … index.lock: Operation not permitted" in der Brückenausgabe.
Auswirkung: Stefans Terminal ist blockiert, bis er die Lock-Datei manuell entfernt. Die Fehlermeldung nennt fälschlich einen laufenden Git-Prozess und führt damit in die Irre.
Maßnahme: Sitzungen, die über die Geräte-Brücke arbeiten, führen dort **keine** Git-Kommandos aus — Lesen und Prüfen ja (`cat`, `grep`, `sed`, `wc`), Git nein. Git läuft ausschließlich in Stefans eigenem Terminal. Für Diffs gegen `origin/main` gibt die Sitzung stattdessen einen Terminalbefehl aus und liest die Ausgabe. Falls eine Sitzung doch Git braucht: vorher Löschrechte für den Ordner anfordern, sonst bleibt jede Lock-Datei liegen.
Feature/Run: F6a WS4, Findings-Nachtrag, 03.09.2026.

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

**F-081** · `TECH_DEBT` · P3 · offen
Titel: Zuordnung „Werkzeugkonfiguration" und „Schutzskripte" (E-183/E-188) auf konkrete Dateien noch nicht an der Entscheidungsstelle festgehalten.
Beschreibung: E-183/E-188 sprechen von „Werkzeugkonfiguration" und „referenzierten Schutzskripten", ohne die konkreten Dateien zu benennen. Für dieses Projekt: Werkzeugkonfiguration = `.claude/settings.json`, Schutzskripte = die darin referenzierten Hook-Dateien. Diese Zuordnung ist bislang nirgends verbindlich festgehalten.
Fundstelle: `docs/projekt/zielfassung.md` §9.4 E-183/E-188; `.claude/settings.json`.
Auswirkung: Ohne die explizite Zuordnung bleibt offen, welche Datei(en) beim Gültigkeitsschlüssel-Nachweis tatsächlich gehasht werden müssen — Risiko einer Fehlimplementierung in F6b.
Maßnahme: Bei der F6b-Umsetzung die Zuordnung Werkzeugkonfiguration=`.claude/settings.json`, Schutzskripte=dort referenzierte Hook-Dateien verbindlich übernehmen oder, falls abweichend, explizit begründen.
Feature/Run: F6b WS-B Dokumentation, 03.09.2026.

**F-077** · `BUG` · P1 · offen — Lösungsweg entschieden: E3, Umsetzung in WS-D
Titel: `pruefeStartbedingung2` prüft die Herkunft des Wirksamkeitsnachweises nicht.
Beschreibung: Bedingung 1 liest die Baseline commit-gepinnt aus dem externen Repo (Pfad-Präfix, `.gitattributes`, Hash-Vergleich Arbeitsbaum/Commit). Bedingung 2 nimmt den Nachweis als `unknown` direkt vom Aufrufer und prüft nur Schema und Feldgleichheit gegen den selbst gebauten Ist-Schlüssel. Ein Aufrufer, der den Nachweis konstruiert, passiert E-188 immer.
Fundstelle: `src/invocation-policy/index.ts`, `pruefeStartbedingung2`; `features/F4/journal.md`, Nachtrag plan-v2 Delta 2.
Auswirkung: null bei F6a (kein Aufrufer), blockierend bei F6b — E-188 wäre dort eine Selbstauskunft statt einer Schutzschicht.
Maßnahme: D16-analoge Lesekette für den Nachweis (E3, WS-D). Nicht durch F-053 abgedeckt.
Feature/Run: Challenge F6b, 03.09.2026.

**F-079** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Verbindliche Auflage lebt nur in einem Feature-Journal, nicht im Findings-Register.
Beschreibung: Die D16-analoge Schreibschutz-Auflage für den Wirksamkeitsnachweis-Ablageort stand ausschließlich in `features/F4/journal.md` (Nachtrag plan-v2 Delta 2) und im Schema-`description`. Grep über `state/findings.md` nach „Ablageort": null Treffer. Eine Sitzung, die nur das Register liest, übersieht sie.
Fundstelle: `features/F4/journal.md`; `state/findings.md`.
Auswirkung: mittel — die Auflage wurde in Übergabe 101 und 103 beide Male nicht erwähnt.
Maßnahme: Auflagen, die eine spätere Entscheidung binden, gehören zusätzlich ins Register, nicht nur ins Journal.
Feature/Run: Challenge F6b, 03.09.2026.

**F-082** · `PROCESS_IMPROVEMENT` · P1 · offen
Titel: Challenger-Sitzung hat Findings im Chat definiert, aber nicht in einem lesbaren Ort persistiert — Muster wie F-072/F-073/F-076.
Beschreibung: F-077 und F-079 wurden im F6b-Challenge im Chat-Text ausgegeben und per ID referenziert, ihr Volltext stand aber weder in `claude/104_CHALLENGE_F6B_SCHREIBWIRKUNG.md` noch sonst im Projekt/Repo. Die bauende Sitzung (WS-B) konnte die IDs deshalb nicht auflösen und musste zurückfragen.
Fundstelle: `claude/104_CHALLENGE_F6B_SCHREIBWIRKUNG.md`, `claude/105_F6B_ENTSCHEIDUNGEN_UND_WORKSTREAM_SCHNITT.md`.
Auswirkung: ein vermeidbarer Rückfrage-Zyklus vor jedem Commit, in dem ein Handoff-Dokument Finding-IDs referenziert, deren Volltext nicht mitgeliefert wurde.
Maßnahme: Jedes Finding, das in einem Handoff-Dokument per ID referenziert wird, bekommt seinen vollen Register-Text im selben Dokument mit.
Feature/Run: Challenge F6b / WS-B, 03.09.2026.
