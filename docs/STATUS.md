<!--
Planungsdokument — NICHT von Prüfung 1 (tote Verweise) erfasst, weil eine
Planungsdatei per Definition über Dateien spricht, die noch nicht oder
nicht mehr existieren.
-->
# Status — AI Workforce

Einzige Quelle für Phasenstand und Scope.

## Aktuelle Phase

Ebene 1 (Produktgrundlage) und Ebene 2 (Technische Grundlage) sind
abgeschlossen. Die Vertragsschiene (1, 2, Option B, 3, 4, 5) ist
abgeschlossen. Meilenstein 1 und Meilenstein 2 (Bedienbarer Leitstand,
`docs/projekt/zielfassung.md` §13.3) sind abgeschlossen (Stand
09.09.2026). Das Projekt ist in Meilenstein 3 (Intelligente
Orchestrierung, `docs/projekt/zielfassung.md` §13.4).

## Erledigt

- Zielbild, Rollenmodell, Lifecycle, Sicherheits- und Evidenzmodell sowie
  Architektur-Baseline sind entschieden (`docs/projekt/zielfassung.md`).
- Technischer Stack, Modulschnitt und Zustandsablage sind festgelegt.
- Die Vertragsschiene zur Harness-Härtung ist abgeschlossen.
- AF-F001 (Feature-Akte im Repo) ist umgesetzt: `features/<id>/feature.md`
  + `journal.md` als Ablageort, `scripts/check-feature.mjs` als Gate
  (eingehängt in `npm run check:template`), erste befüllte Akte
  `features/AF-F001/` mit `Status: READY_FOR_TECH`.
- Feature 0 (Datenformate) ist umgesetzt: `kontrollzustand/` und
  `profiles/` existieren real im Repo, ihr Format ist über
  `schemas/*.schema.json` + `schemas/examples/` maschinell geprüft
  (`scripts/check-datenformate.mjs`, eingehängt in `npm run check` und
  `npm run check:template`). `F-010` ist damit erledigt.
- Feature 1 (Checkpoint Store) ist umgesetzt: `src/checkpoint-store/`
  schreibt, lädt und validiert eine Hash-Kette von Checkpoints je
  `lauf_id` (Schreiben, Laden, Validierung, Hash-Kette, Gate
  `scripts/check-checkpoint-store.mjs`, eingehängt in `npm run check` und
  `npm run check:template`). Der Windows-Rename-Atomaritätsnachweis
  (D4) ist als eigenständiges, manuelles Skript
  (`scripts/verify-rename-atomicity.mjs`) real gelaufen, bewusst
  **nicht** in die Standardkette eingehängt — bleibt ein einmaliger,
  plattformabhängiger Nachweis, siehe `state/gates.md`.
- Feature 2 (Artifact Registry / Lineage) ist umgesetzt: `src/lineage-
  registry/` registriert kern- und werkzeug-erzeugte Artefakt-Versionen,
  hält Eingaben fest, prüft mechanisch auf STALE und hält eine
  menschliche STALE-Entscheidung fest. Lineage-Einträge nutzen F1s
  Checkpoint-Hash-Kette (`lauf_id = lineage-<artefakt_id>`) — kein
  eigener Dateibaum unter `kontrollzustand/` (Gate
  `scripts/check-lineage-registry.mjs`, eingehängt in `npm run check`
  und `npm run check:template`).
- F1B (Wirkungsmarke, `RUN_PREPARED`, Terminalartefakt, Klärzustands-
  Feststellung) ist umgesetzt: `src/checkpoint-store/` schreibt und lädt
  zusätzlich zu Checkpoints auch Wirkungsmarken (`typ: "wirkungsmarke"`)
  in derselben Hash-Kette; `stelleLaufstatusFest` stellt für eine
  `lauf_id` fest, ob eine `RUN_PREPARED`-Marke ohne zugeordnetes
  Terminalartefakt vorliegt (`KLAERUNG_ERFORDERLICH`, FIFO-Paarung bei
  mehreren offenen Marken) — nie automatischer Neustart (Gate
  `scripts/check-f1b-wirkungsmarke.mjs`, eingehängt in `npm run check`
  und `npm run check:template`).
