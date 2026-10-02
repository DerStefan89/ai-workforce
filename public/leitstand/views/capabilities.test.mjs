/**
 * Datei: public/leitstand/views/capabilities.test.mjs
 *
 * Zweck: node:test für F-955 (F44 WS-7b) in views/capabilities.js: Ein Projektwechsel setzt den Scout-Zustand
 * zurück — das Panel ist leer, die „Kandidaten suchen“-Knöpfe sind wieder frei, und der Detail-Auffrischer
 * fragt die laufId des alten Projekts nicht mehr ab (vorher: 404 unter dem neuen Präfix, für immer „läuft…“).
 * Dazu: Solange der Lauf läuft, sind die Knöpfe gesperrt und ein zweiter Klick startet nichts (D13); ein feindliches
 * Ergebnis (P5) wird als Karte ohne javascript:-Link, mit rel="noopener noreferrer" und escaped gerendert; eine
 * geöffnete Quelle verliert „ungeprüft“ und bekommt es nach einem Projektwechsel zurück.
 *
 * Die Tests bauen aufeinander auf (node:test läuft innerhalb einer Datei der Reihe nach): Test 1 startet den Lauf,
 * Test 2 wechselt das Projekt und startet eine neue Suche, Test 3 beendet diese mit einem festen Ergebnis.
 *
 * Die echte View läuft gegen ein minimales Schein-DOM (Elemente mit innerHTML und Klick-Handlern) und ein
 * aufzeichnendes fetch mit festen Antworten — kein Browser, kein Server, kein echter Lauf.
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 *
 * Wichtig: Die Globals stehen VOR dem Import der Module (projekt-kontext.js liest sessionStorage beim
 * Laden) — deshalb dynamische Importe (Muster views/nutzung.test.mjs).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'

/** Schein-Element mit Klick-Handlern. */
function scheinElement(id = '') {
  return {
    id,
    hidden: false,
    innerHTML: '',
    textContent: '',
    value: '',
    placeholder: '',
    dataset: {},
    handler: {},
    addEventListener(typ, fn) {
      this.handler[typ] = fn
    },
    setAttribute() {},
    getAttribute: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    contains: () => false,
    focus() {},
  }
}

const elemente = new Map()
const speicher = () => {
  const werte = new Map()
  return { getItem: (s) => werte.get(s) ?? null, setItem: (s, w) => werte.set(s, String(w)), removeItem: (s) => werte.delete(s) }
}

/** Die „Kandidaten suchen“-Knöpfe, die aktualisiereScoutButtonZustand über document.querySelectorAll findet. */
const scoutKnoepfe = [{ disabled: false }, { disabled: false }]

globalThis.document = {
  getElementById(id) {
    if (!elemente.has(id)) elemente.set(id, scheinElement(id))
    return elemente.get(id)
  },
  querySelector: () => null,
  querySelectorAll: (selektor) => (selektor === '.capabilities-scout-link' ? scoutKnoepfe : []),
  addEventListener() {},
  documentElement: scheinElement('html'),
  activeElement: null,
}
Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true, writable: true })
globalThis.addEventListener = () => {}
Object.defineProperty(globalThis, 'location', { value: { hash: '#/capabilities' }, configurable: true, writable: true })
Object.defineProperty(globalThis, 'history', { value: { state: null, replaceState() {}, back() {} }, configurable: true, writable: true })
Object.defineProperty(globalThis, 'sessionStorage', { value: speicher(), configurable: true, writable: true })
Object.defineProperty(globalThis, 'localStorage', { value: speicher(), configurable: true, writable: true })

/** Antwort auf GET …/laeufe/scout-…; Test 3 setzt ein fertiges Ergebnis. */
let laufDetail = { laufStatus: { status: 'LAEUFT' } }

/** Aufgezeichnete Anfragen als „METHODE pfad“. */
const anfragen = []

globalThis.fetch = (url, optionen = {}) => {
  const pfad = String(url)
  const methode = optionen.method ?? 'GET'
  anfragen.push(`${methode} ${pfad}`)
  const antwort = (json, status = 200) => Promise.resolve(new Response(JSON.stringify(json), { status }))
  if (methode === 'POST' && pfad.endsWith('/auftraege')) return antwort({ auftragId: 'auftrag-nw' }, 201)
  if (methode === 'POST' && pfad.endsWith('/laeufe')) return antwort({}, 202)
  if (pfad.includes('/laeufe/scout-')) return antwort(laufDetail)
  if (pfad.endsWith('/ressourcen/abdeckung')) return antwort({ startvorlagePfad: 'x', rollen: [] })
  if (pfad.endsWith('/ressourcen')) return antwort({ startvorlagePfad: 'x', assessedHinweis: 'x', eintraege: [] })
  return antwort({ laeufe: [], startfehler: [], workflows: [], fehler: [], aktiverLauf: { aktiv: false, laufId: null } })
}

const { initCapabilitiesView } = await import('./capabilities.js')
const { setzeAktivesProjekt } = await import('../projekt-kontext.js')
const { pollJetzt } = await import('../zustand.js')

initCapabilitiesView()

/** Wartet, bis alle Mikrotasks und eine Runde Makrotasks gelaufen sind. */
const warte = () => new Promise((fertig) => setTimeout(fertig, 0))

/** Klick auf „Kandidaten suchen“ in einer Gap-Zeile (Klick-Delegation an #capabilities-abdeckung). */
function klickeKandidatenSuchen() {
  const knopf = { dataset: { rolle: 'qa', capabilities: JSON.stringify(['BROWSER_TEST']) } }
  const ziel = { matches: () => false, closest: (selektor) => (selektor === '.capabilities-scout-link' ? knopf : null) }
  document.getElementById('capabilities-abdeckung').handler.click({ target: ziel })
}

