# Journal — F4

Anhängeprotokoll. Neue Einträge unten anfügen, bestehende nicht ändern.

## 2026-08-31 — Akte, Plan v1, Advisor-Pass, Plan v2

`features/F4/feature.md` erstellt (Ziel/Scope/Nicht-Ziele/Akzeptanzkriterien
aus `docs/projekt/zielfassung.md` §16.2/§16.4/§9.4 E-182–E-188 und
`ARCHITECTURE.md` §3 abgeleitet), `Status: READY_FOR_TECH`. Dependency F3
(`src/authorization-boundary/`) erfüllt und gemergt, Dependency F1B
(`schreibeWirkungsmarke`) erfüllt.

`state/plan-v1-f4-invocation-policy.md`: eigenständiges Modul
`src/invocation-policy/` (D1, §16.2 führt Invocation Policy als eigene
Modul-Tabellenzeile), zwei getrennte Schemas (Baseline E-183,
Wirksamkeitsnachweis E-188), Wirksamkeitsnachweis als Funktionsparameter
statt fest verdrahtetem Lesepfad (Design-Entscheidung 3 — §16.8 Punkt 3/8
bleiben bewusst offen). Vier offene Unsicherheiten benannt: additiver
F3-`export`-Bedarf, Form von `berechtigungskontext`, Ablageort der
Wirksamkeitsnachweis-Instanz, Eingabeformat `pruefeAufrufparameter`.

Advisor-Pass (`architecture-advisor`, frischer Kontext,
`state/advisor-findings-f4-invocation-policy.md`): **Freigegeben mit
Hinweisen.** Kein Blocker, keine Umbau der Modul-/Schema-Struktur nötig.
Zwei Findings vor dem Bau verbindlich zu klären: **F11** — fehlende
Hash-Querkonsistenz zwischen Bedingung 1 (`istZustand`) und Bedingung 2
(unabhängig übergebener `istGueltigkeitsschluessel`) hätte einem Aufrufer
erlaubt, beide Bedingungen mit zueinander passenden, aber veralteten
Hash-Ständen zu bestehen — widerspricht AC22 direkt. **F3** — Ablageort der
künftigen Wirksamkeitsnachweis-Instanz trägt keine D16-analoge
Schreibschutz-Auflage. Weitere Findings (F6/F7 Berechtigungskontext, F6
Export-Umfang F3, F12 Pfadvergleichssemantik) als „dürfen mitlaufen"
eingestuft.

`state/plan-v2-f4-invocation-policy.md`: Delta 1 löst F11
(`pruefeStartbedingung2` leitet die Hash-Felder des Gültigkeitsschlüssels
aus demselben, in Bedingung 1 bereits gemessenen `istZustand` ab, statt
einen zweiten, unabhängigen Parameter entgegenzunehmen — neuer
Pflicht-Kalibrierungstest). Delta 2 löst F3 (D16-analoge
Schreibschutz-Auflage für die künftige Ablageort-Entscheidung des
Wirksamkeitsnachweises, siehe Nachtrag unten). Delta 3 entscheidet den
Export-Umfang von F3 bereits in der Planungssitzung (drei einzelne additive
Exporte statt einer vom Advisor vorgeschlagenen gebündelten
Verifikationsfunktion — hielte den F3-Diff nicht minimal, F3 ist bereits
abgeschlossen und gate-geprüft).

Handoff-Vertrag `state/tasks/f4-invocation-policy.md` angelegt, plan-v2s
drei Deltas wörtlich aufgenommen. Kein Produktcode in diesem Schritt.

### Nachtrag — D16-analoge Auflage für die künftige Wirksamkeitsnachweis-Ablageort-Entscheidung (plan-v2 Delta 2)

Wo immer die Wirksamkeitsnachweis-Instanz später abgelegt wird, muss der
Ort D16-analog vor dem Ausführungswerkzeug geschützt sein (extern oder
commit-gepinnt gelesen, nie aus dem Arbeitsbaum dieses Produkt-Repos, das
dieses Werkzeug selbst schreiben kann). Diese Auflage bindet die **spätere**
Ablageort-Entscheidung (F6 oder ein eigener Vertrag), nicht diese Akte — F4
trifft die Ablageort-Entscheidung nicht (Design-Entscheidung 3 bleibt
inhaltlich unverändert: Parameter, kein fest verdrahteter Lesepfad). Ein
Ablageort, der dem geprüften Werkzeug Schreibzugriff auf die
Nachweis-Instanz gibt, würde Startbedingung 2 (E-188) wertlos machen und
erfüllt diese Auflage nicht.

## 2026-08-31 — Ausführung

