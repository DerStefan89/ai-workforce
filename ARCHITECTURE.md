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

- `src/` — Kern-Code der AI Workforce. Einziger Produktpfad. `src/projektkarte/` (F45 B2a-1) baut je Lauf deterministisch die Projektkarte (Vorhaben, Bestand, Ausführungsrahmen, eingeschaltete Fähigkeiten, Qualität) mit Zuschnitt je Rolle für Architekt, Architecture-Advisor und Code-Reviewer — rein, ohne I/O; die Eingaben liest der Server über die bestehenden Lesepfade, Hash und Abschnitte stehen in der Laufakte (`projektkarte`). Dieselbe Regel (`analysiereArchitektur`) entscheidet, ob diese Datei beschrieben ist (Regel 1h, F-1066). Das Arbeitspaket (F45 B2a-2) ist kein eigener Artefakttyp, sondern der Auftrag v0 aus `src/auftrag/` mit additiven Feldern (Bereiche, Risiko, Feature-Bezug, Einrichtung durch Stefan); `baueArbeitspaketBlock` ist die einzige Textquelle für Architekt und Ausführung, neue Versionen (Einrichtung übernommen oder abgehakt) entstehen nur über `registriereAuftrag`. Der Code-Reviewer liest CLAUDE.md und ARCHITECTURE.md im Stand vor dem Bau (Basis-Commit, `git show`). `src/review-policy/` (F45 B2a-3a, Codex-Review-Spec `docs/projekt/codex-review-spec.md`) ist die einzige Quelle der versionierten Review-Policy im Auftrag jedes code-reviewer-Schritts (Codex und Claude gleich, Version in der Laufakte `review.policy_version`) und prüft das Ergebnis gegen den Ausgabevertrag; nur leere Befunde ohne den Pflichtsatz halten an (Regel 1k), alles andere wird sichtbar, nicht still. `src/review-stand/` (F45 B2a-3b, Spec §9.6) hält den geprüften Stand des Reviews fest: ein Inhalts-Fingerabdruck `{ commit, inhalt }` des Laufordners beim Start jedes code-reviewer-Schritts (Laufakte `review.geprueft_stand`, sonst null mit `stand_grund`); die Abnahme vergleicht ihn bei offener Abnahme mit dem aktuellen Stand und zeigt „Review veraltet“ — „veraltet“ nur über `inhalt`, ein Commit derselben Inhalte zählt nicht. `src/claude-plugins/` (F45 F-3a-1) liest Stefans in Claude Code installierte Plugins (Liste aus `claude plugin list --json`, Bestandteile, Inhalts-Hash und Risiken als Fakten aus dem Plugin-Ordner) für GET `/api/plugins` — reine Anzeige; kein Lauf importiert das Modul, `init.plugins` bleibt `[]` bis F-3b.
- `kontrollzustand/` — Kontrollzustand als JSON/JSONL: Checkpoints, Wirkungsmarken, Artefakt- und Lineage-Einträge, Transportpakete, wegwerfbarer Index. Kein Markdown.
- `profiles/` — Profilkonfiguration als JSON. Ein-Ebenen-Modell: je Projekt genau eine vollständige, eigenständige Profildatei; kein Domänen-Profil mit Projekt-Overlay.
- `startvorlagen/` — Startvorlagen als JSON (F11 WS-2): die maschinenkonstanten Startfelder eines Leitstand-Startauftrags (Startziel, Werkzeugversion, Berechtigungskontext, Profilverweis, Modell, Standard-Budget) und benannte Werkzeugsätze. Eigener Ordner statt `profiles/`, damit die bestehende Ein-Ebenen-Profilvalidierung (`scripts/check-datenformate.mjs`) nicht bricht — eine Startvorlage ist kein Profil. Projektspezifische Prüfkonfiguration liegt ebenfalls in der Startvorlage: pruefbefehl (F-652) und pruefketten_pfade (F-735, ergänzt die Default-Liste der Regel 1j). Der Werkzeugsatz 'schreibend' trägt eine Bash-Allowlist für Paket- und Prüfbefehle (E-F754, docs/adr/ausfuehrung-bash-allowlist.md); nacktes Bash und git-Befehle weist der Validator ab.
- `harness-abgleich/` — versionierte Zuordnung des Projekt-Harness (F45 B1b-2, Beleg 12): `standard.json` ordnet jeden DoD-Punkt aus CLAUDE.md, jeden Hook, Agent, Skill und Command `wirksam` (mit Beleg), `ersetzt_durch` (Workflow-Schritt) oder `bewusst_nicht` (Begründung) zu; Schema `schemas/harness-zuordnung.schema.json`, je Projekt über `harnessZuordnungPfad` der Startvorlage ergänzbar. Gehört zur Installation, nicht zum Projekt; der Kern liest sie nur (`src/harness-abgleich/`). Das Ergebnis je Workflow ist Kontrollzustand (`harness-abgleich-<workflowId>`), nicht diese Datei.
- `state/` — Gedächtnis des Harness. Trägt keinen Kontrollzustand der Workforce.
- `scripts/` — Prüf- und Hilfsskripte des Harness.
- `docs/projekt/` — führende Projektdokumente: `docs/projekt/zielfassung.md` (Sollquelle für Zielbild, Rollen, Lifecycle, Sicherheits- und Evidenzmodell, Architektur-Baseline), `docs/projekt/umsetzungsplan-fassung-1.md` (Deliverables, Feature-Reihenfolge, Backlog). `docs/projekt/kontext/` (Beschreibung, Anweisungen) und `docs/projekt/roadmap.json` (F33, `schemas/roadmap.schema.json`) sind zusätzlich der über den Context Builder eingespeiste Projektkontext für die Rollen `jarvis`/`router` — je Projekt-Repo eigenständig (E-M4-2), kein zweiter Speicher.
- `schemas/` — JSON-Schema (Draft 2020-12) für die Datenformate unter `kontrollzustand/` und `profiles/`, mit Beispielen unter `schemas/examples/`. Geprüft von `scripts/check-datenformate.mjs`.

