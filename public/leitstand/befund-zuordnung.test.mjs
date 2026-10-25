/**
 * Datei: public/leitstand/befund-zuordnung.test.mjs
 *
 * Zweck: node:test für die Zuordnung Befund → Feature / Meilenstein / „Pflege & Fixes“ (befund-zuordnung.js, F45 B5b-2c-1):
 * Token-Grenzen an echten Grenzfällen aus state/findings.md (F-002, AF-F001, F6b/F6a, M3-Challenge, S-M3-01b, M1/M10), „erste
 * gewinnt“, nur offene P0–P2, Sortierung, und ein Rauchtest gegen den Arbeitsbaum (state/findings.md + docs/projekt/roadmap.json);
 * seit F45 B5b-2c-2-AB „Zugeordnet zu“ (zuordnungAnzeige).
 *
 * Wird aufgerufen von: npm run test (node --test)
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { parseFindings } from '../../src/workboard/findings.ts'
import { offenerP02Befund, ordneBefundeZu, roadmapIds, zuordnungAnzeige, zuordnungVon } from './befund-zuordnung.js'

/** Projektion wie GET …/roadmap (nur die Felder, die die Zuordnung liest). */
function projektion(meilensteine) {
  return { status: 'ok', meilensteine: meilensteine.map(([id, features]) => ({ id, status: 'LAEUFT', features: features.map((f) => ({ id: f, status: 'IN_ARBEIT' })) })) }
}

const ROADMAP = projektion([
  ['M1', ['F0', 'F1', 'F1B', 'F6a']],
  ['M3', ['F15', 'F18']],
  ['M10', ['F45']],
  ['F19-bridge', ['F19']],
  ['V1-Backlog', ['F37']],
])
const IDS = roadmapIds(ROADMAP)

/** Befund mit Feld „Feature/Run“. */
const befund = (featureRun, extra = {}) => ({ quelle: 'finding', id: 'F-1', typ: 'BUG', status: 'OFFEN', prioritaet: 'P2', featureRun, ...extra })

test('roadmapIds: Features und Meilensteine einer gültigen Projektion, sonst null', () => {
  assert.deepEqual([...IDS.features].sort(), ['F0', 'F1', 'F15', 'F18', 'F19', 'F1B', 'F37', 'F45', 'F6a'])
  assert.deepEqual([...IDS.meilensteine], ['M1', 'M3', 'M10', 'F19-bridge', 'V1-Backlog'])
  assert.equal(roadmapIds(null), null)
  assert.equal(roadmapIds({ status: 'fehler' }), null)
  assert.equal(roadmapIds({ status: 'nicht_vorhanden' }), null)
})

