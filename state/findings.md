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

**F-083** · `PROCESS_IMPROVEMENT` · P2 · gelöst
Titel: WS-D-Änderungen lagen auf bereits squash-gemergtem Branch.
Beschreibung: Die WS-D-Umsetzung (Wirksamkeitsnachweis-Herkunftsprüfung) wurde auf `docs/f6b-ws-c-startziel-guelttigkeitsschluessel` gebaut — ein Branch, dessen zwei Commits bereits per Squash-Merge nach `origin/main` übernommen worden waren (F-056-Muster). Der Branch war damit gegenüber `origin/main` divergiert; der pre-push-Hook hätte den Push blockiert.
Fundstelle: Branch `docs/f6b-ws-c-startziel-guelttigkeitsschluessel` zum Zeitpunkt des WS-D-Abschlusses.
Auswirkung: gering, aber ein vermeidbarer Korrekturzyklus vor jedem Push — der Arbeitsauftrag hätte von vornherein einen neuen Branch von `origin/main` verlangen müssen statt auf dem WS-C-Branch weiterzubauen.
Maßnahme: Korrigiert im WS-D-Abschluss-Vertrag — Arbeitsverzeichnis-Diff gesichert, neuer Branch `f6b-ws-d-wirksamkeitsnachweis-herkunftspruefung` von frisch geholtem `origin/main` erzeugt, Änderungen dorthin übertragen. Für künftige Workstream-Ketten: jeder neue WS-Vertrag sollte explizit auf einem Branch von aktuellem `origin/main` aufsetzen, nicht auf dem Vorgänger-WS-Branch, sobald dessen PR gemergt ist.
Feature/Run: F6b WS-D-Abschluss, 03.09.2026.

**F-084** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Git-Schreibzugriffe auf `ai-workforce` über die Desktop-Bridge sind unzuverlässig (Unlink-/Lock-Berechtigungsfehler) — wiederholt aufgetreten trotz dokumentierter Gegenmaßnahme.
Beschreibung: Bei drei Reviews (WS-D, WS-E, WS-F) hat ein `git checkout`/`merge`/`pull` über die Bridge einen hängenden `.git/index.lock` bzw. `.git/ORIG_HEAD.lock` hinterlassen (Netzwerk-Mount-Unlink-Semantik), der Stefans eigenes Terminal danach blockierte.
Fundstelle: Review-Sitzungen 03.09.2026 (WS-D, WS-E, WS-F), `mcp__remote-devices__device_bash` gegen `C:\Users\stefa\Projekte\ai-workforce`.
Auswirkung: Kein Datenverlust (Inhalt jedes Mal hash-verifiziert identisch), aber wiederholter manueller Korrekturaufwand für Stefan.
Maßnahme: Reviewer-Zugriffe über die Bridge sind ausschließlich `fetch`/`show`/`log`/`diff`/Hash-Vergleich. Jeder Branch-Sync (`checkout main`, `merge`/`pull`/`reset --hard origin/main`) geht als Terminalbefehl an Stefan, nie als eigener Bridge-Aufruf.
Status: offen (Verhaltensänderung der Challenger-Rolle aktiv seit 03.09.2026)
Feature/Run: F6b WS-D/WS-E/WS-F Reviews, 03.09.2026.

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

**F-086** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Bauauftrag 108 (F6b WS-G) widersprüchlich zwischen CONTEXT und SCOPE-Punkt 2 bei der Referenzquelle für startfreigabe.
Beschreibung: CONTEXT beschrieb state/aktuelle-autorisierung.json als von starteGateway selbst gelesene Pfad-Konstante; SCOPE-Punkt 2 verlangte zusätzlich ein startfreigabe-Feld in GatewayEingaben, über das der Aufrufer dieselben Referenzen mitliefert. Claude Code ist während der Umsetzung darauf gestoßen und hat korrekt eskaliert statt eigenmächtig zu entscheiden. Entschieden: starteGateway liest die Datei selbst, kein Feld in GatewayEingaben (Sicherheitsgrund: kein Aufrufer soll die geprüfte Autorisierung selbst bestimmen können).
Fundstelle: claude/108_F6B_WS_G_BAUAUFTRAG.md, CONTEXT vs. SCOPE Punkt 2.
Auswirkung: kein Schaden (Eskalation griff), unnötige Rückfrage.
Maßnahme: Bauaufträge vor Vergabe auf Konsistenz zwischen CONTEXT und SCOPE prüfen, insbesondere bei sicherheitsrelevanten Schnittstellen.
Status: gelöst · Feature/Run: F6b WS-G, 03.09.2026.

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

**F-090** · `TECH_DEBT` · P1 · offen, zurückgestellt (E-192)
Titel: Drei-Ebenen-Zustandsmodell (Workstream → Execution → Lauf, §16.8 Punkt 6 / A4) existiert im Kern nicht und wird in Fassung 1 bewusst nicht gebaut.
Beschreibung: Grep über `src/` findet keine Workstream- oder Execution-Identität; `src/checkpoint-store/` führt ausschließlich `laufId`. Die Zielfassung erklärt §16.8 Punkt 6 als geschlossen und weist dem Execution Controller zwei Automaten zu — beide Ebenen sind nie gebaut worden. Mit E-192 ist entschieden, sie in Fassung 1 auch nicht zu bauen.
Fundstelle: `docs/projekt/zielfassung.md:332`, `:381`; `src/checkpoint-store/types.ts`.
Auswirkung: Bewusste, dokumentierte Abweichung von einer als geschlossen geführten Architekturentscheidung. Wird teuer, falls sich später zeigt, dass eine Execution mehrere Läufe bündeln muss — der Checkpoint Store bekäme nachträglich eine zweite Identitätsachse, was Hash-Kette und Artefaktpfade berührt.
Maßnahme: Als P1-Schuld sichtbar halten. In `features/F8/feature.md` als ausdrückliches Nicht-Ziel benannt; `zielfassung.md` §16.8 Punkt 6 und §16.2 Zeile 332 bekommen den Zusatz „Automaten in Fassung 1 nicht implementiert (E-192)". Neu bewerten, sobald ein realer Mehr-Lauf-je-Execution-Fall auftritt.
M3-Relevanz: F15 (Workflow-Artefakt + Schritt-Automat) ist der in der Maßnahme genannte reale Mehr-Lauf-je-Execution-Fall — vor F15-WS-1 gegen das geplante WORKFLOW_V0-Datenmodell prüfen, ob eine zweite Identitätsachse (Schritt vs. Lauf) die bestehende Hash-Kette/Artefaktpfade berührt.
Feature/Run: Challenge F8, 04.09.2026.

**F-091** · `TECH_DEBT` · P2 · offen
Titel: F9s `haendigeAus` schreibt `run_prepared` — eine Eskalation unter der `laufId` des auslösenden Laufs kippt dessen Status zurück auf `KLAERUNG_ERFORDERLICH`.
Beschreibung: `haendigeAus` (`src/human-transport/index.ts:147`) schreibt bewusst eine `run_prepared`-Wirkungsmarke, weil die Außenwirkung mit dem Verlassen des Systems beginnt (D3). `stelleLaufstatusFest` (`src/checkpoint-store/index.ts:697`) paart `run_prepared` und `terminal` FIFO; eine zusätzliche, unpaarige `run_prepared` führt immer zu `KLAERUNG_ERFORDERLICH`. Löst F8 die E-186-Eskalation unter der `laufId` des bereits klassifizierten Laufs aus, gilt dieser Lauf danach als ungeklärt, obwohl er sauber klassifiziert wurde.
Fundstelle: `src/human-transport/index.ts:147`; `src/checkpoint-store/index.ts:697-740`.
Auswirkung: Ohne Klärung würde jede E-186-Eskalation den auslösenden Lauf scheinbar entwerten. Kein Datenverlust, aber ein falscher Statuswert an genau der Stelle, an der ein Sicherheitsverdacht gemeldet wird.
Maßnahme: F8 führt die Eskalation unter einer eigenen `laufId` und verbindet sie über die Lineage (F2) mit dem auslösenden Lauf. Als AK6 in `features/F8/feature.md` festgeschrieben, in plan-v1 real nachzuweisen.
Feature/Run: Challenge F8, 04.09.2026.

**F-092** · `PROCESS_IMPROVEMENT` · P1 · offen
Titel: Challenger-Handoffs referenzieren Claude-Projekt-Dokumente per Pfad, die für die bauende Sitzung nicht erreichbar sind — Muster wiederholt sich jetzt auf Dokumentebene, nicht nur bei einzelnen Finding-IDs.
Beschreibung: Im F8-Bauauftrag wurde `claude/110_CHALLENGE_F8_ENTSCHEIDUNGEN_UND_FEATURE_AKTE.md` zunächst nur als Pfadverweis übergeben. Die bauende Sitzung hat bestätigt, dass sie keine Claude-Projekt-Dokumente erreicht — nur was real im Repo liegt. Repo-seitig verifiziert: `claude/` enthält nur `65_...` und `66_...`, alle anderen 108 Dokumente (inkl. `109`, `110`) existieren ausschließlich im Claude-Projekt. Strukturell verwandt mit F-013 (Sync Repo→Projekt liefert nichts) und F-082 (Finding-IDs ohne Volltext) — dieselbe Grundursache, jetzt erstmals bei ganzen Handoff-Dokumenten.
Fundstelle: `claude/` (Repo, 2 von 110 Dateien vorhanden) vs. Claude-Projekt „AI Workforce" (alle 110); Vorfall F8-Feature-Akte, 04.09.2026.
Auswirkung: Jeder Bauauftrag mit reinem Pfadverweis auf ein Projekt-Dokument erzeugt einen vermeidbaren Rückfrage-Zyklus — zweiter Auftreten dieses Grundmusters in derselben Challenge-Runde.
Maßnahme: Generalisierung von F-082s Maßnahme: ein Bauauftrag darf sich auf ein `claude/*`-Projekt-Dokument nur per Pfad beziehen, wenn der relevante Volltext im selben Prompt mitgeliefert wird. Reiner Pfadverweis ist nur für nachweislich committete Pfade zulässig (`docs/`, `state/`, `features/`, `src/`).
Feature/Run: Challenge F8, Bauauftrag `features/F8/feature.md`, 04.09.2026.

