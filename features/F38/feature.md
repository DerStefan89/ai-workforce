# F38 — Projektwissen-Index (wegwerfbar)

## ID
F38

## Titel
Projektwissen-Index, wegwerfbar

## Status
Status: ENTWURF

V1-Backlog nach F30 (`docs/projekt/zielfassung.md` §13.6, E-M5-16),
gebaut bei erfülltem Auslöser — siehe „## Auslöser" unten.

Gültige Status-Werte (geprüft vom Gate): ENTWURF, READY_FOR_TECH, WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN, BLOCKIERT, ABGEBROCHEN.

## Ziel
Einen Index über Lineage-Artefakte, Feature-Akten, Findings und ADRs
bauen, der die bereits vorhandenen Verknüpfungen zwischen diesen
Artefakten nutzt und über `jarvis` abfragbar macht — ohne einen externen
Memory-Stack.

## Nicht-Ziele
- Ein externer Memory-Stack (Vektor-DB, Embeddings-Dienst o. Ä.) — der
  Index baut ausschließlich auf bereits vorhandenen Repo-Verknüpfungen
  auf.
- Ein neuer persistenter Kernzustand außerhalb dessen, was Lineage
  (F2), Feature-Akten, `state/findings.md` und `docs/adr/` bereits
  tragen.

## Akzeptanzkriterien
- AK1: Der Index deckt Lineage-Artefakte, Feature-Akten, Findings und
  ADRs ab.
- AK2: `jarvis` kann eine reale Wissensfrage über den Index beantworten,
  ohne einen externen Memory-Stack anzusprechen.
- AK3: Der Index ist wegwerfbar — er lässt sich aus den bestehenden
  Repo-Artefakten jederzeit neu erzeugen, ohne Datenverlust an der
  führenden Quelle.

## Dependencies
- F33 (Projektkontext & Roadmap) — liefert die Context-Builder-
  Einspeisung, über die `jarvis` den Index nutzt.
- F35 (Challenge-Flow) — laut M5-Feature-Schnitt
  (`docs/projekt/zielfassung.md` §13.6).

## Auslöser
Jarvis kann mindestens drei reale Wissensfragen zum Projekt nachweislich
nicht beantworten (strukturiertes Eingriffsprotokoll, F30,
`bezug_backlog: F38`). Erst dann wird F38 aus dem V1-Backlog gezogen und
gebaut (`docs/projekt/zielfassung.md` §13.6, E-M5-16).
