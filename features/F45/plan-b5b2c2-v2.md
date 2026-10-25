# Plan v2 — F45 B5b-2c-2

Grundlage: `plan-b5b2c2.md` (v1) → `advisor-b5b2c2.md` (Freigegeben mit Hinweisen, weiterer Schnitt: Teil C vorab). Kein zweiter
Advisor-Pass (Regel 3a). Schnitt nach der Vorgabe des Auftrags („schneidet der Advisor: Teil C zuerst als eigenes kleines Paket“):

| Paket | Inhalt | Stand |
|---|---|---|
| 2c-2-C | Teil C (E-BRAIN-2, E-R-1 = A in Akte F45, `fixpaket-f45.md`, Akte F30, F-1202, F-980) + Test-Einstufung (`src/git-starter/git-starter.test.ts` seriell, F-1209) | dieses Paket |
| 2c-2-AB | Teil A (Gantt „Pflege & Fixes“, Zähler, Trennzeile, „Zugeordnet zu“) + Teil B ohne Test-Einstufung | nächster Auftrag |

## 2c-2-C (dieses Paket)

- Entscheidungen wörtlich aus dem Auftrag; sichtbare Widersprüche benannt statt still umgedeutet (B8): E-BRAIN-1 „Stufen 2/3 nach
  F30“, E-F45-2 „fällig nach R“, E-VORSCHAU-1 „Stufe 2 nach R“, Scope R2 „Abhängig von R, B3“.
- Workstreams: R → `verworfen` (kein Abgenommen-Datum nötig), neue Zeilen `Brain-2`, `Brain-3` mit 9 Zellen (B8).
- F-1209 „behoben (serielle Gruppe), Bestätigung über Stefans Läufe offen“ (A2), nicht „erledigt“.
- Gates einzeln: check-f45-b5b1a-planung, check-feature, check-docs, check-status-akten, check-akte-meilenstein; `node --test
  scripts/teste.test.mjs`. Kein `npm run test` nötig für reine Doku plus Listenänderung — läuft trotzdem einmal (F-1205: Abbruch
  ⇒ melden).

## 2c-2-AB (nächster Auftrag) — Änderungen gegenüber v1

- A1: Workstream B5b-2 bleibt `laeuft`, Notiz „2c-2 gebaut“; Abgenommen/Ist setzt der Challenger nach dem Merge. Überholt durch den
  Auftrag 2c-2-AB (25.10.2026): „auf erledigt, sofern die Ist-Zelle es zulässt“ — `erledigt` mit Ist „–“ und dem erwarteten
  Merge-Datum (Akte, Zeile B5b-2).
- Überholt durch den Auftrag 2c-2-AB: die Nachrüstung von `nachweise/b5b2c1/erzeuge-nachweis.mjs` (letzter Punkt unten) entfällt.
- A2: F-1186 bleibt offen mit Nachtrag „siehe F-1209“, solange Stefans Läufe nicht als Beleg genannt sind.
- A3: „Zugeordnet zu“: Feature bzw. Meilenstein; sonst „ohne Feature-/Meilenstein-Bezug“, Zusatz „(Spur Pflege & Fixes)“ nur bei
  offen P0–P2; ohne roadmap.json `entwicklung.detail.planung.keineRoadmap`.
- A4: Vormerker in `oeffneKanbanPrioritaet`: `wechsleTab('board', null, false)`, `boardModus = 'prioritaet'`, Vormerker, `renderModi()`;
  übernommen nur bei aktueller Antwort mit `ok`; verfällt bei fehler/nicht_vorhanden, `wechsleTab`, Projektwechsel, Klick auf einen
  Kanban-Filterchip, Moduswechsel. Verdrahtungstest in `projekt-wechsel.test.mjs`-Art (B12), sonst Wegfall des Vormerkers.
- F1: Meilenstein-Zähler = direkt + Features, Detail „davon m direkt“; Doppelzählung bei zwei Meilensteinen DEKLARIERT.
- B1–B7, B9, B10, B11 wie im Advisor; `trenner.befunde` nur mit Zuordnung (B3); feste i18n-Schlüssel für Legende/Spur-Chip (B4);
  Wartehilfe mit Zeitgrenze und Nennung des restlichen Platzhalters, Playwright nicht auf oberster Ebene (B9).
- Nachrüstung `nachweise/b5b2c1/erzeuge-nachweis.mjs`: der Auftrag verlangt sie ausdrücklich („beide Skripte nutzen sie“), der
  Advisor rät ab (unbelegt, Bilder nicht neu). Bleibt drin (Auftrag gilt), Kopfkommentar sagt, dass die Bilder älter sind.
