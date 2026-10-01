/**
 * Datei: public/leitstand/views/workflows-dialog.test.mjs
 *
 * Zweck: node:test-Fälle für die Dialogsteuerung von Auftrag & Ablauf (F44 WS-4a, views/workflows.js):
 * Stand-Änderung bei offenem Dialog schließt ihn (kein Nachladen in den offenen Dialog) und rettet
 * die Begründung für denselben Halt; während einer laufenden Freigabe sind Escape, „Abbrechen“ und ein
 * erneutes Öffnen gesperrt (genau ein POST); eine späte Antwort nach dem Schließen des Details wird
 * verworfen; ein 409 bleibt im offenen Dialog; ein Ladefehler des Details lässt keine Aktion des alten
 * Stands stehen.
 *
 * Die echten Module laufen gegen ein minimales Schein-DOM (jede id liefert ein gleichbleibendes
 * Schein-Element) und ein aufzeichnendes fetch — kein Browser, kein Server.
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 *
 * Wichtig: Die Globals müssen VOR dem Import stehen (projekt-kontext.js liest sessionStorage beim Laden).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'

/**
 * Schein-Element mit den DOM-Methoden, die views/workflows.js benutzt.
 * @param id - Element-id
 * @returns Schein-Element
 */
function scheinElement(id = '') {
  return {
    id,
    hidden: false,
    innerHTML: '',
    textContent: '',
    value: '',
    className: '',
    dataset: {},
    open: false,
    handler: {},
    zuhoerer: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    // Alle Zuhörer je Typ (am Dialog hängen Bedienung UND „Freigeben & installieren“); handler ruft sie der Reihe nach.
    addEventListener(typ, fn) {
      ;(this.zuhoerer[typ] ??= []).push(fn)
      this.handler[typ] = (ereignis) => {
        for (const f of this.zuhoerer[typ]) f(ereignis)
      }
    },
    setAttribute() {},
    removeAttribute() {},
    querySelector: () => null,
    querySelectorAll: () => [],
    contains: () => false,
    focus() {
      globalThis.document.activeElement = this
    },
    scrollIntoView() {},
  }
}

const elemente = new Map()
const speicher = () => {
  const werte = new Map()
  return { getItem: (s) => werte.get(s) ?? null, setItem: (s, w) => werte.set(s, String(w)), removeItem: (s) => werte.delete(s) }
}
globalThis.document = {
  getElementById(id) {
    if (!elemente.has(id)) elemente.set(id, scheinElement(id))
    return elemente.get(id)
  },
  querySelector: () => null,
  querySelectorAll: () => [],
  activeElement: null,
}
// empfehlung-installation.js prüft ereignis.target instanceof Element.
globalThis.Element = class {}
Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true, writable: true })
globalThis.addEventListener = () => {}
Object.defineProperty(globalThis, 'location', { value: { hash: '#/runs' }, configurable: true, writable: true })
Object.defineProperty(globalThis, 'history', { value: { state: null, replaceState: (_z, _t, url) => (location.hash = url), back() {} }, configurable: true, writable: true })
Object.defineProperty(globalThis, 'sessionStorage', { value: speicher(), configurable: true, writable: true })
Object.defineProperty(globalThis, 'localStorage', { value: speicher(), configurable: true, writable: true })

/** Schein-Dialog: showModal/close setzen open, close zählt mit. */
const dialog = document.getElementById('workflow-dialog')
dialog.showModal = () => {
  dialog.open = true
}
dialog.close = () => {
  dialog.open = false
}

const SCHRITTE = [{ schritt_id: 's1', rolle: 'ausfuehrung', worker: 'claude-code', freigabe: 'ZWINGEND', status: 'WARTET_FREIGABE', nachfolger: null, lauf_id: null }]
const empfehlung = (ids) => ({ schrittId: 's1', wirdGenutzt: ids.map((id) => ({ id, empfehlungId: id, name: id, grund: 'g' })), passtNichtImLauf: [], weitereAnzahl: { wirdGenutzt: 0, passtNichtImLauf: 0 }, nichtFreigebbarAnzahl: 0, hinweise: [] })
/** Antwort von GET /api/workflows/w-1 — die Tests schalten sie um. */
let detail = { status: 200, json: { daten: { ziel: 'Ziel', status: 'WARTET_FREIGABE', aktiver_schritt_id: 's1', schritte: SCHRITTE }, naechster: { art: 'haltFreigabe', schrittId: 's1' }, empfehlung: empfehlung(['a']) } }
/** Zurückgehaltene POST-Antwort: null = sofort { status: postStatus }, sonst Liste der Freigeber. */
let postHalt = null
let postStatus = 200
const posts = []

