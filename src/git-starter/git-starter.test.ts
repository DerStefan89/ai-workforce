/**
 * Datei: src/git-starter/git-starter.test.ts
 *
 * Zweck: Tests des Git-Starters (F45 S, F-1000): Auflösung nur über absolute PATH-Einträge, kein Aufruf
 * einer in der Repo-Wurzel abgelegten Attrappe (Rotfall unter Windows kalibriert: der bloße Name trifft
 * die Attrappe), bereinigte Umgebung, execFileSync-Semantik bei Fehlern, klarer Fehler ohne git.
 *
 * Wird aufgerufen von:
 * - npm run test (node --test)
 *
 * Wichtig: Der Rotfall „bloßer Name trifft die Attrappe“ ist nur unter Windows prüfbar (dort durchsucht der
 * Prozessstart das cwd zuerst, außer NoDefaultCurrentDirectoryInExePath ist gesetzt — der Test nimmt die
 * Variable dafür heraus); auf anderen Plattformen prüft der Test den Fall „relativer PATH-Eintrag“.
 */

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, isAbsolute, join } from 'node:path'
import { test } from 'node:test'
import { raeumeVerzeichnis } from '../../scripts/_aufraeumen.ts'
import { findeGitProgramm, fuehreGitSync, GIT_NICHT_GEFUNDEN, gitProgramm, gitUmgebung } from './index.ts'

/**
 * Legt ein Wegwerf-Repo mit Attrappen git.exe, git.com (unter Windows) und git (ausführbares Skript, das
 * eine Markierung schreibt) in der Wurzel an.
 * @returns { repo, markierung }
 */
