# Aktuelle Übergabe
Wird am Ende jeder Challenger-Runde vollständig überschrieben. Historie: Git-Log dieser Datei.
Stand: 29.09.2026.

## Stand
**F36 „Capability Library wirksam machen“ ist ABGESCHLOSSEN.** Stefan hat am 29.09.2026 abgenommen, nach Review-Pass und Fixpaket (#282). Gemergt sind #267–#282. Details stehen in `features/F36/feature.md`, Abschnitt „Review-Pass 29.09.2026“ (Urteil je AK).
- Gebaut und belegt:
  - Ort-B-Skills und lokale MCPs laufen von Katalog über Freigabe/Installation bis in den Lauf, und ihre Nutzung ist beobachtbar.
  - Reallauf haushaltsbuch2: `8cee6c98` hat `frontend-design` aufgerufen. Der Auszug der Rohströme liegt in `features/F36/nachweis-reallauf/`, Abschnitt C.
- Bewusst gesperrt: Agents (extern und Projekt) und Projekt-Skills (F-815, F-816).
- Offene Folge-Findings:
  - F-764; F-824 bis F-830 (Reallauf); F-823 (P2, eine ungültige absolute Request-URI beendet den Leitstand); F-822;
  - F-831 (Slash-Commands/Init-Gate), F-832 (Laufdiff-Code), F-833 (Bitgenau-Rotfall), F-834 bis F-836, F-838;
  - F-815/F-816, F-818, F-791.
- Abnahme-Branch `docs/f36-abnahme` (Worktree `aiw-f36-review`, Basis `6efa25d`): nur Doku, nicht committet.

## Nächste Schritte
1. Stefan committet und pusht `docs/f36-abnahme`, danach PR und Merge.
2. Fixpaket nach F36, in dieser Reihenfolge:
   - F-764 zuerst;
   - dann F-824 bis F-830 (F-829 zusammen mit F-820 schneiden);
   - dann F-823;
   - dann F-831 bis F-833.
   - Weiter vorgemerkt: F-765/757, F-767, F-748/751, F-755, F-762.
3. Projekt-Kern „Projekt aufrufen/anzeigen“.
4. Scout Datenanalyse (F-800).
5. Design-Schnitt F-725, mit der Scope-Ergänzung vom 29.09.2026. `impeccable` soll installierbar werden (Stefan, 29.09.2026).
6. Design-Bau.
7. qa-Schritt (F-820).
8. Opportunity Scanner (F30). Vorher F-818 entscheiden: Der Vorstart-Scan blockiert Ort-B-Läufe auf ai-workforce selbst.

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
- Fixpaket-Umfang des Review-Passes: H-A, H-B, H-C und F-837; der F-832-Code nur bei höchstens ~30 Zeilen (blieb offen).

## Bedienregeln
- Claude Code committet und pusht in ai-workforce nicht selbst (commit-guard F-787, Ablauf F-789). Das weicht bewusst von CLAUDE.md 'Iterationsende' ab, siehe F-799.
- Stefan committet und pusht im eigenen PowerShell-Fenster.
- Der Challenger prüft per Hash; erst dann PR (F-789).
- TERMINAL-Blöcke mit absoluten Pfaden. Wartepunkte beenden einen TERMINAL-Block; aufgeräumt wird erst nach bestätigtem `git rev-parse` (F-821).
- Der Challenger arbeitet nur lesend: keine Worktrees einbinden, kein mutierendes git.
- Nach einer echten Installation über den Leitstand ist `ressourcen.json` geändert, Stefan committet (F-812). Die Einträge tragen absolute Pfade dieses Rechners.
