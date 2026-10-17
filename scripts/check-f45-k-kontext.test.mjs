/**
 * Datei: scripts/check-f45-k-kontext.test.mjs
 *
 * Zweck: node:test-Fälle des Gates F45 K „Kontext-Diät“ (scripts/check-f45-k-kontext.mjs, features/F45/plan-k-v2.md): jeder
 * Fall (a1), (a2), (f), (v1), (v2), (v3) einzeln rot und sein Gegenstück grün, an Texten im Speicher und mit injiziertem git —
 * (a2) ist in einer `git archive`-Kopie nicht rot prüfbar (Advisor features/F45/advisor-k.md, Befund 5). Ein Fall prüft den
 * echten Baum (grün).
 *
 * Wird aufgerufen von:
 * - npm run test (node --test)
 *
 * Wichtig: rein bis auf den letzten Fall (liest den echten Baum, schreibt nichts).
 */

import assert from 'node:assert/strict'
import { join } from 'node:path'
import { test } from 'node:test'
import { DECKEL_PFAD, erhebeVerweise, gitignoreRegel, ladeDeckel, leseReferenz, pruefeBaum, pruefeDeckel, pruefeRueckverweise, pruefeVerweise, pruefeVersionen } from './check-f45-k-kontext.mjs'

const faelle = (befunde) => befunde.map((b) => b.slice(0, 4))

test('(a1) ein Byte über dem Deckel ⇒ rot; genau am Deckel ⇒ grün (Bytes, nicht Zeichen)', () => {
  assert.deepEqual(pruefeDeckel({ kernText: 'ä', deckel: 2, deckelMain: null }), [])
  assert.deepEqual(faelle(pruefeDeckel({ kernText: 'äb', deckel: 2, deckelMain: null })), ['(a1)'])
})

test('(a2) Deckel gegenüber main angehoben ⇒ rot; gleich oder gesenkt ⇒ kein (a2); ohne Referenz ⇒ kein (a2)', () => {
  assert.deepEqual(faelle(pruefeDeckel({ kernText: '', deckel: 101, deckelMain: 100 })), ['(a2)'])
  assert.deepEqual(pruefeDeckel({ kernText: '', deckel: 100, deckelMain: 100 }), [])
  assert.deepEqual(pruefeDeckel({ kernText: '', deckel: 99, deckelMain: 100 }), [])
  assert.deepEqual(pruefeDeckel({ kernText: '', deckel: 101, deckelMain: null }), [])
})

test('(f) Deckel fehlt, ist kein JSON oder keine positive Ganzzahl ⇒ rot', () => {
  assert.deepEqual(faelle(ladeDeckel(null).befunde), ['(f) '])
  assert.deepEqual(faelle(ladeDeckel('{').befunde), ['(f) '])
  for (const wert of [0, -1, 1.5, '100', null]) assert.deepEqual(faelle(ladeDeckel(JSON.stringify({ obergrenze_bytes: wert })).befunde), ['(f) '])
  assert.equal(ladeDeckel('{ "obergrenze_bytes": 16000 }').deckel, 16000)
  assert.equal(ladeDeckel('﻿{ "obergrenze_bytes": 16000 }').deckel, 16000)
})

test('leseReferenz: ohne git oder Basis ⇒ null mit Hinweis „(a2) nicht geprüft“; sonst Deckel der merge-base, sonst Spitze', () => {
  const wurzel = process.cwd()
  const git = (antworten) => (argumente) => {
    const antwort = antworten[argumente.join(' ')]
    if (antwort === undefined) throw new Error('git: nicht gefunden')
    return antwort
  }
  assert.match(leseReferenz(wurzel, git({})).hinweis, /\(a2\) nicht geprüft/)
  assert.equal(leseReferenz(wurzel, git({ 'rev-parse --show-toplevel': `${join(wurzel, '..')}\n` })).deckel, null)
  const basis = { 'rev-parse --show-toplevel': `${wurzel}\n`, 'merge-base HEAD origin/main': 'abc1234\n' }
  assert.equal(leseReferenz(wurzel, git(basis)).deckel, null)
  assert.equal(leseReferenz(wurzel, git({ ...basis, [`show abc1234:${DECKEL_PFAD}`]: '{ "obergrenze_bytes": 15000 }' })).deckel, 15000)
  assert.equal(leseReferenz(wurzel, git({ ...basis, [`show abc1234:${DECKEL_PFAD}`]: '{' })).deckel, null)
  assert.equal(leseReferenz(wurzel, git({ ...basis, [`show origin/main:${DECKEL_PFAD}`]: '{ "obergrenze_bytes": 14000 }' })).deckel, 14000)
})

