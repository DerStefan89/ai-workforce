/**
 * Datei: src/codex-gateway/types.ts
 *
 * Zweck: Typen für das Codex-Gateway (F16 WS-1, features/F16/feature.md,
 * AK1/AK3). CodexAufrufEingaben ist die Eingabeform von baueCodexAufruf,
 * CodexEreignisse das Ergebnis des JSONL-Parsers leseCodexEreignisse.
 *
 * AufrufTokens wird bewusst aus ../claude-code-gateway/types.ts
 * wiederverwendet statt nachgebaut (D5): die Aufrufrepräsentation ist
 * identisch — ein Argv-Array, nie ein Kommandozeilen-String (F-057) — und
 * ein zweiter, gleichnamiger Typ würde beim nächsten prozessstart.ts-
 * Aufruf nur strukturell und nicht nominal passen.
 *
 * Wird aufgerufen von:
 * - src/codex-gateway/index.ts
 * - src/codex-gateway/codex-gateway.test.ts
 */

export type { AufrufTokens } from '../claude-code-gateway/types.ts'

/** Eingaben für baueCodexAufruf. ausgabeSchemaPfad ist null, wenn der Lauf ohne --output-schema stattfindet; ist er gesetzt, muss er ein absoluter Pfad sein (Codex löst relative Pfade gegen sein eigenes Arbeitsverzeichnis auf, das hier nicht zugesichert ist). */
export interface CodexAufrufEingaben {
  modell: string
  prompt: string
  ausgabeSchemaPfad: string | null
}

/**
 * Ergebnis des zeilenweisen JSONL-Parsers (AK3). Rein deskriptiv, keine
 * Klassifikation (ARCHITECTURE.md §4, F7-Grenze): turnCompleted und
 * turnFailed beschreiben nur, welche Ereignisse im Strom vorkamen, nicht
 * wie der Lauf ausgeht. unparsbareZeilen zählt Zeilen, die kein gültiges
 * JSON sind — der Parser wirft deswegen nie, weil ein einzelnes
 * Fremdformat im Strom die Beobachtungsbasis nicht vernichten darf.
 */
export interface CodexEreignisse {
  ereignisse: Array<Record<string, unknown>>
  turnCompleted: boolean
  turnFailed: boolean
  letzteAgentMessage: string | null
  unparsbareZeilen: number
}
