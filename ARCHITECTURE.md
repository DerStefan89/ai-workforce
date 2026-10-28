<!--
Aufteilungsregel: Ein Abschnitt wird eine eigene Datei, wenn drei Dinge
zutreffen — er trägt mindestens drei echte, belegte Entscheidungen · er
wird unabhängig vom Rest nachgeschlagen · er hat ein eigenes Gate. Vorher
bleibt er ein Abschnitt. Zweiter Auslöser: die Größengrenze des Kerns —
dann wandert die Herleitung wörtlich, die Regel bleibt als Satz hier.

Bei jeder Abspaltung gelten zwei Pflichten: ein memory-map-Eintrag mit
„nicht hierhin"-Spalte, und ein Rückverweis aus ARCHITECTURE.md, damit
Prüfung 1 des Doku-Gates den Verfall fängt. `CLAUDE.md` muss danach sagen,
WANN welche Datei zu lesen ist, nicht nur DASS es sie gibt.
-->

# ARCHITECTURE.md — AI Workforce

Pflichtlektüre vor jedem Commit. Verbindliche Code-Konventionen. Jede Regel steht hier als Satz mit Durchsetzungsgrad; der
wörtliche Detailtext liegt in `docs/architektur/` (gleich verbindlich, bei Widerspruch gilt dieser Kern; eine Regeländerung
ändert Kern und Detail gemeinsam). Gate `check-f45-k-kontext`: ERZWUNGEN für Größe ≤ Deckel in
`scripts/architektur-kern.json`, für existierende Verweise und Rückverweise, und — bei lesbarer Referenz auf main — dafür, dass
der Deckel nur sinkt; Anheben nur mit Entscheidung Stefans, (a2) ist dann bewusst einmal rot. DEKLARIERT: „jede Regel als Satz“
und das Bearbeiten von Gate oder JSON.

## 1. Ordnerstruktur

- `src/` — Kern-Code der AI Workforce. Einziger Produktpfad. Einzelheiten je Modul und zu `startvorlagen/`,
  `harness-abgleich/`, `docs/projekt/`, `schemas/`: `docs/architektur/module.md`.
  - Rein, ohne I/O: Projektkarte (`analysiereArchitektur` ist die eine Regel, ob diese Datei beschrieben ist, 1h), Budget, Umfang,
    Regeln des Rückfrage-Kanals (Vorentscheidung und Pfadgrenze fail closed). Arbeitspaket und Umfang sind kein eigener
    Artefakttyp; `baueArbeitspaketBlock` ist die einzige Textquelle für Architekt und Ausführung; neue Auftragsversionen (auch Einrichtung, Budget) nur über `registriereAuftrag`.
  - `src/review-policy` ist die einzige Quelle der Review-Policy; nur leere Befunde ohne Pflichtsatz halten an (1k), alles andere
    wird sichtbar. Der Code-Reviewer liest CLAUDE.md und ARCHITECTURE.md im Stand vor dem Bau. „Review veraltet“ nur über `inhalt`.
  - `src/claude-plugins` ist reine Anzeige, kein Lauf importiert es. `src/plugin-lauf` ist der einzige Weg eines Plugins in den
    Lauf, mit Prüfung vor jedem Lauf (Freigabe gültig, Quelle = `kopie_hash`, Kopie = Prüfbericht) und Lauf-Kopie nur der
    zugeordneten Teile; nur es importiert `src/plugin-kopie` auf dem Startweg (Gate
    f45-f3b1 (f)); Gateway, Fähigkeiten-Start und Controller kennen nur Namen, Ordner und Rückrufe.
  - Budget je Arbeitspaket: DEKLARIERT, fail-open, geprüft nach dem Schritt. Umfangs-Abgleich: nur Hinweis, nie Halt — DEKLARIERT.
    Beide sind kein Workflow-Schreiber.
