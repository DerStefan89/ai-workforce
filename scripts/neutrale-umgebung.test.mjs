/**
 * Datei: scripts/neutrale-umgebung.test.mjs
 *
 * Zweck: node:test-Fälle der neutralen Umgebung für Render-Instanzen (F45 B2b-3e-1, F-1125, scripts/neutrale-umgebung.mjs)
 * mit injiziertem Dateisystem und injizierter Umgebung — es entsteht kein Ordner auf der Platte (Entscheidung A5). Seit F45 B2b-3e-3
 * (plan-w1-v2 §2) auch markiereLauf, istTot, raeumeAlteLaeufeAuf und die Reihenfolge im Starter (am Text, nie importiert).
 *
 * Wird aufgerufen von:
 * - npm run test (node --test)
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { istTot, markiereLauf, raeumeAlteLaeufeAuf, richteNeutraleUmgebungEin, standardWurzel } from './neutrale-umgebung.mjs'

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

// ─── F45 B2b-3e-3: alte Laufordner aufräumen (F-1125, Auflagen advisor-b2b3e2-delta 1–3, plan-w1-v2 §2) ─────────────

const STUNDE = 60 * 60 * 1000
const JETZT = 1000 * STUNDE

/**
 * Gedachte Wurzel `/w` (posix) für raeumeAlteLaeufeAuf: Einträge mit Art, pid-Inhalt, Alter und Unterordnern; legt nichts an.
 * @param eintraege - { name: { art: 'ordner'|'datei'|'link', pid?: string|null, alterMs?: number, unter?: string[] } }
 * @param wirft - Menge von Aufrufen, die werfen sollen ('readdirSync', 'rmSync:<pfad>', 'statSync:<pfad>' mit EACCES,
 *   'weg:<pfad>' — der Ordner verschwindet gleichzeitig, readdir wirft ENOENT)
 * @returns { fs, entfernt }
 */
function gedachteWurzel(eintraege, wirft = new Set()) {
  const entfernt = []
  const eintrag = (pfad) => eintraege[pfad.split('/')[2]]
  const fs = {
    readdirSync: (pfad, optionen) => {
      if (wirft.has('readdirSync')) throw new Error('EACCES')
      if (pfad === '/w') {
        assert.deepEqual(optionen, { withFileTypes: true })
        return Object.entries(eintraege).map(([name, e]) => ({ name, isDirectory: () => e.art === 'ordner' }))
      }
      if (wirft.has(`weg:${pfad}`)) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
      const e = eintrag(pfad)
      return [...(e?.unter ?? ['home', 'temp']), ...(typeof e?.pid === 'string' ? ['pid'] : [])]
    },
    readFileSync: (pfad) => {
      const pid = eintrag(pfad)?.pid
      if (typeof pid !== 'string') throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
      return pid
    },
    statSync: (pfad) => {
      if (wirft.has(`statSync:${pfad}`)) throw Object.assign(new Error('EACCES'), { code: 'EACCES' })
      return { mtimeMs: JETZT - (eintrag(pfad)?.alterMs ?? 0) }
    },
    rmSync: (pfad, optionen) => {
      if (wirft.has(`rmSync:${pfad}`)) throw new Error('EBUSY')
      assert.equal(optionen.recursive, true)
      assert.ok(optionen.maxRetries > 0)
      entfernt.push(pfad)
    },
  }
  return { fs, entfernt }
}

/** Gemeinsame Optionen der Aufräum-Tests. */
const aufraeumen = (fs, ueberschreibung = {}) => raeumeAlteLaeufeAuf({ wurzel: '/w', eigener: '/w/lauf-eigen1', fs, istTot: () => true, jetzt: JETZT, warne: () => {}, plattform: 'linux', ...ueberschreibung })

test('raeumeAlteLaeufeAuf: tote pid ⇒ entfernt; lebende pid bleibt; eigener Lauf nie', () => {
  const { fs, entfernt } = gedachteWurzel({ 'lauf-aaaaaa': { art: 'ordner', pid: '111' }, 'lauf-bbbbbb': { art: 'ordner', pid: '222' }, 'lauf-eigen1': { art: 'ordner', pid: '333' } })
  const warnungen = []
  assert.deepEqual(aufraeumen(fs, { istTot: (pid) => pid !== 222, warne: (m) => warnungen.push(m) }), ['/w/lauf-aaaaaa'])
  assert.deepEqual(entfernt, ['/w/lauf-aaaaaa'])
  assert.deepEqual(warnungen, [])
})

test('raeumeAlteLaeufeAuf: ohne gültige pid gilt die 24-h-Regel; fehlend, leer, 0, -3, 12x sind ungültig und werden nie als Prozess gefragt', () => {
  const { fs, entfernt } = gedachteWurzel({
    'lauf-jung01': { art: 'ordner', pid: null, alterMs: 23 * STUNDE },
    'lauf-alt001': { art: 'ordner', pid: null, alterMs: 25 * STUNDE },
    'lauf-leer01': { art: 'ordner', pid: '', alterMs: 25 * STUNDE },
    'lauf-null01': { art: 'ordner', pid: '0', alterMs: 1 },
    'lauf-minus1': { art: 'ordner', pid: '-3', alterMs: 1 },
    'lauf-text01': { art: 'ordner', pid: '12x', alterMs: 25 * STUNDE },
  })
  const gefragt = []
  aufraeumen(fs, { istTot: (pid) => gefragt.push(pid) > 0 })
  assert.deepEqual(entfernt.sort(), ['/w/lauf-alt001', '/w/lauf-leer01', '/w/lauf-text01'])
  assert.deepEqual(gefragt, [])
})

