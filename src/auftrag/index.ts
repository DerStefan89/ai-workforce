/**
 * Datei: src/auftrag/index.ts
 *
 * Zweck: Auftrag-Modul (F11 WS-1, state/plan-v1-f11-auftrag-ws1.md
 * Abschnitt 2.1, state/tasks/f11-auftrag-ws1.md). Registriert einen
 * Auftrag (titel/auftragstext) als eigenständiges AUFTRAG_V0-Kernartefakt
 * unter der Artefakt-ID `auftrag-<auftragId>`.
 *
 * Eigenständiges Modul (D1, wie F5/F9 gegenüber F2): ruft F2s
 * registriereKernArtefakt ausschließlich von außen auf, kein Eingriff in
 * src/lineage-registry/. Ein Auftrag ist der Wurzelknoten eines
 * Vorhabensstrangs — er zitiert keine vorherigen Artefakte, `eingaben`
 * bleibt bewusst ein leeres Array (D2).
 */

import { registriereKernArtefakt } from '../lineage-registry/index.ts'
import type { ProfilReferenz } from '../checkpoint-store/types.ts'
import type { AuftragV0Daten, Ereignis, Optionen } from './types.ts'

/** Zwilling des 'herkunft.art'-Enums in schemas/kontrollzustand-auftrag-payload.schema.json und src/auftrag/types.ts' AuftragHerkunftArt. */
const HERKUNFT_ARTEN = new Set(['projekt_interview', 'sparring', 'jarvis', 'manuell', 'feature_akte'])

/** Zwilling von schemas/kontrollzustand-auftrag-payload.schema.json' akzeptanzkriterien[].id-Pattern (F35 WS-1) — Muster der von baueAuftragAusFeatureAkte (src/feature-auftrag/index.ts) vergebenen IDs. */
const AK_ID_MUSTER = /^AK[0-9]+$/

function jetzt(): string {
  return new Date().toISOString()
}

function standardSchreiber(ereignis: Ereignis): void {
  console.log(JSON.stringify(ereignis))
}

function stillerLineageSchreiber(): void {
  // Unterdrückt F2s eigene lineage_*-Ereignisse — dieses Modul protokolliert
  // sein eigenes, höherstufiges auftrag_registriert-Ereignis (Muster F5).
}

function auftragArtefaktId(auftragId: string): string {
  return `auftrag-${auftragId}`
}

/**
 * Registriert einen Auftrag als AUFTRAG_V0-Kernartefakt über F2s
 * registriereKernArtefakt (AK1). eingaben bleibt [] — ein Auftrag ist der
 * Wurzelknoten eines Vorhabensstrangs, kein Zitat eines Vorgängerartefakts.
 * @param auftragId - eindeutige Kennung, bildet die Artefakt-ID auftrag-<auftragId>
 * @param profilReferenz - Profilbezug, unverändert an F2 gereicht
 * @param titel - kurzer, menschenlesbarer Titel des Auftrags
 * @param auftragstext - der eigentliche Auftragstext (AK2 liest ihn über AusfuehrungsEingaben)
 * @param optionen - basisVerzeichnis/schreiber, Muster F5/F2
 * @returns pfad, versionSequenz und inhaltsHash der geschriebenen Version
 */
