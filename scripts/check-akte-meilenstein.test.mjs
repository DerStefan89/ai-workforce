/**
 * Datei: scripts/check-akte-meilenstein.test.mjs
 *
 * Zweck: node:test für das Gate Akte ↔ Meilenstein (F46 D0, scripts/check-akte-meilenstein.mjs):
 * Grünfall, Rotfälle fehlend (Akte ohne Meilenstein, Roadmap-Eintrag ohne Akte) und doppelt (zwei
 * Meilensteine, zweimal im selben), Ausnahmen (greifen, veraltet, ohne Begründung, ohne ID, doppelt) und der reale
 * Repo-Stand.
 *
 * Wird aufgerufen von: `npm test` (node --test)
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { AUSNAHMEN, leseAktenIds, pruefeAkteMeilenstein } from './check-akte-meilenstein.mjs'

const roadmap = (...meilensteine) => ({ meilensteine: meilensteine.map(([id, features]) => ({ id, features })) })

test('grün: jede Akte genau einmal, jeder Eintrag mit Akte', () => {
  assert.deepEqual(pruefeAkteMeilenstein(['F1', 'F2', 'F3'], roadmap(['M1', ['F1', 'F2']], ['M2', ['F3']]), []), [])
})

test('rot fehlend: Akte ohne Meilenstein', () => {
  const befunde = pruefeAkteMeilenstein(['F1', 'F2'], roadmap(['M1', ['F1']]), [])
  assert.deepEqual(befunde, ['Akte F2 steht in keinem Meilenstein'])
})

test('rot fehlend: Roadmap-Eintrag ohne Akte', () => {
  const befunde = pruefeAkteMeilenstein(['F1'], roadmap(['M1', ['F1', 'F9']]), [])
  assert.deepEqual(befunde, ['Roadmap-Eintrag F9 (M1) hat keine Akte features/F9/feature.md'])
})

test('rot doppelt: Akte in zwei Meilensteinen und zweimal im selben', () => {
  assert.deepEqual(pruefeAkteMeilenstein(['F1'], roadmap(['M1', ['F1']], ['M2', ['F1']]), []), ['Akte F1 steht 2× in der Roadmap (M1, M2) — genau einmal erlaubt'])
  assert.deepEqual(pruefeAkteMeilenstein(['F1'], roadmap(['M1', ['F1', 'F1']]), []), ['Akte F1 steht 2× in der Roadmap (M1, M1) — genau einmal erlaubt'])
})

test('rot doppelt: eine Ausnahme ohne_akte macht einen doppelten Roadmap-Eintrag nicht grün', () => {
  const ausnahmen = [{ id: 'F9', art: 'ohne_akte', grund: 'geplant' }]
  const befunde = pruefeAkteMeilenstein(['F1'], roadmap(['M1', ['F1', 'F9']], ['M2', ['F9']]), ausnahmen)
  assert.deepEqual(befunde, ['Roadmap-Eintrag F9 steht 2× in der Roadmap (M1, M2) — genau einmal erlaubt'])
})

test('Ausnahmen greifen: Akte ohne Meilenstein und Eintrag ohne Akte', () => {
  const ausnahmen = [
    { id: 'AF-1', art: 'ohne_meilenstein', grund: 'Harness' },
    { id: 'F9', art: 'ohne_akte', grund: 'geplant' },
  ]
  assert.deepEqual(pruefeAkteMeilenstein(['F1', 'AF-1'], roadmap(['M1', ['F1', 'F9']]), ausnahmen), [])
})

test('rot: veraltete Ausnahmen und Ausnahme ohne Begründung', () => {
  const ausnahmen = [
    { id: 'F1', art: 'ohne_meilenstein', grund: 'alt' },
    { id: 'F2', art: 'ohne_akte', grund: 'alt' },
    { id: 'F3', art: 'ohne_akte', grund: '' },
  ]
  const befunde = pruefeAkteMeilenstein(['F1', 'F2'], roadmap(['M1', ['F1', 'F2', 'F3']]), ausnahmen)
  assert.deepEqual(befunde, [
    'Ausnahme F3: Begründung fehlt',
    'Ausnahme F1 (ohne_meilenstein) ist veraltet: die Akte steht in einem Meilenstein',
    'Ausnahme F2 (ohne_akte) ist veraltet: die Akte existiert',
  ])
})

test('rot: kaputte Roadmap-Form', () => {
  assert.deepEqual(pruefeAkteMeilenstein(['F1'], {}, []), ['roadmap.json: meilensteine fehlt oder ist keine Liste'])
  const befunde = pruefeAkteMeilenstein(['F1'], { meilensteine: [{ id: 'M1', features: ['F1', 7] }, { id: 'M2' }] }, [])
  assert.deepEqual(befunde, ['Meilenstein M1: Eintrag ist keine Feature-ID (7)', 'Meilenstein M2: features fehlt oder ist keine Liste'])
})

test('rot: Ausnahme ohne ID und doppelte Ausnahme', () => {
  const ausnahmen = [
    { id: 'F9', art: 'ohne_akte', grund: 'geplant' },
    { id: 'F9', art: 'ohne_akte', grund: 'nochmal' },
    { id: '', art: 'ohne_akte', grund: 'ohne ID' },
  ]
  const befunde = pruefeAkteMeilenstein(['F1'], roadmap(['M1', ['F1', 'F9']]), ausnahmen)
  assert.ok(befunde.includes('Ausnahme F9 (ohne_akte) steht doppelt in der Liste'), befunde.join(' | '))
  assert.ok(befunde.some((b) => b.startsWith('Ausnahme ohne ID')), befunde.join(' | '))
})

test('realer Repo-Stand ist grün (Ausnahmen AF-F001, F30 greifen)', () => {
  const echt = JSON.parse(readFileSync('docs/projekt/roadmap.json', 'utf-8'))
  assert.deepEqual(pruefeAkteMeilenstein(leseAktenIds('features'), echt), [])
  assert.deepEqual(AUSNAHMEN.map((a) => a.id), ['AF-F001', 'F30'])
})
