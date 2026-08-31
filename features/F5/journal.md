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
