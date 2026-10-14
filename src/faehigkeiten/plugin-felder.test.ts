/**
 * Datei: src/faehigkeiten/plugin-felder.test.ts
 *
 * Zweck: node:test-Fälle der additiven Plugin-Felder der lokalen Fähigkeiten-Datei (F45 F-3b-1, Plan
 * features/F45/plan-f3b.md v2/v2.1 C): Validator für plugin_freigaben (oben) und plugin_zuordnung (je Projekt), reine Änderer
 * (setzen, zurücknehmen, zuordnen), Standard leer, Kompaktierung, und — Advisor F3 — dass die bestehenden Änderer
 * (aendereAktivierung, setzeInhaltsfreigabe) beide Felder erhalten statt sie still zu löschen.
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { aendereAktivierung, aenderePluginZuordnung, entfernePluginFreigabe, PLUGIN_ROLLEN, projektEinstellungen, setzeInhaltsfreigabe, setzePluginFreigabe, validiereFaehigkeitenLokal, zuordnungsEintrag } from './index.ts'
import type { FaehigkeitenLokal } from './types.ts'

const H = 'a'.repeat(64)
/** Zuordenbare bzw. nicht zuordenbare Rolle — als berechneter Schlüssel (Rollenvertrag-Gate AK1: keine zweite Rollenliste). */
const ROLLE = PLUGIN_ROLLEN[0]
const FREMDE_ROLLE = 'qa'
const FREIGABE = {
  kopie_hash: H,
  pruefbericht: 'pruefbericht-p-kraft-markt-0123abcd@2',
  freigegeben_am: '2026-10-14T10:00:00.000Z',
}
const leer = (): FaehigkeitenLokal => ({
  faehigkeiten_lokal_schema: 'v0',
  projekte: {},
})

test('Validator: gültige Plugin-Felder; falsche Formen werden genannt', () => {
  const gut = {
    faehigkeiten_lokal_schema: 'v0',
    plugin_freigaben: { 'kraft@markt': FREIGABE },
    projekte: {
      'ai-workforce': {
        plugin_zuordnung: {
          [ROLLE]: ['agent:kraft@markt:pruefer', 'skill:kraft@markt:debuggen'],
        },
      },
    },
  }
  assert.deepEqual(validiereFaehigkeitenLokal(gut), [])
  const fehler = (d: unknown): string => validiereFaehigkeitenLokal(d).join(' | ')
  assert.match(fehler({ ...gut, plugin_freigaben: { kraft: FREIGABE } }), /plugin_freigaben/)
  assert.match(
    fehler({
      ...gut,
      plugin_freigaben: { 'kraft@markt': { ...FREIGABE, kopie_hash: 'x' } },
    }),
    /kopie_hash/
  )
  assert.match(
    fehler({
      ...gut,
      plugin_freigaben: { 'kraft@markt': { ...FREIGABE, pruefbericht: 'x@1' } },
    }),
    /pruefbericht/
  )
  assert.match(
    fehler({
      ...gut,
      plugin_freigaben: { 'kraft@markt': { ...FREIGABE, extra: 1 } },
    }),
    /extra/
  )
  assert.match(fehler({ ...gut, plugin_freigaben: [] }), /plugin_freigaben/)
  assert.match(
    fehler({
      ...gut,
      projekte: {
        p: {
          plugin_zuordnung: { [FREMDE_ROLLE]: ['skill:kraft@markt:debuggen'] },
        },
      },
    }),
    /Rolle 'qa'/
  )
  assert.match(
    fehler({
      ...gut,
      projekte: {
        p: { plugin_zuordnung: { [ROLLE]: ['command:kraft@markt:plan'] } },
      },
    }),
    /plugin_zuordnung/
  )
  assert.match(
    fehler({
      ...gut,
      projekte: {
        p: {
          plugin_zuordnung: {
            [ROLLE]: ['skill:kraft@markt:a', 'skill:kraft@markt:a'],
          },
        },
      },
    }),
    /Doppelte/
  )
  assert.match(
    fehler({
      ...gut,
      projekte: { p: { plugin_zuordnung: { [ROLLE]: 'skill:kraft@markt:a' } } },
    }),
    /Array/
  )
})

