/**
 * Datei: scripts/teste.test.mjs
 *
 * Zweck: Prüft scripts/teste.mjs (F45 T) — Dateierkennung mit den Mustern von `node --test` über git ls-files
 * (node_modules und gitignorierte ausgenommen), Aufteilung parallel/seriell, Ablauf beider Gruppen mit dem Exit der
 * ersten roten, Abbruch mit Exit 2 bei fehlendem Eintrag der seriellen Liste oder bei Zusatzargumenten.
 *
 * Wird aufgerufen von: npm run test (scripts/teste.mjs).
 *
 * Wichtig:
 * - Die Direktaufrufe laufen in leeren Wegwerf-Repos, nie im echten Repo — sonst startete der Test die ganze Suite.
 */

import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { raeumeVerzeichnis } from './_aufraeumen.ts'
import { findeTestdateien, fuehreGruppenAus, SERIELL, teileAuf } from './teste.mjs'
import { schalteGitWartungAb } from './_wegwerf.ts'

const TESTE = join(import.meta.dirname, 'teste.mjs')

/**
 * Legt ein leeres Git-Repo in tmpdir an.
 * @param praefix - Namensanfang des Wegwerf-Ordners
 * @returns Pfad des Repos
 */
function leeresRepo(praefix) {
  const wurzel = mkdtempSync(join(tmpdir(), praefix))
  execFileSync('git', ['init', '--quiet'], { cwd: wurzel })
  schalteGitWartungAb(wurzel)
  return wurzel
}

/**
 * Schreibt leere Dateien; Ordner werden angelegt.
 * @param wurzel - Basisordner
 * @param pfade - Pfade relativ zu wurzel
 */
function schreibe(wurzel, pfade) {
  for (const pfad of pfade) {
    mkdirSync(dirname(join(wurzel, pfad)), { recursive: true })
    writeFileSync(join(wurzel, pfad), '')
  }
}

test('findeTestdateien: Standardmuster von node --test, node_modules und gitignorierte ausgenommen, getrackt und ungetrackt, sortiert mit „/“', () => {
  const wurzel = leeresRepo('aiw-teste-')
  try {
    const treffer = ['a.test.mjs', 'b.test.ts', 'test.js', 'test-x.mjs', 'x_test.cjs', 'x-test.mts', 'test/innen/y.js', 'tief/c.test.cts', 'ümlaut ordner/mit leer.test.mjs']
    const keine = ['node_modules/z.test.mjs', 'paket/node_modules/q.test.mjs', 'normal.mjs', 'x.test.json', 'testen.mjs', 'meintest.mjs', 'rest-roh/d.test.mjs']
    schreibe(wurzel, [...treffer, ...keine])
    writeFileSync(join(wurzel, '.gitignore'), 'rest-roh/\n')
    execFileSync('git', ['add', 'a.test.mjs', 'tief/c.test.cts', 'node_modules/z.test.mjs', 'ümlaut ordner/mit leer.test.mjs'], { cwd: wurzel })
    assert.deepEqual(findeTestdateien(wurzel), [...treffer].sort())
    // Getrackt, aber im Arbeitsbaum gelöscht: zählt nicht.
    rmSync(join(wurzel, 'a.test.mjs'))
    assert.equal(findeTestdateien(wurzel).includes('a.test.mjs'), false)
  } finally {
    raeumeVerzeichnis(wurzel)
  }
})

test('findeTestdateien: außerhalb eines Git-Repos ein Fehler', () => {
  const ohne = mkdtempSync(join(tmpdir(), 'aiw-teste-ohne-git-'))
  try {
    assert.throws(() => findeTestdateien(ohne), /git ls-files scheitert/)
  } finally {
    raeumeVerzeichnis(ohne)
  }
})

test('teileAuf: serielle Dateien fehlen in der parallelen Gruppe; unbekannte Einträge stehen unter fehlend', () => {
  const alle = ['a.test.mjs', 'b.test.mjs', 'c.test.mjs']
  assert.deepEqual(teileAuf(alle, ['b.test.mjs']), { parallel: ['a.test.mjs', 'c.test.mjs'], seriell: ['b.test.mjs'], fehlend: [] })
  assert.deepEqual(teileAuf(alle, ['b.test.mjs', 'weg.test.mjs']).fehlend, ['weg.test.mjs'])
  assert.deepEqual(teileAuf(alle, []).parallel, alle)
})

test('SERIELL: jeder Eintrag ist eine echte Testdatei des Repos und steht nur einmal da', () => {
  assert.deepEqual(teileAuf(findeTestdateien(join(import.meta.dirname, '..'))).fehlend, [])
  assert.equal(new Set(SERIELL).size, SERIELL.length)
})

test('fuehreGruppenAus: beide Gruppen laufen immer (parallel mit 4, dann seriell mit 1); Exit der ersten roten Gruppe', () => {
  const gruppen = { parallel: ['a.test.mjs'], seriell: ['b.test.mjs'] }
  for (const [codes, exit] of [
    [[0, 0], 0],
    [[1, 0], 1],
    [[0, 1], 1],
    [[3, 1], 3],
  ]) {
    const aufrufe = []
    const ergebnis = fuehreGruppenAus(gruppen, (dateien, parallelitaet) => {
      aufrufe.push([dateien, parallelitaet])
      return codes[aufrufe.length - 1]
    })
    assert.deepEqual(aufrufe, [
      [['a.test.mjs'], 4],
      [['b.test.mjs'], 1],
    ])
    assert.deepEqual(ergebnis, { parallel: codes[0], seriell: codes[1], exit })
  }
})

test('Direktaufruf: ein fehlender Eintrag der seriellen Liste bricht mit Exit 2 ab, bevor ein Test läuft', () => {
  // Leeres Repo als cwd: die Erkennung findet dort keine Datei, also fehlt jeder Eintrag aus SERIELL.
  const leer = leeresRepo('aiw-teste-leer-')
  try {
    const lauf = spawnSync(process.execPath, [TESTE], { cwd: leer, encoding: 'utf8' })
    assert.equal(lauf.status, 2, lauf.stderr)
    assert.match(lauf.stderr, /ohne Testdatei/)
    for (const datei of SERIELL) assert.ok(lauf.stderr.includes(datei), datei)
  } finally {
    raeumeVerzeichnis(leer)
  }
})

test('Direktaufruf: Zusatzargumente werden mit Exit 2 abgewiesen statt still verschluckt', () => {
  const leer = leeresRepo('aiw-teste-arg-')
  try {
    const lauf = spawnSync(process.execPath, [TESTE, 'scripts/x.test.mjs'], { cwd: leer, encoding: 'utf8' })
    assert.equal(lauf.status, 2, lauf.stderr)
    assert.match(lauf.stderr, /keine Zusatzargumente \(scripts\/x\.test\.mjs\)/)
  } finally {
    raeumeVerzeichnis(leer)
  }
})
