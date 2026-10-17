/**
 * Datei: src/rueckfrage/protokoll.test.ts
 *
 * Zweck: node:test-Fälle für das Rückfrage-Protokoll (F45 B2b-3b-1b, features/F45/plan-b2b3b1b-v2.md): Validator des
 * Kern-Artefakts `rueckfragen-<laufId>` (Schema v1 seit B2b-3b-2b-1a: `ab`, `herkunft`; additionalProperties: false), Neutralisierung von Pfaden (Arbeitsordner
 * vor Temp vor Home, roh, `/` und JSON-escaped, ohne Kappen) und der Abgleich A6 zwischen `permission_denials` und Protokoll
 * (fail closed: nur eindeutige, vollständig passende `stefan_abgelehnt`-Einträge ⇒ nur_stefan). Seit F45 B2b-3b-2a
 * `bestaetigeProtokoll` (Speicher der Vermittlung = Quelle der Wahrheit, Datei = Audit; F-1128 (1)); seit B2b-3b-2b-1a
 * `setzeProtokollZusammen` (Zuwachs-Versionen lückenlos zusammensetzen). Seit B2b-3b-2b-1b (F-1128 R1) trägt jeder Standard-Eintrag
 * `stefan_abgelehnt` einen gültigen `ablehnung_hash` und jeder Abgleich passende tool_result-Blöcke (`ERG`) — die Rotfälle
 * scheitern so an ihrer eigenen Regel, nicht am Validator oder am fehlenden Text (Advisor B7).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { kanonischesJson, sha256Hex } from '../checkpoint-store/index.ts'
import { bestaetigeProtokoll, gleicheAblehnungenAb, neutralisiereText, RUECKFRAGE_PROTOKOLL_ARTEN, setzeProtokollZusammen, validiereRueckfrageProtokoll } from './protokoll.ts'

const hashVon = (input: unknown) => sha256Hex(kanonischesJson(input ?? null))
const LAUF = 'lauf-1'

/** Eindeutige Ablehnungstexte (R1) und ihre Hashes. */
const TEXT_A = 'Stefan hat den Befehl abgelehnt. (Ref a)'
const TEXT_B = 'Stefan hat den Befehl abgelehnt. (Ref b)'
const HASH_A = sha256Hex(TEXT_A)
const HASH_B = sha256Hex(TEXT_B)

/** Ein gültiger Eintrag; Felder überschreibbar. ablehnung_hash nur an stefan_abgelehnt (sonst entfernt, außer ausdrücklich gesetzt). */
function eintrag(felder: Record<string, unknown> = {}): Record<string, unknown> {
  const e: Record<string, unknown> = { tool_use_id: 'toolu_a', tool_name: 'Bash', input_hash: hashVon({ command: 'git push' }), art: 'stefan_abgelehnt', grund: 'Stefan hat abgelehnt', zeit: '2026-10-16T10:00:00.000Z', befehl: 'git push', ablehnung_hash: HASH_A, ...felder }
  if (e.art !== 'stefan_abgelehnt' && !('ablehnung_hash' in felder)) delete e.ablehnung_hash
  return e
}
/** tool_result-Blöcke (Form von ermittleToolErgebnisse): je ID ein Block mit is_error und Text. */
const ergebnisse = (...paare: [string, string | null, boolean?][]) => new Map(paare.map(([id, text, fehler = true]) => [id, [{ fehler, text }]]))
/** Standard: die CLI hat für toolu_a und toolu_b genau Stefans Text zurückgegeben. */
const ERG = ergebnisse(['toolu_a', TEXT_A], ['toolu_b', TEXT_B])
const protokoll = (eintraege: unknown[], felder: Record<string, unknown> = {}) => ({ rueckfragen_schema: 'v1', lauf_id: LAUF, ab: 0, eintraege, ...felder })
const denial = (felder: Record<string, unknown> = {}) => ({ tool_name: 'Bash', tool_use_id: 'toolu_a', tool_input: { command: 'git push' }, ...felder })

test('Arten: genau die sieben aus Plan v2 (A5: eigene für Fragen)', () => {
  assert.deepEqual([...RUECKFRAGE_PROTOKOLL_ARTEN], ['auto_deny', 'stefan_erlaubt', 'stefan_abgelehnt', 'zeitueberschreitung', 'lauf_beendet', 'frage_beantwortet', 'frage_ohne_antwort'])
})