function repoMitAttrappe(): { repo: string; markierung: string } {
  const repo = realpathSync(mkdtempSync(join(tmpdir(), 'git-starter-')))
  fuehreGitSync(['init', '--quiet'], { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  const markierung = join(repo, 'attrappe-lief')
  // Kein gültiges Programm: würde der Prozessstart sie wählen, scheiterte der Aufruf (Windows) bzw. schriebe die Markierung (Skript).
  writeFileSync(join(repo, 'git.exe'), 'keine ausführbare Datei')
  writeFileSync(join(repo, 'git.com'), 'keine ausführbare Datei')
  writeFileSync(join(repo, 'git'), `#!/bin/sh\necho attrappe > "${markierung}"\necho attrappe\n`)
  chmodSync(join(repo, 'git'), 0o755)
  return { repo, markierung }
}

/**
 * Setzt PATH zurück; war PATH vorher nicht gesetzt, wird er wieder entfernt (nicht zum Text "undefined").
 * @param wert - früherer Wert
 */
function setzePathZurueck(wert: string | undefined): void {
  if (wert === undefined) delete process.env.PATH
  else process.env.PATH = wert
}

test('findeGitProgramm: nur absolute PATH-Einträge zählen, Ergebnis ist absolut', () => {
  const absolut = findeGitProgramm()
  assert.ok(absolut !== null && isAbsolute(absolut), 'git im PATH dieser Umgebung erwartet')
  assert.equal(findeGitProgramm('.;relativ;bin', 'win32'), null)
  assert.equal(findeGitProgramm('.:relativ', 'linux'), null)
  assert.equal(findeGitProgramm(''), null)
})

test('Rotfall (F-1000): Attrappe in der Repo-Wurzel wird nie gestartet — auch nicht mit "." vorn im PATH', () => {
  const { repo, markierung } = repoMitAttrappe()
  const pathVorher = process.env.PATH
  // Ist NoDefaultCurrentDirectoryInExePath gesetzt (z. B. in Claude-Code-Shells), lässt Windows das cwd aus —
  // die Lücke wäre verdeckt. Ein Leitstand aus einem gewöhnlichen Terminal hat die Variable nicht.
  const ohneCwdSucheVorher = process.env.NoDefaultCurrentDirectoryInExePath
  delete process.env.NoDefaultCurrentDirectoryInExePath
  try {
    if (process.platform === 'win32') {
      // Kalibrierung: der bloße Name trifft unter Windows die Attrappe im cwd (genau die Lücke von F-1000).
      assert.throws(() => execFileSync('git', ['--version'], { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }), 'Kalibrierung: bloßes git muss die Attrappe treffen')
    }
    process.env.PATH = `.${delimiter}${pathVorher ?? ''}`
    const version = fuehreGitSync(['--version'], { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    assert.match(version, /^git version /)
    const wurzel = fuehreGitSync(['rev-parse', '--show-toplevel'], { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
    assert.equal(realpathSync(wurzel), repo)
    assert.equal(existsSync(markierung), false, 'Attrappe darf nicht gelaufen sein')
    assert.notEqual(gitProgramm().toLowerCase().startsWith(repo.toLowerCase()), true)
  } finally {
    setzePathZurueck(pathVorher)
    if (ohneCwdSucheVorher !== undefined) process.env.NoDefaultCurrentDirectoryInExePath = ohneCwdSucheVorher
    raeumeVerzeichnis(repo)
  }
})

test('Rotfall (QA F45 S): git.exe in <repo>/node_modules/.bin — absolut vorn im PATH wie bei npm-Skripten — wird übersprungen', () => {
  const { repo } = repoMitAttrappe()
  const pathVorher = process.env.PATH
  const name = process.platform === 'win32' ? 'git.exe' : 'git'
  try {
    for (const ordner of ['node_modules/.bin', 'werkzeuge/.bin']) {
      mkdirSync(join(repo, ordner), { recursive: true })
      writeFileSync(join(repo, ordner, name), '#!/bin/sh\necho attrappe\n')
      chmodSync(join(repo, ordner, name), 0o755)
    }
    const trenner = process.platform === 'win32' ? ';' : ':'
    // Kalibrierung: ein absoluter Eintrag ohne node_modules-Segment wird gefunden — das Überspringen ist es, was schützt.
    assert.equal(findeGitProgramm(join(repo, 'werkzeuge', '.bin')), join(repo, 'werkzeuge', '.bin', name))
    assert.equal(findeGitProgramm(`${join(repo, 'node_modules', '.bin')}${trenner}${join(repo, 'NODE_MODULES', 'x')}`), null)
    process.env.PATH = `${join(repo, 'node_modules', '.bin')}${delimiter}${pathVorher ?? ''}`
    assert.ok(!gitProgramm().toLowerCase().startsWith(repo.toLowerCase()), gitProgramm())
    assert.match(fuehreGitSync(['--version'], { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }), /^git version /)
  } finally {
    setzePathZurueck(pathVorher)
    raeumeVerzeichnis(repo)
  }
})

test('kein git im PATH: klarer Fehler, kein Rückfall auf den bloßen Namen', () => {
  const pathVorher = process.env.PATH
  try {
    process.env.PATH = ''
    assert.throws(() => gitProgramm(), { message: GIT_NICHT_GEFUNDEN })
    assert.throws(() => fuehreGitSync(['--version'], { encoding: 'utf8' }), { message: GIT_NICHT_GEFUNDEN })
  } finally {
    setzePathZurueck(pathVorher)
  }
  // Nach dem Zurücksetzen wird neu aufgelöst.
  assert.ok(isAbsolute(gitProgramm()))
})

test('gitUmgebung: jede GIT_*-Variable fällt weg (Groß-/Kleinschreibung egal), Zusatzwerte bleiben', () => {
  const env = gitUmgebung({ PATH: 'p', GIT_DIR: 'x', git_work_tree: 'y', GIT_CONFIG_PARAMETERS: "'core.hooksPath=/x'", ANDERES: 'z' }, { GIT_TERMINAL_PROMPT: '0' })
  assert.deepEqual(env, { PATH: 'p', ANDERES: 'z', GIT_TERMINAL_PROMPT: '0' })
})

test('fuehreGitSync: geerbtes GIT_DIR lenkt nicht um; Fehler wie execFileSync (Wurf mit status)', () => {
  const { repo } = repoMitAttrappe()
  const vorher = process.env.GIT_DIR
  try {
    process.env.GIT_DIR = join(repo, 'gibt-es-nicht')
    const wurzel = fuehreGitSync(['rev-parse', '--show-toplevel'], { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
    assert.equal(realpathSync(wurzel), repo)
    // Auch eine ausdrücklich übergebene env wird bereinigt.
    const mitEnv = fuehreGitSync(['rev-parse', '--show-toplevel'], { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env } }).trim()
    assert.equal(realpathSync(mitEnv), repo)
    assert.throws(
      () => fuehreGitSync(['rev-parse', '--verify', 'gibt-es-nicht'], { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }),
      (fehler: unknown) => typeof (fehler as { status?: unknown }).status === 'number' && (fehler as { status: number }).status !== 0
    )
  } finally {
    if (vorher === undefined) delete process.env.GIT_DIR
    else process.env.GIT_DIR = vorher
    raeumeVerzeichnis(repo)
  }
})
