/**
 * Datei: src/claude-plugins/types.ts
 *
 * Zweck: Typen des Plugin-Bestands aus Stefans Claude Code (F45 F-3a-1, Plan features/F45/plan-f3a.md v2): Liste aus
 * `claude plugin list --json` (Entscheidung Stefan E-F3a-1), Bestandteile je Plugin aus dem Plugin-Ordner, Risiken als
 * Fakten aus der Deklaration (kein Modellurteil).
 *
 * Wird aufgerufen von: src/claude-plugins/index.ts, scripts/leitstand/routen-plugins.mjs (über die Rückgabewerte).
 *
 * Wichtig: Nur lesend. Der Bestand ist Anzeige, kein Kontrollzustand und keine Freigabe — im Lauf wirkt nichts davon
 * (init.plugins bleibt [], F-3b folgt).
 */

/** Ein Eintrag aus `claude plugin list --json` (gemessenes Format, CLI 2.1.299). */
export interface CliPluginEintrag {
  id: string
  version: string | null
  scope: string | null
  enabled: boolean | null
  installPath: string
  projectPath: string | null
  projectEnabled: boolean | null
}

/** Ergebnis des Listenaufrufs: stdout oder Grund. */
export type ListenErgebnis = { ok: true; stdout: string } | { ok: false; grund: string }

/** Pin-Stand eines MCP-Servers — Fakt aus command/args bzw. url. */
export type PinArt = 'gepinnt' | 'ungepinnt' | 'anderer_befehl' | 'entfernt' | 'unbestimmt'

export interface SkillTeil {
  name: string
  /** Pfad relativ zum Plugin-Ordner ('/' als Trenner) */
  pfad: string
  /** Regeln aus allowed-tools ([] ohne Feld) */
  allowed_tools: string[]
}

export interface AgentTeil {
  name: string
  pfad: string
  /** Werkzeuge aus tools ([] ohne Feld) */
  tools: string[]
}

export interface CommandTeil {
  name: string
  pfad: string
  allowed_tools: string[]
}

export interface HookTeil {
  ereignis: string
  matcher: string | null
  typ: string
  /** command bei Typ 'command', sonst null */
  befehl: string | null
  /** Quelle der Deklaration (Datei relativ oder 'plugin.json') */
  quelle: string
}

export interface McpTeil {
  name: string
  art: 'stdio' | 'http' | 'sse' | 'unbekannt'
  befehl: string | null
  args: string[]
  url: string | null
  pin: PinArt
  /** Paketangabe bei npx/uvx/…, sonst null */
  paket: string | null
  quelle: string
}

export interface LspTeil {
  name: string
  befehl: string | null
  args: string[]
  quelle: string
}

export interface Bestandteile {
  skills: SkillTeil[]
  agents: AgentTeil[]
  commands: CommandTeil[]
  hooks: HookTeil[]
  mcp: McpTeil[]
  lsp: LspTeil[]
}

/** Risiko-Arten (Fakten aus der Deklaration). */
export type RisikoArt = 'hook_befehl' | 'hook_andere' | 'mcp_ungepinnt' | 'mcp_entfernt' | 'rechte_ausserhalb' | 'rechte_nicht_bestimmbar' | 'externe_wirkung'

export interface Risiko {
  art: RisikoArt
  /** z. B. 'command:spike-cmd', 'hook:PreToolUse', 'mcp:gitkraken' */
  bestandteil: string
  text: string
}

export interface PluginEintrag {
  id: string
  name: string
  marketplace: string
  version: string | null
  /** gitCommitSha aus installed_plugins.json, sonst null */
  commit: string | null
  scope: string | null
  /** enabled laut CLI-Liste */
  aktiv: boolean | null
  /** bei scope local: Projekt, für das die CLI das Plugin installiert hat (aktiv gilt für den Ordner des Aufrufs, siehe PluginAntwort) */
  projekt_pfad: string | null
  projekt_aktiv: boolean | null
  pfad: string
  inhalt_hash: string | null
  /** Grund, wenn inhalt_hash null ist */
  hash_grund: string | null
  lizenz_datei: boolean
  lizenz_feld: string | null
  bestandteile: Bestandteile
  risiken: Risiko[]
  /** Teilfehler beim Lesen (Ordner fehlt, Datei kein JSON, unbekannte Form) — der Rest bleibt sichtbar */
  fehler: string[]
}

export interface EingebautEintrag {
  id: string
  quelle: 'referenzliste' | 'cli-liste'
  /** CLI-Version der Referenzmessung bzw. null */
  cli_version: string | null
}

export type PluginBestand =
  | {
      status: 'ok'
      quelle: { befehl: string; claude_ordner: string }
      plugins: PluginEintrag[]
      eingebaut: EingebautEintrag[]
      /** Grund, wenn die Referenzliste der eingebauten Plugins nicht lesbar war */
      eingebaut_fehler: string | null
    }
  | { status: 'fehler'; grund: string }

/**
 * Antwort von GET /api/plugins (scripts/leitstand/routen-plugins.mjs erzeugePluginAbruf, F-1091 (18)): der Bestand, maskiert;
 * bei status 'ok' zusätzlich `instanz_pfad` = Projektordner der Instanz = Arbeitsordner des Listenaufrufs. Nicht zu verwechseln
 * mit `plugins[].projekt_pfad` (Projekt, für das die CLI ein Plugin mit scope local installiert hat). Gemessen (CLI-Version in
 * features/F45/nachweise/f3a2/messung-scope-local.json): `enabled` eines Plugins mit scope local hängt vom Arbeitsordner des
 * Aufrufs ab (true nur aus dem Installationsprojekt) — `aktiv` gilt also für `instanz_pfad`, nicht allgemein (F-1091 (2)).
 */
export type PluginAntwort = (Extract<PluginBestand, { status: 'ok' }> & { instanz_pfad: string }) | Extract<PluginBestand, { status: 'fehler' }>

/** Grenzen beim Hashen (gezählt nach Ausschluss von .git/ und .in_use/). */
export interface HashGrenzen {
  dateien: number
  bytes: number
}
