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

// F14 WS-4 (F-177): zeitgrenzeMs ist optional — fehlt sie, kein Verstoß (Bestandsverhalten).
test('validiereStartvorlageDaten: fehlendes zeitgrenzeMs ist kein Verstoß (F-177, optional)', () => {
  assert.deepStrictEqual(validiereStartvorlageDaten(GUELTIGE_VORLAGE), [])
})

test('validiereStartvorlageDaten: gesetztes positives zeitgrenzeMs ist gültig (F-177)', () => {
  const mitZeitgrenze = { ...GUELTIGE_VORLAGE, zeitgrenzeMs: 60000 }
  assert.deepStrictEqual(validiereStartvorlageDaten(mitZeitgrenze), [])
})

test('validiereStartvorlageDaten: zeitgrenzeMs <= 0 oder nicht-ganzzahlig ist ein Verstoß (F-177)', () => {
  const negativ = validiereStartvorlageDaten({ ...GUELTIGE_VORLAGE, zeitgrenzeMs: -1000 })
  const null_ = validiereStartvorlageDaten({ ...GUELTIGE_VORLAGE, zeitgrenzeMs: 0 })
  const nichtGanzzahlig = validiereStartvorlageDaten({ ...GUELTIGE_VORLAGE, zeitgrenzeMs: 1.5 })
  const keineZahl = validiereStartvorlageDaten({ ...GUELTIGE_VORLAGE, zeitgrenzeMs: 'bald' })
  assert.ok(negativ.some((v) => v.includes('zeitgrenzeMs')))
  assert.ok(null_.some((v) => v.includes('zeitgrenzeMs')))
  assert.ok(nichtGanzzahlig.some((v) => v.includes('zeitgrenzeMs')))
  assert.ok(keineZahl.some((v) => v.includes('zeitgrenzeMs')))
})

// ─── F16 WS-1 (AK5): optionaler worker.codex-Block ──────────────────────────

const CODEX_BLOCK = {
  startziel: [String.raw`C:\Program Files\codex\codex.exe`],
  versionDeklariert: 'codex-cli 0.153.4',
  sandbox: 'read-only',
}

test('validiereStartvorlageDaten: Vorlage OHNE worker-Block bleibt gültig (F16 AK5, additiv)', () => {
  assert.deepStrictEqual(validiereStartvorlageDaten(GUELTIGE_VORLAGE), [])
})

test('validiereStartvorlageDaten: Vorlage MIT gültigem worker.codex-Block ist gültig (F16 AK5)', () => {
  const mitCodex = { ...GUELTIGE_VORLAGE, worker: { codex: CODEX_BLOCK } }
  assert.deepStrictEqual(validiereStartvorlageDaten(mitCodex), [])
})

test("validiereStartvorlageDaten: worker.codex.sandbox 'workspace-write' ist ein Verstoß (E-M3-2)", () => {
  const verstoesse = validiereStartvorlageDaten({
    ...GUELTIGE_VORLAGE,
    worker: { codex: { ...CODEX_BLOCK, sandbox: 'workspace-write' } },
  })
  assert.ok(verstoesse.some((v) => v.includes('worker.codex.sandbox')))
})

test('validiereStartvorlageDaten: leeres worker.codex.startziel ist ein Verstoß (F16 AK5)', () => {
  const verstoesse = validiereStartvorlageDaten({
    ...GUELTIGE_VORLAGE,
    worker: { codex: { ...CODEX_BLOCK, startziel: [] } },
  })
  assert.ok(verstoesse.some((v) => v.includes('worker.codex.startziel')))
})

test('validiereStartvorlageDaten: worker.codex.startziel[0] mit .cmd-Endung ist ein Verstoß (F-280)', () => {
  const verstoesse = validiereStartvorlageDaten({
    ...GUELTIGE_VORLAGE,
    worker: { codex: { ...CODEX_BLOCK, startziel: [String.raw`C:\Program Files\codex\codex.cmd`] } },
  })
  assert.ok(verstoesse.some((v) => v.includes('F-280')))
})

test('validiereStartvorlageDaten: unbekanntes Feld im worker.codex-Block ist ein Verstoß', () => {
  const verstoesse = validiereStartvorlageDaten({
    ...GUELTIGE_VORLAGE,
    worker: { codex: { ...CODEX_BLOCK, zusatz: 'x' } },
  })
  assert.ok(verstoesse.some((v) => v.includes('worker.codex.zusatz')))
})

test('validiereStartvorlageDaten: startvorlage_schema bleibt auch mit worker-Block v0 (Präzedenz zeitgrenzeMs, F14 WS-4)', () => {
  const mitCodex = { ...GUELTIGE_VORLAGE, worker: { codex: CODEX_BLOCK } }
  assert.strictEqual(mitCodex.startvorlage_schema, 'v0')
  assert.deepStrictEqual(validiereStartvorlageDaten(mitCodex), [])
})

test('ladeStartvorlage: startvorlagen/ai-workforce.json bleibt ohne worker-Block gültig (F16 AK5)', () => {
  const vorlage = ladeStartvorlage('startvorlagen/ai-workforce.json')
  assert.strictEqual(vorlage.startvorlage_schema, 'v0')
  assert.strictEqual(vorlage.worker, undefined)
})
