# AF-F001 — Feature-Akte im Repo

## ID

AF-F001

## Titel

Feature-Akte im Repo

## Status

Status: READY_FOR_TECH

Gültige Status-Werte (geprüft vom Gate, siehe A3e): `ENTWURF,
READY_FOR_TECH, WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE,
ABGESCHLOSSEN, BLOCKIERT, ABGEBROCHEN`. Ein fehlendes `Status:`-Feld oder
ein Wert außerhalb dieser Menge gilt als Fehler.

## Ziel

Eine frische Claude-Code-Sitzung kann allein aus dem Repo benennen, was
ein Feature ist, was ausdrücklich nicht dazugehört und woran Fertigkeit
erkannt wird — ohne Zugriff auf den Claude-Projektchat. Dazu bekommt jedes
Feature eine eigene Akte (`features/<id>/feature.md` +
`features/<id>/journal.md`) und ein Gate, das die Pflichtabschnitte der
Akte bei `Status: READY_FOR_TECH` prüft.

## Scope

- `features/<id>/feature.md` mit den Pflichtfeldern ID, Titel, Status,
  Ziel, Scope, Nicht-Ziele, Akzeptanzkriterien, Zuordnung, Dependencies
  (hard/soft), Workstream-Liste, Entscheidungs-Referenzen, Spec-Referenz.
- `features/<id>/journal.md` als Anhängeprotokoll (Pass, Zeitpunkt,
  Ergebnis, Artefaktpfad).
- `scripts/check-feature.mjs` als Gate, eingehängt in
  `npm run check:template`: prüft bei `Status: READY_FOR_TECH` genau vier
  Pflichtabschnitte (Ziel, Nicht-Ziele, Akzeptanzkriterien, Dependencies)
  sowie die Gültigkeit des `Status`-Werts.
- Zeile in `state/memory-map.md` für den Ablageort der Feature-Akte.
- Diese Akte selbst (`features/AF-F001/`) als erste befüllte Instanz,
  mit der das Gate am echten Fall geprüft wird.

## Nicht-Ziele

- Execution Controller/Orchestrator, Checkpoint Store, Artifact Registry,
  Human Transport, Leitstand, ChatGPT-API-Anbindung, automatischer
  Rollenaufruf — eigene, spätere Features.
- Änderungen an `commit-guard.cjs`, `guard-settings.js` oder Reparatur
  des dortigen `cwd`-Fehlers — eigener Vertrag.
- Änderungen an `ARCHITECTURE.md`, `CLAUDE.md`, `docs/adr/*` — bereits
  erledigt.
- Migration des Entscheidungsregisters 001–176.
- Automatisierte Gate-Prüfung von Workstream-Liste,
  Entscheidungs-Referenzen und Zuordnung — Pflichtfelder der Akte, aber
  YAGNI für das Gate in dieser ersten Fassung.
- Automatisierte Prüfung von `journal.md`-Inhalt oder -Format — die Datei
  muss existieren, ihr Inhalt ist Anhängeprotokoll, kein Gate-Ziel.

## Akzeptanzkriterien

- **A1** `features/AF-F001/feature.md` existiert; jede Pflichtüberschrift
  ist als Markdown-Überschrift vorhanden.
- **A2** `node scripts/check-feature.mjs` liefert Exit 0 auf dem
  vollständigen Beispiel.
- **A3a–e** Exit 1 mit benanntem fehlendem Abschnitt bei fehlendem Ziel,
  fehlenden Nicht-Zielen, fehlenden Akzeptanzkriterien, fehlenden
  Dependencies; Exit 1 mit „Status fehlt oder unbekannt" bei fehlendem
  oder ungültigem `Status`-Feld.
- **A4a–b** Exit 0 mit „ⓘ kein Feature-Verzeichnis, nichts zu prüfen",
  wenn `features/` nicht existiert; Exit 0 mit „ⓘ 0 Akten geprüft", wenn
  `features/` leer ist.
- **A5** `npm run check:template` ruft `check-feature.mjs` auf, grün.
- **A6** `npm run check` grün.
- **A7** `state/memory-map.md` enthält die Zeile für die Feature-Akte.
- **A8** Eine frische Claude-Code-Sitzung kann allein aus dieser Datei
  benennen, was das Feature ist, was nicht dazugehört und woran
  Fertigkeit erkannt wird. Prüfverfahren: Subagent `qa` liest
  ausschließlich diese Datei und beantwortet die drei Fragen in
  Testfällen (Vorbild: TC-01–TC-05 aus dem QA-Pass zu dieser Akte,
  `state/tasks/af-f001-feature-akte.md`) — Standardverfahren für jede
  künftige Feature-Akte.

## Zuordnung

Meilenstein 1, Vorarbeit vor Feature 0 aus Deliverable 1
(`docs/projekt/umsetzungsplan-fassung-1.md:192-196`). Kein eigenes
Deliverable — Grundlage, auf der jede folgende Feature-Akte aufsetzt.

## Dependencies

- Hard: keine.
- Soft: `state/memory-map.md` (Ablageort-Konvention), `scripts/check-contract.mjs`
  (Gate-Muster, Referenz für `check-feature.mjs`).

## Workstream-Liste

- WS1 — Feature-Akte-Konvention bauen (diese Akte, `check-feature.mjs`,
  Memory-Map-Zeile, Status-Eintrag). Einziger Workstream für AF-F001.

## Entscheidungs-Referenzen

- `state/plan-v2-af-f001-feature-akte.md` — Plan, löst alle 8 Findings
  aus dem Advisor-Pass zu Plan v1 auf.
- `state/advisor-findings-af-f001-feature-akte.md` — Advisor-Urteil:
  FREIGEGEBEN MIT HINWEISEN.
- `state/tasks/af-f001-feature-akte.md` — ausgeführter Handoff-Vertrag.

## Spec-Referenz

`specs/AF-F001/spec.md`
