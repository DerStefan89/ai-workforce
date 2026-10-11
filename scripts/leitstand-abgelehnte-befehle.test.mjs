/**
 * Datei: scripts/leitstand-abgelehnte-befehle.test.mjs
 *
 * Zweck: F45 S (F-1005, QA-Pass) — leseAbgelehnteBefehleAusRohstrom liefert die abgelehnten Befehle für
 * den F-760-Halt-Grund maskiert: ein Token oder Authorization-Kopf im Befehl erscheint weder im Grund noch
 * im Kontrollzustand im Klartext; ein harmloser Befehl bleibt unverändert, Codex-Läufe liefern [].
 *
 * Wird aufgerufen von:
 * - npm run test (node --test)
 *
 * Wichtig: Alle „Geheimnisse“ hier sind erfundene Testdaten.
 */

import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { raeumeVerzeichnis } from './_aufraeumen.ts'
import { MASKE } from './leitstand/geheimnisse-maskieren.mjs'
import { leseAbgelehnteBefehleAusRohstrom } from './leitstand-server.mjs'

/**
 * Legt einen Rohstrom mit den gegebenen permission_denials an und ruft fn mit seinem Pfad auf.
 * @param denials - permission_denials des Ergebnisobjekts
 * @param fn - (pfad) => void
 */
function mitRohstrom(denials, fn) {
  const ordner = mkdtempSync(join(tmpdir(), 'f45s-abgelehnt-'))
  try {
    const pfad = join(ordner, 'rohstrom.json')
    writeFileSync(pfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: 'x', permission_denials: denials }) }))
    fn(pfad)
  } finally {
    raeumeVerzeichnis(ordner)
  }
}

test('abgelehnte Befehle: Geheimnis maskiert, harmloser Befehl und Werkzeug ohne Befehl unverändert', () => {
  const denials = [
    { tool_name: 'Bash', tool_input: { command: 'curl -H "Authorization: Bearer test-abcdefghijklmnop" https://x.invalid' } },
    { tool_name: 'Bash', tool_input: { command: 'export GITHUB_TOKEN=ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123 && gh pr list' } },
    { tool_name: 'Bash', tool_input: { command: 'git status | head' } },
    { tool_name: 'WebFetch', tool_input: { url: 'https://x.invalid' } },
  ]
  mitRohstrom(denials, (pfad) => {
    const befehle = leseAbgelehnteBefehleAusRohstrom({ worker: 'claude-code', rohstrom_referenz: { pfad } })
    assert.deepEqual(befehle, [
      `Bash: curl -H "Authorization: Bearer ${MASKE}" https://x.invalid`,
      `Bash: export GITHUB_TOKEN=${MASKE} && gh pr list`,
      'Bash: git status | head',
      'WebFetch',
    ])
    assert.ok(!befehle.join('\n').includes('abcdefghijklmnop'))
  })
})

test('abgelehnte Befehle: Codex-Lauf und nicht lesbarer Rohstrom liefern []', () => {
  mitRohstrom([{ tool_name: 'Bash', tool_input: { command: 'x' } }], (pfad) => {
    assert.deepEqual(leseAbgelehnteBefehleAusRohstrom({ worker: 'codex', rohstrom_referenz: { pfad } }), [])
  })
  assert.deepEqual(leseAbgelehnteBefehleAusRohstrom({ worker: 'claude-code', rohstrom_referenz: { pfad: join(tmpdir(), 'gibt-es-nicht-f45s.json') } }), [])
})
