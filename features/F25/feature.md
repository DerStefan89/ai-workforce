# F25 — Projekte v1

## ID
F25

## Titel
Projektregister, Handler-Instanzen, cwd-Threading (WS-1); Projekte-
Übersicht, Kontext-Kopfzeile, Projekt-Workspace-Umschaltung (WS-2a)

## Status
Status: FEATURE_GATE

Gültige Status-Werte (geprüft vom Gate): ENTWURF, READY_FOR_TECH, WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN, BLOCKIERT, ABGEBROCHEN.

## Ziel
Mehrere Projekte (Repos) werden über ein Register bekannt gemacht; je
Registereintrag entsteht eine eigene `erzeugeRequestHandler`-Instanz mit
eigenem `basisVerzeichnis`, eigener Startvorlage und eigener, real
gesetzter Arbeitsverzeichnis-Wurzel für den Claude-Code-Kindprozess
(`execFile`-natives `cwd`). WS-1 liefert Register, Schema, Handler-
Instanzen und die D13-Umstellung von "ein aktiver Lauf je Instanz" auf
"ein aktiver Lauf je Workforce-Gesamtinstanz über alle Projekte" — ohne
Views, ohne Import-Wizard, ohne Health-Projektion (spätere WS-2/WS-3).
WS-2a baut darauf auf: eine Projekte-Übersicht macht das Register im
Leitstand sichtbar und bedienbar — ein Klick wählt das aktive Projekt für
die gesamte bestehende Oberfläche (Workboard, Runs, Capabilities,
Projekt/Auftrag & Start, Workflows, Attention), ohne dass eine dieser
Views selbst geändert werden musste (WS-1s Handler-Trennung macht das
möglich).

## Nicht-Ziele
- Import-Wizard, Health-Projektion (WS-2b/WS-3).
- Bootstrap-Automatik für eine fehlende Fremd-Repo-Baseline
  (`.claude/settings.json` / `state/aktuelle-autorisierung.json`) — Option B,
  siehe "Bekannte Grenzen".
- Roadmap-Erzeugung, parallele Läufe je Projekt.

## Workstreams
- WS-1 — Register, Schema, Handler-Instanzen, cwd-Threading, D13-Umstellung
  auf globalen Zustand. **FEATURE_GATE** (AK1-AK9 erfüllt, siehe unten).
- WS-2a — Projekte-Übersicht, Kontext-Kopfzeile, Projekt-Workspace-
  Umschaltung. **FEATURE_GATE** (AK10-AK16 erfüllt, siehe unten).

## Akzeptanzkriterien

- AK1 `schemas/projekte.schema.json` neu, `additionalProperties: false`.
  Eintrag = `{ id, name, repo_pfad, startvorlage_pfad, profil_pfad,
  basisverzeichnis, status }`. `status` ∈ `IDEE|DISCOVERY|GEPLANT|
  IN_ENTWICKLUNG|TEST|NUTZBAR|BETRIEB|PAUSIERT|ARCHIVIERT`, manuell
  gepflegt (Muster `freigabe` in F19). `projekte.json` im Repo-Root mit
  genau einem Starteintrag: `id: 'ai-workforce'`, `repo_pfad: '.'`,
  `basisverzeichnis: 'kontrollzustand'` — das heutige Standardprojekt wird
  zum ersten Registereintrag, kein Sonderfall.

- AK2 Server erzeugt je Registereintrag eine eigene
  `erzeugeRequestHandler`-Instanz mit eigenem `basisVerzeichnis`,
  `startvorlagePfad`, `repoWurzel` (= `repo_pfad`, absolut aufgelöst). Neue
  Routen `/api/projekte/<id>/…`. Der bestehende `/api/…`-Pfad bleibt
  zusätzlich für `ai-workforce` erhalten — kein bestehendes F10-F24-Gate
  darf sich ändern müssen.

- AK3 `StarterOptionen` (`src/claude-code-gateway/types.ts`) bekommt
  optionales `cwd?: string`, durchgereicht bis `echterStarter`s
  `execFile`-Aufruf (`src/claude-code-gateway/prozessstart.ts`) als
  natives `execFile`-`cwd` — kein `process.chdir()`, kein Shell. Fehlt das
  Feld: unverändertes Verhalten (`process.cwd()`), bestehende
  Aufrufer/Tests bleiben unberührt. `erzeugeRequestHandler` befüllt es
  projektspezifisch mit dem eigenen `repoWurzel`.

