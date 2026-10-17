<!--
[FÜLLUNG — GANZE DATEI] ARCHITECTURE.md ist Füllung, nicht Skelett: Die
Abschnittsstruktur unten hat sich in der Praxis bewährt, der Inhalt jedes
Abschnitts ist stackgebunden und entsteht in deinem Projekt neu.

Fülle sie erst, wenn du deine erste echte Architekturentscheidung getroffen
hast — vorher stehen hier Regeln, die nie geprüft wurden.

Aufteilungsregel: Ein Abschnitt wird eine eigene Datei, wenn drei Dinge
zutreffen — er trägt mindestens drei echte, belegte Entscheidungen · er
wird unabhängig vom Rest nachgeschlagen · er hat ein eigenes Gate. Vorher
bleibt er ein Abschnitt.

Bei jeder Abspaltung gelten zwei Pflichten: ein memory-map-Eintrag mit
„nicht hierhin"-Spalte, und ein Rückverweis aus ARCHITECTURE.md, damit
Prüfung 1 des Doku-Gates den Verfall fängt. `CLAUDE.md` muss danach sagen,
WANN welche Datei zu lesen ist, nicht nur DASS es sie gibt.
-->

# ARCHITECTURE.md — AI Workforce

Pflichtlektüre vor jedem Commit. Verbindliche Code-Konventionen.

## 1. Ordnerstruktur

