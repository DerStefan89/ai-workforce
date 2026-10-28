/**
 * Datei: public/leitstand/vorschau-panel.test.mjs
 *
 * Zweck: node:test-Fälle für die Live-Vorschau (F45 V1, public/leitstand/vorschau-panel.js): Zustand aus der Antwort von
 * GET …/projekt-aufruf (nur erreichbar + zulässige lokale URL ⇒ iframe, sonst „Start Building“), Client-Regel gegen die
 * Serverregel (vorschauPortAus), Escaping, und die Steuerung: gleicher Zustand ⇒ kein Schreiben (das iframe bleibt dasselbe
 * Element), „Neu laden“ lädt das vorhandene iframe neu, neues Gerüst (vergiss) ⇒ wird geschrieben, späte Antwort des alten
 * Projekts wird verworfen, ein Abruffehler ergibt „Start Building“. Dass der Poll nichts nachlädt, prüft
 * projekt-wechsel.test.mjs (Poll-Fall); die Identität des echten iframes über Poll-Ticks belegt der Render-Nachweis
 * (features/F45/nachweise/v1/protokoll.json).
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { vorschauPortAus } from '../../src/projekte/index.ts'
import {
  erzeugeVorschauPanel,
  istZulaessigeVorschauUrl,
  VORSCHAU_SANDBOX,
  vorschauHtml,
  vorschauZustand,
} from './vorschau-panel.js'

const ANTWORT = (url, erreichbar) => ({ vorschau: { url, erreichbar, grund: 'x' } })

/**
 * Schein-Element: zählt Schreibvorgänge; jedes Schreiben mit einem iframe erzeugt ein NEUES iframe-Objekt (wie der Browser).
 * @returns Element
 */
function scheinElement() {
  let html = ''
  let rahmen = null
  return {
    schreibvorgaenge: 0,
    get innerHTML() {
      return html
    },
    set innerHTML(wert) {
      html = wert
      this.schreibvorgaenge++
      rahmen = wert.includes('<iframe') ? { src: wert.match(/<iframe[^>]* src="([^"]*)"/)[1] } : null
    },
    querySelector: (selektor) => (selektor === 'iframe' ? rahmen : null),
  }
}

test('vorschauZustand: iframe nur bei erreichbarer, zulässiger lokaler URL', () => {
  assert.deepEqual(vorschauZustand(ANTWORT('http://127.0.0.1:3000', true), '4173'), {
    art: 'vorschau',
    url: 'http://127.0.0.1:3000',
  })
  assert.deepEqual(vorschauZustand(ANTWORT('http://localhost:5173', true), '4173'), {
    art: 'vorschau',
    url: 'http://localhost:5173',
  })
  assert.equal(vorschauZustand(ANTWORT('http://127.0.0.1:3000', false), '4173').grund, 'nichtErreichbar')
  assert.equal(vorschauZustand(ANTWORT(null, null), '4173').grund, 'keineUrl')
  assert.equal(
    vorschauZustand(ANTWORT('http://127.0.0.1:4173', null), '4173').grund,
    'nichtZulaessig',
    'Leitstand-Port (Server: erreichbar null)'
  )
  assert.equal(
    vorschauZustand(ANTWORT('http://localhost:4173', true), '4173').grund,
    'nichtZulaessig',
    'Leitstand-Port, auch wenn der Server erreichbar meldete'
  )
  for (const fremd of [
    'https://localhost:3000',
    'http://example.com:3000',
    'http://localhost',
    'http://localhost:3000/pfad',
    'http://localhost:3000@evil.test',
    'http://localhost:70000',
    'javascript:alert(1)',
  ]) {
    assert.equal(vorschauZustand(ANTWORT(fremd, true), '4173').art, 'start', fremd)
  }
  assert.equal(vorschauZustand(null, '4173').grund, 'fehler')
  assert.equal(vorschauZustand({}, '4173').grund, 'fehler')
  // Unbekannter Leitstand-Port (location.port leer) zählt als 80 — fail-closed.
  assert.equal(istZulaessigeVorschauUrl('http://localhost:80', ''), false)
  assert.equal(istZulaessigeVorschauUrl('http://localhost:3000', ''), true)
})

test('Client-Regel deckt sich mit der Serverregel vorschauPortAus (außer dem eigenen Port)', () => {
  const faelle = [
    'http://localhost:3000',
    'http://127.0.0.1:1',
    'http://127.0.0.1:65535',
    'http://127.0.0.1:65536',
    'http://127.0.0.1:0',
    'http://localhost:03000',
    'http://LOCALHOST:3000',
    'http://localhost:3000/',
    'http://[::1]:3000',
    'http://127.0.0.2:3000',
  ]
  for (const url of faelle) assert.equal(istZulaessigeVorschauUrl(url, '4173'), vorschauPortAus(url) !== null, url)
})

