/**
 * Datei: src/scout/scout.test.ts
 *
 * Zweck: node:test-Fälle für validiereErgebnisScout (F27 WS-1). Rot-Abdeckung
 * gegen schemas/ergebnis-scout.schema.json (Muster src/router/router.test.ts —
 * ein Rotfall pro mutiertem Feld statt einer JSON-Fixture je Regel).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validiereErgebnisScout } from './index.ts'

/** Baut ein gültiges Ergebnis (ein Kandidat) als Mutationsbasis. */
function gueltigesErgebnis(): Record<string, unknown> {
  return {
    gesuchte_capability: 'UI_VISUAL_TESTING',
    kandidaten: [
      {
        name: 'Playwright MCP',
        typ: 'extern',
        quelle_url: 'https://github.com/microsoft/playwright-mcp',
        capabilities: ['UI_VISUAL_TESTING'],
        fit: 'hoch',
        integrationsaufwand: 'mittel',
        rechte: 'Netzwerkzugriff, Browser-Steuerung',
        risiken: [],
        empfehlung: 'Zur Freigabe vormerken.',
        unsicherheiten: [],
      },
    ],
    hinweis_untrusted: true,
  }
}

test('validiereErgebnisScout: gültiges Ergebnis liefert keine Verstöße', () => {
  assert.deepStrictEqual(validiereErgebnisScout(gueltigesErgebnis()), [])
})

test('validiereErgebnisScout: leere kandidaten sind gültig (0-5)', () => {
  assert.deepStrictEqual(validiereErgebnisScout({ ...gueltigesErgebnis(), kandidaten: [] }), [])
})

test('validiereErgebnisScout: ein Kandidat ohne lizenz ist gültig (optional)', () => {
  const daten = gueltigesErgebnis()
  assert.deepStrictEqual(validiereErgebnisScout(daten), [])
})

test('validiereErgebnisScout: Wurzel muss ein Objekt sein', () => {
  assert.deepStrictEqual(validiereErgebnisScout(null), ['Wurzel ist kein Objekt'])
  assert.deepStrictEqual(validiereErgebnisScout([1, 2]), ['Wurzel ist kein Objekt'])
  assert.deepStrictEqual(validiereErgebnisScout('text'), ['Wurzel ist kein Objekt'])
})

test('validiereErgebnisScout: unbekanntes Top-Level-Feld wird gemeldet', () => {
  const verstoesse = validiereErgebnisScout({ ...gueltigesErgebnis(), zusatz: 'x' })
  assert.ok(verstoesse.some((v) => v.includes("unbekanntes Feld 'zusatz'")))
})

for (const feld of ['gesuchte_capability', 'kandidaten', 'hinweis_untrusted']) {
  test(`validiereErgebnisScout: fehlendes Pflichtfeld '${feld}' wird gemeldet`, () => {
    const daten = gueltigesErgebnis()
    delete daten[feld]
    assert.ok(validiereErgebnisScout(daten).some((v) => v.includes(`Pflichtfeld '${feld}' fehlt`)))
  })
}

test("validiereErgebnisScout: 'kandidaten' darf höchstens 5 Einträge haben", () => {
  const daten = gueltigesErgebnis()
  daten.kandidaten = Array.from({ length: 6 }, () => (gueltigesErgebnis().kandidaten as unknown[])[0])
  assert.ok(validiereErgebnisScout(daten).some((v) => v.includes("'kandidaten' muss ein Array mit höchstens 5 Einträgen sein")))
})

test("validiereErgebnisScout: 'hinweis_untrusted' muss der feste Wert true sein", () => {
  assert.ok(validiereErgebnisScout({ ...gueltigesErgebnis(), hinweis_untrusted: false }).some((v) => v.includes("'hinweis_untrusted' muss der feste Wert true sein")))
})

test("validiereErgebnisScout: 'gesuchte_capability' muss ein nicht-leerer String sein", () => {
  assert.ok(validiereErgebnisScout({ ...gueltigesErgebnis(), gesuchte_capability: '' }).some((v) => v.includes("'gesuchte_capability' muss ein nicht-leerer String sein")))
})

function mutiereErstenKandidaten(felder: Record<string, unknown>): Record<string, unknown> {
  const daten = gueltigesErgebnis()
  const kandidaten = daten.kandidaten as Array<Record<string, unknown>>
  kandidaten[0] = { ...kandidaten[0], ...felder }
  return daten
}

