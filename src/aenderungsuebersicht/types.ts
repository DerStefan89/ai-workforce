/**
 * Datei: src/aenderungsuebersicht/types.ts
 *
 * Zweck: Typen für die Änderungsübersicht (F23 WS-0, features/F23/feature.md).
 * AenderungsuebersichtV0Daten ist die Form von daten.daten — F2s
 * registriereKernArtefakt-Parameter 'daten' —, wenn
 * aenderungsuebersicht_schema === "v0".
 * schemas/kontrollzustand-aenderungsuebersicht-payload.schema.json
 * beschreibt dieselbe Form maschinell.
 */

export type AenderungsuebersichtDateiStatus = 'GEAENDERT' | 'NEU' | 'GELOESCHT' | 'UMBENANNT'

export interface AenderungsuebersichtDatei {
  pfad: string
  status: AenderungsuebersichtDateiStatus
  /** null bei Binärdateien oder untracked Dateien (Zeilenzahl nicht über git diff ermittelbar). */
  plus: number | null
  minus: number | null
  /** F-735: nur bei status 'UMBENANNT' — der Pfad VOR der Umbenennung. Optional und additiv: Alt-Artefakte ohne das Feld bleiben gültig. */
  alter_pfad?: string
}

export interface AenderungsuebersichtV0Daten {
  aenderungsuebersicht_schema: 'v0'
  lauf_id: string
  erzeugt_am: string
  /** HEAD-Commit-SHA zum Zeitpunkt der Ermittlung, oder null, wenn 'git rev-parse HEAD' fehlschlug. */
  basis_ref: string | null
  dateien: AenderungsuebersichtDatei[]
  stat_text: string
  patch: string
  gekuerzt: boolean
  budget_bytes: number
}
