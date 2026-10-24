/**
 * Datei: src/feature-auftrag/planung-schreiben.test.ts
 *
 * Zweck: node:test für F45 B5b-1b-1 „Planung schreiben“ — pruefePlanungAenderung (400-Fälle, Normalisierung) und
 * bearbeitePlanungInAkte (Priorität neu bzw. ersetzt, Schätzzelle, Zeilenende, Änderungszeile, keine Änderung, Status,
 * fehlender/fehlerhafter Abschnitt, unbekannte ID, Akte-Gate blockiert auch einen Altbefund).
 *
 * Wird aufgerufen von: `npm test` (node --test).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { lesePlanung } from '../workboard/feature-planung.ts'
import { bearbeitePlanungInAkte, formatiereSchaetzung, type PlanungAenderung, pruefePlanungAenderung } from './planung-schreiben.ts'

const HASH = 'a'.repeat(64)
const AKTE = [
  '# F3 — Gate',
  '',
  '## Status',
  'Status: IN_ARBEIT',
  '',
  '## Ziel',
  'Ziel.',
  '',
  '## Workstreams',
  '',
  '| ID | Art | Titel | Status | Schätzung AT | Ist AT | Begonnen | Abgenommen | Notiz |',
  '|---|---|---|---|---|---|---|---|---|',
  '| A | workstream | Eins | geplant | 0,3–0,4 | – | – | – | n |',
  '| B | fixpaket | Zwei | geplant |  –  | – | – | – | |',
  '',
  '## Änderungen',
  '- 2026-10-01 · Ziel · alt',
  '',
].join('\n')

/** Änderung mit Vorgaben. @param teil - Abweichungen @returns Änderung */
const aenderung = (teil: Partial<PlanungAenderung> = {}): PlanungAenderung => ({ prioritaet: null, meilenstein: null, workstreams: null, grund: 'Test', ...teil })

test('pruefePlanungAenderung: 400-Fälle', () => {
  const basis = { grund: 'g', hash: HASH }
  const faelle: unknown[] = [
    null,
    [],
    { ...basis },
    { ...basis, prioritaet: 'P1', fremd: 1 },
    { prioritaet: 'P1', grund: '  ', hash: HASH },
    { prioritaet: 'P1', grund: 'g', hash: 'x' },
    { ...basis, meilenstein: 'M2' },
    { ...basis, prioritaet: 'P1', roadmap_hash: HASH },
    { ...basis, meilenstein: null, roadmap_hash: HASH },
    { ...basis, prioritaet: 'P4' },
    { ...basis, workstreams: [] },
    { ...basis, workstreams: [{ id: 'A', schaetzung_min: 0.5, schaetzung_max: 0.4 }] },
    { ...basis, workstreams: [{ id: 'A', schaetzung_min: null, schaetzung_max: 0.4 }] },
    { ...basis, workstreams: [{ id: 'A', schaetzung_min: 0.125, schaetzung_max: 0.4 }] },
    { ...basis, workstreams: [{ id: 'A', schaetzung_min: 1, schaetzung_max: 1001 }] },
    { ...basis, workstreams: [{ id: 'A', schaetzung_min: -1, schaetzung_max: 1 }] },
    { ...basis, workstreams: [{ id: 'A', schaetzung_min: 1, schaetzung_max: 1 }, { id: 'A', schaetzung_min: 1, schaetzung_max: 1 }] },
    { ...basis, workstreams: [{ id: 'A', schaetzung_min: 1 }] },
    { ...basis, workstreams: [{ id: ' A', schaetzung_min: 1, schaetzung_max: 1 }] },
  ]
  for (const fall of faelle) assert.equal(pruefePlanungAenderung(fall).ok, false, JSON.stringify(fall))
  assert.match((pruefePlanungAenderung({ ...basis, meilenstein: null, roadmap_hash: HASH }) as { grund: string }).grund, /Ausplanen/)
})

test('pruefePlanungAenderung: gültiger Körper wird normalisiert', () => {
  const r = pruefePlanungAenderung({ prioritaet: 'P1', meilenstein: 'V1-Backlog', roadmap_hash: 'b'.repeat(64), workstreams: [{ id: 'A', schaetzung_min: 0.25, schaetzung_max: 0.5 }, { id: 'B', schaetzung_min: null, schaetzung_max: null }], grund: '  zwei\n Zeilen ', hash: HASH })
  assert.ok(r.ok)
  assert.deepEqual(r.aenderung, { prioritaet: 'P1', meilenstein: 'V1-Backlog', workstreams: [{ id: 'A', schaetzung: { min: 0.25, max: 0.5 } }, { id: 'B', schaetzung: null }], grund: 'zwei Zeilen' })
  assert.equal(r.roadmapHash, 'b'.repeat(64))
})