- `src/` — Kern-Code der AI Workforce. Einziger Produktpfad. `src/projektkarte/` (F45 B2a-1) baut je Lauf deterministisch die Projektkarte (Vorhaben, Bestand, Ausführungsrahmen, eingeschaltete Fähigkeiten, Qualität) mit Zuschnitt je Rolle für Architekt, Architecture-Advisor und Code-Reviewer — rein, ohne I/O; die Eingaben liest der Server über die bestehenden Lesepfade, Hash und Abschnitte stehen in der Laufakte (`projektkarte`). Dieselbe Regel (`analysiereArchitektur`) entscheidet, ob diese Datei beschrieben ist (Regel 1h, F-1066). Das Arbeitspaket (F45 B2a-2) ist kein eigener Artefakttyp, sondern der Auftrag v0 aus `src/auftrag/` mit additiven Feldern (Bereiche, Risiko, Feature-Bezug, Einrichtung durch Stefan); `baueArbeitspaketBlock` ist die einzige Textquelle für Architekt und Ausführung, neue Versionen (Einrichtung übernommen oder abgehakt) entstehen nur über `registriereAuftrag`. Der Code-Reviewer liest CLAUDE.md und ARCHITECTURE.md im Stand vor dem Bau (Basis-Commit, `git show`). `src/review-policy/` (F45 B2a-3a, Codex-Review-Spec `docs/projekt/codex-review-spec.md`) ist die einzige Quelle der versionierten Review-Policy im Auftrag jedes code-reviewer-Schritts (Codex und Claude gleich, Version in der Laufakte `review.policy_version`) und prüft das Ergebnis gegen den Ausgabevertrag; nur leere Befunde ohne den Pflichtsatz halten an (Regel 1k), alles andere wird sichtbar, nicht still. `src/review-stand/` (F45 B2a-3b, Spec §9.6) hält den geprüften Stand des Reviews fest: ein Inhalts-Fingerabdruck `{ commit, inhalt }` des Laufordners beim Start jedes code-reviewer-Schritts (Laufakte `review.geprueft_stand`, sonst null mit `stand_grund`); die Abnahme vergleicht ihn bei offener Abnahme mit dem aktuellen Stand und zeigt „Review veraltet“ — „veraltet“ nur über `inhalt`, ein Commit derselben Inhalte zählt nicht. `src/claude-plugins/` (F45 F-3a-1) liest Stefans in Claude Code installierte Plugins (Liste aus `claude plugin list --json`, Bestandteile, Inhalts-Hash und Risiken als Fakten aus dem Plugin-Ordner) für GET `/api/plugins` — reine Anzeige; kein Lauf importiert das Modul, `init.plugins` bleibt `[]` bis F-3b. `src/plugin-kopie/` (F45 F-3b-1) projiziert ein Plugin rein auf die gefilterte Kopie (Positivliste, Grenzen des Prüflaufs, `kopie_hash`), schreibt sie bei der Freigabe und bestimmt den Freigabe-Zustand (veraltet, Kopie verändert, …); geprüft wird sie über den bestehenden Prüflauf der Rolle `eignungspruefung` (Quelle `art: plugin`). `src/plugin-lauf/` (F45 F-3b-2) ist der einzige Weg eines Plugins in den Lauf: Zuordnung der Rolle und Kennungen („Anzeige = Start“), Prüfung vor jedem Lauf (Freigabe gültig, Quelle = `kopie_hash`, gepinnte Kopie = Prüfbericht), Lauf-Kopie mit nur den zugeordneten Teilen und Vorher/Nachher des Plugin-Datenordners; nur dieses Modul importiert `src/plugin-kopie` auf dem Startweg (Gate f45-f3b1 (f): kein Import in Gateway, Fähigkeiten-Start, Controller, Ort-B-Start). Gateway, Fähigkeiten-Start und Controller kennen nur Namen, Ordner und Rückrufe. `src/budget/` (F45 B2b-3c, F-981) ist die reine Regel des Budgets je Arbeitspaket (Tokens über alle Läufe eines Ablaufs, Default je Kontrolltiefe, `wendeBudgetAn` macht aus einem fortsetzenden Ausgang des Automaten den Budget-Halt); `scripts/leitstand/budget-stand.mjs` liest dazu synchron Versionen und Laufakten (Zwischenspeicher nur für die GET-Anzeigen). „Budget erhöhen“ ist ein weiterer Weg zu einer neuen Auftragsversion über `registriereAuftrag` (`budget_tokens`), kein Workflow-Schreiber. Durchsetzungsgrad DEKLARIERT: fail-open, geprüft nach dem Schritt. `src/umfang/` (F45 B2b-3d, F-978) gleicht die von der Ausführung berührten Dateien rein per Präfix (Ordner/Module, `/` und Backslash gleich, Ausnahme-Pfade wie `istAusnahmePfad`) gegen die `bereiche` des Arbeitspakets ab; `scripts/leitstand/umfang-stand.mjs` hält das Ergebnis im Nachlauf als Feld `umfang` der Änderungsübersicht fest (kein neuer Artefakttyp, kein Workflow-Schreiber; ein Formfehler lässt nur das Feld weg, degradierte Übersicht ⇒ kein Feld) und liefert Projektion und Zeile für Review und qa. Nur ein Hinweis (Abnahme, Auftrag von Review und qa), nie ein Halt — Durchsetzungsgrad DEKLARIERT. `src/rueckfrage/` (F45 B2b-3b-1a) ist die reine Regel des Rückfrage-Kanals im Lauf: `vorentscheidung` (nur ein Bash-Befehl geht an Stefan, alles andere wird automatisch abgelehnt), `liegtImArbeitsordner` (Pfadgrenze, fail closed) und der Argv-Baustein `ergaenzeRueckfrageAufruf` (ohne Kanal dasselbe Objekt), dazu (B2b-3b-1b) in `protokoll.ts` Schema-Prüfung, Neutralisierung und Abgleich des Rückfrage-Protokolls (Kern-Artefakt `rueckfragen-<laufId>`, geschrieben von `scripts/leitstand/rueckfrage-protokoll.mjs`, ausgewertet nach §4); Vermittlung und Routen liegen in `scripts/leitstand/rueckfrage-vermittlung.mjs` und im Server, das MCP-Skript in `scripts/leitstand/rueckfrage-mcp.mjs` (Kanal siehe §3).
- `kontrollzustand/` — Kontrollzustand als JSON/JSONL: Checkpoints, Wirkungsmarken, Artefakt- und Lineage-Einträge, Transportpakete, wegwerfbarer Index. Kein Markdown.
- `profiles/` — Profilkonfiguration als JSON. Ein-Ebenen-Modell: je Projekt genau eine vollständige, eigenständige Profildatei; kein Domänen-Profil mit Projekt-Overlay.
- `startvorlagen/` — Startvorlagen als JSON (F11 WS-2): die maschinenkonstanten Startfelder eines Leitstand-Startauftrags (Startziel, Werkzeugversion, Berechtigungskontext, Profilverweis, Modell, Standard-Budget) und benannte Werkzeugsätze. Eigener Ordner statt `profiles/`, damit die bestehende Ein-Ebenen-Profilvalidierung (`scripts/check-datenformate.mjs`) nicht bricht — eine Startvorlage ist kein Profil. Projektspezifische Prüfkonfiguration liegt ebenfalls in der Startvorlage: pruefbefehl (F-652) und pruefketten_pfade (F-735, ergänzt die Default-Liste der Regel 1j). Der Werkzeugsatz 'schreibend' trägt eine Bash-Allowlist für Paket- und Prüfbefehle (E-F754, docs/adr/ausfuehrung-bash-allowlist.md); nacktes Bash und git-Befehle weist der Validator ab.
- `harness-abgleich/` — versionierte Zuordnung des Projekt-Harness (F45 B1b-2, Beleg 12): `standard.json` ordnet jeden DoD-Punkt aus CLAUDE.md, jeden Hook, Agent, Skill und Command `wirksam` (mit Beleg), `ersetzt_durch` (Workflow-Schritt) oder `bewusst_nicht` (Begründung) zu; Schema `schemas/harness-zuordnung.schema.json`, je Projekt über `harnessZuordnungPfad` der Startvorlage ergänzbar. Gehört zur Installation, nicht zum Projekt; der Kern liest sie nur (`src/harness-abgleich/`). Das Ergebnis je Workflow ist Kontrollzustand (`harness-abgleich-<workflowId>`), nicht diese Datei.
- `state/` — Gedächtnis des Harness. Trägt keinen Kontrollzustand der Workforce.
- `scripts/` — Prüf- und Hilfsskripte des Harness. Die Rückweg-Regel der Kette (F45 B2b-1a) steht als reine Funktion in `scripts/leitstand/f35-ws3-adjust-automatik.mjs` (`pruefeRueckweg`): höchstens ein automatischer Rückweg je Stufe, zusammen höchstens `grenzen.max_replans`, sofortiger Halt bei denselben Befunden; „Prüfer wiederholen“ setzt nur einen Prüfschritt in einer neuen Workflow-Version zurück und zählt nicht als Rückweg. Was schreibt, bleibt im Server (Zählung der Workflow-Schreiber, F-228). Wachstumsbremse (F45 W1, E-WART-1, F-371): `scripts/leitstand-server.mjs` wächst nicht — seine Zeilenzahl ist gleich der Grenze in `scripts/wachstumsbremse-server.json`, Grenze und Routen-Bestand dürfen gegenüber main nur sinken, neue Routen dispatchen in `scripts/leitstand/routen-*.mjs` (diese Regel kollidiert heute mit `check-f813-csrf` (4), das in `scripts/leitstand/*.mjs` keine Methodenweiche `.method` zulässt — das Muster für Routen-Module mit Methodenweiche und CSRF-Haken wird in W2 festgelegt, bis dahin entstehen keine neuen Routen, F-1131); schreibende Aufrufe (Workflow-Schreiber, `starteWorkflowSchritt(`) bleiben im Server und werden dem Modul als Rückruf übergeben; Server-Zeilen eines Pakets werden bis W2 durch Auslagern reiner, nicht schreibender Helfer nach `scripts/leitstand/*.mjs` ausgeglichen. Durchsetzungsgrad: ERZWUNGEN für die Zeilenzahl und für Literal-/Regex-Dispatch an `pfad` (`==`/`===`/`!=`/`!==`, auch Backtick ohne `${`, `case`, `startsWith`, `endsWith`, Regex vor `.exec`/`.test` oder in `pfad.match`; Gate `check-wachstumsbremse-server`), der Vergleich mit main ((a2)/(b2): Grenze angehoben, Bestand erweitert) bei lesbarer Referenz — in der CI (checkout mit `fetch-depth: 0`, merge-base mit `origin/main`), lokal und beim Challenger im vollen Clone; ohne Referenz (Kopie ohne git, flacher Clone) meldet das Gate „(a2)/(b2) nicht geprüft“. DEKLARIERT für Dispatch über andere Variablen oder Konstanten, `['/…'].includes(pfad)`, Kombination vorhandener Literale, neue Methoden auf bestehenden Pfaden, den Multi-Projekt-Dispatcher, Literale in Kommentaren hinter Code oder in Zeilen, die mit einem Kommentar beginnen, und das Bearbeiten von Gate oder JSON.
- `docs/projekt/` — führende Projektdokumente: `docs/projekt/zielfassung.md` (Sollquelle für Zielbild, Rollen, Lifecycle, Sicherheits- und Evidenzmodell, Architektur-Baseline), `docs/projekt/umsetzungsplan-fassung-1.md` (Deliverables, Feature-Reihenfolge, Backlog). `docs/projekt/kontext/` (Beschreibung, Anweisungen) und `docs/projekt/roadmap.json` (F33, `schemas/roadmap.schema.json`) sind zusätzlich der über den Context Builder eingespeiste Projektkontext für die Rollen `jarvis`/`router` — je Projekt-Repo eigenständig (E-M4-2), kein zweiter Speicher.
- `schemas/` — JSON-Schema (Draft 2020-12) für die Datenformate unter `kontrollzustand/` und `profiles/`, mit Beispielen unter `schemas/examples/`. Geprüft von `scripts/check-datenformate.mjs`. Dazu die Rollen-Ergebnisschemata (`ergebnis-*.schema.json`), geprüft von den Feature-Gates ihrer Rolle. Der Advisor antwortet nach `ergebnis-architecture-advisor.schema.json` (F45 B2b-1b, Gate `check-f45-b2b1-rueckweg` (c0)); claude-code löst ein Ausgabeschema per `--json-schema` nur für Schemata ein, die ein echter Lauf belegt hat (Regel 4b in `src/workflow`, `CLAUDE_CODE_AUSGABESCHEMAS`); `$schema`/`$id` entfernt `src/claude-code-gateway` zur Laufzeit (`baueClaudeJsonSchema`). Bei FREIGEGEBEN_MIT_AUFLAGEN/UEBERARBEITEN schreibt der Architekt einmal Plan v2 (F45 B2b-1b-2a): die Rückweg-Regel lebt rein in `scripts/leitstand/f35-ws3-adjust-automatik.mjs` (`ermittlePlanRueckweg`), der Sprung über den gelaufenen Advisor in `src/workflow` (Regel 3a), geschrieben wird im Nachlauf des Advisors im selben Schreibvorgang.

