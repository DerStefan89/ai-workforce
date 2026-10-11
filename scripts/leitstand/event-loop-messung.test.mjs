/**
 * Datei: scripts/leitstand/event-loop-messung.test.mjs
 *
 * Zweck: Tests der Event-Loop-Messung (F45 B0, Teil 2 Punkt 6): No-op ohne LEITSTAND_ZEITMESSUNG=1,
 * Zeilenformat, eine Zeile je Fenster mit aktivem Schalter, Stopp beendet die Ausgabe. F45 P: Quellen-Zeile
 * (max/p95/anzahl je Poll-Quelle) und Meldung synchroner Strecken über 200 ms.
 *
 * Wird aufgerufen von: `npm run test` (node --test)
 */

import assert from 'node:assert/strict'
import { setTimeout as warte } from 'node:timers/promises'
import test from 'node:test'
import { erfasseQuellenDauer, formatiereEventLoopZeile, formatiereQuellenZeile, meldeSynchroneStrecke, starteEventLoopMessung } from './event-loop-messung.mjs'

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

test('F45 P: formatiereQuellenZeile — max, p95 und Anzahl je Quelle in ganzen ms', () => {
  const fenster = new Map([['laeufe', [10.4, 20, 30, 40, 300.6]], ['gesamt', [5]]])
  assert.equal(formatiereQuellenZeile(fenster), '[leitstand] Zustand-Quellen 60s: {"laeufe":{"max":301,"p95":301,"anzahl":5},"gesamt":{"max":5,"p95":5,"anzahl":1}}')
})

test('F45 P: ohne laufende Messung sind Quellen-Erfassung und Synchron-Meldung No-ops', () => {
  assert.doesNotThrow(() => erfasseQuellenDauer('laeufe', 12))
  assert.doesNotThrow(() => meldeSynchroneStrecke('GET /api/zustand', 999))
})

test('F45 P: mit laufender Messung — Quellen-Zeile je Fenster, Synchron-Meldung nur über 200 ms', async () => {
  const zeilen = []
  const stoppe = starteEventLoopMessung({ env: { LEITSTAND_ZEITMESSUNG: '1' }, fensterMs: 30, ausgabe: (z) => zeilen.push(z) })
  erfasseQuellenDauer('laeufe', 12)
  erfasseQuellenDauer('laeufe', 250)
  meldeSynchroneStrecke('GET /api/klein', 200)
  meldeSynchroneStrecke('GET /api/gross', 201.4)
  await warte(50)
  stoppe()
  assert.deepEqual(zeilen.filter((z) => z.startsWith('[leitstand] Synchron')), ['[leitstand] Synchron > 200 ms: GET /api/gross 201 ms'])
  assert.ok(zeilen.includes('[leitstand] Zustand-Quellen 60s: {"laeufe":{"max":250,"p95":250,"anzahl":2}}'), zeilen.join(' | '))
  // nach dem Stopp: wieder No-op
  const anzahl = zeilen.length
  meldeSynchroneStrecke('GET /api/gross', 900)
  assert.equal(zeilen.length, anzahl)
})
