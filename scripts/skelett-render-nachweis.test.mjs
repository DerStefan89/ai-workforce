/**
 * Datei: scripts/skelett-render-nachweis.test.mjs
 *
 * Zweck: F45 B3b-1 (Plan features/F45/plan-b3b1-v2.md, Advisor-Auflage 7) — reine Funktionen des Render-Nachweises im
 * Projekt-Skelett (vorlagen/projekt-skelett/scripts/render-nachweis.mjs): Pfad-Ausbruch des kurzlebigen Servers,
 * render.json-Prüfung, Bewertung und Hinweise (F-1262), das Protokoll (schreibeProtokoll, F45 B3b-2a-1) und dass Gründe
 * auf stdout stehen (Kindprozess ohne render.json, QA M1). Der echte Browserlauf steht im Probelauf (features/F45/nachweise/b3b1/).
 *
 * Wird aufgerufen von:
 * - npm run test (node --test)
 */

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  bewerte,
  hinweise,
  leseKonfig,
  loeseDateiPfad,
  schreibeProtokoll,
  VARIANTEN,
} from '../vorlagen/projekt-skelett/scripts/render-nachweis.mjs'
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

test('Bewertung: HTTP-Status, laufende Animation unter reduzierter Bewegung, Überlauf, Budget', () => {
  const budget = { lcpMs: 2500, bytes: 1000 }
  const [hell, , mobil, reduziert] = VARIANTEN
  const basis = { seite: '/', variante: 'x', status: 200, bilder: [], animationen: 1, laufend: 1 }
  assert.match(bewerte({ ...basis, status: 404 }, hell, budget)[0] ?? '', /HTTP 404/)
  assert.equal(bewerte({ ...basis, status: 0 }, hell, budget).length, 1)
  assert.equal(bewerte(basis, reduziert, budget).length, 1)
  assert.equal(bewerte(basis, hell, budget).length, 0)
  assert.equal(bewerte({ ...basis, ueberlauf: true }, mobil, budget).length, 1)
  assert.equal(bewerte({ ...basis, lcpMs: 3000, bytes: 2000 }, hell, budget).length, 2)
})

test('F-1262: LCP nicht messbar ist ein Hinweis, kein Befund; Bytes-Budget bleibt rot', () => {
  const budget = { lcpMs: 2500, bytes: 1000 }
  const reduziert = VARIANTEN[3]
  const basis = { seite: '/', variante: 'reduziert', status: 200, bilder: [], animationen: 1, laufend: 0 }
  assert.deepEqual(bewerte({ ...basis, lcpMs: null, bytes: 1 }, reduziert, budget), [])
  assert.equal(hinweise({ ...basis, lcpMs: null, bytes: 1 }).length, 1)
  assert.match(hinweise({ ...basis, lcpMs: null, bytes: 1 })[0] ?? '', /LCP nicht messbar/)
  assert.deepEqual(hinweise({ ...basis, lcpMs: 900, bytes: 1 }), [])
  assert.deepEqual(hinweise(basis), [])
  const mitBytes = bewerte({ ...basis, lcpMs: null, bytes: 2000 }, reduziert, budget)
  assert.equal(mitBytes.length, 1)
  assert.match(mitBytes[0] ?? '', /2000 Bytes > 1000/)
  assert.equal(bewerte({ ...basis, lcpMs: null, bytes: 1, laufend: 2 }, reduziert, budget).length, 1)
})

test('F-1262: Protokoll mit nur Hinweisen ist grün und nennt die Hinweise (QA TC-F)', () => {
  const ausgabe = join(wegwerfOrdner('skelett-render-protokoll'), '.render-nachweis')
  mkdirSync(ausgabe, { recursive: true })
  const konfig = leseKonfig('{}')
  const e = {
    seite: '/',
    variante: 'reduziert',
    status: 200,
    bilder: [],
    animationen: 0,
    laufend: 0,
    lcpMs: null,
    bytes: 1,
  }
  const ergebnis = { ...e, befunde: bewerte(e, VARIANTEN[3], konfig.budget), hinweise: hinweise(e) }
  const { befunde, hinweise: alle } = schreibeProtokoll(ausgabe, konfig, [ergebnis])
  assert.deepEqual(befunde, [])
  assert.equal(alle.length, 1)
  const md = readFileSync(join(ausgabe, 'protokoll.md'), 'utf8')
  assert.match(md, /## Hinweise \(ohne Einfluss auf das Ergebnis\)\n\n- \/ \(reduziert\): LCP nicht messbar/)
  assert.match(md, /Ergebnis: \*\*grün\*\*/)
  const json = JSON.parse(readFileSync(join(ausgabe, 'protokoll.json'), 'utf8'))
  assert.equal(json.ergebnis, 'grün')
  assert.equal(json.hinweise.length, 1)
})

test('Gründe stehen auf stdout, nicht nur auf stderr (QA M1: die Workforce hält das Ende von stdout fest)', () => {
  const leer = wegwerfOrdner('skelett-render-stdout')
  const skript = join(import.meta.dirname, '..', 'vorlagen', 'projekt-skelett', 'scripts', 'render-nachweis.mjs')
  const lauf = spawnSync(process.execPath, [skript], { cwd: leer, encoding: 'utf8', timeout: 30000 })
  assert.equal(lauf.status, 1)
  assert.match(lauf.stdout, /✗ render\.json fehlt/)
})
