# Plan v1 — F25 WS-1 (Projektregister, Handler-Instanzen, cwd-Threading)

Bezug: `features/F25/feature.md` (AK1-AK9), Auftragstext im Chat-Verlauf
17.09.2026. Geschrieben vor jedem Codeeingriff, als Grundlage für den
Advisor-Pass (Trigger: Schema-Änderung, D13-Architekturwechsel, neue
Routen).

## 0. Ist-Zustand (real gelesen, nicht angenommen)

- `src/claude-code-gateway/prozessstart.ts` — `echterStarter` baut
  `execFileOptionen` aus `encoding`/`maxBuffer`/`timeout`/`signal`. Kein
  `cwd`-Feld. `StarterOptionen` (`src/claude-code-gateway/types.ts`) kennt
  nur `zeitgrenzeMs?`, `abbruchSignal?`, `stdinLeer?`.
- `src/claude-code-gateway/index.ts` — `starteGateway(eingaben,
  optionen: GatewayOptionen)`. `GatewayOptionen` (Zeilen 134-149) hat
  bereits `settingsPfad?`, `aktuelleAutorisierungPfad?`,
  `startfreigabeRepoWurzel?`, je mit hartcodiertem Modul-Default
  (`STANDARD_AKTUELLE_AUTORISIERUNG_PFAD` = absoluter Windows-Pfad,
  Zeile 81 in `scripts/leitstand-server.mjs` — **nicht** in
  `claude-code-gateway/index.ts` selbst, dort ist der Default
  `join(process.cwd(), '.claude', 'settings.json')` für `settingsPfad`).
  `starteProzess(eingaben.werkzeugStartziel, eingaben.tokens, { starter,
  zeitgrenzeMs, abbruchSignal })` — kein `cwd` durchgereicht.
- `src/execution-controller/types.ts` — `AusfuehrungsOptionen` hat bereits
  `settingsPfad?`, `aktuelleAutorisierungPfad?`,
  `startfreigabeRepoWurzel?`, `zeitgrenzeMs?`, `abbruchSignal?`. Jedes
  Feld hier ist laut Datei-Kopfkommentar **doppelt zu pflegen**: hier UND
  in `src/execution-controller/index.ts` (Zeilen 361-362 kopieren
  `settingsPfad`/`aktuelleAutorisierungPfad` einzeln in den
  `starteGateway`-Aufruf) UND in `scripts/leitstand-server.mjs`s
  `VERBOTENE_OPTIONEN_FELDER` (Body-Sperre, F10 AK3).
