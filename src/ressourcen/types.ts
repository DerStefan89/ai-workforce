/**
 * Datei: src/ressourcen/types.ts
 *
 * Zweck: Typen für das Ressourcen-Modul (F19 WS-2, Meilenstein 3,
 * docs/projekt/zielfassung.md §13.4). Ressource ist die typisierte Form
 * eines Eintrags, der gegen schemas/ressourcen.schema.json passt (F19 WS-1)
 * — Muster src/router/types.ts: das JSON-Schema ist die lesbare
 * Beschreibung, validiereRessourcenDaten (src/ressourcen/index.ts) die
 * ausgeführte Regel, diese Typen die übersetzte Form. Herkunft ist Zwilling
 * der vier herkunft-Varianten im Schema; wer eine ändert, ändert beide
 * (dieselbe Zwillings-Bauart wie src/workflow/types.ts, dort ausführlich
 * begründet).
 *
 * Wird aufgerufen von: src/ressourcen/index.ts,
 * src/ressourcen/ressourcen.test.ts, scripts/check-f19-ressourcen.mjs.
 */

import type { TaskTyp } from '../router/types.ts'

/** Zwilling des 'typ'-Enums in schemas/ressourcen.schema.json. */
export type RessourcenTyp = 'worker' | 'skill' | 'agent' | 'extern'

/** Zwilling des 'freigabe'-Enums in schemas/ressourcen.schema.json. */
export type Freigabe = 'FREIGEGEBEN' | 'OFFEN'

/** Zwilling des 'unterart'-Enums (nur typ 'extern', F36 WS-1). */
export type ExternUnterart = 'skill' | 'agent' | 'mcp'

/** Zwilling des 'wirkung'-Enums (nur typ 'extern' mit unterart 'mcp', E-F36-4). */
export type Wirkung = 'lokal' | 'extern_lesend' | 'extern_schreibend'

/** Zwilling der vier herkunft-Varianten in schemas/ressourcen.schema.json. */
export type Herkunft =
  | { art: 'startvorlage'; worker: 'claude-code' | 'codex' }
  | { art: 'skill'; pfad: string }
  | { art: 'agent'; pfad: string }
  | { art: 'extern'; url: string }

/** R4: installation einer externen Ressource — Form je unterart (skill|agent: Pfad, mcp: Serverstart + Einzelnamen). */
export type Installation = { pfad: string; version: string } | { version: string; mcp_server: { command: string; args: string[] }; werkzeuge: string[] }

/** Deterministische Anwendbarkeitsregel (E-F36-2): ODER innerhalb eines Schlüssels, UND zwischen den Schlüsseln. */
export interface AnwendbarWenn {
  task_typen_any?: TaskTyp[]
  pfad_muster_any?: string[]
}

/** Typisierte Form eines gegen schemas/ressourcen.schema.json gültigen Eintrags. */
export interface Ressource {
  id: string
  typ: RessourcenTyp
  name?: string
  beschreibung?: string
  unterart?: ExternUnterart
  wirkung?: Wirkung
  installation?: Installation
  anwendbar_wenn?: AnwendbarWenn
  capabilities: string[]
  freigabe: Freigabe
  herkunft: Herkunft
}

/** Ergebnis von pruefeAnwendbarkeit — begruendung immer gesetzt, auch bei anwendbar: true. */
export interface Anwendbarkeit {
  anwendbar: boolean
  begruendung: string
}

/** Kontext für pruefeAnwendbarkeit: Task-Typen des Auftrags (Router) und optional betroffene Pfade. */
export interface AnwendbarkeitsKontext {
  task_typen: TaskTyp[]
  pfade?: string[]
}

/**
 * Ressource + zur Abfragezeit abgeleitete Felder. name/beschreibung sind
 * hier immer gesetzt (aus der Herkunft aufgelöst oder aus dem Eintrag
 * übernommen), verfuegbar und grund sind neu.
 */
export interface AufgelosteRessource extends Ressource {
  name: string
  beschreibung: string
  verfuegbar: boolean
  grund: string
}

/** Eine von einer Rolle benötigte Capability, für die keine verfügbare Ressource existiert. */
export interface CapabilityGap {
  capability: string
  rolle: string
}
