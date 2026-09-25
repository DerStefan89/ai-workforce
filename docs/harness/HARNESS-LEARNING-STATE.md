<!--
Ziel-Pfad im Repo: docs/harness/HARNESS-LEARNING-STATE.md
Diese Datei verändert sich mit jedem abgeschlossenen Zyklus — bei
Zyklus-Ende aktualisieren. Ein Zyklus-Abschluss ohne Nachtrag hier ist der
teuerste Fehler, den dieses Harness kennt: Er fällt keinem Gate auf, weil
eine nie aktualisierte Datei per Definition in sich konsistent ist —
genau deshalb existiert Prüfung 4 im Doku-Gate. Sofort nach
Zyklus-Ende committen, nicht als "eigener Schritt, falls nötig" vertagen.
-->
# Harness Learning State — AI Workforce

Stand dieser Fassung: 2026-09-26

Diese Datei existiert PRO PROJEKT, nicht zentral über mehrere Projekte
hinweg — auch wenn Funde und Fallen sich zwischen Projekten inhaltlich
ähneln können, sind sie hier an konkretem Code dieses Repos belegt. Das
dokumentübergreifende Doku-Gate (Prüfung 4 in `scripts/check-docs.mjs`)
setzt das voraus: es koppelt diese Datei an `HARNESS-CHANGELOG.md` IM
SELBEN REPO.

## Abgeschlossene Zyklen

- M1–M4 abgeschlossen, M5 laufend. Einzelstand je Feature: `docs/STATUS.md`.

## Bereits gelernt und gebaut (mit Repo-Nachweis)

- Freigabedatei-Pflicht nur für Claude-Commits (F-736): `.claude/hooks/commit-guard.cjs`.
- Workforce-Assets gegen installWurzel aufgelöst (E-F41-2, F-676): `src/projekt-anlegen/index.ts`, `features/F41/review-pass.md`.
- Projektmodus-Allowlist und Stack-Nachzug, Regeln 1g/1h (F42): `src/workflow/index.ts`.
- Prüfkette unverändert, Regel 1j inkl. `pruefketten_pfade` (F-713, F-735): `src/aenderungsuebersicht/index.ts`, `src/workflow/index.ts`.
- Kontrollzustand-Sicherung `npm run zustand:sichern` (F-733): `scripts/zustand-sichern.mjs`.

## Praktisch getestet (Nachweis im Repo vorhanden)

- Unabhängiger Review-Pass vor der F42-Abnahme: `features/F42/review-pass.md`.
- Rot-/Grün-Fälle für 1g/1h/1j und F-734: `scripts/check-fixpaket-f30-vorbedingungen.mjs`.

## Noch unsicher / nicht aus dem Repo rekonstruierbar

- Modellwahl: Messung Chat #81, je 0 Korrekturrunden mit Sonnet (F35 WS-1..3)
  und Opus (Fixpaket, zustand-sichern); Opus fand mehr Randfälle selbst.
  Arbeitshypothese: komplexe Aufträge Opus, kleine Sonnet. Stichprobe klein.
- F-730: Ob `ausfuehrung`-Läufe Subagenten/Skills selbst aufrufen, ist ungemessen.

## Verhaltensregeln für künftige Sessions

- **Aus der Geräte-Brücke nur index-neutrale git-Befehle (`git log`, `git show <rev>:<pfad>`, `git diff <revA> <revB>`) laut `docs/harness/geraete-bruecke-verifikation.md`; nie status/fetch/pull/checkout/commit.**
  Beleg: F-100, F-126 (fünf index.lock-Vorfälle).
- **Stefan committet in PowerShell ohne Freigabedatei; für jeden Commit und jeden Push aus Claude Code legt Stefan je eine Freigabedatei im eigenen Editor an.**
  Beleg: F-736; das Modell kann sie nicht selbst schreiben (`.claude/hooks/guard-settings.js`, `.claude/hooks/commit-guard.cjs`).
- **Wartepunkte (Web-Merge, CI) stehen nie in einem Einfüge-Block; die Befehle vor und nach dem Wartepunkt kommen in getrennte Blöcke.**
  Beleg: F-737. Am 25.09.2026 lief `git checkout main` vor dem Merge von #261
  und setzte `kontrollzustand/` lokal zurück.
- **Zwischen `zustand:sichern` und Merge+Pull: kein Leitstand, keine Claude-Code-Sitzung im Verzeichnis, kein checkout main.**
  Beleg: F-737.
- **Ein Gate prüft den realen Aufrufpfad, nicht nur die reine Funktion.**
  Beleg: F-708 (F-703, F-707).
- **Review-Pass-Aufträge sind neutral formuliert und geben keine Bewertung vor.**
  Beleg: F-665.
- **Workforce-eigene Assets werden gegen installWurzel aufgelöst, nie gegen repoWurzel.**
  Beleg: F-676, F-677, F-683.
- **Die Iteration wird vor einer Korrekturschleife committet.**
  Beleg: F-647.
- **Ein Auftrag an Claude Code trägt den Volltext, nie nur einen Verweis auf ein Dokument außerhalb des Repos.**
  Beleg: F-013, F-082, F-092.
- **Jeder Bauauftrag enthält eine Harness-Einordnung (Ebene, Advisor-Pass ja/nein mit Grund, Prüfpass, Doku-Heimaten laut memory-map) und wird als `state/tasks/<id>.md` abgelegt.**
  Beleg: F-739, F-741. Der F-735-Doku-Nachzug (ARCHITECTURE.md §1, `state/gates.md`)
  fehlte und kam erst mit dem Auftrag `state/tasks/harness-gedaechtnis.md`.
