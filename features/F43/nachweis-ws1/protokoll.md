| Aktion | f43-demo: erreichbar | f43-offline: nicht erreichbar | f43-leer: Hinweis vorschau_url | Öffnen-Link (neuer Tab) | f43-demo: Aufrufen-Knopf aktiv | f43-demo: Ergebnis Exit 0 | f43-demo: Ergebnisdatei als Text | HTML aus Projektinhalt gerendert (muss false sein) | f43-offline: Zeitgrenze gemeldet | f43-lang: Läuft… (Knopf gesperrt) | f43-lang: Ergebnis Exit 0 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Projekte-Übersicht: Vorschau erreichbar / nicht erreichbar / Hinweise | true | true | true | true | true | false | false | false | false | false | false |
| Klick „Aufrufen“ bei f43-demo → Exit 0, stdout/stderr, ergebnis.md | true | true | true | true | true | true | true | false | false | false | false |
| Klick „Aufrufen“ bei f43-offline → Zeitgrenze 2 s, Prozess beendet | true | true | true | true | true | true | true | false | true | false | false |
| Seite neu laden → letzter Aufruf bleibt sichtbar (Server hält ihn flüchtig) | true | true | true | true | true | true | true | false | true | false | false |
| Klick „Aufrufen“ bei f43-lang (läuft 4 s) | true | true | true | true | true | true | true | false | true | true | false |
| Sofort neu laden, während der Aufruf läuft → „Läuft…“ | true | true | true | true | true | true | true | false | true | true | false |
| Ohne weiteren Klick: Ergebnis erscheint (Nachladen solange aktiv) | true | true | true | true | true | true | true | false | true | false | true |
