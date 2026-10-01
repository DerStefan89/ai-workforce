/**
 * Datei: public/leitstand/views/runs-dialog.test.mjs
 *
 * Zweck: node:test-Fälle für die Bedienung der Ausführungen (F44 WS-5a, views/runs.js): der Dialog
 * #lauf-dialog ist während einer Anfrage gesperrt (genau ein POST; Escape, „Abbrechen“ und erneutes
 * Öffnen wirken nicht), Pflichtangaben melden sich im Dialog, ein 400 bleibt im offenen Dialog,
 * Erfolg schließt ihn und lädt Aggregat und Detail neu; eine späte Antwort zu einem inzwischen anderen
 * Lauf oder Projekt wird verworfen (F-860); ein geänderter Stand (Aktualisieren, Kenntnisnahme im
 * Aggregat) schließt einen offenen Dialog; der Abbruch schickt keinen Grund; die Liste wird nur bei
 * geändertem HTML geschrieben.
 *
 * Die echten Module laufen gegen ein minimales Schein-DOM und ein aufzeichnendes fetch — kein Browser,
 * kein Server (Muster views/workflows-dialog.test.mjs).
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 *
 * Wichtig: Die Globals müssen VOR dem Import stehen (projekt-kontext.js liest sessionStorage beim Laden).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'

/**
 * Schein-Element mit den DOM-Methoden, die views/runs.js benutzt.
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
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    addEventListener(typ, fn) {
      this.handler[typ] = fn
    },
    setAttribute() {},
    removeAttribute() {},
    querySelector: () => null,
    querySelectorAll: () => [],
    contains: () => false,
    appendChild() {},
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
  createElement: () => scheinElement(),
  activeElement: null,
}
globalThis.Element = class {}
Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true, writable: true })
/** hashchange-Zuhörer der Views (runs.js) — wechsleHash ruft sie wie der Browser vor dem Router auf. */
const hashZuhoerer = []
globalThis.addEventListener = (typ, fn) => {
  if (typ === 'hashchange') hashZuhoerer.push(fn)
}
Object.defineProperty(globalThis, 'location', { value: { hash: '#/ausfuehrungen' }, configurable: true, writable: true })
Object.defineProperty(globalThis, 'history', { value: { state: null, replaceState: (_z, _t, url) => (location.hash = url), back() {} }, configurable: true, writable: true })
Object.defineProperty(globalThis, 'sessionStorage', { value: speicher(), configurable: true, writable: true })
Object.defineProperty(globalThis, 'localStorage', { value: speicher(), configurable: true, writable: true })

/** Schein-Dialog: showModal/close setzen open; close löst wie im Browser das close-Ereignis aus. */
const dialog = document.getElementById('lauf-dialog')
dialog.showModal = () => {
  dialog.open = true
}
dialog.close = () => {
  dialog.open = false
  dialog.handler.close?.()
}

/** Laufliste schreibt mit — zählt, wie oft der Poll #laeufe wirklich neu schreibt. */
let listenSchreibungen = 0
let listenHtml = ''
Object.defineProperty(document.getElementById('laeufe'), 'innerHTML', {
  get: () => listenHtml,
  set: (wert) => {
    listenSchreibungen += 1
    listenHtml = wert
  },
})

const FEHLGESCHLAGEN = { status: 'ABGESCHLOSSEN', ergebnis: 'FEHLGESCHLAGEN', terminalSequenz: 2 }
const detailVon = (laufId, felder = {}) => ({
  laufId,
  checkpoints: [{ sequenz: 1, zeitstempel: '2026-10-01T10:00:00.000Z', gueltig: true, typ: 'wirkungsmarke', wirkungsmarke: { art: 'run_prepared' } }],
  laufStatus: FEHLGESCHLAGEN,
  aktiv: false,
  verweigertDaten: null,
  kontextpaket: { status: 'nicht_vorhanden' },
  auftrag: { status: 'kein_auftragsbezug' },
  laufakte: { status: 'nicht_vorhanden' },
  rohstrom: { status: 'laufakte_fehlt' },
  ...felder,
})

