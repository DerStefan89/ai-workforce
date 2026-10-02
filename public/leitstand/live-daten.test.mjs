/**
 * Datei: public/leitstand/live-daten.test.mjs
 *
 * Zweck: node:test für die reinen Datenfunktionen der Live-Ansicht (F46 D5, live-daten.js): Filter der
 * Aktivität (Warnungen ohne Quelle), Zuordnung Lauf → Workflow-Schritt, Kandidaten-Workflows,
 * Ablaufleiste, Zeitgrenze und Dauer, „Als Nächstes“.
 *
 * Wird aufgerufen von: `npm test` (node --test)
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ablaufStufen, filtereAktivitaet, findeLaufSchritt, kandidatenWorkflows, laufDauerMinuten, laufStart, minutenSeit, outputSchritte, waehleAlsNaechstes, zeitgrenzeStand } from './live-daten.js'

const EINTRAEGE = [
  { zeit: '2026-10-03T10:05:00Z', werkzeug: 'Edit', ziel: 'a.js', art: 'aendert' },
  { zeit: '2026-10-03T10:04:00Z', werkzeug: 'Bash', ziel: 'npm run check', art: 'befehl' },
  { zeit: '2026-10-03T10:03:00Z', werkzeug: 'Skill', ziel: 'frontend-design', art: 'faehigkeit' },
  { zeit: '2026-10-03T10:02:00Z', werkzeug: 'Read', ziel: 'CLAUDE.md', art: 'liest' },
]

test('filtereAktivitaet: Alle, je Art, Warnungen ohne Quelle leer, kein Array → leer', () => {
  assert.equal(filtereAktivitaet(EINTRAEGE, 'alle').length, 4)
  assert.deepEqual(filtereAktivitaet(EINTRAEGE, 'aendert').map((e) => e.werkzeug), ['Edit'])
  assert.deepEqual(filtereAktivitaet(EINTRAEGE, 'befehl').map((e) => e.werkzeug), ['Bash'])
  assert.deepEqual(filtereAktivitaet(EINTRAEGE, 'faehigkeit').map((e) => e.werkzeug), ['Skill'])
  assert.deepEqual(filtereAktivitaet(EINTRAEGE, 'warnungen'), [])
  assert.deepEqual(filtereAktivitaet(null, 'alle'), [])
})

test('findeLaufSchritt und kandidatenWorkflows: Zuordnung über lauf_id, Kandidaten über auftragId und laufende', () => {
  const wf = { workflowId: 'wf-1', daten: { schritte: [{ schritt_id: 's1', lauf_id: 'l-alt' }, { schritt_id: 's2', lauf_id: 'l-1' }] } }
  assert.equal(findeLaufSchritt([wf], 'l-1').schritt.schritt_id, 's2')
  assert.equal(findeLaufSchritt([wf], 'l-x'), null)
  assert.equal(findeLaufSchritt(null, 'l-1'), null)
  const workflows = [
    { workflowId: 'a', auftragId: 'au-1', status: 'ABGESCHLOSSEN' },
    { workflowId: 'b', auftragId: 'au-2', status: 'LAEUFT' },
    { workflowId: 'c', auftragId: 'au-1', status: 'OFFEN' },
    { workflowId: 'd', auftragId: 'au-3', status: 'LAEUFT' },
  ]
  assert.deepEqual(kandidatenWorkflows(workflows, 'au-1', false), ['a', 'c'])
  assert.deepEqual(kandidatenWorkflows(workflows, 'au-1', true), ['b', 'd', 'a'], 'laufende zuerst, auch bei vielen alten Workflows desselben Auftrags')
  assert.deepEqual(kandidatenWorkflows(workflows, null, true, 5), ['b', 'd'])
  assert.deepEqual(kandidatenWorkflows(null, 'au-1', true), [])
})

test('ablaufStufen: Plan, Freigabe, Bau, Prüfschritt, Review aus den Schritten; Sichern und Merge kommen', () => {
  const schritte = [
    { rolle: 'architekt', status: 'ERFOLGREICH' },
    { rolle: 'ausfuehrung', status: 'LAEUFT', freigabe: 'ZWINGEND' },
    { rolle: 'code-reviewer', status: 'OFFEN' },
  ]
  assert.deepEqual(
    ablaufStufen(schritte, { status: 'noch_nicht_gelaufen' }).map((s) => `${s.id}:${s.status}`),
    ['plan:fertig', 'freigabe:fertig', 'bau:jetzt', 'pruefschritt:offen', 'review:offen', 'sichern:kommt', 'merge:kommt']
  )
  const wartet = ablaufStufen([{ rolle: 'ausfuehrung', status: 'WARTET_FREIGABE', freigabe: 'ZWINGEND' }])
  assert.equal(wartet.find((s) => s.id === 'freigabe').status, 'jetzt')
  assert.equal(wartet.find((s) => s.id === 'plan').status, 'ohne')
  const automatisch = ablaufStufen([{ rolle: 'ausfuehrung', status: 'ERFOLGREICH', freigabe: 'AUTOMATISCH' }], { status: 'ok', ergebnis: 'ROT' })
  assert.equal(automatisch.find((s) => s.id === 'freigabe').status, 'ohne')
  assert.equal(automatisch.find((s) => s.id === 'pruefschritt').status, 'fehler')
  assert.equal(ablaufStufen([{ rolle: 'code-reviewer', status: 'FEHLGESCHLAGEN' }]).find((s) => s.id === 'review').status, 'fehler')
  assert.equal(ablaufStufen(null).find((s) => s.id === 'bau').status, 'ohne')
})

test('Zeit: Start, Dauer, Zeitgrenze mit Rest und Anteil; ungültige Werte → null', () => {
  const checkpoints = [
    { zeitstempel: '2026-10-03T10:24:00Z', gueltig: true },
    { zeitstempel: '2026-10-03T10:00:00Z', gueltig: true },
    { zeitstempel: 'kaputt', gueltig: true },
    { zeitstempel: '2026-10-03T09:00:00Z', gueltig: false },
  ]
  assert.equal(laufStart(checkpoints), '2026-10-03T10:00:00Z')
  assert.equal(laufDauerMinuten(checkpoints), 24)
  assert.equal(laufDauerMinuten([checkpoints[0]]), null)
  const jetzt = Date.parse('2026-10-03T10:18:00Z')
  assert.equal(minutenSeit('2026-10-03T10:00:00Z', jetzt), 18)
  assert.deepEqual(zeitgrenzeStand('2026-10-03T10:00:00Z', 1800000, jetzt), { grenzeMinuten: 30, restMinuten: 12, anteil: 0.6 })
  assert.equal(zeitgrenzeStand('2026-10-03T10:00:00Z', null, jetzt), null)
  assert.equal(zeitgrenzeStand(null, 1800000, jetzt), null)
  assert.equal(zeitgrenzeStand('2026-10-03T09:00:00Z', 1800000, jetzt).restMinuten, 0)
})

test('outputSchritte: nur begonnene oder fertige Schritte', () => {
  const schritte = [{ status: 'ERFOLGREICH' }, { status: 'LAEUFT' }, { status: 'OFFEN' }, { status: 'WARTET_FREIGABE' }, null]
  assert.deepEqual(outputSchritte(schritte).map((s) => s.status), ['ERFOLGREICH', 'LAEUFT'])
  assert.deepEqual(outputSchritte(undefined), [])
})

test('waehleAlsNaechstes: offene Entscheidung vor startbereitem Schritt, sonst null', () => {
  const freigabe = { workflowId: 'wf-1', ziel: 'Live-Ansicht', status: 'WARTET_FREIGABE', naechster: { art: 'haltFreigabe', schrittId: 's1', grund: 'wartet' }, abnahme: { offen: false } }
  const starte = { workflowId: 'wf-2', ziel: 'Review', status: 'LAEUFT', naechster: { art: 'starte', schrittId: 's2', grund: 'bereit' }, abnahme: { offen: false } }
  const basis = { laeufe: [], startfehler: [] }
  const mitEntscheidung = waehleAlsNaechstes({ ...basis, workflows: [starte, freigabe] })
  assert.equal(mitEntscheidung.art, 'entscheidung')
  assert.equal(mitEntscheidung.eintrag.id, 'wf-1')
  const mitSchritt = waehleAlsNaechstes({ ...basis, workflows: [starte] })
  assert.equal(mitSchritt.art, 'schritt')
  assert.equal(mitSchritt.workflow.workflowId, 'wf-2')
  assert.equal(waehleAlsNaechstes({ ...basis, workflows: [] }), null)
  assert.equal(waehleAlsNaechstes(null), null)
})
