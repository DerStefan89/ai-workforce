/**
 * Datei: public/leitstand/live-chip.test.mjs
 *
 * Zweck: node:test für die reine Textbildung des Live-Chips (F46 D0, live-chip.js, baueLiveChip):
 * Lauf aktiv mit Eintrag, kein Lauf, Eintrag ohne Titel bzw. fehlend (gekürzte laufId; ohne Eintrag Link
 * auf #/ausfuehrungen), Titel mit HTML wird escaped,
 * Rolle über rollen-anzeige.js, unbekannter Zustand ergibt keinen Chip. Seit F46 D5: Ziel #/live, Rolle aus
 * dem Lauf-Detail (rolleJeLauf) vor der Rolle des Eintrags.
 *
 * Wird aufgerufen von: `npm test` (node --test)
 *
 * Wichtig: Das Rendern in #kopf-live-chip (DOM) belegt der Render-Nachweis
 * features/F46/nachweise/d0/. Die Texte kommen aus dem deutschen Wörterbuch (Standardsprache in Node).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { baueLiveChip } from './live-chip.js'

const LAUF_ID = '3f2a9c71-5b4e-4d0a-9e1f-2c7b8a6d4e10'
const lauf = (eintrag) => ({ laufId: LAUF_ID, laufStatus: { status: 'NICHT_GESTARTET' }, ...eintrag })

test('Lauf aktiv: „Workforce arbeitet · <Titel>“, Link auf #/live (F46 D5)', () => {
  const chip = baueLiveChip({ aktiverLauf: { aktiv: true, laufId: LAUF_ID }, laeufe: [lauf({ auftragsbezug: { auftragId: 'a-1', titel: 'Anmeldung mit Passkey' } })] })
  assert.equal(chip.aktiv, true)
  assert.equal(chip.href, '#/live')
  assert.equal(chip.titel, 'Workforce arbeitet · Anmeldung mit Passkey')
  assert.match(chip.html, /<span class="live-chip-punkt" aria-hidden="true"><\/span>/)
  assert.match(chip.html, /<span class="live-chip-zustand">Workforce arbeitet<\/span><span class="live-chip-eintrag"> · Anmeldung mit Passkey<\/span>/)
  assert.doesNotMatch(chip.html, /aria-live/)
})

test('Lauf aktiv: Rolle lesbar über rollen-anzeige.js vor dem Titel; unbekannte Rolle bleibt ID', () => {
  const mitRolle = baueLiveChip({ aktiverLauf: { aktiv: true, laufId: LAUF_ID }, laeufe: [lauf({ rolle: 'code-reviewer', ziel: 'Review F46' })] })
  assert.match(mitRolle.titel, /^Workforce arbeitet · .+ · Review F46$/)
  assert.doesNotMatch(mitRolle.titel, /code-reviewer/)
  const fremd = baueLiveChip({ aktiverLauf: { aktiv: true, laufId: LAUF_ID }, laeufe: [lauf({ rolle: 'eigene-rolle' })] })
  assert.equal(fremd.titel, 'Workforce arbeitet · eigene-rolle')
})

test('kein Lauf: „Gerade läuft nichts“, Link auf #/live (F46 D5: „Die Workforce wartet“), kein Eintrag', () => {
  const chip = baueLiveChip({ aktiverLauf: { aktiv: false, laufId: null }, laeufe: [] })
  assert.equal(chip.aktiv, false)
  assert.equal(chip.href, '#/live')
  assert.equal(chip.titel, 'Gerade läuft nichts')
  assert.doesNotMatch(chip.html, /live-chip-eintrag/)
})

test('Eintrag ohne Titel: gekürzte laufId, Link auf #/live', () => {
  for (const laeufe of [[lauf({ auftragsbezug: null })], [lauf({ auftragsbezug: { titel: '   ' } })]]) {
    const chip = baueLiveChip({ aktiverLauf: { aktiv: true, laufId: LAUF_ID }, laeufe })
    assert.equal(chip.titel, 'Workforce arbeitet · 3f2a9c71')
    assert.equal(chip.href, '#/live')
  }
})

test('Eintrag fehlt (z. B. Lauf eines anderen Projekts, D13 projektübergreifend): gekürzte laufId, Link auf #/ausfuehrungen', () => {
  for (const laeufe of [[], null, undefined, [{ laufId: 'anderer-lauf', auftragsbezug: { titel: 'Fremd' } }]]) {
    const chip = baueLiveChip({ aktiverLauf: { aktiv: true, laufId: LAUF_ID }, laeufe })
    assert.equal(chip.aktiv, true)
    assert.equal(chip.titel, 'Workforce arbeitet · 3f2a9c71', String(laeufe))
    assert.equal(chip.href, '#/ausfuehrungen')
  }
})

test('Titel mit HTML wird escaped; das Ziel ist fest #/live (keine Serverdaten im href)', () => {
  const boese = '<img src=x onerror=alert(1)> & "Zitat"'
  const id = 'lauf/mit?zeichen#1'
  const chip = baueLiveChip({ aktiverLauf: { aktiv: true, laufId: id }, laeufe: [{ laufId: id, auftragsbezug: { titel: boese } }] })
  assert.doesNotMatch(chip.html, /<img/)
  assert.match(chip.html, /&lt;img src=x onerror=alert\(1\)&gt; &amp; &quot;Zitat&quot;/)
  assert.equal(chip.titel, `Workforce arbeitet · ${boese}`)
  assert.equal(chip.href, '#/live')
})

test('unbekannter Zustand: kein Chip; aktiv ohne laufId: Zustand ohne Eintrag, Link auf die Liste', () => {
  for (const zustand of [null, undefined, {}, { aktiverLauf: null }, { aktiverLauf: { aktiv: 'ja' } }]) {
    assert.equal(baueLiveChip(zustand), null)
  }
  const ohneId = baueLiveChip({ aktiverLauf: { aktiv: true, laufId: null }, laeufe: [] })
  assert.equal(ohneId.titel, 'Workforce arbeitet')
  assert.equal(ohneId.href, '#/ausfuehrungen')
})

test('F46 D5: Rolle aus dem Lauf-Detail steht vor dem Titel; ohne Detail-Rolle wie bisher', () => {
  const zustand = { aktiverLauf: { aktiv: true, laufId: LAUF_ID }, laeufe: [lauf({ auftragsbezug: { titel: 'Live-Ansicht' } })] }
  const mitRolle = baueLiveChip(zustand, new Map([[LAUF_ID, 'ausfuehrung']]))
  assert.match(mitRolle.titel, /^Workforce arbeitet · .+ · Live-Ansicht$/)
  assert.doesNotMatch(mitRolle.titel, /ausfuehrung/)
  assert.equal(baueLiveChip(zustand, new Map()).titel, 'Workforce arbeitet · Live-Ansicht')
  // Ein fremder Lauf (nicht in laeufe) bekommt keine Rolle und keinen Link auf #/live.
  const fremd = baueLiveChip({ aktiverLauf: { aktiv: true, laufId: LAUF_ID }, laeufe: [] }, new Map([[LAUF_ID, 'ausfuehrung']]))
  assert.equal(fremd.href, '#/ausfuehrungen')
  assert.equal(fremd.titel, 'Workforce arbeitet · 3f2a9c71')
})
