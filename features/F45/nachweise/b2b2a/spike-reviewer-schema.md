# Spike F45 B2b-2a — trägt `claude --json-schema` das Review-Schema `ergebnis-code-reviewer`?

Stand 15.10.2026, F45 B2b-2a (Branch `f45/b2b2a-review-vollstaendig`), F-1085 (2). Claude-Code-CLI 2.1.300 (laut
Init-Zeile; B2b-1b-1 lief mit 2.1.299), Modell `claude-sonnet-5`.

## Geprüfte Schemafassung

`schemas/ergebnis-code-reviewer.schema.json`, SHA-256
`c2c3a498f2cbc3356cbec745adef00bb6eaea5f4c1dd7016382fcc5e16518bd2`. Das Gate `scripts/check-f45-b2b2-pruefer.mjs` (s0)
vergleicht die Datei mit diesem Wert: ändert sich das Schema, braucht es einen neuen echten Lauf an claude-code und einen
neuen Wert hier (F-638, F-1086). Ein echter Codex-Lauf mit derselben Fassung liegt seit B2a-3a vor
(`features/F45/nachweise/b2a3/codex-review-lauf.md`).

## Aufbau

Skript `spike-reviewer-schema.mjs` (dieser Ordner), Muster `../b2b1b/spike-f1105-stdin.mjs`: echter Prozessstart der CLI
(`claude.exe` direkt) mit dem Argv-Muster von `baueAufruf` für einen lesenden Werkzeugsatz (`--model`,
`--output-format stream-json`, `--verbose`, `--setting-sources project`, `--tools Read,Grep,Glob`,
`--allowedTools Read,Grep,Glob`, `--strict-mcp-config --mcp-config {"mcpServers":{}}`) plus `--json-schema <Text>` vor
`-p`; der Schematext kommt aus `baueClaudeJsonSchema` (Produktfunktion, entfernt `$schema`/`$id`), der Prompt geht über
stdin wie im Produkt (F-642). Prompt: kurze Rolleninstruktion `code-reviewer`, die Review-Policy aus
`baueReviewPolicyBlock()` (Produkttext) und ein absichtlich fehlerhafter Mini-Diff (Off-by-one, Division durch null, kein
Test, kein Header). Arbeitsordner: dieses Repo.

## Ergebnis

Exit 0, 56 s, 3 Turns, 0,16 USD (`spike-reviewer-ausgabe.txt`, Rohstrom `spike-reviewer-rohstrom.ndjson`).
- Init-Zeile: `tools` = `Glob, Grep, Read, StructuredOutput` — wie bei F-1105 fügt die CLI das Werkzeug `StructuredOutput`
  hinzu (Init-Gate sperrt nur Agent/Task).
- `result`-Zeile: `structured_output` schemagerecht — urteil `BLOCKIERT`, vier Befunde B1–B4 mit allen acht Feldern
  (`id`, `dimension`, `schwere`, `fundstelle`, `zusammenfassung`, `beleg`, `korrekturrichtung`, `evidenz` mit Werten aus
  den Enums, B1 HOCH), `empfehlung`, `ak_urteile: []`. Das Feld `result` trägt dasselbe JSON (nach Parse gleich).
- `pruefeReviewErgebnis` (Review-Policy, Regel 1k und Hinweise) auf dem Ergebnis: keine Verstöße, keine Hinweise.
- Die nullable-Typen des Strict-Dialekts (`["string","null"]`, `enum` mit `null`) nimmt der CLI-Validator an.

## Schluss

- `--json-schema` trägt `ergebnis-code-reviewer` real (mit dem Prompt über stdin). `ergebnis-code-reviewer` kommt in die
  Allowlist `CLAUDE_CODE_AUSGABESCHEMAS` (Regel 4b).
- Gelesen wird wie beim Advisor aus dem Ergebnistext (`result`), kein zweiter Lesepfad.
- Nicht belegt (wie F-1105): Verhalten der CLI, wenn das Modell das Schema verfehlt. Der Kern prüft beim Lesen weiter
  (Regel 1b unlesbares Ergebnis, Regel 1k Review-Vertrag).
- Nicht belegt (Code-Review 7, Advisor A10): der Spike-Prompt war nicht der Produkt-Auftrag (ohne Projektkarte,
  AK-Block, Beobachtungsblock), `ak_urteile` war leer. Der Produkt-Lesepfad nutzt nur `result`; trägt `result` im echten
  Lauf Prosa, endet das sicher (`nicht_lesbar`, Regel 1b, „Review wiederholen“). Beim ersten echten Claude-Review
  beobachten (F-1113).
- Schwärzung: Rohstrom mit `../b2b1b/schwaerze.mjs` (beim Schreiben und danach als Skript); danach kein Benutzerordner,
  keine E-Mail im Rohstrom (Suche nach `Users` und dem Benutzernamen = 0 Treffer; Pfade nur als `<HOME>`).
