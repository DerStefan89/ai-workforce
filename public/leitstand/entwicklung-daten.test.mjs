/**
 * Datei: public/leitstand/entwicklung-daten.test.mjs
 *
 * Zweck: node:test-Fälle für die reinen Regeln der Seite „Entwicklung“ (F44 WS-3a,
 * entwicklung-daten.js): jede Zeile der Spaltenregel, Vorrang a > b > c > d, die Verknüpfung
 * Workitem ↔ Workflow über den Auftrag, Begrenzung und Sortierung je Spalte, leere und defekte
 * Quellen, die clientseitige Suche. F44 WS-3b: Sortierung nach F-919, jeTab für „Alle x
 * anzeigen“, verknüpfter Workflow und Phase (F-921), Schrittfortschritt. Belegt zugleich, dass das
 * Modul ohne DOM importierbar ist.
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { baueBoard, baueVerknuepfung, KARTEN_JE_SPALTE, SPALTEN, schrittFortschritt, spalteVon, sucheWorkitems, tabFuerTyp, verknuepfterWorkflow, waehleFeatureInArbeit, workflowPhase } from './entwicklung-daten.js'

const feature = (id, status, extra = {}) => ({ quelle: 'feature', typ: 'FEATURE', id, titel: `Feature ${id}`, status, ...extra })
const finding = (id, status, prioritaet = 'P2', typ = 'BUG') => ({ quelle: 'finding', typ, id, titel: `Finding ${id}`, status, prioritaet })
const auftrag = (auftragId, referenz) => ({ auftragId, titel: auftragId, workitem_referenz: referenz })
const workflow = (workflowId, auftragId, status, art = null) => ({ workflowId, auftragId, status, naechster: art === null ? null : { art } })

/** Spalte ohne Workflows (leere, aber vollständige Verknüpfung). */
const ohneWorkflows = baueVerknuepfung([], [])

test('Regel a) abgenommen: Feature ABGESCHLOSSEN, Finding ERLEDIGT', () => {
  assert.equal(spalteVon(feature('F1', 'ABGESCHLOSSEN'), ohneWorkflows), 'abgenommen')
  assert.equal(spalteVon(finding('F-1', 'ERLEDIGT'), ohneWorkflows), 'abgenommen')
})

test('Regel b) braucht_dich: Feature FEATURE_GATE oder BLOCKIERT', () => {
  assert.equal(spalteVon(feature('F1', 'FEATURE_GATE'), ohneWorkflows), 'braucht_dich')
  assert.equal(spalteVon(feature('F2', 'BLOCKIERT'), ohneWorkflows), 'braucht_dich')
})

test('Regel b) braucht_dich: ein verknüpfter Workflow wartet auf Freigabe oder Klärung', () => {
  // F46 D3 (F-996): eine Freigabe wartet mit WARTET_FREIGABE, eine Rückfrage mit KLAERUNG_ERFORDERLICH.
  for (const [status, art] of [['WARTET_FREIGABE', 'haltFreigabe'], ['KLAERUNG_ERFORDERLICH', 'haltKlaerung']]) {
    const v = baueVerknuepfung([workflow('w1', 'a1', status, art)], [auftrag('a1', 'workitem:finding:F-1')])
    assert.equal(spalteVon(finding('F-1', 'OFFEN'), v), 'braucht_dich', art)
  }
  // haltKlaerung eines laufenden Workflows (Schritt läuft) wartet nicht auf Stefan.
  const laufend = baueVerknuepfung([workflow('w1', 'a1', 'LAEUFT', 'haltKlaerung')], [auftrag('a1', 'workitem:feature:F1')])
  assert.equal(spalteVon(feature('F1', 'IN_ARBEIT'), laufend), 'in_arbeit')
})

test('Regel c) in_arbeit: Feature IN_ARBEIT oder WORKSTREAM_SCHNITT_GENEHMIGT', () => {
  assert.equal(spalteVon(feature('F1', 'IN_ARBEIT'), ohneWorkflows), 'in_arbeit')
  assert.equal(spalteVon(feature('F2', 'WORKSTREAM_SCHNITT_GENEHMIGT'), ohneWorkflows), 'in_arbeit')
})

