/**
 * Datei: src/startvorlage/startvorlage.test.ts
 *
 * Zweck: node:test-Fälle für das Startvorlage-Modul (F11 WS-2, AK4). Belegt
 * validiereStartvorlageDaten (mindestens ein lesender und ein schreibender
 * Werkzeugsatz), ladeStartvorlage (wirft bei ungültiger Datei) und
 * loeseWerkzeugsatzAuf/leiteProfilReferenzAb gegen die reale Startvorlage
 * unter startvorlagen/beispielprojekt.json.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ladeStartvorlage, leiteProfilReferenzAb, loeseWerkzeugsatzAuf, validiereStartvorlageDaten } from './index.ts'

const GUELTIGE_VORLAGE = {
  startvorlage_schema: 'v0',
  profilPfad: 'profiles/beispielprojekt.json',
  werkzeugStartziel: ['node'],
  werkzeugVersionDeklariert: 'test',
  berechtigungskontext: 'test',
  modell: 'claude-sonnet-5',
  standardBudget: { maxElemente: 10 },
  werkzeugsaetze: {
    lesend: { art: 'lesend', modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Read'] },
    schreibend: { art: 'schreibend', modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Read', 'Write'] },
  },
}

test('validiereStartvorlageDaten: gültige Vorlage hat keine Verstöße', () => {
  assert.deepStrictEqual(validiereStartvorlageDaten(GUELTIGE_VORLAGE), [])
})

test('validiereStartvorlageDaten: fehlender schreibender Werkzeugsatz ist ein Verstoß (AK4)', () => {
  const ohneSchreibend = {
    ...GUELTIGE_VORLAGE,
    werkzeugsaetze: { lesend: GUELTIGE_VORLAGE.werkzeugsaetze.lesend },
  }
  const verstoesse = validiereStartvorlageDaten(ohneSchreibend)
  assert.ok(verstoesse.some((v) => v.includes("art='schreibend'")))
})

test('validiereStartvorlageDaten: fehlender lesender Werkzeugsatz ist ein Verstoß (AK4)', () => {
  const ohneLesend = {
    ...GUELTIGE_VORLAGE,
    werkzeugsaetze: { schreibend: GUELTIGE_VORLAGE.werkzeugsaetze.schreibend },
  }
  const verstoesse = validiereStartvorlageDaten(ohneLesend)
  assert.ok(verstoesse.some((v) => v.includes("art='lesend'")))
})

test('ladeStartvorlage: reale Datei startvorlagen/beispielprojekt.json ist valide und liefert benannte Werkzeugsätze', () => {
  const vorlage = ladeStartvorlage('startvorlagen/beispielprojekt.json')
  assert.strictEqual(vorlage.startvorlage_schema, 'v0')
  assert.ok(loeseWerkzeugsatzAuf(vorlage, 'lesend') !== undefined)
  assert.ok(loeseWerkzeugsatzAuf(vorlage, 'schreibend') !== undefined)
  assert.strictEqual(loeseWerkzeugsatzAuf(vorlage, 'unbekannt'), undefined)
})

test('ladeStartvorlage: wirft bei nicht existierender Datei', () => {
  assert.throws(() => ladeStartvorlage('startvorlagen/gibt-es-nicht.json'))
})

test('leiteProfilReferenzAb: berechnet Hash frisch aus der real referenzierten Profildatei', () => {
  const vorlage = ladeStartvorlage('startvorlagen/beispielprojekt.json')
  const referenz = leiteProfilReferenzAb(vorlage)
  assert.strictEqual(referenz.pfad, vorlage.profilPfad)
  assert.strictEqual(referenz.hash.length, 64)
  assert.strictEqual(typeof referenz.version, 'number')
})
