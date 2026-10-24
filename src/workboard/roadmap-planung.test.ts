/**
 * Datei: src/workboard/roadmap-planung.test.ts
 *
 * Zweck: node:test für Zeitachse und Kennzahlen (F45 B5b-1a): Balken aus Schätzungen, „Schätzung fehlt“ ohne Länge,
 * nach_unbekannt, Ist-Zone in Arbeitstagen, abgeschlossene Meilensteine ohne offene Arbeit, R2, R5 (berechenbar/nicht
 * berechenbar inkl. leerer Tabelle), Plan gegen Ist.
 *
 * Wird aufgerufen von: `npm test` (node --test).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { WorkstreamEintrag } from './feature-planung.ts'
import { arbeitstageBis, baueZeitachse, berechneKennzahlen, type PlanungMeilenstein } from './roadmap-planung.ts'

/** Workstream-Zeile. @param id - ID @param teil - Abweichungen @returns Eintrag */
const ws = (id: string, teil: Partial<WorkstreamEintrag> = {}): WorkstreamEintrag => ({ id, art: 'workstream', titel: id, status: 'geplant', schaetzung: { min: 1, max: 2 }, ist: null, begonnen: null, abgenommen: null, notiz: '', ...teil })

test('arbeitstageBis: Wochenende zählt nicht, Richtung', () => {
  assert.equal(arbeitstageBis('2026-10-23', '2026-10-26'), 1) // Fr → Mo
  assert.equal(arbeitstageBis('2026-10-19', '2026-10-23'), 4)
  assert.equal(arbeitstageBis('2026-10-24', '2026-10-24'), 0)
  assert.equal(arbeitstageBis('2026-10-26', '2026-10-23'), -1)
})

test('arbeitstageBis: O(1) stimmt mit Tag-für-Tag-Zählung überein, ferne Daten ohne Schleife über Jahre', () => {
  const brutto = (von: string, bis: string) => {
    let n = 0
    for (let t = Date.parse(`${von}T00:00:00Z`) + 86400000; t <= Date.parse(`${bis}T00:00:00Z`); t += 86400000) if (![0, 6].includes(new Date(t).getUTCDay())) n += 1
    return n
  }
  for (const von of ['2026-09-26', '2026-09-27', '2026-09-28', '2026-10-01', '2026-10-02']) {
    for (const bis of ['2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26', '2026-11-30']) assert.equal(arbeitstageBis(von, bis), brutto(von, bis), `${von}→${bis}`)
  }
  assert.equal(arbeitstageBis('0001-01-01', '9999-12-31') > 2_000_000, true)
  assert.equal(arbeitstageBis('kaputt', '2026-10-24'), 0)
})

test('laeuft zählt mit voller Schätzung, verworfen nicht, UNBEKANNT ohne Daten als Eintrag ohne Schätzung, Formfehler als Zusatzeintrag', () => {
  const meilensteine: PlanungMeilenstein[] = [
    {
      id: 'M1',
      status: 'LAEUFT',
      features: [
        { id: 'F1', status: 'IN_ARBEIT', workstreams: [ws('A', { status: 'laeuft', schaetzung: { min: 0.4, max: 0.5 } }), ws('B', { status: 'verworfen' })] },
        { id: 'F2', status: 'UNBEKANNT', workstreams: null },
        { id: 'F3', status: 'IN_ARBEIT', workstreams: [ws('C')], workstreams_fehlerhaft: true },
      ],
    },
  ]
  const eintraege = baueZeitachse(meilensteine, '2026-10-26')
  assert.deepEqual(
    eintraege.map((e) => [e.feature, e.workstream, e.schaetzung_fehlt]),
    [
      ['F1', 'A', false],
      ['F2', null, true],
      ['F3', 'C', false],
      ['F3', null, true],
    ]
  )
  assert.equal(eintraege[0].ende_max_at, 0.5)
  assert.deepEqual(berechneKennzahlen(meilensteine).bis_fertig[0], { meilenstein: 'M1', berechenbar: false, min: null, max: null, ohne_schaetzung: 2 })
})

