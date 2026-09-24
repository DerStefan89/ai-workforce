# Journal — F39

Anhängeprotokoll. Neue Einträge unten anfügen, bestehende nicht ändern.

## 2026-09-24 — F-652 (BUG P1) behoben, Branch `fix/f652-pruefschritt`

Grundlage: `state/findings.md` F-652, real beobachtet im F39-WS-3b-Reallauf,
Versuch 3c (23.09.2026, Lauf `29e2be19-d3c8-4f81-8b93-1fa9fdb63132`) — die
Rolle `ausfuehrung` meldete sich selbst als „Blockiert", weil sie
`npm run check` nicht selbst ausführen kann (kein Werkzeugsatz trägt
Bash/npm); `code-reviewer` ist strukturell nur lesend und kann es ebenso
wenig zuverlässig nachholen (F-650). F39 bleibt `IN_ARBEIT`, WS-3b (realer
Durchlauf) weiterhin offen — dieser Fixpaket-Branch behebt ausschließlich
den Blocker, der WS-3b real gestoppt hat.

Umsetzung:

- **Startvorlage** (`src/startvorlage/`, `schemas/startvorlage.schema.json`)
  bekommt zwei optionale, additive Felder: `pruefbefehl` (argv, kein
  Shell-String, [0] absoluter Pfad, gleicher Hygiene-Guard wie jedes andere
  Startziel) und `pruefZeitgrenzeMs`. `startvorlagen/ai-workforce.json`
  trägt jetzt einen realen `pruefbefehl` — `[process.execPath,
  '…/npm-cli.js', 'run', 'check']`, weil `npm` unter Windows eine
  `.cmd`-Datei ist und `execFile`/`spawn` sie ohne Shell nicht direkt
  starten können. Alle anderen Startvorlagen bleiben bitgenau unverändert.
- **Neues Modul `src/pruefschritt/`**: `fuehrePruefungDurch` führt den
  Prüfbefehl über die bestehende, real getestete Prozessstart-/
  Timeout-/Kill-Logik aus `src/claude-code-gateway/prozessstart.ts` aus
  (`starteProzess`, kein zweiter Prozessstart-Regelsatz, D5) — additiv um
  `StarterOptionen.umgebungsvariablenVollstaendig` ergänzt, den einzigen Weg,
  dem Kindprozess eine geerbte Variable (hier: jede `LEITSTAND_*`)
  vorzuenthalten, weil ein Merge über `process.env` eine Variable nur
  überschreiben, nie entfernen kann. Klassifiziert nach GRUEN/ROT/
  ZEITGRENZE/FEHLER, wirft nie. Neues Kernartefakt-Schema
  `schemas/kontrollzustand-pruefergebnis-payload.schema.json`.
- **Kern-Nachbereitung** (`starteLaufUndVergiss`,
  `scripts/leitstand-server.mjs`): NACH der Änderungsübersicht und VOR
  `meldeLaufende`, nur bei schreibendem Werkzeugsatz + real
  ABGESCHLOSSEN/ERFOLGREICH + gesetztem `vorlage.pruefbefehl`. D13
  (`laufAktiv`) bleibt bis Prüfungsende gehalten — der Reset stand vorher
  VOR der (potenziell minutenlangen) Prüfung, das hätte ein zweites
  gleichzeitiges Startfenster geöffnet.
- **Regel 1f** (`ermittleNaechstenSchritt`, `src/workflow/index.ts`), neben
  Regel 1e (gleiche Kopplung an `schritt.rolle === 'ausfuehrung'`, weil
  `output_schema` dort `null` bleibt): ein `pruefergebnis` ungleich `GRUEN`
  hält den Workflow auf `KLAERUNG_ERFORDERLICH`, `grund` trägt Ergebnis,
  Exit-Code und die letzten ~40 Zeilen der Ausgabe. Der Review-Schritt
  startet dann NICHT.
- **Eingabe-Platzhalter** `pruefergebnis-@<schrittId>`
  (`loeseSchrittEingabenAuf`): dieselben drei Schutzregeln wie
  `aenderungsuebersicht-@` (Selbstverweis, unbekannte schritt_id, noch keine
  lauf_id) — verallgemeinert in `loesePraefixPlatzhalterAuf` statt eines
  zweiten Regelsatzes. Unterschied zu `aenderungsuebersicht-@`: fehlt das
  Artefakt (keine Startvorlage mit `pruefbefehl`), entfällt der Platzhalter
  still, statt den Schritt-Start zu blockieren. `workflow-vorlagen/
  standard.json` und `hoch.json` geben ihn dem jeweiligen Review-Schritt
  mit; `fast-lane.json` bleibt unverändert (kein Folgeschritt).
