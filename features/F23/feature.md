# F23 — Abnahme + ADJUST-Loop

## ID

F23

## Titel

Abnahme + ADJUST-Loop (Entscheidungs-Schema, Post-Build-Prüfschritt,
BLOCKIERT-Wirkung, Folge-Workflow)

## Status

Status: FEATURE_GATE

Gültige Status-Werte (geprüft vom Gate, siehe A3a–e in
`features/AF-F001/feature.md`): `ENTWURF, READY_FOR_TECH,
WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN,
BLOCKIERT, ABGEBROCHEN`.

WS-0 (dieser Auftrag) ist gebaut: `src/aenderungsuebersicht/` (Kernartefakt
+ Validator + reale Ermittlung über einen lesenden `git`-Kindprozess),
`schemas/kontrollzustand-aenderungsuebersicht-payload.schema.json`,
Registrierung nach einem real ERFOLGREICH/ABGESCHLOSSEN beendeten Lauf mit
schreibendem Werkzeugsatz (`scripts/leitstand-server.mjs`,
`starteLaufUndVergiss`), Eingabe-Platzhalter
`artefakt:aenderungsuebersicht-@<schrittId>` in `loeseSchrittEingabenAuf`,
Gate `scripts/check-f23-abnahme.mjs` (WS-0-Teil, sieben Rot-/Grün-Fälle inkl.
echtem Dispatch über `POST /api/laeufe`), in `npm run check` eingehängt.

WS-1a (dieser Auftrag) ist gebaut: `schemas/kontrollzustand-entscheidung-
payload.schema.json` (löst F-350/F-379 — Pflichtfeld `art` trennt die fünf
zuvor überladenen `ergebnis`-Familien, je `art` eine eigene, exklusive
`ergebnis`-Wertemenge über `if`/`then` mit `additionalProperties:false` je
Zweig; `abnahme` ist bereits schemagültig, hat aber noch keine
Schreibstelle), `src/entscheidung/` (`validiereEntscheidungsDaten`,
handgeschrieben wie `src/aenderungsuebersicht/`, D5; `leiteArtAusHerkunftAb`
für E-M4-6 — ein vor WS-1a geschriebenes Artefakt ohne `art`-Feld wird über
seine Lineage-`herkunft.schritt` gelesen, nicht ungültig). Alle fünf
Schreibstellen in `scripts/leitstand-server.mjs` (`entscheidung-workflow-
planaenderung/-freigabe/-stopp`, `entscheidung-terminal`, `entscheidung-
kenntnisnahme`) setzen `art` jetzt explizit und validieren vor der
Registrierung. Gate `scripts/check-f23-abnahme.mjs` um Block (f) erweitert
(sechs valid-*.json, drei invalid-*.json gegen `validiereEntscheidungsDaten`).
WS-1b (Vorlagen-Umbau + Urteilsauswertung im Automaten, löst F-351/F-377)
ist gebaut (siehe AK9, Workstreams unten).

WS-2a (dieser Auftrag) ist gebaut: `leseUrteilAusLaufakte`
(`scripts/leitstand-server.mjs`) liefert das vollständige
ergebnis-code-reviewer-Objekt (`urteil`, `befunde[]`, `empfehlung`) statt nur
den `urteil`-String — Regel 1b in `src/workflow/index.ts` bleibt
unverändert, der Aufrufer in `starteLaufUndVergiss` greift weiterhin nur auf
`.urteil` zu. `schemas/kontrollzustand-entscheidung-payload.schema.json`
und `src/entscheidung/` (`validiereEntscheidungsDaten`,
`EntscheidungAbnahmeV0Daten`) tragen für `art: 'abnahme'` jetzt das
Pflichtfeld `bezug` (`workflow_version`, `ausfuehrung_lauf_id`,
`review_lauf_id`). Neue Endpunkte in `scripts/leitstand-server.mjs`: `GET
/api/workflows/<id>/abnahme` projiziert Workflow-Status, Urteil,
Änderungsübersicht und eine etwaige bereits vorhandene Abnahme-Entscheidung
in einer Antwort (fehlende Teile als `{status: '<Grund>'}`, kein 500); `POST
/api/workflows/<id>/abnahme` schreibt die Abnahme-Entscheidung
(`art: 'abnahme'`) — `ANGENOMMEN` nur bei Workflow-Status `ABGESCHLOSSEN`
(sonst 409, Status bleibt unverändert), `ABGELEHNT` bei `ABGESCHLOSSEN` oder
`KLAERUNG_ERFORDERLICH` (setzt `GESTOPPT`, Muster der `ABGELEHNT`-Zweig von
`POST /api/workflows/<id>/freigabe`), `ANPASSUNG_ANGEFORDERT` lehnt der
Endpunkt mit 400 ab ("folgt in F23 WS-2b"). `public/leitstand/api.js`
(`holeAbnahme`/`sendeAbnahme`) und `public/leitstand/views/workflows.js`
(Abnahme-Abschnitt in der Workflow-Detailansicht: Änderungsübersicht,
Urteil mit Befunden/Empfehlung, ACCEPT/REJECT mit Pflichtbegründung, ADJUST
sichtbar/deaktiviert mit Verweis auf WS-2b, bereits vorhandene Entscheidung
statt der Schaltflächen) bedienen die neuen Endpunkte. Gate
`scripts/check-f23-abnahme.mjs` um Block (g) erweitert (vier Rot-Fälle,
ein Grünfall über einen echten Dispatch); `scripts/check-f15-workflow.mjs`
F-228-Selbsttest auf die neue neunte Aufrufstelle des Workflow-Schreibers
nachgezogen.

