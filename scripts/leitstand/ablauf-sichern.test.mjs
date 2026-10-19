/**
 * Datei: scripts/leitstand/ablauf-sichern.test.mjs
 *
 * Zweck: Unit-Tests der Ableitung „Bereit zum Sichern“ (F45 B2b-4a-1): jeder Zweig von arbeitsordnerGrund und
 * leiteSichernLageAb, die Reihenfolge der Regeln, fehlende Felder, ein Text je Grund ohne Kennung, mitAblauf ohne Mutation.
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import { arbeitsordnerGrund, leiteSichernLageAb, mitAblauf, SICHERN_GRUENDE, SICHERN_GRUND_TEXT } from './ablauf-sichern.mjs'

/**
 * Code-Projektion mit gegebener Dateizahl und gegebenem Vorsprung vor main.
 * @param anzahl - geänderte Dateien
 * @param voraus - Commits noch nicht auf main
 * @returns Projektion
 */
function projektion(anzahl, voraus) {
  return { status: 'ok', dateien: { status: 'ok', eintraege: [], anzahl, gekappt: false }, basis: { status: 'ok', ref: 'main', voraus, zurueck: 0 } }
}

const BEREIT = { workflowStatus: 'ABGESCHLOSSEN', bedarf: 'pflicht' }

test('arbeitsordnerGrund: jede Lage der Projektion', () => {
  assert.equal(arbeitsordnerGrund({ status: 'kein_bedarf' }), null)
  assert.equal(arbeitsordnerGrund({ status: 'bestand' }), null)
  assert.equal(arbeitsordnerGrund({ status: 'fehlt', pfad: 'x', branch: 'wf/x' }), 'nichtAngelegt')
  assert.equal(arbeitsordnerGrund({ status: 'ENTFERNT', aufraeumen: { am: 'x' } }), 'aufgeraeumt')
  assert.equal(arbeitsordnerGrund({ status: 'IN_VORBEREITUNG', vorbereitungLaeuft: true }), 'inVorbereitung')
  // Aufräumen läuft: Status bleibt BEREIT, die Sperre ist belegt.
  assert.equal(arbeitsordnerGrund({ status: 'BEREIT', vorbereitungLaeuft: true, ordnerVorhanden: false }), 'inVorbereitung')
  assert.equal(arbeitsordnerGrund({ status: 'FEHLGESCHLAGEN', vorbereitungLaeuft: false }), 'fehlgeschlagen')
  assert.equal(arbeitsordnerGrund({ status: 'BEREIT', vorbereitungLaeuft: false, ordnerVorhanden: false }), 'ordnerFehlt')
  assert.equal(arbeitsordnerGrund({ status: 'BEREIT', vorbereitungLaeuft: false, ordnerVorhanden: true }), null)
})

test('arbeitsordnerGrund: unbekannte oder fehlende Form → nichtBestimmbar (fail-closed)', () => {
  for (const ao of [null, undefined, 'BEREIT', {}, { status: 'ANDERS' }]) assert.equal(arbeitsordnerGrund(ao), 'nichtBestimmbar', JSON.stringify(ao))
})

test('leiteSichernLageAb: bereit mit Dateien (commit) und nur mit Commits noch nicht auf main (push)', () => {
  assert.deepEqual(leiteSichernLageAb({ ...BEREIT, projektion: projektion(3, 0) }), { bereit: true, art: 'commit', grund: null, offeneAenderungen: 3, voraus: 0 })
  assert.deepEqual(leiteSichernLageAb({ ...BEREIT, projektion: projektion(2, 4) }), { bereit: true, art: 'commit', grund: null, offeneAenderungen: 2, voraus: 4 })
  assert.deepEqual(leiteSichernLageAb({ ...BEREIT, projektion: projektion(0, 1) }), { bereit: true, art: 'push', grund: null, offeneAenderungen: 0, voraus: 1 })
  assert.deepEqual(leiteSichernLageAb({ ...BEREIT, projektion: projektion(0, 0) }), { bereit: false, art: null, grund: 'nichtsOffen', offeneAenderungen: 0, voraus: 0 })
})

