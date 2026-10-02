/**
 * Datei: scripts/leitstand-nicht-gestartet.test.mjs
 *
 * Zweck: F-986 (b) — baueNichtGestartetProjektion (GET /api/laeufe/<laufId>, detail.nichtGestartet)
 * liest Ergebnis und Grund einer terminalen Wirkungsmarke ohne RUN_PREPARED lesend aus einer echten
 * Checkpoint-Kette (eigenes Temp-Verzeichnis) — Grund aus invocation_policy.grund, begruendung oder
 * grund — und liefert für gestartete Läufe null.
 */

import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { schreibeWirkungsmarke, stelleLaufstatusFest } from '../src/checkpoint-store/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'
import { baueNichtGestartetProjektion } from './leitstand-server.mjs'

const PROFIL = { pfad: 'profiles/beispielprojekt.json', hash: 'a'.repeat(64), version: 1 }
const STILL = () => {}

function mitKette(fn) {
  const basisVerzeichnis = mkdtempSync(join(tmpdir(), 'f986-'))
  try {
    fn({ basisVerzeichnis, schreiber: STILL })
  } finally {
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

test('verweigerte Startfreigabe: Ergebnis und Grund aus der terminalen Marke', () => {
  mitKette((optionen) => {
    const grund = "Drift im Gültigkeitsschlüssel: 'arbeitsverzeichnis_pfad' (E-188)"
    schreibeWirkungsmarke('lauf-verweigert', PROFIL, 'terminal', { ergebnis: 'VERWEIGERT', daten: { invocation_policy: { grund } } }, optionen)
    const laufStatus = stelleLaufstatusFest('lauf-verweigert', optionen)
    assert.strictEqual(laufStatus.status, 'NICHT_GESTARTET')
    assert.deepStrictEqual(baueNichtGestartetProjektion('lauf-verweigert', laufStatus, optionen.basisVerzeichnis), { ergebnis: 'VERWEIGERT', grund })
  })
})

test('terminale Marke ohne Grund: grund null, nicht geraten', () => {
  mitKette((optionen) => {
    schreibeWirkungsmarke('lauf-ohne-grund', PROFIL, 'terminal', { ergebnis: 'VERWEIGERT' }, optionen)
    const laufStatus = stelleLaufstatusFest('lauf-ohne-grund', optionen)
    assert.deepStrictEqual(baueNichtGestartetProjektion('lauf-ohne-grund', laufStatus, optionen.basisVerzeichnis), { ergebnis: 'VERWEIGERT', grund: null })
  })
})

test('Grund aus den anderen Schreibern: daten.begruendung (Autorisierung) und daten.grund (Human-Transport)', () => {
  mitKette((optionen) => {
    schreibeWirkungsmarke('lauf-autorisierung', PROFIL, 'terminal', { ergebnis: 'VERWEIGERT', daten: { begruendung: 'Autorisierung abgelehnt' } }, optionen)
    schreibeWirkungsmarke('lauf-transport', PROFIL, 'terminal', { ergebnis: 'FEHLGESCHLAGEN', daten: { grund: 'Transport gescheitert' } }, optionen)
    assert.deepStrictEqual(baueNichtGestartetProjektion('lauf-autorisierung', stelleLaufstatusFest('lauf-autorisierung', optionen), optionen.basisVerzeichnis), { ergebnis: 'VERWEIGERT', grund: 'Autorisierung abgelehnt' })
    assert.deepStrictEqual(baueNichtGestartetProjektion('lauf-transport', stelleLaufstatusFest('lauf-transport', optionen), optionen.basisVerzeichnis), { ergebnis: 'FEHLGESCHLAGEN', grund: 'Transport gescheitert' })
  })
})

test('gestarteter Lauf (RUN_PREPARED vorhanden): null', () => {
  mitKette((optionen) => {
    schreibeWirkungsmarke('lauf-gestartet', PROFIL, 'run_prepared', {}, optionen)
    const laufStatus = stelleLaufstatusFest('lauf-gestartet', optionen)
    assert.notStrictEqual(laufStatus.status, 'NICHT_GESTARTET')
    assert.strictEqual(baueNichtGestartetProjektion('lauf-gestartet', laufStatus, optionen.basisVerzeichnis), null)
  })
})

test('NICHT_GESTARTET ohne terminale Marke: null', () => {
  assert.strictEqual(baueNichtGestartetProjektion('egal', { status: 'NICHT_GESTARTET', terminaleOhneRunPrepared: [] }, 'egal'), null)
})