- `kontrollzustand/` — Kontrollzustand als JSON/JSONL: Checkpoints, Wirkungsmarken, Artefakt- und Lineage-Einträge, Transportpakete, wegwerfbarer Index. Kein Markdown.
- `profiles/` — Profilkonfiguration als JSON. Ein-Ebenen-Modell: je Projekt genau eine vollständige, eigenständige Profildatei; kein Domänen-Profil mit Projekt-Overlay.
- `startvorlagen/` — Startvorlagen als JSON; eine Startvorlage ist kein Profil. Der Werkzeugsatz 'schreibend' trägt eine
  Bash-Allowlist; nacktes Bash und git-Befehle weist der Validator ab (E-F754).
- `harness-abgleich/` — versionierte Harness-Zuordnung; gehört zur Installation, der Kern liest sie nur; das Ergebnis je
  Workflow ist Kontrollzustand.
- `state/` — Gedächtnis des Harness. Trägt keinen Kontrollzustand der Workforce.
- `scripts/` — Prüf- und Hilfsskripte des Harness.
  - Rückweg der Kette: höchstens ein automatischer Rückweg je Stufe, zusammen höchstens `grenzen.max_replans`, sofortiger Halt
    bei denselben Befunden; „Prüfer wiederholen“ zählt nicht. Den Rückweg zu Plan v2 (höchstens einmal, danach kein zweiter
    Advisor, Regel 3a) schreibt der Nachlauf des Advisors im selben Schreibvorgang. Was schreibt, bleibt im Server (F-228). Einzelheiten:
    `docs/architektur/kette.md`.
  - Wachstumsbremse (F45 W1, E-WART-1, F-371): `scripts/leitstand-server.mjs` wächst nicht (Zeilen = Grenze; Grenze und
    Routen-Bestand nur senkbar gegen main); neue Routen dispatchen in `scripts/leitstand/routen-*.mjs`, schreibende Aufrufe bleiben
    im Server und gehen als Rückruf ins Modul; Server-Zeilen eines Pakets werden bis W2 durch Auslagern reiner, nicht schreibender
    Helfer ausgeglichen; neue Routen bis W2 nur im Zwischenmuster: Modul erkennt den Pfad, Server prüft die Methode hinter dem
    CSRF-Haken (DEKLARIERT, F-1131).
    ERZWUNGEN: Zeilenzahl, Literal-/Regex-Dispatch an `pfad`, Vergleich mit main bei lesbarer Referenz. DEKLARIERT: andere
    Dispatch-Formen, Bearbeiten von Gate oder JSON. Einzelheiten: `docs/architektur/wachstumsbremse.md`.
  - Ratsche (F45 W2c-1): Biome-Befunde, Zeilen über 800 und checkJs-Fehler (`scripts/leitstand/`) sinken je Datei
    nur; gelistete und neue Code-Dateien sind formatiert — ERZWUNGEN (`check-ratsche`, gegen main bei lesbarer Referenz);
    DEKLARIERT: Bearbeiten von Gate, JSON, Konfiguration, Unterdrückungen im Code. Einzelheiten: `docs/architektur/ratsche.md`.
- `docs/projekt/` — führende Projektdokumente (Zielfassung, Umsetzungsplan); Projektkontext für `jarvis`/`router` je Projekt-Repo, kein zweiter Speicher (E-M4-2).
- `schemas/` — JSON-Schema (Draft 2020-12) für `kontrollzustand/`, `profiles/` und Rollen-Ergebnisse, geprüft von
  `scripts/check-datenformate.mjs` bzw. den Feature-Gates. claude-code löst ein Ausgabeschema nur für real belegte Schemata ein (Regel 4b).

Rohereignisströme sind gitignoriert und werden aus der Laufakte über ihren Hash referenziert.

## 2. Datenzugriff

