/**
 * Datei: scripts/aufraeumen-nachlauf.test.mjs
 *
 * Zweck: Prüft fuehreNachlaufAus (scripts/aufraeumen-nachlauf.mjs) — den
 * Nachlauf für Pfade, die raeumeVerzeichnis mit EPERM/EBUSY/ENOTEMPTY
 * toleriert hat (F-590). Drei Fälle: kein Rest übrig, ein tatsächlich noch
 * vorhandener Rest wird entfernt, ein weiterhin blockierter Pfad wird nur
 * gemeldet (kein Wurf) — die gelesene Je-PID-Datei ist danach in jedem Fall
 * gelöscht.
 */

import assert from 'node:assert/strict'
import fsModul, { existsSync, mkdirSync, mkdtempSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fuehreNachlaufAus } from './aufraeumen-nachlauf.mjs'
import { RESTE_VERZEICHNIS, resteDateiFuerAktuellenProzess } from './_aufraeumen.ts'

/** Legt eine Reste-Meldung für diesen Testprozess an, als hätte raeumeVerzeichnis sie gesammelt. */
function schreibeReste(pfad, code) {
  mkdirSync(RESTE_VERZEICHNIS, { recursive: true })
  writeFileSync(resteDateiFuerAktuellenProzess(), `${JSON.stringify({ pfad, code, zeit: new Date().toISOString() })}\n`)
}

/** Entfernt die Je-PID-Reste-Datei dieses Testprozesses — nicht rmSync, damit ein in einem Testfall gemockter rmSync die Aufräumung nicht selbst blockiert. */
function raeumeResteDateiAuf() {
  const resteDatei = resteDateiFuerAktuellenProzess()
  if (existsSync(resteDatei)) {
    unlinkSync(resteDatei)
  }
}

test('fuehreNachlaufAus tut nichts, wenn RESTE_VERZEICHNIS fehlt', () => {
  raeumeResteDateiAuf()

  const ergebnis = fuehreNachlaufAus()

  assert.deepEqual(ergebnis, { versucht: [], reste: [] })
})

test('fuehreNachlaufAus entfernt einen tatsächlich noch vorhandenen Rest und löscht die Je-PID-Datei', () => {
  const verzeichnis = mkdtempSync(join(tmpdir(), 'aufraeumen-nachlauf-test-'))
  schreibeReste(verzeichnis, 'EPERM')
  const resteDatei = resteDateiFuerAktuellenProzess()

  const ergebnis = fuehreNachlaufAus()

  assert.deepEqual(ergebnis, { versucht: [verzeichnis], reste: [] })
  assert.equal(existsSync(verzeichnis), false, 'der gesammelte Pfad muss im Nachlauf entfernt sein')
  assert.equal(existsSync(resteDatei), false, 'die Je-PID-Datei muss nach dem Nachlauf gelöscht sein')
})

test('fuehreNachlaufAus wirft nicht, wenn ein Pfad weiterhin blockiert ist — meldet ihn nur als Rest', (t) => {
  const verzeichnis = join(tmpdir(), 'aufraeumen-nachlauf-test-weiterhin-blockiert')
  schreibeReste(verzeichnis, 'EPERM')
  const resteDatei = resteDateiFuerAktuellenProzess()
  // Mock über den Default-Import (Begründung: scripts/_aufraeumen.test.ts).
  t.mock.method(fsModul, 'rmSync', () => {
    throw Object.assign(new Error('EPERM: operation not permitted'), { code: 'EPERM' })
  })

  const ergebnis = fuehreNachlaufAus()

  assert.deepEqual(ergebnis, { versucht: [verzeichnis], reste: [verzeichnis] })
  assert.equal(existsSync(resteDatei), false, 'die Je-PID-Datei muss auch bei verbleibendem Rest gelöscht sein')
})
