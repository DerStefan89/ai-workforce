/**
 * Datei: src/auftrag/auftrag.test.ts
 *
 * Zweck: node:test-Fall für das Auftrag-Modul (F11 WS-1, state/tasks/
 * f11-auftrag-ws1.md). Belegt AK1: registriereAuftrag registriert unter
 * der Artefakt-ID auftrag-<auftragId>, mit leerem eingaben-Array (D2) und
 * der erwarteten AUFTRAG_V0-Payload-Form.
 */

import { randomUUID } from 'node:crypto'
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { registriereAuftrag } from './index.ts'
import { ladeArtefaktVersion } from '../lineage-registry/index.ts'
import type { ProfilReferenz } from '../checkpoint-store/types.ts'

const BASIS = 'kontrollzustand-test'
const PROFIL_REFERENZ: ProfilReferenz = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
const stillerSchreiber = () => {}

function raeumeAuf(auftragId: string): void {
  rmSync(join(BASIS, `lineage-auftrag-${auftragId}`), { recursive: true, force: true })
}

test('AK1: registriereAuftrag registriert AUFTRAG_V0 unter auftrag-<auftragId> mit leerem eingaben-Array', () => {
  const auftragId = `test-auftrag-${randomUUID()}`
  try {
    const ergebnis = registriereAuftrag(auftragId, PROFIL_REFERENZ, 'Testtitel', 'Testauftragstext', {
      basisVerzeichnis: BASIS,
      schreiber: stillerSchreiber,
    })
    assert.strictEqual(ergebnis.versionSequenz, 1)

    const version = ladeArtefaktVersion(`auftrag-${auftragId}`, undefined, { basisVerzeichnis: BASIS, schreiber: stillerSchreiber })
    assert.ok(version)
    assert.strictEqual(version.erzeugungsart, 'kern')
    assert.strictEqual(version.eingaben.length, 0)
    assert.deepStrictEqual(version.daten, {
      auftrag_schema: 'v0',
      auftrag_id: auftragId,
      titel: 'Testtitel',
      auftragstext: 'Testauftragstext',
      erstellt_am: (version.daten as { erstellt_am: string }).erstellt_am,
    })
  } finally {
    raeumeAuf(auftragId)
  }
})
