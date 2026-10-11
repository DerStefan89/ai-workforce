# Gate-Vorlage Node/TypeScript

Wann: bei der Stack-Entscheidung, sobald feststeht, dass das Projekt auf Node
mit TypeScript (oder JavaScript) läuft. Wer sie anwendet: die Architektur-
Rolle bzw. der Mensch, der den Stack festlegt. Andere Stacks: eigene Gates
über den Skill `werkzeug-auswahl` — diese Vorlage gilt nur für Node/TS.

Bis die Vorlage angewendet ist, ist `npm run check` absichtlich rot:
`scripts/check-gates.mjs` meldet die Platzhalter in `package.json`
(`[PLATZHALTER]`) und verweist hierher. Das ist fail-closed, kein Fehler.

## Was danach gilt

`npm run check` führt in dieser Reihenfolge aus:

| Gate | Befehl | rot, wenn |
|---|---|---|
| Mindest-Gates | `node scripts/check-gates.mjs` | Platzhalter, Audit-Befund (high/critical), Secret-Fund, abstürzender Hook |
| Lint | `eslint .` | Lint-Fehler |
| Typprüfung | `tsc --noEmit` | Typfehler |
| Doku/Regeln/Vertrag | `check-docs`, `check-rules`, `check-contract` | siehe dort |
| Tests mit Untergrenze | `node scripts/tests-mit-untergrenze.mjs <N>` | Fehlschlag oder weniger als N bestandene Tests |

## Schritte

1. Werkzeuge installieren (Versionen pinnt das Projekt in `package.json`,
   nicht diese Vorlage):

   ```
   npm install --save-dev eslint @eslint/js typescript-eslint globals typescript @types/node
   ```

   Die entstehende `package-lock.json` committen — erst dann läuft der
   Abhängigkeits-Scan (`npm audit --audit-level=high`) in `check-gates`.
   Der Audit braucht Netz: offline ist `npm run check` rot („nicht
   ausführbar“) — nicht gelaufen gilt nicht als grün.

2. `eslint.config.mjs` anlegen:

   ```js
   import js from '@eslint/js'
   import globals from 'globals'
   import tseslint from 'typescript-eslint'

   export default tseslint.config(
     { ignores: ['node_modules/**', 'dist/**', 'coverage/**', '.claude/**'] },
     js.configs.recommended,
     ...tseslint.configs.recommended,
     { languageOptions: { globals: globals.node } },
     { rules: { '@typescript-eslint/no-explicit-any': 'error' } },
   )
   ```

3. `tsconfig.json` anlegen (Node führt `.ts` direkt aus, ohne Build-Schritt;
   `tsc` prüft nur):

   ```json
   {
     "compilerOptions": {
       "target": "ES2023",
       "lib": ["ES2023"],
       "module": "preserve",
       "moduleResolution": "bundler",
       "types": ["node"],
       "strict": true,
       "erasableSyntaxOnly": true,
       "allowImportingTsExtensions": true,
       "verbatimModuleSyntax": true,
       "noEmit": true,
       "skipLibCheck": true
     },
     "include": ["src/**/*.ts", "test/**/*.ts", "scripts/**/*.ts"]
   }
   ```

4. Skripte in `package.json` ersetzen (die drei Platzhalter):

   ```json
   "lint": "eslint .",
   "typecheck": "tsc --noEmit",
   "test": "node scripts/tests-mit-untergrenze.mjs 1"
   ```

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
