/**
 * Datei: scripts/skelett-render-nachweis.test.mjs
 *
 * Zweck: F45 B3b-1 (Plan features/F45/plan-b3b1-v2.md, Advisor-Auflage 7) — reine Funktionen des Render-Nachweises im
 * Projekt-Skelett (vorlagen/projekt-skelett/scripts/render-nachweis.mjs): Pfad-Ausbruch des kurzlebigen Servers,
 * render.json-Prüfung und Bewertung. Der echte Browserlauf steht im Probelauf (features/F45/nachweise/b3b1/).
 *
 * Wird aufgerufen von:
 * - npm run test (node --test)
 */

import assert from 'node:assert/strict'
import { join } from 'node:path'
import { test } from 'node:test'
import { bewerte, leseKonfig, loeseDateiPfad, VARIANTEN } from '../vorlagen/projekt-skelett/scripts/render-nachweis.mjs'
import { wegwerfOrdner } from './_wegwerf.ts'

const dist = join(wegwerfOrdner('skelett-render-nachweis'), 'dist')

test('Pfad im Ordner wird aufgelöst, Ausbruch abgelehnt', () => {
  assert.equal(loeseDateiPfad(dist, '/index.html?x=1'), join(dist, 'index.html'))
  assert.equal(loeseDateiPfad(dist, '/'), dist)
  for (const ausbruch of [
    '/../geheim.txt',
    '/%2e%2e/geheim.txt',
    '/..%5c..%5cgeheim.txt',
    '/../dist-x/a.html',
    '/%00',
  ]) {
    assert.equal(loeseDateiPfad(dist, ausbruch), null, ausbruch)
  }
  assert.equal(loeseDateiPfad(dist, '/%E0%A4%A'), null)
})

test('render.json: {} nimmt Standardwerte, ungültige Werte werfen', () => {
  assert.deepEqual(leseKonfig('{}'), {
    ordner: 'dist',
    url: null,
    seiten: ['/'],
    bildfolgeMs: [0, 150, 400, 1000],
    budget: { lcpMs: 2500, bytes: 1_000_000 },
  })
  assert.equal(leseKonfig('{"url":"http://localhost:5173/"}').ordner, null)
  assert.equal(leseKonfig('﻿{"ordner":"public"}').ordner, 'public')
  for (const falsch of [
    '[]',
    '{"url":"https://beispiel.de/"}',
    '{"url":"http://localhost/","ordner":"dist"}',
    '{"ordner":"../x"}',
    '{"seiten":["preise"]}',
    '{"seiten":["//beispiel.de/"]}',
    '{"seiten":["/\\\\beispiel.de"]}',
    '{"seiten":["/a/b","/a-b"]}',
    '{"bildfolgeMs":[0,0]}',
    '{"budget":{"bytes":0}}',
    '{"budget":5}',
    '{"seite":["/"]}',
  ]) {
    assert.throws(() => leseKonfig(falsch), undefined, falsch)
  }
})

test('Bewertung: HTTP-Status, laufende Animation unter reduzierter Bewegung, Überlauf, Budget, LCP nicht messbar', () => {
  const budget = { lcpMs: 2500, bytes: 1000 }
  const [hell, , mobil, reduziert] = VARIANTEN
  const basis = { seite: '/', variante: 'x', status: 200, bilder: [], animationen: 1, laufend: 1 }
  assert.match(bewerte({ ...basis, status: 404 }, hell, budget)[0] ?? '', /HTTP 404/)
  assert.equal(bewerte({ ...basis, status: 0 }, hell, budget).length, 1)
  assert.equal(bewerte(basis, reduziert, budget).length, 1)
  assert.equal(bewerte(basis, hell, budget).length, 0)
  assert.equal(bewerte({ ...basis, ueberlauf: true }, mobil, budget).length, 1)
  assert.equal(bewerte({ ...basis, lcpMs: 3000, bytes: 2000 }, hell, budget).length, 2)
  assert.match(bewerte({ ...basis, lcpMs: null, bytes: 1 }, hell, budget)[0] ?? '', /nicht messbar/)
})
