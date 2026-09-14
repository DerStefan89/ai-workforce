/**
 * Datei: src/workboard/feature-status.ts
 *
 * Zweck: Die gültigen Status-Werte einer Feature-Akte (features/<id>/feature.md,
 * `Status: <WERT>`) — EINE Quelle für scripts/check-feature.mjs (Feature-Akte-Gate)
 * und src/workboard/features.ts (F21 WS-1, AK2). Liegt bewusst unter src/, nicht in
 * scripts/: ARCHITECTURE.md §1 nennt src/ den einzigen Produktpfad, die Abhängigkeits-
 * richtung bleibt damit durchgehend scripts/ → src/ (Gates lesen Kern-Code), nie
 * umgekehrt — ein reines Produktmodul unter src/ importiert nie aus scripts/.
 */

export const gueltigeStatusWerte = [
  'ENTWURF',
  'READY_FOR_TECH',
  'WORKSTREAM_SCHNITT_GENEHMIGT',
  'IN_ARBEIT',
  'FEATURE_GATE',
  'ABGESCHLOSSEN',
  'BLOCKIERT',
  'ABGEBROCHEN',
]
