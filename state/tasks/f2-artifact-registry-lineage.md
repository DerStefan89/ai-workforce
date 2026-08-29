SCHRITT 0: Arbeitsverzeichnis ausgeben und gegen das im Auftrag genannte Zielverzeichnis prüfen. Bei Abweichung: abbrechen, melden, nichts ändern.

Zielverzeichnis: Repo DerStefan89/ai-workforce, Branch
`feature/f2-artifact-registry-lineage` (von `main` abgeleitet, vor
Ausführung mit Stefan bestätigen — `main` muss dafür bereits den
gemergten Stand von `vertrag/plan-v1-feature2-artifact-registry-lineage`
tragen, sonst fehlt `ladeGueltigeCheckpoints`).

## TASK: f2-artifact-registry-lineage

GOAL: Ein Modul unter `src/lineage-registry/` registriert ein
kern-erzeugtes Kontrollartefakt mit eigener, inhaltsadressierter
Identität sowie ein werkzeug-erzeugtes Artefakt als reine Referenz, hält
für ein abgeleitetes Artefakt seine Eingaben fest, prüft mechanisch, ob
sich eine referenzierte Eingabe seit der Registrierung geändert hat, und
hält eine daraufhin getroffene menschliche STALE-Entscheidung
unveränderlich fest — jede Schreiboperation läuft dabei ausschließlich
über die echte, unveränderte `schreibeCheckpoint`-Funktion aus
`src/checkpoint-store/index.ts` (F1), kein eigener Dateibaum unter
`kontrollzustand/`. Real durchspielbar mit einem Fall, in dem ein
zitierter Eingabebereich nachträglich verändert wird (AC14), nicht nur
in Prosa behauptet. Die Akzeptanzkriterien A1–A20 aus
`state/plan-v2-feature2-artifact-registry-lineage.md` (plan-v1 + Delta
1–3) sind erfüllt.

CONTEXT:
- [Fakt] Vollständiger Plan: `state/plan-v2-feature2-artifact-registry-
  lineage.md` (Delta zu `state/plan-v1-feature2-artifact-registry-
  lineage.md`, der unverändert stehen bleibt). Bei Widerspruch gilt
  plan-v2, bei dessen Schweigen plan-v1. plan-v1 Abschnitt 8 (Rollen)
  und der Budget-Rahmen aus Abschnitt 6 (durch plan-v2 Delta 3
  nachgeschärft) gelten unverändert.
- [Fakt] Advisor-Urteil zu plan-v1: **NICHT FREIGEGEBEN**
  (`state/advisor-findings-feature2-artifact-registry-lineage.md`),
  blockierend waren B1 (Architekturkonflikt) und B4 (fehlende
  Testdatei). Beide sind in plan-v2 aufgelöst (Delta 1 bzw. Delta 2).
  B2/B3 sind bestätigt; B3s Gegenstand (Export-Ergänzung an
  `atomarSchreiben`) entfällt durch Delta 1 ersatzlos — kein
  `atomarSchreiben`-Export nötig, dieses Modul schreibt nie selbst eine
  Datei.
- [Fakt, wichtig] **Kein erneuter Advisor-Pass auf plan-v2 selbst** —
  Stefans Architekturentscheidung (Option A) hat B1 direkt aufgelöst.
  Die dabei neu entstandene Erweiterung `ladeGueltigeCheckpoints` in F1
  ist aber **ungeprüft durch den ursprünglichen Advisor-Pass**
  (plan-v2, Offener Punkt 1) — dieser Vertrag baut nicht auf ihrer
  Neuprüfung, sondern auf ihrem bereits realen, gebauten und getesteten
  Zustand (nächster Punkt). Widersprich nicht dieser Einschätzung, ohne
  es zu melden (ESCALATE).
- [Fakt] `ladeGueltigeCheckpoints(laufId, optionen?):
  KontrollzustandEintrag[]` existiert bereits real in
  `src/checkpoint-store/index.ts`, committet und gepusht (Commit
  `d3ecc8b` auf `vertrag/plan-v1-feature2-artifact-registry-lineage`,
  vorausgesetzt dieser Branch ist zum Zeitpunkt der Ausführung bereits
  nach `main` gemergt). **Nicht erneut bauen** — nur importieren.
  Verhalten: liefert alle gültigen Checkpoints einer `lauf_id`
  aufsteigend nach `sequenz` (volle Rückwärtslauf-Gültigkeit wie
  `ladeLetztenGueltigenCheckpoint`, D3 aus F1, keine Abschwächung),
  leeres Array bei keinem gültigen Kandidaten, kein Wurf. Eigener
  `node:test`-Fall bereits vorhanden in
  `src/checkpoint-store/checkpoint-store.test.ts`.
