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

**F-004** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Handoff-Vertragsvorlage deckt fehlgeschlagenen Kalibrierungstest nicht ab.
Beschreibung: ESCALATE-Klauseln decken „Prüfung meldet unerwarteten Befund", aber nicht „erwarteter Rot-Fall tritt nicht ein" (Kalibrierung reproduziert sich selbst nicht).
Fundstelle: `state/tasks/ebene2-architektur-in-repo-nachziehen.md`, Abschnitt ESCALATE; betrifft den Skill `handoff-vertrag` generell.
Auswirkung: ausführende Sitzung musste improvisieren (korrekt gehandelt, aber ungedeckt).
Maßnahme: `handoff-vertrag`-Skill/Vorlage um diesen Fall ergänzen.
Feature/Run: Bauauftrag `ebene2-architektur-in-repo-nachziehen`, 28.08.2026.

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

**F-009** · `TECH_DEBT` · P3 · offen
Titel: `package.json` Name `"projektname"` nicht umbenannt.
Fundstelle: `package.json:2`.
Auswirkung: kosmetisch, taucht in Lauf-Logs auf (`state/gates.md`).
Maßnahme: auf `"ai-workforce"` setzen.
Feature/Run: qa-Review Runde 1, 28.08.2026.

**F-010** · `TECH_DEBT` · P4 · offen
Titel: `kontrollzustand/`/`profiles/` in `ARCHITECTURE.md` im Präsens beschrieben, existieren noch nicht.
Fundstelle: `ARCHITECTURE.md` Abschnitt 1.
Auswirkung: niedrig, über `docs/STATUS.md` indirekt auflösbar; `ARCHITECTURE.md` selbst macht Soll/Ist nicht kenntlich.
Maßnahme: erledigt sich mit Feature 0 (Datenformate); optional vorher ein „geplant"-Hinweis ergänzen.
Feature/Run: qa-Review Runde 1, 28.08.2026.

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

**F-016** · `TECH_DEBT` · P3 · offen
Titel: `state/memory-map.md` Zeile 2 trägt noch `[PROJEKTNAME]` statt „AI Workforce".
Fundstelle: `state/memory-map.md:2`.
Auswirkung: niedrig, aber echter übersehener Platzhalter — inkonsistent mit den drei neu ergänzten, korrekt befüllten Zeilen direkt darunter.
Maßnahme: `[PROJEKTNAME]` durch „AI Workforce" ersetzen.
Feature/Run: Verifikation AF-F001-Planung, Schritt A, 28.08.2026.
