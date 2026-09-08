# Journal — F13

Anhängeprotokoll. Neue Einträge unten anfügen, bestehende nicht ändern.

## 2026-09-07 — Akte angelegt (Status READY_FOR_TECH)

Akte auf Grundlage der F13-Challenge (07.09.2026, Repo-Stand `47059cc`)
und der Stefan-Entscheidung E-M2-6 vom selben Tag angelegt. Neun
Akzeptanzkriterien (AK1–AK9), drei Workstreams (WS-1 → WS-2 → WS-3). Vier
neue Findings aus der Challenge ins Register aufgenommen (F-156 bis
F-159). Zentraler Challenge-Befund: die E-186-Eskalation ist kein
planbarer Nachweisfall, weil `bypass_verdacht_anzahl > 0` einen
Bypass-Versuch des Modells voraussetzt
(`src/result-evaluator/index.ts:115–122`); der reale Rückfragefall ist
der normale VERWEIGERT-Lauf.

## 2026-09-08 — WS-1 bis WS-4 real gebaut, AK1–AK9 real erfüllt

Alle neun Akzeptanzkriterien real erfüllt. WS-1 (Wiederaufnahme ohne
JSON, Klärzustand sichtbar, AK1/AK2, PR #98), WS-2 (Entscheidungs-
Schreibpfad, AK3/AK4/AK6/AK7, PR #99), WS-3 (Lineage-Verweis auf
Entscheidung bei Wiederaufnahme, AK5, F-160..F-163 im Register
nachgetragen, PR #100), WS-4 (Entscheidbarkeit, `art:'kenntnisnahme'`,
F-166/F-167, PR #101). AK8/AK9 real nachgewiesen: Bedienung durch Stefan
im Leitstand, Verifikation durch den Technical Challenger lesend über
die Bridge (Hash-Abgleich, keine Simulation). Vollständiges Protokoll:
`features/F13/nachweis-ws3.md`. Status auf `ABGESCHLOSSEN` gesetzt.
