/**
 * Datei: scripts/leitstand/rueckfrage-vermittlung.test.mjs
 *
 * Zweck: Tests der Vermittlung des Rückfrage-Kanals (F45 B2b-3b-1a, features/F45/plan-b2b3b1a-v2.md §3): Token nur für
 * offene Läufe, auto_deny ohne Warteschlangeneintrag, doppelte tool_use_id, nur „einmal erlauben“/„ablehnen“, genau einmal
 * beantwortbar, Entscheidung zwischen zwei Polls bleibt erhalten (A7), Wartegrenze, Lauf-Ende, Protokoll vor Auslieferung; seit
 * F45 B2b-3b-2a eintraegeVon (Projektion) und die Obergrenzen je Lauf (20 offene, 200 Einträge, F-1128 (5), F-1126 (2)); seit
 * B2b-3b-2b-1a Zuwachs je Protokollaufruf (`ab`), beendeLauf-Zahl (R2), herkunft (E-B7) und zugang (R3); seit B2b-3b-2b-2a-2
 * entschiedene() (Ringpuffer, Maskierung, auch nach beendeLauf).
 *
 * Wird aufgerufen von: `npm run test` (node --test)
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import { sha256Hex } from '../../src/checkpoint-store/index.ts'
import { ENTSCHIEDEN_MAX, KEINE_ANTWORT, MAX_OFFENE_JE_LAUF, MAX_PROTOKOLL_JE_LAUF, ablehnungstextStefan, erzeugeRueckfrageVermittlung, herkunftDerAntwort } from './rueckfrage-vermittlung.mjs'
import { MASKE } from './geheimnisse-maskieren.mjs'

/**
 * Test-Attrappen, zur Laufzeit zusammengesetzt (Muster scripts/leitstand-abgelehnte-befehle.test.mjs): kein vollständiges,
 * scanner-erkennbares Geheimnis steht im Quelltext (Secret-Scan der CI, gitleaks Regel curl-auth-header) — maskiereGeheimnisse sieht
 * zur Laufzeit trotzdem den vollen Wert.
 */
const BEARER = ['test-abcd', 'efghijklmnop'].join('')
const AUTH_KOPF = ['Authorization', `Bearer ${BEARER}`].join(': ')
const PASSWORT = ['geheim', '123'].join('')

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

test('F45 B2b-3b-1b (A2), seit B2b-3b-2b-1a: protokolliere bekommt Arbeitsordner und nur den Zuwachs ab Index ab — auch beim Lauf-Ende', () => {
  const aufrufe = []
  const v = erzeugeRueckfrageVermittlung({ pfadOptionen: PFAD, protokolliere: (laufId, eintrag, kontext) => aufrufe.push({ laufId, eintrag, kontext }) })
  v.oeffneLauf('l1', KANAL)
  v.stelle('l1', { art: 'rechte', tool_name: 'Write', input: { file_path: '../x', content: 'x' }, tool_use_id: 't1' })
  const offen = v.stelle('l1', { art: 'rechte', tool_name: 'Bash', input: { command: 'ls' }, tool_use_id: 't2' })
  v.beantworte(offen.id, { entscheidung: 'ablehnen' })
  v.stelle('l1', { art: 'rechte', tool_name: 'Bash', input: { command: 'pwd' }, tool_use_id: 't3' })
  v.beendeLauf('l1')
  assert.deepEqual(aufrufe.map((a) => a.kontext.eintraege.map((e) => e.art)), [['auto_deny'], ['stefan_abgelehnt'], ['lauf_beendet']])
  assert.deepEqual(aufrufe.map((a) => a.kontext.ab), [0, 1, 2])
  assert.ok(aufrufe.every((a) => a.laufId === 'l1' && a.kontext.arbeitsordner === ORDNER && a.kontext.eintraege.at(-1) === a.eintrag))
  // Die Liste ist eine Kopie: ein späterer Eintrag ändert eine schon übergebene Liste nicht.
  assert.equal(aufrufe[0].kontext.eintraege.length, 1)
})

