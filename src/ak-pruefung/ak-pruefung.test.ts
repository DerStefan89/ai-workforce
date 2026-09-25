/**
 * Datei: src/ak-pruefung/ak-pruefung.test.ts
 *
 * Zweck: node:test-Fälle für pruefeAkUrteile/baueAkPruefInstruktion (F35 WS-2).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { baueAkPruefInstruktion, pruefeAkUrteile } from './index.ts'

const ZWEI_AK = [
  { id: 'AK1', text: 'Erstes Kriterium.' },
  { id: 'AK2', text: 'Zweites Kriterium.' },
]

test('pruefeAkUrteile: ohne akzeptanzkriterien am Auftrag bleibt IMMER [] Verstöße (Alt-Verhalten)', () => {
  assert.deepStrictEqual(pruefeAkUrteile(undefined, [{ ak_id: 'AK1', urteil: 'NICHT_ERFUELLT', beleg: '' }]), [])
  assert.deepStrictEqual(pruefeAkUrteile([], [{ ak_id: 'AK1', urteil: 'ERFUELLT', beleg: 'x' }]), [])
})

test('pruefeAkUrteile: alle AK vollständig und ERFUELLT mit Beleg liefert 0 Verstöße', () => {
  const verstoesse = pruefeAkUrteile(ZWEI_AK, [
    { ak_id: 'AK1', urteil: 'ERFUELLT', beleg: 'src/x.ts:12' },
    { ak_id: 'AK2', urteil: 'ERFUELLT', beleg: 'test "y" grün' },
  ])
  assert.deepStrictEqual(verstoesse, [])
})

test('pruefeAkUrteile: ein fehlendes AK-Urteil ist ein Verstoß', () => {
  const verstoesse = pruefeAkUrteile(ZWEI_AK, [{ ak_id: 'AK1', urteil: 'ERFUELLT', beleg: 'x' }])
  assert.strictEqual(verstoesse.length, 1)
  assert.ok(verstoesse[0].includes('AK2'))
})

test('pruefeAkUrteile: eine unbekannte ak_id ist ein Verstoß, zusätzlich zum fehlenden Urteil für die echten AK', () => {
  const verstoesse = pruefeAkUrteile(ZWEI_AK, [{ ak_id: 'AK9', urteil: 'ERFUELLT', beleg: 'x' }])
  assert.ok(verstoesse.some((v) => v.includes('unbekannte ak_id') && v.includes('AK9')))
  assert.ok(verstoesse.some((v) => v.includes('AK1')))
  assert.ok(verstoesse.some((v) => v.includes('AK2')))
})

test('pruefeAkUrteile: eine doppelt vergebene ak_id ist ein eigener Verstoß', () => {
  const verstoesse = pruefeAkUrteile(ZWEI_AK, [
    { ak_id: 'AK1', urteil: 'ERFUELLT', beleg: 'a' },
    { ak_id: 'AK1', urteil: 'ERFUELLT', beleg: 'b' },
    { ak_id: 'AK2', urteil: 'ERFUELLT', beleg: 'c' },
  ])
  assert.ok(verstoesse.some((v) => v.includes('mehrfach') && v.includes('AK1')))
})

test("pruefeAkUrteile: ein Urteil ungleich 'ERFUELLT' ist ein Verstoß, auch bei vorhandenem Beleg", () => {
  const verstoesse = pruefeAkUrteile(ZWEI_AK, [
    { ak_id: 'AK1', urteil: 'NICHT_ERFUELLT', beleg: 'x' },
    { ak_id: 'AK2', urteil: 'NICHT_PRUEFBAR', beleg: 'Begründung, warum nicht prüfbar.' },
  ])
  assert.strictEqual(verstoesse.length, 2)
  assert.ok(verstoesse.every((v) => v.includes('ist nicht')))
})

test('pruefeAkUrteile: ein leerer oder fehlender Beleg ist ein Verstoß, auch bei urteil ERFUELLT', () => {
  const verstoesse = pruefeAkUrteile(ZWEI_AK, [
    { ak_id: 'AK1', urteil: 'ERFUELLT', beleg: '' },
    { ak_id: 'AK2', urteil: 'ERFUELLT', beleg: '   ' },
  ])
  assert.strictEqual(verstoesse.length, 2)
  assert.ok(verstoesse.every((v) => v.includes('Beleg')))
})

test('pruefeAkUrteile: ein nicht-array-förmiges ak_urteile zählt als leer — jedes AK fehlt', () => {
  const verstoesse = pruefeAkUrteile(ZWEI_AK, null)
  assert.strictEqual(verstoesse.length, 2)
})

test('baueAkPruefInstruktion: enthält jede AK-ID/-Text-Zeile und die Nicht-Ziele', () => {
  const text = baueAkPruefInstruktion(ZWEI_AK, ['Ein Nicht-Ziel.'])
  assert.ok(text.includes('AK1: Erstes Kriterium.'))
  assert.ok(text.includes('AK2: Zweites Kriterium.'))
  assert.ok(text.includes('Ein Nicht-Ziel.'))
  assert.ok(text.includes('schwere HOCH'))
  assert.ok(text.includes('NICHT_PRUEFBAR'))
})

test('baueAkPruefInstruktion: ohne Nicht-Ziele entfällt der Nicht-Ziele-Absatz', () => {
  const text = baueAkPruefInstruktion(ZWEI_AK, [])
  assert.ok(!text.includes('Nicht-Ziele dieses Auftrags'))
})
