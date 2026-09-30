# Aktuelle Übergabe
Wird am Ende jeder Challenger-Runde vollständig überschrieben. Historie: Git-Log dieser Datei.
Nur relative Pfade (Repo und Geschwisterordner), keine Benutzerpfade — das Repo ist öffentlich (F-858).
Stand: 01.10.2026.

## Stand
**F44 „Design-Schnitt (F-725)“ ist IN_ARBEIT.** Akte `features/F44/feature.md`; Schnitt WS-0 bis WS-8 nach dem Challenger-Dokument 474 (`GO_STANDARD`), übernommen als `docs/design/abgleich-f725.md`. E-F44-1 = B (Zukunft sichtbar, deaktiviert, „kommt“) und E-F44-2 = B (de/en/tr/ru), Stefan 30.09.2026.

**WS-0 „Ablage & Harness“ ist gemergt** (#290, `3c779d8`). impeccable wird nicht freigegeben (WS0-6 geschlossen, F-870).

**WS-1 ist geteilt** (Challenger, 30.09.2026): WS-1a „Fundament“, WS-1b „Shell, Einstieg“; das Chat-Dock wandert nach WS-8. Pakettabelle in `features/F44/feature.md`, Vermerk in `docs/design/abgleich-f725.md` §5.1.

**WS-1a „Fundament“ ist gemergt** (#291, `1f9ddb2`): i18n-Kern und -Gate, Tokens hell/dunkel mit Kontrast, Theme, `#/einstellungen`, Neuladen-Hook (F-860), `render-nachweis` (F-867).

**WS-1b „Shell & Einstieg“ liegt auf Branch `feat/f725-ws1b-shell`** (Worktree `../aiw-f725-ws1a`, Basis `1f9ddb2`, nicht committet). Inhalt (Einzelheiten: Akte, Abschnitt „Stand WS-1b“):
- Persona-Bild `persona-gesicht.webp` = `face.png`, verlustfrei, pixelgleich (F-882).
- Sidebar V10 mit den neuen Routen `#/roadmap`, `#/produktzyklus`, `#/brain`, `#/nutzung`; „Entwicklung“ mit Untereinträgen Ausführungen und Auftrag & Start (F-879); „Zuletzt geöffnet“; Illustration (F-865 erledigt); Menü unter 700 px.
- Kopf V10: Projektauswahl mit „+“ (F-862 erledigt), Persona mit Statuszeile (einzige aria-live-Region), Sprache, Hell/Dunkel, „Frag Jarvis“ (Chatspalte bis WS-8). Nutzerkarte, Partikel, Schnellzugriff entfallen (F-878 erledigt); Bewegungsschalter nur auf `#/einstellungen`.
- `#/start` nach der Vorlage mit Motion-Nachweis, Ziel `#/dashboard`; Baustein „kommt“; Zwischenseiten Roadmap/Nutzung (F-880); Poll-Fehlerbanner im Stil der Vorlage; F-873 erledigt.
- Neue Module `kommt.js`, `auswahl-bremse.js`, `views/platzhalter.js` (mit Tests); `particle-drift.js` gelöscht; i18n-Gate prüft `data-i18n` in `*.html`; `render-nachweis` mit `animationenBei` und `anfragenBlockieren`.
- Nachweise `features/F44/nachweise/ws1b/` (kleine Matrix, F-876). Erzeugt gegen den laufenden Leitstand dieses Worktrees (Port 4173) und für den Projektwechsel gegen einen zweiten Leitstand mit Wegwerf-Projekt A im Scratchpad und `../f25-testprojekt-b`.
- Prüfpass einmal parallel, alle drei „Nicht freigegeben“; eine Korrekturrunde eingearbeitet (Akte), Rest als F-883 bis F-890. Kein zweiter Prüfpass.

**F-800 (Scout Datenerhebung) ist gemergt** (#289, `50bbccb`).

**F43 „Projekt aufrufen/anzeigen“ ist ABGESCHLOSSEN** (#287, Abnahme 30.09.2026), F-849 gemergt (#288). Offene Folge-Findings F-845, F-847, F-848, F-850 bis F-856; F-857 und F-854 laufen jetzt in F44 WS-6 bzw. WS-2.

**F36 „Capability Library wirksam machen“ ist ABGESCHLOSSEN** (Abnahme 29.09.2026, #267–#283; Details in `features/F36/feature.md`). F-831 gemergt (#286). Offene Folge-Findings: F-829 (mit F-820); F-822; F-840, F-841; F-842 bis F-844; F-834 bis F-836, F-838; `init.plugins` bleibt ungeprüft; F-815/F-816, F-818, F-791.

## Nächste Schritte
1. WS-1b prüfen (Challenger per Hash), Stefan committet, PR. Danach Worktree `../aiw-f725-ws1a` aufräumen.
2. F44 WS-2 „Übersicht, Entscheidungen, Roadmap“ (B, C, D mit F-854; `#/roadmap` ersetzt die Zwischenseite, F-880; F-888 Produktzyklus-Gliederung mitnehmen oder eigenes kleines Paket), danach WS-3 bis WS-8.
3. qa-Schritt F-820 zusammen mit F-829.
4. Vor F30 F-818 entscheiden: Der Vorstart-Scan blockiert Ort-B-Läufe auf ai-workforce selbst. Dabei F-859 klären (Scout für den Scanner-Architekten).
5. Opportunity Scanner (F30) — Planung vollständig in der Workforce (E-F30-4); Stack-Kandidaten aus `docs/harness/stack-kandidaten.md`.
6. Vorgemerkt: F-765/757, F-767, F-748/751, F-755, F-762, F-834 bis F-836, F-838, F-842 bis F-848, F-850 bis F-856; aus WS-1b F-877 (wackelnde Gates), F-883 (Status bei Poll-Ausfall), F-885 (offene Eingaben beim Projektwechsel, mit F-874 in WS-4).

Laufender Hinweis: Bricht ein Ort-B-Lauf mit „init.slash_commands enthält unbekannte Commands“ ab, mit `features/F36/nachweis-f831/erzeuge-nachweis.mjs` nachmessen und gegenprüfen; nur verweigerte Namen in die Referenzmenge.

## Aufräumen
- `docs/f800-scout` ist gemergt (#289): Worktree `../aiw-f800-scout` aus dem Haupt-Checkout entfernen (`git worktree remove ../aiw-f800-scout`), danach mit `git worktree list` prüfen.
- WS-0 ist gemergt: Worktree `../aiw-f725-ws0` entfernen, falls noch vorhanden.
- WS-1a ist gemergt; der Worktree `../aiw-f725-ws1a` trägt jetzt WS-1b (`feat/f725-ws1b-shell`). Nach deren Merge entfernen.

## Offene Entscheidungen Stefan
- F-889: Leerer Hash — nur beim ersten Laden einer Sitzung nach `#/start` (heute) oder immer.
- F-885: Projektwechsel mit offener Eingabe — Rückfrage oder Entwurf je Projekt halten (WS-4).
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
