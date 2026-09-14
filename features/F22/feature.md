# F22 — Click-to-Work v1

## ID

F22

## Titel

Click-to-Work v1 (Router-Endpunkt, Router-Ergebnis als Kernartefakt,
Vorschlag -> Freigabe -> Kette)

## Status

Status: WORKSTREAM_SCHNITT_GENEHMIGT

Gültige Status-Werte (geprüft vom Gate, siehe A3a–e in
`features/AF-F001/feature.md`): `ENTWURF, READY_FOR_TECH,
WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN,
BLOCKIERT, ABGEBROCHEN`.

## Ziel

Ein Klick auf ein reales Workitem im Workboard (F21) löst einen echten
Router-Lauf aus und mündet — ohne Zwischenschritt über CLI oder JSON —
in einen freigebbaren Workflow-Vorschlag. Grundlage ist `state/findings.md`
F-353: der Router ist heute nur per CLI (`scripts/route-auftrag.mjs`)
erreichbar, sein Ergebnis wird nicht als eigenes Artefakt abgelegt.

Beim Zuschnitt gegen den realen Stand (Challenge, 14.09.2026) wurden vier
Korrekturen gegenüber der ursprünglichen M4-Planung (`docs/STATUS.md`)
festgestellt und hier eingearbeitet — jede einzeln belegt am Repo, siehe
Akzeptanzkriterien und Risiken:

- **Korrektur 1 (Asynchronität):** `POST /api/auftraege/<id>/routen`
  ist strukturell nur als ASYNCHRONER Endpunkt möglich (202 + `laufId`,
  Muster `POST /api/laeufe`). `starteLaufUndVergiss`
  (`scripts/leitstand-server.mjs`) ist fire-and-forget, und die D13-Sperre
  (`laufAktiv`) greift synchron VOR jeder request-spezifischen Prüfung —
  ein synchroner Vorschlag im selben Request ist damit nicht bloß unüblich,
  sondern unmöglich. Ein D13-Konflikt wird mit 409 abgelehnt (bestehender
  Grundtext).
- **Korrektur 2 (Workflow-Registrierung beim Routen):** Nach einem
  erfolgreichen Router-Lauf wird nicht nur das Klassifikations-Artefakt
  `lineage-router-<auftragId>` abgelegt, sondern direkt anschließend auch
  der über `waehleWorkflowVorlage` erzeugte Workflow — über den
  bestehenden Registrierungspfad (`POST /api/workflows`-Logik), Status
  `OFFEN`. „Freigeben" im UI ist damit der bestehende
  `POST /api/workflows/<id>/starten`; „Ablehnen" startet nichts
  (ein eigenes Entscheidungsartefakt für „Ablehnen" ist Nicht-Ziel, siehe
  unten, F-350/F23). Begründung: `workflow_id` ist deterministisch
  `router-<auftragId>` (`leiteWorkflowIdAb`, `src/router/index.ts`); ein
  zweites Routen desselben Auftrags erzeugt also dieselbe `workflow_id` in
  neuer VERSION, nicht einen zweiten Workflow — `POST /api/workflows`
  erlaubt das Ersetzen einer Fassung im Status `OFFEN`
  (`GESPERRTE_ERSETZUNGS_STATUS` sperrt nur `LAEUFT`/`WARTET_FREIGABE`/
  `ABGESCHLOSSEN`).
- **Korrektur 3 (Projektion statt neuer Endpunkt):** Die Verknüpfung
  Workitem↔Auftrag läuft über ein neues Feld `workitem_referenz` in
  `sammleAuftraege` (`scripts/leitstand-server.mjs`) — die Funktion lädt
  je Auftrag ohnehin `ladeArtefaktVersion`, das Feld kostet kein
  zusätzliches I/O. Kein neuer Endpunkt dafür.
