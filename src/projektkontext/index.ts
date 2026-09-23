/**
 * Datei: src/projektkontext/index.ts
 *
 * Zweck: Projekt-Roadmap-Modul (F33 WS-1, E-M4-2 "Kontrollzustand im
 * eigenen Repo"). validiereRoadmapDaten prüft ein geparstes Objekt gegen
 * schemas/roadmap.schema.json (Muster validiereProjekteDaten,
 * src/projekte/index.ts, D5 — handgeschrieben statt ajv, dieselbe
 * Repo-Entscheidung). ladeRoadmap liest + parst + validiert roadmap.json
 * und wirft bei Schemaverstoß (Muster ladeProjektregister) — ein
 * Konfigurationsfehler des Servers ist kein Fachergebnis eines
 * Startauftrags.
 *
 * Wird aufgerufen von: scripts/check-f33-projektkontext.mjs. Die
 * Einspeisung des rohen roadmap.json-Dateiinhalts in ein Kontextpaket
 * (scripts/leitstand-server.mjs, Rollen jarvis/router) liest die Datei
 * selbst über den bestehenden Context-Builder-Anfragepfad
 * (loeseAusfuehrungsEingabenAuf) — kein Aufruf von ladeRoadmap dort (D5,
 * kein zweiter Lesepfad für dieselbe Datei).
 */

import { readFileSync } from 'node:fs'
import type { RoadmapDaten } from './types.ts'

const ROADMAP_WURZEL_FELDER = new Set(['roadmap_schema', 'vision', 'meilensteine'])
const MEILENSTEIN_FELDER = new Set(['id', 'titel', 'status', 'features'])
const MEILENSTEIN_STATUS = ['GEPLANT', 'LAEUFT', 'ABGESCHLOSSEN']
// F-595-Fix: Feature-IDs sind formal auf dieses Muster beschränkt (reale Beispiele: 'F0', 'F1B',
// 'F6a', 'F19') — schemas/roadmap.schema.json trägt dasselbe Pattern (D5, kein zweiter Regelsatz).
// Meilenstein-IDs (z. B. 'F19-bridge') sind NICHT betroffen, nur meilenstein.features[]: ein
// '../'-Segment würde in scripts/leitstand/routen-roadmap.mjs sonst außerhalb von features/
// aufgelöst.
export const FEATURE_ID_MUSTER = /^F[0-9]+[A-Za-z]?$/

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
 * Prüft einen einzelnen meilensteine[]-Eintrag: Form (additionalProperties:
 * false, Pflichtfelder als nicht-leere Strings, status-Enum, features als
 * Array nicht-leerer Strings) plus Eindeutigkeit der id (über gesehenIds,
 * geteilt über alle Einträge — Muster pruefeProjektForm, src/projekte/index.ts).
 */
function pruefeMeilensteinForm(meilenstein: unknown, index: number, verstoesse: string[], gesehenIds: Set<string>): void {
  const praefix = `meilensteine[${index}].`
  if (!istObjekt(meilenstein)) {
    verstoesse.push(`'${praefix.slice(0, -1)}' ist kein Objekt`)
    return
  }
  meldeUnbekannteFelder(meilenstein, MEILENSTEIN_FELDER, praefix, verstoesse)

  if (!istNichtLeererString(meilenstein.id)) {
    verstoesse.push(`'${praefix}id' muss ein nicht-leerer String sein`)
  } else if (gesehenIds.has(meilenstein.id)) {
    verstoesse.push(`'${praefix}id' ('${meilenstein.id}') ist nicht eindeutig`)
  } else {
    gesehenIds.add(meilenstein.id)
  }

  if (!istNichtLeererString(meilenstein.titel)) verstoesse.push(`'${praefix}titel' muss ein nicht-leerer String sein`)

  if (typeof meilenstein.status !== 'string' || !MEILENSTEIN_STATUS.includes(meilenstein.status)) {
    verstoesse.push(`'${praefix}status' muss einer von ${MEILENSTEIN_STATUS.join(', ')} sein`)
  }

  if (!Array.isArray(meilenstein.features)) {
    verstoesse.push(`'${praefix}features' muss ein Array sein`)
  } else {
    meilenstein.features.forEach((feature, featureIndex) => {
      if (!istNichtLeererString(feature)) {
        verstoesse.push(`'${praefix}features[${featureIndex}]' muss ein nicht-leerer String sein`)
      } else if (!FEATURE_ID_MUSTER.test(feature)) {
        verstoesse.push(`'${praefix}features[${featureIndex}]' ('${feature}') muss dem Muster ^F[0-9]+[A-Za-z]?$ entsprechen`)
      }
    })
  }
}

/**
 * Reine Funktion: prüft ein geparstes Objekt gegen schemas/roadmap.schema.json.
 * Keine Seiteneffekte, kein Datei-I/O — Muster validiereProjekteDaten
 * (src/projekte/index.ts, D5).
 * @param daten - geparstes, sonst unbekanntes Objekt
 * @returns Liste der Regelverletzungen; leeres Array = gültig
 */
export function validiereRoadmapDaten(daten: unknown): string[] {
  if (!istObjekt(daten)) {
    return ['Wurzel ist kein Objekt']
  }
  const verstoesse: string[] = []
  meldeUnbekannteFelder(daten, ROADMAP_WURZEL_FELDER, '', verstoesse)
  for (const feld of ROADMAP_WURZEL_FELDER) {
    if (!(feld in daten)) verstoesse.push(`Pflichtfeld '${feld}' fehlt`)
  }

  if ('roadmap_schema' in daten && daten.roadmap_schema !== 'v0') {
    verstoesse.push(`'roadmap_schema' muss 'v0' sein`)
  }

  if ('vision' in daten && !istNichtLeererString(daten.vision)) {
    verstoesse.push(`'vision' muss ein nicht-leerer String sein`)
  }

  if ('meilensteine' in daten) {
    if (!Array.isArray(daten.meilensteine)) {
      verstoesse.push("'meilensteine' muss ein Array sein")
    } else {
      const gesehenIds = new Set<string>()
      daten.meilensteine.forEach((m, i) => pruefeMeilensteinForm(m, i, verstoesse, gesehenIds))
    }
  }

  return verstoesse
}

/**
 * Lädt, parst und validiert die Roadmap. Wirft bei fehlender/unlesbarer
 * Datei, ungültigem JSON oder Schemaverstoß (Muster ladeProjektregister,
 * src/projekte/index.ts) — ein Konfigurationsfehler, kein Fachergebnis
 * eines Startauftrags.
 * @param pfad - Pfad zur roadmap.json
 * @returns die validierten Roadmap-Daten
 */
export function ladeRoadmap(pfad: string): RoadmapDaten {
  const roh = JSON.parse(readFileSync(pfad, 'utf8'))
  const verstoesse = validiereRoadmapDaten(roh)
  if (verstoesse.length > 0) {
    throw new Error(`Roadmap '${pfad}' ungültig: ${verstoesse.join('; ')}`)
  }
  return roh as RoadmapDaten
}
