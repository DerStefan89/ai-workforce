/**
 * Datei: public/leitstand/i18n.test.mjs
 *
 * Zweck: node:test-Fälle für den i18n-Kern (F44 WS-1a): Import-Sicherheit (in Node gilt de),
 * Platzhalter, Pluralwahl über Intl.PluralRules (ru bei 0, 1, 2, 5, 11–14, 21), Rückfall auf de
 * und auf den Schlüssel selbst mit einmaligem console.warn, Zahl- und Datumsformat je Sprache,
 * initialisiereSprache mit kaputtem und gültigem Speicherwert.
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { WOERTERBUECHER, aktuelleSprache, formatiereDatum, formatiereZahl, initialisiereSprache, t, waehleText } from './i18n.js'

test('Import-sicher: nach dem Import gilt de, ohne DOM und Storage', () => {
  assert.equal(aktuelleSprache(), 'de')
  assert.equal(t('einstellungen.titel'), 'Einstellungen')
})

test('Platzhalter: bekannte ersetzt, unbekannte bleiben stehen', () => {
  assert.equal(waehleText('Hallo {name}, {rest}', 'de', { name: 'Stefan' }), 'Hallo Stefan, {rest}')
})

test('Plural ru: one/few/many nach Intl.PluralRules, auch bei 0, 11–14 und 21', () => {
  const eintrag = { one: '{anzahl} запись', few: '{anzahl} записи', many: '{anzahl} записей', other: '{anzahl} записи (other)' }
  const erwartet = { 0: 'записей', 1: 'запись', 2: 'записи', 5: 'записей', 11: 'записей', 12: 'записей', 14: 'записей', 21: 'запись', 22: 'записи' }
  for (const [anzahl, wort] of Object.entries(erwartet)) {
    assert.equal(waehleText(eintrag, 'ru', { anzahl: Number(anzahl) }), `${anzahl} ${wort}`, `ru bei ${anzahl}`)
  }
  assert.equal(waehleText({ one: 'ein Eintrag', other: '{anzahl} Einträge' }, 'de', { anzahl: 1 }), 'ein Eintrag')
  assert.equal(waehleText({ one: 'ein Eintrag', other: '{anzahl} Einträge' }, 'de', { anzahl: 0 }), '0 Einträge')
})

test('Rückfall: fehlender Schlüssel → Schlüssel selbst, console.warn genau einmal', () => {
  const warnungen = []
  const original = console.warn
  console.warn = (text) => warnungen.push(text)
  try {
    assert.equal(t('gibt.es.nicht'), 'gibt.es.nicht')
    assert.equal(t('gibt.es.nicht'), 'gibt.es.nicht')
  } finally {
    console.warn = original
  }
  assert.equal(warnungen.length, 1)
  assert.match(warnungen[0], /gibt\.es\.nicht/)
})

test('initialisiereSprache: kaputter Wert → de, gültiger Wert → Sprache und html lang; fehlender Schlüssel fällt auf de zurück', () => {
  const html = {}
  globalThis.document = { documentElement: html }
  const gespeichert = new Map([['leitstand-sprache', 'xx']])
  Object.defineProperty(globalThis, 'localStorage', { value: { getItem: (s) => gespeichert.get(s) ?? null }, configurable: true, writable: true })
  try {
    assert.equal(initialisiereSprache(), 'de')
    assert.equal(html.lang, 'de')

    gespeichert.set('leitstand-sprache', 'ru')
    assert.equal(initialisiereSprache(), 'ru')
    assert.equal(html.lang, 'ru')
    assert.equal(t('einstellungen.titel'), 'Настройки')
    assert.equal(formatiereZahl(1234.5), new Intl.NumberFormat('ru').format(1234.5))
    assert.equal(formatiereDatum('2026-09-30T12:00:00Z', { dateStyle: 'long', timeZone: 'UTC' }), new Intl.DateTimeFormat('ru', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date('2026-09-30T12:00:00Z')))
    assert.equal(formatiereDatum('kein Datum'), 'kein Datum')

    const titel = WOERTERBUECHER.ru['einstellungen.titel']
    delete WOERTERBUECHER.ru['einstellungen.titel']
    try {
      assert.equal(t('einstellungen.titel'), 'Einstellungen', 'Rückfall auf de')
    } finally {
      WOERTERBUECHER.ru['einstellungen.titel'] = titel
    }
  } finally {
    gespeichert.set('leitstand-sprache', 'de')
    initialisiereSprache()
    delete globalThis.document
    delete globalThis.localStorage
  }
})
