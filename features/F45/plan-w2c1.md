# F45 W2c-1 — Ratschen + Formatierer für neue Dateien — Plan v1

Stand 28.10.2026, Branch `f45/w2c-biome-ratschen` (Basis main `da333cb`, nach #390). Auftrag: Challenger 28.10.2026
(„F45 W2c-1 Ratschen + Formatierer für neue Dateien“, ein Block mit eingearbeitetem Zusatz E-FMT-1 = B).
Ziel: Codequalität wird nicht schlechter. Bestand eingefroren und nur senkbar; neue Dateien regelkonform und formatiert.

## Basis (lesend geprüft, gemessen 28.10.2026 auf Windows, `da333cb`)

- `biome.json`: `recommended: false`, nur `noExplicitAny` und `noFloatingPromises` (error); `files.includes`
  `scripts/**`, `src/**`, `public/**/*.js` (die 14 `public/**/*.test.mjs` werden heute **nicht** gelintet). `npm run lint` =
  `biome lint .` (Exit ≠ 0 nur bei error). Biome 2.5.9: `rules.preset` (`recommended|all|none`); Gruppenwerte
  (`"complexity": "error"`) schalten **alle** Regeln der Gruppe ein — es gibt keinen Schalter „alle empfohlenen auf error“.
  `--error-on-warnings` lässt warn-Befunde scheitern, info-Befunde nie.
- **Lint-Probe** (preset recommended + `noExcessiveCognitiveComplexity` max 15, Pfade `scripts src public`): 562 Befunde in
  Code-Dateien (Challenger 548 — Differenz = die 14 `public/**/*.mjs`), 226 Dateien, 20 Regeln: Komplexität 381 (error),
  noControlCharactersInRegex 20 (error), noTemplateCurlyInString 19 (warn), useOptionalChain 16 (warn),
  noUnsafeOptionalChaining 16 (error), noUnusedFunctionParameters 15 (warn), noUnusedVariables 13 (warn),
  useIterableCallbackReturn 13 (error), noCommaOperator 11 (warn), useTemplate 10 (info), noNonNullAssertion 10 (warn),
  noEmptyCharacterClassInRegex 10 (error; 8 davon in `public/**/*.test.mjs`), noUnusedImports 8 (warn),
  noAssignInExpressions 7 (error), Rest ≤ 4.
- **Formatierer-Probe** (Kopie der 632 getrackten `.ts/.mjs/.js` unter scripts/src/public im Scratchpad, `format --write`,
  `git diff --no-index --numstat`; Basis: 2 Leerzeichen, `quoteStyle single`, `semicolons asNeeded`, `lineWidth 120`, LF):

  | trailingCommas / arrowParentheses | Dateien geändert | +Zeilen | −Zeilen |
  |---|---|---|---|
  | all / always | 561 | 79 659 | 23 293 |
  | **es5 / always** | **558** | **78 694** | **22 349** |
  | none / always | 575 | 80 964 | 24 700 |
  | all / asNeeded | 580 | 82 753 | 26 503 |
  | es5 / asNeeded | 578 | 81 795 | 25 569 |
  | none / asNeeded | 588 | 84 008 | 27 857 |

  ⇒ **es5 + always**: kleinste Abweichung in beiden Maßen; Startliste ≈ 74 Dateien (wird beim Bau exakt erhoben).
  `biome format --reporter=json <ordner>` (ohne `--write`) liefert je unformatierter Datei einen Befund `category: "format"`.
  Arbeitskopie ist LF (`git ls-files --eol`: 639 `w/lf`).
- **Zeilen:** 43 Code-Dateien > 800, davon `scripts/leitstand-server.mjs` (13 198, ausgenommen) ⇒ 42 einzufrieren.
- **checkJs** (`tsconfig.checkjs.json` im Repo-Wurzel — `types: ["node"]` löst nur relativ zur Konfiguration auf):
  1 441 Fehler (= Challenger); 43 Dateien `scripts/leitstand/*.mjs` ohne Tests, 41 mit Fehlern; Fehler in importierten
  `public/leitstand/*.js` (api.js 79, entwicklung-daten 70, code-daten 62, attention-daten 33, befund-zuordnung 23) werden
  ignoriert. Laufzeit ≈ 4 s. Keine Unterordner unter `scripts/leitstand/`.
- Muster: `scripts/check-wachstumsbremse-server.mjs` (reine Funktionen exportiert, `leseReferenz` merge-base mit
  `origin/main`/`main`, Spitze als Rückfall, „(a2)/(b2) nicht geprüft“ ohne Referenz; `zaehleZeilen` exportiert).
  `scripts/check-kette.mjs`: neue Gates in `GATES`; Dateien `scripts/check-*` nur mit `node:`-Importen (Regel 1j, F-713).
- **ARCHITECTURE.md** 17 781 Bytes, Deckel 17 800 (`scripts/architektur-kern.json`, nur senkbar) — 19 Bytes frei.

## Vorgehen

1. **`biome.json`**
   - `linter.rules.preset: "recommended"`; `noExplicitAny`, `noFloatingPromises` bleiben error;
     `complexity.noExcessiveCognitiveComplexity` mit `maxAllowedComplexity: 15`.
   - Die Regeln **mit Bestand** (≈ 20, Liste aus der Erhebung) explizit auf `"info"` — `npm run lint` bleibt grün, gezählt
     werden sie in der Ratsche. Alle übrigen empfohlenen Regeln behalten ihre Standard-Schwere; `npm run lint` wird
     `biome lint --error-on-warnings .` ⇒ warn und error scheitern. Empfohlene Regeln mit Standard `info` ohne Bestand
     scheitern nur in der Ratsche (Schwere „neu ohne Eintrag“) — DEKLARIERT im Lint, ERZWUNGEN durch `check-ratsche`.
     Kein einzelnes Hochstufen jeder empfohlenen Regel (Liste von Dutzenden Einträgen ohne Gewinn, die Ratsche fängt sie).
   - `files.includes`: `public/**/*.js` → zusätzlich `public/**/*.mjs` (eine Code-Menge für Lint, Zeilen und Formatierer;
     +14 Befunde in den Bestand).
   - `formatter`: `enabled: true`, `indentStyle: space`, `indentWidth: 2`, `lineWidth: 120`, `lineEnding: lf`;
     `javascript.formatter`: `quoteStyle: single`, `semicolons: asNeeded`, `trailingCommas: es5`, `arrowParentheses: always`.
     Wirkt nur, wo jemand formatiert; welche Dateien formatiert sein **müssen**, bestimmt die Liste in `scripts/ratsche.json`.
     Ein Editor mit „format on save“ formatiert jede gespeicherte Datei — DEKLARIERT (Codeform-Gates können dann rot werden,
     F-neu HARNESS).
   - Sichere Autofixes: `biome lint --write --only=correctness/noUnusedImports --only=correctness/noUnusedVariables`
     (ohne `--unsafe` ⇒ nur Biomes sichere Fixes). Jede Stelle im Diff einzeln geprüft; zurückgenommen, wenn eine ganze
     Import-Anweisung eines Moduls mit Nebenwirkung fällt oder ein Gate die Zeile als Text liest. Keine weitere
     Codeänderung am Bestand.
2. **`tsconfig.checkjs.json`** (neu, Repo-Wurzel): `extends ./tsconfig.json`, `allowJs`, `checkJs`;
   `include: ["scripts/leitstand/*.mjs"]`, `exclude: ["scripts/leitstand/*.test.mjs"]`. Der Glob **ist** die Dateiliste:
   eine neue Datei unter `scripts/leitstand/` ist automatisch im Programm und hat keinen Bestand ⇒ muss 0 Fehler haben.
   `npm run typecheck` bleibt unverändert.
3. **`scripts/ratsche.json`** (Bestand), eine Zeile je Datei (deterministisch sortiert, diff-freundlich):
   ```json
   { "grenze_zeilen": 800,
     "dateien": { "public/leitstand/api.js": { "zeilen": 1234, "lint": { "complexity/noExcessiveCognitiveComplexity": 4 } }, … },
     "formatiert": ["scripts/check-ratsche.mjs", …] }
   ```
   Je Datei nur Werte > 0: `zeilen` (Zeilenzahl, nur über der Grenze), `lint` (Befunde je Regel, Kategorie ohne `lint/`),
   `checkjs` (Fehlerzahl). Leere Einträge entfallen.
4. **`scripts/check-ratsche.mjs`** (neu, nur `node:`-Importe außer `zaehleZeilen` aus `check-wachstumsbremse-server.mjs`):
   - **Erhebung (Ist):** Code-Dateien = `.ts/.mjs/.js` unter `scripts/`, `src/`, `public/` per `readdirSync(recursive)`,
     ohne `node_modules` und Punkt-Ordner (gitunabhängig; ungetrackte neue Dateien zählen lokal mit). `zeilen` für jede
     Code-Datei außer `scripts/leitstand-server.mjs`; Lint per `node node_modules/@biomejs/biome/bin/biome lint
     --reporter=json --max-diagnostics=none .` (Umfang = `biome.json`, alle Schweren); Format per `biome format
     --reporter=json --max-diagnostics=none scripts src public` ⇒ Menge unformatierter Dateien; checkJs per
     `node node_modules/typescript/bin/tsc -p tsconfig.checkjs.json --pretty false`, Zeilen `<pfad>(z,s): error TS…`
     gezählt nur für Pfade, die auf den Glob passen. Werkzeug ohne lesbare Ausgabe (kein JSON, `error TS` ohne Pfad,
     Konfigurationsfehler) ⇒ rot.
   - **Prüfung** (reine Funktion `pruefeRatsche({ ist, bestand, basis, basisDateien })`), je Datei und Schlüssel:
     (a) Ist > Bestand ⇒ rot · (b) Ist < Bestand ⇒ rot, senken (`--aktualisiere`) · (c) Bestandswert höher als auf der
     merge-base (fehlt dort = 0) ⇒ rot · (e) Befund/Datei ohne Bestandseintrag ⇒ rot (Spezialfall von (a) mit Bestand 0) ·
     (f) JSON fehlt/kaputt/unvollständig ⇒ rot.
     Formatierer: (g1) Datei in `formatiert`, die unformatiert ist ⇒ rot · (g2) Eintrag in `formatiert` ohne Datei ⇒ rot,
     entfernen · (g3) Code-Datei, die auf der merge-base nicht existiert und nicht in `formatiert` steht ⇒ rot ·
     (g4) formatierte Code-Datei nicht in `formatiert` ⇒ rot, aufnehmen (straff wie (b); die Liste ist genau die Menge
     formatierter Dateien plus unformatiert gewordener Listeneinträge, die schon (g1) melden) · (d) Eintrag der merge-base
     fehlt, obwohl die Datei existiert ⇒ rot (Liste „kürzer“ als Menge; gelöschte Dateien dürfen heraus).
   - **Referenz:** wie `leseReferenz` in W1 (merge-base mit `origin/main`, dann `main`; JSON fehlt dort ⇒ Spitze des Refs;
     ohne ⇒ Hinweis „(c)/(d) nicht geprüft“). Für (g3) die Dateiliste der merge-base (`git ls-tree -r --name-only`); ohne
     git ⇒ „(g3) nicht geprüft“. Eigene ≈ 40 Zeilen statt W1-Funktion umzubauen (W1-Gate bleibt unberührt; die W1-Funktion ist
     auf ihren Pfad und ihr Formprüfer festgelegt).
   - **`--aktualisiere`:** schreibt nur min(Bestand, Ist) je Schlüssel, entfernt Nullen und gelöschte Dateien, nimmt
     formatierte Dateien in `formatiert` auf, entfernt nur Einträge gelöschter Dateien; nie eine Erhöhung oder ein neuer
     Schlüssel. Fehlt die JSON, schreibt es die Ersterhebung (einziger Weg zum Start; danach schützt (c) gegen „löschen und
     neu erheben“). Danach läuft die normale Prüfung und meldet verbleibendes Rot.
   - Exit 0 grün, 1 Befund. Kopf nach Kommentar-Standard, Durchsetzungsgrad im Kopf.
5. **`scripts/check-ratsche.test.mjs`**: Rot-Nachweis je Regel (a)–(g4), (f) fehlt/kaputt/Form, Aktualisieren ohne
   Erhöhung, Parser der drei Werkzeugausgaben an Beispieltexten; grün-Fall. Läuft in der parallelen Testgruppe.
6. **`scripts/check-kette.mjs`**: `'node scripts/check-ratsche.mjs'` in `GATES` (parallel; schreibt nichts, ≈ 10 s).
7. **Ersterhebung**: `node scripts/check-ratsche.mjs --aktualisiere` ⇒ `scripts/ratsche.json`; neue Dateien des Pakets
   (`check-ratsche.mjs`, `check-ratsche.test.mjs`) mit `biome format --write` formatieren, sie stehen damit in der Liste.
8. **ARCHITECTURE.md §6:** „Lint über Biome, Typprüfung über `tsc`.“ erweitert um einen Satz: Ratsche `check-ratsche`
   (Lint-Befunde je Regel, Zeilen > 800, checkJs `scripts/leitstand/`, Formatierer-Liste) nur senkbar, neue Dateien
   regelkonform und formatiert — ERZWUNGEN (Prüfung (a)–(g)); DEKLARIERT: Bearbeiten von Gate/JSON, info-Regeln im Lint,
   Editor-Formatierung. Einzelheiten in neuer Detaildatei `docs/architektur/ratsche.md`. **Offen (Deckel):** + ≈ 230 Bytes
   bei 19 Bytes Luft. Vorschlag: im Kopfkommentar von ARCHITECTURE.md die erledigte Vorlagenanweisung „Fülle sie erst, wenn
   …, die nie geprüft wurden.“ (≈ 150 Bytes, keine Regel, kein Gate liest sie) streichen und den neuen Satz knapp halten;
   reicht das nicht, Deckel anheben nur mit Entscheidung Stefans (E-RATSCHE-1) ⇒ dann STOPP vor diesem Schritt.
9. **Register und Akte:** Findings F-1235..F-1240 (Auftrag Punkt 6); Akte F45: E-FMT-1 = B unter Entscheidungen, W2b-2 in
   der Workstream-Tabelle erledigt, Abschnitt „Stand W2c-1“; Inventur „Stand W2c-1“; Lagebild neu.

## Prüfung

- `npm run lint`, `npm run typecheck`, `npm run test`, `node scripts/erzeuge-lagebild.mjs --check`, `check-ratsche`,
  `check-wachstumsbremse-server`, `check-docs`, `check-rules`, `check-f45-k-kontext`, Akten-Gates (`check-status-akten`,
  `check-feature`, `check-akte-meilenstein`); Gates, deren Quelltext der Autofix berührt, einzeln.
- Rot-Nachweise in der Sitzung: Bestandsdatei über ihren Wert heben (eine Zeile in einer > 800-Datei) ⇒ (a) rot,
  zurücksetzen; neue unformatierte Datei unter `scripts/` ⇒ (g3) rot, entfernen.

## Risiken

- Werkzeugausgaben ändern sich mit Biome-/TS-Patchständen (JSON-Reporter „experimentell“) — Versionen sind gepinnt; ein
  Update kann den Bestand verschieben ⇒ (a)/(b) rot, `--aktualisiere` senkt, Erhöhungen brauchen Begründung im Paket.
- Pfadform: Biome meldet `scripts\x.mjs` unter Windows — Normalisierung auf `/`.
- Umbenennen einer Bestandsdatei = neue Datei ohne Eintrag ⇒ rot (gewollt streng; DEKLARIERT im Kopf).
- Laufzeit ≈ 10 s seriell (drei Werkzeuge) — in der parallelen Gruppe unkritisch.

## Nicht im Umfang

Formatierung des Bestands, Umbau komplexer Funktionen, checkJs für `public/` oder den Server, Produktverhalten,
`.git-blame-ignore-revs`, Hochstufen einzelner empfohlener Regeln.