test('(v1) Grammatik: Datei mit Endung, Ordner mit Schluss-/, relativer Link; Feldpfade und fremde Wurzeln nicht', () => {
  const text = [
    '`docs/x.md` `name.mjs` `src/` `plugins/data` `skills/` `daten.abgelehnt_durch_stefan` `.git/objects`',
    '[a](kette.md) [b](https://example.org) [c](#anker) [d](/api/x) [e](modul.md#abschnitt) [f](arbeit.md "Titel")',
  ].join('\n')
  assert.deepEqual(
    erhebeVerweise(text).map(({ art, pfad }) => `${art}:${pfad}`),
    ['datei:docs/x.md', 'datei:name.mjs', 'ordner:src/', 'ordner:skills/', 'link:kette.md', 'link:modul.md', 'link:arbeit.md'],
  )
})

test('(v1) fehlende Datei, fehlender Ordner unter einer Wurzel, toter Link ⇒ rot; fremde Wurzel und gitignoriert ⇒ kein Befund', () => {
  const vorhanden = new Set(['docs/x.md', 'src/', 'docs/architektur/kette.md'])
  const kontext = {
    datei: 'ARCHITECTURE.md',
    existiert: (pfad) => vorhanden.has(pfad.replace(/\\/g, '/')),
    dateinamen: new Set(['name.mjs']),
    ignoriert: gitignoreRegel('geheim.json\n'),
    wurzelEintraege: new Set(['docs', 'src']),
    ordnerDerDatei: 'docs/architektur',
  }
  const gruen = '`docs/x.md` `name.mjs` `src/` `skills/` `geheim.json` [k](kette.md)'
  assert.deepEqual(pruefeVerweise({ ...kontext, text: gruen }), [])
  assert.deepEqual(faelle(pruefeVerweise({ ...kontext, text: '`docs/y.md`' })), ['(v1)'])
  assert.deepEqual(faelle(pruefeVerweise({ ...kontext, text: '`anders.mjs`' })), ['(v1)'])
  assert.deepEqual(faelle(pruefeVerweise({ ...kontext, text: '`src/neu/`' })), ['(v1)'])
  assert.deepEqual(faelle(pruefeVerweise({ ...kontext, text: '[k](fehlt.md)' })), ['(v1)'])
})

test('(v2) Detaildatei ohne Rückverweis ⇒ rot; mit Rückverweis ⇒ grün', () => {
  assert.deepEqual(pruefeRueckverweise('siehe `docs/architektur/kette.md`', ['kette.md']), [])
  assert.deepEqual(faelle(pruefeRueckverweise('siehe docs/architektur/kette.md', ['kette.md'])), ['(v2)'])
  assert.deepEqual(faelle(pruefeRueckverweise('<!-- `docs/architektur/kette.md` -->', ['kette.md'])), ['(v2)'])
})

test('(v3) Versionsnummer in einer Detaildatei ⇒ rot; Datum ⇒ grün', () => {
  assert.deepEqual(pruefeVersionen('d.md', 'Stand 17.10.2026'), [])
  assert.deepEqual(faelle(pruefeVersionen('d.md', 'Version 2.5.9')), ['(v3)'])
  assert.deepEqual(faelle(pruefeVersionen('d.md', 'Node v24')), ['(v3)'])
})

test('echter Baum: ARCHITECTURE.md und docs/architektur/ grün', () => {
  assert.deepEqual(pruefeBaum(join(import.meta.dirname, '..')).befunde, [])
})
