# Plan v2 — Feature 2: Artifact Registry / Lineage

Slug: feature2-artifact-registry-lineage
Stand: 2026-08-29
Grundlage: `state/plan-v1-feature2-artifact-registry-lineage.md` (bleibt
unverändert stehen, wird hier nicht überschrieben) plus Advisor-Urteil
`state/advisor-findings-feature2-artifact-registry-lineage.md`:
**NICHT FREIGEGEBEN** — blockierend waren B1 (Architekturkonflikt) und B4
(fehlende Testdatei). Dieses Dokument löst beide auf Basis von Stefans
Entscheidung (Option A, siehe unten) und schärft B5 nach; B2 und B3 sind
laut Advisor bestätigt, B3 wird hier aber durch Delta 1 strukturell
ersetzt (die Export-Ergänzung, die B3 geprüft hat, entfällt ersatzlos).

Alle Abschnitte von plan-v1, die hier nicht erwähnt werden, gelten NICHT
automatisch fort — anders als bei F1s plan-v2 ist der Eingriff hier so
groß, dass fast jeder Abschnitt von SCOPE, den Design-Entscheidungen und
den Akzeptanzkriterien betroffen ist. Abschnitt 8 (Rollen) und der
Budget-Rahmen aus plan-v1 Abschnitt 6 gelten unverändert fort. Alles
andere ist unten entweder explizit übernommen oder ersetzt.

---

## Stefans Entscheidung (Grundlage dieses Dokuments)

