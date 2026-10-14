/**
 * Datei: src/plugin-kopie/types.ts
 *
 * Zweck: Typen der gefilterten, gepinnten Kopie eines Plugins aus Stefans Claude Code (F45 F-3b-1, Plan
 * features/F45/plan-f3b.md v2.1): gelesene Quelle, Projektion (übernommen / nicht übernommen mit Grund, kopie_hash),
 * Ergebnis des Schreibens und Zustand der Freigabe.
 *
 * Wird aufgerufen von: src/plugin-kopie/index.ts, scripts/leitstand/routen-plugin-freigabe.mjs (über die Rückgabewerte).
 *
 * Wichtig: Grund-Codes sind stabil (die Oberfläche übersetzt sie, der Auftrag des Prüflaufs nennt nur sie, nie Befehle).
 */

import type { InhaltDatei } from '../sammlung/inhalt.ts'

/** Eine gelesene Datei aus den Standardordnern bzw. der Wurzel (bytes null = größer als GRENZEN.maxDateiBytes, nicht gelesen). */
export interface QuellDatei {
  pfad: string
  groesse: number
  bytes: Buffer | null
}

/** Gelesene Quelle eines Plugin-Ordners (nur lesend). */
export interface KopieQuelle {
  /** Text von .claude-plugin/plugin.json oder null (fehlt bzw. nicht lesbar) */
  manifestText: string | null
  /** Dateien unter skills/, agents/, commands/ und Lizenzdateien der Wurzel */
  dateien: QuellDatei[]
  /** Links/Junctions und andere Einträge unter den Standardordnern (nie verfolgt) */
  andere: Array<{ pfad: string; art: 'link' | 'eintragstyp' }>
}

/** Art eines Bestandteils der Kopie. */
export type KopieTyp = 'skill' | 'agent' | 'command'

/** Grund, aus dem ein Bestandteil nicht übernommen wird (stabile Codes). */
export type NichtGrund =
  | 'hook_nie'
  | 'mcp_spaeter'
  | 'lsp_nicht'
  | 'nur_standardordner'
  | 'frontmatter_unklar'
  | 'frontmatter_fehlt'
  | 'frontmatter_feld'
  | 'allowed_tools'
  | 'name_abweichend'
  | 'name_unzulaessig'
  | 'agent_tools_fehlt'
  | 'agent_tools_verboten'
  | 'agent_tools_ausserhalb'
  | 'agent_model'
  | 'werkzeugsatz_unbestimmt'
  | 'unterordner'
  | 'sperrname'
  | 'weitere_skill_md'
  | 'link'
  | 'binaer'
  | 'zu_gross'
  | 'pfad_abgelehnt'

/** Ein übernommener Bestandteil. */
export interface KopieTeil {
  typ: KopieTyp
  name: string
  /** Pfad der Hauptdatei relativ zum Plugin (SKILL.md, Agent- bzw. Command-Datei) */
  pfad: string
}

/** Ein nicht übernommener Bestandteil mit Grund (detail: Feldname bzw. Pfad, nie ein Befehl). */
export interface NichtTeil {
  typ: KopieTyp | 'hook' | 'mcp' | 'lsp' | 'pfad'
  name: string
  grund: NichtGrund
  detail: string | null
}

/** Ergebnis von projiziereKopie. */
export type Projektion =
  | { ok: true; kopie_hash: string; dateien: InhaltDatei[]; uebernommen: KopieTeil[]; nicht_uebernommen: NichtTeil[]; name: string; version: string | null }
  | { ok: false; grund: string; nicht_uebernommen: NichtTeil[] }

/** Ergebnis von schreibeKopie. */
export type KopieSchreiben = { ok: true; ordner: string; neu: boolean } | { ok: false; status: number; grund: string }

/** Auflösung einer Plugin-id im Bestand. */
export type AufloesungArt = 'eindeutig' | 'fehlt' | 'mehrdeutig' | 'unbestimmbar'

/** Zustand der Freigabe (Vorrang in bestimmeFreigabeZustand). */
export type FreigabeZustand = 'unbestimmbar' | 'mehrdeutig' | 'quelle_fehlt' | 'keine' | 'bericht_fehlt' | 'bericht_ueberholt' | 'kopie_veraendert' | 'veraltet' | 'freigegeben'
