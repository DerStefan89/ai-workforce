/**
 * Datei: scripts/aufraeumen-nachlauf.test.mjs
 *
 * Zweck: Prüft fuehreNachlaufAus (scripts/aufraeumen-nachlauf.mjs) — den
 * Nachlauf für Pfade, die raeumeVerzeichnis mit EPERM/EBUSY/ENOTEMPTY
 * toleriert hat (F-590). Drei Fälle: kein Rest übrig, ein tatsächlich noch
 * vorhandener Rest wird entfernt, ein weiterhin blockierter Pfad wird nur
 * gemeldet (kein Wurf) — die gelesene Je-PID-Datei ist danach in jedem Fall
 * gelöscht.
 *
 * F45 P (F-999): Der Test arbeitet auf einem eigenen Reste-Verzeichnis unter os.tmpdir(), nicht auf dem
 * gemeinsamen RESTE_VERZEICHNIS — dort schreiben parallel laufende Tests (npm run test mit
 * --test-concurrency=4) ihre eigenen Reste, und der Test scheiterte daran sporadisch.
 *
 * Wird aufgerufen von: `npm run test` (node --test)
 */

import assert from 'node:assert/strict'
import fsModul, { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { after, test } from 'node:test'
import { fuehreNachlaufAus } from './aufraeumen-nachlauf.mjs'
import { RESTE_VERZEICHNIS, raeumeVerzeichnis, resteDateiFuerAktuellenProzess } from './_aufraeumen.ts'

/** Eigenes Reste-Verzeichnis dieses Tests (F-999) — nie das gemeinsame RESTE_VERZEICHNIS. */
const TEST_RESTE = join(mkdtempSync(join(tmpdir(), 'aufraeumen-nachlauf-reste-')), 'reste')

// Der eigene Wegwerf-Ordner unter os.tmpdir() wird am Ende entfernt (Mocks sind dann zurückgesetzt).
after(() => raeumeVerzeichnis(dirname(TEST_RESTE)))

/** Je-PID-Datei dieses Testprozesses im eigenen Reste-Verzeichnis (gleicher Dateiname wie in RESTE_VERZEICHNIS). */
const TEST_RESTE_DATEI = join(TEST_RESTE, basename(resteDateiFuerAktuellenProzess()))

/** Legt eine Reste-Meldung für diesen Testprozess an, als hätte raeumeVerzeichnis sie gesammelt. */
function schreibeReste(pfad, code) {
  mkdirSync(TEST_RESTE, { recursive: true })
  writeFileSync(TEST_RESTE_DATEI, `${JSON.stringify({ pfad, code, zeit: new Date().toISOString() })}\n`)
}

test('der Test prüft ein eigenes Reste-Verzeichnis, nicht das gemeinsame (F-999)', () => {
  assert.notEqual(TEST_RESTE, RESTE_VERZEICHNIS)
  assert.ok(!TEST_RESTE.startsWith(RESTE_VERZEICHNIS))
})

test('fuehreNachlaufAus tut nichts, wenn das Reste-Verzeichnis fehlt', () => {
  assert.equal(existsSync(TEST_RESTE), false)

  const ergebnis = fuehreNachlaufAus(TEST_RESTE)

  assert.deepEqual(ergebnis, { versucht: [], reste: [] })
})

test('fuehreNachlaufAus entfernt einen tatsächlich noch vorhandenen Rest und löscht die Je-PID-Datei', () => {
  const verzeichnis = mkdtempSync(join(tmpdir(), 'aufraeumen-nachlauf-test-'))
  schreibeReste(verzeichnis, 'EPERM')
  const resteDatei = TEST_RESTE_DATEI

  const ergebnis = fuehreNachlaufAus(TEST_RESTE)

  assert.deepEqual(ergebnis, { versucht: [verzeichnis], reste: [] })
  assert.equal(existsSync(verzeichnis), false, 'der gesammelte Pfad muss im Nachlauf entfernt sein')
  assert.equal(existsSync(resteDatei), false, 'die Je-PID-Datei muss nach dem Nachlauf gelöscht sein')
})

test('fuehreNachlaufAus wirft nicht, wenn ein Pfad weiterhin blockiert ist — meldet ihn nur als Rest', (t) => {
  const verzeichnis = join(tmpdir(), 'aufraeumen-nachlauf-test-weiterhin-blockiert')
  schreibeReste(verzeichnis, 'EPERM')
  const resteDatei = TEST_RESTE_DATEI
  // Mock über den Default-Import (Begründung: scripts/_aufraeumen.test.ts).
  t.mock.method(fsModul, 'rmSync', () => {
    throw Object.assign(new Error('EPERM: operation not permitted'), { code: 'EPERM' })
  })

  const ergebnis = fuehreNachlaufAus(TEST_RESTE)

  assert.deepEqual(ergebnis, { versucht: [verzeichnis], reste: [verzeichnis] })
  assert.equal(existsSync(resteDatei), false, 'die Je-PID-Datei muss auch bei verbleibendem Rest gelöscht sein')
})
