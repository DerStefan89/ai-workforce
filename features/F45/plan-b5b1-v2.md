# Plan B5b-1 „Planungsdaten“ — v2 (Teilpaket B5b-1a „Planungsdaten lesen“)

Stand 24.10.2026. Grundlage: Plan v1 `features/F45/plan-b5b1.md` (bleibt unverändert), Advisor `features/F45/advisor-b5b1.md`
(Nicht freigegeben, Schnitt A1), Entscheidungen Challenger 24.10.2026 (alle [EMPFEHLUNG] Challenger, reversibel; Wortlaut in
`features/F45/feature.md` → Entscheidungen). Kein zweiter Advisor-Pass (Regel 3a). Danach code-reviewer und qa mit frischem
Kontext, höchstens eine Korrekturrunde. B5b-1b „Planungsdaten schreiben“ bekommt einen eigenen Plan auf dieser Grundlage.

## Schnitt (A1 angenommen)
- **B5b-1a (dieser Bau, ≈ 0,4–0,5 AT):** Format, Gate R1 mit Datendatei (nur gelesen), Migration F45, Akte F30, Bug-Felder,
  Projektion je Feature plus `roadmap_hash`, Zeitachse und Kennzahlen als reine Funktionen, F-1010/F-1175. **Server unverändert,
  der Kern schreibt nichts.**
- **B5b-1b (später, ≈ 0,35–0,45 AT):** PUT planung, GET/POST Bereinigung, ARCHITECTURE §2-Ausnahme zuerst (A2), CRLF in
  roadmap.json ⇒ 422 (A3), CSRF-Probe je Route mit Methodenwahl im Server je `art` (B3), Rückbau-Test, B4 (Meilenstein-Wechsel
  gegen Ausnahmen/ENTWURF/Ausplanen: 422 „erst bereinigen“, nur neue Befunde blockieren), O5 (Meilenstein → LAEUFT ohne
  Änderungszeile), C4.
- **Offener Punkt für B5b-1b (B6, Entscheidung 9):** Bereinigung auf ABGESCHLOSSEN schreibt die passende Standardform-Zeile in
  `docs/STATUS.md` mit; ist sie maschinell nicht eindeutig ⇒ 422 „STATUS.md von Hand“, nichts geschrieben. Vorschlagstext nennt
  die Nebenwirkung „Meilenstein wird aktueller Meilenstein“ (B6).
- Nicht in die Projektion: „Pflege & Fixes“ und Kanban (B1, P2) — B5b-2 leitet beides aus `/api/workitems` und `prioritaet` ab.

## 1 Format — `src/workboard/feature-planung.ts` (rein, eine Quelle)
- `Priorität: P0|P1|P2|P3` — erste Zeile `^Priorität:[ \t]*(.*)$`; fehlt ⇒ `null`; anderer Wert ⇒ Befund.
- `Abgenommen: JJJJ-MM-TT[ Freitext]` — erste Zeile `^Abgenommen:`; überall muss der Wert mit einem gültigen Kalenderdatum
  beginnen (O2); Pflicht nur bei Status ABGESCHLOSSEN **und** strengem Abschnitt. Prosa „Abgenommen durch Stefan am …“ (F32,
  F33, F36, F40, F42) trifft das Muster nicht (Doppelpunkt direkt hinter „Abgenommen“) und bleibt unberührt. F35 wird
  umformatiert. Grenze C9 DEKLARIERT.
