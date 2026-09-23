/**
 * Datei: src/ausfuehrung-vorbedingung/ausfuehrung-vorbedingung.test.ts
 *
 * Zweck: node:test-Fälle für pruefeAusfuehrungsVorbedingung (E-F39-1=B, löst F-643). Deckt
 * Stefans genannte Fälle ab: main, master, detached HEAD, unsauberer Baum, Ausnahme-Pfade
 * ignoriert, sauberer Baum + Branch ≠ main/master startet.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ermittleBranchAusHead, filtereUnsaubereZeilen, pruefeAusfuehrungsVorbedingung } from './index.ts'

const HEAD_MAIN = 'ref: refs/heads/main\n'
const HEAD_MASTER = 'ref: refs/heads/master\n'
const HEAD_FEATURE = 'ref: refs/heads/fix/f39-ausfuehrung-vorbedingung\n'
const HEAD_DETACHED = 'a1b2c3d4e5f6789012345678901234567890abcd\n'

// ─── ermittleBranchAusHead ───────────────────────────────────────────────────

test('ermittleBranchAusHead: liest den Branch-Namen aus einem regulären HEAD', () => {
  assert.strictEqual(ermittleBranchAusHead(HEAD_MAIN), 'main')
  assert.strictEqual(ermittleBranchAusHead(HEAD_FEATURE), 'fix/f39-ausfuehrung-vorbedingung')
})

test('ermittleBranchAusHead: liefert null bei losgelöstem HEAD (roher Commit-Hash)', () => {
  assert.strictEqual(ermittleBranchAusHead(HEAD_DETACHED), null)
})

// ─── filtereUnsaubereZeilen ──────────────────────────────────────────────────

test('filtereUnsaubereZeilen: bekannte Ausnahme-Pfade werden herausgefiltert', () => {
  const roh = [
    '?? kontrollzustand/jarvis-jarvis-chat-abc/',
    '?? state/nachweis-runde2-turn1-detail.json',
    '?? stdin-check.js',
    '?? scripts/.aufraeumen-reste/12345.jsonl',
  ].join('\n')
  assert.deepStrictEqual(filtereUnsaubereZeilen(roh), [])
})

test('filtereUnsaubereZeilen: eine echte Änderung außerhalb der Ausnahmen bleibt stehen', () => {
  const roh = ' M scripts/leitstand-server.mjs\n?? kontrollzustand/lauf-abc/\n'
  assert.deepStrictEqual(filtereUnsaubereZeilen(roh), [' M scripts/leitstand-server.mjs'])
})

test('filtereUnsaubereZeilen: leere Ausgabe liefert ein leeres Array', () => {
  assert.deepStrictEqual(filtereUnsaubereZeilen(''), [])
  assert.deepStrictEqual(filtereUnsaubereZeilen('\n'), [])
})

// ─── pruefeAusfuehrungsVorbedingung ──────────────────────────────────────────

test("Rot: Branch 'main' wird abgelehnt", () => {
  const ergebnis = pruefeAusfuehrungsVorbedingung(HEAD_MAIN, '')
  assert.equal(ergebnis.ok, false)
  assert.match(ergebnis.ok ? '' : ergebnis.grund, /du bist auf main/)
})

test("Rot: Branch 'master' wird abgelehnt", () => {
  const ergebnis = pruefeAusfuehrungsVorbedingung(HEAD_MASTER, '')
  assert.equal(ergebnis.ok, false)
  assert.match(ergebnis.ok ? '' : ergebnis.grund, /du bist auf master/)
})

test('Rot: losgelöster (detached) HEAD wird abgelehnt', () => {
  const ergebnis = pruefeAusfuehrungsVorbedingung(HEAD_DETACHED, '')
  assert.equal(ergebnis.ok, false)
  assert.match(ergebnis.ok ? '' : ergebnis.grund, /losgelöst \(detached\)/)
})

test('Rot: ein unsauberer Arbeitsbaum auf einem gültigen Branch wird abgelehnt', () => {
  const ergebnis = pruefeAusfuehrungsVorbedingung(HEAD_FEATURE, ' M scripts/leitstand-server.mjs\n')
  assert.equal(ergebnis.ok, false)
  assert.match(ergebnis.ok ? '' : ergebnis.grund, /Arbeitsbaum ist nicht sauber/)
})

test('Grün: Ausnahme-Pfade allein machen den Baum nicht unsauber', () => {
  const roh = ['?? kontrollzustand/lauf-abc/', '?? state/nachweis-runde2-turns.sh', '?? stdin-check.js'].join('\n')
  assert.deepStrictEqual(pruefeAusfuehrungsVorbedingung(HEAD_FEATURE, roh), { ok: true })
})

test('Grün: sauberer Baum + Branch ≠ main/master startet', () => {
  assert.deepStrictEqual(pruefeAusfuehrungsVorbedingung(HEAD_FEATURE, ''), { ok: true })
})