test('Regel c) in_arbeit: ein verknüpfter, nicht terminaler Workflow (ohne Halt beim Menschen)', () => {
  for (const status of ['OFFEN', 'WARTET_FREIGABE', 'LAEUFT', 'KLAERUNG_ERFORDERLICH']) {
    const v = baueVerknuepfung([workflow('w1', 'a1', status, 'starte')], [auftrag('a1', 'workitem:feature:F1')])
    assert.equal(spalteVon(feature('F1', 'ENTWURF'), v), 'in_arbeit', status)
  }
})

test('Regel c) terminale Workflows (ABGESCHLOSSEN, GESTOPPT) und unbekannte Status zählen nicht', () => {
  for (const status of ['ABGESCHLOSSEN', 'GESTOPPT', 'IRGENDWAS', undefined]) {
    const v = baueVerknuepfung([workflow('w1', 'a1', status, 'fertig')], [auftrag('a1', 'workitem:finding:F-1')])
    assert.equal(spalteVon(finding('F-1', 'OFFEN'), v), 'geplant', String(status))
  }
})

test('Regel d) geplant: Feature ENTWURF oder READY_FOR_TECH, Finding OFFEN', () => {
  assert.equal(spalteVon(feature('F1', 'ENTWURF'), ohneWorkflows), 'geplant')
  assert.equal(spalteVon(feature('F2', 'READY_FOR_TECH'), ohneWorkflows), 'geplant')
  assert.equal(spalteVon(finding('F-1', 'OFFEN'), ohneWorkflows), 'geplant')
})

test('Regel e) ausserhalb: ABGEBROCHEN, SONSTIGES, unbekannt', () => {
  assert.equal(spalteVon(feature('F1', 'ABGEBROCHEN'), ohneWorkflows), 'ausserhalb')
  assert.equal(spalteVon(finding('F-1', 'SONSTIGES'), ohneWorkflows), 'ausserhalb')
  assert.equal(spalteVon(feature('F2', 'NEU_ERFUNDEN'), ohneWorkflows), 'ausserhalb')
  assert.equal(spalteVon({ quelle: 'fremd', id: 'x', status: 'OFFEN' }, ohneWorkflows), 'ausserhalb')
})

test('Vorrang a > b: ein erledigtes Finding bleibt abgenommen, auch wenn sein Workflow wartet', () => {
  const v = baueVerknuepfung([workflow('w1', 'a1', 'LAEUFT', 'haltFreigabe')], [auftrag('a1', 'workitem:finding:F-1')])
  assert.equal(spalteVon(finding('F-1', 'ERLEDIGT'), v), 'abgenommen')
})

test('Vorrang b > c: ein Feature IN_ARBEIT mit wartendem Workflow braucht dich', () => {
  const v = baueVerknuepfung([workflow('w1', 'a1', 'KLAERUNG_ERFORDERLICH', 'haltKlaerung')], [auftrag('a1', 'workitem:feature:F1')])
  assert.equal(spalteVon(feature('F1', 'IN_ARBEIT'), v), 'braucht_dich')
})

test('Vorrang a > c: ein abgeschlossenes Feature bleibt abgenommen, auch wenn sein Workflow noch läuft', () => {
  const v = baueVerknuepfung([workflow('w1', 'a1', 'LAEUFT', 'starte')], [auftrag('a1', 'workitem:feature:F1')])
  assert.equal(spalteVon(feature('F1', 'ABGESCHLOSSEN'), v), 'abgenommen')
})

test('Vorrang b/c > e: ABGEBROCHEN bzw. SONSTIGES mit verknüpftem, nicht terminalem Workflow stehen dort, wo real noch etwas läuft', () => {
  const laeuft = baueVerknuepfung([workflow('w1', 'a1', 'LAEUFT', 'starte')], [auftrag('a1', 'workitem:feature:F1')])
  assert.equal(spalteVon(feature('F1', 'ABGEBROCHEN'), laeuft), 'in_arbeit')
  const wartet = baueVerknuepfung([workflow('w1', 'a1', 'KLAERUNG_ERFORDERLICH', 'haltKlaerung')], [auftrag('a1', 'workitem:finding:F-1')])
  assert.equal(spalteVon(finding('F-1', 'SONSTIGES'), wartet), 'braucht_dich')
})

