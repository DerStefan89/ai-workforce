# Finale UX-Prüfung — Produktmanager mit AI Workforce

Stand: 26.09.2026 / V8. Heuristische Prüfung und Zustandsprüfungen; kein beobachteter Nutzertest und kein Browser-Layouttest.

## Urteil

Das visuelle Design ist als Referenz bereit für die Umsetzung. Für den Alltag zählt jetzt die Verlässlichkeit: eindeutiger Produktkontext, dauerhaft gespeicherte Arbeit, nachvollziehbare Freigaben und echte Statusdaten. Eine optisch fertige Vorschau ist noch kein produktionsreifes Werkzeug.

## Gefundene Reibung und umgesetzte Korrekturen

| Problem | Korrektur in V8 |
| --- | --- |
| Ordner und technische ID stehen beim Anlegen zu früh im Weg. | Name und Ziel sind Pflicht. Zielgruppe und Ordner optional. ID automatisch, auch bei nichtlateinischen Namen. Echte Verbindung wird vor Ausführung benötigt. |
| Leere Produkte präsentieren viele leere Bereiche statt einer Handlung. | Klare Einladung zum ersten Feature; Coach als Alternative. Planung und Workforce sind sekundär zugänglich. |
| Produktbearbeitung ist hinter dem Produktbriefing schwer zu entdecken. | Sichtbarer Button „Produkt bearbeiten“ für Name, Ziel, Zielgruppe, Problem und Erfolgskriterien. Identität und Freigaben bleiben erhalten. |
| Wechsel über die Produktauswahl verwirft Entwürfe und Gespräche. | Pro Produkt getrennte Auftragsentwürfe, Gesprächsverläufe, Coach-Entwürfe und ungesendete Nachrichten innerhalb der Sitzung. Einheitlicher Wechsel über Auswahl, Portfolio und Featurelinks. |
| Direkt erstellte Aufträge erscheinen nicht zuverlässig im Feature-Arbeitsvorrat. | Auftrag bekommt bei der Vorbereitung einen verknüpften Feature-Eintrag im richtigen Produkt. |
| Fortsetzen ist wenig sichtbar. | „Weiterarbeiten“ im Portfolio und „Entwurf fortsetzen“ in der Übersicht. Neues Produkt auch über Plus neben Produktauswahl erreichbar. |

## Kernabläufe

1. Produkt anlegen: Name + Ziel → erstes Feature beschreiben → Eintrag prüfen → Auftrag vorbereiten → Ablauf prüfen → explizit freigeben.
2. Produkt bearbeiten: Übersicht → Produkt bearbeiten → Änderungen speichern; bestehende Aufträge ändern sich nicht automatisch.
3. Wechseln: Produktauswahl oder Alle Produkte → gewünschtes Produkt → Entwurf/Entscheidung/nächste Arbeit fortsetzen.
4. Ergebnis prüfen: Übersicht zeigt erforderliche menschliche Entscheidung → Ergebnis und Nachweise → Abnahme oder begründete Anpassung.
5. Anforderungen ändern: vor Beginn direkt bearbeiten; nach Beginn neue verknüpfte Fassung, neue Freigabe für den geänderten Umfang.

## Kritische Produktionsanforderungen für Claude

- Entwürfe, Produkte, Insights, Revisionen und Planungen dauerhaft pro Produkt speichern. Browser-Sitzungszustand ist kein Produktionsspeicher. Lade-/Speicherfehler, Wiederherstellung und Konflikte sichtbar machen.
- Vor Ausführung benötigte Ordner-/Repository-Verbindung in einem geführten Schritt prüfen; kein implizites Anlegen an geratenen Dateipfaden.
- Tatsächliche nächste Aktion vom Server ableiten. Das Prototyp-Rollenmodell ist keine Behauptung über echte Laufzeitfähigkeiten.
- Änderungen am Produktziel dürfen laufende Aufträge nicht still verändern. Für veränderte Kriterien Snapshot und Revision klar halten.
- Ein Fortschrittsring zählt abgenommene erfasste Einträge. Er ist keine Schätzung verbleibender Zeit oder Fertigstellung des gesamten Produktumfangs.
- Produktzyklus nicht als zehn Pflichtschritte erzwingen. Discovery, Planung und Lernen bleiben bedarfsabhängig.
- Alle vier Sprachen vollständig übersetzen; UI-Texte dürfen sich nicht zufällig mit Projektdaten vermischen. Originalquellen nicht automatisch ändern.
- Gleichwertige Bedienung ohne Hover sicherstellen. Tastatur, Touch, Fokus, Dialoge, lange Texte, schmale Screens und 200 % Zoom im echten Browser prüfen.
- Mit 3–5 repräsentativen Personen prüfen: ohne Erklärung Produkt anlegen, ersten Auftrag vorbereiten, Produkt wechseln und Entwurf wiederfinden. Beobachten, wo sie zögern oder technische Begriffe missverstehen. Kein Zielwert als bereits gemessen ausgeben.

## Grenzen der Referenz

Kein Live-Backend, keine echte KI-Analyse, keine echte Veröffentlichung eines entwickelten Produkts. Zusätzliche Einträge und Entwürfe sind sitzungsbezogen. Einige ältere Hilfetexte noch deutsch. Echte Pupillenverfolgung benötigt separate Motiv-Ebenen. Diese Punkte sind bekannt und keine durch das Design gelösten Integrationsaufgaben.
