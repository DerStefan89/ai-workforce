# Jarvis / AI Workforce — finale Designübergabe

Stand: 26.09.2026 · verbindlicher Stand: V10 (Gestaltung beibehalten; drei Produktphasen, Brain und Projektdokumente ergänzt).

## Auftrag an Claude Code

Übernimm den mitgelieferten Prototyp möglichst originalgetreu in die vorhandene AI-Workforce-Anwendung. Stefan ist der Produktmanager: Er versteht den Stand, priorisiert, klärt und gibt frei. Jarvis und die Workforce entwickeln. Das Ziel ist ein verständliches Produktmanagement-Werkzeug, nicht eine technische Laufkonsole.

Bewahre Layout, Bilder, Farben, Typografie, Abstände, Informationshierarchie, Labels und Interaktionen. Erfinde keinen neuen Designstil. Verwende die vorhandene technische Architektur der echten Anwendung; ersetze die Beispieldaten schrittweise durch deren echte Daten und Aktionen. Die lokale Vorschau-State-Maschine darf keine Serverregeln ersetzen.

Dieses Dokument beschreibt den finalen Sollstand und hat bei Widersprüchen Vorrang vor historischen Abschnitten in `claude-code-handoff.md`. Die Referenzimplementierung besteht aus `index.html`, `style.css`, `app.js`, `localization.js`, `experience.js` und `assets/`. `experience.js` erweitert den ursprünglichen Prototyp mehrfach; bei der Integration diese Overrides in klar abgegrenzte Komponenten zusammenführen, ohne die Gestaltung zu verändern.

## Einstieg und Navigation

- Ohne Deep Link erscheint `#/start`: ruhiger Hintergrund, kleine Wortmarke JARVIS oben, Augen und Grinsen in der Mitte, exakt „Enter the Rabbit hole“, AI WORKFORCE am unteren Rand.
- Augen öffnen leicht versetzt, einmaliges kurzes Blinzeln, Grinsen erscheint danach. Dauer etwa 2,2 Sekunden. Kein Audio, keine Endlosschleife, keine erzwungene Wartezeit. Der Link bleibt sofort bedienbar.
- Der Link führt nach `#/uebersicht`, nicht zurück ins Portfolio. Deep Links in Produkte und Features bleiben direkt erreichbar.
- Auf dem Einstieg sind Sidebar, Topbar, Chat und Anwendungsfooter ausgeblendet. Hell/Dunkel-Präferenz bleibt erhalten. Bei reduzierter Bewegung ist das Motiv sofort sichtbar.
- Die Marke JARVIS in der Anwendung führt zurück zur Startseite.
- Primäre Sidebar: Produktübersicht, Roadmap, Entwicklung, Entscheidungen, Produktzyklus.
- Sekundär am unteren Rand: Alle Produkte direkt über Nutzung; danach Einstellungen und Profil. Workforce steht als letzter Navigationseintrag ganz unten. Die genauen Abstände der Referenz übernehmen.
- Chat bleibt eine Bubble unten rechts, vergrößerbar; Jarvis und Product Coach getrennt.

## Produktübersicht und Produktmanagement

Direkt unter dem Produkttitel: Fortschrittsbubble mit abgenommenen / erfassten Einträgen, aktuelle Rolle und Deployer-Kachel. Keine geschätzten Prozentwerte ohne Datenbasis. „Abgenommen“ ist nicht „veröffentlicht“. Produktziel und Zielgruppe bleiben im Produktbriefing. Darunter Entscheidungen, nächste Arbeit, horizontale Roadmap, Entwicklungsstand, zuletzt umgesetzte Arbeit und Kontextdetails.

Produktzyklus: Strategie, Nutzer verstehen, Feedback sammeln, Lösungen erkunden, Planen, Ausrichtung teilen, Entwickeln, Dokumentieren, Veröffentlichen, Wirkung prüfen. Dies ist ein Produktmanagement-Modell, kein identischer technischer Agentenablauf. Verknüpfe Strategie, Erkenntnisse, Features/Bugs, Planung, Ergebnisse und Wirkung durch stabile IDs.

