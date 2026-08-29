# Journal — F2

Anhängeprotokoll. Neue Einträge unten anfügen, bestehende nicht ändern.

## 2026-08-29 — Akte angelegt (Nachtrag, retroaktiv)

`features/F2/feature.md` aus `docs/projekt/zielfassung.md` (Abschnitt
16.2, Modulschnitt „Artifact Registry / Lineage") und
`docs/projekt/umsetzungsplan-fassung-1.md` (Deliverable 1, Feature #2)
erstellt, `Status: READY_FOR_TECH`.

## 2026-08-29 — plan-v1, Advisor-Pass, plan-v2

`state/plan-v1-feature2-artifact-registry-lineage.md`: eigener
Dateibaum unter `kontrollzustand/<artefakt_id>/`. Advisor-Pass
(`architecture-advisor`, `state/advisor-findings-feature2-artifact-
registry-lineage.md`): **NICHT FREIGEGEBEN** — B1 (Architekturkonflikt
mit `ARCHITECTURE.md` Zeile 39–41: Schreibzugriff auf `kontrollzustand/`
ausschließlich über die Checkpoint-Store-Hash-Kette) und B4 (fehlende
Testdatei) blockierend, B2/B3 bestätigt. `state/plan-v2-feature2-
artifact-registry-lineage.md`: Delta 1 löst B1 auf Basis von Stefans
Entscheidung Option A — Lineage-Einträge sind Checkpoints, `lauf_id =
lineage-<artefakt_id>`, keine eigene Versionierung (Version = Checkpoint-
`sequenz`), neue F1-Erweiterung `ladeGueltigeCheckpoints`. Delta 2 löst
B4 (`lineage-registry.test.ts`, sechs Fälle). Delta 3 schärft die
Zuschnitt-Bewertung nach: F1-Touch zuerst, dann Lineage-Modul.

## 2026-08-29 — Handoff-Vertrag

`state/tasks/f2-artifact-registry-lineage.md`: sieben Pflichtsektionen,
SCHRITT 0 wörtlich. Endet mit Freigabe-Halt.

## 2026-08-29 — Freigabe, ESCALATE (main veraltet), Handoff-Vertrag ausgeführt

Stefans erste Freigabe nannte main als bereits aktuell; eigene
Verifikation (`git branch --contains`, `git show main:...`) zeigte main
noch nicht gemergt (nur der Feature-Branch trug `ladeGueltigeCheckpoints`)
— ESCALATE-Fall aus dem Vertrag ausgelöst, angehalten, gemeldet, nichts
selbst gemergt. Stefan bestätigte danach: lokaler Stand war veraltet,
`origin/main` HEAD `0f303e8` (Merge PR #22) trägt `ladeGueltigeCheckpoints`
real (verifiziert über `git fetch origin main` + Grep). Lokaler `main`
per Fast-Forward aktualisiert, `feature/f2-artifact-registry-lineage`
davon abgezweigt.

Vertrag danach vollständig gebaut: `schemas/kontrollzustand-lineage-
payload.schema.json`, sieben Fixtures unter `schemas/examples/
kontrollzustand-lineage*.json` (real errechnete Hashes), `src/lineage-
registry/{types,index,lineage-registry.test}.ts` (sechs `node:test`-
Fälle), `scripts/check-lineage-registry.mjs` (eingehängt in `npm run
check` und `npm run check:template`, direkt nach
`check-checkpoint-store.mjs`).

Budget-Empfehlung aus plan-v2 Delta 3 befolgt: zuerst isolierter
Smoke-Test gegen `ladeGueltigeCheckpoints` (`registriereKernArtefakt` +
`ladeArtefaktVersion`, Wegwerfskript, sofort gelöscht), erst danach der
restliche Modulumfang.

Alle Kalibrierungen real durchgeführt und zurückgenommen: sieben
Gate-Fixtures (vier Invalid-Beispiele temporär in eine `valid.json`-
Position kopiert, benannte Regelverletzung beobachtet, Original per
`.bak` wiederhergestellt) und für die `lineage-registry.test.ts`-Fälle 3
(Byte-Snapshot) und 4 (STALE-Filterung) je ein echter, temporärer
Codeeingriff in `src/lineage-registry/index.ts` (Fall 4: STALE-Filter
durch `filter(() => true)` ersetzt; Fall 3: künstliche Mutation der
Geschwister-Checkpoint-Datei nach dem zweiten Schreibvorgang), Fehlschlag
beobachtet, zurückgenommen — Belege in `state/gates.md`.

`npm run check` und `npm run check:template` am Ende grün (13/13 Tests,
keine Lint-/Typecheck-Befunde außer der vorbestehenden Biome-
`recommended`-Deprecation-Info). `features/F2/feature.md` auf
`Status: ABGESCHLOSSEN` gesetzt.