test('validiereRueckfrageProtokoll: gültig (mit und ohne Einträge, Frage mit Antwort, tool_use_id null)', () => {
  assert.deepEqual(validiereRueckfrageProtokoll(protokoll([])), [])
  assert.deepEqual(validiereRueckfrageProtokoll(protokoll([eintrag(), eintrag({ tool_use_id: null, art: 'auto_deny' }), { ...eintrag({ tool_name: 'frage_stefan', art: 'frage_beantwortet', frage: 'Port?', antwort: '4711' }), befehl: undefined }].map((e) => JSON.parse(JSON.stringify(e))))), [])
})

test('validiereRueckfrageProtokoll (B2b-3b-2b-1a): herkunft an Antworten gültig, ab > 0 gültig', () => {
  assert.deepEqual(validiereRueckfrageProtokoll(protokoll([eintrag({ herkunft: 'browser' }), eintrag({ art: 'stefan_erlaubt', herkunft: 'nicht_browser' })], { ab: 3 })), [])
})

test('validiereRueckfrageProtokoll: Rotfälle', () => {
  const faelle: [string, unknown][] = [
    ['kein Objekt', null],
    ['Array', []],
    ['falsche Schemaversion', protokoll([], { rueckfragen_schema: 'v0' })],
    ['ab fehlt', JSON.parse(JSON.stringify(protokoll([], { ab: undefined })))],
    ['ab negativ', protokoll([], { ab: -1 })],
    ['ab keine ganze Zahl', protokoll([], { ab: 1.5 })],
    ['herkunft unbekannt', protokoll([eintrag({ herkunft: 'curl' })])],
    ['herkunft an auto_deny', protokoll([eintrag({ art: 'auto_deny', herkunft: 'browser' })])],
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
    ['stefan_abgelehnt ohne ablehnung_hash', protokoll([eintrag({ ablehnung_hash: undefined })].map((e) => JSON.parse(JSON.stringify(e))))],
    ['ablehnung_hash kein Hex', protokoll([eintrag({ ablehnung_hash: 'xyz' })])],
    ['ablehnung_hash an auto_deny', protokoll([eintrag({ art: 'auto_deny', ablehnung_hash: HASH_A })])],
    ['zeit fehlt', protokoll([{ ...eintrag(), zeit: undefined }].map((e) => JSON.parse(JSON.stringify(e))))],
    ['Eintrag kein Objekt', protokoll(['x'])],
  ]
  for (const [name, daten] of faelle) assert.ok(validiereRueckfrageProtokoll(daten).length > 0, name)
  assert.deepEqual(validiereRueckfrageProtokoll(protokoll([eintrag()])), [], 'Positivkontrolle: Standard-Eintrag mit Hash gültig')
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
  assert.deepEqual(gleicheAblehnungenAb([denial()], protokoll([eintrag()]), LAUF, ERG), { art: 'nur_stefan', anzahl: 1 })
  const zweite = eintrag({ tool_use_id: 'toolu_b', input_hash: hashVon({ command: 'npm publish' }), befehl: 'npm publish', ablehnung_hash: HASH_B })
  const erlaubt = eintrag({ tool_use_id: 'toolu_c', art: 'stefan_erlaubt' })
  const frage = eintrag({ tool_use_id: 'toolu_d', tool_name: 'frage_stefan', art: 'frage_beantwortet' })
  assert.deepEqual(gleicheAblehnungenAb([denial(), denial({ tool_use_id: 'toolu_b', tool_input: { command: 'npm publish' } })], protokoll([eintrag(), zweite, erlaubt, frage]), LAUF, ERG), { art: 'nur_stefan', anzahl: 2 })
})

