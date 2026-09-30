# Aktuelle Übergabe
Wird am Ende jeder Challenger-Runde vollständig überschrieben. Historie: Git-Log dieser Datei.
Nur relative Pfade (Repo und Geschwisterordner), keine Benutzerpfade — das Repo ist öffentlich (F-858).
Stand: 30.09.2026.

## Stand
**F43 „Projekt aufrufen/anzeigen“ ist ABGESCHLOSSEN.** WS-1 gemergt als #287 (`ecd9be1`), Abnahme durch Stefan am 30.09.2026 real im Leitstand an haushaltsbuch2; Belege in `features/F43/feature.md`, Abschnitt „Abnahme 30.09.2026“. Offene Folge-Findings F-845, F-847, F-848, F-850 bis F-853; F-854 (Roadmap-Kachel bei haushaltsbuch2, nur erfasst); F-857 (Pfad-Text der Projektkarte läuft mobil über).

**F-849 (vorschau_url auf dem Leitstand-Port) ist gemergt** (#288, `3d73f18`), zusammen mit der F43-Abnahme-Doku. Sperre gegen den gebundenen Port der Verbindung, fail-closed; Gates `check-f36-ws5a-installation.mjs` (l) und `check-f43-projekt-aufrufen.mjs` (h), Render-Nachweis `features/F43/nachweis-f849/`. Folge-Findings F-855 (zweite Leitstand-Instanz), F-856 (POST /api/projekte unter Projekt-Präfix, Altfehler F41).

**F-800 (Scout Datenerhebung) liegt auf Branch `docs/f800-scout`** (Worktree `../aiw-f800-scout`, Basis `3d73f18`, nicht committet). Acht neue Zeilen in `docs/harness/stack-kandidaten.md` (Trafilatura, Mozilla Readability, Playwright als Bibliothek, Cheerio, feed-extractor, robots-parser, DuckDB, Polars) mit Belegen im Abschnitt „Scout F-800 (30.09.2026)“; ScrapeGraph AI und Scientific-agent-skills nachgeprüft. Neu: F-857, F-858 (erledigt), F-859 (Scout-Zuschnitt vor F30 klären).

**F36 „Capability Library wirksam machen“ ist ABGESCHLOSSEN** (Abnahme 29.09.2026, #267–#283; Details in `features/F36/feature.md`). F-831 (Init-Gate `init.slash_commands`) ist gemergt (#286). Offene Folge-Findings: F-829 (mit F-820); F-822; F-840, F-841; F-842 bis F-844; F-834 bis F-836, F-838; `init.plugins` bleibt ungeprüft; F-815/F-816, F-818, F-791.

## Nächste Schritte
1. Design-Schnitt F-725, mit der Scope-Ergänzung vom 29.09.2026. `impeccable` soll installierbar werden (Stefan, 29.09.2026). Kandidaten: Überlauf der Projektkarte (F-857), F-854.
2. Design-Bau.
3. qa-Schritt F-820 zusammen mit F-829.
4. Vor F30 F-818 entscheiden: Der Vorstart-Scan blockiert Ort-B-Läufe auf ai-workforce selbst. Dabei F-859 klären (Scout für den Scanner-Architekten).
5. Opportunity Scanner (F30) — Planung vollständig in der Workforce (E-F30-4); Stack-Kandidaten aus `docs/harness/stack-kandidaten.md`.
6. Vorgemerkt: F-765/757, F-767, F-748/751, F-755, F-762, F-834 bis F-836, F-838, F-842 bis F-848, F-850 bis F-856.

Laufender Hinweis: Bricht ein Ort-B-Lauf mit „init.slash_commands enthält unbekannte Commands“ ab, mit `features/F36/nachweis-f831/erzeuge-nachweis.mjs` nachmessen und gegenprüfen; nur verweigerte Namen in die Referenzmenge.

## Aufräumen
- Nach Merge von `docs/f800-scout`: Worktree `../aiw-f800-scout` aus dem Haupt-Checkout entfernen (`git worktree remove ../aiw-f800-scout`), danach mit `git worktree list` prüfen.

## Offene Entscheidungen Stefan
- F-766: Der Kontrollzustand von Projekten ist gitignored. Die Reallauf-Belege liegen deshalb nur als Auszug im Repo.
- Schema-Zwilling `navigate_adressen`: Das Feld steht bereits in `schemas/kontrollzustand-laufakte-payload.schema.json`. Zu bestätigen ist, ob damit erledigt.
- F-815/F-816: Wann werden Agents und Projekt-Skills in der Ausführung freigeschaltet (E-F36-3)?
- F-818: Vorstart-Scan und Ort-B-Läufe auf ai-workforce (vor F30).

## Entscheidungen Challenger (29.09.2026)
- E-186: `claude_ordner_veraendert` bleibt FEHLGESCHLAGEN, mit `bypass_verdacht_anzahl` in `daten` und ohne Eskalation.
- Der Hinweistext der Skill-Installation nennt, dass die CLI lesende Befehle auch ohne Eintrag zulässt.
- Reallauf-Zählregel: Read auf gesperrte Skill-Dateien wird nicht gezählt.

## Bedienregeln
- Claude Code committet und pusht in ai-workforce nicht selbst (commit-guard F-787, Ablauf F-789). Das weicht bewusst von CLAUDE.md 'Iterationsende' ab, siehe F-799.
- Stefan committet und pusht im eigenen PowerShell-Fenster.
- Der Challenger prüft per Hash; erst dann PR (F-789).
- TERMINAL-Blöcke beginnen mit `cd` auf den vollständigen Arbeitsordner; in dieser Datei stehen Pfade nur relativ (F-858). Wartepunkte beenden einen TERMINAL-Block; aufgeräumt wird erst nach bestätigtem `git rev-parse` (F-821).
- Der Challenger arbeitet nur lesend: keine Worktrees einbinden, kein mutierendes git.
- Nach einer echten Installation über den Leitstand ist `ressourcen.json` geändert, Stefan committet (F-812). Die Einträge tragen absolute Pfade dieses Rechners.