test('Vorrang c > d: ein offenes Finding mit laufendem Workflow ist in Arbeit', () => {
  const v = baueVerknuepfung([workflow('w1', 'a1', 'LAEUFT', 'starte')], [auftrag('a1', 'workitem:finding:F-1')])
  assert.equal(spalteVon(finding('F-1', 'OFFEN'), v), 'in_arbeit')
})

test('Verknüpfung nur über den Auftrag: falsche Quelle, fehlende Referenz oder fremder Auftrag verknüpfen nicht', () => {
  const workflows = [workflow('w1', 'a1', 'LAEUFT', 'haltFreigabe'), workflow('w2', 'a2', 'LAEUFT', 'haltFreigabe'), workflow('w3', 'a-fehlt', 'LAEUFT', 'haltFreigabe')]
  const auftraege = [auftrag('a1', 'workitem:feature:F-1'), auftrag('a2', null)]
  const v = baueVerknuepfung(workflows, auftraege)
  // Referenz nennt die Quelle feature, das Workitem ist ein Finding mit derselben id.
  assert.equal(spalteVon(finding('F-1', 'OFFEN'), v), 'geplant')
  assert.deepEqual(v.fehlend, [])
  assert.deepEqual([...v.jeReferenz.keys()], ['workitem:feature:F-1'])
})

test('Verknüpfung: mehrere Workflows je Workitem — einer, der wartet, genügt', () => {
  const workflows = [workflow('w1', 'a1', 'ABGESCHLOSSEN', 'fertig'), workflow('w2', 'a2', 'LAEUFT', 'haltFreigabe')]
  const auftraege = [auftrag('a1', 'workitem:finding:F-1'), auftrag('a2', 'workitem:finding:F-1')]
  assert.equal(spalteVon(finding('F-1', 'OFFEN'), baueVerknuepfung(workflows, auftraege)), 'braucht_dich')
})

test('baueBoard: vier Spalten, Zahl außerhalb, Zuordnung über Auftrag', () => {
  const workitems = [feature('F1', 'ENTWURF'), finding('F-1', 'OFFEN'), finding('F-2', 'ERLEDIGT'), feature('F2', 'ABGEBROCHEN'), finding('F-3', 'SONSTIGES'), finding('F-4', 'OFFEN')]
  const board = baueBoard(workitems, [workflow('w1', 'a1', 'LAEUFT', 'starte')], [auftrag('a1', 'workitem:finding:F-4')])
  assert.deepEqual(Object.keys(board.spalten), SPALTEN)
  assert.deepEqual(
    board.spalten.geplant.karten.map((w) => w.id),
    // F-919: das Feature steht vor dem P2-Finding.
    ['F1', 'F-1']
  )
  assert.deepEqual(
    board.spalten.in_arbeit.karten.map((w) => w.id),
    ['F-4']
  )
  assert.equal(board.spalten.braucht_dich.anzahl, 0)
  assert.deepEqual(
    board.spalten.abgenommen.karten.map((w) => w.id),
    ['F-2']
  )
  assert.equal(board.ausserhalb, 2)
  assert.deepEqual(board.fehlend, [])
})

test('baueBoard (F-919): Sortierung P0, P1, Features, P2, P3, P4, ohne Priorität; innerhalb einer Stufe Quellreihenfolge', () => {
  const workitems = [
    finding('F-p3', 'OFFEN', 'P3'),
    feature('F-ohne', 'ENTWURF'),
    finding('F-p1a', 'OFFEN', 'P1'),
    feature('F-p1', 'ENTWURF', { prioritaet: 'P1' }),
    finding('F-p0', 'OFFEN', 'P0'),
    finding('F-p1b', 'OFFEN', 'P1'),
    finding('F-p4', 'OFFEN', 'P4'),
    finding('F-p2', 'OFFEN', 'P2'),
    // Ein geerbter Objektschlüssel ist keine Priorität (Object.hasOwn).
    finding('F-proto', 'OFFEN', 'constructor'),
  ]
  const board = baueBoard(workitems, [], [])
  // Features stehen als eigene Stufe zwischen P1 und P2 (eine Priorität in der Akte ändert daran nichts).
  assert.deepEqual(
    board.spalten.geplant.karten.map((w) => w.id),
    ['F-p0', 'F-p1a', 'F-p1b', 'F-ohne', 'F-p1', 'F-p2', 'F-p3', 'F-p4', 'F-proto']
  )
})

