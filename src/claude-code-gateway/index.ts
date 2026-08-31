/**
 * Datei: src/claude-code-gateway/index.ts
 *
 * Zweck: Claude-Code-Gateway (F6a WS1,
 * state/tasks/f6a-claude-code-gateway-ws1.md) — Aufrufkonstruktion und
 * Startfreigabe für den Lesepfad, ohne jeden Prozessstart (WS2/WS3 folgen
 * als eigener Vertrag). baueAufruf konstruiert den Aufruf ausschließlich
 * als Tokens-Array (AK1). pruefeUndVerweigereBeiTreffer führt jeden Aufruf
 * vor jeder Weitergabe durch F4s pruefeAufrufparameter (E-182, AK2/AK4) —
 * ruft bei Treffer F4s verweigereStart auf, startet selbst nie einen
 * Prozess. Heißt bewusst nicht starteGateway, um keinen falschen Eindruck
 * laufender Prozesse zu erwecken (D5-Muster: kein Nachbau von F4).
 */

import { pruefeAufrufparameter, verweigereStart } from '../invocation-policy/index.ts'
import type { ProfilReferenz, Schreiber as CheckpointSchreiber } from '../checkpoint-store/types.ts'
import type { AufrufEingaben, AufrufTokens } from './types.ts'

interface Optionen {
  schreiber?: CheckpointSchreiber
  basisVerzeichnis?: string
}

/**
 * Wirft synchron (D4-Ausnahme wie F1Bs schreibeWirkungsmarke bei
 * ungültigem art/ergebnis), wenn eingaben.modell leer oder fehlt — E-185
 * ist eine Aufrufer-Vertragsverletzung, kein externer Rot-Fall.
 */
export function baueAufruf(eingaben: AufrufEingaben): AufrufTokens {
  if (!eingaben.modell) {
    throw new Error('AufrufEingaben.modell ist Pflichtfeld (E-185) — leer oder fehlend')
  }
  return [
    '--model',
    eingaben.modell,
    '--output-format',
    'json',
    '--setting-sources',
    'project',
    '--tools',
    eingaben.werkzeugsatz.erlaubte_werkzeuge.join(','),
  ]
}

export function pruefeUndVerweigereBeiTreffer(
  tokens: AufrufTokens,
  laufId: string,
  profilReferenz: ProfilReferenz,
  optionen: Optionen = {}
): { ok: true } | { ok: false; grund: string } {
  const ergebnis = pruefeAufrufparameter(tokens)
  if (!ergebnis.ok) {
    const grund = ergebnis.grund ?? 'verbotener Aufrufparameter (E-182)'
    verweigereStart(laufId, profilReferenz, grund, optionen)
    return { ok: false, grund }
  }
  return { ok: true }
}