export function registriereAuftrag(
  auftragId: string,
  profilReferenz: ProfilReferenz,
  titel: string,
  auftragstext: string,
  optionen: Optionen = {}
): { pfad: string; versionSequenz: number; inhaltsHash: string } {
  const schreiber = optionen.schreiber ?? standardSchreiber
  const lineageOptionen = { basisVerzeichnis: optionen.basisVerzeichnis, schreiber: stillerLineageSchreiber }

  const daten: AuftragV0Daten = {
    auftrag_schema: 'v0',
    auftrag_id: auftragId,
    titel,
    auftragstext,
    erstellt_am: jetzt(),
    // F39 WS-2a: nur gesetzt, wenn der Aufrufer eine Herkunft übergibt — ein Alt-Auftrag ohne
    // dieses Feld bleibt strukturell unverändert (kein 'herkunft: undefined' im geschriebenen JSON).
    ...(optionen.herkunft !== undefined ? { herkunft: optionen.herkunft } : {}),
    // F35 WS-1: dasselbe additive Muster — nur gesetzt, wenn der Aufrufer (routen-f35.mjs) sie
    // mitgibt, ein Alt-Auftrag bzw. ein Auftrag ohne Feature-Akte-Herkunft bleibt unverändert.
    ...(optionen.akzeptanzkriterien !== undefined ? { akzeptanzkriterien: optionen.akzeptanzkriterien } : {}),
    ...(optionen.nicht_ziele !== undefined ? { nicht_ziele: optionen.nicht_ziele } : {}),
  }

  const { pfad, versionSequenz, inhaltsHash } = registriereKernArtefakt(
    auftragArtefaktId(auftragId),
    profilReferenz,
    { quelle: 'auftrag' },
    daten,
    [],
    lineageOptionen
  )

  schreiber({ ereignis: 'auftrag_registriert', zeitstempel: jetzt(), auftrag_id: auftragId, versionSequenz })
  return { pfad, versionSequenz, inhaltsHash }
}

// ─── Schemaprüfung (Gate-Skript, handgeschrieben, D5, kein ajv) ────────────

/**
 * Reine Funktion: prüft einen optionalen herkunft-Wert — Muster für
 * AuftragV0Daten.herkunft UND den POST /api/auftraege-Body (F39 WS-2a, D5:
 * eine Quelle statt zweier unabhängig alternder Kopien; importiert von
 * scripts/leitstand-server.mjs' pruefeAuftragsformular).
 * @param wert - der zu prüfende Wert (nicht das umschließende Objekt)
 * @returns Liste der Regelverletzungen; leer = gültig
 */
export function validiereAuftragHerkunft(wert: unknown): string[] {
  if (typeof wert !== 'object' || wert === null || Array.isArray(wert)) {
    return ["'herkunft' muss ein Objekt sein"]
  }
  const obj = wert as Record<string, unknown>
  const verstoesse: string[] = []
  for (const feld of Object.keys(obj)) {
    if (feld !== 'art') verstoesse.push(`unbekanntes Feld 'herkunft.${feld}' (additionalProperties: false)`)
  }
  if (typeof obj.art !== 'string' || !HERKUNFT_ARTEN.has(obj.art)) {
    verstoesse.push(`'herkunft.art' muss einer von ${[...HERKUNFT_ARTEN].join(', ')} sein`)
  }
  return verstoesse
}

/**
 * Reine Funktion: prüft ein optionales akzeptanzkriterien-Array (F35 WS-1) —
 * Muster validiereAuftragHerkunft. Wenn vorhanden, mindestens ein Eintrag,
 * jede id dem Muster ^AK[0-9]+$ entsprechend und eindeutig (Zwilling
 * schemas/kontrollzustand-auftrag-payload.schema.json).
 * @param wert - der zu prüfende Wert (nicht das umschließende Objekt)
 * @returns Liste der Regelverletzungen; leer = gültig
 */
