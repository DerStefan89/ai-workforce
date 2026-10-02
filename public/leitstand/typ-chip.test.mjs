/**
 * Datei: public/leitstand/typ-chip.test.mjs
 *
 * Zweck: node:test-Fälle für den Baustein Typ-Chips (F46 D1, typ-chip.js): sechs Ebenen mit
 * eigener Klasse (Farbe aus --ebene-*), neutrale Form für Workitems ohne Ebene, Text immer
 * sichtbar, Zusatz escaped, unbekannter Typ ohne Ausgabe — und dass style.css für jede Ebene
 * Fläche und Punkt über die Tokens setzt.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { chipTypVonWorkitem, EBENEN, NEUTRALE_TYPEN, typChip } from './typ-chip.js'

test('sechs Ebenen: Klasse je Ebene, Punkt dekorativ, Text sichtbar', () => {
  assert.deepEqual(EBENEN, ['meilenstein', 'feature', 'workstream', 'fixpaket', 'design', 'bug'])
  const erwartet = { meilenstein: 'Meilenstein', feature: 'Feature', workstream: 'Workstream', fixpaket: 'Fixpaket', design: 'Design', bug: 'Bug' }
  for (const ebene of EBENEN) {
    const html = typChip(ebene)
    assert.match(html, new RegExp(`class="typ-chip typ-chip-${ebene}"`))
    assert.match(html, /<span class="typ-chip-punkt" aria-hidden="true"><\/span>/)
    assert.ok(html.includes(erwartet[ebene]), `${ebene}: Text fehlt`)
  }
})

test('neutrale Typen und Abbildung der Workitem-Typen', () => {
  for (const typ of NEUTRALE_TYPEN) assert.match(typChip(typ), /class="typ-chip typ-chip-neutral"/)
  assert.equal(chipTypVonWorkitem('FEATURE'), 'feature')
  assert.equal(chipTypVonWorkitem('BUG'), 'bug')
  assert.equal(chipTypVonWorkitem('HARNESS_IMPROVEMENT'), 'harness')
  assert.equal(chipTypVonWorkitem('TECH_DEBT'), 'techdebt')
  assert.equal(chipTypVonWorkitem('PROCESS_IMPROVEMENT'), 'prozess')
  assert.equal(chipTypVonWorkitem('SONSTIGES'), null)
  assert.equal(chipTypVonWorkitem(undefined), null)
})

test('Zusatz wird escaped, unbekannter Typ liefert nichts', () => {
  assert.match(typChip('bug', { zusatz: '<b>P1</b>' }), /Bug · &lt;b&gt;P1&lt;\/b&gt;/)
  assert.equal(typChip('unbekannt'), '')
  assert.equal(typChip('constructor'), '')
})

test('style.css: jede Ebene setzt Fläche (-blass) und Punkt (volle Farbe) über --ebene-*', () => {
  const css = readFileSync(new URL('./style.css', import.meta.url), 'utf8')
  for (const ebene of EBENEN) {
    assert.match(css, new RegExp(`\\.typ-chip-${ebene} \\{\\s*background: var\\(--ebene-${ebene}-blass\\);`), `${ebene}: Fläche`)
    assert.match(css, new RegExp(`\\.typ-chip-${ebene} \\.typ-chip-punkt \\{\\s*background: var\\(--ebene-${ebene}\\);`), `${ebene}: Punkt`)
  }
})
