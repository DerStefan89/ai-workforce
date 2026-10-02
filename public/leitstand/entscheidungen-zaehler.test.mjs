/**
 * Datei: public/leitstand/entscheidungen-zaehler.test.mjs
 *
 * Zweck: node:test für zaehlerAnzeige (entscheidungen-zaehler.js, F46 D2): Zahl aus dem Poll mit
 * offenen Abnahmen, verborgen bei 0, vor dem ersten Tick und bei defekter Quelle, Screenreader-Text
 * statt Live-Region.
 *
 * Wird aufgerufen von: npm run check (node --test)
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { zaehlerAnzeige } from './entscheidungen-zaehler.js'

test('zählt Freigaben, Rückfragen, Abnahmen, Fehler und Startprobleme aus dem Poll', () => {
  const anzeige = zaehlerAnzeige({
    workflows: [
      { workflowId: 'f', naechster: { art: 'haltFreigabe' } },
      { workflowId: 'a', naechster: { art: 'fertig' }, abnahme: { offen: true, status: 'nicht_vorhanden' } },
      { workflowId: 'z', naechster: { art: 'fertig' }, abnahme: { offen: false, status: 'ok' } },
    ],
    laeufe: [{ laufId: 'l', ergebnis: 'FEHLGESCHLAGEN', kenntnisgenommen: false }],
    startfehler: [{ laufId: 's' }],
  })
  assert.equal(anzeige.anzahl, 4)
  assert.match(anzeige.html, /<span aria-hidden="true">4<\/span>/)
  assert.match(anzeige.html, /class="sr-only"/)
  assert.doesNotMatch(anzeige.html, /aria-live/)
})

test('verborgen bei 0, vor dem ersten Tick und bei defekter Quelle', () => {
  assert.equal(zaehlerAnzeige({ workflows: [], laeufe: [], startfehler: [] }), null)
  assert.equal(zaehlerAnzeige(null), null)
  assert.equal(zaehlerAnzeige({ workflows: null, laeufe: [], startfehler: [] }), null)
})