test('leiteSichernLageAb: Reihenfolge — nicht abgeschlossen vor kein Arbeitsordner vor nicht bestimmbar', () => {
  for (const status of ['OFFEN', 'LAEUFT', 'WARTET_FREIGABE', 'KLAERUNG_ERFORDERLICH', 'GESTOPPT', undefined]) {
    assert.equal(leiteSichernLageAb({ workflowStatus: status, bedarf: 'kein_bedarf', projektion: null }).grund, 'nichtAbgeschlossen', String(status))
  }
  for (const bedarf of ['kein_bedarf', 'bestand', undefined]) assert.equal(leiteSichernLageAb({ workflowStatus: 'ABGESCHLOSSEN', bedarf, projektion: projektion(5, 5) }).grund, 'keinArbeitsordner', String(bedarf))
})

test('leiteSichernLageAb: Projektion, dateien oder basis ohne status ok → nichtBestimmbar', () => {
  const p = projektion(1, 1)
  for (const kaputt of [null, undefined, { ...p, status: 'nicht_verfuegbar' }, { ...p, dateien: { status: 'fehler', grund: 'x' } }, { ...p, basis: { status: 'fehler', grund: 'weder origin/main noch main vorhanden' } }, { ...p, dateien: { status: 'ok' } }, { ...p, basis: { status: 'ok' } }]) {
    assert.equal(leiteSichernLageAb({ ...BEREIT, projektion: kaputt }).grund, 'nichtBestimmbar', JSON.stringify(kaputt))
  }
})

test('Gründe: eine Liste, je Grund ein Text ohne Kennung', () => {
  const ergebnisse = new Set()
  for (const ao of [{ status: 'fehlt' }, { status: 'ENTFERNT' }, { status: 'IN_VORBEREITUNG' }, { status: 'FEHLGESCHLAGEN' }, { status: 'BEREIT', ordnerVorhanden: false }, null]) ergebnisse.add(arbeitsordnerGrund(ao))
  for (const e of [{ workflowStatus: 'OFFEN' }, { workflowStatus: 'ABGESCHLOSSEN' }, { ...BEREIT, projektion: null }, { ...BEREIT, projektion: projektion(0, 0) }]) ergebnisse.add(leiteSichernLageAb(e).grund)
  assert.deepEqual([...ergebnisse].sort(), [...SICHERN_GRUENDE].sort(), 'jeder Grund wird erreicht, keiner fehlt in der Liste')
  assert.deepEqual(Object.keys(SICHERN_GRUND_TEXT).sort(), [...SICHERN_GRUENDE].sort())
  for (const text of Object.values(SICHERN_GRUND_TEXT)) {
    assert.ok(typeof text === 'string' && text.length > 0)
    assert.doesNotMatch(text, /wf\/|workflow-|[A-Za-z]:\\|\\/, `keine Kennung und kein Pfad: ${text}`)
  }
})

test('mitAblauf: hängt ablauf mit sichern an, verändert die geteilte Projektion nicht', () => {
  const p = projektion(1, 0)
  const vorher = JSON.stringify(p)
  const ablauf = { workflowId: 'wf-1', bedarf: 'pflicht', workflowStatus: 'ABGESCHLOSSEN', arbeitsordner: { pfad: 'C:\\x', branch: 'wf/wf-1' } }
  const antwort = mitAblauf(p, ablauf)
  assert.equal(JSON.stringify(p), vorher)
  assert.equal(antwort.status, 'ok')
  assert.deepEqual(antwort.ablauf, { ...ablauf, sichern: { bereit: true, art: 'commit', grund: null, offeneAenderungen: 1, voraus: 0 } })
})
