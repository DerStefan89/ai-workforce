# Plan v1 — Feature 1: Checkpoint Store

Slug: feature1-checkpoint-store
Stand: 2026-08-29
Rolle: Planner (Claude-Code-Sitzung, Repo-Zugriff)
Grundlage: Feature-Akte v0 (Ziel/Scope/Nicht-Ziele/AC1-10) plus
Challenger-Ergänzungen (AC11, drei Nicht-Ziel-Ergänzungen, `typ`-Wert-
Konvention, Temp+Rename-Mechanik, Windows-Rename-Nachweis) — beide im
Auftrag dieser Sitzung im Volltext enthalten, nicht nur referenziert.

## 0. Verifikation (F-013-Muster — nicht annehmen, prüfen)

- **Branch-Hinweis:** Der Auftrag geht von „main-Branch, sauberer Stand"
  aus. Real steht diese Sitzung auf `vertrag/af-f001-feature-akte`
  (Arbeitsbaum sauber, `git status` clean, identisch zu `origin`). Kein
  Blocker für ein reines Planungsartefakt ohne Commit/Push in dieser
  Sitzung, aber festgehalten, nicht stillschweigend geglättet.
- **F0 real geprüft, nicht angenommen:** `features/F0/feature.md`,
  `features/F0/journal.md`, `state/plan-v1-feature0-datenformate.md`,
  `state/plan-v2-feature0-datenformate.md`, `schemas/profile.schema.json`,
  `schemas/kontrollzustand.schema.json`, `scripts/check-datenformate.mjs`
  real gelesen. Die Kontrollzustand-Hülle ist bereits final (Delta 3 aus
  plan-v2): `schema_version` (Pflicht), `typ` (Pflicht, String),
  `profil_referenz` (Pflicht, Objekt `{pfad, hash, version}`,
  `additionalProperties: false`), optional `payload` (offen, kein
  Unterschema) — Hülle selbst `additionalProperties: false`.
