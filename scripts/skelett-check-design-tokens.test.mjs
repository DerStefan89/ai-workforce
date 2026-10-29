/**
 * Datei: scripts/skelett-check-design-tokens.test.mjs
 *
 * Zweck: F45 B3b-1 (Plan features/F45/plan-b3b1-v2.md) — Grün-/Rot-Fälle des Design-Gates im Projekt-Skelett
 * (vorlagen/projekt-skelett/scripts/check-design-tokens.mjs). Liegt bewusst in ai-workforce und nicht im Skelett — eine
 * Testdatei im Skelett würde in jedes neue Projekt kopiert (wie scripts/skelett-check-dateigroesse.test.mjs).
 *
 * Wird aufgerufen von:
 * - npm run test (node --test)
 */

import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { pruefeCss, pruefeDesignTokens } from '../vorlagen/projekt-skelett/scripts/check-design-tokens.mjs'
import { wegwerfOrdner } from './_wegwerf.ts'

const wurzel = wegwerfOrdner('skelett-design-tokens')

let zaehler = 0
/**
 * Wegwerf-Projekt mit Dateien.
 * @param {Record<string, string>} dateien - relativer Pfad → Inhalt
 * @returns {string} Ordner
 */
function projekt(dateien) {
  const ordner = join(wurzel, `p${++zaehler}`)
  mkdirSync(ordner, { recursive: true })
  for (const [pfad, inhalt] of Object.entries(dateien)) {
    mkdirSync(join(ordner, pfad, '..'), { recursive: true })
    writeFileSync(join(ordner, pfad), inhalt)
  }
  return ordner
}

const TOKENS = `:root { --text: #1a1a1a; --flaeche: oklch(98% 0.01 90); }
:root[data-theme="dark"] { --text: #f2f2f2; }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { --text: rgb(240 240 240); }
}
body { color: var(--text); background: color-mix(in oklab, var(--flaeche) 80%, transparent); }
`

test('kein CSS: grün mit 0 Dateien (kein UI)', () => {
  assert.deepEqual(pruefeDesignTokens(projekt({ 'src/a.ts': 'export {}\n' })), { dateien: 0, befunde: [] })
})

test('Tokens in :root, :root[data-theme], prefers-color-scheme und var()-Nutzung sind grün', () => {
  assert.deepEqual(pruefeDesignTokens(projekt({ 'src/style.css': TOKENS })), { dateien: 1, befunde: [] })
})

test('Hex in Kommentar, String und url() zählt nicht', () => {
  const css = '/* #ff0000 */ .a::before { content: "#fff"; background: url(data:image/svg+xml,%23fff#x); }\n'
  assert.deepEqual(pruefeCss('a.css', css).befunde, [])
})

test('Literal außerhalb :root ist rot, mit Datei und Zeile', () => {
  const { befunde } = pruefeDesignTokens(projekt({ 'src/style.css': `${TOKENS}.knopf {\n  color: #c00;\n}\n` }))
  assert.equal(befunde.length, 1)
  assert.match(befunde[0] ?? '', /^src\/style\.css:8: Farbliteral in „color“/)
})

test('Farbfunktion außerhalb :root und Token in einer Klasse sind rot', () => {
  assert.equal(pruefeCss('a.css', '.a { border-color: oklch(50% 0.1 30); }').befunde.length, 1)
  assert.equal(pruefeCss('a.css', '.karte { --c: #123456; }').befunde.length, 1)
  assert.equal(pruefeCss('a.css', '@media (min-width: 40em) { :root { --c: #123; } }').befunde.length, 1)
})

test('Literal in :root ohne -- ist rot', () => {
  assert.equal(pruefeCss('a.css', ':root { color: #123; }').befunde.length, 1)
})

test('Animation ohne reduced-motion ist rot, mit Block (auch in anderer Datei) grün', () => {
  const animiert = '@keyframes ein { from { opacity: 0 } to { opacity: 1 } }\n.a { animation: ein 0.6s both; }\n'
  const rot = pruefeDesignTokens(projekt({ 'a.css': animiert }))
  assert.equal(rot.befunde.length, 1)
  assert.match(rot.befunde[0] ?? '', /prefers-reduced-motion/)
  const reduziert = '@media (prefers-reduced-motion: reduce) { .a { animation: none; } }\n'
  assert.deepEqual(pruefeDesignTokens(projekt({ 'a.css': animiert, 'b.css': reduziert })).befunde, [])
})

test('Bewegung nur in no-preference ist grün, ein verneinter reduce-Block nicht', () => {
  const opt = '@media (prefers-reduced-motion: no-preference) { .a { transition: opacity 0.2s; } }\n'
  assert.deepEqual(pruefeDesignTokens(projekt({ 'a.css': opt })).befunde, [])
  const verneint =
    '.a { transition: opacity 0.2s; }\n@media not (prefers-reduced-motion: reduce) { .a { color: inherit; } }\n'
  assert.equal(pruefeDesignTokens(projekt({ 'a.css': verneint })).befunde.length, 1)
})

test('Kommaliste aus :root-Selektoren ist ein Token-Block, eine Mischung mit Klasse nicht', () => {
  assert.deepEqual(pruefeCss('a.css', ':root, :root[data-theme="hell"] { --x: #fff; }').befunde, [])
  assert.equal(pruefeCss('a.css', ':root, .karte { --x: #fff; }').befunde.length, 1)
})

test('transition zählt als Bewegung, transition: none nicht', () => {
  assert.equal(pruefeCss('a.css', '.a { transition: transform 0.2s ease; }').bewegung, true)
  assert.equal(pruefeCss('a.css', '.a { transition: none; }').bewegung, false)
})

test('offener Kommentar ist rot', () => {
  const { befunde } = pruefeDesignTokens(projekt({ 'a.css': '/* offen\n.a { color: var(--x); }\n/* zu */\n' }))
  assert.equal(befunde.length, 1)
  assert.match(befunde[0] ?? '', /2× „\/\*“, aber 1× „\*\/“/)
})

test('dist/, build/, node_modules/ und Punkt-Ordner werden übersprungen; Ausnahmen mit Begründung', () => {
  const schlecht = '.a { color: #f00; }\n'
  const ordner = projekt({
    'dist/a.css': schlecht,
    'build/a.css': schlecht,
    'node_modules/x/a.css': schlecht,
    '.next/static/a.css': schlecht,
    'public/vendor/fremd.css': schlecht,
  })
  assert.equal(pruefeDesignTokens(ordner).befunde.length, 1)
  assert.deepEqual(pruefeDesignTokens(ordner, new Map([['public/vendor/fremd.css', 'Fremd-CSS']])), {
    dateien: 0,
    befunde: [],
  })
})
