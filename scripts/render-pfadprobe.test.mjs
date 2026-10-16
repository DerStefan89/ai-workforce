/**
 * Datei: scripts/render-pfadprobe.test.mjs
 *
 * Zweck: node:test-Fälle der Pfadprobe für Render-Nachweise (F45 B2b-3e-1, F-1125, scripts/render-pfadprobe.mjs):
 * persönliche Pfade (C:\Users\<echter Name>, AppData, /Users/…, /home/…, Claude-Projektkennung C--Users-…) werden
 * gefunden, Platzhalter (<name>, <HOME>) und die neutrale Wurzel nicht; kein Zustand zwischen zwei Aufrufen.
 *
 * Wird aufgerufen von:
 * - npm run test (node --test)
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { findePersoenlichePfade, pruefeAufPersoenlichePfade } from './render-pfadprobe.mjs'

/** Nur die Trefferwörter, für knappe Vergleiche. @param text - geprüfter Text @returns Treffer */
const woerter = (text) => findePersoenlichePfade(text).map((f) => f.treffer)

test('findePersoenlichePfade: Windows-, macOS- und Linux-Nutzerpfade werden gefunden', () => {
  assert.deepEqual(woerter('cd C:\\Users\\anna\\AppData\\Local\\Temp\\x'), ['C:\\Users', 'AppData'])
  assert.deepEqual(woerter('c:/users/anna/projekt'), ['c:/users'])
  assert.deepEqual(woerter('Arbeitsordner /Users/anna/x'), ['Users/anna'])
  assert.deepEqual(woerter('D:\\AppData\\x'), ['AppData'])
  assert.deepEqual(woerter('/home/anna/projekt'), ['/home/anna'])
  assert.deepEqual(woerter('~/.claude/projects/C--Users-anna-Projekte-x'), ['C--Users-anna-Projekte-x'])
})

test('findePersoenlichePfade: Platzhalter und neutrale Wurzel sind sauber', () => {
  for (const text of ['C:\\Users\\<name>\\AppData\\Local\\Temp\\…', '<HOME>\\AppData\\Local', '/Users/<name>/x', '/home/<name>/x', 'C:\\aiw-nachweis\\lauf-1\\temp\\f45', '/tmp/aiw-nachweis/lauf-1', 'Benutzer und Nutzerkonten', '']) {
    assert.deepEqual(findePersoenlichePfade(text), [], text)
  }
})

test('findePersoenlichePfade: zweimal derselbe Aufruf ⇒ dasselbe Ergebnis (kein lastIndex-Zustand)', () => {
  const text = 'C:\\Users\\anna\\AppData'
  assert.deepEqual(findePersoenlichePfade(text), findePersoenlichePfade(text))
  assert.equal(findePersoenlichePfade(text).length, 2)
  assert.equal(findePersoenlichePfade(text)[0].stelle, 0)
})

test('findePersoenlichePfade (Korrekturrunde): Treffer nach Users begrenzt (keine Zeilenumbrüche, höchstens 64 Zeichen); bewusst strenge Fehltreffer', () => {
  assert.deepEqual(woerter('/Users/anna\nweiter unten /ein/pfad'), ['Users/anna'])
  assert.equal(woerter(`/Users/${'x'.repeat(200)}`)[0].length, 'Users/'.length + 64)
  for (const streng of ['$env:LOCALAPPDATA', '%APPDATA%', 'api/users/123']) assert.ok(findePersoenlichePfade(streng).length > 0, streng)
})

test('pruefeAufPersoenlichePfade: sauber ⇒ kein Wurf; Treffer ⇒ Wurf mit Ort und Fundstelle', () => {
  assert.doesNotThrow(() => pruefeAufPersoenlichePfade('C:\\aiw-nachweis\\x', 'Screenshot 01.webp'))
  assert.throws(
    () => pruefeAufPersoenlichePfade('Pfad: C:\\Users\\anna\\AppData\\Local\\Temp\\x', 'Screenshot 01.webp'),
    (fehler) => fehler instanceof Error && fehler.message.includes('Screenshot 01.webp') && fehler.message.includes('C:\\Users\\anna')
  )
})
