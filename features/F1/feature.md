# F1 — Checkpoint Store

## ID

F1

## Titel

Checkpoint Store

## Status

Status: ABGESCHLOSSEN

Gültige Status-Werte (geprüft vom Gate, siehe A3a–e in
`features/AF-F001/feature.md`): `ENTWURF, READY_FOR_TECH,
WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN,
BLOCKIERT, ABGEBROCHEN`. Ein fehlendes `Status:`-Feld oder ein Wert
außerhalb dieser Menge gilt als Fehler.

## Ziel

Der Checkpoint Store stellt den persistenten, prüfbaren Kontrollzustand
eines Vorhabens so bereit, dass die AI Workforce nach Prozessabbruch
oder Neustart ausschließlich auf einen zuvor vollständig gespeicherten
und validierten Checkpoint zurückgreifen kann. Ein unterbrochener oder
unvollständig persistierter Zustand darf weder als gültig gelten noch
automatisch fortgesetzt werden.

## Scope

- Persistente Ablage des in Feature 0 definierten Kontrollzustands auf
  Basis der dort festgelegten JSON/JSONL-Datenformate.
- Eine eindeutig erkennbare Struktur zur Ablage und Zuordnung von
  Checkpoints zu einem Vorhaben bzw. Lauf.
- Schreiben eines Checkpoints so, dass dieser erst nach vollständiger
  Persistierung als gültiger Wiederaufnahmepunkt betrachtet werden kann.
- Laden eines gespeicherten Checkpoints.
- Validierung gespeicherter Checkpoints beim Laden bzw. beim Start der
  Anwendung.
- Unterscheidung zwischen gültigen Checkpoints und nicht verwendbaren,
  unvollständigen oder ungültigen Zuständen.
- Ermittlung des zuletzt gültigen Checkpoints, von dem eine
  Wiederaufnahme grundsätzlich möglich ist.
- Strukturierte Laufausgabe für Speichern, Laden, Validierung sowie
  erkannte ungültige oder unterbrochene Zustände.
- Getrennte Persistierung des Kontrollzustands von den durch
  KI-Positionen bearbeiteten Produktdateien.

Technische Konkretisierung (Ablageort, Hash-Kette, Gate-Muster,
Windows-Rename-Nachweis): `state/plan-v1-feature1-checkpoint-store.md`.

## Nicht-Ziele

- Automatische Wiederaufnahme oder automatischer Neustart eines
  unterbrochenen Laufs.
- Entscheidung darüber, ob ein unterbrochener Lauf tatsächlich
  fortgesetzt, verworfen oder anderweitig behandelt wird.
- Ausführung von Aufgaben, Agenten, Modellen oder externen Werkzeugen.
- Speicherung oder Verwaltung der eigentlichen Produktdateien.
- Einführung einer führenden Datenbank oder eines anderen führenden
  Zustands neben Dateien und Git.
- Benutzeroberfläche zur Anzeige oder Verwaltung von Checkpoints.
- Historienanalyse, Reporting oder Visualisierung vergangener Läufe.
- Bereinigung, Archivierung oder automatische Löschung alter
  Checkpoints.
- Festlegung zusätzlicher Architektur-, Technologie- oder
  Infrastrukturentscheidungen über die vorgegebenen Architecture
  Drivers hinaus.
- Kontrollzustand wird nicht pro Checkpoint-Übergang committet, sondern
  bleibt Momentaufnahme im Metadaten-Commit (A2). Checkpoint Store
  schreibt in den Arbeitsbaum, committet aber selbst nicht — kein
  `git add && git commit` im Schreibpfad.
- Die bestehende Zwischenstand-Mechanik (`state/zwischenstand/`, Zweck:
  Claude-Code-Sitzungs-Kontext-Übergabe) wird nicht zum
  Checkpoint-Store-Ersatz umgewidmet und von diesem Feature nicht
  verändert — unterschiedliche Ebenen (Produkt-Laufzeit vs.
  Entwicklungs-Sitzung).
- Keine Wirkungsmarke-Logik in diesem Feature — die Hülle bleibt für den
  künftigen Wert `wirkungsmarke` im `typ`-Feld ergänzbar, aber nicht
  gebaut.

## Akzeptanzkriterien

1. Ein gültiger Kontrollzustand kann als Checkpoint persistiert und
   anschließend wieder geladen werden, ohne dass seine für die
   Wiederaufnahme relevanten Inhalte verloren gehen oder verändert
   werden.
2. Ein Checkpoint wird erst dann als gültiger Wiederaufnahmepunkt
   behandelt, wenn seine Persistierung vollständig abgeschlossen ist.
3. Wird die Persistierung eines Checkpoints vor ihrem vollständigen
   Abschluss unterbrochen, darf der entstandene Zustand nach einem
   Neustart nicht als gültiger Checkpoint akzeptiert werden.
4. Beim Start bzw. Laden werden vorhandene Checkpoints validiert. Ein
   Checkpoint, der die für den Kontrollzustand definierten
   Anforderungen nicht erfüllt, wird als ungültig erkannt und nicht zur
   Wiederaufnahme verwendet.