- AK4 `erzeugeRequestHandler` reicht `settingsPfad` und
  `aktuelleAutorisierungPfad` (beide bereits heute überschreibbare
  Parameter in `starteGateway`/dessen Optionen,
  `src/claude-code-gateway/index.ts:139,263`) projektspezifisch relativ
  zum jeweiligen `repoWurzel` durch, statt `process.cwd()`-Default.

- AK5 Instanz-Lock je `basisverzeichnis` (bestehender Lock-Mechanismus,
  parametrisiert statt fest verdrahtet) ZUSÄTZLICH zu einem GLOBALEN
  `laufAktiv`-Zustand über alle Projekt-Instanzen hinweg (D13: genau ein
  aktiver Arbeitsstrang je Workforce-Instanz über alle Projekte, E-M4-2 —
  nicht je Projekt).

- AK6 (Option B, explizit dokumentiert statt stillschweigend übergangen)
  Ein Fremd-Repo ohne eigenes `.claude/settings.json` oder
  `state/aktuelle-autorisierung.json` wird von `starteGateway` unverändert
  fail-closed abgelehnt. Kein Bootstrap-Automatismus in diesem Auftrag. In
  "Bekannte Grenzen" festgehalten: Import v1 (später) erzeugt keine
  Baseline; ein importiertes Repo ohne eigene Baseline bleibt blockiert
  bis von Hand nachgerüstet.

- AK7 Bestehende `repoWurzel`-Parameter-Konsumenten (`waehleWorkflowVorlage`,
  `loeseRessourcenAuf`, u. a.) laufen für `ai-workforce` unverändert
  weiter — kein bestehender Test darf angepasst werden müssen. Falls eine
  Vereinheitlichung mehr Schaden als Nutzen bringt: abbrechen, als Befund
  melden statt erzwingen.

- AK8 (Realer Test) Zwei Projekte real angelegt: `ai-workforce` + ein
  zweites, echtes lokales Repo mit von Hand vorbereiteter Mini-Baseline
  (`.claude/settings.json` + `state/aktuelle-autorisierung.json`, z. B.
  aus `ai-workforce` kopiert und angepasst). Ein lesender Lauf real über
  `/api/projekte/<id-b>/laeufe` gestartet, liest eine nur im zweiten Repo
  vorhandene Datei korrekt. Während dieser Lauf aktiv ist, wird ein
  Lauf-Versuch in Projekt `ai-workforce` real mit D13-Grund abgelehnt.

- AK9 Gate `scripts/check-f25-projekte.mjs`, kalibriert mit mindestens
  einem Rot-Fall (z. B. `cwd` nicht gesetzt/falsch aufgelöst → Test
  schlägt sichtbar fehl, dann korrigiert → grün — Muster
  `check-f21-workboard.mjs`).

### WS-2a — Projekte-Übersicht, Kontext-Kopfzeile, Projekt-Workspace-Umschaltung

- AK10 `public/leitstand/api.js` bekommt einen settbaren Basis-Präfix
  (Modul-Variable `aktivesProjektPraefix`, Default `'/api'` — entspricht
  dem bisherigen hartkodierten Literal, Regressionsschutz für
  `ai-workforce`). Jeder bestehende Endpunkt außer `holeProjekte` geht
  seither durch `mitPraefix(restPfad)`, wobei `restPfad` KEIN eigenes
  `/api` mehr trägt (`erzeugeMultiProjektDispatcher`, WS-1, setzt selbst
  ein `/api` vor den Rest nach der Projekt-id — ein mitgeführtes zweites
  `/api` ergäbe `/api/api/...` und liefe ins Leere, real im AK6-
  Browser-Realtest gefunden und behoben, `features/F25/nachweis-ws2a.md`).