test('F45 B2b-3b-1b: PROTOKOLL_ARTEN kommt aus der einzigen Quelle src/rueckfrage/protokoll.ts', async () => {
  const { PROTOKOLL_ARTEN } = await import('./rueckfrage-vermittlung.mjs')
  const { RUECKFRAGE_PROTOKOLL_ARTEN } = await import('../../src/rueckfrage/protokoll.ts')
  assert.equal(PROTOKOLL_ARTEN, RUECKFRAGE_PROTOKOLL_ARTEN)
})

test('F45 B2b-3b-1b (A2, qa): ein Wurf des Rückrufs bei Entscheidung N wird mit N+1 nachgeholt (Zuwachs ab dem letzten Erfolg)', () => {
  const listen = []
  const abs = []
  let erster = true
  const v = erzeugeRueckfrageVermittlung({
    pfadOptionen: PFAD,
    protokolliere: (_l, _e, kontext) => {
      if (erster) {
        erster = false
        throw new Error('Platte voll')
      }
      listen.push(kontext.eintraege.map((e) => e.tool_use_id))
      abs.push(kontext.ab)
    },
  })
  v.oeffneLauf('l1', KANAL)
  const a = v.stelle('l1', { art: 'rechte', tool_name: 'Write', input: { file_path: '../x', content: 'x' }, tool_use_id: 't1' })
  const b = v.stelle('l1', { art: 'rechte', tool_name: 'Write', input: { file_path: '../y', content: 'y' }, tool_use_id: 't2' })
  v.stelle('l1', { art: 'rechte', tool_name: 'Write', input: { file_path: '../z', content: 'z' }, tool_use_id: 't3' })
  assert.equal(a.entscheidung.behavior, 'deny')
  assert.equal(b.entscheidung.behavior, 'deny')
  assert.deepEqual(listen, [['t1', 't2'], ['t3']])
  assert.deepEqual(abs, [0, 2])
})

// ─── F45 B2b-3b-2b-1a ──────────────────────────────────────────────────────────────────────────────────────────────────

test('F45 B2b-3b-2b-1a (R2): beendeLauf liefert die Zahl der Ablehnungen durch Stefan; 0 ohne offenen Lauf', () => {
  const v = erzeugeRueckfrageVermittlung({ pfadOptionen: PFAD })
  assert.equal(v.beendeLauf('nie-offen'), 0)
  v.oeffneLauf('l1', KANAL)
  const a = v.stelle('l1', { art: 'rechte', tool_name: 'Bash', input: { command: 'ls' }, tool_use_id: 'r1' })
  const b = v.stelle('l1', { art: 'rechte', tool_name: 'Bash', input: { command: 'pwd' }, tool_use_id: 'r2' })
  v.stelle('l1', { art: 'rechte', tool_name: 'Bash', input: { command: 'whoami' }, tool_use_id: 'r3' })
  v.beantworte(a.id, { entscheidung: 'ablehnen' })
  v.beantworte(b.id, { entscheidung: 'einmal_erlauben' })
  assert.equal(v.beendeLauf('l1'), 1, 'r3 endet als lauf_beendet und zählt nicht')
  assert.equal(v.beendeLauf('l1'), 0, 'idempotent')
})

test('F45 B2b-3b-2b-1a (R2, qa 4): auto_deny, zeitueberschreitung, frage_beantwortet, frage_ohne_antwort zählen nicht', async () => {
  const v = erzeugeRueckfrageVermittlung({ pfadOptionen: PFAD, warteGrenzeMs: 20 })
  v.oeffneLauf('l1', KANAL)
  v.stelle('l1', { art: 'rechte', tool_name: 'Write', input: { file_path: '../x', content: 'x' }, tool_use_id: 'n1' })
  v.stelle('l1', { art: 'rechte', tool_name: 'Bash', input: { command: 'ls' }, tool_use_id: 'n2' })
  const frage = v.stelle('l1', { art: 'frage', frage: 'Port?' })
  v.beantworte(frage.id, { antwort: '4711' })
  v.stelle('l1', { art: 'frage', frage: 'Pfad?' })
  await new Promise((r) => setTimeout(r, 60))
  assert.deepEqual(new Set(v.eintraegeVon('l1').map((e) => e.art)), new Set(['auto_deny', 'zeitueberschreitung', 'frage_beantwortet', 'frage_ohne_antwort']))
  assert.equal(v.beendeLauf('l1'), 0)
})

