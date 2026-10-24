/**
 * Datei: src/workboard/roadmap-regeln.test.ts
 *
 * Zweck: node:test für die Status-Regel R1 (F45 B5b-1a): Verstoß ohne Ausnahme, Ausnahme greift, verwaiste Ausnahmen,
 * Ausnahmen-Datei (fehlt, kaputt, Grund fehlt, doppelt, fremde Felder).
 *
 * Wird aufgerufen von: `npm test` (node --test).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { leseStatusAusnahmen, pruefeMeilensteinStatus } from './roadmap-regeln.ts'

const roadmap = {
  meilensteine: [
    { id: 'M1', status: 'ABGESCHLOSSEN', features: ['F1', 'F2'] },
    { id: 'M2', status: 'LAEUFT', features: ['F3'] },
  ],
}
const status = new Map([
  ['F1', 'ABGESCHLOSSEN'],
  ['F2', 'FEATURE_GATE'],
  ['F3', 'IN_ARBEIT'],
])

test('R1 rot: Feature eines abgeschlossenen Meilensteins nicht ABGESCHLOSSEN, ohne Ausnahme', () => {
  const ergebnis = pruefeMeilensteinStatus(roadmap, status, [])
  assert.equal(ergebnis.befunde.length, 1)
  assert.match(ergebnis.befunde[0], /M1 ist ABGESCHLOSSEN, Feature F2 steht auf FEATURE_GATE/)
  assert.deepEqual(ergebnis.abweichungen, [{ meilenstein: 'M1', feature: 'F2', featureStatus: 'FEATURE_GATE', ausnahme: null }])
})

test('R1 grün mit begründeter Ausnahme; Abweichung bleibt sichtbar', () => {
  const ausnahme = { meilenstein: 'M1', feature: 'F2', grund: 'offen' }
  const ergebnis = pruefeMeilensteinStatus(roadmap, status, [ausnahme])
  assert.deepEqual(ergebnis.befunde, [])
  assert.equal(ergebnis.abweichungen[0].ausnahme, ausnahme)
})

test('verwaiste Ausnahmen sind Befunde', () => {
  const befunde = pruefeMeilensteinStatus(roadmap, status, [
    { meilenstein: 'M1', feature: 'F2', grund: 'offen' },
    { meilenstein: 'M1', feature: 'F1', grund: 'Feature fertig' },
    { meilenstein: 'M2', feature: 'F3', grund: 'Meilenstein offen' },
    { meilenstein: 'M1', feature: 'F3', grund: 'falscher Meilenstein' },
    { meilenstein: 'M9', feature: 'F2', grund: 'unbekannt' },
  ]).befunde
  assert.deepEqual(befunde, [
    'Ausnahme M1/F1 ist veraltet: Feature ist ABGESCHLOSSEN',
    'Ausnahme M2/F3 ist veraltet: Meilenstein steht auf LAEUFT',
    'Ausnahme M1/F3 ist veraltet: Feature steht nicht in diesem Meilenstein',
    'Ausnahme M9/F2 ist veraltet: Meilenstein unbekannt',
  ])
})

test('leseStatusAusnahmen: fehlende Datei, gültig, kaputt, Grund fehlt, doppelt, fremd', () => {
  assert.deepEqual(leseStatusAusnahmen(null), { ausnahmen: [], befunde: [] })
  const gueltig = leseStatusAusnahmen(JSON.stringify({ schema: 'v0', status_ausnahmen: [{ meilenstein: 'M1', feature: 'F2', grund: 'g' }] }))
  assert.deepEqual(gueltig, { ausnahmen: [{ meilenstein: 'M1', feature: 'F2', grund: 'g' }], befunde: [] })
  assert.match(leseStatusAusnahmen('{').befunde[0], /JSON nicht lesbar/)
  const fehler = leseStatusAusnahmen(
    JSON.stringify({
      schema: 'v1',
      x: 1,
      status_ausnahmen: [{ meilenstein: 'M1', feature: 'F2', grund: ' ' }, { meilenstein: 'M1', feature: 'F3', grund: 'g' }, { meilenstein: 'M1', feature: 'F3', grund: 'g' }, { meilenstein: 'M1', feature: 'F4', grund: 'g', y: 2 }],
    })
  ).befunde
  for (const teil of ['unbekannte Felder x', "schema muss 'v0'", 'Begründung fehlt', 'steht doppelt', 'unbekannte Felder y']) assert.ok(fehler.some((b) => b.includes(teil)), `${teil}: ${fehler.join(' | ')}`)
})
