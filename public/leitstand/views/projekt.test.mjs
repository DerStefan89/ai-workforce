/**
 * Datei: public/leitstand/views/projekt.test.mjs
 *
 * Zweck: node:test-Fälle für `#/projekt` „Auftrag & Direktstart“ (F44 WS-5b, Abgleich F-725 F1,
 * G10, G11; E-F44-3 = A). Geprüft werden der Hauptweg „Ablauf vorbereiten“ (201 → 202 →
 * Aggregat-Treffer → Navigation zum Ablauf, Felder geleert), der Startfehler zu genau dieser laufId,
 * das 409 (D13) mit „Erneut versuchen“ ohne zweiten Auftrag, die Sperre (ein POST je Klick), der
 * Projektwechsel während des Wartens, der Kontext-Anhang, „Auftrag ohne Ablauf anlegen“ und die
 * Wiederaufnahme, die den Direktstart öffnet. Dazu das reine Modul views/auftrag-vorbereitung.js.
 *
 * Die echten Module laufen gegen ein minimales Schein-DOM und ein aufzeichnendes fetch — kein
 * Browser, kein Server. Das Zustands-Aggregat kommt über den echten einen Poll (pollJetzt).
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 *
 * Wichtig: Die Globals müssen VOR dem Import der Module stehen (projekt-kontext.js liest
 * sessionStorage beim Laden) — deshalb dynamische Importe.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'

/**
 * Schein-Element mit den DOM-Methoden, die views/projekt.js benutzt.
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
    placeholder: '',
    disabled: false,
    open: false,
    options: [],
    selectedIndex: -1,
    dataset: {},
    handler: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    addEventListener(typ, fn) {
      this.handler[typ] = fn
    },
    setAttribute() {},
    getAttribute: () => null,
    removeAttribute() {},
    querySelector: () => null,
    querySelectorAll: () => [],
    closest: () => null,
    contains: () => false,
    appendChild: (kind) => kind,
    insertAdjacentHTML(_ort, html) {
      this.innerHTML += html
    },
    remove() {},
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

globalThis.document = {
  getElementById(id) {
    if (!elemente.has(id)) elemente.set(id, scheinElement(id))
    return elemente.get(id)
  },
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => scheinElement(),
  addEventListener() {},
  documentElement: scheinElement('html'),
  head: scheinElement('head'),
  body: scheinElement('body'),
  activeElement: null,
}
Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true, writable: true })
globalThis.addEventListener = () => {}
Object.defineProperty(globalThis, 'location', { value: { hash: '#/projekt' }, configurable: true, writable: true })
Object.defineProperty(globalThis, 'history', { value: { state: null, replaceState() {}, back() {} }, configurable: true, writable: true })
Object.defineProperty(globalThis, 'sessionStorage', { value: speicher(), configurable: true, writable: true })
Object.defineProperty(globalThis, 'localStorage', { value: speicher(), configurable: true, writable: true })

/** Aufgezeichnete schreibende Anfragen: { methode, url, koerper }. */
const schreibend = []
/** Antworten je `<METHODE> <url>` als Warteschlange [{ status, json }]; der letzte Eintrag bleibt stehen. */
const antworten = new Map()
/** Zurückgehaltene Antworten je `<METHODE> <url>`: Liste der Freigaben. */
const zurueckgehalten = new Map()
/** Anfragen, deren fetch mit einem Netzfehler scheitert (`<METHODE> <url>`). */
const netzfehler = new Set()
/** Aggregat, das GET …/zustand liefert (Tests setzen es). */
let aggregat = { laeufe: [], startfehler: [], workflows: [], fehler: [], aktiverLauf: { aktiv: false, laufId: null } }
/** Aufträge, die GET …/auftraege liefert. */
let auftraege = []

