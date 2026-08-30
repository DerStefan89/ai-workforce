# Journal — F9

Anhängeprotokoll. Neue Einträge unten anfügen, bestehende nicht ändern.

## 2026-08-30 — Akte angelegt, plan-v1

`features/F9/feature.md` aus dem Auftrag dieser Sitzung erstellt
(Ziel/Scope/Nicht-Ziele/Akzeptanzkriterien neu formuliert, kein
Vorgängertext im Repo), `Status: ENTWURF`. Grundlage:
`docs/projekt/zielfassung.md` Zeile 336/341 (Human-Transport-
Modulbeschreibung, „Transportpakete" bereits als vorgesehener
Kontrollzustand-Artefakttyp), `ARCHITECTURE.md:27/41/58`,
`docs/projekt/umsetzungsplan-fassung-1.md` Abschnitt 1/2 Deliverable 4.

`BEDARF_V0` real im Repo gesucht (`grep -ri BEDARF`, `specs/`-Verzeichnis
geprüft) — kein Vorgängerformat aus einer „F4-Übergabe" gefunden (F4,
Invocation Policy, ist laut `docs/STATUS.md` noch nicht gebaut). Format
in `state/tasks/f9-human-transport.md` Abschnitt 2.1 neu entworfen, wie
im Auftrag für diesen Fall vorgesehen. F-031 (im Auftrag als Beleg für
„automatische Werkzeugauswahl bewusst zurückgestellt" benannt) ebenfalls
gesucht — in `state/findings.md` (aktuell F-001 bis F-019) nicht
vorhanden; offen benannt statt stillschweigend unterstellt (plan-v1
Abschnitt 10, Punkt 3).

`state/tasks/f9-human-transport.md` erstellt: technischer Plan im
plan-v1-Format (Abschnitte 0–10), abweichend vom sonst üblichen
`state/plan-v1-<slug>.md`-Dateinamen, weil der Auftrag diesen Pfad
ausdrücklich vorgibt. Zentrale Design-Entscheidung: F9 ruft F1Bs
`schreibeWirkungsmarke`/`stelleLaufstatusFest`
(`src/checkpoint-store/index.ts:530/697`) und F2s
`registriereKernArtefakt`/`pruefeStale`
(`src/lineage-registry/index.ts:85/209`) ausschließlich von außen auf
(Muster wie F2 gegenüber F1, F3 gegenüber F1B) — kein F1B-/F2-Touch
nötig. `RUN_PREPARED` wird vor der Aushändigung des Transportpakets
geschrieben (Außenwirkung beginnt mit dem manuellen Verlassen des
Systems, nicht erst bei Rückkehr der Antwort), eine schemawidrige
importierte Antwort führt zu `FEHLGESCHLAGEN` (nicht `VERWEIGERT`) gemäß
`ARCHITECTURE.md:58`.

Ein offener Design-Punkt vor dem Bau festgehalten, nicht stillschweigend
entschieden: `pruefeStale` referenziert die zugrunde liegende
`BEDARF_V0`-Version über einen synthetischen (nicht dateisystem-echten)
`eingabe.pfad`-Schlüssel — technisch von F2s bestehendem Code gedeckt,
aber ohne Präzedenz in F2s eigenen Tests (plan-v1 Abschnitt 4, D2, und
Abschnitt 10, Punkt 1). Zur Leitstand-Erweiterung: der real vorhandene,
aber bewusst wegwerfbare F10-Prototyp
(`scripts/leitstand-server.mjs`, `public/leitstand/`) wird an
konkreten, bestehenden Stellen minimal erweitert (Zeilenverweise in
plan-v1 Abschnitt 2.6) statt neu gebaut.

Kein Produktcode in diesem Schritt (Auftragsvorgabe). Kein Advisor-Pass,
kein Handoff-Vertrag — beides ausdrücklich als nächster, nicht in
diesem Auftrag enthaltener Schritt benannt (plan-v1 Abschnitt 9).

## Status
- [ ] Freigegeben
- [ ] Freigegeben mit Hinweisen
- [ ] Nicht freigegeben
- [ ] Blockiert

## Nächster sinnvoller Schritt
Stefan klärt die Offenen Punkte in `state/tasks/f9-human-transport.md`
Abschnitt 10 (insbesondere Punkt 1, D2). Danach Advisor-Pass auf den
Plan, `state/advisor-findings-f9-human-transport.md`, ggf. plan-v2, dann
erst Handoff-Vertrag und Bau. `git status` prüfen, Diff zur Freigabe
zeigen, `state/freigabe-commit.md` abwarten, dann committen (gezielte
Pfade, `git-flow`-Skill) und pushen.

## 2026-08-30 — Advisor-Pass, vier Nachträge, Handoff-Vertrag

Advisor-Pass durchgeführt (`architecture-advisor`-Subagent, frischer
Kontext): `state/advisor-findings-f9-human-transport.md`, **Freigegeben
mit Hinweisen**. D2/D3 bestätigt, kein struktureller Mangel. Vier
Nachträge als bindend entschieden und in den Plan eingearbeitet: D6
(löst B3 — `pruefeStale: stale:true` blockiert die Weiterverwendung,
verlangt eine über F2s `haltFestStaleEntscheidung` festgehaltene
menschliche Entscheidung), B5 (benannte Hilfsfunktion
`baueAktuelleEingabeInhalte`, getrennt von `leseAktuelleEingaben`), B4
(F-031-Referenz aktualisiert — real in `state/findings.md` vorhanden,
P1, offen), B6 (D2-Formulierung zu `lineage-registry.test.ts`
abgeschwächt).

Bei B6s zweitem Teil (ARCHITECTURE.md-Zeilenverweis „41 → 40
korrigieren") widersprach die Auftragsvorgabe dem realen Dateiinhalt:
`ARCHITECTURE.md:41` trägt real den Satz „Artefakte werden versioniert,
nicht überschrieben", Zeile 40 den `profiles/`-Satz — die
Auftragsvorgabe wurde **nicht** übernommen, um keinen neuen Fehler
einzuführen; im Bauauftrag mit Beleg dokumentiert statt stillschweigend
ausgeführt.

Realer Gate-Konflikt entdeckt (nicht nur Prosa): `node
scripts/check-contract.mjs` gegen `state/tasks/f9-human-transport.md`
(dem Plan, an seinem ursprünglich vorgegebenen Pfad) lieferte 9
Befunde — das Vertrags-Gate behandelt jede `.md`-Datei unter
`state/tasks/` als Handoff-Vertrag. Stefan entschied: Plan nach
`state/plan-v1-f9-human-transport.md` verschieben (F1B/F3-Konvention),
statt das Gate-Skript zu ändern. Alle Querverweise (`feature.md`,
Bauauftrag) nachgezogen. `Status` in `features/F9/feature.md` von
`ENTWURF` auf `READY_FOR_TECH` angehoben (alle vier Pflichtabschnitte
vorhanden). Handoff-Vertrag geschrieben:
`state/tasks/f9-human-transport-bauauftrag.md` (Skill
`handoff-vertrag`). `check-contract.mjs`/`check-docs.mjs`/
`check-feature.mjs` danach real grün.

Kein Bau, kein Commit, kein Push in diesem Schritt — Vertrag endet mit
Freigabe-Halt.

## Status
- [ ] Freigegeben
- [ ] Freigegeben mit Hinweisen
- [ ] Nicht freigegeben
- [ ] Blockiert

## Nächster sinnvoller Schritt
Stefan gibt den Bauauftrag frei
(`state/tasks/f9-human-transport-bauauftrag.md`). Nach dem Bau: `git
status` prüfen, Diff zur Freigabe zeigen, `state/freigabe-commit.md`
abwarten, dann committen (gezielte Pfade, `git-flow`-Skill) und pushen.

## 2026-08-30 — Bauauftrag ausgeführt: Modul, Schemas, Gate, Tests, Leitstand-Erweiterung

`src/human-transport/{index,types}.ts` real gebaut: `erfasseBedarf`,
`befuelleWerkzeugAuswahl`, `erzeugeTransportpaket`, `haendigeAus`,
`validiereTransportantwort`, `importiereAntwort`,
`baueAktuelleEingabeInhalte` (B5), `pruefeUndEntscheideStale`/
`entscheideStale` (D6), `validiereBedarfDaten`/
`validiereTransportpaketDaten`. Ruft F1Bs `schreibeWirkungsmarke`/
`stelleLaufstatusFest` und F2s `registriereKernArtefakt`/`pruefeStale`/
`haltFestStaleEntscheidung`/`ladeArtefaktVersion` ausschließlich von
außen auf — kein Touch (D1, real geprüft: `checkpoint-store.test.ts`/
`lineage-registry.test.ts`/`authorization-boundary.test.ts` blieben
unverändert grün).

Zwei reale, während des Baus entdeckte und korrigierte Abweichungen vom
Plan/Vertragstext, nicht stillschweigend übernommen:
- Abschnitt 2.6 des Plans benannte `daten.art === "bedarf"`/
  `"transportpaket"` als Leitstand-Diskriminator — real geprüft: `daten.art`
  ist bei jedem kern-erzeugten F2-Artefakt unverändert `"artefakt_version"`
  (F2s eigener Diskriminator, eine Ebene höher). Der tatsächliche
  Diskriminator liegt eine Ebene tiefer, auf `daten.daten.bedarf_schema`/
  `transport_schema`. `scripts/leitstand-server.mjs`s neue
  `humanTransportFelder`-Funktion nutzt die korrekte Ebene — real gegen
  eine echte, seedende Sitzung gegen den Leitstand-Server verifiziert
  (temporärer Wegwerf-Lauf, Daten danach entfernt), nicht nur gelesen.
- Der Plan sah für "Status"/"Ergebnis" im Leitstand keine Erweiterung der
  Wirkungsmarke-Anzeige vor (nur `lineageFelder`). Ohne eine eigene
  `wirkungsmarkeFelder`-Extraktion (`art`/`ergebnis` aus
  `eintrag.payload`) hätte AC9 nicht erfüllt werden können, da diese
  Felder bei `typ: "wirkungsmarke"` nicht unter `daten.daten` liegen.
  Ergänzt in `scripts/leitstand-server.mjs`, real gegen dieselbe
  Wegwerf-Sitzung verifiziert.

`schemas/kontrollzustand-bedarf-payload.schema.json` und
`schemas/kontrollzustand-transport-payload.schema.json` (Draft 2020-12)
+ acht Beispiel-Fixtures. Anders als F1B/F2/F3 sind die Beispiele bare
Domänenobjekte, keine vollständige Checkpoint-Hülle — die Schemas
beschreiben ausdrücklich nur `daten.daten`, eine Ebene tiefer als F2s
eigenes Lineage-Payload-Schema; im Schema-Kopfkommentar begründet.

`scripts/check-f9-human-transport.mjs` (Fixtures, Ende-zu-Ende-Lauf,
Schemaverstoß-Fall, STALE-Fall, AC10-Grep), in `package.json` `check`
und `check:template` eingetragen. `src/human-transport/
human-transport.test.ts` (zehn `node:test`-Fälle, A2–A9/A8a/B5).
`public/leitstand/app.js` um vier Spalten (Aufgabe/Status/Executor/
Ergebnis) erweitert — bedingt gerendert, kein neuer Schreibpfad.
Freigabestatus-Spalte bewusst nicht ergänzt: F3 hat aktuell keinen
Schreibpfad, der eine `FREIGEGEBEN`-Wirkungsmarke erzeugt (nur
`verweigereAutorisierung`), also keinen realen Fall zum Kalibrieren.

Kalibrierung: Fixture-Rot-Fall (Bedarf-Schema, Exit 1 mit benannter
Regelverletzung, danach Exit 0), ein realer `TEMP-ROT-FALL`-Codeeingriff
gegen `pruefeUndEntscheideStale` (D2/D6-Testfälle schlagen gezielt fehl,
Rest bleibt grün, danach zurückgenommen, kein Rest laut `grep -rn
"TEMP-ROT-FALL" src/`). `npm run check`/`check:template` → Exit 0,
`tests 40, pass 40, fail 0`. Details: `state/gates.md`,
F9-Human-Transport-Gate-Zeile.

Kein Commit/Push in diesem Schritt — Freigabe-Halt laut Vertrag.

## Status
- [ ] Freigegeben
- [ ] Freigegeben mit Hinweisen
- [ ] Nicht freigegeben
- [ ] Blockiert

## Nächster sinnvoller Schritt
Stefan prüft `git status`/Diff und erteilt Freigabe für Commit + Push
(`git-flow`-Skill), danach `docs/STATUS.md`/`state/gates.md`/
`state/memory-map.md`-Einträge sind bereits Teil dieses Commits.
