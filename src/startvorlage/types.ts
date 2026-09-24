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

/** Ein benannter Werkzeugsatz trägt zusätzlich zur Gateway-Form (WerkzeugsatzBegrenzung) seine Art (lesend/schreibend/recherchierend) — AK4 verlangt mindestens je einen lesenden und einen schreibenden; 'recherchierend' (F27 WS-1) ist additiv und ohne Mindestanforderung. */
export interface BenannterWerkzeugsatz extends WerkzeugsatzBegrenzung {
  art: 'lesend' | 'schreibend' | 'recherchierend'
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
   * F-652 (state/findings.md F-652, BUG P1): argv eines deterministischen Prüfbefehls (z. B.
   * `npm run check`), den der KERN nach jedem real erfolgreich beendeten Lauf mit schreibendem
   * Werkzeugsatz selbst ausführt (src/pruefschritt/index.ts) — kein Werkzeugsatz trägt Bash/npm,
   * eine Rolle kann den Befehl also nicht selbst starten. [0] ist ein absoluter Programmpfad, kein
   * Shell-String (F-057, geprüft von pruefeStartziel wie jedes andere Startziel). Optional und
   * additiv: eine Startvorlage ohne dieses Feld bleibt bitgenau unverändert (kein Prüfschritt, kein
   * 'pruefergebnis-<laufId>'-Artefakt).
   */
  pruefbefehl?: string[]
  /**
   * F-652: harte Wanduhr-Grenze für den Prüfbefehl, unabhängig von zeitgrenzeMs oben (das ist die
   * Grenze des Werkzeuglaufs selbst, nicht der Nachbereitung). Nur wirksam zusammen mit
   * pruefbefehl; ohne pruefbefehl bleibt das Feld folgenlos.
   */
  pruefZeitgrenzeMs?: number
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