test('baueBoard: höchstens KARTEN_JE_SPALTE Karten; weitere = Rest, jeTab = alle Workitems der Spalte je Listen-Tab (F-919)', () => {
  const workitems = [
    ...Array.from({ length: KARTEN_JE_SPALTE }, (_, i) => finding(`F-b${i}`, 'OFFEN', 'P1')),
    finding('F-h1', 'OFFEN', 'P2', 'HARNESS_IMPROVEMENT'),
    finding('F-t1', 'OFFEN', 'P2', 'TECH_DEBT'),
    finding('F-p1', 'OFFEN', 'P3', 'PROCESS_IMPROVEMENT'),
    feature('F9', 'ENTWURF'),
    finding('F-x', 'OFFEN', 'P3', 'UNBEKANNT'),
  ]
  const spalte = baueBoard(workitems, [], []).spalten.geplant
  assert.equal(spalte.karten.length, KARTEN_JE_SPALTE)
  assert.equal(spalte.anzahl, KARTEN_JE_SPALTE + 5)
  assert.equal(spalte.weitere, 5)
  // „Alle x anzeigen“ führt in den Tab mit der ganzen Spalte: jeTab zählt auch die Karten auf dem
  // Board. Ein unbekannter Typ zählt in anzahl, hat aber keinen Listen-Tab.
  assert.deepEqual(spalte.jeTab, [
    { tab: 'features', anzahl: 1 },
    { tab: 'bugs', anzahl: KARTEN_JE_SPALTE },
    { tab: 'harness', anzahl: 1 },
    { tab: 'weitere', anzahl: 2 },
  ])
})

test('baueBoard: leere Liste ergibt leere Spalten', () => {
  const board = baueBoard([], [], [])
  for (const spalte of SPALTEN) assert.deepEqual(board.spalten[spalte], { karten: [], anzahl: 0, weitere: 0, jeTab: [] })
  assert.equal(board.ausserhalb, 0)
})

test('baueBoard: ohne Workitem-Liste (defekt oder lädt) null', () => {
  assert.equal(baueBoard(null, [], []), null)
  assert.equal(baueBoard(undefined, [], []), null)
})

test('baueBoard: defekte Workflow- oder Auftragsquelle — Statusregeln greifen weiter, fehlend nennt die Quelle', () => {
  const workitems = [feature('F1', 'IN_ARBEIT'), finding('F-1', 'OFFEN')]
  const ohneWf = baueBoard(workitems, null, [auftrag('a1', 'workitem:finding:F-1')])
  assert.deepEqual(ohneWf.fehlend, ['workflows'])
  assert.deepEqual(ohneWf.laedt, [])
  assert.deepEqual(
    ohneWf.spalten.in_arbeit.karten.map((w) => w.id),
    ['F1']
  )
  assert.deepEqual(
    ohneWf.spalten.geplant.karten.map((w) => w.id),
    ['F-1']
  )
  const ohneAuftraege = baueBoard(workitems, [workflow('w1', 'a1', 'LAEUFT', 'haltFreigabe')], null)
  assert.deepEqual(ohneAuftraege.fehlend, ['auftraege'])
  assert.equal(ohneAuftraege.spalten.braucht_dich.anzahl, 0)
  // undefined heißt „lädt noch“, nicht „nicht verfügbar“ — die Ansicht zeigt dafür keinen Fehlerhinweis.
  const laedt = baueBoard(workitems, undefined, undefined)
  assert.deepEqual(laedt.fehlend, [])
  assert.deepEqual(laedt.laedt, ['workflows', 'auftraege'])
  assert.deepEqual(baueBoard(workitems, [], []).laedt, [])
})

test('baueBoard: kaputte Einträge in Workflows/Aufträgen werfen nicht', () => {
  const board = baueBoard([finding('F-1', 'OFFEN')], [null, { workflowId: 'w' }], [null, { auftragId: 1 }, auftrag('a1', 'workitem:finding:F-1')])
  assert.equal(board.spalten.geplant.anzahl, 1)
})

