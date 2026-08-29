<!--
Planungsdokument — NICHT von Prüfung 1 (tote Verweise) erfasst, weil eine
Planungsdatei per Definition über Dateien spricht, die noch nicht oder
nicht mehr existieren.
-->
# Status — AI Workforce

Einzige Quelle für Phasenstand und Scope.

## Aktuelle Phase

Ebene 1 (Produktgrundlage) und Ebene 2 (Technische Grundlage) sind
abgeschlossen. Die Vertragsschiene (1, 2, Option B, 3, 4, 5) ist
abgeschlossen. Meilenstein 1 ist in Arbeit.

## Erledigt

- Zielbild, Rollenmodell, Lifecycle, Sicherheits- und Evidenzmodell sowie
  Architektur-Baseline sind entschieden (`docs/projekt/zielfassung.md`).
- Technischer Stack, Modulschnitt und Zustandsablage sind festgelegt.
- Die Vertragsschiene zur Harness-Härtung ist abgeschlossen.
- AF-F001 (Feature-Akte im Repo) ist umgesetzt: `features/<id>/feature.md`
  + `journal.md` als Ablageort, `scripts/check-feature.mjs` als Gate
  (eingehängt in `npm run check:template`), erste befüllte Akte
  `features/AF-F001/` mit `Status: READY_FOR_TECH`.
- Feature 0 (Datenformate) ist umgesetzt: `kontrollzustand/` und
  `profiles/` existieren real im Repo, ihr Format ist über
  `schemas/*.schema.json` + `schemas/examples/` maschinell geprüft
  (`scripts/check-datenformate.mjs`, eingehängt in `npm run check` und
  `npm run check:template`). `F-010` ist damit erledigt.
- Feature 1 (Checkpoint Store) ist umgesetzt: `src/checkpoint-store/`
  schreibt, lädt und validiert eine Hash-Kette von Checkpoints je
  `lauf_id` (Schreiben, Laden, Validierung, Hash-Kette, Gate
  `scripts/check-checkpoint-store.mjs`, eingehängt in `npm run check` und
  `npm run check:template`). Der Windows-Rename-Atomaritätsnachweis
  (D4) ist als eigenständiges, manuelles Skript
  (`scripts/verify-rename-atomicity.mjs`) real gelaufen, bewusst
  **nicht** in die Standardkette eingehängt — bleibt ein einmaliger,
  plattformabhängiger Nachweis, siehe `state/gates.md`.
- Feature 2 (Artifact Registry / Lineage) ist umgesetzt: `src/lineage-
  registry/` registriert kern- und werkzeug-erzeugte Artefakt-Versionen,
  hält Eingaben fest, prüft mechanisch auf STALE und hält eine
  menschliche STALE-Entscheidung fest. Lineage-Einträge nutzen F1s
  Checkpoint-Hash-Kette (`lauf_id = lineage-<artefakt_id>`) — kein
  eigener Dateibaum unter `kontrollzustand/` (Gate
  `scripts/check-lineage-registry.mjs`, eingehängt in `npm run check`
  und `npm run check:template`).

## Offene Punkte

Scope von Fassung 1 (Auszug, Reihenfolge und Details siehe
`docs/projekt/umsetzungsplan-fassung-1.md`):

- Ein vollständig belegter End-to-End-Durchlauf über alle vier
  Workflow-Layer, mit dem Referenzfeature Belegschaftskonfiguration.
- Genau ein aktiver Workstream; jeder Passtyp mindestens einmal.

**Nicht Fassung 1:** Mehrbenutzerbetrieb, Hosting, Abrechnung,
Provider-Adapter, parallele Workstreams, autonome externe oder
irreversible Aktionen.

Reihenfolge und Zuordnung einzelner Features:
`docs/projekt/umsetzungsplan-fassung-1.md`.
