# Plan v2 — F45 B5b-2c-1 „Entwicklung: Zuordnung, Kanban · Priorität, Bug-Felder“

Grundlage: `plan-b5b2c.md` (v1) → `advisor-b5b2c.md` (Freigegeben mit Hinweisen, weiterer Schnitt) → Entscheidungen Challenger
25.10.2026 (Schnitt 2c-1/2c-2, A2–A4 übernommen, Zuordnung um Meilenstein-Bezug erweitert). Kein zweiter Advisor-Pass (Regel 3a).
Nur 2c-1; 2c-2 (Gantt „Pflege & Fixes“, Bereinigungs-Standardoption, STATUS.md F25, F-1206, F-1010) ist der nächste Auftrag.
Keine Serveränderung, kein neues Gate (F-1190), ARCHITECTURE.md unverändert (F-1191).

## 1 Zuordnung (neu `public/leitstand/befund-zuordnung.js` + Test)

- Regel (DEKLARIERT „erste gewinnt“): erste ganze Feature-ID aus „Feature/Run“, die in roadmap.json steht ⇒ Feature; sonst erste ganze
  Meilenstein-ID aus roadmap.json ⇒ Meilenstein; sonst „Pflege & Fixes“. „Ganz“ = davor kein `[A-Za-z0-9_-]`, danach kein
  `[A-Za-z0-9_]` — Muster wie `nenntFeature` (`eintrag-bausteine.js`, B8), nach dem Token darf `-` folgen (`M3-Challenge`,
  `F21-Akte`); `F-002`, `AF-F001`, `S-M3-01b` treffen nicht, `F6b` trifft nicht `F6a`, `M1` nicht `M10`.
- Bausteine: `roadmapIds(roadmap)`, `zuordnungVon(befund, ids)`, `offenerP02Befund(w)`, `ordneBefundeZu(workitems, roadmap)` →
  `{ jeFeature, jeMeilenstein, pflege }` (nur offene P0–P2, sortiert nach Priorität, dann Quellreihenfolge) oder null.
- Tests mit echten Grenzfällen (F-002, AF-F001, F6b/F6a, M3-Challenge, S-M3-01b, M1/M10, mehrere IDs, Feld fehlt) und Rauchtest
  gegen den Arbeitsbaum (Zahlen in der Akte).

## 2 Kanban · Priorität (`entwicklung-daten.js` rein, `views/workboard.js`)

- Spalten `P0 · Kritisch`, `P1 · Hoch`, `P2 · Normal`, `P3 · Später`, `Ohne Priorität` (Vorlage `d_arbeit_prioritaeten.png`).
- `featurePrioritaeten(roadmap)` → Map id → P0..P3 aus GET …/roadmap (`features[].prioritaet`, A4) oder null.
- `baueKanbanPrioritaet(workitems, prioritaeten, { typ, pflege, roadmap, voll })` → `{ spalten: je Spalte { karten, anzahl, weitere,
  p4 }, typen }` oder null. Karten: offene Features (Status ∉ ABGESCHLOSSEN/ABGEBROCHEN; Priorität aus der Map, sonst „ohne“) und offene
  Befunde (OFFEN; P0–P3, **P4 in P3** mit Chip „P4“ und „davon n P4 (Alt-Bestand)“, A2). Features zuerst, sonst Quellreihenfolge;
  höchstens 12 je Spalte, „Alle n hier zeigen“ klappt die Spalte auf (B13).
- Filter: Typ-Chips (Alle + Typen der offenen Karten) und „Pflege & Fixes“ (A3: nur offene P0–P2 ohne Feature-/Meilenstein-Bezug;
  P3 und „ohne“ dann leer mit Satz; ohne Roadmap gesperrt mit Grund). Keine Suche (B13).
- Modus-Schalter: Status | Priorität (aktiv) | Zeitleiste („kommt“). Im Prioritätsmodus ersetzen die Filter die Ansicht-Chips.
  Satz über dem Board: nur offene Einträge, nur lesen, Ändern kommt; Features außerhalb der Roadmap unter „Ohne Priorität“ (A4).
- Roadmap im Workboard: eigener Anfragezähler, beim Betreten/„Neu laden“/Projektwechsel, nie aus dem Poll (B12). Lädt ⇒ Hinweis,
  Fehler ⇒ Hinweis „Prioritäten der Features nicht ladbar“, Features unter „ohne“.
- CSS: Modifikator `.pm-board.prioritaets-board` mit 5 Spalten (B9), mobil wie das Status-Board; nur vorhandene Tokens (`--muted`).

## 3 Eintrag-Detail (`views/workboard-detail.js`)

- Bug-Felder: Nachstellen, Erwartet, Tatsächlich, Ursache im „Fehlerbild“; Regressionstest in der vorhandenen Kachel von
  `behebungBlock` (B7). Fehlt ein Feld: „fehlt“ (E-B5-5). Im „ganzen Eintrag“ die fünf Felder ergänzt. Schritt „Nachstellen“ bleibt
  „kommt“ (Schritt, kein Feld). Test `workboard-detail.test.mjs` anpassen.
- Feature-Priorität in „Deine Planung“ aus `sicht.roadmap` (dieselbe Projektion wie der Meilenstein, A4) statt fest „ohne Priorität“.

## 4 i18n, Tests, Nachweis, Akte

- de/en/tr/ru. Tests: `befund-zuordnung.test.mjs`, `entwicklung-daten.test.mjs`, `views/workboard-detail.test.mjs`.
- Gates einzeln (f20, f44-i18n, f21-workboard, f21-ws2, f45-b5b1a, feature, docs, status-akten), dann `npm run test`.
- Nachweis `nachweise/b5b2c1/` ≤ 8 MB WebP gegen Wegwerf-Kopie (Kopie: `Priorität: P1` in der Akte F45), wartet auf Ladeende:
  Kanban dunkel/hell 1440/390, Filter „Pflege & Fixes“, Bug-Detail F-1186 und ein Bug ohne Felder, Feature-Detail mit Priorität.
- Akte: „Stand B5b-2c-1“, Schnitt-Tabelle 2c-1/2c-2, Zahlen der Zuordnung. F-917 (a) erledigt mit Abweichung P4 (A2).
