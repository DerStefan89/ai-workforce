<!-- Ziel-Pfad im Repo: state/plan-v2-f6a-ws4-windows-prozessstart.md -->

# Plan v2 — F6a WS4: Windows-tauglicher Prozessstart (F-069)

Fassung 2 zu `state/plan-v1-f6a-ws4-windows-prozessstart.md`, nach dem
Advisor-Pass (`state/advisor-findings-f6a-ws4-windows-prozessstart.md`,
13 Befunde, alle übernommen). Nur die Deltas — alles Unbenannte gilt
unverändert aus Fassung 1.

**Unverändert tragend:** E1 (`node` + CLI-JavaScript statt `claude.cmd`),
E2 (Startziel kommt vom Aufrufer), die Ablehnung von `shell: true`,
`LAUFAKTE_V0` ohne Schema-Bump.

---

## Delta 1 — Schritt 0 misst den CLI-Einstieg, statt ihn zu raten

Der Dateiname `cli.js` war eine Annahme. Gemessen wird über das
`bin`-Feld der `package.json` unter
`<npm root -g>/@anthropic-ai/claude-code/package.json`. Der gemessene
Pfad wird wörtlich in den Vertragsbericht und nach `state/gates.md`
übernommen. (Advisor 1)

## Delta 2 — Reihenfolge im Gateway ist zugesagt, nicht offen

Die Startziel-Prüfung liegt **nach** `pruefeUndVerweigereBeiTreffer` und
**vor** `schreibeWirkungsmarke(…, 'run_prepared', …)`.

Begründung: Läge sie davor, würde ein Lauf mit verbotenem Aufrufparameter
*und* schlechtem Startziel am Startziel scheitern, F4s `verweigereStart`
liefe nie, und es entstünde keine `VERWEIGERT`-Terminalmarke — AK2/AK4
verlangen aber, dass **jeder** konstruierte Aufruf durch F4 geht.
(Advisor 3)

## Delta 3 — AK15 ist ein Hygiene-Guard, keine Vertrauensgrenze

Nach `ARCHITECTURE.md` §8 trägt jede behauptete Grenze ihren
Durchsetzungsgrad. AK15 wird deshalb ausdrücklich als **Hygiene** geführt
und in `state/gates.md` **nicht** als `ERZWUNGEN` ausgewiesen — die
Vertrauensgrenze für „welches Programm läuft" liegt per E2 beim Aufrufer
(später F8, E-188-Gültigkeitsschlüssel).

Grund: Ein Guard, der nur Endungen prüft, lässt
`['C:\Windows\System32\cmd.exe', '/c', 'claude']` passieren. Eine
Basisnamen-Sperrliste (`cmd.exe`, `powershell.exe`, `pwsh.exe`,
`wsl.exe`, `bash.exe`, `sh.exe`) kommt als billige Zusatzabsicherung
dazu, ändert diese Einstufung aber nicht. (Advisor 4)

## Delta 4 — Die Guard-Regeln werden gehärtet (real gemessene Löcher)

Nachgemessen (`path.win32`, Node 24):
`extname('C:\x\claude.cmd.')` → `"."`, `extname('C:\x\claude.cmd ')` →
`".cmd "`, `isAbsolute('/foo')` → `true`.

Verbindliche Fassung von `pruefeStartziel(startziel)`:

1. `startziel` ist ein nicht-leeres String-Array.
2. **Absolut:** `path.win32.resolve(p) === p` bzw. plattformgerecht
   `path.resolve(p) === p` — nicht `isAbsolute`.
3. **Endung:** über den Basisnamen, nachgestellte Punkte und Leerzeichen
   vorher entfernt, Vergleich case-insensitiv gegen
   `.cmd`, `.bat`, `.com`, `.ps1`.
4. **Basisname** (nach derselben Bereinigung) nicht in der Sperrliste aus
   Delta 3.
5. **Existenz:** `statSync(p).isFile()` — nicht `existsSync` (ein
   Verzeichnis besteht `existsSync`).

(Advisor 5)

## Delta 5 — C2 präzisiert: Rejection, nicht synchroner Wurf

`execFile` steht in `new Promise((resolve) => …)`; ein synchroner Wurf im
Executor wird vom `Promise`-Konstruktor zur **Rejection**. `starteProzess`
wirft also nie synchron.

Verbindlich: `try/catch` **innerhalb** des Executors, im `catch` ein
`resolve({ stdout: '', stderr: '', exitCode: null, startfehler: {…} })`.
Der Test asserted, dass das Promise **resolved** und `startfehler` gesetzt
ist — `assert.doesNotThrow` wäre trivial grün und belegt nichts.
(Advisor 6)

