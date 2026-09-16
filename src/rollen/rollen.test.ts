/**
 * Datei: src/rollen/rollen.test.ts
 *
 * Zweck: node:test-Fälle für das Rollenregister (F17 WS-1 AK1/AK2, F18 WS-1
 * für den Eintrag 'router'). scripts/check-f17-rollenvertrag.mjs prüft
 * dieselben Verträge zusätzlich per Repo-Scan (D5-Muster: kein zweiter, von
 * Hand nachgebauter Regelsatz) — diese Datei prüft istBekannteRolle/
 * bekannteRollen sowie die Vollständigkeit und Form aller Verträge direkt.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bekannteRollen, istBekannteRolle, ROLLENVERTRAEGE } from './index.ts'

const ERWARTETE_ROLLEN = ['architecture-advisor', 'ausfuehrung', 'code-reviewer', 'qa', 'router', 'scout'].sort()

test('bekannteRollen: liefert genau die sechs realen Rollen, sortiert', () => {
  assert.deepStrictEqual(bekannteRollen(), ERWARTETE_ROLLEN)
})

test('istBekannteRolle: true für jede reale Rolle', () => {
  for (const rolle of ERWARTETE_ROLLEN) {
    assert.strictEqual(istBekannteRolle(rolle), true, `Rolle '${rolle}' sollte bekannt sein`)
  }
})

test('istBekannteRolle: false für eine unbekannte oder leere Rolle', () => {
  assert.strictEqual(istBekannteRolle('planner'), false)
  assert.strictEqual(istBekannteRolle(''), false)
})

test('ROLLENVERTRAEGE: jede Rolle trägt alle fünf Vertragsfelder in gültiger Form', () => {
  for (const [rolle, vertrag] of Object.entries(ROLLENVERTRAEGE)) {
    assert.ok(typeof vertrag.zweck === 'string' && vertrag.zweck.length > 0, `${rolle}.zweck fehlt`)
    assert.ok(vertrag.erlaubte_werkzeugsatz_arten.length > 0, `${rolle}.erlaubte_werkzeugsatz_arten ist leer`)
    assert.ok(vertrag.erlaubte_worker.length > 0, `${rolle}.erlaubte_worker ist leer`)
    assert.ok(vertrag.erlaubtes_output_schema === null || typeof vertrag.erlaubtes_output_schema === 'string', `${rolle}.erlaubtes_output_schema hat falschen Typ`)
    assert.ok(Array.isArray(vertrag.ausschlussmuster), `${rolle}.ausschlussmuster ist kein Array`)
  }
})

test('ROLLENVERTRAEGE: ausschlussmuster byte-gleich zu den Werten vor der Migration (AK2)', () => {
  assert.deepStrictEqual(ROLLENVERTRAEGE['architecture-advisor'].ausschlussmuster, ['src/**'])
  assert.deepStrictEqual(ROLLENVERTRAEGE['code-reviewer'].ausschlussmuster, ['state/tasks/**'])
  assert.deepStrictEqual(ROLLENVERTRAEGE.qa.ausschlussmuster, ['state/tasks/**'])
  assert.deepStrictEqual(ROLLENVERTRAEGE.ausfuehrung.ausschlussmuster, [])
})

test('ROLLENVERTRAEGE: nur code-reviewer, router und scout tragen ein erlaubtes_output_schema', () => {
  assert.strictEqual(ROLLENVERTRAEGE['code-reviewer'].erlaubtes_output_schema, 'ergebnis-code-reviewer')
  assert.strictEqual(ROLLENVERTRAEGE.router.erlaubtes_output_schema, 'ergebnis-router')
  assert.strictEqual(ROLLENVERTRAEGE.scout.erlaubtes_output_schema, 'ergebnis-scout')
  for (const rolle of ['architecture-advisor', 'qa', 'ausfuehrung']) {
    assert.strictEqual(ROLLENVERTRAEGE[rolle].erlaubtes_output_schema, null, `${rolle}.erlaubtes_output_schema sollte null sein`)
  }
})

test("ROLLENVERTRAEGE: router ist lesend-only, für beide Worker freigegeben und schließt src/** aus", () => {
  assert.deepStrictEqual(ROLLENVERTRAEGE.router.erlaubte_werkzeugsatz_arten, ['lesend'])
  assert.deepStrictEqual([...ROLLENVERTRAEGE.router.erlaubte_worker].sort(), ['claude-code', 'codex'])
  assert.deepStrictEqual(ROLLENVERTRAEGE.router.ausschlussmuster, ['src/**'])
})

test("ROLLENVERTRAEGE: scout ist recherchierend-only, nur claude-code erlaubt und schließt src/** aus (F27 WS-1)", () => {
  assert.deepStrictEqual(ROLLENVERTRAEGE.scout.erlaubte_werkzeugsatz_arten, ['recherchierend'])
  assert.deepStrictEqual(ROLLENVERTRAEGE.scout.erlaubte_worker, ['claude-code'])
  assert.deepStrictEqual(ROLLENVERTRAEGE.scout.ausschlussmuster, ['src/**'])
})

test('ROLLENVERTRAEGE: nur ausfuehrung erlaubt einen schreibenden Werkzeugsatz, nur scout einen recherchierenden, und codex bleibt auf lesende Rollen beschränkt', () => {
  for (const [rolle, vertrag] of Object.entries(ROLLENVERTRAEGE)) {
    if (rolle === 'ausfuehrung') {
      assert.deepStrictEqual([...vertrag.erlaubte_werkzeugsatz_arten].sort(), ['lesend', 'schreibend'])
      assert.deepStrictEqual(vertrag.erlaubte_worker, ['claude-code'])
    } else if (rolle === 'scout') {
      assert.deepStrictEqual(vertrag.erlaubte_werkzeugsatz_arten, ['recherchierend'])
      assert.deepStrictEqual(vertrag.erlaubte_worker, ['claude-code'])
    } else {
      assert.deepStrictEqual(vertrag.erlaubte_werkzeugsatz_arten, ['lesend'])
      assert.deepStrictEqual([...vertrag.erlaubte_worker].sort(), ['claude-code', 'codex'])
    }
  }
})
