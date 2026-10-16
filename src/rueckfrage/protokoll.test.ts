/**
 * Datei: src/rueckfrage/protokoll.test.ts
 *
 * Zweck: node:test-Fälle für das Rückfrage-Protokoll (F45 B2b-3b-1b, features/F45/plan-b2b3b1b-v2.md): Validator des
 * Kern-Artefakts `rueckfragen-<laufId>` (Schema v0, additionalProperties: false), Neutralisierung von Pfaden (Arbeitsordner
 * vor Temp vor Home, roh, `/` und JSON-escaped, ohne Kappen) und der Abgleich A6 zwischen `permission_denials` und Protokoll
 * (fail closed: nur eindeutige, vollständig passende `stefan_abgelehnt`-Einträge ⇒ nur_stefan).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { kanonischesJson, sha256Hex } from '../checkpoint-store/index.ts'
import { gleicheAblehnungenAb, neutralisiereText, RUECKFRAGE_PROTOKOLL_ARTEN, validiereRueckfrageProtokoll } from './protokoll.ts'

const hashVon = (input: unknown) => sha256Hex(kanonischesJson(input ?? null))
const LAUF = 'lauf-1'

/** Ein gültiger Eintrag; Felder überschreibbar. */
function eintrag(felder: Record<string, unknown> = {}): Record<string, unknown> {
  return { tool_use_id: 'toolu_a', tool_name: 'Bash', input_hash: hashVon({ command: 'git push' }), art: 'stefan_abgelehnt', grund: 'Stefan hat abgelehnt', zeit: '2026-10-16T10:00:00.000Z', befehl: 'git push', ...felder }
}
const protokoll = (eintraege: unknown[], felder: Record<string, unknown> = {}) => ({ rueckfragen_schema: 'v0', lauf_id: LAUF, eintraege, ...felder })
const denial = (felder: Record<string, unknown> = {}) => ({ tool_name: 'Bash', tool_use_id: 'toolu_a', tool_input: { command: 'git push' }, ...felder })

test('Arten: genau die sieben aus Plan v2 (A5: eigene für Fragen)', () => {
  assert.deepEqual([...RUECKFRAGE_PROTOKOLL_ARTEN], ['auto_deny', 'stefan_erlaubt', 'stefan_abgelehnt', 'zeitueberschreitung', 'lauf_beendet', 'frage_beantwortet', 'frage_ohne_antwort'])
})

test('validiereRueckfrageProtokoll: gültig (mit und ohne Einträge, Frage mit Antwort, tool_use_id null)', () => {
  assert.deepEqual(validiereRueckfrageProtokoll(protokoll([])), [])
  assert.deepEqual(validiereRueckfrageProtokoll(protokoll([eintrag(), eintrag({ tool_use_id: null, art: 'auto_deny' }), { ...eintrag({ tool_name: 'frage_stefan', art: 'frage_beantwortet', frage: 'Port?', antwort: '4711' }), befehl: undefined }].map((e) => JSON.parse(JSON.stringify(e))))), [])
})

test('validiereRueckfrageProtokoll: Rotfälle', () => {
  const faelle: [string, unknown][] = [
    ['kein Objekt', null],
    ['Array', []],
    ['falsche Schemaversion', protokoll([], { rueckfragen_schema: 'v1' })],
    ['lauf_id leer', protokoll([], { lauf_id: '' })],
    ['eintraege kein Array', protokoll([], { eintraege: {} })],
    ['unbekanntes Feld oben', protokoll([], { extra: 1 })],
    ['unbekannte Art', protokoll([eintrag({ art: 'immer_erlaubt' })])],
    ['unbekanntes Feld im Eintrag', protokoll([eintrag({ werkzeug: 'Bash' })])],
    ['input_hash kein Hex', protokoll([eintrag({ input_hash: 'abc' })])],
    ['tool_use_id leer', protokoll([eintrag({ tool_use_id: '' })])],
    ['tool_use_id zu lang', protokoll([eintrag({ tool_use_id: 'x'.repeat(201) })])],
    ['tool_name zu lang', protokoll([eintrag({ tool_name: 'x'.repeat(201) })])],
    ['grund zu lang', protokoll([eintrag({ grund: 'x'.repeat(501) })])],
    ['befehl zu lang', protokoll([eintrag({ befehl: 'x'.repeat(2001) })])],
    ['zeit fehlt', protokoll([{ ...eintrag(), zeit: undefined }].map((e) => JSON.parse(JSON.stringify(e))))],
    ['Eintrag kein Objekt', protokoll(['x'])],
  ]
  for (const [name, daten] of faelle) assert.ok(validiereRueckfrageProtokoll(daten).length > 0, name)
})