export function validiereAuftragAkzeptanzkriterien(wert: unknown): string[] {
  if (!Array.isArray(wert)) {
    return ["'akzeptanzkriterien' muss ein Array sein"]
  }
  if (wert.length === 0) {
    return ["'akzeptanzkriterien' darf, wenn vorhanden, nicht leer sein (minItems: 1)"]
  }
  const verstoesse: string[] = []
  const geseheneIds = new Set<string>()
  wert.forEach((eintrag, index) => {
    if (typeof eintrag !== 'object' || eintrag === null || Array.isArray(eintrag)) {
      verstoesse.push(`'akzeptanzkriterien[${index}]' muss ein Objekt sein`)
      return
    }
    const obj = eintrag as Record<string, unknown>
    for (const feld of Object.keys(obj)) {
      if (feld !== 'id' && feld !== 'text') verstoesse.push(`unbekanntes Feld 'akzeptanzkriterien[${index}].${feld}' (additionalProperties: false)`)
    }
    if (typeof obj.id !== 'string' || !AK_ID_MUSTER.test(obj.id)) {
      verstoesse.push(`'akzeptanzkriterien[${index}].id' muss dem Muster ^AK[0-9]+$ entsprechen`)
    } else if (geseheneIds.has(obj.id)) {
      verstoesse.push(`'akzeptanzkriterien[${index}].id' ('${obj.id}') ist nicht eindeutig`)
    } else {
      geseheneIds.add(obj.id)
    }
    if (typeof obj.text !== 'string' || obj.text.length === 0) {
      verstoesse.push(`'akzeptanzkriterien[${index}].text' muss ein nicht-leerer String sein`)
    }
  })
  return verstoesse
}

/**
 * Reine Funktion: prüft ein optionales nicht_ziele-Array (F35 WS-1) — jeder
 * Eintrag ein nicht-leerer String, ein leeres Array ist gültig (Zwilling
 * schemas/kontrollzustand-auftrag-payload.schema.json).
 * @param wert - der zu prüfende Wert (nicht das umschließende Objekt)
 * @returns Liste der Regelverletzungen; leer = gültig
 */
export function validiereAuftragNichtZiele(wert: unknown): string[] {
  if (!Array.isArray(wert)) {
    return ["'nicht_ziele' muss ein Array sein"]
  }
  const verstoesse: string[] = []
  wert.forEach((eintrag, index) => {
    if (typeof eintrag !== 'string' || eintrag.length === 0) {
      verstoesse.push(`'nicht_ziele[${index}]' muss ein nicht-leerer String sein`)
    }
  })
  return verstoesse
}

/** Reine Funktion: prüft ein geparstes Objekt gegen schemas/kontrollzustand-auftrag-payload.schema.json. */
export function validiereAuftragDaten(daten: unknown): string[] {
  if (typeof daten !== 'object' || daten === null || Array.isArray(daten)) {
    return ['Wurzel ist kein Objekt']
  }
  const obj = daten as Record<string, unknown>
  const verstoesse: string[] = []
  const erlaubt = new Set(['auftrag_schema', 'auftrag_id', 'titel', 'auftragstext', 'erstellt_am', 'herkunft', 'akzeptanzkriterien', 'nicht_ziele'])
  for (const feld of Object.keys(obj)) {
    if (!erlaubt.has(feld)) verstoesse.push(`unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  if (obj.auftrag_schema !== 'v0') verstoesse.push("'auftrag_schema' muss 'v0' sein")
  if (typeof obj.auftrag_id !== 'string' || obj.auftrag_id.length === 0) verstoesse.push("'auftrag_id' muss ein nicht-leerer String sein")
  if (typeof obj.titel !== 'string' || obj.titel.length === 0) verstoesse.push("'titel' muss ein nicht-leerer String sein")
  if (typeof obj.auftragstext !== 'string' || obj.auftragstext.length === 0) verstoesse.push("'auftragstext' muss ein nicht-leerer String sein")
  if (typeof obj.erstellt_am !== 'string' || obj.erstellt_am.length === 0) verstoesse.push("'erstellt_am' muss ein nicht-leerer String sein")
  // 'herkunft'/'akzeptanzkriterien'/'nicht_ziele' bleiben additiv/optional (F39 WS-2a, F35 WS-1) —
  // ein Alt-Auftrag ohne diese Felder bleibt gültig.
  if ('herkunft' in obj) verstoesse.push(...validiereAuftragHerkunft(obj.herkunft))
  if ('akzeptanzkriterien' in obj) verstoesse.push(...validiereAuftragAkzeptanzkriterien(obj.akzeptanzkriterien))
  if ('nicht_ziele' in obj) verstoesse.push(...validiereAuftragNichtZiele(obj.nicht_ziele))
  return verstoesse
}