- [Fakt] Feature-Akte `features/F2/feature.md` existiert noch nicht —
  anzulegen in diesem Vertrag (SCOPE.10), analog `features/F1/
  feature.md`, `Status: READY_FOR_TECH` vor dem Bau,
  `ABGESCHLOSSEN` erst nach grünem `npm run check`.
- [Fakt] Kernarchitektur (plan-v2 Delta 1): Lineage-Einträge sind
  Checkpoints. `lauf_id = \`lineage-${artefaktId}\`` (Namensraum-Präfix
  zur Kollisionsvermeidung mit künftigen Execution-Controller-`lauf_id`s
  — Konvention dieser Sitzung, nicht in `ARCHITECTURE.md` verankert,
  plan-v2 Offener Punkt 4). Die Lineage-Struktur
  (`artefakt_id, art, erzeugungsart, inhalts_hash, herkunft, eingaben,
  …`) liegt vollständig in `payload.daten` mit innerem Diskriminator
  `daten.typ === "lineage"` — die äußere Checkpoint-Hülle bleibt
  `typ: "checkpoint"` und wird ausschließlich von F1s
  `validiereCheckpointEintrag` geprüft, kein zweiter Regelsatz dafür.
- [Fakt] Versionierung: keine eigene `version_sequenz`-Zählung. Die
  Version eines Artefakt-Eintrags ist die Checkpoint-`sequenz`, die F1
  bereits vergibt. STALE-Entscheidungen landen in derselben Kette
  (`art: "stale_entscheidung"`), referenzieren ihre Zielversion über
  `bezieht_sich_auf: { sequenz: integer }` (ersetzt plan-v1s
  `version_sequenz`-Feld in diesem Unterobjekt).
- [Fakt] Alle vier schreibenden/entscheidenden Funktionen
  (`registriereKernArtefakt`, `registriereWerkzeugReferenz`,
  `haltFestStaleEntscheidung`) bekommen einen neuen Pflichtparameter
  `profilReferenz: { pfad, hash, version }` — F0s Hülle verlangt ihn auf
  jedem Checkpoint, die Registry kennt das aktive Profil nicht selbst
  und erzeugt es nicht (D2/D4-Haltung: Aufrufer liefert, Registry
  interpretiert nicht).
- [Fakt] Ereignisse: `src/lineage-registry/` protokolliert eigene,
  höherstufige Ereigniszeilen (`lineage_registriert`, `lineage_geladen`,
  `lineage_kein_gueltiger_gefunden`, `lineage_validierungsfehler`,
  `lineage_stale_geprueft`, `lineage_entscheidung_festgehalten`). F1s
  eigene `checkpoint_*`-Ereignisse werden bei jedem internen
  `schreibeCheckpoint`/`ladeGueltigeCheckpoints`-Aufruf **bewusst mit
  einem stillen Schreiber unterdrückt** (`optionen.schreiber` wird
  intern durch `() => {}` ersetzt, nicht durchgereicht) — Standard
  dieser Sitzung (plan-v2 Offener Punkt 2). Nicht stillschweigend
  ändern, falls das unpraktisch wirkt — melden (ESCALATE).
- [Fakt] Referenzmuster für Modul, Test und Gate-Skript: `src/
  checkpoint-store/index.ts` + `checkpoint-store.test.ts` +
  `scripts/check-checkpoint-store.mjs` (F1, real gebaut, gemergt).
  Wiederverwendung statt Neuerfindung: `kanonischesJson`, `sha256Hex`,
  `schreibeCheckpoint`, `ladeGueltigeCheckpoints`,
  `validiereCheckpointEintrag` werden direkt aus
  `src/checkpoint-store/index.ts` importiert. Kein `atomarSchreiben`-
  Import nötig (dieses Modul schreibt nie selbst eine Datei).
