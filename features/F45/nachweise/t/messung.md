# Messung F45 T „Tests stabil“ — Laufzeit und Speicher je Gate und Testdatei

Stand 24.10.2026, Branch `f45/t-tests-stabil` (Basis `28cba04`, B5b-1b-2), Claude-Code-Sitzung auf Stefans Rechner
(Windows 11, Node 24). Werkzeug: `node scripts/messe-check.mjs` — jeder Befehl einzeln nacheinander, nie zwei
gleichzeitig. Rohdaten: `messung-teillog.txt` (eine Zeile je Befehl: Ergebnis, Zeit, max RSS Node, Δ System).

## Umfang und Abbruch

- Gemessen: **266 von ≈ 321 Befehlen** — alle 122 Gates aus `check:gates` und 144 von 199 Testdateien (alphabetisch
  bis `src/entscheidung/entscheidung.test.ts`). Alle 266 grün.
- Nicht gemessen: die übrigen ≈ 55 Testdateien (`src/entscheidung/…` bis `src/workflow/…`).
- Abbruch: Claude Code hat den Messprozess beendet, weil der **Rechner im Leerlauf der Sitzung** kritisch wenig freien
  Arbeitsspeicher hatte („stopped because the system is running low on memory“). Kein Fehler des Skripts, kein roter
  Befehl. Auf Entscheidung des Challengers (Weg B) wurde nicht nachgemessen.
- Summe der Laufzeit, einzeln gemessen: Gates 704 s (≈ 11,7 min), 144 Testdateien 335 s (≈ 5,6 min). Die Werte
  liegen deutlich über dem vollen Lauf im frischen Terminal (5,8–7,8 min gesamt) — Messaufwand je Prozess
  (`--import`-Haken, Kindprozess je Befehl) und der Speicherdruck der Sitzung verlangsamen; für die Rangfolge
  reicht es.

## Spalten

- **max RSS Node:** größte Speicherspitze eines einzelnen Node-Prozesses des Befehls (`process.resourceUsage().maxRSS`,
  über `NODE_OPTIONS=--import` in jedem Node-Prozess erfasst, auch in Kindprozessen von `node --test`).
- **Δ System:** größter Rückgang des freien Systemspeichers (`os.freemem()`, alle 200 ms) gegenüber dem Start des
  Befehls — erfasst auch git, Biome, nativen tsc und Kindprozesse, ist aber durch andere Prozesse verrauscht.

## Die 10 teuersten (nach Laufzeit)

| # | Befehl | Zeit (s) | max RSS Node (MB) | Δ System (MB) |
|---|---|---|---|---|
| 1 | `node scripts/check-f15-workflow.mjs` | 95,3 | 270 | 66 |
| 2 | `src/arbeitsordner/arbeitsordner.test.ts` | 58,5 | 76 | 446 |
| 3 | `node scripts/check-f45-b2b2-pruefer.mjs` | 43,7 | 113 | 76 |
| 4 | `scripts/leitstand/routen-code.test.mjs` | 41,4 | 107 | 103 |
| 5 | `node scripts/check-f45-fb1b-faehigkeit-uebernehmen.mjs` | 36,8 | 134 | 125 |
| 6 | `node scripts/check-f36-ws5b-skill.mjs` | 31,7 | 118 | 191 |
| 7 | `scripts/leitstand-arbeitsordner.test.mjs` | 28,8 | 112 | 118 |
| 8 | `scripts/leitstand/routen-faehigkeit-vorschlag.test.mjs` | 28,8 | 95 | 116 |
| 9 | `src/claude-code-gateway/claude-code-gateway.test.ts` | 26,0 | 182 | 357 |
| 10 | `node scripts/check-f45-b2a3b-review-stand.mjs` | 25,4 | 108 | 116 |

Größte Speicherspitzen außerhalb der Top 10: `check-f45-f3b1-freigabe.mjs` 169 MB Node; Δ System
`check-f14-abbruch.mjs` 330 MB, `npm run lint` 295 MB, `routen-harness-abgleich.test.mjs` 234 MB (17,5 s).

## Befund

1. **Speicherdruck kommt aus der Umgebung, nicht aus einzelnen Gates.** Die Messung lief strikt seriell; kein
   Node-Prozess lag über 270 MB, kein Befehl hob den Systemverbrauch um mehr als ≈ 450 MB. Trotzdem lief der Rechner
   im Leerlauf der Sitzung in den Speichermangel. Kein Gate muss für die Sitzungstauglichkeit umgebaut werden;
   die Sitzung (Modell-Prozess, Subagenten) plus Rechner lassen für den vollen Lauf keinen Platz. Folge
   (Challenger): der volle Lauf gehört ins frische Terminal (E-PRUEF-1 = A, F-1154), die Sitzung fährt einzelne
   Gates und `npm run test`.
2. **Schwere Testdateien** (seriell in `scripts/teste.mjs`): die drei Last-Ausfälle aus F-1186
   (`leitstand-arbeitsordner`, `routen-code`, `routen-harness-abgleich`) und aus der Messung
   `src/arbeitsordner/arbeitsordner.test.ts`, `scripts/leitstand/routen-faehigkeit-vorschlag.test.mjs`,
   `src/claude-code-gateway/claude-code-gateway.test.ts`. Kein Zeitfaktor > 1: einzeln liefen alle grün.
3. **Nebenfund Testsuche 96 s → 1,2 s.** `node --test` ohne Pfadangabe durchsucht jedes Verzeichnis, auch
   gitignorierte. Lokal liegen `kontrollzustand-roh/` (12 784 Dateien, ≈ 44 s Suche) und 18 Ordner
   `kontrollzustand-test-*` (Reste, F-590; die neun `kontrollzustand-test-f1x-*` je ≈ 6 s). Allein die Suche dauerte
   ≈ 96 s, bevor ein Test lief. `scripts/teste.mjs` sucht über `git ls-files --cached --others --exclude-standard`
   mit denselben Mustern: 1,2 s, dieselbe Menge (197 = 197, Vergleich gegen die Dateiliste von `node --test`
   aus dessen TAP-Ausgabe). Erklärt einen Teil des Wachstums 5,8 → 7,8 min (der Rohstrom-Ordner wächst je echtem
   Lauf).
4. **Gates sind der größere Block:** 122 Gates ≈ 704 s gegen 144 Testdateien ≈ 335 s (einzeln gemessen). Die
   Inventur der Gates (Verhalten / Struktur-Invariante / Codeform) ist W2 (F-1190), nicht dieser Auftrag.

## Testlauf nach dem Umbau (ein Versuch in der Sitzung)

`npm run test` (= `node scripts/teste.mjs`), 24.10.2026, Claude-Code-Sitzung: **grün, Exit 0, 359 s**.
Parallele Gruppe 193 Dateien: 2 637 Tests, 2 634 bestanden, 3 übersprungen, 0 rot (145 s). Serielle Gruppe 6 Dateien:
179 Tests, 178 bestanden, 1 übersprungen, 0 rot (211 s). Kein Speicherabbruch. Die drei vollen Läufe `npm run check`
(P4) fährt Stefan im frischen Terminal (Commit-Block, E-PRUEF-1 = A).
