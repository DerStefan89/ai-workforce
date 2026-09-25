# F37 — Besetzungs-Erklärung & Override

## ID
F37

## Titel
Besetzungs-Erklärung & Override

## Status
Status: ENTWURF

V1-Backlog nach F30 (`docs/projekt/zielfassung.md` §13.6, E-M5-16),
gebaut bei erfülltem Auslöser — siehe „## Auslöser" unten.

Gültige Status-Werte (geprüft vom Gate): ENTWURF, READY_FOR_TECH, WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN, BLOCKIERT, ABGEBROCHEN.

## Ziel
Je Workflow-Schritt sichtbar machen, warum Rolle→Worker→Modell so besetzt
ist und welche Worker für diesen Schritt zulässig wären, und dem Menschen
vor der Freigabe einen Override als eigenes Entscheidungsartefakt
(`art: planaenderung`) erlauben — macht die bislang hart codierte
Jarvis-Worker-Wahl sichtbar (`state/findings.md` F-512).

## Nicht-Ziele
- Automatische Modellwahl — E-M3-3 (feste Besetzung Rolle→Worker→Modell)
  bleibt unverändert in Kraft.
- Ein neues Zustandsmodell auf Feature- oder Workstream-Ebene — der
  Override ist ein Entscheidungsartefakt, kein neuer Lifecycle-Zustand.

## Akzeptanzkriterien
- AK1: Jeder Workflow-Schritt zeigt vor dem Start, warum Rolle→Worker→
  Modell so besetzt ist.
- AK2: Jeder Workflow-Schritt zeigt, welche Worker für seine Rolle laut
  Rollenvertrag (F17) zulässig wären.
- AK3: Ein Override durch den Menschen vor der Freigabe wird als
  Entscheidungsartefakt `art: planaenderung` persistiert.
- AK4: E-M3-3 bleibt unverändert — kein automatischer Modellwahlpfad.

## Dependencies
- F17 (Rollenvertrag) — liefert die zulässigen Worker je Rolle.
- F32 (Verbrauch & Kontingent), F35 (Challenge-Flow) — laut M5-Feature-
  Schnitt (`docs/projekt/zielfassung.md` §13.6).

## Auslöser
Stefan greift in F30 oder später mindestens zweimal wegen einer
ungeeigneten Besetzung ein (strukturiertes Eingriffsprotokoll, F30,
`bezug_backlog: F37`). Erst dann wird F37 aus dem V1-Backlog gezogen und
gebaut (`docs/projekt/zielfassung.md` §13.6, E-M5-16).