Bezeugungen menschlicher Freigaben liegen **außerhalb** dieses Repositoriums, in einem eigenen Git-Repository des Kerns. Rohereignisströme sind gitignoriert und werden aus der Laufakte über ihren Hash referenziert.

## 2. Datenzugriff

- Dateien und Git sind der führende Zustand. Keine Datenbank als führender Zustandsspeicher; ein Index ist wegwerfbar und jederzeit neu erzeugbar.
- Schreibend auf `kontrollzustand/` greift ausschließlich der Kern zu, und nur über die append-only Hash-Kette des Checkpoint Store. Kein Commit pro Zustandsübergang — der Kontrollzustand ist Momentaufnahme im Metadaten-Commit.
- Einzige Ausnahme: `kontrollzustand/.leitstand.lock`, der Instanz-Lock des Leitstand-Prozesses (F-201). Flüchtiger Betriebszustand mit PID, Port und Startzeit — kein Artefakt, keine Lineage, keine Hash-Kette, git-ignoriert, vom Leitstand nur im CLI-Bindeblock vor dem Binden angelegt und beim Prozessende entfernt. Er liegt hier, weil er genau diese Ressource schützt: zwei Serverprozesse auf demselben `kontrollzustand/`. Jede weitere Ausnahme braucht denselben Weg — erst hier, dann im Code.
- Weitere Ausnahme (F45 F-1, E-F45-8): `~/.ai-workforce/faehigkeiten.lokal.json` — Aktivierung und Freigaben nach Inhalt
  der Fähigkeiten je Projekt (Schema `schemas/faehigkeiten-lokal.schema.json`). Liegt außerhalb jedes Repos und jedes
  Arbeitsordners, damit kein Lauf sich selbst etwas freigibt; geschrieben nur von den POST-Routen
  `/api/projekte/<id>/faehigkeiten/…` und — seit F45 F-3b-1 — `…/plugins/freigabe`, `…/plugins/freigabe/ruecknahme` und
  `…/plugins/zuordnung` (unpräfigiert oder `/api/projekte/<id>/…`) auf direkte Eingabe (gesperrt, solange ein Lauf aktiv ist), vorher/nachher je
  Lauf gehasht (Abweichung = Lauf rot). Kein Kontrollzustand, keine Hash-Kette; ungültig sperrt jeden Start mit
  Katalog-Fähigkeiten (E-F45-7). Eine Änderung, die nicht über diese Routen kam, gilt erst nach ausdrücklicher Bestätigung
  im Leitstand (POST `/api/projekte/<id>/faehigkeiten/bestaetigung`, „Datei geprüft – Stand übernehmen“, Laufsperre wie die
  anderen Routen); bis dahin sperren die Schreib-Routen und jeder Start mit Katalog-Fähigkeiten (F-1061, Entscheidung
  Stefan 12.10.2026).
  Seit F45 F-3b-1 trägt die Datei additiv oben `plugin_freigaben` (Freigabe je Plugin aus Stefans Claude Code, gebunden an
  den Hash der gefilterten Kopie und an genau einen Prüfbericht — gilt für den Inhalt, nicht je Projekt) und je Projekt
  `plugin_zuordnung` (Plugin-Skills/-Agents je Rolle, Standard leer, zuordenbar nur `ausfuehrung`, E-F3b-3). Ein Checkout
  ohne F-3b-1 hält die Datei mit diesen Feldern für ungültig (sichtbar, fail-closed). Die Freigabe gilt nur im Checkout,
  dessen Kontrollzustand den Prüfbericht trägt (sonst „Bericht fehlt“).