globalThis.fetch = (url, optionen = {}) => {
  const methode = optionen.method ?? 'GET'
  const schluessel = `${methode} ${url}`
  if (methode !== 'GET') schreibend.push({ methode, url: String(url), koerper: optionen.body === undefined ? undefined : JSON.parse(optionen.body) })
  if (netzfehler.has(schluessel)) return Promise.reject(new Error('Netz weg'))
  let antwort
  const warteschlange = antworten.get(schluessel)
  if (warteschlange !== undefined) {
    const { status, json } = warteschlange.length > 1 ? warteschlange.shift() : warteschlange[0]
    antwort = { ok: status >= 200 && status < 300, status, json: async () => json }
  } else if (String(url).endsWith('/zustand')) antwort = { ok: true, status: 200, json: async () => aggregat }
  else if (String(url).endsWith('/auftraege')) antwort = { ok: true, status: 200, json: async () => auftraege }
  else if (String(url).endsWith('/startvorlage/werkzeugsaetze')) antwort = { ok: true, status: 200, json: async () => [{ name: 'lesen', erlaubte_werkzeuge: ['Read'] }] }
  else antwort = { ok: true, status: 200, json: async () => ({}) }
  const halt = zurueckgehalten.get(schluessel)
  if (halt !== undefined) return new Promise((ok) => halt.push(() => ok(antwort)))
  return Promise.resolve(antwort)
}

/** Lässt alle anstehenden Promise-Ketten durchlaufen. */
const warte = () => new Promise((ok) => setTimeout(ok, 20))

const { setzeAktivesProjekt } = await import('../projekt-kontext.js')
const { registriere } = await import('../router.js')
const { pollJetzt } = await import('../zustand.js')
const { initProjektView, wendeWiederaufnahmeAn } = await import('./projekt.js')
const { baueAuftragstext, pruefeAggregat, renderVorbereitung } = await import('./auftrag-vorbereitung.js')

