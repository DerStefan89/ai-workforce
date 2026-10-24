/**
 * Datei: src/workboard/status-md.test.ts
 *
 * Zweck: node:test für setzeStatusMdStatus (F45 B5b-1b-2, Entscheidung B6, A1 = b): genau eine Angabe ⇒ nur das Wort ersetzt
 * (auch umbrochen), mehrdeutig/fehlend ⇒ „von Hand“, Datei fehlt bzw. ohne Konvention ⇒ übersprungen, CRLF ⇒ „von Hand“, gleiches
 * Wort ⇒ unverändert.
 *
 * Wird aufgerufen von: `npm test` (node --test).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sammleStatusMdAngaben, setzeStatusMdStatus } from './status-md.ts'

const TEXT = ['# Status', '- F20 `features/F20/feature.md`, Status `FEATURE_GATE`, AK7.', '- F21 Akte `features/F21/', '  feature.md`, Status `FEATURE_GATE`.', ''].join('\n')

test('ersetzt nur das Status-Wort der einen Angabe, auch über einen Umbruch', () => {
  const r = setzeStatusMdStatus(TEXT, 'F21', 'ABGESCHLOSSEN')
  assert.ok(r.ok && r.geaendert)
  assert.equal(r.text, TEXT.replace('feature.md`, Status `FEATURE_GATE`.', 'feature.md`, Status `ABGESCHLOSSEN`.'))
  assert.equal(r.zeile, 3)
  assert.deepEqual(sammleStatusMdAngaben(r.text).map((a) => a.genannt), ['FEATURE_GATE', 'ABGESCHLOSSEN'])
})

test('mehrdeutig, fehlend und CRLF ⇒ von Hand; Datei fehlt bzw. ohne Konvention ⇒ übersprungen', () => {
  const doppelt = setzeStatusMdStatus(`${TEXT}\`features/F20/feature.md\`, Status \`FEATURE_GATE\`\n`, 'F20', 'ABGESCHLOSSEN')
  assert.ok(!doppelt.ok && /2×.*von Hand/.test(doppelt.grund))
  const fehlt = setzeStatusMdStatus(TEXT, 'F22', 'ABGESCHLOSSEN')
  assert.ok(!fehlt.ok && /0×/.test(fehlt.grund))
  const crlf = setzeStatusMdStatus(TEXT.replace(/\n/g, '\r\n'), 'F20', 'ABGESCHLOSSEN')
  assert.ok(!crlf.ok && /CRLF/.test(crlf.grund))
  const ohneDatei = setzeStatusMdStatus(null, 'F20', 'ABGESCHLOSSEN')
  assert.ok(ohneDatei.ok && !ohneDatei.geaendert && /fehlt/.test(ohneDatei.hinweis))
  const ohneKonvention = setzeStatusMdStatus('# Status\nF20 ist fertig.\n', 'F20', 'ABGESCHLOSSEN')
  assert.ok(ohneKonvention.ok && !ohneKonvention.geaendert)
  const gleich = setzeStatusMdStatus(TEXT, 'F20', 'FEATURE_GATE')
  assert.ok(gleich.ok && !gleich.geaendert)
})
