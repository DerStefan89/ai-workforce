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
import { baueEntscheidungen, baueReferenzJeAuftrag, passtZuFilter, zaehleJeFilter, zaehleOffeneEntscheidungen } from './attention-daten.js'

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
  assert.deepEqual(zaehler, { workflows: 2, abnahmen: 0, laeufe: 2, startfehler: 1, workitems: 3 })
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

// ─── F46 D2: Abnahmen, Filter, „Zum Eintrag“, Zahl am Navigationspunkt ─────

const MIT_ABNAHME = {
  workflows: [
    { workflowId: 'wf-k', auftragId: 'a-k', naechster: { art: 'haltKlaerung' }, abnahme: { offen: false, status: 'nicht_faellig' } },
    { workflowId: 'wf-a', auftragId: 'a-a', ziel: 'Design-Schnitt', naechster: { art: 'fertig' }, abnahme: { offen: true, status: 'veraltet' } },
    { workflowId: 'wf-z', naechster: { art: 'fertig' }, abnahme: { offen: false, status: 'ok' } },
    { workflowId: 'wf-f', auftragId: 'a-f', naechster: { art: 'haltFreigabe' } },
  ],
  laeufe: [{ laufId: 'l-1', ergebnis: 'FEHLGESCHLAGEN', kenntnisgenommen: false, auftragsbezug: { auftragId: 'a-a', titel: 'Bau' } }],
  startfehler: [{ laufId: 's-1' }],
}

test('Abnahme: nur abnahme.offen, eigene Gruppe nach den Rückfragen, Ziel #/workflows/<id>', () => {
  const ergebnis = baueEntscheidungen(MIT_ABNAHME, [{ id: 'F-1', prioritaet: 'P0' }])
  assert.deepEqual(
    ergebnis.eintraege.map((e) => [e.art, e.id]),
    [
      ['freigabe', 'wf-f'],
      ['rueckfrage', 'wf-k'],
      ['abnahme', 'wf-a'],
      ['lauf', 'l-1'],
      ['startproblem', 's-1'],
      ['befund', 'F-1'],
    ]
  )
  const abnahme = ergebnis.gruppen.abnahmen[0]
  assert.equal(abnahme.titel, 'Design-Schnitt')
  assert.equal(abnahme.hash, '#/workflows/wf-a')
  assert.equal(abnahme.abnahmeStatus, 'veraltet')
  assert.equal(ergebnis.zaehler.abnahmen, 1)
})

test('Abnahme: defekte Workflows-Quelle macht auch die Abnahmen defekt', () => {
  const ergebnis = baueEntscheidungen({ workflows: null, laeufe: [], startfehler: [] }, [])
  assert.equal(ergebnis.gruppen.abnahmen, null)
  assert.equal(zaehleJeFilter(ergebnis).get('abnahme'), null)
})

test('Filter: Zahlen je Chip, Fehler = Lauf + Startproblem, Sichern ohne Zahl', () => {
  const ergebnis = baueEntscheidungen(MIT_ABNAHME, [{ id: 'F-1', prioritaet: 'P1' }])
  const zahlen = Object.fromEntries(zaehleJeFilter(ergebnis))
  assert.deepEqual(zahlen, { alle: 6, freigabe: 1, abnahme: 1, sichern: undefined, rueckfrage: 1, fehler: 2, befund: 1 })
  const fehler = ergebnis.eintraege.filter((e) => passtZuFilter(e, 'fehler')).map((e) => e.art)
  assert.deepEqual(fehler, ['lauf', 'startproblem'])
  assert.equal(ergebnis.eintraege.every((e) => passtZuFilter(e, 'alle')), true)
  assert.equal(ergebnis.eintraege.some((e) => passtZuFilter(e, 'sichern')), false)
})

test('Filter: ladende Workitems → „Alle“ und „Befunde“ ohne Zahl, die übrigen gezählt', () => {
  const zahlen = Object.fromEntries(zaehleJeFilter(baueEntscheidungen(MIT_ABNAHME, undefined)))
  assert.equal(zahlen.alle, undefined)
  assert.equal(zahlen.befund, undefined)
  assert.equal(zahlen.freigabe, 1)
})

test('„Zum Eintrag“: Workitem-Referenz des Auftrags → #/workboard/<id>, sonst null', () => {
  const referenzen = baueReferenzJeAuftrag([
    { auftragId: 'a-a', workitem_referenz: 'workitem:roadmap:F46' },
    { auftragId: 'a-f', workitem_referenz: 'kaputt' },
    { auftragId: 'a-k' },
  ])
  const { eintraege } = baueEntscheidungen(MIT_ABNAHME, [], referenzen)
  const ziel = Object.fromEntries(eintraege.map((e) => [e.id, e.eintragHash]))
  assert.deepEqual(ziel, { 'wf-f': null, 'wf-k': null, 'wf-a': '#/workboard/F46', 'l-1': '#/workboard/F46', 's-1': null })
  assert.equal(baueReferenzJeAuftrag(null), null)
  assert.equal(baueEntscheidungen(MIT_ABNAHME, []).eintraege[0].eintragHash, null)
})

test('Zahl am Navigationspunkt: Poll-Quellen ohne Befunde, null bei Defekt oder vor dem ersten Tick', () => {
  assert.equal(zaehleOffeneEntscheidungen(MIT_ABNAHME), 5)
  assert.equal(zaehleOffeneEntscheidungen(null), null)
  assert.equal(zaehleOffeneEntscheidungen({ workflows: [], laeufe: null, startfehler: [] }), null)
  assert.equal(zaehleOffeneEntscheidungen({ workflows: [], laeufe: [], startfehler: [] }), 0)
})