Roadmap: horizontale Balken mit Meilensteinen und kleinen Einträgen. Hover nach ca. 600 ms für Vorschau; Klick für Detail. Touch und Tastatur gleichwertig unterstützen. Die sechs Beispielwochen sind keine echten Termine; reale Planung erst mit echten Daten anzeigen.

Kanban: Status aus tatsächlichem Ablauf ableiten. Priorität darf direkt und per Drag-and-drop geändert werden; alternative Auswahlfelder erhalten. Statusänderungen dürfen keine Freigabe umgehen. Features, Bugs und Harness Improvements sind eigene Filter auf konsistente Einträge.

Feature-Bearbeitung: geplante Spezifikation direkt bearbeiten, Grund erfassen. Bereits gestartete, geprüfte oder abgenommene Spezifikationen versionieren: separate verknüpfte Änderungsfassung; laufender Auftrag und bestehende Freigabe gelten weiter nur für den alten Snapshot. Konflikte serverseitig prüfen.

Insights: Beobachtung, Hypothese, Feedback, Entscheidung und Messwert unterscheiden; Quelle/Nachweis und betroffenen Eintrag verknüpfen. Eine Vermutung ist keine Diagnose. Automatische KI-Auswertung erst mit echter Anbindung und nachvollziehbaren Quellen ergänzen.

Harness: Agents, Skills, Hooks, MCPs, AGENTS.md, .gitignore, Konfiguration und Checkpoints. Unbekanntes Inventar bleibt unbekannt. Der Phasenkreis ist eine separate Sicht.

## Bilder und spätere Interaktivität

| Datei | Größe | Format | Zweck |
| --- | --- | --- | --- |
| assets/face.png | 1536 × 1024 | RGBA PNG | Originale Augen und Grinsen; Startseite, Header, Chat |
| assets/armillary.png | 1254 × 1254 | RGBA PNG | Himmelsmechanik / Armillarsphäre |
| assets/gear.png | 1254 × 1254 | RGBA PNG | Mechanische Illustration / Sidebar |

Die PNG-Dateien sind unveränderte Originale. Es gibt keine echten Vektororiginale. Nicht einfach PNG in einen SVG-Container packen und das als editierbare Vektorgrafik ausgeben.

Der Einstieg zeigt `face.png` in drei deckungsgleichen CSS-Ebenen. `clip-path` trennt linkes Auge, rechtes Auge und Mund; siehe `.eye-left`, `.eye-right`, `.waking-grin`. Die Augen öffnen mittels Skalierung dieser Ebenen. Das ist ein reproduzierbarer Aufwacheffekt, kein anatomisches Lid-/Pupillen-Rig.

Für spätere echte Mausverfolgung: das Original als unveränderliche Referenz bewahren; eigene transparente Ebenen für Augenrahmen, Iris/Pupille und Mund herstellen und visuell freigeben lassen. Pupillen innerhalb der Augen begrenzen, maximale Auslenkung klein halten, nicht das gesamte Gesicht dem Cursor hinterherziehen. Pointer-Bewegungen über requestAnimationFrame aktualisieren; auf Touch neutral, bei reduced motion statisch. Keine spontane Neugestaltung des Grinsens.

## Visuelle Konstanten

- Dunkel: #10212b Hintergrund, #162832 Flächen, #f0ede4 Schrift, #9caeb5 Sekundärtext, #8bd8c1 Jade.
- Helles Theme: vorhandene `data-theme="light"`-Tokens aus CSS übernehmen.
- Georgia für ruhige Serifentitel, Arial/Helvetica für Bedienung. Keine externen Font-Abhängigkeiten.
- Bilder sparsam; keine roten Neonflächen, hektischen Effekte oder zusätzliche Maskottchenmerkmale.
- Responsive Regeln und sichtbaren Tastaturfokus übernehmen. Texte dürfen bei 200 % Zoom nicht abgeschnitten werden.