Bezeugungen menschlicher Freigaben liegen **außerhalb** dieses Repositoriums, in einem eigenen Git-Repository des Kerns. Rohereignisströme sind gitignoriert und werden aus der Laufakte über ihren Hash referenziert.

## 2. Datenzugriff

- Dateien und Git sind der führende Zustand. Keine Datenbank als führender Zustandsspeicher; ein Index ist wegwerfbar und jederzeit neu erzeugbar.
- Schreibend auf `kontrollzustand/` greift ausschließlich der Kern zu, und nur über die append-only Hash-Kette des Checkpoint Store. Kein Commit pro Zustandsübergang — der Kontrollzustand ist Momentaufnahme im Metadaten-Commit.
- Einzige Ausnahme: `kontrollzustand/.leitstand.lock`, der Instanz-Lock des Leitstand-Prozesses (F-201). Flüchtiger Betriebszustand mit PID, Port und Startzeit — kein Artefakt, keine Lineage, keine Hash-Kette, git-ignoriert, vom Leitstand nur im CLI-Bindeblock vor dem Binden angelegt und beim Prozessende entfernt. Er liegt hier, weil er genau diese Ressource schützt: zwei Serverprozesse auf demselben `kontrollzustand/`. Jede weitere Ausnahme braucht denselben Weg — erst hier, dann im Code.
- Weitere Ausnahme (F45 F-1, E-F45-8): `~/.ai-workforce/faehigkeiten.lokal.json` — Aktivierung und Freigaben nach Inhalt
  der Fähigkeiten je Projekt (Schema `schemas/faehigkeiten-lokal.schema.json`). Liegt außerhalb jedes Repos und jedes
  Arbeitsordners, damit kein Lauf sich selbst etwas freigibt; geschrieben nur von den POST-Routen
  `/api/projekte/<id>/faehigkeiten/…` auf direkte Eingabe (gesperrt, solange ein Lauf aktiv ist), vorher/nachher je
  Lauf gehasht (Abweichung = Lauf rot). Kein Kontrollzustand, keine Hash-Kette; ungültig sperrt jeden Start mit
  Katalog-Fähigkeiten (E-F45-7). Eine Änderung, die nicht über diese Routen kam, gilt erst nach ausdrücklicher Bestätigung
  im Leitstand (POST `/api/projekte/<id>/faehigkeiten/bestaetigung`, „Datei geprüft – Stand übernehmen“, Laufsperre wie die
  anderen Routen); bis dahin sperren die Schreib-Routen und jeder Start mit Katalog-Fähigkeiten (F-1061, Entscheidung
  Stefan 12.10.2026).
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
- Pauschales Stagen ist in allen Git-Schritten ausgeschlossen.