test('formatiereSchaetzung: x, min–max mit Komma, –', () => {
  assert.equal(formatiereSchaetzung({ min: 1, max: 1 }), '1')
  assert.equal(formatiereSchaetzung({ min: 0.3, max: 0.45 }), '0,3–0,45')
  assert.equal(formatiereSchaetzung(null), '–')
})

test('Priorität neu hinter der Status-Zeile, Schätzung nur in der Zelle, Änderungszeile, Rest bytegleich (LF)', () => {
  const r = bearbeitePlanungInAkte(AKTE, aenderung({ prioritaet: 'P1', workstreams: [{ id: 'B', schaetzung: { min: 0.5, max: 0.5 } }, { id: 'A', schaetzung: { min: 0.3, max: 0.4 } }] }), null, '2026-10-24')
  assert.ok(r.ok)
  assert.deepEqual(r.geaendert, ['Priorität', 'Schätzung'])
  const erwartet = AKTE.replace('Status: IN_ARBEIT\n', 'Status: IN_ARBEIT\nPriorität: P1\n').replace('| geplant |  –  |', '| geplant |  0,5  |').replace('- 2026-10-01 · Ziel · alt', '- 2026-10-01 · Ziel · alt\n- 2026-10-24 · Priorität P1, Schätzung B · Test')
  assert.equal(r.inhalt, erwartet)
  const p = lesePlanung(r.inhalt)
  assert.equal(p.prioritaet, 'P1')
  assert.deepEqual(p.workstreams?.find((w) => w.id === 'B')?.schaetzung, { min: 0.5, max: 0.5 })
})

test('bestehende Priorität wird ersetzt; CRLF bleibt CRLF; Meilenstein-Wechsel allein schreibt die Änderungszeile', () => {
  const crlf = AKTE.replace('Status: IN_ARBEIT\n', 'Status: IN_ARBEIT\nPriorität: P3\n').replace(/\n/g, '\r\n')
  const r = bearbeitePlanungInAkte(crlf, aenderung({ prioritaet: 'P0' }), { von: 'M1', nach: 'M2' }, '2026-10-24')
  assert.ok(r.ok)
  assert.ok(!/[^\r]\n/.test(r.inhalt), 'keine nackte LF')
  assert.ok(r.inhalt.includes('\r\nPriorität: P0\r\n'))
  assert.ok(r.inhalt.includes('- 2026-10-24 · Priorität P0, Meilenstein M1 → M2 · Test\r\n'))
  const nurWechsel = bearbeitePlanungInAkte(AKTE, aenderung(), { von: null, nach: 'M2' }, '2026-10-24')
  assert.ok(nurWechsel.ok)
  assert.deepEqual(nurWechsel.geaendert, ['Meilenstein'])
  assert.ok(nurWechsel.inhalt.includes('· Meilenstein – → M2 · Test'))
})

test('fehlender Abschnitt „## Änderungen“ wird am Dateiende angelegt', () => {
  const ohne = AKTE.replace('\n## Änderungen\n- 2026-10-01 · Ziel · alt\n', '')
  const r = bearbeitePlanungInAkte(ohne, aenderung({ prioritaet: 'P2' }), null, '2026-10-24')
  assert.ok(r.ok)
  assert.ok(r.inhalt.endsWith('\n## Änderungen\n- 2026-10-24 · Priorität P2 · Test\n'))
})

test('422: keine Änderung, abgeschlossene Akte, kein strenger Abschnitt, unbekannte ID, Formfehler', () => {
  assert.equal(bearbeitePlanungInAkte(AKTE, aenderung({ workstreams: [{ id: 'A', schaetzung: { min: 0.3, max: 0.4 } }] }), null, '2026-10-24').ok, false)
  assert.equal(bearbeitePlanungInAkte(AKTE.replace('IN_ARBEIT', 'ABGESCHLOSSEN'), aenderung({ prioritaet: 'P1' }), null, '2026-10-24').ok, false)
  const prosa = AKTE.replace(/\| ID[\s\S]*?\| B [^\n]*\n/, '- A: Eins\n')
  assert.equal(bearbeitePlanungInAkte(prosa, aenderung({ workstreams: [{ id: 'A', schaetzung: null }] }), null, '2026-10-24').ok, false)
  assert.equal(bearbeitePlanungInAkte(AKTE, aenderung({ workstreams: [{ id: 'Z', schaetzung: null }] }), null, '2026-10-24').ok, false)
  const kaputt = AKTE.replace('| geplant |  –  |', '| unsinn |  –  |')
  const r = bearbeitePlanungInAkte(kaputt, aenderung({ workstreams: [{ id: 'A', schaetzung: null }] }), null, '2026-10-24')
  assert.equal(r.ok, false)
})

