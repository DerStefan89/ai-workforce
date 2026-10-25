/**
 * Datei: public/leitstand/roadmap-anpassen.test.mjs
 *
 * Zweck: F45 B5b-2b-1 — reine Bausteine von „Anpassen“ (roadmap-anpassen.js): wann angepasst werden kann, Vorbelegung,
 * Zahlenregel wie der Server, echte Änderung, Speichern-Sperre, Körper genau nach pruefePlanungAenderung (auch gegen die echte
 * Serverprüfung), Deutung aller Antwortfälle, Meilenstein-Ziele, Aufklappen nach Wechsel (Advisor A5: die Auswahl bleibt auf dem
 * Feature), HTML wörtlich und escaped.
 *
 * Wird aufgerufen von: `npm run test` (node --test)
 *
 * Wichtig: rein, ohne DOM und Netz; Hashes sind Platzhalter.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { pruefePlanungAenderung } from '../../src/feature-auftrag/planung-schreiben.ts'
import {
  anpassbar,
  anpassenHinweis,
  anpassenHtml,
  anpassenWerte,
  baueAnpassenKoerper,
  darfAnpassenSpeichern,
  deutePlanungAntwort,
  leseSchaetzzahl,
  meilensteinZiele,
  nichtAnpassbarHtml,
  offenNachWechsel,
  pruefeAnpassen,
} from './roadmap-anpassen.js'
import { ganttZeilen, gewaehlteZeile, zeilenSchluessel } from './roadmap-anzeige.js'

const HASH = 'a'.repeat(64)
const RHASH = 'b'.repeat(64)
const feature = (teil = {}) => ({ art: 'feature', id: 'F9', titel: 'Neun', status: 'IN_ARBEIT', kategorie: 'in_arbeit', prioritaet: 'P2', hinweise: [], bezug: { meilenstein: 'M5', feature: 'F9', workstream: null }, ...teil })
const ws = (teil = {}) => ({ art: 'workstream', id: 'WS-1', titel: 'Eins', status: 'geplant', schaetzung: { min: 0.5, max: 1.5 }, hinweise: [], bezug: { meilenstein: 'M5', feature: 'F9', workstream: 'WS-1' }, ...teil })

test('anpassbar: Feature und Workstream ja, Meilenstein/Gruppe ohne Formular, Sperrgründe des Servers vorab', () => {
  assert.deepEqual(anpassbar(feature(), null), { art: 'feature' })
  assert.deepEqual(anpassbar(ws(), feature()), { art: 'schaetzung' })
  assert.deepEqual(anpassbar(ws({ art: 'fixpaket' }), feature()), { art: 'schaetzung' })
  assert.deepEqual(anpassbar(ws({ art: 'design' }), feature()), { art: 'schaetzung' })
  assert.deepEqual(anpassbar({ art: 'meilenstein', bezug: {} }, null), { art: 'nein', grund: null })
  assert.deepEqual(anpassbar({ art: 'gruppe', bezug: {} }, null), { art: 'nein', grund: null })
  assert.deepEqual(anpassbar(feature({ status: 'keine_akte', kategorie: 'ohne_akte' }), null), { art: 'nein', grund: 'ohneAkte' })
  assert.deepEqual(anpassbar(feature({ status: 'ABGESCHLOSSEN' }), null), { art: 'nein', grund: 'abgeschlossen' })
  assert.deepEqual(anpassbar(ws(), feature({ status: 'ABGEBROCHEN' })), { art: 'nein', grund: 'abgeschlossen' })
  assert.deepEqual(anpassbar(ws(), feature({ hinweise: ['fehlerhaft'] })), { art: 'nein', grund: 'fehlerhaft' })
  assert.deepEqual(anpassbar(ws(), null), { art: 'nein', grund: 'ohneAkte' })
})

test('Vorbelegung: Feature mit heutigem Meilenstein, Schätzung mit Komma, ohne Schätzung leer', () => {
  assert.deepEqual(anpassenWerte(feature()), { prioritaet: '', meilenstein: 'M5', grund: '' })
  assert.deepEqual(anpassenWerte(ws()), { min: '0,5', max: '1,5', grund: '' })
  assert.deepEqual(anpassenWerte(ws({ schaetzung: null })), { min: '', max: '', grund: '' })
})

test('Zahlenregel wie der Server: 0–1000, höchstens zwei Nachkommastellen, Komma oder Punkt', () => {
  assert.equal(leseSchaetzzahl(''), null)
  assert.equal(leseSchaetzzahl('  '), null)
  assert.equal(leseSchaetzzahl('0'), 0)
  assert.equal(leseSchaetzzahl('1,25'), 1.25)
  assert.equal(leseSchaetzzahl('1.5'), 1.5)
  assert.equal(leseSchaetzzahl('1000'), 1000)
  for (const falsch of ['1000,01', '1,234', '-1', '1e2', 'abc', '1,', ',5', '1 000']) assert.ok(Number.isNaN(leseSchaetzzahl(falsch)), falsch)
})

test('Prüfung: echte Änderung, Min ≤ Max, beide oder keiner', () => {
  assert.deepEqual(pruefeAnpassen({ prioritaet: '', meilenstein: 'M5', grund: '' }, feature()).aenderungen, [])
  assert.deepEqual(pruefeAnpassen({ prioritaet: 'P2', meilenstein: 'M5', grund: '' }, feature()).aenderungen, [], 'gleiche Priorität ist keine Änderung')
  assert.deepEqual(pruefeAnpassen({ prioritaet: 'P0', meilenstein: 'M6', grund: '' }, feature()).aenderungen, ['prioritaet', 'meilenstein'])
  assert.deepEqual(pruefeAnpassen({ prioritaet: 'P0', meilenstein: 'M5', grund: '' }, feature({ prioritaet: null })).aenderungen, ['prioritaet'])
  assert.deepEqual(pruefeAnpassen({ prioritaet: 'X', meilenstein: 'M5', grund: '' }, feature()).fehler, ['prioritaet'])
  assert.deepEqual(pruefeAnpassen({ min: '0,5', max: '1.5', grund: '' }, ws()).aenderungen, [], 'gleiche Schätzung')
  assert.deepEqual(pruefeAnpassen({ min: '1', max: '2', grund: '' }, ws()), { aenderungen: ['schaetzung'], fehler: [], schaetzung: { min: 1, max: 2 } })
  assert.deepEqual(pruefeAnpassen({ min: '', max: '', grund: '' }, ws()), { aenderungen: ['schaetzung'], fehler: [], schaetzung: null }, 'Schätzung entfernen')
  assert.deepEqual(pruefeAnpassen({ min: '', max: '', grund: '' }, ws({ schaetzung: null })).aenderungen, [])
  assert.deepEqual(pruefeAnpassen({ min: '3', max: '2', grund: '' }, ws()).fehler, ['reihenfolge'])
  assert.deepEqual(pruefeAnpassen({ min: '1', max: '', grund: '' }, ws()).fehler, ['beide'])
  assert.deepEqual(pruefeAnpassen({ min: '1,234', max: '2', grund: '' }, ws()).fehler, ['zahl'])
})

test('Speichern erst mit Begründung und echter Änderung, nie während einer Anfrage', () => {
  const werte = { prioritaet: 'P0', meilenstein: 'M5', grund: '' }
  assert.equal(darfAnpassenSpeichern(werte, feature(), 'offen'), false)
  assert.match(anpassenHinweis(werte, feature()), /Begründung/)
  assert.equal(darfAnpassenSpeichern({ ...werte, grund: '   ' }, feature(), 'offen'), false)
  assert.equal(darfAnpassenSpeichern({ ...werte, grund: 'Weil' }, feature(), 'offen'), true)
  assert.equal(anpassenHinweis({ ...werte, grund: 'Weil' }, feature()), '')
  assert.equal(darfAnpassenSpeichern({ ...werte, grund: 'Weil' }, feature(), 'speichert'), false)
  assert.equal(darfAnpassenSpeichern({ ...werte, grund: 'Weil' }, feature(), 'konflikt'), true, 'nach 409 erneut speicherbar (Hash wird frisch gelesen)')
  assert.equal(darfAnpassenSpeichern({ prioritaet: '', meilenstein: 'M5', grund: 'Weil' }, feature(), 'offen'), false)
  assert.match(anpassenHinweis({ prioritaet: '', meilenstein: 'M5', grund: 'Weil' }, feature()), /keine Änderung/)
  assert.equal(darfAnpassenSpeichern({ min: '3', max: '2', grund: 'Weil' }, ws(), 'offen'), false)
  assert.match(anpassenHinweis({ min: '3', max: '2', grund: 'Weil' }, ws()), /Min darf nicht größer/)
})

test('Körper: nur geänderte Felder, roadmap_hash genau mit Meilenstein; die echte Serverprüfung nimmt ihn an', () => {
  const nurPrio = baueAnpassenKoerper({ prioritaet: 'P1', meilenstein: 'M5', grund: 'Weil' }, feature(), HASH, RHASH)
  assert.deepEqual(nurPrio, { prioritaet: 'P1', grund: 'Weil', hash: HASH })
  const beides = baueAnpassenKoerper({ prioritaet: 'P1', meilenstein: 'M6', grund: 'Weil' }, feature(), HASH, RHASH)
  assert.deepEqual(beides, { prioritaet: 'P1', meilenstein: 'M6', roadmap_hash: RHASH, grund: 'Weil', hash: HASH })
  const schaetzung = baueAnpassenKoerper({ min: '1', max: '2,5', grund: 'Weil' }, ws(), HASH, RHASH)
  assert.deepEqual(schaetzung, { workstreams: [{ id: 'WS-1', schaetzung_min: 1, schaetzung_max: 2.5 }], grund: 'Weil', hash: HASH })
  const ohne = baueAnpassenKoerper({ min: '', max: '', grund: 'Weil' }, ws(), HASH, RHASH)
  assert.deepEqual(ohne.workstreams, [{ id: 'WS-1', schaetzung_min: null, schaetzung_max: null }])
  for (const koerper of [nurPrio, beides, schaetzung, ohne]) assert.equal(pruefePlanungAenderung(koerper).ok, true, JSON.stringify(koerper))
  const geprueft = pruefePlanungAenderung(schaetzung)
  assert.deepEqual(geprueft.ok && geprueft.aenderung.workstreams, [{ id: 'WS-1', schaetzung: { min: 1, max: 2.5 } }])
})

test('Deutung: 200, drei 409-Formen, 400/422 mit Verstößen, sonst Fehler', () => {
  assert.deepEqual(deutePlanungAntwort(200, { status: 'ok', geaendert: ['Priorität', 3], git: ['git add a'] }), { art: 'ok', git: ['git add a'], geaendert: ['Priorität'] })
  assert.equal(deutePlanungAntwort(200, { status: 'ok' }).git, null)
  assert.deepEqual(deutePlanungAntwort(409, { grund: 'Ablauf', workflowId: null }), { art: 'gesperrt', grund: 'Ablauf', workflowId: null })
  assert.equal(deutePlanungAntwort(409, { grund: 'x', workflowId: 'wf-1' }).workflowId, 'wf-1')
  assert.equal(deutePlanungAntwort(409, { grund: 'Akte', hash: HASH }).art, 'konflikt')
  assert.equal(deutePlanungAntwort(409, { grund: 'Roadmap', roadmap_hash: RHASH }).art, 'konflikt')
  assert.deepEqual(deutePlanungAntwort(422, { grund: 'R1', verstoesse: ['a', 1] }), { art: 'abgelehnt', status: 422, grund: 'R1', verstoesse: ['a'] })
  assert.equal(deutePlanungAntwort(400, {}).art, 'abgelehnt')
  assert.deepEqual(deutePlanungAntwort(500, { grund: 'kaputt' }), { art: 'fehler', status: 500, grund: 'kaputt' })
})

test('Meilenstein-Ziele: nur offene plus der heutige', () => {
  const roadmap = { meilensteine: [{ id: 'M1', titel: 'Eins', status: 'ABGESCHLOSSEN' }, { id: 'M5', titel: 'Fünf', status: 'LAEUFT' }, { id: 'M6', titel: 'Sechs', status: 'GEPLANT' }, null] }
  assert.deepEqual(meilensteinZiele(roadmap, 'M5').map((m) => m.id), ['M5', 'M6'])
  assert.deepEqual(meilensteinZiele(roadmap, 'M1').map((m) => m.id), ['M1', 'M5', 'M6'])
  assert.deepEqual(meilensteinZiele(null, 'M5'), [])
})

test('A5: nach Wechsel in einen zugeklappten Meilenstein bleibt die Auswahl auf dem Feature', () => {
  const vorher = { roadmap_schema: 'v0', status: 'ok', meilensteine: [{ id: 'M5', titel: 'Fünf', status: 'LAEUFT', features: [{ id: 'F9', titel: 'Neun', status: 'IN_ARBEIT', workstreams: null }] }, { id: 'M6', titel: 'Sechs', status: 'GEPLANT', features: [] }] }
  const nachher = { ...vorher, meilensteine: [{ ...vorher.meilensteine[0], features: [] }, { ...vorher.meilensteine[1], features: [{ id: 'F9', titel: 'Neun', status: 'IN_ARBEIT', workstreams: null }] }] }
  const auswahl = zeilenSchluessel('f', 'M6', 'F9')
  const ohne = ganttZeilen(nachher, { aufgeklappt: null, abgeschlosseneSichtbar: false })
  assert.notEqual(gewaehlteZeile(nachher, ohne, auswahl)?.id, 'F9', 'ohne Aufklappen fiele die Auswahl auf die Elternzeile')
  const aufgeklappt = offenNachWechsel(ohne.standardOffen, null, 'M6')
  const mit = ganttZeilen(nachher, { aufgeklappt, abgeschlosseneSichtbar: false })
  const zeile = gewaehlteZeile(nachher, mit, auswahl)
  assert.equal(zeile?.art, 'feature')
  assert.equal(zeile?.id, 'F9')
  assert.equal(zeile?.bezug.meilenstein, 'M6')
})

test('HTML: Feature-Felder, Speichern gesperrt ohne Begründung, Texte escaped', () => {
  const html = anpassenHtml({ zeile: feature({ prioritaet: null }), werte: anpassenWerte(feature()), ziele: [{ id: 'M5', titel: 'Fünf <b>' }, { id: 'M6', titel: 'Sechs' }], offen: true, phase: 'offen', meldung: null, ergebnis: null })
  assert.match(html, /<details class="rm-anpassen"[^>]* open>/)
  assert.match(html, /data-roadmap-anpassen-feld="prioritaet"/)
  assert.match(html, /<option value="M5" selected>M5 · Fünf &lt;b&gt; \(heute\)<\/option>/)
  assert.match(html, /data-roadmap-anpassen-aktion="speichern" disabled aria-disabled="true"/)
  assert.match(html, /maxlength="500"/)
  assert.doesNotMatch(html, /<b>/)
})

test('HTML: Schätzung, Meldung 409 mit „Neu laden“ und wörtlichem Servertext, Erfolg mit Git-Block', () => {
  const werte = { min: '1', max: '<2>', grund: 'Weil' }
  const konflikt = anpassenHtml({ zeile: ws(), werte, ziele: [], offen: true, phase: 'konflikt', meldung: deutePlanungAntwort(409, { grund: 'Akte <neu>', hash: HASH }), ergebnis: null })
  assert.match(konflikt, /value="&lt;2&gt;"/)
  assert.match(konflikt, /data-roadmap-anpassen-aktion="neu-laden"/)
  assert.match(konflikt, /409: Akte &lt;neu&gt;/)
  const fehler = anpassenHtml({ zeile: ws(), werte, ziele: [], offen: true, phase: 'fehler', meldung: { art: 'fehler', status: 0, grund: 'Netz' }, ergebnis: null })
  assert.doesNotMatch(fehler, /neu-laden/)
  const ok = anpassenHtml({ zeile: ws(), werte, ziele: [], offen: true, phase: 'gespeichert', meldung: null, ergebnis: { git: ['git add -- features/F9/feature.md'], geaendert: ['Schätzung'] } })
  assert.match(ok, /data-phase="gespeichert"/)
  assert.match(ok, /befehlsblock/)
  assert.match(ok, /nur die geänderten Pfade/)
  assert.match(ok, /data-roadmap-anpassen-aktion="schliessen"/)
  assert.match(nichtAnpassbarHtml('abgeschlossen'), /nicht mehr angepasst/)
  assert.match(fehler, /erneut speichern/, 'ohne Knopf kein Verweis auf „Neu laden“ (cr 4)')
  assert.doesNotMatch(fehler, /holt den aktuellen Stand/)
})

test('HTML: Sperre mit Ablauf-Link, 422 mit Verstoßliste und „Neu laden“ (qa 7)', () => {
  const basis = { zeile: feature(), werte: { prioritaet: 'P1', meilenstein: 'M5', grund: 'Weil' }, ziele: [{ id: 'M5', titel: 'Fünf' }], offen: true, ergebnis: null }
  const gesperrt = anpassenHtml({ ...basis, phase: 'gesperrt', meldung: deutePlanungAntwort(409, { grund: 'Ablauf läuft', workflowId: 'wf 1' }) })
  assert.match(gesperrt, /href="#\/workflows\/wf%201"/)
  assert.match(gesperrt, /Gesperrt, solange/)
  assert.match(gesperrt, /neu-laden/)
  const ohneId = anpassenHtml({ ...basis, phase: 'gesperrt', meldung: deutePlanungAntwort(409, { grund: 'x', workflowId: null }) })
  assert.doesNotMatch(ohneId, /#\/workflows\//)
  const abgelehnt = anpassenHtml({ ...basis, phase: 'abgelehnt', meldung: deutePlanungAntwort(422, { grund: 'R1 <neu>', verstoesse: ['M5: F9 <x>'] }) })
  assert.match(abgelehnt, /note red/)
  assert.match(abgelehnt, /422: R1 &lt;neu&gt;/)
  assert.match(abgelehnt, /<li>M5: F9 &lt;x&gt;<\/li>/)
  assert.match(abgelehnt, /neu-laden/)
})

test('Randfälle (qa 7): Feature-Zeile mit Formfehlern bleibt anpassbar, unbekannte 200 und 404 sind Fehler', () => {
  assert.deepEqual(anpassbar(feature({ hinweise: ['fehlerhaft'] }), null), { art: 'feature' })
  assert.equal(deutePlanungAntwort(200, { status: 'x' }).art, 'fehler')
  assert.equal(deutePlanungAntwort(404, { grund: 'Akte fehlt' }).art, 'fehler')
})
