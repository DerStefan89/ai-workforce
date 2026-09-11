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
 * F14 WS-4 (F-177): optionales zeitgrenzeMs nach demselben Muster wie
 * werkzeugStartziel/berechtigungskontext — scripts/leitstand-server.mjs
 * liest es serverseitig aus der geladenen Startvorlage und reicht es an
 * AusfuehrungsOptionen durch. Fehlt das Feld, bleibt der Prozessstart ohne
 * Wanduhr-Grenze (kein fachlich fest codierter Default).
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
  /** Harte Wanduhr-Grenze in Millisekunden für jeden über diese Startvorlage gestarteten Lauf (F14 WS-4, F-177). Optional — fehlt sie, bleibt der Prozessstart ohne Timeout. */
  zeitgrenzeMs?: number
  /**
   * Startfelder je zusätzlichem Worker (F16 WS-1, AK5). Optional: eine
   * Startvorlage ohne diesen Block bleibt unverändert gültig, und
   * startvorlage_schema bleibt 'v0' (Präzedenz zeitgrenzeMs, F14 WS-4 —
   * additive optionale Felder brechen keine bestehende Vorlage).
   *
   * Bewusste v0-Asymmetrie: die Claude-Code-Startfelder stehen flach auf
   * oberster Ebene (werkzeugStartziel/werkzeugVersionDeklariert/
   * berechtigungskontext), die Codex-Felder genestet. Ein späteres v1
   * normalisiert das; ein Umbau jetzt wäre ein Schemabruch ohne
   * Verbraucher. werkzeugsaetze wird für Codex NICHT wiederverwendet:
   * erlaubte_werkzeuge ist ein --allowedTools-Begriff von Claude Code
   * ohne Codex-Entsprechung (F-286).
   */
  worker?: {
    codex?: {
      startziel: string[]
      versionDeklariert: string
      sandbox: 'read-only'
    }
  }
}
