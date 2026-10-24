# Nachweis F45 B5a-2 — Akte anzeigen

Stand 24.10.2026 (nach der Korrekturrunde des Prüfpasses). Plan `features/F45/plan-b5a2.md`/`plan-b5a2-v2.md`, Advisor `features/F45/advisor-b5a2.md` (Nicht freigegeben ⇒ v2),
Delta `advisor-b5a2-delta.md` (Freigegeben mit Hinweisen), Gate `scripts/check-f45-b5a2-akte-anzeige.mjs`.

## Render-Nachweis

Erzeugt mit `render/erzeuge-nachweis.mjs` (Playwright über `scripts/render-nachweis.mjs`) gegen die neutrale Testinstanz
`features/F45/nachweise/b2b3b2b2a3/instanz.mjs` (Port 4408, neutrales HOME/TEMP). Workitems, Aufträge, Roadmap, GET/PUT
`…/features/F9/akte`, POST `…/features` und der Coach-Verlauf sind feste Antworten. Pfadprobe vor jedem Bild „sauber“; in keinem
Bild waagerechter Überlauf (scrollWidth = clientWidth: 1440, 390 bzw. 720 bei 200 %).

| Ordner | Bilder | Lagen |
|---|---|---|
| `render/de-1440-hell/`, `render/de-390-dunkel/` | je 9 | 01 Detail mit „Bearbeiten“ und Entscheidungen · 02 Formular (Speichern ohne Grund gesperrt, „Auftrag vorbereiten“ gesperrt) · 03 Rückkehr nach #/chat mit den getippten Werten · 05 Hash-409 · 07 Sperre-409 · 08 422 mit Verstößen · 09 gespeichert (geänderte Abschnitte, Git-Block) · 10 unvollständige Akte mit Warnhinweis · 11 Entscheidungen leer |
| `render/de-1440-hell-coach/`, `render/de-390-dunkel-coach/`, `render/ru-390-dunkel-coach/` | je 4 | 20 Coach-Entwurf mit „Als Feature anlegen“ · 22 angelegt (F21, Link, Git-Block) · 23 nach Neuladen erneut ⇒ zweite Akte F22 (bekannte Grenze) · 24 Wettlauf ⇒ 409 wörtlich |
| `render/de-1440-200prozent/`, `render/ru-390-dunkel/` | je 4 | 01, 02, 03, 05 |
| `render/en-1440-hell/`, `render/tr-390-hell/` | je 2 (+1 Coach) | 01, 02, 20 |

## Klicktabelle (Auszug aus den Protokollen, de-1440-hell)

| Schritt | Ergebnis |
|---|---|
| 01 Detail | „Bearbeiten“ im Kopf von „Das Was“; Kachel „Entscheidungen“: 3 in der Akte, Kennung als Code, ohne `**` |
| 02 Klick „Bearbeiten“ | Formular statt „Das Was“, Fokus auf dem Titel; „Speichern“ gesperrt; „Auftrag vorbereiten“ gesperrt mit „Die Akte wird gerade bearbeitet …“ |
| 03 Grund tippen | „Speichern“ frei, Fokus bleibt im Feld (kein Neuschreiben) |
| 03b/03c Ziel ändern, #/chat, zurück | Formular steht wieder da mit „Geändertes Ziel …“ und Grund „AK3 ergänzt nach Review“ (Prüfpass cr K1/qa 1: Werte nach jeder Eingabe im Zustand) |
| 04 **Doppelklick** „Speichern“ (PUT antwortet nach 1,5 s mit 409 Hash) | **Anfragen speichern = 1**; während der Anfrage alle Felder und Knöpfe gesperrt |
| 05 nach der 409 Hash | „Die Akte wurde inzwischen geändert“, Servergrund wörtlich, „Neu laden (Eingaben gehen verloren)“ als Hauptknopf, Eingaben stehen, Speichern gesperrt und zurückgenommen |
| 06 „Neu laden“ | Formular zu, Akte neu geladen, „Bearbeiten“ wieder da |
| 07 Speichern ⇒ 409 Sperre | „Gesperrt, solange Ablauf w-haushalt-export läuft“, Grund wörtlich, Link „Ablauf öffnen“ (#/workflows/w-haushalt-export) |
| 08 Speichern ⇒ 422 | „Nicht gespeichert“, „422: …“ und die Verstöße als Liste, `<leer>` escaped |
| 09 Speichern ⇒ 200 | „Akte F9 gespeichert“, „Geändert: Ziel, Akzeptanzkriterien“, Git-Block mit „Kopieren“; „Das Was“ zeigt die neue Akte (AK3); „Auftrag vorbereiten“ wieder frei |
| 10 unvollständige Akte | Formular mit Warnhinweis („Speichern ersetzt diese Abschnitte … bzw. legt fehlende neu an“), Servergrund, Link „Ganze Akte in VS Code“ |
| 11 Entscheidungen leer | „Die Akte nennt noch keine Entscheidungen.“ — kein „kommt“ |
| 21 **Doppelklick** „Als Feature anlegen“ (201 nach 1,5 s) | **Anfragen anlegen = 1** |
| 22 Ergebnis | „Feature F21 angelegt (ENTWURF, noch nicht committet).“, „Feature öffnen →“ (#/workboard/F21), Git-Block |
| 23 Neuladen, erneut | Knopf steht wieder da; erneuter Klick legt wie der echte Server (nächste freie Nummer) eine zweite Akte F22 an — bekannte Grenze F-1182 (Anfragen anlegen = 2) |
| 24 Wettlauf (Anlage auf eben belegte ID) | 409 „features/F23/feature.md existiert bereits — nichts überschrieben“ wörtlich |

Spalte „weitere Live-Region (darf nicht)“ in allen 71 Zeilen false (`[aria-live]` außer Persona und der entschiedenen Ausnahme
`#plugins-status`, F-1094, sowie `[role=status|alert|log]`).

## Grenzen des Nachweises

- Der Ladezähler `akteLadung` (überholte GET-Antwort wird verworfen) ist nur statisch (Gate b6) belegt: eine Szene mit zwei
  zeitversetzten, verschiedenen GET-Antworten auf dieselbe Route lässt der Render-Helfer nicht zu (Advisor-Delta (3)).
- Bekannte Spuren der Attrappen, kein Befund dieser Änderung: „Gerade läuft nichts“, Zähler „Entscheidungen 1“ und „Ziel nicht
  ladbar: 404“ der Instanz. Die Kurzzeile „Du kannst unten einen Auftrag vorbereiten“ und bei unvollständiger Akte „(siehe „Das Was“)“
  stehen auch bei offenem Formular (feste Vorlagen) — Restpunkt F-1183. Keine Lage „reduzierte Bewegung“: die neuen Elemente sind nicht
  animiert.