/** Ziele, zu denen der Router navigiert wurde (Route `#/workflows/<id>`). */
const navigiert = []
registriere(/^#\/workflows\/([^/]+)$/, 'runs', (id) => navigiert.push(id))
registriere(/^#\/projekt$/, 'projekt')
registriere(/^#\/runs$/, 'runs')

initProjektView()
await warte()

const el = (id) => document.getElementById(id)

/** Setzt die Seite auf einen sauberen Ausgangszustand: Schritt 1, Felder gefüllt, keine Aufzeichnungen. */
async function ausgangslage({ titel = 'Login reparieren', ergebnis = 'Login geht wieder', kontext = '' } = {}) {
  location.hash = '#/projekt'
  // „Neuen Auftrag beschreiben“ beendet eine Vorbereitung aus einem früheren Test (und leert die Felder).
  el('auftrag-vorbereitung').handler.click?.({ target: { closest: () => ({ dataset: { aktion: 'neu' } }) } })
  el('auftrag-titel').value = titel
  el('auftrag-auftragstext').value = ergebnis
  el('auftrag-kontext').value = kontext
  aggregat = { laeufe: [], startfehler: [], workflows: [], fehler: [], aktiverLauf: { aktiv: false, laufId: null } }
  schreibend.length = 0
  netzfehler.clear()
  antworten.clear()
  zurueckgehalten.clear()
  navigiert.length = 0
  el('auftrag-anlegen-fehler').hidden = true
}

/** Löst „Ablauf vorbereiten“ aus (Submit des Formulars). */
function absenden() {
  el('auftrag-formular').handler.submit({ preventDefault() {} })
}

/** Klick auf einen Knopf der Notiz. @param aktion - data-aktion */
function klickeNotiz(aktion) {
  el('auftrag-vorbereitung').handler.click({ target: { closest: () => ({ dataset: { aktion } }) } })
}

const anzahl = (methode, endung) => schreibend.filter((a) => a.methode === methode && a.url.endsWith(endung)).length

test('Hauptweg: 201 → routen → 202 (Schritt 2 mit Auftrag und laufId) → Ablauf im Aggregat → Navigation, Felder geleert', async () => {
  await ausgangslage({ kontext: 'Nur Web' })
  antworten.set('POST /api/auftraege', [{ status: 201, json: { auftragId: 'a-1' } }])
  antworten.set('POST /api/auftraege/a-1/routen', [{ status: 202, json: { laufId: 'router-a-1-1' } }])
  absenden()
  await warte()
  assert.equal(anzahl('POST', '/auftraege'), 1)
  assert.equal(anzahl('POST', '/auftraege/a-1/routen'), 1)
  assert.deepEqual(schreibend[0].koerper, { titel: 'Login reparieren', auftragstext: 'Login geht wieder\n\nKontext:\nNur Web' })
  assert.equal(el('auftrag-formular').hidden, true, 'Schritt 2 ersetzt das Formular')
  assert.equal(el('auftrag-vorbereitung').hidden, false)
  assert.match(el('auftrag-vorbereitung').innerHTML, /Jarvis bereitet den Ablauf vor/)
  assert.match(el('auftrag-vorbereitung').innerHTML, /<code>a-1<\/code>/)
  assert.match(el('auftrag-vorbereitung').innerHTML, /<code>router-a-1-1<\/code>/)
  assert.equal(document.activeElement?.id, 'auftrag-vorbereitung-notiz', 'Fokus statt Live-Region')
  assert.equal(el('auftrag-titel').value, 'Login reparieren', 'Felder bleiben bis zum Erfolg')

  // Ein Tick ohne Treffer ändert nichts; erst der Ablauf router-a-1 beendet das Warten.
  await pollJetzt()
  assert.deepEqual(navigiert, [])
  aggregat = { ...aggregat, workflows: [{ workflowId: 'router-a-1', status: 'WARTET_FREIGABE' }] }
  await pollJetzt()
  assert.deepEqual(navigiert, ['router-a-1'], 'Freigabe auf #/workflows/<id> — keine zweite Freigabe-UI hier')
  assert.equal(location.hash, '#/workflows/router-a-1')
  assert.equal(el('auftrag-titel').value, '')
  assert.equal(el('auftrag-auftragstext').value, '')
  assert.equal(el('auftrag-kontext').value, '')
  assert.equal(el('auftrag-formular').hidden, false, 'beim nächsten Betreten wieder Schritt 1')
  assert.equal(anzahl('POST', '/auftraege'), 1, 'kein weiterer POST')
})

test('Startfehler zu genau dieser laufId → rote Notiz mit dem Fehler roh; ein Startfehler eines anderen Laufs bleibt folgenlos', async () => {
  await ausgangslage()
  antworten.set('POST /api/auftraege', [{ status: 201, json: { auftragId: 'a-2' } }])
  antworten.set('POST /api/auftraege/a-2/routen', [{ status: 202, json: { laufId: 'router-a-2-1' } }])
  absenden()
  await warte()
  aggregat = { ...aggregat, startfehler: [{ laufId: 'router-a-2-0', fehler: 'alter Fehler' }] }
  await pollJetzt()
  assert.doesNotMatch(el('auftrag-vorbereitung').innerHTML, /note red/)
  aggregat = { ...aggregat, startfehler: [...aggregat.startfehler, { laufId: 'router-a-2-1', fehler: 'Router <kaputt> & weg' }] }
  await pollJetzt()
  const html = el('auftrag-vorbereitung').innerHTML
  assert.match(html, /class="note red"/)
  assert.match(html, /Router &lt;kaputt&gt; &amp; weg/, 'Servertext roh, escaped')
  assert.match(html, /data-aktion="erneut"/)
  assert.deepEqual(navigiert, [])
})

test('409 beim Routen (D13) → bernsteinfarbene Notiz mit grund; „Erneut versuchen“ routet denselben Auftrag, ohne zweiten POST …/auftraege', async () => {
  await ausgangslage()
  antworten.set('POST /api/auftraege', [{ status: 201, json: { auftragId: 'a-3' } }])
  antworten.set('POST /api/auftraege/a-3/routen', [
    { status: 409, json: { grund: "ein anderer Lauf ('x') ist noch aktiv (D13)" } },
    { status: 202, json: { laufId: 'router-a-3-2' } },
  ])
  absenden()
  await warte()
  assert.match(el('auftrag-vorbereitung').innerHTML, /class="note amber"/)
  assert.match(el('auftrag-vorbereitung').innerHTML, /ein anderer Lauf \(&#39;x&#39;\) ist noch aktiv \(D13\)/, 'grund roh, escaped')
  klickeNotiz('erneut')
  await warte()
  assert.equal(anzahl('POST', '/auftraege'), 1, 'NIE ein zweiter Auftrag')
  assert.equal(anzahl('POST', '/auftraege/a-3/routen'), 2)
  assert.match(el('auftrag-vorbereitung').innerHTML, /<code>router-a-3-2<\/code>/)
})

test('Erneut versuchen nach einem 500 und nach einem Startfehler — nur neu routen', async () => {
  await ausgangslage()
  antworten.set('POST /api/auftraege', [{ status: 201, json: { auftragId: 'a-4' } }])
  antworten.set('POST /api/auftraege/a-4/routen', [
    { status: 500, json: { grund: 'ressourcen.json nicht lesbar' } },
    { status: 202, json: { laufId: 'router-a-4-2' } },
  ])
  absenden()
  await warte()
  assert.match(el('auftrag-vorbereitung').innerHTML, /class="note red"/)
  assert.match(el('auftrag-vorbereitung').innerHTML, /500: ressourcen.json nicht lesbar/)
  klickeNotiz('erneut')
  await warte()
  aggregat = { ...aggregat, startfehler: [{ laufId: 'router-a-4-2', fehler: 'Laufakte fehlt' }] }
  await pollJetzt()
  assert.match(el('auftrag-vorbereitung').innerHTML, /Laufakte fehlt/)
  antworten.set('POST /api/auftraege/a-4/routen', [{ status: 202, json: { laufId: 'router-a-4-3' } }])
  const halt = []
  zurueckgehalten.set('POST /api/auftraege/a-4/routen', halt)
  klickeNotiz('erneut')
  assert.doesNotMatch(el('auftrag-vorbereitung').innerHTML, /router-a-4-2/, 'während des neuen Versuchs keine laufId des gescheiterten')
  for (const freigeben of halt) freigeben()
  zurueckgehalten.clear()
  await warte()
  assert.equal(anzahl('POST', '/auftraege'), 1)
  assert.equal(anzahl('POST', '/auftraege/a-4/routen'), 3)
  assert.match(el('auftrag-vorbereitung').innerHTML, /<code>router-a-4-3<\/code>/)
})

test('Sperre: zwei schnelle Klicks während der Anfrage → genau ein POST …/auftraege; beide Anlege-Knöpfe gesperrt', async () => {
  await ausgangslage()
  const halt = []
  zurueckgehalten.set('POST /api/auftraege', halt)
  antworten.set('POST /api/auftraege', [{ status: 201, json: { auftragId: 'a-5' } }])
  antworten.set('POST /api/auftraege/a-5/routen', [{ status: 202, json: { laufId: 'router-a-5-1' } }])
  absenden()
  absenden()
  el('auftrag-anlegen').handler.click()
  assert.equal(el('auftrag-ablauf-vorbereiten').disabled, true)
  assert.equal(el('auftrag-anlegen').disabled, true)
  for (const freigeben of halt) freigeben()
  zurueckgehalten.clear()
  await warte()
  assert.equal(anzahl('POST', '/auftraege'), 1)
  assert.equal(el('auftrag-ablauf-vorbereiten').disabled, false)
})

test('Fehler beim Anlegen (≠ 201) → Fehler am Formular mit Fokus, Eingaben bleiben, kein Routen', async () => {
  await ausgangslage({ titel: '', ergebnis: 'ohne Titel' })
  antworten.set('POST /api/auftraege', [{ status: 400, json: { grund: 'titel fehlt' } }])
  absenden()
  await warte()
  assert.equal(el('auftrag-anlegen-fehler').hidden, false)
  assert.equal(el('auftrag-anlegen-fehler').textContent, '400: titel fehlt')
  assert.equal(document.activeElement?.id, 'auftrag-anlegen-fehler')
  assert.equal(el('auftrag-auftragstext').value, 'ohne Titel')
  assert.equal(el('auftrag-formular').hidden, false)
  assert.equal(anzahl('POST', '/routen'), 0)
  // Render-Nachweis WS-5b (Korrekturrunde): nach dem Fehler ist „Auftrag ohne Ablauf anlegen“ wieder frei.
  assert.equal(el('auftrag-anlegen').disabled, false)
  assert.equal(el('direktstart-anlegen-gesperrt').hidden, true)
})

test('Projektwechsel während des Wartens: Vorbereitung verworfen, Treffer und späte Antworten des alten Projekts ignoriert, Text bleibt', async () => {
  await ausgangslage({ titel: 'Mein Text', ergebnis: 'Mein Ergebnis' })
  antworten.set('POST /api/auftraege', [{ status: 201, json: { auftragId: 'a-6' } }])
  antworten.set('POST /api/auftraege/a-6/routen', [{ status: 202, json: { laufId: 'router-a-6-1' } }])
  absenden()
  await warte()
  assert.equal(el('auftrag-vorbereitung').hidden, false)
  setzeAktivesProjekt({ id: 'projekt-b', name: 'Projekt B' })
  await warte()
  assert.equal(el('auftrag-formular').hidden, false, 'zurück auf Schritt 1')
  assert.equal(el('auftrag-vorbereitung').hidden, true)
  assert.equal(el('auftrag-titel').value, 'Mein Text', 'Text gehört dem Menschen (F-885)')
  assert.equal(el('auftrag-auftragstext').value, 'Mein Ergebnis')
  aggregat = { ...aggregat, workflows: [{ workflowId: 'router-a-6', status: 'WARTET_FREIGABE' }] }
  await pollJetzt()
  assert.deepEqual(navigiert, [], 'kein Sprung in einen Ablauf des alten Projekts')

  // Späte Routen-Antwort nach dem Wechsel: wird verworfen.
  antworten.set('POST /api/projekte/projekt-b/auftraege', [{ status: 201, json: { auftragId: 'b-1' } }])
  const halt = []
  zurueckgehalten.set('POST /api/projekte/projekt-b/auftraege/b-1/routen', halt)
  antworten.set('POST /api/projekte/projekt-b/auftraege/b-1/routen', [{ status: 202, json: { laufId: 'router-b-1-1' } }])
  absenden()
  await warte()
  setzeAktivesProjekt({ id: 'ai-workforce', name: 'AI Workforce' })
  document.activeElement = null
  for (const freigeben of halt) freigeben()
  await warte()
  assert.equal(document.activeElement, null, 'die späte Antwort verschiebt keinen Fokus')
  assert.equal(el('auftrag-vorbereitung').hidden, true, 'die späte Antwort aus Projekt B zeigt nichts an')
  assert.doesNotMatch(el('auftrag-vorbereitung').innerHTML, /router-b-1-1/)
})

test('Ablauf erscheint, während der Nutzer woanders ist → kein Sprung; beim Zurückkommen „Der Ablauf ist vorbereitet“ mit Link', async () => {
  await ausgangslage()
  antworten.set('POST /api/auftraege', [{ status: 201, json: { auftragId: 'a-7' } }])
  antworten.set('POST /api/auftraege/a-7/routen', [{ status: 202, json: { laufId: 'router-a-7-1' } }])
  absenden()
  await warte()
  location.hash = '#/dashboard'
  aggregat = { ...aggregat, workflows: [{ workflowId: 'router-a-7', status: 'WARTET_FREIGABE' }] }
  await pollJetzt()
  assert.deepEqual(navigiert, [])
  assert.equal(location.hash, '#/dashboard')
  assert.match(el('auftrag-vorbereitung').innerHTML, /Der Ablauf ist vorbereitet/)
  assert.match(el('auftrag-vorbereitung').innerHTML, /href="#\/workflows\/router-a-7"/)
  assert.equal(el('auftrag-titel').value, '')
})

test('„Auftrag ohne Ablauf anlegen“: Titel/Ergebnis/Kontext von oben, POST …/auftraege, Auswahl neu geladen und neuer Auftrag gewählt, kein Routen', async () => {
  await ausgangslage({ titel: 'Nur anlegen', ergebnis: 'Text', kontext: 'Hintergrund' })
  antworten.set('POST /api/auftraege', [{ status: 201, json: { auftragId: 'a-8' } }])
  auftraege = [
    { auftragId: 'a-0', titel: 'Alt', erstellt_am: 'x' },
    { auftragId: 'a-8', titel: 'Nur anlegen', erstellt_am: 'y' },
  ]
  el('start-auftrag').value = 'a-0'
  await el('auftrag-anlegen').handler.click()
  await warte()
  assert.deepEqual(schreibend[0].koerper, { titel: 'Nur anlegen', auftragstext: 'Text\n\nKontext:\nHintergrund' })
  assert.equal(anzahl('POST', '/routen'), 0)
  assert.match(el('start-auftrag').innerHTML, /value="a-8"/)
  assert.equal(el('start-auftrag').value, 'a-8', 'der neue Auftrag ist gewählt')
  assert.equal(el('auftrag-titel').value, '')
  assert.equal(el('auftrag-formular').hidden, false, 'kein Schritt 2')
  auftraege = []
})

test('Wiederaufnahme öffnet #direktstart und legt den Fokus auf ihn; Vorbelegung unverändert', async () => {
  await ausgangslage()
  el('direktstart').open = false
  auftraege = [{ auftragId: 'a-9', titel: 'Vorgänger', erstellt_am: 'x' }]
  await wendeWiederaufnahmeAn({ auftrag: { status: 'ok', auftragId: 'a-9' }, kontextpaket: { status: 'fehlt' } }, 'lauf-alt')
  assert.equal(el('direktstart').open, true)
  assert.equal(document.activeElement?.id, 'direktstart-titel')
  assert.equal(el('start-wiederaufnahme-hinweis').hidden, false)
  assert.equal(el('start-wiederaufnahme-laufid').textContent, 'lauf-alt')
  assert.equal(el('start-auftrag').value, 'a-9')
  auftraege = []
})

test('Direktstart: POST …/laeufe unverändert (rolle/budget/modell fest, vorgaengerLaufId aus der Wiederaufnahme)', async () => {
  await ausgangslage()
  auftraege = [{ auftragId: 'a-9', titel: 'Vorgänger', erstellt_am: 'x' }]
  await wendeWiederaufnahmeAn({ auftrag: { status: 'ok', auftragId: 'a-9' }, kontextpaket: { status: 'fehlt' } }, 'lauf-alt')
  auftraege = []
  schreibend.length = 0
  el('start-auftrag').value = 'a-9'
  el('start-werkzeugsatz').value = 'lesen'
  el('start-laufid').value = 'mein-lauf'
  antworten.set('POST /api/laeufe', [{ status: 202, json: { laufId: 'mein-lauf' } }])
  await el('start-starten').handler.click()
  assert.deepEqual(schreibend[0].koerper, { laufId: 'mein-lauf', rolle: 'ausfuehrung', anfragen: [], budget: {}, aufrufEingaben: { modell: 'sonnet' }, werkzeugsatz: 'lesen', auftragId: 'a-9', vorgaengerLaufId: 'lauf-alt' })
  assert.match(el('start-erfolg').textContent, /mein-lauf/)
  assert.equal(el('start-wiederaufnahme-hinweis').hidden, true)
})

test('Netzfehler beim Routen → rote Notiz mit „Erneut versuchen“; Netzfehler beim Anlegen → Fehler am Formular', async () => {
  await ausgangslage()
  antworten.set('POST /api/auftraege', [{ status: 201, json: { auftragId: 'a-10' } }])
  netzfehler.add('POST /api/auftraege/a-10/routen')
  absenden()
  await warte()
  assert.match(el('auftrag-vorbereitung').innerHTML, /class="note red"/)
  assert.match(el('auftrag-vorbereitung').innerHTML, /Anfrage fehlgeschlagen: Netz weg/)
  assert.match(el('auftrag-vorbereitung').innerHTML, /data-aktion="erneut"/)
  netzfehler.clear()
  antworten.set('POST /api/auftraege/a-10/routen', [{ status: 202, json: { laufId: 'router-a-10-1' } }])
  klickeNotiz('erneut')
  await warte()
  assert.equal(anzahl('POST', '/auftraege'), 1)
  assert.match(el('auftrag-vorbereitung').innerHTML, /<code>router-a-10-1<\/code>/)

  await ausgangslage({ titel: 'Netz', ergebnis: 'bleibt' })
  netzfehler.add('POST /api/auftraege')
  absenden()
  await warte()
  assert.equal(el('auftrag-anlegen-fehler').textContent, 'Anfrage fehlgeschlagen: Netz weg')
  assert.equal(el('auftrag-auftragstext').value, 'bleibt')
  assert.equal(anzahl('POST', '/routen'), 0)
})

test('404 beim Routen: kein „Erneut versuchen“ (wird nicht besser), nur „Neuen Auftrag beschreiben“', async () => {
  await ausgangslage()
  antworten.set('POST /api/auftraege', [{ status: 201, json: { auftragId: 'a-11' } }])
  antworten.set('POST /api/auftraege/a-11/routen', [{ status: 404, json: { grund: "Auftrag 'a-11' nicht gefunden" } }])
  absenden()
  await warte()
  const html = el('auftrag-vorbereitung').innerHTML
  assert.match(html, /404: Auftrag &#39;a-11&#39; nicht gefunden/)
  assert.doesNotMatch(html, /data-aktion="erneut"/)
  assert.match(html, /data-aktion="neu"/)
})

test('201 ohne auftragId → Fehler am Formular, kein POST …//routen', async () => {
  await ausgangslage()
  antworten.set('POST /api/auftraege', [{ status: 201, json: {} }])
  absenden()
  await warte()
  assert.equal(el('auftrag-anlegen-fehler').hidden, false)
  assert.match(el('auftrag-anlegen-fehler').textContent, /^201: Antwort ohne Auftrags-ID/)
  assert.equal(anzahl('POST', '/routen'), 0)
  assert.equal(el('auftrag-formular').hidden, false)
})

test('Schritt 2: „Auftrag ohne Ablauf anlegen“ gesperrt mit Hinweis, kein POST; „Neuen Auftrag beschreiben“ leert die Felder und gibt ihn frei', async () => {
  await ausgangslage({ titel: 'Schon angelegt', ergebnis: 'Text' })
  antworten.set('POST /api/auftraege', [{ status: 201, json: { auftragId: 'a-12' } }])
  antworten.set('POST /api/auftraege/a-12/routen', [{ status: 202, json: { laufId: 'router-a-12-1' } }])
  absenden()
  await warte()
  assert.equal(el('auftrag-anlegen').disabled, true)
  assert.equal(el('direktstart-anlegen-gesperrt').hidden, false)
  await el('auftrag-anlegen').handler.click()
  await warte()
  assert.equal(anzahl('POST', '/auftraege'), 1, 'kein zweiter Auftrag aus den verborgenen Feldern')
  el('auftrag-anlegen-fehler').hidden = false
  klickeNotiz('neu')
  assert.equal(el('auftrag-formular').hidden, false)
  assert.equal(el('auftrag-titel').value, '', 'der Text liegt im angelegten Auftrag; ein neuer beginnt leer')
  assert.equal(el('auftrag-auftragstext').value, '')
  assert.equal(el('auftrag-anlegen-fehler').hidden, true, 'kein alter Fehler')
  assert.equal(document.activeElement?.id, 'auftrag-titel')
  assert.equal(el('auftrag-anlegen').disabled, false)
  assert.equal(el('direktstart-anlegen-gesperrt').hidden, true)
})

test('Projektwechsel während POST …/auftraege: die späte 201 routet nicht und zeigt nichts', async () => {
  await ausgangslage()
  const halt = []
  zurueckgehalten.set('POST /api/auftraege', halt)
  antworten.set('POST /api/auftraege', [{ status: 201, json: { auftragId: 'a-13' } }])
  absenden()
  setzeAktivesProjekt({ id: 'projekt-c', name: 'Projekt C' })
  for (const freigeben of halt) freigeben()
  zurueckgehalten.clear()
  await warte()
  assert.equal(anzahl('POST', '/routen'), 0)
  assert.equal(el('auftrag-vorbereitung').hidden, true)
  assert.equal(el('auftrag-formular').hidden, false)
  setzeAktivesProjekt({ id: 'ai-workforce', name: 'AI Workforce' })
  await warte()
})

test('Ablauf erscheint, während der Fokus im Direktstart liegt → kein Sprung aus der Eingabe, „Der Ablauf ist vorbereitet“', async () => {
  await ausgangslage()
  antworten.set('POST /api/auftraege', [{ status: 201, json: { auftragId: 'a-14' } }])
  antworten.set('POST /api/auftraege/a-14/routen', [{ status: 202, json: { laufId: 'router-a-14-1' } }])
  absenden()
  await warte()
  const direktstart = el('direktstart')
  const vorher = direktstart.contains
  direktstart.contains = () => true
  try {
    aggregat = { ...aggregat, workflows: [{ workflowId: 'router-a-14', status: 'WARTET_FREIGABE' }] }
    await pollJetzt()
  } finally {
    direktstart.contains = vorher
  }
  assert.deepEqual(navigiert, [])
  assert.equal(location.hash, '#/projekt')
  assert.match(el('auftrag-vorbereitung').innerHTML, /Der Ablauf ist vorbereitet/)
})

test('auftrag-vorbereitung.js: Kontext-Anhang, Aggregat-Treffer und Escaping', () => {
  assert.equal(baueAuftragstext('Ergebnis', ''), 'Ergebnis')
  assert.equal(baueAuftragstext('Ergebnis', '   '), 'Ergebnis', 'leerer Kontext hängt nichts an')
  assert.equal(baueAuftragstext('Ergebnis', '  Datei a.ts\n'), 'Ergebnis\n\nKontext:\nDatei a.ts')
  assert.equal(baueAuftragstext('', 'nur Kontext'), 'Kontext:\nnur Kontext')

  const v = { phase: 'wartet', workflowId: 'router-a', laufId: 'router-a-1' }
  assert.deepEqual(pruefeAggregat({ workflows: [{ workflowId: 'router-a' }], startfehler: [{ laufId: 'router-a-1', fehler: 'x' }] }, v), { art: 'workflow' }, 'der Ablauf hat Vorrang')
  assert.deepEqual(pruefeAggregat({ workflows: null, startfehler: [{ laufId: 'router-a-1', fehler: 'x' }] }, v), { art: 'startfehler', fehler: 'x' })
  assert.equal(pruefeAggregat({ workflows: [], startfehler: [{ laufId: 'router-a-0', fehler: 'x' }] }, v), null)
  assert.equal(pruefeAggregat({ workflows: [{ workflowId: 'router-a' }] }, { ...v, phase: 'konflikt' }), null, 'nur beim Warten')
  assert.equal(pruefeAggregat(null, v), null)

  const html = renderVorbereitung({ phase: 'konflikt', auftragId: 'a<b>', laufId: null, workflowId: 'router-a<b>', meldung: '<i>grund</i>' })
  assert.match(html, /&lt;i&gt;grund&lt;\/i&gt;/)
  assert.match(html, /<code>a&lt;b&gt;<\/code>/)
  assert.doesNotMatch(html, /<i>/)
  assert.doesNotMatch(renderVorbereitung({ phase: 'wird_geroutet', auftragId: 'a' }), /data-aktion/, 'während der Anfrage keine Knöpfe')
  assert.match(renderVorbereitung({ phase: 'bereit', auftragId: 'a', workflowId: 'router-a/b' }), /href="#\/workflows\/router-a%2Fb"/)
  assert.equal(renderVorbereitung({ phase: 'unbekannt' }), '')
})
