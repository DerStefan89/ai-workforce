# Aktuelle Übergabe
Wird am Ende jeder Challenger-Runde vollständig überschrieben. Historie: Git-Log dieser Datei.
Nur relative Pfade (Repo und Geschwisterordner), keine Benutzerpfade — das Repo ist öffentlich (F-858).
Stand: 30.09.2026.

## Stand
**F44 „Design-Schnitt (F-725)“ ist IN_ARBEIT.** Akte `features/F44/feature.md`; Schnitt WS-0 bis WS-8 nach dem Challenger-Dokument 474 (`GO_STANDARD`), übernommen als `docs/design/abgleich-f725.md`. E-F44-1 = B (Zukunft sichtbar, deaktiviert, „kommt“) und E-F44-2 = B (de/en/tr/ru), Stefan 30.09.2026.

**WS-0 „Ablage & Harness“ ist gemergt** (#290, `3c779d8`). impeccable wird nicht freigegeben (WS0-6 geschlossen, F-870).

**WS-1 ist geteilt** (Challenger, 30.09.2026): WS-1a „Fundament“, WS-1b „Shell, Einstieg“; das Chat-Dock wandert nach WS-8. Pakettabelle in `features/F44/feature.md`, Vermerk in `docs/design/abgleich-f725.md` §5.1.

**WS-1a „Fundament“ liegt auf Branch `feat/f725-ws1a-fundament`** (Worktree `../aiw-f725-ws1a`, Basis `3c779d8`, nicht committet). Inhalt (Einzelheiten: Akte, Abschnitt „Stand WS-1a“):
- i18n-Kern `public/leitstand/i18n.js` mit Wörterbüchern de/en/tr/ru und Gate `scripts/check-f44-i18n.mjs` (in `npm run check`).
- Tokens der Vorlage dunkel und hell in `style.css`, Kontrastprüfung nach WCAG im Token-Gate (keine Ausnahme), Schrift der Vorlage.
- Theme (`theme.js`, Inline-Skript im Kopf von `index.html`, `theme-color` aus `--bg`, Manifest).
- Seite `#/einstellungen` (Dropdown der Nutzerkarte), Illustration `assets/gear.webp` (480 px, verlustbehaftet, siehe F-869).
- Neuladen-Hook beim Projektwechsel (F-860 erledigt), `render-nachweis` mit Theme, reduzierter Bewegung, Zoom, WebP (F-867 erledigt).
- Nachweise `features/F44/nachweise/ws1a/` (erzeugt gegen einen Leitstand mit Registerkopie ai-workforce + `../f25-testprojekt-b`, Muster F25).
- Neue Findings F-869 bis F-875; Vermerk an F-776 (nicht in F-725, bestätigt).
- Prüfpässe: zweiter Pass design-guardian, code-reviewer, qa je „Freigegeben mit Hinweisen“, Hinweise eingearbeitet. Stefan nimmt die Abweichungen von WS1a-8 ab (Akte, Abschnitt „Abnahme durch Stefan“).
- Offene Entscheidung: Hinweis-Kasten der Einstellungen (F-873) behalten oder bis zu den Fragezeichen-Hinweisen ausblenden.

**F-800 (Scout Datenerhebung) ist gemergt** (#289, `50bbccb`).

**F43 „Projekt aufrufen/anzeigen“ ist ABGESCHLOSSEN** (#287, Abnahme 30.09.2026), F-849 gemergt (#288). Offene Folge-Findings F-845, F-847, F-848, F-850 bis F-856; F-857 und F-854 laufen jetzt in F44 WS-6 bzw. WS-2.

**F36 „Capability Library wirksam machen“ ist ABGESCHLOSSEN** (Abnahme 29.09.2026, #267–#283; Details in `features/F36/feature.md`). F-831 gemergt (#286). Offene Folge-Findings: F-829 (mit F-820); F-822; F-840, F-841; F-842 bis F-844; F-834 bis F-836, F-838; `init.plugins` bleibt ungeprüft; F-815/F-816, F-818, F-791.

## Nächste Schritte
1. WS-1a prüfen (Challenger per Hash), Stefan committet, PR. Danach Worktree `../aiw-f725-ws1a` aufräumen.
2. F44 WS-1b „Shell, Einstieg“ (Sidebar V10, Kopf mit Projektauswahl, „+“/F-862, Persona-Bild neu kalibriert, 4 Statustexte, Sprach- und Theme-Schalter, `#/start` mit Motion, Platzhalterseiten, Baustein „kommt“, Poll-Fehlerbanner, Zuletzt geöffnet, F-865), danach WS-2 bis WS-8.
3. qa-Schritt F-820 zusammen mit F-829.
4. Vor F30 F-818 entscheiden: Der Vorstart-Scan blockiert Ort-B-Läufe auf ai-workforce selbst. Dabei F-859 klären (Scout für den Scanner-Architekten).
5. Opportunity Scanner (F30) — Planung vollständig in der Workforce (E-F30-4); Stack-Kandidaten aus `docs/harness/stack-kandidaten.md`.
6. Vorgemerkt: F-765/757, F-767, F-748/751, F-755, F-762, F-834 bis F-836, F-838, F-842 bis F-848, F-850 bis F-856.

Laufender Hinweis: Bricht ein Ort-B-Lauf mit „init.slash_commands enthält unbekannte Commands“ ab, mit `features/F36/nachweis-f831/erzeuge-nachweis.mjs` nachmessen und gegenprüfen; nur verweigerte Namen in die Referenzmenge.

## Aufräumen
- `docs/f800-scout` ist gemergt (#289): Worktree `../aiw-f800-scout` aus dem Haupt-Checkout entfernen (`git worktree remove ../aiw-f800-scout`), danach mit `git worktree list` prüfen.
- WS-0 ist gemergt: Worktree `../aiw-f725-ws0` entfernen, falls noch vorhanden.
- Nach Merge von `feat/f725-ws1a-fundament`: Worktree `../aiw-f725-ws1a` ebenso entfernen.

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
- TERMINAL-Blöcke beginnen mit `cd` auf den vollständigen Arbeitsordner und `git branch --show-current` (F-871); in dieser Datei stehen Pfade nur relativ (F-858). Wartepunkte beenden einen TERMINAL-Block; aufgeräumt wird erst nach bestätigtem `git rev-parse` (F-821).
- Der Challenger arbeitet nur lesend: keine Worktrees einbinden, kein mutierendes git.
- Nach einer echten Installation über den Leitstand ist `ressourcen.json` geändert, Stefan committet (F-812). Die Einträge tragen absolute Pfade dieses Rechners.
- Dateien der Designvorlage unter `docs/design/vorlage-v10/` nie von Hand ändern; sie sind byte-gleich zum Original (Hash-Tabelle im README).
