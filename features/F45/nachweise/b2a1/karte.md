# Projektkarte
Vom Leitstand je Lauf aus dem Projekt erzeugt (Rolle architekt) — Kontext, kein Auftrag. Lies die genannten Dateien selbst, wenn du Einzelheiten brauchst.

## Vorhaben
Projektbeschreibung (docs/projekt/kontext/beschreibung.md, Stand 67662c830b3c):
# Projektbeschreibung — AI Workforce

F33 WS-1 (E-M4-2, "Kontrollzustand im eigenen Repo"). Wird über den
Context Builder an die lesenden Rollen `jarvis` und `router` eingespeist
— unabhängig davon, ob `CLAUDE.md` im jeweiligen Lauf geladen wird
(`features/F33/spike-setting-sources.md`).

## Was es ist

AI Workforce ist eine lokale Orchestrierungsanwendung, die ein Vorhaben
von der Idee bis zum abgenommenen Ergebnis durch klar getrennte
KI-Positionen führt: Architektur-Advisor, Ausführung, Code-Reviewer, QA,
Router und Jarvis. Jede Position läuft als eigener, isolierter
Werkzeugprozess (Claude Code oder Codex CLI) mit eigenem Werkzeugsatz und
eigenem Rollenvertrag — keine Position sieht mehr, als ihr Vertrag
erlaubt.

## Für wen

Ein einziger Nutzer (Stefan), der zugleich Vorarbeiter und einzige
Entscheidungsinstanz ist. Ein Kollege kann in einer eigenen lokalen
Instanz ein Projekt importieren und eigenständig arbeiten (Meilenstein 4,
E-M4-2) — Mehrbenutzerbetrieb *innerhalb einer Instanz* ist ausdrücklich
kein Ziel.

## Zielbild

Stefan — und ein Kollege in eigener lokaler Instanz — legt Projekte an
oder importiert sie, sieht Arbeit, Aufmerksamkeit und Fähigkeiten der
Workforce an einem Ort (Leitstand/Jarvis Workspace), startet Arbeit per
Klick oder Chat, nimmt reale Ergebnisse ab oder fordert eine begrenzte
Anpassung desselben Auftrags an, und die Workforce entwickelt sich
darüber selbst weiter.

## Führungsprinzip

Dateien und Git sind der führende Zustand (`ARCHITECTURE.md` §2). Der
Kontrollzustand eines Projekts liegt in dessen eigenem Repository, nie
zentral (D3 "im selben Repository", E-M4-2). Ein laufender Prozess ist
keiner der drei Terminalausgänge eines Laufs (`ERFOLGREICH`,
`VERWEIGERT`, `FEHLGESCHLAGEN`) — Blockieren ist ein normaler Ausgang,
kein Fehler.

## Nicht das Ziel

Mehrbenutzerbetrieb *in einer Instanz*, Hosting, Abrechnung,
Provider-Adapter, parallele Workstreams, autonome produktive/externe/
irreversible Aktionen. Vollständige, laufend aktuelle Liste:
`docs/projekt/zielfassung.md` §13.2/§13.5 "Nicht in Meilenstein 4".

## Sollquelle

Vollständiges Zielbild, Rollenmodell, Lifecycle, Sicherheits- und
Evidenzmodell: `docs/projekt/zielfassung.md`. Aktueller Phasen- und
Feature-Stand: `docs/STATUS.md`. Diese Datei ist eine Kurzfassung für den
Kontextpaket-Bau, keine eigene Sollquelle — bei Widerspruch gilt
`docs/projekt/zielfassung.md`.

Auftrag: Nachweis B2a-1: Gate für die Abschnittszahl der Projektkarte
Ziel: Architekturentwurf für ein Gate zur Kartengröße (Nachweis B2a-1).
Akzeptanzkriterien: keine strukturierten AK im Auftrag.
Nicht-Ziele: keine benannt.
Feature-Akte: kein Feature-Bezug im Auftrag (folgt mit B2a-2).