Vertrag `state/tasks/f4-invocation-policy.md` umgesetzt. SCHRITT-0-Prüfung:
Arbeitsverzeichnis stimmte, Branch nicht (`docs/findings-batch-p1-nachtrag`
statt `feature/f4-invocation-policy`) — Stefan gefragt, wie zu verfahren
sei: lokale `main` war zwei Commits hinter `origin/main` (PR #32, keine
eigenen `main`-Commits), erst per Fast-Forward aktualisiert
(`git fetch origin`, `git checkout main`, `git merge --ff-only origin/main`
→ `d6c6a04..ceb23c6`), danach `feature/f4-invocation-policy` von diesem
aktuellen `main` abgezweigt. Die fünf untracked Vertrags-Grundlagendateien
blieben dabei im Arbeitsverzeichnis erhalten.

Neues, eigenständiges Modul `src/invocation-policy/{index,types,
verbotene-aufrufparameter}.ts` (D1, kein F1B-Touch). `pruefeStartbedingung1`
liest die Baseline über F3s additiv exportierte `leseAusCommit`/
`gitattributesPinntZeilenenden`/`leiteRepoRelativenPfadAb`
(`src/authorization-boundary/index.ts` — rein additiver `export`, keine
Signatur-/Verhaltensänderung, sechs bestehende `authorization-boundary.
test.ts`-Fälle real gegengeprüft, unverändert grün). `pruefeStartbedingung2`
baut den zu vergleichenden Gültigkeitsschlüssel aus demselben `istZustand`
wie Bedingung 1 (Delta 1/F11-Fix). Neue Schemas
`kontrollzustand-invocation-policy-baseline-payload.schema.json` und
`...-wirksamkeitsnachweis-payload.schema.json` + vier Beispieldateien,
neues Gate `scripts/check-f4-invocation-policy.mjs`, sechs `node:test`-Fälle
in `invocation-policy.test.ts` (AC10 Fall 1–4, F11-Querkonsistenz, AC7).

Drei Executor-Entscheidungen getroffen und dokumentiert (Details im
Ausführungsbericht dieser Sitzung, nicht in diesem Journal dupliziert):
Berechtigungskontext bleibt opaker, durchgereichter Wert (F6/F7 — keine
eigene Materialisierung, außerhalb des in plan-v1/plan-v2 abgesteckten
Rahmens); `arbeitsverzeichnis_pfad` wird trenner- und
groß-/kleinschreibungsnormalisiert verglichen (F12, fail-closed); Eingabeformat
`pruefeAufrufparameter(parameter: string[])` unverändert übernommen.

Während des Baus zeigte sich eine Spannung zwischen SCOPE.7 (Testfixture
braucht `execFileSync('git', ...)` für ein Wegwerf-Repo, analog F3s
Testdatei) und SCOPE.8(d)s AC8-Grep (`src/invocation-policy/*.ts` ohne
Ausnahme) — eine ungefilterte Prüfung hätte die legitime Test-Fixture
fälschlich als Befund gemeldet. AC8 (`feature.md`) verbietet wörtlich das
Starten „eines Kindprozesses **des zu prüfenden Werkzeugs**" — die
Testdatei startet nie das geprüfte Werkzeug, nur `git` für den
Fixture-Aufbau. Gate-Skript entsprechend auf die Produktionsdateien des
Moduls beschränkt (`*.test.ts` ausgenommen), im Skript selbst begründet
kommentiert — keine SCOPE/NICHT-Verletzung, sondern eine
Grep-Ziel-Präzisierung im Sinne von AC8s eigenem Wortlaut.

Kalibrierung real durchgespielt: für jeden der fünf `invocation-policy.
test.ts`-Fälle (AC10 Fall 1–4 + F11) ein isolierter, temporärer
Code-Eingriff (`TEMP-ROT-FALL A`–`E`), Fehlschlag beobachtet, exakt der
erwartete Test schlägt fehl, danach zurückgenommen
(`grep -rn "TEMP-ROT-FALL" src/` liefert am Ende keinen Treffer). Gate-Skript-
Rot-/Grün-Fälle über echte, manipulierte Fixtures (F3-Muster, kein
Code-Eingriff nötig). Volle Konsolen-Ausgabe im Ausführungsbericht dieser
Sitzung, Gate-Zeile in `state/gates.md` mit demselben Beleg.

`npm run check` und `npm run check:template` grün (Konsolen-Ausgabe im
Ausführungsbericht). Kein Commit, kein Push in diesem Schritt — Vertrag
endet mit Diff-Vorlage und wartet auf Freigabe.

## Status
- [ ] Freigegeben
- [x] Freigegeben mit Hinweisen
- [ ] Nicht freigegeben
- [ ] Blockiert

## Nächster sinnvoller Schritt
`git status` prüfen, Diff zur Freigabe zeigen, `state/freigabe-commit.md`
abwarten, dann committen (gezielte Pfade, `git-flow`-Skill) und pushen.
