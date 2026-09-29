# Aktuelle Übergabe
Wird am Ende jeder Challenger-Runde vollständig überschrieben. Historie: Git-Log dieser Datei.
Stand: 29.09.2026.

## Stand
F36 „Capability Library wirksam machen“ steht auf **FEATURE_GATE**. Gemergt sind #267–#281, einschließlich F-813 CSRF (#277), F-814 Host-Allowlist (#279), Reallauf-Nachweis (#280) und Katalog-Installationen (#281).

**Review-Pass und Fixpaket** (Branch `docs/f36-feature-review`, Worktree `aiw-f36-review`, Basis `54d6eb6`, nicht committet). Details stehen in `features/F36/feature.md`, Abschnitt „Review-Pass 29.09.2026“ (Urteil je AK).
- Erster Pass (`code-reviewer` + `qa`, frischer Kontext): beide „nicht freigegeben“, drei HOCH-Befunde.
  - H-A (F-839, erledigt): Eine Projekt-Startvorlage konnte `Skill`, `Agent`, `Task` und `mcp__…` am Katalog, an V4a und am Init-Gate vorbei öffnen. Jetzt lehnt `pruefeErlaubteWerkzeuge` sie ab. Rotfälle: `src/startvorlage/startvorlage.test.ts` und `scripts/check-f36-ws2-laufzeit.mjs` (e), beide kalibriert. Der ADR `docs/adr/ausfuehrung-bash-allowlist.md` ist ergänzt.
  - H-B (erledigt): `features/F36/nachweis-reallauf/` Abschnitt C, `auszug-laeufe.json` und `auszug-laeufe.mjs`. Enthalten sind init-Zeilen, Skill- und MCP-`tool_use` samt `tool_result`, `permission_denials` und die sha256 der vier Rohströme (`1c4a1163`, `7b6d0f40`, `8cee6c98`, `74290fb5`). Alle Rohströme waren vorhanden. Nicht belegt, weil nirgends gespeichert: die Anzeige der Empfehlung und der Klickweg für `playwright-mcp`.
  - H-C und F-837 (erledigt): Ziel (Agents gesperrt, F-815), Grenzen (F-813/F-814 erledigt; neu: GetTask, F-818, F-822/F-823, Agents, Playwright-Navigation, Bitgenau), Endstände AK6–AK12, zielfassung v1.38 (nur Umsetzungsvermerke zu E-F36-6/-8), STATUS.md, nachweis-ws5b-README, JSDoc.
  - F-832: Der Satz in der Akte ist korrigiert, der Code-Fix bleibt offen. `git status --ignored` allein würde vorhandene ignorierte Dateien rot werten.
- Findings aus dem ersten Pass: F-831 bis F-838 (MITTEL/NIEDRIG), dazu F-839.
  - Nachgezogen: F-769 (zurückgestellt nach F-815/F-816), F-773, F-774 (erledigt für Skills/MCP).
  - `docs/projekt/kontext/lagebild.md` ist neu erzeugt (F-774 kein offenes P1 mehr).
- Kurz-Review-Pass über das Fixpaket: `code-reviewer` (H-A) und `qa` (H-B/H-C) beide „freigegeben mit Hinweisen“; die Hinweise sind eingearbeitet.
- `npm run check`: Exit 0, 1060/1060 Tests. `check-docs`, `check-feature` und `check-status-akten`: keine Befunde.

## Nächste Schritte
1. Stefan prüft das Fixpaket, committet und pusht (`docs/f36-feature-review`), dann Merge. Danach nimmt Stefan F36 ab und setzt ABGESCHLOSSEN.
2. Fixpaket nach F36, F-764 zuerst. Dann F-824 bis F-830 (F-829 zusammen mit F-820 schneiden), dann F-823 (P2, eine ungültige absolute Request-URI beendet den Leitstand). Aus dem Review sind mitzunehmen: F-831, F-832 (Code), F-833 und nach Bedarf F-834 bis F-838. Weiter vorgemerkt: F-765/757, F-767, F-748/751, F-755, F-762.
3. Projekt-Kern „Projekt aufrufen/anzeigen“.
4. Scout Datenanalyse (F-800).
5. Design-Schnitt F-725, mit der Scope-Ergänzung vom 29.09.2026. `impeccable` soll installierbar werden (Stefan, 29.09.2026).
6. Design-Bau.
7. qa-Schritt (F-820).
8. Opportunity Scanner (F30). Vorher F-818 entscheiden: Der Vorstart-Scan blockiert Ort-B-Läufe auf ai-workforce selbst.

## Offene Entscheidungen Stefan
- F-766: Der Kontrollzustand von Projekten ist gitignored. Die Reallauf-Belege liegen deshalb nur als Auszug im Repo.
- Schema-Zwilling `navigate_adressen`: Das Feld steht bereits in `schemas/kontrollzustand-laufakte-payload.schema.json`. Zu bestätigen ist, ob damit erledigt.
- F-815/F-816: Wann werden Agents und Projekt-Skills in der Ausführung freigeschaltet (E-F36-3)?

## Entscheidungen Challenger (29.09.2026)
- E-186: `claude_ordner_veraendert` bleibt FEHLGESCHLAGEN, mit `bypass_verdacht_anzahl` in `daten` und ohne Eskalation.
- Der Hinweistext der Skill-Installation nennt, dass die CLI lesende Befehle auch ohne Eintrag zulässt.
- Reallauf-Zählregel: Read auf gesperrte Skill-Dateien wird nicht gezählt.
- Fixpaket-Umfang des Review-Passes: H-A, H-B, H-C und F-837; der F-832-Code nur bei höchstens ~30 Zeilen.

## Bedienregeln
- Claude Code committet und pusht in ai-workforce nicht selbst (commit-guard F-787, Ablauf F-789). Das weicht bewusst von CLAUDE.md 'Iterationsende' ab, siehe F-799.
- Stefan committet und pusht im eigenen PowerShell-Fenster, ohne PR.
- Der Challenger prüft per Hash; erst dann PR (F-789).
- TERMINAL-Blöcke mit absoluten Pfaden. Wartepunkte beenden einen TERMINAL-Block; aufgeräumt wird erst nach bestätigtem `git rev-parse` (F-821).
- Der Challenger arbeitet nur lesend: keine Worktrees einbinden, kein mutierendes git.
- Nach einer echten Installation über den Leitstand ist `ressourcen.json` geändert, Stefan committet (F-812). Die Einträge tragen absolute Pfade dieses Rechners.
