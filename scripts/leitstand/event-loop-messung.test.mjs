/**
 * Datei: scripts/leitstand/event-loop-messung.test.mjs
 *
 * Zweck: Tests der Event-Loop-Messung (F45 B0, Teil 2 Punkt 6): No-op ohne LEITSTAND_ZEITMESSUNG=1,
 * Zeilenformat, eine Zeile je Fenster mit aktivem Schalter, Stopp beendet die Ausgabe.
 *
 * Wird aufgerufen von: `npm run test` (node --test)
 */

import assert from 'node:assert/strict'
import { setTimeout as warte } from 'node:timers/promises'
import test from 'node:test'
import { formatiereEventLoopZeile, starteEventLoopMessung } from './event-loop-messung.mjs'

test('ohne LEITSTAND_ZEITMESSUNG=1 schreibt die Messung nichts', async () => {
  const zeilen = []
  const stoppe = starteEventLoopMessung({ env: {}, fensterMs: 10, ausgabe: (z) => zeilen.push(z) })
  await warte(50)
  stoppe()
  assert.deepEqual(zeilen, [])
})

test('formatiereEventLoopZeile rundet Nanosekunden auf ganze Millisekunden', () => {
  assert.equal(formatiereEventLoopZeile(250_400_000, 12_600_000), '[leitstand] Event-Loop 60s: max 250 p99 13')
  assert.equal(formatiereEventLoopZeile(Number.NaN, Number.POSITIVE_INFINITY), '[leitstand] Event-Loop 60s: max 0 p99 0')
})

test('mit LEITSTAND_ZEITMESSUNG=1 kommt je Fenster eine Zeile, nach dem Stopp keine mehr', async () => {
  const zeilen = []
  const stoppe = starteEventLoopMessung({ env: { LEITSTAND_ZEITMESSUNG: '1' }, fensterMs: 20, ausgabe: (z) => zeilen.push(z) })
  await warte(75)
  stoppe()
  const anzahl = zeilen.length
  assert.ok(anzahl >= 2, `erwartet mindestens zwei Zeilen, waren ${anzahl}`)
  for (const zeile of zeilen) assert.match(zeile, /^\[leitstand\] Event-Loop 60s: max \d+ p99 \d+$/)
  await warte(50)
  assert.equal(zeilen.length, anzahl)
})
