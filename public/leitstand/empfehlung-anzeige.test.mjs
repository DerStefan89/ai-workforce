/**
 * Datei: public/leitstand/empfehlung-anzeige.test.mjs
 *
 * Zweck: node:test-Fälle für renderEmpfehlung und empfehlungIdsFuerFreigabe (F36 WS-3, AK7) —
 * beide Listen mit Grund, „+n weitere“, Zählzeile, Hinweise, Escaping, Fehler- und Leerfall; seit
 * F-826 renderInstallierbarHinweis und seine Stelle vor „Freigeben“ in beiden Ansichten.
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { VORSCHAU_LEITSTAND_PORT, VORSCHAU_LEITSTAND_PORT_UNBEKANNT } from '../../src/projekte/index.ts'
import { PROJEKT_URL_FEHLT } from '../../src/ressourcen/index.ts'
import { empfehlungIdsFuerFreigabe, renderEmpfehlung, renderInstallierbarHinweis } from './empfehlung-anzeige.js'

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

test('renderInstallierbarHinweis (F-826): Hinweis nur bei installierbarem Eintrag in „Passt, nicht im Lauf“, kein Blocker', () => {
  const mitInstallierbar = { ...EMPFEHLUNG, passtNichtImLauf: [{ id: 'playwright-mcp', name: 'Playwright', typ: 'extern', unterart: 'mcp', grund: 'freigabe OFFEN', installierbar: true }, ...EMPFEHLUNG.passtNichtImLauf] }
  const html = renderInstallierbarHinweis(mitInstallierbar)
  assert.match(html, /<code>playwright-mcp<\/code> passt und ist installierbar, ist in diesem Lauf aber nicht dabei\. Erst oben „Freigeben &amp; installieren“, sonst startet der Lauf ohne diese Fähigkeit\./)
  assert.doesNotMatch(html, /<button|disabled/)
  assert.doesNotMatch(html, /<code>qa<\/code>/)
  assert.equal(renderInstallierbarHinweis(EMPFEHLUNG), '')
  assert.equal(renderInstallierbarHinweis(null), '')
  assert.equal(renderInstallierbarHinweis({ schrittId: 's', fehler: 'x' }), '')
})

test('renderInstallierbarHinweis (F-826): beide ZWINGEND-Starts (Workflow-Bedienung, Workboard-Vorschlag) zeigen ihn direkt vor „Freigeben“', () => {
  // F44 WS-4b (F-935): der Inhalt des Freigabedialogs wird seit dem Modulschnitt in
  // views/workflow-eingriffe.js gerendert (rein); die Invariante „Hinweis direkt vor Freigeben“ bleibt.
  for (const [datei, knopf] of [
    ['views/workflow-eingriffe.js', 'data-aktion="freigeben"'],
    ['views/workboard.js', 'wb-freigeben'],
  ]) {
    const quelle = readFileSync(new URL(`./${datei}`, import.meta.url), 'utf8')
    const hinweis = quelle.indexOf('${renderInstallierbarHinweis(')
    const freigeben = quelle.indexOf(knopf, hinweis)
    assert.ok(hinweis > 0 && freigeben > hinweis && freigeben - hinweis < 400, `${datei}: Hinweis nicht unmittelbar vor ${knopf}`)
  }
})

test('renderInstallierbarHinweis (F-826): Plural; Eintrag ohne Projekt-URL fehlt im Hinweis (käme auch installiert nicht in den Lauf)', () => {
  const eintrag = (id, grund) => ({ id, name: id, typ: 'extern', unterart: 'mcp', grund, installierbar: true })
  const zwei = renderInstallierbarHinweis({ ...EMPFEHLUNG, passtNichtImLauf: [eintrag('a', 'freigabe OFFEN'), eintrag('b', 'freigabe OFFEN')] })
  assert.ok(zwei.includes('<code>a</code>, <code>b</code> passen und sind installierbar, sind in diesem Lauf aber nicht dabei.'), zwei)
  assert.ok(zwei.includes('ohne diese Fähigkeiten.'), zwei)
  assert.equal(renderInstallierbarHinweis({ ...EMPFEHLUNG, passtNichtImLauf: [eintrag('pw', `freigabe OFFEN; ${PROJEKT_URL_FEHLT}`)] }), '')
  // F-849: gesperrte vorschau_url (Leitstand-Port, auch unbekannt) wie fehlende behandeln.
  assert.equal(renderInstallierbarHinweis({ ...EMPFEHLUNG, passtNichtImLauf: [eintrag('pw', `freigabe OFFEN; ${VORSCHAU_LEITSTAND_PORT}`)] }), '')
  assert.equal(renderInstallierbarHinweis({ ...EMPFEHLUNG, passtNichtImLauf: [eintrag('pw', `freigabe OFFEN; ${VORSCHAU_LEITSTAND_PORT_UNBEKANNT}`)] }), '')
})

test('renderEmpfehlung (F-849): gesperrte Projekt-URL nennt ihren Grund statt „nicht gesetzt“', () => {
  const html = renderEmpfehlung({ ...EMPFEHLUNG, projektUrl: null, projektUrlGrund: VORSCHAU_LEITSTAND_PORT })
  assert.ok(html.includes(`Projekt-URL gesperrt: ${VORSCHAU_LEITSTAND_PORT}.`), html)
  assert.ok(!html.includes('nicht gesetzt'), html)
  assert.ok(renderEmpfehlung({ ...EMPFEHLUNG, projektUrl: null }).includes('Projekt-URL: nicht gesetzt'))
})
