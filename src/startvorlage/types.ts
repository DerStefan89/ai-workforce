/**
 * Datei: src/startvorlage/types.ts
 *
 * Zweck: Typen für die Startvorlage (F11 WS-2, AK4). STARTVORLAGE_V0 trägt
 * die maschinenkonstanten Startfelder eines Leitstand-Startauftrags
 * (werkzeugStartziel, werkzeugVersionDeklariert, berechtigungskontext,
 * profilPfad, modell, standardBudget) sowie benannte Werkzeugsätze, aus
 * denen ein Startauftrag über seinen Namen wählt (AK5) — dieselbe Form wie
 * schemas/startvorlage.schema.json, von validiereStartvorlageDaten
 * (index.ts) geprüft.
 *
 * Wird aufgerufen von:
 * - scripts/leitstand-server.mjs (löst einen Startauftrag-Body gegen eine
 *   geladene Startvorlage auf)
 */

import type { WerkzeugsatzBegrenzung } from '../claude-code-gateway/types.ts'

/** Ein benannter Werkzeugsatz trägt zusätzlich zur Gateway-Form (WerkzeugsatzBegrenzung) seine Art (lesend/schreibend) — AK4 verlangt mindestens je einen. */
export interface BenannterWerkzeugsatz extends WerkzeugsatzBegrenzung {
  art: 'lesend' | 'schreibend'
}

export interface StartvorlageV0Daten {
  startvorlage_schema: 'v0'
  profilPfad: string
  werkzeugStartziel: string[]
  werkzeugVersionDeklariert: string
  berechtigungskontext: string
  modell: string
  standardBudget: { maxElemente?: number; maxBytes?: number }
  werkzeugsaetze: Record<string, BenannterWerkzeugsatz>
}