- AK11 Neuer Lese-Endpunkt `GET /api/projekte` im bestehenden
  `defaultHandler` (unpräfigiert, `scripts/leitstand-server.mjs`):
  liefert `projekte.json`-Inhalt plus je Eintrag `laufAktiv:boolean`,
  abgeleitet aus dem bereits vorhandenen `globalerLaufZustand` (kein
  neuer State) — ein Eintrag gilt als `laufAktiv`, wenn der global aktive
  Lauf ein Checkpoint-Verzeichnis unter GENAU diesem Eintrags-
  `basisVerzeichnis` hat (`existsSync`, Muster des bestehenden
  Lauf-Existenz-Checks in `GET /api/laeufe/<laufId>`).

- AK12 Neue Route `#/projekte-uebersicht`, neue View
  `public/leitstand/views/projekte-uebersicht.js` (Muster
  `views/capabilities.js`): Karten je Registereintrag aus
  `GET /api/projekte` — id, name, status, "aktiver Lauf: ja/nein".
  Explizit KEINE Health-Spalte/-Badge (WS-3, nicht dieser Auftrag).

- AK13 Klick auf eine Karte setzt den aktiven Projekt-Kontext
  (`public/leitstand/projekt-kontext.js`, `setzeAktivesProjekt`): für
  `ai-workforce` Präfix `/api` (Default, unverändert), sonst
  `/api/projekte/<id>`; navigiert danach zur bestehenden
  Dashboard-Route. Ab dann arbeiten alle bestehenden Views (Workboard,
  Runs, Capabilities, Projekt/Auftrag & Start, Workflows, Attention)
  unverändert gegen das gewählte Projekt (AK10 macht das möglich, keine
  Änderung an den View-Dateien selbst nötig).

- AK14 Kontext-Anzeige in der Kopfzeile (`public/leitstand/
  projekt-kontext.js`, `renderProjektKontext`): aktives Projekt sichtbar,
  Bedienung zurück zur Projekte-Übersicht (`#projekt-kontext` in
  `index.html`, additive Ergänzung der bestehenden Shell, kein neues
  Layout-System — ein `<button>`, Muster der übrigen
  Navigations-Bedienungen im Leitstand, z. B. "Zum Workboard" in
  `views/capabilities.js`, kein `<a>`). Der aktive Kontext übersteht
  zusätzlich einen Seiten-Reload (`sessionStorage`, QA-Befund 17.09.2026
  — siehe "Bekannte Grenzen" und `features/F25/nachweis-ws2a.md`).

- AK15 (Realer Test) Zwei Registereinträge real im Browser genutzt
  (`ai-workforce` + `f25-testprojekt-b` aus dem WS-1-Realtest
  wiederverwendet). Beide Karten sichtbar, Wechsel zwischen beiden zeigt
  in Workboard/Runs jeweils den richtigen, getrennten Kontrollzustand —
  echter headless-Chrome-Lauf mit Screenshots,
  `features/F25/nachweis-ws2a.md`. Fand dabei real den unter AK10
  beschriebenen Präfix-Bug (Rot-Fall), der von keinem vorher gelaufenen
  Gate gefangen worden wäre.

- AK16 Gate-Erweiterung in `scripts/check-f25-projekte.mjs` (nicht ein
  neues Skript, YAGNI): `GET /api/projekte` real gegen HTTP geprüft
  (inkl. `laufAktiv` während eines echten, mit einer echten
  `run_prepared`-Wirkungsmarke kalibrierten Testlaufs — Abschnitt (5)),
  `api.js`s Präfixwechsel mit einem isolierten Unit-Test ohne Server
  (Abschnitt (6)) PLUS einem echten Dispatcher-Ende-zu-Ende-Test
  (Abschnitt (7) — schließt die Lücke, die (6) allein beim AK10-Bug
  offen ließ, siehe `features/F25/nachweis-ws2a.md`).

## Dependencies
- F10 — Leitstand-Schreibpfad (`erzeugeRequestHandler`,
  `scripts/leitstand-server.mjs`), dessen bestehende
  Optionen-/Routing-Fabrik F25 mehrfach instanziiert statt neu zu bauen.
- F14 — Timeout und Abbruch (`VERBOTENE_OPTIONEN_FELDER`,
  `AusfuehrungsOptionen`-Sperre), deren Muster ein neues `cwd`-Feld
  gegebenenfalls nachzieht, falls es je aus einem Body lesbar werden
  könnte (WS-1 sieht das nicht vor — `cwd` ist ausschließlich
  serverseitig aus dem Registereintrag gesetzt, nie Body-Feld).