5. Sind mehrere gespeicherte Checkpoints vorhanden, kann der zuletzt
   gültige Checkpoint eindeutig bestimmt werden.
6. Existiert kein gültiger Checkpoint, wird dies eindeutig erkannt. Es
   findet keine automatische Wiederaufnahme aus einem ungültigen oder
   unvollständigen Zustand statt.
7. Ein als unterbrochen erkannter Lauf wird nicht automatisch neu
   gestartet oder fortgesetzt.
8. Kontrollzustand und Produktdateien bleiben voneinander getrennt. Das
   Schreiben oder Lesen eines Checkpoints verändert keine
   Produktdateien.
9. Speichern, erfolgreiches Laden, Validierungsfehler und erkannte
   nicht verwendbare Checkpoints erzeugen strukturierte Laufausgaben,
   die maschinell ausgewertet werden können.
10. Nach einem simulierten Prozessabbruch zwischen zwei Checkpoints kann
    die Anwendung nach erneutem Start ausschließlich den letzten zuvor
    vollständig persistierten und validierten Checkpoint als möglichen
    Wiederaufnahmepunkt bestimmen.
11. Der von Checkpoint Store geschriebene `payload`-Inhalt eines
    Kontrollzustand-Eintrags enthält keine Kopie von Profilinhalten —
    nur die in F0 definierte Referenz (Pfad, Hash, Version) oder
    andere, nicht-profilbezogene Nutzdaten. AC11 verhindert die hier
    beschriebene Profilkopie-Lücke präventiv — es gab nie einen realen
    Finding-Eintrag dazu: `state/findings.md` endet real bei `F-019`,
    kein `F-020` existiert im Repo (Advisor-Befund B1,
    `state/advisor-findings-feature1-checkpoint-store.md`).

Technische Ausprägung dieser Kriterien als A1–An (Dateien, Modul,
Gate-Skript, Doku-Einträge): `state/plan-v1-feature1-checkpoint-store.md`
Abschnitt 7.

## Zuordnung

Meilenstein 1 (einziger in Fassung 1), Deliverable 1 —
Kontrollzustand-Fundament, Feature #1 — Checkpoint Store: „Reine
Persistenzschicht, keine Abhängigkeit auf andere Module"
(`docs/projekt/umsetzungsplan-fassung-1.md` Abschnitt 2, Tabellenzeile 1).

## Dependencies

- Hard, erfüllt: F0 (Datenformate) — gemerged, PR #18. Liefert
  `kontrollzustand/`, `profiles/`, die Kontrollzustand-Hülle
  (`schemas/kontrollzustand.schema.json`) und `ADR-0002`/`ADR-0004`.
- Keine Rückabhängigkeit: Authorization Boundary (Deliverable 1, #3)
  läuft laut Umsetzungsplan parallel; Execution Controller (Deliverable
  1, #8) folgt danach und orchestriert u. a. den Checkpoint Store —
  nicht umgekehrt.

## Workstream-Liste

- WS1 — Checkpoint Store umsetzen (Payload-Schema, Schreib-/Lade-/
  Validierungsmodul, Hash-Kette, Gate, Doku-Einträge). Einziger
  Workstream — reine Persistenzschicht ohne fremde Abhängigkeit, eine
  Aufteilung wäre unbegründete Vorab-Abstraktion (YAGNI); siehe
  Zuschnitt-Bewertung in `state/plan-v1-feature1-checkpoint-store.md`
  Abschnitt 6.

## Entscheidungs-Referenzen

- `docs/adr/datenformate-kontrollzustand-und-profile.md` (ADR-0002) —
  Format- und Referenzvertrag, den der Checkpoint Store befüllt, ohne
  ihn zu verändern.
- `ARCHITECTURE.md` Abschnitt 2, Zeile 39–41 — bindend, nicht neu
  verhandelt: Schreibzugriff auf `kontrollzustand/` ausschließlich über
  eine append-only Hash-Kette des Checkpoint Store; kein Commit pro
  Übergang; Artefakte werden versioniert, nicht überschrieben, Version
  ist der Inhalts-Hash.
- `docs/projekt/zielfassung.md`, Abschnitt „16.2 Modulschnitt"
  (Checkpoint Store) und Entscheidungen A5/A8 — Checkpoint und
  Wirkungsmarke teilen sich eine Hash-Kette (Wirkungsmarke bleibt hier
  ungebaut); Versionierungssemantik ist inhaltsadressiert, kein
  mutierbarer Zeiger.
- `state/findings.md` — kein `F-020` im Repo vorhanden (endet bei
  `F-019`); AC11 ist eine präventive Ergänzung ohne realen
  Finding-Bezug, siehe Advisor-Befund B1.
- `state/plan-v1-feature1-checkpoint-store.md` — technischer Plan,
  Ergebnis dieser Feature-Akte plus Challenger-Ergänzungen.

## Spec-Referenz

Noch keine — `spec.md` entsteht über den bestehenden Skill
`spec-schreiben`, falls die Ausführungsrolle das für den Umfang dieses
Features für nötig hält (Vorbild: `specs/F0/spec.md`).
