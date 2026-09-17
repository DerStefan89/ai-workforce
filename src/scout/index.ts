/**
 * Datei: src/scout/index.ts
 *
 * Zweck: Scout-Modul (F27 WS-1). Eine einzige Verantwortlichkeit:
 * validiereErgebnisScout prüft ein geparstes Objekt gegen
 * schemas/ergebnis-scout.schema.json (Muster validiereErgebnisRouter,
 * src/router/index.ts, D5 — handgeschrieben statt ajv, dieselbe
 * Repo-Entscheidung). Kein Kernartefaktbau, keine Workflow-Wahl wie beim
 * Router: WS-1 liefert die Mechanik bis zum validen Ergebnis, der
 * Schreibpfad nach ressourcen.json ("Vormerken") ist WS-2.
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs (leseScoutErgebnisAusLaufakte),
 * scripts/check-f27-scout.mjs, src/scout/scout.test.ts.
 */

import type { ErgebnisScout, ScoutFit, ScoutIntegrationsaufwand, ScoutKandidat, ScoutKandidatTyp } from './types.ts'

const KANDIDAT_TYP = ['skill', 'extern']
const FIT = ['hoch', 'mittel', 'niedrig']
const INTEGRATIONSAUFWAND = ['gering', 'mittel', 'hoch']

const ERGEBNIS_SCOUT_FELDER = new Set(['gesuchte_capability', 'kandidaten', 'hinweis_untrusted'])
const KANDIDAT_FELDER = new Set(['name', 'typ', 'quelle_url', 'capabilities', 'fit', 'integrationsaufwand', 'rechte', 'risiken', 'lizenz', 'empfehlung', 'unsicherheiten'])
const KANDIDAT_PFLICHTFELDER = ['name', 'typ', 'quelle_url', 'capabilities', 'fit', 'integrationsaufwand', 'rechte', 'risiken', 'empfehlung', 'unsicherheiten']

function istObjekt(wert: unknown): wert is Record<string, unknown> {
  return typeof wert === 'object' && wert !== null && !Array.isArray(wert)
}

function istNichtLeererString(wert: unknown): wert is string {
  return typeof wert === 'string' && wert.length > 0
}

function istArrayNichtLeererStrings(wert: unknown): wert is string[] {
  return Array.isArray(wert) && wert.every((eintrag) => istNichtLeererString(eintrag))
}

/**
 * Prüft einen einzelnen Kandidaten gegen schemas/ergebnis-scout.schema.json' kandidaten[]-Form.
 * @param kandidat - geparstes, sonst unbekanntes Objekt
 * @param index - Position im kandidaten-Array (für die Fehlermeldung)
 * @returns Liste der Regelverletzungen; leer = gültig
 */
