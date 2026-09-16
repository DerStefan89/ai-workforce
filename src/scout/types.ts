/**
 * Datei: src/scout/types.ts
 *
 * Zweck: Typen für das Ergebnis der Rolle 'scout' (F27 WS-1). Spiegelt
 * schemas/ergebnis-scout.schema.json — die einzige Formbeschreibung,
 * validiereErgebnisScout (src/scout/index.ts) die einzige Prüfung dagegen
 * (D5, Muster src/router/types.ts).
 *
 * Wird aufgerufen von: src/scout/index.ts.
 */

export type ScoutKandidatTyp = 'skill' | 'extern'
export type ScoutFit = 'hoch' | 'mittel' | 'niedrig'
export type ScoutIntegrationsaufwand = 'gering' | 'mittel' | 'hoch'

export interface ScoutKandidat {
  name: string
  typ: ScoutKandidatTyp
  quelle_url: string
  capabilities: string[]
  fit: ScoutFit
  integrationsaufwand: ScoutIntegrationsaufwand
  rechte: string
  risiken: string[]
  lizenz?: string
  empfehlung: string
  unsicherheiten: string[]
}

export interface ErgebnisScout {
  gesuchte_capability: string
  kandidaten: ScoutKandidat[]
  hinweis_untrusted: true
}
