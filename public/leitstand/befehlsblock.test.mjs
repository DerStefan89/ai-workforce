/**
 * Datei: public/leitstand/befehlsblock.test.mjs
 *
 * Zweck: node:test für den Befehlsblock (F44 WS-8b, befehlsblock.js): Zerlegung in Text und
 * Codeblöcke, unvollständiger Zaun bleibt Text, Etikett, Befehlszahl, Platzhalter-Chip, Escaping
 * (kein Attribut, kein Link aus Modellausgabe) und der Kopierweg mit und ohne Clipboard-API.
 *
 * Wird aufgerufen von: `npm test` (node --test)
 *
 * Wichtig: In Node gilt de (i18n.js); das DOM für kopiereBefehlsblock ist ein minimaler Ersatz.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { hatPlatzhalter, kopiereBefehlsblock, kopierText, renderAntwortText, renderBefehlsblock, zaehleBefehle, zerlegeAntwort } from './befehlsblock.js'

const ANTWORT = 'Erst prüfen:\n```powershell\ngit status\ngit diff --stat\n```\nDann committen:\n```powershell\ngit commit -m "<nachricht>"\n```\nFertig.'

test('zerlegeAntwort: Text und Codeblöcke in Reihenfolge, Sprach-Tag gelesen', () => {
  assert.deepEqual(zerlegeAntwort(ANTWORT), [
    { art: 'text', text: 'Erst prüfen:' },
    { art: 'code', sprache: 'powershell', zeilen: ['git status', 'git diff --stat'] },
    { art: 'text', text: 'Dann committen:' },
    { art: 'code', sprache: 'powershell', zeilen: ['git commit -m "<nachricht>"'] },
    { art: 'text', text: 'Fertig.' },
  ])
})

test('zerlegeAntwort: ohne Tag sprache null; CRLF; leere Eingabe', () => {
  assert.deepEqual(zerlegeAntwort('```\r\nls\r\n```'), [{ art: 'code', sprache: null, zeilen: ['ls'] }])
  assert.deepEqual(zerlegeAntwort(''), [])
  assert.deepEqual(zerlegeAntwort(undefined), [])
  assert.deepEqual(zerlegeAntwort('nur Text'), [{ art: 'text', text: 'nur Text' }])
})

test('zerlegeAntwort: unvollständiger Zaun bleibt Text, Zaun mitten in der Zeile ist kein Öffner', () => {
  assert.deepEqual(zerlegeAntwort('Vorher\n```powershell\ngit status'), [{ art: 'text', text: 'Vorher\n```powershell\ngit status' }])
  assert.deepEqual(zerlegeAntwort('Nutze ```git status``` hier'), [{ art: 'text', text: 'Nutze ```git status``` hier' }])
  // Ein Öffner mit Leerzeichen im Tag ist kein Öffner.
  assert.equal(zerlegeAntwort('```power shell\nls\n```')[0].art, 'text')
})

test('zaehleBefehle, hatPlatzhalter, kopierText', () => {
  assert.equal(zaehleBefehle(['git status', '', 'git diff']), 2)
  assert.equal(hatPlatzhalter(['git commit -m "<nachricht>"']), true)
  assert.equal(hatPlatzhalter(['git status 2>&1', 'a < b']), false)
  assert.equal(kopierText(['a', 'b']), 'a\nb')
})

test('renderBefehlsblock: Etikett, Anzahl (Plural), Kopieren, kein Chip ohne Platzhalter', () => {
  const html = renderBefehlsblock({ sprache: 'powershell', zeilen: ['git status', 'git diff --stat'] })
  assert.match(html, /<span class="befehlsblock-etikett">POWERSHELL<\/span>/)
  assert.match(html, /2 Befehle · nacheinander/)
  assert.match(html, /data-befehl-kopieren>Kopieren<\/button>/)
  assert.match(html, /<pre class="befehlsblock-code"><code><span class="befehlsblock-zeile">git status<\/span><span class="befehlsblock-zeile">git diff --stat<\/span><\/code><\/pre>/)
  assert.doesNotMatch(html, /befehlsblock-platzhalter/)
  assert.match(renderBefehlsblock({ sprache: null, zeilen: ['ls'] }), /<span class="befehlsblock-etikett">Code<\/span>[\s\S]*1 Befehl</)
  assert.match(renderBefehlsblock({ sprache: 'bash', zeilen: ['ls'] }), />BASH</)
})

test('renderBefehlsblock: Platzhalter-Chip, Kopieren bleibt', () => {
  const html = renderBefehlsblock({ sprache: 'powershell', zeilen: ['git commit -m "<nachricht>"'] })
  assert.match(html, /<span class="befehlsblock-platzhalter">Platzhalter ausfüllen<\/span>/)
  assert.match(html, /data-befehl-kopieren/)
  assert.match(html, /&lt;nachricht&gt;/)
})

test('renderAntwortText: Modellausgabe wird escaped, kein Attribut und kein Link entsteht', () => {
  const boese = 'Klick <a href="javascript:alert(1)">hier</a>\n```"><img src=x onerror=alert(1)>\n<script>alert(1)</script>\n```\n```javascript" onclick="x\nalert(1)\n```'
  const html = renderAntwortText(boese)
  assert.doesNotMatch(html, /<a\b|<img\b|<script\b/)
  assert.match(html, /&lt;a href=&quot;javascript:alert\(1\)&quot;&gt;/)
  // Jedes echte Tag und jedes Attribut stammt aus dem Modul selbst (Modelltext hat kein rohes '<').
  const erlaubteTags = new Set(['p', 'div', 'span', 'button', 'pre', 'code'])
  const erlaubteAttribute = new Set(['class', 'type', 'data-befehl-kopieren', 'hidden'])
  for (const [, tag, rest] of html.matchAll(/<([a-z]+)([^>]*)>/g)) {
    assert.ok(erlaubteTags.has(tag), `unerwartetes Tag ${tag}`)
    for (const [, name] of rest.matchAll(/([a-z-]+)(?:="[^"]*")?/g)) assert.ok(erlaubteAttribute.has(name), `unerwartetes Attribut ${name}`)
  }
})

test('renderAntwortText: ohne Codeblock genau ein Absatz wie bisher', () => {
  assert.equal(renderAntwortText('Hallo <du>'), '<p class="chat-bubble-text">Hallo &lt;du&gt;</p>')
  assert.equal(renderAntwortText(''), '<p class="chat-bubble-text"></p>')
})

/** Minimaler DOM-Ersatz für einen Befehlsblock. */
function baueBlock(code) {
  const hinweis = { hidden: true }
  const codeElement = { querySelectorAll: () => code.split('\n').map((zeile) => ({ textContent: zeile })) }
  const block = { querySelector: (s) => (s === 'code' ? codeElement : s === '.befehlsblock-hinweis' ? hinweis : null) }
  const knopf = { textContent: 'Kopieren', closest: () => block }
  return { knopf, hinweis }
}

