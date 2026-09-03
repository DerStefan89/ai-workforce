SCHRITT 0: Arbeitsverzeichnis ausgeben und gegen das im Auftrag genannte
Zielverzeichnis prüfen. Bei Abweichung: abbrechen, melden, nichts ändern.

## TASK: f6b-ws-c-startziel-guelttigkeitsschluessel

GOAL: Der E-188-Gültigkeitsschlüssel (F4, src/invocation-policy/) trägt
einen sechsten, mechanisch geprüften Bestandteil: das normalisierte
Startziel des Werkzeugprozesses. pruefeStartbedingung2 erkennt eine
Abweichung in diesem Feld als Drift und lehnt ab — genau wie bei den
fünf bestehenden Feldern.

CONTEXT:
- [Fakt] docs/projekt/zielfassung.md §9.4 E-188 (v1.9, 03.09.2026) nennt
  sechs Bestandteile des Gültigkeitsschlüssels; der sechste, „Startziel
  des Werkzeugprozesses", wurde in dieser Fassung ergänzt (E5).
- [Fakt] src/invocation-policy/types.ts: IstUebrigeFelder
  (werkzeug_version_deklariert, berechtigungskontext,
  arbeitsverzeichnis_pfad) und Gueltigkeitsschluessel (dieselben drei
  Felder plus werkzeug_konfiguration_hash, schutzskript_hashes)
  enthalten den sechsten Bestandteil noch nicht.
- [Fakt] src/invocation-policy/index.ts, pruefeStartbedingung2: baut
  istGueltigkeitsschluessel aus istZustand + istUebrigeFelder, vergleicht
  Feld für Feld gegen nachgewiesen (aus dem Wirksamkeitsnachweis).
  arbeitsverzeichnis_pfad wird über normalisierePfadFuerVergleich
  verglichen, nicht über Stringgleichheit.
- [Fakt] schemas/kontrollzustand-invocation-policy-wirksamkeitsnachweis-payload.schema.json:
  gueltigkeitsschluessel ist additionalProperties:false mit required
  genau der fünf heutigen Felder.
- [Fakt] schemas/examples/kontrollzustand-invocation-policy-wirksamkeitsnachweis*.json
  (valide und invalide Beispiele) enthalten nur die fünf heutigen Felder.
- [Fakt] src/invocation-policy/invocation-policy.test.ts und
  scripts/check-f4-invocation-policy.mjs bauen IstUebrigeFelder- und
  Gueltigkeitsschluessel-Testfixturen als Objektliterale (u. a. Konstante
  ISTUEBRIGEFELDER) — diese brechen bei reiner Interface-Erweiterung
  ohne Fixture-Update.
- [Fakt] Finding F-080 (state/findings.md, TECH_DEBT): das Startziel soll
  als normalisierter Pfad geführt werden, nicht als Hash der
  Binärdatei — die Executable ist groß (218 MB, F6a-Messung), ein Hash
  würde bei jedem Werkzeug-Patch unnötig invalidieren.
- [Fakt] src/claude-code-gateway/types.ts: GatewayEingaben.werkzeugStartziel:
  string[] — "[0] ist das Programm, weitere Elemente stehen vor tokens".
  Dieser Vertrag betrifft NUR src/invocation-policy/ — die Anbindung von
  F6a/F6b an den neuen Schlüssel ist WS-G, eigener Vertrag.
- [Schlussfolgerung] Der neue Schlüsselbestandteil braucht denselben
  Pfadvergleich wie arbeitsverzeichnis_pfad (normalisierePfadFuerVergleich),
  nicht Stringgleichheit — sonst gilt ein triftiger Pfad mit anderer
  Schreibweise fälschlich als Drift.

SCOPE:
- Neues Feld startziel_pfad (string) in IstUebrigeFelder und
  Gueltigkeitsschluessel (src/invocation-policy/types.ts).
- pruefeStartbedingung2 (index.ts): istGueltigkeitsschluessel-Konstruktion
  und Feldvergleich um startziel_pfad erweitern, Vergleich über
  normalisierePfadFuerVergleich, eigene Fehlermeldung "Drift im
  Gültigkeitsschlüssel: 'startziel_pfad' (E-188)".
- Schema: startziel_pfad als sechstes Pflichtfeld unter
  gueltigkeitsschluessel (type: string, minLength: 1), required-Array
  erweitern.
- Alle Beispieldateien unter schemas/examples/ um das Feld ergänzen,
  damit sie weiter valide bzw. gezielt invalide bleiben.
- Testfixturen in invocation-policy.test.ts und
  check-f4-invocation-policy.mjs um das Feld ergänzen.
- Neuer Rot-Fall-Test, symmetrisch zu den fünf bestehenden: Drift
  ausschließlich in startziel_pfad wird als ok:false mit der neuen
  Fehlermeldung erkannt — in invocation-policy.test.ts UND als Gate-Fall
  in check-f4-invocation-policy.mjs (Muster: bestehender "Bedingung2
  Grün-Fall + Drift-Fall", F11-Querkonsistenz).
- Grün-Fall entsprechend ergänzen (identisches startziel_pfad auf beiden
  Seiten → weiterhin ok:true).

NICHT:
- Keine Änderung an src/claude-code-gateway/ (F6a/F6b-Anbindung ist
  WS-G, eigener Vertrag).
- Keine Herkunftsprüfung des Wirksamkeitsnachweises (D16-analoge
  Lesekette) — das ist WS-D, eigener Vertrag.
- Kein Eingriff in pruefeStartbedingung1 oder die Baseline-Lesekette.
- Kein Eingriff in arbeitsverzeichnis_pfad oder ein anderes bestehendes
  Feld über die notwendige Erweiterung hinaus.
- Kein Commit ohne vorherige grüne node scripts/check-contract.mjs
  (für diesen Vertrag selbst) und grünes npm run check.

BUDGET: Ein Baudurchgang, höchstens eine Korrekturrunde. Rein additive
Typ-/Schema-/Test-Erweiterung an bereits bekannten Stellen.

OUTPUT:
- Geänderte Dateien wie unter SCOPE, plus features/F6a/feature.md NUR
  falls dort ein Verweis auf die fünf heutigen Gültigkeitsschlüssel-Felder
  wörtlich veraltet würde (prüfen, nicht annehmen).
- state/findings.md: F-080 auf "gelöst" setzen mit Verweis auf die
  konkrete Implementierung (Feldname, Funktion).
- Bericht: geänderte Dateien, Ergebnis von npm run check (Exit-Code), ob
  der neue Rot-Fall-Test beim ersten Versuch tatsächlich rot war, bevor
  die Implementierung ihn grün gemacht hat.

ESCALATE:
- Wenn pruefeStartbedingung2 oder ihre Signatur bereits an anderer
  Stelle im Repo aufgerufen wird, die hier nicht genannt ist — anhalten,
  melden, nicht eigenmächtig anpassen.
- Wenn der neue Rot-Fall-Test beim ersten Lauf NICHT rot ist — anhalten,
  das ist ein Kalibrierungsfehler, kein Erfolg.
- Wenn additionalProperties:false nach der Erweiterung eine bestehende
  Beispieldatei invalidiert, die valide bleiben sollte — anhalten, nicht
  die Beispieldatei stillschweigend anpassen ohne das im Bericht zu
  nennen.
