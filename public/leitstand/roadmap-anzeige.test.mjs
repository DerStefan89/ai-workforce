/**
 * Datei: public/leitstand/roadmap-anzeige.test.mjs
 *
 * Zweck: node:test für die reinen Roadmap-Anzeigeregeln (roadmap-anzeige.js, F44 WS-2a):
 * Anzeigezustand (F-854: ein Serverfehler ist nie „keine Roadmap“), aktueller Meilenstein,
 * Zähler, Statuskategorie, offene/eingeklappte Meilensteine und „Noch nicht eingeplant“.
 *
 * Wird aufgerufen von: npm run check (node --test)
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { aktuellerMeilenstein, meilensteinOffen, nichtEingeplant, roadmapZustand, STATUS_KATEGORIEN, STATUS_SYMBOL, statusKategorie, waehleEntwicklungsstand, zaehleGeplant, zaehleMeilenstein } from './roadmap-anzeige.js'

/** Baut eine gültige Projektion aus [id, status, features[]]-Tripeln. */
function roadmap(...meilensteine) {
  return { status: 'ok', vision: 'v', meilensteine: meilensteine.map(([id, status, features = []]) => ({ id, titel: `Titel ${id}`, status, features })) }
}

test('roadmapZustand: drei Fachergebnisse, alles andere ist Fehler (F-854)', () => {
  assert.equal(roadmapZustand(null), 'laedt')
  assert.equal(roadmapZustand({ status: 'nicht_vorhanden' }), 'nicht_vorhanden')
  assert.equal(roadmapZustand({ status: 'ungueltig', fehler: ['x'] }), 'ungueltig')
  assert.equal(roadmapZustand(roadmap(['M1', 'GEPLANT'])), 'ok')
  assert.equal(roadmapZustand({ status: 'fehler' }), 'fehler')
  // Ein 404/500-Körper ohne bekannten status darf nie als leer oder ok gelten.
  assert.equal(roadmapZustand({ grund: "Unbekanntes Projekt 'x'" }), 'fehler')
  assert.equal(roadmapZustand({ status: 'ungueltig' }), 'fehler')
  assert.equal(roadmapZustand({ status: 'ok', meilensteine: [{ id: 'M1' }] }), 'fehler')
  assert.equal(roadmapZustand('text'), 'fehler')
})

test('aktuellerMeilenstein: erster LAEUFT, sonst erster nicht abgeschlossener, sonst null', () => {
  assert.equal(aktuellerMeilenstein(roadmap(['M1', 'ABGESCHLOSSEN'], ['M2', 'GEPLANT'], ['M3', 'LAEUFT'])).id, 'M3')
  assert.equal(aktuellerMeilenstein(roadmap(['M1', 'ABGESCHLOSSEN'], ['M2', 'GEPLANT'], ['M3', 'GEPLANT'])).id, 'M2')
  assert.equal(aktuellerMeilenstein(roadmap(['M1', 'ABGESCHLOSSEN'])), null)
  assert.equal(aktuellerMeilenstein({ status: 'nicht_vorhanden' }), null)
  assert.equal(aktuellerMeilenstein(null), null)
})

test('zaehleMeilenstein: abgenommen = ABGESCHLOSSEN, gesamt inklusive keine_akte', () => {
  const m = { features: [{ id: 'F1', status: 'ABGESCHLOSSEN' }, { id: 'F2', status: 'IN_ARBEIT' }, { id: 'F3', status: 'keine_akte' }] }
  assert.deepEqual(zaehleMeilenstein(m), { abgenommen: 1, gesamt: 3 })
  assert.deepEqual(zaehleMeilenstein({ features: [] }), { abgenommen: 0, gesamt: 0 })
  assert.deepEqual(zaehleMeilenstein(undefined), { abgenommen: 0, gesamt: 0 })
})

test('statusKategorie: bekannte Werte je Kategorie, Unbekanntes → unbekannt', () => {
  assert.equal(statusKategorie('ABGESCHLOSSEN'), 'abgenommen')
  assert.equal(statusKategorie('FEATURE_GATE'), 'freigabe')
  assert.equal(statusKategorie('LAEUFT'), 'in_arbeit')
  assert.equal(statusKategorie('IN_ARBEIT'), 'in_arbeit')
  assert.equal(statusKategorie('BLOCKIERT'), 'klaerung')
  assert.equal(statusKategorie('ENTWURF'), 'geplant')
  assert.equal(statusKategorie('GEPLANT'), 'geplant')
  assert.equal(statusKategorie('ABGEBROCHEN'), 'abgebrochen')
  assert.equal(statusKategorie('keine_akte'), 'ohne_akte')
  assert.equal(statusKategorie('UNBEKANNT'), 'unbekannt')
  assert.equal(statusKategorie('toString'), 'unbekannt')
  assert.equal(statusKategorie(undefined), 'unbekannt')
  for (const kategorie of ['abgenommen', 'freigabe', 'in_arbeit', 'klaerung', 'geplant', 'abgebrochen', 'ohne_akte', 'unbekannt']) assert.ok(STATUS_KATEGORIEN.includes(kategorie))
})

