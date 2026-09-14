/**
 * Datei: src/entscheidung/entscheidung.test.ts
 *
 * Zweck: node:test-Fälle für den Entscheidungs-Validator (F23 WS-1a,
 * features/F23/feature.md). Reine Funktionen, kein I/O — Muster
 * src/aenderungsuebersicht/aenderungsuebersicht.test.ts (Validierungsteil).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { leiteArtAusHerkunftAb, validiereEntscheidungsDaten } from './index.ts'

function gueltig(ueberschreibungen: Record<string, unknown> = {}) {
  return {
    entscheidung_schema: 'v0',
    art: 'freigabe',
    ergebnis: 'FREIGEGEBEN',
    begruendung: 'Plan entspricht dem besprochenen Umfang.',
    entschieden_am: '2026-09-14T09:00:00.000Z',
    ...ueberschreibungen,
  }
}

test('art freigabe: FREIGEGEBEN/ABGELEHNT gültig, jeder andere Wert nicht', () => {
  assert.deepStrictEqual(validiereEntscheidungsDaten(gueltig()), [])
  assert.deepStrictEqual(validiereEntscheidungsDaten(gueltig({ ergebnis: 'ABGELEHNT' })), [])
  assert.ok(validiereEntscheidungsDaten(gueltig({ ergebnis: 'GESTOPPT' })).length > 0)
})

test('art stopp: nur GESTOPPT gültig', () => {
  const daten = gueltig({ art: 'stopp', ergebnis: 'GESTOPPT' })
  assert.deepStrictEqual(validiereEntscheidungsDaten(daten), [])
  assert.ok(validiereEntscheidungsDaten({ ...daten, ergebnis: 'FREIGEGEBEN' }).length > 0)
})

test('art planaenderung: abgeschwaechte_freigaben ist Pflicht und wird selbst geprüft', () => {
  const basis = gueltig({ art: 'planaenderung', ergebnis: 'FREIGABEPFLICHT_ABGESCHWAECHT' })
  assert.ok(validiereEntscheidungsDaten(basis).some((v) => v.includes('abgeschwaechte_freigaben')))

  const mitEintrag = { ...basis, abgeschwaechte_freigaben: [{ schritt_id: 'schritt-2', vorher: 'ZWINGEND', nachher: null }] }
  assert.deepStrictEqual(validiereEntscheidungsDaten(mitEintrag), [])

  const kaputterEintrag = { ...basis, abgeschwaechte_freigaben: [{ schritt_id: 'schritt-2', vorher: 'FREIWILLIG', nachher: null }] }
  assert.ok(validiereEntscheidungsDaten(kaputterEintrag).some((v) => v.includes('vorher')))

  const unbekanntesFeldImEintrag = { ...basis, abgeschwaechte_freigaben: [{ schritt_id: 'schritt-2', vorher: 'ZWINGEND', nachher: null, extra: true }] }
  assert.ok(validiereEntscheidungsDaten(unbekanntesFeldImEintrag).some((v) => v.includes('unbekanntes Feld')))
})

test('art terminal: ERFOLGREICH/VERWEIGERT/FEHLGESCHLAGEN gültig, FREIGEGEBEN nicht', () => {
  for (const ergebnis of ['ERFOLGREICH', 'VERWEIGERT', 'FEHLGESCHLAGEN']) {
    assert.deepStrictEqual(validiereEntscheidungsDaten(gueltig({ art: 'terminal', ergebnis })), [])
  }
  assert.ok(validiereEntscheidungsDaten(gueltig({ art: 'terminal', ergebnis: 'FREIGEGEBEN' })).length > 0)
})

test('art kenntnisnahme: nur VERWEIGERT/FEHLGESCHLAGEN gültig, ERFOLGREICH nicht', () => {
  assert.deepStrictEqual(validiereEntscheidungsDaten(gueltig({ art: 'kenntnisnahme', ergebnis: 'VERWEIGERT' })), [])
  assert.deepStrictEqual(validiereEntscheidungsDaten(gueltig({ art: 'kenntnisnahme', ergebnis: 'FEHLGESCHLAGEN' })), [])
  assert.ok(validiereEntscheidungsDaten(gueltig({ art: 'kenntnisnahme', ergebnis: 'ERFOLGREICH' })).length > 0)
})

test('art abnahme: schemagültig, obwohl F23 WS-1a keine Schreibstelle dafür baut', () => {
  assert.deepStrictEqual(validiereEntscheidungsDaten(gueltig({ art: 'abnahme', ergebnis: 'ANGENOMMEN' })), [])
  assert.deepStrictEqual(validiereEntscheidungsDaten(gueltig({ art: 'abnahme', ergebnis: 'ANPASSUNG_ANGEFORDERT' })), [])
  assert.deepStrictEqual(validiereEntscheidungsDaten(gueltig({ art: 'abnahme', ergebnis: 'ABGELEHNT' })), [])
})

test('unbekannte art wird abgelehnt', () => {
  const verstoesse = validiereEntscheidungsDaten(gueltig({ art: 'sonstiges' }))
  assert.ok(verstoesse.some((v) => v.includes("'art'")))
})

// QA-Pass 14.09.2026: nur ein UNBEKANNTER art-Wert war getestet, ein komplett FEHLENDES
// art-Feld nicht — beide Fälle laufen durch denselben Code (istBekannteArt liefert für
// undefined ebenso false wie für einen unbekannten String), aber ohne diesen Test war das
// nur durch Lesen des Codes belegt, nicht durch einen Regressionstest.
test('fehlendes art-Feld wird als Pflichtfeld gemeldet, kein Verwechseln mit leiteArtAusHerkunftAb', () => {
  const { art, ...ohneArt } = gueltig()
  const verstoesse = validiereEntscheidungsDaten(ohneArt)
  assert.ok(verstoesse.some((v) => v === "Pflichtfeld 'art' fehlt"))
})

test('fehlendes Pflichtfeld begruendung wird gemeldet', () => {
  const { begruendung, ...ohneBegruendung } = gueltig()
  assert.ok(validiereEntscheidungsDaten(ohneBegruendung).some((v) => v.includes("'begruendung'")))
})

test('unbekanntes Feld je art wird abgelehnt (additionalProperties: false je Zweig)', () => {
  assert.ok(validiereEntscheidungsDaten(gueltig({ abgeschwaechte_freigaben: [] })).some((v) => v.includes('unbekanntes Feld')))
})

test('Wurzel ist kein Objekt', () => {
  assert.deepStrictEqual(validiereEntscheidungsDaten('nicht-objekt'), ['Wurzel ist kein Objekt'])
  assert.deepStrictEqual(validiereEntscheidungsDaten(null), ['Wurzel ist kein Objekt'])
  assert.deepStrictEqual(validiereEntscheidungsDaten([]), ['Wurzel ist kein Objekt'])
})

test('leiteArtAusHerkunftAb: mappt die fünf realen Schreibstellen, unbekannt -> null', () => {
  assert.strictEqual(leiteArtAusHerkunftAb('entscheidung-workflow-planaenderung'), 'planaenderung')
  assert.strictEqual(leiteArtAusHerkunftAb('entscheidung-workflow-freigabe'), 'freigabe')
  assert.strictEqual(leiteArtAusHerkunftAb('entscheidung-workflow-stopp'), 'stopp')
  assert.strictEqual(leiteArtAusHerkunftAb('entscheidung-terminal'), 'terminal')
  assert.strictEqual(leiteArtAusHerkunftAb('entscheidung-kenntnisnahme'), 'kenntnisnahme')
  assert.strictEqual(leiteArtAusHerkunftAb('irgendwas-unbekanntes'), null)
})
