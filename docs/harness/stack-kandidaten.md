<!--
Ziel-Pfad im Repo: docs/harness/stack-kandidaten.md
Stand dieser Fassung: 29.09.2026 (Datennachtrag Opportunity Scanner; Verdrahtung F36 WS-3)
Erstlektüre: nein — Nachschlagewerk für den Architekten, kein Teil des Einstiegs.
-->
# Stack-Kandidaten (Gruppe 2 der Recherche-Übernahme)

Produkt-Bibliotheken und Werkzeuge, die ein Projekt der Workforce als
Teil seines eigenen Stacks nutzen kann — keine Laufzeit-Fähigkeiten eines
Laufs (die stehen im Katalog `ressourcen.json`). Grundlage ist E-F36-5
(`docs/projekt/zielfassung.md` §13.6); die Einordnung aller 38 Kandidaten
steht in `features/F36/katalog-uebernahme.md` (samt Datennachtrag 29.09.2026).

**Verdrahtet seit F36 WS-3.** Ist der Stack eines Projekts offen
(`istStackOffen`), bekommt der Architekt einen Auszug dieser Tabelle
(Name, Zweck, Einsatzgebiet, Lizenz, Kosten; ohne Zeilen mit
„zurückgestellt“) unter der Überschrift „Stack-Kandidaten (ungeprüft,
nicht installiert; nur als Option nennen)“ in seinen Auftrag. Gelesen wird
diese Datei aus der Installation der Workforce, nicht aus dem Projekt; bei
entschiedenem Stack entfällt der Auszug. Nichts davon ist installiert,
geprüft oder freigegeben. Vor einer Stack-Entscheidung Version pinnen und
die vollständige Lizenz lesen (Auswahlfilter der Quelle).

Alle Werte stammen aus `docs/harness/kandidaten-2026-09-15.md` (Prüfdatum
15.09.2026, keine eigene Recherche). „Quelle-Zeile" ist die Zeilennummer
der Bewertungsmatrix dort. Lizenzangaben mit „GitHub-Metadaten" sind
schwächere Evidenz als der Lizenzvolltext. Ausnahme: Lizenz, Zweck
(RapidAPI) und Standardschlüssel-Hinweis von Google Trends MCP stammen
von der offiziellen Projektseite
(Abruf 29.09.2026), weil die Quelle nur „je konkretem Server" nennt.

Datennachtrag (29.09.2026): Google Trends MCP (ein MCP-Server) und
Scientific-agent-skills (eine Skill-Sammlung) wären nach E-F36-5
Laufzeit-Fähigkeiten. Sie stehen auf Vorgabe des Auftrags hier, als
Bausteine, die ein Projekt wie der Opportunity Scanner (F30) selbst
einsetzt — nicht als Fähigkeit eines Laufs. Google Trends MCP ist
zurückgestellt (Entscheidung Stefan 29.09.2026, Begründung in der
Tabelle). Switchyard ist ausgeschlossen, weil die Kosten zum Werkzeug
gehören (Pflicht-API); Google Trends MCP ist zurückgestellt, weil das
Hindernis behebbar ist (eigener Schlüssel, belegter Preis).

