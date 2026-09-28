# F36 WS-1b — Übernahme der Recherche in den Katalog

Einordnung aller Kandidaten mit Urteil „Aufnehmen" (21) und „Pilot" (17)
aus `docs/harness/kandidaten-2026-09-15.md` nach E-F36-5
(`docs/projekt/zielfassung.md` §13.6). Aliasse (Headroom-Plugin,
Hyperframes-Plugin, HeyGen Hyperframes) sind übersprungen. Nur Daten aus
der Kandidaten-Doku, keine eigene Recherche. Nichts ist installiert oder
freigegeben.

**Zählung:** Gruppe 1: 14 (12 neu, 2 bestehende ergänzt) · Gruppe 2: 11 ·
Gruppe 3: 1 · Harness-Kandidaten: 6 · ausgeschlossen: 6 · gesamt: 38.

Gruppen: **1** = Laufzeit-Fähigkeit (Skill/Agent/MCP) → `ressourcen.json`,
`freigabe: OFFEN`, ohne `installation`. **2** = Produkt-Bibliothek →
`docs/harness/stack-kandidaten.md`. **3** = Referenz → Design-Schnitt
(F-725/F-776). **ausgeschlossen** = Auswahlfilter der Quelle
(nichtkommerziell, kostenpflichtig inkl. Pflicht-API, Lizenz oder
Identität ungeklärt). **Harness** = Werkzeug für die Workforce selbst
oder Sonderwerkzeug, nicht im Katalog (eigene Rubrik unten).

`anwendbar_wenn` ist ein Vorschlag (Kürzel: `tt` = `task_typen_any`,
`pm` = `pfad_muster_any`; UI-Globs = `**/*.html`, `**/*.css`, `**/*.tsx`,
`**/*.jsx`). „Quelle" = Zeile der Bewertungsmatrix.