/** Antworten von GET /api/laeufe/<laufId> je laufId — die Tests schalten sie um. */
const details = new Map()
/** zustand.laeufe — die Tests schalten kenntnisgenommen um. */
let aggregatLaeufe = []
/** Zurückgehaltene POST-Antworten: null = sofort, sonst Liste der Freigeber. */
let postHalt = null
let postStatus = 200
const posts = []
const detailAbrufe = []
let zustandAbrufe = 0

globalThis.fetch = (url, optionen = {}) => {
  const pfad = String(url)
  if ((optionen.method ?? 'GET') === 'POST') {
    posts.push({ pfad, koerper: optionen.body === undefined ? undefined : JSON.parse(optionen.body) })
    const status = postStatus
    const antwort = () => ({ ok: status < 300, status, json: async () => (status < 300 ? { ok: true } : { grund: "art 'kenntnisnahme' ist hier nicht erlaubt" }) })
    if (postHalt !== null) return new Promise((ok) => postHalt.push(() => ok(antwort())))
    return Promise.resolve(antwort())
  }
  if (pfad.endsWith('/zustand')) {
    zustandAbrufe += 1
    return Promise.resolve({ ok: true, status: 200, json: async () => ({ laeufe: aggregatLaeufe, startfehler: [], workflows: [], fehler: [], aktiverLauf: { aktiv: false, laufId: null } }) })
  }
  const treffer = pfad.match(/\/laeufe\/([^/?]+)$/)
  if (treffer) {
    const laufId = decodeURIComponent(treffer[1])
    detailAbrufe.push(laufId)
    const json = details.get(laufId)
    return Promise.resolve(json === undefined ? { ok: false, status: 404, json: async () => ({ grund: `Lauf '${laufId}' nicht gefunden` }) } : { ok: true, status: 200, json: async () => json })
  }
  return Promise.resolve({ ok: true, status: 200, json: async () => ({}) })
}

const warte = () => new Promise((ok) => setTimeout(ok, 20))

const { initRunsView } = await import('./runs.js')
const { dispatch } = await import('../router.js')
const { pollJetzt } = await import('../zustand.js')
const { holeAktivesProjekt, setzeAktivesProjekt } = await import('../projekt-kontext.js')
initRunsView()
const STARTPROJEKT = holeAktivesProjekt()
// views/projekt.js liest beim Vorbelegen die Optionen der Auftragsauswahl.
document.getElementById('start-auftrag').options = []

/** Wechselt den Hash wie der Browser: erst die hashchange-Zuhörer der Views, dann der Router. @param hash - Ziel */
function wechsleHash(hash) {
  location.hash = hash
  for (const fn of hashZuhoerer) fn()
  dispatch()
}

const meldung = () => document.getElementById('lauf-meldung')
const dialogMeldung = () => document.getElementById('lauf-dialog-meldung')

/** Klick auf eine Aktion der Notiz (Delegation über closest). @param aktion - data-aktion */
function klickeNotiz(aktion) {
  document.getElementById('lauf-notiz').handler.click({ target: { closest: (s) => (s === '.lauf-aktion' ? { dataset: { aktion }, disabled: false } : null) } })
}
/** Klick auf die Hauptaktion im Dialog. @param aktion - data-aktion */
function klickeDialog(aktion) {
  dialog.handler.click({ target: { closest: (s) => (s === '.lauf-dialog-aktion' ? { dataset: { aktion } } : null) } })
}
/** Klick auf „Abbrechen“ im Dialog. */
function klickeDialogAbbrechen() {
  dialog.handler.click({ target: { closest: (s) => (s === '.lauf-dialog-abbrechen' ? {} : null) } })
}

/** Öffnet das Detail eines Laufs frisch (Route #/runs/<laufId>). @param laufId - Kennung @param detail - GET-Antwort */
async function oeffneLauf(laufId, detail = detailVon(laufId)) {
  details.set(laufId, detail)
  postHalt = null
  postStatus = 200
  location.hash = '#/ausfuehrungen'
  dispatch()
  location.hash = `#/runs/${laufId}`
  dispatch()
  await warte()
}

/** Öffnet den Kenntnisnahme-Dialog und trägt eine Begründung ein. @param text - Begründung */
function oeffneKenntnisnahme(text = 'gesehen') {
  klickeNotiz('kenntnisnahme-oeffnen')
  document.getElementById('entscheidung-kenntnisnahme-begruendung').value = text
}