- `## Workstreams` — exakte Überschrift (C1, „## Workstream-Liste“ trifft nicht); streng, wenn die erste nicht-leere Zeile mit
  `|` beginnt; Bullet-Abschnitte bleiben Prosa (`workstreams: null`). Streng:
  Kopf exakt `| ID | Art | Titel | Status | Schätzung AT | Ist AT | Begonnen | Abgenommen | Notiz |`, Trennzeile mit 9
  Zellen `---`, Zeilen mit 9 Zellen bis zur ersten Zeile ohne führendes `|`; danach Prosa (auch eine zweite Tabelle). ID nicht
  leer und eindeutig; Art ∈ workstream|fixpaket|design; Status ∈ geplant|laeuft|erledigt|verworfen; Schätzung `–`/`-` | `x` |
  `min–max` (Komma oder Punkt, Trenner `–` oder `-`), min ≤ max; Ist `–` | Zahl; Begonnen/Abgenommen `–` | ISO; erledigt ⇒
  Abgenommen gesetzt. Zelle mit `\|` nicht unterstützt (DEKLARIERT). Zeilenenden LF und CRLF.
- `lesePlanung(inhalt)` → `{ prioritaet, abgenommen, workstreams, befunde }`; `pruefePlanung(inhalt, status)` → Befunde.
- `pruefeFeatureAkteInhalt` hängt `pruefePlanung` an ⇒ `check-feature`, PUT/POST Akte (B5a-1) prüfen dieselbe Regel.
- Eigener Abschnittsleser statt `findeAbschnitt` (src/feature-auftrag importiert src/workboard — kein Ring); dieselbe Regel
  „exakte Überschrift bis zur nächsten `## `“.

## 2 Gate R1 — `src/workboard/roadmap-regeln.ts` (rein) + `docs/projekt/roadmap-ausnahmen.json` (O1)
- Datei `{ "schema": "v0", "status_ausnahmen": [{ "meilenstein", "feature", "grund" }] }`, LF, liegt neben roadmap.json;
  fehlt ⇒ keine Ausnahmen; ungültig ⇒ Befund, nie Wurf. Fünf Einträge M3/F18, M4/F20, F21, F22, F25 mit grund
  „Bereinigung offen — Bestätigung Stefan (Bereinigungsliste)“.
- `leseStatusAusnahmen(text|null)` und `pruefeMeilensteinStatus(roadmap, aktenStatus, ausnahmen)` → `{ abweichungen, befunde }`:
  ABGESCHLOSSEN-Meilenstein mit Feature ≠ ABGESCHLOSSEN ohne Ausnahme ⇒ Befund; Ausnahme verwaist (Meilenstein fehlt/nicht
  ABGESCHLOSSEN, Feature nicht darin, Feature ABGESCHLOSSEN), doppelt, ohne Grund, fremde Felder ⇒ Befund. Zwei Ausnahme-Orte
  (Skript für IDs, Datei für Status) DEKLARIERT.
- `check-akte-meilenstein.mjs` ruft beides zusätzlich; Ausnahme `ohne_akte` F30 entfällt.

## 3 Migration
- **F45** (A4/O3): neuer Abschnitt `## Workstreams` hinter `## Scope`; Zeilen = `docs/projekt/fixpaket-f45.md` §3 in deren
  Reihenfolge (entspricht Z. 121 für alle offenen Zeilen), B5b-1 ersetzt durch B5b-1a/B5b-1b (Entscheidung 1). Die Scope-Tabelle
  verliert „Schätzung AT“ und „Ist“ (keine zweite Kopie). Regeln:
  - ID = WS-Kürzel aus §3 (FB-1, FB-2, V1 gekürzt); Titel = Kurzname aus „Inhalt“ (wörtlich, ohne Klammerzusätze).
  - Schätzung = führende Zahl/Spanne der §3-Zelle (≈ entfällt, C11), sonst `–`; Zusätze wörtlich in Notiz.
  - Ist = Zahl hinter „Ist ≈“ in der §3-Zelle bzw. B0 „≈ 1 AT“ aus der alten Scope-Spalte; sonst `–` (P: „+ 6 h“ ⇒ `–`).
  - Status/Abgenommen aus git (Datum des Merge-Commits auf main, PR in Notiz); erledigt nur, wenn alle Teile gemergt; laeuft
    B5b-1a (Begonnen 2026-10-24); sonst geplant; Begonnen sonst `–`. „Abgenommen = Merge-Datum“ ist eine Deutung (C6,
    DEKLARIERT im Abschnittstext). Widersprüche der alten Quelle (C5) wörtlich in Notiz.
  - Art: workstream (ungeteilter Baustein oder Sammelzeile), fixpaket (Teilpaket eines geteilten Bausteins), design (B3, R2);
    Bedeutung im Abschnittstext.
  - Abweichung: die Sammelzeile B2b bleibt (erledigt, ohne Ist), weil §3 nicht alle Teilpakete als Zeile führt (B2b-3a,
    -3b-2a, -3b-2b-1a/-1b, -4a-*, -4b) — für R5 unschädlich (erledigt), für „Plan gegen Ist“ ohne Ist ausgeschlossen.
- **F30**: Akte ENTWURF aus E-M5-15, Zielsatz/Bestehensbedingung M5 (AK aus Punkt 1–5, Punkt 6 Messung), E-M5-16/17
  (Nicht-Ziele), E-F30-3 → F43 (Dependency); offene Punkte „offen“; `## Workstreams` streng mit Kopf, ohne Zeilen, Notiz
  „noch nicht geschnitten (offen)“.
- **F35**: `Abgenommen: 2026-09-28 (Stefan; …)` — Datum und Text aus der Bestandszeile.

## 4 Projektion — `scripts/leitstand/routen-roadmap.mjs` + `src/workboard/roadmap-planung.ts` (rein, Parameter `heute`)
- roadmap.json einmal als Bytes gelesen ⇒ `roadmap_hash` (sha256, `sha256Hex` aus `src/checkpoint-store`, C10) aus demselben
  Lesevorgang (B2); Top-Level-Zusätze nur bei `status: 'ok'` (C2).
- je Feature additiv: `prioritaet`, `abgenommen`, `workstreams` (null = keine Daten), `planung_befunde`; Status über
  `leseFeatureStatus` (B7: eine Regel, `[ \t]*`).
- `zeitachse.eintraege[]`: offene Einträge (Feature nicht ABGESCHLOSSEN/ABGEBROCHEN; Zeile geplant/laeuft) in Roadmap-Reihenfolge:
  mit Schätzung `start_at` = Σ min davor, `ende_min_at`, `ende_max_at` = Σ max bis einschließlich; ohne Schätzung
  `fruehestens_ab_at`, **keine Länge**; Feature ohne Daten oder mit `[]` = ein Eintrag ohne Schätzung (B5); `nach_unbekannt`
  hinter einem Eintrag ohne Schätzung (C3). Ist-Zone: erledigte Zeilen mit Abgenommen ⇒ `ist_ende_at` = −Arbeitstage bis heute
  (Mo–Fr), `ist_start_at` aus Begonnen, sonst ende − Ist, sonst nur Punkt.
- `kennzahlen`: R2 `meilensteine {abgeschlossen, gesamt}` und `features_abgenommen {abgenommen, gesamt}` gegen die Akten (eine
  Statusregel; führende Zählung für B5b-2 = diese Projektion, B7); R5 `bis_fertig[]` je nicht abgeschlossenem Meilenstein
  (kumuliert; `berechenbar:false` + `ohne_schaetzung` sobald ein offener Eintrag ohne Schätzung ist), `plan_gegen_ist` über
  erledigte Zeilen mit Schätzung und Ist. Grenze C7 (F30 bleibt bis zum Schnitt ohne Schätzung ⇒ „Bis M5“ ehrlich nicht
  berechenbar).

## 5 Bug-Felder (F-975, E-B5-5)
`FELD_MUSTER`/`FELD_NAME_ZU_SCHLUESSEL` um Nachstellen, Erwartet, Tatsächlich, Ursache, Regressionstest; `FindingWorkitem`
additiv `nachstellen`, `erwartet`, `tatsaechlich`, `ursache`, `regressionstest` (string|null). Keine Pflicht, keine Rückmigration.

## 6 Gate `scripts/check-f45-b5b1a-planung.mjs` (in check:gates), Rot-Nachweis je Regel
(a) Formfehler Workstreams (Kopf, Zellenzahl, Art, Status, Datum, doppelte ID) · (b) min > max · (c) erledigt ohne Abgenommen ·
(d) R1-Verstoß ohne Ausnahme · (e) verwaiste Ausnahme · (f) Projektion „Schätzung fehlt“ ohne Länge · (g) „Bis M5“ nicht
berechenbar bei fehlender Schätzung (auch `[]`) · (h) LF/CRLF der Akte gleich gelesen · (i) echte Akten: F45/F30 streng und
gültig, F30-Ausnahme weg, Datendatei mit 5 Einträgen, R1 grün · (j) Bullet-Altakten bleiben `null`, Abgenommen-Pflicht nur mit
strengem Abschnitt. Dazu node:test je neues Modul und Bug-Felder.

## 7 Doku/Findings
F45-Akte: Entscheidungen (E-B5-3, E-B5-5, E-B5-6 = B, E-KANBAN = A, Schnitt A1, A2, A3, O1, O2, O5, B6), Status-Absatz, Abschnitt
„Stand B5b-1a“. `docs/projekt/fixpaket-f45.md`: B5b-1 → B5b-1a/B5b-1b (≈ 0,4–0,5 / 0,35–0,45), B5b-2 + „Prioritäts-Kanban
lesend (E-KANBAN = A, F-917)“, 1–1,4 AT; E-B5-6 = B, E-KANBAN = A unter Entscheidungen. `docs/STATUS.md`. Findings: F-1010
berichtigt, F-1175 erledigt, F-1177 Nachtrag, F-917 Vermerk (E-KANBAN = A erfüllt (a), erweitert um Akten-Priorität),
F-976/F-944/F-990/F-984/F-1010/F-975 Nachtrag (Daten B5b-1a, Rest B5b-1b/B5b-2), neue Restfunde ab F-1185. Lagebild.

## 8 Gates/Tests (Entscheidung 10)
Kein voller `check:gates`. Einzeln: neues Gate, check-feature, check-akte-meilenstein, check-status-akten, check-f33-*,
check-docs, check-f21-workboard, check-wachstumsbremse-server, Lint, Typprüfung, betroffene node:test-Dateien; F45-B2b-2 einzeln
gegenprüfen. Den vollen Lauf macht Stefan vor dem Commit.
