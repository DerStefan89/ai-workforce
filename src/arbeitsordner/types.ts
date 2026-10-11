/**
 * Datei: src/arbeitsordner/types.ts
 *
 * Zweck: Typen des Arbeitsordners je Ablauf (F45 B1a-1, E-F45-3 = A): Git-Worktree auf eigenem Branch
 * neben dem Projekt, sein Kern-Artefakt 'arbeitsordner-<workflowId>' (Payload
 * schemas/kontrollzustand-arbeitsordner-payload.schema.json) und die Löschliste (F-715).
 *
 * Wird aufgerufen von: src/arbeitsordner/*.ts, scripts/leitstand-server.mjs (über die Funktionen).
 */

/** Ergebnis einer geprüften Löschliste: gelöschte Pfade ('/'-getrennt, relativ) und Ablehnungen. */
export interface LoeschErgebnis {
  geloescht: string[]
  abgelehnt: { pfad: string; grund: string }[]
}

/** Lebenszyklus des Arbeitsordners; jeder Übergang ist eine neue Artefaktversion (append-only). */
export type ArbeitsordnerStatus = 'IN_VORBEREITUNG' | 'BEREIT' | 'FEHLGESCHLAGEN' | 'ENTFERNT'

/** Ausgang von `npm ci` bei der Vorbereitung; null im Artefakt, wenn das Projekt kein package.json hat. */
export interface NpmCiErgebnis {
  ergebnis: 'OK' | 'FEHLER' | 'ZEITGRENZE' | 'UEBERSPRUNGEN'
  exit_code: number | null
  dauer_ms: number
  ausgabe_ende: string
}

/** Messwerte und Ausgänge der Vorbereitung. */
export interface Vorbereitung {
  worktree_ms: number | null
  npm_ci: NpmCiErgebnis | null
  e183_ms: number | null
}

/** Festgehaltenes Aufräumen (nur bei Status ENTFERNT). */
export interface Aufraeumen {
  begruendung: string
  verworfen: boolean
  branch_geloescht: boolean
  hinweis: string | null
  am: string
}

/** Payload des Kern-Artefakts 'arbeitsordner-<workflowId>'. */
export interface ArbeitsordnerV0Daten {
  arbeitsordner_schema: 'v0'
  workflow_id: string
  projekt_wurzel: string
  pfad: string
  branch: string
  basis_commit: string | null
  status: ArbeitsordnerStatus
  grund: string | null
  vorbereitung: Vorbereitung | null
  aufraeumen: Aufraeumen | null
  aktualisiert_am: string
}

/** Ergebnis von Prüfungen, die einen Grund tragen. */
export type PruefErgebnis = { ok: true } | { ok: false; grund: string }
