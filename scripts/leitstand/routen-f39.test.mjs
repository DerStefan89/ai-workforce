/**
 * Datei: scripts/leitstand/routen-f39.test.mjs
 *
 * Zweck: node:test-Fälle für die Zusammenführung der Architektur-Entscheidungen (findeWorkflowEntscheidungFuerSchritt)
 * und offeneArchitekturFragen (F45 B2b-1b-2a, features/F45/plan-b2b1b2.md, Entscheidung Stefan H1). Die Route selbst
 * prüft scripts/check-f39-architekt.mjs, den Ablauf mit Plan v2 scripts/check-f45-b2b1-rueckweg.mjs (c7)(c11).
 *
 * Wird aufgerufen von: npm run test (node --test).
 */

import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../../src/startvorlage/index.ts'
import { raeumeVerzeichnis } from '../_aufraeumen.ts'
import { findeWorkflowEntscheidungFuerSchritt, offeneArchitekturFragen, registriereWorkflowEntscheidung } from './routen-f39.mjs'

// Eine echte Profilreferenz — der Checkpoint Store verwirft Einträge mit ungültiger Referenz beim Lesen.
const PROFIL = leiteProfilReferenzAb(ladeStartvorlage('startvorlagen/beispielprojekt.json'))
const STACK = { frage: 'Welcher Stack?', optionen: [{ titel: 'Node' }, { titel: 'Python' }] }
const NEU = { frage: 'Welche Ablage?', optionen: [{ titel: 'Dateien' }, { titel: 'SQLite' }] }

test('findeWorkflowEntscheidungFuerSchritt führt alle Versionen derselben schritt_id zusammen (letzte Antwort je Frage)', () => {
  const basis = mkdtempSync(join(tmpdir(), 'routen-f39-test-'))
  try {
    assert.equal(findeWorkflowEntscheidungFuerSchritt(basis, 'wf', 's1'), null)
    registriereWorkflowEntscheidung(basis, 'wf', PROFIL, 's1', [{ frage: STACK.frage, gewaehlt: 'Node' }], '2026-10-14T10:00:00.000Z')
    registriereWorkflowEntscheidung(basis, 'wf', PROFIL, 's9', [{ frage: STACK.frage, gewaehlt: 'Python' }], '2026-10-14T10:30:00.000Z')
    registriereWorkflowEntscheidung(basis, 'wf', PROFIL, 's1', [{ frage: NEU.frage, gewaehlt: 'SQLite' }], '2026-10-14T11:00:00.000Z')
    const e = findeWorkflowEntscheidungFuerSchritt(basis, 'wf', 's1')
    assert.deepEqual(e.antworten, [{ frage: STACK.frage, gewaehlt: 'Node' }, { frage: NEU.frage, gewaehlt: 'SQLite' }])
    assert.equal(e.entschieden_am, '2026-10-14T11:00:00.000Z')
    registriereWorkflowEntscheidung(basis, 'wf', PROFIL, 's1', [{ frage: STACK.frage, gewaehlt: 'Python' }], '2026-10-14T12:00:00.000Z')
    assert.deepEqual(findeWorkflowEntscheidungFuerSchritt(basis, 'wf', 's1').antworten[0], { frage: STACK.frage, gewaehlt: 'Python' })
  } finally {
    raeumeVerzeichnis(basis)
  }
})

test('offeneArchitekturFragen: ohne Entscheidung alle, mit Zusammenführung nur die neuen; geänderte Optionen machen die Frage wieder offen', () => {
  assert.deepEqual(offeneArchitekturFragen([STACK, NEU], null), [STACK, NEU])
  const entscheidung = { schritt_id: 's1', antworten: [{ frage: STACK.frage, gewaehlt: 'Node' }], entschieden_am: 'x' }
  assert.deepEqual(offeneArchitekturFragen([STACK, NEU], entscheidung), [NEU])
  assert.deepEqual(offeneArchitekturFragen([{ ...STACK, optionen: [{ titel: 'Deno' }] }], entscheidung).length, 1)
  assert.deepEqual(offeneArchitekturFragen([], entscheidung), [])
})
