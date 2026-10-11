/**
 * Datei: scripts/check-skelett-herkunft.test.mjs
 *
 * Zweck: F45 B1a-2 (F-700) — Grün-/Rot-Fälle des Drift-Gates scripts/check-skelett-herkunft.mjs:
 * das echte Skelett ist sauber; in einer Wegwerfkopie macht eine geänderte, eine neue, eine fehlende
 * Datei, eine doppelte Zeile und ein fehlender Abschnitt das Gate rot.
 *
 * Wird aufgerufen von:
 * - npm run test (node --test)
 */

import assert from 'node:assert/strict'
import { appendFileSync, cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { pruefeSkelettHerkunft, SKELETT_WURZEL } from './check-skelett-herkunft.mjs'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const wurzel = mkdtempSync(join(tmpdir(), 'skelett-herkunft-'))
after(() => raeumeVerzeichnis(wurzel))

let zaehler = 0
/**
 * Wegwerfkopie des echten Skeletts.
 * @returns Ordner
 */
function kopie() {
  const ordner = join(wurzel, `k${++zaehler}`)
  cpSync(SKELETT_WURZEL, ordner, { recursive: true })
  return ordner
}

test('das echte Skelett stimmt mit HERKUNFT.md überein', () => {
  assert.deepEqual(pruefeSkelettHerkunft(), [])
})

test('geänderte Datei → Hash weicht ab', () => {
  const ordner = kopie()
  appendFileSync(join(ordner, 'CLAUDE.md'), '\nDrift\n')
  const befunde = pruefeSkelettHerkunft(ordner)
  assert.equal(befunde.length, 1)
  assert.match(befunde[0], /'CLAUDE.md': Hash weicht ab/)
})

test('neue Datei ohne Zeile und gelöschte Datei mit Zeile → je ein Befund', () => {
  const ordner = kopie()
  writeFileSync(join(ordner, 'neu.md'), 'x\n')
  rmSync(join(ordner, 'SETUP.md'))
  const befunde = pruefeSkelettHerkunft(ordner)
  assert.ok(befunde.some((b) => b.includes("'neu.md' liegt im Skelett, fehlt aber")))
  assert.ok(befunde.some((b) => b.includes("nennt 'SETUP.md', die Datei fehlt")))
})

test('doppelte Zeile und fehlender Abschnitt → rot', () => {
  const doppelt = kopie()
  const pfad = join(doppelt, 'HERKUNFT.md')
  const zeile = readFileSync(pfad, 'utf8').split('\n').find((z) => /^\| `SETUP\.md` \| `[0-9a-f]{64}`/.test(z))
  appendFileSync(pfad, `${zeile}\n`)
  assert.ok(pruefeSkelettHerkunft(doppelt).some((b) => b.includes('mehrfach')))

  const ohne = kopie()
  const herkunft = join(ohne, 'HERKUNFT.md')
  writeFileSync(herkunft, readFileSync(herkunft, 'utf8').replace('## Prüfsummen', '## Anderes'))
  assert.ok(pruefeSkelettHerkunft(ohne).some((b) => b.includes('Abschnitt „## Prüfsummen“ fehlt')))
})
