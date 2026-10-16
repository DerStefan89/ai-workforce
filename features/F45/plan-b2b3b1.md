# F45 B2b-3b-1 — Plan (Rückfrage-Kanal, ausgeschaltet)

Branch `f45/b2b3b-rueckfrage` (von origin/main `49414f7`, #348). Grundlage: Entscheidung Stefan **E-B2b-3-1 = A**
(Rückfrage im Lauf über einen MCP-Kanal je Lauf), Spike `features/F45/nachweise/b2b3a/spike.md` (Befunde 1–6,
Empfehlung A mit Grenzen 1–5), F-1011, F-980 (4). Dieser Teil baut den Kanal vollständig, schaltet ihn aber **nicht**
ein: kein Lauf bekommt `--permission-prompt-tool`, das Argv aller Läufe bleibt bitgleich. Einschalten, Oberfläche,
echter Nachweis-Lauf und Startfreigabe-Anleitung → B2b-3b-2.

Gesetzte Befunde aus dem Spike (nicht neu zu prüfen):
- Eingabe an `rechte_pruefen`: `{ tool_name, input, tool_use_id }`; Antwort als Text-JSON
  `{ behavior: 'allow', updatedInput }` | `{ behavior: 'deny', message }`; `message` landet wörtlich beim Modell.
- Sperrregeln (`--disallowedTools`), Deny-Regeln der settings und Hooks greifen **vor** dem Werkzeug.
- Mit `allow` gehen Write und Bash **außerhalb** des Arbeitsordners durch ⇒ die Grenze liegt in unserem Code.
- Abgelehnte Aufrufe stehen in `permission_denials`, der Lauf endet regulär (`success`).
- `frage_stefan` muss in `--allowedTools` stehen; `rechte_pruefen` ist für das Modell nicht sichtbar (`--tools`).

## 1 Reine Regel `src/rueckfrage/` (neu: `index.ts`, `types.ts`, `rueckfrage.test.ts`)

`vorentscheidung(toolName, input, arbeitsordner, werkzeugsatz, optionen?)` →
`{ art: 'auto_deny', grund }` | `{ art: 'frage_stefan' }`. `werkzeugsatz` = Werkzeugnamen des Laufs (wie `--tools`,
also `Bash`, nicht `Bash(npm ci)`). Reihenfolge (erste zutreffende Regel gewinnt, alles Unklare ⇒ `auto_deny`):
1. `toolName` kein nicht leerer String, oder nicht in `werkzeugsatz` ⇒ `auto_deny` „nicht im Werkzeugsatz“
   (deckt unbekannte Werkzeuge und jedes `mcp__*` ab, das nicht freigegeben ist).
2. `input` kein Objekt ⇒ `auto_deny`.
3. Pfad-Werkzeuge — `Write`, `Edit`, `MultiEdit`, `NotebookEdit`, `Read`, `Glob`, `Grep` **und jedes Werkzeug mit
   einem Feld `file_path`, `notebook_path` oder `path`** (auch Bash, falls die CLI das Feld je mitgibt): jeder
   vorhandene Pfadwert muss `liegtImArbeitsordner` erfüllen; sonst `auto_deny` „Pfad außerhalb des Arbeitsordners“
   (bzw. „Pfad nicht prüfbar“). Fehlt bei `Write`/`Edit`/`MultiEdit`/`NotebookEdit` der Pfad ⇒ `auto_deny`.
4. `Bash` mit nicht leerem `command` (String) ⇒ `frage_stefan`. Sonst `auto_deny`.
5. Alles andere (z. B. ein Datei-Werkzeug **innerhalb** des Ordners, das die CLI trotzdem vorlegt) ⇒ `auto_deny`
   „nur Bash-Befehle werden Stefan vorgelegt“ (Auftrag: „nur Bash geht an Stefan“; O1).

`liegtImArbeitsordner(pfad, arbeitsordner, { plattform, realpath })` → `{ ok: true } | { ok: false, grund }` —
fail closed:
- leer, kein String, NUL-Zeichen, beginnt mit `~` ⇒ nein.
- **win32:** `/` und `\` gleich; UNC (`\\server\…`, `//server/…`) und Gerätepfade (`\\?\`, `\\.\`) ⇒ nein;
  laufwerksrelativ (`C:datei`) ⇒ nein; `:` außerhalb des Laufwerksbuchstabens (Alternate Data Streams) ⇒ nein;
  Laufwerk und Segmente ohne Groß-/Kleinschreibung verglichen; Segmente mit abschließendem Punkt/Leerzeichen ⇒ nein.
- **posix:** `\` im Pfad ⇒ nein (wäre unter Linux ein Dateinamenzeichen — als Trenner gelesen könnte ein Pfad
  außerhalb innen aussehen); Vergleich mit Groß-/Kleinschreibung.
- relativ ⇒ gegen den Arbeitsordner auflösen; `.`/`..` normalisieren; innen heißt `== ordner` oder Präfix
  `ordner + Trenner` (keine Präfix-Falle `wf` vs. `wf2`).
- **Symlinks/Junctions:** `realpath` des längsten existierenden Präfixes (Datei existiert ⇒ ganzer Pfad), Rest
  angehängt; verglichen gegen `realpath(arbeitsordner)`. `realpath` wirft unerwartet ⇒ nein. Injizierbar für Tests
  (Standard `realpathSync.native`) — einziges I/O der Regel.

`neutralisiereText(text, { arbeitsordner, home, temp })` ersetzt (Schreibweisen wie
`features/F45/nachweise/b2b1b/schwaerze.mjs`: roh, `\`→`/`, JSON-escaped; Arbeitsordner vor Temp vor Home) durch
`<ARBEITSORDNER>`, `<TEMP>`, `<HOME>`; gekappt auf 2000 Zeichen. Für Befehle und Fragetexte im Protokoll.

`ergaenzeRueckfrageAufruf(aufrufEingaben, schalter)` (Argv-Baustein, §6) und `validiereRueckfrageProtokoll(daten)`
(§4) liegen ebenfalls hier.

Unit-Tests rot → grün, Rotfälle mindestens: `..\..\x`, `../x`, absolut außerhalb (`C:\…`, `D:\…`, `/etc/x`),
`c:\ARBEITSORDNER\x` (Groß/klein, innen), `wf2` neben `wf`, UNC, `\\?\C:\…`, `C:x`, `datei.txt:strom`, `~\x`, leer,
NUL, Junction im Ordner, die nach außen zeigt (echte Junction im Temp-Ordner, Windows ohne Adminrecht), nicht
existierende Datei unter einer solchen Junction, posix mit `\`; Werkzeug nicht im Satz, `mcp__x__y`, Bash ohne
`command`, Write ohne `file_path`, Write innen ⇒ auto_deny „nur Bash“, Bash ⇒ frage_stefan.

## 2 MCP-Server-Skript `scripts/leitstand/rueckfrage-mcp.mjs` (neu)

Ohne Abhängigkeiten, Muster Spike (`mcp-rueckfrage.mjs`): JSON-RPC 2.0 zeilenweise auf stdin/stdout; `initialize`,
`tools/list`, `tools/call`, `ping`; Benachrichtigungen ohne Antwort. stdout gehört nur dem Protokoll — Diagnose nur
auf stderr. Werkzeuge:
- `rechte_pruefen` (Ziel von `--permission-prompt-tool`): leitet `{ art: 'rechte', tool_name, input, tool_use_id }`
  an den Leitstand. Antwort `allow` ⇒ `{ behavior: 'allow', updatedInput: <eigene Kopie von input> }` (der Leitstand
  kann den Befehl nicht verändern); sonst `{ behavior: 'deny', message: <Grund> }`.
- `frage_stefan(frage, optionen)`: `{ art: 'frage', frage, optionen, tool_use_id }` (`_meta['claudecode/toolUseId']`);
  Antworttext von Stefan, sonst „keine Antwort von Stefan“.

Umgebung (über das `env` des Servers in der mcp-config, §6): `WORKFORCE_RUECKFRAGE_URL` (Basis inkl. Präfix),
`WORKFORCE_RUECKFRAGE_TOKEN`, optional `WORKFORCE_RUECKFRAGE_FRIST_MS` (nur Tests). Ablauf: POST `…/anfrage` ⇒ sofort
eine Entscheidung (auto_deny) oder `{ id }`; dann Long-Poll POST `…/anfrage/<id>/warten` (Server hält bis zu
`pollFensterMs`, Standard 25 s, antwortet `{ offen: true }` oder mit Entscheidung) in einer Schleife bis zur
Entscheidung oder zur eigenen Frist (Wartegrenze + 60 s). `node:http` statt `fetch` (undici-Standard 300 s
Kopf-Zeitgrenze), je Anfrage Zeitgrenze 60 s. **Jeder Fehler** — fehlende Umgebung, Leitstand nicht erreichbar,
HTTP ≠ 200/202 (Token abgelehnt), kaputtes JSON, unbekannte Entscheidung, Frist — ⇒ `deny` mit Grund bzw.
„keine Antwort von Stefan“; nie `allow`.

## 3 Vermittlung im Leitstand-Server

Neues Modul `scripts/leitstand/rueckfrage-vermittlung.mjs` (Speicher, keine Datei-I/O):
`erzeugeRueckfrageVermittlung({ warteGrenzeMs = 600000, pollFensterMs = 25000, jetzt, protokolliere })` mit
- `oeffneLauf(laufId, { arbeitsordner, werkzeugNamen })` → Token (`randomBytes(32)` hex); ein Lauf, ein Token.
- `laufZuToken(token)` → laufId | null (zeitkonstanter Vergleich; nur offene Läufe).
- `stelle(laufId, anfrage)` → `{ entscheidung }` (auto_deny über `vorentscheidung`, **ohne** Warteschlangeneintrag,
  nur Protokoll) | `{ id }` (Eintrag in die Warteschlange, Timer `warteGrenzeMs` ⇒ `zeitueberschreitung`).
- `warte(laufId, id)` → Promise (Entscheidung oder `{ offen: true }` nach `pollFensterMs`); fremde laufId ⇒ 404.
- `offene()` → offene Rückfragen ohne Token (id, laufId, art, Werkzeug, Befehl/Frage neutralisiert und maskiert,
  Optionen, seit, frist).
- `beantworte(id, antwort)` → Bash/Rechte nur `einmal_erlauben` | `ablehnen` (alles andere, auch „immer“ ⇒ 400);
  Frage: `antwort` als nicht leerer Text (≤ 2000) ⇒ an das Modell; geschlossen ⇒ 409; unbekannt ⇒ 404.
- `beendeLauf(laufId)` → offene Rückfragen ⇒ `lauf_beendet` (deny bzw. „keine Antwort von Stefan“), Token ungültig,
  Lauf geschlossen. Idempotent; ohne geöffneten Lauf ein No-op.
`protokolliere(laufId, eintraege)` ist der Rückruf des Servers (§4).

Routen in `scripts/leitstand-server.mjs` (laufen durch die zentralen Host- und CSRF-Haken, nicht pro Route
wiederholt):
- POST `/api/rueckfrage/anfrage` und POST `/api/rueckfrage/anfrage/<id>/warten` — nur mit Token
  (`Authorization: Bearer …`); falsches/abgelaufenes Token ⇒ 403. Body begrenzt (64 KiB).
- GET `/api/rueckfragen` — lesend, offene Rückfragen (Browser).
- POST `/api/rueckfragen/<id>/antwort` — Browser. Trägt die Anfrage einen Token-Header ⇒ 403 („mit dem Token kann
  man nur fragen“); auf den Token-Routen gibt es keine Antwort-Route (404).
Die Vermittlung wird je Handler erzeugt, injizierbar über `optionen.rueckfrageVermittlung` (Testparameter
`optionen.rueckfrage = { an, warteGrenzeMs, pollFensterMs, skriptPfad }`). Kein Eintrag im CLI-Bindeblock ⇒ aus.

Einschalten (nur mit `optionen.rueckfrage.an === true`, nur Gate): in `starteLaufUndVergiss` vor
`fuehreAufgabeDurchFn` für Rolle `ausfuehrung`, Werkzeugsatz `schreibend`, Worker claude-code: `oeffneLauf`, dann
`ergaenzeRueckfrageAufruf` auf `eingaben.aufrufEingaben` (und `ortBLauf.mcpServer`). Lauf-Ende: `beendeLauf(laufId)`
als erste Anweisung in `.then` (vor der D13-Marke, synchron, deckt ok:false und regulär) und in `.catch` — Zeitgrenze
und Abbruch enden ebenfalls dort. Der D13-Vertrag (Marken, kein await) bleibt unberührt.

## 4 Protokoll je Lauf

Kern-Artefakt `rueckfragen-<laufId>` über `registriereKernArtefakt` (Kontrollzustand, Hash-Kette, nicht im
Arbeitsordner), neue Version je Entscheidung (alle Einträge bis dahin). Schema
`schemas/kontrollzustand-rueckfragen-payload.schema.json` + Beispiel in `schemas/examples/`;
`validiereRueckfrageProtokoll` vor jedem Schreiben. Daten:
`{ lauf_id, eintraege: [{ tool_use_id: string|null, art: 'auto_deny'|'stefan_erlaubt'|'stefan_abgelehnt'|
'zeitueberschreitung'|'lauf_beendet', werkzeug, grund, zeit, text?, antwort? }] }`. `text` (Befehl bzw. Frage) und
`antwort` gehen durch `neutralisiereText` und `maskiereGeheimnisse`; kein Pfad des Arbeitsordners, kein Home/Temp.
Ein Schreibfehler lässt die Entscheidung unverändert (protokolliert in der Startfehlerliste) — die Auswertung (§5)
fällt dann für diesen Lauf auf das heutige Verhalten zurück (sichere Richtung: VERWEIGERT).

## 5 Result Evaluator

`KlassifikationsEingaben.rueckfragen?: readonly { tool_use_id: string | null; art: string }[]`. Fehlt das Feld ⇒
exakt heutiges Verhalten. Gesetzt, an der bisherigen Stelle „denials > 0 ⇒ VERWEIGERT“ (Reihenfolge §4 unverändert,
alle FEHLGESCHLAGEN-Gründe davor):
- jede Ablehnung hat eine `tool_use_id`, zu der das Protokoll **genau** `stefan_abgelehnt` trägt, und
  `bypass_verdacht_anzahl === 0` ⇒ `ERFOLGREICH` mit `daten.abgelehnt_durch_stefan = <Anzahl>`;
- sonst (auto_deny, zeitueberschreitung, lauf_beendet, Werkzeugsatz-/Deny-Regel ohne Eintrag, gemischt) ⇒
  `VERWEIGERT` wie heute.
Controller (`src/execution-controller`): `AusfuehrungsEingaben.rueckfrage?: { an: true }` (nur vom Einschalten in §3
gesetzt) ⇒ nach dem Gateway die letzte Version von `rueckfragen-<laufId>` lesen und als `rueckfragen` übergeben
(fehlt sie: `[]`, gleichwertig zu heute). Ohne Feld kein Lesen.

## 6 Argv-Baustein

`ergaenzeRueckfrageAufruf(aufrufEingaben, { an, nodePfad, skriptPfad, url, token })`:
- `an !== true` ⇒ **dasselbe Objekt** zurück (Argv bitgleich, Test über `baueAufruf`).
- `an` ⇒ mcp-config = vorhandene (Katalog-MCPs aus `baueMcpAufruf`) plus Server `rueckfrage`
  (`{ command: nodePfad, args: [skriptPfad], env: { WORKFORCE_RUECKFRAGE_URL, WORKFORCE_RUECKFRAGE_TOKEN } }`);
  Schlüssel `rueckfrage` schon belegt ⇒ Wurf (Start abgelehnt); `mcp__rueckfrage__frage_stefan` in
  `werkzeugsatz.erlaubte_werkzeuge` (⇒ `--allowedTools` und `--tools`); neues Feld
  `permissionPromptTool: 'mcp__rueckfrage__rechte_pruefen'`.
- `baueAufruf`: neues optionales `AufrufEingaben.permissionPromptTool` ⇒ `--permission-prompt-tool <wert>` vor `-p`
  (Stelle wie im Spike, nach `--json-schema`); ohne Feld bitgleich. `pruefeStartauftrag` lehnt das Feld im Body ab
  (Muster `mcpConfig`).
- Init-Gate: mit Schalter an und vorhandenem `ortBLauf` steht `rueckfrage` in `ortBLauf.mcpServer`;
  `pruefeInitZeile` bleibt unverändert (Menge = übergeben). Ohne `ortBLauf` kein Init-Gate wie heute.

## 7 Gate `scripts/check-f45-b2b3b1-rueckfrage.mjs` (neu, in `check:gates`)

Attrappen-Client: spawnt `rueckfrage-mcp.mjs` mit der Umgebung aus der mcp-config des Laufs, spricht JSON-RPC,
gegen einen echten Leitstand-Server (`erzeugeRequestHandler`, `createServer`, Port 0) mit
`optionen.rueckfrage.an = true` und gestubbtem `fuehreAufgabeDurchFn` (wartet, bis der Client fertig ist).
- (g1) Bash ⇒ offen in GET `/api/rueckfragen` ⇒ Antwort `einmal_erlauben` ⇒ `allow`, `updatedInput` = Eingabe;
  Protokoll `stefan_erlaubt`.
- (g2) Bash ⇒ `ablehnen` ⇒ `deny`; Protokoll `stefan_abgelehnt`.
- (g3) `frage_stefan` ⇒ Antworttext kommt beim Client an.
- (r1) Write außerhalb (absolut und `..`) ⇒ sofort `deny`, GET `/api/rueckfragen` leer, Protokoll `auto_deny`.
- (r2) falsches Token ⇒ 403; Client mit falschem Token ⇒ `deny`.
- (r3) Antwort über die Token-Routen unmöglich (404); Antwort-Route mit Token-Header ⇒ 403; „immer“ ⇒ 400.
- (r4) Wartegrenze (Testparameter 300 ms) ⇒ `deny`, Protokoll `zeitueberschreitung`.
- (r5) Lauf-Ende bei offener Rückfrage ⇒ `deny`, Protokoll `lauf_beendet`, GET leer, Token danach 403.
- (r6) Leitstand weg (geschlossener Port) ⇒ `deny` bzw. „keine Antwort von Stefan“.
- (r7) stdout des Skripts: jede Zeile gültiges JSON-RPC.
- (e1)–(e4) Evaluator: nur Stefan ⇒ ERFOLGREICH mit `abgelehnt_durch_stefan`; gemischt ⇒ VERWEIGERT; auto_deny ⇒
  VERWEIGERT; ohne Protokoll ⇒ VERWEIGERT.
- (a1) Schalter aus: Argv bitgleich (`baueAufruf` mit/ohne Baustein), und ein Lauf über den Server ohne
  `optionen.rueckfrage` sieht `aufrufEingaben` ohne `permissionPromptTool` und mit unveränderter mcp-config.
  (a2) Schalter an: `--permission-prompt-tool mcp__rueckfrage__rechte_pruefen`, mcp-config mit Katalog-MCP und
  `rueckfrage`, `frage_stefan` in `--allowedTools`; `pruefeInitZeile` mit/ohne `rueckfrage` in `init.mcp_servers`.
- (f) Quelltext: `starteWorkflowSchritt(` 6×, Workflow-Schreiber 14 / `.eingefroren` 13 (F-228 unverändert); der
  CLI-Bindeblock setzt `rueckfrage` nicht.
Gegen main rot (neue Module fehlen).

## 8 Doku

`ARCHITECTURE.md` (§1 `src/rueckfrage`, §2 Protokoll-Artefakt, §3 Kanal und Grenzen; Durchsetzungsgrad: Pfadgrenze
und „nur fragen mit Token“ ERZWUNGEN mit Rot-/Grünfall im Gate, sonst DEKLARIERT), `docs/STATUS.md`,
`docs/projekt/fixpaket-f45.md` (Zeilen B2b-3b-1, B2b-3e um F-1125 erweitert, B2b-3b-2; Reihenfolge 3b-1 → 3e → 3b-2
→ B2b-4), `docs/projekt/kontext/lagebild.md`. Bekannte Grenze: Laufcode über npm-Skripte kann jede Leitstand-Route
aufrufen (ADR `docs/adr/ausfuehrung-bash-allowlist.md`) — der Kanal ist eine Bedien-Grenze für das Modell, keine
Sicherheitsgrenze gegen selbst ausgeführten Code.

## 9 Findings (`state/findings.md`)

F-1124 PROCESS_IMPROVEMENT P2 „Ausführung begann vor dem Advisor-Urteil“ (offen); F-1125 HARNESS_IMPROVEMENT P2
„Persönliche Pfade in Render-Screenshots“ (offen, Platzhalter `<name>` wörtlich). Reste aus Review/qa als F-1126.

## 10 Grenzen (NICHT)

Kein Einschalten im Produktpfad, keine Oberfläche, kein echter CLI-Lauf, keine Startfreigabe-Anleitung (B2b-3b-2).
Nicht berührt: `.claude/`, `CLAUDE.md`, `projekte.json`, `ressourcen.json`, `vorlagen/`, `.githooks`,
`kontrollzustand/`, `startvorlagen/`, `state/aktuelle-autorisierung.json`, `workflow-vorlagen/`; `package.json` nur
die Gate-Zeile. `starteWorkflowSchritt(` bleibt 6×, F-228-Zählung unverändert (kein Workflow-Schreiber).

## 11 Akzeptanz

Unit-Tests `src/rueckfrage`, Vermittlung (`scripts/leitstand/rueckfrage-vermittlung.test.mjs`), Evaluator
(neue Fälle), `baueAufruf` (`permissionPromptTool`) rot → grün; Gate (g1)–(f) grün; `npm run check:gates` grün;
`npm run check` grün oder Speicherabbruch vermerkt. code-reviewer und qa, höchstens eine Korrekturrunde.

## 12 Risiken

- Undokumentiertes Flag: Verhalten kann sich mit der CLI ändern — Nachweis-Lauf erst in B2b-3b-2.
- Ob die CLI das `env` aus der mcp-config an stdio-Server weitergibt, belegt erst der echte Lauf (B2b-3b-2);
  Alternative: Argumente des Skripts.
- Token in der mcp-config steht im Argv des CLI-Prozesses (Prozessliste); gilt nur während des Laufs und erlaubt
  nur Fragen. Laufakte speichert das Argv nicht.
- Mehrprojekt-Dispatcher: die Vermittlung je Instanz; B2b-3b-2 entscheidet, ob sie wie `globalerLaufZustand` geteilt
  wird (URL-Präfix im `env`).
- `realpath` unter Windows auf OneDrive-Reparse-Points: wirft ⇒ fail closed (auto_deny).

## Offene Punkte, nicht stillschweigend entschieden

- O1 Datei-Werkzeug innerhalb des Ordners, das die CLI trotzdem vorlegt (z. B. Read außerhalb von `--allowedTools`
  bei einem anderen Werkzeugsatz): `auto_deny` „nur Bash“ (wörtlich nach Auftrag) statt Stefan zu fragen.
- O2 Protokoll als Kern-Artefakt im Kontrollzustand (Hash-Kette, eine Version je Entscheidung) statt einer neuen
  Ausnahme-Datei unter `~/.ai-workforce/` — keine neue Ausnahme in ARCHITECTURE §2.
- O3 Die Vorentscheidung läuft im Leitstand, nicht im Skript (eine Stelle, vertrauenswürdige Eingaben
  Arbeitsordner/Werkzeugsatz); das Skript bleibt dumm und fail closed.
- O4 Einschalt-Verdrahtung in `starteLaufUndVergiss` wird schon gebaut, aber nur über die Handler-Option erreichbar
  (Gate); B2b-3b-2 setzt sie im CLI-Bindeblock.
- O5 Stefan-Ablehnung mit gleichzeitigem Umgehungsverdacht (Verbotswert im Befehl) ⇒ VERWEIGERT (E-186 bleibt).

## 13 Zuschnitt und Schätzung

≈ 0,6–0,8 AT (Regel + Tests ≈ 0,15, Skript ≈ 0,1, Vermittlung + Routen + Protokoll ≈ 0,2, Evaluator/Controller/Argv
≈ 0,1, Gate ≈ 0,15, Doku ≈ 0,05). Trennlinie, falls zu groß: Evaluator + Controller-Lesen (§5, Gate (e)) als eigener
Bau vor B2b-3b-2 — ohne Einschalten ändert §5 kein Verhalten.
