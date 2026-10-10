# Fixpaket „Arbeitsfähigkeit“ (F45) — Grundlage und Umsetzungsplan

Stand 03.10.2026 (Challenge auf `main` = `d10f9be`). Quelle: Challenger, Fixpaket-Inhalt aus 490/500/513/520/535/543/545, gegen das Repo geprüft. Die Akte ist `features/F45/feature.md`; diese Datei ist die Grundlage für alle Bauaufträge F45 (Muster `docs/design/abgleich-f46.md`).

## 1 Ziel (Stefan, 03.10.2026)
Nach dem Fixpaket arbeitet die Workforce so, wie Stefan heute mit Challenger-Chat und Claude Code in VS Code auf Grundlage des Harness arbeitet (E-M5-19): Challenge und Plan → Arbeitspaket → Bau mit Harness (CLAUDE.md, Hooks, Agents, Skills, MCPs) → Prüferpass, Render-Nachweis, `npm run check` → Rückfrage bei Bedarf → Abnahme → fertige Git-Befehle für Stefan. Der Chat funktioniert gut, die Performance stimmt, Stefan installiert, aktiviert und sieht Fähigkeiten (MCPs, Skills, Agents, Plugins) im Leitstand, die Roadmap stimmt, und F30 (Opportunity Scanner) kann direkt mit der Workforce selbst entwickelt werden.

Gleichwertigkeit zum heutigen Ablauf:
| Heute (manuell) | Nach F45 (Workforce) | WS |
|---|---|---|
| Challenger-Chat challengt und plant | Coach, Architekt, Advisor mit Projektkarte; Plan v2 | B2a, B2b |
| Bauauftrag nach Schema 520 | Arbeitspaket als Daten (Ziel, AK, NICHT, DoD, Budget) | B2a |
| Claude Code in VS Code mit CLAUDE.md, Hooks, Subagenten, Skills, MCPs, Plugins | Ausführung mit demselben Harness, Fähigkeiten im Leitstand verwaltet | B1b, F |
| Rechteabfrage in VS Code bei einem neuen Befehl | Rückfrage an Stefan im Leitstand statt Abbruch | B2b |
| Prüferpass code-reviewer/qa/design-guardian, Render-Nachweis | Prüfschritte der Kette | B2b |
| eigener Branch/Worktree | Branch/Worktree je Lauf | B1a |
| Challenger prüft vor dem Merge | Review in sauberer Umgebung, Bericht im Schema | B1a, B2b |
| Stefan stagt, committet, pusht | „Bereit zum Sichern“ mit fertigen Befehlen | B2b |

## 2 Abnahmekriterien (messbar)
**Chat (WS B0, erneut in R):** gemessen mit `scripts/messe-chat.mjs`, Leitstand aus dem Hauptordner, echter Bestand.
- K1 Absenden → 202: Median ≤ 300 ms, Max ≤ 1 000 ms, auch nach 30 min Laufzeit.
- K2 202 → Prozessstart (Server-Marken `request_eingang` → `prozess_gestartet`): Median ≤ 1 000 ms.
- K3 Absenden → Antwort sichtbar: Jarvis Median ≤ 15 s, Max ≤ 45 s; Coach Median ≤ 25 s, Max ≤ 90 s.
- K4 20 von 20 Turns enden sichtbar (Antwort oder Fehler mit Grund), kein hängender Lauf.
- K5 Zeitgrenze, Abbruch und „nie gestartet“ hinterlassen je einen Fehler-Eintrag; nach Neuladen wird ein laufender Chat-Lauf weiter verfolgt.

**Performance (WS P, erneut in R):**
- P1 GET /api/zustand: p95 ≤ 300 ms frisch und nach 2 h Laufzeit mit offener Seite.
- P2 Event-Loop: max ≤ 200 ms je 60-s-Fenster im Normalbetrieb (kein Prüfschritt aktiv).
- P3 Seitenwechsel der sechs Hauptseiten: Inhalt sichtbar ≤ 500 ms.
- P4 `npm run check` lokal dreimal hintereinander grün, kein sporadischer Fehler (F-999).
- P5 Während eines Baulaufs antworten Poll und Seiten in ≤ 1 s.

**Roadmap (WS B5b, erneut in R):**
- R1 Akten und `docs/projekt/roadmap.json` stimmen überein (Gate): jede Akte steht in der Roadmap, jeder Roadmap-Eintrag hat eine Akte; ein Meilenstein steht nur auf ABGESCHLOSSEN, wenn alle seine Features ABGESCHLOSSEN sind oder eine Begründung tragen.
- R2 Kennzahlen „Meilensteine x/y“ und „Features abgenommen x/y“ stimmen gegen die Akten.
- R3 Workstream-Zeilen kommen aus Daten (Workstreams als Daten, F-976), mindestens für F45 und F30.
- R4 Balken aus der Schätzung, Ist-Zone aus dem Ist, „Schätzung fehlt“ wo keine ist; kein erfundener Balken.
- R5 „Bis M5 fertig“ und „Plan gegen Ist“ werden berechnet.
- R6 „Anpassen“ (Priorität, Meilenstein, Schätzung, Pflichtbegründung) speichert in Akte bzw. Roadmap.
- R7 Nach jedem abgenommenen Ablauf aktualisieren sich Status und Ist des Workstreams ohne Handarbeit.

