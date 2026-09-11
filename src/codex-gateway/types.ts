/**
 * Datei: src/codex-gateway/types.ts
 *
 * Zweck: Typen für das Codex-Gateway (F16 WS-1, features/F16/feature.md,
 * AK1/AK3). CodexAufrufEingaben ist die Eingabeform von baueCodexAufruf,
 * CodexEreignisse das Ergebnis des JSONL-Parsers leseCodexEreignisse.
 *
 * WS-2 (AK7) ergänzt CodexGatewayEingaben, CodexGatewayOptionen und
 * CodexRohstrom für starteCodexGateway. GatewayErgebnis wird aus dem
 * Claude-Code-Gateway wiederverwendet statt nachgebaut (D5): die Laufakte
 * ist dasselbe Artefakt, worker/modell_deklariert sind darin bereits
 * additive Felder (AK4).
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

import type { AufrufTokens, Starter } from '../claude-code-gateway/types.ts'
import type { ProfilReferenz } from '../checkpoint-store/types.ts'

export type { AufrufTokens } from '../claude-code-gateway/types.ts'
export type { GatewayErgebnis as CodexGatewayErgebnis } from '../claude-code-gateway/types.ts'

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
 * wie der Lauf ausgeht. unparsbareZeilen zählt Zeilen, die kein
 * Ereignisobjekt ergeben — sowohl syntaktisch ungültiges JSON als auch
 * syntaktisch gültige JSON-Skalare und -Arrays, damit `ereignisse`
 * ausschließlich Objekte trägt (F-322). Der Parser wirft deswegen nie,
 * weil ein einzelnes Fremdformat im Strom die Beobachtungsbasis nicht
 * vernichten darf.
 */
export interface CodexEreignisse {
  ereignisse: Array<Record<string, unknown>>
  turnCompleted: boolean
  turnFailed: boolean
  letzteAgentMessage: string | null
  unparsbareZeilen: number
}

/**
 * Eingaben für starteCodexGateway (WS-2, AK7). tokens kommt vom Aufrufer
 * bereits über baueCodexAufruf konstruiert — starteCodexGateway baut keinen
 * zweiten Aufruf (D5) und reicht genau dieses Array unverändert an
 * starteProzess weiter. Kein berechtigungskontext-Feld: der Wert ist für
 * Codex mit `--sandbox read-only` festgelegt und wird vom Gateway selbst
 * gesetzt, damit ihn kein Aufrufer umdeklarieren kann. modellDeklariert ist
 * Pflicht, weil der Modellname in KEINEM JSONL-Ereignis steht (F-305) — er
 * ist nur aus dem Argv rekonstruierbar und muss deshalb hereingereicht
 * werden.
 */
export interface CodexGatewayEingaben {
  laufId: string
  profilReferenz: ProfilReferenz
  tokens: AufrufTokens
  werkzeugStartziel: string[]
  werkzeugVersionDeklariert: string
  modellDeklariert: string
}

/** Durchreichoptionen für starteCodexGateway, geschnitten wie GatewayOptionen im Claude-Code-Gateway: schreiber ist nullstellig typisiert, weil derselbe Wert an F1Bs schreibeWirkungsmarke UND F2s registriereKernArtefakt geht, die je eine eigene, nicht kompatible Ereignis-Form erwarten. */
export interface CodexGatewayOptionen {
  schreiber?: () => void
  basisVerzeichnis?: string
  rohBasisVerzeichnis?: string
  starter?: Starter
  zeitgrenzeMs?: number
  abbruchSignal?: AbortSignal
}

/** Form des von starteCodexGateway geschriebenen Rohstroms (AK7). tokens ist gegenüber F6as Rohstrom NEU und Pflicht: der Result Evaluator erkennt an ihm, ob der Lauf mit '--output-schema' lief (AK8) — ohne das Feld wäre diese Frage aus dem Artefakt allein nicht beantwortbar. */
export interface CodexRohstrom {
  werkzeugStartziel: string[]
  tokens: AufrufTokens
  stdout: string
  stderr: string
  exitCode: number | null
  startfehler: { code: string | null; message: string } | null
  beendigungsart: 'TIMEOUT' | 'ABBRUCH' | null
}
