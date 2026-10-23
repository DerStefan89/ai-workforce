/**
 * Datei: scripts/leitstand/freigabe-abschwaechung.test.mjs
 *
 * Zweck: Tests von ermittleFreigabeAbschwaechungen (F15 WS-2c (b3), F-226; seit F45 FB-1b in einem eigenen Modul):
 * abgestufter und entfernter ZWINGEND-Schritt werden gemeldet, Verschärfung und unveränderte Schritte nicht, ungültige Eingaben
 * ergeben keine Meldung bzw. „entfernt“.
 *
 * Wird aufgerufen von: npm run test (node --test)
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ermittleFreigabeAbschwaechungen } from './freigabe-abschwaechung.mjs'

test('abgestuft und entfernt ⇒ gemeldet; verschärft und gleich ⇒ nicht', () => {
  const vorher = [
    { schritt_id: 'a', freigabe: 'ZWINGEND' },
    { schritt_id: 'b', freigabe: 'ZWINGEND' },
    { schritt_id: 'c', freigabe: 'AUTOMATISCH' },
    { schritt_id: 'd', freigabe: 'ZWINGEND' },
  ]
  const nachher = [
    { schritt_id: 'a', freigabe: 'EMPFOHLEN' },
    { schritt_id: 'c', freigabe: 'ZWINGEND' },
    { schritt_id: 'd', freigabe: 'ZWINGEND' },
  ]
  assert.deepEqual(ermittleFreigabeAbschwaechungen(vorher, nachher), [
    { schritt_id: 'a', vorher: 'ZWINGEND', nachher: 'EMPFOHLEN' },
    { schritt_id: 'b', vorher: 'ZWINGEND', nachher: null },
  ])
})

test('ungültige Eingaben: kein Bestand ⇒ leer; keine neue Liste ⇒ jeder ZWINGEND-Schritt entfernt; fehlendes Feld ⇒ null', () => {
  assert.deepEqual(ermittleFreigabeAbschwaechungen(null, []), [])
  assert.deepEqual(ermittleFreigabeAbschwaechungen([{ schritt_id: 'a', freigabe: 'ZWINGEND' }], undefined), [{ schritt_id: 'a', vorher: 'ZWINGEND', nachher: null }])
  assert.deepEqual(ermittleFreigabeAbschwaechungen([{ schritt_id: 'a', freigabe: 'ZWINGEND' }], [{ schritt_id: 'a' }]), [{ schritt_id: 'a', vorher: 'ZWINGEND', nachher: null }])
})
