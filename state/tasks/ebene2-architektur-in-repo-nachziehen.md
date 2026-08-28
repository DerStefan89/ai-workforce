SCHRITT 0: Arbeitsverzeichnis ausgeben und gegen das im Auftrag genannte Zielverzeichnis prüfen. Bei Abweichung: abbrechen, melden, nichts ändern.

Zielverzeichnis: die Wurzel des Repositoriums `ai-workforce` (die Ebene, auf der `CLAUDE.md`, `ARCHITECTURE.md`, `package.json` und `.claude/` liegen).

## TASK: ebene2-architektur-in-repo-nachziehen

GOAL:

Der Repo-Stand trägt die bereits getroffenen Ebene-2-Entscheidungen selbst. Eine frische Claude-Code-Sitzung kann Stack, Ordnerstruktur, Datenzugriff, Autorisierungsgrenze, Fehlerbehandlung, Test-Werkzeug und verbotene Patterns allein aus dem Arbeitsbaum benennen, ohne Zugriff auf ein Claude-Projekt. `npm run check` bleibt grün.

Dieser Auftrag überträgt ausschließlich bereits entschiedene Inhalte. Er trifft keine neue Architekturentscheidung. Wo dieser Text eine Formulierung vorgibt, ist sie zu übernehmen, nicht zu verbessern.

CONTEXT:

- `ARCHITECTURE.md` steht vollständig im Template-Zustand: alle acht Abschnitte tragen `[FÜLLUNG]`, der Titel trägt `[PROJEKTNAME]`.
- `CLAUDE.md` trägt im Kopfbereich (Produktsatz, Stack, Befehle) ebenfalls `[FÜLLUNG]`.
- `docs/STATUS.md` ist leer bzw. Template.
- `state/memory-map.md` trägt in der letzten Zeile `[FÜLLUNG]`.
- Grund: Die Entscheidungen wurden außerhalb des Repositoriums getroffen und nie eingetragen. Belegter Schaden: zweimal (Vertrag 4, Vertrag 5) scheiterten ausführende Sitzungen an Aufträgen, die nur auf ein Projektdokument verwiesen.
- `scripts/check-docs.mjs` Prüfung 1 meldet Backtick-Verweise auf Dateien, die nirgends im Repo existieren. Jeder in diesem Auftrag genannte Pfad muss deshalb tatsächlich existieren, bevor er in einer Datei referenziert wird.
- `scripts/check-docs.mjs` Prüfung 2 meldet Versionsnummern an Stack-Namen in `CLAUDE.md` und `ARCHITECTURE.md`. Deshalb steht in beiden Dateien kein `Node 24`, sondern `Node`; die Version wird ausschließlich im ADR und in `package.json` gepinnt.
- Vorbedingung: Die beiden führenden Projektdokumente liegen bereits als `docs/projekt/zielfassung.md` und `docs/projekt/umsetzungsplan-fassung-1.md` im Arbeitsbaum (vom Menschen abgelegt). Fehlt eine der beiden Dateien: abbrechen und melden, nichts anlegen, nichts erfinden.

SCOPE:

1. **`ARCHITECTURE.md`** — Titelzeile auf `# ARCHITECTURE.md — AI Workforce` setzen. Den Kopfkommentar (`[FÜLLUNG — GANZE DATEI]` samt Aufteilungsregel) unverändert stehen lassen. Abschnitte 1, 2, 3, 4, 6, 7 und die projektspezifische Ergänzung in 8 mit dem folgenden Wortlaut füllen. Abschnitt 5 bleibt unverändert.

**## 1. Ordnerstruktur**

> - `src/` — Kern-Code der AI Workforce. Einziger Produktpfad.
> - `kontrollzustand/` — Kontrollzustand als JSON/JSONL: Checkpoints, Wirkungsmarken, Artefakt- und Lineage-Einträge, Transportpakete, wegwerfbarer Index. Kein Markdown.
> - `profiles/` — Profilkonfiguration als JSON. Ein-Ebenen-Modell: je Projekt genau eine vollständige, eigenständige Profildatei; kein Domänen-Profil mit Projekt-Overlay.
> - `state/` — Gedächtnis des Harness. Trägt keinen Kontrollzustand der Workforce.
> - `scripts/` — Prüf- und Hilfsskripte des Harness.
> - `docs/projekt/` — führende Projektdokumente: `docs/projekt/zielfassung.md` (Sollquelle für Zielbild, Rollen, Lifecycle, Sicherheits- und Evidenzmodell, Architektur-Baseline), `docs/projekt/umsetzungsplan-fassung-1.md` (Deliverables, Feature-Reihenfolge, Backlog).
>
> Bezeugungen menschlicher Freigaben liegen **außerhalb** dieses Repositoriums, in einem eigenen Git-Repository des Kerns. Rohereignisströme sind gitignoriert und werden aus der Laufakte über ihren Hash referenziert.

