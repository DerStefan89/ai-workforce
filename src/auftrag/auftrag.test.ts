/**
 * Datei: src/auftrag/auftrag.test.ts
 *
 * Zweck: node:test-Fall für das Auftrag-Modul (F11 WS-1, state/tasks/
 * f11-auftrag-ws1.md). Belegt AK1: registriereAuftrag registriert unter
 * der Artefakt-ID auftrag-<auftragId>, mit leerem eingaben-Array (D2) und
 * der erwarteten AUFTRAG_V0-Payload-Form.
 */

import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { registriereAuftrag, validiereAuftragAkzeptanzkriterien, validiereAuftragDaten, validiereAuftragNichtZiele } from './index.ts'
import { ladeArtefaktVersion } from '../lineage-registry/index.ts'
import type { ProfilReferenz } from '../checkpoint-store/types.ts'
import { raeumeVerzeichnis } from '../../scripts/_aufraeumen.ts'

const BASIS = 'kontrollzustand-test'
const PROFIL_REFERENZ: ProfilReferenz = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
const stillerSchreiber = () => {}

function raeumeAuf(auftragId: string): void {
  raeumeVerzeichnis(join(BASIS, `lineage-auftrag-${auftragId}`))
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

// ─── F35 WS-1: akzeptanzkriterien/nicht_ziele/herkunft.art 'feature_akte' ──────────────────

test('F35 WS-1: registriereAuftrag schreibt akzeptanzkriterien/nicht_ziele/herkunft nur, wenn übergeben', () => {
  const auftragId = `test-auftrag-${randomUUID()}`
  try {
    registriereAuftrag(auftragId, PROFIL_REFERENZ, 'Testtitel', 'Testauftragstext\n\nworkitem:feature:F99', {
      basisVerzeichnis: BASIS,
      schreiber: stillerSchreiber,
      herkunft: { art: 'feature_akte' },
      akzeptanzkriterien: [{ id: 'AK1', text: 'Erstes AK.' }],
      nicht_ziele: ['Ein Nicht-Ziel.'],
    })
    const version = ladeArtefaktVersion(`auftrag-${auftragId}`, undefined, { basisVerzeichnis: BASIS, schreiber: stillerSchreiber })
    assert.deepStrictEqual((version?.daten as Record<string, unknown>).herkunft, { art: 'feature_akte' })
    assert.deepStrictEqual((version?.daten as Record<string, unknown>).akzeptanzkriterien, [{ id: 'AK1', text: 'Erstes AK.' }])
    assert.deepStrictEqual((version?.daten as Record<string, unknown>).nicht_ziele, ['Ein Nicht-Ziel.'])
  } finally {
    raeumeAuf(auftragId)
  }
})

test('validiereAuftragAkzeptanzkriterien: gültig, leeres Array, unbekannte ID/Fremdfeld, doppelte ID', () => {
  assert.deepStrictEqual(validiereAuftragAkzeptanzkriterien([{ id: 'AK1', text: 'Text.' }, { id: 'AK2', text: 'Text 2.' }]), [])
  assert.notStrictEqual(validiereAuftragAkzeptanzkriterien([]).length, 0)
  assert.notStrictEqual(validiereAuftragAkzeptanzkriterien([{ id: 'X1', text: 'Text.' }]).length, 0)
  assert.notStrictEqual(validiereAuftragAkzeptanzkriterien([{ id: 'AK1', text: 'Text.', fremd: true }]).length, 0)
  assert.notStrictEqual(validiereAuftragAkzeptanzkriterien([{ id: 'AK1', text: 'Text.' }, { id: 'AK1', text: 'Text 2.' }]).length, 0)
  assert.notStrictEqual(validiereAuftragAkzeptanzkriterien('kein-array').length, 0)
})

test('validiereAuftragNichtZiele: gültig (auch leer), lehnt einen leeren/Nicht-String-Eintrag ab', () => {
  assert.deepStrictEqual(validiereAuftragNichtZiele([]), [])
  assert.deepStrictEqual(validiereAuftragNichtZiele(['Ein Nicht-Ziel.']), [])
  assert.notStrictEqual(validiereAuftragNichtZiele(['']).length, 0)
  assert.notStrictEqual(validiereAuftragNichtZiele([42]).length, 0)
  assert.notStrictEqual(validiereAuftragNichtZiele('kein-array').length, 0)
})

test('validiereAuftragDaten: akzeptanzkriterien/nicht_ziele bleiben additiv/optional — ein Alt-Auftrag ohne die Felder bleibt gültig', () => {
  const altAuftrag = { auftrag_schema: 'v0', auftrag_id: 'a1', titel: 'T', auftragstext: 'A', erstellt_am: '2026-01-01T00:00:00.000Z' }
  assert.deepStrictEqual(validiereAuftragDaten(altAuftrag), [])

  const mitFeldern = { ...altAuftrag, herkunft: { art: 'feature_akte' }, akzeptanzkriterien: [{ id: 'AK1', text: 'Text.' }], nicht_ziele: [] }
  assert.deepStrictEqual(validiereAuftragDaten(mitFeldern), [])

  const ungueltig = { ...altAuftrag, akzeptanzkriterien: [] }
  assert.notStrictEqual(validiereAuftragDaten(ungueltig).length, 0)
})
