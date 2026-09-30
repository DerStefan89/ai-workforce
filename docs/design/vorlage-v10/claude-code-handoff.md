# AI Workforce — Designübergabe an Claude Code

> Finaler Sollstand: zuerst `START-HERE-CLAUDE.md` lesen. Dieses Dokument enthält zusätzlich technische Zuordnungen und historische Entwicklungsstände; bei Widersprüchen hat START-HERE Vorrang.

Stand: 26.09.2026. Grundlage: Stefans freigegebene Silberstich-/Himmelsmechanik-Referenz und „AI Workforce – Design-Briefing für ChatGPT“, Stand 26.09.2026.

## Was geliefert wurde

Ein bedienbarer Designprototyp mit Vanilla-JavaScript, Hash-Router und einem Stylesheet. Kein Framework, kein Build-Schritt, keine externen CDNs. Alle Daten sind lokale Beispiele und gelten nur für die Sitzung. Keine Verbindung zum Leitstand-Server. Keine echte KI, Dateizugriffe, Installationen oder Git-Ausführung. Nicht als neue Backend-Implementierung übernehmen.

Quellen: `dist/index.html`, `dist/style.css`, `dist/app.js`, `dist/experience.js`, `dist/localization.js`, `dist/assets/*.png`. Öffnen über einen statischen Server. Den vorhandenen Leitstand schrittweise umgestalten; seine Serverlogik und Sicherheitsgrenzen erhalten.

## Gestaltungsrichtung

- Hintergrund: mattes Schieferblau `#10212b`.
- Flächen: `#162832`, zurückhaltende Linien statt leuchtender Rahmen.
- Text: warmes Elfenbein `#f0ede4`; sekundär `#9caeb5`.
- Akzent: Jade `#8bd8c1`; Warnung `#dbc08c`; Fehler `#e6a29c` mit Text und Symbol.
- Georgia als lokal verfügbare Serifenschrift für Überschriften; Arial/Helvetica für Bedienung und Fließtext.
- Sidebar statt horizontaler Hauptnavigation. Fünf Hauptbereiche: Übersicht, Projekte, Arbeit, Fähigkeiten, Jarvis. Nutzung und Einstellungen sekundär.
- Übersicht: Augen/Grinsen, Himmelsmechanik, große Wortmarke „AI Workforce“. „Zuletzt bearbeitet“ klein darunter, ohne Kasten oder Vorschaubild. Kein Untertitel „Deine Aufträge“.
- Illustrationen auf Folgeseiten sparsam und sekundär einsetzen.
- Das Gesicht bleibt auf Augen und Mund reduziert. Keine Ohren, Nase, Hörner oder Kopfkontur.
- Animationen nur dezent. Prototype: Einblenden/Erwachen und minimale Bewegung des gesamten Motivs. Unabhängige Pupillenverfolgung und Blinzeln sind noch keine ausgearbeitete Animation; dafür später getrennte Ebenen des Motivs erstellen.
- Desktop: 220px Sidebar, Hauptbereich max. 1440px, 48px Innenabstand. Mobil <=700px: ausklappbare Sidebar, einspaltige Inhalte. Sichtbarer Fokus, native Dialoge, beschriftete Eingaben.

## Architektur und wichtige Regeln

1. Daten pro aktivem Projekt unter `/api/projekte/<id>/…`; ohne Auswahl `/api/…`.
2. Genau ein vorhandener Status-Poll; nicht pro Seite neue Timer anlegen.
3. Zulässige Aktionen ausschließlich aus `naechster.art`, Status und Serverfehlern ableiten. Die lokale Prototyp-State-Maschine ist KEIN Ersatz dafür.
4. Serverweit eine aktive Ausführung. Der Server bleibt maßgeblich, auch wenn der Browser einen Start deaktiviert.
5. ZWINGEND-Start, Kenntnisnahme und Abnahme mit explizitem Klick und Pflichtbegründung.
6. Eine erfolgreiche Ausführung ist keine menschliche Abnahme.
7. Automatische Anpassungen maximal 3. Jeder Neustart benötigt erneut die vorgeschriebene Freigabe.
8. Fehlerhafte oder fehlende Daten sind „nicht verfügbar“, nicht 0. „Nichts offen“ nur, wenn alle vier Attention-Quellen erfolgreich leer sind.
9. Keine erfundenen Kosten, Restbudgets, Laufzeit-Kennzahlen, Teamverwaltung oder implizite Parallelität ergänzen. Health ist ab V9 ausdrücklich gewünscht, aber nur nachweisbasiert gemäß TECHNICAL-INSIGHT-CONTRACT.md.
10. Git-Befehle nur kopierbar anzeigen. Nie ausführen.
11. Ein einziges aria-live für Persona/Status. Der Prototyp nutzt eine gemeinsame Statusmeldung; in den bestehenden Persona-Status integrieren, keine zweite Live-Region ergänzen.
12. Zustände, Texte und Beispiel-IDs nicht hardcodiert ins Produkt übernehmen. Insbesondere Review-Urteile, Dateinamen, Zeiten, Rollenbesetzung und Nutzungszahlen sind Fixture-Daten.

