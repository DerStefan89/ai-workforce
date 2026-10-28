# F45 — Akten-Archiv

Stand-Abschnitte aus `features/F45/feature.md`, wörtlich verschoben (Text und Reihenfolge unverändert). Neue
Stand-Abschnitte nie hier, sondern in der Akte.

Akten-Archiv (F45 W2d, analog E-K-1; gilt für jede Feature-Akte; DEKLARIERT, kein Gate): Stand-Abschnitte (`## Stand …`)
erledigter Pakete (gemergt laut `## Workstreams` bzw. git) werden gesammelt, wenn die Akte spürbar gewachsen ist, als ganze
Abschnitte (Überschrift bis vor die nächste `## `-Überschrift) wörtlich und in der Reihenfolge der Akte am Ende von
`features/<id>/akte-archiv.md` angefügt — ab dem ältesten und ohne Lücke (der Abschnitt eines nicht erledigten Pakets
beendet den Lauf); die letzten drei Stand-Abschnitte (auch der eines laufenden Pakets) bleiben in der Akte, alle anderen
Abschnitte bleiben unverändert. Ausnahmen: der Hinweissatz unter dieser Regel in der Akte nennt den archivierten Bereich und
wird je Lauf nachgezogen; eine neue `akte-archiv.md` bekommt diese Regel als Kopf. Kontrolle: Akte und Archiv zusammen
enthalten jeden Abschnitt der Akte vor dem Lauf byte-gleich (verglichen ohne abschließende Leerzeilen; eine Leerzeile trennt
die Abschnitte). Lesen nur bei Bedarf.

---

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