test('Kenntnisnahme: während der Anfrage gesperrt (genau ein POST, Escape/Abbrechen/Wiederöffnen wirkungslos); Erfolg schließt, lädt Aggregat und Detail neu', async () => {
  await oeffneLauf('l-1')
  oeffneKenntnisnahme()
  assert.equal(dialog.open, true)
  assert.match(dialog.innerHTML, /Fehler zur Kenntnis nehmen/)
  posts.length = 0
  postHalt = []
  klickeDialog('kenntnisnahme')
  klickeDialog('kenntnisnahme')
  await warte()
  assert.equal(posts.length, 1, 'genau ein POST')
  assert.deepEqual(posts[0].koerper, { art: 'kenntnisnahme', laufId: 'l-1', begruendung: 'gesehen' })
  let verhindert = false
  dialog.handler.cancel({ preventDefault: () => (verhindert = true) })
  assert.equal(verhindert, true, 'Escape schließt während der Anfrage nicht')
  klickeDialogAbbrechen()
  assert.equal(dialog.open, true, '„Abbrechen“ schließt während der Anfrage nicht')
  const vorher = dialog.innerHTML
  klickeNotiz('kenntnisnahme-oeffnen')
  assert.equal(dialog.innerHTML, vorher, 'kein neuer Dialog während der Anfrage')

  const abrufeVorher = detailAbrufe.length
  const zustandVorher = zustandAbrufe
  postHalt.shift()()
  await warte()
  assert.equal(dialog.open, false)
  assert.equal(meldung().hidden, false)
  assert.equal(meldung().textContent, 'Entscheidung gespeichert.')
  assert.equal(meldung().className, 'erfolg')
  assert.ok(zustandAbrufe > zustandVorher, 'pollJetzt nach Erfolg')
  assert.ok(detailAbrufe.length > abrufeVorher, 'Detail neu geladen')
  assert.equal(document.activeElement, meldung(), 'Fokus auf der Meldung')
})

test('Pflichtbegründung leer → kein POST, Meldung im Dialog; ein 400 bleibt im offenen Dialog', async () => {
  await oeffneLauf('l-1')
  oeffneKenntnisnahme('   ')
  posts.length = 0
  klickeDialog('kenntnisnahme')
  await warte()
  assert.equal(posts.length, 0)
  assert.equal(dialogMeldung().hidden, false)
  assert.equal(dialogMeldung().textContent, 'Bitte gib eine Begründung an.')
  document.getElementById('entscheidung-kenntnisnahme-begruendung').value = 'jetzt mit Grund'
  postStatus = 400
  klickeDialog('kenntnisnahme')
  await warte()
  assert.equal(posts.length, 1)
  assert.equal(dialog.open, true, 'der Dialog bleibt offen')
  assert.match(dialogMeldung().textContent, /^400: art 'kenntnisnahme' ist hier nicht erlaubt/)
  klickeDialogAbbrechen()
  assert.equal(dialog.open, false)
})

test('Späte Antwort nach einem Laufwechsel wird verworfen — keine Meldung von A unter B, der Dialog von B bleibt offen', async () => {
  await oeffneLauf('l-1')
  oeffneKenntnisnahme()
  postHalt = []
  klickeDialog('kenntnisnahme')
  await warte()
  details.set('l-2', detailVon('l-2'))
  location.hash = '#/runs/l-2'
  dispatch()
  await warte()
  assert.equal(dialog.open, false, 'der Laufwechsel schließt den Dialog von A')
  oeffneKenntnisnahme('für B')
  assert.equal(dialog.open, true, 'die Sperre von A blockiert B nicht')
  const freigeber = postHalt.shift()
  postHalt = null
  freigeber()
  await warte()
  assert.equal(dialog.open, true, 'die späte Antwort von A schließt den Dialog von B nicht')
  assert.equal(meldung().hidden, true, 'keine Meldung von A unter B')
  klickeDialogAbbrechen()
})

