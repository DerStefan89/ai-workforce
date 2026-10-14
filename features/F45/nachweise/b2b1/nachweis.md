# Nachweis F45 B2b-1a — Render („Review wiederholen“)

Testinstanz `features/F45/nachweise/b2b1/instanz.mjs` (Port 4398, Wegwerf-Ablage, Projekt = Wegwerf-Repo mit CLAUDE.md
dieses Repos, Ausführung und Review als Attrappe: der erste Review-Lauf fällt am Werkzeug aus, jeder weitere urteilt
BEREIT), Klickfolgen `render/erzeuge-nachweis.mjs`, je Ordner Screenshot, `klickfolge.json` und `protokoll.md`
(Klicktabelle). 14.10.2026. Die Folgen `ausfall-*` und `klick-de-1440` liefen je gegen eine frische Instanz (der Klick
verbraucht den Halt).

| Folge | Zeigt |
|---|---|
| `ausfall-de-1440`, `-de-1440-hell`, `-de-390`, `-ru-390-hell`, `-de-1440-zoom200` | KLAERUNG_ERFORDERLICH nach Werkzeugausfall des Reviews: rote Notiz „Hinweise zum Review“ mit dem Satz „du kannst den Review allein wiederholen (zählt nicht als automatische Korrekturrunde)“ und darunter auf eigener Zeile dem Knopf „Review wiederholen“ (in ru übersetzt); „Prüfung wiederholen“ (F-656) erscheint nicht; bei 390 px und 200 % bricht der Satz um |
| `klick-de-1440` | Klick „Review wiederholen“: POST …/pruefer-wiederholen setzt nur den Review zurück, POST …/starten startet ihn; die Attrappe urteilt BEREIT → „Passt das Ergebnis?“ mit Option „Annehmen“, Meldung „Review neu gestartet — nur der Review-Schritt läuft erneut, die Umsetzung bleibt.“; die Ausführung lief nicht erneut (gleiche Lauf-ID in der Timeline) |

Korrekturrunde (Prüfpass 14.10.2026): Knopf auf eigener Zeile statt im Satz (design-guardian 1), Notiz rot und Knopf auch ohne roten Hinweis, wenn der Server den Review für wiederholbar hält (code-reviewer 8, qa 5), „Korrekturrunde“ statt des internen Begriffs „Rückweg“ (design-guardian 5), Teilerfolg (zurückgesetzt, nicht gestartet) im Fehlerstil ohne HTTP-Code (design-guardian 2), zeitneutrale Meldung (6), Folge 1440 hell ergänzt (7). Nachweis danach neu erzeugt.

Grenzen: Der Grund in der Notiz („Schritt 'schritt-2-review' endete FEHLGESCHLAGEN (Lauf …)“) ist ein Servertext aus B2a-3a
(deutsch, mit Schritt- und Lauf-Kennung, F-1085 (8)) — unverändert. Der Advisor-Weg hat in 1a keinen eigenen Knopf (er
endet nach dem Zurücksetzen in der bestehenden Freigabe, Gate f45-b2b1 (e3)); die Anzeige folgt mit B2b-1b. Nicht gerendert: der Halt an der Grenze der Korrekturrunden und die Überlaufmessung bei 390 px (F-1107).
