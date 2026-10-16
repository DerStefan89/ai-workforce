/**
 * Datei: public/leitstand/arbeitspaket-felder.test.mjs
 *
 * Zweck: node:test-Fälle für das Lesen des Felds „Vereinbarte Bereiche“ im Formular „Auftrag & Start“ (F45 B2b-3d,
 * public/leitstand/arbeitspaket-felder.js): leer ⇒ kein Feld, Zeilen getrimmt, leere Zeilen und Doppelte weg, absolute
 * Pfade und `..` abgewiesen (Advisor A13).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { leseBereiche } from './arbeitspaket-felder.js'

test('leseBereiche: leer oder nur Leerraum ⇒ ok ohne Bereiche (kein Abgleich)', () => {
  assert.deepEqual(leseBereiche(''), { ok: true, bereiche: undefined })
  assert.deepEqual(leseBereiche('  \n \r\n'), { ok: true, bereiche: undefined })
})

test('leseBereiche: eine Zeile je Eintrag, getrimmt, leere Zeilen und Doppelte weg (Reihenfolge bleibt)', () => {
  assert.deepEqual(leseBereiche(' src/export/ \r\n\n docs/\nsrc/export/\n'), { ok: true, bereiche: ['src/export/', 'docs/'] })
  assert.deepEqual(leseBereiche('src\\export'), { ok: true, bereiche: ['src\\export'] })
})

test('leseBereiche: absolute Pfade und .. werden mit dem Eintrag abgewiesen', () => {
  assert.deepEqual(leseBereiche('src/\n/etc/'), { ok: false, eintrag: '/etc/' })
  assert.deepEqual(leseBereiche('C:\\Projekte\\x'), { ok: false, eintrag: 'C:\\Projekte\\x' })
  assert.deepEqual(leseBereiche('\\\\server\\freigabe'), { ok: false, eintrag: '\\\\server\\freigabe' })
  assert.deepEqual(leseBereiche('src/../geheim'), { ok: false, eintrag: 'src/../geheim' })
  assert.deepEqual(leseBereiche('..'), { ok: false, eintrag: '..' })
  assert.deepEqual(leseBereiche('src/..ordner/'), { ok: true, bereiche: ['src/..ordner/'] })
})

test('leseBereiche (Korrekturrunde): * mitten im Eintrag wird abgewiesen, * und ** als ganzer Eintrag oder Endung bleiben', () => {
  assert.deepEqual(leseBereiche('src/*.ts'), { ok: false, eintrag: 'src/*.ts' })
  assert.deepEqual(leseBereiche('src/**/x'), { ok: false, eintrag: 'src/**/x' })
  assert.deepEqual(leseBereiche('*\n**\nsrc/*\nsrc/**\n./'), { ok: true, bereiche: ['*', '**', 'src/*', 'src/**', './'] })
})
