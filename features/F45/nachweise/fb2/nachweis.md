# Nachweis F45 FB-2 — Fähigkeit bauen: Anzeige

Stand 23.10.2026 (nach der Korrekturrunde). Plan `features/F45/plan-fb2.md`/`plan-fb2-v2.md`, Advisor `features/F45/advisor-fb2.md`,
Gate `scripts/check-f45-fb2-faehigkeit-anzeige.mjs`.

## Render-Nachweis

Erzeugt mit `render/erzeuge-nachweis.mjs` (Playwright über `scripts/render-nachweis.mjs`, dort neu: `verzoegerungMs`, `zaehlen`,
`doppelklick`) gegen die neutrale Testinstanz `features/F45/nachweise/b2b3b2b2a3/instanz.mjs` (Port 4408, neutrales HOME/TEMP).
GET `/api/workflows/<id>`, `…/abnahme`, `…/code?workflow=<id>` und die POSTs `…/faehigkeit-vorschlag/*` sind feste Antworten (neutraler
Pfad `C:\Projekte\haushaltsbuch-laeufe\…`). Pfadprobe vor jedem Bild „sauber“; in keinem Bild waagerechter Überlauf.

| Ordner | Bilder | Lagen | scrollWidth/clientWidth |
|---|---|---|---|
| `render/de-1440-hell/`, `render/de-390-dunkel/`, `render/ru-390-dunkel/` | je 13 | 01 entscheidbar (drei Vorschläge: übernehmbar mit langem Namen und langer Beschreibung, Ziel existiert, ungültig ohne Adresse) · 02 Stufe „Wirklich verwerfen?“ · 05 nach Doppelklick und 409 · 06 nach „Übernehmen“ (Statussatz, Hinweis „ungesichert“) · 07 neu geladen (Hinweis bleibt) · 08 vorab (KLAERUNG) · 08c Doppelklick „Verwerfen“ · 08d verworfen · 08e Freigabe-Halt mit Hinweis · 09 Lauf aktiv (Zwischenstand) · 10 entschieden, nur ungesichert · 11 nicht bestimmbar · 12 Umfang mit Vorschlagsdateien | 1440/1440 bzw. 390/390 |
| `render/de-1440-dunkel/`, `render/de-390-hell/`, `render/de-1440-200prozent/` | je 5 | 01, 02, 05, 06, 07 | 1440/1440, 390/390, 720/720 |
| `render/en-1440-hell/`, `render/tr-390-hell/` | je 1 | 01 | 1440/1440 bzw. 390/390 |

## Klicktabelle (Auszug aus den Protokollen)

| Schritt | Ergebnis |
|---|---|
| 01 Seite „entscheidbar“ | „Übernehmen“ als einfacher Knopf (der Hauptknopf ist die Abnahme), „Verwerfen“ danger |
| 02 Klick „Verwerfen“ | Stufe „Wirklich verwerfen?“ + „Abbrechen“, Fokus auf „Wirklich verwerfen?“ (Warnung per `aria-describedby`) |
| 03 Klick „Abbrechen“ | zurück, Fokus auf „Verwerfen“ |
| 04 **Doppelklick** „Übernehmen“ (POST antwortet nach 1,5 s) | **Anfragen übernehmen = 1**; während der Anfrage alle Knöpfe der Abnahme gesperrt |
| 05 nach der 409 | Meldung wörtlich „409: Ein Lauf ist aktiv (Ablauf w-anderer) — nach seinem Ende erneut versuchen“, Fokus-id `workflow-abnahme-meldung` |
| 06 Klick „Übernehmen“ (200) | „„…“ übernommen, freigegeben nach Inhalt, noch nicht eingeschaltet — nach Sichern/Merge unter Fähigkeiten einschalten. Das Review gilt danach als veraltet.“; Hinweis „Ungesicherte Änderungen unter .claude/ …“ mit Pfad; Anfragen übernehmen = 2; Fokus auf der Meldung |
| 07 Neuladen | Hinweis steht weiter (aus `faehigkeitUngesichert`, nicht aus dem Klick) |
| 08a/08b vorab: Begründung getippt, Stufe, Abbrechen | Feld behält „Begründung bleibt stehen“ |
| 08c **Doppelklick** „Verwerfen“ (Zeile ohne „Übernehmen“) | nur die Stufe; **Anfragen verwerfen = 0** |
| 08d Klick „Wirklich verwerfen?“ | **Anfragen verwerfen = 1**, Meldung „Vorschlag „…“ verworfen.“ |
| 08e Freigabe-Halt (nächster Lauf) | Hinweis „Ungesicherte Änderungen unter .claude/“ oben auf der Freigabe-Seite |
| 09 Lauf aktiv | „Zwischenstand — der Lauf schreibt noch …“, keine Knöpfe |
| 10/11 | Hinweis ohne Vorschläge in der Lage „entschieden“; „Stand von .claude/ nicht bestimmbar …“ grau |
| 12 | amber Liste nur mit `docs/notizen.md`, darunter „Der Vorschlagsordner (vorschlaege/faehigkeiten/) liegt gewollt außerhalb …“ |

