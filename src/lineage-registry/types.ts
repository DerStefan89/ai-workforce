/**
 * Datei: src/lineage-registry/types.ts
 *
 * Zweck: Gemeinsame Typen für die Artifact Registry / Lineage (F2).
 * lineageDaten ist die Form von checkpoint.payload.daten mit innerem
 * Diskriminator daten.typ === "lineage" (plan-v2 Delta 1) —
 * schemas/kontrollzustand-lineage-payload.schema.json beschreibt dieselbe
 * Form maschinell.
 */

export type Erzeugungsart = 'kern' | 'werkzeug'
export type Entscheidung = 'neu_erzeugen' | 'nachtrag' | 'unveraendert_gueltig'

export interface EingabeReferenz {
  pfad: string
  zitierter_bereich: unknown
  inhalts_hash: string
}

export interface ArtefaktVersionDaten {
  typ: 'lineage'
  art: 'artefakt_version'
  artefakt_id: string
  erzeugungsart: Erzeugungsart
  inhalts_hash: string
  herkunft?: unknown
  eingaben: EingabeReferenz[]
  daten?: unknown
  pfad?: string
  zitierter_bereich?: unknown
}

export interface StaleEntscheidungDaten {
  typ: 'lineage'
  art: 'stale_entscheidung'
  artefakt_id: string
  bezieht_sich_auf: { sequenz: number }
  entscheidung: Entscheidung
  begruendung?: string
  betroffene_eingaben?: string[]
}

export type LineageDaten = ArtefaktVersionDaten | StaleEntscheidungDaten

export interface ArtefaktVersion {
  artefaktId: string
  versionSequenz: number
  erzeugungsart: Erzeugungsart
  inhaltsHash: string
  herkunft: unknown
  eingaben: EingabeReferenz[]
  daten?: unknown
}

export type LineageEreignisname =
  | 'lineage_registriert'
  | 'lineage_geladen'
  | 'lineage_kein_gueltiger_gefunden'
  | 'lineage_validierungsfehler'
  | 'lineage_stale_geprueft'
  | 'lineage_entscheidung_festgehalten'

export interface LineageEreignis {
  ereignis: LineageEreignisname
  artefakt_id: string
  zeitstempel: string
  versionSequenz?: number
  verstoesse?: string[]
  geaenderteEingaben?: string[]
}

export type LineageSchreiber = (ereignis: LineageEreignis) => void
