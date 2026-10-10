# F45 — Fixpaket Arbeitsfähigkeit

## ID
F45

## Titel
Fixpaket Arbeitsfähigkeit

## Status
Status: IN_ARBEIT

B0 gebaut (Branch `feat/f45-b0-chat`, Basis `d10f9be`, nicht committet; Abschnitt „Stand B0“). Status bleibt IN_ARBEIT bis zur Abnahme durch Stefan.

Gültige Status-Werte (geprüft vom Gate): ENTWURF, READY_FOR_TECH, WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN, BLOCKIERT, ABGEBROCHEN.

## Ziel
Nach dem Fixpaket arbeitet die Workforce so, wie Stefan heute mit Challenger-Chat und Claude Code in VS Code auf Grundlage des Harness arbeitet (E-M5-19): Challenge und Plan → Arbeitspaket → Bau mit Harness (CLAUDE.md, Hooks, Agents, Skills, MCPs) → Prüferpass, Render-Nachweis, `npm run check` → Rückfrage bei Bedarf → Abnahme → fertige Git-Befehle für Stefan. Der Chat funktioniert gut, die Performance stimmt, Stefan installiert, aktiviert und sieht Fähigkeiten (MCPs, Skills, Agents, Plugins) im Leitstand, die Roadmap stimmt, und F30 (Opportunity Scanner) kann direkt mit der Workforce selbst entwickelt werden.

## Grundlage
`docs/projekt/fixpaket-f45.md` — Ziel, Abnahmekriterien (K1–K5, P1–P5, R1–R7, Bestehensbedingung mit Belegen 1–14), Workstreams, offene Entscheidungen. Alle Bauaufträge F45 arbeiten gegen diese Datei.

## Entscheidungen
- **E-F45-1 = A** (Stefan, 01.10.2026) — Eine Feature-Akte wird direkt im Leitstand bearbeitet; Wortlaut in `docs/projekt/zielfassung.md` §13.6.
- **E-F45-2** (offen, fällig nach R) — Teil 2 vor F30 über Challenger-Bauaufträge (A) oder als erste Aufträge der Workforce an sich selbst (B). Empfehlung Challenger: B. Grundlage Abschnitt 5.
- **E-F45-3** (offen, fällig vor B1a) — Lauf-Umgebung: eigener Worktree je Lauf oder nur eigener Branch; darf der Lauf im eigenen Worktree löschen (F-715). Grundlage Abschnitt 5.

## Scope

| WS | Inhalt | Findings | Abhängig von | Prüfmodus | Schätzung AT | Ist |
|---|---|---|---|---|---|---|
| B0 | Chat zuverlässig und schnell: Messskript, eigene Chat-Zeitgrenze, Chat-Worker fest, Fehler-Eintrag bei jedem Misserfolg, Neuladen verfolgt Lauf, Start-Hinweis bei falschem Ordner (E-188 bleibt streng), Event-Loop-Messung, Chat-Reiter; Akte F45 | F-987, F-986 a, F-971, F-544, F-1007, F-1008 | – | vor Merge | 0,75 | ≈ 1 AT inkl. Messläufe (Bau, nicht gemergt) |
| P | Performance: /api/zustand im Langlauf, Event-Loop-Blockaden beseitigen, Seitenwechsel messen, f16-Restordner | F-556, F-999 | B0 (Messskript) | vor Merge | 0,5 | |
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
