<!--
Ziel-Pfad im Repo: docs/harness/stack-kandidaten.md
Stand dieser Fassung: 30.09.2026 (Scout F-800: Bausteine für Datenerhebung und -auswertung, eigene Prüfung 30.09.2026); davor 29.09.2026 (Datennachtrag Opportunity Scanner; Verdrahtung F36 WS-3)
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
15.09.2026, keine eigene Recherche) — ausgenommen die Zeilen mit
Quelle-Zeile „Scout F-800“: Sie beruhen auf eigener Prüfung vom
30.09.2026 (Lizenzvolltext, Paketregister, Repo; ohne Installation und
ohne Ausführung), Belege im Abschnitt „Scout F-800 (30.09.2026)“. Dort
steht auch die Nachprüfung von ScrapeGraph AI und Scientific-agent-skills
(Lizenzvolltext gelesen, Lizenzzelle entsprechend angepasst). Sonst ist
„Quelle-Zeile" die Zeilennummer der Bewertungsmatrix dort. Lizenzangaben mit „GitHub-Metadaten" sind
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
| ScrapeGraph AI | LLM-gestützte strukturierte Extraktion aus Webseiten. | Datenanalyse (Opportunity Scanner) | MIT (Lizenzvolltext, Scout F-800) | Framework kostenlos; Modell/API, Browser/Proxies | https://github.com/ScrapeGraphAI/Scrapegraph-ai | 243 |
| Google Trends MCP (zurückgestellt) | **Zurückgestellt.** Entscheidung Stefan 29.09.2026: kostenpflichtige Schnittstelle (RapidAPI), Preis nicht belegt; ohne eigenen Schlüssel Rückfall auf eingebauten fremden Schlüssel (Datenschutz-/Vertrauensrisiko). Wiederaufnahme nur mit eigenem Schlüssel und belegtem Preis. Zweck: Google-Trends-Daten über einen Community-MCP-Server (RapidAPI „Google Trends Scraper"). | Datenanalyse (Opportunity Scanner) | MIT (offizielle Projektseite, 29.09.2026) | Datenprovider/API separat; Preis nicht verifiziert | https://github.com/andrewlwn77/google-trends-mcp | 320 |
| MixPost | Social-Media-Planung und Veröffentlichung auf eigenem Server. | Marketing (Opportunity Scanner) | MIT (GitHub-Metadaten) | Community-Code kostenlos; Server, APIs und Pro separat | https://github.com/inovector/mixpost | 153 |
| Scientific-agent-skills | Forschungs-Skills für wissenschaftliche Analysen und Datenquellen. | Datenanalyse (Opportunity Scanner) | MIT (Lizenzvolltext, Scout F-800) | Skills kostenlos; Daten-/API-/Compute-Kosten separat | https://github.com/K-Dense-AI/scientific-agent-skills | 207 |
| Trafilatura | Lädt Webseiten und zieht Haupttext und Metadaten heraus; Ausgabe u. a. als Markdown, TXT, JSON oder CSV (Python-Bibliothek und CLI). | Datenerhebung K1 (Opportunity Scanner) | Apache-2.0 (Lizenzvolltext; Versionen vor 1.8.0 GPL-3.0-or-later) | Lokal; kostenlos, keine API | https://github.com/adbar/trafilatura | Scout F-800 |
| Mozilla Readability | Isoliert den Hauptinhalt einer bereits geladenen HTML-Seite (Lesemodus-Algorithmus von Firefox, JavaScript); braucht ein DOM wie jsdom. | Datenerhebung K1 (Opportunity Scanner) | Apache-2.0 (Lizenzvolltext) | Lokal; kostenlos | https://github.com/mozilla/readability | Scout F-800 |
| Playwright (Bibliothek) | Steuert Chromium, Firefox und WebKit per Code, um dynamische Seiten zu laden; die Bibliothek, nicht Playwright MCP. | Datenerhebung K2 (Opportunity Scanner) | Apache-2.0 (Lizenzvolltext) | Lokal; kostenlos; Browser-Binärdateien werden einmalig nachgeladen | https://github.com/microsoft/playwright | Scout F-800 |
| Cheerio | Deterministische Auswertung von HTML mit CSS-Selektoren (jQuery-artige API) in Node, ohne Browser. | Datenerhebung K3 (Opportunity Scanner) | MIT (Lizenzvolltext) | Lokal; kostenlos | https://github.com/cheeriojs/cheerio | Scout F-800 |
| feed-extractor | Liest RSS-, Atom-, RDF- und JSON-Feeds in ein einheitliches Format (Node), auch aus bereits geladenem Text. | Datenerhebung K4 (Opportunity Scanner) | MIT (Lizenzvolltext) | Lokal; kostenlos | https://github.com/extractus/feed-extractor | Scout F-800 |
| robots-parser | Wertet eine übergebene robots.txt aus (erlaubt oder gesperrt je URL und User-Agent); lädt selbst nichts. | Datenerhebung K4 (Opportunity Scanner) | MIT (Lizenzvolltext) | Lokal; kostenlos | https://github.com/samclarke/robots-parser | Scout F-800 |
| DuckDB | Eingebettete analytische SQL-Datenbank; fragt CSV, JSON und Parquet direkt ab. | Datenerhebung K5 (Opportunity Scanner) | MIT (Lizenzvolltext) | Lokal; kostenlos; Erweiterungen werden standardmäßig aus dem Netz nachgeladen | https://github.com/duckdb/duckdb | Scout F-800 |
| Polars | Dataframe-Bibliothek für schnelle lokale Auswertung (Python, Rust-Kern). | Datenerhebung K5 (Opportunity Scanner) | MIT (Lizenzvolltext) | Lokal; kostenlos; Cloud-Angebot optional, nicht nötig | https://github.com/pola-rs/polars | Scout F-800 |

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

## Scout F-800 (30.09.2026)

Auftrag F-800: generische, lokal lauffähige Bausteine für Datenerhebung
und -auswertung (K1 Webseite → Text/Markdown, K2 Browser-Automatisierung
als Bibliothek, K3 strukturierte Extraktion, K4 Feeds/HTTP/robots.txt,
K5 lokale Datenhaltung und Auswertung). Keine konkreten Datenquellen
(E-F30-4), nichts mit personenbezogenen Daten (F-801), keine Stealth-/
Anti-Bot-Werkzeuge; Auswahlfilter aus `docs/harness/kandidaten-2026-09-15.md`
(„Verbindlicher Auswahlfilter“). Geprüft ohne Installation und ohne
Ausführung, per Abruf von Repo, Lizenzdatei (Rohtext), GitHub-API und
Paketregister (npm bzw. PyPI) am 30.09.2026. „Letzter Push“ ist `pushed_at`
der GitHub-API (letzter Push auf irgendeinen Branch), kein Release-Datum.
Pin-Vorschläge sind die am Prüftag aktuelle Version, keine Freigabe. Was
nicht belegt ist, steht als „unklar“. Web-Inhalte wurden als Daten
behandelt. Den F30-Planungsschritt ersetzt das nicht (E-F30-4).

Belegpunkte je Kandidat: (1) Repo · (2) Lizenz (Volltext) · (3) Stand und
Maintainer · (4) Telemetrie · (5) kostenloser Basispfad ohne Pflicht-API ·
(6) Paket, Pin-Vorschlag, Fremdcode bei Installation · (7) Datenwirkung im
Basispfad.

### Trafilatura (K1)
1. https://github.com/adbar/trafilatura
2. Apache-2.0, Volltext unverändert (https://raw.githubusercontent.com/adbar/trafilatura/master/LICENSE). **Achtung: Versionen vor 1.8.0 sind GPL-3.0-or-later** (README, PyPI) — nur ab 1.8.0 pinnen.
3. Release 2.2.0 vom 31.07.2026 (PyPI); letzter Push 29.09.2026; Maintainer Adrien Barbaresi (Person, `adbar`).
4. Im README keine Telemetrie erwähnt; nicht auditiert → unklar.
5. Ja: Bibliothek und CLI, keine API, kein Konto (README, PyPI).
6. PyPI `trafilatura`, Pin-Vorschlag `trafilatura==2.2.0`; Abhängigkeiten u. a. lxml, urllib3, courlan, htmldate, justext. Ob die Installation Fremdcode ausführt (Wheel oder Quellpaket bei Abhängigkeiten): unklar; kein Browser-Download.
7. Nur die Abrufe der Ziel-URLs, wenn `fetch_url` genutzt wird; mit bereits geladenem HTML verlässt nichts die Maschine. robots.txt-Beachtung beim Abruf: unklar (README nennt nur „polite processing of download queues“).

### Mozilla Readability (K1)
1. https://github.com/mozilla/readability
2. Apache-2.0, Volltext mit Anhang, ohne Zusatzklauseln (https://raw.githubusercontent.com/mozilla/readability/main/LICENSE.md).
3. Letzter Push 04.08.2026; Release-Datum von 0.6.0 unklar; Maintainer Mozilla (Organisation).
4. Unklar (nicht gesucht; keine Laufzeit-Abhängigkeiten).
5. Ja: reine Bibliothek, keine API.
6. npm `@mozilla/readability`, Pin-Vorschlag `0.6.0`; keine Laufzeit-Abhängigkeiten, keine install-/postinstall-Skripte (https://registry.npmjs.org/@mozilla/readability/latest). Braucht zusätzlich ein DOM (z. B. jsdom), separat zu prüfen; für Markdown-Ausgabe ist ein weiterer Umwandler nötig (nicht geprüft).
7. Nichts: arbeitet auf bereits geladenem HTML.

### Playwright, Bibliothek (K2)
1. https://github.com/microsoft/playwright — nicht Playwright MCP (in `kandidaten-2026-09-15.md` Z. 67 und 290 als Laufzeit-Fähigkeit; hier nicht doppelt aufgenommen).
2. Apache-2.0, Volltext (https://raw.githubusercontent.com/microsoft/playwright/main/LICENSE); NOTICE-Pflicht bei Weitergabe beachten.
3. Letzter Push 30.09.2026; Maintainer Microsoft (Organisation); Release-Datum von 1.63.0 unklar.
4. In der Browser-Doku keine Telemetrie erwähnt; für Bibliothek und mitgelieferte Browser unklar.
5. Ja: lokal, keine API.
6. npm `playwright`, Pin-Vorschlag `1.63.0` (Abhängigkeit `playwright-core` 1.63.0); keine install-/postinstall-Skripte in den Registerdaten (https://registry.npmjs.org/playwright/latest). **Fremdcode:** Browser-Binärdateien lädt `npx playwright install` vom Microsoft-CDN; Spiegel über `PLAYWRIGHT_DOWNLOAD_HOST` (https://playwright.dev/docs/browsers).
7. Die besuchten Zielseiten samt Browser-Anfragen; Hintergrundverbindungen der Browser selbst: unklar. Einmalig der Browser-Download vom CDN.

### Cheerio (K3)
1. https://github.com/cheeriojs/cheerio
2. MIT, Volltext, „Copyright (c) 2022 The Cheerio contributors“ (https://raw.githubusercontent.com/cheeriojs/cheerio/main/LICENSE).
3. Letzter Push 30.09.2026; Maintainer cheeriojs (Organisation); Release-Datum von 1.2.0 unklar.
4. Unklar (nicht gesucht).
5. Ja: reine Bibliothek.
6. npm `cheerio`, Pin-Vorschlag `1.2.0`; keine install-/postinstall-Skripte, nur `prepare` für die Entwicklung (https://registry.npmjs.org/cheerio/latest). Abhängigkeiten u. a. parse5, htmlparser2, undici.
7. Nichts, solange nur geladenes HTML ausgewertet wird; der mitgelieferte HTTP-Client (undici) greift nur bei Abruf-Hilfsfunktionen.

LLM-gestützte Extraktion (K3): keine neue Zeile, ScrapeGraph AI steht bereits in der Tabelle (Nachprüfung unten).

### feed-extractor (K4)
1. https://github.com/extractus/feed-extractor
2. MIT, Volltext, „Copyright (c) 2015 Extractus“ (https://raw.githubusercontent.com/extractus/feed-extractor/main/LICENSE).
3. Letzter Push 06.08.2026; Maintainer extractus (Organisation); Release-Datum von 8.0.3 unklar.
4. Im README keine Telemetrie erwähnt → unklar.
5. Ja: Bibliothek, keine API.
6. npm `@extractus/feed-extractor`, Pin-Vorschlag `8.0.3`; keine Skripte; einzige Abhängigkeit fast-xml-parser (https://registry.npmjs.org/@extractus/feed-extractor/latest).
7. `extract(url)` ruft den Feed selbst ab; `extractFromXml`/`extractFromJson` arbeiten ohne Netz. Abrufer, Header und Zeitgrenze sind einstellbar.

### robots-parser (K4)
1. https://github.com/samclarke/robots-parser
2. MIT, Volltext, „Copyright (c) 2014 Sam Clarke“ (https://raw.githubusercontent.com/samclarke/robots-parser/master/LICENSE.md).
3. Letzter Push 08.09.2026; Maintainer Sam Clarke (Person); Release-Datum von 3.0.1 unklar.
4. Im README keine Telemetrie erwähnt → unklar.
5. Ja: Bibliothek.
6. npm `robots-parser`, Pin-Vorschlag `3.0.1`; keine Laufzeit-Abhängigkeiten, nur `test`-Skript (https://registry.npmjs.org/robots-parser/latest).
7. Nichts: wertet übergebenen Text aus, lädt die robots.txt nicht selbst.

Lücke K4: Ein HTTP-Client mit eingebautem Rate-Limit wurde nicht geprüft; bis dahin Abruf über das eingebaute `fetch` des Stacks mit eigener Warteschlange.

### DuckDB (K5)
1. https://github.com/duckdb/duckdb
2. MIT, Volltext, „Copyright 2018-2026 Stichting DuckDB Foundation“ (https://raw.githubusercontent.com/duckdb/duckdb/main/LICENSE).
3. Letzter Push 30.09.2026; Maintainer DuckDB (Organisation, Stiftung); Release-Datum unklar.
4. Telemetrie der Kern-Bibliothek: unklar (Erweiterungs-Doku erwähnt keine). Drittanbieter-Erweiterungen können eigene Telemetrie haben (Beispiel Query.Farm, abschaltbar per `QUERY_FARM_TELEMETRY_OPT_OUT`) — nur Kern-Erweiterungen nutzen.
5. Ja: eingebettet, keine API.
6. npm `@duckdb/node-api`, Pin-Vorschlag `1.5.6-r.1`; zieht `@duckdb/node-bindings` mit vorkompilierten Plattform-Binärdateien als optionale Abhängigkeiten, keine install-Skripte in den Registerdaten (https://registry.npmjs.org/@duckdb/node-api/latest, https://registry.npmjs.org/@duckdb/node-bindings/latest). Vorkompilierter nativer Code läuft beim Laden.
7. **Erweiterungen installieren und laden sich bei Bedarf selbst**, Standardquelle `http://extensions.duckdb.org` (https://duckdb.org/docs/current/extensions/installing_extensions). Abschalten über `autoinstall_known_extensions` und `autoload_known_extensions`; laut Suchergebnis zur DuckDB-Doku stehen beide standardmäßig an, im Seitenabruf nicht bestätigt → Standardwert unklar. Beim Abfragen von http(s)-Adressen gehen Anfragen an diese Ziele.

### Polars (K5)
1. https://github.com/pola-rs/polars
2. MIT, Volltext, „Copyright (c) 2025 Ritchie Vink“ und Teile NVIDIA (https://raw.githubusercontent.com/pola-rs/polars/main/LICENSE).
3. Letzter Push 30.09.2026; Maintainer pola-rs (Organisation); Release-Datum von 1.44.2 unklar.
4. Profiling/Monitoring ist opt-in (`pl.Config.enable_monitoring()`) und schickt dann den Abfrageplan an Polars Cloud, nicht die Daten (https://pola.rs/posts/profile-local-queries/). Sonstige Telemetrie: unklar.
5. Ja: lokal; Polars Cloud ist optional.
6. PyPI `polars`, Pin-Vorschlag `polars==1.44.2`; zieht `polars-runtime-32`/`-64` (vorkompilierter Rust-Kern). Ob die Installation Fremdcode ausführt: unklar (Wheel erwartet, nicht geprüft). Node-Bindung nicht geprüft.
7. Standardmäßig nichts; mit aktiviertem Monitoring der Abfrageplan an Polars Cloud.

### Nachprüfung bestehender Zeilen
- **ScrapeGraph AI** (K3, LLM-gestützt): MIT, Volltext, „Copyright 2024 Scrapgraph-ai team“ (https://raw.githubusercontent.com/ScrapeGraphAI/Scrapegraph-ai/main/LICENSE). Basispfad ohne Pflicht-API möglich mit lokalen Modellen (Ollama) laut README (https://github.com/ScrapeGraphAI/Scrapegraph-ai). **Telemetrie standardmäßig an**, abschaltbar mit `SCRAPEGRAPHAI_TELEMETRY_ENABLED=false`; Ziel laut README unklar. Installation verlangt `playwright install` (Browser-Download). Die bezahlte Cloud-API nicht nutzen. Version, Release-Datum und Maintainer-Form: unklar (nicht abgerufen). Bleibt einzige K3-Zeile für LLM-Extraktion.
- **Scientific-agent-skills**: MIT, Volltext, „Copyright (c) 2025 K-Dense Inc.“ (https://raw.githubusercontent.com/K-Dense-AI/scientific-agent-skills/main/LICENSE.md); Maintainer K-Dense Inc. (Firma, mit gehostetem Bezahlangebot K-Dense Web). Laut README (https://github.com/K-Dense-AI/scientific-agent-skills) 168 Skills im Agent-Skills-Format (`SKILL.md`); viele fragen externe Datenbanken/APIs ab, einige mit Konto oder kostenpflichtig. Kein generischer Baustein im Sinne von K1–K5, sondern eine Skill-Sammlung; nur einzelne lokale Statistik-Skills kämen infrage. Telemetrie und letzter Commit: unklar. Keine neue K-Zeile.

### Geprüft und verworfen
- **Crawl4AI** (K1, https://github.com/unclecode/crawl4ai): Apache-2.0 **mit zusätzlicher Pflicht-Namensnennung** für alle Verbreitungen, Veröffentlichungen und öffentlichen Nutzungen (Volltext gelesen) — nicht standardkonform, Rechteumfang für kommerzielle Einbettung ungeklärt (Auswahlfilter).
- **Firecrawl / Firecrawl MCP** (K1): Cloud mit Credits, selbst gehostetes Backend **AGPL**; Beleg aus `kandidaten-2026-09-15.md` Z. 107 und 321, nicht erneut abgerufen.
- **Playwright MCP** (K2): steht in `kandidaten-2026-09-15.md` (Z. 67, 290) als Laufzeit-Fähigkeit; hier stattdessen die Bibliothek.
- **Browser Use** (K2): steht in `kandidaten-2026-09-15.md` Z. 269; braucht ein Sprachmodell (Modellkosten); nicht doppelt aufgenommen.
- **Cloakbrowser, Patchright** (K2): Stealth-/Anti-Bot-Werkzeuge, Ausschluss laut Auftrag (Quelle Z. 148, 201).
- **ScrapeGraph-Cloud-API**: Pflicht-API mit Credits; nur die Bibliothek bleibt.
- **Datenbank-Skills aus Scientific-agent-skills**: konkrete Datenquellen/APIs (E-F30-4).
