# F45 — Fixpaket Arbeitsfähigkeit

## ID
F45

## Titel
Fixpaket Arbeitsfähigkeit

## Status
Status: IN_ARBEIT

B0 gemergt #316 (`9bdfc1a`; Abschnitt „Stand B0“). P gemergt #317 (`8e5adf9`; Abschnitt „Stand P“). S gemergt #318 (`387f1a3`; Abschnitt „Stand S“). B1a-1 gemergt #319 (`fde3b06`; Abschnitt „Stand B1a-1“). B1a-2 gemergt #320 (`cf433fd`; Abschnitt „Stand B1a-2“). B1b-1 gebaut (Branch `feat/f45-b1b1-harness-lauf`, Basis `cf433fd`, nicht committet; Abschnitt „Stand B1b-1“). Status bleibt IN_ARBEIT bis zur Abnahme durch Stefan.

Gültige Status-Werte (geprüft vom Gate): ENTWURF, READY_FOR_TECH, WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN, BLOCKIERT, ABGEBROCHEN.

## Ziel
Nach dem Fixpaket arbeitet die Workforce so, wie Stefan heute mit Challenger-Chat und Claude Code in VS Code auf Grundlage des Harness arbeitet (E-M5-19): Challenge und Plan → Arbeitspaket → Bau mit Harness (CLAUDE.md, Hooks, Agents, Skills, MCPs) → Prüferpass, Render-Nachweis, `npm run check` → Rückfrage bei Bedarf → Abnahme → fertige Git-Befehle für Stefan. Der Chat funktioniert gut, die Performance stimmt, Stefan installiert, aktiviert und sieht Fähigkeiten (MCPs, Skills, Agents, Plugins) im Leitstand, die Roadmap stimmt, und F30 (Opportunity Scanner) kann direkt mit der Workforce selbst entwickelt werden.

## Grundlage
`docs/projekt/fixpaket-f45.md` — Ziel, Abnahmekriterien (K1–K5, P1–P5, R1–R7, Bestehensbedingung mit Belegen 1–14), Workstreams, offene Entscheidungen. Alle Bauaufträge F45 arbeiten gegen diese Datei.

## Entscheidungen
- **E-F45-1 = A** (Stefan, 01.10.2026) — Eine Feature-Akte wird direkt im Leitstand bearbeitet; Wortlaut in `docs/projekt/zielfassung.md` §13.6.
- **E-F45-2** (offen, fällig nach R) — Teil 2 vor F30 über Challenger-Bauaufträge (A) oder als erste Aufträge der Workforce an sich selbst (B). Empfehlung Challenger: B. Grundlage Abschnitt 5.
- **E-F45-3 = A** (Stefan, 11.10.2026) — Jeder schreibende Ablauf der Workforce arbeitet in einem eigenen Git-Worktree auf eigenem Branch neben dem Projekt. Stefans Projektordner bleibt unberührt. Im eigenen Worktree darf der Ablauf Dateien löschen — über eine Löschliste, die der Server prüft und ausführt. Wortlaut in `docs/projekt/zielfassung.md` §13.6; Umsetzung B1a-1.
- **E-F45-5 = A** (Stefan, 11.10.2026) — Auslegung von E-F39-1=B im Arbeitsordner: Sauberkeit wird beim Anlegen des Worktrees festgestellt; ein schreibender Schritt prüft danach nur, dass der Worktree genau auf `wf/<Ablauf-ID>` steht (der Korrekturlauf findet die Änderungen des ersten Baus vor). Für den Projektordner gilt E-F39-1=B unverändert. Grundlage `features/F45/plan-b1a1.md` (Plan v3 B6).
- **E-F45-4** (offen, aus WS P, F-1018) — Energiemodus „Ausgeglichen“ (A) oder der Leitstand nimmt sich selbst aus der Drosselung (B). Grundlage Abschnitt 5.
- **F-1015-Kriterium** (Challenger, 11.10.2026) — Seitenspeicher, JS-Heap, DOM-Knoten und Listener am Ende ≤ 1,2 × Wert nach 15 min (Aufwärmphase ausgenommen); Grundlage Abschnitt 2.

## Scope

| WS | Inhalt | Findings | Abhängig von | Prüfmodus | Schätzung AT | Ist |
|---|---|---|---|---|---|---|
| B0 | Chat zuverlässig und schnell: Messskript, eigene Chat-Zeitgrenze, Chat-Worker fest, Fehler-Eintrag bei jedem Misserfolg, Neuladen verfolgt Lauf, Start-Hinweis bei falschem Ordner (E-188 bleibt streng), Event-Loop-Messung, Chat-Reiter; Akte F45 | F-987, F-986 a, F-971, F-544, F-1007, F-1008 | – | vor Merge | 0,75 | ≈ 1 AT, gemergt #316 (9bdfc1a) |
| P | Performance: /api/zustand im Langlauf, Event-Loop-Blockaden beseitigen, Seitenwechsel messen, f16-Restordner | F-556, F-999 | B0 (Messskript) | vor Merge | 0,5 | ≈ 1,25 AT + ≈ 6 h Messung (Bau, nicht gemergt) |
| S | Härtung klein: ein Git-Starter für alle Aufrufe, Geheimnis-Maskierung (Live-Aktivität, env im Harness-Detail), Abbruch-Formulierung | F-1000, F-1005, F-1003 | – | vor Merge | 0,3 | |
| B1a | Lauf-Umgebung: Branch/Worktree je Lauf (Gültigkeitsschlüssel misst die Einstellungen des Lauf-Ordners), Vorlage nachziehen (513), Mindest-Gates im Skelett, check:template, Standard-Startvorlage aus dem Register, Löschen im Lauf, Kontrollzustand in Fremdprojekten | F-954, F-939, F-701, F-1009, F-715, F-766 | E-F45-3 | Advisor-Pass, vor Merge | 1–1,25 | |
| B1b | Harness im Lauf, geschnitten am 11.10.2026: **B1b-1** Hintergrund-Ausführung abschalten und als unvollständig werten, Lauf-Härtung (npm-Installationsskripte aus, Schreiben nur im Arbeitsordner), Hooks im -p-Lauf belegen, commit-guard härten, „vorgesehen gegen benutzt“ ans Review, Vorstart-Scan; **B1b-2** Harness-Abgleich-Tabelle (Beleg 12) in Laufakte und auf der Seite Workforce, Kurzliste der benutzten Fähigkeiten an die Abnahme. Verschoben: Projekt-Agents/-Skills im Lauf und Freigabe nach Inhalt (F-815/F-816 → F), Codex-Harness-Regeln (F-929 → B2a), /lessons (F-933 → Teil 2) | B1b-1: F-1026, F-1027, F-1035, F-818, F-932, F-937 (Review); B1b-2: F-937 (Abnahme), Beleg 12 | B1a | vor Merge | 0,75 | |
| F | Fähigkeiten verwalten: MCPs, Skills, Agents und Plugins im Leitstand installieren (auch aus den OFFEN-Einträgen), je Projekt aktivieren/deaktivieren (wirkt ab dem nächsten Lauf, gespeichert im Workforce-Register, nicht in settings.json — E-F46-2), Agents installierbar und im Lauf nutzbar, Plugins im Fähigkeitenmodell; sichtbar: installiert · aktiv · im letzten Lauf benutzt (Seite Workforce, Lauf-Detail); MCP-Grenzen nach E-F36-4 (Einzelfreigabe, Kosten sichtbar, nur lesend); aus B1b: Projekt-Agents/-Skills im Lauf, Freigabe nach Inhalt | F-815, F-816, F-910, F-859, F-1012 | B1b | Advisor-Pass, vor Merge | 1,25–1,5 | |
| B2a | Arbeitspaket als Daten (einziges Übergabeformat, Server rendert den Prompt, Gate prüft Pflichtfelder) und Projektkarte an alle planenden/prüfenden Rollen; DoD und Checkliste an Review/qa; Feature ↔ Ablauf; aus B1b: Codex-Harness-Regeln | F-938, F-936, F-829, F-931, F-989, F-998, F-959, F-929 | B1b | vor Merge | 1 | |
| B2b | Kette und Grenzen: Advisor-Schema, Plan v2, Rückweg ≤ 1 je Stufe, qa-Schritt, design-guardian-Schritt mit Render-Nachweis im Lauf, Budget je Arbeitspaket mit Halt, Umfangs-Abgleich, Rückfrage während des Baus, Rechte-Rückfrage bei Befehlen außerhalb des Werkzeugsatzes (Spike zuerst: --permission-prompt-tool; sonst Halt mit „einmal erlauben und fortsetzen“), Codex-Nutzen messen, „Bereit zum Sichern“ | F-909, F-203, F-820, F-980, F-981, F-978, F-982, F-979, F-1011 | B2a | Advisor-Pass, vor Merge | 1,25–1,5 | |
| B5a | Feature-Fluss: Coach legt Akte an, Akte im Leitstand bearbeiten (E-F45-1), Planung änderbar mit Datum, Bugs mit Feldern, Workstreams als Daten, Entscheidungen in der Akte-Leseroute, offene Abnahmen überall gezählt | F-912, F-984, F-990, F-975, F-976, F-995, F-991 | B2a | vor Merge | 0,75 | |
| B5b | Roadmap richtig: Roadmap-Schema v1 (Workstreams mit Schätzung, Ist, Datum), Gate Akte ↔ Roadmap, Gantt-Zeilen und -Balken, Kennzahlen „Bis M5 fertig“ und „Plan gegen Ist“, Datenbereinigung als eine Bestätigungsliste für Stefan (kein Status ohne Stefan auf ABGESCHLOSSEN) | F-944, F-976 (Anzeige), F-990, F-1010 | B5a, B2b | vor Merge | 0,75–1 | |
| B3 | Design in Fremdprojekten: impeccable installierbar, design-guardian und Token-Gate im Skelett | F-911 | B1a, B2b | nach Merge | 0,3 | |
| R | Referenzauftrag in einem Fremdprojekt (Vorschlag: haushaltsbuch2; nicht F30, damit die F30-Messcheckliste unberührt bleibt), Belege 1–14, eine Fixrunde, Abschluss F45 | F-980 | alle | echter Lauf | 1–2 | |

