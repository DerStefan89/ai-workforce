/**
 * Datei: scripts/leitstand-abnahme-stand.test.mjs
 *
 * Zweck: F46 D2 (abgleich-f46.md §4.4, F-972) — die eine Regel „Abnahme offen“
 * (ermittleAbnahmeStand in scripts/leitstand-server.mjs) und ihr Weg in die Workflow-Kopfdaten:
 * - Regel direkt: nicht fällig vor dem Abschluss bzw. ohne gelaufenen Bau, offen ohne
 *   Entscheidung, zu nach einer Entscheidung zum aktuellen Bau, wieder offen (veraltet) nach einem
 *   neuen Bau-Lauf.
 * - Cache-Stempel über echtes HTTP (GET /api/workflows, derselbe sammleWorkflows-Pfad wie
 *   GET /api/zustand): nach einem echten POST …/abnahme zeigt die NÄCHSTE Kopfdaten-Abfrage sofort
 *   offen=false (die Entscheidung liegt in einer eigenen Kette, die Workflow-Kette bleibt
 *   unverändert); nach einer neuen Workflow-Fassung mit neuem Bau-Lauf wieder offen=true.
 * - GET …/abnahme meldet dieselbe Lesart (entscheidung.status) wie die Kopfdaten.
 */

import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { test } from 'node:test'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { registriereWorkflow } from '../src/workflow/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'
import { erzeugeRequestHandler, ermittleAbnahmeStand } from './leitstand-server.mjs'

/**
 * Zweistufiger Workflow (Muster workflow-vorlagen/standard.json).
 * @param workflowId - Kennung
 * @param status - Workflow-Status
 * @param ausfuehrungLaufId - lauf_id des Ausführungsschritts, oder null
 * @returns WORKFLOW_V0-Datensatz
 */
function workflow(workflowId, status, ausfuehrungLaufId) {
  const schritt = (schritt_id, rolle, worker, output_schema, nachfolger, lauf_id) => ({
    schritt_id,
    rolle,
    werkzeugsatz: rolle === 'ausfuehrung' ? 'schreibend' : 'lesend',
    worker,
    modell: 'test-modell',
    eingaben: [],
    output_schema,
    freigabe: rolle === 'ausfuehrung' ? 'ZWINGEND' : 'AUTOMATISCH',
    risiko: 'Test-Fixture, kein reales Risiko.',
    zeitgrenze_ms: 600000,
    nachfolger,
    status: lauf_id === null ? 'OFFEN' : 'ERFOLGREICH',
    lauf_id,
  })
  return {
    workflow_schema: 'v0',
    workflow_id: workflowId,
    auftrag_id: 'auftrag-f46-d2-test',
    version: 1,
    ziel: 'F46 D2: Abnahmestand in den Kopfdaten.',
    status,
    aktiver_schritt_id: status === 'ABGESCHLOSSEN' ? null : 'schritt-1-ausfuehrung',
    grenzen: { max_schritte: 6, max_replans: 1 },
    schritte: [
      schritt('schritt-1-ausfuehrung', 'ausfuehrung', 'claude-code', null, 'schritt-2-review', ausfuehrungLaufId),
      schritt('schritt-2-review', 'code-reviewer', 'codex', 'ergebnis-code-reviewer', null, ausfuehrungLaufId === null ? null : `review-${ausfuehrungLaufId}`),
    ],
  }
}

/** @param laufId - bezug.ausfuehrung_lauf_id @returns Version wie ladeArtefaktVersion */
const entscheidung = (laufId) => ({ daten: { ergebnis: 'ANGENOMMEN', bezug: { ausfuehrung_lauf_id: laufId } } })

test('Regel: nicht fällig ohne Abschluss oder ohne gelaufenen Bau', () => {
  assert.deepStrictEqual(ermittleAbnahmeStand(workflow('w', 'OFFEN', null), null), { entscheidungStatus: 'nicht_vorhanden', faellig: false, offen: false, status: 'nicht_faellig' })
  assert.deepStrictEqual(ermittleAbnahmeStand(workflow('w', 'KLAERUNG_ERFORDERLICH', 'l1'), null).status, 'nicht_faellig')
  assert.deepStrictEqual(ermittleAbnahmeStand(workflow('w', 'ABGESCHLOSSEN', null), null).status, 'nicht_faellig')
  // Eine ungültige Fassung ohne Schritte stürzt nicht ab.
  assert.strictEqual(ermittleAbnahmeStand({ status: 'ABGESCHLOSSEN' }, null).offen, false)
  assert.strictEqual(ermittleAbnahmeStand(null, null).status, 'nicht_faellig')
})

