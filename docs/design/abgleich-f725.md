# Abgleich F-725 — Designvorlage V10 ↔ Leitstand, Schnitt, Entscheidungen

Übernommen aus dem Challenger-Dokument 474 („Challenge F-725 Design-Schnitt“, 30.09.2026) für F44 WS-0 (`features/F44/feature.md`). Abschnitte 0–8 inhaltlich unverändert; mit „Vermerk WS-0“ markierte Stellen und §9 sind in WS-0 ergänzt. Sonst geändert wurden nur: der Vorlagepfad zeigt auf die Ablage im Repo (`docs/design/vorlage-v10/`), Verweise auf Challenger-Dokumente heißen „Challenger-Dokument“, und die Platzhalter aus §8 tragen die Finding-IDs F-860 bis F-866 aus `state/findings.md`. E1 und E2 heißen in der Akte E-F44-1 und E-F44-2. Zeilennummern im Text (`datei.js:123`) gelten für `origin/main` = `50bbccb`.

Die Referenz-Screenshots dieses Repos (`docs/design/vorlage-v10/screens/`, 50 Bilder) sind in WS-0 neu erzeugt; die im nächsten Absatz genannten 36 Screenshots des Challengers liegen nicht im Repo.

## 0. Ausgangslage

Stand 30.09.2026. Basis: `origin/main` = `50bbccb` (lokal und frischer Clone identisch). Vorlage: `docs/design/vorlage-v10/`, Stand V10 vom 26.09.2026, 13 Dateien, nur lesend gesichtet. Die Vorlage wurde lokal gerendert: 82 Routen gecrawlt, 36 Screenshots (Desktop 1440, Mobil 390, Hell). Ein unabhängiger Prüfagent hat die Tabelle gegengeprüft; seine Korrekturen sind eingearbeitet.

## 1. Ergebnis

**`GO_STANDARD`**. WS-0 kann sofort starten. Stefan hat am 30.09.2026 entschieden: E1 = B (Zukunftsfunktionen sichtbar, deaktiviert, „kommt“) und E2 = B (vier Sprachen im Design-Schnitt). Beides ist in Abschnitt 4, 5 und 7 eingearbeitet.

Die drei wichtigsten Punkte:

1. **Die Vorlage hält gebaute Funktionen für Zukunft.** [Fakt] Sie beruht auf dem Briefing Challenger-Dokument 428 vom 26.09. Vier Funktionen zeigt sie deshalb als „In Entwicklung“, obwohl sie auf `main` laufen:
   - F36 Katalog-Empfehlung in der Freigabe (`#/faehigkeiten/empfehlungen`),
   - F36 Katalog-Installation (`#/arbeit/f36`),
   - F36 Beobachtung „Tatsächlich verwendete Fähigkeiten“ im Lauf,
   - F43 Projekt aufrufen mit `vorschau_url` (`#/produkt`, „Dein Produkt öffnen“).

   Diese vier werden echt angebunden, nicht als Platzhalter übernommen.
2. **Sicherheitskritische Bedienungen fehlen in der Vorlage ganz oder teilweise.** [Fakt] Betroffen sind:
   - „Freigabe ablehnen“ (das Veto des Menschen),
   - die Bestätigung vor „Freigeben & installieren“,
   - die Leitstand-Port-Sperre F-849 (Projektkarte und Empfehlungsblock),
   - die Optionen der Architekt-Entscheidung F39,
   - die Sichtung F-768,
   - der Reparatur-Editor mit Warnungen,
   - Terminal-Entscheidung und Rückfrage am Lauf,
   - „Lauf abbrechen“,
   - „Prüfung wiederholen“.

   Diese werden im Stil der Vorlage ergänzt, das Verhalten bleibt 1:1.
3. **Die Vorlage ist ein Prototyp, kein Baustein.** [Fakt] `experience.js` patcht `render()`/`shell()` mehrfach zur Laufzeit. Dazu kommen:
   - nach der Gate-Logik 73 Farbliterale in `style.css` außerhalb `:root` und 3 in JS/HTML,
   - 22 Selektoren `[data-theme=light]`, davon 13 mit Literalen,
   - Beispieldaten im Code,
   - `localization.js`, das deutsche DOM-Texte per Textvergleich ersetzt.

   Übernommen werden **Gestaltung und Interaktionen**, nicht der Code. Die bestehende Modulstruktur bleibt (`router.js`, `zustand.js` mit einem Poll, `api.js`, `views/*`).

## 2. Was die Vorlage ist

- **Dateien:** `index.html`, `style.css` (77 KB), `app.js` (76 KB), `experience.js` (129 KB), `localization.js` (53 KB). Dazu `assets/face.png`, `armillary.png`, `gear.png` (zusammen 5,2 MB PNG, RGBA) und fünf Markdown-Dokumente. Führend ist laut Vorlage `START-HERE-CLAUDE.md` (V10), ergänzt um `BRAIN-AND-PHASES.md`, `TECHNICAL-INSIGHT-CONTRACT.md`, `UX-FINAL-REVIEW.md` und `claude-code-handoff.md` mit der Historie V1–V10. [Fakt]
- **Gestaltung:** Schieferblau `#10212b`, Flächen `#162832`, Elfenbein `#f0ede4`, Jade `#8bd8c1`, Georgia für Titel, Arial für die Bedienung. Hell-Theme ist enthalten. Sidebar mit Illustration, Persona (Augen/Grinsen) im Kopf, Chat als Blase unten rechts. Keine externen Fonts, kein CDN. [Fakt]
- **Laufzeit:** kein `setInterval`, fünf `setTimeout` (Toast, Hover 600 ms), `localStorage` für Theme, Sprache, Designnotizen und Produktbriefing-Entwürfe (`jarvis-product-briefs`), ein `fetch` (liest die eigenen Referenzdateien). [Fakt]
- **Selbstauskunft:** Die Vorlage sagt über sich: „Beispieldaten … sind Fixtures“, „kein Browser-Layouttest“, „keine Backend-Integration“. Offene Verträge sollen einzeln dokumentiert werden, statt fiktive Antworten zu liefern. [Fakt, `START-HERE-CLAUDE.md`, Abschnitt „Was noch keine Produktionsfunktion ist“]

## 3. Abgleichstabelle

**Status:**
- **V** vorhanden: Daten bzw. Endpunkt existieren, der Umbau betrifft nur die Darstellung.
- **V\*** vorhanden, obwohl die Vorlage „In Entwicklung“ zeigt.
- **V+** vorhanden, braucht aber eine Zusatzabfrage je Projekt.
- **O** nur Optik: reine Darstellung oder Client-Funktion ohne Serverdaten, sofort baubar.
- **Z** Zukunft: braucht Daten oder Endpunkt, die es nicht gibt.
- **F** fehlt in der Vorlage: heutige Funktion ohne Gegenstück, wird im Stil der Vorlage ergänzt.
- **–** entfällt, weil es ein Prototyp-Artefakt ist.

Endpunkte relativ zu `P` = `/api` bzw. `/api/projekte/<id>`.

### A. Shell und Einstieg
| # | Vorlage | Heute | API/Quelle | Status |
|---|---|---|---|---|
| A1 | `#/start` „Enter the Rabbit hole“, Aufwachen der Augen in ~2,2 s, Link sofort bedienbar; dazu Einblenden der Kopf-Persona (`persona-arrive`, 0,7 s) bei jedem Seitenwechsel | `#/start` mit Partikeln und „Klicken oder Enter“, einmal pro Sitzung (`start.js`) | – | O |
| A2 | – | Wartezeile auf der Startfläche („2 Entscheidungen warten“) | Poll `zustand` | F |
| A3 | Sidebar V10: Produktübersicht, Roadmap, Entwicklung, Entscheidungen, Produktzyklus, Brain; unten Alle Produkte, Nutzung, Einstellungen, Profil, Workforce | 8 Punkte (`index.html:70-101`) | – | O (Routenzuordnung siehe 5.2) |
| A4 | Kopf: Projektauswahl und „+“ | Projektwahl nur über die Projekte-Übersicht; Kontextleiste ist gerendert, aber ausgeblendet | `GET /api/projekte` | V |
| A5 | Persona im Kopf mit Statuszeile („Wartet auf dich“, „Arbeitet für dich“, „Status unbekannt“) | `persona.js`: 4 Zustände idle/thinking/waiting_for_human/error, einzige `aria-live`-Region | Poll | V (den vier Zuständen je einen Text zuordnen, `error` braucht eine eigene Formulierung) |
| A6 | Hell/Dunkel-Umschalter | nur dunkel | – | O (Token-Gate muss angepasst werden, siehe 6) |
| A7 | Sprachwahl de/en/tr/ru | nur Deutsch | – | O (E2 = B: Kern in WS-1, Texte je Paket, siehe 5.4) |
| A8 | Badge „DESIGNVORSCHAU“, Fußzeile „Designprototyp · Beispieldaten“, Einstellungen „Designzustände ausprobieren“ | – | – | – |
| A9 | Fehlerzustand „nicht verfügbar … Erneut laden“ je Seite, Persona „Status unbekannt“ | Banner bei Poll-Fehler „Aktualisierung fehlgeschlagen“ | Poll | V (je Seite gestaltet) / F (globales Banner) |
| A10 | – | „Zuletzt geöffnet“ (sessionStorage, 2 Einträge) | – | F |
| A11 | Profilkarte | Nutzerkarte mit Dropdown und Schalter für Bewegung | localStorage | V (Schalter zieht nach Einstellungen) |
| A12 | Chat als Blase unten rechts, vergrößerbar, Jarvis und Coach getrennt | rechte Spalte, ab 1280 px immer sichtbar | `chat`, `sparring` | V (Layoutwechsel) |
| A13 | SVG-Favicon | Manifest und Icons (PWA), Manifestfarbe `#0b0d10` | – | F (Manifest an die neuen Farben anpassen) |
| A14 | „+“ legt ein Produkt an | Schnellzugriff „Neues Projekt“ ist disabled, „kommt bald“ (`index.html:122`), obwohl F41 gebaut ist | `POST /api/projekte` | V (Bug, siehe Findings) |
| A15 | Toast `#toast` mit `aria-live` | eine einzige `aria-live`-Region, die der Persona (`persona.js:60, 250`, als Invariante, ohne Gate) | – | O (Toast ohne zweite Live-Region, Meldungen über den Persona-Status) |

