/**
 * Datei: public/leitstand/fokus-daten.test.mjs
 *
 * Zweck: node:test-Fälle für die reinen Funktionen des Fokus-Moduls (F44 WS-2b):
 * waehleFokusWorkflow (seit F44 WS-3a in der Reihenfolge von baueEntscheidungen, F-913),
 * waehleLetztenLauf, schrittFolge. Belegt zugleich, dass das Modul in Node
 * ohne DOM und Storage importierbar ist.
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { baueEntscheidungen } from './attention-daten.js'
import { schrittFolge, waehleFokusWorkflow, waehleLetztenLauf } from './fokus-daten.js'

test('waehleFokusWorkflow: ohne Liste oder leer → null', () => {
  assert.equal(waehleFokusWorkflow(null), null)
  assert.equal(waehleFokusWorkflow(undefined), null)
  assert.equal(waehleFokusWorkflow([]), null)
})

test('waehleFokusWorkflow: ein wartender Workflow geht vor einem laufenden', () => {
  const laufend = { workflowId: 'w-1', status: 'LAEUFT', naechster: { art: 'starte' } }
  const wartend = { workflowId: 'w-2', status: 'KLAERUNG_ERFORDERLICH', naechster: { art: 'haltKlaerung' } }
  assert.equal(waehleFokusWorkflow([laufend, wartend]).workflowId, 'w-2')
})

test('F-913: eine Freigabe geht einer früher gelisteten Rückfrage vor — wie „Deine nächsten Entscheidungen“', () => {
  const rueckfrage = { workflowId: 'w-r', status: 'KLAERUNG_ERFORDERLICH', naechster: { art: 'haltKlaerung' } }
  const freigabe = { workflowId: 'w-f', status: 'LAEUFT', naechster: { art: 'haltFreigabe' } }
  const workflows = [rueckfrage, freigabe]
  assert.equal(waehleFokusWorkflow(workflows).workflowId, 'w-f')
  // Dieselbe Wahl wie der erste Eintrag der Entscheidungsliste (B3 = B7), nicht nur zufällig gleich.
  assert.equal(waehleFokusWorkflow(workflows).workflowId, baueEntscheidungen({ workflows }, []).eintraege[0].id)
  // Nur Rückfragen: die erste Rückfrage.
  assert.equal(waehleFokusWorkflow([{ ...rueckfrage, workflowId: 'w-r1' }, { ...rueckfrage, workflowId: 'w-r2' }]).workflowId, 'w-r1')
})

test('waehleFokusWorkflow: ohne Wartenden der laufende, sonst der erste', () => {
  const fertig = { workflowId: 'w-1', status: 'ABGESCHLOSSEN', naechster: { art: 'fertig' } }
  const laufend = { workflowId: 'w-2', status: 'LAEUFT', naechster: null }
  assert.equal(waehleFokusWorkflow([fertig, laufend]).workflowId, 'w-2')
  assert.equal(waehleFokusWorkflow([fertig]).workflowId, 'w-1')
})

test('waehleLetztenLauf: der jüngste nach zeitpunkt; ohne Zeitpunkt zählt er nicht', () => {
  assert.equal(waehleLetztenLauf(null), null)
  assert.equal(waehleLetztenLauf([]), null)
  const laeufe = [
    { laufId: 'a', zeitpunkt: '2026-09-30T10:00:00Z' },
    { laufId: 'b', zeitpunkt: null },
    { laufId: 'c', zeitpunkt: '2026-10-01T08:00:00Z' },
  ]
  assert.equal(waehleLetztenLauf(laeufe).laufId, 'c')
  assert.equal(waehleLetztenLauf([{ laufId: 'x', zeitpunkt: null }]).laufId, 'x')
})

test('schrittFolge: Jetzt nach naechster.schrittId, Zuvor über nachfolger, Danach als nachfolger', () => {
  const schritte = [
    { schritt_id: 's1', rolle: 'architecture-advisor', status: 'ERFOLGREICH', nachfolger: 's2' },
    { schritt_id: 's2', rolle: 'ausfuehrung', status: 'WARTET_FREIGABE', nachfolger: 's3' },
    { schritt_id: 's3', rolle: 'code-reviewer', status: 'OFFEN', nachfolger: null },
  ]
  const folge = schrittFolge({ naechster: { art: 'haltFreigabe', schrittId: 's2' }, aktiverSchrittId: 's1' }, schritte)
  assert.equal(folge.zuvor.schritt_id, 's1')
  assert.equal(folge.jetzt.schritt_id, 's2')
  assert.equal(folge.danach.schritt_id, 's3')
})

test('schrittFolge: ein laufender Schritt geht vor Verdikt und Cursor; am Rand null', () => {
  const schritte = [
    { schritt_id: 's1', rolle: 'ausfuehrung', status: 'LAEUFT', nachfolger: 's2' },
    { schritt_id: 's2', rolle: 'qa', status: 'OFFEN', nachfolger: null },
  ]
  const folge = schrittFolge({ naechster: { art: 'starte', schrittId: 's2' }, aktiverSchrittId: 's2' }, schritte)
  assert.equal(folge.jetzt.schritt_id, 's1')
  assert.equal(folge.zuvor, null)
  assert.equal(folge.danach.schritt_id, 's2')
})

test('schrittFolge: ohne laufenden Schritt und ohne Verdikt der Cursor', () => {
  const schritte = [
    { schritt_id: 's1', rolle: 'ausfuehrung', status: 'ERFOLGREICH', nachfolger: 's2' },
    { schritt_id: 's2', rolle: 'qa', status: 'OFFEN', nachfolger: null },
  ]
  const folge = schrittFolge({ naechster: null, aktiverSchrittId: 's2' }, schritte)
  assert.equal(folge.jetzt.schritt_id, 's2')
  assert.equal(folge.zuvor.schritt_id, 's1')
  assert.equal(folge.danach, null)
})

test('schrittFolge: ohne Schritte oder ohne bestimmbaren Jetzt-Schritt alles null', () => {
  const leer = { zuvor: null, jetzt: null, danach: null }
  assert.deepEqual(schrittFolge({}, null), leer)
  assert.deepEqual(schrittFolge({}, []), leer)
  assert.deepEqual(schrittFolge({ naechster: { schrittId: 'fehlt' } }, [{ schritt_id: 's1', status: 'ERFOLGREICH' }]), leer)
})
