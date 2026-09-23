/**
 * Datei: src/workflow-entscheidung/workflow-entscheidung.test.ts
 *
 * Zweck: node:test-Fälle für das Architektur-Entscheidungsartefakt (F39
 * WS-2b, löst state/findings.md F-632 Teil b). Reine Funktionen, kein I/O —
 * Muster src/entscheidung/entscheidung.test.ts.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { EntscheidungMensch } from '../architekt/types.ts'
import { pruefeAntwortenGegenFragen, validiereWorkflowEntscheidungDaten } from './index.ts'

function gueltig(ueberschreibungen: Record<string, unknown> = {}) {
  return {
    schritt_id: 'schritt-1-architekt',
    antworten: [{ frage: 'Speicherformat?', gewaehlt: 'Option A' }],
    entschieden_am: '2026-09-23T09:00:00.000Z',
    ...ueberschreibungen,
  }
}

test('validiereWorkflowEntscheidungDaten: gültige Payload liefert []', () => {
  assert.deepStrictEqual(validiereWorkflowEntscheidungDaten(gueltig()), [])
})

test('validiereWorkflowEntscheidungDaten: begruendung optional, aber wenn gesetzt ein String', () => {
  assert.deepStrictEqual(validiereWorkflowEntscheidungDaten(gueltig({ antworten: [{ frage: 'f', gewaehlt: 'g', begruendung: 'weil' }] })), [])
  assert.ok(validiereWorkflowEntscheidungDaten(gueltig({ antworten: [{ frage: 'f', gewaehlt: 'g', begruendung: 3 }] })).some((v) => v.includes('begruendung')))
})

test('validiereWorkflowEntscheidungDaten: fehlendes Pflichtfeld wird benannt', () => {
  const { schritt_id, ...ohneSchrittId } = gueltig()
  void schritt_id
  assert.ok(validiereWorkflowEntscheidungDaten(ohneSchrittId).some((v) => v.includes("Pflichtfeld 'schritt_id' fehlt")))
})

test('validiereWorkflowEntscheidungDaten: unbekanntes Feld wird abgelehnt', () => {
  assert.ok(validiereWorkflowEntscheidungDaten(gueltig({ extra: true })).some((v) => v.includes("unbekanntes Feld 'extra'")))
})

test('validiereWorkflowEntscheidungDaten: leeres antworten-Array bleibt formgültig (Kreuzprüfung ist Sache von pruefeAntwortenGegenFragen)', () => {
  assert.deepStrictEqual(validiereWorkflowEntscheidungDaten(gueltig({ antworten: [] })), [])
})

const ENTSCHEIDUNGEN_MENSCH: EntscheidungMensch[] = [
  {
    frage: 'Speicherformat?',
    optionen: [
      { titel: 'Option A', vorteile: [], nachteile: [] },
      { titel: 'Option B', vorteile: [], nachteile: [] },
    ],
    auswirkung_bestand: 'keine',
    empfehlung: 'Option A',
    begruendung: 'x',
  },
]

test('pruefeAntwortenGegenFragen: eine Antwort je Frage mit gelisteter Option ist gültig', () => {
  assert.deepStrictEqual(pruefeAntwortenGegenFragen([{ frage: 'Speicherformat?', gewaehlt: 'Option A' }], ENTSCHEIDUNGEN_MENSCH), [])
})

test('pruefeAntwortenGegenFragen: unbeantwortete Frage wird benannt', () => {
  assert.ok(pruefeAntwortenGegenFragen([], ENTSCHEIDUNGEN_MENSCH).some((v) => v.includes('ist unbeantwortet')))
})

test('pruefeAntwortenGegenFragen: doppelt beantwortete Frage wird benannt', () => {
  const antworten = [
    { frage: 'Speicherformat?', gewaehlt: 'Option A' },
    { frage: 'Speicherformat?', gewaehlt: 'Option B' },
  ]
  assert.ok(pruefeAntwortenGegenFragen(antworten, ENTSCHEIDUNGEN_MENSCH).some((v) => v.includes('2-mal beantwortet')))
})

test('pruefeAntwortenGegenFragen: unbekannte Frage wird benannt', () => {
  assert.ok(pruefeAntwortenGegenFragen([{ frage: 'Erfundene Frage?', gewaehlt: 'x' }], ENTSCHEIDUNGEN_MENSCH).some((v) => v.includes('unbekannte Frage')))
})

test('pruefeAntwortenGegenFragen: erfundene Option wird abgelehnt, keine Option zu erfinden', () => {
  const verstoesse = pruefeAntwortenGegenFragen([{ frage: 'Speicherformat?', gewaehlt: 'Option C' }], ENTSCHEIDUNGEN_MENSCH)
  assert.ok(verstoesse.some((v) => v.includes('keine Option erfinden')))
})
