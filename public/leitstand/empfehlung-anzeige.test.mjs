/**
 * Datei: public/leitstand/empfehlung-anzeige.test.mjs
 *
 * Zweck: node:test-Fälle für renderEmpfehlung und empfehlungIdsFuerFreigabe (F36 WS-3, AK7) —
 * beide Listen mit Grund, „+n weitere“, Zählzeile, Hinweise, Escaping, Fehler- und Leerfall.
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { empfehlungIdsFuerFreigabe, renderEmpfehlung } from './empfehlung-anzeige.js'

const EMPFEHLUNG = {
  schrittId: 'schritt-1-ausfuehrung',
  wirdGenutzt: [{ id: 'gate-mcp', name: 'Gate <MCP>', typ: 'extern', unterart: 'mcp', grund: 'task_typen_any erfüllt (bugfix)' }],
  passtNichtImLauf: [{ id: 'qa', name: 'qa', typ: 'agent', grund: 'Skill/Agent in der Ausführung erst ab WS-5' }],
  weitereAnzahl: { wirdGenutzt: 0, passtNichtImLauf: 2 },
  nichtFreigebbarAnzahl: 1,
  hinweise: ['keine Router-Klassifikation'],
}

test('renderEmpfehlung: beide Listen mit Grund, +n weitere, Zählzeile, Hinweis, Escaping', () => {
  const html = renderEmpfehlung(EMPFEHLUNG)
  assert.match(html, /Wird genutzt/)
  assert.match(html, /Passt, nicht im Lauf/)
  assert.match(html, /<code>gate-mcp<\/code> Gate &lt;MCP&gt; — task_typen_any erfüllt \(bugfix\)/)
  assert.match(html, /erst ab WS-5/)
  assert.match(html, /\+2 weitere<\/li>/)
  const genutztUeber = renderEmpfehlung({ ...EMPFEHLUNG, weitereAnzahl: { wirdGenutzt: 1, passtNichtImLauf: 0 } })
  assert.match(genutztUeber, /\+1 weitere passend, in diesem Lauf nicht genutzt/)
  assert.match(html, /1 passende Einträge in V1 nicht freigebbar/)
  assert.match(html, /keine Router-Klassifikation/)
})

test('renderEmpfehlung: leere Liste zeigt „keine“, keine Zählzeile bei 0', () => {
  const html = renderEmpfehlung({ ...EMPFEHLUNG, wirdGenutzt: [], nichtFreigebbarAnzahl: 0, hinweise: [] })
  assert.match(html, /Wird genutzt<\/strong><\/p><p class="leer">keine<\/p>/)
  assert.doesNotMatch(html, /nicht freigebbar/)
})

test('renderEmpfehlung: null → leer; Fehler → Klartext', () => {
  assert.equal(renderEmpfehlung(null), '')
  assert.equal(renderEmpfehlung(undefined), '')
  assert.match(renderEmpfehlung({ schrittId: 's', fehler: 'ressourcen.json ungültig' }), /Nicht ermittelbar: ressourcen.json ungültig/)
})

test('empfehlungIdsFuerFreigabe: ids der angezeigten Liste, sonst undefined', () => {
  assert.deepEqual(empfehlungIdsFuerFreigabe(EMPFEHLUNG), ['gate-mcp'])
  assert.deepEqual(empfehlungIdsFuerFreigabe({ ...EMPFEHLUNG, wirdGenutzt: [] }), [])
  assert.equal(empfehlungIdsFuerFreigabe(null), undefined)
  assert.equal(empfehlungIdsFuerFreigabe({ schrittId: 's', fehler: 'x' }), undefined)
})
