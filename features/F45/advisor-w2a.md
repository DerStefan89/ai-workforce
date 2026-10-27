# Advisor-Pass F45 W2a — Gates: Läufer + Inventur (Plan v1)

Stand 27.10.2026, Branch `f45/w2a-gates-laeufer`. Subagent `architecture-advisor`, frischer Kontext, nur Read/Grep/Glob.
Geprüft: `features/F45/plan-w2a.md`, `package.json`, `scripts/teste.mjs`, `scripts/messe-check.mjs`,
`src/aenderungsuebersicht/index.ts`, `src/pruefschritt/index.ts`, `startvorlagen/ai-workforce.json`,
`vorlagen/projekt-skelett/scripts/check-gates.mjs`, `docs/harness/HARNESS-OVERVIEW.md`, `.github/workflows/ci.yml`,
`biome.json`, `tsconfig.json`, `.gitignore`, `state/findings.md` (F-1205, F-1215, F-1220–F-1224),
`features/F45/nachweise/t/messung.md`; Stichproben per Grep in `scripts/check-*.mjs`.

**Grenzen der Prüftiefe:** kein Bash, kein git — kein Gate ausgeführt, `git show main:package.json` und `wc -l` nicht
aufgerufen, die 122 Einträge nicht selbst nachgezählt, die 120 Gate-Dateien nur per Muster durchsucht (fehlende Treffer
sind kein Beweis), Pipe-Pufferung von Node nicht nachgeschlagen.

## Pflichtfrage: Muss das existieren? Was ist die einfachste Lösung?

| Teil | Muss es existieren? | Einfachste Lösung / Urteil |
|---|---|---|
| Läufer insgesamt | **Ja.** Eine `&&`-Kette kann nicht parallel laufen; Auftrag 1 verlangt eine Quelle. | Alternativen: (a) Liste bleibt in `package.json`, Läufer zerlegt an `&&` wie `messe-check.mjs:53`; (b) `npm-run-all`/`concurrently`. (a) erlaubt keine Kommentare, SERIELL läge an zweiter Stelle; (b) ist eine neue Abhängigkeit, wo `teste.mjs` das Muster liefert. Der Plan ist die einfachste tragfähige Form. [Schlussfolgerung] |
| Parallelität N | **Ja.** Zweck: Σ 704 s seriell (`messung.md:15`). | Feste Zahl, per Umgebungsvariable änderbar. Einziger riskanter Teil, siehe A1. |
| SERIELL | **Ja.** Geteilte Ressourcen in der Repo-Wurzel (`startvorlagen/`, Läufe über den ganzen Baum). | Explizite Liste ohne Muster wie `teste.mjs:39`. Kriterien zu eng, siehe A1. |
| Ausgabe-Blöcke | **Ja**, sobald parallel läuft. | Je Gate puffern genügt; das Ausgabeende ist ungeklärt, siehe A2. |
| Zusammenfassung | **Teilweise.** Liste der roten Gates nötig; Wanduhr und Σ belegen den Gewinn. | **„Die fünf langsamsten“ kann entfallen.** |
| Exit-Codes 0/1/2 | 0/1 nötig; 2 wertet niemand aus (`src/pruefschritt/index.ts:201-209`: ≠ 0 ⇒ ROT). | 2 bleibt (Muster `teste.mjs:128/135/139`). |
| `AIW_GATES_PARALLEL` | **Ja**, laut Auftrag; einzige Ausweichmöglichkeit nach F-1205 ohne Codeänderung. | Ganze Zahl ≥ 1, sonst Exit 2. |
| Inventur | **Ja**, laut Auftrag; trägt die SERIELL-Liste. | „Kandidat W2b“ als Vorschlag (DEKLARIERT) kennzeichnen. |
| Änderung `messe-check.mjs` | **Ja, zwingend** — sonst misst `gateBefehle` (`messe-check.mjs:52-54`) den Läufer als ein Gate. | Wie im Plan. |

## Vor Umsetzung klären

**A1 — SERIELL-Kriterien enger als F-1215, gefährden „gleiche Urteile“.**
- [Fakt] F-1215 weist W2a zu: „git- und serverlastige Prüfungen grundsätzlich seriell bzw. stabil … keine Wartegrenzen
  ohne Zeitfaktor“ (`state/findings.md:9057`).
- [Fakt] Plan-Kriterium 3 erfasst nur Gates, die „Zeit gegen feste Grenzen messen“ (`plan-w2a.md:46-47`).
- [Fakt] Weitere Gates warten mit fester, kurzer Frist auf Server-/Workflow-Zustand mit Kindprozessen und laufen laut Plan
  parallel: `check-f656-pruefung-wiederholen.mjs:196-199` (2 s, ebenso `:250`, `:293`, `:339`, `:392`),
  `check-f659-review-korrektur-begruendung.mjs:270` (3 s), `check-f35-ws2-urteil-je-ak.mjs:251`, `:390` (3 s),
  `check-f45-b2b1-rueckweg.mjs:294`, `:606` (4 s), `check-f45-b2b2-pruefer.mjs:297` (4 s),
  `check-f45-b2b3c-budget.mjs:268`, `:527` (6 s/3 s), `check-f36-ws2-laufzeit.mjs:264/274` (10 s),
  `check-fixpaket-f36-nachlauf.mjs:250`, `:298` (10 s), `check-f35-ws3-adjust-automatik.mjs:83` (nicht geprüft).
