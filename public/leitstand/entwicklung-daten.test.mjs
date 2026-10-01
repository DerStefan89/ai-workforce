/**
 * Datei: public/leitstand/entwicklung-daten.test.mjs
 *
 * Zweck: node:test-Fälle für die reinen Regeln der Seite „Entwicklung“ (F44 WS-3a,
 * entwicklung-daten.js): jede Zeile der Spaltenregel, Vorrang a > b > c > d, die Verknüpfung
 * Workitem ↔ Workflow über den Auftrag, Begrenzung und Sortierung je Spalte, leere und defekte
 * Quellen, die clientseitige Suche. Belegt zugleich, dass das Modul ohne DOM importierbar ist.
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { baueBoard, baueVerknuepfung, KARTEN_JE_SPALTE, SPALTEN, spalteVon, sucheWorkitems, tabFuerTyp } from './entwicklung-daten.js'

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
  for (const art of ['haltFreigabe', 'haltKlaerung']) {
    const v = baueVerknuepfung([workflow('w1', 'a1', 'LAEUFT', art)], [auftrag('a1', 'workitem:finding:F-1')])
    assert.equal(spalteVon(finding('F-1', 'OFFEN'), v), 'braucht_dich', art)
  }
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
  const v = baueVerknuepfung([workflow('w1', 'a1', 'LAEUFT', 'haltKlaerung')], [auftrag('a1', 'workitem:feature:F1')])
  assert.equal(spalteVon(feature('F1', 'IN_ARBEIT'), v), 'braucht_dich')
})

test('Vorrang a > c: ein abgeschlossenes Feature bleibt abgenommen, auch wenn sein Workflow noch läuft', () => {
  const v = baueVerknuepfung([workflow('w1', 'a1', 'LAEUFT', 'starte')], [auftrag('a1', 'workitem:feature:F1')])
  assert.equal(spalteVon(feature('F1', 'ABGESCHLOSSEN'), v), 'abgenommen')
})

test('Vorrang b/c > e: ABGEBROCHEN bzw. SONSTIGES mit verknüpftem, nicht terminalem Workflow stehen dort, wo real noch etwas läuft', () => {
  const laeuft = baueVerknuepfung([workflow('w1', 'a1', 'LAEUFT', 'starte')], [auftrag('a1', 'workitem:feature:F1')])
  assert.equal(spalteVon(feature('F1', 'ABGEBROCHEN'), laeuft), 'in_arbeit')
  const wartet = baueVerknuepfung([workflow('w1', 'a1', 'LAEUFT', 'haltKlaerung')], [auftrag('a1', 'workitem:finding:F-1')])
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
    ['F-1', 'F1']
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

test('baueBoard: Sortierung P0 → P4, Features ohne Priorität dahinter, bei gleicher Stufe Feature vor Finding, sonst Quellreihenfolge', () => {
  const workitems = [
    finding('F-p3', 'OFFEN', 'P3'),
    feature('F-ohne', 'ENTWURF'),
    finding('F-p1a', 'OFFEN', 'P1'),
    feature('F-p1', 'ENTWURF', { prioritaet: 'P1' }),
    finding('F-p0', 'OFFEN', 'P0'),
    finding('F-p1b', 'OFFEN', 'P1'),
    finding('F-p4', 'OFFEN', 'P4'),
    // Ein geerbter Objektschlüssel ist keine Priorität (Object.hasOwn).
    finding('F-proto', 'OFFEN', 'constructor'),
  ]
  const board = baueBoard(workitems, [], [])
  assert.deepEqual(
    board.spalten.geplant.karten.map((w) => w.id),
    ['F-p0', 'F-p1', 'F-p1a', 'F-p1b', 'F-p3', 'F-p4', 'F-ohne', 'F-proto']
  )
})

test('baueBoard: höchstens KARTEN_JE_SPALTE Karten, der Rest als Zahl je Listen-Tab', () => {
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
  // Unbekannter Typ zählt in „weitere“, hat aber keinen Listen-Tab.
  assert.deepEqual(spalte.weitereJeTab, [
    { tab: 'features', anzahl: 1 },
    { tab: 'harness', anzahl: 1 },
    { tab: 'weitere', anzahl: 2 },
  ])
})

test('baueBoard: leere Liste ergibt leere Spalten', () => {
  const board = baueBoard([], [], [])
  for (const spalte of SPALTEN) assert.deepEqual(board.spalten[spalte], { karten: [], anzahl: 0, weitere: 0, weitereJeTab: [] })
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
