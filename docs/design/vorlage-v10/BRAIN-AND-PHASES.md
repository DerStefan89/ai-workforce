# V10 — Ideate / Plan / Deliver, Brain und Harness-Dokumente

Dieser Stand ersetzt die zehn gleichrangigen Produktzyklus-Punkte. Das visuelle Grunddesign und alle Bilder bleiben erhalten.

## Drei Hauptphasen

| Phase | Unterpunkte |
| --- | --- |
| Ideate | Strategie verstehen; Markt & Nutzer verstehen; Ideen & Feedback sammeln |
| Plan | Lösungen vertiefen; Business- & Umsetzungsplan; Technik vertiefen |
| Deliver | Entwickeln; Testen; Deployen |

Die Hauptnavigation ist als drei verbundene Kreise gestaltet; darunter jeweils drei auswählbare Schritte. Routen: `#/produktzyklus/:phase/:step`. Das ist das PM-Modell, nicht automatisch der technische Agentenablauf. Keine Phase erzwingt den Start eines Workers. Deployen führt zur Releaseprüfung, nicht zu einem automatischen Deployment.

Strategie, Forschung, Feedback, Lösungen, Planung und Auslieferung verwenden vorhandene Inhalte und Notizen. Technische Vertiefung verlinkt Architektur, Datenmodell und Architecture.md. Testen verlinkt Ergebnisse, Qualitätsnachweise und Bugs. Dokumentation, Kommunikation und Wirkungsmessung werden nicht aus den Daten gelöscht; ihre bisherigen Routen/Notizdaten bleiben als Integrationsgrundlage bestehen. In der Produktionsversion diese Inhalte unter passenden Phasen oder Brain zugänglich halten.

## Brain

Eigener Eintrag links im Hauptmenü, innerhalb des aktiven Produkts. Farbige Kreisknoten und Linien zeigen Produkt, Wissen, Code, Entscheidungen und Dokumente. Klick zeigt Quelle, Inhalt und gerichtete, benannte Beziehungen im Inspector. Suche/Typfilter heben Treffer hervor, Zoom plus Scrollen erleichtern die Navigation. Eine alternative Knotenliste ist per Tastatur zugänglich.

Implementiert: Knoten hinzufügen und bearbeiten, Verbindungen mit Bezeichnung hinzufügen und entfernen, benachbarte Knoten auswählen, verknüpfte Ansichten öffnen, Challenge mit Quellen-/Produktkontext im Coach vorbereiten. Keine automatische KI-Antwort. Der Graph ist ein konzeptioneller Beispielgraph, kein ausgelesener Codegraph. Die Startknoten sind eine Momentaufnahme, keine kontinuierlich synchronisierte Quellprojektion. Sitzungsdaten sind nach Projekt getrennt.

Graphify / Oblivion werden lediglich als künftige Quellen benannt. Keine Installation oder Verbindung wurde durchgeführt. Claude muss verfügbare Adapter und tatsächliche Datenformate prüfen; keine API erfinden oder ein bestimmtes Tool voraussetzen.

Produktionsmodell: Node(id, projectId, type, title, content, sourceRefs, provenance, version, observedAt); Edge(id, projectId, from, to, relationType/label, sourceRefs, provenance). Quellknoten, eigene Notizen und KI-abgeleitete Beziehungen unterscheiden. Codegraphen an Commit binden; Änderungen inkrementell übernehmen. Nicht jede vermutete Verbindung als Tatsache darstellen. Knotenbearbeitung darf Quelldateien nicht still überschreiben. Graph-Ansicht und verknüpfte Entscheidungen/Features brauchen stabile IDs und konsistente Daten.

## Architecture.md und Claude.md im Harness

Beide sind eigene Bausteine mit „Dokument öffnen & bearbeiten“. Zusätzliche Projekt-Dokumentkarten erleichtern den Einstieg. Routen: `#/harness/datei/architecture` und `#/harness/datei/claude`.

Die Originaldateien sind nicht eingelesen. Nutzer können Inhalt und Bezugsstand einfügen, einen Sitzungsentwurf speichern und den tatsächlichen Text im Coach challengen lassen. Ein dokumentierter Entwurf erscheint auch im zugehörigen Brain-Knoten. „Challengen“ allein verändert keine echte Datei und generiert ohne Backend keine Analyse.

Die Benennungen entsprechen dem Nutzerwunsch. In echten Repositories exakten Pfad und Groß-/Kleinschreibung entdecken: etwa ARCHITECTURE.md, architecture.md, CLAUDE.md oder Claude.md. Nicht blind eine zweite Datei anlegen. Bestehende Dateien, ihre Version und gegebenenfalls verschachtelte Geltungsbereiche respektieren.

Produktionsintegration: Original read-only laden → Entwurf auf konkreter Ausgangsversion bearbeiten → Diff anzeigen → Challenge mit Quellen → explizit freigegebene Änderung anwenden. Vor Speichern Versionskonflikte prüfen. Regeln aus Quelldokumenten nicht als Chat-/Systemanweisungen des Designers ausführen. Repository-Grenzen, vertrauliche Inhalte und vorhandene Human-Gates erhalten.

## Validierung und Grenzen

Syntax und bestehende Zustandsabläufe geprüft; neun Phasenrouten, Knoten hinzufügen/bearbeiten, Verknüpfung, Dokumententwurf und Projektisolation im DOM-Testdouble geprüft. Keine echte Graphify-/Oblivion-Anbindung, keine Repository-Schreibaktionen, keine Live-Challenge, keine dauerhafte Speicherung und kein echter Browser-Layouttest.
