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
- Seitenspeicher (F-1015, Challenger-Entscheidung 11.10.2026): RSS der Seite am Ende ≤ 1,2 × Wert nach 15 min (Aufwärmphase ausgenommen) UND JS-Heap, DOM-Knoten und Listener ≤ 1,2 × Wert nach 15 min; ausgewertet über Mediane (Minute 15–20 gegen die letzten 5 min, `scripts/messe-chat.mjs`). Ersetzt das frühere Ziel „RSS nach 2 h ≤ 1,2 × Wert nach dem Laden“, das die Aufwärmphase von Chromium mitmaß.
- Messbedingung (F45 P): Messungen bei gleichem Windows-Energiemodus vergleichen (F-1018, E-F45-4); ein Modern-Standby-Fenster macht den Abschnitt ab dort ungültig.

**Roadmap (WS B5b, erneut in R):**
- R1 Akten und `docs/projekt/roadmap.json` stimmen überein (Gate): jede Akte steht in der Roadmap, jeder Roadmap-Eintrag hat eine Akte; ein Meilenstein steht nur auf ABGESCHLOSSEN, wenn alle seine Features ABGESCHLOSSEN sind oder eine Begründung tragen.
- R2 Kennzahlen „Meilensteine x/y“ und „Features abgenommen x/y“ stimmen gegen die Akten.
- R3 Workstream-Zeilen kommen aus Daten (Workstreams als Daten, F-976), mindestens für F45 und F30.
- R4 Balken aus der Schätzung, Ist-Zone aus dem Ist, „Schätzung fehlt“ wo keine ist; kein erfundener Balken.
- R5 „Bis M5 fertig“ und „Plan gegen Ist“ werden berechnet.
- R6 „Anpassen“ (Priorität, Meilenstein, Schätzung, Pflichtbegründung) speichert in Akte bzw. Roadmap.
- R7 Nach jedem abgenommenen Ablauf aktualisieren sich Status und Ist des Workstreams ohne Handarbeit.

**Bestehensbedingung (E-Stefan = A, 535, F-980):** Ein echter Referenzauftrag läuft vom Coach bis zur Abnahme in einem Fremdprojekt, gleichwertig zum manuellen Ablauf. Belege:
1. Projektkarte wirkte bei allen planenden und prüfenden Rollen (B2a-1)
2. Arbeitspaket mit Ziel, AK, Nicht-Zielen, DoD wirkte vom Architekten bis zur Abnahme (B2a-2)
3. Skills/Agents „vorgesehen gegen benutzt“ (B1b-1 Review, B1b-2 Abnahme)
4. Mindest-Gates haben gewirkt (B1a)
5. Render-Nachweis im Lauf (B2b, B3)
6. Prüferpass code-reviewer/qa/design-guardian + höchstens eine Korrekturrunde als Schritt der Kette (B2b)
7. Schätzung gegen Ist je Arbeitspaket (B2a-2, B2b)
8. Rückfrage an Stefan während des Baus (B2b)
9. Verifikation in sauberer Umgebung, Branch/Worktree je Lauf (B1a)
10. Stefan muss keinen Zwischentext lesen (B2a-3, B2b)
11. K1–K5, P1–P5 und R1–R7 im Referenzlauf erneut erfüllt.
12. Harness-Abdeckung: Die Workforce erzeugt im Referenzlauf aus dem Projekt-Harness (DoD-Punkte aus CLAUDE.md, Hooks aus .claude/settings.json, Agents, Skills) eine Abgleich-Tabelle; jeder Eintrag ist „wirksam“ (Beleg aus der Laufakte), „ersetzt durch <Schritt>“ oder „bewusst nicht“ (Begründung). Bestanden, wenn kein Eintrag offen ist. Bewusst nicht: Commits durch die Workforce (Stefan committet, „Bereit zum Sichern“). (B1b-2)
13. Fähigkeiten: Mindestens ein MCP, ein Skill und ein Agent, die Stefan im Leitstand installiert bzw. aktiviert hat, sind im Lauf als „aktiv“ ausgewiesen und laut Laufakte benutzt; eine deaktivierte Fähigkeit ist im Lauf nicht verfügbar. (F)
14. Rückfrage statt Abbruch: Ein Befehl außerhalb des Werkzeugsatzes führt im Referenzlauf zu einer Rückfrage an Stefan (erlauben einmal / ablehnen), nicht zu VERWEIGERT mit Handarbeit. (B2b)
15. Website mit Bewegung (E-F45-10, Referenzauftrag R2): Eine kleine Landingpage mit Scroll-Animation, Interaktion und einem 3D-Element entsteht in einem Fremdprojekt mit Bibliotheken aus der Sammlung, Design-Referenzen als Eingabe mit Empfehlung und Motion-Skills über den Weg aus WS F; der Render-Nachweis zeigt die Bewegung (Bildfolge oder Video), hält das Ladezeit-Budget ein und belegt „Bewegung reduzieren“. (B3, R2)

