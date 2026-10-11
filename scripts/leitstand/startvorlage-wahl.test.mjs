/**
 * Datei: scripts/leitstand/startvorlage-wahl.test.mjs
 *
 * Zweck: F45 B1a-2 (F-1009) — Reihenfolge der Startvorlagen-Wahl: Umgebungsvariable vor Registereintrag
 * der Installation vor Standard; leere Umgebungsvariable zählt nicht; fremde Einträge (repo_pfad '../x')
 * werden nicht genommen; das echte projekte.json liefert startvorlagen/ai-workforce.json.
 *
 * Wird aufgerufen von:
 * - npm run test (node --test)
 */

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { raeumeVerzeichnis } from '../_aufraeumen.ts'
import { beschreibeStartvorlagenHerkunft, ermittleStartvorlage } from './startvorlage-wahl.mjs'

const BASIS = join(import.meta.dirname, '..', '..')
const STANDARD = 'startvorlagen/beispielprojekt.json'
const SELBST = { id: 'ai-workforce', repo_pfad: '.', startvorlage_pfad: 'startvorlagen/ai-workforce.json' }
const FREMD = { id: 'haushaltsbuch2', repo_pfad: '../haushaltsbuch2', startvorlage_pfad: 'startvorlagen/haushaltsbuch2.json' }

test('Umgebungsvariable hat Vorrang vor dem Register', () => {
  const wahl = ermittleStartvorlage({ umgebungsPfad: 'startvorlagen/x.json', projekte: [SELBST], projekteBasis: BASIS, standardPfad: STANDARD })
  assert.deepEqual(wahl, { pfad: 'startvorlagen/x.json', herkunft: 'umgebung', projektId: null })
})

test('ohne (oder mit leerer) Umgebungsvariable gilt der Registereintrag mit repo_pfad "."', () => {
  for (const umgebungsPfad of [undefined, '', '  ']) {
    const wahl = ermittleStartvorlage({ umgebungsPfad, projekte: [FREMD, SELBST], projekteBasis: BASIS, standardPfad: STANDARD })
    assert.deepEqual(wahl, { pfad: 'startvorlagen/ai-workforce.json', herkunft: 'register', projektId: 'ai-workforce' })
  }
  assert.match(beschreibeStartvorlagenHerkunft({ herkunft: 'register', projektId: 'ai-workforce' }), /Projektregister/)
})

test('fehlt der Eintrag der Installation: Standard, fremde Einträge zählen nicht', () => {
  const wahl = ermittleStartvorlage({ umgebungsPfad: undefined, projekte: [FREMD], projekteBasis: BASIS, standardPfad: STANDARD })
  assert.deepEqual(wahl, { pfad: STANDARD, herkunft: 'standard', projektId: null })
  assert.equal(ermittleStartvorlage({ projekte: [], projekteBasis: BASIS, standardPfad: STANDARD }).herkunft, 'standard')
})

test('Eintrag der Installation ohne startvorlage_pfad: kein Rückfall auf den Standard (pfad null)', () => {
  const wahl = ermittleStartvorlage({ projekte: [{ id: 'ai-workforce', repo_pfad: '.' }], projekteBasis: BASIS, standardPfad: STANDARD })
  assert.deepEqual(wahl, { pfad: null, herkunft: 'register', projektId: 'ai-workforce' })
})

test('Leitstand-Start mit Registereintrag auf fehlende Startvorlage bricht sichtbar ab (Exit 1, vor jedem Lock)', () => {
  const ordner = mkdtempSync(join(tmpdir(), 'startvorlage-wahl-'))
  try {
    const register = join(ordner, 'projekte.json')
    const eintrag = { ...SELBST, startvorlage_pfad: 'startvorlagen/gibt-es-nicht.json', profil_pfad: 'profiles/ai-workforce.json', basisverzeichnis: 'kontrollzustand', name: 'AI Workforce', status: 'IN_ENTWICKLUNG' }
    writeFileSync(register, JSON.stringify({ projekte_schema: 'v0', projekte: [eintrag] }))
    const umgebung = Object.fromEntries(Object.entries(process.env).filter(([name]) => name !== 'LEITSTAND_STARTVORLAGE_PFAD' && name !== 'NODE_TEST_CONTEXT'))
    const lauf = spawnSync(process.execPath, [join(BASIS, 'scripts', 'leitstand-server.mjs')], {
      cwd: BASIS,
      encoding: 'utf8',
      timeout: 60_000,
      env: { ...umgebung, LEITSTAND_PROJEKTE_PFAD: register, LEITSTAND_PROJEKTE_LOKAL_PFAD: join(ordner, 'lokal.json'), LEITSTAND_PORT: '0' },
    })
    assert.equal(lauf.status, 1, lauf.stdout + lauf.stderr)
    assert.match(lauf.stderr, /startvorlagen\/gibt-es-nicht\.json' aus dem Projektregister \(Eintrag 'ai-workforce'\) nicht ladbar — Start abgebrochen, kein stiller Rückfall/)
    assert.doesNotMatch(lauf.stdout, /Leitstand läuft/)
  } finally {
    raeumeVerzeichnis(ordner)
  }
})

test('das echte projekte.json liefert startvorlagen/ai-workforce.json', () => {
  const { projekte } = JSON.parse(readFileSync(join(BASIS, 'projekte.json'), 'utf8'))
  assert.equal(ermittleStartvorlage({ projekte, projekteBasis: BASIS, standardPfad: STANDARD }).pfad, 'startvorlagen/ai-workforce.json')
})
