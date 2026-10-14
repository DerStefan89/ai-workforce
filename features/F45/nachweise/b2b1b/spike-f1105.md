# Spike F-1105 — trägt `claude --json-schema` das Advisor-Schema?

Stand 14.10.2026, F45 B2b-1b (Branch `f45/b2b1b-plan-v2`). Claude-Code-CLI 2.1.299, Modell `claude-sonnet-5`
(wie der Advisor-Schritt in `workflow-vorlagen/hoch.json`).

## Geprüfte Schemafassung

`schemas/ergebnis-architecture-advisor.schema.json`, SHA-256
`cf2e2bc035fbf132f171c363bc8e11f48099cd67367cab3bdee9512e374ffc98` (alle drei Versuche). Das Gate
`scripts/check-f45-b2b1-rueckweg.mjs` (c0b) vergleicht die Datei mit diesem Wert: ändert sich das Schema, braucht es einen
neuen echten Lauf und einen neuen Wert hier (F-638, F-1086).

## Aufbau

Skript `spike-f1105.mjs` (dieser Ordner): echter Prozessstart der CLI (`claude.exe` direkt, ohne `claude.cmd`) mit
dem Argv-Muster von `baueAufruf` für einen lesenden Werkzeugsatz — `--model`, `--output-format stream-json`,
`--verbose`, `--setting-sources project`, `--tools Read,Grep,Glob`, `--allowedTools Read,Grep,Glob`,
`--strict-mcp-config --mcp-config {"mcpServers":{}}` — plus `--json-schema <Schema als JSON-Text>` vor `-p`.
Prompt: kurze Advisor-Rolleninstruktion und ein absichtlich fehlerhafter Mini-Plan (Funktion ohne Aufrufer und Test,
globaler Zähler, Datei-Header unverändert). Arbeitsordner: dieses Repo.

## Ergebnis

| Versuch | Schema | Ergebnis |
|---|---|---|
| 1 | `schemas/ergebnis-architecture-advisor.schema.json` wörtlich | Exit 1 nach 1,7 s, kein Lauf: `--json-schema is not a valid JSON Schema: no schema with key or ref "https://json-schema.org/draft/2020-12/schema"` |
| 2 | dasselbe ohne `$schema` und `$id` | Exit 0, 87,9 s, 6 Turns, 0,18 USD, `permission_denials: []` |

Versuch 2 im Rohstrom (`spike-f1105-rohstrom.ndjson`):
- Init-Zeile: `tools` = `Glob, Grep, Read, StructuredOutput` — die CLI fügt für `--json-schema` ein eigenes Werkzeug
  `StructuredOutput` hinzu; das Modell ruft es am Ende auf (`tool_use`-Folge Read, Grep, Grep, Grep, StructuredOutput).
  Das Init-Gate (`pruefeInitZeile`) sperrt nur Agent/Task in `init.tools` — kein Konflikt.
- `result`-Zeile: Feld `structured_output` mit dem schemagerechten Objekt (urteil `UEBERARBEITEN`, Befunde A1–A3 mit
  Schwere, Evidenz `FAKT`, Fundstelle mit Datei/Zeile, Korrekturrichtung; ein entlastender Befund;
  `grenzen_der_pruefung`). Das Feld `result` trägt denselben Inhalt als JSON-Text (byte-gleich nach Parse).

## Nachtrag: Versuch 3, Prompt über stdin (Advisor-Pass A3)

Der Advisor-Pass wies darauf hin, dass das Produkt den Prompt nicht im Argv, sondern über stdin übergibt
(`starteGateway`, F-642: Argv endet auf `-p`, Prompt per stdin). Versuch 1/2 deckten diesen Weg nicht ab.
Skript `spike-f1105-stdin.mjs` (gleicher Aufbau, Argv ohne Prompt, Prompt per stdin), Rohstrom
`spike-f1105-stdin-rohstrom.ndjson`: Exit 0, 65,2 s, 0,10 USD, `structured_output` schemagerecht (urteil
UEBERARBEITEN, Befunde A1–A3 mit allen Pflichtfeldern), `result` trägt dasselbe JSON. Die Kombination
`--json-schema` + Prompt über stdin ist damit belegt. Der ursprüngliche Befund (Versuch 1/2) bleibt als historischer
Stand unverändert stehen.

## Schluss

- `--json-schema` trägt das Advisor-Schema real. Auflage: `$schema` und `$id` vor der Übergabe entfernen (der
  CLI-Validator kennt Draft 2020-12 nicht).
- Der bestehende Lesepfad (Ergebnistext = `result`) liefert das JSON; ein zweiter Lesepfad über `structured_output` ist
  nicht nötig.
- Nicht belegt: Verhalten der CLI, wenn das Modell das Schema verfehlt. Deshalb prüft der Kern das Ergebnis beim
  Lesen weiterhin (`validiereErgebnisAdvisor`).
- Nur dieses Schema ist an claude-code belegt; andere Rollen-Schemata (z. B. `ergebnis-code-reviewer` an einem
  Claude-Reviewer) brauchen je einen eigenen echten Lauf (F-638, F-1086).
