/**
 * Datei: public/leitstand/akte-bearbeiten.test.mjs
 *
 * Zweck: F45 B5a-2 — reine Bausteine von „Akte bearbeiten“ und „Als Feature anlegen“ (akte-bearbeiten.js): Vorbelegung (auch
 * unvollständig), AK-Nummern, PUT-Körper mit Hash und Grund, Speichern-Sperre, Deutung aller Antwortfälle, Warnhinweis,
 * Meldungen wörtlich und escaped.
 *
 * Wird aufgerufen von: `npm run test` (node --test)
 *
 * Wichtig: rein, ohne DOM und Netz; Hashes sind Platzhalter (64 Hex-Zeichen), keine echten Akten.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { akteFormularHtml, akteGespeichertHtml, baueAkteFormular, baueAkteKoerper, darfSpeichern, deuteAkteAntwort, deuteFeatureAnlage, featureAnlageHtml, mitNeuemAk } from './akte-bearbeiten.js'

const HASH = 'd'.repeat(64)
const AKTE = { status: 'ok', ziel: 'Ziel <alt>', nicht_ziele: ['Nicht A'], akzeptanzkriterien: [{ id: 'AK1', text: 'Eins' }, { id: 'AK3', text: 'Drei' }], hash: HASH }
const stand = (teil = {}) => ({ featureId: 'F9', phase: 'offen', werte: baueAkteFormular(AKTE), unvollstaendig: null, meldung: null, akteLinkHtml: '<a>Akte</a>', ...teil })

test('Vorbelegung: vollständige Akte übernimmt die Werte, die nächste AK-Nummer folgt der höchsten', () => {
  const werte = baueAkteFormular(AKTE)
  assert.equal(werte.ziel, 'Ziel <alt>')
  assert.deepEqual(werte.nichtZiele, ['Nicht A'])
  assert.deepEqual(werte.aks, [{ id: 'AK1', text: 'Eins' }, { id: 'AK3', text: 'Drei' }])
  assert.equal(mitNeuemAk(werte).aks.at(-1).id, 'AK4')
  assert.equal(mitNeuemAk(mitNeuemAk(werte)).aks.at(-1).id, 'AK5')
})

test('Vorbelegung: unvollständige Akte (F-1177) startet leer mit AK1', () => {
  const werte = baueAkteFormular({ status: 'unvollstaendig', grund: 'x', hash: HASH })
  assert.deepEqual(werte, { ziel: '', nichtZiele: [], aks: [{ id: 'AK1', text: '' }], grund: '', naechsteAk: 2 })
  assert.equal(mitNeuemAk(werte).aks.at(-1).id, 'AK2')
})

test('PUT-Körper: genau die fünf Felder, gelesener Hash und Grund; leere Zeilen fallen weg', () => {
  const werte = { ...baueAkteFormular(AKTE), nichtZiele: ['Nicht A', '  '], aks: [{ id: 'AK1', text: 'Eins' }, { id: 'AK4', text: ' ' }], grund: 'Weil' }
  const koerper = baueAkteKoerper(werte, HASH)
  assert.deepEqual(Object.keys(koerper).sort(), ['akzeptanzkriterien', 'grund', 'hash', 'nicht_ziele', 'ziel'])
  assert.equal(koerper.hash, HASH)
  assert.equal(koerper.grund, 'Weil')
  assert.deepEqual(koerper.nicht_ziele, ['Nicht A'])
  assert.deepEqual(koerper.akzeptanzkriterien, [{ id: 'AK1', text: 'Eins' }])
})

test('Speichern nur mit Grund und nicht während einer Anfrage bzw. nach einem Hash-409', () => {
  assert.equal(darfSpeichern({ grund: 'x' }, 'offen'), true)
  assert.equal(darfSpeichern({ grund: '   ' }, 'offen'), false)
  assert.equal(darfSpeichern({ grund: 'x' }, 'speichert'), false)
  assert.equal(darfSpeichern({ grund: 'x' }, 'konflikt'), false)
  assert.equal(darfSpeichern({ grund: 'x' }, 'abgelehnt'), true)
})

test('Deutung: 200, 409 Hash, 409 Sperre (auch ohne ID), 400, 422 mit Verstößen, sonst Fehler', () => {
  assert.deepEqual(deuteAkteAntwort(200, { status: 'ok', hash: HASH, geaendert: ['Ziel'], git: ['& {', 'git add -- x', '}'] }), { art: 'ok', git: ['& {', 'git add -- x', '}'], geaendert: ['Ziel'] })
  assert.equal(deuteAkteAntwort(200, { status: 'ok', git: null }).git, null)
  assert.deepEqual(deuteAkteAntwort(409, { grund: 'geändert', hash: HASH }), { art: 'konflikt', grund: 'geändert' })
  assert.deepEqual(deuteAkteAntwort(409, { grund: 'läuft', workflowId: 'w-1' }), { art: 'gesperrt', grund: 'läuft', workflowId: 'w-1' })
  assert.deepEqual(deuteAkteAntwort(409, { grund: 'unlesbar', workflowId: null }), { art: 'gesperrt', grund: 'unlesbar', workflowId: null })
  assert.deepEqual(deuteAkteAntwort(400, { grund: "'grund' fehlt" }), { art: 'abgelehnt', status: 400, grund: "'grund' fehlt", verstoesse: [] })
  assert.deepEqual(deuteAkteAntwort(422, { grund: 'Gate', verstoesse: ['Status fehlt', 7] }), { art: 'abgelehnt', status: 422, grund: 'Gate', verstoesse: ['Status fehlt'] })
  assert.deepEqual(deuteAkteAntwort(409, { grund: 'ohne Form' }), { art: 'fehler', status: 409, grund: 'ohne Form' })
  assert.deepEqual(deuteAkteAntwort(500, {}), { art: 'fehler', status: 500, grund: '' })
})

test('Formular: Felder vorbelegt und escaped, Grund Pflicht mit maxlength, Speichern ohne Grund gesperrt', () => {
  const html = akteFormularHtml(stand())
  assert.match(html, /Ziel &lt;alt&gt;<\/textarea>/)
  assert.match(html, /<label for="akte-ak-1">AK3<\/label>/)
  assert.match(html, /maxlength="500" required aria-required="true"/)
  assert.match(html, /data-akte-aktion="speichern" disabled aria-disabled="true"/)
  assert.doesNotMatch(html, /data-akte-warnung/)
  assert.doesNotMatch(akteFormularHtml(stand({ werte: { ...baueAkteFormular(AKTE), grund: 'x' } })), /data-akte-aktion="speichern" disabled/)
})

test('Formular einer unvollständigen Akte trägt den Warnhinweis mit Link und Servergrund (Advisor B1, Weg b)', () => {
  const html = akteFormularHtml(stand({ unvollstaendig: { grund: 'Ziel <leer>' } }))
  assert.match(html, /data-akte-warnung[\s\S]*Speichern ersetzt diese Abschnitte[\s\S]*Ziel &lt;leer&gt;[\s\S]*<a>Akte<\/a>/)
})

test('Meldungen: Hash-409 mit „Neu laden“, Sperre mit Link, 422 mit Verstößen — wörtlich und escaped', () => {
  const konflikt = akteFormularHtml(stand({ phase: 'konflikt', meldung: { art: 'konflikt', grund: 'neu <x>' } }))
  assert.match(konflikt, /data-akte-aktion="neu-laden"/)
  assert.match(konflikt, /neu &lt;x&gt;/)
  assert.doesNotMatch(konflikt, /#\/workflows\//)
  const sperre = akteFormularHtml(stand({ phase: 'gesperrt', meldung: { art: 'gesperrt', grund: 'läuft', workflowId: 'w 1' } }))
  assert.match(sperre, /href="#\/workflows\/w%201"/)
  assert.match(sperre, /<code>w 1<\/code>/)
  assert.doesNotMatch(sperre, /neu-laden/)
  const ohneId = akteFormularHtml(stand({ phase: 'gesperrt', meldung: { art: 'gesperrt', grund: 'unlesbar', workflowId: null } }))
  assert.doesNotMatch(ohneId, /#\/workflows\//)
  const abgelehnt = akteFormularHtml(stand({ phase: 'abgelehnt', meldung: { art: 'abgelehnt', status: 422, grund: 'Gate <b>', verstoesse: ['Status <fehlt>'] } }))
  assert.match(abgelehnt, /422: Gate &lt;b&gt;/)
  assert.match(abgelehnt, /<li>Status &lt;fehlt&gt;<\/li>/)
  const netz = akteFormularHtml(stand({ phase: 'fehler', meldung: { art: 'fehler', status: 0, grund: 'Netz' } }))
  assert.match(netz, /<code>Netz<\/code>/)
})

test('Während der Anfrage sind alle Felder und Knöpfe gesperrt', () => {
  const html = akteFormularHtml(stand({ phase: 'speichert', werte: { ...baueAkteFormular(AKTE), grund: 'x' } }))
  assert.doesNotMatch(html, /<button(?![^>]*disabled)[^>]*data-akte-aktion/)
  assert.match(html, /Wird gespeichert …/)
})

test('Gespeichert: geänderte Abschnitte wörtlich, Git-Block bzw. Satz ohne Block', () => {
  const mit = akteGespeichertHtml({ featureId: 'F9', git: ['& {', 'git add -- features/F9/feature.md', '}'], geaendert: ['Ziel', 'Akzeptanzkriterien'] })
  assert.match(mit, /Ziel, Akzeptanzkriterien/)
  assert.match(mit, /git add -- features\/F9\/feature\.md/)
  assert.match(mit, /data-befehl-kopieren/)
  assert.match(akteGespeichertHtml({ featureId: 'F9', git: null, geaendert: [] }), /Git-Block nicht bestimmbar/)
})

test('Feature-Anlage: 201 mit Link und Git-Block, 409/400/422 wörtlich, sonst Fehler', () => {
  const ok = deuteFeatureAnlage(201, { status: 'ok', id: 'F21', hash: HASH, git: null })
  assert.deepEqual(ok, { art: 'ok', id: 'F21', git: null })
  assert.match(featureAnlageHtml(ok), /href="#\/workboard\/F21"[\s\S]*Git-Block nicht bestimmbar/)
  const doppelt = deuteFeatureAnlage(409, { grund: 'existiert <schon>', id: 'F21' })
  assert.equal(doppelt.art, 'abgelehnt')
  assert.match(featureAnlageHtml(doppelt), /409: existiert &lt;schon&gt;/)
  assert.match(featureAnlageHtml(deuteFeatureAnlage(422, { grund: 'Scope', verstoesse: ['ziel leer'] })), /<li>ziel leer<\/li>/)
  assert.equal(deuteFeatureAnlage(500, {}).art, 'fehler')
  assert.equal(deuteFeatureAnlage(201, {}).art, 'fehler')
})

test('Prüfpass B5a-2: Hash-409 hebt „Neu laden“ hervor, „Speichern“ tritt zurück; keine eigene Live-Region; Formular trägt seine ID', () => {
  const konflikt = akteFormularHtml(stand({ phase: 'konflikt', meldung: { art: 'konflikt', grund: 'x' } }))
  assert.match(konflikt, /class="button primary" data-akte-aktion="neu-laden"/)
  assert.match(konflikt, /class="button" data-akte-aktion="speichern"/)
  assert.match(akteFormularHtml(stand()), /class="button primary" data-akte-aktion="speichern"/)
  assert.match(akteFormularHtml(stand()), /data-akte-id="F9"/)
  assert.doesNotMatch(akteFormularHtml(stand({ phase: 'speichert' })), /role="status"|aria-live/)
})
