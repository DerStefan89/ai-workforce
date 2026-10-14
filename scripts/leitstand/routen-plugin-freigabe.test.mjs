/**
 * Datei: scripts/leitstand/routen-plugin-freigabe.test.mjs
 *
 * Zweck: node:test-Fälle der Plugin-Freigabe-Bausteine (F45 F-3b-1): Körperprüfung (400-Fälle je Route), Rücknahme und
 * Zuordnung mit Attrappen (Laufsperre, Ausschalten ohne Freigabe, Einschalten nur mit gültiger Freigabe), Auftragszusatz ohne
 * Befehle. Die HTTP-Rundläufe (Prüflauf → Bericht → Freigabe → Drift) belegt scripts/check-f45-f3b1-freigabe.mjs.
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 */

import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { lesePluginOrdner, risikenVon } from '../../src/claude-plugins/index.ts'
import { leseKopieQuelle, projiziereKopie } from '../../src/plugin-kopie/index.ts'
import { raeumeVerzeichnis } from '../_aufraeumen.ts'
import { legeKraftPluginAn } from '../_plugin-kopie-fixture.ts'
import { PLUGIN_ROLLEN } from '../../src/faehigkeiten/index.ts'
import { fuehrePluginRuecknahmeDurch, fuehrePluginZuordnungDurch, pluginPruefZusatz, pruefePluginKoerper } from './routen-plugin-freigabe.mjs'

const H = 'a'.repeat(64)

test('pruefePluginKoerper: Form je Route, 400 mit Grund', () => {
  assert.equal(pruefePluginKoerper({ plugin_id: 'kraft@markt', kopie_hash: H }, 'pruefung').ok, true)
  const grund = (b, art) => {
    const e = pruefePluginKoerper(b, art)
    assert.equal(e.ok, false, JSON.stringify(b))
    assert.equal(e.status, 400)
    return e.grund
  }
  assert.match(grund(null, 'pruefung'), /Objekt/)
  assert.match(grund({ plugin_id: 'kraft@markt', kopie_hash: H, extra: 1 }, 'pruefung'), /unbekanntes Feld/)
  assert.match(grund({ plugin_id: '../x@y', kopie_hash: H }, 'pruefung'), /Plugin-id/)
  assert.match(grund({ plugin_id: 'kraft@markt', kopie_hash: 'x' }, 'pruefung'), /kopie_hash/)
  assert.match(grund({ plugin_id: 'kraft@markt', kopie_hash: H, pruefbericht: 'x' }, 'freigabe'), /pruefbericht/)
  assert.match(grund({ plugin_id: 'kraft@markt', stand: 'x' }, 'ruecknahme'), /stand/)
  assert.match(
    grund(
      {
        plugin_id: 'kraft@markt',
        rolle: 'qa',
        typ: 'skill',
        name: 'a',
        an: true,
      },
      'zuordnung'
    ),
    /rolle/
  )
  assert.match(
    grund(
      {
        plugin_id: 'kraft@markt',
        rolle: 'ausfuehrung',
        typ: 'command',
        name: 'a',
        an: true,
      },
      'zuordnung'
    ),
    /Commands/
  )
  assert.match(
    grund(
      {
        plugin_id: 'kraft@markt',
        rolle: 'ausfuehrung',
        typ: 'skill',
        name: 'a:b',
        an: true,
      },
      'zuordnung'
    ),
    /name/
  )
  assert.match(
    grund(
      {
        plugin_id: 'kraft@markt',
        rolle: 'ausfuehrung',
        typ: 'skill',
        name: 'a',
        an: 'ja',
      },
      'zuordnung'
    ),
    /an/
  )
  const z = pruefePluginKoerper(
    {
      plugin_id: 'kraft@markt',
      rolle: 'ausfuehrung',
      typ: 'agent',
      name: 'pruefer',
      an: true,
      stand: 'fehlt',
    },
    'zuordnung'
  )
  assert.equal(z.eintrag, 'agent:kraft@markt:pruefer')
})