- Dateien und Git sind der führende Zustand. Keine Datenbank als führender Zustandsspeicher; ein Index ist wegwerfbar und jederzeit neu erzeugbar.
- Schreibend auf `kontrollzustand/` greift ausschließlich der Kern zu, und nur über die append-only Hash-Kette des Checkpoint Store. Kein Commit pro Zustandsübergang — der Kontrollzustand ist Momentaufnahme im Metadaten-Commit.
- Einzige Ausnahme: `kontrollzustand/.leitstand.lock`, der Instanz-Lock des Leitstand-Prozesses (F-201). Flüchtiger Betriebszustand mit PID, Port und Startzeit — kein Artefakt, keine Lineage, keine Hash-Kette, git-ignoriert, vom Leitstand nur im CLI-Bindeblock vor dem Binden angelegt und beim Prozessende entfernt. Er liegt hier, weil er genau diese Ressource schützt: zwei Serverprozesse auf demselben `kontrollzustand/`. Jede weitere Ausnahme braucht denselben Weg — erst hier, dann im Code.
- Weitere Ausnahmen, außerhalb jedes Repos und Arbeitsordners, kein Kontrollzustand (Einzelheiten:
  `docs/architektur/lokale-dateien.md`):
  - `~/.ai-workforce/faehigkeiten.lokal.json` — geschrieben nur von den Fähigkeiten-/Plugin-Routen auf direkte Eingabe,
    gesperrt während eines Laufs, je Lauf vorher/nachher gehasht (Abweichung = Lauf rot); ungültig (E-F45-7) oder außerhalb
    geändert (F-1061, erst nach Bestätigung im Leitstand) ⇒ jeder Start mit Katalog-Fähigkeiten und die Schreib-Routen gesperrt.
    Plugins sind nur der Rolle `ausfuehrung` zuordenbar (E-F3b-3); eine Plugin-Freigabe gilt nur im Checkout, dessen
    Kontrollzustand den Prüfbericht trägt.
  - `…/plugin-kopien/<plugin-id>/<kopie_hash>/` — geschrieben nur von POST `…/plugins/freigabe` nach geltendem Prüfbericht,
    inhaltsadressiert, nie überschrieben (409), nur `skills/`, `agents/`, `commands/` nach Positivliste, nie Hooks/MCP/LSP,
    gelöscht nur durch Stefan; Prüfläufe startet nur die Workforce-Instanz. `…/plugin-kopien/_lauf/<lauf_kopie_hash>/` — nur vom
    Startweg eines Ausführungsschritts, nie gelöscht; vorhanden mit anderem Inhalt ⇒ der Lauf startet nicht; `_` beginnt nie
    eine Plugin-id.
  - `~/.ai-workforce/faehigkeiten.stand.json` — geschrieben nur vom Wächter, atomar, gelesen nur beim Serverstart; Startregel
    fail-closed; kein Schutz gegen einen Prozess mit Nutzerrechten.
- `profiles/` ist die alleinige editierbare Quelle für Profilinhalte. Der Kontrollzustand hält davon nur eine gepinnte Referenz aus Pfad, Hash und Version, nie eine Kopie.
- Artefakte werden versioniert, nicht überschrieben. Version ist der Inhalts-Hash; die einzige Stelle, die den aktuellen Stand benennt, ist der letzte Checkpoint.
- Produktdateien im freigegebenen Baupfad ändert ausschließlich das Ausführungswerkzeug. Der Kern liest sie read-only.
  Einzige Ausnahme: der Arbeitsordner je Ablauf — Worktree nur über git angelegt und entfernt, `npm ci --ignore-scripts`;
  nach einem Lauf der Rolle `ausfuehrung` löscht der Kern ausschließlich geprüfte reguläre Dateien der Löschliste, nur
  innerhalb, nie unter `.git`, `.claude/` oder `kontrollzustand/`; außerdem übernimmt bzw. verwirft er Fähigkeit-Vorschläge
  nur auf Klick (`.claude/`; DEKLARIERT, Pfadprüfung ERZWUNGEN); im Projektordner bleibt der Kern lesend, außer der
  Feature-Akte, `docs/projekt/roadmap.json`, `roadmap-ausnahmen.json` und `docs/STATUS.md` (Status-Wort) auf Eingabe (F45 B5); ANGENOMMEN schreibt die laufende Workstream-Zeile der Akte im Laufort (R7, Arbeits- oder Projektordner). Der Fingerabdruck des Review-Stands
  schreibt weder Index noch `.git/objects`, startet keinen Filter-Treiber. Einzelheiten: `docs/architektur/arbeitsordner.md`.
