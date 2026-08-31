/**
 * Datei: src/claude-code-gateway/claude-code-gateway.test.ts
 *
 * Zweck: node:test-Fälle für das Claude-Code-Gateway (F6a WS1,
 * state/tasks/f6a-claude-code-gateway-ws1.md). Deckt baueAufruf
 * (Grünfall, Wurf ohne modell) und pruefeUndVerweigereBeiTreffer
 * (Grünfall, Rot-Fall mit realem verweigereStart-Aufruf über F1Bs
 * schreibeWirkungsmarke, Beleg über stelleLaufstatusFest — Muster wie F4s
 * eigener AC7-Test — sowie der F-048-Fenster-Rot-Fall).
 */

import { randomUUID } from 'node:crypto'
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { schreibeWirkungsmarke, stelleLaufstatusFest } from '../checkpoint-store/index.ts'
import type { ProfilReferenz } from '../checkpoint-store/types.ts'
import { baueAufruf, pruefeUndVerweigereBeiTreffer } from './index.ts'
import type { AufrufEingaben } from './types.ts'

const KONTROLLZUSTAND_BASIS = 'kontrollzustand-test'
const PROFIL_REFERENZ: ProfilReferenz = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }

function neueLaufId(praefix: string): string {
  return `${praefix}-${randomUUID()}`
}

function raeumeKette(laufId: string): void {
  rmSync(join(KONTROLLZUSTAND_BASIS, laufId), { recursive: true, force: true })
}

function gueltigeEingaben(): AufrufEingaben {
  return { modell: 'sonnet', werkzeugsatz: { modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Read', 'Grep'] } }
}

test('baueAufruf liefert das erwartete Tokens-Array — Grünfall', () => {
  const tokens = baueAufruf(gueltigeEingaben())
  assert.deepStrictEqual(tokens, ['--model', 'sonnet', '--output-format', 'json', '--setting-sources', 'project', '--tools', 'Read,Grep'])
})

test('baueAufruf wirft ohne modell', () => {
  const eingaben = { modell: '', werkzeugsatz: { modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Read'] } } as AufrufEingaben
  assert.throws(() => baueAufruf(eingaben))
})

test('pruefeUndVerweigereBeiTreffer liefert ok:true bei unauffälligen Tokens — Grünfall', () => {
  const tokens = baueAufruf(gueltigeEingaben())
  const ergebnis = pruefeUndVerweigereBeiTreffer(tokens, neueLaufId('gruen'), PROFIL_REFERENZ, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
  assert.strictEqual(ergebnis.ok, true)
})

test('pruefeUndVerweigereBeiTreffer verweigert bei verbotenem Aufrufparameter und schreibt eine reale VERWEIGERT-Terminalmarke — Rot-Fall', () => {
  const laufId = neueLaufId('rot')
  try {
    schreibeWirkungsmarke(laufId, PROFIL_REFERENZ, 'run_prepared', {}, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    const tokens = ['--model', 'sonnet', '--dangerously-skip-permissions']
    const ergebnis = pruefeUndVerweigereBeiTreffer(tokens, laufId, PROFIL_REFERENZ, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })

    assert.strictEqual(ergebnis.ok, false)
    assert.ok(!ergebnis.ok)
    assert.match(ergebnis.grund, /E-182/)

    const status = stelleLaufstatusFest(laufId, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.strictEqual(status.status, 'ABGESCHLOSSEN')
    assert.ok(status.status === 'ABGESCHLOSSEN')
    assert.strictEqual(status.ergebnis, 'VERWEIGERT')
  } finally {
    raeumeKette(laufId)
  }
})

test('pruefeUndVerweigereBeiTreffer verweigert beim F-048-Fenster-Fall (mehrwortiger Verbotseintrag im Tokens-Array)', () => {
  const laufId = neueLaufId('rot-f048')
  try {
    schreibeWirkungsmarke(laufId, PROFIL_REFERENZ, 'run_prepared', {}, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    const tokens = ['--model', 'sonnet', '--permission-mode', 'bypassPermissions', '--output-format', 'json']
    const ergebnis = pruefeUndVerweigereBeiTreffer(tokens, laufId, PROFIL_REFERENZ, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })

    assert.strictEqual(ergebnis.ok, false)
    assert.ok(!ergebnis.ok)
    assert.match(ergebnis.grund, /E-182/)
    assert.match(ergebnis.grund, /--permission-mode bypassPermissions/)

    const status = stelleLaufstatusFest(laufId, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.strictEqual(status.status, 'ABGESCHLOSSEN')
    assert.ok(status.status === 'ABGESCHLOSSEN')
    assert.strictEqual(status.ergebnis, 'VERWEIGERT')
  } finally {
    raeumeKette(laufId)
  }
})
