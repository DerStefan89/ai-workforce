# F15 — Workflow-Artefakt und Schritt-Automat

## ID

F15

## Titel

Workflow-Artefakt und Schritt-Automat

## Status

Status: IN_ARBEIT

Gültige Status-Werte (geprüft vom Gate, siehe A3a–e in
`features/AF-F001/feature.md`): `ENTWURF, READY_FOR_TECH,
WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN,
BLOCKIERT, ABGEBROCHEN`.

## Ziel

Ein vom Menschen freigegebener Workflow soll seine Schritte
nacheinander abarbeiten, ohne dass jeder einzelne Schritt von Hand
gestartet werden muss — und dabei an jeder Freigabe- oder Klärgrenze
zuverlässig anhalten.

Grundlage ist `docs/projekt/zielfassung.md` §13.4, **E-M3-1**: Innerhalb
eines vom Menschen freigegebenen `WORKFLOW_V0` darf der Execution
Controller den nächsten Schritt automatisch starten, wenn dessen
`freigabe`-Feld ≠ `ZWINGEND` ist und der vorherige Schritt `ERFOLGREICH`
endete. D13 (genau ein aktiver Arbeitsstrang) bleibt unverändert — ein
Schritt-Automat auf einer sequenziellen Kette, keine Parallelisierung.

F15 holt damit nach, was E-192 bewusst vertagt hatte (F-090): den
Zustandsautomaten über mehreren Läufen. Vor F15 kennt weder
`src/execution-controller/types.ts` noch `src/checkpoint-store/types.ts`
einen Schritt- oder Workflow-Begriff; `LaufStatus` gilt je `laufId`.

## Scope

- `WORKFLOW_V0` als Kernartefakt: Schema, handgeschriebener Validator,
  Beispieldateien, Gate (WS-1).
- Querverweisregeln, die JSON Schema nicht ausdrücken kann: eindeutige
  `schritt_id`, `nachfolger`- und `aktiver_schritt_id`-Referenzen,
  Zyklenfreiheit der `nachfolger`-Kette (WS-1).
- `ermittleNaechstenSchritt` als reine Entscheidungsfunktion ohne
  Datei-I/O und ohne Kenntnis von `AusfuehrungsErgebnis` (WS-2a).
- Verhaltensgleiche Extraktion des `AusfuehrungsEingaben`-Baus aus dem
  `POST /api/laeufe`-Handler, damit Automat und HTTP-Start denselben Weg
  nehmen (WS-2a).
- Workflow anlegen und lesen über den Leitstand-Server (WS-2a).
- Schritt-Automat: automatische Fortsetzung in der bestehenden
  Dispatch-Kette, D13-Übergabe im selben synchronen Tick (WS-2b).
- Leitstand-Ansicht: Schritte, Status, aktiver Schritt, Freigeben /
  Überspringen / Stoppen als Entscheidungsartefakt (WS-3).
- Realer Nachweis über den Leitstand (WS-4).

## Nicht-Ziele

- **Keine Parallelität.** D13 bleibt unverändert; der Automat läuft eine
  sequenzielle Kette entlang, genau ein aktiver Schritt.
- **Kein Codex-Dispatch.** `worker: "codex"` ist im Schema zulässig, wird
  aber angehalten statt ausgeführt — der zweite Worker ist F16 (E-M3-2).
  Kein stiller Ersatz durch `claude-code` (E-159).
- **Keine automatische Modellwahl.** Besetzung bleibt gepinnt (E-M3-3).
- **Kein Router.** Welcher Workflow vorgelegt wird, entscheidet in F15
  der Mensch von Hand; Klassifikation und Vorlagen sind F17.
- **Kein Replan-Automatismus.** Ein Replan ist eine menschliche
  Entscheidung; F15 zählt ihn nur.
- **Keine neue Lineage-Mechanik.** Jeder Schritt wird mit
  `vorgaengerLaufId = <lauf_id des Vorschritts>` gestartet und erbt damit
  die bestehende Verweisbildung aus F8 WS-2b und F13 WS-3 unverändert.

## Akzeptanzkriterien

- **AK1** *(WS-1, erfüllt)* — `schemas/kontrollzustand-workflow-payload.schema.json`
  beschreibt die Form von `daten.daten` bei `workflow_schema === "v0"`;
  `validiereWorkflowDaten` in `src/workflow/index.ts` ist die ausgeführte
  Regel, handgeschrieben nach dem AUFTRAG_V0-Muster (kein Ajv, D5).
