/**
 * Datei: src/architekt/types.ts
 *
 * Zweck: Typen für das Ergebnis der Rolle 'architekt' (F39 WS-1). Spiegelt
 * schemas/ergebnis-architektur.schema.json — die einzige Formbeschreibung,
 * validiereErgebnisArchitektur (src/architekt/index.ts) die einzige Prüfung
 * dagegen (D5, Muster src/product-coach/types.ts).
 *
 * Wird aufgerufen von: src/architekt/index.ts.
 */

export type ArchitektModus = 'feature' | 'projekt'

export type CapabilityStatus = 'vorhanden' | 'offen' | 'fehlt'

export type EvidenzMarker = '[Fakt]' | '[Schlussfolgerung]' | '[Annahme]' | '[offene Unsicherheit]'

/** F42 WS-2 (löst F-685): Kategorie einer Entscheidung — 'stack' markiert eine Laufzeit-/Sprach-/Speicherform-Entscheidung, die bei offenem Stack (istStackOffen) zwingend vorgelegt werden muss. */
export type EntscheidungKategorie = 'stack' | 'fachlich' | 'sonstig'

export interface ModulEntwurf {
  name: string
  zweck: string
  abhaengigkeiten: string[]
}

export interface AdrEntwurf {
  titel: string
  kontext: string
  entscheidung: string
  alternativen: string[]
  konsequenzen: string[]
}

export interface SchemaEntwurf {
  name: string
  zweck: string
  /** Ein vom Architekten entworfenes JSON-Schema-Fragment, als JSON-Text (String, F-638) — nicht als verschachteltes Objekt, siehe schemas/ergebnis-architektur.schema.json. */
  json_schema: string
}

export interface EntscheidungOption {
  titel: string
  vorteile: string[]
  nachteile: string[]
}

export interface EntscheidungMensch {
  frage: string
  optionen: EntscheidungOption[]
  auswirkung_bestand: string
  empfehlung: string
  begruendung: string
  /** F42 WS-2: optional, fehlt bei bestehenden Ausgaben (rückwärtskompatibel) oder wenn null. Nur bei istStackOffen faktisch erzwungen (validiereErgebnisArchitektur, stackOffen-Parameter). */
  kategorie?: EntscheidungKategorie | null
}

export interface CapabilityBedarf {
  bedarf: string
  ressource_id: string | null
  status: CapabilityStatus
}

export interface EvidenzEintrag {
  marker: EvidenzMarker
  aussage: string
}

export interface ErgebnisArchitektur {
  modus: ArchitektModus
  zusammenfassung: string
  module: ModulEntwurf[]
  adr_entwuerfe: AdrEntwurf[]
  schema_entwuerfe: SchemaEntwurf[]
  entscheidungen_mensch: EntscheidungMensch[]
  capabilities_bedarf: CapabilityBedarf[]
  evidenz: EvidenzEintrag[]
}