globalThis.fetch = (url, optionen = {}) => {
  const pfad = String(url)
  if ((optionen.method ?? 'GET') === 'POST') {
    posts.push(pfad)
    const antwort = () => ({ ok: postStatus < 300, status: postStatus, json: async () => (postStatus < 300 ? { bezeugt: true } : { grund: 'Es läuft bereits ein Lauf (D13)' }) })
    if (postHalt !== null) return new Promise((ok) => postHalt.push(() => ok(antwort())))
    return Promise.resolve(antwort())
  }
  if (pfad.endsWith('/zustand')) return Promise.resolve({ ok: true, status: 200, json: async () => ({ laeufe: [], startfehler: [], workflows: [{ workflowId: 'w-1', ziel: 'Ziel', status: 'WARTET_FREIGABE', naechster: { art: 'haltFreigabe', schrittId: 's1' } }], fehler: [], aktiverLauf: { aktiv: false, laufId: null } }) })
  if (pfad.endsWith('/workflows/w-1/abnahme')) return Promise.resolve({ ok: true, status: 200, json: async () => ({ workflowStatus: 'WARTET_FREIGABE', freigabeHalt: { schrittId: 's1' }, entscheidung: { status: 'fehlt' }, urteil: { status: 'noch_nicht_gelaufen' }, aenderungsuebersicht: { status: 'noch_nicht_gelaufen' }, pruefergebnis: { status: 'noch_nicht_gelaufen' } }) })
  if (pfad.endsWith('/workflows/w-1')) {
    const { status, json } = detail
    return Promise.resolve({ ok: status < 300, status, json: async () => json })
  }
  return Promise.resolve({ ok: true, status: 200, json: async () => ({}) })
}

const warte = () => new Promise((ok) => setTimeout(ok, 20))

const { initWorkflowsView } = await import('./workflows.js')
const { dispatch } = await import('../router.js')
const { pollJetzt } = await import('../zustand.js')
initWorkflowsView()

/** Klick auf einen Knopf im Container (Klick-Delegation über closest). */
function klicke(containerId, selektor, dataset) {
  document.getElementById(containerId).handler.click({ target: { closest: (s) => (s === selektor ? { dataset } : null) } })
}
const oeffneFreigabe = () => klicke('workflow-aktionen', '.wf-aktion', { aktion: 'freigabe-oeffnen', workflowId: 'w-1' })
const feld = () => document.getElementById('wf-freigabe-begruendung')
const meldung = () => document.getElementById('workflow-bedienung-meldung')

/** Öffnet das Detail w-1 frisch im Freigabe-Halt. */
async function oeffneDetail() {
  detail = { status: 200, json: { daten: { ziel: 'Ziel', status: 'WARTET_FREIGABE', aktiver_schritt_id: 's1', schritte: SCHRITTE }, naechster: { art: 'haltFreigabe', schrittId: 's1' }, empfehlung: empfehlung(['a']) } }
  location.hash = '#/runs'
  dispatch()
  location.hash = '#/workflows/w-1'
  dispatch()
  await warte()
}

test('Stand-Änderung (nur Empfehlung) schließt den offenen Dialog, die Begründung steht beim erneuten Öffnen wieder im Feld', async () => {
  await oeffneDetail()
  oeffneFreigabe()
  assert.equal(dialog.open, true)
  assert.match(dialog.innerHTML, /data-empfehlung-ids="\[&quot;a&quot;\]"/)
  feld().value = 'Angefangene Begründung'

  detail.json = { ...detail.json, empfehlung: empfehlung(['a', 'b']) }
  await pollJetzt()
  await warte()
  assert.equal(dialog.open, false, 'kein Nachladen in den offenen Dialog — er schließt')
  assert.equal(meldung().className, 'hinweis')
  assert.match(meldung().textContent, /Katalog-Empfehlung hat sich geändert/)

  feld().value = ''
  oeffneFreigabe()
  assert.equal(feld().value, 'Angefangene Begründung', 'gerettet für denselben Halt')
  assert.match(dialog.innerHTML, /data-empfehlung-ids="\[&quot;a&quot;,&quot;b&quot;\]"/, 'der neue Dialog trägt die neue Empfehlung („Anzeige = Start“)')
  klicke('workflow-dialog', '.wf-dialog-abbrechen', {})
  assert.equal(dialog.open, false)
})