- **AK2** *(WS-1, erfüllt)* — Vier Querverweisregeln, die JSON Schema
  nicht ausdrücken kann, sind erzwungen und je einzeln rot kalibriert:
  doppelte `schritt_id`, unbekannter `nachfolger`, unbekannte
  `aktiver_schritt_id`, Zyklus in der `nachfolger`-Kette.
- **AK3** *(WS-2a, erfüllt)* — `ermittleNaechstenSchritt` entscheidet aus
  Workflow-Daten und einem normalisierten Schrittergebnis über fünf
  Ausgänge: `starte`, `haltFreigabe`, `haltKlaerung`, `haltGrenze`,
  `fertig`. Reine Funktion, kein Datei-I/O, kein Import aus
  `src/execution-controller`.
- **AK4** *(WS-2a, erfüllt)* — Der `AusfuehrungsEingaben`-Bau liegt in
  `loeseAusfuehrungsEingabenAuf` statt inline im HTTP-Handler,
  verhaltensgleich zum Stand vor der Extraktion. Es gibt weiterhin genau
  einen `fuehreAufgabeDurchFn`-Aufrufpunkt.
- **AK5** *(WS-2a, erfüllt)* — `POST /api/workflows` legt einen
  validierten Workflow als Kernartefakt an; `GET /api/workflows` und
  `GET /api/workflows/<id>` lesen ihn.
- **AK6** *(WS-2b)* — Endet ein Schritt `ERFOLGREICH` und ist der
  Folgeschritt startbereit mit `freigabe ≠ ZWINGEND`, startet er ohne
  menschliches Zutun. Die D13-Übergabe erfolgt im selben synchronen
  Tick, in dem `laufAktiv` zurückgesetzt wird — kein Fenster, durch das
  ein paralleler `POST /api/laeufe` schlüpfen kann.
- **AK7** *(WS-2b)* — Bei `freigabe: ZWINGEND` hält der Automat real an.
  Die erteilte Freigabe wird als Entscheidungsartefakt festgehalten und
  ist die einzige Auflösung; `freigabe` selbst bleibt unverändertes
  Plandatum.
- **AK8** *(WS-3)* — Der Leitstand zeigt Workflow, Schrittliste, Status
  je Schritt und den aktiven Schritt. Freigeben, Überspringen und
  Stoppen wirken über den bestehenden Entscheidungs-Schreibpfad.
- **AK9** *(WS-1/WS-2a, erfüllt)* — Gate-Skript
  `scripts/check-f15-workflow.mjs`, Teil von `npm run check`.
- **AK10** *(WS-4)* — Realer Nachweis über den Leitstand: ein
  zweistufiger Workflow (lesender Schritt, dann schreibender Schritt)
  läuft ohne manuellen Zwischenstart; ein `ZWINGEND`-Halt tritt real
  ein; ein Abbruch nach F14 wirkt auf den aktiven Schritt.

## Entschieden

- **E-M3-1** *(Stefan, 09.09.2026, `docs/projekt/zielfassung.md` §13.4)* —
  Ausnahme vom Orchestrierungs-Grundsatz Stufe 1 und von E-M2-2 für
  Schritte innerhalb eines freigegebenen Workflows.

Die folgenden Festlegungen sind Empfehlungen des Technical Challengers
(reversibel, mit Verwerfungsbedingung), keine Entscheidungen Stefans:

- **`aktiver_schritt_id` ist ein Cursor** *(WS-1)* — der Schritt, auf dem
  der Automat steht: der laufende, sonst der als Nächstes fällige; `null`
  nur bei `ABGESCHLOSSEN` oder `GESTOPPT`. Die Lesart „läuft gerade" wäre
  redundant zum Schritt mit `status: LAEUFT` und gesetzter `lauf_id` —
  zwei Wahrheitsquellen für dieselbe Tatsache (§16.2). Zu verwerfen, wenn
  WS-2b zeigt, dass der Wiederaufnahmepunkt ohnehin aus der Schrittliste
  abgeleitet werden muss.
