/**
 * Datei: src/budget/budget.test.ts
 *
 * Zweck: node:test-Fälle für das Budget je Arbeitspaket (F45 B2b-3c, F-981, features/F45/plan-b2b3c.md §2): Summe der
 * vier Token-Felder, Default je Kontrolltiefe, Vorrang des Arbeitspakets, Überschreitung, Erhöhung und die Umwandlung
 * eines Automaten-Ausgangs in den Budget-Halt.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { NaechsterSchritt, WorkflowV0Schritt } from '../workflow/types.ts'
import {
  BUDGET_DEFAULTS,
  baueBudgetHaltGrund,
  bestimmeBudget,
  erhoehtesBudget,
  istBudgetHaltGrund,
  istUeberschritten,
  kontrolltiefeAusSchritten,
  tokensDesVerbrauchs,
  wendeBudgetAn,
} from './index.ts'

const VERBRAUCH = { input_tokens: 10, output_tokens: 20, cache_read_tokens: 300, cache_write_tokens: 4000, dauer_ms: 1, dauer_api_ms: null, turns: null, quelle: 'claude-code' }

function schritt(schritt_id: string, rolle: string): WorkflowV0Schritt {
  return { schritt_id, rolle, werkzeugsatz: 'lesend', worker: 'claude-code', modell: 'm', eingaben: [], output_schema: null, freigabe: 'AUTOMATISCH', risiko: 'r', zeitgrenze_ms: 1, nachfolger: null, status: 'OFFEN', lauf_id: null }
}

test('tokensDesVerbrauchs: Summe aller vier Felder; fehlend oder ungültig ⇒ null', () => {
  assert.equal(tokensDesVerbrauchs(VERBRAUCH), 4330)
  assert.equal(tokensDesVerbrauchs(undefined), null)
  assert.equal(tokensDesVerbrauchs(null), null)
  assert.equal(tokensDesVerbrauchs({ ...VERBRAUCH, cache_read_tokens: -1 }), null)
  assert.equal(tokensDesVerbrauchs({ ...VERBRAUCH, output_tokens: 1.5 }), null)
  assert.equal(tokensDesVerbrauchs({ input_tokens: 1 }), null)
})

test('BUDGET_DEFAULTS: abgeleitete Werte (Plan §1), hoch nie unter standard', () => {
  assert.deepEqual(BUDGET_DEFAULTS, { 'fast-lane': 5_300_000, standard: 14_700_000, hoch: 14_700_000 })
  assert.ok(BUDGET_DEFAULTS.hoch >= BUDGET_DEFAULTS.standard && BUDGET_DEFAULTS.standard >= BUDGET_DEFAULTS['fast-lane'])
})

test('bestimmeBudget: Arbeitspaket vor Default; ungültiges Feld zählt nicht', () => {
  assert.deepEqual(bestimmeBudget(undefined, 'standard'), { tokens: 14_700_000, quelle: 'default' })
  assert.deepEqual(bestimmeBudget(undefined, 'fast-lane'), { tokens: 5_300_000, quelle: 'default' })
  assert.deepEqual(bestimmeBudget(2_000_000, 'hoch'), { tokens: 2_000_000, quelle: 'arbeitspaket' })
  assert.deepEqual(bestimmeBudget(0, 'hoch'), { tokens: 14_700_000, quelle: 'default' })
})

test('kontrolltiefeAusSchritten: architekt/advisor ⇒ hoch, code-reviewer ⇒ standard, sonst fast-lane', () => {
  assert.equal(kontrolltiefeAusSchritten([schritt('a', 'architekt'), schritt('b', 'ausfuehrung')]), 'hoch')
  assert.equal(kontrolltiefeAusSchritten([schritt('a', 'architecture-advisor')]), 'hoch')
  assert.equal(kontrolltiefeAusSchritten([schritt('a', 'ausfuehrung'), schritt('b', 'code-reviewer')]), 'standard')
  assert.equal(kontrolltiefeAusSchritten([schritt('a', 'ausfuehrung')]), 'fast-lane')
  assert.equal(kontrolltiefeAusSchritten([]), 'fast-lane')
})

test('istUeberschritten: nur echt größer; genau erreicht ist kein Halt', () => {
  assert.equal(istUeberschritten(101, 100), true)
  assert.equal(istUeberschritten(100, 100), false)
  assert.equal(istUeberschritten(0, 100), false)
})

test('erhoehtesBudget: Summe plus Schritt — immer über der Summe', () => {
  assert.equal(erhoehtesBudget(15_000_000, 14_700_000), 29_700_000)
  assert.ok(erhoehtesBudget(15_000_000, 1) > 15_000_000)
})

test('baueBudgetHaltGrund: lesbar mit beiden Zahlen; istBudgetHaltGrund erkennt ihn (auch als Teil)', () => {
  const grund = baueBudgetHaltGrund(15_234_567, 14_700_000)
  assert.match(grund, /^Budget erreicht: 15\.234\.567 von 14\.700\.000 Tokens/)
  assert.equal(istBudgetHaltGrund(grund), true)
  assert.equal(istBudgetHaltGrund(`automatische Fortsetzung fehlgeschlagen (konflikt): ${grund}`), true)
  assert.equal(istBudgetHaltGrund('Schritt endete FEHLGESCHLAGEN'), false)
  assert.equal(istBudgetHaltGrund(null), false)
})

test('wendeBudgetAn: starte/haltFreigabe ⇒ Budget-Halt mit Cursor auf dem fälligen Schritt', () => {
  const stand = { summe: 200, tokens: 100, ueberschritten: true }
  const starte: NaechsterSchritt = { art: 'starte', schritt: schritt('s2', 'code-reviewer'), aktiverSchrittId: 's2' }
  const halt = wendeBudgetAn(starte, stand)
  assert.equal(halt.art, 'haltKlaerung')
  assert.equal(halt.aktiverSchrittId, 's2')
  assert.equal(halt.art === 'haltKlaerung' && istBudgetHaltGrund(halt.grund), true)
  const freigabe: NaechsterSchritt = { art: 'haltFreigabe', schrittId: 's1', aktiverSchrittId: 's1' }
  assert.deepEqual(wendeBudgetAn(freigabe, stand), { art: 'haltKlaerung', grund: baueBudgetHaltGrund(200, 100), aktiverSchrittId: 's1' })
})

test('wendeBudgetAn: fertig, Halt und nicht überschritten bleiben unverändert; null-Stand ändert nichts', () => {
  const stand = { summe: 200, tokens: 100, ueberschritten: true }
  const fertig: NaechsterSchritt = { art: 'fertig', aktiverSchrittId: null }
  const klaerung: NaechsterSchritt = { art: 'haltKlaerung', grund: 'anderer Grund', aktiverSchrittId: 's1' }
  const starte: NaechsterSchritt = { art: 'starte', schritt: schritt('s2', 'qa'), aktiverSchrittId: 's2' }
  assert.equal(wendeBudgetAn(fertig, stand), fertig)
  assert.equal(wendeBudgetAn(klaerung, stand), klaerung)
  assert.equal(wendeBudgetAn(starte, { summe: 50, tokens: 100, ueberschritten: false }), starte)
  assert.equal(wendeBudgetAn(starte, null), starte)
})