test('Projektwechsel (F-860): Dialog zu, Hash ohne neuen Eintrag auf #/ausfuehrungen, die späte Antwort wird verworfen', async () => {
  await oeffneLauf('l-1')
  oeffneKenntnisnahme()
  postHalt = []
  klickeDialog('kenntnisnahme')
  await warte()
  setzeAktivesProjekt({ id: 'anderes-projekt', name: 'Anderes Projekt' })
  assert.equal(dialog.open, false)
  assert.equal(location.hash, '#/ausfuehrungen')
  const abrufe = detailAbrufe.length
  postHalt.shift()()
  postHalt = null
  await warte()
  assert.equal(meldung().hidden, true, 'keine Meldung im neuen Projekt')
  assert.equal(detailAbrufe.length, abrufe, 'kein Nachladen des alten Laufs')
  setzeAktivesProjekt(STARTPROJEKT)
  await warte()
})

test('Geänderter Stand schließt einen offenen Dialog: über „Aktualisieren“ und über kenntnisgenommen im Aggregat', async () => {
  await oeffneLauf('l-1')
  oeffneKenntnisnahme()
  details.set('l-1', detailVon('l-1', { laufStatus: { status: 'KLAERUNG_ERFORDERLICH', grund: 'x', blockerId: 'b', evidenz: { offeneRunPreparedSequenzen: [] } } }))
  klickeNotiz('aktualisieren')
  await warte()
  assert.equal(dialog.open, false)
  assert.equal(meldung().textContent, 'Der Stand hat sich geändert — bitte erneut prüfen.')

  await oeffneLauf('l-1')
  oeffneKenntnisnahme()
  aggregatLaeufe = [{ laufId: 'l-1', laufStatus: FEHLGESCHLAGEN, ergebnis: 'FEHLGESCHLAGEN', zeitpunkt: null, auftragsbezug: null, anzahlCheckpoints: 1, kettenintegritaet: true, kenntnisgenommen: true }]
  await pollJetzt()
  await warte()
  assert.equal(dialog.open, false, 'Kenntnisnahme aus einem anderen Tab schließt den Dialog')
  assert.doesNotMatch(document.getElementById('lauf-notiz').innerHTML, /kenntnisnahme-oeffnen/)
  klickeNotiz('kenntnisnahme-oeffnen')
  assert.equal(dialog.open, false, 'schon zur Kenntnis genommen: kein Dialog')
  aggregatLaeufe = []
  await pollJetzt()
})

test('Lauf abbrechen (G9): Bestätigung ohne Grundfeld, POST …/abbrechen ohne Körper, danach Meldung', async () => {
  await oeffneLauf('l-3', detailVon('l-3', { aktiv: true, laufStatus: { status: 'KLAERUNG_ERFORDERLICH', grund: 'RUN_PREPARED ohne Terminalartefakt', blockerId: 'b', evidenz: { offeneRunPreparedSequenzen: [1] } } }))
  assert.match(document.getElementById('lauf-notiz').innerHTML, /data-aktion="abbrechen-oeffnen"/)
  klickeNotiz('kenntnisnahme-oeffnen')
  assert.equal(dialog.open, false, 'keine Kenntnisnahme, solange der Lauf läuft (F-828)')
  klickeNotiz('abbrechen-oeffnen')
  assert.equal(dialog.open, true)
  assert.doesNotMatch(dialog.innerHTML, /<textarea/)
  posts.length = 0
  klickeDialog('abbrechen')
  await warte()
  assert.equal(posts.length, 1)
  assert.match(posts[0].pfad, /\/laeufe\/l-3\/abbrechen$/)
  assert.equal(posts[0].koerper, undefined)
  assert.equal(dialog.open, false)
  assert.equal(meldung().textContent, 'Abbruch angefordert.')
})

test('Liste: der Poll schreibt #laeufe nur bei geändertem HTML', async () => {
  aggregatLaeufe = [{ laufId: 'l-9', laufStatus: FEHLGESCHLAGEN, ergebnis: 'FEHLGESCHLAGEN', zeitpunkt: null, auftragsbezug: { titel: 'Neu' }, anzahlCheckpoints: 1, kettenintegritaet: true, kenntnisgenommen: false }]
  await pollJetzt()
  const vorher = listenSchreibungen
  await pollJetzt()
  await pollJetzt()
  assert.equal(listenSchreibungen, vorher, 'gleicher Stand → kein Neuschreiben')
  aggregatLaeufe = [{ ...aggregatLaeufe[0], kenntnisgenommen: true }]
  await pollJetzt()
  assert.equal(listenSchreibungen, vorher + 1)
  assert.match(listenHtml, /Zur Kenntnis genommen/)
})