Die Spalte „Ist“ trägt der Challenger nach Abschluss eines Workstreams nach.

## Stand B0
Branch `feat/f45-b0-chat` (Basis `d10f9be`, gleich `origin/main` beim Start), nicht committet. Bau 10.10.2026.

**Ist:**
- **Messskript** `scripts/messe-chat.mjs` (nicht in `npm run check`): eigener Leitstand auf Port 4199 mit
  `LEITSTAND_ZEITMESSUNG=1`, echte Oberfläche headless, je Turn Client-Zeile `[jarvis-latenz]`,
  Server-Marken, Worker/Modell aus der Laufakte, Endart, `claude.exe`/`codex.exe`; alle 2 s
  GET /api/zustand, Event-Loop-Zeilen, Modern-Standby-Fenster (Kernel-Power 506/507), jede Minute
  Speicher (RSS Server, RSS Chromium, freier Speicher, `claude.exe`) mit Selbstabbruch unter 1,5 GB frei.
  Event-Loop-Zeile im Server: `scripts/leitstand/event-loop-messung.mjs` (nur mit `LEITSTAND_ZEITMESSUNG=1`).
- **Zeitgrenze** (F-1007): Jarvis 180 s, Coach 300 s; GET /api/laeufe/<laufId> liefert `laufZeitgrenzeMs`.
- **Chat-Worker fest** claude-code (F-544); Codex war in 3b nicht schneller.
- **Fehler-Eintrag für jeden Misserfolg** (F-1008): `istFehler`, `fehler { art, grund }`; nie eine Antwort;
  Verlaufsfenster des Modells ohne Fehler-Einträge; der Client doppelt nicht.
- **Neuladen**: laufender Chat-Lauf wird aus `aktiverLauf` übernommen (Restgrenze F-986 b).
- **Start-Hinweis** (F-986 a): Startordner gegen den Wirksamkeitsnachweis (dieselbe Lesestelle wie das Gateway,
  `pruefeStartordner`; Normalisierung wie E-188, `arbeitsverzeichnisseGleich`); `console.warn`, Feld
  `startHinweis` in GET /api/zustand, Band oben und Hinweis im Chat. E-188 unverändert streng.
- **F-971**: Punkt am Reiter des anderen Modus, Lauf-Blase in jedem Untermodus, Sperrgrund.
- **Nachweise**: `features/F45/nachweise/b0/messung-*.md/.json`, Render-Nachweis `features/F45/nachweise/b0/render/`.

**K1–K5 vorher/nachher** (Messdateien `features/F45/nachweise/b0/messung-*.md`; Werte in ms, Median/Max; Jarvis
10 Turns, Coach 5 Turns Untermodus Feature, Langlauf 30 min Warmlauf + 5 Jarvis-Turns auf dem neuen Stand):

| Kennzahl | Ziel | vorher Jarvis | vorher Coach | vorher Codex (3b) | nachher Jarvis | nachher Coach | Langlauf |
|---|---|---|---|---|---|---|---|
| K1 Absenden → 202 | ≤ 300 / ≤ 1 000 | 30 / 37 | 24 / 32 | 36 / 55 | 28 / 39 | 22 / 51 | 115 / 279 |
| K2 request_eingang → prozess_gestartet | Median ≤ 1 000 | 235 | 269 | nicht messbar (F-1014) | 251 | 229 | 556 |
| K3 Absenden → Antwort | Jarvis ≤ 15 s / ≤ 45 s, Coach ≤ 25 s / ≤ 90 s | 5 426 / 6 740 | 28 167 / 52 701 | 6 786 / 12 017 | 5 191 / 5 705 | 9 817 / 23 214 | 6 051 / 6 379 |
| K4 sichtbar beendet | 20 von 20 | 10/10 | 4/5 (1 hängt, Standby) | 5/5 | 10/10 | 5/5 | 5/5 |
| K5 Fehler-Eintrag, Neuladen | erfüllt | – (kein Eintrag, kein Weiterverfolgen) | – | – | erfüllt (Tests, Render) | erfüllt | – |

K1–K5 nachher erfüllt (K4: 20 von 20 echte Turns). **Worker-Entscheidung:** Codex war in 3b nicht schneller
(K3-Median 6,8 s gegen 5,4 s claude-code) → Chat-Worker fest claude-code (F-544).

**Ursachen aus der Vorher-Messung:** Der „hängende“ Coach-Turn fiel genau in ein Modern-Standby-Fenster
(17:19:03–17:23:59 UTC, Netz getrennt); die API-Verbindung des Claude-Prozesses war danach tot, und ohne Zeitgrenze
(Standard-Startvorlage) endete der Lauf nie — die 272 s „Event-Loop-Blockade“ waren der angehaltene Rechner (F-1013).
In sauberer Lage aus dem Hauptordner antwortet Jarvis in ≈ 5 s; Coach-Läufe streuen mit der Werkzeugnutzung
(8–53 s vorher, 7–23 s nachher). Der erste Langlauf wurde wegen Speichermangel des Rechners abgebrochen und auf
dem neuen Stand wiederholt (gilt als vorher und nachher).

