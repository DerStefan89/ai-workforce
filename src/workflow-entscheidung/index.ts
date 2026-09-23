/**
 * Datei: src/workflow-entscheidung/index.ts
 *
 * Zweck: Reine Funktionen für das Architektur-Entscheidungsartefakt (F39
 * WS-2b, löst state/findings.md F-632 Teil b). validiereWorkflowEntscheidungDaten
 * prüft ausschließlich die Payload-Form (Muster
 * validiereEntscheidungsDaten, src/entscheidung/index.ts, D5 — handgeschrieben
 * statt ajv). pruefeAntwortenGegenFragen ist eine EIGENE, zweite Prüfung
 * (bewusst getrennt, nicht in validiereWorkflowEntscheidungDaten verschmolzen):
 * sie braucht zusätzlich die 'entscheidungen_mensch[]' des geprüften
 * Architektur-Laufs (schemas/ergebnis-architektur.schema.json) als
 * Vergleichsgrundlage — eine reine Formprüfung kennt diesen Lauf nicht.
 *
 * Wird aufgerufen von: scripts/leitstand/routen-f39.mjs (POST
 * /api/workflows/<id>/entscheidung), scripts/check-f39-architekt.mjs,
 * src/workflow-entscheidung/workflow-entscheidung.test.ts.
 */

import type { EntscheidungMensch } from '../architekt/types.ts'
import type { WorkflowArchitekturEntscheidungV0Daten, WorkflowEntscheidungAntwort } from './types.ts'

const BASIS_FELDER = new Set(['schritt_id', 'antworten', 'entschieden_am'])
const ANTWORT_FELDER = new Set(['frage', 'gewaehlt', 'begruendung'])

function istObjekt(wert: unknown): wert is Record<string, unknown> {
  return typeof wert === 'object' && wert !== null && !Array.isArray(wert)
}

function istNichtLeererString(wert: unknown): wert is string {
  return typeof wert === 'string' && wert.length > 0
}

/**
 * Prüft ein einzelnes Element von daten.antworten gegen die erwartete Form.
 * @param eintrag - geparstes, sonst unbekanntes Objekt
 * @param index - Position im Array, für die Fehlermeldung
 * @returns Liste der Regelverletzungen; leer = gültig
 */
function validiereAntwort(eintrag: unknown, index: number): string[] {
  const pfad = `antworten[${index}]`
  if (!istObjekt(eintrag)) return [`'${pfad}' muss ein Objekt sein`]
  const verstoesse: string[] = []
  for (const feld of Object.keys(eintrag)) {
    if (!ANTWORT_FELDER.has(feld)) verstoesse.push(`'${pfad}' trägt unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  for (const feld of ['frage', 'gewaehlt']) {
    if (!(feld in eintrag)) verstoesse.push(`'${pfad}.${feld}' fehlt`)
    else if (!istNichtLeererString(eintrag[feld])) verstoesse.push(`'${pfad}.${feld}' muss ein nicht-leerer String sein`)
  }
  if ('begruendung' in eintrag && typeof eintrag.begruendung !== 'string') {
    verstoesse.push(`'${pfad}.begruendung' muss ein String sein, wenn gesetzt`)
  }
  return verstoesse
}

/**
 * Reine Funktion: prüft ein geparstes Objekt gegen die Form von
 * daten.daten der Kette 'workflow-entscheidung-<workflowId>'. Kennt NICHT
 * den zugehörigen Architektur-Lauf — dafür pruefeAntwortenGegenFragen.
 * @param daten - geparstes, sonst unbekanntes Objekt
 * @returns Liste der Regelverletzungen; leeres Array = gültig
 */
export function validiereWorkflowEntscheidungDaten(daten: unknown): string[] {
  if (!istObjekt(daten)) {
    return ['Wurzel ist kein Objekt']
  }
  const verstoesse: string[] = []

  for (const feld of Object.keys(daten)) {
    if (!BASIS_FELDER.has(feld)) verstoesse.push(`unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  for (const feld of BASIS_FELDER) {
    if (!(feld in daten)) verstoesse.push(`Pflichtfeld '${feld}' fehlt`)
  }

  if ('schritt_id' in daten && !istNichtLeererString(daten.schritt_id)) {
    verstoesse.push("'schritt_id' muss ein nicht-leerer String sein")
  }
  if ('entschieden_am' in daten && !istNichtLeererString(daten.entschieden_am)) {
    verstoesse.push("'entschieden_am' muss ein nicht-leerer String sein")
  }
  if ('antworten' in daten) {
    if (!Array.isArray(daten.antworten)) {
      verstoesse.push("'antworten' muss ein Array sein")
    } else {
      verstoesse.push(...daten.antworten.flatMap((eintrag, index) => validiereAntwort(eintrag, index)))
    }
  }

  return verstoesse
}

/**
 * Zweite, eigenständige Prüfung (s. Kopfkommentar): jede Frage aus
 * 'entscheidungenMensch' ist GENAU EINMAL beantwortet, und jede 'gewaehlt'
 * nennt den Titel einer gelisteten Option der zugehörigen Frage — keine
 * Option erfinden, keine unbekannte oder doppelt beantwortete Frage. Reine
 * Funktion, kein I/O.
 * @param antworten - bereits formgeprüfte Antworten (validiereWorkflowEntscheidungDaten)
 * @param entscheidungenMensch - 'entscheidungen_mensch[]' des zugehörigen Architektur-Laufs
 * @returns Liste der Regelverletzungen; leeres Array = gültig
 */
export function pruefeAntwortenGegenFragen(antworten: WorkflowEntscheidungAntwort[], entscheidungenMensch: EntscheidungMensch[]): string[] {
  const verstoesse: string[] = []
  const fragenGezaehlt = new Map<string, number>()
  for (const antwort of antworten) {
    fragenGezaehlt.set(antwort.frage, (fragenGezaehlt.get(antwort.frage) ?? 0) + 1)
  }

  for (const entscheidung of entscheidungenMensch) {
    const anzahl = fragenGezaehlt.get(entscheidung.frage) ?? 0
    if (anzahl === 0) {
      verstoesse.push(`Frage '${entscheidung.frage}' ist unbeantwortet`)
    } else if (anzahl > 1) {
      verstoesse.push(`Frage '${entscheidung.frage}' ist ${anzahl}-mal beantwortet — genau eine Antwort je Frage erwartet`)
    }
  }

  const bekannteFragen = new Set(entscheidungenMensch.map((e) => e.frage))
  const optionenJeFrage = new Map(entscheidungenMensch.map((e) => [e.frage, e.optionen.map((o) => o.titel)]))
  for (const antwort of antworten) {
    if (!bekannteFragen.has(antwort.frage)) {
      verstoesse.push(`Antwort nennt unbekannte Frage '${antwort.frage}' — steht nicht in entscheidungen_mensch[] des Architektur-Laufs`)
      continue
    }
    const optionen = optionenJeFrage.get(antwort.frage) ?? []
    if (!optionen.includes(antwort.gewaehlt)) {
      verstoesse.push(`'gewaehlt' ('${antwort.gewaehlt}') für Frage '${antwort.frage}' nennt keine der gelisteten Optionen (${optionen.join(', ')}) — keine Option erfinden`)
    }
  }

  return verstoesse
}

export type { WorkflowArchitekturEntscheidungV0Daten, WorkflowEntscheidungAntwort }