test('meilensteinOffen: abgeschlossene vor dem aktuellen eingeklappt, aktueller und spätere offen', () => {
  const r = roadmap(['M1', 'ABGESCHLOSSEN'], ['M2', 'LAEUFT'], ['M3', 'GEPLANT'], ['M4', 'ABGESCHLOSSEN'])
  const [m1, m2, m3, m4] = r.meilensteine
  assert.equal(meilensteinOffen(r, m1), false)
  assert.equal(meilensteinOffen(r, m2), true)
  assert.equal(meilensteinOffen(r, m3), true)
  assert.equal(meilensteinOffen(r, m4), true)
  const alleFertig = roadmap(['M1', 'ABGESCHLOSSEN'], ['M2', 'ABGESCHLOSSEN'])
  assert.equal(meilensteinOffen(alleFertig, alleFertig.meilensteine[1]), false)
})

test('nichtEingeplant: Features ohne Meilenstein; nicht prüfbar → null', () => {
  const r = roadmap(['M1', 'LAEUFT', [{ id: 'F1', status: 'IN_ARBEIT' }]], ['M2', 'GEPLANT', [{ id: 'F2', status: 'ENTWURF' }]])
  const features = [{ id: 'F1' }, { id: 'F2' }, { id: 'F9', titel: 'Neu' }]
  assert.deepEqual(nichtEingeplant(r, features), [{ id: 'F9', titel: 'Neu' }])
  assert.deepEqual(nichtEingeplant(r, [{ id: 'F1' }]), [])
  assert.deepEqual(nichtEingeplant({ status: 'nicht_vorhanden' }, features), features)
  assert.equal(nichtEingeplant({ status: 'ungueltig', fehler: [] }, features), null)
  assert.equal(nichtEingeplant({ status: 'fehler' }, features), null)
  assert.equal(nichtEingeplant(r, null), null)
})

test('Randfälle: undefined lädt, leere Meilensteinliste ist ok, null-Meilenstein ist Fehler', () => {
  assert.equal(roadmapZustand(undefined), 'laedt')
  assert.equal(roadmapZustand({ status: 'ok', meilensteine: [] }), 'ok')
  assert.equal(roadmapZustand({ status: 'ok', meilensteine: [null] }), 'fehler')
  assert.equal(roadmapZustand({ status: 'ungueltig', fehler: [] }), 'ungueltig')
})

test('nichtEingeplant während die Roadmap lädt → null (nicht prüfbar)', () => {
  assert.equal(nichtEingeplant(null, [{ id: 'F1' }]), null)
})

test('ein geplanter Meilenstein vor dem laufenden bleibt offen', () => {
  const r = roadmap(['M1', 'GEPLANT'], ['M2', 'LAEUFT'])
  assert.equal(meilensteinOffen(r, r.meilensteine[0]), true)
  assert.equal(aktuellerMeilenstein(r).id, 'M2')
})

test('F-895: nichtEingeplant zeigt nur offene Features mit einer ID nach der Roadmap-Regel', () => {
  const r = roadmap(['M1', 'LAEUFT', [{ id: 'F1', status: 'IN_ARBEIT' }]])
  const features = [
    { id: 'F2', status: 'ENTWURF' },
    { id: 'F3b', status: 'IN_ARBEIT' },
    { id: 'F4', status: 'ABGESCHLOSSEN' },
    { id: 'F5', status: 'ABGEBROCHEN' },
    { id: 'AF-F001', status: 'ENTWURF' },
    { id: 'f6', status: 'ENTWURF' },
    { id: 'F1', status: 'IN_ARBEIT' },
  ]
  assert.deepEqual(
    nichtEingeplant(r, features).map((f) => f.id),
    ['F2', 'F3b']
  )
  assert.deepEqual(
    nichtEingeplant({ status: 'nicht_vorhanden' }, features).map((f) => f.id),
    ['F2', 'F3b', 'F1']
  )
})

test('B5 (F-904): zaehleGeplant zählt nur ENTWURF und READY_FOR_TECH', () => {
  const m = {
    features: [
      { id: 'F1', status: 'ENTWURF' },
      { id: 'F2', status: 'READY_FOR_TECH' },
      { id: 'F3', status: 'WORKSTREAM_SCHNITT_GENEHMIGT' },
      { id: 'F4', status: 'IN_ARBEIT' },
      { id: 'F5', status: 'ABGESCHLOSSEN' },
      { id: 'F6', status: 'keine_akte' },
    ],
  }
  assert.equal(zaehleGeplant(m), 2)
  assert.equal(statusKategorie('WORKSTREAM_SCHNITT_GENEHMIGT'), 'in_arbeit')
  assert.equal(zaehleGeplant(null), 0)
  assert.equal(zaehleGeplant({ features: null }), 0)
})