**F-094** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: F2 hat kein dediziertes Lauf-zu-Lauf-Lineage-Primitiv — F8s Wiederaufnahme-/Eskalationsverweis (AK6/AK7) wiederverwendet F9s D2-Muster in einer neuen, noch nie geprüften Anwendung.
Beschreibung: `registriereKernArtefakt`s `eingaben: EingabeReferenz[]` (`src/lineage-registry/index.ts:85-114`) verlangt nur einen frei gewählten `pfad`-String, keine erzwungene Dateisystemsemantik — F9 nutzt das bereits für einen synthetischen `artefakt:<id>`-Schlüssel, aber ausschließlich für eine Referenz **innerhalb derselben `laufId`** (BEDARF_V0 → Transportpaket, `state/plan-v1-f9-human-transport.md` D2, dort per Advisor-Pass als „fachlich tragfähig" bestätigt, `state/advisor-findings-f9-human-transport.md`). `state/plan-v1-f8-execution-controller.md` Abschnitt 2.2/2.3 wendet dasselbe Muster erstmals **über eine `laufId`-Grenze hinweg** an (Eskalations-BEDARF_V0 referenziert `laufakte-<ausloesenderLaufId>`; der Wiederaufnahme-Kontextpaket referenziert `laufakte-<vorgaengerLaufId>`) — strukturell von F2 gedeckt (kein Code-Widerspruch), aber ohne eigene Prüfung dieser spezifischen Anwendung.
Fundstelle: `src/lineage-registry/index.ts:85-114`; `state/plan-v1-f8-execution-controller.md` Abschnitt 2.2/2.3/4 (D2), Abschnitt 10 Frage 1.
Auswirkung: gering — kein Blocker für plan-v1, aber ein echter, unentschiedener Punkt vor dem WS-2-Bauauftrag: ohne Advisor-Bestätigung bliebe der einzige Lineage-Beleg für AK6/AK7 ungeprüfte Neuware.
Maßnahme: Advisor-Pass auf `state/plan-v1-f8-execution-controller.md` mit explizitem Fokus D2 (Lauf-zu-Lauf-Anwendung), vor dem WS-2-Handoff-Vertrag.
Feature/Run: Planung F8 (plan-v1), 04.09.2026.

**F-093** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Feature-Akten-Status wird beim Abschluss eines Features nicht verlässlich nachgezogen.
Beschreibung: F-088 hat den Drift zwischen Feature-Akten-Status und realem Bauzustand bei F4/F6a/F7 aufgedeckt und behoben. Bei der Bereinigung stellte sich heraus, dass derselbe Drift unabhängig davon auch bei F0, F1 und F3 vorlag — alle drei standen weiterhin auf `READY_FOR_TECH`, obwohl längst gemergt und real abgeschlossen. Der Drift wurde beide Male nicht während des Baus bemerkt, sondern erst durch eine spätere, eigens dafür angesetzte manuelle Gegenprüfung entdeckt.
Fundstelle: `features/F0/feature.md:13`, `features/F1/feature.md:13`, `features/F3/feature.md:13` (vor Korrektur); `F-088`.
Auswirkung: Zweites Auftreten desselben Grundmusters — der Status-Drift ist kein Einzelfall, sondern ein strukturelles Loch im Abschluss-Schritt. Ohne Gegenmaßnahme ist ein drittes Auftreten (z. B. bei F2, F5, F9) wahrscheinlich.
Maßnahme: Statuswechsel der Feature-Akte auf `ABGESCHLOSSEN` als verbindlicher Bestandteil des Abschluss-Schritts, geprüft im selben Commit wie der letzte Bau-Commit des Features — nicht als spätere, separate Dokumentationskorrektur.
Feature/Run: Bereinigung F-088-Nachtrag (F0/F1/F3), 04.09.2026.

**F-095** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: plan-v2-f8-execution-controller.md ordnet Frage 4
(GatewayOptionen-Durchreichung) in der Zusammenfassung dem falschen
Workstream zu.
Beschreibung: Die Zusammenfassung von plan-v2 weist die aus plan-v1
Abschnitt 7 offene Frage 4 (Form der GatewayOptionen-Durchreichung)
„vor WS-2b" zu, obwohl sie laut plan-v1 Abschnitt 7 und
features/F8/feature.md unmittelbar AK8 betrifft, das WS-1 zugeordnet
ist. Im Vertrag state/tasks/f8-execution-controller-ws1.md wurde das
richtiggestellt (SCOPE Punkt 2, Widerspruch im CONTEXT-Abschnitt
dokumentiert) — plan-v2 selbst wurde nicht korrigiert.
Fundstelle: state/plan-v2-f8-execution-controller.md (Zusammenfassung),
state/tasks/f8-execution-controller-ws1.md SCOPE Punkt 2 / CONTEXT.
Auswirkung: Wer plan-v2 direkt liest (z. B. beim WS-2b-Vertrag), erbt
die falsche Zuordnung erneut. Gleiches Muster wie F-088/F-093:
Korrektur unten in der Kette statt an der Quelle.
Maßnahme: plan-v2-Zusammenfassung auf AK8/WS-1 korrigieren, bei
Gelegenheit (z. B. zusammen mit dem WS-2b-Vertrag).
Feature/Run: F8 WS-1-Vertrag, 04.09.2026.

**F-096** · `TECH_DEBT` · P2 · offen
Titel: D2 (artefakt:<id>-Pfadschlüssel über laufId-Grenze hinweg) als
„bereits durch F9 geprüft" abgetan, ohne Fundstelle in der Sollquelle.
Beschreibung: Advisor-Befund 7
(state/advisor-findings-f8-execution-controller.md) erklärt D2 für
erledigt mit Verweis auf ein angeblich bereits durch F9 geprüftes
Muster — ohne konkrete Fundstelle (Code, Test oder F9-Advisor-
Dokument). state/findings.md (laut F-036 die einzige Sollquelle)
enthält dazu keinen eigenen Eintrag.
Fundstelle: state/advisor-findings-f8-execution-controller.md
Befund 7; state/findings.md (kein Eintrag).
Auswirkung: Blockiert WS-1 nicht. Ein künftiger WS-2a-Vertrag würde
aber auf einer unbelegten Behauptung aufbauen.
Maßnahme: Vor dem WS-2a-Vertrag konkrete Fundstelle nachliefern (Code
oder F9-Advisor-Dokument); danach hier aufnehmen oder als erledigt
schließen.
Feature/Run: F8 Advisor-Pass / WS-1-Vertrag, 04.09.2026.

**F-097** · `TECH_DEBT` · P2 · offen
Titel: Laufübergreifende `pruefeStale`-Referenz wird still übersprungen, wenn der Aufrufer den Inhalt nicht liefert.
Beschreibung: `pruefeStale` berechnet nichts selbst. Fehlt der Eintrag in `aktuelleEingabeInhalte`, greift `if (aktuellerInhalt === undefined) continue` — die Referenz wird stillschweigend nicht geprüft statt zu scheitern.
Fundstelle: `src/lineage-registry/index.ts:222`.
Auswirkung: Ein laufübergreifender Lineage-Verweis in F8 WS-2a wäre ohne aktives Laden der fremden Laufakte eine stille Nicht-Prüfung.
Maßnahme: WS-2a-Vertrag bindet als AK: Eskalationslauf lädt die referenzierte Laufakte real und speist sie in `aktuelleEingabeInhalte` ein; Test für den laufübergreifenden Fall (erster im Repo).
Feature/Run: F8, Auflösung F-096, 04.09.2026.

**F-098** · `PROCESS_IMPROVEMENT` · P1 · **gelöst**
Titel: Bauauftrag verwies per Pfad auf nicht committete Dateien.
Beschreibung: plan-v1, plan-v2, advisor-findings-f8 und der WS-1-Vertrag waren untracked; der Vertrag verweist per Pfad auf plan-v2 und das Advisor-Dokument. In einem frischen Klon oder Worktree wären diese Pfade leer. Dritte Ausprägung nach F-013 und F-092.
Fundstelle: Arbeitskopie-Prüfung 04.09.2026, PR #64.
Auswirkung: Ein Bauauftrag wäre in einem Worktree ohne seine Vorgabedokumente gestartet.
Maßnahme: Regel — ein Vertrag ist erst freigabefähig, wenn alle von ihm per Pfad referenzierten Dateien auf origin liegen. Mit PR #64 für F8 erledigt.
Feature/Run: F8 WS-1, 04.09.2026.

**F-099** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: `state/freigabe-commit.md` ist versioniert statt gitignored.
Beschreibung: Die Datei ist in origin/main als Blob getrackt und steht nicht in `.gitignore`. Jeder frische Klon und jedes `git checkout`/`reset --hard` materialisiert damit eine Freigabedatei. Entschärft wird das derzeit allein durch das 10-Minuten-Frischefenster; der Guard blockiert nur Bash-Befehle, die den Pfad-String nennen — ein `git reset --hard` nennt ihn nicht.
Fundstelle: `git ls-tree origin/main state/freigabe-commit.md`; `.claude/hooks/commit-guard.cjs` Aufgabe 3/4.
Auswirkung: Kein akuter Fehlerfall, aber der zweite Schlüssel liegt in der Versionsgeschichte.
Maßnahme: In `.gitignore` aufnehmen und aus der Versionierung entfernen; das Frischefenster bleibt zweite Linie statt einziger Linie.
Feature/Run: F8 WS-1-Vorbereitung, 04.09.2026.

**F-100** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Lesende Git-Befehle über die Remote-Devices-Bridge hinterlassen `.git/index.lock`.
Beschreibung: `git status` und `git fetch` aus der Bridge legen `.git/index.lock` an, können sie mangels Löschrecht nicht aufräumen und blockieren danach jede Git-Operation des Menschen.
Fundstelle: Challenger-Sitzung 04.09.2026; Wiederherstellung per `Remove-Item .git\index.lock`.
Auswirkung: Ein Pull des Menschen scheiterte, ein Branch wurde von der falschen Basis abgezweigt.
Maßnahme: Aus der Bridge nur `git log`, `git ls-tree`, `git ls-remote`, `git rev-parse` und `cat` verwenden.
Feature/Run: F8 WS-1-Vorbereitung, 04.09.2026.

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

**F-105** · `TECH_DEBT` · P2 · offen
Titel: `fuehreAufgabeDurch` wirft bei ungültiger `laufId` unbehandelt statt ein strukturiertes `AusfuehrungsErgebnis` zu liefern.
Beschreibung: QA-Pass (frischer Kontext, vor F8-WS-1-Commit) fand: eine leere, Steuerzeichen- oder Pfadzeichen-`laufId` (`/`, `..`, `\`) löst über `checkpoint-store/index.ts` `pruefeLaufId` eine ungefangene `Error`-Exception aus, die als rejected Promise aus `fuehreAufgabeDurch` nach außen dringt — anders als die zwei dokumentierten Abbruchzweige (`stufe:'kontextpaket'`/`stufe:'gateway'`), die strukturierte `{ok:false}`-Objekte liefern. Weder getestet noch in `features/F8/feature.md` Nicht-Ziele oder im Dateikopf von `src/execution-controller/index.ts`/`types.ts` als „technische Vorbedingung wirft" dokumentiert.
Fundstelle: `src/execution-controller/index.ts` (`fuehreAufgabeDurch`); `src/checkpoint-store/index.ts:75-84` (`pruefeLaufId`).
Auswirkung: kein WS-1-Blocker (laufId kommt bislang aus vertrauenswürdigen Aufrufern), aber ein für einen „von außen aufrufbaren Ablauf" (Zielsatz F8) realistischer Aufruferfehler ohne definiertes Verhalten.
Maßnahme: entweder im Dateikopf als bewusstes „wirft, kein Vertragszweig"-Muster dokumentieren (konsistent mit dem Rest des Projekts: technische Vorbedingung wirft, Geschäftsablehnung liefert Objekt), oder einen Testfall ergänzen, der das reale Wurfverhalten belegt.
Feature/Run: QA-Pass F8 WS-1 (frischer Kontext), 04.09.2026.

**F-106** · `TECH_DEBT` · P3 · offen
Titel: AK2 („Verweigert `starteGateway` den Start") ist am Controller nur über eine von vier genannten Verweigerungsquellen real getestet.
Beschreibung: QA-Pass fand: `features/F8/feature.md` AK2 nennt wörtlich vier Verweigerungsquellen von `starteGateway` — Aufrufparameter, Startziel, Autorisierung, Ist-Zustand. Am Controller (`execution-controller.test.ts`) ist nur die Aufrufparameter-Quelle (E-182) real durchgespielt. Die Rückgabeform (`{ok:false, grund: string}`) ist strukturell über alle vier Quellen identisch und der Controller verzweigt nicht nach Grund, was das Risiko einer stillen Regression senkt — ersetzt aber nicht den Nachweis, dass auch der eigentliche Startfreigabe-Ablehnungspfad (nicht nur der E-182-Vor-Check) unverändert durch den Controller hindurchgereicht wird.
Fundstelle: `features/F8/feature.md` AK2; `src/execution-controller/execution-controller.test.ts` (nur E-182-Fall); `src/claude-code-gateway/index.ts:255-267` (`pruefeStartfreigabe`-Ablehnungspfad, am Controller ungetestet).
Auswirkung: gering — strukturelles Passthrough-Argument deckt das Risiko weitgehend, aber nicht vollständig.
Maßnahme: bei Gelegenheit einen zusätzlichen Testfall ergänzen, der `pruefeStartfreigabe` (statt nur den E-182-Vor-Check) am Controller in ABGELEHNT laufen lässt (z. B. `wirksamkeitsnachweisReferenz` auf falschen Commit zeigen lassen, Muster bereits in `claude-code-gateway.test.ts` vorhanden).
Feature/Run: QA-Pass F8 WS-1 (frischer Kontext), 04.09.2026.

**F-107** · `TECH_DEBT` · P3 · offen
Titel: `starteGateway`-Aufruf in `execution-controller/index.ts` reicht `GatewayOptionen` feldweise statt strukturell durch — ein künftiges F6a-Optionsfeld würde still nicht mitgereicht.
Beschreibung: Code-Review-Pass (frischer Kontext, vor F8-WS-1-Commit) fand: `index.ts` listet die sechs Gateway-Optionsfelder (`schreiber, basisVerzeichnis, rohBasisVerzeichnis, starter, settingsPfad, aktuelleAutorisierungPfad, startfreigabeRepoWurzel`) einzeln auf, statt `optionen` strukturell durchzureichen. Da alle Felder in `GatewayOptionen` optional sind, würde ein künftig in F6a neu hinzugefügtes Optionsfeld hier ohne Typfehler still nicht weitergereicht — unterläuft die im Kopfkommentar von `types.ts` behauptete Garantie „unverändert an F5/F6a/F7/F1B durchgereicht" (D5).
Fundstelle: `src/execution-controller/index.ts:58-76`.
Auswirkung: gering, aber eine stille, vom Typchecker und vom Gate-Skript nicht gefangene künftige Regression gegen die eigene Dokumentation.
Maßnahme: entweder `optionen` direkt durchreichen (TS lässt überzählige Felder bei Variablen-Zuweisung zu) oder einen Kommentar/Test ergänzen, der bei neuen `GatewayOptionen`-Feldern aktiv auffällt.
Feature/Run: Code-Review-Pass F8 WS-1 (frischer Kontext), 04.09.2026.

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

**F-110** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: plan-v1 sagt AK4/AK6-Testfälle zu, ohne zu prüfen, ob eine passende Starter-Attrappe existiert.
Beschreibung: plan-v1 Abschnitt 2.2 benennt die AK4/AK6-Testfälle als selbstverständlich umsetzbar. Real existierten zum Zeitpunkt der Vertragserstellung nur zwei Attrappen (attrappeMitValidemErgebnis → ERFOLGREICH, attrappeOhneErgebnisobjekt → FEHLGESCHLAGEN) — keine erzeugte VERWEIGERT. Ohne die im WS-2a-Vertrag nachgetragene Fixture-Vorgabe hätte die bauende Sitzung entweder eine neue Attrappe in prozessstart.ts bauen müssen (D1-Verletzung) oder wäre steckengeblieben.
Fundstelle: `src/claude-code-gateway/prozessstart.ts:122,134` (Stand vor WS-2a); `state/plan-v1-f8-execution-controller.md` Abschnitt 2.2/7.
Auswirkung: gering, real durch den Vertrag aufgefangen (Fixtures dort definiert, in der Testdatei statt in prozessstart.ts).
Maßnahme: Bei künftigen Plänen, die einen bestimmten Klassifikationsausgang testen wollen, vor der Vertragserstellung prüfen, ob eine passende Attrappe/Fixture bereits existiert.
Feature/Run: F8 WS-2a-Vertrag, 04.09.2026.

**F-111** · `TECH_DEBT` · P3 · **gelöst**
Titel: AusfuehrungsErgebnis gab die intern erzeugte Eskalations-laufId nicht zurück — ohne sie war AK6 nicht prüfbar.
Beschreibung: Die Eskalations-laufId entsteht intern per randomUUID (D3). plan-v1 sah keine Rückgabe vor. Ohne Rückgabe kann kein Test die Eskalation gezielt nachschlagen oder ihre Kette aufräumen.
Fundstelle: `state/plan-v1-f8-execution-controller.md` Abschnitt 2.1 (Entwurf AusfuehrungsErgebnis, vor WS-2a).
Auswirkung: keine — im WS-2a-Vertrag (SCOPE Punkt 3) durch ein optionales eskalation-Feld behoben, additive Erweiterung der diskriminierten Union.
Maßnahme/Auflösung: `src/execution-controller/types.ts` — `eskalation?: { laufId, bedarfVersionSequenz, transportVersionSequenz }`.
Feature/Run: F8 WS-2a-Vertrag/Bau, 04.09.2026.

**F-112** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Übergabedokumente nennen origin/main-SHAs, die aus der Remote-Devices-Bridge nicht verifizierbar sind (F-100-Folgefehler, real eingetreten).
Beschreibung: claude/114 nannte origin/main = df4730d. Das lokale origin/main-Ref stand zu dem Zeitpunkt noch auf 4664b32 (F-100 verbietet git fetch aus der Bridge). Der WS-2a-Vertragscommit landete dadurch zuerst auf dem bereits über PR #65 gemergten Branch feat/f8-execution-controller-ws1, bevor ein manueller git fetch im Nutzerterminal den Widerspruch aufdeckte.
Fundstelle: Challenger-Sitzung 04.09.2026 (Branch-Korrektur vor PR #66).
Auswirkung: kein Datenverlust (Cherry-Pick auf korrekte Basis), aber ein realer Fehlversuch und ein Zwischenschritt, der ohne menschliches Terminal nicht auflösbar gewesen wäre.
Maßnahme: Übergabedokumente nennen den Basis-SHA zusammen mit der PR-Nummer, aus der er stammt. Vor dem ersten Commit einer Sitzung mit Bridge-Zugriff führt der Mensch git fetch im eigenen Terminal aus.
Feature/Run: F8 WS-2a-Vertrag, 04.09.2026.

**F-113** · `PROCESS_IMPROVEMENT` · P2 · **gelöst**
Titel: Terminal-Befehle wurden wiederholt in Bash-Syntax ausgegeben, obwohl der Mensch in PowerShell arbeitet — führte real mehrfach zu Parserfehlern.
Beschreibung: Mehrere 🖥️ TERMINAL-Blöcke dieser Sitzung enthielten Bash-Heredoc-Syntax (`$(cat <<'EOF' ... EOF)`), die in PowerShell nicht geparst wird (`<` ist dort ein reservierter Operator). Der Fehler trat real mindestens zweimal auf, nachdem er beim ersten Mal bereits korrigiert worden war (PR-Body-Erstellung, danach erneut bei der WS-2a-Commit-Message) — die Korrektur wurde nicht als Regel für den Rest der Sitzung übernommen.
Fundstelle: Diese Sitzung, TERMINAL-Blöcke zu `gh pr create --body "$(cat <<'EOF' ...` und `git commit -m "$(cat <<'EOF' ...`.
Auswirkung: wiederholte Rückfragezyklen, vom Menschen bemerkt und bemängelt („Das passiert zu oft").
Maßnahme/Auflösung: Terminal-Befehle für diesen Menschen seither durchgehend PowerShell-kompatibel ausgegeben — mehrere `-m`-Flags statt Heredoc für mehrzeilige Commit-Messages, `Set-Content`/`--body-file` statt `$(cat <<EOF...)` für mehrzeilige PR-Bodies. Seit der Meldung (04.09.2026) in keinem der folgenden TERMINAL-Blöcke dieser Sitzung erneut aufgetreten — durch konsistente Praxis gelöst, kein Artefakt-Fix nötig.
Feature/Run: Technical-Challenger-Sitzung F8 WS-2a, 04.09.2026.

**F-114** · `PROCESS_IMPROVEMENT` · P1 · offen
Titel: Zwei Claude-Sitzungen haben real gleichzeitig in dasselbe Arbeitsverzeichnis geschrieben — Verstoß gegen „Ein Schreiber pro Arbeitsverzeichnis".
Beschreibung: Die Cloud-Sitzung (Technical Challenger, Zugriff über die Remote-Devices-Bridge) und eine zweite, lokale Bash-Sitzung (aus dem 🤖-PROMPT-Handoff für den WS-2a-Bau gestartet) haben unkoordiniert im selben Repo-Arbeitsverzeichnis committet. Die zweite Sitzung fand einen ihr unbekannten Commit (`3b68271`, Findings F-108–F-113) auf ihrem Branch und musste beim Menschen nachfragen, ob er echt ist.
Fundstelle: Branch `feat/f8-execution-controller-ws2a`, Commits `ac79ad3` und `3b68271`, gemergt als PR #67 (`853792f`), 04.09.2026.
Auswirkung: diesmal keine — orthogonale Dateien, kein Konflikt. Strukturell aber ein reales Kollisionsrisiko (Git-Index-Lock-Race, überschriebene Datei, stiller Verlust), nicht nur ein theoretisches.
Maßnahme: Vor jedem weiteren Schreibzugriff einer Cloud-Sitzung auf ein Arbeitsverzeichnis nach einem 🤖-PROMPT-Handoff klären, ob die ausführende Sitzung noch aktiv ist.
Feature/Run: F8 WS-2a, 04.09.2026.

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

**F-117** · `TECH_DEBT` · P3 · offen
Titel: `state/freigabe-commit.md`-Gate (`commit-guard.cjs`) sichert nur den Pfad über die lokale Claude-Code-CLI-Session ab, nicht Commits, die der Mensch direkt im Terminal ausführt.
Beschreibung: Der Hook blockt `git commit`/`git push` sowie jeden Bash-/Edit/Write-Zugriff auf die Freigabedatei ausschließlich innerhalb der lokalen Claude-Code-CLI-Session (PreToolUse-Hook auf deren eigenes Bash-Werkzeug). Führt der Mensch denselben Befehl direkt in seinem eigenen Terminal aus (wie in dieser Sitzung durchgehend praktiziert, 🖥️ TERMINAL-Konvention), greift dieses zweite Sicherheitsnetz nicht.
Fundstelle: `.claude/hooks/commit-guard.cjs` Dateikopf, Aufgabe 3/4; Technical-Challenger-Sitzung, WS-2b-Verifikation, 04.09.2026.
Auswirkung: keine akute — der Terminal-Pfad wird aktuell ausschließlich nach expliziter Freigabe im Chat genutzt (funktionierendes Ersatzverfahren). Die Datei täuscht aber ein einheitliches Schutzniveau vor, das für den Terminal-Pfad tatsächlich nicht besteht.
Maßnahme: bei Gelegenheit im Hook-Dateikopf oder in SETUP.md dokumentieren, dass das Freigabefenster nur den CLI-Session-Bau-Pfad absichert, nicht direkte Terminal-Commits.
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

**F-120** · `BUG` · P2 · offen
Titel: Leitstand-Server bindet an alle Netzwerkschnittstellen statt Loopback.
Beschreibung: `server.listen(PORT, cb)` ohne Host-Argument → Node bindet 0.0.0.0/::.
Fundstelle: `scripts/leitstand-server.mjs:196`.
Auswirkung: Rein lesend geringfügig (Zustandspreisgabe im LAN). Mit Schreibpfad: fremdauslösbarer Prozessstart auf dem Entwicklerrechner.
Maßnahme: `server.listen(PORT, '127.0.0.1', …)`, als AK4 im Gate nachgewiesen.
Feature/Run: Gegenchallenge F10, 04.09.2026.

**F-121** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Übergabedokumente behaupten „existiert bereits" ohne Nachweis am Artefakt.
Beschreibung: `claude/117` stützte eine Empfehlung auf ein UI-Polling, das es nicht gibt, und nannte sieben Eingabefelder, wo die Signatur vier Parameter hat.
Fundstelle: `public/leitstand/app.js:66-71`; `src/execution-controller/index.ts:82-87`.
Auswirkung: Eine Empfehlung wirkt aufwandsneutral, obwohl sie neuen Scope enthält — dieselbe Klasse wie F-112.
Maßnahme: Aussagen der Form „X existiert bereits" im Handoff mit Datei + Zeile belegen, analog zur bestehenden SHA-Regel.
Feature/Run: Gegenchallenge F10, 04.09.2026.

**F-122** · `PROCESS_IMPROVEMENT` · P1 · offen
Titel: F-100 zum dritten Mal verletzt — `git status` aus der Bridge.
Beschreibung: Die Gegenchallenge-Sitzung eröffnete mit `git status --short`, bevor F-100 gelesen war. Folgenlos (keine `.git/index.lock` zurückgeblieben, geprüft), aber die dritte Wiederholung. F-118 hat für genau diesen Fall festgelegt: kein viertes Selbstversprechen.
Fundstelle: Gegenchallenge-Sitzung 04.09.2026; `state/findings.md` F-100, F-118.
Auswirkung: Wiederkehrender Prozessfehler mit real eingetretenem Folgeschaden (F-112).
Maßnahme: Technischer Guard — Git-Zugriff aus Bridge-Sitzungen nur über ein Wrapper-Skript, das die erlaubte Befehlsliste (`log`, `ls-tree`, `ls-remote`, `rev-parse`, `cat`) durchsetzt.
Feature/Run: Gegenchallenge F10, 04.09.2026.

**F-123** · `PROCESS_IMPROVEMENT` · P1 · offen
Titel: F-100 zum vierten Mal verletzt — `git fetch` aus der Bridge, diesmal mit realem Schaden.
Beschreibung: Die Challenger-Sitzung (Gegenchallenge F10) führte nach Merge von PR #74 `git fetch origin` aus der Bridge aus, um den main-Stand zu verifizieren. Ergebnis: `.git/index.lock` wurde angelegt und war aus der Bridge nicht löschbar (`Operation not permitted`), zusätzlich eine Warnung `unable to unlink '.git/objects/.../tmp_obj_...'`. Blockierte danach jede Git-Operation im Nutzerterminal, bis Stefan den Lock manuell entfernt hat (`Remove-Item .git\index.lock`).
Fundstelle: `state/findings.md` F-100, F-118, F-122 (dieselbe Ursache, jetzt vierte Wiederholung); Gegenchallenge-Sitzung 04.09.2026, nach Merge PR #74.
Auswirkung: Erster real eingetretener Arbeitsausfall aus dieser Fehlerklasse (F-100/F-118/F-122 waren bisher folgenlos oder nur PR-Verwechslungen). Bestätigt, dass eine wiederholte Selbstverpflichtung („kein git fetch aus der Bridge") die Praxis real nicht verhindert.
Maßnahme: F-118/F-122s Empfehlung eines technischen Guards ist jetzt nicht mehr optional. Vorschlag: ein Wrapper-Skript/Alias, das aus erkennbaren Bridge-Sitzungen (z. B. über eine Umgebungsvariable oder den Arbeitsverzeichnis-Pfad `/sessions/.../mnt/...`) nur log/ls-tree/ls-remote/rev-parse/cat zulässt und alles andere (fetch/pull/status/commit/push) hart verweigert, statt sich auf Rollenverhalten zu verlassen.
Feature/Run: Gegenchallenge F10, 04.09.2026.

**F-124** · `BUG` · P0 · gelöst
Titel: F6a besitzt keinen Mechanismus, das von F5 gebaute Kontextpaket als Prompt an den Claude-Code-Kindprozess zu übergeben — jede reale Ausführung schlägt strukturell fehl.
Beschreibung: `baueAufruf` (`src/claude-code-gateway/index.ts:183-199`) konstruiert Tokens ohne `--print`/Prompt-Argument; `AufrufEingaben` (`src/claude-code-gateway/types.ts:29-32`) hat kein Prompt-Feld; kein Stdin-Pipe in `prozessstart.ts`. `fuehreAufgabeDurch` ruft `baueAufruf(eingaben.aufrufEingaben)` auf, nie mit dem Ergebnis von `baueKontextpaket`. Real bestätigt durch den ersten echten Lauf (`e2e-referenzfeature-2026-09-06`, `state/e2e-nachweis-meilenstein-1.md`): CLI bricht mit `exitCode 1`, „Input must be provided either through stdin or as a prompt argument when using --print" ab, bevor irgendein Werkzeug genutzt wird.
Fundstelle: `src/claude-code-gateway/index.ts:183-199`; `src/claude-code-gateway/types.ts:29-32`; `src/execution-controller/index.ts` (Aufrufstelle `baueAufruf`); `state/e2e-nachweis-meilenstein-1.md`.
Auswirkung: Keine Sicherheitslücke (Prozess bricht vor jeder Werkzeugnutzung ab), aber eine vollständige funktionale Blockade — das System kann aktuell keine einzige reale Aufgabe erfolgreich ausführen. Betrifft jede künftige reale Nutzung, bis behoben. Meilenstein 1 bleibt laut Stefans Entscheidung (06.09.2026) deshalb offen, bis dies behoben und ein realer ERFOLGREICH-Lauf erbracht ist.
Maßnahme: F6a braucht ein Prompt-Feld in `AufrufEingaben` (oder eine äquivalente Kontextpaket-Übergabe, z. B. via Stdin) und eine Verdrahtung in `fuehreAufgabeDurch`, die `kontextpaketErgebnis` real als Prompt weiterreicht. Eigener kleiner Workstream, kein neues Feature. Fix in PR #80 (Branch `fix/f124-prompt-uebergabe`, gemergt auf `main`, 06.09.2026). Real ERFOLGREICH-Nachlauf erbracht: `laufId` `e2e-referenzfeature-2026-09-06-f124-nachlauf`, `GET /api/laeufe` → `ABGESCHLOSSEN`/`ERFOLGREICH`, echter Kindprozess mit `exitCode 0`, `permission_denials: []` (siehe `state/e2e-nachweis-meilenstein-1.md`, Abschnitt „Nachlauf nach F-124-Fix"). Damit geschlossen.
Feature/Run: E2E-Nachweis Meilenstein 1, 06.09.2026 (Fix + Nachlauf).

**F-125** · `HARNESS_IMPROVEMENT` · P3 · offen
Titel: device_bash-VM (Remote-Devices-Bridge) hat plattformfremde native Binaries im gemounteten node_modules.
Beschreibung: `npm run check` schlägt in der Bridge-VM mit MODULE_NOT_FOUND @biomejs/cli-linux-x64 bzw. "Unable to resolve @typescript/typescript-linux-x64" fehl — node_modules wurde unter Windows installiert, die Linux-VM kann die nativen Anteile nicht nutzen.
Fundstelle: Bridge-Sitzung 06.09.2026, F-124-Fix-Verifikation.
Auswirkung: Verifikation über die Bridge kann Lint/Typecheck nicht selbst laufen lassen, nur node --test und die reinen .mjs-Gate-Skripte. Deckt Logikfehler ab, keine Typ-/Lint-Fehler.
Maßnahme: Kein Produktcode-Fix nötig; bekannte Grenze der Bridge-Verifikation, bei Freigaben auf Stefans echten `npm run check`-Lauf verlassen.
Feature/Run: F-124-Fix-Verifikation, 06.09.2026.

**F-126** · `PROCESS_IMPROVEMENT` · P1 · offen
Titel: Fünfte Verletzung von "aus der Bridge nur lesende Git-Befehle" (F-100/F-118/F-122/F-123), folgenlos.
Beschreibung: Eine Bridge-Sitzung hat git fetch, git checkout, git pull --ff-only, git branch und git reset --hard ausgeführt. Kein Schaden (kein .git/index.lock, git status danach sauber), aber die fünfte dokumentierte Wiederholung derselben Fehlerklasse.
Fundstelle: state/findings.md F-100, F-118, F-122, F-123; Sitzung 06.09.2026.
Auswirkung: Wiederkehrender Prozessfehler; zweimal folgenlos, zweimal mit realem Schaden (F-112, F-123). Reine Selbstverpflichtung verhindert das Muster nachweislich nicht.
Maßnahme: Den in F-118/F-122/F-123 vorgeschlagenen technischen Guard (Wrapper/Alias, der aus der Bridge nur log/ls-tree/ls-remote/rev-parse/cat zulässt) vor Beginn von Meilenstein 2 umsetzen.
Feature/Run: F-124-Verifikation/M1-Abschluss, 06.09.2026.

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

**F-129** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: "Meilenstein 2" existierte in der Sollquelle nicht.
Beschreibung: docs/projekt/zielfassung.md §13 kannte nur Fassung 1 mit Meilenstein 1; umsetzungsplan-fassung-1.md Abschnitt 1 nannte M1 "einziger für Fassung 1" und ordnete die M2-Inhalte Deliverable 5 zu.
Fundstelle: docs/projekt/zielfassung.md §13, docs/projekt/umsetzungsplan-fassung-1.md Abschnitt 1/2.
Auswirkung: Ohne Nachtrag Drift zwischen Chat-Planung und Repo — die Fehlerklasse, die P5/E-073 verhindern sollen.
Maßnahme: dieser Doku-PR.
Feature/Run: M2-Challenge, 06.09.2026.

**F-130** · `PROCESS_IMPROVEMENT` · P2 · **gelöst**
Titel: Feature-Akte F11 verwies auf Claude-Projekt-Dokumente, die nicht im Repo liegen.
Beschreibung: Die aus dem Challenger-Chat übernommene Vorlage nannte unter "Zuordnung" `claude/120` und `claude/121`. `claude/` enthält im Repo nur `65_...` und `66_...` — beide Verweise waren für jede Claude-Code-Sitzung nicht auflösbar. Dieselbe Grundursache wie F-013, F-082, F-092 und F-100.
Fundstelle: `features/F11/feature.md`, Abschnitt "Zuordnung", vor der Korrektur.
Auswirkung: gering, weil vor dem Commit gefunden. `scripts/check-docs.mjs` Prüfung 1 hätte es nicht gemeldet — sie matcht nur Pfade mit Dateiendung (F-007, weiterhin offen).
Maßnahme: Verweis auf die real im Repo liegenden Stellen umgestellt (`zielfassung.md` §13.3, `umsetzungsplan-fassung-1.md` Abschnitt 1b). Regel für künftige Akten: eine Repo-Datei verweist nie auf `claude/*`, solange das Dokument nicht real im Repo liegt.
Feature/Run: F11-Aktenanlage, 06.09.2026.

**F-131** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Bauauftrag enthielt einen Einfüge-Platzhalter statt des Volltexts.
Beschreibung: Der Auftrag zur Aktenanlage enthielt an der Stelle des Akten-Volltexts den Platzhalter `<<<HIER DEN VOLLTEXT AUS ABSCHNITT 1 VON claude/122 EINFÜGEN>>>`. Die bauende Sitzung musste zurückfragen, der Volltext wurde manuell nachgereicht.
Fundstelle: Challenger-Chat, Auftrag 1 zur M2-Sollquelle, 06.09.2026.
Auswirkung: ein vermeidbarer Rückfragezyklus; identische Familie wie F-013, F-082, F-092, F-100 — die Volltext-Regel wurde formal eingehalten (Volltext lag im Projektdokument), aber nicht im Prompt selbst.
Maßnahme: Prompts an Claude Code nie mit Einfüge-Platzhaltern ausgeben. Der für den Auftrag relevante Volltext steht direkt im Prompt-Block, auch wenn er lang ist.
Feature/Run: F11-Aktenanlage, 06.09.2026.

**F-132** · `TECH_DEBT` · P3 · offen
Titel: auftrag_id folgt nicht derselben Zeichenregel wie laufId.
Beschreibung: src/auftrag/index.ts prüft auftrag_id nicht gegen dieselbe Zeichenklasse wie checkpoint-store's laufId-Regel (LAUFID_UNZULAESSIGE_ZEICHEN-Äquivalent) — ein auftrag_id-Wert mit Leerzeichen/Sonderzeichen würde erst beim Dateisystemzugriff auffallen, nicht vorab.
Fundstelle: src/auftrag/index.ts (validiereAuftragDaten); src/checkpoint-store/index.ts (pruefeLaufId).
Auswirkung: gering — bislang kein realer Fehlschlag, da auftrag_id serverseitig bisher immer aus derselben Quelle wie laufId erzeugt wurde.
Maßnahme: bei nächster Berührung von src/auftrag/index.ts dieselbe Zeichenregel per D5 wiederverwenden statt eigenständig zu lassen.
Feature/Run: F11 WS-1 Advisor-Pass, 06.09.2026.

**F-133** · `HARNESS_IMPROVEMENT` · P3 · offen
Titel: node --test schlägt in der Remote-Devices-Bridge-VM systematisch mit EPERM bei der Testfixture-Bereinigung fehl.
Beschreibung: node --test in der Bridge-VM meldet EPERM: operation not permitted, unlink ... beim rimrafSync-Cleanup unter dem Windows-gemounteten Arbeitsverzeichnis (85/137 bzw. 14/? Fehlschläge je nach Lauf) — 0 AssertionError darunter, ausschließlich Cleanup-Rauschen, bestätigt durch gezielten Re-Lauf der betroffenen Testdateien.
Fundstelle: Bridge-Sitzung, F11-WS-1-Verifikation, 06.09.2026.
Auswirkung: Verifikation über die Bridge kann node --test nicht als alleinigen Nachweis nutzen; reine .mjs-Gate-Skripte plus Stefans eigener Windows-Lauf bleiben maßgeblich (wie F-125).
Maßnahme: kein Produktcode-Fix; dokumentierte Grenze der Bridge-Verifikation.
Feature/Run: F11 WS-1 Verifikation, 06.09.2026.

**F-134** · `TECH_DEBT` · P2 · offen
Titel: Lauf→Auftrag-Lineage-Verweis zum zweiten Mal zurückgestellt.
Beschreibung: Der WS-1-Plan stellte den Lineage-Verweis "welcher Auftrag hat diesen Lauf ausgelöst" auf WS-2 zurück (nicht ohne Eingriff in F6as starteGateway/GatewayEingaben erreichbar). WS-2 baut ihn ebenfalls nicht — kein AK in F11 verlangt ihn.
Fundstelle: state/plan-v1-f11-auftrag-ws1.md Abschnitt 2 (Frage 2); features/F11/journal.md (WS-2-Eintrag).
Auswirkung: kein Blocker für F11. Wird real gebraucht ab F12 (Laufliste/Detailansicht — "welcher Auftrag hat diesen Lauf ausgelöst").
Maßnahme: Design-Entscheidung spätestens bei F12-Planung treffen, nicht weiter stillschweigend verschieben.
Feature/Run: F11 WS-1/WS-2, 06.09.2026.
Nachtrag (06.09.2026): entschieden durch E-M2-4 (Lineage-Eingabe-Referenz `artefakt:auftrag-<auftragId>`, nach dem F8-WS-2b-Muster `vorgaengerLaufId`), F12 AK5 zugeordnet.

**F-135** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Neuer Testfall lief kurzzeitig real gegen kontrollzustand/ statt gegen eine Attrappe.
Beschreibung: Ein neuer AK7(D13)-Testfall in check-f10-leitstand.mjs überließ starteTestserver ohne fuehreAufgabeDurchFn-Attrappe (anders als jeder andere Testfall in der Datei) und lief dadurch real bis F4s Invocation Policy durch, die den Start korrekt mit E-188 verweigerte — aber vorher entstanden zwei echte Lineage-/Wirkungsmarke-Einträge unter dem echten kontrollzustand/. Vor Commit gefunden und entfernt (rm -rf kontrollzustand/check-f11-ak7-verwaist-neu-* und zugehörige lineage-kontextpaket-*), Testfall korrigiert.
Fundstelle: scripts/check-f10-leitstand.mjs (F11 AK7(D13)-Verwaist-Testfall).
Auswirkung: keine — vor Commit gefunden, kein Schaden an echtem kontrollzustand/, kein Kindprozess gestartet. Gleiche Fehlerklasse wie F-114 (zwei Schreiber im selben Zustand), hier selbst abgefangen statt real beobachtet.
Maßnahme: keine akute; als Erinnerung, dass jeder starteTestserver-Aufruf immer eine fuehreAufgabeDurchFn-Attrappe braucht (Konvention bereits in der Datei etabliert, hier einmalig verfehlt).
Feature/Run: F11 WS-2, 06.09.2026.

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

**F-139** · `TECH_DEBT` · P2 · offen
Titel: Rohereignisstrom ist über keine API erreichbar.
Beschreibung: `kontrollzustand-roh/<laufId>/rohstrom.json` ist gitignoriert und liegt außerhalb des Server-Lesebereichs; die Laufakte trägt jedoch bereits `rohstrom_referenz: { pfad, inhalts_hash }`.
Fundstelle: `src/claude-code-gateway/index.ts:298-309`; `kontrollzustand/lineage-laufakte-*/checkpoints/`.
Auswirkung: „was kam heraus" (exitCode, permission_denials) ist im Leitstand nicht sichtbar — Kernbestandteil des M2-Zielsatzes.
Maßnahme: F12 WS-3 (AK7/AK8) — Auflösung über die Laufakte mit Hash-Prüfung, Pfadsicherheit über F11s `loeseEvidenzPfadAuf`.
Feature/Run: F12-Challenge, 06.09.2026.

**F-140** · `TECH_DEBT` · P2 · offen
Titel: Vollprojektion des Kontrollzustands im 2-Sekunden-Poll.
Beschreibung: `/api/laeufe` validiert bei jedem Poll die komplette Hash-Kette jedes Verzeichnisses und liest für die Staleness-Prüfung referenzierte Dateien live von der Platte; der Aufwand wächst linear mit der Historie. Messung in der Bridge-VM über einen gemounteten Windows-Ordner: 3860/3528/3657 ms je Runde bei 28 Verzeichnissen und 35 Checkpoints, ohne Staleness und statSync. Der absolute Wert ist wegen der Mount-Latenz nicht belastbar, das Skalierungsverhalten schon.
Fundstelle: `scripts/leitstand-server.mjs` (`sammleLaeufe`, `sammleCheckpoints`, `leseAktuelleEingaben`); `public/leitstand/app.js` (`POLL_INTERVALL_MS = 2000`).
Auswirkung: die Anzeige kann hinter dem Poll zurückbleiben; verschärft sich mit realer Nutzung.
Maßnahme: Listen- und Detailprojektion trennen (F12 AK2); nativen Wert bei Gelegenheit auf der Windows-Maschine messen, bevor weiter optimiert wird.
Feature/Run: F12-Challenge, 06.09.2026.

**F-141** · `BUG` · P3 · **entschieden**
Titel: Checkpoint-Zeitstempel stammen aus der Datei-mtime.
Beschreibung: `sammleCheckpoints` setzt `zeitstempel: statSync(pfad).mtime.toISOString()` statt der Zeit aus dem Artefakt; nach einem frischen Clone oder Checkout zeigt der Leitstand Checkout-Zeiten als Ereigniszeiten.
Fundstelle: `scripts/leitstand-server.mjs` (`sammleCheckpoints`).
Auswirkung: Fehldarstellung des realen Zustands (§13.3-Messgröße) — klein, aber genau in der Zielmetrik.
Maßnahme: F12 AK3.
Feature/Run: F12-Challenge, 06.09.2026.
Maßnahme-Nachtrag: E-M2-5 (07.09.2026): optionales `erstellt_am` in Checkpoint-/Wirkungsmarke-Payload, additiv, bestehende Einträge bleiben gültig. Umsetzung in F12 WS-1 (`state/plan-v1-f12-ws1.md`).

**F-143** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Finding-ID in einem Claude-Code-Prompt referenziert, die nie im Repo committet wurde.
Beschreibung: Der Challenger-Chat hat in einem Auftrag „F-142 von offen auf entschieden setzen" verlangt, obwohl F-142 nur im Chat genannt und nie über einen eigenen Doku-Auftrag nach state/findings.md geschrieben wurde. Die bauende Sitzung hat es sinnvoll auf F-141 gemappt.
Fundstelle: Auftrag „docs(f12): E-M2-5, TECH_PLAN v1 WS-1" (PR #88).
Auswirkung: keine — korrekt aufgefangen, aber ein potenzieller Rückfrage-Zyklus (F-013-Klasse), der diesmal ausblieb.
Maßnahme: vor jedem Prompt, der eine Finding-ID referenziert, gegen den realen state/findings.md-Stand verifizieren, dass sie dort existiert.
Feature/Run: F12 WS-1 Vorbereitung, 07.09.2026.

**F-144** · `TECH_DEBT` · P3 · offen
Titel: Startvorlage-Feld 'modell' ungenutzt, Startformular hat eigenen hartkodierten Wert.
Beschreibung: `startvorlagen/*.json` deklariert ein `modell`-Feld, `validiereStartvorlageDaten` prüft es, aber `erzeugeRequestHandler` liest es nie. Das F12-WS2-Startformular (AK6) setzt stattdessen clientseitig `aufrufEingaben.modell = 'sonnet'` hartkodiert (`public/leitstand/app.js`). Zwei Quellen der Wahrheit, aktuell nur per Code-Kommentar dokumentiert.
Fundstelle: `public/leitstand/app.js` (Startformular-Submit-Handler), `startvorlagen/beispielprojekt.json` (`modell`-Feld), F12 WS-2.
Auswirkung: Ändert sich künftig das `modell`-Feld einer Startvorlage, hat das auf den geführten Start keine Wirkung — stille Divergenz.
Maßnahme: bei nächster Berührung vereinheitlichen (Formular liest `vorlage.modell` über `GET /api/startvorlage/werkzeugsaetze`, oder Feld bewusst als entkoppelt dokumentieren/entfernen).
Feature/Run: F12 WS-2, 07.09.2026.

**F-145** · `BUG` · P1 · **gelöst**
Titel: Fire-and-Forget-Aufruf in POST /api/laeufe reicht optionen/basisVerzeichnis nicht an fuehreAufgabeDurchFn durch.
Beschreibung: `scripts/leitstand-server.mjs:769` ruft `fuehreAufgabeDurchFn(laufId, profilReferenz, eingaben)` ohne drittes `optionen`-Argument auf. Alle synchronen Prüfungen davor (D13, `laufIdBelegt`, `auftragId`-Existenz) respektieren ein serverseitiges `basisVerzeichnis`-Override, der eigentliche Lauf (`fuehreAufgabeDurch`) fällt intern auf den Default `'kontrollzustand'` zurück.
Fundstelle: `scripts/leitstand-server.mjs:769`, entdeckt bei echtem HTTP-Smoke-Test gegen Scratch-Verzeichnis, F12 WS-2, 07.09.2026. Bestätigt vorbestehend seit `10a60ef` (F12 WS-1) — nicht durch WS-2 eingeführt.
Auswirkung: stille Divergenz zwischen geprüftem und tatsächlich beschriebenem Verzeichnis bei Nicht-Default-`basisVerzeichnis`. In Produktion unsichtbar (Default=Default). Potenzieller Blocker für F12 WS-4 (realer Nachweis), falls dort ein Nicht-Default-Pfad gebraucht wird.
Maßnahme: `optionen`-Objekt strukturell (nicht Einzelfelder) an `fuehreAufgabeDurchFn` durchreichen.
Maßnahme-Nachtrag: behoben — der Fire-and-forget-Aufruf reicht seither `optionen` (dasselbe Objekt, mit dem `erzeugeRequestHandler` selbst aufgerufen wurde) strukturell als viertes Argument durch (`scripts/leitstand-server.mjs`, POST-/api/laeufe-Handler). Testbeleg: neuer Fall (p) in `scripts/check-f10-leitstand.mjs` — eine `fuehreAufgabeDurchFn`-Attrappe zeichnet das empfangene `optionen`-Objekt auf und prüft `optionen.basisVerzeichnis` gegen den beim Testserver konfigurierten Nicht-Default-Wert. Real kalibriert: Rotfall (Durchreichung testweise entfernt) → Exit 1 mit `optionen=undefined`; Grünfall (Fix aktiv) → Exit 0.
Feature/Run: F12 WS-2, 07.09.2026; behoben F12-Nachtrag, 07.09.2026.

**F-146** · `TECH_DEBT` · P2 · offen
Titel: `klassifiziereLauf` persistiert nur `wirkungsmarke.ergebnis` — `bypass_verdacht_anzahl`/`is_error`/`non_execution_kind`/der `FEHLGESCHLAGEN`-Grund gehen verloren.
Beschreibung: `src/result-evaluator/index.ts` (`ermittleErgebnis`) berechnet `bypass_verdacht_anzahl`, `is_error`, `non_execution_kind` und den `FEHLGESCHLAGEN`-Grund (`rohstrom_fehlt`/`rohstrom_integritaet`/`beobachtungsbasis_unvollstaendig`/`kein_ergebnisobjekt`) als `ErgebnisOhneWirkungsmarke`, aber `klassifiziereLauf` schreibt nur `{ ergebnis: teilergebnis.ergebnis }` in die terminale Wirkungsmarke (`schreibeWirkungsmarke(laufId, profilReferenz, 'terminal', { ergebnis: teilergebnis.ergebnis }, optionen)`) — der Rest des Teilergebnisses bleibt flüchtig, nur der reine Rückgabewert der Funktion trägt es, nicht die persistierte Kette.
Fundstelle: `src/result-evaluator/index.ts:125-134` (`klassifiziereLauf`), `76-123` (`ermittleErgebnis`).
Auswirkung: Aus der Laufkette ist nach Prozessende nur `wirkungsmarke.ergebnis` der `'terminal'`-Marke lesbar. F12 AK7 (Lauf-Detailansicht) kann die F7-Klassifikation im Leitstand deshalb nur auf dieses eine Feld reduziert zeigen — der Leitstand darf `klassifiziereLauf` nicht selbst aufrufen (F10-Invariante: kein Serverschreibzugriff auf `kontrollzustand/`) und die Klassifikationsregeln nicht nachbauen (D5), eine Behebung bräuchte zusätzliches Persistieren in Wirkungsmarke oder Laufakte.
Maßnahme: nicht in F12 WS-3 behoben (bewusstes Nicht-Ziel, kein zusätzliches Persistieren von Klassifikationsdetails in diesem Workstream). Bei Bedarf eigener kleiner Vertrag: Wirkungsmarke- oder Laufakte-Schema additiv um die übrigen Felder erweitern.
Feature/Run: F12-Challenge/WS-3-Planvorbereitung, 07.09.2026.

**F-147** · `BUG` · P2 · **gelöst**
Titel: `sammleLaufKopfdaten` liefert `auftragsbezug` bis heute konstant `null`, obwohl AK2 es als Kopfdatum verlangt.
Beschreibung: `scripts/leitstand-server.mjs` (`sammleLaufKopfdaten`) setzt `auftragsbezug: null` mit dem Kommentar „WS-2/AK5 füllt dieses Feld; WS-1 liefert es bewusst leer, kein Rückschritt" — WS-2 (PR #91, `main` `63e4059`) hat AK5 (Auftrag→Lauf-Zuordnung als Lineage-Eingabe-Referenz) real gebaut, diese Stelle aber nicht angefasst. `GET /api/laeufe` liefert das Feld dadurch für jeden Lauf konstant `null`, auch für Läufe mit echtem, über `artefakt:auftrag-<auftragId>` referenziertem Auftragsbezug.
Fundstelle: `scripts/leitstand-server.mjs` (`sammleLaufKopfdaten`, Zeile `auftragsbezug: null, // WS-2/AK5 füllt dieses Feld`).
Auswirkung: `features/F12/feature.md` AK2 nennt Auftragsbezug ausdrücklich als Kopfdatum der Laufliste („`laufId`, `laufStatus`, Ergebnis, Zeitpunkt, Auftragsbezug, …") — heute nicht erfüllt, obwohl AK5 die Datengrundlage dafür bereits liefert.
Maßnahme: F12 WS-3 (`state/plan-v1-f12-ws3.md`, Abschnitt 2.3) — `auftragsbezug` aus dem Kontextpaket-Element `artefakt:auftrag-<auftragId>` ableiten (dieselbe Ableitung wie AK7s Detailansicht, wiederverwendet). Bestandsläufe ohne dieses Element behalten `null`.
Maßnahme-Nachtrag: umgesetzt in `baueAuftragsbezug` (`scripts/leitstand-server.mjs`), wiederverwendet von `sammleLaufKopfdaten` (Kopfdaten, `{auftragId, titel}`) und dem Detailendpunkt (volles Feld inkl. `auftragstext`) — Request-lokales Memo je `auftragId` (F12 WS-3, PR ausstehend).
Feature/Run: F12-Challenge/WS-3-Planvorbereitung, 07.09.2026; behoben F12 WS-3, 07.09.2026.

**F-148** · `TECH_DEBT` · P3 · offen
Titel: `GET /api/laeufe/<laufId>` prüft `istLaufkette` nicht — eine reine Artefaktkette liefert 200 statt 404.
Beschreibung: Der Detailendpunkt (`scripts/leitstand-server.mjs`) prüft nur `LAUFID_UNZULAESSIGE_ZEICHEN` und `existsSync(join(basisVerzeichnis, laufId))` — anders als `sammleLaeufe`/`sammleLaufKopfdaten`, die zusätzlich `istLaufkette` (mindestens eine Wirkungsmarke) verlangen (AK1). Eine reine Artefaktkette (z. B. `lineage-auftrag-<id>`, Verzeichnisname trägt den `lineage-`-Präfix) liefert dadurch `200` mit `checkpoints`/`laufStatus` statt `404`.
Fundstelle: `scripts/leitstand-server.mjs`, `GET /api/laeufe/<laufId>`-Handler.
Auswirkung: kein WS-1-Bug im Sinne der AK1-Abnahme (AK1 gilt für die Liste, nicht den Detailendpunkt; `feature.md` AK2 nennt für den Detailendpunkt nur „404 bei unbekannter laufId") und über die UI nicht erreichbar (das Detail-Panel öffnet nur aus bereits gefilterten Listeneinträgen). Über die rohe API weiterhin erreichbar.
Maßnahme: bewusst NICHT in F12 WS-3 behoben (Offene Frage 8 des WS-3-Plans, mit dem Plan entschieden) — nicht im Wortlaut von AK7/AK8/AK10, über die UI nicht erreichbar, eine saubere Behebung bräuchte einen zweiten `ladeGueltigeCheckpoints`-Aufruf oder eine zweite `istLaufkette`-Ableitung auf der bereits gesendeten Projektion (D5-Verstoß). Bei Bedarf eigener kleiner Vertrag.
Feature/Run: F12 WS-3-Planvorbereitung/Bauauftrag, 07.09.2026.

**F-149** · `HARNESS_IMPROVEMENT` · P3 · **gelöst**
Titel: `LAUFID_UNZULAESSIGE_ZEICHEN` enthielt das Intervall U+0000–U+001F als rohe Bytes statt als Escape — `grep` behandelte die Datei dadurch als Binärdatei.
Beschreibung: `scripts/leitstand-server.mjs` (Offset ~19626) schrieb die Steuerzeichen-Zeichenklasse als literale Kontrollbytes (`[<NUL>-<US>]`) statt als `[U+0000-U+001F]`. Node interpretiert beides identisch (RegExp-Zeichenklasse), aber die rohen Bytes lassen `grep` (und andere Zeilen-orientierte Text-Tools) die gesamte Datei als Binärdatei einstufen — `grep -n "pathname" scripts/leitstand-server.mjs` lieferte „binary file matches" statt echter Treffer.
Fundstelle: `scripts/leitstand-server.mjs`, `LAUFID_UNZULAESSIGE_ZEICHEN`.
Auswirkung: jedes künftige Grep-basierte Gate oder jede manuelle Textsuche gegen diese Datei lief ins Leere, ohne sichtbaren Fehler (stille Lücke, keine Fehlermeldung außer der „binary file"-Notiz). Rein syntaktisch, keine Verhaltensänderung des Regex selbst.
Maßnahme: auf das Escape `[U+0000-U+001F]` umgestellt — semantisch identisch, real verifiziert: `grep -n "pathname" scripts/leitstand-server.mjs` liefert danach echte Zeilentreffer statt „binary file matches".
Feature/Run: F12 WS-3, 07.09.2026 (Auftrag, Zusatzaufgabe 1).

**F-150** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Verwaiste Remote-Branches und ein aus einem Challenger-Fehler entstandener Duplikat-Branch.
Beschreibung: `git ls-remote` zeigte vor dieser Runde ~30 bereits gemergte `docs/*`-Branches auf `origin`. Zusätzlich hat der Challenger-Chat vor dem WS-3-Plan-Auftrag einen Terminal-Block ausgegeben, der den bereits existierenden Branch `docs/f12-ws3-techplan` nicht kannte (kein vorheriges `git ls-remote`) und dadurch einen lokalen Duplikat-Branch `docs/f12-ws3-tech-plan` erzeugen ließ. Stefan hat ihn wieder gelöscht.
Fundstelle: Challenger-Sitzung 07.09.2026, vor dem WS-3-Bauauftrag.
Auswirkung: Branch-Liste unübersichtlich, Verwechslungsgefahr bei Merge-Bestätigungen.
Maßnahme: gemergte Branches nach PR-Merge zeitnah löschen (lokal und remote); im Challenger-Chat vor jedem vorgeschlagenen Branch-Namen `git ls-remote refs/heads/*` lesen statt einen Namen aus dem Gesprächsverlauf zu erinnern.
Feature/Run: F12 WS-3-Planvorbereitung, 07.09.2026.

**F-151** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Trotz F-100 und der dokumentierten Bridge-Regel erneut `git status`/`git branch` aus der Bridge ausgeführt — `.git/index.lock` blieb stehen.
Beschreibung: Der Technical-Challenger-Chat hat am 07.09.2026 vor der Verifikation von F12 WS-3 `git status` und `git branch --show-current` über die Remote-Devices-Bridge ausgeführt, obwohl sowohl F-100 als auch die eigenen Projektinstruktionen (Abschnitt „Bridge- und Git-Sicherheitsregel") diese Befehle explizit ausschließen (erlaubt: log, ls-tree, ls-remote, rev-parse, cat, diff, grep, show). Ergebnis: `.git/index.lock` blieb zurück, von der Bridge nicht löschbar — Stefan musste ihn manuell per `Remove-Item .git\index.lock` entfernen.
Fundstelle: Challenger-Sitzung 07.09.2026, unmittelbar vor Freigabe von F12 WS-3 zum Commit/Push.
Auswirkung: identisch zu F-100 — jede Git-Operation blockiert, bis der Lock manuell entfernt wird. Zeigt, dass die dokumentierte Regel allein Wiederholung nicht verhindert.
Maßnahme: [EMPFEHLUNG] die erlaubte Befehlsliste vor jedem Bridge-Verifikationsschritt als feste Checkliste behandeln statt aus dem Gedächtnis; für den hier üblichen Diff-/Log-basierten Verifikationsablauf reichen `log`/`diff`/`show`/`grep` durchgängig aus, `status`/`branch` werden nie gebraucht.
Feature/Run: F12 WS-3-Verifikation, 07.09.2026.

**F-152** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Messgröße "Fehldarstellungen = 0" ohne Phasentrennung nicht ehrlich messbar.
Beschreibung: §13.3 misst Terminalwechsel und manuell geöffnete Dateien in der Bedienphase, stellt Fehldarstellungen aber erst in der Verifikationsphase fest — diese Feststellung erfordert selbst eine Kreuzprüfung gegen kontrollzustand/. Ohne Phasentrennung ist mindestens eine der drei Zahlen zwangsläufig unehrlich.
Maßnahme: Protokollstruktur aus features/F12/nachweis-ws4.md für die Dogfooding-Phase übernehmen.
Feature/Run: F12 WS-4, 07.09.2026.

**F-153** · `TECH_DEBT` · P2 · offen
Titel: Leitstand nutzt fest startvorlagen/beispielprojekt.json.
Beschreibung: profiles/beispielprojekt.json ist die einzige Startvorlage; ein Lauf gegen das reale Projekt ai-workforce ist damit nicht startbar.
Auswirkung: kein AK9-Blocker, aber Blocker für die Dogfooding-Phase am realen Projekt.
Maßnahme: Startvorlage ai-workforce vor Beginn der Dogfooding-Phase nachziehen.
Feature/Run: F12 WS-4, 07.09.2026.

**F-154** · `PROCESS_IMPROVEMENT` · P1 · offen
Titel: Bridge-Git-Sicherheitsregel zum zweiten Mal in Folge verletzt.
Beschreibung: git status über die Bridge ausgeführt, obwohl nur log, ls-tree, ls-remote, rev-parse, cat, diff, grep, show erlaubt sind. Zweiter Vorfall nach F-151, diesmal ohne bleibenden Schaden.
Auswirkung: fünf dokumentierte Vorfälle mit .git/index.lock, einmal mit realem Arbeitsausfall.
Maßnahme: technische statt rein dokumentarischer Absicherung prüfen — Dokumentation allein hat zweimal nicht gereicht.
Feature/Run: F12 WS-4, 07.09.2026.

**F-155** · `TECH_DEBT` · P3 · offen
Titel: Kein Schutz gegen Mehrfachklick auf "Starten" im Leitstand-Startformular.
Beschreibung: Fünf statt zwei Läufe im WS-4-Nachweis entstanden, alle real und valide. YAGNI-Rückstellung.
Maßnahme: Button während des laufenden POST deaktivieren, falls im Dogfooding erneut störend.
Feature/Run: F12 WS-4, 07.09.2026.

**F-156** · `PROCESS_IMPROVEMENT` · P1 · offen
Titel: F-152 bis F-155 wurden nicht ins Register übernommen.
Beschreibung: state/findings.md endete bei F-151, während claude/137 "Vollständiges Register: state/findings.md" behauptete. Vier Findings, davon eines P1 (Bridge-Regel, F-154), existierten nur außerhalb des Repos.
Auswirkung: die Findings-Regel verfehlt genau den Zweck, für den sie existiert — Findings bleiben im Chat.
Maßnahme: Register-Nachtrag als Pflichtschritt in die Übergaberoutine aufnehmen; nachgetragen mit PR docs/findings-f152-f155.
Feature/Run: Challenge F13, 07.09.2026.

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

**F-161** · `TECH_DEBT` · P3 · offen
Titel: werkzeugsatz bleibt in der Wiederaufnahme-Vorbelegung leer.
Beschreibung: baueWiederaufnahmeVorlage/initWiederaufnahmeBedienung (public/leitstand/app.js) belegt beim Wiederaufnahme-Formular alle rekonstruierbaren Felder vor, werkzeugsatz bewusst nicht — real geprüft: aus dem persistierten Zustand nirgends rekonstruierbar.
Auswirkung: Mensch muss werkzeugsatz bei jeder Wiederaufnahme erneut wählen.
Maßnahme: keine vorgesehen, außer der Wert wird künftig doch irgendwo mitgeführt.
Feature/Run: F13 WS-1, 07.09.2026.

**F-162** · `TECH_DEBT` · P2 · gelöst
Titel: begruendung muss bei Entscheidungsart 'terminal' Pflichtfeld sein.
Beschreibung: ohne erzwungene Begründung könnte eine Klärung ohne nachvollziehbaren Grund aufgelöst werden — pruefeEntscheidungsformular lehnt art:'terminal' ohne begruendung serverseitig mit 400 ab, vor jeder Zustandsänderung.
Maßnahme: umgesetzt in F13 WS-2 (scripts/leitstand-server.mjs), getestet (check-f13-entscheiden.mjs).
Feature/Run: F13 WS-2, 07.09.2026.

**F-163** · `TECH_DEBT` · P3 · offen
Titel: Kein Lineage-Verweis für Entscheidungen der Art 'antwort'/'stale'.
Beschreibung: F13 WS-3 (AK5) registriert das entscheidung-<laufId>-Artefakt nur im art:'terminal'-Zweig; bei 'antwort'/'stale' bewusst zurückgestellt, weil der Folgelauf dort bereits über die Transportpaket-Kette (F9) verweist.
Auswirkung: keine bekannte reale Lücke, rein dokumentarisch nachgetragen.
Maßnahme: bei Bedarf (falls doch ein realer Klärfall mit art 'antwort'/'stale' eine Wiederaufnahme mit Lineage-Verweis braucht) erneut aufgreifen.
Feature/Run: F13 WS-3, 07.09.2026.

**F-164** · `PROCESS_IMPROVEMENT` · P1 · offen
Titel: Findings-Register-Nachtrag bleibt Handarbeit — dritte Wiederholung.
Beschreibung: Wie schon bei F-151/F-154 (Bridge-Sicherheitsregel) zeigt sich erneut, dass eine rein dokumentarische Regel ohne technische Absicherung wiederholt verfehlt wird — F-156 hatte das für F-152 bis F-155 bereits einmal real belegt. Auch dieser Auftrag (F13 WS-4) musste den real vergebenen Findings-ID-Bereich (F-164 ff.) erst von Hand gegen state/findings.md prüfen, statt dass ein Gate das automatisch sicherstellt.
Auswirkung: ohne technische Absicherung bleibt jeder Findings-Nachtrag von der Disziplin der jeweiligen Sitzung abhängig.
Maßnahme: [EMPFEHLUNG] ein Gate, das im Code vorkommende F-\d+-Referenzen (Kommentare, Testnamen) gegen state/findings.md abgleicht und eine fehlende Registrierung meldet.
Feature/Run: F13 WS-4, 08.09.2026.

**F-165** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: F13-Workstream-Nummerierung in feature.md weicht vom real gebauten Verlauf ab.
Beschreibung: features/F13/feature.md listete AK5 unter WS-2 ("AK3, AK4, AK5, AK6, AK7"); real kam AK5 aber über einen eigenen, als "WS-3" betitelten PR (#100, Commit c7fc435) — WS-2 (PR #99) deckte real nur AK3/AK4/AK6/AK7 ab.
Auswirkung: die Workstream-Liste in feature.md war keine verlässliche Karte des realen Bauverlaufs mehr.
Maßnahme: Randnotiz in feature.md unter „Workstream-Liste" ergänzt (keine rückwirkende Umnummerierung).
Feature/Run: F13 WS-4, 08.09.2026.

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

**F-168** · `TECH_DEBT` · P2 · offen
Titel: art:'antwort' verwendet dieselbe laufId statt eskalationsLaufId(laufId).
Beschreibung: das art:'antwort'-Formular (renderEntscheidungBlock/initEntscheidungBedienung, public/leitstand/app.js) und der zugehörige POST /api/entscheidungen-Zweig (importiereAntwort) verwenden die laufId des ursprünglichen, blockierten Laufs (gewaehlteLaufId aus der Detailansicht) — die reale E-186-Eskalation läuft aber unter einer eigenen eskalationsLaufId(laufId) = `${laufId}-eskalation-<uuid>` (src/execution-controller/index.ts:106–108), unter der die transport-<...>-Kette tatsächlich liegt.
Auswirkung: real ungeprüft (kein E-186-Nachweisfall in AK8/AK9 vorgesehen, siehe F-159) — potenziell dieselbe Fehlerklasse wie F-166, aber für den selteneren E-186-Fall statt des häufigen VERWEIGERT-Falls.
Maßnahme: bewusst zurückgestellt (Nicht-Ziel von F13 WS-4) — bei Bedarf gesondert aufgreifen, sobald ein realer E-186-Nachweisfall ansteht.
Feature/Run: F13 WS-4, 08.09.2026.

**F-169** · `TECH_DEBT` · P2 · offen
Titel: Kein Schutz gegen Doppelklick bei den drei Entscheidungs-Buttons (terminal/antwort/kenntnisnahme).
Beschreibung: QA-Pass (F13 WS-4): initEntscheidungBedienung (public/leitstand/app.js) hat — anders als initAuftragFormular/initStartformular (Muster `if (button.disabled) return` / `button.disabled = true` / `finally { button.disabled = false }`) — keinen Disable-Guard für die Entscheidungs-Buttons. Zusätzlich verschwindet die Erfolgsmeldung sofort durch den automatischen `ladeLaufDetail`-Reload; bei 'kenntnisnahme' bleibt danach ein identisch leeres Formular sichtbar (keine neue Wirkungsmarke ändert den Laufstatus), was zu einem versehentlichen zweiten Absenden verleiten kann.
Auswirkung: mehrfache, harmlose aber unbeabsichtigte Zusatzversionen des entscheidung-<laufId>-Artefakts sind möglich; bei 'terminal'/'antwort' vorbestehend (WS-2), bei 'kenntnisnahme' neu durch WS-4 reproduziert (gleiches Muster, wie im Auftrag vorgegeben).
Maßnahme: [EMPFEHLUNG] alle drei Buttons auf das bestehende Disable-Guard-Muster umstellen; Erfolgsmeldung sichtbar halten, bis der Nutzer sie aktiv verlässt.
Feature/Run: F13 WS-4 (QA-Pass), 08.09.2026.

**F-170** · `TECH_DEBT` · P3 · offen
Titel: Begründungsfelder werden nicht getrimmt — eine reine Leerzeichen-Begründung wird akzeptiert.
Beschreibung: QA-Pass (F13 WS-4): pruefeEntscheidungsformular prüft bei 'terminal'/'stale'/'kenntnisnahme' nur `typeof !== 'string' || length === 0`, ohne `.trim()`; die Client-Textareas senden `.value` ebenfalls ungetrimmt.
Auswirkung: eine inhaltsleere Begründung (nur Leerzeichen) wird dauerhaft in der Lineage festgehalten — bei 'terminal' zusätzlich in daten.mensch_begruendung der Wirkungsmarke selbst — und unterläuft damit AK4 ("menschlich bezeugter Entscheidungstext").
Maßnahme: [EMPFEHLUNG] `.trim().length === 0` statt `.length === 0` prüfen, für alle drei Begründungsfelder einheitlich.
Feature/Run: F13 WS-4 (QA-Pass), 08.09.2026.

**F-171** · `TECH_DEBT` · P3 · offen
Titel: Ein zwischenzeitlich anderswo aufgelöster Klärfall zeigt im offenen Detail-Panel nur einen unerklärten 400.
Beschreibung: QA-Pass (F13 WS-4): ladeLaufDetail ist nicht Teil des 2-Sekunden-Polls — bleibt ein Detail-Panel offen, während derselbe Lauf über einen zweiten Tab/API-Aufruf entschieden wird, liefert ein anschließender Entscheidungsversuch im ersten Panel korrekt 400 (kein Dateninkonsistenz-Risiko), aber ohne Hinweis auf den geänderten Zustand oder automatisches Nachladen.
Auswirkung: UX-Verwirrung, keine Datenintegritätsverletzung — der Server bleibt in jedem Fall maßgeblich.
Maßnahme: [EMPFEHLUNG] bei 400 im Entscheidungsblock automatisch `ladeLaufDetail` erneut anstoßen statt nur den Fehlertext zu zeigen.
Feature/Run: F13 WS-4 (QA-Pass), 08.09.2026.

**F-172** · `TECH_DEBT` · P2 · offen
Titel: KLAERUNG_ERFORDERLICH ist strukturell ununterscheidbar von "Lauf läuft noch".
Beschreibung: QA-Pass (F13 WS-4, vorbestehend, nicht durch WS-4 verursacht, aber dieselbe Verzweigung betroffen): stelleLaufstatusFest (src/checkpoint-store/index.ts:702–757) liefert für eine offene RUN_PREPARED-Sequenz immer KLAERUNG_ERFORDERLICH — auch während `fuehreAufgabeDurch` für denselben Lauf noch aktiv läuft. Die In-Memory-laufAktiv-Sperre (D13) wird nirgends an GET /api/laeufe/<laufId> durchgereicht, und der Entscheidungs-POST bleibt bewusst ungesperrt (AK6). Ein Mensch könnte also während eines noch laufenden Prozesses eine vorzeitige art:'terminal'-Entscheidung schreiben.
Auswirkung: die spätere, echte Terminalmarke des Laufs würde als terminaleOhneRunPrepared-Waise landen, ohne den bereits von Hand gesetzten Status/das Ergebnis zu korrigieren — F-167 (dieser Workstream) schützt nur gegen "terminal auf bereits ABGESCHLOSSEN", nicht gegen diesen umgekehrten Fall.
Maßnahme: [EMPFEHLUNG] bei Bedarf gesondert aufgreifen — außerhalb des WS-4-Diffs entstanden, kein WS-4-Blocker.
Feature/Run: F13 WS-4 (QA-Pass), 08.09.2026.

**F-173** · `TECH_DEBT` · P3 · offen
Titel: Auflösen eines Klärfalls über art:'terminal' (VERWEIGERT/FEHLGESCHLAGEN) zeigt sofort ein zweites, separates Kenntnisnahme-Formular für denselben Lauf.
Beschreibung: QA-Pass (F13 WS-4): renderEntscheidungBlock zeigt nach einer erfolgreichen art:'terminal'-Entscheidung mit Ergebnis VERWEIGERT (ohne Bypass-Verdacht) oder FEHLGESCHLAGEN sofort ein neues, leeres Kenntnisnahme-Formular — obwohl bereits ein entscheidung-<laufId>-Artefakt aus dem terminal-Zweig existiert und die menschliche Begründung dafür schon vorliegt (AK4 bereits erfüllt). Exakt die im Auftrag vorgegebene Bedingung (ABGESCHLOSSEN/VERWEIGERT ohne Bypass, ODER FEHLGESCHLAGEN → Kenntnisnahme-Formular), nur ohne Ausnahme für den Fall "gerade erst selbst terminal entschieden".
Auswirkung: unnötige doppelte Begründungsabfrage; keine Dateninkonsistenz (eine zweite Kenntnisnahme legt nur eine weitere harmlose Artefaktversion an).
Maßnahme: [EMPFEHLUNG] bei Bedarf prüfen, ob GET /api/laeufe/<laufId> künftig meldet, ob bereits ein entscheidung-<laufId>-Artefakt existiert, und die UI das Kenntnisnahme-Formular dann unterdrückt — eigener Workstream, da das eine neue Server-Projektion erfordert (über den WS-4-Vertrag hinaus).
Feature/Run: F13 WS-4 (QA-Pass), 08.09.2026.

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

**F-177** · `TECH_DEBT` · P2 · offen
Titel: zeitgrenzeMs ist durchgereicht, hat aber keinen Setzer im Realbetrieb
Beschreibung: AusfuehrungsOptionen.zeitgrenzeMs wird korrekt von F8 bis zu
starteProzess durchgereicht und ist als Body-Feld gesperrt
(VERBOTENE_OPTIONEN_FELDER). Kein Codepfad setzt den Wert. Über den Leitstand
gestartete Läufe haben damit weiterhin kein Timeout.
Fundstelle: scripts/leitstand-server.mjs:734 (einziger Treffer);
src/execution-controller/index.ts:258
Auswirkung: AK2 (F14) strukturell erfüllt, praktisch wirkungslos. Ohne
Auflösung ist der AK10-Nachweislauf nicht durchführbar.
Empfohlene Maßnahme: In F14 WS-4 die Herkunft festlegen (Vorschlag:
Startvorlage, konsistent zu werkzeugStartziel/berechtigungskontext, die seit
F11 WS-2 ebenfalls serverseitig von dort kommen).
Entdeckt bei: Verifikation F14 WS-1, 09.09.2026

**F-178** · `TECH_DEBT` · P3 · offen
Titel: TIMEOUT/maxBuffer-Abgrenzung hängt an undokumentiertem Node-Verhalten
Beschreibung: Die Unterscheidung stützt sich darauf, dass ein maxBuffer-
Überlauf fehler.killed !== true liefert — empirisch für die aktuelle
Node-Version geprüft, aber nicht dokumentiertes Verhalten. Bei einem
Node-Upgrade könnte ein Überlauf still als TIMEOUT klassifiziert werden.
Fundstelle: src/claude-code-gateway/prozessstart.ts:94-96, 131
Auswirkung: Fehlklassifikation nach Node-Upgrade. Durch bestehenden
Regressionstest abgefangen — kein Betriebsrisiko, solange npm run check vor
einem Upgrade läuft.
Empfohlene Maßnahme: Keine Codeänderung. Beim nächsten Node-Upgrade gezielt
gegenprüfen.
Entdeckt bei: Verifikation F14 WS-1, 09.09.2026

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

**F-180** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Scratch-Ordner "Claude outputs/" außerhalb der Repo-Konventionen
Beschreibung: Enthält Duplikate bereits committeter F13-Nachweise
(nachweis-ws3.md identisch mit features/F13/nachweis-ws3.md). Kein Bezug zu
docs/, state/, features/, nachweis/.
Fundstelle: Claude outputs/nachweis-ws3.md, Claude outputs/nachweis-ws4.md
Auswirkung: Gering — nur relevant, wenn erneut versehentlich mitcommitet.
Empfohlene Maßnahme: Bei Gelegenheit lokal aufräumen oder Ordner in
.gitignore aufnehmen. Kein aktiver Handlungsbedarf.
Entdeckt bei: Verifikation F14 WS-1, 09.09.2026

**F-181** · `TECH_DEBT` · P3 · offen
Titel: Detachte Enkelprozesse unter Windows sind durch keinen der beiden
Kill-Mechanismen abgedeckt
Beschreibung: F14 WS-2 (AK4) real gemessen (`node --test`, echter
Prozessbaum, `execFile`-Timeout, Windows 11/Node 24.16.0): ein *nicht*
detachter Enkelprozess stirbt bereits durch Node 24s eigenen
Windows-Job-Object-Mechanismus mit, sobald der direkte Kindprozess
gekillt wird — unabhängig vom zusätzlichen `taskkill /T /F`-Aufruf in
`killeProzessbaumFallsWindows`. Ein mit `detached: true` gestarteter
Enkelprozess entkommt diesem Job-Object jedoch (Windows-Breakaway) und
bleibt ohne Gegenmaßnahme am Leben. `taskkill /T /F` KANN einen solchen
Fall abdecken, aber nur, wenn der Ziel-PID zum Aufrufzeitpunkt noch lebt
— in der bestehenden Kill-Reihenfolge (Node killt zuerst über
`execFile`s `timeout`/`signal`, danach erst `taskkill` im Callback) ist
der direkte Kindprozess zu diesem Zeitpunkt bereits tot, `taskkill`
liefert real reproduzierbar „Der Prozess ... wurde nicht gefunden" und
kann den Baum nicht mehr aufbauen. Weder Node noch `taskkill` garantieren
also etwas für einen detachten Enkelprozess in der aktuellen Architektur.
Fundstelle: src/claude-code-gateway/prozessstart.ts (killeProzessbaumFallsWindows,
echterStarter)
Auswirkung: Kein bekannter Anwendungsfall — der von starteProzess
gestartete Claude-Code-Kindprozess und seine bislang beobachteten
Unterprozesse sind nicht detached. Falls ein künftiges Werkzeug oder ein
MCP-Server einen eigenen Hintergrundprozess mit `detached: true` startet,
bleibt dieser nach einem TIMEOUT/ABBRUCH-Kill als Waise zurück.
Empfohlene Maßnahme: Kein Handlungsbedarf ohne konkreten Anwendungsfall
(YAGNI). Bei Bedarf: eigene Kill-Auslösung vor statt nach Node's
execFile-Timeout (eigener Timer/Abort-Listener, der taskkill aufruft,
solange der Kindprozess noch lebt) — größerer Eingriff, der WS-1s
Fehlerklassifikation (fehler.killed/ABORT_ERR) neu empirisch prüfen
müsste.
Entdeckt bei: Verifikation F14 WS-2, 09.09.2026

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

**F-183** · `PROCESS_IMPROVEMENT` · P1 · offen
Titel: M3-Zielbild kollidiert an neun Stellen mit der geltenden Sollquelle
(Fassung-1-Grenzen).
Beschreibung: Provider-Adapter, Stufe-1-Orchestrierung, Rollen-Injektion,
Abo-Regel (30), automatische Modellwahl, Geld statt Kontingent,
Versionsverwaltung, Werkzeug-Sammeln, Parallelität — Tabelle in
Claude-Projekt claude/153 §3.
Fundstelle: docs/projekt/zielfassung.md §2, §4, §11, §12, §13.2, §13.3,
§16.1, §16.7; docs/projekt/umsetzungsplan-fassung-1.md §1, §4, §5.
Auswirkung: Ohne nummerierte Entscheidungen wäre jeder M3-Bauauftrag ein
Verstoß gegen §0 der Zielfassung.
Empfohlene Maßnahme: E-M3-1…E-M3-3 entscheiden (im Projektchat am
09.09.2026 mündlich freigegeben), Zielfassung v1.17 mit §13.4 als
Doku-PR vor F15.
Feature/Run: M3-Challenge, 09.09.2026.

**F-184** · `TECH_DEBT` · P2 · offen
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
Feature/Run: M3-Challenge, 09.09.2026.

**F-185** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: Secret-Ausschluss (.claudeignore, Entscheidung 35) wirkt nur für
Claude Code — ein zweiter Worker braucht eine eigene Egress-Grenze.
Beschreibung: Codex liest .claudeignore nicht; ebenso greifen
guard-settings.js/commit-guard.cjs (Claude-Code-Hooks) für Codex nicht.
E-183/E-188 haben für einen zweiten Worker keinen Wirksamkeitsnachweis.
Fundstelle: .claudeignore; .claude/settings.json (Hooks);
src/invocation-policy/types.ts (Gültigkeitsschlüssel bindet
.claude/settings.json).
Auswirkung: Ein schreibender Codex-Lauf wäre ungegatet (§16.4-Verstoß);
ein lesender Lauf könnte .env*/state/tasks/** sehen.
Empfohlene Maßnahme: F16: Codex strukturell nur read-only; Context
Builder erhält Worker-Attribut `extern` mit Zusatz-Ausschlüssen; Spike
S-M3-01 misst den Rot-Fall.
Feature/Run: M3-Challenge, 09.09.2026.

**F-186** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: device_bash erneut nicht verfügbar; claude/152 verweist mit
falscher ID auf das Bridge-Finding.
Beschreibung: Sitzung 09.09.2026: „no Plan9 drive shares mounted" —
Workaround device_stage_files + Read trägt vollständig (Muster F-174).
claude/152 §2 nennt „F-155, F-174" für die Bridge-Zuverlässigkeit; F-155
ist real „Mehrfachklick auf Starten".
Fundstelle: Claude-Projekt claude/152 §2; state/findings.md F-155.
Auswirkung: Gering — nur Verweisqualität.
Empfohlene Maßnahme: Keine im Repo; Korrektur im Claude-Projekt.
Feature/Run: M3-Challenge, 09.09.2026.

**F-187** · `TECH_DEBT` · P3 · offen
Titel: Unversionierte Testlauf-Artefakte in kontrollzustand/.
Beschreibung: 34+ untracked Verzeichnisse unter kontrollzustand/
(Testläufe), weder committet noch gitignored.
Fundstelle: kontrollzustand/ (Beobachtung 09.09.2026, M3-Challenge-Session).
Auswirkung: Kein Blocker (Ziel-Fassung v1.17 §9.2 Punkt 2 nimmt
Workforce-State von der Arbeitsbaum-Sauberkeitsbedingung aus); F18
(Capability-Register) würde diese Testartefakte sonst mitscannen.
Empfohlene Maßnahme: Vor F18-Bau bereinigen oder Scan-Filter definieren.
Feature/Run: M3-Vorbereitung.

**F-188** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: Codex-CLI-Standard-Sandbox blockiert auch Lesebefehle.
Beschreibung: In Lauf 1 der Spike S-M3-01 wurden reine Lesebefehle
(PowerShell Get-ChildItem, rg --files) von der Standard-Sandbox mit
„blocked by policy" abgelehnt — read-only heißt bei Codex CLI nicht
automatisch nutzbarer Lesezugriff.
Fundstelle: state/tp-m3-01-codex.md, Lauf 1.
Auswirkung: F16 (zweiter Worker, lesende Rollen, E-M3-2) kann nicht von
„Default-Sandbox reicht für lesende Rollen" ausgehen — sonst scheitern
reale lesende Aufträge.
Empfohlene Maßnahme: Vor F16-Bau klären, welche Sandbox-/
Approval-Konfiguration tatsächlich Lesezugriff erlaubt, ohne E-M3-2s
Schreibverbot zu verletzen.
Feature/Run: Spike S-M3-01.

**F-191** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: check:template enthält stackgebundene Gates.
Beschreibung: check:template ruft check-f11-auftrag.mjs,
check-f12-leitstand-ansicht.mjs und check-f13-entscheiden.mjs auf; alle
drei importieren aus src/ bzw. scripts/leitstand-server.mjs.
Fundstelle: package.json:19.
Auswirkung: Die Zusage „bleibt im leeren Template grün" trägt heute nicht
— ein frisch geklontes Template scheitert an diesen drei Gates. Nicht
F15-blockierend.
Empfohlene Maßnahme: Entweder die drei Gates aus check:template entfernen
oder die Zusage neu formulieren.
Feature/Run: F15 WS-1 (Nebenbefund).

**F-192** · `TECH_DEBT` · P3 · offen
Titel: kontrollzustand-workflow.valid.json zeigt nicht die
M3-Bestehensbedingung.
Beschreibung: Die Referenz-Beispieldatei nutzt für beide Schritte worker
„claude-code"; die Bestehensbedingung aus zielfassung.md §13.4 ist
„lesender Schritt auf Codex → schreibender Schritt auf Claude Code".
Fundstelle: schemas/examples/kontrollzustand-workflow.valid.json:18.
Auswirkung: Keine — in WS-1 ist Codex nicht dispatchbar, ein
Codex-Beispiel wäre irreführend. Der Codex-Grünfall liegt in
src/workflow/workflow.test.ts.
Empfohlene Maßnahme: Bei F16 Schritt 1 der Beispieldatei auf worker
„codex" umstellen.
Feature/Run: F15 WS-1.

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

**F-196** · `TECH_DEBT` · P2 · **teilweise gelöst**
Titel: POST /api/workflows prüft weder auftrag_id noch eine belegte
workflow_id.
Beschreibung: Zwei bewusste Auslassungen von WS-2a, beide im Code
benannt. (a) auftrag_id wird nicht auf Existenz geprüft — anders als
POST /api/laeufe, das genau das synchron tut (F12 AK5); ein Workflow
ohne existierenden Auftrag ist anlegbar und garantiert nicht startbar.
(b) Ein zweiter POST derselben workflow_id erzeugt eine neue Version
(ARCHITECTURE.md §2) und ersetzt damit die Definition eines Workflows,
den WS-2b abarbeiten könnte — der Mensch hätte Fassung 1 freigegeben,
der Automat liefe in Fassung 2 weiter.
Fundstelle: scripts/leitstand-server.mjs, POST /api/workflows
(Kommentarblock „Drei Prüfungen fehlen hier BEWUSST").
Auswirkung: Solange nichts startet, folgenlos. (b) wäre mit Automat eine
Freigabe-Umgehung im Kleinen.
Empfohlene Maßnahme: Vor WS-2b entscheiden — Existenzprüfung analog AK5;
409 bei nicht-OFFENem Workflow.
Feature/Run: F15 WS-2a, Reviewer-/QA-Pass 10.09.2026 (V2/TC-B5/TC-B6).
Status neu: **(b) gelöst, (a) weiterhin offen, 10.09.2026**
Auflösung (b): POST /api/workflows lehnt eine neue Fassung mit 409 ab,
solange der Bestand LAEUFT, WARTET_FREIGABE oder ABGESCHLOSSEN trägt
(GESPERRTE_ERSETZUNGS_STATUS); in OFFEN, KLAERUNG_ERFORDERLICH und GESTOPPT
ist sie erlaubt, weil sie dort der menschliche Reparaturzug ist. Zusätzlich
darf der eingereichte Datensatz selbst keinen gesperrten status tragen, und
ein bereits ungültiger Bestand ist in jedem Status ersetzbar — sonst wäre er
unerreichbar. Rot- und Grünfall je Status in scripts/check-f15-workflow.mjs.
Der Kommentarblock „Drei Prüfungen fehlen hier BEWUSST" ist entsprechend auf
zwei Prüfungen zurückgeschnitten.
Rest (a): auftrag_id wird beim ANLEGEN weiterhin nicht auf Existenz geprüft
(die Zeichenregel greift seit WS-2b, die Existenzprüfung nicht). Der
Startendpunkt fängt es mit 400 ab — ein Workflow ohne existierenden Auftrag
bleibt anlegbar und ist dann nicht startbar.

**F-197** · `BUG` · P2 · offen
Titel: decodeURIComponent ohne Auffangnetz beendet den Serverprozess —
zwei vorbestehende Fundstellen.
Beschreibung: `GET /api/laeufe/%` und `POST /api/laeufe/%/abbrechen`
werfen einen URIError aus einem async-Handler, dessen Promise niemand
awaitet; Node 24 beendet daraufhin den Prozess. Real reproduziert am
10.09.2026 an der dritten, neu hinzugekommenen Fundstelle (GET
/api/workflows/%, Exit 127) — dort mit der neuen Hilfsfunktion
dekodiereSegment behoben, die beiden alten bewusst nicht angefasst
(Verhaltensänderung außerhalb des WS-2a-Zuschnitts: heute Prozesstod,
danach 400).
Fundstelle: scripts/leitstand-server.mjs, GET /api/laeufe/<laufId> und
POST /api/laeufe/<laufId>/abbrechen; Gegenstück dekodiereSegment.
Auswirkung: Verstoß gegen F10 AK6 („ein Wurf beendet den Prozess
nicht"). Bedrohungsmodell entschärft es: der Server bindet nur auf
127.0.0.1, ein einziger lokaler Nutzer.
Empfohlene Maßnahme: Eigene kleine Iteration — beide Aufrufe auf
dekodiereSegment umstellen, je ein Gate-Rotfall mit Lebendprüfung
dahinter (Muster check-f15-workflow.mjs).
Feature/Run: F15 WS-2a, Reviewer-/QA-Pass 10.09.2026 (V1/TC-B2).

**F-198** · `TECH_DEBT` · P2 · offen
Titel: workflow_id ohne Längen- und ohne Windows-Zeichenprüfung — 500
statt 400, OS-divergent.
Beschreibung: POST /api/workflows prüft workflow_id gegen
LAUFID_UNZULAESSIGE_ZEICHEN (Spiegel von pruefeLaufId, D5 — bewusst kein
zweiter Regelsatz im Server). Diese Regel lässt `:` `<` `>` `"` `|` `?`
`*` und beliebige Längen durch. Unter Windows scheitert das anschließende
mkdir → 500; unter Linux entsteht ein Verzeichnis, das die Windows-Sicht
nie öffnen kann. Anders als eine auftragId (serverseitig per randomUUID)
kommt workflow_id aus der Payload, ist also Client-Eingabe.
Fundstelle: scripts/leitstand-server.mjs, POST /api/workflows (Punkt 3
des Kommentarblocks); src/checkpoint-store/index.ts, pruefeLaufId.
Auswirkung: Eine Client-Eingabe endet in einem 500 statt einem 400 (D2:
prüfen vor dem Schreibversuch), und das Verhalten unterscheidet sich
zwischen CI (Linux) und Dev-Rechner (Windows) — genau die Divergenz,
gegen die loeseEvidenzPfadAuf ausdrücklich härtet.
Empfohlene Maßnahme: Die strengere Regel in den Checkpoint Store ziehen
(eine Wahrheitsquelle), nicht als Zweitregel in den Server.
Feature/Run: F15 WS-2a, QA-Pass 10.09.2026 (TC-B3/TC-B4).

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

**F-200** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Im Projektchat formulierte Findings erreichen das Register nicht
zuverlässig.
Beschreibung: F-189, F-190 und F-199 wurden im Challenger-Chat vollständig
ausformuliert und nie in einen Bauauftrag gegeben. Das Register springt
dadurch von F-188 auf F-191. Aufgefallen erst, als die Feature-Akte F15
auf das nicht existierende F-199 verwies und die Bausitzung den Verweis
nicht auflösen konnte. Betroffen ist genau die Projektregel „Erkannte
Schulden dürfen nicht nur im Chat verbleiben" — der Kanal vom
FINDINGS-Abschnitt in die Datei ist rein manuell und hat dreimal
versagt.
Fundstelle: state/findings.md (Nummernlücke 189/190); Projektchat
09.-10.09.2026.
Auswirkung: Findings gehen verloren, sobald der Chat endet. Ein Verweis
aus einem Repo-Dokument auf eine nur im Chat vergebene Nummer zeigt ins
Leere und blockiert eine Bausitzung.
Empfohlene Maßnahme: Zwei Regeln auf Challenger-Seite. (1) Jeder
ausgegebene FINDINGS-Abschnitt benennt in derselben Nachricht den
Bauauftrag, der ihn schreibt — oder wird in den unmittelbar folgenden
Prompt aufgenommen. (2) Vor jeder Freigabe die höchste Nummer im
Register gegen die höchste im Chat vergebene prüfen; eine Lücke bedeutet,
dass etwas nur im Chat steht. Regel (2) hätte alle drei Fälle gefunden.
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

**F-203** · `TECH_DEBT` · P3 · offen
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
Status: offen.
Feature/Run: F15 WS-2b, 10.09.2026.

**F-204** · `TECH_DEBT` · P3 · offen
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
Status: offen.
Feature/Run: F15 WS-2b, 10.09.2026.

**F-205** · `TECH_DEBT` · P3 · offen
Titel: Ambiguitäts-409 aus F-196(b) ist nach Einführung von
GESPERRTE_ERSETZUNGS_STATUS für bestimmte Zwischenzustände faktisch
unerreichbar.
Beschreibung: Rein informativ — kein Verhalten falsch, aber ein
Codepfad, der nach der (3)/(4)-Korrektur in WS-2b in der Praxis seltener
oder nie mehr greift als ursprünglich angenommen. Dokumentiert, damit
ein künftiger Bauauftrag ihn nicht für einen aktiv genutzten Pfad hält.
Fundstelle: scripts/leitstand-server.mjs, POST /api/workflows,
GESPERRTE_ERSETZUNGS_STATUS-Prüfung.
Auswirkung: keine.
Empfohlene Maßnahme: keine Handlung nötig, nur zur Kenntnis.
Status: offen.
Feature/Run: F15 WS-2b, 10.09.2026.

**F-206** · `TECH_DEBT` · P3 · offen
Titel: Verwaistes Kontextpaket-Artefakt nach Heilung eines Schritts
möglich.
Beschreibung: Heilt der Automat eine lauf_id (Heilungslogik in
scripts/leitstand-server.mjs, ~Zeile 2083ff), prüft er nur
<basis>/<laufId> auf Checkpoint/Wirkungsmarke. Registriert F5 vorher
erfolgreich ein kontextpaket-<laufId> und lehnt F6a danach ohne
Wirkungsmarke ab (2 von 7 Ablehnungszweigen in verweigereStart), bleibt
dieses Kontextpaket bestehen, ohne dass ein Schritt mehr darauf zeigt.
Fundstelle: scripts/leitstand-server.mjs, Kommentar bei der
Heilungslogik, ~Zeile 2050–2056 (im Code selbst bereits benannt).
Auswirkung: keine funktionale — die Lineage-Kette bleibt heil (nächster
Start zieht eine frische randomUUID). Reiner Speicher-/Übersichtlichkeits-
Rest.
Empfohlene Maßnahme: bei Gelegenheit (z.B. F18 Capability-Register oder
eine spätere Aufräum-Iteration) prüfen, ob verwaiste kontextpaket-*-
Artefakte identifizierbar/löschbar gemacht werden sollen. Kein Blocker
für WS-2c.
Status: offen.
Feature/Run: F15 WS-2b, 10.09.2026 (bei Verifikation gefunden, nicht im
Bauauftrag selbst).

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

**F-209** · `TECH_DEBT` · P3 · offen
Titel: Instanz-Lock kann bei PID-Wiederverwendung fälschlich blockieren.
Beschreibung: belegeInstanzLock entscheidet allein über
process.kill(pid, 0), ob der Vorbesitzer noch lebt. Betriebssysteme
vergeben PIDs wieder; stirbt der Leitstand hart und bekommt ein
beliebiger anderer Prozess dieselbe PID, hält der Lock den Neustart für
blockiert, obwohl keine Leitstand-Instanz läuft.
Fundstelle: scripts/leitstand-server.mjs, pidLebt/belegeInstanzLock
(~Zeile 2309ff).
Auswirkung: gering und selbstheilend — die Fehlermeldung nennt den
Dateipfad, der Mensch entfernt die Datei von Hand. Kein Datenverlust,
keine stille Fehlfunktion.
Empfohlene Maßnahme: keine. Eine belastbarere Prüfung (Prozessname,
Startzeit gegen Boot-Zeit) wäre plattformabhängig und steht in keinem
Verhältnis zum Risiko. Dokumentiert, damit ein künftiger Bauauftrag den
Fall nicht für einen Bug hält.
Status: offen.
Feature/Run: F15 WS-2c-Vorbereitung, 10.09.2026
(Challenger-Verifikation).

**F-210** · `TECH_DEBT` · P3 · offen
Titel: Zwei Restlücken im Heilungszweig des Instanz-Locks.
Beschreibung: (a) unlinkSync(lockPfad) im Heilungszweig von
belegeInstanzLock ist ungeschützt. Hat eine andere Instanz die verwaiste
Datei in derselben Millisekunde entfernt, wirft ENOENT und der Start
bricht mit einem rohen Fehler statt mit der vorgesehenen Meldung ab. (b)
Starten zwei Instanzen gleichzeitig auf eine bereits verwaiste
Lock-Datei, können beide sie als verwaist lesen; die zweite entfernt
danach die inzwischen frisch und gültig belegte Datei der ersten und
legt ihre eigene an. Beide laufen dann.
Fundstelle: scripts/leitstand-server.mjs, belegeInstanzLock, unlinkSync
im EEXIST-Zweig.
Auswirkung: (a) nur kosmetisch — der Start bricht in der sicheren
Richtung ab, es laufen nie zwei Instanzen. (b) ist die eigentliche
Restlücke, setzt aber einen harten Absturz UND zwei zeitgleiche Starts
voraus. Der Normalbetrieb (ein Mensch, ein npm run leitstand) erreicht
sie nicht.
Empfohlene Maßnahme: Keine. Bewusst offen gelassen (Challenger,
10.09.2026, Fast-Prototyping): eine dichte Fassung bräuchte
Schreiben-und-Umbenennen oder ein Inhaltsvergleich vor dem Entfernen,
und das steht in keinem Verhältnis zu einer lokalen
Einzelplatzanwendung. Erneut prüfen, falls der Leitstand je
mehrbenutzerfähig oder als Dienst betrieben werden soll.
Status: offen.
Feature/Run: F15 WS-2c-Vorbereitung, 10.09.2026
(Challenger-Verifikation).

**F-211** · `HARNESS_IMPROVEMENT` · P1 · offen
Titel: Neue Gates werden nicht auf Rot kalibriert.
Beschreibung: Der Vertragsfall (d) in
scripts/check-f15-instanzlock.mjs war in seiner ersten Fassung grün,
obwohl der Instanz-Lock-Aufruf im CLI-Bindeblock entfernt war — er
prüfte einen leeren Quelltextausschnitt und meldete Erfolg. Aufgefallen
ist das erst im Reviewer-Pass, nicht beim Bau. Die Definition of Done
verlangt grüne Gates, aber nirgends den Nachweis, dass ein Gate rot
wird, wenn die zugesagte Eigenschaft fehlt.
Fundstelle: scripts/check-f15-instanzlock.mjs, Vertragsfall (d), erste
Fassung; DoD in CLAUDE.md.
Auswirkung: Ein Gate ohne Rot-Nachweis belegt nur, dass die Datei läuft.
Bei einem Sicherheitsvertrag wie D13 oder dem Instanz-Lock heißt das:
der Schutz kann abgeschaltet werden, ohne dass etwas anschlägt. Betrifft
potenziell alle bestehenden check-*.mjs, nicht nur dieses.
Empfohlene Maßnahme: DoD ergänzen — für jede NEUE oder VERSCHÄRFTE
Gate-Zusage wird einmal belegt, dass sie rot wird, wenn man die
zugesagte Eigenschaft im Quelltext bricht (Manipulation, Rotbeleg,
Rückbau, Diff unverändert). Das Verfahren ist in diesem Branch bereits
real angewandt worden und hat drei Zusagen geprüft. Zusätzlich als
eigene Iteration prüfen, welche bestehenden Gates nie rot kalibriert
wurden.
Status: offen.
Feature/Run: F15 WS-2c-Vorbereitung, 10.09.2026 (Reviewer-Pass).

**F-212** · `TECH_DEBT` · P2 · offen
Titel: Die D13-Übergabe ohne Fenster ist nicht verhaltensmäßig prüfbar.
Beschreibung: Beim Rot-Kalibrieren von AK6b (F15 WS-2c) wurde die
Fortsetzung testweise in ein `setTimeout(..., 0)` verschoben — genau der
Defekt, den die Invariante ausschließen soll (D13 ist zwischen Reset und
Neubelegung frei). BEIDE Verhaltensfälle in
`scripts/check-f15-workflow.mjs` blieben grün: der Automat setzte weiterhin
fort, und nach der Übergabe war D13 wieder belegt. Rot wurde allein die
Quelltext-Invariante (`D13-UEBERGABE-OHNE-FENSTER`). Ein Test müsste einen
Request in ein Fenster von einem Microtask Breite legen; das ist von außen
nicht ansteuerbar.
Fundstelle: `scripts/check-f15-workflow.mjs`, Abschnitt „D13-Übergabe ohne
Fenster"; `scripts/leitstand-server.mjs`, die drei markierten Bereiche.
Auswirkung: Die Zusage hängt an einer Textprüfung. Sie fängt jede
Formulierung, die eine der bekannten Zeichenketten (`await`, `setTimeout`,
`queueMicrotask`, `.then(`, …) benutzt — nicht aber einen Kontrollflusswechsel,
der über eine eigene Hilfsfunktion außerhalb des markierten Bereichs
eingeführt wird.
Empfohlene Maßnahme: keine sofortige. Dokumentiert, damit ein künftiger
Eingriff die Textprüfung nicht für stärker hält, als sie ist. Falls der
Automat je mehr als zwei Schritte am Stück fährt oder ein zweiter
Fortsetzungspfad entsteht, erneut prüfen — dann wäre ein
Instrumentierungshaken (Zähler auf laufAktiv-Wechseln) das nächste Mittel.
Status: offen.
Feature/Run: F15 WS-2c (a), 10.09.2026.

**F-213** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Ein Gate-Fall, der eine Scope-Grenze zusagt, wird beim Aufheben der
Grenze rot und muss ersetzt statt ergänzt werden.
Beschreibung: `scripts/check-f15-workflow.mjs` sagte in WS-2b ausdrücklich
zu, dass der Cursor NICHTS startet („das ist WS-2c"), inklusive eines
zweiten `POST .../starten`, der Schritt 2 ausführt. WS-2c hebt genau diese
Grenze auf — vier Befunde beim ersten Lauf, alle korrekt, keiner ein Defekt.
Der Fall musste durch sein Gegenteil ersetzt werden.
Fundstelle: `scripts/check-f15-workflow.mjs`, früherer „Grünfall 2 (WS-2b
(6))", jetzt „Grünfall 2 (WS-2c, AK6b)".
Auswirkung: keine funktionale. Aber: ein rot werdendes Gate ist normalerweise
ein Defektsignal, und hier war es ein Fahrplansignal. Wer den Unterschied
nicht sieht, repariert am falschen Ende — oder schwächt den Fall ab, statt
ihn zu ersetzen.
Empfohlene Maßnahme: Fälle, die eine bewusst temporäre Scope-Grenze zusagen,
im Fallnamen als solche kennzeichnen (z. B. „SCOPE-GRENZE WS-2b"), damit die
nächste Iteration sie als Umbaustelle und nicht als Regression liest.
Status: offen.
Feature/Run: F15 WS-2c (a), 10.09.2026.

**F-214** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: Die Feature-Gates F10–F15 stehen nicht in `state/gates.md`.
Beschreibung: `state/gates.md` führt jedes objektive Gate mit bekanntem Rot-
und Grün-Fall — die Datei nennt aber keines der Feature-Gates
`check-f10-leitstand.mjs` bis `check-f15-*.mjs`. Die Rot-Kalibrierungen
dieser Gates leben damit ausschließlich in Commit-Botschaften und
Berichten.
Fundstelle: `state/gates.md` (keine Zeile zu F10–F15);
`package.json`, `npm run check`.
Auswirkung: F-211 verlangt für jede neue oder verschärfte Gate-Zusage einen
Rotbeleg. Ohne Ablageort verfällt der Beleg mit dem Bericht, in dem er
steht — und die nächste Iteration kann nicht nachsehen, welche Zusage je rot
kalibriert wurde und welche nicht.
Empfohlene Maßnahme: gemeinsam mit F-211 als eigene Iteration — dieselbe
Frage, dieselbe Datei. Nicht in WS-2c nachgezogen, weil eine
Nachdokumentation von sechs Gates ohne erneute Kalibrierung genau die Art
Behauptung wäre, gegen die F-211 sich richtet.
Status: offen.
Feature/Run: F15 WS-2c (a), 10.09.2026.

**F-215** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: Der D13-Vertrag in `check-f11-auftrag.mjs` prüft nur das ERSTE
Vorkommen im Quelltext und diktiert dadurch die Codeform anderswo.
Beschreibung: `erfuelltD13Vertrag` sucht per `indexOf` die erste
D13-Sperrbedingung und die erste Belegtprüfung und verlangt jene vor dieser.
Die Prüfung ist damit an eine Position im Quelltext gebunden, nicht an einen
benannten Handler. In F15 WS-2c musste die neue Funktion
`starteWorkflowSchritt` ihre Belegtprüfung deshalb über eine
Zwischenvariable formulieren, weil sie VOR dem Handler von
`POST /api/laeufe` steht und sonst dessen geprüftes erstes Vorkommen
verdrängt hätte. Dieselbe Falle ist bereits im Kopf von
`scripts/leitstand-server.mjs` und an der `/starten`-Route dokumentiert — sie
wirkt inzwischen an drei Stellen.
Fundstelle: `scripts/check-f11-auftrag.mjs`, `erfuelltD13Vertrag`;
`scripts/leitstand-server.mjs`, Belegtprüfung in `starteWorkflowSchritt`.
Auswirkung: Die Codeform wird von einem Textvergleich diktiert statt von der
Sache. Schlimmer: eine künftige Umstellung, die die Routen-Reihenfolge
ändert, verschiebt lautlos, WELCHER Handler geprüft wird — das Gate bleibt
grün und prüft etwas anderes.
Empfohlene Maßnahme: den geprüften Bereich per Marker eingrenzen, statt ihn
über das erste Vorkommen zu erraten — das Muster steht bereits in derselben
Datei (`teileAmAufrufMarker`). Danach entfällt die Zwischenvariable in
`starteWorkflowSchritt`. Nicht in WS-2c gemacht, weil eine Änderung an einem
fremden Sicherheits-Gate eine eigene Rot-Kalibrierung braucht.
Status: offen.
Feature/Run: F15 WS-2c (a), 10.09.2026 (Reviewer-Pass).

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

**F-217** · `TECH_DEBT` · P2 · offen
Titel: Die D13-Übergabe hängt an der Synchronität von Funktionen, die das
nicht wissen.
Beschreibung: Die Invariante aus AK6b hält nur, solange
`schreibeWorkflowFortschritt`, `ladeArtefaktVersion`, `registriereWorkflow`,
`validiereWorkflowDaten`, `loeseSchrittEingabenAuf` und
`ermittleNaechstenSchritt` synchron bleiben. Die Quelltextprüfung in
`scripts/check-f15-workflow.mjs` sieht nur die drei markierten Bereiche, nicht
deren Callees: würde eine dieser Funktionen `async`, bräche die Invariante
lautlos und kein Gate schlüge an.
Fundstelle: `scripts/leitstand-server.mjs`, `schreibeWorkflowFortschritt`
(trägt seit WS-2c eine Warnzeile in der Funktionsdoku);
`src/lineage-registry/index.ts`, `ladeArtefaktVersion`;
`src/workflow/index.ts`, `registriereWorkflow` / `validiereWorkflowDaten` /
`ermittleNaechstenSchritt` (ohne Warnzeile).
Auswirkung: Ein Umbau in `src/`, der von F15 nichts weiß, kann eine
Sicherheitszusage des Leitstands brechen, ohne dass irgendwo etwas rot wird.
Empfohlene Maßnahme: gemeinsam mit F-212 behandeln. Entweder je eine
Warnzeile an den betroffenen `src/`-Funktionen, oder — belastbarer — eine
Gate-Prüfung, die die Callees mitliest. Beides ist mehr als eine Zeile und
gehört in dieselbe Iteration wie F-212.
Status: offen.
Feature/Run: F15 WS-2c (a), 10.09.2026 (Reviewer-Pass).

**F-218** · `TECH_DEBT` · P3 · **teilweise gelöst** (Bedienweg)
Titel: Der Ausweg aus `haltGrenze` verlangt ungenannt ein Nachziehen des
Cursors.
Beschreibung: Hält `grenzen.max_schritte` die Kette an, steht der Workflow
auf `GESTOPPT` mit `aktiver_schritt_id: null`. Die neue Fassung des Menschen
muss deshalb nicht nur die Grenze anheben und den `status` setzen, sondern
zusätzlich `aktiver_schritt_id` auf den nächsten fälligen Schritt. Vergisst
er das, greift der Fallback "Cursor sonst erster Schritt der Liste" und zeigt
auf Schritt 1 — der trägt eine `lauf_id`, also 409 "Schritt 'schritt-1' ist
nicht startbereit". Die Meldung nennt den falschen Schritt und nicht die
Ursache.
Fundstelle: `src/workflow/index.ts`, Erststart-Zweig von
`ermittleNaechstenSchritt`; `features/F15/feature.md`, Tabelle
"Halte-Zustände", Zeile `GESTOPPT`.
Auswirkung: Der dokumentierte Reparaturzug funktioniert, aber nur mit einem
Schritt, den nirgends jemand nennt. Der Mensch liest eine irreführende
Fehlermeldung.
Empfohlene Maßnahme: entweder die 409-Meldung um den Hinweis auf
`aktiver_schritt_id` ergänzen, oder den Fallback bei gesetzten `lauf_id`s auf
den ersten NICHT gelaufenen Schritt zeigen lassen. Die zweite Variante ist
eine Regeländerung in einer reinen Funktion und braucht einen eigenen
Rot-Fall — deshalb nicht in WS-2c.
Nachtrag F15 WS-2c (b1), 10.09.2026 (QA-Pass): Priorität steigt faktisch von
Randfall auf Normalfall. Eine abgelehnte Freigabe setzt aktiver_schritt_id auf
null (GESTOPPT), und die korrigierte Fassung, die der Mensch danach einreicht,
muss den Cursor selbst wieder setzen — genau der Fall, in dem die irreführende
Meldung entsteht. Beim Aufgreifen mit P2 statt P3 behandeln.
Status: **gelöst für den BEDIENWEG** in F15 WS-3b, 10.09.2026 — und nur für
ihn. Der Reparaturentwurf im Leitstand belegt den Cursor vor: er bleibt, wo er
steht, und zeigt bei `null` auf den ersten Schritt ohne `lauf_id`. Damit
entsteht der Fall, in dem die irreführende 409-Meldung erscheint, auf dem
vorgesehenen Weg nicht mehr; real belegt in
`nachweis/f15-ws3b-oberflaechennachweis.md` (Fall 2, Entwurf-Cursor springt
von `null` auf `schritt-1`).
UNVERÄNDERT ist die Meldung SELBST: wer die Fassung direkt über HTTP
einreicht und den Cursor vergisst, liest weiterhin „Schritt 'schritt-1' ist
nicht startbereit" statt der Ursache. Die empfohlene Maßnahme (409-Meldung um
den Hinweis auf `aktiver_schritt_id` ergänzen) ist damit NICHT erledigt — die
Oberfläche umgeht den Fall, sie behebt ihn nicht. Wer den Endpunkt ohne
Leitstand benutzt, braucht sie weiterhin.
Feature/Run: F15 WS-2c (a), 10.09.2026 (QA-Pass); Bedienweg gelöst F15 WS-3b, 10.09.2026.

**F-219** · `TECH_DEBT` · P3 · offen
Titel: Eine Reparaturfassung kann die `vorgaengerLaufId`-Kette still
verlieren.
Beschreibung: Der Lineage-Vorgänger eines Schritts entsteht aus
"nachfolger === schritt_id und lauf_id !== null". Setzt der Mensch in einer
korrigierten Fassung alle Schritte auf `OFFEN` mit `lauf_id: null` — die
naheliegende Geste, wenn er "von vorn" meint —, startet ein späterer Schritt
ohne `vorgaengerLaufId`. Kein Fehler, keine Warnung, aber der Verweis aus
F8/F13 fehlt für diesen Übergang.
Fundstelle: `scripts/leitstand-server.mjs`, `gelaufeneVorschritte` in
`starteWorkflowSchritt`.
Auswirkung: gering im Ergebnis, aber mit WS-2c wird die Reparatur mitten in
der Kette zum Normalfall — der Fall geht von theoretisch nach wahrscheinlich.
Empfohlene Maßnahme: in WS-3 (AK8) prüfen, ob die Ansicht beim Einreichen
einer Fassung auf verlorene Vorgängerverweise hinweisen soll. Kein
Serverzwang: ein Neustart von vorn ist eine zulässige menschliche
Entscheidung.
Nachtrag F15 WS-3b, 10.09.2026: SICHTBAR GEMACHT, NICHT GELÖST — und der
Unterschied ist Absicht. Der Reparaturentwurf im Leitstand warnt namentlich,
welcher Schritt seine `lauf_id` verliert und für welchen Folgeschritt damit
der `vorgaengerLaufId`-Verweis ausfällt (real belegt in
`nachweis/f15-ws3b-oberflaechennachweis.md`, Fall 2). Verhindert wird nichts:
die Prüfung dieses Befunds war „soll die Ansicht hinweisen?", und die Antwort
ist ja — der Zwang bleibt aus, weil ein Neustart von vorn eine zulässige
Entscheidung ist. Der Befund bleibt OFFEN, solange nicht entschieden ist, ob
der Verweis stattdessen erhalten werden soll.
Status: offen (Hinweis gebaut, Ursache unverändert).
Feature/Run: F15 WS-2c (a), 10.09.2026 (QA-Pass); Hinweis F15 WS-3b, 10.09.2026.

**F-220** · `TECH_DEBT` · P3 · offen
Titel: Die F4-Startfreigabe-Fixture liegt jetzt doppelt im Repo.
Beschreibung: `scripts/check-f15-automat-real.mjs` übernimmt rund hundert
Zeilen Fixture-Aufbau (Wegwerf-Git-Repo, Baseline, Wirksamkeitsnachweis,
Autorisierungsreferenz, Test-Startvorlage, Testserver) fast wörtlich aus
`scripts/check-f14-abbruch.mjs`. Der Dateikopf nennt das "D5, kein zweiter
Regelsatz" — zutreffend ist das Gegenteil: es IST der zweite.
Fundstelle: `scripts/check-f15-automat-real.mjs` gegen
`scripts/check-f14-abbruch.mjs`.
Auswirkung: Ändert sich F4s Nachweisformat, müssen zwei Gates nachgezogen
werden, und das zweite ist das, das vergessen wird. Verstoß gegen CLAUDE.md
("Bestehende Helper NUTZEN, nicht neu schreiben").
Empfohlene Maßnahme: `scripts/testhilfen/startfreigabe-fixture.mjs` mit
Präfix-Parameter, beide Gates darauf umstellen. Eigene, kleine Iteration —
ein Umbau am Fixture zweier realer Ende-zu-Ende-Gates gehört nicht in
denselben Commit wie die Funktion, die sie prüfen sollen.
Status: offen.
Feature/Run: F15 WS-2c (a), 10.09.2026 (Reviewer-Pass).

**F-221** · `TECH_DEBT` · P4 · offen
Titel: Zwei Restlücken am Rand des Automaten-Startpfads.
Beschreibung: (a) `GET /api/workflows` führt das neue Feld `grund` nicht mit
(`baueWorkflowKopfdaten`) — die Liste zeigt `KLAERUNG_ERFORDERLICH` ohne
Grund, nur der Detailendpunkt hat ihn. (b) Würfe `fuehreAufgabeDurchFn`
SYNCHRON statt ein abgelehntes Promise zu liefern, bliebe `laufAktiv` auf
true stehen (der `.then`/`.catch`-Reset wird nie angehängt, der Wurf endet im
try/catch der Nachbereitung) — D13 wäre bis zum Serverneustart blockiert.
Fundstelle: (a) `scripts/leitstand-server.mjs`, `baueWorkflowKopfdaten`;
(b) ebenda, Fire-and-forget-Block.
**F-222** · `TECH_DEBT` · P2 · **gelöst**
entscheiden, nicht hier. (b) ist mit einer `async`-Funktion unerreichbar —
`fuehreAufgabeDurch` ist eine, und nur eine Testattrappe könnte es verletzen.
Empfohlene Maßnahme: (a) in WS-3 mitentscheiden. (b) keine — dokumentiert,
damit ein künftiger Umbau des Aufrufvertrags den Fall kennt.
Status: (a) **gelöst** in F15 WS-3a — `baueWorkflowKopfdaten` führt `grund`,
die Workflow-Liste im Leitstand zeigt ihn als eigene Zeile. Als Vertrag in
`scripts/check-f15-workflow.mjs` festgehalten (Kopfdaten nach einem Stopp
tragen die Begründung des Menschen), rot kalibriert durch Entfernen des
Feldes aus der Projektion. (b) unverändert offen.
Feature/Run: F15 WS-2c (a), 10.09.2026 (Reviewer-/QA-Pass); (a) gelöst F15 WS-3a, 10.09.2026.

**F-222** · `TECH_DEBT` · P2 · offen
Titel: Freigabe und Ablehnung sind nur über HTTP erreichbar, die
Leitstand-Ansicht kennt sie nicht.
Beschreibung: F15 WS-2c (b1) baut POST /api/workflows/<id>/freigabe und
belegt ihn real — aber `public/leitstand/` zeigt weder den
WARTET_FREIGABE-Halt als Handlungsaufforderung noch eine Bedienung dafür.
Wer heute freigeben will, braucht curl und die schritt_id aus dem
Detail-Endpunkt.
Fundstelle: `public/leitstand/app.js` gegen
`scripts/leitstand-server.mjs`, POST /api/workflows/<id>/freigabe.
Auswirkung: Der Governance-Fall ist mechanisch vollständig und praktisch
nicht bedienbar. Für die Gates und für AK7 ist das folgenlos (beide gehen
über HTTP), für AK8/AK10 nicht: ein Ende-zu-Ende-Nachweis "über den
Leitstand" ist ohne Bedienelement keiner.
Empfohlene Maßnahme: In WS-3 (AK8) zusammen mit der Schrittliste bauen —
dort ist ohnehin zu entscheiden, wie ein Halt angezeigt wird. Kein
Nachtrag zu (b1): eine Bedienung ohne die übrige Workflow-Ansicht wäre ein
Knopf ohne Kontext.
Status: **gelöst** in F15 WS-3b, 10.09.2026. Der Bedienblock im
Workflow-Detail bietet „Freigeben" und „Ablehnen" mit Pflichtbegründung an,
sobald der Server `naechster.art === 'haltFreigabe'` meldet — die schritt_id
kommt aus derselben Antwort, nicht aus einer Eingabe des Menschen. Kein curl
mehr nötig. Real belegt in `nachweis/f15-ws3b-oberflaechennachweis.md`
(Fall 1).
Feature/Run: F15 WS-2c (b1), 10.09.2026; gelöst F15 WS-3b, 10.09.2026.

**F-223** · `TECH_DEBT` · P3 · offen
Titel: Eine neue Fassung verwirft alle erteilten Freigaben stillschweigend.
Beschreibung: POST /api/workflows normalisiert `schritte[].freigabe_erteilt`
aus dem Body weg (nötig, sonst erteilte sich eine eingereichte Fassung die
Freigabe selbst — siehe F-207). Folge: reicht der Mensch nach einem Halt eine
korrigierte Fassung ein, verliert ein bereits freigegebener, aber noch nicht
gelaufener Schritt seine Freigabe und hält erneut an. Die Wirkung ist die
sichere Richtung, aber der Server sagt es nirgends — weder in der Antwort noch
im Artefakt.
Fundstelle: `scripts/leitstand-server.mjs`, POST /api/workflows
(`koerperOhneFreigaben`).
Auswirkung: Heute schmal: eine Freigabe startet den Schritt sofort, das
Zeitfenster zwischen Freigabe und Lauf ist ein Tick. Erreichbar wird der Fall,
sobald eine Freigabe den Schritt NICHT sofort startet (z. B. D13 belegt, oder
ein Vorrat an Freigaben in WS-3).
Empfohlene Maßnahme: Zusammen mit F-219 entscheiden (dieselbe Klasse: eine
Reparaturfassung verliert still etwas, dort die vorgaengerLaufId-Kette, hier die
Freigabe), ob die Antwort auf verworfene Felder hinweist. Kein eigener Zug.
Nachtrag F15 WS-3b, 10.09.2026: SICHTBAR GEMACHT, NICHT GELÖST. Der
Reparaturentwurf warnt namentlich, für welche Schritte eine erteilte, aber
noch nicht verbrauchte Freigabe beim Einreichen verworfen wird. Die
Normalisierung selbst bleibt unverändert — sie MUSS bleiben, sonst erteilte
sich eine eingereichte Fassung ihre Freigabe selbst (F-207). Der Hinweis
steht in der Oberfläche, NICHT in der Serverantwort; wer über HTTP einreicht,
erfährt weiterhin nichts. Deshalb offen.
Status: offen (Hinweis in der Oberfläche, Serverantwort unverändert).
Feature/Run: F15 WS-2c (b1), 10.09.2026; Hinweis F15 WS-3b, 10.09.2026.

**F-224** · `TECH_DEBT` · P3 · offen
Titel: Die Artefakt-ID einer Workflow-Freigabe ist nicht eindeutig zerlegbar.
Beschreibung: `entscheidung-workflow-<workflowId>-<schrittId>` setzt zwei vom
Menschen gewählte Strings ohne Trennzeichenregel zusammen. `workflow_id: 'a'`
mit `schritt_id: 'b-c'` erzeugt dieselbe ID wie `workflow_id: 'a-b'` mit
`schritt_id: 'c'`. Beide Entscheidungen landen dann in derselben
Lineage-Kette; wer ohne Versionsangabe lädt, bekommt die des anderen
Workflows.
Fundstelle: `scripts/leitstand-server.mjs`, POST /api/workflows/<id>/freigabe
(Artefakt-ID der Entscheidung).
Auswirkung: Gering und nur bei gleichzeitig gewählten, kollidierenden IDs. Die
Entscheidung selbst geht nicht verloren (append-only, jede Version bleibt
lesbar), aber ein Leser ordnet sie dem falschen Workflow zu. Dieselbe Klasse,
aus der `schritte[].eingaben` und `workflow_id` ihre Zeichenregeln bekommen
haben.
Empfohlene Maßnahme: Entweder eine Zeichenregel für `schritt_id` (kein '-' in
der ID, oder eine Längenkodierung), oder die Entscheidung als eigene Version
unter `entscheidung-workflow-<workflowId>` mit `schritt_id` im Inhalt führen.
Nicht in (b1) entschieden, weil es das Artefaktlayout betrifft und die
bestehenden F13-Entscheidungen (`entscheidung-<laufId>`) mitbedacht werden
sollten.
Status: offen.
Feature/Run: F15 WS-2c (b1), 10.09.2026 (Reviewer-Pass V3, QA-Pass Fehler 5).

**F-225** · `TECH_DEBT` · P3 · offen
Titel: `entscheidung_schema: 'v0'` behauptet ein Schema, das es nicht gibt.
Beschreibung: Sowohl die F13-Entscheidungen (`terminal`, `kenntnisnahme`) als
auch die neue Workflow-Freigabe schreiben `entscheidung_schema: 'v0'` in ihre
Nutzdaten. Unter `schemas/` existiert dafür keine Datei, und keine Funktion
prüft die Form — anders als bei AUFTRAG_V0, WORKFLOW_V0, BEDARF_V0.
Fundstelle: `scripts/leitstand-server.mjs`, POST /api/entscheidungen
(terminal/kenntnisnahme) und POST /api/workflows/<id>/freigabe.
Auswirkung: Kein heutiger Defekt — die Felder werden nur geschrieben, nie
gelesen. Aber ein Schemaname ohne Schema ist eine Zusage, auf die sich
niemand verlassen kann, und WS-3 will diese Artefakte anzeigen.
Empfohlene Maßnahme: Mit der Leitstand-Ansicht (AK8) zusammen entscheiden —
entweder ein `schemas/kontrollzustand-entscheidung-payload.schema.json` plus
Validator (dann für BEIDE Erzeuger, nicht nur den neuen), oder das Feld
streichen. Kein Nachtrag zu (b1): der neue Endpunkt hat das Muster geerbt,
nicht erfunden.
Status: offen.
Feature/Run: F15 WS-2c (b1), 10.09.2026 (QA-Pass Fehler 5).

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

**F-229** · `TECH_DEBT` · P3 · offen
Titel: Der Freigabe-Endpunkt hat als einziger Schreibpfad kein
Formular-Prüfobjekt.
Beschreibung: `POST /api/auftraege`, `POST /api/entscheidungen` und
`POST /api/laeufe` prüfen ihren Body über eine exportierte, reine Funktion
(`pruefeAuftragsformular`, `pruefeEntscheidungsformular`,
`pruefeStartauftrag`), die einzeln testbar ist und unbekannte Felder ablehnt.
Der Freigabe-Endpunkt prüft stattdessen inline an fünf Stellen und lässt
unbekannte Body-Felder stumm durch.
Fundstelle: `scripts/leitstand-server.mjs`, POST
/api/workflows/<id>/freigabe. WS-2c (b2) ergänzt eine zweite Fundstelle
derselben Art: `POST /api/workflows/<id>/stoppen` prüft `begruendung`
ebenfalls inline und lässt unbekannte Body-Felder stumm durch. Der Befund
umfasst seither beide Endpunkte — `pruefeFreigabeFormular` und
`pruefeStoppFormular` gehören in dieselbe Iteration.
Auswirkung: Kein Defekt — jede einzelne Prüfung hat ihren Rot-Fall im Gate.
Aber ein Tippfehler im Feldnamen (`begründung` statt `begruendung`) meldet
sich als „Pflichtfeld fehlt" statt als „unbekanntes Feld", und die
Prüfreihenfolge ist nur im Handler nachvollziehbar. Verstoß gegen D5 und
gegen CLAUDE.md („bestehende Helper nutzen").
Empfohlene Maßnahme: `pruefeFreigabeFormular(body)` neben die drei anderen
stellen und exportieren. Eigene kleine Iteration; die Prüfreihenfolge ändert
sich dabei (Formfehler vor Sachfehler), was die Gate-Erwartungen berührt.
Status: offen.
Feature/Run: F15 WS-2c (b1), 10.09.2026 (Reviewer-Pass, V4).

**F-230** · `TECH_DEBT` · P3 · offen
Titel: Scheitert das Festschreiben eines Halts, bleibt der Workflow
zugemauert.
Beschreibung: `schreibeStartfehlerHalt` protokolliert einen fehlgeschlagenen
Halt-Schreibvorgang nur. Danach steht der Workflow auf `LAEUFT` ohne Schritt
auf `LAEUFT`: die Stale-Heilung greift nicht (sie verlangt einen SCHRITT auf
`LAEUFT`), und eine neue Fassung ist gesperrt, weil `LAEUFT` in
`GESPERRTE_ERSETZUNGS_STATUS` steht.
Fundstelle: `scripts/leitstand-server.mjs`, `schreibeStartfehlerHalt`.
Auswirkung: Sehr schmal — der Schreibvorgang scheitert nur bei einem
I/O-Fehler oder wenn der Datensatz zwischenzeitlich ungültig wurde. Dieselbe
Zustandsklasse, die die Funktion selbst verhindern soll.
Empfohlene Maßnahme: Entweder die Stale-Heilung auf „Workflow LAEUFT, aber
KEIN Schritt auf LAEUFT" erweitern (dann heilt der nächste Startversuch auch
diesen Fall), oder den Zustand ausdrücklich in der Halte-Zustands-Tabelle
führen. Die erste Variante ist eine Regeländerung und braucht einen eigenen
Rot-Fall.
Status: offen.
Feature/Run: F15 WS-2c (b1), 10.09.2026 (Reviewer-Pass, V3).

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

**F-232** · `TECH_DEBT` · P3 · offen
Titel: Die Reihenfolge-Zusage des Stopps ist eine Quelltextzusage, wie schon
die AK6b-Invariante.
Beschreibung: „Zuerst GESTOPPT schreiben, dann abbrechen" ist die tragende
Regel des Stopp-Endpunkts, aber verhaltensmäßig nicht ansteuerbar: beide
Schritte liegen in EINEM synchronen Block, und der Rückruf des abgebrochenen
Laufs kann frühestens im nächsten Microtask feuern. Vertauscht man sie,
bleiben alle Verhaltensfälle grün — real geprüft, nur die Quelltextprüfung
`STOPP-REIHENFOLGE` wurde rot. Damit hängt eine zweite Sicherheitszusage von
F15 an einem `indexOf` im Quelltext.
Fundstelle: `scripts/leitstand-server.mjs`, Bereich `STOPP-REIHENFOLGE`;
`scripts/check-f15-workflow.mjs`, gleichnamige Prüfung. Dieselbe Klasse wie
F-212 (AK6b-Invariante).
Auswirkung: Kein Defekt heute. Aber die Prüfung sieht, wie die
AK6b-Invariante, nur den markierten Bereich und nicht seine Callees: würde
`schreibeWorkflowFortschritt` je asynchron, wäre die Reihenfolge real
verletzbar und die Textprüfung bliebe grün.
Zwei Nachträge aus dem Reviewer-/QA-Pass vom 10.09.2026, beide dieselbe Klasse:
(1) Die Strecke LADEN→SCHREIBEN im Stopp-Endpunkt ist gar nicht markiert.
`STOPP-REIHENFOLGE` deckt schreiben→abbrechen ab; dass zwischen
`ladeArtefaktVersion` und `schreibeWorkflowFortschritt` kein `await` liegt,
trägt aber die Zusagen „ein abgelehnter Stopp schreibt nichts" und „der
eingefroren-Zweig ist unerreichbar". Beim Freigabe-Endpunkt ist genau diese
Strecke als Bereich markiert und begründet, beim Stopp nicht.
(2) Der `eingefroren`-Rücksetzer in `starteWorkflowSchritt` leitet seine
Workflow-Felder aus dem bei Funktionseintritt geladenen `workflowDaten` ab.
Der Ausdruck wird heute nie ausgewertet (der Schutz greift), aber der Code
sieht den Zweig vor und würde darin einen veralteten Status über den neueren
Stand des Menschen schreiben — gemeldet erst NACH dem Schreibvorgang.
Empfohlene Maßnahme: gemeinsam mit F-212 und F-217 behandeln — es ist
viermal dieselbe Frage (eine Synchronitätsannahme, die kein Gate mitliest).
Für (2) zusätzlich: im nicht-eingefrorenen Fall gar nicht schreiben oder die
Felder aus `datenMitSchritt` ableiten statt aus dem Eintrittsstand.
Status: offen.
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

**F-234** · `TECH_DEBT` · P3 · offen
Titel: `laufAbgebrochen: false` ist mehrdeutig — es heißt nicht, dass nichts
läuft.
Beschreibung: Die Antwort des Stopp-Endpunkts unterscheidet zwei Fälle nicht:
„es lief gar nichts" und „es lief etwas, aber es gehörte nicht zu diesem
Workflow" (ein Lauf aus `POST /api/laeufe`, oder D13 ist von einem anderen
Workflow belegt). Beide antworten `200 { laufAbgebrochen: false }`.
Fundstelle: `scripts/leitstand-server.mjs`, Antwort von
`POST /api/workflows/<id>/stoppen`.
Auswirkung: Der Mensch stoppt, liest `false` und schließt daraus, es laufe
nichts mehr — während ein fremder Arbeitsstrang weiterläuft. Der Workflow ist
korrekt gestoppt, die Aussage der Antwort ist es nicht.
Zwei Nachträge aus dem Reviewer-/QA-Pass vom 10.09.2026:
(1) Ein dritter Fall fällt in dasselbe `false`: hat der Mensch nach dem Stopp
eine Reparaturfassung eingereicht, während der alte Lauf noch fliegt, trägt
kein Schritt mehr `LAEUFT` mit dessen `lauf_id` — ein erneuter Stopp findet
den Lauf am Artefakt nicht mehr und bricht ihn nicht ab. Die Ableseregel ist
richtig (raten wäre schlimmer), aber die Notbremse deckt diesen Fall nicht;
der Ausweg ist `POST /api/laeufe/<laufId>/abbrechen`.
(2) Die 200-Antwort trägt — anders als der Schwesterendpunkt `/freigabe`, für
den F15 „ein Endpunkt, ein Antwortschnitt" ausdrücklich begründet — KEIN
`status: 'GESTOPPT'`, und ihre `versionSequenz` ist die des
Entscheidungsartefakts, nicht die der neuen Workflow-Version. Solange der
Endpunkt von Hand bedient wird (AK8 offen), erzwingt das eine Rückfrage per
`GET /api/workflows/<id>` ohne Not.
Nachtrag F15 WS-3a, 10.09.2026: NICHT gelöst. Der Auftrag für WS-3a las
F-234 als „der aktive Lauf muss in der Ansicht erkennbar sein" — das ist
gebaut (die Schrittliste markiert den Schritt, dessen `lauf_id` der Server
über `GET /api/laeufe/<laufId>` als `aktiv` meldet, ohne Serveränderung),
aber es ist eine ZWEITE, unabhängige Auskunft neben der Stopp-Antwort und
ändert deren Mehrdeutigkeit nicht. Wer `laufAbgebrochen: false` liest, liest
weiterhin drei Fälle als einen. Die Ansicht senkt nur den Preis: der Mensch
kann jetzt nachsehen, statt raten zu müssen. Siehe auch F-248 (dieselbe
Mehrdeutigkeit in der Markierung selbst).
Empfohlene Maßnahme: Ein zusätzliches Feld in der 200-Antwort, das den Grund
nennt (`kein aktiver Lauf` / `aktiver Lauf gehört nicht zu diesem Workflow` /
`zugehöriger Lauf am Artefakt nicht mehr auffindbar`), plus `status` und die
Workflow-`versionSequenz` im Antwortschnitt — oder, belastbarer, die Frage der
WS-3-Ansicht überlassen, die den aktiven Lauf ohnehin anzeigt. Erst mit AK8
entscheidbar.
Status: offen.
Feature/Run: F15 WS-2c (b2), 10.09.2026.

**F-235** · `TECH_DEBT` · P3 · offen
Titel: `schreibeWorkflowFortschritt` hat sieben Positionsparameter, davon
zwei stumme.
Beschreibung: Die Funktion nimmt inzwischen `workflowId`, `schrittId`
(seit (b2) auch `null`), `schrittFelder`, `leiteWorkflowFelderAb`,
`profilReferenz`, `ladeOptionen` und `erwarteteLaufId`. An sechs der acht
Aufrufstellen stehen `{}` und ein Pfeil-Ausdruck nebeneinander, und die
Bedeutung von `null` als zweitem Argument ist ohne Blick auf die Signatur
nicht erkennbar. `erwarteteLaufId` steht an genau einer Aufrufstelle und ist
an den übrigen sieben unsichtbar — dass die Identitätsprüfung „nur in der
Nachbereitung" gilt, sieht man dem Aufrufort nicht an.
Fundstelle: `scripts/leitstand-server.mjs`, `schreibeWorkflowFortschritt` und
seine acht Aufrufstellen.
Auswirkung: Kein Defekt — jede einzelne Regel hat ihren Rot-Fall. Aber die
nächste Erweiterung fügt ein achtes Positionsargument hinzu, und ein
vertauschtes Argumentpaar fiele nur auf, wenn ein Gate zufällig danebenliegt.
Verstoß gegen dieselbe Lesbarkeitsregel, die F-229 beim Freigabe-Endpunkt
benennt.
Empfohlene Maßnahme: Auf ein Optionsobjekt umstellen
(`{ workflowId, schrittId, schrittFelder, leiteWorkflowFelderAb,
erwarteteLaufId }`) — eine mechanische Änderung an acht Stellen, die aber die
Zählungen im Gate berührt und deshalb eine eigene Iteration braucht.
Status: offen.
Feature/Run: F15 WS-2c (b2), 10.09.2026.

**F-236** · `TECH_DEBT` · P3 · offen
Titel: `check-f14-abbruch.mjs` hinterlässt bei einem fehlgeschlagenen Abbruch
einen verwaisten Kindprozess.
Beschreibung: Bei der Prüfung zu F-231 wurde die Hänge-Lücke in
`scripts/check-f14-abbruch.mjs` ausdrücklich WIDERLEGT — die Datei endet über
`process.exit()` und kehrt deshalb auch bei einem offenen Handle zurück, und
ihre Wartefunktionen sind mit 20 Sekunden begrenzt. Ein Rest bleibt aber: der
Block (b) startet einen Kindprozess über `HAENGE_SKRIPT`, der ausschließlich
durch den geprüften Abbruch endet. Wirkt der Abbruch nicht, meldet das Gate
korrekt einen Befund und beendet sich — der Kindprozess überlebt das,
`process.exit()` beendet unter Windows keine Kindprozesse. Zurück bleibt eine
`node.exe`, die niemand mehr kennt.
Fundstelle: `scripts/check-f14-abbruch.mjs`, Block (b) und seine
`finally`-Routine (nur `schliessen()`, kein Abbruch des Laufs).
Auswirkung: Kein falsches Gate-Ergebnis — der Befund kommt, der Exit-Code
stimmt. Aber jeder rote Lauf hinterlässt einen Prozess, der bis zum
Neustart lebt. Bei wiederholter Fehlersuche summiert sich das, und die
Ursache ist von außen nicht erkennbar.
Empfohlene Maßnahme: `beendeLaufFallsAktiv` aus
`scripts/check-f15-automat-real.mjs` übernehmen (dieselbe Aufrufform, D5) und
in der `finally`-Routine von Block (b) vor `schliessen()` aufrufen. Bewusst
NICHT in dieser Iteration mitgezogen: `check-f14-abbruch.mjs` gehört zu F14,
ist unverändert grün, und eine Änderung dort ohne eigenen Rot-Fall wäre die
Art Nebenbei-Korrektur, gegen die F-046 sich richtet.
Status: offen.
Feature/Run: F15 WS-2c (b2, Auflage 1), 10.09.2026.

**F-237** · `TECH_DEBT` · P4 · offen
Titel: Der Gate-Wachhund kann einen langsamen Rechner nicht von einem
überlebenden Kindprozess unterscheiden.
Beschreibung: Feuert der Wachhund in `scripts/check-f15-automat-real.mjs`,
meldet er „vermutlich überlebender Kindprozess". Das ist eine Vermutung und
als solche formuliert: derselbe Timer schlägt auch an, wenn die Maschine so
belastet ist, dass die realen Läufe die Frist überschreiten. Die Frist ist
mit fünf Minuten gegen zehn Sekunden reale Laufzeit sehr großzügig gewählt,
aber sie ist eine feste Zahl im Quelltext.
Fundstelle: `scripts/check-f15-automat-real.mjs`, `WACHHUND_FRIST_MS`.
Auswirkung: Ein falsch-roter Lauf ist möglich und würde als Kindprozess-Leck
gelesen. Die sichere Richtung (lieber rot als hängend) ist gewahrt, aber die
Meldung könnte in die Irre führen.
Empfohlene Maßnahme: Beim Feuern zusätzlich ausgeben, welche Blöcke bereits
durchgelaufen sind (Zahl der bisherigen Erfolgsmeldungen) — dann ist am
Ausgabetext ablesbar, ob die Datei kurz vor dem Ende hing oder mitten im
Testlauf. Eine Zeile, aber sie gehört zu einer Iteration, die den Wachhund
ohnehin anfasst.
Status: offen.
Feature/Run: F15 WS-2c (b2, Auflage 1), 10.09.2026.

**F-238** · `TECH_DEBT` · P3 · offen
Titel: Der `bezeugt: false`-Zweig des Stopps hat keinen Rot-Fall.
Beschreibung: Scheitert `registriereKernArtefakt` im Stopp-Endpunkt, bleibt
der Stopp gültig, ein Startfehlereintrag entsteht, und die 200-Antwort trägt
`bezeugt: false` mit Grund (F-233). Dieser Zweig ist über die HTTP-Oberfläche
nicht ansteuerbar: `workflowId` ist zu dem Zeitpunkt bereits gegen die
Zeichenregel geprüft, und ein I/O-Fehler von F2 lässt sich ohne
Fehlerinjektion nicht auslösen. Er ist damit gebaut, aber unbelegt — dieselbe
Klasse wie die F-228-Behandlung, nur ohne die Quelltextzählung, die dort den
Ersatznachweis trägt.
Fundstelle: `scripts/leitstand-server.mjs`, `catch`-Zweig der Bezeugung in
`POST /api/workflows/<id>/stoppen`.
Auswirkung: Gering — der Zweig ist vier Zeilen und schreibt nichts. Aber die
Zusage „ein stiller Verlust ist ausgeschlossen" hängt an ungeprüftem Code,
und `ARCHITECTURE.md` §8 verlangt, das nicht als erzwungene Grenze zu
behaupten.
Empfohlene Maßnahme: Entweder eine Fehlerinjektion für den F2-Schreibpfad
vorsehen (eine Testnaht, die es heute nicht gibt und die weitere Fragen
aufwirft), oder den Zweig ausdrücklich als unbelegt in `features/F15/
feature.md` führen. Gemeinsam mit F-228 behandeln — es ist dieselbe Frage:
was tun mit einer Zusage, zu der kein Verhaltensweg führt.
Status: offen.
Feature/Run: F15 WS-2c (b2, Auflage 2), 10.09.2026.

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

**F-241** · `TECH_DEBT` · P3 · offen
Titel: Ein ungültiger Bestandsdatensatz lässt sich nicht stoppen.
Beschreibung: Der Stopp-Endpunkt verlangt `validiereWorkflowDaten`-
Gültigkeit (409), und `schreibeWorkflowFortschritt` validiert zusätzlich das
Ergebnis vor dem Schreiben. Ein Workflow, dessen abgelegte Fassung durch eine
nachträglich verschärfte Querverweisregel ungültig geworden ist, lässt sich
damit nicht anhalten — während er für die ERSETZUNG ausdrücklich in jedem
Status offen bleibt (`bestandUngueltig`-Ausnahme in `POST /api/workflows`).
Fundstelle: `scripts/leitstand-server.mjs`, Prüfung (1) im Stopp-Endpunkt.
Auswirkung: Sehr schmal — der Startendpunkt validiert ebenfalls, ein solcher
Workflow kann also kaum laufen. Aber die Zusage „Bremse für den Workflow"
gilt dort nicht, und fliegt doch ein Lauf, bleibt nur
`POST /api/laeufe/<laufId>/abbrechen`.
Nachtrag F15 WS-3a, 10.09.2026: NICHT gelöst, und eine Klarstellung. Der
Auftrag für WS-3a ordnete F-241 dem DETAILendpunkt zu („beantwortet mit
409") — dieser Befund betrifft ausschließlich den STOPP-Endpunkt. Der
Detailendpunkt validiert überhaupt nicht und antwortet immer mit 200; das ist
als eigener Befund F-247 festgehalten. Die Ansicht trägt seit WS-3a einen
benannten Zustand „Fassung ungültig" (409-Zweig plus clientseitige
Formprüfung), der Stopp-Endpunkt ist unverändert.
Empfohlene Maßnahme: Prüfen, ob der Stopp die Gültigkeitsprüfung überhaupt
braucht — er schreibt nur Workflow-Felder und liest die Schrittliste; oder die
`bestandUngueltig`-Ausnahme aus `POST /api/workflows` sinngemäß übernehmen.
Beides ist eine Regeländerung und braucht einen eigenen Rot-Fall.
Status: offen.
Feature/Run: F15 WS-2c (b2), 10.09.2026 (Reviewer-Pass, Befund 3).

**F-242** · `TECH_DEBT` · P4 · offen
Titel: Der Stopp-Endpunkt trägt mehr Kommentar als Code, darunter Korrekturen
früherer Kommentarfassungen.
Beschreibung: Rund 60 Kommentarzeilen auf etwa 50 Zeilen Code, mit Absätzen,
die frühere Fassungen DESSELBEN Kommentars richtigstellen (die D2-Glosse, der
GESTOPPT-Schutz, der Wachhund). Die Sachaussagen stimmen — im Reviewer-Pass
einzeln geprüft —, aber Review-Historie gehört nach `features/F15/feature.md`
bzw. hierher, wo sie ohnehin steht.
Fundstelle: `scripts/leitstand-server.mjs`, `POST /api/workflows/<id>/stoppen`
und `schreibeWorkflowFortschritt`.
Auswirkung: Im Server erhöht die Masse die Wahrscheinlichkeit genau der Drift,
gegen die sie geschrieben ist — der Reviewer-Pass hat dafür im selben Zug ein
Beispiel gefunden (die Behauptung „bei GESTOPPT läuft nichts mehr", die für
die Sekunden nach einem Stopp mitten im Schritt falsch war).
Empfohlene Maßnahme: Als Leitplanke für WS-3 vormerken, nicht rückwirkend
ausdünnen: eine Kommentarkürzung ohne Anlass ist ein Diff ohne Nachweis.
Status: offen.
Feature/Run: F15 WS-2c (b2), 10.09.2026 (Reviewer-Pass, Befund 7).

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

**F-244** · `TECH_DEBT` · P3 · offen
Titel: Die Abschwächungserkennung und `ermittleNaechstenSchritt` lesen
`freigabe` in entgegengesetzter Richtung.
Beschreibung: `ermittleNaechstenSchritt` prüft `freigabe` als ALLOWLIST — nur
was in `AUTOMATISCH_STARTENDE_FREIGABE` steht, startet automatisch; ein
künftiger vierter Wert fällt in „hält an". `ermittleFreigabeAbschwaechungen`
aus (b3) prüft dieselbe Eigenschaft umgekehrt: alles, was nicht `ZWINGEND`
ist, gilt als Abschwächung. Beide Richtungen sind je für sich die sichere —
„hält an" bzw. „wird bezeugt" —, aber sie sind gegenläufig, und das steht nur
in den Kommentaren der beiden Funktionen, nirgends an einer Stelle zusammen.
Ein vierter Wert, etwa `ZWINGEND_MIT_VIER_AUGEN`, wäre nach der einen Regel
nicht automatisch startend (richtig) und nach der anderen eine Abschwächung
gegenüber `ZWINGEND` (falsch, es ist eine Verschärfung) — die Folge wäre eine
Begründungspflicht ohne Anlass, also die harmlose Richtung, aber eine, die
niemand erwartet.
Fundstelle: `src/workflow/index.ts`, `AUTOMATISCH_STARTENDE_FREIGABE`;
`scripts/leitstand-server.mjs`, `ermittleFreigabeAbschwaechungen`.
Auswirkung: Heute keine — `FREIGABE` hat genau drei Werte, und beide Regeln
liefern für alle drei dasselbe. Der Unterschied zeigt sich erst bei einer
Erweiterung, und dann an einer Stelle, an die niemand denkt.
Empfohlene Maßnahme: Eine gemeinsame, geordnete Definition der
Freigabestufen in `src/workflow/index.ts` (welche Stufe ist strenger als
welche), aus der beide Regeln ihre Antwort ziehen — dann ist „Abschwächung"
ein Vergleich statt zweier Aufzählungen. Gehört in dieselbe Iteration wie eine
etwaige vierte Stufe, nicht davor.
Status: offen.
Feature/Run: F15 WS-2c (b3), 10.09.2026.

**F-245** · `TECH_DEBT` · P3 · offen
Titel: `begruendung` in `POST /api/workflows` wird still verworfen, wenn keine
Abschwächung vorliegt.
Beschreibung: Damit das Feld überhaupt transportierbar ist, wird es vor
`validiereWorkflowDaten` aus dem Rumpf gelöst (das Schema ist
`additionalProperties: false`). Liegt keine Abschwächung vor, verschwindet es
damit spurlos — vorher wäre derselbe Rumpf mit 400 „unbekanntes Feld
'begruendung'" abgelehnt worden. Die Behandlung ist dieselbe wie bei `grund`
und `freigabe_erteilt` (beide werden ebenfalls still normalisiert), aber bei
denen ist das Verwerfen die SCHUTZWIRKUNG; hier ist es nur Bequemlichkeit.
Fundstelle: `scripts/leitstand-server.mjs`, Herauslösen von `begruendung` in
POST /api/workflows.
Auswirkung: Gering und in die harmlose Richtung. Wer aus Gewohnheit immer eine
Begründung mitschickt, bekommt keine Rückmeldung, dass sie diesmal nirgends
gelandet ist — und könnte glauben, jede seiner Planänderungen sei bezeugt.
Empfohlene Maßnahme: Gemeinsam mit F-229 (Formular-Prüfobjekte) behandeln: ein
`pruefeWorkflowFormular`, das Transportfelder von Schemafeldern trennt und
unbekannte Felder weiterhin ablehnt. Alternativ die 201-Antwort um ein
ausdrückliches `bezeugt: false` ergänzen, wenn eine Begründung kam, aber keine
Abschwächung vorlag.
Status: offen.
Feature/Run: F15 WS-2c (b3), 10.09.2026.

**F-246** · `TECH_DEBT` · P3 · offen
Titel: Die Bezeugung einer Planänderung ist an die schritt_id gebunden — ein
umbenannter Schritt entgeht ihr.
Beschreibung: `ermittleFreigabeAbschwaechungen` paart alte und neue Fassung
über die `schritt_id`. Wird ein `ZWINGEND`-Schritt in derselben Fassung
UMBENANNT und dabei abgeschwächt, sieht die Regel zwei Vorgänge: der alte
Schritt entfällt (Treffer, wird bezeugt) und ein neuer kommt hinzu (kein
Treffer). Das Ergebnis ist richtig — es wird bezeugt —, aber der Text nennt
den alten Namen und sagt „Schritt entfällt", obwohl er unter neuem Namen
weiterlebt. Der Mensch liest damit eine irreführende Beschreibung dessen, was
er gerade tut.
Fundstelle: `scripts/leitstand-server.mjs`,
`ermittleFreigabeAbschwaechungen`.
Auswirkung: Keine Umgehung — die Pflicht greift in beiden Fällen. Nur die
Meldung und der Artefaktinhalt beschreiben den Vorgang ungenau, und genau
diese Meldung ist der eigentliche Zweck der Prüfung.
Empfohlene Maßnahme: Nichts bauen, solange es keinen Umbenennungs-Pfad in der
Oberfläche gibt (AK8/WS-3). Wenn doch: dort entscheiden, ob eine Umbenennung
überhaupt zulässig sein soll — eine `schritt_id` ist ein Bezugspunkt für
`nachfolger`, `aktiver_schritt_id` und Entscheidungsartefakte.
Status: offen.
Feature/Run: F15 WS-2c (b3), 10.09.2026.

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

**F-248** · `TECH_DEBT` · P3 · offen
Titel: Die Markierung „läuft jetzt" fehlt still, solange das Laufverzeichnis
noch nicht existiert.
Beschreibung: `ermittleAktiveLaufIds` liest `aktiv` aus
`GET /api/laeufe/<laufId>` (D13). Dieser Endpunkt antwortet 404, solange
`kontrollzustand/<laufId>/` fehlt — und das Verzeichnis entsteht erst mit der
`RUN_PREPARED`-Wirkungsmarke des Execution Controllers. Zwischen dem
Schreiben der Workflow-Version (Schritt auf `LAEUFT` mit `lauf_id`) und
dieser Marke liegt ein Fenster, in dem der Schritt `LAEUFT` zeigt und die
Markierung fehlt. Real beobachtet: im WS-3a-Nachweis blieb die Markierung
zunächst ganz aus, weil die Werkzeug-Attrappe keine Marke schrieb.
Fundstelle: `public/leitstand/app.js`, `ermittleAktiveLaufIds`, gegen
`scripts/leitstand-server.mjs`, `GET /api/laeufe/<laufId>`.
Auswirkung: Das Fenster ist kurz, aber die fehlende Markierung ist von
„läuft nicht mehr" nicht unterscheidbar — dieselbe Klasse von
Mehrdeutigkeit, die F-234 am Stopp-Endpunkt beschreibt. Ein 404 und ein
`aktiv: false` sagen dem Leser dasselbe, obwohl sie Verschiedenes bedeuten.
Empfohlene Maßnahme: Entweder drei Zustände zeigen (`läuft jetzt` /
`nicht aktiv` / `noch nicht ermittelbar`), oder die Aktivauskunft nicht über
den Lauf-Detailendpunkt beziehen, sondern über ein Feld, das der Server ohne
Laufverzeichnis beantworten kann. Zusammen mit F-234 entscheiden.
Status: offen.
Feature/Run: F15 WS-3a, 10.09.2026.

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

**F-250** · `TECH_DEBT` · P4 · offen
Titel: Zwei verschiedene Zahlen heißen in der Ansicht „Version".
Beschreibung: Die Workflow-Liste zeigt `versionSequenz` (die Artefaktversion
aus F2, „die wievielte Fassung dieses Workflows") unter der Überschrift
„Version". `WORKFLOW_V0` trägt zusätzlich ein eigenes Feld `version`, das der
Mensch in der Payload selbst setzt. Beide sind im Detail nebeneinander
sichtbar („Version (Plan / Artefakt)"), in der Liste nur die zweite.
Fundstelle: `public/leitstand/app.js`, `workflowKopfzeile`;
`schemas/kontrollzustand-workflow-payload.schema.json`.
Auswirkung: Gering, aber verwechselbar: wer eine korrigierte Fassung mit
unverändertem `version`-Feld einreicht, sieht die Listenzahl steigen und
könnte sie für sein eigenes Feld halten.
Empfohlene Maßnahme: Die Liste beschriftet die Zahl als „Fassung", oder sie
zeigt beide. Kosmetik, gemeinsam mit der WS-3b-Ansicht entscheiden.
Status: offen.
Feature/Run: F15 WS-3a, 10.09.2026.

**F-251** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: `public/` liegt außerhalb von Lint und Typprüfung — WS-3a schließt
davon nur die Syntaxlücke.
Beschreibung: `biome.json` führt unter `files.includes` ausschließlich
`scripts/**` und `src/**`; `tsconfig.json` ebenso, und dort nur `*.ts`.
`public/leitstand/app.js` (rund 1200 Zeilen, der gesamte Client) wird also
weder gelintet noch typgeprüft, und war bis WS-3a von keinem Gate berührt —
`scripts/check-f12-leitstand-ansicht.mjs` prüft trotz seines Namens die
API-Projektionen, nicht die Ansicht. WS-3as neues Gate prüft den Quelltext
gegen die Zusagen der Workflow-Ansicht und ruft zusätzlich `node --check`
auf; damit ist die Syntax gedeckt, Lint und Typen sind es nicht, und
`index.html`/`style.css` bleiben ganz ungeprüft.
Fundstelle: `biome.json`, `tsconfig.json`,
`scripts/check-f15-workflow-oberflaeche.mjs`.
Auswirkung: Eine tote Variable, ein vergessenes `await` (die Regel
`noFloatingPromises` ist im Projekt auf `error` gestellt und greift hier
nicht) oder eine falsch geschriebene Feldabfrage fällt in der gesamten Kette
nicht auf, solange sie das Textmuster des Gates nicht verletzt.
Empfohlene Maßnahme: `public/**` in `biome.json` aufnehmen und den daraus
folgenden Befundberg in einem eigenen Durchgang abtragen — nicht nebenbei in
einem Feature-Commit. Vorher prüfen, ob die Browser-Globals (`document`,
`fetch`, `console`) eine eigene Biome-Domain brauchen.
Status: offen.
Feature/Run: F15 WS-3a, 10.09.2026.

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

**F-254** · `TECH_DEBT` · P3 · offen
Titel: Die Ansicht zeigt weder Zeitpunkte noch die Plandaten, an denen Halte
real entstehen, noch die Entscheidungsartefakte.
Beschreibung: Drei Lücken derselben Art — der Mensch liest einen Grund und
kann ihn nicht verorten. (1) Keine Zeitangabe: `WORKFLOW_V0` trägt kein
Zeitfeld (im Server als Grund für die alphabetische Sortierung notiert), also
lässt sich kein Halt datieren und ein stale `LAEUFT` nicht von einem frisch
gestarteten unterscheiden. (2) Die Schrittliste zeigt `eingaben`,
`werkzeugsatz`, `output_schema`, `risiko` und `grenzen` NICHT — genau die
Felder, an denen ein Start real scheitert. (3) Kein Entscheidungsartefakt ist
lesbar: weder Freigabe/Ablehnung mit Pflichtbegründung noch der Stopp noch
die Planänderung; `freigabe_erteilt: true` ist ein nackter Boolescher Wert
ohne Begründung, Zeitpunkt oder Verweis, und die Stopp-Begründung steht nur
im flüchtigen `grund`, den die nächste Fassung überschreibt.
Fundstelle: `public/leitstand/app.js`, `renderWorkflowKopf` /
`workflowSchrittZeile`; `schemas/kontrollzustand-workflow-payload.schema.json`.
Auswirkung: Die Ansicht taugt zum Zusehen, aber nur begrenzt zur Diagnose vor
einer Reparaturfassung — dem Zweck, für den AK8 sie vorsieht. Die Schreibseite
der Entscheidungsartefakte ist WS-3b zugeordnet, ihre LESESEITE bisher
keinem Workstream.
Empfohlene Maßnahme: (2) ist eine reine Anzeigeerweiterung und gehört nach
WS-3b. (3) braucht eine Entscheidung, ob die Ansicht die Entscheidungskette
je Workflow liest — ausdrücklich entscheiden, nicht implizit vertagen. (1)
ist eine Schema-/Serverfrage und größer als WS-3.
Status: offen.
Feature/Run: F15 WS-3a, 10.09.2026 (QA-Pass, Fehler 5, 7, 9).

**F-255** · `TECH_DEBT` · P3 · offen
Titel: Ein Workflow mit unlesbarer Artefaktkette verschwindet lautlos aus der
Liste.
Beschreibung: `sammleWorkflows` überspringt jeden Eintrag, für den
`ladeArtefaktVersion` `null` liefert (`if (version === null) continue`) —
bewusst, damit ein defekter Datensatz nicht den ganzen Request 500en lässt.
Die Ansicht macht diese Entscheidung erstmals spürbar: Der Workflow fehlt
ohne Hinweis, und ist er der einzige, meldet der Leerzustand „Keine Workflows
unter kontrollzustand/ gefunden" — ein verlorener Workflow ist von „es gibt
keinen" nicht unterscheidbar, und der Mensch hat nicht einmal die ID, um das
Detail zu öffnen.
Fundstelle: `scripts/leitstand-server.mjs`, `sammleWorkflows`;
`public/leitstand/app.js`, `ladeWorkflows`.
Auswirkung: Schmal (setzt eine beschädigte Kette voraus), aber der Ausfall
ist total und stumm — dieselbe Klasse wie F-247/F-248: ein nicht
darstellbarer Zustand sieht aus wie ein normaler.
Empfohlene Maßnahme: `sammleWorkflows` liefert den übersprungenen Eintrag als
Platzhalter mit `workflowId` und einem Status „Kette nicht lesbar", statt ihn
zu unterschlagen. Serveränderung, eigener Rot-Fall; bewusst nicht in WS-3a.
Status: offen.
Feature/Run: F15 WS-3a, 10.09.2026 (QA-Pass, Fehler 8).

**F-256** · `TECH_DEBT` · P4 · offen
Titel: Vier kleinere Anzeigemängel der Workflow-Ansicht, gesammelt.
Beschreibung: (a) `zeigePollFehler` hat mit `ladeWorkflows` jetzt drei
Schreiber auf einem einzigen `#poll-fehler`; ein erfolgreicher Poller blendet
den Hinweis des fehlgeschlagenen wieder aus, und die Workflow-Liste friert
dann stumm ein — genau das, wogegen der Hinweis gebaut ist. Das Muster ist
älter als WS-3a, WS-3a erhöht die Trefferwahrscheinlichkeit. (b) `Grund:
fertig` bei `ABGESCHLOSSEN` liest sich wie eine Fehlermeldung; das Schema
warnt ausdrücklich, das Feld sei „ohne Blick auf status keine
Fehlermeldung". (c) Fehlt einer Bestandsfassung ein Pflichtfeld, rendert
`escapeHtml(String(undefined))` das Wort `undefined` in die Zelle (Folge von
F-247: der Detailendpunkt validiert nicht). (d) Der Schrittstatus
`UEBERSPRUNGEN` wird als gleichrangig gezeigt, obwohl ihn niemand setzt und
das Überspringen gestrichen ist; kein Rückweg von einem Lauf zu seinem
Workflow; das Detail-Panel bleibt bei 404 dauerhaft offen und wiederholt den
Fehler alle zwei Sekunden; das unbedingte Neurendern zerstört alle zwei
Sekunden eine Textauswahl — gerade bei dem langen `grund`, den man für die
Reparaturfassung kopieren will.
Fundstelle: `public/leitstand/app.js`, Workflow-Ansicht.
Auswirkung: Einzeln gering, in Summe die Alltagsreibung der Ansicht.
Empfohlene Maßnahme: In WS-3b mitnehmen. (a) braucht einen Fehlerzähler je
Quelle statt eines geteilten Kennzeichens und betrifft dann auch `laden` und
`ladeStartfehler`.
Status: offen.
Feature/Run: F15 WS-3a, 10.09.2026 (Reviewer-Pass Befund 5/9, QA-Pass Fehler 10 bis 16).

**F-257** · `HARNESS_IMPROVEMENT` · P2 · offen
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
Status: offen.
Feature/Run: F15 WS-3a, 10.09.2026 (Challenger, zweites Auftreten).

**F-258** · `TECH_DEBT` · P3 · offen
Titel: Zwei Serverregeln liegen seit WS-3b als Anzeige-Zwilling im Browser —
ohne Gate, das sie zusammenhält.
Beschreibung: `public/leitstand/app.js` führt zwei Listen bzw. Regeln ein
zweites Mal, die in `scripts/leitstand-server.mjs` die eigentliche Wahrheit
sind: (a) `STOPPBARE_WORKFLOW_STATUS` (entscheidet, ob der Stopp-Knopf
angeboten wird) und (b) `ermittleAbgeschwaechteFreigabenAnzeige`, die
`ermittleFreigabeAbschwaechungen` nachbildet, damit die F-226-Warnung VOR dem
Einreichen erscheint statt erst im 400. Beides ist bewusst als ANZEIGE-
Zwilling gebaut und im Code so benannt — der Server entscheidet, die
Oberfläche bietet nur an —, aber kein Gate hält die beiden Fassungen
aneinander.
Fundstelle: `public/leitstand/app.js`, `STOPPBARE_WORKFLOW_STATUS` und
`ermittleAbgeschwaechteFreigabenAnzeige`, gegen `scripts/leitstand-server.mjs`.
Nachtrag (Reviewer-/QA-Pass 10.09.2026): es sind DREI, nicht zwei — der dritte
ist `REPARIERBARE_WORKFLOW_STATUS` und als F-262 eigens festgehalten, weil er
als einziger einen Bedienweg VERSCHLIESSEN kann statt nur einen Knopf zu viel
oder zu wenig anzubieten.
Auswirkung: Läuft (a) auseinander, fehlt ein Knopf oder er liefert einen 409
mit lesbarem Grund — sichtbar, nicht gefährlich. Bei (b) ist die Richtung
schlechter: die Warnung bliebe aus, und der Mensch liest die abgeschwächte
Freigabepflicht erst im Fehlertext. Die WIRKUNG bleibt in beiden Fällen beim
Server; falsch werden kann nur die Vorschau.
Empfohlene Maßnahme: Entweder einen Gate-Fall, der beide Listen textlich
gegeneinander prüft (Muster: die Zwillings-Enums in `src/workflow/types.ts`,
dort mit derselben Begründung ohne Gate gelassen), oder (b) über einen
Vorschau-Endpunkt beantworten lassen, statt die Regel zu spiegeln. Nicht
nebenbei: ein Vorschau-Endpunkt ist ein neuer Vertrag.
Status: offen.
Feature/Run: F15 WS-3b, 10.09.2026.

**F-259** · `TECH_DEBT` · P2 · offen
Titel: Ein bearbeiteter Reparaturentwurf mit geänderter `workflow_id` legt
lautlos einen NEUEN Workflow an.
Beschreibung: Der Entwurf ist bearbeitbarer JSON-Text (bewusst — ein Formular
wäre ein Plan-Editor). `POST /api/workflows` legt anhand der `workflow_id` an
oder versioniert; ändert der Mensch beim Bearbeiten diese Zeile — ein
Tippfehler genügt —, entsteht ein zweiter Workflow mit 201, und der
reparaturbedürftige bleibt unverändert stehen. Die Erfolgsmeldung der Ansicht
nennt die workflowId, unter der sie den Entwurf geöffnet hat, nicht die aus
dem eingereichten Text: sie behauptet dann eine Wirkung am falschen Workflow.
Fundstelle: `public/leitstand/app.js`, `reicheReparaturEntwurfEin`; gegen
`scripts/leitstand-server.mjs`, POST /api/workflows.
Auswirkung: Kein Datenverlust (append-only, beide Workflows bleiben lesbar),
aber die Rückmeldung ist falsch, und der Mensch sucht den Fehler am falschen
Ende. Dieselbe Klasse wie F-224: zwei frei gewählte Kennungen, deren
Verwechslung niemand bemerkt.
Empfohlene Maßnahme: Beim Einreichen die `workflow_id` des Entwurfs gegen die
geöffnete vergleichen und bei Abweichung warnen (nicht sperren — eine neue
`workflow_id` kann gewollt sein, etwa als Kopie); die Erfolgsmeldung aus der
Antwort des Servers nehmen, nicht aus dem Öffnungskontext.
Status: offen.
Feature/Run: F15 WS-3b, 10.09.2026.

**F-260** · `TECH_DEBT` · P3 · offen
Titel: Der Reparaturentwurf sagt nicht, ob die Nachbereitung des
abgebrochenen Laufs schon durch ist.
Beschreibung: Zweiter Teil von F-240, beim Bau von WS-3b bewusst nicht
mitgelöst. Der Entwurf wird zwar frisch geladen (`GET /api/workflows/<id>`
beim Klick, nicht aus dem Anzeigestand), aber der abgebrochene Lauf fliegt
nach dem Stopp noch. Trifft seine Nachbereitung erst NACH dem Einreichen ein,
greift F-227 und verwirft den Ausgang des Laufs — richtig, aber die einzige
Spur ist ein Eintrag in `GET /api/startfehler`, und der Entwurf zeigt
dauerhaft den Schrittstand, den der Mensch beim Öffnen erwischt hat.
Fundstelle: `public/leitstand/app.js`, `oeffneReparaturEntwurf`; gegen
`scripts/leitstand-server.mjs`, F-227-Schutz in `schreibeWorkflowFortschritt`.
Auswirkung: Das Fenster ist klein und der Ausgang sicher (es wird nichts
Falsches geschrieben), aber der Mensch bekommt keinen Hinweis, dass er zu
früh war. Verwandt mit F-254 (1): ohne Zeitfeld in WORKFLOW_V0 lässt sich
„gerade eben gestoppt" von „steht seit gestern" nicht unterscheiden.
Empfohlene Maßnahme: Entweder ein Zustandssignal am Workflow („ein Lauf
dieses Workflows ist noch aktiv", aus D13 ableitbar) über dem Entwurf zeigen,
oder den Entwurf beim Eintreffen einer neueren Version als veraltet
kennzeichnen. Das Zweite braucht die versionSequenz im Entwurf, also eine
kleine Erweiterung — nicht nebenbei.
Status: offen.
Feature/Run: F15 WS-3b, 10.09.2026 (aus F-240 abgespalten).

**F-261** · `HARNESS_IMPROVEMENT` · P3 · offen
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
Status: offen.
Feature/Run: F15 WS-3b, 10.09.2026 (Rotkalibrierung).

**F-262** · `TECH_DEBT` · P3 · offen
Titel: Der Reparaturweg der Oberfläche bildet die Ersetzungsregel des Servers
nach, statt sie zu erfragen.
Beschreibung: Dritter Anzeige-Zwilling neben den beiden aus F-258:
`REPARIERBARE_WORKFLOW_STATUS` in `public/leitstand/app.js` entscheidet, wann
"Reparaturfassung vorbereiten" angeboten wird, und bildet damit die Regel von
`POST /api/workflows` nach (`GESPERRTE_ERSETZUNGS_STATUS` plus die Ausnahme
`bestandUngueltig`). In WS-3b ist der ungültige Bestand als zweiter Öffner
nachgezogen (aus dem neuen Feld `verstoesse`), weil sonst genau die Fassung,
für die F-247 die Lesbarkeit erkämpft hat, ansehbar und nicht reparierbar
gewesen wäre. Die Regel selbst liegt aber weiterhin zweimal im Repo, und die
Oberfläche ist die engere von beiden.
Fundstelle: `public/leitstand/app.js`, `REPARIERBARE_WORKFLOW_STATUS` und
`renderWorkflowBedienung`, gegen `scripts/leitstand-server.mjs`,
POST /api/workflows.
Auswirkung: Fehlt ein Öffner, ist ein realer Reparaturweg unsichtbar — die
Wirkung ist ein zugemauerter Zustand, und das ist die Fehlerform, gegen die
F-207 und F-247 geschrieben sind. Die umgekehrte Richtung ist harmlos: ein zu
viel angebotener Knopf endet in einem 409 mit lesbarem Grund.
Empfohlene Maßnahme: Gemeinsam mit F-258 entscheiden — entweder ein
Gate-Fall, der beide Listen gegeneinander hält, oder ein Feld `ersetzbar` in
der Workflow-Projektion, das der Server beantwortet. Das Zweite passt zu
`naechster` und `verstoesse` und wäre die Auflösung aller drei Zwillinge.
Status: offen.
Feature/Run: F15 WS-3b, 10.09.2026 (Reviewer- und QA-Pass, unabhängig gefunden).

**F-263** · `TECH_DEBT` · P3 · offen
Titel: `naechster.schrittId` wirft den blockierenden Schritt weg, obwohl der
Server ihn kennt.
Beschreibung: `baueNaechsterProjektion` liefert `schrittId` nur für die
Ausgänge `starte` und `haltFreigabe`. `haltKlaerung` und `haltGestoppt`
führen ihren Schritt unter `aktiverSchrittId` (`src/workflow/types.ts`), und
bei Regel 3 ("nicht startbereit") und Regel 4 ("Worker nicht dispatchbar")
ist das genau der blockierende Schritt. Folge in der Ansicht: keine
Markierung "fällig" in der Schrittliste, kein Schrittname in der Liste, und
bei Regel 4 nennt auch der Grundtext den Schritt nicht — im Diagnosefall,
für den AK8 die Ansicht vorsieht.
Fundstelle: `scripts/leitstand-server.mjs`, `baueNaechsterProjektion`;
`src/workflow/index.ts`, Regel 3 und Regel 4.
Auswirkung: Der Mensch sieht "steht — Klärung nötig" und muss den Schritt aus
dem Fließtext des Grundes heraussuchen, statt ihn in der Tabelle markiert zu
finden.
Empfohlene Maßnahme: NICHT `aktiverSchrittId` in dasselbe Feld legen — das
wären Cursor und Blockierer unter einem Namen, zwei verschiedene Aussagen
(§16.2). Stattdessen ein eigenes Feld (`blockierterSchrittId`) oder die
Union in `src/workflow/types.ts` um einen benannten Schrittbezug erweitern.
Beides ändert einen Vertrag und braucht einen eigenen Rot-Fall.
Status: offen.
Feature/Run: F15 WS-3b, 10.09.2026 (QA-Pass).

**F-264** · `TECH_DEBT` · P3 · offen
Titel: Ein stale `LAEUFT` zeigt in der Liste dauerhaft "läuft", und der
dokumentierte Ausweg ist über die Oberfläche nicht auslösbar.
Beschreibung: Die Lage "läuft" entsteht aus dem abgelegten `status` und sagt
nichts darüber, ob ein Lauf noch lebt. Nach einem Serverneustart mitten im
Schritt steht derselbe Status auf der Platte, und die Ansicht zeigt
unverändert "läuft". Die einzige Gegenprobe ist die Markierung "läuft jetzt"
an der Schrittzeile (D13) — sie steht nur im DETAIL, nicht in der Liste, und
ihr Fehlen ist laut F-248 ohnehin nicht von "läuft nicht mehr"
unterscheidbar. Zweitens ist der in `features/F15/feature.md`
("Halte-Zustände") dokumentierte Ausweg — der nächste Startversuch schreibt
`KLAERUNG_ERFORDERLICH` fest — über die Oberfläche nicht auslösbar: "Starten"
erscheint nur bei `naechster.art === 'starte'`, und ein stale `LAEUFT`
liefert `haltKlaerung`. Es bleibt "Stoppen", das über `GESTOPPT` in den
Reparaturzug führt — ein anderer Weg als der dokumentierte.
Fundstelle: `public/leitstand/app.js`, `beschreibeLage`;
`scripts/leitstand-server.mjs`, Stale-LAEUFT-Heilung in
POST /api/workflows/<id>/starten.
Auswirkung: Der Mensch wartet auf einen Lauf, den es nicht mehr gibt. Die
Ursache ist das fehlende Zeitfeld in `WORKFLOW_V0` (F-254 (1)): ohne es
lässt sich "gerade gestartet" von "steht seit gestern" nicht trennen.
Empfohlene Maßnahme: Gemeinsam mit F-248 und F-254 (1) entscheiden. Der
kleinste ehrliche Schritt wäre, die Aktivauskunft (D13) auch in die
Workflow-Projektion zu nehmen, statt sie je Schritt einzeln zu erfragen —
dann kann die Liste "läuft" von "steht auf LAEUFT, aber nichts läuft"
trennen, und der Heilungsweg ließe sich anbieten.
Status: offen.
Feature/Run: F15 WS-3b, 10.09.2026 (QA-Pass).

**F-265** · `TECH_DEBT` · P4 · offen
Titel: Die Ablehnungsgründe der Workflow-Endpunkte sagen uneinheitlich, ob
die Entscheidung festgehalten wurde.
Beschreibung: Im selben Bedienfeld treffen drei Klassen aufeinander: Zweige,
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
Empfohlene Maßnahme: Eine Regel festlegen (etwa: jede Ablehnung eines
Endpunkts, der etwas festhalten würde, sagt es) und die Texte einmal
durchziehen. Sprachliche Sammeländerung, eigene kleine Iteration.
Status: offen.
Feature/Run: F15 WS-3b, 10.09.2026 (QA-Pass).

**F-266** · `TECH_DEBT` · P4 · offen
Titel: `docs/STATUS.md` kennt weder Meilenstein 3 noch F15.
Beschreibung: `CLAUDE.md` erklärt `docs/STATUS.md` zur einzigen Quelle für
Phasenstand und Scope. Das Dokument führt Meilenstein 2 mit F11 bis F14, aber
Meilenstein 3 (`docs/projekt/zielfassung.md` §13.4) und F15 kommen darin
nicht vor — obwohl F15 seit mehreren Bauabschnitten der aktive Workstream ist
und mit WS-3b sein achtes Akzeptanzkriterium erfüllt.
Fundstelle: `docs/STATUS.md`, Abschnitt "Aktuelle Phase" und "Offene Punkte".
Auswirkung: Wer sich an der laut CLAUDE.md maßgeblichen Statusdatei
orientiert, hält F14 für den aktuellen Stand. Genau die Drift, gegen die der
Sanierungsdurchgang (`repo-audit`) geschrieben ist.
Empfohlene Maßnahme: In einer eigenen Doku-Iteration nachziehen — Meilenstein
3 als Abschnitt, F15 mit seinem Stand. Bewusst NICHT nebenbei in einem
Feature-Commit: eine Statusdatei, die im Vorbeigehen fortgeschrieben wird,
wird ungeprüft fortgeschrieben.
Status: offen.
Feature/Run: F15 WS-3b, 10.09.2026 (Reviewer-Pass).

**F-267** · `TECH_DEBT` · P4 · offen
Titel: `UEBERSPRUNGEN` fällt durch beide Raster des Reparaturentwurfs.
Beschreibung: `REPARIERBARE_SCHRITT_STATUS` (Oberfläche) setzt `LAEUFT`,
`FEHLGESCHLAGEN` und `VERWEIGERT` zurück; `STARTBEREITE_SCHRITT_STATUS`
(`src/workflow/index.ts`) lässt nur `OFFEN` und `WARTET_FREIGABE` starten.
`UEBERSPRUNGEN` steht in keiner der beiden Listen: ein Schritt in diesem
Status wird vom Entwurf nicht zurückgesetzt und hält den Automaten
anschließend erneut an — die eingereichte Fassung wird angenommen und steht
sofort wieder. Heute unerreichbar, weil das Überspringen gestrichen ist und
niemand den Status setzt (feature.md AK8, Entscheidung Stefan 10.09.2026);
ein künftiger `SCHRITT_STATUS`-Wert landete jedoch automatisch in derselben
Falle, weil die Liste in der Oberfläche eine Aufzählung ist und keine
Allowlist-Umkehrung.
Fundstelle: `public/leitstand/app.js`, `REPARIERBARE_SCHRITT_STATUS`, gegen
`src/workflow/index.ts`, `STARTBEREITE_SCHRITT_STATUS`.
Auswirkung: Heute keine. Als Bauart dieselbe Klasse wie F-244: eine Liste,
die beim Wachsen der Grundmenge stillschweigend falsch wird.
Empfohlene Maßnahme: Den Entwurf statt über eine Aufzählung über die
Umkehrung bilden ("alles, was nicht startbereit ist und eine lauf_id trägt")
— oder, sauberer, den Reparaturentwurf vom Server bauen lassen. Gemeinsam mit
F-262 entscheiden.
Status: offen.
Feature/Run: F15 WS-3b, 10.09.2026 (Reviewer-Pass).

**F-268** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: AK10 verlangt in einem Satz, was sich in einem Lauf gegenseitig
ausschließt.
Beschreibung: F15s AK10 lautet: „ein zweistufiger Workflow (lesender Schritt,
dann schreibender Schritt) läuft ohne manuellen Zwischenstart; ein
`ZWINGEND`-Halt tritt real ein; ein Abbruch nach F14 wirkt auf den aktiven
Schritt." Die ersten beiden Teilsätze widersprechen sich, sobald man versucht,
sie in EINEM Lauf zu belegen: ein `ZWINGEND`-Halt IST der manuelle
Zwischenschritt, dessen Abwesenheit Satz 1 zeigen soll. Der dritte Teilsatz
beendet den Lauf, in dem er stattfindet — nach einem Abbruch gibt es keinen
Folgeschritt mehr zu beobachten. Der Nachweis brauchte deshalb drei getrennte
Läufe (`nachweis/ws4/L1.json`, `L2.json`, `L3.json`).
Fundstelle: `features/F15/feature.md`, AK10.
Auswirkung: Wer AK10 wörtlich als EIN Kriterium liest, baut entweder einen
Nachweis, der einen der drei Teilsätze nur behauptet, oder er hält das
Kriterium für unerfüllbar. Beides ist schlechter als die Aufteilung. Dieselbe
Klasse wie F13s AK8 (ein Akzeptanzkriterium, das mehrere unabhängige
Beobachtungen in einen Satz packt) — zweites Vorkommen, also ein Muster und
kein Einzelfall.
Empfohlene Maßnahme: Beim Schneiden von Akzeptanzkriterien pro Kriterium EINE
Beobachtung verlangen. Wo drei Beobachtungen zusammengehören, drei nummerierte
Teilkriterien schreiben (AK10a/b/c), nicht drei Halbsätze. Kandidat für eine
Regel im Feature-Akte-Gate (`scripts/check-feature.mjs`): ein AK-Text mit mehr
als einem Semikolon-getrennten Prüfsatz ist ein Befund.
Status: offen.
Feature/Run: F15 WS-4, 10.09.2026 (AK10-Nachweis).

**F-269** · `TECH_DEBT` · P2 · offen
Titel: Ein Workflow-Schritt hat keine eigene Anweisung — und weiß nicht, zu
welchem Workflow er gehört.
Beschreibung: Die einzige Anweisung, die ein Schritt bekommt, ist der
`auftragstext` seines Auftrags (`fuehreAufgabeDurch`: `prompt = "Auftrag:\n" +
auftragstext` plus Evidenzteil). `WORKFLOW_V0` kennt kein Feld für eine
schrittbezogene Anweisung, und im Kontextpaket eines Schritts stehen nur das
Auftragsartefakt und — falls vorhanden — die Laufakte des Vorgängerlaufs.
Der Workflow selbst wird nicht mitgereicht. Damit sind zwei schreibende
Schritte, die zu verschiedenen Workflows desselben Auftrags gehören, für den
Worker nicht unterscheidbar: er kann nur ableiten, DASS er einen Vorgänger
hat, nicht, in welchem Plan er steht.
Fundstelle: `schemas/kontrollzustand-workflow-payload.schema.json`
(`schritte[]` ohne Anweisungsfeld) gegen `src/execution-controller/index.ts`
(Promptbau aus `eingaben.auftragstext`).
Auswirkung: Beim AK10-Nachweis real aufgetreten. L1s Schritt 2 („schreibe die
Analyse nach `features/F15/nachweis-ak10-analyse.md`") und L2s Schritt 2
(„ändere die eine Zeile in `scripts/leitstand-server.mjs`") ließen sich aus
einem gemeinsamen Auftragstext nicht ansteuern; der Nachweis brauchte deshalb
zwei Aufträge statt einem. Praktisch heißt das: ein Auftrag kann heute nur
EINEN Workflow sinnvoll tragen, und die Schrittanweisungen müssen als
„wenn du Schritt 1 bist, dann …"-Prosa in den Auftragstext geschrieben werden.
Das ist eine Umgehung, die bei drei Schritten unlesbar wird.
Empfohlene Maßnahme: Nicht sofort bauen. Zuerst entscheiden, ob die Anweisung
ein `WORKFLOW_V0`-Schrittfeld wird (z. B. `anweisung`, optional wie `grund`,
damit der Bestand gültig bleibt) oder ob der Schritt sein Workflow-Artefakt im
Kontextpaket bekommt. Das Erste ist präziser, das Zweite billiger. Gemeinsam
mit F-270 entscheiden — beide betreffen dieselbe Lücke: was ein Schritt über
seinen Platz in der Kette weiß.
Status: offen.
Feature/Run: F15 WS-4, 10.09.2026 (AK10-Nachweis, Planungsphase).

**F-270** · `TECH_DEBT` · P2 · offen
Titel: Der Handoff zwischen zwei Schritten trägt kein Ergebnis, nur einen
Dateipfad.
Beschreibung: Endet Schritt n, bekommt Schritt n+1 über `vorgaengerLaufId`
dessen Laufakte ins Kontextpaket. `LaufakteV0Daten` hat aber kein Feld für das
Arbeitsergebnis — nur `rohstrom_referenz: { pfad, inhalts_hash }`. Der
Antworttext des Vorgängers steht in
`kontrollzustand-roh/<lauf_id>/rohstrom.json` unter `stdout`, dort als
JSON-String, dessen Feld `result` der eigentliche Text ist. Schritt n+1 kommt
also nur an das Ergebnis seines Vorgängers, wenn er diesen Pfad selbst öffnet,
das JSON zweimal auspackt — und wenn er zufällig dasselbe Dateisystem sieht
und `Read` im Werkzeugsatz hat.
Fundstelle: `src/claude-code-gateway/types.ts`, `LaufakteV0Daten`; gegen
`src/execution-controller/index.ts`, `vorgaengerLaufId`-Block.
Auswirkung: Beim AK10-Nachweis real aufgetreten. L1s Schritt 2 hätte ohne eine
ausdrückliche Leseanweisung im Auftragstext („die Laufakte nennt
`rohstrom_referenz.pfad`; darin `stdout`, darin `result`") nicht gewusst, was
Schritt 1 herausgefunden hat. Der Handoff funktioniert damit nicht kraft
Datenmodell, sondern kraft Prosa plus Dateisystem-Zufall. Ein lesender
Folgeschritt ohne `Read` im Werkzeugsatz käme gar nicht an das Ergebnis.
Empfohlene Maßnahme: Nicht sofort bauen. Entscheiden, ob das Ergebnis in ein
eigenes Artefakt gehört (ein `ergebnis-<lauf_id>` mit dem `result`-Text, das
F8 nach der Klassifikation registriert und das der Folgeschritt wie Auftrag
und Laufakte vorangestellt bekommt) — oder ob die Laufakte selbst um ein
Ergebnisfeld wächst. Gegen das Zweite spricht, dass die Laufakte heute reine
Aufrufdokumentation ist und ihr `inhalts_hash` an mehreren Stellen als stabile
Lineage-Referenz benutzt wird. Gemeinsam mit F-269 entscheiden.
Status: offen.
Feature/Run: F15 WS-4, 10.09.2026 (AK10-Nachweis, Planungsphase).

**F-271** · `TECH_DEBT` · P3 · offen
Titel: Die Laufakte hält nicht fest, welchen Werkzeugsatz ein Lauf hatte.
Beschreibung: `LaufakteV0Daten` (`src/claude-code-gateway/types.ts`) trägt
`werkzeug_version_deklariert`, `berechtigungskontext`,
`arbeitsverzeichnis_pfad` und `modell_beobachtet` — aber nicht die
`erlaubte_werkzeuge` des Laufs. Der Rohstrom hält nur `werkzeugStartziel`
fest, nicht die `argv` mit `--tools`/`--allowedTools`. Aus den Artefakten
allein lässt sich damit nicht feststellen, ob ein Lauf schreiben DURFTE.
`permission_denials: []` beantwortet die Frage nicht: der leere Wert ist mit
„hatte keine Schreibrechte und versuchte nichts" und mit „hatte sie und nutzte
sie nicht" gleich verträglich.
Fundstelle: `src/claude-code-gateway/types.ts`, `LaufakteV0Daten`; gegen
`src/claude-code-gateway/index.ts`, Rohstrom-Serialisierung (nur
`werkzeugStartziel`, `stdout`, `stderr`, `exitCode`, `startfehler`,
`beendigungsart`).
Auswirkung: Beim AK10-Nachweis real aufgetreten. Ein zusätzlicher, von Hand
gestarteter Lauf gegen denselben Auftrag musste vom Nachweis abgegrenzt
werden („hat der etwa auch geschrieben?"). Die Abgrenzung gelang nur über
einen Umweg — ein späterer Lauf zitierte die fragliche Codezeile noch in der
alten Fassung. Ohne diesen Zufall wäre die Frage aus den Artefakten nicht
beantwortbar gewesen. Für ein System, dessen Kern die Bezeugung von
Schreibwirkung ist, ist das eine Lücke im Auditpfad: die
Werkzeugsatz-Begrenzung ist die zentrale Sicherheitszusage (E-187/AC9,
`werkzeugsatz_begrenzung: DEKLARIERT`), und sie hinterlässt je Lauf keine
Spur.
Empfohlene Maßnahme: Die aufgelöste Werkzeugsatz-Begrenzung (`modus` +
`erlaubte_werkzeuge`) additiv in `LaufakteV0Daten` aufnehmen — dieselbe Stelle,
an der `berechtigungskontext` schon steht, und derselbe Wert, den
`loeseAusfuehrungsEingabenAuf` ohnehin schon in `aufrufEingaben.werkzeugsatz`
gelegt hat. Additiv, weil jede bestehende Laufakte append-only ist
(ARCHITECTURE.md §7); das Feld ist für Bestandsakten nicht rekonstruierbar und
darf deshalb nicht Pflicht werden.
Status: offen.
Feature/Run: F15 WS-4, 10.09.2026 (AK10-Nachweis, QA-Pass).

**F-272** · `HARNESS_IMPROVEMENT` · P3 · offen
Titel: Der Abbruch-Nachweis konnte den Automatenhalt nicht isolieren — die
zweite Sicherung war zugleich der zweite Grund.
Beschreibung: L3 des AK10-Nachweises sollte belegen, dass ein Abbruch auf den
aktiven Schritt wirkt UND der Automat danach nicht fortsetzt. Der Folgeschritt
`schritt-2-fix` trug im Plan aber `freigabe: ZWINGEND` — bewusst als zweite
Sicherung gegen einen ungeplanten Codeeingriff, falls der Abbruch nicht
greift. Genau diese Sicherung macht die Beobachtung überdeterminiert: hätte
der Abbruch den Automaten gar nicht erreicht, wäre der Folgeschritt trotzdem
`OFFEN` geblieben, weil ihn die Freigabepflicht ohnehin angehalten hätte. Der
Nachweis belegt damit den Wortlaut von AK10 („wirkt auf den aktiven Schritt"),
nicht die stärkere Lesart („und stoppt die Kette").
Fundstelle: `nachweis/ws4/L3.json`, `schritte[1].freigabe`; Protokoll
`features/F15/nachweis-ak10.md`, Zeile L3-8.
Auswirkung: Kein Defekt am Produkt — die Regel selbst ist gate-geprüft
(`scripts/check-f15-automat-real.mjs`, Block (b): ein abgebrochener Schritt 1
setzt NICHT auf Schritt 2 fort). Der Befund liegt am Nachweisdesign: eine
Sicherung im Testaufbau, die denselben Ausgang erzeugt wie der zu belegende
Mechanismus, entwertet die Beobachtung. Das ist eine allgemeine Falle, keine
F15-Besonderheit — sie tritt überall dort auf, wo man einen Halt beweisen will
und den Aufbau vorsichtshalber zusätzlich absichert.
Empfohlene Maßnahme: Beim Entwerfen eines Nachweislaufs je Behauptung prüfen,
ob der erwartete Ausgang auch ohne den zu belegenden Mechanismus einträte.
Wenn ja, ist entweder die Sicherung zu entfernen (und das Risiko bewusst zu
tragen) oder die Behauptung zu schwächen. Für diesen konkreten Fall: ein
vierter Lauf, dessen Folgeschritt `freigabe: AUTOMATISCH` und einen HARMLOSEN,
nicht-schreibenden Auftrag hat — dann kostet die fehlende Sicherung nichts,
und der Halt wird isoliert sichtbar. Lohnt sich, wenn ohnehin ein weiterer
realer Automatenlauf ansteht; nicht als eigener Zyklus.
Status: offen.
Feature/Run: F15 WS-4, 10.09.2026 (AK10-Nachweis, QA-Pass).

**F-273** · `PROCESS_IMPROVEMENT` · P1 · offen
Titel: Der Spike-Rot-Fall (Lauf 2) belegt nicht, dass ein Read-Only-Sandbox den
Schreibversuch verweigert hat.
Beschreibung: Lauf 1 (reiner Lesebefehl, `Get-ChildItem` und `rg --files`) und
Lauf 2 (Schreibbefehl) tragen dieselbe Fehlerform — `CreateProcess { message:
"Rejected(... powershell.exe ...) rejected: blocked by policy" }`. Die
Ablehnung greift bei `CreateProcess`, also vor jeder Schreibprüfung: die
execpolicy-Schicht lehnt das Programm `powershell.exe` ab (`codex exec --help`:
„`--ignore-rules`: Do not load user or project execpolicy `.rules` files"). Eine
Ablehnung, die Lesen und Schreiben gleich behandelt, belegt keinen
Read-Only-Sandbox. E-M3-2s Voraussetzung ist damit formal, nicht substanziell
erfüllt. Nicht belegt ist die frühere Annahme „keine Windows-Sandbox aktiv" —
siehe F-294.
Fundstelle: `state/tp-m3-01-codex.md` Lauf 1/2; `docs/projekt/zielfassung.md`
E-M3-2; `ARCHITECTURE.md` §8.
Auswirkung: Blocker für die Freigabe von F16 WS-2, kein Blocker für WS-1.
Empfohlene Maßnahme: S-M3-01b misst den Schreib-Rot-Fall mit Kalibrierung (im
selben Lauf muss ein Lesebefehl gelingen); Nachtrag in
`state/tp-m3-01-codex.md` (Aufgabe 4).
Status: offen.
Feature/Run: F16-Vorplanung 10.09.2026, korrigiert Gegenprüfung 11.09.2026.

**F-274** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: Codex' Sandbox-Konfiguration liegt außerhalb des Repos, außerhalb jedes
Gültigkeitsschlüssels und ist am Argv abwählbar.
Beschreibung: `[windows] sandbox`, `sandbox_mode`, `approval_policy` stehen in
`~/.codex/config.toml`; Drift dort ist für den Kern unsichtbar
(`ermittleIstZustand` misst nur `.claude/settings.json`). `codex exec` 0.153.4
kennt `--ignore-user-config`, `-c`/`--config` (generischer TOML-Override,
Hilfe-Beispiel `-c 'sandbox_permissions=["disk-full-read-access"]'`),
`-p`/`--profile`, `--enable`/`--disable` („Equivalent to
`-c features.<name>=…`"). Jeder dieser Parameter hebt A1 auf.
Fundstelle: `src/invocation-policy/index.ts` (`ermittleIstZustand`);
`codex exec --help`, real gemessen 11.09.2026.
Auswirkung: Ein lesender Codex-Lauf könnte still unter einer anderen Policy
laufen, als die Startvorlage behauptet.
Empfohlene Maßnahme: `--sandbox read-only` zusätzlich am Argv pinnen (dort
protokolliert und pinnt E-182); die Argv-Allowlist lässt keinen der genannten
Parameter durch. `--ask-for-approval` existiert an `codex exec` nicht (F-279).
Status: offen.
Feature/Run: F16-Vorplanung 10.09.2026, korrigiert 11.09.2026.

**F-275** · `TECH_DEBT` · P2 · offen
Titel: `VERWEIGERT` ist für Codex-Läufe in v1 nicht erzeugbar — Schreibversuche
sind im Terminalausgang unsichtbar.
Beschreibung: Codex meldet Sandbox-Verweigerungen nur als Tracing-Zeile des
Routers und als Modell-Prosa (Spike Lauf 1/2, „kein eigenes strukturiertes
Feld"). `ARCHITECTURE.md` §7 verbietet Klassifikation aus Konsolentext,
Ausnahmespalte leer. Der Codex-Zweig des Evaluators kennt deshalb nur
`FEHLGESCHLAGEN`/`ERFOLGREICH`.
Fundstelle: `state/tp-m3-01-codex.md` Lauf 2; `ARCHITECTURE.md` §7;
`src/result-evaluator/index.ts`.
Auswirkung: Ein verhinderter Schreibversuch hält die Kette nicht an; er ist nur
im Rohstrom auditierbar. Die Sicherheitszusage (Sandbox + Allowlist +
Rot-Fall-Nachweis) ist nicht betroffen.
Empfohlene Maßnahme: S-M3-01b Messpunkt (f) prüft, ob Codex verweigerte
Befehle als strukturiertes `item` ausgibt; falls ja, Evaluator-Zeile
`VERWEIGERT` mit `sandbox_verweigerungen_anzahl`; sonst offen halten und im
Leitstand-Laufdetail die `stderr`-Zeilenzahl des Rohstroms anzeigen (Anzeige,
keine Klassifikation). Gemeinsam mit F-283 entscheiden.
Status: offen.
Feature/Run: F16-Vorplanung, 10.09.2026.

**F-276** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: Egress-Grenze für Codex ist nicht durch den Kern ziehbar.
Beschreibung: Codex liest im `read-only`-Modus überall; `.claudeignore` gilt nur
für Claude Code. Im Arbeitsbaum liegen gitignorierte, personenbezogene bzw.
geheime Pfade (`programm/`, `.env*`, `.claude/settings.local.json`,
`state/zwischenstand/`). Ein Verengungsmechanismus existiert —
`codex sandbox --sandbox-state-readable-root` („Add a readable root to the
supplied sandbox state") —, steht aber nur am Unterbefehl `sandbox`, nicht an
`codex exec`. Konkretisiert F-185, hängt mit F-287 zusammen.
Fundstelle: `.gitignore` (Kommentar zu `programm/`), `.claudeignore`;
`codex sandbox --help`, real gemessen 11.09.2026.
Auswirkung: Datenabfluss an OpenAI bei jedem lesenden Codex-Lauf möglich, nicht
rückholbar.
Empfohlene Maßnahme: E-M3-4 (Aufgabe 3); `programm/` vor dem ersten realen
Codex-Lauf aus dem Arbeitsbaum; S-M3-01b Messpunkt (i).
Status: offen.
Feature/Run: F16-Vorplanung, 10.09.2026.

**F-277** · `TECH_DEBT` · P3 · offen
Titel: `WORKFLOW_V0.output_schema` wird validiert, aber von keinem Pfad gelesen.
Beschreibung: Einzige Treffer sind `validiereWorkflowDaten`
(`src/workflow/index.ts:246`) und die Typdefinition; kein Dispatch-Pfad wertet
das Feld aus. Sobald F16 es für Codex ehrt, ist ein gesetztes Schema bei
`worker: claude-code` ein uneingelöstes Versprechen.
Fundstelle: `src/workflow/index.ts:246`; `scripts/leitstand-server.mjs` (kein
Lesezugriff).
Auswirkung: Gering heute, irreführend ab F16.
Empfohlene Maßnahme: F16 WS-3 lehnt `output_schema ≠ null` bei `claude-code` im
Dispatcher ab (`ermittleNaechstenSchritt` → `haltKlaerung`), nicht in
`validiereWorkflowDaten` — siehe F-285.
Status: offen.
Feature/Run: F16-Vorplanung 10.09.2026, korrigiert 11.09.2026.

**F-278** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Roadmap-Zeilen zu F16 („`modell_beobachtet` aus JSONL", „`-m` verfügbar")
beruhten auf Doku-Lesung, nicht auf dem Spike.
Beschreibung: Die M3-Roadmap wurde vor dem Spike geschrieben; drei Annahmen
(Modellidentität im JSONL, Default-Sandbox reicht für Lesen, Rot-Fall erbracht)
sind durch `state/tp-m3-01-codex.md` widerlegt oder relativiert.
Fundstelle: `docs/projekt/zielfassung.md` §13.4 Umfeld;
`state/tp-m3-01-codex.md`.
Auswirkung: Ohne Vorplanung wäre der Bauauftrag mit falschen Vorgaben
gestartet.
Empfohlene Maßnahme: Regel für M3: Roadmap-Zeilen zu einem Feature erst nach
dem zugehörigen Spike in einen Bauauftrag übernehmen; Feature-Akte F16 zitiert
den Spike.
Status: offen.
Feature/Run: F16-Vorplanung, 10.09.2026.

**F-279** · `TECH_DEBT` · P3 · offen
Titel: `codex exec` kennt kein `--ask-for-approval`; `--approve-for-me`
impliziert `workspace-write`.
Beschreibung: `-a`/`--ask-for-approval` existiert nur am Top-Level-`codex`,
nicht an `exec`. `exec` bietet stattdessen `--approve-for-me`, laut Hilfe
„Route approval requests through automatic review using the workspace-write
sandbox" — für lesende Rollen verboten. `-m`/`--model` existiert und ist
bestätigt.
Fundstelle: `codex exec --help`, `codex --help`, `codex-cli` 0.153.4, real
gemessen 11.09.2026.
Auswirkung: Messpunkte (c)/(d) aus S-M3-01b vorab beantwortet.
Empfohlene Maßnahme: `--approve-for-me` in die Rot-Kalibrierung der Allowlist
aufnehmen.
Status: offen.
Feature/Run: F16-Gegenprüfung, 11.09.2026.

**F-280** · `TECH_DEBT` · P1 · offen
Titel: Alle npm-Shims von Codex scheitern an `pruefeStartziel` — nur der native
Vendor-Pfad ist startbar.
Beschreibung: `%APPDATA%\npm` enthält `codex`, `codex.cmd`, `codex.ps1`. `.cmd`
und `.ps1` stehen in `ENDUNGS_SPERRLISTE`; `codex` ohne Endung ist ein
POSIX-sh-Skript und unter Windows nicht per `execFile` startbar. Startbar ist
nur `…\npm\node_modules\@openai\codex\node_modules\@openai\codex-win32-x64\
vendor\x86_64-pc-windows-msvc\bin\codex.exe` — absolut, erlaubte Endung, kein
Shell-Basisname, existiert. Der Pfad enthält Paketname, Plattform-Triple und
Vendor-Layout und ist damit versions- und maschinenabhängig.
Fundstelle: `src/claude-code-gateway/prozessstart.ts:60–61`; `@openai/codex`
`bin/codex.js`; real geprüft 11.09.2026.
Auswirkung: Ohne diesen Befund wäre WS-2 am ersten Prozessstart gescheitert.
Empfohlene Maßnahme: Pfad als `worker.codex.startziel` in `startvorlagen/`
pinnen; Gate lehnt `.cmd`/`.bat`/`.ps1`-Startziele ab.
Status: offen.
Feature/Run: F16-Gegenprüfung, 11.09.2026.

**F-281** · `TECH_DEBT` · P1 · offen
Titel: Eine Verbotsliste ist für Codex strukturell untauglich — es braucht eine
Argv-Allowlist.
Beschreibung: Die entworfene Liste übersah mindestens elf real existierende
abwählende Parameter von `codex exec` 0.153.4
(`--dangerously-bypass-approvals-and-sandbox`,
`--dangerously-bypass-hook-trust`, `--ignore-user-config`, `--ignore-rules`,
`--enable`, `--disable`, `-p`/`--profile`, `--add-dir`, `-C`/`--cd`, `--oss`,
`--local-provider`, `--approve-for-me`). Entscheidend: `-c <key=value>` ist ein
generischer TOML-Override über einen offenen Schlüsselraum — eine Verbotsliste
dagegen ist nicht schließbar. `ARCHITECTURE.md` §7 („Aufrufparameter, die eine
Schutzschicht abwählen — Ausnahme: keine") verlangt eine Allowlist: nur
explizit aufgezählte Tokens passieren, alles Unbekannte lehnt ab.
Fundstelle: `codex exec --help`, real gemessen 11.09.2026; `ARCHITECTURE.md`
§7.
Auswirkung: Eine Verbotsliste erzeugt eine Schutzbehauptung, die bei der
nächsten Codex-Version still bricht.
Empfohlene Maßnahme: Allowlist in WS-1 AK2.
Status: offen.
Feature/Run: F16-Gegenprüfung, 11.09.2026.

**F-282** · `TECH_DEBT` · P2 · offen
Titel: `pruefeAufrufparameter` kann keine Präfixe — Präfix-Verbote wären eine
Bauart-Änderung am schreibenden Pfad.
Beschreibung: Die Funktion prüft `parameter.includes(wert)` auf exakte Token
plus ein Token-Fenster für Einträge mit Leerzeichen. Ein Token wie
`-c sandbox_mode="danger-full-access"` ist EIN Token mit `=` und matcht nie.
Präfixfähigkeit nachzurüsten änderte die von Claude Code mitbenutzte
E-182-Funktion.
Fundstelle: `src/invocation-policy/verbotene-aufrufparameter.ts`.
Auswirkung: Regressionsrisiko am schreibenden Pfad für einen Bedarf, den nur
Codex hat.
Empfohlene Maßnahme: Codex-Allowlist als eigene Funktion in
`src/codex-gateway/`; `pruefeAufrufparameter` unverändert.
Status: offen.
Feature/Run: F16-Gegenprüfung, 11.09.2026.

**F-283** · `TECH_DEBT` · P1 · offen
Titel: Der Result Evaluator ist durchgehend Claude-Code-spezifisch — ohne
Worker-Schalter vor `leseErgebnisobjekt` würde jeder Codex-Lauf
`FEHLGESCHLAGEN`.
Beschreibung: `ermittleErgebnis` ruft `leseErgebnisobjekt`, das `JSON.parse`
über das GESAMTE `stdout` macht und `obj.type === 'result'` verlangt. Codex
`--json` liefert JSONL (mehrere Zeilen) — `JSON.parse` scheitert, Rückgabe
`null`, Ergebnis `FEHLGESCHLAGEN`/`kein_ergebnisobjekt`. Der
`VERWEIGERT`-Zweig hängt zusätzlich an `ergebnisobjekt.permission_denials`,
einem Claude-Code-Feld. Betroffen sind also alle Ausgänge, nicht nur
`VERWEIGERT` (F-275).
Fundstelle: `src/result-evaluator/index.ts:135`;
`src/claude-code-gateway/index.ts:162–172`.
Auswirkung: Ohne Codex-Zweig zeigt WS-3 keinen grünen Schritt.
Empfohlene Maßnahme: WS-2 AK8 — Worker-Schalter VOR `leseErgebnisobjekt`.
Status: offen.
Feature/Run: F16-Gegenprüfung, 11.09.2026.

**F-284** · `TECH_DEBT` · P2 · offen
Titel: E-193 verlangt das Gate im Gateway — eine Codex-Allowlist im Dispatcher
wäre genau das verworfene Aufrufer-Gate.
Beschreibung: E-193: „Ein Gate im Aufrufer ist umgehbar, sobald irgendein
anderer Codepfad `starteGateway` direkt aufruft; ein Gate im Gateway ist es
nicht." `starteGateway` ist eine Kette ohne Modusschalter —
`pruefeStartfreigabe` läuft immer. Codex braucht ein eigenes Gateway, das
Allowlist, `verweigereStart`, `run_prepared`-Wirkungsmarke, Rohstrom und
Laufakte selbst durchsetzt.
Fundstelle: `docs/projekt/zielfassung.md:239` (E-193);
`src/claude-code-gateway/index.ts:245–302`.
Auswirkung: Ohne diese Auflage verlöre der Codex-Pfad die Auditierbarkeit des
Claude-Pfades.
Empfohlene Maßnahme: WS-2 AK7.
Status: offen.
Feature/Run: F16-Gegenprüfung, 11.09.2026.

**F-285** · `TECH_DEBT` · P2 · offen
Titel: Eine `output_schema`-Ablehnung in `validiereWorkflowDaten` bräche das
F15-Gate.
Beschreibung: `schemas/examples/kontrollzustand-workflow.valid.json` trägt in
`schritt-2-ausfuehrung` `"worker": "claude-code"` mit `"output_schema":
"kontrollzustand-laufakte"`; `scripts/check-f15-workflow.mjs` führt diese Datei
mit `sollGueltigSein: true`. Eine Validierungsregel „`claude-code` +
`output_schema` → ungültig" machte `npm run check` rot und den Bestand ungültig
(`ARCHITECTURE.md` §7, append-only).
Fundstelle: `schemas/examples/kontrollzustand-workflow.valid.json:33–36`;
`scripts/check-f15-workflow.mjs:91`.
Auswirkung: Falscher Ort für eine richtige Regel.
Empfohlene Maßnahme: Regel als sechste Zeile in `ermittleNaechstenSchritt`
(Allowlist-Bauart, → `haltKlaerung`); Bestandsdaten bleiben gültig.
Status: offen.
Feature/Run: F16-Gegenprüfung, 11.09.2026.

**F-286** · `TECH_DEBT` · P2 · offen
Titel: `loeseAusfuehrungsEingabenAuf` zieht Startziel, Version und
Berechtigungskontext pauschal aus der Startvorlage.
Beschreibung: Die Funktion setzt `werkzeugStartziel`,
`werkzeugVersionDeklariert` und `berechtigungskontext` unbedingt aus
`vorlage.*`; nur `modell` kommt bereits aus dem Schritt. Für einen
`codex`-Schritt müssen alle drei nach `schritt.worker` gewählt werden.
`werkzeugsaetze.erlaubte_werkzeuge` ist ein `--allowedTools`-Begriff ohne
Codex-Entsprechung — der `worker.codex`-Block braucht eine eigene Form.
Fundstelle: `scripts/leitstand-server.mjs:1351–1390`;
`src/startvorlage/types.ts`.
Auswirkung: WS-3-Umfang, jetzt als AK11 benannt.
Empfohlene Maßnahme: WS-3 AK11.
Status: offen.
Feature/Run: F16-Gegenprüfung, 11.09.2026.

**F-287** · `TECH_DEBT` · P1 · offen
Titel: Die B1-Auflage hat keinen Durchsetzungsmechanismus.
Beschreibung: `.claudeignore` enthält weder `.env*` noch `programm/` — obwohl
`docs/projekt/zielfassung.md:257` `.env`/`.env.local` in `.claudeignore` als
Projektkonfiguration führt. `.claudeignore` ist ohnehin ein
Claude-Code-Mechanismus, den Codex nicht liest. Der einzige gefundene
Verengungsmechanismus (`--sandbox-state-readable-root`) steht nur an
`codex sandbox`, nicht an `codex exec`.
Fundstelle: `.claudeignore`; `docs/projekt/zielfassung.md:257`;
`codex exec --help` vs. `codex sandbox --help`.
Auswirkung: E-M3-4 schriebe eine Grenze fest, die niemand durchsetzt —
`ARCHITECTURE.md` §8 („Ohne kalibrierten Rot- und Grün-Fall wird sie nicht
`ERZWUNGEN` genannt").
Empfohlene Maßnahme: E-M3-4 trägt Durchsetzungsgrad `DEKLARIERT`; S-M3-01b
Messpunkt (i); Stefan entscheidet nach der Messung, ob `ERZWUNGEN` erreichbar
ist. Zusätzlich `.env*` in `.claudeignore` nachtragen (Zielfassung Z. 257
verlangt es ohnehin).
Status: offen.
Feature/Run: F16-Gegenprüfung, 11.09.2026.

**F-288** · `TECH_DEBT` · P3 · offen
Titel: E-M3-3s Wortlaut „in der Startvorlage" widerspricht dem seit F15
gebauten Stand.
Beschreibung: `scripts/leitstand-server.mjs:1400` kommentiert
„`schritt.modell` -> `aufrufEingaben.modell` (E-185/E-M3-3: das gepinnte
Plandatum des Schritts, nie `vorlage.modell`)". Die Besetzung lebt am Schritt,
mit ausdrücklicher E-M3-3-Berufung. Nicht F16 weicht ab — `main` weicht bereits
ab.
Fundstelle: `docs/projekt/zielfassung.md:357`;
`scripts/leitstand-server.mjs:1400`; `src/workflow/types.ts`.
Auswirkung: Doku-Drift; ein späterer Leser hielte die gebaute Lösung für einen
Regelbruch.
Empfohlene Maßnahme: E-M3-3-Präzisierung (Aufgabe 3, von Stefan bestätigt).
Status: offen.
Feature/Run: F16-Gegenprüfung, 11.09.2026.

**F-289** · `HARNESS_IMPROVEMENT` · P3 · offen
Titel: Die Spike-Verweigerung stammt aus der execpolicy-Schicht
(`CreateProcess`), nicht aus dem Read-Only-Sandbox.
Beschreibung: Lauf 1 (reiner Lesebefehl) wurde mit exakt derselben Fehlerform
abgelehnt wie der Schreibbefehl in Lauf 2; die Ablehnung erfolgt beim
Programmstart von `powershell.exe`, vor jeder Schreibprüfung.
`codex exec --help` nennt mit `--ignore-rules` genau diese Schicht („Do not
load user or project execpolicy `.rules` files").
Fundstelle: `state/tp-m3-01-codex.md` Lauf 1/2; `codex exec --help`.
Auswirkung: Ursachenbefund zu F-273; jeder künftige Rot-Fall braucht einen
gelingenden Lesebefehl als Kalibrierung.
Empfohlene Maßnahme: Kalibrierungspflicht in AK9 und in S-M3-01b (b).
Status: offen.
Feature/Run: F16-Gegenprüfung, 11.09.2026.

**F-290** · `TECH_DEBT` · P2 · offen
Titel: A1s `config.toml` ist nicht hash-pinnbar (E-188) und am Argv abwählbar.
Beschreibung: `~/.codex/config.toml` liegt außerhalb des Repos und außerhalb
des E-188-Gültigkeitsschlüssels; `--ignore-user-config`, `-c`/`--config`,
`-p`/`--profile`, `--enable`/`--disable` heben sie am Argv vorbei auf.
Fundstelle: `codex exec --help`; `src/invocation-policy/types.ts`
(`Gueltigkeitsschluessel`).
Auswirkung: Die Zusicherung „read-only" hinge sonst an einer Datei, die der
Kern weder sieht noch schützt.
Empfohlene Maßnahme: `--sandbox read-only` zusätzlich am Argv (dort
protokolliert und pinnt E-182); Allowlist lässt keinen Abwahlparameter durch.
Status: offen.
Feature/Run: F16-Gegenprüfung, 11.09.2026.

**F-291** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Die Gegenprüfung lief gegen ein veraltetes lokales `origin/main`.
Beschreibung: Der lokale Arbeitsbaum kannte nur `94c57fe` (PR #124); der reale
Kopf von `main` auf GitHub ist `20d7d80` (PR #125, „docs(findings): F-182
gelöst …"), gegen den die Planungssitzung gelesen hat. Ursache: kein
`git fetch` seit PR #124 — kein Planungsfehler.
Fundstelle: `git log origin/main` lokal vs. GitHub.
Auswirkung: Zeilenangaben können um wenige Zeilen abweichen; keine inhaltliche
Abweichung festgestellt.
Empfohlene Maßnahme: Vor jeder Gegenprüfung und jedem Bau `git fetch` (Stefan,
Terminal).
Status: offen.
Feature/Run: F16-Gegenprüfung, 11.09.2026.

**F-292** · `TECH_DEBT` · P2 · offen
Titel: Die Windows-Sandbox bringt einen eigenen Setup-Pfad mit.
Beschreibung: Das Paket enthält
`codex-resources/codex-windows-sandbox-setup.exe`; `codex sandbox` beschreibt
sich als „Windows restricted token sandbox". Ein Setup-Schritt über
`config.toml` hinaus ist möglich.
Fundstelle: `@openai/codex-win32-x64/vendor/…/codex-resources/`.
Auswirkung: Ohne Klärung misst S-M3-01b erneut nur die execpolicy-Schicht.
Empfohlene Maßnahme: S-M3-01b Messpunkte (h)/(k).
Status: offen.
Feature/Run: F16-Gegenprüfung, 11.09.2026.

**F-293** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: „`codex sandbox windows`" ist kein Prüfbefehl — der geplante
Vorab-Schritt für Stefan war wirkungslos.
Beschreibung: `codex sandbox` nimmt `[COMMAND]...` als freie Argumente;
„windows" wurde als auszuführendes Kommando interpretiert und real gestartet:
„windows sandbox failed: `CreateProcessAsUserW` failed: 2 … cmd=windows
--help". Es gibt keinen Unterbefehl „windows". Der Schritt stammte aus einer
[Annahme] der Planungssitzung, die nicht real geprüft war.
Fundstelle: `codex sandbox --help`; real gemessen 11.09.2026.
Auswirkung: Der Vorab-Schritt richtet nichts ein und belegt nichts.
Empfohlene Maßnahme: Schritt ersatzlos gestrichen; Vorbedingungen in S-M3-01b
neu gefasst. Regel: Befehle für Stefans Terminal nur aus real geprüfter Hilfe,
nie aus Doku-Lesung.
Status: offen.
Feature/Run: F16-Gegenprüfung, 11.09.2026.

**F-294** · `TECH_DEBT` · P2 · offen
Titel: Der Windows-Restricted-Token-Sandbox greift ohne `~/.codex/config.toml`.
Beschreibung: Ein `codex sandbox`-Aufruf versuchte `CreateProcessAsUserW`,
obwohl `~/.codex/config.toml` nicht existiert; `~/.codex/.sandbox_migration`
datiert vom Spike-Tag (09.09.), `~/.codex/cap_sid` und `~/.codex/.sandbox`
existieren. Belegt für `codex sandbox`, ungemessen für `codex exec`.
Fundstelle: `~/.codex/`-Verzeichnislisting; Ausgabe von `codex sandbox`,
11.09.2026.
Auswirkung: A1s `config.toml`-Schritt könnte redundant oder wirkungslos sein.
Empfohlene Maßnahme: S-M3-01b Messpunkt (h) misst mit und ohne `config.toml`.
Status: offen.
Feature/Run: F16-Gegenprüfung, 11.09.2026.

**F-295** · `TECH_DEBT` · P3 · offen
Titel: Zwei Einträge der entworfenen Codex-Verbotsliste existieren in
`codex exec` 0.153.4 nicht.
Beschreibung: `--full-auto` und `--yolo` kommen weder in `codex exec --help`
noch in `codex --help` vor. Eine Rot-Kalibrierung darauf misst nichts und
erzeugt einen falschen Eindruck von Abdeckung.
Fundstelle: `codex exec --help`, `codex --help`, 11.09.2026.
Auswirkung: keine (Liste ersetzt).
Empfohlene Maßnahme: entfällt mit der Allowlist (F-281).
Status: offen.
Feature/Run: F16-Gegenprüfung, 11.09.2026.

**F-296** · `TECH_DEBT` · P2 · offen
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
Status: offen.
Feature/Run: F16-Gegenprüfung, 11.09.2026.

**F-297** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Falsche Belegstelle für das Shell-String-Grep-Muster im Auftragsentwurf.
Beschreibung: Zitiert war `scripts/check-f4-invocation-policy.mjs:259` — dort
steht ein Bedingung-2-Drift-Fall. Das wortgrenzensichere Muster samt Selbsttest
steht in `scripts/check-f6a-claude-code-gateway.mjs:150–177` (AK14, F-057).
Fundstelle: beide Dateien.
Auswirkung: keine (vor Ausgabe korrigiert).
Empfohlene Maßnahme: Verweis in Auftrag 2 korrigiert.
Status: offen.
Feature/Run: F16-Gegenprüfung, 11.09.2026.

**F-298** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Eine nur lesend gedachte Gegenprüfung hat einen zustandsändernden Befehl
auf der Maschine ausgeführt.
Beschreibung: Der Aufruf „`codex sandbox windows`" (zur Prüfung des
Vorab-Schritts) hat `~/.codex/cap_sid` und `~/.codex/.sandbox` angelegt bzw.
aktualisiert. Außerhalb des Repos, offengelegt, kein Schaden — aber die
Bridge-Regel kennt nur Git-Befehle; für Werkzeugaufrufe mit Seiteneffekt
außerhalb des Repos gibt es keine Regel.
Fundstelle: `~/.codex/` (Zeitstempel 11.09.2026 07:36); Bridge- und
Git-Sicherheitsregel (Projektinstruktion).
Auswirkung: gering.
Empfohlene Maßnahme: Regel ergänzen: Aus Prüfsitzungen nur `--help`/
`--version` fremder Werkzeuge; jeder Aufruf, der Prozesse startet oder Dateien
außerhalb des Repos schreibt, ist Stefans Terminal-Schritt oder Teil eines
Messauftrags.
Status: offen.
Feature/Run: F16-Gegenprüfung, 11.09.2026.