Reviewer-/QA-Pass (frischer Kontext, 15.09.2026, F-046): Erstdurchlauf
beider NICHT freigegeben. `code-reviewer` fand einen kritischen Befund:
`findeAusfuehrungsSchritt`/`findeReviewSchritt` griffen ungeschützt auf
`workflowDaten.schritte.find(...)` zu — anders als der POST-Endpunkt (der
vorher `validiereWorkflowDaten` aufruft) validiert GET bewusst NICHT (Muster
`GET /api/workflows/<id>`: eine ungültige Fassung bleibt ansehbar). Auf einer
strukturell kaputten Fassung (`schritte` fehlt/kein Array) hätte das den
ganzen Serverprozess abgeschossen — derselbe Absturzpfad, den
`dekodiereSegment` schon einmal real gekostet hat. Behoben: beide Helfer
prüfen jetzt selbst `Array.isArray`/Elementform, Regressionstest (g6)
ergänzt. `qa` fand unabhängig einen kritischen Designfehler (TC-04): die
Abnahme-Entscheidung war nicht an das beurteilte Bau-Ergebnis gebunden —
nach ABGELEHNT → GESTOPPT → korrigierte Fassung → erneut ABGESCHLOSSEN
(AK16s eigener Reparaturpfad) zeigte die View für immer die ALTE
Entscheidung statt neuer ACCEPT/REJECT-Buttons. Erste Behebung (Diskriminator
`bezug.workflow_version`) wurde in der Nacharbeit vom selben Tag verworfen
und durch `bezug.ausfuehrung_lauf_id` ersetzt (s. u.) — hier nur der
ursprüngliche Befund festgehalten. Zusätzlich (TC-05): keine serverseitige
Sperre gegen eine zweite/widersprüchliche Entscheidung zu DEMSELBEN
Bau-Ergebnis — `POST` lehnt das jetzt mit 409 ab (Muster: eine zweite
Freigabe prallt an `ermittleNaechstenSchritt` ab, hier explizit geprüft, weil
`ANGENOMMEN` den Workflow-Status bewusst nicht ändert). Gate-Fälle (g6)-(g8)
ergänzt, (g7)/(g8) auch der bislang fehlende GET-Dispatch (Reviewer-Befund:
Block (g) testete zuvor ausschließlich POST). `npm run check` nach allen
Fixes erneut grün.

Nacharbeit (Verifikationsbefund, 15.09.2026, F-384, P1, zwei Anläufe): der
'veraltet'/409-Schutz aus dem obigen QA-Fix setzte voraus, dass zwei
Fassungen DESSELBEN Workflows sich unterscheidbar bezeugen lassen —
durchgesetzt war das nirgends (`waehleWorkflowVorlage` liefert immer die
feste Vorlagen-`version`, ein zweiter Routing-Versuch nach `ABGELEHNT` wäre
wieder `version` 1 gewesen).

Erster Anlauf (verworfen): `version` als Diskriminator erzwingen
(`verarbeiteRouterErgebnis` setzt sie auf `bestand.version + 1`,
`POST /api/workflows` lehnt `version <= bestand.version` mit 409 ab). Real
gebaut, real gegen `npm run check` geprüft — brach dabei 25 bestehende
Tests in F15/F22: `version` ist ein Plandatum, kein Fassungszähler, und der
etablierte Reparaturweg (`baueReparaturEntwurf`,
`public/leitstand/views/workflows.js`) reicht seit F15 WS-2c bewusst eine
Fassung mit UNVERÄNDERTER `version` ein (F-226/F-227 verlangen das
ausdrücklich). Der Diskriminator war falsch gewählt, nicht das Produkt —
verworfen, bevor committet wurde.

Zweiter Anlauf (gebaut): der Bezug einer Abnahme hängt am beurteilten
BAU-ERGEBNIS, nicht an der Planfassung — `bezug.ausfuehrung_lauf_id` statt
`bezug.workflow_version` ist der Diskriminator. `GET .../abnahme`:
`entscheidung.status` ist `'ok'`, wenn `bezug.ausfuehrung_lauf_id` der
`lauf_id` des aktuellen Ausführungsschritts entspricht, sonst `'veraltet'`.
`POST .../abnahme`, Doppelentscheidungs-Riegel: 409 nur, wenn die
bestehende Entscheidung denselben Ausführungslauf bezeugt. `bezug` selbst
bleibt unverändert (alle drei Felder, `workflow_version` bleibt als reine
Audit-Information drin) — kein Schemawechsel, kein Validator-Wechsel.
`POST /api/workflows`, `verarbeiteRouterErgebnis`, `src/workflow/index.ts`
und die F15/F22-Fixtures blieben unangetastet. `check-f23-abnahme.mjs`
Block (g8) umgebaut: die korrigierte Fassung entsteht über den realen Weg
(Ausführungsschritt bekommt einen ECHT NEUEN Lauf, nicht eine hochgezählte
`version`) — Grünfall belegt ABGELEHNT → neuer Ausführungslauf → erneut
ABGESCHLOSSEN → GET meldet `'veraltet'` → ANGENOMMEN gelingt → zweite
Entscheidung zu demselben Ausführungslauf wird mit 409 abgewiesen →
zusätzlich: eine Fassung OHNE neuen Ausführungslauf lässt `'ok'`
unangetastet (ein erfolgreicher Ausführungsschritt behält im
Reparaturentwurf seine `lauf_id`, `REPARIERBARE_SCHRITT_STATUS` enthält
`ERFOLGREICH` nicht). Neues AK20 für den Gate-Nachweis von Block (g), der
zuvor keinem AK zugeordnet war. `bezug`s Innenform im abnahme-Zweig des
Schemas war bereits vollständig beschrieben (F-385, ohne Codeänderung als
gelöst dokumentiert). `npm run check` grün.

