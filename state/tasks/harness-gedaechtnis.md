SCHRITT 0: Arbeitsverzeichnis ausgeben und gegen C:\Users\stefa\Projekte\ai-workforce prüfen. Bei Abweichung: abbrechen, melden, nichts ändern.
Vorbedingung: `git branch --show-current` = main; `git --no-pager diff --cached --stat` leer; `git --no-pager log -1 --oneline` zeigt den Merge von #262 (F-735) oder später. Sonst STOPPEN und berichten.
Dann: `git checkout -b docs/harness-gedaechtnis`.

## TASK: harness-gedaechtnis

GOAL: Die Lern-Dateien des Harness tragen erstmals echten Inhalt (F-740). Das Dokumentpaar CHANGELOG → LEARNING-STATE ist als Gate aktiv (check-docs Prüfung 4, kalibriert). Die offenen Nachzüge aus F-735 (ARCHITECTURE.md §1, state/gates.md) sind erledigt. Die Findings F-737 bis F-743 stehen im Repo. CLAUDE.md liegt wieder unter 200 Zeilen. Dieser Vertrag liegt als state/tasks/harness-gedaechtnis.md im Repo (F-741).

CONTEXT:
- Pflichtlektüre: ARCHITECTURE.md, state/memory-map.md, docs/harness/HARNESS-OVERVIEW.md (Regelhierarchie, vier Ebenen).
- Die Lern-Dateien stehen seit dem Setup auf dem Template-Stand:
  - docs/harness/HARNESS-LEARNING-STATE.md: „noch keiner — Zyklus 1“.
  - docs/harness/HARNESS-CHANGELOG.md: eine Template-Zeile.
  - state/reibung.md: nur [FÜLLUNG].
  - state/triggers.md: [PROJEKTNAME].
  - state/gates.md: Titel mit [PROJEKTNAME].