## Stand B1b-2
Branch `feat/f45-b1b2-harness-abgleich` (Basis `febcc86` = main mit #321), nicht committet. Bau 11.10.2026.
Plan `features/F45/plan-b1b2.md` (v1 → Advisor-Pass „tragfähig mit Änderungen“, A0–A5/H1–H8 → v2). A0: Kernmodul,
Anleitung und Vorher-Messung lagen beim Advisor-Pass schon als Entwurf vor (gegen „erst planen, dann bauen“); der Entwurf
wurde an v2 angeglichen.

**Beleg 12 (Harness-Abdeckung): Mechanik vorhanden, Erbringung in R.**

**Gebaut:**
- **Kern** `src/harness-abgleich/`: Inventar des Projekt-Harness (DoD-Punkte aus CLAUDE.md mit ID `dod-<8 Hex>` aus dem
  normalisierten Text, Hooks aus der settings.json des Projekts mit Ereignis, Matcher und SHA-256 der Skriptdatei, Agents,
  Skills, Commands; fehlende, kaputte oder nach außen verknüpfte Quellen als eigener Eintrag, nie ein Wurf), versionierte
  Zuordnung `harness-abgleich/standard.json` (Schema `schemas/harness-zuordnung.schema.json`, je Projekt über
  `harnessZuordnungPfad` der Startvorlage ergänzbar), Bewertung nach Plan v2: wirksam (statischer Beleg — bei Hooks an Hash
  und Matcher gebunden — oder Prüfschritt GRÜN), „ohne Beleg“, ersetzt (nur wenn der Schritt der Rolle ERFOLGREICH lief;
  fehlt er, `fehlt_im_ablauf` → bewusst nicht, sonst offen), bewusst nicht, offen (nicht in der Zuordnung, Quelle fehlerhaft,
  negativer Beleg, Ersatz nicht gelaufen/fehlt, im Arbeitsordner gegenüber dem Projektordner entfernt). `bestanden` = kein
  Eintrag offen und keiner ohne Beleg; ohne Laufbelege `null`. Kurzliste der benutzten Fähigkeiten (Skills, Subagenten,
  MCP-Server, Hintergrund-Aufrufe; Zählregel `zaehleNamen` aus dem Gateway).
- **Ergebnis-Artefakt** `harness-abgleich-<workflowId>` (Schema `schemas/kontrollzustand-harness-abgleich-payload.schema.json`):
  am Ende der Kette synchron im Laufende-Rückruf (D13-Bereich ohne verbotene Zeichenketten, `starteWorkflowSchritt(` bleibt
  6×) und nach „Prüfung wiederholen“ bei Kettenende; Bezug = Ausführungslauf + Inhalts-Hash des Prüfergebnisses.
  GET `/api/workflows/<id>/harness-abgleich` liefert das Artefakt, wenn der Bezug passt, sonst live (nicht geschrieben).
  GET `/api/harness` trägt das Feld `abgleich` (ohne Laufbelege). Kein Aufruf im 2-s-Poll.
- **Anzeige** (`public/leitstand/harness-abgleich-anzeige.js`, de/en/ru/tr): Abnahme (Nachweise im Einzelnen, Vorab- und
  Entschieden-Block, rote Zeile in der Kachel „Nachweise“ bei nicht bestanden), Lauf-Detail (Bereich „Fähigkeiten“, Kurzliste
  nur beim Ausführungslauf), Seite Workforce (Abschnitt „Abgleich mit der Zuordnung“ unter dem Harness-Aufbau). Unter 900 px
  gestapelt (Muster `.library-tabelle`). Geladen einmal je Stand, nicht im Poll.
- **Kleinpunkte:** `bashZeitgrenzeMs` 1 200 000 (F-1043; kein Feld des Gültigkeitsschlüssels); CLI-Version beim Start
  (`scripts/leitstand/cli-version.mjs`, einmal asynchron, Feld `cliHinweis` in `/api/zustand` aus dem Speicher, gelbes Band
  „CLI-Version geändert — Startfreigabe neu erzeugen“, Anleitung `docs/harness/startfreigabe-erneuern.md`, kein Automatismus;
  F-1044); F-1039 erledigt (CLI-Test ohne Annahme über `os.tmpdir()`).

**Nachweise** `features/F45/nachweise/b1b2/`: realer `-p`-Lauf mit den Root-Hooks (`hooks-nachweis.mjs` →
`zaehlung-hooks.json`: guard-settings verweigert das Edit auf die settings.json, commit-guard verweigert `rm -rf` (Bash) und
`Remove-Item -Recurse -Force` (PowerShell), SessionStart feuert ohne Inhalt; 15 s, Haiku); Tabellen
`abgleich-ai-workforce.md` (5 wirksam · 4 ersetzt · 21 bewusst nicht · 0 offen) und `abgleich-workflow.md` (Workflow
`b1a1-nachweis-325d2a8f`, live: 5 · 2 · 23 · 0 offen, bestanden); Fall „unbekannter Agent → offen, rot“ als Test-Fixture
und Render; Render-Nachweis `render/` (28 Bilder: de 1440/390, en, ru 390, hell, 200 %, reduzierte Bewegung, Lage vorab,
Kachel, Lauf-Detail, Startband); Kettenende über den echten HTTP-Pfad im Servertest
`scripts/leitstand/routen-harness-abgleich.test.mjs`. `/api/zustand`: `messung-vorher.md` (10 min) und
`messung-nachher-teil.md` (≈ 7 min — von Claude Code wegen Speicherdrucks beendet; Median 54 → 51 ms, p95 131 → 149 ms im
gleichen Fenster, 3 Ausreißer bis 1 303 ms kurz vor dem Abbruch; P1 erfüllt).

**Grenzen:**
- Fremdprojekte tragen die Hook-Baseline von vor B1b-1 (haushaltsbuch2: commit-guard Matcher `Bash`, anderer Hash) → dort
  „ohne Beleg“, Beleg 12 so nicht erfüllbar (F-1047, Entscheidung vor R).
- Hooks sind nur statisch belegt; die Laufakte trägt keine Hook-Ereignisse (F-1046).
- Ein Ablauf ohne Review-Schritt (fast-lane) erfüllt Beleg 12 über `fehlt_im_ablauf` — Entscheidung Stefan.
- Die Live-Rechnung für Altbestand liest den heutigen Harness, nicht den zur Laufzeit; der b1a1-Nachweis ist live.
- Neuer ungetrackter Ordner erscheint in der Änderungsübersicht nur als Ordnerpfad (F-1045); Restpunkte F-1048.

**Prüfpass** (frischer Kontext, eine Korrekturrunde): architecture-advisor „tragfähig mit Änderungen“ → Plan v2.
code-reviewer „freigegeben mit Hinweisen“ (M1 Ordner hinter Verknüpfung, M2 Anleitung, M3 Lauf-Detail-Schlüssel; umgesetzt).
qa „nicht freigegeben“ (Fremdprojekte, fehlende Nachweise, Prüfung wiederholen, im Lauf entfernter Harness, Sichtbarkeit
„ohne Beleg“, Texte) und design-guardian „nicht freigegeben“ (Render-Varianten, Workforce-Tabelle, Kachel, Zellrahmen,
Bandfarbe, Kurzliste im fremden Lauf) — in der Korrekturrunde umgesetzt bzw. als F-1047/F-1048 festgehalten.
Nachpass qa und design-guardian: beide „freigegeben mit Hinweisen“. Danach noch umgesetzt: Vergleich Projekt- gegen
Arbeitsordner nur für Quellen, die der Lauf laut Änderungsübersicht geändert hat (sonst galten Stefans nebenher
ungesicherte Harness-Dateien als „im Lauf entfernt“), Servertests für „Prüfung wiederholen“ am Kettenende und für eine
ungetrackte Datei im Projektordner, Hinweistexte ohne Laufbezug auf der Seite Workforce, Tabelle im Vorab-Block
zugeklappt, Kachelzeile als Text mit Marke, keine Kurzliste im Lauf-Detail (die Beobachtungszeile steht darüber).
Offen als Hinweis: F-1048.

## Stand F-1
Branch `f45/f1-faehigkeiten-im-lauf` (Basis `581269a` = main mit #322), nicht committet. Bau 11./12.10.2026.
Plan `features/F45/plan-f1.md` (v1 → Advisor-Pass „nicht freigegeben“, A1–A19 → Entscheidungen E-F45-6/7/8 → v2 →
Delta-Pass „freigegeben mit Hinweisen“, B1–B10). Spike `state/spike-f45-f1-agents.md` (4 echte Läufe): `--allowedTools
Agent(<name>)` begrenzt nicht (S1) → Fallback Sperrliste; `init.plugins` trägt zwei eingebaute Plugins (S3).

**Beleg 13 (Fähigkeiten): Teil Agent/Skill/MCP-Abschaltung serverseitig vorhanden, Oberfläche in F-2, Erbringung in R.**

**Gebaut:**
- **Lokale Datei** `~/.ai-workforce/faehigkeiten.lokal.json` (Schema `schemas/faehigkeiten-lokal.schema.json`,
  Validator `src/faehigkeiten/index.ts`): `an` (Projekt-Agents/-Skills, Opt-in), `aus` (Katalog-MCP/-Skill),
  `inhalt_freigaben`. Fehlt → wie vorher; ungültig → Start mit Katalog-Fähigkeiten abgelehnt.
- **Identität nach Inhalt** (F-816): Hash der Agent-Datei bzw. des Skill-Ordners im Arbeitsordner gegen die Katalog-Datei
  der Workforce oder die Projekt-Freigabe; strenge Frontmatter-Positivliste, Namensregeln, Hindernisse (Verknüpfung,
  mehrdeutiger Name) → Lauf startet nicht. Abgleich mit der Momentaufnahme unmittelbar vor dem Spawn (Controller).
- **Start** (`src/faehigkeiten/start.ts`): aktive Agents → `Agent` in `--tools`, `Agent(<n>)` in `--allowedTools`,
  Sperrliste `Agent(<eingebaut|nicht aktiv>)`; aktive Skills aus skillOverrides/Skill(…)-Sperre; `--settings` mit
  `enabledPlugins` der eingebauten Plugins aus (auch für Ort-B-Läufe, F-1053); Vordergrund-Satz im Auftragstext.
  Ohne aktiven Eintrag bitgleich. `aus` wirkt über `baueEmpfehlung` (Feld `deaktiviert`).
- **Init-Gate**: `init.plugins` leer; mit aktiven Agents `Task`/`Agent` zulässig und `init.agents ⊆ erlaubt ∪ gesperrt`.
- **Laufakte** `faehigkeiten_im_lauf` (eingefroren beim Start, am Ende mit dem Rohstrom verbunden: aufrufe/fehlgeschlagen
  je Eintrag, fremde Aufrufe); Vorher/Nachher-Hash der lokalen Datei (Änderung im Lauf = rot).
- **Endpunkte** (`scripts/leitstand/routen-faehigkeiten.mjs`): GET `/api/projekte/<id>/faehigkeiten`, POST
  `…/faehigkeiten/aktivierung`, POST `…/faehigkeiten/freigabe` (409 bei Hash-Wechsel, bei laufendem Lauf, bei kaputter
  Datei).
- **Kleinpunkte:** Begründung `fehlt_im_ablauf` in `harness-abgleich/standard.json` („Kontrolltiefe fast-lane (Router) —
  bewusst ohne Review; für den Referenzauftrag R nicht zulässig“); Register F-1049 bis F-1055, F-815/F-816 erledigt,
  F-1012/F-910 teilweise, F-859 → F30.

**Nachweise** `features/F45/nachweise/f1/` (`nachweis.md`): L1 (qa an + Ort-B frontend-design) ERFOLGREICH — Init-Gate
grün mit `init.plugins = []`, qa aufgerufen, general-purpose von der Sperrliste verweigert; L2 (qa aus) ERFOLGREICH — kein
Agent im Lauf; L3 (nur qa, ohne Ort-B) ERFOLGREICH — qa aufgerufen, Explore verweigert. Gate `scripts/check-f45-f1-faehigkeiten.mjs`, Tests `src/faehigkeiten/faehigkeiten.test.ts`,
`scripts/leitstand/routen-faehigkeiten.test.mjs`.

**Prüfpass** (frischer Kontext, eine Korrekturrunde): code-reviewer „nicht freigegeben“ (hoch: Name aus verworfenem
Frontmatter fehlte in Sperrliste und Eindeutigkeit) und qa „freigegeben mit Hinweisen“ (eingeschaltet, aber im Arbeitsordner
nicht aktiv lief still ohne die Fähigkeit; unbekannte Schlüssel einschaltbar; Init-Gate prüfte nicht, ob Eingeschaltetes
geladen ist; „benutzt im letzten Lauf“ mehrdeutig; Reallauf ohne Ort-B fehlte) — in der Korrekturrunde umgesetzt
(`features/F45/plan-f1.md`, Nachtrag v2.2); Rest in F-1054/F-1055.

**Grenzen:** F-1054 (Anzeige-Bindung, Gründe, Oberfläche → F-2), F-1055 (Selbstfreigabe über einen nach Laufende
weiterlebenden Prozess, ungemessene CLI-Fälle, Drift der Referenzlisten).

**Nächster Schritt: F-2** — Oberfläche (Seite Workforce, Lauf-Detail: installiert · aktiv · benutzt, Schalter und
„Freigeben nach Inhalt“ mit angezeigtem Hash), Bindung der Projekt-Fähigkeiten an die Anzeige im Start-Body, Plugins im
Fähigkeitenmodell (F-910), Gründe der Empfehlung neu.

## Stand F-2a
Branch `f45/f2a-faehigkeiten-oberflaeche` (Basis `849fda5` = main mit F-1, #323), nicht committet. Bau 12.10.2026.
Plan `features/F45/plan-f2a.md` (v1 → Advisor-Pass „freigegeben mit Hinweisen“, A1–A11 → v2 → Bau → Prüfpass →
Korrekturrunde, Nachtrag v2.1).

**Beleg 13 (Fähigkeiten): erbracht im echten Lauf über die Wege der Oberfläche** (`features/F45/nachweise/f2a/nachweis.md`):
L1 `d39439f0…` — qa über den Schalter eingeschaltet, playwright-mcp und frontend-design an: alle drei „aktiv“ und je
1 Aufruf ohne Fehler laut Laufakte; L2 `c54315c6…` — qa ausgeschaltet: im Lauf nicht verfügbar („Agent-Werkzeug nicht
vorhanden“). Für R (Referenzauftrag) erneut im Fremdprojekt zu erbringen (haushaltsbuch2 erst nach F-1047).

**Gebaut:**
- **Seite Workforce → Capability Library → „Dieses Projekt“** (`views/faehigkeiten-projekt.js`,
  `faehigkeiten-projekt-anzeige.js`): MCPs · Skills (Katalog) · Projekt-Skills · Projekt-Agents mit Kurzbeschreibung,
  installiert · aktiv · im letzten Lauf (Aufrufe/Fehler), Schalter je Eintrag (Standard je Art erklärt, „wirkt ab dem
  nächsten Lauf“, gesperrt während eines Laufs mit Grund), „Freigeben nach Inhalt“ mit Pfad und Hash (409 → „Inhalt hat
  sich geändert, neu laden“), Bänder: ungültige lokale Datei (E-F45-7), außerhalb geändert (F-1055 (1)),
  eingeschaltet-aber-nicht-aktiv, Hindernis. Nicht im Poll.
- **Bindung an die Anzeige (F-1054 (1))**: Projekt-Kennungen `agent:|skill:<name>@<sha256>` gehen in `empfehlungIds`
  mit; Vergleich im Projektordner (Vorprüfung/Start), im bereiten Arbeitsordner schon in der Vorprüfung und im Ordner des
  Laufs (`konflikt` → 409 im Workflow); ohne angezeigte Kennungen kein Start (Advisor A4); eingeschaltet-aber-nicht-aktiv
  bricht die Freigabe vor dem Festhalten ab.
- **Gründe neu (F-1054 (2))** in „Passt, nicht im Lauf“, Freigabeblock mit „Projekt-Fähigkeiten im Lauf“ und „Im Projekt
  ausgeschaltet“.
- **Wächter der lokalen Datei (F-1055 (1))**: Stand beim Serverstart und nach Route-Schreiben bekannt; Fremdänderung als
  Band (Workforce, Freigabeblock); POST mit veraltetem Datei-Stand → 409.
- **Lauf-Detail „Fähigkeiten im Lauf“** (aktiv/aus, Quelle, Hash, Aufrufe/Fehler, fremde Aufrufe) und **Kurzzeile in der
  Abnahme** (Schema `kontrollzustand-harness-abgleich-payload` additiv `faehigkeiten.im_lauf`).
- **Doku/Register**: E-F45-6 bis E-F45-10 und die Sammlung in Zielfassung §13.6 (v1.42), Fixpaket §2/§3/§5, Akte;
  F-1056 bis F-1059 (K20–K23), F-1054/F-1012 erledigt, F-1055 teilweise, neu F-1060/F-1061.

**Prüfpass** (frischer Kontext): code-reviewer „freigegeben mit Hinweisen“, qa „freigegeben mit Hinweisen“; eine
Korrekturrunde (Plan Nachtrag v2.1). design-guardian siehe Nachtrag.

**Grenzen:** F-1060 (Fortsetzungsstarts ohne Fähigkeiten → B2b, Status-Route mit Werkzeugsatz `schreibend`, Kleinpunkte),
F-1061 (Wächter nur im Speicher, POST ohne `stand`; (3) entschieden und umgesetzt: nach einer Änderung von außen
sperren Schreib-Routen und Starts mit Katalog-Fähigkeiten bis „Datei geprüft – Stand übernehmen“).

**Nächster Schritt: F-2b** — Sammlung im Leitstand mit „Auswählen“ → Prüflauf → Katalog (F-1056, F-1057), extern_lesend-MCPs.

## Stand F-2b-1
Branch `f45/f2b-sammlung-auswahl-pruefung` (Basis `83a576c` = main mit F-2a, #324), nicht committet. Bau 12.10.2026.
Plan `features/F45/plan-f2b.md` (v1 für ganz F-2b → Advisor-Pass „nicht freigegeben“, A1–A21 → Entscheidungen Stefan: teilen,
176 zeigen → v2 für F-2b-1 → Delta-Advisor-Pass „freigegeben mit Hinweisen“, B1–B14 → v2.1).

**Gebaut:**
- **Sammlung lesen** (`src/sammlung/`): nur die Tabellen unter „## Vollständige Bewertungsmatrix“ (UI, Repos, Plugins, Skills,
  Tools, MCP); je Zeile Name, Link, Urteil, Kurzbeschreibung, Lizenz, Kosten, Sicherheits-/Fit-Bewertung, Art, Zeilennummer;
  Bedeutung je Urteil aus „Entscheidungen lesen“; Selbstprüfung gegen die Angabe der Datei (gesamt und je Urteil — eine
  Abweichung zeigt die Liste mit Band, ein Strukturfehler einen Fehlerstand). Feste Zahlen nur im Gate: 176 Zeilen, 172 mit Link.
- **Zuordnung Sammlung ↔ Katalog** (Regel im Kopf von `src/sammlung/index.ts`): erst normalisierter Link = `herkunft.url`,
  dann normalisierter Name = Katalog-id/-name; nur 1:1, sonst „mehrdeutig“ (nichts geraten); Alias nimmt nicht teil. Echte Daten:
  19 zugeordnet, 0 mehrdeutig.
- **Typ, prüfbare Quelle, Auswahlgrund, Stand** je Eintrag (Codes, übersetzt in der Oberfläche): Typ aus Katalog → Stack-Liste →
  Abschnitt (nur Vorschlag) → unbestimmt; Quelle strukturiert (GitHub-Repo/Unterpfad, npm-Paket; sonst „keine prüfbare
  Quelle“); nicht auswählbar: Alias, ohne Link, lokal, Bibliothek („wählt der Architekt“), Plugin (F-3), keine Quelle;
  ausgeschlossen = „Nur Ausnahme“/„Ausgeschlossen“ (Auswählen nur mit Ausnahme-Begründung, F-2b-2); Stand benutzt · aktiv ·
  installiert · vorgemerkt · nur Sammlung aus dem Katalog-Status dieses Projekts (`baueKatalogStatus`, aus
  `baueFaehigkeitenStatus` herausgezogen, Verhalten gleich); Prüfbericht „ohne Prüfbericht (vor F-2b freigegeben)“ für
  playwright-mcp und frontend-design, „lokal“ für Repo-Einträge.
- **Route** `GET /api/sammlung` (`scripts/leitstand/routen-sammlung.mjs`, Dateien der Installation, Zwischenspeicher nach
  mtime/size), nicht im Poll.
- **Oberfläche** Seite Workforce → Capability Library → Unterreiter „Sammlung“ (`views/sammlung.js`,
  `sammlung-anzeige.js`): Kennzahlen, Suche, Filter Urteil und Stand, Gruppen nach Art, Zeile mit Name, Was es kann, Urteil,
  Lizenz, Kosten, Stand, Link; Detail mit Bewertung, Bedeutung des Urteils, Zuordnung, Typ, Prüfbericht und „Auswählen“
  (Kennzeichen „kommt“, F-2b-2) bzw. Grund. i18n de/en/ru/tr.
- **Scout liest die Sammlung zuerst (F-1057)**: der Server hängt jedem direkt gestarteten Scout-Lauf die Regel und eine
  kompakte Liste (Name · Art · Urteil · Lizenz · Link, dazu die Stack-Liste) an den Prompt; gestarteter Argv bitgleich (Prompt
  per stdin, F-642). `ergebnis-scout` additiv `quelle`/`urteil_sammlung`; die Scout-Karte zeigt „laut Sammlung (aktueller
  Stand)“ (Serverwahrheit per Link) und Abweichungen. `.claude/agents/scout.md` trägt dieselbe Regel für den Subagenten der
  Sitzung — Leitstand-Läufe lesen die Datei nicht (Advisor A12).
- **F-1060 (6)**: voller Hash im Lauf-Detail aufklappbar (Tastatur, Screenreader, Touch) mit „Kopieren“ (Rückfall ohne
  Zwischenablage: Hash markiert, Hinweis „mit Strg+C kopieren“).
- **Register**: F-1057 erledigt, F-1060 (6) erledigt, F-1056 Nachtrag (→ F-2b-2); neu F-1062 (K24), F-1063 (K25), F-1064–F-1066
  (K26–K28, Projektkarte, B2a), F-1067 (Scout-Schritt über Workflow ohne Sammlung), F-1068 (Restpunkte F-2b-1). Fixpaket §3/§5: F-2b-1/F-2b-2 mit
  Schätzung, extern_lesend-MCPs nach F-3, B2a erweitert (1,5–1,85 AT), Reihenfolge neu.

**Startfreigabe:** nicht neu nötig — der Gültigkeitsschlüssel misst nur `.claude/settings.json` und die darin genannten Hooks
(`src/invocation-policy/index.ts`, Advisor A11). Folge der geänderten `scout.md` (Delta B9): ein Projekt mit einer Handkopie von
`scout.md` und eingeschaltetem `agent:scout` steht danach auf „Inhalt weicht ab“ (Freigabe nach Inhalt nötig); das Skelett trägt
keine `scout.md`.

**Prüfpass** (frischer Kontext): code-reviewer „freigegeben mit Hinweisen“, qa „freigegeben mit Hinweisen“, design-guardian „nicht
freigegeben“ (zweite Live-Region) → eine Korrekturrunde (Plan Nachtrag v2.2), Render-Nachweis neu
(`features/F45/nachweise/f2b/nachweis.md`, 21 Folgen, u. a. Tastatur und Scout-Karte über Antwort-Attrappen).

**Grenzen:** F-1067 (Scout-Schritt über einen Workflow ohne Sammlung); F-1068 (Gruppen bei 390 px nicht einklappbar, Texte des
Servers deutsch, Detail nicht als eigene Tabellenzeile); Gate (b) wird bewusst rot, sobald eine Zuordnung mehrdeutig ist; die Sammlungsangabe auf der Scout-Karte ist der Stand der
Anzeige, nicht des Laufs (Delta B5); ein falscher Wert in `quelle`/`urteil_sammlung` macht das ganze Scout-Ergebnis ungültig
(Delta B4, der Anhang nennt die exakten Werte).

**Nächster Schritt: F-2b-2** — Auswählen → Eignungsprüfung der gepinnten Version → Prüfbericht → Katalog, Sperre der Freigabe ohne
Bericht (F-1056), F-1061 (1); Plan aus `features/F45/plan-f2b.md` (Advisor A2–A10, A15–A19, A21).

## Stand F-2b-2a
Branch `f45/f2b2-pruefung-freigabe` (Basis `1985e9b` = main mit F-2b-1, #325), nicht committet. Bau 12.10.2026.
Plan `features/F45/plan-f2b.md` (Plan v3 für F-2b-2 → Delta-Advisor-Pass „freigegeben mit Hinweisen, zu groß“, C1–C15 →
Teilung F-2b-2a/F-2b-2b und Nachtrag v3.1).

**Gebaut:**
- **Rolle `eignungspruefung`** (`src/rollen/index.ts`): lesend, nur claude-code, Schema `ergebnis-eignungspruefung`. Startet nur
  serverseitig mit Prüfordner (Option `pruefOrdner` in `loeseAusfuehrungsEingabenAuf`, C4): POST /api/laeufe und Workflow-Schritte
  ohne Prüfordner werden abgelehnt; Werkzeugsatz exakt Read/Grep/Glob. Der Prüfordner geht über den bestehenden ortB-Kanal
  (`--add-dir` + `--settings` aus `baueFaehigkeitenStart` ohne aktive Einträge: alle Skills/Commands der Workforce aus, eingebaute
  Plugins aus), Init-Gate `skills = ∅`, `mcp_servers = ∅`, `plugins = ∅`; `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=0`. Gateway
  unverändert, Argv der übrigen Rollen bitgleich.
- **Pin ohne Installation** (`scripts/leitstand/routen-pruefung.mjs`): Subjekt aus Sammlung (zugeordnet → Katalogeintrag) oder
  Katalog OFFEN; Skill/Agent → Commit-SHA (`loeseSkillCommitAuf`), optional `pfad` im Repo; MCP → npm exakte Version + nur
  sha512-Integrity; fehlende Paketangabe → 422 „Quelle nicht pinnbar: Paketangabe fehlt“; FREIGEGEBEN → 409 (Bestandsschutz).
- **Inhalt holen read-only** (`src/sammlung/quelle.ts`, `inhalt.ts`): git mit der Härtung der Installation (`gitHaertung`, aus
  `skill-installation.ts` gezogen, Installation bitgleich), flacher Fetch genau der SHA, `ls-tree -l` → Auswahl und Grenzen vor dem
  Checkout (≤ 3 000 Dateien, ≤ 25 MB, Datei ≤ 1 MB), Checkout nur der ausgewählten Dateien (`--literal-pathspecs`) — dieselben Bytes
  wie die Installation; npm per `npm pack --ignore-scripts` (cwd leer), sha512 = angezeigte Integrity, eigener Tar-Leser (pax, GNU,
  Prüfsumme, nur reguläre Dateien). Segmentprüfung (Windows-Gerätenamen, `..`, Laufwerk, Punkt am Ende …), Neutralisierung
  `.claude*`/CLAUDE.md, mechanische Fakten (Lebenszyklus-Skripte, bin, Hooks, Umbenennungen, Übersprungenes).
- **Ablauf** `POST /api/sammlung/pruefung/vorbereiten` (nur Pin), `POST /api/sammlung/pruefung` (Pin = Anzeige, sonst 409; D13 und
  Reservierung im selben Takt, C2; 202), `GET /api/sammlung/pruefung/<laufId>` (Zustand im Speicher). Nur in der Workforce-Instanz
  (`istWorkforceInstanz`, A3; die Oberfläche ruft unpräfigiert). Holen und Lauf asynchron; jeder Fehlschlag vor dem Start gibt die
  Sperre frei; Abbruch zwischen den Schritten; verwaiste Prüfordner beim Serverstart entfernt.
- **Prüfbericht** als Kernartefakt `pruefbericht-<schluessel>` (Lineage: Laufakte) im Kontrollzustand der Workforce
  (`pruefberichtBasisVerzeichnis`, an beiden Aufrufen von `baueProjektHandlerMap`); Schema/Validator
  `kontrollzustand-pruefbericht-payload`; Ergebnis mit falschem typ/Version → kein Bericht.
- **Freigabe nur mit Bericht** (`src/ressourcen/installation.ts`, Rückruf `pruefeBericht` unter der Installationssperre nach
  eintragHash, nicht abschaltbar): ohne Bericht, Bericht nur für eine andere Version oder NICHT_GEEIGNET → 409; es gilt der neueste
  passende Bericht (Suche nach Quelle, Skill-Pfad an Segmentgrenze, `waehleBericht`). `…/installation/vorbereiten` additiv
  `pruefbericht` und `pruefbericht_sperre`. Gates WS-5a/5b legen über `pruefbericht-testhilfe.mjs` passende Berichte an (C5).
- **Oberfläche:** Sammlung-Detail „Auswählen“ → Typwahl (unbestimmt) → Bestätigung (Pin, Urteil + Bedeutung, letzter Bericht,
  „Pfad im Repo“, Pflicht-Ausnahme-Begründung, Kostenhinweis) → „Prüflauf läuft“ (Detail-Auffrischer nur solange) → Bericht (Fakten
  vor dem Urteil, C14; Befunde, Auflagen, Ausnahme, Lauf-Link); Stand „geprüft“ und letzter Bericht je Eintrag. Freigabedialog zeigt
  den Bericht; ohne passenden Bericht oder NICHT_GEEIGNET kein „Installieren“, sondern der Grund. i18n de/en/ru/tr.
- **Katalog:** `context7-mcp` erhält `herkunft.paket = "npm:@upstash/context7-mcp"` (Bestätigung Stefan, Beleg im Nachweis).
- **Gate** `scripts/check-f45-f2b2-pruefung.mjs` (in `npm run check`).

**Echte Prüfläufe** (`features/F45/nachweise/f2b2/`): context7-mcp 4.3.0 → MIT_AUFLAGEN (Anfragen an context7.com; keine
Installationsskripte); impeccable `.claude/skills/impeccable` @ `919dbeb` → NICHT_GEEIGNET (Launcher lädt ein Engine-Binary zur Laufzeit
nach, Hook-Manifeste in `.claude/settings.local.json`). Erster impeccable-Versuch über das ganze Monorepo endete an der Grenze
(3 884 Dateien) — deshalb das Feld `pfad`. Init-Zeile beider Läufe: skills/plugins/mcp_servers leer, Werkzeuge Glob/Grep/Read.

**Startfreigabe:** nicht neu nötig — `.claude/**` unverändert (der Gültigkeitsschlüssel misst `.claude/settings.json` und die
Hooks); die echten Läufe liefen mit der bestehenden Startfreigabe der Workforce.

**Prüfpass** (frischer Kontext): code-reviewer „nicht freigegeben“ (doppelter Pfad im npm-Tarball), qa „freigegeben mit Hinweisen“,
design-guardian „nicht freigegeben“ (zwei zusätzliche Live-Regionen) → eine Korrekturrunde (Plan Nachtrag v3.2), Render-Nachweis neu
(`features/F45/nachweise/f2b2/nachweis.md`, 15 Folgen). Restpunkte F-1073, F-1074. Delta-Review danach „nicht freigegeben“: zwei hohe Restlücken bei „geprüft = installiert“ (Tar-
Schreibweisen, git-Zwillinge über 1 MB) → nach der Abbruchregel Stopp. Runden 2 und 3 (Freigabe Stefan, nur F-1075): git/Skills dicht (Zwillinge über den ganzen Baum, Inhalts-Abgleich Pflicht); npm weiter ein echter Bruch (eigener Tar-Leser ≠ node-tar) → **Rückfallebene: npm-Installation nach Prüfung gesperrt** (409 „npm-Installation nach Prüfung noch nicht freigegeben, F-1075“, Knopf deaktiviert mit Grund); F-1075 (P1, Rest) → F-2b-2b. `npm run check` grün (2009 Tests).

**Abweichung vom Auftrag (benannt):** „F-1052: P3 → P2, fremde Agents“ ist inhaltlich F-1051 (P3, „Externe Agents sind nicht
installierbar“); dort umgesetzt, F-1052 (API-Schlüssel, schon P2) unverändert.

**Grenzen** (F-1074, F-1073): ein laufender git/npm-Schritt endet bei Abbruch erst an seiner Zeitgrenze (C8); `--depth 1` lädt den ganzen Stand vor
den Grenzen (C10); das Init-Gate prüft die init-Zeile, gegen verschachtelte Skills im Lauf schützen Neutralisierung und fehlendes
Skill-Werkzeug (C13); ein unsauberes `.claude` im Workforce-Checkout färbt den Prüflauf rot (C6, fail-closed); der Prüfzustand
lebt im Speicher (nach Neustart zählt nur der Bericht); die echten Läufe belegen Prüflauf und Bericht, nicht die Installation
(impeccable ohne skill_pfad, context7 extern_lesend; C9); das Modellurteil kann ein manipuliertes Repo beeinflussen — deshalb stehen
die mechanischen Fakten getrennt davor (C14).

**Nächster Schritt: F-2b-2b** — Vormerken-Variante für Sammlungseinträge ohne Katalog, „Eignung prüfen“ in der Capability Library,
Detail als volle Tabellenzeile (F-1068 (3)), F-1061 (1). (Nachtrag 13.10.2026: F-2b-2b wurde der npm-Strukturfix nach F-1075, der
Rest ist F-2b-2c — siehe „Stand F-2b-2b“.)

## Stand F-2b-2b

Branch `f45/f2b2b-npm-strukturfix`, Basis `2af1b54` (main mit F-2b-2a, #326). Plan `features/F45/plan-f2b2b.md` (Plan v1 →
Advisor-Pass „TEIL 1 freigegeben mit Hinweisen, TEIL 1 + TEIL 2 zu groß“ → Plan v2 nur TEIL 1). Grundlage: Entscheidung Stefan
12.10.2026 (Challenger claude/599) — **Variante C „Prüfen, was npm selbst schreibt“**; der Plan aus F-1075 „Rest“ (a)–(c) wird
nicht umgesetzt, keine neue Abhängigkeit.

**Befund bestätigt** (npm 11.18.0 des Repos, Test mit echter .tgz): npm entpackt `package/node_modules/…` ohne
bundleDependencies verschachtelt und ohne Lockfile-Eintrag, verwirft Symlinks, der letzte doppelte Eintrag gewinnt. Die Lücke
war die Ausnahme `node_modules` im Inhalts-Abgleich.

**Gebaut (TEIL 1):**
- Eine npm-Installation für Prüflauf und Installation: `installiereNpmPaketInOrdner` (`src/ressourcen/installation.ts`) —
  leerer Ordner, `npm install <paket>@<version> --prefix <ordner> --ignore-scripts --save-exact --no-audit --no-fund` (Skripte
  zusätzlich per Umgebung aus), Lockfile = angezeigt, nur Registry-Abhängigkeiten (git/file/link → 422, Advisor F4,
  Entscheidung im Plan v2 dokumentiert), echte Verzeichnisse, kein verschachteltes `node_modules` im Paketordner (422).
- Prüflauf (`holeNpmInhalt`): installiert damit in `<temp>/install` (300 s), liest den Paketordner per lstat von der Platte
  (Symlink/Junction → 422, Einträge gedeckelt), Neutralisierung und Dateiliste wie bisher, `install/` vor dem Modelllauf
  entfernt. `npm pack`, `sriSha512` und der eigene Tar-Leser sind entfernt.
- Inhalts-Abgleich ohne Ausnahme; Rückfallebene aufgehoben (`NPM_SPERRE`, Schalter `npmInstallationNachPruefung`) —
  „Freigeben & installieren“ für npm-MCPs ist mit passendem Prüfbericht wieder möglich.
- F-1074 (8) Auswahl prüft den Paketnamen wie die Route; (9) Integrity im Bericht in voller sha512-Form (Validator + Schema).
- F36-Nachweisskripte (WS-5a, WS-5b Teil 9a) als historisch markiert, enden mit klarer Meldung statt 500.

**Tests/Gates:** Rot-Tests (a) verschachteltes `node_modules` (Prüflauf, Installation), (b) Datei nicht im Bericht, (c) Junction,
(d) Lockfile-Version/-Integrity, dazu Nicht-Registry-Abhängigkeit, Ordner nicht leer; echtes npm (`src/ressourcen/npm-echt.test.ts`,
sucht npm auch unter `../lib/node_modules` für CI); Gate F-2b-2 (h)/(i) umgebaut.

**Echter Nachweis** (`features/F45/nachweise/f2b2b/`): Prüflauf context7-mcp 4.3.0 (Holen ≈ 17 s, gesamt 143 s, 0,45 USD,
MIT_AUFLAGEN, 29 Dateien), Installation gegen eine Temp-installWurzel 200 in 24,8 s, Paketordner 29 Dateien / 202 KB = Bericht
(Fixture-Abweichung: in der Katalog-Kopie `wirkung: lokal` + Vorlage; im echten Katalog bleibt context7 extern_lesend).

**Register:** F-1075 erledigt; Nachträge F-1074 (8)/(9), F-1056, F-1061 (1), F-1068 (3) (→ F-2b-2c); neu F-1077 (K33, Jarvis weist
Produktprojekte ab, B5a), F-1078 (K35, verschachtelte npm-Abhängigkeiten nicht installierbar; Hinweis Advisor F1 zu `~/.npmrc`).

**Prüfpass** (frischer Kontext): code-reviewer und qa je „freigegeben mit Hinweisen“, kein Weg gefunden, auf dem installierter
Inhalt im Paketordner ohne 422 vom geprüften abweicht. Eine Korrekturrunde: Rot-Tests Junction an `node_modules`/Scope/Paketordner,
Lockfile kaputt/ohne Paket, Abhängigkeit ohne https+Integrity, gebündelt, npm-Fehlercode im Grund, npm-Fehler/Filter im Prüflauf,
zweiter Prüflauf nach Fehlerstand (Gate (i2)); kaputtes Lockfile und package.json-Schreibfehler → 422 statt Wurf; Umgebung
`npm_config_ignore_scripts` ohne andere Schreibweise; Zielordner-Aufräumen mit Wiederholung; `SHA512_INTEGRITY` im reinen Modul
`inhalt.ts`; Zeitgrenze `installMs` einmal definiert; Hinweistexte des Prüflaufs (de/en/ru/tr) nennen die npm-Installation in einen
Temp-Ordner. Offen als Finding: F-1078 (b) Bericht mit übersprungenen Dateien lässt „Installieren“ aktiv (endet sicher in 422).

**Nächster Schritt: F-2b-2c** — Vormerken/Katalog für Sammlungseinträge ohne Katalog, „Eignung prüfen“ in der Capability
Library, Detail als volle Tabellenzeile (F-1068 (3)), F-1061 (1) mit eigenem Advisor-Pass (Ablage als Kern-Artefakt der
Workforce, ARCHITECTURE.md §2).

## Stand F-2b-2c

Branch `f45/f2b2c-sammlung-katalog`, Basis `ec4ad21` (main mit F-2b-2b, #327). Plan `features/F45/plan-f2b2c.md` (Plan v1 →
Advisor-Pass „überarbeiten“: Punkt 4 an zwei Stellen fail-open, Kern-Artefakt ungeeignet, Zuschnitt zu groß → Plan v2). Ist ≈ 0,5 AT
(Schätzung 0,3).

**Ziel erreicht (Gate F-2b-2 (j)):** Ein Sammlungseintrag ohne Katalog kommt ohne Handarbeit bis „Freigeben & installieren“:
Auswählen → Prüfbericht → „Vormerken“ (Auftrag mit JSON-Skelett inkl. `installation_vorlage`, freigabe OFFEN) → im Katalog
„Installieren“ mit dem Bericht der Sammlung (`waehleBericht` bindet an die Quelle, nichts umgeschlüsselt).

**Teil 1 (Server/Sicherheit):**
- F-1061 (1): `faehigkeiten.stand.json` neben der lokalen Datei (`src/faehigkeiten/stand.ts`, atomar, LF, mit Pfad), geschrieben
  vom Wächter nach Route und Bestätigung, gelesen beim Start. Startregel fail-closed (Advisor A1/A2): abweichend → Band „Stand vor
  dem letzten Neustart“ + Sperre; Stand fehlt/beschädigt/anderer Pfad bei vorhandener Datei → „kein gespeicherter Stand“ + Sperre
  (einmalig beim ersten Start mit F-2b-2c: Datei prüfen, „Datei geprüft – Stand übernehmen“). ARCHITECTURE.md §2: neue Ausnahme
  statt „lebt nur im Speicher“.
- F-1078 (b): `uebersprungenSperre` in `waehleBericht` — übersprungene Dateien im installierten Pfad sperren Vorbereiten (Knopf aus,
  Grund im Dialog) und Installation (409); der Inhalts-Abgleich nennt „im Prüflauf übersprungen (<grund>)“.
- Vormerken-Daten: `fakten.paket.bin_ziele`, `berichtKurz` mit typ, geprüftem `bin` (nur eindeutig und in der Dateiliste),
  `skill_md`, `uebersprungen`; Zustand des Prüflaufs trägt `bericht_kurz`; 422 „Werkzeuge“ nennt die angebotenen Werkzeuge.

**Teil 2 (Oberfläche):**
- Vormerken im Detail der Sammlung (`vormerkenHtml`, `baueSammlungVormerkenAuftragstext`, gemeinsamer Weg
  `vormerken-ablauf.js` mit dem Scout); nur in der Workforce; Gründe, warum nicht (Urteil, Typ, ganzes Repo, Pfad, SKILL.md).
- „Eignung prüfen“ im Sperrblock des Freigabedialogs der Capability Library (nur ohne geltenden Bericht); Ablauf-Steuerung aus der
  Sammlung herausgelöst (`views/pruefung-ablauf.js`), DOM-ids mit Präfix, Eingaben überleben das Neuzeichnen (D3).
- Detail der Sammlung als eigene volle Tabellenzeile (`colspan`, Knopf mit aria-expanded, F-1068 (3)).

**Tests/Gates:** `src/faehigkeiten/stand.test.ts` (neu), `routen-faehigkeiten.test.mjs` (4 Neustart-Fälle), `pruefbericht.test.ts`
(Sperre npm/Skill/höherer Pfad/gekürzte Liste/fehlende Angabe; Abgleich), `inhalt.test.ts` (bin_ziele), `routen-pruefung.test.mjs`
(berichtKurz, gepruefterBinPfad), `vormerken-auftrag.test.mjs`, `sammlung-anzeige.test.mjs`, `pruefung-anzeige.test.mjs`; Gate
F-2b-2 (f) übersprungene Datei → 409, (j) Sammlung → Katalog → Installation 200; Gate WS-5a (e) angebotene Werkzeuge.

**Register:** F-1056 erledigt; F-1061 (1), F-1068 (3), F-1078 (b) erledigt; neu F-1079 (K36, Terminalblock mit cd), F-1080 (K37,
Binärdateien nicht installierbar), F-1081 (Restpunkte der Prüfpässe).

**Prüfpass** (frischer Kontext): code-reviewer „freigegeben mit Hinweisen“ (keine kritischen Befunde; Startregel fail-closed, Sperre,
bin-Prüfung und Vormerken-Text bestätigt), qa „freigegeben mit Hinweisen“ (Hauptweg belegt, fünf mittlere Lücken), design-guardian
„nicht freigegeben“ (Knopfhierarchie, Knopfname in en/tr, Lücken im Render-Nachweis — kein Sicherheitsbruch). **Eine Korrekturrunde:**
ein laufender Ablauf „Eignung prüfen“ wird nicht überschrieben (Klick ignoriert, Knopf im Sperrblock deaktiviert; Code-Review 1, QA M2);
nach dem Bericht wird der veraltete Sperrblock verworfen, auch wenn ein anderer Eintrag gewählt ist (QA M1); Band „Noch kein
gespeicherter Stand“ mit eigenem Text und ohne „bekannt seit“ (QA M3, Code-Review 5); „Eignung prüfen“ und „Erneut versuchen“ primär,
„Erneut prüfen“ neben jedem Vormerken-Zustand sekundär (design-guardian 2/3); Knopfname in en/tr, „shortlist“ in en, ohne „(F-1078)“
in der Oberfläche (design-guardian 1/7/8); Sperrtexte des Servers nur noch mit dem Sachgrund (design-guardian 4); Warnung auch ohne
lesbare Angabe übersprungener Dateien (Code-Review 3); kaputte Listeneinträge → Sperre statt Wurf, übersprungener Ordner oberhalb des
installierten Pfads zählt (Code-Review 2); vorgemerkter Zustand bleibt nach „Erneut prüfen“ (QA M5 teilweise); Hinweistext zur Ref
(QA G2); ARCHITECTURE.md §2 genau wie der Code (Code-Review 4). Render-Nachweis ergänzt um Zoom 200 %, reduzierte Bewegung, ru/tr,
Warnung, Fehlerzustand und Band „unbekannt“ (`features/F45/nachweise/f2b2c/`). Bestätigungsprüfung design-guardian: „freigegeben mit
Hinweisen“ (zwei Hauptknöpfe im gesperrten Library-Dialog, doppelter Weg im Sperrtext, „(F-1078)“ im Servertext). Offen als F-1081.


## Stand B2a-1

Branch `f45/b2a1-projektkarte`, Basis `c62e7e7` (main mit F-2b-2c, #328). Plan `features/F45/plan-b2a1.md` (Plan v1 →
Advisor-Pass „freigegeben mit Hinweisen“ → Plan v2; O2 vom Challenger bestätigt).

**Projektkarte (F-1064, F-936, F-929):** `src/projektkarte` (`baueProjektkarte`, rein, deterministisch, je Lauf neu) mit Zuschnitt
je Rolle — architekt: Vorhaben, Bestand, Ausführungsrahmen, im Projekt eingeschaltete Fähigkeiten, Qualität; architecture-advisor:
ohne Fähigkeiten; code-reviewer: Vorhaben (AK nur als Verweis auf den AK-Block), Bestand (ARCHITECTURE.md als Prüfmaßstab, ADR-Text,
F-931), Qualität (DoD + Checkliste mit Urteil je Punkt, F-829). Größengrenze je Rolle (Marker zählt mit), Quellstand je Datei im Text,
eingebettete Überschriften auf Ebene 4. Der Server liest die Eingaben über die bestehenden Wege (`leseHarnessInventar`,
`leseEntschiedeneAdrs`, `leseVersionierteDateien`, `ladeFaehigkeitenGrundlage` — aus dem GET-Handler herausgezogen) und
`leseKarteDatei` (fail-open) für ARCHITECTURE.md, Projektbeschreibung und Checkliste. Einspeisen in `starteWorkflowSchritt` nach dem
AK-Block, für Claude und Codex gleich; `{ hash, abschnitte, fehlend }` als `projektkarte` in die Laufakte beider Gateways (Schema
additiv). Ausführung, jarvis und router bekommen keine Karte (Ausführung: Rahmen steht schon im Auftrag, DoD aus CLAUDE.md).

**Architekt (F-1065):** Karte auch im Modus „feature“, Capability-Auszug in beiden Modi (Feature fail-open), Lese-Anweisung
„[Fakt] mit Pfad“. **F-1066:** ARCHITECTURE.md in der Projektmodus-Allowlist; Stack-Instruktion verlangt Ordnerstruktur und
Datenzugriff; Regel 1h prüft sie als dritte Pflicht (`stackArchitekturFehlt`, auch im VERWEIGERT-Pfad). **F-1062:** Beobachtungsblock
nur für Worker claude-code.

**Tests/Gates:** `src/projektkarte/projektkarte.test.ts` (neu), Gate `scripts/check-f45-b2a1-projektkarte.mjs` (neu, in der
Check-Kette, Rot-Fälle kalibriert); begründet angepasst: check-f39 (n1), check-f42 (h3 → Rot-Fall F-1066, neu h4),
check-f35-ws2 (e), check-fixpaket-f35 (a), `review-beobachtung.test.mjs` (Worker-Parameter, F-1062), Rollenschlüssel als `Map`
(check-f17 AK1).

**Echter Lauf** (`features/F45/nachweise/b2a1/`): Architekt (Codex, Modus feature) gegen dieses Repo, 80 s, 160 684 Eingabe-
(104 832 aus dem Cache) und 1 949 Ausgabe-Tokens; Entwurf mit 6 Bestandsbelegen mit Pfad, ohne git-Schritt, Prüfung nur über
`npm run check:<name>`/`npm run check`. Der Entwurf fand einen echten Fehler (Kürzungsmarker über der Grenze) — behoben.

**Prüfpass** (frischer Kontext): code-reviewer „nicht freigegeben“ und qa „nicht freigegeben“ — beide aus demselben Grund: beim
Code-Reviewer schnitt die Gesamtgrenze (14 000) in diesem Repo den letzten Abschnitt Qualität (DoD, Checkliste, Urteil je Punkt) ab,
ohne dass die Laufakte es zeigte; das Gate prüfte nur kleine Eingaben. **Eine Korrekturrunde:** Bestand steht in jeder Karte zuletzt,
Grenzen 24 000/20 000/20 000; eine Gesamtkürzung nimmt den gekürzten Abschnitt aus `abschnitte` und nennt ihn in `fehlend` (QA L2);
Gate (k) mit den echten Eingaben dieses Repos (alle ADRs, git ls-files) für alle drei Rollen, Rot-Fall kalibriert; „nicht beschrieben“
nur ohne belastbaren Inhalt — eine gefüllte Datei mit anderen Titeln zeigt ihren Auszug (Code-Review 2, QA L4); Regel 1h mit
Unit-Test in `src/workflow` und VERWEIGERT-Pfad (check-f42 h5, Rot-Fall kalibriert; Code-Review 3, QA L5); Fehler je Quelle werden
Lücken statt Kartenverlust (Code-Review 5); unlesbare ressourcen.json im Feature-Modus als Lücke (QA L8); Quellstand der ADRs,
locale-unabhängige Sortierung (Code-Review 4); realpath-Prüfung in `leseKarteDatei` (Code-Review 8); viele Unterordner nur als
Anzahl (Code-Review 9); Codeblöcke behalten ihre Kommentarzeilen, ARCHITECTURE-Abschnitt bis 2 000 Zeichen (QA L10); leeres Repo
und fehlende CLAUDE.md ohne irreführende Lücke (QA L9); gemeinsame Konstante `ABSCHNITT_IDS` für Typ und Validator (Code-Review 6);
Kommentar zu den drei Schreibzielen (Code-Review 7). Offen in F-1082: Entscheidung QA L3 (Prüfmaßstab aus dem Arbeitsordner),
fehlende Tests Arbeitsordner und Controller → Claude-Gateway, Quellstand der Ordnerübersicht.

## Stand B2a-2

Branch `f45/b2a2-arbeitspaket`, Basis `b3fcbf9` (main mit B2a-1, #329). Plan `features/F45/plan-b2a2.md` (Plan v1 → Advisor-Pass
„nicht freigegeben“ (V1–V5) → Plan v2 mit E1–E4 → Advisor-Nachpass „freigegeben mit Hinweisen“ (H1–H5)). Der Bau der risikoarmen
Teile begann parallel zum ersten Pass (Abweichung vom Ablauf, im Plan vermerkt).

**Arbeitspaket = Auftrag v0 (F-938):** additive Felder `bereiche`, `risiko`, `feature_ref`, `einrichtung`, Herkunft `finding`;
Finding- und Feature-Akte-Aufträge brauchen ≥ 1 AK (`validiereAuftragPflichtfelder`, auch in `registriereAuftrag`, das jetzt vor
dem Schreiben prüft). `baueArbeitspaketBlock` ist die einzige Textquelle für Architekt und Ausführung; ein Auftrag ohne
Arbeitspaket-Feld bleibt bitgenau (Gate gegen festen Text aus `b3fcbf9`); das Review behält den AK-Block, die Projektkarte des
Architekten verweist auf den Block. Click-to-Work aus einem Finding zeigt zuerst einen AK-Entwurf aus der Maßnahme
(`public/leitstand/ak-entwurf.js`), angelegt wird erst mit „Auftrag anlegen“; das Formular nimmt AK nur mit Herkunft `finding` (E3).

**Feature-Bezug (F-989, teilweise):** Aufträge aus Feature-Akten tragen `feature_ref`; GET /api/auftraege und `baueVerknuepfung`
nutzen ihn vor der Referenzzeile; die Karte nennt die Akte.

**Einrichtung (F-1071):** Architekt-Ergebnis additiv `einrichtung` (Codex-Dialekt, Formblock der Instruktion, E1); Übernahme als
Auftragsversion über `registriereAuftrag` im Nachlauf und vor jedem Ausführungsstart (`gleicheEinrichtungAb`: gleiche Folge
Schritt/wann → keine Version, Abhaken bleibt; ungültiges Ergebnis löscht nichts und lehnt den Bau ab). Startsperre zentral in
`starteWorkflowSchritt` und als Vorprüfung in POST /freigabe (409 `einrichtungOffen` mit Grund, nichts festgehalten). Leitstand:
Karte „Arbeitspaket“ der Freigabe-Seite und Timeline zeigen „Einrichtung durch dich“ mit „Erledigt“/„Wieder öffnen“
(POST …/einrichtung, CSRF/Host zentral, Laufsperre, Abgleich über den angezeigten Text, nach Ablaufende gesperrt).

**QA L3 (F-1082 (7)):** Die Review-Karte liest CLAUDE.md (DoD) und ARCHITECTURE.md per `git show` aus dem Stand vor dem Bau
(Basis-Commit des Arbeitsordners, sonst `workflow.basis_commit` = HEAD beim ersten Schrittstart der ersten Fassung; vom Server
gesetzt, aus eingereichten Fassungen nicht übernommen); geänderte Maßstabsdateien stehen als „Prüfmaßstab im Bau geändert:
<Datei> — die Änderung ist Teil des Reviews“, ein nicht lesbarer Vorher-Stand als Lücke in `fehlend`.

**Tests/Gates:** Gate `scripts/check-f45-b2a2-arbeitspaket.mjs` (neu, in der Kette; Mutationen kalibriert: Block immer an, Sperren
aus, Vorher-Stand aus, zentrale Sperre aus → jeweils rot); Unit-Tests `src/auftrag`, `src/projektkarte`, `ak-entwurf.test.mjs`,
`entwicklung-daten.test.mjs`, `workflow-detail.test.mjs`, `workflow-entscheiden.test.mjs`, `workboard-detail.test.mjs`; begründet
angepasst: `projekt-wechsel.test.mjs` (Click-to-Work öffnet erst den Entwurf; Body mit Herkunft und AK geprüft).

**Prüfpass** (frischer Kontext): code-reviewer „freigegeben mit Hinweisen“, qa und design-guardian „nicht freigegeben“ (u. a.
bestehender Test rot, zentrale Sperre ohne Rotfall, basis_commit zu spät, zweite Live-Region, Nachweis unvollständig). **Eine
Korrekturrunde:** Test umgestellt plus Abbrechen-Test, Rotfall (d2) für die zentrale Sperre, echter Selbsttest (h), basis_commit nur
beim ersten Start und serverseitig, Abhaken mit Textabgleich und Statusprüfung, Entwurf bleibt nach Anlegefehler, Trim im
Architekt-Validator, git-Fehler ≠ „fehlt“, Live-Region entfernt (Fokus), Label und Knopfnamen über i18n, Hierarchie und
Zurücknahme in der Karte, Render-Nachweis mit Zoom 200 %, reduzierter Bewegung, hell und aufgeklappter Timeline
(`features/F45/nachweise/b2a2/`). Rest: F-1083.

## Stand B2a-3a

Branch `f45/b2a3-codex-review`, Basis `a6d3411` (main mit B2a-2, #330). Plan `features/F45/plan-b2a3.md` (Plan v1 → Advisor-Pass
„nicht freigegeben“ (B1–B5) → Entscheidungen Stefan (Teilung, Vorrang) → Plan v2 → Advisor-Nachpass „freigegeben mit
Hinweisen“ (V1–V3) → Entscheidung Stefan zu V3 → Plan v2.1). Gebaut erst nach dem Nachpass (F-1084).

**Spec und Policy (F-1063):** `docs/projekt/codex-review-spec.md` mit Kopf „Umsetzung in der Workforce“ und Stefans Spec wörtlich
(Gate: sha256 des Spec-Teils). `src/review-policy` ist die einzige Quelle der Policy (`review-policy-1`): fünf Dimensionen plus
Sicherheitsdefekte, „Explizit nicht beauftragt“, Kritik an früheren Architekturannahmen, „Grüne Tests sind kein
Korrektheitsbeweis“, Lücken der Karte als nicht geprüft, Vorrang vor der Karte, Ausgabevertrag je Befund und der Satz „Keine
belastbaren Findings im geprüften Scope“. Der Server hängt sie an jeden code-reviewer-Auftrag (Codex und Claude) hinter Karte und
Beobachtungsblock; die Version geht über Execution-Controller und beide Gateways in die Laufakte (`review.policy_version`).

**Schema v2:** `ergebnis-code-reviewer` je Befund `id`, `dimension`, `evidenz`, `korrekturrichtung` (in `required`, nullable),
Schwere KRITISCH; Ergebnisse v1 bleiben lesbar. Der geprüfte Stand ist kein Modellfeld (B2a-3b, Laufakte).

**Fehlerfälle (Spec §9.8):** Regel 1k in `ermittleNaechstenSchritt` (nach 1b und 1i, an `output_schema` gekoppelt, nur Läufe mit
Policy-Version): leere Befunde ohne den Satz → KLAERUNG_ERFORDERLICH mit Grund, keine automatische Anpassung; Ausweg in der
Abnahme „Anpassung wünschen“ oder „Ablehnen“. Fehlende Pflichtwerte je Befund und Kontextlücken der Karte → sichtbare Hinweise
ohne Halt. GET …/abnahme kennt `fehlgeschlagen` (mit Grund und Lauf) und `nicht_gelaufen_klaerung`; `reviewHinweise` zeigt alles im
Blick, im Vorab-Block (KLAERUNG) und in der Review-Kachel; Befunde v2 mit ID, Dimension, Evidenz, Korrekturrichtung.

**Ausgaberegel (F-959 Jarvis, F-998):** `REGEL_DIREKT_AUSFUEHRBAR` und `REGEL_DEINE_SCHRITTE` in `src/jarvis`; erste Zeile jedes
Blocks `cd` auf den vollen Projektpfad, vom Server eingesetzt.

**Tests/Gates:** Gate `scripts/check-f45-b2a3-codex-review.mjs` (neu, in der Kette; 14 Rotfälle kalibriert); Unit-Tests
`src/review-policy`, `src/workflow` (Regel 1k), `src/jarvis`, beide Gateways (`review` in der Laufakte), `workflow-abnahme.test.mjs`;
Beispiel `schemas/examples/kontrollzustand-laufakte-review.valid.json`; begründet angepasst: `check-f15-automat-real.mjs` (Fixture
mit Pflichtsatz, sonst hielte der Grünfall nach Regel 1k). Render-Nachweis `features/F45/nachweise/b2a3/`.

**Prüfpass** (frischer Kontext): code-reviewer, qa und design-guardian je „freigegeben mit Hinweisen“. **Eine Korrekturrunde:**
Satzvergleich ohne Groß-/Kleinschreibung und mit NFC (Code-Review 1), Vertragsprüfung nur nach den Regeln der Policy-Version des
Laufs (`pruefeReviewErgebnisFuer`, Code-Review 3), Gate-Erwartung aus `DIMENSIONEN`/`EVIDENZEN` und Rotfälle für Policy-Kopplung,
Server-Quelltext und cd-Zeile (14 statt 10; Code-Review 4/5), Satz zum Ausgabeformat ohne Schema in der Policy (Code-Review 7; der
Policy-Text war noch nicht ausgeliefert, deshalb gleiche Version, neuer Hash im Gate), `baueProjektCdZeile` und `baueCdRegelZeile`
(Code-Review 6/8), Ursache eines gescheiterten Reviews (Zeitgrenze, Werkzeugausfall, verweigert) im Halt-Grund über
`SchrittErgebnis.ursache` (qa 1, Code-Review 2), Review VERWEIGERT als HTTP-Fall (qa TC-13), Empfehlung des Reviewers und Satz zum
nächsten Schritt in der Notiz, „nicht lesbar“/„Laufakte fehlt“ sichtbar (qa 2/3), Notiz nur einmal mit Zählzeile im Blick, Urteil
bei verletztem Vertrag neutral, Servertexte in `lang="de"`, übersetzter Status, Listenumbruch über die bestehende Notizregel
(design-guardian 1–5). Render-Nachweis neu erzeugt. Rest: F-1085.

**Belege der Bestehensbedingung:** 1 Projektkarte → B2a-1 (#329); 2 Arbeitspaket → B2a-2 (#330); 10 „Stefan muss keinen
Zwischentext lesen“ → B2a-3a (Jarvis „Deine Schritte“, Review-Hinweise statt stiller Status) und B2b („Bereit zum Sichern“).
Echter Codex-Lauf mit Schema v2 (Merge-Bedingung, nachgezogen mit B2a-3b): belegt am 13.10.2026 —
`features/F45/nachweise/b2a3/codex-review-lauf.md` (Lauf `0960f9cc-7d6d-4fe9-a37e-843daded8dd8`, codex/`gpt-6-astra`, Vorlage
standard): Schema im Strict-Modus angenommen (nullbare Enums ohne Fehler), Befund B1 mit `id`, `dimension`, `evidenz`,
`korrekturrichtung`, Laufakte mit `review.policy_version`. Der Fall „leere Befunde mit Pflichtsatz“ trat im echten Lauf nicht ein
(belegt über Gate f45-b2a3 (e3/e4) und Unit-Tests). Befund B1 des Laufs → F-1085 (11), behoben in B2a-3b.

## Stand B2a-3b

Branch `f45/b2a3b-review-stand`, Basis `2fd1ac5` (main mit B2a-3a, #331). Plan `features/F45/plan-b2a3b.md` (Plan v1 → Advisor-Pass
„freigegeben mit Hinweisen“ (N1–N6) → Plan v2 → Bau → Prüfpass → eine Korrekturrunde → qa-Nachpass).

**Nachweis B2a-3a nachgezogen:** kein eigener Nachweis-Commit auf `f45/b2a3-codex-review` (`f912773` = Baum von `2fd1ac5`);
übernommen wurden genau die ungesicherten Dateien `features/F45/nachweise/b2a3/codex-review-lauf.{mjs,json,md}` (echter Lauf
`0960f9cc-…`) und F-1085 (7)/(11). Daraus F-1086 (Merge erst nach echtem Lauf, Nachweis auf dem Remote-Branch prüfen).

**Geprüfter Stand (F-1063, Spec §9.6):** `src/review-stand` — Inhalts-Fingerabdruck `{ commit, inhalt }` des Laufordners nach
Advisor B1: `ls-tree -r -z HEAD`, `diff-index --raw -z --no-renames HEAD`, `ls-files --others --exclude-standard -z`, Inhalte
über `hash-object --stdin-paths` ohne `-w` (erst `--no-filters` gegen den HEAD-Blob, dann mit EOL-Umwandlung — CRLF in beiden
Lagen ohne Fehlalarm, am Wegwerf-Repo geprüft), gelöschte fallen weg, Ausschluss über `istAusnahmePfad` in JS, Toplevel-Prüfung,
Filter-Treiber und Submodule → nicht bestimmbar mit Grund, Gesamtbudget 5 s, Kappen, maxBuffer. Ein Ablauf als Generator, zwei
Hüllen: synchron beim Start des code-reviewer-Schritts (Laufakte `review.geprueft_stand`/`stand_grund`, Schema + Validator), asynchron
in GET …/abnahme nur bei offener Abnahme, Laufort über `ermittleLaufort` (fail-closed), 10 s Zwischenspeicher je Laufort (Poll).
Projektion `urteil` additiv `geprueft_stand`, `aktueller_stand`, `veraltet` (true/false/null), `stand_grund`; „veraltet“ nur über
`inhalt` (ein Commit derselben Inhalte zählt nicht). Anzeige über `reviewHinweise`: „Review veraltet — …“ (mit nächstem Schritt)
und „Stand des Reviews nicht bestimmbar: …“, amber, in Review-Kachel und Zählzeile „Auf einen Blick“; das Render-Kennzeichen
der Abnahme enthält die Hinweise (`reviewHinweisKennung`), damit der Poll neu zeichnet. Rein lesend: Index und `.git/objects`
bleiben unverändert (Gate misst es je Aufruf). Kein neuer `starteWorkflowSchritt(`-Aufruf.

**Befehlsblöcke (F-959 Leitstand):** `cdZeile` (eine Quelle für Leitstand, „Wo gearbeitet wird“ und Jarvis; `-LiteralPath` bei
`[ ] * ?` und Backtick), `befehlsBloecke`; „Sichern“ (#/code, Workboard) als [cd, add…, commit] und [cd, push], ohne origin ein Block,
„Prüfstand“ [cd, Prüfbefehl], ohne Pfad ein Grund; je Block ein „Kopieren“. Workboard-„Sichern“ nach einem Ablauf im
Arbeitsordner zeigt den Projektordner — nicht gelöst, F-1087 (B2b).

**F-1085:** (6) HTTP-Fall „Projektion folgt dem neuesten Review-Lauf nach ANPASSUNG“ (Gate (e6)); (7) Nachweis; (11)
`pruefeReviewErgebnis` meldet leere `fundstelle`/`zusammenfassung`/`beleg` als Hinweis (gleiche Policy-Version, Kopfkommentar
präzisiert). Rest (1)(2)(3)(4)(5)(10) → B2b, (8)(9) → UX nach F30.

**Tests/Gates:** neues Gate `scripts/check-f45-b2a3b-review-stand.mjs` (in der Kette nach f45-b2a3; 14 Rotfälle kalibriert);
Unit-Tests `src/review-stand` (neu), `src/review-policy`, beide Gateways, `code-daten.test.mjs`, `workflow-abnahme.test.mjs`,
`routen-code.test.mjs` (führt jetzt [cd, git add] real in PowerShell aus einem fremden Ordner aus). Bewusst angepasst:
`check-f45-b2a3-codex-review.mjs` (b) vergleicht nur noch `review.policy_version` statt des ganzen Objekts (Advisor N1; den
geprüften Stand prüft f45-b2a3b (b) gegen den echten Fingerabdruck); `check-f6a-claude-code-gateway.mjs` (e) führt die
Review-Beispiele (valid + neues invalid) aus (N6). Render-Nachweis `features/F45/nachweise/b2a3b/`.

**Prüfpass** (frischer Kontext): design-guardian und code-reviewer „freigegeben mit Hinweisen“, qa „nicht freigegeben“ (Kennzeichen
ohne Stand-Felder). Eine Korrekturrunde (Liste im Plan, Abschnitt „Prüfpass und Korrekturrunde“), qa-Nachpass „freigegeben mit
Hinweisen“. Grenzen: F-1088. Korrekturrunde nach dem Challenger (CI, Node 24 Linux): `fuehreGitAsync` meldete eine
Zeitgrenze teils als Erfolg mit leerer Ausgabe (Node-execFile-Wettlauf, vorbestehend) — jetzt eigener Merker, Ablauf immer
`abbruch: 'zeitgrenze'`, Tests im Git-Starter (F-1089).

**Belege der Bestehensbedingung, B2a abgeschlossen (mit dem Merge von B2a-3b):** 1 Projektkarte → B2a-1 (#329); 2 Arbeitspaket →
B2a-2 (#330); 10 „Stefan muss keinen Zwischentext lesen“ → B2a-3a (Jarvis „Deine Schritte“, Review-Hinweise statt stiller
Status) und B2a-3b („Review veraltet“ sichtbar statt eines stillen alten Urteils; Befehlsblöcke direkt ausführbar mit cd);
„Bereit zum Sichern“ folgt mit B2b.

## Stand F-3a

Branch `f45/f3a-plugins-bestand`, Basis `bcffea7` (main mit B2a-3b, #332). Plan `features/F45/plan-f3a.md` (Plan v1 → Advisor-Pass
„überarbeiten“ (H1 Messlücke, H2 `plugin.json`-Felder, M1–M7, Zuschnitt zu groß) → Entscheidungen Stefan → Plan v2 → Delta-Advisor
„freigegeben mit Auflagen“ 1–6 → Spike → Bau). Entscheidung Stefan 13.10.2026: dieselben Plugins wie in Claude Code — Quelle ist sein
installierter Bestand, nicht die Sammlung.

**Entscheidungen Stefan (14.10.2026):** E-F3a-1 Quelle = `claude plugin list --json` (die CLI legt dabei in `.in_use/` der
synced-Plugins eine Marke an und löscht sie wieder — gemessen, als Nebenwirkung angenommen; keine Datei trägt den Aktiv-Stand der
synced-Plugins); E-F3a-2 F-3 geteilt in F-3a-1 (dieser Stand), F-3a-2 (Oberfläche) und F-3b (Plugins im Lauf); E-F3a-3 Spike mit
Stefans Konto wie jeder Lauf.

**F-3a-1 gebaut:** `src/claude-plugins` liest je Plugin Name, Marketplace, Version, Commit (`installed_plugins.json`), Aktiv-Stand
(mit Projektbezug bei `scope local`), Pfad, Inhalts-Hash (Form wie `berechneInhaltHash`, ohne `.git/` und `.in_use/`, Grenze
5 000 Dateien / 50 MiB, Symlink → kein Hash mit Grund), Lizenzdatei/-feld und die Bestandteile aus den Standardorten und den sechs
`plugin.json`-Feldern (Pfad, Liste, eingebettet; unbekannte Form → Teilfehler). Risiken als Fakten: `hook_befehl`, `mcp_ungepinnt`,
`mcp_entfernt`, `rechte_ausserhalb` („nicht wörtlich im Werkzeugsatz ‚schreibend‘“), `externe_wirkung` (erstes Wort des Befehls,
nacktes Bash/`Bash(*)`, Web-Werkzeuge). `env`/`headers` werden nie gelesen. Route GET `/api/plugins` je Projektinstanz (cwd =
Projektordner, unverändertes `starteProzess`, Zeitgrenze 10 s, geteilter Abruf ohne gemerktes Ergebnis, Maskierung über alle Strings,
Fehlerstand 200 mit Grund). Eingebaute Plugins getrennt (Referenzliste + `@builtin` aus der Liste). Kein Lauf geändert: kein
`--plugin-dir`, kein Import im Lauf-Code, Init-Gate unberührt, `init.plugins` bleibt `[]`.

**Stefans Bestand** (Gegenprobe gegen `claude plugin details`: 4 von 4 gleich): superpowers 6.2.0 (inaktiv; 14 Skills, SessionStart-Hook),
gitkraken (aktiv; 1 MCP `npx -y @gitkraken/gk` ungepinnt), design (aktiv; 7 Skills, 9 entfernte MCP-Server), cowork-plugin-management
(aktiv; 2 Skills, keine Treffer der Regeln).

**Spike** (`features/F45/nachweise/f3a/spike.md`, CLI 2.1.299, Startargumente eines Laufs + `--plugin-dir`): (a) `init.plugins` =
`spike-plugin@inline`, Skills/Agents/Commands mit Präfix `<plugin>:`; unter `--setting-sources project` erscheinen Stefans
synced-Plugins nie, mit den heutigen Settings bleibt `init.plugins` `[]` (kein drittes eingebautes Plugin im `-p`-Lauf); (b) Plugin-Hooks
laufen (SessionStart, UserPromptSubmit, PreToolUse); (c) `allowed-tools` eines Commands erweitert den Werkzeugsatz (`gh pr comment`
lief über den Command, ohne Command verweigert — `gh` war eine Attrappe, kein Remote, Token leer); (d) `enabledPlugins:false` wirkt auf
ein `--plugin-dir`-Plugin. Ein leerer Ordner `~/.claude/plugins/data/spike-plugin-inline` stammt vom Spike (Löschen durch Stefan).
F-3b neu geschätzt ≈ 1,0–1,25 AT (F-1090).

**Register:** F-910 Nachtrag; F-1052 → B2b (mit F-1072); F-1051 Nachtrag (F-3b); neu F-1090 (F-3b). Vermerk in
`docs/harness/kandidaten-2026-09-15.md` unter der Plugin-Tabelle (Code Review gestrichen, Playwright-Plugin ungepinnt, Claude Code
Setup ein read-only Skill).

**Tests/Gates:** Unit-Tests `src/claude-plugins/plugins.test.ts` (11), neues Gate `scripts/check-f45-f3a-plugins.mjs` (in der Kette nach
f45-b2a3b; Fixture `scripts/_plugin-fixture.ts`; 20 Rotfälle kalibriert).

**Prüfpass** (frischer Kontext): code-reviewer „freigegeben mit Hinweisen“, qa „nicht freigegeben“ (Geheimnis als eigenes
`args`-Element unmaskiert, `allowed-tools` gequotet/leerzeichengetrennt verfehlt, Leerbestand ungetestet). Eine Korrekturrunde:
Maskierung Flag + Folgeelement (`maskiereArgs`), Regel-Zerlegung (Anführungszeichen um den ganzen Wert, Leerraum als Trenner),
YAML-Liste ohne Einrückung, `cmd /c`, `pipx run`/`--spec`, `uvx --python`, PowerShell-Regeln, leere url, einzelner kaputter
Listeneintrag kippt nicht die Liste, stderr an Wortgrenze gekürzt, Lesefehler einmal gemeldet, `ordner_fehlt`-Flag, Grenze und
Link-Bericht bei der `.md`-Suche, geteilter Abruf ohne Wurf-Falle, maskiertes Log, `instanz_pfad` statt `projekt_pfad` auf oberster
Ebene; Leerbestand gemessen (CLI ohne Plugins/Anmeldung: `[]`, Exit 0) und als `ok` ohne Plugins festgelegt. Gate um Junction,
Zeitgrenze über `listenErgebnisAusProzess`, Läufer-Prüfung, Leerbestand, drei Geheimnisse, Ankunftszähler statt fester Wartezeit
erweitert (30 Rotfälle); Unit-Tests 13. Rest F-1091.

## Stand F-3a-2

Branch `f45/f3a2-plugins-anzeige`, Basis `a427f0b` (main mit F-3a-1, #333). Plan `features/F45/plan-f3a2.md` (kein eigener
Advisor-Pass, reine Anzeige auf fertiger Route — Auftrag Stefan). Nachweise `features/F45/nachweise/f3a2/`.

**Messung F-1091 (2)** (`messung-scope-local.mjs`, isolierter `CLAUDE_CONFIG_DIR`, nichts unter `~/.claude`; echter
`~/.claude/plugins` 0 Abweichungen): Mess-Plugin mit scope local in Ordner A — `enabled` aus A `true`, aus B und C `false`,
nach `disable` überall `false`; `projectEnabled` immer `false`. **`enabled` hängt vom Arbeitsordner des Aufrufs ab.**

**Gebaut:** Reiter „Plugins aus deinem Claude Code“ im Unterregister der Capability Library (`index.html`, `views/plugins.js`,
reine Anzeige `plugins-anzeige.js`, `api.js` `holePlugins` präfigiert je Projektinstanz). Fester Hinweis „Noch nicht im
Workforce-Lauf nutzbar — kommt im nächsten Schritt.“ (Challenger 14.10.2026: keine interne Kennung im sichtbaren Text, Gate (b)). Liste: Name, Marketplace, Version, Status; bei scope ≠ user „Je nach Ordner“ mit Scope und
Installationsprojekt unter dem Namen; Marken „N Risiken“/„Teilfehler“. Detail: Kennwerte (ID, Commit und Inhalts-Hash voll, Scope,
Aktiv, Plugin-Ordner, Lizenz), Risiken als Fakten mit Anzahl, Bestandteile aufklappbar (Skills/Commands mit allowed-tools, Agents mit
tools, Hooks mit Ereignis/Matcher/Befehl, MCP mit gepinnt ja/nein, LSP), leere Arten in einer Zeile, Teilfehler. `aktiv` bei scope
local: „laut Abruf aus <instanz_pfad>“ + Installationsprojekt + Messhinweis; scope project/unbekannt „nicht gemessen“. Eingebaute
getrennt mit Messversion der Referenzliste (F-1091 (1)). Leer und unlesbar (Route oder Abruf, Zeitlimit mit eigenem Text) mit Grund;
Ladezeit im Kopf. Gelesen nur bei Wechsel auf den Reiter (bzw. Klick, solange nach Projektwechsel nichts geladen ist) und per „Neu
laden“ bei gewähltem Reiter; Projektwechsel setzt nur zurück, Überholschutz. Keine Aktivierung, kein Knopf mit Wirkung. Typ
`PluginAntwort` in `src/claude-plugins/types.ts` (F-1091 (18)). Route-Semantik und Lauf unverändert.

**Tests/Gates:** `public/leitstand/plugins-anzeige.test.mjs` (15; erster Lauf rot am fehlenden Modul), neues Gate
`scripts/check-f45-f3a2-anzeige.mjs` (in der Kette nach f45-f3a; Fixture über die echte Route, XSS je Quelle, kein Abruf ohne
Reiterwahl, `starteWorkflowSchritt(` 6×; 42 Rotfälle kalibriert).

**Render-Nachweis** (`render/`, Fixture-Instanz `instanz.mjs` auf Port 4199, Pfade neutralisiert): 11 Folgen — 1440/390, hell/dunkel,
de/en/tr/ru, 200 %, Liste, Detail mit Hook- und MCP-Risiko (aufgeklappt), scope local, Teilfehler, leer, unlesbar; kein waagerechter
Überlauf.

**Prüfpass** (frischer Kontext): code-reviewer „mit Hinweisen“, qa und design-guardian „nicht freigegeben“ (Aktiv-Hinweis widersprach
der Messung; Reiterleiste nicht im Nachweis; Silbentrennung in Kennungen; Spezifität der Abstände; Detail ohne Gliederung und zu lang;
Risiken nur im Detail; Gate (e)/(f) zu weich). Eine Korrekturrunde, Nachpass aller drei „freigegeben mit Hinweisen“; kleiner Nachzug
(Klick lädt bei „nicht geladen“, i18n-Schlüssel abgesichert, vier Rotfälle). Rest F-1093.

**Register:** F-910 Nachtrag (Anzeige erledigt, offen nur F-3b); F-1091 Stand (1)(2)(18) erledigt, (4) entschärft; neu F-1093.

## Stand F-3b-1

Branch `f45/f3b1-plugins-freigabe`, Basis `8ac4647` (main mit F-3a-2, #334). Plan `features/F45/plan-f3b.md` (Plan F-3b gesamt;
Advisor-Pass „überarbeiten“, Delta-Advisor „freigegeben mit Auflagen“, verbindlich v2.1). Nachweise `features/F45/nachweise/f3b1/`.

**Entscheidungen Stefan (14.10.2026):** Plugin-Skills/-Agents sollen im Workforce-Lauf nutzbar sein, Zuordnung je Rolle.
E-F3b-1 = A Hooks nie im Lauf (die Workforce nennt zugeordnete Skills über die Fähigkeiten-Instruktion im Auftrag); E-F3b-2 = A
Brainstorming/Coach erst mit B5a. Nach dem Advisor-Pass: E-F3b-3 zuordenbar nur die Ausführung (einziger Fähigkeiten-Weg in den
Lauf), E-F3b-4 Kopie unter `~/.ai-workforce/plugin-kopien`, E-F3b-5 Commands nicht zuordenbar, E-F3b-6 Agent-`tools` Pflicht wie
Projekt-Agents. Übernommen aus der Challenge: gefilterte, gepinnte Kopie; Freigabe nur mit Prüfbericht über die Kopie; Zuordnung
additiv in der lokalen Datei, Standard leer; Risiko-Fakten aus Texten; maßgeblich die Workforce-Freigabe, nicht `enabled` (F-1093 (2)
geschlossen); nur Worker claude-code.

**Gebaut (1a Server, 1b Oberfläche, getrennt stagebar):** `src/plugin-kopie` (Positivliste je Bestandteil, Frontmatter fail-closed
inkl. BOM/`--- `/Leerzeile, Sperrnamen in Normalform, Grenzen und Pfadregeln des Prüflaufs, Manifest neu, `kopie_hash`, Schreiben
inhaltsadressiert ohne Überschreiben, eine Auflösung der Plugin-id, Freigabe-Zustand mit Vorrang); Prüflauf wiederverwendet
(`starteEignungspruefung` mit `holen`, neutralisierte Temp-Kopie, Quelle `art: plugin`, Auftrag ohne Befehle/URLs); lokale Datei
additiv `plugin_freigaben`/`plugin_zuordnung`, alle Schreibwege erhalten beide Felder; Routen `…/plugins/pruefung` (nur
Workforce-Instanz), `…/plugins/freigabe` (Reihenfolge N1, Laufsperre nach dem Abruf erneut), `…/freigabe/ruecknahme`,
`…/plugins/zuordnung`; GET `…/plugins` mit Workforce-Stand je Plugin und verwaisten Einträgen; Risiko-Fakten aus Texten (push/merge/PR,
worktree, Subagenten, Inline-Shell) und Agent-Werkzeugen; Leitstand: Prüfung und Freigabe, Übernahme, Zuordnung je Rolle, verwaiste
Einträge, Sperren (Lauf, Datei ungültig/fremd geändert). Kein Lauf geändert (Startargumente, Init-Gate, `init.plugins` `[]`).

**Tests/Gates:** Kernmodule Tests zuerst (rot 12:18); neues Gate `check-f45-f3b1-freigabe.mjs` (a)–(o), 40 Rotfälle; angepasst
`check-f45-f3a2-anzeige.mjs` (Hinweistext; Timer nur im Warten auf den Prüflauf, Neuladen nur in derselben Generation).

**Prüfpass:** code-reviewer „mit Hinweisen“, qa und design-guardian „nicht freigegeben“; eine Korrekturrunde (fester Werkzeugsatz
der Projektion, Prüfen nur in der Workforce-Ansicht, verwaiste Einträge, Fremdänderung sperrt, Bericht überholt, 404 ohne Wirkung,
Generation bei Projektwechsel, V10-Knöpfe, keine eigene Live-Region, Fokus, Reihenfolge, Gate-Rotfälle (k)/(b2) echt). Rest F-1094.

**Grenzen:** Eine Freigabe gilt nur im Checkout, dessen Kontrollzustand den Prüfbericht trägt (sonst „Bericht fehlt“); die Zuordnung
wirkt nur in Ausführungsschritten mit Werkzeugsatz `schreibend` und erst mit F-3b-2. Ein Checkout ohne F-3b-1 hält die lokale Datei
mit Plugin-Feldern für ungültig — bis zum Merge keine echte Plugin-Freigabe in Stefans Datei.

**Register:** F-910, F-1051 Nachtrag; F-1090 teilweise; F-1091 (3)(5)(12) Stand; F-1092 Nachtrag; F-1093 (2) geschlossen; neu
F-1094. **Ist F-3b-1 ≈ 0,95 AT** (beauftragt 0,5; Grund: Auflagen des Advisor-Passes — 16 Auflagen und Delta-Auflagen, Teilung in Server und Oberfläche); F-3b-2 nach Plan ≈ 0,6 AT.

**Vor dem Merge (Challenger 14.10.2026):** F-1094 (8) Fokus nach Aktionen (Statusbereich, Meldung bzw. nächstes Bedienelement, Liste nach dem Entfernen; Statusmeldungen über die feste Live-Region `#plugins-status`) und F-1094 (9) Werkzeugsatz `null` = „unbekannt“ (kein Rückfall per `??`; Fakt sichtbar, keine Bewertung im Satz; Gate (o)). Gezielte Nachpässe design-guardian (Fokus) und code-reviewer ((9)), keine weitere Korrekturrunde.

## Stand B2b-4a-1

**Auftrag:** B2b-4 „Bereit zum Sichern“ (F-979, F-1087, F-1085 (5)), nach zwei Advisor-Pässen „zu groß“ geteilt (Challenger,
19.10.2026): 4a-1 Server (dieser Stand), 4a-2 Befehlsform und Anzeige, 4b Jarvis. Verlauf: `plan-b2b4.md` → `advisor-b2b4.md` →
`plan-b2b4a.md` → `advisor-b2b4a-delta.md` → `plan-b2b4a1.md` → `advisor-b2b4a1-delta.md` (Freigegeben mit Hinweisen).

**Gebaut (nur Server, keine Oberfläche):** `scripts/leitstand/ablauf-sichern.mjs` (eine Liste der Gründe, `arbeitsordnerGrund`
für die 409, `leiteSichernLageAb` nach `ermittleLaufort.ok`, `mitAblauf`); `scripts/leitstand/kennung.mjs`
(`LAUFID_UNZULAESSIGE_ZEICHEN` aus dem Server, `pruefeAblaufKennung`); GET `/api/code` und `/api/code/diff` mit `?workflow=<id>`
(403 → 400 → 404 → 409 → 200, Laufort aus dem Kontrollzustand, Aufbau je Laufort geteilt, Handler-Option `codeGit`; ohne Parameter
bitgleich); `ermittleLaufort` liefert zusätzlich `bedarf`. Ausgleich der Wachstumsbremse: `entferneCodezaun`,
`entferneAeusserstenCodezaun`, `extrahiereErstesJsonObjekt` nach `scripts/leitstand/text-auszug.mjs` (Server exportiert sie weiter);
Server 13 416 → 13 366 Zeilen, Grenze gesenkt.

**Tests/Gates:** neues Gate `scripts/check-f45-b2b4a1-sichern.mjs` (a)–(e) mit echtem Worktree aus dem Startweg; Unit-Tests
`ablauf-sichern.test.mjs`, `kennung.test.mjs`, `text-auszug.test.mjs`. Mutationsproben (Ort, Zusatzfeld ohne Parameter, Regel
„kein Arbeitsordner“, Formprüfung, laufende Vorbereitung/Aufräumen, Windows-Alias, Mehrfachparameter) je rot.

**Prüfpass:** code-reviewer und qa „Freigegeben mit Hinweisen“; eine Korrekturrunde: 409 `inVorbereitung` auch bei laufendem
Aufräumen mit noch vorhandenem Ordner, 404 für einen Windows-Alias der Kennung, 400 bei mehrfachem Parameter, Texte für
GESTOPPT/`nichtBestimmbar`/`keinArbeitsordner`, Grenzen im Modulkopf, Gate um geteilten Aufbau, Vorbereitung läuft, aufgeräumt,
Bestand, 200 Zeichen, Alias, Mehrfachparameter und 403 vor 400 erweitert. Auflagen an 4a-2: F-1157; Rest F-1158.

**Nachweis:** `nachweise/b2b4a1/powershell-versuch.md` (Vorabversuch Blockform in Windows PowerShell 5.1 für 4a-2).

**Register:** Nachtrag F-979, F-1087 (Server-Teil gebaut, Anzeige folgt); neu F-1154 (Speichermangel beim vollen Check), F-1155
(„noch nicht auf main“ ≠ ungepusht), F-1156 (Commit-Vorschlag mit Ablauf-ID), F-1157 (Auflagen an 4a-2), F-1158 (`.git`-Verweis
im Arbeitsordner, Windows-Aliasse der Workflow-Routen).

## Stand B2b-4a-2a

**Auftrag:** B2b-4a-2 „Bereit zum Sichern — Anzeige und Befehlsform“, nach dem Advisor-Pass „knapp zu groß“ geteilt (Challenger,
19.10.2026): 4a-2a Blockform (dieser Stand), 4a-2b Anzeige nach dem Merge. Verlauf: `plan-b2b4a2.md` → `advisor-b2b4a2.md` →
`plan-b2b4a2a.md` → `advisor-b2b4a2a-delta.md` (Freigegeben mit Hinweisen).

**Gebaut (nur Client-Regel, Server unberührt):** `public/leitstand/code-daten.js` `befehlsBlock` (eine Regel) mit `ortZeile`
(`Set-Location -LiteralPath <psArgument> -ErrorAction Stop`), `BLOCK_KOPF`/`BLOCK_FUSS`, `istBlockform`; `befehlsBloecke` baut jeden Block
darüber ⇒ Sichern (commit- und push-Block), Prüfstand und der Orts-Block in „Auftrag anlegen“ in der Form `& {` / Ort / Befehle / `}`
ohne Einzug. `befehlsblock.js`: Kopf/Fuß zählen nur bei Blockform nicht; unter jedem Block in Blockform „Nach dem Einfügen einmal Enter
drücken“ (`befehl.enterHinweis`, de/en/tr/ru). `cdZeile` blieb nur für die Jarvis-Regel des Servers (entfiel mit B2b-4b).

**Tests/Gates:** Golden bewusst umgestellt in `code-daten.test.mjs`, `routen-code.test.mjs` (echter Block in PowerShell, stderr ohne
`fatal:`), `check-f45-b2a3b-review-stand.mjs` (d)/(g), `befehlsblock.test.mjs`, `views/auftrag-umgebung.test.mjs`. Neues Gate
`scripts/check-f45-b2b4a2a-blockform.mjs`: (a) Blockform aller Erzeuger und Quelltext der Views, (b) echte PowerShell — Ordner fehlt ⇒
Abbruch an Set-Location, kein git; vorhandene Ordner mit Leerzeichen, `[1]`, `'`, `’`, `` ` ``, `$` ⇒ git lief; (c) Server unberührt;
11 Gegenproben.

**Prüfpass:** code-reviewer, qa, design-guardian je „Freigegeben mit Hinweisen“; eine Korrekturrunde: Gegenproben auf Folgezeilen,
(b) mit vorhandenen Sonderzeichen-Ordnern und Abbruch an Set-Location statt Parse-Fehler, Startfehler/Zeitgrenze als Befund,
CSS-Selektor angeglichen, Grenzen (nur PowerShell, pwsh 7, zwei Blöcke ohne Enter) im Nachweis.

**Nachweise:** `nachweise/b2b4a2a/powershell-versuch.md` (a)–(f), `nachweise/b2b4a2a/nachweis.md` (#/code 390 hell/dunkel, 390/390).

**Register:** F-1088 (5) erledigt für den Leitstand (Jarvis → 4b); neu F-1159 (git-Fehler im Block bricht nicht ab). 4a-2b vorgemerkt
(`docs/projekt/fixpaket-f45.md`): V1–V3, Bauauflagen 1–9, F-1157, O2 (node_modules-Regel für Ablauf-Block und #/code).

## Stand B2b-4a-2b-1

**Auftrag:** B2b-4a-2b „Bereit zum Sichern – Anzeige“, nach dem Advisor-Pass (Freigegeben mit Hinweisen, Zuschnitt knapp zu groß) geteilt
(Challenger, 20.10.2026): 4a-2b-1 Regeln und node_modules (dieser Stand), 4a-2b-2 Anzeige nach dem Merge. Verlauf: `plan-b2b4a2.md` →
`advisor-b2b4a2.md` → `plan-b2b4a2b.md` (v2) → `advisor-b2b4a2b.md`.

**Gebaut:** eine node_modules-Regel (O2) — `public/leitstand/code-daten.js` `istNodeModulesPfad`; `scripts/leitstand/routen-code.mjs`
`leseDateien` nimmt neue, ungetrackte Dateien unter node_modules vor der Kappung heraus (`anzahl`/`gekappt` ohne sie, Feld
`dateien.nodeModules`); getrackte und gestagte Änderungen bleiben; keine commit-Folge stagt sie (`commitFolge`, eine Quelle für
`sicherBefehle` und `ablaufSicherBefehle`). #/code zeigt „node_modules ausgelassen – fehlt in .gitignore“ nur bei ausgelassenen Dateien,
bei nur node_modules eigene Texte statt „sauber“. Reine Regeln für 4a-2b-2: `sichernQuelle` (kein_bedarf/bestand/ablauf/unbekannt),
`sichernSchluessel` (V1), `ablaufSicherBefehle` (Ort nur aus dem Arbeitsordner, Branch-Prüfung, push unabhängig von der Kappung, origin
nicht lesbar ⇒ Hinweis). i18n de/en/tr/ru. `leitstand-server.mjs` unberührt (13.366).

**Tests/Gates:** `public/leitstand/code-daten-ablauf.test.mjs` (neu), `routen-code.test.mjs` (echtes Repo mit getrackter, gestagter und
506 neuen node_modules-Dateien). Neues Gate `scripts/check-f45-b2b4a2b1-regeln.mjs`: (a) Quelle, (b) push/Branch/origin, (c) node_modules
im echten Test-Repo und #/code, (d) Neuladen-Schlüssel, (e) i18n; Gegenproben.

**Prüfpass:** code-reviewer, qa, design-guardian je „Freigegeben mit Hinweisen“; eine Korrekturrunde (Kappung vor „nur node_modules“,
origin-Hinweis nur bei fälligem push, „node_modules“ ohne Schrägstrich, Grund „git status zu groß“ mit Ursache, Texte mit Abhilfe, 12 px,
Ende-zu-Ende-Test bis zur Ableitung, ru-Bild); Grenzen für 4a-2b-2 im Plan.

**Nachweise:** `nachweise/b2b4a2b1/nachweis.md` (#/code de 390/1440 hell/dunkel, ru 390; 390/390, 1440/1440).

**Register:** F-1157 teilweise ((1)(2)(3)(7) auf Regelebene); neu F-1160 (erledigt).

## Stand B2b-4a-2b-2

**Auftrag:** B2b-4a-2b-2 „Bereit zum Sichern – Anzeige“ nach dem Merge von 4a-2b-1. Verlauf: `plan-b2b4a2b.md` (Teil 4a-2b-2) →
`plan-b2b4a2b2.md` → `advisor-b2b4a2b2.md` (Freigegeben mit Hinweisen, Bauauflagen 1–5).

**Gebaut:** Stand je Ablauf `public/leitstand/ablauf-code-stand.js` (GET …/code?workflow=<id> über `api.js` `holeAblaufCode`; je
Neuladen-Schlüssel einmal, Fehlschlag zählt, nie aus dem Poll, Ablaufseite nur auf der Detailroute, Projektwechsel verwirft alles; 409 mit
Schlüssel = Lage, 200 ohne `ablauf` = Fehler „Leitstand neu starten“). Anzeige `public/leitstand/views/ablauf-sichern-anzeige.js`: Abschnitt
„Bereit zum Sichern“ in der Karte „Wo gearbeitet wird“ (Abnahmeseite; Ablaufseite bei ABGESCHLOSSEN/GESTOPPT) und im Workboard
„abgeschlossen“ — Schritte commit · push bzw. sichtbarer Grund („… noch nicht auf main“) · Pull Request und Merge im Web (ohne origin eigener
Text) mit der Grenze „bleibt nach Push/Merge stehen“, danach genau ein Aufräumen (Art aus `aufraeumenMoeglich`; Knopf nur unter den
Aktionen, Karte mit `ohneKnopf`); GESTOPPT mit Änderungen ⇒ Aufräumen/Verwerfen; node_modules-Hinweis wie #/code; Sätze für Projektordner,
„nichts zu sichern“, unbekannt. Eine Regel für beide Einbauorte (`sichernFuerAblauf`, `behandleSichernKlick`); Kopieren auf der Abnahme
(`workflows.js` `behandleEntscheidenKlick`). Neuer Enter-Hinweis de/en/tr/ru („erscheint „>>“, noch einmal Enter“). Alte Kartenzeile
`arbeitsordner.sichern` entfernt. `leitstand-server.mjs` unberührt (13.366, `starteWorkflowSchritt(` 6×).

**Tests/Gates:** neu `ablauf-code-stand.test.mjs`, `views/ablauf-sichern-anzeige.test.mjs`, `views/workflows-sichern.test.mjs`;
`arbeitsordner-anzeige.test.mjs`, `befehlsblock.test.mjs` angepasst. Neues Gate `scripts/check-f45-b2b4a2b2-anzeige.mjs` (a)–(h), formatfest,
mit Gegenproben.

**Prüfpass:** code-reviewer und qa je „Nicht freigegeben“ (Ursache: Umformatierung durch `biome check --write`, F-1161; inhaltlich
Projektwechsel, CR 2) — eine Korrekturrunde (siehe Plan „Bau und Prüfpass“); design-guardian nach dem Render-Nachweis „Freigegeben mit Hinweisen“ (Reste F-1162).

**Nachweise:** `nachweise/b2b4a2b2/nachweis.md`.

**Register:** F-979, F-1087, F-1157 erledigt (Reste/Grenzen benannt); Nachtrag F-1156 (Commit-Vorschlag mit Kennung, QA 9); neu F-1161 (Biome-Formatierer), F-1162 (Design-Reste, design-guardian „Freigegeben mit Hinweisen“).

## Stand B2b-4b

**Auftrag:** B2b-4b „Jarvis im Arbeitsordner“ (letzter Teil von B2b; F-1085 (5), Rest F-1088 (5), D13-Lücke aus `advisor-b2b4.md`
Befund 3, Gate-Bruch b2a3 (g) aus Befund 2). Verlauf: `plan-b2b4.md` Teil D/E → `plan-b2b4b.md` → `advisor-b2b4b.md` (Freigegeben mit
Hinweisen, Punkte 1–6 in Plan v2).

**Gebaut:** `src/jarvis/index.ts` `baueOrtRegelZeilen` (ersetzt `baueCdRegelZeile`; Optionen `block`, `ablaufOrte` statt `cdZeile`):
Blockform „& {“ / Ortszeile / Befehle / „}“ mit den vom Server fertig gebauten Zeilen, Projekt-Ortszeile, bei offenen Arbeitsordnern je
„Titel“ + Ortszeile (nur Kontext, keine Anweisungen) und „nie stillschweigend einen Ordner wählen, nachfragen“. Neues reines Modul
`scripts/leitstand/jarvis-orte.mjs` (`waehleOffeneArbeitsordner`: wirksam BEREIT, Ordner vorhanden, absoluter Pfad, höchstens 5, Sortierung
aus `baueArbeitsordnerListe`; `ablaufTitel`: Auftragstitel, sonst Ziel, einzeilig, ≤ 80 Codepoints, Kennung nur ohne beides;
`baueJarvisOrte`: Kopf/Ortszeile/Fuß aus `code-daten.js`). Server: `offeneAblaufOrte` synchron (D13: kein await zwischen `if (laufAktiv)` und
Laufstart; ENOENT still leer, sonst Log + leer), `arbeitsordnerEintraege` (auch GET `/api/arbeitsordner`), beide Jarvis-Aufrufe über
`baueJarvisOrte(repoWurzel, offeneAblaufOrte())`; `baueProjektCdZeile` und `cdZeile` entfallen. Ratsche: `versucheJsonParse`,
`formatiereAbgelehnteBefehle` nach `text-auszug.mjs`; Server 13.366 → 13.357, Grenze gesenkt; `starteWorkflowSchritt(` 6×, keine Route.

**Tests/Gates:** neu `scripts/leitstand/jarvis-orte.test.mjs`, `scripts/check-f45-b2b4b-jarvis.mjs` (a)–(f) (Ortszeilen ≤ 5 neueste zuerst;
bitgleich: `[]` = fehlend, außer der Ortsregel identisch zum Text von 8ee5f8b, Golden-Hash; Blockform aus einer Quelle; D13 mit zwei
gleichzeitigen Anfragen am echten Handler und statisch; 9 Rotfälle); `jarvis.test.ts`, `code-daten.test.mjs` angepasst;
`check-f45-b2a3-codex-review.mjs` (f)/(g) auf die neue Aufrufform (fester Quoting-Vergleich, Literal 2×, kein eigenes `cdZeile`/`ortZeile(`
im Server; Rotfälle „Ort-Optionen nur einmal“, „cd statt Blockform“, „Server baut die Ortszeile selbst“).

**Prüfpass:** code-reviewer und qa je „Freigegeben mit Hinweisen“, keine kritischen Befunde. Eine Korrekturrunde: Hinweis „weitere,
ältere offene Arbeitsordner … nachfragen“ ab dem sechsten (qa 1; `waehleOffeneArbeitsordner` liefert dafür 5 + 1), Zeile „Pfade und
Befehlsformen im Verlauf können veraltet sein“ (qa 3, Teil der Ortsregel, auch ohne Ordner), Bidi-/Nullbreiten-/Trennzeichen aus Pfad und
Titel (qa 5), Ordnernamen sortiert wie GET (cr 2), Pfadregel über `befehlsBlock` statt Kopie (cr 3), D13-Ausschnitt bis zum Aufrufende und
Rumpf-nicht-gefunden als Befund (cr 5/6), Tests der ausgelagerten Helfer (cr 7), Gate (a) mit FEHLGESCHLAGEN und ohne Ordner (cr 8); Golden
(b3) neu, (b2) unverändert grün. Rest → F-1163.

**Register:** F-1085 (5) erledigt, F-1088 (5) ganz erledigt; Nachtrag F-1085 (10); neu F-1163 (Restpunkte).

## Stand B5a-1

**Auftrag:** B5a-1 „Akte schreiben“ (Daten, kein UI; E-F45-1, F-912 Server, F-995 Server, E-B5-2/F-1176). Verlauf: `plan-b5a1.md` →
`advisor-b5a1.md` (Nicht freigegeben, ohne Blocker) → Entscheidungen Stefan 23.10.2026 (A1 Ausnahme „Feature-Akte im Projektordner“, A2
bestehende Akte behält ihr Zeilenende, A3 422 statt stillem Verlust, C15 ABGESCHLOSSEN/ABGEBROCHEN nicht bearbeitbar) → `plan-b5a1-v2.md`.

**Gebaut:** `src/feature-auftrag/akte-schreiben.ts` (`pruefeAkteAenderung`, `bearbeiteFeatureAkte`: nur Ziel, Nicht-Ziele, AKs; Spanne aus
`findeAbschnitt` wie der Leser; Rest bytegleich, Zeilenende der Datei; Zeile unter „## Änderungen“, Abschnitt notfalls angelegt;
Rundlauf-Probe und Feature-Akte-Gate), `src/workboard/feature-akte-pruefung.ts` (Regeln von `check-feature` als reine Funktion, eine
Status-Zeilen-Regel), `src/product-coach/index.ts` `baueFeatureAkteAusScope` (ENTWURF, nächste freie F-Nummer, LF; `baueAuftragAusScope`
unverändert), `src/feature-auftrag/index.ts` (`findeAbschnitt`, `leseAkzeptanzkriterien`, `leseFeatureEntscheidungen`). Routen im
Zwischenmuster F-1131 in `scripts/leitstand/routen-f35.mjs`: GET …/akte zusätzlich `hash` (ein Lesevorgang) und `entscheidungen`, PUT
…/akte (400/404/409 Hash bzw. Sperre mit `workflowId`/422/500), POST `/api/features` (201, nie überschreibend 409); Git-Block als Text.
Server: GET-Block durch den Dispatch ersetzt, Methode hinter dem CSRF-Haken; 13.266 → 13.264, Grenze und Routen-Bestand gesenkt.
`check-akte-meilenstein`: ENTWURF ohne Meilenstein zulässig (E-B5-2). Ausnahmen in `ARCHITECTURE.md` (§2, §7) und
`docs/architektur/arbeitsordner.md`.

**Tests/Gates:** neu `scripts/check-f45-b5a1-akte.mjs` (a)–(l) in `check:gates` (Hash-409, Sperre-409 mit Gegenprobe, grund-400,
bytegleich bei LF und CRLF mit Gegenprobe, Anlage ohne Überschreiben, nächste freie ID über Ordner und Roadmap, Entscheidungen, 422 mit
Verstößen, CSRF direkt und über den Projekt-Präfix, 405, Server-Dispatch); neu `akte-schreiben.test.ts`,
`feature-akte-pruefung.test.ts`, `scripts/leitstand/routen-f35.test.mjs`; erweitert `product-coach.test.ts`,
`check-akte-meilenstein.test.mjs`; `check-f35-ws1-feature-auftrag.mjs` (g) um `hash`/`entscheidungen`.

**Prüfpass:** code-reviewer „Freigegeben mit Hinweisen“, qa „Nicht freigegeben“ (qa 1–3). Eine Korrekturrunde: Altwerte normalisiert
(qa 1), eingerückter Text vor dem ersten Punkt ⇒ 422 (qa 2), AK-IDs wie der Leser `AK\d+` (qa 3), Vorher-Verstoß des Gates benannt (qa 5),
„## Änderungen“ exakt (qa 6), Titel nicht `#`/`Status:` und Status ENTWURF in der Anlage-Probe (cr M1/qa 7), Commit nur des Akte-Pfads
(qa 8), U+2028/U+2029 abgelehnt (cr V3), Kommentare zum Zeilenende berichtigt (cr V2), Logging in jedem 500 (cr V4), `kopfStart` statt
Raten (cr V6), linearer Rückwärts-Scan, `featureStatus` auch bei `unvollstaendig`. Sperrregel gegen den echten Kontrollzustand geprüft
(keine Sperre). Rest → F-1177.

**Register:** neu F-1174, F-1175, F-1176 (erledigt), F-1177; Nachträge F-912, F-995 (Server erledigt, Anzeige B5a-2).

## Stand B5a-2

**Auftrag:** B5a-2 „Akte anzeigen“ (Oberfläche zu B5a-1; E-F45-1, F-912 Anzeige, F-995 Anzeige, F-991). Verlauf: `plan-b5a2.md` →
`advisor-b5a2.md` (Nicht freigegeben: B1 unvollständige Akte, B2 package.json, B3 Neuladen, Kanban, Zuschnitt) → `plan-b5a2-v2.md` (B1 = Weg b
mit Warnhinweis nach dem Bauauftrag „Vorbelegung gemäß F-1177“; Kanban-Knopf weggelassen ⇒ F-1181; ein Paket) → `advisor-b5a2-delta.md`
(Freigegeben mit Hinweisen, alle übernommen).

**Gebaut:** neues reines Modul `public/leitstand/akte-bearbeiten.js` (Vorbelegung, AK-Nummern, PUT-Körper mit gelesenem Hash und Grund,
Deutung 200/400/409 Hash/409 Sperre/422, Formular- und Ergebnis-HTML, Git-Block über `befehlsblock.js`). `views/workboard.js`: „Bearbeiten“ öffnet
das Formular in `#workboard-akte-formular` (eigener Container vor dem Inhalt, „Das Was“ tritt zurück), Werte nach jeder Eingabe im Zustand,
Doppelklick-Sperre im Zustand, Ladezähler `akteLadung`, „Auftrag vorbereiten“ bei offenem Formular gesperrt (Grund `akte`), Deep-Link auf eine
unbekannte ID lädt die Workitems einmal neu. `views/workboard-detail.js`: `darfAkteBearbeiten` (Status aus der Akte, `FEATURE_ENDSTATUS`), Kachel
„Entscheidungen“ aus `entscheidungen[]`. `views/chat.js`: „Als Feature anlegen“ unter jedem Coach-Entwurf (POST `/api/features` über `legeFeatureAn`),
Auftragsweg unverändert. F-991: `zaehleWartendeAufStefan` in `attention-daten.js` für Persona und Startfläche, `spalteVon` mit offenen Abnahmen.
Klärungsleitfaden „Fähigkeit“ als Zeile der Coach-Rolleninstruktion (F-1179, nur Prompt). `package.json`: Leerzeichen vor `check-f813-csrf`, neues
Gate. Kein Server-Code: `scripts/leitstand-server.mjs` bleibt bei 13.264 Zeilen, keine neue Route.

**Tests/Gates:** neu `scripts/check-f45-b5a2-akte-anzeige.mjs` (a)–(h) in `check:gates` (PUT mit hash/grund, alle Antwortfälle, Warnhinweis,
Ladezähler, Entscheidungen, POST mit Scope, offene Abnahme gezählt, reine Module, Verdrahtung, Live-Regionen, echter Fall F45 auf einer Kopie im
Speicher; je mit Gegenprobe); neu `akte-bearbeiten.test.mjs`; erweitert `workboard-detail.test.mjs`, `attention-daten.test.mjs`,
`entwicklung-daten.test.mjs`, `product-coach.test.ts`, `check-f28-persona` (2). Render-Nachweis `features/F45/nachweise/b5a2/` (de 1440/390/200 %,
hell/dunkel, en/tr/ru; Doppelklick = 1 Anfrage, Rückkehr behält Eingaben, keine weitere Live-Region, kein Überlauf).

**Prüfpass:** code-reviewer, qa und design-guardian je „Nicht freigegeben“. Eine Korrekturrunde: Eingaben gingen beim Neuschreiben ohne
Zustandswechsel verloren (cr K1, qa 1) ⇒ Werte nach jeder Eingabe im Zustand, Akte-Link beim Öffnen eingefroren; zwei zusätzliche `role="status"`
entfernt (dg 1); Coach-Knopf in der Knopffamilie `.button` (dg 2); Hash-409 mit „Neu laden“ als Hauptknopf (dg 3); Abstände der Meldungen (dg 5);
Link im Coach-Ergebnis im Satz (dg 6); Neuladen nach 200 über den aktuellen Nachtrag (cr V2); Erfolg bei verworfenem Formular im Log (cr V1); Fokus
nach „Entfernen“ und auf das Coach-Ergebnis (cr V4/V5); Kommentare (cr V6–V8); Gate geschärft (cr V3); Nachweis der Coach-Doppelanlage richtig
nachgebildet (qa 2: zweite Akte F22, 409 nur im Wettlauf). Rest → F-1182, F-1183.

**Register:** neu F-1178 (Live-Vorschau, E-VORSCHAU-1 = A), F-1179 (Klärungsinterview, umgesetzt, Wirkung offen bis R), F-1180 (Sollvorgabe
Roadmap), F-1181 (Kanban-Knopf), F-1182, F-1183; erledigt F-912, F-991, F-995; Nachtrag F-1177 (qa 4 als Weg b).

## Stand B5b-1a

**Auftrag:** B5b-1 „Planungsdaten“ (Challenger, 24.10.2026; E-B5-1 = A, E-B5-3, E-B5-5, E-B5-6 = B, E-KANBAN = A; F-976, F-944,
F-990, F-984, F-1010, F-975). Verlauf: `plan-b5b1.md` → `advisor-b5b1.md` (Nicht freigegeben: A1 Zuschnitt, A2 §2, A3 §7, A4
Migrationsquelle, B1 Event-Loop, B2 `roadmap_hash`, B6 STATUS.md) → Stopp und Bericht → Entscheidungen Challenger (Schnitt A1,
A2–A5, O1, O2, O5, B6) → `plan-b5b1-v2.md` (B5b-1a; kein zweiter Advisor-Pass, Regel 3a).

**Gebaut:** `src/workboard/feature-planung.ts` (Priorität, Abgenommen, strenger Abschnitt „## Workstreams“ nur als Tabelle; in
`pruefeFeatureAkteInhalt` eingebunden ⇒ `check-feature` und PUT/POST Akte prüfen dieselbe Regel); `src/workboard/roadmap-regeln.ts`
(Status-Regel R1, Ausnahmen-Datei `docs/projekt/roadmap-ausnahmen.json` mit den fünf Ausnahmen M3/F18, M4/F20, F21, F22, F25,
verwaiste Ausnahme = Befund) und Aufruf in `scripts/check-akte-meilenstein.mjs` (Ausnahme `ohne_akte` F30 entfernt);
`src/workboard/roadmap-planung.ts` (Zeitachse in AT ab heute, „frühestens ab AT x“ ohne Länge, Ist-Zone in Arbeitstagen, Kennzahlen
R2/R5, Plan gegen Ist; abgeschlossene Meilensteine tragen keine offene Arbeit); `scripts/leitstand/routen-roadmap.mjs` additiv
(`prioritaet`, `abgenommen`, `workstreams`, `planung_befunde` je Feature; `roadmap_hash`, `zeitachse`, `kennzahlen`; Status über
`leseFeatureStatus`); Bug-Felder im Findings-Parser (`src/workboard/findings.ts`, `types.ts`). Migration: Abschnitt „## Workstreams“
dieser Akte (53 Zeilen aus `fixpaket-f45.md` §3, Status/Abgenommen aus git), Scope-Tabelle ohne Schätzung/Ist; `features/F30/feature.md`
als ENTWURF; F35 „Abgenommen: 2026-09-28 (…)“. Server unverändert (13.264 Zeilen), der Kern schreibt nichts.

**Tests/Gates:** neu `scripts/check-f45-b5b1a-planung.mjs` (a)–(k) in `check:gates` (Formfehler, min > max, erledigt ohne Datum,
R1 ohne Ausnahme und verwaiste Ausnahme über das echte Gate in einer Kopie, „Schätzung fehlt“ ohne Länge, „Bis M5“ nicht berechenbar,
LF/CRLF, echte Daten, Bullet-Altakten, Server ohne Planungslogik); neu `feature-planung.test.ts`, `roadmap-regeln.test.ts`,
`roadmap-planung.test.ts`; erweitert `workboard.test.ts` (Bug-Felder), `check-akte-meilenstein.test.mjs` (F30-Ausnahme weg).

**Abweichung vom Plan v2 (bewusst, DEKLARIERT):** Features in einem ABGESCHLOSSEN-Meilenstein tragen keine offene Arbeit in Zeitachse
und „Bis fertig“ — eine R1-Abweichung dort (F18, F20, F21, F22, F25) ist ein Datenfall der Bereinigungsliste; sonst wäre jede Prognose
unberechenbar (code-reviewer H1). Eine Zeile mit Formfehler lässt das Feature zusätzlich als „Schätzung fehlt“ zählen (qa 1).

**Prüfpass:** code-reviewer und qa je „Freigegeben mit Hinweisen“. Eine Korrekturrunde: Planungsbefunde über die Tabellenzeile statt die
Dateizeile verortet, damit PUT …/akte einen schon vorhandenen Befund als solchen meldet (cr M1, qa 7; Test in `akte-schreiben.test.ts`);
Formfehler verkürzt die Prognose nicht mehr still (qa 1, Gate (f2)); Befund bei unterbrochener Tabelle (qa 3, cr H3) und bei Begonnen nach
Abgenommen (qa 6); `kennzahlen.meilensteine.mit_abweichung` (qa 2); Arbeitstage in O(1) (cr H4); Grenzen im Kopf von `roadmap-planung.ts`
und `feature-planung.ts` (qa 4, 5, 8, 11, cr H2, H5); eigene Meldung für eine nicht lesbare Ausnahmen-Datei (cr H8); Titel der Migration
wörtlich aus §3, Notizen präzisiert (qa 10, cr H7); F-713 in der F30-Akte als behoben (qa 9); Gate (i2) zählt die echten Kennzahlen
unabhängig nach. Rest → F-1185.

**Stand der echten Daten (24.10.2026):** Meilensteine 5/7 abgeschlossen laut `roadmap.json`, davon 2 (M3, M4) mit offener Bereinigung;
Features abgenommen 39/48 (gegen die Akten); „Bis M5 fertig“
nicht berechenbar (1 Eintrag ohne Schätzung: F30, Workstreams noch nicht geschnitten); Plan gegen Ist über 6 erledigte Zeilen mit
Schätzung und Ist: Plan 2,85–2,95 AT, Ist 4,15 AT.

## Stand B5b-1b-1

**Auftrag:** B5b-1b „Planungsdaten schreiben“ (Challenger, 24.10.2026; R6, F-984; Entscheidungen A2, A3, O5, B6, Kennzahl ohne
ABGEBROCHEN). Verlauf: `plan-b5b1b.md` → `advisor-b5b1b.md` (Nicht freigegeben: A1 Zuschnitt, A2 Ist P, B1 Gate-Semantik, B3 Rückbau,
B4 Sammel-Bestätigung) → Stopp und Bericht → Entscheidungen Challenger (A1 geschnitten, A2 Ist P bleibt „–“, B4 für 1b-2) →
`plan-b5b1b-v2.md` (B5b-1b-1; kein zweiter Advisor-Pass, Regel 3a; die 1b-2-Punkte stehen dort als offene Punkte).

**Gebaut:** PUT `…/features/<id>/planung` im Zwischenmuster F-1131 (`scripts/leitstand/routen-planung.mjs`): Priorität und
Schätzungen in die Akte (`src/feature-auftrag/planung-schreiben.ts`: Priorität-Zeile ersetzt oder hinter der Status-Zeile angelegt,
nur die Zelle „Schätzung AT“, Zeile unter „## Änderungen“, Zeilenende erhalten), Meilenstein-Wechsel textuell in roadmap.json
(`src/workboard/roadmap-schreiben.ts`: nur die zwei `features`-Literale, Rundlauf über die ganze Struktur, ID genau einmal im Ziel).
Schreibregeln wie B5a-1: 400 Körper/Grund (`pruefeGrund`, eine Regel), 404 auch bei falscher Groß-/Kleinschreibung der ID, 409 Sperre,
409 Akte-Hash und Roadmap-Hash getrennt, 422 CRLF in roadmap.json (A3), R1 vorher/nachher — nur neue Befunde blockieren („erst
bereinigen“ mit Handweg), Akte-Gate blockiert jeden Befund (`pruefeAkteGate`, gemeinsam mit PUT …/akte), Schreiben Akte → roadmap.json
mit Rücklesen und Rückbau aller Dateien bis einschließlich der scheiternden; Git-Block mit allen Pfaden. ARCHITECTURE.md §2 (Ausnahme
`docs/projekt/roadmap.json`, Gate-Namen in den Detailtext, 17.765 → 17.756 B), `docs/architektur/arbeitsordner.md` (Punkt „Roadmap im
Projektordner“). „Features abgenommen“ ohne ABGEBROCHEN. Server 13.264 → 13.240 Zeilen: `findeReviewSchritt`, `findeQaSchritt`,
`findeReviewVorQa` nach `scripts/leitstand/workflow-schritte.mjs`. Helfer aus `routen-f35.mjs` exportiert, `baueGitBlock` mit Pfadliste.

**Tests/Gates:** neu `scripts/check-f45-b5b1b1-planung-schreiben.mjs` (a)–(n) in `check:gates`; neu `planung-schreiben.test.ts`,
`roadmap-schreiben.test.ts`; erweitert `roadmap-planung.test.ts` (ABGEBROCHEN mit Gegenprobe); Gate b5b1a (i2) zählt ohne ABGEBROCHEN.

**Antwortvertrag (für B5b-2):** 200 `{ status, id, hash, roadmap_hash? (nur mit meilenstein), geaendert, geschrieben, git }`; die
drei 409 unterscheiden sich nur am Schlüssel (`hash`, `roadmap_hash`, `workflowId`, der null sein kann); `roadmap_hash` ohne
`meilenstein` ist 400; vor jedem PUT braucht die Anzeige den Akte-Hash aus GET …/akte.

**Prüfpass:** code-reviewer und qa je „Freigegeben mit Hinweisen“, kein Befund mit falschem Schreiben. Eine Korrekturrunde: Aktenstatus
für R1 über die IDs des neuen Stands (cr 1, qa 2), Akte-Gate und Einplanen-Fall über HTTP im Gate (cr 2, qa 3), ungültige Ausnahmen-Datei
⇒ 422 (cr 3), Hash vor UTF-8 bei der Akte (cr 4), `pruefeAkteGate` und `SHA256_MUSTER` gemeinsam (cr 5), Rücklesen ohne Wurf im Gate
(cr 6, qa 1), Antwortvertrag im Kopf (cr 7), Köpfe (cr 8), Würfe ohne Error und Schema vor dem Zugriff (cr 9), weitere Routen- und
Randfälle (qa 4, 5), exakter Ordnername (qa 6), eigene Meldung für `prioritaet: null` (qa 7), Meilenstein-IDs mit Leerzeichen (qa 8).
Rest → F-1188.

## Stand B5b-1b-2

**Auftrag:** B5b-1b-2 „Bereinigungsliste“ (Challenger, 24.10.2026; F-1010, R1; Entscheidungen B4, B6, O5, „Bereinigung nur
bestätigt“). Verlauf: `plan-b5b1b2.md` → `advisor-b5b1b2.md` (Freigegeben mit Hinweisen, bedingter Schnittvorschlag B6, A1 STATUS.md
und §7, A2 Lesart B4) → Stopp und Bericht → Entscheidungen Challenger (kein Schnitt, A1 = Weg (b), A2 = dynamisch) →
`plan-b5b1b2-v2.md` (kein zweiter Advisor-Pass, Regel 3a).

**Gebaut:** GET `/api/roadmap/bereinigung` und POST `/api/roadmap/bereinigung/bestaetigen` im Zwischenmuster F-1131
(`scripts/leitstand/routen-planung.mjs`; `erkennePlanungRoute` liefert `verb`, der Server vergleicht, ±0 Zeilen). Reine Module:
`src/workboard/status-md.ts` (Standardform, eine Regel mit `check-status-akten`; nur das Status-Wort genau einer Angabe),
`src/workboard/roadmap-schreiben.ts` (`setzeMeilensteinStatus`, `entferneStatusAusnahme` zeilenbasiert), `src/workboard/roadmap-regeln.ts`
(`neueR1Befunde` für PUT und POST, `bereinigungsEintraege`, `pruefeEintrag`), `src/feature-auftrag/akte-abschliessen.ts`
(`setzeAkteAbgeschlossen`), gemeinsamer Helfer `haengeAenderungAn` (`akte-schreiben.ts`, auch in PUT …/akte und …/planung).
ARCHITECTURE.md §2 um `roadmap-ausnahmen.json` und `docs/STATUS.md` (Status-Wort) erweitert, 17 756 → 17 798 B; §7 unverändert
(A1 = b); Detail „Bereinigungsliste“ in `docs/architektur/arbeitsordner.md`. Gate b5b1a (i) prüft die Ausnahmen als Teilmenge der fünf
migrierten (Advisor B1).

**Tests/Gates:** neu `scripts/check-f45-b5b1b2-bereinigung.mjs` (v, a–n, r, d2, k, l, m) in `check:gates`, Rot-Nachweis je Fall per
Mutation (14 Mutationen, jede rot); neu `status-md.test.ts`, `akte-abschliessen.test.ts`; erweitert `roadmap-schreiben.test.ts`,
`roadmap-regeln.test.ts`.

**Antwortvertrag (für B5b-2, qa 4):**
- GET 200 `{ status: 'ok', befunde, eintraege: [{ eintrag, meilenstein, feature, featureStatus, ausnahme, abweichungen_im_meilenstein,
  vorschlaege: [{ entscheidung, text, nebenwirkung, moeglich, grund }] (moeglich/grund seit B5b-2b-2), quelle: { roadmap, akte, ausnahme, status_md }, hashes: { roadmap, ausnahmen,
  akte, status_md } }] }`; fehlende bzw. ungültige Roadmap oder Ausnahmen-Datei ⇒ 200 `{ status: 'nicht_vorhanden' | 'ungueltig' }`.
- POST-Körper genau `{ eintrag, entscheidung, grund, hashes }`, `hashes` unverändert aus dem GET-Eintrag. 200 `{ status: 'ok', eintrag,
  entscheidung, geschrieben, hashes, hinweis?, git }`.
- 400 Körper; 409 Sperre trägt den Schlüssel `workflowId` (kann null sein — mit `in` prüfen), 409 Hash trägt `abweichend` und
  `hashes`; 422 mit `vorschlaege` = Entscheidung nicht (mehr) erlaubt, mit `verstoesse` = R1, Akte-Gate oder ungültige Datei, sonst
  Grund im Text. Regel für die Anzeige: nach jedem 409/422 und vor jeder weiteren Bestätigung neu laden — die Einträge teilen sich
  roadmap.json, Ausnahmen-Datei und STATUS.md (Advisor C7).

**Prüfpass:** code-reviewer und qa je „Freigegeben mit Hinweisen“, kein Befund mit falschem Schreiben. Eine Korrekturrunde: Kopf und
Export `hinterLetzterZeile` (cr 1), `bearbeiteFeatureAkte` nutzt den Helfer (cr 2), `check-status-akten` nutzt `sammleStatusMdAngaben`
(cr 3), Kommentarumbruch (cr 4), Gate (n) Fremdprojekt/ungültig/fehlend/ABGEBROCHEN und (h) Doppelklick/veraltete Hashes (cr 5, qa 5),
Rundlauf-Test „status vor id“ (cr 6), JSDoc Zeile (cr 7), Steuerzeichen und `/` in Meilenstein-IDs nicht adressierbar (cr 8, qa 3),
`abweichungen_im_meilenstein` (qa 1), Nebenwirkung „aktueller Meilenstein, zurück nur von Hand“ konkret (qa 2), Antwortvertrag (qa 4),
unbekannter Status ⇒ 422 statt Abschließen. Rest → F-1189.

## Stand B5b-2a

**Auftrag:** B5b-2a „Roadmap: Gantt lesend“ (Challenger, 25.10.2026; Sollvorgabe Roadmap Stefan 01.10.2026). Verlauf:
`plan-b5b2a.md` → `advisor-b5b2a.md` (Freigegeben mit Hinweisen, kein weiterer Schnitt) → `plan-b5b2a-v2.md` (Ist-Zone als Band statt
Skala, Formel Plan gegen Ist, eine Gruppenregel; kein zweiter Advisor-Pass, Regel 3a).

**Schnitt B5b-2 (Challenger):**

| Paket | Inhalt | Stand |
|---|---|---|
| 2a | Gantt rein lesend auf GET /api/roadmap: Zeilen Meilenstein → Feature → Workstream/Fixpaket/Design je `art`, Zeitachse AT ab heute mit Ist-Band und Heute-Linie, Zoom Tage/Wochen, Farbe = Ebene, Form = Status, Marke ohne Schätzung, sticky linke Spalte, Werkzeugleiste, Trennzeile, Detailpanel lesend, Kennzahlen „Bis <M> fertig“ und „Plan gegen Ist“ | dieser Stand |
| 2b-1 | „Anpassen“ im Detailpanel (PUT /api/features/<id>/planung), F-1197 (Status-Pille, neutrale Auswahl), F-1201; ohne Serveränderung (Schnitt nach Advisor `advisor-b5b2b.md` O4, Challenger 25.10.2026) | siehe „Stand B5b-2b-1“ |
| 2b-2 | Bereinigungsliste (GET/POST /api/roadmap/bereinigung[/bestaetigen]) mit Vorprüfung `moeglich`/`grund`, Gate (a), F-1189-Restpunkte | siehe „Stand B5b-2b-2“ |
| 2c-1 | Zuordnung Befund → Feature/Meilenstein/„Pflege & Fixes“, Kanban · Priorität (Entwicklung, E2, F-917 a), Bug-Felder und Feature-Priorität im Eintrag-Detail; aus den Workitems, ohne Serveränderung (Schnitt nach Advisor `advisor-b5b2c.md` A1, Challenger 25.10.2026) | siehe „Stand B5b-2c-1“ |
| 2c-2 | Gantt-Spur „Pflege & Fixes“ und Befund-Zähler je Feature, Bereinigungs-Standardoption, STATUS.md F25, F-1206, F-1010; geteilt (Advisor `advisor-b5b2c2.md`): 2c-2-C Entscheidungen E-BRAIN-2/E-R-1 und Test-Einstufung, 2c-2-AB Gantt und Restpunkte | abgeschlossen — 2c-2-C siehe „Stand B5b-2c-2-C“, 2c-2-AB siehe „Stand B5b-2c-2-AB“; damit ist B5b-2 abgeschlossen |

**Gebaut:** reine Funktionen in `public/leitstand/roadmap-anzeige.js` (`zeitachseVon`, `baueAchse`, `xVonAt`, `baueSpur`, `ganttZeilen`,
`aufklappbareSchluessel`, `gewaehlteZeile`, `featuresAbgenommen`, `bisFertig`, `planGegenIst`; `statusKategorie` um die Workstream-Status);
`views/roadmap.js` rendert nur. Keine Server- oder Schreibänderung, kein neues Gate (F-1190), ARCHITECTURE.md unverändert (F-1191).
Heute-Linie ohne neues Token aus `--ink` abgeleitet; Ebenenfarben nur über `--ebene-*`. Texte de/en/tr/ru.

**Prüfpass:** design-guardian, code-reviewer, qa je „Freigegeben mit Hinweisen“. Eine Korrekturrunde: Querscroll bleibt beim Neuschreiben
(cr 1, qa 1), Auswahl nur unter sichtbaren Zeilen mit Rückfall auf die Elternzeile (dg 1, qa 5), Beschriftung kippt weit rechts vor das
Element und fünf Reservespalten (dg 2, qa 6), Features x/y aus `kennzahlen.features_abgenommen` (cr 3, qa 3), „kein offener Meilenstein“
statt „Daten fehlen“ (cr 4, qa 2), Planungsbefunde und Abweichung an der Zeile sichtbar (cr 2, qa 4), eigener Ist-Schlüssel (cr 5),
Mindestprozent (cr 10), Literale über `ERLEDIGT_STATUS` (cr 7), Aufklapp-Schlüssel aus der Lage (cr 11), „Alles aufklappen“ ohne Ziel
gesperrt. Rest → F-1197..F-1199. Render-Nachweis `nachweise/b5b2a/` (7 Lagen inkl. tr und 200 %, Seite an Seite mit dem Design).

## Stand B5b-2b-1

**Auftrag:** B5b-2b „Roadmap: Anpassen + Bereinigungsliste“ (Challenger, 25.10.2026; Sollvorgabe Stefan §5 Punkt 7). Verlauf:
`plan-b5b2b.md` → `advisor-b5b2b.md` (Nicht freigegeben, weiterer Schnitt) → Entscheidungen Challenger 25.10.2026 („B5b-2b geteilt“,
„Bug-Felder nach 2c“, E-BRAIN-1) → `plan-b5b2b-v2.md` nur für 2b-1 (kein zweiter Advisor-Pass, Regel 3a; Vorarbeit A1/A2 für 2b-2 in
§6 dort). Keine Serveränderung; ARCHITECTURE.md unverändert (F-1191); kein neues Gate (F-1190).

**Gebaut:** reine Bausteine `public/leitstand/roadmap-anpassen.js` (`anpassbar`, `anpassenWerte`, `leseSchaetzzahl`, `pruefeAnpassen`,
`darfAnpassenSpeichern`, `anpassenHinweis`, `baueAnpassenKoerper`, `deutePlanungAntwort`, `meilensteinZiele`, `offenNachWechsel`,
HTML) mit Test (auch gegen die echte `pruefePlanungAenderung`); `speicherePlanung` in `api.js` (Zeitlimit 30 s); Verdrahtung in
`views/roadmap.js` (Formularzustand je Zeile, Hash frisch vor dem PUT, Projektprüfung nach jedem Abruf, Neuladen ohne „Lädt“ mit
Nachlauf für die Auswahl nach Meilenstein-Wechsel, Hinweis bei gescheitertem Neuladen); `akte-bearbeiten.js` exportiert die
Antwort- und Meldungsbausteine (kein Doppelcode). F-1197: Status-Pille im Detailkopf, Auswahl neutral, Detailrahmen `--line`.
F-1201: beide Nachweisskripte warten auf das Ladeende. Texte de/en/tr/ru.

**Abweichungen (begründet):**
- Körper je Workstream `{ id, schaetzung_min, schaetzung_max }` statt `{ id, schaetzung }` — `pruefePlanungAenderung` ist maßgeblich
  (Challenger 25.10.2026: Auftragstext war falsch).
- Status-Pille nur im Detailkopf, in den Zeilen schlanker Text (design-guardian B1): so zeigt es der Canvas; mit Pille kürzte die feste
  linke Spalte die Namen deutlich.
- Auswahlfläche `--button-hover-bg` statt `--note-bg` (Plan v2 §3): `--note-bg` trägt schon der aktuelle Meilenstein; Streifen `--ink`.
- Kein eigener Satz „Jarvis schlägt nur vor“ im Formular: er steht bereits unter „Frag Jarvis dazu“ (`roadmap.jarvis.hinweis`).
- Bei offenem „Anpassen“ ist „Fragen“ kein Hauptknopf (design-guardian B2, ein Hauptknopf je Handlung).
- `deutePlanungAntwort` liefert im Erfolg weder `hash` noch `roadmap_hash` (Plan v2 §2): nichts nutzt sie, die View lädt neu.
- Der Formularzustand gilt je Zeile und übersteht Auswahlwechsel und Zuklappen (Prüfpass cr 1/qa 1) — statt „andere Auswahl verwirft“
  aus Plan v2; ein Erfolg samt Git-Block geht so nicht verloren, er steht beim Zurückkehren auf der Zeile.

**Prüfpass:** design-guardian, code-reviewer, qa je „Freigegeben mit Hinweisen“. Eine Korrekturrunde: Zustand je Zeile statt
Überschreiben beim Rendern (cr 1, qa 1), Erfolg nach Auswahlwechsel bleibt und lädt neu (cr 2), Projektprüfung zwischen den Abrufen
(qa 2), „Erneut laden“ holt den Nachlauf nach (qa 3), unberührte Werte folgen neuen Daten (cr 3), Meldungssatz ohne „Neu laden“ bei
Fehlern (cr 4), Zeitlimit mit ehrlichem Text (qa 6), hängende Akte-Abrufe beim Neuladen (cr 10), Pille nur im Detailkopf (dg B1),
„Fragen“ zurückgestuft (dg B2), Fußnote (dg B3), Kommentare (cr 6, dg B6), Tests für Sperre/422/Randfälle (qa 7), Nachweis mit
Feature-PUT samt Meilenstein-Wechsel, tr/ru, 200 % mit reduzierter Bewegung und Basis-Commit in der Kopie (dg B4, qa 4/5), Startfehler
wartet auf das Prozessende, `-z`, `--no-hardlinks` (cr 7–9). Rest → F-1203.

**Render-Nachweis** `nachweise/b5b2b/` (1,5 MB WebP, 28 Bilder, Klicktabelle in `protokoll.json`): nur gegen eine selbst angelegte
Wegwerf-Kopie unter os.tmpdir() mit eigenem Leitstand-Prozess; Kopie danach gelöscht, Arbeitsbaum unberührt. Der 409 ist im Browser
beantwortet (frischer Hash, echter Konflikt nur im Millisekundenfenster).

## Stand B5b-2b-2

**Auftrag:** B5b-2b-2 „Roadmap: Bereinigungsliste“ (Challenger, 25.10.2026; zweites Teilpaket des Schnitts oben). Verlauf:
`plan-b5b2b2.md` → `advisor-b5b2b2.md` (Freigegeben mit Hinweisen, kein weiterer Schnitt) → `plan-b5b2b2-v2.md` (A1–A4, B1–B12; kein
zweiter Advisor-Pass, Regel 3a). Grundlage Server-Entwurf `advisor-b5b2b.md` (A1, A2). Kein neues Gate (F-1190), ARCHITECTURE.md
unverändert (kein neuer Schreibweg, F-1191).

**Gebaut:**
- Server (einzige Änderung, `scripts/leitstand/routen-planung.mjs`): reine Vorprüfung `bereiteBestaetigungVor` (Block des POST ab
  „Vorschlag vorhanden?“ bis zum R1-Gate, ausgelagert); der POST ruft sie nach Hash-409 und Eintragssuche auf und ist bitgleich (Gate
  b5b1b2 (b)–(n) unverändert grün); der GET ergänzt je Vorschlag `moeglich`/`grund` (Grund-Platzhalter „Vorprüfung“, Wurf ⇒ nur dieser
  Vorschlag nicht möglich). Nicht vorgeprüft (DEKLARIERT): Sperre durch einen offenen Ablauf und Hash (nur POST, 409); Meilenstein-ID
  nur aus Leerraum (GET bietet an, POST 400; Advisor B2).
- Tests `scripts/leitstand/routen-planung-vorpruefung.test.mjs` (14 Fälle, Temp-Repo, Modulaufruf): je Attrappe eine Schleife über
  alle Vorschläge aller Einträge, jeder in frischer Kopie — `moeglich` ⇒ POST 200, sonst POST 422 mit genau dem GET-Grund und kein Byte
  geschrieben; Sperrgründe: unbekannter Status, `Abgenommen:`, Akte kein UTF-8, Akte-Gate rot (Planungszeile), Akte fehlt bei
  Groß-/Kleinschreibung (Äquivalenz), STATUS.md kein UTF-8/CRLF/2×/0×, roadmap.json CRLF und `"status"` vor `"id"`, Ausnahmen CRLF,
  mehrzeiliges Paar und Rundlauf, R1 neu; ohne Sperre: STATUS.md fehlt, ohne Standardform, schon ABGESCHLOSSEN (200 mit hinweis);
  Sperre: GET möglich, POST 409. Gegenprobe: Vorprüfung auf „immer möglich“ mutiert ⇒ 11 von 14 rot.
- Gate b5b1b2 (a): jeder Vorschlag der Attrappe möglich (A1, auch F21 trotz Sperre); echtes Repo nur die Form.
- Client: reine Bausteine `public/leitstand/roadmap-bereinigung.js` (+ Test) — Deutung fail-closed, Sperren, Körper mit Hashes aus dem
  GET, Antworten (Rest über `deutePlanungAntwort`), Abschnitt, Bestätigungsschritt, Erfolg, Zähler; `holeBereinigung`,
  `bestaetigeBereinigung` in `api.js`; Verdrahtung in `views/roadmap.js` (ein Ladeweg mit der Roadmap, eigener Anfragezähler,
  Eingaben ohne Neuschreiben, genau ein Eintrag je Klick, nach jeder Antwort Liste neu, nach 200 auch die Roadmap). Texte de/en/tr/ru,
  CSS nur mit vorhandenen Tokens.
- F-1189: qa2 (nicht zurücknehmbar + Pflicht-Häkchen), qa3, qa6 (Datumshinweis), qa7 (fester STATUS.md-Hinweis + `hinweis`), qa8
  Variante (a) (Satz in der Liste; Gate b5b1a (i) unverändert). Rest qa8/qa9 → W2.

**Abweichungen (begründet):**
- Bestätigung inline im Eintrag (`role="group"`, Fokus darauf) statt `<dialog>` — Entscheidung `advisor-b5b2b.md` O2 und
  `plan-b5b2b-v2.md` §6: die Seite wird bei jeder Zustandsänderung neu geschrieben, ein Modal ginge dabei verloren.
- Der Abschnitt steht auch bei n = 0, solange ein Erfolg samt Git-Block offen ist, eine Meldung oben steht, die Liste nicht ladbar oder
  ungültig ist (Advisor A4); während des Ladens und ohne Roadmap steht nichts da.
- Ein offener Erfolg samt Git-Block sperrt weitere Bestätigungen bis „Schließen“ (Prüfpass qa 2): STATUS.md und
  roadmap-ausnahmen.json gehören zu jeder Bestätigung, zwei offene landeten sonst in einem Commit. Erfolge liegen je Projekt und
  überstehen den Projektwechsel (qa 3).
- Kein Vorauswahl-Vorschlag: Stefan wählt ausdrücklich. Hauptknopf je Eintrag nur freigegeben „primary“ (dg 2).
- Nachweis ohne `git clean -fdx` (Plan v2 A3): es löschte `kontrollzustand/` samt Lock des laufenden Servers; der POST legt keine neuen
  Dateien an (cr 8).

**Prüfpass:** design-guardian, code-reviewer, qa je „Freigegeben mit Hinweisen“. Eine Korrekturrunde: stabile Fokusschlüssel für
Bestätigungsschritt, Meldung, Erfolg, Ladefehler und Titel, Rückfall bis zum Seitentitel (qa 1, cr 5, cr 7, qa 5); Sperre bis
„Schließen“ nach einem Erfolg (qa 2); Erfolge je Projekt (qa 3); Zustandsidentität statt nur Projekt-ID im POST, laufender POST bleibt
beim Abgleich (cr 2, qa 4); Meldung bei gescheitertem Neuladen nach oben (cr 1); Sperre „lädt neu“ schon im ersten Bild (cr 3);
„Erneut laden“ gesperrt mit „Lädt…“ (cr 4); Meldung oben mit „Schließen“ (cr 6); Texte je Lage — gesperrt, Eintrag weg, nach Fehler
„vermutlich geschrieben“ (qa 6, qa 7), Zeitlimit aus `SCHREIB_ZEITLIMIT_MS` (qa 7), Ursache bei „Kein Vorschlag“ (qa 9);
`aria-describedby` an Knopf und Begründung (dg 6, qa 8); Grund als Prosa (dg 5); `accent-color: var(--mint)` für Radio und Häkchen
(dg 1); JSDoc (cr 9); Nachweis mit git-Wurzelprüfung, Lock nach der Pfadprüfung, Meldung bei gescheiterter Kopie (cr 8), 200 % mit
reduzierter Bewegung (dg 4), Zähler-Klick und Sperre bis „Schließen“ (qa 10). Rest → F-1206.

**Render-Nachweis** `nachweise/b5b2b2/` (1,7 MB WebP, 23 Bilder, Klicktabelle in `protokoll.json` mit Fokus je Schritt): nur gegen
eine selbst angelegte Wegwerf-Kopie unter os.tmpdir() mit eigenem Leitstand-Prozess, STATUS.md der Kopie präpariert (F22 2× ⇒
deaktiviert mit Grund), vor jeder Lage `git reset --hard` auf die Basis; echter POST „F20 → ABGESCHLOSSEN“ je de-Lage, „M3 → LAEUFT“
nur bis zum Bestätigungsschritt; 409 im Browser beantwortet. Kopie danach gelöscht, Arbeitsbaum unberührt. Keine echte Abweichung im Arbeitsbaum bestätigt (F18, F20,
F21, F22, F25 bestätigt Stefan nach dem Merge).

## Stand B5b-2c-1

**Auftrag:** B5b-2c „Roadmap: Pflege & Fixes, Kanban · Priorität, Bug-Felder“ (Challenger, 25.10.2026; Sollvorgabe Stefan §5 Punkt 1,
E-KANBAN = A). Verlauf: `plan-b5b2c.md` → `advisor-b5b2c.md` (Freigegeben mit Hinweisen, weiterer Schnitt) → Entscheidungen Challenger
25.10.2026 („B5b-2c geteilt“) → `plan-b5b2c1-v2.md` nur für 2c-1 (kein zweiter Advisor-Pass, Regel 3a). Keine Serveränderung, kein neues
Gate (F-1190), ARCHITECTURE.md unverändert (kein neuer Schreibweg, F-1191).

**Zuordnungsregel** (`public/leitstand/befund-zuordnung.js`, Kopfkommentar): Ein Befund hängt an dem Feature, dessen ganze ID zuerst im
Feld „Feature/Run“ steht und in roadmap.json vorkommt; sonst an dem Meilenstein, dessen ganze ID zuerst darin steht; sonst gehört er
zu „Pflege & Fixes“. Mehrere IDs: die erste gewinnt (DEKLARIERT). „Ganz“: davor kein Buchstabe, keine Ziffer, kein `_` oder `-`,
danach kein Buchstabe, keine Ziffer, kein `_` (Muster `nenntFeature`) — `F-002`, `AF-F001`, `S-M3-01b` treffen nicht, `F6b` nicht F6a,
`M1` nicht M10, `M3-Challenge` trifft M3. „Offen P0–P2“ = Status OFFEN und Priorität P0–P2.

**Zahlen** (Arbeitsbaum `d3b217e`, 25.10.2026): 683 offene Befunde, davon 314 mit P0–P2; **240 an 38 Features** (F45 45, F16 25, F15 15,
F41 15, F35 9, F44 9, F8 8, F32 8, F39 8, Rest ≤ 7), **12 an 5 Meilensteinen** (M1 1, M2 1, M3 2, M4 2, M5 6), **62 in „Pflege & Fixes“**
(ohne Meilenstein-Bezug wären es 74). Der Großteil hängt an abgeschlossenen Features aus M1–M4; 11 Befunde nennen mehrere Features.

**Gebaut:**
- Reine Bausteine `befund-zuordnung.js` (`roadmapIds`, `zuordnungVon`, `offenerP02Befund`, `ordneBefundeZu`) mit Test (echte
  Grenzfälle, Rauchtest gegen den Arbeitsbaum); `entwicklung-daten.js` um `PRIORITAETS_SPALTEN`, `featurePrioritaeten`,
  `baueKanbanPrioritaet` mit Tests.
- Kanban · Priorität in `views/workboard.js`: Modus-Schalter Status | Priorität, Zeitleiste bleibt „kommt“; Spalten „P0 · Kritisch“,
  „P1 · Hoch“, „P2 · Normal“, „P3 · Später“, „Ohne Priorität“ (Vorlage `d_arbeit_prioritaeten.png`); Karten = offene Features (Priorität
  der Akte aus GET …/roadmap, eigener Anfragezähler, nie aus dem Poll) und offene Befunde; P4 in „P3“ mit Chip und „davon n P4
  (Alt-Bestand)“; höchstens 12 Karten, „Alle n hier zeigen“ klappt die Spalte auf; Filter Typ und „Pflege & Fixes“ (ohne Roadmap
  gesperrt mit Grund); Klick öffnet das vorhandene Detail. Kein Ziehen, keine Schreibroute.
- Eintrag-Detail (`views/workboard-detail.js`): Nachstellen, Erwartet, Tatsächlich, Ursache und Regressionstest aus dem Register, fehlend
  „fehlt“ (E-B5-5); im ganzen Eintrag beim Bug alle fünf, sonst nur vorhandene; Feature-Priorität in „Deine Planung“ aus der
  Roadmap-Projektion (A4) statt fest „Ohne Priorität“.
- CSS nur mit vorhandenen Tokens (fünf Spalten ab 1000 px Containerbreite, sonst 3/2/1); Texte de/en/tr/ru; Schlüssel
  `eintrag.befund.feldKommt` entfernt.

**Abweichungen (begründet):**
- P4 (Alt-Bestand, 21 offene) ohne eigene Spalte, in „P3 · Später“ mit Chip und „davon n P4 (Alt-Bestand)“ (A2; F-917 nannte P0–P4).
- Keine Suche im Kanban (B13: weder Vorlage noch Status-Board haben eine); Filter Typ und „Pflege & Fixes“.
- „Alle n hier zeigen“ klappt die Spalte auf statt in einen Listen-Reiter zu springen (die Listen gruppieren nicht nach Priorität).
- Kartentitel im Prioritäts-Kanban 15 px mit Silbentrennung statt 17 px (Prüfpass dg 3: fünf Spalten bei 1440 px brachen sonst
  mitten im Wort); mobil wie das Status-Board.
- „Neu laden“ und jeder Registerwechsel setzen die Filter des Prioritäts-Kanbans zurück, der Modus bleibt (qa 4, qa 5): während die
  Roadmap lädt, ist „Pflege & Fixes“ nicht prüfbar.
- Ohne roadmap.json (`nicht_vorhanden`) ein neutraler Satz statt Warnung (F-854, cr 1/qa 2); „Pflege & Fixes“ dann gesperrt mit
  eigenem Grund.

**Prüfpass:** design-guardian „Nicht freigegeben“ (Nachweis veraltet), code-reviewer und qa je „Freigegeben mit Hinweisen“. Eine
Korrekturrunde: „keine Roadmap“ neutral statt Warnung (cr 1, qa 2), gesperrter Pflege-Chip mit `aria-disabled` statt `disabled` —
per Tastatur erreichbar, Grund über aria-describedby (dg 2), Bug-Felder auch im ganzen Eintrag über „fehlt“ (dg 4), dieselbe
Token-Grenze wie `nenntFeature` und Meilenstein-Muster einmal je Projektion (cr 2, cr 4), Typ-Chips ohne zweites Kanban je Tick
(cr 4), Pflege-Filter beim Neuladen zurück (cr 6, qa 4), Leerzustand „Keine Einträge für diesen Filter“ (qa 3), Registerwechsel setzt
Kanban-Filter zurück (qa 5), Kommentare (qa 7, cr 7), Tests für Spalte „ohne“, unbekannten Feature-Status, Pflege ohne Roadmap,
Pflege + Typ FEATURE, F19-bridge, ungültige Roadmap im Detail (qa 10–12, cr 8), fünf Spalten ab 1000 px und Silbentrennung (dg 3),
Nachweis neu (dg 1, qa 1). dg 5 geprüft ohne Änderung (`uebersetzeDokument` läuft nur einmal beim Start). Rest → F-1208.

**Render-Nachweis** `nachweise/b5b2c1/` (2,8 MB WebP, 32 Bilder, Klicktabelle in `protokoll.json`): nur gegen eine selbst angelegte
Wegwerf-Kopie unter os.tmpdir() mit eigenem Leitstand-Prozess, Akten der Kopie präpariert (`Priorität: P1` in F45, `P2` in F30), rein
lesend; Roadmap-Fehler (500) und „keine Roadmap“ im Browser beantwortet. Lagen de dunkel/hell 1440/390, tr/ru 390, ru 1440, 200 % mit
reduzierter Bewegung: Kanban, Filter „Pflege & Fixes“ (16 P1 + 46 P2 = 62), nur Features (P1 F45, P2 F30, 3 ohne), Roadmap-Fehler
und keine Roadmap (Pflege gesperrt mit Grund), Rückweg vom Detail (Modus und Fokus bleiben), Bug-Detail F-1186 (fünf Felder) und
F-1010 (fünfmal „fehlt“), Feature-Detail F45 mit Priorität P1. Kein Seitenüberlauf, keine Seitenfehler; Kopie danach gelöscht,
Arbeitsbaum unberührt.

## Stand B5b-2c-2-C

**Auftrag:** B5b-2c-2 „Roadmap: Pflege & Fixes im Gantt, Restpunkte, Entscheidungen nachziehen“ (Challenger, 25.10.2026). Verlauf:
`plan-b5b2c2.md` → `advisor-b5b2c2.md` (Freigegeben mit Hinweisen, weiterer Schnitt: Teil C vorab, wie im Auftrag vorgesehen) →
`plan-b5b2c2-v2.md` (kein zweiter Advisor-Pass, Regel 3a). Dieses Paket ist nur Teil C plus Test-Einstufung; Gantt „Pflege & Fixes“
und die Restpunkte folgen als B5b-2c-2-AB. Keine Code- oder Serveränderung außer der Liste SERIELL, kein neues Gate.

**Gebaut:**
- Entscheidungen E-BRAIN-2 und E-R-1 = A wörtlich unter „## Entscheidungen“; Folgen für ältere Einträge benannt (E-BRAIN-1, E-F45-2,
  E-VORSCHAU-1, Scope R2), nicht umgedeutet.
- `## Workstreams`: R `verworfen` mit Verweis E-R-1; neu Brain-2 (1,5–2,5 AT) und Brain-3 (1–2 AT); Reihenfolge-Satz.
  Scope-Zeile R „Entfällt“.
- `docs/projekt/fixpaket-f45.md`: §2 „Referenzauftrag = F30-M1 (E-R-1 = A)“, §3 R entfällt, R2 „Stufen 2/3 vor F30“ (abhängig W2,
  B3), Zeilen Brain-2/Brain-3, Reihenfolge-Absatz ab B5b-2c.
- `features/F30/feature.md`: Nicht-Ziel R ersetzt („F30-M1 ist zugleich der Referenzauftrag des Fixpakets (E-R-1 = A); C1–C6 bleiben
  Messung, kein Bestehenskriterium“), Messpunkt Brain (a)/(b), E-F45-2 ohne Bezugspunkt R benannt.
- `state/findings.md`: Nachtrag F-1202 (vor F30, Methoden Stufe 2/3, Obsidian optional) und F-980 (Referenzauftrag = F30-M1); neu
  F-1209 (BUG P2, behoben durch die serielle Gruppe, Bestätigung über Stefans Läufe offen — Advisor A2); F-1186 Nachtrag „siehe
  F-1209“, Status bleibt offen.
- `scripts/teste.mjs`: `src/git-starter/git-starter.test.ts` in SERIELL (Test :159 brach am 25.10.2026 zweimal nach 30 s unter Last ab,
  einzeln ≈ 6 s).

**Abweichungen (begründet):** F-1209 „behoben, Bestätigung offen“ statt „erledigt“ (Advisor A2: dieselbe Fehlerklasse wie F-1186,
belegt erst durch Stefans volle Läufe). Workstream B5b-2 bleibt `laeuft` (Advisor A1: Abgenommen = Merge-Datum, Ist pflegt der
Challenger).

**Prüfpass:** code-reviewer und qa je „Freigegeben mit Hinweisen“. Eine Korrekturrunde: F-1209 mit Kopf „offen (behoben …)“ wie F-1186 — „behoben …“ zählte im Parser als erledigt (cr 2, qa 1); Sammelsatz zu den übrigen R-Bezügen samt Klärungsliste in der „Folgen“-Zeile und in `fixpaket-f45.md` §5, Nachträge F-982, F-1050, F-1165, F-1047 (cr 1, cr 3, qa 2, qa 7); R2 „W2, B3“ (cr 4); Brain-Kriterien in §2 als „Messung, kein Beleg“ (cr 6); F-1202 „vor Stufe 2“ als überholt benannt (qa 5b); Kommentar in `teste.mjs` ohne Zeilennummer (cr 10). Offen für B5b-2c-2-AB bzw. Challenger: `docs/STATUS.md` Reihenfolge (:103, :605, :662), Scope-Zeilen Brain-2/Brain-3, F30 „beginnt nach dem Fixpaket“, alte Reihenfolge und Summe in `fixpaket-f45.md` §3, Kurzinfo „1–2 AT“ an der verworfenen Zeile R, kein Test gegen das Entfernen des SERIELL-Eintrags (qa 6).

**Gates:** check-f45-b5b1a-planung, check-feature, check-docs, check-status-akten, check-akte-meilenstein, check-f21-workboard je Exit 0; `node --test scripts/teste.test.mjs` 7/7. `npm run test` in der Sitzung: seriell grün (7 Dateien, git-starter :159 in ≈ 4,4 s), parallel 1 Fehlschlag in unberührtem Code (`src/faehigkeiten/vorschlag.test.ts:277`, einzeln grün) → F-1210, nicht neu gestartet (F-1205).

## Stand B5b-2c-2-AB

**Auftrag:** B5b-2c-2-AB „Roadmap: Pflege & Fixes im Gantt + Restpunkte“ (Challenger, 25.10.2026) nach `plan-b5b2c2-v2.md` mit
`advisor-b5b2c2.md`; kein neuer Advisor-Pass (Regel 3a, Umfang unverändert). Keine Serveränderung, kein neues Gate,
ARCHITECTURE.md unverändert.

**Gebaut (Teil A — Gantt „Pflege & Fixes“, lesend):**
- `roadmap-anzeige.js` `ganttZeilen` mit optionaler Zuordnung (`befund-zuordnung.js` `ordneBefundeZu`, in `ganttLage()` der View je
  Datenstand einmal gerechnet): `befundeOffen` je Feature, am Meilenstein direkt + Features mit `befundeDirekt` (ein Feature in zwei
  Meilensteinen zählt an beiden — DEKLARIERT, F1), Trennzeile „· n offene Befunde“ (`trenner.befunde` nur mit Zuordnung, B3).
- Zeile „Pflege & Fixes“ (`art: 'pflege'`, grau `--muted` wie die Vorlage, Standard zu, „Alles aufklappen“ öffnet sie, leere Spur,
  Status „Geplant“) am Ende der offenen Meilensteine; bis zu 20 Befund-Zeilen (rotes Quadrat bei BUG, sonst grau), Rest als
  „+ n weitere“ mit „In der Entwicklung ansehen →“; kein „danach“ für Pflege und Befunde (B2); `bezug` und `spur` an jeder neuen
  Zeile (B1). Detail: Spur-Chip neutral mit festem Schlüssel, Inhalt mit Regel; Befund mit Typ · Priorität (unbekannter Typ:
  neutraler Chip), Schätzung „fehlt (Befunde tragen keine Schätzung)“, „Befund öffnen →“; kein „Anpassen“. Legende um „Bug“ und
  „Pflege & Fixes“ (feste Schlüssel, B4). Feature- und Meilenstein-Detail: Feld „Offene Befunde“ („n (P0–P2)“, am Meilenstein
  „davon m direkt am Meilenstein“, „keine“, „Lädt…“, „nicht verfügbar“).
- `views/workboard.js` `oeffneKanbanPrioritaet({ pflege })` mit Vormerker nach A4 (übernommen nur aus einer aktuellen Roadmap-Antwort
  `ok`; verfällt bei fehler/nicht_vorhanden, in `wechsleTab` samt Projektwechsel, beim Klick auf einen Kanban-Filterchip und beim
  Moduswechsel); Verdrahtungstest in `projekt-wechsel.test.mjs` (B12).
- Befund-Detail „Zugeordnet zu“ (F-1208 qa 6, A3): `zuordnungAnzeige` in `befund-zuordnung.js`, Quelle die Roadmap der Seite
  (`kanbanRoadmap`, `renderDetailNachtrag` nach dem Eintreffen, B10): „F45 · Titel“ als Link, „M5 · Titel (Meilenstein)“, sonst
  „ohne Feature-/Meilenstein-Bezug“ mit „(Spur Pflege & Fixes)“ nur bei offen P0–P2; ohne roadmap.json „Keine Roadmap angelegt“.

**Gebaut (Teil B — Restpunkte):**
- Bereinigungsliste: `neuerEintragsStand(eintrag)` wählt „Feature → ABGESCHLOSSEN“ vor, wenn möglich (beide Aufrufer mit Eintrag,
  ohne Eintrag keine Vorauswahl, B7); „Meilenstein → LAEUFT“ nachrangig (Klasse `nachrangig`), wählbar; F-1206 dg 3: Folgen nur
  im Bestätigungsschritt.
- `scripts/nachweis-laden.mjs` (Platzhalter je Wörterbuch, Warten mit Zeitgrenze und Nennung des Rests, ohne Playwright-Import, B9)
  mit Test; nur der neue Nachweis nutzt sie — `nachweise/b5b2c1/erzeuge-nachweis.mjs` wird nicht nachgerüstet (Auftrag).
- `scripts/teste.mjs`: `src/faehigkeiten/vorschlag.test.ts` in SERIELL (F-1210, wie F-1209 „behoben, Bestätigung offen“).
- `docs/STATUS.md`: Reihenfolge an drei Stellen auf E-BRAIN-2/E-R-1 (… → B3 → W2 → Brain Stufe 1 → 2 → 3 → F30; R verworfen),
  F25-Freitext „WS-2b/WS-3 (Import, Health) im V1-Backlog laut E-M5-17“.
- Akte: Scope-Zeilen Brain-2/Brain-3 (Wortlaut E-BRAIN-2), Klärung Challenger [EMPFEHLUNG] unter „Folgen …“, E-F45-2 und
  E-VORSCHAU-1 Stufe 2 „nach F30-M1“; Schnitt-Tabelle 2c-2 abgeschlossen; Workstream B5b-2 `erledigt` (Ist „–“, Abgenommen =
  erwartetes Merge-Datum 2026-10-25, bei späterem Merge nachziehen — Auftrag; Advisor A1 riet zu `laeuft`).
- Klärung (7): Kein Gate und kein Test prüft den Wortlaut in `harness-abgleich/standard.json` (nur der Inhalts-Hash wird als Quelle
  vermerkt, nicht verglichen) ⇒ viermal „für den Referenzauftrag F30-M1 (E-R-1 = A) nicht zulässig“.
- Findings: F-1010 erledigt (R1-Bereinigung #383, F30 mit Akte, AF-F001 deklarierte Ausnahme, B11); Nachträge F-1206 (dg 3),
  F-1208 (qa 6), F-1165, F-1047, F-982, F-1050 (Klärung Challenger); F-1210 behoben, Bestätigung offen; F-1186 unverändert offen (A2).

**Prüfpass:** design-guardian, code-reviewer und qa je „Freigegeben mit Hinweisen“, kein hoher Befund. Eine Korrekturrunde: Zeile
„+ n weitere“ bricht nicht mehr dreizeilig um, Link als Textlink (dg 1, qa 2); „Pflege & Fixes“ in der Legende als Quadrat (dg 2);
„Zugeordnet zu“ ohne Link bei einem Feature ohne Akte (cr 3, qa 7); „davon 0 direkt“ entfällt (cr 5); DEKLARIERT: Workitems
scheitern ⇒ keine Pflege-Zeile im Gantt, Roadmap ohne Meilensteine ⇒ keine Pflege-Zeile (qa 4, cr 4); Kommentar zur Vorauswahl
eines schon angelegten Stands (cr 6); Vormerker-Tests um „vor der Antwort ungefiltert“, `fehler` und überholte Antwort (cr 1, qa 5);
Grenze 20/21 (qa 6); Notiz der Zeile B5b-2 nennt den Auftrag statt Advisor A1, Plan v2 nachgezogen (cr 2, qa 1); Status-Absatz
(qa 10); Nachweis-Skript um 200 % mit reduzierter Bewegung, ru-390, Ausschnitt „+ n weitere“ und F-013 als BUG in der Kopie (dg 4,
qa 2, qa 3). Rest als F-1211 (cr 7, qa 6 View-Test, qa 8 Status-Pille, qa 9 Doku-Reste außerhalb des Auftrags, dg 3, dg 5).

**Render-Nachweis:** `nachweise/b5b2c2ab/erzeuge-nachweis.mjs` (Wegwerf-Kopie, Präparation F20/M4 und F-013, rein lesend, gemeinsame
Wartehilfe). Erster vollständiger Lauf vor der Korrekturrunde: 48 WebP, 2,5 MB, `ueberlaufSeite` 0, keine Seitenfehler, Vorauswahl
„F20 → ABGESCHLOSSEN“ gesetzt, Kanban nach dem Link mit „Pflege & Fixes“ gedrückt. Der Lauf nach der Korrekturrunde wurde von der
Sitzung wegen Speichermangel gestoppt (nicht neu gestartet); im Ordner liegen nur seine ersten 9 Bilder, kein protokoll.json —
Nachweis neu zu erzeugen.

**Gates:** check-f20-design-tokens, check-f44-i18n, check-f21-workboard, check-f21-ws2-workboard-oberflaeche, check-f45-b5b1a-planung,
check-f45-b5b1b2-bereinigung, check-feature, check-docs, check-status-akten, check-akte-meilenstein je Exit 0, lint und tsc grün;
betroffene Tests einzeln grün (nach der Korrektur 95/95 plus projekt-wechsel 34/34); `npm run test` vor der Korrekturrunde grün
(parallel 2688, seriell 209, 0 Fehler, 2 übersprungen).

## Stand B5b-3

**Auftrag:** B5b-3 „Ist nach Abnahme“ (R7, `docs/projekt/fixpaket-f45.md` §2) und Kleinpunkte (Challenger, 27.10.2026). Plan
`plan-b5b3.md` → Advisor `advisor-b5b3.md` „Freigegeben mit Auflagen“ (A1–A6, H1–H4) → `plan-b5b3-v2.md`. Entscheidungen Stefan
(27.10.2026): **A2 = Vorbedingung tragen** (die Zeile steht vor dem Start auf `laeuft` und ist committet; `workstream_ref` als
F-1217 nach F30-M1), **A3 = Ist „–“ bei 0**. Zuordnung nach der Challenger-Regel (`feature_ref`, genau eine laufende Zeile) — der
Advisor nannte `workstream_ref` nur als Vorschlag für später.

**Schreibstelle (Abnahme ↔ Sichern):** POST `…/abnahme`, Zweig ANGENOMMEN, nach dem Registrieren der Entscheidung, in die Akte im
Laufort des Ablaufs. Die Abnahme liegt vor dem Sichern; im Arbeitsordner steht die Akte danach in derselben Dateiliste und
demselben Befehlsblock „Bereit zum Sichern“ wie der Bau (ein Commit, ein PR). Ohne Arbeitsordner: Projektordner mit der Sperre wie
PUT …/planung und Git-Block in der Antwort. „Review veraltet“ rechnet nur bei offener Abnahme, Aufräumen ist bis zur Abnahme
gesperrt — keine Nebenwirkung. R7 ist Nebenwirkung: scheitert es, gilt die Abnahme trotzdem (Hinweis in der Antwort).

**Gebaut:**
- `src/feature-auftrag/ist-nach-abnahme.ts` (rein): CRLF / abgeschlossen / Formfehler / keine laufende Zeile (Hinweis auf die
  Vorbedingung) / mehrere (Hinweis mit Anzahl) / Begonnen nach dem Abnahmetag (A1) ⇒ Hinweis; Token `· Abnahme <workflowId>` am
  Zeilenende ⇒ idempotent; Status `erledigt`, Abgenommen, Begonnen-Ersatz = Anlage des Ablaufs (erster Checkpoint der
  Workflow-Kette) mit Herkunft in der Änderungszeile, Ist = `arbeitstageBis`, 0 ⇒ „–“; Akte-Gate und Rundlauf.
  `ersetzeZelle`/`workstreamZeilen` aus `planung-schreiben.ts` (eine Stelle).
- `scripts/leitstand/ist-nach-abnahme.mjs` (I/O, wirft nie; Laufort erst im try, Rückbau mit eigener Meldung); Verdrahtung im
  Server, Feld `ist_nach_abnahme` nur mit `feature_ref`. Ausgleich W1: `findeAusfuehrungsSchritt` und `ermittleAbnahmeStand`
  unverändert nach `scripts/leitstand/abnahme-stand.mjs`; Server 13 240 → 13 198, Ratsche gesenkt.
- Leitstand: Erfolgstext der Abnahme mit Satz zu R7 (`abnahmeErfolg`, Hinweis im Hinweis-Stil), i18n de/en/tr/ru.
- ARCHITECTURE.md §2 (R7 im Laufort, Arbeits- oder Projektordner; doppelte Aussage zu den Bezeugungen in §1 gestrichen, sie steht
  in §3 — Kern 17 781 B) und `docs/architektur/arbeitsordner.md` (Regel und DEKLARIERT).
- Kleinpunkte: Pille „Offen“ statt „Geplant“ an Befund- und Pflege-Zeilen und im Detail (F-1211 qa 8; bewusste Abweichung von der
  Vorlage V10, Entscheidung Challenger „ehrlich vor Vorlage“, design-guardian dg 1); F30-Akte und fixpaket §3 nach Klärung (1);
  E-W2-1 und Reihenfolge W2 vor V1 in Akte und fixpaket §3; F-1212–F-1216, Nachtrag F-1190, F-1211; Bereinigung B5b-1b-2 (#378) und
  T (#379) auf `erledigt`, B5b-3 `laeuft`.

**DEKLARIERT:** Vorbedingung `laeuft` + Commit; Zuordnung nur über `feature_ref`; Hinweis nur in der Antwort, keine zweite Abnahme
(auch ein vorübergehender Grund bleibt Handarbeit); der Git-Block des Projektordner-Falls wird nicht angezeigt (Verweis auf die
Code-Ansicht); „erst abnehmen, dann sichern“ nicht erzwungen; Hinweisgründe kommen deutsch vom Server (auch in en/tr/ru).

**Prüfpass:** code-reviewer, qa, design-guardian je „Freigegeben mit Hinweisen“. Eine Korrekturrunde: cr 1 (Laufort im try), cr 2
(Begonnen-Ersatz fehlertolerant), cr 3 (Rückbau-Meldung), cr 4/qa 3/qa 4/qa 5 (Tests Rückbau, Laufort, Sperre, Begonnen-Ersatz über
die Route, Akte ohne „## Änderungen“), cr 5/qa 1 (Verweis auf die Code-Ansicht, DEKLARIERT), cr 6/qa 2 (0 und mehrere getrennt,
Vorbedingung nur bei 0). Offen: dg 2 → F-1218, qa 6 → Nachtrag F-1211 (qa 6), qa 7 → F-1219,
F-1217. B5b-3 gemergt #387 (`5ce0b47`) am 27.10.2026 — damit `erledigt`, Abgenommen = Merge-Datum (Challenger: freigegeben mit
Hinweisen); Render-Nachweis und voller `npm run test` nach der Korrekturrunde gehörten zu Stefans Commit-Block vor dem Merge.

## Stand W2a

**Auftrag:** W2a „Gates: Läufer + Inventur“ (Challenger, 27.10.2026; E-W2-1, Schnitt W2a–W2d, Server-Monolith gestrichen).
Plan `plan-w2a.md` → Advisor `advisor-w2a.md` „Freigegeben mit Hinweisen“ (A1–A5, B1–B9, kein Schnitt) → `plan-w2a-v2.md`.
A1 = (a) nach F-1215 (Frist-Gates seriell; Maßnahme des Findings, keine neue Abwägung).

**Gebaut:**
- `scripts/check-kette.mjs` (neu): eine Quelle `GATES` (die 122 Befehle der früheren `&&`-Kette wörtlich, gleiche Reihenfolge —
  Abgleich gegen `main:package.json` 122 = 122) und Läufer: zuerst `SERIELL` einzeln (23 Gates: Repo-Baum-Läufer,
  `startvorlagen/`-Schreiber, Frist/Zeit/Ausfall F-1215, echtes Home), danach die übrigen 99 mit höchstens N gleichzeitig
  (Standard 4, `AIW_GATES_PARALLEL`); Startzeile, Block je Gate (stdout/stderr getrennt), Zusammenfassung am Ende mit den
  letzten 20 Zeilen je rotem Gate und Schlusszeile „zuerst rot: …“; Exit 0/1/2 über `hauptprogramm`; Haupteinstieg per
  realpath. Nur `node:`-Importe (Regel 1j, B1). `package.json` `check:gates` ruft ihn.
- `scripts/check-kette.test.mjs` (neu, 14 Tests, steuerbarer Starter ohne Wanduhr, absichtlich rotes Pseudo-Gate, Weg über
  `npm run check:gates`).
- `scripts/messe-check.mjs` nimmt `GATES` statt die Kette zu zerlegen; `docs/harness/HARNESS-OVERVIEW.md` §5 Rückfallebene
  mit `AIW_GATES_PARALLEL=1`. CI unverändert: sie ruft `npm run check` und daneben nur den Chrome-Klicktest
  `check-f20-leitstand-shell.mjs`, kennt die Kette also nicht.
- Inventur `w2-gate-inventur.md`: 122 Gates, 52 263 Zeilen; Verhalten 74, gemischt 20, Invariante 15, Codeform 7,
  Sicherheit 6; Kandidaten W2b: ersetzen durch Test 60, behalten 59, löschen 3 (Vorschlag, DEKLARIERT).
- Aufräumen: B5b-3 `erledigt` (Merge #387), W2 `laeuft`, Reihenfolge W2 vor V1 hier und in `docs/STATUS.md`; F-1220–F-1226,
  Nachtrag F-1215.

**DEKLARIERT:** SERIELL zuerst und Weiterlaufen nach Rot (Folgefehler möglich, erstes rotes Gate zuerst und in der
Schlusszeile); kein Timeout je Gate, ein hängendes Gate zeigt eine Startzeile ohne Kopfzeile; Puffer unbegrenzt; bei Abbruch
unter Windows können bis zu N Gate-Prozessbäume verwaisen; Klassifizierung der Inventur durch Lesen, nicht gemessen.

**Prüfpass:** code-reviewer und qa je „Freigegeben mit Hinweisen“. Eine Korrekturrunde: cr 1 (Parallelität in
`fuehreKetteAus` geprüft, Vollständigkeit der Ergebnisse), cr 2/qa 6 (Haupteinstieg per realpath, Test über
`npm run check:gates`), qa 2 (`hauptprogramm` mit Tests für Exit 0/1/2), qa 1 (Schlusszeile „zuerst rot“), qa 4 (SERIELL
zuerst statt zuletzt — Repo-Baum-Läufer sehen den Stand vor allen Wegwerf-Ordnern wie früher), cr 3 (Kopf), cr 4 (Verkleben,
„(keine Ausgabe)“), cr 5 (Signal-Test), cr 9/qa 5 (falscher Arbeitsordner), cr 6 (CI-Begründung, Gate außerhalb der Kette in
der Inventur), cr 8/qa 7/qa 8 (DEKLARIERT), cr 10/qa 10 (Doku, Tests 20-Zeilen-Kürzung, nur stderr, alles grün,
Sicherheits-Gates in der Liste), qa 9 (Zurücksetzen der Variable in der Doku; keine Obergrenze — mehr als Gates laufen nie),
qa 12 (Zeilen wie `wc -l`, Summen neu), qa 13 (Reihenfolge). Offen: teste.mjs-Einstieg → F-1226; qa 3 → zwei Läufe im
Commit-Block; qa 14 (W2 ist einzige laufende Zeile in F45, R7 würde sie bei ANGENOMMEN mit `feature_ref` F45 schließen,
F-1217) — W2 läuft außerhalb der Workforce.

**Prüfung in der Sitzung:** `node --test scripts/check-kette.test.mjs` (13 grün, 1 nur POSIX), Mutationsprobe (sechs
Mutationen, je rot), Trockenläufe über den neuen Läufer: 6 leichte Gates (Wanduhr 1,0 s, Σ 1,9 s); nach der Korrekturrunde
über `hauptprogramm` 13 Gates inkl. lint, typecheck und vier seriellen (alle grün, Wanduhr 30,7 s, Σ 43,6 s). Erwartung voller Lauf aus den Messwerten: SERIELL ≈ 257 s plus
parallele Gruppe ≥ 112 s ⇒ ≈ 6–7 min (Messung lief unter Speicherdruck; im frischen Terminal weniger). Voller Gate-Lauf
über den neuen Läufer (zweimal, qa 3) und `npm run test` im Commit-Block (F-1220); die gemessene Wanduhr ersetzt die
Erwartung.

Voller Gate-Lauf im Commit-Block (2026-10-27): zweimal gruen, Wanduhr 826.5 s und 739.3 s (Parallelitaet 4); npm run test gruen.

## Stand W2b-1

**Auftrag:** W2b-1 „Gates umbaufest“ (Challenger, 27.10.2026; Grundlage `w2-gate-inventur.md` Befunde 1, 2, 5). Ziel
Umbaufestigkeit, nicht Gates in Tests umschreiben (verschiebt nur Laufzeit; „ersetzen durch Test“ nur beim Anfassen des
Bereichs, F-1228). Plan `plan-w2b1.md` → Advisor „Nicht freigegeben“ (kein Schnitt, acht Auflagen) → `plan-w2b1-v2.md` →
Nachpass „Freigegeben mit Hinweisen“ (eine Korrekturrunde).

**Gebaut:**
- Eine Zählstelle: `starteWorkflowSchritt(` = 6 und Workflow-Schreiber 14 / `.eingefroren` 13 zählt nur noch
  `check-f15-workflow` (AK6b/AK7, F-228); gestrichen in 30 Gates (b2b3c/b2b3d (f) ganz, b2b3b1 (f) behält die Opt-in-Prüfungen). Wer f15-workflow in Tests
  umbaut, nimmt die drei Zählungen mit. Server-Zeilenratsche nur `check-wachstumsbremse-server` (gestrichen in 4 Gates).
- Pins: sha256 auf `scripts/_rueckfrage-aus-pruefung.mjs` in 2 Gates gestrichen; die Strenge tragen die Rotfälle o3 in
  `check-f45-b2b3b2b2a-einschalten`, neu ein neunter (zweite Vorgabe `rueckfrageBasis`). `f36-ws3-empfehlung` (e) bleibt
  (schließt F-833 (1), hängt an der Ausgabe; jede Wortlautänderung des Auftragstexts färbt es gewollt rot).
- Gelöscht nach Belegprüfung: `check-f24-capabilities`, `check-f15-workflow-oberflaeche` (aus `GATES`, jetzt 120); gestrichen
  f28-persona (1), f21-ws2 (d); dazu ein ERFOLGREICH-Fall in `attention-daten.test.mjs`. `check-f8-execution-controller`
  bleibt (Grenze ohne Ersatz, Entscheidung Stefan 04.09.2026).
- F-1174 (Zeitgrenze 0): Code-Fehler — `fuehreGitAsync` startete git auch bei 0; jetzt `!(zeitgrenzeMs > 0)` ⇒ sofort
  `abbruch: 'zeitgrenze'` vor `gitProgramm()`, Test per setImmediate-Race (auf dem alten Code rot).
- Umfang (nach der Korrekturrunde): Gates +81/−914 Zeilen, gesamt +224/−943. Findings F-1227–F-1229 neu; F-261, F-563, F-1174 erledigt; Inventur
  „Stand W2b-1“ (dabei die verschobene erste Zeile von main entfernt).

**DEKLARIERT:** Restgrenzen nach `check-f15-workflow-oberflaeche` — Endpunkt-Zuordnung in `api.js` für `/starten`,
`/freigabe`, Reparatur-`POST /workflows` und die Container-ids in `index.html` prüft nur noch der Render-Nachweis; eine neue
Form in `ERLAUBT_HANDLER`/`ERLAUBT_KARTE` fällt keinem Rotfall auf; der Race-Test belegt den Zeitpunkt, nicht „kein
execFile“; „Muster check-f15-workflow-oberflaeche“-Erwähnungen in anderen Gates und historischen Dokumenten bleiben.

**Prüfung in der Sitzung:** 34 geänderte Gates einzeln grün (fb2 nach Korrektur einer Klammer erneut), `npm run lint`,
`npm run typecheck`, `check-docs`, `check-kette.test.mjs`, `git-starter.test.ts` + `vorschlag.test.ts` (30 grün, 1 übersprungen),
`attention-daten.test.mjs` (20 grün). Rotbelege: F-1174-Test auf altem Code rot; Filter ohne `ergebnis` ⇒ Test rot; Syntaxfehler
unter `public/` ⇒ `biome lint` Exit 1. Statischer Nachweis: Zählung nur in `check-f15-workflow`, `obergrenze_zeilen` nur in
`check-wachstumsbremse-server` (ohne `*.test.mjs`). Voller Gate-Lauf und `npm run test` im Commit-Block.

**Prüfpass:** code-reviewer und qa je „Freigegeben mit Hinweisen“, keine kritischen Befunde. Eine Korrekturrunde (nur Kommentare
und Doku): veraltete Kopfzeilen (f3a „(a)–(e)“, f3a2 „(a)–(g)“, fb1/fb1b (e), f3b1 `leseQuellen`, b2b3b2a/b2b3b2b1a „beide“,
a3/b1 „Hash-Pin bzw. o3“), f21-ws2 und f20 nicht mehr „public/ außerhalb von Biome“ bzw. Verweis auf die gelöschte Datei,
Hinweis „einzige Zählstelle“ im Kommentar von `check-f15-workflow`, `docs/STATUS.md` (f15-workflow-oberflaeche entfallen),
Nachträge F-251 und F-1151 (6), Inventur präzisiert (b2b3b1 (f) bleibt mit Opt-in). Dabei behoben: das Findings-Skript hatte
mangels eigener Status-Zeile bei F-563 die Status-Zeile von F-652 überschrieben — aus HEAD wiederhergestellt, F-563 hat jetzt
eine eigene. Offen, DEKLARIERT: keine Zuordnung je Fall des gelöschten `check-f15-workflow-oberflaeche` (laut F15-Akte 42–65
Zusagen) zu Ersatz oder Restgrenze — grob: (f) Syntax → Biome; Felder/Zustand/Reparatur → View-Tests `workflow-detail`,
`workflow-eingriffe`, `workflows-dialog` (nicht je Fall gegengeprüft); Endpunkte (b)/(e)/(g) und Container-ids (a) → Restgrenze
(Render-Nachweis; der Chrome-Klicktest in CI läuft mit `continue-on-error`). Weitere „Muster …“-Erwähnungen in anderen Gates
(z. B. `check-f42-projekt-harness`, `check-f12-leitstand-ansicht`) bleiben.

Voller Gate-Lauf im Commit-Block (2026-10-27): gruen, Wanduhr 719.2 s (Parallelitaet 4, 120 Gates); npm run test gruen im ersten Lauf.