Reviewer-/QA-Pass auf diese Nacharbeit (frischer Kontext, 15.09.2026,
F-046): `code-reviewer` freigegeben (mit Hinweisen, kein Blocker) — der
erste, verworfene `version`-Anlauf ist vollständig entfernt (kein
Restcode/keine veralteten Kommentare), Reihenfolge/Guards in
`POST .../abnahme` real geprüft und korrekt, F-228-Zählung passt. `qa`
NICHT freigegeben, ein kritischer Befund: `REPARIERBARE_SCHRITT_STATUS`
(`public/leitstand/views/workflows.js`) lässt einen ERFOLGREICHEN
Ausführungsschritt absichtlich unangetastet (Lineage-Grund) —
`baueReparaturEntwurf`, der etablierte Reparaturweg, setzt ihn deshalb NIE
automatisch zurück. Reicht ein Vorarbeiter nach ABGELEHNT den vorbelegten
Entwurf unverändert ein, entsteht real KEIN neuer Ausführungslauf: der
Automat hält mit `KLAERUNG_ERFORDERLICH` (Regel 3, ein bereits gelaufener
Schritt startet nicht zweimal), `bezug.ausfuehrung_lauf_id` der alten
Entscheidung bleibt gültig, `GET .../abnahme` zeigt weiter `'ok'` — dieselbe
Sackgasse wie vor der ganzen Nacharbeit, nur unsichtbar, weil Block (g8) den
Reparaturweg selbst nie durchläuft (schreibt die neue `lauf_id` direkt in
die Fixture statt über `baueReparaturEntwurf`/einen echten Laufstart).
Behoben: eine neue Warnung in `ermittleReparaturWarnungen`
(`public/leitstand/views/workflows.js`, F-384-Kommentar dort) macht das
Problem beim Öffnen eines Reparaturentwurfs sichtbar, statt es stillschweigend
offenzulassen — bewusst additiv (keine Änderung an
`REPARIERBARE_SCHRITT_STATUS` selbst, kein Risiko für F-219/F-223/F-240).
Block (g8) und die zugehörigen Kommentare wurden zusätzlich entschärft: sie
behaupten jetzt nur noch, die SERVER-Vergleichslogik über einen echten
HTTP-Dispatch zu belegen (Muster (g5)/(g7)), nicht den realen
Reparaturmechanismus selbst — das war vorher eine Überbehauptung
("echter Reparaturweg"). `npm run check` grün.

