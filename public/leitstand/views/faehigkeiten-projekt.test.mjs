/**
 * Datei: public/leitstand/views/faehigkeiten-projekt.test.mjs
 *
 * Zweck: node:test für die View „Dieses Projekt“ (F45 F-2a): Laden über GET …/faehigkeiten (lädt → Inhalt; Fehler →
 * Fehlerzustand), Schalter → POST …/aktivierung mit { eintrag, aktiv } und Neuladen mit Meldung, „Freigeben nach Inhalt“
 * öffnen und bestätigen → POST …/freigabe mit genau dem angezeigten Hash; 409 → „Inhalt hat sich geändert, neu laden“ mit
 * dem Grund des Servers; gesperrter Schalter sendet nichts; Projektwechsel verwirft eine späte Antwort.
 *
 * Die View läuft gegen ein minimales Schein-DOM (Container mit innerHTML und Klick-Handler) und ein aufzeichnendes fetch
 * — kein Browser, kein Server.
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 *
 * Wichtig: Die Globals stehen VOR dem Import der Module (i18n liest Storage beim Laden) — deshalb dynamische Importe.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'

class ScheinElement {
  constructor(id = '') {
    this.id = id
    this.innerHTML = ''
    this.dataset = {}
    this.handler = {}
    this.disabled = false
  }
  addEventListener(typ, fn) {
    if (this.handler[typ] === undefined) this.handler[typ] = []
    this.handler[typ].push(fn)
  }
  querySelector() {
    return null
  }
  closest() {
    return this
  }
}

const container = new ScheinElement('faehigkeiten-projekt')
const speicher = () => {
  const werte = new Map()
  return { getItem: (s) => werte.get(s) ?? null, setItem: (s, w) => werte.set(s, String(w)), removeItem: (s) => werte.delete(s) }
}
globalThis.Element = ScheinElement
globalThis.document = { getElementById: (id) => (id === 'faehigkeiten-projekt' ? container : null), documentElement: new ScheinElement('html') }
Object.defineProperty(globalThis, 'sessionStorage', { value: speicher(), configurable: true, writable: true })
Object.defineProperty(globalThis, 'localStorage', { value: speicher(), configurable: true, writable: true })

const H = 'd'.repeat(64)
const STAND = 'e'.repeat(64)
const STATUS = {
  projekt_id: 'p',
  lokale_datei: { zustand: 'gueltig', pfad: '/h/faehigkeiten.lokal.json', hash: STAND, fremd_geaendert: null },
  lauf_aktiv: { aktiv: false },
  letzter_lauf_id: null,
  hindernis: null,
  eintraege: [{ id: 'agent:eigener', name: 'eigener', typ: 'agent', quelle: 'projekt', pfad: '.claude/agents/eigener.md', installiert: true, freigabe: 'keine', hash: H, katalog_hash: null, eingeschaltet: false, aktiv: false, grund: 'keine Freigabe', letzter_lauf: { im_lauf: 'ohne_erfassung', benutzt: null } }],
}
const anfragen = []
/** Antworten je Schlüssel 'METHODE pfad-ende'; ein Wert kann ein Versprechen sein (Überholschutz). */
let antworten = {}
globalThis.fetch = (url, optionen = {}) => {
  const methode = optionen.method ?? 'GET'
  const pfad = String(url)
  anfragen.push({ methode, pfad, koerper: optionen.body === undefined ? null : JSON.parse(optionen.body) })
  const schluessel = Object.keys(antworten).find((s) => s.startsWith(`${methode} `) && pfad.endsWith(s.slice(methode.length + 1)))
  const eintrag = schluessel === undefined ? { status: 200, json: {} } : antworten[schluessel]
  return Promise.resolve(eintrag.warte ?? null).then(() => new Response(JSON.stringify(eintrag.json), { status: eintrag.status }))
}

