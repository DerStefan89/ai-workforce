# F45 F-2b-1 — Nachweis (Sammlung im Leitstand, Scout liest die Sammlung, F-1060 (6))

Stand 12.10.2026 nach der Korrekturrunde, Branch `f45/f2b-sammlung-auswahl-pruefung` (Basis `83a576c`). Kein echter
Modelllauf in F-2b-1 (rein lesend; die echten Prüfläufe impeccable und context7-mcp gehören zu F-2b-2).

## Render-Nachweis (`render/`, `render/erzeuge-nachweis.mjs`, 21 Folgen)
Gegen die erneut gestartete Testinstanz des F-2a-Nachweises (`features/F45/nachweise/f2a/instanz-erneut.mjs`, Port 4391,
Wegwerf-Projekt mit den echten Läufen L1/L2; Installation = dieses Repo, also die echte Sammlung und der echte Katalog).
Echte Antwort von GET /api/sammlung: 176 Einträge, 172 mit Link, 126 auswählbar (ab F-2b-2), 10 ausgeschlossen; Stand:
157 nur Sammlung, 17 vorgemerkt, 2 benutzt (playwright-mcp und frontend-design aus L1/L2). Bilder als Ausschnitt (Kopf und
Anfang der Liste bzw. die geöffnete Zeile), nicht als Ganzseite.

| Folge | Zustand |
|---|---|
| `sammlung-de-1440`, `-de-390`, `-ru-390`, `-en-1440`, `-de-1440-hell`, `-de-1440-zoom200` | Liste nach Art mit Kennzahlen, Suche, Chips mit sichtbaren Titeln „Urteil“/„Stand“; Detail „Playwright“: Katalog `playwright-mcp` (über den Link), MCP (aus dem Katalog), „ohne Prüfbericht (vor F-2b freigegeben)“, Stand benutzt, „Auswählen“ mit „kommt“ |
| `sammlung-filter` | Urteil „Nur Ausnahme“ (9 von 176), zurück auf alle, Suche „scraper“ („1 von 176 Einträgen“), Suche ohne Treffer (Leerzustand) |
| `sammlung-filter-lange-urteile` | „Ausgeschlossen“ (1) und „Zurückstellen“ (14): Chips brechen nicht im Wort; in Lizenz/Kosten erst an Wortgrenzen umbrochen, ein zu langes Wort („iOS-/Signierungssetup“) bricht im Notfall im Wort (F-1068 (4)) |
| `sammlung-detail-ausgeschlossen` | Vayne: rotes Band „Ausgeschlossen durch den Auswahlfilter“ mit Bedeutung des Urteils; nicht auswählbar (keine prüfbare Quelle, Link auf vayne.io) |
| `sammlung-detail-ausnahme-auswaehlbar` | NANO-pDF: ausgeschlossen, aber mit GitHub-Quelle → Hinweis „Auswählen nur mit einer Begründung „Ausnahme““ und „Auswählen“ (kommt) |
| `sammlung-detail-bibliothek`, `-de-390` | Shadcn.ui: Bibliothek (aus der Stack-Liste), nicht auswählbar „wählt der Architekt“ |
| `sammlung-detail-auswaehlbar` | Peon: Typ noch offen, „Auswählen“ (kommt) |
| `sammlung-tastatur` | Chip „Pilot“ per Fokus + Enter, „Details“ per Fokus + Enter |
| `sammlung-selbstpruefung` | Band „Zahl in der Datei weicht ab“ (Antwort-Attrappe), Liste bleibt sichtbar |
| `sammlung-ladefehler` | Fehlerstand der Route (Antwort-Attrappe) |
| `scout-karte-sammlung` | Scout-Karten über Antwort-Attrappen (Auftrag, Lauf, Detail — kein Modelllauf): „Laut Sammlung (aktueller Stand): Aufnehmen“, Abweichung (Scout sagt „Optional“, Sammlung „Nur Ausnahme“), „aus dem Web“ |
| `lauf-detail-l1-hash`, `-390`, `-zoom200` | Lauf-Detail L1, „Fähigkeiten im Lauf“, „ganzer Hash“ aufgeklappt — voller Hash als Text, bricht bei 390 px um (F-1060 (6)) |
| `lauf-detail-l1-hash-tastatur` | „ganzer Hash“ per Fokus + Enter, „Kopieren“ per Fokus + Enter — ohne Freigabe der Zwischenablage (Headless) wird der Hash markiert und „Markiert — mit Strg+C kopieren.“ sichtbar |

Kein waagerechter Überlauf in allen Folgen. Der schwebende Knopf „Frag Jarvis“ verdeckt bei 390 px und rechts in der
Tabelle Text (bekannt, F-1060 (13)).
