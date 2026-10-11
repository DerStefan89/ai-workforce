/**
 * Datei: scripts/check-git-starter.test.mjs
 *
 * Zweck: Grün- und Rot-Fälle des Gates scripts/check-git-starter.mjs (F45 S, F-1000): jede Form eines
 * Git-Aufrufs mit bloßem Namen wird gefunden, Kommentare, der Starter und unverwandte Texte nicht; der
 * heutige Bestand ist sauber.
 *
 * Wird aufgerufen von:
 * - npm run test (node --test)
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dateienImUmfang, findeBlosseGitAufrufe, pruefeGitStarter } from './check-git-starter.mjs'

test('Rotfälle: execFileSync/execFile/spawn/spawnSync/Wrapper mit bloßem git, git.exe, Befehlstext', () => {
  const faelle = [
    "execFileSync('git', ['status'], { cwd })",
    'execFile("git", args, cb)',
    'spawn(`git`, args)',
    "spawnSync('git')",
    "child_process.execFileSync(\n  'git',\n  ['show'])",
    "laufeProzess('git', args, { cwd })",
    "execFileSync('git.exe', [])",
    "spawn('git.com', [])",
    "execSync('git status --porcelain')",
    'exec(`git rev-parse HEAD`, cb)',
    "execFileSync('GIT', [])",
    'spawn("Git.EXE", [])',
    "const G = 'git'",
    "let programm: string = 'git.exe'",
    "starteProzess(['git', 'status'])",
  ]
  for (const fall of faelle) assert.equal(findeBlosseGitAufrufe(fall).length, 1, fall)
})

test('Rotfälle hinter Texten, Templates und Regex-Literalen mit Kommentarzeichen (Prüfpass cr 1)', () => {
  const faelle = [
    "const g = 'docs/**'\nexecFileSync('git', [])\n/** x */",
    'const t = `a/*b ${x}`\nexecFileSync(\'git\', [])\nconst u = `*/`',
    "const r = /['\"/*]/g\nexecFileSync('git', [])\n// */",
    "const u = 'https://x.invalid' // Kommentar mit /*\nexecFileSync('git', [])\n/* */",
    'const t = `${a ? `in ${b}` : "/*"}`\nexecFileSync(\'git\', [])',
    'return /a\\/*b/.test(x)\nexecFileSync(\'git\', [])',
    "const q = (a) / b / c; const s = '/*'\nexecFileSync('git', [])",
  ]
  for (const fall of faelle) assert.deepEqual(findeBlosseGitAufrufe(fall).map((t) => t.zeile), [2], fall)
})

test('Grünfälle: Starter, Kommentare, Texte, andere Programme', () => {
  const faelle = [
    "fuehreGitSync(['status'], { cwd, encoding: 'utf8' })",
    'execFile(programm, [...GIT_GRUNDARGUMENTE, ...args], optionen)',
    'laufeProzess(gitProgramm(), args, { cwd })',
    "// execFileSync('git', ['status'])",
    "/** Nicht auf execFileSync('git', …) vereinfachen. */",
    "/**\n * execFileSync('git', …) im Dokukommentar\n */",
    "const text = 'git ist nicht installiert'",
    "console.log(`git ${args[0]} fehlgeschlagen`)",
    "execFileSync('node', ['git'])",
    "execFileSync('gitk', [])",
    "spawn('npm', ['run', 'check'])",
    "const werkzeug = { name: 'git' }",
    "if (befehl === 'git') return",
    'const geteilt = (a + 1) / b / c // Ende',
  ]
  for (const fall of faelle) assert.deepEqual(findeBlosseGitAufrufe(fall), [], fall)
})

test('Zeilennummer zeigt auf den Aufruf, auch nach einem Blockkommentar', () => {
  const text = "/**\n * Kopf\n */\nconst a = 1\nexecFileSync('git', [])\n"
  assert.deepEqual(findeBlosseGitAufrufe(text).map((t) => t.zeile), [5])
})

test('Umfang: src, scripts/leitstand*, zustand-sichern — ohne Tests; Bestand ist sauber', () => {
  const pfade = dateienImUmfang(process.cwd())
  for (const pflicht of ['src/authorization-boundary/index.ts', 'src/execution-controller/index.ts', 'src/aenderungsuebersicht/index.ts', 'src/ressourcen/installation.ts', 'src/git-starter/index.ts', 'scripts/leitstand-server.mjs', 'scripts/leitstand/routen-code.mjs', 'scripts/zustand-sichern.mjs']) {
    assert.ok(pfade.includes(pflicht), pflicht)
  }
  assert.equal(
    pfade.some((p) => /\.test\.[cm]?[jt]s$/.test(p)),
    false
  )
  assert.deepEqual(pruefeGitStarter(process.cwd()), [])
})

test('Rotfall im Umfang: ein neuer bloßer Aufruf in einer Datei des Umfangs wird gemeldet', () => {
  const befunde = pruefeGitStarter(process.cwd(), (pfad) => (pfad === 'src/execution-controller/index.ts' ? "x\nexecFileSync('git', ['status'])\n" : ''))
  assert.equal(befunde.length, 1)
  assert.match(befunde[0], /^src\/execution-controller\/index\.ts:2: /)
})
