/**
 * Datei: src/rollen/rollen.test.ts
 *
 * Zweck: node:test-Fälle für das Rollenregister (F17 WS-1, AK1/AK2).
 * scripts/check-f17-rollenvertrag.mjs prüft dieselben Verträge zusätzlich
 * per Repo-Scan (D5-Muster: kein zweiter, von Hand nachgebauter
 * Regelsatz) — diese Datei prüft istBekannteRolle/bekannteRollen sowie die
 * Vollständigkeit und Form der vier Verträge direkt.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bekannteRollen, istBekannteRolle, ROLLENVERTRAEGE } from './index.ts'

const ERWARTETE_ROLLEN = ['architecture-advisor', 'ausfuehrung', 'code-reviewer', 'qa'].sort()

test('bekannteRollen: liefert genau die vier realen Rollen, sortiert', () => {
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

test('ROLLENVERTRAEGE: code-reviewer ist die einzige Rolle mit gesetztem erlaubtes_output_schema', () => {
  assert.strictEqual(ROLLENVERTRAEGE['code-reviewer'].erlaubtes_output_schema, 'ergebnis-code-reviewer')
  for (const rolle of ['architecture-advisor', 'qa', 'ausfuehrung']) {
    assert.strictEqual(ROLLENVERTRAEGE[rolle].erlaubtes_output_schema, null, `${rolle}.erlaubtes_output_schema sollte null sein`)
  }
})

test('ROLLENVERTRAEGE: nur ausfuehrung erlaubt einen schreibenden Werkzeugsatz und codex bleibt auf lesende Rollen beschränkt', () => {
  for (const [rolle, vertrag] of Object.entries(ROLLENVERTRAEGE)) {
    if (rolle === 'ausfuehrung') {
      assert.deepStrictEqual([...vertrag.erlaubte_werkzeugsatz_arten].sort(), ['lesend', 'schreibend'])
      assert.deepStrictEqual(vertrag.erlaubte_worker, ['claude-code'])
    } else {
      assert.deepStrictEqual(vertrag.erlaubte_werkzeugsatz_arten, ['lesend'])
      assert.deepStrictEqual([...vertrag.erlaubte_worker].sort(), ['claude-code', 'codex'])
    }
  }
})
