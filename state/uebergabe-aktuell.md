# Aktuelle Übergabe
Wird am Ende jeder Challenger-Runde vollständig überschrieben. Historie: Git-Log dieser Datei.
Stand: 29.09.2026.

## Stand
F36 "Capability Library wirksam machen" IN_ARBEIT. Gemergt: WS-0, WS-1, WS-4, WS-1b, WS-2 (#271: MCP-Weg; Skill/Agent in der Ausführung wegen S6 bewusst aus), Spike S7 (#272), Gedächtnislücken (#273), Datennachtrag (#274), WS-3 Empfehlung (#275).
WS-5 geteilt in WS-5a (MCP-Installation) und WS-5b (Skill/Agent). E-F36-9 = A (Stefan, 29.09.2026): Registry-Pakete nur aus herkunft.paket, exakte Version (Zielfassung v1.37).
WS-5a gebaut, nicht gemergt (Worktree aiw-f36-ws5a, Branch feat/f36-ws5a-mcp-installation): herkunft.paket + installation_vorlage im Katalog (playwright-mcp: npm:@playwright/mcp, bin cli.js, 8 Werkzeuge; weiter OFFEN, ohne installation), vorschau_url im Projektregister ({projekt_origins}/{ausgabe_ordner}, ohne URL fail-closed nicht im Lauf), "Freigeben & installieren" (Vorbereiten per npm view → Bestätigung → npm install --ignore-scripts exakte Version → Lockfile/bin/Serverstart geprüft → erst dann installation + FREIGEGEBEN), F-808 (empfehlungIds = id@hash), navigate-Adressen in der Beobachtung, Empfehlung im Poll zwischengespeichert. Gate check-f36-ws5a-installation; echter Nachweis features/F36/nachweis-ws5a-installation/ (@playwright/mcp 0.0.83); Render-Nachweis features/F36/nachweis-ws5a-ui/. Installieren ist an den angezeigten Eintrag gebunden (eintragHash), die Installationsrouten lehnen Anfragen fremder Seiten ab (403). Neu: F-809 (erledigt), F-810 (erledigt), F-811 (erledigt), F-812 (offen), F-813 (offen, übrige POST-Routen ohne Herkunftsprüfung). F-808 erledigt, F-786 Teil mcp erledigt.
Außerhalb der erlaubten Pfade angepasst (zwingende Folge von F-808): scripts/check-f36-ws3-empfehlung.mjs schickt jetzt die empfehlungId statt der nackten id. Nicht angepasst (außerhalb der Pfade): schemas/kontrollzustand-laufakte-payload.schema.json kennt beobachtung.navigate_adressen noch nicht.

## Nächste Schritte
1. Challenger prüft WS-5a per Hash → PR.
2. Challenge WS-5b: V4a-Start + F-791 (1)–(5), Ort B für Skill/Agent, Prüfung der init-Zeile, Scan vor dem Start; offene QA-Punkte (Frontmatter-Namen, .claude/commands, Gate auch für Plugins/MCP, Scan-Umfang, mehrere --add-dir, zwei Ort-B-Einträge gleichen Namens); Rot-Fall "fremde Origin wird verweigert" mit installiertem playwright-mcp; Abbruchkriterium für den Reallauf festlegen.
3. Reallauf haushaltsbuch2 nach WS-5b mit playwright-mcp + frontend-design (vorschau_url im Projektregister setzen) → Review-Pass → Abnahme F36.
4. Danach: Fixpaket (F-764 zuerst; F-765/757, F-767, F-748/751, F-755, F-762) → "Projekt aufrufen/anzeigen" → Scout Datenanalyse → Design-Schnitt (F-725) → F30.

## Offene Entscheidungen Stefan
F-766 (Kontrollzustand von Projekten gitignored). Schema-Zwilling navigate_adressen (Laufakten-Payload-Schema) nachziehen: ja/nein.

## Bedienregeln
- Claude Code committet und pusht in ai-workforce nicht selbst (commit-guard F-787, Ablauf F-789); das weicht bewusst von CLAUDE.md 'Iterationsende' ab, siehe F-799.
- Stefan committet und pusht im eigenen PowerShell-Fenster, ohne PR.
- Der Challenger prüft per Hash; erst dann PR (F-789).
- TERMINAL-Blöcke mit absoluten Pfaden.
- Challenger nur lesend: keine Worktrees einbinden, kein mutierendes git.
- Nach einer echten Installation über den Leitstand ist ressourcen.json geändert — Stefan committet (F-812).
