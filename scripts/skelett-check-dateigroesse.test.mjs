/**
 * Datei: scripts/skelett-check-dateigroesse.test.mjs
 *
 * Zweck: F45 B3a (Plan features/F45/plan-b3a-v2.md) — Grün-/Rot-Fälle der harten Dateigrenze des Projekt-Skeletts
 * (vorlagen/projekt-skelett/scripts/check-dateigroesse.mjs). Liegt bewusst in ai-workforce und nicht im Skelett — eine
 * Testdatei im Skelett würde in jedes neue Projekt kopiert (wie scripts/skelett-check-gates.test.mjs).
 *
 * Wird aufgerufen von:
 * - npm run test (node --test)
 */

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { pruefeDateigroessen, zaehleZeilen } from '../vorlagen/projekt-skelett/scripts/check-dateigroesse.mjs'
import { wegwerfOrdner } from './_wegwerf.ts'

const SKELETT = join(import.meta.dirname, '..', 'vorlagen', 'projekt-skelett')
const SKRIPT = join(SKELETT, 'scripts', 'check-dateigroesse.mjs')
const wurzel = wegwerfOrdner('skelett-dateigroesse')

let zaehler = 0
/**
 * Wegwerf-Projekt mit Dateien.
 * @param {Record<string, string>} dateien - relativer Pfad → Inhalt
 * @returns {string} Ordner
 */
function projekt(dateien) {
  const ordner = join(wurzel, `p${++zaehler}`)
  for (const [pfad, inhalt] of Object.entries(dateien)) {
    mkdirSync(join(ordner, pfad, '..'), { recursive: true })
    writeFileSync(join(ordner, pfad), inhalt)
  }
  return ordner
}

/**
 * Text mit n Zeilen, jede mit Zeilenumbruch.
 * @param {number} n - Anzahl Zeilen
 * @returns {string} Text
 */
const zeilen = (n) => 'x\n'.repeat(n)

test('zaehleZeilen zählt wie wc -l, eine letzte Zeile ohne Umbruch zählt mit', () => {
  assert.equal(zaehleZeilen(''), 0)
  assert.equal(zaehleZeilen('a\n'), 1)
  assert.equal(zaehleZeilen('a\nb'), 2)
  assert.equal(zaehleZeilen('a\r\nb\r\n'), 2)
})

test('800 Zeilen grün, 801 rot, letzte Zeile ohne Umbruch zählt', () => {
  const ordner = projekt({
    'src/genau.ts': zeilen(800),
    'src/zu-gross.mjs': zeilen(801),
    'lib/ohne-umbruch.js': `${zeilen(800)}x`,
  })
  assert.deepEqual(pruefeDateigroessen(ordner), [
    { pfad: 'lib/ohne-umbruch.js', zeilen: 801 },
    { pfad: 'src/zu-gross.mjs', zeilen: 801 },
  ])
})

test('node_modules und Punkt-Ordner (jede Tiefe), Ausgaben an der Wurzel, Nicht-Code und Ausnahmen zählen nicht', () => {
  const gross = zeilen(900)
  const ordner = projekt({
    'node_modules/a/index.js': gross,
    'src/node_modules/b.js': gross,
    '.claude/hooks/commit-guard.cjs': gross,
    '.git/hooks/x.js': gross,
    '.next/server/seite.js': gross,
    'src/.cache/y.js': gross,
    'dist/bundle.js': gross,
    'daten/gross.json': gross,
    'src/erlaubt.ts': gross,
    'src/build/zaehlt.ts': gross,
  })
  assert.deepEqual(pruefeDateigroessen(ordner, new Map([['src/erlaubt.ts', 'Test']])), [
    { pfad: 'src/build/zaehlt.ts', zeilen: 900 },
  ])
})

test('Haupteinstieg: Exit 0 ohne Code und am echten Skelett, Exit 1 mit Pfad bei 801 Zeilen', () => {
  const lauf = (cwd) => spawnSync(process.execPath, [SKRIPT], { cwd, encoding: 'utf8' })
  assert.equal(lauf(projekt({ 'README.md': 'x\n' })).status, 0)
  assert.equal(lauf(SKELETT).status, 0)
  const rot = lauf(projekt({ 'src/a.ts': zeilen(801) }))
  assert.equal(rot.status, 1)
  assert.match(rot.stderr, /src\/a\.ts: 801 Zeilen \(Grenze 800\)/)
})

test('Aufruf über eine Junction prüft trotzdem (Haupteinstieg über realpath, nicht still grün)', () => {
  const echt = projekt({ 'src/a.ts': zeilen(801), 'scripts/.gitkeep': '' })
  cpSync(SKRIPT, join(echt, 'scripts', 'check-dateigroesse.mjs'))
  const verweis = join(wurzel, `verweis-${zaehler}`)
  symlinkSync(echt, verweis, 'junction')
  const lauf = spawnSync(process.execPath, [join(verweis, 'scripts', 'check-dateigroesse.mjs')], {
    cwd: verweis,
    encoding: 'utf8',
  })
  assert.equal(lauf.status, 1)
  assert.match(lauf.stderr, /src\/a\.ts: 801 Zeilen/)
})
