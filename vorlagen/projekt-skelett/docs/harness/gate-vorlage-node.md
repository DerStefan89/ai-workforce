# Gate-Vorlage Node/TypeScript

Wann: bei der Stack-Entscheidung, sobald feststeht, dass das Projekt auf Node
mit TypeScript (oder JavaScript) läuft. Wer sie anwendet: die Architektur-
Rolle bzw. der Mensch, der den Stack festlegt. Andere Stacks: eigene Gates
über den Skill `werkzeug-auswahl` — diese Vorlage gilt nur für Node/TS.

Bis die Vorlage angewendet ist, ist `npm run check` absichtlich rot:
`scripts/check-gates.mjs` meldet die Platzhalter in `package.json`
(`[PLATZHALTER]`) und verweist hierher. Das ist fail-closed, kein Fehler.

Ein neues Projekt hat keinen Bestand. Deshalb gelten die Grenzen hart von
Anfang an — keine Ratsche, keine Liste „alter“ Dateien.

## Was danach gilt

`npm run check` führt in dieser Reihenfolge aus:

| Gate | Befehl | rot, wenn |
|---|---|---|
| Dateigrenze | `node scripts/check-dateigroesse.mjs` | eine Code-Datei hat mehr als 800 Zeilen (wirkt schon vor dieser Vorlage) |
| Design-Tokens | `node scripts/check-design-tokens.mjs` | Farbliteral außerhalb eines Token-Blocks, Bewegung ohne `prefers-reduced-motion: reduce`, offener CSS-Kommentar (ohne CSS: grün, „kein UI“) |
| Mindest-Gates | `node scripts/check-gates.mjs` | Platzhalter, Audit-Befund (high/critical), Secret-Fund, abstürzender Hook |
| Lint + Formatierer | `biome check --error-on-warnings .` | Lint-Befund (recommended, Komplexität > 15, `any`), unformatiert, Importe nicht sortiert |
| Typprüfung | `tsc --noEmit` | Typfehler, auch in `.js`/`.mjs` (`checkJs`) |
| Doku/Regeln/Vertrag | `check-docs`, `check-rules`, `check-contract` | siehe dort |
| Tests mit Untergrenze | `node scripts/tests-mit-untergrenze.mjs <N>` | Fehlschlag oder weniger als N bestandene Tests |

Ein Werkzeug für Lint und Formatierung: Biome. ESLint (mit typescript-eslint)
statt Biome nur, wenn das Projekt Plugins braucht, die Biome nicht hat (z. B.
Framework-Regeln) — dann dieselben Grenzen dort einstellen und einen
Formatierer daneben.

## Schritte

1. Werkzeuge installieren und `.gitignore` anlegen oder ergänzen:

   ```
   npm install --save-dev --save-exact @biomejs/biome@<Version> typescript @types/node@<Hauptversion>
   ```

   `<Version>` = die Version von `@biomejs/biome` in der `package.json` der
   Workforce — gleiche Regeln, gleiche Befunde. DEKLARIERT: Das Skelett
   kennt die Version nicht selbst; Versionen stehen nur in der Paketdatei.
   `<Hauptversion>` = die Node-Hauptversion aus `engines` in `package.json`,
   sonst erlaubt die Typprüfung Node-APIs, die es zur Laufzeit nicht gibt.

   In `.gitignore` muss `node_modules/` stehen (das Skelett liefert keine
   `.gitignore`; über die Workforce angelegte Projekte haben eine mit
   `kontrollzustand/`). Biome liest die `.gitignore` (`vcs` unten) und lässt
   gitignorierte Code-Dateien aus; ohne `.gitignore` und ohne git-Repo bricht
   es ab — rot, nicht still grün.

   Die entstehende `package-lock.json` committen — erst dann läuft der
   Abhängigkeits-Scan (`npm audit --audit-level=high`) in `check-gates`.
   Der Audit braucht Netz: offline ist `npm run check` rot („nicht
   ausführbar“) — nicht gelaufen gilt nicht als grün.