| Name | Zweck | Einsatzgebiet | Lizenz | Kosten | URL | Quelle-Zeile |
|---|---|---|---|---|---|---|
| shadcn/ui | Anpassbare React-Komponenten als Grundlage des Designsystems. | UI | MIT (GitHub-Metadaten) | Lokal; 0 Lizenzgebühr | https://github.com/shadcn-ui/ui | 123 |
| Kibo UI | Ergänzt shadcn um komplexere Komponenten, etwa Kanban und Gantt. | UI | MIT laut offizieller Website | Lokal; kostenlos | https://www.kibo-ui.com/ | 124 |
| Thinking Orbs | Animierte Canvas-Zustandsanzeige für Jarvis und andere Agenten-UIs. | UI | MIT (GitHub-Metadaten) | Lokal; 0 Lizenzgebühr | https://github.com/Jakubantalik/thinking-orbs | 130 |
| pdfcn | Wiederverwendbare PDF-Komponenten für React (nicht offizielles shadcn). | Dokumente, UI | MIT (GitHub-Metadaten) | Lokal; kostenlos | https://github.com/shadcn-labs/pdfcn | 200 |
| MarkItDown | Konvertiert Dokumente und weitere Dateiformate in Markdown. | Dokumente | MIT (GitHub-Metadaten) | Lokaler Basispfad kostenlos; Azure-/LLM-Funktionen optional bezahlt | https://github.com/microsoft/markitdown | 216 |
| OCRmyPDF | Ergänzt gescannte PDFs um durchsuchbaren Text. | Dokumente | MPL-2.0 (GitHub-Metadaten) | Lokale CPU, kein LLM erforderlich | https://github.com/ocrmypdf/OCRmyPDF | 156 |
| AnyDoc | Schnelle Rust-Dokumentkonvertierung mit Python-/Node-Bindings. | Dokumente | MIT (GitHub-Metadaten) | Lokaler Betrieb | https://github.com/firecrawl/anydoc | 234 |
| OfficeCLI | Lokale Bearbeitung von DOCX, XLSX und PPTX per CLI. | Dokumente | iOfficeAI Apache-2.0; officecli/officecli MIT | Kandidat kostenlos; Agentenquota | https://github.com/iOfficeAI/OfficeCLI | 277 |
| Hyperframes | HTML-/CSS-basierte Videoerstellung für Agenten. | Video | Apache-2.0 (GitHub-Metadaten) | Framework kostenlos; Rendering und optionale KI extra | https://github.com/heygen-com/hyperframes | 195 |
| ntfy | Push-Benachrichtigungen für Jobabschluss, Fehler und Freigabeanfragen. | Benachrichtigung | Apache-2.0 oder GPL-2.0 laut README | Self-Hosting; gehostete Gratis-/Bezahlpläne | https://github.com/binwiederhier/ntfy | 178 |
| Portless | Stabile lokale Entwicklungs-URLs statt wechselnder Portnummern. | Entwicklungsumgebung | Apache-2.0 (GitHub-Metadaten) | Lokal; kostenlos | https://github.com/vercel-labs/portless | 267 |
| ScrapeGraph AI | LLM-gestützte strukturierte Extraktion aus Webseiten. | Datenanalyse (Opportunity Scanner) | MIT (GitHub-Metadaten) | Framework kostenlos; Modell/API, Browser/Proxies | https://github.com/ScrapeGraphAI/Scrapegraph-ai | 243 |
| Google Trends MCP (zurückgestellt) | **Zurückgestellt.** Entscheidung Stefan 29.09.2026: kostenpflichtige Schnittstelle (RapidAPI), Preis nicht belegt; ohne eigenen Schlüssel Rückfall auf eingebauten fremden Schlüssel (Datenschutz-/Vertrauensrisiko). Wiederaufnahme nur mit eigenem Schlüssel und belegtem Preis. Zweck: Google-Trends-Daten über einen Community-MCP-Server (RapidAPI „Google Trends Scraper"). | Datenanalyse (Opportunity Scanner) | MIT (offizielle Projektseite, 29.09.2026) | Datenprovider/API separat; Preis nicht verifiziert | https://github.com/andrewlwn77/google-trends-mcp | 320 |
| MixPost | Social-Media-Planung und Veröffentlichung auf eigenem Server. | Marketing (Opportunity Scanner) | MIT (GitHub-Metadaten) | Community-Code kostenlos; Server, APIs und Pro separat | https://github.com/inovector/mixpost | 153 |
| Scientific-agent-skills | Forschungs-Skills für wissenschaftliche Analysen und Datenquellen. | Datenanalyse (Opportunity Scanner) | MIT (GitHub-Metadaten) | Skills kostenlos; Daten-/API-/Compute-Kosten separat | https://github.com/K-Dense-AI/scientific-agent-skills | 207 |

## Hinweise aus der Quelle

- **OfficeCLI:** mindestens zwei gleichnamige Repos; bevorzugter
  Prüfkandidat ist iOfficeAI/OfficeCLI.
- **AnyDoc:** gegen MarkItDown an echten Dateien vergleichen; Formattreue
  vor Geschwindigkeit.
- **Hyperframes:** Schrift- und Medienrechte separat prüfen.
- **ntfy, Portless:** eher Infrastruktur als Bibliothek; ntfy ist in der
  Quelle auch für Benachrichtigungen der Workforce selbst gedacht.
- **ScrapeGraph AI:** nur für Fälle, die Firecrawl oder deterministische
  Parser nicht lösen; Inhalte als untrusted behandeln.
- **Google Trends MCP (zurückgestellt):** kein offizieller Google-MCP.
  Laut Projektseite braucht er einen RapidAPI-Schlüssel und fällt ohne
  eigenen Schlüssel auf einen eingebauten Standardschlüssel zurück.
  Trends sind relative Signale, keine Absatzprognosen.
- **MixPost:** nur mit passenden Plattformrechten und Review vor jeder
  Veröffentlichung; unterstützte Netzwerke konkret prüfen.
- **Scientific-agent-skills:** nur einzelne passende Statistik-/Research-
  Skills; wissenschaftliche Resultate brauchen fachliche Validierung.

## Nicht übernommen: Scraper für personenbezogene Daten (DSGVO)

Vorgabe Datennachtrag (29.09.2026): Google-Maps-Scraper
(`Mahanaicoach/google-maps-scraper-kit`, Quelle-Zeile 311),
Social-analyzer (`qeeqbox/social-analyzer`, 225) und Vayne (312) kommen
nicht in diese Liste. Begründung: **DSGVO** — sie erheben
personenbezogene Daten (Einträge zu lokalen Unternehmen und Personen,
Profile zu Nutzernamen, LinkedIn-Kontakte), für deren Verarbeitung ein
Projekt der Workforce keine Rechtsgrundlage belegen kann. Vayne ist
zusätzlich kostenpflichtig und kollidiert mit den LinkedIn-Regeln
(Quelle Z. 109, 312).
