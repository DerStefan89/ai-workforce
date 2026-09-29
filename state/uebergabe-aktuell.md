# Aktuelle Übergabe
Wird am Ende jeder Challenger-Runde vollständig überschrieben. Historie: Git-Log dieser Datei.
Stand: 29.09.2026.

## Stand
F36 "Capability Library wirksam machen" IN_ARBEIT. Gemergt: WS-0, WS-1, WS-4, WS-1b, WS-2 (#271: MCP-Weg; Skill/Agent in der Ausführung wegen S6 bewusst aus), Spike S7 (#272).
S7: Die Zusatz-Skills sind CLI-eingebaut, nicht Nutzer-Skills. E-F36-8 = B ("eigener Raum") hält mit Startkombination V4a. Challenger-Präzisierung: "sichtbar, aber gesperrt" reicht für AK4. F-791 (1)–(5) sind Bauvorgaben für WS-5.

## Nächste Schritte
1. Dieser PR (Gedächtnislücken) → Challenger-Prüfung → PR/Merge.
2. Datennachtrag, eigener Branch:
   - Katalog, Status OFFEN: Code-Review-, Claude-Code-Setup-, Code-Modernization-Plugin, WebDesignGuidelines, Image to code, i-have-adhd, Browser Use.
   - Stack-Liste: ScrapeGraph AI, Google Trends MCP, MixPost, Scientific-agent-skills.
   - Keine Scraper für personenbezogene Daten.
   - Neue Findings: Scout "Datenanalyse-Bausteine" vor F30 (P2), DSGVO-Ausschlusskriterium im Recherche-Filter (P3).
   - Bei F-780 Doberman vermerken.
3. WS-3 Empfehlung: zwei Listen am ZWINGEND-Start, F-788 Obergrenze 3, befüllt mcpEintraege, Stack-Liste zum Architekten.
4. WS-5 Installation + V4a-Start + F-791 (1)–(5); vorher Challenge der offenen QA-Punkte (Frontmatter-Namen, .claude/commands, Gate auch für Plugins/MCP, Scan-Umfang, mehrere --add-dir, zwei Ort-B-Einträge gleichen Namens) und des Abbruchkriteriums für den Reallauf.
5. Reallauf haushaltsbuch2 → Abnahme F36.
6. Danach: Fixpaket (F-764 zuerst; F-765/757, F-767, F-748/751, F-755, F-762) → "Projekt aufrufen/anzeigen" → Scout → Design-Schnitt (F-725) → F30.

## Offene Entscheidungen Stefan
F-766 (Kontrollzustand von Projekten gitignored).

## Bedienregeln
- Claude Code committet und pusht in ai-workforce nicht selbst (commit-guard F-787, Ablauf F-789); das weicht bewusst von CLAUDE.md 'Iterationsende' ab, siehe F-799.
- Stefan committet und pusht im eigenen PowerShell-Fenster, ohne PR.
- Der Challenger prüft per Hash; erst dann PR (F-789).
- TERMINAL-Blöcke mit absoluten Pfaden.
- Challenger nur lesend: keine Worktrees einbinden, kein mutierendes git.
