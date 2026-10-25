# Nachweis F45 B5b-2a — Roadmap: Gantt lesend

Stand 25.10.2026 (nach der Korrekturrunde des Prüfpasses). Plan `features/F45/plan-b5b2a.md`/`plan-b5b2a-v2.md`, Advisor
`features/F45/advisor-b5b2a.md` (Freigegeben mit Hinweisen).

## Render-Nachweis

Erzeugt mit `erzeuge-nachweis.mjs` (Playwright) gegen einen Leitstand auf diesem Repo (`LEITSTAND_PORT=4431 node
scripts/leitstand-server.mjs`, echte Projektion GET /api/roadmap mit den Akten-Daten von F45). Je Lage sieben gemessene Schritte
(`protokoll.json`), Bilder als WebP (Canvas des Playwright-Chromium, Güte 0,8) nur für die vier Schritte mit eigener Aussage:

| Bild je Lage | Inhalt |
|---|---|
| `<lage>-01-start.webp` | ganze Seite: Ausgangslage, Kennzahlen, Gantt über dem Entwicklungsstand |
| `<lage>-02-wochen.webp` | „Gesamte Roadmap“ im Zoom Wochen |
| `<lage>-03-alles-auf.webp` | „Gesamte Roadmap“ aufgeklappt, mit Detailpanel |
| `<lage>-06-quer.webp` | „Gesamte Roadmap“ quer gescrollt, linke Spalte steht |

Übrige Schritte (04 Abgeschlossene eingeblendet, 05 Workstream gewählt, 07 Querscroll nach Klick) nur in `protokoll.json`.
Nachtrag 25.10.2026: der Ordner war mit 49 PNG 41 MB groß; jetzt 28 WebP + `seite-an-seite.webp`, 4,7 MB.

| Lage | Breite | Theme | Sprache |
|---|---|---|---|
| `de-1440-dunkel`, `de-1440-hell` | 1440 | dunkel/hell | de |
| `de-390-dunkel`, `de-390-hell` | 390 (Phone) | dunkel/hell | de |
| `tr-1440-dunkel`, `tr-390-hell` | 1440/390 | dunkel/hell | tr |
| `de-720-200prozent` | 720 CSS-px, Faktor 2 (200 %) | dunkel | de |

`seite-an-seite.webp`: links `docs/design/neu/03-roadmap--Main.webp`, rechts `de-1440-dunkel-01-start.webp`.

## Klicktabelle (alle sieben Lagen gleich, Werte aus `protokoll.json`; Bild nur bei 01, 02, 03, 06)

| Schritt | Ergebnis |
|---|---|
| 01 Start | M5 oben und offen, F45 „in Arbeit“ offen und gewählt, Gruppen „Erledigt in M5“ (12) und „Erledigt“ (46) zu; 15 Zeilen, 11 Balken, 3 Marken; Seitenüberlauf 0 |
| 02 Zoom Wochen | „Wochen“ gedrückt, Spur schmaler (1440: 1054 → 790 px Inhalt, die Mindestzahl von zehn Spalten greift), Seitenüberlauf 0 |
| 03 Alles aufklappen | 75 Zeilen, alle Klappen offen |
| 04 Abgeschlossene eingeblendet (nach „Alles zuklappen“) | 7 Zeilen; Auswahl fällt sichtbar auf M5 zurück (Gantt und Detail gleich — Prüfpass dg 1) |
| 05 Workstream gewählt | Zeile markiert, Detail „Workstream/Fixpaket“ mit Teil von, Inhalt, Schätzung, Ist, danach |
| 06 quer gescrollt | Gantt `scrollLeft` 284 (1440) bzw. 400 (390/720), linke Spalte bei x = 0 |
| 07 danach Feature gewählt | `scrollLeft` unverändert 284 bzw. 400 (Prüfpass cr 1/qa 1), Auswahl F32 |

Kein Seitenfehler in einer Lage. Nicht aufgenommen: reduzierte Bewegung (→ F-1199).
