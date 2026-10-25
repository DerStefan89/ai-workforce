# Plan B5b-2a — Roadmap: Gantt lesend (v1)

Auftrag: Challenger, 25.10.2026 (Schnitt B5b-2 in 2a/2b/2c). Nur Anzeige auf GET /api/roadmap; keine Schreibroute,
keine Serveränderung, kein Kanban, keine Spur „Pflege & Fixes“. Design: `docs/design/neu/03-roadmap--Main.webp`,
Quelle `docs/design/neu/quelle/03-roadmap/Main.dc.html`, Abgleich `docs/design/abgleich-f46.md` §4.2.

## 1 Datenlage (belegt, Projektion dieses Repos am 25.10.2026)
- `meilensteine[].features[]` mit `workstreams` (null = keine Planungsdaten; F45: 55 Zeilen, F30: []), `workstreams_fehlerhaft`,
  `planung_befunde`, `prioritaet`, `abgenommen`.
- `zeitachse.eintraege[]` (58): Schlüssel (meilenstein, feature, workstream|null); offen mit `start_at/ende_min_at/ende_max_at`
  oder `fruehestens_ab_at` + `schaetzung_fehlt`; `nach_unbekannt`; erledigt mit `ist_start_at/ist_ende_at` (≤ 0, hier bis −11).
  Kein `art` im Eintrag → Zuordnung über `features[].workstreams[]` (gleiche id im selben Feature).
- `kennzahlen.bis_fertig[]` je nicht abgeschlossenem Meilenstein, `kennzahlen.plan_gegen_ist {anzahl, plan_min, plan_max, ist}`.

## 2 Reine Funktionen in `public/leitstand/roadmap-anzeige.js` (mit Tests)
1. `MASSSTAB = { tage: 44, wochen: 8.8 }` px je AT; `IST_BREITE = 96` px (eigene, gestauchte Skala der Ist-Zone).
2. `achse(roadmap, massstab)` → `{ spalten: [{ text: 'AT n' | 'W n', links }], breite, atMax, istSpanne }`. atMax = ⌈max(ende_max_at,
   fruehestens_ab_at)⌉ + 1, mindestens 10 AT (Tage) bzw. 10 Wochen; istSpanne = max |ist_start_at| (mind. 1).
3. `xVonAt(at, achse)`: at ≥ 0 → IST_BREITE + at·px; at < 0 → IST_BREITE·(1 + at/istSpanne) (Ist-Zone links von heute).
4. `balken(eintraege, achse)` für eine Zeile (ein oder mehrere Zeitachsen-Einträge, Aggregat für Feature/Meilenstein):
   `{ ist: {links, breite}|null, plan: {links, breite, form: 'gefuellt'|'umriss'}|null, max: {links, breite}|null,
   marke: {links, ab}|null, label, nachUnbekannt }`.
   - Ist: min ist_start_at … max ist_ende_at, mind. 4 px (ein Punkt ist ein schmaler Strich, nichts Erfundenes).
   - Plan: min start_at … max ende_min_at; `gefuellt` wenn ein Eintrag `laeuft`/Feature-Status in Arbeit, sonst `umriss`; mind. 4 px.
   - Max: ende_min … ende_max gestrichelt, nur wenn > 0.
   - Marke: min `fruehestens_ab_at` der Einträge ohne Schätzung → punktierter Kreis + „Schätzung fehlt · frühestens ab AT x“.
   - Label: „a–b AT“ (Dauer min–max relativ zum Start) bzw. Marke-Text; `nachUnbekannt` → Präfix „frühestens“ im title.
   Keine Länge ohne Schätzung (R4).
5. `ganttZeilen(roadmap, zustand)` → flache Zeilenliste in Anzeigereihenfolge, je Zeile `{ schluessel, ebene: 0..3,
   art: 'meilenstein'|'feature'|'workstream'|'fixpaket'|'design'|'gruppe', farbe (Ebenen-Name), id, titel, kurzinfo-Daten,
   status, statusKategorie, hatKinder, offen, eintraege (für balken), bezug: { meilensteinId, featureId, workstreamId } }`.
   - Reihenfolge Meilensteine wie heute: aktueller oben, übrige offene, Trennzeile, abgeschlossene nur eingeblendet.
   - Meilenstein-Kinder: offene Features in Roadmap-Reihenfolge; abgenommene Features eines offenen Meilensteins in einer
     Gruppenzeile „Erledigt in M5 · n Features abgenommen“ (aufklappbar, wie Design). Abgeschlossene Meilensteine zeigen
     ihre Features direkt.
   - Feature-Kinder: erledigte/verworfene Zeilen in einer Gruppenzeile „n erledigt · Ist“ (aufklappbar, erste Kindzeile wie
     Design „WS-0 bis WS-5b“), danach offene Zeilen in Tabellenreihenfolge, Farbe nach `art`.
   - `workstreams_fehlerhaft` / `planung_befunde` → Kennzeichen in der Feature-Zeile (Hinweis sichtbar), Einträge mit
     workstream null gehören zur Feature-Zeile.
   - Zustand: `{ aufgeklappt: Set|null, abgeschlosseneSichtbar }`; null = Standard (aktueller Meilenstein + seine Features
     „in Arbeit“ offen, Gruppen zu). Schlüssel: `m:<id>`, `f:<mid>/<fid>`, `g:<mid>` (Erledigt-Gruppe), `e:<mid>/<fid>`.
