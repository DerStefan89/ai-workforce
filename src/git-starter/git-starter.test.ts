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
import { findeGitProgramm, fuehreGitAsync, fuehreGitSync, GIT_NICHT_GEFUNDEN, gitProgramm, gitUmgebung } from './index.ts'

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

test('fuehreGitAsync (F45 B2a-3b, Zeitgrenze): ein hängendes git (hash-object --stdin, stdin offen) endet mit abbruch zeitgrenze', { timeout: 20_000 }, async () => {
  const repo = realpathSync(mkdtempSync(join(tmpdir(), 'git-starter-zeit-')))
  try {
    fuehreGitSync(['init', '--quiet'], { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    const ergebnis = await fuehreGitAsync(['hash-object', '--stdin'], { cwd: repo, zeitgrenzeMs: 50 })
    assert.equal(ergebnis.code, null)
    assert.equal(ergebnis.abbruch, 'zeitgrenze')
  } finally {
    raeumeVerzeichnis(repo)
  }
})

test('fuehreGitAsync (F45 B2a-3b, Node-execFile-Wettlauf): Zeitgrenze wird nie als Erfolg mit leerer Ausgabe gemeldet', { timeout: 30_000 }, async () => {
  const repo = realpathSync(mkdtempSync(join(tmpdir(), 'git-starter-wettlauf-')))
  try {
    fuehreGitSync(['init', '--quiet'], { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    // rev-parse --show-toplevel liefert im Erfolgsfall immer eine Zeile — code 0 mit leerer Ausgabe ist ein verdeckter Abbruch.
    const ergebnisse = await Promise.all(Array.from({ length: 50 }, () => fuehreGitAsync(['rev-parse', '--show-toplevel'], { cwd: repo, zeitgrenzeMs: 1 })))
    const stilleAbbrueche = ergebnisse.filter((e) => e.code === 0 && e.stdout === '')
    assert.equal(stilleAbbrueche.length, 0, `${stilleAbbrueche.length} von 50 Aufrufen: code 0 mit leerer Ausgabe`)
    for (const e of ergebnisse) if (e.code !== 0) assert.equal(e.abbruch, 'zeitgrenze', JSON.stringify(e))
  } finally {
    raeumeVerzeichnis(repo)
  }
})

test('fuehreGitAsync (F45 B2a-3b, Code-Review-Nachpass 1): ein Enkelprozess mit geerbten Pipes (Hook) hält die Zeitgrenze nicht auf', { timeout: 20_000 }, async () => {
  const repo = realpathSync(mkdtempSync(join(tmpdir(), 'git-starter-enkel-')))
  const hooks = join(repo, '.hooks')
  let start = Date.now()
  try {
    const git = (...a: string[]) => fuehreGitSync(a, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    git('init', '--quiet')
    git('-c', 'user.email=t@example.invalid', '-c', 'user.name=T', 'commit', '--quiet', '--allow-empty', '-m', 'init')
    mkdirSync(hooks)
    // post-checkout schläft 5 s und erbt stdout/stderr von git — bei Ablauf der Zeitgrenze (1 s) läuft er sicher, und ohne
    // Abbau der Pipes hielte er 'close' bis zu seinem Ende auf (vor der Korrektur gemessen: Testlauf ≈ 5,8 s, rot).
    writeFileSync(join(hooks, 'post-checkout'), '#!/bin/sh\nsleep 5\n')
    chmodSync(join(hooks, 'post-checkout'), 0o755)
    git('config', 'core.hooksPath', hooks)
    start = Date.now()
    const ergebnis = await fuehreGitAsync(['checkout', '--quiet', '-b', 'zweig'], { cwd: repo, zeitgrenzeMs: 1000 })
    const dauer = Date.now() - start
    assert.equal(ergebnis.code, null)
    assert.equal(ergebnis.stdout, '')
    assert.equal(ergebnis.abbruch, 'zeitgrenze', JSON.stringify(ergebnis))
    assert.ok(dauer < 3000, `Ergebnis erst nach ${dauer} ms (Zeitgrenze 1000 ms)`)
  } finally {
    // Der Hook läuft ggf. weiter und hält den Ordner — erst nach seinem Ende aufräumen (gemessen ab dem Start des Hooks).
    const rest = 5500 - (Date.now() - start)
    if (rest > 0) await new Promise((r) => setTimeout(r, rest))
    raeumeVerzeichnis(repo)
  }
})