test('Regel: offen ohne Entscheidung, zu mit Entscheidung zum Bau, veraltet nach neuem Bau', () => {
  assert.deepStrictEqual(ermittleAbnahmeStand(workflow('w', 'ABGESCHLOSSEN', 'l1'), null), { entscheidungStatus: 'nicht_vorhanden', faellig: true, offen: true, status: 'nicht_vorhanden' })
  assert.deepStrictEqual(ermittleAbnahmeStand(workflow('w', 'ABGESCHLOSSEN', 'l1'), entscheidung('l1')), { entscheidungStatus: 'ok', faellig: true, offen: false, status: 'ok' })
  assert.deepStrictEqual(ermittleAbnahmeStand(workflow('w', 'ABGESCHLOSSEN', 'l2'), entscheidung('l1')), { entscheidungStatus: 'veraltet', faellig: true, offen: true, status: 'veraltet' })
  // Eine Entscheidung vor dem Abschluss ändert nichts an „nicht fällig“, ihre Lesart bleibt aber erhalten (GET …/abnahme).
  assert.deepStrictEqual(ermittleAbnahmeStand(workflow('w', 'WARTET_FREIGABE', 'l1'), entscheidung('l1')), { entscheidungStatus: 'ok', faellig: false, offen: false, status: 'nicht_faellig' })
})

test('Kopfdaten: nach einer Abnahme sofort offen=false, nach einem neuen Bau-Lauf wieder offen=true (Cache-Stempel)', async () => {
  const basisVerzeichnis = `kontrollzustand-test-f46-d2-${randomUUID()}`
  const ladeOptionen = { basisVerzeichnis, schreiber: () => {} }
  const profil = leiteProfilReferenzAb(ladeStartvorlage('startvorlagen/beispielprojekt.json'))
  const workflowId = `f46-d2-${randomUUID()}`
  const server = createServer(erzeugeRequestHandler({ basisVerzeichnis }))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const basisUrl = `http://127.0.0.1:${server.address().port}`
  const kopfdaten = async () => (await fetch(`${basisUrl}/api/workflows`).then((r) => r.json())).find((w) => w.workflowId === workflowId)
  try {
    registriereWorkflow(workflow(workflowId, 'LAEUFT', null), profil, ladeOptionen)
    assert.deepStrictEqual((await kopfdaten()).abnahme, { offen: false, status: 'nicht_faellig' })

    registriereWorkflow(workflow(workflowId, 'ABGESCHLOSSEN', 'bau-1'), profil, ladeOptionen)
    assert.deepStrictEqual((await kopfdaten()).abnahme, { offen: true, status: 'nicht_vorhanden' }, 'abgeschlossen ohne Entscheidung: offen')

    // Echter Entscheidungsweg (POST …/abnahme, unverändert): ANGENOMMEN lässt die Workflow-Kette
    // unangetastet — nur der Stempel der Entscheidungs-Kette kann den Cache entwerten.
    const post = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/abnahme`, { method: 'POST', body: JSON.stringify({ ergebnis: 'ANGENOMMEN', begruendung: 'F46 D2 Cache-Test.' }) })
    assert.strictEqual(post.status, 200, JSON.stringify(await post.clone().json().catch(() => ({}))))
    assert.deepStrictEqual((await kopfdaten()).abnahme, { offen: false, status: 'ok' }, 'die nächste Abfrage nach der Abnahme zeigt offen=false')
    const abnahme = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/abnahme`).then((r) => r.json())
    assert.strictEqual(abnahme.entscheidung.status, 'ok', 'GET …/abnahme liest dieselbe Regel')

    registriereWorkflow(workflow(workflowId, 'ABGESCHLOSSEN', 'bau-2'), profil, ladeOptionen)
    assert.deepStrictEqual((await kopfdaten()).abnahme, { offen: true, status: 'veraltet' }, 'neuer Bau-Lauf: wieder offen')
    const abnahmeNeu = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/abnahme`).then((r) => r.json())
    assert.strictEqual(abnahmeNeu.entscheidung.status, 'veraltet')

    // Derselbe Wert steht im Zustands-Aggregat des einen Polls.
    const zustand = await fetch(`${basisUrl}/api/zustand`).then((r) => r.json())
    assert.deepStrictEqual(zustand.workflows.find((w) => w.workflowId === workflowId).abnahme, { offen: true, status: 'veraltet' })
  } finally {
    await new Promise((resolve) => server.close(resolve))
    raeumeVerzeichnis(basisVerzeichnis)
  }
})