6. `aufklappbareSchluessel(roadmap, abgeschlosseneSichtbar)` für „Alles aufklappen/zuklappen“.
7. `planGegenIst(kennzahl)` → `{ zustand: 'leer'|'im_plan'|'ueber'|'unter', prozent, ... }`: Ist gegen die Plan-Spanne
   (über plan_max → +%, unter plan_min → −%, dazwischen „im Plan“).
8. `bisFertig(roadmap, meilensteinId)` → Eintrag aus `kennzahlen.bis_fertig` oder null.
9. `statusKategorie` additiv: `geplant`→geplant, `laeuft`→in_arbeit, `erledigt`→abgenommen, `verworfen`→abgebrochen.

## 3 View `public/leitstand/views/roadmap.js` (nur rendern)
- Werkzeugleiste: Legende (Ebenen-Quadrate Meilenstein/Feature/Workstream/Fixpaket/Design + Formen läuft/Ist/geplant/bis Max./
  ohne Schätzung), Zoom Tage/Wochen (echte Knöpfe, aria-pressed), „Alles aufklappen“, „Abgeschlossene einblenden (n)“/„ausblenden“.
- Gantt: `div.rm-gantt` mit `overflow-x: auto`; Kopfzeile (EINTRAG | IST · BIS HEUTE | Achse); je Zeile Grid aus sticky linker
  Zelle (Pfeil, Farbquadrat, Name, Kurzinfo, Status-Chip) und Zeitspur (Balken absolut, Positionen als Inline-`left/width` in px,
  Farben nur über Klassen + Tokens). Heute-Linie über alle Zeilen. Trennzeile „n abgeschlossene Meilensteine · x/y · ausgeblendet“
  mit „Einblenden“. Fußnote „nach rechts scrollen …“ (ohne „Balken ziehen“ — kommt 2b).
- Detailpanel rechts lesend: Typ, Status, Teil von, Inhalt (Feature: Ziel aus der Akte; Workstream: Titel + Notiz;
  Meilenstein: Zähler), Schätzung (min–max AT / „fehlt“), Ist, danach (nächste Zeile derselben Ebene), Hinweise
  (`planung_befunde`, „Tabelle mit Formfehlern“, „nach unbekannt“). „Frag Jarvis dazu“ unverändert, „Anpassen“ bleibt „kommt“.
- Kennzahlen: „Bis <M> fertig“ aus `bis_fertig` (berechenbar → „a–b AT“, sonst „noch nicht berechenbar“ + Anzahl);
  „Plan gegen Ist“ aus `plan_gegen_ist`. „+ Eintrag erfassen“ bleibt „kommt“.
- Entwicklungsstand und „Noch nicht eingeplant“ unverändert darunter.
- Anzeigezustand (Zoom, Aufklappen, Auswahl) nur im Speicher; Zurücksetzen bei Projektwechsel wie heute.

## 4 CSS `public/leitstand/style.css`
- Ein neues Token `--roadmap-heute: color-mix(in srgb, var(--ink) 70%, transparent)` im :root-Block (hell folgt über --ink).
- Ebenen-Farben über `[data-ebene=…]` → `--rm-farbe: var(--ebene-…)`, `--rm-blass: var(--ebene-…-blass)`. Formen: gefüllt
  (`background: var(--rm-farbe)`), Ist (`var(--rm-blass)`), Umriss (`border: 1.5px solid`), Max (`1px dashed`), Marke
  (`1.5px dotted`, rund). Keine Hex im View, keine neuen Farbwerte.
- Phone: linke Spalte schmaler (≈ 180 px), Gantt scrollt im eigenen Container, Raster einspaltig (Detail unter Gantt).

## 5 i18n
Neue Schlüssel in de/en/tr/ru (alle vier tragen heute dieselben 102 roadmap-Schlüssel). Veraltete „kommt“-Texte
(`roadmap.zeitplanung.hinweis`, `roadmap.kennzahl.planIst.unter`, `roadmap.gesamt.text`) sachlich ersetzen.

## 6 Tests und Gates
- `public/leitstand/roadmap-anzeige.test.mjs` erweitert: achse/xVonAt, balken (laeuft gefüllt, geplant Umriss, Max nur bei
  Spanne, ohne Schätzung → nur Marke ohne Länge, nach_unbekannt, Ist-Punkt), ganttZeilen (Reihenfolge, Gruppen, Standard-
  Aufklappen, Zuordnung `art`, fehlerhaft-Kennzeichen, abgeschlossene ein/aus), planGegenIst, bisFertig, statusKategorie.
- Kein neues Codeform-Gate (F-1190). Kein bestehendes Gate erwartet „kommt“ für Achse/Plan gegen Ist (grep belegt) —
  nichts nachzuziehen. Laufen: Test einzeln, `check-f20-design-tokens.mjs`, `check-f45-b5b1a-planung.mjs`,
  `check-f33-roadmap-projektion.mjs`, `npm run test`.
- Render-Nachweis `features/F45/nachweise/b5b2a/` (dunkel, hell, Phone 390 px, Seite-an-Seite mit dem Design).

## 7 Risiken
- Große Zeilenzahl (F45: 55 Zeilen) → Erledigt-Gruppe standardmäßig zu.
- Ist-Zone ist gestaucht (eigene Skala) — Kopf beschriftet „Ist · bis heute“, Balken dort nicht in AT ablesbar (DEKLARIERT).
- Workstream-IDs mit Leerzeichen („B2b-3b-2b-2b Lauf“) → Schlüssel nur über data-Attribute + CSS.escape.
- `roadmap-anzeige.js` wächst um ≈ 200 Zeilen; bleibt reine Logik.
