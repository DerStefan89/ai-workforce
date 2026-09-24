/**
 * Datei: src/pruefschritt/types.ts
 *
 * Zweck: Typen für den deterministischen Prüfschritt (F-652, state/findings.md
 * F-652). PruefergebnisV0Daten ist die Form von daten.daten — F2s
 * registriereKernArtefakt-Parameter 'daten' —, wenn pruefergebnis_schema ===
 * "v0". schemas/kontrollzustand-pruefergebnis-payload.schema.json beschreibt
 * dieselbe Form maschinell. Muster: src/aenderungsuebersicht/types.ts.
 */

/** Vier mögliche Ausgänge, GRUEN als einziger Weiterlauf-Fall (src/workflow/index.ts Regel 1f). */
export type PruefergebnisWert = 'GRUEN' | 'ROT' | 'ZEITGRENZE' | 'FEHLER'

export interface PruefergebnisV0Daten {
  pruefergebnis_schema: 'v0'
  lauf_id: string
  /** Das argv der Startvorlage (vorlage.pruefbefehl), unverändert übernommen — reine Dokumentation, kein zweiter Aufrufort. */
  befehl: string[]
  /** null bei ZEITGRENZE/FEHLER (kein regulärer Prozessabschluss mit numerischem Exitcode). */
  exit_code: number | null
  ergebnis: PruefergebnisWert
  dauer_ms: number
  /** Stdout- und stderr-Ende, GETRENNT gekürzt und zusammengesetzt (baueAusgabeEnde, F-655) — stdout am Stringende (primär, STDOUT_ENDE_MAX_BYTES), stderr gefiltert davor (STDERR_ENDE_MAX_BYTES), nie der volle Text. */
  ausgabe_ende: string
  gestartet_am: string
}