## Informationsarchitektur & Datenzuordnung

Alle Endpunkte unten sind relativ zum aktiven Projekt. Aufwand meint UI-Integration, keine verbindliche Schätzung des Backends.

| Ansicht / Route | Problem heute | Vorschlag / Nutzen | Vorhandene Daten | Zustände | Aufwand | Neue Daten? |
|---|---|---|---|---|---|---|
| Übersicht `#/uebersicht` | Viele gleichrangige Kennzahlen | Zuletzt bearbeitet + deine Entscheidung + aktuelle Arbeit + nächstes Ziel | zustand, workflows, workitems, roadmap | lädt, leer, aktiv, wartet, Fehler, nicht verfügbar | mittel | Nein; „zuletzt“ aus vorhandenen Lauf-/Checkpoint-Zeitstempeln ableiten, fehlende Zeit nicht erfinden |
| Projekte `#/projekte` | Kontextwahl und Arbeit vermischt | Ruhige Projektkarten, eindeutiger aktiver Kontext | projekte, zustand je gewähltem Projekt | lädt, leer, verfügbar, aktiver Lauf, Fehler | mittel | Beschreibung/letztes Ergebnis pro Portfoliokarte nur zeigen, wenn aus bestehender Projektakte abrufbar; sonst Zusatzabfrage bzw. neue Daten nötig |
| Projekt anlegen `#/projekt/neu` | Zu viele Begriffe am Anfang | Name, optionales Ziel, Ordner; Kennung in Details | bestehende Projektanlage-Aktion | Eingabe, Validierung, speichert, Fehler, Erfolg | mittel | Optionales Ziel separat über Coach/Projektakte speichern; falls nicht vorhanden neue Persistenz nötig |
| Projekt `#/projekt/:id` | Projektstand unklar | Nächster Schritt und letzte relevante Ereignisse | zustand, workflows, roadmap, Checkpoints | lädt, leer, wartet, Arbeit, Fehler | mittel | Nein; Ereignisse nur aus bestehenden Zeitstempeln |
| Roadmap `#/projekt/:id/roadmap` | Unklarer Prozentfortschritt | Etappen und zugehörige Feature-Status | roadmap | lädt, leer, offen, in Umsetzung, abgeschlossen, nicht verfügbar | klein | Nein |
| Projektakte `#/projekt/:id/akte` | Dateien ohne fachlichen Einstieg | Vision, Features und Befunde mit verständlichen Titeln | roadmap, workitems/Pfade | lädt, leer, Parse-Probleme, nicht verfügbar | mittel | Kein allgemeiner Datei-Browser vorgetäuscht; zusätzliche Akteninhalte ggf. neue Daten |
| Arbeit `#/arbeit` | Runs/Workflows technisch und vermischt | Auftrag als Hauptobjekt, Ablauf darunter | auftraege, workflows, zustand | alle sechs Workflow-Status, lädt, leer, Fehler | groß | Nein |
| Features/Befunde `#/arbeit/features`, `#/arbeit/befunde` | Dichte technische Liste | Suchbare Liste, Titel/Nutzen/Status; Details erst bei Auswahl | workitems?typ&status&prioritaet | lädt, leer, Filter ohne Treffer, Fehler, Parse-Befunde | mittel | Nein |
| Feature/Befund `#/arbeit/:id` | Unklarer nächster Schritt | Ziel, Kriterien, Einordnung; Auftrag vorbereiten | workitems, Feature-Pfad, POST features/:id/auftrag | vorhanden, ungültig, routet, Routing-Fehler, retry | mittel | Kriterien nur aus Akte/angelegtem Auftrag übernehmen |
| Auftrag `#/auftrag/neu` | Rollen/Modelle überfordern | Titel, Ergebnis, Kontext; Ablauf anschließend prüfen | Auftrag-anlegen-/Routing-Aktionen | Eingabe, Validierung, routet, Fehler, Vorschlag | mittel | Nein |
| Freigabe `#/auftrag/pruefen` | Startwirkung unklar | Rollenfolge, Kontext, Grund; nächster Schritt ausdrücklich freigeben | Workflow, naechster.art, Schrittfreigabe | bereit, Rückfrage, anderer Lauf aktiv, ungültig | groß | Nein; geplante Skill-Empfehlungen gesondert F36 |
| Ablauf `#/workflow/:id` | Sackgassen und widersprüchliche Aktionen | Schritt-Timeline und eine nächste Hauptaktion | workflows/:id, zustand | OFFEN, WARTET_FREIGABE, LAEUFT, ABGESCHLOSSEN, KLAERUNG_ERFORDERLICH, GESTOPPT; ungültig | groß | Nein |
| Abnahme `#/abnahme/:id` | Technischer Erfolg wirkt wie erledigt | Nutzen, Review-Urteil, Kriterien/Nachweise, Dateiübersicht, begründete Entscheidung | workflows/:id/abnahme | bereit, bereit nach Korrektur, blockiert, Anpassung n/3, angenommen/abgelehnt, fehlt/Fehler | groß | Nein |
| Ausführungen `#/arbeit/verlauf` | Begriff Runs unverständlich | Einzelne Arbeitsschritte unter zugehörigem Auftrag | laeufe | lädt, leer, aktiv, erfolgreich, verweigert, fehlgeschlagen | mittel | Nein |
| Ausführung `#/ausfuehrung/:id` | Rohdaten dominieren | Verlauf, Klartext-Ursache, nächster Schritt; technische Akte aufklappbar | laeufe/:id, Fortschritt, Checkpoints | läuft, wartet, abgebrochen, fehlgeschlagen, erfolgreich, nicht verfügbar | groß | Verbesserte strukturierte Ursachen F744; keine Ursache aus Rohtext erraten |
| Entscheidungen `#/entscheidungen` | Attention mischt technische Objekte | Menschliche Frage als Titel, direkte Aktion; vier Quellen nachweisbar | zustand, startfehler, P0/P1-workitems | wartet, leer nur bei vier leeren Quellen, teilweise nicht verfügbar | mittel | Nein |
| Fähigkeiten `#/faehigkeiten` | Riesige Liste ohne Nutzen | Kacheln mit Nutzen, Typ und Freigabestatus | ressourcen | lädt, leer, Suche, verfügbar/freigegeben/nicht verbunden, Fehler | mittel | Nein |
| Rolle `#/faehigkeiten/rollen` | Besetzung und Verantwortung vermischt | Vertrag, Vorlagenbesetzung, tatsächlicher Einsatz getrennt | rollen/:rolle, abdeckung, laeufe | besetzt, Lücke, unbekannt | mittel | Nein; keine Overrides vor V1 |
| Scout `#/faehigkeiten/scout` | Kandidaten schwer einzuordnen | Bedarf → Kandidaten → Vormerken | bestehende Scout-Suche/Vormerken-Aktion | sucht, keine Treffer, Kandidaten, Fehler, gemerkt | mittel | Nein |
| Empfehlungen `#/faehigkeiten/empfehlungen` | Geplante Auswahl unklar | Checkbox mit Grund und getrennten Zuständen | F36 Empfehlungen/installation/anwendbar-Regel | empfohlen, ausgewählt, nicht freigegeben, nicht verfügbar | groß | Ja, geplante F36-Daten; sichtbar In Entwicklung |
| Jarvis `#/jarvis` | Gestopfter Chat | Breite Gesprächsfläche, wenige Vorschläge, klarer Projektkontext | chat, lokaler Statusfilter | leer, sendet, liest Werkzeug/Ziel, Antwort, Fehler | groß | Nein; Prototyp nutzt gekennzeichnete Beispielantworten |
| Coach `#/jarvis/coach` | Gespräch führt nicht klar zum Auftrag | Ziel → Nutzen → Umfang → sichtbarer Entwurf → Auftrag | sparring, Sparring-zu-Auftrag | leer, Interview, Entwurf, Fehler | groß | Nein |
| Nutzung `#/nutzung` | Tokenanzeige unverständlich | Ausführungen mit/ohne Messung; gelesen/erzeugt; technische Gruppen separat | verbrauch?von= | 7/30/gesamt, leer, teilweise unbekannt, nicht verfügbar | mittel | Nein; keine erfundenen Zeitreihen oder Geldumrechnung |
| Produkt `#/produkt` | Ergebnis schwer erreichbar | Öffnen/Starten und read-only Vorschau | geplante Kernfunktion | nicht konfiguriert, startet, Fehler, geöffnet | groß | Ja, geplante Start-/Ergebnis-Anbindung; In Entwicklung |
| Einstellungen `#/einstellungen` | Unruhige Animation | Bewegung steuerbar, Systempräferenz hat Vorrang | lokale Darstellungspräferenz | aktiv/reduziert | klein | Nein |

