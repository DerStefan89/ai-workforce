/**
 * Datei: public/leitstand/auswahl-bremse.test.mjs
 *
 * Zweck: node:test für die Tastatur-Bremse der Kopf-<select> (auswahl-bremse.js, F44 WS-1b):
 * Pfeiltaste hält zurück, Enter und Verlassen wenden an, Escape verwirft, Maus und geöffnete
 * Liste wenden sofort an. Ein EventTarget mit value ersetzt das <select>.
 *
 * Wird aufgerufen von: npm run check (node --test)
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { beiBestaetigterAuswahl } from './auswahl-bremse.js'

/**
 * Baut ein Schein-<select> mit Zählern für anwenden/zuruecksetzen.
 * @returns { feld, angewendet, zurueck, taste(key, optionen), waehle(wert) }
 */
function aufbau() {
  const feld = new EventTarget()
  feld.value = 'a'
  const zaehler = { angewendet: [], zurueck: 0 }
  beiBestaetigterAuswahl(
    feld,
    () => zaehler.angewendet.push(feld.value),
    () => {
      zaehler.zurueck += 1
      feld.value = 'a'
    }
  )
  const taste = (key, optionen = {}) => feld.dispatchEvent(Object.assign(new Event('keydown'), { key, altKey: false, ...optionen }))
  const loslassen = () => feld.dispatchEvent(new Event('keyup'))
  const waehle = (wert) => {
    feld.value = wert
    feld.dispatchEvent(new Event('change'))
  }
  const verlassen = () => feld.dispatchEvent(new Event('blur'))
  return { feld, zaehler, taste, loslassen, waehle, verlassen }
}

test('Pfeiltaste im geschlossenen Feld hält den Wechsel zurück, Enter wendet an', () => {
  const { zaehler, taste, loslassen, waehle } = aufbau()
  taste('ArrowDown')
  waehle('b')
  loslassen()
  assert.deepEqual(zaehler.angewendet, [])
  taste('Enter')
  assert.deepEqual(zaehler.angewendet, ['b'])
})

test('Pfeiltaste, dann Feld verlassen wendet an', () => {
  const { zaehler, taste, loslassen, waehle, verlassen } = aufbau()
  taste('ArrowDown')
  waehle('b')
  loslassen()
  verlassen()
  assert.deepEqual(zaehler.angewendet, ['b'])
})

test('Escape verwirft einen wartenden Wert, ohne anzuwenden', () => {
  const { feld, zaehler, taste, loslassen, waehle, verlassen } = aufbau()
  taste('ArrowDown')
  waehle('b')
  loslassen()
  taste('Escape')
  assert.equal(zaehler.zurueck, 1)
  assert.equal(feld.value, 'a')
  verlassen()
  // anwenden() läuft, sieht aber den geltenden Wert — es ändert sich nichts.
  assert.deepEqual(zaehler.angewendet, ['a'])
})

test('Escape ohne wartenden Wert setzt nichts zurück', () => {
  const { zaehler, taste } = aufbau()
  taste('Escape')
  assert.equal(zaehler.zurueck, 0)
})

test('Auswahl per Maus wendet sofort an — auch nach einer früheren Pfeiltaste', () => {
  const { zaehler, taste, loslassen, waehle } = aufbau()
  taste('ArrowDown')
  loslassen()
  waehle('c')
  assert.deepEqual(zaehler.angewendet, ['c'])
})

test('Wahl in der mit Alt+↓ oder Leertaste geöffneten Liste wendet sofort an', () => {
  const { zaehler, taste, loslassen, waehle } = aufbau()
  taste('ArrowDown', { altKey: true })
  waehle('b')
  loslassen()
  taste(' ')
  waehle('c')
  assert.deepEqual(zaehler.angewendet, ['b', 'c'])
})

test('Buchstabe (Suche im geschlossenen Feld) hält ebenfalls zurück', () => {
  const { zaehler, taste, waehle } = aufbau()
  taste('p')
  waehle('p')
  assert.deepEqual(zaehler.angewendet, [])
})