- Weitere Ausnahme (F45 F-3b-1, E-F3b-4): `~/.ai-workforce/plugin-kopien/<plugin-id>/<kopie_hash>/` — die gefilterte, gepinnte
  Kopie eines Plugins aus Stefans Claude Code (nur `skills/`, `agents/`, `commands/` nach Positivliste, Manifest neu; nie Hooks,
  MCP, LSP; `src/plugin-kopie`). Inhaltsadressiert, nie überschrieben (Ziel mit anderem Inhalt = 409 „Kopie verändert“),
  geschrieben nur von POST `…/plugins/freigabe` nach geltendem Prüfbericht (Temp-Geschwister + `rename`), gelöscht nur durch
  Stefan. Die Wurzel setzt nur der CLI-Bindeblock (im Handler Standard `null`; überschreibbar mit der Umgebungsvariablen
  `LEITSTAND_PLUGIN_KOPIEN_WURZEL`, etwa für eine Testinstanz). Alle Instanzen projizieren gegen denselben Werkzeugsatz
  `schreibend` (den der Workforce-Startvorlage, Option `pluginWerkzeugsatz`), damit `kopie_hash` und Freigabe nicht je Projekt
  verschieden ausfallen; ein gesetztes `null` heißt „Werkzeugsatz unbekannt“ (kein Rückfall auf die eigene Startvorlage, Agents nicht
  übernommen, Fakt sichtbar). Prüfläufe startet nur die Workforce-Instanz. Kein Kontrollzustand.
- Weitere Ausnahme (F45 F-3b-2): `~/.ai-workforce/plugin-kopien/_lauf/<lauf_kopie_hash>/` — die Lauf-Kopie eines Ausführungslaufs
  (`src/plugin-lauf`): Manifest, Lizenzdateien und nur die der Rolle zugeordneten Skills/Agents aus der gepinnten Kopie, aus den
  gegen den Prüfbericht geprüften Bytes geschrieben; Ordnername = Hash, inhaltsadressiert (vorhanden mit gleichem Inhalt →
  wiederverwendet, anders → Lauf startet nicht), außerhalb jedes Arbeitsordners, geschrieben nur vom Startweg eines
  Ausführungsschritts mit angezeigter Plugin-Zuordnung, nie gelöscht (Stefan). `_` ist kein gültiger Anfang einer Plugin-id — keine
  Kollision mit `<plugin-id>/`. Der Lauf lädt sie per `--plugin-dir`, `enabledPlugins["<name>@inline"] = true`.
- Weitere Ausnahme (F45 F-2b-2c, F-1061 (1)): `~/.ai-workforce/faehigkeiten.stand.json` (immer im Ordner der lokalen
  Datei) — der zuletzt bekannte Stand (Pfad, Hash, Zeitpunkt, Quelle) der lokalen Fähigkeiten-Datei, damit eine
  Änderung bei gestopptem Leitstand sichtbar bleibt. Geschrieben atomar (tmp + rename, LF) nur vom Wächter des Leitstands nach
  einem Schreiben über die Fähigkeiten-Routen und nach einer Bestätigung; gelesen nur beim Serverstart. Kein Kontrollzustand und
  kein Kern-Artefakt: Laufzeitstand eines Rechners, für alle Checkouts derselbe, nicht im getrackten `kontrollzustand/`
  (Advisor-Pass F-2b-2c A4). Startregel fail-closed: weicht der Hash ab, fehlt der Stand, ist er beschädigt oder gehört er zu
  einem anderen Pfad, gilt die Datei als außerhalb geändert (gesperrt bis zur Bestätigung) — nur wenn die lokale Datei fehlt,
  ist nichts zu bestätigen. Schutz gegen einen Prozess mit Nutzerrechten ist sie nicht (er kann beide Dateien ändern).
- `profiles/` ist die alleinige editierbare Quelle für Profilinhalte. Der Kontrollzustand hält davon nur eine gepinnte Referenz aus Pfad, Hash und Version, nie eine Kopie.
- Artefakte werden versioniert, nicht überschrieben. Version ist der Inhalts-Hash; die einzige Stelle, die den aktuellen Stand benennt, ist der letzte Checkpoint.
- Produktdateien im freigegebenen Baupfad ändert ausschließlich das Ausführungswerkzeug. Der Kern liest sie read-only.
  Einzige Ausnahme: der Arbeitsordner je Ablauf (E-F45-3 = A, F45 B1a-1, `src/arbeitsordner/`). Der Kern legt den
  Git-Worktree eines schreibenden Ablaufs ausschließlich über git an und entfernt ihn ebenso (Git-Starter), führt
  darin `npm ci --ignore-scripts` aus und löscht nach einem Lauf der Rolle `ausfuehrung` ausschließlich geprüfte
  reguläre Dateien aus dessen Löschliste — nur innerhalb des Arbeitsordners, nie unter `.git`, `.claude/` oder
  `kontrollzustand/`. Im Projektordner selbst bleibt der Kern lesend.
- Lesender Fingerabdruck (F45 B2a-3b, `src/review-stand`): nur Git-Plumbing mit `--no-optional-locks` (`rev-parse`,
  `ls-tree`, `diff-index`, `ls-files --others`, `check-attr`, `hash-object --stdin-paths` OHNE `-w`), nie `git status`,
  `update-index` oder `write-tree` — der Index wird nicht geschrieben und in `.git/objects` entsteht nichts (Gate
  f45-b2a3b (a) misst beides je Aufruf). Ausnahmen (`kontrollzustand/` u. a.) fallen in JS weg (`istAusnahmePfad`), nicht
  per Pathspec. Gesetzter Filter-Treiber (z. B. LFS) → nicht bestimmbar statt eines fremden Programms im Leitstand.
- Stefans Claude-Code-Bestand (`CLAUDE_CONFIG_DIR` bzw. `~/.claude`, F45 F-3a-1, `src/claude-plugins`) liest der Leitstand nur
  lesend: die Liste über `claude plugin list --json` (Startziel der Startvorlage, unverändertes `starteProzess`), die
  Plugin-Ordner und die Liste installed_plugins.json im Plugin-Ordner der CLI per readFile/readdir/lstat. Unser Code schreibt dort nie (Gate f45-f3a (b)).
  Die CLI selbst legt beim Listen in `.in_use/` der synced-Plugins eine Marke an und löscht sie wieder — gemessen und von Stefan
  als Nebenwirkung angenommen (E-F3a-1, `features/F45/nachweise/f3a/spike.md`).
  Ein Lauf mit Plugin-Lauf-Kopie (F45 F-3b-2) kann über die CLI den Datenordner `plugins/data/<name>-inline` anlegen (Auslöser
  laut Spike `features/F45/nachweise/f3b2/spike.md` S6: Hooks, MCP, `CLAUDE_PLUGIN_DATA` im Text — die Kopie übernimmt keinen davon).
  Der Controller erfasst `plugins/data` vor und nach dem Lauf nur lesend (Liste, mtime, Größe); eine Abweichung ist ein Befund in
  der Laufakte, kein Abbruch (Variante A, Challenger 14.10.2026). Unser Code schreibt dort weiterhin nie.