- F15 — Workflow-Artefakt und Schritt-Automat
  (`scripts/check-f15-instanzlock.mjs`, `belegeInstanzLock`), dessen
  bereits nach `basisVerzeichnis` parametrisierter Instanz-Lock WS-1 auf
  mehrere Instanzen ausweitet.
- F20 — Jarvis Shell v1 (`public/leitstand/router.js`, `app.js`,
  `zustand.js`), deren Hash-Router und EIN-Poll-Timer-Muster WS-2a
  unverändert übernimmt (neue View registriert sich selbst, Muster
  `views/capabilities.js`; kein zweiter Poll-Timer).

## Betroffene Primitive
`erzeugeRequestHandler`, `starteGateway`, `StarterOptionen`/`echterStarter`,
`belegeInstanzLock`, D13-Zustand (`laufAktiv`), `schemas/projekte.schema.json`,
`projekte.json`, `public/leitstand/api.js` (`mitPraefix`,
`setzeAktivesProjektPraefix`), `public/leitstand/projekt-kontext.js`
(neu, WS-2a).

## Risiken
Ein globaler statt instanzlokaler `laufAktiv`-Zustand über mehrere
Handler-Instanzen hinweg ist ein Architekturwechsel gegenüber dem heutigen
Closure-Muster (AK5) — Advisor-Pass vor dem Bau vorgesehen. Ein
projektspezifisches `cwd` im Execution-Pfad berührt den Kindprozessstart
(`echterStarter`) direkt; Fehler dort wirken sich auf jedes Projekt aus,
inklusive `ai-workforce` selbst.

## Bekannte Grenzen (dokumentiert statt stillschweigend übergangen — CLAUDE.md-Entscheidungsregel 5)
- Option B (Stefan, 17.09.2026): Ein importiertes/registriertes Fremd-Repo
  ohne eigene `.claude/settings.json`/`state/aktuelle-autorisierung.json`
  bleibt fail-closed blockiert. Kein Bootstrap-Automatismus in F25 v1. Ein
  künftiger Import-Wizard (nicht Teil dieses Auftrags) erzeugt keine
  Baseline von selbst — muss von Hand nachgerüstet werden.
- `istUebrigeFelder.arbeitsverzeichnis_pfad` im F4-Gültigkeitsschlüssel
  (`src/claude-code-gateway/index.ts`) bleibt für JEDES Projekt am
  `process.cwd()` des Serverprozesses hängen, nicht am projektspezifischen
  `cwd`/`repoWurzel` (AK7-Entscheidung: kein bestehender Vergleichswert für
  `ai-workforce` durfte sich ändern). Ein Fremdprojekt, dessen
  `state/aktuelle-autorisierung.json` NICHT byte-identisch aus
  `ai-workforce` kopiert, sondern sachlich korrekt an seinen eigenen Pfad
  angepasst wird, bekommt dadurch eine für den Betreiber zunächst
  unerklärliche E-188-"Drift"-Ablehnung (`arbeitsverzeichnis_pfad` weicht
  ab). QA-Befund, 17.09.2026 — real nur deshalb nicht in AK8 aufgetreten,
  weil dort bewusst eine 1:1-Kopie verwendet wurde. Behoben werden könnte
  das nur durch eine echte projektspezifische `arbeitsverzeichnis_pfad`-
  Auflösung, die zugleich `ai-workforce`s eigenen, bereits authorisierten
  Wert unverändert lassen müsste — bewusst nicht in WS-1 angegangen.
- (Behoben während des Reviews, nicht mehr offen, hier als Nachtrag
  festgehalten:) Ein Registereintrag mit `repo_pfad: '.'` (repoWurzel
  identisch mit der des Serverprozesses) bekam ursprünglich eine ZWEITE,
  vom bestehenden Default-Pfad unabhängige `erzeugeRequestHandler`-Instanz
  — beide bezeichnen dasselbe reale Projekt, hatten aber getrennten
  In-Memory-Zustand (`laufAktiv`, `startfehlerListe`). QA-Befund,
  17.09.2026, gelöst über `baueProjektHandlerMap`s neue
  `selbstRepoWurzel`/`selbstHandler`-Option (Wiederverwendung statt
  Zweitinstanz), Gate-Abschnitt (2e).
