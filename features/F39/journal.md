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

## 2026-09-24 — Feature-Review-Pass über das Gesamtfeature, Branch `docs/f39-feature-gate`

Grundlage: main (`17a41d6`, #239, F-658/F-659) — Commit-Umfang WS-1 bis
WS-3a plus alle Fixpakete (`eb42da1`..`17a41d6`, #224–#239) über
`features/F39/feature.md` (AK1–AK17) und dieses Journal ermittelt. Frischer
Kontext (code-reviewer + qa, jeweils eigener Subagent). **Beide Urteile:
FREIGEGEBEN MIT HINWEISEN, keine P0/P1-Blocker.**

qa: alle 17 Akzeptanzkriterien mit konkretem Beleg (Testdatei+Testname,
Gate-Abschnitt oder Render-Nachweis) unterlegt, keine echte Lücke. Vertieft
geprüft: AK3 (alle fünf Kopplungsverletzungen einzeln benannt), AK11 (alle
drei Ablehnungsfälle + Idempotenz gegen einen echten HTTP-Testserver),
AK16 (Rot-/Grünfall „fehlt" vs. „leer" beide vorhanden). Zwei
Dokupflege-Funde: `docs/harness/HARNESS-GLOSSARY.md` nennt für
`architecture-advisor` noch die veraltete Fundstelle `schritt-1-architektur`
(real seit der WS-2a-Korrektur `schritt-2-architektur`, F-663); dieses
Journal behauptete zuvor, der Render-Nachweis für `nachweis-f656-ui/` stehe
noch aus — real bereits vollständig vorhanden (F-664).

code-reviewer: Rollenvertrag (inkl. echtem Rot-Fall-Test für eine
vertragswidrige Besetzung), Codex-Dialekt-Schema (F-638-Rückfall
ausgeschlossen), hoch-Kette, deterministische Router-Untergrenze, Regel
1c/1f, Prüfschritt-Fail-closed (F-654), Prüfung-wiederholen-Erkennung
(F-656, strukturell über Rolle/Status/Prüfergebnis, nicht über den
`grund`-Text), selbstgebauter Code (F-631/F-518) mit gleicher Strenge wie
jeder andere Code geprüft — bereits sauber (frühere Korrekturrunde). Zwei
P2-Funde: F-661 (Prompt-Injection-Fläche der Abnahme-Begründung in
`baueReviewKorrekturInstruktion`, F-659 — im Ein-Nutzer-Modell geringes
unmittelbares Risiko, vor einer Mehrnutzer-Erweiterung zu härten) und F-662
(Regel 1f ist für die tatsächliche `hoch`-Kette, Schritt nach
architekt/architecture-advisor, nur durch Konfiguration belegt, kein
eigener Test/Reallauf-Nachweis für genau diese Position — ergänzt den
bereits bekannten Nicht-Blocker „hoch-Pfad nur durch Versuch 2 belegt").
Plus F-660 (Prozesshinweis: Lagebild-Neuerzeugung nach einer
findings.md-Änderung nicht automatisiert).

Render-Nachweis (F-622) für `nachweis-e-f39-1-ui/`, `nachweis-f652-ui/`
und `nachweis-ws2b-ui/` (alle drei `klickfolge.json`-Verzeichnisse unter
`features/F39/nachweis-*-ui/`) erneut gelaufen — alle drei grün, Ergebnis
deckt sich mit den bestehenden `protokoll.md`-Dateien.

Ergebnis: keine Blocker → `features/F39/feature.md` Status `IN_ARBEIT` →
`FEATURE_GATE` gesetzt, `docs/STATUS.md` nachgezogen. `state/findings.md`
F-660–F-664 neu angelegt (alle offen, P2/P3, kein Blocker). WS-3b (realer
Durchlauf) bleibt eigener, künftiger Auftrag — unverändert.

**Korrektur 24.09.2026 (siehe Eintrag unten, E-F39-2 = A):** diese letzte
Aussage war falsch überzeichnet — Versuch 2 (23.09.2026, hoch/Projektmodus)
deckt die `hoch`-Kette nur bis `ausfuehrung` ab, kein vollständiger realer
`hoch`-Lauf existiert. Siehe F-665/F-666.

## 2026-09-24 — Korrektur nach Stefans Einwand: WS-3b teilweise real erbracht, nicht „kein Blocker" (E-F39-2 = A)

Stefan wies den vorherigen Feature-Review-Pass-Eintrag zurück: `feature.md`
und `docs/STATUS.md` hatten WS-3b als „kompletter `hoch`-Pfad nur durch
Versuch 2 belegt, WS-3b bleibt eigener, künftiger Auftrag" beschrieben —
das verharmlost den tatsächlichen Stand. Versuch 2 (23.09.2026,
hoch/Projektmodus) ist der EINZIGE reale `hoch`-Beleg und deckt nur drei
der vier Schritte ab: `architekt` ERFOLGREICH (Schema valide, 1 ADR-Entwurf,
0 Entscheidungen, 63,9 s); `architecture-advisor` ERFOLGREICH aber OHNE
Urteil (F-641); `ausfuehrung` ERFOLGREICH (nur Dokumentation — ADR, Akte
F42, Roadmap —, 105,7 s, $0,74, schrieb dabei ungeschützt auf main, löste
F-643/E-F39-1 aus); `code-reviewer` FEHLGESCHLAGEN (`spawn ENAMETOOLONG`,
F-642). Regel 1c (Architektur-Entscheidung) wurde real nie ausgelöst
(`entscheidungen_mensch[]` war leer). Die Versuche 3/3b/3c/4 liefen
ausschließlich über die `standard`-Kette (ohne `architekt`).

Stefan entschied **E-F39-2 = A**: WS-3b gilt als teilweise real erbracht
(`standard`-Kette vollständig belegt, `hoch`-Kette nur bis `ausfuehrung`);
ein vollständiger realer `hoch`-Lauf (Advisor MIT Urteil, Review, Regel 1c)
wird **Pflicht-AK der F41-Abnahme**, statt unbestimmt als „eigener
künftiger Auftrag" offenzustehen.

Umsetzung: `features/F39/feature.md` (Status-Absatz + WS-3b-Workstream-
Beschreibung) und `docs/STATUS.md` (beide Stellen) korrigiert. Neuer
Abschnitt „Versuch 2 — 23.09.2026, hoch/Projektmodus" in
`features/F39/nachweis-ws3-reallauf-messung.md` mit den obigen Fakten
ergänzt (Vorlage „Schritt 1"–„Schritt 9" bleibt bewusst leer stehen, als
Vorlage für den ausstehenden vollständigen F41-`hoch`-Lauf). `state/
findings.md`: F-665 (`PROCESS_IMPROVEMENT`, P2, offen — die
Überzeichnung selbst als Prozessbefund, der Review-Auftrag hatte die
Einordnung vorgegeben statt sie den Prüfrollen zu überlassen) und F-666
(`TECH_DEBT`, P1, offen — der fehlende vollständige `hoch`-Beleg,
Pflicht-AK F41) neu angelegt. F-664 zugleich final erledigt (Status
„behoben" statt „offen").

`node scripts/erzeuge-lagebild.mjs` erneut gelaufen, `npm run check` grün.
Explizit gestaged, nicht committet — Freigabe steht weiterhin aus.

## 2026-09-24 — Abnahme durch Stefan

Stefan hat F39 am 24.09.2026 abgenommen. `features/F39/feature.md` Status
`FEATURE_GATE` → `ABGESCHLOSSEN`. Restfindings F-660–F-663, F-665 und
F-666 (`state/findings.md`) bleiben offen — F-666 (vollständiger realer
`hoch`-Lauf) ist Pflicht-AK der F41-Abnahme (E-F39-2 = A); F-664 ist
bereits behoben. `docs/STATUS.md` nachgezogen. F41 (Neues Projekt anlegen,
E-M5-14) ist das nächste Feature, Challenge dafür läuft.
