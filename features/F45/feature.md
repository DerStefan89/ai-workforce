# F45 — Fixpaket Arbeitsfähigkeit

## ID
F45

## Titel
Fixpaket Arbeitsfähigkeit

## Status
Status: IN_ARBEIT

B0 gemergt #316 (`9bdfc1a`; Abschnitt „Stand B0“). P gebaut (Branch `feat/f45-p-performance`, Basis `9bdfc1a`, nicht committet; Abschnitt „Stand P“). Status bleibt IN_ARBEIT bis zur Abnahme durch Stefan.

Gültige Status-Werte (geprüft vom Gate): ENTWURF, READY_FOR_TECH, WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN, BLOCKIERT, ABGEBROCHEN.

## Ziel
Nach dem Fixpaket arbeitet die Workforce so, wie Stefan heute mit Challenger-Chat und Claude Code in VS Code auf Grundlage des Harness arbeitet (E-M5-19): Challenge und Plan → Arbeitspaket → Bau mit Harness (CLAUDE.md, Hooks, Agents, Skills, MCPs) → Prüferpass, Render-Nachweis, `npm run check` → Rückfrage bei Bedarf → Abnahme → fertige Git-Befehle für Stefan. Der Chat funktioniert gut, die Performance stimmt, Stefan installiert, aktiviert und sieht Fähigkeiten (MCPs, Skills, Agents, Plugins) im Leitstand, die Roadmap stimmt, und F30 (Opportunity Scanner) kann direkt mit der Workforce selbst entwickelt werden.

## Grundlage
`docs/projekt/fixpaket-f45.md` — Ziel, Abnahmekriterien (K1–K5, P1–P5, R1–R7, Bestehensbedingung mit Belegen 1–14), Workstreams, offene Entscheidungen. Alle Bauaufträge F45 arbeiten gegen diese Datei.

## Entscheidungen
- **E-F45-1 = A** (Stefan, 01.10.2026) — Eine Feature-Akte wird direkt im Leitstand bearbeitet; Wortlaut in `docs/projekt/zielfassung.md` §13.6.
- **E-F45-2** (offen, fällig nach R) — Teil 2 vor F30 über Challenger-Bauaufträge (A) oder als erste Aufträge der Workforce an sich selbst (B). Empfehlung Challenger: B. Grundlage Abschnitt 5.
- **E-F45-3** (offen, fällig vor B1a) — Lauf-Umgebung: eigener Worktree je Lauf oder nur eigener Branch; darf der Lauf im eigenen Worktree löschen (F-715). Grundlage Abschnitt 5.
- **E-F45-4** (offen, aus WS P, F-1018) — Energiemodus „Ausgeglichen“ (A) oder der Leitstand nimmt sich selbst aus der Drosselung (B). Grundlage Abschnitt 5.
- **F-1015-Kriterium** (Challenger, 11.10.2026) — Seitenspeicher, JS-Heap, DOM-Knoten und Listener am Ende ≤ 1,2 × Wert nach 15 min (Aufwärmphase ausgenommen); Grundlage Abschnitt 2.

## Scope

| WS | Inhalt | Findings | Abhängig von | Prüfmodus | Schätzung AT | Ist |
|---|---|---|---|---|---|---|
| B0 | Chat zuverlässig und schnell: Messskript, eigene Chat-Zeitgrenze, Chat-Worker fest, Fehler-Eintrag bei jedem Misserfolg, Neuladen verfolgt Lauf, Start-Hinweis bei falschem Ordner (E-188 bleibt streng), Event-Loop-Messung, Chat-Reiter; Akte F45 | F-987, F-986 a, F-971, F-544, F-1007, F-1008 | – | vor Merge | 0,75 | ≈ 1 AT, gemergt #316 (9bdfc1a) |
| P | Performance: /api/zustand im Langlauf, Event-Loop-Blockaden beseitigen, Seitenwechsel messen, f16-Restordner | F-556, F-999 | B0 (Messskript) | vor Merge | 0,5 | ≈ 1,25 AT + ≈ 6 h Messung (Bau, nicht gemergt) |
| S | Härtung klein: ein Git-Starter für alle Aufrufe, Geheimnis-Maskierung (Live-Aktivität, env im Harness-Detail), Abbruch-Formulierung | F-1000, F-1005, F-1003 | – | vor Merge | 0,3 | |
| B1a | Lauf-Umgebung: Branch/Worktree je Lauf (Gültigkeitsschlüssel misst die Einstellungen des Lauf-Ordners), Vorlage nachziehen (513), Mindest-Gates im Skelett, check:template, Standard-Startvorlage aus dem Register, Löschen im Lauf, Kontrollzustand in Fremdprojekten | F-954, F-939, F-701, F-1009, F-715, F-766 | E-F45-3 | Advisor-Pass, vor Merge | 1–1,25 | |
| B1b | Harness im Lauf: Projekt-Agents/-Skills im Lauf, Freigabe nach Inhalt, Vorstart-Scan, Codex-Harness-Regeln, Hooks belegen, „vorgesehen gegen benutzt“ an Review und Abnahme, /lessons, Harness-Abgleich-Tabelle (Beleg 12) in Laufakte und auf der Seite Workforce | F-815, F-816, F-818, F-929, F-932, F-937, F-933 | B1a | vor Merge | 0,75 | |
| F | Fähigkeiten verwalten: MCPs, Skills, Agents und Plugins im Leitstand installieren (auch aus den OFFEN-Einträgen), je Projekt aktivieren/deaktivieren (wirkt ab dem nächsten Lauf, gespeichert im Workforce-Register, nicht in settings.json — E-F46-2), Agents installierbar und im Lauf nutzbar, Plugins im Fähigkeitenmodell; sichtbar: installiert · aktiv · im letzten Lauf benutzt (Seite Workforce, Lauf-Detail); MCP-Grenzen nach E-F36-4 (Einzelfreigabe, Kosten sichtbar, nur lesend) | F-815 (Agents), F-910, F-859, F-1012 | B1b | Advisor-Pass, vor Merge | 1,25–1,5 | |
| B2a | Arbeitspaket als Daten (einziges Übergabeformat, Server rendert den Prompt, Gate prüft Pflichtfelder) und Projektkarte an alle planenden/prüfenden Rollen; DoD und Checkliste an Review/qa; Feature ↔ Ablauf | F-938, F-936, F-829, F-931, F-989, F-998, F-959 | B1b | vor Merge | 1 | |
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