## Prototyp ausprobieren

- Im Kopf das Projekt wechseln.
- Projekte → Neues Projekt → Coach.
- Arbeit → Auftrag anlegen → Ablauf prüfen → Freigabe mit Begründung.
- Arbeit → Bauen aus der Akte → Abnahme → Annahme/Anpassung/Ablehnung.
- Arbeit → Ausführungen → Fehler → Kenntnisnahme/Fortsetzung.
- Fähigkeiten → Suche, Filter, Rolle, Scout.
- Jarvis/Coach → Nachrichten schreiben; nach drei Coach-Antworten erscheint ein Entwurf.
- Nutzung → Zeiträume und technische Details.
- Einstellungen → leere/nicht verfügbare Quellen und ungültigen Ablauf testen.

## Bewusste Grenzen des Prototyps

- Die wichtigsten Seiten und Interaktionen sind gestaltet; kein vollständig nachgebauter Orchestrierungskern.
- Fixture-Daten sind exemplarisch. Backend-Integration muss alle sechs Workflow-Status und alle Review-Urteile/Quellenfehler befüllen.
- Keine autonome Fertigstellung eines Demo-Runs; gestartet bleibt gestartet, bis bewusst gestoppt wird.
- Die hochriskante Architekt → Architecture-Advisor → Ausführung → Review-Kette ist im Freigabe-Kontext beschrieben, aber nicht als eigene Live-Kette simuliert.
- Bilder sind Raster-Assets. Die Persona bewegt sich als ein Motiv; unabhängige Augenbewegung ist Folgearbeit.
- Browserbasierte visuelle Endprüfung war in der verfügbaren statischen Sites-Umgebung nicht möglich. JS-Syntax, 38 Routen und zentrale Zustandsübergänge wurden geprüft. Responsive Verhalten ist implementiert, aber noch visuell im Zielbrowser zu prüfen.
- WebMCP: Read-State und Hauptnavigation bei unterstütztem document.modelContext. Native WebMCP-Kontextprüfung war nicht verfügbar; nicht als getestet behaupten.

