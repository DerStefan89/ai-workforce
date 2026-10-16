/**
 * Datei: src/result-evaluator/types.ts
 *
 * Zweck: Typen für den Result Evaluator (F7, state/tasks/f7-result-
 * evaluator.md, state/plan-v1-f7-result-evaluator.md). KlassifikationsEingaben
 * trägt die vom Aufrufer bereits geladene LaufakteV0Daten — F7 baut keinen
 * eigenen Laufakte-Lesepfad (Design-Entscheidung 2). KlassifikationsErgebnis
 * ist eine mit dem Terminalausgang diskriminierte Union: `grund` existiert
 * nur bei FEHLGESCHLAGEN, `bypass_verdacht_anzahl` nur bei VERWEIGERT (E-186,
 * Design-Entscheidung 5). Kein eigenes Klassifikationsartefakt (Design-
 * Entscheidung 1) — `wirkungsmarke` verweist nur auf die von F1B tatsächlich
 * geschriebene Wirkungsmarke.
 */

import type { LaufakteV0Daten } from '../claude-code-gateway/types.ts'
import type { Schreiber as CheckpointSchreiber } from '../checkpoint-store/types.ts'

export interface KlassifikationsEingaben {
  laufakte: LaufakteV0Daten
  /**
   * F36 WS-5b (F-791 (4b)): nur bei Läufen mit Ort-B-Skills gesetzt — geänderte/neue Pfade des Laufdiffs
   * unter einem .claude-Ordner (vom Execution Controller ermittelt). Nicht leer → FEHLGESCHLAGEN
   * 'claude_ordner_veraendert'. Fehlt das Feld, bleibt die Klassifikation unverändert.
   */
  claudeAenderungen?: string[]
  /**
   * F45 B2b-3b-1b: daten der letzten Version des Kern-Artefakts `rueckfragen-<laufId>` (Rückfrage-Protokoll) oder null —
   * vom Execution Controller nur bei eingeschaltetem Kanal gesetzt. Ungültig oder null zählt wie fehlend. Fehlt das Feld,
   * bleibt die Klassifikation unverändert.
   */
  rueckfragen?: unknown
}

export interface KlassifikationsOptionen {
  schreiber?: CheckpointSchreiber
  basisVerzeichnis?: string
}

export type KlassifikationsErgebnis =
  | { ergebnis: 'FEHLGESCHLAGEN'; grund: string; wirkungsmarke: { pfad: string; selbstHash: string } }
  | {
      ergebnis: 'VERWEIGERT'
      bypass_verdacht_anzahl: number
      is_error?: unknown
      non_execution_kind?: unknown
      wirkungsmarke: { pfad: string; selbstHash: string }
    }
  | {
      ergebnis: 'ERFOLGREICH'
      is_error?: unknown
      non_execution_kind?: unknown
      /** F45 B2b-3b-1b: Anzahl der Ablehnungen allein durch Stefan (nur gesetzt, wenn es welche gab; steht auch in daten der Terminalmarke). */
      abgelehnt_durch_stefan?: number
      wirkungsmarke: { pfad: string; selbstHash: string }
    }