- Pauschales Stagen ist in allen Git-Schritten ausgeschlossen.

## 3. Auth

Kein Mehrbenutzerbetrieb, keine Anmeldung. Was hier geschützt wird, ist die Autorisierung, und sie trägt zwei voneinander unabhängige Schichten:

1. **Authorization Boundary** — Bezeugungen menschlicher Freigaben liegen außerhalb der Schreibreichweite des Ausführungswerkzeugs, in einem eigenen Git-Repository. Der Checkpoint trägt Referenz und Hash; validiert wird immer gegen den geschützten Ort, nie gegen die Referenz allein. Eine im Produkt-Repository sichtbare Kopie ist niemals alleinige Autoritätsquelle.
2. **Invocation Policy / Protection Validator** — vor jeder Execution mit Schreibwirkung, lokal und ohne Werkzeugaufruf: ist die Werkzeugkonfiguration gültig und existiert jedes von ihr referenzierte Schutzskript mit dem erwarteten Hash, und liegt ein gültiger Wirksamkeitsnachweis für den Gültigkeitsschlüssel vor. Scheitert eine der beiden Prüfungen, startet keine Execution.

Der Kern erzeugt niemals ein Freigabeartefakt. Autorisierungen entstehen ausschließlich aus direkter menschlicher Eingabe.

Ein Pflichtdokument, das nur eine der beiden Schichten kennt, kann versehentlich unterlaufen werden — deshalb stehen beide hier.

