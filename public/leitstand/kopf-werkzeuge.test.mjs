/**
 * Datei: public/leitstand/kopf-werkzeuge.test.mjs
 *
 * Zweck: node:test für den VS-Code-Link der Kopf-Knöpfe (F44 WS-8b, kopf-werkzeuge.js): nur aus
 * Konstante + absolutem repo_pfad, Backslash → '/', kodiert; relativer oder fehlender Pfad → null.
 *
 * Wird aufgerufen von: `npm test` (node --test)
 *
 * Wichtig: renderVsCodeLinks (DOM) prüft der Render-Nachweis features/F44/nachweise/ws8b/klicks.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { VSCODE_PRAEFIX, baueVsCodeLink } from './kopf-werkzeuge.js'

test('baueVsCodeLink: Windows-Pfad mit Backslash und Leerzeichen', () => {
  assert.equal(baueVsCodeLink('C:\\Users\\stefa\\Projekte\\mein projekt'), 'vscode://file/C:/Users/stefa/Projekte/mein%20projekt')
  assert.equal(baueVsCodeLink('D:/repo'), 'vscode://file/D:/repo')
})

test('baueVsCodeLink: POSIX-Pfad, Sonderzeichen kodiert', () => {
  assert.equal(baueVsCodeLink('/home/s/repo'), 'vscode://file/home/s/repo')
  assert.equal(baueVsCodeLink('C:\\a#b\\c?d\\ä'), 'vscode://file/C:/a%23b/c%3Fd/%C3%A4')
})

test('baueVsCodeLink: relativer, leerer oder fehlender Pfad liefert null', () => {
  for (const wert of ['.', 'projekte/x', '', '   ', null, undefined, 42, 'javascript:alert(1)', '\\\\server\\share', '//server/share', '/']) {
    assert.equal(baueVsCodeLink(wert), null, String(wert))
  }
})

test('baueVsCodeLink: Ergebnis beginnt immer mit der Konstante', () => {
  assert.ok(baueVsCodeLink('C:\\x').startsWith(VSCODE_PRAEFIX))
  assert.equal(VSCODE_PRAEFIX, 'vscode://file/')
})