test('F45 B2b-3b-2b-1a (E-B7): Antworten tragen herkunft im Protokoll; unbekannter Wert ⇒ nicht_browser; nicht im Speicherstand', () => {
  const eintraege = []
  const v = erzeugeRueckfrageVermittlung({ pfadOptionen: PFAD, protokolliere: (_l, e) => eintraege.push(e) })
  v.oeffneLauf('l1', KANAL)
  const a = v.stelle('l1', { art: 'rechte', tool_name: 'Bash', input: { command: 'ls' }, tool_use_id: 'h1' })
  const b = v.stelle('l1', { art: 'rechte', tool_name: 'Bash', input: { command: 'pwd' }, tool_use_id: 'h2' })
  const c = v.stelle('l1', { art: 'frage', frage: 'Port?' })
  v.stelle('l1', { art: 'rechte', tool_name: 'Write', input: { file_path: '../x', content: 'x' }, tool_use_id: 'h3' })
  v.beantworte(a.id, { entscheidung: 'ablehnen' }, 'browser')
  v.beantworte(b.id, { entscheidung: 'einmal_erlauben' }, 'curl')
  v.beantworte(c.id, { antwort: '4711' })
  assert.deepEqual(
    eintraege.map((e) => `${e.art}:${e.herkunft ?? '–'}`),
    ['auto_deny:–', 'stefan_abgelehnt:browser', 'stefan_erlaubt:nicht_browser', 'frage_beantwortet:nicht_browser']
  )
  assert.ok(v.eintraegeVon('l1').every((e) => !('herkunft' in e)))
  v.beendeLauf('l1')
})

test('F45 B2b-3b-2b-1a (E-B7): herkunftDerAntwort — same-origin bzw. passender Origin ⇒ browser, sonst nicht_browser; wirft nie', () => {
  assert.equal(herkunftDerAntwort({ 'sec-fetch-site': 'same-origin' }), 'browser')
  assert.equal(herkunftDerAntwort({ origin: 'http://127.0.0.1:4000', host: '127.0.0.1:4000' }), 'browser')
  assert.equal(herkunftDerAntwort({ origin: 'http://127.0.0.1:4001', host: '127.0.0.1:4000' }), 'nicht_browser')
  assert.equal(herkunftDerAntwort({ origin: 'nicht://[', host: '127.0.0.1:4000' }), 'nicht_browser')
  assert.equal(herkunftDerAntwort({ 'sec-fetch-site': 'none' }), 'nicht_browser')
  assert.equal(herkunftDerAntwort({}), 'nicht_browser')
  assert.equal(herkunftDerAntwort(undefined), 'nicht_browser')
})

test('F45 B2b-3b-2b-1a (R3, Advisor B6/D9): zugang vor oeffneLauf gebaut, danach wirksam; unbekannter Lauf ⇒ null; Meldung mit laufId, Wurf geschluckt', () => {
  const v = erzeugeRueckfrageVermittlung({ pfadOptionen: PFAD })
  const gemeldet = []
  const zugang = v.zugang('l1', (text) => gemeldet.push(text))
  assert.equal(zugang.speicher(), null)
  v.oeffneLauf('l1', KANAL)
  v.stelle('l1', { art: 'rechte', tool_name: 'Write', input: { file_path: '../x', content: 'x' }, tool_use_id: 'z1' })
  assert.deepEqual(zugang.speicher().map((e) => e.art), ['auto_deny'])
  assert.equal(zugang.abweichung(), null, 'B2b-3b-2b-2a-1: vor einer Meldung keine Abweichung')
  zugang.meldeAbweichung('Länge abweichend (Speicher 1, Datei 2)')
  assert.equal(zugang.abweichung(), 'Länge abweichend (Speicher 1, Datei 2)', 'B2b-3b-2b-2a-1: der Zugang merkt die gemeldete Abweichung (R3, daten der Terminalmarke)')
  assert.equal(gemeldet.length, 1)
  assert.match(gemeldet[0], /Lauf 'l1' nicht bestätigt — Ablehnungen durch Stefan zählen nicht: Länge abweichend/)
  const fremd = v.zugang('unbekannt', () => {
    throw new Error('kaputt')
  })
  assert.equal(fremd.speicher(), null)
  assert.doesNotThrow(() => fremd.meldeAbweichung('x'))
  v.beendeLauf('l1')
  assert.equal(zugang.speicher(), null, 'nach dem Lauf-Ende kein Speicherstand mehr')
})

