# Nachweis F45 F-2b-2c — Sammlung → Katalog, „Eignung prüfen“, Detailzeile, Stand über Neustarts

Stand 13.10.2026, Branch `f45/f2b2c-sammlung-katalog` (Basis `ec4ad21`).

## Ende-zu-Ende ohne Netz (Gate)
`scripts/check-f45-f2b2-pruefung.mjs` Abschnitt (j): Sammlungseintrag ohne Katalog mit Prüfbericht (Skill über ein Fixture-„GitHub“,
MCP über eine npm-Attrappe) → Vormerken-Text → JSON-Skelett (Platzhalter ersetzt) erfüllt `validiereRessourcenDaten` und
`pruefeInstallierbarkeit` → `ordneZu` führt die Zeile danach als „zugeordnet“ → im Katalog gilt der Bericht der Sammlung
(vorbereiten ohne Sperre) → „Installieren“ 200, Eintrag FREIGEGEBEN. Abschnitt (f): Bericht mit übersprungener Datei → vorbereiten
mit Sperre, Installation 409 (F-1078 (b)).

## Render-Nachweis (`render/`)
Testinstanz `instanz.mjs` (Port 4395): echte Sammlung und echter Katalog dieses Repos, Wegwerf-Ablage mit zwei Prüfberichten aus
der Sammlung (erfundene Commit-SHA, nur Anzeige) und einer lokalen Fähigkeiten-Datei, deren gespeicherter Stand nicht passt.
Auftrag/Routen, Prüflauf und die Katalog-Antwort (taste-skill installierbar) sind Antwort-Attrappen der Klickfolgen
(`render/erzeuge-nachweis.mjs`). Kein waagerechter Überlauf in allen 20 Folgen.

| Folge | zeigt |
|---|---|
| `sammlung-vormerken-{de-1440, de-1440-hell, de-390, en-1440, en-390-hell, ru-390, de-1440-zoom200, de-1440-bewegung}` | Knopf „Details“ → volle Detailzeile (colspan) → Bericht + „Vormerken“ → „Vorgemerkt als Auftrag … im Ablauf …“; gstack: Grund „ganzes Repo“ |
| `sammlung-vormerken-fehler-warnung` | Warnung „2 Dateien übersprungen“, Fehler beim Anlegen mit „Erneut versuchen“ (primär) |
| `sammlung-tastatur` | „Details“ per Enter auf und zu, Fokus bleibt am Knopf |
| `library-eignung-{de-1440, de-1440-hell, de-390, en-1440, tr-1440, de-1440-zoom200}` | „Prüfen & freigeben“ → Sperre ohne Bericht mit „Eignung prüfen“ → Bestätigung (Knopf im Sperrblock deaktiviert) → Prüflauf fertig → Dialog neu vorbereitet mit Bericht und „Installieren“ |
| `faehigkeiten-band-neustart-{de-1440, en-390-hell}` | Band „Außerhalb des Leitstands geändert“, Quelle „Stand vor dem letzten Neustart“ |
| `faehigkeiten-band-unbekannt-{de-1440, tr-390}` | Band „Noch kein gespeicherter Stand“ (erster Start nach dem Update) |

Wiederholen: `node features/F45/nachweise/f2b2c/instanz.mjs` (offen lassen), dann
`node features/F45/nachweise/f2b2c/render/erzeuge-nachweis.mjs [basis] [ordner]`.

## Grenzen
- Kein echter Prüflauf und keine echte Installation in diesem Nachweis — beides belegt F-2b-2a/F-2b-2b (`../f2b2/`, `../f2b2b/`);
  hier zählt der Weg Sammlung → Katalog, den Gate (j) mit echten Routen und Attrappen-Quellen durchläuft.
- Im echten Katalog hat heute kein OFFEN-Eintrag eine `installation_vorlage`; „Prüfen & freigeben“ erscheint dort erst für Einträge,
  die über den neuen Vormerken-Weg (oder von Hand) eine Vorlage bekommen.
