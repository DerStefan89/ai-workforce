/**
 * Datei: src/projektkontext/types.ts
 *
 * Zweck: Typen für die Projekt-Roadmap (F33 WS-1). MeilensteinEintrag/
 * RoadmapDaten sind die typisierte Form eines gegen
 * schemas/roadmap.schema.json gültigen Dokuments — Muster
 * src/projekte/types.ts: das JSON-Schema ist die lesbare Beschreibung,
 * validiereRoadmapDaten (src/projektkontext/index.ts) die ausgeführte
 * Regel, diese Typen die übersetzte Form.
 *
 * Wird aufgerufen von: src/projektkontext/index.ts,
 * scripts/check-f33-projektkontext.mjs.
 */

/** Zwilling des 'status'-Enums in schemas/roadmap.schema.json. Manuell gepflegt (Muster ProjektStatus in src/projekte/types.ts) — kein automatisch abgeleiteter Zustand. */
export type MeilensteinStatus = 'GEPLANT' | 'LAEUFT' | 'ABGESCHLOSSEN'

/** Typisierte Form eines gegen schemas/roadmap.schema.json gültigen Meilenstein-Eintrags. */
export interface MeilensteinEintrag {
  id: string
  titel: string
  status: MeilensteinStatus
  features: string[]
}

/** Typisierte Form eines gegen schemas/roadmap.schema.json gültigen Roadmap-Dokuments. */
export interface RoadmapDaten {
  roadmap_schema: 'v0'
  vision: string
  meilensteine: MeilensteinEintrag[]
}
