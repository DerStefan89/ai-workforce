# Plan v1 — Feature F1B: Wirkungsmarke / RUN_PREPARED / Terminalartefakt

Slug: f1b-wirkungsmarke
Stand: 2026-08-30
Rolle: Planner (Claude-Code-Sitzung, Repo-Zugriff)
Grundlage: `features/F1B/feature.md` (Ziel/Scope/Nicht-Ziele/AC1-8, wörtlich
aus dem Auftrag dieser Sitzung übernommen).

## 0. Verifikation (F-013-Muster — nicht annehmen, prüfen)

- **F1 real geprüft, nicht angenommen:** `src/checkpoint-store/{types,
  index}.ts`, `schemas/kontrollzustand.schema.json`,
  `schemas/kontrollzustand-checkpoint-payload.schema.json` real gelesen.
  Drei Befunde, die diesen Plan direkt bestimmen:
  1. `KontrollzustandEintrag.typ` ist im Typsystem ein loser `string`
     (`types.ts:26`), aber `validiereCheckpointEintrag`
     (`index.ts:138-140`) prüft hart `obj.typ !== 'checkpoint'` und
     `schreibeCheckpoint` schreibt `typ: 'checkpoint'` fest verdrahtet
     (`index.ts:397`). Ein Eintrag mit `typ: "wirkungsmarke"` würde von
     F1s eigener Validierung heute als Regelverstoß abgelehnt.
  2. `pruefeEinzelnenKandidaten`/`istKandidatGueltig`
     (`index.ts:255-361`) rufen `validiereCheckpointEintrag`
     unbedingt auf — jeder Kandidat in einer Kette wird also heute so
     geprüft, als sei er zwingend ein Checkpoint. Eine gemischte Kette
     (Checkpoints und Wirkungsmarken derselben `lauf_id`) scheitert an
     dieser Stelle, nicht erst am Payload-Schema.
  3. `schemas/kontrollzustand-checkpoint-payload.schema.json`
     (Beschreibung, Zeile 5) benennt `wirkungsmarke` bereits ausdrücklich
     als vorgesehene spätere Unterart mit eigenem Payload-Schema — F1B
     ist keine Zweckentfremdung, sondern die angekündigte Fortsetzung.
- **`docs/projekt/zielfassung.md` §16.2/§16.4/§16.6 sind bereits
  entschieden, nicht Teil dieses Auftrags zur Neuverhandlung:**
  - §16.2: „`Checkpoint Store` … persistiert zwei Artefakttypen in einer
    gemeinsamen, append-only Hash-Kette … `Checkpoint` je
    Execution-Übergang und `Wirkungsmarke` vor/nach jedem Lauf" (A2, A5).
    Zwei **Artefakttypen**, nicht ein Typ mit zwei Ausprägungen — das
    ist die zentrale Weiche gegenüber F2 (siehe Abschnitt 4, D1 unten).
  - §16.4: zwei lokale Startbedingungen ohne Werkzeugaufruf; scheitert
    eine, startet kein Lauf; erst danach `RUN_PREPARED`-Wirkungsmarke,
    dann Werkzeugstart.
  - §16.6: `RUN_PREPARED` ohne validiertes terminales Laufartefakt →
    kein neuer Lauf, blockierter Klärzustand, menschliche Entscheidung,
    danach neuer Lauf mit **eigener Identität**.
  - `ARCHITECTURE.md:58`: Klassifikationsreihenfolge ungültige
    Beobachtungsbasis → `FEHLGESCHLAGEN`; gültige Verweigerung →
    `VERWEIGERT`; sonst → `ERFOLGREICH`. Ein allgemeines Erfolgsflag
    überstimmt nie eine konkrete Verweigerung.