test('neutralisiereText: Arbeitsordner vor Temp vor Home, roh, mit / und JSON-escaped; win32 ohne Groß/klein; kein Kappen', () => {
  const orte = { arbeitsordner: 'C:\\Users\\stefan\\AppData\\Local\\Temp\\wf\\abc', temp: 'C:\\Users\\stefan\\AppData\\Local\\Temp', home: 'C:\\Users\\stefan', plattform: 'win32' as const }
  assert.equal(neutralisiereText('cat C:\\Users\\stefan\\AppData\\Local\\Temp\\wf\\abc\\x.txt', orte), 'cat <ARBEITSORDNER>\\x.txt')
  assert.equal(neutralisiereText('ls C:/Users/stefan/AppData/Local/Temp/andere', orte), 'ls <TEMP>/andere')
  assert.equal(neutralisiereText('{"p":"C:\\\\Users\\\\stefan\\\\.ssh"}', orte), '{"p":"<HOME>\\\\.ssh"}')
  assert.equal(neutralisiereText('type c:\\users\\STEFAN\\notiz', orte), 'type <HOME>\\notiz')
  const lang = 'x'.repeat(5000)
  assert.equal(neutralisiereText(lang, orte), lang)
  assert.equal(neutralisiereText('nichts', { arbeitsordner: '', temp: '', home: '' }), 'nichts')
})

test('neutralisiereText: posix mit Groß/klein', () => {
  const orte = { arbeitsordner: '/home/stefan/wf', temp: '/tmp', home: '/home/stefan', plattform: 'posix' as const }
  assert.equal(neutralisiereText('cat /home/stefan/wf/a /tmp/b /home/stefan/c /HOME/stefan/d', orte), 'cat <ARBEITSORDNER>/a <TEMP>/b <HOME>/c /HOME/stefan/d')
})

test('gleicheAblehnungenAb: nur Stefan ⇒ nur_stefan mit Anzahl (eine und zwei Ablehnungen, andere Einträge daneben)', () => {
  assert.deepEqual(gleicheAblehnungenAb([denial()], protokoll([eintrag()]), LAUF), { art: 'nur_stefan', anzahl: 1 })
  const zweite = eintrag({ tool_use_id: 'toolu_b', input_hash: hashVon({ command: 'npm publish' }), befehl: 'npm publish' })
  const erlaubt = eintrag({ tool_use_id: 'toolu_c', art: 'stefan_erlaubt' })
  const frage = eintrag({ tool_use_id: 'toolu_d', tool_name: 'frage_stefan', art: 'frage_beantwortet' })
  assert.deepEqual(gleicheAblehnungenAb([denial(), denial({ tool_use_id: 'toolu_b', tool_input: { command: 'npm publish' } })], protokoll([eintrag(), zweite, erlaubt, frage]), LAUF), { art: 'nur_stefan', anzahl: 2 })
})

test('gleicheAblehnungenAb: Rotfälle ⇒ nicht_nur_stefan (A6, fail closed)', () => {
  const nein = { art: 'nicht_nur_stefan' }
  const faelle: [string, unknown[], unknown, string?][] = [
    ['kein Protokoll', [denial()], null],
    ['ungültiges Protokoll', [denial()], protokoll([eintrag({ art: 'x' })])],
    ['fremder Lauf', [denial()], protokoll([eintrag()], { lauf_id: 'anderer' })],
    ['keine Ablehnung', [], protokoll([eintrag()])],
    ['auto_deny', [denial()], protokoll([eintrag({ art: 'auto_deny' })])],
    ['zeitueberschreitung', [denial()], protokoll([eintrag({ art: 'zeitueberschreitung' })])],
    ['lauf_beendet', [denial()], protokoll([eintrag({ art: 'lauf_beendet' })])],
    ['stefan_erlaubt zur Ablehnungs-ID', [denial()], protokoll([eintrag({ art: 'stefan_erlaubt' })])],
    ['frage_beantwortet zur Ablehnungs-ID', [denial()], protokoll([eintrag({ art: 'frage_beantwortet' })])],
    ['ohne Eintrag (Werkzeugsatz-Sperre)', [denial()], protokoll([])],
    ['gemischt', [denial(), denial({ tool_use_id: 'toolu_b' })], protokoll([eintrag(), eintrag({ tool_use_id: 'toolu_b', art: 'auto_deny' })])],
    ['andere tool_use_id', [denial({ tool_use_id: 'toolu_x' })], protokoll([eintrag()])],
    ['anderer tool_name', [denial({ tool_name: 'Write' })], protokoll([eintrag()])],
    ['anderer Input', [denial({ tool_input: { command: 'git push --force' } })], protokoll([eintrag()])],
    ['Input fehlt', [denial({ tool_input: undefined })], protokoll([eintrag()])],
    ['zwei Einträge je ID', [denial()], protokoll([eintrag(), eintrag({ art: 'auto_deny', grund: 'Rückfrage-ID doppelt' })])],
    ['doppelte Ablehnungs-ID', [denial(), denial()], protokoll([eintrag()])],
    ['Ablehnung ohne tool_use_id', [denial({ tool_use_id: undefined })], protokoll([eintrag({ tool_use_id: null })])],
    ['Ablehnung mit tool_use_id null', [denial({ tool_use_id: null })], protokoll([eintrag({ tool_use_id: null })])],
    ['Ablehnung kein Objekt', ['x'], protokoll([eintrag()])],
  ]
  for (const [name, denials, daten] of faelle) assert.deepEqual(gleicheAblehnungenAb(denials, daten, LAUF), nein, name)
})