### B. Produktübersicht
| # | Vorlage | Heute | API/Quelle | Status |
|---|---|---|---|---|
| B1 | Titel und „Aktueller Meilenstein“ | Roadmap-Karte im Workboard | `GET P/roadmap` | V (Regel festlegen: erster nicht abgeschlossener Meilenstein) |
| B2 | Fortschrittsring „x / y abgenommen“ | Donut „Projekt Fortschritt“ | `GET P/workitems` | V (Zähl-Regel festlegen: nur Features mit Status ABGESCHLOSSEN oder alle Einträge) |
| B3 | Kachel „Aktuelle Rolle“ | Workboard „Aktueller Fokus“ / „AI Workflow“ | Poll, `GET P/workflows/<id>` | V |
| B4 | Kachel „Deployer · Mensch“: Abnahme ≠ Veröffentlichung | – | kein Veröffentlichungsstatus | Z |
| B5 | Vier Werte: In Arbeit, Deine Entscheidung, Abgenommen, Geplant | 5 Kennzahlkacheln im Dashboard | Poll, `workitems` | V |
| B6 | „Ziel dieser Version“, Zielgruppe und Erfolgskriterien; „Ziel schärfen“, „Produkt bearbeiten“ | – | nur `roadmap.vision` lesbar | V (lesen) / Z (schreiben) |
| B7 | „Deine nächsten Entscheidungen“ mit Direktaktion | Attention, Workboard-Fokus | Poll | V |
| B8 | „Die Workforce gerade“ / „Als Nächstes vorgesehen“ | Workboard „Aktueller Fokus“ | Poll; für „als Nächstes“ gibt es keine Daten | V / Z |
| B9 | „Der Weg zum Produkt“ als Gantt mit 6 relativen Wochen | Roadmap-Karte (F33) | `roadmap` ohne Zeitfenster | V (Meilensteine, Features, Status) / Z (Zeitachse: ohne Wochen darstellen, keine erfundenen Termine) |
| B10 | Entwicklungsstand-Liste mit Prioritäts-Auswahl | Workitems-Liste | `workitems`; `prioritaet` gibt es nur bei Findings | V (lesen) / Z (ändern) |
| B11 | „Wer macht was“: Zuvor/Jetzt/Danach, erwarteter Output, „Modell nicht beobachtet“ | Pipeline „AI Workflow“, Laufakte | `workflows/<id>`, `laeufe/<id>` | V |
| B12 | „Zuletzt umgesetzt“ mit Schritten 2/3 | „Letzter Projektstand“ | Poll, `workflows` | V |
| B13 | „Was steckt dahinter“ → Architektur, Code, Health | – | – | Z |
| B14 | Leerzustand für ein neues Produkt mit geführtem erstem Schritt | – | `workitems` leer | O |
| B15 | „Entwurf fortsetzen“ je Produkt | – | keine Persistenz | Z |
| B16 | – | Dashboard-Zähler Läufe, Startfehler, Workflows | Poll | F (verteilt sich auf Entscheidungen und Ausführungen) |

### C. Entscheidungen
| # | Vorlage | Heute | API/Quelle | Status |
|---|---|---|---|---|
| C1 | Liste menschlicher Fragen mit Direktaktion | `attention.js`, 4 Abschnitte | Poll, `workitems?status=OFFEN` | V |
| C2 | „Die vier Quellen“ mit Zählern | 4 Quellen; leer nur, wenn alle vier leer sind; eine defekte Quelle zeigt „nicht verfügbar“ | dito | V (die IDs `attention-*` prüft ein Gate) |
| C3 | Zähler „Startprobleme“ | Liste der Startfehler in Runs und Attention | Poll `startfehler` | V (Zähler) / F (Liste mit Details) |

### D. Roadmap
| # | Vorlage | Heute | API/Quelle | Status |
|---|---|---|---|---|
| D1 | Eigene Seite: Meilensteingruppen, Hover nach 600 ms, Klick öffnet Detail | Karte im Workboard | `GET P/roadmap` | V (ohne Zeitachse) |
| D2 | „Zeitfenster ändern“ | – | – | Z |
| D3 | „Noch nicht eingeplant“ | – | Features aus `workitems`, die in keinem Meilenstein stehen | V [Schlussfolgerung] |
| D4 | – | Zustände nicht_vorhanden / ungueltig (n Regelverstöße) / Fehler | `roadmap` | F (F-854 hier mitnehmen: fehlende Roadmap als Leerzustand zeigen) |

### E. Entwicklung
| # | Vorlage | Heute | API/Quelle | Status |
|---|---|---|---|---|
| E1 | Status-Kanban Geplant / In Arbeit / Braucht dich / Abgenommen | Liste mit Filterchips | `workitems` und Poll | V (Ableitungsregel festlegen) |
| E2 | Prioritäts-Kanban P0–P3 per Drag-and-drop | – | kein Schreib-Endpunkt | Z |
| E3 | Zeitleiste | – | – | Z |
| E4 | Listen Features / Bugs / Harness Improvements mit Suche und Filtern | Filter Typ/Status/Priorität | `workitems?typ&status&prioritaet`; Typ `HARNESS_IMPROVEMENT` existiert | V |
| E5 | – | Typen TECH_DEBT und PROCESS_IMPROVEMENT | `workitems` | F (fehlen in den Listen der Vorlage) |
| E6 | – | Parser-Befunde der Workitems | `workitems.befunde` | F |
| E7 | „Eintrag erfassen“ | – | kein Endpunkt; IDs vergibt das Repo (F-798) | Z |
| E8 | Eintrag-Detail: Ziel, Kriterien, Stand, „Wer macht was“ | Workboard-Detail | `workitems`, `workflows` | V (Kriterien nur aus Akte oder Auftrag) |
| E9 | „Auftrag vorbereiten“ bei einem Feature | „Bauen“ (F35) | `POST P/features/<id>/auftrag`, danach Routing | V |
| E10 | „Auftrag vorbereiten“ bei einem Finding | „Bearbeiten“ (Click-to-Work) | `POST P/auftraege`, `…/routen` | V |
| E11 | – | Click-to-Work-Vorschlag mit Kette, Katalog-Empfehlung, Freigeben/Ablehnen und Block „Commit / Push / PR“ zum Kopieren | `…/freigabe` | F (die Git-Befehle zum Kopieren fehlen; Freigabe heute mit fester Begründung, F-375) |
| E12 | Toast „Es läuft bereits eine Ausführung.“ | Konfliktzustand 409 mit „Wiederholen“ | – | V (Hinweis) / F (Konfliktzustand und „Wiederholen“) |
| E13 | Eintrag bearbeiten mit Revision und Änderungsgrund, „Zeitfenster ändern“, „Als Nächstes vormerken“, Insights | – | – | Z |

> **Vermerk WS-3b (01.10.2026), Korrektur zu E11:** Die Git-Befehle zum Kopieren fehlten nicht. Der Block „Commit / Push / PR“ (`git add <geänderte Dateien>`, `git commit`, `git push`, Verweis auf Skill `git-flow`) existiert seit F22 AK6 im Terminal-Zustand von Click-to-Work (`views/workboard.js`, renderTerminalBlock). Offen war nur der Stil der Vorlage; WS-3b hat ihn übertragen. Die Spalte „Status“ bleibt F, weil die Vorlage den Block nicht kennt.

