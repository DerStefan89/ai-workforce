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
abgeschlossen. Meilenstein 1 ist in Arbeit.

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
- F8 WS-1 (Execution Controller, Kette) und WS-2a (E-186-Eskalation) sind
  umgesetzt: `src/execution-controller/` führt einen Lauf vollständig
  durch F5 (`baueKontextpaket`) → F6a (`baueAufruf`, `starteGateway`) →
  F7 (`klassifiziereLauf`) → F1B (`stelleLaufstatusFest`), in fester
  Reihenfolge, ohne eine der orchestrierten Prüf- oder
  Klassifikationsregeln nachzubauen (mechanisch per Grep geprüft,
  `scripts/check-f8-execution-controller.mjs`, eingehängt in `npm run
  check` und `npm run check:template`). Bricht bei einer Ablehnung von F5
  oder F6a sofort mit deren unverändertem Grund ab. Liefert F7
  `VERWEIGERT` mit `bypass_verdacht_anzahl > 0`, eskaliert der Controller
  zwischen Schritt 4 und Schritt 5 (plan-v2 Delta 2) real über F9
  (`erfasseBedarf` → `erzeugeTransportpaket` → `haendigeAus`) unter einer
  eigenen, vom auslösenden Lauf verschiedenen `laufId` — der Status des
  auslösenden Laufs bleibt danach unverändert `ABGESCHLOSSEN` (F-091, real
  getestet). Ein Wurf aus einem der drei F9-Aufrufe propagiert unverändert
  als Promise-Rejection (plan-v2 Delta 1, kein vierter Ergebnis-Zweig).
  WS-2b (erneuter Anlauf nach `KLAERUNG_ERFORDERLICH`/`FEHLGESCHLAGEN`) ist
  bewusst nicht Teil dieses Baudurchgangs — hängt an der noch offenen
  Wiederaufnahme-`laufId`-Konvention (plan-v1 Abschnitt 10, Frage 2).

## Offene Punkte

Scope von Fassung 1 (Auszug, Reihenfolge und Details siehe
`docs/projekt/umsetzungsplan-fassung-1.md`):

- Ein vollständig belegter End-to-End-Durchlauf über alle vier
  Workflow-Layer, mit dem Referenzfeature Belegschaftskonfiguration.
- Genau ein aktiver Workstream; jeder Passtyp mindestens einmal.

**Nicht Fassung 1:** Mehrbenutzerbetrieb, Hosting, Abrechnung,
Provider-Adapter, parallele Workstreams, autonome externe oder
irreversible Aktionen.

Reihenfolge und Zuordnung einzelner Features:
`docs/projekt/umsetzungsplan-fassung-1.md`.
