/**
 * Datei: src/workboard/feature-akte-pruefung.test.ts
 *
 * Zweck: node:test für die Regeln des Feature-Akte-Gates als reine Funktion (F45 B5a-1): Status gültig/fehlend/unbekannt
 * (dann nur dieser Befund), Pflichtabschnitte bei READY_FOR_TECH, optionale Abschnitte leer, Status-Zeile nur innerhalb
 * einer Zeile.
 *
 * Wird aufgerufen von: `npm test` (node --test).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { leseFeatureStatus, pruefeFeatureAkteInhalt } from './feature-akte-pruefung.ts'

test('leseFeatureStatus: erste Status-Zeile, nicht über ein Zeilenende', () => {
  assert.equal(leseFeatureStatus('## Status\nStatus: ENTWURF\n'), 'ENTWURF')
  assert.equal(leseFeatureStatus('## Status\r\nStatus:\tIN_ARBEIT\r\n'), 'IN_ARBEIT')
  assert.equal(leseFeatureStatus('Status:\nENTWURF\n'), null)
  assert.equal(leseFeatureStatus('kein Status'), null)
})

test('pruefeFeatureAkteInhalt: Status fehlt/unbekannt ⇒ nur dieser Befund', () => {
  assert.deepEqual(pruefeFeatureAkteInhalt('## Ziel\n'), ['Status fehlt oder unbekannt'])
  assert.deepEqual(pruefeFeatureAkteInhalt('Status: UNSINN\n## Datenmodell\n'), ['Status fehlt oder unbekannt'])
})

test('pruefeFeatureAkteInhalt: ENTWURF ohne Abschnitte grün, READY_FOR_TECH verlangt die vier Pflichtabschnitte', () => {
  assert.deepEqual(pruefeFeatureAkteInhalt('Status: ENTWURF\n'), [])
  assert.deepEqual(pruefeFeatureAkteInhalt('Status: READY_FOR_TECH\n## Ziel\nx\n## Nicht-Ziele\n## Akzeptanzkriterien\n'), ['Abschnitt "Dependencies" fehlt (Status: READY_FOR_TECH verlangt ihn)'])
})

test('pruefeFeatureAkteInhalt: leerer optionaler Abschnitt ist ein Befund (wie check-feature)', () => {
  const befunde = pruefeFeatureAkteInhalt('Status: ENTWURF\n\n## Datenmodell\n\n## Ziel\nx\n')
  assert.equal(befunde.length, 1)
  assert.match(befunde[0], /Datenmodell/)
})