### F. Auftrag, Ablauf, Abnahme
| # | Vorlage | Heute | API/Quelle | Status |
|---|---|---|---|---|
| F1 | `#/auftrag/neu` in 3 Schritten: Titel, Ergebnis, Kontext | Auftrag anlegen (Titel, Auftragstext) in `#/projekt` | `POST P/auftraege`, `…/routen` | V |
| F2 | „Der Weg zum Ergebnis“ als Timeline mit Status und Verantwortung | Workflow-Detail mit Schritttabelle | `GET P/workflows/<id>` | V |
| F0 | Register „Aufträge“ | Workflow-Liste unter `#/runs` mit „Details“ | Poll `workflows` | V |
| F3 | Dialog „Nächsten Schritt freigeben“ mit Pflichtgrund, „Freigeben & starten“ | Freigabe mit „Begründung (Pflicht)“ und „Starten“ | `…/freigabe`, `…/starten` | V (Button und Beschriftung folgen `naechster.art`, der Client leitet nichts selbst ab) |
| F3b | – (der Dialog kennt nur „Freigeben & starten“ und „Abbrechen“) | **Freigabe ablehnen** mit Pflichtbegründung: Schritt ABGELEHNT (`workflows.js:674-675`) | `…/freigabe` mit `entscheidung: ABGELEHNT` | F |
| F4 | Katalog-Empfehlung als Ankreuzliste mit Grund (Checkboxen `disabled`) | F36 WS-3: Freigabeblock mit Grund je Eintrag und `empfehlungIds` | Workflow-Detail | V\* (Invariante „Anzeige = Start“: der Server verlangt die exakte Menge, `leitstand-server.mjs:2284`, deshalb bleiben die Checkboxen `disabled`) |
| F5 | „Katalog-Installation … In Entwicklung“ (`#/arbeit/f36`), „Installation und Berechtigungen gesondert prüfen“ | **Freigeben & installieren**: Bestätigung mit Paket, SHA, Lizenz, Kosten und Wirkung; nur im ZWINGEND-Halt | `…/installation/vorbereiten`, `…/installation` | V\* / F (Bestätigungsblock und ZWINGEND-Bindung) |
| F6 | „Rückfrage beantworten“ am Ablauf (`#/workflow/klaerung`) | Architekt-Entscheidung (F39), Empfehlung vorgewählt | `…/entscheidung` | V (Dialog) / F (Optionen, Vor- und Nachteile, vorgewählte Empfehlung) |
| F7 | – | Lauf-Entscheidung „Antwort auf Rückfrage“ mit Einstufung, nur bei VERWEIGERT mit Bypass-Verdacht; zeigt die Bypass-Daten (`runs.js:215-217, 335-347`) | `POST P/entscheidungen` | F |
| F8 | „Ablauf reparieren“ als einzelner Knopf | Reparaturfassung: JSON-Editor, Warnungen F-219/223/226/240/384, Begründung | `POST P/workflows` | V (Editor und Warnungen: F) |
| F9 | – | Sichtung bestätigen (F-768) | `POST P/workflows` | F |
| F10 | „Ausführung stoppen“ mit Pflichtgrund | „Stoppen“ mit Pflichtbegründung | `…/stoppen` | V |
| F11 | „Ablauf erneut prüfen“ | – | kein Endpunkt | – (entfällt; der Server prüft beim Einreichen) |
| F12 | Aufklappbereich „Technischer Ablauf & Serverentscheidung“ | Kopfdaten des Workflows | `workflows/<id>` | V |
| F13 | Abnahme: „Was sich verbessert hat“, Empfehlung des Reviewers | Urteil im Abnahmeblock | `GET …/abnahme` | V |
| F14 | „Vereinbart & überprüft“: Kriterien mit Nachweis | AK-Tabelle | `ak_urteile` | V |
| F15 | „Geänderte Dateien“, „Prüfbericht & Nachweise“ | Änderungsübersicht, Prüfung GRÜN/ROT (F652) | `…/abnahme` | V |
| F16 | – | **Prüfung wiederholen** (F656) | `…/pruefung-wiederholen` | F |
| F17 | Abnehmen / Anpassung wünschen / Ablehnen mit Begründung | Annehmen / Ablehnen / Anpassung anfordern mit Pflichtbegründung | `POST …/abnahme` | V |
| F18 | Hinweis „Automatisch angelegt · Iteration n/3“ | vorhanden | `…/abnahme` | V |

### G. Ausführungen
| # | Vorlage | Heute | API/Quelle | Status |
|---|---|---|---|---|
| G1 | Liste der Ausführungen: Worker, Rolle, Ergebnis, Zeit | Laufkarten in Runs | Poll `laeufe` | V |
| G2 | „Was passiert ist“ als Timeline | Checkpoint-Kette als Tabelle | `GET P/laeufe/<id>` | V (Timeline aus den Checkpoints bauen) |
| G3 | Klartext-Ursache, z. B. „Die Browser-Freigabe fehlte.“ | – | F-744 (strukturierte Ursachen) ist offen | Z |
| G4 | Aufklappbar: Auftrag/Kontext/Nachweise; Worker/Modell/Herkunft; Technisches Protokoll | Auftrag, Kontextpaket, Laufakte (Worker, Modell deklariert/beobachtet), Rohstrom | `laeufe/<id>` | V (das Markup der Laufakte prüft Gate f12) |
| G5 | „Tatsächlich verwendete Fähigkeiten“ (In Entwicklung) | Laufakte-Zeile „Beobachtung“ (F36) | `laeufe/<id>` | V\* |
| G6 | „Fehler zur Kenntnis nehmen“ mit Pflichtgrund | Kenntnisnahme | `POST P/entscheidungen` | V |
| G7 | „Fortsetzung vorbereiten“ | Wiederaufnahme mit `vorgaengerLaufId` | `POST P/laeufe` | V |
| G8 | – | Terminal-Entscheidung ERFOLGREICH/VERWEIGERT/FEHLGESCHLAGEN mit Pflichtgrund | `POST P/entscheidungen` | F |
| G9 | – | **Laufenden Lauf abbrechen** | `POST P/laeufe/<id>/abbrechen` | F |
| G10 | Feld „Relevante Dateien oder Nachweise“ in `#/auftrag/neu` | Direktstart mit Werkzeugsatz, Evidenzdateien und laufId (`#/projekt`) | `POST P/laeufe`, `GET P/startvorlage/werkzeugsaetze` | V (Evidenzdateien) / F (Werkzeugsatz, laufId, Direktstart) |
| G11 | Register „Aufträge“ | Auswahlliste der Aufträge | `GET P/auftraege` | V |

### H. Alle Produkte
| # | Vorlage | Heute | API/Quelle | Status |
|---|---|---|---|---|
| H1 | Portfoliokarten: Ziel, Ring, Entscheidungen, abgenommen, aktiv, „Weiterarbeiten“ | Karten mit ID, Status, Name, Pfad, Phase, aktivem Lauf und „Öffnen“ | `GET /api/projekte`; Zähler je Projekt nur mit Zusatzabfragen | V (Name, Status, Lauf) / V+ (Zähler) / Z (Ziel) |
| H2 | „Lokaler Zielordner“ und ID in der Akte (`#/projekt/<id>/akte`), nicht auf der Karte | Pfad auf der Projektkarte | `projekte` | V (F-857 in WS-6 beheben) |
| H3 | Neues Produkt: Name und Ziel Pflicht, Zielgruppe und Ordner optional, ID automatisch | F41: id, Name, Zielordner optional | `POST /api/projekte` | V (ID im Client ableiten, der Server prüft) / Z (Ziel und Zielgruppe speichern) |
| H4 | Nach der Anlage: Git-Befehle zum Kopieren, Weg zum Coach | „Nächste Schritte“, Trust-Hinweis, „Zum Coach-Interview“ | – | V |
| H5 | `#/produkt` „Dein Produkt öffnen“ (In Entwicklung) | F43 „Vorschau & Aufruf“: `vorschau_url` erreichbar/nicht erreichbar, „Öffnen“, „Aufrufen“, Ausgabe | `GET`/`POST /api/projekte/<id>/projekt-aufruf` | V\* |
| H6 | – | **Leitstand-Port-Sperre F-849**: kein Öffnen-Link, Fehler-Badge (Projektkarte); Hinweise „Projekt-URL gesperrt“ und „installierbar“ im Empfehlungsblock | `projekt-aufruf-anzeige.js:66-69`, `empfehlung-anzeige.js:84-89, 120-141` | F |
| H7 | „Produkt bearbeiten“: Name, Ziel, Zielgruppe, Problem, Erfolgskriterien | – | kein Endpunkt | Z |

### I. Nutzung
| # | Vorlage | Heute | API/Quelle | Status |
|---|---|---|---|---|
| I1 | Zeiträume 7 / 30 Tage / gesamt; Ausführungen, mit Nutzungsdaten, nicht erfasst | Karte „Verbrauch“ im Dashboard | `GET P/verbrauch?von=` | V |
| I2 | Gelesen / Erzeugt | Tokens ein / aus | dito | V |
| I3 | „Technische Aufschlüsselung nach Rolle und Worker“ mit Cache gelesen/geschrieben und „Modell“ je Zeile | Tabellen „Nach Rolle“ und „Nach Modell“, Cache summiert | dito (Server liefert Cache getrennt) | V / F (eigene Tabelle „Nach Modell“) |

### J. Workforce
| # | Vorlage | Heute | API/Quelle | Status |
|---|---|---|---|---|
| J1 | Harness-Aufbau mit 9 Bausteinen: Agents, Skills, Hooks, MCP, AGENTS.md, Git, Kontrollzustand, Architecture.md, Claude.md | – | Skills, Agents und MCP aus `GET P/ressourcen`; Hooks, Dateien und Kontrollzustand ohne Endpunkt | V (Katalogteil) / Z (Rest) |
| J2 | „Änderung vorschlagen“ erzeugt einen HI-Eintrag; „Designnotiz bearbeiten“ | – | – | Z / – |
| J3 | Phasen & Rollen: Kreis mit 8 Phasen, Schrittfortschritt | Pipeline „AI Workflow“ | `workflows` | V (nur beobachtete Schritte) / Z (Ereignisse für Understand, Ideate und Analyze) |
| J4 | Architecture.md / Claude.md öffnen und bearbeiten | – | – | Z (Schreiben nur mit Human-Gate) |
| J5 | Fähigkeiten als Kacheln mit Typ, Freigabe, Suche und Filter | Library-Tabelle | `GET P/ressourcen` | V |
| J6 | – | Spalten „Fehlt für Einsatz“, Phasen, Grund, Hinweis ASSESSED | `ressourcen` | F |
| J7 | Rollen & Besetzung als Karten mit Detail | Rollen-Besetzung, Ebenen 1–4 | `GET P/ressourcen/rollen/<rolle>` | V (Ebenen-Detail: F) |
| J8 | – | Coverage/Gap je Rolle | `GET P/ressourcen/abdeckung` | F |
| J9 | Empfehlungen (In Entwicklung · F36) | Empfehlung mit Grund je Eintrag im Freigabeblock (`anwendbar_wenn` wertet nur der Server aus) | Workflow-Detail | V\* |
| J10 | Scout mit Freitextsuche „Kandidaten finden“, Kandidatenkarten, „Für spätere Prüfung merken“ | Scout je Gap-Zeile „Kandidaten suchen“: echter Lauf ohne Freigabe (AK10), Ergebnistabelle, „Vormerken“ | `POST P/auftraege` und `P/laeufe`, `laeufe/<id>`, `…/routen` | V (Ergebnis, Merken) / Z (Freitext) / F (Einstieg je Gap, Kollisionshinweis, „Quelle geprüft“, echte Auftragsanlage mit Routing) |

