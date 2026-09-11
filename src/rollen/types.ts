/**
 * Datei: src/rollen/types.ts
 *
 * Zweck: Typen für den Rollenvertrag (F17 WS-1). Ein Rollenvertrag legt
 * fest, mit welcher Werkzeugsatz-Art, auf welchem Worker und mit welchem
 * Ausgabeschema eine Rolle ausgeführt werden darf — plus die Pfadmuster,
 * die ihr im Context Builder (F5) verschlossen bleiben.
 *
 * Wird aufgerufen von: src/rollen/index.ts.
 *
 * Wichtig: erlaubte_werkzeugsatz_arten ist Zwilling von
 * werkzeugsaetze[].art in schemas/startvorlage.schema.json ('lesend' |
 * 'schreibend'); erlaubte_worker ist Zwilling von WORKER in
 * src/workflow/index.ts ('claude-code' | 'codex'). Wer eine der beiden
 * Quellen ändert, prüft diese Zwillinge mit.
 */

export interface Rollenvertrag {
  zweck: string
  /** Zwilling von werkzeugsaetze[].art in schemas/startvorlage.schema.json. */
  erlaubte_werkzeugsatz_arten: Array<'lesend' | 'schreibend'>
  /** Zwilling von WORKER in src/workflow/index.ts. */
  erlaubte_worker: Array<'claude-code' | 'codex'>
  erlaubtes_output_schema: string | null
  ausschlussmuster: string[]
  /** F19 WS-1. Capabilities, die eine Ressource mitbringen muss, um diese Rolle
      auszuführen. Zwilling der capabilities-Werte in ressourcen.json. */
  benoetigte_capabilities: string[]
}