test('tabFuerTyp: FEATURE, BUG, HARNESS_IMPROVEMENT, TECH_DEBT/PROCESS_IMPROVEMENT → Weitere; unbekannt null', () => {
  assert.equal(tabFuerTyp('FEATURE'), 'features')
  assert.equal(tabFuerTyp('BUG'), 'bugs')
  assert.equal(tabFuerTyp('HARNESS_IMPROVEMENT'), 'harness')
  assert.equal(tabFuerTyp('TECH_DEBT'), 'weitere')
  assert.equal(tabFuerTyp('PROCESS_IMPROVEMENT'), 'weitere')
  assert.equal(tabFuerTyp('NOPE'), null)
})

test('sucheWorkitems: über id und titel, ohne Groß-/Kleinschreibung, getrimmt', () => {
  const liste = [finding('F-913', 'OFFEN'), { ...feature('F44', 'IN_ARBEIT'), titel: 'Design-Schnitt' }, { ...finding('F-1', 'OFFEN'), titel: null }]
  assert.deepEqual(
    sucheWorkitems(liste, 'f-913').map((w) => w.id),
    ['F-913']
  )
  assert.deepEqual(
    sucheWorkitems(liste, '  SCHNITT ').map((w) => w.id),
    ['F44']
  )
  assert.equal(sucheWorkitems(liste, '').length, 3)
  assert.equal(sucheWorkitems(liste, '   ').length, 3)
  assert.equal(sucheWorkitems(liste, undefined).length, 3)
  assert.deepEqual(sucheWorkitems(liste, 'gibt es nicht'), [])
})

test('sucheWorkitems: ohne Liste leer', () => {
  assert.deepEqual(sucheWorkitems(null, 'x'), [])
  assert.deepEqual(sucheWorkitems(undefined, ''), [])
})

test('baueBoard: liefert die Verknüpfung mit (Phase der Karten, F-921)', () => {
  const board = baueBoard([finding('F-1', 'OFFEN')], [workflow('w1', 'a1', 'LAEUFT')], [auftrag('a1', 'workitem:finding:F-1')])
  assert.equal(verknuepfterWorkflow(finding('F-1', 'OFFEN'), board.verknuepfung)?.workflowId, 'w1')
})

test('verknuepfterWorkflow: wartend vor nicht terminal vor dem letzten; ohne Verknüpfung null', () => {
  const auftraege = [auftrag('a1', 'workitem:feature:F1'), auftrag('a2', 'workitem:feature:F1'), auftrag('a3', 'workitem:feature:F1')]
  const f1 = feature('F1', 'IN_ARBEIT')
  const alle = (workflows) => verknuepfterWorkflow(f1, baueVerknuepfung(workflows, auftraege))?.workflowId ?? null
  assert.equal(alle([workflow('w1', 'a1', 'ABGESCHLOSSEN'), workflow('w2', 'a2', 'LAEUFT'), workflow('w3', 'a3', 'KLAERUNG_ERFORDERLICH', 'haltKlaerung')]), 'w3')
  // Freigabe vor Rückfrage (Reihenfolge von baueEntscheidungen).
  assert.equal(alle([workflow('w1', 'a1', 'LAEUFT', 'haltKlaerung'), workflow('w2', 'a2', 'WARTET_FREIGABE', 'haltFreigabe')]), 'w2')
  assert.equal(alle([workflow('w1', 'a1', 'ABGESCHLOSSEN'), workflow('w2', 'a2', 'LAEUFT')]), 'w2')
  assert.equal(alle([workflow('w1', 'a1', 'GESTOPPT'), workflow('w2', 'a2', 'ABGESCHLOSSEN')]), 'w2')
  assert.equal(alle([]), null)
  assert.equal(verknuepfterWorkflow(f1, baueVerknuepfung(undefined, auftraege)), null)
  assert.equal(verknuepfterWorkflow(f1, undefined), null)
})

