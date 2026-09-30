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
 * src/ressourcen/ressourcen.test.ts, scripts/check-f19-ressourcen.mjs,
 * src/ressourcen/installation.ts (F36 WS-5a), src/ressourcen/skill-installation.ts und
 * src/ressourcen/ort-b-start.ts (F36 WS-5b).
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
  /** paket (F36 WS-5a, E-F36-9): ausdrückliche Registry-Adresse 'npm:<name>', nur bei unterart 'mcp'; url bleibt Informationsadresse. */
  | { art: 'extern'; url: string; paket?: string }

/**
 * R4: installation einer externen Ressource — Form je unterart (agent: Pfad + Version; skill seit F36
 * WS-5b: Pfad + Commit-SHA + inhalt_hash über alle Dateien; mcp: Serverstart + Einzelnamen).
 */
export type Installation =
  | { pfad: string; version: string }
  | { pfad: string; version: string; inhalt_hash: string }
  | { version: string; mcp_server: { command: string; args: string[] }; werkzeuge: string[] }

/**
 * F36 WS-5a (E-F36-9): Vorlage, aus der „Freigeben & installieren“ die installation (R4) baut — bin
 * relativ im Paket, args mit den Platzhaltern {projekt_origins}/{ausgabe_ordner}, werkzeuge als
 * Einzelnamen mcp__<id>__<name>. Nur typ 'extern' mit unterart 'mcp'.
 */
export interface McpInstallationsVorlage {
  bin: string
  args: string[]
  werkzeuge: string[]
}

/**
 * F36 WS-5b: Vorlage für einen externen Skill — skill_pfad ist der Ordner des Skills relativ zum
 * Unterpfad der herkunft.url ('/' als Trenner, ohne '..'). Ohne Vorlage ist der Skill nicht installierbar.
 */
export interface SkillInstallationsVorlage {
  skill_pfad: string
}

/** Vorlage je unterart: mcp (WS-5a) oder skill (WS-5b). */
export type InstallationsVorlage = McpInstallationsVorlage | SkillInstallationsVorlage

/** F36 WS-5a: Werte der Platzhalter in mcp_server.args — fehlt ein benötigter Wert, wirft baueMcpAufruf (fail-closed). */
export interface McpPlatzhalterWerte {
  projekt_origins?: string
  ausgabe_ordner?: string
}

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
  /** F36 WS-1b: nur typ 'extern' — Anzeige vor „Freigeben & installieren“ (E-F36-6). */
  lizenz?: string
  /** F36 WS-1b: nur typ 'extern' — Anzeige vor „Freigeben & installieren“ (E-F36-6). */
  kosten?: string
  installation?: Installation
  /** F36 WS-5a/5b: nur typ 'extern' mit unterart 'mcp' bzw. 'skill' — Vorlage für „Freigeben & installieren“. */
  installation_vorlage?: InstallationsVorlage
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

/** F36 WS-3: ein Eintrag einer Empfehlungsliste — grund sagt bei „Wird genutzt“, warum er passt, bei „Passt, nicht im Lauf“, was fehlt. */
export interface EmpfehlungsEintrag {
  id: string
  name: string
  typ: RessourcenTyp
  unterart?: ExternUnterart
  grund: string
  /** F36 WS-5a (F-808): nur in „Wird genutzt“ — '<id>@<sha256 der kanonischen installation>', geht mit der Freigabe zurück. */
  empfehlungId?: string
  /** F36 WS-5a: nur in „Passt, nicht im Lauf“ — true, wenn „Freigeben & installieren“ angeboten wird. */
  installierbar?: boolean
}

/** F36 WS-5a: Kontext des Starts für baueEmpfehlung — ohne Projekt-URL kommt kein Eintrag mit {projekt_origins} in den Lauf. */
export interface EmpfehlungsLaufKontext {
  projektUrlVorhanden?: boolean
  /** F-849: Grund statt PROJEKT_URL_FEHLT, wenn die vorschau_url gesperrt ist (z. B. Leitstand-Port). */
  projektUrlGrund?: string
}

/** F36 WS-3: Ergebnis von baueEmpfehlung — je Liste höchstens drei Einträge, der Rest nur als Anzahl (F-788). */
export interface Empfehlung {
  wirdGenutzt: EmpfehlungsEintrag[]
  passtNichtImLauf: EmpfehlungsEintrag[]
  weitereAnzahl: { wirdGenutzt: number; passtNichtImLauf: number }
  /** Anwendbare MCP-Einträge mit wirkung ≠ 'lokal' — in V1 nicht freigebbar (E-F36-4), in keiner Liste. */
  nichtFreigebbarAnzahl: number
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
