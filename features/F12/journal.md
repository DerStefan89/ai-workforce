# Journal — F12

Anhängeprotokoll. Neue Einträge unten anfügen, bestehende nicht ändern.

## 2026-09-06 — Akte angelegt (Status READY_FOR_TECH)

`features/F12/feature.md` neu angelegt auf Grundlage der F12-Challenge
(06.09.2026, Repo-Stand `650451d`) und der beiden Stefan-Entscheidungen
vom selben Tag:

- **E-M2-3** — der geführte Start (Startformular im Leitstand) gehört
  in F12, nicht in einen Nachzügler-Workstream von F11. F11 bleibt
  abgeschlossen; F12 heißt „Bedienbarer Lauf: Auftrag, Liste, Detail".
- **E-M2-4** — ein Lauf wird seinem Auftrag über eine
  Lineage-Eingabe-Referenz `artefakt:auftrag-<auftragId>` zugeordnet,
  nach dem in F8 WS-2b real verwendeten `vorgaengerLaufId`-Muster. Der
  Auftrag ist ein `AUFTRAG_V0`-Kernartefakt; der Leitstand hält keine
  eigene Zuordnungswahrheit (§16.2). Löst F-134.

Zehn Akzeptanzkriterien (AK1–AK10), vier Workstreams
(WS-1 → WS-2 → WS-3 → WS-4), Blocker gegen den Doku-PR, der Meilenstein
2 um E-M2-3/E-M2-4 erweitert (analog F-129 bei F11). Fünf neue Findings
aus der Challenge ins Register aufgenommen (F-137 bis F-141), F-134 um
einen Nachtrag zur Auflösung durch E-M2-4/AK5 ergänzt.

## 2026-09-07 — WS-2 gebaut (AK4/AK5/AK6), Reviewer-/QA-Pass durchlaufen

`state/plan-v1-f12-ws2.md` umgesetzt, inklusive der Bauauftrags-Korrektur
(auftragId-Existenzprüfung nach D13/laufIdBelegt, nicht davor — F11
WS-2-Prinzip: D13 ist unbedingt) und der zehn Stefan-Entscheidungen zu
den offenen Fragen (Statuscode 201/200, Sortierung neueste-zuerst,
Kopfdaten-only-Liste, keine `art` in der Werkzeugsatz-Antwort, laufId
bleibt manuelles Textfeld mit Vorschlag, rolle/budget/modell serverseitig
fest).

- `scripts/leitstand-server.mjs`: `POST`/`GET /api/auftraege`,
  `GET /api/startvorlage/werkzeugsaetze`; `pruefeStartauftrag` verlangt
  `auftragId` statt `auftragstext` (`VERBOTENE_AUFTRAG_FELDER`).
- `src/execution-controller/`: `AusfuehrungsEingaben.auftragId`
  (Pflichtfeld); `fuehreAufgabeDurch` stellt unbedingt einen
  `artefakt:auftrag-<auftragId>`-Verweis voran (Reihenfolge
  `[auftragRef, vorgaengerRef, …]`).
- `public/leitstand/`: neuer Abschnitt „Auftrag & Start" (Auftrag
  anlegen/wählen, Werkzeugsatz wählen, Evidenzdateien-Zeilenliste,
  laufId-Vorschlag); `#wiederaufnahme` bleibt als gekennzeichneter
  Notweg bestehen.
- Testbrüche aus Plan-Abschnitt 0 (17/18 Aufrufstellen
  `gueltigerStartauftrag` in `check-f10-leitstand.mjs`, ein Grundkörper
  in `check-f11-auftrag.mjs`) sowie ein bei der Umsetzung neu
  entstandener Bruch in `execution-controller.test.ts` (mandatory
  `auftragId`, Prompt-/Index-Verschiebung durch den unbedingt
  vorangestellten auftragRef, ein zu enges `maxElemente`-Testbudget) im
  selben Zug behoben.

Reviewer-Pass (`code-reviewer`, frischer Kontext) fand einen echten
Befund: `registriereAuftrag` in `POST /api/auftraege` lief ohne
try/catch — ein Schreibfehler hätte als unhandled promise rejection den
gesamten Serverprozess beendet (Node 24-Default). Behoben (try/catch,
500 + Logging, Muster des bestehenden JSON-Parse-Guards). QA-Pass fand
eine dokumentationswürdige Entkopplung: das Startformular setzt
`aufrufEingaben.modell` clientseitig fest (`'sonnet'`), unabhängig vom
`modell`-Feld der Startvorlage (das an keiner Stelle serverseitig
gelesen wird — vorbestehende Lücke, nicht WS-2-Scope) — als bewusste
Entscheidung im Code dokumentiert statt stillschweigend verknüpft,
registriert als **F-144** (TECH_DEBT, P3, offen).

Bei einem echten HTTP-Smoke-Test (Server gegen ein Scratch-Verzeichnis,
`erzeugeRequestHandler({basisVerzeichnis: …})`) real entdeckt, NICHT
Teil dieser Änderung, als Blocker für einen künftigen Workstream
vorgemerkt: der Fire-and-Forget-Aufruf
`fuehreAufgabeDurchFn(laufId, profilReferenz, eingaben)` in
`scripts/leitstand-server.mjs` reicht kein `optionen`-Objekt durch —
ein `basisVerzeichnis`-Override des Servers gilt dadurch für alle
synchronen Prüfungen, aber NICHT für den eigentlichen
`fuehreAufgabeDurch`-Lauf, der intern auf den Default `'kontrollzustand'`
zurückfällt. In der echten Produktionskonfiguration unsichtbar (Default
= Default), bestätigt per `git show HEAD:…` bereits vor dieser Änderung
vorhanden (`10a60ef`, F12 WS-1).

`npm run check` und `npm run check:template` je Exit 0 (146/146 Tests).
`state/gates.md`/`docs/STATUS.md` bewusst NICHT in diesem Durchgang
aktualisiert (keine formalen Rot-/Grün-Kalibrierläufe für die neuen
Gate-Ergänzungen erzeugt) — als offener Nachtrag markiert, kein
stillschweigendes Auslassen.