## Sinnvolle Implementierungsreihenfolge

1. Tokens, Shell, Navigation, Projektauswahl und reduzierte Bewegung.
2. Übersicht und Entscheidungen aus den vorhandenen Quellen.
3. Auftrag/Ablauf/Abnahme mit unveränderten Servergates.
4. Features/Befunde und Fehlerfortsetzung.
5. Jarvis/Coach in großzügiger Gesprächsansicht.
6. Fähigkeiten und Nutzung, danach F36 und Produktvorschau, sobald ihre echten Daten bereitstehen.

## Ergänzung: visuelle Orientierung und Chat-Dock (26.09.2026)

Neue Datei: `dist/experience.js` erweitert die bestehenden Routen und nutzt denselben App-Zustand. Im Produkt die Komponenten in die bestehende Modulstruktur integrieren; die Prototyp-Funktionsadapter sind keine dauerhafte Architekturvorgabe.

- **Feature-Hover:** 600 ms Verweilen zeigt eine interaktive Vorschau mit Beschreibung, Status, zuständiger Rolle, Schrittfortschritt und Detailaktionen. Tastaturfokus zeigt dieselbe Vorschau; Alt+Pfeil unten setzt den Fokus hinein. Escape schließt. Auf Touch öffnet der erste Tipp die Vorschau, deren Schaltfläche zur Detailseite führt.
- **Harness `#/harness`:** Projektübergreifende Karten und ein Phasenkreis mit Understand, Ideate, Analyze, Plan, Architektur, Builder, Tester und Deployer (Mensch). Kleine Mobilansichten wechseln zur lesbaren Zweispaltenfolge. Die Phasen sind ein Zielmodell, keine neu behaupteten Backend-Rollen.
- **Rollen-Mapping:** Understand/Ideate → Product Coach; Analyze → Router; Plan → Router/Architect (keine separate Planner-Rolle im Briefing); Architektur → Architect/Architecture-Advisor nach Kontrolltiefe; Builder → Ausführung; Tester → Code Reviewer (keine belegte separate Tester-Rolle); Deployer → Mensch, mit getrenntem Abnahme- und Veröffentlichungsstatus. Eigene Phasenereignisse und echte Veröffentlichungszustände brauchen neue Daten, bevor sie live angezeigt werden können.
- **Ehrlicher Status:** Die Beispielakte F35 belegt Umsetzung und Review; frühere Phasen erscheinen ausdrücklich „Nicht erfasst“. Eine Abnahme ist keine Veröffentlichung. Für neu gestartete Beispielaufträge wird Builder als aktive Phase angezeigt.
- **Skelett `#/harness/skelett`:** Kontext → Einordnung → Freigabe → Ausführung → Review → Mensch → Akte. Scrollposition hebt den Baustein hervor; Klick springt zum Abschnitt. Aufgabe und erwartetes Ergebnis können als Designentwurf bearbeitet werden. Speichern lokal unter `jarvis-harness-design`; keine Änderung am Rollenvertrag oder Server. Für echte Konfigurationsbearbeitung sind eigene validierte Schreibendpunkte und Berechtigungsregeln nötig.
- **Fortschritt:** Abgeschlossene tatsächlich vorgesehene Schritte / Gesamtzahl der Schritte. Beispiel F35: Umsetzung, Review, menschliche Abnahme = 2/3, nach Abnahme 3/3. Keine prozentuale Schätzung von Restzeit oder Gesamtprojekt; ohne Ablauf kein Nenner und keine fingierte Prozentzahl.
- **Roadmap:** Vertikal verbundene Meilensteine mit Features und ihrer Reihenfolge. Keine erfundenen Termine; vorhandene roadmap-Daten verwenden. Feature-Vorschau per Hover integriert.
- **Chat:** Global unten rechts als Blase. Jarvis/Coach direkt im Dock umschalten; auf große Gesprächsansicht wechseln und wieder verkleinern. Gleicher Verlauf im Dock und in der großen Ansicht. Die Beispiele bleiben ohne KI-Anbindung.
- **Hell/Dunkel:** Umschalter im Kopf und in Einstellungen; Auswahl in `jarvis-theme` gespeichert. Das helle Schema verwendet eine warme Papierfläche mit dunkler Schrift und dunklerem Jade-Akzent.

