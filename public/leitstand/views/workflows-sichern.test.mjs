/**
 * Datei: public/leitstand/views/workflows-sichern.test.mjs
 *
 * Zweck: node:test-Fälle für „Bereit zum Sichern“ auf der Ablauf- und Abnahmeseite (F45 B2b-4a-2b-2, views/workflows.js):
 * behandleEntscheidenKlick (Kopieren, Aktualisieren) mit Attrappen; Einbau gegen ein Schein-DOM — GET …/code?workflow=<id> genau
 * einmal je Schlüssel, auch über mehrere Poll-Ticks (F-1157 (4)); „Aktualisieren“ ruft neu ab; „Kopieren“ schreibt die Blockzeilen in
 * die Zwischenablage; genau ein Knopf „Arbeitsordner aufräumen“ auf der Seite (unter den Aktionen, V3); bei offener Abnahme „nach
 * deiner Abnahme“ und kein Knopf; ein neuer Schlüssel (aufgeräumt) ruft neu ab und zeigt den Endzustand.
 *
 * Die echten Module laufen gegen ein minimales Schein-DOM und ein aufzeichnendes fetch (Muster workflows-dialog.test.mjs) — kein
 * Browser, kein Server.
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
    dataset: {},
    open: false,
    zuhoerer: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    addEventListener(typ, fn) {
      ;(this.zuhoerer[typ] ??= []).push(fn)
    },
    klick(ziel) {
      for (const f of this.zuhoerer.click ?? []) f({ target: ziel })
    },
    setAttribute() {},
    removeAttribute() {},
    querySelector: () => null,
    querySelectorAll: () => [],
    contains: () => false,
    focus() {},
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
globalThis.Element = class {}
Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true, writable: true })
globalThis.addEventListener = () => {}
Object.defineProperty(globalThis, 'location', { value: { hash: '#/runs' }, configurable: true, writable: true })
Object.defineProperty(globalThis, 'history', { value: { state: null, replaceState: (_z, _t, url) => (location.hash = url), back() {} }, configurable: true, writable: true })
Object.defineProperty(globalThis, 'sessionStorage', { value: speicher(), configurable: true, writable: true })
Object.defineProperty(globalThis, 'localStorage', { value: speicher(), configurable: true, writable: true })
const kopiert = []
Object.defineProperty(globalThis, 'navigator', { value: { clipboard: { writeText: async (text) => kopiert.push(text) } }, configurable: true, writable: true })

const AO = { status: 'BEREIT', pfad: String.raw`C:\Projekte\haushaltsbuch-laeufe\a1b2c3`, branch: 'wf/w-2', basis_commit: 'abc1234def' }
let arbeitsordner = AO
let entscheidung = { status: 'ok', entscheidung: 'ANGENOMMEN' }
let codeAntwort = { status: 200, json: null }
const codeAbrufe = []

/** Antwort von GET …/code?workflow=w-2 (200, bereit (commit)). */
const CODE_BEREIT = {
  status: 'ok',
  absoluterPfad: AO.pfad,
  branch: { status: 'ok', name: 'wf/w-2', losgeloest: false, commit: 'abc1234def' },
  remoteWebUrl: { status: 'ok', url: null, origin: true },
  dateien: { status: 'ok', eintraege: [{ pfad: 'src/a.ts', art: 'M', xy: ' M' }], anzahl: 1, gekappt: false, nodeModules: 0 },
  ablauf: { workflowId: 'w-2', bedarf: 'pflicht', workflowStatus: 'ABGESCHLOSSEN', arbeitsordner: { pfad: AO.pfad, branch: AO.branch }, sichern: { bereit: true, art: 'commit', grund: null, offeneAenderungen: 1, voraus: 0 } },
}
codeAntwort = { status: 200, json: CODE_BEREIT }

globalThis.fetch = (url) => {
  const pfad = String(url)
  const antwort = (status, json) => Promise.resolve({ ok: status < 300, status, json: async () => json })
  if (pfad.includes('/code?workflow=')) {
    codeAbrufe.push(pfad)
    return antwort(codeAntwort.status, codeAntwort.json)
  }
  if (pfad.endsWith('/zustand')) return antwort(200, { laeufe: [], startfehler: [], workflows: [{ workflowId: 'w-2', ziel: 'Ziel', status: 'ABGESCHLOSSEN', naechster: null }], fehler: [], aktiverLauf: { aktiv: false, laufId: null } })
  if (pfad.endsWith('/workflows/w-2/abnahme')) return antwort(200, { workflowStatus: 'ABGESCHLOSSEN', freigabeHalt: null, entscheidung, urteil: { status: 'noch_nicht_gelaufen' }, aenderungsuebersicht: { status: 'noch_nicht_gelaufen' }, pruefergebnis: { status: 'noch_nicht_gelaufen' } })
  if (pfad.endsWith('/workflows/w-2')) return antwort(200, { daten: { ziel: 'Ziel', status: 'ABGESCHLOSSEN', schritte: [] }, naechster: null, arbeitsordner, versionSequenz: 1 })
  return antwort(200, {})
}

const warte = () => new Promise((ok) => setTimeout(ok, 30))

const { behandleEntscheidenKlick, initWorkflowsView, ladeWorkflowDetail } = await import('./workflows.js')
const { dispatch } = await import('../router.js')
initWorkflowsView()

/**
 * Schein-Ziel eines Klicks: closest liefert sich selbst für passende Selektoren.
 * @param selektoren - Selektoren, auf die das Ziel passt
 * @param felder - weitere Felder (dataset …)
 * @returns Ziel
 */