test('Rücknahme und Zuordnung: Laufsperre, Ausschalten ohne Freigabe, Einschalten nur mit gültiger Freigabe', async () => {
  const geschrieben = []
  const freigaben = () => ({
    'kraft@markt': {
      kopie_hash: H,
      pruefbericht: 'pruefbericht-p-x@1',
      freigegeben_am: 'x',
    },
  })
  const zuordnung = () => ({
    [PLUGIN_ROLLEN[0]]: ['skill:kraft@markt:debuggen'],
  })
  const ctx = (o = {}) => ({
    laufGesperrt: () => null,
    aendere: (a) => (geschrieben.push(a), { ok: true, hash: H }),
    leseBestand: async () => ({ status: 'ok', plugins: [] }),
    freigaben,
    zuordnung,
    berichte: () => [],
    kopienWurzel: null,
    werkzeugsatz: ['Read'],
    ...o,
  })
  const r = pruefePluginKoerper({ plugin_id: 'kraft@markt' }, 'ruecknahme')
  assert.equal(fuehrePluginRuecknahmeDurch(r, ctx({ laufGesperrt: () => 'Lauf aktiv' })).status, 409)
  // Code-Review H4: ohne bestehende Freigabe bzw. Zuordnung → 404, nichts geschrieben.
  assert.equal(fuehrePluginRuecknahmeDurch(r, ctx({ freigaben: () => ({}) })).status, 404)
  assert.equal(fuehrePluginRuecknahmeDurch(r, ctx()).ok, true)
  const aus = pruefePluginKoerper(
    {
      plugin_id: 'kraft@markt',
      rolle: 'ausfuehrung',
      typ: 'skill',
      name: 'debuggen',
      an: false,
    },
    'zuordnung'
  )
  assert.equal((await fuehrePluginZuordnungDurch(aus, ctx({ zuordnung: () => ({}) }))).status, 404)
  assert.equal((await fuehrePluginZuordnungDurch(aus, ctx())).ok, true)
  // QA TC-04: Laufsperre nach dem asynchronen Abruf auch bei der Zuordnung (hier: Ausschalten ohne Abruf, Sperre greift trotzdem).
  assert.equal((await fuehrePluginZuordnungDurch(aus, ctx({ laufGesperrt: () => 'Lauf aktiv' }))).status, 409)
  const an = pruefePluginKoerper(
    {
      plugin_id: 'kraft@markt',
      rolle: 'ausfuehrung',
      typ: 'skill',
      name: 'debuggen',
      an: true,
    },
    'zuordnung'
  )
  assert.equal((await fuehrePluginZuordnungDurch(an, ctx())).status, 404)
  assert.equal((await fuehrePluginZuordnungDurch(an, ctx({ leseBestand: async () => ({ status: 'fehler', grund: 'x' }) }))).status, 503)
  assert.deepEqual(
    geschrieben.map((g) => g.art),
    ['plugin_ruecknahme', 'plugin_zuordnung']
  )
})

test('pluginPruefZusatz: nicht übernommene Teile ohne Befehl/URL, Risiken nur übernommener Teile', async () => {
  const wurzel = mkdtempSync(join(tmpdir(), 'aiw-zusatz-'))
  try {
    const ordner = legeKraftPluginAn(wurzel)
    const gelesen = await lesePluginOrdner(ordner)
    const q = await leseKopieQuelle(ordner)
    assert.equal(q.ok, true)
    const p = projiziereKopie({
      pluginId: 'kraft@markt',
      quelle: q.quelle,
      bestandteile: gelesen.bestandteile,
      werkzeugsatz: ['Read', 'Grep'],
    })
    const z = pluginPruefZusatz({ risiken: risikenVon(gelesen.bestandteile, ['Read', 'Grep']) }, p)
    const text = JSON.stringify(z)
    assert.ok(z.nicht_uebernommen.includes('hook SessionStart (hook_nie)'))
    for (const verboten of ['run-hook', 'hooks/run', 'mcp.example.invalid', 'node nach.js', '--stdio', 'Bash(gh']) assert.ok(!text.includes(verboten), verboten)
    assert.ok(z.risiken.some((x) => x.startsWith('text_worktree skill:baeume')))
    assert.ok(!z.risiken.some((x) => x.includes('agent:ohne-tools')))
  } finally {
    raeumeVerzeichnis(wurzel)
  }
})
