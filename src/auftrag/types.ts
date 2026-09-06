/**
 * Datei: src/auftrag/types.ts
 *
 * Zweck: Typen für das Auftrag-Modul (F11 WS-1, state/plan-v1-f11-auftrag-
 * ws1.md Abschnitt 2.1, state/tasks/f11-auftrag-ws1.md). AuftragV0Daten ist
 * die Form von daten.daten — F2s registriereKernArtefakt-Parameter 'daten'
 * —, wenn auftrag_schema === "v0".
 * schemas/kontrollzustand-auftrag-payload.schema.json beschreibt dieselbe
 * Form maschinell.
 */

export interface Optionen {
  basisVerzeichnis?: string
  schreiber?: Schreiber
}

export interface AuftragV0Daten {
  auftrag_schema: 'v0'
  auftrag_id: string
  titel: string
  auftragstext: string
  erstellt_am: string
}

export type Ereignisname = 'auftrag_registriert'

export interface Ereignis {
  ereignis: Ereignisname
  zeitstempel: string
  auftrag_id?: string
  versionSequenz?: number
}

export type Schreiber = (ereignis: Ereignis) => void
