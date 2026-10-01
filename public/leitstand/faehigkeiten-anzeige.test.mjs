/**
 * Datei: public/leitstand/faehigkeiten-anzeige.test.mjs
 *
 * Zweck: node:test für die reinen Regeln der Werkstatt `#/capabilities` (faehigkeiten-anzeige.js, F44 WS-7a):
 * Kennzahlen des Katalogs, Suche und Filter (Typ, Freigabe) und die Tastaturregel der Register.
 *
 * Wird aufgerufen von: npm run check (node --test)
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FREIGABE_FILTER, filtereWerkzeuge, naechsterRegisterIndex, WERKZEUG_TYPEN, zaehleWerkzeuge } from './faehigkeiten-anzeige.js'

const KATALOG = [
  { id: 'claude-code', typ: 'worker', name: 'Claude Code', beschreibung: 'Entwickelt Funktionen', freigabe: 'FREIGEGEBEN' },
  { id: 'codex', typ: 'worker', name: 'Codex', beschreibung: 'Prüft Änderungen', freigabe: 'FREIGEGEBEN' },
  { id: 'werkzeug-auswahl', typ: 'skill', name: 'Werkzeug-Auswahl', beschreibung: 'Bewertet Werkzeuge', freigabe: 'FREIGEGEBEN' },
  { id: 'qa', typ: 'agent', name: 'QA', beschreibung: 'Randfälle definieren', freigabe: 'FREIGEGEBEN' },
  { id: 'playwright-mcp', typ: 'extern', name: 'Playwright MCP', beschreibung: 'Browser steuern', freigabe: 'OFFEN' },
]

const ids = (liste) => liste.map((e) => e.id)

test('zaehleWerkzeuge: Katalog, freigegeben und Freigabe offen echt gezählt', () => {
  assert.deepEqual(zaehleWerkzeuge(KATALOG), { katalog: 5, freigegeben: 4, offen: 1 })
  assert.deepEqual(zaehleWerkzeuge([]), { katalog: 0, freigegeben: 0, offen: 0 })
})

test('zaehleWerkzeuge: defensiv bei fehlender Liste, Nicht-Objekten und unbekannter Freigabe', () => {
  assert.deepEqual(zaehleWerkzeuge(undefined), { katalog: 0, freigegeben: 0, offen: 0 })
  assert.deepEqual(zaehleWerkzeuge({}), { katalog: 0, freigegeben: 0, offen: 0 })
  assert.deepEqual(zaehleWerkzeuge([null, 'x', { id: 'a', freigabe: 'UNBEKANNT' }]), { katalog: 1, freigegeben: 0, offen: 0 })
})

test('filtereWerkzeuge: ohne Filter alle Einträge in Serverreihenfolge', () => {
  assert.deepEqual(ids(filtereWerkzeuge(KATALOG)), ids(KATALOG))
  assert.deepEqual(ids(filtereWerkzeuge(KATALOG, { suche: '   ', typ: '', freigabe: '' })), ids(KATALOG))
})

test('filtereWerkzeuge: Suche über id, name und beschreibung, ohne Groß-/Kleinschreibung', () => {
  assert.deepEqual(ids(filtereWerkzeuge(KATALOG, { suche: 'CODEX' })), ['codex'])
  assert.deepEqual(ids(filtereWerkzeuge(KATALOG, { suche: 'werkzeug-aus' })), ['werkzeug-auswahl'])
  assert.deepEqual(ids(filtereWerkzeuge(KATALOG, { suche: 'browser' })), ['playwright-mcp'])
  assert.deepEqual(ids(filtereWerkzeuge(KATALOG, { suche: '  prüft ' })), ['codex'])
  assert.deepEqual(filtereWerkzeuge(KATALOG, { suche: 'gibt-es-nicht' }), [])
})

test('filtereWerkzeuge: Typ und Freigabe, auch kombiniert mit der Suche', () => {
  assert.deepEqual(ids(filtereWerkzeuge(KATALOG, { typ: 'worker' })), ['claude-code', 'codex'])
  assert.deepEqual(ids(filtereWerkzeuge(KATALOG, { typ: 'extern' })), ['playwright-mcp'])
  assert.deepEqual(ids(filtereWerkzeuge(KATALOG, { freigabe: 'offen' })), ['playwright-mcp'])
  assert.deepEqual(ids(filtereWerkzeuge(KATALOG, { freigabe: 'freigegeben' })), ['claude-code', 'codex', 'werkzeug-auswahl', 'qa'])
  assert.deepEqual(ids(filtereWerkzeuge(KATALOG, { typ: 'worker', freigabe: 'offen' })), [])
  assert.deepEqual(ids(filtereWerkzeuge(KATALOG, { typ: 'worker', suche: 'claude' })), ['claude-code'])
})

test('filtereWerkzeuge: Einträge ohne Textfelder werfen nicht', () => {
  assert.deepEqual(ids(filtereWerkzeuge([{ id: 'x', typ: 'skill', freigabe: 'OFFEN' }, { typ: 'skill' }], { suche: 'x' })), ['x'])
})

test('Filterwerte: Typen und Freigabe-Werte wie Schema und Auftrag', () => {
  assert.deepEqual([...WERKZEUG_TYPEN], ['worker', 'skill', 'agent', 'extern'])
  assert.deepEqual([...FREIGABE_FILTER], ['', 'freigegeben', 'offen'])
})

test('naechsterRegisterIndex: Pfeiltasten laufen um, Pos1/Ende springen, andere Tasten null', () => {
  assert.equal(naechsterRegisterIndex(0, 3, 'ArrowRight'), 1)
  assert.equal(naechsterRegisterIndex(2, 3, 'ArrowRight'), 0)
  assert.equal(naechsterRegisterIndex(0, 3, 'ArrowLeft'), 2)
  assert.equal(naechsterRegisterIndex(1, 3, 'ArrowLeft'), 0)
  assert.equal(naechsterRegisterIndex(1, 3, 'Home'), 0)
  assert.equal(naechsterRegisterIndex(0, 3, 'End'), 2)
  assert.equal(naechsterRegisterIndex(1, 3, 'Enter'), null)
  assert.equal(naechsterRegisterIndex(1, 3, 'ArrowDown'), null)
  assert.equal(naechsterRegisterIndex(0, 0, 'ArrowRight'), null)
})
