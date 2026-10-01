/**
 * Datei: public/leitstand/rollen-anzeige.test.mjs
 *
 * Zweck: node:test-Fälle für rollen-anzeige.js (F44 WS-3b, F-914): Die Rollenliste deckt sich mit
 * den Rollenverträgen des Kerns, jede Rolle hat einen Namen in allen vier Wörterbüchern, eine
 * unbekannte Rolle erscheint als ID, die Spalte von „Wer macht was“ escapt Projekttexte. F44 WS-4b:
 * dasselbe für die Worker (WORKER, workerName).
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { bekannteRollen } from '../../src/rollen/index.ts'
import { WOERTERBUECHER } from './i18n.js'
import { ROLLEN, rollenName, WORKER, werSpalte, workerName } from './rollen-anzeige.js'

test('ROLLEN ist genau die Menge der Rollenverträge im Kern (keine erfundene, keine fehlende Rolle)', () => {
  assert.deepEqual([...ROLLEN].sort(), [...bekannteRollen()].sort())
})

test('jede Rolle hat einen Namen in de/en/tr/ru; das Wörterbuch kennt keine weiteren rolle.*-Schlüssel', () => {
  for (const [sprache, buch] of Object.entries(WOERTERBUECHER)) {
    const schluessel = Object.keys(buch).filter((s) => s.startsWith('rolle.'))
    assert.deepEqual(schluessel.sort(), ROLLEN.map((r) => `rolle.${r}`).sort(), sprache)
  }
})

test('rollenName: bekannte Rolle übersetzt (de), unbekannte als ID, null leer', () => {
  assert.equal(rollenName('ausfuehrung'), 'Umsetzung')
  assert.equal(rollenName('code-reviewer'), 'Code Review')
  assert.equal(rollenName('neue-rolle'), 'neue-rolle')
  assert.equal(rollenName('constructor'), 'constructor')
  assert.equal(rollenName(null), '')
})

test('werSpalte: Rollenname statt ID, Escaping, Leerzustand, Titel mit Rolle in der Schrittzeile', () => {
  const html = werSpalte('Jetzt', { rolle: 'qa', schritt_id: '<s1>' })
  assert.match(html, /<strong>Qualitätssicherung<\/strong>/)
  assert.match(html, /<code>&lt;s1&gt;<\/code>/)
  assert.match(werSpalte('Zuvor', null), /<strong>–<\/strong><p>Kein Schritt<\/p>/)
  const mitTitel = werSpalte('Jetzt', { rolle: '<x>', schritt_id: 's2' }, { titelHtml: 'Deine Freigabe', klasse: 'execution-current' })
  assert.match(mitTitel, /^<div class="execution-current">/)
  assert.match(mitTitel, /<strong>Deine Freigabe<\/strong><p>&lt;x&gt; · Schritt/)
})

// F44 WS-4b: Worker lesbar über worker.<id>, Zwilling von WORKER in src/workflow/index.ts.
test('WORKER deckt sich mit WORKER des Kerns; je Worker ein Name in de/en/tr/ru; unbekannt als ID', () => {
  const kern = readFileSync(new URL('../../src/workflow/index.ts', import.meta.url), 'utf8').match(/const WORKER = \[([^\]]*)\]/)
  assert.ok(kern !== null, 'WORKER in src/workflow/index.ts nicht gefunden')
  assert.deepEqual([...WORKER].sort(), [...kern[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort())
  for (const [sprache, buch] of Object.entries(WOERTERBUECHER)) {
    assert.deepEqual(Object.keys(buch).filter((s) => s.startsWith('worker.')).sort(), WORKER.map((w) => `worker.${w}`).sort(), sprache)
  }
  assert.equal(workerName('claude-code'), 'Claude Code')
  assert.equal(workerName('codex'), 'Codex')
  assert.equal(workerName('gemini'), 'gemini')
  assert.equal(workerName(undefined), '')
})
