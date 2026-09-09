# F14 WS-2 — Nachweisprotokoll (AK4)

Stand: 09.09.2026. Repo-Stand bei Erstellung: `main` = `235a192`
(F14 WS-1, PR #103/#104, .gitignore-Fix #105). Grundlage:
`features/F14/feature.md` AK4. Zielmaschine: reale Windows-11-Maschine
(Node 24.16.0), kein CI-Container — AK4 verlangt ausdrücklich einen
realen Nachweis auf der Zielmaschine, keine Attrappe.

**Ergebnis vorweg:** AK4s Kernaussage — nach einem TIMEOUT/ABBRUCH-Kill
läuft kein Prozess der gestarteten Baumhierarchie mehr — ist real erfüllt
und über einen echten `node --test`-Lauf belegt. Der Mechanismus dahinter
ist aber **nicht** der ursprünglich angenommene: nicht das neu gebaute
`taskkill /T /F`, sondern Node 24.16.0s eigener Windows-Job-Object-
Mechanismus. `taskkill` bleibt im Code als dokumentiertes, aber
wirkungsloses Sicherheitsnetz (siehe Finding F-181). Diese Korrektur ist
das Hauptergebnis dieses Nachweisprotokolls.

---

## 1. Ausgangslage

Der WS-1-Kommentar (unverändert seit dem F14-Auftrag) behauptete: „unter
Windows killt weder execFiles timeout-Mechanismus noch signal die
Unterprozesse des Kindprozesses — nur der direkte Kindprozess stirbt."
Diese Annahme war zu Beginn von WS-2 unbelegt (keine Fundstelle, kein
Messdatum). Der Auftrag verlangte einen `taskkill /T /F`-Sweep als
Gegenmaßnahme, aufgerufen aus `echterStarter`s execFile-Callback heraus —
also **nach** Node's eigenem timeout-/signal-Kill.

## 2. Messreihe

Alle Messungen real auf der Zielmaschine ausgeführt (`node <script>.cjs`
bzw. `node --test`), nicht simuliert.

### Messung 1 — nicht detachter Enkelprozess, `execFile`-Timeout, ohne `taskkill`

Ein Kindprozess (`execFile`, `timeout: 500`) spawnt selbst einen weiteren
Node-Prozess ("Enkel", `stdio: 'ignore'`, nicht detached) und hängt
danach absichtlich. Nach Ablauf des Timeouts killt Node den Kindprozess
über seinen eingebauten Mechanismus — **ohne** dass irgendein
`taskkill`-Aufruf beteiligt ist.

**Ergebnis:** Der Enkelprozess ist bereits ~10ms nach dem Kill-Callback
tot (`process.kill(enkelPid, 0)` wirft `ESRCH`). Node 24.16.0 killt den
nicht detachten Unterprozessbaum unter Windows demnach bereits selbst.

### Messung 2 — detachter Enkelprozess, `execFile`-Timeout, ohne `taskkill`

Wie Messung 1, aber der Enkelprozess wird mit `detached: true`
gespawnt.

**Ergebnis:** Der Enkelprozess überlebt den Kill des Kindprozesses und
läuft unverändert weiter (mehrfach über 4+ Sekunden gepollt, durchgehend
`alive: true`). Ein detachter Prozess entkommt Node's Windows-Job-Object
(Windows-Breakaway) und wird von Node's eigenem Mechanismus nicht mehr
erfasst.

### Messung 3 — `taskkill /T /F`, aufgerufen NACH dem Kill des Kindprozesses (reale `echterStarter`-Reihenfolge)

Wie Messung 2 (detachter Enkel), aber nach dem `execFile`-Timeout-Kill
wird zusätzlich `taskkill /PID <kindPid> /T /F` aufgerufen — exakt die
Reihenfolge, die `echterStarter` real implementiert.

**Ergebnis:**
```
taskkill exitErr: Command failed: taskkill /PID 22376 /T /F
FEHLER: Der Prozess "22376" wurde nicht gefunden.
RESULT enkel alive after taskkill (real echterStarter ordering): true
```
`taskkill` schlägt fehl, weil die Kind-PID zu diesem Zeitpunkt bereits
tot ist (von Node selbst gekillt) — `taskkill /T` kann den Prozessbaum
nur über eine noch lebende Ziel-PID aufbauen. Der detachte Enkel bleibt
Waise.

### Messung 4 — `taskkill /T /F`, aufgerufen WÄHREND der Kindprozess noch lebt (Kontrollmessung)

Wie Messung 3, aber `taskkill` wird unabhängig von Node's eigenem
Timeout-Mechanismus aufgerufen, solange der Kindprozess noch läuft.

**Ergebnis:**
```
taskkill stdout: ERFOLGREICH: Der Prozess mit PID 6736 (untergeordnetem
Prozess von PID 29908) wurde beendet.
ERFOLGREICH: Der Prozess mit PID 29908 (untergeordnetem Prozess von PID
16504) wurde beendet.
enkel alive after taskkill-while-parent-alive: false
```
`taskkill /T /F` funktioniert korrekt und killt auch einen detachten
Enkel — vorausgesetzt, die Ziel-PID lebt zum Aufrufzeitpunkt noch. Das
bestätigt: das Werkzeug selbst ist nicht defekt, die vorgegebene
**Reihenfolge** (Node zuerst, `taskkill` danach) macht es für den
Detached-Fall wirkungslos.

### Messung 5 — realer Testlauf über `starteProzess` (im Suite-Test)

Der reale Testfall in `claude-code-gateway.test.ts` (`starteProzess killt
bei TIMEOUT unter Windows den kompletten Prozessbaum...`) mit einem
nicht detachten Enkelprozess: **grün**, ~1050ms, `beendigungsart:
'TIMEOUT'`, Enkel real tot nach Rückkehr des `starteProzess`-Promises.
Ein Versuch, diesen Test durch Deaktivieren des `taskkill`-Aufrufs
gezielt „rot" zu bekommen, blieb **ebenfalls grün** (~92s Laufzeit statt
~1s — auffällig, aber kein Fehlschlag) — das war der erste Hinweis
darauf, dass nicht `taskkill`, sondern ein anderer Mechanismus die
Wirkung trägt, und führte zu den gezielten Messungen 1–4 oben.

