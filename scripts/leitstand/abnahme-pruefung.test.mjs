/**
 * Datei: scripts/leitstand/abnahme-pruefung.test.mjs
 *
 * Zweck: node:test-Fälle für scripts/leitstand/abnahme-pruefung.mjs (F45 B3b-2a-1): die ausgelagerte
 * Prüfergebnis-Projektion (alle vier Status, versionSequenz) und die neue Render-Nachweis-Projektion ('ok' mit
 * gekürztem Ausgabe-Ende, 'fehlt' ohne Schritt, ohne lauf_id, ohne Artefakt, bei ungültigen Daten und wenn das Laden
 * wirft — QA N2); ladeQaDarstellung (F45 B3b-2b) mit und ohne render.json.
 *
 * Wird aufgerufen von: npm run test (node --test).
 */

import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { registriereKernArtefakt } from '../../src/lineage-registry/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../../src/startvorlage/index.ts'
import { wegwerfOrdner } from '../_wegwerf.ts'
import {
  AUSGABE_ZEILEN,
  KEIN_NACHWEIS_TEXT,
  ladeQaDarstellung,
  projizierePruefergebnis,
  projiziereRenderNachweis,
} from './abnahme-pruefung.mjs'

const ladeOptionen = {
  basisVerzeichnis: join(wegwerfOrdner('abnahme-pruefung'), 'kontrollzustand'),
  schreiber: () => {},
}
const profil = leiteProfilReferenzAb(ladeStartvorlage('startvorlagen/beispielprojekt.json'))

/**
 * Prüfergebnis v0 mit Vorgaben.
 * @param {Record<string, unknown>} felder - Überschreibungen
 * @returns {Record<string, unknown>} Daten
 */
const daten = (felder = {}) => ({
  pruefergebnis_schema: 'v0',
  lauf_id: 'l-1',
  befehl: ['npm', 'run', 'check:render'],
  exit_code: 1,
  ergebnis: 'ROT',
  dauer_ms: 4200,
  ausgabe_ende: 'x',
  gestartet_am: '2026-10-29T10:00:00.000Z',
  ...felder,
})

/**
 * Registriert ein Kern-Artefakt im Wegwerf-Kontrollzustand.
 * @param {string} id - Artefakt-Kennung
 * @param {Record<string, unknown>} inhalt - Daten
 */
const registriere = (id, inhalt) =>
  registriereKernArtefakt(id, profil, { erzeuger: 'kern', schritt: 'test' }, inhalt, [], ladeOptionen)

test('projizierePruefergebnis: vier Status, versionSequenz bei ok', () => {
  assert.deepEqual(projizierePruefergebnis(null, ladeOptionen), { status: 'kein_ausfuehrungs_schritt' })
  assert.deepEqual(projizierePruefergebnis({ schritt_id: 's-1', lauf_id: null }, ladeOptionen), {
    status: 'noch_nicht_gelaufen',
    schrittId: 's-1',
  })
  assert.deepEqual(projizierePruefergebnis({ schritt_id: 's-1', lauf_id: 'pe-fehlt' }, ladeOptionen), {
    status: 'nicht_vorhanden',
    laufId: 'pe-fehlt',
  })
  registriere('pruefergebnis-pe-ok', daten({ lauf_id: 'pe-ok', ergebnis: 'GRUEN', exit_code: 0 }))
  const ok = projizierePruefergebnis({ schritt_id: 's-1', lauf_id: 'pe-ok' }, ladeOptionen)
  assert.deepEqual(
    { ...ok, versionSequenz: typeof ok.versionSequenz },
    { status: 'ok', laufId: 'pe-ok', ergebnis: 'GRUEN', exitCode: 0, versionSequenz: 'number' }
  )
})

