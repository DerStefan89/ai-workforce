/**
 * Datei: src/auftrag/types.ts
 *
 * Zweck: Typen für das Auftrag-Modul (F11 WS-1, state/plan-v1-f11-auftrag-
 * ws1.md Abschnitt 2.1, state/tasks/f11-auftrag-ws1.md). AuftragV0Daten ist
 * die Form von daten.daten — F2s registriereKernArtefakt-Parameter 'daten'
 * —, wenn auftrag_schema === "v0".
 * schemas/kontrollzustand-auftrag-payload.schema.json beschreibt dieselbe
 * Form maschinell.
 *
 * F39 WS-2a (löst state/findings.md F-633 Teil a): 'herkunft' ist additiv
 * und optional — ein Alt-Auftrag ohne das Feld bleibt gültig, kein
 * Migrationsschritt (Muster 'erstellt_am' aus E-M2-5). 'projekt_interview'
 * löst über src/router/index.ts' bestimmeEffektiveKontrolltiefe eine
 * deterministische Kontrolltiefe-Untergrenze 'hoch' aus; die übrigen drei
 * Werte sind rein dokumentarisch (heute ohne Router-Wirkung).
 */

export interface Optionen {
  basisVerzeichnis?: string
  schreiber?: Schreiber
  herkunft?: AuftragHerkunft
}

/** Zwilling des 'herkunft.art'-Enums in schemas/kontrollzustand-auftrag-payload.schema.json. */
export type AuftragHerkunftArt = 'projekt_interview' | 'sparring' | 'jarvis' | 'manuell'

export interface AuftragHerkunft {
  art: AuftragHerkunftArt
}

export interface AuftragV0Daten {
  auftrag_schema: 'v0'
  auftrag_id: string
  titel: string
  auftragstext: string
  erstellt_am: string
  herkunft?: AuftragHerkunft
}

export type Ereignisname = 'auftrag_registriert'

export interface Ereignis {
  ereignis: Ereignisname
  zeitstempel: string
  auftrag_id?: string
  versionSequenz?: number
}

export type Schreiber = (ereignis: Ereignis) => void
