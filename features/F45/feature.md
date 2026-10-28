# F45 — Fixpaket Arbeitsfähigkeit

Akten-Archiv (F45 W2d, analog E-K-1; gilt für jede Feature-Akte; DEKLARIERT, kein Gate): Stand-Abschnitte (`## Stand …`)
erledigter Pakete (gemergt laut `## Workstreams` bzw. git) werden gesammelt, wenn die Akte spürbar gewachsen ist, als ganze
Abschnitte (Überschrift bis vor die nächste `## `-Überschrift) wörtlich und in der Reihenfolge der Akte am Ende von
`features/<id>/akte-archiv.md` angefügt — ab dem ältesten und ohne Lücke (der Abschnitt eines nicht erledigten Pakets
beendet den Lauf); die letzten drei Stand-Abschnitte (auch der eines laufenden Pakets) bleiben in der Akte, alle anderen
Abschnitte bleiben unverändert. Ausnahmen: der Hinweissatz unter dieser Regel in der Akte nennt den archivierten Bereich und
wird je Lauf nachgezogen; eine neue `akte-archiv.md` bekommt diese Regel als Kopf. Kontrolle: Akte und Archiv zusammen
enthalten jeden Abschnitt der Akte vor dem Lauf byte-gleich (verglichen ohne abschließende Leerzeilen; eine Leerzeile trennt
die Abschnitte). Lesen nur bei Bedarf.

Ältere Stand-Abschnitte (B0 bis W2b-1): `features/F45/akte-archiv.md`.

## ID
F45

## Titel
Fixpaket Arbeitsfähigkeit

## Status
Status: IN_ARBEIT

B0 gemergt #316 (`9bdfc1a`; Abschnitt „Stand B0“). P gemergt #317 (`8e5adf9`; Abschnitt „Stand P“). S gemergt #318 (`387f1a3`; Abschnitt „Stand S“). B1a-1 gemergt #319 (`fde3b06`; Abschnitt „Stand B1a-1“). B1a-2 gemergt #320 (`cf433fd`; Abschnitt „Stand B1a-2“). B1b-1 gemergt #321 (`febcc86`; Abschnitt „Stand B1b-1“). B1b-2 gemergt #322 (`581269a`; Abschnitt „Stand B1b-2“). F-1 gemergt #323 (`849fda5`; Abschnitt „Stand F-1“). F-2a gemergt #324 (`83a576c`; Abschnitt „Stand F-2a“). F-2b-1 gemergt #325 (`1985e9b`; Abschnitt „Stand F-2b-1“). F-2b-2 nach dem Delta-Advisor-Pass geteilt: F-2b-2a (Prüflauf, Prüfbericht, Freigabe nur mit Bericht) gemergt #326 (`2af1b54`; Abschnitt „Stand F-2b-2a“). F-2b-2b (npm-Strukturfix Variante C, F-1075) gebaut (Branch `f45/f2b2b-npm-strukturfix`, Basis `2af1b54`, nicht committet; Abschnitt „Stand F-2b-2b“); nach dem Advisor-Pass geteilt. F-2b-2b gemergt #327 (`ec4ad21`). F-2b-2c (Sammlung → Katalog, „Eignung prüfen“, Detailzeile, Stand der lokalen Datei über Neustarts, F-1078 (b)) gebaut (Branch `f45/f2b2c-sammlung-katalog`, Basis `ec4ad21`, nicht committet; Abschnitt „Stand F-2b-2c“). F-2b-2c gemergt #328 (`c62e7e7`). B2a geteilt (Challenger, 13.10.2026) in B2a-1/-2/-3; B2a-1 „Projektkarte“ gebaut (Branch `f45/b2a1-projektkarte`, Basis `c62e7e7`, nicht committet; Abschnitt „Stand B2a-1“). B2a-1 gemergt #329 (`b3fcbf9`). B2a-2 „Arbeitspaket“ gebaut (Branch `f45/b2a2-arbeitspaket`, Basis `b3fcbf9`, nicht committet; Abschnitt „Stand B2a-2“). B2a-2 gemergt #330 (`a6d3411`). B2a-3 nach dem Advisor-Pass geteilt (Stefan, 13.10.2026) in B2a-3a/B2a-3b; B2a-3a „Codex-Review-Spec + Ausgaberegel“ gebaut (Branch `f45/b2a3-codex-review`, Basis `a6d3411`, nicht committet; Abschnitt „Stand B2a-3a“). B2a-3a gemergt #331 (`2fd1ac5`). B2a-3b „Geprüfter Stand und Review veraltet, Befehlsblöcke im Leitstand“ gebaut (Branch `f45/b2a3b-review-stand`, Basis `2fd1ac5`, nicht committet; Abschnitt „Stand B2a-3b“). B2a gilt als abgeschlossen, wenn auch B2a-3b gemergt ist. Stand der Pakete nach F-3b-1 bis B2b-3b-2 (gemergt bis #365): `docs/projekt/fixpaket-f45.md` und `docs/STATUS.md`. B2b-4 geteilt (Challenger, 19.10.2026) in B2b-4a-1/-4a-2/-4b; B2b-4a-1 „Bereit zum Sichern, Server-Teil“ gemergt #366 (`7a56d86`; Abschnitt „Stand B2b-4a-1“). B2b-4a-2 geteilt (Challenger, 19.10.2026) in 4a-2a/4a-2b; B2b-4a-2a „Blockform“ gebaut (Branch `f45/b2b4a2-anzeige`, Basis `7a56d86`, nicht committet; Abschnitt „Stand B2b-4a-2a“). B2b-4a-2a gemergt #367 (`0bf84ff`). B2b-4a-2b geteilt (Challenger, 20.10.2026) in 4a-2b-1/4a-2b-2; B2b-4a-2b-1 „Regeln und node_modules“ gebaut (Branch `f45/b2b4a2b-anzeige`, Basis `0bf84ff`, nicht committet; Abschnitt „Stand B2b-4a-2b-1“). B2b-4a-2b-1 gemergt #368 (`fabb6a1`). B2b-4a-2b-2 „Anzeige“ gebaut (Branch `f45/b2b4a2b2-anzeige`, Basis `fabb6a1`, nicht committet; Abschnitt „Stand B2b-4a-2b-2“); B2b-4a damit abgeschlossen, offen in B2b-4 nur B2b-4b. B5a/B5b geteilt (Challenger, 23.10.2026) in B5a-1, B5a-2, B5b-1, B5b-2, B5b-3; B5a-1 „Akte schreiben“ gemergt #374 (`5c23bfb`; Abschnitt „Stand B5a-1“). B5a-2 „Akte anzeigen“ gebaut (Branch `f45/b5a2-akte-anzeige`, Basis `5c23bfb`, nicht committet; Abschnitt „Stand B5a-2“). B5a-2 gemergt #375 (`e750e94`). B5b-1 nach dem Advisor-Pass geteilt (Challenger, 24.10.2026) in B5b-1a/B5b-1b; B5b-1a „Planungsdaten lesen“ gebaut (Branch `f45/b5b1-planungsdaten`, Basis `e750e94`, nicht committet; Abschnitt „Stand B5b-1a“), gemergt #376 (`941bfc9`). B5b-1b nach dem Advisor-Pass geteilt (Challenger, 24.10.2026) in B5b-1b-1/B5b-1b-2; B5b-1b-1 „Planung schreiben“ gebaut (Branch `f45/b5b1b-planung-schreiben`, Basis `941bfc9`, nicht committet; Abschnitt „Stand B5b-1b-1“), gemergt #377 (`2896f80`). B5b-1b-2 „Bereinigungsliste“ gebaut (Branch `f45/b5b1b2-bereinigung`, Basis `2896f80`, nicht committet; Abschnitt „Stand B5b-1b-2“). Stand B5b-2a bis B5b-2b-2 (gemergt bis #382) in den Abschnitten „Stand B5b-2a“ bis „Stand B5b-2b-2“. B5b-2c nach dem Advisor-Pass geteilt (Challenger, 25.10.2026) in B5b-2c-1/B5b-2c-2; B5b-2c-1 „Entwicklung: Zuordnung, Kanban · Priorität, Bug-Felder“ gebaut (Branch `f45/b5b2c-pflege-kanban`, Basis `d3b217e`, nicht committet; Abschnitt „Stand B5b-2c-1“), gemergt #384; B5b-2c-2-C gemergt #385; B5b-2c-2-AB „Gantt Pflege & Fixes, Restpunkte“ gebaut (Branch `f45/b5b2c2ab-pflege-gantt`, Basis `f78aac6`, nicht committet; Abschnitt „Stand B5b-2c-2-AB“) — damit B5b-2 gebaut. Status bleibt IN_ARBEIT bis zur Abnahme durch Stefan.

Gültige Status-Werte (geprüft vom Gate): ENTWURF, READY_FOR_TECH, WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN, BLOCKIERT, ABGEBROCHEN.

## Ziel
Nach dem Fixpaket arbeitet die Workforce so, wie Stefan heute mit Challenger-Chat und Claude Code in VS Code auf Grundlage des Harness arbeitet (E-M5-19): Challenge und Plan → Arbeitspaket → Bau mit Harness (CLAUDE.md, Hooks, Agents, Skills, MCPs) → Prüferpass, Render-Nachweis, `npm run check` → Rückfrage bei Bedarf → Abnahme → fertige Git-Befehle für Stefan. Der Chat funktioniert gut, die Performance stimmt, Stefan installiert, aktiviert und sieht Fähigkeiten (MCPs, Skills, Agents, Plugins) im Leitstand, die Roadmap stimmt, und F30 (Opportunity Scanner) kann direkt mit der Workforce selbst entwickelt werden.

## Grundlage
`docs/projekt/fixpaket-f45.md` — Ziel, Abnahmekriterien (K1–K5, P1–P5, R1–R7, Bestehensbedingung mit Belegen 1–14), Workstreams, offene Entscheidungen. Alle Bauaufträge F45 arbeiten gegen diese Datei.

