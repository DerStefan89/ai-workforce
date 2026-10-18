# Nachweis F45 B2b-3b-2b-2b-2b-2 — Anzeige-Fixes aus dem Nachweislauf

Stand 18.10.2026. Grundlage: Nachweislauf Rückfrage-Kanal 17.10. (`features/F45/nachweise/b2b3b2b2b/`, Läufe A und B), Findings
F-1144, F-1145, F-1146, F-1136 (10).

## Render-Nachweis

Erzeugt mit `render/erzeuge-nachweis.mjs` (Playwright über `scripts/render-nachweis.mjs`) gegen die neutrale Testinstanz
`features/F45/nachweise/b2b3b2b2a3/instanz.mjs` (Port 4408). Workflow, Abnahme und Lauf-Detail sind feste Antworten mit den Daten des
Nachweislaufs (Zählung Lauf A/B aus den Auswertungen, P9/P12; Projekt-CLI 2.1.300 installiert gegen 2.1.258 deklariert). 41 Bilder,
Pfadprobe vor jedem Bild „sauber“, kein waagerechter Überlauf. Ansichten der drei Hauptfälle: de 1440 dunkel/hell, de 390 dunkel/hell,
ru 390, de 1440 Zoom 200 %, de 1440 reduzierte Bewegung; Zusatzfälle in de 1440 und de 390.

| Ordner | Bild | Zu sehen |
|---|---|---|
| `render/freigabe-auftrag-<ansicht>/` | `01-…` | „Darf der Ablauf starten?“: Band (amber, `data-art=warnung`) und Zeile „Die installierte Claude-Code-Version … weicht … ab — der Lauf startet trotzdem, sein Ergebnis gilt“; Karte „Auftrag für diesen Schritt“ mit Vorschau und „Ganzer Auftrag (708 Zeichen)“, vor „Was startet“ (F-1144, F-1136 (10)) |
| | `02-…` | nach dem Klick: ganzer Auftrag wörtlich, `<b>fett</b>` als Text (kein `<b>`-Element), Vorschau ausgeblendet |
| | `03-…` | nach einem echten Neuzeichnen: ab Schritt 3 meldet der Zustand 2.1.301, die Seitenzeile ändert sich (Protokoll), der Auftrag bleibt aufgeklappt |
| `render/abnahme-kanal-a-<ansicht>/` | `01-…` | Abnahmeseite: CLI-Zeile („derzeit … das Ergebnis gilt trotzdem“), Block „Rückfrage-Kanal im Lauf“ mit der Zählung von Lauf A nach „Selbst ausprobieren“ (ohne Grund ist die Zählung Detail) (F-1146) |
| `render/abnahme-lauf-b-<ansicht>/` | `01-…` | Abnahmeseite mit Lauf B: Block oben unter den Kacheln, zuerst „Auswertung“ mit Regel-Text und „Was tun“, dann die Zählung (F-1145/F-1146) |
| `render/abnahme-fehler-<ansicht>/` | `01-…` | Lauf-Detail antwortet 500: „gerade nicht ladbar — er steht auch im Lauf-Detail“ mit Link „Lauf ansehen“ |
| `render/wastun-lauf-b-<ansicht>/` | `01-…` | Sichtungs-Notiz von Lauf B (`nicht_von_stefan`, automatisch 1): „nach einer festen Regel selbst abgelehnt … Pfad außerhalb des Arbeitsordners“, „Was tun: Du hast nichts versäumt …“ statt Frist-Rat (F-1145) |
| `render/freigabe-fehlt-<ansicht>/` | `01-…` | Auftrag nicht lesbar: amber Hinweis „Gib erst frei, wenn du weißt, was der Schritt tun soll (sonst ablehnen)“ |

Bekannte Spuren, kein Befund dieser Änderung:
- „Harness-Abgleich nicht ladbar: 404“ auf Abnahme- und Sichtungsseite — GET …/harness-abgleich ist nicht nachgebildet, die Instanz kennt
  die Attrappen-Workflows nicht.
- Zoom 200 % mit Vollseite: die fixierte, scrollbare Seitenleiste (`#shell-sidebar`) erscheint im Bild oben abgeschnitten bzw. in 03 versetzt, und das Band in `03-de-1440-zoom200` noch mit 2.1.300,
  obwohl das DOM-Protokoll desselben Schritts 2.1.301 zeigt — Bildzusammensetzung des Helfers bei `zoom` + `screenshotVollseite`; bei 390
  zeigen Band und Zeile im Bild 2.1.301.

## Mutationsproben (an den Quelldateien, danach zurückgesetzt)

| Probe | Änderung | Ergebnis |
|---|---|---|
| Auftragstext entfernt | `renderAuftragKarte(…)` aus `renderFreigabeSeite` gestrichen | `workflow-entscheiden.test.mjs` rot (2 Tests) |
| Ursache Regel→Frist | in `automatischUrsache` `regel` durch `frist` ersetzt | `rueckfrage-abnahme.test.mjs` rot (3 Tests) |
| Block auf Abnahme entfernt | in `renderAbnahmeSeite` `const kanal = ''` statt `renderKanalImLauf(…)` | `workflow-abnahme.test.mjs` rot (2 Tests) |
