/**
 * Datei: src/projekte/index.ts
 *
 * Zweck: Projektregister-Modul (F25 WS-1, features/F25/feature.md AK1).
 * validiereProjekteDaten prüft ein geparstes Objekt gegen
 * schemas/projekte.schema.json (Muster validiereRessourcenDaten,
 * src/ressourcen/index.ts, D5 — handgeschrieben statt ajv, dieselbe
 * Repo-Entscheidung). ladeProjektregister liest + parst + validiert
 * projekte.json und wirft bei Schemaverstoß (Muster ladeStartvorlage,
 * scripts/leitstand-server.mjs — ein Konfigurationsfehler des Servers ist
 * kein Fachergebnis eines Startauftrags).
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs,
 * scripts/check-f25-projekte.mjs (Rot-/Grün-Fälle gegen die reale
 * validiereProjekteDaten, läuft in npm run check — kein separates
 * node:test-Pendant in diesem Modul).
 */

import { readFileSync } from 'node:fs'
import type { ProjektEintrag } from './types.ts'

const PROJEKTE_WURZEL_FELDER = new Set(['projekte_schema', 'projekte'])
const PROJEKT_FELDER = new Set(['id', 'name', 'repo_pfad', 'startvorlage_pfad', 'profil_pfad', 'basisverzeichnis', 'status'])
const PROJEKT_STATUS = ['IDEE', 'DISCOVERY', 'GEPLANT', 'IN_ENTWICKLUNG', 'TEST', 'NUTZBAR', 'BETRIEB', 'PAUSIERT', 'ARCHIVIERT']
const ID_MUSTER = /^[a-z0-9][a-z0-9-]*$/

function istObjekt(wert: unknown): wert is Record<string, unknown> {
  return typeof wert === 'object' && wert !== null && !Array.isArray(wert)
}

function istNichtLeererString(wert: unknown): wert is string {
  return typeof wert === 'string' && wert.length > 0
}

function meldeUnbekannteFelder(obj: Record<string, unknown>, erlaubt: Set<string>, praefix: string, verstoesse: string[]): void {
  for (const feld of Object.keys(obj)) {
    if (!erlaubt.has(feld)) verstoesse.push(`unbekanntes Feld '${praefix}${feld}' (additionalProperties: false)`)
  }
}

/**
 * Prüft einen einzelnen projekte[]-Eintrag: Form (additionalProperties:
 * false, Pflichtfelder als nicht-leere Strings, status-Enum) plus
 * Eindeutigkeit der id (über gesehenIds, geteilt über alle Einträge).
 * profil_pfad wird nur auf Form geprüft, NICHT auf Existenz der Datei —
 * WS-1 liest profil_pfad nicht (features/F25/feature.md, "Bekannte
 * Grenzen" gilt hier sinngemäß für dieses Feld: reines Registerfeld für
 * spätere Workstreams).
 */
function pruefeProjektForm(projekt: unknown, index: number, verstoesse: string[], gesehenIds: Set<string>): void {
  const praefix = `projekte[${index}].`
  if (!istObjekt(projekt)) {
    verstoesse.push(`'${praefix.slice(0, -1)}' ist kein Objekt`)
    return
  }
  meldeUnbekannteFelder(projekt, PROJEKT_FELDER, praefix, verstoesse)

  if (!istNichtLeererString(projekt.id) || !ID_MUSTER.test(projekt.id)) {
    verstoesse.push(`'${praefix}id' muss ein nicht-leerer, kleinbuchstabiger String mit Bindestrich sein`)
  } else if (gesehenIds.has(projekt.id)) {
    verstoesse.push(`'${praefix}id' ('${projekt.id}') ist nicht eindeutig`)
  } else {
    gesehenIds.add(projekt.id)
  }

  if (!istNichtLeererString(projekt.name)) verstoesse.push(`'${praefix}name' muss ein nicht-leerer String sein`)
  if (!istNichtLeererString(projekt.repo_pfad)) verstoesse.push(`'${praefix}repo_pfad' muss ein nicht-leerer String sein`)
  if (!istNichtLeererString(projekt.startvorlage_pfad)) verstoesse.push(`'${praefix}startvorlage_pfad' muss ein nicht-leerer String sein`)
  if (!istNichtLeererString(projekt.profil_pfad)) verstoesse.push(`'${praefix}profil_pfad' muss ein nicht-leerer String sein`)
  if (!istNichtLeererString(projekt.basisverzeichnis)) verstoesse.push(`'${praefix}basisverzeichnis' muss ein nicht-leerer String sein`)

  if (typeof projekt.status !== 'string' || !PROJEKT_STATUS.includes(projekt.status)) {
    verstoesse.push(`'${praefix}status' muss einer von ${PROJEKT_STATUS.join(', ')} sein`)
  }
}

/**
 * Reine Funktion: prüft ein geparstes Objekt gegen schemas/projekte.schema.json.
 * Keine Seiteneffekte, kein Datei-I/O — Muster validiereRessourcenDaten
 * (src/ressourcen/index.ts, D5).
 * @param daten - geparstes, sonst unbekanntes Objekt
 * @returns Liste der Regelverletzungen; leeres Array = gültig
 */
export function validiereProjekteDaten(daten: unknown): string[] {
  if (!istObjekt(daten)) {
    return ['Wurzel ist kein Objekt']
  }
  const verstoesse: string[] = []
  meldeUnbekannteFelder(daten, PROJEKTE_WURZEL_FELDER, '', verstoesse)
  for (const feld of PROJEKTE_WURZEL_FELDER) {
    if (!(feld in daten)) verstoesse.push(`Pflichtfeld '${feld}' fehlt`)
  }

  if ('projekte_schema' in daten && daten.projekte_schema !== 'v0') {
    verstoesse.push(`'projekte_schema' muss 'v0' sein`)
  }

  if ('projekte' in daten) {
    if (!Array.isArray(daten.projekte)) {
      verstoesse.push("'projekte' muss ein Array sein")
    } else {
      const gesehenIds = new Set<string>()
      daten.projekte.forEach((p, i) => pruefeProjektForm(p, i, verstoesse, gesehenIds))
    }
  }

  return verstoesse
}

/**
 * Lädt, parst und validiert das Projektregister. Wirft bei fehlender/
 * unlesbarer Datei, ungültigem JSON oder Schemaverstoß (Muster
 * ladeStartvorlage, scripts/leitstand-server.mjs) — ein Konfigurationsfehler
 * des Servers, kein Fachergebnis eines Startauftrags.
 * @param pfad - Pfad zur projekte.json
 * @returns die validierten Registereinträge
 */
export function ladeProjektregister(pfad: string): ProjektEintrag[] {
  const roh = JSON.parse(readFileSync(pfad, 'utf8'))
  const verstoesse = validiereProjekteDaten(roh)
  if (verstoesse.length > 0) {
    throw new Error(`Projektregister '${pfad}' ungültig: ${verstoesse.join('; ')}`)
  }
  return (roh as { projekte: ProjektEintrag[] }).projekte
}