**## 2. Datenzugriff**

> - Dateien und Git sind der führende Zustand. Keine Datenbank als führender Zustandsspeicher; ein Index ist wegwerfbar und jederzeit neu erzeugbar.
> - Schreibend auf `kontrollzustand/` greift ausschließlich der Kern zu, und nur über die append-only Hash-Kette des Checkpoint Store. Kein Commit pro Zustandsübergang — der Kontrollzustand ist Momentaufnahme im Metadaten-Commit.
> - `profiles/` ist die alleinige editierbare Quelle für Profilinhalte. Der Kontrollzustand hält davon nur eine gepinnte Referenz aus Pfad, Hash und Version, nie eine Kopie.
> - Artefakte werden versioniert, nicht überschrieben. Version ist der Inhalts-Hash; die einzige Stelle, die den aktuellen Stand benennt, ist der letzte Checkpoint.
> - Produktdateien im freigegebenen Baupfad ändert ausschließlich das Ausführungswerkzeug. Der Kern liest sie read-only.
> - Pauschales Stagen ist in allen Git-Schritten ausgeschlossen.

**## 3. Auth**

> Kein Mehrbenutzerbetrieb, keine Anmeldung. Was hier geschützt wird, ist die Autorisierung, und sie trägt zwei voneinander unabhängige Schichten:
>
> 1. **Authorization Boundary** — Bezeugungen menschlicher Freigaben liegen außerhalb der Schreibreichweite des Ausführungswerkzeugs, in einem eigenen Git-Repository. Der Checkpoint trägt Referenz und Hash; validiert wird immer gegen den geschützten Ort, nie gegen die Referenz allein. Eine im Produkt-Repository sichtbare Kopie ist niemals alleinige Autoritätsquelle.
> 2. **Invocation Policy / Protection Validator** — vor jeder Execution mit Schreibwirkung, lokal und ohne Werkzeugaufruf: ist die Werkzeugkonfiguration gültig und existiert jedes von ihr referenzierte Schutzskript mit dem erwarteten Hash, und liegt ein gültiger Wirksamkeitsnachweis für den Gültigkeitsschlüssel vor. Scheitert eine der beiden Prüfungen, startet keine Execution.
>
> Der Kern erzeugt niemals ein Freigabeartefakt. Autorisierungen entstehen ausschließlich aus direkter menschlicher Eingabe.
>
> Ein Pflichtdokument, das nur eine der beiden Schichten kennt, kann versehentlich unterlaufen werden — deshalb stehen beide hier.

**## 4. Fehlerbehandlung**

> - Ein Werkzeuglauf hat genau drei terminale Ausgänge: `ERFOLGREICH`, `VERWEIGERT`, `FEHLGESCHLAGEN`. Klassifikationsreihenfolge: ungültige Beobachtungsbasis → `FEHLGESCHLAGEN`; gültige Verweigerung → `VERWEIGERT`; sonst bei erfüllten Erfolgskriterien → `ERFOLGREICH`. Ein allgemeines Erfolgsflag überstimmt nie eine konkrete Verweigerung.
> - Klassifiziert wird ausschließlich aus Ergebnishülle und strukturiertem Ereignisstrom. Konsolentext wird nicht gedeutet.
> - Jeder Lauf erzeugt zwei getrennte Ablagen: die kanonische Laufakte, die nur trägt, was Zustand, Freigabe oder Qualitätsdaten verbraucht, und den Rohereignisstrom für Audit und Diagnose. Der Rohstrom wird nicht committet und bildet keinen Modellkontext.
> - Blockieren ist ein normaler Ausgang, kein Fehler. Ein blockierter Zustand trägt Blocker-Kennung, Grund, Evidenz, Auflösungsbedingung und Resume-Ziel.
> - Ein unterbrochener Baulauf wird nie automatisch neu gestartet.
> - Kein stiller Modell-Fallback.
> - Logging bleibt lokal. Kein externer Monitoring-Dienst.

