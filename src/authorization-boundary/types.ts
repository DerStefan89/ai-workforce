/**
 * Datei: src/authorization-boundary/types.ts
 *
 * Zweck: Gemeinsame Typen für die Authorization Boundary (F3). Referenz-
 * und Eintragsform der externen Autorisierungsdatei (außerhalb dieses
 * Produkt-Repos, D16, schemas/kontrollzustand-autorisierung-payload.schema.json)
 * sowie ein eigenes Ereignisformat — kein Eingriff in
 * src/checkpoint-store/types.ts' Ereignisname-Union.
 */

export interface AutorisierungsReferenz {
  pfad: string
  commit_hash: string
  datei_hash: string
}

export interface AutorisierungsEintrag {
  lauf_id: string
  entscheidung: 'FREIGEGEBEN' | 'VERWEIGERT'
  zeitstempel: string
  begruendung?: string
}

export type AutorisierungsErgebnis =
  | { ok: true; entscheidung: 'FREIGEGEBEN' | 'VERWEIGERT'; eintrag: AutorisierungsEintrag }
  | { ok: false; grund: string }

export type Ereignisname = 'autorisierung_geprueft' | 'autorisierung_abgelehnt'

export interface Ereignis {
  ereignis: Ereignisname
  zeitstempel: string
  lauf_id?: string
  entscheidung?: 'FREIGEGEBEN' | 'VERWEIGERT'
  grund?: string
}

export type Schreiber = (ereignis: Ereignis) => void
