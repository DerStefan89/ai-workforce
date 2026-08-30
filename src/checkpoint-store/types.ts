/**
 * Datei: src/checkpoint-store/types.ts
 *
 * Zweck: Gemeinsame Typen für den Checkpoint Store (F1 + F1B).
 * profil_referenz spiegelt die in F0 festgelegte Kontrollzustand-Hülle
 * (schemas/kontrollzustand.schema.json), CheckpointPayload das
 * Checkpoint-Payload-Schema (schemas/kontrollzustand-checkpoint-payload.
 * schema.json) und WirkungsmarkePayload (F1B) das Wirkungsmarke-Payload-
 * Schema (schemas/kontrollzustand-wirkungsmarke-payload.schema.json).
 * KontrollzustandEintrag.payload ist bewusst eine Union statt einer
 * discriminated union auf typ (kein Umbau nötig, siehe
 * istWirkungsmarkePayload in index.ts als Narrowing-Weg).
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

export interface WirkungsmarkePayload {
  lauf_id: string
  sequenz: number
  vorgaenger_hash: string | null
  selbst_hash: string
  art: 'run_prepared' | 'terminal'
  ergebnis?: 'ERFOLGREICH' | 'VERWEIGERT' | 'FEHLGESCHLAGEN'
  daten?: unknown
}

export interface KontrollzustandEintrag {
  schema_version: number
  typ: string
  profil_referenz: ProfilReferenz
  payload: CheckpointPayload | WirkungsmarkePayload
}

export type Ereignisname =
  | 'checkpoint_geschrieben'
  | 'checkpoint_geladen'
  | 'checkpoint_validierungsfehler'
  | 'checkpoint_kein_gueltiger_gefunden'
  | 'wirkungsmarke_geschrieben'
  | 'wirkungsmarke_validierungsfehler'
  | 'laufstatus_festgestellt'

export interface Ereignis {
  ereignis: Ereignisname
  lauf_id: string
  zeitstempel: string
  sequenz?: number
  pfad?: string
  verstoesse?: string[]
  status?: string
}

/**
 * Rückgabeform von stelleLaufstatusFest (F1B). terminaleOhneRunPrepared
 * ist in allen drei Fällen ein zusätzliches, nicht-statusveränderndes
 * Diagnosefeld (leeres Array im Normalfall). KLAERUNG_ERFORDERLICH trägt
 * die fünf laut ARCHITECTURE.md:61 geforderten Bestandteile eines
 * blockierten Zustands (Blocker-Kennung, Grund, Evidenz,
 * Auflösungsbedingung, Resume-Ziel).
 */
export type LaufStatus =
  | { status: 'NICHT_GESTARTET'; terminaleOhneRunPrepared: number[] }
  | {
      status: 'ABGESCHLOSSEN'
      ergebnis: 'ERFOLGREICH' | 'VERWEIGERT' | 'FEHLGESCHLAGEN'
      terminalSequenz: number
      runPreparedSequenz: number
      terminaleOhneRunPrepared: number[]
    }
  | {
      status: 'KLAERUNG_ERFORDERLICH'
      blockerId: string
      grund: string
      evidenz: {
        laufId: string
        offeneRunPreparedSequenzen: number[]
        eintraege: KontrollzustandEintrag[]
      }
      aufloesungsbedingung: string
      resumeZiel: string
      terminaleOhneRunPrepared: number[]
    }

export type Schreiber = (ereignis: Ereignis) => void