### K. Produktzyklus, Brain, Technik
| # | Vorlage | Heute | API/Quelle | Status |
|---|---|---|---|---|
| K1 | Produktzyklus Ideate / Plan / Deliver mit 9 Schritten und Notizen | – | – | Z (die Deliver-Schritte verlinken auf vorhandene Sichten; „Deployen“ bleibt Z) |
| K2 | Brain: Graph, Inspector, Knoten und Kanten bearbeiten | – | – | Z |
| K3 | Technik: Architektur, Datenmodell, Code, Probleme & Fragen, Health | – | – | Z (Health liegt im V1-Backlog, E-M5-17; die Code-Registerkarte „Designreferenz-Dateien“ entfällt als Prototyp-Artefakt) |

### L. Jarvis und Coach
| # | Vorlage | Heute | API/Quelle | Status |
|---|---|---|---|---|
| L1 | Große Gesprächsansicht Jarvis mit Vorschlägen („Was braucht mich?“ …) | Jarvis-Chat mit lokalem Vorfilter | `GET`/`POST P/chat` | V |
| L2 | Coach: „Ein neues Projekt durchdenken“, „Eine Feature-Idee schärfen“ | Sparring mit Untermodus Projekt / Feature | `GET`/`POST P/sparring` | V |
| L3 | Coach → Auftrag | „Als Auftrag anlegen“ aus Scope- bzw. Projektentwurf | `POST P/auftraege`, `P/sparring/<id>/auftrag` | V |
| L4 | – | Fortschrittszeile und Tippanzeige (F40 WS-1) | `laeufe/<id>.fortschritt` | F |
| L5 | – | „Zusammenfassen & neu starten“ (F31) | `POST P/chat/zusammenfassen` | F |
| L6 | – | Lauf abbrechen im Chat | `POST P/laeufe/<id>/abbrechen` | F |
| L7 | – | Verlauf aus- und einklappen | – | F |
| L8 | Beispielantworten ohne KI | – | – | – (die echte Anbindung existiert) |

**Summe** über 113 Zeilen, eine Zeile kann mehrere Status tragen: 63× V, 5× V\*, 1× V+, 5× O, 25× Z, 29× F, 4× –. [Fakt, per Skript gezählt; Status in Klammerzusätzen nicht mitgezählt]

## 4. Challenge

1. **Vorlage vor Code.** [EMPFEHLUNG] Der Vorlage-Code wird nicht kopiert, sondern je View in die bestehenden Module übertragen. Begründung: Die Monkeypatches in `experience.js` sind nicht wartbar, und die Gates prüfen die Modulstruktur (`zustand.js` als einziger Poll, `api.js` als einzige fetch-Stelle, nach Node importierbare Module ohne Zugriff auf DOM oder Storage beim Laden). Verwerfen, falls ein View-Umbau mehr als doppelt so lange dauert wie das Übertragen.
2. **Die Routen bleiben, die Beschriftung kommt aus der Vorlage.** [EMPFEHLUNG] Die Hash-Routen sehen Nutzer kaum. Gates, interne Sprünge und Render-Nachweise hängen dagegen an `#/workboard`, `#/attention`, `#/runs/<id>` und `#/workflows/<id>`. Neue Routen gibt es nur für neue Seiten. Zuordnung in 5.2. Verwerfen, falls Stefan sprechende Routen ausdrücklich will.
3. **Der leere Hash führt nach `#/start`, wie in der Vorlage.** Ein unbekannter Hash bleibt bei der Übersicht. [EMPFEHLUNG]
4. **Zukunft ehrlich (E1 = B).** Alle Z-Elemente bleiben sichtbar, sind deaktiviert und tragen das Badge „kommt“. Sie haben niemals Beispieldaten; ohne Datenquelle zeigen sie den Leerzustand der Vorlage. Konkret:
   - Deaktiviert heißt `aria-disabled="true"` statt `disabled`, damit der Hinweis „kommt“ auch per Tastatur erreichbar ist. Ein Klick löst nichts aus.
   - Brain und Produktzyklus erscheinen als Seiten im Stil der Vorlage, aber ohne Beispielgraph und ohne Beispielnotizen.
   - Die Roadmap zeigt echte Meilensteine und Features. Die Wochenspalten erscheinen ausgegraut mit „Zeitplanung kommt“, ohne Balken auf erfundenen Terminen.
   - Das Prioritäts-Kanban zeigt die echten Prioritäten der Findings; Features haben keine Priorität und stehen unter „ohne Priorität“. Das Ziehen ist deaktiviert.
     > **Vermerk WS-3a (Stefan, 01.10.2026, F-917):** Abweichend bleibt das Prioritäts-Kanban in F44 ein Z-Element mit „kommt“ ohne Daten; ein nur lesendes Kanban wird im Fixpaket „Arbeitsfähigkeit“ neu bewertet.
   - Deployer-Kachel, „Eintrag erfassen“, „Produkt bearbeiten“, Insights und Zeitfenster: sichtbar, deaktiviert, „kommt“.
5. **Assets.** [EMPFEHLUNG] Die PNG-Originale kommen unverändert nach `docs/design/vorlage-v10/assets/`. Ausgeliefert werden verlustfreie WebP-Fassungen mit `exact` (streng pixelgleich): 3,6 MiB statt 5,1 MiB [Fakt, mit PIL gemessen]. `face` ersetzt `persona-gesicht.webp` unter demselben Namen; Gate f28 bleibt grün, weil es nur Existenz und MIME-Typ prüft. Der Server liefert `.webp` und `.png` aus, `.svg` dagegen als octet-stream. [Fakt, `leitstand-server.mjs:597-609`]

   **Risiko Bildtausch:** Heute ist das Bild 960×960 RGB, `face` ist 1536×1024 RGBA. Auf das alte Bild abgestimmt sind der Zuschnitt (`--persona-badge-zoom`/`-anker-y`, `style.css:196-197`), der Sidebar-Orb (`index.html:109`), der Chat-Avatar (`chat.js:519`) und das SVG-Augenkern-Overlay (`persona.js:14-19`). WS-1 kalibriert neu und belegt es mit einem Render-Nachweis.
6. **Hell-Theme.** [EMPFEHLUNG] Das Token-Gate so erweitern, dass es `:root[data-theme="light"]`-Blöcke als Token-Definition zulässt. Die Hell-Selektoren der Vorlage werden zu Token-Überschreibungen. Heute gilt [Fakt, getestet, `check-f20-design-tokens.mjs:87-95`]:
   - `:root[data-theme="light"]{--x:#fff}` ist rot.
   - `[data-theme="light"] .x{color:var(--y)}` ist grün.
   - `@media (prefers-color-scheme: light){:root{…}}` ist grün.

   Ein Hell-Theme nach Systemeinstellung ginge also schon heute; nur der manuelle Umschalter braucht die Erweiterung. Das `theme-color`-Meta setzt die Vorlage per Hex in JS. Das wäre rot, deshalb liest die Umsetzung den Wert zur Laufzeit aus dem CSS-Token.

   > **Vermerk WS-0 (F-861):** Die Aufzählung beschreibt das Gate vor WS-0. Seit WS-0 gilt: `:root[data-theme="light"|"dark"]{--x:#fff}` ist grün. Literale in Token-Blöcken sind nur in Custom Properties erlaubt, und Token-Blöcke gelten nur in `style.css`. Maßgeblich ist der Kopf von `scripts/check-f20-design-tokens.mjs`.
7. **Projektwechsel.** Heute hört nur der Chat auf einen Projektwechsel (`chat.js:1322`). Folgende Daten werden nur beim Bootstrap geladen [Fakt, Code]:
   - Workitems und Roadmap im Workboard (`workboard.js:1312-1313`),
   - P0/P1 und Verbrauch im Dashboard (`dashboard.js:219-220`).

   - Aufträge und Werkzeugsätze im Direktstart (`projekt.js:303-308`). Hier geht der POST an den neuen Präfix, die Auswahlliste zeigt aber noch das alte Projekt.

   Neu geladen wird sonst nur über „Neu laden“, die Filterchips und den Zeitraumwechsel. Nach „Öffnen“ eines anderen Projekts zeigen diese Stellen vermutlich noch das alte Projekt [Schlussfolgerung, im Browser nicht geprüft]. Die Vorlage stellt den Produktwechsel ins Zentrum, deshalb baut WS-1 einen zentralen Neuladen-Hook.
