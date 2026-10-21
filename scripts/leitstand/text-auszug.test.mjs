/**
 * Datei: scripts/leitstand/text-auszug.test.mjs
 *
 * Zweck: Unit-Tests der ausgelagerten Textauszüge (F45 B2b-4a-1, B2b-4b) und der Re-Exporte aus scripts/leitstand-server.mjs —
 * dieselben Funktionen, dasselbe Verhalten (die Fälle von check-f22-click-to-work (0) und F-966/F-506 in Kurzform).
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import * as server from '../leitstand-server.mjs'
import { entferneAeusserstenCodezaun, entferneCodezaun, extrahiereErstesJsonObjekt, formatiereAbgelehnteBefehle, versucheJsonParse } from './text-auszug.mjs'

test('Re-Export: der Server liefert genau die Funktionen des Moduls', () => {
  assert.equal(server.entferneCodezaun, entferneCodezaun)
  assert.equal(server.entferneAeusserstenCodezaun, entferneAeusserstenCodezaun)
  assert.equal(server.extrahiereErstesJsonObjekt, extrahiereErstesJsonObjekt)
})

test('entferneCodezaun: erster Zaun, Prosa davor/danach verworfen, ohne Zaun null', () => {
  assert.equal(entferneCodezaun('```json\n{"a":1}\n```'), '{"a":1}')
  assert.equal(entferneCodezaun('Vorweg.\n```\n{"a":1}\n```\nDanach.'), '{"a":1}')
  assert.equal(entferneCodezaun('{"a":1}'), null)
})

test('entferneAeusserstenCodezaun: vom ersten Öffner bis zum letzten Zaun (Codeblock im String bleibt)', () => {
  const text = '```json\n{"antwort":"```powershell\\ngit status\\n```"}\n```'
  assert.equal(entferneAeusserstenCodezaun(text), '{"antwort":"```powershell\\ngit status\\n```"}')
  assert.equal(entferneAeusserstenCodezaun('kein Zaun'), null)
  assert.equal(entferneAeusserstenCodezaun('```json\n{"a":1}'), null)
})

test('extrahiereErstesJsonObjekt: erstes balanciertes Objekt, Klammern in Strings zählen nicht', () => {
  assert.equal(extrahiereErstesJsonObjekt('Prosa {"a":"}{","b":{"c":1}} Rest'), '{"a":"}{","b":{"c":1}}')
  assert.equal(extrahiereErstesJsonObjekt('{"a":"\\"}"}'), '{"a":"\\"}"}')
  assert.equal(extrahiereErstesJsonObjekt('kein Objekt'), null)
  assert.equal(extrahiereErstesJsonObjekt('{"a":1'), null)
})

test('F45 B2b-4b: versucheJsonParse wirft nicht; formatiereAbgelehnteBefehle kürzt ab dem neunten Befehl', () => {
  assert.deepEqual(versucheJsonParse('{"a":1}'), { ok: true, geparst: { a: 1 } })
  const fehler = versucheJsonParse('{a')
  assert.equal(fehler.ok, false)
  assert.ok(typeof fehler.grund === 'string' && fehler.grund.length > 0)
  assert.equal(formatiereAbgelehnteBefehle([]), 'keine im Rohstrom lesbar')
  const acht = Array.from({ length: 8 }, (_, i) => `b${i}`)
  assert.equal(formatiereAbgelehnteBefehle(acht), acht.join(', '))
  assert.equal(formatiereAbgelehnteBefehle([...acht, 'b8']), `${acht.join(', ')}, … (+1 weitere)`)
})
