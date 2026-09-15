# F23 — Abnahme + ADJUST-Loop

## ID

F23

## Titel

Abnahme + ADJUST-Loop (Entscheidungs-Schema, Post-Build-Prüfschritt,
BLOCKIERT-Wirkung, Folge-Workflow)

## Status

Status: IN_ARBEIT

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
und WS-2/WS-3 sind noch nicht begonnen.

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
- **AK9** [WS-1b erfüllt, WS-2/WS-3 außerhalb dieses Auftrags]
  Post-Build-Prüfschritt mit ausgewertetem Urteil im Automaten (löst
  F-351/F-377, WS-1b: `workflow-vorlagen/*.json` umgebaut,
  `ermittleNaechstenSchritt` Regel 1b, real belegt in
  `scripts/check-f15-automat-real.mjs` Block (h)/(i)); `BLOCKIERT`-Wirkung,
  ACCEPT/ADJUST/REJECT im Leitstand, ADJUST-Folgeworkflow unter demselben
  Auftrag, Feature Review mit Stefan bleiben WS-2/WS-3 (Muster F22 AK8).

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
- **WS-2**: Abnahme-View im Leitstand — ACCEPT/ADJUST/REJECT als
  Entscheidungsartefakt (`art: abnahme`), `BLOCKIERT`-Wirkung,
  ADJUST-Folgeworkflow unter demselben Auftrag.
- **WS-3**: Feature Review mit Stefan (realer Testlauf, Muster F22 AK8).

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