8. **F-776** (Katalogart „referenz“) **nicht in F-725.** [EMPFEHLUNG] Die Vorlage steht fest, die 41 Referenzen sind damit ein Nebenweg. F-776 geht ins V1-Backlog mit Auslöser.
9. **Motion-Prüfweg** (Scope 3): Screenshots der Startfläche bei 0 / 0,8 / 1,6 / 2,4 s und der Kopf-Persona (`persona-arrive`, 0,7 s, bei jedem Seitenwechsel) bei 0 / 0,35 / 0,7 s, dazu je ein statischer Screenshot mit `prefers-reduced-motion: reduce`. [Fakt: `@keyframes` der Vorlage sind `awaken`, `persona-arrive`, `wake-left`, `wake-right`, `wake-grin`, `enter-arrive`]
10. **Öffentliches Repo** (F-858). WS-0 legt die Bilder und Design-Dokumente öffentlich ab. Unter `docs/design/referenz/` liegen schon PNGs, das Muster existiert also.
11. **Eine Live-Region.** Der Toast der Vorlage (`role="status" aria-live`) wäre eine zweite Live-Region neben der Persona. Meldungen laufen deshalb über den Persona-Status, oder der Toast bekommt kein `aria-live`. Das ist eine Invariante nach `persona.js:60, 250`, ein Gate prüft sie nicht.
12. **Freigabe-Veto.** Der Freigabedialog der Vorlage kennt nur „Freigeben & starten“. „Ablehnen“ (ABGELEHNT mit Pflichtbegründung) muss im selben Dialog erreichbar bleiben.

## 5. Schnitt

### 5.1 Pakete
| WS | Inhalt | Gates mit Anpassungsbedarf |
|---|---|---|
| **WS-0** Ablage & Harness (keine UI) | Feature-Akte; Vorlage unverändert unter `docs/design/vorlage-v10/`; Referenz-Screenshots; `docs/design/abgleich-f725.md` (diese Tabelle); `.claude/agents/design-guardian.md`; `impeccable` installierbar machen (`installation_vorlage`); Token-Gate: `:root[data-theme=…]` zulassen und alle `.css` unter `public/leitstand` scannen | f20-tokens (Erweiterung), check-docs (neuer Agent) |
| **WS-1** Tokens, Shell, Einstieg | i18n-Kern und -Gate (5.4), Sprachwahl im Kopf, Baustein „kommt“ (E1), Tokens dunkel und hell, Persona-Bild neu kalibrieren (Zuschnitt, Orb, Avatar, Augen-Overlay), eine Live-Region, Typografie, Sidebar V10 auf bestehende Routen, Kopf (Projektauswahl, „+“, Persona mit 4 Status-Texten, Theme), `#/start` mit Motion-Nachweis und Wartezeile, Chat-Dock als Hülle, Einstellungen, Platzhalterseiten, zentraler Neuladen-Hook beim Projektwechsel, Poll-Fehlerbanner, Zuletzt geöffnet, Manifest. Bestehende Views laufen schon im neuen Look (Tokens) | f20-tokens, f28-persona, f21-ws2 (Nav-Anker), f34 (`[hidden]`-Regeln), f20-zustand-poll, neues i18n-Gate |
| **WS-2** Übersicht, Entscheidungen, Roadmap | B, C, D (F-854) | f21-ws2 (IDs `attention-*`) |
| **WS-3** Entwicklung | E (Board, Listen, Detail, Bauen, Click-to-Work samt Git-Block) | f21-ws2 (IDs `workboard-*`, keine POST-Methode in workboard.js) |
| **WS-4** Ablauf & Abnahme | F vollständig, einschließlich F3b (Ablehnen), F5, F6, F7, F8, F9 und F16; Invariante „Anzeige = Start“ | f15-oberflaeche (IDs und Texte), f42, `empfehlung-*.test.mjs`, f20-shell (CI) |
| **WS-5** Ausführungen & Direktstart | G | f12 (Markup der Laufakte), `runs.test.mjs` |
| **WS-6** Produkte & Nutzung | H (F43/F-849 echt, F-857), I | f43, f25, f32-ansicht |
| **WS-7** Workforce | J (Katalog, Rollen, Coverage, Scout, Phasen aus Workflows) | – |
| **WS-8** Chat | L (Dock und große Ansicht, alle heutigen Chat-Funktionen) | f34 (IDs, Modus-Buttons) |

> **Vermerk WS-1a (Challenger, 30.09.2026):** WS-1 ist geteilt. **WS-1a „Fundament“**: i18n-Kern und -Gate, Tokens dunkel und hell (Kontrastprüfung im Token-Gate), Theme mit `theme-color` und Manifest, Einstellungen (`#/einstellungen` über das Dropdown der Nutzerkarte), zentraler Neuladen-Hook (F-860), `render-nachweis` (F-867). **WS-1b**: Sidebar V10, Kopf (Projektauswahl, „+“ mit F-862, Persona-Bild neu und kalibriert, 4 Statustexte, Sprach- und Theme-Schalter im Kopf), `#/start` mit Motion, Platzhalterseiten, Baustein „kommt“, Poll-Fehlerbanner, Zuletzt geöffnet, F-865. Das **Chat-Dock** (Blase) wandert aus WS-1 nach **WS-8**; bis dahin bleibt die Chatspalte und bekommt nur die neuen Tokens (f34-Risiko). Maßgeblich ist die Pakettabelle in `features/F44/feature.md`.

> **Vermerk WS-4a (Auftrag Stefan, 01.10.2026, F-934):** WS-4 ist geteilt. **WS-4a „Ablauf & Freigabe“**: F0, F2, F3, F3b, F4, F5, F10 und F12 (Detail `#/workflows/<id>` als Seite, Timeline, Freigabe- und Stoppdialog mit Ablehnen, Liste „Aufträge“ unter `#/runs`, Technischer Ablauf). **WS-4b „Klärung, Reparatur & Abnahme“**: F6, F8, F9 und F13–F18 (Restyling des bisherigen Bedienblocks und der Abnahme; Gates f23/f42). **F7** (Lauf-Entscheidung am VERWEIGERT-Lauf) und **F1** (Auftrag anlegen) gehen nach **WS-5**. Damit ist der Widerspruch zwischen der Tabelle oben (WS-4 „einschließlich … F7“) und §9 aufgelöst, wo `d_ausfuehrung_failed` mit F7 bei WS-5 steht und `d_auftrag_neu` (F1) offen „WS-4 / WS-5“ zugeordnet war. Maßgeblich ist die Pakettabelle in `features/F44/feature.md`.

> **Vermerk WS-4b (Auftrag Stefan, 01.10.2026):** WS-4b „Klärung, Reparatur & Abnahme“ setzt F6, F8, F9 und F13–F18 auf derselben Route `#/workflows/<id>` um, ohne neue Route. Die Abnahme steht, solange sie entscheidbar und die Ausführung gelaufen ist, als Abschnitt „Passt das Ergebnis?“ über der Timeline (d_abnahme_f35), und zwar nur bei ABGESCHLOSSEN; erlaubt der Server sonst schon Ablehnen oder Anpassung, als kompakter Block „Ergebnis ablehnen …“ (nach dem Bau) bzw. „Auftrag ablehnen …“ (vor dem Bau) unter der Timeline (Entscheidungen Challenger); sonst als Zeile unter den Aktionen; die Notizen für Rückfrage, Sichtung und Reparatur stehen über der Timeline (d_workflow_klaerung), Rückfrage und Sichtung als Dialog, der Reparatureditor inline. Abweichungen von der Vorlage: kein Kopf „Was sich verbessert hat“ (kein Serverwert dafür; der Seitenkopf trägt das Ziel), keine eigene Spalte „Das Ergebnis“ (die Zeilen „Review-Urteil“ und „Deine Abnahme“ stehen in „Auf einen Blick“), Kriterien mit `ak_id` statt AK-Titel (die Projektion trägt keinen Titel). „Ablauf erneut prüfen“ (F11) entfällt weiter. Gates f15, f42 (i) und das i18n-Gate ziehen im selben PR begründet mit (Modulschnitt F-935, `tHtml` F-940).

> **Vermerk WS-5a (Auftrag Stefan, 01.10.2026):** WS-5 ist geteilt. **WS-5a „Ausführungen“**: G1–G9 und F7; **WS-5b „Auftrag & Direktstart“**: F1, G10, G11 (`#/projekt`, d_auftrag_neu). Abweichung von §5.2: das Register „Ausführungen“ heißt `#/ausfuehrungen` statt `#/runs` — `#/runs` bleibt das Register „Aufträge“ (Standard), und eine Unterroute `#/runs/ausfuehrungen` würde mit dem Muster `#/runs/<laufId>` (`[^/]+`) kollidieren, sobald eine laufId „ausfuehrungen“ heißt. Die Register sind Links mit `aria-current`; der Sidebar-Eintrag „Ausführungen“, Dashboard-Links auf Läufe und Startfehler (B16) und der Reiter „Ausführungen“ der Entwicklung führen nach `#/ausfuehrungen`, ein Projektwechsel auf einem Lauf-Detail ebenfalls. „Einordnung“ ohne die Zeile „Abnahme“ der Vorlage (die Abnahme hängt am Auftrag). Liste ohne Worker und Rolle (die Kopfdaten von GET /api/laeufe tragen beides nicht; F-942). Das Lauf-Detail `#/runs/<laufId>` ist eine Seite nach d_ausfuehrung_failed; G3 (Klartext-Ursache) erscheint als Baustein „kommt“ (F-744 offen), vorhandene Servertexte roh. G9 „Lauf abbrechen“ ist ein Bestätigungsdialog **ohne** Grundfeld, weil `POST …/abbrechen` keinen Grund speichert. Das Detail wird weiter nicht gepollt (F-363); „Aktualisieren“ lädt es in jeder Lage neu. Schnitt: reines Render-Modul `views/lauf-detail.js`; `views/runs.js` behält Bedienung, Dialogsteuerung und POSTs. Gates f12 (f)/(g), f15 (f), f20-leitstand-shell (CI) und das i18n-Gate ziehen im selben PR begründet mit.

