/**
 * Datei: src/workboard/types.ts
 *
 * Zweck: Gemeinsame Typen für das Workboard-Modul (F21 WS-1). Ein Workitem
 * ist entweder ein Finding (state/findings.md) oder eine Feature-Akte
 * (features/<id>/feature.md) — beide werden für GET /api/workitems zu einer
 * Liste zusammengeführt (features/F21/feature.md AK3).
 */

export type WorkitemStatus = 'OFFEN' | 'ERLEDIGT' | 'SONSTIGES'
export type Prioritaet = 'P0' | 'P1' | 'P2' | 'P3' | 'P4'

export interface FindingWorkitem {
  quelle: 'finding'
  id: string
  typ: string
  prioritaet: Prioritaet
  status: WorkitemStatus
  statusRoh: string
  titel: string
  beschreibung: string | null
  fundstelle: string | null
  auswirkung: string | null
  massnahme: string | null
  featureRun: string | null
  zeile: number
}

/**
 * `typ` ist bei Feature-Akten immer 'FEATURE' (feature.md kennt keinen
 * eigenen Typ) — eine bewusste, kleine Erfindung, damit der typ-Filter von
 * GET /api/workitems einheitlich über beide Quellen greift (AK3), ohne
 * dass Findings und Feature-Akten fachlich verschmelzen.
 */
export interface FeatureWorkitem {
  quelle: 'feature'
  typ: 'FEATURE'
  id: string
  titel: string
  status: string
  pfad: string
}

export type Workitem = FindingWorkitem | FeatureWorkitem

export interface Befund {
  quelle: 'finding' | 'feature'
  art: 'nicht_parsebare_kopfzeile' | 'doppelte_id' | 'fehlendes_titel_feld' | 'status_fehlt_oder_unbekannt' | 'feature_md_fehlt'
  meldung: string
  zeile?: number
  id?: string
}

export interface ParseErgebnis<T> {
  workitems: T[]
  befunde: Befund[]
}