**Bestehensbedingung (E-Stefan = A, 535, F-980):** Ein echter Referenzauftrag läuft vom Coach bis zur Abnahme in einem Fremdprojekt, gleichwertig zum manuellen Ablauf. Belege:
1. Projektkarte wirkte bei allen planenden und prüfenden Rollen (B2a)
2. Arbeitspaket mit Ziel, AK, Nicht-Zielen, DoD wirkte vom Architekten bis zur Abnahme (B2a)
3. Skills/Agents „vorgesehen gegen benutzt“ (B1b)
4. Mindest-Gates haben gewirkt (B1a)
5. Render-Nachweis im Lauf (B2b, B3)
6. Prüferpass code-reviewer/qa/design-guardian + höchstens eine Korrekturrunde als Schritt der Kette (B2b)
7. Schätzung gegen Ist je Arbeitspaket (B2a, B2b)
8. Rückfrage an Stefan während des Baus (B2b)
9. Verifikation in sauberer Umgebung, Branch/Worktree je Lauf (B1a)
10. Stefan muss keinen Zwischentext lesen (B2a, B2b)
11. K1–K5, P1–P5 und R1–R7 im Referenzlauf erneut erfüllt.
12. Harness-Abdeckung: Die Workforce erzeugt im Referenzlauf aus dem Projekt-Harness (DoD-Punkte aus CLAUDE.md, Hooks aus .claude/settings.json, Agents, Skills) eine Abgleich-Tabelle; jeder Eintrag ist „wirksam“ (Beleg aus der Laufakte), „ersetzt durch <Schritt>“ oder „bewusst nicht“ (Begründung). Bestanden, wenn kein Eintrag offen ist. Bewusst nicht: Commits durch die Workforce (Stefan committet, „Bereit zum Sichern“). (B1b)
13. Fähigkeiten: Mindestens ein MCP, ein Skill und ein Agent, die Stefan im Leitstand installiert bzw. aktiviert hat, sind im Lauf als „aktiv“ ausgewiesen und laut Laufakte benutzt; eine deaktivierte Fähigkeit ist im Lauf nicht verfügbar. (F)
14. Rückfrage statt Abbruch: Ein Befehl außerhalb des Werkzeugsatzes führt im Referenzlauf zu einer Rückfrage an Stefan (erlauben einmal / ablehnen), nicht zu VERWEIGERT mit Handarbeit. (B2b)

## 3 Workstreams (Teil 1 — vor F30)
Reihenfolge = Tabellenreihenfolge. Prüfmodus „vor Merge“: Challenger prüft im Cloud-Clone (`npm ci && npm run check`, Node 24) vor dem Merge. Schätzung kalibriert am Ist von F44/F46 (UI-Arbeit ≈ 0,25–0,3 der früheren Schätzung, Server- und Laufarbeit ≈ 0,5, echte Läufe ≈ 1).