- **`EMPFOHLEN` startet automatisch wie `AUTOMATISCH`** *(WS-2a)* —
  E-M3-1 sagt „≠ `ZWINGEND`". Der Unterschied ist rein anzeigend und
  gehört nach WS-3. Zu verwerfen, wenn sich im Dogfooding zeigt, dass
  ein `EMPFOHLEN`-Schritt ohne Halt niemand liest.
- **`max_schritte` bleibt ein Schrittbudget; ein Replan verbraucht
  `max_replans`** *(vor WS-2b, ersetzt die zunächst erwogene
  Schemaänderung aus F-194)* — die Terminierung steht bereits ohne
  Laufzähler: die Kette ist zyklenfrei validiert, und ein Schritt ist nur
  startbereit, solange `lauf_id === null` und `status ∈ {OFFEN,
  WARTET_FREIGABE}` (Regel 3). Ein Schritt kann daher vom Automaten nicht
  zweimal gestartet werden. Die einzige Wiederholung ist ein Replan, der
  eine `lauf_id` zurücksetzt — er verbraucht `max_replans` und ist ohne
  freies Kontingent nicht zulässig. Zusätzlich prüft WS-2b vor jeder
  Dispatch-Entscheidung mit `validiereWorkflowDaten`, damit die
  Zyklenfreiheit auch beim Laden gilt, nicht nur beim Anlegen. Zu
  verwerfen, wenn Replans real so häufig werden, dass eine Laufhistorie
  je Schritt gebraucht wird — dann mit realem Anlass als
  Schemaänderung, nicht auf Verdacht.
- **Auflösung eines `haltFreigabe` über ein Entscheidungsartefakt**
  *(vor WS-2b, zu F-195)* — WS-2b bekommt einen zusätzlichen Parameter,
  keinen zweiten Startpfad an `loeseAusfuehrungsEingabenAuf` vorbei. Der
  Parameter wird aus einem realen, über `POST /api/entscheidungen`
  festgehaltenen Entscheidungsartefakt abgeleitet (F13-Maschinerie),
  nicht aus einem nackten API-Flag. Zu verwerfen, wenn die
  F13-Entscheidungsformen für diesen Fall nachweislich nicht passen.

## Abweichung vom Bauauftrag WS-2a (F-193)

`ermittleNaechstenSchritt` hat sechs Regeln statt der vier beauftragten.
Neu sind Regel 0 (Workflow-Status ∉ `FORTSETZBARE_WORKFLOW_STATUS` →
`haltKlaerung`/`fertig`, geprüft vor der Verzweigung nach mit/ohne
Vorschrittergebnis) und Regel 3 (zu startender Schritt ist nicht
startbereit → `haltKlaerung`). Beide ändern das Verhalten real.

Der Bauauftrag war an dieser Stelle unvollständig, nicht der Bau zu
weitgehend: ohne die beiden Regeln hätte eine Wiederaufnahme einen
bereits gelaufenen Schritt erneut gestartet, und ein verspätet
eintreffendes Laufergebnis hätte einen vom Menschen gestoppten Workflow
fortgesetzt — beides ein Verstoß gegen ARCHITECTURE.md §4
(„ein unterbrochener Baulauf wird nie automatisch neu gestartet").
Gefunden im Reviewer-/QA-Pass vom 10.09.2026, jede Regel einzeln rot
kalibriert.

Die vier sicherheitsrelevanten Prüfungen sind zudem als Allowlist statt
als Sperrliste formuliert, damit ein künftig ergänzter Enum-Wert in
„hält an" fällt statt in „startet automatisch".

## Dependencies

- F8 (Execution Controller) — `fuehreAufgabeDurch`, unverändert; der
  Automat ruft es je Schritt erneut auf, statt eine Schleife hinein zu
  bauen.
- F2 (Lineage Registry) — `registriereKernArtefakt` /
  `ladeArtefaktVersion` für `workflow-<workflow_id>`.
- F1/F1B — Checkpoint-Kette, `stelleLaufstatusFest`.
- F10/F11/F12 (Leitstand) — `laufAktiv`-Sperre (D13), Startpfad,
  Auftragsbezug.
- F13 (Entscheiden) — Entscheidungs-Schreibpfad, Auflösung von
  `haltFreigabe`.
- F14 (Abbruch) — Abbruch wirkt auf den aktiven Schritt.
- Offene Findings mit F15-Bezug: F-090 (wird durch F15 gelöst), F-194
  bis F-199.
