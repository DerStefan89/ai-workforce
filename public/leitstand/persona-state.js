/**
 * Datei: public/leitstand/persona-state.js
 *
 * Zweck: F28 WS-1 — reine Ableitungsfunktion des Persona-Zustands aus dem
 * ohnehin gepollten Zustands-Aggregat (zustand.js, GET /api/zustand). Vier
 * Zustände, strikte Priorität error > waiting_for_human > thinking > idle.
 * Nutzt die bestehenden Attention-Filter aus attention-daten.js, statt
 * deren Filterregeln hier ein zweites Mal zu formulieren — genau dafür
 * existiert dieses Modul (siehe dessen Kopfkommentar). F45 B5a-2 (F-991): „wartet auf
 * dich“ zählt auch offene Abnahmen (zaehleWartendeAufStefan, dieselbe Auswahl wie „Deine
 * Entscheidungen“).
 *
 * Wird aufgerufen von:
 * - public/leitstand/persona.js (bei jedem Poll-Tick, über zustand.js' abonniere())
 *
 * Wichtig: leitePersonaZustandAb wirft nie. Eine defekte Quelle liefert im
 * Aggregat null statt eines Werts (Muster sammleZustandsQuelle,
 * leitstand-server.mjs) — filtereAttentionLaeufe und zaehleWartendeAufStefan
 * sind bereits null-sicher (eine defekte Quelle zählt dort 0) (geben dann null zurück), diese Funktion prüft
 * zusätzlich jedes null-fähige Feld selbst, bevor sie dessen .length liest.
 */

import { filtereAttentionLaeufe, zaehleWartendeAufStefan } from './attention-daten.js'

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

  // F45 B5a-2 (F-991): Freigaben, Rückfragen UND offene Abnahmen — dieselbe Auswahl wie „Deine Entscheidungen“.
  if (zaehleWartendeAufStefan(zustand) > 0) return 'waiting_for_human'

  if (zustand.aktiverLauf?.aktiv === true) return 'thinking'

  return 'idle'
}
