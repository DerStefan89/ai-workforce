# Nachweis F45 B2a-3a — Render (Review-Hinweise in Abnahme und „Auf einen Blick“)

Testinstanz `features/F45/nachweise/b2a3/instanz.mjs` (Port 4397, Wegwerf-Ablage, Projekt = Wegwerf-Repo mit CLAUDE.md und
Checkliste dieses Repos ohne ARCHITECTURE.md, Ausführung und Review als Attrappe, die `eingaben.review` und
`eingaben.projektkarte` wie die Gateways in die Laufakte spiegelt), Klickfolgen `render/erzeuge-nachweis.mjs`, je Ordner
Screenshots und `protokoll.md` (Klicktabelle). 13.10.2026.

| Folge | Zeigt |
|---|---|
| `befunde-de-1440`, `-de-390`, `-de-1440-hell` | ABGESCHLOSSEN, Abnahme entscheidbar: Review-Kachel mit „Hinweise zum Review“ (amber: „Review-Vertrag unvollständig: Befund 2 (B2): 'korrekturrichtung' fehlt“, „Kontext des Reviews unvollständig … ARCHITECTURE.md: fehlt“); „Alle Nachweise“ → Befunde v2 mit ID, Dimension, Evidenz, Korrekturrichtung, Schwere „Kritisch“ in der Fehlerfarbe, langer Text bricht um |
| `vertrag-de-1440`, `-de-390`, `-ru-390-hell`, `-de-1440-zoom200` | Halt nach Regel 1k (KLAERUNG_ERFORDERLICH, Lage „vorab“): rote Notiz im Block „Ergebnis ablehnen oder Anpassung wünschen“ mit „Review-Vertrag verletzt (kein stilles BEREIT)“, der Empfehlung des Reviewers, der Kontextlücke und dem Satz zum nächsten Schritt; „Auf einen Blick“ zeigt nur „Hinweise zum Review: 3 — Details beim Review“ und das Urteil neutral statt grün |
| `ausfall-de-1440` | Werkzeugausfall des Reviews: „Review-Lauf (Fehlgeschlagen): … — Ursache: Werkzeug nicht gestartet: …“ im Vorab-Block, Zählzeile im Blick (vorher: „Das Urteil konnte nicht gelesen werden“) |

Korrekturrunde (Prüfpass): Notiz nur noch einmal (Blick mit Zählzeile, design-guardian 2), Urteil bei verletztem Vertrag neutral
(1), Servertexte in `lang="de"` (4), Status übersetzt und Ursache im Grund statt doppelter Lauf-ID (3, qa 1), Listenumbruch über
die bestehende Notizregel (5), Satz zum nächsten Schritt und Empfehlung des Reviewers (qa 2/3), „nicht lesbar“/„Laufakte fehlt“
rot sichtbar. Nachweis neu erzeugt (Zustand nach der Korrektur).

Grenzen: Die Texte der Vertragsverstöße und Kontextlücken kommen vom Server (deutsch, wie Begründungen und Gründe) — in
ru steht nur der Rahmen übersetzt. Der Fall „Review nicht gelaufen“ (Ausfall vor dem ersten Checkpoint) ist im Gate
f45-b2a3 (e2) und im Unit-Test belegt, nicht im Render-Nachweis (gleiche Notiz, andere Zeile).