test('gleicheAblehnungenAb: Rotfälle ⇒ nicht_nur_stefan mit Grund (A6, fail closed; Grund seit B2b-3b-2b-2a-1)', () => {
  const faelle: [string, unknown[], unknown, string][] = [
    ['kein Protokoll', [denial()], null, 'protokoll_ungueltig'],
    ['ungültiges Protokoll', [denial()], protokoll([eintrag({ art: 'x' })]), 'protokoll_ungueltig'],
    ['fremder Lauf', [denial()], protokoll([eintrag()], { lauf_id: 'anderer' }), 'protokoll_fremd'],
    ['keine Ablehnung', [], protokoll([eintrag()]), 'keine_ablehnung'],
    ['auto_deny', [denial()], protokoll([eintrag({ art: 'auto_deny' })]), 'nicht_von_stefan'],
    ['zeitueberschreitung', [denial()], protokoll([eintrag({ art: 'zeitueberschreitung' })]), 'nicht_von_stefan'],
    ['lauf_beendet', [denial()], protokoll([eintrag({ art: 'lauf_beendet' })]), 'nicht_von_stefan'],
    ['stefan_erlaubt zur Ablehnungs-ID', [denial()], protokoll([eintrag({ art: 'stefan_erlaubt' })]), 'nicht_von_stefan'],
    ['frage_beantwortet zur Ablehnungs-ID', [denial()], protokoll([eintrag({ art: 'frage_beantwortet' })]), 'nicht_von_stefan'],
    ['ohne Eintrag (Werkzeugsatz-Sperre)', [denial()], protokoll([]), 'kein_eintrag'],
    ['gemischt', [denial(), denial({ tool_use_id: 'toolu_b' })], protokoll([eintrag(), eintrag({ tool_use_id: 'toolu_b', art: 'auto_deny' })]), 'nicht_von_stefan'],
    ['andere tool_use_id', [denial({ tool_use_id: 'toolu_x' })], protokoll([eintrag()]), 'kein_eintrag'],
    ['anderer tool_name', [denial({ tool_name: 'Write' })], protokoll([eintrag()]), 'werkzeug_abweichend'],
    ['anderer Input', [denial({ tool_input: { command: 'git push --force' } })], protokoll([eintrag()]), 'eingabe_abweichend'],
    ['Input fehlt', [denial({ tool_input: undefined })], protokoll([eintrag()]), 'eingabe_abweichend'],
    ['zwei Einträge je ID', [denial()], protokoll([eintrag(), eintrag({ art: 'auto_deny', grund: 'Rückfrage-ID doppelt' })]), 'eintrag_mehrfach'],
    ['doppelte Ablehnungs-ID', [denial(), denial()], protokoll([eintrag()]), 'id_doppelt'],
    ['Ablehnung ohne tool_use_id', [denial({ tool_use_id: undefined })], protokoll([eintrag({ tool_use_id: null })]), 'id_fehlt'],
    ['Ablehnung mit tool_use_id null', [denial({ tool_use_id: null })], protokoll([eintrag({ tool_use_id: null })]), 'id_fehlt'],
    ['Ablehnung kein Objekt', ['x'], protokoll([eintrag()]), 'ablehnung_ungueltig'],
  ]
  for (const [name, denials, daten, grund] of faelle) assert.deepEqual(gleicheAblehnungenAb(denials, daten, LAUF, ERG), { art: 'nicht_nur_stefan', grund }, name)
})

test('gleicheAblehnungenAb (B2b-3b-2b-1b, F-1128 R1): zählt nur, wenn jedes tool_result der ID is_error trägt und genau Stefans Text (String)', () => {
  const d = [denial()]
  const p = protokoll([eintrag()])
  assert.deepEqual(gleicheAblehnungenAb(d, p, LAUF, ERG), { art: 'nur_stefan', anzahl: 1 }, 'Positivkontrolle')
  const faelle: [string, unknown][] = [
    ['ohne Ergebnisse', undefined],
    ['keine Map', { toolu_a: [{ fehler: true, text: TEXT_A }] }],
    ['kein tool_result', ergebnisse(['toolu_x', TEXT_A])],
    ['leere Liste', new Map([['toolu_a', []]])],
    ['is_error false', ergebnisse(['toolu_a', TEXT_A, false])],
    ['statischer CLI-Text (gewaschen)', ergebnisse(['toolu_a', 'Permission to use Bash with command git push has been denied.'])],
    ['Text einer anderen Ablehnung', ergebnisse(['toolu_a', TEXT_B])],
    ['Text mit Zusatz', ergebnisse(['toolu_a', `${TEXT_A} `])],
    ['keine String-Form (O6)', ergebnisse(['toolu_a', null])],
    ['zweiter abweichender Block', new Map([['toolu_a', [{ fehler: true, text: TEXT_A }, { fehler: true, text: 'anders' }]]])],
  ]
  for (const [name, erg] of faelle) assert.deepEqual(gleicheAblehnungenAb(d, p, LAUF, erg as never), { art: 'nicht_nur_stefan', grund: 'ablehnungstext_passt_nicht' }, name)
  assert.deepEqual(gleicheAblehnungenAb(d, p, LAUF, new Map([['toolu_a', [{ fehler: true, text: TEXT_A }, { fehler: true, text: TEXT_A }]]])), { art: 'nur_stefan', anzahl: 1 }, 'doppelt, beide passend')
})

// ─── F45 B2b-3b-2a: Datei gegen den Speicher der Vermittlung (F-1128 (1)) ──────────────────────────────────────────────

/** Speicherform (Projektion von eintraegeVon) zu einem Eintrag. */
const speicherVon = (e: unknown) => {
  const { tool_use_id, tool_name, input_hash, art, ablehnung_hash } = e as Record<string, unknown>
  return { tool_use_id, tool_name, input_hash, art, ...(ablehnung_hash !== undefined ? { ablehnung_hash } : {}) }
}