test('Zeitachse: Balken aus Schätzungen, Schätzung fehlt ohne Länge, nach_unbekannt', () => {
  const meilensteine: PlanungMeilenstein[] = [
    {
      id: 'M1',
      status: 'LAEUFT',
      features: [
        { id: 'F1', status: 'IN_ARBEIT', workstreams: [ws('A', { schaetzung: { min: 0.4, max: 0.5 } }), ws('B', { schaetzung: null }), ws('C')] },
        { id: 'F2', status: 'ENTWURF', workstreams: null },
      ],
    },
  ]
  const eintraege = baueZeitachse(meilensteine, '2026-10-26')
  assert.deepEqual(eintraege[0], { meilenstein: 'M1', feature: 'F1', workstream: 'A', status: 'geplant', nach_unbekannt: false, schaetzung_fehlt: false, start_at: 0, ende_min_at: 0.4, ende_max_at: 0.5 })
  assert.deepEqual(eintraege[1], { meilenstein: 'M1', feature: 'F1', workstream: 'B', status: 'geplant', nach_unbekannt: false, schaetzung_fehlt: true, fruehestens_ab_at: 0.4 })
  assert.equal('ende_min_at' in eintraege[1], false)
  assert.deepEqual(eintraege[2], { meilenstein: 'M1', feature: 'F1', workstream: 'C', status: 'geplant', nach_unbekannt: true, schaetzung_fehlt: false, start_at: 0.4, ende_min_at: 1.4, ende_max_at: 2.5 })
  assert.deepEqual(eintraege[3], { meilenstein: 'M1', feature: 'F2', workstream: null, status: 'ENTWURF', nach_unbekannt: true, schaetzung_fehlt: true, fruehestens_ab_at: 1.4 })
})

test('Zeitachse: Ist-Zone aus Begonnen, aus Ist oder als Punkt', () => {
  const meilensteine: PlanungMeilenstein[] = [
    {
      id: 'M1',
      status: 'LAEUFT',
      features: [
        {
          id: 'F1',
          status: 'IN_ARBEIT',
          workstreams: [ws('A', { status: 'erledigt', begonnen: '2026-10-19', abgenommen: '2026-10-21' }), ws('B', { status: 'erledigt', ist: 0.5, abgenommen: '2026-10-23' }), ws('C', { status: 'erledigt', abgenommen: '2026-10-23' })],
        },
      ],
    },
  ]
  const ist = baueZeitachse(meilensteine, '2026-10-26').map((e) => [e.workstream, e.ist_start_at, e.ist_ende_at])
  assert.deepEqual(ist, [
    ['A', -5, -3],
    ['B', -1.5, -1],
    ['C', -1, -1],
  ])
})

test('abgeschlossener Meilenstein und abgeschlossene/abgebrochene Features tragen keine offene Arbeit', () => {
  const meilensteine: PlanungMeilenstein[] = [
    { id: 'M1', status: 'ABGESCHLOSSEN', features: [{ id: 'F1', status: 'FEATURE_GATE', workstreams: null }] },
    { id: 'M2', status: 'LAEUFT', features: [{ id: 'F2', status: 'ABGESCHLOSSEN', workstreams: [ws('A')] }, { id: 'F3', status: 'ABGEBROCHEN', workstreams: null }, { id: 'F4', status: 'IN_ARBEIT', workstreams: [ws('B')] }] },
  ]
  assert.deepEqual(
    baueZeitachse(meilensteine, '2026-10-26').map((e) => e.workstream),
    ['B']
  )
  assert.deepEqual(berechneKennzahlen(meilensteine).bis_fertig, [{ meilenstein: 'M2', berechenbar: true, min: 1, max: 2, ohne_schaetzung: 0 }])
})

test('Kennzahlen: R2 gegen die Akten, R5 nicht berechenbar bei fehlender Schätzung (auch leere Tabelle), Plan gegen Ist', () => {
  const meilensteine: PlanungMeilenstein[] = [
    { id: 'M1', status: 'ABGESCHLOSSEN', features: [{ id: 'F1', status: 'ABGESCHLOSSEN', workstreams: null }, { id: 'F2', status: 'FEATURE_GATE', workstreams: null }] },
    {
      id: 'M5',
      status: 'LAEUFT',
      features: [
        { id: 'F3', status: 'IN_ARBEIT', workstreams: [ws('A', { status: 'erledigt', schaetzung: { min: 0.3, max: 0.4 }, ist: 0.5, abgenommen: '2026-10-20' }), ws('B', { schaetzung: { min: 0.5, max: 1 } })] },
        { id: 'F30', status: 'ENTWURF', workstreams: [] },
      ],
    },
    { id: 'V1', status: 'GEPLANT', features: [{ id: 'F4', status: 'keine_akte', workstreams: null }] },
  ]
  const k = berechneKennzahlen(meilensteine)
  assert.deepEqual(k.meilensteine, { abgeschlossen: 1, gesamt: 3, mit_abweichung: 1 })
  assert.deepEqual(k.features_abgenommen, { abgenommen: 1, gesamt: 5 })
  assert.deepEqual(k.bis_fertig, [
    { meilenstein: 'M5', berechenbar: false, min: null, max: null, ohne_schaetzung: 1 },
    { meilenstein: 'V1', berechenbar: false, min: null, max: null, ohne_schaetzung: 2 },
  ])
  assert.deepEqual(k.plan_gegen_ist, { anzahl: 1, plan_min: 0.3, plan_max: 0.4, ist: 0.5, eintraege: [{ feature: 'F3', workstream: 'A', plan: { min: 0.3, max: 0.4 }, ist: 0.5 }] })
})
