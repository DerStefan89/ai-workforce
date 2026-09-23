/**
 * Datei: src/architekt/architekt.test.ts
 *
 * Zweck: node:test-Fälle für validiereErgebnisArchitektur und
 * baueArchitektAuftragstext (F39 WS-1). Muster
 * src/product-coach/product-coach.test.ts.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { baueArchitektAuftragstext, validiereErgebnisArchitektur } from './index.ts'

function ladeBeispiel(name: string): unknown {
  return JSON.parse(readFileSync(`schemas/examples/ergebnis-architektur.${name}.json`, 'utf-8'))
}

test('validiereErgebnisArchitektur: Wurzel muss ein Objekt sein', () => {
  assert.deepStrictEqual(validiereErgebnisArchitektur(null), ['Wurzel ist kein Objekt'])
  assert.deepStrictEqual(validiereErgebnisArchitektur('text'), ['Wurzel ist kein Objekt'])
  assert.deepStrictEqual(validiereErgebnisArchitektur([]), ['Wurzel ist kein Objekt'])
})

test('validiereErgebnisArchitektur: valid-feature.json ist gültig', () => {
  assert.deepStrictEqual(validiereErgebnisArchitektur(ladeBeispiel('valid-feature')), [])
})

test('validiereErgebnisArchitektur: valid-projekt.json ist gültig', () => {
  assert.deepStrictEqual(validiereErgebnisArchitektur(ladeBeispiel('valid-projekt')), [])
})

test('validiereErgebnisArchitektur: invalid-unbekannter-modus.json wird abgelehnt', () => {
  const verstoesse = validiereErgebnisArchitektur(ladeBeispiel('invalid-unbekannter-modus'))
  assert.ok(verstoesse.some((v) => v.includes("'modus' muss einer von")))
})

test('validiereErgebnisArchitektur: invalid-fehlendes-feld.json wird abgelehnt', () => {
  const verstoesse = validiereErgebnisArchitektur(ladeBeispiel('invalid-fehlendes-feld'))
  assert.ok(verstoesse.some((v) => v.includes("Pflichtfeld 'capabilities_bedarf' fehlt")))
})

test('validiereErgebnisArchitektur: invalid-modul-fehlendes-feld.json wird abgelehnt', () => {
  const verstoesse = validiereErgebnisArchitektur(ladeBeispiel('invalid-modul-fehlendes-feld'))
  assert.ok(verstoesse.some((v) => v.includes("'module[0].abhaengigkeiten' fehlt")))
})

test('validiereErgebnisArchitektur: invalid-leere-evidenz.json wird abgelehnt', () => {
  const verstoesse = validiereErgebnisArchitektur(ladeBeispiel('invalid-leere-evidenz'))
  assert.ok(verstoesse.some((v) => v.includes("'evidenz' muss mindestens einen Eintrag tragen")))
})

test('validiereErgebnisArchitektur: invalid-entscheidung-erfundene-empfehlung.json wird abgelehnt', () => {
  const verstoesse = validiereErgebnisArchitektur(ladeBeispiel('invalid-entscheidung-erfundene-empfehlung'))
  assert.ok(verstoesse.some((v) => v.includes("nennt keinen Titel aus")))
})

test('validiereErgebnisArchitektur: eine erfundene ressource_id ist nur mit übergebenen bekannteRessourcenIds ein Verstoß', () => {
  const daten = ladeBeispiel('projekt-ressource-erfunden')
  assert.deepStrictEqual(validiereErgebnisArchitektur(daten), [], 'ohne bekannteRessourcenIds bleibt die Prüfung aus')
  const verstoesseMitIds = validiereErgebnisArchitektur(daten, ['echte-ressource'])
  assert.ok(verstoesseMitIds.some((v) => v.includes('ist im Capability-Auszug nicht vorhanden')))
})

test('validiereErgebnisArchitektur: unbekanntes Top-Level-Feld wird abgelehnt', () => {
  const daten = { ...(ladeBeispiel('valid-feature') as Record<string, unknown>), fremdfeld: 'x' }
  const verstoesse = validiereErgebnisArchitektur(daten)
  assert.ok(verstoesse.some((v) => v.includes("unbekanntes Feld 'fremdfeld'")))
})

const AUSZUG_MARKER = /Verfügbare Ressourcen \(Capability-Auszug\):/

test('baueArchitektAuftragstext: Modus feature nennt "modus": "feature" und den Planungstext', () => {
  const text = baueArchitektAuftragstext('Baue ein neues Modul X.', 'feature')
  assert.match(text, /"modus":\s*"feature"/)
  assert.match(text, /Baue ein neues Modul X\./)
  assert.doesNotMatch(text, AUSZUG_MARKER)
})

test('baueArchitektAuftragstext: Modus projekt nennt "modus": "projekt" und trägt den Capability-Auszug, wenn gesetzt', () => {
  const text = baueArchitektAuftragstext('Architektur-Grundlage für das neue Vorhaben.', 'projekt', '- res-1 (skill): CODE_WRITE — freigabe=FREIGEGEBEN, verfuegbar=true')
  assert.match(text, /"modus":\s*"projekt"/)
  assert.match(text, AUSZUG_MARKER)
  assert.match(text, /res-1/)
})

test('baueArchitektAuftragstext: Modus projekt ohne Capability-Auszug lässt den Abschnitt weg', () => {
  const text = baueArchitektAuftragstext('Architektur-Grundlage.', 'projekt', null)
  assert.doesNotMatch(text, AUSZUG_MARKER)
})

test('baueArchitektAuftragstext: Default-Modus ist feature', () => {
  const mitDefault = baueArchitektAuftragstext('x')
  const explizit = baueArchitektAuftragstext('x', 'feature')
  assert.strictEqual(mitDefault, explizit)
})
