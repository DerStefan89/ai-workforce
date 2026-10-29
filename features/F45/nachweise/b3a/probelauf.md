# F45 B3a — Probelauf Gate-Vorlage an einer Wegwerf-Kopie des Skeletts

**Stand:** 29.10.2026, Windows 11, Node 24, Branch `f45/b3a-qualitaet-skelett` (nach der Korrekturrunde).
**Ort:** Wegwerf-Ordner unter `os.tmpdir()` (`aiw-b3a-probe-*`), nicht im Repo. Das Probelauf-Skript lag im Scratchpad
der Sitzung, nicht im Repo.

## Vorgehen

1. `vorlagen/projekt-skelett/` kopiert (ohne `HERKUNFT.md`), `.gitignore` mit `node_modules/` und `kontrollzustand/`,
   `git init`.
2. Vorlage **maschinell aus `docs/harness/gate-vorlage-node.md` gelesen** — Installationsbefehl, `biome.json`,
   `tsconfig.json` und die drei Skripte sind die Code-Blöcke der Vorlage, keine Abschrift. Eingesetzt: `<Version>` = Biome
   der Workforce (`package.json`), `<Hauptversion>` = aus `engines` des Skeletts. Ausgeführt:
   `npm install --save-dev --save-exact @biomejs/biome@2.5.9 typescript @types/node@24` (mit Netz, Lock-Datei entsteht).
3. Sauberer Stand „Workforce-ähnlich“: `src/rechne.ts`, `test/rechne.test.ts`, kompaktes JSON in
   `kontrollzustand/lauf-1/checkpoint.json` (gitignoriert) und `startvorlagen/probe.json` (nicht gitignoriert).
4. Rot-Fälle je mit einer zusätzlichen Datei, danach entfernt.

## Ergebnis

| Fall | Befehl | Exit | Kernzeile |
|---|---|---|---|
| (0) leeres Projekt direkt nach der Vorlage, noch ohne Test | `npm run check` | 1 | `✗ Test-Gate: nur 0 Test(s) bestanden, Untergrenze 1` (Vorlage Schritt 4 sagt es) |
| (1) sauberer Stand | `npm run check` | 0 | Dateigrenze ✓, Mindest-Gates ✓ (`npm audit` ✓, gitleaks fehlt ⇒ ⚠ Hinweis, 5 Hooks ✓), Biome `Checked 4 files`, tsc ✓, Doku/Regeln/Vertrag ✓, `✓ Test-Gate: 1 Test(s) bestanden (Untergrenze 1)` |
| (2) Komplexität > 15 | `npm run lint` | 1 | `src\komplex.ts:1:17 lint/complexity/noExcessiveCognitiveComplexity` |
| (3) unformatiert (`"x";`) | `npm run lint` | 1 | `src\unformatiert.ts format` |
| (4) 801 Zeilen | `node scripts/check-dateigroesse.mjs` | 1 | `✗ src/lang.ts: 801 Zeilen (Grenze 800)` |
| (5) `any` | `npm run lint` | 1 | `src\any.ts:1:22 lint/suspicious/noExplicitAny` |
| (6) Typfehler in `.mjs` | `npm run typecheck` | 1 | `scripts/fehler.mjs(2,14): error TS2322` |
| (7a) ohne `.gitignore`, mit git | `npm run lint` | 0 | `Checked 4 files` (`node_modules` bleibt außen vor) |
| (7b) ohne `.gitignore` und ohne git | `npm run lint` | 1 | `Biome couldn't find an ignore file …` (fail-closed) |
| (7d) mit `.gitignore`, ohne git | `npm run lint` | 0 | `Checked 4 files` |
| (7c) unformatierte `.ts` in gitignoriertem `kontrollzustand/` | `npm run lint` | 0 | `Checked 4 files` (nicht geprüft) |
| (8) wieder sauber | `npm run check` | 0 | wie (1) |

Die vier von Biome geprüften Dateien in (1): `biome.json`, `src/rechne.ts`, `test/rechne.test.ts` und
`scripts/check-dateigroesse.mjs` — das neue Skelett-Skript besteht damit selbst Lint, Formatierer und (über tsc)
`checkJs`. Die Ausnahmen `!.claude` und die Harness-Skripte wirken (ohne sie wären die Hooks und Template-Skripte rot,
Vorab-Probe im Plan: 16 Biome-, 62 tsc-Befunde). Die JSON-Dateien des Laufs prüft Biome nicht (nur Code-Endungen).

## Grenzen

- Ein Lauf, eine Maschine (Windows). Die PR-CI (ubuntu) prüft das Skelett nicht in angewandter Form.
- `typescript` ohne Pin (Vorlage: Projekt pinnt in der Paketdatei); gelaufen mit der zum Zeitpunkt aktuellen Version.
- Nicht geprobt: Projekt mit `"type": "module"` (Vorlage Abschnitt „ES-Module und Hooks“ unverändert), `.tsx`/React
  (Vorlage nennt `jsx`/`DOM`), Monorepo.
- Der erste Lauf vor der Korrekturrunde (Fälle 1–8 ohne 0/7d) lief zusätzlich mit gleichem Ergebnis; dabei entfernte eine
  ältere Skriptfassung `.git` in der Wegwerf-Kopie per Shell-Befehl — nur im Temp-Ordner, danach durch Umbenennen ersetzt.