- `scripts/leitstand-server.mjs` — `erzeugeRequestHandler(optionen)`
  destrukturiert `fuehreAufgabeDurchFn`, `basisVerzeichnis`,
  `publicVerzeichnis`, `startvorlagePfad`, `repoWurzel` (Default
  `process.cwd()`). D13-Zustand (`laufAktiv`, `laufAktivLaufId`,
  `laufAktivAbortController`) ist **closure-lokal je Aufruf** (drei `let`
  im Funktionskörper, Zeilen 2751-2755). `starteLaufUndVergiss` baut
  `laufOptionen = { ...optionen, ...(vorlage.zeitgrenzeMs...),
  ...(zeitgrenzeMsUeberschreibung...), abbruchSignal:
  laufAktivAbortController.signal }` — das **gesamte** `optionen`-Objekt
  von `erzeugeRequestHandler` wird hier hineinkopiert (Kommentarzeile
  2793-2812 begründet das explizit: "nicht basisVerzeichnis einzeln
  herausgekopiert, sonst respektieren die synchronen Prüfungen ein
  Nicht-Default-basisVerzeichnis, der eigentliche Lauf aber nicht").
  `fuehreAufgabeDurch` selbst kopiert davon nur die bekannten neun Felder
  einzeln in `starteGateway` (F-107, s.o.) — Extrafelder bleiben
  überall ungelesen (D5). Ein neues `cwd`-Feld folgt also demselben Weg:
  additiv in `optionen` von `erzeugeRequestHandler` → automatisch in
  `laufOptionen` (Spread) → **muss** in `AusfuehrungsOptionen` UND
  `execution-controller/index.ts` UND `VERBOTENE_OPTIONEN_FELDER` UND
  `GatewayOptionen` UND `starteProzess`-Aufruf einzeln nachgetragen
  werden, sonst bleibt es auf dem Weg liegen.
- Nur EIN `http.Server`/EIN `erzeugeRequestHandler(...)`-Aufruf heute im
  CLI-Bindeblock (`createServer(erzeugeRequestHandler({
  startvorlagePfad }))`, Zeile 5452). Kein Dispatcher, keine
  Mehrfachinstanziierung vorgesehen.
- `belegeInstanzLock(basisVerzeichnis, port)` ist bereits nach
  `basisVerzeichnis` parametrisiert (nicht hartcodiert), wird aber
  produktiv nur EINMAL im CLI-Bindeblock mit dem Modul-Default
  `BASISVERZEICHNIS` aufgerufen. `scripts/check-f15-instanzlock.mjs`
  erzwingt strukturell, dass der Aufruf NUR im CLI-Bindeblock steht, nie
  innerhalb von `erzeugeRequestHandler` (Prüfung d, Quelltext-Positions-
  Vergleich).
- `waehleWorkflowVorlage` (`src/router/index.ts:219`, Default
  `repoWurzel = process.cwd()`) und `loeseRessourcenAuf`
  (`src/ressourcen/index.ts:307`, `repoWurzel` Pflichtparameter ohne
  Default) sind die zwei realen `repoWurzel`-Konsumenten außerhalb des
  Gateway-Pfads — beide bereits parametrisiert, beide unverändert
  lauffähig, wenn `ai-workforce`s Instanz weiterhin `process.cwd()` als
  `repoWurzel` übergibt (WS-1 ändert daran nichts, AK7).
- Kein bestehendes Schema/Register für "Projekte" — `projekte.json`
  existiert nicht.

## 1. Schema und Register (AK1)

`schemas/projekte.schema.json`, Draft 2020-12, `additionalProperties:
false` auf jeder Objektebene (Muster `schemas/ressourcen.schema.json`).
Envelope wie `ressourcen.json` (`{ "projekte_schema": "v0", "projekte":
[...] }`) statt nacktem Array — Konsistenz mit dem bestehenden
Versionsfeld-Muster, erlaubt künftige additive Envelope-Felder ohne
Breaking Change.

```json
{
  "projekte_schema": "v0",
  "projekte": [
    {
      "id": "ai-workforce",
      "name": "AI Workforce",
      "repo_pfad": ".",
      "startvorlage_pfad": "startvorlagen/ai-workforce.json",
      "profil_pfad": "profiles/<real existierende Datei>",
      "basisverzeichnis": "kontrollzustand",
      "status": "IN_ENTWICKLUNG"
    }
  ]
}
```

`repo_pfad` und `basisverzeichnis` sind relativ zum jeweiligen
`repo_pfad` **selbst** aufzulösen (nicht relativ zu `process.cwd()` des
Serverprozesses) — sonst hängt die Auflösung eines Fremdprojekts davon
ab, aus welchem Verzeichnis `npm run leitstand` gestartet wurde. Für den
Starteintrag `ai-workforce` mit `repo_pfad: '.'` ist das gleichbedeutend
mit dem heutigen Verhalten, wenn der Server wie bisher aus dem
Repo-Root gestartet wird — `repo_pfad: '.'` wird explizit relativ zu
`process.cwd()` zum Zeitpunkt des Server-Starts aufgelöst (einzige
Ausnahme, dokumentiert statt stillschweigend), da es keinen anderen
Referenzpunkt für den ERSTEN Eintrag gibt.

`profil_pfad` ist Pflichtfeld laut Auftragstext, wird aber von WS-1
NICHT gelesen oder ausgewertet (keine AK verlangt das) — reines
Registerfeld für spätere Workstreams (Projekte-View). Muss auf eine
real existierende Datei zeigen? **Offener Punkt** (siehe Abschnitt 6).

`scripts/check-datenformate.mjs` bekommt `projekte.json` als neues
Beispiel-Paar (`schemas/examples/projekte.*.json`, Grün-/Rot-Fall),
Muster `ressourcen.*.json`.

## 2. cwd-Threading (AK3, AK4)

Kette, jeweils additiv und optional, Default = heutiges Verhalten:

1. `src/claude-code-gateway/types.ts` — `StarterOptionen.cwd?: string`.
2. `src/claude-code-gateway/prozessstart.ts` — `execFileOptionen.cwd =
   optionen?.cwd` (nur gesetzt, wenn definiert — analog zu
   `zeitgrenzeMs`/`abbruchSignal` im selben Objekt-Spread-Stil).
3. `src/claude-code-gateway/types.ts` — `GatewayOptionen.cwd?: string`
   (in `claude-code-gateway/index.ts`, nicht `leitstand-server.mjs`).
4. `src/claude-code-gateway/index.ts` — `starteGateway` reicht
   `optionen.cwd` einzeln an den `starteProzess`-Aufruf durch:
   `{ starter, zeitgrenzeMs, abbruchSignal, cwd: optionen.cwd }`.
5. `src/execution-controller/types.ts` — `AusfuehrungsOptionen.cwd?:
   string`, Kopfkommentar ergänzt (Muster `zeitgrenzeMs`-Eintrag).
6. `src/execution-controller/index.ts` — Zeile ~361 ergänzt um
   `cwd: optionen.cwd,` im `starteGateway`-Aufruf.
7. `scripts/leitstand-server.mjs` — `VERBOTENE_OPTIONEN_FELDER` bekommt
   `'cwd'` (sonst könnte ein Startauftrag-Body künftig das
   Arbeitsverzeichnis selbst bestimmen — AK3 verlangt server-seitiges
   Setzen aus dem Registereintrag, nie ein Body-Feld).
8. `settingsPfad`/`aktuelleAutorisierungPfad` (AK4) brauchen KEINE neue
   Leitung — beide sind bereits Ende-zu-Ende verdrahtet (siehe Abschnitt
   0). WS-1 muss nur `erzeugeRequestHandler` dazu bringen, sie
   projektspezifisch mit einem Default zu befüllen (siehe Abschnitt 3),
   statt sie leer zu lassen (bisheriger `ai-workforce`-Default bleibt
   unverändert: `settingsPfad` fällt weiterhin auf
   `join(process.cwd(), '.claude', 'settings.json')` zurück,
   `aktuelleAutorisierungPfad` weiterhin auf den hartcodierten
   `STANDARD_AKTUELLE_AUTORISIERUNG_PFAD` — WS-1 überschreibt diese
   Defaults für `ai-workforce` NICHT explizit, um AK7 nicht zu
   gefährden, sondern setzt sie nur für **andere** Registereinträge).

`ai-workforce`s eigener Lauf bleibt damit bit-für-bit unverändert: kein
neues Feld wird für den bestehenden `/api/...`-Pfad tatsächlich mit einem
von `undefined` verschiedenen Wert belegt, solange die
`erzeugeRequestHandler`-Instanz für `ai-workforce` wie heute ohne
`cwd`/`settingsPfad`/`aktuelleAutorisierungPfad` in `optionen` aufgerufen
wird (Abschnitt 3 entscheidet das explizit so).

## 3. Mehrfachinstanziierung und Routing (AK2)

Neue, kleine Fabrikfunktion in `scripts/leitstand-server.mjs`, z. B.
`baueProjektHandlerMap(projekte, repoWurzelBasis)`:

```js
function baueProjektHandlerMap(projekte, globalerLaufZustand) {
  const map = new Map()
  for (const projekt of projekte) {
    const repoWurzel = resolve(globalerRepoWurzelBasis, projekt.repo_pfad)
    map.set(projekt.id, erzeugeRequestHandler({
      basisVerzeichnis: join(repoWurzel, projekt.basisverzeichnis),
      startvorlagePfad: join(repoWurzel, projekt.startvorlage_pfad),
      repoWurzel,
      settingsPfad: join(repoWurzel, '.claude', 'settings.json'),
      aktuelleAutorisierungPfad: join(repoWurzel, 'state', 'aktuelle-autorisierung.json'),
      cwd: repoWurzel,
      globalerLaufZustand,
    }))
  }
  return map
}
```

Dispatcher vor dem bestehenden Default-Handler:

```js
function erzeugeMultiProjektDispatcher(projektHandlerMap, defaultHandler) {
  return (req, res) => {
    const url = new URL(req.url, 'http://localhost')
    const treffer = url.pathname.match(/^\/api\/projekte\/([^/]+)(\/.*)?$/)
    if (treffer !== null) {
      const [, id, rest] = treffer
      const handler = projektHandlerMap.get(id)
      if (handler === undefined) return sendeJson(res, 404, { fehler: `Unbekanntes Projekt '${id}'` })
      req.url = (rest ?? '/') + url.search
      return handler(req, res)
    }
    return defaultHandler(req, res)
  }
}
```

`defaultHandler = erzeugeRequestHandler({ startvorlagePfad,
globalerLaufZustand })` — **exakt derselbe Aufruf wie heute**, nur mit
dem zusätzlichen `globalerLaufZustand`-Feld (Abschnitt 4). Kein bestehender
Test/Gate ruft den Server über `createServer(...)` hinweg auf — alle
Gate-Skripte rufen `erzeugeRequestHandler(optionen)` direkt auf und
bekommen ihre eigene, isolierte Handler-Instanz zurück (unverändert,
AK2/AK7-Vertrag). Der Dispatcher existiert NUR im CLI-Bindeblock (Zeile
~5452), nicht als exportierte Funktion, die ein Gate testen müsste — WS-1
verlangt keinen Dispatcher-Gate, nur den Registerpfad selbst
(`check-f25-projekte.mjs` ruft `baueProjektHandlerMap`/
`erzeugeMultiProjektDispatcher` direkt mit einem eigenen `createServer`
auf, Muster der bestehenden Gate-Skripte).

## 4. D13: globaler Laufzustand (AK5)

`laufAktiv`/`laufAktivLaufId`/`laufAktivAbortController` (drei `let` in
`erzeugeRequestHandler`) werden durch ein Zustandsobjekt ersetzt:

```js
function erzeugeLaufZustand() {
  return { aktiv: false, laufId: null, abortController: null }
}
```

`erzeugeRequestHandler(optionen)` destrukturiert zusätzlich
`globalerLaufZustand = erzeugeLaufZustand()` (eigener, isolierter Default
— **kein Verhaltensunterschied** für jeden bestehenden Aufrufer, der
diesen Parameter nicht kennt/setzt: `check-f15-instanzlock.mjs` &
Geschwister erzeugen weiterhin unabhängige Server mit unabhängigem
Zustand). Alle bisherigen Lese-/Schreibzugriffe auf `laufAktiv` /
`laufAktivLaufId` / `laufAktivAbortController` werden zu
`globalerLaufZustand.aktiv` / `.laufId` / `.abortController` (rein
mechanische Umbenennung an den ca. 4 bestehenden Stellen, kein neues
Verhalten je Einzelaufruf).

CLI-Bindeblock: EIN gemeinsames `erzeugeLaufZustand()`-Objekt wird
erzeugt und an JEDE `erzeugeRequestHandler`-Instanz (Default + alle
Projekte) durchgereicht — dadurch ist `laufAktiv` über alle Instanzen
hinweg dieselbe Referenz, D13 gilt serverweit statt instanzweise.

**Instanz-Lock je `basisverzeichnis` (Datei-Ebene, nicht In-Memory)**
bleibt zusätzlich bestehen: der CLI-Bindeblock ruft `belegeInstanzLock`
für JEDEN Registereintrag mit dessen aufgelöstem `basisVerzeichnis` auf
(Schleife statt einzelnem Aufruf) — schützt weiterhin, dass zwei
Serverprozesse dasselbe `kontrollzustand/`-Verzeichnis binden, unabhängig
vom neuen In-Memory-`laufAktiv`. `check-f15-instanzlock.mjs`s
Strukturprüfung (d) bleibt gültig, solange der Lock-Aufruf weiterhin
NACH `function erzeugeRequestHandler` im Quelltext steht und
ausschließlich im CLI-Bindeblock (Schleife zählt als "im Bindeblock",
keine neue Aufrufstelle innerhalb der Fabrikfunktion selbst) — **zu
verifizieren, dass die Positionsprüfung eine Schleife nicht fälschlich
ablehnt** (Abschnitt 6, offener Punkt).

## 5. Option B / Fail-Closed (AK6)

Keine Codeänderung — `starteGateway` lehnt ein Repo ohne eigene
`.claude/settings.json`/`state/aktuelle-autorisierung.json` bereits heute
strukturell ab (die Dateien existieren dort schlicht nicht, `ENOENT`
propagiert als Ablehnung/Fehler durch den bestehenden Lesepfad). WS-1
fügt keinen Bootstrap-Automatismus hinzu. Bereits in
`features/F25/feature.md` unter "Bekannte Grenzen" dokumentiert.

## 6. Offene Punkte (nicht stillschweigend entschieden)

- **[offen] `profil_pfad`-Pflicht ohne Leseeffekt.** AK1 nennt
  `profil_pfad` als Pflichtfeld des Schemas, keine AK verlangt seine
  Auswertung in WS-1. Plan sieht vor: Schema verlangt das Feld
  syntaktisch (String), aber KEINE Existenzprüfung der Datei in WS-1
  (spätere Workstreams lesen es). Risiko: ein Registereintrag mit
  frei erfundenem `profil_pfad` bleibt unentdeckt falsch, bis eine
  spätere WS ihn liest.
- **[offen] `check-f15-instanzlock.mjs` Prüfung (d) und eine Schleife
  über mehrere `belegeInstanzLock`-Aufrufe.** Die bestehende
  Positionsprüfung vergleicht wahrscheinlich `indexOf('function
  erzeugeRequestHandler')` gegen `indexOf('belegeInstanzLock(')` als
  Text — eine Schleife mit einem einzelnen Aufruf im Quelltext bleibt
  strukturell unverändert (ein Aufruf-Vorkommen, jetzt in einer
  `for`-Schleife statt direkt) und sollte die Prüfung nicht brechen,
  aber das ist eine Annahme, keine gelesene Tatsache — vor dem Bau am
  echten Gate-Quelltext zu verifizieren.
- **[offen] AK8s zweites Test-Repo.** Auftragstext verlangt ein "echtes
  lokales Repo" mit Mini-Baseline. Plan sieht vor: ein Repo außerhalb von
  `ai-workforce` anlegen (z. B. unter `C:\Users\stefa\Projekte\` als
  Geschwisterordner), NICHT in die committete `projekte.json`
  aufgenommen (absoluter, personenbezogener Pfad gehört nicht ins
  geteilte Register) — stattdessen für den realen AK8-Nachweis eine
  lokale, nicht committete Kopie von `projekte.json` verwendet (Muster:
  `.gitignore`d Testfixtur oder eine temporäre Erweiterung, die vor dem
  Commit zurückgesetzt wird) und der Nachweis in
  `features/F25/nachweis-ws1.md` dokumentiert. **Zu klären**, ob Stefan
  stattdessen ein bereits vorhandenes zweites Repo bevorzugt.
- **[offen] Statische Auslieferung unter `/api/projekte/<id>/...`.** AK2
  nennt nur API-Routen. Plan sieht vor: der Dispatcher leitet
  AUSSCHLIESSLICH `/api/projekte/<id>/...` um, alles andere (inkl.
  `publicVerzeichnis`-Auslieferung) bleibt unverändert beim
  Default-Handler. Kein projektspezifisches Frontend in WS-1 (konsistent
  mit "Nicht-Ziele: keine Views").
- **[offen] `resolve` gegen `repo_pfad: '.'` beim allerersten Eintrag.**
  Siehe Abschnitt 1 — für `ai-workforce` bewusst `process.cwd()` zum
  Server-Startzeitpunkt, für jedes andere Projekt ein vom Register
  selbst benannter Pfad. Uneinheitlich, aber die einzige praktikable
  Lösung ohne einen zweiten Konfigurationswert ("wo liegt das Register
  selbst") einzuführen — zur Diskussion gestellt.

## 7. Gate (AK9)

`scripts/check-f25-projekte.mjs`, Muster `check-f21-workboard.mjs`:
- Rot-Fall: `cwd` NICHT gesetzt (alter Aufrufstil) → Kindprozess-Attrappe
  (Test-`Starter`) beobachtet `optionen.cwd === undefined` →
  Erwartungsprüfung schlägt bewusst fehl, um zu zeigen, dass der Test
  selbst empfindlich ist.
- Grün-Fall: `cwd` gesetzt → Attrappen-`Starter` bekommt den erwarteten
  absoluten Pfad in `optionen.cwd`.
- Schema-Validierung `projekte.json` gegen `schemas/projekte.schema.json`
  (Grün-Fall: Starteintrag; Rot-Fall: absichtlich fehlerhafte Fixtur unter
  `schemas/examples/`).
- Dispatcher-Test: `/api/projekte/ai-workforce/laeufe` (oder ein
  Test-Zweitprojekt mit Attrappen-`fuehreAufgabeDurchFn`) liefert
  dieselbe Form wie der bestehende `/api/laeufe`-Endpunkt; unbekannte
  `id` → 404.
- D13 über zwei Instanzen: `globalerLaufZustand.aktiv = true` in
  Instanz A blockiert einen Start in Instanz B (409) — beide Instanzen
  mit demselben `erzeugeLaufZustand()`-Objekt erzeugt.

## 8. Reihenfolge

1. Schema + `projekte.json` + Beispiele (AK1) + `check-datenformate`-Lauf.
2. cwd-Threading Ende-zu-Ende (AK3) — isoliert testbar ohne Register.
3. D13-Umbau auf Zustandsobjekt (AK5), Default weiterhin isoliert —
   bestehende Tests/Gates laufen unverändert (kein neuer Parameter
   gesetzt).
4. `erzeugeRequestHandler` um `settingsPfad`/`aktuelleAutorisierungPfad`/
   `cwd`/`globalerLaufZustand`-Annahme ergänzen (AK4, Teil von AK2/AK5).
5. Fabrik + Dispatcher + CLI-Bindeblock-Verdrahtung (AK2).
6. `VERBOTENE_OPTIONEN_FELDER` + AK7-Regressionslauf (`npm run check`).
7. Gate `check-f25-projekte.mjs` (AK9), kalibriert.
8. Realer Zwei-Projekte-Test (AK8), Nachweisdatei.
9. Findings F-413/F-414 nachtragen, `features/F25/feature.md`
   aktualisieren, `npm run check` grün, Reviewer-/QA-Pass, Commit/PR.
