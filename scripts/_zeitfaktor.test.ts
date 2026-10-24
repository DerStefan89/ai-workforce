/**
 * Datei: scripts/_zeitfaktor.test.ts
 *
 * Zweck: Prüft scripts/_zeitfaktor.ts — Standard 1, gültige Faktoren, Ablehnung ungültiger Werte (F45 T).
 *
 * Wird aufgerufen von: npm run test (scripts/teste.mjs).
 *
 * Wichtig:
 * - Der Test setzt AIW_TEST_ZEITFAKTOR im eigenen Prozess und stellt den alten Wert im finally wieder her.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { skaliert, zeitfaktor } from './_zeitfaktor.ts'

test('zeitfaktor: ohne oder mit leerem Wert 1, sonst die Zahl', () => {
  assert.equal(zeitfaktor(undefined), 1)
  assert.equal(zeitfaktor(''), 1)
  assert.equal(zeitfaktor('  '), 1)
  assert.equal(zeitfaktor('1'), 1)
  assert.equal(zeitfaktor('2.5'), 2.5)
})

test('zeitfaktor: Text, 0, negativ, < 1, > 100 und unendlich werfen; 100 geht', () => {
  assert.equal(zeitfaktor('100'), 100)
  for (const schlecht of ['abc', '0', '-2', '0.5', '100.5', '1e6', 'Infinity', 'NaN']) {
    assert.throws(() => zeitfaktor(schlecht), /AIW_TEST_ZEITFAKTOR/, schlecht)
  }
})

test('skaliert: multipliziert mit dem Faktor aus der Umgebung und rundet', () => {
  const vorher = process.env.AIW_TEST_ZEITFAKTOR
  try {
    delete process.env.AIW_TEST_ZEITFAKTOR
    assert.equal(skaliert(15000), 15000)
    process.env.AIW_TEST_ZEITFAKTOR = '1.5'
    assert.equal(skaliert(15000), 22500)
    assert.equal(skaliert(3), 5)
  } finally {
    if (vorher === undefined) delete process.env.AIW_TEST_ZEITFAKTOR
    else process.env.AIW_TEST_ZEITFAKTOR = vorher
  }
})