## 3. Einordnung gegen AK4

| Teilaussage | Real geprüft | Ergebnis |
|---|---|---|
| Kein Prozess der gestarteten Baumhierarchie läuft nach TIMEOUT/ABBRUCH-Kill mehr (nicht detachter Fall — der einzige real beobachtete Fall für Claude-Code-Kindprozesse) | Ja | ✅ erfüllt, getragen von Node 24.16.0s eigenem Windows-Job-Object-Mechanismus |
| `taskkill /T /F` als zusätzlicher Sicherheitsnetz-Aufruf | Ja | Läuft real, schlägt in der gegebenen Reihenfolge real reproduzierbar mit „Prozess nicht gefunden" fehl, wird korrekt geschluckt, stört den bestehenden TIMEOUT/ABBRUCH-Pfad nicht |
| Detachter Enkelprozess | Ja (Messung 2/3) | ❌ nicht abgedeckt — weder durch Node noch durch `taskkill` in der gegebenen Reihenfolge. Kein bekannter Anwendungsfall bei Claude-Code-Kindprozessen. Festgehalten als F-181 (TECH_DEBT, P3, offen) |

**AK4 erfüllt: JA, für den real beobachtbaren Fall** (nicht detachte
Unterprozesse des von `starteProzess` gestarteten Kindprozesses) — durch
die Node-Laufzeit selbst, nicht durch den in WS-2 gebauten Code. Der
gebaute `taskkill`-Sweep ist korrekt implementiert, idempotent und
harmlos, trägt aber auf dieser Node-Version keine eigene Wirkung. Diese
Erkenntnis ist im Code (`prozessstart.ts`), in `features/F14/feature.md`
und als Finding F-181 festgehalten — keine stillschweigende Korrektur.

## 4. Vollständiger Regressionslauf

`npm run check` — 157/157 Tests grün, Exit 0, alle bestehenden WS-1-Tests
unverändert bestanden (siehe `claude-code-gateway.test.ts` Zeilen
593-641).

## 5. Abbruchkriterien

Keines eingetreten — die Abweichung von der ursprünglichen Annahme wurde
real gemessen, dokumentiert und korrigiert statt den Bau abzubrechen.
