SCHRITT 0: Arbeitsverzeichnis ausgeben und gegen das im Auftrag genannte
Zielverzeichnis prüfen. Bei Abweichung: abbrechen, melden, nichts ändern.

Zielverzeichnis: `ai-workforce`-Repository-Wurzel (dort, wo `package.json`
und `.claude/settings.json` liegen).

## TASK: f6a-ws4-windows-prozessstart

GOAL:
`starteProzess` startet auf der Zielmaschine (Windows) real einen
Claude-Code-Lauf — **ohne** einen aktivierten Shell-Modus und ohne
Lockerung von F-057 oder AK14. Der reale Nachweislauf aus WS3
(`scripts/verify-f6a-real-run.mjs`) wird wiederholt und liefert diesmal
ein echtes Ergebnisobjekt. Behebt F-069 sowie die beiden im
Challenge/Advisor-Pass gefundenen Nebenfehler F-070 und F-071.

CONTEXT:
- [Fakt] WS3-Nachweislauf real gescheitert, dokumentiert in
  `state/gates.md` (Eintrag 2026-09-02, PR #47): `execFile('claude', …)`
  löst nur auf `claude.cmd` auf; ohne aktivierten Shell-Modus `ENOENT`
  (bloßer Name), mit explizitem `.cmd`-Suffix synchroner `EINVAL`
  (Node-Härtung seit CVE-2024-27980).
- [Fakt] Ursache ist **nicht** die Argv-Bauweise, sondern das Startziel.
  Zeigt der Start auf eine Datei, die Node ohne Shell ausführen kann,
  funktioniert `execFile` mit Argv-Array unverändert. F-057 und AK14
  bleiben damit unangetastet.
- [Fakt, real gemessen 02.09.2026] Auf der Zielmaschine existiert
  `…\AppData\Roaming\npm\node_modules\@anthropic-ai\claude-code`
  (npm-Global-Installation). `C:\Users\stefa\.local` existiert **nicht** —
  keine native `claude.exe`.
- [Entscheidung Stefan E1, 02.09.2026] Startweg: Node-Laufzeit plus
  absoluter Pfad zum CLI-JavaScript der npm-Global-Installation. Native
  Binary installieren: verworfen. Aktivierter Shell-Modus: verworfen
  (bricht AK14, schaltet den `cmd.exe`-Parser für `-p <Prompt>` wieder ein).
- [Entscheidung Stefan E2, 02.09.2026] Das Startziel kommt als Pflichtfeld
  vom Aufrufer. Das Gateway rät nichts und liest nichts aus dem
  Arbeitsbaum; die Vertrauensfrage liegt beim Aufrufer (später F8,
  E-188-Gültigkeitsschlüssel).
- [Fakt] Verbindlich ist `state/plan-v2-f6a-ws4-windows-prozessstart.md`
  (13 Deltas nach dem Advisor-Pass). `state/plan-v1-…` gilt nur dort, wo
  plan-v2 schweigt. Befunde:
  `state/advisor-findings-f6a-ws4-windows-prozessstart.md`.
- [Fakt] Challenge: `claude/102_CHALLENGE_F069_WINDOWS_PROZESSSTART.md`.
- [Offene Unsicherheit] Der Dateiname des CLI-Einstiegs ist **nicht**
  bekannt — Messschritt M klärt ihn über das `bin`-Feld der
  `package.json`. `cli.js` ist eine Annahme, kein Messwert.
- [Offene Unsicherheit] Ob `node <cli-einstieg>` sich identisch zu
  `claude.cmd` verhält (Arbeitsverzeichnis, Umgebung, `--setting-sources`)
  — klärt der reale Lauf in SCOPE 7.
- [Fakt] F-059 (`modell_beobachtet`) ist weiter unbelegt, weil im
  WS3-Lauf nie ein `"type":"result"`-Objekt zurückkam. Dieser Vertrag ist
  die erste Gelegenheit, das reale Feld zu messen — siehe FOLGT.
- [Fakt] Der AK14-Grep (`scripts/check-f6a-claude-code-gateway.mjs:133`)
  liest den **gesamten** Dateiinhalt inklusive Kommentaren. Die
  Zeichenfolge für einen aktivierten Shell-Modus darf in
  `src/claude-code-gateway/*.ts` daher auch im Kommentar nicht vorkommen
  (`prozessstart.ts:15` umgeht das heute bereits durch Umschreibung).

SCOPE:
1. **Messschritt M — messen, nicht annehmen.** Vor jeder Codeänderung:
   `npm root -g`; `bin`-Feld aus
   `<npm root -g>/@anthropic-ai/claude-code/package.json`; daraus der
   absolute Pfad zum CLI-Einstieg; `node <cli-einstieg> --version`;
   `process.execPath`. Alles wörtlich in den Bericht. Der
   `--version`-Wert ist zugleich der E-188-Anteil „Version des
   Ausführungswerkzeugs".
2. `src/claude-code-gateway/types.ts`:
   `GatewayEingaben.werkzeugStartziel: string[]` (Pflichtfeld,
   Argv-Präfix — `[0]` ist das Programm, weitere Elemente stehen **vor**
   `tokens`);
   `ProzessErgebnis.startfehler: { code: string | null; message: string } | null`;
   `Starter` → `(startziel: string[], tokens: AufrufTokens) => Promise<ProzessErgebnis>`.
3. `src/claude-code-gateway/prozessstart.ts`:
   exportierte `pruefeStartziel(startziel)` nach plan-v2 Delta 4
   (nicht-leeres Array; `path.resolve(p) === p` statt `isAbsolute`;
   Endung über den getrimmten, punktbereinigten Basisnamen gegen
   `.cmd`/`.bat`/`.com`/`.ps1`; Basisname nicht in der Sperrliste
   `cmd.exe`/`powershell.exe`/`pwsh.exe`/`wsl.exe`/`bash.exe`/`sh.exe`;
   `statSync(p).isFile()` statt `existsSync`);
   `starteProzess(startziel, tokens, optionen)` ruft
   `execFile(startziel[0], [...startziel.slice(1), ...tokens], …)`;
   der Guard greift **vor** `optionen.starter`;
   `try/catch` **innerhalb** des Promise-Executors mit `resolve(...)`
   (Delta 5); Callback-Fehler ohne numerischen `code` füllen `startfehler`;
   Attrappen bekommen `startfehler: null` und die neue Signatur.
4. `src/claude-code-gateway/index.ts`: Startziel-Prüfung **nach**
   `pruefeUndVerweigereBeiTreffer` und **vor**
   `schreibeWirkungsmarke(…, 'run_prepared', …)` (Delta 2, sonst wird
   AK2/AK4 geschwächt); `rohInhalt` wird
   `{ werkzeugStartziel, stdout, stderr, exitCode, startfehler }`
   (Delta 8); `werkzeugStartziel` wird durchgereicht.
5. `src/claude-code-gateway/claude-code-gateway.test.ts`: alle Attrappen
   und Spies explizit zweiparametrig (Delta 10 — TypeScript akzeptiert
   Ein-Parameter-Callbacks, `test.ts:142` bräche sonst **still**);
   Rot-Fall je Guard-Regel mit einem Spy-Starter, der nie aufgerufen wird
   (Delta 9); NUL-Byte-Test (`'a\u0000b'`) belegt, dass das Promise
   **resolved** und `startfehler` gesetzt ist (Delta 6, kein
   `assert.doesNotThrow`); Rohstrom trägt `werkzeugStartziel` und
   `startfehler`; ungültiges Startziel → `ok: false` **und**
   `stelleLaufstatusFest` → `NICHT_GESTARTET` (Delta 11).
6. `scripts/check-f6a-claude-code-gateway.mjs`: **AK15** ergänzen —
   Rot-Fälle je einzeln (relativer Pfad; `.cmd`; `.cmd.` mit
   nachgestelltem Punkt; `.cmd ` mit nachgestelltem Leerzeichen;
   Sperrlisten-Basisname; Verzeichnis statt Datei; leeres Array) und
   Grün-Fall **direkt gegen `starteProzess`** mit `[process.execPath]`
   und `['-e', 'process.exit(0)']` als Tokens (Delta 7 — über
   `starteGateway` bliebe ein Rohstrom liegen, den `raeumeKette` nicht
   aufräumt). AK14 bleibt unverändert.
7. `scripts/verify-f6a-real-run.mjs`: `werkzeugStartziel` aus Messschritt M
   übergeben, realen Lauf wiederholen. Erwartet: echtes
   `"type":"result"`-JSON, `beobachtungsbasis_vollstaendig: true`.
8. Dokumentation: `state/gates.md` (WS4-Eintrag, Messwerte aus M und
   SCOPE 7 wörtlich; AK15 ausdrücklich **nicht** als `ERZWUNGEN`, sondern
   als Hygiene ausweisen — Delta 3, die Vertrauensgrenze liegt per E2 beim
   Aufrufer); `features/F6a/feature.md` (AK15 ergänzen, AK11-Status auf
   real erfüllt setzen); `state/findings.md` (Volltext siehe OUTPUT).

NICHT:
- Kein aktivierter Shell-Modus — auch nicht als Rückfallebene, auch nicht
  als Zeichenfolge im Kommentar.
- Keine native Claude-Code-Binary installieren.
- Kein Auflösen des Startpfads im Gateway selbst (E2).
- Kein `LAUFAKTE_V0`-Schema-Bump; der Startfehler ist Beobachtung und
  gehört in den Rohstrom, nicht in die kanonische Laufakte.
- Keine Änderung an `baueAufruf`, `pruefeAufrufparameter`, F1B, F2, F7.
- Keine volle `pruefeStartfreigabe` (bleibt F6b).
- F-060 (AK14-Grep-Lücke) wird **nicht** mitgehoben — gehört laut
  Findings-Register gemeinsam mit F-064 in einen eigenen Harness-Schritt
  (Delta 12).
- Keine Einhängung von `verify-f6a-real-run.mjs` in `npm run
  check`/`check:template`.

BUDGET: Ein Baudurchgang in einer Claude-Code-Sitzung, plus ein manueller
realer Nachweislauf (SCOPE 7), von Stefan ausgeführt oder beaufsichtigt.
Keine unbeaufsichtigte Automatisierung.

OUTPUT:
- Geänderte Dateien: `src/claude-code-gateway/types.ts`,
  `prozessstart.ts`, `index.ts`, `claude-code-gateway.test.ts`,
  `scripts/check-f6a-claude-code-gateway.mjs`,
  `scripts/verify-f6a-real-run.mjs`.
- `state/gates.md`: WS4-Eintrag mit den Messwerten aus Messschritt M und
  der realen Ausgabe aus SCOPE 7 im Wortlaut.
- `features/F6a/feature.md`: AK15 ergänzt, AK11 auf real erfüllt.
- `state/findings.md`: F-070 und F-071 im Wortlaut ergänzen, F-069
  präzisieren — Volltext im Abschnitt „Findings-Nachtrag" unten.
- Abnahme: `npm run check` und `npm run check:template` je Exit 0,
  netzfrei, ohne Claude-Code-Prozess;
  `node scripts/check-f6a-claude-code-gateway.mjs` Exit 0 mit je einzeln
  sichtbarem AK15-Rot- und Grün-Fall; `git status --short` ohne liegen
  gebliebene `kontrollzustand-test/`- oder `kontrollzustand-roh/`-Artefakte.
- Alle erzeugten/geänderten Dateien in **einem** Commit
  (F-005/F-035-Regel).

ESCALATE:
- Messschritt M findet keinen ausführbaren JS-Einstieg → anhalten,
  melden. **Kein** Ausweichen auf einen aktivierten Shell-Modus.
- SCOPE 7 startet erneut keinen Prozess → anhalten, melden, nicht als
  Teilerfolg umdeuten.
- Eine bestehende Zusage müsste gelockert werden, um grün zu werden
  (AK1, AK2, AK4, AK10, AK14 oder F-057) → anhalten, das ist ein
  Sicherheitsbefund, kein Doku-Punkt.
- Der reale Lauf zeigt eine Ergebnisform, die von `state/tp-nachtrag.md`
  abweicht → anhalten, melden, nichts stillschweigend anpassen.
- Der reale Lauf erzeugt eine Schreibwirkung, obwohl nur lesende Werkzeuge
  konfiguriert sind → sofort anhalten, Sicherheitsbefund.

FOLGT: Trägt das reale `"type":"result"`-Objekt aus SCOPE 7 die
Modellidentität eindeutig, wird die Extraktion nach `modell_beobachtet` in
diesem Vertrag mit umgesetzt (kleiner Zusatz plus Test, schließt F6a AK8
und F-059). Ist das Feld mehrdeutig oder fehlt es: Wert bleibt `null`, als
FOLGT dokumentieren — **nicht raten** (Muster F-059/F-061).

---

## Findings-Nachtrag (wörtlich in `state/findings.md` ergänzen)

**F-070** · `BUG` · P1 · offen
Titel: `echterStarter` wandelt einen synchronen `execFile`-Wurf in eine unbehandelte Promise-Rejection statt in ein Ergebnisobjekt.
Beschreibung: `src/claude-code-gateway/prozessstart.ts:30-36` ruft `execFile` innerhalb eines `new Promise((resolve) => …)`-Executors ohne `try/catch`. Wirft `execFile` synchron (real gemessen: `EINVAL` bei explizitem `.cmd`-Suffix, `state/gates.md` WS3-Eintrag; plattformunabhängig reproduzierbar mit einem NUL-Byte im Token → `ERR_INVALID_ARG_VALUE`), fängt der Promise-Konstruktor den Wurf und macht daraus eine Rejection. `starteGateway` bricht dann zwischen `RUN_PREPARED`-Wirkungsmarke und Rohstrom/Laufakte ab.
Fundstelle: `src/claude-code-gateway/prozessstart.ts:30-36`, `src/claude-code-gateway/index.ts:132-142`.
Auswirkung: offene `RUN_PREPARED`-Sequenz ohne jede Ablage; der Lauf bleibt dauerhaft in `KLAERUNG_ERFORDERLICH`, ohne dass ein Artefakt den Grund trägt.
Maßnahme: `try/catch` innerhalb des Executors, `resolve` mit gesetztem `startfehler`. Behoben in Vertrag `f6a-ws4-windows-prozessstart`.
Feature/Run: Challenge F-069 / Advisor-Pass WS4, 02.09.2026.

**F-071** · `BUG` · P1 · offen
Titel: Der Rohstrom verliert Startfehler und Startziel — ein nicht gestarteter Prozess ist von einem abgebrochenen Lauf nicht unterscheidbar.
Beschreibung: `echterStarter` verwirft `fehler.code`/`fehler.message`; bei `ENOENT` ist `fehler.code` ein String, der Typ-Guard setzt daher `exitCode: null`. `index.ts:140` schreibt nur `{ stdout, stderr, exitCode }`. Real entstanden im WS3-Lauf: `{"stdout":"","stderr":"","exitCode":null}` — der `ENOENT`-Beleg ist vollständig verloren. Zusätzlich hält nach Entscheidung E2 kein Artefakt fest, welches Programm real gestartet wurde.
Fundstelle: `src/claude-code-gateway/prozessstart.ts:32-34`, `src/claude-code-gateway/index.ts:140`; Beleg `state/gates.md`, WS3-Eintrag 2026-09-02.
Auswirkung: trifft E-190 im Kern — die Laufakte meldet korrekt „Beobachtungsbasis unvollständig", wirft aber genau den Beleg weg, der erklärt, warum. Fehlersuche an einem realen Lauf ist ohne diesen Beleg nicht möglich.
Maßnahme: `ProzessErgebnis.startfehler` einführen; Rohstrom trägt `werkzeugStartziel`, `startfehler`, `stdout`, `stderr`, `exitCode`. `LAUFAKTE_V0` bleibt unverändert. Behoben in Vertrag `f6a-ws4-windows-prozessstart`.
Feature/Run: Challenge F-069, 02.09.2026.

**F-069** — Maßnahme präzisieren, Status auf `in Arbeit`: Der Zielkonflikt „Sicherheit gegen Windows-Startfähigkeit" besteht real nicht. `execFile` scheitert nicht an der Argv-Bauweise, sondern daran, dass das Ziel ein `.cmd`-Shim ist. Lösung ohne Lockerung von F-057/AK14: Startziel ist die Node-Laufzeit plus absoluter Pfad zum CLI-JavaScript, vom Aufrufer übergeben (Vertrag `f6a-ws4-windows-prozessstart`, Entscheidungen E1/E2 vom 02.09.2026). Ein aktivierter Shell-Modus ist ausdrücklich verworfen.

## Nachtrag 1 (Stefan, 02.09.2026) — E1 nach Messschritt M präzisiert

Messschritt M hat die CONTEXT-Prämisse widerlegt: Die npm-Global-
Installation liefert unter bin/claude.exe eine native Windows-Executable
(PE32+, 218.507.936 Bytes, Version 2.1.258), keinen JS-Einstieg. Die
Vertragsannahme "keine native claude.exe" war aus der Abwesenheit von
C:\Users\stefa\.local abgeleitet und damit falsch.

E1 gilt sinngemäß weiter, im Wortlaut präzisiert: Startziel ist ein
direkt startbares, nicht shell-interpretiertes Programm — konkret
<npm root -g>\@anthropic-ai\claude-code\bin\claude.exe. Kein node-
Zwischenschritt, kein cli-wrapper.cjs, kein aktivierter Shell-Modus.
werkzeugStartziel ist damit ein einelementiges Array. E2, F-057, AK14
und der Guard aus plan-v2 Delta 4 bleiben unverändert gültig.

Zusätzlich: der gemessene Wert 2.1.258 weicht von state/tp-nachtrag.md
ab (dort 2.1.241 CLI / 2.1.250 Extension). werkzeugVersionDeklariert im
Nachweislauf kommt aus der Messung, nicht aus tp-nachtrag.md. Beides in
state/gates.md festhalten.

Danach normal weiter ab SCOPE 2. Die Messwerte aus Messschritt M
gehören wörtlich in den WS4-Eintrag in state/gates.md.

Zwei Punkte, die sich durch die Präzisierung NICHT ändern:
- AK15-Guard bleibt wie in plan-v2 Delta 4 (.exe passiert, Sperrliste
  für Shell-Basisnamen bleibt).
- Der AK15-Grün-Fall im Gate bleibt process.execPath mit
  ['-e','process.exit(0)'] — er prüft den Guard, nicht Claude Code.

## Bericht

(1) Geändert: `types.ts` (`werkzeugStartziel`, `startfehler`, `Starter`-
Signatur), `prozessstart.ts` (`pruefeStartziel`/AK15-Guard, `try/catch`
im `echterStarter`-Executor, F-070/F-071), `index.ts`
(`leseModellBeobachtet`, AK8/F-059), `claude-code-gateway.test.ts` (Delta
9/10/11-Tests, AK15-Rot-/Grün-Fälle, `leseModellBeobachtet`-Tests, F-075-
Fix im Sperrlisten-Basisname-Test), `check-f6a-claude-code-gateway.mjs`
(AK15-Gate-Ergänzung, F-075-Fix), `verify-f6a-real-run.mjs`
(Messschritt-M-Auflösung des Startziels). `state/findings.md` (F-069
gelöst, F-070/F-071/F-059/F-075 ergänzt), `features/F6a/feature.md` (AK8/
AK11 real erfüllt, AK15 neu), `state/gates.md` (WS4-Eintrag).

(2)+(3) Checks, alle grün: `npm run check` (Exit 0, 101/101 Tests);
`node scripts/check-f6a-claude-code-gateway.mjs` (Exit 0, sieben AK15-
Rot-Fälle + Grün-Fall einzeln sichtbar); `node scripts/verify-f6a-real-run.mjs`
(SCOPE 7, Exit 0, echter Windows-Prozessstart, valides `"type":"result"`-
Objekt, `modell_beobachtet: "claude-sonnet-5"`); `git status --short` ohne
liegen gebliebene `kontrollzustand-test/`- oder `kontrollzustand-roh/`-
Artefakte.

Messschritt M, im Wortlaut:
```
npm-Global-Wurzel: C:\Users\stefa\AppData\Roaming\npm\node_modules
bin-Feld (package.json): {"claude":"bin/claude.exe"}
werkzeugStartziel: ["C:\\Users\\stefa\\AppData\\Roaming\\npm\\node_modules\\@anthropic-ai\\claude-code\\bin\\claude.exe"]
process.execPath: C:\Program Files\nodejs\node.exe
```
`--version`: `2.1.258 (Claude Code)`.

SCOPE 7, Ergebnis-Auszug: `beobachtungsbasis_vollstaendig: true`,
`modell_beobachtet: "claude-sonnet-5"`, Laufstatus (F1B):
`KLAERUNG_ERFORDERLICH` (erwartet — Terminalklassifikation bleibt F7
vorbehalten, AK5/AK12). Vollständiger Wortlaut in `state/gates.md`,
WS4-Eintrag.

(4) Echte Blocker: keine. Der ursprüngliche Zielkonflikt aus F-069
(Sicherheit gegen Windows-Startfähigkeit) bestand real nicht — Ursache
war das `.cmd`-Startziel, nicht die Argv-Bauweise (F-057/AK14
unangetastet). FOLGT-Klausel aufgelöst: `modelUsage` im realen
Ergebnisobjekt trug die Modellidentität eindeutig (genau ein Schlüssel),
Extraktion umgesetzt statt geraten.

Nebenbefund vor Commit behoben: der AK15-Rot-Fall „Sperrlisten-
Basisname" nutzte einen fest verdrahteten Windows-Pfad
(`C:\Windows\System32\cmd.exe`), der unter Linux-CI nie absolut ist und
damit an der ersten Guard-Regel scheitert statt an der Sperrliste — die
Sperrlisten-Prüfung selbst wäre dort nie getestet worden (F-075, in
Gate-Skript und Testdatei behoben, Rot-Fälle prüfen jetzt zusätzlich den
erwarteten Ablehnungsgrund statt nur `ok:false`).