**Speicher Langlauf** (je Minute): max RSS Server 114 MB (nach Anlauf flach), max RSS Chromium 707 MB, min. freier
Speicher 2 280 MB, `claude.exe` konstant 10. Chromium wächst in Stufen 396 → 603 MB (+52 % im Warmlauf, ab der
ersten Probe nach dem Laden; der im Messbericht ausgewiesene Wert „500 %“ rechnet von einer Probe vor dem Laden —
seither korrigiert) → F-1015 (WS P).

**Bekannte Grenzen:**
- WS P: GET /api/zustand im Langlauf Median 106 ms, p95 440 ms (frisch 45/83 ms); Event-Loop max 2 118 ms in einem
  60-s-Fenster (Ziel P2 ≤ 200 ms); K1/K2 im Langlauf merklich langsamer als frisch, aber im Ziel.
- K5 ist mit Attrappen (`scripts/leitstand-chat-misserfolg.test.mjs`) und Render-Nachweis belegt; alle 20 echten Turns
  endeten mit Antwort (F-1016 f).
- Läufe aus einem Worktree bleiben verweigert (E-188 unverändert); der Start-Hinweis macht es nur sichtbar (B1a, E-F45-3).
- Ein Lauf über Standby endet erst an der Chat-Zeitgrenze (F-1013); Restpunkte des Prüfpasses: F-1016.
- Messungen liefen mit der Standard-Startvorlage; den festen Worker mit `startvorlagen/ai-workforce.json` belegt der Test
  `scripts/check-f26-jarvis.mjs` (h).

**Prüfpass** (frischer Kontext, eine Korrekturrunde): code-reviewer „freigegeben mit Hinweisen“, qa und design-guardian
„nicht freigegeben“. Behoben: Erfolg ohne Laufakte schreibt einen Fehler-Eintrag, der Client fällt sonst auf eine
lokale Anzeige zurück; Übernahme nach Neuladen wartet bei 404 mehrere Ticks und lädt bei schon beendetem Lauf nach;
gescheitertes Zusammenfassen speichert „[Zusammenfassung angefordert]“; Chat-Verlauf wirft bei Nicht-2xx; Punkt am
Untermodus-Knopf; strengere Lauf-Präfixe; Zusammenfassen-Knopf ohne echten Verlauf verborgen; Band ohne fremde Klasse,
mit schmalen Fassungen und ausgeblendet auf der Startfläche; Einzug von Chat-Hinweis und Sperrgrund; Reiter-Punkt
verschiebt nichts; Fehlertext ohne Dopplung; Tests warten auf Bedingungen statt fester Zeiten. Render-Nachweis neu
(17 Folgen inkl. 390 px, hell, 200 %, ru, reduzierte Bewegung). Rest als F-1016.

## Stand P
Branch `feat/f45-p-performance` (Basis `9bdfc1a`, gleich `origin/main` beim Start), nicht committet. Bau 10./11.10.2026.

**Ist:** ≈ 1,25 AT Arbeit (Schätzung 0,5–0,75 AT) plus ≈ 6 h Messlaufzeit (Schätzung ≈ 4,5 h). Mehr als geplant durch drei Abbrüche der Vorher-Messung (zweimal Speicherschutz wegen Firefox ≈ 5 GB, einmal von Claude Code bei Speicherdruck beendet), einen Modern-Standby über Nacht trotz Netzbetrieb und die Ursachenanalyse der Windows-Drosselung (F-1018).

**Gebaut:**
- **Messen** (`scripts/messe-chat.mjs`, nicht in `npm run check`): `--nur-leerlauf M` mit `--seite`, `--seitenwechsel` (alle 60 s eine der sechs Hauptseiten `#/dashboard`, `#/roadmap`, `#/workboard` = Entwicklung, `#/attention`, `#/capabilities`, `#/chat`; Zeit bis „Inhalt sichtbar“: Container sichtbar, ≥ 40 Zeichen, keine Ladezeile; Chat: Gesprächsfläche mit Eintrag oder Leerzustand), Seitenmetriken je Minute (JS-Heap, DOM-Knoten, Listener), Heap-Snapshot nach dem Laden und am Ende samt Top-Wachstum, minütlicher Zwischenstand, Energiemodus (reg.exe, lesend), Standby-Fenster → Abschnitt ungültig plus `-gueltig`-Auswertung, `--auswerten … --bis` für Zuschnitte. Server bei `LEITSTAND_ZEITMESSUNG=1`: Zeile „Zustand-Quellen 60s“ (max/p95 je Poll-Quelle), Zeile „Synchron > 200 ms“ je Anfrage (`scripts/leitstand/event-loop-messung.mjs`).
- **F-556** (`scripts/leitstand-server.mjs`): Stempel der Läufe und Workflows asynchron und parallel; entscheidung-/Abnahme-Ketten nur, wenn ihr Ordner in der Verzeichnisliste steht; Kaltstart und Cache-Prüfung in 25-ms-Scheiben; Cache je Auftrag (GET /api/auftraege) und Parse-Cache der Workitems mit dem Dateiinhalt als Stempel (Datei- und Verzeichnis-mtime ändern sich unter Windows beim schnellen Schreiben oft nicht — gemessen). Antworten inhaltlich gleich; GET /api/laeufe bleibt synchron (gleicher Cache), weil `check-f814-host.mjs` rohe Anfragen mit Halbschluss schickt.
- **Event-Loop:** dieselben Fixes (Läufe, Aufträge, Workitems); der Prüfschritt läuft bereits als Kindprozess (`starteProzess`, spawn) — P5-Voraussetzung erfüllt.
- **F-999:** Ursache war ein paralleler Test (`execution-controller.test.ts`, „f16c-…“), nicht das f16-Gate; der Nachlauf-Test nutzt ein eigenes Reste-Verzeichnis.
- **F-1015:** keine Codeänderung nötig — kein Leck (siehe unten).
- **Teil 3 (F-1016 c, d):** Grund-Code im Fehler-Eintrag, Übersetzung in vier Sprachen, Sende-Sperre bei anderem aktivem Lauf, 409 übersetzt (`public/leitstand/chat-laufstand.js`, `views/chat.js`, i18n).
- **Tests:** `scripts/leitstand/zustand-caches.test.mjs` (neu), `event-loop-messung.test.mjs`, `chat-laufstand.test.mjs`, `leitstand-chat-misserfolg.test.mjs`, `aufraeumen-nachlauf.test.mjs`.
- **Nachweise** `features/F45/nachweise/p/`: `messung-vorher.md` (120 min, ab 23:47:31 UTC Standby), `messung-vorher-basis60.md` (Vorher-Basis: die sauberen ersten 60 min), `messung-nachher-gleich.md` (60 min, gleicher Energiemodus), `messung-nachher-jarvis.md` (5 Turns), Abbruch-Läufe `messung-vorher-abbruch*.md`, Render-Nachweis `render/` (12 Folgen). Heap-Snapshots per .gitignore ausgeschlossen.

**Ergebnis** (Energiemodus bei Netzbetrieb in allen Läufen „Beste Energieeffizienz“; Stefan hat ihn am 11.10.2026 nicht umgestellt — der Endzustand ist „nachher-gleich“, eine Messung im Modus „Ausgeglichen“ entfiel):

