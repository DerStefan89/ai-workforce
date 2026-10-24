/**
 * Datei: src/feature-auftrag/akte-abschliessen.test.ts
 *
 * Zweck: node:test für setzeAkteAbgeschlossen (F45 B5b-1b-2, Entscheidung B6): Status-Wort, Abgenommen-Zeile und Änderungszeile,
 * Rest bytegleich, LF und CRLF, vorhandener Abschnitt „## Änderungen“; 422 bei ABGESCHLOSSEN, ABGEBROCHEN, fehlendem Status und
 * vorhandener Abgenommen-Zeile; Akte-Gate.
 *
 * Wird aufgerufen von: `npm test` (node --test).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { setzeAkteAbgeschlossen } from './akte-abschliessen.ts'

const AKTE = ['# F20 — Test', '', 'Status: FEATURE_GATE (seit 14.09.)', '', '## Ziel', 'Ziel.', ''].join('\n')
const ANGABEN = { datum: '2026-10-24', grund: 'AK7 ACCEPT', meilenstein: 'M4' }

test('setzt Status, Abgenommen und Änderungszeile — Rest bytegleich, LF und CRLF', () => {
  const erwartet = `${AKTE.replace('Status: FEATURE_GATE (seit 14.09.)\n', 'Status: ABGESCHLOSSEN (seit 14.09.)\nAbgenommen: 2026-10-24\n')}\n## Änderungen\n- 2026-10-24 · Status ABGESCHLOSSEN (Bereinigung M4) · AK7 ACCEPT\n`
  const lf = setzeAkteAbgeschlossen(AKTE, ANGABEN)
  assert.ok(lf.ok)
  assert.equal(lf.inhalt, erwartet)
  const crlf = setzeAkteAbgeschlossen(AKTE.replace(/\n/g, '\r\n'), ANGABEN)
  assert.ok(crlf.ok)
  assert.equal(crlf.inhalt, erwartet.replace(/\n/g, '\r\n'))
})

test('hängt an einen vorhandenen Abschnitt „## Änderungen“ an', () => {
  const mit = `${AKTE}\n## Änderungen\n- 2026-10-01 · Ziel · alt\n`
  const r = setzeAkteAbgeschlossen(mit, ANGABEN)
  assert.ok(r.ok)
  assert.ok(r.inhalt.endsWith('- 2026-10-01 · Ziel · alt\n- 2026-10-24 · Status ABGESCHLOSSEN (Bereinigung M4) · AK7 ACCEPT\n'))
})

test('422: abgeschlossen, abgebrochen, ohne bzw. unbekannter Status, mit Abgenommen-Zeile', () => {
  for (const inhalt of [AKTE.replace('FEATURE_GATE', 'ABGESCHLOSSEN'), AKTE.replace('FEATURE_GATE', 'ABGEBROCHEN'), AKTE.replace(/^Status:.*$/m, ''), AKTE.replace('\n## Ziel', 'Abgenommen: 2026-09-14\n\n## Ziel'), AKTE.replace('FEATURE_GATE', 'UNSINN')]) {
    assert.equal(setzeAkteAbgeschlossen(inhalt, ANGABEN).ok, false, inhalt)
  }
})

test('422: Akte-Gate blockiert jeden Befund (Formfehler im strengen Abschnitt „## Workstreams“)', () => {
  const tabelle = ['## Workstreams', '', '| ID | Art | Titel | Status | Schätzung AT | Ist AT | Begonnen | Abgenommen | Notiz |', '|---|---|---|---|---|---|---|---|---|', '| A | workstream | Eins | unsinn | – | – | – | – | |', ''].join('\n')
  const r = setzeAkteAbgeschlossen(`${AKTE}\n${tabelle}`, ANGABEN)
  assert.ok(!r.ok && Array.isArray(r.verstoesse) && r.verstoesse.length > 0)
})
