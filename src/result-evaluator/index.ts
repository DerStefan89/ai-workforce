/**
 * Datei: src/result-evaluator/index.ts
 *
 * Zweck: Result Evaluator (F7, state/tasks/f7-result-evaluator.md,
 * state/plan-v1-f7-result-evaluator.md). klassifiziereLauf ordnet einen von
 * F6a abgeschlossenen Lauf ausschließlich aus beobachtungsbasis_vollstaendig,
 * dem über F6as leseErgebnisobjekt geparsten Ergebnisobjekt und
 * permission_denials[] in genau einen der drei Terminalausgänge ein
 * (ARCHITECTURE §4, Prüfreihenfolge: Rohstrom-Integrität/-Fehlen vor
 * unvollständiger Beobachtungsbasis vor fehlendem Ergebnisobjekt — alle drei
 * FEHLGESCHLAGEN — vor VERWEIGERT vor ERFOLGREICH) und schreibt das Ergebnis
 * über F1Bs schreibeWirkungsmarke. Baut keinen eigenen Laufakte-Lesepfad
 * (Design-Entscheidung 2, plan-v1 Abschnitt 4) — der Aufrufer übergibt die
 * bereits geladene LaufakteV0Daten.
 *
 * Der tool_input→Tokens-Adapter (toolInputZuTokens/tokenisiereCommand) ist
 * neuer Code (Design-Entscheidung 5): pruefeAufrufparameter (F4) erwartet ein
 * Tokens-Array, tool_input ist ein werkzeugabhängiges Objekt (`{"command":…}`,
 * `{"query":…}`, state/tp-nachtrag.md TP-03d Messfall 1-3). `command` wird am
 * Leerzeichen tokenisiert, jedes Token danach von einem umschließenden
 * Anführungszeichen befreit — deckt sowohl unquotierte Mehrwort-Aufrufe als
 * auch einen in Shell-Quoting eingebetteten Verbotswert ab (plan-v1
 * Abschnitt 8.4, offene Unsicherheit 4). Ein Treffer wird nur gezählt
 * (bypass_verdacht_anzahl), nicht eskaliert (E-186, kein Adressat ohne F8).
 */

import { readFileSync } from 'node:fs'
import { leseErgebnisobjekt } from '../claude-code-gateway/index.ts'
import type { LaufakteV0Daten } from '../claude-code-gateway/types.ts'
import { schreibeWirkungsmarke, sha256Hex } from '../checkpoint-store/index.ts'
import type { ProfilReferenz } from '../checkpoint-store/types.ts'
import { pruefeAufrufparameter } from '../invocation-policy/index.ts'
import type { KlassifikationsEingaben, KlassifikationsErgebnis, KlassifikationsOptionen } from './types.ts'

type ErgebnisOhneWirkungsmarke =
  | { ergebnis: 'FEHLGESCHLAGEN'; grund: string }
  | { ergebnis: 'VERWEIGERT'; bypass_verdacht_anzahl: number; is_error?: unknown; non_execution_kind?: unknown }
  | { ergebnis: 'ERFOLGREICH'; is_error?: unknown; non_execution_kind?: unknown }

