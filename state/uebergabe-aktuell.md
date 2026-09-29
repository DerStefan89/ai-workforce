# Aktuelle Übergabe
Wird am Ende jeder Challenger-Runde vollständig überschrieben. Historie: Git-Log dieser Datei.
Stand: 29.09.2026.

## Stand
F36 "Capability Library wirksam machen" IN_ARBEIT. Gemergt: WS-0, WS-1, WS-4, WS-1b, WS-2 (#271: MCP-Weg; Skill/Agent in der Ausführung wegen S6 bewusst aus), Spike S7 (#272), Gedächtnislücken (#273), Datennachtrag (dieser PR).
S7: Die Zusatz-Skills sind CLI-eingebaut, nicht Nutzer-Skills. E-F36-8 = B ("eigener Raum") hält mit Startkombination V4a. Challenger-Präzisierung: "sichtbar, aber gesperrt" reicht für AK4. F-791 (1)–(5) sind Bauvorgaben für WS-5.

## Nächste Schritte
1. Challenge WS-3 Empfehlung: zwei Listen am ZWINGEND-Start ("Wird genutzt" / "Passt, nicht installiert" mit Lizenz, Kosten, Wirkung), Rangfolge und Obergrenze nach F-788 (höchstens 3 je Liste, installiert vor nicht installiert, spezifischste Bedingung zuerst), befüllt mcpEintraege aus WS-2, Stack-Liste zum Architekten, okf-agent-memory auf Harness-Kandidat prüfen.
2. Bau WS-3.
3. Challenge und Bau WS-5 Installation + V4a-Start + F-791 (1)–(5). Offene QA-Punkte: Frontmatter-Namen, .claude/commands, Gate auch für Plugins/MCP, Scan-Umfang, mehrere --add-dir, zwei Ort-B-Einträge gleichen Namens; Abbruchkriterium für den Reallauf festlegen.
4. Reallauf haushaltsbuch2 (Vorschlag: Playwright plus frontend-design) → Review-Pass → Abnahme F36.
5. Danach: Fixpaket (F-764 zuerst; F-765/757, F-767, F-748/751, F-755, F-762) → "Projekt aufrufen/anzeigen" → Scout Datenanalyse → Design-Schnitt (F-725) → F30.

## Offene Entscheidungen Stefan
F-766 (Kontrollzustand von Projekten gitignored).

## Bedienregeln
- Claude Code committet und pusht in ai-workforce nicht selbst (commit-guard F-787, Ablauf F-789); das weicht bewusst von CLAUDE.md 'Iterationsende' ab, siehe F-799.
- Stefan committet und pusht im eigenen PowerShell-Fenster, ohne PR.
- Der Challenger prüft per Hash; erst dann PR (F-789).
- TERMINAL-Blöcke mit absoluten Pfaden.
- Challenger nur lesend: keine Worktrees einbinden, kein mutierendes git.
