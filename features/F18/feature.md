# F18 — Router v1

## ID

F18

## Titel

Router v1 (Klassifikation eines Auftrags zu Kontrolltiefe und Workflow-Vorlage)

## Status

Status: IN_ARBEIT

Gültige Status-Werte (geprüft vom Gate, siehe A3a–e in
`features/AF-F001/feature.md`): `ENTWURF, READY_FOR_TECH,
WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN,
BLOCKIERT, ABGEBROCHEN`.

## Ziel

Ein Auftrag wird von der Rolle `router` klassifiziert (Kontrolltiefe,
Risiko, Aufgabentyp) und diese Klassifikation wählt automatisch eine
passende Workflow-Vorlage (fast-lane/standard/hoch) — statt jeden Auftrag
von Hand einem Workflow zuzuordnen. Grundlage: `docs/projekt/
zielfassung.md` §13.4, E-M3-2.

## Scope

- `src/rollen/` trägt die Rolle `router` (lesend, `claude-code`/`codex`,
  Output-Schema `ergebnis-router`, Ausschluss `src/**`) — WS-1.
- `schemas/ergebnis-router.schema.json` beschreibt die Klassifikationsform
  — WS-1.
- Drei statische Workflow-Vorlagen unter `workflow-vorlagen/` — WS-2.
- Kern-Modul `src/router/` mit `validiereErgebnisRouter` (Muster
  `validiereWorkflowDaten`, D5) und `waehleWorkflowVorlage` (reiner Lookup
  + Platzhalter-Befüllung, keine eigene Klassifikationslogik) — WS-2.
- Glue-Skript `scripts/route-auftrag.mjs` (CLI, kein neuer HTTP-Endpunkt):
  liest die Laufakte eines abgeschlossenen `router`-Laufs, validiert das
  Ergebnis, registriert den gewählten Workflow über das bestehende
  `POST /api/workflows` — WS-2.
- Router-Eval-Gate und Szenario-A/B-Nachweis über den echten Automaten —
  WS-3 (noch nicht begonnen).

## Nicht-Ziele

- **Keine eigene Klassifikationslogik im Kern.** Die Klassifikation
  entsteht ausschließlich über einen echten Werkzeuglauf der Rolle
  `router`; `src/router/` bildet nur eine bereits fertige Klassifikation
  auf eine Vorlage ab.
- **Kein neuer HTTP-Endpunkt.** `POST /api/auftraege`, `POST /api/laeufe`
  und `POST /api/workflows` reichen.
- **Keine Leitstand-Frontend-Änderung.**
- **Kein Router-Eval-Gate in WS-2** (mindestens 10 Aufgaben, je ≥3 Läufe
  gegen die Baseline „immer Standard" — das ist WS-3).

## Akzeptanzkriterien

- **AK1** *(WS-1)* — Rolle `router` in `ROLLENVERTRAEGE`, Schema
  `ergebnis-router`, Gate `scripts/check-f18-router.mjs`.
- **AK2** *(WS-2)* — Drei Workflow-Vorlagen unter `workflow-vorlagen/`
  (fast-lane: 1 Schritt; standard: 2 Schritte; hoch: 3 Schritte), je
  vollständiges `WORKFLOW_V0`-Gerüst mit Platzhaltern für
  `workflow_id`/`auftrag_id`/`ziel`.
- **AK3** *(WS-2)* — `waehleWorkflowVorlage(klassifikation, auftragId,
  ziel)` liefert einen vollständigen, gegen `validiereWorkflowDaten`
  gültigen `WORKFLOW_V0`-Datensatz mit `status: 'OFFEN'` (siehe Kopfkommentar
  `src/router/index.ts` für die Begründung gegen `WARTET_FREIGABE`).
- **AK4** *(WS-2)* — `scripts/route-auftrag.mjs` liest eine reale,
  abgeschlossene `router`-Laufakte, validiert das Ergebnis gegen
  `ergebnis-router` und registriert den gewählten Workflow über
  `POST /api/workflows`. **Erfüllt**, real belegt: ein echter
  `claude-code`-Lauf der Rolle `router` gegen einen echten Auftrag,
  klassifiziert `fast-lane`/`niedrig`, führt zu einem real registrierten
  Workflow mit einem `ausfuehrung`/`schreibend`/`ZWINGEND`-Schritt.
  Nachweis: `features/F18/nachweis-ws2.md`.

## Entschieden

- `waehleWorkflowVorlage` bekommt `repoWurzel` als optionalen vierten
  Parameter mit Default `process.cwd()` (Muster
  `scripts/leitstand-server.mjs`s `repoWurzel`-Parameter) — die geforderte
  Drei-Parameter-Signatur bleibt für reale Aufrufer unverändert, Tests
  können den Wert trotzdem injizieren.
- `workflow_id` wird deterministisch aus `auftragId` abgeleitet
  (`router-<auftragId>`), nicht zufällig — ein zweiter Routing-Versuch für
  denselben Auftrag legt eine neue Version desselben Workflow-Artefakts an
  (ARCHITECTURE.md §2), statt einen unabhängigen zweiten Workflow zu
  erzeugen.
- `scripts/check-f18-router.mjs` (WS-1) importiert seit WS-2 die reale
  `validiereErgebnisRouter` aus `src/router/index.ts`, statt eine eigene
  Kopie zu pflegen (D5) — die WS-1-Kopie existierte nur, weil es vor WS-2
  noch kein `src/router/`-Modul gab.
- Ein Router-Lauf über den direkten `POST /api/laeufe`-Pfad läuft
  strukturell immer als `worker: claude-code`: `worker`/`ausgabeSchemaPfad`
  stehen nicht in `ERLAUBTE_STARTAUFTRAG_FELDER`
  (`scripts/leitstand-server.mjs`) und kommen ausschließlich aus einem
  geplanten Workflow-Schritt. Die Klassifikation muss deshalb aus dem
  Freitext-`result`-Feld des Claude-Code-Ergebnisobjekts gelesen werden
  (`leseErgebnisobjekt`) — kein `--output-schema`-Mechanismus wie bei
  Codex. `scripts/route-auftrag.mjs` validiert deshalb selbst gegen
  `ergebnis-router`, statt sich auf eine Schemaprüfung des Result
  Evaluators zu verlassen (die es für `claude-code` nicht gibt).

## Dependencies

- F15 — `WORKFLOW_V0`, `validiereWorkflowDaten`, `registriereWorkflow`.
- F17 — Rollenvertrag (`ROLLENVERTRAEGE`, `loeseAusfuehrungsEingabenAuf`).
- F16 — `worker`-Weiche, `leseErgebnisobjekt`
  (`src/claude-code-gateway/index.ts`).
- F1B/F7 — `stelleLaufstatusFest`, Rohstrom-Lesepfad (Muster für
  `scripts/route-auftrag.mjs`).
- F2 — `ladeArtefaktVersion` (`src/lineage-registry/index.ts`).