## 3. Auth

Kein Mehrbenutzerbetrieb, keine Anmeldung. Was hier geschützt wird, ist die Autorisierung, und sie trägt zwei voneinander unabhängige Schichten:

1. **Authorization Boundary** — Bezeugungen menschlicher Freigaben liegen außerhalb der Schreibreichweite des Ausführungswerkzeugs, in einem eigenen Git-Repository. Der Checkpoint trägt Referenz und Hash; validiert wird immer gegen den geschützten Ort, nie gegen die Referenz allein. Eine im Produkt-Repository sichtbare Kopie ist niemals alleinige Autoritätsquelle.
2. **Invocation Policy / Protection Validator** — vor jeder Execution mit Schreibwirkung, lokal und ohne Werkzeugaufruf: ist die Werkzeugkonfiguration gültig und existiert jedes von ihr referenzierte Schutzskript mit dem erwarteten Hash, und liegt ein gültiger Wirksamkeitsnachweis für den Gültigkeitsschlüssel vor. Scheitert eine der beiden Prüfungen, startet keine Execution.

Der Kern erzeugt niemals ein Freigabeartefakt. Autorisierungen entstehen ausschließlich aus direkter menschlicher Eingabe.

Ein Pflichtdokument, das nur eine der beiden Schichten kennt, kann versehentlich unterlaufen werden — deshalb stehen beide hier.

## 4. Fehlerbehandlung

- Ein Werkzeuglauf hat genau drei terminale Ausgänge: `ERFOLGREICH`, `VERWEIGERT`, `FEHLGESCHLAGEN`. Klassifikationsreihenfolge: ungültige Beobachtungsbasis → `FEHLGESCHLAGEN`; gültige Verweigerung → `VERWEIGERT`; sonst bei erfüllten Erfolgskriterien → `ERFOLGREICH`. Ein allgemeines Erfolgsflag überstimmt nie eine konkrete Verweigerung.
- Klassifiziert wird ausschließlich aus Ergebnishülle und strukturiertem Ereignisstrom. Konsolentext wird nicht gedeutet.
- Jeder Lauf erzeugt zwei getrennte Ablagen: die kanonische Laufakte, die nur trägt, was Zustand, Freigabe oder Qualitätsdaten verbraucht, und den Rohereignisstrom für Audit und Diagnose. Der Rohstrom wird nicht committet und bildet keinen Modellkontext.
- Blockieren ist ein normaler Ausgang, kein Fehler. Ein blockierter Zustand trägt Blocker-Kennung, Grund, Evidenz, Auflösungsbedingung und Resume-Ziel.
- Ein unterbrochener Baulauf wird nie automatisch neu gestartet.
- Kein stiller Modell-Fallback.
- Logging bleibt lokal. Kein externer Monitoring-Dienst.

## 5. Kommentar-Standard

Siehe `docs/kommentar-standard.md`.

## 6. Test-Werkzeug

`node:test`. Lint über Biome, Typprüfung über `tsc`. Kein zusätzliches Test-Framework und kein zusätzliches MCP-Werkzeug ohne vorherigen Lauf des Skills `werkzeug-auswahl`; das Ergebnis gehört nach `state/tooling.md`, auch wenn es negativ ausfällt.

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
