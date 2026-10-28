/**
 * Datei: scripts/leitstand/umfang-stand.test.mjs
 *
 * Zweck: node:test-Fälle für die Schale des Umfangs-Abgleichs (F45 B2b-3d, scripts/leitstand/umfang-stand.mjs): Feld nur mit
 * Bereichen und nur bei nicht degradierter Übersicht, nie ein Wurf; Projektion je Lage; Zeile aus der festgehaltenen Übersicht.
 */

import { join } from 'node:path'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
import { registriereKernArtefakt } from '../../src/lineage-registry/index.ts'
import { raeumeVerzeichnis } from '../_aufraeumen.ts'
import { baueUmfangProjektion, ermittleUmfangFuerUebersicht, leseUmfangsZeile } from './umfang-stand.mjs'
import { wegwerfOrdner } from '../_wegwerf.ts'

/** Wegwerf-Wurzel dieses Laufs unter os.tmpdir() (F45 W2b-2), beim Prozessende geräumt. */
const WEGWERF = wegwerfOrdner('umfang-stand')

const UEBERSICHT = { aenderungsuebersicht_schema: 'v0', lauf_id: 'l1', erzeugt_am: '2026-10-16T00:00:00.000Z', basis_ref: 'abc', dateien: [{ pfad: 'src/a.ts', status: 'GEAENDERT', plus: 1, minus: 0 }, { pfad: 'docs/x.md', status: 'NEU', plus: null, minus: null }], stat_text: '', patch: '', gekuerzt: false, budget_bytes: 1 }
const PROFIL = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
const DEGRADIERT = { ...UEBERSICHT, dateien: [], stat_text: 'Ermittlung nicht möglich: kein Git-Repository oder kein Commit unter HEAD an der Repo-Wurzel.' }

test('ermittleUmfangFuerUebersicht: ohne Bereiche nichts, mit Bereichen das Feld, degradiert nichts', () => {
  assert.deepEqual(ermittleUmfangFuerUebersicht('l1', UEBERSICHT, undefined), {})
  assert.deepEqual(ermittleUmfangFuerUebersicht('l1', UEBERSICHT, []), {})
  assert.deepEqual(ermittleUmfangFuerUebersicht('l1', UEBERSICHT, ['src/']), { umfang: { bereiche: ['src/'], ausserhalb: ['docs/x.md'] } })
  assert.deepEqual(ermittleUmfangFuerUebersicht('l1', DEGRADIERT, ['src/']), {})
})

test('ermittleUmfangFuerUebersicht: Formfehler (leerer Bereichseintrag) oder kaputte Übersicht ⇒ kein Feld, kein Wurf', () => {
  assert.deepEqual(ermittleUmfangFuerUebersicht('l1', UEBERSICHT, ['']), {})
  assert.deepEqual(ermittleUmfangFuerUebersicht('l1', { ...UEBERSICHT, dateien: null }, ['src/']), {})
})

test('baueUmfangProjektion: Lagen kein_abgleich, noch_nicht_gelaufen, nicht_bestimmbar, ok', () => {
  assert.deepEqual(baueUmfangProjektion(undefined, true, UEBERSICHT), { status: 'kein_abgleich', ausserhalb: [] })
  assert.deepEqual(baueUmfangProjektion(['src/'], false, null), { status: 'noch_nicht_gelaufen', ausserhalb: [] })
  assert.deepEqual(baueUmfangProjektion(['src/'], true, null), { status: 'nicht_bestimmbar', ausserhalb: [] })
  assert.deepEqual(baueUmfangProjektion(['src/'], true, DEGRADIERT), { status: 'nicht_bestimmbar', ausserhalb: [] })
  assert.deepEqual(baueUmfangProjektion(['src/'], true, { ...UEBERSICHT, umfang: { bereiche: ['src/'], ausserhalb: ['docs/x.md'] } }), { status: 'ok', ausserhalb: ['docs/x.md'], bereiche: ['src/'] })
})

test('leseUmfangsZeile: aus der festgehaltenen Übersicht; ohne Lauf, Artefakt oder Treffer leer', () => {
  const basisVerzeichnis = join(WEGWERF, `umfang-stand-${randomUUID()}`)
  const ladeOptionen = { basisVerzeichnis, schreiber: () => {} }
  try {
    registriereKernArtefakt('aenderungsuebersicht-l1', PROFIL, { erzeuger: 'kern' }, { ...UEBERSICHT, umfang: { bereiche: ['src/'], ausserhalb: ['docs/x.md'] } }, [], ladeOptionen)
    registriereKernArtefakt('aenderungsuebersicht-l2', PROFIL, { erzeuger: 'kern' }, { ...UEBERSICHT, lauf_id: 'l2', umfang: { bereiche: ['src/'], ausserhalb: [] } }, [], ladeOptionen)
    assert.equal(leseUmfangsZeile('l1', ladeOptionen), 'Diese Dateien liegen außerhalb der vereinbarten Bereiche: docs/x.md')
    assert.equal(leseUmfangsZeile('l2', ladeOptionen), '')
    assert.equal(leseUmfangsZeile('fehlt', ladeOptionen), '')
    assert.equal(leseUmfangsZeile(null, ladeOptionen), '')
  } finally {
    raeumeVerzeichnis(basisVerzeichnis)
  }
})

test('baueUmfangProjektion (Korrekturrunde): Ausführung läuft noch ⇒ noch_nicht_gelaufen; ok nennt die vereinbarten Bereiche', () => {
  assert.deepEqual(baueUmfangProjektion(['src/'], false, null), { status: 'noch_nicht_gelaufen', ausserhalb: [] })
  assert.deepEqual(baueUmfangProjektion(['src/'], true, { ...UEBERSICHT, umfang: { bereiche: ['src/'], ausserhalb: ['docs/x.md'] } }), { status: 'ok', ausserhalb: ['docs/x.md'], bereiche: ['src/'] })
})
