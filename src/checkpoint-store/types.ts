/**
 * Datei: src/checkpoint-store/types.ts
 *
 * Zweck: Gemeinsame Typen für den Checkpoint Store (F1). profil_referenz
 * spiegelt die in F0 festgelegte Kontrollzustand-Hülle
 * (schemas/kontrollzustand.schema.json), CheckpointPayload das neue
 * Payload-Schema (schemas/kontrollzustand-checkpoint-payload.schema.json).
 */

export interface ProfilReferenz {
  pfad: string
  hash: string
  version: number
}

export interface CheckpointPayload {
  lauf_id: string
  sequenz: number
  vorgaenger_hash: string | null
  selbst_hash: string
  daten?: unknown
}

export interface KontrollzustandEintrag {
  schema_version: number
  typ: string
  profil_referenz: ProfilReferenz
  payload: CheckpointPayload
}

export type Ereignisname =
  | 'checkpoint_geschrieben'
  | 'checkpoint_geladen'
  | 'checkpoint_validierungsfehler'
  | 'checkpoint_kein_gueltiger_gefunden'

export interface Ereignis {
  ereignis: Ereignisname
  lauf_id: string
  zeitstempel: string
  sequenz?: number
  pfad?: string
  verstoesse?: string[]
}

export type Schreiber = (ereignis: Ereignis) => void
