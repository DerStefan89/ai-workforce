/**
 * Datei: public/leitstand/rueckfrage-daten.test.mjs
 *
 * Zweck: node:test für rueckfrage-daten.js (F45 B2b-3b-2b-2a-2): Maskierung je Ort (Auflage B12, Advisor M4), Instanz des aktiven
 * Laufs (Advisor V6), Kanal-Einträge, Historie mit Herkunft, Restzeit.
 *
 * Wird aufgerufen von: npm run check (node --test)
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ERHALTEN, baueEntschiedene, baueKanalEintraege, befehlsZeilen, hatMasken, instanzPraefixDesLaufs, naechsteFrist, restzeit, zerlegeMitMasken } from './rueckfrage-daten.js'

test('Maskierung: Bidi, CR, BEL, einzelnes Surrogat, Zeilentrenner und ⟦ ⟧ werden Marken; \\n/\\t je Ort', () => {
  assert.deepEqual(zerlegeMitMasken('a‮b', ERHALTEN.frage), [{ text: 'a' }, { maske: 'U+202E' }, { text: 'b' }])
  assert.deepEqual(zerlegeMitMasken('x\r\u0007', ERHALTEN.befehl), [{ text: 'x' }, { maske: 'U+000D' }, { maske: 'U+0007' }])
  assert.deepEqual(zerlegeMitMasken('\uD800', ERHALTEN.frage), [{ maske: 'U+D800' }])
  assert.deepEqual(zerlegeMitMasken(' ', ERHALTEN.befehl), [{ maske: 'U+2028' }])
  assert.deepEqual(zerlegeMitMasken('⟦U+202E⟧', ERHALTEN.frage), [{ maske: 'U+27E6' }, { text: 'U+202E' }, { maske: 'U+27E7' }])
  assert.deepEqual(zerlegeMitMasken('a\n\tb', ERHALTEN.befehl), [{ text: 'a\n\tb' }])
  assert.deepEqual(zerlegeMitMasken('a\n\tb', ERHALTEN.frage), [{ text: 'a\n' }, { maske: 'U+0009' }, { text: 'b' }])
  assert.deepEqual(zerlegeMitMasken('a\nb', ERHALTEN.option), [{ text: 'a' }, { maske: 'U+000A' }, { text: 'b' }])
  assert.deepEqual(zerlegeMitMasken('😀 ok', ERHALTEN.frage), [{ text: '😀 ok' }], 'ein gültiges Surrogatpaar bleibt')
  assert.deepEqual(zerlegeMitMasken(undefined), [])
  assert.equal(hatMasken('a​b', ERHALTEN.frage), true)
  assert.equal(hatMasken('a b', ERHALTEN.frage), false, 'NBSP bleibt (DEKLARIERTE Grenze)')
})

test('instanzPraefixDesLaufs: Treffer ⇒ Projektpräfix; kein Treffer ⇒ /api ohne treffer; ohne Lauf bzw. laufId null ⇒ null', () => {
  const projekte = [{ id: 'ai-workforce', laufAktiv: false }, { id: 'p 1', laufAktiv: true }]
  assert.deepEqual(instanzPraefixDesLaufs(projekte, { aktiv: true, laufId: 'l' }), { praefix: '/api/projekte/p%201', projektId: 'p 1', treffer: true })
  assert.deepEqual(instanzPraefixDesLaufs([{ id: 'x', laufAktiv: false }], { aktiv: true, laufId: 'l' }), { praefix: '/api', projektId: null, treffer: false })
  assert.deepEqual(instanzPraefixDesLaufs(null, { aktiv: true, laufId: 'l' }), { praefix: '/api', projektId: null, treffer: false })
  assert.equal(instanzPraefixDesLaufs(projekte, { aktiv: true, laufId: null }), null)
  assert.equal(instanzPraefixDesLaufs(projekte, { aktiv: false, laufId: 'l' }), null)
  assert.equal(instanzPraefixDesLaufs(projekte, undefined), null)
})

test('baueKanalEintraege: Befehl, Frage, sonstige Rechte; unvollständige fallen weg; Felder für attention-daten', () => {
  const instanz = { praefix: '/api/projekte/p1', projektId: 'p1' }
  const liste = baueKanalEintraege(
    [
      { id: 'a', lauf_id: 'l', art: 'rechte', tool_name: 'Bash', befehl: 'ls\npwd', seit: 's', frist: '2026-10-17T10:10:00Z' },
      { id: 'b', lauf_id: 'l', art: 'frage', tool_name: 'frage_stefan', frage: 'Welche?', optionen: ['A', 3, ''], seit: 's', frist: '2026-10-17T10:10:00Z' },
      { id: 'c', lauf_id: 'l', art: 'rechte', tool_name: 'WebFetch', frist: '2026-10-17T10:10:00Z' },
      { id: 'ohne-frist', art: 'rechte' },
      null,
    ],
    instanz
  )
  assert.deepEqual(
    liste.map((e) => [e.id, e.typ, e.art, e.hash, e.praefix, e.projektId]),
    [
      ['a', 'befehl', 'kanal', null, '/api/projekte/p1', 'p1'],
      ['b', 'frage', 'kanal', null, '/api/projekte/p1', 'p1'],
      ['c', 'rechte', 'kanal', null, '/api/projekte/p1', 'p1'],
    ]
  )
  assert.equal(liste[0].befehl, 'ls\npwd')
  assert.deepEqual(liste[1].optionen, ['A', ''])
  assert.deepEqual(baueKanalEintraege('kaputt', instanz), [])
})

test('baueEntschiedene: nicht_browser fällt auf; fehlendes Feld ⇒ leer', () => {
  const liste = baueEntschiedene([
    { id: 'a', lauf_id: 'l', art: 'rechte', tool_name: 'Bash', befehl: 'ls', ergebnis: 'stefan_erlaubt', herkunft: 'nicht_browser', entschieden_am: 'z' },
    { id: 'b', art: 'frage', frage: 'F', ergebnis: 'frage_beantwortet', herkunft: 'browser', antwort: 'ja' },
    { id: 'c', art: 'rechte', ergebnis: 'lauf_beendet' },
    { id: 'kein-ergebnis' },
  ])
  assert.deepEqual(
    liste.map((e) => [e.id, e.nichtBrowser, e.herkunft]),
    [
      ['a', true, 'nicht_browser'],
      ['b', false, 'browser'],
      ['c', false, null],
    ]
  )
  assert.equal(liste[1].antwort, 'ja')
  assert.deepEqual(baueEntschiedene(undefined), [])
})

test('befehlsZeilen, restzeit, naechsteFrist', () => {
  assert.deepEqual(befehlsZeilen('a\n\nb'), { zeilen: ['a', '', 'b'], zeichen: 4 })
  assert.deepEqual(befehlsZeilen(''), { zeilen: [''], zeichen: 0 })
  const jetzt = Date.parse('2026-10-17T10:00:00Z')
  assert.deepEqual(restzeit('2026-10-17T10:07:42Z', jetzt), { ms: 462000, abgelaufen: false, text: '7:42' })
  assert.deepEqual(restzeit('2026-10-17T09:00:00Z', jetzt), { ms: 0, abgelaufen: true, text: '0:00' })
  assert.equal(restzeit('kaputt', jetzt), null)
  assert.equal(naechsteFrist([{ frist: '2026-10-17T10:09:00Z' }, { frist: '2026-10-17T10:01:30Z' }], jetzt).text, '1:30')
  assert.equal(naechsteFrist([], jetzt), null)
})