| Name | Gruppe | Ziel | unterart | wirkung | anwendbar_wenn | Lizenz | Kosten | Grund/Unsicherheit |
|---|---|---|---|---|---|---|---|---|
| Shadcn.ui | 2 | stack-kandidaten | – | – | – | MIT (GitHub-Metadaten) | Lokal; 0 Lizenzgebühr | React-Komponentenbibliothek für Produkte (Quelle 123). |
| Kibo UI | 2 | stack-kandidaten | – | – | – | MIT laut offizieller Website | Lokal; kostenlos | Ergänzt shadcn (Quelle 124). Kein GitHub-Repo in der Quelle, nur Website. |
| Thinking Orbs | 2 | stack-kandidaten | – | – | – | MIT (GitHub-Metadaten) | Lokal; 0 Lizenzgebühr | UI-Komponente (Quelle 130). Quelle sieht sie für Jarvis (Workforce-UI) vor; ob Design-Schnitt oder Produktstack, entscheidet F-725. |
| OCRmyPDF | 2 | stack-kandidaten | – | – | – | MPL-2.0 (GitHub-Metadaten) | Lokale CPU, kein LLM erforderlich | CLI/Bibliothek für Dokumenteingang (Quelle 156). Ghostscript/Tesseract mit eigenen Lizenzen. |
| MengTo/skills | 1 | `mengto-skills` | skill | – | tt neues-feature; pm UI-Globs | MIT (GitHub-Metadaten) | Skill-Dateien kostenlos; Ausführung verbraucht Modellquota | Sammlung — nur einzelne Skills übernehmen; welcher, ist offen (Quelle 157). |
| Mattpocock skills | 1 | `mattpocock-skills` | skill | – | tt neues-feature | MIT (GitHub-Metadaten) | Skill-Dateien kostenlos; Modellquota | Sammlung; Capabilities SPEC_WRITE/PLAN_REVIEW/CODE_REVIEW aus der Kurzbeschreibung abgeleitet (Quelle 165). |
| Addyosmani skills | 1 | `addyosmani-agent-skills` | skill | – | tt neues-feature, refactoring | MIT (GitHub-Metadaten) | Skill-Dateien kostenlos; Modellquota | Sammlung; nur relevante Skills laden (Quelle 167). |
| Github-mcp | 1 | `github-mcp` | mcp | extern_schreibend | tt bugfix, neues-feature | MIT (GitHub-Metadaten) | Server kostenlos; GitHub-Funktionen und Quota separat | Schreibt nach GitHub → in V1 nicht freigebbar (E-F36-4). Mit Lesezugriff/Toolsets begrenzt wäre `extern_lesend` möglich — ungeprüft (Quelle 170). |
| Ntfy | 2 | stack-kandidaten | – | – | – | Apache-2.0 oder GPL-2.0 laut README | Self-Hosting; gehostete Gratis-/Bezahlpläne | Dienst, kein Skill/Agent/MCP (Quelle 178). Quelle meint auch Benachrichtigungen der Workforce selbst; Zuordnung Gruppe 2 vorläufig. |
| Last30days-skill | 1 | `last30days-skill` | skill | – | tt dokumentation | MIT (GitHub-Metadaten) | Modellquota; einzelne Quellen/APIs kostenpflichtig | Kostenfreier Basispfad nicht einzeln belegt; bezahlte Quellen müssen aus bleiben (Quelle 194). Recherche passt schlecht auf die Task-Typen. |
| Hyperframes | 2 | stack-kandidaten | – | – | – | Apache-2.0 (GitHub-Metadaten) | Framework kostenlos; Rendering und optionale KI extra | Framework für Videos (Quelle 195). Plugin-Variante (Alias, Quelle 293) nicht eingeordnet — Unterart der Plugin-Variante unbelegt. |
| Archify | 1 | `archify` | skill | – | tt dokumentation; pm `ARCHITECTURE.md`, `docs/**` | MIT (GitHub-Metadaten) | Lokal plus Modellquota | Quelle 75: „Nicht beide Diagramm-Skills routinemäßig zusammen laden" — Überschneidung mit `diagram-design` muss WS-3 auflösen (Quelle 202). |
| Diagram-design | 1 | `diagram-design` | skill | – | tt dokumentation | MIT (GitHub-Metadaten) | Lokal plus Modellquota | Siehe Archify (Quelle 203). |
| Humanizer | 1 | `humanizer` | skill | – | tt text-aenderung, dokumentation | MIT (GitHub-Metadaten) | Skill kostenlos; Modellquota | Fakten/Zitate müssen erhalten bleiben (Quelle 210). |
| MarkITDOwn | 2 | stack-kandidaten | – | – | – | MIT (GitHub-Metadaten) | Lokaler Basispfad kostenlos; Azure-/LLM-Funktionen optional bezahlt | Bibliothek/CLI (Quelle 216). Eine MCP-Variante nennt die Quelle nicht. |
| Simplyfy Codebase | 1 | `simplify-codebase` | skill | – | tt refactoring | MIT (GitHub-Metadaten) | Skill kostenlos; Modellquota | Überschneidet sich mit `ponytail` (SIMPLICITY_REVIEW) (Quelle 239). |
| Portless | 2 | stack-kandidaten | – | – | – | Apache-2.0 (GitHub-Metadaten) | Lokal; kostenlos | Entwicklungsumgebung, keine Laufzeit-Fähigkeit (Quelle 267). Zuordnung Gruppe 2 vorläufig. |
| Alibaba/open-code-review | 1 | `open-code-review` | skill | – | tt neues-feature, bugfix, refactoring | Apache-2.0 (GitHub-Metadaten) | API oder Delegation an vorhandenen Coding-Agent | **unterart vermutet, WS-5 prüft fail-closed auf SKILL.md** (Integrationsart nennt die Quelle nicht; bleibt `OFFEN`); Telemetrie/Quellcodeabfluss prüfen (Quelle 272). |
| FrontendDesign | 1 | `frontend-design` (bestehend) | skill | – | tt neues-feature; pm UI-Globs | Apache-2.0 im Plugin-LICENSE | Kein separater Pluginpreis; Modellquota | Nicht dupliziert; bestehender Eintrag um lizenz/kosten/anwendbar_wenn ergänzt, `herkunft.url` auf den Plugin-Pfad der Quelle präzisiert (WS-5 installiert nur von dort) (Quelle 287). |
| Playwright | 1 | `playwright-mcp` (bestehend) | mcp | lokal | tt neues-feature, bugfix; pm `**/*.html`, `**/*.css`, `public/**` | Apache-2.0 (GitHub-Metadaten) | Server lokal kostenlos; Browser und Agentenquota | Nicht dupliziert; bestehender Eintrag ergänzt. Keine Security Boundary (Quelle 290). **Entscheidung Challenger (28.09.2026): wirkung bleibt `lokal`.** Freigabe nur mit einem Start, der `--allowed-origins` auf `http://localhost` und `http://127.0.0.1` begrenzt; WS-5 belegt das mit einem Rot-Fall (fremde Origin wird verweigert). Hält die Begrenzung nicht, wird wirkung `extern_schreibend`. |
| Iannuttall | 1 | `iannuttall-seo` | mcp | extern_lesend | tt neues-feature, text-aenderung; pm `**/*.html` | Apache-2.0 (GitHub-Metadaten) | Tool kostenlos; verbundene Daten-/Modellkosten separat | Crawl, Search Console, GA4 → fremde Dienste; in V1 nicht freigebbar (E-F36-4, F-778). Neue Capability SEO_AUDIT (Quelle 323). |
| Pipecat | ausgeschlossen | – | – | – | – | BSD-2-Clause (GitHub-Metadaten) | Framework kostenlos; STT, TTS, LLM und Transport je Anbieter | Kosten und Modellrechte ungeklärt: kostenfreier, kommerziell zulässiger lokaler STT-/TTS-/LLM-Pfad nicht belegt; Quelle führt Pipecat bis dahin als zurückgestellt bzw. bedingten Piloten (Z. 23, 29, 73). Gleiche Linie wie VoiceBox/PersonaLive (Quelle 147). |
| Graft | ausgeschlossen | – | – | – | – | MIT (GitHub-Metadaten) | Code kostenlos; genaue Betriebs-/Indexkosten im Pilot messen | Identität unklar, Auswahlfilter: zurückstellen (Filterzeile 23; generischer Name, nur Kandidat, Quelle 188, 375). Entscheidung Challenger 28.09.2026; aus `ressourcen.json` entfernt. |
| Pdfcn | 2 | stack-kandidaten | – | – | – | MIT (GitHub-Metadaten) | Lokal; kostenlos | React-PDF-Komponenten (Quelle 200). |
| Switchyard | ausgeschlossen | – | – | – | – | Apache-2.0 (GitHub-Metadaten) | Runtime kostenlos; Inferenz- und Infrastrukturkosten | Kostenpflichtig: Modellrouting über Provider setzt API-Inferenz voraus (Pflicht-API) (Quelle 205). |
| AnyDOc | 2 | stack-kandidaten | – | – | – | MIT (GitHub-Metadaten) | Lokaler Betrieb | Dokumentkonvertierung mit Bindings (Quelle 234). |
| PersonaLive | ausgeschlossen | – | – | – | – | Apache-2.0 (GitHub-Metadaten) | GPU, Modellgewichte und Integration | Lizenz ungeklärt: Modell-/Gewichtelizenzen ungeprüft, Code-Lizenz deckt nicht alles ab (Quelle 249). |
| OpenDesign | 3 | Referenz | – | – | – | Apache-2.0 (GitHub-Metadaten) | Code kostenlos; vorhandene CLI-/Modellquota oder BYOK | Eigenständige Designoberfläche → Design-Schnitt (F-725) (Quelle 261). |
| MiniMax H3 | ausgeschlossen | – | – | – | – | MiniMax H3 Community License Agreement | GPU oder kostenpflichtige Inferenz | Lizenz ungeklärt: Community-Lizenz und Modellvarianten ungeprüft (Quelle 266). |
| VoiceBox | ausgeschlossen | – | – | – | – | MIT (GitHub-Metadaten) | Modelle, Hardware; Cloudoptionen separat | Lizenz ungeklärt: Rechte an Stimmen und Modellgewichten ungeprüft (Quelle 270). |
| OKF Agent Memory | 1 | `okf-agent-memory` | mcp | lokal | tt neues-feature, bugfix, refactoring | MIT (GitHub-Metadaten) | Lokal; keine Embedding-API für Basissuche | Schreibt Memory-Dateien; Herkunft/Konflikte/Löschung ungeklärt. Anwendbarkeit kaum an einen Task-Typ bindbar (Quelle 276). |
| OfficeCLI | 2 | stack-kandidaten | – | – | – | iOfficeAI Apache-2.0; officecli/officecli MIT | Kandidat kostenlos; Agentenquota | Zwei gleichnamige Repos, iOfficeAI bevorzugt (Quelle 277). Als CLI auch eine Laufzeit-Fähigkeit denkbar — Unterart unbelegt. |

