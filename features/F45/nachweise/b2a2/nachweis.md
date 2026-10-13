# Nachweis F45 B2a-2 — Render (Arbeitspaket)

Testinstanz `features/F45/nachweise/b2a2/instanz.mjs` (Port 4396, Wegwerf-Ablage, Architekt als Attrappe, die eine
Einrichtungsliste meldet; Projekt = dieses Repo), Klickfolgen `render/erzeuge-nachweis.mjs`, je Ordner Screenshots und
`protokoll.md` (Klicktabelle). 13.10.2026.

| Folge | Zeigt |
|---|---|
| `einrichtung-offen-de-1440`, `-de-390`, `-ru-390-hell` | Freigabe-Seite des Baus: Karte „Arbeitspaket“ mit „Einrichtung durch dich“ (E1/E2 vor dem Bau offen, E3 während des Baus), langer Text bricht um |
| `freigabe-abgelehnt-de-1440` | Freigeben über Spalte und Dialog → 409, Grund im Dialog: „Einrichtung vor dem Bau offen: E1 …; E2 … — im Ablauf als erledigt abhaken, dann den Bau erneut freigeben. Die Entscheidung wurde NICHT festgehalten.“ |
| `einrichtung-abhaken-de-1440` | „Erledigt“ an E1 → Knopf wird „Wieder öffnen“, Meldung; E2 → „Alles vor dem Bau erledigt.“ |
| `entwurf-de-1440`, `-de-390`, `-de-1440-hell` | Finding F-1083: „Auftrag vorbereiten“ → AK-Entwurf aus der Maßnahme, „Kriterium hinzufügen“, leere Felder + „Auftrag anlegen“ → Hinweis (fokussiert, keine zweite Live-Region), nichts angelegt |
| `einrichtung-offen-de-1440-zoom200`, `entwurf-de-1440-zoom200` | 200 % Zoom mit reduzierter Bewegung |
| `einrichtung-timeline-de-1440` | „Der Weg zum Ergebnis“ aufgeklappt: Einrichtung als neutraler Eintrag zwischen Architekt und Umsetzung |

Befund im Nachweis: Auf der Freigabe-Seite ist „Der Weg zum Ergebnis“ eingeklappt — die Liste steht deshalb zusätzlich in
der bis dahin leeren Karte „Arbeitspaket“ (dort entscheidet Stefan über den Bau).

Korrekturrunde (Design-Prüfung): Hinweis ohne `role="alert"` (Fokus), Kriterien-Label über i18n, Knöpfe mit eigenem Namen
(`aria-label` je Schritt bzw. Kriterium), Unterüberschrift in der Karte kleiner, Hinweis und Status zurückgenommen, „Entfernen“
bei 390 px in natürlicher Breite, offener Einrichtungseintrag ohne zweiten „current“-Punkt; Nachweis neu erzeugt (Zustand
nach der Korrektur).
