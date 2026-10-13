/**
 * Datei: public/leitstand/ak-entwurf.test.mjs
 *
 * Zweck: F45 B2a-2 (F-938) — AK-Entwurf aus der Maßnahme eines Findings und AK für POST /api/auftraege.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { baueAkEntwurf, baueAkzeptanzkriterien } from './ak-entwurf.js'

test('baueAkEntwurf: ein Eintrag aus der Maßnahme (getrimmt), ohne Maßnahme ein leeres Feld', () => {
  assert.deepEqual(baueAkEntwurf({ massnahme: '  Gate prüft X.\n' }), ['Gate prüft X.'])
  assert.deepEqual(baueAkEntwurf({ massnahme: '' }), [''])
  assert.deepEqual(baueAkEntwurf({}), [''])
  assert.deepEqual(baueAkEntwurf(null), [''])
})

test('baueAkzeptanzkriterien: leere Texte fallen weg, IDs fortlaufend nach der Reihenfolge', () => {
  assert.deepEqual(baueAkzeptanzkriterien([' A ', '', '  ', 'B']), [
    { id: 'AK1', text: 'A' },
    { id: 'AK2', text: 'B' },
  ])
  assert.deepEqual(baueAkzeptanzkriterien(['', ' ']), [])
})
