# Plan v2 — F42 Projekt-Harness WS-1

Nach Advisor-Pass (`state/advisor-findings-f42-projekt-harness-ws1.md`,
Urteil „Nicht freigegeben" wegen F1/F3). Diese Fassung behebt beide
Blocker. Abschnitte 1, 2, 3, 5, 6, 7, 9 sind inhaltlich **unverändert**
gegenüber `state/plan-v1-f42-projekt-harness-ws1.md` (der Advisor hat sie
geprüft und bestätigt/als unkritisch eingestuft, siehe F2/F4/F5/F6/F7/F8/F9
dort) — hier nur als Kurzreferenz, Volltext bleibt in v1. Nur Abschnitt 4
und Abschnitt 8 sind inhaltlich geändert; Abschnitt „F-702-Klärung" ist neu.

## Kurzreferenz unveränderter Abschnitte (siehe v1 für Volltext)

1. Skelett-Snapshot: `vorlagen/projekt-skelett/` aus `git show 9189959:<pfad>`,
   25-Dateien-Whitelist + `HERKUNFT.md`. Unverändert.
2. Kollisionsprüfung gegen `check-docs.mjs`/`check-rules.mjs`/
   `check-contract.mjs`: **vom Advisor real gegen die Root-Fassung
   verifiziert (F2) — keine Gate-Ausnahme nötig**, Offener Punkt 1 aus v1
   damit erledigt.
3. `kopiereSkelett(installWurzel, zielRepoWurzel)` in
   `src/projekt-anlegen/index.ts`, Aufrufreihenfolge `kopiereBaseline` →
   `kopiereSkelett` → `schreibeStartvorlageUndProfil`. Vom Advisor
   gegengeprüft, keine Pfadüberlappung (F7).
5. Coach-Textänderung über additiven `kontext?`-Parameter an
   `baueAuftragAusProjektentwurf` + additives Feld an `GET /api/zustand`.
   Advisor empfiehlt den Hauptvorschlag (additives `/api/zustand`-Feld)
   gegenüber der in v1 genannten Alternative (F4) — **Alternative
   verworfen**, nur noch der Hauptvorschlag wird gebaut.
6. Trust-Erkennung `pruefeWorkspaceTrust`, exakter String-Vergleich, keine
   Sperre (nur Anzeige/Warnung in `naechste_schritte.trust`) — Advisor
   stützt die Scope-Begründung (F5), verlangt aber eine explizite
   Nicht-Ziel-Zeile in der Feature-Akte (siehe Abschnitt 9 unten,
   ergänzt).
7. Neues Gate `scripts/check-f42-projekt-harness.mjs`, fünf Prüfungen
   (a)-(e) mit je einem Rot-Fall, wie in v1 Abschnitt 7 beschrieben —
   Prüfung (c) wird um einen echten `fuehrePruefungDurch`-Aufruf ergänzt
   (siehe Abschnitt 8 unten, dieselbe Korrektur wie bei der Probe).
9. Doku-Updates (zielfassung v1.30, `features/F42/feature.md`,
   `docs/STATUS.md`, `state/findings.md`, `state/gates.md`) — unverändert,
   mit der Ergänzung aus F-702-Klärung unten.

## 4. Startvorlage: `pruefbefehl` mit absolutem Programmpfad (KORRIGIERT)

**Finding F1 (Advisor):** `startvorlage.pruefbefehl = ['npm', 'run',
'check:template']` scheitert auf Windows real mit `ENOENT`, weil
`starteProzess`/`fuehrePruefungDurch` `execFile` ohne Shell verwenden
(`src/claude-code-gateway/prozessstart.ts:7-20`, real gemessener
Windows-Befund) — `npm` löst nur auf `npm.cmd` auf, das `execFile` ohne
Shell nicht direkt ausführt. Das produktive Vorbild
`startvorlagen/ai-workforce.json:10` nutzt deshalb absolute Pfade zu
`node.exe` und `npm-cli.js`.

**Korrigierte Umsetzung** in `schreibeStartvorlageUndProfil`
(`src/projekt-anlegen/index.ts:201-229`), Ersatz für Zeilen 203-204:

```ts
const nodeExePfad = process.execPath
const npmCliPfad = join(dirname(nodeExePfad), 'node_modules', 'npm', 'bin', 'npm-cli.js')
if (!existsSync(npmCliPfad)) {
  throw new Error(`npm-cli.js nicht am erwarteten Pfad gefunden ('${npmCliPfad}', abgeleitet aus process.execPath='${nodeExePfad}') — pruefbefehl kann nicht gebaut werden`)
}
startvorlage.pruefbefehl = [nodeExePfad, npmCliPfad, 'run', 'check:template']
startvorlage.pruefZeitgrenzeMs = 120000
```

Begründung der Ableitung über `process.execPath` statt Übernahme aus der
Quell-Startvorlage (`quellStartvorlage.pruefbefehl[0]`/`[1]`): der Server
läuft bereits unter genau dem `node.exe`, das die Prüfung später wieder
ausführen wird (derselbe Prozess, derselbe Rechner, ARCHITECTURE.md §3
„Ein einziger Nutzer") — `process.execPath` ist eine vom Environment
abgeleitete Tatsache, kein neu erfundener Pfad, und bleibt korrekt, falls
Node künftig an einem anderen Ort installiert wird (die Quell-Startvorlage
könnte veraltete, von Hand eingetragene Pfade tragen). `existsSync`-Wächter
plus Wurf statt stillem Fallback: ein falsch abgeleiteter Pfad soll die
Projekt-Anlage sichtbar scheitern lassen (bestehender `try`/`catch` in
`POST /api/projekte` fängt den Wurf bereits ab und baut zurück, kein
zweiter Mechanismus nötig — Muster unverändert aus v1).

`pruefZeitgrenzeMs: 120000` bleibt wie in v1 eine begründete Schätzung
(Offener Punkt 5 aus v1, vom Advisor nicht beanstandet).

## 8. Probe (AK2) — KORRIGIERT: testet jetzt denselben Codepfad wie die Produktion

**Finding F1, Zusatzbefund (Advisor):** ein manuelles `cd` + `npm run
check:template` in einer interaktiven Shell testet einen anderen Codepfad
als `starteProzess`/`execFile` ohne Shell — hätte den F1-Fehler nicht
aufgedeckt.

**Korrigierte Probe:** einmaliges Skript (Scratchpad, nicht committet),
das denselben Pfad wie die Produktion nimmt:
1. `kopiereBaseline` + `kopiereSkelett` +
   `schreibeStartvorlageUndProfil` gegen
   `%TEMP%\projekt-harness-probe-<random>` (außerhalb aller
   Repo-Arbeitsbäume) aufrufen — liefert `neueStartvorlage` inkl. des
   real geschriebenen `pruefbefehl`-Arrays.
2. `fuehrePruefungDurch('probe-<random>', geschriebenerPruefbefehl,
   zielVerzeichnis, 120000)` (`src/pruefschritt/index.ts:222`) direkt
   aufrufen — **derselbe Aufruf, den der Kern nach einem echten Lauf
   selbst macht**, kein Shell-Workaround.
3. Erwartung: `ergebnis: 'GRUEN'`, `exitCode: 0`.
4. Temp-Verzeichnis löschen.

Ergebnis (das volle `PruefergebnisV0Daten`-Objekt, insbesondere `ergebnis`
und `exitCode`) geht in den Abschlussbericht.

Gate-Prüfung (c) aus Abschnitt 7 (v1) wird um denselben
`fuehrePruefungDurch`-Aufruf ergänzt — prüft jetzt nicht nur „Feld
gesetzt", sondern real `ergebnis === 'GRUEN'` gegen ein frisch angelegtes
Wegwerfprojekt.

## F-702-Klärung (Finding F3, neu gegenüber v1)

**Befund:** `state/findings.md` trug zum Zeitpunkt der Plan-Erstellung nur
bis F-698. F-699–F-702 sind Neuanlagen dieses Auftrags (die Nummern kamen
vom Auftraggeber-Prompt vorab vergeben, nicht aus einer bereits im Repo
stehenden Quelle) — **keine Fortschreibung eines bestehenden Eintrags**.
Abschnitt 6 (Trust-Erkennung) wird entsprechend präzisiert: „löst einen
Teilaspekt der in F-702 (neu angelegt in diesem Auftrag) dokumentierten
Baustelle", nicht „Fortschreibung". `features/F42/feature.md` verweist auf
F-699…F-702 als in diesem Feature neu entstandene Findings.

## Ergänzung Abschnitt 9 (Doku) — Nicht-Ziel-Zeile

`features/F42/feature.md` Abschnitt „Nicht-Ziele" bekommt zusätzlich:
„Harte Sperre schreibender Läufe gegen ein Projekt ohne bestätigten
Workspace-Trust (nur Anzeige/Warnung in `naechste_schritte.trust`) — eine
Sperre müsste in `starteGateway`/F6a/F8 eingreifen, außerhalb des
Auftragsumfangs `POST /api/projekte`-Antwort. F-702 bleibt dazu offen."

## Offene Punkte (fortgeschrieben aus v1, Status nach Advisor-Pass)

1. ~~check-docs.mjs-Identität~~ — **erledigt** (Advisor F2, Root-Fassung
   verifiziert).
2. `state/`-Whitelist-Umfang — weiterhin offen, geringes Risiko (Advisor
   F6), wird bei Bau nochmals gegen den realen Commit-Inhalt geprüft.
3. ~~Kanal für pruefbefehl/istAiWorkforce~~ — **entschieden**: additives
   `/api/zustand`-Feld (Advisor-Empfehlung F4 übernommen).
4. Harte Sperre vs. Warnung — **entschieden**: nur Warnung, jetzt mit
   expliziter Nicht-Ziel-Doku (Advisor-Auflage F5 umgesetzt).
5. `pruefZeitgrenzeMs: 120000` — weiterhin Schätzwert, vom Advisor nicht
   beanstandet, wird durch die korrigierte Probe (Abschnitt 8) real
   gemessen und bei Abweichung vor dem Commit angepasst.
