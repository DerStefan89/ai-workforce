/**
 * Datei: scripts/skelett-check-gates.test.mjs
 *
 * Zweck: F45 B1a-2 (Plan v2 P4) — Grün-/Rot-Fälle der Mindest-Gates des Projekt-Skeletts
 * (vorlagen/projekt-skelett/scripts/check-gates.mjs, Teile a–d) und des Test-Gates mit Untergrenze
 * (tests-mit-untergrenze.mjs). Liegt bewusst in ai-workforce und nicht im Skelett — eine Testdatei im
 * Skelett würde in jedes neue Projekt kopiert. Werkzeuge (npm, gitleaks, Docker) werden über einen
 * injizierten Ausführer ersetzt; der echte Scan steht in scripts/check-secrets.test.mjs.
 *
 * Wird aufgerufen von:
 * - npm run test (node --test)
 */

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, win32 } from 'node:path'
import { after, test } from 'node:test'
import {
  findeProgramm,
  pruefeAbhaengigkeiten,
  pruefeHooks,
  pruefePlatzhalter,
  pruefeSecrets,
} from '../vorlagen/projekt-skelett/scripts/check-gates.mjs'
import { bewerteTestlauf } from '../vorlagen/projekt-skelett/scripts/tests-mit-untergrenze.mjs'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const SKELETT = join(import.meta.dirname, '..', 'vorlagen', 'projekt-skelett')
const wurzel = mkdtempSync(join(tmpdir(), 'skelett-gates-'))
after(() => raeumeVerzeichnis(wurzel))

let zaehler = 0
/**
 * Wegwerf-Projekt mit Dateien.
 * @param dateien - relativer Pfad → Inhalt
 * @returns Ordner
 */
function projekt(dateien = {}) {
  const ordner = join(wurzel, `p${++zaehler}`)
  mkdirSync(ordner, { recursive: true })
  for (const [pfad, inhalt] of Object.entries(dateien)) {
    mkdirSync(join(ordner, pfad, '..'), { recursive: true })
    writeFileSync(join(ordner, pfad), inhalt)
  }
  return ordner
}

const paket = (skripte, extra = {}) => JSON.stringify({ name: 'x', ...extra, scripts: skripte })

test('(a) Skelett-package.json ist rot mit Verweis auf die Gate-Vorlage', () => {
  const ergebnis = pruefePlatzhalter(SKELETT)
  assert.equal(ergebnis.stufe, 'rot')
  assert.match(ergebnis.zeilen[0], /lint, typecheck, test/)
  assert.match(ergebnis.zeilen[0], /docs\/harness\/gate-vorlage-node\.md/)
})

test('(a) fehlendes Skript rot, gefüllte Skripte grün, fehlende package.json rot', () => {
  assert.equal(pruefePlatzhalter(projekt({ 'package.json': paket({ lint: 'eslint .', typecheck: 'tsc --noEmit' }) })).stufe, 'rot')
  assert.equal(pruefePlatzhalter(projekt({ 'package.json': paket({ lint: 'eslint .', typecheck: 'tsc --noEmit', test: 'node --test' }) })).stufe, 'gruen')
  assert.equal(pruefePlatzhalter(projekt()).stufe, 'rot')
})

test('(b) ohne Lock-Datei Hinweis, ohne Ausführung', () => {
  let aufgerufen = false
  const ergebnis = pruefeAbhaengigkeiten(projekt(), () => {
    aufgerufen = true
    return { status: 0, stdout: '', stderr: '' }
  }, 'npm-cli.js')
  assert.equal(ergebnis.stufe, 'hinweis')
  assert.equal(aufgerufen, false)
})

test('(b) mit Lock: grün, Befund rot, nicht ausführbar rot (benannt), npm fehlt rot', () => {
  const ordner = projekt({ 'package-lock.json': '{}' })
  const mit = (status, stdout, stderr = '') => () => ({ status, stdout, stderr, fehler: null })
  const gruen = pruefeAbhaengigkeiten(ordner, (programm, argumente) => {
    assert.deepEqual(argumente.slice(1), ['audit', '--audit-level=high'])
    return { status: 0, stdout: 'found 0 vulnerabilities', stderr: '' }
  }, 'npm-cli.js')
  assert.equal(gruen.stufe, 'gruen')
  const befund = pruefeAbhaengigkeiten(ordner, mit(1, '2 high severity vulnerabilities'), 'npm-cli.js')
  assert.equal(befund.stufe, 'rot')
  assert.match(befund.zeilen[0], /hohe oder kritische Befunde/)
  const offline = pruefeAbhaengigkeiten(ordner, mit(1, '', 'npm error code ENOTFOUND'), 'npm-cli.js')
  assert.equal(offline.stufe, 'rot')
  assert.match(offline.zeilen[0], /nicht ausführbar/)
  assert.equal(pruefeAbhaengigkeiten(ordner, mit(0, ''), null).stufe, 'rot')
})