2. `biome.json` anlegen (genau so formatiert — Biome prüft die eigene
   Konfigurationsdatei mit):

   ```json
   {
     "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
     "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
     "files": {
       "includes": [
         "**/*.ts",
         "**/*.tsx",
         "**/*.mts",
         "**/*.cts",
         "**/*.js",
         "**/*.jsx",
         "**/*.mjs",
         "**/*.cjs",
         "!.claude",
         "!scripts/check-contract.mjs",
         "!scripts/check-docs.mjs",
         "!scripts/check-rules.mjs",
         "!scripts/check-gates.mjs",
         "!scripts/tests-mit-untergrenze.mjs"
       ]
     },
     "formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2, "lineWidth": 120, "lineEnding": "lf" },
     "javascript": {
       "formatter": {
         "quoteStyle": "single",
         "semicolons": "asNeeded",
         "trailingCommas": "es5",
         "arrowParentheses": "always"
       }
     },
     "linter": {
       "enabled": true,
       "rules": {
         "preset": "recommended",
         "complexity": {
           "noExcessiveCognitiveComplexity": { "level": "error", "options": { "maxAllowedComplexity": 15 } }
         },
         "suspicious": { "noExplicitAny": "error" }
       }
     }
   }
   ```

   Geprüft werden nur Code-Dateien; JSON-Dateien des Laufs (z. B.
   `kontrollzustand/`, `startvorlagen/`) bleiben außen vor. Die Ausnahmen
   sind der mitgelieferte Harness, kein Projektcode: `.claude/` (Hooks) und
   `check-contract`/`check-docs`/`check-rules` sind Template-Bestand,
   `check-gates`/`tests-mit-untergrenze` eigener Skelett-Code, der die
   Grenze noch verfehlt (offenes Finding der Workforce). Die Liste nicht für
   Projektcode erweitern; `scripts/check-dateigroesse.mjs` steht bewusst
   nicht darauf.

3. `tsconfig.json` anlegen (Node führt `.ts` direkt aus, ohne Build-Schritt;
   `tsc` prüft nur — alle Ordner, auch `.js`/`.mjs`, dieselben
   Harness-Ausnahmen):

   ```json
   {
     "compilerOptions": {
       "target": "ES2023",
       "lib": ["ES2023"],
       "module": "preserve",
       "moduleResolution": "bundler",
       "types": ["node"],
       "strict": true,
       "allowJs": true,
       "checkJs": true,
       "erasableSyntaxOnly": true,
       "allowImportingTsExtensions": true,
       "verbatimModuleSyntax": true,
       "noEmit": true,
       "skipLibCheck": true
     },
     "include": ["**/*"],
     "exclude": [
       "node_modules", "dist", "build", "coverage", ".claude", "scripts/check-contract.mjs", "scripts/check-docs.mjs",
       "scripts/check-rules.mjs", "scripts/check-gates.mjs", "scripts/tests-mit-untergrenze.mjs"
     ]
   }
   ```

   Ein eigenes `exclude` ersetzt den Standard — `node_modules` muss darin
   stehen. `tsc` ohne Eingabedatei ist rot (TS18003); weil
   `scripts/check-dateigroesse.mjs` nicht ausgenommen ist, gibt es immer eine.
   UI mit `.tsx`/React: `"jsx"` setzen und `"DOM"` in `lib` ergänzen (Node
   führt `.tsx` nicht direkt aus — dafür braucht es eine Build-Kette).

   Was die drei Gates auslassen: Biome alles außerhalb der Code-Endungen,
   Gitignoriertes und die Harness-Liste; `tsc` die `exclude`-Liste;
   `check-dateigroesse` `node_modules` und Punkt-Ordner (`.git`, `.claude`,
   `.next` …) in jeder Tiefe sowie `dist`/`build`/`coverage` an der Wurzel.
   Andere Ausgabe-Ordner (z. B. `out/`, `web-build/`, `packages/*/dist/`)
   in `.gitignore` und `exclude` eintragen; zählen sie in
   `check-dateigroesse` mit, gehört der Ordner mit Begründung in dessen
   `UEBERSPRUNGEN_WURZEL`. Erzeugter Code über 800 Zeilen (z. B. Typen aus
   einem Schema) nur mit Begründung in `AUSNAHMEN` desselben Skripts.