Prüfung: JavaScript-Syntax, 40 Routen, Kernabläufe plus Hell/Dunkel, Chat-Dock/Modus, Phasenauswahl, Bearbeiten mit Read-back und Roadmap-Rendering im DOM-Testdouble. Keine visuelle Browserprüfung verfügbar. Kein echtes WebMCP-Browserkontext-Testing durchgeführt.

## Ergänzung: Produktmanagement-Oberfläche und horizontale Roadmap

Die Übersicht ist nun eine kompakte Arbeitsoberfläche statt eines großen Persona-Heros. Kleine Jarvis-Persona und Silberstich-Farbwelt bleiben erhalten.

- **Produktübersicht:** vier klar getrennte Werte (in Arbeit, deine Entscheidung, abgenommen, geplant); konkrete Abnahme/Rückfrage mit direkter Aktion; Workforce-Status; nächste geplante Arbeit; kompakte horizontale Roadmap; Entwicklungsstand je Eintrag; bereits erledigte Umsetzung und Prüfung separat.
- **Definition fertig:** „Abgenommen“ wird erst nach menschlicher Abnahme gezählt. Erfolgreiche Umsetzung oder Review erhöhen diesen Wert nicht. Technische Teilfortschritte bleiben sichtbar.
- **Horizontale Roadmap:** Meilensteine entlang einer Verbindungslinie; aktueller Meilenstein markiert; kleine Einträge mit Statussymbol statt großer Feature-Karten. Details bei Hover/Fokus; Klick öffnet den Eintrag. Mobil nur innerhalb der Roadmap horizontal scrollen, nicht die gesamte Seite. Keine erfundenen Datums- oder Zeitachsen.
- **Arbeitsvorrat:** getrennte Listen für Features (`#/arbeit/features`), Bugs (`#/arbeit/bugs`) und Harness Improvements (`#/arbeit/improvements`). Entwicklungsboard unter `#/arbeit/board` mit Geplant / In Arbeit / Braucht dich / Abgenommen. Suche sowie Status- und Prioritätsfilter in den Listen. Bestehende Aufträge und Ausführungen bleiben als sekundäre Register erreichbar.
- **Produktplanung:** Einträge erfassen, Priorität wählen, Meilenstein zuordnen, als nächste Arbeit vormerken. Diese Aktionen starten keine Entwicklung. „Auftrag vorbereiten“ übergibt den Eintrag mit seiner ID in den vorhandenen Auftrags- und Freigabeablauf.
- **Einheitliches Modell:** Übersicht, Board, Listen, Roadmap und Hover lesen dieselbe Einordnung (`pmInfo`) für Beispielstatus und Zuständigkeit. Nach Abnahme aktualisieren sich dieselben Oberflächen. Ein neu erfasster Eintrag ist geplant, nie automatisch in Arbeit.
- **Datenbedarf für das echte Produkt:** Der Lesebestand `workitems`, `roadmap`, `workflows`, `auftraege` trägt die Darstellung. Die Kategorie „Harness Improvement“ benötigt eine eindeutige Klassifikation (bestehende Typen plus Projekt-/Bereichsbezug; nicht allein aus dem Titel raten). Schreiben von neuen Arbeitsvorrat-Einträgen, Prioritäten, Meilensteinzuordnungen und Reihenfolge ist im Briefing nicht als Endpunkt belegt: **braucht validierte Schreibendpunkte bzw. bestätigte bestehende Aktenaktionen**. Im Prototyp gelten solche Planungsänderungen nur in der geöffneten Sitzung.
- **Beispielbestand:** F35 Feature; F36 Feature; F744 Harness Improvement; B12 Bug; geplante Kernfunktion Produktvorschau. `product-preview` ist eine UI-Fixture-ID, keine behauptete echte Feature-ID. Die bisher doppelt dargestellten Teile von F36 zählen hier als ein Feature.
- **Prüfung:** Syntax, Routen, Kategorien, Eintrag anlegen, Priorität/Meilenstein ändern, Übergabe an Auftrag und Aktivstatus nach Freigabe im DOM-Testdouble geprüft. Keine echte Backend- oder visuelle Browserprüfung.