## Bestand
ARCHITECTURE.md, Stand 5729669607c1 — Auszug der beschriebenen Abschnitte:
### Ordnerstruktur
- `src/` — Kern-Code der AI Workforce. Einziger Produktpfad.
- `kontrollzustand/` — Kontrollzustand als JSON/JSONL: Checkpoints, Wirkungsmarken, Artefakt- und Lineage-Einträge, Transportpakete, wegwerfbarer Index. Kein Markdown.
- `profiles/` — Profilkonfiguration als JSON. Ein-Ebenen-Modell: je Projekt genau eine vollständige, eigenständige Profildatei; kein Domänen-Profil mit Projekt-Overlay.
- `startvorlagen/` — Startvorlagen als JSON (F11 WS-2): die maschinenkonstanten Startfelder eines Leitstand-Startauftrags (Startziel, Werkzeugversion, Berechtigungskontext, Profilverweis, Modell, Standard-Budget) und benannte Werkzeugsätze. Eigener Ordner statt `profiles/`, damit die bestehende Ein-Ebenen-Profilvalidierung (`scripts/check-datenformate.mjs`) nicht bricht — eine Startvorlage ist kein Profil. Projektspezifische Prüfkonfiguration liegt ebenfalls in der Startvorlage: pruefbefehl (F-652) und pruefketten_pfade (F-735, ergänzt die Default-Liste der Regel 1j). Der Werkzeugsatz 'schreibend' trägt eine Bash-Allowlist für Paket- und Prüfbefehle (E-F754, docs/adr/ausfuehrung-bash-allowlist.md); nacktes Bash und git-Befehle weist der Validator ab.
- `harness-abgleich/` — versionierte Zuordnung des Projekt-Harness (F45 B1b-2, Beleg 12): `standard.json` ordnet jeden DoD-Punkt aus CLAUDE.md, jeden Hook, Agent, Skill und Command `wirksam` (mit Beleg), `ersetzt_durch` (Workflow-Schritt) oder `bewusst_nicht` (Begründung) zu; Schema `schemas/harness-zuordnung.schema.json`, je Projekt über
… [gekürzt — vollständig in ARCHITECTURE.md § Ordnerstruktur]

### Datenzugriff
- Dateien und Git sind der führende Zustand. Keine Datenbank als führender Zustandsspeicher; ein Index ist wegwerfbar und jederzeit neu erzeugbar.
- Schreibend auf `kontrollzustand/` greift ausschließlich der Kern zu, und nur über die append-only Hash-Kette des Checkpoint Store. Kein Commit pro Zustandsübergang — der Kontrollzustand ist Momentaufnahme im Metadaten-Commit.
- Einzige Ausnahme: `kontrollzustand/.leitstand.lock`, der Instanz-Lock des Leitstand-Prozesses (F-201). Flüchtiger Betriebszustand mit PID, Port und Startzeit — kein Artefakt, keine Lineage, keine Hash-Kette, git-ignoriert, vom Leitstand nur im CLI-Bindeblock vor dem Binden angelegt und beim Prozessende entfernt. Er liegt hier, weil er genau diese Ressource schützt: zwei Serverprozesse auf demselben `kontrollzustand/`. Jede weitere Ausnahme braucht denselben Weg — erst hier, dann im Code.
- Weitere Ausnahme (F45 F-1, E-F45-8): `~/.ai-workforce/faehigkeiten.lokal.json` — Aktivierung und Freigaben nach Inhalt
  der Fähigkeiten je Projekt (Schema `schemas/faehigkeiten-lokal.schema.json`). Liegt außerhalb jedes Repos und jedes
  Arbeitsordners, damit kein Lauf sich selbst etwas freigibt; geschrieben nur von den POST-Routen
  `/api/projekte/<id>/faehigkeiten/…` auf direkte Eingabe (gesperrt, solange ein Lauf aktiv ist), vorher/nachher je
  Lauf gehasht (Abweichung = Lauf rot). Kein Kontrollzustand, keine Hash-Kette; ungültig sperrt jeden Start mit
  Katalog-Fähigkeiten (E-F45-7). Eine Änderung, die nicht über di
… [gekürzt — vollständig in ARCHITECTURE.md § Datenzugriff]

