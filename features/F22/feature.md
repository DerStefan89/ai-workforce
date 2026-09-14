# F22 — Click-to-Work v1

## ID

F22

## Titel

Click-to-Work v1 (Router-Endpunkt, Router-Ergebnis als Kernartefakt,
Vorschlag -> Freigabe -> Kette)

## Status

Status: IN_ARBEIT

Gültige Status-Werte (geprüft vom Gate, siehe A3a–e in
`features/AF-F001/feature.md`): `ENTWURF, READY_FOR_TECH,
WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN,
BLOCKIERT, ABGEBROCHEN`.

WS-1 (PR #155) gemergt. WS-2 (dieser PR) implementiert, `npm run check`
grün (Gate AK7 erfüllt). Real gegen den laufenden Server geprüft: Auftrag
anlegen mit `workitem_referenz`-Zeile, `routeAuftrag` (202 + `laufId`),
und der "routet…"-Zustand inkl. seiner Fehlererkennung (Poll auf
`zustand.startfehler`) — alle drei real bestätigt. NICHT real erreicht:
die Vorschlags-Anzeige, „Freigeben", der Kettendurchlauf und der
Terminal-Block (AK2/AK4/AK6) — der Router-Lauf scheiterte real 3/3 an
einem Blocker außerhalb von F22 (F-373, siehe Realer-Test-Abschnitt
unten). AK3 (409/D13) wurde in diesem Testlauf NICHT gegen den echten
Server geprüft (nur strukturell über den WS-1-Gate-Rotfall (b) belegt).
Zusätzlich beim Review festgestellt: AK5 („Workitem-Detail zeigt Auftrag,
Workflow und Läufe über `workitem_referenz`") ist von der WS-2-SCOPE-Liste
NICHT abgedeckt — die Oberfläche zeigt nur den VORWÄRTS-Fluss
(Bearbeiten → neuer Auftrag), keinen Rückverweis von einem Finding auf
einen BEREITS bestehenden Auftrag/Workflow. Offener AK, kein WS-2-Bug.
Status bewusst NICHT auf FEATURE_GATE gehoben — das war an einen
erfolgreichen realen Klick-Test bis zur Freigabe geknüpft, der nicht
erreicht wurde. AK8 bleibt bei Stefan.

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

## Realer Test (WS-2, AK8-Vorbereitung, 14.09.2026)

Gewähltes Finding: **F-359** (`BUG`, P3, „Doppelte HTML-Escapierung im
Leitstand bei `auftrag_fehlt` der Lauf-Detailansicht") — real gegen den
laufenden Server (`node scripts/leitstand-server.mjs`, Port 4173, echte
Startvorlage `startvorlagen/beispielprojekt.json`), keine Gate-Fixture.

Durchlauf (Aufrufe entsprechen 1:1 `starteBearbeitung`/
`aktualisiereBearbeitungsZustand` in `public/leitstand/views/
workboard.js`):

1. `POST /api/auftraege` mit Titel + Beschreibung + Fundstelle + Zeile
   `workitem:finding:F-359` → 201, `auftragId` `abcd6a25-…`.
2. `GET /api/auftraege` bestätigt `workitem_referenz: "workitem:finding:
   F-359"` am neuen Eintrag (AK5-Datenfeld, WS-1).
3. `POST /api/auftraege/abcd6a25-…/routen` → 202 + `laufId`. Zustand
   „routet…" korrekt angezeigt (Panel-Logik entsprechend nachvollzogen).
4. Poll `GET /api/workflows/router-abcd6a25-…`: dreimal in Folge 404
   geblieben, dabei jeweils ein Eintrag mit passender `laufId` in
   `zustand.startfehler` erschienen — die Fehlererkennung des
   Detail-Auffrischers (`aktualisiereBearbeitungsZustand`) hat das korrekt
   als Zustand 'fehler' erkannt (kein Hängenbleiben bei „routet…").
5. Ursache der drei Fehlschläge: **F-373** (neu, siehe
   `state/findings.md`) — der `claude-code`-Rückfall (kein `codex`
   verfügbar) ignorierte real 3/3 die Rollenvorgabe „nur JSON" und
   antwortete stattdessen als allgemeiner Coding-Agent (hat F-359 sogar
   korrekt diagnostiziert, aber in Prosa statt als Klassifikation).
6. Vorschlags-Anzeige, „Freigeben", Kettendurchlauf und Terminal-Block
   wurden dadurch NICHT real erreicht — kein WS-2-Codepfad davon wurde
   live ausgeführt. Kein schreibender Schritt lief zu irgendeinem
   Zeitpunkt (die Kette kam gar nicht erst zustande).

Ergebnis: Die WS-2-Verdrahtung bis einschließlich des Routen-Aufrufs und
der Fehlererkennung ist real bestätigt. Der Rest der Kette (Vorschlag →
Freigeben → Kette → Terminal-Block) ist ungeprüft und braucht entweder
eine Klärung von F-373 (z. B. `codex`-Verfügbarkeit in dieser Umgebung)
oder einen erneuten Versuch, bevor Stefan AK8 sinnvoll durchführen kann.
Server nach dem Test beendet (`taskkill /F`, PID 2732) — der reguläre
SIGTERM-Pfad griff unter Windows/git-bash nicht, der Instanzlock
(`kontrollzustand/.leitstand.lock`) heilt beim nächsten Start über die
PID-Lebendprüfung in `belegeInstanzLock` selbst aus. Reale Artefakte
dieses Tests liegen unter `kontrollzustand/*abcd6a25*` (nicht committet,
flüchtiger Kontrollzustand außerhalb des Change-Sets).

## Reviewer-/QA-Pass (frischer Kontext, 14.09.2026)

Beide Pflichtpässe (CLAUDE.md, F-046) liefen VOR dem Commit gegen den
unveränderten Arbeitsbaum. Erstdurchlauf beider: NICHT freigegeben.

`code-reviewer` und `qa` fanden UNABHÄNGIG denselben kritischen Befund:
`starteBearbeitung`/`wiederholeRouten` mutierten nach jedem `await` direkt
die globale `bearbeitungsZustand`-Variable statt eines lokal eingefangenen
Objekts (anders als das bereits vorhandene Muster in
`freigebenBearbeitung`/`aktualisiereBearbeitungsZustand`). Wechselt der
Mensch während eines laufenden `legeAuftragAn`/`routeAuftrag`-Requests zu
einem ANDEREN Finding, konnte das je nach Timing entweder eine
`TypeError` auf `null` auslösen (stiller Fehlschlag ohne UI-Rückmeldung)
oder — schwerwiegender — die verspätete Antwort für Finding A in das
inzwischen für Finding B offene `bearbeitungsZustand` schreiben, sodass
B fälschlich A's `auftragId`/`workflowId` zeigt und „Freigeben" für B den
Workflow von A gestartet hätte. Behoben: alle vier Handler
(`starteBearbeitung`, `wiederholeRouten`, `verarbeiteRoutenAntwort`,
`freigebenBearbeitung`) arbeiten jetzt auf einem lokal eingefangenen
`zustand`-Objekt; jeder Render-Aufruf nach einem `await` ist zusätzlich
über `istNochOffenesPanel(workitem)` (== `gewaehlteId === workitem.id`)
gegen ein inzwischen gewechseltes Panel abgesichert.

Zweiter, kleinerer gemeinsamer Befund: die Phase `'fehler'` bot keinen
Wiederholen-Weg, wenn der Auftrag bereits real angelegt war (nur
`'konflikt'`/409 hatte einen Knopf) — ein erneutes „Bearbeiten" hätte
einen zweiten, verwaisten Auftrag für dasselbe Finding angelegt. Behoben:
derselbe `Wiederholen`-Knopf erscheint jetzt auch bei `'fehler'`, sobald
`auftragId` bereits gesetzt ist.

`npm run check` nach beiden Fixes erneut grün. Ein zweiter, gezielter
`code-reviewer`-Pass (frischer Kontext, nur auf den Fix selbst) fand einen
dritten, feineren Grenzfall: `renderBearbeitungsAbschnitt()` liest immer
die GLOBALE `bearbeitungsZustand`, nicht das lokal eingefangene
`zustand`-Objekt der aufrufenden Klick-Kette — wechselt der Mensch während
eines laufenden Requests kurz zu einem ANDEREN Finding und wieder ZURÜCK
zu demselben, setzt `ladeDetail` `bearbeitungsZustand` beim Weggehen auf
`null`; der reale Fortschritt der noch laufenden Kette (Auftrag ggf.
bereits angelegt/geroutet) wurde dadurch beim Zurückkehren für immer
unsichtbar — ein erneuter "Bearbeiten"-Klick hätte einen zweiten,
verwaisten Auftrag angelegt. Behoben: `pruefeUndUebernimmZustand(workitem,
zustand)` ersetzt die vorherige `istNochOffenesPanel`-Prüfung an allen vier
Klick-Ketten — sie übernimmt das lokale `zustand` wieder als globales
`bearbeitungsZustand`, wenn dieses inzwischen `null` ist (Rückkehr zum
selben Finding), verweigert das aber, wenn `bearbeitungsZustand`
inzwischen ein ANDERES, echtes Objekt für dasselbe Finding ist (ein
zweiter, neuerer "Bearbeiten"-Klick lief bereits an) — sonst würde die
ältere Kette den neueren Vorgang stillschweigend überschreiben.
`npm run check` danach erneut grün. Kein dritter Reviewer-Pass mehr
gelaufen (der Fix ist eng auf genau diesen einen, nachvollziehbar
durchgespielten Grenzfall begrenzt) — Stefan kann das bei AK8 mit
prüfen.

Nicht behoben (bewusst zurückgestellt, kein WS-2-Blocker): kein
sichtbarer Fehlerzustand bei einem Nicht-404-Fehlschlag von
`GET /api/workflows/<id>` während `'vorschlag'`/`'gestartet'`; kein
Timeout/Abbruch-Knopf für hängende Requests; „Ablehnen" (`'verworfen'`)
löscht den Workflow serverseitig nicht (Nicht-Ziel, F23/F-350) und ist
damit — kombiniert mit der bekannten AK5-Lücke (kein Rückverweis
Finding→bestehender Auftrag) — ein reales Duplikat-Risiko bei
Wiedereinstieg auf dasselbe Finding nach einem Seiten-Reload. Diese drei
Punkte sind hier dokumentiert, damit sie nicht erneut entdeckt werden
müssen, aber keiner davon ist in der gegebenen WS-2-SCOPE-Liste benannt.