**Rückfrage-Kanal im Lauf** (F45 B2b-3b-1a, E-B2b-3-1 = A, Spike `features/F45/nachweise/b2b3a/spike.md`). Ein
Ausführungslauf kann über einen je Lauf mitgegebenen stdio-MCP-Server (`--permission-prompt-tool
mcp__rueckfrage__rechte_pruefen`, Werkzeug `frage_stefan`) Stefan einen Bash-Befehl außerhalb der Allowlist vorlegen oder
eine Entscheidungsfrage stellen. Der Kanal ist **Opt-in** (F45 B2b-3b-2b-2a-1): nur mit `LEITSTAND_RUECKFRAGE=1` (genau
dieser Wert) setzen CLI-Bindeblock und `baueProjektHandlerMap` die Handler-Option `rueckfrage`, und nur über
`rueckfrageOptionFuer` (`scripts/leitstand/rueckfrage-einschalten.mjs`); ohne die Variable bleibt das Argv aller Läufe
bitgleich, und die Konsole meldet beim Start „Rückfrage-Kanal: an/aus“ — ERZWUNGEN am Quelltext (gemeinsame Regel
`scripts/_rueckfrage-aus-pruefung.mjs` in vier Gates) und funktional (Gate f45-b2b3b2b2a-einschalten (o1)(o2)). Die url ist die
API-Basis der Instanz — Workforce `http://<Loopback>:<PORT>/api`, Projekt `…/api/projekte/<id>`; das MCP-Skript hängt
`/rueckfrage/anfrage…` an, der Multi-Projekt-Dispatcher leitet an die Instanz weiter (Gate (d)); sie steht vor dem Binden fest,
Port 0 ⇒ Kanal aus. Jede Instanz hat ihre eigene Vermittlung, eine Rückfrage steht nur in der Liste ihrer Instanz; ein Token
einer anderen Instanz ⇒ 403 ⇒ Ablehnung. Mit Kanal bekommt der Ausführungsauftrag die Regelzeilen `RUECKFRAGE_REGEL`
(`src/rueckfrage`: Entscheidungen über `frage_stefan`, zuerst vor „- [x] Blockiert“; nicht freigegebene Bash-Befehle gehen an
Stefan; eine Ablehnung nicht umgehen) — unversioniert wie die cd-Regel, ohne Kanal bleibt der Auftragstext bitgleich. Seit
B2b-3b-2b-2a-3 (F-1132 (5), Entscheidung): weist das MCP-Skript eine Frage mit „Frage ungültig — nicht an Stefan gestellt“ zurück
(leer, zu lang, zu viele oder zu lange Optionen), stellt das Modell sie einmal korrigiert neu; wird auch sie zurückgewiesen, gilt das
wie „keine Antwort“ und damit der Hinweis zu „- [x] Blockiert“. Keine Regelzeile beginnt selbst mit „- [x]“ (Selbstblockade-Erkennung
der Korrekturschleife); Wortlaut und Vorrang per Test an `rueckfrage-mcp.mjs` gekoppelt.
**Anzeige** (F45 B2b-3b-2b-2a-2, Teil A Warteschlange): `GET /api/zustand` trägt `rueckfrageStatus` (`{ an: true, warteGrenzeMs }`
bzw. `{ an: false }`; den Ausschaltgrund nennt nur die Startzeile der Konsole); bei „an“ zeigt der Leitstand ein Band (mit wartenden
Rückfragen Anzahl, nächste Frist, Link) und zählt offene Rückfragen am Navigationspunkt „Entscheidungen“ mit.
`public/leitstand/rueckfrage-kanal.js` hängt am einen Poll (kein eigener Timer), fragt `GET …/rueckfragen` der Instanz des aktiven
Laufs (Register `GET /api/projekte`, `laufAktiv`; ohne Treffer `/api` nur für diesen Takt) und zeigt die Rückfragen als eigene Art
„kanal“ zuerst in „Deine Entscheidungen“ — getrennt von der Workflow-Rückfrage (F-689). Bash wörtlich und vollständig (je Zeile
nummeriert, Zeilen- und Zeichenzahl, keine Höhenbegrenzung), nur „Einmal erlauben“/„Ablehnen“; Frage mit Optionen und freier Antwort;
Restzeit bis zur Frist. Alles als Text (escaped); Steuer- und Formatzeichen (Cc, Cf, Cs, Zl, Zp) und die Markenzeichen ⟦ ⟧ selbst
erscheinen als Marke ⟦U+XXXX⟧ (im Befehl bleiben `\n`/`\t`, in der Frage `\n`, in Optionen nichts); NBSP und andere Zs,
Variationsselektoren und Homoglyphen bleiben unmaskiert, Emoji-Folgen mit Zero-Width-Joiner erscheinen dagegen mit Marke ⟦U+200D⟧
(sichere Richtung); eine Befehlszeile steht in Speicher-Reihenfolge (`unicode-bidi: bidi-override`, rechts-nach-links-Schrift wird nicht
umgeordnet), Frage und Optionen nicht (Grenze). Einziger Schreiber der Kanal-Gruppe ist rueckfrage-kanal.js
(Gate f21-ws2 (f-kanal)). `GET /api/rueckfragen` trägt zusätzlich `entschieden` — die letzten 20 Entscheidungen von
Warteschlangeneinträgen aller Läufe der Instanz (Ringpuffer im Speicher, nach Neustart leer, auch beendeter Läufe) mit `ergebnis`
und `herkunft`; Befehl und freie Antwort darin über `maskiereGeheimnisse` — wie die offene Liste ohne Token für jeden lokalen Prozess
lesbar (DEKLARIERT). „Zuletzt entschieden“ zeigt sie, `nicht_browser` als rote Marke „nicht aus dem Browser“; ohne aktiven Lauf
fragt der Leitstand die zuletzt benutzte Instanz (nach dem Neuladen der Seite `/api`), die Historie eines Projektlaufs ist dann
bis zum nächsten Lauf dort nicht sichtbar (Grenze). Keine neue Route
(F-1131); Gate f45-b2b3b2b2a2-anzeige. **Abnahme** (F45 B2b-3b-2b-2a-3): `GET /api/laeufe/<id>` trägt `rueckfrageKanal`
(aus `daten` der Terminalmarke, `scripts/leitstand/lauf-terminal-projektion.mjs`; `null` ohne Kanal). Das Lauf-Detail zeigt den Block
„Rückfrage-Kanal im Lauf“ (Antworten mit dem Hinweis, dass auch nicht bestätigte Ablehnungen mitzählen, davon von der Auswertung
bestätigte, unbeantwortete getrennt; alle null ⇒ „keine Rückfrage“, unterscheidbar von „kein Kanal“ = kein Block). Den Grund einer
Verweigerung ordnet `public/leitstand/rueckfrage-abnahme.js` einer Klasse zu (echt — `kein_eintrag`, `kein_protokoll`: der Standardsatz
bleibt; automatisch; Stefans Ablehnung nicht bestätigt; Protokoll unbrauchbar; nicht geprüft/E-186 nur im Block) und ersetzt bei einer
Kanal-Ursache den Standardsatz in der Lauf-Notiz und in der Sichtungs-Notiz des F-760-Halts (die Workflow-Seite holt das Lauf-Detail
dazu einmal je Lauf). R3 erscheint als eigene rote Meldung (dauerhaft, Text escaped, täuschende Zeichen maskiert); der Eintrag der
Startfehlerliste trägt `art: 'rueckfrage_abweichung'` und heißt in „Deine Entscheidungen“, „Als Nächstes“ und der Startfehler-Liste
„Protokoll-Abweichung“ mit Link zum Lauf (er darf den gefüllten Hauptknopf tragen; nur eine wartende Kanal-Rückfrage oben unterdrückt
ihn, E-Hauptknopf = A, Stefan 17.10.2026). Seit F45 B2b-3b-2b-2b-1 (E-R3-Sichtung = B, Stefan 17.10.2026) braucht „Sichtung bestätigt –
weiter“ bei R3 einen zweiten, ausdrücklichen Schritt („Protokoll-Abweichung ansehen“ zeigt den R3-Text escaped, erst dann „Abweichung gesehen
– Sichtung bestätigt – weiter“); ohne R3 bleibt es ein Klick — DEKLARIERT als Bedien-Hürde der Oberfläche, der Server prüft den zweiten
Schritt nicht (Gate f45-b2b3b2b2b1-nachweis (a)). Gate f45-b2b3b2b2a3-abnahme. **Nachweislauf** (F45 B2b-3b-2b-2b-1): Anleitung
`docs/harness/rueckfrage-nachweislauf.md` (zwei Läufe in einem Projekt), Auswertung nur lesend mit
`scripts/leitstand/nachweis-rueckfrage-auswerten.mjs` (je Prüfpunkt erfüllt / nicht erfüllt / nicht belegbar mit Fundstelle, CLI-abhängige Punkte bei einer anderen CLI-Version als deklariert „erfüllt mit Abweichung“ — E-F-1136 (1) = B; die mcp-config
eines Laufs ist nirgends gespeichert, url, `--permission-prompt-tool` und Werkzeugsatz sind deshalb nur indirekt belegt, Frist und timeout
DEKLARIERT; Gate f45-b2b3b2b2b1-nachweis (b)–(d)). Bis der Lauf gefahren und ausgewertet ist und 2b-2b-2 den Kanal einschaltet — **noch
nicht für echte Läufe nutzen** (außer dem Nachweislauf). Grenzen:
- Die Vorentscheidung liegt im Leitstand (`src/rueckfrage`), nicht in der CLI: mit „allow“ führte die CLI im Spike Write
  und Bash auch außerhalb des Arbeitsordners aus. Nur ein Bash-Befehl geht an Stefan (wörtlich angezeigt, nur „einmal
  erlauben“ oder „ablehnen“); Datei-Werkzeuge, Werkzeuge außerhalb des Werkzeugsatzes, Hintergrund-Ausführung,
  E-182-Verbotswerte und unbekannte Eingabefelder werden ohne Rückfrage abgelehnt, ebenso (F45 B2b-3b-2a, F-1126 (3)) ein
  Befehl mit Steuer- oder Formatzeichen (`\r`, ANSI, Bidi-Overrides, Null-Breiten; `\n`/`\t` erlaubt). Sperrregeln,
  Deny-Regeln und Hooks greifen vor dem Kanal (Spike Frage 3). Die Zeichenregel ist ERZWUNGEN (Gate f45-b2b3b2a-absicherung (z1)).