## 3 Workstreams (Teil 1 — vor F30)
Reihenfolge = Tabellenreihenfolge. Prüfmodus „vor Merge“: Challenger prüft im Cloud-Clone (`npm ci && npm run check`, Node 24) vor dem Merge. Schätzung kalibriert am Ist von F44/F46 (UI-Arbeit ≈ 0,25–0,3 der früheren Schätzung, Server- und Laufarbeit ≈ 0,5, echte Läufe ≈ 1).

| WS | Inhalt | Findings | Abhängig von | Prüfmodus | Schätzung AT |
|---|---|---|---|---|---|
| B0 | Chat zuverlässig und schnell: Messskript, eigene Chat-Zeitgrenze, Chat-Worker fest, Fehler-Eintrag bei jedem Misserfolg, Neuladen verfolgt Lauf, Start-Hinweis bei falschem Ordner (E-188 bleibt streng), Event-Loop-Messung, Chat-Reiter; Akte F45 | F-987, F-986 a, F-971, F-544, F-1007, F-1008 | – | vor Merge | 0,75 |
| P | Performance: /api/zustand im Langlauf, Event-Loop-Blockaden beseitigen, Seitenwechsel messen, f16-Restordner | F-556, F-999 | B0 (Messskript) | vor Merge | 0,5 |
| S | Härtung klein: ein Git-Starter für alle Aufrufe, Geheimnis-Maskierung (Live-Aktivität, env im Harness-Detail), Abbruch-Formulierung | F-1000, F-1005, F-1003 | – | vor Merge | 0,3 |
| B1a | Lauf-Umgebung: Branch/Worktree je Lauf (Gültigkeitsschlüssel misst die Einstellungen des Lauf-Ordners), Vorlage nachziehen (513), Mindest-Gates im Skelett, check:template, Standard-Startvorlage aus dem Register, Löschen im Lauf, Kontrollzustand in Fremdprojekten | F-954, F-939, F-701, F-1009, F-715, F-766 | E-F45-3 | Advisor-Pass, vor Merge | 1–1,25 |
| B1b | Harness im Lauf, geschnitten am 11.10.2026: **B1b-1** Hintergrund-Ausführung abschalten und als unvollständig werten, Lauf-Härtung (npm-Installationsskripte aus, Schreiben nur im Arbeitsordner), Hooks im -p-Lauf belegen, commit-guard härten, „vorgesehen gegen benutzt“ ans Review, Vorstart-Scan; **B1b-2** Harness-Abgleich-Tabelle (Beleg 12) in Laufakte und auf der Seite Workforce, Kurzliste der benutzten Fähigkeiten an die Abnahme. Verschoben: Projekt-Agents/-Skills im Lauf und Freigabe nach Inhalt (F-815/F-816 → F), Codex-Harness-Regeln (F-929 → B2a), /lessons (F-933 → Teil 2) | B1b-1: F-1026, F-1027, F-1035, F-818, F-932, F-937 (Review); B1b-2: F-937 (Abnahme), Beleg 12 | B1a | vor Merge | 0,75 |
| F-1 | Fähigkeiten im Lauf (Server): Aktivierung je Projekt in `~/.ai-workforce/faehigkeiten.lokal.json` (E-F45-6/7/8), Projekt-Agents/-Skills nach Inhalt (Hash) und Opt-in, Agent-Sperre per Deny-Liste und Init-Gate, `init.plugins` leer, Laufakte aktiv/benutzt, Endpunkte | F-815, F-816, F-1012 (Server), F-910 (teilweise) | B1b | Advisor-Pass, vor Merge | Teil von 1,25–1,5 (Zeile F bis 12.10.2026); gemergt #323 |
| F-2a | Fähigkeiten-Oberfläche: Seite Workforce (installiert · aktiv · benutzt, Schalter, „Freigeben nach Inhalt“, Bänder ungültige Datei und Fremdänderung), Bindung der Projekt-Fähigkeiten an die Anzeige im Start-Body, Gründe der Empfehlung neu, Lauf-Detail „Fähigkeiten im Lauf“, Beleg 13 | F-1054, F-1012 (Oberfläche), F-1055 (1) Anzeige | F-1 | Advisor-Pass, vor Merge | Teil von 1,25–1,5 |
| F-2b-1 | Sammlung im Leitstand (`docs/harness/kandidaten-2026-09-15.md`, nur die Bewertungsmatrix: Kurzbeschreibung, Urteil, Lizenz, Kosten, Stand, Zuordnung zum Katalog, Typ, Auswahlgrund) als Unterreiter „Sammlung“; Scout liest zuerst die Sammlung; voller Hash im Lauf-Detail per Tastatur. Geteilt am 12.10.2026 (Stefan, Advisor A1) | F-1057 (K21), F-1060 (6) | F-2a | Advisor-Pass, vor Merge | ≈ 0,6 |
| F-2b-2a | „Auswählen“ → Eignungsprüfung der gepinnten Version (read-only Prüflauf der Rolle `eignungspruefung`, Prüfbericht als Kernartefakt); „Freigeben & installieren“ nur mit Bericht zur angezeigten Version (Urteil ≠ NICHT_GEEIGNET, sonst 409); Ausnahme-Begründung; echte Prüfläufe impeccable/context7-mcp. Geteilt am 12.10.2026 (Delta-Advisor: zu groß) | F-1056 (K20) teilweise | F-2b-1 | Advisor-Pass, vor Merge | ≈ 1,1–1,2 |
| F-2b-2b | F-1075-Rest nach **Variante C „Prüfen, was npm selbst schreibt“** (Entscheidung Stefan 12.10.2026, Challenger claude/599; ersetzt Lockfile-Bindung/Tar-Positivliste/node-tar-Vergleich): eine npm-Installation für Prüflauf und Installation, Paketordner von der Platte, kein verschachteltes `node_modules`, nur Registry-Abhängigkeiten, Ausnahme im Abgleich entfernt, eigener Tar-Leser entfernt, Sperre der npm-Installation nach Prüfung aufgehoben; F-1074 (8)/(9). Geteilt am 13.10.2026 (Advisor-Pass: TEIL 1 + TEIL 2 zu groß) | F-1075 (Rest, erledigt), F-1074 (8)/(9) | F-2b-2a | Advisor-Pass, vor Merge | ≈ 0,3 |
| F-2b-2c | Katalog über den Vormerken-Weg für Sammlungseinträge ohne Katalog (Variante `typ extern`, unterart, Ref-URL, Paket, **installation_vorlage aus dem Prüfbericht**), „Eignung prüfen“ im Freigabedialog der Capability Library, Detail als volle Tabellenzeile (`colspan`); Stand der lokalen Fähigkeiten-Datei über Neustarts (Advisor-Pass 13.10.2026: kein Kern-Artefakt, sondern `faehigkeiten.stand.json` neben der lokalen Datei, Startregel fail-closed, ARCHITECTURE.md §2); übersprungene Dateien sperren die Installation (F-1078 (b)). Gebaut 13.10.2026, Ist ≈ 0,5 AT (Advisor empfahl Teilung Server/Oberfläche — auf einem Branch gebaut, getrennt stagebar) | F-1056 (Rest), F-1061 (1), F-1068 (3), F-1078 (b) | F-2b-2b | Advisor-Pass, design-guardian, vor Merge | ≈ 0,3 (Ist ≈ 0,5) |
| F-3 | Plugins (E-F45-9): Katalogtyp `plugin`, Installation gepinnt (Commit-SHA + Inhalt-Hash), Bestandteile einzeln ausgewiesen und nur über die F-1-Wege, Plugin-Hooks nur nach eigener Freigabe je Hook-Hash, Init-Gate `init.plugins` = erwartete Menge; erste Kandidaten Claude Code Setup, Code Review (nur lokaler Bericht); extern_lesend-MCPs (E-F36-4 geändert, aus F-2b verschoben am 12.10.2026); fremde Agents über denselben Weg (Pin, Inhalts-Hash, Prüfbericht, Freigabe, Opt-in je Projekt; Challenger 12.10.2026) | F-910, F-1052, F-1051 | F-2b-2, B2a | Advisor-Pass, vor Merge | Schätzung fehlt |
| B2a-1 | Projektkarte (geteilt am 13.10.2026, Challenger): `src/projektkarte`, je Lauf deterministisch erzeugt, Zuschnitt je Rolle (Vorhaben, Bestand, Ausführungsrahmen, aktive Fähigkeiten, Qualität) an Architekt, Advisor und Code-Reviewer — Claude und Codex gleich, als Text im Auftrag; Hash/Abschnitte/Lücken in der Laufakte; Architekt im Feature-Modus mit Karte, Capability-Auszug und Lese-Anweisung (K27); ARCHITECTURE.md in der Projektmodus-Allowlist und Pflicht beim Stack-Entscheid (K28); DoD und Checkliste mit Urteil je Punkt an das Review; Beobachtungsblock nur für claude-code (K24). Gebaut 13.10.2026 | F-936, F-1064 (K26), F-1065 (K27), F-1066 (K28), F-929, F-931, F-829, F-1062 (K24) | B1b | Advisor-Pass, vor Merge | ≈ 0,6–0,7 |
| B2a-2 | Arbeitspaket: Auftrag v0 additiv um DoD-Verweis, betroffene Bereiche, Risiko/Kontrolltiefe, „Einrichtung durch Stefan“ (Schritt, wann nötig, Status; Liste im Leitstand vor dem Bau, K31) und Feature-Bezug erweitert (kein neuer Artefakttyp; `schemas/kontrollzustand-auftrag-payload.schema.json` trägt AK und `nicht_ziele` schon); AK-Entwurf aus der Finding-Maßnahme, Server rendert den Prompt aus Daten, Gate Pflichtfelder, Einrichtungsliste vor dem Bau | F-938, F-989, F-1071 (K31) | B2a-1 | Advisor-Pass, vor Merge | ≈ 0,5–0,6 |
| B2a-3 | Codex-Review-Spec und Ausgaberegel: `docs/projekt/codex-review-spec.md`, Review-Schema v2 additiv (K25), Regel „direkt ausführbar“ | F-1063 (K25), F-959, F-998 | B2a-1 | vor Merge | ≈ 0,4 |
| B2b | Kette und Grenzen: Advisor-Schema, Plan v2, Rückweg ≤ 1 je Stufe, qa-Schritt, design-guardian-Schritt mit Render-Nachweis im Lauf, Budget je Arbeitspaket mit Halt, Umfangs-Abgleich, Rückfrage während des Baus, Rechte-Rückfrage bei Befehlen außerhalb des Werkzeugsatzes (Spike zuerst: --permission-prompt-tool; sonst Halt mit „einmal erlauben und fortsetzen“), Codex-Nutzen messen, „Bereit zum Sichern“; API-Schlüssel im Lauf (Standard Attrappe, echter Aufruf nur nach Rückfrage, nur Umgebungsvariable, nie in Datei/Laufakte; K32, aus B2a verschoben am 13.10.2026) | F-909, F-203, F-820, F-980, F-981, F-978, F-982, F-979, F-1011, F-1072 (K32) | B2a | Advisor-Pass, vor Merge | 1,25–1,5 |
| B5a | Feature-Fluss: Coach legt Akte an, Akte im Leitstand bearbeiten (E-F45-1), Planung änderbar mit Datum, Bugs mit Feldern, Workstreams als Daten, Entscheidungen in der Akte-Leseroute, offene Abnahmen überall gezählt | F-912, F-984, F-990, F-975, F-976, F-995, F-991 | B2a | vor Merge | 0,75 |
| B5b | Roadmap richtig: Roadmap-Schema v1 (Workstreams mit Schätzung, Ist, Datum), Gate Akte ↔ Roadmap, Gantt-Zeilen und -Balken, Kennzahlen „Bis M5 fertig“ und „Plan gegen Ist“, Datenbereinigung als eine Bestätigungsliste für Stefan (kein Status ohne Stefan auf ABGESCHLOSSEN) | F-944, F-976 (Anzeige), F-990, F-1010 | B5a, B2b | vor Merge | 0,75–1 |
| B3 | Design & Motion in Fremdprojekten (E-F45-10): Design-Skill installierbar — impeccable ist laut Prüfbericht NICHT_GEEIGNET (Binary-Nachladen, Hooks; F-1076): Ersatz aus der Sammlung prüfen (taste-skill, animate-skill, ui-ux-pro-max; frontend-design ist installiert) oder gepinnte Teilkopie ohne Launcher/Hooks nach neuem Prüfbericht; design-guardian und Token-Gate im Skelett wie bisher; dazu Bibliotheken je Projekt aus der Sammlung, Design-Referenzen (Beispielseiten) als Eingabe mit Empfehlung, Motion-Skills über den Weg aus WS F, Render-Nachweis mit Bewegung (Bildfolge/Video, Ladezeit-Budget, „Bewegung reduzieren“) | F-911, F-1058 (K22), F-1059 (K23), F-1076 (K34) | B1a, B2b, F-2b | nach Merge | ≈ 1,4–1,55 |
| R | Referenzauftrag in einem Fremdprojekt (Vorschlag: haushaltsbuch2; nicht F30, damit die F30-Messcheckliste unberührt bleibt), Belege 1–14, eine Fixrunde, Abschluss F45 | F-980 | alle | echter Lauf | 1–2 |
| R2 | Referenzauftrag Website (E-F45-10): kleine Landingpage mit Scroll-Animation, Interaktion und einem 3D-Element in einem Fremdprojekt, Beleg 15 | F-1059 (K23) | R, B3 | echter Lauf | ≈ 1 |

