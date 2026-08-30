/**
 * Datei: src/human-transport/types.ts
 *
 * Zweck: Gemeinsame Typen für Human Transport (F9). BedarfV0Daten und
 * TransportpaketDaten (Version 1/2) sind die Form von daten.daten — F2s
 * registriereKernArtefakt-Parameter 'daten' —, wenn bedarf_schema bzw.
 * transport_schema === "v0". schemas/kontrollzustand-bedarf-payload.
 * schema.json und schemas/kontrollzustand-transport-payload.schema.json
 * beschreiben dieselbe Form maschinell.
 */

export type WerkzeugAuswahl = null | { kandidat: string; quelle: string; manuell_bestaetigt_am: string }

export interface BedarfV0Daten {
  bedarf_schema: 'v0'
  lauf_id: string
  beschreibung: string
  werkzeug_auswahl: WerkzeugAuswahl
  erstellt_am: string
}

export type TransportEinstufung = 'ERFOLGREICH' | 'VERWEIGERT'

export interface BezugBedarf {
  artefakt_id: string
  versionSequenz: number
}

export interface TransportpaketV1Daten {
  transport_schema: 'v0'
  bezieht_sich_auf_bedarf: BezugBedarf
  inhalt: string
  executor: string
  status: 'ERSTELLT'
}

export interface TransportpaketV2Daten {
  transport_schema: 'v0'
  bezieht_sich_auf_bedarf: BezugBedarf
  antwort: string
  status: 'ANTWORT_EINGETROFFEN'
  importiert_am: string
}

export type TransportpaketDaten = TransportpaketV1Daten | TransportpaketV2Daten
