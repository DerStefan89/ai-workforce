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
