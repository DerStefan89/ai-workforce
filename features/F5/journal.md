# Journal — F5

Anhängeprotokoll. Neue Einträge unten anfügen, bestehende nicht ändern.

## 2026-08-30 — Akte angelegt

`features/F5/feature.md` aus dem Auftrag dieser Sitzung erstellt
(Ziel/Scope/Nicht-Ziele aus `docs/projekt/zielfassung.md` §16.2 Zeile
„Context Builder", Zeile 145 (Entscheidung 59/107) und Zeile 251
(Entscheidungen 113/114/115) sowie aus F2s realer Modul-API
(`registriereKernArtefakt`, `pruefeStale`) abgeleitet), `Status:
READY_FOR_TECH`. Grundlage: F1, F1B, F2, F3, F9 fertig und gemergt
(`main` `2ae8c5b`). Vier offene technische Fragen bewusst nicht
vorentschieden, siehe `state/plan-v1-f5-context-builder.md`: Format des
Kontextpakets, Nachforderungs-/Budget-Mechanik, Schnittstelle zu F2,
erster realer Aufrufer (keiner nötig, Bibliotheksmuster wie F1/F2). Kein
Produktcode in diesem Schritt.

## 2026-08-31 — plan-v1, zwei Advisor-Pässe, plan-v2, Handoff-Vertrag

`state/plan-v1-f5-context-builder.md` erstellt: eigenständiges Modul
`src/context-builder/`, Rollenregeln als Kern-Konstante (nicht Profil,
D14/§16.7), zusammengesetzter Element-Schlüssel für F2s `eingaben`,
zweiphasige Budget-vs-Evidenz-Mechanik, `KONTEXTPAKET_V0`-Schema ohne
Runtime-Feld (E-191 N1/N2). Drei Punkte bewusst als offen markiert
(Abschnitt 7).

Erster Advisor-Pass (`architecture-advisor`, frischer Kontext,
`state/advisor-findings-f5-context-builder.md`): **NICHT FREIGEGEBEN** —
B1 (Pfad-Kollision: gleicher Pfad, unterschiedlicher zitierter Bereich
mit F2s realer `pruefeStale`-API wie geplant nicht unterscheidbar), B5
(Plan-Abschnitt-0 behauptete fälschlich einen Wurf, wo `pruefeStale`
real still `{stale:false}` liefert), B2 (fail-open bei unbekannter
Rolle), B4 (Reihenfolgeabhängigkeit Evidenz/Budget stillschweigend), B3
(Muster-Matching unspezifiziert) blockierend. A1-A7 bestätigt,
entlastend.

`state/plan-v2-f5-context-builder.md`: sechs Deltas lösen B1-B8.
Zweiter, auf das Delta beschränkter Advisor-Pass
(`state/advisor-findings-f5-context-builder-v2.md`): **FREIGEGEBEN MIT
HINWEISEN.** Drei Nachbesserungen (Phase-A-Pseudocode, `#`-Kollision und
gleicher-Schlüssel-anderer-Inhalt bei Delta 1, AC2-Tabellenzuordnung)
direkt als Nachtrag in plan-v2 eingearbeitet, keine dritte Advisor-Runde
nötig. B9 (Stopp-vs-Teilpaket) bleibt bewusst offen, nicht durch
Repo-Recherche klärbar, kein Blocker.

Handoff-Vertrag `state/tasks/f5-context-builder.md` angelegt, plan-v2
inklusive Nachtrag wörtlich übernommen. Kein Produktcode in diesem
Schritt — Vertrag endet mit Freigabe-Halt, noch nicht ausgeführt.

## 2026-08-31 — Ausführung

Vertrag `state/tasks/f5-context-builder.md` auf Branch
`feature/f5-context-builder` (von `main` `1d6126e` abgezweigt, enthält
die F5-Planungsdateien real) umgesetzt. SCHRITT-0-Prüfung: Arbeits-
verzeichnis stimmte, `main` real gegen `1d6126e` verifiziert.

Neues, eigenständiges Modul `src/context-builder/{index,types}.ts` (D1,
kein F2-Touch — real bestätigt: `registriereKernArtefakt`/`pruefeStale`
unverändert von außen aufgerufen). Ablauf wörtlich in der Vertragsreihen-
folge umgesetzt: Rollenprüfung (fail-closed bei unbekannter Rolle, Delta
2) → `#`-Validierung im rohen Pfad (Nachtrag V3) → Rollenfilter auf dem
rohen Pfad (`ROLLEN_AUSSCHLUSSMUSTER` als Kern-Konstante, D1/D14) →
Element-Schlüsselbildung mit Duplikat-Idempotenz und Widerspruchsprüfung
(Delta 1, Nachtrag V4) → zweiphasige Budget-Vergabe (notwendige Anfragen
zuerst, kumulativ gegen das volle Budget, Delta 4 + Nachtrag-Pseudocode)
→ Registrierung über F2. `pruefeKontextpaketFrisch` als dünner Aufrufer
von F2s `pruefeStale`, reicht dessen stilles `{stale:false}`-Verhalten
bei nicht existierender Referenz unverändert durch (Delta 5).

Neues Schema `schemas/kontrollzustand-kontextpaket-payload.schema.json`
(fünf Fixtures), neues Gate `scripts/check-f5-context-builder.mjs`, elf
`node:test`-Fälle in `context-builder.test.ts` (AC1–AC7, AC10/Delta 5,
Delta 2, Nachtrag V3, Nachtrag V4).

Kalibrierung real durchgespielt: ein Fixture-Rot-Fall (invalid-Fixture
temporär in valid-Position, Original danach wiederhergestellt) plus drei
reale, temporäre Codeeingriffe in `src/context-builder/index.ts`
(Rollenfilter invertiert → 8 Fehlschläge, Budget-Phasentrennung
aufgehoben → exakt AC5, Rollenprüfung/`#`-Validierung deaktiviert →
exakt Delta 2 und Nachtrag V3), danach zurückgenommen
(`grep -rn "TEMP-ROT-FALL" src/` zeigt keinen Treffer). Details und
volle Belege in `state/gates.md`, F5-Context-Builder-Gate-Zeile.

`npm run check` und `npm run check:template` grün.

## Status
- [x] Freigegeben
- [ ] Freigegeben mit Hinweisen
- [ ] Nicht freigegeben
- [ ] Blockiert

## Nächster sinnvoller Schritt
`git status` prüfen, Diff zur Freigabe zeigen, `state/freigabe-commit.md`
abwarten, dann committen (gezielte Pfade, `git-flow`-Skill) und pushen.

## 2026-08-31 — Gemergt, formaler Abschluss

PR #30 gemergt, `main` `56cbc8c`, CI grün. `features/F5/feature.md`
`Status:` auf `ABGESCHLOSSEN` gesetzt (Präzedenz `features/F9/
feature.md`). F5 ist damit vollständig abgeschlossen.

## Status
- [x] Freigegeben
- [ ] Freigegeben mit Hinweisen
- [ ] Nicht freigegeben
- [ ] Blockiert

## Nächster sinnvoller Schritt
Keiner — F5 ist abgeschlossen. Nächstes Feature laut Umsetzungsplan:
F6 (Claude-Code-Gateway, Deliverable 3).