- (WS-2a) AK11s `laufAktiv`-Projektion liest den Checkpoint-Ordner des
  global aktiven Laufs vom Dateisystem (`existsSync`) statt ein neues
  In-Memory-Feld zu führen (AK11-Entscheidung: "kein neuer State"). Ein
  real gestarteter Lauf schreibt seine erste `run_prepared`-Wirkungsmarke
  nicht synchron beim Start, sondern erst innerhalb des F6a/F1B-Pfads
  (dieselbe, bereits an anderer Stelle dokumentierte Verzögerung wie bei
  `angenommeneLaufIds`, F11 WS-2) — zwischen dem Setzen des global
  aktiven Zustands und dem tatsächlichen Erscheinen des
  Checkpoint-Ordners liegt deshalb ein kurzes Fenster, in dem
  `GET /api/projekte` für den betroffenen Eintrag `laufAktiv:false`
  liefert, obwohl der Lauf bereits als aktiv zählt (D13 sperrt trotzdem
  korrekt — nur die Projekt-Zuordnung in der Übersicht hinkt kurz
  hinterher). Bewusst nicht in WS-2a behoben: eine echte Lösung bräuchte
  ein neues `projektId`-Feld in `globalerLaufZustand`, was der
  AK11-Vorgabe widerspräche.
- (WS-2a, Code-Review-Befund 17.09.2026) `GET /api/projekte` (AK11) liegt
  in derselben `requestHandler`-Funktion, die auch jede Projekt-Instanz
  baut — ein Aufruf GEGEN eine Projekt-Instanz
  (`/api/projekte/<id>/projekte`) trifft denselben Zweig und antwortet
  `200 {"projekte":[]}` statt `404`, weil `baueProjektHandlerMap` die
  `projekte`-Liste nicht an Projekt-Instanzen durchreicht (Default `[]`).
  Ungefährlich im Produktivpfad (`api.js`s `holeProjekte()` ruft diesen
  Endpunkt bewusst NIE präfigiert auf, AK11/AK13-Entscheidung), aber
  ungeprüft — kein Gate-Abschnitt belegt dieses Verhalten. Bewusst nicht
  in WS-2a mit einem eigenen Gate-Assert abgesichert (kein realer
  Aufrufer trifft diesen Pfad).
- (WS-2a, QA-Befund 17.09.2026) Die meisten lesenden `api.js`-GET-Wrapper
  (`holeZustand`, `holeLaeufe`, `holeStartfehler`, `holeAuftraege`,
  `holeWorkflows`, `holeWorkitems`, `holeWerkzeugsaetze`) prüfen
  `antwort.ok` nicht, sondern reichen `.then(r => r.json())` direkt
  weiter (bestehendes Muster aus F10-F24, nicht WS-2a-spezifisch
  eingeführt). Ein Aufruf gegen ein registriertes, aber handler-seitig
  fehlgeschlagenes Projekt (siehe QA-Befund oben zu
  `baueProjektHandlerMap`, Gate-Abschnitt 2d) liefert deshalb für jede
  dieser Funktionen einen 404-Körper, der unbemerkt als "gültiges"
  Datenaggregat durchgereicht wird — stiller UI-Ausfall statt einer
  sichtbaren Fehlermeldung. Bewusst NICHT in WS-2a breit behoben: das
  berührt praktisch jeden lesenden Endpunkt aus vier vorherigen
  Features, nicht nur die WS-2a-Neuerungen — eine echte Lösung wäre eine
  eigene Iteration (einheitliche `r.ok`-Prüfung über alle GET-Wrapper,
  mit Konsequenzen für jede aufrufende View). Der eine tatsächlich in
  WS-2a gefundene Teilaspekt (Feldnamen-Mismatch `fehler` statt `grund`
  in `erzeugeMultiProjektDispatcher`s 404-Antwort, der selbst den einen
  ok-prüfenden Schreibpfad nur unspezifisch scheitern ließ) ist behoben.

