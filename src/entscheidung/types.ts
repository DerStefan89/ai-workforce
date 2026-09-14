/**
 * Datei: src/entscheidung/types.ts
 *
 * Zweck: Typen für das Entscheidungsartefakt (F23 WS-1a, löst
 * state/findings.md F-350/F-379). EntscheidungV0Daten ist die Form von
 * daten.daten — F2s registriereKernArtefakt-Parameter 'daten' —, wenn
 * entscheidung_schema === "v0". 'art' trennt die fünf zuvor überladenen
 * 'ergebnis'-Familien (F-379); 'abnahme' ist bereits typisiert, hat in
 * WS-1a aber noch keine Schreibstelle (folgt WS-1b/WS-2).
 * schemas/kontrollzustand-entscheidung-payload.schema.json beschreibt
 * dieselbe Form maschinell.
 */

export type EntscheidungArt = 'freigabe' | 'stopp' | 'planaenderung' | 'terminal' | 'kenntnisnahme' | 'abnahme'

export interface AbgeschwaechteFreigabe {
  schritt_id: string
  vorher: 'ZWINGEND'
  nachher: string | null
}

interface EntscheidungBasisV0Daten {
  entscheidung_schema: 'v0'
  begruendung: string
  entschieden_am: string
}

export interface EntscheidungFreigabeV0Daten extends EntscheidungBasisV0Daten {
  art: 'freigabe'
  ergebnis: 'FREIGEGEBEN' | 'ABGELEHNT'
}

export interface EntscheidungStoppV0Daten extends EntscheidungBasisV0Daten {
  art: 'stopp'
  ergebnis: 'GESTOPPT'
}

export interface EntscheidungPlanaenderungV0Daten extends EntscheidungBasisV0Daten {
  art: 'planaenderung'
  ergebnis: 'FREIGABEPFLICHT_ABGESCHWAECHT'
  abgeschwaechte_freigaben: AbgeschwaechteFreigabe[]
}

export interface EntscheidungTerminalV0Daten extends EntscheidungBasisV0Daten {
  art: 'terminal'
  ergebnis: 'ERFOLGREICH' | 'VERWEIGERT' | 'FEHLGESCHLAGEN'
}

export interface EntscheidungKenntnisnahmeV0Daten extends EntscheidungBasisV0Daten {
  art: 'kenntnisnahme'
  ergebnis: 'VERWEIGERT' | 'FEHLGESCHLAGEN'
}

/** Noch keine Schreibstelle in F23 WS-1a (folgt WS-1b/WS-2) — bereits typisiert, damit das Schema und der Validator vollständig sind. */
export interface EntscheidungAbnahmeV0Daten extends EntscheidungBasisV0Daten {
  art: 'abnahme'
  ergebnis: 'ANGENOMMEN' | 'ANPASSUNG_ANGEFORDERT' | 'ABGELEHNT'
}

export type EntscheidungV0Daten =
  | EntscheidungFreigabeV0Daten
  | EntscheidungStoppV0Daten
  | EntscheidungPlanaenderungV0Daten
  | EntscheidungTerminalV0Daten
  | EntscheidungKenntnisnahmeV0Daten
  | EntscheidungAbnahmeV0Daten