## Echte Funktionen integrieren

Die technische Endpoint-Zuordnung und bestehenden Guards stehen in `claude-code-handoff.md`. Vor Integration deren Aussagen mit dem aktuellen Repository abgleichen.

1. Bestehende App und Serververträge lesen; Designkomponenten von Datenadaptern trennen.
2. Read-only-Daten für Portfolio, Projektstand, Einträge, Rollen, Ergebnisse und Nutzung anbinden.
3. Fehlende, leere und fehlerhafte Zustände getrennt darstellen. Modell aus beobachteter Ausführung übernehmen; Claude Code/Codex sind Worker, keine Modellnamen.
4. Persistente Planung, versionierte Spezifikationen und Insights hinzufügen, soweit echte Endpunkte existieren. Fehlende Verträge klar als Integrationsbedarf benennen.
5. Schreibaktionen an vorhandene bewusste Freigaben, Pflichtbegründungen und Serverprüfungen binden. Ein erfolgreicher Run ist keine Abnahme. Serverweit eine aktive Ausführung, sofern der echte Server weiterhin diese Grenze hat.
6. Bestehenden Status-Poll wiederverwenden. Keine Timer pro Karte oder Ansicht erzeugen.
7. Chat und Coach erst nach echter Anbindung als KI darstellen. Keine Beispielsätze als Live-Antworten ausgeben.
8. Vier UI-Sprachen: de/en/tr/ru. `localization.js` ist eine Vorschauimplementierung, keine vollständige Produktionslokalisierung. Stabile Übersetzungsschlüssel, Pluralformen, Datums-/Zahlformate und alle Dialog-/Fehlermeldungen ergänzen. Nutzereingaben und Quellen bleiben unverändert, sofern keine Übersetzung beauftragt wird.

## Was noch keine Produktionsfunktion ist

Beispieldaten, KI-Antworten, Timeline-Zeitfenster und aktuelle Zustände sind Fixtures. Neue Einträge, Revisionen, Insights und Zyklusnotizen verschwinden nach Neuladen. Theme, Sprache und einige Designnotizen sind nur gerätebezogen gespeichert. Inventare sind nicht eingelesen. Einige ältere Hilfetexte bleiben deutsch. Kein echtes Deployment von Nutzerprodukten und keine automatische Ursachenanalyse. Die finalen Designdateien sind vollständig, die echte Funktionsanbindung ist ein separater Umsetzungsschritt.

## Abnahmecheck für die Umsetzung

- Einstieg und direkter Deep Link funktionieren; Enter per Tastatur ist sofort möglich.
- Link, Lade-/Aufwacheffekt und reduced-motion-Verhalten stimmen mit der Referenz überein.
- Alle Produkte klein oberhalb Nutzung; Workforce ganz unten.
- Fortschritt, aktuelle Rolle und Deployer stehen oben in der Produktübersicht.
- Planung, Board, Liste und Detail zeigen denselben konsistenten Eintrag.
- Hover lässt sich mit Maus, Tastatur und Touch nutzen, ohne notwendige Information zu verstecken.
- Änderungen an Kriterien entwerten/überschreiben nicht stillschweigend alte Freigaben.
- Aktiver Worker, tatsächliches Modell, vorheriger/nächster Schritt und erwartetes Ergebnis sind sauber unterschieden.
- Echte Schreibaktionen benötigen die vorgesehenen Freigaben; kein Start durch Priorisierung.
- Hell/Dunkel, vier Sprachen, Mobilansicht und 200-%-Zoom prüfen.
- Keine Fixtures, erfundenen Kosten, unbekannten Modellnamen oder fiktiven Erfolgsmetriken im Produktivbetrieb.

## Lokal ansehen

Das Paket entpacken und im Ordner mit index.html einen lokalen statischen Server starten, z. B. `python3 -m http.server 8000`. Danach `http://localhost:8000` öffnen. Keine Installation und kein Build für die Designreferenz nötig.

