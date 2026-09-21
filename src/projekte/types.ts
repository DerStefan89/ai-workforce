/**
 * Datei: src/projekte/types.ts
 *
 * Zweck: Typen für das Projektregister (F25 WS-1, features/F25/feature.md
 * AK1). ProjektEintrag ist die typisierte Form eines Eintrags, der gegen
 * schemas/projekte.schema.json passt — Muster src/ressourcen/types.ts: das
 * JSON-Schema ist die lesbare Beschreibung, validiereProjekteDaten
 * (src/projekte/index.ts) die ausgeführte Regel, diese Typen die
 * übersetzte Form.
 *
 * Wird aufgerufen von: src/projekte/index.ts, scripts/leitstand-server.mjs,
 * scripts/check-f25-projekte.mjs.
 */

/** Zwilling des 'status'-Enums in schemas/projekte.schema.json. Manuell gepflegt (Muster 'freigabe' in F19) — kein automatisch abgeleiteter Zustand. */
export type ProjektStatus = 'IDEE' | 'DISCOVERY' | 'GEPLANT' | 'IN_ENTWICKLUNG' | 'TEST' | 'NUTZBAR' | 'BETRIEB' | 'PAUSIERT' | 'ARCHIVIERT'

/** Typisierte Form eines gegen schemas/projekte.schema.json gültigen Registereintrags. */
export interface ProjektEintrag {
  id: string
  name: string
  repo_pfad: string
  startvorlage_pfad: string
  profil_pfad: string
  basisverzeichnis: string
  status: ProjektStatus
  /** F33 WS-1 (E-M4-2). Optional — fehlt das Feld, gilt 'docs/projekt/kontext'. */
  kontext_pfad?: string
  /** F33 WS-1 (E-M4-2). Optional — fehlt das Feld, gilt 'docs/projekt/roadmap.json'. */
  roadmap_pfad?: string
}