### Auth
Kein Mehrbenutzerbetrieb, keine Anmeldung. Was hier geschützt wird, ist die Autorisierung, und sie trägt zwei voneinander unabhängige Schichten:

1. **Authorization Boundary** — Bezeugungen menschlicher Freigaben liegen außerhalb der Schreibreichweite des Ausführungswerkzeugs, in einem eigenen Git-Repository. Der Checkpoint trägt Referenz und Hash; validiert wird immer gegen den geschützten Ort, nie gegen die Referenz allein. Eine im Produkt-Repository sichtbare Kopie ist niemals alleinige Autoritätsquelle.
2. **Invocation Policy / Protection Validator** — vor jeder Execution mit Schreibwirkung, lokal und ohne Werkzeugaufruf: ist die Werkzeugkonfiguration gültig und existiert jedes von ihr referenzierte Schutzskript mit dem erwarteten Hash, und liegt ein gültiger Wirksamkeitsnachweis für den Gültigkeitsschlüssel vor. Scheitert eine der beiden Prüfungen, startet keine Execution.

Der Kern erzeugt niemals ein Freigabeartefakt. Autorisierungen entstehen ausschließlich aus direkter menschlicher Eingabe.

Ein Pflichtdokument, das nur eine der beiden Schichten kennt, kann versehentlich unterlaufen werden — deshalb stehen beide hier.

### Fehlerbehandlung
- Ein Werkzeuglauf hat genau drei terminale Ausgänge: `ERFOLGREICH`, `VERWEIGERT`, `FEHLGESCHLAGEN`. Klassifikationsreihenfolge: ungültige Beobachtungsbasis → `FEHLGESCHLAGEN`; gültige Verweigerung → `VERWEIGERT`; sonst bei erfüllten Erfolgskriterien → `ERFOLGREICH`. Ein allgemeines Erfolgsflag überstimmt nie eine konkrete Verweigerung.
- Klassifiziert wird ausschließlich aus Ergebnishülle und strukturiertem Ereignisstrom. Konsolentext wird nicht gedeutet.
- Jeder Lauf erzeugt zwei getrennte Ablagen: die kanonische Laufakte, die nur trägt, was Zustand, Freigabe oder Qualitätsdaten verbraucht, und den Rohereignisstrom für Audit und Diagnose. Der Rohstrom wird nicht committet und bildet keinen Modellkontext.
- Blockieren ist ein normaler Ausgang, kein Fehler. Ein blockierter Zustand trägt Blocker-Kennung, Grund, Evidenz, Auflösungsbedingung und Resume-Ziel.
- Ein unterbrochener Baulauf wird nie automatisch neu gestartet.
- Kein stiller Modell-Fallback.
- Logging bleibt lokal. Kein externer Monitoring-Dienst.

### Kommentar-Standard
Siehe `docs/kommentar-standard.md`.

### Test-Werkzeug
`node:test`. Lint über Biome, Typprüfung über `tsc`. Kein zusätzliches Test-Framework und kein zusätzliches MCP-Werkzeug ohne vorherigen Lauf des Skills `werkzeug-auswahl`; das Ergebnis gehört nach `state/tooling.md`, auch wenn es negativ ausfällt.

### Verbotene Patterns
| Pattern | Warum verboten | Ausnahme |
|---|---|---|
| Pauschales Stagen des Arbeitsbaums | Ein Commit stagt ausschließlich explizit benannte Pfade | keine |
| Datenbank als führender Zustandsspeicher | Dateien und Git führen; ein Index ist wegwerfbar | keine |
| Kontrollzustand als Markdown unter `state/` | `state/` ist Gedächtnis des Harness; Kontrollzustand ist JSON/JSONL unter `kontrollzustand/` | keine |
| Überschreiben eines persistierten Artefakts | Inhaltsadressiert — neue Version statt Mutation | keine |
| Freigabeartefakt durch den Kern erzeugen | Autorisierung entsteht nur aus direkter menschlicher Eingabe | keine |
| Aufrufparameter, die eine Schutzschicht abwählen | Der Kern ruft nie in einer Form auf, die Schutz abschaltet | Rolle `jarvis`, ausschließlich `--setting-sources` statt `project` (lesender Werkzeugsatz — Bash/Edit/Write-Guards sind für diese Rolle strukturell wirkungslos), Stefan 20.09.2026, `docs/projekt/zielfassung.md` §9.1 Nachtrag |
| CRLF in Dateien, die der Kern schreibt | Der Hash beschreibt die Bytes auf der Platte; der Kern schreibt ausnahmslos LF | keine |
| Laufergebnis aus Konsolentext ableiten | Beobachtbarkeit ausschließlich aus strukturierter Laufausgabe | keine |
| Zwei gleichzeitig aktive Arbeitsstränge | Genau ein aktiver Arbeitsstrang; keine Sperren, kein paralleler Zustand | keine |
| `any` | Die Typprüfung ist Teil der Definition of Done | begründeter Einzelfall mit Kommentar nach `docs/kommentar-standard.md` |

