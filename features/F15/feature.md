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
- Workflow starten und einen Schritt ausführen; danach wandert der Cursor
  auf den nächsten fälligen Schritt weiter und der Workflow-Status folgt
  diesem Ausgang — ein manueller Schritt-für-Schritt-Modus, in dem jeder
  Schritt einen eigenen Aufruf braucht (WS-2b).
- Schritt-Automat: automatische Fortsetzung ohne diesen zweiten Aufruf, in
  der bestehenden Dispatch-Kette, D13-Übergabe im selben synchronen Tick
  (WS-2c).
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
- **AK2** *(WS-1, erfüllt; fünfte Regel in WS-2b ergänzt)* — Fünf
  Querverweisregeln, die JSON Schema nicht ausdrücken kann, sind erzwungen
  und je einzeln rot kalibriert: doppelte `schritt_id`, unbekannter
  `nachfolger`, unbekannte `aktiver_schritt_id`, Zyklus in der
  `nachfolger`-Kette und — seit WS-2b — die Zusammenführung zweier Schritte
  auf denselben `nachfolger`.
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
- **AK6a** *(WS-2b)* — `POST /api/workflows/<id>/starten` startet den
  fälligen Schritt eines Workflows über den Automatenpfad
  (`ermittleNaechstenSchritt` → `loeseAusfuehrungsEingabenAuf` →
  `fuehreAufgabeDurch`, kein zweiter Startpfad). Endet der Schritt, wandert
  `aktiver_schritt_id` auf den nächsten fälligen Schritt weiter und
  `status` folgt dem Ausgang von `ermittleNaechstenSchritt`
  (`starte` → `LAEUFT`, `haltFreigabe` → `WARTET_FREIGABE`,
  `haltKlaerung` → `KLAERUNG_ERFORDERLICH`, `haltGrenze` → `GESTOPPT`,
  `fertig` → `ABGESCHLOSSEN`).
  *Überholt durch AK6b (WS-2c):* Der zweite Satz dieses Kriteriums lautete
  „Gestartet wird dabei nichts: ein zweiter Aufruf führt den nächsten Schritt
  aus." Das beschreibt den WS-2b-Stand und nicht mehr das gebaute System —
  seit WS-2c startet die Nachbereitung den Folgeschritt selbst, und ein
  einzelner Schritt lässt sich nicht mehr isoliert ausführen. Der Satz bleibt
  hier stehen, weil AK6a als erfüllt gilt und ein stillschweigend geänderter
  Wortlaut die Historie verwischen würde.
