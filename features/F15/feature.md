# F15 — Workflow-Artefakt und Schritt-Automat

## ID

F15

## Titel

Workflow-Artefakt und Schritt-Automat

## Status

Status: ABGESCHLOSSEN

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
- **AK6a** *(WS-2b, erfüllt)* — `POST /api/workflows/<id>/starten` startet den
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
- **AK7** *(WS-2b/WS-2c (b1)/(b3), erfüllt)* — Bei `freigabe: ZWINGEND` hält
  der Automat real an. Die erteilte Freigabe wird als Entscheidungsartefakt
  festgehalten und ist die einzige Auflösung; `freigabe` selbst bleibt
  unverändertes Plandatum. Seit (b3) gilt „einzige Auflösung" ohne
  Einschränkung: der zweite Weg — eine neue Fassung, die die Freigabepflicht
  zurücknimmt — ist keine Auflösung mehr an der Entscheidung vorbei, sondern
  selbst eine bezeugte Entscheidung (F-226, siehe die Festlegung unten).

  Satz 1 hielt seit WS-2b (Halt auf `WARTET_FREIGABE`), Satz 2 ist WS-2c
  (b1): `POST /api/workflows/<id>/freigabe` nimmt `FREIGEGEBEN` oder
  `ABGELEHNT` mit Pflichtbegründung entgegen, registriert beides als
  Kernartefakt `entscheidung-workflow-<workflowId>-<schrittId>`
  (`erzeuger: 'mensch'`, mit `eingaben`-Verweis auf die freigegebene
  Workflow-**Version**, damit später feststellbar bleibt, WELCHEN Plan der
  Mensch freigegeben hat) und setzt bei `FREIGEGEBEN` das neue, optionale
  Schrittfeld `freigabe_erteilt`. Nur dieses Feld löst den Halt auf —
  `freigabe` bleibt unangetastet, und `POST /api/workflows` normalisiert ein
  im Body mitgeschicktes `freigabe_erteilt` weg, sonst erteilte sich eine
  eingereichte Fassung die Freigabe selbst (ARCHITECTURE.md §3).
  `ABGELEHNT` setzt `GESTOPPT` — bewusst nicht `KLAERUNG_ERFORDERLICH`,
  weil `GESTOPPT` ersetzbar bleibt und damit der Reparaturpfad offen steht.

  **Vorbedingung ist die Regel, nicht der abgelegte Status** (QA-Pass
  10.09.2026, TC-05/TC-06): der Endpunkt fragt `ermittleNaechstenSchritt`
  und verlangt `haltFreigabe` für genau die eingereichte `schrittId`.
  `WARTET_FREIGABE` schreibt ausschließlich die Nachbereitung eines
  erfolgreichen Vorschritts; ein Workflow, dessen ERSTER Schritt `ZWINGEND`
  ist, und jede Reparaturfassung mit fälligem `ZWINGEND`-Schritt erreichen
  diesen Status nie (`POST .../starten` lehnt ab und schreibt bewusst
  nichts). Hinge die Freigabe am Status, wäre der Governance-Fall in genau
  diesen Bauformen unbedienbar und der einzige Ausweg das Entfernen von
  `ZWINGEND` aus dem Plan — eine Freigabe-Umgehung ohne Entscheidungs-
  artefakt. Die Regel ist dabei die **schärfere** Prüfung: sie lehnt
  zusätzlich alles ab, was aus einem anderen Grund nicht startbar wäre
  (`GESTOPPT`, laufender Schritt, erreichte Grenze, nicht dispatchbarer
  Worker) — eine Freigabe, die schon am Zustand des Automaten folgenlos
  bliebe, wird gar nicht erst entgegengenommen. Belegt über zwei
  Bestandsfassungen, die `WARTET_FREIGABE` tragen und trotzdem abgelehnt
  werden (nicht dispatchbarer Worker, erreichte Grenze); ohne sie wäre ein
  Rückbau auf den Statusvergleich unbemerkt grün geblieben (Reviewer-Pass
  10.09.2026, W1).

  Was die Vorprüfung NICHT abdeckt, sind die Plandaten, die erst
  `starteWorkflowSchritt` auflöst — Zeichenregel und Existenz von
  `auftrag_id`, Auflösbarkeit von `schritte[].eingaben` (Reviewer-Pass, W3).
  Eine Freigabe kann daran nach der Entscheidung noch scheitern; sie endet
  dann als `KLAERUNG_ERFORDERLICH` mit festgeschriebenem Grund (eigener
  Gate-Fall). Die Prüfung hier um eine zweite Fassung der Plandatenauflösung
  zu erweitern, wäre der schlechtere Tausch.

  **Festlegung — „einzige Auflösung" heißt: die einzige UNBEZEUGTE. Beide Wege
  hinterlassen eine Entscheidung** (WS-2c (b3), löst F-226; die Fassung aus
  (b1), die den Satz auf „innerhalb eines gegebenen Plans" einschränkte, ist
  damit überholt).

  Es gibt zwei Wege, einen `ZWINGEND`-Schritt startbar zu machen: den
  Freigabe-Endpunkt, und eine neue Fassung, in der derselbe Schritt nicht mehr
  `ZWINGEND` trägt (zulässig in `OFFEN`, `KLAERUNG_ERFORDERLICH` und
  `GESTOPPT`). Der zweite Weg blieb bis (b3) **unbezeugt** — kein
  `entscheidung-*`-Artefakt, keine Begründungspflicht. Der Bedrohungsfall ist
  dabei nicht Böswilligkeit, sondern Unachtsamkeit: der Mensch ändert einen
  Plan und merkt nicht, dass er dabei eine Freigabepflicht verloren hat — der
  Automat fährt den Schritt danach unbeaufsichtigt.

  Seit (b3) erkennt `POST /api/workflows` die **Abschwächung** beim Vergleich
  mit der ohnehin geladenen Vorfassung: ein Schritt, der unter derselben
  `schritt_id` nicht mehr `ZWINGEND` trägt, oder ein `ZWINGEND`-Schritt, der
  ganz entfällt. Dann ist `begruendung` Pflicht (400 sonst, mit den
  betroffenen `schritt_id`s **namentlich** im Grund), und es entsteht
  `entscheidung-workflow-<workflowId>-planaenderung` (`erzeuger: 'mensch'`,
  `ergebnis: 'FREIGABEPFLICHT_ABGESCHWAECHT'`, mit Begründung, Zeitstempel,
  der Liste der Schritte samt alter und neuer Stufe und einem
  `eingaben`-Verweis auf die **vorherige** Version — sie ist der Plan, in dem
  die Pflicht noch stand). Das Artefakt entsteht VOR dem Schreiben der neuen
  Fassung; scheitert es, wird die Fassung NICHT geschrieben (500). Das ist der
  Unterschied zum Stopp aus (b2): dort war die Wirkung schon eingetreten, hier
  ist sie es noch nicht.

  **Was ausdrücklich frei bleibt** — und das ist der Kern der gewählten
  Variante B: gewöhnliche Planänderungen, die Erstanlage, und die
  VERSCHÄRFUNG (`AUTOMATISCH` → `ZWINGEND`). Wer sich selbst eine
  Freigabepflicht auferlegt, begründet das nicht. Eine Pflicht, die bei jedem
  Speichern anschlägt, wird zur Klickstrecke und dann von niemandem mehr
  gelesen — dieselbe Erosion, gegen die der Lock-Hinweis aus der
  WS-2c-Vorbereitung geschrieben ist.

  Die Alternative (Variante A: die Ersetzungssperre an die Regel hängen statt
  an den Status) ist bewusst verworfen — ihr Preis wäre, dass ein Tippfehler
  in einem `ZWINGEND`-Schritt nicht mehr korrigierbar ist, also genau der
  zugemauerte Zustand, gegen den die Ersetzungsregel verengt wurde. Der
  eigentliche Zweck der gewählten Lösung ist ohnehin nicht die Begründung,
  sondern die Meldung davor: der Mensch liest, welche Freigabepflicht er
  gerade aufgibt, und korrigiert im Regelfall die Fassung, statt sie zu
  begründen.

  **Festlegung — eine Freigabe gilt für die Schrittfassung, nicht für einen
  einzelnen Startversuch** (Reviewer-/QA-Pass 10.09.2026): `freigabe_erteilt`
  wird beim Laufstart nicht verbraucht. Scheitert der freigegebene Schritt so,
  dass die Heilung ihn auf `OFFEN` zurücksetzt, ist er ohne neue Entscheidung
  erneut startbar — derselbe Schritt, derselbe Plan, derselbe Mensch, der den
  Start auslöst. Verbraucht wird sie durch eine neue Fassung: `POST
  /api/workflows` normalisiert `freigabe_erteilt` weg, ein geänderter Plan
  braucht also eine neue Freigabe. Belegt über einen eigenen Gate-Fall
  (Freigabe → heilbarer Fehlschlag → Start ohne zweite Entscheidung → läuft).

  **Invariante — ein `ZWINGEND`-Schritt startet nie automatisch** (QA-Pass
  10.09.2026, Befund 6). Sie ist ausdrücklich KEINE Regel: die Regel startet
  einen `ZWINGEND`-Schritt sehr wohl, sobald `freigabe_erteilt` gesetzt ist,
  und die Auto-Fortsetzung nimmt jedes `starte` unbesehen. Die Invariante hält
  allein, weil zwei Tatsachen zusammenwirken — (1) `freigabe_erteilt` wird an
  genau EINER Stelle gesetzt, im Freigabe-Endpunkt, für den fälligen Schritt,
  der unmittelbar danach startet; (2) `POST /api/workflows` normalisiert das
  Feld aus jedem eingereichten Körper weg. Beide sind im Gate festgenagelt,
  (1) als Zählung im Quelltext. **Wer in WS-3 einen Cursor-, Überspringen-
  oder Wiederaufnahmepfad baut, bricht diese Invariante, sobald er
  `freigabe_erteilt` an einem noch nicht fälligen Schritt stehen lässt.**

  Reale Nachweise: `scripts/check-f15-automat-real.mjs` (c) — ein Workflow
  mit `ZWINGEND`-Schritt hält über die GESAMTE reale Kette (echter
  Kindprozess) auf `WARTET_FREIGABE` an, EIN `POST .../freigabe` löst den
  Halt, Schritt 2 läuft mit eigener terminaler Checkpoint-Kette zu Ende;
  (d) — eine reale Ablehnung stoppt den Workflow, der abgelehnte Schritt
  läuft nicht, und der Reparaturpfad wird bis zum Ende begangen: korrigierte
  Fassung angenommen, erneut freigegeben (ohne persistiertes
  `WARTET_FREIGABE`) und real bis `ABGESCHLOSSEN` durchgelaufen. Dazu in
  `scripts/check-f15-workflow.mjs` die Vertragsform beider Zweige mit ihren
  Ablehnungsgründen (404, 400 bei Zeichenregel für `workflowId` UND
  `schrittId` sowie bei Body-Randfällen, 409 bei fehlender Freigabefrage,
  Stale-`schrittId`, nicht dispatchbarem Schritt, `GESTOPPT` und D13), der
  Rotfall gegen die Selbstfreigabe über den Body, der Fall „`ZWINGEND` als
  erster Schritt ist freigebbar" und der Fall „gescheiterter Start NACH
  erteilter Freigabe endet als `KLAERUNG_ERFORDERLICH` statt zugemauert".
