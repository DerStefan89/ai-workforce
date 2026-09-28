# F36 WS-4 — Render-Nachweis Zeile „Beobachtung“ (AK8, F-622)

Stand 28.09.2026, Worktree `aiw-f36-ws4`. Fixture-Leitstand auf Port 4175
(`erzeuge-nachweis.mjs`, Muster `features/F34/nachweis-fixpaket-ui/`),
Chromium headless über `scripts/render-nachweis.mjs`.

Zwei Läufe: `f36-ws4-mit-beobachtung` trägt das Laufakten-Feld
`beobachtung`, erzeugt über das echte `leseBeobachtung` aus gekürzten
Spike-Rohstromzeilen (init, Skill `ponytail`, Agent `qa`, MCP-Aufruf aus
einer Subagent-Zeile); `f36-ws4-ohne-beobachtung` ist eine alte Laufakte
ohne das Feld.

## Artefakte

| Datei | Inhalt |
|---|---|
| `mit/01-laufdetail-mit.png`, `mit/protokoll.md` | 1400 px: „Geladen: 3 Skills · 4 Agents · 1 MCP · Aufgerufen: Skills [ponytail] · Subagenten [qa] · MCP [mcp__playwright-mcp__browser_navigate]“ |
| `ohne/01-laufdetail-ohne.png`, `ohne/protokoll.md` | 1400 px: „nicht beobachtet“ (Klasse `.unbekannt`) |
| `mobil/02-laufdetail-mit-400.png`, `mobil/protokoll.md` | 400 px: die Laufakten-Tabelle passt in die Karte, Zeile und MCP-Name brechen um (`overflow-wrap: anywhere` auf den Zellen der Laufakten-Tabelle, eingegrenzt per `:has(.lauf-beobachtung)`) |
| `klickfolge-*.json` | Klickfolgen für `npm run render-nachweis` |
| `erzeuge-nachweis.mjs` | Fixture-Leitstand + drei Klickfolgen (nicht Teil von `npm run check`) |

Viewport-Höhe 3000 px: `#lauf-detail` liegt unterhalb der Laufliste, ein
Ausschnitt außerhalb des Viewports bricht `page.screenshot` ab.

## Nebenbefund (vorbestehend, nicht WS-4)

Die Laufakten-Tabelle war bei 400 px schon vor WS-4 breiter als die Karte
(der `<code>`-Pfad in „Arbeitsverzeichnis“ brach nicht um) und hätte die neue
Zeile abgeschnitten — behoben, eingegrenzt auf genau diese Tabelle. Die
Checkpoint-Tabelle wird weiterhin (bei 400 px und 1400 px) am Kartenrand
abgeschnitten; eine globale Umbruchregel würde dort die Zeitstempel zerlegen,
deshalb bleibt sie unangetastet. „Rohstrom nicht verfügbar“ liegt an der
Fixture (Rohstrom außerhalb der Installwurzel) und betrifft die Zeile nicht.
