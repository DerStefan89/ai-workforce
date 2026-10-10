/**
 * Datei: public/leitstand/start-hinweis.test.mjs
 *
 * Zweck: F45 B0 (F-986 a) — Text des Start-Hinweises: nur für die bekannte Art mit beiden Pfaden,
 * Pfade unverändert im Text, sonst leer (kein Band).
 *
 * Wird aufgerufen von: `npm run test` (node --test)
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { startHinweisText } from './start-hinweis.js'

test('falscher Ordner: Text nennt beide Pfade', () => {
  const text = startHinweisText({ art: 'falscherOrdner', istPfad: 'C:\\Projekte\\aiw-main-ansicht', sollPfad: 'C:\\Projekte\\ai-workforce' })
  assert.ok(text.includes('C:\\Projekte\\aiw-main-ansicht'), text)
  assert.ok(text.includes('C:\\Projekte\\ai-workforce'), text)
  assert.ok(text.includes('E-188'), text)
})

test('kein oder unbekannter Hinweis: leer', () => {
  assert.equal(startHinweisText(null), '')
  assert.equal(startHinweisText(undefined), '')
  assert.equal(startHinweisText({ art: 'anderes', istPfad: 'a', sollPfad: 'b' }), '')
  assert.equal(startHinweisText({ art: 'falscherOrdner', istPfad: 'a' }), '')
})