- **AK6b** *(WS-2c, erfüllt)* — Endet ein Schritt `ERFOLGREICH` und ist der
  Folgeschritt startbereit mit `freigabe ≠ ZWINGEND`, startet er ohne
  menschliches Zutun — der zweite Aufruf aus AK6a entfällt. Die
  D13-Übergabe erfolgt im selben synchronen Tick, in dem `laufAktiv`
  zurückgesetzt wird — kein Fenster, durch das ein paralleler
  `POST /api/laeufe` schlüpfen kann.
  Reale Nachweise: `scripts/check-f15-automat-real.mjs` (a) — ein
  zweistufiger Workflow läuft über die GESAMTE reale Kette (echter
  Kindprozess, F8→F5→F6a inkl. F4→F7→F1B) nach EINEM
  `POST /api/workflows/<id>/starten` durch; Schritt 2 trägt eine eigene
  `lauf_id` mit eigener terminaler Checkpoint-Kette. Dazu in
  `scripts/check-f15-workflow.mjs`: Grünfall 2 (ein Aufruf, zwei Läufe,
  Lineage-Kette intakt), Grünfall 2b (nach der Übergabe ist D13 belegt) und
  die Quelltext-Invariante `D13-UEBERGABE-OHNE-FENSTER` mit Selbsttest. Die
  Grenze der Invariantenprüfung ist als F-212 festgehalten: das Fenster
  selbst ist verhaltensmäßig nicht ansteuerbar, geprüft wird der Quelltext.
  Der Zusammenspielfall aus F-208 (manueller Abbruch von Schritt 1 setzt
  NICHT auf Schritt 2 fort) ist real belegt, nicht angenommen —
  `check-f15-automat-real.mjs` (b).
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
  Laufzähler: die Kette ist zyklen- UND zusammenführungsfrei validiert (die
  Zusammenführungsregel kam mit WS-2b hinzu), und ein Schritt ist nur
  startbereit, solange `lauf_id === null` und `status ∈ {OFFEN,
  WARTET_FREIGABE}` (Regel 3). Ein Schritt kann daher vom Automaten nicht
  zweimal gestartet werden. Die einzige Wiederholung ist eine vom Menschen neu
  eingereichte Fassung (WS-2b); sie verbraucht bewusst KEIN `max_replans` —
  der Mensch ist selbst die Grenze, und `max_replans` hat bis heute keinen
  Leser (siehe „Halte-Zustände nach WS-2b und ihr Ausweg"). Zusätzlich prüft WS-2b vor jeder
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
- **`schritte[].eingaben` werden aufgelöst, nicht dekoriert** *(WS-2b)* —
  bis WS-2a erzwang das Schema für jeden Eintrag das Format
  `artefakt:<id>`, ohne dass irgendjemand die Referenz je auflöste. Der
  Automat löst sie jetzt über `ladeArtefaktVersion` auf und stellt sie der
  Anfragenliste als `notwendig: true`-Eintrag voran — dasselbe Muster, mit
  dem `src/execution-controller/index.ts` Auftrag, Laufakte und Entscheidung
  einhängt, mit `kanonischesJson(version.daten)` als `inhalt`. Fehlt ein
  referenziertes Artefakt, HÄLT der Schritt an (400, die fehlende Artefakt-ID
  steht im Grund) statt still mit weniger Kontext zu laufen, als der Mensch
  geplant hat: ein Feld, das erklärt wird und dann wirkungslos bleibt, ist
  eine Zusage, auf die sich niemand verlassen kann. Zu verwerfen, wenn das
  Feld real nie befüllt wird — dann gehört es im Schema auf die leere Liste
  beschränkt, nicht mit einer Auflösung ausgestattet, die nie läuft.
- **Bei `modell` und `zeitgrenze_ms` gewinnt das gepinnte Plandatum des
  Schritts gegen die Startvorlage** *(WS-2b, E-185/E-M3-3)* — beide Werte
  stehen je Schritt in `WORKFLOW_V0` und beide haben ein Gegenstück in der
  Startvorlage (`vorlage.modell`, `vorlage.zeitgrenzeMs`). Der Schrittwert
  gewinnt, weil er Teil dessen ist, was der Mensch beim Freigeben des
  Workflows gelesen hat; eine Serverkonfiguration, die ihn überstimmte,
  änderte die Besetzung nach der Freigabe (E-M3-3: keine automatische
  Modellwahl). `budget` liegt bewusst quer dazu: `WORKFLOW_V0` kennt kein
  Budgetfeld, deshalb kommt es aus `vorlage.standardBudget` — der einzige
  verwendbare Wert, den eine Serverkonfiguration dafür trägt. Zu verwerfen,
  wenn sich zeigt, dass ein Workflow-Plan realistisch nicht über die
  Lebensdauer eines Modellnamens hinweg gültig bleibt — dann gehört die
  Besetzung an die Startvorlage und der Schritt trägt nur noch eine Rolle.

- **`budget` kommt aus `vorlage.standardBudget`; ein Schritt trägt keins**
  *(WS-2b)* — `WORKFLOW_V0` kennt kein Budgetfeld, und ein im Code
  erfundener Default wäre eine stille fachliche Entscheidung. Die
  Startvorlage trägt `standardBudget` als Pflichtfeld (F11 WS-2 AK4); es
  war bis WS-2b ohne Wirkung, weil ein Startauftrag-Body sein eigenes
  `budget` mitbringt — ein Schritt bringt keins, also greift es hier. Zu
  verwerfen, sobald reale Workflows je Schritt unterschiedliche Budgets
  brauchen — dann gehört ein Budgetfeld ins Schema, nicht eine zweite
  Ersatzquelle in den Server.
- **`schritte[].eingaben` referenziert ausschließlich Artefakte, die VOR
  dem Workflow-Start existieren** *(WS-2b)* — die Ausgabe eines Vorschritts
  ist zur Planzeit nicht referenzierbar: ihre Artefakt-ID hängt an der erst
  zur Laufzeit erzeugten `lauf_id`. Sie fließt über `vorgaengerLaufId` in
  den Folgeschritt (F8 stellt Laufakte und Entscheidung des Vorgängerlaufs
  selbst voran) — nicht über `eingaben`. Die Fixture
  `schemas/examples/kontrollzustand-workflow.valid.json` hat diese Annahme
  bis WS-2b verletzt (`artefakt:befund-schritt-1-pruefung`, ein Artefakt,
  das nirgends entsteht) und wäre unter der Auflösungsregel beim zweiten
  Schritt garantiert an einem 400 gescheitert. Zu verwerfen, sobald ein
  realer Workflow die Ausgabe eines NICHT unmittelbaren Vorgängers braucht —
  dann mit einer eigenen Bezugsform `schritt:<id>`, die der Automat gegen
  die `lauf_id` dieses Schritts auflöst, nicht durch Aufweichen von
  `artefakt:`.
- **Der Schrittstatus ist die Momentaufnahme des Laufausgangs, keine
  Live-Projektion des Laufs** *(WS-2b)* — endet ein Lauf
  `KLAERUNG_ERFORDERLICH`, steht der Schritt auf `FEHLGESCHLAGEN`
  (`SCHRITT_STATUS` kennt nichts Genaueres; die Klärbedürftigkeit trägt der
  Workflow-Status). Löst der Mensch den Lauf danach über
  `POST /api/entscheidungen` auf, ändert das den Schritt NICHT: die
  Auflösung erzeugt einen neuen Lauf, und den Schritt neu zu belegen ist ein
  Replan. Bewusst so — eine Nachführung des Schrittstatus aus dem Laufstatus
  wäre eine zweite Wahrheitsquelle für dieselbe Tatsache (§16.2). Zu
  verwerfen, wenn sich zeigt, dass der Mensch die Divergenz zwischen
  angezeigtem Schritt- und tatsächlichem Laufausgang real nicht auflösen
  kann — dann als Replan-Pfad, nicht als stille Nachführung.
- **Eine fachliche Ablehnung ohne geschriebenen Checkpoint setzt `lauf_id`
  auf `null` und den Schritt auf `OFFEN` zurück** *(WS-2b)* — ohne das
  trüge der Schritt eine `lauf_id`, unter der es nichts zu sehen gibt, und
  Regel 3 von `ermittleNaechstenSchritt` machte ihn dauerhaft unstartbar:
  ein Tippfehler in `schritt.rolle` (Rollen haben bis F17 keinen Vertrag,
  F-184) mauerte den Schritt zu. Das ist KEIN Replan — es lief nichts — und
  verbraucht kein `max_replans`. Die Bedingung ist enger als
  `ok === false` und wird am Dateisystem abgelesen: F6as `verweigereStart`
  schreibt in fünf von sieben Ablehnungszweigen eine reale
  VERWEIGERT-Wirkungsmarke, und wo eine solche Marke liegt, wird nichts
  zurückgesetzt (F1s Kette ist append-only, ARCHITECTURE.md §7). Genau
  gelesen prüft `existsSync(<basis>/<laufId>)` „kein Checkpoint und keine
  Wirkungsmarke", NICHT „kein Artefakt": Lineage-Artefakte liegen unter
  `<basis>/lineage-<artefaktId>/`. Gelingt F5 und lehnt danach F6as
  `pruefeStartziel`-Zweig ohne Wirkungsmarke ab, bleibt ein verwaistes
  `kontextpaket-<laufId>` zurück und es wird trotzdem geheilt — die Kette
  selbst bleibt heil, der nächste Start zieht eine frische `laufId`. Zu
  verwerfen, wenn F17 den Rollen einen Vertrag gibt und der Tippfehlerfall
  damit vor dem Start abgefangen wird — dann ist die Heilung nur noch für
  `EVIDENZLUECKE` und die zwei markenlosen F6a-Zweige da und kann als
  eigener Fall neu bewertet werden.
- **Eine neue Fassung ist gesperrt in `LAEUFT`, `WARTET_FREIGABE` und
  `ABGESCHLOSSEN` — sonst erlaubt** *(WS-2b, ersetzt die zunächst gebaute
  Fassung „alles außer `OFFEN`")* — `POST /api/workflows` lehnt eine neue
  Fassung eines bestehenden Workflows nur in den drei Zuständen ab, in denen
  sie wirklich Schaden anrichtet: solange etwas läuft (`LAEUFT`), solange
  etwas auf eine menschliche Freigabe wartet (`WARTET_FREIGABE`, sonst wäre
  die neue Fassung eine Freigabe-Umgehung durch die Hintertür), und wenn eine
  fertige Historie umgeschrieben würde (`ABGESCHLOSSEN` — dafür gibt es eine
  neue `workflow_id`). In `KLAERUNG_ERFORDERLICH` und `GESTOPPT` ist die neue
  Fassung der menschliche REPARATURZUG selbst; die breitere erste Fassung
  mauerte genau den Fall zu, für den die Heilung einer verwaisten `lauf_id`
  gebaut wurde. Kein `max_replans`-Verbrauch: `max_replans` begrenzt die
  AUTOMATISCHE Wiederholung, ein Mensch, der neu einreicht, ist selbst die
  Grenze. Zu verwerfen, wenn sich zeigt, dass ein Mensch versehentlich eine
  Fassung ersetzt, die er noch braucht — dann mit einem ausdrücklichen
  Bestätigungsschritt, nicht durch erneutes Verbreitern der Sperre.
- **Ein „stale `LAEUFT`" wird als `KLAERUNG_ERFORDERLICH` festgeschrieben,
  ohne den Schritt anzufassen** *(WS-2b)* — steht ein Workflow auf `LAEUFT`
  und ein Schritt ebenfalls, während D13 keinen aktiven Lauf kennt, ist der
  Server mitten im Schritt gestorben. Der Startendpunkt schreibt dann eine
  neue Version mit `KLAERUNG_ERFORDERLICH` und antwortet 409 mit dem
  Stale-Grund, statt den Menschen mit einem dauerhaften „Schritt nicht
  startbereit" stehen zu lassen. Muster: F1Bs `stelleLaufstatusFest` erkennt
  denselben Zustand eine Ebene tiefer (ein `run_prepared` ohne Terminalmarke)
  und liefert dafür ebenfalls `KLAERUNG_ERFORDERLICH`. Die `lauf_id` des
  Schritts bleibt unverändert — das ist der Unterschied zur Heilung nach
  einem Laufende: dort ist BELEGT, dass nichts geschrieben wurde, hier ist
  unbekannt, ob unter dieser `lauf_id` real ein Lauf gelaufen ist, dessen
  Ausgang niemand eingesammelt hat. Der belastbare Marker ist der SCHRITT auf
  `LAEUFT`, nicht der Workflow: seit der Cursor-Wanderung steht ein Workflow
  auch im gesunden Zwischenstand auf `LAEUFT`. Zu verwerfen, sobald ein
  Wiederaufnahmepfad existiert, der die `lauf_id` gegen
  `stelleLaufstatusFest` abgleicht und den Ausgang nachträglich einsammelt —
  dann ist das Festschreiben als Klärfall zu grob.
- **Eine Zusammenführung — zwei Schritte mit demselben `nachfolger` — ist
  ungültig** *(WS-2b, ersetzt die WS-1-Festlegung, sie sei ein Grünfall)* —
  fünfte Querverweisregel in `validiereWorkflowDaten`. Der Startendpunkt
  bestimmt den Lineage-Vorgänger eines Schritts über
  `nachfolger === schritt_id && lauf_id !== null`; bei einer Zusammenführung
  ist er nicht bestimmbar, und der Endpunkt kann nur mit 409 anhalten. Ein
  Validator, der so einen Workflow annimmt, ließe einen Plan durch, der sich
  nicht zu Ende ausführen lässt — die Ablehnung gehört an die Stelle, an der
  der Mensch den Plan noch ändern kann. Der Mehrdeutigkeits-409 im
  Startendpunkt bleibt als Tiefenverteidigung stehen, ist aber seit dieser
  Regel UNERREICHBAR: der Startendpunkt validiert den geladenen Datensatz,
  bevor er den Vorgänger bestimmt — auch bei Bestandsartefakten. Er wird
  deshalb nicht als eigene Grenze im Gate behauptet (ARCHITECTURE.md §8).
  Damit ein solcher Bestand nicht unerreichbar wird, ist ein ungültiger
  Workflow in JEDEM Status durch eine neue Fassung ersetzbar. Zu verwerfen, sobald ein realer Plan echte
  Verzweigung braucht — dann mit einer Bezugsform, die den Vorgänger
  ausdrücklich benennt, statt ihn aus der Kette zu erraten.

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


## Halte-Zustände nach WS-2b und ihr Ausweg

Der Reviewer-/QA-Pass vom 10.09.2026 fand fünf Zustände, in denen der
Schritt-für-Schritt-Modus anhält, und zunächst keinen Weg aus ihnen heraus.
Vier davon sind mit den WS-2b-Nachträgen aufgelöst; die Tabelle hält alle
fünf fest, damit der verbliebene nicht als Einzelfall untergeht.

| Zustand | wie erreicht | Ausweg |
|---|---|---|
| `KLAERUNG_ERFORDERLICH` | Schritt endete nicht `ERFOLGREICH` (`lauf_id` bleibt, Regel 3) | neue Fassung derselben `workflow_id` |
| `KLAERUNG_ERFORDERLICH` | nach einer Heilung; der Planfehler steht noch im Artefakt | neue Fassung mit korrigiertem Plan |
| `WARTET_FREIGABE` | Folgeschritt trägt `freigabe: ZWINGEND` | **keiner** — neue Fassung gesperrt, kein Freigabe-Endpunkt (AK7, siehe unten) |
| `GESTOPPT` | `grenzen.max_schritte` erreicht | neue Fassung mit angehobener Grenze |
| Schritt `LAEUFT` nach Serverneustart | Prozess starb mitten im Lauf | der nächste Startversuch schreibt `KLAERUNG_ERFORDERLICH` fest, dann neue Fassung |
| `KLAERUNG_ERFORDERLICH` *(neu in WS-2c)* | die automatische Fortsetzung scheiterte vor dem Laufstart (Planfehler im Folgeschritt: unauflösbare `eingaben`-Referenz, unbekannter `werkzeugsatz`, Schreibfehler) | neue Fassung mit korrigiertem Plan |

Der letzte Zustand ist der einzige, den WS-2c hinzugefügt hat, und er war in
der ersten Fassung von Teil (a) eine Falle: die gescheiterte Fortsetzung
schrieb nichts, der Workflow blieb auf `LAEUFT` stehen — ohne Schritt auf
`LAEUFT`, also ohne Stale-Heilung, und mit gesperrter Ersetzung. Ein
gewöhnlicher Planfehler im zweiten Schritt hätte den Workflow endgültig
verloren. Reviewer- und QA-Pass am 10.09.2026 haben das unabhängig
voneinander gefunden; die Fortsetzung schreibt seither ihren eigenen Halt
fest (Rotfall 7 in `scripts/check-f15-workflow.mjs`).

Aufgelöst wurde davon die Spalte „kein Weg zurück": eine neue Fassung
desselben Workflows ist in `KLAERUNG_ERFORDERLICH` und `GESTOPPT` erlaubt
(siehe „Entschieden"), und der stale-`LAEUFT`-Fall wird beim nächsten
Startversuch selbst nach `KLAERUNG_ERFORDERLICH` überführt. Der Mensch kommt
aus jedem der vier Zustände über eine korrigierte Fassung derselben
`workflow_id` weiter; einen Replan-Zähler gibt es dafür bewusst nicht.

Offen bleibt `WARTET_FREIGABE`: dort ist die neue Fassung gesperrt (sie wäre
eine Freigabe-Umgehung), und einen Endpunkt, der eine Freigabe entgegennimmt,
gibt es nicht. Das ist der einzige verbliebene Halt ohne Ausweg und gehört zu
AK7 (siehe unten).

Zwei weitere Punkte, die WS-3 bzw. WS-2c prüfen müssen:

- **Ein Regel-0-Ausgang kann `KLAERUNG_ERFORDERLICH` über ein bestehendes
  `GESTOPPT` schreiben.** Endet ein Lauf, während der Workflow schon auf
  `GESTOPPT` steht, liefert `ermittleNaechstenSchritt` korrekt `haltKlaerung`
  (Regel 0) — die Nachbereitung schreibt diesen Ausgang aber unbesehen zurück,
  und `KLAERUNG_ERFORDERLICH` ist wieder fortsetzbar. Ein vom Menschen bewusst
  gestoppter Workflow wäre damit überschrieben. Heute unerreichbar: kein
  Endpunkt setzt `GESTOPPT` während eines Laufs. Mit dem Stoppen aus WS-3
  (AK8) wird es real und ist dort als Vorbedingung zu prüfen — ein bestehender
  `GESTOPPT`-Status darf von der Nachbereitung nicht überschrieben werden.
- **`grenzen.max_replans` wird validiert, aber von keiner Codestelle
  gelesen.** Die Terminierung steht ohne das Feld (F-194, gelöst): zyklen- und
  zusammenführungsfreie Kette plus Regel 3. Braucht WS-2c es nicht, gehört es
  aus dem Schema entfernt statt als Dekoration behalten — dieselbe Regel, die
  in diesem Workstream für `schritte[].eingaben` angewandt wurde (ein Feld,
  das erklärt wird und wirkungslos bleibt, ist eine Zusage, auf die sich
  niemand verlassen kann).

Zusammenhang mit **AK7**: dessen zweiter Satz — die erteilte Freigabe wird
als Entscheidungsartefakt festgehalten und ist die einzige Auflösung — ist
auf dem WS-2b-Stand nicht gebaut. WS-2b hält bei `WARTET_FREIGABE` real an
(AK7 Satz 1), löst den Halt aber nicht auf.

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