test('Abbruch angefordert: solange der Lauf aktiv bleibt, steht der Knopf gesperrt da, der Dialog öffnet nicht erneut', async () => {
  // Fortsetzung des vorigen Abbruch-Tests: das Detail wurde nach dem 200 neu geladen und ist weiter aktiv.
  assert.match(document.getElementById('lauf-notiz').innerHTML, /data-aktion="abbrechen-oeffnen" disabled>Abbruch angefordert</)
  klickeNotiz('abbrechen-oeffnen')
  assert.equal(dialog.open, false)
  details.set('l-3', detailVon('l-3', { aktiv: false, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'FEHLGESCHLAGEN' } }))
  klickeNotiz('aktualisieren')
  await warte()
  assert.doesNotMatch(document.getElementById('lauf-notiz').innerHTML, /Abbruch angefordert/, 'nach dem Ende verschwindet die Marke')
})

test('Lauf A → B → A während einer Anfrage: die alte Antwort von A wird verworfen (Generation)', async () => {
  await oeffneLauf('l-1')
  oeffneKenntnisnahme()
  postHalt = []
  klickeDialog('kenntnisnahme')
  await warte()
  details.set('l-2', detailVon('l-2'))
  location.hash = '#/runs/l-2'
  dispatch()
  await warte()
  location.hash = '#/runs/l-1'
  dispatch()
  await warte()
  oeffneKenntnisnahme('zweiter Versuch')
  const freigeber = postHalt.shift()
  postHalt = null
  freigeber()
  await warte()
  assert.equal(dialog.open, true, 'der neue Dialog von A bleibt offen')
  assert.equal(meldung().hidden, true, 'keine Meldung aus der alten Anfrage')
  klickeDialogAbbrechen()
})

test('Verlassen der View (#/dashboard) schließt das Detail: späte Antwort verworfen, „← Alle“ greift nicht auf einen alten Verlauf zurück', async () => {
  await oeffneLauf('l-1')
  oeffneKenntnisnahme()
  postHalt = []
  klickeDialog('kenntnisnahme')
  await warte()
  wechsleHash('#/dashboard')
  assert.equal(dialog.open, false)
  const abrufe = detailAbrufe.length
  postHalt.shift()()
  postHalt = null
  await warte()
  assert.equal(detailAbrufe.length, abrufe, 'kein Nachladen nach dem Verlassen')
  assert.equal(meldung().hidden, true)
})

test('Fortsetzung vorbereiten (G7): frisches Detail, dann #/projekt und Vorbelegung über wendeWiederaufnahmeAn; ein 404 steht als Meldung am Lauf (Fokus), ein Laufwechsel verwirft die Antwort', async () => {
  await oeffneLauf('l-1')
  const abrufe = detailAbrufe.length
  klickeNotiz('fortsetzung')
  await warte()
  assert.equal(detailAbrufe.length, abrufe + 1, 'das Detail wird frisch geladen')
  assert.equal(document.getElementById('start-wiederaufnahme-laufid').textContent, 'l-1', 'Vorbelegung mit der Vorgänger-laufId')
  assert.equal(document.getElementById('start-wiederaufnahme-hinweis').hidden, false)

  await oeffneLauf('l-4')
  details.delete('l-4')
  klickeNotiz('fortsetzung')
  await warte()
  assert.equal(meldung().hidden, false)
  assert.match(meldung().textContent, /^Vorbelegung fehlgeschlagen \(404\): Lauf 'l-4' nicht gefunden/)
  assert.equal(document.activeElement, meldung())

  await oeffneLauf('l-5')
  document.getElementById('start-wiederaufnahme-laufid').textContent = ''
  klickeNotiz('fortsetzung')
  location.hash = '#/runs/l-1'
  dispatch()
  await warte()
  assert.equal(document.getElementById('start-wiederaufnahme-laufid').textContent, '', 'späte Antwort zu l-5 belegt nichts vor')
})
