/**
 * Datei: public/leitstand/chat-anzeige.test.mjs
 *
 * Zweck: node:test für die reinen Regeln des Chat-Docks und der großen Ansicht (F44 WS-8a):
 * Rückkehr-Route merken, Ziel von „Gespräch verkleinern“, „Nächster Schritt“ der Kontextspalte.
 * Dazu die Tastaturregel der Register (naechsterRegisterIndex, faehigkeiten-anzeige.js), die das
 * Register Jarvis | Product Coach mitbenutzt, und der Vorfilter (jarvis-vorfilter.js): in Node ohne
 * DOM importierbar, Antwortsätze über i18n (in Node immer de).
 *
 * Wird aufgerufen von: `npm test` (node --test)
 *
 * Wichtig: Der Vorfilter-Test nutzt nur 'Status' — 'Was braucht mich?' löst einen Workitem-Abruf aus
 * (api.js), den es in Node nicht gibt.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { STANDARD_RUECKKEHR, istGrossansicht, leiteNaechstenSchrittAb, merkeRoute, zielBeimVerkleinern } from './chat-anzeige.js'
import { naechsterRegisterIndex } from './faehigkeiten-anzeige.js'
import { erkenneVorfilterMuster, loeseVorfilterAuf } from './jarvis-vorfilter.js'

const zustand = (workflows, laeufe) => ({ workflows, laeufe, startfehler: [], fehler: [] })
const freigabe = { workflowId: 'wf-1', ziel: 'Login bauen', naechster: { art: 'haltFreigabe' } }
const rueckfrage = { workflowId: 'wf-2', ziel: '', naechster: { art: 'haltKlaerung' } }
const lauf = { laufId: 'lauf-9', ergebnis: 'FEHLGESCHLAGEN', kenntnisgenommen: false, auftragsbezug: { titel: 'Tests reparieren' } }

test('merkeRoute: echte Seiten werden gemerkt, #/chat und #/start nicht', () => {
  assert.equal(merkeRoute(null, '#/workboard'), '#/workboard')
  assert.equal(merkeRoute('#/workboard', '#/workflows/router-a1'), '#/workflows/router-a1')
  assert.equal(merkeRoute('#/workboard', '#/chat'), '#/workboard')
  assert.equal(merkeRoute('#/workboard', '#/start'), '#/workboard')
  assert.equal(merkeRoute(null, '#/chat'), null)
})

test('istGrossansicht: nur genau #/chat', () => {
  assert.equal(istGrossansicht('#/chat'), true)
  assert.equal(istGrossansicht('#/chat/x'), false)
  assert.equal(istGrossansicht('#/workboard'), false)
  assert.equal(istGrossansicht(''), false)
})

test('merkeRoute: leerer oder fremder Hash ändert nichts', () => {
  assert.equal(merkeRoute('#/roadmap', ''), '#/roadmap')
  assert.equal(merkeRoute('#/roadmap', '#anker'), '#/roadmap')
  assert.equal(merkeRoute('#/roadmap', undefined), '#/roadmap')
})

test('zielBeimVerkleinern: gemerkte Route, sonst die Produktübersicht', () => {
  assert.equal(zielBeimVerkleinern('#/workboard'), '#/workboard')
  assert.equal(zielBeimVerkleinern(null), STANDARD_RUECKKEHR)
  assert.equal(zielBeimVerkleinern(''), STANDARD_RUECKKEHR)
  assert.equal(STANDARD_RUECKKEHR, '#/dashboard')
})

test('leiteNaechstenSchrittAb: vor dem ersten Poll-Tick lädt es', () => {
  assert.deepEqual(leiteNaechstenSchrittAb(null), { art: 'laedt' })
})

test('leiteNaechstenSchrittAb: Freigabe vor Rückfrage vor Lauf', () => {
  assert.deepEqual(leiteNaechstenSchrittAb(zustand([rueckfrage, freigabe], [lauf])), { art: 'eintrag', eintragArt: 'freigabe', titel: 'Login bauen', hash: '#/workflows/wf-1' })
  assert.deepEqual(leiteNaechstenSchrittAb(zustand([rueckfrage], [lauf])), { art: 'eintrag', eintragArt: 'rueckfrage', titel: 'wf-2', hash: '#/workflows/wf-2' })
  assert.deepEqual(leiteNaechstenSchrittAb(zustand([], [lauf])), { art: 'eintrag', eintragArt: 'lauf', titel: 'Tests reparieren', hash: '#/runs/lauf-9' })
})

test('leiteNaechstenSchrittAb: nichts wartet → leer; kenntnisgenommene Läufe zählen nicht', () => {
  assert.deepEqual(leiteNaechstenSchrittAb(zustand([], [{ ...lauf, kenntnisgenommen: true }])), { art: 'leer' })
})

test('leiteNaechstenSchrittAb: defekte Quelle ohne Treffer → defekt; mit Treffer aus der anderen Quelle → Eintrag', () => {
  assert.deepEqual(leiteNaechstenSchrittAb(zustand(null, [])), { art: 'defekt' })
  assert.equal(leiteNaechstenSchrittAb(zustand(null, [lauf])).art, 'eintrag')
})

test('Register-Tastatur (wie WS-7): Pfeile laufen um, Pos1/Ende, andere Tasten unberührt', () => {
  assert.equal(naechsterRegisterIndex(0, 2, 'ArrowRight'), 1)
  assert.equal(naechsterRegisterIndex(1, 2, 'ArrowRight'), 0)
  assert.equal(naechsterRegisterIndex(0, 2, 'ArrowLeft'), 1)
  assert.equal(naechsterRegisterIndex(1, 2, 'Home'), 0)
  assert.equal(naechsterRegisterIndex(0, 2, 'End'), 1)
  assert.equal(naechsterRegisterIndex(0, 2, 'Enter'), null)
})

test('Vorfilter: in Node importierbar, Muster unverändert, Statussatz über i18n (de)', async () => {
  assert.equal(erkenneVorfilterMuster('Was braucht mich?'), 'braucht_mich')
  assert.equal(erkenneVorfilterMuster('Status'), 'status')
  assert.equal(erkenneVorfilterMuster('Wo steht mein Projekt?'), null)
  const ohneZustand = await loeseVorfilterAuf('Status', null)
  assert.equal(ohneZustand.antwort, 'Der Zustand ist noch nicht geladen — bitte gleich noch einmal fragen.')
  const mitZustand = await loeseVorfilterAuf('Status?', { laeufe: [lauf], startfehler: [], workflows: null })
  assert.equal(mitZustand.antwort, 'Läufe: 1 · Startfehler: 0 · Workflows: nicht verfügbar · Braucht Aufmerksamkeit (Workflows/Läufe): nicht verfügbar')
  assert.equal(mitZustand.quelle, 'vorfilter')
})
