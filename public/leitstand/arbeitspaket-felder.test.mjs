/**
 * Datei: public/leitstand/arbeitspaket-felder.test.mjs
 *
 * Zweck: node:test-Fälle für das Lesen des Felds „Vereinbarte Bereiche“ im Formular „Auftrag & Start“ (F45 B2b-3d,
 * public/leitstand/arbeitspaket-felder.js): leer ⇒ kein Feld, Zeilen getrimmt, leere Zeilen und Doppelte weg; absolute
 * Pfade, `..`, innere `.`-Segmente, Steuerzeichen und `*` mitten im Eintrag (`src/*.ts`) mit Grund abgewiesen; `*`/`**` als
 * ganzer Eintrag oder am Ende (`src/**`, `src/**` mit Schrägstrich, `src\**`) erlaubt (Advisor A13, F-1123 (9)). Seit F45
 * B2b-3e-2 dazu `pruefeBereich`/`pruefeBudgetTokens` (Zwilling von src/auftrag, Gleichheit im Gate f45-b2b3e2) und das Feld
 * „Budget“ (`leseBudget`, Tausendertrenner).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BUDGET_STANDARD, leseBereiche, leseBudget, pruefeBereich, pruefeBudgetTokens } from './arbeitspaket-felder.js'

test('leseBereiche: leer oder nur Leerraum ⇒ ok ohne Bereiche (kein Abgleich)', () => {
  assert.deepEqual(leseBereiche(''), { ok: true, bereiche: undefined })
  assert.deepEqual(leseBereiche('  \n \r\n'), { ok: true, bereiche: undefined })
})

test('leseBereiche: eine Zeile je Eintrag, getrimmt, leere Zeilen und Doppelte weg (Reihenfolge bleibt)', () => {
  assert.deepEqual(leseBereiche(' src/export/ \r\n\n docs/\nsrc/export/\n'), { ok: true, bereiche: ['src/export/', 'docs/'] })
  assert.deepEqual(leseBereiche('src\\export'), { ok: true, bereiche: ['src\\export'] })
})

test('leseBereiche: absolute Pfade und .. werden mit dem Eintrag und dem Grund abgewiesen', () => {
  assert.deepEqual(leseBereiche('src/\n/etc/'), { ok: false, eintrag: '/etc/', grund: 'absolut' })
  assert.deepEqual(leseBereiche('C:\\Projekte\\x'), { ok: false, eintrag: 'C:\\Projekte\\x', grund: 'absolut' })
  assert.deepEqual(leseBereiche('\\\\server\\freigabe'), { ok: false, eintrag: '\\\\server\\freigabe', grund: 'absolut' })
  assert.deepEqual(leseBereiche('src/../geheim'), { ok: false, eintrag: 'src/../geheim', grund: 'eltern' })
  assert.deepEqual(leseBereiche('..'), { ok: false, eintrag: '..', grund: 'eltern' })
  assert.deepEqual(leseBereiche('src/..ordner/'), { ok: true, bereiche: ['src/..ordner/'] })
})

test('leseBereiche (Korrekturrunde): * mitten im Eintrag wird abgewiesen, * und ** als ganzer Eintrag oder Endung bleiben', () => {
  assert.deepEqual(leseBereiche('src/*.ts'), { ok: false, eintrag: 'src/*.ts', grund: 'muster' })
  assert.deepEqual(leseBereiche('src/**/x'), { ok: false, eintrag: 'src/**/x', grund: 'muster' })
  assert.deepEqual(leseBereiche('*\n**\nsrc/*\nsrc/**\n./'), { ok: true, bereiche: ['*', '**', 'src/*', 'src/**', './'] })
})

