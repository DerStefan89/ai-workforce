# Design-Vorlagen „Design-Umbau nach WS-8“

Verbindliche Referenz für den Design-Nachbau (claude/532, 538–540). Stand: 02.10.2026, aus den veröffentlichten Design-Canvases exportiert.

- die `.webp`-Dateien in diesem Ordner — eine Datei je Ansicht, 1440 px breit, Desktop dunkel. **Das ist die Referenz für Claude Code und design-guardian.**
- `quelle/` — Markup der Canvases (`.dc.html`) für exakte Werte (Farben, Abstände, Schriftgrößen, Texte). Nicht ausführbar ohne Design-Laufzeit; nur lesen, nicht ins Produkt kopieren.

Seitenspezifikation: docs/design/abgleich-f46.md.

Regeln: `[n]`, `[…]` und `[Platzhalter]` sind Platzhalter, nie ins Produkt übernehmen. Hell, mobil, reduzierte Bewegung und 200 % Zoom leitet der Umbau aus den Tokens ab.

| Nr | Bereich / Route | Ansichten (die .webp-Dateien in diesem Ordner) |
|---|---|---|
| 01 | Workforce `#/capabilities` | workforce-harness: Main (Harness-Aufbau), Library, Bearbeiten |
| 02 | Produktübersicht `#/dashboard` | produktuebersicht: Main |
| 03 | Roadmap `#/roadmap` | roadmap: Main |
| 04 | Auftrag anlegen `#/projekt` | auftrag-anlegen: Main |
| 05 | Chat, Dock, Kopfleiste | jarvis-terminal: Zugang (Dock), Main (große Ansicht + Terminal) |
| 06 | Entwicklung: Code, Tech Debt & Prozess | entwicklung-code: Main (Code), TechDebt |
| 07 | Eintrag im Detail `#/workboard/<id>` | eintrag-detail: Main (Feature), Workstream, Bug |
| 08 | Live-Ansicht `#/runs/<laufId>` | live: Main (arbeitet), Main-nichts-laeuft |
| 09 | Entscheidungen `#/attention` | entscheidungen: Main (Liste), Entscheiden (Freigabe), Entscheiden-Abnahme, Projektakte |
