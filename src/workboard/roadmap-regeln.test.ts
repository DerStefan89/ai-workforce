/**
 * Datei: src/workboard/roadmap-regeln.test.ts
 *
 * Zweck: node:test für die Status-Regel R1 (F45 B5b-1a): Verstoß ohne Ausnahme, Ausnahme greift, verwaiste Ausnahmen,
 * Ausnahmen-Datei (fehlt, kaputt, Grund fehlt, doppelt, fremde Felder). Seit F45 B5b-1b-2: neueR1Befunde (Altbefund grün, neuer
 * Befund rot, verschiedene Ausnahmen), bereinigungsEintraege (B4 dynamisch, ABGEBROCHEN/ohne Akte), pruefeEintrag.
 *
 * Wird aufgerufen von: `npm test` (node --test).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FEATURE_ID_MUSTER } from '../projektkontext/index.ts'
import { bereinigungsEintraege, leseStatusAusnahmen, neueR1Befunde, pruefeEintrag, pruefeMeilensteinStatus } from './roadmap-regeln.ts'

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

test('neueR1Befunde: Altbefund blockiert nicht, neuer Befund schon, Ausnahmen dürfen sich unterscheiden', () => {
  const alt = { roadmap, aktenStatus: status, ausnahmen: [] }
  assert.deepEqual(neueR1Befunde(alt, alt), [])
  const mitF3 = { meilensteine: [roadmap.meilensteine[0], { id: 'M2', status: 'ABGESCHLOSSEN', features: ['F3'] }] }
  const neu = neueR1Befunde(alt, { roadmap: mitF3, aktenStatus: status, ausnahmen: [] })
  assert.equal(neu.length, 1)
  assert.match(neu[0], /F3/)
  const ausnahme = { meilenstein: 'M1', feature: 'F2', grund: 'g' }
  const abgeschlossen = new Map([...status, ['F2', 'ABGESCHLOSSEN']])
  assert.deepEqual(neueR1Befunde({ ...alt, ausnahmen: [ausnahme] }, { roadmap, aktenStatus: abgeschlossen, ausnahmen: [] }), [])
  assert.equal(neueR1Befunde({ ...alt, ausnahmen: [ausnahme] }, { roadmap, aktenStatus: abgeschlossen, ausnahmen: [ausnahme] }).length, 1)
})

test('bereinigungsEintraege: LAEUFT nur bei genau einer Abweichung, ABGESCHLOSSEN nicht bei ABGEBROCHEN oder ohne Akte', () => {
  const zwei = { meilensteine: [{ id: 'M1', status: 'ABGESCHLOSSEN', features: ['F1', 'F2', 'F4'] }, { id: 'M3', status: 'ABGESCHLOSSEN', features: ['F5'] }] }
  const st = new Map([
    ['F1', 'ABGESCHLOSSEN'],
    ['F2', 'FEATURE_GATE'],
    ['F4', 'ABGEBROCHEN'],
  ])
  const eintraege = bereinigungsEintraege(pruefeMeilensteinStatus(zwei, st, []).abweichungen)
  const art = (id: string) => eintraege.find((e) => e.eintrag === id)?.vorschlaege.map((v) => v.entscheidung)
  assert.deepEqual(art('M1/F2'), ['feature_abgeschlossen'])
  assert.deepEqual(art('M1/F4'), [])
  assert.deepEqual(art('M3/F5'), ['meilenstein_laeuft'])
  assert.match(eintraege[0].vorschlaege[0].text, /heute FEATURE_GATE/)
  const einzeln = bereinigungsEintraege(pruefeMeilensteinStatus(zwei, new Map([...st, ['F4', 'ABGESCHLOSSEN']]), []).abweichungen)
  assert.deepEqual(einzeln[0].vorschlaege.map((v) => v.entscheidung), ['feature_abgeschlossen', 'meilenstein_laeuft'])
})

test('pruefeEintrag: genau ein Eintrag <M>/<F>', () => {
  assert.deepEqual(pruefeEintrag('M4/F20', FEATURE_ID_MUSTER), { meilenstein: 'M4', feature: 'F20' })
  for (const falsch of ['M4/F20/x', 'M4', '/F20', 'M4/X1', 'M\n4/F20', ['M4/F20'], null]) assert.equal(pruefeEintrag(falsch, FEATURE_ID_MUSTER), null)
})

test('bereinigungsEintraege: Anzahl je Meilenstein (qa 1); Meilenstein-ID mit / ohne Vorschlag (qa 3)', () => {
  const r = { meilensteine: [{ id: 'M4', status: 'ABGESCHLOSSEN', features: ['F20', 'F21'] }, { id: 'A/B', status: 'ABGESCHLOSSEN', features: ['F22'] }] }
  const st = new Map([
    ['F20', 'FEATURE_GATE'],
    ['F21', 'FEATURE_GATE'],
    ['F22', 'FEATURE_GATE'],
  ])
  const eintraege = bereinigungsEintraege(pruefeMeilensteinStatus(r, st, []).abweichungen)
  assert.deepEqual(eintraege.map((e) => e.abweichungen_im_meilenstein), [2, 2, 1])
  assert.deepEqual(eintraege[2].vorschlaege, [])
})
