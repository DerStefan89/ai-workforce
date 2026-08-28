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

- `src/` — Kern-Code der AI Workforce. Einziger Produktpfad.
- `kontrollzustand/` — Kontrollzustand als JSON/JSONL: Checkpoints, Wirkungsmarken, Artefakt- und Lineage-Einträge, Transportpakete, wegwerfbarer Index. Kein Markdown.
- `profiles/` — Profilkonfiguration als JSON. Ein-Ebenen-Modell: je Projekt genau eine vollständige, eigenständige Profildatei; kein Domänen-Profil mit Projekt-Overlay.
- `state/` — Gedächtnis des Harness. Trägt keinen Kontrollzustand der Workforce.
- `scripts/` — Prüf- und Hilfsskripte des Harness.
- `docs/projekt/` — führende Projektdokumente: `docs/projekt/zielfassung.md` (Sollquelle für Zielbild, Rollen, Lifecycle, Sicherheits- und Evidenzmodell, Architektur-Baseline), `docs/projekt/umsetzungsplan-fassung-1.md` (Deliverables, Feature-Reihenfolge, Backlog).

Bezeugungen menschlicher Freigaben liegen **außerhalb** dieses Repositoriums, in einem eigenen Git-Repository des Kerns. Rohereignisströme sind gitignoriert und werden aus der Laufakte über ihren Hash referenziert.

## 2. Datenzugriff

- Dateien und Git sind der führende Zustand. Keine Datenbank als führender Zustandsspeicher; ein Index ist wegwerfbar und jederzeit neu erzeugbar.
- Schreibend auf `kontrollzustand/` greift ausschließlich der Kern zu, und nur über die append-only Hash-Kette des Checkpoint Store. Kein Commit pro Zustandsübergang — der Kontrollzustand ist Momentaufnahme im Metadaten-Commit.
- `profiles/` ist die alleinige editierbare Quelle für Profilinhalte. Der Kontrollzustand hält davon nur eine gepinnte Referenz aus Pfad, Hash und Version, nie eine Kopie.
- Artefakte werden versioniert, nicht überschrieben. Version ist der Inhalts-Hash; die einzige Stelle, die den aktuellen Stand benennt, ist der letzte Checkpoint.
- Produktdateien im freigegebenen Baupfad ändert ausschließlich das Ausführungswerkzeug. Der Kern liest sie read-only.
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
| Aufrufparameter, die eine Schutzschicht abwählen | Der Kern ruft nie in einer Form auf, die Schutz abschaltet | keine |
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
