/**
 * Datei: scripts/leitstand/rueckfrage-vermittlung.test.mjs
 *
 * Zweck: Tests der Vermittlung des Rückfrage-Kanals (F45 B2b-3b-1a, features/F45/plan-b2b3b1a-v2.md §3): Token nur für
 * offene Läufe, auto_deny ohne Warteschlangeneintrag, doppelte tool_use_id, nur „einmal erlauben“/„ablehnen“, genau einmal
 * beantwortbar, Entscheidung zwischen zwei Polls bleibt erhalten (A7), Wartegrenze, Lauf-Ende, Protokoll vor Auslieferung.
 *
 * Wird aufgerufen von: `npm run test` (node --test)
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import { KEINE_ANTWORT, erzeugeRueckfrageVermittlung } from './rueckfrage-vermittlung.mjs'

const TOKEN = 'b'.repeat(64)
const ORDNER = process.platform === 'win32' ? 'C:\\proj\\wf' : '/proj/wf'
const PFAD = { realpath: (p) => p }
const KANAL = { token: TOKEN, arbeitsordner: ORDNER, werkzeugNamen: ['Read', 'Write', 'Bash'] }

/** Vermittlung mit offenem Lauf 'l1' und mitgeschriebenem Protokoll. */
function aufbau(optionen = {}) {
  const protokoll = []
  const v = erzeugeRueckfrageVermittlung({ pfadOptionen: PFAD, protokolliere: (laufId, e) => protokoll.push({ laufId, ...e }), ...optionen })
  v.oeffneLauf('l1', KANAL)
  return { v, protokoll }
}

test('laufZuToken: nur ein offener Lauf mit genau diesem Token', () => {
  const { v } = aufbau()
  assert.equal(v.laufZuToken(TOKEN), 'l1')
  assert.equal(v.laufZuToken('c'.repeat(64)), null)
  assert.equal(v.laufZuToken('kurz'), null)
  assert.equal(v.laufZuToken(undefined), null)
  v.beendeLauf('l1')
  assert.equal(v.laufZuToken(TOKEN), null)
})

test('stelle: Write außerhalb ⇒ sofort deny, kein Eintrag, Protokoll auto_deny', () => {
  const { v, protokoll } = aufbau()
  const r = v.stelle('l1', { art: 'rechte', tool_name: 'Write', input: { file_path: '../x.txt', content: 'x' }, tool_use_id: 't1' })
  assert.equal(r.ok, true)
  assert.equal(r.entscheidung.behavior, 'deny')
  assert.match(r.entscheidung.message, /außerhalb/)
  assert.deepEqual(v.offene(), [])
  assert.equal(protokoll.length, 1)
  assert.equal(protokoll[0].art, 'auto_deny')
  assert.equal(protokoll[0].tool_use_id, 't1')
  assert.equal(protokoll[0].tool_name, 'Write')
  assert.match(protokoll[0].input_hash, /^[0-9a-f]{64}$/)
})

test('stelle: Bash ⇒ Warteschlange, Befehl wörtlich; einmal_erlauben ⇒ allow, genau einmal (409)', async () => {
  const { v, protokoll } = aufbau()
  const r = v.stelle('l1', { art: 'rechte', tool_name: 'Bash', input: { command: 'node -e "1"' }, tool_use_id: 't2' })
  assert.equal(r.ok, true)
  assert.ok(r.id)
  assert.deepEqual(v.offene().map((e) => [e.id, e.befehl, e.lauf_id]), [[r.id, 'node -e "1"', 'l1']])
  const wartend = v.warte('l1', r.id)
  assert.deepEqual(v.beantworte(r.id, { entscheidung: 'einmal_erlauben' }), { ok: true })
  assert.deepEqual(await wartend, { ok: true, entscheidung: { behavior: 'allow' } })
  assert.equal(v.beantworte(r.id, { entscheidung: 'ablehnen' }).status, 409)
  assert.deepEqual(v.offene(), [])
  assert.equal(protokoll.at(-1).art, 'stefan_erlaubt')
})

