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

## 2026-09-24 — F39 Versuch 4 diagnostiziert; F-655 (BUG P1) und F-656 (FEATURE P1) auf Branch `fix/f655-pruefausgabe` behoben

Versuch 4 stand auf `KLAERUNG_ERFORDERLICH` (Regel 1f, Workflow
`router-9d5fedcb-dead-417f-a61f-c374a167ba73`, Ausführungslauf
`9397a9dd-ea70-4b05-8f52-bf3eec899514`, Prüfung ROT, Exit 1, 256 s).
Diagnose auf `test/f39-versuch4` mit den uncommitteten
Ausführungs-Änderungen: `npm run check` lief von Hand zweimal grün
(767/767, exit 0) — kein Beleg für eine Regression durch die F-518-Änderung
(`scripts/leitstand-server.mjs`, `scripts/leitstand/routen-verbrauch.mjs`,
`scripts/check-f32-verbrauch-ansicht.mjs`). Die erste echte Fehlerzeile war
aus dem gespeicherten Artefakt NICHT rekonstruierbar — das war selbst der
Beleg für F-655. Diese fünf Dateien auf `test/f39-versuch4` committet
(`674268b`, kein Push): Ergebnis der Ausführung, Beleg für die
Flake-Einordnung.

**F-655** (BUG P1): `fuehrePruefungDurch` (`src/pruefschritt/index.ts`)
hängte stderr hinter stdout und kürzte GEMEINSAM auf 16 KB — bei viel
stderr-Rauschen (erwartete Fehlerpfad-Logs aus F32-(d)/F-654-(i)-Fixtures,
Git-CRLF-Warnungen) verdrängte das die stdout-Fehlerzeile vollständig,
genau im real beobachteten `9397a9dd`-Artefakt (15933 Zeichen, komplett
Rauschen). Fix: `baueAusgabeEnde` kürzt stdout (12 KB) und stderr (4 KB)
GETRENNT, `filtereStderrRauschen` entfernt vorher die Git-CRLF-Warnzeile.
`ausgabe_ende` bleibt ein einzelner String (Reihenfolge stderr-dann-stdout,
stdout am Stringende) — kein Schema-Bruch, `letzteZeilen(ausgabe_ende, n)`
in `scripts/leitstand-server.mjs` liefert dadurch automatisch primär das
stdout-Ende, ohne selbst geändert zu werden. Rotfall real belegt
(`src/pruefschritt/pruefschritt.test.ts`): eine stdout-Fehlerzeile bleibt
trotz ~52 KB unfilterbaren stderr-Rauschens im Artefakt UND im Halt-Grund
erhalten; der Test schlug vor dem Fix real fehl (musste zusätzlich von
einem argv-Literal auf eine In-Prozess-Schleife umgestellt werden, weil
600 wiederholte Zeilen als ein einzelnes Kommandozeilenargument reale
Windows-Längengrenzen sprengten und den Prozessstart selbst scheitern
ließen).

**F-656** (FEATURE P1, neu angelegt): neuer Endpunkt `POST
/api/workflows/<id>/pruefung-wiederholen` — nur zulässig, wenn der Halt
strukturell (nicht über den `grund`-Text) als Regel-1f-Halt erkennbar ist.
Führt denselben `pruefbefehl` für dieselbe `lauf_id` erneut aus, SYNCHRON
(kein Fire-and-forget — bewusste Abweichung vom sonstigen Lauf-Startmuster,
siehe Kommentar am Endpunkt), unter derselben D13-Sperre. Ergebnis wird als
NEUE Version von `pruefergebnis-<laufId>` angehängt (Append). GRUEN setzt
über den bestehenden Automaten fort (`ermittleNaechstenSchritt` +
`starteWorkflowSchritt`, kein zweiter Mechanismus), ungleich GRUEN hält
erneut. UI: Knopf „Prüfung wiederholen" neben „Prüfung: ROT" in
`public/leitstand/views/workflows.js`, nur in genau diesem Zustand
sichtbar.

Test `scripts/check-f656-pruefung-wiederholen.mjs` (neu, echter
HTTP-Dispatch, Muster `check-f652-pruefschritt.mjs`): (a) falscher Zustand
→ 409, (b) `KLAERUNG_ERFORDERLICH` ohne Regel-1f-Halt → 409, (c) zweiter
Versuch liefert GRUEN → Review startet automatisch, (d) rot bleibt rot →
erneuter Halt, Review startet nicht, (e) Artefakt-Historie trägt genau 2
Versionen, (f) D13 lehnt einen parallelen Start während der Wiederholung
ab. Alle sechs Rotfälle real belegt (Attrappen ok:false statt Mock-Urteil,
Markerdatei-Trick für den Grünfall-Wechsel, echte 600ms-Verzögerung fürs
D13-Fenster).

`npm run check` real grün (siehe Bericht an Stefan). Render-Nachweis
(F-622) für den neuen Knopf steht noch aus — kein Commit, Stefan setzt die
Freigabe. `state/findings.md` F-655 und F-656 neu angelegt, Status „behoben
auf Branch".