test('Stand-Änderung (anderer Status) schließt mit „Der Stand hat sich geändert“; keine Rettung in einen anderen Halt', async () => {
  await oeffneDetail()
  oeffneFreigabe()
  feld().value = 'Für s1'
  detail.json = { ...detail.json, daten: { ...detail.json.daten, status: 'LAEUFT' }, naechster: { art: 'haltKlaerung', grund: 'läuft' } }
  await pollJetzt()
  await warte()
  assert.equal(dialog.open, false)
  assert.equal(meldung().textContent, 'Der Stand hat sich geändert — bitte erneut prüfen.')
  assert.equal(document.getElementById('workflow-aktionen').innerHTML.includes('freigabe-oeffnen'), false)
})

test('Laufende Freigabe: Escape, „Abbrechen“ und erneutes Öffnen sind gesperrt — genau ein POST', async () => {
  await oeffneDetail()
  oeffneFreigabe()
  feld().value = 'Geprüft.'
  postHalt = []
  posts.length = 0
  klicke('workflow-dialog', '.wf-aktion', { aktion: 'freigeben', workflowId: 'w-1', schrittId: 's1', empfehlungIds: '["a"]' })
  await warte()
  assert.equal(posts.length, 1)

  let verhindert = false
  dialog.handler.cancel({ preventDefault: () => (verhindert = true) })
  assert.equal(verhindert, true, 'Escape wird während der Anfrage abgefangen')
  klicke('workflow-dialog', '.wf-dialog-abbrechen', {})
  assert.equal(dialog.open, true, '„Abbrechen“ schließt während der Anfrage nicht')
  dialog.open = false // als hätte der Browser den Dialog doch geschlossen
  oeffneFreigabe()
  assert.equal(dialog.open, false, 'kein zweiter Dialog während der laufenden Freigabe')

  for (const freigeben of postHalt) freigeben()
  postHalt = null
  await warte()
  assert.equal(posts.length, 1)
  assert.equal(meldung().className, 'erfolg')
  dialog.handler.close?.()
})

test('Eine späte Antwort nach dem Schließen des Details wird verworfen (keine Meldung von A unter B)', async () => {
  await oeffneDetail()
  oeffneFreigabe()
  feld().value = 'Geprüft.'
  postHalt = []
  klicke('workflow-dialog', '.wf-aktion', { aktion: 'freigeben', workflowId: 'w-1', schrittId: 's1', empfehlungIds: '["a"]' })
  await warte()
  location.hash = '#/runs'
  dispatch()
  for (const freigeben of postHalt) freigeben()
  postHalt = null
  await warte()
  assert.equal(meldung().hidden, true, 'die Antwort zu w-1 schreibt nach dem Schließen nichts mehr')
})

test('409 im Dialog: Meldung im Dialog, der Dialog bleibt offen', async () => {
  await oeffneDetail()
  oeffneFreigabe()
  feld().value = 'Geprüft.'
  postStatus = 409
  klicke('workflow-dialog', '.wf-aktion', { aktion: 'freigeben', workflowId: 'w-1', schrittId: 's1', empfehlungIds: '["a"]' })
  await warte()
  postStatus = 200
  assert.equal(dialog.open, true)
  assert.equal(document.getElementById('workflow-dialog-meldung').textContent, '409: Es läuft bereits ein Lauf (D13)')
  klicke('workflow-dialog', '.wf-dialog-abbrechen', {})
})

test('Ladefehler eines geladenen Details: keine Aktion des alten Stands, kein Dialog aus dem alten Detail', async () => {
  await oeffneDetail()
  assert.match(document.getElementById('workflow-aktionen').innerHTML, /freigabe-oeffnen/)
  detail = { status: 404, json: { grund: 'Workflow nicht gefunden' } }
  await pollJetzt()
  await warte()
  assert.equal(document.getElementById('workflow-aktionen').innerHTML, '')
  assert.equal(document.getElementById('workflow-blick').innerHTML, '')
  assert.equal(document.getElementById('workflow-detail-fehler').hidden, false)
  assert.match(document.getElementById('workflow-detail-fehler').innerHTML, /404: Workflow nicht gefunden/)
  oeffneFreigabe()
  assert.equal(dialog.open, false)
  // Ein weiterer Tick blendet den Fehler nicht zwischendurch aus (kein Flackern).
  await pollJetzt()
  assert.equal(document.getElementById('workflow-detail-fehler').hidden, false)
})