- **Korrektur 4 (Worker-Wahl entschieden):** Der Router-Lauf läuft auf
  Worker `codex` mit `--output-schema ergebnis-router` (Besetzung
  identisch zum lesenden Schritt in `workflow-vorlagen/standard.json`).
  Rückfall auf `claude-code` mit Fence-Stripping gilt NUR, wenn
  `loeseRessourcenAuf` (`src/ressourcen/index.ts`) den Eintrag `codex` als
  nicht verfügbar meldet. Der eingesetzte Worker und ein eventuelles
  Fence-Stripping stehen im Router-Artefakt (AK1). Entscheidung Stefan,
  14.09.2026.

## Nicht-Ziele

- Ein eigenes Entscheidungsartefakt für „Ablehnen" eines
  Workflow-Vorschlags — F23/F-350 (Abnahme + ADJUST-Loop).
- Post-Build-Prüfschritt, `BLOCKIERT`-Wirkung, Folge-Workflow bei
  ADJUST — F23.
- Änderung der Router-Klassifikationslogik selbst (Fence-Stripping,
  F-337) — eigener, unabhängiger Fix, kein Bestandteil von F22.
- Aufteilung von `scripts/leitstand-server.mjs` (F-371, TECH_DEBT) — hier
  bewusst NICHT begonnen, spätestens vor F25 zu entscheiden.
- Ein zweiter, paralleler Router-Lauf für denselben Auftrag ohne
  ausdrückliches „neu routen" — die bestehende D13-Sperre plus die
  deterministische `workflow_id` verhindern das strukturell (siehe AK2).

## Akzeptanzkriterien

- **AK1** Router-Ergebnis liegt als schemavalidiertes Kernartefakt mit
  Lineage zum Auftrag; der eingesetzte Worker steht im Artefakt.
- **AK2** Ein Klick auf ein reales Finding erzeugt genau EINEN
  Router-Lauf und danach genau einen Workflow-Vorschlag; ein zweiter
  Klick ohne ausdrückliches „neu routen" erzeugt keinen weiteren Lauf.
- **AK3** Während eines laufenden Router-Laufs wird ein zweiter Start
  real mit 409/D13 abgelehnt; die View zeigt das als Zustand, nicht als
  Fehlerdialog.
- **AK4** Freigabe startet die Kette bis Ausführung; ZWINGEND vor
  schreibenden Schritten bleibt unverändert (E-M3-1).
- **AK5** Workitem-Detail zeigt Auftrag, Workflow und Läufe über
  `workitem_referenz`.
- **AK6** Terminal-Block „Commit/Push/PR" erscheint nach ABGESCHLOSSEN.
- **AK7** Gate `scripts/check-f22-click-to-work.mjs` grün mit Rot-Fall
  (Vorschlag ohne persistiertes Router-Artefakt wird abgelehnt);
  `npm run check` grün.
- **AK8** Feature Review mit Stefan nach WS-2 (realer Klick auf ein
  echtes P3-Finding bis zur Dateiänderung).

## Dependencies

F21 (Status FEATURE_GATE — erfüllt, Workboard liefert die Workitem-Liste,
von der aus geklickt wird). Blockiert F23, F26.

## Workstreams

- **WS-1**: Router-Endpunkt (`POST /api/auftraege/<id>/routen`,
  asynchron, D13/409), Router-Ergebnis-Artefakt mit Schema,
  Workflow-Registrierung im Anschluss an einen erfolgreichen Lauf,
  `workitem_referenz` in `sammleAuftraege`, Gate.
- **WS-2**: UI-Anbindung im Workboard (Klick → Router-Lauf-Zustand →
  Vorschlag → Freigabe), Terminal-Block. Danach Feature Review (AK8).

## Risiken

Die vier Korrekturen oben sind Zuschnittsrisiken, keine offenen Fragen —
sie wurden gegen den realen Code geprüft (`scripts/leitstand-server.mjs`,
`src/router/index.ts`, `src/rollen/index.ts`), nicht neu entschieden. Die
Worker-Wahl (Korrektur 4) ist mit dieser Fassung entschieden; das Schema
des Router-Ergebnis-Artefakts trägt `worker` und `beobachtung`
(fence_entfernt), weil `codex` (structured output) und der
`claude-code`-Rückfall (Fence-Stripping) unterschiedliche Rückgabepfade
nehmen.
