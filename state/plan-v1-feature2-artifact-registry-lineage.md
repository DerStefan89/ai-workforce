# Plan v1 — Feature 2: Artifact Registry / Lineage

Slug: feature2-artifact-registry-lineage
Stand: 2026-08-29
Rolle: Planner (Claude-Code-Sitzung, Repo-Zugriff)
Grundlage: Feature-Akte v0 (Ziel/Scope/Nicht-Ziele/AC1–14), Challenge bereits
abgeschlossen (keine Verstöße gegen A7/A8/103/104/§11 „Nicht bauen", kein
Scope-Delta) — beide im Auftrag dieser Sitzung im Volltext enthalten, nicht
nur referenziert.

## 0. Verifikation (F-013-Muster — nicht annehmen, prüfen)

- **`origin/main` real geholt und geprüft, nicht angenommen:** `git fetch
  origin main` → `bf55dad..fa51a61`, `git rev-parse origin/main` liefert
  exakt `fa51a61e0d80f4e6388571b7c8bb136cf193693e` — deckt sich mit dem
  Ziel-HEAD des Auftrags. `git ls-tree -r origin/main --name-only | grep
  '^src/checkpoint-store/'` bestätigt real: `index.ts`, `types.ts`,
  `checkpoint-store.test.ts` vorhanden. F1 ist damit kein Versprechen,
  sondern real gemergter Code — Blocker aus einem früheren Anlauf dieser
  Aufgabe (F1 fehlte im damaligen Repo-Stand) ist aufgelöst.
- **F1-Modul real gelesen, nicht aus dem plan-v1-Text von F1 übernommen:**
  `src/checkpoint-store/index.ts` und `types.ts` vollständig gelesen.
  Wichtig für dieses Feature: `kanonischesJson` und `sha256Hex` sind aus
  `src/checkpoint-store/index.ts` **bereits exportiert** (Zeilen 56–62),
  `atomarSchreiben` dagegen **nicht** (Zeile 198, keine `export`-Angabe) —
  relevant für Design-Entscheidung D5 unten.
- **`ARCHITECTURE.md:27` real geprüft:** `kontrollzustand/` wird dort
  wörtlich beschrieben als Ablage für „Checkpoints, Wirkungsmarken,
  **Artefakt- und Lineage-Einträge**, Transportpakete, wegwerfbarer Index".
  Das liest sich als zwei getrennte Begriffe (Artefakt-Einträge, Lineage-
  Einträge). Dagegen steht `schemas/kontrollzustand.schema.json:38`, real
  gelesen: der `payload`-Erweiterungspunkt nennt als vorgesehene
  Unterarten „Checkpoint, Wirkungsmarke, **Lineage**, Transportpaket" —
  ein einziges, bereits committetes Wort für die gesamte Rolle „Artifact
  Registry / Lineage". Dieser Plan löst den scheinbaren Widerspruch, indem
  er sich an die bereits committete, maschinell wirksame Quelle hält
  (Schema-Kommentar, ein `typ`-Wert `"lineage"`) und die ARCHITECTURE.md-
  Formulierung als beschreibende Prosa liest, die zwei Aspekte **eines**
  Eintragstyps benennt (ein Lineage-Eintrag beschreibt sowohl ein Artefakt
  als auch seine Herkunft/Bezüge), nicht zwei `typ`-Werte. Siehe D1 und
  Offener Punkt 1 — zur Bestätigung im Advisor-Pass, da diese Lesart die
  gesamte Schema-Form dieses Features bestimmt.
