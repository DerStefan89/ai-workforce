# Plan v1 — F45 B5b-2c „Roadmap: Pflege & Fixes, Kanban · Priorität, Bug-Felder“

Auftrag: Challenger, 25.10.2026 (letztes Teilpaket des Schnitts B5b-2 in `feature.md`, „Stand B5b-2a“). Basis `d3b217e`
(enthält #382 und die R1-Bereinigung #383), Branch `f45/b5b2c-pflege-kanban`. Alles lesend aus GET …/workitems (`holeWorkitems`),
nicht aus der Roadmap-Projektion (Advisor B5b-1 P2). Keine Serveränderung, kein neues Gate (F-1190), ARCHITECTURE.md unverändert
(kein neuer Schreibweg, F-1191). Nicht: Ziehen im Kanban, Zeitleiste (bleibt „kommt“), Schätzfeld im Befund, Meilenstein-Bezug.

## 0 Echte Datenlage (Arbeitsbaum `d3b217e`, `parseFindings` + `roadmap.json`)

- 746 Befunde, 683 offen (Status OFFEN), davon P0 0 · P1 51 · P2 263 · P3 348 · P4 21 (P4 nur Alt-Bestand, Gate f21 (5)).
- Offen P0–P2: **314**. Mit Regel (a) (erste Feature-ID im Feld „Feature/Run“, die in roadmap.json steht):
  **240 an 38 Features, 74 in „Pflege & Fixes“** (73 ohne Treffer, 1 ohne Feld). Größte: F45 45, F16 25, F15 15, F41 15, F35 9,
  F44 9, F8 8, F32 8, F39 8 (Rest ≤ 7). 11 Befunde nennen mehrere Features (z. B. F-093 „F0/F1/F3“, F-134 „F11, F8, F12“) ⇒ erstes gewinnt.
- Keine starke Abweichung (F45 = 14 %). Auffällig: der Großteil hängt an abgeschlossenen Features aus M1–M4 (alte, offen
  gebliebene Befunde) — so ist die Datenlage, kein Fehler der Regel.
- Vorschlag (nicht gebaut, Sollvorgabe „oder Meilenstein“): 12 der 74 nennen einen Meilenstein als Token mit Bindestrich-Zusatz
  (`M3-Challenge`, `M5-Schnitt`, `M1-Abschluss`): Regel „sonst erste Meilenstein-ID `(?<![\w-])M\d+(?![\w])` aus roadmap.json ⇒ am
  Meilenstein“. Ohne Bauauftrag nicht umgesetzt; im Bericht und in der Akte.
- Kein Befund trägt eine Schätzung (das Format kennt kein Feld; `FindingWorkitem` hat keins) ⇒ in „Pflege & Fixes“ nie ein Balken,
  nie eine Marke. Ein Schätzfeld wäre eine Parser- = Serveränderung ⇒ nicht in 2c.
- Keine Akte trägt heute `Priorität:` (0 Treffer) ⇒ im Kanban stehen alle Features unter „ohne Priorität“, bis Stefan sie setzt
  (Anpassen, B5b-2b-1).
- Bug-Felder: genau 1 Befund trägt alle fünf (F-1186, BUG, offen — Nachweis „mit Feldern“).

## 1 Reine Bausteine (neu `public/leitstand/befund-zuordnung.js` + Test)

- `ROADMAP_FEATURE_TOKEN = /(?<![A-Za-z0-9_-])F\d+[A-Za-z]?(?![A-Za-z0-9_])/g` (ganze Tokens; `F-002` und `AF-F001` treffen nicht,
  `F6b` trifft nicht F6a).
- `roadmapFeatureIds(roadmap)` → Set aller `meilensteine[].features[].id` (gültige Projektion, sonst leer).
- `zielFeature(befund, ids)` → erste ID in Textreihenfolge von `featureRun`, die in `ids` steht, sonst null.
- `offenerP02Befund(w)` ⇔ `quelle === 'finding' && status === 'OFFEN' && prioritaet ∈ {P0,P1,P2}`.
- `ordneBefundeZu(workitems, roadmap)` → `{ jeFeature: Map<id, Befund[]>, pflege: Befund[] }` (nur offene P0–P2; je Liste sortiert
  nach Priorität, dann Quellreihenfolge) oder `null` ohne Workitem-Liste bzw. ohne gültige Roadmap.
- Regel im Kopfkommentar und in der Akte (Stand B5b-2c).

## 2 Gantt (`roadmap-anzeige.js` rein, `views/roadmap.js` rendert)

- `ganttZeilen(roadmap, zustand)` nimmt optional `zustand.zuordnung` (Ergebnis von `ordneBefundeZu`; null/undefined ⇒ wie heute).
- Feature-Zeile: `befundeOffen: Zahl | null` (null = Workitems fehlen). Kurzinfo nur bei n > 0: „n offene Befunde (P0–P2)“.
  Detailpanel: Feld „Offene Befunde“ = „n (P0–P2)“ bzw. „keine“ bzw. „nicht verfügbar“; kein Balken, keine Zeile je Befund.
- Gruppenzeile „Pflege & Fixes“ (`art: 'pflege'`, `farbe: 'bug'`, `ebene 0`) in `oben` direkt nach den offenen Meilensteinen, nur
  wenn `zuordnung` da ist (bei n = 0 mit Kurzinfo „keine offenen Befunde ohne Zuordnung“, nicht aufklappbar). Kurzinfo „n offene
  Befunde ohne Zuordnung“. Standard zu. Leere Spur (kein Balken, keine Marke). Kinder (`art: 'befund'`, `farbe: 'bug'`, ebene 1):
  höchstens 20 (`PFLEGE_MAX`), sortiert P0 → P2, Name „F-NNN · Titel“, Kurzinfo „Typ · Pn · Schätzung fehlt“, leere Spur. Danach
  eine nicht wählbare Zeile „+ n weitere“ mit Link „In der Entwicklung ansehen →“ (öffnet Kanban · Priorität, Filter „Pflege &
  Fixes“, siehe 3).
- Wählbar: die Pflege-Zeile (Detail: Inhalt „n offene Befunde ohne Zuordnung · Regel …“) und jede Befund-Zeile (Detail: ID, Typ ·
  Priorität, „Teil von: Pflege & Fixes“, Inhalt = Titel, Schätzung „fehlt“, Link „Befund öffnen →“ `#/workboard/<id>`). Kein
  „Anpassen“ an beiden (anpassbar() ist für sie false — prüfen).
- `gewaehlteZeile`, `aufklappbareSchluessel`, „danach“: Pflege-Zeile zählt als Wurzelzeile; „danach“ der Meilensteine bleibt in
  Roadmap-Reihenfolge (Pflege nicht als „danach“ des letzten Meilensteins).
- CSS: `#view-roadmap [data-farbe='bug']` mit `--ebene-bug`/`--ebene-bug-blass`; Legende um „Bug“ ergänzt. Keine neuen Werte.
- Laden: `views/roadmap.js` lädt die Workitems schon (`ladeRoadmap`); `ordneBefundeZu` je Render.

## 3 Kanban · Priorität (`entwicklung-daten.js` rein, `views/workboard.js`)

- `PRIORITAETS_SPALTEN = ['P0','P1','P2','P3','ohne']`; Überschriften „P0 · Kritisch“, „P1 · Hoch“, „P2 · Normal“, „P3 · Später“,
  „Ohne Priorität“ (Vorlage `d_arbeit_prioritaeten.png`, Abgleich F-725 E2).
- `baueKanbanPrioritaet(workitems, featurePrioritaeten, filter)` → `{ spalten: je Spalte { karten, anzahl }, p4: Zahl }`:
  Karten = offene Features (Status ∉ ABGESCHLOSSEN/ABGEBROCHEN; Priorität aus `featurePrioritaeten.get(id)`, sonst „ohne“) und
  offene Befunde (`status === 'OFFEN'`; P0–P3 je Spalte). **P4 (Alt-Bestand, 21):** in die Spalte P3 mit Chip „P4“ auf der Karte?
  Oder eigene Spalte? → Vorschlag: eigene Spalte „P4 · Alt-Bestand“ nur, wenn n > 0 (F-917 (a) nennt P0–P4; der Auftrag nennt
  P0–P3) — Advisor bitte entscheiden.
  Sortierung je Spalte: Features vor Befunden, sonst Quellreihenfolge. Höchstens `KARTEN_JE_SPALTE` (12); „Alle n anzeigen“
  klappt die Spalte clientseitig ganz auf (Zustand je Spalte, zurück mit „Weniger anzeigen“).
- Feature-Prioritäten: aus GET …/roadmap (`features[].prioritaet`, B5b-1a) — die Projektion liefert die Akten-Zeile schon; Kanban und
  Pflege-Spur rechnet sie nicht (P2 bleibt eingehalten). Workboard lädt die Roadmap dafür beim Betreten (neben Workitems/Aufträgen,
  eigener Anfragezähler); scheitert sie, stehen alle Features unter „ohne Priorität“ mit Hinweis „Prioritäten der Features nicht
  ladbar“. Kein Serverumbau.
- Filter „wie die vorhandene Liste“: Typ-Chips (Alle + vorkommende Typen der offenen Karten), Zuordnung „Alle · Pflege & Fixes“
  (über `ordneBefundeZu`; Features nie in Pflege) und die Suche (`sucheWorkitems`, eigenes Feld im Board-Bereich). Status-Filter
  entfällt (nur offen, Satz über dem Board).
- Modus-Schalter `#workboard-modi`: „Kanban · Status“ | „Kanban · Priorität“ (jetzt aktiv, aria-pressed) | „Zeitleiste“ (bleibt
  „kommt“). Im Prioritätsmodus ersetzen die Filter die Ansicht-Chips. Satz: „Nur lesen: offene Einträge nach Priorität. Ändern der
  Priorität kommt.“
- Karte: wie `boardKarte` (Typ, Priorität bei Befunden, Titel, Status bzw. Phase, ID), Klick öffnet das vorhandene Detail.
- Export `oeffneKanbanPrioritaet({ pflege: true })` für den Link aus der Roadmap (Muster `oeffneEntwicklungsRegister`).
- Poll: Board schreibt nur bei geändertem HTML (wie heute); Fokus bleibt.

## 4 Bug-Felder (`views/workboard-detail.js` `fehlerbildBlock`)

- Nachstellen, Erwartet, Tatsächlich, Ursache aus dem Workitem statt „kommt“; neu Kachel „Regressionstest“. Fehlt ein Feld:
  „fehlt“ (E-B5-5, `eintrag.befund.fehlt`), mehrzeilig mit `white-space: pre-line`, escaped. Im „ganzen Eintrag“ die fünf Felder
  ergänzt.

## 5 Restpunkte

- Bereinigungsliste: `neuerEintragsStand(eintrag)` wählt „Feature → ABGESCHLOSSEN“ vor, wenn möglich; „Meilenstein → LAEUFT“ steht
  als zweite Option, nachrangig (Klasse `nachrangig`: kleinere Schrift, `--text-secondary`, kein Fettdruck), unverändert wählbar.
  Kopfkommentar „keine Vorauswahl“ und Akte-Abweichung aus 2b-2 nachziehen.
- F-1206 (dg 3): Nebenwirkung in der Auswahl als `<details>` „Folgen anzeigen“ (zu), vollständig nur im Bestätigungsschritt.
- `docs/STATUS.md` Z. 502: Freitext ersetzen (nur dieser).
- `state/findings.md`: F-1010 erledigt (Stefan 25.10.2026); F-917 erledigt (a) nach (c); F-1206 teilweise (dg 3); Restpunkte des
  Prüfpasses als neue F-1208 ff.

## 6 i18n, Tests, Nachweis

- Texte de/en/tr/ru (neue Schlüssel unter `roadmap.pflege.*`, `entwicklung.kanban.*`, `eintrag.befund.*`).
- Tests: `befund-zuordnung.test.mjs` (Token-Grenzen, erstes gewinnt, nicht in Roadmap, null-Feld, P3/ERLEDIGT raus, Sortierung,
  echte Zahlen gegen den Arbeitsbaum als Rauchtest), `roadmap-anzeige.test.mjs` (Pflege-Zeile, Max 20 + weitere, Zähler,
  ohne Zuordnung unverändert), `entwicklung-daten.test.mjs` (Spalten, Features mit/ohne Priorität, P4, Filter, Grenze),
  `workboard-detail.test.mjs` (Bug-Felder mit/ohne), `roadmap-bereinigung.test.mjs` (Vorauswahl, nicht möglich ⇒ keine Vorauswahl,
  nachrangig, details).
- Gates einzeln: f20-design-tokens, f44-i18n, f21-workboard, f21-ws2-workboard-oberflaeche, f45-b5b1a-planung, feature, docs,
  status-akten; dann `npm run test`.
- Render-Nachweis `nachweise/b5b2c/` ≤ 8 MB WebP gegen Wegwerf-Kopie (Muster `nachweise/b5b2b2/erzeuge-nachweis.mjs`), wartet auf
  Ladeende: Gantt mit Pflege & Fixes zu/auf, Feature-Zähler (Kurzinfo + Detail), Kanban dunkel/hell 1440/390, Bug-Detail mit und
  ohne Felder, Bereinigungsliste mit Vorauswahl (Kopie mit präparierter Abweichung: eine Ausnahme + Akte zurück auf FEATURE_GATE).

## 7 Risiken

- Workboard lädt zusätzlich die Roadmap (eine Akte je Feature ⇒ ~60 Dateien) — nur beim Betreten, wie die Roadmap-Seite.
- Große Spalten (P3 348) bei „Alle anzeigen“: DOM ~350 Karten, akzeptabel.
- `views/workboard.js` und `views/roadmap.js` wachsen (keine Wachstumsbremse für Views; Server unverändert).
- Schätzung ≈ 0,4–0,5 AT; wird es mehr (Advisor), Schnitt: (c) Kanban vor (b) Pflege & Fixes.
