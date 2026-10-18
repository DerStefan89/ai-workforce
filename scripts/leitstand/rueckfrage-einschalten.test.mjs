/**
 * Datei: scripts/leitstand/rueckfrage-einschalten.test.mjs
 *
 * Zweck: Unit-Tests des Schalters (F45 B2b-3b-2b-2a-1, seit B2b-3b-2b-2b-2b-1 Standard an): fehlt oder `'1'` ⇒ an, genau `'0'` ⇒ aus,
 * jeder andere Wert ⇒ aus mit Grund (fail-closed), Port 0 ⇒ aus, Option je Instanz.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { rueckfrageBasisAusUmgebung, rueckfrageOptionFuer, rueckfrageStartzeile } from './rueckfrage-einschalten.mjs'

test('rueckfrageBasisAusUmgebung: fehlt oder "1" mit gültigem Port ⇒ an; "0" ⇒ aus; sonstiger Wert ⇒ aus mit Grund', () => {
  for (const env of [{}, { LEITSTAND_RUECKFRAGE: undefined }, { LEITSTAND_RUECKFRAGE: '1' }]) assert.deepEqual(rueckfrageBasisAusUmgebung(env, 4173), { an: true, basis: 'http://127.0.0.1:4173/api' }, JSON.stringify(env))
  assert.deepEqual(rueckfrageBasisAusUmgebung({ LEITSTAND_RUECKFRAGE: '0' }, 4173), { an: false, grund: 'LEITSTAND_RUECKFRAGE=0 (ausgeschaltet)' })
  for (const wert of ['', 'true', ' 1', '1 ', 'an', 'false', ' 0', '0 ', '00']) {
    const stand = rueckfrageBasisAusUmgebung({ LEITSTAND_RUECKFRAGE: wert }, 4173)
    assert.equal(stand.an, false, JSON.stringify(wert))
    assert.match(stand.grund, /^unbekannter Wert LEITSTAND_RUECKFRAGE=.* \(nur 0 schaltet aus\)$/, JSON.stringify(wert))
  }
  for (const port of [0, -1, 1.5, Number.NaN, 70000]) assert.equal(rueckfrageBasisAusUmgebung({}, port).an, false, String(port))
  for (const port of [0, -1]) assert.equal(rueckfrageBasisAusUmgebung({ LEITSTAND_RUECKFRAGE: '1' }, port).an, false, String(port))
  assert.equal(rueckfrageBasisAusUmgebung(undefined, 4173).an, false)
  assert.equal(rueckfrageBasisAusUmgebung(null, 4173).an, false)
})

test('rueckfrageOptionFuer: {} ohne Basis, url je Instanz, ungültige Projekt-id ⇒ {}', () => {
  assert.deepEqual(rueckfrageOptionFuer(undefined), {})
  assert.deepEqual(rueckfrageOptionFuer(''), {})
  assert.deepEqual(rueckfrageOptionFuer({ an: false, grund: 'x' }), {})
  assert.deepEqual(rueckfrageOptionFuer('http://127.0.0.1:1/api'), { rueckfrage: { an: true, url: 'http://127.0.0.1:1/api' } })
  assert.deepEqual(rueckfrageOptionFuer('http://127.0.0.1:1/api', 'p-1'), { rueckfrage: { an: true, url: 'http://127.0.0.1:1/api/projekte/p-1' } })
  for (const id of ['', 'A', '../x', 'a/b', '-a']) assert.deepEqual(rueckfrageOptionFuer('http://127.0.0.1:1/api', id), {}, id)
})

test('rueckfrageStartzeile: an mit Basis und Ausschalter, ohne „noch nicht für echte Läufe“; aus mit Grund', () => {
  const an = rueckfrageStartzeile({ an: true, basis: 'http://127.0.0.1:1/api' })
  assert.match(an, /^Rückfrage-Kanal: an \(http:\/\/127\.0\.0\.1:1\/api; ausschalten mit LEITSTAND_RUECKFRAGE=0\)/)
  assert.doesNotMatch(an, /noch nicht für echte Läufe/)
  assert.match(rueckfrageStartzeile({ an: false, grund: 'LEITSTAND_RUECKFRAGE=0 (ausgeschaltet)' }), /^Rückfrage-Kanal: aus \(LEITSTAND_RUECKFRAGE=0 \(ausgeschaltet\)\)$/)
})