| WS | Inhalt | Findings | Abhängig von | Prüfmodus | Schätzung AT |
|---|---|---|---|---|---|
| B0 | Chat zuverlässig und schnell: Messskript, eigene Chat-Zeitgrenze, Chat-Worker fest, Fehler-Eintrag bei jedem Misserfolg, Neuladen verfolgt Lauf, Start-Hinweis bei falschem Ordner (E-188 bleibt streng), Event-Loop-Messung, Chat-Reiter; Akte F45 | F-987, F-986 a, F-971, F-544, F-1007, F-1008 | – | vor Merge | 0,75 |
| P | Performance: /api/zustand im Langlauf, Event-Loop-Blockaden beseitigen, Seitenwechsel messen, f16-Restordner | F-556, F-999 | B0 (Messskript) | vor Merge | 0,5 |
| S | Härtung klein: ein Git-Starter für alle Aufrufe, Geheimnis-Maskierung (Live-Aktivität, env im Harness-Detail), Abbruch-Formulierung | F-1000, F-1005, F-1003 | – | vor Merge | 0,3 |
| B1a | Lauf-Umgebung: Branch/Worktree je Lauf (Gültigkeitsschlüssel misst die Einstellungen des Lauf-Ordners), Vorlage nachziehen (513), Mindest-Gates im Skelett, check:template, Standard-Startvorlage aus dem Register, Löschen im Lauf, Kontrollzustand in Fremdprojekten | F-954, F-939, F-701, F-1009, F-715, F-766 | E-F45-3 | Advisor-Pass, vor Merge | 1–1,25 |
| B1b | Harness im Lauf: Projekt-Agents/-Skills im Lauf, Freigabe nach Inhalt, Vorstart-Scan, Codex-Harness-Regeln, Hooks belegen, „vorgesehen gegen benutzt“ an Review und Abnahme, /lessons, Harness-Abgleich-Tabelle (Beleg 12) in Laufakte und auf der Seite Workforce | F-815, F-816, F-818, F-929, F-932, F-937, F-933 | B1a | vor Merge | 0,75 |
| F | Fähigkeiten verwalten: MCPs, Skills, Agents und Plugins im Leitstand installieren (auch aus den OFFEN-Einträgen), je Projekt aktivieren/deaktivieren (wirkt ab dem nächsten Lauf, gespeichert im Workforce-Register, nicht in settings.json — E-F46-2), Agents installierbar und im Lauf nutzbar, Plugins im Fähigkeitenmodell; sichtbar: installiert · aktiv · im letzten Lauf benutzt (Seite Workforce, Lauf-Detail); MCP-Grenzen nach E-F36-4 (Einzelfreigabe, Kosten sichtbar, nur lesend) | F-815 (Agents), F-910, F-859, F-1012 | B1b | Advisor-Pass, vor Merge | 1,25–1,5 |
| B2a | Arbeitspaket als Daten (einziges Übergabeformat, Server rendert den Prompt, Gate prüft Pflichtfelder) und Projektkarte an alle planenden/prüfenden Rollen; DoD und Checkliste an Review/qa; Feature ↔ Ablauf | F-938, F-936, F-829, F-931, F-989, F-998, F-959 | B1b | vor Merge | 1 |
| B2b | Kette und Grenzen: Advisor-Schema, Plan v2, Rückweg ≤ 1 je Stufe, qa-Schritt, design-guardian-Schritt mit Render-Nachweis im Lauf, Budget je Arbeitspaket mit Halt, Umfangs-Abgleich, Rückfrage während des Baus, Rechte-Rückfrage bei Befehlen außerhalb des Werkzeugsatzes (Spike zuerst: --permission-prompt-tool; sonst Halt mit „einmal erlauben und fortsetzen“), Codex-Nutzen messen, „Bereit zum Sichern“ | F-909, F-203, F-820, F-980, F-981, F-978, F-982, F-979, F-1011 | B2a | Advisor-Pass, vor Merge | 1,25–1,5 |
| B5a | Feature-Fluss: Coach legt Akte an, Akte im Leitstand bearbeiten (E-F45-1), Planung änderbar mit Datum, Bugs mit Feldern, Workstreams als Daten, Entscheidungen in der Akte-Leseroute, offene Abnahmen überall gezählt | F-912, F-984, F-990, F-975, F-976, F-995, F-991 | B2a | vor Merge | 0,75 |
| B5b | Roadmap richtig: Roadmap-Schema v1 (Workstreams mit Schätzung, Ist, Datum), Gate Akte ↔ Roadmap, Gantt-Zeilen und -Balken, Kennzahlen „Bis M5 fertig“ und „Plan gegen Ist“, Datenbereinigung als eine Bestätigungsliste für Stefan (kein Status ohne Stefan auf ABGESCHLOSSEN) | F-944, F-976 (Anzeige), F-990, F-1010 | B5a, B2b | vor Merge | 0,75–1 |
| B3 | Design in Fremdprojekten: impeccable installierbar, design-guardian und Token-Gate im Skelett | F-911 | B1a, B2b | nach Merge | 0,3 |
| R | Referenzauftrag in einem Fremdprojekt (Vorschlag: haushaltsbuch2; nicht F30, damit die F30-Messcheckliste unberührt bleibt), Belege 1–14, eine Fixrunde, Abschluss F45 | F-980 | alle | echter Lauf | 1–2 |

Summe Teil 1: ≈ 10–12 AT.

## 4 Teil 2 — nicht nötig für den F30-Start (Weg: E-F45-2)
| Paket | Inhalt | Findings | Schätzung AT |
|---|---|---|---|
| B5b′ | Prioritäts-Kanban; Balken ziehen in der Roadmap | F-917 | 0,25–0,5 |
| B5c | Aufräumen: Click-to-Work-Modul, Scout nach Projektwechsel, Merge-Konvention, Restpunkte D2/D4/D5/D6, Register-Sichtung | F-928, F-943, F-924, F-927, F-957, F-963, F-992, F-994, F-1001, F-1004, F-1006, F-965, F-915 | 0,5–0,75 |
| H | Harness-Dokumente im Leitstand bearbeiten, nur als Vorschlag (E-F46-2) | F-985 | 0,5 |

Summe Teil 2: ≈ 1,25–1,75 AT.

## 5 Offene Entscheidungen
- **E-F45-2** (fällig nach R): Teil 2 vor F30 wie bisher über Challenger-Bauaufträge (A) oder als erste Aufträge der Workforce an sich selbst, F30-Bau startet nach deren Abnahme (B). Empfehlung Challenger: B.
- **E-F45-3** (fällig vor B1a): Lauf-Umgebung — eigener Worktree je Lauf oder nur eigener Branch; darf der Lauf im eigenen Worktree löschen (F-715). Vorbereitung in der B1a-Challenge.

## 6 Nicht im Fixpaket
Schreibende oder nach außen wirkende MCPs (bleiben nach E-F36-4 gesperrt; Änderung nur per eigener Entscheidung Stefan) · Terminal-Panel (E-F46-1, eigenes Vorhaben danach) · gestufter Kontext (F-930, nach F30) · großer UX/UI-Durchgang (nach F30, vor V0.9).