| Kennzahl | Ziel | Vorher-Basis (60 min) | Nachher = Endzustand (60 min) |
|---|---|---|---|
| P1 GET /api/zustand p95 | ≤ 300 ms frisch und spät | gesamt 125, frisch 504, spät 92 | gesamt 65, frisch 63, spät 68 |
| P2 Event-Loop max je 60 s | ≤ 200 ms | 12 von 63 Fenstern darüber, max 2 162 | 1 von 60 (nur Startfenster: erster GET /api/chat kalt 1 433 ms, F-1020), sonst max 187 |
| P3 Seitenwechsel Median / Max | ≤ 500 ms | 24–249 / bis 3 654 (roadmap), 1 156 (workboard), 1 131 (attention) | 26–284 / alle ≤ 359 |
| P4 npm run check 3× grün | 3/3 | – (F-999 sporadisch) | 3/3 grün: 10:28:54–10:35:21, 10:35:21–10:41:46, 10:41:46–10:48:08 UTC (11.10.2026, je 1 599 Tests, kein Standby) |
| F-1015 (Mediane Min. 15–20 gegen letzte 5 min) | ≤ 1,2 | RSS 0,94, JS-Heap 0,88, DOM 1,0, Listener 1,0 | RSS 1,02, JS-Heap 0,94, DOM 1,0, Listener 1,0 |
| K1 / K3 Jarvis (5 Turns nach dem Leerlauf) | ≤ 300 ms / ≤ 15 s Median | B0: 28 ms / 5,2 s | 27 ms / 5,2 s, 5/5 Antworten |

Die Zeilen „Synchron > 200 ms“ und „Zustand-Quellen“ sind vorher/nachher nicht vergleichbar: nachher misst der Dispatcher-Mantel nur bis zum ersten `await`, die Quellen messen Wartezeit statt blockierter Zeit. P2 wird deshalb nur am Event-Loop-Maximum verglichen, P1 an der vom Client gemessenen Dauer.

**Ursachen:**
- P1/P2/Event-Loop: GET /api/zustand stempelte ≈ 280 Läufe synchron (stat + readdir je Kette, ≈ 560 Systemaufrufe je Poll); GET /api/auftraege las 226 Auftragsketten je Aufruf; GET /api/workitems parste findings.md je Aufruf.
- Verstärker: Windows drosselt den Leitstand im Energiemodus „Beste Energieeffizienz“ um Faktor 5–10 (F-1018) — nachgewiesen mit einer reinen CPU-Schleife und einem prozessweisen Opt-out am Testprozess.
- F-1015: kein Leck. JS-Heap, DOM-Knoten und Listener über 2 h flach, kein Detached DOM; RSS Chromium 360 → ≈ 650 MB in den ersten ≈ 15 min, danach Plateau; Heap-Zuwachs = einmal gefüllte Ansichtsdaten und der DevTools-Netzwerkpuffer der Messung.
- F-999: paralleler Test schreibt ins gemeinsame Reste-Verzeichnis.

**Grenzen:**
- Nachher nur 60 min (statt 2 h); die 2-h-Vorher-Messung ist ab 23:47:31 UTC durch Standby ungültig.
- Vorher-Basis: der Energiemodus wurde nicht in der Messung erfasst, sondern per Registry-Abfrage am Abend des 10.10. (vor der Vorher-Messung) und am 11.10. (vor der Nachher-Messung) belegt; in „nachher-gleich“ steht er in der Messdatei.
- F-1015 belegt „kein Leck nach dem Aufwärmen“ (vorher schon erfüllt), nicht „behoben“.
- Kaltstart (erster GET /api/chat) und der Workitems-Parse nach einer Änderung bleiben synchron (F-1020).
- P5 (Baulauf) misst WS R.

**Prüfpass** (frischer Kontext, eine Korrekturrunde): code-reviewer, qa und design-guardian zunächst „nicht freigegeben“ (Server-Kern hielt; Befunde am Chat-Teil, an Texten, Tests und fehlenden Nachweisen). Korrigiert: 409 „kein Verlauf“ mit Code, Gründe ohne Code (de Klartext, sonst Verweis), Sperre sofort bei lokalem Lauf des anderen Reiters, Nachlauf-Fenster 5 s statt unbegrenzt, Projektwechsel leert es, Texte ohne Doppelungen, eine Stempelformel für sync/async, Restrisiko dokumentiert, Tests ergänzt, Zwischenstand-Regex, .gitignore für Heap-Snapshots, F-1015 über Mediane. Nachpass: alle drei „freigegeben mit Hinweisen“; Hinweise eingearbeitet (ru-Texte, `--auswerten` für ältere Messdateien, Liste der beendeten Läufe ausgedünnt, Render-Folge für die 409 beim Senden) oder als F-1019/F-1020 festgehalten.

## Stand S
Branch `feat/f45-s-sicherheit` (Basis `8e5adf9`, gleich `origin/main` beim Start), nicht committet. Bau 11.10.2026.

**Ist:** ≈ 0,6 AT (Schätzung 0,3 AT). Mehr durch die Korrekturrunde: Gate-Scanner mit Texten/Templates/Regex-Literalen, Selbstbetrieb über `node_modules/.bin`, Maskierung des F-760-Halt-Grunds, Laufzeitgrenzen der Muster.

**Gebaut:**
- **F-1000 Git-Starter** (`src/git-starter/index.ts`): `findeGitProgramm` (absoluter Pfad nur aus absoluten PATH-Einträgen ohne Segment `node_modules`, außerhalb von Windows nur ausführbar; Muster aus `routen-code.mjs` hierher verschoben), `gitProgramm` (Erfolg je PATH zwischengespeichert, „nicht gefunden“ nie; ohne git Fehler „git nicht gefunden (PATH)“, kein Rückfall auf den bloßen Namen), `gitUmgebung` (ohne jede geerbte GIT_*-Variable, Zusatzwerte ausdrücklich; vorher doppelt in `installation.ts` und `routen-code.mjs`), `fuehreGitSync` (execFileSync-Semantik). Umgestellt: `src/authorization-boundary/index.ts` (leseAusCommit, Rückgabe unverändert, null bei jedem Fehler), `src/execution-controller/index.ts` (leseClaudeAenderungen), `src/aenderungsuebersicht/index.ts` (leseGitOderNull), `src/ressourcen/installation.ts` (gitReal — nicht im Auftrag genannt, vom Gate gefunden), `scripts/leitstand-server.mjs` (git status, ls-files, rev-parse HEAD), `scripts/zustand-sichern.mjs` (git); `scripts/leitstand/routen-code.mjs` nutzt `gitProgramm` + `gitUmgebung` des Starters (asynchron, eigene feste Zusatzwerte). Re-Exporte nur für Tests entfernt; Tests importieren den Starter direkt.
- **Gate** `scripts/check-git-starter.mjs` (in `npm run check` nach `check-zustand-sichern`): Aufrufe `name('git' | 'git.exe' | 'git.com', …)`, exec/spawn mit Befehlstext `git …`, Konstanten (`const X = 'git'`) und Startziel-Arrays (`['git', …]`), Groß-/Kleinschreibung egal, in `src/`, `scripts/leitstand*.mjs`, `scripts/leitstand/`, `scripts/zustand-sichern.mjs` (ohne Tests; Ausnahmeliste leer). Kommentare entfernt ein kleiner Scanner, der Texte, Template-Literale und Regex-Literale mitliest (vorher blendete ein `/*` in einem Text bis zu ≈ 1 670 Zeilen von `leitstand-server.mjs` aus, Prüfpass cr 1). Belege: gegen `HEAD` (vor S) genau die acht alten Stellen; 323 von 323 eingeschobenen Aufrufen über alle Dateien des Umfangs gefunden; Selbstkalibrierung im Lauf.
- **F-1005 Maskierung** (`scripts/leitstand/geheimnisse-maskieren.mjs`, rein): URL Benutzer:Passwort@ (auch leerer Benutzer, `@` im Passwort), Authorization (Schema bleibt), Bearer, `curl -u`, `--password/--passwd/--token/--secret/--api-key` (auch mit Vorsilbe und mit einem Strich wie PowerShell `-Password`), Zuweisungen/Parameter auf …token, passwd, password, secret, api_key/apikey, access_key, private_key (`=` oder `:`, auch mit escapten Anführungszeichen), Präfixe `sk-`, `sk_live_/sk_test_/rk_…`, `ghp_/gho_/ghu_/ghs_/ghr_`, `github_pat_`, `glpat-`, `xox[abpr]-`, `AKIA/ASIA`, `AIza`; Platzhalter „••••“, Schlüsselname/Flag/Präfix sichtbar; Einstellungsdatei: jeder Wert in jedem env-Block (textuell, Formatierung bleibt, auch gekürzt). Alle variablen Wiederholungen vor einem Anker begrenzt (64-KB-Texte ohne Treffer < 500 ms, Test). Angewendet: `lauf-aktivitaet.mjs` (`zielFuerAnzeige`: Präfix von 1 200 Zeichen maskieren, dann kürzen — Ringpuffer, berührte Dateien, „Gerade“ in `leitstand-server.mjs`, einmal je Aufruf), `routen-harness.mjs` (`textFuerAnzeige`: `.claude/settings(.local).json` mit env-Block, jede Harness-Datei nach Mustern), `leitstand-server.mjs` (`leseAbgelehnteBefehleAusRohstrom`: abgelehnte Befehle im F-760-Halt-Grund — QA-Pass; Anfang und Schluss des Grunds, die `ermittleSichtungsHalt` vergleicht, bleiben unberührt).
- **F-1003:** `docs/design/abgleich-f46.md` Bedienfluss „Zuschauen“ und §4.9 (Hauptaufgabe, Tabelle) → „Abbrechen (Einzellauf ohne Begründung; Stopp eines Ablaufs mit Pflichtbegründung)“; keine Codeänderung.
- **Tests:** `src/git-starter/git-starter.test.ts` (Rotfälle Attrappe in der Repo-Wurzel — Kalibrierung: bloßes `git` trifft sie unter Windows — und in `node_modules/.bin`; kein git; GIT_DIR), `scripts/check-git-starter.test.mjs`, `scripts/leitstand/geheimnisse-maskieren.test.mjs` (Rot/Grün je Muster, Laufzeit), `scripts/leitstand-abgelehnte-befehle.test.mjs`, Ergänzungen in `lauf-aktivitaet.test.mjs` und `routen-harness.test.mjs`.
- **Nachweis** `features/F45/nachweise/s/` (`erzeuge-nachweis.mjs`; Antworten mit den echten Serverfunktionen erzeugt): `live-maskiert/` (Aktivität, „Gerade“, „Mehr dazu“ mit maskierten Befehlen, `npm run check` und Pfade unverändert), `harness-settings-maskiert/` (env-Werte und `token` maskiert, `apiKeyHelper`/`permissions` unverändert; CLAUDE.md mit maskiertem GITHUB_TOKEN). Leitstand dafür auf Port 4199, danach beendet.

