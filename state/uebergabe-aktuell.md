# Aktuelle Übergabe
Wird am Ende jeder Challenger-Runde vollständig überschrieben. Historie: Git-Log dieser Datei.
Nur relative Pfade (Repo und Geschwisterordner), keine Benutzerpfade — das Repo ist öffentlich (F-858).
Stand: 01.10.2026.

## Stand
**F44 „Design-Schnitt (F-725)“ ist IN_ARBEIT.** Akte `features/F44/feature.md`; Schnitt WS-0 bis WS-8 nach dem Challenger-Dokument 474 (`GO_STANDARD`), übernommen als `docs/design/abgleich-f725.md`. E-F44-1 = B (Zukunft sichtbar, deaktiviert, „kommt“) und E-F44-2 = B (de/en/tr/ru), Stefan 30.09.2026.

**WS-0 „Ablage & Harness“ ist gemergt** (#290, `3c779d8`). impeccable wird nicht freigegeben (WS0-6 geschlossen, F-870).

**WS-1 ist geteilt** (Challenger, 30.09.2026): WS-1a „Fundament“, WS-1b „Shell, Einstieg“; das Chat-Dock wandert nach WS-8. Pakettabelle in `features/F44/feature.md`, Vermerk in `docs/design/abgleich-f725.md` §5.1.

**WS-1a „Fundament“ ist gemergt** (#291, `1f9ddb2`): i18n-Kern und -Gate, Tokens hell/dunkel mit Kontrast, Theme, `#/einstellungen`, Neuladen-Hook (F-860), `render-nachweis` (F-867).

**WS-1b „Shell & Einstieg“ ist gemergt** (#292, `71ff28b`). **WS-2** (geteilt): WS-2a „Entscheidungen & Roadmap“ gemergt (#293, `7530cbf`), WS-2b „Übersicht“ gemergt (#294, `67e757c`). **WS-3** (geteilt): WS-3a „Board & Listen“ gemergt (#295, `1191231`), WS-3b „Detail, Bauen, Click-to-Work“ gemergt (#296, `5b0b683`).

**WS-4 ist geteilt** (Auftrag Stefan, 01.10.2026; Vermerk in `docs/design/abgleich-f725.md` §5.1, F-934): WS-4a „Ablauf & Freigabe“ (F0, F2, F3, F3b, F4, F5, F10, F12), WS-4b „Klärung, Reparatur & Abnahme“ (F6, F8, F9, F13–F18); F7 und F1 gehen nach WS-5.

**WS-4a „Ablauf & Freigabe“ ist gemergt** (#297, `493d953`). Einzelheiten: Akte, Abschnitt „Stand WS-4a“.

**WS-4b liegt auf Branch `feat/f725-ws4b-abnahme`** (Worktree `../aiw-f725-ws1a`, Basis `493d953`, nicht committet). Einzelheiten: Akte, Abschnitt „Stand WS-4b“.
- Abnahme (F13–F18) auf `#/workflows/<id>`: „Passt das Ergebnis?“ über der Timeline nur bei ABGESCHLOSSEN (Empfehlung, „Vereinbart & überprüft“, Befunde, Geänderte Dateien, Prüfbericht mit F16, Entscheidung inline); sonst bei erlaubter Aktion der Block „Ergebnis bzw. Auftrag ablehnen oder Anpassung wünschen“ unter der Timeline; sonst eine Zeile (folgt bzw. entschieden, F18 bei erzeuger kern); „Review-Urteil“ und „Deine Abnahme“ in „Auf einen Blick“.
- Klärung (F6) und Sichtung (F9) als Notiz über der Timeline mit Dialog (Arten `klaerung`, `sichtung`; Sperre während des POST, Schließen bei Stand-Änderung); Reparatur (F8) als rote bzw. bernsteinfarbene Notiz mit Editor inline. Überschrift „Bedienung“ entfällt.
- Modulschnitt (F-935 erledigt): `views/workflow-abnahme.js`, `views/workflow-eingriffe.js` (rein, mit Tests); `views/workflows.js` unter 1 000 Zeilen. `tHtml` zentral in `i18n.js`, i18n-Gate prüft `t(` und `tHtml(` (F-940 neu und erledigt).
- Restpunkte WS-4a: Timeline-Status ohne Dopplung, Worker lesbar (`worker.<id>`), Checkbox-Kontrast hell (Tokens `--check-rand`, `--check-haken`, Paare im Token-Gate), F-926 Workboard-Teil (F-926 erledigt).
- Gates mitgezogen: f15 (liest die neuen Module, Texte als Schlüssel plus de-Wert, (h) wörtlich in `workflows.js`), f42 (i) (liest `workflow-eingriffe.js`, Rotfall belegt), i18n-Gate, Token-Gate; `empfehlung-anzeige.test.mjs` liest den Freigabedialog in `workflow-eingriffe.js`.
- Nachweise `features/F44/nachweise/ws4b/` (Leitstand dieses Worktrees, Port 4381, feste Antworten; Workboard mit echten Daten).
- Prüfpass einmal parallel (design-guardian, code-reviewer, qa: alle „Freigegeben mit Hinweisen“), eine Korrekturrunde eingearbeitet (Akte). Neu F-941 (Dialogsteuerung als eigenes Modul).
- Nächste freie Finding-ID: F-942.

**F-800 (Scout Datenerhebung) ist gemergt** (#289, `50bbccb`).

**F43 „Projekt aufrufen/anzeigen“ ist ABGESCHLOSSEN** (#287, Abnahme 30.09.2026), F-849 gemergt (#288). Offene Folge-Findings F-845, F-847, F-848, F-850 bis F-856; F-857 und F-854 laufen jetzt in F44 WS-6 bzw. WS-2.

**F36 „Capability Library wirksam machen“ ist ABGESCHLOSSEN** (Abnahme 29.09.2026, #267–#283; Details in `features/F36/feature.md`). F-831 gemergt (#286). Offene Folge-Findings: F-829 (mit F-820); F-822; F-840, F-841; F-842 bis F-844; F-834 bis F-836, F-838; `init.plugins` bleibt ungeprüft; F-815/F-816, F-818, F-791.

## Nächste Schritte
1. F44 Design: WS-4b abschließen (Freigabe Stefan, Merge) → WS-5 (mit F7, F1) bis WS-8.
2. Fixpaket „Arbeitsfähigkeit“ (E-M5-18), direkt nach WS-8 und vor F30. Eigene Challenge nach WS-8. Bausteine in dieser Reihenfolge: B1 → B2 → B5 → B3 → B4. Zuordnung der Findings und vorgeschlagene Bestehensbedingung: Abschnitt „Fixpaket Arbeitsfähigkeit“ unten.
   - B1 Harness im Lauf:
     - Agents und Projekt-Skills sind im Ausführungslauf aufrufbar (F-815, F-816).
     - Das Review prüft gegen die Checkliste `.claude/agents/code-reviewer.md` und die DoD aus CLAUDE.md (F-829).
     - Der Vorstart-Scan blockiert ai-workforce selbst nicht mehr (F-818).
     - Klären, wie Codex-Schritte (Architekt, Review) die Harness-Regeln bekommen (F-929, K1).
     - ARCHITECTURE.md wird Prüfmaßstab für Review und qa; das Lesen in der Ausführung wird beobachtet (F-931, K3).
     - Hooks im Workforce-Lauf prüfen (feuern sie mit `--setting-sources project`, sind session-reminder und zwischenstand-* dort sinnvoll); PostToolUse-Lint (Harness G7) nachziehen, auch in ai-workforce (F-932, K4).
     - Lernschleife: nach der Abnahme ein Lessons-Eintrag wie `/lessons` (F-933, K5).
   - B2 Planungs- und Prüfkette:
     - architecture-advisor bekommt ein output_schema mit vierstufigem Urteil.
     - Plan v2 wird ein eigener Schritt (Rolle architekt) mit eigenem Artefakt.
     - Bei „überarbeiten“ führt ein Rückweg zum Plan (F-203, F-909).
     - Der qa-Schritt kommt dazu (F-820).
     - Spec und Handoff als Verfahren prüfen.
   - B5 Feature-Fluss (F-912; dazu F-924, F-927, F-928 aus WS-3b):
     - Der Coach legt im bestehenden Projekt eine Feature-Akte an, statt den Scope direkt zum Auftrag zu machen.
     - Die Akte ist im Leitstand bearbeitbar (E-F45-1 = A).
     - „In die Arbeit schicken“ geht mit einem Klick.
   - B3 Design-Fähigkeit (F-911):
     - impeccable wird installierbar (installation_vorlage).
     - design-guardian kommt ins Projekt-Skelett und als UI-Prüfschritt in die Workflow-Vorlagen.
     - Render-Nachweis und Token-Gate werden für Fremdprojekte nutzbar.
   - B4 Fähigkeiten:
     - Katalogart „plugin“ mit Freigabe und Init-Prüfung (F-910).
     - Web- und kostenpflichtige MCPs nach der geänderten E-F36-4.
     - Die wichtigsten GitHub-Einträge mit freigabe OFFEN werden installierbar.
     - Der Scout wird für Stack-Recherche tauglich (F-859).
   - In der Challenge mitklären: F-715, F-766, F-764, F-915.
   - K2 gestufter Kontext nach F30 (F-930): erst den Verbrauch je Rolle in F30 messen, dann F38 neu schneiden — nicht im Fixpaket.
3. F30 Opportunity Scanner — Planung vollständig in der Workforce (E-F30-4); Stack-Kandidaten aus `docs/harness/stack-kandidaten.md`.
4. Vorgemerkt: F-765/757, F-767, F-748/751, F-755, F-762, F-834 bis F-836, F-838, F-842 bis F-848, F-850 bis F-856; aus WS-1b F-877 (wackelnde Gates), F-883 (Status bei Poll-Ausfall), F-885 (offene Eingaben beim Projektwechsel; F-874 ist mit WS-4a erledigt, eine angefangene Begründung wird beim Wechsel verworfen — auch in Abnahme, Rückfrage und Sichtung).

Laufender Hinweis: Bricht ein Ort-B-Lauf mit „init.slash_commands enthält unbekannte Commands“ ab, mit `features/F36/nachweis-f831/erzeuge-nachweis.mjs` nachmessen und gegenprüfen; nur verweigerte Namen in die Referenzmenge.

## Fixpaket Arbeitsfähigkeit (E-M5-18)
Kommt direkt nach WS-8 und vor F30. Reihenfolge B1 → B2 → B5 → B3 → B4; eigene Challenge nach WS-8.
- **B1 Harness im Lauf:** F-929, F-931, F-932, F-933, F-937, F-939 (F-939 zusammen mit B3).
- **B2 Planungs- und Prüfkette:** F-936 (Projektkarte für planende und prüfende Rollen), F-938 (Arbeitspaket mit AK, Nicht-Zielen und DoD).
- **B5 Feature-Fluss:** F-924, F-927, F-928, F-917.
- **K2 gestufter Kontext (F-930):** nach F30, nicht im Fixpaket.
- **Vorgeschlagene Bestehensbedingung** (wird in der Fixpaket-Challenge bestätigt): Ein echter Referenzauftrag läuft vom Coach bis zur Abnahme in einem Fremdprojekt. Laufakte, AK-Urteile und Prüfbericht belegen, dass Projektkarte, Arbeitspaket mit DoD, Skill- und Agent-Nutzung und die Mindest-Gates gewirkt haben.
- Nächste freie Finding-ID: F-942.

## Aufräumen
- `docs/f800-scout` ist gemergt (#289): Worktree `../aiw-f800-scout` aus dem Haupt-Checkout entfernen (`git worktree remove ../aiw-f800-scout`), danach mit `git worktree list` prüfen.
- WS-0 ist gemergt: Worktree `../aiw-f725-ws0` entfernen, falls noch vorhanden.
- Der Worktree `../aiw-f725-ws1a` trägt jetzt WS-4b (`feat/f725-ws4b-abnahme`). Nach dessen Merge entfernen oder für WS-5 weiterverwenden; der lokale Branch `feat/f725-ws4a-ablauf` ist gemergt und kann weg.

## Offene Entscheidungen Stefan
- ~~WS-4b (QA-Fachfrage): „Passt das Ergebnis?“ im Sichtungs-Halt nach dem Bau~~ — **entschieden** (Challenger, 01.10.2026): „Passt das Ergebnis?“ nur bei ABGESCHLOSSEN; sonst bei erlaubter Aktion der Block „Ergebnis ablehnen oder Anpassung wünschen“ (nach dem Bau, mit Dateien und Prüfbericht) bzw. „Auftrag ablehnen oder Anpassung wünschen“ (vor dem Bau) unter der Timeline. Umgesetzt in WS-4b.
- F-889: Leerer Hash — nur beim ersten Laden einer Sitzung nach `#/start` (heute) oder immer.
- F-885: Projektwechsel mit offener Eingabe — Rückfrage oder Entwurf je Projekt halten (WS-4a verwirft heute ohne Rückfrage).
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