test('beantworte: „immer“ und Unsinn ⇒ 400, unbekannt ⇒ 404; Frage braucht Text', () => {
  const { v } = aufbau()
  const r = v.stelle('l1', { art: 'rechte', tool_name: 'Bash', input: { command: 'ls' }, tool_use_id: 't3' })
  for (const antwort of [{ entscheidung: 'immer' }, { entscheidung: 'immer_erlauben' }, {}, null, 'einmal_erlauben']) assert.equal(v.beantworte(r.id, antwort).status, 400)
  assert.equal(v.beantworte('00000000-0000-0000-0000-000000000000', { entscheidung: 'ablehnen' }).status, 404)
  const f = v.stelle('l1', { art: 'frage', frage: 'Welcher Port?', optionen: ['3000', '8080'], tool_use_id: 't4' })
  assert.equal(v.beantworte(f.id, { antwort: '   ' }).status, 400)
  assert.deepEqual(v.beantworte(f.id, { antwort: 'Port 4711' }), { ok: true })
})

test('A7: Entscheidung zwischen zwei Polls geht nicht verloren; Poll ohne Entscheidung ⇒ offen', async () => {
  const { v } = aufbau({ pollFensterMs: 20 })
  const r = v.stelle('l1', { art: 'rechte', tool_name: 'Bash', input: { command: 'ls' }, tool_use_id: 't5' })
  assert.deepEqual(await v.warte('l1', r.id), { ok: true, offen: true })
  v.beantworte(r.id, { entscheidung: 'ablehnen' })
  const nachher = await v.warte('l1', r.id)
  assert.equal(nachher.entscheidung.behavior, 'deny')
  assert.equal((await v.warte('l2', r.id)).status, 404, 'fremder Lauf')
})

test('doppelte tool_use_id ⇒ auto_deny, auch nach einem auto_deny (H5)', () => {
  const { v, protokoll } = aufbau()
  v.stelle('l1', { art: 'rechte', tool_name: 'Write', input: { file_path: '../x' }, tool_use_id: 'dup' })
  const zweite = v.stelle('l1', { art: 'rechte', tool_name: 'Bash', input: { command: 'ls' }, tool_use_id: 'dup' })
  assert.equal(zweite.entscheidung.behavior, 'deny')
  assert.match(zweite.entscheidung.message, /doppelt/)
  assert.deepEqual(v.offene(), [])
  assert.equal(protokoll.length, 2)
})

test('Wartegrenze ⇒ deny zeitueberschreitung bzw. Frage ohne Antwort', async () => {
  const { v, protokoll } = aufbau({ warteGrenzeMs: 30, pollFensterMs: 1000 })
  const r = v.stelle('l1', { art: 'rechte', tool_name: 'Bash', input: { command: 'ls' }, tool_use_id: 't6' })
  const f = v.stelle('l1', { art: 'frage', frage: 'x?', optionen: [], tool_use_id: 't7' })
  assert.equal((await v.warte('l1', r.id)).entscheidung.behavior, 'deny')
  assert.deepEqual((await v.warte('l1', f.id)).entscheidung, { antwort: KEINE_ANTWORT })
  assert.deepEqual(protokoll.map((e) => e.art).sort(), ['frage_ohne_antwort', 'zeitueberschreitung'])
})

test('beendeLauf: offene ⇒ lauf_beendet, Token ungültig, idempotent; unbekannter Lauf No-op', async () => {
  const { v, protokoll } = aufbau({ pollFensterMs: 1000 })
  const r = v.stelle('l1', { art: 'rechte', tool_name: 'Bash', input: { command: 'ls' }, tool_use_id: 't8' })
  const wartend = v.warte('l1', r.id)
  v.beendeLauf('l1')
  v.beendeLauf('l1')
  v.beendeLauf('nie-geoeffnet')
  assert.equal((await wartend).entscheidung.behavior, 'deny')
  assert.equal(protokoll.at(-1).art, 'lauf_beendet')
  assert.deepEqual(v.offene(), [])
  assert.equal(v.laufZuToken(TOKEN), null)
  assert.equal(v.stelle('l1', { art: 'rechte', tool_name: 'Bash', input: { command: 'ls' } }).status, 403)
})