const laufAbfragen = () => anfragen.filter((a) => a.startsWith('GET ') && a.includes('/laeufe/scout-qa-')).length
const laufStarts = () => anfragen.filter((a) => a.startsWith('POST ') && a.endsWith('/laeufe')).length

test('laufender Scout: Knöpfe gesperrt, ein zweiter Klick startet keinen zweiten Lauf, der Auffrischer pollt', async () => {
  klickeKandidatenSuchen()
  await warte()
  const panel = document.getElementById('capabilities-scout')
  assert.match(panel.innerHTML, /scout-status"/, 'Zwischenzustand im Stil der Seite')
  assert.doesNotMatch(panel.innerHTML, /scout-status red/, 'kein Fehlerzustand')
  assert.match(panel.innerHTML, /<code>scout-qa-/, 'Zustand „läuft“ mit laufId')
  assert.ok(
    scoutKnoepfe.every((k) => k.disabled === true),
    'während des Laufs sind alle „Kandidaten suchen“ gesperrt'
  )
  assert.equal(laufStarts(), 1)
  klickeKandidatenSuchen()
  await warte()
  assert.equal(laufStarts(), 1, 'D13: kein zweiter Lauf')
  await pollJetzt()
  await warte()
  assert.ok(laufAbfragen() >= 1, 'der Detail-Auffrischer fragt den laufenden Lauf ab')
})

test('F-955: Projektwechsel setzt Panel, Sperre und Abfrage des alten Laufs zurück', async () => {
  setzeAktivesProjekt({ id: 'anderes-projekt', name: 'Anderes Projekt' })
  await warte()
  assert.equal(document.getElementById('capabilities-scout').innerHTML, '', 'Panel leer')
  assert.ok(
    scoutKnoepfe.every((k) => k.disabled === false),
    'Knöpfe wieder frei'
  )
  const vorher = laufAbfragen()
  await pollJetzt()
  await warte()
  assert.equal(laufAbfragen(), vorher, 'keine Abfrage der alten laufId unter dem neuen Präfix')
  assert.ok(
    anfragen.some((a) => a.includes('/projekte/anderes-projekt/ressourcen')),
    'Katalog des neuen Projekts wird geladen'
  )
  klickeKandidatenSuchen()
  await warte()
  assert.equal(laufStarts(), 2, 'nach dem Zurücksetzen ist eine neue Suche möglich')
})

/** Feindlicher Kandidat (P5): Skript im Namen, javascript:-Quelle; dazu ein sauberer mit http(s)-Quelle. */
const FEIND = {
  name: '<img src=x onerror=alert(1)>',
  typ: 'skill',
  quelle_url: 'javascript:alert(1)',
  capabilities: ['BROWSER_TEST'],
  fit: 'hoch',
  integrationsaufwand: 'gering',
  rechte: '<b>alles</b>',
  risiken: ['<script>x</script>'],
  empfehlung: '"><svg onload=1>',
  unsicherheiten: [],
}
const SAUBER = { ...FEIND, name: 'Playwright MCP', quelle_url: 'https://example.org/playwright', rechte: 'Browser', risiken: [], empfehlung: 'passt' }

test('P5: feindliches Ergebnis als Karten — kein javascript:-Link, noopener, alles escaped; Quelle geöffnet → nicht mehr „ungeprüft“, nach Wechsel wieder', async () => {
  laufDetail = { laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' }, scoutErgebnis: { status: 'ok', ergebnis: { gesuchte_capability: 'BROWSER_TEST', kandidaten: [FEIND, SAUBER] } } }
  await pollJetzt()
  await warte()
  const panel = document.getElementById('capabilities-scout')
  const html = panel.innerHTML
  assert.match(html, /class="scout-karte"/, 'Karten statt Tabelle')
  assert.doesNotMatch(html, /href="javascript/i, 'kein javascript:-Link')
  assert.ok(html.includes('<span class="scout-quelle-text">javascript:alert(1)</span>'), 'ungültige Quelle als reiner Text')
  assert.doesNotMatch(html, /<img|<script|<svg onload|<b>alles/, 'Kandidatenfelder escaped')
  for (const treffer of html.matchAll(/<a [^>]*target="_blank"[^>]*>/g)) assert.match(treffer[0], /rel="noopener noreferrer"/)
  assert.ok(scoutKnoepfe.every((k) => k.disabled === false), 'nach dem Ergebnis sind die Knöpfe frei')
  const ungeprueft = () => (panel.innerHTML.match(/ungeprüft/g) ?? []).length
  const vorher = ungeprueft()
  assert.ok(vorher >= 2, 'P5-Hinweis und Kennzeichen an der sauberen Quelle')
  panel.handler.click({ target: { closest: (selektor) => (selektor === '.scout-quelle-link' ? { dataset: { url: 'https://example.org/playwright' } } : null) } })
  assert.equal(ungeprueft(), vorher - 1, 'geöffnete Quelle verliert „ungeprüft“')
  setzeAktivesProjekt({ id: 'ai-workforce', name: 'AI Workforce' })
  await warte()
  assert.equal(panel.innerHTML, '')
  klickeKandidatenSuchen()
  await warte()
  await pollJetzt()
  await warte()
  assert.equal(ungeprueft(), vorher, 'nach dem Projektwechsel ist dieselbe Quelle wieder „ungeprüft“')
})
