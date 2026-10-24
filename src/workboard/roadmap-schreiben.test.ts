/**
 * Datei: src/workboard/roadmap-schreiben.test.ts
 *
 * Zweck: node:test für verschiebeFeature (F45 B5b-1b-1): ID ans Ende des Ziels, nur die beiden features-Literale geändert,
 * Einplanen ohne Ausgangs-Meilenstein, schon im Ziel, unbekanntes Ziel, doppelte ID, mehrzeiliges Literal, andere
 * Schlüsselreihenfolge ⇒ Rundlauf fängt sie (422 statt falscher Änderung).
 *
 * Wird aufgerufen von: `npm test` (node --test).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { verschiebeFeature } from './roadmap-schreiben.ts'

const ROADMAP = `{
  "roadmap_schema": "v0",
  "vision": "Eine Vision mit \\"id\\": \\"M1\\" im Text.",
  "meilensteine": [
    {
      "id": "M1",
      "titel": "Eins",
      "status": "ABGESCHLOSSEN",
      "features": ["F1", "F2"]
    },
    {
      "id": "M2",
      "titel": "Zwei",
      "status": "LAEUFT",
      "features": [
        "F3"
      ]
    }
  ]
}
`

test('verschiebt ans Ende des Ziels und ändert nur die beiden Literale', () => {
  const r = verschiebeFeature(ROADMAP, 'F2', 'M2')
  assert.ok(r.ok)
  assert.equal(r.von, 'M1')
  assert.equal(r.geaendert, true)
  assert.deepEqual(
    JSON.parse(r.text).meilensteine.map((m: { features: string[] }) => m.features),
    [['F1'], ['F3', 'F2']]
  )
  const erwartet = ROADMAP.replace('"features": ["F1", "F2"]', '"features": ["F1"]').replace('"features": [\n        "F3"\n      ]', '"features": ["F3", "F2"]')
  assert.equal(r.text, erwartet)
})

test('Einplanen: eine ID ohne Meilenstein landet am Ende des Ziels (von null)', () => {
  const r = verschiebeFeature(ROADMAP, 'F9', 'M2')
  assert.ok(r.ok)
  assert.equal(r.von, null)
  assert.deepEqual(JSON.parse(r.text).meilensteine[1].features, ['F3', 'F9'])
})

test('schon im Ziel ⇒ geaendert false, Text unverändert', () => {
  const r = verschiebeFeature(ROADMAP, 'F3', 'M2')
  assert.ok(r.ok)
  assert.equal(r.geaendert, false)
  assert.equal(r.text, ROADMAP)
})

test('unbekanntes Ziel, doppelte ID, ungültiges JSON ⇒ Grund', () => {
  assert.equal(verschiebeFeature(ROADMAP, 'F1', 'M9').ok, false)
  assert.equal(verschiebeFeature(ROADMAP.replace('"F3"', '"F1"'), 'F1', 'M2').ok, false)
  assert.equal(verschiebeFeature('{', 'F1', 'M2').ok, false)
})

test('andere Schlüsselreihenfolge (features vor id) ⇒ der Rundlauf lehnt ab, statt das falsche Literal zu ändern', () => {
  const vertauscht = `{"roadmap_schema":"v0","vision":"V","meilensteine":[{"features":["F1","F2"],"id":"M1","titel":"Eins","status":"LAEUFT"},{"features":["F3"],"id":"M2","titel":"Zwei","status":"LAEUFT"}]}`
  const r = verschiebeFeature(vertauscht, 'F2', 'M2')
  assert.equal(r.ok, false)
})

test('Randfälle (qa 5): letztes Feature verlassen ⇒ leere Liste, Ziel mit Bindestrich, ID zweimal im Text', () => {
  const r = verschiebeFeature(ROADMAP, 'F3', 'M1')
  assert.ok(r.ok)
  assert.deepEqual(JSON.parse(r.text).meilensteine[1].features, [])
  const mitBacklog = ROADMAP.replace('"id": "M2"', '"id": "V1-Backlog"')
  const b = verschiebeFeature(mitBacklog, 'F1', 'V1-Backlog')
  assert.ok(b.ok)
  assert.deepEqual(JSON.parse(b.text).meilensteine[1].features, ['F3', 'F1'])
  const doppelt = ROADMAP.replace('"titel": "Zwei"', '"titel": "Zwei", "x": { "id": "M2" }')
  assert.equal(verschiebeFeature(doppelt, 'F1', 'M2').ok, false)
})
