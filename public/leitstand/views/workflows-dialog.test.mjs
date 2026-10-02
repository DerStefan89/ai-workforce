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
/** Antwort von GET /api/workflows/w-1/abnahme — die Abnahme-Tests (F44 WS-4b) schalten sie um. */
const ABNAHME_HALT = { workflowStatus: 'WARTET_FREIGABE', freigabeHalt: { schrittId: 's1' }, entscheidung: { status: 'fehlt' }, urteil: { status: 'noch_nicht_gelaufen' }, aenderungsuebersicht: { status: 'noch_nicht_gelaufen' }, pruefergebnis: { status: 'noch_nicht_gelaufen' } }
let abnahmeAntwort = ABNAHME_HALT

globalThis.fetch = (url, optionen = {}) => {
  const pfad = String(url)
  if ((optionen.method ?? 'GET') === 'POST') {
    posts.push(pfad)
    const antwort = () => ({ ok: postStatus < 300, status: postStatus, json: async () => (postStatus < 300 ? { bezeugt: true } : { grund: 'Es läuft bereits ein Lauf (D13)' }) })
    if (postHalt !== null) return new Promise((ok) => postHalt.push(() => ok(antwort())))
    return Promise.resolve(antwort())
  }
  if (pfad.endsWith('/zustand')) return Promise.resolve({ ok: true, status: 200, json: async () => ({ laeufe: [], startfehler: [], workflows: [{ workflowId: 'w-1', ziel: 'Ziel', status: 'WARTET_FREIGABE', naechster: { art: 'haltFreigabe', schrittId: 's1' } }], fehler: [], aktiverLauf: { aktiv: false, laufId: null } }) })
  if (pfad.endsWith('/workflows/w-1/abnahme')) return Promise.resolve({ ok: true, status: 200, json: async () => abnahmeAntwort })
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

// ─── F44 WS-4b: Dialogarten 'klaerung' (Rückfrage des Architekten) und 'sichtung' (F-768) ───

const FRAGEN = [{ frage: 'Welche Meldung zuerst?', auswirkung_bestand: 'nur Anzeige', begruendung: 'häufigster Fall', empfehlung: 'B', optionen: [{ titel: 'A', vorteile: [], nachteile: [] }, { titel: 'B', vorteile: ['häufig'], nachteile: [] }] }]
const KLAERUNG = { daten: { ziel: 'Ziel', status: 'KLAERUNG_ERFORDERLICH', aktiver_schritt_id: 's1', schritte: SCHRITTE }, naechster: { art: 'haltKlaerung', schrittId: 's1' }, empfehlung: null, architekturEntscheidung: { schrittId: 's1', fragen: FRAGEN } }
const SICHTUNG_SCHRITTE = [
  { schritt_id: 's1', rolle: 'ausfuehrung', worker: 'claude-code', freigabe: 'KEINE', status: 'VERWEIGERT', nachfolger: 's2', lauf_id: 'l-1' },
  { schritt_id: 's2', rolle: 'code-reviewer', worker: 'codex', freigabe: 'KEINE', status: 'OFFEN', nachfolger: null, lauf_id: null },
]
const SICHTUNG = {
  daten: { ziel: 'Ziel', status: 'KLAERUNG_ERFORDERLICH', aktiver_schritt_id: 's1', grund: "Lauf endete VERWEIGERT (ohne Bypass-Verdacht). Abgelehnte Befehle: rm -rf — menschliche Sichtung vor Fortsetzung (F-760, Schritt 's1', Lauf 'l-1')", schritte: SICHTUNG_SCHRITTE },
  naechster: { art: 'haltKlaerung', schrittId: 's1' },
  empfehlung: null,
  architekturEntscheidung: null,
}

/** Öffnet das Detail w-1 frisch mit der übergebenen Antwort. @param json - Antwort von GET /api/workflows/w-1 */
async function oeffneDetailMit(json) {
  location.hash = '#/runs'
  dispatch()
  detail = { status: 200, json }
  location.hash = '#/workflows/w-1'
  dispatch()
  await warte()
}

test('Rückfrage (klaerung): Notiz über der Timeline, der Knopf öffnet den Dialog mit dem Formular, Empfehlung vorgewählt', async () => {
  await oeffneDetailMit(KLAERUNG)
  const notizen = document.getElementById('workflow-bedienung').innerHTML
  assert.match(notizen, /Jarvis braucht deine Entscheidung\./)
  assert.match(notizen, /Welche Meldung zuerst\?/)
  assert.match(notizen, /data-aktion="klaerung-oeffnen"/)
  assert.doesNotMatch(notizen, /<h3>Bedienung<\/h3>/, 'die Überschrift „Bedienung“ entfällt')
  klicke('workflow-bedienung', '.wf-aktion', { aktion: 'klaerung-oeffnen', workflowId: 'w-1' })
  assert.equal(dialog.open, true)
  assert.match(dialog.innerHTML, /Rückfrage beantworten/)
  assert.match(dialog.innerHTML, /value="B" checked/, 'die Empfehlung ist vorgewählt (F-711)')
  assert.doesNotMatch(dialog.innerHTML, /value="A" checked/)
  assert.match(dialog.innerHTML, /data-aktion="architektur-entscheidung"/)
  klicke('workflow-dialog', '.wf-dialog-abbrechen', {})
  assert.equal(dialog.open, false)
})

test('Rückfrage (klaerung): Sperre während des POST — Escape, „Abbrechen“ und Wiederöffnen gesperrt, genau ein POST', async () => {
  await oeffneDetailMit(KLAERUNG)
  klicke('workflow-bedienung', '.wf-aktion', { aktion: 'klaerung-oeffnen', workflowId: 'w-1' })
  postHalt = []
  posts.length = 0
  klicke('workflow-dialog', '.wf-aktion', { aktion: 'architektur-entscheidung', workflowId: 'w-1', schrittId: 's1' })
  await warte()
  assert.equal(posts.length, 1)
  assert.match(posts[0], /\/workflows\/w-1\/entscheidung$/)
  let verhindert = false
  dialog.handler.cancel({ preventDefault: () => (verhindert = true) })
  assert.equal(verhindert, true)
  klicke('workflow-dialog', '.wf-dialog-abbrechen', {})
  assert.equal(dialog.open, true, '„Abbrechen“ schließt während der Anfrage nicht')
  dialog.open = false
  klicke('workflow-bedienung', '.wf-aktion', { aktion: 'klaerung-oeffnen', workflowId: 'w-1' })
  assert.equal(dialog.open, false, 'kein zweiter Dialog während der laufenden Anfrage')
  for (const freigeben of postHalt) freigeben()
  postHalt = null
  await warte()
  assert.equal(posts.length, 1)
  assert.equal(meldung().className, 'erfolg')
  assert.equal(meldung().textContent, 'Architektur-Entscheidung gespeichert.')
  dialog.handler.close?.()
})

test('Rückfrage (klaerung): Stand-Änderung schließt den Dialog; nur eine geänderte Empfehlung nicht', async () => {
  await oeffneDetailMit(KLAERUNG)
  klicke('workflow-bedienung', '.wf-aktion', { aktion: 'klaerung-oeffnen', workflowId: 'w-1' })
  detail.json = { ...KLAERUNG, empfehlung: empfehlung(['a']) }
  await pollJetzt()
  await warte()
  assert.equal(dialog.open, true, 'die Empfehlung gehört nicht zum Inhalt der Rückfrage')
  detail.json = { ...KLAERUNG, architekturEntscheidung: null, naechster: { art: 'starte', schrittId: 's1' }, daten: { ...KLAERUNG.daten, status: 'OFFEN' } }
  await pollJetzt()
  await warte()
  assert.equal(dialog.open, false)
  assert.equal(meldung().textContent, 'Der Stand hat sich geändert — bitte erneut prüfen.')
})

test('Sichtung (sichtung): Notiz mit Schritt und Lauf, Dialog mit Pflichtfeld, Sperre während des POST, Schließen bei Stand-Änderung', async () => {
  await oeffneDetailMit(SICHTUNG)
  const notizen = document.getElementById('workflow-bedienung').innerHTML
  assert.match(notizen, /Abgelehnte Befehle sichten/)
  assert.match(notizen, /<code>s1<\/code>.*<code>l-1<\/code>/s)
  klicke('workflow-bedienung', '.wf-aktion', { aktion: 'sichtung-oeffnen', workflowId: 'w-1' })
  assert.equal(dialog.open, true)
  assert.match(dialog.innerHTML, /id="wf-sichtung-begruendung"/)
  assert.match(dialog.innerHTML, /Sichtung bestätigt – weiter/)
  // Pflichtfeld: leer → Meldung im Dialog, kein POST.
  posts.length = 0
  document.getElementById('wf-sichtung-begruendung').value = '   '
  klicke('workflow-dialog', '.wf-aktion', { aktion: 'sichtung', workflowId: 'w-1' })
  await warte()
  assert.equal(posts.length, 0)
  assert.match(document.getElementById('workflow-dialog-meldung').textContent, /Begründung ist Pflicht/)
  // Sperre während des POST.
  document.getElementById('wf-sichtung-begruendung').value = 'Befehle gesichtet.'
  postHalt = []
  klicke('workflow-dialog', '.wf-aktion', { aktion: 'sichtung', workflowId: 'w-1' })
  await warte()
  assert.equal(posts.length, 1)
  let verhindert = false
  dialog.handler.cancel({ preventDefault: () => (verhindert = true) })
  assert.equal(verhindert, true)
  for (const freigeben of postHalt) freigeben()
  postHalt = null
  await warte()
  assert.equal(posts.length, 1)
  assert.equal(dialog.open, false, 'Erfolg schließt den Dialog')
  assert.equal(meldung().className, 'erfolg')
  dialog.handler.close?.()

  // Stand-Änderung bei offenem Dialog: schließt mit Meldung.
  await oeffneDetailMit(SICHTUNG)
  klicke('workflow-bedienung', '.wf-aktion', { aktion: 'sichtung-oeffnen', workflowId: 'w-1' })
  document.getElementById('wf-sichtung-begruendung').value = 'Angefangen'
  detail.json = { ...SICHTUNG, daten: { ...SICHTUNG.daten, status: 'GESTOPPT', grund: 'gestoppt' } }
  await pollJetzt()
  await warte()
  assert.equal(dialog.open, false)
  assert.equal(meldung().textContent, 'Der Stand hat sich geändert — bitte erneut prüfen.')
})

// ─── F44 WS-4b (Korrekturrunde): Abnahme-Bedienung, späte Antworten, Sichtung nur für den angezeigten Halt ───

const ABGESCHLOSSEN = { daten: { ziel: 'Ziel', status: 'ABGESCHLOSSEN', aktiver_schritt_id: null, schritte: SCHRITTE.map((s) => ({ ...s, status: 'ERFOLGREICH', lauf_id: 'l-bau' })) }, naechster: { art: 'fertig', schrittId: null }, empfehlung: null, architekturEntscheidung: null }
const ABNAHME_OFFEN = { workflowStatus: 'ABGESCHLOSSEN', freigabeHalt: null, entscheidung: { status: 'nicht_vorhanden' }, urteil: { status: 'noch_nicht_gelaufen' }, aenderungsuebersicht: { status: 'ok', laufId: 'l-bau', daten: { basis_ref: 'b', gekuerzt: false, dateien: [] } }, pruefergebnis: { status: 'ok', laufId: 'l-p', ergebnis: 'GRUEN', exitCode: 0 } }
const ABNAHME_VORAB = { ...ABNAHME_OFFEN, workflowStatus: 'KLAERUNG_ERFORDERLICH', aenderungsuebersicht: { status: 'noch_nicht_gelaufen' }, pruefergebnis: { status: 'noch_nicht_gelaufen' } }

// Schein-DOM für die beiden Abnahme-Container: ein neues innerHTML mit dem Feld setzt dessen Wert zurück
// (wie ein echtes neues Element) — nur so ist die Rettung der Begründung prüfbar.
for (const id of ['workflow-abnahme', 'workflow-abnahme-stand']) {
  const container = document.getElementById(id)
  let html = ''
  Object.defineProperty(container, 'innerHTML', {
    get: () => html,
    set(wert) {
      html = wert
      if (wert.includes('id="wf-abnahme-begruendung"')) document.getElementById('wf-abnahme-begruendung').value = ''
    },
  })
  container.contains = (el) => el?.id === 'wf-abnahme-begruendung' && html.includes('id="wf-abnahme-begruendung"')
}
const abnahmeMeldung = () => document.getElementById('workflow-abnahme-meldung')
// F46 D2: in der Lage „entscheidbar“ steht der Knopf in der Spalte „Deine Entscheidung“ (#workflow-entscheidung).
const klickeAbnahme = (aktion) => klicke('workflow-entscheidung', '.wf-abnahme-aktion', { aktion, workflowId: 'w-1' })

test('Abnahme: während des POST ist der ganze Bereich gesperrt — ein zweiter Knopf schickt keinen zweiten POST', async () => {
  abnahmeAntwort = ABNAHME_OFFEN
  await oeffneDetailMit(ABGESCHLOSSEN)
  assert.match(document.getElementById('workflow-abnahme').innerHTML, /Abnahmekriterien/)
  assert.match(document.getElementById('workflow-entscheidung').innerHTML, /Abnehmen\?/)
  document.getElementById('wf-abnahme-begruendung').value = 'Passt.'
  postHalt = []
  posts.length = 0
  klickeAbnahme('ANGENOMMEN')
  await warte()
  klickeAbnahme('ABGELEHNT')
  klicke('workflow-abnahme', '.wf-pruefung-wiederholen', { workflowId: 'w-1' })
  await warte()
  assert.equal(posts.length, 1, 'genau ein POST trotz weiterer Klicks')
  assert.match(posts[0], /\/workflows\/w-1\/abnahme$/)
  abnahmeAntwort = { ...ABNAHME_OFFEN, entscheidung: { status: 'ok', ergebnis: 'ANGENOMMEN', begruendung: 'Passt.', entschiedenAm: '2026-10-01T09:00:00.000Z', erzeuger: 'mensch' } }
  for (const freigeben of postHalt) freigeben()
  postHalt = null
  await warte()
  assert.equal(posts.length, 1)
  assert.equal(abnahmeMeldung().className, 'erfolg')
  assert.equal(abnahmeMeldung().textContent, 'Abnahme festgehalten.')
  assert.equal(document.getElementById('workflow-abnahme').innerHTML, '', 'der Abschnitt verschwindet mit der Entscheidung')
  assert.match(document.getElementById('workflow-abnahme-stand').innerHTML, /Abgenommen/)
  abnahmeAntwort = ABNAHME_HALT
})

test('Abnahme: eine späte Antwort nach dem Schließen des Details wird verworfen', async () => {
  abnahmeAntwort = ABNAHME_OFFEN
  await oeffneDetailMit(ABGESCHLOSSEN)
  document.getElementById('wf-abnahme-begruendung').value = 'Passt.'
  postHalt = []
  klickeAbnahme('ABGELEHNT')
  await warte()
  location.hash = '#/runs'
  dispatch()
  for (const freigeben of postHalt) freigeben()
  postHalt = null
  await warte()
  assert.equal(abnahmeMeldung().hidden, true, 'keine Meldung zu w-1 nach dem Schließen')
  abnahmeAntwort = ABNAHME_HALT
})

test('Abnahme: eine angefangene Begründung überlebt den Wechsel von „vorab“ zu „entscheidbar“; Pflichtfeld ohne POST', async () => {
  abnahmeAntwort = ABNAHME_VORAB
  await oeffneDetailMit(ABGESCHLOSSEN)
  assert.match(document.getElementById('workflow-abnahme-stand').innerHTML, /Auftrag ablehnen oder Anpassung wünschen/)
  assert.equal(document.getElementById('workflow-abnahme').innerHTML, '')
  posts.length = 0
  klicke('workflow-abnahme-stand', '.wf-abnahme-aktion', { aktion: 'ABGELEHNT', workflowId: 'w-1' })
  await warte()
  assert.equal(posts.length, 0)
  assert.match(abnahmeMeldung().textContent, /Begründung ist Pflicht/)
  document.getElementById('wf-abnahme-begruendung').value = 'Halb geschrieben'
  abnahmeAntwort = ABNAHME_OFFEN
  await pollJetzt()
  await warte()
  assert.match(document.getElementById('workflow-entscheidung').innerHTML, /Abnehmen\?/)
  assert.equal(document.getElementById('wf-abnahme-begruendung').value, 'Halb geschrieben', 'die Begründung steht im neuen Feld')
  abnahmeAntwort = ABNAHME_HALT
})

test('Rückfrage (klaerung): eine späte Antwort nach dem Schließen des Details wird verworfen', async () => {
  await oeffneDetailMit(KLAERUNG)
  klicke('workflow-bedienung', '.wf-aktion', { aktion: 'klaerung-oeffnen', workflowId: 'w-1' })
  postHalt = []
  klicke('workflow-dialog', '.wf-aktion', { aktion: 'architektur-entscheidung', workflowId: 'w-1', schrittId: 's1' })
  await warte()
  location.hash = '#/runs'
  dispatch()
  assert.equal(dialog.open, false, 'das Schließen des Details schließt den Dialog')
  for (const freigeben of postHalt) freigeben()
  postHalt = null
  await warte()
  assert.equal(meldung().hidden, true, 'keine Meldung zu w-1 nach dem Schließen')
})

test('Sichtung: bestätigt wird nur der angezeigte Halt — ein inzwischen anderer Lauf ergibt 409 im Dialog, kein POST', async () => {
  await oeffneDetailMit(SICHTUNG)
  klicke('workflow-bedienung', '.wf-aktion', { aktion: 'sichtung-oeffnen', workflowId: 'w-1' })
  document.getElementById('wf-sichtung-begruendung').value = 'Gesichtet.'
  // Der Server steht beim Absenden auf einem anderen F-760-Halt (neuer Lauf) — der Poll hat ihn noch nicht gezeigt.
  const anderer = SICHTUNG_SCHRITTE.map((s) => (s.schritt_id === 's1' ? { ...s, lauf_id: 'l-2' } : s))
  detail.json = { ...SICHTUNG, daten: { ...SICHTUNG.daten, schritte: anderer, grund: SICHTUNG.daten.grund.replace("Lauf 'l-1'", "Lauf 'l-2'") } }
  posts.length = 0
  klicke('workflow-dialog', '.wf-aktion', { aktion: 'sichtung', workflowId: 'w-1' })
  await warte()
  assert.equal(posts.length, 0, 'kein POST für einen nicht angezeigten Halt')
  assert.match(document.getElementById('workflow-dialog-meldung').textContent, /^409: Der Workflow steht nicht mehr auf dem F-760-Halt/)
  klicke('workflow-dialog', '.wf-dialog-abbrechen', {})
})

test('F46 D2: „<Option> bestätigen“ der Spalte öffnet den bestehenden Freigabedialog mit der Begründung; Stand-Änderung schließt ihn; ohne Begründung kein Dialog', async () => {
  await oeffneDetail()
  // Ohne Begründung (Knopf gesperrt; ein synthetischer Klick öffnet trotzdem nichts).
  document.getElementById('wf-entscheidung-begruendung').value = '   '
  klicke('workflow-entscheidung', '.wf-aktion', { aktion: 'freigabe-bestaetigen', workflowId: 'w-1', option: 'freigeben' })
  assert.equal(dialog.open, false, 'leere Begründung: kein Dialog')
  // Mit Begründung und Option „Ablehnen“: derselbe Dialog wie bisher (Veto im selben Dialog), Begründung übernommen.
  document.getElementById('wf-entscheidung-begruendung').value = 'Zu riskant.'
  klicke('workflow-entscheidung', '.wf-aktion', { aktion: 'freigabe-bestaetigen', workflowId: 'w-1', option: 'ablehnen' })
  assert.equal(dialog.open, true)
  assert.equal(feld().value, 'Zu riskant.')
  assert.match(dialog.innerHTML, /data-aktion="ablehnen"/)
  assert.match(dialog.innerHTML, /data-empfehlung-ids="\[&quot;a&quot;\]"/, '„Anzeige = Start“: der Dialog trägt die angezeigte Empfehlung')
  // Der Stand ändert sich bei offenem Dialog → er schließt mit Hinweis (Kennzeichen beim Öffnen).
  detail.json = { ...detail.json, daten: { ...detail.json.daten, status: 'LAEUFT' }, naechster: { art: 'haltKlaerung', grund: 'läuft' } }
  await pollJetzt()
  await warte()
  assert.equal(dialog.open, false)
  assert.equal(meldung().textContent, 'Der Stand hat sich geändert — bitte erneut prüfen.')
  // Eine unbekannte Option öffnet nichts.
  await oeffneDetail()
  klicke('workflow-entscheidung', '.wf-aktion', { aktion: 'freigabe-bestaetigen', workflowId: 'w-1', option: 'freigeben-sofort' })
  assert.equal(dialog.open, false)
})

/** Schein-Links der Seitenleiste für die Nav-Markierung (F46 D2, cr 1 / qa 1). */
function scheinNav() {
  const link = (navView) => ({ dataset: { navView }, attr: {}, setAttribute(k, v) { this.attr[k] = v }, removeAttribute(k) { delete this.attr[k] } })
  const links = { runs: link('runs'), attention: link('attention') }
  const vorher = document.querySelectorAll
  document.querySelectorAll = (selektor) => (selektor === '#shell-nav [data-nav-view]' ? Object.values(links) : vorher(selektor))
  return { links, aufraeumen: () => (document.querySelectorAll = vorher) }
}

test('F46 D2: Nav-Markierung — „Entscheidungen“ auf der Seite Entscheiden, auch beim zweiten Besuch; nie von einer fremden Route aus', async () => {
  const { links, aufraeumen } = scheinNav()
  try {
    await oeffneDetail()
    assert.equal(links.attention.attr['aria-current'], 'page')
    assert.equal(links.runs.attr['aria-current'], undefined)
    // Der Router markiert beim erneuten Betreten „Ausführungen“ (View runs) — derselbe Modus muss trotzdem neu markieren.
    links.runs.attr['aria-current'] = 'page'
    delete links.attention.attr['aria-current']
    location.hash = '#/workflows/w-1'
    dispatch()
    await warte()
    assert.equal(links.attention.attr['aria-current'], 'page', 'zweiter Besuch: wieder „Entscheidungen“')
    assert.equal(links.runs.attr['aria-current'], undefined)
    // Auf einer fremden Route lädt der Auffrischer das Detail weiter — die Markierung bleibt unangetastet.
    links.attention.attr = {}
    links.runs.attr = {}
    location.hash = '#/dashboard'
    await pollJetzt()
    await warte()
    assert.deepEqual([links.attention.attr, links.runs.attr], [{}, {}], 'keine Markierung von außerhalb der Detailroute')
  } finally {
    aufraeumen()
    location.hash = '#/runs'
    dispatch()
  }
})

test('F46 D2: die Begründung wandert zwischen Spalte und Freigabedialog (Nachbesserung im Dialog geht beim Schließen nicht verloren)', async () => {
  await oeffneDetail()
  const spalte = document.getElementById('wf-entscheidung-begruendung')
  spalte.value = 'Erste Fassung.'
  klicke('workflow-entscheidung', '.wf-aktion', { aktion: 'freigabe-bestaetigen', workflowId: 'w-1', option: 'freigeben' })
  assert.equal(dialog.open, true)
  assert.equal(feld().value, 'Erste Fassung.')
  feld().value = 'Im Dialog nachgebessert.'
  klicke('workflow-dialog', '.wf-dialog-abbrechen', {})
  assert.equal(dialog.open, false)
  assert.equal(spalte.value, 'Im Dialog nachgebessert.', 'Abbrechen schreibt die Nachbesserung in die Spalte zurück')
  // Der Knopf „Nächsten Schritt freigeben“ unter dem Weg nimmt den Text der Spalte ebenfalls mit.
  feld().value = ''
  oeffneFreigabe()
  assert.equal(feld().value, 'Im Dialog nachgebessert.')
  klicke('workflow-dialog', '.wf-dialog-abbrechen', {})
  spalte.value = ''
})
