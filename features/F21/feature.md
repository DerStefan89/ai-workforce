# F21 — Workboard + Attention v1

## ID

F21

## Titel

Workboard + Attention v1 (Findings-Projektion, Feature-Akten, Failed Runs)

## Status

Status: FEATURE_GATE

Gültige Status-Werte (geprüft vom Gate, siehe A3a–e in
`features/AF-F001/feature.md`): `ENTWURF, READY_FOR_TECH,
WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN,
BLOCKIERT, ABGEBROCHEN`.

WS-1 (PR #152) und WS-2 (PR #153) sind gemergt, AK1–AK8 erfüllt. AK8:
ACCEPT, Stefan, 14.09.2026 (Realtest, siehe oben). Analog zum
F20-Muster (`features/F20/feature.md`, PR #151).

## Ziel

Alle Arbeitsgegenstände an einem Ort, als reine Projektion über bereits
bestehende Quellen: `state/findings.md` (Findings-Register),
`features/*/feature.md` (Feature-Akten), das Zustands-Aggregat (Failed
Runs). Dazu eine Aufmerksamkeits-Ansicht, die ohne eigenen Poll und ohne
eigenen Endpunkt auskommt — als Client-Projektion über das bereits
gepollte `GET /api/zustand` plus einen einmaligen `GET /api/workitems`-
Abruf beim Betreten der View.

## Nicht-Ziele

Capability Gaps (Quelle heute leer, Zwilling zu F24, siehe `claude/194`
B4) · `GET /api/attention` als eigener Endpunkt oder eigener Poll (würde
`scripts/check-f20-zustand-poll.mjs`, „genau ein `setInterval`", rot
machen — Attention ist Client-Projektion, siehe `claude/194` B5) ·
Schreiben (Priorität ändern, Workitem schließen) — F23 · Interpretation
des Körper-`Status:`-Feldes einzelner Findings-Einträge — v1 zeigt nur
die normalisierte Kopfzeile plus Rohtext · Volltextsuche.

## Akzeptanzkriterien

- **AK1** Jede syntaktisch gültige Kopfzeile in `state/findings.md`
  erscheint als Workitem mit Typ/Priorität/normalisiertem Status
  (`OFFEN|ERLEDIGT|SONSTIGES`, Rohwert als `statusRoh` mitgeführt); Anzahl
  angezeigter Workitems entspricht der Anzahl gültiger Kopfzeilen. Eine
  Kopfzeile, die nicht dem Muster `**F-NNN** · \`TYP\` · PN · Status`
  entspricht, wird als Startfehler gemeldet, nicht verschluckt. Eine
  doppelt vergebene ID oder ein Eintrag ohne `Titel:`-Feld wird ebenfalls
  als Befund gemeldet (Regressionsschutz nach F-367, siehe `claude/194`
  B1).
- **AK2** Jede Feature-Akte unter `features/*/feature.md` erscheint mit
  Titel und Status; die gültige Statusmenge wird aus
  `scripts/check-feature.mjs` übernommen (`gueltigeStatusWerte`), nicht
  neu definiert.
- **AK3** `GET /api/workitems` liefert beide Quellen gefiltert nach
  Typ/Status/Priorität; Sortierung P0→P4 (nicht P0→P3 — P4 existiert real,
  siehe `claude/194` B3).
- **AK4** `sammleLaufKopfdaten` (`scripts/leitstand-server.mjs`) führt ein
  zusätzliches Kopfdatum `kenntnisgenommen: boolean` — wahr, wenn zu
  diesem Lauf eine Entscheidung `art: 'kenntnisnahme'` vorliegt (Muster
  `naechster`-Projektion aus F15 WS-3b: Rechnung auf bereits geladenen
  Daten, kein zusätzliches I/O je Request).
- **AK5** Workboard-View (`#/workboard`) zeigt Liste + Detail, Filter
  Typ/Prio/Status, Sortierung P0→P4.
- **AK6** Gate `scripts/check-f21-workboard.mjs` mit drei kalibrierten
  Rot-Fällen: nicht parsebare Kopfzeile, doppelte ID, fehlendes
  `Titel:`-Feld. In `npm run check` eingehängt.
- **AK7** `npm run check` grün.
- **AK8** Feature Review mit Stefan nach WS-1 (ACCEPT/ADJUST/REJECT) vor
  Beginn von WS-2 (Attention-View, Dashboard-Zahlen) — Änderungsrisiko
  HIGH (Informationsarchitektur).
  ACCEPT, Stefan, 14.09.2026.

## Dependencies

F20 (Status FEATURE_GATE, AK7 ACCEPT — erfüllt). Blockiert F22.

## Workstreams

- **WS-1** (dieser Auftrag): `src/workboard/` (Parser + reine Funktionen),
  `GET /api/workitems`, `kenntnisgenommen`-Kopfdatum, Gate. Danach Feature
  Review.
- **WS-2** (folgt nach ACCEPT): Workboard-Liste/Detail-View,
  Attention-View als Client-Projektion, Dashboard-Zahlen. Optional im
  selben Zug: F-363 (Lauf-Detail-Polling über
  `abonniereDetailAuffrischer`, siehe `claude/194` Abschnitt 4).

## Risiken

Registerformat ist Freitext-Konvention, kein Schema (`claude/194` B2) —
Verwerfungsbedingung bei zweimal echtem Parserbruch: Migration nach
`findings.json` erwägen, nicht den Parser weiter aufweichen.
Doppelzählung Finding↔Feature bei gleichem Gegenstand: v1 zeigt beide
nebeneinander, keine Verknüpfung.