## Produkt-Challenge: vom Leitstand zum PM-Werkzeug

Die nächste Überarbeitung wurde aus der Nutzungsperspektive eines Produktmanagers vorgenommen, der mehrere Produkte mit einer Workforce entwickelt.

### Kritische Befunde und konkrete Änderungen

1. **Arbeit ohne sichtbares Produktziel.** Eine Aufgabenliste erklärt nicht, warum etwas entwickelt wird. Jetzt: kompaktes Produktbriefing mit Zielgruppe, Problem, Ziel der Version und Erfolgskriterien. Lokal pro Produkt gespeichert. Für echte Nutzung braucht es eine bestätigte Produktakten-Schreibaktion; keine neue Backend-Funktion wird behauptet.
2. **Produktwechsel ohne Orientierung.** Jetzt: Portfolio mit Produktziel, offenen Entscheidungen, abgenommenen Einträgen und aktiver Rolle. Werte stammen aus denselben Beispielobjekten wie Entwicklung und Roadmap, kein Health-Score.
3. **Entscheidungen als Nebeneinstieg.** Jetzt: eigene Hauptnavigation „Entscheidungen“; Abnahmen und Rückfragen auf der Produktübersicht; Roadmap und Entwicklung direkt erreichbar. Die vier vorhandenen Attention-Quellen bleiben erhalten.
4. **Harness mit Prozess verwechselt.** Das wurde korrigiert. Aufbau: Agents/Rollen, Skills, Hooks, MCP-Verbindungen, Agent-Anweisungen (AGENTS.md), Projektdateien/Git (.gitignore/Konfiguration), Kontrollzustand/Nachweise. Entwicklungsphasen sind ein eigener Reiter und kein Ersatz für das Inventar.
5. **Identität nur auf der Startseite.** Augen und Grinsen jetzt dauerhaft im globalen Kopf und in der Chat-Blase. Ein Klick öffnet Jarvis. Die kleine Persona verdrängt keine primäre Arbeitsfläche. Systempräferenz für reduzierte Bewegung bleibt wirksam. Unabhängige Pupillenverfolgung und echtes Blinzeln sind weiterhin eine spätere Animation mit getrennten Ebenen, nicht als fertig behauptet.
6. **Aktive Arbeit nicht sauber von vorbereiteter Arbeit getrennt.** Korrigiert: Jeder neue Auftrag erhält eine eindeutige ID und einen eigenen Status. Ein vorbereiteter Auftrag stoppt oder übernimmt nicht die aktive Ausführung. Die aktive Ausführung gehört explizit zu Produkt und Auftrag. Ein zweiter Start bleibt gesperrt.
7. **Projektübergreifend irreführende Chatantworten.** Jarvis-Statusantworten für andere Produkte verwenden deren Ziel und deren Arbeitsvorrat statt immer den AI-Workforce-Beispielstand zu nennen. Weiterhin gekennzeichnete Beispielantworten, keine KI-Verbindung.

### Harness-Inventar und Bearbeitung

Das technische Inventar ist eine interaktive Struktur mit anklickbaren Bausteinen und Detailabschnitten. Reale Hook-Konfigurationen, MCP-Verbindungen und Datei-Inhalte wurden nicht eingelesen. Deshalb wird kein installierter Bestand und keine aktive Verbindung behauptet. Agents/Skills sind Beispiele aus dem Briefing; AGENTS.md ist eine Referenz aus dem Beispielkontext, keine gelesene Datei.

„Änderung vorschlagen“ erzeugt einen projektspezifischen Harness-Improvement-Eintrag, der anschließend priorisiert, als Auftrag vorbereitet und freigegeben werden kann. Keine direkte Konfigurationsmutation. Designnotizen bleiben getrennt in lokaler Vorschau-Speicherung.

Benötigte spätere Daten: Projekt-/Datei-Inventar, Herkunft und Status von Hooks/Skills/MCPs, read-only Dateiinhalt, sichere Änderungsaktionen und Validierung. Konfigurationsgeheimnisse niemals in Inventar, Protokoll oder UI ausgeben.

### Navigation

Produktübersicht → Alle Produkte → Roadmap → Entwicklung → Entscheidungen → Workforce. Fähigkeiten sind innerhalb der Workforce erreichbar. Jarvis und Product Coach sind global über die Persona/Chat-Blase verfügbar; vergrößern/verkleinern bleibt erhalten. Nutzung und Einstellungen bleiben sekundär.

### Prüfung und Grenzen