Kleiner, unkritischer Zusatzbefund aus demselben QA-Pass (TC-06, außerhalb
des WS-2a-Scopes): fehlt in einer künftigen, strukturell anderen Vorlage der
Schritt mit `rolle: 'ausfuehrung'` ganz, meldet `GET .../abnahme` eine
bestehende Entscheidung als `'veraltet'` (Buttons erscheinen), während
`POST .../abnahme` mit 409 ablehnt ("kein gelaufener Schritt mit rolle
'ausfuehrung'") — inkonsistent, aber nur über eine frei editierte
Reparaturfassung erreichbar und ausdrücklich Nicht-Ziel dieses Auftrags
(„Änderung an workflow-vorlagen/*.json“). Nicht behoben, siehe F-386.

WS-2b (dieser Auftrag) ist gebaut: `POST /api/workflows/<id>/abnahme` bedient
`ergebnis: 'ANPASSUNG_ANGEFORDERT'` (AK21) — Statuspaar wie `ABGELEHNT`
(`ABGESCHLOSSEN`/`KLAERUNG_ERFORDERLICH`, sonst 409), Entscheidungsartefakt
VOR jeder Zustandsänderung, danach EIN Aufruf von
`schreibeWorkflowFortschritt` (`schrittId: null`, Muster Workflow-Stopp) setzt
Ausführungs- und Review-Schritt zurück und hängt die Eingabe-Referenz auf das
Entscheidungsartefakt an den Ausführungsschritt (idempotent, AK23). Anders als
der `ABGELEHNT`-Zweig (der `GESTOPPT` hart schreibt) leitet der Callback die
Workflow-Ebene aus `ermittleNaechstenSchritt`/`workflowStatusZuAusgang` auf der
zurückgesetzten Fassung ab (Muster der Nachbereitung eines Laufs) — der
Ausführungsschritt trägt weiterhin `freigabe: 'ZWINGEND'`, der Workflow landet
deshalb real auf `WARTET_FREIGABE` (AK24): `GESTOPPT` wäre hier die falsche
Sperre, F15 AK7 verlangt ausdrücklich die erteilte Freigabe als einzige
Auflösung eines ZWINGEND-Halts, keine neue Fassung, die ihn umgeht. `GET
.../abnahme` projiziert den Halt additiv als `freigabeHalt` (AK25);
`public/leitstand/views/workflows.js` zeigt dort einen Hinweis auf den Block
„Bedienung" statt der Abnahme-Schaltflächen und aktiviert den ADJUST-Button
(bisher `disabled`, Verweis auf WS-2b). `scripts/check-f15-workflow.mjs`
F-228-Selbsttest auf die zehnte Aufrufstelle des Workflow-Schreibers
nachgezogen (Muster WS-2a). Gate `scripts/check-f23-abnahme.mjs`: der frühere
Rot-Fall (g3) — `ANPASSUNG_ANGEFORDERT` → 400 — ist entfallen (das Ergebnis
wird jetzt bedient), Block (h) neu (AK26). `grenzen.max_replans` bleibt
bewusst UNDURCHGESETZT — F-383 dokumentiert geschlossen (Begründung: siehe
`state/findings.md`, kein Blocker, weil ein ADJUST menschlich ausgelöst und
zwingend freigegeben ist, nicht automatisch wiederholt). `npm run check` grün
(483/483 Tests, alle Gates).

WS-3 (dieser Auftrag) ist gebaut: realer Testlauf mit Stefan im Leitstand,
begleitet im Technical-Challenger-Chat (15.09.2026). Siehe AK27.

### Reviewer-/QA-Pass (frischer Kontext, 14.09.2026)

Beide Pflichtpässe (CLAUDE.md, F-046) liefen VOR dem Commit. Erstdurchlauf
beider: NICHT freigegeben.

`code-reviewer` fand drei kritische Befunde, alle real reproduzierbar und
behoben: (1) `vorlage.standardBudget?.maxBytes ?? Number.POSITIVE_INFINITY`
als Fallback machte `budget_bytes` zu `Infinity` — `Number.isInteger(Infinity)`
ist `false`, die eigene Schemaprüfung schlug dadurch für JEDE Startvorlage
ohne `maxBytes` (vom Typ ausdrücklich erlaubt) fehl, die Registrierung
scheiterte still. Behoben: eigener endlicher `STANDARD_MAX_BYTES`-Fallback
(200 000), Regressionstest ergänzt (`budget_bytes: Infinity` muss
weiterhin scheitern). (2) Alle fünf `git`-Aufrufe liefen ohne
`core.quotePath=false` — Dateinamen mit Umlauten (in diesem deutschsprachigen
Projekt kein Randfall) kamen oktal-escaped und unlesbar an. Behoben:
`-c core.quotePath=false` fest in `leseGitOderNull`, Regressionstest mit
Umlaut-Dateiname ergänzt. (3) `execFileSync` ohne `maxBuffer` ließ einen
sehr großen, aber legitimen `git diff HEAD`-Text die GESAMTE Übersicht
degradieren (auch `dateien`/`stat_text`, die aus den kleinen, unabhängigen
Aufrufen stammen) statt nur `patch` zu kürzen. Behoben: der volle Patch-Text
wird jetzt separat mit eigenem, großzügigerem `maxBuffer` geholt; scheitert
nur er, bleiben `dateien`/`stat_text` erhalten, nur `patch` wird leer mit
`gekuerzt:true`. Zusätzlich als „Verbesserung“ behoben: eine Selbstreferenz
`@<eigeneSchrittId>` löste bei einem Retry still auf die Übersicht des
VORHERIGEN, unabhängigen Versuchs auf — jetzt ein eigener Rot-Fall (b3).

`qa` fand unabhängig überlappende Befunde (Infinity-Fallback, Quoting,
Puffergrenze) plus zusätzlich: AK1/AK4/AK6-Grünfall waren nur über direkte
Funktionsaufrufe belegt, nie über den echten `POST /api/laeufe`-Dispatchpfad
(Muster `scripts/check-f15-automat-real.mjs`). Behoben: Gate-Fälle (c)/(d)
starten einen echten Testserver mit gestubbtem `fuehreAufgabeDurchFn` und
belegen AK1 (`schreibend` + real erfolgreich → Übersicht liegt vor) und AK4
(`lesend` → keine) über den realen Dispatch. Der vermutete Cross-Check-Gap
„Codex mit schreibendem Werkzeugsatz“ (QA-Befund 2) erwies sich als bereits
strukturell verhindert — `loeseAusfuehrungsEingabenAuf`
(`scripts/leitstand-server.mjs`, Ablehnung 9 von 10) lehnt diese Kombination
schon vor jedem Laufstart ab (E-M3-2), unabhängig von F23; kein weiterer
Eingriff nötig.

Bewusst nicht behoben (kleine, benannte Lücke, kein WS-0-Blocker): der
zweite in AK5 genannte Fall „kein Commit unter HEAD“ (Repo initialisiert,
aber leer) hat keinen eigenen Testfall — der Codepfad ist identisch zum
getesteten „kein Repo“-Fall (`git rev-parse HEAD` scheitert in beiden
Fällen gleich).

`npm run check` nach allen Fixes erneut grün (457/457 Tests, alle Gates).

## Ziel

Ein Vorarbeiter kann ein Bau-Ergebnis belegt vorlegen bekommen — eine
maschinell erzeugte Änderungsübersicht des tatsächlichen Diffs plus das
Urteil eines Prüfschritts, der NACH dem Bau läuft, nicht davor — und
entlang dieses Belegs entscheiden: ACCEPT, ADJUST oder REJECT. Bei ADJUST
läuft die Korrektur unter DEMSELBEN Auftrag weiter (kein neuer, unabhängig
verwaister Auftrag für dieselbe Sache). Grundlage: `docs/STATUS.md`
(Meilenstein 4, F23), `state/findings.md` F-350 und F-351.

Über alle Workstreams hinweg schließt F23:

- **F-350** (`TECH_DEBT`, P1, gelöst in WS-1a): das Entscheidungsartefakt
  (`entscheidung_schema: v0`) hat kein JSON-Schema und keinen Validator —
  einziges `*_V0`-Format ohne beides.
- **F-351** (`TECH_DEBT`, P1, gelöst in WS-1b): der Review→Execution-Handoff
  transportiert kein Urteil; es gibt keine Post-Build-Prüfstufe, und ein
  `urteil: BLOCKIERT` hätte selbst dann keine maschinelle Wirkung.

Zusätzlich beim Zuschnitt dieses WS-0-Auftrags real belegt und hier
festgehalten (Auftrag, 14.09.2026):

- **F-376** (gelöst): PlanV1 (12.09.) und der M5-Vermerk (14.09.) sahen
  nach zwei konkurrierenden Bauorten für den Post-Build-Prüfschritt aus —
  geklärt: F23 baut ihn, der M5-Vermerk gilt nur der strategischen
  Vorab-Challenge vor Meilenstein 5, kein Laufzeitmechanismus.
- **F-377** (gelöst in WS-1b): `code-reviewer` läuft in
  `workflow-vorlagen/standard.json`/`hoch.json` heute VOR dem Bau, entgegen
  seinem eigenen Rollenvertrag — sein Urteil wird von niemandem
  ausgewertet.
- **F-378** (offen, in WS-0 strukturell umgangen): kein Werkzeugsatz
  enthält ein lesendes Git/Bash — eine Rolle kann keinen Diff selbst
  ermitteln. Der Kern ermittelt ihn stattdessen selbst.
- **F-379** (gelöst in WS-1a): die fünf inline geschriebenen
  Entscheidungsartefakte in `scripts/leitstand-server.mjs` überluden das
  Feld `ergebnis` mit fünf unabhängigen Wertemengen — durch das neue
  Pflichtfeld `art` getrennt, bevor das Schema (F-350) sie vereinheitlicht
  hätte.

## Nicht-Ziele

- Prioritäts-Override eines Findings/Auftrags — späteres Feature,
  außerhalb F23.
- „Schließen nach Abnahme" (ein Finding/Workitem nach ACCEPT automatisch
  als erledigt markieren) — späteres Feature.
- Änderung an `state/findings.md` durch den Kern — Findings bleiben
  menschlich/Session-gepflegte Prosa, kein Schreibpfad des Kerns dorthin.
- Commit/Push/PR durch den Kern (E-M4-5) — Git bleibt beim Menschen, auch
  wenn der Kern selbst read-only `git diff`/`git status` ausführt (siehe
  Risiken).
- Bash/Git im Werkzeugsatz einer Rolle — die Änderungsübersicht entsteht
  ausschließlich als Kern-Mechanismus (F-378), keine neue Rollenfähigkeit.
- Automatische Erkennung abhängiger Arbeit (welche anderen Workitems von
  einer Änderung betroffen sein könnten) — außerhalb des Scopes.
- Abschwächung der ZWINGEND-Freigabe vor einem schreibenden Schritt
  (E-M3-1 bleibt unverändert) — der Post-Build-Prüfschritt ist ein
  zusätzlicher Halt, kein Ersatz für die bestehende Freigabe davor.
- Änderung an `workflow-vorlagen/*.json` — ausdrücklich WS-1b, in diesem
  Auftrag (WS-0) nicht angefasst; F15-Testfixtures bleiben unberührt.

## Akzeptanzkriterien

- **AK1** Nach einem Lauf mit schreibendem Werkzeugsatz, der real
  `ERFOLGREICH`/`ABGESCHLOSSEN` endet, liegt ein schemavalidiertes
  `aenderungsuebersicht-<laufId>`-Kernartefakt vor.
- **AK2** Eine neu angelegte, nicht committete Datei erscheint in
  `dateien[]` mit `status: NEU`, obwohl `git diff` sie allein nicht zeigen
  würde (`git status --porcelain` zusätzlich ausgewertet).
- **AK3** Der `patch`-Text ist auf `standardBudget.maxBytes` gekappt;
  überschreitet der reale Diff das Budget, steht `gekuerzt: true`.
- **AK4** Ein Lauf mit lesendem Werkzeugsatz erzeugt KEINE
  Änderungsübersicht.
- **AK5** Schlägt die Ermittlung strukturell fehl (kein Git, kein Repo,
  kein Commit unter HEAD), scheitert der auslösende Lauf NICHT deswegen —
  das Artefakt trägt ein leeres `dateien[]` und den Grund in `stat_text`.
- **AK6** Ein Workflow-Schritt kann
  `artefakt:aenderungsuebersicht-@<schrittId>` als Eingabe referenzieren;
  beim Start dieses Schritts wird `@<schrittId>` gegen die reale `lauf_id`
  des benannten Schritts im selben Workflow aufgelöst.
- **AK7** Referenziert ein Schritt eine unbekannte `schritt_id` oder einen
  Schritt ohne `lauf_id` (noch nicht gestartet), startet der
  referenzierende Schritt NICHT — Ablehnung mit klarem Grund, keine
  stillschweigend leere Eingabe.
- **AK8** Gate `scripts/check-f23-abnahme.mjs` (WS-0-Teil) grün: fehlende
  untracked Datei in der Übersicht, unbekannte/nicht gestartete/
  selbstreferenzierende `@<schrittId>`-Referenz je als Rot-Fall, AK1/AK4
  zusätzlich über einen echten `POST /api/laeufe`-Dispatch belegt (nicht nur
  über direkte Funktionsaufrufe); `npm run check` grün.
- **AK9** [WS-1b/WS-2a/WS-2b erfüllt, WS-3 außerhalb dieses Auftrags]
  Post-Build-Prüfschritt mit ausgewertetem Urteil im Automaten (löst
  F-351/F-377, WS-1b: `workflow-vorlagen/*.json` umgebaut,
  `ermittleNaechstenSchritt` Regel 1b, real belegt in
  `scripts/check-f15-automat-real.mjs` Block (h)/(i)); ACCEPT/ADJUST/REJECT
  im Leitstand vollständig erfüllt (ACCEPT/REJECT: WS-2a; ADJUST-Folgefassung
  unter demselben `workflow_id`: WS-2b, siehe AK21-AK26). Feature Review mit
  Stefan bleibt WS-3 (Muster F22 AK8).
- **AK14** [WS-2a] `GET /api/workflows/<id>/abnahme` projiziert in einer
  Antwort: Workflow-Status/-Version, das Urteil des Post-Build-Review-Laufs
  (samt `befunde[]`/`empfehlung`, roh aus dessen Rohstrom über
  `leseUrteilAusLaufakte`), die Änderungsübersicht des Ausführungsschritts
  und eine etwaige bereits vorhandene Abnahme-Entscheidung. Jeder fehlende
  Teil kommt als `null` mit benanntem Grund (z. B. `kein_review_schritt`,
  `noch_nicht_gelaufen`, `nicht_vorhanden`), nie als 500 oder stillschweigend
  leeres Feld — auch nicht bei einer strukturell ungültigen Fassung
  (`schritte` fehlt/kein Array), Muster `GET /api/workflows/<id>`: eine
  ungültige Fassung bleibt ansehbar. Eine vorhandene Entscheidung, deren
  `bezug.ausfuehrung_lauf_id` NICHT der `lauf_id` des aktuellen
  Ausführungsschritts entspricht, kommt als `status: 'veraltet'` statt
  `'ok'` (QA-Pass 15.09.2026, TC-04; korrigierte Nacharbeit 15.09.2026,
  F-384: der Diskriminator ist das beurteilte BAU-ERGEBNIS, NICHT
  `workflow_version` — `version` ist ein Plandatum, kein Fassungszähler,
  der etablierte Reparaturweg reicht bewusst eine Fassung mit
  UNVERÄNDERTER `version` ein) — sonst bliebe der AK16-Reparaturpfad auf
  UI-Ebene eine Sackgasse: die alte Entscheidung stünde nach ABGELEHNT →
  GESTOPPT → Reparaturfassung mit neuem Bau → erneut ABGESCHLOSSEN für
  immer als erledigt da, ohne dass je wieder ACCEPT/REJECT angeboten würde.
- **AK15** `POST /api/workflows/<id>/abnahme` mit `ergebnis: 'ANGENOMMEN'`
  ist nur bei Workflow-Status `ABGESCHLOSSEN` erfolgreich (sonst 409 mit
  Grund) und ändert den Workflow-Status selbst NICHT.
- **AK16** `ergebnis: 'ABGELEHNT'` ist bei Workflow-Status `ABGESCHLOSSEN`
  ODER `KLAERUNG_ERFORDERLICH` erfolgreich und setzt den Workflow auf
  `GESTOPPT` (Muster: der `ABGELEHNT`-Zweig von
  `POST /api/workflows/<id>/freigabe`) — `GESTOPPT` bleibt der
  Reparaturpfad, `GESPERRTE_ERSETZUNGS_STATUS`, `POST /api/workflows` und
  `verarbeiteRouterErgebnis` bleiben unangetastet (Nacharbeit 15.09.2026,
  F-384: ein erster Anlauf, den Reparaturpfad über eine erzwungene
  `version`-Erhöhung abzusichern, wurde verworfen — er brach 25 bestehende
  F15/F22-Tests, weil `version` seit F15 WS-2c bewusst NICHT bei jeder
  Ersetzung steigen muss).
- **AK17** [WS-2a, überholt von AK21 in WS-2b] `ergebnis:
  'ANPASSUNG_ANGEFORDERT'` wurde von diesem Endpunkt mit 400 abgelehnt und
  verwies auf F23 WS-2b — schemagültig laut `EntscheidungAbnahmeV0Daten`,
  aber vom Server noch nicht bedient. Seit WS-2b bedient der Endpunkt das
  Ergebnis (AK21); die 400-Ablehnung selbst ist entfallen.
- **AK18** Das Entscheidungsartefakt (`art: 'abnahme'`, Pflichtfeld
  `bezug: {workflow_version, ausfuehrung_lauf_id, review_lauf_id}`) entsteht
  VOR jeder Zustandsänderung (D2); `begruendung` ist Pflicht (400 ohne sie).
  Eine zweite Entscheidung zu DEMSELBEN `ausfuehrung_lauf_id` wird mit 409
  abgelehnt (QA-Pass 15.09.2026, TC-05) — eine Entscheidung zu einem
  früheren Ausführungslauf blockiert die Abnahme eines neuen, korrigierten
  Baus dagegen nicht (korrigiert in der Nacharbeit 15.09.2026, F-384: NICHT
  `workflow_version`, s. AK14).
- **AK19** Die Workflow-Detailansicht im Leitstand zeigt Änderungsübersicht,
  Urteil (Schwere/Fundstelle/Beleg je Befund, Empfehlung) und bietet
  ACCEPT/REJECT mit Pflichtbegründung, jeweils nur aktiviert, wenn der
  Workflow-Status die Entscheidung überhaupt zulässt (Muster AK15/AK16);
  ADJUST ist sichtbar, aber deaktiviert (Hinweis auf WS-2b). Liegt bereits
  eine AKTUELLE Abnahme-Entscheidung vor (`bezug.ausfuehrung_lauf_id` des
  aktuellen Ausführungsschritts), zeigt die Ansicht sie statt der
  Schaltflächen; eine Entscheidung zu einem früheren Bau wird als solche
  gekennzeichnet und blockiert die Schaltflächen nicht (QA-Pass 15.09.2026,
  TC-04).
- **AK20** Gate `scripts/check-f23-abnahme.mjs` Block (g) (g1-g8) grün:
  ANGENOMMEN auf nicht abgeschlossenem Workflow (409), Abnahme ohne
  Begründung (400), ANPASSUNG_ANGEFORDERT (400), Entscheidungsdaten art
  'abnahme' ohne bezug (Validator), GET auf strukturell ungültiger Fassung
  stürzt nicht ab, ANGENOMMEN- und GET-Grünfälle über einen echten Testserver-
  Dispatch (Muster Block (c)/(d)), und (g8) der volle Reparaturpfad
  ABGELEHNT → Reparaturfassung mit einem echt NEUEN Ausführungslauf →
  erneut ABGESCHLOSSEN → GET zeigt die alte Entscheidung als 'veraltet' →
  ANGENOMMEN gelingt → zweite Entscheidung zu demselben Ausführungslauf
  abgelehnt → eine Fassung OHNE neuen Ausführungslauf lässt 'ok'
  unangetastet (F-384); `npm run check` grün.
- **AK21** [WS-2b] `POST /api/workflows/<id>/abnahme` nimmt `ergebnis:
  'ANPASSUNG_ANGEFORDERT'` an — nur bei Workflow-Status `ABGESCHLOSSEN` oder
  `KLAERUNG_ERFORDERLICH` (sonst 409, dasselbe Statuspaar wie `ABGELEHNT`),
  Pflichtbegründung (Muster AK18), schreibt das Entscheidungsartefakt
  (`art: 'abnahme'`, `bezug`) nach dem ACCEPT/REJECT-Muster VOR jeder
  Zustandsänderung (D2).
- **AK22** [WS-2b] Im selben Vorgang schreibt der Endpunkt über
  `schreibeWorkflowFortschritt` (Aufruf mit `schrittId: null`, Muster
  Workflow-Stopp) eine neue Fassung: Ausführungs- UND Review-Schritt auf
  `status: 'OFFEN'`/`lauf_id: null`, `freigabe_erteilt` entfernt (nicht auf
  `false` gesetzt — Muster `koerperOhneFreigaben` in `POST /api/workflows`),
  `version`/`grenzen` unangetastet. `GESPERRTE_ERSETZUNGS_STATUS` und
  `REPARIERBARE_SCHRITT_STATUS` bleiben unverändert. Die Workflow-Ebene
  (`status`/`aktiver_schritt_id`/`grund`) wird NICHT hart geschrieben
  (anders als beim `ABGELEHNT`-Zweig, der `GESTOPPT` fest setzt), sondern aus
  einem Aufruf von `ermittleNaechstenSchritt` auf der zurückgesetzten
  Fassung abgeleitet (`workflowStatusZuAusgang`, Muster der Nachbereitung
  eines Laufs) — siehe AK24, warum `GESTOPPT` hier die falsche Sperre wäre.
  Die alten `lauf_id`s bleiben in der Vorversion des Workflow-Artefakts
  lesbar (append-only).
- **AK23** [WS-2b] Der Ausführungsschritt der ADJUST-Fassung trägt
  zusätzlich die Eingabe `artefakt:entscheidung-workflow-<id>-abnahme` —
  über eine `includes`-Prüfung idempotent, ein zweiter ADJUST hängt sie
  nicht doppelt an (real geprüft in `scripts/check-f23-abnahme.mjs` Block
  (h4), über AK26 hinaus).
- **AK24** [WS-2b] Nach einem ADJUST startet der Automat KEINEN
  schreibenden Lauf von selbst: der Ausführungsschritt trägt weiterhin
  `freigabe: 'ZWINGEND'` (`workflow-vorlagen/standard.json`), also liefert
  `ermittleNaechstenSchritt` auf der zurückgesetzten Fassung `haltFreigabe`
  und der Workflow landet real auf `WARTET_FREIGABE` (F15 AK7 — die erteilte
  Freigabe bleibt die einzige Auflösung eines ZWINGEND-Halts, eine neue
  Fassung ist keine Umgehung). Erst `POST /api/workflows/<id>/freigabe` mit
  `FREIGEGEBEN` startet den Neubau.
- **AK25** [WS-2b] `GET /api/workflows/<id>/abnahme` projiziert den
  Freigabe-Halt als zusätzliches, additives Feld `freigabeHalt`
  (`{schrittId, grund}` bei Workflow-Status `WARTET_FREIGABE`, sonst
  `null`) — aus der abgelegten Fassung gelesen, kein zweiter Aufruf von
  `ermittleNaechstenSchritt`. `public/leitstand/views/workflows.js` zeigt
  dort einen Hinweis auf den Block „Bedienung" statt der
  ACCEPT/REJECT/ADJUST-Schaltflächen (keine zweite Kopie der
  Freigeben/Ablehnen-Bedienung, D5); der ADJUST-Button selbst ist jetzt
  aktiviert (Statuspaar wie ABGELEHNT, nicht mehr `disabled`). Der
  `'veraltet'`-Fall läuft über den bestehenden
  `ausfuehrung_lauf_id`-Vergleich (F-384) — ein ADJUST setzt den
  Ausführungsschritt auf `lauf_id: null`, eine bestehende Entscheidung wird
  dadurch ohne neuen Code als `'veraltet'` erkannt.
  QA-Pass 15.09.2026 (TC-05, behoben): `freigabeHalt` meldet JEDES
  `WARTET_FREIGABE`, nicht nur eines nach einem ADJUST — derselbe Status
  entsteht ebenso am ganz normalen zweiten ZWINGEND-Schritt vor dem
  allerersten Bau (`workflow-vorlagen/hoch.json` hat zwei ZWINGEND-Schritte
  hintereinander). Der ursprüngliche UI-Text unterstellte fälschlich "Neubau
  nach einer Anpassung"; korrigiert auf einen ursprungsneutralen Hinweis.
- **AK26** [WS-2b] Gate `scripts/check-f23-abnahme.mjs` Block (h) grün:
  ADJUST ohne Begründung → 400 (h1), ADJUST bei unzulässigem
  Workflow-Status → 409 (h2), ein Grünfall über echten HTTP-Dispatch (h3:
  `ABGESCHLOSSEN` → ADJUST → beide Schritte zurückgesetzt → real
  `WARTET_FREIGABE` → `GET .../abnahme` meldet `freigabeHalt` und
  `entscheidung.status: 'veraltet'`, `grenzen` UND `version` vorher/nachher
  byte-gleich — Nachtrag Verifikation 15.09.2026, F-390: die
  `version`-Prüfung fehlte ursprünglich, obwohl AK22 sie ausdrücklich
  verlangt),
  zusätzlich (h4, über AK26 hinaus) die AK23-Idempotenz und (h5,
  QA-Pass 15.09.2026, TC-06, über AK26 hinaus) ADJUST aus
  `KLAERUNG_ERFORDERLICH` mit `aktiver_schritt_id` auf dem Review- statt
  dem Ausführungsschritt (realer Ursprung: ein `BLOCKIERT`-Urteil, Regel
  1b) — belegt, dass der ADJUST-Zweig den Cursor korrekt auf den
  Ausführungsschritt überschreibt; `npm run check` grün (483/483 Tests,
  alle Gates).
  Verifikation 15.09.2026 fand zusätzlich F-389 (offen, P2): der ADJUST-Zweig
  übernimmt `workflowStatusZuAusgang`s vollen Wertebereich, auch 'LAEUFT' für
  den Ausgang 'starte' — heute strukturell unerreichbar (beide Vorlagen
  tragen `freigabe: 'ZWINGEND'` am Ausführungsschritt), aber ohne eigene
  Behandlung, falls die ZWINGEND-Pflicht künftig bezeugt zurückgenommen wird
  (F-226). Kein WS-2b-Blocker, siehe `state/findings.md`.
- **AK27** [WS-3] Feature Review mit Stefan als realer Testlauf im Leitstand
  (kein Gate-Fixture), begleitet im Technical-Challenger-Chat, 15.09.2026 —
  Beleg für AK14/AK15/AK18/AK19 (WS-2a) und AK21-AK25 (WS-2b) am echten
  System:
  - Finding F-265 im Workboard über "Bearbeiten" geroutet (Click-to-Work).
  - Erster Router-Lauf scheiterte real mit "Klassifikationstext ist kein
    gültiges JSON" — Ursache: Server lief mit der Standard-Startvorlage
    (`startvorlagen/beispielprojekt.json`, kein `worker.codex`-Block), Router
    fiel auf den claude-code-Rückfall zurück und verließ die Rollenvorgabe
    vollständig (Freitext-Agentenverhalten statt JSON) — derselbe Mechanismus
    wie F-373, ausgelöst durch fehlende `LEITSTAND_STARTVORLAGE_PFAD` beim
    Serverstart. Festgehalten als F-391.
  - Nach Neustart mit
    `LEITSTAND_STARTVORLAGE_PFAD=startvorlagen/ai-workforce.json` und
    "Wiederholen": Router lief erfolgreich, wählte die Fast-Lane-Vorlage
    (ein Schritt, kein Post-Build-Review) für den neuen Auftrag
    `d45f7901-58c7-4808-a19b-5cba1d74bf45`. `GET .../abnahme` meldete dabei
    korrekt "keinen Post-Build-Review-Schritt" statt 500 oder leer (AK14 real
    belegt).
  - Bau lief real durch, Ausführungsschritt ERFOLGREICH, änderte real
    `scripts/leitstand-server.mjs` (behebt dabei F-265 selbst, s. dort).
  - Abnahme-Block real geprüft: Änderungsübersicht sichtbar, Annehmen/
    Ablehnen/Anpassung-anfordern aktiv (AK19).
  - "Anpassung anfordern" mit Begründung → Workflow real auf
    `WARTET_FREIGABE`, alte Entscheidung als "bezieht sich auf eine frühere
    Fassung" markiert (AK14), KEIN automatischer Neustart (AK24 real belegt).
  - Freigabe erteilt → neuer Lauf (andere `lauf_id`) startete real,
    Ausführungsschritt wurde real zurückgesetzt und neu gebaut (AK22/AK23
    real belegt), `version` unverändert, Artefaktkette gewachsen (AK22).
  - Nach erneutem ABGESCHLOSSEN: "Annehmen" mit Begründung → Workflow-Status
    blieb ABGESCHLOSSEN (AK15 real belegt).
  - REJECT wurde in diesem Realtest NICHT zusätzlich live getestet
    (Entscheidung: ausreichend über Gate (g8) mit echtem Dispatch und die
    F-384-Nacharbeitsrunden abgedeckt).
  Zusätzlich real gefunden: F-391 (`HARNESS_IMPROVEMENT`, P2, offen —
  Standard-Startvorlage ohne `codex`) und F-392 (`PROCESS_IMPROVEMENT`, P3,
  offen — Nav-Link "Runs" nennt den Workflow-/Abnahme-Bereich nicht). Beide
  kein F23-Blocker, siehe `state/findings.md`.

## Dependencies

F22 (Status `FEATURE_GATE` — erfüllt, liefert den Auftrag/Workflow, auf dem
die Abnahme aufsetzt). Blockiert F30 (Self-/Team-Dogfooding,
Meilenstein-Gate, `docs/STATUS.md`).

## Workstreams

- **WS-0** (gebaut): Änderungsübersicht als Kernartefakt — Schema,
  Ermittlung (rein lesend über `git` gegen die Repo-Wurzel), Registrierung
  nach einem real erfolgreichen schreibenden Lauf, Eingabe-Platzhalter
  `@<schrittId>`, Gate.
- **WS-1a** (dieser Auftrag, gebaut): Entscheidungs-Schema + Validator
  (löst F-350, dabei F-379s fünf `ergebnis`-Familien über das neue
  Pflichtfeld `art` auseinandergezogen).
- **WS-1b** (gebaut): Vorlagen-Umbau (Post-Build-Prüfschritt in den
  Workflow-Vorlagen) und Urteilsauswertung im Automaten (löst F-351/F-377).
- **WS-2a** (dieser Auftrag, gebaut): Abnahme-Lesepfad (`GET
  /api/workflows/<id>/abnahme`), -Schreibstelle (`POST` mit ACCEPT/REJECT
  als Entscheidungsartefakt `art: abnahme`) und -View im Leitstand
  (ACCEPT/REJECT bedienbar, ADJUST sichtbar/deaktiviert).
- **WS-2b** (dieser Auftrag, gebaut): ANPASSUNG_ANGEFORDERT bedienbar
  gemacht, ADJUST-Folgefassung unter demselben `workflow_id`, Projektion
  des F15-Freigabehalts (F15 AK7) in die Abnahme-Ansicht, `grenzen.max_replans`
  bewusst NICHT durchgesetzt (F-383, dokumentiert entschieden).
- **WS-3** (gebaut, real getestet): Feature Review mit Stefan (realer
  Testlauf, Muster F22 AK8).

## Risiken

Kein Werkzeugsatz enthält ein lesendes Git/Bash (`startvorlagen/*.json`,
F-378) — eine Rolle kann einen Diff strukturell nicht selbst ermitteln.
WS-0 umgeht das, indem der KERN (nicht eine Rolle) die Änderungsübersicht
über einen eigenen, rein lesenden `git`-Kindprozess ermittelt
(`src/aenderungsuebersicht/index.ts`) — dasselbe Muster, mit dem
`src/authorization-boundary/index.ts` (`leseAusCommit`, F3) bereits einen
lesenden `git`-Kindprozess aus dem Kern heraus startet. Vor dem Bau
geprüft: das verstößt NICHT gegen `src/invocation-policy/` oder
`src/authorization-boundary/` — AC8 des Invocation-Policy-Moduls verbietet
ausschließlich DIESEM Modul selbst, einen Werkzeugprozess zu starten (F4
stellt nur fest, ob ein Start erlaubt wäre); dieses Modul ist kein
Bestandteil von F3/F4 und startet keinen Ausführungswerkzeug-Prozess,
sondern liest read-only, ohne jede Schreibwirkung auf das Repository. Kein
Blocker, kein Umgehen einer Schutzschicht — kein Aufruf wählt eine
schwächere Form eines bestehenden Schutzes ab (ARCHITECTURE.md §7).

Rename-/Umbenennungs-Erkennung (`git diff -M`) wird über zwei getrennte
git-Aufrufe (`--name-status`, `--numstat`) und Zusammenführung über den
Dateiindex gelöst, statt `--numstat`s eigenes `{alt => neu}`-Pfadformat zu
parsen — ausreichend robust für WS-0, aber nicht geprüft gegen exotische
Rename-Fälle mit gleichzeitiger Inhaltsänderung UND identischem
Zeilenzahl-Delta an mehreren Dateien im selben Diff (theoretisches
Fehlzuordnungsrisiko bei der Index-Zuordnung). Kein bekannter realer
Auftrittsfall, deshalb kein WS-0-Blocker.

`basis_ref` ist im Schema `string | null` statt eines reinen Strings
(Abweichung vom Bauauftragstext "basis_ref (HEAD-SHA)") — bewusst, weil ein
Fehlschlag der Ermittlung (AK5, kein Repo/kein Commit) sonst kein
schemagültiges Artefakt mehr erzeugen könnte. Dokumentiert statt
stillschweigend entschieden (CLAUDE.md, Entscheidungsregel bei
Unsicherheit, Punkt 5).