## Delta 6 — C2-Test nutzt einen plattformunabhängigen Auslöser

Auslöser ist ein Token mit NUL-Byte (`'a\u0000b'`): `execFile` wirft
darauf auf jeder Plattform synchron `ERR_INVALID_ARG_VALUE`. Der
Windows-`EINVAL`-Fall taugt nicht — der neue Guard sperrt ihn künftig vor
dem Spawn weg, und unter Linux (Geräte-Brücke, F-068) existiert er nicht.
Der Guard prüft nur `startziel[0]` und greift daher nicht vor.
(Advisor 7)

## Delta 7 — AK15-Grün-Fall läuft gegen `starteProzess`, nicht `starteGateway`

`raeumeKette` im Gate löscht nur `kontrollzustand-test/<laufId>`, nicht
`kontrollzustand-roh/<laufId>`. Ein Grün-Fall über `starteGateway` würde
einen Rohstrom hinterlassen, den das Gate nicht aufräumt — gegen das in
`state/gates.md` festgehaltene Abnahmekriterium „keine liegen gebliebenen
Rohstrom-Testartefakte".

Grün-Fall daher direkt gegen `starteProzess` mit
`[process.execPath]` + `['-e', 'process.exit(0)']` — Argv-Array, keine
Anführungszeichen. AK10 bleibt erfüllt: kein Claude-Code-Prozess, kein
Netz. (Advisor 8)

## Delta 8 — Der Rohstrom trägt auch das Startziel

`rohInhalt` wird zu
`{ werkzeugStartziel, stdout, stderr, exitCode, startfehler }`.

Grund: Nach E2 bestimmt der Aufrufer das Programm. Ohne diesen Eintrag
belegt kein Artefakt, welches Programm real lief — der Nachweislauf
hinterließe keinen maschinenlesbaren Beleg für genau die Frage, an der
WS3 gescheitert ist. Kein Schema-Bump (`LAUFAKTE_V0` bleibt unverändert),
kein Widerspruch zu AK6/E-190. Der Inhalts-Hash ändert sich
erwartungsgemäß. (Advisor 9)

## Delta 9 — Eine Guard-Quelle, nicht zwei (D5)

`pruefeStartziel` wird aus `prozessstart.ts` exportiert und von
`starteGateway` **und** `starteProzess` genutzt. In `starteProzess` greift
sie **vor** `optionen.starter` — sonst kann ein Rot-Fall mit injiziertem
Spy-Starter nicht belegen, dass kein Spawn versucht wurde.
Rot-Fall-Nachweis über einen Spy, der nie aufgerufen wird (Muster
`claude-code-gateway.test.ts:161`). (Advisor 10)

## Delta 10 — `Starter`-Signatur wird explizit umgeschrieben

`Starter` wird zu `(startziel: string[], tokens: AufrufTokens) => Promise<ProzessErgebnis>`.

TypeScript akzeptiert einen Ein-Parameter-Callback dort, wo zwei erwartet
werden — `claude-code-gateway.test.ts:142` (`async (tokens) => …`) würde
also **still** falsch binden, ohne Typfehler. Alle Attrappen- und
Spy-Stellen werden deshalb explizit mit beiden Parametern neu geschrieben.
`scripts/verify-f6a-real-run.mjs:74–80` bricht mangels Typecheck erst zur
Laufzeit und ist mit anzupassen. (Advisor 2)

## Delta 11 — Zusätzlicher Test: kein verwaistes `RUN_PREPARED`

Ungültiges `werkzeugStartziel` → `starteGateway` liefert `ok: false` und
`stelleLaufstatusFest` liefert `NICHT_GESTARTET` (nicht
`KLAERUNG_ERFORDERLICH`). Muster: `test.ts:169–170`. (Advisor 12)

## Delta 12 — SCOPE-KANN gestrichen

F-060 (AK14-Grep-Lücke) wird **nicht** in diesem Vertrag gehoben. Das
Findings-Register hält für F-060 und F-064 ausdrücklich einen gemeinsamen
Harness-Schritt fest; eine Änderung der AK14-Regel würde außerdem den Diff
genau in der Datei vergrößern, an der der Windows-Nachweis hängt.
(Advisor 13)

## Delta 13 — Redaktioneller Zwang aus dem eigenen Gate

Die Zeichenfolge `shell: true` darf in `src/claude-code-gateway/*.ts`
**auch im Kommentar** nicht vorkommen — der AK14-Grep läuft über den
gesamten Dateiinhalt. `prozessstart.ts:15` umgeht das heute bereits mit
„ein aktivierter Shell-Modus". (Advisor 11)
