/**
 * Datei: public/leitstand/router.test.mjs
 *
 * Zweck: node:test-Fälle für den Hash-Router (F44 WS-4a): F-925 — eine kaputte Prozent-Kodierung
 * im Hash wirft nicht mehr, sondern fällt ohne neuen History-Eintrag auf die Standardroute zurück;
 * kein onEnter-Callback sieht den kaputten Wert. Dazu ersetzeRoute (F-923): ersetzt den Hash per
 * history.replaceState und dispatcht selbst.
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 *
 * Wichtig: Der Router greift erst beim Dispatch auf DOM, location und history zu — die
 * Schein-Globals stehen deshalb vor dem ersten Aufruf, nicht vor dem Import.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'

/** Schein-Views: data-view-Container mit hidden. */
const views = ['dashboard', 'workboard'].map((view) => ({ dataset: { view }, hidden: true }))

globalThis.document = {
  querySelectorAll: (selektor) => (selektor === '[data-view]' ? views : []),
}
Object.defineProperty(globalThis, 'location', { value: { hash: '' }, configurable: true, writable: true })
/** Aufgezeichnete replaceState-Aufrufe (jeder ersetzt den Hash, legt aber keinen Eintrag an). */
const ersetzt = []
Object.defineProperty(globalThis, 'history', {
  value: {
    state: null,
    replaceState(_zustand, _titel, url) {
      ersetzt.push(url)
      location.hash = url
    },
  },
  configurable: true,
  writable: true,
})

const { dispatch, ersetzeRoute, registriere } = await import('./router.js')

/** Werte, mit denen der onEnter-Callback der Detailroute aufgerufen wurde. */
const betreten = []
let dashboardBetreten = 0
registriere(/^#\/dashboard$/, 'dashboard', () => {
  dashboardBetreten += 1
})
registriere(/^#\/workboard\/([^/]+)$/, 'workboard', (id) => {
  betreten.push(id)
})

test('F-925: eine kaputte Prozent-Kodierung wirft nicht und fällt ohne neuen History-Eintrag auf die Standardroute zurück', () => {
  const warnung = console.warn
  console.warn = () => {}
  try {
    location.hash = '#/workboard/%E0%A4%A'
    assert.doesNotThrow(() => dispatch())
  } finally {
    console.warn = warnung
  }
  assert.deepEqual(betreten, [], 'kein onEnter mit dem kaputten Wert')
  assert.deepEqual(ersetzt, ['#/dashboard'])
  assert.equal(location.hash, '#/dashboard')
  assert.equal(dashboardBetreten, 1, 'die Standardroute wird sofort betreten')
  assert.equal(views.find((v) => v.dataset.view === 'dashboard').hidden, false)
})

test('Gültige Kodierung wird weiter dekodiert an onEnter übergeben', () => {
  location.hash = `#/workboard/${encodeURIComponent('F-1 ä/b')}`
  dispatch()
  assert.deepEqual(betreten, ['F-1 ä/b'])
  assert.equal(views.find((v) => v.dataset.view === 'workboard').hidden, false)
})

test('ersetzeRoute (F-923): ersetzt den Hash ohne neuen Eintrag und zeigt die Ziel-View sofort', () => {
  ersetzt.length = 0
  location.hash = '#/workboard/F-1'
  ersetzeRoute('#/dashboard')
  assert.deepEqual(ersetzt, ['#/dashboard'])
  assert.equal(views.find((v) => v.dataset.view === 'dashboard').hidden, false)
  assert.equal(views.find((v) => v.dataset.view === 'workboard').hidden, true)
})