test('projiziereRenderNachweis: ok mit gekürztem Ausgabe-Ende, sonst fehlt', () => {
  assert.deepEqual(projiziereRenderNachweis(null, ladeOptionen), { status: 'fehlt' })
  assert.deepEqual(projiziereRenderNachweis({ lauf_id: null }, ladeOptionen), { status: 'fehlt' })
  assert.deepEqual(projiziereRenderNachweis({ lauf_id: 'rn-fehlt' }, ladeOptionen), { status: 'fehlt' })
  // Ein Prüfergebnis desselben Laufs ist kein Render-Nachweis (exakte Kennungen).
  registriere('pruefergebnis-rn-nur-pruefung', daten({ lauf_id: 'rn-nur-pruefung' }))
  assert.deepEqual(projiziereRenderNachweis({ lauf_id: 'rn-nur-pruefung' }, ladeOptionen), { status: 'fehlt' })
  const zeilen = Array.from({ length: AUSGABE_ZEILEN + 10 }, (_, i) => `Zeile ${i + 1}`)
  registriere('render-nachweis-rn-ok', daten({ lauf_id: 'rn-ok', ausgabe_ende: zeilen.join('\n') }))
  const ok = projiziereRenderNachweis({ lauf_id: 'rn-ok' }, ladeOptionen)
  assert.deepEqual(Object.keys(ok).sort(), ['ausgabe_ende', 'dauer_ms', 'ergebnis', 'gestartet_am', 'status'])
  assert.equal(ok.status, 'ok')
  assert.equal(ok.ergebnis, 'ROT')
  assert.equal(ok.dauer_ms, 4200)
  assert.equal(ok.gestartet_am, '2026-10-29T10:00:00.000Z')
  assert.equal(ok.ausgabe_ende.split('\n').length, AUSGABE_ZEILEN)
  assert.match(ok.ausgabe_ende, /^Zeile 11\n[\s\S]*Zeile 50$/)
  registriere('render-nachweis-rn-kaputt', daten({ lauf_id: 'rn-kaputt', ergebnis: 'BLAU' }))
  assert.deepEqual(projiziereRenderNachweis({ lauf_id: 'rn-kaputt' }, ladeOptionen), { status: 'fehlt' })
})

test('projiziereRenderNachweis: Laden wirft ⇒ fehlt statt Wurf (QA N2)', () => {
  registriere('render-nachweis-rn-wurf', daten({ lauf_id: 'rn-wurf' }))
  const werfend = {
    ...ladeOptionen,
    schreiber: () => {
      throw new Error('Lineage nicht lesbar')
    },
  }
  assert.deepEqual(projiziereRenderNachweis({ lauf_id: 'rn-wurf' }, werfend), { status: 'fehlt' })
})

test('ladeQaDarstellung (F45 B3b-2b): Nachweis des Ausführungsschritts, ohne Nachweis mit render.json FEHLER, sonst null', () => {
  const wurzel = wegwerfOrdner('abnahme-pruefung-qa')
  const workflow = (laufId) => ({
    schritte: [{ schritt_id: 's-1', rolle: 'ausfuehrung', lauf_id: laufId }, { rolle: 'qa' }],
  })
  registriere('render-nachweis-qa-ok', daten({ lauf_id: 'qa-ok', ergebnis: 'ROT', ausgabe_ende: '✗ Überlauf' }))
  assert.deepEqual(ladeQaDarstellung(workflow('qa-ok'), ladeOptionen, wurzel), {
    ergebnis: 'ROT',
    ausgabe_ende: '✗ Überlauf',
  })
  // Ohne Nachweis und ohne render.json (Projekt ohne UI, auch ai-workforce selbst): kein Abschnitt.
  assert.equal(ladeQaDarstellung(workflow('qa-fehlt'), ladeOptionen, wurzel), null)
  assert.equal(ladeQaDarstellung({ schritte: 'kaputt' }, ladeOptionen, wurzel), null)
  // Ein Ordner namens render.json zählt nicht (wie renderNachweisFaellig: nur eine Datei).
  const mitOrdner = wegwerfOrdner('abnahme-pruefung-qa-ordner')
  mkdirSync(join(mitOrdner, 'render.json'))
  assert.equal(ladeQaDarstellung(workflow('qa-fehlt'), ladeOptionen, mitOrdner), null)
  // Mit render.json, aber ohne Nachweis zum Bau (F-1271, Registrierung gescheitert): nicht prüfbar statt still.
  writeFileSync(join(wurzel, 'render.json'), '{}')
  assert.deepEqual(ladeQaDarstellung(workflow('qa-fehlt'), ladeOptionen, wurzel), {
    ergebnis: 'FEHLER',
    ausgabe_ende: KEIN_NACHWEIS_TEXT,
  })
  assert.deepEqual(ladeQaDarstellung(workflow(null), ladeOptionen, wurzel), {
    ergebnis: 'FEHLER',
    ausgabe_ende: KEIN_NACHWEIS_TEXT,
  })
  assert.equal(ladeQaDarstellung(workflow('qa-ok'), ladeOptionen, wurzel).ergebnis, 'ROT')
})
