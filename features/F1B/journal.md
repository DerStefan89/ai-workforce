# Journal — F1B

Anhängeprotokoll. Neue Einträge unten anfügen, bestehende nicht ändern.

## 2026-08-30 — Akte angelegt

`features/F1B/feature.md` aus dem Auftrag dieser Sitzung erstellt
(Ziel/Scope/Nicht-Ziele/Akzeptanzkriterien wörtlich übernommen),
`Status: READY_FOR_TECH`. Grundlage: `docs/projekt/zielfassung.md`
§16.4/§16.6 (`RUN_PREPARED`, drei Terminalausgänge, A5) und
`ARCHITECTURE.md:58` — beide bisher nur als Dokument, nicht im Code.
`src/checkpoint-store/` kennt bislang nur `typ: "checkpoint"`;
`schemas/kontrollzustand-checkpoint-payload.schema.json` nennt
`wirkungsmarke` ausdrücklich als spätere Unterart. F1B zieht das nach.
Kein Produktcode in diesem Schritt.

## 2026-08-30 — plan-v1

`state/plan-v1-f1b-wirkungsmarke.md` erstellt: Dateiname-/Ablageschema,
`typ`-Wert, Modul-API-Form, Testaufbau, Gate-Zuschnitt. Zentrale
Design-Entscheidung: `typ: "wirkungsmarke"` bleibt ein eigener,
von `"checkpoint"` unterschiedener Hüllen-Typ (A5 verlangt das wörtlich:
„RUN_PREPARED ist eine Wirkungsmarke, kein Checkpoint"), teilt sich aber
dieselbe Datei-/Sequenz-/Hash-Kette wie F1s Checkpoints derselben
`lauf_id` (Muster: F2 Option A — bestehende Infrastruktur wiederverwenden,
kein eigener Dateibaum). Das verlangt einen echten F1-Touch
(`src/checkpoint-store/index.ts` typ-parametrisieren), keinen reinen
Aufruf von außen wie bei F2s Lineage-Lösung. Offene Punkte vor dem Bau
festgehalten, keiner stillschweigend entschieden.

## 2026-08-30 — Advisor-Pass, plan-v2

Advisor-Pass (`architecture-advisor`, frischer Kontext,
`state/advisor-findings-f1b-wirkungsmarke.md`): **NICHT FREIGEGEBEN** —
B3 (fehlende AC/Tests für gemischte Ketten und unbekannten `typ`), B4
(Semantik bei mehrfachem `RUN_PREPARED` unsicher — ein späterer,
unabhängiger Terminal-Erfolg konnte ein unaufgelöstes `RUN_PREPARED`
verdecken) und B5 (Rückgabeform für `KLAERUNG_ERFORDERLICH`
unterspezifiziert gegenüber `ARCHITECTURE.md:61`, fünf geforderte
Bestandteile) blockierend. B1 (zentrale Design-Entscheidung D1 — eigener
Hüllen-`typ: "wirkungsmarke"`) und B2 (Kettenprüfung/B6-Fix bleiben beim
typ-Dispatch unberührt) **bestätigt, entlastend** — keine Umbauten
nötig. `state/plan-v2-f1b-wirkungsmarke.md`: Delta 1 löst B4
(chronologische FIFO-Paarung zwischen `RUN_PREPARED` und Terminal,
offene Liste statt „neuestes gewinnt"), Delta 2 löst B5 (konkrete
`KLAERUNG_ERFORDERLICH`-Rückgabe mit Blocker-Kennung, Grund, Evidenz,
Auflösungsbedingung, Resume-Ziel), Delta 3 löst B3 (zwei neue Testfälle:
gemischte Kette, unbekannter `typ`), Delta 4 nimmt B6/B7 ins SCOPE auf
(`types.ts`-Payload-Union, gemeinsamer Kettenfeld-Helfer gegen künftige
B6-artige Drift). Diese Sitzung hat B4/B5/B3 direkt aufgelöst statt an
Stefan zu eskalieren (technische Präzisierung einer bereits im Auftrag
festgelegten Semantik, keine neue Grundsatzentscheidung wie F2s
Option-A-Wahl). Ein Offener Punkt verbleibt (FIFO- vs. LIFO-Paarung,
kein Blocker, beide Varianten erfüllen die AC5/AC19-Sicherheitseigenschaft).
Kein Produktcode in diesem Schritt.

## 2026-08-30 — Zweiter Advisor-Pass, Handoff-Vertrag

Zweiter, auf das Delta beschränkter Advisor-Pass
(`state/advisor-findings-f1b-wirkungsmarke-v2.md`): **FREIGEGEBEN MIT
HINWEISEN.** B3 (Delta 3), B5 (Delta 2), B7 (Delta 4) inhaltlich
vollständig gelöst. B4 (Delta 1) im Kernszenario gelöst, aber vier
konkrete Nachbesserungen benannt: B11 (die begleitende „Sicherheits-
eigenschaft"-Formel aus Delta 1 ist als allgemeine Formel falsch — ein
Orphan-Terminal-Interleaving widerlegt sie; zusätzlich fehlte in
SCOPE.3 ein vierter Fall für eine reine Orphan-Terminal-Kette ohne
jede `run_prepared`-Marke), B12 (Delta 1 zitiert `ARCHITECTURE.md:58`
falsch — die Zeile regelt `ergebnis`, nicht `status`), B13
(`evidenz.einträge` verstößt gegen die ASCII-Konvention des Repos →
`eintraege`), B15 (die neue Payload-Union braucht einen konkreten
Narrowing-Mechanismus für `stelleLaufstatusFest`, sonst nur ein
ungeprüfter Cast). Handoff-Vertrag `state/tasks/f1b-wirkungsmarke.md`
angelegt, alle vier Korrekturen wörtlich aufgenommen. Kein Produktcode
in diesem Schritt.

## 2026-08-30 — Ausführung

Vertrag `state/tasks/f1b-wirkungsmarke.md` umgesetzt. Beim Schreiben des
Vertrags ein weiterer Fehler in plan-v2s eigenem Text gefunden und vor
dem Bau korrigiert: das Advisor-Szenario-Beispiel (A22) behauptete, die
FIFO-Paarung lasse „sequenz 2 offen" — tatsächlich entnimmt FIFO die
älteste Sequenz (2) als durch das Terminal aufgelöst, sodass die
jüngere (3) offen bleibt; der Algorithmus selbst (Delta 1, zwei Absätze
zuvor) war korrekt beschrieben, nur der Recap-Satz war invertiert.

F1-Touch zuerst (typ-Dispatch in `pruefeEinzelnenKandidaten`, Union in
`types.ts`), Regressionsbeleg (`node --test` auf F1+F2, 12/12 grün) vor
den neuen Wirkungsmarke-Fixtures/Tests, wie im Budget vorgegeben. Neue
Exporte: `schreibeWirkungsmarke`, `stelleLaufstatusFest`,
`validiereWirkungsmarkeEintrag`, `istWirkungsmarkePayload` (Typ-Guard,
löst B15), gemeinsamer privater Helfer `pruefeKettenfelder` (löst B7).
17 `node:test`-Fälle in `checkpoint-store.test.ts` (6 bestehend + 11 neu:
A7-A12, A20-A23, B11-vierter-Fall), neues Gate
`scripts/check-f1b-wirkungsmarke.mjs`, sechs neue Fixtures, Schema
`kontrollzustand-wirkungsmarke-payload.schema.json`.

Kalibrierung real durchgespielt: drei Rot-Fälle für die Fixtures im
Gate-Skript, acht reale temporäre Codeeingriffe in
`src/checkpoint-store/index.ts` gegen `checkpoint-store.test.ts`
kalibriert (u. a. FIFO→LIFO, die von B11 verworfene Formel, die
B11-vierter-Fall-Regression), alle zurückgenommen (`grep -rn
"TEMP-ROT-FALL" src/` liefert keinen Treffer). `npm run check` und
`npm run check:template` grün, `tests 24, pass 24, fail 0`. Details und
volle Belege in `state/gates.md` (F1B-Wirkungsmarke-Gate-Zeile,
Ergänzung der Checkpoint-Store-Gate-Zeile).

## Status
- [x] Freigegeben
- [ ] Freigegeben mit Hinweisen
- [ ] Nicht freigegeben
- [ ] Blockiert

## Nächster sinnvoller Schritt
`git status` prüfen, Diff zur Freigabe zeigen, `state/freigabe-commit.md`
abwarten, dann committen (gezielte Pfade, `git-flow`-Skill) und pushen.
