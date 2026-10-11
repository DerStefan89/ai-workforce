/**
 * Datei: scripts/leitstand/cli-version.test.mjs
 *
 * Zweck: F45 B1b-2 (Kleinpunkt b) — Vergleich installierte gegen deklarierte Claude-Code-Version, Abfrage über
 * `--version` (echter Kindprozess: node selbst als Startziel), Fehlerwege ohne Wurf.
 *
 * Wird aufgerufen von: npm run test (node --test).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ANLEITUNG_STARTFREIGABE, ermittleCliHinweis, frageCliVersion, vergleicheCliVersion } from './cli-version.mjs'

test('vergleicheCliVersion: gleich (auch mit Leerraum) → null, abweichend → Hinweis mit Anleitung', () => {
  assert.equal(vergleicheCliVersion('2.1.296 (Claude Code)\n', '2.1.296 (Claude Code)'), null)
  assert.deepEqual(vergleicheCliVersion('2.1.297 (Claude Code)', '2.1.296 (Claude Code)'), {
    art: 'cliVersionGeaendert',
    installiert: '2.1.297 (Claude Code)',
    deklariert: '2.1.296 (Claude Code)',
    anleitung: ANLEITUNG_STARTFREIGABE,
  })
  for (const [a, b] of [
    [null, 'x'],
    ['x', null],
    ['', 'x'],
    ['x', ' '],
  ]) {
    assert.equal(vergleicheCliVersion(a, b), null)
  }
})

test('frageCliVersion: echter Kindprozess liefert die Version; fehlendes Programm und Unsinn ohne Wurf', async () => {
  const echt = await frageCliVersion([process.execPath])
  assert.deepEqual(echt, { ok: true, version: process.version })
  const fehlt = await frageCliVersion(['C:/gibt/es/nicht/claude.exe'])
  assert.equal(fehlt.ok, false)
  assert.deepEqual(await frageCliVersion([]), { ok: false, grund: 'kein werkzeugStartziel' })
  assert.deepEqual(await frageCliVersion(undefined), { ok: false, grund: 'kein werkzeugStartziel' })
})

test('ermittleCliHinweis: Abweichung → Hinweis, Abfragefehler → null, ohne Vorlage → null', async () => {
  const warnungen = []
  const original = console.warn
  console.warn = (text) => warnungen.push(String(text))
  try {
    const vorlage = { werkzeugStartziel: ['x'], werkzeugVersionDeklariert: '2.1.296 (Claude Code)' }
    assert.equal((await ermittleCliHinweis(vorlage, async () => ({ ok: true, version: '2.1.300 (Claude Code)' })))?.installiert, '2.1.300 (Claude Code)')
    assert.equal(await ermittleCliHinweis(vorlage, async () => ({ ok: true, version: '2.1.296 (Claude Code)' })), null)
    assert.equal(await ermittleCliHinweis(vorlage, async () => ({ ok: false, grund: 'ENOENT' })), null)
    assert.equal(await ermittleCliHinweis(null), null)
  } finally {
    console.warn = original
  }
  assert.equal(warnungen.length, 2)
  assert.match(warnungen[0], /CLI-Version geändert/)
  assert.match(warnungen[1], /nicht abfragbar \(ENOENT\)/)
})