test('F45 B2b-3b-2b-2a-1 (F-1128 (3), D13): zugang.zaehlung zählt Antworten je Art und nicht_browser aus dem Speicher; ohne offenen Lauf null', () => {
  const { v } = aufbau()
  const zugang = v.zugang('l1', () => {})
  assert.deepEqual(zugang.zaehlung(), { stefan_erlaubt: 0, stefan_abgelehnt: 0, frage_beantwortet: 0, nicht_browser: 0 })
  const id = (tool_use_id, input) => v.stelle('l1', { art: 'rechte', tool_name: 'Bash', input, tool_use_id }).id
  const frage = v.stelle('l1', { art: 'frage', frage: 'A oder B?', optionen: ['A', 'B'], tool_use_id: 'f1' }).id
  v.beantworte(id('b1', { command: 'npm publish' }), { entscheidung: 'einmal_erlauben' }, 'browser')
  v.beantworte(id('b2', { command: 'git push' }), { entscheidung: 'ablehnen' }, 'nicht_browser')
  v.beantworte(id('b3', { command: 'rm -rf x' }), { entscheidung: 'ablehnen' }, 'browser')
  v.beantworte(frage, { antwort: 'A' }, 'nicht_browser')
  v.stelle('l1', { art: 'rechte', tool_name: 'Write', input: { file_path: '../x', content: 'x' }, tool_use_id: 'w1' })
  assert.deepEqual(zugang.zaehlung(), { stefan_erlaubt: 1, stefan_abgelehnt: 2, frage_beantwortet: 1, nicht_browser: 2 }, 'auto_deny zählt nicht')
  assert.equal(v.zugang('unbekannt', () => {}).zaehlung(), null)
  v.beendeLauf('l1')
  assert.equal(zugang.zaehlung(), null, 'nach dem Lauf-Ende null')
})

// ─── F45 B2b-3b-2b-1b (F-1128 R1): eindeutiger Ablehnungstext je Ablehnung durch Stefan ───────────────────────────────

test('F45 B2b-3b-2b-1b (R1): jede Ablehnung durch Stefan hat einen eigenen ASCII-Text mit Ref; Protokoll und Speicher tragen nur dessen Hash', async () => {
  const { v, protokoll } = aufbau()
  const texte = []
  for (const id of ['r1', 'r2']) {
    const r = v.stelle('l1', { art: 'rechte', tool_name: 'Bash', input: { command: `npm run ${id}` }, tool_use_id: id })
    assert.deepEqual(v.beantworte(r.id, { entscheidung: 'ablehnen' }), { ok: true })
    const entscheidung = (await v.warte('l1', r.id)).entscheidung
    assert.equal(entscheidung.behavior, 'deny')
    texte.push(entscheidung.message)
  }
  for (const text of texte) assert.match(text, /^Stefan hat den Befehl abgelehnt\. \(Ref [0-9a-f-]{36}\)$/)
  assert.notEqual(texte[0], texte[1])
  assert.deepEqual(protokoll.map((e) => e.ablehnung_hash), texte.map((t) => sha256Hex(t)))
  assert.deepEqual(v.eintraegeVon('l1').map((e) => e.ablehnung_hash), texte.map((t) => sha256Hex(t)))
  assert.ok(!JSON.stringify(protokoll).includes('(Ref '), 'der Text selbst steht nicht im Protokoll')
  // Erlaubt, auto_deny und Lauf-Ende tragen keinen Hash.
  const e = v.stelle('l1', { art: 'rechte', tool_name: 'Bash', input: { command: 'npm run e' }, tool_use_id: 'e1' })
  v.beantworte(e.id, { entscheidung: 'einmal_erlauben' })
  const f = v.stelle('l1', { art: 'frage', frage: 'Welcher Port?', tool_use_id: 'f1' })
  v.beantworte(f.id, { antwort: '4711' })
  v.stelle('l1', { art: 'rechte', tool_name: 'Bash', input: { command: 'npm run o' }, tool_use_id: 'o1' })
  v.beendeLauf('l1')
  assert.deepEqual(protokoll.filter((x) => x.art !== 'stefan_abgelehnt').map((x) => [x.art, 'ablehnung_hash' in x]), [['stefan_erlaubt', false], ['frage_beantwortet', false], ['lauf_beendet', false]])
  assert.match(ablehnungstextStefan(), /^[\x20-\x7e]+$/, 'ASCII')
})