- Grenzen je Lauf (F45 B2b-3b-2a): höchstens 20 gleichzeitig offene Rückfragen (darüber automatisch abgelehnt, mit
  Protokolleintrag) und höchstens 200 Protokolleinträge einschließlich automatischer Ablehnungen (darüber abgelehnt ohne
  Eintrag; jede offene Rückfrage hält ihren Platz frei) — ERZWUNGEN (Gate f45-b2b3b2a-absicherung (o1)).
- **Token gibt kein Antwortrecht — ERZWUNGEN** (Gate f45-b2b3b1-rueckfrage (r2)(r3)): das Token je Lauf gilt nur zwischen
  Start und Ende des Laufs und nur für `POST /api/rueckfrage/anfrage` und `…/<id>/warten`; dort gibt es keine
  Antwort-Route, und die Antwort-Route lehnt jede Anfrage mit Token-Kopf ab. Zum Antworten braucht es kein Token — der
  Schutz der Antwort liegt allein im DEKLARIERT-Teil darunter.
- **Nur Stefan antwortet — DEKLARIERT.** Die Antwort-Route `POST /api/rueckfragen/<id>/antwort` gibt Rechte, während ein
  Lauf aktiv ist — eine von Stefan zur Kenntnis genommene Abweichung vom Muster „rechtegebende Routen gesperrt, solange
  ein Lauf aktiv ist“ (F-1061), eng begrenzt: nur diese Route, nur offene Rückfragen offener Läufe, jede Rückfrage-ID
  genau einmal beantwortbar. Host- und CSRF-Haken greifen zentral; eine Anfrage ohne Origin (lokaler Prozess) lassen sie
  durch. Bekannte Grenze: jeder lokale Prozess — auch Laufcode über die npm-Skripte der Allowlist oder ein einmal
  erlaubter Bash-Befehl — kann jede Leitstand-Route aufrufen
  (`docs/adr/ausfuehrung-bash-allowlist.md`) — der Kanal ist eine Bedien-Grenze für das Modell, keine Sicherheitsgrenze
  gegen selbst ausgeführten Code. E-B7 = A (Stefan, 16.10.2026): das bleibt DEKLARIERT; die Vermittlung hält je Antwort die
  Herkunft im Protokoll fest (`herkunft`: `browser` bei Sec-Fetch-Site same-origin bzw. passendem Origin, sonst
  `nicht_browser`) — ein Hinweis, kein Schutz (Kopfzeilen sind fälschbar); angezeigt seit B2b-3b-2b-2a-2 („Zuletzt entschieden“).
- Jede Rückfrage hat eine Wartegrenze (10 min) und endet spätestens mit dem Lauf (abgelehnt bzw. „keine Antwort von
  Stefan“); jeder Fehler im Skript endet als Ablehnung, nie als Erlaubnis.

## 4. Fehlerbehandlung