- [Fakt] Kein Gate nutzt einen Zeitfaktor. [Fakt] `check-f36-ws5b-skill` fiel schon seriell einmal mit „fetch failed“ aus
  (`findings.md:9054`).
- [Schlussfolgerung] Dieselbe Fehlerklasse wie F-1186/F-1209/F-1210; bei N = 4 werden solche Gates fälschlich rot.
- Entscheidung: (a) **empfohlen** Kriterium erweitern auf „wartet mit fester Frist auf Server-/Workflow-/Kindprozess-Zustand“
  plus „echte git-/Server-Kette (F-1215)“; (b) N = 4 lassen, nach Ausfall nachtragen; (c) Standard N = 2. Inventur-Spalte
  Parallel-Risiko führt das Kriterium „Frist“.

**A2 — Das Ausgabeende liest der Workforce-Prüfschritt; der Plan legt es nicht fest.**
- [Fakt] `startvorlagen/ai-workforce.json:11`: Prüfbefehl `npm run check`. [Fakt] Prüfergebnis behält nur das Ende: stdout
  12 000 B, stderr 4 000 B (`src/pruefschritt/index.ts:123`, `:126`, `:241`); Regel 1f nimmt die letzten ≈ 40 Zeilen
  (`:175-179`).
- [Schlussfolgerung] In der Kette stand das rote Gate zuletzt; mit Weiterlaufen liegt es in der Mitte.
- [Offene Unsicherheit] Schreibt der Läufer stdout und stderr gemeinsam auf stdout, fehlen `console.error`-Zeilen im
  stderr-Teil.
- Vorschlag: stdout/stderr je Gate getrennt puffern und auf denselben Strom zurückgeben; Zusammenfassung ganz am Ende
  wiederholt je rotem Gate die letzten ≈ 20 Zeilen.

**A3 — Ausweichlösung bei Speichermangel wird schwerer.** [Fakt] `docs/harness/HARNESS-OVERVIEW.md:95-98` nennt
`npm run check:gates` als Ausweichlösung (F-1120); künftig vier Gates gleichzeitig. Stelle mit `AIW_GATES_PARALLEL=1`
ergänzen (PowerShell: `$env:AIW_GATES_PARALLEL=1; npm run check:gates`).

**A4 — Namenskollision `scripts/check-gates.mjs`.** [Fakt] `vorlagen/projekt-skelett/scripts/check-gates.mjs` existiert mit
anderer Bedeutung und ebenfalls exportiertem `fuehreGatesAus` (`:271`); genutzt von `scripts/check-secrets.mjs:19`,
`src/projekt-anlegen/nachruesten.ts:180-181`, `vorlagen/projekt-skelett/CLAUDE.md:44`,
`vorlagen/projekt-skelett/docs/harness/gate-vorlage-node.md:9/18`. Anderen Namen unter `scripts/check-*` wählen (z. B.
`scripts/check-kette.mjs`); 1j-Schutz bleibt gleich.

**A5 — Offener Punkt 1 stützt sich auf eine falsche Voraussetzung.** [Fakt] Eine JSON-Liste wäre ebenfalls geschützt
(`scripts/_gates.json` unter `scripts/_*`, `scripts/check-gates.json` unter `scripts/check-*`;
`src/aenderungsuebersicht/index.ts:399`, `:403`). Tragende Gründe für `.mjs`: Kommentare je SERIELL-Eintrag, eine Datei.
Entscheidung richtig, Begründung korrigieren.

## Läuft mit

- **B1** 1j geschlossen halten: der Läufer importiert nur `node:`-Module (ein Import aus `src/` wäre ungeschützt, 1j meldet
  nur Pfade der Standardliste, `index.ts:451`; `ai-workforce.json` hat keine `pruefketten_pfade`).
- **B2** Nebenfund (nächste freie Kennung F-1225): 1j schützt `scripts/teste.mjs` und `scripts/aufraeumen-nachlauf.mjs`
  nicht (passen auf kein Muster in `index.ts:398-408`). Nur als Finding eintragen.
- **B3** Test-Plan zeitabhängig: `fuehreGatesAus` mit injizierbarem Starter (Muster `laufe` in `teste.mjs:117`);
  Gleichzeitigkeit und SERIELL-Überlappung mit steuerbaren Promises deterministisch prüfen; echte Prozesse nur für Exit-Code
  über `shell: true` und stderr im Block.
