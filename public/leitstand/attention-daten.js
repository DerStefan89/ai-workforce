/**
 * Datei: public/leitstand/attention-daten.js
 *
 * Zweck: Geteiltes Modul für die beiden Attention-Zahlen (F21 WS-2) —
 * verhindert, dass views/attention.js und views/dashboard.js je eine eigene,
 * potenziell abweichende Filterregel für "braucht Aufmerksamkeit" führen.
 * filtereAttentionWorkflows/filtereAttentionLaeufe rechnen auf dem ohnehin
 * gepollten Zustands-Aggregat (kein I/O); holeOffeneP0P1Workitems kapselt
 * den einen GET /api/workitems-Abruf (kein Attention-Endpunkt, F21
 * Nicht-Ziele) und filtert P0/P1 client-seitig, nachdem der Server bereits
 * auf status=OFFEN gefiltert hat.
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/attention.js
 * - public/leitstand/views/dashboard.js
 * - public/leitstand/jarvis-vorfilter.js (F26 WS-2a, "was braucht mich")
 */

import { holeWorkitems } from './api.js'

/** Workflows, die auf eine menschliche Aktion warten (F15 WS-3b Automaten-Verdikt). @param workflows - zustand.workflows, oder null bei defekter Quelle @returns gefilterte Liste, oder null */
export function filtereAttentionWorkflows(workflows) {
  if (workflows === null) return null
  return workflows.filter((w) => w.naechster?.art === 'haltFreigabe' || w.naechster?.art === 'haltKlaerung')
}

/** Läufe, die fehlgeschlagen und noch nicht kenntnisgenommen sind (F21 WS-1 AK4). @param laeufe - zustand.laeufe, oder null bei defekter Quelle @returns gefilterte Liste, oder null */
export function filtereAttentionLaeufe(laeufe) {
  if (laeufe === null) return null
  return laeufe.filter((l) => l.ergebnis === 'FEHLGESCHLAGEN' && l.kenntnisgenommen === false)
}

/**
 * Ein GET /api/workitems?status=OFFEN, P0/P1 danach client-seitig gefiltert
 * (der Server kennt 'OFFEN' nur für Findings — Feature-Akten fallen über den
 * status-Filter bereits heraus, siehe src/workboard/index.ts erfuelltFilter).
 * @returns { workitems, befunde, fehler } — workitems null bei defekter Quelle
 */
export async function holeOffeneP0P1Workitems() {
  const antwort = await holeWorkitems({ status: 'OFFEN' })
  const workitems = antwort.workitems === null ? null : antwort.workitems.filter((w) => w.prioritaet === 'P0' || w.prioritaet === 'P1')
  return { workitems, befunde: antwort.befunde ?? [], fehler: antwort.fehler ?? [] }
}