## Feature Review
Advisor-Pass vor dem Bau (`state/plan-v1-f25-ws1-projektregister.md` →
`state/advisor-findings-f25-ws1-projektregister.md`, Urteil: Nicht
freigegeben — zwei Hochbefunde) → `state/plan-v2-f25-ws1-projektregister.md`
löst beide auf: (a) D13 additiv statt per Rename gelöst (lokale
`laufAktiv`-Literale bleiben unverändert stehen, ein zusätzlicher, echt
geteilter `globalerLaufZustand` wird parallel geprüft/gesetzt/
zurückgesetzt — `check-f11-auftrag.mjs`s Quelltext-Vertragsprüfung bleibt
unverändert grün); (b) `cwd` zusätzlich durch `CodexGatewayOptionen`/
`starteCodexGateway` gefädelt, nicht nur den Claude-Code-Pfad.

Realer AK8-Test (`features/F25/nachweis-ws1.md`) fand einen echten Bug, den
kein gemocktes Gate gefunden hätte: `starteProzess` verlor `cwd` beim Bau
von `starterOptionen` (benannte Feldliste statt Spread) — der erste reale
Lauf gegen ein zweites Projekt las dadurch tatsächlich in ai-workforce statt
im registrierten Projekt. Behoben, mit einem neuen, gezielten Gate-Abschnitt
(2c) direkt an der Fundstelle kalibriert (`state/findings.md` F-415,
gelöst). Zusätzlich real gefunden: `rohBasisVerzeichnis` ist nicht
projektspezifisch (F-416, offen, P3, bewusst nicht in WS-1 behoben — rein
diagnostischer, gitignorierter Rohstrom, kein Kontrollzustand).

Reviewer-/QA-Pass (frischer Kontext, F-046): Reviewer freigegeben mit
Hinweisen (Kopfkommentar-Verweis auf ein nie angelegtes
`src/projekte/projekte.test.ts` korrigiert). QA zunächst nicht freigegeben:
(1) **kritisch** — ein schema-gültiger, aber praktisch kaputter
Registereintrag (fehlende Startvorlage) ließ `baueProjektHandlerMap`
synchron werfen und riss den gesamten Serverstart mit, auch für
`ai-workforce` selbst; behoben mit try/catch je Eintrag (ein kaputter
Eintrag fehlt danach nur in der Map, 404 für seine `id`), Gate-Abschnitt
(2d). (2) **hoch** — der Starteintrag `ai-workforce` (`repo_pfad: '.'`)
und der bestehende Default-Pfad bauten zwei unabhängige Handler-Instanzen
mit getrenntem `laufAktiv`/`startfehlerListe` für dasselbe reale Projekt
("Doppel-Tür"-Problem: über die eine Tür gestarteter Lauf über die andere
weder abbrechbar noch als aktiv sichtbar); behoben über
`baueProjektHandlerMap`s neue `selbstRepoWurzel`/`selbstHandler`-Option
(Wiederverwendung statt Zweitinstanz), Gate-Abschnitt (2e). (3) mittel —
`arbeitsverzeichnis_pfad`-Konsequenz für sachlich korrekt (nicht
byte-kopiert) eingerichtete Fremdprojekte war nicht in "Bekannte Grenzen"
dokumentiert — nachgetragen. (4) mittel/gering — doppeltes
`basisverzeichnis` zweier Projekte wurde weder erkannt noch gewarnt;
`baueProjektHandlerMap` protokolliert das jetzt beim Bau. Alle vier
Befunde behoben bzw. dokumentiert, `npm run check` danach erneut grün
bestätigt (528 Tests).

`npm run check` grün (528 Tests, alle Gates inkl. neuem
`scripts/check-f25-projekte.mjs`). Realer Zwei-Projekte-Nachweis: Dispatcher-
Isolation, cwd-Ende-zu-Ende bis zum tatsächlich gelesenen, nur in Projekt B
existierenden Dateiinhalt, projektübergreifende D13-Sperre (409 während ein
Fremdprojekt-Lauf aktiv ist) — alle real über HTTP gegen einen echten
Leitstand-Prozess mit echten Claude-Code-Kindprozessen belegt, nicht über
Selbstauskunft.

### WS-2a Feature Review

