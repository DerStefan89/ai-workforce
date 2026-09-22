# Journal — F23

Anhängeprotokoll. Neue Einträge unten anfügen, bestehende nicht ändern.

## 2026-09-22 — Status FEATURE_GATE → ABGESCHLOSSEN (E-M5-1, Doku-only)

Stefan hat im Challenger-Chat am 20.09.2026 entschieden (E-M5-1,
M4-Abschluss Option A): F23 wird mit seinen dokumentierten Restfindings
auf `ABGESCHLOSSEN` gesetzt, statt weiter auf `FEATURE_GATE` zu stehen —
die Restfindings bleiben offen (M5-Backlog), keine stillschweigende
Streichung. Betroffen: F-378 (kein Werkzeugsatz enthält ein lesendes
Git/Bash, WS-0 umgeht das strukturell über den Kern statt eine Rolle),
F-389 (ADJUST-Zweig übernimmt `workflowStatusZuAusgang`s vollen
Wertebereich, auch `'LAEUFT'` für den Ausgang `'starte'` — heute
strukturell unerreichbar), F-392 (Navigation nennt den Menüpunkt "Runs",
obwohl er auch den Workflow-/Abnahme-Bereich abdeckt).

Diese Entscheidung stand bislang nur im Challenger-Chat, nicht im Repo
(Ursache von `state/findings.md` F-534). Nachgezogen als Teil des
Doku-Auftrags "F-534 Teil 2 — M5-Entscheidungen ins Repo nachziehen":
`docs/projekt/zielfassung.md` §13.5 (Fakt-Nachtrag) und neuer §13.6
(E-M5-1 im vollen Wortlaut), `docs/STATUS.md` ("Aktuelle Phase" und
Meilenstein-4-Liste), dieser Statuswechsel.