// ─── F45 B2b-3b-2a ─────────────────────────────────────────────────────────────────────────────────────────────────────

const bash = (id, command = `echo ${id}`) => ({ art: 'rechte', tool_name: 'Bash', input: { command }, tool_use_id: id })

test('F45 B2b-3b-2a (F-1128 (1), B10): eintraegeVon liefert nur die Vergleichsfelder als neue Objekte (ablehnung_hash nur an stefan_abgelehnt); null ohne offenen Lauf', () => {
  const { v } = aufbau()
  assert.deepEqual(v.eintraegeVon('l1'), [])
  v.stelle('l1', { art: 'rechte', tool_name: 'Write', input: { file_path: '../x', content: 'x' }, tool_use_id: 't1' })
  const r = v.stelle('l1', bash('t2', 'npm publish --geheim'))
  v.beantworte(r.id, { entscheidung: 'ablehnen' })
  const erste = v.eintraegeVon('l1')
  assert.deepEqual(
    erste.map((e) => Object.keys(e).sort().join(',')),
    ['art,input_hash,tool_name,tool_use_id', 'ablehnung_hash,art,input_hash,tool_name,tool_use_id']
  )
  assert.deepEqual(erste.map((e) => [e.tool_use_id, e.tool_name, e.art]), [['t1', 'Write', 'auto_deny'], ['t2', 'Bash', 'stefan_abgelehnt']])
  assert.ok(!JSON.stringify(erste).includes('geheim'), 'kein Rohtext im Speicherstand')
  erste[0].art = 'stefan_abgelehnt'
  assert.equal(v.eintraegeVon('l1')[0].art, 'auto_deny', 'keine geteilten Referenzen')
  assert.equal(v.eintraegeVon('unbekannt'), null)
  v.beendeLauf('l1')
  assert.equal(v.eintraegeVon('l1'), null)
})

test('F45 B2b-3b-2a (Delta H7): tool_name über 200 Zeichen steht im Speicherstand wie in der Datei als <zu lang>', () => {
  const lang = 'W'.repeat(201)
  const v = erzeugeRueckfrageVermittlung({ pfadOptionen: PFAD })
  v.oeffneLauf('l1', { ...KANAL, werkzeugNamen: [...KANAL.werkzeugNamen, lang] })
  v.stelle('l1', { art: 'rechte', tool_name: lang, input: {}, tool_use_id: 't1' })
  assert.equal(v.eintraegeVon('l1')[0].tool_name, '<zu lang>')
})

test('F45 B2b-3b-2a (F-1126 (2)): die 21. gleichzeitig offene Rückfrage ⇒ auto_deny mit eigenem Grund und Eintrag; nach einer Antwort wieder Platz', () => {
  const { v, protokoll } = aufbau()
  const ids = []
  for (let i = 0; i < MAX_OFFENE_JE_LAUF; i++) ids.push(v.stelle('l1', bash(`o${i}`)).id)
  assert.equal(MAX_OFFENE_JE_LAUF, 20)
  assert.equal(v.offene().length, 20)
  const zuviel = v.stelle('l1', bash('o20'))
  assert.equal(zuviel.entscheidung.behavior, 'deny')
  assert.match(zuviel.entscheidung.message, /zu viele offene Rückfragen je Lauf \(20\)/)
  assert.deepEqual([protokoll.at(-1).art, protokoll.at(-1).tool_use_id], ['auto_deny', 'o20'])
  const frage = v.stelle('l1', { art: 'frage', frage: 'Weiter?', tool_use_id: 'f1' })
  assert.deepEqual(frage.entscheidung, { antwort: KEINE_ANTWORT })
  assert.equal(protokoll.at(-1).art, 'frage_ohne_antwort')
  v.beantworte(ids[0], { entscheidung: 'ablehnen' })
  assert.ok(v.stelle('l1', bash('o21')).id, 'nach einer Antwort ist wieder Platz')
  v.beendeLauf('l1')
})