Syntax, vorhandene Routen und Kernabläufe plus Produktbriefing, Portfolio, Bestandsgliederung, Hook-Verbesserungsvorschlag und paralleles Planen bei weiterhin genau einer aktiven Ausführung im DOM-Testdouble geprüft. Keine browserbasierte visuelle Prüfung und keine Backend-Integration. Der vorhandene Server muss weiterhin alle Freigaben und Statusentscheidungen autoritativ prüfen.

## V5 – Produktplanung, Timeline und Prioritäten

- Einstieg ohne Hash öffnet das Produktportfolio. Bubbles zeigen abgenommene erfasste Einträge; der Nenner ist nicht der geschätzte Gesamtumfang des Produkts.
- Roadmap als horizontaler Gantt-Entwurf mit Meilensteingruppen, kleinen Feature-/Bug-/Improvement-Zeilen, Hover-Vorschau und verlinkten Zeitbalken. Sechs relative Beispielwochen, keine behaupteten Termine. Feature-Detail erlaubt Start-/Endwoche zu ändern; Ende vor Start wird abgewiesen. Neue Einträge ohne Zeitfenster bleiben ungeplant.
- Status-Kanban bleibt aus Ausführung und menschlichen Entscheidungen abgeleitet. Zusätzlich Prioritäts-Kanban P0–P3 mit Drag-and-drop und alternativ Auswahlfeldern (Tastatur/Touch). Priorisierung startet keine Arbeit und verändert keine Abnahme.
- Liste und Prioritätskarten bieten direkte Auftragsvorbereitung. Startfreigabe und Single-Run-Sperre bleiben erhalten.
- Übersicht und Detail zeigen Zuvor / Jetzt / Danach sowie erwarteten Output. Worker und Modell werden getrennt: Claude Code bzw. Codex sind keine Modellnamen. Fehlende Modellbeobachtung wird explizit angezeigt.
- Zuletzt umgesetztes Beispiel F35 ist von menschlicher Abnahme getrennt. Vision, Zielgruppe und Erfolgsmaß bleiben im vorhandenen Produktbriefing.

### Integration / Grenzen

Die Vorschau nutzt Beispieldaten, keine Live-Workforce. Prioritäten und Zeitfenster gelten nur für die laufende Vorschau-Sitzung. Für den echten Betrieb brauchen Einträge persistente Planung (Start/Ende, Zeitzone bzw. relative Planung), Versionierung und validierte Schreibaktionen. Balkenfüllung stellt abgeschlossene Schritte dar, keine verstrichene Zeit. Keine erfundenen Abhängigkeiten, Deadlines, Modelle oder Einsatzstatistiken ergänzen. Tatsächliches Modell aus Laufbeobachtung mit Quelle/Zeitpunkt übernehmen; geplante Zuweisung separat behandeln.

