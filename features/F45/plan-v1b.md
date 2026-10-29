# F45 V1b — Live-Vorschau in voller Breite (Plan)

**Auftrag:** Bauauftrag F45 V1b (Challenger, 29.10.2026), Entscheidung Stefan **E-VORSCHAU-2 = A**: Die Live-Vorschau bekommt
eine eigene Zeile in voller Breite direkt unter den Kopfkarten der Produktübersicht. Leerzustand (F-1245 Teil 2) bleibt: der
geführte erste Schritt ersetzt bei einem leeren Produkt die ganze Seite. Basis: `main` nach dem Merge von V1 (#393).

## Briefing

1. **Ziel:** Karte c (Vorschau bzw. „Start Building“) aus der Kartenreihe lösen und als volle Zeile unter die drei übrigen
   Kopfkarten setzen; die drei verteilen sich auf die Breite. Nur Layout.
2. **Referenz:** Nachweisbild `features/F45/nachweise/v1/de-1440-dunkel-01-vorschau.webp` (Betrag-Spalte abgeschnitten),
   `docs/design/abgleich-f46.md` §4.1 (Zeile Karte c).
3. **Module:** `views/dashboard.js` (`geruest()`: nur Reihenfolge der Kinder von `#uebersicht-cockpit`, Dateikopf),
   `style.css` (`.uebersicht-cockpit`, `.uebersicht-vorschau*`, Container-Abfragen). `vorschau-panel.js` unverändert.
   Keine Daten, kein Server.
4. **Zustände:** Ladend („Lädt…“ eine Zeile), Vorschau (iframe), „Start Building“ (kompakt), Fehler (= „Start Building“ mit
   Grund `fehler`), Leer (geführter erster Schritt, unverändert). Hover unverändert (Bestandsknöpfe).
5. **Akzeptanzkriterien:**
   - 1440: Produkt, Wer, Fortschritt/Braucht dich in drei gleich breiten Spalten; darunter die Vorschau über die ganze
     Breite des Cockpits; die Test-App zeigt alle drei Spalten ungekürzt.
   - „Start Building“ in derselben Zeile ohne leere Fläche (Höhe = Inhalt, Zeilenlänge begrenzt).
   - Lese- und Tab-Reihenfolge = Sichtreihenfolge (Vorschau im DOM nach Karte d).
   - Das iframe bleibt über Poll-Renders dasselbe Element (DOM-Beleg im Nachweis wie V1).
   - ≤ 1060: Produkt | Wer, darunter Fortschritt + Braucht dich nebeneinander, darunter die Vorschau; ≤ 640 eine Spalte,
     390 ohne Querscroll.
   - `dashboard.js` ≤ 1 033 Zeilen; Gates und Tests grün.
6. **Risiken:** Rollen-Kreis braucht ≈ 300 px (Spalte b mit Mindestbreite); Gates/Tests, die die Kinderreihenfolge von
   `#uebersicht-cockpit` annehmen (geprüft: keine — `check-f45-v1-vorschau` liest `vorschauHtml`, `render()` und
   `ladeAlles`, die Tests greifen über IDs zu).

## Umsetzung

- **DOM:** In `geruest()` steht `<article … id="uebersicht-vorschau">` nach `#uebersicht-cockpit-rechts` (vorher zwischen den
  Hüllen). Die Vorschau bleibt im Cockpit-Rahmen („direkt unter den Kopfkarten“, eine Fläche `--panel`) und damit ein
  Rasterelement; `render()` schreibt weiter nur die beiden Hüllen, nie `#uebersicht-vorschau`. Gleiche Zeilenzahl.
- **Raster:** `grid-template-columns: minmax(0, 1fr) minmax(300px, 1fr) minmax(0, 1fr)`; `.uebersicht-vorschau` mit
  `grid-column: 1 / -1` (die bisherige Regel in `@container (max-width: 1060px)` entfällt, sie gilt jetzt immer).
- **Höhe des iframes:** `height: min(70vh, 720px)`, `min-height: 360px` (statt `flex: 1` + `min-height: 360px`).
  Begründung: 720 px entspricht der Höhe eines üblichen Desktop-App-Fensters (HD-Basis 1280 × 720), mehr Höhe zeigt nur
  leere Fläche einer kurzen App und schiebt den Rest der Übersicht weg; 70vh lässt auf einem 900 px hohen Laptop Kopfzeile
  der Karte und Knöpfe im selben Bildschirm sichtbar, so dass das iframe nie höher als das Fenster ist (keine Scrollfalle:
  Mausrad im iframe scrollt die App, nicht die Seite); 360 px bleibt als Untergrenze aus V1 für niedrige Fenster (unter
  ≈ 515 px Fensterhöhe gilt „im selben Fenster“ deshalb nicht mehr ganz — deklariert in „Stand V1b“).
- **„Start Building“ kompakt:** keine feste Höhe (Inhalt bestimmt die Höhe), Absätze mit `max-width: 72ch`.
- **Doku:** Dateikopf `dashboard.js` (Punkt 2, ohne neue Zeilen), Zeile Karte c in `docs/design/abgleich-f46.md`.
- **Nachweis:** `features/F45/nachweise/v1b/erzeuge-nachweis.mjs` nach dem Muster V1 (neutrale Umgebung, Test-App): 1440
  dunkel/hell mit Vorschau, 1440 „Start Building“, 390 dunkel; `protokoll.json` mit iframe-Identität über ≥ 3 Poll-Ticks,
  Spaltenbreiten, ungekürzte Tabelle in der App, kein Querscroll bei 390.
- **Register/Akte:** F-1246 (TECH_DEBT P3, Header-Schutz), F-1247 (PROCESS_IMPROVEMENT P2, Pflichtrahmen Commit-Block),
  F-1245 erledigt; Akte F45: V1 erledigt, V1b-Zeile, E-VORSCHAU-2 = A, „Stand V1b“.

Kein Advisor-Pass: die Struktur von `dashboard.js` ändert sich nicht (eine Zeile umgestellt).
