# Aktuelle Übergabe
Wird am Ende jeder Challenger-Runde vollständig überschrieben. Historie: Git-Log dieser Datei.
Nur relative Pfade (Repo und Geschwisterordner), keine Benutzerpfade — das Repo ist öffentlich (F-858).
Stand: 30.09.2026.

## Stand
**F44 „Design-Schnitt (F-725)“ ist IN_ARBEIT.** Akte `features/F44/feature.md`; Schnitt WS-0 bis WS-8 nach dem Challenger-Dokument 474 (`GO_STANDARD`), übernommen als `docs/design/abgleich-f725.md`. E-F44-1 = B (Zukunft sichtbar, deaktiviert, „kommt“) und E-F44-2 = B (de/en/tr/ru), Stefan 30.09.2026.

**WS-0 „Ablage & Harness“ liegt auf Branch `feat/f725-ws0-design-ablage`** (Worktree `../aiw-f725-ws0`, Basis `50bbccb`, nicht committet). Inhalt:
- Vorlage V10 byte-gleich unter `docs/design/vorlage-v10/` (SHA-256-Tabelle im README, gegen das Original geprüft; die Textdateien haben LF, die Repo-Regel ändert sie nicht).
- 50 Referenz-Screenshots unter `docs/design/vorlage-v10/screens/` (d_ 32, m_ 6, l_ 3, motion_ 9), erzeugt mit `docs/design/vorlage-v10/erzeuge-screens.mjs` (node:http + Playwright, keine neue Abhängigkeit).
- `.claude/agents/design-guardian.md` aktiv, CLAUDE.md-Zeile umgestellt.
- Token-Gate `scripts/check-f20-design-tokens.mjs`: `:root[data-theme]`, Literale in Token-Blöcken nur als Custom Property, alle `*.css` rekursiv, Farbfunktionen rgb/hsl/hwb/lab/lch/oklab/oklch/color, Rot/Grün-Selbsttest (F-861).
- Belege 30.09.2026: `npm run check` Exit 0 (node:test 1080/1080), `npm run check:template` Exit 0.
- Neue Findings F-860 bis F-866 (aus dem Challenger-Dokument) und F-867 (render-nachweis kann Theme, reduzierte Bewegung und Zoom nicht setzen → WS-1), F-868 (Benutzerpfad in `docs/STATUS.md`); Vermerke an F-725, F-776, F-854 (→ WS-2), F-857 (→ WS-6).
- `docs/design/abgleich-f725.md` §9 ordnet jedes Referenzbild einer Leitstand-Ansicht zu; Prüfpunkte für die Folgepakete stehen in der Akte.
- Review-Pass: code-reviewer „Freigegeben mit Hinweisen“, qa „Nicht freigegeben“ (CRLF-Aussage falsch, die Vorlage hat LF; Byte-Gleichheit per `Get-FileHash` bestätigt). Hinweise eingearbeitet, siehe Bericht der Sitzung.
- **Nicht erledigt: `impeccable` installierbar machen.** `ressourcen.json` unverändert. Das Repo `pbakaus/impeccable` (HEAD `0d6b47ea19b63afe15e3f93a44d5d9fbbc6fd275`, 30.09.2026) trägt keinen eindeutigen Skill-Ordner, sondern je Agent-Harness eine Kopie, u. a. `.claude/skills/impeccable`, `plugin/skills/impeccable`, `.agents/skills/impeccable` (Inhalte verschieden), dazu die Quelle `skill/` mit `SKILL.src.md`. Lizenz im Repo-LICENSE: Apache-2.0. Der Skill enthält ein ausführbares `scripts/impeccable`, das eine Plattform-Binärdatei startet (neben sich, im Nutzerordner oder im Cache), und verweist auf vier Projekt-Agents unter `.claude/agents/` — Agents bleiben in der Ausführung gesperrt (F-815).

**F-800 (Scout Datenerhebung) ist gemergt** (#289, `50bbccb`).

**F43 „Projekt aufrufen/anzeigen“ ist ABGESCHLOSSEN** (#287, Abnahme 30.09.2026), F-849 gemergt (#288). Offene Folge-Findings F-845, F-847, F-848, F-850 bis F-856; F-857 und F-854 laufen jetzt in F44 WS-6 bzw. WS-2.

**F36 „Capability Library wirksam machen“ ist ABGESCHLOSSEN** (Abnahme 29.09.2026, #267–#283; Details in `features/F36/feature.md`). F-831 gemergt (#286). Offene Folge-Findings: F-829 (mit F-820); F-822; F-840, F-841; F-842 bis F-844; F-834 bis F-836, F-838; `init.plugins` bleibt ungeprüft; F-815/F-816, F-818, F-791.

## Nächste Schritte
1. WS-0 prüfen (Challenger per Hash), committen, PR. Danach Worktree `../aiw-f725-ws0` aufräumen.
2. impeccable: `skill_pfad` festlegen (Vorschlag zur Entscheidung: `.claude/skills/impeccable`, die Claude-Code-Fassung), dann Lizenz und Kosten eintragen; Freigabe und Installation klickt Stefan im Leitstand.
3. F44 WS-1 „Tokens, Shell, Einstieg“ (i18n-Kern und -Gate, Baustein „kommt“, Persona-Bild neu kalibrieren, zentraler Neuladen-Hook F-860, F-862, F-865, render-nachweis F-867), danach WS-2 bis WS-8.
4. qa-Schritt F-820 zusammen mit F-829.
5. Vor F30 F-818 entscheiden: Der Vorstart-Scan blockiert Ort-B-Läufe auf ai-workforce selbst. Dabei F-859 klären (Scout für den Scanner-Architekten).
6. Opportunity Scanner (F30) — Planung vollständig in der Workforce (E-F30-4); Stack-Kandidaten aus `docs/harness/stack-kandidaten.md`.
7. Vorgemerkt: F-765/757, F-767, F-748/751, F-755, F-762, F-834 bis F-836, F-838, F-842 bis F-848, F-850 bis F-856.

Laufender Hinweis: Bricht ein Ort-B-Lauf mit „init.slash_commands enthält unbekannte Commands“ ab, mit `features/F36/nachweis-f831/erzeuge-nachweis.mjs` nachmessen und gegenprüfen; nur verweigerte Namen in die Referenzmenge.

## Aufräumen
- `docs/f800-scout` ist gemergt (#289): Worktree `../aiw-f800-scout` aus dem Haupt-Checkout entfernen (`git worktree remove ../aiw-f800-scout`), danach mit `git worktree list` prüfen.
- Nach Merge von `feat/f725-ws0-design-ablage`: Worktree `../aiw-f725-ws0` ebenso entfernen.

## Offene Entscheidungen Stefan
- impeccable: welcher Skill-Ordner gilt (`skill_pfad`), und ob ein Skill mit eigenem Binär-Starter überhaupt freigegeben werden soll.
- F-776: Challenger-Empfehlung 30.09.2026 — nicht Teil von F-725, V1-Backlog mit Auslöser. Bestätigung offen.
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
- Dateien der Designvorlage unter `docs/design/vorlage-v10/` nie von Hand ändern; sie sind byte-gleich zum Original (Hash-Tabelle im README).