const { initFaehigkeitenProjekt, ladeFaehigkeitenProjekt, setzeFaehigkeitenProjektZurueck } = await import('./faehigkeiten-projekt.js')
initFaehigkeitenProjekt()
const klick = async (dataset) => {
  const ziel = Object.assign(new ScheinElement(), { dataset })
  for (const fn of container.handler.click ?? []) fn({ target: ziel })
  await new Promise((fertig) => setTimeout(fertig, 5))
}

test('Laden: Inhalt aus GET …/faehigkeiten; Fehler → Fehlerzustand mit Grund', async () => {
  antworten = { 'GET /faehigkeiten': { status: 200, json: STATUS } }
  setzeFaehigkeitenProjektZurueck()
  await ladeFaehigkeitenProjekt()
  assert.match(container.innerHTML, /data-fp-freigabe-oeffnen="agent:eigener"/)
  antworten = { 'GET /faehigkeiten': { status: 500, json: { grund: 'ressourcen.json ungültig' } } }
  setzeFaehigkeitenProjektZurueck()
  await ladeFaehigkeitenProjekt()
  assert.match(container.innerHTML, /Fähigkeiten nicht ladbar: 500 ressourcen\.json ungültig/)
})

test('Schalter: POST …/aktivierung mit { eintrag, aktiv }, danach neu geladen mit Meldung „Gespeichert“', async () => {
  antworten = { 'GET /faehigkeiten': { status: 200, json: STATUS }, 'POST /faehigkeiten/aktivierung': { status: 200, json: { an: ['agent:eigener'] } } }
  setzeFaehigkeitenProjektZurueck()
  await ladeFaehigkeitenProjekt()
  anfragen.length = 0
  await klick({ fpSchalter: 'agent:eigener', fpZiel: 'true' })
  assert.deepEqual(anfragen[0], { methode: 'POST', pfad: '/api/faehigkeiten/aktivierung', koerper: { eintrag: 'agent:eigener', aktiv: true, stand: STAND } })
  assert.equal(anfragen[1].methode, 'GET', 'neu geladen')
  assert.match(container.innerHTML, /Gespeichert — wirkt ab dem nächsten Lauf\./)
})

