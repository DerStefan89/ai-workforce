SCHRITT 0: Arbeitsverzeichnis ausgeben und gegen das im Auftrag genannte Zielverzeichnis prüfen. Bei Abweichung: abbrechen, melden, nichts ändern.

Zielverzeichnis: Repo DerStefan89/ai-workforce, Branch
`feature/f1-checkpoint-store` (von `main` abgeleitet, vor Ausführung mit
Stefan bestätigen).

## TASK: f1-checkpoint-store

GOAL: Ein Modul unter `src/checkpoint-store/` persistiert einen
Checkpoint für einen gegebenen `lauf_id` vollständig, lädt ihn danach,
validiert die gesamte gespeicherte Kette und bestimmt daraus den
zuletzt gültigen Checkpoint — real durchspielbar mit einem simulierten
Prozessabbruch (AC10), nicht nur in Prosa behauptet. Die
Akzeptanzkriterien A1–A18 aus `state/plan-v2-feature1-checkpoint-store.md`
(plan-v1 + Delta 1–4) sind erfüllt.

CONTEXT:
- [Fakt] Vollständiger Plan: `state/plan-v2-feature1-checkpoint-store.md`
  (Delta zu `state/plan-v1-feature1-checkpoint-store.md`, der
  unverändert stehen bleibt und für alle nicht in plan-v2 erwähnten
  Abschnitte weiterhin gilt — SCOPE 1, 2, 4–6, 8–12, NICHT, D1–D6,
  A1–A3, A6–A9, A12, A14–A18, Rollen, Budget). Dieser Vertrag ist eine
  Ausführungsanweisung dazu; bei Widerspruch gilt plan-v2, bei dessen
  Schweigen plan-v1.
- [Fakt] Advisor-Urteil zu plan-v1: FREIGEGEBEN MIT HINWEISEN, siehe
  `state/advisor-findings-feature1-checkpoint-store.md`. B1/B2/B5 sind in
  plan-v2 aufgelöst (kein erneuter Advisor-Pass nötig). B3 ist bestätigt,
  unverändert. B4 ist per Nachtrag gelöst (Option B, siehe unten). B6
  ist ein späterer, eigenständiger Nachtrag außerhalb des ursprünglichen
  Advisor-Passes, per Statusprüfung 2026-08-29 nachgezogen (plan-v2
  Delta 4, SCOPE.4 unten) — kein erneuter Advisor-Pass nötig.
