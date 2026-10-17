/**
 * Datei: src/rueckfrage/types.ts
 *
 * Zweck: Typen der reinen Regel des Rückfrage-Kanals (F45 B2b-3b-1a, features/F45/plan-b2b3b1a-v2.md): Ergebnis der
 * Vorentscheidung, Optionen der Pfadprüfung und die Daten eines eingeschalteten Kanals für den Argv-Baustein.
 *
 * Wird aufgerufen von: src/rueckfrage/index.ts (Typen, re-exportiert für scripts/leitstand-server.mjs und das Gate).
 */

/** Ergebnis der Vorentscheidung über eine Rechte-Anfrage der CLI: automatisch ablehnen oder Stefan vorlegen. */
export type Vorentscheidung = { art: 'auto_deny'; grund: string } | { art: 'frage_stefan' }

/** Ergebnis der Pfadprüfung — fail closed: alles Unklare ist `ok: false`. */
export type PfadErgebnis = { ok: true } | { ok: false; grund: string }

/** Optionen der Pfadprüfung; beide nur für Tests überschreibbar. */
export interface PfadOptionen {
  /** Pfadregeln: 'win32' (Laufwerk, `\` = `/`, ohne Groß/klein) oder 'posix'; Standard nach process.platform. */
  plattform?: 'win32' | 'posix'
  /**
   * Löst Symlinks/Junctions auf (Standard realpathSync.native). Muss bei fehlendem Pfad mit code 'ENOENT' bzw. 'ENOTDIR'
   * werfen; jeder andere Wurf gilt als „nicht prüfbar“.
   */
  realpath?: (pfad: string) => string
}

/** Daten eines eingeschalteten Rückfrage-Kanals für einen Lauf (gesetzt nur vom Leitstand, nie aus einem Body). */
export interface RueckfrageKanal {
  /** API-Basis der Instanz im Leitstand, nur Loopback (Workforce `http://127.0.0.1:<port>/api`, Projekt `…/api/projekte/<id>`; B2b-3b-2b-2a-1). */
  url: string
  /** Token je Lauf, 64 Hex-Zeichen — berechtigt nur zum Fragen. */
  token: string
  /** Absoluter Pfad des MCP-Server-Skripts (scripts/leitstand/rueckfrage-mcp.mjs der Installation). */
  skriptPfad: string
  /** Node-Programm, mit dem die CLI das Skript startet (process.execPath). */
  nodePfad: string
  /** Wartegrenze je Rückfrage im Leitstand (ms); Frist des Skripts und timeout der CLI liegen darüber. */
  warteGrenzeMs: number
}

/** Was der Argv-Baustein an den Aufruf-Eingaben eines Laufs liest und setzt. */
export interface RueckfrageAufrufBasis {
  mcpConfig?: string
  permissionPromptTool?: string
  werkzeugsatz: { modus?: string; erlaubte_werkzeuge: readonly string[] }
}