- **B4** Zusätzlich prüfen: Import ohne Wirkung (messe-check importiert dynamisch), Ende per Signal rot, Startfehler rot.
- **B5** Hängendes Gate: Startzeile je Gate (`▶ <befehl>`); Timeout bleibt Nicht-Ziel.
- **B6** Abbruch unter Windows: `kind.kill()` trifft bei `shell: true` nur `cmd.exe`; bei der Zeitgrenze des Prüfschritts
  (`ai-workforce.json:12`, 900 000 ms) können bis zu vier Gate-Bäume verwaisen. Im Kopf DEKLARIERT, keine Behandlung.
- **B7** Folgefehler nach Rot: Reste eines rot abgebrochenen Gates (z. B. `startvorlagen/test-f14-ws4-zeitgrenze.json`,
  `check-f10-leitstand.mjs:820`) können später laufende Gates rot färben (f16 (e), `check-f16-codex-gateway.mjs:340`).
  „Urteil je Gate gleich“ gilt nur für Gates, die vorher auch gelaufen wären; Hinweis „erstes rotes Gate zuerst lesen“.
- **B8** N = 4: [Offene Unsicherheit] vCPU des GitHub-Runners. Commit-Block: ein Lauf mit `AIW_GATES_PARALLEL=1` und drei
  mit Standard, Urteile und Wanduhr in den Nachweis (Pflicht, falls A1 = (b)).
- **B9** F-1205 betrifft `npm run test`; bleibt offen.

## Entlastende Befunde

- **E1** [Fakt, entlastend] `messe-check.mjs:75` startet jedes Gate bereits mit `spawn(befehl, { shell: true, stdio:
  ['ignore','pipe','pipe'] })` — alle 122 liefen so grün (`messung.md:9-10`).
- **E2** [Schlussfolgerung, entlastend] `shell: true` nutzt dieselben Shells wie `npm run` (cmd.exe/`sh -c`); Gates erben
  `PATH` mit `node_modules/.bin` und `npm_*`; Befehlsstring ohne Argument-Array ⇒ keine DEP0190.
- **E3** [Fakt, entlastend] Kein Gate wertet TTY/stdin aus (`isTTY`, `process.stdin`, `FORCE_COLOR`, `NO_COLOR` nur in
  Tests und `rueckfrage-mcp.mjs:161`); ohne TTY entfallen nur Farben. [Offene Unsicherheit] `process.exit()` nach großer
  Ausgabe auf eine Pipe kann unter POSIX Text verlieren — nur Ausgabe, gilt in der CI schon heute.
- **E4** [Schlussfolgerung, entlastend] Keine Abhängigkeit zwischen Gates gefunden; Schreiber nach `features/`, `docs/`,
  `state/`, `kontrollzustand/` arbeiten in `mkdtemp`; Gruppe 2 (`startvorlagen/`) vollständig, einziger Leser des ganzen
  Ordners `check-f16-codex-gateway.mjs:340`.
- **E5** [Fakt, entlastend] git im echten Repo nur lesend (`ls-files`, `rev-parse`, `show`, `merge-base`), kein
  `index.lock`. [Offene Unsicherheit] git-Nutzung der `src`-Funktionen hinter `repoWurzel = process.cwd()` nicht verfolgt
  (`check-f15-workflow.mjs:476`, `check-f23-abnahme.mjs:190`, `check-f39-architekt.mjs:486/866`,
  `check-f652-pruefschritt.mjs:157`, `check-f11-auftrag.mjs:278`).
- **E6** [Fakt, entlastend] Feste Ports nur als Daten in Lock-Fixtures; feste tmp-Namen werden nicht angelegt; einziger
  Home-Vergleich `check-f45-f3b1-freigabe.mjs:317/777` steht in SERIELL.
- **E7** [Fakt, entlastend] `lint`/`typecheck` können parallel laufen (`biome.json:4`, `tsconfig.json:16` schließen die
  Reste-Ordner aus).
- **E8** [Fakt, entlastend] Kein anderer Code liest die Kette (nur `messe-check.mjs:53`); CI kennt sie nicht (`ci.yml:40`).
  `routen-harness.mjs:130` zählt `check-*.mjs` und zählt den Läufer mit — schon heute ungenau, unkritisch.
- **E9** [Fakt, entlastend] 1j bleibt erhalten (`scripts/check-*`, `index.ts:399`); Einschränkung B1.

## Offene Punkte des Plans

1. Liste in `.mjs`: Zustimmung, Begründung korrigieren (A5). 2. N = 4: vertretbar mit A1 und B8. 3. Weiterlaufen nach
Rot: Zustimmung mit B7 und A2. 4. Repo-Baum-Läufer seriell statt `mkdtemp`-Umbau: Zustimmung (W2b). 5. lint/typecheck als
„Invariante“: Zustimmung.

## Urteil

**Freigegeben mit Hinweisen.** Vor Umsetzung im Plan festlegen (kein neuer Advisor-Pass bei Entscheidung wie empfohlen):
A1 (Entscheidung Stefan/Challenger), A2, A3, A4, A5. Bei A1 = (b) ist der Commit-Block mit drei Läufen nach B8 Pflicht.

## Status
- [ ] Freigegeben
- [x] Freigegeben mit Hinweisen
- [ ] Nicht freigegeben
- [ ] Blockiert