### Definition of Done
Siehe `CLAUDE.md`. Projektspezifische Ergänzungen hier.

Projektspezifisch zusätzlich:
- Jede Änderung am Kontrollzustand ist über den Checkpoint Store gelaufen; die Hash-Kette ist append-only geblieben.
- Eine neu behauptete Grenze trägt ihren Durchsetzungsgrad. Ohne kalibrierten Rot- und Grün-Fall wird sie nicht `ERZWUNGEN` genannt.
- Neu entstandene Rohereignisströme sind gitignoriert.

Entschiedene ADRs: siehe den bindenden ADR-Block in diesem Auftrag.

Ordnerübersicht (versionierte Dateien):
- Wurzel: .claudeignore, .gitattributes, .gitignore, .worktreeinclude, ARCHITECTURE.md, CLAUDE.md, LICENSE, README.md, SETUP.md, START-KLEIN.md, biome.json, hallo.txt, package-lock.json, package.json, projekte.json (+2 weitere)
- .claude/ (20 Dateien): agents, commands, hooks, skills
- .githooks/ (1 Dateien)
- .github/ (1 Dateien): workflows
- Claude outputs/ (3 Dateien)
- claude/ (2 Dateien)
- docs/ (161 Dateien): adr, design, examples, guide, harness, onboarding, projekt
- features/ (3161 Dateien): AF-F001, F0, F1, F10, F11, F12, F13, F14, F15, F16, F17, F18 (+36 weitere)
- harness-abgleich/ (1 Dateien)
- kontrollzustand/ (1361 Dateien): 0f5a8206-5802-4cbe-a625-a0f98b903560, 1c971e35-455c-4167-8b63-0a9a8181255c, 1d3ecda0-fb91-4d3f-9fb4-83100b8a51c9, 29e2be19-d3c8-4f81-8b93-1fa9fdb63132, 2d67e04e-d8a4-4943-8333-ed60d033105c, 2dc39905-0365-44d9-ab9f-8d4f3a151cb1, 39b9288c-b7e2-4f64-942e-c13ed54ff0d2, 4b3ebc42-91df-422b-9dd4-b2fc02dc4151, 4efa5d7f-3c9d-483c-a05c-28fd3ed3b1b1, 5869ddcd-966f-41e3-9042-f2d90c2c05db, 6319443a-8309-4bd1-aff4-91ec60756224, 635dbad1-9ed8-4489-8386-12590d180cb0 (+923 weitere)
- nachweis/ (7 Dateien): ws3b, ws4
- profiles/ (3 Dateien)
- public/ (153 Dateien): leitstand
- schemas/ (181 Dateien): examples
- scripts/ (161 Dateien): leitstand
- specs/ (3 Dateien): AF-F001, F0
- src/ (144 Dateien): aenderungsuebersicht, ak-pruefung, arbeitsordner, architecture-advisor, architekt, auftrag, ausfuehrung-vorbedingung, authorization-boundary, capabilities-ansicht, checkpoint-store, claude-code-gateway, codex-gateway (+28 weitere)
- startvorlagen/ (3 Dateien)
- state/ (134 Dateien): tasks, zwischenstand
- vorlagen/ (53 Dateien): projekt-skelett
- workflow-vorlagen/ (3 Dateien)