const ziel = (selektoren, felder = {}) => ({ ...felder, closest: (s) => (selektoren.includes(s) ? ziel(selektoren, felder) : null) })
const html = (id) => document.getElementById(id).innerHTML
const zahl = (text, muster) => (text.match(muster) ?? []).length

test('behandleEntscheidenKlick: Kopieren und Aktualisieren mit Attrappen; anderes Ziel bleibt unbehandelt', () => {
  const aufrufe = []
  const abh = { kopiere: async (k) => aufrufe.push(['kopiere', k.dataset?.n]), aktualisiere: async (id) => aufrufe.push(['aktualisiere', id]) }
  assert.equal(behandleEntscheidenKlick({ target: ziel(['[data-befehl-kopieren]'], { dataset: { n: 1 } }) }, abh), true)
  assert.equal(behandleEntscheidenKlick({ target: ziel(['[data-sichern-aktualisieren]'], { dataset: { workflowId: 'w-9' } }) }, abh), true)
  assert.equal(behandleEntscheidenKlick({ target: ziel(['[data-sichern-aktualisieren]'], { dataset: {} }) }, abh), false, 'ohne Kennung nichts')
  assert.equal(behandleEntscheidenKlick({ target: ziel(['.wf-aktion']) }, abh), false)
  assert.equal(behandleEntscheidenKlick({ target: null }, abh), false)
  assert.deepEqual(aufrufe, [
    ['kopiere', 1],
    ['aktualisiere', 'w-9'],
  ])
})

test('Ablaufseite (Abnahme entschieden): ein Abruf über mehrere Poll-Ticks, Abschnitt in der Karte, genau ein Aufräumen-Knopf', async () => {
  location.hash = '#/workflows/w-2'
  dispatch()
  await warte()
  for (let i = 0; i < 4; i++) {
    await ladeWorkflowDetail('w-2', false)
    await warte()
  }
  assert.equal(codeAbrufe.length, 1, 'nie im Poll — je Schlüssel einmal')
  assert.match(codeAbrufe[0], /\/code\?workflow=w-2$/)
  const karte = html('workflow-entscheiden')
  assert.match(karte, /arbeitsordner-karte/)
  assert.match(karte, /data-sichern-abschnitt/)
  assert.match(karte, /Bereit zum Sichern/)
  assert.match(karte, /data-sichern-aufraeumen="aktionen"/)
  const knoepfe = zahl(karte, /aufraeumen-oeffnen/g) + zahl(html('workflow-aktionen'), /aufraeumen-oeffnen/g)
  assert.equal(knoepfe, 1, 'genau ein Knopf auf der Seite — unter den Aktionen')
})

test('Aktualisieren ruft neu ab; Kopieren schreibt die Zeilen des Blocks', async () => {
  const vorher = codeAbrufe.length
  document.getElementById('workflow-entscheiden').klick(ziel(['[data-sichern-aktualisieren]'], { dataset: { workflowId: 'w-2' } }))
  await warte()
  assert.equal(codeAbrufe.length, vorher + 1)
  const zeilen = ['& {', 'git status', '}'].map((textContent) => ({ textContent }))
  const block = { querySelector: (s) => (s === 'code' ? { querySelectorAll: () => zeilen } : null) }
  const knopf = { textContent: 'Kopieren', closest: (s) => (s === '[data-befehl-kopieren]' ? knopf : s === '.befehlsblock' ? block : null) }
  document.getElementById('workflow-entscheiden').klick(knopf)
  await warte()
  assert.deepEqual(kopiert, ['& {\ngit status\n}'])
  assert.equal(knopf.textContent, 'Kopiert')
})

test('neuer Schlüssel (aufgeräumt) ruft neu ab und zeigt den Endzustand ohne Fehlerfarbe', async () => {
  const vorher = codeAbrufe.length
  arbeitsordner = { ...AO, status: 'ENTFERNT', aufraeumen: { branch_geloescht: true } }
  codeAntwort = { status: 409, json: { grund: 'Der Arbeitsordner des Ablaufs ist aufgeräumt', grund_schluessel: 'aufgeraeumt' } }
  await ladeWorkflowDetail('w-2', false)
  await warte()
  await ladeWorkflowDetail('w-2', false)
  await warte()
  assert.equal(codeAbrufe.length, vorher + 1)
  const karte = html('workflow-entscheiden')
  assert.match(karte, /Erledigt: Der Arbeitsordner ist aufgeräumt\./)
  assert.doesNotMatch(karte.slice(karte.indexOf('data-sichern-abschnitt')), /class="fehler"/)
})

test('offene Abnahme: Abschnitt mit „nach deiner Abnahme“, kein Aufräumen-Knopf auf der Seite', async () => {
  arbeitsordner = { ...AO, basis_commit: 'abc1234dff' }
  codeAntwort = { status: 200, json: CODE_BEREIT }
  entscheidung = { status: 'fehlt' }
  location.hash = '#/runs'
  dispatch()
  location.hash = '#/workflows/w-2'
  dispatch()
  await warte()
  await ladeWorkflowDetail('w-2', false)
  await warte()
  const karte = html('workflow-entscheiden')
  assert.match(karte, /data-sichern-aufraeumen="nachAbnahme"/)
  assert.equal(zahl(karte, /aufraeumen-oeffnen/g) + zahl(html('workflow-aktionen'), /aufraeumen-oeffnen/g), 0)
})
