/**
 * Datei: src/ressourcen/types.ts
 *
 * Zweck: Typen für das Ressourcen-Modul (F19 WS-2, Meilenstein 3,
 * docs/projekt/zielfassung.md §13.4). Ressource ist die typisierte Form
 * eines Eintrags, der gegen schemas/ressourcen.schema.json passt (F19 WS-1)
 * — Muster src/router/types.ts: das JSON-Schema ist die lesbare
 * Beschreibung, validiereRessourcenDaten (src/ressourcen/index.ts) die
 * ausgeführte Regel, diese Typen die übersetzte Form. Herkunft ist Zwilling
 * der drei herkunft-Varianten im Schema; wer eine ändert, ändert beide
 * (dieselbe Zwillings-Bauart wie src/workflow/types.ts, dort ausführlich
 * begründet).
 *
 * Wird aufgerufen von: src/ressourcen/index.ts,
 * src/ressourcen/ressourcen.test.ts, scripts/check-f19-ressourcen.mjs.
 */

/** Zwilling des 'typ'-Enums in schemas/ressourcen.schema.json. */
export type RessourcenTyp = 'worker' | 'skill' | 'extern'

/** Zwilling des 'freigabe'-Enums in schemas/ressourcen.schema.json. */
export type Freigabe = 'FREIGEGEBEN' | 'OFFEN'

/** Zwilling der drei herkunft-Varianten in schemas/ressourcen.schema.json. */
export type Herkunft =
  | { art: 'startvorlage'; worker: 'claude-code' | 'codex' }
  | { art: 'skill'; pfad: string }
  | { art: 'extern'; url: string }

/** Typisierte Form eines gegen schemas/ressourcen.schema.json gültigen Eintrags. */
export interface Ressource {
  id: string
  typ: RessourcenTyp
  name?: string
  beschreibung?: string
  capabilities: string[]
  freigabe: Freigabe
  herkunft: Herkunft
}

/**
 * Ressource + zur Abfragezeit abgeleitete Felder. name/beschreibung sind
 * hier immer gesetzt (aus der Herkunft aufgelöst oder aus dem Eintrag
 * übernommen), verfuegbar und grund sind neu.
 */
export interface AufgelosteRessource extends Ressource {
  name: string
  beschreibung: string
  verfuegbar: boolean
  grund: string
}

/** Eine von einer Rolle benötigte Capability, für die keine verfügbare Ressource existiert. */
export interface CapabilityGap {
  capability: string
  rolle: string
}