**Ausnahmen (bloßes 'git' bleibt, außerhalb des Gate-Umfangs):** Tests (`*.test.ts`, `*.test.mjs`), Gates `scripts/check-*.mjs` (Wegwerf-Repos), `scripts/spike-f36-s7.mjs`, `scripts/spike-f36-werkzeugsatz.mjs`, `scripts/spike-f36-ws2s.mjs`, `scripts/verify-f16-codex-rotfall.mjs`, `scripts/messe-chat.mjs` — keins läuft im Leitstand- oder Kernprozess gegen ein Projekt-Repo.

**Grenzen:**
- Die Windows-Suche im cwd entfällt, wenn `NoDefaultCurrentDirectoryInExePath` gesetzt ist — in Claude-Code-Shells ist sie gesetzt und verdeckt die Lücke; der Rotfall-Test nimmt die Variable heraus. Ein Leitstand aus einem gewöhnlichen Terminal hat sie nicht.
- Git-Starter: ein absoluter PATH-Eintrag, den ein Lauf beschreiben kann und der kein `node_modules`-Segment trägt (z. B. die Repo-Wurzel selbst im PATH), bliebe eine Lücke. Gate: zusammengesetzte Programmnamen fallen nicht auf (geprüft, nicht ERZWUNGEN).
- `taskkill` startet der Gateway per bloßem Namen im cwd des Leitstands (F-1021, außerhalb von S). Git-Aufrufe außer der Code-Leseroute laufen ohne `-c core.fsmonitor=false` (F-1023, schon vor S).
- Maskierung nach Mustern (geprüft, nicht ERZWUNGEN): ein Geheimnis ohne erkennbares Muster bleibt sichtbar (außerhalb des env-Blocks); Code-Reiter, Projektakte, Prüfbefehl und Prüfausgabe bleiben unmaskiert (F-1022). Bewusst eher zu viel: Code in Hooks und Prüfskripten im Harness-Detail (z. B. `token = …`) erscheint maskiert. Laufakte und Rohstrom auf der Platte bleiben unverändert.
- Der F-760-Halt-Grund wird seit S maskiert gespeichert (Kontrollzustand des Ablaufs) — Textänderung, keine Änderung an Ablauf-Logik; vom Challenger gegen „NICHT: Workflows“ zu bestätigen.

**Prüfpass** (frischer Kontext, eine Korrekturrunde): code-reviewer und qa zunächst „nicht freigegeben“ — Gate blind hinter `/*` in Texten (cr 1), quadratische Laufzeit möglich (cr 2), Selbstbetrieb über `node_modules/.bin` (qa 2), F-760-Halt-Grund unmaskiert (qa 1), escaptes JSON (qa 3), Render-Nachweis fehlte. Alles korrigiert bzw. als F-1021/F-1022 festgehalten. Nachpass: code-reviewer und qa „freigegeben mit Hinweisen“ (F-760-Maskierung verletzt nach code-reviewer die Grenze „Workflows“ nicht: nur Text, Erkennung über Anfang/Schluss unberührt). Hinweise eingearbeitet: Ziel über 1 200 Zeichen endet immer auf „…“, das angeschnittene letzte Wort fällt weg; ein Anführungszeichen vor Leerraum beginnt keinen Wert (`grep -n "token:" datei` bleibt unverändert); `-u C:\…` kein curl-Benutzer; Scanner-Grenze im Gate-Kopf. Neu: F-1023 (fsmonitor).