4. Skripte in `package.json` ersetzen (die drei Platzhalter):

   ```json
   "lint": "biome check --error-on-warnings .",
   "typecheck": "tsc --noEmit",
   "test": "node scripts/tests-mit-untergrenze.mjs 1"
   ```

   `--error-on-warnings`: Biome meldet manche recommended-Regeln nur als
   Warnung; ohne den Schalter wären sie keine Grenze. Formatieren und
   Importe sortieren: `npx biome check --write .`.

   Vorher einen ersten Test anlegen (z. B. `test/<modul>.test.ts` mit
   `node:test`) — das Skelett liefert keinen, ohne ihn bleibt
   `npm run check` an der Untergrenze rot.

   Die Untergrenze (hier 1) mit jedem echten Test anheben — sie fängt ein
   leeres oder falsch verdrahtetes Testmuster (`node --test` ohne
   Testdatei endet sonst grün). Abdeckungsgrenzen sind möglich
   (`--experimental-test-coverage --test-coverage-lines=<n>` als weitere
   Argumente), aber nur, wo sie etwas aussagen.

5. `npm run check` muss jetzt grün sein. Danach:
   - `.github/workflows/ci.yml`: Schritt „Harness-Selbstprüfung“ von
     `npm run check:template` auf `npm run check` umstellen (SETUP.md
     Punkt 3) und, mit Lock-Datei, `npm install` durch `npm ci` ersetzen.
   - Workforce-Projekte: in der Startvorlage des Projekts
     (`startvorlagen/<id>.json`) `pruefbefehl` von `run check:template` auf
     `run check` umstellen — sonst wirken diese Gates nur für Menschen,
     nicht im Prüfschritt eines Workforce-Laufs.

## UI-Projekte

Gilt zusätzlich, sobald das Projekt eine Oberfläche hat.

**Design-Tokens** (`scripts/check-design-tokens.mjs`, in `check` ab Anlage): Farben stehen nur als Custom Property
(`--name: …`) in `:root`, `:root[data-theme=…]`, `:root:not([data-theme=…])` — auf oberster Ebene oder in
`@media (prefers-color-scheme: light|dark)`. Überall sonst `var(--name)`. Wer `@keyframes`, `animation` oder
`transition` nutzt, braucht einen `@media (prefers-reduced-motion: reduce)`-Block, der die Bewegung abschaltet (oder
setzt Bewegung nur in `(prefers-reduced-motion: no-preference)`); ob er wirkt, zeigt erst der Render-Nachweis.
Geprüft wird die Quelle, nicht `dist`/`build`/`coverage` und keine Punkt-Ordner; weitere Ausgabe-Ordner (`out/`,
`storybook-static/`) in `UEBERSPRUNGEN_WURZEL` des Skripts. Fremd-CSS oder andere Token-Container (Tailwind `@theme`,
`@layer`, `.dark`) nur mit Begründung in `AUSNAHMEN`. Ältere Projekte, die das Skript beim Nachrüsten bekommen:
`node scripts/check-design-tokens.mjs` von Hand nach `check-dateigroesse` in `check` und `"check:render"` in die
Skripte eintragen; vorhandenes CSS wird sofort geprüft (keine Ratsche) — Literale in Tokens überführen.

**Render-Nachweis** (`npm run check:render`, `scripts/render-nachweis.mjs`, nicht Teil von `check`):

1. Playwright installieren — exakt diese Version (= installierte Version der Workforce; gleiche Version ⇒ gleiche
   Browser-Revision, die im vorhandenen Browser-Cache liegt, kein Download). Fehlt der Browser trotzdem:
   `npx playwright install chromium`.

   ```
   npm i -D --save-exact playwright@1.63.0
   ```