test("validiereErgebnisScout: kandidat.typ muss 'skill' oder 'extern' sein", () => {
  assert.ok(validiereErgebnisScout(mutiereErstenKandidaten({ typ: 'modell' })).some((v) => v.includes("'kandidaten[0].typ' muss einer von")))
})

test("validiereErgebnisScout: kandidat.fit muss aus der Enum-Menge sein", () => {
  assert.ok(validiereErgebnisScout(mutiereErstenKandidaten({ fit: 'super' })).some((v) => v.includes("'kandidaten[0].fit' muss einer von")))
})

test("validiereErgebnisScout: kandidat.integrationsaufwand muss aus der Enum-Menge sein", () => {
  assert.ok(validiereErgebnisScout(mutiereErstenKandidaten({ integrationsaufwand: 'extrem' })).some((v) => v.includes("'kandidaten[0].integrationsaufwand' muss einer von")))
})

test("validiereErgebnisScout: kandidat.quelle_url muss mit 'http://' oder 'https://' beginnen", () => {
  assert.ok(validiereErgebnisScout(mutiereErstenKandidaten({ quelle_url: 'javascript:alert(1)' })).some((v) => v.includes("'kandidaten[0].quelle_url' muss mit 'http://' oder 'https://' beginnen")))
  assert.ok(validiereErgebnisScout(mutiereErstenKandidaten({ quelle_url: '' })).some((v) => v.includes("'kandidaten[0].quelle_url' muss mit 'http://' oder 'https://' beginnen")))
})

test('validiereErgebnisScout: kandidat.capabilities darf nicht leer sein', () => {
  assert.ok(validiereErgebnisScout(mutiereErstenKandidaten({ capabilities: [] })).some((v) => v.includes("'kandidaten[0].capabilities' muss ein Array mit mindestens einem nicht-leeren String sein")))
})

test('validiereErgebnisScout: kandidat.risiken/unsicherheiten dürfen leer sein, aber keine leeren Strings tragen', () => {
  assert.deepStrictEqual(validiereErgebnisScout(mutiereErstenKandidaten({ risiken: [], unsicherheiten: [] })), [])
  assert.ok(validiereErgebnisScout(mutiereErstenKandidaten({ risiken: [''] })).some((v) => v.includes("'kandidaten[0].risiken' muss ein Array nicht-leerer Strings sein")))
})

test('validiereErgebnisScout: kandidat.lizenz ist optional, aber wenn gesetzt ein nicht-leerer String', () => {
  assert.deepStrictEqual(validiereErgebnisScout(mutiereErstenKandidaten({ lizenz: 'MIT' })), [])
  assert.ok(validiereErgebnisScout(mutiereErstenKandidaten({ lizenz: '' })).some((v) => v.includes("'kandidaten[0].lizenz' muss, wenn angegeben, ein nicht-leerer String sein")))
})

for (const feld of ['name', 'typ', 'quelle_url', 'capabilities', 'fit', 'integrationsaufwand', 'rechte', 'risiken', 'empfehlung', 'unsicherheiten']) {
  test(`validiereErgebnisScout: fehlendes Kandidat-Pflichtfeld '${feld}' wird gemeldet`, () => {
    const daten = gueltigesErgebnis()
    const kandidat = (daten.kandidaten as Array<Record<string, unknown>>)[0]
    delete kandidat[feld]
    assert.ok(validiereErgebnisScout(daten).some((v) => v.includes(`'kandidaten[0].${feld}' fehlt`)))
  })
}

test('validiereErgebnisScout: unbekanntes Kandidat-Feld wird gemeldet', () => {
  assert.ok(validiereErgebnisScout(mutiereErstenKandidaten({ zusatz: 'x' })).some((v) => v.includes("trägt unbekanntes Feld 'zusatz'")))
})

test('validiereErgebnisScout: ein Kandidat, der kein Objekt ist, wird gemeldet', () => {
  const daten = gueltigesErgebnis()
  daten.kandidaten = ['nicht-objekt']
  assert.ok(validiereErgebnisScout(daten).some((v) => v.includes("'kandidaten[0]' muss ein Objekt sein")))
})