function validiereKandidat(kandidat: unknown, index: number): string[] {
  if (!istObjekt(kandidat)) {
    return [`'kandidaten[${index}]' muss ein Objekt sein`]
  }
  const verstoesse: string[] = []

  for (const feld of Object.keys(kandidat)) {
    if (!KANDIDAT_FELDER.has(feld)) verstoesse.push(`'kandidaten[${index}]' trägt unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  for (const feld of KANDIDAT_PFLICHTFELDER) {
    if (!(feld in kandidat)) verstoesse.push(`'kandidaten[${index}].${feld}' fehlt`)
  }

  if ('name' in kandidat && !istNichtLeererString(kandidat.name)) verstoesse.push(`'kandidaten[${index}].name' muss ein nicht-leerer String sein`)
  if ('typ' in kandidat && (typeof kandidat.typ !== 'string' || !KANDIDAT_TYP.includes(kandidat.typ))) {
    verstoesse.push(`'kandidaten[${index}].typ' muss einer von ${KANDIDAT_TYP.join(', ')} sein`)
  }
  if ('quelle_url' in kandidat && (!istNichtLeererString(kandidat.quelle_url) || !/^https?:\/\//.test(kandidat.quelle_url))) {
    verstoesse.push(`'kandidaten[${index}].quelle_url' muss mit 'http://' oder 'https://' beginnen (Zwilling von herkunftExtern.url, schemas/ressourcen.schema.json) — der Scout durchsucht adversariellen Web-Inhalt (P5), ein anderes Schema (z. B. javascript:) würde im Leitstand anklickbar gerendert`)
  }
  if ('capabilities' in kandidat) {
    if (!Array.isArray(kandidat.capabilities) || kandidat.capabilities.length === 0 || !istArrayNichtLeererStrings(kandidat.capabilities)) {
      verstoesse.push(`'kandidaten[${index}].capabilities' muss ein Array mit mindestens einem nicht-leeren String sein`)
    }
  }
  if ('fit' in kandidat && (typeof kandidat.fit !== 'string' || !FIT.includes(kandidat.fit))) {
    verstoesse.push(`'kandidaten[${index}].fit' muss einer von ${FIT.join(', ')} sein`)
  }
  if ('integrationsaufwand' in kandidat && (typeof kandidat.integrationsaufwand !== 'string' || !INTEGRATIONSAUFWAND.includes(kandidat.integrationsaufwand))) {
    verstoesse.push(`'kandidaten[${index}].integrationsaufwand' muss einer von ${INTEGRATIONSAUFWAND.join(', ')} sein`)
  }
  if ('rechte' in kandidat && !istNichtLeererString(kandidat.rechte)) verstoesse.push(`'kandidaten[${index}].rechte' muss ein nicht-leerer String sein`)
  if ('risiken' in kandidat && !(Array.isArray(kandidat.risiken) && istArrayNichtLeererStrings(kandidat.risiken))) {
    verstoesse.push(`'kandidaten[${index}].risiken' muss ein Array nicht-leerer Strings sein (leer ist zulässig)`)
  }
  if ('lizenz' in kandidat && !istNichtLeererString(kandidat.lizenz)) verstoesse.push(`'kandidaten[${index}].lizenz' muss, wenn angegeben, ein nicht-leerer String sein`)
  if ('empfehlung' in kandidat && !istNichtLeererString(kandidat.empfehlung)) verstoesse.push(`'kandidaten[${index}].empfehlung' muss ein nicht-leerer String sein`)
  if ('unsicherheiten' in kandidat && !(Array.isArray(kandidat.unsicherheiten) && istArrayNichtLeererStrings(kandidat.unsicherheiten))) {
    verstoesse.push(`'kandidaten[${index}].unsicherheiten' muss ein Array nicht-leerer Strings sein (leer ist zulässig)`)
  }

  return verstoesse
}

/**
 * Reine Funktion: prüft ein geparstes Objekt gegen
 * schemas/ergebnis-scout.schema.json. Keine Seiteneffekte, kein Datei-I/O —
 * Muster validiereErgebnisRouter (src/router/index.ts, D5).
 * @param daten - geparstes, sonst unbekanntes Objekt
 * @returns Liste der Regelverletzungen; leeres Array = gültig
 */
export function validiereErgebnisScout(daten: unknown): string[] {
  if (!istObjekt(daten)) {
    return ['Wurzel ist kein Objekt']
  }
  const verstoesse: string[] = []

  for (const feld of Object.keys(daten)) {
    if (!ERGEBNIS_SCOUT_FELDER.has(feld)) verstoesse.push(`unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  for (const feld of ERGEBNIS_SCOUT_FELDER) {
    if (!(feld in daten)) verstoesse.push(`Pflichtfeld '${feld}' fehlt`)
  }

  if ('gesuchte_capability' in daten && !istNichtLeererString(daten.gesuchte_capability)) {
    verstoesse.push("'gesuchte_capability' muss ein nicht-leerer String sein")
  }

  if ('kandidaten' in daten) {
    if (!Array.isArray(daten.kandidaten) || daten.kandidaten.length > 5) {
      verstoesse.push("'kandidaten' muss ein Array mit höchstens 5 Einträgen sein")
    } else {
      daten.kandidaten.forEach((kandidat, i) => verstoesse.push(...validiereKandidat(kandidat, i)))
    }
  }

  if ('hinweis_untrusted' in daten && daten.hinweis_untrusted !== true) {
    verstoesse.push("'hinweis_untrusted' muss der feste Wert true sein")
  }

  return verstoesse
}

export type { ErgebnisScout, ScoutFit, ScoutIntegrationsaufwand, ScoutKandidat, ScoutKandidatTyp }