test('workflowPhase: Freigabe/Rückfrage aus attention-daten, sonst nach Status; ohne Workflow null', () => {
  assert.equal(workflowPhase(workflow('w', 'a', 'WARTET_FREIGABE', 'haltFreigabe')), 'freigabe')
  assert.equal(workflowPhase(workflow('w', 'a', 'KLAERUNG_ERFORDERLICH', 'haltKlaerung')), 'rueckfrage')
  assert.equal(workflowPhase(workflow('w', 'a', 'LAEUFT', 'starte')), 'laeuft')
  assert.equal(workflowPhase(workflow('w', 'a', 'OFFEN')), 'bereit')
  assert.equal(workflowPhase(workflow('w', 'a', 'KLAERUNG_ERFORDERLICH')), 'klaerung')
  assert.equal(workflowPhase(workflow('w', 'a', 'ABGESCHLOSSEN')), 'abgeschlossen')
  assert.equal(workflowPhase(workflow('w', 'a', 'GESTOPPT')), 'gestoppt')
  assert.equal(workflowPhase(workflow('w', 'a', 'NEU')), 'unbekannt')
  assert.equal(workflowPhase(workflow('w', 'a', 'constructor')), 'unbekannt')
  assert.equal(workflowPhase(null), null)
})

test('schrittFortschritt: ERFOLGREICH zählt, ganzzahlige Prozent, leere/fehlende Schritte 0', () => {
  const s = (status) => ({ status })
  assert.deepEqual(schrittFortschritt([s('ERFOLGREICH'), s('ERFOLGREICH'), s('WARTET_FREIGABE')]), { erledigt: 2, gesamt: 3, prozent: 67 })
  assert.deepEqual(schrittFortschritt([s('UEBERSPRUNGEN'), null]), { erledigt: 0, gesamt: 2, prozent: 0 })
  assert.deepEqual(schrittFortschritt([]), { erledigt: 0, gesamt: 0, prozent: 0 })
  assert.deepEqual(schrittFortschritt(undefined), { erledigt: 0, gesamt: 0, prozent: 0 })
})

test('F46 D1: waehleFeatureInArbeit — Feature mit laufendem Workflow vor IN_ARBEIT, Meilenstein-Reihenfolge vor Workitems', () => {
  const workitems = [
    { quelle: 'feature', typ: 'FEATURE', id: 'F1', titel: 'Eins', status: 'IN_ARBEIT' },
    { quelle: 'feature', typ: 'FEATURE', id: 'F2', titel: 'Zwei', status: 'READY_FOR_TECH' },
    { quelle: 'finding', typ: 'BUG', id: 'F-9', titel: 'Befund', status: 'OFFEN' },
  ]
  const auftraege = [{ auftragId: 'a2', workitem_referenz: 'workitem:feature:F2' }]
  const laufend = baueVerknuepfung([{ workflowId: 'w2', auftragId: 'a2', status: 'LAEUFT' }], auftraege)
  assert.deepEqual(waehleFeatureInArbeit(workitems, laufend, null), { id: 'F2', titel: 'Zwei', status: 'READY_FOR_TECH', workflow: { workflowId: 'w2', auftragId: 'a2', status: 'LAEUFT' } })

  // Ohne laufenden Workflow: erstes IN_ARBEIT des Meilensteins, sonst der Workitems.
  const fertig = baueVerknuepfung([{ workflowId: 'w2', auftragId: 'a2', status: 'ABGESCHLOSSEN' }], auftraege)
  const meilenstein = { features: [{ id: 'F3', titel: 'Drei', status: 'ABGESCHLOSSEN' }, { id: 'F4', titel: 'Vier', status: 'IN_ARBEIT' }] }
  assert.equal(waehleFeatureInArbeit(workitems, fertig, meilenstein).id, 'F4')
  const ohneMeilenstein = waehleFeatureInArbeit(workitems, fertig, null)
  assert.equal(ohneMeilenstein.id, 'F1')
  assert.equal(ohneMeilenstein.workflow, null)

  // Nichts in Arbeit, keine Quellen: null.
  assert.equal(waehleFeatureInArbeit([{ quelle: 'feature', id: 'F5', status: 'ENTWURF' }], fertig, null), null)
  assert.equal(waehleFeatureInArbeit(null, baueVerknuepfung(undefined, undefined), null), null)
})