test('zuordnungVon: echte Grenzfälle der Token-Regel', () => {
  // F-002 / AF-F001: kein Feature (Bindestrich davor bzw. dahinter).
  assert.deepEqual(zuordnungVon(befund('Planung Vertrag `ebene2`, F-002 nachgezogen, 28.08.2026.'), IDS), { art: 'pflege', id: null })
  assert.deepEqual(zuordnungVon(befund('AF-F001-Planung, 28.08.2026.'), IDS), { art: 'pflege', id: null })
  // F6b ist nicht F6a, F1B ist ein eigenes Feature, F10 nicht F1.
  assert.deepEqual(zuordnungVon(befund('Challenge F6b / WS-B, 03.09.2026.'), IDS), { art: 'pflege', id: null })
  assert.deepEqual(zuordnungVon(befund('Challenge F6/F6a, 31.08.2026.'), IDS), { art: 'feature', id: 'F6a' })
  assert.deepEqual(zuordnungVon(befund('F1B-Abschluss'), IDS), { art: 'feature', id: 'F1B' })
  assert.deepEqual(zuordnungVon(befund('F10 Gegenchallenge'), IDS), { art: 'pflege', id: null })
  // Meilenstein: M3-Challenge trifft M3, S-M3-01b nicht, M1 nicht M10, M10 eigenständig.
  assert.deepEqual(zuordnungVon(befund('M3-Challenge, 09.09.2026.'), IDS), { art: 'meilenstein', id: 'M3' })
  assert.deepEqual(zuordnungVon(befund('Spike S-M3-01b (Codex-Sandbox-Kalibrierung), 11.09.2026.'), IDS), { art: 'pflege', id: null })
  assert.deepEqual(zuordnungVon(befund('M10-Schnitt'), IDS), { art: 'meilenstein', id: 'M10' })
  assert.deepEqual(zuordnungVon(befund('F-124-Verifikation/M1-Abschluss, 06.09.2026.'), IDS), { art: 'meilenstein', id: 'M1' })
  assert.deepEqual(zuordnungVon(befund('Nachtrag V1-Backlog'), IDS), { art: 'meilenstein', id: 'V1-Backlog' })
  // Feature mit Bindestrich-Zusatz, Feature vor Meilenstein, erste gewinnt (DEKLARIERT).
  assert.deepEqual(zuordnungVon(befund('F15-Akte, M1-Challenge'), IDS), { art: 'feature', id: 'F15' })
  assert.deepEqual(zuordnungVon(befund('M1-Challenge, dann F18'), IDS), { art: 'feature', id: 'F18' })
  assert.deepEqual(zuordnungVon(befund('Bereinigung F-088-Nachtrag (F0/F1/F3), 04.09.2026.'), IDS), { art: 'feature', id: 'F0' })
  assert.deepEqual(zuordnungVon(befund('F11 WS-1, betrifft F15 und F1'), IDS), { art: 'feature', id: 'F15' })
  assert.deepEqual(zuordnungVon(befund('M3 und M1'), IDS), { art: 'meilenstein', id: 'M3' })
  // „F19-bridge“: das Feature F19 greift vor dem Meilenstein (qa 8); Meilenstein vor Feature im Text ändert nichts.
  assert.deepEqual(zuordnungVon(befund('Nachtrag F19-bridge'), IDS), { art: 'feature', id: 'F19' })
  // Dieselbe Grenze wie nenntFeature: „_“ dahinter trennt (cr 2).
  assert.deepEqual(zuordnungVon(befund('F15_alt'), IDS), { art: 'feature', id: 'F15' })
  // Feld fehlt oder leer, kein Feature in der Roadmap.
  assert.deepEqual(zuordnungVon(befund(null), IDS), { art: 'pflege', id: null })
  assert.deepEqual(zuordnungVon(befund(''), IDS), { art: 'pflege', id: null })
  assert.deepEqual(zuordnungVon(befund('F99 unbekannt'), IDS), { art: 'pflege', id: null })
})

test('offenerP02Befund: nur offene Findings P0–P2', () => {
  assert.equal(offenerP02Befund(befund('x', { prioritaet: 'P0' })), true)
  assert.equal(offenerP02Befund(befund('x', { prioritaet: 'P3' })), false)
  assert.equal(offenerP02Befund(befund('x', { status: 'ERLEDIGT' })), false)
  assert.equal(offenerP02Befund(befund('x', { status: 'SONSTIGES' })), false)
  assert.equal(offenerP02Befund({ quelle: 'feature', id: 'F45', status: 'IN_ARBEIT' }), false)
  assert.equal(offenerP02Befund(null), false)
})

test('ordneBefundeZu: nur offene P0–P2, sortiert nach Priorität, dann Quellreihenfolge; ohne Daten null', () => {
  const workitems = [
    befund('F45 B5b', { id: 'F-10', prioritaet: 'P2' }),
    befund('F45', { id: 'F-11', prioritaet: 'P1' }),
    befund('M3-Challenge', { id: 'F-12', prioritaet: 'P2' }),
    befund('frei', { id: 'F-13', prioritaet: 'P2' }),
    befund('frei', { id: 'F-14', prioritaet: 'P0' }),
    befund('F45', { id: 'F-15', prioritaet: 'P3' }),
    befund('F45', { id: 'F-16', status: 'ERLEDIGT' }),
    { quelle: 'feature', typ: 'FEATURE', id: 'F45', status: 'IN_ARBEIT' },
  ]
  const z = ordneBefundeZu(workitems, ROADMAP)
  assert.deepEqual(z.jeFeature.get('F45').map((w) => w.id), ['F-11', 'F-10'])
  assert.deepEqual(z.jeMeilenstein.get('M3').map((w) => w.id), ['F-12'])
  assert.deepEqual(z.pflege.map((w) => w.id), ['F-14', 'F-13'])
  assert.equal(ordneBefundeZu(null, ROADMAP), null)
  assert.equal(ordneBefundeZu(undefined, ROADMAP), null)
  assert.equal(ordneBefundeZu(workitems, { status: 'fehler' }), null)
  const leer = ordneBefundeZu([], ROADMAP)
  assert.equal(leer.pflege.length, 0)
  assert.equal(leer.jeFeature.size, 0)
})

