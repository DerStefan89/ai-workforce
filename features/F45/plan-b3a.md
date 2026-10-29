# F45 B3a — Qualitätsprinzipien ins Projekt-Skelett und in die Rollen (Plan v1)

**Auftrag:** Bauauftrag F45 B3a (Challenger, 29.10.2026), Entscheidung Stefan **E-W2-1** (25.10.2026). Basis `main`
2f3ef97 (#394), Branch `f45/b3a-qualitaet-skelett`. Design & Motion ist B3b, nicht B3a.

## Briefing

1. **Ziel:** Ein neues Projekt aus `vorlagen/projekt-skelett/` hat nach der Gate-Vorlage Node/TS dieselben harten Grenzen
   wie die Workforce nach W2c-1 (Biome recommended, Komplexität 15, `noExplicitAny`, Formatierer, Dateigrenze 800,
   Typprüfung auch für `.js`/`.mjs`) — ohne Ratsche, weil es keinen Bestand gibt. Advisor und Reviewer fragen
   „Muss das existieren? / Einfachste Lösung? / Was kann weg?“.
2. **Referenz:** `biome.json` der Workforce (Formatierer-Stil), `scripts/check-ratsche.mjs` (Zeilenzählung wie `wc -l`),
   bestehende Gate-Vorlage `vorlagen/projekt-skelett/docs/harness/gate-vorlage-node.md`.
3. **Module/Dateien:**
   - Skelett: `docs/harness/gate-vorlage-node.md` (neu geschrieben), `scripts/check-dateigroesse.mjs` (neu),
     `package.json` (`check`), `CLAUDE.md` (zwei kurze Stellen), `.claude/agents/architecture-advisor.md`,
     `.claude/agents/code-reviewer.md`, `HERKUNFT.md`.
   - Workforce: `.claude/agents/architecture-advisor.md`, `.claude/agents/code-reviewer.md` (byte-gleich mit dem Skelett),
     `scripts/skelett-check-dateigroesse.test.mjs` (neu), `scripts/ratsche.json` (`formatiert` +1),
     `state/findings.md` (F-1249), `features/F45/feature.md`, `docs/projekt/fixpaket-f45.md`,
     `features/F45/nachweise/b3a/probelauf.md`.
   - Kein Daten- oder Serverbedarf.
4. **Zustände:** Skelett frisch (keine Code-Dateien): `check-dateigroesse` grün, `check` rot an `check-gates` (Platzhalter,
   unverändert fail-closed). Nach Gate-Vorlage, sauber: `npm run check` grün. Fehler: Komplexität > 15, unformatiert,
   `any`, Datei > 800 Zeilen ⇒ rot mit Pfad. Leer: kein Code ⇒ grün.
5. **Akzeptanzkriterien:** siehe „Nachweis“ unten; dazu alle Gates und Tests aus „Prüfung“ grün,
   `check-skelett-herkunft` grün mit nachgezogenen Prüfsummen.
6. **Risiken:** siehe unten (Harness-Bestand im neuen Projekt, Projektkarte, Biome-Version).

## Vorab-Probe (Fakt, Wegwerf-Kopie unter os.tmpdir(), 29.10.2026)

Skelett kopiert, Biome der Workforce mit recommended + Komplexität 15 als error + Workforce-Formatierer, `biome check .`:
**16 Fehler**, alle im mitgelieferten Harness — `.claude/hooks/*.js` (`useNodejsImportProtocol`, `noGlobalIsNan`,
`useTemplate`, Formatierung), `.claude/settings.json` (Formatierung), `scripts/check-*.mjs` und
`tests-mit-untergrenze.mjs` (Formatierung, `organizeImports`, `check-gates.mjs:205` Komplexität). `tsc` mit
`allowJs`/`checkJs` über `scripts/**`: **62 Fehler** in `check-docs.mjs`, `check-gates.mjs`, `check-rules.mjs`,
`tests-mit-untergrenze.mjs`. Ohne Gegenmaßnahme ist jedes neue Projekt nach der Vorlage sofort rot.

**Folge (Entscheidung im Plan):** Biome und tsc nehmen die mitgelieferten Harness-Dateien ausdrücklich aus (`.claude/`,
`scripts/check-contract.mjs`, `check-docs.mjs`, `check-gates.mjs`, `check-rules.mjs`, `tests-mit-untergrenze.mjs`). Grund:
sie sind Bestand des Templates (Prüfsumme in HERKUNFT, Nachrüsten kopiert sie byte-gleich), kein Projektcode;
Umformatieren würde Template-Drift erzeugen und die Hooks berühren (Startfreigabe). Das ist keine Ratsche, sondern eine
benannte, feste Liste. `scripts/check-dateigroesse.mjs` ist neu und wird sauber geschrieben — es steht NICHT auf der Liste
und ist im Probelauf selbst unter Lint, Formatierer und `checkJs`. Die Dateigrenze zählt alle Code-Dateien einschließlich
Harness (alle < 800 Zeilen, größte `check-docs.mjs` 340).

## Umsetzung

### 1 Gate-Vorlage auf Biome (`docs/harness/gate-vorlage-node.md`)

- Tabelle „Was danach gilt“: Dateigrenze (`node scripts/check-dateigroesse.mjs`, rot ab 801 Zeilen) neu, Lint
  `biome check --error-on-warnings .` (Lint, Formatierer, Import-Ordnung), Typprüfung `tsc --noEmit` inkl. `.js`/`.mjs`.
- Schritt 1 Installation: `npm install --save-dev --save-exact @biomejs/biome@<Version> typescript @types/node`, mit dem
  Satz „`<Version>` = die `@biomejs/biome`-Version in der `package.json` der Workforce (gleiche Regeln, gleiche Befunde);
  Versionen stehen nur in der Paketdatei“. Keine Versionsnummer in der Vorlage (Regel „keine Versionsnummern in Prosa“).
- Schritt 2 `biome.json`: `$schema` relativ auf `./node_modules/@biomejs/biome/configuration_schema.json` (versionsfrei,
  passt immer zur installierten Version); `files.includes` `["**", "!.claude", "!scripts/check-contract.mjs", …]`;
  Formatierer wie Workforce (2 Leerzeichen, Breite 120, lf; `quoteStyle` single, `semicolons` asNeeded, `trailingCommas`
  es5, `arrowParentheses` always); Linter `preset: recommended`, `noExcessiveCognitiveComplexity` error/15,
  `noExplicitAny` error. Ein Satz zur Ausnahmeliste (Harness-Bestand, nicht erweitern für Projektcode).
- Schritt 3 `tsconfig.json`: bisherige Optionen + `allowJs`, `checkJs`; `include: ["**/*"]`,
  `exclude: ["node_modules", "dist", "coverage", ".claude", <Harness-Skripte>]` — erfasst Code in jedem Ordner, nicht nur
  `src/`/`test/`/`scripts/`.
- Schritt 4 Skripte: `"lint": "biome check --error-on-warnings ."`, `"typecheck": "tsc --noEmit"`, `"test"` unverändert
  mit Untergrenze; dazu „Formatieren: `npx biome check --write .`“ als Hinweis.
- Schritt 5 (bestehend, geschärft): CI-Schritt „Harness-Selbstprüfung“ in `.github/workflows/ci.yml` von
  `npm run check:template` auf `npm run check` umstellen, sobald die Vorlage angewandt und `npm run check` lokal grün ist;
  mit Lock-Datei `npm ci`. Startvorlage `pruefbefehl` wie bisher. (Fakt: der Schritt steht schon in der Vorlage, Punkt 5;
  er bleibt, wird nicht doppelt angelegt.)
- ESLint-Anleitung entfällt; ein Satz: „ESLint (mit typescript-eslint) statt Biome nur, wenn das Projekt Plugins braucht,
  die Biome nicht hat (z. B. Framework-Regeln); dann dieselben Grenzen dort einstellen.“
- Abschnitte „ES-Module und Hooks“ und „Lokaler Secret-Scan“ bleiben.
- Abweichung vom Wortlaut des Auftrags (benannt): `--error-on-warnings` an `biome check .` — Biome meldet einige
  recommended-Regeln nur als Warnung (Exit 0); ohne den Schalter wäre die Grenze für sie weich. Die Workforce lintet mit
  demselben Schalter (`package.json` `lint`).

### 2 Dateigrenze (`scripts/check-dateigroesse.mjs`, Skelett, neu)

- Nur `node:`-Importe. Läuft rekursiv ab Arbeitsverzeichnis, überspringt `node_modules`, `.git`, `dist`, `build`,
  `coverage`. Code-Endungen: `.ts .tsx .mts .cts .js .jsx .mjs .cjs`. Zeilen wie `wc -l` (Anzahl `\n`; eine letzte Zeile
  ohne `\n` zählt mit).
- `GRENZE = 800`; `> 800` ⇒ Liste „Pfad: n Zeilen (Grenze 800)“, Exit 1; sonst eine grüne Zeile, Exit 0.
- `AUSNAHMEN` als leere Map im Skript, Kommentar „nur mit Begründung: ['pfad', 'Grund']“.
- Exportiert `zaehleZeilen(text)` und `pruefeDateigroessen(wurzel, ausnahmen)`; Haupteinstieg nur bei direktem Aufruf.
- Biome-sauber (Workforce-Formatierer), `checkJs`-sauber (JSDoc-Typen), Komplexität ≤ 15, Datei-Header nach
  Kommentar-Standard.
- Skelett-`package.json` `check`: `node scripts/check-dateigroesse.mjs && node scripts/check-gates.mjs && …` — vorne, damit
  die Grenze schon vor der Gate-Vorlage wirkt (danach stoppt `check` an `check-gates`). `check:template` unverändert.
  (Fakt: `nachruesten.ts:180` verlangt nur, dass `check` `check-gates` enthält, nicht vorne.)
- Test in der Workforce `scripts/skelett-check-dateigroesse.test.mjs` (Muster `skelett-check-gates.test.mjs`, Wegwerf-Ordner
  über `scripts/_wegwerf.ts`): 800 grün, 801 rot, letzte Zeile ohne `\n`, `node_modules` übersprungen, Nicht-Code
  ignoriert, Ausnahme greift, echtes Skelett grün, Exit-Codes per `spawnSync` (0/1). Dazu eine Zusicherung „die beiden
  Agent-Dateien sind in Workforce und Skelett byte-gleich“ (gleicher Wortlaut ERZWUNGEN statt DEKLARIERT).

### 3 Pflichtfragen

- `architecture-advisor.md` (beide Orte, byte-gleich): neuer Abschnitt `## Pflichtfragen` nach den Instructions:
  „Muss das existieren?“, „Was ist die einfachste Lösung?“, „Was kann weg?“ — „jede bekommt im Urteil eine eigene
  Antwort mit Beleg; ‚nichts‘ ist eine Antwort, wenn begründet.“ Instruction 5 nennt die Antworten.
- `code-reviewer.md` (beide Orte, byte-gleich): unter `## Pruefkriterien` Gruppe `### Weglassen` mit einem Punkt
  „Was kann weg? Zeilen angeben, die gelöscht werden könnten (gelöschte Zeilen zählen positiv)“; im Ausgabeformat ein
  Abschnitt `## Was kann weg?` (`Datei:Zeilen — Grund`, oder „nichts“ mit Begründung). Folge (Fakt,
  `src/projektkarte/index.ts:264` `leseCheckliste`): der Punkt erscheint in der Projektkarte des Code-Reviewers im
  Workforce-Lauf und wird dort je Punkt geurteilt; Checkliste bleibt weit unter `GRENZE_CHECKLISTE` 3000.
- Skelett-`CLAUDE.md`: eine Zeile unter „Iterationsprinzip“: „Vorhandene Helfer zuerst suchen und nutzen, bevor neuer Code
  entsteht (Abschnitt ‚Bestehende Helper‘).“ Absatz unter „Befehle“ nennt Formatierer, Komplexitätsgrenze und
  `check-dateigroesse` (eine Zeile mehr).
- Grenze (DEKLARIERT): der Advisor-Schritt im Workforce-Lauf (`src/architecture-advisor/`) liest die Agent-Datei nicht —
  die Advisor-Pflichtfragen wirken dort erst, wenn sein Auftrag sie trägt (Workforce-Code, nicht im Umfang) ⇒ eigenes
  offenes Finding F-1250 (`HARNESS_IMPROVEMENT` P2), damit F-1249 erledigt sein kann.

### 4 HERKUNFT.md

- „Lokale Abweichungen“: Einträge B3a für `CLAUDE.md`, `package.json`, `docs/harness/gate-vorlage-node.md`, die zwei
  Agent-Dateien; „Lokal neu“ `scripts/check-dateigroesse.mjs`; Whitelist-Abschnitt „Nachgezogen in F45 B3a“.
- Prüfsummen per `node scripts/check-skelett-herkunft.mjs --ausgeben`; Spalte Herkunft: Agents `lokal geändert`,
  `check-dateigroesse.mjs` `lokal neu`.

### 5 Register und Akte

- `state/findings.md`: F-1249 `HARNESS_IMPROVEMENT` P2 „Projekt-Skelett ohne Komplexitätsgrenze, Formatierer und
  Dateigrenze; Rollen ohne Pflichtfragen“, Status erledigt (F45 B3a); F-1250 (siehe 3).
- `features/F45/feature.md`: V1b `erledigt`, Abgenommen 2026-10-29, Notiz „gemergt #394“; Zeile B3 ersetzt durch B3a
  (`fixpaket`, „Qualitätsprinzipien in Skelett und Rollen“, `laeuft`, 0,4–0,6, Begonnen 2026-10-29) und B3b (`design`,
  „Design & Motion in Fremdprojekten“, `geplant`, 1,4–1,55, Notiz „Inhalt wie fixpaket B3“); Reihenfolgesatz „V1 → B3a →
  B3b → R2“; Abschnitt `## Stand B3a`.
- `docs/projekt/fixpaket-f45.md` §3: Zeile B3 in B3a (neu) und B3b (Inhalt der bisherigen B3-Zeile) geteilt; Reihenfolge
  ab B5b-3 entsprechend.

### 6 Nachweis (Probelauf, Wegwerf-Kopie unter os.tmpdir())

Skelett kopieren (ohne HERKUNFT.md), `git init`; Vorlage anwenden, indem die Code-Blöcke aus `gate-vorlage-node.md`
maschinell gelesen werden (`biome.json`, `tsconfig.json`, Skripte) — so wird der Text der Vorlage geprüft, nicht eine
Abschrift; Werkzeuge in der Version der Workforce. Fälle: (1) sauber (`src/rechne.ts` + `test/rechne.test.ts`) ⇒
`npm run check` grün; (2) Komplexität > 15 ⇒ `npm run lint` rot; (3) unformatiert ⇒ lint rot; (4) 801 Zeilen ⇒
`check-dateigroesse` rot; zusätzlich (5) `any` ⇒ lint rot, (6) Typfehler in `.mjs` ⇒ typecheck rot. Ergebnis kurz in
`features/F45/nachweise/b3a/probelauf.md` (Befehle, Exit-Codes, Kernzeile der Ausgabe). Skript liegt im Scratchpad, nicht
im Repo. Bekannt: `npm audit` braucht Netz, gitleaks fehlt lokal ⇒ gelber Hinweis (kein Rot).

## Prüfung (E-PRUEF-2 B)

`npm run lint`, `npm run typecheck`, `npm run test`, `node scripts/erzeuge-lagebild.mjs --check`, `check-skelett-herkunft`,
`check-f42-projekt-harness`, `check-f41-projekt-anlegen`, `check-f45-b2a1-projektkarte`, `check-f45-b2a2-arbeitspaket`,
`check-f45-b2a3-codex-review` (liest code-reviewer.md), `check-f45-b2b3b2b2b2a-crlf` (Skelett-Zeilenenden),
`check-secrets`, `check-ratsche`, `check-docs`, `check-rules`, Akten-Gates (feature-planung, workboard); dazu die Tests,
die Skelett/Agents lesen (`skelett-check-gates`, `skelett-hooks`, `projektkarte`, `nachruesten`, `harness-abgleich`,
`check-secrets`).

## Nicht im Umfang

B3b (Design & Motion), design-guardian im Skelett, Ratsche im Skelett, Formatieren des Harness-Bestands im Skelett,
Workforce-Code (Advisor-Auftrag im Lauf ⇒ F-1250), Nachrüsten bestehender Projekte (sie bekommen
`check-dateigroesse.mjs` über `projekt:nachruesten`, `check` aber nicht automatisch), Messung (F30).

## Offene Punkte für den Advisor

- O1 Ausnahmeliste Harness in `biome.json`/`tsconfig.json` vs. Harness-Bestand formatieren/typisieren.
- O2 `--error-on-warnings` (Abweichung vom Wortlaut).
- O3 Biome-Version versionsfrei („Version der Workforce“) — nicht ERZWUNGEN.
- O4 Zusicherung byte-gleiche Agents im neuen Test — nötig?
- O5 F-1250 als eigenes Finding.