Reihenfolge ab F (Challenger, 12.10.2026; B2a geteilt am 13.10.2026): F-1 → F-2a → F-2b-1 → F-2b-2a → F-2b-2b → F-2b-2c → B2a-1 → B2a-2 → B2a-3 → F-3 → B2b → B5a/B5b → B3 → R → R2. Grund: B2a liegt auf dem Weg zu R (Belege 1/2), F-3 nicht. (Vorher, Stefan 12.10.2026: F-1 → F-2a → F-2b → F-3 → B2a → …)

Summe Teil 1: ≈ 14,2–16,95 AT ohne F-3 (Schätzung fehlt) — gegenüber dem Stand vom 12.10.2026 (≈ 12,1–14,25 AT ohne F-2b und F-3) zusätzlich F-2b-1 ≈ 0,6, F-2b-2 ≈ 1–1,25 und B2a +0,5–0,85 (1,5–1,85 statt 1); davor ≈ 10–12 AT mit B3 0,3 und ohne R2.

## 4 Teil 2 — nicht nötig für den F30-Start (Weg: E-F45-2)
| Paket | Inhalt | Findings | Schätzung AT |
|---|---|---|---|
| B5b′ | Prioritäts-Kanban; Balken ziehen in der Roadmap | F-917 | 0,25–0,5 |
| B5c | Aufräumen: Click-to-Work-Modul, Scout nach Projektwechsel, Merge-Konvention, Restpunkte D2/D4/D5/D6, Register-Sichtung | F-928, F-943, F-924, F-927, F-957, F-963, F-992, F-994, F-1001, F-1004, F-1006, F-965, F-915 | 0,5–0,75 |
| H | Harness-Dokumente im Leitstand bearbeiten, nur als Vorschlag (E-F46-2) | F-985 | 0,5 |
| L | Lernschleife /lessons in der Workforce (aus B1b, 11.10.2026) | F-933 | 0,25 |