## Harness-Kandidaten (nicht im Katalog)

Entscheidung Challenger (28.09.2026): Werkzeuge für die Workforce selbst
bzw. Sonderwerkzeuge — weder Laufzeit-Fähigkeit eines Laufs noch
Produkt-Bibliothek oder Design-Referenz. Sie kommen weder in
`ressourcen.json` noch in `docs/harness/stack-kandidaten.md`.

| Name | Gruppe | Ziel | unterart | wirkung | anwendbar_wenn | Lizenz | Kosten | Grund/Unsicherheit |
|---|---|---|---|---|---|---|---|---|
| Headroom | Harness | – (nicht im Katalog) | – | – | – | Apache-2.0 (GitHub-Metadaten) | Lokale Rechenzeit; Modelle und Provider separat | Werkzeug für die Workforce selbst (Kontextkompression); Quelle rät zuerst zur isolierten Library-Variante, MCP-Modus registriert Werkzeuge global (Quelle 171). |
| Doberman | Harness | – (nicht im Katalog) | – | – | – | Apache-2.0 (GitHub-Metadaten) | Code kostenlos; Konfiguration/Betrieb | Laufzeitprüfung der Workforce selbst, Telemetrie standardmäßig aktiv (Quelle 189). |
| Airship | Harness | – (nicht im Katalog) | – | – | – | MIT (GitHub-Metadaten) | Lokal; vorhandene Agentenquota | Eigene Oberfläche über Devserver + Coding-Agent, überschneidet Leitstand (Quelle 197). |
| Shannon (für security) | Harness | – (nicht im Katalog) | – | – | – | AGPL-3.0 (GitHub-Metadaten) | Modelle/API und isolierte Infrastruktur | Security-Sonderwerkzeug mit aktiven Exploitversuchen, nur Staging (Quelle 257). Kein Skill/Agent/MCP eines Laufs. |
| Ontology Atlas | Harness | – (nicht im Katalog) | – | – | – | MIT (GitHub-Metadaten) | Lokal; keine API für Basisspeicher nötig | Gedächtnis-Ansatz der Workforce selbst, pre-1.0 (Quelle 271). Keine MCP-Variante belegt. |
| OrcaReplay | Harness | – (nicht im Katalog) | – | – | – | Apache-2.0 (GitHub-Metadaten) | Replay ohne LLM möglich; neue Läufe/Modellwechsel kosten | Replay von Agentenläufen der Workforce; führt Tools real aus (Quelle 274). |

## Neue Capability-Namen

`DIAGRAM_GENERATION` (archify, diagram-design), `TEXT_EDITING`
(humanizer), `SEO_AUDIT` (iannuttall-seo). Alle übrigen Einträge
verwenden vorhandene Namen.