**## 6. Test-Werkzeug**

> `node:test`. Lint über Biome, Typprüfung über `tsc`. Kein zusätzliches Test-Framework und kein zusätzliches MCP-Werkzeug ohne vorherigen Lauf des Skills `werkzeug-auswahl`; das Ergebnis gehört nach `state/tooling.md`, auch wenn es negativ ausfällt.

**## 7. Verbotene Patterns** — die `[FÜLLUNG]`-Zeile durch diese Tabellenzeilen ersetzen:

> | Pattern | Warum verboten | Ausnahme |
> |---|---|---|
> | Pauschales Stagen des Arbeitsbaums | Ein Commit stagt ausschließlich explizit benannte Pfade | keine |
> | Datenbank als führender Zustandsspeicher | Dateien und Git führen; ein Index ist wegwerfbar | keine |
> | Kontrollzustand als Markdown unter `state/` | `state/` ist Gedächtnis des Harness; Kontrollzustand ist JSON/JSONL unter `kontrollzustand/` | keine |
> | Überschreiben eines persistierten Artefakts | Inhaltsadressiert — neue Version statt Mutation | keine |
> | Freigabeartefakt durch den Kern erzeugen | Autorisierung entsteht nur aus direkter menschlicher Eingabe | keine |
> | Aufrufparameter, die eine Schutzschicht abwählen | Der Kern ruft nie in einer Form auf, die Schutz abschaltet | keine |
> | CRLF in Dateien, die der Kern schreibt | Der Hash beschreibt die Bytes auf der Platte; der Kern schreibt ausnahmslos LF | keine |
> | Laufergebnis aus Konsolentext ableiten | Beobachtbarkeit ausschließlich aus strukturierter Laufausgabe | keine |
> | Zwei gleichzeitig aktive Arbeitsstränge | Genau ein aktiver Arbeitsstrang; keine Sperren, kein paralleler Zustand | keine |
> | `any` | Die Typprüfung ist Teil der Definition of Done | begründeter Einzelfall mit Kommentar nach `docs/kommentar-standard.md` |

**## 8. Definition of Done** — den bestehenden Verweis auf `CLAUDE.md` stehen lassen und darunter ergänzen:

> Projektspezifisch zusätzlich:
> - Jede Änderung am Kontrollzustand ist über den Checkpoint Store gelaufen; die Hash-Kette ist append-only geblieben.
> - Eine neu behauptete Grenze trägt ihren Durchsetzungsgrad. Ohne kalibrierten Rot- und Grün-Fall wird sie nicht `ERZWUNGEN` genannt.
> - Neu entstandene Rohereignisströme sind gitignoriert.

2. **`CLAUDE.md`, Kopfbereich** — die drei `[FÜLLUNG]`-Stellen füllen. Keine Versionsnummern an Stack-Namen (Prüfung 2).

> **Produkt:** AI Workforce — eine lokale Orchestrierungsanwendung, die ein Vorhaben von der Idee bis zum abgenommenen Ergebnis durch klar getrennte KI-Positionen führt. Ein einziger Nutzer, der zugleich Vorarbeiter und einzige Entscheidungsinstanz ist.
>
> **Stack:** TypeScript auf Node, strip-only (kein Build-Schritt) · Biome für Lint · `tsc` für Typprüfung · `node:test` für Tests. Die gepinnte Laufzeitversion steht in `package.json` und im ADR, nicht hier.
>
> **Befehle:** `npm run check` (volle Kette) · `npm run check:template` (stack-unabhängige Gates).

Zusätzlich im bestehenden Verweisblock ergänzen, **wann** welche Datei zu lesen ist:

> `ARCHITECTURE.md` vor jeder Code-Änderung. `docs/projekt/zielfassung.md`, wenn eine Anforderung, eine Rolle, eine Grenze oder ein Fassung-1-Scope zu klären ist. `docs/projekt/umsetzungsplan-fassung-1.md`, wenn die Reihenfolge oder die Zuordnung eines Features zu klären ist. `docs/STATUS.md` für den aktuellen Stand.

