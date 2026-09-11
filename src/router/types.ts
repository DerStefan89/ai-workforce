/**
 * Datei: src/router/types.ts
 *
 * Zweck: Typen für das Router-Modul (F18 WS-2, Meilenstein 3,
 * docs/projekt/zielfassung.md §13.4). ErgebnisRouter ist die typisierte Form
 * eines Objekts, das gegen schemas/ergebnis-router.schema.json passt (F18
 * WS-1) — Muster src/workflow/types.ts: das JSON-Schema ist die lesbare
 * Beschreibung, validiereErgebnisRouter (src/router/index.ts) die
 * ausgeführte Regel, diese Typen die übersetzte Form. Die drei Enum-Unions
 * unten sind Zwillinge der Enum-Werte im Schema; wer eine ändert, ändert
 * beide (dieselbe Zwillings-Bauart wie src/workflow/types.ts, dort
 * ausführlich begründet).
 *
 * Wird aufgerufen von: src/router/index.ts, src/router/router.test.ts,
 * scripts/route-auftrag.mjs.
 */

/** Zwilling des 'kontrolltiefe'-Enums in schemas/ergebnis-router.schema.json. */
export type Kontrolltiefe = 'fast-lane' | 'standard' | 'hoch'

/** Zwilling des 'risikoklasse'-Enums in schemas/ergebnis-router.schema.json. */
export type Risikoklasse = 'niedrig' | 'mittel' | 'hoch'

/** Zwilling des 'task_typen'-Item-Enums in schemas/ergebnis-router.schema.json. */
export type TaskTyp = 'text-aenderung' | 'neues-feature' | 'bugfix' | 'refactoring' | 'dokumentation' | 'unklar'

/** Typisierte Form eines gegen schemas/ergebnis-router.schema.json gültigen Objekts. */
export interface ErgebnisRouter {
  kontrolltiefe: Kontrolltiefe
  risikoklasse: Risikoklasse
  task_typen: TaskTyp[]
  rueckfragen: string[]
  begruendung: string
}
