/**
 * Datei: src/context-builder/types.ts
 *
 * Zweck: Gemeinsame Typen für den Context Builder (F5). KontextpaketV0Daten
 * ist die Form von daten.daten — F2s registriereKernArtefakt-Parameter
 * 'daten' —, wenn kontextpaket_schema === "v0".
 * schemas/kontrollzustand-kontextpaket-payload.schema.json beschreibt
 * dieselbe Form maschinell. ROLLEN_AUSSCHLUSSMUSTER ist Kern-Konstante,
 * nicht Profil (D1, D14/§16.7 — Profile liefern nur Prüfmittel-Zuordnung,
 * keine Rollen). Eigenes Ereignisformat — kein Eingriff in
 * src/lineage-registry/types.ts' Ereignisname-Union.
 */

export interface Anfrage {
  pfad: string
  /** Stabiler, vom Aufrufer gelieferter String (z. B. "L1-40") — unterscheidet mehrere Zitate derselben Datei (Delta 1). */
  bereichsKennung?: string
  frage: string
  begruendung: string
  inhalt: string
  /** Default false. true = Evidenz vor Budget (Entscheidung 115) — siehe baueKontextpaket Phase A. */
  notwendig?: boolean
}

export interface Budget {
  maxElemente?: number
  maxBytes?: number
}

/**
 * Rollenbezogene Ausschlussmuster (D1, plan-v1 Abschnitt 2.2): Advisor-Rollen
 * kein src/**-Code, Reviewer-Rollen keine state/tasks/**-Freigabeartefakte,
 * Ausführung ohne Einschränkung. Bewusst minimal und erweiterbar (kein
 * geschlossenes Enum) — eine unbekannte Rolle ist ein Fehlerzustand
 * (baueKontextpaket lehnt sie ab), keine implizite Vollzugriffs-Freigabe
 * (Delta 2, löst B2).
 */
export const ROLLEN_AUSSCHLUSSMUSTER: Record<string, string[]> = {
  'architecture-advisor': ['src/**'],
  'code-reviewer': ['state/tasks/**'],
  qa: ['state/tasks/**'],
  ausfuehrung: [],
}

export interface KontextpaketElement {
  pfad: string
  zitierter_bereich: string | null
  inhalts_hash: string
}

export type KontextpaketAusschlussGrund = 'rolle' | 'budget'

export interface KontextpaketAusschluss {
  pfad: string
  grund: KontextpaketAusschlussGrund
}

export interface KontextpaketV0Daten {
  kontextpaket_schema: 'v0'
  lauf_id: string
  rolle: string
  elemente: KontextpaketElement[]
  ausgeschlossen: KontextpaketAusschluss[]
  erstellt_am: string
}

export type KontextpaketErgebnis =
  | { ok: true; pfad: string; versionSequenz: number; inhaltsHash: string; paket: KontextpaketV0Daten }
  | { ok: false; grund: 'unbekannte_rolle'; rolle: string }
  | { ok: false; grund: 'ungueltiger_pfad'; pfad: string }
  | { ok: false; grund: 'widerspruechliche_anfrage'; pfad: string }
  | { ok: false; grund: 'EVIDENZLUECKE'; nichtAufnehmbar: string[] }

export type Ereignisname =
  | 'kontextpaket_gebaut'
  | 'kontextpaket_evidenzluecke'
  | 'kontextpaket_stale_geprueft'
  | 'kontextpaket_unbekannte_rolle'
  | 'kontextpaket_ungueltiger_pfad'
  | 'kontextpaket_widerspruechliche_anfrage'

export interface Ereignis {
  ereignis: Ereignisname
  zeitstempel: string
  lauf_id?: string
  rolle?: string
  pfad?: string
  versionSequenz?: number
  stale?: boolean
}

export type Schreiber = (ereignis: Ereignis) => void
