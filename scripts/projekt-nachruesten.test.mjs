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
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
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

// F-1039: Ein abgelehntes Ziel beendet die CLI mit Exit 2, bevor etwas geschrieben wird — geprüft mit einem
// Ziel, das unabhängig von der Lage des Repos abgelehnt wird (eine Datei statt eines Ordners). Die frühere
// Fassung nutzte „außerhalb der Basis“ und setzte voraus, dass os.tmpdir() außerhalb des Elternordners der
// Installation liegt — im Clone unter /tmp war der Test rot. Die Basisregel selbst prüft
// src/projekt-anlegen/nachruesten.test.ts mit explizit gesetzter Basis („Pfad außerhalb der Basis wird abgelehnt“).
test('abgelehntes Ziel → Exit 2, nichts geschrieben (auch mit --anwenden), unabhängig von der Lage des Repos', () => {
  const datei = join(aussen, 'keine-ordner.txt')
  writeFileSync(datei, 'x')
  const lauf = cli([datei, '--anwenden'])
  assert.equal(lauf.status, 2)
  assert.match(lauf.stderr, /Abgelehnt: .*kein vorhandener Ordner/)
  assert.deepEqual(readdirSync(aussen), ['keine-ordner.txt'])
  assert.equal(readFileSync(datei, 'utf8'), 'x')
})