## Entscheidungen
- **E-F45-1 = A** (Stefan, 01.10.2026) — Eine Feature-Akte wird direkt im Leitstand bearbeitet; Wortlaut in `docs/projekt/zielfassung.md` §13.6.
- **E-F45-2** (offen, fällig nach F30-M1 — Klärung Challenger 25.10.2026, vorher „nach R“) — Teil 2 vor F30 über Challenger-Bauaufträge (A) oder als erste Aufträge der Workforce an sich selbst (B). Empfehlung Challenger: B. Grundlage Abschnitt 5.
- **E-F45-3 = A** (Stefan, 11.10.2026) — Jeder schreibende Ablauf der Workforce arbeitet in einem eigenen Git-Worktree auf eigenem Branch neben dem Projekt. Stefans Projektordner bleibt unberührt. Im eigenen Worktree darf der Ablauf Dateien löschen — über eine Löschliste, die der Server prüft und ausführt. Wortlaut in `docs/projekt/zielfassung.md` §13.6; Umsetzung B1a-1.
- **E-F45-5 = A** (Stefan, 11.10.2026) — Auslegung von E-F39-1=B im Arbeitsordner: Sauberkeit wird beim Anlegen des Worktrees festgestellt; ein schreibender Schritt prüft danach nur, dass der Worktree genau auf `wf/<Ablauf-ID>` steht (der Korrekturlauf findet die Änderungen des ersten Baus vor). Für den Projektordner gilt E-F39-1=B unverändert. Grundlage `features/F45/plan-b1a1.md` (Plan v3 B6).
- **E-F45-4** (offen, aus WS P, F-1018) — Energiemodus „Ausgeglichen“ (A) oder der Leitstand nimmt sich selbst aus der Drosselung (B). Grundlage Abschnitt 5.
- **E-F45-6 = Opt-in je Projekt** (Stefan, 12.10.2026) — Projekt-Agents/-Skills sind im Lauf nur aktiv, wenn Stefan sie je Projekt einschaltet (und ihr Inhalt freigegeben ist); ohne Einstellung bleibt alles wie vorher. MCPs und installierte Skills bleiben Standard aktiv und sind je Projekt abschaltbar. Grundlage `features/F45/plan-f1.md`.
- **E-F45-7 = kaputte Datei sperrt** (Stefan, 12.10.2026) — Ist `faehigkeiten.lokal.json` vorhanden, aber ungültig oder nicht lesbar, startet kein Lauf mit Katalog-Fähigkeiten („reparieren oder löschen“); Server und alle anderen Läufe laufen weiter.
- **E-F45-8 = Ablage `~/.ai-workforce/faehigkeiten.lokal.json`** (Stefan, 12.10.2026) — außerhalb jedes Repos und Arbeitsordners; die Änderungs-Endpunkte sind gesperrt, solange ein Lauf aktiv ist (ARCHITECTURE.md §2).
- **E-F45-9 = B** (Stefan, 11.10.2026, gegen die Empfehlung A) — Plugins sind installierbar und im Lauf nutzbar. Folge: eigener Workstream F-3 mit Sicherheitsprüfung (Katalogtyp `plugin`, Installation gepinnt mit Commit-SHA und Inhalt-Hash, Bestandteile einzeln ausgewiesen und nur über die F-1-Wege, Plugin-Hooks nur nach eigener Freigabe je Hook-Hash, Init-Gate `init.plugins` = erwartete Menge). Erste Kandidaten aus `docs/harness/kandidaten-2026-09-15.md`: Claude Code Setup, Code Review (nur lokaler Bericht).
- **E-F45-10 = A** (Stefan, 12.10.2026, gegen die Empfehlung B) — Website-Fähigkeit (Motion, Interaktion, 3D; Website- und Design-Empfehlungen durch die Workforce) gehört ins Fixpaket, vor F30. B3 wird „Design & Motion in Fremdprojekten“ (bisheriger Inhalt plus Bibliotheken je Projekt aus der Sammlung, Design-Referenzen als Eingabe mit Empfehlung, Motion-Skills über den F-Weg, Render-Nachweis mit Bewegung: Bildfolge/Video, Ladezeit-Budget, „Bewegung reduzieren“). Neuer Referenzauftrag R2 nach R (kleine Landingpage mit Scroll-Animation, Interaktion und einem 3D-Element), neuer Beleg 15.
- **Sammlung als Basis** (Stefan, 12.10.2026) — `docs/harness/kandidaten-2026-09-15.md` ist die Basis der Fähigkeiten-Auswahl; sie kommt in F-2b in den Leitstand (Kurzbeschreibung, Urteil, Lizenz, Kosten, Stand) mit „Auswählen“ → Prüflauf → Katalog. Reihenfolge ab F (Challenger, 12.10.2026): F-1 → F-2a → F-2b-1 → F-2b-2 → B2a → F-3 → B2b → B5a/B5b → B3 → R → R2 — B2a liegt auf dem Weg zu R (Belege 1/2), F-3 nicht. (Vorher, Stefan 12.10.2026: F-1 → F-2a → F-2b → F-3 → B2a → …)
- **F-2b geteilt** (Stefan, 12.10.2026, nach dem Advisor-Pass, Befund A1 „Zuschnitt zu groß“) — F-2b-1: Sammlung lesen und zeigen, Zuordnung zum Katalog, Scout liest die Sammlung, F-1060 (6); F-2b-2: Auswählen → Eignungsprüfung (Prüfbericht) → Katalog, Sperre der Freigabe, F-1061 (1). Sammlung: alle 176 Zeilen der Bewertungsmatrix sichtbar (172 mit Link, die 4 ohne Link nicht auswählbar; O1). extern_lesend-MCPs von F-2b nach F-3.
- **E-F45-11 = A** (Stefan, 14.10.2026) — R2 = Motion im Leitstand der Workforce: Bewegungs-Tokens, `prefers-reduced-motion` Pflicht, Bewegung mit Zweck, kein Ruckeln beim Poll, design-guardian und Render-Nachweis mit Bewegung; Bau im eigenen Worktree, nie am laufenden Leitstand. R bleibt im Fremdprojekt (haushaltsbuch2). Das 3D-Element entfällt vorerst.
- **E-F45-12 = A** (Stefan, 14.10.2026) — neuer Baustein „Fähigkeit bauen“ nach B2b, vor B3 (≈ 0,5–0,75 AT nach Challenge): Vorschlagsordner und Übernahme per Knopf (F-1069) und Form-Empfehlung durch den Architekten (F-1096, K39).
- **Reihenfolge ab F** (Stefan, 14.10.2026) — F-3b-1 → F-3b-2 → B2b → Fähigkeit bauen → B5a/B5b → B3 → R → R2 → F30. Codex prüft heute schon im Review-Schritt (Vorlagen standard/hoch); sein Nutzen wird in B2b gemessen (F-1050). Vorher (Challenger, 12.10.2026): F-1 → F-2a → F-2b-1 → F-2b-2 → B2a → F-3 → B2b → B5a/B5b → B3 → R → R2.
- **B2a-3 geteilt** (Stefan, 13.10.2026, Advisor-Pass B2a-3) — B2a-3a Spec, Policy, Schema v2, Regel 1k, Fehlerfälle, Jarvis-Regel; B2a-3b geprüfter Stand/„Review veraltet“ und Befehlsblöcke im Leitstand. Vorrang Policy vor Karte (Prozesspunkte der DoD „nicht anwendbar (Harness-Abgleich)“, Beobachtungsblock beim Claude-Reviewer als Ausnahme); Regel 1k hält nur bei leeren Befunden ohne den Pflichtsatz.
- **B2a geteilt** (Challenger, 13.10.2026) — B2a-1 Projektkarte (≈ 0,6–0,7 AT), B2a-2 Arbeitspaket (≈ 0,5–0,6 AT), B2a-3 Codex-Review-Spec + Ausgaberegel (≈ 0,4 AT); F-1072 (API-Schlüssel) nach B2b. Grundlage Abschnitt 5.
- **O2 B2a-1 — Pflichtabschnitte von ARCHITECTURE.md** (Challenger, 13.10.2026, Vorschlag Advisor) — Pflicht beim Stack-Entscheid sind „Ordnerstruktur“ und „Datenzugriff“; „Module“ steht nur als Satz in der Stack-Instruktion; das Skelett bleibt unverändert.
- **F-1061 (3) — Bestätigung nach Fremdänderung** (Stefan, 12.10.2026, Empfehlung Challenger) — Nach einer Änderung von außen an `~/.ai-workforce/faehigkeiten.lokal.json` gilt der Stand erst nach ausdrücklicher Bestätigung im Leitstand („Datei geprüft – Stand übernehmen“); bis dahin startet kein Lauf mit Katalog-Fähigkeiten (Muster E-F45-7). Umsetzung F-2a, ARCHITECTURE.md §2.
- **F-1015-Kriterium** (Challenger, 11.10.2026) — Seitenspeicher, JS-Heap, DOM-Knoten und Listener am Ende ≤ 1,2 × Wert nach 15 min (Aufwärmphase ausgenommen); Grundlage Abschnitt 2.
- **E-B5-1 = A** (Stefan, 23.10.2026) — Planungsdaten (Workstreams mit Schätzung min–max, Ist, Datum; Priorität) liegen in der Feature-Akte (strenger Abschnitt ## Workstreams, Zeile Priorität:); docs/projekt/roadmap.json behält nur die Struktur (Meilenstein → Features, Reihenfolge). Umsetzung B5b-1.
- **E-B5-2** (Challenger, 23.10.2026) — Akte mit Status ENTWURF darf ohne Meilenstein sein (Noch nicht eingeplant); ab READY_FOR_TECH Pflicht. Umsetzung B5a-1.
- **E-VORSCHAU-1 = A** (Stefan, 24.10.2026) — Eigenes Paket „V1 Vorschau (Stufe 1)“ nach B5b-3, vor B3: Live-Vorschau des gewählten Projekts in der Produktübersicht über `vorschau_url` (iframe mit sandbox, CSP frame-src nur die geprüfte localhost-URL, keine neue Route, kein Poll); hebt das F43-Nicht-Ziel „keine Vorschau im Leitstand selbst“ auf, „kein Start/Stopp dauerlaufender Prozesse“ bleibt; Stufe 2 nach F30-M1 (Klärung Challenger 25.10.2026, vorher „nach R“). Finding F-1178.
- **E-B5-3** (Challenger, Bauauftrag B5b-1, 24.10.2026) — Jede Planungsänderung schreibt eine Zeile unter „## Änderungen“ der Akte (Datum · Felder · Grund), wie B5a-1. Ausnahme nach O5: „Meilenstein → LAEUFT“ in der Bereinigungsliste ohne Änderungszeile in den Akten, der Grund steht in der Commit-Nachricht des Git-Blocks (B5b-1b).
- **E-B5-5** (Challenger, Bauauftrag B5b-1, 24.10.2026) — Bug-Felder (Nachstellen, Erwartet, Tatsächlich, Ursache, Regressionstest) sind optional: keine Pflicht, keine Rückmigration. Umsetzung B5b-1a (Findings-Parser).
- **E-B5-6 = B** (Challenger, Bauauftrag B5b-1, 24.10.2026) — „Balken ziehen“ kommt nicht (Teil 2); Umordnen nur über „Anpassen“ mit Begründung.
- **E-KANBAN = A** (Challenger, Bauauftrag B5b-1, 24.10.2026) — Prioritäts-Kanban lesend in B5b-2; B5b-1 liefert nur die Daten (Zeile „Priorität:“ je Akte). E-KANBAN = A ersetzt F-917 nicht, sondern erfüllt F-917 (a) (lesendes Kanban P0–P4 + „ohne Priorität“), erweitert: Features erscheinen mit ihrer Priorität aus der Akte.
- **B5b-1 geteilt** ([EMPFEHLUNG] Challenger, 24.10.2026, reversibel; Advisor `features/F45/advisor-b5b1.md` A1) — B5b-1a „Planungsdaten lesen“ (Format, Gate R1 mit Datendatei, Migration F45, Akte F30, Bug-Felder, Projektion, Zeitachse und Kennzahlen als reine Funktionen; Server unverändert, der Kern schreibt nichts; ≈ 0,4–0,5 AT) → B5b-1b „Planungsdaten schreiben“ (PUT planung, Bereinigungsliste; ≈ 0,35–0,45 AT). „Pflege & Fixes“ und Kanban nicht in die Projektion (P2): B5b-2 leitet sie aus den Workitems ab.
- **A2 B5b-1** ([EMPFEHLUNG] Challenger, 24.10.2026, reversibel) — Der Kern darf `docs/projekt/roadmap.json` und `docs/projekt/roadmap-ausnahmen.json` schreiben, aber erst in B5b-1b; dort zuerst die Ausnahme in ARCHITECTURE.md §2 (Muster B5a-1: nur auf Eingabe Stefans, Hash-409, Pflichtgrund, kein Commit, Git-Block; Rückbau über mehrere Dateien best effort, zulässig, weil nichts committet wird).
- **A3 B5b-1** ([EMPFEHLUNG] Challenger, 24.10.2026, reversibel) — CRLF in `roadmap.json` ⇒ 422 „von Hand bearbeiten“; keine neue Ausnahme in ARCHITECTURE.md §7.
- **A4/O3 B5b-1** ([EMPFEHLUNG] Challenger, 24.10.2026, reversibel) — Die F45-Workstreams kommen aus `docs/projekt/fixpaket-f45.md` §3 (fehlende Zeilen W1, K, W2, V1; Teilpakete statt Grobzeilen; Reihenfolge ab W1); Schätzungen nur, wo dort eine Zahl oder Spanne steht, sonst „–“.
- **O1 B5b-1** ([EMPFEHLUNG] Challenger, 24.10.2026, reversibel) — Ausnahmen der Status-Regel R1 als Datendatei `docs/projekt/roadmap-ausnahmen.json`.
- **O2 B5b-1** ([EMPFEHLUNG] Challenger, 24.10.2026, reversibel) — „Abgenommen: <ISO-Datum>“ am Zeilenanfang, F35-Zeile umformatiert; Prosa-Zeilen „Abgenommen durch Stefan am …“ (F32, F33, F36, F40, F42) bleiben unberührt.
- **B6 B5b-1** ([EMPFEHLUNG] Challenger, 24.10.2026, reversibel; für B5b-1b) — Die Bereinigung auf ABGESCHLOSSEN schreibt die passende Zeile in `docs/STATUS.md` mit; ist sie maschinell nicht eindeutig, 422 „STATUS.md von Hand“, nichts geschrieben.
- **B5b-1b geteilt** ([EMPFEHLUNG] Challenger, 24.10.2026, reversibel; Advisor `features/F45/advisor-b5b1b.md` A1) — B5b-1b-1 „Planung schreiben“ (PUT …/planung, ≈ 0,3–0,4 AT) → B5b-1b-2 „Bereinigungsliste“ (GET/POST Bereinigung, ≈ 0,3–0,4 AT). Die Ausnahme in ARCHITECTURE.md §2 gilt zuerst nur für `docs/projekt/roadmap.json`; `roadmap-ausnahmen.json` und `docs/STATUS.md` kommen mit B5b-1b-2.
- **A2 B5b-1b** ([EMPFEHLUNG] Challenger, 24.10.2026, reversibel) — Ist von Workstream P bleibt „–“ (Regel `features/F45/plan-b5b1-v2.md:55`; „≈ 1,25 AT + 6 h, nicht gemergt“ ist kein abgeschlossener Ist-Wert). Punkt 5 des Bauauftrags B5b-1b entfällt.
- **B4 B5b-1b** ([EMPFEHLUNG] Challenger, 24.10.2026, reversibel; für B5b-1b-2) — „Meilenstein → LAEUFT“ wird nur angeboten, wenn der Meilenstein genau eine R1-Abweichung hat (heute M3/F18); keine eigene Eintragsart, keine Sammel-Bestätigung.
- **Kennzahl „Features abgenommen x/y“** ([EMPFEHLUNG] Challenger, 24.10.2026, reversibel) — Features mit Status ABGEBROCHEN zählen nicht zur Gesamtmenge; „Meilensteine x/y“ bleibt wie gebaut (F19-bridge und V1-Backlog zählen mit). Umsetzung B5b-1b-1.
- **Bereinigung nur bestätigt** ([EMPFEHLUNG] Challenger, 24.10.2026, reversibel; für B5b-1b-2) — Kein Status wird ohne Stefans Bestätigung auf ABGESCHLOSSEN gesetzt; die Bereinigung bestätigt immer genau einen Eintrag.
- **B5b-1b-2 ohne Schnitt** ([EMPFEHLUNG] Challenger, 24.10.2026, reversibel; Advisor `features/F45/advisor-b5b1b2.md` B6) — ein Durchgang mit den Kürzungen des Advisors (F-1188-Restfälle draußen, Ausnahme zeilenbasiert entfernen, gemeinsamer Helfer für die Änderungszeile); Schätzung 0,45–0,6 AT.
- **A1 B5b-1b-2 = Weg (b)** ([EMPFEHLUNG] Challenger, 24.10.2026, reversibel) — CRLF in `docs/STATUS.md` ⇒ 422 „von Hand“ (analog A3); keine Ausnahme in ARCHITECTURE.md §7, nur die §2-Ergänzung um `roadmap-ausnahmen.json` und `docs/STATUS.md` (Deckel 17 800 B eingehalten).
- **A2 B5b-1b-2 = dynamisch** ([EMPFEHLUNG] Challenger, 24.10.2026, reversibel) — „Meilenstein → LAEUFT“ wird angeboten, sobald der Meilenstein im aktuellen Stand genau eine R1-Abweichung hat (auch M4 nach drei Einzelbestätigungen); kein Sonderverbot.
- **E-PRUEF-1 = A** (Stefan, 24.10.2026) — Vor jedem Merge gelten genau drei Prüfungen: (1) Stefans lokaler voller Lauf im Commit-Block, (2) inhaltliche Prüfung des gepushten Diffs durch den Challenger (Dateiliste, Kernstellen gegen Auftrag, Invarianten), (3) grüne PR-CI (`.github/workflows/ci.yml`: `npm run check` auf ubuntu-latest mit Node 24 + gitleaks). Der Cloud-Testlauf des Challengers entfällt. Anlass: bei B5b-1a bis B5b-1b-2 war die Prüfung ohne Hinweis an Stefan ausgedünnt; Finding F-1194.
- **E-PRUEF-2 = B** (Stefan, 27.10.2026) — löst E-PRUEF-1 ab. Lokal im Commit-Block: lint, typecheck, `npm run test`, Lagebild und die im Bauauftrag genannten Gates; der volle Gate-Lauf nur in der CI. Ausnahme „voller lokaler Lauf“, wenn der Challenger sie im Bauauftrag setzt (z. B. W2b-2, plattformsensibel). Rückfall auf A, sobald ein Windows-Fehler erst nach dem Merge auffällt. Prüfung des gepushten Diffs durch den Challenger und grüne PR-CI bleiben.
- **E-FMT-1 = B** (Stefan, 28.10.2026) — kein Formatierer-Massen-Commit, kein `.git-blame-ignore-revs`: der Biome-Formatierer gilt nur für eine wachsende Liste formatierter Dateien (`scripts/ratsche.json` `formatiert`; Start: schon formatierte Bestandsdateien und alle neuen). Grund: eine Probe-Formatierung des Challengers änderte 495 Dateien (+71 k/−22 k Zeilen), machte 15 Gates rot (14 Codeform-Prüfungen + Wachstumsbremse) und hätte die Server-Grenze gegen E-WART-1 von 13 198 auf 16 182 erhöht. Umsetzung W2c-1.
- **E-RATSCHE-1 = A** (Stefan, 28.10.2026) — die i18n-Wörterbücher `public/leitstand/i18n/*.js` (je ≈ 3 500 Zeilen, Daten) sind von der Dateigrenze 800 ausgenommen wie der Server; Lint und Formatierer gelten für sie weiter. Anlass: Advisor `features/F45/advisor-w2c1.md` Befund 1 (sonst wäre jedes UI-Paket rot).
- **E-BRAIN-1 = B** (Stefan, 25.10.2026) — R2 wird „Brain Stufe 1: Produktzyklus lesend, mit Motion“ (≈ 1,5–2 AT). Beleg 15 (Motion mit Zweck, Bewegungs-Tokens, `prefers-reduced-motion`, Render-Nachweis mit Bewegung, design-guardian, eigener Worktree) wird an der Zyklus-Seite erbracht; ersetzt den Inhalt von E-F45-11. Stufen 2/3 nach F30 (F-1202).
- **Bug-Felder nach 2c** ([EMPFEHLUNG] Challenger 25.10.2026) — gleiche Datenquelle (Workitems) wie Pflege & Fixes; 2b nur Schreibwege.
- **B5b-2b geteilt** (Challenger, 25.10.2026, Advisor `features/F45/advisor-b5b2b.md` O4) — B5b-2b-1 „Anpassen“ (ohne Serveränderung, mit F-1197, eigener Nachweis) → B5b-2b-2 „Bereinigungsliste“ (Vorprüfung `moeglich`/`grund` mit Tests, Gate (a), F-1189-Reste, eigener Nachweis). Körperform maßgeblich `pruefePlanungAenderung` (`workstreams: [{ id, schaetzung_min, schaetzung_max }]`). F-1197: Status als Pille, Auswahl als neutraler Streifen (`--ink`/`--line`), kein Gold, kein Mint. qa8 = Variante (a): „Dauerhaft begründete Ausnahmen sind heute nicht vorgesehen“, qa8 → W2, Gate b5b1a (i) unverändert.
- **B5b-2c geteilt** (Challenger, 25.10.2026, Advisor `features/F45/advisor-b5b2c.md` A1) — B5b-2c-1 „Entwicklung: Zuordnung, Kanban · Priorität, Bug-Felder“ → B5b-2c-2 „Roadmap: Pflege & Fixes, Restpunkte“ (Gantt-Spur, Bereinigungs-Standardoption, STATUS.md F25, F-1206, F-1010). Übernommen: P4 (Alt-Bestand) in „P3 · Später“ mit Chip und „davon n P4“ (A2), Feature-Priorität aus GET /api/roadmap ohne Serveränderung, das Eintrag-Detail liest sie aus derselben Quelle (A4), keine eigene Suche im Kanban (B13). Zuordnungsregel: erste ganze Feature-ID aus „Feature/Run“, die in roadmap.json steht, sonst erste ganze Meilenstein-ID aus roadmap.json (z. B. „M3-Challenge“), sonst „Pflege & Fixes“; mehrere IDs: die erste gewinnt (DEKLARIERT). Für 2c-2 vorgemerkt: Befunde an abgeschlossenen Features bleiben dort, die Trennzeile abgeschlossener Meilensteine zeigt zusätzlich „· n offene Befunde“; Zeile „Pflege & Fixes“ grau wie im Design (Vorgabe „rot“ aufgehoben), Befunde darin mit rotem Quadrat; kein Schätzfeld für Befunde (bewusst, keine Serveränderung).
- **E-BRAIN-2** (Stefan, 25.10.2026): Produkt-Brain Stufen 1–3 kommen vor dem Referenzauftrag. Reihenfolge (Challenger): B5b-2c → B5b-3 → V1 Live-Vorschau → B3 → W2 → Brain Stufe 1 (R2) → Brain Stufe 2 → Brain Stufe 3 → F30. Stufe 2 = LLM-Wiki nach Karpathy: aus dem Repo kompiliert unter docs/brain/<produkt>/ mit index.md und Quellstand-Stempel, jeder Satz mit Quelle, Lint als Gate, inkrementell nach Commits. Stufe 3 = Brain-Graph aus Backlinks + Graphify als Codewissen nach Eignungsprüfung (Hook-Kollision mit dem Harness prüfen); Deploy/Operate/Monitor bis zum ersten Release nur Struktur und ehrlicher Leerzustand. Obsidian nur optionales Lesefenster, keine Integration.
- **E-R-1 = A** (Stefan, 25.10.2026): Kein eigener Referenzauftrag R (haushaltsbuch2). Der erste echte Workflow-Lauf im Opportunity Scanner (F30-M1) erbringt die Belege 1–14 der Fixpaket-Bestehensbedingung; F45 schließt mit der ersten Abnahme in F30. Die Brain-Erfolgskriterien (a) Warum-Frage < 1 min mit Quelle, (b) Tokens je Rolle messbar gesenkt (Richtwert −20 %) werden in F30 gemessen. Stefan hält während F30 parallel fest, was ihn stört; Auswertung nach F30-M1.
- E-W2-1 (Stefan, 25.10.2026): ‚Ich will, dass diese Themen behoben werden und die Workforce danach auch nach den Prinzipien arbeitet.‘ Reihenfolge: B5b-3 → W2 → V1 Live-Vorschau → B3 → Brain 1 → Brain 2 → Brain 3 → F30. W2 behebt: JS ohne Typprüfung (≈ 76.000 Zeilen, tsconfig nur *.ts), Biome recommended:false (2 Regeln, keine Komplexitätsgrenze, kein Formatierer), Gates ≈ 53.600 Zeilen mit Codeform-Prüfungen und ≈ 23 min Lauf, keine Dateigrenze außer Server, Doku-Wachstum (feature.md, findings.md), git-/serverlastige Tests unter Last. B3 überträgt dieselben Prinzipien ins Projekt-Skelett und in die Rollen (Advisor: ‚Muss das existieren?‘, Review: ‚Was kann weg?‘). (Eingetragen B5b-3; ersetzt die Reihenfolge aus E-BRAIN-2, `## Workstreams` und `docs/projekt/fixpaket-f45.md` §3 entsprechend: W2 vor V1.)
- **Folgen von E-BRAIN-2 und E-R-1 = A für ältere Einträge** (B5b-2c-2-C, Advisor `features/F45/advisor-b5b2c2.md` B8; benannt, nicht umgedeutet): E-BRAIN-1 „Stufen 2/3 nach F30“ ist durch E-BRAIN-2 überholt (vor F30). E-F45-2 „fällig nach R“ und E-VORSCHAU-1 „Stufe 2 nach R“ verlieren ihren Bezugspunkt, weil R entfällt — neuer Zeitpunkt offen (Klärung Challenger). Scope R2 „Abhängig von R, B3“ gilt als „W2, B3“ (Reihenfolge E-BRAIN-2). Weitere Verweise auf R in Maßnahmen, Kriterien-Überschriften („erneut in R“) und in `harness-abgleich/standard.json` („für den Referenzauftrag R nicht zulässig“) gelten für F30-M1; ausdrücklich Klärung Challenger: F-1165 (B3-Render-Nachweis mit Bewegung sollte im R-Lauf entstehen), F-1047 (Baseline des R-Projekts), F-982/F-1050 (Messfenster Codex-Nutzen), die „eine Fixrunde“ aus R (nach F30-M1 ohne eigene Zeile) und ob F30 nach dem ganzen Fixpaket oder nach Teil 1 beginnt (F45 schließt erst mit der ersten Abnahme in F30).
  - **Klärung Challenger [EMPFEHLUNG]** (25.10.2026, eingetragen B5b-2c-2-AB): (1) F30 beginnt nach Brain Stufe 3 (Ende Fixpaket
    Teil 1); F45 bleibt LAEUFT bis zur ersten Abnahme in F30. (2) F-1165: Den Render-Nachweis mit Bewegung im Fremdprojekt erbringt
    F30-M1, falls der Scanner eine Oberfläche hat; sonst bringt B3 einen eigenen Nachweis an einer Wegwerf-Kopie des Projekt-Skeletts.
    Beleg 15 bleibt bei Brain Stufe 1. (3) F-1047: Die Baseline gilt für das F30-Projekt bei seiner Anlage über F41/F42. (4) F-982 /
    F-1050: Messfenster für den Codex-Nutzen = die Läufe von F30-M1. (5) „Eine Fixrunde“ aus R entfällt; in F30 gilt AK3 (jede
    Reparatur wird ein Finding) plus Stefans laufende Beobachtungsliste; keine feste Rundenzahl. (6) E-F45-2 und E-VORSCHAU-1 Stufe 2:
    fällig „nach F30-M1“ statt „nach R“ (in beiden Einträgen oben nachgezogen). (7) `harness-abgleich/standard.json` „für den
    Referenzauftrag R nicht zulässig“ gilt für F30-M1 — Text nur anpassen, wenn kein Gate/Test den Wortlaut prüft, sonst als Finding.
    Nachgezogen: F-1165, F-1047, F-982, F-1050 (Nachtrag „Klärung Challenger“); (7) siehe „Stand B5b-2c-2-AB“.
- **B5b-2c-2 geteilt** (Vorgabe Challenger 25.10.2026, Advisor `features/F45/advisor-b5b2c2.md`) — B5b-2c-2-C (Entscheidungen E-BRAIN-2 und E-R-1 = A, Test-Einstufung `src/git-starter/git-starter.test.ts`, F-1209) vorab als eigenes Paket, danach B5b-2c-2-AB (Gantt „Pflege & Fixes“, Restpunkte) nach `features/F45/plan-b5b2c2-v2.md`.
- **Kern §2 nur Namen** (Challenger, 28.10.2026, F45 W2d, Advisor-Pass A1) — Die vier Ausnahmen unter „Weitere Ausnahmen“ in
  ARCHITECTURE.md §2 stehen als Regeltext nur noch in `docs/architektur/lokale-dateien.md`; der Kern nennt die Namen.
  Abweichung von der Aufteilungsregel („die Regel bleibt als Satz hier“), weil „wörtlich“, „≥ 1 000 Bytes Luft“ und „Deckel
  bleibt“ sonst nicht zugleich einzuhalten waren (F-1242).
- Erkenntnis W2d: Registergröße kommt vom offenen Bestand, nicht von erledigten Resten — Sichtung vor F30, siehe F-1243.

## Scope

| WS | Inhalt | Findings | Abhängig von | Prüfmodus |
|---|---|---|---|---|
| B0 | Chat zuverlässig und schnell: Messskript, eigene Chat-Zeitgrenze, Chat-Worker fest, Fehler-Eintrag bei jedem Misserfolg, Neuladen verfolgt Lauf, Start-Hinweis bei falschem Ordner (E-188 bleibt streng), Event-Loop-Messung, Chat-Reiter; Akte F45 | F-987, F-986 a, F-971, F-544, F-1007, F-1008 | – | vor Merge |
| P | Performance: /api/zustand im Langlauf, Event-Loop-Blockaden beseitigen, Seitenwechsel messen, f16-Restordner | F-556, F-999 | B0 (Messskript) | vor Merge |
| S | Härtung klein: ein Git-Starter für alle Aufrufe, Geheimnis-Maskierung (Live-Aktivität, env im Harness-Detail), Abbruch-Formulierung | F-1000, F-1005, F-1003 | – | vor Merge |
| B1a | Lauf-Umgebung: Branch/Worktree je Lauf (Gültigkeitsschlüssel misst die Einstellungen des Lauf-Ordners), Vorlage nachziehen (513), Mindest-Gates im Skelett, check:template, Standard-Startvorlage aus dem Register, Löschen im Lauf, Kontrollzustand in Fremdprojekten | F-954, F-939, F-701, F-1009, F-715, F-766 | E-F45-3 | Advisor-Pass, vor Merge |
| B1b | Harness im Lauf, geschnitten am 11.10.2026: **B1b-1** Hintergrund-Ausführung abschalten und als unvollständig werten, Lauf-Härtung (npm-Installationsskripte aus, Schreiben nur im Arbeitsordner), Hooks im -p-Lauf belegen, commit-guard härten, „vorgesehen gegen benutzt“ ans Review, Vorstart-Scan; **B1b-2** Harness-Abgleich-Tabelle (Beleg 12) in Laufakte und auf der Seite Workforce, Kurzliste der benutzten Fähigkeiten an die Abnahme. Verschoben: Projekt-Agents/-Skills im Lauf und Freigabe nach Inhalt (F-815/F-816 → F), Codex-Harness-Regeln (F-929 → B2a), /lessons (F-933 → Teil 2) | B1b-1: F-1026, F-1027, F-1035, F-818, F-932, F-937 (Review); B1b-2: F-937 (Abnahme), Beleg 12 | B1a | vor Merge |
| F-1 | Fähigkeiten im Lauf (Server): Aktivierung je Projekt (E-F45-6/7/8), Projekt-Agents/-Skills nach Inhalt und Opt-in, Agent-Sperre, Init-Gate, Laufakte aktiv/benutzt, Endpunkte | F-815, F-816, F-1012 (Server), F-910 (teilweise) | B1b | Advisor-Pass, vor Merge |
| F-2a | Fähigkeiten-Oberfläche: Seite Workforce, Bindung an die Anzeige, Gründe der Empfehlung, Lauf-Detail, Beleg 13 | F-1054, F-1012 (Oberfläche), F-1055 (1) Anzeige | F-1 | Advisor-Pass, vor Merge |
| F-2b-1 | Sammlung im Leitstand (Unterreiter „Sammlung“: Urteil, Lizenz, Kosten, Stand, Zuordnung, Typ, Auswahlgrund), Scout liest die Sammlung, voller Hash im Lauf-Detail | F-1057 (K21), F-1060 (6) | F-2a | Advisor-Pass, vor Merge |
| F-2b-2 | „Auswählen“ → Eignungsprüfung (Prüfbericht) → Katalog, Freigabe nur mit Bericht, Stand der lokalen Datei über Neustarts — geteilt in F-2b-2a (Prüflauf, #326), F-2b-2b (npm-Strukturfix Variante C, F-1075) und F-2b-2c (Vormerken/Katalog, „Eignung prüfen“, Detail als volle Zeile, F-1061 (1)) | F-1056 (K20), F-1061 (1), F-1075 | F-2b-1 | Advisor-Pass, vor Merge |
| F-3 | Plugins (E-F45-9): Katalogtyp plugin, gepinnte Installation, Bestandteile einzeln, Hooks je Hash freigegeben, Init-Gate; extern_lesend-MCPs (aus F-2b verschoben) | F-910, F-1052 | F-2b-2, B2a | Advisor-Pass, vor Merge |
| B2a-1 | Projektkarte (geteilt am 13.10.2026): `src/projektkarte`, Zuschnitt je Rolle an Architekt, Advisor, Code-Reviewer (Claude und Codex gleich, als Text), Hash in der Laufakte; Architekt im Feature-Modus mit Karte, Capability-Auszug, Lese-Anweisung; ARCHITECTURE.md Pflicht beim Stack-Entscheid; DoD/Checkliste mit Urteil je Punkt; Beobachtungsblock nur claude-code | F-936, F-1064 (K26), F-1065 (K27), F-1066 (K28), F-929, F-931, F-829, F-1062 (K24) | B1b | Advisor-Pass, vor Merge |
| B2a-2 | Arbeitspaket: Auftrag v0 additiv (DoD-Verweis, betroffene Bereiche, Risiko/Kontrolltiefe, „Einrichtung durch Stefan“, Feature-Bezug), AK-Entwurf aus der Finding-Maßnahme, Server rendert den Prompt, Gate Pflichtfelder, Einrichtungsliste vor dem Bau | F-938, F-989, F-1071 (K31) | B2a-1 | Advisor-Pass, vor Merge |
| B2a-3a | Codex-Review-Spec (`docs/projekt/codex-review-spec.md`), Review-Policy (`src/review-policy`), Review-Schema v2 additiv, Regel 1k und Fehlerfälle sichtbar, Jarvis „direkt ausführbar“ mit cd-Pfad und „Deine Schritte“ (geteilt am 13.10.2026) | F-1063 (K25) teilweise, F-959 (Jarvis), F-998 | B2a-1 | Advisor-Pass, design-guardian, vor Merge |
| B2a-3b | Geprüfter Stand und „Review veraltet“, Befehlsblöcke im Leitstand mit cd und getrennten Blöcken | F-1063 (Rest), F-959 (Rest) | B2a-3a | Advisor-Pass, design-guardian, vor Merge |
| B2b | Kette und Grenzen: Advisor-Schema, Plan v2, Rückweg ≤ 1 je Stufe, qa-Schritt, design-guardian-Schritt mit Render-Nachweis im Lauf, Budget je Arbeitspaket mit Halt, Umfangs-Abgleich, Rückfrage während des Baus, Rechte-Rückfrage bei Befehlen außerhalb des Werkzeugsatzes (Spike zuerst: --permission-prompt-tool; sonst Halt mit „einmal erlauben und fortsetzen“), Codex-Nutzen messen, „Bereit zum Sichern“ | F-909, F-203, F-820, F-980, F-981, F-978, F-982, F-979, F-1011, F-1072 (K32, aus B2a am 13.10.2026) | B2a | Advisor-Pass, vor Merge |
| Fähigkeit bauen | Neuer Baustein (E-F45-12 = A): Vorschlagsordner + Übernahme per Knopf, Form-Empfehlung durch den Architekten | F-1069, F-1096 (K39) | B2b | Advisor-Pass, design-guardian, vor Merge |
| B5a | Feature-Fluss: Coach legt Akte an, Akte im Leitstand bearbeiten (E-F45-1), Planung änderbar mit Datum, Bugs mit Feldern, Workstreams als Daten, Entscheidungen in der Akte-Leseroute, offene Abnahmen überall gezählt | F-912, F-984, F-990, F-975, F-976, F-995, F-991 | B2a | vor Merge |
| B5b | Roadmap richtig: Roadmap-Schema v1 (Workstreams mit Schätzung, Ist, Datum), Gate Akte ↔ Roadmap, Gantt-Zeilen und -Balken, Kennzahlen „Bis M5 fertig“ und „Plan gegen Ist“, Datenbereinigung als eine Bestätigungsliste für Stefan (kein Status ohne Stefan auf ABGESCHLOSSEN) | F-944, F-976 (Anzeige), F-990, F-1010 | B5a, B2b | vor Merge |
| B3 | Design & Motion in Fremdprojekten (E-F45-10): impeccable, design-guardian und Token-Gate im Skelett; Bibliotheken je Projekt aus der Sammlung, Design-Referenzen als Eingabe mit Empfehlung, Motion-Skills über den F-Weg, Render-Nachweis mit Bewegung | F-911, F-1058 (K22), F-1059 (K23) | B1a, B2b, F-2b | nach Merge |
| R | **Entfällt (E-R-1 = A, Stefan 25.10.2026):** Referenzauftrag = erster echter Workflow-Lauf in F30-M1 (Belege 1–14; F45 schließt mit der ersten Abnahme in F30). Vorher: Referenzauftrag in einem Fremdprojekt (Vorschlag: haushaltsbuch2; nicht F30, damit die F30-Messcheckliste unberührt bleibt), Belege 1–14, eine Fixrunde, Abschluss F45 | F-980 | alle | echter Lauf |
| R2 | Motion im Leitstand der Workforce (E-F45-11 = A): Bewegungs-Tokens, `prefers-reduced-motion` Pflicht, Bewegung mit Zweck, kein Ruckeln beim Poll, design-guardian und Render-Nachweis mit Bewegung, Bau im eigenen Worktree; 3D-Element entfällt vorerst; Beleg 15 | F-1059 (K23) | R, B3 | design-guardian, Render-Nachweis, vor Merge |
| Brain-2 | Brain Stufe 2 (E-BRAIN-2, Stefan 25.10.2026): LLM-Wiki nach Karpathy: aus dem Repo kompiliert unter docs/brain/<produkt>/ mit index.md und Quellstand-Stempel, jeder Satz mit Quelle, Lint als Gate, inkrementell nach Commits | F-1202 | R2 (Brain Stufe 1) | Advisor-Pass, vor Merge |
| Brain-3 | Brain Stufe 3 (E-BRAIN-2, Stefan 25.10.2026): Brain-Graph aus Backlinks + Graphify als Codewissen nach Eignungsprüfung (Hook-Kollision mit dem Harness prüfen); Deploy/Operate/Monitor bis zum ersten Release nur Struktur und ehrlicher Leerzustand. Obsidian nur optionales Lesefenster, keine Integration | F-1202 | Brain-2 | Advisor-Pass, Eignungsprüfung Graphify, vor Merge |

Schätzung und Ist stehen seit F45 B5b-1a im Abschnitt „## Workstreams“ (E-B5-1 = A, keine zweite Kopie derselben Zahlen); diese Tabelle bleibt Prosa (Inhalt, Findings, Abhängigkeiten, Prüfmodus).

## Workstreams

| ID | Art | Titel | Status | Schätzung AT | Ist AT | Begonnen | Abgenommen | Notiz |
|---|---|---|---|---|---|---|---|---|
| B0 | workstream | Chat zuverlässig und schnell | erledigt | 0,75 | 1 | – | 2026-10-10 | gemergt #316; Ist aus der alten Scope-Spalte: „≈ 1 AT, gemergt #316 (9bdfc1a)“ |
| P | workstream | Performance | erledigt | 0,5 | – | – | 2026-10-11 | gemergt #317; alte Scope-Spalte „≈ 1,25 AT + ≈ 6 h Messung (Bau, nicht gemergt)“ (Stand vor dem Merge) |
| S | workstream | Härtung klein | erledigt | 0,3 | – | – | 2026-10-11 | gemergt #318 |
| B1a | workstream | Lauf-Umgebung | erledigt | 1–1,25 | – | – | 2026-10-11 | gemergt #319 (B1a-1), #320 (B1a-2) |
| B1b | workstream | Harness im Lauf | erledigt | 0,75 | – | – | 2026-10-11 | gemergt #321 (B1b-1), #322 (B1b-2) |
| F-1 | fixpaket | Fähigkeiten im Lauf (Server) | erledigt | – | – | – | 2026-10-12 | Schätzung „Teil von 1,25–1,5 (Zeile F bis 12.10.2026)“; gemergt #323 (849fda5) |
| F-2a | fixpaket | Fähigkeiten-Oberfläche | erledigt | – | – | – | 2026-10-12 | Schätzung „Teil von 1,25–1,5“; gemergt #324 |
| F-2b-1 | fixpaket | Sammlung im Leitstand | erledigt | 0,6 | – | – | 2026-10-12 | gemergt #325 |
| F-2b-2a | fixpaket | „Auswählen“ → Eignungsprüfung der gepinnten Version | erledigt | 1,1–1,2 | – | – | 2026-10-12 | gemergt #326 |
| F-2b-2b | fixpaket | F-1075-Rest nach Variante C „Prüfen, was npm selbst schreibt“ | erledigt | 0,3 | – | – | 2026-10-13 | gemergt #327 |
| F-2b-2c | fixpaket | Katalog über den Vormerken-Weg | erledigt | 0,3 | 0,5 | – | 2026-10-13 | gemergt #328 |
| F-3a-1 | fixpaket | Plugins aus Stefans Claude Code lesen | erledigt | – | 0,5 | – | 2026-10-14 | Zelle „Ist ≈ 0,5“ ohne Schätzung; gemergt #333 |
| F-3a-2 | fixpaket | Leitstand: Reiter „Plugins aus deinem Claude Code“ | erledigt | – | 0,4 | – | 2026-10-14 | Zelle „Ist ≈ 0,4“ ohne Schätzung; gemergt #334 |
| F-3b-1 | fixpaket | Plugins freigeben | erledigt | 0,5 | 0,95 | – | 2026-10-14 | „≈ 0,5 (Auftrag); Ist ≈ 0,95 (1a ≈ 0,6, 1b ≈ 0,35) — Grund: Auflagen des Advisor-Passes (16 + Delta)“; gemergt #335 |
| F-3b-2 | fixpaket | Plugins im Lauf | erledigt | – | – | – | 2026-10-14 | „Auftrag ≈ 0,45; nach Advisor-Pass ≈ 0,6; nach Delta-Advisor v3 ≈ 0,9–1,0 (2a Server/Gate/Beleg, 2b Oberfläche)“; gemergt #336 |
| B2a-1 | fixpaket | Projektkarte | erledigt | 0,6–0,7 | – | – | 2026-10-13 | gemergt #329 |
| B2a-2 | fixpaket | Arbeitspaket | erledigt | 0,5–0,6 | – | – | 2026-10-13 | gemergt #330 |
| B2a-3a | fixpaket | Codex-Review-Spec und Ausgaberegel | erledigt | 0,4 | 0,5 | – | 2026-10-13 | gemergt #331 |
| B2a-3b | fixpaket | Geprüfter Stand und „Review veraltet“ | erledigt | – | 0,5 | – | 2026-10-13 | „Schätzung fehlt (Ist ≈ 0,5)“; gemergt #332 |
| B2b-1a | fixpaket | Rückweg, Bau-Stufe | erledigt | 0,5 | – | – | 2026-10-14 | „(nach Advisor 0,75; Ist siehe Bericht)“; gemergt #338 |
| B2b-1b-1 | fixpaket | Advisor-Schema | erledigt | 0,5 | – | – | 2026-10-14 | gemergt #339 |
| B2b-1b-2a | fixpaket | Plan v2, Kern | erledigt | 0,75 | – | – | 2026-10-14 | gemergt #340 |
| B2b-1b-2b | fixpaket | Plan v2, Anzeige | erledigt | 0,75 | – | – | 2026-10-15 | gemergt #341 |
| B2b-2a | fixpaket | Review vollständig | erledigt | 0,5 | – | – | 2026-10-15 | gemergt #342 |
| B2b-2b-1 | fixpaket | qa-Schritt, Kern | erledigt | 0,5 | 0,6 | – | 2026-10-15 | gemergt #344 |
| B2b-2b-2 | fixpaket | qa-Schritt live | erledigt | 0,4–0,5 | 0,6 | – | 2026-10-15 | gemergt #345 |
| B2b-3c | fixpaket | Budget je Arbeitspaket | erledigt | 0,6–0,75 | – | – | 2026-10-16 | „(nach Advisor)“; gemergt #347 |
| B2b-3d | fixpaket | Umfangs-Abgleich | erledigt | 0,4–0,5 | – | – | 2026-10-16 | „(nach Advisor)“; gemergt #348 |
| B2b-3b-1a | fixpaket | Rückfrage-Kanal „Kanal“, ausgeschaltet | erledigt | 0,45–0,5 | – | – | 2026-10-16 | „(nach Advisor)“; gemergt #349 |
| B2b-3b-1b | fixpaket | Rückfrage-Kanal „Auswertung“ | erledigt | 0,35–0,45 | – | – | 2026-10-16 | „(nach Advisor)“; gemergt #350 |
| B2b-3e | fixpaket | Eingabefeld „Budget (Tokens, leer = Standard der Kontrolltiefe)“ | erledigt | 0,15–0,2 | – | – | 2026-10-16 | gemergt #351 (B2b-3e-1), #352 (B2b-3e-2) |
| W1 | workstream | Wachstumsbremse Leitstand-Server | erledigt | 0,3 | – | – | 2026-10-16 | gemergt #353 |
| B2b-3b-2b-2a-1 | fixpaket | Rückfrage-Kanal einschalten | erledigt | 0,3 | – | – | 2026-10-17 | gemergt #357 |
| B2b-3b-2b-2a-2 | fixpaket | Anzeige im Leitstand, Teil A Warteschlange | erledigt | 0,3 | – | – | 2026-10-17 | gemergt #358 |
| B2b-3b-2b-2a-3 | fixpaket | Anzeige im Leitstand, Teil B Abnahme | erledigt | 0,3 | – | – | 2026-10-17 | gemergt #359 |
| B2b-3b-2b-2b-1 | fixpaket | Vorbereitung des echten Nachweislaufs | erledigt | 0,3 | – | – | 2026-10-17 | gemergt #360 |
| B2b-3b-2b-2b Lauf | fixpaket | Stefan fährt den Nachweislauf nach Anleitung | erledigt | 0,1 | – | – | 2026-10-18 | kein Code; Datum = Merge der Auswertungen `features/F45/nachweise/b2b3b2b2b/` mit #362 — gefahren vor K (K hängt davon ab, gemergt 2026-10-17), Widerspruch nur im Datum |
| K | workstream | Kontext-Diät | erledigt | 0,3 | – | – | 2026-10-17 | gemergt #361 |
| B2b-3b-2b-2b-2 | fixpaket | Kanal standardmäßig an | erledigt | 0,2 | – | – | 2026-10-18 | gemergt #362 (B2b-3b-2b-2b-2a), #363 (B2b-3b-2b-2b-2b-1), #365 (B2b-3b-2b-2b-2b-2); #364 Startfreigabe erneuert |
| B2b | workstream | Kette und Grenzen | erledigt | 1,25–1,5 | – | – | 2026-10-21 | Sammelzeile aus §3, trägt kein Ist (sonst doppelt in „Plan gegen Ist“); Teilpakete ohne eigene Zeile dort: B2b-3a (#346), B2b-3b-2a (#354), B2b-3b-2b-1a (#355), B2b-3b-2b-1b (#356), B2b-4a-1 (#366), B2b-4a-2a (#367), B2b-4a-2b-1 (#368), B2b-4a-2b-2 (#369), B2b-4b (#370) |
| FB-1 | fixpaket | Fähigkeit bauen: Daten | erledigt | – | – | – | 2026-10-23 | „FB-1a ≈ 0,3; FB-1b ≈ 0,35“; gemergt #371 (FB-1a), #372 (FB-1b) |
| FB-2 | fixpaket | Fähigkeit bauen: Anzeige | erledigt | 0,25 | – | – | 2026-10-23 | gemergt #373 |
| B5a-1 | fixpaket | Akte schreiben | erledigt | 0,5–0,6 | – | – | 2026-10-24 | gemergt #374 |
| B5a-2 | fixpaket | Akte im Leitstand | erledigt | 0,4–0,5 | – | – | 2026-10-24 | gemergt #375 |
| B5b-1a | fixpaket | Planungsdaten lesen | erledigt | 0,4–0,5 | – | 2026-10-24 | 2026-10-24 | B5b-1 (0,6–0,8) geteilt nach dem Advisor-Pass (A1, Challenger 24.10.2026); gemergt #376 |
| B5b-1b-1 | fixpaket | Planung schreiben | erledigt | 0,3–0,4 | – | 2026-10-24 | 2026-10-24 | B5b-1b (0,35–0,45) geteilt nach dem Advisor-Pass (`advisor-b5b1b.md` A1, Challenger 24.10.2026); gemergt #377 |
| B5b-1b-2 | fixpaket | Bereinigungsliste | erledigt | 0,45–0,6 | – | 2026-10-24 | 2026-10-24 | aus B5b-1b geteilt (A1); vorher 0,3–0,4, korrigiert nach dem Advisor-Pass (`advisor-b5b1b2.md` B6, ohne Schnitt); gemergt #378 (Bereinigung B5b-3, A2: Abgenommen = Merge-Datum, Ist – nach A3) |
| T | fixpaket | Tests stabil | erledigt | 0,2–0,3 | – | 2026-10-24 | 2026-10-25 | Harness, kein Produktverhalten: schwere Testdateien seriell, Zeitfaktor, Messung (F-1186, F-1154); gemergt #379 (Bereinigung B5b-3, A2: Abgenommen = Merge-Datum, Ist – nach A3) |
| B5b-2 | fixpaket | Roadmap-Anzeige | erledigt | 1–1,4 | – | 2026-10-25 | 2026-10-25 | vorher 0,6–0,75; ergänzt um „Prioritäts-Kanban lesend (E-KANBAN = A, F-917)“; gemergt #380 (2a), #381 (2b-1), #382 (2b-2), #384 (2c-1), #385 (2c-2-C); 2c-2-AB gebaut — `erledigt` nach Auftrag Challenger 25.10.2026 („Workstream-Zeile B5b-2 auf erledigt, sofern die Ist-Zelle es zulässt“), abweichend von Advisor `advisor-b5b2c2.md` A1 und Plan v2 A1; Abgenommen = erwartetes Merge-Datum von 2c-2-AB, bei späterem Merge nachziehen; Ist pflegt der Challenger (Zelle erlaubt nur „–“ oder eine Zahl) |
| B5b-3 | fixpaket | R7: Ist nach Abnahme | erledigt | 0,4–0,6 | – | 2026-10-27 | 2026-10-27 | vorher 0,3, korrigiert nach dem Advisor-Pass (`advisor-b5b3.md` A6); gemergt #387 (Bereinigung W2a: Ist – nach A3, Begonnen = Abgenommen ⇒ 0 AT) |
| W2 | workstream | Aufräumpaket | laeuft | 1,8–3,1 | – | 2026-10-27 | – | Schnitt W2a–W2d (Challenger 27.10.2026), Server-Monolith gestrichen; W2b = W2b-1 umbaufest (#389) + W2b-2 Wegwerf-Ordner/Fristen (#390), beide erledigt; W2c-1 Ratschen + Formatierer (#391), erledigt; W2d Doku-Diät; 60 Gates→Tests gestrichen (Pfadfinder) |
| V1 | workstream | Live-Vorschau des Projekts im Leitstand | geplant | 0,3–0,5 | – | – | – | E-VORSCHAU-1 = A |
| B3 | design | Design & Motion in Fremdprojekten | geplant | 1,4–1,55 | – | – | – | |
| R | workstream | Referenzauftrag in einem Fremdprojekt | verworfen | 1–2 | – | – | – | entfällt — E-R-1 = A (Stefan, 25.10.2026): Referenzauftrag = F30-M1 |
| R2 | design | Brain Stufe 1: Produktzyklus lesend, mit Motion | geplant | 1,5–2 | – | – | – | E-BRAIN-1 = B (Stefan, 25.10.2026); vorher „Motion im Leitstand der Workforce“, 1 |
| Brain-2 | workstream | Brain Stufe 2: LLM-Wiki, Fragen mit Quelle, Rollen-Kontext | geplant | 1,5–2,5 | – | – | – | E-BRAIN-2 (Stefan, 25.10.2026): nach Brain Stufe 1, vor F30 |
| Brain-3 | workstream | Brain Stufe 3: Brain-Graph und Graphify | geplant | 1–2 | – | – | – | E-BRAIN-2 (Stefan, 25.10.2026): nach Brain Stufe 2, vor F30; Graphify nach Eignungsprüfung |

Planungsdaten nach E-B5-1 = A (F45 B5b-1a, 24.10.2026; Format und Gate `src/workboard/feature-planung.ts`). Zeilen und
Schätzungen aus `docs/projekt/fixpaket-f45.md` §3 in deren Reihenfolge (Entscheidung A4/O3; die offenen Zeilen folgen der
Reihenfolge ab W1): Schätzung nur, wo die Zelle mit einer Zahl oder Spanne beginnt (≈ entfällt), sonst „–“; Zusätze wörtlich
in der Notiz. Ist nur, wo eine einzelne AT-Zahl als Ist steht. Status und Abgenommen aus git (Datum des Merge-Commits auf
`main`, PR in der Notiz) — „Abgenommen = Merge-Datum“ ist eine Deutung, kein Abnahmeprotokoll (DEKLARIERT). Begonnen ist nur
bekannt, wo es eine Quelle gibt. Art: `workstream` = ungeteilter Baustein oder Sammelzeile, `fixpaket` = Teilpaket eines
geteilten Bausteins, `design` = Design- und Motion-Paket. Die Sammelzeile B2b bleibt, weil §3 nicht alle B2b-Teilpakete als
eigene Zeile führt; sie ist erledigt und ohne Ist, zählt also weder in „Bis M5 fertig“ noch in „Plan gegen Ist“. Ist pflegt bis
B5b-3 der Challenger nach Abschluss eines Eintrags nach. Reihenfolge der offenen Zeilen seit E-W2-1 (Stefan, 25.10.2026; ersetzt
E-BRAIN-2): B5b-3 → W2 → V1 → B3 → R2 (Brain Stufe 1) → Brain-2 → Brain-3 → F30; R ist verworfen (E-R-1 = A, Referenzauftrag = F30-M1).

Grobschätzungen der alten Scope-Tabelle ohne eigene Zeile hier (wörtlich, Stand vor B5b-1a): F-2b-2 „≈ 1–1,25“; F-3
„Schätzung fehlt“, Ist „F-3a-1 ≈ 0,5, F-3a-2 ≈ 0,4, F-3b-1 ≈ 0,95 AT (beauftragt 0,5; Grund: Advisor-Auflagen)“; B2b
„1,25–1,5 (ohne F-1072)“; Fähigkeit bauen „≈ 0,5–0,75“; B5a „0,75“; B5b „0,75–1“.

## Stand W2b-2

**Status:** erledigt — gemergt #390 (28.10.2026 nachgetragen in W2c-1).

**Auftrag:** W2b-2 „Wegwerf-Ordner und Fristen“ (Challenger, 27.10.2026; `w2-gate-inventur.md` Befunde 3/4, F-590, F-1215,
F-1230). Plan `plan-w2b2.md` → Advisor `advisor-w2b2.md` „Freigegeben mit Hinweisen“ (A1–A5, kein Schnitt) →
`plan-w2b2-v2.md`. A2: die ungetrackten `kontrollzustand/jarvis-jarvis-chat-*` stammen aus echter Leitstand-Nutzung, kein Gate.

**Gebaut:**
- `scripts/_wegwerf.ts` (neu): `wegwerfOrdner(kennung)` (`mkdtemp` unter `os.tmpdir()`, Aufräumen beim Prozessende über
  `raeumeVerzeichnis`, R1 — läuft auch nach `process.exit(1)`; die finally-Aufräumer je Fall bleiben) und
  `schalteGitWartungAb(repo)` (gc.auto 0, maintenance.auto/autoDetach false in `.git/config`); Test `scripts/_wegwerf.test.ts`
  (Ort, Räumen nach Exit 0/1 im Kindprozess, Werte über git gelesen; zwei Mutationen je rot).
- Wegwerf-Ordner: 52 Gates der Kette, `check-f20-leitstand-shell` und 18 Testdateien (`scripts/` und `src/`) statt
  `kontrollzustand-test-*` in der Repo-Wurzel; dazu die Rohströme von `claude-code-gateway.test.ts` und
  `execution-controller.test.ts` im Wegwerf-Ordner. f33 (g)/(h): `kontext_pfad` bleibt vertragsgemäß repo-relativ, Repo-Wurzel
  des Falls ist der Wegwerf-Ordner. Projektregister-Einträge f25/f41 (relativ zu `repo_pfad`) unverändert.
- startvorlagen/ und Rohströme: f10, f14, f15-automat-real schreiben Wegwerf-Startvorlagen in den Wegwerf-Ordner; f14 und
  f15-automat-real geben dem Testserver `rohBasisVerzeichnis` mit (Handler-Option, über `starteLaufUndVergiss` an F8). Kein
  Produktcode geändert.
- Fristen: 11 Frist-Gates skalieren über `skaliert` (`AIW_TEST_ZEITFAKTOR`, Standard 1) — in der Wartefunktion, in
  `while`-Fristen und bei `pruefZeitgrenzeMs: 10000`; ablaufende Fristen (f14 `zeitgrenzeMs: 1500`) unverändert.
- `SERIELL` 23 → 16: Repo-Baum-Läufer (check-docs, check-rules, check-f45-k-kontext, check-secrets) und startvorlagen-Gruppe
  (f10, f14, f15-automat-real) laufen parallel; 15 Zeit-/Frist-Gates und f3b1 bleiben (Kommentar je Gruppe).
- git-Wartung (F-1230): jedes `git init` in Gates und Tests, Init-Schleifen mit drei `config`-Einträgen. F-1230 „umgesetzt,
  Beobachtung in CI“ (A4).
- Findings F-1231–F-1234 neu; F-1215, F-1230 nachgezogen, F-590 (Archiv) Nachtrag. E-PRUEF-2 = B eingetragen (Entscheidungen,
  `docs/projekt/fixpaket-f45.md`). Inventur „Stand W2b-2“. 18 alte `kontrollzustand-test*`-Reste in der Repo-Wurzel lokal entfernt.

**DEKLARIERT:** Bei Signal oder Absturz bleibt ein Rest im System-Temp (kein Hook); wirft der Exit-Hook mit nicht toleriertem
Code, wird ein grünes Gate rot. `check-f45-b2b3b1b` skaliert auch seinen Standard 15 s. Der f25-Dispatch-Eintrag
(`repo_pfad: '.'`) zeigt weiter in die Repo-Wurzel, der Ordner entsteht dort nie. Repos, die Produktcode selbst anlegt
(`sammlung/quelle.ts`, `skill-installation.ts`), schalten die Wartung nicht ab. Keine Schutzregel gegen neue Literale
(F-1234). Lokal liegen weiter ≈ 13 000 alte Rohstrom-Ordner in `kontrollzustand-roh/` (gitignoriert, frühere f14/f15-Läufe).

**Prüfpass:** code-reviewer und qa je „Nicht freigegeben“ mit demselben Kernbefund: die mechanische Umstellung hatte in f25
und f41 vier Literale innerhalb von `join(<Temp-Wurzel>, …)` ersetzt (doppelt absoluter Pfad, f25 (2a) rot). Eine
Korrekturrunde: die vier Stellen zurück (die Basen lagen schon unter `os.tmpdir()`), `WEGWERF` dort entfernt; dazu Rohströme
der zwei Unit-Tests umgelenkt (cr 3/qa 3), SERIELL-Kommentar präzisiert (11 von 15, cr 4/qa 4), Zählung 18 (cr 5),
Laufwerksfall im Helfer-Test (cr 6/qa 7), F-1230-Abgrenzung Produkt-Repos (qa 6), Inventur zum f25-Dispatch-Eintrag (cr 2).

Voller Gate-Lauf im Commit-Block (2026-10-27, E-PRUEF-2 Ausnahme): ── check-kette: 120 grün, 0 rot · Wanduhr 533.5 s · Σ Einzelzeiten 1351.8 s · parallel 4, seriell 16; Repo-Baum vor/nach unveraendert; npm run test zweimal gruen.

## Stand W2c-1

**Status:** erledigt — gemergt #391 (28.10.2026 nachgetragen in W2d).
**Auftrag:** W2c-1 „Ratschen + Formatierer für neue Dateien“ (Challenger, 28.10.2026, ein Block mit eingearbeitetem Zusatz
E-FMT-1 = B; der erste Auftragsteil kam nicht an, F-1240). Plan `plan-w2c1.md` → Advisor `advisor-w2c1.md` „Nicht
freigegeben“ (kein Schnitt; Befund 1 ⇒ E-RATSCHE-1 = A) → `plan-w2c1-v2.md` → Delta `advisor-w2c1-delta.md` „Freigegeben mit
Hinweisen“ (N1: kein `vcs` in biome.json).

**Gebaut:**
- `biome.json`: `preset: recommended`, `noExcessiveCognitiveComplexity` max 15; die 20 Regeln mit Bestand auf `info`;
  `files.includes` um `public/**/*.mjs` erweitert; Formatierer 2 Leerzeichen, einfache Anführungszeichen, Semikolon nur bei
  Bedarf, Breite 120, `trailingCommas: es5`, `arrowParentheses: always`. `npm run lint` = `biome lint --error-on-warnings --diagnostic-level=warn .` (Info-Befunde des Bestands bleiben stumm, qa 7).
- Wahl der zwei offenen Formatierer-Optionen (Probe über alle 632 Code-Dateien, sechs Kombinationen): es5/always ändert am
  wenigsten (558 Dateien, +78 694/−22 349 Zeilen; all/always 561, none/always 575, asNeeded je 578–588).
- `tsconfig.checkjs.json` (strict, `allowJs`/`checkJs`, `scripts/leitstand/*.mjs` ohne Tests).
- Gate `scripts/check-ratsche.mjs` + `scripts/check-ratsche.test.mjs` (Rot je Regel, Kalibrierung mit echtem Biome,
  Kopplung an `files.includes`), Bestand `scripts/ratsche.json`, Eintrag in `GATES` (`scripts/check-kette.mjs`).
- ARCHITECTURE.md §1 (`scripts/`) Satz zur Ratsche (nicht §6: der Projektkarten-Auszug ist auf 9 000 Zeichen begrenzt, §6 hätte §7 „Verbotene Patterns“ aus der Karte des Code-Reviewers geschoben), Detail `docs/architektur/ratsche.md`; Kopfkommentar um Marker und erledigte
  Vorlagenanweisung gekürzt (F-015 erledigt) — Kern 17 793 von 17 800 Bytes.
- Findings F-1235–F-1241; E-FMT-1 = B und E-RATSCHE-1 = A unter Entscheidungen; W2b-2 erledigt; Inventur „Stand W2c-1“.

**Bestand (Ersterhebung 28.10.2026):** 255 Dateien in `scripts/ratsche.json`; Lint 562 Befunde in 20 Regeln (Komplexität
381); 38 Dateien über 800 Zeilen (ohne Server und i18n); checkJs 1 174 Fehler in 41 Dateien (die übrigen 267 der 1 441 liegen in
importierten `public/leitstand/*.js` und zählen nicht); Formatierer-Liste 76 Dateien (74 Bestand + 2 neue).

**DEKLARIERT:** Bearbeiten von Gate, JSON, `biome.json`, `tsconfig.checkjs.json`, Unterdrückungen im Code; Editor-Formatierung
außerhalb der Liste; Änderungen an importierten `public/leitstand/*.js` verschieben die checkJs-Zählung gelisteter Dateien;
checkJs nur `scripts/leitstand/*.mjs`. Werkzeug-Update mit neuen Befunden: beheben oder Bestand nur mit Entscheidung Stefans
anheben. **Folgen:** große Views (`workboard.js` 2 375, `chat.js` 2 076 …) nur
zeilenneutral änderbar; neue Module unter `scripts/leitstand/` (auch ausgelagerte Server-Helfer) brauchen 0 checkJs-Fehler,
Komplexität ≤ 15 und Formatierung; Umbenennen einer Bestandsdatei nur mit Entscheidung Stefans ((c) einmal rot).
Nicht gemacht: Autofix (Advisor 7 gestrichen), Formatierung des Bestands.

**Prüfpass:** code-reviewer und qa je „Freigegeben mit Hinweisen“, gemeinsamer Kernbefund: `leseReferenz` und der Startpfad
von `--aktualisiere` ohne Test (cr 1/qa 1/qa 3). Dazu im lokalen Lauf rot: `src/projektkarte/projektkarte.test.ts` — der Satz in
§6 schob §7 „Verbotene Patterns“ über die Auszugsgrenze von 9 000 Zeichen aus der Karte des Code-Reviewers; der Satz steht
deshalb in §1 (`scripts/`), dessen Auszug ohnehin bei 2 000 Zeichen endet. Eine Korrekturrunde: sechs Tests für
`leseReferenz` mit nachgebautem git (merge-base, gestapelter Branch, nur main, kaputte JSON, vor dem ersten Merge, ohne
git/Wurzel/Refs/ls-tree), Startwahl `waehleStart` herausgezogen; Werkzeugausgabe nur bei normalem Ende übernommen, tsc-Fehler in
Nicht-Quelldateien ⇒ (f) (cr 2); Formprüfung je Eintrag, `ls-tree` abgefangen (cr 3); Hinweistext bei kaputter Referenz
(cr 4); Biome-/tsc-Zählung nur für die Code-Dateien aus git, JS/TS-Endung außerhalb von CODE_MUSTER ⇒ (f) (cr 7/qa 6);
Rotmeldungen mit Befehl zum Finden der Stelle, Grenze, Weg für (c)/(d), Syntaxfehler benannt, Verweis auf die Detaildatei
(qa 2); Lint-Ausgabe ohne Info-Rauschen (qa 7); Doku: Werkzeug-Update, checkJs-Umfang, Import-Effekt, Dateigröße (qa 4/5/8/9,
cr 5); Test tsconfig-include = CHECKJS_MUSTER (cr 6); F-1238-Wortlaut (cr 8); Gate-Kopf (cr 10). Rot-Nachweise in der
Sitzung: `workboard.js` +1 Zeile ⇒ (a) rot; neue unformatierte `scripts/probe-ratsche.mjs` ⇒ (g3) rot; beide zurückgesetzt.

## Stand W2d

**Auftrag:** W2d „Doku-Diät“ (Challenger, 28.10.2026): Akte und Architektur-Kern wieder handhabbar, nur wörtliches
Verschieben. Plan `plan-w2d.md` → Advisor-Pass im frischen Kontext „Freigegeben mit Hinweisen“, kein Schnitt (A1–A10) →
`plan-w2d-v2.md`; A1 (Regeltext aus dem Kern) bestätigt vom Challenger, A7 als F-1243 statt E-Kennung.

**Gebaut:**
- Archivlauf `state/findings.md` nach E-K-1: 25 Einträge (Kopfzeilen-Status erledigt; F-015 … F-1201) byte-gleich und in
  Registerreihenfolge ans Ende von `state/findings-archiv.md`; die höchste ID bleibt im Register. Register 9 297 → 9 053 Zeilen
  (mit F-1242/F-1243), Kommentar `scripts/leitstand-server.mjs` „≈ 9 050 Zeilen“ (nur die Zahl).
- Akten-Archiv: Regel im Kopf von `feature.md` und `akte-archiv.md` (gilt für jede Akte, DEKLARIERT); 39 Stand-Abschnitte
  (B0 bis W2b-1) wörtlich nach `features/F45/akte-archiv.md`; in der Akte bleiben W2b-2, W2c-1, W2d. Kein Code liest
  Stand-Abschnitte; der Leitstand zeigt sie nicht (GET `…/akte`: Titel, Status, Ziel, Nicht-Ziele, AKs, Entscheidungen).
  `state/memory-map.md` Zeile „Feature-Akte“ nennt das Archiv.
- ARCHITECTURE.md §2: die drei Unterpunkte „Weitere Ausnahmen“ (vier Ausnahmen, 1 284 Bytes) wörtlich nach
  `docs/architektur/lokale-dateien.md` („Kurzfassung aus dem Kern §2“); im Kern die vier Namen. Kern 17 793 → 16 726 Bytes
  (1 074 Bytes Luft), Deckel 17 800 unverändert; Projektkarte des Code-Reviewers: Lage und Länge von §7 gleich, Text und
  Hash von §2 geändert.
- Findings F-1242 (erledigt), F-1243 (offen); W2c-1 erledigt (Notiz W2); zwei Zeilen unter Entscheidungen.

**DEKLARIERT/Grenzen:** Akten-Archivregel ohne Gate; die 25 archivierten Einträge fehlen in den Workboard-Ansichten für
Erledigtes (bekannte Grenze, F-1139); Verweise auf archivierte Abschnitte, u. a. „Stand W2a“ (`scripts/check-kette.mjs`),
„Stand B5b-2c-1“ (`public/leitstand/befund-zuordnung.js`), „Stand B1b-1“ (`docs/harness/startfreigabe-erneuern.md`), der
Status-Absatz der Akte und einzelne Findings, finden ihren Abschnitt über den Kopfhinweis der Akte im Archiv; die zwei neuen
Zeilen unter Entscheidungen tragen keine E-Kennung und erscheinen daher nicht in der Akte-Ansicht des Leitstands (A7);
Restvermerke archivierter Einträge (F-917 Ziehen in Teil 2, F-979, F-1141 commit-guard) stehen nur noch im Archiv — Hinweis
für F-1243; der Server-Kommentar
nennt die heutige Zeilenzahl neben der Messung vom 10.10.2026.

**Prüfpass:** code-reviewer und qa je „Freigegeben mit Hinweisen“, kein kritischer Befund. Eine Korrekturrunde: Vorrang bei
Widerspruch zwischen Kurz- und Langfassung in `lokale-dateien.md` (cr 1/qa 2); memory-map nennt die Akte mit der Regel (qa 1);
Regeltext für einen zweiten Lauf eindeutig — „erledigt“ = gemergt, ab dem ältesten ohne Lücke, Hinweissatz nachziehen,
Regelkopf für neue Archive, Vergleich ohne abschließende Leerzeilen (qa 3); „drei Unterpunkte (vier Ausnahmen)“ statt „vier
Unterpunkte“ (cr 3/qa 7); Verweisliste, unsichtbare Entscheidungs-Zeilen, Restvermerke archivierter Einträge (cr 4/qa 4/5/6);
F-1243-Zählung (cr 5); Satzfragment (cr 6); „Stand W2c-1“ mit Status-Zeile wie „Stand W2b-2“ (qa 8). Nicht geändert: Kopfsatz
von ARCHITECTURE.md „Jede Regel steht hier als Satz“ (DEKLARIERT; Abweichung benannt, cr 7).

**Prüfung in der Sitzung (E-PRUEF-2 B):** Byte-Kontrolle per Skript — Register + Archiv 1 193 Blöcke vorher byte-gleich
nachher, 25 verschoben, Köpfe unverändert, Reihenfolge erhalten, neu F-1242/F-1243; Akte + Akten-Archiv 49 Abschnitte, 46
byte-gleich, geändert nur `## Entscheidungen`, `## Workstreams` und `## Stand W2c-1` (Status-Zeile), neu `## Stand W2d`;
§2-Block (1 284 Bytes) byte-gleich in `lokale-dateien.md`. Grün: lint, typecheck, `npm run test`, Lagebild `--check`,
check-f21-workboard, -f45-k-kontext, -ratsche, -docs, -rules, -status-akten, -feature, -akte-meilenstein, -contract,
-f45-b2a1-projektkarte, -f45-b5a1-akte, -f45-b5a2-akte-anzeige, -f45-b5b1a-planung, -f45-b5b1b2-bereinigung, -f15-workflow,
-f15-automat-real, -f45-b2b3b1b-auswertung, -f45-b2b3b2b1b-r1, -f45-b2b3b2b1a-rest, -f45-b2b3b2a-absicherung,
-wachstumsbremse-server.