- [Fakt] Kein `ajv`, keine neue Dependency (plan-v1 D7, unverändert).
- [Fakt] `package.json`: `check` und `check:template` sind zwei
  unabhängige Skript-Strings (F0/F1-Muster) — `check-lineage-
  registry.mjs` einzeln in beide eintragen, nach
  `check-checkpoint-store.mjs`.
- [Fakt] Gültige `Status`-Werte: `ENTWURF, READY_FOR_TECH,
  WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN,
  BLOCKIERT, ABGEBROCHEN` (geprüft von `scripts/check-feature.mjs`).
- [Fakt] Offene Punkte aus plan-v2, nicht in diesem Vertrag zu lösen,
  nur zu kennen: Punkt 3 (`herkunft`/`eingaben[].pfad` bleiben
  unstrukturiert — unverändert übernehmen, nicht selbst ein Format
  erfinden). Punkt 1 und 2 sind oben bereits eingearbeitet, Punkt 4
  ist die oben benannte `lineage-`-Präfixkonvention.

SCOPE:
1. `schemas/kontrollzustand-lineage-payload.schema.json` — beschreibt
   ausschließlich die Form von `checkpoint.payload.daten`, wenn
   `daten.typ === "lineage"` (nicht die äußere Kontrollzustand-Hülle,
   die bleibt F1s `validiereCheckpointEintrag`). Zwei `art`-Varianten:
   - `art: "artefakt_version"` — Pflicht: `typ` (const `"lineage"`),
     `art` (const), `artefakt_id` (String, nicht leer,
     dateisystem-sicher wie F1s `lauf_id`), `erzeugungsart` (`"kern"` |
     `"werkzeug"`), `inhalts_hash` (String, `minLength: 64`), `herkunft`
     (offen). Optional: `eingaben` (Array `{pfad, zitierter_bereich,
     inhalts_hash}`). Nur bei `erzeugungsart: "kern"`: `daten` (offen).
     Nur bei `erzeugungsart: "werkzeug"` **pflichtig**, `daten` dabei
     **verboten**: `pfad`, `zitierter_bereich`.
   - `art: "stale_entscheidung"` — Pflicht: `typ`, `art` (const),
     `artefakt_id`, `bezieht_sich_auf: { sequenz: integer }`,
     `entscheidung` (`"neu_erzeugen"` | `"nachtrag"` |
     `"unveraendert_gueltig"`). `begruendung` (String) Pflicht bei
     `entscheidung === "unveraendert_gueltig"`, sonst optional.
     Optional: `betroffene_eingaben` (Array von Strings).
   `additionalProperties: false` auf beiden Varianten.
2. `schemas/examples/` — sieben Fixtures, jetzt **vollständige
   Checkpoint-Einträge** (Hülle + `payload` inkl. real errechnetem
   `selbst_hash` über den gesamten Eintrag, `payload.daten` trägt die
   Lineage-Struktur), nicht eigenständige Lineage-Payloads:
   `kontrollzustand-lineage-kern.valid.json`,
   `kontrollzustand-lineage-werkzeug.valid.json`,
   `kontrollzustand-lineage-entscheidung.valid.json`,
   `kontrollzustand-lineage.invalid-fehlende-artefakt-id.json`,
   `kontrollzustand-lineage.invalid-hash-mismatch.json`,
   `kontrollzustand-lineage.invalid-daten-bei-werkzeug.json`,
   `kontrollzustand-lineage.invalid-entscheidung-ohne-begruendung.json`.