## V8 – Finale PM-Usability-Korrekturen (Vorrang vor V7)

Zusätzlich `UX-FINAL-REVIEW.md` lesen. Der gestalterische Stand bleibt V7; V8 verbessert Anlegen, Bearbeiten und Weiterarbeiten. Produktanlage benötigt nur Name und Ziel. Projektordner optional in der Referenz, für die echte Ausführung später verbindlich prüfen. Leere Produkte zeigen einen geführten ersten Schritt. Übersicht bietet Produktbearbeitung und Auftragsentwurf fortsetzen. Plus neben der Produktauswahl legt ein Produkt an. Produktwechsel nutzt `activateProduct()` und trennt Entwurf/Gespräch pro Produkt. `ensureProductTaskItem()` verbindet direkt vorbereitete Aufträge mit dem Arbeitsvorrat. Diese Entwurfsverwaltung ist nur sitzungsbezogen und muss im echten Produkt persistent werden. Die neue Anforderung lautet nicht, Fixtures als Backend zu übernehmen.


## V9 – Vollständige finale Übergabe

Zusätzlich `TECHNICAL-INSIGHT-CONTRACT.md` lesen. Architektur, Datenmodell, Code, technische Fragen/Befunde und Health sind pro Produkt ergänzt. Der neue explizite Nutzerwunsch nach Health-Bewertungen ersetzt frühere Vorgaben, keine Health-Scores aufzunehmen. Weiterhin verboten sind unbelegte oder erfundene Bewertungen. Die jetzige Referenz zeigt quellenbezogene manuelle Bewertungen; automatische Messungen benötigen echte Anbindung. Unbekannte Daten bleiben unbekannt.

Dateien in diesem Paket:
- index.html, style.css, app.js, experience.js, localization.js: vollständige ausführbare Referenz.
- assets/face.png, armillary.png, gear.png: originale RGBA-Bilder.
- START-HERE-CLAUDE.md: finaler Auftrag und Umsetzungsvorgaben, zuerst lesen.
- claude-code-handoff.md: Backend-Zuordnung und Entwicklungshistorie; bei Konflikten ist dieser finale Auftrag führend.
- UX-FINAL-REVIEW.md: Nutzerwege, behobene Reibungen und verbleibende Produktionsprüfungen.
- TECHNICAL-INSIGHT-CONTRACT.md: Daten-/Versions-/Quellenanforderungen für technische Produktsichten und Health.

Umsetzungsreihenfolge: Referenz lokal ansehen → vorhandenes Repository und echte Verträge prüfen → Komponenten/Design übertragen → bestehende Daten anbinden → fehlende persistente Modelle und Aktionen kontrolliert ergänzen → vollständige Lokalisierung/Barrierefreiheit → Browser- und Nutzerprüfung. Keine neue Gestaltung entwerfen. Keine Fixtures als echten Produktstand ausgeben. Offene Backend-Verträge einzeln dokumentieren statt fiktive Antworten zu liefern.


## V10 – Aktueller finaler Sollstand, Vorrang vor früheren Phasenbeschreibungen

`BRAIN-AND-PHASES.md` ist zusätzlicher Pflichtbestandteil der Übergabe. Die zehn Produktzykluspunkte sind jetzt unter Ideate / Plan / Deliver mit jeweils drei Unterpunkten organisiert. Links ergänzt Brain einen pro Produkt getrennten Wissensgraphen. Architecture.md und Claude.md sind im Harness erkundbar, als Entwurf bearbeitbar und mit Inhalt/Quelle im Coach challengebar. Originaldateien und Graphify/Oblivion sind noch nicht angebunden. Keine bestehenden Dokumente oder Wissensquellen still überschreiben; Entwürfe, Quellversionen und Freigaben erhalten. Alle beschriebenen Integrationsgrenzen aus V9 bleiben bestehen.