3. **`docs/adr/`** — vier ADRs nach `docs/adr/TEMPLATE.md`, je eine bereits getroffene Entscheidung, jeweils kurz, mit Datum und Fundstelle in `docs/projekt/zielfassung.md`:

   - `technischer-stack.md` — TypeScript auf Node 24, strip-only, Biome + `tsc` + `node:test`. **Hier gehört die Versionsnummer hin**, nicht in `CLAUDE.md`/`ARCHITECTURE.md`. Randbedingung: der gepinnte Harness verpflichtet die Zielmaschine ohnehin auf eine Node-Laufzeit für die Hooks. Offene Messung vermerken: `mock.module` unter der Zielversion nicht gemessen, relevant beim Test des Claude-Code-Gateways.
   - `datenformate-kontrollzustand-und-profile.md` — `kontrollzustand/` JSON/JSONL, hält nur eine gepinnte Referenz (Pfad, Hash, Version) auf das verwendete Profil; `profiles/` JSON als alleinige editierbare Quelle.
   - `oberflaechentechnik-leitstand.md` — lokale Web-Oberfläche statt CLI. Folge: eine zusätzliche Laufzeitkomponente. Der Leitstand hält keine eigene Wahrheit und löst nur Aufrufe an den Execution Controller aus.
   - `ein-ebenen-profilmodell.md` — je Projekt eine vollständige, eigenständige Profildatei; kein Domänen-Profil mit Projekt-Overlay. Verworfene Alternative benennen.

4. **`docs/STATUS.md`** — füllen: aktueller Phasenstand (Ebene 1 und 2 abgeschlossen, Vertragsschiene abgeschlossen, Meilenstein 1 in Arbeit), Scope von Fassung 1 in drei bis fünf Zeilen, ausdrücklich das, was **nicht** Fassung 1 ist (Mehrbenutzerbetrieb, Hosting, Abrechnung, Provider-Adapter, parallele Workstreams, autonome externe oder irreversible Aktionen), und ein Verweis auf `docs/projekt/umsetzungsplan-fassung-1.md` für die Reihenfolge. Kein Duplikat des Umsetzungsplans.

5. **`state/memory-map.md`** — die `[FÜLLUNG]`-Zeile ersetzen durch drei Zeilen, jede mit gefüllter „nicht hierhin"-Spalte:

   - Zielbild, Rollen, Grenzen, Fassung-1-Scope → `docs/projekt/zielfassung.md`; nicht hierhin: nicht in `ARCHITECTURE.md` (dort stehen ausschließlich Code-Konventionen) und nicht in einen Chat.
   - Deliverables, Feature-Reihenfolge, Backlog → `docs/projekt/umsetzungsplan-fassung-1.md`; nicht hierhin: nicht in `docs/STATUS.md`, dort steht nur der aktuelle Stand.
   - Einzelne Architekturentscheidung samt Begründung und verworfener Alternative → `docs/adr/`; nicht hierhin: nicht in `ARCHITECTURE.md`, dort steht nur die geltende Regel ohne Herleitung.

6. **`scripts/check-docs.mjs`, Prüfung 2, Namensliste** — die Liste zeigt auf einen fremden Stack. Ersetzen durch die Namen dieses Projekts (`TypeScript`, `Node`, `Biome`, `tsc`, `node:test`). Ausschließlich die Namensliste ändern; an der Prüflogik, am Geltungsbereich und an den Prüfungen 1, 3, 4, 5 nichts ändern.

7. **Kalibrierung von Prüfung 2 auf die neue Namensliste** — nicht behaupten, sondern zeigen:
   - Rot: in `CLAUDE.md` temporär `Node` zu `Node 24` ändern → `node scripts/check-docs.mjs` muss genau diesen Befund melden, Exit 1. Ausgabe im Wortlaut protokollieren, danach zurückändern.
   - Grün: unverändert → Exit 0.
   - Ergebnis als Rot-/Grün-Fall in `state/gates.md` eintragen.

8. **`npm run check` und `npm run check:template`** vollständig laufen lassen. Beide grün.

NICHT:

