# F45 B2b-3b-1a — Plan v2 (Rückfrage-Kanal „Kanal“, ausgeschaltet)

Branch `f45/b2b3b-rueckfrage` (von origin/main `49414f7`). Plan v1: `features/F45/plan-b2b3b1.md`; Advisor-Pass dazu:
ZU GROSS mit Schnitt, Auflagen A1–A10. Entscheidungen Stefan (16.10.2026):
- **Schnitt angenommen:** 3b-1a „Kanal“ (dieser Plan) → 3b-1b „Auswertung“ (Protokoll als Kern-Artefakt, Schema,
  Evaluator, Controller, Satz in ARCHITECTURE §4) → 3b-2 (Einschalten, Oberfläche, echter Lauf). In 3b-1a und 3b-1b
  bleibt der Kanal aus, das Argv aller Läufe bitgleich.
- **O6/A10:** E-B2b-3-1 = A — Bash wird Stefan **wörtlich** angezeigt, nur „einmal erlauben“; neutralisiert wird nur das
  Protokoll (3b-1b). Die Anzeige selbst kommt in 3b-2; die lesende Route liefert den Befehl schon jetzt wörtlich.
- **A4:** Stefan nimmt die Abweichung von F-1061 zur Kenntnis, eng begrenzt: nur die exakte Antwort-Route, nur offene
  Rückfragen des aktuellen Laufs, jede Rückfrage-ID genau einmal beantwortbar. „Token gibt kein Antwortrecht“ =
  ERZWUNGEN, „nur Stefan antwortet“ = DEKLARIERT; beides in ARCHITECTURE §3 (dieser Teil).
- **A2:** fehlende `optionen.rueckfrage.url` führt **nur bei eingeschaltetem Kanal** zur Ablehnung, bei „aus“ (auch bei
  automatischen Fortsetzungen) nie. **A1:** Ablehnungsweg liefert ein normales Ergebnis (Muster `baueMcpAufruf`), Gate
  belegt D13 danach frei. Gate belegt: kein Produktaufrufer setzt die Einschalt-Option.

CONTEXT: baut auf dem Spike B2b-3a (`features/F45/nachweise/b2b3a/`) auf. 3b-1b hängt von diesem Teil ab (Rückruf
`protokolliere`, `tool_use_id`/`tool_name`/Input-Hash je Eintrag).

## 1 Reine Regel `src/rueckfrage/` (neu: `index.ts`, `types.ts`, `rueckfrage.test.ts`)

`vorentscheidung(toolName, input, arbeitsordner, werkzeugNamen, optionen?)` →
`{ art: 'auto_deny', grund } | { art: 'frage_stefan' }`. Erste zutreffende Regel gewinnt; alles Unklare ⇒ `auto_deny`:
1. `toolName` kein nicht leerer String oder nicht in `werkzeugNamen` ⇒ „nicht im Werkzeugsatz“ (deckt unbekannte und
   nicht freigegebene `mcp__*` ab).
2. `input` kein einfaches Objekt ⇒ „Eingabe ungültig“.
3. Pfadfelder (`file_path`, `notebook_path`, `path`) bei **jedem** Werkzeug, außerdem `Write`/`Edit`/`MultiEdit`/
   `NotebookEdit` ohne Pfad: jeder Wert muss `liegtImArbeitsordner` erfüllen, sonst „Pfad außerhalb des
   Arbeitsordners“ bzw. „Pfad nicht prüfbar“. Vorsorge-Regel (Advisor-Hinweis): bei O1 ändert sie keine Entscheidung,
   nur den Grund — die durchgesetzte Grenze ist Regel 5.
4. `Bash` (A9): nur Felder aus `{ command, description, timeout, run_in_background }`, sonst „unbekanntes
   Eingabefeld“ (z. B. `dangerouslyDisableSandbox`); `command` nicht leerer String; `run_in_background === true` ⇒
   „Hintergrund-Ausführung“; Befehl mit E-182-Verbotswert (`pruefeAufrufparameter` mit der Tokenisierung des Evaluators —
   `toolInputZuTokens` wird aus `src/result-evaluator` exportiert, nicht neu geschrieben) ⇒ „verbotener
   Aufrufparameter“. Sonst ⇒ `frage_stefan`.
5. Alles andere ⇒ „nur Bash-Befehle werden Stefan vorgelegt“ (O1, wörtlich nach Auftrag).

