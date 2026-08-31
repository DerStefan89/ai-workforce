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

export function pruefeAufrufparameter(parameter: string[]): { ok: boolean; grund?: string } {
  for (const verbotenerWert of VERBOTENE_AUFRUFPARAMETER) {
    if (parameter.includes(verbotenerWert)) {
      return { ok: false, grund: `verbotener Aufrufparameter (E-182): '${verbotenerWert}'` }
    }
  }
  return { ok: true }
}
