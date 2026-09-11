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
 * Wichtig: Die vier Einträge aus F17 sind die real existierenden
 * Ausführungsrollen (F17 Entschieden, 11.09.2026) — keine neuen Rollen ohne
 * Änderung an dieser Datei. Die ausschlussmuster-Werte dieser vier sind
 * byte-gleich zu den vor der Migration gültigen Werten der früheren
 * Ausschlussmuster-Konstante. `router` kommt mit F18 WS-1 hinzu (E-M3-2,
 * docs/projekt/zielfassung.md §13.4, erlaubt Codex für die Rolle Router).
 *
 * F19 WS-1: jeder Vertrag trägt zusätzlich benoetigte_capabilities — Zwilling
 * der capabilities-Werte in ressourcen.json (Repo-Wurzel). Rein deklarativ,
 * noch ohne Durchsetzung (kein Produktionscode, kein Gate in WS-1).
 */

import type { Rollenvertrag } from './types.ts'

export const ROLLENVERTRAEGE: Record<string, Rollenvertrag> = {
  'architecture-advisor': {
    zweck: 'Prüft einen Plan vor dem Bau, ohne selbst Code zu lesen oder zu schreiben.',
    erlaubte_werkzeugsatz_arten: ['lesend'],
    erlaubte_worker: ['claude-code', 'codex'],
    erlaubtes_output_schema: null,
    ausschlussmuster: ['src/**'],
    benoetigte_capabilities: ['PLAN_REVIEW', 'REPO_READ'],
  },
  'code-reviewer': {
    zweck: 'Prüft fertigen Code nach dem Bau, ohne Freigabeartefakte zu sehen.',
    erlaubte_werkzeugsatz_arten: ['lesend'],
    erlaubte_worker: ['claude-code', 'codex'],
    erlaubtes_output_schema: 'ergebnis-code-reviewer',
    ausschlussmuster: ['state/tasks/**'],
    benoetigte_capabilities: ['CODE_REVIEW', 'REPO_READ', 'STRUCTURED_OUTPUT'],
  },
  qa: {
    zweck: 'Definiert Akzeptanztests und Randfälle, ohne Freigabeartefakte zu sehen.',
    erlaubte_werkzeugsatz_arten: ['lesend'],
    erlaubte_worker: ['claude-code', 'codex'],
    erlaubtes_output_schema: null,
    ausschlussmuster: ['state/tasks/**'],
    benoetigte_capabilities: ['TEST_DESIGN', 'REPO_READ'],
  },
  ausfuehrung: {
    zweck: 'Baut und ändert Code, ohne Pfadeinschränkung.',
    erlaubte_werkzeugsatz_arten: ['lesend', 'schreibend'],
    erlaubte_worker: ['claude-code'],
    erlaubtes_output_schema: null,
    ausschlussmuster: [],
    benoetigte_capabilities: ['CODE_WRITE', 'REPO_READ'],
  },
  router: {
    zweck:
      'Klassifiziert einen Auftrag (Ziel-Text) und schlägt Kontrolltiefe und Vorlage für den auszuführenden Workflow vor, ohne selbst Code zu lesen.',
    erlaubte_werkzeugsatz_arten: ['lesend'],
    erlaubte_worker: ['claude-code', 'codex'],
    erlaubtes_output_schema: 'ergebnis-router',
    ausschlussmuster: ['src/**'],
    benoetigte_capabilities: ['TASK_CLASSIFICATION', 'STRUCTURED_OUTPUT'],
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