test('Akte-Gate blockiert jeden Befund — auch einen schon vorher vorhandenen (wie B5a-1, Advisor B1)', () => {
  const alt = AKTE.replace('Status: IN_ARBEIT\n', 'Status: IN_ARBEIT\nAbgenommen: gestern\n')
  const r = bearbeitePlanungInAkte(alt, aenderung({ prioritaet: 'P1' }), null, '2026-10-24')
  assert.equal(r.ok, false)
  if (!r.ok) {
    assert.match(r.grund, /schon vor der Bearbeitung/)
    assert.ok(r.verstoesse?.some((v) => v.includes('Abgenommen')))
  }
})

test('Randfälle (qa 5): ID mit Leerzeichen, Datei ohne Zeilenende am Schluss, ungültige Priorität ersetzt, gleiche Priorität, ohne Status', () => {
  const mitLeer = AKTE.replace('| B | fixpaket | Zwei |', '| B2b Lauf | fixpaket | Zwei |')
  const leer = bearbeitePlanungInAkte(mitLeer, aenderung({ workstreams: [{ id: 'B2b Lauf', schaetzung: { min: 0.1, max: 0.1 } }] }), null, '2026-10-24')
  assert.ok(leer.ok && leer.inhalt.includes('| B2b Lauf | fixpaket | Zwei | geplant |  0,1  |'))

  const ohneEnde = AKTE.replace(/\n$/, '')
  const r1 = bearbeitePlanungInAkte(ohneEnde, aenderung({ prioritaet: 'P1' }), null, '2026-10-24')
  assert.ok(r1.ok && r1.inhalt.endsWith('- 2026-10-01 · Ziel · alt\n- 2026-10-24 · Priorität P1 · Test'))
  const ohneAbschnitt = AKTE.replace('\n## Änderungen\n- 2026-10-01 · Ziel · alt\n', '').replace(/\n+$/, '')
  const r2 = bearbeitePlanungInAkte(ohneAbschnitt, aenderung({ prioritaet: 'P1' }), null, '2026-10-24')
  assert.ok(r2.ok && r2.inhalt.endsWith('| B | fixpaket | Zwei | geplant |  –  | – | – | – | |\n\n## Änderungen\n- 2026-10-24 · Priorität P1 · Test\n'))

  const ungueltig = AKTE.replace('Status: IN_ARBEIT\n', 'Status: IN_ARBEIT\nPriorität: hoch\n')
  const r3 = bearbeitePlanungInAkte(ungueltig, aenderung({ prioritaet: 'P2' }), null, '2026-10-24')
  assert.ok(r3.ok && r3.inhalt.includes('\nPriorität: P2\n') && !r3.inhalt.includes('hoch'))
  assert.deepEqual(lesePlanung(r3.inhalt).befunde, [])

  const mitP1 = AKTE.replace('Status: IN_ARBEIT\n', 'Status: IN_ARBEIT\nPriorität: P1\n')
  assert.equal(bearbeitePlanungInAkte(mitP1, aenderung({ prioritaet: 'P1' }), null, '2026-10-24').ok, false)
  assert.equal(bearbeitePlanungInAkte(AKTE.replace('Status: IN_ARBEIT\n', ''), aenderung({ prioritaet: 'P1' }), null, '2026-10-24').ok, false)
})

test('pruefePlanungAenderung: prioritaet null mit eigener Meldung, Meilenstein-ID mit Leerzeichen zulässig (qa 7, qa 8)', () => {
  const r = pruefePlanungAenderung({ prioritaet: null, grund: 'g', hash: HASH })
  assert.ok(!r.ok && /Entfernen der Priorität/.test(r.grund))
  assert.ok(pruefePlanungAenderung({ meilenstein: 'Phase 1', roadmap_hash: HASH, grund: 'g', hash: HASH }).ok)
  assert.equal(pruefePlanungAenderung({ meilenstein: 'M\u00011', roadmap_hash: HASH, grund: 'g', hash: HASH }).ok, false)
})