> **Vermerk WS-5b (Auftrag Stefan, 01.10.2026; Entscheidung E-F44-3 = A):** WS-5b „Auftrag & Direktstart“ setzt F1, G10 und G11 auf `#/projekt` nach d_auftrag_neu um, ohne neue Route und ohne Serveränderung. Hauptweg ist „Ablauf vorbereiten“: Auftrag anlegen → routen → warten über das Zustands-Aggregat → `#/workflows/router-<auftragId>`; freigegeben wird dort im bestehenden Dialog (F3), nicht auf `#/projekt`. Schrittanzeige 1 Auftrag · 2 Ablauf prüfen · 3 Freigeben (Schritt 3 auf der Ablauf-Seite). Der Kontext ist freier Text und wird als Absatz „Kontext:“ an den Auftragstext gehängt; Evidenzdateien (G10, Vorlage „Relevante Dateien oder Nachweise“) bleiben beim Direktstart, der als aufklappbarer Nebenweg mit unveränderten IDs und unverändertem POST weiterbesteht (samt „Auftrag ohne Ablauf anlegen“ und Wiederaufnahme). „Lieber mit dem Coach besprechen“ ist bis WS-8 ein Baustein „kommt“. Der Rücklink heißt „← Alle Aufträge“ statt „← Arbeit“ der Vorlage und führt nach `#/runs` (Register „Aufträge“, F-926-Muster mit `history.back()`), weil „Arbeit“ im Leitstand keine eigene Route hat. Kein Gate musste mitziehen; die Kette „anlegen → routen → warten“ steht damit zweimal (F-943).

> **Vermerk WS-6a (Auftrag Stefan, 01.10.2026):** WS-6a „Alle Produkte“ setzt H1–H7 auf `#/projekte-uebersicht` (d_projekte) und der Unterseite `#/projekte-uebersicht/neu` (d_projekt_neu) um, ohne Serveränderung und ohne neuen Endpunkt; beide stehen im selben View-Container, die Navigation „Alle Produkte“ bleibt markiert. **Korrektur H1:** Das Ziel der Karte ist **V+** über `roadmap.vision` (GET `/api/projekte/<id>/roadmap`, dieselbe Zusatzabfrage wie der Ring), nicht Z; fehlt die Vision, steht „Noch kein Ziel festgehalten“. Die Zähler (Ring über alle Features aller Meilensteine, Entscheidungen über `baueEntscheidungen`, abgenommen) lädt jede Karte nach dem Rendern mit expliziter id (F-945). H2: ID und voller Pfad stehen nicht in einer Akte-Route, sondern in der Klappe „Vorschau & Aufruf · Technik“ der Karte, zusammen mit dem unveränderten F43-Block (H5) und F-849 (H6); F-857 ist damit erledigt. H3: Pflicht ist nur der Name (Ziel und Zielgruppe „kommt“, E1 = B), die ID leitet der Client aus dem Namen ab, der Server prüft. H7 „Produkt bearbeiten“ ist ein Baustein „kommt“ in der Technik-Klappe. Abweichungen von der Vorlage: Statuszeile „Läuft“ statt „In Entwicklung“, „gerade aktiv“ zeigt „Ja“ statt einer Rolle (GET `/api/projekte` liefert nur `laufAktiv`), kein Zustand „Ausgewählt“ (die aktive Karte trägt einen Rahmen und „Aktives Produkt“); der rohe Registerstatus (früher Kachel „Phase“) steht wie ID und Pfad in der Technik-Klappe; die Beschreibung der Unterseite lautet „Ein Name reicht für den Anfang. Ziel und Zielgruppe hältst du später fest.“ statt „Ein Name und ein erstes Ziel reichen für den Anfang.“ (Ziel ist „kommt“, H3/E1), und die Platzhalter „Zum Beispiel: …“ entfallen (keine Beispieldaten). Kein Gate musste mitziehen.

> **Vermerk WS-6b (Auftrag Stefan, 01.10.2026):** WS-6b „Nutzung“ setzt I1–I3 auf `#/nutzung` (d_nutzung) um, ohne Serveränderung (GET `P/verbrauch?von=` wie bisher). **Gelesen inklusive Cache:** Die Fläche „Gelesen · Eingabe“ zeigt `inputTokens + cacheReadTokens + cacheWriteTokens`, darunter „davon aus dem Zwischenspeicher“ (`cacheReadTokens`). Begründung: Bei Prompt-Caching zählt `inputTokens` nur den ungecachten Rest der Eingabe; ohne die Cache-Werte erschiene „Gelesen“ um ein Vielfaches zu klein und kleiner als „Erzeugt“, obwohl das Modell den ganzen Kontext gelesen hat. Die Vorlage sagt in der Aufschlüsselung „nicht pauschal zur Eingabe addiert“ — das gilt dort weiter: die Tabelle führt Eingabe, Cache gelesen und Cache geschrieben getrennt, ein Satz darunter erklärt den Unterschied. Weitere Abweichungen: die Erklärung zu „Nicht erfasst“ ist ein aufklappender Text am Knopf „?“ statt eines Hover-Tooltips (tastaturbedienbar, keine Live-Region); die Tabelle „Nach Modell“ bleibt als eigene Tabelle (I3, F); der Projektname steht unter der Beschreibung; der Schlusshinweis ohne „Beispieldaten“; die Balken setzen den größeren Wert auf voll (Vorlage: Anteil an der Summe), ein Wert über 0 mindestens 1 %; Spalten „Läufe“ und „ohne Beobachtung“ statt „Ausführungen“ und „Ohne Messung“ (Wortlaut des Auftrags); hat keine Ausführung Nutzungsdaten, stehen Gelesen, Erzeugt und die Tokenzellen auf „—“ (nicht erfasst) statt 0 — die Vorlage hat dafür keinen Zustand. Kein Gate musste mitziehen. Dazu Nachtrag F-947 (Kartentitel `#/projekte-uebersicht`: `hyphens: auto`).

**Regel für alle Pakete:** Gates prüfen Invarianten. Wo Literale (IDs, Texte) umziehen, zieht das Gate im selben PR mit und begründet den Umzug. Die geprüfte Invariante bleibt: 4 Attention-Quellen, Pflichtbegründungen, Escaping, ein Poll, keine Farbliterale.

**Pro UI-Paket:**
- alle Texte des Pakets als Schlüssel in de/en/tr/ru (5.4),
- design-guardian gegen die Referenz-Screenshots,
- `render-nachweis` bei 1440 px und 390 px, hell und dunkel, mit 200 % Zoom,
- Prüfung, dass kein bestehendes Verhalten wegfällt (die F-Zeilen des Pakets einzeln abhaken).

### 5.2 Routen [EMPFEHLUNG]
| Navigation (Vorlage) | Route |
|---|---|
| Produktübersicht | `#/dashboard` |
| Roadmap | `#/roadmap` (neu) |
| Entwicklung | `#/workboard`, Detail `#/workboard/<id>`; Ablauf `#/workflows/<id>`; Ausführungen `#/runs`, `#/runs/<id>`; Auftrag & Direktstart `#/projekt` |
| Entscheidungen | `#/attention` |
| Produktzyklus / Brain | `#/produktzyklus`, `#/brain` (neu, Platzhalter) |
| Alle Produkte | `#/projekte-uebersicht` |
| Nutzung / Einstellungen | `#/nutzung`, `#/einstellungen` (neu) |
| Workforce | `#/capabilities` mit Registern Harness-Aufbau, Phasen & Rollen, Fähigkeiten |
| Chat | `#/chat` (überlagert → Dock) |

### 5.3 Bestehensbedingung (Vorschlag für die Akte)
1. Alle F-Zeilen der Tabelle sind im neuen Stil vorhanden. Kein heutiges Verhalten fällt weg.
2. Alle V\*-Zeilen sind echt angebunden.
3. Keine Fixture-Daten, keine Beispielzahlen und kein Badge „Designvorschau“ im Produkt.
4. Z-Elemente sind sichtbar, deaktiviert (`aria-disabled`) und mit „kommt“ gekennzeichnet (E1 = B); keines zeigt Beispieldaten.
5. `npm run check` ist grün. Die Render-Nachweise je Paket liegen vor (Desktop, Mobil, hell, dunkel, reduced motion).
6. Die Sicherheitsgrenzen bleiben: CSRF (F-813), Host-Allowlist (F-814), F-849 (Karte und Empfehlungsblock), ZWINGEND-Freigabe mit Pflichtbegründung, Freigabe-Veto (Ablehnen), „Anzeige = Start“, ein Lauf zur Zeit, eine Live-Region.
7. Alle UI-Texte gibt es in de/en/tr/ru über Schlüssel; Plural sowie Datums- und Zahlformate laufen über `Intl`; das i18n-Gate ist grün. Serverantworten und Projektinhalte bleiben in der Originalsprache (E2 = B).