- **`docs/projekt/zielfassung.md` real geprüft:** Zeile 330 (Rollentabelle)
  bestätigt A7 wörtlich; Zeile 372 bestätigt A7 ein zweites Mal in der
  Entscheidungsliste; Zeile 378 bestätigt A8; Zeile 141 bestätigt
  Entscheidung 103 und 104 wörtlich („Staleness … geänderter zitierter
  Bereich → STALE, konservativ. Am STALE-Artefakt entscheidet der Mensch:
  neu erzeugen · Nachtrag · unverändert gültig"). Keine Abweichung
  zwischen Auftragstext und Repo-Quelle gefunden.
- **`ARCHITECTURE.md:81` real geprüft:** „Überschreiben eines
  persistierten Artefakts" ist verbotenes Pattern, ausnahmslos — gilt
  für **jeden** Kontrollzustand-Eintrag, nicht nur Checkpoints. Bindet
  auch die STALE-Entscheidung (Entscheidung 104) unten: Sie darf keinen
  bestehenden Lineage-Eintrag verändern, nur einen neuen anlegen.
- **`features/F2/` existiert nicht im Repo.** Dieser Plan legt keine
  Feature-Akte an (Auftrag: „kein Produktcode, kein Bau", Output ist
  ausschließlich dieser plan-v1) — Feature-Akte-Erstellung ist ein
  Folgeschritt (Abschnitt 9), analog dazu, dass F1s `features/F1/
  feature.md` ebenfalls erst im Zuge des Bau-Vertrags entstand, nicht in
  dessen plan-v1.
- **`src/` ist nicht mehr leer** (anders als bei F1s Verifikation) —
  `src/checkpoint-store/` existiert real. Dieses Feature legt einen
  zweiten, unabhängigen Ordner unter `src/` an, keine Änderung an F1s
  Verhalten außer der unten begründeten Ein-Zeilen-Export-Ergänzung (D5).

## 1. Ziel (prüfbar)

Ein Modul unter `src/lineage-registry/` kann ein kern-erzeugtes
Kontrollartefakt mit eigener, inhaltsadressierter Identität sowie ein
werkzeug-erzeugtes Artefakt als reine Referenz registrieren, für ein
abgeleitetes Artefakt seine verwendeten Eingaben festhalten, mechanisch
prüfen, ob sich der Inhalt einer referenzierten Eingabe seit der
Registrierung geändert hat, und eine daraufhin getroffene menschliche
Entscheidung (neu erzeugen / Nachtrag / unverändert gültig mit Begründung)
unveränderlich festhalten — real durchspielbar mit einem Fall, in dem ein
zitierter Eingabebereich nachträglich verändert wird (AC14), nicht nur in
Prosa behauptet.

## 2. SCOPE

1. **`schemas/kontrollzustand-lineage-payload.schema.json`** — neues
   Payload-Schema für `typ: "lineage"`. Bewusst **nicht** in
   `schemas/kontrollzustand.schema.json` eingehängt (F0, gemergt) —
   gleiches Muster wie F1s Checkpoint-Payload-Schema (D5 aus F1, hier
   fortgeführt). Ein Eintrag ist entweder ein **Artefakt-Eintrag**
   (`art: "artefakt_version"`) oder eine **STALE-Entscheidung**
   (`art: "stale_entscheidung"`) — siehe D1 zur Begründung eines einzigen
   `typ`-Werts mit Unterscheidung über `art` statt zweier `typ`-Werte.

   Pflichtfelder bei `art: "artefakt_version"`:
   - `artefakt_id` (String, nicht leer, dateisystem-sicher — identische
     Prüfregel wie F1s `lauf_id`, siehe D2) — vom Aufrufer vergebener,
     opaker Bezeichner für das konzeptuelle Artefakt über alle Versionen
     hinweg. Registry erzeugt oder interpretiert ihn nicht.
   - `version_sequenz` (Integer ≥ 1) — fortlaufende Position innerhalb
     der Versionen dieser `artefakt_id`. **Kein** `vorgaenger_hash`-Feld
     wie bei F1s Checkpoints — siehe D3 (bewusster Verzicht auf eine
     Hash-Kette, YAGNI).
   - `erzeugungsart` (`"kern"` oder `"werkzeug"`) — bestimmt, welche der
     folgenden Feldgruppen zulässig/pflichtig sind (A7).
   - `inhalts_hash` (String, `minLength: 64`) — SHA-256 (hex). Bei
     `erzeugungsart: "kern"` über `payload.daten` (kanonisch serialisiert,
     `kanonischesJson`+`sha256Hex` aus F1 wiederverwendet, siehe D5). Bei
     `erzeugungsart: "werkzeug"` über den vom Aufrufer als String
     gelieferten Inhalt des zitierten Bereichs — die Registry liest
     niemals selbst eine Datei, siehe D4.
   - `herkunft` (offen, Aufrufer-definiert, z. B. `{ ersteller, hinweis }`)
     — Registry liest diesen Inhalt nicht, kopiert ihn nur unverändert mit
     (AC1).
   - `eingaben` (optional, Array) — Pflicht, sobald das Artefakt
     abgeleitet ist (AC5); leer/fehlend bei Wurzelartefakten ohne
     Eingaben. Jedes Element:
     `{ pfad: string, zitierter_bereich: string, inhalts_hash: string }`
     — eine Referenz auf einen externen Inhalt (Datei im Produktbaum,
     Spec, ein anderer Lineage-Eintrag über dessen `pfad`, o. ä.). Kein
     eigener Unterschema-Zweig für „Referenz auf einen anderen
     Lineage-Eintrag" — ein solcher Verweis ist einfach ein `pfad`, der
     auf die Lineage-Eintragsdatei selbst zeigt; die Registry behandelt
     jede Eingabe strukturell gleich (kein Sonderfall, kein
     Abhängigkeitsgraph über typisierte Kanten, siehe §3).
   - Nur bei `erzeugungsart: "kern"` zulässig: `daten` (optional, offen)
     — der eigentliche Artefaktinhalt, nicht interpretiert (analog F1s
     `daten`).
   - Nur bei `erzeugungsart: "werkzeug"` **pflichtig**, und `daten` dabei
     **verboten** (strukturelle Prüfregel, deckt AC2 „ohne
     Inhalts-Duplikat"): `pfad` (String, nicht leer) — Ort des
     referenzierten Artefakts; `zitierter_bereich` (String, nicht leer)
     — opaker Bereichsbezeichner (Zeilenbereich, Abschnittsname,
     „gesamte Datei" o. ä.), von der Registry nicht ausgewertet, nur
     gespeichert und beim STALE-Vergleich als Schlüssel verwendet.

   Pflichtfelder bei `art: "stale_entscheidung"`:
   - `artefakt_id`, `bezieht_sich_auf` (`{ version_sequenz: integer }`,
     `artefakt_id` ist implizit dieselbe wie im Eintrag) — welche Version
     die Entscheidung betrifft.
   - `entscheidung` (`"neu_erzeugen"` | `"nachtrag"` |
     `"unveraendert_gueltig"`).
   - `begruendung` (String) — **Pflicht**, wenn `entscheidung ==
     "unveraendert_gueltig"` (AC12), sonst optional.
   - `betroffene_eingaben` (Array von Strings — die `pfad`/
     `zitierter_bereich`-Schlüssel der Eingaben, die die vorangegangene
     `pruefeStale`-Prüfung als geändert erkannt hat) — bindet die
     Entscheidung nachvollziehbar an den konkreten STALE-Befund (AC12).
   `additionalProperties: false` auf beiden `art`-Varianten, analog zur
   F0-Hülle und F1s Payload-Konvention.

2. **`schemas/examples/`** — sieben neue Beispiele (analog F1s
   Vier-Beispiel-Konvention, hier mehr Fälle wegen zweier `art`-Varianten
   und zweier `erzeugungsart`-Varianten):
   - `kontrollzustand-lineage-kern.valid.json` — `art:
     "artefakt_version"`, `erzeugungsart: "kern"`, `daten` gesetzt,
     `inhalts_hash` real berechnet.
   - `kontrollzustand-lineage-werkzeug.valid.json` — `art:
     "artefakt_version"`, `erzeugungsart: "werkzeug"`, `pfad` +
     `zitierter_bereich` gesetzt, kein `daten`-Feld.
   - `kontrollzustand-lineage-entscheidung.valid.json` — `art:
     "stale_entscheidung"`, `entscheidung: "unveraendert_gueltig"` mit
     `begruendung`.
   - `kontrollzustand-lineage.invalid-fehlende-artefakt-id.json`
   - `kontrollzustand-lineage.invalid-hash-mismatch.json` — `inhalts_hash`
     weicht vom real berechneten Hash ab.
   - `kontrollzustand-lineage.invalid-daten-bei-werkzeug.json` —
     `erzeugungsart: "werkzeug"` **mit** gesetztem `daten`-Feld (prüft die
     strukturelle AC2-Regel, nicht nur Pflichtfeld-Präsenz).
   - `kontrollzustand-lineage.invalid-entscheidung-ohne-begruendung.json`
     — `entscheidung: "unveraendert_gueltig"` ohne `begruendung` (prüft
     AC12).

3. **`src/lineage-registry/`** — das eigentliche Modul, typisiert, kein
   `any`. Öffentliche Funktionen (Namen vorläufig, Verhalten ist das
   Vertragsobjekt):
   - `registriereKernArtefakt(artefaktId, herkunft, daten, eingaben?,
     optionen?)` — ermittelt die nächste `version_sequenz` aus dem
     aktuellen Stand von `artefaktId` (leere Historie ⇒ 1), berechnet
     `inhalts_hash` über `daten`, schreibt atomar unter
     `<basisVerzeichnis>/<artefakt_id>/lineage/<version_sequenz>-
     <inhalts_hash>.json`, protokolliert `lineage_registriert`. Gibt
     Pfad, `versionSequenz`, `inhaltsHash` zurück. Deckt AC1.
   - `registriereWerkzeugReferenz(artefaktId, pfad, zitierterBereich,
     inhalt, herkunft?, eingaben?, optionen?)` — wie oben, aber
     `erzeugungsart: "werkzeug"`, `inhalts_hash` über den vom Aufrufer
     gelieferten `inhalt`-String (nicht über eine selbst gelesene Datei,
     D4), kein `daten`-Feld im geschriebenen Eintrag. Deckt AC2.
   - `ladeArtefaktVersion(artefaktId, versionSequenz?, optionen?)` — lädt
     eine bestimmte Version oder (ohne `versionSequenz`) die höchste
     vorhandene; liefert den validierten Eintrag oder `null`, kein Wurf
     für „nicht gefunden" (D10-Muster aus F1). **Keine**
     Ketten-Rückwärtsprüfung wie F1s `ladeLetztenGueltigenCheckpoint` —
     kein AC verlangt Korruptionsresistenz über mehrere Versionen hinweg
     (siehe D3). Deckt AC13 zusammen mit `listeVersionen`.
   - `listeVersionen(artefaktId, optionen?)` — alle validen Versionen
     aufsteigend nach `version_sequenz`, mit demselben Rückgabetyp.
     Deckt AC3/AC4 (Nachweis, dass ältere Versionen unverändert
     nebeneinander bestehen bleiben) und AC13.
   - `pruefeStale(artefaktId, versionSequenz, aktuelleEingabeInhalte,
     optionen?)` — lädt die Version, iteriert über `payload.eingaben`,
     vergleicht für jede den gespeicherten `inhalts_hash` mit einem neu
     aus dem vom Aufrufer für denselben Schlüssel (`pfad` +
     `zitierter_bereich`) gelieferten Inhalt berechneten Hash. Liefert
     `{ stale: boolean, geaenderteEingaben: string[] }`. Rein mechanischer
     Vergleich, keine Bedeutungsprüfung (Entscheidung 103, AC9) — die
     Registry liest nie selbst eine Datei oder einen Bereich, das bleibt
     Aufrufer-Verantwortung (D4); dadurch strukturell garantiert, dass
     eine Änderung außerhalb des zitierten Bereichs nie in die Prüfung
     einfließt (AC8), weil sie der Registry schlicht nie mitgeteilt wird.
     Deckt AC6/AC7/AC8/AC9/AC14.
   - `haltFestStaleEntscheidung(artefaktId, versionSequenz, entscheidung,
     begruendung?, betroffeneEingaben?, optionen?)` — validiert
     `begruendung`-Pflicht bei `"unveraendert_gueltig"`, ermittelt die
     nächste laufende Nummer der Entscheidungen zu `artefaktId`, schreibt
     atomar unter `<basisVerzeichnis>/<artefakt_id>/
     lineage-entscheidungen/<laufende_nr>-<selbst_hash>.json`,
     protokolliert `lineage_entscheidung_festgehalten`. Verändert nie den
     ursprünglichen Artefakt-Eintrag (A8/ARCHITECTURE.md:81). Deckt
     AC11/AC12.
   - `validiereLineageEintrag(eintrag)` — reine Funktion, Hülle (F0) +
     Payload-Pflichtfelder je `art`/`erzeugungsart` + Hash-Rückrechnung.
     Rückgabe: Verstoßliste, analog F1s `validiereCheckpointEintrag`.

   Kein `ajv`, keine neue Dependency (Fortführung von F0s D5/F1s D6).

4. **Wiederverwendung aus F1, statt Duplikat (D5):** `src/checkpoint-
   store/index.ts` erhält eine Ein-Zeilen-Ergänzung — `atomarSchreiben`
   bekommt das `export`-Schlüsselwort (Zeile 198 laut aktuellem Stand),
   Verhalten unverändert, keine neue Testpflicht (reine Sichtbarkeits-
   änderung an bereits getesteter Funktion). `src/lineage-registry/`
   importiert `kanonischesJson`, `sha256Hex` und `atomarSchreiben`
   direkt aus `../checkpoint-store/index.ts`, statt Kanonisierung/Hash/
   atomares Schreiben ein zweites Mal zu implementieren. Begründung
   und Alternative-Abwägung siehe D5.

5. **Speicherstruktur** — `kontrollzustand/<artefakt_id>/lineage/
   <version_sequenz>-<inhalts_hash>.json` für Artefakt-Einträge,
   `kontrollzustand/<artefakt_id>/lineage-entscheidungen/
   <laufende_nr>-<selbst_hash>.json` für STALE-Entscheidungen. Struktur
   und Begründung (ein File pro Version/Entscheidung, kein Index-
   Artefakt, kein Überschreiben) sind wörtlich F1s SCOPE.4-Argumentation
   übertragen — siehe D3, D6.

6. **Kanonische Serialisierung** — identisch zu F1 (wiederverwendete
   Funktion, kein zweites Regelwerk): sortierte Schlüssel, UTF-8, LF-only.

7. **Strukturierte Laufausgabe** — eine Ereigniszeile je Vorgang:
   `lineage_registriert`, `lineage_geladen`,
   `lineage_kein_gueltiger_gefunden`, `lineage_validierungsfehler` (mit
   Verstoßliste), `lineage_stale_geprueft` (mit `stale`,
   `geaenderte_eingaben`), `lineage_entscheidung_festgehalten`. Jede
   Zeile trägt mindestens `ereignis`, `artefakt_id`, `zeitstempel`
   (ISO-8601), vorgangsspezifisch `version_sequenz`/`pfad`/`verstoesse`/
   `stale`/`geaenderte_eingaben`.

8. **`scripts/check-lineage-registry.mjs`** — neues Gate-Skript, Muster
   wie `check-checkpoint-store.mjs`: importiert
   `validiereLineageEintrag` und `pruefeStale` direkt aus
   `src/lineage-registry/` (D5-Fortführung, kein zweiter Regelsatz).
   Prüft:
   a. Die sieben neuen Beispieldateien gegen `validiereLineageEintrag`
      (Grün-/Rot-Fälle wie SCOPE.2 beschrieben).
   b. Einen synthetischen Lauf: `registriereKernArtefakt` mit einer
      Eingabe (`pfad`/`zitierter_bereich`/`inhalts_hash` über den
      String `"ABC"`), danach `pruefeStale` mit demselben Inhalt `"ABC"`
      ⇒ `stale: false`; danach `pruefeStale` mit geändertem Inhalt
      `"XYZ"` für dieselbe Eingabe ⇒ `stale: true`,
      `geaenderteEingaben` enthält genau diesen Schlüssel — der zentrale
      Rot-/Grün-Beleg für AC14.
   c. `haltFestStaleEntscheidung` mit `entscheidung:
      "unveraendert_gueltig"` ohne `begruendung` ⇒ abgelehnt (Verstoß);
      mit `begruendung` ⇒ erfolgreich, ursprünglicher Artefakt-Eintrag
      danach byteidentisch zum Zustand vor der Entscheidung (A8-Nachweis).
   Eingehängt in `npm run check` und `npm run check:template`.

9. **Zeile in `state/gates.md`** — neue Tabellenzeile
   `check-lineage-registry.mjs`, Muster wie die Checkpoint-Store-
   Gate-Zeile, mit echtem Rot-/Grün-Beleg nach dem realen Bau-/Prüflauf.

10. **Zeile in `state/memory-map.md`** — „Lineage-Payload-Schema" →
    `schemas/kontrollzustand-lineage-payload.schema.json` +
    `schemas/examples/kontrollzustand-lineage*`, „nicht hierhin": nicht
    in `schemas/kontrollzustand.schema.json`. Zusätzlich „Lineage-
    Registry-Modul" → `src/lineage-registry/`, „nicht hierhin": kein
    Abhängigkeitsgraph, keine Impact-Klassifikation, keine
    Invalidierungspropagation, keine Ausführungslogik.

11. **`docs/STATUS.md`** — Eintrag unter „Erledigt" nach realem Bau.

12. **`features/F2/journal.md`** — Anhängeprotokoll nach F0/F1-Muster,
    beginnend mit dem Akte-Eintrag (Folgeschritt, nicht Teil dieses
    Plans — siehe Abschnitt 9).

## 3. NICHT (Non-Scope, mit Grund)

- Abhängigkeitsgraph über mehrere Artefakte hinweg (z. B. „alle
  Artefakte, die von X abhängen") — `eingaben` zeigt nur nach vorn
  (welche Eingaben ein Artefakt selbst zitiert), es gibt keine
  Rückwärtsabfrage „wer zitiert mich". Ausdrücklicher Nicht-Ziel-Rand
  des Auftrags (§11 „Nicht bauen").
- Impact-Klassifikation, Invalidierungspropagation — `pruefeStale`
  bewertet ausschließlich die direkt zitierten Eingaben einer einzelnen
  Version, löst keine Kettenreaktion auf Artefakte aus, die ihrerseits
  das geprüfte Artefakt als Eingabe zitieren.
- Visualisierung als Graph/UI — Registry liefert nur Datensätze
  (`listeVersionen`, `pruefeStale`), keine Darstellung.
- Automatische Relevanzbewertung einer Änderung — `pruefeStale` liefert
  ausschließlich ein binäres „geändert: ja/nein" pro Eingabe
  (Entscheidung 103, „rein mechanisch"), nie eine Einschätzung, ob die
  Änderung inhaltlich relevant ist.
- Automatische Neuerzeugung, Nachtrag oder Freigabe eines
  STALE-Artefakts — `haltFestStaleEntscheidung` verlangt in jedem Fall
  einen vom Aufrufer (letztlich: vom Menschen) übergebenen
  `entscheidung`-Wert; die Registry trifft nie selbst eine Entscheidung
  oder wählt einen Default.
- Lesen von Dateien/Bereichen durch die Registry selbst — jeder Inhalt
  (für `inhalts_hash` bei „werkzeug" wie für den STALE-Vergleich) wird
  vom Aufrufer als String übergeben (D4). Kein Datei-IO außerhalb des
  eigenen `kontrollzustand/<artefakt_id>/`-Baums.
- Duplizierung werkzeugerzeugter Artefakte — strukturell durch das
  Payload-Schema verhindert (`daten` ist bei `erzeugungsart: "werkzeug"`
  verboten, nicht nur unüblich).
- Fachliche Qualitätsprüfung eines Artefakts oder einer Eingabe.
- Ausführung von Werkzeugen/KI-Positionen — Registry registriert nur,
  ruft nichts auf.
- Execution Controller, Workstream-/Execution-Automat oder jede
  Orchestrierungslogik, die eine Registrierung *auslöst* — Registry
  bietet nur die oben genannten Funktionen, ruft sich selbst nie auf.
- Ein Zeiger-/Index-Artefakt, das „die aktuelle Version" behauptet —
  `ladeArtefaktVersion` ohne `versionSequenz` ermittelt den höchsten
  Stand jedes Mal neu aus dem Dateisystem, kein zusätzlicher,
  potenziell veralteter Zeiger (Fortführung von F1s D1-Argumentation).
- Änderung von `schemas/kontrollzustand.schema.json` (F0, gemergt) — neue
  Payload-Regeln entstehen in einem eigenen Schema (SCOPE.1), kein
  Eingriff in F0.
- Wesentliche Verhaltensänderung an `src/checkpoint-store/` — die
  einzige Berührung ist die Ein-Zeilen-Export-Ergänzung aus SCOPE.4/D5,
  kein sonstiger Eingriff in F1s Datei- oder Kettenlogik.
- `git add`/`git commit` im Schreibpfad — wie bei F1 kein Aufruf von
  `git` aus dem Modul heraus.

## 4. Design-Entscheidungen

- **D1 (ein `typ`-Wert `"lineage"` mit `art`-Diskriminator statt zweier
  `typ`-Werte):** `ARCHITECTURE.md:27` nennt „Artefakt- und Lineage-
  Einträge" als zwei Begriffe, `schemas/kontrollzustand.schema.json:38`
  nennt bereits committet ein einziges Wort „Lineage" als Unterart. Zwei
  `typ`-Werte (`"artefakt"` und `"lineage"`) hätten den Vorteil, dass
  jede `art`-Variante ihr eigenes, unverzweigtes Payload-Schema bekäme;
  Nachteil: sie würde der bereits gemergten Schema-Kommentierung
  widersprechen, die nur „Lineage" (singular) als vorgesehenen Wert
  nennt, und einen zweiten `typ`-Wert einführen, den F0 nicht vorgesehen
  hat. Diese Entscheidung folgt der bereits committeten, maschinell
  wirksamen Quelle: ein `typ`-Wert, zwei `art`-Varianten innerhalb des
  Payloads — analog dazu, wie F1s Payload bereits zwischen `sequenz: 1`
  (Kettenanfang) und `sequenz > 1` unterscheidet, ohne dafür zwei
  `typ`-Werte zu brauchen. Zur Bestätigung im Advisor-Pass (Offener
  Punkt 1), da ein Fehlurteil hier das gesamte Schema betrifft.
- **D2 (`artefakt_id` ist ein opaker Aufrufer-Parameter):** wörtlich F1s
  D2 übertragen — Registry erzeugt, parst oder interpretiert
  `artefakt_id` nicht, nur ein nicht-leerer, dateisystem-sicherer String.
  Ein Artefakt-Identitäts-Vergabeschema (wer vergibt `artefakt_id`, wann)
  gehört zu den künftigen Aufrufern (Context Builder, Execution
  Controller), nicht zu diesem Feature.
- **D3 (keine Hash-Kette über Versionen, anders als F1s Checkpoints):**
  F1 verkettet Checkpoints (`vorgaenger_hash`), weil dort ein
  spezifisches Bedrohungsmodell galt — ein korrumpierter oder
  unvollständig geschriebener Checkpoint darf die Kette davor nicht
  vortäuschen (AC10 in F1). Für Lineage-Versionen verlangt kein AC dieses
  Features eine Korruptionsresistenz über mehrere Versionen hinweg;
  AC3/AC4 verlangen nur, dass unterschiedliche Inhalte unterschiedliche,
  nie überschriebene Versionen ergeben — das leistet Inhaltsadressierung
  (Hash im Dateinamen) allein, ohne Verkettung. Eine Kette hier
  einzuführen wäre unbegründete Komplexität (YAGNI, CLAUDE.md
  „Komplexität reduzieren"). Konsequenz: `ladeArtefaktVersion`/
  `listeVersionen` sind einfacher als F1s Rückwärtslauf-Kettenprüfung —
  sie validieren jede Version für sich (Hülle, Payload, Hash), aber
  nicht gegenseitig.
- **D4 (Registry liest nie selbst eine Datei oder einen Bereich):** Sowohl
  `inhalts_hash` bei `erzeugungsart: "werkzeug"` als auch jeder Vergleich
  in `pruefeStale` bekommen den zu hashenden Inhalt als String vom
  Aufrufer übergeben, nie über einen selbst geöffneten Dateipfad.
  Begründung: (1) „zitierter Bereich" ist laut Feature-Akte ein opaker
  Bezeichner (Zeilenbereich, Abschnitt, …) — ihn aus einer Datei zu
  extrahieren würde eine Parsing-/Bereichsauflösungslogik verlangen, die
  §11 „Nicht bauen" (kein Abhängigkeitsgraph, keine Impact-Analyse) der
  Sache nach mit einschließt; das bleibt Aufrufer-Wissen (Context
  Builder o. ä.). (2) Sie macht AC8 („Änderungen außerhalb der
  referenzierten Bereiche führen nicht zu STALE") strukturell wahr statt
  konventionell — die Registry kann nichts vergleichen, was ihr nie
  mitgeteilt wurde, es gibt keinen Codepfad, der versehentlich mehr als
  den zitierten Bereich einliest. Kosten: Der Aufrufer trägt die
  Verantwortung, den „richtigen" Bereich konsistent zu liefern — dieses
  Feature prüft nur den mechanischen Vergleich, nicht die Korrektheit der
  Bereichsauswahl (Entscheidung 103 „konservativ, keine
  Bedeutungsprüfung").
- **D5 (Wiederverwendung von F1s Hash-/Serialisierungs-/
  Schreibfunktionen statt Duplikat):** `kanonischesJson`/`sha256Hex` sind
  bereits aus `src/checkpoint-store/index.ts` exportiert; `atomarSchreiben`
  ist es nicht. Zwei Alternativen erwogen: (a) ein neues
  `src/shared/`-Modul, in das alle drei Funktionen aus F1
  herausgezogen und von beiden Features importiert werden — sauberer,
  aber ein Eingriff in eine bereits gemergte, gate-geprüfte F1-Datei
  über eine reine Sichtbarkeitsänderung hinaus, plus ein neues
  Top-Level-Verzeichnis für insgesamt zwei Nutzer; (b) `atomarSchreiben`
  zusätzlich exportieren (Ein-Zeilen-Änderung, Verhalten unverändert,
  keine neue Testpflicht) und aus F1 importieren, kein neues
  Verzeichnis. Diese Sitzung wählt (b): „Rule of Three" — bei zwei
  Nutzern ist eine dedizierte Shared-Struktur verfrühte Abstraktion
  (CLAUDE.md „Komplexität reduzieren", „keine Abstraktion für
  hypothetische künftige Anforderungen"); sollte ein drittes Feature
  denselben Bedarf haben, ist das der richtige Zeitpunkt für (a). Diese
  Ein-Zeilen-Änderung an F1 ist die einzige Berührung eines bereits
  gemergten Features in diesem Plan — zur Bestätigung im Advisor-Pass
  (Offener Punkt 2), da sie technisch außerhalb des reinen
  „neuer Ordner unter src/"-Rahmens liegt, den F1 selbst noch hatte.
- **D6 (kein Zeiger-/Index-Artefakt, ein File pro Version/Entscheidung):**
  wörtlich F1s SCOPE.4-Argumentation übertragen — erzwingt „neue Version
  statt Mutation" strukturell, kein zusätzlicher, potenziell veralteter
  Zeiger auf „die aktuelle Version".
- **D7 (kein `ajv`):** Fortführung von F0-D5/F1-D6 — Payload-Regeln sind
  mit derselben Handschrift-Komplexität wie F1 prüfbar.

## 5. Ablageort

- `schemas/kontrollzustand-lineage-payload.schema.json` und
  `schemas/examples/kontrollzustand-lineage*.json` — neben den
  bestehenden F0-/F1-Schemas, eigener Dateiname.
- `src/lineage-registry/` — zweiter Ordner unter `src/`, neben
  `src/checkpoint-store/` (unverändert bis auf die D5-Export-Ergänzung).
- `scripts/check-lineage-registry.mjs` — neben `check-checkpoint-
  store.mjs`.
- `kontrollzustand/<artefakt_id>/lineage/*.json` und
  `kontrollzustand/<artefakt_id>/lineage-entscheidungen/*.json` —
  Laufzeitdaten, gleiche Grundstruktur wie F1s
  `kontrollzustand/<lauf_id>/checkpoints/*.json`, keine neue
  Top-Level-Struktur.

## 6. Budget & Pässe

- Zuschnitt-Bewertung (CLAUDE.md-Heuristik): ein Baudurchgang plus
  höchstens eine Korrekturrunde, eigenständig prüfbares Artefakt (Gate +
  `npm run check` grün). Abhängigkeit auf F1 (Wiederverwendung dreier
  Funktionen, D5) ist explizit im CONTEXT-Abschnitt des künftigen
  Handoff-Vertrags zu benennen, kein Zuschnittsfehler nach der
  CLAUDE.md-Heuristik. Einzige Sorge: zwei orthogonale Unterscheidungen
  im selben Payload-Schema (`art` × `erzeugungsart`) sind mehr
  Verzweigung als F1s einzelne `sequenz == 1`-Unterscheidung — Bewertung:
  bleibt in einem Durchgang machbar, weil beide Achsen unabhängig und
  klein sind (je zwei Werte), aber genau deshalb ist D1 der wichtigste
  Advisor-Prüfpunkt dieses Plans.
- Advisor-Pass fällig (neuer `src/`-Ordner, neues blockierendes Gate,
  Schema-Design-Entscheidung D1 mit Fehlurteilsrisiko, Eingriff in eine
  bereits gemergte F1-Datei via D5) — Subagent `architecture-advisor`,
  frischer Kontext, `Read/Grep/Glob`.
- Danach `code-reviewer` und `qa`, read-only.
- Rework-Regel: Gate 1 rot → eine Korrekturrunde → Gate 2. Zweites Rot ⇒
  BLOCKIERT ⇒ Mensch.
- `state/gates.md`-Eintrag (SCOPE.9) entsteht erst NACH dem realen
  Bau-/Prüflauf, mit echtem Befehl+Ausgabe-Beleg.

## 7. Akzeptanzkriterien (technisch, 1:1 gegen die 14 AC der Feature-Akte)

- **A1** (AC1) `registriereKernArtefakt` schreibt einen Eintrag mit
  `erzeugungsart: "kern"`, `artefakt_id`, `inhalts_hash` (real über
  `daten` berechnet), `herkunft`, `eingaben`; `ladeArtefaktVersion`
  liefert ihn inhaltlich identisch zurück.
- **A2** (AC2) `registriereWerkzeugReferenz` schreibt einen Eintrag mit
  `erzeugungsart: "werkzeug"`, `pfad`, `zitierter_bereich`,
  `inhalts_hash`, **ohne** `daten`-Feld — geprüft durch
  `validiereLineageEintrag` (strukturelle Regel) und durch Byte-Vergleich
  der geschriebenen Datei im Gate/Test.
- **A3** (AC3) Zwei Aufrufe von `registriereKernArtefakt` mit derselben
  `artefakt_id`, aber unterschiedlichem `daten`-Inhalt, ergeben zwei
  Dateien mit `version_sequenz: 1` und `2` und unterschiedlichem
  `inhalts_hash`.
- **A4** (AC4) Nach A3: Datei zu `version_sequenz: 1` ist byteidentisch
  zum Zustand direkt nach ihrem Schreiben — kein Codepfad in
  `registriereKernArtefakt`/`registriereWerkzeugReferenz`/
  `haltFestStaleEntscheidung` öffnet eine bestehende Versions-Datei zum
  Schreiben (nur `atomarSchreiben` auf einen neuen Zielpfad, D6).
- **A5** (AC5) Ein mit `eingaben` registriertes Artefakt liefert über
  `ladeArtefaktVersion` das vollständige `eingaben`-Array
  (`pfad`/`zitierter_bereich`/`inhalts_hash` je Eingabe) zurück.
- **A6** (AC6) `pruefeStale` mit unverändertem Inhalt für jede Eingabe
  liefert `{ stale: false, geaenderteEingaben: [] }`.
- **A7** (AC7) `pruefeStale` mit geändertem Inhalt für mindestens eine
  Eingabe liefert `{ stale: true, geaenderteEingaben: [...] }` mit genau
  den geänderten Schlüsseln.
- **A8** (AC8) Strukturell durch D4 garantiert: `pruefeStale` erhält pro
  Eingabe ausschließlich den vom Aufrufer für exakt diesen
  `zitierter_bereich`-Schlüssel gelieferten Inhalt; ein Test liefert für
  eine unveränderte Eingabe denselben Inhalt trotz einer (im Test nicht
  mitgeteilten) Änderung „anderswo" und zeigt `stale: false` für diese
  Eingabe — es gibt keinen Codepfad, über den eine nicht mitgeteilte
  Änderung einfließen könnte (Code-Review-Beleg zusätzlich zum Test, da
  „Abwesenheit eines Codepfads" nur begrenzt automatisiert prüfbar ist).
- **A9** (AC9) `pruefeStale` vergleicht ausschließlich `inhalts_hash`
  (Bytegleichheit nach Kanonisierung) — keine Funktion im Modul liest
  oder bewertet die Bedeutung eines Inhalts. Geprüft durch Code-Review
  gegen die Implementierung (wie F1s A9, nicht automatisiert prüfbar).
- **A10** (AC10) Strukturell durch API-Design: Es gibt keine Funktion,
  die eine als `stale: true` erkannte Version automatisch „freigibt"
  oder ihre Weiterverwendung stillschweigend erlaubt.
  `ladeArtefaktVersion` liefert eine Version unabhängig von ihrem
  STALE-Status (wie F1s D10 „Laden ist kein Urteil"), aber es existiert
  keine Bequemlichkeitsfunktion, die STALE-Prüfung und Verwendung
  kombiniert und dabei die Prüfung überspringt. Geprüft durch
  Code-Review (wie F1s A9, prozessuale Durchsetzung liegt beim
  künftigen Aufrufer, nicht bei diesem Modul).
- **A11** (AC11) `haltFestStaleEntscheidung` schreibt einen Eintrag mit
  `entscheidung` ∈ {`neu_erzeugen`, `nachtrag`, `unveraendert_gueltig`},
  abrufbar und der betroffenen `artefakt_id`/`version_sequenz` eindeutig
  zugeordnet (`bezieht_sich_auf`).
- **A12** (AC12) `haltFestStaleEntscheidung` mit `entscheidung:
  "unveraendert_gueltig"` und fehlender `begruendung` wird von
  `validiereLineageEintrag` als Verstoß erkannt und nicht geschrieben;
  mit `begruendung` wird sie geschrieben und bleibt über
  `bezieht_sich_auf` der Version zugeordnet.
- **A13** (AC13) `ladeArtefaktVersion`/`listeVersionen` liefern für jede
  Version `artefakt_id`, `version_sequenz`, `inhalts_hash`, `herkunft`,
  `eingaben` vollständig und eindeutig.
- **A14** (AC14, Hauptkriterium) Ein Artefakt wird mit einer Eingabe
  (Inhalt `"ABC"`) registriert; `pruefeStale` mit `"ABC"` ⇒ `stale:
  false`; derselbe zitierte Bereich wird auf `"XYZ"` „verändert"
  (Aufrufer liefert beim zweiten Aufruf `"XYZ"`); `pruefeStale` erkennt
  reproduzierbar `stale: true` für genau diese Eingabe — real
  durchspielt im Gate-Skript (SCOPE.8b), nicht nur behauptet.
- **A15** `node scripts/check-lineage-registry.mjs` → Exit 0 gegen alle
  sieben Fixtures und den synthetischen STALE-Fall.
- **A16** `npm run check` und `npm run check:template` sind grün (inkl.
  Doku-Gate, Typecheck ohne `any`, Linter) — inklusive der D5-Export-
  Ergänzung in `src/checkpoint-store/index.ts`.
- **A17** `state/gates.md` enthält die neue Zeile für
  `check-lineage-registry.mjs` mit echtem Rot-/Grün-Beleg.
- **A18** `state/memory-map.md` enthält beide neuen Zeilen
  (Lineage-Payload-Schema, Lineage-Registry-Modul) mit
  „nicht hierhin"-Spalte.
- **A19** `docs/STATUS.md` nennt die Artifact Registry / Lineage unter
  „Erledigt".

A1–A13 decken die 14 AC der Feature-Akte direkt (A1↔AC1 … A14↔AC14),
A15–A19 sind Mechanik/Dokupflicht analog F1s A13–A17-Muster.

## 8. Rollen für diesen Workstream

| Position | Träger | Rechte |
|---|---|---|
| Advisor | Subagent `architecture-advisor`, frisch | `Read, Grep, Glob` |
| Executor | Claude-Code-Sitzung, frisch, kennt nur Repo + Vertragsvolltext | voll im freigegebenen Pfad |
| Reviewer | Subagenten `code-reviewer`, `qa`, frisch | read-only |
| Mensch (Stefan) | — | Freigaben, Release, echte Abzweigungen, Klärung der offenen Punkte unten |

## 9. Nächste Schritte nach diesem Plan (nicht Teil dieses Auftrags)

1. Klärung der Offenen Punkte 1–3 unten.
2. Advisor-Pass auf diese Datei — insbesondere D1 (ein `typ`-Wert vs.
   zwei) und D5 (Export-Ergänzung an F1).
3. Findings → `state/advisor-findings-feature2-artifact-registry-
   lineage.md`.
4. `plan-v2-feature2-artifact-registry-lineage.md` als neue Datei —
   `plan-v1` bleibt unverändert stehen.
5. Handoff-Vertrag → `state/tasks/f2-artifact-registry-lineage.md`,
   SCHRITT 0 wörtlich, 7 Pflichtsektionen.
6. `features/F2/feature.md` + `journal.md` anlegen (SCOPE.12) — im Zuge
   des Bau-Vertrags, analog F1.

## 10. Offene Punkte — NICHT stillschweigend entschieden

1. **D1 ist eine Auslegung, kein wörtlicher Auftrag.** `ARCHITECTURE.md:27`
   („Artefakt- und Lineage-Einträge") ließe sich auch als zwei getrennte
   `typ`-Werte lesen. Diese Sitzung entscheidet sich für einen einzigen
   `typ: "lineage"` mit `art`-Diskriminator, weil das der bereits
   committeten Schema-Kommentierung (`kontrollzustand.schema.json:38`,
   nur „Lineage" genannt) am nächsten kommt — zur Bestätigung im
   Advisor-Pass, da ein Wechsel auf zwei `typ`-Werte SCOPE.1–3 und die
   Payload-Schema-Datei grundlegend ändern würde.
2. **D5 berührt eine bereits gemergte F1-Datei.** Die Ein-Zeilen-Export-
   Ergänzung an `src/checkpoint-store/index.ts` ist nach Einschätzung
   dieser Sitzung risikofrei (reine Sichtbarkeitsänderung, keine
   Verhaltensänderung, F1s eigene Tests bleiben unverändert grün), liegt
   aber außerhalb des „ein Feature, ein neuer Ordner"-Musters, das F1
   selbst noch hatte. Falls der Advisor oder der Mensch eine strengere
   Trennung wünscht, ist Alternative (a) aus D5 (eigenes
   `src/shared/`-Modul) der Ausweichplan.
3. **`herkunft` und `eingaben[].pfad` bleiben bewusst unstrukturiert.**
   Wie F1s `daten`-Feld sind sie offene, vom Aufrufer definierte Werte.
   Sollte ein künftiger Aufrufer (Context Builder, Execution Controller)
   bereits ein festes Format für „Herkunft" vorgeben, das dieser
   Planungsrolle nicht vorlag, ist das vor dem Handoff-Vertrag
   nachzuziehen — analog zu F1s Offenem Punkt 2 (Lauf-Identität).