test('kopiereBefehlsblock: schreibt den Code in die Zwischenablage und zeigt kurz „Kopiert“', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const { knopf, hinweis } = baueBlock('git status\ngit diff')
  const geschrieben = []
  await kopiereBefehlsblock(knopf, { writeText: async (text) => geschrieben.push(text) })
  assert.deepEqual(geschrieben, ['git status\ngit diff'])
  assert.equal(knopf.textContent, 'Kopiert')
  assert.equal(hinweis.hidden, true)
  t.mock.timers.tick(2000)
  assert.equal(knopf.textContent, 'Kopieren')
  // Zweimal kurz hintereinander: „Kopiert“ bleibt bis 2 s nach dem zweiten Klick (qa K2).
  await kopiereBefehlsblock(knopf, { writeText: async () => {} })
  t.mock.timers.tick(1500)
  await kopiereBefehlsblock(knopf, { writeText: async () => {} })
  t.mock.timers.tick(1500)
  assert.equal(knopf.textContent, 'Kopiert')
  t.mock.timers.tick(500)
  assert.equal(knopf.textContent, 'Kopieren')
})

test('kopiereBefehlsblock: ohne Clipboard-API oder bei Ablehnung erscheint der Strg+C-Hinweis', async () => {
  const ohne = baueBlock('ls')
  // null statt undefined: undefined löste den Default (globalThis.navigator?.clipboard) aus (cr 5).
  await kopiereBefehlsblock(ohne.knopf, null)
  assert.equal(ohne.hinweis.hidden, false)
  assert.equal(ohne.knopf.textContent, 'Kopieren')
  const abgelehnt = baueBlock('ls')
  const warn = console.warn
  console.warn = () => {}
  try {
    await kopiereBefehlsblock(abgelehnt.knopf, { writeText: async () => { throw new Error('nicht erlaubt') } })
  } finally {
    console.warn = warn
  }
  assert.equal(abgelehnt.hinweis.hidden, false)
  assert.equal(abgelehnt.knopf.textContent, 'Kopieren')
})