### 5.4 Vier Sprachen (E2 = B)

`localization.js` der Vorlage wird nicht übernommen: Es ersetzt deutsche DOM-Texte per Textvergleich und würde dabei auch Projektdaten treffen. [Fakt] Stattdessen:

- **Kern (WS-1):** `public/leitstand/i18n.js` mit `t(schluessel, werte)`. Pluralformen über `Intl.PluralRules`, Datum und Zahl über `Intl.DateTimeFormat`/`Intl.NumberFormat`. Die Sprache kommt aus localStorage, Standard ist `de`; `html lang` wird gesetzt. Wörterbücher als JS-Module `public/leitstand/i18n/{de,en,tr,ru}.js`, weil der Server `.json` als octet-stream ausliefert.
- **Import-Sicherheit:** `i18n.js` greift beim Import weder auf DOM noch auf Storage zu. In Node gilt `de`. Dadurch bleiben die Render-Tests (`runs.test.mjs`, `empfehlung-*.test.mjs`, f43, f36-ws3) mit deutscher Ausgabe grün.
- **Gate (WS-1):** Alle vier Wörterbücher haben dieselbe Schlüsselmenge und je Schlüssel dieselben Platzhalter. Die Pluralformen sind je Sprache vollständig nach `Intl.PluralRules` (ru: one/few/many/other). Keine leeren Werte. Kein `#` mit Ziffern in Texten, sonst schlägt das Token-Gate fehl (z. B. „PR #145“). *Vermerk WS-0:* Dasselbe gilt für `#` mit drei bis acht Hex-Buchstaben, also z. B. „#add“, „#bad“ oder „#cafe“.
- **Je Paket (WS-2 bis WS-8):** Die View zieht ihre Texte in Schlüssel, alle vier Sprachen im selben PR. f15 und f12 greppen heute deutsche Quelltext-Literale; sie prüfen danach den Schlüssel bzw. den deutschen Wörterbuchwert. Die Invariante bleibt.
- **Nicht übersetzt:** Serverantworten (`grund`), Projektinhalte (Titel, Findings, Roadmap), Nutzereingaben, IDs und Befehle. So steht es auch in der Vorlage: „Nutzereingaben und Quellen bleiben unverändert.“
- **Zwischenstand:** Bis WS-8 sind noch nicht umgebaute Views deutsch. Die Sprachwahl wirkt bis dahin nur auf die umgebauten Teile.

## 6. Gate-Lage

Quelle: Subagent-Inventar, stichprobenartig verifiziert.

- **Token-Gate:**
  - Scannt `style.css` und alle `.js`/`.html` unter `public/leitstand`.
  - Farbliteral heißt Hex oder `rgb(a)` ohne `var(`. `hsl()` und Farbnamen erkennt es nicht (Lücke).
  - Nimmt alle `:root { … }`-Blöcke aus, aber nicht `:root[data-theme…]` und nicht `[data-theme…]`.
  - Die Kommentar-Balance gilt nur für `style.css`.
  - Weitere `.css`-Dateien werden nicht gescannt.
  - **Vermerk WS-0 (F-861):** Das ist der Stand vor WS-0. Seit WS-0 gilt:
    - `:root[data-theme]` zählt als Token-Block, `[data-theme…]`-Regeln mit Literal bleiben rot.
    - Alle `*.css` werden rekursiv gescannt, jeweils mit Kommentar-Balance.
    - `hsl`, `hwb`, `lab`, `lch`, `oklab`, `oklch` und `color()` zählen als Farbliteral, unabhängig von der Schreibweise.
    - Farbnamen erkennt das Gate weiterhin nicht.
- **Hohes Bruchrisiko:** f15-workflow-oberflaeche (IDs, Texte, exakte Ausdrücke in `workflows.js`, `runs.js`, `api.js`), f21-ws2 (exakter Nav-Anker `<a href="#/attention" data-nav-view="attention">`, IDs `workboard-*` und `attention-*`, Routen-Registrierung), f34 (Chat-IDs, CSS `[hidden]`), f12 (Markup der Laufakte).
- **Deutsche Literale:** f15 (`workflows.js`, `index.html`) und f12 (`runs.js`) greppen deutsche Texte im Quelltext; mit E2 = B ziehen sie auf Schlüssel bzw. das deutsche Wörterbuch um. Die übrigen Text-Prüfungen testen die gerenderte Ausgabe und bleiben mit Standard `de` grün.
- **Klicktest:** Der einzige echte Klicktest `check-f20-leitstand-shell` läuft nur in CI mit `continue-on-error`. Er blockiert also nichts; die Render-Nachweise je Paket ersetzen ihn im Umbau.
- **Server:** keine CSP. CSRF läuft ohne Token über `Sec-Fetch-Site` und `Origin`, eine UI von einem anderen Origin würde 403 bekommen. Statische Unterordner wie `assets/` werden ausgeliefert.

## 7. Entscheidungen Mensch

- **E1 = B** (Stefan, 30.09.2026): Zukunftsfunktionen bleiben sichtbar, deaktiviert und tragen „kommt“. Umsetzung siehe Abschnitt 4, Punkt 4. Die Challenger-Empfehlung war A (eigene Bereiche als Seite „kommt“, eingebettete Zukunftsknöpfe ausblenden).
- **E2 = B** (Stefan, 30.09.2026): Vier Sprachen de/en/tr/ru gehören zum Design-Schnitt. Umsetzung siehe 5.4. Die Challenger-Empfehlung war A (erst Deutsch, Sprachen als eigenes Paket später).

## 8. Findings

- **F-860 · BUG · P2** — Ein Projektwechsel lädt Workitems, Roadmap, P0/P1-Zahl, Verbrauch sowie Aufträge und Werkzeugsätze des Direktstarts nicht neu. Nur der Chat abonniert `abonniereProjektWechsel` [Fakt]. Dass nach „Öffnen“ alte Daten stehen bleiben, ist nicht im Browser geprüft [Schlussfolgerung]. Fundstelle: `projekt-kontext.js:86-101`, `workboard.js:1312-1313`, `dashboard.js:219-220`, `projekt.js:303-308`. Maßnahme: zentraler Neuladen-Hook in WS-1. Möglicherweise verwandt mit F-854 [Annahme].
- **F-861 · HARNESS_IMPROVEMENT · P2** — Das Token-Gate erkennt Token-Blöcke `:root[data-theme]` nicht; ein manueller Hell/Dunkel-Umschalter wäre rot. Als CSS scannt es nur `style.css`, ein zweites Stylesheet bliebe ungeprüft. `hsl()` und Farbnamen erkennt es nicht. Maßnahme: in WS-0.
- **F-862 · BUG · P3** — Der Schnellzugriff „Neues Projekt“ in der Sidebar ist disabled mit „kommt bald“ (`index.html:122`), obwohl F41 gebaut ist. Maßnahme: in WS-1 (das „+“ neben der Projektauswahl).
- **F-863 · PROCESS_IMPROVEMENT · P3** — Eine Designvorlage trägt den Funktionsstand ihres Briefings: Hier galten F36 und F43 als Zukunft. Maßnahme: Die Checkliste des design-guardian verlangt vor der Übernahme einen Abgleich gegen `main`.
- **F-864 · TECH_DEBT · P3** — Der einzige Browser-Klicktest (`check-f20-leitstand-shell`) blockiert nicht, er läuft in CI mit `continue-on-error`. Im Umbau ersetzen ihn die Render-Nachweise; nach WS-5 entscheiden, ob er mit neuen Selektoren blockierend wird.
- **F-865 · BUG · P3** — In der Vorlage liegt bei 1440×1000 die Sidebar-Illustration (`gear.png`) unter den Einträgen „Alle Produkte“, „Nutzung“ und „Einstellungen“ (Screenshot). Maßnahme: Kontrast in WS-1 durch den design-guardian prüfen lassen und eine minimale Korrektur ohne neue Gestaltung vornehmen.
- **F-866 · TECH_DEBT · P3** — Die Übersetzungen ins Türkische und Russische entstehen ohne muttersprachliche Prüfung. Das i18n-Gate prüft nur die Vollständigkeit, nicht die Qualität. Maßnahme: Übersetzungen als „maschinell, ungeprüft“ im Wörterbuch-Kopf kennzeichnen; eine Prüfung durch eine muttersprachliche Person bei Bedarf nachholen.
- **F-776:** empfohlen, aus F-725 herauszunehmen und ins V1-Backlog mit Auslöser zu verschieben.
- **F-857, F-854:** in WS-6 bzw. WS-2 mitnehmen.

## 9. Referenzbild → Leitstand-Ansicht (Ergänzung WS-0)

Diese Zuordnung kommt nicht aus dem Challenger-Dokument, sondern wurde in WS-0 ergänzt. Die Referenzbilder heißen nach den Routen der Vorlage (`docs/design/vorlage-v10/screens/`). Die Tabelle zeigt für jedes Bild, gegen welche Leitstand-Ansicht nach §5.2 geprüft wird, welche Zeilen aus §3 betroffen sind und in welchem Paket das geschieht.

- „Z-Seite“ bedeutet: Die Seite erscheint nach E1 = B als Platzhalter im Stil der Vorlage, ohne Beispieldaten.
- Für `m_` und `l_` gilt dieselbe Zuordnung wie für das gleichnamige `d_`-Bild.
- Profil (A3/A11) hat kein eigenes Referenzbild. Es steckt in der Sidebar jedes `d_`-Bilds.

| Referenzbild | Leitstand-Ansicht | Zeilen | WS |
|---|---|---|---|
| `d_start` | `#/start` | A1, A2 | WS-1 |
| `d_uebersicht` | `#/dashboard` | B1–B16, A3–A5 | WS-2 (Shell WS-1) |
| `d_projekt_ai-workforce_roadmap` | `#/roadmap` (neu) | D1–D4 | WS-2 |
| `d_entscheidungen` | `#/attention` | C1–C3 | WS-2 |
| `d_arbeit_board` | `#/workboard`, Status-Kanban | E1 | WS-3 |
| `d_arbeit_prioritaeten` | `#/workboard`, Prioritäts-Kanban | E2 (Z) | WS-3 |
| `d_arbeit_features` | `#/workboard`, Listen | E4, E5, E6 | WS-3 |
| `d_arbeit_f35` | `#/workboard/<id>` | E8, E9, E10, E11, E13 (Z) | WS-3 |
| `d_auftrag_neu` | `#/projekt`, Auftrag anlegen und Direktstart | F1, G10, G11 | WS-5b |
| `d_workflow_neu` | `#/workflows/<id>`, Ablauf und Freigabedialog | F2, F3, F3b, F4, F5, F12 | WS-4 |
| `d_workflow_klaerung` | `#/workflows/<id>`, Rückfrage und Architekt-Entscheidung | F6, F8, F9, F10 | WS-4 |
| `d_abnahme_f35` | `#/workflows/<id>`, Abnahmeblock | F13–F18 | WS-4 |
| `d_arbeit_verlauf` | `#/runs` (Ausführungen und Workflow-Liste) | F0, G1 | WS-4 / WS-5 |
| `d_ausfuehrung_failed` | `#/runs/<id>` | G2–G9, F7 | WS-5 |
| `d_projekte` | `#/projekte-uebersicht` | H1, H2, H6 | WS-6 |
| `d_projekt_neu` | `#/projekte-uebersicht`, Projekt anlegen (F41) | H3, H4, A14 | WS-6 |
| `d_produkt` | `#/projekte-uebersicht`, „Vorschau & Aufruf“ (F43) | H5 (V\*), H6 | WS-6 |
| `d_nutzung` | `#/nutzung` (neu) | I1–I3 | WS-6 |
| `d_harness_skelett` | `#/capabilities`, Register Harness-Aufbau | J1, J2 (Z) | WS-7 |
| `d_harness_phasen` | `#/capabilities`, Register Phasen & Rollen | J3 | WS-7 |
| `d_harness_datei_architecture` | `#/capabilities`, Harness-Datei | J4 (Z) | WS-7 |
| `d_faehigkeiten` | `#/capabilities`, Register Fähigkeiten | J5, J6 | WS-7 |
| `d_faehigkeiten_rollen` | `#/capabilities`, Rollen & Besetzung | J7, J8 | WS-7 |
| `d_faehigkeiten_scout` | `#/capabilities`, Scout je Gap | J10 | WS-7 |
| `d_faehigkeiten_empfehlungen` | Freigabeblock in `#/workflows/<id>` (die Empfehlung ist nur dort echt) | J9 (V\*), F4 | WS-4 / WS-7 |
| `d_einstellungen` | `#/einstellungen` (neu) | A6, A7, A11 | WS-1 |
| `d_produktzyklus_ideate_strategy` | `#/produktzyklus` (neu), Z-Seite | K1 | WS-1 |
| `d_brain` | `#/brain` (neu), Z-Seite | K2 | WS-1 |
| `d_projekt_ai-workforce_technik_architecture` | keine eigene Route; nur der deaktivierte Einstieg „Was steckt dahinter“ (B13) | K3 | WS-1 / WS-2 |
| `d_projekt_ai-workforce_technik_health` | keine eigene Route; nur der deaktivierte Einstieg „Was steckt dahinter“ (B13) | K3 | WS-1 / WS-2 |
| `d_jarvis` | `#/chat`, große Ansicht Jarvis | L1, L4–L7 | WS-8 |
| `d_jarvis_coach` | `#/chat`, Coach | L2, L3 | WS-8 |
| `motion_start_*` | `#/start` | A1 | WS-1 |
| `motion_persona_*` | Kopfzeile, Persona | A1, A5 | WS-1 |
| ohne eigenes Bild | Shell auf jeder Seite: Fehlerbanner, Zuletzt geöffnet, Chat-Dock, Manifest, Toast | A9, A10, A12, A13, A15 | WS-1 / WS-8 |
| ohne eigenes Bild | `#/workboard`: Zeitleiste (Z), Eintrag erfassen (Z), 409-Konflikt mit „Wiederholen“ | E3, E7, E12 | WS-3 |
| ohne eigenes Bild | `#/projekte-uebersicht`: Produkt bearbeiten (Z) | H7 | WS-6 |

> **Vermerk WS-7a (Auftrag Stefan, 02.10.2026):** WS-7a „Werkstatt-Gerüst, Werkzeuge, Rollen“ baut `#/capabilities` ohne neue Route und ohne Serveränderung um: Seitenkopf nach `d_harness_phasen` („Workforce & Umgebung“, „Deine Entwicklungswerkstatt.“, „Neu laden“), Register Harness-Aufbau | Phasen & Rollen | Fähigkeiten (clientseitig, `role=tablist` mit Pfeiltasten/Pos1/Ende, Standard Fähigkeiten), darin die Unterreiter Werkzeuge | Rollen & Besetzung | Empfehlungen. **J5/J6** (`d_faehigkeiten`): Kennzahlzeile (im Katalog · freigegeben · Freigabe offen), Suche über id/Name/Beschreibung, Filter Typ und Freigabe, Kacheln mit Detailklappe (ID, Phasen, Grund, „Fehlt für Einsatz“), ASSESSED-Hinweis roh, Startvorlagenpfad in einer Technik-Klappe; kein Aktivieren/Freigeben (nur F36-Weg im Freigabedialog). **J7/J8** (`d_faehigkeiten_rollen`): Liste je Rolle mit Chip gedeckt/Gap offen, Gap-Zeilen je Worker im Rollenblock und „Details“ (Ebenen 1–4 lazy); das Rollen-Select entfällt. Abweichungen von der Vorlage: kein Knopf „Fähigkeit entdecken“ (Freitext-Scout = J10 Z; der Kopf folgt d_harness_phasen, das den Knopf nicht hat — ob er nach E-F44-1 als Baustein „kommt“ erscheint, entscheidet WS-7b), keine Icons je Kachel und kein Pfeil im Fuß (kein Ziel einer Fähigkeits-Seite), Unterzeile je Rolle „Benötigt: …“ statt einer Rollenbeschreibung (die Abdeckung trägt keinen Zweck; er steht in den Details, Ebene 1). Übrige J-Zeilen: **J1/J2/J4** → Harness-Werkstatt (Design-Finalisierung nach WS-8, F-950); bis dahin Harness-Aufbau als Baustein „kommt“. **J3** ist überholt durch Stefans Entscheidung „Rollen-Kreis statt Phasen-Kreis“ (Produktübersicht neu, Design-Finalisierung, F-952); das Register Phasen & Rollen ist bis dahin ein Baustein „kommt“. **J9** ist in WS-4a erledigt (F4/F5, Empfehlung im Freigabeschritt); der Unterreiter Empfehlungen verweist nur dorthin. **J10** (Scout) → WS-7b; das Scout-Panel bleibt bis dahin optisch und im Verhalten unverändert.

> **Vermerk WS-7b (Auftrag Stefan, 02.10.2026):** WS-7b „Scout“ bringt J10 in den Stil von V10, ohne Server-, Schema-, API- oder Routenänderung. **J10 jetzt:** Ergebnis und Merken **V** (Kandidaten als Karten nach d_faehigkeiten_scout: Tag „Kandidat · Typ“, Name, Empfehlung, Passung, Integrationsaufwand, Rechte, Lizenz „—“, Risiken oder „keine erkannt“, Unsicherheiten, Quelle nur bei http(s) als Link mit `rel="noopener noreferrer"` und „ungeprüft“ bis geöffnet, Kollisionshinweis, Vormerken mit allen bisherigen Zuständen; P5-Hinweis über dem Ergebnis), Einstieg je Gap **F** („Kandidaten suchen“ an der Lücke unter Rollen & Besetzung, Logik und Sperre unverändert), Freitext **Z**: Knopf „Fähigkeit entdecken“ im Kopf als Baustein „kommt“ (Lupe, `aria-disabled`, Erklärung über title und `aria-describedby`; keine Route, keine Freitextsuche). Zwischen- und Fehlerzustände des Panels als Notiz im Seitenstil (Fehler rot). Alle Scout-Texte in de/en/tr/ru (`werkstatt.scout.*`); der Auftragstext an das Modell bleibt deutsch (Vertrag der Rolle scout). Abweichungen von der Vorlage: kein eigener Scout-Bildschirm mit Freitextfeld (Z), Karten statt „Für spätere Prüfung merken“-Panels mit vollständigen Kandidatendaten (F aus F27); Typ, Passung und Aufwand sind geschlossene Wertemengen des Schemas und werden übersetzt (unbekannte Werte roh). Bekannte Grenzen nach einem Projektwechsel: F-957. Dazu F-955 (Scout-Zustand beim Projektwechsel) erledigt und die Werkzeug-Kacheln auf drei Zeilen Beschreibung gekürzt (Volltext im Kachel-Detail).
