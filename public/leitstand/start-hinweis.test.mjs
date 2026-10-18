/**
 * Datei: public/leitstand/start-hinweis.test.mjs
 *
 * Zweck: F45 B0 (F-986 a) — Text des Start-Hinweises: nur für die bekannte Art mit beiden Pfaden,
 * Pfade unverändert im Text, sonst leer (kein Band).
 *
 * Wird aufgerufen von: `npm run test` (node --test)
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { projektCliHinweisText } from './projekt-cli-hinweis.js'
import { cliHinweisText, startBandZeilen, startHinweisText } from './start-hinweis.js'

test('falscher Ordner: Text nennt beide Pfade', () => {
  const text = startHinweisText({ art: 'falscherOrdner', istPfad: 'C:\\Projekte\\aiw-main-ansicht', sollPfad: 'C:\\Projekte\\ai-workforce' })
  assert.ok(text.includes('C:\\Projekte\\aiw-main-ansicht'), text)
  assert.ok(text.includes('C:\\Projekte\\ai-workforce'), text)
  assert.ok(text.includes('E-188'), text)
})

test('kein oder unbekannter Hinweis: leer', () => {
  assert.equal(startHinweisText(null), '')
  assert.equal(startHinweisText(undefined), '')
  assert.equal(startHinweisText({ art: 'anderes', istPfad: 'a', sollPfad: 'b' }), '')
  assert.equal(startHinweisText({ art: 'falscherOrdner', istPfad: 'a' }), '')
})

test('F45 B1b-2: CLI-Version geändert — Text nennt beide Versionen und die Anleitung; unvollständig → leer', () => {
  const text = cliHinweisText({ art: 'cliVersionGeaendert', installiert: '2.1.300 (Claude Code)', deklariert: '2.1.296 (Claude Code)', anleitung: 'docs/harness/startfreigabe-erneuern.md' })
  assert.match(text, /CLI-Version geändert — Startfreigabe neu erzeugen/)
  for (const teil of ['2.1.300 (Claude Code)', '2.1.296 (Claude Code)', 'docs/harness/startfreigabe-erneuern.md']) assert.ok(text.includes(teil), teil)
  assert.equal(cliHinweisText(null), '')
  assert.equal(cliHinweisText({ art: 'cliVersionGeaendert', installiert: 'x' }), '')
})

test('F45 B1b-2: Band-Zeilen — beide Hinweise je eine Zeile, keiner → leer', () => {
  const beide = startBandZeilen({
    startHinweis: { art: 'falscherOrdner', istPfad: 'a', sollPfad: 'b' },
    cliHinweis: { art: 'cliVersionGeaendert', installiert: 'neu', deklariert: 'alt', anleitung: 'docs/harness/startfreigabe-erneuern.md' },
  })
  assert.equal(beide.length, 2)
  assert.match(beide[0], /E-188/)
  assert.match(beide[1], /Startfreigabe neu erzeugen/)
  assert.deepEqual(startBandZeilen({ startHinweis: null, cliHinweis: null }), [])
  assert.deepEqual(startBandZeilen(null), [])
})

test('F45 B2b-3b-2b-2b-2b-2: Projekt-CLI weicht ab — eigene Band-Zeile (Warnung, Läufe starten), Versionen und Anleitung im Text', () => {
  const hinweis = { art: 'cliVersionGeaendert', installiert: '2.1.300 (Claude Code)', deklariert: '2.1.258 (Claude Code)', anleitung: 'docs/harness/startfreigabe-erneuern.md#projekt-startfreigabe-erneuern' }
  const text = projektCliHinweisText(hinweis)
  assert.match(text, /weicht von der Startfreigabe dieses Projekts ab — Läufe starten trotzdem/)
  for (const teil of ['2.1.300 (Claude Code)', '2.1.258 (Claude Code)', 'docs/harness/startfreigabe-erneuern.md#projekt-startfreigabe-erneuern']) assert.ok(text.includes(teil), teil)
  assert.equal(projektCliHinweisText(null), '')
  assert.equal(projektCliHinweisText({ ...hinweis, installiert: null }), '')
  const zeilen = startBandZeilen({ startHinweis: null, cliHinweis: null, projektCliHinweis: hinweis })
  assert.deepEqual(zeilen, [text])
  assert.equal(startBandZeilen({ cliHinweis: { ...hinweis, anleitung: 'docs/harness/startfreigabe-erneuern.md' }, projektCliHinweis: hinweis }).length, 2, 'Workforce- und Projekt-Abweichung je eine Zeile')
  assert.deepEqual(startBandZeilen({ startHinweis: null, cliHinweis: null, projektCliHinweis: null }), [], 'Workforce-Instanz: null ⇒ kein Band')
})