## Stand B1a-1
Branch `feat/f45-b1a1-arbeitsordner` (Basis `387f1a3` = `origin/main`, #318), nicht committet. Bau 11.10.2026.
Plan `features/F45/plan-b1a1.md` (v1 → Advisor-Pass „tragfähig mit Änderungen“ → v2 → Nachpass auf d/e „tragfähig mit
Änderungen“ → v3, Nachtrag Bau).

**Ist:** ≈ 1 AT (Schätzung 0,75–1 AT), davon ≈ 0,5 h echte Läufe; ein zusätzlicher Versuch durch die Windows-Pfadgrenze
(F-1025).

**Gebaut:**
- **Kern** `src/arbeitsordner/`: Pfad/Branch (`<Projektordner>-laeufe/<Kurzname>`, `wf/<Ablauf-ID>`, Whitelist der ID),
  Bedarf (mindestens ein schreibender Schritt) und Bestand (schreibender Schritt lief ohne Artefakt), Vorbereitung
  idempotent über den Git-Starter (Repo-Wurzel, Commit, Pfadlängen, `worktree add --quiet`, Wiederaufnahme nur bei
  sauberem, nicht gesperrtem Worktree auf Basis, Sauberkeit vor `npm ci --ignore-scripts`, E-183-Vorprüfung),
  Entfernen (`worktree remove`, `--force` nur mit „verwerfen“, `branch -d` nie `-D`), Löschliste
  (`loeschliste.ts`), Vorbedingung im Worktree (Branch exakt). Git-Starter um `fuehreGitAsync` erweitert.
- **Kern-Artefakt** `arbeitsordner-<workflowId>` (append-only, `schemas/kontrollzustand-arbeitsordner-payload.schema.json`);
  WORKFLOW_V0 unverändert. Änderungsübersicht additiv um `loeschliste`. Neues Schema
  `schemas/ergebnis-ausfuehrung-loeschliste.schema.json` (Block `zu_loeschen` im Ergebnistext).
- **Server** (`scripts/leitstand-server.mjs`): Laufort je Schritt (`ermittleLaufort`) für Eingaben, Vorbedingung,
  Regeln 1c/1h/1j, Ort-B; skalarer Parameter `laufort` an `starteLaufUndVergiss` (cwd + settingsPfad, Löschliste vor
  der Änderungsübersicht, Prüfschritt); „Prüfung wiederholen“ im Laufort; Vorprüfung in Start und Freigabe (202
  `vorbereitung`, nichts am Workflow geschrieben; D13 und Quelltextverträge unverändert); Tiefenverteidigung in
  `starteWorkflowSchritt`; Projektion `arbeitsordner` im Detail; Routen Aufräumen und Liste
  (`scripts/leitstand/routen-arbeitsordner.mjs`). Option `arbeitsordner` an im realen Server (CLI-Bindeblock,
  `baueProjektHandlerMap`), aus für Gate-Instanzen; Start-Log „Arbeitsordner je Ablauf: an“.
- **E-183/E-188:** E-183 misst im Lauf die `.claude/settings.json` und Hooks des Worktrees (`settingsPfad` je Lauf),
  E-188 `arbeitsverzeichnis_pfad` bleibt `process.cwd()`; keine Zeile in invocation-policy geändert.
- **ARCHITECTURE.md §2:** eng gefasste Ausnahme für den Arbeitsordner.
- **Oberfläche:** Karte „Wo gearbeitet wird“ auf der Freigabe-Seite (Branch, Arbeitsordner, Basis-Commit, offene
  Änderungen des Projektordners — blockieren nicht; Zustände nicht angelegt, wird vorbereitet, bereit, fehlgeschlagen,
  aufgeräumt, Bestand), Zeile „Eigener Arbeitsordner“ in „Auftrag anlegen“ (Warnung angepasst), Lage und Knopf
  „Arbeitsordner aufräumen“ im Detail mit Dialog (Pflichtbegründung, „verwerfen“), Liste auf der Seite Code; 202
  `vorbereitung` → einmaliges Nachsenden bei gleicher Fassung. Texte in de/en/ru/tr.
- **Tests** (53, einer übersprungen: Datei-Symlink braucht unter Windows Rechte): `src/arbeitsordner/arbeitsordner.test.ts`
  (E-183 Grün/Rot gegen Worktree-Settings, Junction nach außen und auf `.claude/`, `.git` als Segment, Wiederaufnahme
  mit stehengebliebenem Branch, Aufräumen gemergt/nicht gemergt/verwerfen/gesperrt/Ordner fehlt),
  `scripts/leitstand-arbeitsordner.test.mjs` (volle Kette im Worktree mit Invariante, Aufräumen erst nach der Abnahme,
  Freigabeweg, fehlgeschlagene Vorbereitung, Bestand und Bestand nach ANPASSUNG, Ordner von Hand gelöscht, veraltetes
  IN_VORBEREITUNG, zweiter Start während der Vorbereitung, keine Löschung bei VERWEIGERT, Regel 1j, Prüfung wiederholen,
  Einschalten im realen Server), `public/leitstand/views/arbeitsordner-anzeige.test.mjs`,
  `scripts/leitstand/routen-arbeitsordner.test.mjs`.

**Ergebnis realer Nachweis** (`features/F45/nachweise/b1a1/nachweis.md`): Ablauf b1a1-nachweis-325d2a8f gegen
ai-workforce; Arbeitsordner `C:\Users\stefa\Projekte\ai-workforce-laeufe\2b0ee56dff`, Branch
`wf/b1a1-nachweis-325d2a8f`, Basis `387f1a3`; **worktree add 14,7 s, npm ci 38,5 s, E-183 0,3 s** (bereit nach 55 s);
Bau, Prüfschritt (GRÜN) und Codex-Review im Worktree; Korrekturlauf im selben Worktree; Löschung ausgeführt
(`runs-dialog.test.mjs`); Projektordner: Statusliste, Branch und HEAD in beiden Runden gleich, ohne Eingriff von mir
im Korrekturlauf vollständig unverändert (Vergleich über porcelain und `--stat`, nicht über Inhalts-Hashes); Aufräumen
ohne Verwerfen 409, mit Verwerfen 200, Branch gelöscht (vor der Korrekturrunde, damals noch ohne Abnahme-Sperre).

**Grenzen:**
- Invariante geprüft, nicht ERZWUNGEN (F-1027): Schreibzugriff von Claude Code aus dem Worktree nach außen nicht als
  Rot-Fall belegt; `.git` geteilt; Einzelläufe und Chat bleiben im Projektordner.
- Ausführung kann vorzeitig „erfolgreich“ enden, wenn sie einen Prüfbefehl in den Hintergrund schiebt (F-1026, im
  Nachweis aufgetreten, vom Review gefangen).
- Windows-Pfadgrenze: Kurzname und Vorprüfung; sehr lange Projektpfade halten mit Grund an (F-1025).
- `npm ci --ignore-scripts`: Fremdprojekte mit nötigem postinstall fallen erst im Prüfschritt auf; ohne
  `package-lock.json` kein `npm ci`.
- Anzeige-Restpunkte F-1028 (leerer `-laeufe`-Ordner bleibt, Fassungsprüfung beim Nachsenden nur in der Oberfläche,
  Zustände außer „fehlgeschlagen“ nur über Text, Optionstext „startet sofort“, Pfade brechen in schmalen Spalten mitten im
  Wort).
- Im Korrekturlauf zeigen Änderungsübersicht, Regel 1j und Rückfrage-Heuristik alle Änderungen seit der Basis, nicht nur
  die des Korrekturlaufs (HEAD bleibt die Basis; F-1028 e).
- Bis „Bereit zum Sichern“ (B2b) liegt das Ergebnis nur im Arbeitsordner auf `wf/<Ablauf-ID>`; Stefan sichert dort.
  Aufräumen ist erst nach der Abnahme (oder bei GESTOPPT/fehlgeschlagener Vorbereitung) möglich.
- E-F45-5 = A (Stefan, 11.10.2026).

**Prüfpass** (frischer Kontext, eine Korrekturrunde): code-reviewer „freigegeben mit Hinweisen“, qa und design-guardian
„nicht freigegeben“. Korrigiert: Bestand auch nach ANPASSUNG (Abnahme-Artefakt, Versionsgeschichte), Aufräumen erst nach
entschiedener Abnahme (Server und Oberfläche), gesperrter Worktree (unlock nur mit „verwerfen“), Ordner von Hand gelöscht
(prune), ein wirksamer Status für Projektion, Liste und Aufräumen, Laufort für Regel 1c in Detail und Entscheidung, ungültige
ID ohne Artefakt (409), Löschen über den realpath, `.git` als jedes Segment, offene Änderungen sprachunabhängig, Pfadvergleich
über realpath, Puffer für `ls-tree`, npm-Fehlgrund mit letzter Zeile, kein `worktree prune` im Normalfall, Validator
strenger, Herkunftsprüfung für die Liste, Löschergebnis im Fehlereintrag; Oberfläche: keine zweite Live-Region, Karte auch
auf der Abnahme-Seite (Sichern-Hinweis, Löschliste mit abgelehnten Gründen, Knopf erst nach der Abnahme), nächster Schritt
bei fehlgeschlagener Vorbereitung, danger-Knopf im Dialog, Musterpfad bricht um, „Projektordner“ statt „Arbeitsordner“ in
„Auftrag anlegen“, Texte zum Nachsenden ehrlich; Render-Nachweis neu (15 Folgen inkl. 200 %, Bestand, aufgeräumt,
Dialog 390 px). Rest F-1028.

## Stand B1a-2
Branch `feat/f45-b1a2-skelett` (Basis `fde3b06` = main mit #319), nicht committet. Bau 11.10.2026.
Plan `features/F45/plan-b1a2.md` (v1 → Advisor-Pass „tragfähig mit Änderungen“, P1–P4 → v2).

**Gebaut:**
- **Vorlage nachgezogen** (Template-Commit `9189959`, unverändert `template/main`): Hook-Gruppe (Template-settings.json
  und fünf `.js`-Hooks), `.claude/commands/lessons.md`, `docs/examples/design-guardian.example.md` (Template-Fassung,
  nur Beispiel), `.github/workflows/ci.yml` (Check + Secret-Scan), `.worktreeinclude`, `.claudeignore`, `SETUP.md`
  (behebt die toten Verweise, F-1029). scout weggelassen (im Template nicht vorhanden; ai-workforces scout ist F27-spezifisch).
  **Hook-Gruppe ganz oder gar nicht** (`planeSkelettKopie`, genutzt von `kopiereSkelett` und Nachrüsten): neue Projekte
  bekommen settings.json/Hooks weiter aus `kopiereBaseline`, die Template-Gruppe wird dort übersprungen (E-183 unverändert,
  keine toten Hook-Kopien). Beleg je Hook im `-p`-Lauf: `scripts/skelett-hooks.test.mjs`.
  HERKUNFT.md mit SHA-256 und Herkunft je Datei; neues Gate `scripts/check-skelett-herkunft.mjs` (F-700).
- **Mindest-Gates Node/TS:** Skelett-`scripts/check-gates.mjs` (Platzhalter, `npm audit` mit Lock-Datei, gitleaks
  lokal/Docker/Hinweis, Hook-Probelauf) als erster Schritt von `check`; `scripts/tests-mit-untergrenze.mjs`;
  `docs/harness/gate-vorlage-node.md`; Hinweis in Skelett-CLAUDE.md/ARCHITECTURE.md. ai-workforce: `scripts/check-secrets.mjs`
  in `check` (F-1024), dieselbe Prüfung importiert.
- **check:template** von ai-workforce = check-docs, check-rules, check-contract (F-701).
- **Startvorlage aus dem Register** (F-1009): `scripts/leitstand/startvorlage-wahl.mjs`; Umgebungsvariable vor Register
  vor Standard; kaputter Registereintrag bricht sichtbar ab; Startzeile mit Herkunft. Keine UI-Änderung (Pfad steht
  schon in „Womit gearbeitet wird“ und in der Capability Library). Abweichung von Plan v2: das API-Feld `startvorlage.herkunft` ist
  weggelassen (kein Verbraucher).
- **Nachrüsten** `npm run projekt:nachruesten -- <Projektpfad> [--anwenden]` (`src/projekt-anlegen/nachruesten.ts`):
  Probelauf, nur Fehlendes, nie überschreiben, package.json/.gitignore nie, Pfadprüfung (Basis, Junction, verknüpfter
  Worktree, `*-laeufe`), Hook-Gruppe nicht bei `"type": "module"`, Kopierfehler je Datei im Bericht, Pflichtzeile
  Startfreigabe.

**Nachweise** `features/F45/nachweise/b1a2/nachweis.md`: neues Projekt (56 Dateien, `check` rot mit Platzhalter-Meldung,
`check:template` grün, Mini-Beispiel nach Gate-Vorlage grün), Secret-Scan nur als Hinweis (gitleaks/Docker lokal nicht
vorhanden, echter Rotfall als Test für die CI), Nachrüsten gegen `387f1a3` (15 kopiert, keine vorhandene Datei verändert),
Leitstand ohne Umgebungsvariable lädt `startvorlagen/ai-workforce.json`.

**Grenzen:**
- Lokal bei Stefan läuft kein echter Secret-Scan (weder gitleaks noch Docker) — nur Hinweis; Funde zeigt erst die CI.
- Die Mindest-Gates wirken im Workforce-Prüfschritt neuer Projekte erst nach Anwenden der Vorlage und Umstellen des
  `pruefbefehl` auf `check`; der Architekt wendet die Vorlage nicht automatisch an (F-939 teilweise).
- Template-Hooks sind CommonJS; unter `"type": "module"` stürzen sie ab (check-gates (d) meldet das, Nachrüsten überspringt
  die Gruppe). Vorbestehend: zwischenstand-Hooks (Template und Baseline) starten bloßes `git`.
- Der Hook-Probelauf (d) prüft, dass ein Hook lädt und auf harmlose Eingabe nicht abstürzt — nicht, dass er bremst.
- Nachrüsten: ein eigenständiger Klon von ai-workforce neben der Installation wird nicht erkannt (nur Worktrees);
  `--anwenden` lief nicht über die echte CLI (die Basis ist fest der Elternordner der Installation), sondern über
  dieselben Funktionen; scheitert beim Anwenden eine Kopie innerhalb der Hook-Gruppe, meldet der Bericht das ausdrücklich
  (Gruppe unvollständig, Startfreigabe erst nach Ergänzen).
- `scripts/check-f11-auftrag.mjs` bleibt wegen der Invariante „check-f11 unverändert“ unangetastet; sein Kopfkommentar
  nennt noch `npm run check:template` (veraltet, nur Kommentar).
- In der CI scannt gitleaks jetzt zweimal (in `npm run check` über `check-secrets.mjs` und im eigenen CI-Schritt) —
  bewusst so gelassen; der CI-Schritt kann später entfallen.

**Prüfpass** (frischer Kontext, eine Korrekturrunde): architecture-advisor „tragfähig mit Änderungen“ (P1–P4 in Plan v2).
code-reviewer und qa zunächst „nicht freigegeben“ — Nachrüsten legte eine fehlende package.json an (beide), Programmsuche
host-abhängig (Linux-CI rot), Kopierfehler mittendrin, verwaiste Links, kaputter Registereintrag ungetestet, gitleaks/Docker
mit falscher Ursache u. a. Alles korrigiert (Plan, „Nachtrag Bau und Korrekturrunde“). Nachpass: code-reviewer und qa
„freigegeben mit Hinweisen“; Hinweise eingearbeitet bzw. oben als Grenze genannt. design-guardian nicht nötig (keine UI-Änderung).

## Stand B1b-1
Branch `feat/f45-b1b1-harness-lauf` (Basis `cf433fd` = main mit #320), nicht committet. Bau 11.10.2026.
Plan `features/F45/plan-b1b1.md` (v1 → Advisor-Pass „tragfähig mit Änderungen“, A1–A5/H1–H7 → v2).
**Zuschnitt B1b:** B1b-1 (dieser Stand) und B1b-2 (Harness-Abgleich-Tabelle, Kurzliste an die Abnahme, UI). Verschoben:
F-815/F-816 → F, F-929 → B2a, F-933 → Teil 2 (Zeile „L“ in `docs/projekt/fixpaket-f45.md`).

**Gebaut:**
- **Hintergrund (F-1026):** jeder Claude-Code-Lauf mit `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1` (`WORKFORCE_LAUF_UMGEBUNG`,
  nicht abwählbar). Netz: `ermittleHintergrundAufrufe` zählt angenommene Hintergrund-Aufrufe — `tool_use_result.backgroundTaskId`
  (die reale F-1026-Form: automatisch verschoben ohne `run_in_background`) oder `run_in_background` ohne Fehler; neues optionales
  Laufakten-Feld `beobachtung.hintergrund_aufrufe` (Schema, Typ, Validator). Der Result Evaluator rechnet aus dem Rohstrom nach:
  FEHLGESCHLAGEN/`hintergrund_ausfuehrung` vor VERWEIGERT/ERFOLGREICH (ARCHITECTURE §4; ein gleichzeitiger Umgehungsverdacht
  steht in `daten`); der Server hält den Workflow mit klarem Grund an (KLAERUNG_ERFORDERLICH; Text nennt Version/Rohstrom
  prüfen und Reparaturfassung). Text des Grund-Codes in vier Sprachen
  (Pflicht des bestehenden Tests „jeder Klassifikationscode ist bekannt“; keine sichtbare UI-Änderung).
- **Lauf-Härtung (F-1027):** `npm_config_ignore_scripts=true` in jedem Claude-Code-Lauf (real belegt: `prepare` lief mit der
  Variable nicht, ohne sie schon); Zusammenführen der Umgebung entfernt unter Windows gleichnamige Schlüssel anderer Schreibweise. **Realer Rot-Fall belegt und behoben (F-1040):** ein nacktes
  `Write`/`Edit` in `--allowedTools` erlaubte jeden Pfad — Write legte im `-p`-Lauf Dateien im Eltern- und im Projektordner
  an. `baueAufruf` begrenzt Write/Edit jetzt auf `Edit(./**)`; danach beide verweigert, Write im Worktree geht.
- **Hooks (F-932, PreToolUse):** realer `-p`-Lauf mit `--setting-sources project` und Skelett-Hooks: guard-settings verweigert
  ein Edit auf `.claude/settings.json` (Grund im tool_result, Datei byte-gleich).
- **commit-guard (F-1035, F-1037), nur Root-Hook von ai-workforce:** Aufgabe 5 (`.claude` als Kopier-/Verschiebe-/Lösch-/
  Schreibziel, Quelle oder Ziel, Platzhalter, ./-Varianten, Pipeline, Wechsel in `.claude`, Inline-Code) und Aufgabe 6
  (rm -rf in allen Schreibweisen, Remove-Item -Recurse -Force, rd /s /q, git branch -D, git reset --hard, git clean -f,
  git checkout ., git restore ., git stash drop/clear, git worktree remove --force, git update-ref -d). Skelett-Hooks unverändert
  (F-1038 für das Template-Repo). **Der E-183-Hash von ai-workforce ändert sich — Startfreigabe neu erteilen.**
- **Review (F-937, Teil Review):** der code-reviewer-Schritt (Claude und Codex) bekommt `baueBeobachtungsBlock` — geladen gegen
  aufgerufen (Skills, Subagenten, MCP-Server), Hintergrund-Aufrufe; ohne Beobachtung der Satz „keine Beobachtung“.
  Ausführungslauf über `findeAusfuehrungsSchritt`.
- **Vorstart-Scan (F-818):** Ausnahme genau `vorlagen/projekt-skelett/.claude`, nur wenn der Projektordner die Installation
  ist (realpath, Windows ohne Groß/Klein); die Skelett-Skill-/Command-Namen werden dann wie Projekt-Skills gesperrt.

**Nachweise** `features/F45/nachweise/b1b1/nachweis.md`: acht reale Läufe (Haiku, Wegwerf-Ordner; Lauf 1 = Rot-Fall vor dem
Fix), Beleg 1b (Doku + CLI-Binary + Kontrolllauf), Laufkosten (≈ 132 s Wanduhr, 5 331 Output-Token), Testnamen. Rohströme
bleiben nach ARCHITECTURE §4 lokal (gitignoriert, SHA-256 in der Nachweis-Datei); committet werden die Zählungen.

**Grenzen:**
- `Bash(npm run check:*)` erlaubt kein `npm run check:<name>` (CLI-Semantik `:*` ≡ ` *`), die Instruktion verspricht es (F-1041, B2b).
- Das PowerShell-Werkzeug läuft am Bash-Matcher von commit-guard vorbei (F-1042, settings.json = Stefan).
- Schreiben über npm-Skripte begrenzt die Pfadregel nicht; `.git` bleibt im Worktree geteilt; Fremdprojekte mit `pre`/`post`-
  Skripten sehen im Lauf ein anderes `npm run` als im Prüfschritt (F-1027 offen).
- Der Review-Block vergleicht geladen mit aufgerufen; „vorgesehen“ kommt mit dem Arbeitspaket (B2a).
- commit-guard sperrt bewusst streng: auch Lesen aus `.claude` mit einem schreibenden Verb. Commit-/PR-Texte und
  Heredoc-Körper ohne Shell zählen nicht als Befehl. Nicht erkannt: Kopien eines ganzen Ordnerinhalts (`cp -r ../tpl/. ./`).
- Ohne Hintergrund wird ein Befehl über der Bash-Zeitgrenze beendet (Exit 143); ein langer `npm run check` im Lauf
  braucht deshalb eine ausreichende `timeout`-Angabe (real nicht mit langer Kette geprüft). Hintergrund über die Shell
  selbst (`&`, `nohup`) zählt die Regel nicht.

**Prüfpass** (frischer Kontext, eine Korrekturrunde): architecture-advisor „tragfähig mit Änderungen“ (A1–A5/H1–H7 → Plan v2;
A1 real belegt: der F-1026-Fall war automatisches Verschieben). code-reviewer und qa „freigegeben mit Hinweisen“; in der
Korrekturrunde umgesetzt: Rohströme lokal statt committet, A3 zurück auf ARCHITECTURE §4 (Verdacht in `daten`), commit-guard
ohne Fehlsperren bei Commit-/PR-Texten, Suchmustern und `-ErrorAction` (Befehlsstellen statt jedes Token), `tar`, realer
npm-Beleg, Halt-Text handlungsfähig, mehrere tool_results fail-closed, eigener Satz bei fehlender Laufakte, Kommentare.
Gate-Änderungen: `check-f35-ws2` (e) prüft den Review-Text vor dem neuen Beobachtungs-Block; `check-fixpaket-f35-reallauf`
(e) erwartet `Edit(./**)` statt nacktem `Write`.

**Nachtrag (11.10.2026):**
- **Bash-Zeitgrenze:** `BASH_DEFAULT_TIMEOUT_MS`/`BASH_MAX_TIMEOUT_MS` im installierten CLI belegt (Standard 120000,
  Höchstwert ohne Variable 600000, per Variable anhebbar). Neues optionales Startvorlagen-Feld `bashZeitgrenzeMs`
  (Standard 600000, nicht über `zeitgrenzeMs`); das Gateway setzt beide Variablen = min(Feld, Lauf-Zeitgrenze).
  Messung `npm run check`: `features/F45/nachweise/b1b1/nachweis.md`.
- **PowerShell-Werkzeug (F-1042):** Eingabeform real belegt (`tool_name` "PowerShell", `tool_input` { command,
  description }); commit-guard verweigerte im echten Lauf `Remove-Item -Recurse -Force`; Rot-/Grün-Tests mit dieser Form.
  Wirksam erst mit Matcher `Bash|PowerShell` in `.claude/settings.json` (Stefan).
- **Startfreigabe:** `werkzeugVersionDeklariert` in `startvorlagen/ai-workforce.json` auf die installierte 2.1.296 gezogen;
  neue Baseline/Nachweis, Commit im Autorisierungs-Repo und `state/aktuelle-autorisierung.json` erzeugt Stefan (E3). Kein Nachpass nötig (beide hatten
freigegeben). design-guardian nicht nötig (keine UI-Änderung).