Bekannte Spuren der Attrappen, kein Befund dieser Änderung: „Nicht bestimmbar – die Fassung validiert nicht“ (verkürztes Detail),
„Harness-Abgleich nicht ladbar: 404“ und „Rückfrage-Kanal … nicht ladbar“ (die Instanz kennt den Ablauf nicht), „Offene Änderungen
werden gelesen …“ (Instanz ohne Repo), „Der Auftragstext ist nicht lesbar“ im Freigabe-Halt (verkürztes Detail). Bei 390 steht die
Abnahme-Meldung unter der Spalte „Deine Entscheidung“ (bestehender Ort); sie bekommt bei Erfolg und Fehler den Fokus. Nach einem
erfolgreichen POST leert die Abnahme ein angefangenes Begründungsfeld (Bestand, 08d).

## Nachtrag F-1173 N1 (23.10.2026)

Ausweg im Hinweis „ungesichert“ je Lage: „Bereit zum Sichern“ nur in der Abnahme eines ABGESCHLOSSENEN Ablaufs (nur dort bietet
`scripts/leitstand/ablauf-sichern.mjs` den Abschnitt an); auf der Freigabe-Seite, im Freigabe-Halt und in den Lagen vorab/Lauf
„im Arbeitsordner von Hand committen (Pfad in der Karte „Wo gearbeitet wird“), dann neu laden“. Kein Befehlsblock: der einzige
Block für den Arbeitsordner (`code-daten.js` `ablaufSicherBefehle`) setzt `sichern.bereit` voraus, die Freigabe-Seite lädt den
Sichern-Stand nicht. Gate-Teil (n) in `scripts/check-f45-fb2-faehigkeit-anzeige.mjs`.

| Ordner | Bilder | Lage | Hinweis ungesichert (Protokoll) | scrollWidth/clientWidth | Pfadprobe |
|---|---|---|---|---|---|
| `render/de-1440-freigabe-n1/` | 1 | 08e Freigabe-Halt (nächster Lauf) | „Ungesicherte Änderungen unter .claude/ — Vor einem weiteren Lauf in diesem Ablauf sichern: im Arbeitsordner von Hand committen …“, ohne „Bereit zum Sichern“ | 1440/1440 | sauber |

Erzeugt mit `node features/F45/nachweise/fb2/render/erzeuge-nachweis.mjs http://127.0.0.1:4408 de-1440-freigabe-n1`. Die Bilder
08e, 08 und 09 in den älteren Ordnern zeigen den Stand vor N1 (Ausweg „Bereit zum Sichern“) und bleiben als historischer Stand
stehen; neu erzeugt wurde auftragsgemäß nur die Freigabe-Seite (de, 1440).