- F3 (Authorization Boundary, minimal) ist umgesetzt: `src/authorization-
  boundary/` prüft eine Freigabe-/Verweigerungsentscheidung, die in einem
  lokalen Git-Repository außerhalb dieses Produkt-Repos liegt
  (`C:\Users\stefa\ai-workforce-autorisierung\`, D16), gegen den echten
  Inhalt am referenzierten Commit (`git show`) — nie gegen die im
  Kontrollzustand mitgeführte Referenz allein. Eine Verweigerung nutzt
  F1Bs bestehendes Terminalartefakt `VERWEIGERT` weiter, kein neuer
  Terminalzustand (Gate `scripts/check-f3-authorization-boundary.mjs`,
  eingehängt in `npm run check` und `npm run check:template`). Deckt nur
  die "Veränderungs"-Hälfte von E-189 — die "Erzeugungs"-Hälfte (OS-
  seitige Schreibsperre) ist ausdrücklicher Nicht-Ziel-Rand.
- F9 (Human Transport) ist umgesetzt: `src/human-transport/` erfasst einen
  `BEDARF_V0`, bündelt ihn zu einem Transportpaket (F2
  `registriereKernArtefakt`), bezeugt die Aushändigung mit F1Bs
  `RUN_PREPARED` und schließt den Lauf über ein F1B-Terminalartefakt ab.
  Eine zurückkommende Antwort wird vor jeder Registrierung gegen ein
  eigenes Schema geprüft (Schemaverstoß → `FEHLGESCHLAGEN`, D4). Vor
  jeder Weiterverwendung blockiert `pruefeUndEntscheideStale` (D6) bei
  veralteter `BEDARF_V0`-Referenz, bis eine menschliche Entscheidung über
  F2s `haltFestStaleEntscheidung` festgehalten wurde. Der bestehende
  Leitstand-Prototyp (`scripts/leitstand-server.mjs`,
  `public/leitstand/`) zeigt Aufgabe/Status/Executor/Ergebnis für
  Human-Transport-Läufe an, ohne neuen Schreibpfad (Gate
  `scripts/check-f9-human-transport.mjs`, eingehängt in `npm run check`
  und `npm run check:template`).
- F5 (Context Builder) ist umgesetzt: `src/context-builder/` baut aus
  einer Anfrageliste (Pfad, Frage, Begründung, vom Aufrufer bereits
  gelesener Inhalt) ein begrenztes Kontextpaket je Auftrag und Rolle —
  Rollenfilter (Kern-Konstante, keine Profilzuordnung, D1/D14),
  Duplikat-/Widerspruchserkennung über einen zusammengesetzten
  Element-Schlüssel, zweiphasige Budget-Vergabe (notwendige Anfragen
  zuerst, kumulativ gegen das volle Budget — Evidenz vor Budget,
  Entscheidung 115). Eine notwendige Anfrage, die nicht ins Budget
  passt, stoppt den Bau vollständig statt eines Teilpakets. Das Paket
  wird über F2s `registriereKernArtefakt` registriert, `pruefeKontext-
  paketFrisch` prüft ein bereits gebautes Paket über F2s `pruefeStale`
  auf STALE, bevor es erneut ausgeliefert wird. Kein Runtime-/Modell-
  Feld im Schema (E-191 N1/N2). Zwei Advisor-Pässe (erster: nicht
  freigegeben, sechs Deltas gelöst; zweiter, delta-beschränkt:
  freigegeben mit Hinweisen) vor dem Bau (Gate
  `scripts/check-f5-context-builder.mjs`, eingehängt in `npm run check`
  und `npm run check:template`).
- F4 (Invocation Policy / Protection Validator, minimal) ist umgesetzt:
  `src/invocation-policy/` stellt für eine geplante schreibende Execution
  lokal, ohne Werkzeugaufruf fest, ob (a) die Werkzeugkonfiguration gültig
  ist und jedes referenzierte Schutzskript mit dem in einer extern
  bezeugten Baseline erwarteten Hash übereinstimmt (E-183, gelesen über
  F3s additiv exportierten `leseAusCommit`-Pfad), und (b) ein
  Wirksamkeitsnachweis noch zum aktuellen Gültigkeitsschlüssel passt
  (E-188, kein Drift). Beide Bedingungen teilen sich denselben, einmal
  gemessenen `istZustand` (Hash-Querkonsistenz, Advisor-Finding F11) —
  ein Aufrufer kann Bedingung 1 nicht mit aktuellen und Bedingung 2
  gleichzeitig mit veralteten, aber zueinander passenden Hashes bestehen
  lassen. `werkzeugsatz_begrenzung` ist in jedem Rückgabepfad fest
  "DEKLARIERT", nie "ERZWUNGEN" (E-187 bleibt unbelegt). Die
  E-182-Verbotsliste liegt als eigenständige, von F6 aufrufbare
  Prüffunktion vor. Bei ABGELEHNT wird F1Bs bestehendes Terminalartefakt
  VERWEIGERT wiederverwendet, kein neuer Terminalzustand. F4 startet nie
  selbst einen Werkzeugprozess (AC8, Gate-Grep gegen die Produktionsdateien
  des Moduls). Advisor-Pass vor dem Bau (Freigegeben mit Hinweisen, zwei
  Deltas verbindlich gelöst — F11 Hash-Querkonsistenz, F3 D16-analoge
  Schreibschutz-Auflage für die künftige Wirksamkeitsnachweis-Ablageort-
  Entscheidung) (Gate `scripts/check-f4-invocation-policy.mjs`, eingehängt
  in `npm run check` und `npm run check:template`).
- F8 (Execution Controller) ist mit WS-1/WS-2a/WS-2b vollständig
  umgesetzt und `ABGESCHLOSSEN`: `src/execution-controller/` führt einen
  Lauf vollständig durch F5 (`baueKontextpaket`) → F6a (`baueAufruf`,
  `starteGateway`) → F7 (`klassifiziereLauf`) → F1B
  (`stelleLaufstatusFest`), in fester Reihenfolge, ohne eine der
  orchestrierten Prüf- oder Klassifikationsregeln nachzubauen (mechanisch
  per Grep geprüft, `scripts/check-f8-execution-controller.mjs`,
  eingehängt in `npm run check` und `npm run check:template`). Bricht bei
  einer Ablehnung von F5 oder F6a sofort mit deren unverändertem Grund ab.
  Liefert F7 `VERWEIGERT` mit `bypass_verdacht_anzahl > 0`, eskaliert der
  Controller zwischen Schritt 4 und Schritt 5 (plan-v2 Delta 2) real über
  F9 (`erfasseBedarf` → `erzeugeTransportpaket` → `haendigeAus`) unter
  einer eigenen, vom auslösenden Lauf verschiedenen `laufId` — der Status
  des auslösenden Laufs bleibt danach unverändert `ABGESCHLOSSEN` (F-091,
  real getestet). Ein Wurf aus einem der drei F9-Aufrufe propagiert
  unverändert als Promise-Rejection (plan-v2 Delta 1, kein vierter
  Ergebnis-Zweig). WS-2b (AK7) ergänzt einen erneuten Anlauf nach
  `KLAERUNG_ERFORDERLICH` oder `ABGESCHLOSSEN`/`FEHLGESCHLAGEN`: bei
  gesetztem `eingaben.vorgaengerLaufId` lädt der Controller die Laufakte
  des Vorgängerlaufs über `ladeArtefaktVersion` und stellt sie der
  Anfragenliste als `notwendig:true`-Eintrag voran (Lineage-Verweis) — die
  Wiederaufnahme-`laufId` (`<vorgaengerLaufId>-retry-<n>`) wählt der
  Aufrufer, der Controller generiert oder prüft sie nicht. Fehlt die
  Vorgänger-Laufakte, wirft die Funktion (Vorbedingungsverletzung). Es
  existiert kein Codepfad, der die Vorgänger-`laufId` an
  `schreibeWirkungsmarke`/`schreibeCheckpoint`/`starteGateway` übergibt —
  der Vorgängerlauf bleibt unverändert (real getestet, echter
  Vorher/Nachher-Vergleich).
- F10 (Leitstand-Schreibpfad) ist mit WS-1/WS-2 vollständig umgesetzt und
  `ABGESCHLOSSEN`: der bislang wegwerfbare, vertragsfreie Leitstand-
  Prototyp (`scripts/leitstand-server.mjs`, `public/leitstand/`) bekommt
  einen Schreibpfad mit eigenem Vertrag. `POST /api/laeufe` löst reale
  Läufe ausschließlich über F8s `fuehreAufgabeDurch` aus, liest
  `AusfuehrungsOptionen` nie aus dem Body (Options-Sperre) und bindet
  ausschließlich auf `127.0.0.1` (F-120). Eine `laufId` wird synchron vor
  dem `fuehreAufgabeDurch`-Aufruf reserviert, ein Wurf aus der Kette
  beendet den Serverprozess nicht, sondern landet in einer flüchtigen
  `GET /api/startfehler`-Projektion. `/api/laeufe` liefert je Lauf den
  echten `LaufStatus` aus F1Bs `stelleLaufstatusFest`. Ein Lauf in
  `KLAERUNG_ERFORDERLICH` oder `ABGESCHLOSSEN`/`FEHLGESCHLAGEN` bekommt
  eine Wiederaufnahme-Bedienung, die einen neuen Startauftrag mit neuer
  `laufId` und `vorgaengerLaufId` erzeugt; die UI aktualisiert Läufe und
  Startfehler periodisch (Gate `scripts/check-f10-leitstand.mjs`,
  eingehängt in `npm run check`).
- F11 (Auftrag und geführter Start) ist mit WS-1/WS-2/WS-3 vollständig
  umgesetzt und `ABGESCHLOSSEN`: ein Auftrag wird als eigenes
  Kernartefakt (`AUFTRAG_V0`) registriert, der Auftragstext geht als
  eigener, von der Evidenz getrennter Abschnitt in den Prompt (AK1-3);
  eine versionierte, schemageprüfte Startvorlage
  (`startvorlagen/beispielprojekt.json`) liefert die
  maschinenkonstanten Startfelder und benannte lesende/schreibende
  Werkzeugsätze, der Server liest benannte Evidenzdateien selbst und
  erzwingt D13 (genau ein aktiver Lauf je Serverinstanz) (AK4-7,9). Real
  über den Leitstand nachgewiesen (AK8, `state/e2e-nachweis-f11-ws3.md`):
  ein lesender und ein zweistufig schreibender Lauf mit echtem
  Claude-Code-Kindprozess, belegt über Rohereignisstrom und
  tatsächlichen Dateiinhalt/`git diff`, nie über die Selbstauskunft des
  Kindprozesses. Dabei real gefunden und behoben: ein
  Konfigurationsfehler in der Startvorlage (`werkzeugStartziel`-Drift
  gegen den Wirksamkeitsnachweis, E-188, `state/findings.md` F-136).
- F12 (Bedienbarer Lauf: Auftrag, Liste, Detail) ist mit WS-1/WS-2/WS-3/
  WS-4 vollständig umgesetzt und `ABGESCHLOSSEN`: die Laufliste zeigt
  ausschließlich echte Laufketten mit Zeitstempeln aus dem Artefakt
  statt der Dateizeit, ein Auftrag wird über einen eigenen Endpunkt
  angelegt und dem Start zugeordnet, der Start läuft ohne JSON über das
  geführte Formular (AK1-6). Die Detailansicht liest den Rohstrom sicher
  und geprüft (AK7, AK8). Real über den Leitstand nachgewiesen (AK9,
  `features/F12/nachweis-ws4.md`): ein Auftrag mit zwei Läufen (lesend,
  schreibend), vom Technical Challenger gegen Laufketten,
  Kontextpaket-Bezüge und Rohstrom-Hashes verifiziert, nie über die
  Selbstauskunft des Kindprozesses. Gate `scripts/check-f12-leitstand-
  ansicht.mjs` (AK10).
- F13 (Entscheiden und Wiederaufnehmen im Leitstand) ist umgesetzt und
  `ABGESCHLOSSEN`: Stefan entscheidet bei Rückfragen und Fehlschlägen im
  Leitstand und nimmt kontrolliert wieder auf — ohne JSON, ohne Terminal,
  ohne eine Datei unter `kontrollzustand/` von Hand zu öffnen. Die
  Wiederaufnahme ist ein geführtes, aus dem Vorgängerlauf vorbelegtes
  Formular statt eines rohen JSON-Textfeldes, der Klärzustand ist
  unverfälscht sichtbar, und eine menschliche Entscheidung bekommt einen
  eigenen Schreibpfad — gebaut ausschließlich über bestehende Kernverben
  (F9 `importiereAntwort`/`entscheideStale`, F2
  `haltFestStaleEntscheidung`, F1B `schreibeWirkungsmarke`), kein neuer
  Kernmechanismus. Entschieden dabei: E-M2-6 — die echte Rückfrage ist
  ein Klärzyklus zwischen zwei Läufen, nicht eine Frage im laufenden
  Prozess; das Gateway bleibt One-Shot (Gate
  `scripts/check-f13-entscheiden.mjs`, eingehängt in `npm run check` und
  `npm run check:template`).
- F14 (Timeout und Abbruch) ist umgesetzt und `ABGESCHLOSSEN`: eine
  aktive externe Ausführung kann kontrolliert beendet werden, ohne einen
  inkonsistenten Kontrollzustand oder verwaiste Executor-Prozesse zu
  hinterlassen — automatisch bei Überschreiten einer harten, pro
  Invocation konfigurierbaren Wanduhr-Grenze oder manuell durch Stefan
  über den Leitstand. Das Gateway hält dafür einen Prozessgriff,
  Unterprozesse sterben unter Windows mit, und Timeout und Abbruch sind
  strukturell voneinander und von einem Absturz unterscheidbar.
  Entschieden dabei: E-M2-7 — beides wird additiv als `FEHLGESCHLAGEN`
  mit eigenem, maschinenlesbarem `grund` festgehalten, nicht als vierter
  Terminalwert; E-M2-8 — ein Abbruch wirkt auf genau eine `laufId`, das
  Auftragsartefakt bleibt unberührt. Kein Schreibpfad kann einem aktiven
  Lauf ein Terminalergebnis zuschreiben (Gate
  `scripts/check-f14-abbruch.mjs`, eingehängt in `npm run check`).
- F15 (Workflow-Artefakt und Schritt-Automat) ist umgesetzt und
  `ABGESCHLOSSEN`: ein vom Menschen freigegebener Workflow arbeitet seine
  Schritte nacheinander ab, ohne dass jeder einzelne Schritt von Hand
  gestartet werden muss, und hält an jeder Freigabe- oder Klärgrenze an.
  Grundlage ist `docs/projekt/zielfassung.md` §13.4, E-M3-1. `WORKFLOW_V0`
  ist als Kernartefakt mit Schema, handgeschriebenem Validator und
  Querverweisregeln umgesetzt (eindeutige `schritt_id`, geprüfte
  `nachfolger`- und `aktiver_schritt_id`-Referenzen, Zyklenfreiheit);
  `ermittleNaechstenSchritt` ist eine reine Entscheidungsfunktion ohne
  Datei-I/O. Der Schritt-Automat setzt in der bestehenden Dispatch-Kette
  fort, die D13-Übergabe liegt im selben synchronen Tick — ein
  Schritt-Automat auf einer sequenziellen Kette, keine Parallelisierung.
  Der Leitstand zeigt Schritte, Status und aktiven Schritt und bietet
  Freigeben / Überspringen / Stoppen als Entscheidungsartefakt (Gates
  `scripts/check-f15-workflow.mjs`,
  `scripts/check-f15-workflow-oberflaeche.mjs`,
  `scripts/check-f15-instanzlock.mjs`,
  `scripts/check-f15-automat-real.mjs`, eingehängt in `npm run check`;
  realer Nachweis `features/F15/nachweis-ak10.md`).
- F16 (Zweiter Worker: Codex CLI, nur lesend) ist umgesetzt und
  `ABGESCHLOSSEN`: ein Workflow-Schritt mit `worker: "codex"` läuft real
  über den Leitstand auf OpenAI Codex CLI (ChatGPT-Anmeldung, E-M3-2),
  strukturell nur lesend, mit typisiertem Ergebnis, und wird vom
  bestehenden Execution-Controller-/Evaluator-Pfad genauso verarbeitet
  wie ein Claude-Code-Schritt. `src/codex-gateway/` liefert
  Aufrufkonstruktion, Argv-Allowlist und JSONL-Parser und startet den
  Prozess über den bestehenden `src/claude-code-gateway/prozessstart.ts`;
  die Laufakte trägt additiv `worker` und `modell_deklariert`, die
  Auflösung von Startziel, Version und Berechtigungskontext ist
  worker-abhängig. Bewiesen wird die Multi-Worker-Mechanik, nicht
  Qualität (§13.1); schreibende Execution bleibt ausschließlich Claude
  Code. Real belegt sind ein Rot-Fall mit eingerichteter Sandbox
  (`features/F16/nachweis-rotfall.md`) und ein zweistufiger Workflow
  (`features/F16/nachweis-ak12.md`) (Gate
  `scripts/check-f16-codex-gateway.mjs`, eingehängt in `npm run check`).

## Offene Punkte

### Meilenstein 1 — abgeschlossen

- ✅ **Erledigt** — Ein vollständig belegter End-to-End-Durchlauf über
  alle vier Workflow-Layer, mit dem Referenzfeature
  Belegschaftskonfiguration (§13.1): über den Leitstand (F10) ausgelöster
  echter Durchlauf F5→F6a→F7→F1B mit echtem Claude-Code-Kindprozess.
  Erster Lauf (`e2e-referenzfeature-2026-09-06`) belegte die Mechanik,
  scheiterte inhaltlich an fehlender Prompt-Übergabe in F6a WS1 (F-124).
  Nach dessen Fix (PR #80) Nachlauf mit neuer `laufId`
  `e2e-referenzfeature-2026-09-06-f124-nachlauf`: Terminalzustand
  `ABGESCHLOSSEN`/`ERFOLGREICH`, echter Kindprozess ohne
  Genehmigungsverweigerung (`exitCode 0`, `permission_denials: []`) —
  siehe `state/e2e-nachweis-meilenstein-1.md` für beide Läufe und
  `state/findings.md` F-124 (gelöst).
- ✅ **Erledigt** — Genau ein aktiver Workstream; jeder Passtyp
  mindestens einmal.

### Meilenstein 2 — abgeschlossen (`docs/projekt/zielfassung.md` §13.3)

Scope, Reihenfolge und Details siehe
`docs/projekt/umsetzungsplan-fassung-1.md` Abschnitt 1b:

- ✅ **F11** — Auftrag und geführter Start. **Erledigt**, siehe oben.
- ✅ **F12** — Laufliste und Lauf-Detailansicht. **Erledigt**, siehe oben.
- ✅ **F13** — Entscheiden und Wiederaufnehmen. **Erledigt**, siehe oben
  (`features/F13/feature.md`, Status `ABGESCHLOSSEN`).
- ✅ **F14** — Timeout und Abbruch. **Erledigt**, siehe oben
  (`features/F14/feature.md`, Status `ABGESCHLOSSEN`).

Reihenfolge war zwingend F11 → F12 → F13 → F14 → Dogfooding.

### Meilenstein 3 — in Arbeit (`docs/projekt/zielfassung.md` §13.4)

- ✅ **F15** — Workflow-Artefakt und Schritt-Automat. **Erledigt**, siehe
  oben (`features/F15/feature.md`, Status `ABGESCHLOSSEN`).
- ✅ **F16** — Zweiter Worker (Codex CLI, nur lesend). **Erledigt**, siehe
  oben (`features/F16/feature.md`, Status `ABGESCHLOSSEN`).
- 🔄 **F17** — Rollenvertrag. **In Arbeit** (`features/F17/feature.md`,
  Status `READY_FOR_TECH`). WS-1 (Kern-Modul `src/rollen/`, Migration von
  `ROLLEN_AUSSCHLUSSMUSTER`) umgesetzt; WS-2 (Plan-/Startzeitprüfung) und
  WS-3 (realer Nachweis über den Leitstand) offen.

Stand der §13.4-Bestehensbedingung (drei Sätze):

- Satz 1 (zweistufiger Workflow: lesender Codex-Schritt → schreibender
  Claude-Code-Schritt, real über den Leitstand ohne manuellen
  Zwischenstart) ist **real erfüllt** — Nachweis
  `features/F16/nachweis-ak12.md`, festgehalten in
  `docs/projekt/zielfassung.md` §13.4.
- Satz 2 (Szenario A/B: je ein real durchlaufener Fast-Lane-Workflow mit
  einem Schritt und ein Standard-Workflow mit Review + Ausführung) ist
  **offen**.
- Satz 3 (Router-Eval-Gate: mindestens 10 Aufgaben mit je ≥3 Läufen gegen
  die Baseline „immer Standard-Workflow") ist **offen**.

Zuordnung von Satz 2 und Satz 3 — **Planungsstand aus der
Challenge-Runde vom 11.09.2026, noch nicht in
`docs/projekt/zielfassung.md` §13.4 festgeschrieben**, also hier
Absichtserklärung und nicht Sollquelle: F17 bleibt schmal und umfasst
ausschließlich den Rollenvertrag (löst `state/findings.md` F-313 und
F-323); Satz 2 (Szenario A/B) und Satz 3 (Router-Eval-Gate) werden
gemeinsam ein eigener Nachweis-Workstream **nach** F17. Verbindlich wird
das erst mit einem Eintrag in §13.4. Eine Reihenfolge für Meilenstein 3
ist nicht festgelegt.

**Nicht Fassung 1:** Mehrbenutzerbetrieb, Hosting, Abrechnung,
Provider-Adapter, parallele Workstreams, autonome externe oder
irreversible Aktionen.

Reihenfolge und Zuordnung einzelner Features:
`docs/projekt/umsetzungsplan-fassung-1.md`.