test('raeumeAlteLaeufeAuf: nur Ordner lauf-XXXXXX mit nichts außer home/temp/pid; Datei, Link, fremde Namen und fremder Inhalt bleiben', () => {
  const { fs, entfernt } = gedachteWurzel({
    'lauf-datei1': { art: 'datei', pid: '1' },
    'lauf-link01': { art: 'link', pid: '1' },
    andere: { art: 'ordner', pid: '1' },
    'lauf-zulang1': { art: 'ordner', pid: '1' },
    'lauf-fremd1': { art: 'ordner', pid: '1', unter: ['daten'] },
    'lauf-fremd2': { art: 'ordner', pid: null, alterMs: 48 * STUNDE, unter: ['home', 'temp', 'notizen.txt'] },
  })
  assert.deepEqual(aufraeumen(fs), [])
  assert.deepEqual(entfernt, [])
})

test('raeumeAlteLaeufeAuf (Korrekturrunde): Rest nach Teil-Löschen wird nach 24 h geräumt; lebende pid bleibt auch alt; pid über 2^31−1 gilt als ungültig', () => {
  const { fs, entfernt } = gedachteWurzel({
    'lauf-rest01': { art: 'ordner', pid: null, alterMs: 25 * STUNDE, unter: ['temp'] },
    'lauf-leer02': { art: 'ordner', pid: null, alterMs: 25 * STUNDE, unter: [] },
    'lauf-lebt01': { art: 'ordner', pid: '222', alterMs: 48 * STUNDE },
    'lauf-gross1': { art: 'ordner', pid: '99999999999', alterMs: 25 * STUNDE },
    'lauf-gross2': { art: 'ordner', pid: '99999999999', alterMs: 1 },
  })
  const gefragt = []
  aufraeumen(fs, { istTot: (pid) => gefragt.push(pid) === 0 })
  assert.deepEqual(entfernt.sort(), ['/w/lauf-gross1', '/w/lauf-leer02', '/w/lauf-rest01'])
  assert.deepEqual(gefragt, [222])
})

test('raeumeAlteLaeufeAuf: readdir-Fehler ⇒ [] + Warnung; stat- und Löschfehler ⇒ Warnung, die übrigen werden weiter geprüft', () => {
  const warnungen = []
  const warne = (m) => warnungen.push(m)
  assert.deepEqual(aufraeumen(gedachteWurzel({}, new Set(['readdirSync'])).fs, { warne }), [])
  assert.equal(warnungen.length, 1)
  warnungen.length = 0
  const { fs, entfernt } = gedachteWurzel(
    { 'lauf-belegt': { art: 'ordner', pid: '1' }, 'lauf-stat01': { art: 'ordner', pid: null, alterMs: 48 * STUNDE }, 'lauf-weg001': { art: 'ordner', pid: '3' }, 'lauf-frei01': { art: 'ordner', pid: '2' } },
    new Set(['rmSync:/w/lauf-belegt', 'statSync:/w/lauf-stat01', 'weg:/w/lauf-weg001'])
  )
  assert.deepEqual(aufraeumen(fs, { warne }), ['/w/lauf-frei01'])
  assert.deepEqual(entfernt, ['/w/lauf-frei01'])
  // ENOENT (gleichzeitig von einem zweiten Start entfernt) bleibt still (qa 9).
  assert.equal(warnungen.length, 2)
  assert.ok(warnungen.every((w) => /erneut versucht/.test(w)))
  assert.ok(warnungen.some((w) => w.includes('/w/lauf-belegt')))
})

test('istTot: nur ESRCH heißt tot; EPERM, andere Fehler und kein Wurf heißen lebendig', () => {
  const werfe = (code) => () => {
    throw Object.assign(new Error(code), { code })
  }
  assert.equal(istTot(5, werfe('ESRCH')), true)
  assert.equal(istTot(5, werfe('EPERM')), false)
  assert.equal(istTot(5, werfe('EINVAL')), false)
  assert.equal(istTot(5, () => true), false)
})

test('markiereLauf: schreibt die pid; ein Schreibfehler warnt und wirft nicht', () => {
  const geschrieben = []
  markiereLauf('/w/lauf-abc123', { pid: 4711, plattform: 'linux', fs: { writeFileSync: (p, inhalt) => geschrieben.push([p, inhalt]) } })
  assert.deepEqual(geschrieben, [['/w/lauf-abc123/pid', '4711']])
  const warnungen = []
  const fs = {
    writeFileSync: () => {
      throw new Error('EROFS')
    },
  }
  assert.doesNotThrow(() => markiereLauf('/w/lauf-abc123', { pid: 1, plattform: 'linux', fs, warne: (m) => warnungen.push(m) }))
  assert.equal(warnungen.length, 1)
})

test('Starter (Quelltext, nicht importiert): exit-Handler vor Markieren und Aufräumen, beides in try', () => {
  const text = readFileSync(new URL('./neutrale-umgebung-starten.mjs', import.meta.url), 'utf8')
  const exitHandler = text.indexOf("process.once('exit', entferne)")
  const versuch = text.indexOf('try {', exitHandler)
  const markiert = text.indexOf('markiereLauf(laufordner', exitHandler)
  const aufgeraeumt = text.indexOf('raeumeAlteLaeufeAuf(', exitHandler)
  const fang = text.indexOf('} catch', versuch)
  assert.ok(exitHandler > 0 && versuch > exitHandler && markiert > versuch && aufgeraeumt > markiert && fang > aufgeraeumt, JSON.stringify({ exitHandler, versuch, markiert, aufgeraeumt, fang }))
})