Realer AK15-Browser-Test (`features/F25/nachweis-ws2a.md`, echter
headless Chrome über CDP, echter Leitstand-Prozess mit zwei
Registereinträgen) fand einen echten Bug, den kein Gate gefunden hätte:
`api.js`s Fetch-Präfix wurde gegen den Dispatcher-Kontrakt falsch
zusammengesetzt (Präfix + voller `'/api/...'`-Pfad statt Präfix +
Rest-Pfad-ohne-`/api`) — führte real zu `/api/api/...`, 404, und einem
sichtbaren "Aktualisierung fehlgeschlagen" im Shell-Header. Behoben in
`api.js` UND `projekt-kontext.js` (dort derselbe Fehler in die andere
Richtung: Leerstring-Präfix statt `/api` für den Rückwechsel zu
`ai-workforce`). Der isolierte api.js-Unit-Test
(`check-f25-projekte.mjs` Abschnitt (6)) hatte das NICHT gefangen, weil
er nur gegen seine eigene, damals ebenfalls falsche Erwartung prüfte —
Abschnitt (7) (echter `erzeugeMultiProjektDispatcher`) schließt diese
Lücke seither.

Reviewer-/QA-Pass (frischer Kontext, F-046): Reviewer freigegeben mit
Hinweisen — (1) durchgängiger AK-Nummern-Fehlverweis (WS-2a-Kommentare
nutzten die ursprüngliche lokale Zählung AK1-AK7 statt der mit WS-1
zusammengeführten AK10-AK16, kollidierend mit WS-1s eigenen AK1-AK9),
mechanisch über alle betroffenen Dateien korrigiert; (2) `GET
/api/projekte` über einen Projekt-Präfix erreichbar (siehe "Bekannte
Grenzen"); (3) `.badge` ohne Variantenklasse ohne Hintergrundfarbe, neue
`.badge.neutral` (bestehende Tokens wiederverwendet); (4) AK14-Wortlaut
"Link" vs. tatsächlichem `<button>`, Formulierung angepasst. QA
freigegeben mit Hinweisen — (1) **hoch**: aktiver Projekt-Kontext ging
bei jedem Seiten-Reload kommentarlos verloren (reine
In-Memory-Modulvariable), ein Schreibvorgang direkt danach wäre unbemerkt
im falschen Projekt gelandet; behoben über `sessionStorage`-Persistenz in
`projekt-kontext.js`. (2) **mittel**: ein registriertes, aber
handler-seitig fehlgeschlagenes Projekt führt zu einem stillen UI-Ausfall
statt einer sichtbaren Fehlermeldung (siehe "Bekannte Grenzen") — der
eine dabei gefundene, eng behebbare Teilaspekt (Feldnamen-Mismatch
`fehler`/`grund` im Dispatcher-404) ist behoben, das breitere Muster
(fehlende `r.ok`-Prüfung in den meisten GET-Wrappern, bestehend seit
F10-F24) bewusst dokumentiert statt in dieser Iteration breit
angefasst. Alle Befunde behoben bzw. dokumentiert, `npm run check`
danach erneut grün bestätigt (528 Tests), der Browser-Realtest mit den
korrigierten Dateien wiederholt (`features/F25/nachweis-ws2a.md`).

## Rollback
Neue Routen (`/api/projekte/<id>/…`), `projekte.json` und
`schemas/projekte.schema.json` entfernen; `erzeugeRequestHandler` und
`starteGateway` verlieren die zusätzlichen optionalen Parameter
(`cwd`/projektbezogene Pfade) wieder — der bestehende `/api/…`-Pfad für
`ai-workforce` bleibt davon strukturell unberührt, da AK2/AK7 ihn
unverändert lassen.

(WS-2a) `public/leitstand/projekt-kontext.js` und
`views/projekte-uebersicht.js` entfernen, `app.js`/`index.html`s
additive Ergänzungen (Nav-Link, `#projekt-kontext`,
`initProjekteUebersichtView`) zurücknehmen, `api.js`s `mitPraefix()`
wieder durch direkte `'/api/...'`-Literale ersetzen (Default-Verhalten
für `ai-workforce` bliebe dabei unverändert, da der Präfix-Default
bereits `/api` ist) — der `GET /api/projekte`-Endpunkt ist rein additiv
und kann unabhängig entfernt werden.