test('(c) gitleaks im PATH: Argumente wie in der CI, Treffer rot, sauber grün', () => {
  const ordner = projekt()
  const finde = (name) => (name === 'gitleaks' ? '/opt/gitleaks' : null)
  const aufrufe = []
  const ausfuehren = (status) => (programm, argumente) => {
    aufrufe.push(argumente)
    return argumente[0] === 'version' ? { status: 0, stdout: '', stderr: '' } : { status, stdout: 'Finding: REDACTED\nRuleID: generic-api-key\nFile: a.txt', stderr: 'leaks found: 1' }
  }
  const rot = pruefeSecrets(ordner, ausfuehren(1), finde)
  assert.equal(rot.stufe, 'rot')
  assert.ok(aufrufe[1].includes('--no-git') && aufrufe[1].includes('--redact'))
  assert.ok(rot.zeilen.some((z) => z.includes('RuleID: generic-api-key')))
  assert.equal(pruefeSecrets(ordner, ausfuehren(0), finde).stufe, 'gruen')
  const kaputt = pruefeSecrets(ordner, ausfuehren(126), finde)
  assert.match(kaputt.zeilen[0], /fehlgeschlagen/)
})

test('(c) ohne gitleaks über Docker; ohne beides sichtbarer Hinweis', () => {
  const ordner = projekt()
  const argumente = []
  const docker = pruefeSecrets(ordner, (programm, a) => {
    argumente.push(a)
    return { status: 0, stdout: '', stderr: '' }
  }, (name) => (name === 'docker' ? '/usr/bin/docker' : null))
  assert.equal(docker.stufe, 'gruen')
  assert.ok(argumente[1].includes('zricethezav/gitleaks:v8.30.1'))
  const keins = pruefeSecrets(ordner, () => assert.fail('darf nichts starten'), () => null)
  assert.equal(keins.stufe, 'hinweis')
  assert.match(keins.zeilen[0], /Secret-Scan NICHT gelaufen/)
  const dockerAus = pruefeSecrets(ordner, () => ({ status: 1, stdout: '', stderr: 'daemon not running' }), (name) => (name === 'docker' ? '/usr/bin/docker' : null))
  assert.equal(dockerAus.stufe, 'hinweis')
  assert.match(dockerAus.zeilen[0], /Docker gefunden .* aber nicht erreichbar/)
})

test('(c) gitleaks gefunden, aber nicht startbar → rot (kein stilles Ausweichen)', () => {
  const ergebnis = pruefeSecrets(projekt(), () => ({ status: null, stdout: '', stderr: '', fehler: 'spawnSync EACCES' }), (name) => (name === 'gitleaks' ? '/opt/gitleaks' : null))
  assert.equal(ergebnis.stufe, 'rot')
  assert.match(ergebnis.zeilen[0], /gitleaks gefunden .* aber nicht startbar \(spawnSync EACCES\)/)
})

test('(c) Programmsuche nur in absoluten PATH-Einträgen, nie im Arbeitsordner', () => {
  const gesehen = []
  const gibtEs = (pfad) => {
    gesehen.push(pfad)
    return pfad === join('C:\\tools', 'gitleaks.exe')
  }
  // Erwartung über path.win32 gebaut: der Test läuft auch auf dem Linux-Runner.
  assert.equal(findeProgramm('gitleaks', '.;relativ;C:\\tools', 'win32', (pfad) => gibtEs(pfad) || pfad === win32.join('C:\\tools', 'gitleaks.exe')), win32.join('C:\\tools', 'gitleaks.exe'))
  assert.equal(gesehen.some((p) => p.startsWith('.') || p.startsWith('relativ')), false)
  assert.equal(findeProgramm('gitleaks', 'bin:/usr/local/bin', 'linux', (pfad) => pfad === '/usr/local/bin/gitleaks'), '/usr/local/bin/gitleaks')
  assert.equal(findeProgramm('gitleaks', 'bin', 'linux', () => true), null)
})