- Ein Werkzeuglauf hat genau drei terminale Ausgänge: `ERFOLGREICH`, `VERWEIGERT`, `FEHLGESCHLAGEN`. Klassifikationsreihenfolge: ungültige Beobachtungsbasis → `FEHLGESCHLAGEN`; gültige Verweigerung → `VERWEIGERT`; sonst bei erfüllten Erfolgskriterien → `ERFOLGREICH`. Ein allgemeines Erfolgsflag überstimmt nie eine konkrete Verweigerung.
- Eine Ablehnung allein durch Stefan über den Rückfrage-Kanal (Protokoll `rueckfragen-<laufId>` im Kontrollzustand: je Ablehnung genau ein Eintrag `stefan_abgelehnt` mit gleicher `tool_use_id`, gleichem Werkzeug und gleichem Input-Hash, kein Umgehungsverdacht; Abgleich in `src/rueckfrage/protokoll.ts`) ergibt `ERFOLGREICH` mit `daten.abgelehnt_durch_stefan`, jede andere Ablehnung (automatisch, Zeitüberschreitung, Werkzeugsatz-Sperre, ohne oder mit ungültigem Protokoll) bleibt `VERWEIGERT`. Quelle der Wahrheit ist seit F45 B2b-3b-2a der Speicherstand der Vermittlung im Leitstand-Prozess (`eintraegeVon`, gleicher Prozess wie der Controller, `ermittleRueckfrageProtokoll`); die Datei ist das Audit und gilt nur, wenn sie dazu passt — weichen beide ab oder fehlt der Speicherstand (Lauf nicht offen, Neustart), gilt „nicht nur Stefan“ (ERZWUNGEN gegen eine gefälschte Datei, F-1128 (1)); jede solche Abweichung steht seit F45 B2b-3b-2b-1a mit Grund in der Startfehlerliste des Leitstands (F-1128 R3). Die Datei hat je Entscheidung eine Version mit nur den neuen Einträgen (Schema v1, `ab`), beim Lesen lückenlos zusammengesetzt; eine Lücke gilt als Abweichung (bekannte Grenzen: der Schreib-Rückruf wirft erst, nachdem die Version geschrieben ist; dieselbe laufId wird neu geöffnet — im Server durch die laufId-Sperre nicht erreichbar). Seit F45 B2b-3b-2b-1b (F-1128 R1) zählt eine Ablehnung durch Stefan nur, wenn jedes tool_result ihrer ID im hash-geprüften Rohstrom `is_error` trägt und als String genau den eindeutigen Ablehnungstext, den die Vermittlung je Ablehnung erzeugt (mit Ref) und an die CLI gibt — Protokoll und Speicherstand tragen dessen Hash `ablehnung_hash`, der zu den verglichenen Feldern gehört. Das schließt das „Waschen“ einer statischen oder nicht über den Kanal gelaufenen Ablehnung (ID nachträglich mit dem Token stellen und ablehnen) — ERZWUNGEN, weil das tool_result einer solchen ID allein die CLI schreibt, mit eigenem Text mit festem Präfix (Gate f45-b2b3b2b1b-r1 (r1d)); und die Ref entsteht erst bei Stefans Entscheidung, also kann kein Text, den CLI oder Hook zu einer anderen ID schreiben, sie enthalten (Annahme: kein Projekt-Hook gibt als Ablehnungsgrund einen von außen zur Laufzeit beeinflussbaren Text ohne Präfix zurück — heute erfüllt, commit-guard und guard-settings). Es bleibt DEKLARIERT: eine echte Rückfrage, die ein lokaler Prozess vor Stefan über die Antwort-Route ablehnt, zählt weiter; wer in den stdout der CLI schreiben kann, umgeht die ganze Klassifikation — R1 hebt die Hürde von zwei HTTP-Aufrufen auf einen Eingriff in den Prozess-stdout. Voraussetzung (im echten Lauf zu belegen, F-1128 (4); Nachweislauf und Auswertung seit F45 B2b-3b-2b-2b-1, Prüfpunkte P1/P4, `docs/harness/rueckfrage-nachweislauf.md`): die CLI übernimmt die Ablehnungsnachricht wörtlich als String-`content`; tut sie es nicht, zählt keine Ablehnung durch Stefan (sicher, aber wirkungslos). Seit F45 B2b-3b-2b-2a-1 (F-1128 (3)/R3) stehen bei einem Lauf mit Kanal in `daten` der Terminalmarke zusätzlich: bei VERWEIGERT `rueckfrage_abgleich` `{ art, grund }` (`abgleich` mit festem Grund aus `ABGLEICH_GRUENDE` in `src/rueckfrage/protokoll.ts`, z. B. `ablehnungstext_passt_nicht`, `kein_eintrag`; `abweichung` mit dem R3-Grund; `kein_protokoll`; `nicht_geprueft` bei Umgehungsverdacht) — nur Beschriftung, die Reihenfolge des Abgleichs bleibt; bei ERFOLGREICH und VERWEIGERT — seit F45 B2b-3b-2b-2a-3 (F-1132 (1)) bei jedem Ergebnis, auch FEHLGESCHLAGEN (TIMEOUT/Abbruch) — `rueckfrage_zaehlung` (Antworten je Art `stefan_erlaubt`, `stefan_abgelehnt`, `frage_beantwortet` und davon `nicht_browser`; dazu unbeantwortet `abgelaufen` (Wartegrenze), `lauf_ende` (beim Lauf-Ende abgelehnt, einschließlich der beim Lesen noch offenen — ERZWUNGEN: zwischen dem Lesen im Controller und `beendeLauf` im Server liegt kein await, dort werden genau sie abgelehnt) und `automatisch` (auto_deny, doppelte ID, Grenzen, auch Ablehnungen über der Protokollgrenze ohne Eintrag); aus dem Speicherstand der Vermittlung, nicht aus der Datei — enthält auch nicht bestätigte Ablehnungen; scheitert `oeffneLauf` (ungültige Kanal-Daten), fehlt der Speicherstand ⇒ R3 mit Grund „Speicher fehlt (Lauf nicht offen)“ und ohne Zählung — die Anzeige nennt deshalb „Kanal für diesen Lauf nicht offen“ neben Fälschung und Schreibfehler als mögliche Ursache); bei jedem Ergebnis mit verworfenem Protokoll `rueckfrage_abweichung` (auf 500 Zeichen gekappt, bleibt nach einem Neustart, anders als die Startfehlerliste). Die Felder werden nach allen Zweigen der Klassifikation zusammengeführt; ohne Kanal bleiben `daten` bitgleich (Gate f45-b2b3b2b2a-einschalten (t)). Nach einer Ablehnung durch Stefan — maßgeblich ist der Speicherstand der Vermittlung, nicht `permission_denials` — läuft die Löschliste nicht, sie steht nur als Hinweis in der Änderungsübersicht (F-1128 (2), R2). Durchsetzungsgrad der Regel insgesamt DEKLARIERT, weil die Antwort-Route für jeden lokalen Prozess erreichbar ist (§3, „Nur Stefan antwortet — DEKLARIERT“: ein lokales Skript kann ablehnen und einmal erlauben; vor dem Einschalten Entscheidung Stefans, F-1128).
- Klassifiziert wird ausschließlich aus Ergebnishülle und strukturiertem Ereignisstrom. Konsolentext wird nicht gedeutet.
- Jeder Lauf erzeugt zwei getrennte Ablagen: die kanonische Laufakte, die nur trägt, was Zustand, Freigabe oder Qualitätsdaten verbraucht, und den Rohereignisstrom für Audit und Diagnose. Der Rohstrom wird nicht committet und bildet keinen Modellkontext.
- Blockieren ist ein normaler Ausgang, kein Fehler. Ein blockierter Zustand trägt Blocker-Kennung, Grund, Evidenz, Auflösungsbedingung und Resume-Ziel.
- Ein unterbrochener Baulauf wird nie automatisch neu gestartet.
- Kein stiller Modell-Fallback.
- Logging bleibt lokal. Kein externer Monitoring-Dienst.

## 5. Kommentar-Standard

Siehe `docs/kommentar-standard.md`.

## 6. Test-Werkzeug

`node:test`. Lint über Biome, Typprüfung über `tsc`. Kein zusätzliches Test-Framework und kein zusätzliches MCP-Werkzeug ohne vorherigen Lauf des Skills `werkzeug-auswahl`; das Ergebnis gehört nach `state/tooling.md`, auch wenn es negativ ausfällt. Das gilt für Entwicklungswerkzeuge; der Rückfrage-Kanal (§3, `scripts/leitstand/rueckfrage-mcp.mjs`) ist ein Produktkanal ohne Abhängigkeit, kein zusätzliches MCP-Werkzeug in diesem Sinn.

## 7. Verbotene Patterns

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

## 8. Definition of Done

Siehe `CLAUDE.md`. Projektspezifische Ergänzungen hier.

Projektspezifisch zusätzlich:
- Jede Änderung am Kontrollzustand ist über den Checkpoint Store gelaufen; die Hash-Kette ist append-only geblieben.
- Eine neu behauptete Grenze trägt ihren Durchsetzungsgrad. Ohne kalibrierten Rot- und Grün-Fall wird sie nicht `ERZWUNGEN` genannt.
- Neu entstandene Rohereignisströme sind gitignoriert.