test('B1/B2: aktueller Meilenstein und Zähler ohne gültige Roadmap', () => {
  assert.equal(aktuellerMeilenstein({ status: 'nicht_vorhanden' }), null)
  assert.equal(aktuellerMeilenstein({ status: 'ungueltig', fehler: ['x'] }), null)
  assert.deepEqual(zaehleMeilenstein(null), { abgenommen: 0, gesamt: 0 })
})

test('STATUS_SYMBOL deckt jede Kategorie ab', () => {
  for (const kategorie of STATUS_KATEGORIEN) assert.equal(typeof STATUS_SYMBOL[kategorie], 'string')
})

test('B10 (F-905): waehleEntwicklungsstand — offene P0–P2-Findings vor offenen Features, höchstens 8', () => {
  const meilenstein = {
    features: [
      { id: 'F1', titel: 'Eins', status: 'IN_ARBEIT' },
      { id: 'F2', status: 'ABGESCHLOSSEN' },
      { id: 'F3', status: 'ABGEBROCHEN' },
      { id: 'F4', status: 'keine_akte' },
    ],
  }
  const workitems = [
    { quelle: 'finding', id: 'F-10', titel: 'zwei', status: 'OFFEN', prioritaet: 'P2' },
    { quelle: 'finding', id: 'F-11', titel: 'null', status: 'OFFEN', prioritaet: 'P0' },
    { quelle: 'finding', id: 'F-12', titel: 'drei', status: 'OFFEN', prioritaet: 'P3' },
    { quelle: 'finding', id: 'F-13', titel: 'erledigt', status: 'ERLEDIGT', prioritaet: 'P0' },
    { quelle: 'finding', id: 'F-14', titel: 'eins', status: 'OFFEN', prioritaet: 'P1' },
    { quelle: 'feature', typ: 'FEATURE', id: 'F1', titel: 'Eins', status: 'IN_ARBEIT' },
    { quelle: 'failed-run', id: 'lauf-1', status: 'OFFEN', prioritaet: 'P0' },
  ]
  const { eintraege, gesamt, findingsVerfuegbar } = waehleEntwicklungsstand(meilenstein, workitems)
  assert.deepEqual(
    eintraege.map((e) => e.id),
    ['F-11', 'F-14', 'F-10', 'F1', 'F4']
  )
  assert.equal(eintraege[3].prioritaet, null)
  assert.equal(gesamt, 5)
  assert.equal(findingsVerfuegbar, true)
})

test('B10: waehleEntwicklungsstand kürzt auf max, ohne Meilenstein nur Findings, ohne Workitems nur Features', () => {
  const viele = Array.from({ length: 10 }, (_, i) => ({ quelle: 'finding', id: `F-${i}`, status: 'OFFEN', prioritaet: 'P1' }))
  const gekuerzt = waehleEntwicklungsstand(null, viele)
  assert.equal(gekuerzt.eintraege.length, 8)
  assert.equal(gekuerzt.gesamt, 10)
  const ohneWorkitems = waehleEntwicklungsstand({ features: [{ id: 'F1', status: 'ENTWURF' }] }, null)
  assert.deepEqual(
    ohneWorkitems.eintraege.map((e) => e.id),
    ['F1']
  )
  assert.equal(ohneWorkitems.findingsVerfuegbar, false)
  assert.equal(waehleEntwicklungsstand(null, undefined).findingsVerfuegbar, false)
  assert.equal(waehleEntwicklungsstand(null, [], 3).eintraege.length, 0)
})

test('F46 D1: waehleEntwicklungsstand trägt den Typ und filtert nach Typen (Roadmap-Filter)', () => {
  const meilenstein = { features: [{ id: 'F1', titel: 'Eins', status: 'IN_ARBEIT' }] }
  const workitems = [
    { quelle: 'finding', typ: 'BUG', id: 'F-1', titel: 'b', status: 'OFFEN', prioritaet: 'P1' },
    { quelle: 'finding', typ: 'HARNESS_IMPROVEMENT', id: 'F-2', titel: 'h', status: 'OFFEN', prioritaet: 'P2' },
    { quelle: 'finding', typ: 'TECH_DEBT', id: 'F-3', titel: 't', status: 'OFFEN', prioritaet: 'P0' },
  ]
  const alle = waehleEntwicklungsstand(meilenstein, workitems)
  assert.deepEqual(
    alle.eintraege.map((e) => [e.id, e.typ]),
    [
      ['F-3', 'TECH_DEBT'],
      ['F-1', 'BUG'],
      ['F-2', 'HARNESS_IMPROVEMENT'],
      ['F1', 'FEATURE'],
    ]
  )
  assert.deepEqual(
    waehleEntwicklungsstand(meilenstein, workitems, 8, { typen: ['FEATURE'] }).eintraege.map((e) => e.id),
    ['F1']
  )
  const bugs = waehleEntwicklungsstand(meilenstein, workitems, 8, { typen: ['BUG'] })
  assert.deepEqual(
    bugs.eintraege.map((e) => e.id),
    ['F-1']
  )
  assert.equal(bugs.gesamt, 1)
  assert.equal(waehleEntwicklungsstand(meilenstein, workitems, 8, { typen: [] }).eintraege.length, 0)
})