test('Freigeben nach Inhalt: öffnen zeigt Pfad/Hash, bestätigen sendet genau den angezeigten Hash; 409 → „Inhalt hat sich geändert, neu laden“', async () => {
  antworten = { 'GET /faehigkeiten': { status: 200, json: STATUS }, 'POST /faehigkeiten/freigabe': { status: 409, json: { grund: "Inhalt von 'agent:eigener' hat sich seit der Anzeige geändert" } } }
  setzeFaehigkeitenProjektZurueck()
  await ladeFaehigkeitenProjekt()
  await klick({ fpFreigabeOeffnen: 'agent:eigener' })
  assert.match(container.innerHTML, /<code>\.claude\/agents\/eigener\.md<\/code>/)
  assert.match(container.innerHTML, /data-fp-freigabe-bestaetigen="agent:eigener" data-fp-hash="d{64}"/)
  anfragen.length = 0
  await klick({ fpFreigabeBestaetigen: 'agent:eigener', fpHash: H })
  assert.deepEqual(anfragen[0], { methode: 'POST', pfad: '/api/faehigkeiten/freigabe', koerper: { eintrag: 'agent:eigener', hash: H, stand: STAND } })
  assert.match(container.innerHTML, /Nicht freigegeben — Inhalt von &#39;agent:eigener&#39; hat sich seit der Anzeige geändert/)
  // QA 5: nach der 409 schließt der Block — der neu geladene Hash muss erst wieder geöffnet und angesehen werden.
  assert.doesNotMatch(container.innerHTML, /data-fp-freigabe-bestaetigen/)
  await klick({ fpFreigabeOeffnen: 'agent:eigener' })
  await klick({ fpFreigabeAbbrechen: 'agent:eigener' })
  assert.doesNotMatch(container.innerHTML, /data-fp-freigabe-bestaetigen/)
})

test('gesperrter Schalter sendet nichts; späte Antwort nach Projektwechsel wird verworfen', async () => {
  antworten = { 'GET /faehigkeiten': { status: 200, json: STATUS } }
  setzeFaehigkeitenProjektZurueck()
  await ladeFaehigkeitenProjekt()
  anfragen.length = 0
  const ziel = Object.assign(new ScheinElement(), { dataset: { fpSchalter: 'agent:eigener', fpZiel: 'true' }, disabled: true })
  for (const fn of container.handler.click) fn({ target: ziel })
  await new Promise((fertig) => setTimeout(fertig, 5))
  assert.equal(anfragen.length, 0)
  let freigeben
  antworten = { 'GET /faehigkeiten': { status: 200, json: { ...STATUS, eintraege: [] }, warte: new Promise((r) => (freigeben = r)) } }
  const spaet = ladeFaehigkeitenProjekt()
  setzeFaehigkeitenProjektZurueck()
  antworten = { 'GET /faehigkeiten': { status: 200, json: STATUS } }
  await ladeFaehigkeitenProjekt()
  freigeben()
  await spaet
  assert.match(container.innerHTML, /agent:eigener/, 'die späte (leere) Antwort überschreibt nicht')
})

test('QA 4: Projektwechsel während eines POST — die Meldung des alten Projekts erscheint nicht im neuen', async () => {
  let freigeben
  antworten = { 'GET /faehigkeiten': { status: 200, json: STATUS }, 'POST /faehigkeiten/aktivierung': { status: 200, json: {}, warte: new Promise((r) => (freigeben = r)) } }
  setzeFaehigkeitenProjektZurueck()
  await ladeFaehigkeitenProjekt()
  const ziel = Object.assign(new ScheinElement(), { dataset: { fpSchalter: 'agent:eigener', fpZiel: 'true' } })
  for (const fn of container.handler.click) fn({ target: ziel })
  setzeFaehigkeitenProjektZurueck()
  antworten = { 'GET /faehigkeiten': { status: 200, json: { ...STATUS, eintraege: [] } } }
  await ladeFaehigkeitenProjekt()
  freigeben()
  await new Promise((fertig) => setTimeout(fertig, 10))
  assert.doesNotMatch(container.innerHTML, /Gespeichert/)
  assert.match(container.innerHTML, /keine Fähigkeiten/)
})

test('Schalter während eines Laufs: Server antwortet 409 → Grund als Meldung, kein Präfix', async () => {
  antworten = { 'GET /faehigkeiten': { status: 200, json: STATUS }, 'POST /faehigkeiten/aktivierung': { status: 409, json: { grund: "ein anderer Lauf ('x') ist noch aktiv (D13)" } } }
  setzeFaehigkeitenProjektZurueck()
  await ladeFaehigkeitenProjekt()
  await klick({ fpSchalter: 'agent:eigener', fpZiel: 'true' })
  assert.match(container.innerHTML, /data-fp-meldung="fehler"[^>]*>ein anderer Lauf \(&#39;x&#39;\) ist noch aktiv \(D13\)</)
})

test('F-1061 (3): „Datei geprüft – Stand übernehmen“ → POST …/bestaetigung mit dem angezeigten Stand, Meldung, neu geladen', async () => {
  antworten = { 'GET /faehigkeiten': { status: 200, json: STATUS }, 'POST /faehigkeiten/bestaetigung': { status: 200, json: { bekannt: { quelle: 'bestaetigt' } } } }
  setzeFaehigkeitenProjektZurueck()
  await ladeFaehigkeitenProjekt()
  anfragen.length = 0
  await klick({ fpBestaetigen: STAND })
  assert.deepEqual(anfragen[0], { methode: 'POST', pfad: '/api/faehigkeiten/bestaetigung', koerper: { stand: STAND } })
  assert.equal(anfragen[1].methode, 'GET')
  assert.match(container.innerHTML, /Stand übernommen — Läufe mit Fähigkeiten sind wieder möglich\./)
})
