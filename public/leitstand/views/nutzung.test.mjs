/**
 * Datei: public/leitstand/views/nutzung.test.mjs
 *
 * Zweck: node:test für die Bedienung der Seite `#/nutzung` (views/nutzung.js, F44 WS-6b, Korrekturrunde):
 * ein Körper ohne gruppen ist derselbe Fehlerzustand wie ein Fachergebnis „fehler“ und lässt den Klick auf
 * den aktiven Zeitraum neu laden; „Erneut versuchen“ lädt den aktiven Zeitraum; der Überholschutz verwirft
 * eine späte Antwort; ohne Nutzungsdaten stehen „—“ statt 0; nach einer Bedienung liegt der Fokus auf dem
 * gewählten Zeitraum bzw. auf der Fehlernotiz.
 *
 * Die echte View läuft gegen ein minimales Schein-DOM (Container mit innerHTML und Klick-Handler) und
 * ein aufzeichnendes fetch — kein Browser, kein Server.
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 *
 * Wichtig: Die Globals stehen VOR dem Import der Module (projekt-kontext.js liest sessionStorage beim
 * Laden) — deshalb dynamische Importe.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'

/** Schein-Element; focus() merkt sich das fokussierte Element. */
function scheinElement(id = '') {
  return {
    id,
    hidden: false,
    innerHTML: '',
    dataset: {},
    handler: {},
    addEventListener(typ, fn) {
      this.handler[typ] = fn
    },
    setAttribute() {},
    getAttribute: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    focus() {
      globalThis.document.activeElement = this
    },
  }
}

const elemente = new Map()
const speicher = () => {
  const werte = new Map()
  return { getItem: (s) => werte.get(s) ?? null, setItem: (s, w) => werte.set(s, String(w)), removeItem: (s) => werte.delete(s) }
}

/** Fokussierbare Knöpfe je Selektor (der Container liefert sie über querySelector). */
const knoepfe = new Map()

globalThis.document = {
  getElementById(id) {
    if (!elemente.has(id)) elemente.set(id, scheinElement(id))
    return elemente.get(id)
  },
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener() {},
  documentElement: scheinElement('html'),
  activeElement: null,
}
Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true, writable: true })
globalThis.addEventListener = () => {}
Object.defineProperty(globalThis, 'location', { value: { hash: '#/nutzung' }, configurable: true, writable: true })
Object.defineProperty(globalThis, 'history', { value: { state: null, replaceState() {}, back() {} }, configurable: true, writable: true })
Object.defineProperty(globalThis, 'sessionStorage', { value: speicher(), configurable: true, writable: true })
Object.defineProperty(globalThis, 'localStorage', { value: speicher(), configurable: true, writable: true })
/** Klickziele sind Instanzen dieser Klasse (views/nutzung.js prüft instanceof Element). */
class ScheinZiel {
  constructor(treffer) {
    this.treffer = treffer
  }
  closest(selektor) {
    return this.treffer[selektor] ?? null
  }
}
globalThis.Element = ScheinZiel

/** Aufgezeichnete Verbrauchs-URLs. */
const aufrufe = []
/** Nächste Antworten (FIFO) als { status, json } oder { halt: Promise }. */
const naechste = []

globalThis.fetch = (url) => {
  const u = String(url)
  if (!u.includes('/verbrauch')) return Promise.resolve(new Response(JSON.stringify({ laeufe: [], startfehler: [], workflows: [], fehler: [] }), { status: 200 }))
  aufrufe.push(u)
  const eintrag = naechste.shift() ?? { status: 200, json: { status: 'ok', gruppen: [], laeufeGesamt: 0, ohneBeobachtungGesamt: 0 } }
  const antwort = () => new Response(JSON.stringify(eintrag.json), { status: eintrag.status ?? 200 })
  return eintrag.halt ? eintrag.halt.then(antwort) : Promise.resolve(antwort())
}

const { initNutzungView } = await import('./nutzung.js')
const { dispatch } = await import('../router.js')

const container = document.getElementById('view-nutzung')
container.querySelector = (selektor) => {
  if (selektor.startsWith('[data-verbrauch-zeitraum')) {
    if (!knoepfe.has(selektor)) knoepfe.set(selektor, scheinElement(selektor))
    return knoepfe.get(selektor)
  }
  return null
}
initNutzungView()

