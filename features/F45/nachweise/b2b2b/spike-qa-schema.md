# Spike F45 B2b-2b — trägt `claude --json-schema` das qa-Schema `ergebnis-qa`?

Stand 15.10.2026, F45 B2b-2b (Branch `f45/b2b2b-qa-schritt`), F-820, F-1113 (2). Claude-Code-CLI 2.1.300 (laut
Init-Zeile), Modell `claude-sonnet-5`.

## Geprüfte Schemafassung

`schemas/ergebnis-qa.schema.json`, SHA-256
`37749f8d6242f80f094da0b81c37f098dbbc7167637efa3e760445ff7ab9e6f6`. Das Gate `scripts/check-f45-b2b2-pruefer.mjs` (s1)
vergleicht die Datei mit diesem Wert: ändert sich das Schema, braucht es einen neuen echten Lauf an claude-code und einen
neuen Wert hier (F-638, F-1086).

## Aufbau

Skript `spike-qa-schema.mjs` (dieser Ordner), Muster `../b2b2a/spike-reviewer-schema.mjs`: echter Prozessstart der CLI
(`claude.exe` direkt) mit dem Argv-Muster von `baueAufruf` für einen lesenden Werkzeugsatz plus `--json-schema <Text>` vor
`-p`; Schematext aus `baueClaudeJsonSchema` (Produktfunktion, ohne `$schema`/`$id`), Prompt über stdin wie im Produkt
(F-642). Anders als der Review-Spike (F-1113 (2)): der Prompt ist der **Produkttext** `baueQaAuftragstext` (`src/qa`) mit
einem realistischen Auftrag **mit drei Akzeptanzkriterien** und einem Nicht-Ziel (Funktion `formatiereBetrag`, Cent →
„12,34 €“), dazu die drei Eingaben, die der qa-Schritt im Ablauf bekommt (Änderungsübersicht mit fehlerhaftem Code,
Prüfergebnis GRÜN, Review-Ergebnis BEREIT_NACH_KORREKTUR mit einem MITTEL-Befund) als Text nachgebildet. Der Code enthält
absichtlich zwei Fehler aus Nutzersicht (negative Beträge, ungültige Eingaben), die der Review nicht meldet.

## Ergebnis

Exit 0, 50 s, 2 Turns, 0,14 USD (`spike-qa-ausgabe.txt`, Rohstrom `spike-qa-rohstrom.ndjson`).
- Init-Zeile: `tools` = `Glob, Grep, Read, StructuredOutput` (wie F-1105 und B2b-2a).
- `result`-Zeile: `structured_output` schemagerecht — urteil `BLOCKIERT`, zwei Befunde Q1 (KRITISCH, AK2 negativ) und Q2
  (HOCH, AK3 ungültige Eingabe) mit allen sieben Befundfeldern, **vier Testfälle** (AK1 bestanden, AK2 durchgefallen,
  AK3 durchgefallen, Leerzustand 0 Cent bestanden), `empfehlung`. Das Feld `result` trägt dasselbe JSON (nach Parse gleich).
- `validiereErgebnisQa` (`src/qa`) auf dem Ergebnis: keine Verstöße.
- Jedes AK hat einen Testfall, dessen Name mit der AK-ID beginnt (Instruktion), dazu ein eigener Randfall.

## Schluss

- `--json-schema` trägt `ergebnis-qa` real. `ergebnis-qa` kommt in die Allowlist `CLAUDE_CODE_AUSGABESCHEMAS` (Regel 4b).
- Mit AK im Prompt bleiben die Testfälle nicht leer (F-1113 (2) für qa belegt; für den Review weiter offen).
- Nicht belegt (wie F-1105/B2b-2a): Verhalten der CLI, wenn das Modell das Schema verfehlt. Der Kern prüft beim Lesen
  weiter (Regel 1q, `validiereErgebnisQa`, Ausweg „Prüfer wiederholen“).
- Der Prompt bildet die Eingaben als Text nach; im Ablauf kommen sie als eigene Eingabe-Anfragen
  (`loeseSchrittEingabenAuf`). Projektkarte und Beobachtungsblock bekommt der qa-Schritt nicht.
- Schwärzung: Rohstrom mit `../b2b1b/schwaerze.mjs` (beim Schreiben und danach als Skript); Suche nach `Users` und dem
  Benutzernamen in Rohstrom und Ausgabe = 0 Treffer.
