/**
 * Datei: src/qa/qa.test.ts
 *
 * Zweck: node:test-Fälle für validiereErgebnisQa und baueQaAuftragstext (F45 B2b-2b, F-820). Der Gut-Fall ist die Form
 * des echten Spike-Ergebnisses (features/F45/nachweise/b2b2b/spike-qa-schema.md), gekürzt.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { baueQaAuftragstext, validiereErgebnisQa } from './index.ts'

/** Gültiges BLOCKIERT mit einem Befund und zwei Testfällen (Form des Spike-Ergebnisses). */
function gueltig(): Record<string, unknown> {
  return {
    urteil: 'BLOCKIERT',
    befunde: [{ id: 'Q1', schwere: 'HOCH', evidenz: 'confirmed', fundstelle: 'src/spike/betrag.ts:2', zusammenfassung: 'Negative Beträge falsch.', korrekturrichtung: 'Mit dem Absolutbetrag rechnen.', beleg: 'formatiereBetrag(-50) → "-1,-50 €".' }],
    testfaelle: [
      { name: 'AK1 Positiv', schritte: ['formatiereBetrag(1234)'], erwartet: '"12,34 €"', ergebnis: 'bestanden' },
      { name: 'AK2 Negativ', schritte: ['formatiereBetrag(-50)'], erwartet: '"-0,50 €"', ergebnis: 'durchgefallen' },
    ],
    empfehlung: 'Zurück an den Bau.',
  }
}

test('validiereErgebnisQa: die Form des Spike-Ergebnisses ist gültig, auch BEREIT ohne Befunde', () => {
  assert.deepEqual(validiereErgebnisQa(gueltig()), [])
  assert.deepEqual(validiereErgebnisQa({ ...gueltig(), urteil: 'BEREIT', befunde: [] }), [])
})

test('validiereErgebnisQa: kein Objekt, unbekanntes Urteil, BLOCKIERT ohne Befund', () => {
  assert.deepEqual(validiereErgebnisQa('Prosa statt JSON'), ['Ergebnis ist kein JSON-Objekt'])
  assert.deepEqual(validiereErgebnisQa(null), ['Ergebnis ist kein JSON-Objekt'])
  assert.match(validiereErgebnisQa({ ...gueltig(), urteil: 'OK' }).join('|'), /'urteil' muss einer von BEREIT, BEREIT_NACH_KORREKTUR, BLOCKIERT sein/)
  assert.deepEqual(validiereErgebnisQa({ ...gueltig(), befunde: [] }), ['Urteil BLOCKIERT ohne Befund — es braucht mindestens einen Befund'])
})

test('validiereErgebnisQa: Befund ohne Pflichttext, falsche Schwere, doppelte ID, null-Eintrag', () => {
  const befund = (gueltig().befunde as Record<string, unknown>[])[0]
  const verstoesse = validiereErgebnisQa({ ...gueltig(), befunde: [{ ...befund, beleg: ' ', schwere: 'GROSS' }, befund, null] })
  assert.ok(verstoesse.includes("'befunde[0].beleg' fehlt oder ist leer"))
  assert.ok(verstoesse.some((v) => v.startsWith("'befunde[0].schwere' muss einer von")))
  assert.ok(verstoesse.includes("'befunde[1].id' 'Q1' ist doppelt"))
  assert.ok(verstoesse.includes("'befunde[2]' ist kein Objekt"))
})

test('validiereErgebnisQa: Testfälle fehlen, sind leer oder unvollständig', () => {
  assert.deepEqual(validiereErgebnisQa({ ...gueltig(), testfaelle: undefined }), ["'testfaelle' muss ein Array sein"])
  assert.deepEqual(validiereErgebnisQa({ ...gueltig(), testfaelle: [] }), ["'testfaelle' ist leer — mindestens ein geprüfter Testfall"])
  const verstoesse = validiereErgebnisQa({ ...gueltig(), testfaelle: [{ name: '', schritte: [], erwartet: 'x', ergebnis: 'gruen' }, 7] })
  assert.deepEqual(verstoesse, [
    "'testfaelle[0].name' fehlt oder ist leer",
    "'testfaelle[0].schritte' braucht mindestens einen nicht leeren Schritt",
    "'testfaelle[0].ergebnis' muss einer von bestanden, durchgefallen, nicht_pruefbar sein",
    "'testfaelle[1]' ist kein Objekt",
  ])
})

test('baueQaAuftragstext: Rolleninstruktion, AK mit ID, Nicht-Ziele, dann der Auftrag', () => {
  const text = baueQaAuftragstext('Auftragstext X.', [{ id: 'AK1', text: 'Erstes Kriterium.' }], ['Kein Umbau.'])
  assert.match(text, /^Du bist als Rolle 'qa' verantwortlich/)
  assert.ok(text.includes("Schema 'ergebnis-qa'"))
  assert.ok(text.includes('- AK1: Erstes Kriterium.'))
  assert.ok(text.includes('- Kein Umbau.'))
  assert.ok(text.endsWith('Auftrag:\nAuftragstext X.'))
})

test('baueQaAuftragstext: ohne AK und Nicht-Ziele keine leeren Abschnitte', () => {
  const text = baueQaAuftragstext('Auftragstext X.', [], [])
  assert.ok(!text.includes('Akzeptanzkriterien des Auftrags'))
  assert.ok(!text.includes('Nicht-Ziele des Auftrags'))
})