3. `src/lineage-registry/` — Modul, typisiert, kein `any`:
   - `registriereKernArtefakt(artefaktId, profilReferenz, herkunft,
     daten, eingaben?, optionen?)` — `inhalts_hash =
     sha256Hex(kanonischesJson(daten))`, baut `lineageDaten`, ruft
     `schreibeCheckpoint(\`lineage-${artefaktId}\`, profilReferenz,
     lineageDaten, { ...optionen, schreiber: stillerSchreiber })`,
     liest `versionSequenz` aus dem zurückgegebenen `pfad` (Regex auf
     das Dateinamensmuster `<sequenz>-<hash>.json`, kein F1-
     Rückgabetyp-Eingriff), protokolliert `lineage_registriert`, gibt
     `{ pfad, versionSequenz, inhaltsHash }` zurück.
   - `registriereWerkzeugReferenz(artefaktId, profilReferenz, pfad,
     zitierterBereich, inhalt, herkunft?, eingaben?, optionen?)` —
     analog, `inhalts_hash = sha256Hex(inhalt)` (roher String, keine
     Kanonisierung), `lineageDaten` ohne `daten`-Feld.
   - `ladeArtefaktVersion(artefaktId, versionSequenz?, optionen?)` —
     ruft `ladeGueltigeCheckpoints(\`lineage-${artefaktId}\`, optionen)`,
     filtert auf `payload.daten?.typ === "lineage" &&
     payload.daten.art === "artefakt_version"`. Ohne `versionSequenz`:
     höchste `sequenz` unter den gefilterten (nicht der gesamten
     Kette). Mit `versionSequenz`: exakter Treffer oder `null`, kein
     Wurf. Rückgabe: `{ artefaktId, versionSequenz, erzeugungsart,
     inhaltsHash, herkunft, eingaben, daten? }`.
   - `listeVersionen(artefaktId, optionen?)` — derselbe Filter, alle
     Treffer aufsteigend nach `sequenz`.
   - `pruefeStale(artefaktId, versionSequenz, aktuelleEingabeInhalte,
     optionen?)` — mechanisch wie plan-v1 (D4 unverändert): lädt über
     `ladeArtefaktVersion`, vergleicht `eingaben`-Hashes gegen vom
     Aufrufer gelieferten Inhalt, liefert `{ stale, geaenderteEingaben
     }`.
   - `haltFestStaleEntscheidung(artefaktId, versionSequenz,
     profilReferenz, entscheidung, begruendung?, betroffeneEingaben?,
     optionen?)` — wirft (`Error`) bei `entscheidung ===
     "unveraendert_gueltig"` ohne `begruendung`, **vor** dem Schreiben.
     Sonst `lineageDaten` mit `art: "stale_entscheidung"` und
     `bezieht_sich_auf: { sequenz: versionSequenz }`, schreibt über
     `schreibeCheckpoint` auf dieselbe Kette.
   - `validiereLineageEintrag(eintrag)` — reine Funktion: ruft zuerst
     `validiereCheckpointEintrag(eintrag)` (F1-Import), bei Verstößen
     sofortige Rückgabe. Sonst zusätzlich `payload.daten` auf
     `typ === "lineage"`, gültigen `art`-Wert und die art-spezifischen
     Pflichtfelder aus SCOPE.1 prüfen. Kein zweiter Regelsatz für die
     Hüllenebene.
4. `src/lineage-registry/lineage-registry.test.ts` — sechs
   `node:test`-Fälle (plan-v2 Delta 2), Wegwerfverzeichnis unter
   `kontrollzustand-test/`, `after`-Aufräumen:
   1. Rundlauf kern (A1/AC1).
   2. Rundlauf werkzeug ohne `daten`-Unterfeld, strukturell geprüft
      (A2/AC2).
   3. Zwei Versionen, Byte-Snapshot der ersten Datei vor/nach dem
      zweiten Aufruf identisch (A3/A4/AC3/AC4).
   4. `listeVersionen`/`ladeArtefaktVersion` filtert STALE-
      Entscheidungen aus der gemeinsamen Kette heraus (A13/AC13).
   5. AC14-Hauptfall: `"ABC"` → `stale: false`, geänderter Inhalt
      `"XYZ"` für dieselbe Eingabe → `stale: true` mit genau diesem
      Schlüssel.
   6. `haltFestStaleEntscheidung` ohne `begruendung` bei
      `unveraendert_gueltig` wirft (`assert.throws`, A12/AC12).
