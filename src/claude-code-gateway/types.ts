/**
 * Datei: src/claude-code-gateway/types.ts
 *
 * Zweck: Typen für das Claude-Code-Gateway (F6a WS1,
 * state/tasks/f6a-claude-code-gateway-ws1.md). AufrufTokens ist die
 * einzige zulässige Aufrufrepräsentation (kein zusammengesetzter
 * Kommandozeilen-String, AK1). WerkzeugsatzBegrenzung bleibt wie F4
 * ausschließlich im Rang 'DEKLARIERT' (E-187).
 */

export type AufrufTokens = string[]

export interface WerkzeugsatzBegrenzung {
  modus: 'DEKLARIERT'
  erlaubte_werkzeuge: string[]
}

export interface AufrufEingaben {
  modell: string
  werkzeugsatz: WerkzeugsatzBegrenzung
}
