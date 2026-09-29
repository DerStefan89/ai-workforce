# Aktuelle Übergabe
Wird am Ende jeder Challenger-Runde vollständig überschrieben. Historie: Git-Log dieser Datei.
Stand: 29.09.2026.

## Stand
F36 "Capability Library wirksam machen" IN_ARBEIT. Gemergt: WS-0, WS-1, WS-4, WS-1b, WS-2 (#271: MCP-Weg; Skill/Agent in der Ausführung wegen S6 bewusst aus), Spike S7 (#272), Gedächtnislücken (#273), Datennachtrag (#274).
WS-3 Empfehlung gebaut, nicht gemergt (Branch feat/f36-ws3-empfehlung): baueEmpfehlung (zwei Listen, Rangfolge, höchstens 3 je Liste, F-788 erledigt), Anzeige am ZWINGEND-Start im Leitstand, "Anzeige = Start" über empfehlungIds (Abweichung → Start abgelehnt), angezeigte MCPs als mcpEintraege, eine Zeile im Auftrag, Stack-Auszug für den Architekten bei offenem Stack, Gate check-f36-ws3-empfehlung. Neu: F-806 (Pfadquelle), F-807 (wirkung ≠ lokal mit anwendbar_wenn, abgefangen). F-804 erledigt.

## Nächste Schritte
1. Challenger prüft WS-3 per Hash → PR.
2. Danach Challenge WS-5 Installation + V4a-Start + F-791 (1)–(5). Offene QA-Punkte: Frontmatter-Namen, .claude/commands, Gate auch für Plugins/MCP, Scan-Umfang, mehrere --add-dir, zwei Ort-B-Einträge gleichen Namens; Abbruchkriterium für den Reallauf festlegen.
3. Reallauf haushaltsbuch2 (Vorschlag: Playwright plus frontend-design) → Review-Pass → Abnahme F36.
4. Danach: Fixpaket (F-764 zuerst; F-765/757, F-767, F-748/751, F-755, F-762) → "Projekt aufrufen/anzeigen" → Scout Datenanalyse → Design-Schnitt (F-725) → F30.

## Offene Entscheidungen Stefan
F-766 (Kontrollzustand von Projekten gitignored).

## Bedienregeln
- Claude Code committet und pusht in ai-workforce nicht selbst (commit-guard F-787, Ablauf F-789); das weicht bewusst von CLAUDE.md 'Iterationsende' ab, siehe F-799.
- Stefan committet und pusht im eigenen PowerShell-Fenster, ohne PR.
- Der Challenger prüft per Hash; erst dann PR (F-789).
- TERMINAL-Blöcke mit absoluten Pfaden.
- Challenger nur lesend: keine Worktrees einbinden, kein mutierendes git.