`liegtImArbeitsordner(pfad, arbeitsordner, { plattform, realpath })` → `{ ok: true } | { ok: false, grund }`, fail closed:
- leer, kein String, NUL, beginnt mit `~` ⇒ nein.
- win32: `/` = `\`; UNC (`\\h\s`, `//h/s`), Gerätepfade (`\\?\`, `\\.\`), laufwerksrelativ (`C:x`), `:` außerhalb des
  Laufwerks (Alternate Data Streams), Segment mit abschließendem Punkt/Leerzeichen ⇒ nein; Vergleich ohne
  Groß-/Kleinschreibung (auch Laufwerksbuchstabe).
- posix: `\` im Pfad ⇒ nein; Vergleich mit Groß-/Kleinschreibung.
- relativ gegen den Arbeitsordner, `.`/`..` normalisiert; innen = gleich oder Präfix + Trenner (kein `wf` vs. `wf2`).
- Symlink/Junction: `realpath` des längsten existierenden Präfixes + Rest gegen `realpath(arbeitsordner)`; Wurf ⇒ nein.
  `realpath` injizierbar (Standard `realpathSync.native`) — einziges I/O.

Unit-Tests rot → grün (Rotfälle): `..\..\x`, `../x`, `C:\…`/`D:\…`/`/etc/x` außerhalb, `c:\ORDNER\x` innen, `wf2`,
UNC, `\\?\C:\…`, `C:x`, `x.txt:strom`, `x.` , `~\x`, leer, NUL, echte Junction im Temp-Ordner nach außen (Datei
existiert und existiert nicht), posix mit `\`; Werkzeug nicht im Satz, `mcp__x__y`, Bash ohne `command`, Bash mit
`run_in_background`, mit `dangerouslyDisableSandbox`, mit `--dangerously-skip-permissions`, Write ohne Pfad,
Write innen ⇒ „nur Bash“; Grünfall Bash ⇒ `frage_stefan`.

`ergaenzeRueckfrageAufruf(aufrufEingaben, kanal)` → `{ ok: true, aufrufEingaben } | { ok: false, grund }` (A1, wirft
nie), siehe §5.

## 2 MCP-Server-Skript `scripts/leitstand/rueckfrage-mcp.mjs` (neu)

Ohne Abhängigkeiten, Muster Spike: JSON-RPC 2.0 zeilenweise (`initialize`, `tools/list`, `tools/call`, `ping`;
Benachrichtigungen ohne Antwort, unbekannte Methode −32601). stdout nur Protokoll, Diagnose nur stderr.
- `rechte_pruefen`: `{ art: 'rechte', tool_name, input, tool_use_id }` an den Leitstand. `allow` ⇒
  `{ behavior: 'allow', updatedInput: <eigene Kopie von input> }`, sonst `{ behavior: 'deny', message }`.
- `frage_stefan(frage, optionen)`: `{ art: 'frage', frage, optionen, tool_use_id }` (`_meta['claudecode/toolUseId']`) ⇒
  Antworttext, sonst „keine Antwort von Stefan“.
- Umgebung (mcp-config `env`): `WORKFORCE_RUECKFRAGE_URL`, `WORKFORCE_RUECKFRAGE_TOKEN`, `WORKFORCE_RUECKFRAGE_FRIST_MS`
  (Wartegrenze + 60 s; der Server setzt sie aus seiner Wartegrenze).
- POST `…/api/rueckfrage/anfrage` ⇒ 200 `{ entscheidung }` (sofort, z. B. auto_deny) oder 202 `{ id }`; dann Long-Poll
  POST `…/api/rueckfrage/anfrage/<id>/warten` in einer Schleife bis Entscheidung oder eigene Frist. `node:http`, je
  Anfrage Zeitgrenze 60 s. Jeder Fehler (Umgebung fehlt, nicht erreichbar, Status ≠ 200/202, kaputtes JSON, unbekannte
  Entscheidung, Frist) ⇒ `deny` bzw. „keine Antwort von Stefan“, nie `allow`.

## 3 Vermittlung `scripts/leitstand/rueckfrage-vermittlung.mjs` (neu, nur Speicher) + Unit-Test

`erzeugeRueckfrageVermittlung({ warteGrenzeMs = 600000, pollFensterMs = 25000, protokolliere })`:
- `oeffneLauf(laufId, { token, arbeitsordner, werkzeugNamen })` — Map-Eintrag, wirft nicht.
- `laufZuToken(token)` → laufId | null (zeitkonstanter Vergleich, nur offene Läufe).
- `stelle(laufId, anfrage)`: Form prüfen (Fehler ⇒ 400); `tool_use_id` dieses Laufs schon bekannt ⇒ auto_deny
  „Rückfrage-ID doppelt“ (A6 vorbereitet). `art: 'rechte'` ⇒ `vorentscheidung`; `auto_deny` ⇒ sofort, **kein**
  Warteschlangeneintrag, nur `protokolliere`. Sonst Eintrag `{ id: randomUUID, art, tool_name, input, input_hash,
  tool_use_id, offen }` + Timer `warteGrenzeMs` ⇒ `zeitueberschreitung`. `art: 'frage'` ⇒ immer Eintrag.
- `warte(laufId, id)` (A7): entschiedener Eintrag ⇒ sofort seine Entscheidung (bleibt bis `beendeLauf` erhalten);
  offen ⇒ Promise, aufgelöst bei Entscheidung oder nach `pollFensterMs` mit `{ offen: true }`; mehrere Warter
  erlaubt; fremde laufId/unbekannt ⇒ 404.
- `offene()` → `[{ id, lauf_id, art, werkzeug, befehl (wörtlich), frage, optionen, seit, frist }]`, kein Token.
- `beantworte(id, antwort)` (A4): nur offener Eintrag eines offenen Laufs; Rechte nur `einmal_erlauben` | `ablehnen`
  (alles andere inkl. „immer“ ⇒ 400); Frage `antwort` nicht leerer Text ≤ 2000 ⇒ 400 sonst; schon entschieden ⇒ 409
  (genau einmal); unbekannt/Lauf zu ⇒ 404.
- Jede Entscheidung: zuerst `protokolliere(laufId, eintrag)` (`{ tool_use_id, tool_name, input_hash, art, grund, zeit,
  befehl|frage, antwort? }`), dann Auslieferung an die Warter. Ein Wurf des Rückrufs ändert die Entscheidung nicht
  (geloggt). In 3b-1a nur im Speicher geprüft; 3b-1b schreibt ihn als Kern-Artefakt (neutralisiert).
- `beendeLauf(laufId)`: offene ⇒ `lauf_beendet` (deny bzw. „keine Antwort von Stefan“), Timer weg, Token ungültig,
  Lauf entfernt. Idempotent; unbekannter Lauf = No-op.
Protokoll-`art`: `auto_deny`, `stefan_erlaubt`, `stefan_abgelehnt`, `zeitueberschreitung`, `lauf_beendet` für Rechte;
`frage_beantwortet`, `frage_ohne_antwort` für Fragen (A5).

## 4 Routen in `scripts/leitstand-server.mjs` (A8: exakte Pfade)

Alle laufen durch die zentralen Host- und CSRF-Haken (nicht pro Route wiederholt).
- POST `/api/rueckfrage/anfrage` und POST `^/api/rueckfrage/anfrage/<uuid>/warten$` — nur mit
  `Authorization: Bearer <token>` eines offenen Laufs, sonst 403. Body über einen kleinen Leser mit Grenze 64 KiB
  (darüber 413 ⇒ Skript `deny`).
- GET `/api/rueckfragen` (exakt) — offene Rückfragen.
- POST `^/api/rueckfragen/<uuid>/antwort$` — trägt die Anfrage `Authorization` ⇒ 403 („mit dem Token kann man nur
  fragen“).
- Alles andere unter diesen Präfixen ⇒ 404 (`/api/rueckfrage/anfrage/<id>/antwort`, `/api/rueckfragen/anfrage`, …).
Vermittlung je Handler (`optionen.rueckfrageVermittlung` injizierbar, sonst neu); Einschalt-Option
`optionen.rueckfrage = { an, url, skriptPfad?, warteGrenzeMs?, pollFensterMs? }` — fehlt sie oder `an !== true`,
ist der Kanal aus. Der CLI-Bindeblock setzt sie nicht.

## 5 Einschalten hinter der Option (gebaut, nur vom Gate erreichbar) und Argv-Baustein

- **starteWorkflowSchritt** (nach `laufId`, vor `loeseSchrittEingabenAuf`, synchron im D13-Bereich 2): nur wenn
  `optionen.rueckfrage?.an === true` **und** `schritt.rolle === 'ausfuehrung'` **und** `laufort.arbeitsordner !== null`
  (A3) **und** Worker claude-code (`schritt.worker` fehlt oder `'claude-code'`). Dann: `url` fehlt ⇒ `{ ok: false, art:
  'ungueltig', grund }` (A2, normaler Ablehnungsweg vor der D13-Belegung); sonst `ausfuehrungsOptionen.rueckfrage =
  { url, token: randomBytes(32) hex, skriptPfad (Standard `new URL('./leitstand/rueckfrage-mcp.mjs',
  import.meta.url)`), nodePfad: process.execPath, warteGrenzeMs }`. Bei „aus“ wird nichts gelesen oder gesetzt.
- **loeseAusfuehrungsEingabenAuf**: mit `optionen.rueckfrage` und `erhaeltKatalogFaehigkeiten(rolle, art)` und Worker
  claude-code nach dem MCP-Block `ergaenzeRueckfrageAufruf`; `{ ok: false }` (z. B. Katalog-MCP mit id `rueckfrage`)
  ⇒ `return { ok: false, grund: 'Rückfrage-Kanal abgelehnt: …' }` (A1, Muster `baueMcpAufruf`). Ergebnis:
  `eingaben.rueckfrageKanal = { token, arbeitsordner: repoWurzel, werkzeugNamen }`; `ortBLauf.mcpServer` + `rueckfrage`,
  falls `ortBLauf` gesetzt.
- **ergaenzeRueckfrageAufruf(aufrufEingaben, kanal)**: `kanal` undefined ⇒ `{ ok: true, aufrufEingaben }` mit
  **demselben Objekt**. Sonst mcp-config = vorhandene (`baueMcpAufruf`) bzw. leer + Server `rueckfrage`
  `{ command: nodePfad, args: [skriptPfad], env: {…}, timeout: warteGrenzeMs + 120000 }` (Advisor-Hinweis), Schlüssel
  belegt oder mcp-config kein Objekt ⇒ `ok: false`; `mcp__rueckfrage__frage_stefan` in `werkzeugsatz.erlaubte_werkzeuge`;
  `permissionPromptTool: 'mcp__rueckfrage__rechte_pruefen'`.
- **baueAufruf**: `AufrufEingaben.permissionPromptTool` ⇒ `--permission-prompt-tool <wert>` nach `--json-schema`, vor
  `-p`; ohne Feld bitgleich. `pruefeStartauftrag` lehnt das Feld im Body ab (Allowlist, Muster `mcpConfig`).
- **starteLaufUndVergiss**: `eingaben.rueckfrageKanal` gesetzt ⇒ `oeffneLauf` vor `fuehreAufgabeDurchFn`.
  `beendeLauf(laufId)` als erste Anweisung in `.then` (vor der D13-Marke) und in `.catch` — deckt ok:false, regulär,
  Zeitgrenze, Abbruch. D13-Marken unberührt.
- `pruefeInitZeile` unverändert (Menge = übergeben).

## 6 Gate `scripts/check-f45-b2b3b1-rueckfrage.mjs` (neu, in `check:gates`)

Echter Leitstand-Server (`erzeugeRequestHandler` + `createServer`, Port 0; Handler nach `listen` gebaut, damit
`rueckfrage.url` den Port kennt), Wegwerf-git-Projekt mit echtem Worktree `wf/<id>` und vorab registriertem
Arbeitsordner-Artefakt BEREIT, Workflow mit Ausführungsschritt, gestubbtes `fuehreAufgabeDurchFn`: liest die mcp-config
aus `eingaben.aufrufEingaben`, spawnt das Skript mit deren `command/args/env` (Attrappen-Client, JSON-RPC) und endet erst,
wenn der Fall es sagt.
- (g1) Bash ⇒ in GET `/api/rueckfragen` wörtlich ⇒ `einmal_erlauben` ⇒ `allow`, `updatedInput` = Eingabe; Rückruf
  `stefan_erlaubt`. (g2) `ablehnen` ⇒ `deny`, `stefan_abgelehnt`. (g3) `frage_stefan` ⇒ Antworttext;
  `frage_beantwortet`.
- (r1) Write außerhalb (absolut und `..`) ⇒ sofort `deny`, GET leer, Rückruf `auto_deny`; Bash mit
  `run_in_background` ⇒ `deny`.
- (r2) falsches/kein Token ⇒ 403; Client mit falschem Token ⇒ `deny`.
- (r3) Antwort über Token-Routen ⇒ 404; Antwort-Route mit `Authorization` ⇒ 403; „immer“ ⇒ 400; zweite Antwort ⇒ 409;
  `/api/rueckfragen/anfrage` ⇒ 404 (A8).
- (r4) Wartegrenze (Testparameter 300 ms) ⇒ `deny`, `zeitueberschreitung`. (r4b) Antwort zwischen zwei Polls geht nicht
  verloren (Poll-Fenster 50 ms, A7).
- (r5) Lauf-Ende bei offener Rückfrage ⇒ `deny`, `lauf_beendet`, GET leer, Token danach 403.
- (r6) Leitstand weg ⇒ `deny` bzw. „keine Antwort von Stefan“. (r7) jede stdout-Zeile gültiges JSON-RPC.
- (r8) A1: `loeseAusfuehrungsEingabenAuf` mit Katalog-MCP-id `rueckfrage` ⇒ `{ ok: false }` ohne Wurf; über den
  Server: Kanal an, `url` fehlt ⇒ Start abgelehnt, danach D13 frei (GET zeigt keinen aktiven Lauf, ein nächster Start
  wird nicht mit 409 abgewiesen).
- (a1) Schalter aus: Argv bitgleich (`baueAufruf` mit/ohne Baustein), Server ohne `optionen.rueckfrage` ⇒ Stub sieht
  `aufrufEingaben` ohne `permissionPromptTool`, mcp-config unverändert, kein `rueckfrageKanal`; ohne `url` und Kanal aus
  ⇒ Start normal (A2). Mit Kanal an bleiben nicht berechtigte Läufe bitgleich (Rolle ≠ ausfuehrung, Projektordner ohne
  Arbeitsordner).
- (a2) Schalter an: `--permission-prompt-tool mcp__rueckfrage__rechte_pruefen` vor `-p`, mcp-config mit Katalog-MCP und
  `rueckfrage`, `frage_stefan` in `--allowedTools`/`--tools`; `pruefeInitZeile` mit/ohne `rueckfrage` in
  `init.mcp_servers`.
- (f) Quelltext: `starteWorkflowSchritt(` 6×, Workflow-Schreiber 14 / `.eingefroren` 13 (F-228); kein Produktaufrufer
  setzt die Einschalt-Option — weder in `src/**` (ohne `*.test.ts`) noch im CLI-Bindeblock von `leitstand-server.mjs`
  (`rueckfrage:`/`permissionPromptTool` dort nicht gesetzt).
Gegen main rot (neue Module fehlen) — wird geprüft.

## 7 Doku und Findings

`ARCHITECTURE.md` §1 (`src/rueckfrage`, Skript, Vermittlung), §3 (Kanal, A4-Abweichung eng begrenzt, ERZWUNGEN/
DEKLARIERT, bekannte Grenze: Laufcode über npm-Skripte kann jede Leitstand-Route aufrufen, ADR
`ausfuehrung-bash-allowlist` — Bedien-Grenze für das Modell, keine Sicherheitsgrenze gegen selbst ausgeführten Code),
§6 (Satz: Produktkanal, kein Entwicklungswerkzeug). `docs/STATUS.md`, `docs/projekt/fixpaket-f45.md` (Zeilen
B2b-3b-1a, B2b-3b-1b, B2b-3e um F-1125, B2b-3b-2; Reihenfolge 3b-1a → 3b-1b → 3e → 3b-2 → B2b-4 — 3b-1b vor 3e, weil
Stefan „scharf erst nach 3b-1b“ vorgibt), `docs/projekt/kontext/lagebild.md`. `state/findings.md`: F-1124, F-1125
(Platzhalter `<name>` wörtlich), Reste als F-1126.

## 8 Grenzen (NICHT)

Kein Protokoll-Artefakt, kein Schema, kein Evaluator, kein Controller (3b-1b); keine Oberfläche, kein echter CLI-Lauf
(3b-2). Gesperrte Pfade unberührt; `package.json` nur die Gate-Zeile; `starteWorkflowSchritt(` 6×, F-228 unverändert.

## 9 Akzeptanz, Risiken, Schätzung

Unit-Tests `src/rueckfrage`, Vermittlung, `baueAufruf` (`permissionPromptTool`), `pruefeStartauftrag` rot → grün;
Gate grün, gegen main rot; `npm run check:gates` grün. code-reviewer + qa, höchstens eine Korrekturrunde.
Risiken: `env` in der mcp-config und das Flag selbst erst in 3b-2 real belegt; Token im Argv des CLI-Prozesses (nur
während des Laufs, nur Fragen); Vermittlung je Instanz (Mehrprojekt in 3b-2); `realpath` auf OneDrive-Reparse-Points
wirft ⇒ auto_deny. Schätzung ≈ 0,45–0,5 AT.

## Nachtrag nach dem Delta-Pass (FREIGEGEBEN MIT AUFLAGEN B1–B4, kein Schnitt)

- **B1:** Die Einschalt-Zuweisung steht im Block nach dem Empfehlungszweig (bei `arbeitsordner`/`projektkarte`/`review`,
  per Spread auf `ausfuehrungsOptionen`), nicht direkt nach `laufId`; die Ablehnung bei fehlender `url` steht dort, vor
  `schreibeWorkflowFortschritt` und vor der D13-Belegung. Keine Kommentare mit `await`/`async `/`.then(`/`setTimeout` im
  D13-Bereich 2 (H1). `randomBytes` aus `node:crypto`.
- **B2:** `skriptPfad = fileURLToPath(new URL('./leitstand/rueckfrage-mcp.mjs', import.meta.url))`.
- **B3:** `ergaenzeRueckfrageAufruf` läuft auf dem fertig zusammengesetzten `aufrufEingaben` unmittelbar vor dem `return`
  von `loeseAusfuehrungsEingabenAuf`; `mcpConfig` ist ein JSON-String — `JSON.parse` im `try`, Parse-Ergebnis bzw.
  `mcpServers` kein einfaches Objekt ⇒ `ok: false`. `rueckfrageKanal.werkzeugNamen` aus der endgültigen
  `erlaubte_werkzeuge` mit der Regel von `--tools` (`split('(')[0]`).
- **B4:** Gate (f) prüft alle Aufrufe von `erzeugeRequestHandler(` in `leitstand-server.mjs` (auch `baueProjektHandlerMap`),
  nicht nur den CLI-Bindeblock.
- Hinweise übernommen: H2 (Handler mit `arbeitsordner: true`, Pfad aus GET /api/workflows/<id>, zweiter Handler für den
  Projektordner-Fall, Schritt durch `pruefeEinrichtungVorBau`), H3 ((r8) prüft „kein aktiver Lauf“ statt „kein 409“),
  H4 (Sperrliste statt Allowlist in `pruefeStartauftrag`), H5 (auch auto_deny-`tool_use_id`s werden je Lauf gemerkt),
  H6 (`timeout` je Server in die Risikoliste für 3b-2), H7 (`toolInputZuTokens` zieht nach `src/invocation-policy`
  neben `pruefeAufrufparameter`; der Evaluator importiert ihn von dort — Verhalten unverändert).

## Nachtrag nach code-reviewer und qa (eine Korrekturrunde)

Beide „freigegeben mit Hinweisen“, nichts HOCH. In der Korrekturrunde: Rotfall der Body-Sperre `permissionPromptTool`
(Gate (s)); Token-Routen 413/400, großer Befehl, ungültige Frage mit eigener Meldung, kaputte JSON-RPC-Eingaben (Gate (r9));
späte Antwort nach Lauf-Ende 404 (r5), nach Zeitüberschreitung 409, doppelte Frage-ID, Protokoll vor Auslieferung (Unit);
Einschalten zusätzlich nur mit schreibendem Werkzeugsatz (qa 3 — eine Ausführung mit `lesend` bekommt keinen Kanal statt
einer Ablehnung; die Ablehnung in `loeseAusfuehrungsEingabenAuf` bleibt als Sicherung gegen einen fehlerhaften Aufrufer);
Protokollfeld `tool_name` statt `werkzeug`; Wartegrenze aus einer Quelle (`rueckfrageVermittlung.warteGrenzeMs`);
`oeffneLauf` prüft das Token und läuft in try/catch, `beendeLauf` im `.catch` erst nach dem D13-Reset; Mindestabstand
200 ms im Poll des Skripts; JSDoc. Reste → F-1126.
