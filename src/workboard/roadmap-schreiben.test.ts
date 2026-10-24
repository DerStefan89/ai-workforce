/**
 * Datei: src/workboard/roadmap-schreiben.test.ts
 *
 * Zweck: node:test für verschiebeFeature (F45 B5b-1b-1): ID ans Ende des Ziels, nur die beiden features-Literale geändert,
 * Einplanen ohne Ausgangs-Meilenstein, schon im Ziel, unbekanntes Ziel, doppelte ID, mehrzeiliges Literal, andere
 * Schlüsselreihenfolge ⇒ Rundlauf fängt sie (422 statt falscher Änderung). Seit F45 B5b-1b-2: setzeMeilensteinStatus (nur der
 * Status-Wert) und entferneStatusAusnahme (mittlere, letzte, einzige Zeile; mehrzeiliges Objekt ⇒ von Hand).
 *
 * Wird aufgerufen von: `npm test` (node --test).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { entferneStatusAusnahme, setzeMeilensteinStatus, verschiebeFeature } from './roadmap-schreiben.ts'

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

test('setzeMeilensteinStatus ersetzt nur den Status-Wert im Fenster des Meilensteins', () => {
  const r = setzeMeilensteinStatus(ROADMAP, 'M1', 'LAEUFT')
  assert.ok(r.ok)
  assert.equal(r.text, ROADMAP.replace('"status": "ABGESCHLOSSEN"', '"status": "LAEUFT"'))
  assert.equal(setzeMeilensteinStatus(ROADMAP, 'M9', 'LAEUFT').ok, false)
  const zweiStatus = ROADMAP.replace('"titel": "Eins",', '"titel": "Eins", "status": "GEPLANT",')
  assert.equal(setzeMeilensteinStatus(zweiStatus, 'M1', 'LAEUFT').ok, false)
  // cr 6: steht "status" vor "id", fällt der Status des Nachbarn ins Fenster — der Rundlauf lehnt ab statt M1 falsch zu setzen.
  const statusVorId = ROADMAP.replace('"id": "M2",\n      "titel": "Zwei",\n      "status": "LAEUFT",', '"status": "LAEUFT",\n      "id": "M2",\n      "titel": "Zwei",').replace('"id": "M1",\n      "titel": "Eins",\n      "status": "ABGESCHLOSSEN",', '"id": "M1",\n      "titel": "Eins",')
  assert.notEqual(statusVorId, ROADMAP)
  assert.equal(setzeMeilensteinStatus(statusVorId, 'M1', 'GEPLANT').ok, false)
})

const zeile = (m: string, f: string) => `    { "meilenstein": "${m}", "feature": "${f}", "grund": "g" }`
const AUSNAHMEN = `{\n  "schema": "v0",\n  "status_ausnahmen": [\n${zeile('M1', 'F1')},\n${zeile('M1', 'F2')},\n${zeile('M2', 'F3')}\n  ]\n}\n`

test('entferneStatusAusnahme: mittlere, letzte und einzige Zeile, Rest bytegleich', () => {
  const mitte = entferneStatusAusnahme(AUSNAHMEN, 'M1', 'F2')
  assert.ok(mitte.ok)
  assert.equal(mitte.text, AUSNAHMEN.replace(`${zeile('M1', 'F2')},\n`, ''))
  const letzte = entferneStatusAusnahme(AUSNAHMEN, 'M2', 'F3')
  assert.ok(letzte.ok)
  assert.equal(letzte.text, AUSNAHMEN.replace(`${zeile('M1', 'F2')},\n${zeile('M2', 'F3')}\n`, `${zeile('M1', 'F2')}\n`))
  const einzig = `{\n  "schema": "v0",\n  "status_ausnahmen": [\n${zeile('M1', 'F1')}\n  ]\n}\n`
  const leer = entferneStatusAusnahme(einzig, 'M1', 'F1')
  assert.ok(leer.ok)
  assert.deepEqual(JSON.parse(leer.text).status_ausnahmen, [])
})

test('entferneStatusAusnahme: unbekanntes Paar, mehrzeiliges Objekt und ungültige Datei ⇒ von Hand', () => {
  assert.equal(entferneStatusAusnahme(AUSNAHMEN, 'M9', 'F1').ok, false)
  const mehrzeilig = AUSNAHMEN.replace(zeile('M1', 'F2'), '    {\n      "meilenstein": "M1", "feature": "F2", "grund": "g"\n    }')
  const r = entferneStatusAusnahme(mehrzeilig, 'M1', 'F2')
  assert.equal(r.ok, false)
  assert.ok(!r.ok && /von Hand/.test(r.grund))
  assert.equal(entferneStatusAusnahme('{ kaputt', 'M1', 'F1').ok, false)
})
