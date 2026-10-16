/**
 * Datei: scripts/neutrale-umgebung.test.mjs
 *
 * Zweck: node:test-Fälle der neutralen Umgebung für Render-Instanzen (F45 B2b-3e-1, F-1125, scripts/neutrale-umgebung.mjs)
 * mit injiziertem Dateisystem und injizierter Umgebung — es entsteht kein Ordner auf der Platte (Entscheidung A5).
 *
 * Wird aufgerufen von:
 * - npm run test (node --test)
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { richteNeutraleUmgebungEin, standardWurzel } from './neutrale-umgebung.mjs'

/**
 * Aufzeichnendes Dateisystem: merkt sich jeden Aufruf, legt nichts an.
 * @param fehlerBeimLoeschen - true: rmSync wirft
 * @returns { fs, aufrufe }
 */
function aufzeichnendesFs(fehlerBeimLoeschen = false) {
  const aufrufe = []
  const fs = {
    mkdirSync: (pfad, optionen) => aufrufe.push(['mkdirSync', pfad, optionen]),
    mkdtempSync: (praefix) => {
      aufrufe.push(['mkdtempSync', praefix])
      return `${praefix}abc123`
    },
    rmSync: (pfad, optionen) => {
      aufrufe.push(['rmSync', pfad, optionen])
      if (fehlerBeimLoeschen) throw new Error('EBUSY')
    },
    rmdirSync: (pfad) => aufrufe.push(['rmdirSync', pfad]),
  }
  return { fs, aufrufe }
}

test('standardWurzel: AIW_NEUTRAL_WURZEL vor dem Plattform-Standard', () => {
  assert.equal(standardWurzel({}, 'win32'), 'C:\\aiw-nachweis')
  assert.equal(standardWurzel({}, 'linux'), '/tmp/aiw-nachweis')
  assert.equal(standardWurzel({ AIW_NEUTRAL_WURZEL: 'D:\\neutral' }, 'win32'), 'D:\\neutral')
  assert.equal(standardWurzel({ AIW_NEUTRAL_WURZEL: '  ' }, 'win32'), 'C:\\aiw-nachweis')
})

test('richteNeutraleUmgebungEin (win32): Laufordner unter der Wurzel, HOME/USERPROFILE/TEMP/TMP darin, LOCALAPPDATA bleibt', () => {
  const { fs, aufrufe } = aufzeichnendesFs()
  const env = { HOME: 'C:\\Users\\anna', USERPROFILE: 'C:\\Users\\anna', TEMP: 'x', TMP: 'x', LOCALAPPDATA: 'C:\\Users\\anna\\AppData\\Local' }
  const ergebnis = richteNeutraleUmgebungEin({ wurzel: 'C:\\aiw-test', env, fs, plattform: 'win32' })
  assert.equal(ergebnis.laufordner, 'C:\\aiw-test\\lauf-abc123')
  assert.equal(env.HOME, 'C:\\aiw-test\\lauf-abc123\\home')
  assert.equal(env.USERPROFILE, 'C:\\aiw-test\\lauf-abc123\\home')
  assert.equal(env.TEMP, 'C:\\aiw-test\\lauf-abc123\\temp')
  assert.equal(env.TMP, 'C:\\aiw-test\\lauf-abc123\\temp')
  assert.equal(env.TMPDIR, undefined)
  assert.equal(env.LOCALAPPDATA, 'C:\\Users\\anna\\AppData\\Local')
  assert.deepEqual(
    aufrufe.map(([art, pfad]) => [art, pfad]),
    [
      ['mkdirSync', 'C:\\aiw-test'],
      ['mkdtempSync', 'C:\\aiw-test\\lauf-'],
      ['mkdirSync', 'C:\\aiw-test\\lauf-abc123\\home'],
      ['mkdirSync', 'C:\\aiw-test\\lauf-abc123\\temp'],
    ]
  )
})

test('richteNeutraleUmgebungEin (posix): TMPDIR zusätzlich', () => {
  const { fs } = aufzeichnendesFs()
  const env = {}
  richteNeutraleUmgebungEin({ wurzel: '/tmp/aiw-test', env, fs, plattform: 'linux' })
  assert.equal(env.HOME, '/tmp/aiw-test/lauf-abc123/home')
  assert.equal(env.TMPDIR, '/tmp/aiw-test/lauf-abc123/temp')
})