- Stefans Claude-Code-Bestand liest der Leitstand nur lesend; unser Code schreibt dort nie (Gate f45-f3a (b)). Eine Abweichung
  im Plugin-Datenordner nach einem Lauf ist ein Befund, kein Abbruch.
- Pauschales Stagen ist in allen Git-Schritten ausgeschlossen.

## 3. Auth

Kein Mehrbenutzerbetrieb, keine Anmeldung. Was hier geschützt wird, ist die Autorisierung, und sie trägt zwei voneinander unabhängige Schichten:

1. **Authorization Boundary** — Bezeugungen menschlicher Freigaben liegen außerhalb der Schreibreichweite des Ausführungswerkzeugs, in einem eigenen Git-Repository. Der Checkpoint trägt Referenz und Hash; validiert wird immer gegen den geschützten Ort, nie gegen die Referenz allein. Eine im Produkt-Repository sichtbare Kopie ist niemals alleinige Autoritätsquelle.
2. **Invocation Policy / Protection Validator** — vor jeder Execution mit Schreibwirkung, lokal und ohne Werkzeugaufruf: ist die Werkzeugkonfiguration gültig und existiert jedes von ihr referenzierte Schutzskript mit dem erwarteten Hash, und liegt ein gültiger Wirksamkeitsnachweis für den Gültigkeitsschlüssel vor. Scheitert eine der beiden Prüfungen, startet keine Execution.

Eine abweichende installierte CLI-Version sperrt keinen Lauf, der Leitstand zeigt nur einen Hinweis (`cliHinweis`, je Projekt
`projektCliHinweis`; F-1136 (10) = B): E-188 vergleicht die Deklaration der Startvorlage mit dem Nachweis.

Der Kern erzeugt niemals ein Freigabeartefakt. Autorisierungen entstehen ausschließlich aus direkter menschlicher Eingabe.

Ein Pflichtdokument, das nur eine der beiden Schichten kennt, kann versehentlich unterlaufen werden — deshalb stehen beide hier.

**Rückfrage-Kanal im Lauf** (F45 B2b-3b; Einzelheiten, Anzeige, Abnahme, Nachweislauf: `docs/architektur/rueckfrage-kanal.md`).
Eine Bedien-Grenze für das Modell, keine Sicherheitsgrenze gegen selbst ausgeführten Code. Grenzen:
- Standard an (seit F45 B2b-3b-2b-2b-2b-1), aus nur mit `LEITSTAND_RUECKFRAGE=0`, jeder andere Wert ⇒ aus (fail-closed); nur über
  `rueckfrageOptionFuer`; aus ⇒ Argv und Auftragstext aller Läufe bitgleich — ERZWUNGEN (Gate f45-b2b3b2b2a-einschalten (o1)(o2)). Jede Instanz hat ihre eigene
  Vermittlung; ein Token einer anderen Instanz ⇒ 403. Keine Regelzeile des Auftrags beginnt mit „- [x]“.
- Die Vorentscheidung liegt im Leitstand, nicht in der CLI; Sperr-, Deny-Regeln und Hooks greifen vorher. Nur ein Bash-Befehl
  geht an Stefan (nur „einmal erlauben“ oder „ablehnen“); alles andere und jeder Befehl mit Steuer- oder Formatzeichen wird ohne
  Rückfrage abgelehnt. Die Zeichenregel ist ERZWUNGEN (Gate f45-b2b3b2a-absicherung (z1)).
- Höchstens 20 offene Rückfragen und 200 Protokolleinträge je Lauf — ERZWUNGEN (Gate f45-b2b3b2a-absicherung (o1)).
- Token gibt kein Antwortrecht — ERZWUNGEN (Gate f45-b2b3b1-rueckfrage (r2)(r3)): es gilt nur zwischen Start und Ende des Laufs
  und nur zum Fragen und Warten. Jede Rückfrage-ID ist genau einmal beantwortbar, nur offene Rückfragen offener Läufe.
