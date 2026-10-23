/**
 * Datei: src/faehigkeiten/types.ts
 *
 * Zweck: Typen der Fähigkeiten je Projekt (F45 F-1, F-815/F-816/F-1012): lokale Aktivierungsdatei
 * (~/.ai-workforce/faehigkeiten.lokal.json, E-F45-6/7/8), Projekt-Agents/-Skills nach Inhalt und die
 * Start-Bausteine eines Laufs. Das JSON-Schema schemas/faehigkeiten-lokal.schema.json ist die lesbare Form,
 * validiereFaehigkeitenLokal die ausgeführte Regel (Muster src/projekte).
 *
 * Wird aufgerufen von:
 * - src/faehigkeiten/index.ts, src/faehigkeiten/start.ts, src/faehigkeiten/faehigkeiten.test.ts
 * - scripts/leitstand-server.mjs, scripts/leitstand/routen-faehigkeiten.mjs
 *
 * Wichtig: Schlüssel eines Projekt-Eintrags ist '<typ>:<name>' (agent:qa, skill:ponytail) — dieselbe Form in an,
 * inhalt_freigaben, der Laufakte (id) und den Endpunkten.
 */

/**
 * Einstellungen eines Projekts in der lokalen Datei — an: Projekt-Einträge (Opt-in), aus: Katalog-ids. Seit F45 F-3b-1
 * zusätzlich plugin_zuordnung (Rolle → '<skill|agent>:<plugin-id>:<name>', nur 'ausfuehrung', E-F3b-3); optional, damit
 * bestehende Aufrufer und Tests ohne das Feld gültig bleiben; projektEinstellungen liefert es nur, wenn das Projekt eines hat.
 */
export interface ProjektEinstellungen {
  an: string[]
  aus: string[]
  inhalt_freigaben: Record<string, string>
  plugin_zuordnung?: Record<string, string[]>
}

/** F45 F-3b-1: Freigabe eines Plugins aus Stefans Claude Code — an den Hash der gefilterten Kopie und genau einen Bericht gebunden. */
export interface PluginFreigabe {
  kopie_hash: string
  /** '<artefakt_id>@<version>' des Prüfberichts, der bei der Freigabe galt */
  pruefbericht: string
  freigegeben_am: string
}

/** Geparste, gültige lokale Datei. */
export interface FaehigkeitenLokal {
  faehigkeiten_lokal_schema: 'v0'
  /** F45 F-3b-1: Freigaben je Plugin-id (global, für den Inhalt) — fehlt, wenn leer. */
  plugin_freigaben?: Record<string, PluginFreigabe>
  projekte: Record<string, Partial<ProjektEinstellungen>>
}

/** Ergebnis von ladeFaehigkeitenLokal — ungueltig sperrt jeden Start mit Katalog-Fähigkeiten (E-F45-7). */
export type LokaleDatei =
  | { zustand: 'fehlt'; daten: FaehigkeitenLokal }
  | { zustand: 'gueltig'; daten: FaehigkeitenLokal; hash: string }
  | { zustand: 'ungueltig'; grund: string }

/** Art eines Projekt-Eintrags. */
export type ProjektTyp = 'agent' | 'skill'

/** Ein Agent bzw. Skill im Projekt- oder Arbeitsordner, bewertet nach Inhalt und Einstellung. */
export interface ProjektFaehigkeit {
  /** '<typ>:<name>' */
  schluessel: string
  typ: ProjektTyp
  name: string
  /** relativ zu .claude/ ('/' als Trenner): agents/qa.md bzw. skills/ponytail */
  pfad: string
  /** sha256 der Datei (Agent) bzw. inhalt_hash des Ordners (Skill); null, wenn nicht lesbar */
  hash: string | null
  /** Quelle der Freigabe: Katalog-Datei der Workforce, Projekt-Freigabe nach Inhalt, oder keine */
  freigabe: 'katalog' | 'projekt' | null
  /** Hash der Katalog-Datei gleichen Namens, falls vorhanden (Anzeige) */
  katalog_hash: string | null
  /** in an des Projekts */
  eingeschaltet: boolean
  aktiv: boolean
  /** Grund, wenn nicht aktiv (Sperre, fehlende Freigabe, nicht eingeschaltet) */
  grund: string | null
  /** F45 F-2a: Frontmatter-description (strenger Leser, Advisor A11); null, wenn die Frontmatter gesperrt oder nicht lesbar ist */
  beschreibung: string | null
}

/** Katalog-Freigabe eines internen agent/skill-Eintrags: id und Hash der Datei der Workforce. */
export interface KatalogFreigabe {
  id: string
  hash: string
}

/** Referenzliste der eingebauten Einträge der CLI (src/faehigkeiten/eingebaut-referenz.json). */
export interface EingebautReferenz {
  cli_version: string
  agents: string[]
  plugins: string[]
  plugin_skills: string[]
}

/** Kontext für ermittleProjektFaehigkeiten: Katalog-Freigaben, Einstellungen des Projekts, Werkzeugnamen des Laufs, Referenzliste. */
export interface ProjektFaehigkeitenKontext {
  katalog: ReadonlyMap<string, KatalogFreigabe>
  einstellungen: ProjektEinstellungen
  werkzeugNamen: readonly string[]
  referenz: EingebautReferenz
}

/** Ergebnis von ermittleProjektFaehigkeiten. */
export interface ProjektFaehigkeitenErgebnis {
  eintraege: ProjektFaehigkeit[]
  /** Alle Agent-Namen im Ordner (Dateistamm und Frontmatter-name), für die Agent(…)-Sperre. */
  agentNamen: string[]
  /** Grund, aus dem ein Lauf mit ≥1 aktivem Eintrag nicht startet (Verknüpfung, Mehrdeutigkeit, nicht sperrbar), sonst null. */
  hindernis: string | null
  /** F45 FB-1b (Advisor-Delta 8): dieselben Hindernisse einzeln (hindernis = hindernisse.join('; ')), leer = keines. */
  hindernisse: string[]
}
