# Journal — F1

Anhängeprotokoll. Neue Einträge unten anfügen, bestehende nicht ändern.

## 2026-08-29 — Akte angelegt (Nachtrag, retroaktiv)

Coach-Output (Ziel/Scope/Nicht-Ziele/Akzeptanzkriterien AC1–AC11) von
Stefan erstellt und als `features/F1/feature.md` übernommen,
`Status: READY_FOR_TECH`.

## 2026-08-29 — Challenge (Nachtrag, retroaktiv)

Technical-Challenger-Ergänzungen zum Coach-Output: AC11 (Profilkopie-
Lücke), drei Nicht-Ziel-Ergänzungen, `typ`-Wert-Konvention, Temp+Rename-
Mechanik, Forderung nach einem Windows-Rename-Nachweis — im Volltext in
`state/plan-v1-feature1-checkpoint-store.md` Kopf übernommen, nicht nur
referenziert.

## 2026-08-29 — plan-v1

`state/plan-v1-feature1-checkpoint-store.md`: reale Repo-Verifikation
(F-013-Muster), SCOPE 1–12, NICHT, Design-Entscheidungen D1–D6 (u. a.
ein File pro Checkpoint statt JSONL, `lauf_id` opak, volle
Rückwärtslauf-Kettenprüfung, Windows-Rename-Nachweis außerhalb `npm run
check`, Gate-Skript importiert echten Code statt Handvalidierung, kein
`ajv`), Akzeptanzkriterien A1–A18, vier Offene Punkte (F-020 unverifiziert,
Lauf-Identität, D3-Auslegung, Windows-Rename-Nachweis-Umfang).

## 2026-08-29 — Advisor-Pass

`architecture-advisor`, frischer Kontext, gegen `ARCHITECTURE.md`,
`docs/projekt/zielfassung.md`, `schemas/kontrollzustand.schema.json`,
`package.json`, `.gitignore`, `scripts/check-datenformate.mjs`,
`state/gates.md`, `docs/STATUS.md`, `state/memory-map.md`,
`features/F0/*.md` geprüft. Urteil: **FREIGEGEBEN MIT HINWEISEN**.
B1/B2 vor dem Handoff-Vertrag zu klären („F-020"-Formulierung, fehlende
Gate-/Test-Zuordnung für A4/A5/A10/A11), B4/B5 nicht blockierend, im
Handoff-Vertrag zu konkretisieren. B3 bestätigt. Ergebnis:
`state/advisor-findings-feature1-checkpoint-store.md`.

## 2026-08-29 — plan-v2

`state/plan-v2-feature1-checkpoint-store.md`: Delta zu plan-v1, löst
B1/B2/B5. Delta 1 (Ersatzwortlaut für „schließt F-020", auch in
`features/F1/feature.md` übernommen), Delta 2 (wichtigster Punkt: neue
`src/checkpoint-store/checkpoint-store.test.ts` mit vier `node:test`-
Fällen plus je einem konkreten kalibrierten Rot-/Grün-Fall für A4/AC1,
A5/AC2+AC3, A10/AC8, A11/AC9 — insbesondere ein echter simulierter
Abbruch für A5, nicht nur Behauptung), Delta 3 (Terminologie „Rollen-
Tabelle" → „16.2 Modulschnitt", auch in `features/F1/feature.md`
übernommen). B4 (Windows-Rename-Nachweis) bleibt offen, als eigener
Klärungsabschnitt in den Handoff-Vertrag übernommen statt hier gelöst.

## 2026-08-29 — Handoff-Vertrag

`state/tasks/f1-checkpoint-store.md`: sieben Pflichtsektionen,
SCHRITT 0 wörtlich. Übernimmt plan-v2 vollständig, benennt den
Windows-Rename-Nachweis (B4) als eigenen offenen CONTEXT-Abschnitt mit
drei zu klärenden Punkten (Umfang, Störfaktoren, Ablageort) — nicht
gebaut, bis Stefan diese beantwortet. Vertrag endet mit Freigabe-Halt:
kein Bau, kein Commit ohne Stefans frische, explizite Freigabe.

## 2026-08-29 — Nachtrag B4 (Option B) und B6 (Statusprüfung)

B4 per Stefans Entscheidung gelöst (wenige hundert Rename-Zyklen,
simuliertes Read-Handle, `scripts/verify-rename-atomicity.mjs`, einmalig
manuell auf Windows gelaufen, zweimal real: 0 Leser-Befunde über
858–944 Lesevorgänge, `EPERM`/`EBUSY` real ausgelöst). B6 (fünfter
Testfall — Dateiname-Inhalt-Hash-Konsistenz) war bei einer Statusprüfung
nicht in plan-v2/Vertrag eingearbeitet, mit einer Wegwerf-Diagnose real
bestätigt und in plan-v2 Delta 4 sowie im Vertrag nachgezogen. Beide
Ergebnisse in `state/gates.md` als Kalibrierungslog-Einträge dokumentiert.

## 2026-08-29 — Handoff-Vertrag ausgeführt

Vertrag `state/tasks/f1-checkpoint-store.md` nach Stefans frischer
Freigabe vollständig gebaut. Artefakte:
`schemas/kontrollzustand-checkpoint-payload.schema.json`,
`schemas/examples/kontrollzustand-checkpoint*.json` (4 Dateien, real
berechnete Hashes), `src/checkpoint-store/{types,index,
checkpoint-store.test}.ts` (fünf `node:test`-Fälle),
`scripts/check-checkpoint-store.mjs` (eingehängt in `npm run check` und
`npm run check:template`), `.gitignore`-Eintrag für das
Test-Wegwerfverzeichnis `kontrollzustand-test/`.

Design-Entscheidung während des Baus, nicht vorab im Plan festgelegt:
`schreibeCheckpoint`/`ladeLetztenGueltigenCheckpoint` bekamen ein
optionales `basisVerzeichnis`-Feld (Default `kontrollzustand`), damit
Tests und Gate-Skript wirklich unter `kontrollzustand-test/` statt im
echten `kontrollzustand/` laufen können, ohne die von plan-v1
vorgegebene Kernsignatur (`laufId, profilReferenz, daten`) zu ändern.

Alle neun Kalibrierungen real durchgeführt und zurückgenommen: vier
Gate-Fixtures (je Invalid-Beispiel temporär in `valid.json`-Position,
benannte Regelverletzung, Original wiederhergestellt) und fünf
`node:test`-Rot-Fälle (je ein echter, temporärer Codeeingriff in
`index.ts` bzw. im Test, Fehlschlag beobachtet, zurückgenommen) —
Belege in `state/gates.md`. `npm run check` und `npm run check:template`
am Ende grün (6/6 Tests, keine Lint-/Typecheck-Befunde außer der
vorbestehenden Biome-`recommended`-Deprecation-Info).
