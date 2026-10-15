/**
 * Datei: features/F45/nachweise/b2b1b/schwaerze.test.mjs
 *
 * Zweck: F-1111 (3) — Schwärzung der Nachweise: Temp-Ordner → <TEMP> (vor dem Benutzerordner), Benutzerordner →
 * <HOME>, in allen Schreibweisen (doppelt/einfach JSON-escaped, Vorwärtsstriche, Slug, roh); der Modus `--json`
 * behandelt ganze, mehrzeilige JSON-Dateien mit Restprüfung, ohne Schalter bleibt die zeilenweise
 * NDJSON-Behandlung der Rohströme.
 *
 * Wird aufgerufen von:
 * - npm run test (node --test)
 */

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { raeumeVerzeichnis } from '../../../../scripts/_aufraeumen.ts'
import { hatRestpfad, schwaerze } from './schwaerze.mjs'

const SKRIPT = fileURLToPath(new URL('./schwaerze.mjs', import.meta.url))
const HOME = 'C:\\Users\\beispiel'
const TEMP = 'C:\\Users\\beispiel\\AppData\\Local\\Temp'
// Die CLI bekommt Home und Temp über die Test-Variablen — unabhängig von os.homedir()/os.tmpdir() der Maschine.
const CLI_UMGEBUNG = { ...process.env, SCHWAERZE_HOME: HOME, SCHWAERZE_TEMP: TEMP }
const cli = (...argumente) => spawnSync(process.execPath, [SKRIPT, ...argumente], { encoding: 'utf8', env: CLI_UMGEBUNG })

test('schwaerze: Temp-Pfad → <TEMP>, Benutzerordner → <HOME> (JSON-escaped)', () => {
  const ein = JSON.stringify({ a: `${TEMP}\\b1b1-lauf-x\\datei.txt`, b: `${HOME}\\Projekte\\p` })
  assert.equal(schwaerze(ein, HOME, TEMP), JSON.stringify({ a: '<TEMP>\\b1b1-lauf-x\\datei.txt', b: '<HOME>\\Projekte\\p' }))
})

test('schwaerze: doppelt JSON-escaped (JSON-Text in einem JSON-String)', () => {
  const ein = JSON.stringify(JSON.stringify({ a: `${TEMP}\\claude\\t.output`, b: `${HOME}\\x` }))
  assert.equal(JSON.parse(JSON.parse(schwaerze(ein, HOME, TEMP))).a, '<TEMP>\\claude\\t.output')
  assert.equal(JSON.parse(JSON.parse(schwaerze(ein, HOME, TEMP))).b, '<HOME>\\x')
})

test('schwaerze: Vorwärtsstriche und Projekt-Slug, Groß-/Kleinschreibung egal', () => {
  const ein = 'c:/users/BEISPIEL/AppData/Local/Temp/x C--Users-beispiel-AppData-Local-Temp-b1b1 C:/Users/beispiel/y C--Users-beispiel-Projekte'
  assert.equal(schwaerze(ein, HOME, TEMP), '<TEMP>/x <TEMP>-b1b1 <HOME>/y <HOME>-Projekte')
})

test('schwaerze: messaging_socket_path → <PIPE>', () => {
  assert.equal(schwaerze('{"messaging_socket_path": "\\\\\\\\.\\\\pipe\\\\abc"}', HOME, TEMP), '{"messaging_socket_path": "<PIPE>"}')
})

test('schwaerze: roher Pfad im Klartext (stderr) und zweiter Lauf ohne Wirkung', () => {
  const einmal = schwaerze(`Fehler in ${TEMP}\\x.txt und ${HOME}\\y`, HOME, TEMP)
  assert.equal(einmal, 'Fehler in <TEMP>\\x.txt und <HOME>\\y')
  assert.equal(schwaerze(einmal, HOME, TEMP), einmal)
})

test('schwaerze: Basispfade mit weniger als zwei Segmenten werden übersprungen', () => {
  assert.equal(schwaerze('/a/b-c', '/', '/tmp'), '/a/b-c')
})

test('hatRestpfad: Name des Benutzerordners als Pfadsegment', () => {
  assert.equal(hatRestpfad('<HOME>\\x <TEMP>-b1b1', HOME), false)
  assert.equal(hatRestpfad('C:\\\\\\\\\\\\\\\\Users\\\\\\\\\\\\\\\\beispiel\\\\\\\\x', HOME), true)
  assert.equal(hatRestpfad('Projekt-Beispiel-Slug', HOME), true)
  assert.equal(hatRestpfad('Beispielname im Text', HOME), false)
})

test('CLI --json: Restprüfung bricht ab und lässt die Datei unverändert', () => {
  const ordner = mkdtempSync(join(tmpdir(), 'schwaerze-test-'))
  try {
    const datei = join(ordner, 'zaehlung.json')
    const inhalt = JSON.stringify({ rest: 'slug-beispiel-rest' })
    writeFileSync(datei, inhalt)
    const lauf = cli('--json', datei)
    assert.equal(lauf.status, 1)
    assert.match(lauf.stderr, /Benutzerordner nach Schwärzung noch enthalten/)
    assert.equal(readFileSync(datei, 'utf8'), inhalt)
  } finally {
    raeumeVerzeichnis(ordner)
  }
})

test('CLI --json: mehrzeilige JSON-Datei als Ganzes, gültiges JSON, keine Pfade mehr', () => {
  const ordner = mkdtempSync(join(tmpdir(), 'schwaerze-test-'))
  try {
    const datei = join(ordner, 'zaehlung.json')
    writeFileSync(datei, JSON.stringify({ temp: `${TEMP}\\b1b1-lauf-x\\a.txt`, home: `${HOME}\\x` }, null, 2))
    const lauf = cli('--json', datei)
    assert.equal(lauf.status, 0, lauf.stderr)
    const j = JSON.parse(readFileSync(datei, 'utf8'))
    assert.equal(j.temp, '<TEMP>\\b1b1-lauf-x\\a.txt')
    assert.equal(j.home, '<HOME>\\x')
  } finally {
    raeumeVerzeichnis(ordner)
  }
})

test('CLI ohne --json: NDJSON zeilenweise, mehrzeiliges JSON wird abgelehnt und bleibt unverändert', () => {
  const ordner = mkdtempSync(join(tmpdir(), 'schwaerze-test-'))
  try {
    const ndjson = join(ordner, 'rohstrom.json')
    writeFileSync(ndjson, `${JSON.stringify({ p: HOME })}\n${JSON.stringify({ q: 1 })}\n`)
    assert.equal(cli(ndjson).status, 0)
    assert.equal(readFileSync(ndjson, 'utf8'), '{"p":"<HOME>"}\n{"q":1}\n')

    const mehrzeilig = join(ordner, 'zaehlung.json')
    const inhalt = JSON.stringify({ p: HOME }, null, 2)
    writeFileSync(mehrzeilig, inhalt)
    assert.equal(cli(mehrzeilig).status, 1)
    assert.equal(readFileSync(mehrzeilig, 'utf8'), inhalt)
  } finally {
    raeumeVerzeichnis(ordner)
  }
})
