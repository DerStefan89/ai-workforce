/**
 * Datei: public/leitstand/persona-state.js
 *
 * Zweck: F28 WS-1 — reine Ableitungsfunktion des Persona-Zustands aus dem
 * ohnehin gepollten Zustands-Aggregat (zustand.js, GET /api/zustand). Vier
 * Zustände, strikte Priorität error > waiting_for_human > thinking > idle.
 * Nutzt die bestehenden Attention-Filter aus attention-daten.js, statt
 * deren Filterregeln hier ein zweites Mal zu formulieren — genau dafür
 * existiert dieses Modul (siehe dessen Kopfkommentar).
 *
 * Wird aufgerufen von:
 * - public/leitstand/persona.js (bei jedem Poll-Tick, über zustand.js' abonniere())
 *
 * Wichtig: leitePersonaZustandAb wirft nie. Eine defekte Quelle liefert im
 * Aggregat null statt eines Werts (Muster sammleZustandsQuelle,
 * leitstand-server.mjs) — filtereAttentionLaeufe/filtereAttentionWorkflows
 * sind bereits null-sicher (geben dann null zurück), diese Funktion prüft
 * zusätzlich jedes null-fähige Feld selbst, bevor sie dessen .length liest.
 */

import { filtereAttentionLaeufe, filtereAttentionWorkflows } from './attention-daten.js'

/**
 * Leitet den Persona-Zustand aus dem Zustands-Aggregat ab.
 * @param zustand - { laeufe, startfehler, workflows, fehler, aktiverLauf } — das Aggregat aus GET /api/zustand
 * @returns 'error' | 'waiting_for_human' | 'thinking' | 'idle'
 */
export function leitePersonaZustandAb(zustand) {
  const pollFehlerVorhanden = (zustand.fehler?.length ?? 0) > 0
  const startfehlerVorhanden = Array.isArray(zustand.startfehler) && zustand.startfehler.length > 0
  const attentionLaeufe = filtereAttentionLaeufe(zustand.laeufe ?? null)
  const laeufeBrauchenAufmerksamkeit = attentionLaeufe !== null && attentionLaeufe.length > 0

  if (pollFehlerVorhanden || startfehlerVorhanden || laeufeBrauchenAufmerksamkeit) return 'error'

  const attentionWorkflows = filtereAttentionWorkflows(zustand.workflows ?? null)
  if (attentionWorkflows !== null && attentionWorkflows.length > 0) return 'waiting_for_human'

  if (zustand.aktiverLauf?.aktiv === true) return 'thinking'

  return 'idle'
}