test('bestaetigeProtokoll: gleiche Vergleichsfelder je Index ⇒ ok mit der Datei', () => {
  const datei = protokoll([eintrag(), eintrag({ tool_use_id: null, art: 'auto_deny' })])
  assert.deepEqual(bestaetigeProtokoll(datei, datei.eintraege.map(speicherVon)), { ok: true, daten: datei })
})

test('bestaetigeProtokoll (B2b-3b-2b-1b, R1): ablehnung_hash gehört zum Vergleich — Datei mit dem Hash des statischen CLI-Texts ⇒ ok:false', () => {
  const echt = protokoll([eintrag()])
  const speicher = echt.eintraege.map(speicherVon)
  assert.equal(bestaetigeProtokoll(echt, speicher).ok, true, 'Positivkontrolle')
  const gefaelscht = bestaetigeProtokoll(protokoll([eintrag({ ablehnung_hash: sha256Hex('Permission to use Bash with command git push has been denied.') })]), speicher)
  assert.equal(gefaelscht.ok, false)
  if (!gefaelscht.ok) assert.match(gefaelscht.grund, /Eintrag 0 weicht ab \(ablehnung_hash\)/)
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

test('gleicheAblehnungenAb (B2b-3b-2b-1a): ein einzelner Zuwachs (ab > 0) ist nie ein ganzes Protokoll', () => {
  assert.deepEqual(gleicheAblehnungenAb([denial()], protokoll([eintrag()], { ab: 1 }), LAUF, ERG), { art: 'nicht_nur_stefan', grund: 'protokoll_fremd' })
  assert.deepEqual(gleicheAblehnungenAb([denial()], protokoll([eintrag()]), LAUF, ERG), { art: 'nur_stefan', anzahl: 1 })
})

test('bestaetigeProtokoll (Delta D5): nicht zusammensetzbare Datei ⇒ ok:false mit Grund, auch bei leerem Speicher', () => {
  assert.deepEqual(bestaetigeProtokoll({ ungueltig: 'Version 2 lückenhaft (ab 3, erwartet 1)' }, []), { ok: false, grund: 'Datei nicht zusammensetzbar (Version 2 lückenhaft (ab 3, erwartet 1))' })
})

test('setzeProtokollZusammen: Zuwachs-Versionen lückenlos ⇒ ganzes Protokoll mit ab 0; keine Version ⇒ null', () => {
  const v = (nr: number, ab: number, eintraege: unknown[]) => ({ versionSequenz: nr, daten: protokoll(eintraege, { ab }) })
  const a = eintrag({ tool_use_id: 'a', art: 'auto_deny' })
  const b = eintrag({ tool_use_id: 'b' })
  const c = eintrag({ tool_use_id: 'c', art: 'lauf_beendet' })
  assert.deepEqual(setzeProtokollZusammen([], LAUF), { ok: true, daten: null })
  assert.deepEqual(setzeProtokollZusammen([v(1, 0, [a]), v(2, 1, [b, c]), v(3, 3, [])], LAUF), { ok: true, daten: protokoll([a, b, c]) })
})

test('setzeProtokollZusammen: Lücke, Überlappung, erste Version ab ≠ 0, fremder Lauf, ungültige Version ⇒ ok:false mit Grund (fail closed)', () => {
  const v = (nr: number, ab: number, eintraege: unknown[], felder: Record<string, unknown> = {}) => ({ versionSequenz: nr, daten: protokoll(eintraege, { ab, ...felder }) })
  const e = eintrag()
  const faelle: [string, { versionSequenz: number; daten: unknown }[], RegExp][] = [
    ['Lücke', [v(1, 0, [e]), v(2, 2, [e])], /Version 2 lückenhaft \(ab 2, erwartet 1\)/],
    ['Überlappung', [v(1, 0, [e]), v(2, 0, [e])], /Version 2 lückenhaft \(ab 0, erwartet 1\)/],
    ['erste ab 1', [v(1, 1, [e])], /Version 1 lückenhaft/],
    ['fremder Lauf', [v(1, 0, [e], { lauf_id: 'anderer' })], /anderen Lauf/],
    ['ungültig', [{ versionSequenz: 1, daten: { rueckfragen_schema: 'v0', lauf_id: LAUF, eintraege: [] } }], /Version 1 ungültig/],
    ['kein Objekt', [{ versionSequenz: 1, daten: null }], /Version 1 ungültig/],
  ]
  for (const [name, versionen, muster] of faelle) {
    const ergebnis = setzeProtokollZusammen(versionen, LAUF)
    assert.equal(ergebnis.ok, false, name)
    if (!ergebnis.ok) assert.match(ergebnis.grund, muster, name)
  }
})
