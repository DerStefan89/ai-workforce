/**
 * Datei: scripts/leitstand/rueckfrage-einschalten.test.mjs
 *
 * Zweck: Unit-Tests des Opt-in (F45 B2b-3b-2b-2a-1): nur `LEITSTAND_RUECKFRAGE=1` schaltet ein, Port 0 ⇒ aus, Option je Instanz.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { rueckfrageBasisAusUmgebung, rueckfrageOptionFuer, rueckfrageStartzeile } from './rueckfrage-einschalten.mjs'

test('rueckfrageBasisAusUmgebung: nur "1" mit gültigem Port schaltet ein', () => {
  assert.deepEqual(rueckfrageBasisAusUmgebung({ LEITSTAND_RUECKFRAGE: '1' }, 4173), { an: true, basis: 'http://127.0.0.1:4173/api' })
  for (const wert of [undefined, '', '0', 'true', ' 1', '1 ']) assert.equal(rueckfrageBasisAusUmgebung({ LEITSTAND_RUECKFRAGE: wert }, 4173).an, false, String(wert))
  for (const port of [0, -1, 1.5, Number.NaN, 70000]) assert.equal(rueckfrageBasisAusUmgebung({ LEITSTAND_RUECKFRAGE: '1' }, port).an, false, String(port))
  assert.equal(rueckfrageBasisAusUmgebung(undefined, 4173).an, false)
})

test('rueckfrageOptionFuer: {} ohne Basis, url je Instanz, ungültige Projekt-id ⇒ {}', () => {
  assert.deepEqual(rueckfrageOptionFuer(undefined), {})
  assert.deepEqual(rueckfrageOptionFuer(''), {})
  assert.deepEqual(rueckfrageOptionFuer({ an: false, grund: 'x' }), {})
  assert.deepEqual(rueckfrageOptionFuer('http://127.0.0.1:1/api'), { rueckfrage: { an: true, url: 'http://127.0.0.1:1/api' } })
  assert.deepEqual(rueckfrageOptionFuer('http://127.0.0.1:1/api', 'p-1'), { rueckfrage: { an: true, url: 'http://127.0.0.1:1/api/projekte/p-1' } })
  for (const id of ['', 'A', '../x', 'a/b', '-a']) assert.deepEqual(rueckfrageOptionFuer('http://127.0.0.1:1/api', id), {}, id)
})

test('rueckfrageStartzeile: an mit Basis, aus mit Grund', () => {
  assert.match(rueckfrageStartzeile({ an: true, basis: 'http://127.0.0.1:1/api' }), /^Rückfrage-Kanal: an .*127\.0\.0\.1:1\/api.*noch nicht für echte Läufe nutzen/)
  assert.match(rueckfrageStartzeile({ an: false, grund: 'LEITSTAND_RUECKFRAGE nicht gesetzt' }), /^Rückfrage-Kanal: aus \(LEITSTAND_RUECKFRAGE nicht gesetzt\)/)
})