- scripts/check-docs.mjs Prüfung 4 (ca. Z. 241–250): Das Paar `{ quelle: 'docs/harness/HARNESS-CHANGELOG.md', ziel: 'docs/harness/HARNESS-LEARNING-STATE.md' }` ist auskommentiert. Laut Kommentar wird es eingetragen, sobald beide Dateien echten Inhalt haben.
- F-735 (#262) hat Regel 1j/1h erweitert. ARCHITECTURE.md §1 nennt in der Aufzählung der Startvorlagen-Felder weder pruefbefehl noch pruefketten_pfade. state/gates.md führt 1j/1h nicht.
- scripts/check-contract.mjs prüft state/tasks/*.md auf SCHRITT 0 und die acht Marker.
- Advisor-Pass: bewusst nicht durchgeführt. Die Aktivierung von Prüfung 4 ist im Template vorgesehen (SETUP.md Punkt 5), einzeilig und reversibel, Rot und Grün werden unten kalibriert. Der Rest ist Doku. Begründung in den Bericht übernehmen.
- Harness-Einordnung: Dieser PR hebt F-740 von Ebene 1 (Text) auf Ebene 3 (Gate).

SCOPE:
1. docs/harness/HARNESS-LEARNING-STATE.md: Template-Platzhalter ersetzen. Titel „Harness Learning State — AI Workforce“. Die Zeile „Stand dieser Fassung: 2026-09-26“ am Zeilenanfang (außerhalb des HTML-Kommentars; Tag der Erstellung). Die Abschnittsstruktur beibehalten. Inhalt:
   - „Abgeschlossene Zyklen“: „M1–M4 abgeschlossen, M5 laufend. Einzelstand je Feature: docs/STATUS.md.“ Keine Feature-Liste duplizieren (memory-map).
   - „Bereits gelernt und gebaut (mit Repo-Nachweis)“, je eine Zeile mit Pfad:
     - Freigabedatei-Pflicht nur für Claude-Commits (F-736, .claude/hooks/commit-guard.cjs).
     - Workforce-Assets gegen installWurzel (E-F41-2, F-676).
     - Projektmodus-Allowlist und Stack-Nachzug, Regeln 1g/1h (F42, src/workflow/index.ts).
     - Prüfkette unverändert, Regel 1j inkl. pruefketten_pfade (F-713, F-735).
     - Kontrollzustand-Sicherung `npm run zustand:sichern` (F-733, scripts/zustand-sichern.mjs).
   - „Praktisch getestet“: features/F42/review-pass.md sowie die Gate-Datei scripts/check-fixpaket-f30-vorbedingungen.mjs. Nur Pfade nennen, die existieren.
   - „Noch unsicher“:
     - Modellwahl: Messung Chat #81, je 0 Korrekturrunden mit Sonnet (F35 WS-1..3) und Opus (Fixpaket, zustand-sichern); Opus fand mehr Randfälle selbst. Arbeitshypothese: komplexe Aufträge Opus, kleine Sonnet. Stichprobe klein.
     - F-730: Ob ausfuehrung-Läufe Subagenten/Skills selbst aufrufen, ist ungemessen.
   - „Verhaltensregeln für künftige Sessions“: je ein fett gesetzter Satz plus der Vorfall als Beleg. Nur Regeln, die NICHT schon in CLAUDE.md stehen (keine Duplikate):
     a. **Aus der Geräte-Brücke kein git, auch nicht lesend — nur Dateien lesen.** Beleg: F-100, F-126 (fünf index.lock-Vorfälle), docs/harness/geraete-bruecke-verifikation.md.
     b. **Stefan committet in PowerShell ohne Freigabedatei; Claude Code schreibt je eine vor Commit und vor Push.** Beleg: F-736.
     c. **Wartepunkte (Web-Merge, CI) stehen nie in einem Einfüge-Block; die Befehle vor und nach dem Wartepunkt kommen in getrennte Blöcke.** Beleg: F-737. Am 25.09.2026 lief `git checkout main` vor dem Merge von #261 und setzte kontrollzustand/ lokal zurück.
     d. **Zwischen `zustand:sichern` und Merge+Pull: kein Leitstand, keine Claude-Code-Sitzung im Verzeichnis, kein checkout main.** Beleg: F-737.
     e. **Ein Gate prüft den realen Aufrufpfad, nicht nur die reine Funktion.** Beleg: F-708 (F-703, F-707).
     f. **Review-Pass-Aufträge sind neutral formuliert und geben keine Bewertung vor.** Beleg: F-665.
     g. **Workforce-eigene Assets werden gegen installWurzel aufgelöst, nie gegen repoWurzel.** Beleg: F-676, F-677, F-683.
     h. **Im Fremdprojekt wird die Iteration vor einer Korrekturschleife committet.** Beleg: F-647.
     i. **Ein Auftrag an Claude Code trägt den Volltext, nie nur einen Verweis auf ein Dokument außerhalb des Repos.** Beleg: F-013, F-082, F-092.
     j. **Jeder Bauauftrag enthält eine Harness-Einordnung (Ebene, Advisor-Pass ja/nein mit Grund, Prüfpass, Doku-Heimaten laut memory-map) und wird als state/tasks/<id>.md abgelegt.** Beleg: F-739, F-741. Der F-735-Doku-Nachzug fehlte und kam erst mit diesem PR.
   - Existiert eine zitierte Finding-ID nicht in state/findings.md, die Regel NICHT erfinden, sondern im Bericht melden.
2. docs/harness/HARNESS-CHANGELOG.md: Titel „Harness Changelog — AI Workforce“. Die Template-Zeile ersetzen durch (Datum | Änderung):
   - 2026-08-28 | Freigabedatei-Pflicht wiederhergestellt (Vertrag harness-freigabedatei-wiederherstellung, PR #12)
   - 2026-09-24 | Workforce-eigene Assets gegen installWurzel (E-F41-2, F-676)
   - 2026-09-25 | Projekt-Harness F42 abgenommen: Regeln 1g/1h (E-F42-WS4 = A)
   - 2026-09-25 | Regel 1j Prüfkette unverändert (F-713, #259), stack-unabhängig (F-735, #262)
   - 2026-09-25 | Freigabedatei nur für den Claude-Weg (F-736), Kontrollzustand-Sicherung (F-733, #260/#261)
   - 2026-09-26 | Lern-Dateien befüllt, check-docs Prüfung 4 (CHANGELOG → LEARNING-STATE) aktiviert, erster Handoff-Vertrag seit F11 (F-740, F-741)
   Jedes Datum gegen state/findings.md bzw. git log prüfen. Weicht es ab, das belegte Datum nehmen und die Abweichung melden. Die letzte Zeile trägt 2026-09-26; alle übrigen Zeilen bleiben mit ihrem belegten Datum.
3. state/reibung.md: Titel „Reibungs-Log — AI Workforce“. Die [FÜLLUNG]-Zeile durch diese Zeilen ersetzen (Datum | Was | Wo | Kosten | Erledigt?). Keinen „Stand dieser Fassung“-Marker setzen (siehe Kopfkommentar der Datei).
   - 2026-09-25 | checkout main vor Merge der Zustandssicherung | Terminal-Block des Challengers | ~15 min, kein Verlust | ja (F-737)
   - 2026-09-25 | F-735-Nachtrag (Doku-Nachzug) nicht angekommen | Prompt-Übergabe | Nachzug verschoben | ja (dieser PR, F-739)
   - 2026-09-25 | Freigabedatei für manuelle Commits verlangt | Skriptausgabe zustand:sichern | Rückfrage | ja (F-736)
   - 2026-09-23 | EPERM beim Aufräumen kontrollzustand-test-* | npm run check | wiederholte Läufe | ja (F-590, #228)
   - offen | Perf-Gate zustand-poll-kosten sporadisch rot | npm run check | Wiederholung nötig | nein (eigenes Finding bei nächstem Auftreten)
   - laufend | PowerShell 5: ConvertFrom-Json scheitert an ~/.claude.json | manuelle Diagnose | Umweg über `node -e` | Workaround
4. CLAUDE.md: Den Block „Symptom (behoben, F-590, 23.09.2026) …“ in „Bekannte Fallen“ entfernen; er steht jetzt in state/reibung.md. Danach `wc -l CLAUDE.md` ≤ 200 (F-743). Sonst nichts an CLAUDE.md ändern.
5. state/triggers.md: Titel „Trigger-Inventar — AI Workforce“. Die [FÜLLUNG]-Zeile ersetzen durch:
   - | Reallauf beendet | ein Reallauf in einem Projekt ist abgeschlossen | `npm run zustand:sichern` bei gestopptem Leitstand; Commit/PR, Merge, Pull als getrennte Schritte | Mensch |
   - | Bauauftrag verfassen | ein Auftrag an Claude Code wird geschrieben | Harness-Einordnung aufnehmen, Auftrag als state/tasks/<id>.md im selben PR | Challenger |
   - Die Bedingung der bestehenden Zeile „Zyklus-Ende“ präzisieren: „Feature abgenommen oder harness-relevanter PR gemergt“.
6. scripts/check-docs.mjs Prüfung 4: Das Paar CHANGELOG → LEARNING-STATE aktivieren (Kommentarzeichen entfernen, den [FÜLLUNG]-Hinweis im Kommentar auf „aktiviert 2026-09-25, F-740“ ändern).
   Kalibrieren, nichts davon committen:
   - Rot: Im Changelog temporär eine Zeile mit Datum 2026-12-31 anhängen → npm run check rot mit Prüfung-4-Befund.
   - Zurücknehmen → grün.
   - Beide Beobachtungen in den Kalibrierungs-Log von state/gates.md eintragen.
7. state/gates.md:
   - Titel „Objective Gates — AI Workforce“.
   - Tabellenzeile „Doku-Gate“: die Beschreibung von Prüfung 4 um „Paar CHANGELOG → LEARNING-STATE aktiv seit 2026-09-25“ ergänzen.
   - Neue Tabellenzeile im bestehenden Format (| Gate | Datei | Prüft | Rot-Fall | Grün-Fall |): Regel 1j Prüfkette unverändert plus 1h-Pflicht pruefketten_pfade (F-713, F-735).
     - Datei: src/workflow/index.ts, src/aenderungsuebersicht/index.ts; Gate scripts/check-fixpaket-f30-vorbedingungen.mjs.
     - Rot: die realen Fall-Buchstaben aus dem Gate (u. a. (c)(d)(e)(h)(i)(j)(l)(l2)(m); am Gate prüfen, nicht abschreiben).
     - Grün: (k).
     - Durchsetzungsgrad ERZWUNGEN nach ARCHITECTURE.md §8, nur wenn Rot und Grün real im Gate laufen.
     - Bekannte Grenzen: Die Prüfkette läuft vom Stand der Arbeitskopie; Groß-/Kleinschreibung zählt; die Default-Liste gilt nur ab Repo-Wurzel.
8. ARCHITECTURE.md §1, Eintrag startvorlagen/: einen Satz ergänzen: „Projektspezifische Prüfkonfiguration liegt ebenfalls in der Startvorlage: pruefbefehl (F-652) und pruefketten_pfade (F-735, ergänzt die Default-Liste der Regel 1j).“ Nur die Regel, keine Herleitung.
9. state/findings.md: neue Findings im bestehenden Format ergänzen (Titel, Beschreibung, Fundstelle, Auswirkung, Maßnahme, Status, Feature/Run):
   - F-737 · HARNESS_IMPROVEMENT · P2 · offen
     - Titel: `zustand:sichern` lässt HEAD auf dem Zustandsbranch mit gestagtem Index stehen, ohne vor parallelen Sitzungen und vor `checkout main` vor dem Merge zu warnen.
     - Beleg: Der Vorfall vom 25.09.2026 (checkout main vor dem Merge von #261 setzte kontrollzustand/ lokal zurück, kein Verlust).
     - Maßnahme: Skriptausgabe mit Warnhinweis, Merge und Pull als eigener Schritt. Regel c/d im Learning-State ist erledigt (dieser PR).
     - Feature/Run: erste Sicherung, 25.09.2026.
   - F-738 · PROCESS_IMPROVEMENT · P2 · offen
     - Titel: E-F36-1 verweist für die Bestätigung auf „bestehende planaenderung“; die kann aber nur Freigaben abschwächen (src/entscheidung/types.ts, FREIGABEPFLICHT_ABGESCHWAECHT), keine Schritte hinzufügen. Zusätzlich hat die Rolle qa kein Output-Schema (src/rollen/index.ts).
     - Maßnahme: in der F36-Akte und der zielfassung präzisieren (E-F36-2).
     - Feature/Run: F36-Challenge-Vorbereitung.
   - F-739 · PROCESS_IMPROVEMENT · P2 · behoben (dieser PR)
     - Titel: Bauaufträge nannten die Harness-Pflichten (Prüfpass, Advisor-Entscheidung, Doku-Heimaten) nicht durchgängig.
     - Beleg: F-735-Doku-Nachzug fehlte.
     - Maßnahme: Verhaltensregel j und Trigger „Bauauftrag verfassen“.
   - F-740 · HARNESS_IMPROVEMENT · P1 · behoben (dieser PR)
     - Titel: Die Lern-Dateien des Harness waren seit dem Setup unbefüllt.
     - Maßnahme: befüllt, check-docs Prüfung 4 aktiviert und kalibriert.
   - F-741 · PROCESS_IMPROVEMENT · P2 · behoben (dieser PR)
     - Titel: Bauaufträge wurden seit F11 nicht mehr als Handoff-Vertrag unter state/tasks/ abgelegt.
     - Maßnahme: dieser Vertrag als erster, Trigger „Bauauftrag verfassen“.
   - F-742 · TECH_DEBT · P2 · offen
     - Titel: state/findings.md mit über 10.000 Zeilen.
     - Maßnahme: erledigte Findings archivieren, den Parser src/workboard/findings.ts anpassen, die IDs stabil halten. Nach F36.
   - F-743 · HARNESS_IMPROVEMENT · P3 · behoben (dieser PR)
     - Titel: CLAUDE.md über der 200-Zeilen-Grenze (Zähne-Taxonomie S19).
     - Maßnahme: F-590-Block nach state/reibung.md verschoben.
   - F-733: Status auf „behoben (#260 zustand:sichern, erste Sicherung #261, 25.09.2026)“ setzen.
10. state/tasks/harness-gedaechtnis.md: diesen Vertrag wörtlich ablegen (von „SCHRITT 0“ bis „ESCALATE“ einschließlich). Das Vertrags-Gate muss grün sein.

NICHT:
- Kein Produktcode unter src/, keine Änderung an Gates außer der einen Zeile in check-docs Prüfung 4.
- Keine Änderung am Glossar (F-731 gehört zu F36), kein Archiv von findings.md (F-742), keine Änderung an memory-map.
- Keine Regel ohne belegten Vorfall; keine Feature-Liste aus STATUS.md duplizieren.
- Nichts unter kontrollzustand/, keine state/nachweis-runde2-*, kein stdin-check.js.
- Kein -A. Kein Commit, kein Push.

BUDGET: ein Baudurchgang plus höchstens eine Korrekturrunde. Modell Sonnet.

OUTPUT:
- `npm run check` Exit 0 (inkl. Doku-, Vertrags- und Regel-Gate).
- Rot/Grün-Kalibrierung von Prüfung 4 im Kalibrierungs-Log.
- `wc -l CLAUDE.md` ≤ 200.
- Prüfpass: Subagent `code-reviewer` in frischem Kontext auf den Diff (Doku-Konsistenz, tote Verweise, Duplikate zu CLAUDE.md/memory-map); Urteil in den Bericht.
- Gezielt stagen, `git --no-pager diff --cached --stat` in den Bericht.
- Bericht knapp: Dateien · Checks mit Ergebnis · Kalibrierung Prüfung 4 · Urteil code-reviewer · Advisor-Pass-Begründung · Abweichungen (u. a. korrigierte Daten oder nicht gefundene Finding-IDs) · Blocker · diff --cached --stat · Modell.

ESCALATE: Anhalten und berichten statt selbst entscheiden, wenn:
- eine zitierte Finding-ID oder ein Pfad nicht existiert und die Regel dadurch unbelegt wäre;
- Prüfung 4 nach der Aktivierung ohne Kalibrierungsänderung rot ist (z. B. wegen bestehender Daten im Changelog);
- CLAUDE.md sich nicht ohne inhaltlichen Verlust unter 200 Zeilen bringen lässt;
- das Vertrags-Gate an diesem Dokument scheitert.

<!-- Korrekturen Stefan vor dem Start (26.09.2026), oben eingearbeitet: Stand-Datum Learning-State 2026-09-26; letzte Changelog-Zeile 2026-09-26; Rot-Fall der Kalibrierung mit 2026-12-31. -->
