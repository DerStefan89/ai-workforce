/**
 * Datei: scripts/leitstand/kennung.test.mjs
 *
 * Zweck: Unit-Tests der Kennungsregel (F45 B2b-4a-1): LAUFID_UNZULAESSIGE_ZEICHEN unverändert gegenüber dem bisherigen
 * Server-Stand, pruefeAblaufKennung (fehlt, leer, zu lang, unzulässige Zeichen; Grund ohne Rohwert).
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import { ABLAUF_KENNUNG_MAX, LAUFID_UNZULAESSIGE_ZEICHEN, pruefeAblaufKennung } from './kennung.mjs'

test('LAUFID_UNZULAESSIGE_ZEICHEN: dieselbe Regel wie bisher im Server (Quelle unverändert)', () => {
  assert.equal(LAUFID_UNZULAESSIGE_ZEICHEN.source, String.raw`[/\\]|\.\.|[\u0000-\u001f]`)
  for (const gut of ['wf-1', 'b1a1-nachweis-325d2a8f', 'a.b', 'a:b']) assert.equal(LAUFID_UNZULAESSIGE_ZEICHEN.test(gut), false, gut)
  for (const schlecht of ['a/b', 'a\\b', '..', 'a..b', 'a\nb', 'a\u0000b']) assert.equal(LAUFID_UNZULAESSIGE_ZEICHEN.test(schlecht), true, JSON.stringify(schlecht))
})

test('pruefeAblaufKennung: fehlt → null, zulässig → null', () => {
  assert.equal(pruefeAblaufKennung(null), null)
  assert.equal(pruefeAblaufKennung('wf-1'), null)
  assert.equal(pruefeAblaufKennung('x'.repeat(ABLAUF_KENNUNG_MAX)), null)
})

test('pruefeAblaufKennung: leer, zu lang, unzulässige Zeichen, kein String → Grund ohne Rohwert', () => {
  const marke = 'GEHEIM'
  for (const roh of ['', `${marke}${'x'.repeat(ABLAUF_KENNUNG_MAX)}`, `../${marke}`, `${marke}/x`, `${marke}\\x`, `${marke}\u0007`, 42, undefined]) {
    const grund = pruefeAblaufKennung(roh)
    assert.equal(typeof grund, 'string', JSON.stringify(roh))
    assert.ok(!grund.includes(marke), `Grund gibt den Rohwert wieder: ${grund}`)
  }
})