test('vorschauHtml: iframe mit exakter sandbox, Knöpfe; Start Building ohne iframe; Projektname escaped', () => {
  const html = vorschauHtml({ art: 'vorschau', url: 'http://127.0.0.1:3000' }, 'App <b>"x"</b>')
  assert.equal(html.match(/<iframe/g).length, 1)
  assert.match(
    html,
    new RegExp(`<iframe class="uebersicht-vorschau-rahmen" src="http://127.0.0.1:3000" sandbox="${VORSCHAU_SANDBOX}"`)
  )
  assert.equal(VORSCHAU_SANDBOX, 'allow-scripts allow-same-origin allow-forms')
  assert.match(html, /target="_blank" rel="noopener noreferrer"/)
  assert.match(html, /data-vorschau-neu-laden/)
  assert.match(html, /App &lt;b&gt;&quot;x&quot;&lt;\/b&gt;/)
  assert.doesNotMatch(html, /<b>/)
  for (const grund of ['keineUrl', 'nichtErreichbar', 'nichtZulaessig', 'fehler']) {
    const start = vorschauHtml({ art: 'start', grund, url: 'http://127.0.0.1:3000' }, 'P')
    assert.doesNotMatch(start, /<iframe/, grund)
    assert.match(start, /Start Building/, grund)
    assert.match(start, /href="#\/projekt"/, grund)
    assert.doesNotMatch(start, /vorschau\.hinweis/, `${grund}: Hinweis übersetzt`)
  }
})

test('Steuerung: gleicher Zustand schreibt nicht (iframe bleibt), „Neu laden“ lädt das vorhandene iframe neu', async () => {
  const element = scheinElement()
  const abrufe = []
  let antwort = ANTWORT('http://127.0.0.1:3000', true)
  const panel = erzeugeVorschauPanel({
    hole: async (id) => {
      abrufe.push(id)
      return antwort
    },
    element: () => element,
    leitstandPort: () => '4173',
  })
  await panel.lade('p1', 'Projekt 1')
  assert.deepEqual(abrufe, ['p1'])
  assert.equal(element.schreibvorgaenge, 2, '„wird geprüft…“, dann das iframe')
  const rahmen = element.querySelector('iframe')
  assert.equal(rahmen.src, 'http://127.0.0.1:3000')

  await panel.lade('p1', 'Projekt 1') // erneutes Betreten
  assert.equal(element.schreibvorgaenge, 2, 'unveränderter Zustand ⇒ kein Schreiben')
  assert.equal(element.querySelector('iframe'), rahmen, 'dasselbe iframe-Element')

  rahmen.src = 'veraendert'
  await panel.neuLaden()
  assert.equal(element.schreibvorgaenge, 2)
  assert.equal(element.querySelector('iframe'), rahmen)
  assert.equal(rahmen.src, 'http://127.0.0.1:3000', '„Neu laden“ setzt src neu')

  antwort = ANTWORT('http://127.0.0.1:3000', false)
  await panel.neuLaden()
  assert.equal(element.querySelector('iframe'), null)
  assert.match(element.innerHTML, /Start Building/)
  assert.deepEqual(abrufe, ['p1', 'p1', 'p1', 'p1'])
})

test('Steuerung: Projektwechsel lädt das neue Projekt, späte Antwort des alten wird verworfen; vergiss() erzwingt Schreiben', async () => {
  const element = scheinElement()
  const offen = new Map()
  const panel = erzeugeVorschauPanel({
    hole: (id) => new Promise((ok) => offen.set(id, ok)),
    element: () => element,
    leitstandPort: () => '4173',
  })
  const alt = panel.lade('alt', 'Alt')
  const neu = panel.lade('neu', 'Neu')
  offen.get('neu')(ANTWORT('http://localhost:5173', true))
  await neu
  offen.get('alt')(ANTWORT('http://localhost:3000', true))
  await alt
  assert.equal(element.querySelector('iframe').src, 'http://localhost:5173')
  assert.match(element.innerHTML, /Live-Vorschau von Neu/)

  const vorher = element.schreibvorgaenge
  panel.vergiss() // neues Gerüst, gleiches Projekt (setzeAktivesProjekt ohne ID-Vergleich)
  const wieder = panel.lade('neu', 'Neu')
  offen.get('neu')(ANTWORT('http://localhost:5173', true))
  await wieder
  assert.equal(element.schreibvorgaenge, vorher + 2, 'nach vergiss() wird trotz gleichem Zustand geschrieben')
})

test('Steuerung: Abruffehler ⇒ Start Building mit Hinweis „nicht prüfbar“', async () => {
  const element = scheinElement()
  const fehler = console.error
  console.error = () => {}
  try {
    const panel = erzeugeVorschauPanel({
      hole: async () => Promise.reject(new Error('HTTP 500')),
      element: () => element,
      leitstandPort: () => '4173',
    })
    await panel.lade('p', 'P')
  } finally {
    console.error = fehler
  }
  assert.doesNotMatch(element.innerHTML, /<iframe/)
  assert.match(element.innerHTML, /Start Building/)
  assert.match(element.innerHTML, /ließ sich nicht prüfen/)
})