const SETTINGS = (befehle) => JSON.stringify({ hooks: { PreToolUse: [{ matcher: 'Bash', hooks: befehle.map((command) => ({ type: 'command', command })) }] } })

test('(d) Hooks: CommonJS-Hook läuft, unter "type": "module" stürzt er ab → rot', () => {
  const hook = "const fs = require('fs')\nprocess.stdin.on('data', () => {})\nprocess.stdin.on('end', () => process.exit(0))\n"
  const cjs = projekt({ 'package.json': paket({}), '.claude/settings.json': SETTINGS(['node .claude/hooks/h.js']), '.claude/hooks/h.js': hook })
  assert.equal(pruefeHooks(cjs).stufe, 'gruen')
  const esm = projekt({ 'package.json': paket({}, { type: 'module' }), '.claude/settings.json': SETTINGS(['node .claude/hooks/h.js']), '.claude/hooks/h.js': hook })
  const ergebnis = pruefeHooks(esm)
  assert.equal(ergebnis.stufe, 'rot')
  assert.ok(ergebnis.zeilen.some((z) => z.includes('stürzt ab')))
})

test('(d) Hooks: $CLAUDE_PROJECT_DIR wird auf die Projektwurzel aufgelöst', () => {
  const hook = "process.stdin.on('data', () => {})\nprocess.stdin.on('end', () => process.exit(0))\n"
  const ordner = projekt({ '.claude/settings.json': SETTINGS(['node "$CLAUDE_PROJECT_DIR/.claude/hooks/h.js"', 'node $CLAUDE_PROJECT_DIR/.claude/hooks/h.js']), '.claude/hooks/h.js': hook })
  assert.equal(pruefeHooks(ordner).stufe, 'gruen')
})

test('(d) Hooks: fehlende Datei rot, andere Befehlsform Hinweis, ohne settings.json Hinweis', () => {
  assert.equal(pruefeHooks(projekt({ '.claude/settings.json': SETTINGS(['node .claude/hooks/fehlt.js']) })).stufe, 'rot')
  assert.equal(pruefeHooks(projekt({ '.claude/settings.json': SETTINGS(['bash hook.sh']) })).stufe, 'hinweis')
  assert.equal(pruefeHooks(projekt()).stufe, 'hinweis')
  assert.equal(pruefeHooks(projekt({ '.claude/settings.json': '{kaputt' })).stufe, 'rot')
})

test('(d) die Template-Hooks des Skeletts bestehen den Probelauf', () => {
  assert.equal(pruefeHooks(SKELETT).stufe, 'gruen')
})

test('Untergrenze: Bewertung der TAP-Zusammenfassung', () => {
  const tap = (pass, fail) => `TAP version 13\n# tests ${pass + fail}\n# pass ${pass}\n# fail ${fail}\n`
  assert.equal(bewerteTestlauf(tap(3, 0), 0, 1).ok, true)
  assert.match(bewerteTestlauf(tap(0, 0), 0, 1).grund, /Untergrenze 1/)
  assert.match(bewerteTestlauf(tap(2, 1), 1, 1).grund, /Exit 1/)
  assert.match(bewerteTestlauf(tap(2, 1), 0, 1).grund, /fehlgeschlagen/)
  assert.match(bewerteTestlauf('nichts', 0, 1).grund, /keine TAP-Zusammenfassung/)
  // Testausgabe „# pass 99“ vor der echten Zusammenfassung verfälscht die Zählung nicht.
  assert.match(bewerteTestlauf(`# pass 99\n# fail 0\n${tap(0, 0)}`, 0, 1).grund, /nur 0 Test\(s\) bestanden/)
})

test('Untergrenze: echter Lauf ohne Testdateien ist rot, ungültige Untergrenze rot', () => {
  const leer = projekt()
  const skript = join(SKELETT, 'scripts', 'tests-mit-untergrenze.mjs')
  // Ohne NODE_TEST_CONTEXT: sonst meldet das innere node --test als Teiltest an diesen Lauf statt TAP auszugeben.
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'NODE_TEST_CONTEXT'))
  const ohneTests = spawnSync(process.execPath, [skript, '1'], { cwd: leer, encoding: 'utf8', env })
  assert.equal(ohneTests.status, 1)
  assert.match(ohneTests.stdout, /nur 0 Test\(s\) bestanden, Untergrenze 1/)
  assert.equal(spawnSync(process.execPath, [skript, 'null'], { cwd: leer, encoding: 'utf8', env }).status, 1)
})