2. `.gitignore` um `.render-nachweis/` ergänzen (über die Workforce angelegte Projekte haben es).
3. `render.json` in der Projektwurzel anlegen (`{}` nimmt alle Standardwerte):

   ```json
   {
     "ordner": "dist",
     "seiten": ["/", "/preise.html"],
     "bildfolgeMs": [0, 150, 400, 1000],
     "budget": { "lcpMs": 2500, "bytes": 1000000 }
   }
   ```

   `ordner` wird über einen kurzlebigen Server auf 127.0.0.1 ausgeliefert (vorher bauen). Statt `ordner`:
   `"url": "http://127.0.0.1:<port>/"` (oder `localhost`) für einen schon laufenden Server. Budget: LCP in ms (gemessen
   mit „Bewegung reduzieren“, weil Chromium Einblendungen aus `opacity: 0` nicht als LCP meldet) und die Summe der
   übertragenen Bytes je Seite. Darum unter „Bewegung reduzieren“ mit `animation: none` abschalten, nicht mit dem
   Reset auf `.01ms` — der lässt Einblendungen bei `opacity: 0` beginnen, LCP ist dann nicht messbar (rot).

   Ohne Build (statisches HTML): `"ordner"` auf den Quellordner setzen (z. B. `"public"`). Mit Build: vorher bauen —
   `check:render` prüft, was im Ordner liegt, auch einen veralteten Stand.
4. Vor „fertig“ `npm run check:render` — grün heißt: je Seite Bilder 1440×900 hell und dunkel, 390×844, „Bewegung
   reduzieren“ und Zoom 200 % in `.render-nachweis/`, Bildfolge der Animationen, keine laufende Animation unter
   „Bewegung reduzieren“, kein waagerechter Überlauf bei 390 px, Budget eingehalten. Das Protokoll
   `.render-nachweis/protokoll.md` ist die Eingabe für den design-guardian.

Grenzen: startet keinen Dev-Server und kein SSR; JS-Animationen (requestAnimationFrame, GSAP) erfasst die Bildfolge
nicht.

## ES-Module und Hooks

`"type": "module"` in `package.json` ist möglich. Aber: Hooks in
`.claude/hooks/*.js`, die `require` benutzen (CommonJS, so liefert das
Template sie aus), stürzen dann beim Start ab — und ein abgestürzter Hook
lässt den Befehl in Claude Code durch, die Bremse ist still offen. Deshalb
startet `check-gates` jeden Hook aus `.claude/settings.json` einmal
probehalber und ist rot, wenn einer abstürzt. Abhilfe: Hooks nach `.cjs`
umbenennen und die Verweise in `.claude/settings.json` anpassen (das macht
der Mensch im eigenen Editor), oder ohne `"type": "module"` bleiben und
ES-Module als `.mts`/`.mjs` schreiben.

Ohne `"type"` erkennt Node `.ts`-Dateien mit `import`/`export` selbst als
ES-Modul und meldet dabei je Testlauf die Warnung
`MODULE_TYPELESS_PACKAGE_JSON`. Sie ist harmlos. Weg ist sie mit
`"type": "module"` — dann gilt der Absatz oben (Hooks müssen ohne
`require` auskommen oder `.cjs` heißen; über die Workforce angelegte
Projekte haben `.cjs`-Hooks).

## Lokaler Secret-Scan

`check-gates` scannt den Arbeitsbaum mit gitleaks — direkt, wenn
`gitleaks` im PATH liegt, sonst per Docker. Ist keins von beiden da,
erscheint ein gelber Hinweis („Secret-Scan NICHT gelaufen“), und Funde
zeigt erst die CI. Testattrappen für Geheimnisse werden zur Laufzeit
zusammengesetzt, nie als Literal geschrieben — keine Allowlist.