- **Keine neue Architekturentscheidung.** Wo dieser Auftrag eine Formulierung vorgibt, wird sie übernommen. Fällt beim Eintragen ein Widerspruch auf: eintragen, was hier steht, und den Widerspruch unter OUTPUT melden.
- **Kein `features/`-Verzeichnis, keine Feature-Akte, kein `scripts/check-feature.mjs`.** Das ist AF-F001 und läuft als eigener Vertrag danach.
- **Keine Änderung an Hooks oder Guards** (`.claude/hooks/*`, `.claude/settings.json`). Andere Vertrauensgrenze, eigener Vertrag.
- **Keine Reparatur des `cwd`-Fehlers in `commit-guard.cjs`.** Bekannt, in `state/assumption-ledger.md`, eigener Vertrag.
- **Keine Änderung an der Prüflogik von `check-docs.mjs`** über die Namensliste in Prüfung 2 hinaus, und keine Änderung an `check-rules.mjs` oder `check-contract.mjs`.
- **Kein Füllen von `package.json`-Skripten.** Falls `lint`, `typecheck` oder `test` noch `echo` sind: nicht beheben, sondern unter OUTPUT melden — ein grüner Durchlauf belegt dann weniger, als er behauptet.
- **Kein Produktcode**, kein `src/`, kein `kontrollzustand/`, kein `profiles/`. Die Ordnerstruktur wird beschrieben, nicht angelegt.
- **Kein Anlegen oder Verändern von `docs/projekt/*`.** Diese beiden Dateien legt der Mensch ab; der Auftrag setzt sie voraus.
- **Kein Commit, kein Push ohne die jeweils eigene, frische Freigabedatei.** Stagen nur mit explizit genannten Pfaden.

BUDGET:

Ein Baudurchgang plus höchstens eine Korrekturrunde. Kein Advisor-Pass — dieser Auftrag führt kein neues blockierendes Gate ein und trifft keine Architekturentscheidung; er überträgt bestehende. Nach dem Bau: `code-reviewer` und `qa`.

OUTPUT:

1. Welche Dateien geändert wurden, je mit einer Zeile, was darin steht.
2. Die vier neu angelegten ADR-Pfade.
3. Der protokollierte Rot-Fall und der Grün-Fall aus Schritt 7, im Wortlaut, mit Exit-Code.
4. Ergebnis von `npm run check` und `npm run check:template`, im Wortlaut der letzten Zeile.
5. Der Ist-Zustand der `package.json`-Skripte `lint`, `typecheck`, `test` — echter Befehl oder `echo`.
6. Jeder beim Eintragen aufgefallene Widerspruch zwischen diesem Auftrag und dem Repo-Stand, mit Pfad und Zeile. Ohne Hedging: Evidenz-Marker verwenden.
7. Freigabe-Halt.

ESCALATE:

- `docs/projekt/zielfassung.md` oder `docs/projekt/umsetzungsplan-fassung-1.md` fehlt → abbrechen, melden, nichts anlegen.
- Prüfung 2 meldet nach der Namensliste einen Befund an einer Stelle, die dieser Auftrag nicht vorgesehen hat → anhalten und melden, nicht die Formulierung umbiegen, bis das Gate schweigt.
- `npm run check` wird rot an einem Glied, das dieser Auftrag nicht angefasst hat → anhalten und melden. Kein Nachziehen fremder Stellen, um grün zu werden.
- Eine der vorgegebenen Formulierungen widerspricht einer Zeile in `docs/projekt/zielfassung.md` → anhalten, beide Stellen zitieren, melden. Nicht selbst entscheiden, welche gilt.
- `git commit` oder `git push` wird ohne frische Freigabedatei verlangt → nicht ausführen.

FOLGT:

- **AF-F001 — Feature-Akte im Repo** (`features/<feature-id>/` mit `feature.md`/`spec.md`/`journal.md`, `scripts/check-feature.mjs`, Einhängen in `npm run check:template`). Eigener Vertrag, mit Advisor-Pass, weil dort ein neues blockierendes Gate entsteht.
- **Migration des Entscheidungsregisters 001–176** nach `docs/projekt/entscheidungsregister.md`. Vertagt, weil es reine Ablage ist und den Umfang dieses Auftrags ohne Nutzen verdoppeln würde.
- **`package.json`-Skripte `lint`/`typecheck`/`test` mit echten Befehlen füllen**, falls Schritt 5 des OUTPUT zeigt, dass sie noch `echo` sind. Eigener Vertrag, weil er die Beweiskraft der gesamten Prüfkette verändert.
- **`cwd`-Fehler in `commit-guard.cjs`.** Bekannt, im Ledger, eigener Vertrag.
