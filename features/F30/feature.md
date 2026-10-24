# F30 — Dogfooding: Opportunity Scanner

## ID
F30

## Titel
Dogfooding: Opportunity Scanner

## Status
Status: ENTWURF

Angelegt als Entwurf in F45 B5b-1a (24.10.2026, `features/F45/plan-b5b1-v2.md`), damit Roadmap und Akten übereinstimmen
(R1/R3, `docs/projekt/fixpaket-f45.md` §2) und die Ausnahme `ohne_akte` für F30 in `scripts/check-akte-meilenstein.mjs`
entfällt. Inhalt nur aus vorhandenen Quellen: `docs/projekt/zielfassung.md` (E-M5-15, Zielsatz und Bestehensbedingung M5/V1,
E-M5-16, E-M5-17, E-M5-18) und `docs/projekt/fixpaket-f45.md`. Was dort nicht steht, ist als „offen“ gekennzeichnet. F30
beginnt nach dem Fixpaket „Arbeitsfähigkeit“ (E-M5-18) und wird mit der Workforce selbst entwickelt (`fixpaket-f45.md` §1).

## Ziel
F30 baut den „Opportunity Scanner“ — ein eigenständiges Produkt, vollständig in der Workforce geplant und gebaut, das
anschließend von der Workforce selbst aufgerufen und angezeigt wird (E-M5-15, Referenzfall für Self-Dogfooding).

Zielsatz M5 (= V1-RC, `zielfassung.md`): Die Workforce führt ein neues, eigenständiges Produkt von der Idee bis zum
abgenommenen ersten Meilenstein. Coach, Architekt, Bau, Prüfung und Korrektur laufen als Workflows. Stefan entscheidet, gibt
frei und nimmt ab, ohne Inhalte zwischen Rollen zu kopieren.

## Nicht-Ziele
- F37 Besetzungs-Erklärung & Override und F38 Projektwissen-Index — V1-Backlog nach F30, gebaut bei erfülltem Auslöser (E-M5-16).
- Kollege-Durchlauf in eigener Instanz, Import-Wizard (F25 WS-2b) und Health-Projektion (F25 WS-3) — V1-Backlog mit Auslöser,
  kein Teil der V1-Bestehensbedingung (E-M5-17).
- Der Referenzauftrag R des Fixpakets läuft nicht in F30, damit die F30-Messcheckliste unberührt bleibt (`fixpaket-f45.md` §3, R).

## Akzeptanzkriterien
- AK1: Der Opportunity Scanner M1 liegt in einem eigenen Repo, ist über F41/F42 angelegt, über Coach und Architekt geplant und
  über Workflows gebaut und abgenommen (Bestehensbedingung M5/V1, Punkt 1).
- AK2: Jedes AK von Scanner-M1 hat im Reviewer-Ergebnis ein Urteil je AK mit Beleg; ein AK ohne Beleg blockiert (Punkt 2).
- AK3: Kein manueller Kopierschritt zwischen Rollen. Jeder Eingriff Stefans wird strukturiert protokolliert (Klasse
  Entscheidung/Freigabe/Abnahme/Reparatur, optional `bezug_backlog`), jede Reparatur wird ein Finding, mindestens drei Tage
  Protokoll (Punkt 3).
- AK4: Die Workforce startet den Scanner und zeigt sein Ergebnis read-only an (Punkt 4).
- AK5: Die Invarianten halten nachweislich: Codex nur lesend, schreibende Schritte ZWINGEND, die Prüfkette des Scanners bleibt
  durch die Ausführung unverändert (F-713) (Punkt 5).

Messung, kein Bestehenskriterium (Punkt 6): Die Punkte C1–C6 der F30-Messcheckliste (Datenquellen/Nutzungsbedingungen,
Personendaten lokal als Entscheidung des Menschen, Stack-Frage mit `kategorie: "stack"`, lose Kopplung Befehl + Ergebnisdatei,
Netzwerk/Kosten pro Lauf, nachvollziehbare Passungsbewertung) werden gemessen und dokumentiert.

## Dependencies
- F43 „Projekt aufrufen/anzeigen“ (E-F30-3; `features/F43/feature.md`) — Grundlage für AK4.
- F41 „Neues Projekt anlegen“ und F42 „Projekt-Harness“ — Grundlage für AK1.
- F45 Fixpaket „Arbeitsfähigkeit“ — F30 beginnt danach (E-M5-18); E-F45-2 (Teil 2 vor F30 über Challenger-Bauaufträge oder
  als erste Aufträge der Workforce an sich selbst) ist offen, fällig nach R.
- F-713 (P1) — blockierte F30 laut Bestehensbedingung Punkt 5; inzwischen behoben (`state/findings-archiv.md`, Fixpaket).

## Offene Punkte
- offen: Workstream-Schnitt von F30 (keine Quelle nennt Workstreams).
- offen: Repo, Stack und Datenquellen des Scanners (werden im Lauf über Coach und Architekt entschieden; Messpunkte C1–C6).
- offen: E-F45-2 (Weg für Teil 2 vor F30).

## Workstreams

| ID | Art | Titel | Status | Schätzung AT | Ist AT | Begonnen | Abgenommen | Notiz |
|---|---|---|---|---|---|---|---|---|

Noch nicht geschnitten (offen) — keine Quelle nennt Workstreams von F30. Bis zum Schnitt zählt F30 in der Roadmap als ein
Eintrag ohne Schätzung („Bis M5 fertig“ ehrlich nicht berechenbar).
