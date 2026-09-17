# F25 — Projekte v1

## ID
F25

## Titel
Projektregister, Handler-Instanzen, cwd-Threading (WS-1)

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

## Nicht-Ziele
- Projekte-View, Import-Wizard, Health-Projektion (WS-2/WS-3).
- Bootstrap-Automatik für eine fehlende Fremd-Repo-Baseline
  (`.claude/settings.json` / `state/aktuelle-autorisierung.json`) — Option B,
  siehe "Bekannte Grenzen".
- Roadmap-Erzeugung, parallele Läufe je Projekt.

## Workstreams
- WS-1 — Register, Schema, Handler-Instanzen, cwd-Threading, D13-Umstellung
  auf globalen Zustand. **FEATURE_GATE** (AK1-AK9 erfüllt, siehe unten).

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

## Betroffene Primitive
`erzeugeRequestHandler`, `starteGateway`, `StarterOptionen`/`echterStarter`,
`belegeInstanzLock`, D13-Zustand (`laufAktiv`), `schemas/projekte.schema.json`,
`projekte.json`.

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

## Rollback
Neue Routen (`/api/projekte/<id>/…`), `projekte.json` und
`schemas/projekte.schema.json` entfernen; `erzeugeRequestHandler` und
`starteGateway` verlieren die zusätzlichen optionalen Parameter
(`cwd`/projektbezogene Pfade) wieder — der bestehende `/api/…`-Pfad für
`ai-workforce` bleibt davon strukturell unberührt, da AK2/AK7 ihn
unverändert lassen.