test('Rauchtest Arbeitsbaum: jeder offene P0–P2-Befund landet genau einmal, nie an einem Feature außerhalb der Roadmap', () => {
  const wurzel = join(import.meta.dirname, '..', '..')
  const roadmapJson = JSON.parse(readFileSync(join(wurzel, 'docs', 'projekt', 'roadmap.json'), 'utf8'))
  const roadmap = projektion(roadmapJson.meilensteine.map((m) => [m.id, m.features]))
  const { workitems } = parseFindings(readFileSync(join(wurzel, 'state', 'findings.md'), 'utf8'))
  const z = ordneBefundeZu(workitems, roadmap)
  const summe = (map) => [...map.values()].reduce((n, liste) => n + liste.length, 0)
  assert.equal(summe(z.jeFeature) + summe(z.jeMeilenstein) + z.pflege.length, workitems.filter(offenerP02Befund).length)
  for (const w of z.pflege) assert.equal(zuordnungVon(w, roadmapIds(roadmap)).art, 'pflege')
  // Nie ein Feature außerhalb der Roadmap.
  for (const id of z.jeFeature.keys()) assert.ok(roadmapIds(roadmap).features.has(id), id)
})

test('B5b-2c-2-AB zuordnungAnzeige: Feature bzw. Meilenstein mit Titel, sonst „ohne“ — Spur nur bei offen P0–P2 (Advisor A3)', () => {
  const mitTitel = { status: 'ok', meilensteine: [{ id: 'M5', titel: 'Fixpaket', status: 'LAEUFT', features: [{ id: 'F45', titel: 'Fixpaket F45', status: 'IN_ARBEIT' }] }] }
  assert.deepEqual(zuordnungAnzeige(befund('F45 B5b-2c-1'), mitTitel), { art: 'feature', id: 'F45', titel: 'Fixpaket F45', status: 'IN_ARBEIT' })
  assert.deepEqual(zuordnungAnzeige(befund('M5-Schnitt'), mitTitel), { art: 'meilenstein', id: 'M5', titel: 'Fixpaket', status: 'LAEUFT' })
  assert.deepEqual(zuordnungAnzeige(befund('F45', { status: 'ERLEDIGT', prioritaet: 'P3' }), mitTitel), { art: 'feature', id: 'F45', titel: 'Fixpaket F45', status: 'IN_ARBEIT' }, 'jede Priorität, jeder Status')
  assert.deepEqual(zuordnungAnzeige(befund('Harness'), mitTitel), { art: 'ohne', spur: true })
  assert.deepEqual(zuordnungAnzeige(befund('Harness', { prioritaet: 'P3' }), mitTitel), { art: 'ohne', spur: false })
  assert.deepEqual(zuordnungAnzeige(befund(undefined, { status: 'ERLEDIGT' }), mitTitel), { art: 'ohne', spur: false })
  // Ohne Titel: die ID.
  assert.deepEqual(zuordnungAnzeige(befund('F1'), ROADMAP), { art: 'feature', id: 'F1', titel: 'F1', status: 'IN_ARBEIT' })
  assert.equal(zuordnungAnzeige(befund('F45'), { status: 'nicht_vorhanden' }), null)
  assert.equal(zuordnungAnzeige(befund('F45'), null), null)
})