test('F45 B2b-3b-2a (Advisor B2): „offen“ zählt nur Unentschiedene — 25 nacheinander beantwortete Rückfragen erreichen alle Stefan', () => {
  const { v } = aufbau()
  for (let i = 0; i < 25; i++) {
    const r = v.stelle('l1', bash(`n${i}`))
    assert.ok(r.id, `Rückfrage ${i} erreicht Stefan`)
    assert.deepEqual(v.beantworte(r.id, { entscheidung: 'ablehnen' }), { ok: true })
  }
  assert.equal(v.eintraegeVon('l1').length, 25)
})

test('F45 B2b-3b-2a (F-1128 (5)): höchstens 200 Protokolleinträge je Lauf (auch auto_deny); darüber Ablehnung ohne Eintrag; offene behalten ihren Platz', () => {
  let aufrufe = 0
  const v = erzeugeRueckfrageVermittlung({ pfadOptionen: PFAD, protokolliere: () => aufrufe++ })
  v.oeffneLauf('l1', KANAL)
  assert.equal(MAX_PROTOKOLL_JE_LAUF, 200)
  const offen = []
  for (let i = 0; i < 5; i++) offen.push(v.stelle('l1', bash(`b${i}`)).id)
  for (let i = 0; i < MAX_PROTOKOLL_JE_LAUF - 5; i++) {
    const r = v.stelle('l1', { art: 'rechte', tool_name: 'Write', input: { file_path: `../${i}`, content: 'x' }, tool_use_id: `w${i}` })
    assert.equal(r.entscheidung.behavior, 'deny')
  }
  assert.equal(aufrufe, 195)
  const rechte = v.stelle('l1', { art: 'rechte', tool_name: 'Write', input: { file_path: '../z', content: 'x' }, tool_use_id: 'w-zuviel' })
  assert.match(rechte.entscheidung.message, /Obergrenze der Protokolleinträge je Lauf erreicht \(200\)/)
  assert.equal(v.stelle('l1', bash('b-zuviel')).entscheidung.behavior, 'deny')
  assert.deepEqual(v.stelle('l1', { art: 'frage', frage: 'x?', tool_use_id: 'f-zuviel' }).entscheidung, { antwort: KEINE_ANTWORT })
  assert.equal(aufrufe, 195, 'über der Grenze kein Protokolleintrag')
  v.beantworte(offen[0], { entscheidung: 'ablehnen' })
  v.beendeLauf('l1')
  assert.equal(aufrufe, 200, 'die fünf offenen werden trotzdem protokolliert entschieden')
})

test('F45 B2b-3b-2a (qa B8): an der 200er-Grenze — doppelte ID bei 199 mit Eintrag, bei 200 ohne; tool_use_id null; Wartegrenze hält die Summe', async () => {
  let eintraege = 0
  const v = erzeugeRueckfrageVermittlung({ pfadOptionen: PFAD, warteGrenzeMs: 20, protokolliere: () => eintraege++ })
  v.oeffneLauf('l1', KANAL)
  const offen = v.stelle('l1', bash('b0'))
  for (let i = 0; i < 198; i++) v.stelle('l1', { art: 'rechte', tool_name: 'Write', input: { file_path: `../${i}`, content: 'x' }, tool_use_id: `w${i}` })
  assert.equal(eintraege + v.offene().length, 199)
  const doppelt = v.stelle('l1', { art: 'rechte', tool_name: 'Write', input: { file_path: '../0', content: 'x' }, tool_use_id: 'w0' })
  assert.match(doppelt.entscheidung.message, /Rückfrage-ID doppelt/)
  assert.equal(eintraege + v.offene().length, 200)
  const ohneId = v.stelle('l1', { art: 'rechte', tool_name: 'Bash', input: { command: 'echo x' }, tool_use_id: null })
  assert.match(ohneId.entscheidung.message, /Obergrenze/)
  // Nach der 200er-Grenze ist eine ID nicht gemerkt — eine Wiederholung trifft wieder die Grenze (nicht „doppelt“).
  assert.match(v.stelle('l1', bash('b-neu')).entscheidung.message, /Obergrenze/)
  assert.match(v.stelle('l1', bash('b-neu')).entscheidung.message, /Obergrenze/)
  assert.equal(eintraege, 199)
  assert.equal((await v.warte('l1', offen.id)).entscheidung.behavior, 'deny', 'Wartegrenze entscheidet die offene')
  assert.equal(eintraege, 200, 'die offene bekommt ihren reservierten Platz')
  v.beendeLauf('l1')
  assert.equal(eintraege, 200)
})

