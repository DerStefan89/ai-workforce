/**
 * Datei: public/leitstand/attention-daten.test.mjs
 *
 * Zweck: node:test für baueEntscheidungen (attention-daten.js, F44 WS-2a): Auswahl über die
 * bestehenden Filterregeln, Reihenfolge Freigabe → Rückfrage → Lauf → Startproblem → Befund
 * (P0 vor P1), menschenlesbare Titel mit Rückfall auf die ID, Navigationsziele, Startprobleme
 * ohne Link, defekte (null) und ladende (undefined) Quellen, Leerzustand nur bei vier echt
 * leeren Quellen.
 *
 * Wird aufgerufen von: npm run check (node --test)
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { baueEntscheidungen } from './attention-daten.js'

const ZUSTAND = {
  workflows: [
    { workflowId: 'wf-k', ziel: 'Fehlertexte klären', grund: 'Welche Meldung zuerst?', naechster: { art: 'haltKlaerung' } },
    { workflowId: 'wf-f', ziel: '  ', grund: null, naechster: { art: 'haltFreigabe' } },
    { workflowId: 'wf-x', ziel: 'Läuft', naechster: { art: 'weiter' } },
  ],
  laeufe: [
    { laufId: 'l-1', ergebnis: 'FEHLGESCHLAGEN', kenntnisgenommen: false, auftragsbezug: { titel: 'Browser-Prüfung' }, zeitpunkt: '2026-09-30T10:00:00Z' },
    { laufId: 'l-2', ergebnis: 'FEHLGESCHLAGEN', kenntnisgenommen: true, auftragsbezug: null },
    { laufId: 'l-3', ergebnis: 'FEHLGESCHLAGEN', kenntnisgenommen: false, auftragsbezug: null },
  ],
  startfehler: [{ zeitstempel: '2026-09-30T09:00:00Z', laufId: 'l-9', fehler: 'Start <abgelehnt>' }],
}

const WORKITEMS = [
  { id: 'F-2', prioritaet: 'P1', titel: 'Zweitens' },
  { id: 'F-1', prioritaet: 'P0', titel: 'Erstens' },
  { id: 'F-3', prioritaet: 'P1', titel: '' },
]

test('Reihenfolge, Titel, Ziele und Startprobleme ohne Link', () => {
  const { eintraege, zaehler, defekt, alleLeer } = baueEntscheidungen(ZUSTAND, WORKITEMS)
  assert.deepEqual(
    eintraege.map((e) => [e.art, e.id, e.titel, e.hash]),
    [
      ['freigabe', 'wf-f', 'wf-f', '#/workflows/wf-f'],
      ['rueckfrage', 'wf-k', 'Fehlertexte klären', '#/workflows/wf-k'],
      ['lauf', 'l-1', 'Browser-Prüfung', '#/runs/l-1'],
      ['lauf', 'l-3', 'l-3', '#/runs/l-3'],
      ['startproblem', 'l-9', 'l-9', null],
      ['befund', 'F-1', 'Erstens', '#/workboard/F-1'],
      ['befund', 'F-2', 'Zweitens', '#/workboard/F-2'],
      ['befund', 'F-3', 'F-3', '#/workboard/F-3'],
    ]
  )
  const startproblem = eintraege.find((e) => e.art === 'startproblem')
  assert.equal(startproblem.zeitstempel, '2026-09-30T09:00:00Z')
  assert.equal(startproblem.fehler, 'Start <abgelehnt>')
  assert.equal(eintraege[1].satz, 'Welche Meldung zuerst?')
  assert.equal(eintraege[0].satz, null)
  assert.deepEqual(zaehler, { workflows: 2, laeufe: 2, startfehler: 1, workitems: 3 })
  assert.equal(defekt, false)
  assert.equal(alleLeer, false)
})

test('IDs werden im Ziel kodiert', () => {
  const { eintraege } = baueEntscheidungen({ workflows: [{ workflowId: 'a/b c', naechster: { art: 'haltFreigabe' } }], laeufe: [], startfehler: [] }, [])
  assert.equal(eintraege[0].hash, '#/workflows/a%2Fb%20c')
})

test('defekte Quelle ist null und nie leer; ladende Workitems sind undefined', () => {
  const defekt = baueEntscheidungen({ workflows: null, laeufe: [], startfehler: [] }, [])
  assert.equal(defekt.gruppen.workflows, null)
  assert.equal(defekt.zaehler.workflows, null)
  assert.equal(defekt.defekt, true)
  assert.equal(defekt.alleLeer, false)

  const workitemsDefekt = baueEntscheidungen({ workflows: [], laeufe: [], startfehler: [] }, null)
  assert.equal(workitemsDefekt.defekt, true)
  assert.equal(workitemsDefekt.alleLeer, false)

  const laedt = baueEntscheidungen({ workflows: [], laeufe: [], startfehler: [] }, undefined)
  assert.equal(laedt.gruppen.workitems, undefined)
  assert.equal(laedt.defekt, false)
  assert.equal(laedt.alleLeer, false)
})

test('vor dem ersten Poll-Tick: Aggregat-Quellen laden (undefined)', () => {
  const vorTick = baueEntscheidungen(null, [])
  assert.equal(vorTick.gruppen.workflows, undefined)
  assert.equal(vorTick.alleLeer, false)
  assert.equal(vorTick.defekt, false)
})

test('Leerzustand nur, wenn alle vier Quellen echt leer sind', () => {
  const leer = baueEntscheidungen({ workflows: [{ workflowId: 'w', naechster: { art: 'weiter' } }], laeufe: [], startfehler: [] }, [])
  assert.equal(leer.alleLeer, true)
  assert.deepEqual(leer.eintraege, [])
})

test('Aggregat ohne Quellen (z. B. Fehlerkörper { grund }) zählt als defekt, nie als leer', () => {
  const ergebnis = baueEntscheidungen({ grund: 'kaputt' }, [])
  assert.equal(ergebnis.gruppen.workflows, null)
  assert.equal(ergebnis.gruppen.laeufe, null)
  assert.equal(ergebnis.gruppen.startfehler, null)
  assert.equal(ergebnis.defekt, true)
  assert.equal(ergebnis.alleLeer, false)
})

test('einzelne defekte Poll-Quellen: laeufe null, startfehler null', () => {
  const laeufe = baueEntscheidungen({ workflows: [], laeufe: null, startfehler: [] }, [])
  assert.equal(laeufe.gruppen.laeufe, null)
  assert.equal(laeufe.defekt, true)
  const startfehler = baueEntscheidungen({ workflows: [], laeufe: [], startfehler: null }, [])
  assert.equal(startfehler.gruppen.startfehler, null)
  assert.equal(startfehler.defekt, true)
})

test('gemischte Freigaben und Rückfragen: alle Freigaben zuerst, sonst Reihenfolge der Quelle', () => {
  const w = (id, art) => ({ workflowId: id, naechster: { art } })
  const { eintraege } = baueEntscheidungen({ workflows: [w('K1', 'haltKlaerung'), w('F1', 'haltFreigabe'), w('K2', 'haltKlaerung'), w('F2', 'haltFreigabe')], laeufe: [], startfehler: [] }, [])
  assert.deepEqual(
    eintraege.map((e) => e.id),
    ['F1', 'F2', 'K1', 'K2']
  )
})

test('laufId und Workitem-ID werden im Ziel kodiert; Startfehler ohne Zeitstempel/Fehler → null', () => {
  const { eintraege } = baueEntscheidungen(
    { workflows: [], laeufe: [{ laufId: 'l/1 x', ergebnis: 'FEHLGESCHLAGEN', kenntnisgenommen: false }], startfehler: [{ laufId: 's-1' }] },
    [{ id: 'F-1?x', prioritaet: 'P0', titel: 't' }]
  )
  assert.equal(eintraege[0].hash, '#/runs/l%2F1%20x')
  assert.equal(eintraege[1].zeitstempel, null)
  assert.equal(eintraege[1].fehler, null)
  assert.equal(eintraege[2].hash, '#/workboard/F-1%3Fx')
})
