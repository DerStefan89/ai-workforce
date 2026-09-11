# F18 WS-3 — Router-Eval-Bericht

Stand: 2026-09-11T20:50:36.812Z. Erzeugt von `scripts/eval-router.mjs`
(`npm run eval:router`) gegen einen real laufenden Leitstand-Server
(`node scripts/leitstand-server.mjs`) — jeder Lauf ist ein echter
`claude-code`-Prozess der Rolle `router`, keine Simulation.

**[Annahme]** Die zehn Aufgaben unten und ihre Soll-Kontrolltiefe sind ein
v1-Startsatz für dieses Eval-Gate (Bauauftrag F18 WS-3), keine endgültige
Wahrheit — je Aufgabe eine einzelne, unbelegte Einstufung, kalibriert per
Handeinschätzung, nicht durch eine unabhängige zweite Quelle geprüft.

## Ergebnis je Aufgabe (3 Läufe je Aufgabe)

| Aufgabe | Ziel (gekürzt) | Soll | Beobachtet je Lauf | Router-Trefferquote | Baseline "immer standard" |
|---|---|---|---|---|---|
| A1 | Korrigiere einen Tippfehler in der Zieldatei-Beschreibung von features/F14/feature.md. | fast-lane | fast-lane, FEHLER(Unexpected token '`', "```json {""... is not valid JSON), fast-lane | 2/3 | 0/3 |
| A2 | Ergänze scripts/check-f18-router.mjs um einen zusätzlichen Kommentar, der die D5-Konsolidierung erklärt. | fast-lane | standard, fast-lane, fast-lane | 2/3 | 0/3 |
| A3 | Behebe einen Bug in raeumeVerzeichnis, der unter Windows EPERM beim rmSync auslöst. | standard | standard, standard, standard | 3/3 | 3/3 |
| A4 | Füge der Rolle code-reviewer ein neues Ausschlussmuster hinzu, das node_modules/** ausschließt. | standard | standard, FEHLER(Unexpected token '`', "```json {""... is not valid JSON), standard | 2/3 | 3/3 |
| A5 | Baue eine neue Rolle 'scout' analog zu router mit eigenem Output-Schema. | standard | hoch, hoch, FEHLER(Unexpected token '`', "```json {""... is not valid JSON) | 0/3 | 3/3 |
| A6 | Ändere ermittleNaechstenSchritt so, dass Regel 4b auch für WARTET_FREIGABE-Schritte greift. | hoch | standard, standard, standard | 0/3 | 0/3 |
| A7 | Entferne den commit-guard.cjs-Hook und ersetze ihn durch eine reine CI-Prüfung. | hoch | hoch, FEHLER(Unexpected token '`', "```json {""... is not valid JSON), hoch | 2/3 | 0/3 |
| A8 | Migriere den Checkpoint Store von Datei- auf SQLite-Speicherung. | hoch | FEHLER(Unexpected token '`', "```json {""... is not valid JSON), hoch, FEHLER(Unexpected token '`', "```json {""... is not valid JSON) | 1/3 | 0/3 |
| A9 | Aktualisiere die Versionsnummer in package.json von 0.14.0 auf 0.15.0. | fast-lane | fast-lane, fast-lane, fast-lane | 3/3 | 0/3 |
| A10 | Füge dem Leitstand-Server einen neuen Endpunkt POST /api/rollen hinzu, der Rollen zur Laufzeit registriert. | hoch | hoch, FEHLER(Unexpected token '`', "```json {""... is not valid JSON), FEHLER(Unexpected token '`', "```json {""... is not valid JSON) | 1/3 | 0/3 |

## Gesamt

- Läufe gesamt: 30
- Router-Trefferquote: 16/30 (53.3%)
- Baseline-Trefferquote ("immer 'standard' wählen"): 9/30 (30.0%)

## Realer Blocker: Markdown-Codezäune (F-337)

`[Fakt]` 8 der 30 Läufe (A1#2, A4#2, A5#3, A7#2, A8#1, A8#3, A10#2, A10#3) lieferten ihr Klassifikationsobjekt in einen Markdown-Codezaun eingebettet statt als reines JSON, trotz der expliziten Prompt-Anweisung „Kein Freitext davor oder danach" — `JSON.parse` auf `ergebnisobjekt.result` scheitert daran strukturell, exakt wie es `scripts/route-auftrag.mjs` in einem echten Routing-Versuch ebenfalls täte (kein Fence-Stripping dort). Diese Läufe zählen oben korrekt als Nicht-Treffer.

`[Fakt]` Forensische Nachprüfung (nicht Teil des Produktionspfads, nur für diesen Bericht — Codezaun entfernt, dann geparst): die eingebettete Klassifikation war in 7 von 8 Fällen inhaltlich korrekt. `[Schlussfolgerung]` Das Urteilsvermögen des Routers liegt damit real näher an (23)/30 (76.7%) als an den oben ausgewiesenen 53.3% — die harte Zahl bleibt aber maßgeblich, weil sie misst, was ein echter Aufrufer von `route-auftrag.mjs` tatsächlich bekommt, nicht was der Router "eigentlich meinte". Siehe `state/findings.md` F-337.

## Rohdaten (lauf_id je Einzellauf, für Nachvollziehbarkeit)

| Aufgabe | lauf_id | auftrag_id | Beobachtung | Treffer |
|---|---|---|---|---|
| A1 | eval-router-A1-r1-1789157321752 | 07ac262a-6d5e-4854-82ee-5e2ff5aa9c5a | fast-lane | ✅ |
| A1 | eval-router-A1-r2-1789157337628 | c1d6b66d-1de3-404b-bdf3-2249e3c98aa7 | FEHLER: Unexpected token '`', "```json {""... is not valid JSON | — |
| A1 | eval-router-A1-r3-1789157350997 | 9aae102a-d15f-4b62-bd83-4d6bffa887a9 | fast-lane | ✅ |
| A2 | eval-router-A2-r1-1789157366173 | 25ccdd55-0ee7-487c-b0a4-8a0dc0277f4d | standard | ✗ |
| A2 | eval-router-A2-r2-1789157383008 | 84f54630-973c-413a-a08e-49cf2103293d | fast-lane | ✅ |
| A2 | eval-router-A2-r3-1789157400086 | 5c7f16f0-5df6-48e9-a559-589b8a6a4d71 | fast-lane | ✅ |
| A3 | eval-router-A3-r1-1789157411347 | 23e5d8bc-33bd-45af-817d-ea8dc502f638 | standard | ✅ |
| A3 | eval-router-A3-r2-1789157425652 | 6f6bb6df-abe9-454b-9e89-4ea0e59296b3 | standard | ✅ |
| A3 | eval-router-A3-r3-1789157439013 | b040efdd-e9b0-4b8f-bc34-1d3a2e2139ad | standard | ✅ |
| A4 | eval-router-A4-r1-1789157453378 | 252b3bae-de44-467b-b8aa-8269cd7a42bd | standard | ✅ |
| A4 | eval-router-A4-r2-1789157466654 | 2fdfb14a-919b-41b3-96da-dcde1b232f56 | FEHLER: Unexpected token '`', "```json {""... is not valid JSON | — |
| A4 | eval-router-A4-r3-1789157479656 | 38b53c86-9deb-4929-8961-f43006763fe5 | standard | ✅ |
| A5 | eval-router-A5-r1-1789157489288 | ce86bcf8-feeb-47d3-b1f7-9ed029d6cb7f | hoch | ✗ |
| A5 | eval-router-A5-r2-1789157500433 | 4abfdf1f-d2e3-4a50-ad07-43d85b107f89 | hoch | ✗ |
| A5 | eval-router-A5-r3-1789157510651 | 2d3ea8bd-11f5-412f-b7d9-3c015fc97388 | FEHLER: Unexpected token '`', "```json {""... is not valid JSON | — |
| A6 | eval-router-A6-r1-1789157524874 | 81467c96-5a30-4686-8144-81965b7cd067 | standard | ✗ |
| A6 | eval-router-A6-r2-1789157537123 | 37651bc0-ac21-4fdb-a6c4-3443284ac4fc | standard | ✗ |
| A6 | eval-router-A6-r3-1789157549490 | 21ec8093-0f70-4368-a925-9f36d987c323 | standard | ✗ |
| A7 | eval-router-A7-r1-1789157564295 | 299682b8-7ed8-4cf7-b72b-3a07807f17fa | hoch | ✅ |
| A7 | eval-router-A7-r2-1789157576929 | 045946a3-dd0b-40f0-b416-537733994655 | FEHLER: Unexpected token '`', "```json {""... is not valid JSON | — |
| A7 | eval-router-A7-r3-1789157593157 | 1a9bfd0b-38d8-42ab-9b6e-15dbc0a8bef1 | hoch | ✅ |
| A8 | eval-router-A8-r1-1789157602334 | ef71ecb5-5c66-41c2-a849-6c1e361f72c7 | FEHLER: Unexpected token '`', "```json {""... is not valid JSON | — |
| A8 | eval-router-A8-r2-1789157613491 | f7522169-f298-42dc-957b-1d5c7a3fbac8 | hoch | ✅ |
| A8 | eval-router-A8-r3-1789157625731 | 129f0d37-9f06-4c5e-9ff1-d3c0ed4f0343 | FEHLER: Unexpected token '`', "```json {""... is not valid JSON | — |
| A9 | eval-router-A9-r1-1789157635892 | 7fa5a3e9-2f1d-4293-94ba-4e71db50e22b | fast-lane | ✅ |
| A9 | eval-router-A9-r2-1789157647190 | 61f2e1e3-f39f-4edd-bd24-63f0eda1e7ad | fast-lane | ✅ |
| A9 | eval-router-A9-r3-1789157656537 | 1ae75b9d-0290-494f-a05b-2215bddaaf31 | fast-lane | ✅ |
| A10 | eval-router-A10-r1-1789157668791 | 35545c09-16d4-4718-9f3a-a592ac5a5f17 | hoch | ✅ |
| A10 | eval-router-A10-r2-1789157682200 | 395a8aae-0c89-46b6-8b0a-14e38feff6e8 | FEHLER: Unexpected token '`', "```json {""... is not valid JSON | — |
| A10 | eval-router-A10-r3-1789157696883 | 00a7e6bf-a744-4eca-be4a-c4290acf2662 | FEHLER: Unexpected token '`', "```json {""... is not valid JSON | — |