- **`F-020` existiert nicht.** Der Auftrag verlangt „AC11 … Schließt
  F-020", aber `state/findings.md` endet real bei `F-019` (`grep
  "^\*\*F-0\d\d\*\*"` → 19 Einträge, höchster `F-019`). Kein `F-020` im
  Repo. Übernommen als unverifizierte Behauptung — siehe Offener Punkt 1.
- **Architecture Drivers D1–D3/D9/D10 sind nicht die einzige bindende
  Quelle.** `ARCHITECTURE.md` Abschnitt 2 (Zeile 39–41) und
  `docs/projekt/zielfassung.md` (Rollen-Tabelle „Checkpoint Store",
  Entscheidungen A5 und A8) legen zusätzlich, bereits entschieden und
  nicht Teil dieses Auftrags zur Neuverhandlung, fest:
  - Checkpoint und Wirkungsmarke teilen sich **eine gemeinsame,
    append-only Hash-Kette** im Arbeitsbaum (`zielfassung.md` Zeile 329).
    Wirkungsmarke bleibt hier ungebaut (Nicht-Ziel-Ergänzung des
    Auftrags), aber die Hülle und die Kettenmechanik dürfen ihre spätere
    Ergänzung nicht strukturell ausschließen.
  - Versionierungssemantik ist **inhaltsadressiert**: „Version ist der
    Inhalts-Hash; die einzige Stelle, die den aktuellen Stand benennt,
    ist der letzte Checkpoint" (`ARCHITECTURE.md:41`, bestätigt für den
    Kontrollbereich durch `zielfassung.md` A8). Pfade dürfen Artefakttyp
    und Execution-Identität im Klartext tragen.
  - „Überschreiben eines persistierten Artefakts" ist ein verbotenes
    Pattern (`ARCHITECTURE.md` Abschnitt 7) — jeder Checkpoint ist eine
    neue, unveränderliche Datei, keine Mutation.
  - Kein Commit pro Zustandsübergang (`ARCHITECTURE.md:39`) — deckt sich
    mit der Nicht-Ziel-Ergänzung des Auftrags.
  Diese vier Punkte sind **keine neuen Architekturentscheidungen dieses
  Plans**, sondern bereits committete Vorgaben, die die technische Form
  unten direkt erzwingen (Hash-Kette statt loser Einzeldateien ohne
  Verkettung, Dateiname = Sequenz + Inhalts-Hash, kein Überschreiben).
- **`src/` ist real leer.** Dieses Feature ist das erste, das
  tatsächlichen Kern-Code unter `src/` anlegt (F0 lieferte nur Schemas
  und ein `scripts/`-Gate). `package.json` bestätigt „TypeScript auf
  Node, strip-only" (`type: module`, kein Build-Skript, `tsc --noEmit`
  nur für Typprüfung) — Module unter `src/` laufen ohne Kompilierschritt,
  `scripts/*.mjs` können sie laut diesem Setup direkt importieren
  (relevant für Abschnitt 4, Gate-Design).
- **`kontrollzustand/`/`profiles/` sind nicht gitignored.** Reale
  Checkpoint-Dateien werden also perspektivisch versioniert (deckt sich
  mit D1 und dem „Metadaten-Commit"-Modell) — dieses Feature legt selbst
  aber keinen Commit-Pfad an (Nicht-Ziel-Ergänzung).

## 1. Ziel (prüfbar)

Ein Modul unter `src/checkpoint-store/` kann für einen gegebenen
Vorhaben-/Lauf-Bezeichner (`laufId`) einen Checkpoint vollständig
persistieren, ihn danach laden, die gesamte gespeicherte Kette
validieren und daraus den zuletzt gültigen Checkpoint bestimmen — real
durchspielbar mit einem simulierten Prozessabbruch (AC10), nicht nur in
Prosa behauptet.

## 2. SCOPE

1. **`schemas/kontrollzustand-checkpoint-payload.schema.json`** — neues
   Schema für den `payload`-Inhalt eines Kontrollzustand-Eintrags mit
   `typ: "checkpoint"`. Bewusst **nicht** in
   `schemas/kontrollzustand.schema.json` (F0, bereits gemerged)
   eingehängt — die Hülle definiert `payload` absichtlich offen, damit
   `typ: "wirkungsmarke"` später ein eigenes Payload-Schema bekommen
   kann, ohne die Hülle oder dieses Schema zu ändern (Challenger-Vorgabe
   wörtlich umgesetzt). Pflichtfelder:
   - `lauf_id` (String, nicht leer) — vom Aufrufer vergebener,
     opaker Vorhaben-/Lauf-Bezeichner. Checkpoint Store erzeugt oder
     interpretiert diesen Wert nicht (siehe Design-Entscheidung D2).
   - `sequenz` (Integer ≥ 1) — fortlaufende Position innerhalb der
     Kette dieses `lauf_id`.
   - `vorgaenger_hash` (String mit `minLength: 64` **oder** `null`) —
     `selbst_hash` des vorherigen Checkpoints derselben `lauf_id`;
     `null` ausschließlich bei `sequenz: 1` (Kettenanfang).
   - `selbst_hash` (String, `minLength: 64`) — SHA-256 (hex) über die
     kanonische Serialisierung des gesamten Kontrollzustand-Eintrags
     **mit `payload.selbst_hash` entfernt** vor dem Hashen (verhindert
     Zirkelbezug). Bildet zugleich den inhaltsadressierten
     Versionsanker aus `ARCHITECTURE.md:41`/A8.
   - `daten` (optional, offen) — nicht-profilbezogener Nutzinhalt des
     Aufrufers (AC11). Checkpoint Store liest diesen Inhalt nicht,
     kopiert ihn nur unverändert mit.
   `additionalProperties: false` — hält die Kettenfelder erschöpfend und
   prüfbar, analog zur Hülle selbst (F0-Konvention).
2. **`schemas/examples/`** — vier neue Beispiele nach F0-Muster
   (Delta-4-Konvention: mehrere benannte Negativfälle statt eines
   pauschalen):
   - `kontrollzustand-checkpoint.valid.json` — vollständiger
     Kontrollzustand-Eintrag, `typ: "checkpoint"`, `sequenz: 1`,
     `vorgaenger_hash: null`, `selbst_hash` real berechnet (nicht
     erfunden — im Bauschritt mit dem echten Hash-Algorithmus erzeugen).
   - `kontrollzustand-checkpoint.invalid-fehlende-sequenz.json`
   - `kontrollzustand-checkpoint.invalid-hash-mismatch.json` —
     `selbst_hash` weicht vom tatsächlich berechneten Hash ab (prüft die
     Selbstprüfung, nicht nur Pflichtfeld-Präsenz).
   - `kontrollzustand-checkpoint.invalid-vorgaenger-bei-sequenz-1.json` —
     `sequenz: 1` mit einem gesetzten `vorgaenger_hash` statt `null`
     (prüft die Kettenanfangs-Regel).
3. **`src/checkpoint-store/`** — das eigentliche Modul, typisiert, kein
   `any` (DoD). Öffentliche Funktionen (Namen vorläufig, im Bauschritt
   ggf. verfeinert, Verhalten ist das Vertragsobjekt):
   - `schreibeCheckpoint(laufId, profilReferenz, daten)` — ermittelt die
     nächste `sequenz` und den `vorgaenger_hash` aus dem aktuellen
     Kettenstand von `laufId` (leere Kette ⇒ `sequenz: 1`,
     `vorgaenger_hash: null`), baut den Eintrag, berechnet `selbst_hash`,
     schreibt ihn über Temp-Datei + atomares Rename (Abschnitt 4) unter
     einen aus `sequenz` und `selbst_hash` gebildeten Dateinamen,
     protokolliert `checkpoint_geschrieben` (SCOPE.6). Gibt Pfad und
     `selbst_hash` zurück.
   - `ladeLetztenGueltigenCheckpoint(laufId)` — siehe Abschnitt 4.2.
     Liefert den Eintrag oder `null`, wenn kein gültiger Checkpoint
     existiert (AC6) — nie eine Ausnahme für den „kein gültiger
     Checkpoint"-Fall, das ist ein regulärer, benannter Ausgang (D10:
     Blockieren/Nicht-Finden ist normal, kein Fehler).
   - `validiereCheckpointEintrag(eintrag)` — reine Funktion, Hülle
     (Struktur wie F0s Handvalidierung) + Payload-Pflichtfelder +
     Selbst-Hash-Rückrechnung + Kettenanfangs-Regel. Rückgabe:
     Verstoßliste (leer = gültig), analog `validiereProfil`/
     `validiereKontrollzustand` in `check-datenformate.mjs`.
   - `atomarSchreiben(zielpfad, inhalt)` — interner Helfer: schreibt
     `inhalt` in eine Temp-Datei im selben Verzeichnis, `rename()` auf
     `zielpfad`; auf Windows mit Retry bei transientem `EPERM`/`EBUSY`
     (Abschnitt 4.4). Nie ein direktes Überschreiben.
   Kein `ajv`, keine neue Dependency — Fortführung von F0s Design-
   Entscheidung D5, jetzt mit echtem Code statt Handvalidierung im
   Gate-Skript.
4. **Speicherstruktur** — `kontrollzustand/<lauf_id>/checkpoints/
   <sequenz>-<selbst_hash>.json`. Vier Entscheidungen, mit Begründung:
   - Ein File pro Checkpoint, nicht eine wachsende JSONL-Datei: erzwingt
     „neue Version statt Mutation" strukturell (jede Datei entsteht
     genau einmal, wird nie erneut geöffnet) statt es der Schreiblogik
     zu überlassen.
   - Dateiname trägt `sequenz` (Klartext-Reihenfolge, menschlich
     sortierbar) und `selbst_hash` (Inhaltsadressierung, A8) — deckt
     „Pfade dürfen Artefakttyp und Execution-Identität im Klartext
     tragen" durch den Verzeichnispfad (`<lauf_id>/checkpoints/`) ab,
     ohne einen Execution-Identitätsbegriff zu erfinden, den es vor dem
     Execution Controller noch nicht gibt (siehe Offener Punkt 2).
   - Kein separates Zeiger-/Index-Artefakt, das „der aktuelle Checkpoint"
     behauptet — der zuletzt gültige Checkpoint wird bei jedem Laden aus
     der Kette selbst ermittelt (Abschnitt 4.2), nicht aus einem
     zusätzlichen, potenziell veralteten Zeiger. Deckt sich mit D1 (ein
     Index ist wegwerfbar/ableitbar, nie führend) — hier gibt es nicht
     einmal einen Index, nur Ableitung.
   - `kontrollzustand/<lauf_id>/` statt eines flachen `kontrollzustand/`-
     Verzeichnisses trennt Läufe strukturell, ohne dass Checkpoint Store
     Lauf-übergreifende Semantik kennen muss.
5. **Kanonische Serialisierung** — für `selbst_hash` reproduzierbar:
   Objektschlüssel sortiert, UTF-8, **LF-only** (deckt sich mit
   `ARCHITECTURE.md` Abschnitt 7, „CRLF in Dateien, die der Kern
   schreibt" ist verbotenes Pattern), keine abschließende Leerzeile,
   `JSON.stringify` mit sortierten Schlüsseln (kein externer
   Canonical-JSON-Package-Bedarf — eine rekursive Sortierfunktion vor
   `JSON.stringify` genügt, YAGNI). Diese Regel gilt für Hash-Eingabe UND
   für die tatsächlich geschriebene Datei — sonst weicht der Hash der
   Datei auf der Platte vom Hash der Kettenprüfung ab.
6. **Strukturierte Laufausgabe** (D9, AC9) — eine Ereigniszeile (JSON,
   ein Objekt pro Zeile, `console.log(JSON.stringify(...))` per Default,
   Schreiber austauschbar für Tests) je Vorgang:
   `checkpoint_geschrieben`, `checkpoint_geladen`,
   `checkpoint_validierungsfehler` (mit Verstoßliste),
   `checkpoint_kein_gueltiger_gefunden`. Jede Zeile trägt mindestens
   `ereignis`, `lauf_id`, `zeitstempel` (ISO-8601), vorgangsspezifisch
   `sequenz`/`pfad`/`verstoesse`.
7. **`scripts/check-checkpoint-store.mjs`** — neues Gate-Skript,
   Muster wie `check-datenformate.mjs`, aber mit einem Unterschied zu
   dessen Design-Entscheidung D5: Da dieses Feature erstmals echten
   Code unter `src/` liefert, **importiert** das Gate-Skript
   `validiereCheckpointEintrag` und `ladeLetztenGueltigenCheckpoint`
   direkt aus `src/checkpoint-store/` (strip-only Node erlaubt das ohne
   Build-Schritt), statt die Prüfregeln ein zweites Mal von Hand
   nachzubauen. Das behebt genau das Duplikations-Risiko, das F0s D5 nur
   deshalb einging, weil dort noch kein `src/`-Code existierte. Prüft:
   a. Die vier neuen Beispieldateien gegen `validiereCheckpointEintrag`
      (Grün-/Rot-Fälle wie SCOPE.2 beschrieben).
   b. Einen synthetischen Drei-Checkpoint-Lauf unter einem
      Wegwerfverzeichnis: Kette 1→2→3 vollständig gültig ⇒
      `ladeLetztenGueltigenCheckpoint` liefert Checkpoint 3. Danach
      Checkpoint 3 durch eine absichtlich verstümmelte Datei ersetzt
      (kaputtes JSON, simuliert unvollständiges Schreiben) ⇒ dieselbe
      Funktion liefert Checkpoint 2 — der Rot-/Grün-Beleg für AC10.
   c. Keinen Checkpoint vorhanden (leeres Wegwerfverzeichnis) ⇒
      `ladeLetztenGueltigenCheckpoint` liefert `null`, kein Fehler
      (AC6).
   Eingehängt in `npm run check` und `npm run check:template`.
8. **Windows-Rename-Atomaritätsnachweis** — eigenständiges,
   **nicht** in `npm run check` eingehängtes Verifikationsskript
   (Begründung: Design-Entscheidung D4), das real (nicht behauptet)
   zeigt, dass kein lesender Prozess während eines `atomarSchreiben`-
   Zyklus je eine leere oder halbgeschriebene Zieldatei sieht. Ergebnis
   als Rot-/Grün-Fall in `state/gates.md` nach dem dort etablierten
   Muster einzutragen (Abschnitt 4.4 und 7 unten).
9. **Zeile in `state/gates.md`** — neue Tabellenzeile
   `check-checkpoint-store.mjs` (Muster wie die Datenformate-Gate-Zeile)
   plus ein eigener Kalibrierungs-Log-Eintrag für den
   Windows-Rename-Nachweis (Punkt 8), analog zur bestehenden
   CI/Branch-Protection-Kalibrierung (einmalig belegt, nicht Teil der
   automatisierten Kette).
10. **Zeile in `state/memory-map.md`** — „Checkpoint-Payload-Schema" →
    `schemas/kontrollzustand-checkpoint-payload.schema.json` +
    `schemas/examples/kontrollzustand-checkpoint*`, „nicht hierhin":
    nicht in `schemas/kontrollzustand.schema.json` (F0, gemergter
    Hülle-Vertrag). Zusätzlich ein Eintrag „Checkpoint-Store-Modul" →
    `src/checkpoint-store/`, „nicht hierhin": keine Ausführungslogik
    (das bleibt Execution Controller).
11. **`docs/STATUS.md`** — Eintrag unter „Erledigt": Checkpoint Store
    (Schreiben, Laden, Validierung, Hash-Kette, Gate) umgesetzt.
12. **`features/F1/journal.md`** — Anhängeprotokoll nach F0-Muster,
    beginnend mit dem Akte-Eintrag, fortgeschrieben je Phase
    (Advisor-Pass, plan-v2, Handoff, Ausführung).

## 3. NICHT (Non-Scope, mit Grund)

- Wirkungsmarke-Typ, -Schema, -Logik — eigener, späterer Bedarf; die
  Hülle und die Kettenmechanik schließen ihn nicht aus (SCOPE.1), bauen
  ihn aber nicht.
- Execution Controller, Workstream-/Execution-Automat, jede
  Orchestrierungs- oder Übergangslogik, die einen Checkpoint *auslöst*
  — Checkpoint Store bietet nur `schreibeCheckpoint`/`laden`, ruft sich
  selbst nie auf.
- Automatische Wiederaufnahme/Neustart — es gibt in diesem Modul keine
  Funktion mit einem „resume"/„restart"-Verb; nur „laden"/„ermitteln".
  Das macht AC6/AC7 strukturell wahr statt konventionell.
- Änderung von `schemas/kontrollzustand.schema.json` oder
  `scripts/check-datenformate.mjs` (F0, gemergt) — neue Payload-Regeln
  entstehen in einem eigenen Schema/Gate (SCOPE.1/7), nicht durch
  Eingriff in F0.
- Ein Zeiger-/Index-Artefakt, das „aktueller Checkpoint" behauptet —
  bewusst nicht gebaut (SCOPE.4).
- Lauf-ID-Vergabe, -Lebenszyklus oder -Validierungsregeln (Format über
  „nicht-leerer String" hinaus) — Aufrufer-Verantwortung, siehe Offener
  Punkt 2.
- Bereinigung/Archivierung alter Checkpoints, Kompaktierung der Kette —
  ausdrücklicher Nicht-Ziel-Rand des Auftrags.
- `git add`/`git commit` im Schreibpfad — ausdrücklicher Nicht-Ziel-Rand
  des Auftrags, strukturell auch nicht nötig (Checkpoint Store ruft
  nirgends `git` auf).
- Eine allgemeine, projektweite „App-Start"-Validierungsroutine — es
  gibt noch keinen Einstiegspunkt/Bootstrap außerhalb dieses Features;
  „Startvalidierung" (D2) ist hier als Funktionsvertrag erfüllt
  (`ladeLetztenGueltigenCheckpoint` validiert bei jedem Aufruf,
  unabhängig davon, ob der Aufrufer „Start" oder „Wiedereinstieg"
  meint), nicht als eigenständiger Lifecycle-Hook.

## 4. Design-Entscheidungen

- **D1 (Ein File pro Checkpoint statt wachsender JSONL):** siehe
  SCOPE.4. Alternative wäre eine `<lauf_id>.jsonl`, bei jedem Schreiben
  komplett neu geschrieben und per Rename ersetzt (auch atomar). Verworfen,
  weil das „Überschreiben eines persistierten Artefakts" (verbotenes
  Pattern) begrifflich streift — bei N Checkpoints würde dieselbe Datei
  N-mal ersetzt, auch wenn jede Ersetzung selbst atomar ist. Ein File pro
  Checkpoint macht „append-only" für jede einzelne Datei wörtlich wahr,
  nicht nur im Ergebnis.
- **D2 (`lauf_id` ist ein opaker Aufrufer-Parameter):** Checkpoint Store
  erzeugt, parst oder interpretiert `lauf_id` nicht — nur ein nicht-leerer
  String, verwendet als Verzeichnisname. Begründung: Ein Lauf-/Vorhaben-
  Lebenszyklus-Begriff (wer vergibt die ID, wann beginnt/endet ein Lauf)
  gehört zum Execution Controller (Deliverable 1, #8, noch nicht gebaut).
  Ihn hier vorwegzunehmen wäre Architekturfestlegung für ein späteres
  Feature — ausdrücklicher Nicht-Ziel-Rand des Auftrags
  („Festlegung zusätzlicher … Entscheidungen über die … Architecture
  Drivers hinaus"). Konsequenz: `lauf_id` muss dateisystem-sicher sein
  (keine `/`, `..`, Steuerzeichen) — diese Prüfung übernimmt Checkpoint
  Store sehr wohl (Eingabevalidierung an der eigenen Schnittstelle,
  nicht Lauf-Semantik).
- **D3 (Kettenprüfung: vollständiger Rückwärtslauf ab dem höchsten
  vorhandenen `sequenz`-Wert, nicht Vorwärtslauf ab Genesis):**
  `ladeLetztenGueltigenCheckpoint` sortiert vorhandene Dateien einer
  `lauf_id` absteigend nach `sequenz`, prüft den höchsten Kandidaten
  (Schema + Selbst-Hash + `vorgaenger_hash` verweist auf einen
  vorhandenen, seinerseits gültigen Checkpoint mit `sequenz - 1`); bei
  Scheitern eine Stufe tiefer. Ergebnis ist der höchste Kandidat, dessen
  gesamte Kette bis `sequenz: 1` durchgehend gültig und lückenlos ist.
  Alternative (nur den einzelnen höchsten Kandidaten prüfen, Kette nicht
  nachverfolgen) wurde verworfen: sie würde einen Checkpoint als gültig
  akzeptieren, dessen Vorgänger korrumpiert ist — die Hash-Kette hätte
  dann keine Prüffunktion, wäre nur Dekoration. Kosten (O(n) pro
  Ladevorgang) sind für einen lokalen Einzelnutzer-Werkzeugkasten
  vernachlässigbar (YAGNI: keine Optimierung ohne belegten Bedarf).
- **D4 (Windows-Rename-Nachweis bewusst außerhalb von `npm run check`):**
  Ein Nachweis, dass kein Leser je eine partielle Datei sieht, braucht
  parallele Schreib-/Lesezyklen über eine messbare Zeitspanne — das ist
  ein einmaliger Infrastrukturnachweis (Muster: die CI-/Branch-
  Protection-Zeilen in `state/gates.md`, die ebenfalls nicht bei jedem
  `npm run check` neu laufen), kein schneller, deterministischer
  Unit-Test. Ihn in die Standardkette zu hängen würde entweder die
  tägliche Prüfkette verlangsamen oder durch Timing-Flakiness
  gelegentlich grundlos rot färben — beides unerwünscht. Der Nachweis
  wird einmal real geführt und in `state/gates.md` belegt (SCOPE.8/9);
  ein Rebuild triggert ihn nicht automatisch erneut, gleiche Handhabung
  wie bei Branch Protection.
- **D5 (Gate-Skript importiert echten Code statt Handvalidierung, siehe
  SCOPE.7):** Abweichung von F0s D5 mit Begründung, nicht Widerspruch —
  F0 hatte keinen `src/`-Code, dieses Feature hat welchen. Zwei getrennte
  Implementierungen derselben Regeln wären ein Wartungsrisiko, das F0
  nicht hatte und dieses Feature vermeiden kann.
- **D6 (kein `ajv`, Fortführung von F0-D5):** Die Payload-Regeln sind mit
  derselben Handschrift-Komplexität wie F0s Hülle prüfbar; kein zweiter
  konkreter Bedarf für einen generischen JSON-Schema-Interpreter.

## 5. Ablageort

- `schemas/kontrollzustand-checkpoint-payload.schema.json` und
  `schemas/examples/kontrollzustand-checkpoint*.json` — neben den
  bestehenden F0-Schemas, gleicher Ordner, eigener Dateiname (kein
  Eingriff in F0s Dateien).
- `src/checkpoint-store/` — erster echter Kern-Code-Ordner unter `src/`
  (laut `ARCHITECTURE.md` Abschnitt 1 „einziger Produktpfad").
- `scripts/check-checkpoint-store.mjs` — neben `check-datenformate.mjs`.
- `kontrollzustand/<lauf_id>/checkpoints/*.json` — Laufzeitdaten, analog
  zum bereits in `ARCHITECTURE.md` beschriebenen Ordner, keine neue
  Top-Level-Struktur.

## 6. Budget & Pässe

- Zuschnitt-Bewertung (CLAUDE.md-Heuristik): ein Baudurchgang plus
  höchstens eine Korrekturrunde, eigenständig prüfbares Artefakt (Gate +
  `npm run check` grün). Abhängigkeit auf F0 ist explizit im
  CONTEXT-Abschnitt des künftigen Handoff-Vertrags zu benennen, kein
  Zuschnittsfehler. Einzige Sorge: Dies ist der erste Vertrag mit echtem
  `src/`-Code plus Hash-Kette plus Windows-spezifischem Nachweis — mehr
  bewegliche Teile als F0. Bewertung: bleibt in einem Durchgang machbar,
  weil alle Teile eng um denselben Kernmechanismus (Schreiben, Laden,
  Kette prüfen) kreisen, keine Funktionshäufung verschiedener Belange.
- Advisor-Pass fällig (neues Top-Level-Verzeichnis `src/`, neues
  blockierendes Gate, Hash-Ketten-Design, Interpretation mehrerer AC als
  Design-Entscheidungen D1–D4) — Subagent `architecture-advisor`,
  frischer Kontext, `Read/Grep/Glob`.
- Danach `code-reviewer` und `qa`, read-only.
- Rework-Regel: Gate 1 rot → eine Korrekturrunde → Gate 2. Zweites Rot ⇒
  BLOCKIERT ⇒ Mensch.
- `state/gates.md`-Einträge (SCOPE.9) entstehen erst NACH dem realen
  Bau-/Prüflauf, mit echtem Befehl+Ausgabe-Beleg — nicht vorab im Plan
  behauptet.

## 7. Akzeptanzkriterien (technisch)

- **A1** `schemas/kontrollzustand-checkpoint-payload.schema.json`
  existiert, ist gültiges JSON Schema (Draft 2020-12), parsebar.
- **A2** `schemas/examples/kontrollzustand-checkpoint.valid.json` erfüllt
  Hülle (F0) und Payload-Schema; `selbst_hash` ist der real berechnete
  Hash, nicht erfunden.
- **A3** Die drei Invalid-Beispiele (SCOPE.2) verletzen ihr Schema an der
  jeweils benannten Stelle (fehlende `sequenz`, Hash-Mismatch,
  `vorgaenger_hash` bei `sequenz: 1`).
- **A4** `schreibeCheckpoint` gefolgt von `ladeLetztenGueltigenCheckpoint`
  liefert einen inhaltlich identischen Eintrag (AC1) für eine Kette mit
  einem, dann mit drei Checkpoints.
- **A5** Ein absichtlich abgebrochener Schreibvorgang (Temp-Datei bleibt
  liegen, kein Rename ausgeführt) hinterlässt keinen Checkpoint an der
  Zielposition; `ladeLetztenGueltigenCheckpoint` sieht ihn nicht (AC2/AC3).
- **A6** Eine Checkpoint-Datei mit verstümmeltem JSON oder fehlendem
  Pflichtfeld wird von `validiereCheckpointEintrag` mit benannter
  Regelverletzung erkannt und von `ladeLetztenGueltigenCheckpoint`
  übersprungen (AC4).
- **A7** Für eine Kette 1→2→(3 korrumpiert) liefert
  `ladeLetztenGueltigenCheckpoint` Checkpoint 2, nicht 3 und nicht
  `null` (AC5/AC10 — der zentrale Rot-/Grün-Beleg dieses Features).
- **A8** Für eine leere oder nicht existierende `lauf_id`-Kette liefert
  `ladeLetztenGueltigenCheckpoint` `null`, kein Wurf (AC6).
- **A9** Das Modul enthält keine Funktion, die einen unterbrochenen Lauf
  neu startet oder fortsetzt — geprüft durch Code-Review (AC7), nicht
  automatisiert prüfbar.
- **A10** Ein Testlauf, der `src/`-Code mit Produktdateien in einem
  getrennten Testverzeichnis mischt, zeigt: kein Aufruf von
  `schreibeCheckpoint`/`ladeLetztenGueltigenCheckpoint` verändert eine
  Datei außerhalb von `kontrollzustand/<lauf_id>/` (AC8).
- **A11** Jeder Aufruf von `schreibeCheckpoint`,
  `ladeLetztenGueltigenCheckpoint` (Erfolg und Leerfall) sowie jede
  erkannte Regelverletzung erzeugt genau eine strukturierte JSON-
  Ereigniszeile mit den in SCOPE.6 benannten Feldern (AC9).
- **A12** Für die Fixtures aus AC11 (Feature-Akte) enthält kein
  geschriebener `payload` ein Feld, das Profilinhalte kopiert — geprüft
  durch das Gate (SCOPE.7a) gegen die Fixtures und durch Code-Review
  gegen die Implementierung (`schreibeCheckpoint` übernimmt `daten` nur
  unverändert, liest `profilReferenz` nur für die Referenzfelder).
- **A13** `node scripts/check-checkpoint-store.mjs` → Exit 0 gegen alle
  Fixtures und die drei synthetischen Ketten-Fälle (vollständig gültig,
  korrumpiert, leer).
- **A14** `npm run check` und `npm run check:template` sind grün
  (inkl. Doku-Gate, Typecheck ohne `any`, Linter).
- **A15** `state/gates.md` enthält die neue Zeile für
  `check-checkpoint-store.mjs` mit echtem Rot-/Grün-Beleg, plus einen
  separaten Kalibrierungs-Log-Eintrag für den Windows-Rename-Nachweis
  (SCOPE.8/9, D4).
- **A16** `state/memory-map.md` enthält beide neuen Zeilen (Payload-
  Schema, Checkpoint-Store-Modul) mit „nicht hierhin"-Spalte.
- **A17** `docs/STATUS.md` nennt den Checkpoint Store unter „Erledigt".
- **A18** (Hauptkriterium) Ein simulierter Prozessabbruch zwischen zwei
  Checkpoints (Temp-Datei ohne Rename bzw. korrumpierte Zieldatei) führt
  real dazu, dass nur der zuletzt vollständig persistierte und validierte
  Checkpoint als Wiederaufnahmepunkt bestimmbar ist — nicht in Prosa
  behauptet, sondern über A5/A7 nachgewiesen.

A1–A17 sind Mechanik, A18 ist das eigentliche Kriterium (analog F0s
A13-Musters).

## 8. Rollen für diesen Workstream

| Position | Träger | Rechte |
|---|---|---|
| Advisor | Subagent `architecture-advisor`, frisch | `Read, Grep, Glob` |
| Executor | Claude-Code-Sitzung, frisch, kennt nur Repo + Vertragsvolltext | voll im freigegebenen Pfad |
| Reviewer | Subagenten `code-reviewer`, `qa`, frisch | read-only |
| Mensch (Stefan) | — | Freigaben, Release, echte Abzweigungen, Klärung der offenen Punkte unten |

## 9. Nächste Schritte nach diesem Plan (nicht Teil dieses Auftrags)

1. Klärung der Offenen Punkte 1–4 unten.
2. Advisor-Pass auf diese Datei.
3. Findings → `state/advisor-findings-feature1-checkpoint-store.md`.
4. `plan-v2-feature1-checkpoint-store.md` als neue Datei — `plan-v1`
   bleibt unverändert stehen.
5. Handoff-Vertrag → `state/tasks/f1-checkpoint-store.md`, SCHRITT 0
   wörtlich, 7 Pflichtsektionen.

## 10. Offene Punkte — NICHT stillschweigend entschieden

1. **`F-020` existiert nicht.** Der Auftrag verlangt für AC11 „Schließt
   F-020", aber `state/findings.md` hat real nur bis `F-019` Einträge.
   Entweder ist der Auftragstext aus einem anderen Chat-Kontext
   übernommen, in dem `F-020` bereits angelegt wurde und noch nicht ins
   Repo gelangt ist, oder die Nummer ist ein Versehen. Diese Sitzung hat
   `F-020` **nicht** selbst in `state/findings.md` angelegt (kein
   Produktcode/Bau-Nebeneffekt in einer reinen Planungssitzung ohne
   Rückfrage) — der Mensch oder der Challenger-Chat entscheidet, ob
   `F-020` real existiert, nachträglich angelegt wird, oder der Bezug im
   Feature entfernt wird.
2. **Lauf-Identität ist noch nicht architektonisch definiert.** Dieser
   Plan behandelt `lauf_id` als opaken String (D2), weil der Execution
   Controller (der Läufe eigentlich lebenszyklisch verwaltet) noch nicht
   existiert. Sollte der Challenger-Chat oder `zielfassung.md` bereits
   eine Lauf-/Execution-Identitätsform (Format, Erzeugungsregel)
   festgelegt haben, die dieser Planungsrolle nicht vorlag, ist das hier
   nachzuziehen, bevor der Handoff-Vertrag entsteht.
3. **Rückwärtslauf-Kettenprüfung (D3) ist eine Auslegung von AC5, keine
   wörtliche Vorgabe.** AC5 sagt nur „kann eindeutig bestimmt werden",
   nicht „muss die volle Kette bis Genesis validieren". Die engere
   Lesart (nur den unmittelbaren Kandidaten prüfen) wäre schneller, aber
   schwächer gegen einen korrumpierten Vorgänger. Empfehlung dieses
   Plans: volle Kette (Begründung in D3) — zur Bestätigung im
   Advisor-Pass, da sie den größten Teil der Ladelogik bestimmt.
4. **Windows-Rename-Nachweis-Methode ist noch nicht festgelegt.** Der
   Auftrag verlangt „real verifizieren, nicht annehmen", nennt aber keine
   Methode. Diese Sitzung schlägt ein Parallel-Schreiber/Leser-Skript
   vor (SCOPE.8), aber Umfang (wie viele Zyklen, welche Störfaktoren wie
   Virenscanner-Locks simulieren) ist nicht Teil dieses Plans — Details
   gehören in den Handoff-Vertrag, nicht hierher vorweggenommen.