/** Entfernt ein einzelnes führendes/abschließendes Anführungszeichen (', ") von einem Token — deckt einen in Shell-Quoting eingebetteten Verbotswert ab (plan-v1 Abschnitt 8.4), ohne einen vollständigen Shell-Parser nachzubauen. */
function saeubereToken(token: string): string {
  return token.replace(/^['"]+|['"]+$/g, '')
}

function tokenisiereCommand(command: string): string[] {
  return command
    .split(/\s+/)
    .filter((token) => token.length > 0)
    .map(saeubereToken)
}

/** Übersetzt ein tool_input-Objekt (Form variiert je Werkzeugtyp) in ein Tokens-Array für pruefeAufrufparameter (F4) — neuer Adapter, kein reiner Aufruf (Design-Entscheidung 5). Nur der Feldname 'command' wird tokenisiert, andere String-Felder (z. B. 'query') bleiben ein einzelnes Token. */
function toolInputZuTokens(toolInput: unknown): string[] {
  if (typeof toolInput !== 'object' || toolInput === null || Array.isArray(toolInput)) return []
  const tokens: string[] = []
  for (const [feld, wert] of Object.entries(toolInput as Record<string, unknown>)) {
    if (typeof wert !== 'string') continue
    tokens.push(...(feld === 'command' ? tokenisiereCommand(wert) : [saeubereToken(wert)]))
  }
  return tokens
}

interface PermissionDenial {
  tool_input?: unknown
}

function istPermissionDenial(wert: unknown): wert is PermissionDenial {
  return typeof wert === 'object' && wert !== null
}

/**
 * Reine Klassifikationslogik ohne Wirkungsmarken-Schreibzugriff — getrennt
 * von klassifiziereLauf, damit die Prüfreihenfolge (SCOPE.2) an einer Stelle
 * steht und der Schreibaufruf in allen drei Ausgängen identisch bleibt.
 */
function ermittleErgebnis(laufakte: LaufakteV0Daten): ErgebnisOhneWirkungsmarke {
  let rohInhalt: string
  try {
    rohInhalt = readFileSync(laufakte.rohstrom_referenz.pfad, 'utf8')
  } catch {
    return { ergebnis: 'FEHLGESCHLAGEN', grund: 'rohstrom_fehlt' }
  }

  if (sha256Hex(rohInhalt) !== laufakte.rohstrom_referenz.inhalts_hash) {
    return { ergebnis: 'FEHLGESCHLAGEN', grund: 'rohstrom_integritaet' }
  }

  if (laufakte.beobachtungsbasis_vollstaendig === false) {
    return { ergebnis: 'FEHLGESCHLAGEN', grund: 'beobachtungsbasis_unvollstaendig' }
  }

  let rohstrom: { stdout?: unknown }
  try {
    rohstrom = JSON.parse(rohInhalt) as { stdout?: unknown }
  } catch {
    return { ergebnis: 'FEHLGESCHLAGEN', grund: 'kein_ergebnisobjekt' }
  }

  const ergebnisobjekt = typeof rohstrom.stdout === 'string' ? leseErgebnisobjekt(rohstrom.stdout) : null
  if (ergebnisobjekt === null) {
    return { ergebnis: 'FEHLGESCHLAGEN', grund: 'kein_ergebnisobjekt' }
  }

  const zusatzFelder: { is_error?: unknown; non_execution_kind?: unknown } = {
    ...('is_error' in ergebnisobjekt ? { is_error: ergebnisobjekt.is_error } : {}),
    ...('non_execution_kind' in ergebnisobjekt ? { non_execution_kind: ergebnisobjekt.non_execution_kind } : {}),
  }

  const denialsRaw = ergebnisobjekt.permission_denials
  const denials = Array.isArray(denialsRaw) ? denialsRaw.filter(istPermissionDenial) : []

  if (denials.length === 0) {
    return { ergebnis: 'ERFOLGREICH', ...zusatzFelder }
  }

  let bypassVerdachtAnzahl = 0
  for (const denial of denials) {
    const tokens = toolInputZuTokens(denial?.tool_input)
    if (!pruefeAufrufparameter(tokens).ok) bypassVerdachtAnzahl++
  }

  return { ergebnis: 'VERWEIGERT', bypass_verdacht_anzahl: bypassVerdachtAnzahl, ...zusatzFelder }
}

export function klassifiziereLauf(
  laufId: string,
  profilReferenz: ProfilReferenz,
  eingaben: KlassifikationsEingaben,
  optionen: KlassifikationsOptionen = {}
): KlassifikationsErgebnis {
  const teilergebnis = ermittleErgebnis(eingaben.laufakte)
  const { pfad, selbstHash } = schreibeWirkungsmarke(laufId, profilReferenz, 'terminal', { ergebnis: teilergebnis.ergebnis }, optionen)
  return { ...teilergebnis, wirkungsmarke: { pfad, selbstHash } }
}
