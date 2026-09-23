/**
 * Datei: src/workboard/feature-abschnitte.test.ts
 *
 * Zweck: Rot-/Grünfälle für pruefeOptionaleAbschnitte (F39 WS-3a, Auftrags-Vorgabe Punkt 3).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { OPTIONALE_ABSCHNITTE, pruefeOptionaleAbschnitte } from './feature-abschnitte.ts'

test('pruefeOptionaleAbschnitte: eine Akte ganz ohne die neun Abschnitte bleibt gültig (Rückwärtskompatibilität)', () => {
  const inhalt = ['# Feature X', '', 'Status: ENTWURF', '', '## Ziel', '', 'Ein Ziel.', ''].join('\n')
  assert.deepEqual(pruefeOptionaleAbschnitte(inhalt), [])
})

test('pruefeOptionaleAbschnitte (Grünfall): ein vorhandener Abschnitt mit echtem Inhalt ist gültig', () => {
  const inhalt = ['Status: ENTWURF', '', '## Datenmodell', '', 'Ein Feld `x: string`.', '', '## Nächster Abschnitt', 'x'].join('\n')
  assert.deepEqual(pruefeOptionaleAbschnitte(inhalt), [])
})

test('pruefeOptionaleAbschnitte (Rotfall): ein vorhandener, aber leerer Abschnitt (nur Whitespace bis zur nächsten Überschrift) wird gemeldet', () => {
  const inhalt = ['Status: ENTWURF', '', '## Datenmodell', '', '   ', '', '## Nächster Abschnitt', 'x'].join('\n')
  const befunde = pruefeOptionaleAbschnitte(inhalt)
  assert.equal(befunde.length, 1)
  assert.match(befunde[0], /"Datenmodell".*leer/)
})

test('pruefeOptionaleAbschnitte (Rotfall): ein vorhandener, aber leerer Abschnitt am Dateiende (kein nachfolgender Abschnitt) wird ebenfalls gemeldet', () => {
  const inhalt = ['Status: ENTWURF', '', '## Migration', ''].join('\n')
  const befunde = pruefeOptionaleAbschnitte(inhalt)
  assert.equal(befunde.length, 1)
  assert.match(befunde[0], /"Migration".*leer/)
})

test('pruefeOptionaleAbschnitte: meldet mehrere leere Abschnitte gleichzeitig, einen pro Fund', () => {
  const inhalt = ['Status: ENTWURF', '', '## Architekturentscheidung', '', '## Migration', '', '## Security/Permissions', '', 'echter Inhalt', ''].join('\n')
  const befunde = pruefeOptionaleAbschnitte(inhalt)
  assert.equal(befunde.length, 2)
  assert.ok(befunde.some((b) => b.includes('"Architekturentscheidung"')))
  assert.ok(befunde.some((b) => b.includes('"Migration"')))
})

test('OPTIONALE_ABSCHNITTE trägt alle neun benannten Abschnitte', () => {
  assert.deepEqual(OPTIONALE_ABSCHNITTE, [
    'Architekturentscheidung',
    'Komponenten/Module',
    'Datenmodell',
    'Interfaces/Contracts',
    'State/Persistenz',
    'Security/Permissions',
    'Datenflüsse',
    'Migration',
    'Red-/Green-Cases',
  ])
})
