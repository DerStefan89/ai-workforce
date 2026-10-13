/**
 * Datei: src/faehigkeiten/stand.test.ts
 *
 * Zweck: F45 F-2b-2c (F-1061 (1)) — Ablage des bekannten Stands der lokalen Fähigkeiten-Datei: fehlt/gültig/ungültig,
 * atomares Schreiben mit LF, kein Schreiben eines ungültigen Stands, Ablage neben der lokalen Datei.
 *
 * Wird aufgerufen von: npm run test (node --test)
 */

import assert from 'node:assert/strict'
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { raeumeVerzeichnis } from '../../scripts/_aufraeumen.ts'
import { type LokalStand, ladeLokalStand, schreibeLokalStand, standPfadFuer, validiereLokalStand } from './stand.ts'

const ordner = mkdtempSync(join(tmpdir(), 'fk-stand-'))
after(() => raeumeVerzeichnis(ordner))

const STAND: LokalStand = { faehigkeiten_stand_schema: 'v0', pfad: join(ordner, 'faehigkeiten.lokal.json'), hash: 'a'.repeat(64), zeitpunkt: '2026-10-13T10:00:00.000Z', quelle: 'route' }

test('standPfadFuer: neben der lokalen Datei', () => {
  assert.equal(standPfadFuer(join(ordner, 'faehigkeiten.lokal.json')), join(ordner, 'faehigkeiten.stand.json'))
})

test('ladeLokalStand: fehlt, gültig nach schreibeLokalStand (LF, kein Temp-Rest), ungültig bei JSON- und Formfehlern', () => {
  const pfad = join(ordner, 'faehigkeiten.stand.json')
  assert.deepEqual(ladeLokalStand(pfad), { zustand: 'fehlt' })
  schreibeLokalStand(pfad, STAND)
  assert.deepEqual(ladeLokalStand(pfad), { zustand: 'gueltig', stand: STAND })
  assert.ok(!readFileSync(pfad, 'utf8').includes('\r'))
  assert.deepEqual(
    readdirSync(ordner).filter((n) => n.endsWith('.tmp')),
    []
  )
  writeFileSync(pfad, '{kaputt')
  assert.equal(ladeLokalStand(pfad).zustand, 'ungueltig')
  writeFileSync(pfad, JSON.stringify({ ...STAND, quelle: 'neustart' }))
  assert.equal(ladeLokalStand(pfad).zustand, 'ungueltig', "quelle 'neustart' wird nie gespeichert")
})

test('validiereLokalStand / schreibeLokalStand: Hash nur sha256 oder fehlt, keine fremden Felder', () => {
  assert.deepEqual(validiereLokalStand(STAND), [])
  assert.deepEqual(validiereLokalStand({ ...STAND, hash: 'fehlt' }), [])
  assert.ok(validiereLokalStand({ ...STAND, hash: 'unbekannt' }).length > 0)
  assert.ok(validiereLokalStand({ ...STAND, extra: 1 }).length > 0)
  assert.throws(() => schreibeLokalStand(join(ordner, 'x.json'), { ...STAND, hash: 'nicht lesbar' }), /Stand ungültig/)
})
