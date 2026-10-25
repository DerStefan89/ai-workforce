/**
 * Datei: scripts/nachweis-laden.test.mjs
 *
 * Zweck: node:test für die Nachweis-Wartehilfe (scripts/nachweis-laden.mjs, F45 B5b-2c-2-AB, Advisor `advisor-b5b2c2.md` B9):
 * Platzhalter je Sprache (de/en/tr/ru nicht leer, „lädt“ allein nicht dabei, mehrwortige wie „wird geprüft“ dabei) und die
 * Wartehilfe gegen eine Ersatz-Seite (fertig, Zeitgrenze mit Nennung des Rests, fehlender Bereich) — ohne Browser.
 *
 * Wird aufgerufen von: `npm run test` (node --test)
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { WOERTERBUECHER } from '../public/leitstand/i18n.js'
import { ladePlatzhalter, warteBisGeladen } from './nachweis-laden.mjs'

test('ladePlatzhalter: je Sprache nicht leer; „Lädt…“ und mehrwortige Sätze dabei, ein einzelnes Wort nicht', () => {
  for (const sprache of ['de', 'en', 'tr', 'ru']) assert.ok(ladePlatzhalter(WOERTERBUECHER[sprache]).length > 10, sprache)
  const de = ladePlatzhalter(WOERTERBUECHER.de)
  assert.ok(de.includes('Lädt…'))
  assert.ok(de.includes('wird geprüft'))
  assert.ok(de.includes('Der Ausführungsstand wird geladen …'))
  assert.ok(de.includes('Prioritäten der Features laden …'))
  assert.equal(de.includes('lädt'), false, '„lädt“ allein ist zu allgemein')
  assert.deepEqual(ladePlatzhalter({ 'a.laedt': { one: 'x lädt', other: 'y laden …' }, 'b.titel': 'Lädt…', 'c.zielLaedt': 'lädt' }), ['y laden …', 'x lädt'])
  assert.deepEqual(ladePlatzhalter(undefined), [])
})

/**
 * Ersatz-Seite: evaluate liefert der Reihe nach die Texte aus `texte` (null = Bereich fehlt); waitForTimeout wartet nicht.
 * @param texte - innerText je Abfrage
 * @returns Seite
 */
function ersatzSeite(texte) {
  let i = 0
  return {
    abfragen: () => i,
    evaluate: async (fn, arg) => {
      const text = texte[Math.min(i++, texte.length - 1)]
      globalThis.document = { querySelector: () => (text === null ? null : { innerText: text }) }
      try {
        return fn(arg)
      } finally {
        delete globalThis.document
      }
    },
    waitForTimeout: async () => {},
  }
}

test('warteBisGeladen: fertig, sobald kein Platzhalter mehr sichtbar ist', async () => {
  const seite = ersatzSeite(['Lädt…', 'Diff lädt …', 'fertig'])
  await warteBisGeladen(seite, ['Diff lädt …', 'Lädt…'], '#x', { zeitgrenzeMs: 1000, abstandMs: 0 })
  assert.equal(seite.abfragen(), 3)
})

test('warteBisGeladen: nach der Zeitgrenze Fehler mit dem restlichen Platzhalter bzw. „Bereich fehlt“ — kein Hängen', async () => {
  await assert.rejects(warteBisGeladen(ersatzSeite(['Status: wird geprüft']), ['wird geprüft', 'Lädt…'], '#detail', { zeitgrenzeMs: 0, abstandMs: 0 }), /#detail nach 0 ms nicht fertig geladen: „wird geprüft“/)
  await assert.rejects(warteBisGeladen(ersatzSeite([null]), ['Lädt…'], '#fehlt', { zeitgrenzeMs: 0, abstandMs: 0 }), /Bereich fehlt/)
})