5. Strukturierte Laufausgabe (siehe CONTEXT „Ereignisse" oben):
   `lineage_registriert`, `lineage_geladen`,
   `lineage_kein_gueltiger_gefunden`, `lineage_validierungsfehler`,
   `lineage_stale_geprueft`, `lineage_entscheidung_festgehalten`,
   Schreiber austauschbar (Default `console.log`).
6. `scripts/check-lineage-registry.mjs` — Gate-Skript, importiert
   `validiereLineageEintrag`, `registriereKernArtefakt`, `pruefeStale`,
   `listeVersionen`, `haltFestStaleEntscheidung` direkt aus
   `src/lineage-registry/` (kein zweiter Regelsatz). Prüft: (a) sieben
   Fixtures gegen `validiereLineageEintrag`, (b) den AC14-Hauptfall
   real durchspielt, (c) `haltFestStaleEntscheidung` ohne `begruendung`
   wirft, mit `begruendung` schreibt erfolgreich. Deckt bewusst NICHT
   A1/A3/A4/A13 (die sind `lineage-registry.test.ts` zugeordnet, plan-v2
   Delta 2 — keine stillschweigende Lücke). Eingehängt in `npm run
   check` UND `npm run check:template` (je einzeln eintragen, nach
   `check-checkpoint-store.mjs`).
7. `state/gates.md` — neue Tabellenzeile `check-lineage-registry.mjs`
   (Muster: Checkpoint-Store-Gate-Zeile), Rot-/Grün-Beleg erst nach dem
   realen Lauf. Zusätzlich: bestehende Checkpoint-Store-Gate-Zeile um
   einen Hinweis auf `ladeGueltigeCheckpoints` ergänzen (bereits
   getestet, siehe CONTEXT) — keine neue Zeile dafür, nur Ergänzung.
8. `state/memory-map.md` — zwei neue Zeilen: „Lineage-Payload-Schema"
   → `schemas/kontrollzustand-lineage-payload.schema.json` +
   `schemas/examples/kontrollzustand-lineage*`, „nicht hierhin": nicht
   in `schemas/kontrollzustand.schema.json`, beschreibt nur
   `checkpoint.payload.daten`. „Lineage-Registry-Modul" →
   `src/lineage-registry/`, „nicht hierhin": kein Abhängigkeitsgraph,
   keine Impact-Klassifikation, keine Invalidierungspropagation, keine
   Ausführungslogik, kein eigener Dateibaum unter `kontrollzustand/`.
9. `docs/STATUS.md` — Eintrag unter „Erledigt": Artifact Registry /
   Lineage umgesetzt, mit Hinweis, dass Lineage-Einträge F1s
   Checkpoint-Kette nutzen (kein eigener Dateibaum).
10. `features/F2/feature.md` (Muster `features/F1/feature.md`,
    `Status: READY_FOR_TECH` vor dem Bau, `ABGESCHLOSSEN` danach) +
    `features/F2/journal.md` (Muster `features/F1/journal.md`) —
    beide neu anzulegen, Ziel/Scope/Nicht-Ziele/AC aus der
    Feature-Akte-Vorlage (Auftrag dieser gesamten Arbeit), technische
    Ausprägung verweist auf plan-v2.

NICHT:
- Ein eigener Dateibaum unter `kontrollzustand/<artefakt_id>/` — jede
  Schreiboperation läuft über `schreibeCheckpoint` (F1), kein
  `atomarSchreiben`-Import, kein direktes `writeFileSync` auf
  `kontrollzustand/` in `src/lineage-registry/`.
- Eine eigene `version_sequenz`-Zählung — Version ist die
  Checkpoint-`sequenz`.
- Änderung an `src/checkpoint-store/index.ts`,
  `checkpoint-store.test.ts` oder `scripts/check-checkpoint-store.mjs`
  über das bereits gebaute `ladeGueltigeCheckpoints` hinaus — dieser
  Vertrag baut F1 nicht weiter aus.
- Änderung von `schemas/kontrollzustand.schema.json` (F0, gemergt).
- Abhängigkeitsgraph über mehrere Artefakte, Impact-Klassifikation,
  Invalidierungspropagation, Visualisierung — unverändert Nicht-Ziel
  (plan-v1 Abschnitt 3).
- Automatische Neuerzeugung, Nachtrag oder Freigabe eines
  STALE-Artefakts — `haltFestStaleEntscheidung` verlangt immer eine vom
  Aufrufer gelieferte Entscheidung.
- Lesen von Dateien/Bereichen durch die Registry selbst — jeder Inhalt
  wird als String vom Aufrufer übergeben.
- Execution Controller, Workstream-/Execution-Automat oder jede
  Orchestrierungslogik.
- Eine eigene Struktur/ein eigenes Format für `herkunft` oder
  `eingaben[].pfad` erfinden — bleiben unstrukturiert (plan-v2 Offener
  Punkt 3).
- `ajv` oder ein anderer generischer JSON-Schema-Validator.
- `git add`/`git commit` im Schreibpfad.

BUDGET: Ein Baudurchgang plus höchstens eine Korrekturrunde. Empfehlung
aus plan-v2 Delta 3: `src/lineage-registry/` erst gegen das bereits
fertige `ladeGueltigeCheckpoints` verdrahten und dessen Import isoliert
prüfen (`node --test` auf einen einzelnen Rundlauf-Fall), bevor die
restlichen fünf Testfälle und das Gate-Skript aufgebaut werden — nicht
alles gleichzeitig verdrahten und erst am Ende gemeinsam testen. Zweites
Rot auf demselben Gate ⇒ BLOCKIERT ⇒ Mensch.

OUTPUT:
- Neue Dateien: `schemas/kontrollzustand-lineage-payload.schema.json`,
  `schemas/examples/kontrollzustand-lineage*.json` (7 Dateien),
  `src/lineage-registry/*.ts` (Modul + `lineage-registry.test.ts`),
  `scripts/check-lineage-registry.mjs`, `features/F2/feature.md`,
  `features/F2/journal.md`.
- Geänderte Dateien: `package.json` (`check` und `check:template`),
  `state/gates.md`, `state/memory-map.md`, `docs/STATUS.md`.
- Beleg: `npm run check` und `npm run check:template` grün, Konsolen-
  Ausgabe im Bericht zeigen. Kalibrierung: für jedes der sieben
  Payload-Fixtures (Rot für jedes Invalid-Beispiel, benannte
  Regelverletzung), den AC14-Hauptfall (`stale:false` → `stale:true`),
  den `begruendung`-Wurf-Fall — danach Grün-Zustand zeigen. Für die
  sechs `lineage-registry.test.ts`-Fälle: `node --test` grün, plus für
  mindestens Fall 3 (Byte-Snapshot) und Fall 4 (STALE-Filterung) einen
  real ausgelösten Rot-Fall (temporäre Codeänderung, Fehlschlag zeigen,
  zurücknehmen) — analog F1s Kalibrierungsmuster.
- Commit ausschließlich mit expliziten Pfaden (nie `-A`/`.`), `git-flow`-
  Skill nutzen, kein Commit ohne frische `state/freigabe-commit.md`,
  Push separat autorisiert.
- Bericht: was geändert wurde, welche Checks liefen (inkl. aller
  Rot-/Grün-Kalibrierungen), Ergebnis, echte Blocker, ausdrücklicher
  Hinweis, ob `features/F2/feature.md` auf `Status: ABGESCHLOSSEN`
  gesetzt wurde.

ESCALATE:
- `main` trägt zum Ausführungszeitpunkt noch nicht
  `ladeGueltigeCheckpoints` (Branch `vertrag/plan-v1-feature2-artifact-
  registry-lineage`, Commit `d3ecc8b`, ist noch nicht gemergt) →
  abbrechen, melden, nicht selbst mergen oder die Funktion ein zweites
  Mal bauen.
- `state/plan-v2-feature2-artifact-registry-lineage.md` fehlt oder
  widerspricht diesem Vertrag → abbrechen, melden, nichts anlegen.
- Einer der Kalibrierungstests reproduziert sich nicht wie in plan-v2
  Delta 1/2 beschrieben → anhalten, welcher Fall betrifft es, was
  tatsächlich passierte, melden. Nicht das Skript/den Test so lange
  anpassen, bis irgendein Fehler auftritt.
- `npm run check` wird rot an einem Glied, das dieser Auftrag nicht
  angefasst hat (insbesondere `check-checkpoint-store.mjs`) → anhalten
  und melden. Kein Nachziehen fremder Stellen.
- Der stille Schreiber (F1-Ereignisse unterdrückt, siehe CONTEXT) wirkt
  in der Praxis unpraktisch (z. B. weil Debugging auf Checkpoint-Ebene
  gebraucht wird) → nicht selbst umstellen, melden (plan-v2 Offener
  Punkt 2).
- Eine der vorgegebenen Formulierungen (SCOPE/AK) widerspricht
  `state/plan-v2-feature2-artifact-registry-lineage.md` oder
  `docs/projekt/zielfassung.md` → anhalten, beide Stellen zitieren,
  melden. Nicht selbst entscheiden, welche gilt.
- `git commit` oder `git push` wird ohne frische Freigabedatei verlangt
  → nicht ausführen.

Vertrag endet mit Freigabe-Halt: kein Bau, kein Commit, kein Push in
diesem Schritt. Ausführung erst nach Stefans expliziter, frischer
Freigabe.