test('F45 B2b-3b-2a (qa B8): nach der 20er-Grenze ist die ID gemerkt — die Wiederholung ist „doppelt“', () => {
  const { v } = aufbau()
  for (let i = 0; i < MAX_OFFENE_JE_LAUF; i++) v.stelle('l1', bash(`o${i}`))
  assert.match(v.stelle('l1', bash('x')).entscheidung.message, /zu viele offene/)
  assert.match(v.stelle('l1', bash('x')).entscheidung.message, /doppelt/)
  v.beendeLauf('l1')
})

test('F45 B2b-3b-2b-2a-2 (Advisor M3/M11): entschiedene — neueste zuerst, Herkunft, Antwort und Befehl maskiert, auch nach beendeLauf; offene nicht', async () => {
  const { v } = aufbau()
  assert.deepEqual(v.entschiedene(), [])
  const a = v.stelle('l1', { art: 'rechte', tool_name: 'Bash', input: { command: `curl -H "${AUTH_KOPF}" x` }, tool_use_id: 'a' })
  const b = v.stelle('l1', { art: 'frage', frage: 'Welche Datenbank?', optionen: ['A', 'B'], tool_use_id: 'b' })
  const c = v.stelle('l1', { art: 'rechte', tool_name: 'Bash', input: { command: 'ls' }, tool_use_id: 'c' })
  assert.deepEqual(v.entschiedene(), [], 'offene Rückfragen stehen nicht in entschieden')
  assert.deepEqual(v.beantworte(a.id, { entscheidung: 'einmal_erlauben' }, 'browser'), { ok: true })
  assert.deepEqual(v.beantworte(b.id, { antwort: `password=${PASSWORT}` }), { ok: true })
  const liste = v.entschiedene()
  assert.deepEqual(liste.map((e) => [e.id, e.ergebnis, e.herkunft]), [[b.id, 'frage_beantwortet', 'nicht_browser'], [a.id, 'stefan_erlaubt', 'browser']])
  assert.ok(!liste[1].befehl.includes(BEARER) && liste[1].befehl.includes(MASKE), 'Befehl in der Historie maskiert')
  assert.ok(!liste[0].antwort.includes(PASSWORT) && liste[0].antwort.includes(MASKE), 'freie Antwort in der Historie maskiert')
  assert.equal(liste[0].frage, 'Welche Datenbank?')
  assert.match(liste[0].entschieden_am, /^\d{4}-\d{2}-\d{2}T/)
  liste[0].ergebnis = 'verändert'
  assert.equal(v.entschiedene()[0].ergebnis, 'frage_beantwortet', 'Kopien, keine geteilten Objekte')
  v.beendeLauf('l1')
  const danach = v.entschiedene()
  assert.equal(danach.length, 3, 'nach dem Lauf-Ende bleibt die Historie; die offene wird lauf_beendet')
  assert.deepEqual([danach[0].id, danach[0].ergebnis, danach[0].herkunft], [c.id, 'lauf_beendet', undefined])
})

test('F45 B2b-3b-2b-2a-2: entschiedene hält höchstens ENTSCHIEDEN_MAX; auto_deny ohne Warteschlangeneintrag erscheint nicht', () => {
  const { v } = aufbau()
  v.stelle('l1', { art: 'rechte', tool_name: 'Write', input: { file_path: '../x', content: 'x' }, tool_use_id: 'w' })
  const ids = []
  for (let i = 0; i < ENTSCHIEDEN_MAX + 5; i++) {
    const r = v.stelle('l1', { art: 'rechte', tool_name: 'Bash', input: { command: `echo ${i}` }, tool_use_id: `t${i}` })
    v.beantworte(r.id, { entscheidung: 'ablehnen' }, 'browser')
    ids.push(r.id)
  }
  const liste = v.entschiedene()
  assert.equal(liste.length, ENTSCHIEDEN_MAX)
  assert.equal(liste[0].id, ids.at(-1))
  assert.ok(liste.every((e) => e.ergebnis === 'stefan_abgelehnt'))
})
