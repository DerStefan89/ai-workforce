# Arbeitsweise — AI Workforce

F33 WS-1 (E-M4-2). Kurzfassung von `CLAUDE.md` für die lesenden Rollen
`jarvis` und `router` — beide beantworten Status-, Auftrags- oder
Klassifikationsfragen, ohne selbst Code zu bauen; sie müssen die
Arbeitsweise kennen, um eine Frage dazu richtig einzuordnen. Bindend
bleibt `CLAUDE.md`/`ARCHITECTURE.md`; diese Datei ist keine eigene
Sollquelle.

## Positionen und Rollenverträge

Sechs Rollen, jede mit eigenem, maschinenlesbarem Vertrag
(`src/rollen/index.ts`, `ROLLENVERTRAEGE`): `architecture-advisor` (Plan
vor dem Bau prüfen), `ausfuehrung` (baut und ändert Code), `code-reviewer`
(fertigen Code prüfen), `qa` (Akzeptanztests/Randfälle definieren),
`router` (klassifiziert einen Auftrag, schlägt Workflow-Vorlage vor),
`jarvis` (beantwortet eine natürliche Eingabe im Projektkontext). Jede
Rolle hat einen erlaubten Werkzeugsatz, erlaubte Worker und ein erlaubtes
Ausgabeschema — vor jedem Lauf geprüft, keine Ausnahme durch Aufruf.

## Iterationsprinzip

Jede Iteration ist klein, prüfbar und abgeschlossen — kein großes
Funktionspaket auf einmal, erst planen, dann umsetzen. Ein Task nach dem
anderen pro Arbeitsverzeichnis; ein Schreiber pro Arbeitsverzeichnis.
Iterationsende heißt: Status prüfen, Freigabe einholen, committen und
pushen.

## Freigaben und Prüfrollen

Prüfrollen (`architecture-advisor`, `code-reviewer`, `qa`,
`design-guardian`) sind reine Leser ohne Schreibrechte — sie melden
Befunde, räumen sie nicht selbst weg. Ein Reviewer-/QA-Pass mit frischem
Kontext ist vor Freigabe/Commit Pflicht, nicht optional und nicht
nachträglich holbar. Kein Commit ohne explizite menschliche Freigabe; Git
bleibt beim Menschen (E-M4-5) — der Kern committet, pusht oder öffnet nie
selbst einen Pull Request.

## Entscheidungsregel bei Unsicherheit

Reihenfolge: Design-Referenz respektieren (nur UI-Projekte) · aktuellen
Scope laut `docs/STATUS.md` einhalten · Wartbarkeit bevorzugen ·
Komplexität reduzieren · Entscheidung dokumentieren statt sie
stillschweigend in Code zu verwandeln.

## Definition of Done (Auszug)

Typisiert, kein `any` · Fehler- und Leerzustände berücksichtigt ·
`npm run check` grün · Reviewer-/QA-Pass durchlaufen · keine Commits ohne
Freigabe. Vollständige Liste: `CLAUDE.md` Abschnitt "Definition of Done".

## Status-Format

Jede Ausgabe der Ausführungspositionen endet mit einem Status-Block
(Freigegeben / Freigegeben mit Hinweisen / Nicht freigegeben / Blockiert)
und dem nächsten sinnvollen Schritt.