Option A: Lineage-Einträge laufen über die Checkpoint-Store-Hash-Kette
(F1), kein eigener Dateibaum unter `kontrollzustand/`. Begründung:
`ARCHITECTURE.md:39` („Schreibend auf `kontrollzustand/` greift
ausschließlich der Kern zu, und nur über die append-only Hash-Kette des
Checkpoint Store") und `ARCHITECTURE.md:41` („die einzige Stelle, die den
aktuellen Stand benennt, ist der letzte Checkpoint") — von B1 aufgedeckt,
von F1 selbst bereits wörtlich (nicht übertragbar) ausgelegt.

## Delta 1 (löst B1) — Architektur-Redesign: Lineage-Einträge sind Checkpoints

### Kernidee

`src/lineage-registry/` schreibt keine eigenen Dateien mehr. Jede
Lineage-Operation (Artefakt-Registrierung, STALE-Entscheidung) ruft die
echte, unveränderte Funktion `schreibeCheckpoint` aus
`src/checkpoint-store/index.ts` auf. Die Lineage-spezifischen Felder
(`artefakt_id`, `art`, `erzeugungsart`, `inhalts_hash`, `herkunft`,
`eingaben`, …) wandern vollständig in den bereits vorgesehenen, offenen
`payload.daten`-Erweiterungspunkt des Checkpoints — sie werden nicht mehr
Teil einer eigenen Kontrollzustand-Hülle. Der äußere Checkpoint bleibt in
jeder Hinsicht `typ: "checkpoint"`; „Lineage" ist ein Diskriminator
**innerhalb** von `daten`, nicht auf Hüllenebene. Das löst B1 wörtlich:
Schreibzugriff auf `kontrollzustand/` bleibt ausschließlich über F1s
Hash-Kette, „der letzte Checkpoint" bleibt die einzige Stelle, die den
Stand einer Kette benennt — jetzt auch für Lineage.

### Namensraum: `lauf_id` = `lineage-<artefakt_id>`

F1s `lauf_id` ist laut plan-v1 D2 ein opaker, nur auf
Dateisystem-Sicherheit geprüfter Aufrufer-Parameter — dieselbe
Infrastruktur, andere Schlüsselwelt. Jedes Artefakt bekommt seine eigene
Checkpoint-Kette unter dem `lauf_id`-Wert `lineage-<artefakt_id>`, nicht
`<artefakt_id>` selbst. Grund: `lauf_id` und `artefakt_id` sind
unterschiedliche Identitätskonzepte (ein Ausführungslauf vs. eine
Artefakt-Historie), die zufällig denselben Dateinamensraum
(`kontrollzustand/<X>/checkpoints/`) teilen würden, wenn beide ohne
Präfix denselben String verwenden könnten — ein künftiger Execution
Controller könnte sonst versehentlich eine `lauf_id` vergeben, die mit
einer `artefakt_id` kollidiert und deren Ketten vermischt. Der
`lineage-`-Präfix ist eine billige, sofort wirksame Absicherung dagegen.
**Offener Punkt 4** (siehe unten) hält fest, dass dies eine Konvention
dieser Sitzung ist, kein von `ARCHITECTURE.md` vorgeschriebenes Schema —
zur Kenntnisnahme, falls ein künftiger Execution Controller eigene
`lauf_id`-Regeln einführt.

### Versionierung entfällt als eigenes Konzept (D3/D6 aus plan-v1 entfallen ersatzlos)

Es gibt keine eigene `version_sequenz`-Zählung mehr. Die Versionsnummer
eines Artefakt-Eintrags **ist** die `sequenz` des Checkpoints, der ihn
trägt — von F1 bereits korrekt, atomar und lückenlos vergeben. STALE-
Entscheidungen werden in dieselbe Kette wie Artefakt-Versionen
geschrieben (dieselbe `lauf_id`), sodass sich `sequenz`-Werte über beide
Eintragsarten hinweg fortlaufend, aber nicht lückenlos pro Art, ergeben —
das ist erwünscht: jeder Eintrag bleibt eindeutig, unveränderlich und
über seine `sequenz` referenzierbar, unabhängig davon, welche Art er
trägt. plan-v1 D3 („kein Bedrohungsmodell verlangt Kettenintegrität über
Versionen hinweg") ist damit nicht falsifiziert, sondern gegenstandslos:
die Kettenintegrität kommt jetzt kostenlos aus F1 mit, nicht weil sie für
Lineage separat begründet werden müsste.

### Neue, notwendige F1-Erweiterung: `ladeGueltigeCheckpoints`

`ladeLetztenGueltigenCheckpoint` liefert nur den **letzten** gültigen
Checkpoint einer Kette — für `listeVersionen` und `ladeArtefaktVersion`
mit einer expliziten `versionSequenz` wird aber Zugriff auf **alle**
gültigen Checkpoints einer Kette gebraucht (nicht nur den letzten,
gefiltert auf `art: "artefakt_version"`).

**Neue exportierte Funktion in `src/checkpoint-store/index.ts`:**
```
ladeGueltigeCheckpoints(laufId: string, optionen?: Optionen): KontrollzustandEintrag[]
```
Verhalten: identisch zur bestehenden Kandidaten-Ermittlung und
Gültigkeitsprüfung in `ladeLetztenGueltigenCheckpoint`
(`listeKandidaten` + `istKandidatGueltig`, beide bereits vorhanden,
unverändert, nicht dupliziert), aber statt beim ersten gültigen
Kandidaten zurückzukehren, werden **alle** gültigen Kandidaten gesammelt
und aufsteigend nach `sequenz` zurückgegeben. Leere Kette ⇒ leeres Array
(kein `null`, kein Wurf — Analogie zu F1s eigenem D10 „Laden ist kein
Urteil", nur für eine Liste statt eines Einzelwerts). Nutzt dieselben
internen Hilfsfunktionen, kein zweiter Regelsatz (Fortführung des
D5-Gedankens aus plan-v1, jetzt für Lesen statt Schreiben).

**Bewusst kein neues Ereignis:** `ladeGueltigeCheckpoints` emittiert keine
eigene Ereigniszeile — ungültige Kandidaten lösen weiterhin
`checkpoint_validierungsfehler` über den bestehenden Schreiber-Pfad aus
(unverändert), eine zusammenfassende Ereigniszeile für den gesamten
Listenaufruf gibt es nicht, um `Ereignisname` (F1s Typ) nicht zu
erweitern. `src/lineage-registry/` protokolliert seine eigenen
`lineage_*`-Ereignisse ohnehin auf einer Ebene darüber (siehe unten).

**Das ist ein größerer F1-Eingriff als die in plan-v1 vorgesehene
Ein-Zeilen-Export-Ergänzung (D5/B3)** — eine neue öffentliche Funktion,
keine reine Sichtbarkeitsänderung. Sie braucht einen eigenen
`node:test`-Fall in `src/checkpoint-store/checkpoint-store.test.ts`
(SCOPE.0 unten) und eine kurze Erwähnung im Checkpoint-Store-Gate
(`state/gates.md`, bestehende Zeile ergänzen, keine neue Zeile). **B3s
Freigabe bezog sich ausdrücklich nur auf die Export-Ergänzung** — diese
entfällt jetzt vollständig (kein `atomarSchreiben`-Export mehr nötig,
`src/lineage-registry/` schreibt nie selbst eine Datei). Die neue
Funktion ist ungeprüft im ursprünglichen Advisor-Pass — siehe **Offener
Punkt 1**.

### Lineage-Payload (jetzt: Form von `checkpoint.payload.daten`)

`schemas/kontrollzustand-lineage-payload.schema.json` (Delta zu plan-v1
SCOPE.1) beschreibt **nicht mehr** eine eigene Kontrollzustand-Hülle,
sondern ausschließlich die Form von `payload.daten`, wenn
`daten.typ === "lineage"`. Die äußere Checkpoint-Hülle
(`schema_version`, `typ: "checkpoint"`, `profil_referenz`,
`payload.{lauf_id,sequenz,vorgaenger_hash,selbst_hash}`) validiert
weiterhin ausschließlich `validiereCheckpointEintrag` aus F1, unverändert
— kein zweiter Regelsatz dafür.

Pflichtfelder bei `art: "artefakt_version"` (unverändert zu plan-v1
SCOPE.1, jetzt als Unterobjekt von `daten` statt als eigenständiger
Payload):
- `typ` (const `"lineage"`)
- `art` (const `"artefakt_version"`)
- `artefakt_id` (String, nicht leer, dateisystem-sicher — dieselbe
  Prüfregel wie F1s `lauf_id`) — redundant zum `lineage-`-Präfix im
  äußeren `lauf_id`, aber bewusst zusätzlich im Payload gehalten: ein
  Lineage-Eintrag bleibt so für sich allein lesbar (z. B. bei einem
  künftigen Export), ohne den `lauf_id`-String zurückparsen zu müssen.
- `erzeugungsart` (`"kern"` | `"werkzeug"`)
- `inhalts_hash` (String, `minLength: 64`)
- `herkunft` (offen)
- `eingaben` (optional Array, wie plan-v1: `{pfad, zitierter_bereich,
  inhalts_hash}`)
- Nur bei `erzeugungsart: "kern"`: `daten` (optional, offen)
- Nur bei `erzeugungsart: "werkzeug"` **pflichtig**, `daten` dabei
  **verboten**: `pfad`, `zitierter_bereich`

Pflichtfelder bei `art: "stale_entscheidung"` (eine Umbenennung
gegenüber plan-v1):
- `typ` (const `"lineage"`), `art` (const `"stale_entscheidung"`),
  `artefakt_id`
- `bezieht_sich_auf: { sequenz: integer }` — **ersetzt** plan-v1s
  `{ version_sequenz: integer }`: referenziert jetzt direkt die
  Checkpoint-`sequenz` des betroffenen Artefakt-Eintrags in derselben
  Kette, kein eigenständiges Versionsfeld mehr.
- `entscheidung` (`"neu_erzeugen"` | `"nachtrag"` |
  `"unveraendert_gueltig"`)
- `begruendung` — Pflicht bei `"unveraendert_gueltig"` (unverändert,
  AC12)
- `betroffene_eingaben` (unverändert)

`additionalProperties: false` auf beiden `art`-Varianten (unverändert).

`schemas/examples/` (7 Fixtures, unverändert in der Anzahl/Fallabdeckung
zu plan-v1 SCOPE.2) sind jetzt **vollständige Checkpoint-Einträge**
(Hülle + `payload` inkl. real errechnetem `selbst_hash` über den
gesamten Eintrag, `payload.daten` trägt die Lineage-Struktur) statt
eigenständiger Lineage-Payload-Dateien — jedes Fixture muss deshalb
zusätzlich einen gültigen F1-Checkpoint-Rahmen tragen, nicht nur ein
gültiges `daten`-Objekt.

### Modul-API (`src/lineage-registry/`)

Alle vier schreibenden/entscheidenden Funktionen bekommen einen neuen,
**Pflicht**-Parameter `profilReferenz: { pfad, hash, version }` — F0s
Hülle verlangt ihn auf jedem Checkpoint, die Registry kennt das aktive
Profil nicht selbst (dieselbe „Aufrufer liefert, Registry interpretiert
nicht"-Haltung wie D2/D4 aus plan-v1). Das ist eine echte
Signaturänderung gegenüber plan-v1, nicht nur eine interne Umsetzung.

- `registriereKernArtefakt(artefaktId, profilReferenz, herkunft, daten,
  eingaben?, optionen?)`:
  1. `inhalts_hash = sha256Hex(kanonischesJson(daten))` (F1-Import,
     unverändert wiederverwendet)
  2. baut `lineageDaten = { typ: "lineage", art: "artefakt_version",
     artefakt_id: artefaktId, erzeugungsart: "kern", inhalts_hash,
     herkunft, eingaben: eingaben ?? [], daten }`
  3. ruft `schreibeCheckpoint(\`lineage-${artefaktId}\`, profilReferenz,
     lineageDaten, { ...optionen, schreiber: stillerSchreiber })` — F1s
     eigene Ereigniszeile wird bewusst unterdrückt (siehe „Ereignisse"
     unten), Registry emittiert ihre eigene.
  4. liest `versionSequenz` aus dem von `schreibeCheckpoint`
     zurückgegebenen `pfad` (Dateinamensmuster `<sequenz>-<hash>.json`,
     per Regex, kein F1-Rückgabetyp-Eingriff nötig)
  5. protokolliert `lineage_registriert`, gibt `{ pfad, versionSequenz,
     inhaltsHash }` zurück. Deckt AC1.
- `registriereWerkzeugReferenz(artefaktId, profilReferenz, pfad,
  zitierterBereich, inhalt, herkunft?, eingaben?, optionen?)`: analog,
  `inhalts_hash = sha256Hex(inhalt)` (Inhalt ist bereits ein String,
  keine Kanonisierung nötig), `lineageDaten` ohne `daten`-Feld, mit
  `pfad`/`zitierter_bereich`. Deckt AC2.
- `ladeArtefaktVersion(artefaktId, versionSequenz?, optionen?)`: ruft
  `ladeGueltigeCheckpoints(\`lineage-${artefaktId}\`, optionen)` (neu in
  F1, s. o.), filtert auf `payload.daten?.typ === "lineage" &&
  payload.daten.art === "artefakt_version"`. Ohne `versionSequenz`: der
  Eintrag mit der höchsten `sequenz` unter den gefilterten (nicht die
  höchste `sequenz` der gesamten Kette — eine STALE-Entscheidung mit
  höherer `sequenz` zählt nicht als „Version"). Mit `versionSequenz`:
  exakter Treffer oder `null` (D10-Muster, kein Wurf). Rückgabeform:
  `{ artefaktId, versionSequenz, erzeugungsart, inhaltsHash, herkunft,
  eingaben, daten? }`. Deckt AC13 zusammen mit `listeVersionen`.
- `listeVersionen(artefaktId, optionen?)`: derselbe Filter, alle
  Treffer aufsteigend nach `sequenz`. Deckt AC3/AC4/AC13.
- `pruefeStale(artefaktId, versionSequenz, aktuelleEingabeInhalte,
  optionen?)`: **mechanisch unverändert zu plan-v1** (D4 gilt
  unverändert fort) — lädt über `ladeArtefaktVersion`, vergleicht
  `eingaben`-Hashes gegen vom Aufrufer gelieferten Inhalt. Deckt
  AC6/AC7/AC8/AC9/AC14.
- `haltFestStaleEntscheidung(artefaktId, versionSequenz, profilReferenz,
  entscheidung, begruendung?, betroffeneEingaben?, optionen?)`: prüft
  `begruendung`-Pflicht bei `"unveraendert_gueltig"` **vor** dem Schreiben
  — bei Verstoß Wurf (`Error`, gleiche Haltung wie F1s `pruefeLaufId` für
  Aufrufer-Vertragsverstöße), kein stiller Fehlschlag. Baut
  `lineageDaten` mit `art: "stale_entscheidung"` und
  `bezieht_sich_auf: { sequenz: versionSequenz }`, ruft
  `schreibeCheckpoint` auf dieselbe Kette. **Rührt nie eine bestehende
  Datei an** — strukturell durch F1s `schreibeCheckpoint` garantiert
  (schreibt nur neue Dateien, nie über eine bestehende), nicht durch
  eigene Lineage-Logik. Deckt AC11/AC12.
- `validiereLineageEintrag(eintrag)`: reine Funktion, **komponiert**:
  ruft zuerst `validiereCheckpointEintrag(eintrag)` (F1-Import,
  Hülle+Checkpoint-Payload+Selbst-Hash), bei Verstößen sofortige
  Rückgabe (Hülle ungültig ⇒ `payload.daten` gar nicht erst geprüft,
  analog F1s eigenem `validiereProfilReferenz`-Kompositionsmuster). Sind
  keine Hüllen-Verstöße vorhanden, prüft zusätzlich `payload.daten` auf
  `typ === "lineage"`, gültigen `art`-Wert und die art-spezifischen
  Pflichtfelder (siehe oben). Kein zweiter Regelsatz für die
  Hüllenebene.

Kein `ajv` (unverändert, D7 aus plan-v1 bleibt bestehen).

### Ereignisse (Delta zu plan-v1 SCOPE.6)

`src/lineage-registry/` protokolliert weiterhin eigene, höherstufige
Ereigniszeilen (`lineage_registriert`, `lineage_geladen`,
`lineage_kein_gueltiger_gefunden`, `lineage_validierungsfehler`,
`lineage_stale_geprueft`, `lineage_entscheidung_festgehalten`) — F1s
eigene `checkpoint_*`-Ereignisse werden bei jedem internen
`schreibeCheckpoint`/`ladeGueltigeCheckpoints`-Aufruf bewusst mit einem
stillen Schreiber (`() => {}`) unterdrückt, damit nicht zwei
Abstraktionsebenen gleichzeitig protokollieren. Diese Entscheidung ist
neu gegenüber plan-v1 (das noch von einer eigenen Dateiablage ohne F1s
Ereignisebene ausging) — siehe **Offener Punkt 2**, falls Stefan die
F1-Ereignisse stattdessen sichtbar mitlaufen lassen will (z. B. für
Debugging).

### Speicherstruktur (ersetzt plan-v1 SCOPE.5/D6 vollständig)

`kontrollzustand/lineage-<artefakt_id>/checkpoints/<sequenz>-<selbst_hash>.json`
— **F1s eigene, bereits gebaute und getestete Struktur**, keine neue.
Kein `kontrollzustand/<artefakt_id>/lineage/` und kein
`.../lineage-entscheidungen/` mehr (plan-v1 SCOPE.5 entfällt ersatzlos).

## Delta 2 (löst B4) — Testdatei für `src/lineage-registry/`

`src/lineage-registry/lineage-registry.test.ts`, `node:test`, Muster wie
`checkpoint-store.test.ts` (Wegwerfverzeichnis unter
`kontrollzustand-test/`, `after`-Aufräumen). Mindestens folgende Fälle,
je mit explizit benanntem Rot-/Grün-Fall (kalibriert vor dem Bau-Report,
nicht nur behauptet):

1. **Rundlauf kern (deckt A1/AC1):** `registriereKernArtefakt` gefolgt
   von `ladeArtefaktVersion` liefert inhaltlich identischen Eintrag
   (`daten`, `herkunft`, `eingaben` byteidentisch zum Aufruf).
2. **Rundlauf werkzeug ohne `daten` (deckt A2/AC2):** analog, plus
   expliziter Check, dass der geschriebene Checkpoint kein
   `payload.daten.daten`-Feld trägt (strukturelle Prüfung, nicht nur
   Pflichtfeld-Präsenz — Muster wie plan-v1s ursprüngliches A2).
3. **Zwei Versionen, ältere bleibt unverändert (deckt A3/A4/AC3/AC4):**
   zwei `registriereKernArtefakt`-Aufrufe mit unterschiedlichem `daten`
   für dieselbe `artefaktId` ⇒ zwei unterschiedliche `sequenz`-Werte;
   Byte-Snapshot der ersten Checkpoint-Datei vor und nach dem zweiten
   Aufruf ist identisch (Beleg, dass `haltFestStaleEntscheidung`/
   `registriereKernArtefakt` nie eine bestehende Datei anfassen —
   strukturell durch F1 garantiert, hier real bewiesen).
4. **`listeVersionen`/`ladeArtefaktVersion` filtert STALE-Entscheidungen
   heraus (deckt A13/AC13, zentraler Beleg für Delta 1):** Nach
   `registriereKernArtefakt` (⇒ sequenz 1) und
   `haltFestStaleEntscheidung` (⇒ sequenz 2, `art:
   "stale_entscheidung"`) liefert `listeVersionen` genau einen Eintrag
   (sequenz 1), nicht zwei — der Beweis, dass die gemeinsame Kette
   korrekt nach `art` gefiltert wird.
5. **AC14-Hauptfall (Stale-Erkennung, real durchspielt):** wie plan-v1
   SCOPE.8b beschrieben (`"ABC"` → `stale: false`, geänderter Inhalt
   `"XYZ"` für dieselbe Eingabe → `stale: true` mit genau diesem
   Schlüssel in `geaenderteEingaben`).
6. **`haltFestStaleEntscheidung` ohne `begruendung` bei
   `unveraendert_gueltig` wirft (deckt A12/AC12):** `assert.throws`.

**Ergänzung `checkpoint-store.test.ts` (F1, Delta 1 oben):** ein neuer
Testfall für `ladeGueltigeCheckpoints` — Kette mit drei Checkpoints,
einer davon nachträglich korrumpiert (Muster wie F1s bestehende
Korruptions-Tests) ⇒ liefert nur die gültigen, aufsteigend sortiert;
leere Kette ⇒ leeres Array, kein Wurf.

**Ergänzung `scripts/check-lineage-registry.mjs` (ersetzt plan-v1
SCOPE.8, gleicher Name, angepasster Inhalt):** importiert
`validiereLineageEintrag`, `registriereKernArtefakt`, `pruefeStale`,
`listeVersionen`, `haltFestStaleEntscheidung` direkt aus
`src/lineage-registry/` (kein zweiter Regelsatz). Prüft (a) die sieben
Fixtures gegen `validiereLineageEintrag`, (b) den AC14-Hauptfall, (c) den
`begruendung`-Wurf-Fall. Deckt damit weiterhin nicht A1/A3/A4/A13 —
das ist jetzt **bewusst** so benannt (Delta 2 oben), nicht implizit
offengelassen: A1/A3/A4/A13 sind der `lineage-registry.test.ts` explizit
zugeordnet, das Gate-Skript deckt A2 (strukturell)/A14/A12.

## Delta 3 (schärft B5 nach) — Zuschnitt-Realismus

Der Zuschnitt ist durch Delta 1 **nicht** kleiner geworden — im
Gegenteil: zusätzlich zum bereits in plan-v1 gezählten Funktionsumfang
(sieben öffentliche Modulfunktionen, sieben Fixtures, zwei
Diskriminatoren) kommt jetzt eine neue F1-Erweiterung
(`ladeGueltigeCheckpoints`, eigener Testfall, Advisor-ungeprüft) und ein
komplett neues Speicherformat für die Fixtures (vollständige
Checkpoint-Einträge statt eigenständiger Payloads) hinzu. Die
CLAUDE.md-Heuristik „ein Baudurchgang plus höchstens eine
Korrekturrunde" bleibt formal anwendbar (ein zusammenhängendes,
prüfbares Artefakt), ist aber **enger** als in plan-v1 eingeschätzt —
realistische Einschätzung für den Handoff-Vertrag: der F1-Touch
(`ladeGueltigeCheckpoints`) sollte als eigener, klar abgegrenzter erster
Teilschritt gebaut und mit seinem eigenen Test grün laufen, **bevor**
`src/lineage-registry/` ihn importiert — nicht beides gleichzeitig
verdrahten und erst am Ende gemeinsam testen.

## Offene Punkte (NICHT stillschweigend entschieden)

1. **`ladeGueltigeCheckpoints` ist ein neuer F1-Eingriff, den der
   ursprüngliche Advisor-Pass nicht kennt.** B3 hat ausdrücklich nur die
   Ein-Zeilen-Export-Ergänzung geprüft und freigegeben — diese entfällt
   jetzt vollständig. Die neue Funktion ist eine echte Erweiterung der
   öffentlichen F1-API (nicht nur Sichtbarkeit), reine Leseoperation,
   keine neue Schreiblogik, keine Änderung an bestehenden Funktionen
   oder deren Signaturen — nach Einschätzung dieser Sitzung risikoarm,
   aber ungeprüft. Zur Bestätigung: entweder ein fokussierter,
   zweiter Advisor-Pass ausschließlich auf diesen Punkt, oder Stefans
   direkte Prüfung/Freigabe vor dem Bau. Diese Sitzung entscheidet das
   nicht selbst.
2. **Ereignis-Doppelung bewusst unterdrückt (F1s `schreiber` wird beim
   internen Aufruf stillgelegt).** Falls Stefan die F1-Ereignisse
   trotzdem sichtbar mitlaufen lassen möchte (z. B. für Debugging auf
   Checkpoint-Ebene), müsste `optionen.schreiber` durchgereicht statt
   ersetzt werden — dann protokolliert ein einzelner Aufruf zwei
   Ereigniszeilen (`checkpoint_geschrieben` und `lineage_registriert`).
   Diese Sitzung wählt die stille Variante als Standard.
3. **`herkunft` und `eingaben[].pfad` bleiben unstrukturiert** —
   unverändert zu plan-v1 Offener Punkt 3, hier fortgeführt.
4. **`lineage-`-Präfix-Konvention ist diese Sitzung, kein
   Repo-weiter Standard.** Sollte ein künftiger Execution Controller
   eigene `lauf_id`-Vergaberegeln bekommen, muss diese Konvention dort
   bekannt sein (Kollisionsvermeidung) — gehört in dessen künftige
   Feature-Akte/ADR, nicht rückwirkend in dieses Dokument.

## Akzeptanzkriterien — Delta-Tabelle (gegen plan-v1 Abschnitt 7)

| AC (plan-v1) | Status | Delta |
|---|---|---|
| A1 (AC1) | geändert | Mechanik: Checkpoint statt eigene Datei; sonst unverändert |
| A2 (AC2) | geändert | „ohne `daten`-Feld" bezieht sich jetzt auf `payload.daten.daten` (Unterfeld), nicht auf eine ganze Datei |
| A3 (AC3) | geändert | zwei `sequenz`-Werte statt zwei `version_sequenz`-Werte, sonst unverändert |
| A4 (AC4) | geändert | Garantie jetzt strukturell durch F1s `schreibeCheckpoint`, nicht durch eigene Inhaltsadressierung |
| A5 (AC5) | unverändert | |
| A6 (AC6) | unverändert | |
| A7 (AC7) | unverändert | |
| A8 (AC8) | unverändert | D4 unverändert |
| A9 (AC9) | unverändert | |
| A10 (AC10) | unverändert | |
| A11 (AC11) | geändert | `bezieht_sich_auf: { sequenz }` statt `{ version_sequenz }` |
| A12 (AC12) | geändert | Verstoß führt jetzt zu einem Wurf vor dem Schreiben, nicht zu einer nachträglich erkannten Regelverletzung |
| A13 (AC13) | geändert | Mechanik: `ladeGueltigeCheckpoints` (neu in F1) + Filter auf `art` |
| A14 | unverändert | Hauptkriterium, real durchspielt (Delta 2, Fall 5) |
| A15 | geändert | Gate-Skript deckt jetzt (a) Fixtures, (b) AC14, (c) `begruendung`-Wurf — A1/A3/A4/A13 wandern in `lineage-registry.test.ts` (Delta 2) |
| A16 | geändert | zusätzlich: neuer F1-Testfall für `ladeGueltigeCheckpoints` muss grün sein |
| A17 | geändert | `state/gates.md`: neue Zeile für `check-lineage-registry.mjs` UND Ergänzung der bestehenden Checkpoint-Store-Zeile (neue Funktion) |
| A18 | unverändert | |
| A19 | unverändert | |

Neu (nicht in plan-v1): **A20** — `src/checkpoint-store/checkpoint-store.test.ts`
enthält einen grünen Testfall für `ladeGueltigeCheckpoints` (Kette mit
Korruption, leere Kette).

## Ergebnis

Plan v2 = plan-v1 Rollen (Abschnitt 8) + Budget-Rahmen (Abschnitt 6,
Zuschnitt-Bewertung durch Delta 3 nachgeschärft) unverändert + Delta 1
(löst B1: Lineage-Einträge sind Checkpoints, `lauf_id =
lineage-<artefakt_id>`, keine eigene Versionierung, neue F1-Funktion
`ladeGueltigeCheckpoints`, Payload-Schema beschreibt jetzt
`checkpoint.payload.daten`, `profilReferenz`-Pflichtparameter neu) +
Delta 2 (löst B4: `lineage-registry.test.ts` mit sechs Fällen, Gate-Skript
neu zugeschnitten) + Delta 3 (schärft B5 nach: F1-Touch zuerst, dann
Lineage-Modul). B2/B3 bleiben als historische Befunde bestätigt, B3s
Gegenstand (Export-Ergänzung) entfällt aber ersatzlos durch Delta 1.
Vier offene Punkte, keiner stillschweigend entschieden — insbesondere
Offener Punkt 1 (`ladeGueltigeCheckpoints` ungeprüft) ist vor dem Bau zu
klären, nicht Teil dieses Dokuments.

## Nächster Schritt

Klärung der vier offenen Punkte (insbesondere 1), danach Handoff-Vertrag
`state/tasks/f2-artifact-registry-lineage.md`, sieben Pflichtsektionen,
SCHRITT 0 wörtlich, endet mit Freigabe-Halt.