- [Fakt] Feature-Akte: `features/F1/feature.md`, `Status: READY_FOR_TECH`,
  bereits mit dieser Sitzung auf den B1/B5-Wortlaut korrigiert (kein
  „F-020"-Bezug mehr, „Abschnitt 16.2 Modulschnitt" statt „Rollen-
  Tabelle"). Ziel/Scope/Nicht-Ziele/Akzeptanzkriterien dort sind die
  Produktsicht; plan-v2 ist die technische Ausprägung. Bei Widerspruch
  gilt `features/F1/feature.md` für WAS, plan-v2/plan-v1 für WIE.
- [Fakt] Dependency erfüllt: F0 (Datenformate), gemergt (PR #18) —
  liefert `kontrollzustand/`, `profiles/`, die Kontrollzustand-Hülle
  (`schemas/kontrollzustand.schema.json`: `schema_version`, `typ`,
  `profil_referenz{pfad,hash,version}`, optional offenes `payload`,
  `additionalProperties: false` auf beiden betroffenen Ebenen) und
  `scripts/check-datenformate.mjs` als Analogiemuster für Validierung.
  Keine Änderung an F0s Dateien in diesem Vertrag.
- [Fakt] Referenzmuster für das Gate-Skript: `scripts/check-datenformate.mjs`
  (Validierungsfunktionen, `existsSync`-Check, `befunde`-Array + Exit 1
  bei Funden, Exit 0 bei „0 Dateien geprüft"). Abweichung zu F0s D5
  (plan-v1 D5, bewusst): `check-checkpoint-store.mjs` importiert
  `validiereCheckpointEintrag` und `ladeLetztenGueltigenCheckpoint`
  direkt aus `src/checkpoint-store/` statt die Regeln ein zweites Mal
  von Hand nachzubauen — strip-only Node erlaubt den Import ohne
  Build-Schritt.
- [Fakt] Kein `ajv`, keine neue Dependency (plan-v1 D6, Fortführung
  F0-D5) — Handschrift-Validierung wie in `check-datenformate.mjs`.
- [Fakt] Kanonische Serialisierung für `selbst_hash` UND für die
  tatsächlich geschriebene Datei: Objektschlüssel sortiert, UTF-8,
  LF-only, keine abschließende Leerzeile, `payload.selbst_hash` vor dem
  Hashen entfernt (plan-v1 Abschnitt 5).
- [Fakt] Speicherstruktur: `kontrollzustand/<lauf_id>/checkpoints/
  <sequenz>-<selbst_hash>.json`, ein File pro Checkpoint, kein
  Zeiger-/Index-Artefakt (plan-v1 SCOPE.4, D1).
- [Fakt] `lauf_id` ist ein opaker Aufrufer-Parameter (plan-v1 D2) — nur
  auf dateisystem-Sicherheit geprüft (keine `/`, `..`, Steuerzeichen),
  keine Lauf-Lebenszyklus-Semantik in diesem Modul.
- [Fakt] Kettenprüfung: vollständiger Rückwärtslauf ab dem höchsten
  `sequenz`-Wert bis zu einer durchgehend gültigen Kette (plan-v1 D3,
  Advisor-Befund B3 bestätigt diese Auslegung von AC5).
- [Fakt] B2-Delta (plan-v2 Delta 2): `src/checkpoint-store/
  checkpoint-store.test.ts` mit vier `node:test`-Fällen deckt A4 (AC1,
  Rundlauf-Identität), A5 (AC2/AC3, abgebrochene Persistierung — Kern-
  Garantie D2, echter simulierter Abbruch: Temp-Datei ohne `rename()`,
  kein bloßer Behauptungstest), A10 (AC8, Trennung Kontrollzustand/
  Produktdateien) und A11 (AC9, strukturierte Ereigniszeile pro
  Vorgang) ab — je mit einem im Plan konkret beschriebenen kalibrierten
  Rot-/Grün-Fall. `node --test` ist bereits Teil von `npm run check`
  (`package.json:15`); die neue Testdatei braucht keinen zusätzlichen
  Eintrag in `package.json`.
- [Fakt, B6 gelöst — Nachtrag 2026-08-29] plan-v2 Delta 4 ergänzt
  `checkpoint-store.test.ts` um einen fünften Testfall: ein Checkpoint
  mit korrektem Ziel-Dateinamen, dessen Inhalt manipuliert wurde
  (`payload.daten` geändert UND `payload.selbst_hash` im Inhalt korrekt
  auf den neuen Hash nachgezogen — intern also konsistent), muss von
  `ladeLetztenGueltigenCheckpoint` trotzdem abgelehnt werden, weil der
  im Dateinamen kodierte Hash nicht mehr zum real errechneten
  Inhalts-Hash passt. Design-Konsequenz: `ladeLetztenGueltigenCheckpoint`
  braucht zusätzlich zur internen Selbst-Hash-Rückrechnung (plan-v1
  SCOPE.3) einen Abgleich Dateiname-Hash gegen real errechneten
  Inhalts-Hash. Real mit einer Wegwerf-Diagnose bestätigt (außerhalb
  des Repos, nicht committet): eine reine interne Konsistenzprüfung
  hätte den manipulierten Checkpoint fälschlich akzeptiert — Details
  und Wortlaut der Ausgabe in plan-v2 Delta 4.
- [Fakt] `package.json` `check` und `check:template` sind zwei
  unabhängige Skript-Strings (F0-Delta-2-Muster) —
  `check-checkpoint-store.mjs` einzeln in beide eintragen.
- [Fakt] Gültige `Status`-Werte laut `docs/projekt/zielfassung.md` §6:
  `ENTWURF, READY_FOR_TECH, WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT,
  FEATURE_GATE, ABGESCHLOSSEN, BLOCKIERT, ABGEBROCHEN`.
- [Fakt] `state/memory-map.md` weist eigene Zeilen für Schema- und
  Modul-Artefakte aus (F0-Muster) — hier zwei neue Zeilen (Payload-
  Schema, Checkpoint-Store-Modul), siehe SCOPE.9.
- [Fakt, B4 gelöst — Nachtrag 2026-08-29, Option B] Stefans Entscheidung
  zum Windows-Rename-Atomaritätsnachweis (plan-v1 SCOPE.8, D4), ersetzt
  den bisherigen offenen Klärungsabschnitt:
  - **Umfang:** wenige hundert Zyklen Rename-Wiederholung.
  - **Störfaktor:** während eines Teils der Zyklen ein offenes
    Read-Handle auf die Zieldatei simulieren (typisches Virenscanner-/
    Backup-Verhalten), erwarteten Fehlerfall `EPERM`/`EBUSY` prüfen und
    zählen.
  - **Ort:** eigenes Skript `scripts/verify-rename-atomicity.mjs`
    (SCOPE.11 unten), unabhängig von `src/checkpoint-store/` (das Modul
    existiert zum Zeitpunkt dieses Nachweises noch nicht) — prüft die
    Windows-Dateisystem-Primitive selbst, nicht den späteren Modulcode.
  - **Ausführung:** einmaliger manueller Lauf auf Windows, kein
    Windows-CI, kein Dauerbetrieb, kein Einhängen in `npm run check`/
    `check:template` (D4-Begründung Timing-Flakiness gilt unverändert).
  - **Ergebnis:** als Kalibrierungslog-Eintrag in `state/gates.md`
    dokumentieren, gleiches Muster wie die bestehenden Rot-/Grün-Fall-
    Einträge dort.

SCOPE:
1. `schemas/kontrollzustand-checkpoint-payload.schema.json` — Payload-
   Schema für `typ: "checkpoint"` (plan-v1 SCOPE.1): `lauf_id` (String,
   nicht leer), `sequenz` (Integer ≥ 1), `vorgaenger_hash` (String
   `minLength: 64` oder `null`, nur bei `sequenz: 1`), `selbst_hash`
   (String, `minLength: 64`), `daten` (optional, offen).
   `additionalProperties: false`. Nicht in
   `schemas/kontrollzustand.schema.json` eingehängt (F0 bleibt
   unverändert).
2. `schemas/examples/` — vier Beispiele (plan-v1 SCOPE.2):
   `kontrollzustand-checkpoint.valid.json`,
   `kontrollzustand-checkpoint.invalid-fehlende-sequenz.json`,
   `kontrollzustand-checkpoint.invalid-hash-mismatch.json`,
   `kontrollzustand-checkpoint.invalid-vorgaenger-bei-sequenz-1.json`.
   `selbst_hash` im `valid`-Beispiel real berechnet, nicht erfunden.
3. `src/checkpoint-store/` — Modul, typisiert, kein `any`:
   - `schreibeCheckpoint(laufId, profilReferenz, daten)`
   - `ladeLetztenGueltigenCheckpoint(laufId)` — `null` bei keinem
     gültigen Checkpoint, nie eine Ausnahme für diesen Fall.
   - `validiereCheckpointEintrag(eintrag)` — reine Funktion,
     Verstoßliste (leer = gültig).
   - `atomarSchreiben(zielpfad, inhalt)` — Temp-Datei + `rename()`,
     Windows-Retry bei transientem `EPERM`/`EBUSY`.
4. `src/checkpoint-store/checkpoint-store.test.ts` — fünf `node:test`-
   Fälle: die vier aus plan-v2 Delta 2, Punkte 1–4 wörtlich
   (Rundlauf-Identität, abgebrochene Persistierung, Trennung
   Kontrollzustand/Produktdateien, strukturierte Ereigniszeile), plus
   der fünfte aus Delta 4 (B6, Dateiname-Inhalt-Hash-Konsistenz —
   manipulierter, aber intern konsistent nachgezogener Checkpoint-Inhalt
   unter unverändertem Dateinamen muss abgelehnt werden). Jeder Fall
   arbeitet auf einem Wegwerfverzeichnis unter `kontrollzustand-test/`,
   räumt im `after`-Hook auf.
5. Strukturierte Laufausgabe (plan-v1 SCOPE.6): Ereigniszeilen
   `checkpoint_geschrieben`, `checkpoint_geladen`,
   `checkpoint_validierungsfehler`, `checkpoint_kein_gueltiger_gefunden`,
   Schreiber austauschbar (Default `console.log`, Testparameter für
   SCOPE.4 oben).
6. `scripts/check-checkpoint-store.mjs` — Gate-Skript, importiert
   `validiereCheckpointEintrag`/`ladeLetztenGueltigenCheckpoint` aus
   `src/checkpoint-store/` (plan-v1 SCOPE.7, D5). Prüft: (a) vier
   Payload-Fixtures, (b) synthetischer Drei-Checkpoint-Lauf (gültig vs.
   Checkpoint 3 korrumpiert → Checkpoint 2 erwartet), (c) leere Kette →
   `null`. Eingehängt in `npm run check` UND `npm run check:template`
   (je einzeln eintragen, F0-Delta-2-Muster).
7. `state/gates.md` — neue Tabellenzeile `check-checkpoint-store.mjs`
   (Muster: Datenformate-Gate-Zeile), Rot-/Grün-Beleg erst nach dem
   realen Lauf eintragen. Zusätzlich ein eigener Kalibrierungslog-
   Eintrag für `scripts/verify-rename-atomicity.mjs` (SCOPE.11) mit dem
   echten Lauf-Ergebnis (Zyklenzahl, gezählte `EPERM`/`EBUSY`-Fälle,
   Leser-Ergebnis).
8. `state/memory-map.md` — zwei neue Zeilen: „Checkpoint-Payload-Schema"
   → `schemas/kontrollzustand-checkpoint-payload.schema.json` +
   `schemas/examples/kontrollzustand-checkpoint*`, „nicht hierhin": nicht
   in `schemas/kontrollzustand.schema.json`. „Checkpoint-Store-Modul" →
   `src/checkpoint-store/`, „nicht hierhin": keine Ausführungslogik.
9. `docs/STATUS.md` — Eintrag unter „Erledigt": Checkpoint Store
   (Schreiben, Laden, Validierung, Hash-Kette, Gate) umgesetzt. Windows-
   Rename-Nachweis ausdrücklich als offen benennen, nicht als erledigt
   auflisten.
10. `features/F1/journal.md` anlegen (Muster `features/F0/journal.md`):
    Nachträge für Coach-Output, Challenge, plan-v1, Advisor-Pass,
    plan-v2, dieser Vertrag.
11. `scripts/verify-rename-atomicity.mjs` (löst B4, Nachtrag
    2026-08-29): eigenständiges Node-Skript, kein Test-Framework nötig.
    Wiederholt einen Temp-Datei-Schreib-plus-Rename-Zyklus einige
    hundert Male auf einem Wegwerfverzeichnis; während eines Teils der
    Zyklen wird ein offenes Read-Handle auf die Zieldatei gehalten
    (simulierter Virenscanner-/Backup-Lock), `EPERM`/`EBUSY`-Fälle
    werden gezählt und ausgegeben. Ein unabhängiger, gleichzeitig
    lesender Prozess prüft während der gesamten Laufzeit, ob er je eine
    leere oder unvollständige Zieldatei sieht (der eigentliche
    Atomaritätsnachweis aus D4). Exit 0 = kein Leser sah je eine
    leere/unvollständige Datei; Exit 1 = doch. **Nicht** in `npm run
    check`/`check:template` eingehängt (Ausführung: einmaliger manueller
    Lauf auf Windows). Ergebnis als neuer Kalibrierungslog-Eintrag in
    `state/gates.md`.

NICHT:
- `scripts/verify-rename-atomicity.mjs` automatisch in `npm run check`
  oder `check:template` einhängen — bleibt manueller, plattform-
  abhängiger Einzelnachweis, kein Standard-Gate (Stefans Entscheidung,
  Nachtrag 2026-08-29).
- Windows-CI oder ein Dauerbetrieb für diesen Nachweis — ein einmaliger
  manueller Lauf genügt laut Stefans Entscheidung.
- Wirkungsmarke-Typ, -Schema, -Logik.
- Execution Controller, jede Orchestrierungs- oder
  Übergangslogik, die einen Checkpoint auslöst.
- Automatische Wiederaufnahme/Neustart.
- Änderung von `schemas/kontrollzustand.schema.json` oder
  `scripts/check-datenformate.mjs` (F0, gemergt).
- Ein Zeiger-/Index-Artefakt, das „aktueller Checkpoint" behauptet.
- Lauf-ID-Vergabe, -Lebenszyklus oder -Validierungsregeln über
  „nicht-leerer, dateisystem-sicherer String" hinaus.
- Bereinigung/Archivierung alter Checkpoints.
- `git add`/`git commit` im Schreibpfad.
- `ajv` oder ein anderer generischer JSON-Schema-Validator.

BUDGET: Ein Baudurchgang plus höchstens eine Korrekturrunde. Zweites Rot
auf demselben Gate ⇒ BLOCKIERT ⇒ Mensch.

OUTPUT:
- Neue Dateien: `schemas/kontrollzustand-checkpoint-payload.schema.json`,
  `schemas/examples/kontrollzustand-checkpoint*.json` (4 Dateien),
  `src/checkpoint-store/*.ts` (Modul + `checkpoint-store.test.ts`),
  `scripts/check-checkpoint-store.mjs`,
  `scripts/verify-rename-atomicity.mjs`, `features/F1/journal.md`.
- Geänderte Dateien: `package.json` (`check` und `check:template`),
  `state/gates.md`, `state/memory-map.md`, `docs/STATUS.md`.
- Beleg: `npm run check` und `npm run check:template` grün, Konsolen-
  Ausgabe im Bericht zeigen. Kalibrierungstest für das Gate-Skript: die
  vier Payload-Fixtures (Rot für jedes Invalid-Beispiel, benannte
  Regelverletzung), den korrumpierten Drei-Checkpoint-Lauf (Checkpoint 2
  statt 3 oder `null`), die leere Kette (`null`, kein Fehler) — danach
  Grün-Zustand wiederherstellen. Kalibrierungstest für
  `checkpoint-store.test.ts`: für jeden der fünf Testfälle (vier aus
  Delta 2, einer aus Delta 4/B6) den im Plan beschriebenen Rot-Fall real
  auslösen (temporäre Codeänderung), Fehlschlag zeigen, Änderung
  zurücknehmen, Grün-Zustand zeigen.
- Commit ausschließlich mit expliziten Pfaden (nie `-A`/`.`), `git-flow`-
  Skill nutzen, kein Commit ohne frische `state/freigabe-commit.md`,
  Push separat autorisiert.
- Bericht: was geändert wurde, welche Checks liefen (inkl. aller neun
  Rot-/Grün-Kalibrierungen: 4 Gate-Fixtures + 5 Testfälle, plus das
  reale Ergebnis von `scripts/verify-rename-atomicity.mjs`), Ergebnis,
  echte Blocker.

ESCALATE:
- `state/plan-v2-feature1-checkpoint-store.md` fehlt oder widerspricht
  diesem Vertrag → abbrechen, melden, nichts anlegen.
- Einer der neun Kalibrierungstests (4 Gate-Fixtures + 5 `node:test`-
  Rot-Fälle, davon einer aus Delta 4/B6) reproduziert sich nicht wie in
  plan-v2 Delta 2/4 beschrieben → anhalten, welcher Fall betrifft es,
  was tatsächlich passierte, melden. Nicht das Skript/den Test so lange
  anpassen, bis irgendein Fehler auftritt.
- `scripts/verify-rename-atomicity.mjs` meldet Exit 1 (ein Leser sah
  eine leere/unvollständige Zieldatei) → nicht stillschweigend als
  bekannte Windows-Einschränkung glätten, real melden, welcher Zyklus
  betroffen war. Läuft die Sitzung nicht auf Windows, das Skript zwar
  bauen, aber den Lauf als nicht durchführbar benennen statt ein
  Ergebnis zu behaupten.
- `npm run check` wird rot an einem Glied, das dieser Auftrag nicht
  angefasst hat → anhalten und melden. Kein Nachziehen fremder Stellen.
- Eine der vorgegebenen Formulierungen (SCOPE/AK) widerspricht
  `features/F1/feature.md` oder `docs/projekt/zielfassung.md` → anhalten,
  beide Stellen zitieren, melden. Nicht selbst entscheiden, welche gilt.
- `git commit` oder `git push` wird ohne frische Freigabedatei verlangt
  → nicht ausführen.

Vertrag endet mit Freigabe-Halt: kein Bau, kein Commit, kein Push in
diesem Schritt. Ausführung erst nach Stefans expliziter, frischer
Freigabe.