Summe Teil 2: ≈ 1,5–2 AT.

## 5 Offene Entscheidungen
- **E-F45-2** (fällig nach R): Teil 2 vor F30 wie bisher über Challenger-Bauaufträge (A) oder als erste Aufträge der Workforce an sich selbst, F30-Bau startet nach deren Abnahme (B). Empfehlung Challenger: B.
- **E-F45-3 = A** (Stefan, 11.10.2026, entschieden): eigener Git-Worktree auf eigenem Branch je schreibendem Ablauf; Löschen im Worktree über eine vom Server geprüfte Löschliste (F-715). Umsetzung B1a-1.
- **E-F45-5 = A** (Stefan, 11.10.2026, entschieden): Sauberkeit im Worktree wird nur beim Anlegen festgestellt; ein schreibender Schritt prüft danach, dass der Worktree genau auf `wf/<Ablauf-ID>` steht. Für den Projektordner gilt E-F39-1=B unverändert.
- **E-F45-4** (offen, aus F45 P, F-1018): Windows drosselt den Leitstand im Energiemodus „Beste Energieeffizienz“ um Faktor 5–10. (A) Energiemodus bei Netzbetrieb „Ausgeglichen“ (keine Codeänderung); (B) der Leitstand nimmt sich beim Start selbst aus der Drosselung (SetProcessInformation über einen PowerShell-Helfer). Stefan, 11.10.2026: für die F45-P-Messung nicht umgestellt.
- **E-F45-6 = Opt-in je Projekt** (Stefan, 12.10.2026, entschieden): Projekt-Agents/-Skills sind im Lauf nur aktiv, wenn Stefan sie je Projekt einschaltet und ihr Inhalt freigegeben ist; MCPs und installierte Skills sind Standard aktiv und je Projekt abschaltbar. Umsetzung F-1.
- **E-F45-7 = kaputte Datei sperrt** (Stefan, 12.10.2026, entschieden): Ist `faehigkeiten.lokal.json` vorhanden, aber ungültig oder nicht lesbar, startet kein Lauf mit Fähigkeiten, bis sie repariert oder gelöscht ist. Umsetzung F-1, Anzeige F-2a.
- **E-F45-8 = Ablage `~/.ai-workforce/faehigkeiten.lokal.json`** (Stefan, 12.10.2026, entschieden): außerhalb jedes Repos und Arbeitsordners; Änderung nur über den Leitstand, nie während eines Laufs. Umsetzung F-1.
- **E-F45-9 = B** (Stefan, 11.10.2026, entschieden, gegen die Empfehlung A): Plugins sind installierbar und im Lauf nutzbar. Folge: eigener Workstream F-3 mit Sicherheitsprüfung (Katalogtyp `plugin`, Installation gepinnt mit Commit-SHA und Inhalt-Hash, Bestandteile einzeln ausgewiesen und nur über die F-1-Wege, Plugin-Hooks nur nach eigener Freigabe je Hook-Hash, Init-Gate `init.plugins` = erwartete Menge). Erste Kandidaten aus `docs/harness/kandidaten-2026-09-15.md`: Claude Code Setup, Code Review (nur lokaler Bericht).
- **E-F45-10 = A** (Stefan, 12.10.2026, entschieden, gegen die Empfehlung B): Website-Fähigkeit (Motion, Interaktion, 3D; Website- und Design-Empfehlungen durch die Workforce) gehört ins Fixpaket, vor F30. B3 wird „Design & Motion in Fremdprojekten“; neuer Referenzauftrag R2 nach R, neuer Beleg 15.
- **Sammlung als Basis** (Stefan, 12.10.2026): `docs/harness/kandidaten-2026-09-15.md` ist die Basis der Fähigkeiten-Auswahl; sie kommt in F-2b in den Leitstand (Kurzbeschreibung, Urteil, Lizenz, Kosten, Stand) mit „Auswählen“ → Prüflauf → Katalog.
- **F-2b-2 geteilt** (Delta-Advisor-Pass 12.10.2026, Auftrag F-2b-2: „zu groß“ → teilen): F-2b-2a Prüflauf, Prüfbericht, Sperre der Freigabe (zuerst); F-2b-2b Vormerken/Katalog, „Eignung prüfen“ in der Capability Library, F-1061 (1).
- **F-2b-2b geteilt** (Advisor-Pass 13.10.2026, Auftrag F-2b-2b: TEIL 1 + TEIL 2 „zu groß“): F-2b-2b npm-Strukturfix Variante C (TEIL 1); F-2b-2c Vormerken/Katalog, „Eignung prüfen“ in der Capability Library, Detail als volle Zeile, F-1061 (1) (TEIL 2). Platz von F-2b-2c in der Reihenfolge: direkt nach F-2b-2b, sofern Stefan nichts anderes entscheidet.
- **B2a geteilt** (Challenger, 13.10.2026; gegen `c62e7e7`): B2a ist für einen Bau zu groß → B2a-1 Projektkarte (≈ 0,6–0,7 AT; F-936, F-1064, F-1065, F-1066, F-929, F-931, F-829, F-1062), B2a-2 Arbeitspaket (≈ 0,5–0,6 AT; F-938, F-989, F-1071), B2a-3 Codex-Review-Spec + Ausgaberegel (≈ 0,4 AT; F-1063, F-959, F-998); F-1072 (API-Schlüssel) geht nach B2b. Summe B2a ≈ 1,5–1,7 AT (vorher 1,5–1,85 einschließlich F-1072; die Schätzung von B2b ist um F-1072 noch nicht erhöht).
- **O2 B2a-1 = Ordnerstruktur + Datenzugriff** (Challenger, 13.10.2026): Pflicht beim Stack-Entscheid sind die ARCHITECTURE.md-Abschnitte „Ordnerstruktur“ und „Datenzugriff“; „Module“ nur als Satz in der Stack-Instruktion; das Skelett bleibt unverändert.
- **F-2b geteilt** (Stefan, 12.10.2026, Advisor A1): F-2b-1 Sammlung lesen und zeigen, Scout liest die Sammlung; F-2b-2 Auswählen → Eignungsprüfung → Katalog und Sperre der Freigabe. Sammlung: alle 176 Zeilen der Bewertungsmatrix sichtbar, davon 172 mit Link; die 4 ohne Link sind nicht auswählbar (O1). extern_lesend-MCPs von F-2b nach F-3.

## 6 Nicht im Fixpaket
Schreibende oder nach außen wirkende MCPs (bleiben nach E-F36-4 gesperrt; Änderung nur per eigener Entscheidung Stefan) · Terminal-Panel (E-F46-1, eigenes Vorhaben danach) · gestufter Kontext (F-930, nach F30) · großer UX/UI-Durchgang (nach F30, vor V0.9).
