/**
 * Datei: public/leitstand/rueckfrage-anzeige.test.mjs
 *
 * Zweck: node:test für rueckfrage-anzeige.js (F45 B2b-3b-2b-2a-2): Befehl wörtlich und vollständig mit Zeilennummern, alles escaped,
 * Masken sichtbar, nur zwei Entscheidungen, leere Option gesperrt, Restzeit, Historie mit „nicht aus dem Browser“, Band-Text.
 *
 * Wird aufgerufen von: npm run check (node --test)
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { kanalBandText, renderKanalKarte, renderZuletzt, restzeitText } from './rueckfrage-anzeige.js'
import { baueEntschiedene, baueKanalEintraege } from './rueckfrage-daten.js'

const FRIST = '2026-10-17T10:10:00Z'
const JETZT = Date.parse('2026-10-17T10:00:00Z')
const eintrag = (roh) => baueKanalEintraege([{ id: 'r1', lauf_id: 'lauf-1', seit: '2026-10-17T10:00:00Z', frist: FRIST, ...roh }], { praefix: '/api', projektId: null })[0]

test('Bash: jede Zeile in der Liste, nichts gekürzt, alles escaped; Zeilen- und Zeichenzahl; genau zwei Entscheidungen', () => {
  const zeilen = ['echo start', ...Array.from({ length: 1200 }, () => ''), 'rm -rf / </pre><img src=x onerror=alert(1)>']
  const html = renderKanalKarte(eintrag({ art: 'rechte', tool_name: 'Bash', befehl: zeilen.join('\n') }))
  assert.equal(html.match(/<li>/g).length, 1202)
  assert.match(html, /rm -rf \/ &lt;\/pre&gt;&lt;img src=x onerror=alert\(1\)&gt;/)
  assert.doesNotMatch(html, /<img/)
  assert.match(html, /1\.202 Zeilen/)
  assert.deepEqual(
    [...html.matchAll(/data-entscheidung="([^"]+)"/g)].map((m) => m[1]),
    ['einmal_erlauben', 'ablehnen']
  )
  assert.doesNotMatch(html, /class="button primary/, 'kein Hauptknopf')
  assert.match(html, /data-kanal-restzeit><\/span>/, 'Restzeit-Element leer, Füllung per textContent')
})

test('Frage: Masken in Frage und Option, Hinweis, leere Option gesperrt, freies Feld', () => {
  const html = renderKanalKarte(eintrag({ art: 'frage', tool_name: 'frage_stefan', frage: 'Nimm‮ A?', optionen: ['A​', '  ', '<b>B</b>'] }))
  assert.match(html, /⟦U\+202E⟧/)
  assert.match(html, /⟦U\+200B⟧/)
  assert.match(html, /rueckfrage-hinweis/)
  assert.match(html, /data-option-index="1" disabled/)
  assert.match(html, /&lt;b&gt;B&lt;\/b&gt;/)
  assert.match(html, /<textarea id="kanal-antwort-r1"[^>]*maxlength="2000"/)
  assert.doesNotMatch(html, /data-entscheidung=/, 'eine Frage hat keine Rechte-Knöpfe')
})

test('Restzeit und Band', () => {
  const e = eintrag({ art: 'rechte', tool_name: 'Bash', befehl: 'ls' })
  assert.equal(restzeitText(e, JETZT), 'noch 10:00 min')
  assert.equal(restzeitText(e, JETZT + 3600000), 'Frist abgelaufen — wird abgelehnt')
  assert.equal(kanalBandText([], 600000, JETZT).wartend, false)
  assert.match(kanalBandText([], 600000, JETZT).text, /höchstens 10 min/)
  const zwei = kanalBandText([e, { ...e, frist: '2026-10-17T10:02:05Z' }], 600000, JETZT)
  assert.equal(zwei.wartend, true)
  assert.match(zwei.text, /2 Rückfragen warten auf dich — nächste Frist in 2:05 min/)
})

test('Zuletzt entschieden: nicht aus dem Browser als rote Marke, Texte escaped, leer ⇒ kein HTML', () => {
  assert.equal(renderZuletzt([]), '')
  const html = renderZuletzt(
    baueEntschiedene([
      { id: 'a', art: 'rechte', tool_name: 'Bash', befehl: '<script>x</script>', ergebnis: 'stefan_erlaubt', herkunft: 'nicht_browser' },
      { id: 'b', art: 'frage', frage: 'F', ergebnis: 'frage_beantwortet', herkunft: 'browser', antwort: 'ja' },
      { id: 'c', art: 'rechte', ergebnis: 'neu_unbekannt' },
    ])
  )
  assert.match(html, /class="badge fehler">nicht aus dem Browser/)
  assert.match(html, /nicht-browser/)
  assert.match(html, /aus dem Browser<\/span>/)
  assert.doesNotMatch(html, /<script>/)
  assert.match(html, /neu_unbekannt/)
})

test('Korrekturrunde (qa 2, code-reviewer 4/5, design-guardian 3): Band bei defektem Abruf auffällig; leere Option mit data-kanal-leer; Meldung fokussierbar', () => {
  const defekt = kanalBandText(null, 600000, JETZT)
  assert.equal(defekt.wartend, true)
  assert.match(defekt.text, /nicht abrufbar/)
  assert.equal(kanalBandText(undefined, 600000, JETZT).wartend, false, 'lädt ⇒ schlanke Zeile')
  const html = renderKanalKarte(eintrag({ art: 'frage', tool_name: 'frage_stefan', frage: 'F', optionen: [' ', 'B'] }))
  assert.match(html, /data-option-index="0" disabled data-kanal-leer/)
  assert.doesNotMatch(html, /data-option-index="1" disabled/)
  assert.match(html, /data-kanal-meldung/)
  assert.match(html, /tabindex="-1" data-kanal-meldung/)
  assert.match(html, /placeholder="Antwort eingeben"/)
  assert.match(html, /<h3 tabindex="-1">/, 'Fokusziel nach dem Entfernen der vorigen Karte (design-guardian Nachpass 1)')
})