## Ausführungsrahmen
Gilt für den späteren Bauschritt; der Kern erzwingt ihn.
- Werkzeuge: Read, Grep, Glob, Write, Edit
- Shell: nur npm install, npm ci, npm run check|lint|typecheck|test|build (bei 'npm run' auch Unterskripte wie 'npm run check:<name>'); genau ein Befehl je Aufruf, keine Verkettung (&&, ;, |), keine Umleitung, kein 'cd', kein 'node' direkt, keine Server.
- Neue Pakete nur über package.json und danach 'npm install' ohne Argumente.
- Kein git — die Änderungen erhebt die Workforce, Commits macht der Mensch.
- Nichts im Hintergrund (run_in_background) — ein Hintergrund-Aufruf macht den Lauf FEHLGESCHLAGEN.
- npm-Installationsskripte sind aus (npm_config_ignore_scripts).
- Schreiben nur im Projektordner.
- Löschen: nicht vorgesehen (kein eigener Arbeitsordner).
- Zeitgrenze je Shell-Befehl: 20 min.
- Prüfbefehl: npm run check — führt der Kern nach dem Bau selbst aus.
Plane keinen Schritt außerhalb dieses Rahmens. Braucht der Auftrag einen, lege ihn als Eintrag in 'entscheidungen_mensch' vor (kategorie 'sonstig', Frage beginnt mit 'Ausführungsrahmen:') oder setze in 'capabilities_bedarf' status 'fehlt'.

## Im Projekt eingeschaltete Fähigkeiten
- mcp: Playwright MCP (Katalog)
- skill: frontend-design (Katalog)
Welche Katalog-Fähigkeiten der Bau tatsächlich bekommt, legt die Empfehlung beim Start fest; Bedarf darüber hinaus über 'capabilities_bedarf' (Capability-Auszug).

## Qualität
Definition of Done (CLAUDE.md):
- Komponenten/Module sind wiederverwendbar
- Typisiert, kein `any` (oder Sprachäquivalent)
- Fehlerzustände berücksichtigt (catch + Logging)
- Leere Zustände berücksichtigt
- (nur UI) Lange Texte zerstören das Layout nicht
- (nur UI) Mobile Darstellung berücksichtigt; jeder Container mit max-width hat auch width: 100%
- (nur UI) Design bleibt treu (Design-Tokens, keine neuen Farben/Schatten ohne Freigabe)
- Code ist sinnvoll kommentiert (Datei-Header + Funktionsdoku, siehe `docs/kommentar-standard.md`)
- `npm run check` → Exit 0
- Reviewer-/QA-Pass (Subagenten `code-reviewer` + `qa`, frischer Kontext) vor Freigabe/Commit durchlaufen — nicht optional, nicht retroactiv nachgeholt (F-046)
- (nur UI) UI-Workstreams liefern vor Übergabe an Stefan einen Render-Nachweis per `npm run render-nachweis` (Screenshots + Klicktabelle) — ein Reviewer-/QA-Pass allein findet keine real nur im Browser sichtbaren Fehler wie eine überschriebene `[hidden]`-Regel oder eine fehlende `classList`-Mutation (F-622)
- KEINE Commits ohne explizite Freigabe
Prüfbefehl: npm run check.

===

Pfad: artefakt:auftrag-0eb3a5b8-3e3d-472b-926d-474221964a48
Frage: Auftragsbezug dieses Laufs
Begründung: Lineage-Verweis auf den Auftrag (E-M2-4, AK5)
Inhalt:
{"auftrag_id":"0eb3a5b8-3e3d-472b-926d-474221964a48","auftrag_schema":"v0","auftragstext":"Plane eine kleine Erweiterung: ein neues Gate soll prüfen, dass die Projektkarte (src/projektkarte) für jede Rolle höchstens die im Zuschnitt erlaubte Zeichenzahl hat, und in die Prüfkette aufgenommen werden. Nur Architekturentwurf, kein Code.","erstellt_am":"2026-10-13T11:01:27.008Z","titel":"Nachweis B2a-1: Gate für die Abschnittszahl der Projektkarte"}
