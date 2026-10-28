/**
 * Datei: scripts/_wegwerf.test.ts
 *
 * Zweck: Prüft die beiden Zutaten von scripts/_wegwerf.ts (F45 W2b-2): der Wegwerf-Ordner liegt unter os.tmpdir() und
 * ist nach dem Prozessende weg — auch nach `process.exit(1)`, dem Ende eines roten Gates —, und ein Wegwerf-Repo trägt
 * nach `schalteGitWartungAb` die drei Einstellungen gegen die git-Hintergrundwartung (F-1230), so wie git sie liest.
 */

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { isAbsolute, join, relative } from 'node:path'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'
import { fuehreGitSync } from '../src/git-starter/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'
import { schalteGitWartungAb, wegwerfOrdner } from './_wegwerf.ts'

const HELFER_URL = pathToFileURL(join(import.meta.dirname, '_wegwerf.ts')).href

/**
 * Startet einen Kindprozess, der einen Wegwerf-Ordner anlegt, seinen Pfad ausgibt und mit dem Code endet.
 * @param exitCode - Code für process.exit
 * @returns ausgegebener Pfad
 */
function ordnerAusKindprozess(exitCode: number): string {
  const skript = `const { wegwerfOrdner } = await import(${JSON.stringify(HELFER_URL)}); const p = wegwerfOrdner('test'); process.stdout.write(p); process.exit(${exitCode})`
  try {
    return execFileSync(process.execPath, ['--input-type=module', '-e', skript], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  } catch (fehler) {
    const ausgabe = (fehler as { stdout?: string }).stdout
    if (exitCode !== 0 && typeof ausgabe === 'string') return ausgabe
    throw fehler
  }
}

test('wegwerfOrdner: leerer Ordner unter os.tmpdir(), nicht im Arbeitsordner', () => {
  const pfad = wegwerfOrdner('test-ort')
  assert.ok(existsSync(pfad))
  const rel = relative(realpathSync(tmpdir()), realpathSync(pfad))
  assert.ok(!rel.startsWith('..') && rel !== '', `liegt nicht unter tmpdir: ${pfad}`)
  const zumArbeitsordner = relative(process.cwd(), pfad)
  assert.ok(zumArbeitsordner.startsWith('..') || isAbsolute(zumArbeitsordner), 'liegt im Arbeitsordner')
})

test('wegwerfOrdner: nach Prozessende geräumt — auch nach process.exit(1)', () => {
  for (const code of [0, 1]) {
    const pfad = ordnerAusKindprozess(code)
    assert.ok(pfad.length > 0, `kein Pfad bei Exit ${code}`)
    assert.equal(existsSync(pfad), false, `Exit ${code}: ${pfad} liegt noch`)
  }
})

test('schalteGitWartungAb: git liest gc.auto 0, maintenance.auto false, maintenance.autoDetach false', () => {
  const repo = mkdtempSync(join(tmpdir(), 'aiw-wegwerf-git-'))
  try {
    fuehreGitSync(['init', '--quiet'], { cwd: repo, encoding: 'utf8' })
    const lies = (schluessel: string) => fuehreGitSync(['config', '--local', '--get', schluessel], { cwd: repo, encoding: 'utf8' }).trim()
    assert.throws(() => lies('gc.auto'), 'vorher gesetzt — der Test prüfte nichts')
    schalteGitWartungAb(repo)
    assert.deepEqual([lies('gc.auto'), lies('maintenance.auto'), lies('maintenance.autoDetach')], ['0', 'false', 'false'])
    // Die Datei bleibt für git lesbar und schreibbar (kein kaputter Abschnitt).
    fuehreGitSync(['config', 'user.name', 'T'], { cwd: repo, encoding: 'utf8' })
    assert.equal(lies('user.name'), 'T')
  } finally {
    raeumeVerzeichnis(repo)
  }
})