Inspiration: bereitgestellte Roadmap-Vorlage; Aha! Strategie–Arbeit-Verknüpfung (https://support.aha.io/aha-roadmaps/support-articles/strategy/strategy-introduction~7444674143548073697); ClickUp unterschiedliche Ansichten derselben Einträge (https://help.clickup.com/hc/en-us/articles/6310314670359-List-view-vs-Board-view). Eigenes bestehendes visuelles Design bleibt erhalten.

Prüfung: JavaScript-Syntax, 40+ Routen und Zustandsübergänge mit DOM-Testdouble; neue Prioritätsänderung ohne Start, gültiges/ungültiges Zeitfenster, Modell-Unbekannt und Bubbles geprüft. Kein echter Browser-Layouttest in dieser Umgebung.

## V6 – Produktcockpit, Produktzyklus, Änderungen und Insights

- Produktfortschritt steht direkt unter dem Titel, vor Produktbriefing und Detailansichten. Abgenommene Einträge / erfasste Einträge; keine Aufwandsprognose. Daneben aktuelle Rolle und separate Deployer-Kachel (Mensch). Laufende Rolle, notwendige menschliche Entscheidung und keine aktive Rolle werden unterschieden.
- Produktzyklus nach der bereitgestellten Aha!-Konzeptgrafik: Strategie → Nutzer verstehen → Feedback sammeln → Lösungen erkunden → Planen → Ausrichtung teilen → Entwickeln → Dokumentieren → Veröffentlichen → Wirkung prüfen. Kein Ersatz für technische Harness-Phasen. Bestehendes Produktbriefing, Roadmap, Kanban und Entscheidungen sind verknüpft. Pro Stufe können quellenbezogene Notizen als Beobachtung, Hypothese, Feedback, Entscheidung oder Messwert erfasst und mit einem Eintrag verbunden werden. Verknüpfte Notizen erscheinen auch unter dessen Insights.
- Geplante Einträge: Titel, Beschreibung und Kriterien direkt ändern, Änderungsgrund Pflicht. Bereits gestartete/geprüfte/abgenommene Einträge: neue verknüpfte Änderungsfassung mit eigener späterer Freigabe; Original und Akzeptanzzustand bleiben unverändert. `parentId` referenziert Original, `revisionHistory` hält alte Spezifikation, Grund und Zeitpunkt. Kein impliziter Start.
- Insights bei Features, Bugs und Improvements: aktueller beobachteter Vorschauzustand, explizite offene Analysefragen, manuell erfassbare Erkenntnisse mit Pflichtquelle. Coach-Einstieg bereitet eine Nachricht vor. Keine automatische KI-Analyse oder echte Ursachenfeststellung behauptet.
- Vier Sprachen über Auswahl oben: Deutsch, English, Türkçe, Русский. `localization.js` enthält Wörterbuch und Übersetzung der Navigation, Kernbedienung sowie neuen Produktsichten. Browserpräferenz `jarvis-language` und `html.lang` werden gesetzt. Produktinhalte, Quellen, Namen und Nutzereingaben werden nicht automatisch übersetzt. Einige ältere technische Hilfetexte verbleiben derzeit deutsch; bei Integration in das echte Frontend auf stabile Übersetzungsschlüssel für sämtliche Texte umstellen, inklusive dynamischer Meldungen und Pluralformen.
- Änderungsfassungen, Insights und Zyklusnotizen sind Sitzungsentwürfe, nicht dauerhaft gespeichert. Echte Integration braucht versionierte Spezifikationen und Start-Snapshots, serverseitige Konfliktprüfung, persistente quellenbezogene Insights, Produktzyklus-Daten sowie echte gemessene Outcome-Werte. Lokales Produktbriefing und Sprache behalten die bisherige gerätebezogene Speicherung.
- Validierung: bestehende Routen/Transitions plus zehn Zyklussichten, Position Cockpit vor Briefing, Originalschutz bei Revision, direkte geplante Bearbeitung, verknüpfte Insights und vier Sprachwörterbücher im DOM-Testdouble. Kein realer Browser-Layouttest.


## V7 – Finaler Einstieg und Navigation

Start ohne Hash bei #/start. Augen und Grinsen des Original-PNGs werden in drei CSS-Ebenen zeitversetzt eingeblendet. Enter the Rabbit hole führt nach #/uebersicht. Deep Links bleiben erhalten. Bei reduced motion statisch. Alle Produkte steht klein über Nutzung; Workforce ist der unterste Navigationspunkt. START-HERE-CLAUDE.md beschreibt die verbindliche finale Übergabe und Asset-Grenzen.

## V8 – Produktanlage und Kontextwechsel

Siehe START-HERE-CLAUDE.md und UX-FINAL-REVIEW.md. Neue Formulare product-create / product-edit. Name und Ziel genügen für Produktplanung. activateProduct(id) bewahrt Task-/Coach-Entwurf, Nachrichten und Composer separat je Produkt in productContexts. Alle normalen Wechselpfade nutzen denselben Mechanismus. Globale Ausführung bleibt unangetastet. new-task ruft ensureProductTaskItem() für Eintragsverknüpfung auf. Neue Produkte haben einen reduzierten Einstieg. Unfertiger Auftrag wird in der Übersicht fortsetzbar angezeigt. Getestet: Anlage mit kyrillischem Namen ohne Ordner, Bearbeitung bei stabiler Identität, leerer Zustand, Entwurf/Gespräch wiederfinden, Verknüpfung und unveränderte aktive Ausführung; weiterhin kein Browser-Layouttest.


## V9 – Technischer Einblick

Projektpfad `projekt/:id/technik/:tab` mit architecture, data, code, issues und health. Pro Projekt getrennte techStore-Daten. Beispielarchitektur/-modell explizit markiert. Repository-Link wird auf HTTPS ohne Benutzerinfo begrenzt. Reale Designreferenzdateien per Whitelist read-only sichtbar; keine behaupteten Live-Produktdateien. Fragen an Coach vorbefüllt, Befunde idempotent als Arbeitsvorrat, manuelle quellenbezogene Health-Checks. Alle Integrationsverträge und Bewertungsgrenzen in TECHNICAL-INSIGHT-CONTRACT.md. Routentests, Nullscore bei fehlenden Checks, sichtbarer fail, eindeutige Übernahme, Fragenkontext, URL-Prüfung und Projektisolation geprüft. Kein Browser-Layouttest.


## V10 – Drei Phasen und Brain

Siehe BRAIN-AND-PHASES.md. Produktzyklus unter Ideate/Plan/Deliver gruppiert, je drei Unterpunkte. Brain mit Kreisgraph, Inspector, Suche/Filter/Zoom, Knotenbearbeitung und benannten Verbindungen. Architecture.md/Claude.md als projektspezifische Sitzungsentwürfe; Challenge vorbefüllt im Coach. Echte Dateipfade, Graphquellen und Versionen erst bei Integration ermitteln.
