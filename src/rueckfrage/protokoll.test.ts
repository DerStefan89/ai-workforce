/**
 * Datei: src/rueckfrage/protokoll.test.ts
 *
 * Zweck: node:test-Fälle für das Rückfrage-Protokoll (F45 B2b-3b-1b, features/F45/plan-b2b3b1b-v2.md): Validator des
 * Kern-Artefakts `rueckfragen-<laufId>` (Schema v0, additionalProperties: false), Neutralisierung von Pfaden (Arbeitsordner
 * vor Temp vor Home, roh, `/` und JSON-escaped, ohne Kappen) und der Abgleich A6 zwischen `permission_denials` und Protokoll
 * (fail closed: nur eindeutige, vollständig passende `stefan_abgelehnt`-Einträge ⇒ nur_stefan). Seit F45 B2b-3b-2a
 * `bestaetigeProtokoll` (Speicher der Vermittlung = Quelle der Wahrheit, Datei = Audit; F-1128 (1)).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { kanonischesJson, sha256Hex } from '../checkpoint-store/index.ts'
import { bestaetigeProtokoll, gleicheAblehnungenAb, neutralisiereText, RUECKFRAGE_PROTOKOLL_ARTEN, validiereRueckfrageProtokoll } from './protokoll.ts'

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
  const orte = { arbeitsordner: 'C:\\Users\\nutzer\\AppData\\Local\\Temp\\wf\\abc', temp: 'C:\\Users\\nutzer\\AppData\\Local\\Temp', home: 'C:\\Users\\nutzer', plattform: 'win32' as const }
  assert.equal(neutralisiereText('cat C:\\Users\\nutzer\\AppData\\Local\\Temp\\wf\\abc\\x.txt', orte), 'cat <ARBEITSORDNER>\\x.txt')
  assert.equal(neutralisiereText('ls C:/Users/nutzer/AppData/Local/Temp/andere', orte), 'ls <TEMP>/andere')
  assert.equal(neutralisiereText('{"p":"C:\\\\Users\\\\nutzer\\\\.ssh"}', orte), '{"p":"<HOME>\\\\.ssh"}')
  assert.equal(neutralisiereText('type c:\\users\\NUTZER\\notiz', orte), 'type <HOME>\\notiz')
  const lang = 'x'.repeat(5000)
  assert.equal(neutralisiereText(lang, orte), lang)
  assert.equal(neutralisiereText('nichts', { arbeitsordner: '', temp: '', home: '' }), 'nichts')
})

test('neutralisiereText: posix mit Groß/klein', () => {
  const orte = { arbeitsordner: '/home/nutzer/wf', temp: '/tmp', home: '/home/nutzer', plattform: 'posix' as const }
  assert.equal(neutralisiereText('cat /home/nutzer/wf/a /tmp/b /home/nutzer/c /HOME/nutzer/d', orte), 'cat <ARBEITSORDNER>/a <TEMP>/b <HOME>/c /HOME/nutzer/d')
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

// ─── F45 B2b-3b-2a: Datei gegen den Speicher der Vermittlung (F-1128 (1)) ──────────────────────────────────────────────

/** Speicherform (Projektion von eintraegeVon) zu einem Eintrag. */
const speicherVon = (e: unknown) => {
  const { tool_use_id, tool_name, input_hash, art } = e as Record<string, unknown>
  return { tool_use_id, tool_name, input_hash, art }
}

test('bestaetigeProtokoll: gleiche vier Felder je Index ⇒ ok mit der Datei', () => {
  const datei = protokoll([eintrag(), eintrag({ tool_use_id: null, art: 'auto_deny' })])
  assert.deepEqual(bestaetigeProtokoll(datei, datei.eintraege.map(speicherVon)), { ok: true, daten: datei })
})

test('bestaetigeProtokoll: gefälschte Art, fremde ID, anderer Hash/Werkzeug, Länge ⇒ ok:false mit Grund', () => {
  const speicher = [eintrag({ art: 'auto_deny' })].map(speicherVon)
  const faelle: [string, unknown, RegExp][] = [
    ['Art gefälscht', protokoll([eintrag({ art: 'stefan_abgelehnt' })]), /Eintrag 0 weicht ab \(art\)/],
    ['ID', protokoll([eintrag({ art: 'auto_deny', tool_use_id: 'toolu_x' })]), /Eintrag 0 weicht ab \(tool_use_id\)/],
    ['Hash', protokoll([eintrag({ art: 'auto_deny', input_hash: 'f'.repeat(64) })]), /Eintrag 0 weicht ab \(input_hash\)/],
    ['Werkzeug', protokoll([eintrag({ art: 'auto_deny', tool_name: 'PowerShell' })]), /Eintrag 0 weicht ab \(tool_name\)/],
    ['länger', protokoll([eintrag({ art: 'auto_deny' }), eintrag()]), /Länge abweichend \(Speicher 1, Datei 2\)/],
    ['kürzer', protokoll([]), /Länge abweichend \(Speicher 1, Datei 0\)/],
  ]
  for (const [name, datei, grund] of faelle) {
    const ergebnis = bestaetigeProtokoll(datei, speicher)
    assert.equal(ergebnis.ok, false, name)
    if (!ergebnis.ok) assert.match(ergebnis.grund, grund, name)
  }
})

test('bestaetigeProtokoll: Speicher fehlt, Datei fehlt/kein Objekt/eintraege keine Liste, Eintrag kein Objekt ⇒ ok:false, wirft nie (Delta D1)', () => {
  const datei = protokoll([eintrag()])
  const speicher = datei.eintraege.map(speicherVon)
  const faelle: [unknown, unknown, RegExp][] = [
    [datei, null, /Speicher fehlt/],
    [datei, undefined, /Speicher fehlt/],
    [datei, 'x', /Speicher fehlt/],
    [null, speicher, /Datei fehlt/],
    ['x', speicher, /Datei fehlt/],
    [{ ...datei, eintraege: 'x' }, speicher, /Datei fehlt/],
    [protokoll([null]), speicher, /Eintrag 0 ist kein Objekt/],
    [datei, [null], /Eintrag 0 ist kein Objekt/],
  ]
  for (const [d, s, grund] of faelle) {
    const ergebnis = bestaetigeProtokoll(d, s)
    assert.equal(ergebnis.ok, false)
    if (!ergebnis.ok) assert.match(ergebnis.grund, grund)
  }
})

test('bestaetigeProtokoll: Speicher leer und Datei fehlt ⇒ ok:false mit leer: true (Normalfall ohne Rückfrage, Delta D2)', () => {
  assert.deepEqual(bestaetigeProtokoll(null, []), { ok: false, grund: 'keine Rückfrage im Lauf', leer: true })
  assert.equal(bestaetigeProtokoll(protokoll([]), []).ok, true)
  assert.deepEqual(bestaetigeProtokoll({ eintraege: 'x' }, []), { ok: false, grund: 'Datei fehlt oder ist kein Protokoll' }, 'kaputte Datei bei leerem Speicher wird gemeldet (code-reviewer 7)')
})