- Nur Stefan antwortet — DEKLARIERT (E-B7 = A): die Antwort-Route ist die einzige rechtegebende Route, die während eines Laufs
  offen bleibt (Abweichung vom Sperrmuster F-1061); jeder lokale Prozess kann sie aufrufen; die `herkunft` je Antwort ist ein
  Hinweis, kein Schutz. Ebenso DEKLARIERT: die Liste `entschieden` ist ohne Token lesbar; der zweite Schritt der R3-Sichtung
  ist eine Bedien-Hürde; Frist und timeout im Nachweislauf.
- Anzeige nur als Text (escaped), täuschende Zeichen maskiert; einziger Schreiber der Kanal-Gruppe ist `public/leitstand/rueckfrage-kanal.js`.
- Wartegrenze 10 min, Ende spätestens mit dem Lauf; jeder Fehler im Skript endet als Ablehnung, nie als Erlaubnis.

## 4. Fehlerbehandlung

- Ein Werkzeuglauf hat genau drei terminale Ausgänge: `ERFOLGREICH`, `VERWEIGERT`, `FEHLGESCHLAGEN`. Klassifikationsreihenfolge: ungültige Beobachtungsbasis → `FEHLGESCHLAGEN`; gültige Verweigerung → `VERWEIGERT`; sonst bei erfüllten Erfolgskriterien → `ERFOLGREICH`. Ein allgemeines Erfolgsflag überstimmt nie eine konkrete Verweigerung.
- Rückfrage-Kanal (Einzelheiten: `docs/architektur/rueckfrage-kanal.md`): eine Ablehnung allein durch Stefan ergibt
  `ERFOLGREICH` mit `daten.abgelehnt_durch_stefan`, jede andere bleibt `VERWEIGERT` — Regel insgesamt DEKLARIERT (§3, „Nur Stefan
  antwortet“). ERZWUNGEN darin: der Speicherstand der Vermittlung ist Quelle der Wahrheit — weicht die Datei ab oder fehlt der
  Speicherstand, gilt „nicht nur Stefan“; R1 — eine Ablehnung zählt nur mit dem eindeutigen Ablehnungstext im tool_result
  (`ablehnung_hash`; Annahme: kein Projekt-Hook gibt einen von außen beeinflussbaren Text ohne Präfix zurück; Voraussetzung, dass
  die CLI ihn wörtlich übernimmt, F-1128 (4); wer in den stdout der CLI schreibt, umgeht die Klassifikation — DEKLARIERT);
  `lauf_ende` zählt genau die beim Lesen offenen Rückfragen. Nach einer Ablehnung durch Stefan läuft die Löschliste nicht (R2).
  Ohne Kanal bleiben `daten` bitgleich.
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
| CRLF in Dateien, die der Kern schreibt | Der Hash beschreibt die Bytes auf der Platte; der Kern schreibt LF | bestehende Feature-Akte behält ihr Zeilenende (F45 B5a-1) |
| Laufergebnis aus Konsolentext ableiten | Beobachtbarkeit ausschließlich aus strukturierter Laufausgabe | keine |
| Zwei gleichzeitig aktive Arbeitsstränge | Genau ein aktiver Arbeitsstrang; keine Sperren, kein paralleler Zustand | keine |
| `any` | Die Typprüfung ist Teil der Definition of Done | begründeter Einzelfall mit Kommentar nach `docs/kommentar-standard.md` |

## 8. Definition of Done

Siehe `CLAUDE.md`. Projektspezifische Ergänzungen hier.

Projektspezifisch zusätzlich:
- Jede Änderung am Kontrollzustand ist über den Checkpoint Store gelaufen; die Hash-Kette ist append-only geblieben.
- Eine neu behauptete Grenze trägt ihren Durchsetzungsgrad. Ohne kalibrierten Rot- und Grün-Fall wird sie nicht `ERZWUNGEN` genannt.
- Neu entstandene Rohereignisströme sind gitignoriert.
