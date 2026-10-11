/**
 * Datei: scripts/projekt-nachruesten.test.mjs
 *
 * Zweck: F45 B1a-2 — Kommandozeile `npm run projekt:nachruesten`: falscher Aufruf und abgelehnte Ziele
 * enden mit Exit 2 und schreiben nichts. Die Regeln selbst prüft src/projekt-anlegen/nachruesten.test.ts.
 *
 * Wird aufgerufen von:
 * - npm run test (node --test)
 */

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const SKRIPT = join(import.meta.dirname, 'projekt-nachruesten.mjs')
const aussen = mkdtempSync(join(tmpdir(), 'nachruesten-cli-'))
after(() => raeumeVerzeichnis(aussen))

/**
 * Startet die CLI.
 * @param argumente - Argumente nach dem Skript
 * @returns spawnSync-Ergebnis
 */
const cli = (argumente) => spawnSync(process.execPath, [SKRIPT, ...argumente], { encoding: 'utf8' })

test('unbekannte Option und zwei Pfade → Exit 2 mit Aufrufhinweis', () => {
  const unbekannt = cli([aussen, '--anwende'])
  assert.equal(unbekannt.status, 2)
  assert.match(unbekannt.stderr, /Unbekannte Option: --anwende/)
  const zwei = cli([aussen, aussen])
  assert.equal(zwei.status, 2)
  assert.match(zwei.stderr, /Genau ein Projektpfad/)
  assert.equal(cli([]).status, 2)
})

test('Ziel außerhalb der Basis neben der Installation → Exit 2, nichts geschrieben (auch mit --anwenden)', () => {
  const lauf = cli([aussen, '--anwenden'])
  assert.equal(lauf.status, 2)
  assert.match(lauf.stderr, /Abgelehnt: .*außerhalb der erlaubten Basis/)
  assert.deepEqual(readdirSync(aussen), [])
})
