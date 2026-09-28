# F36 WS-1 — Render-Nachweis Spalte „Fehlt für Einsatz“ (F-622)

Stand 28.09.2026, Worktree `aiw-f36-ws1`, Leitstand lokal auf Port 4391
(`LEITSTAND_PORT=4391 node scripts/leitstand-server.mjs`), Startvorlage
`startvorlagen/ai-workforce.json`, Chromium headless über Playwright.

## Befund und Fix

Die Library-Tabelle war schon vor WS-1 breiter als ihre Karte (716 px in
690 px bei 1400 px Viewport) und wurde am Kartenrand abgeschnitten. Die
achte Spalte (834 px) verschwand dadurch fast ganz;
auf 400 px scrollte die ganze Seite horizontal.
Fix: `#capabilities-library { overflow-x: auto; }`
(`public/leitstand/style.css`) — die Tabelle scrollt innerhalb der Karte,
die Seite nicht mehr; keine neue Farbe, kein neuer Schatten. Die Varianten
„vor WS-1“ und „ohne Fix“ in `messung.md` sind per injiziertem CSS
nachgestellt (Spalte 8 ausgeblendet bzw. `overflow-x: visible`), gemessen
am selben Stand.

## Artefakte

| Datei | Inhalt |
|---|---|
| `messung.md` | Tabellen-, Container- und Seitenbreite je Variante (vor WS-1, ohne Fix, mit Fix) bei 1400 px und 400 px |
| `03-zeile-context7-1400.png`, `03-zeile-context7-400.png` | Zeile `context7-mcp`, Karte nach rechts gescrollt: vier Klartext-Gründe lesbar |
| `protokoll.md`, `01-library-desktop.png`, `mobil/` | Standardlauf `npm run render-nachweis` (Klickfolgen `klickfolge*.json`): Spaltenkopf, Klartext-Zeile und „nichts“-Badge vorhanden |
| `messung.mjs` | Messskript (Wegwerf, nicht Teil von `npm run check`) |

Hinweis: Der erste Seitenaufruf im Messskript lief mehrfach einmalig in den
Timeout (Tabelle nicht sichtbar) und war beim nächsten Versuch grün — betrifft
nur das Skript (Erstaufruf), nicht die Ansicht.