test('Formfehler ⇒ 400; Protokoll-Wurf ändert die Entscheidung nicht', () => {
  const v = erzeugeRueckfrageVermittlung({
    pfadOptionen: PFAD,
    protokolliere: () => {
      throw new Error('Platte voll')
    },
  })
  v.oeffneLauf('l1', KANAL)
  for (const roh of [null, [], { art: 'x' }, { art: 'rechte' }, { art: 'frage', frage: '' }, { art: 'frage', frage: 'x', optionen: 'a' }, { art: 'rechte', tool_name: 'Bash', tool_use_id: 5 }]) {
    assert.equal(v.stelle('l1', roh).status, 400, JSON.stringify(roh))
  }
  const r = v.stelle('l1', { art: 'rechte', tool_name: 'Read', input: { file_path: 'x' } })
  assert.equal(r.entscheidung.behavior, 'deny')
})

test('nach Zeitüberschreitung ⇒ 409, nach Lauf-Ende ⇒ 404 (nur offene Rückfragen offener Läufe)', async () => {
  const { v } = aufbau({ warteGrenzeMs: 20, pollFensterMs: 1000 })
  const r = v.stelle('l1', { art: 'rechte', tool_name: 'Bash', input: { command: 'ls' }, tool_use_id: 't9' })
  await v.warte('l1', r.id)
  assert.equal(v.beantworte(r.id, { entscheidung: 'einmal_erlauben' }).status, 409)
  const r2 = v.stelle('l1', { art: 'rechte', tool_name: 'Bash', input: { command: 'ls' }, tool_use_id: 't10' })
  v.beendeLauf('l1')
  assert.equal(v.beantworte(r2.id, { entscheidung: 'einmal_erlauben' }).status, 404)
})

test('doppelte tool_use_id bei frage_stefan ⇒ keine Antwort, eine Protokollzeile; Frage ohne id bleibt möglich', () => {
  const { v, protokoll } = aufbau()
  assert.ok(v.stelle('l1', { art: 'frage', frage: 'A?', optionen: [], tool_use_id: 'f' }).id)
  const zweite = v.stelle('l1', { art: 'frage', frage: 'A?', optionen: [], tool_use_id: 'f' })
  assert.deepEqual(zweite.entscheidung, { antwort: KEINE_ANTWORT })
  assert.equal(protokoll.length, 1)
  assert.equal(protokoll[0].art, 'frage_ohne_antwort')
  assert.ok(v.stelle('l1', { art: 'frage', frage: 'B?', optionen: [] }).id)
  assert.ok(v.stelle('l1', { art: 'frage', frage: 'B?', optionen: [] }).id)
  assert.equal(v.offene().length, 3)
})

test('Protokoll wird VOR der Auslieferung an die Warter geschrieben (Plan §3)', async () => {
  let aufgeloest = false
  let beimProtokoll = null
  const v = erzeugeRueckfrageVermittlung({ pfadOptionen: PFAD, pollFensterMs: 1000, protokolliere: () => (beimProtokoll = aufgeloest) })
  v.oeffneLauf('l1', KANAL)
  const r = v.stelle('l1', { art: 'rechte', tool_name: 'Bash', input: { command: 'ls' }, tool_use_id: 't11' })
  const wartend = v.warte('l1', r.id).then((e) => {
    aufgeloest = true
    return e
  })
  v.beantworte(r.id, { entscheidung: 'ablehnen' })
  assert.equal(beimProtokoll, false)
  assert.equal((await wartend).entscheidung.behavior, 'deny')
})