test('Nur ausfuehrung ist zuordenbar (E-F3b-3); Eintragsform', () => {
  assert.deepEqual([...PLUGIN_ROLLEN], ['ausfuehrung'])
  assert.equal(zuordnungsEintrag('skill', 'kraft@markt', 'debuggen'), 'skill:kraft@markt:debuggen')
  assert.equal(zuordnungsEintrag('command' as never, 'kraft@markt', 'plan'), null)
  assert.equal(zuordnungsEintrag('skill', 'kraft', 'debuggen'), null)
  assert.equal(zuordnungsEintrag('skill', 'kraft@markt', 'a:b'), null)
})

test('Reine Änderer: setzen, zuordnen, zurücknehmen; Standard leer; Kompaktierung', () => {
  const eins = setzePluginFreigabe(leer(), 'kraft@markt', FREIGABE)
  assert.deepEqual(eins.plugin_freigaben, { 'kraft@markt': FREIGABE })
  assert.equal(projektEinstellungen(eins, 'ai-workforce').plugin_zuordnung, undefined)
  const zwei = aenderePluginZuordnung(eins, 'ai-workforce', 'ausfuehrung', 'skill:kraft@markt:debuggen', true)
  assert.deepEqual(projektEinstellungen(zwei, 'ai-workforce').plugin_zuordnung, { [ROLLE]: ['skill:kraft@markt:debuggen'] })
  const drei = aenderePluginZuordnung(zwei, 'ai-workforce', 'ausfuehrung', 'agent:kraft@markt:pruefer', true)
  assert.deepEqual(drei.projekte['ai-workforce'].plugin_zuordnung, {
    [ROLLE]: ['agent:kraft@markt:pruefer', 'skill:kraft@markt:debuggen'],
  })
  // Rücknahme lässt die Zuordnung stehen (wirkt ohne Freigabe nicht).
  const vier = entfernePluginFreigabe(drei, 'kraft@markt')
  assert.equal(vier.plugin_freigaben, undefined)
  assert.equal(projektEinstellungen(vier, 'ai-workforce').plugin_zuordnung?.ausfuehrung?.length, 2)
  const fuenf = aenderePluginZuordnung(aenderePluginZuordnung(vier, 'ai-workforce', 'ausfuehrung', 'agent:kraft@markt:pruefer', false), 'ai-workforce', 'ausfuehrung', 'skill:kraft@markt:debuggen', false)
  assert.deepEqual(fuenf, leer())
  for (const d of [eins, zwei, drei, vier, fuenf]) assert.deepEqual(validiereFaehigkeitenLokal(d), [])
})

test('Advisor F3: aendereAktivierung und setzeInhaltsfreigabe erhalten plugin_freigaben und plugin_zuordnung', () => {
  const basis = aenderePluginZuordnung(setzePluginFreigabe(leer(), 'kraft@markt', FREIGABE), 'ai-workforce', 'ausfuehrung', 'skill:kraft@markt:debuggen', true)
  const a = aendereAktivierung(basis, 'ai-workforce', 'agent:qa', true)
  assert.deepEqual(a.plugin_freigaben, basis.plugin_freigaben)
  assert.deepEqual(a.projekte['ai-workforce'].plugin_zuordnung, {
    [ROLLE]: ['skill:kraft@markt:debuggen'],
  })
  const b = setzeInhaltsfreigabe(a, 'ai-workforce', 'agent:qa', H)
  assert.deepEqual(b.plugin_freigaben, basis.plugin_freigaben)
  assert.deepEqual(b.projekte['ai-workforce'].plugin_zuordnung, {
    [ROLLE]: ['skill:kraft@markt:debuggen'],
  })
  const c = aendereAktivierung(b, 'anderes', 'mcp-x', false)
  assert.deepEqual(c.plugin_freigaben, basis.plugin_freigaben)
  assert.deepEqual(validiereFaehigkeitenLokal(c), [])
})