test('richteNeutraleUmgebungEin: eine Wurzel mit persönlichem Pfad wirft, bevor etwas angelegt oder gesetzt wird', () => {
  const { fs, aufrufe } = aufzeichnendesFs()
  const env = { TEMP: 'vorher' }
  assert.throws(() => richteNeutraleUmgebungEin({ wurzel: 'C:\\Users\\anna\\x', env, fs, plattform: 'win32' }), /AIW_NEUTRAL_WURZEL/)
  assert.deepEqual(aufrufe, [])
  assert.deepEqual(env, { TEMP: 'vorher' })
})

test('richteNeutraleUmgebungEin (Korrekturrunde): relative Wurzel wirft vor jedem Anlegen; AIW_NEUTRAL_WURZEL wird getrimmt', () => {
  const { fs, aufrufe } = aufzeichnendesFs()
  const env = {}
  assert.throws(() => richteNeutraleUmgebungEin({ wurzel: 'nachweis', env, fs, plattform: 'win32' }), /absoluter Pfad.*AIW_NEUTRAL_WURZEL/)
  assert.throws(() => richteNeutraleUmgebungEin({ wurzel: 'tmp/x', env, fs, plattform: 'linux' }), /absoluter Pfad/)
  assert.deepEqual(aufrufe, [])
  assert.deepEqual(env, {})
  assert.equal(standardWurzel({ AIW_NEUTRAL_WURZEL: ' D:\\neutral ' }, 'win32'), 'D:\\neutral')
})

test('richteNeutraleUmgebungEin (Korrekturrunde): Anlegefehler ⇒ Meldung mit AIW_NEUTRAL_WURZEL, Teil-Laufordner wird entfernt, env bleibt', () => {
  const { fs, aufrufe } = aufzeichnendesFs()
  fs.mkdirSync = (pfad) => {
    aufrufe.push(['mkdirSync', pfad])
    if (pfad.endsWith('temp')) throw new Error('EPERM')
  }
  const env = { TEMP: 'vorher' }
  assert.throws(() => richteNeutraleUmgebungEin({ wurzel: 'C:\\aiw-test', env, fs, plattform: 'win32' }), /EPERM.*AIW_NEUTRAL_WURZEL/)
  assert.deepEqual(aufrufe.at(-1), ['rmSync', 'C:\\aiw-test\\lauf-abc123', { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }])
  assert.deepEqual(env, { TEMP: 'vorher' })
  const ohneRecht = aufzeichnendesFs()
  ohneRecht.fs.mkdirSync = () => {
    throw new Error('EPERM: operation not permitted')
  }
  assert.throws(() => richteNeutraleUmgebungEin({ wurzel: 'C:\\aiw-test', env: {}, fs: ohneRecht.fs, plattform: 'win32' }), /AIW_NEUTRAL_WURZEL/)
  assert.equal(ohneRecht.aufrufe.filter(([art]) => art === 'rmSync').length, 0)
})

test('entferne: löscht den Laufordner mit Wiederholung, dann die leere Wurzel; zweiter Aufruf tut nichts', () => {
  const { fs, aufrufe } = aufzeichnendesFs()
  const { entferne } = richteNeutraleUmgebungEin({ wurzel: 'C:\\aiw-test', env: {}, fs, plattform: 'win32' })
  aufrufe.length = 0
  entferne()
  entferne()
  assert.deepEqual(aufrufe, [
    ['rmSync', 'C:\\aiw-test\\lauf-abc123', { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }],
    ['rmdirSync', 'C:\\aiw-test'],
  ])
})

test('entferne: ein Löschfehler wirft nicht, warnt mit dem Pfad und lässt die Wurzel stehen', () => {
  const { fs, aufrufe } = aufzeichnendesFs(true)
  const warnungen = []
  const { entferne } = richteNeutraleUmgebungEin({ wurzel: 'C:\\aiw-test', env: {}, fs, plattform: 'win32', warne: (t) => warnungen.push(t) })
  aufrufe.length = 0
  assert.doesNotThrow(() => entferne())
  assert.equal(aufrufe.filter(([art]) => art === 'rmdirSync').length, 0)
  assert.equal(warnungen.length, 1)
  assert.match(warnungen[0], /C:\\aiw-test\\lauf-abc123/)
})