test('pruefeBereich (F45 B2b-3e-2): Grund je Eintrag, getrimmt vor allen Prüfungen, beide Trenner gleich', () => {
  const faelle = [
    ['', 'leer'],
    ['   ', 'leer'],
    ['a\tb', 'steuerzeichen'],
    [' /etc/', 'absolut'],
    ['C:\\x', 'absolut'],
    ['\\\\server\\f', 'absolut'],
    ['a/../b', 'eltern'],
    ['..', 'eltern'],
    ['src/./', 'punkt'],
    ['a\\.\\b', 'punkt'],
    ['src/*.ts', 'muster'],
    ['**/x', 'muster'],
    ['src/***', 'muster'],
    ['src/**/', null],
    ['src\\**', null],
    ['src\\**\\', null],
    ['src/*/', null],
    ['*/', null],
    ['.\\', null],
    ['./', null],
    ['.', null],
    ['src//', null],
    ['./src', null],
    ['*', null],
    ['**', null],
    ['src/..ordner/', null],
    ['Src/', null],
    [' src/ ', null],
  ]
  for (const [eintrag, grund] of faelle) assert.equal(pruefeBereich(eintrag), grund, JSON.stringify(eintrag))
})

test('leseBereiche (F45 B2b-3e-2, F-1123 (9)): src/**/ gilt (der Abgleich liest src); Groß/klein unterschieden', () => {
  assert.deepEqual(leseBereiche('src/**/\nsrc\\**\\'), { ok: true, bereiche: ['src/**/', 'src\\**\\'] })
  assert.deepEqual(leseBereiche('Src/\nsrc/'), { ok: true, bereiche: ['Src/', 'src/'] })
  assert.deepEqual(leseBereiche('src/./x'), { ok: false, eintrag: 'src/./x', grund: 'punkt' })
})

test('pruefeBudgetTokens (F45 B2b-3e-2): ganze Zahl von 1 bis MAX_SAFE_INTEGER', () => {
  for (const wert of [1, 2000000, Number.MAX_SAFE_INTEGER]) assert.equal(pruefeBudgetTokens(wert), true, String(wert))
  for (const wert of [0, -1, 1.5, '5', Number.NaN, Number.MAX_SAFE_INTEGER + 1, 1e300, null, undefined]) assert.equal(pruefeBudgetTokens(wert), false, String(wert))
})

test('leseBudget (F45 B2b-3e-2): leer ⇒ Standard, Ziffern mit Tausendertrennern, sonst ungültig mit Eintrag', () => {
  assert.deepEqual(leseBudget(''), { ok: true, budget: undefined })
  assert.deepEqual(leseBudget('  '), { ok: true, budget: undefined })
  for (const text of ['2000000', ' 2 000 000 ', '2.000.000', '2,000,000', '2\u00a0000\u00a0000', '2\u202f000\u202f000']) {
    assert.deepEqual(leseBudget(text), { ok: true, budget: 2000000 }, JSON.stringify(text))
  }
  for (const text of ['0', '1,5', '1.5', '-5', '+5', 'abc', '2 00 000', '2.000,000', '2\t000', '1e6', '\u0662\u0660', '99999999999999999999', '9007199254740992']) {
    assert.deepEqual(leseBudget(text), { ok: false, eintrag: text.trim() }, JSON.stringify(text))
  }
  // Dokumentiertes Verhalten: ein Punkt mit drei Ziffern danach ist ein Tausendertrenner, kein Dezimalpunkt.
  assert.deepEqual(leseBudget('1.500'), { ok: true, budget: 1500 })
  assert.deepEqual(leseBudget('9007199254740991'), { ok: true, budget: Number.MAX_SAFE_INTEGER })
})

test('leseBudget (Korrekturrunde, qa): eine aus dem Hinweis kopierte Zahl liest sich in jeder Sprache wieder ein', () => {
  for (const sprache of ['de', 'en', 'ru', 'tr']) {
    for (const zahl of Object.values(BUDGET_STANDARD)) {
      const text = new Intl.NumberFormat(sprache).format(zahl)
      assert.deepEqual(leseBudget(text), { ok: true, budget: zahl }, `${sprache}: ${JSON.stringify(text)}`)
    }
  }
})

test('BUDGET_STANDARD (F45 B2b-3e-2): Standard je Kontrolltiefe (Zwilling von BUDGET_DEFAULTS in src/budget, Gate f45-b2b3e2 (b3))', () => {
  assert.deepEqual(Object.keys(BUDGET_STANDARD).sort(), ['fast-lane', 'hoch', 'standard'])
  assert.ok(Object.isFrozen(BUDGET_STANDARD))
})
