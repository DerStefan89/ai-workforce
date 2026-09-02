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
      wirkungsmarke: { pfad: string; selbstHash: string }
    }
