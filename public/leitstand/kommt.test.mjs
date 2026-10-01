/**
 * Datei: public/leitstand/kommt.test.mjs
 *
 * Zweck: node:test für den Baustein „kommt“ (kommt.js, F44 WS-1b, E-F44-1): Der Knopf ist
 * aria-disabled (nicht disabled) und trägt das Badge; initKommt() hält Klick, Enter und
 * Leertaste an [aria-disabled="true"] in der Einfangphase an (auch ein Absenden), lässt andere
 * Tasten und andere Elemente durch.
 *
 * Wird aufgerufen von: npm run check (node --test)
 *
 * Wichtig: Ein Schein-Dokument ersetzt den Browser — es sammelt die Listener, die initKommt()
 * anhängt, und ruft sie mit Schein-Ereignissen auf.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'

/** Schein-Element: closest() findet sich selbst, wenn es gesperrt ist, sonst null. */
class ScheinElement {
  constructor(gesperrt) {
    this.gesperrt = gesperrt
  }

  closest(selektor) {
    return selektor === '[aria-disabled="true"]' && this.gesperrt ? this : null
  }
}
globalThis.Element = ScheinElement

const listener = []
globalThis.document = {
  addEventListener: (typ, fn, einfang) => listener.push({ typ, fn, einfang }),
}

const { initKommt, kommtKnopf } = await import('./kommt.js')

/**
 * Löst ein Schein-Ereignis an allen Listenern eines Typs aus.
 * @param typ - 'click' oder 'keydown'
 * @param ziel - ScheinElement
 * @param key - Taste bei keydown
 * @returns das Ereignis mit den Flags angehalten/verhindert
 */
function loese(typ, ziel, key) {
  const ereignis = { target: ziel, key, verhindert: false, angehalten: false, preventDefault() { this.verhindert = true }, stopImmediatePropagation() { this.angehalten = true } }
  for (const eintrag of listener.filter((l) => l.typ === typ)) eintrag.fn(ereignis)
  return ereignis
}

test('kommtKnopf: aria-disabled statt disabled, type=button, Badge „kommt“', () => {
  const html = kommtKnopf('Wissen hinzufügen', { primaer: true })
  assert.match(html, /aria-disabled="true"/)
  assert.doesNotMatch(html, /\sdisabled[\s>=]/)
  assert.match(html, /type="button"/)
  assert.match(html, /class="button primary kommt-knopf"/)
  assert.match(html, /<span class="kommt-badge">kommt<\/span>/)
})

test('initKommt hängt Klick- und Tasten-Sperre in der Einfangphase an', () => {
  initKommt()
  assert.deepEqual(listener.map((l) => [l.typ, l.einfang]), [['click', true], ['keydown', true]])
})

test('Klick, Enter und Leertaste an einem gesperrten Knopf werden angehalten', () => {
  const knopf = new ScheinElement(true)
  for (const [typ, key] of [['click'], ['keydown', 'Enter'], ['keydown', ' ']]) {
    const ereignis = loese(typ, knopf, key)
    assert.equal(ereignis.verhindert, true, `${typ} ${key ?? ''} verhindert`)
    assert.equal(ereignis.angehalten, true, `${typ} ${key ?? ''} angehalten`)
  }
})

test('Tab am gesperrten Knopf und Klick an einem freien Element bleiben unberührt', () => {
  const tab = loese('keydown', new ScheinElement(true), 'Tab')
  assert.equal(tab.verhindert, false)
  const frei = loese('click', new ScheinElement(false))
  assert.equal(frei.verhindert, false)
  assert.equal(frei.angehalten, false)
})

test('kommtKnopf mit Symbol (F-897): dekorativ, aria-hidden, escaped, nicht Teil des Namens', () => {
  const html = kommtKnopf('Eintrag erfassen', { primaer: true, symbol: '<+>' })
  assert.match(html, /<span class="kommt-symbol" aria-hidden="true">&lt;\+&gt;<\/span>Eintrag erfassen/)
  assert.match(html, /aria-disabled="true"/)
  assert.doesNotMatch(kommtKnopf('Ohne'), /kommt-symbol/)
})