/** Wartet, bis alle Mikrotasks und eine Runde Makrotasks gelaufen sind. */
const warte = () => new Promise((fertig) => setTimeout(fertig, 0))

/** Klick auf einen Zeitraumknopf. */
const klickeZeitraum = (periode) => container.handler.click({ target: new ScheinZiel({ '[data-verbrauch-zeitraum]': { dataset: { verbrauchZeitraum: periode } } }) })
/** Klick auf „Erneut versuchen“. */
const klickeErneut = () => container.handler.click({ target: new ScheinZiel({ '[data-aktion="erneut"]': {} }) })

const gruppe = (ohne, verbrauch) => ({ rolle: 'qa', worker: 'claude-code', modell: 'm', auftragId: 'a', anzahlLaeufe: 2, ohneBeobachtung: ohne, verbrauch })

test('Körper ohne gruppen ist ein Fehlerzustand; Klick auf den aktiven Zeitraum lädt dann neu, sonst nicht', async () => {
  naechste.push({ status: 200, json: { status: 'ok', laeufeGesamt: 3 } })
  dispatch()
  await warte()
  assert.match(container.innerHTML, /id="nutzung-fehler"/)
  const vorher = aufrufe.length
  klickeZeitraum('30t')
  await warte()
  assert.equal(aufrufe.length, vorher + 1, 'nach einem Fehler muss der aktive Zeitraum neu laden')
  assert.doesNotMatch(container.innerHTML, /id="nutzung-fehler"/)
  klickeZeitraum('30t')
  await warte()
  assert.equal(aufrufe.length, vorher + 1, 'ohne Fehler ist der Klick auf den aktiven Zeitraum ein No-Op')
})

test('Fachergebnis „fehler“ → Fehlernotiz mit Fokus; „Erneut versuchen“ lädt den aktiven Zeitraum, Fokus auf dem Zeitraum', async () => {
  naechste.push({ status: 200, json: { status: 'fehler', grund: 'kaputt' } })
  klickeZeitraum('7t')
  await warte()
  assert.match(container.innerHTML, /id="nutzung-fehler"/)
  assert.equal(document.activeElement?.id, 'nutzung-fehler')
  klickeErneut()
  await warte()
  assert.ok(aufrufe.at(-1).includes('?von='), '7 Tage tragen ?von=')
  assert.doesNotMatch(container.innerHTML, /id="nutzung-fehler"/)
  assert.equal(document.activeElement?.id, '[data-verbrauch-zeitraum="7t"]')
})

test('Überholschutz: eine späte Antwort des vorherigen Zeitraums überschreibt den neueren nicht', async () => {
  let freigeben
  naechste.push({ halt: new Promise((r) => (freigeben = r)), json: { status: 'ok', gruppen: [gruppe(0, { inputTokens: 111111, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0 })], laeufeGesamt: 2, ohneBeobachtungGesamt: 0 } })
  klickeZeitraum('30t')
  naechste.push({ status: 200, json: { status: 'ok', gruppen: [gruppe(0, { inputTokens: 222222, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0 })], laeufeGesamt: 2, ohneBeobachtungGesamt: 0 } })
  klickeZeitraum('gesamt')
  await warte()
  freigeben()
  await warte()
  assert.match(container.innerHTML, /222\.222/)
  assert.doesNotMatch(container.innerHTML, /111\.111/)
})

test('Ohne Nutzungsdaten: „—“ statt 0 bei Gelesen/Erzeugt und in den Tokenzellen; 0 Läufe zeigen den Leerzustand außerhalb der Klappe', async () => {
  naechste.push({ status: 200, json: { status: 'ok', gruppen: [gruppe(2, { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 })], laeufeGesamt: 2, ohneBeobachtungGesamt: 2 } })
  klickeZeitraum('7t')
  await warte()
  assert.match(container.innerHTML, /<span class="nutzung-gross"><span aria-hidden="true">—<\/span>/)
  assert.doesNotMatch(container.innerHTML, /nutzung-davon/)
  assert.doesNotMatch(container.innerHTML, /nutzung-leer/)
  naechste.push({ status: 200, json: { status: 'ok', gruppen: [], laeufeGesamt: 0, ohneBeobachtungGesamt: 0 } })
  klickeZeitraum('30t')
  await warte()
  assert.match(container.innerHTML, /class="leer nutzung-leer"/)
})
