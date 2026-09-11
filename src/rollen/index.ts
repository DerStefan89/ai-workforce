/**
 * Datei: src/rollen/index.ts
 *
 * Zweck: Rollenregister (F17 WS-1). ROLLENVERTRAEGE ist die einzige Stelle
 * im Repo, die Rollennamen definiert — Ersatz für die frühere, gleichnamige
 * Ausschlussmuster-Konstante aus src/context-builder/types.ts, das hier als
 * ausschlussmuster-Feld je Rolle aufgeht. Noch keine Durchsetzung von
 * erlaubte_werkzeugsatz_arten/erlaubte_worker/erlaubtes_output_schema —
 * das ist F17 WS-2 (validiereWorkflowDaten, loeseAusfuehrungsEingabenAuf).
 *
 * Wird aufgerufen von: src/context-builder/index.ts,
 * scripts/check-f17-rollenvertrag.mjs, src/rollen/rollen.test.ts.
 *
 * Wichtig: Die vier Einträge sind die real existierenden Rollen (F17
 * Entschieden, 11.09.2026) — keine neuen Rollen ohne Änderung an dieser
 * Datei. Die ausschlussmuster-Werte sind byte-gleich zu den vor der
 * Migration gültigen Werten der früheren Ausschlussmuster-Konstante.
 */

import type { Rollenvertrag } from './types.ts'

export const ROLLENVERTRAEGE: Record<string, Rollenvertrag> = {
  'architecture-advisor': {
    zweck: 'Prüft einen Plan vor dem Bau, ohne selbst Code zu lesen oder zu schreiben.',
    erlaubte_werkzeugsatz_arten: ['lesend'],
    erlaubte_worker: ['claude-code', 'codex'],
    erlaubtes_output_schema: null,
    ausschlussmuster: ['src/**'],
  },
  'code-reviewer': {
    zweck: 'Prüft fertigen Code nach dem Bau, ohne Freigabeartefakte zu sehen.',
    erlaubte_werkzeugsatz_arten: ['lesend'],
    erlaubte_worker: ['claude-code', 'codex'],
    erlaubtes_output_schema: 'ergebnis-code-reviewer',
    ausschlussmuster: ['state/tasks/**'],
  },
  qa: {
    zweck: 'Definiert Akzeptanztests und Randfälle, ohne Freigabeartefakte zu sehen.',
    erlaubte_werkzeugsatz_arten: ['lesend'],
    erlaubte_worker: ['claude-code', 'codex'],
    erlaubtes_output_schema: null,
    ausschlussmuster: ['state/tasks/**'],
  },
  ausfuehrung: {
    zweck: 'Baut und ändert Code, ohne Pfadeinschränkung.',
    erlaubte_werkzeugsatz_arten: ['lesend', 'schreibend'],
    erlaubte_worker: ['claude-code'],
    erlaubtes_output_schema: null,
    ausschlussmuster: [],
  },
}

/** Prüft, ob name ein Schlüssel von ROLLENVERTRAEGE ist. */
export function istBekannteRolle(name: string): boolean {
  return Object.hasOwn(ROLLENVERTRAEGE, name)
}

/** Alle bekannten Rollennamen, sortiert — für Fehlermeldungen. */
export function bekannteRollen(): string[] {
  return Object.keys(ROLLENVERTRAEGE).sort()
}
