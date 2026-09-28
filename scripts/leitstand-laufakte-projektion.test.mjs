/**
 * Datei: scripts/leitstand-laufakte-projektion.test.mjs
 *
 * Zweck: F36 WS-4 (AK8) — baueLaufakteProjektion (GET /api/laeufe/<laufId>,
 * detail.laufakte) reicht das Laufakten-Feld `beobachtung` unverändert durch
 * und liefert null, wenn es fehlt (alte Laufakte, Codex).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { baueLaufakteProjektion } from './leitstand-server.mjs'

const BEOBACHTUNG = {
  init_tools: ['Read'],
  init_agents: ['qa'],
  init_skills: ['ponytail'],
  init_mcp_server: [],
  skill_aufrufe: ['ponytail'],
  subagent_aufrufe: [],
  mcp_aufrufe: [],
}

test('baueLaufakteProjektion: beobachtung wird durchgereicht', () => {
  assert.deepStrictEqual(baueLaufakteProjektion({ daten: { beobachtung: BEOBACHTUNG } }).beobachtung, BEOBACHTUNG)
})

test('baueLaufakteProjektion: fehlendes Feld → null', () => {
  assert.strictEqual(baueLaufakteProjektion({ daten: { worker: 'codex' } }).beobachtung, null)
})
