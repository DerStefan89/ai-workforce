# Messung GET /api/zustand — B1b-2 nachher (Teilmessung)

Lauf `node scripts/messe-chat.mjs --nur-leerlauf 10 --etikett nachher --ausgabe b1b2` (Leitstand aus dem Hauptordner,
Port 4199, offene Seite `#/dashboard`, Stand nach der Korrekturrunde), gestartet 2026-10-11T20:41:34Z.

**Abbruch:** Nach ≈ 7 min (letzter Zwischenstand 20:48:37Z) hat Claude Code den Lauf beendet, weil der Rechner
kritisch wenig freien Speicher hatte (nicht das Messskript). Ausgewertet ist der minütliche Zwischenstand
`messung-nachher.zwischenstand.json` (200 Abfragen alle 2 s). `--auswerten` des Messskripts liest das
Zwischenstand-Format nicht (fehlende Felder) — die Zahlen unten sind direkt aus `zustand[].ms` gerechnet
(Perzentil = Wert an Position ⌈p·n⌉), für vorher dieselbe Rechnung aus `messung-vorher.json`.

| GET /api/zustand (ms) | n | Median | p95 | Max |
|---|---|---|---|---|
| vorher, ganzer Lauf (10 min, `messung-vorher.md`) | 296 | 51 | 123 | 269 |
| vorher, erste 200 Abfragen (gleiches Fenster) | 200 | 54 | 131 | 269 |
| nachher, 200 Abfragen bis zum Abbruch | 200 | 51 | 149 | 1 303 |

Ausreißer nachher über 300 ms: 301 ms (277 s), 328 ms (283 s), 1 303 ms (309 s) — in den Minuten vor dem Abbruch
wegen Speicherdrucks des Systems; vorher keiner. Ziel P1 (p95 ≤ 300 ms) bleibt erfüllt.

Einordnung: GET /api/zustand liest in B1b-2 keine Datei zusätzlich; neu ist nur das Feld `cliHinweis` aus dem
Speicher (`scripts/leitstand-server.mjs`, Test `scripts/leitstand/routen-harness-abgleich.test.mjs`). Der
Harness-Abgleich wird nur am Kettenende, bei „Prüfung wiederholen“ und über GET …/harness-abgleich bzw. GET
/api/harness gerechnet — nie im Poll. Eine volle 10-min-Wiederholung bei ausreichendem Speicher steht aus.