- **Ausführungs-Instruktion**: ist `pruefbefehl` konfiguriert, bekommt der
  `ausfuehrung`-Auftragstext einen zusätzlichen Hinweissatz, dass das System
  Tests/Checks selbst ausführt und eine fehlende Bash-/npm-Berechtigung
  keine Blockade ist.
- **Projektion**: `GET /api/workflows/<id>/abnahme` trägt zusätzlich
  `pruefergebnis` (Muster `aenderungsuebersicht`), der Leitstand zeigt
  direkt darunter eine Zeile „Prüfung: GRÜN/ROT/… (Exit n)"
  (`public/leitstand/views/workflows.js`, `renderPruefergebnis`). Zusätzlich
  additiv in der schlanken `GET /api/workflows/<id>`-Antwort.

Tests: `src/pruefschritt/pruefschritt.test.ts` (GRUEN, ROT mit
Ausgabetext-Beleg, ZEITGRENZE mit realem Prozess-Kill-Beleg über eine
Markerdatei, FEHLER bei ungültigem Startziel, LEITSTAND_*-Filterung,
Kürzung), `src/startvorlage/startvorlage.test.ts` (Schema-Validierung,
reale `ai-workforce.json`), `src/workflow/workflow.test.ts` (Regel 1f, alle
vier Werte, Vorrang von Regel 1, Kopplung an rolle), neues Gate
`scripts/check-f652-pruefschritt.mjs` (echter HTTP-Dispatch über einen
Testserver: grün mit automatischer Fortsetzung + Instruktionssatz +
Env-Filterung, rot mit `KLAERUNG_ERFORDERLICH` + Ausgabeende, Zeitgrenze mit
realem Prozessbaum-Kill, kein `pruefbefehl` bitgenau wie zuvor, lesender
Lauf ohne Prüfung, D13-Sperre während der Prüfung inkl. Freigabe danach,
Platzhalter-Schutzregeln inkl. der neuen „bleibt folgenlos"-Regel, GET
.../abnahme-Projektion). Render-Nachweis (F-622) unter
`features/F39/nachweis-f652-ui/` — echter Playwright-Lauf, „Prüfung: ROT
(Exit 1)" real im DOM neben der Änderungsübersicht beobachtet, Review-Schritt
nie gestartet. `npm run check` real grün (767/767, zweimal in Folge).

Nicht im Scope (siehe Bauauftrag): automatischer Retry/automatische
Korrektur (F35), ein eigener Workflow-Schritt-Typ, ein Bash-Werkzeug für die
Ausführung selbst, das Verhältnis Korrekturschleife/Sauberkeitssperre
(P2-Finding). Restlich offen: ein realer Reallauf-Beleg über einen echten
Claude-Code-Kindprozess (bisher ausschließlich Attrappen/Fixtures) steht vor
der WS-3b-Fortsetzung noch aus.

`state/findings.md` F-652 auf „in Umsetzung" gesetzt.

## 2026-09-24 — F-654 (BUG P1) behoben: Fail-open-Loch in F-652 geschlossen

Bei der Verifikation von F-652 vor dem Commit entdeckt: scheiterte die
Registrierung von `pruefergebnis-<laufId>` (Schemaverstoß oder ein Wurf aus
`fuehrePruefungDurch`/`registriereKernArtefakt`), blieb `pruefergebnis` im
Nachlauf `undefined` — Regel 1f griff dann NICHT, und ein Bau mit defekter
Prüfinfrastruktur lief ungeprüft zum Review durch (fail open). Real belegt
über eine erzwungene Schreibkollision (Datei statt Verzeichnis an der
Lineage-Zielposition, `mkdirSync` wirft echtes `ENOTDIR`).

Fix: im Nachlauf gilt jetzt zusätzlich — `vorlage.pruefbefehl` gesetzt UND
kein Artefakt gefunden → `pruefergebnis = 'FEHLER'` (fail closed, dieselbe
Härte wie ein real gescheiterter Prüflauf). Ohne `pruefbefehl` bleibt das
Verhalten unverändert.

Test `scripts/check-f652-pruefschritt.mjs` Block (i): vor dem Fix am
selben Branch real rot geprüft (Review startete trotz gescheiterter
Registrierung), nach dem Fix grün. `npm run check` real grün.
`state/findings.md` F-654 neu angelegt, Status „behoben".
