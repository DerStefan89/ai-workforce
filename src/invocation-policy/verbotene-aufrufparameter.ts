/**
 * Datei: src/invocation-policy/verbotene-aufrufparameter.ts
 *
 * Zweck: E-182-Verbotsliste (docs/projekt/zielfassung.md §9.4) als
 * eigenständige, von F6 aufrufbare Prüffunktion — keine Schutzschicht
 * darf über einen dieser Aufrufparameter abgewählt werden.
 */

export const VERBOTENE_AUFRUFPARAMETER = [
  '--bare',
  '--safe-mode',
  '--dangerously-skip-permissions',
  '--allow-dangerously-skip-permissions',
  '--permission-mode bypassPermissions',
  '--fallback-model',
] as const

/**
 * F-048-Fix: ein Verbotseintrag mit eingebettetem Leerzeichen (z. B.
 * '--permission-mode bypassPermissions') wird zusätzlich zum bestehenden
 * includes-Pfad als zusammenhängendes Token-Fenster im parameter-Array
 * gesucht — ein Aufruf, der denselben Verbotswert auf zwei Tokens verteilt
 * übergibt, matchte sonst nie. Einwortige Einträge bleiben ausschließlich
 * über includes geprüft (kein Verhaltensbruch).
 */
function enthaeltTokenFenster(parameter: string[], tokens: string[]): boolean {
  for (let i = 0; i <= parameter.length - tokens.length; i++) {
    if (tokens.every((token, k) => parameter[i + k] === token)) return true
  }
  return false
}

export function pruefeAufrufparameter(parameter: string[]): { ok: boolean; grund?: string } {
  for (const verbotenerWert of VERBOTENE_AUFRUFPARAMETER) {
    if (parameter.includes(verbotenerWert)) {
      return { ok: false, grund: `verbotener Aufrufparameter (E-182): '${verbotenerWert}'` }
    }
    if (verbotenerWert.includes(' ') && enthaeltTokenFenster(parameter, verbotenerWert.split(' '))) {
      return { ok: false, grund: `verbotener Aufrufparameter (E-182): '${verbotenerWert}'` }
    }
  }
  return { ok: true }
}

/** Entfernt führende/abschließende Anführungszeichen (', ") von einem Token — deckt einen in Shell-Quoting eingebetteten Verbotswert ab (F7 plan-v1 Abschnitt 8.4), ohne einen vollständigen Shell-Parser nachzubauen. */
function saeubereToken(token: string): string {
  return token.replace(/^['"]+|['"]+$/g, '')
}

/** Zerlegt einen Befehlstext am Leerraum in Tokens, jedes von umschließenden Anführungszeichen befreit. */
function tokenisiereCommand(command: string): string[] {
  return command
    .split(/\s+/)
    .filter((token) => token.length > 0)
    .map(saeubereToken)
}

/**
 * Übersetzt ein tool_input-Objekt (Form variiert je Werkzeugtyp) in ein Tokens-Array für pruefeAufrufparameter — Adapter
 * aus dem Result Evaluator (F7, Design-Entscheidung 5), seit F45 B2b-3b-1a hier neben der Prüfung, damit auch die
 * Vorentscheidung des Rückfrage-Kanals (src/rueckfrage) dieselbe Regel nutzt, ohne den Evaluator zu importieren (Delta-Pass H7).
 * Nur der Feldname 'command' wird tokenisiert, andere String-Felder (z. B. 'query') bleiben ein einzelnes Token.
 * @param toolInput - tool_input eines Werkzeugaufrufs bzw. einer permission_denial
 * @returns Tokens (leer bei Nicht-Objekt)
 */
export function toolInputZuTokens(toolInput: unknown): string[] {
  if (typeof toolInput !== 'object' || toolInput === null || Array.isArray(toolInput)) return []
  const tokens: string[] = []
  for (const [feld, wert] of Object.entries(toolInput as Record<string, unknown>)) {
    if (typeof wert !== 'string') continue
    tokens.push(...(feld === 'command' ? tokenisiereCommand(wert) : [saeubereToken(wert)]))
  }
  return tokens
}
