# Journal — F14

Anhängeprotokoll. Neue Einträge unten anfügen, bestehende nicht ändern.

## 2026-09-09 — Akte angelegt (Status READY_FOR_TECH), WS-1 gebaut

Akte auf Grundlage des F14-Auftrags vom 09.09.2026 (Repo-Stand `be8a62f`)
angelegt. Zehn Akzeptanzkriterien (AK1–AK10). Zwei neue Findings ins
Register aufgenommen (F-175, F-176).

WS-1 (AK1, AK2, AK3) real gebaut: `Starter` (`src/claude-code-gateway/
types.ts`) trägt additiv einen dritten, optionalen Parameter
`StarterOptionen` (`zeitgrenzeMs`, `abbruchSignal`); `ProzessErgebnis`
trägt additiv `beendigungsart: 'TIMEOUT' | 'ABBRUCH' | null`.
`echterStarter` (`src/claude-code-gateway/prozessstart.ts`) nutzt
`execFile`s eingebaute `timeout`-/`signal`-Optionen — kein eigener Timer.
`zeitgrenzeMs` von `AusfuehrungsOptionen`
(`src/execution-controller/types.ts`) über `starteGateway`
(`src/claude-code-gateway/index.ts`) bis `starteProzess` durchgereicht,
kein fest codierter Default (nur `execFile`s eigener Default, dokumentiert
an der einen Stelle). `zeitgrenzeMs` in `VERBOTENE_OPTIONEN_FELDER`
(`scripts/leitstand-server.mjs`) nachgetragen. Löst F-176.

Bewusst nicht in WS-1: Prozessbaum-Kill unter Windows (WS-2), F7-
Klassifikation (WS-3), Leitstand-Endpunkt (WS-4).

## 2026-09-09 — WS-2 gebaut (AK4), Annahme aus WS-1 real widerlegt

`killeProzessbaumFallsWindows` (`src/claude-code-gateway/prozessstart.ts`)
ergänzt: `taskkill /PID <pid> /T /F` nach einem TIMEOUT/ABBRUCH-Kill,
nur unter `process.platform === 'win32'`, idempotent (schluckt einen
Fehler-Exit bei bereits totem/unbekanntem PID). `echterStarter` erfasst
dafür jetzt das von `execFile` zurückgegebene ChildProcess-Objekt.

Reale Messung auf der Zielmaschine (Node 24.16.0, siehe
`features/F14/nachweis-ws2.md`) widerlegt die in WS-1 unbelegt
übernommene Annahme „execFiles Kill-Mechanismus trifft unter Windows nur
den direkten Kindprozess": Node killt einen *nicht* detachten
Unterprozessbaum unter Windows bereits selbst (Job-Object-Mechanismus).
Der neu gebaute `taskkill`-Aufruf schlägt in der vorgegebenen Reihenfolge
(Node killt zuerst, `taskkill` erst danach im Callback) real
reproduzierbar mit „Prozess nicht gefunden" fehl, da die Ziel-PID zu
diesem Zeitpunkt bereits tot ist — bleibt als dokumentiertes, wirkungs-
loses Sicherheitsnetz im Code. AK4 gilt für den real beobachtbaren Fall
(nicht detachte Unterprozesse) als erfüllt, getragen von Node selbst,
nicht vom neuen Code. Ein detachter Enkelprozess bleibt ungetestet und
ungesichert — kein bekannter Anwendungsfall, als F-181 (TECH_DEBT, P3)
festgehalten.

Realer Nachweis: `starteProzess killt bei TIMEOUT unter Windows den
kompletten Prozessbaum, kein Waisenprozess übrig (F14 WS-2, AK4)` —
echter Enkelprozess, echter TIMEOUT, echte Waisen-Prüfung über
`process.kill(pid, 0)`. `npm run check`: 157/157 grün, WS-1-Tests
unverändert. Korrekturen in `features/F14/feature.md` (AK4-Nachtrag) und
im WS-1/WS-2-Kommentar in `prozessstart.ts` nachgezogen — keine
stillschweigende Umdeutung.

Bewusst nicht in WS-2: F7-Klassifikation (WS-3), Leitstand-Endpunkt
(WS-4), kein eigener Kill-Timer/keine Reihenfolgeänderung, um WS-1s
Fehlerklassifikation nicht anzufassen (F-181, Empfehlung).
