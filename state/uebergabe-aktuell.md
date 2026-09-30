# Aktuelle Übergabe
Wird am Ende jeder Challenger-Runde vollständig überschrieben. Historie: Git-Log dieser Datei.
Stand: 30.09.2026.

## Stand
**Fixpaket PR 2 nach F36 (F-823, F-824, F-825, F-826, F-828, F-830, F-832, F-833 behoben; Render-Nachweis F-768 nachgebessert, neue Nachweise in `features/F36/nachweis-fixpaket-pr2/`) ist gebaut, aber nicht committet.** Branch `fix/fixpaket-f36-pr2`, Worktree `aiw-fix-pr2`, Basis `ddabcf7`. Fixpaket PR 1 (F-764, F-827, F-768) ist als #284 gemergt. Neu: F-841 (Challenger liest vor Vorgaben zu Artefakt-Formaten den Schemazweig).

**F36 „Capability Library wirksam machen“ ist ABGESCHLOSSEN.** Stefan hat am 29.09.2026 abgenommen, nach Review-Pass und Fixpaket (#282). Gemergt sind #267–#282. Details stehen in `features/F36/feature.md`, Abschnitt „Review-Pass 29.09.2026“ (Urteil je AK).
- Gebaut und belegt:
  - Ort-B-Skills und lokale MCPs laufen von Katalog über Freigabe/Installation bis in den Lauf, und ihre Nutzung ist beobachtbar.
  - Reallauf haushaltsbuch2: `8cee6c98` hat `frontend-design` aufgerufen. Der Auszug der Rohströme liegt in `features/F36/nachweis-reallauf/`, Abschnitt C.
- Bewusst gesperrt: Agents (extern und Projekt) und Projekt-Skills (F-815, F-816).
- Offene Folge-Findings:
  - F-829 (Review-Maßstab, mit F-820); F-822; F-840, F-841 (Prozess); F-842 bis F-844 (aus PR 2);
  - F-831 (Slash-Commands/Init-Gate), F-834 bis F-836, F-838;
  - F-815/F-816, F-818, F-791.
- Abnahme-Branch `docs/f36-abnahme` ist als #283 gemergt (`1255df1`).

## Nächste Schritte
1. Stefan committet und pusht `fix/fixpaket-f36-pr2` (PR 2), danach PR und Merge.
2. Nächster Schritt: F-831 als eigener kleiner Auftrag — Referenzmenge `init.slash_commands` je CLI-Version messen (unbekannt → Abbruch, samt Rotfall).
3. Danach Projekt-Kern „Projekt aufrufen/anzeigen“.
4. F-829 zusammen mit F-820 schneiden. Weiter vorgemerkt: F-765/757, F-767, F-748/751, F-755, F-762.
5. Scout Datenanalyse (F-800).
6. Design-Schnitt F-725, mit der Scope-Ergänzung vom 29.09.2026. `impeccable` soll installierbar werden (Stefan, 29.09.2026).
7. Design-Bau.
8. qa-Schritt (F-820).
9. Opportunity Scanner (F30). Vorher F-818 entscheiden: Der Vorstart-Scan blockiert Ort-B-Läufe auf ai-workforce selbst.

## Aufräumen
- Worktree `aiw-f36-review` erst entfernen, wenn der Abnahme-PR gemergt ist: `git worktree remove C:\Users\stefa\Projekte\aiw-f36-review` aus dem Haupt-Checkout.
- Worktree `aiw-f36-reallauf`:
  1. `git worktree prune` im Haupt-Checkout.
  2. Den Ordner `C:\Users\stefa\Projekte\aiw-f36-reallauf` von Hand löschen.
  3. Mit `git worktree list` prüfen, dass er dort nicht mehr steht.

## Offene Entscheidungen Stefan
- F-766: Der Kontrollzustand von Projekten ist gitignored. Die Reallauf-Belege liegen deshalb nur als Auszug im Repo.
- Schema-Zwilling `navigate_adressen`: Das Feld steht bereits in `schemas/kontrollzustand-laufakte-payload.schema.json`. Zu bestätigen ist, ob damit erledigt.
- F-815/F-816: Wann werden Agents und Projekt-Skills in der Ausführung freigeschaltet (E-F36-3)?

## Entscheidungen Challenger (29.09.2026)
- E-186: `claude_ordner_veraendert` bleibt FEHLGESCHLAGEN, mit `bypass_verdacht_anzahl` in `daten` und ohne Eskalation.
- Der Hinweistext der Skill-Installation nennt, dass die CLI lesende Befehle auch ohne Eintrag zulässt.
- Reallauf-Zählregel: Read auf gesperrte Skill-Dateien wird nicht gezählt.
- Fixpaket-Umfang des Review-Passes: H-A, H-B, H-C und F-837; der F-832-Code nur bei höchstens ~30 Zeilen (blieb dort offen, mit Fixpaket PR 2 nach F36 als Vorher/Nachher-Vergleich gebaut).

## Bedienregeln
- Claude Code committet und pusht in ai-workforce nicht selbst (commit-guard F-787, Ablauf F-789). Das weicht bewusst von CLAUDE.md 'Iterationsende' ab, siehe F-799.
- Stefan committet und pusht im eigenen PowerShell-Fenster.
- Der Challenger prüft per Hash; erst dann PR (F-789).
- TERMINAL-Blöcke mit absoluten Pfaden. Wartepunkte beenden einen TERMINAL-Block; aufgeräumt wird erst nach bestätigtem `git rev-parse` (F-821).
- Der Challenger arbeitet nur lesend: keine Worktrees einbinden, kein mutierendes git.
- Nach einer echten Installation über den Leitstand ist `ressourcen.json` geändert, Stefan committet (F-812). Die Einträge tragen absolute Pfade dieses Rechners.