- **F2s Präzedenzfall ist verwandt, aber nicht identisch übertragbar.**
  F2 (`state/plan-v2-feature2-artifact-registry-lineage.md`, „Option A")
  hat B1 gelöst, indem Lineage-Einträge hüllenseitig `typ: "checkpoint"`
  **blieben** und „Lineage" nur ein Diskriminator innerhalb von
  `payload.daten` wurde — bewusst *kein* zweiter Hüllen-Typ. Für F1B ist
  das nicht wörtlich übertragbar: A5 sagt ausdrücklich „`RUN_PREPARED`
  ist eine Wirkungsmarke, **kein Checkpoint**" — ein Wirkungsmarke-Eintrag
  als `typ: "checkpoint"` zu verkleiden widerspräche dieser bereits
  getroffenen Entscheidung wörtlich. Was von F2 übertragbar bleibt, ist
  das **Prinzip** hinter Option A: keine eigene Ablageform, keine eigene
  Datei-/Verzeichnisstruktur, kein Parallel-Regelsatz für die
  Kettenmechanik — alles läuft durch F1s bestehende
  Hash-Kette/Dateibenennung/Sequenzvergabe. Dieser Plan wendet das
  Prinzip an, ohne dessen konkrete Ausprägung (typ bleibt „checkpoint")
  zu kopieren. Siehe Design-Entscheidung D1.
- **`src/checkpoint-store/` ist kein unberührter Ordner mehr.** Anders
  als F1 (erster `src/`-Code) oder F2 (neuer, eigenständiger Ordner,
  reiner Aufrufer von außen) verlangt F1B einen echten Eingriff in
  bereits gemergten, von F2 abhängig genutzten Code. Jede Änderung muss
  F1s bestehende öffentliche Signaturen (`schreibeCheckpoint`,
  `ladeLetztenGueltigenCheckpoint`, `ladeGueltigeCheckpoints`,
  `validiereCheckpointEintrag`, `kanonischesJson`, `sha256Hex`)
  unverändert lassen — F2 importiert sie direkt, ein Bruch dort wäre ein
  Regressionsrisiko außerhalb dieses Features.

## 1. Ziel (prüfbar)

`src/checkpoint-store/` kann für eine gegebene `lauf_id` zusätzlich zu
Checkpoints auch Wirkungsmarken (`RUN_PREPARED` und ein Terminalartefakt
mit `ERFOLGREICH`/`VERWEIGERT`/`FEHLGESCHLAGEN`) in derselben Hash-Kette
schreiben und laden; eine neue Funktion stellt für eine `lauf_id`
mechanisch fest, ob eine offene `RUN_PREPARED`-Wirkungsmarke ohne
gültiges Terminalartefakt vorliegt (`KLAERUNG_ERFORDERLICH`) — real
durchspielt mit vier Fällen (AC7), nicht nur in Prosa behauptet.

## 2. SCOPE

1. **`schemas/kontrollzustand-wirkungsmarke-payload.schema.json`** —
   neues Schema für `payload`, wenn `typ: "wirkungsmarke"`. Analog zu
   `kontrollzustand-checkpoint-payload.schema.json` (gleiche Kettenfelder),
   plus ein `art`-Diskriminator (Muster wie F2s `daten.typ`/`daten.art`,
   hier aber auf `payload`-Ebene, weil `typ` selbst schon „wirkungsmarke"
   ist und `art` die beiden Wirkungsmarke-Ausprägungen unterscheidet —
   nicht zu verwechseln mit F2s Fall, wo der Diskriminator eine Ebene
   tiefer in `daten` sitzt, weil dort `typ` „checkpoint" blieb):
   - `lauf_id`, `sequenz`, `vorgaenger_hash`, `selbst_hash` — identische
     Form/Regeln wie `kontrollzustand-checkpoint-payload.schema.json`
     (gleicher Kettenanfang: `sequenz: 1` ⇔ `vorgaenger_hash: null`).
   - `art`: `"run_prepared"` | `"terminal"` (Pflicht).
   - Bei `art: "terminal"` zusätzlich pflichtig: `ergebnis` mit genau den
     drei Werten `"ERFOLGREICH"` | `"VERWEIGERT"` | `"FEHLGESCHLAGEN"`
     (deckt AC4 — ein Typ mit exakt drei Werten, kein freier String).
   - Bei `art: "run_prepared"` ist `ergebnis` verboten (`not: {required:
     ["ergebnis"]}`) — eine `RUN_PREPARED`-Marke trägt kein Ergebnis,
     sonst könnte sie versehentlich als eigenes Terminalartefakt
     durchgehen.
   - `daten` optional bei beiden `art`-Werten (offener Erweiterungspunkt,
     wie F1s Checkpoint-Payload).
   - `additionalProperties: false`, `oneOf` über die zwei `art`-Varianten
     (Muster wörtlich wie `schemas/kontrollzustand-lineage-payload.schema.json`
     `$defs`/`oneOf`-Aufbau, nur eine Ebene höher: hier beschreibt das
     Schema direkt `payload`, nicht `payload.daten`).
2. **`schemas/examples/`** — sechs neue Beispiele (Delta-4-Konvention wie
   F0/F1/F2: mehrere benannte Negativfälle statt eines pauschalen):
   - `kontrollzustand-wirkungsmarke-run-prepared.valid.json`
   - `kontrollzustand-wirkungsmarke-terminal-erfolgreich.valid.json`
   - `kontrollzustand-wirkungsmarke-terminal-verweigert.valid.json`
   - `kontrollzustand-wirkungsmarke.invalid-fehlendes-ergebnis.json` —
     `art: "terminal"` ohne `ergebnis`.
   - `kontrollzustand-wirkungsmarke.invalid-ergebnis-ausserhalb-enum.json`
     — `ergebnis` mit einem vierten Wert außerhalb der drei zulässigen.
   - `kontrollzustand-wirkungsmarke.invalid-ergebnis-bei-run-prepared.json`
     — `art: "run_prepared"` mit gesetztem `ergebnis` (prüft das Verbot).
   Alle mit real berechnetem `selbst_hash` (nicht erfunden), gleicher
   Kettenanfangs-/Hash-Regel wie F1s Checkpoint-Fixtures.
3. **`src/checkpoint-store/index.ts` — F1-Erweiterung (kein neues
   Modul, siehe D2).** Neue exportierte Funktionen, F1s bestehende
   Exporte bleiben unverändert (Signatur und Verhalten):
   - `schreibeWirkungsmarke(laufId, profilReferenz, art, zusatz,
     optionen?)` — schreibt `typ: "wirkungsmarke"` in dieselbe Kette wie
     `schreibeCheckpoint` (gleiches Verzeichnis, gleiche
     Sequenz-/Hash-Ermittlung, gleiches `atomarSchreiben`). `art` ist
     `"run_prepared"` oder `"terminal"`; bei `"terminal"` verlangt
     `zusatz.ergebnis` einen der drei Werte, sonst wirft die Funktion
     **vor** dem Schreiben (Muster wie F2s `haltFestStaleEntscheidung`-
     Wurf bei fehlender `begruendung`) — kein stiller Fehlschlag, kein
     halb geschriebener Zustand.
   - `stelleLaufstatusFest(laufId, optionen?)` — deckt AC5/SCOPE.4: lädt
     die vollständige gültige Kette über `ladeGueltigeCheckpoints`
     (unverändert, bereits typ-übergreifend, siehe D3), filtert auf
     `typ === "wirkungsmarke"`, findet die `sequenz`-höchste
     `art: "run_prepared"`-Marke. Gibt es danach (höhere `sequenz`,
     gleiche Kette) eine `art: "terminal"`-Marke, ist der Lauf
     abgeschlossen (`{ status: "ABGESCHLOSSEN", ergebnis }`); gibt es
     keine `run_prepared`-Marke, ist der Lauf nie mit Außenwirkung
     gestartet (`{ status: "NICHT_GESTARTET" }`); gibt es eine
     `run_prepared`-Marke ohne folgendes Terminalartefakt, liefert sie
     `{ status: "KLAERUNG_ERFORDERLICH", ... }` — ein regulärer,
     benannter Ausgang (D10-Muster wie F1 selbst), kein Wurf. Nie eine
     Wiederaufnahme-Empfehlung — die Funktion stellt fest, sie handelt
     nicht (deckt AC5 wörtlich: „blockierend", keine automatische
     Handlung).
   - `validiereWirkungsmarkeEintrag(eintrag)` — reine Funktion, gleiches
     Muster wie `validiereCheckpointEintrag`: Hülle + Kettenfelder +
     Selbst-Hash-Rückrechnung (geteilte Prüfschritte mit
     `validiereCheckpointEintrag`, siehe D1 unten — kein zweiter
     Regelsatz für identische Prüfschritte) + `art`/`ergebnis`-Regeln.
     Rückgabe: Verstoßliste, leer = gültig.
4. **Kein neues Verzeichnis, kein neuer Dateiname-Regelausdruck.**
   `kontrollzustand/<lauf_id>/checkpoints/<sequenz>-<selbst_hash>.json`
   — dieselbe Struktur wie F1, unverändert. Eine Wirkungsmarke und ein
   Checkpoint derselben `lauf_id` liegen im selben Verzeichnis, teilen
   sich dieselbe fortlaufende `sequenz`-Zählung (Präzedenz: F2s eigene
   Begründung für gemeinsame `sequenz` über mehrere Eintragsarten
   hinweg, `state/plan-v2-feature2-artifact-registry-lineage.md`
   Abschnitt „Versionierung entfällt", wörtlich übertragbar). Deckt AC2.
5. **Strukturierte Laufausgabe** — neue Ereignisnamen
   `wirkungsmarke_geschrieben`, `wirkungsmarke_validierungsfehler`,
   `laufstatus_festgestellt` (mindestens `ereignis`, `lauf_id`,
   `zeitstempel`, vorgangsspezifisch `sequenz`/`art`/`status`), gleiches
   Ereignisformat wie F1 (`console.log(JSON.stringify(...))` per
   Default, austauschbarer Schreiber). `Ereignisname` in `types.ts` wird
   um diese drei Werte erweitert — additive Änderung, kein bestehender
   Ereignisname entfällt oder ändert Bedeutung.
6. **`scripts/check-f1b-wirkungsmarke.mjs`** — neues Gate-Skript, Muster
   wie `check-lineage-registry.mjs`: importiert
   `validiereWirkungsmarkeEintrag`, `schreibeWirkungsmarke`,
   `stelleLaufstatusFest` direkt aus `src/checkpoint-store/index.ts`
   (kein zweiter, von Hand nachgebauter Regelsatz). Prüft:
   a. Die sechs neuen Fixtures gegen `validiereWirkungsmarkeEintrag`
      (Grün-/Rot-Fälle wie SCOPE.2).
   b. Einen synthetischen Lauf unter einem Wegwerfverzeichnis:
      `RUN_PREPARED` schreiben → `stelleLaufstatusFest` liefert
      `KLAERUNG_ERFORDERLICH`; danach Terminalartefakt `ERFOLGREICH`
      schreiben → derselbe Aufruf liefert `ABGESCHLOSSEN`.
   c. Ohne jede Wirkungsmarke (leere Kette) → `NICHT_GESTARTET`, kein
      Fehler.
   Eingehängt in `npm run check` und `npm run check:template`, direkt
   nach `check-lineage-registry.mjs` (gleiche Reihenfolge-Konvention wie
   die bisherige Kette).
7. **`src/checkpoint-store/checkpoint-store.test.ts`** — Ergänzung
   (nicht neue Datei, siehe D4): `node:test`-Fälle für
   `schreibeWirkungsmarke`/`stelleLaufstatusFest`, mindestens die vier
   aus AC7 verlangten (siehe Abschnitt 7 unten, A-Nummern A9-A12), plus
   ein Regressionsfall „bestehende Checkpoint-Tests bleiben unverändert
   grün" (kein neuer Test, sondern Beleg, dass der bestehende Testlauf
   nach der F1-Erweiterung weiterhin `pass` liefert).
8. **Zeile in `state/gates.md`** — neue Tabellenzeile
   `check-f1b-wirkungsmarke.mjs` (Muster wie die Checkpoint-Store- und
   Lineage-Gate-Zeilen), plus Ergänzung der bestehenden
   Checkpoint-Store-Zeile (neue Funktionen in F1).
9. **Zeile in `state/memory-map.md`** — „Wirkungsmarke-Payload-Schema"
   → `schemas/kontrollzustand-wirkungsmarke-payload.schema.json` +
   `schemas/examples/kontrollzustand-wirkungsmarke*`, „nicht hierhin":
   nicht in `schemas/kontrollzustand.schema.json` (F0) und nicht in
   `schemas/kontrollzustand-checkpoint-payload.schema.json` (F1, anderer
   `typ`-Wert). Bestehende Zeile „Checkpoint-Store-Modul" ergänzen (trägt
   jetzt auch Wirkungsmarken), keine neue Modul-Zeile — F1B ist keine
   neue Modul-Ownership, siehe D2.
10. **`docs/STATUS.md`** — Eintrag unter „Erledigt": F1B (Wirkungsmarke,
    `RUN_PREPARED`, Terminalartefakt, Klärzustands-Feststellung)
    umgesetzt.
11. **`features/F1B/journal.md`** — Anhängeprotokoll, fortgeschrieben je
    Phase (Advisor-Pass, ggf. plan-v2, Handoff, Ausführung).

## 3. NICHT (Non-Scope, mit Grund)

- Prozessstart, Gateway, Freigabeprüfung — Nicht-Ziel-Rand des Auftrags
  (das ist F3/Invocation Policy bzw. Claude-Code-Gateway, Deliverable 2
  und 3, noch nicht gebaut).
- UI/Leitstand-Anzeige eines Laufstatus — `stelleLaufstatusFest` ist eine
  reine Feststellungsfunktion, kein Projektionsmodul.
- Bewertung von Ergebnissen (z. B. ob ein `ERFOLGREICH` inhaltlich
  „gut" war) — außerhalb dieses Features, ausdrücklicher Nicht-Ziel-Rand.
- Neues Persistenzformat — ausdrücklicher Nicht-Ziel-Rand; SCOPE.4 macht
  das strukturell wahr (kein neues Verzeichnis, kein neuer
  Dateiname-Regelausdruck).
- Automatische Wiederaufnahme oder Neustart bei `KLAERUNG_ERFORDERLICH`
  — `stelleLaufstatusFest` hat kein „resume"/„restart"-Verb, nur
  „feststellen" (AC5, D10-Muster wie F1 selbst).
- Vergabe der `lauf_id` für einen „bewusst neu gestarteten Lauf" (AC6) —
  bleibt Aufrufer-Verantwortung wie in F1 (D2 aus F1s plan-v1,
  unverändert fortgeführt); F1B liefert nur die Feststellungsfunktion,
  die einen künftigen Aufrufer zu dieser Entscheidung zwingt (kein
  automatischer Vorschlag einer neuen ID).
- Änderung von `schemas/kontrollzustand.schema.json` oder F1s
  bestehenden Exporten (`schreibeCheckpoint`,
  `ladeLetztenGueltigenCheckpoint`, `validiereCheckpointEintrag`,
  `kanonischesJson`, `sha256Hex`) — Verhalten und Signatur bleiben
  unverändert (Regressionsschutz für F2, siehe Abschnitt 0).
- Ein eigenes neues Modul `src/wirkungsmarke/` — bewusst verworfen, siehe
  D2.

## 4. Design-Entscheidungen

- **D1 (`typ: "wirkungsmarke"` bleibt ein eigener Hüllen-Typ, nicht
  „checkpoint" mit innerem Diskriminator):** F2s Option A hat den
  gegenteiligen Weg gewählt (Lineage bleibt `typ: "checkpoint"`), weil
  B1 eine Architekturverletzung war, die durch keinen neuen Hüllen-Typ
  gelöst werden musste — es ging nur um den Speicherort. Für F1B ist die
  Ausgangslage anders: `zielfassung.md` A5 legt bereits fest, dass
  `RUN_PREPARED` „eine Wirkungsmarke, kein Checkpoint" ist, und §16.2
  spricht ausdrücklich von „zwei Artefakttypen" in derselben Kette.
  `typ: "checkpoint"` für eine Wirkungsmarke zu schreiben würde diese
  bereits getroffene Unterscheidung im Code wieder einebnen. Was von F2
  übertragbar bleibt, ist das Prinzip „keine eigene Ablageform" (siehe
  SCOPE.4) — nicht die konkrete `typ`-Wahl. Konsequenz: F1 muss
  typ-bewusst werden (`pruefeEinzelnenKandidaten`/`istKandidatGueltig`
  dürfen nicht mehr unbedingt `validiereCheckpointEintrag` aufrufen,
  siehe D3), das ist der eigentliche technische Kern dieses Features.
- **D2 (Erweiterung von `src/checkpoint-store/`, kein neues Modul):**
  `zielfassung.md` §16.2 ordnet „Wirkungsmarke" in der Modul-Tabelle
  ausdrücklich dem **Checkpoint Store** zu, nicht einem eigenen Modul
  (anders als „Artifact Registry / Lineage", die dort eine eigene
  Tabellenzeile mit eigenem Modul hat). F2 wurde bewusst als eigener,
  von außen aufrufender Ordner gebaut, weil Lineage laut Modul-Tabelle
  ein eigenständiges Modul ist. Für Wirkungsmarke gilt das Gegenteil:
  die Doku selbst erklärt sie zur Verantwortung des Checkpoint Store.
  Ein separates `src/wirkungsmarke/`, das `schreibeCheckpoint` nur von
  außen aufruft (F2-Analogie), würde zusätzlich am `typ`-Hardcoding aus
  D1/Abschnitt 0 scheitern — der externe Aufrufer könnte `typ:
  "checkpoint"` gar nicht umgehen, ohne F1 anzufassen. Der F1-Touch ist
  also so oder so nötig; ihn direkt in F1 zu platzieren vermeidet eine
  Modul-Grenze, die laut Doku nicht existiert (YAGNI: keine
  Vorab-Abstraktion ohne architektonischen Beleg).
- **D3 (`pruefeEinzelnenKandidaten` dispatcht nach dem `typ` des
  Kandidaten, `ladeGueltigeCheckpoints`/`ladeLetztenGueltigenCheckpoint`
  bleiben unverändert):** Die Kettenprüfung (D3 aus F1s plan-v1,
  vollständiger Rückwärtslauf über `vorgaenger_hash`) ist bereits
  typ-agnostisch — sie prüft `selbst_hash`/`vorgaenger_hash`-Verkettung,
  nicht Payload-Inhalt. Nur die Payload-Validierung innerhalb eines
  einzelnen Kandidaten muss wissen, ob sie `validiereCheckpointEintrag`
  oder `validiereWirkungsmarkeEintrag` anwendet — Entscheidung anhand
  des `typ`-Felds im geparsten Eintrag selbst, vor der Validierung
  gelesen. Ein Eintrag mit unbekanntem `typ` (weder „checkpoint" noch
  „wirkungsmarke") ist ein Regelverstoß, kein Absturz. Diese Änderung
  ist intern (private Hilfsfunktion), F1s öffentliche Signaturen
  (`ladeLetztenGueltigenCheckpoint`, `ladeGueltigeCheckpoints`) ändern
  sich nicht — F2 bleibt unberührt, solange keine `lineage-*`-Kette
  jemals eine Wirkungsmarke enthält (sie tut es nicht, F2 ruft
  `schreibeWirkungsmarke` nirgends auf).
- **D4 (Ergänzung der bestehenden Testdatei, keine neue Datei):**
  `checkpoint-store.test.ts` prüft bereits die Kettenmechanik, die
  Wirkungsmarken jetzt mitnutzen — eine zweite Testdatei würde entweder
  dieselbe Wegwerfverzeichnis-/Aufräum-Infrastruktur duplizieren oder
  künstlich importieren. Eine Datei pro Modul (nicht pro Typ) ist das
  bestehende Muster in diesem Repo (F1, F2 haben je eine Testdatei für
  ihr gesamtes Modul).
- **D5 (`ergebnis` als eigenes Pflichtfeld bei `art: "terminal"`, nicht
  als dritter `art`-Wert je Ausgang):** Drei separate `art`-Werte
  (`terminal_erfolgreich`/`terminal_verweigert`/`terminal_fehlgeschlagen`)
  wurden erwogen und verworfen — AC4 verlangt „ein Typ, kein String" für
  die drei Terminalzustände; ein `enum`-Feld `ergebnis` mit genau drei
  erlaubten Werten erfüllt das direkt und maschinell prüfbar
  (JSON-Schema-`enum`), ohne die `art`/`terminal`-vs-`run_prepared`-
  Unterscheidung mit der Ergebnis-Unterscheidung zu vermengen. Zwei
  orthogonale Fragen („ist das eine Start- oder Endmarke" vs. „wie ging
  der Lauf aus") bleiben zwei Felder.

## 5. Ablageort

- `schemas/kontrollzustand-wirkungsmarke-payload.schema.json` und
  `schemas/examples/kontrollzustand-wirkungsmarke*.json` — neben den
  bestehenden F0/F1/F2-Schemas, gleicher Ordner, eigener Dateiname.
- `src/checkpoint-store/index.ts` und `types.ts` — Erweiterung
  bestehender Dateien, kein neuer Ordner (D2).
- `scripts/check-f1b-wirkungsmarke.mjs` — neben den bestehenden
  Gate-Skripten.
- `kontrollzustand/<lauf_id>/checkpoints/*.json` — keine neue
  Top-Level-Struktur, dieselbe wie F1/F2.

## 6. Budget & Pässe

- Zuschnitt-Bewertung (CLAUDE.md-Heuristik): ein Baudurchgang plus
  höchstens eine Korrekturrunde, eigenständig prüfbares Artefakt (Gate +
  `npm run check` grün). Der F1-Touch (typ-Dispatch in
  `pruefeEinzelnenKandidaten`, zwei neue Exporte) ist kleiner als F2s
  `ladeGueltigeCheckpoints`-Erweiterung (keine neue Iterationslogik, nur
  ein Dispatch anhand eines bereits gelesenen Felds), aber er berührt
  bestehenden, von F2 genutzten Code — deshalb: F1-Touch zuerst mit
  eigenem grünen Testfall (Regressionsbeleg: bestehende
  `checkpoint-store.test.ts`-Fälle bleiben `pass`), **bevor** die
  Wirkungsmarke-Fixtures/das Gate-Skript entstehen (gleiche Lektion wie
  F2 Delta 3: „F1-Touch zuerst, dann das darauf aufbauende Verhalten").
- Advisor-Pass fällig — Eingriff in gemergten, von F2 abhängig genutzten
  Code, neuer Hüllen-`typ`-Wert (Abweichung von F2s Option-A-Muster,
  Design-Entscheidung D1 braucht Bestätigung, siehe Offener Punkt 1) —
  Subagent `architecture-advisor`, frischer Kontext, `Read/Grep/Glob`.
- Danach `code-reviewer` und `qa`, read-only.
- Rework-Regel: Gate 1 rot → eine Korrekturrunde → Gate 2. Zweites Rot ⇒
  BLOCKIERT ⇒ Mensch.
- `state/gates.md`-Einträge (SCOPE.8) entstehen erst NACH dem realen
  Bau-/Prüflauf, mit echtem Befehl+Ausgabe-Beleg.

## 7. Akzeptanzkriterien (technisch)

- **A1** `schemas/kontrollzustand-wirkungsmarke-payload.schema.json`
  existiert, ist gültiges JSON Schema (Draft 2020-12), parsebar.
- **A2** Die drei `.valid.json`-Fixtures (SCOPE.2) erfüllen Hülle (F0)
  und Payload-Schema; `selbst_hash` ist real berechnet.
- **A3** Die drei Invalid-Fixtures verletzen ihr Schema an der jeweils
  benannten Stelle (fehlendes `ergebnis`, `ergebnis` außerhalb der drei
  Werte, `ergebnis` bei `run_prepared`).
- **A4** `schreibeWirkungsmarke(laufId, ..., "run_prepared", ...)`
  gefolgt von einem Lade-Aufruf liefert einen inhaltlich identischen
  Eintrag, in derselben Kette wie zuvor geschriebene Checkpoints der
  gleichen `lauf_id` (deckt AC1/AC2).
- **A5** `stelleLaufstatusFest` liefert `KLAERUNG_ERFORDERLICH`, wenn die
  Kette eine `run_prepared`-Marke ohne folgendes Terminalartefakt trägt
  (deckt AC5, zentraler Rot-/Grün-Beleg dieses Features).
- **A6** `stelleLaufstatusFest` liefert `ABGESCHLOSSEN` mit dem
  jeweiligen `ergebnis`, wenn nach der letzten `run_prepared`-Marke ein
  Terminalartefakt (`ERFOLGREICH`/`VERWEIGERT`/`FEHLGESCHLAGEN`) folgt.
- **A7** `stelleLaufstatusFest` liefert `NICHT_GESTARTET` für eine
  `lauf_id` ohne jede Wirkungsmarke, kein Wurf (D10-Muster).
- **A8** `schreibeWirkungsmarke` mit `art: "terminal"` und ohne oder mit
  ungültigem `ergebnis` wirft **vor** dem Schreiben (Muster wie F2s
  `haltFestStaleEntscheidung`), hinterlässt keine Datei.
- **A9** Test „erfolgreicher Lauf": `run_prepared` → Terminal
  `ERFOLGREICH` → `stelleLaufstatusFest` liefert `ABGESCHLOSSEN`/
  `ERFOLGREICH` (AC7, Fall 1).
- **A10** Test „`VERWEIGERT`": `run_prepared` → Terminal `VERWEIGERT` →
  `stelleLaufstatusFest` liefert `ABGESCHLOSSEN`/`VERWEIGERT`, nicht
  fälschlich `ERFOLGREICH` (deckt AC4 wörtlich: ein allgemeines
  Erfolgsflag überstimmt nie eine konkrete Verweigerung — AC7, Fall 2).
- **A11** Test „fehlendes Terminalartefakt": nur `run_prepared`
  geschrieben → `stelleLaufstatusFest` liefert `KLAERUNG_ERFORDERLICH`
  (AC7, Fall 3, identisch zu A5, hier als benannter Testfall).
- **A12** Test „Abbruch zwischen `RUN_PREPARED` und Terminalartefakt":
  `run_prepared` geschrieben, Terminal-Schreibversuch simuliert
  abgebrochen (Temp-Datei ohne Rename, Muster wie F1s A5) →
  `stelleLaufstatusFest` sieht weiterhin nur die `run_prepared`-Marke,
  liefert `KLAERUNG_ERFORDERLICH`, nicht `ABGESCHLOSSEN` (AC7, Fall 4).
- **A13** Bestehende `checkpoint-store.test.ts`-Fälle (F1) bleiben nach
  der Erweiterung unverändert grün — Regressionsbeleg für D1/D3.
- **A14** `node scripts/check-f1b-wirkungsmarke.mjs` → Exit 0.
- **A15** `npm run check` und `npm run check:template` sind grün.
- **A16** `state/gates.md` enthält die neue Zeile für
  `check-f1b-wirkungsmarke.mjs` mit echtem Rot-/Grün-Beleg, plus die
  Ergänzung der bestehenden Checkpoint-Store-Zeile.
- **A17** `state/memory-map.md` enthält die neue Zeile (Wirkungsmarke-
  Payload-Schema) mit „nicht hierhin"-Spalte, bestehende
  Checkpoint-Store-Zeile ergänzt.
- **A18** `docs/STATUS.md` nennt F1B unter „Erledigt".
- **A19** (Hauptkriterium) Für eine `lauf_id` mit `RUN_PREPARED` ohne
  gültiges Terminalartefakt liefert `stelleLaufstatusFest` real
  `KLAERUNG_ERFORDERLICH`, und kein Codepfad in diesem Feature startet
  daraufhin automatisch einen neuen Lauf — nicht in Prosa behauptet,
  über A5/A11/A12 nachgewiesen (analog F1s A18/F0s A13-Muster).

A1–A18 sind Mechanik, A19 ist das eigentliche Kriterium.

## 8. Rollen für diesen Workstream

| Position | Träger | Rechte |
|---|---|---|
| Advisor | Subagent `architecture-advisor`, frisch | `Read, Grep, Glob` |
| Executor | Claude-Code-Sitzung, frisch, kennt nur Repo + Vertragsvolltext | voll im freigegebenen Pfad |
| Reviewer | Subagenten `code-reviewer`, `qa`, frisch | read-only |
| Mensch (Stefan) | — | Freigaben, Release, echte Abzweigungen, Klärung der offenen Punkte unten |

## 9. Nächste Schritte nach diesem Plan (nicht Teil dieses Auftrags)

1. Klärung der Offenen Punkte 1–3 unten.
2. Advisor-Pass auf diese Datei.
3. Findings → `state/advisor-findings-f1b-wirkungsmarke.md`.
4. Falls nötig: `plan-v2-f1b-wirkungsmarke.md` als neue Datei — dieser
   plan-v1 bleibt unverändert stehen.
5. Handoff-Vertrag → `state/tasks/f1b-wirkungsmarke.md`, SCHRITT 0
   wörtlich, sieben Pflichtsektionen.

## 10. Offene Punkte — NICHT stillschweigend entschieden

1. **D1 (eigener Hüllen-`typ: "wirkungsmarke"` statt F2s „bleibt
   checkpoint")** ist die zentrale Architekturentscheidung dieses Plans
   und weicht vom zuletzt freigegebenen Präzedenzfall (F2 Option A) in
   der konkreten Ausprägung ab, auch wenn sie sich auf eine bereits
   getroffene Entscheidung (`zielfassung.md` A5, §16.2) stützt. Das ist
   genau die Art von Abweichung, die B1 bei F2 auslöste (dort umgekehrt:
   ein Plan wich von `ARCHITECTURE.md` ab). Vor dem Bau zu bestätigen:
   Advisor-Pass, expliziter Fokus auf D1/D3 (typ-Dispatch in F1s
   privater Kandidatenprüfung).
2. **`stelleLaufstatusFest`-Semantik bei mehreren `run_prepared`-Marken
   in Folge** (z. B. zwei `RUN_PREPARED` ohne dazwischenliegendes
   Terminalartefakt — sollte laut AC6 eigentlich nicht vorkommen, wenn
   jeder neu gestartete Lauf eine eigene `lauf_id` bekommt, ist aber
   innerhalb *einer* `lauf_id` durch nichts in F1B strukturell
   verhindert). Diese Sitzung schlägt vor: die `sequenz`-höchste
   `run_prepared`-Marke zählt, ältere werden ignoriert — aber das ist
   eine Auslegung, keine Vorgabe aus dem Auftrag. Zur Bestätigung im
   Advisor-Pass oder durch Stefan vor dem Handoff-Vertrag.
3. **Rückgabeform von `stelleLaufstatusFest`** (Feldnamen `status`/
   `ergebnis`, drei vs. vier `status`-Werte) ist ein Vorschlag dieser
   Sitzung, kein wörtlich vorgegebenes Interface — Feinschliff gehört in
   den Handoff-Vertrag, nicht hierher vorweggenommen.