test('oeffneLauf mit ungültigem Token öffnet nichts; laufZuToken wirft nie (andere Länge)', () => {
  const v = erzeugeRueckfrageVermittlung({ pfadOptionen: PFAD })
  v.oeffneLauf('l1', { ...KANAL, token: 'kurz' })
  assert.equal(v.stelle('l1', { art: 'rechte', tool_name: 'Bash', input: { command: 'ls' } }).status, 403)
  v.oeffneLauf('l2', KANAL)
  assert.equal(v.laufZuToken('a'.repeat(64)), null)
  assert.equal(v.laufZuToken(TOKEN), 'l2')
  assert.equal(v.warteGrenzeMs, 600000)
})

test('F45 B2b-3b-1b (A2): protokolliere bekommt Arbeitsordner und die vollständige Eintragsliste des Laufs — auch beim Lauf-Ende', () => {
  const aufrufe = []
  const v = erzeugeRueckfrageVermittlung({ pfadOptionen: PFAD, protokolliere: (laufId, eintrag, kontext) => aufrufe.push({ laufId, eintrag, kontext }) })
  v.oeffneLauf('l1', KANAL)
  v.stelle('l1', { art: 'rechte', tool_name: 'Write', input: { file_path: '../x', content: 'x' }, tool_use_id: 't1' })
  const offen = v.stelle('l1', { art: 'rechte', tool_name: 'Bash', input: { command: 'ls' }, tool_use_id: 't2' })
  v.beantworte(offen.id, { entscheidung: 'ablehnen' })
  v.stelle('l1', { art: 'rechte', tool_name: 'Bash', input: { command: 'pwd' }, tool_use_id: 't3' })
  v.beendeLauf('l1')
  assert.deepEqual(aufrufe.map((a) => a.kontext.eintraege.map((e) => e.art)), [['auto_deny'], ['auto_deny', 'stefan_abgelehnt'], ['auto_deny', 'stefan_abgelehnt', 'lauf_beendet']])
  assert.ok(aufrufe.every((a) => a.laufId === 'l1' && a.kontext.arbeitsordner === ORDNER && a.kontext.eintraege.at(-1) === a.eintrag))
  // Die Liste ist eine Kopie: ein späterer Eintrag ändert eine schon übergebene Liste nicht.
  assert.equal(aufrufe[0].kontext.eintraege.length, 1)
})

test('F45 B2b-3b-1b: PROTOKOLL_ARTEN kommt aus der einzigen Quelle src/rueckfrage/protokoll.ts', async () => {
  const { PROTOKOLL_ARTEN } = await import('./rueckfrage-vermittlung.mjs')
  const { RUECKFRAGE_PROTOKOLL_ARTEN } = await import('../../src/rueckfrage/protokoll.ts')
  assert.equal(PROTOKOLL_ARTEN, RUECKFRAGE_PROTOKOLL_ARTEN)
})

test('F45 B2b-3b-1b (A2, qa): ein Wurf des Rückrufs bei Entscheidung N wird mit N+1 nachgeholt (volle Liste)', () => {
  const listen = []
  let erster = true
  const v = erzeugeRueckfrageVermittlung({
    pfadOptionen: PFAD,
    protokolliere: (_l, _e, kontext) => {
      if (erster) {
        erster = false
        throw new Error('Platte voll')
      }
      listen.push(kontext.eintraege.map((e) => e.tool_use_id))
    },
  })
  v.oeffneLauf('l1', KANAL)
  const a = v.stelle('l1', { art: 'rechte', tool_name: 'Write', input: { file_path: '../x', content: 'x' }, tool_use_id: 't1' })
  const b = v.stelle('l1', { art: 'rechte', tool_name: 'Write', input: { file_path: '../y', content: 'y' }, tool_use_id: 't2' })
  assert.equal(a.entscheidung.behavior, 'deny')
  assert.equal(b.entscheidung.behavior, 'deny')
  assert.deepEqual(listen, [['t1', 't2']])
})
