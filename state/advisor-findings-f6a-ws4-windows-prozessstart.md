<!-- Ziel-Pfad im Repo: state/advisor-findings-f6a-ws4-windows-prozessstart.md -->

# Advisor-Befunde — F6a WS4: Windows-tauglicher Prozessstart (F-069)

Geprüft am 02.09.2026 gegen den realen Dateistand (`src/claude-code-gateway/*`,
`scripts/check-f6a-claude-code-gateway.mjs`, `scripts/verify-f6a-real-run.mjs`,
`features/F6a/feature.md`, `state/findings.md`, `state/gates.md`) gegen
`state/plan-v1-f6a-ws4-windows-prozessstart.md`. Frischer Kontext, kein
Zugriff auf die Challenge-Argumentation.

**Gesamturteil des Advisors:** `PLAN_TRAEGT_MIT_NACHBESSERUNG`.

Drei Befunde wurden von der Challenger-Sitzung unabhängig nachgemessen und
real bestätigt (siehe „Nachmessung" unten). Alle 13 Befunde sind
übernommen; keiner wurde verworfen.

---

## Befund 1 — Diagnose korrekt, kein übersehener shell-freier Startweg

`HINWEIS` · **übernommen**

Alternativen real durchgeprüft: `npx`/`npm exec` sind selbst `.cmd`;
`cmd.exe /c` wäre eine Shell; native `claude.exe` existiert auf der
Maschine nicht (`where`-Messung, `state/gates.md:1244–1248`).
`node.exe <cli-js>` ist der einzige verbleibende shell-freie Weg.

**Nachbesserung:** Schritt 0 misst den CLI-Einstieg über das `bin`-Feld der
`package.json` unter `<npm root -g>/@anthropic-ai/claude-code/`, statt den
Dateinamen `cli.js` zu raten.

## Befund 2 — `Starter`-Signaturwechsel bricht Aufrufstellen *still*

`WICHTIG` · **übernommen**

`claude-code-gateway.test.ts:142`: `const spyStarter: Starter = async (tokens) => …`.
TypeScript erlaubt einen Ein-Parameter-Callback dort, wo zwei erwartet
werden — nach dem Signaturwechsel bindet `tokens` stillschweigend an das
Startziel. Kein Typfehler, aber ein semantisch falscher Spy.

Hart brechen nur `test.ts:41–49` (fehlendes Pflichtfeld) und `test.ts:219`
(Arität). `scripts/verify-f6a-real-run.mjs:74–80` bricht erst zur Laufzeit
(`.mjs`, kein Typecheck). Das Gate-Skript ruft weder `starteGateway` noch
`starteProzess` — dort bricht nichts.

**Nachbesserung:** alle Attrappen-/Spy-Stellen explizit mit beiden Parametern
neu schreiben, nicht auf den Compiler verlassen.

## Befund 3 — Reihenfolge Startziel-Prüfung vs. F4-Check kann AK2/AK4 schwächen

`WICHTIG` · **übernommen** · *nachgemessen*

`index.ts:127–132`: `pruefeUndVerweigereBeiTreffer(...)` steht vor
`schreibeWirkungsmarke(...)`. Läuft die Startziel-Prüfung davor, wird ein
Lauf mit gleichzeitig verbotenem Aufrufparameter **und** schlechtem
Startziel mit dem Startziel-Grund abgelehnt — `verweigereStart` (F4) läuft
nie, es entsteht keine `VERWEIGERT`-Terminalmarke. AK2/AK4 verlangen, dass
*jeder* konstruierte Aufruf durch F4 geführt wird.

**Nachbesserung:** Startziel-Prüfung ausdrücklich **nach**
`pruefeUndVerweigereBeiTreffer` und **vor** `schreibeWirkungsmarke`.

## Befund 4 — AK15 prüft nur die Endung: `cmd.exe` passiert den Guard

`WICHTIG` · **übernommen**

`startziel = ['C:\Windows\System32\cmd.exe', '/c', 'claude']` erfüllt alle
vier geplanten Guard-Regeln. Der Guard verhindert vier Endungen, nicht
„keine Shell" — die Verwechslung von Hygieneprüfung und Grenze, die im
Projekt bei E-187 schon einmal zur Rückstufung auf `DEKLARIERT` führte.

**Entscheidung (Challenger, [EMPFEHLUNG]):** beides, aber ohne
Zweideutigkeit. AK15 wird ausdrücklich als **Hygiene-Guard** geführt, nicht
als Vertrauensgrenze; die Vertrauensgrenze liegt per E2 beim Aufrufer. Eine
Basisnamen-Sperrliste (`cmd.exe`, `powershell.exe`, `pwsh.exe`, `wsl.exe`,
`bash.exe`, `sh.exe`) kommt als billige Zusatzabsicherung dazu, wird aber im
Gate-Text und in `gates.md` **nicht** als `ERZWUNGEN` ausgewiesen.

## Befund 5 — Guard-Regeln 2 und 3 haben reproduzierbare Löcher

`WICHTIG` · **übernommen** · *nachgemessen*

Nachmessung der Challenger-Sitzung (`path.win32`, Node 24):

| Eingabe | `extname` | `isAbsolute` | `resolve(p) === p` |
|---|---|---|---|
| `C:\x\claude.cmd.` | `"."` | `true` | `true` |
| `C:\x\claude.cmd ` | `".cmd "` | `true` | `true` |
| `C:\x\claude.CMD` | `".CMD"` | `true` | `true` |
| `/foo` | `""` | `true` | **`false`** |

Ein nachgestellter Punkt oder ein nachgestelltes Leerzeichen besteht einen
`['.cmd', …].includes(ext.toLowerCase())`-Test; Windows entfernt beides beim
Öffnen, `existsSync` ist also `true`. Ein laufwerksloser Wurzelpfad (`/foo`)
besteht `isAbsolute`, ist aber genau die Mehrdeutigkeit (Auflösung gegen das
aktuelle Laufwerk), die WS3 zu Fall gebracht hat. Groß-/Kleinschreibung und
8.3-Kurznamen sind unkritisch.

**Nachbesserung:** Endung über den getrimmten, punktbereinigten Basisnamen
prüfen; „absolut" über `path.win32.resolve(p) === p` statt `isAbsolute`;
`existsSync` durch `statSync(p).isFile()` ersetzen.

## Befund 6 — C2-Prämisse trifft den realen Codepfad nicht

`WICHTIG` · **übernommen** · *nachgemessen*

`prozessstart.ts:30–36`: `execFile` steht in `new Promise((resolve) => {…})`.
Ein synchroner Wurf im Executor wird vom `Promise`-Konstruktor gefangen und
zur **Rejection** — `starteProzess` wirft nie synchron, sondern liefert ein
abgelehntes Promise. Der in `state/gates.md:1255–1259` dokumentierte
„synchrone Wurf" wurde mit einem isolierten Diagnose-Einzeiler gemessen,
nicht durch `echterStarter`.

Der Defekt bleibt real (unbehandelte Rejection statt definiertem Ergebnis),
die geplante Formulierung war aber ungenau.

**Nachbesserung:** `try/catch` **innerhalb** des Executors mit `resolve(...)`;
Test asserted, dass das Promise **resolved** und `startfehler` gesetzt ist —
nicht `assert.doesNotThrow`.

## Befund 7 — C2-Test braucht einen plattformunabhängigen Auslöser

`WICHTIG` · **übernommen**

Der einzige real belegte Auslöser ist der Windows-`EINVAL`-Fall bei `.cmd`
(`gates.md:1251–1254`) — den sperrt der neue Guard künftig vor dem Spawn
weg, und unter Linux gibt es ihn nicht (F-068: Geräte-Brücke ist Linux).
Der Test wäre unerreichbar oder nur auf Windows lauffähig.

**Nachbesserung:** Auslöser ist ein Token mit NUL-Byte —
`execFile(pfad, ['a\u0000b'], cb)` wirft auf jeder Plattform synchron
`ERR_INVALID_ARG_VALUE`, und der Guard prüft nur `startziel[0]`, greift also
nicht vor.

## Befund 8 — AK15-Grün-Fall ist AK10-konform, hinterlässt aber Artefakte

`WICHTIG` · **übernommen**

AK10 ist erfüllt (`process.execPath -e …` ist kein Claude-Code-Prozess und
braucht kein Netz). Aber: `check-f6a-claude-code-gateway.mjs:40–42`
(`raeumeKette`) löscht nur `kontrollzustand-test/<laufId>`, **nicht**
`kontrollzustand-roh/<laufId>` — anders als die Testdatei
(`claude-code-gateway.test.ts:38`). `gates.md:1210–1213` führt „keine liegen
gebliebenen Rohstrom-Testartefakte" ausdrücklich als Abnahmekriterium.

**Nachbesserung:** Grün-Fall direkt gegen `starteProzess` fahren, nicht über
`starteGateway`. Zusätzlich: `-e "process.exit(0)"` ist Shell-Notation — im
Argv-Array steht `['-e', 'process.exit(0)']` ohne Anführungszeichen.

## Befund 9 — Das real gestartete Programm wird nirgends festgehalten

`WICHTIG` · **übernommen**

`index.ts:140`: `rohInhalt = JSON.stringify({ stdout, stderr, exitCode })`.
`LaufakteV0Daten` trägt `werkzeug_version_deklariert`, aber nichts über das
Startziel. Nach E2 kommt das Startziel vom Aufrufer — die Laufakte behauptet
dann eine Werkzeugversion, ohne dass ein Artefakt belegt, welches Programm
real lief. Der WS4-Nachweislauf hinterließe keinen maschinenlesbaren Beleg
für genau die Frage, an der WS3 gescheitert ist.

**Nachbesserung:** `werkzeugStartziel` **zusammen mit** `startfehler` in den
Rohstrom aufnehmen. Kein Schema-Bump, kein Widerspruch zu AK6/E-190.

## Befund 10 — Guard-Logik droht doppelt implementiert zu werden (D5)

`HINWEIS` · **übernommen**

Plan Schritt 2 (Guard in `prozessstart.ts`) und Schritt 3 (`starteGateway`
prüft ebenfalls) beschreiben zwei Prüfstellen ohne gemeinsame Quelle.
Zusätzlich: der Guard muss in `starteProzess` **vor** `optionen.starter`
greifen, sonst kann ein Rot-Fall mit injiziertem Spy-Starter nicht belegen,
dass kein Spawn versucht wurde.

**Nachbesserung:** eine exportierte `pruefeStartziel(startziel)` in
`prozessstart.ts`, von beiden Stellen genutzt; Rot-Fall-Nachweis über einen
Spy-Starter, der nie aufgerufen wird (Muster `test.ts:161`).

## Befund 11 — Der AK14-Grep kann am eigenen Plan-Wortlaut scheitern

`HINWEIS` · **übernommen**

`check-f6a-claude-code-gateway.mjs:133` läuft über den **gesamten**
Dateiinhalt inklusive Kommentaren (`:137–138`). `prozessstart.ts:15` umgeht
das heute bewusst mit der Formulierung „ein aktivierter Shell-Modus".
Übernimmt die bauende Sitzung die Begründung wörtlich in den Dateikopf,
schlägt das Gate an einem Kommentar fehl, nicht an Code.

**Nachbesserung:** ausdrücklicher Hinweis im Bauauftrag.

## Befund 12 — Fehlender Test: ungültiges Startziel darf keine offene `RUN_PREPARED`-Sequenz hinterlassen

`HINWEIS` · **übernommen**

Plan Schritt 3 fordert das Verhalten, Schritt 4 listet keinen Test.
Vorhandenes Muster: `test.ts:169–170` (`stelleLaufstatusFest` →
`NICHT_GESTARTET`). Eine verwaiste `RUN_PREPARED`-Marke lässt den Lauf
dauerhaft in `KLAERUNG_ERFORDERLICH` — real beobachtet,
`gates.md:1282–1286`.

**Nachbesserung:** Test ergänzen.

## Befund 13 — SCOPE-KANN (F-060) gehört nicht in diesen Vertrag

`HINWEIS` · **übernommen**

`state/findings.md` F-060 und F-064 empfehlen ausdrücklich, beide
**gemeinsam** in einem Harness-Schritt zu heben, nicht Gate für Gate. Die
AK14-Regel zu ändern, während in derselben Datei neue Guard-Regeln und ein
neuer Rot-/Grün-Fall entstehen, vergrößert den Diff genau dort, wo der
Windows-Nachweis hängt.

**Nachbesserung:** SCOPE-KANN gestrichen.

---

## Nachmessung durch die Challenger-Sitzung

Nicht blind übernommen — drei Befunde wurden unabhängig am realen Stand
nachgeprüft:

- **Befund 3:** `src/claude-code-gateway/index.ts:127–132` real gelesen,
  Reihenfolge bestätigt.
- **Befund 5:** `path.win32`-Tabelle oben real ausgeführt, alle vier Zeilen
  bestätigt (insbesondere `extname('C:\x\claude.cmd.')` → `"."` und
  `resolve('/foo') !== '/foo'`).
- **Befund 11:** `prozessstart.ts:15` real gelesen — die Umgehungs-
  formulierung „ein aktivierter Shell-Modus" steht dort tatsächlich.