- **AK8** *(WS-3a + WS-3b, ERFÜLLT)* — Der Leitstand zeigt Workflow,
  Schrittliste, Status je Schritt und den aktiven Schritt. Freigeben und
  Stoppen wirken über den bestehenden Entscheidungs-Schreibpfad.

  **Erfüllt mit WS-3b (10.09.2026), belegt in
  `nachweis/f15-ws3b-oberflaechennachweis.md`** — realer Chrome, echte Seite,
  echter Server, geprüft am Artefakt auf der Platte. Bis dahin war AK8 auch
  LESEND unerfüllt (F-253): der Zustand, in dem der Mensch die einzige
  Entscheidungsinstanz ist, hatte keine Anzeige, solange er nicht persistiert
  war.

  **Was WS-3a (10.09.2026) erbracht hat — die Ansicht, rein lesend:**
  `public/leitstand/index.html` trägt einen Abschnitt „Workflows",
  `public/leitstand/app.js` projiziert `GET /api/workflows` (Kopfdaten je
  Workflow: `workflow_id`, Ziel, Fassung, Status, Cursor und — neu, F-221 (a)
  — der Halt-`grund` als sichtbare Zeile) und `GET /api/workflows/<id>`
  (Schrittliste in Planreihenfolge entlang der `nachfolger`-Kette, je Schritt
  `schritt_id`, Rolle, Worker, Modell, `freigabe`/`freigabe_erteilt`, Status,
  `lauf_id` als Verweis in den bestehenden Lauf-Abschnitt, `nachfolger`,
  `zeitgrenze_ms`). Der Schritt, dessen `lauf_id` der Server über
  `GET /api/laeufe/<laufId>` als `aktiv` meldet (D13), ist als laufend
  markiert; eine Fassung, die der Server mit 409 ablehnt, erscheint als
  benannter Zustand „Fassung ungültig" statt als halbe Schrittliste.
  Serverseitig war dafür genau EINE Änderung nötig: `grund` in
  `baueWorkflowKopfdaten`.

  Neu gegatet: `scripts/check-f15-workflow-oberflaeche.mjs` (in
  `npm run check`) prüft den Quelltext von `public/leitstand/` gegen diese
  Zusagen, jedes Feld einzeln, dazu die Syntax von `app.js` und die
  WS-3a-Scope-Grenze („app.js ruft keinen der drei Schreibendpunkte auf").
  42 Zusagen einzeln rot kalibriert. **Wichtig für die nächste Sitzung:**
  `public/leitstand/` war bis dahin von KEINEM Gate berührt —
  `scripts/check-f12-leitstand-ansicht.mjs` prüft trotz seines Namens die
  API-Projektionen hinter der Ansicht, nicht die Ansicht (F-251).

  **Was WS-3b (10.09.2026) erbracht hat — die Bedienung und der
  Reparaturzug:**

  *Serverseitig zwei ADDITIVE Projektionsfelder, kein geänderter
  Antwortvertrag.* (1) `naechster` (`{ art, schrittId, grund }`) in BEIDEN
  Workflow-Projektionen, ausschließlich aus `ermittleNaechstenSchritt` ohne
  Vorschrittergebnis (`baueNaechsterProjektion`, D5) — dieselbe Funktion und
  derselbe Aufruf, den auch der Start- und der Freigabe-Endpunkt für ihre
  Entscheidung benutzen. Auch in der LISTE, weil F-253s Kern ist, dass der
  Mensch sehen muss, WO er gebraucht wird, ohne jeden Workflow einzeln zu
  öffnen. **Auflage, im Code vermerkt:** `naechster` ist eine Projektion und
  wird nirgends persistiert; das Gate hält fest, dass es in keinem Artefakt
  steht. (2) `verstoesse` (aus `validiereWorkflowDaten`) im Detail, weiterhin
  mit 200 und vollem Datensatz (F-247): eine ungültige Fassung muss ansehbar
  bleiben, denn sie anzusehen ist der erste Schritt ihrer Reparatur. Der in
  WS-3a gebaute, vom echten Server unerreichbare 409-Zweig im Client ist auf
  diesen realen Weg umgestellt.

  *Oberfläche: vier Bedienungen, alle an bestehenden Endpunkten.* Starten
  (`naechster.art === 'starte'`), Freigeben und Ablehnen (`haltFreigabe`,
  F-222), Stoppen (`status` in den stoppbaren Zuständen, F-216). Freigeben,
  Ablehnen und Stoppen tragen ein Pflicht-Begründungsfeld — die Oberfläche
  provoziert den 400 des Servers nicht erst. Angeboten wird ausschließlich,
  was der Server ausweist; D13 wird dagegen NICHT vorhergesagt: kommt ein
  409, steht sein Grundtext als Meldung am Workflow. Nach jeder Bedienung
  läuft ein Poll außer der Reihe; der Generationszähler aus F-252 greift auch
  für den neuen Ladeweg.

  *Der Reparaturzug (löst F-240, F-218).* „Reparaturfassung vorbereiten" bei
  `GESTOPPT` und `KLAERUNG_ERFORDERLICH` lädt die aktuelle Fassung und wendet
  die vier Korrekturen an, die bis dahin nur `check-f15-automat-real.mjs`
  Block (e) vollständig machte: `status` auf `OFFEN`; die Schrittfelder des
  abgebrochenen oder gescheiterten Schritts zurückgesetzt; der Cursor bleibt,
  wo er steht, und zeigt bei `null` auf den ersten Schritt ohne `lauf_id`; der
  Halt-`grund` bleibt im Entwurf sichtbar. Ergebnis ist ein BEARBEITBARER
  JSON-Text mit „Einreichen" (`POST /api/workflows`) — kein Formular, das wäre
  ein Plan-Editor und eine zweite, alternde Beschreibung von `WORKFLOW_V0`.
  **Auflage, im Code vermerkt:** die Cursor-Vorbelegung ist ein Vorschlag für
  einen Entwurf, den der Mensch ändert — KEINE Durchsetzung und kein zweiter
  Cursor-Regelsatz.

  *Fünf Warnungen über dem Entwurf*, alle aus der geladenen Fassung
  ableitbar: F-223 (eine erteilte, noch nicht verbrauchte Freigabe geht beim
  Einreichen verloren), F-219 (ein Schritt, dessen `lauf_id` zurückgesetzt
  wird, fällt als Lineage-Vorgänger aus), F-226 (nimmt der Entwurf eine
  ZWINGEND-Pflicht zurück, verlangt der Server eine Begründung — das Feld
  dafür steht sichtbar am Entwurf, und die Warnung wird beim Tippen neu
  gerechnet, nicht erst beim Absenden), dazu aus dem QA-Pass zwei weitere
  Verluste, die F-240 selbst aufzählt: der Halt-`grund` wird beim Einreichen
  wegnormalisiert, und eine bereits erreichte `grenzen.max_schritte` hebt der
  Entwurf nicht an. **Die Warnungen LÖSEN F-219 und F-223 nicht**, sie machen
  sie sichtbar; beide bleiben offen, weil das, was sie beschreiben, eine
  zulässige menschliche Entscheidung ist.

  *Aus Reviewer- und QA-Pass im selben Commit nachgezogen:* die Reparatur wird
  auch bei einer UNGÜLTIGEN Fassung angeboten (der Server lässt einen
  ungültigen Bestand in jedem Status ersetzen — ohne diesen Öffner wäre genau
  die Fassung, für die F-247 die Lesbarkeit erkämpft hat, ansehbar und nicht
  reparierbar), und der Stopp-Knopf verschwindet dort (der Stopp-Endpunkt
  lehnt sie mit 409 ab, F-241); der Reparaturentwurf hat einen eigenen
  Überholschutz; jede Bedienung quittiert auch den ERFOLG und wertet dabei
  `laufAbgebrochen` und `bezeugt` aus; der Workflow-Kopf wird auch dann
  gerendert, wenn die Schrittliste unlesbar ist. Neue Findings daraus: F-262
  bis F-267.

  *F-253 geschlossen:* je Workflow eine abgeleitete LAGE („wartet auf dich —
  Freigabe nötig" / „läuft" / „steht — …" / „durchgelaufen"), in Liste UND
  Detail, dazu die Markierung des fälligen und des Cursor-Schritts in der
  Tabelle und der Ausweis von `EMPFOHLEN`/`AUTOMATISCH` als „hält nicht an".

  *F-249 beantwortet, ohne den Poll abzuschalten:* die Schrittliste wird
  weiter bei jedem Tick ersetzt, der Bedienblock nur bei echter Lageänderung,
  der Reparaturentwurf gar nicht — eine angefangene Pflichtbegründung
  überlebt damit den Poll, eine zu einer weggefallenen Frage nicht.

  *Gate:* `scripts/check-f15-workflow-oberflaeche.mjs` prüft (g) Verdikt,
  Bedienungen und Pflichtbegründungen, (h) den Reparaturzug mit seinen vier
  Korrekturen und drei Warnungen; der Scope-Fall (e) ist UMGEDREHT statt
  gelöscht (er verlangt jetzt genau die drei Aufrufe, die er vorher verbot),
  ebenso die Zusage über den Einleitungssatz in `index.html`.
  `scripts/check-f15-workflow.mjs` prüft `naechster` in beiden Projektionen
  mit je einem Fall für alle sechs Ausgangsarten und `verstoesse` gefüllt wie
  leer. **65 Zusagen einzeln rot kalibriert**, Rückbau über Datei-Hash
  gegengeprüft (F-211) — dabei real gefunden, dass eine Zusage durch ihre
  eigene Funktionsdeklaration erfüllbar war.

  **Was offen bleibt:** F-254 (Zeiten, Plandaten wie `eingaben`/`werkzeugsatz`
  in der Schrittliste, Leseseite der Entscheidungsartefakte), F-255 (ein
  Workflow mit unlesbarer Kette verschwindet lautlos aus der Liste), F-256
  (vier kleinere Anzeigemängel), F-248 (die Markierung „läuft jetzt" fehlt
  still, solange das Laufverzeichnis noch nicht existiert). Keiner davon
  gehört zu AK8s Wortlaut; AK10 (realer Nachweis mit echtem Kindprozess über
  den Leitstand) ist WS-4.

  **Bekannte Lücke, keine Vergessenheit: „Überspringen" ist gestrichen**
  *(Entscheidung Stefan, 10.09.2026)* — AK8 nannte ursprünglich auch
  Überspringen als Bedienung. Der Schrittstatus `UEBERSPRUNGEN` bleibt im
  Schema (`schemas/kontrollzustand-workflow-payload.schema.json`), wird aber
  von niemandem gesetzt: weder Automat noch Endpunkt noch Oberfläche. Einen
  Schritt für unnötig zu erklären ist eine PLANÄNDERUNG und läuft über eine
  neue Fassung via `POST /api/workflows` — seit WS-2c (b3) wird eine solche
  Änderung bezeugt, sobald sie eine Freigabepflicht abschwächt. Ein zweiter
  Weg, einen ZWINGEND-Schritt loszuwerden, wäre genau die Umgehung, gegen die
  (b3) gebaut ist.
- **AK9** *(WS-1/WS-2a, erfüllt)* — Gate-Skript
  `scripts/check-f15-workflow.mjs`, Teil von `npm run check`.
- **AK10** *(WS-4, erfüllt)* — Realer Nachweis über den Leitstand: ein
  zweistufiger Workflow (lesender Schritt, dann schreibender Schritt)
  läuft ohne manuellen Zwischenstart; ein `ZWINGEND`-Halt tritt real
  ein; ein Abbruch nach F14 wirkt auf den aktiven Schritt.
  Protokoll: `features/F15/nachweis-ak10.md` (10.09.2026, Bedienung durch
  Stefan im Browser, Verifikation an den Artefakten unter
  `kontrollzustand/` und am `git diff`). Die drei Teilsätze schließen sich
  in EINEM Lauf gegenseitig aus und brauchten deshalb drei Läufe (L1/L2/L3,
  Pläne unter `nachweis/ws4/`) — als **F-268** festgehalten, nicht
  stillschweigend umgedeutet. Aus L2 stammt der erste Codeeingriff dieses
  Repos, den die Workforce selbst erzeugt hat (F-243, eine Zeile).
  Das Protokoll benennt seine Grenzen ausdrücklich: der Automatenhalt nach
  dem Abbruch ist überdeterminiert (F-272), und der Werkzeugsatz eines
  Laufs ist aus den Artefakten nicht rekonstruierbar (F-271).

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
| `KLAERUNG_ERFORDERLICH` | nach einer Heilung; der Planfehler steht noch im Artefakt | neue Fassung mit korrigiertem Plan — oder, wenn der Fehler außerhalb des Plans lag, schlicht erneut starten: der geheilte Schritt ist wieder startbereit |
| `WARTET_FREIGABE` | Folgeschritt trägt `freigabe: ZWINGEND` | `POST /api/workflows/<id>/freigabe` — `FREIGEGEBEN` setzt `freigabe_erteilt` und startet den Schritt sofort, `ABGELEHNT` führt nach `GESTOPPT` (AK7, WS-2c (b1)). Eine neue Fassung ist in DIESEM Status gesperrt |
| **Freigabefrage OHNE persistierten Status** *(WS-2c (b1))* | erster Schritt eines Workflows trägt `ZWINGEND`, oder der fällige Schritt einer Reparaturfassung tut es — `POST .../starten` antwortet 409 und schreibt nichts, der Workflow bleibt auf `OFFEN` bzw. `KLAERUNG_ERFORDERLICH` | derselbe Freigabe-Endpunkt: er fragt die Regel, nicht den Status. **Hier ist die neue Fassung nicht gesperrt** — siehe die Festlegung zur Planänderung unten |
| `GESTOPPT` *(neu in WS-2c (b1))* | eine Freigabe wurde abgelehnt | neue Fassung derselben `workflow_id` — `GESTOPPT` steht nicht in `GESPERRTE_ERSETZUNGS_STATUS` |
| `KLAERUNG_ERFORDERLICH` *(neu in WS-2c (b1))* | der Start scheiterte NACH erteilter Freigabe an einem Plandatum (`auftrag_id`, unauflösbare `eingaben`) | erneutes `POST .../starten` (die Freigabe steht noch) ODER neue Fassung — die verwirft `freigabe_erteilt` und verlangt eine neue Freigabe |
| `GESTOPPT` | `grenzen.max_schritte` erreicht | neue Fassung mit angehobener Grenze |
| Schritt `LAEUFT` nach Serverneustart | Prozess starb mitten im Lauf | der nächste Startversuch schreibt `KLAERUNG_ERFORDERLICH` fest, dann neue Fassung |
| `KLAERUNG_ERFORDERLICH` *(neu in WS-2c)* | die automatische Fortsetzung scheiterte vor dem Laufstart (Planfehler im Folgeschritt: unauflösbare `eingaben`-Referenz, unbekannter `werkzeugsatz`, Schreibfehler) | neue Fassung mit korrigiertem Plan |
| `GESTOPPT` *(neu in WS-2c (b2))* | **der Mensch hat gestoppt** — `POST /api/workflows/<id>/stoppen` mit Pflichtbegründung. Zulässig aus `OFFEN`, `LAEUFT`, `WARTET_FREIGABE` und `KLAERUNG_ERFORDERLICH`; gehört ein aktiver Lauf zu diesem Workflow, wird er abgebrochen (`laufAbgebrochen: true`), sonst nicht (`false`) — beides 200 | neue Fassung derselben `workflow_id` — `GESTOPPT` steht nicht in `GESPERRTE_ERSETZUNGS_STATUS`. Real belegt: `check-f15-automat-real.mjs` (e) geht den Reparaturzug nach einem Stopp mitten im Schritt zu Ende |

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

`WARTET_FREIGABE` war bis WS-2c (b1) der letzte Halt ohne Ausweg (F-207) und
ist es nicht mehr: der Freigabe-Endpunkt aus AK7 löst ihn auf, in beide
Richtungen. Die neue Fassung bleibt dort gesperrt — das ist kein Restmangel,
sondern die Regel, die eine Freigabe-Umgehung verhindert.

Ein weiterer Punkt, den WS-3 prüfen muss:

- **Ein Regel-0-Ausgang kann `KLAERUNG_ERFORDERLICH` über ein bestehendes
  `GESTOPPT` schreiben.** — **eingelöst in WS-2c (b1), an zwei Stellen.**
  `GESTOPPT` verlässt Regel 0 seither über den EIGENEN Ausgang
  `haltGestoppt`, den `workflowStatusZuAusgang` auf `GESTOPPT` abbildet — das
  deckt die Nachbereitung ab. Es deckt aber NICHT alle Schreibpfade ab, wie
  die erste Fassung dieses Absatzes behauptete (Reviewer-Pass 10.09.2026,
  K1): die Heilung einer verwaisten `lauf_id` und der Halt nach einem
  gescheiterten Start schreiben `KLAERUNG_ERFORDERLICH` hart, ohne die Regel
  überhaupt zu fragen. Ein Stopp mitten in einem Schritt, dessen Lauf gleich
  darauf heilbar scheitert, wäre also weiterhin überschrieben worden.
  Deshalb liegt der Schreibschutz in `schreibeWorkflowFortschritt` —
  der EINEN Funktion, durch die jeder Schreibpfad läuft: steht auf der Platte
  `GESTOPPT`, bleiben Status, Cursor und Grund eingefroren, während die
  Schrittfelder weiter gelten (der Schritt bekommt seinen tatsächlichen
  Ausgang; ein Stopp verschweigt nicht, was gelaufen ist).

  Die Arbeitsteilung der beiden Hälften ist damit **nicht** symmetrisch, und
  eine frühere Fassung dieses Absatzes behauptete das zu Unrecht
  (Reviewer-Pass 10.09.2026, W2): den Schreibschutz leistet der Wächter in
  `schreibeWorkflowFortschritt` allein — `workflowStatusZuAusgang` sieht ein
  `haltGestoppt` nie, weil `leiteWorkflowFelderAb` auf einem `GESTOPPT` gar
  nicht mehr aufgerufen wird. Der eigene Ausgang trägt stattdessen die
  409-Antworten von `POST .../starten` und `POST .../freigabe` (`art:
  'haltGestoppt'` statt eines irreführenden `haltKlaerung`) und hält die
  Allowlist-Bauart der Regel geschlossen. Rot kalibriert sind beide, aber auf
  verschiedene Weise: `haltGestoppt` entfernt → die `art`-Zusagen des Gates
  werden rot; der Wächter entfernt → die Heilung überschreibt den Stopp real,
  Gate rot. Verhaltensbelege in `scripts/check-f15-workflow.mjs` („ein
  Automaten-Ausgang überschreibt ein bestehendes GESTOPPT NICHT" und „ein
  GESTOPPT überlebt auch die HEILUNG").
- **`grenzen.max_replans` wird validiert, aber von keiner Codestelle
  gelesen.** Die Terminierung steht ohne das Feld (F-194, gelöst): zyklen- und
  zusammenführungsfreie Kette plus Regel 3. Braucht WS-2c es nicht, gehört es
  aus dem Schema entfernt statt als Dekoration behalten — dieselbe Regel, die
  in diesem Workstream für `schritte[].eingaben` angewandt wurde (ein Feld,
  das erklärt wird und wirkungslos bleibt, ist eine Zusage, auf die sich
  niemand verlassen kann).

## Der Workflow-Stopp (WS-2c (b2), löst F-216)

`POST /api/workflows/<id>/stoppen` mit `{ begruendung }`. Er ist die Bremse,
die WS-2c gebraucht hat, seit die Kette selbsttätig fährt: `POST
/api/laeufe/<laufId>/abbrechen` zielt auf eine `laufId`, die sich mit jedem
Schritt ändert, antwortet zwischen zwei Schritten 404 und ist damit als
Notbremse unbrauchbar; eine neue Fassung ist in `LAEUFT` gesperrt. Dieser
Endpunkt zielt deshalb auf den **Workflow**.

Abgebrochen wird **nur der eigene Lauf**: die Zugehörigkeit wird am Artefakt
abgelesen (ein Schritt auf `LAEUFT`, dessen `lauf_id` die des aktiven Laufs
ist), nicht aus `laufAktiv` geraten — D13 kennt genau einen aktiven
Arbeitsstrang, aber nicht, wem er gehört. Real belegt in
`check-f15-automat-real.mjs` (g): Workflow B stoppen, während der Kindprozess
von Workflow A läuft — B ist gestoppt, A läuft unangetastet bis
`ABGESCHLOSSEN` durch. Rot kalibriert durch Rückbau auf `laufAktiv` (F-239).

Die Reihenfolge ist die Wirkung, nicht ihr Beiwerk: **zuerst** wird
`GESTOPPT` / `aktiver_schritt_id: null` / `grund` geschrieben, **dann** der
aktive Lauf abgebrochen — und nur, wenn er zu diesem Workflow gehört
(abgelesen am Artefakt: ein Schritt auf `LAEUFT`, dessen `lauf_id` die des
aktiven Laufs ist, nicht geraten aus `laufAktiv`). Gewartet wird auf nichts
(Muster `/abbrechen`). Danach wird die Entscheidung bezeugt (siehe unten);
die Antwort ist `200 { workflowId, laufAbgebrochen, bezeugt }` plus
`artefaktId`/`versionSequenz`. Der abgebrochene Lauf endet Sekunden später, seine
Nachbereitung lädt frisch, findet `GESTOPPT` vor, und der Schutz in
`schreibeWorkflowFortschritt` hält: der Schritt bekommt seinen tatsächlichen
Ausgang, der Workflow bleibt `GESTOPPT`, Schritt n+1 startet nicht. Real
belegt in `check-f15-automat-real.mjs` (e)/(f), mit Attrappe und Riegel
deterministisch in `check-f15-workflow.mjs`.

**Grenze der Reihenfolge-Zusage, ausdrücklich benannt:** Schreiben und
Abbrechen liegen heute in EINEM synchronen Block. Vertauscht man sie, ändert
sich am beobachtbaren Ablauf nichts — der Rückruf des Laufs kann frühestens
im nächsten Microtask feuern. Die Reihenfolge ist damit verhaltensmäßig nicht
ansteuerbar (dieselbe Lage wie bei der AK6b-Invariante, F-212) und wird als
Quelltextzusage geprüft: der Bereich `STOPP-REIHENFOLGE` in
`scripts/leitstand-server.mjs`, mit Selbsttest. Rot kalibriert durch
Vertauschen der beiden Blöcke.

**Die Bezeugung (F-233, Challenger-Entscheidung 10.09.2026).** Ein vom
Menschen ausgelöster Stopp ist dieselbe Klasse wie eine abgelehnte Freigabe
und bekommt dieselbe Spur: Kernartefakt
`entscheidung-workflow-<workflowId>-stopp`, `erzeuger: 'mensch'`,
`ergebnis: 'GESTOPPT'`, Pflichtbegründung, Zeitstempel und ein
`eingaben`-Verweis auf die Workflow-Version, die der Mensch beim Stoppen vor
sich hatte. Ohne sie stünde die Begründung nur im Feld `grund` — und die
nächste eingereichte Fassung überschreibt den; `GESTOPPT` ist ausdrücklich
ersetzbar, das ist der Reparaturzug. Der Stopp wäre damit die einzige
Menschenentscheidung im System ohne Bezeugung gewesen.

Zwei Punkte sind bewusst und benannt:

- **Reihenfolge gegenüber dem Freigabe-Endpunkt.** D2 ist eingehalten: alle
  sechs Prüfungen des Stopp-Endpunkts liegen VOR dem ersten Schreibvorgang.
  Was abweicht, ist die Stellung des Entscheidungsartefakts — beim
  Freigabe-Endpunkt entsteht es vor der Zustandsänderung, hier danach: nach
  dem Schreiben und nach dem Abbruch. Der Stopp muss zuerst auf der Platte
  stehen (daran hängt die ganze F-216-Wirkung), und der Abbruch darf nicht auf
  Artefakt-I/O warten. Die Reihenfolge ist: stoppen, abbrechen, bezeugen.
- **Kein Rückrollen.** Scheitert das Schreiben des Artefakts, bleibt der Stopp
  gültig: er ist die Wirkung, die der Mensch wollte, und ein Workflow, der
  nach einem 500 doch weiterliefe, wäre der schlimmere Ausgang. Stattdessen
  Startfehlereintrag und eine 200 mit `bezeugt: false` samt Grund — eine
  ehrliche Teilmeldung statt eines stillen Verlusts. **Dieser Zweig ist über
  die HTTP-Oberfläche nicht ansteuerbar und deshalb unbelegt** (F-238).

**Zwei Vorsorgen im realen Gate (F-231).** Die Rot-Kalibrierung zu F-216 hat
eine Lücke im Gate selbst aufgedeckt: `check-f15-automat-real.mjs` endet über
`process.exitCode`, und ein überlebender Kindprozess — genau der Fall, gegen
den Block (e) gebaut ist — hielt die Event-Loop offen. Das Gate meldete
nichts, es lief nicht zu Ende, und `npm run check` blieb stehen. Seither: ein
`unref()`-Wachhund (fünf Minuten gegen zehn Sekunden reale Laufzeit) beendet
die Datei MIT Befund und Exit 1, und die Blöcke mit hängendem Kindprozess
brechen einen noch fliegenden Lauf in ihrer Aufräumroutine aktiv ab. Beide
sind einzeln rot kalibriert.

Zwei Härtungen gehören in denselben Zuschnitt, weil erst der Stopp sie
erreichbar macht:

- **F-227 (Identitätsprüfung, gelöst).** Die Nachbereitung eines Laufs
  schreibt nur noch, wenn der geladene Schritt die `lauf_id` GENAU DIESES
  Laufs trägt. Der Weg dorthin ist seit dem Stopp offen: stoppen (`GESTOPPT`
  ist ersetzbar), neue Fassung einreichen, während der alte Lauf noch fliegt —
  die neue Fassung steht auf `OFFEN`, der `GESTOPPT`-Schutz greift also nicht,
  weil er den ZUSTAND liest und nicht die IDENTITÄT. Ohne die Prüfung bekommt
  ein fremder Plan den Ausgang eines Laufs, den niemand für ihn gestartet hat,
  und die Auto-Fortsetzung fährt in ihm weiter — real reproduziert (Rot-Fall:
  Prüfung entfernt, der fremde Schritt steht auf `ERFOLGREICH`, ein zweiter
  Lauf startet). Gesetzt wird sie NUR von der Nachbereitung; Freigabe,
  Ablehnung, Stopp und beide Heilungen adressieren keinen bestimmten Lauf und
  sollen auf dem Stand wirken, der jetzt daliegt.
- **F-228 (der Schutz meldet sich, gelöst).** `schreibeWorkflowFortschritt`
  gibt im eingefrorenen Fall `{ ok: true, eingefroren: true }` zurück — EINE
  Form, kein zweiter Rückgabetyp. `starteWorkflowSchritt` bricht daraufhin ab,
  ohne zu starten und ohne D13 zu belegen, und setzt den gerade geschriebenen
  Schrittstand zurück (`OFFEN`, `lauf_id: null`) — es ist nichts gelaufen,
  also steht auch nichts am Schritt. Alle acht Aufrufstellen lesen das Feld.
  **Diese Zusage ist Tiefenverteidigung und hat bewusst keinen
  Verhaltens-Rotfall:** es führt kein Weg dorthin, weil alle drei Aufrufer des
  Startpfads vorher `ermittleNaechstenSchritt` fragen und `GESTOPPT` dessen
  Regel 0 über `haltGestoppt` verlässt, nie über `'starte'`; der Stopp
  schreibt sein `GESTOPPT` synchron, es gibt also auch kein Fenster dazwischen.
  Die Aussage von F-228 („der Stopp aus (b2) macht das erreichbar") trifft
  deshalb so nicht zu — geprüft wird die Behandlung im Quelltext (Zählung der
  Aufrufstellen gegen die Lesestellen), rot kalibriert durch Entfernen der
  Behandlung. Als ERZWUNGENE Grenze wird sie nicht behauptet
  (`ARCHITECTURE.md` §8).

Zusammenhang mit **AK7**: dessen zweiter Satz — die erteilte Freigabe wird
als Entscheidungsartefakt festgehalten und ist die einzige Auflösung — war
auf dem WS-2b-Stand nicht gebaut; WS-2b hielt bei `WARTET_FREIGABE` real an
(AK7 Satz 1), löste den Halt aber nicht auf. WS-2c (b1) hat ihn gebaut, siehe
AK7 oben. WS-2c (b3) hat ihn vollendet: bis dahin galt „einzige Auflösung"
nur innerhalb eines gegebenen Plans, weil eine Fassung, die die
Freigabepflicht zurücknimmt, unbezeugt durchging. Seither ist auch dieser Weg
begründungspflichtig und hinterlässt ein Entscheidungsartefakt (F-226).

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
