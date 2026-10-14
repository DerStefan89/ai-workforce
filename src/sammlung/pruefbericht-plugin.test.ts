/**
 * Datei: src/sammlung/pruefbericht-plugin.test.ts
 *
 * Zweck: node:test-Fälle der Prüfbericht-Quelle `art: plugin` (F45 F-3b-1, Plan features/F45/plan-f3b.md v2/v2.1 B):
 * Validierung (plugin_version statt version, katalog_id/sammlung_id beide null erlaubt), versionVon = kopie_hash,
 * waehleBericht (gleicher Hash gilt, anderer Hash und NICHT_GEEIGNET sperren, git/npm passen nie), Schlüssel eindeutig (N13).
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { type GespeicherterBericht, type PruefberichtDaten, type PruefQuelle, pluginBerichtSchluessel, validierePruefberichtDaten, versionVon, waehleBericht } from './pruefbericht.ts'

const BEISPIELE = join(import.meta.dirname, '..', '..', 'schemas', 'examples')
const basis = JSON.parse(readFileSync(join(BEISPIELE, 'kontrollzustand-pruefbericht-payload.valid.json'), 'utf8')) as PruefberichtDaten
const H1 = '1'.repeat(64)
const H2 = '2'.repeat(64)
const pluginQ = (kopie_hash: string, plugin_id = 'kraft@markt'): PruefQuelle => ({ art: 'plugin', plugin_id, kopie_hash, plugin_version: '2.0.0', commit: null })

/**
 * Plugin-Bericht aus der Beispieldatei.
 * @param quelle - Plugin-Quelle
 * @param urteil - Urteil
 * @param version - Versionsnummer
 * @returns Bericht
 */
function bericht(quelle: PruefQuelle, urteil = 'GEEIGNET', version = 1): GespeicherterBericht {
  const daten: PruefberichtDaten = {
    ...basis,
    quelle,
    typ: 'plugin',
    katalog_id: null,
    sammlung_id: null,
    urteil_sammlung: null,
    ergebnis: { ...basis.ergebnis, typ: 'plugin', gepinnte_version: versionVon(quelle), urteil: urteil as PruefberichtDaten['ergebnis']['urteil'], auflagen: urteil === 'MIT_AUFLAGEN' ? ['a'] : [] },
  }
  return { artefakt_id: pluginBerichtSchluessel('kraft@markt'), version, daten }
}

test('Validierung: Quelle plugin gültig, falsche Felder genannt', () => {
  assert.deepEqual(validierePruefberichtDaten(bericht(pluginQ(H1)).daten), [])
  const mit = (q: object): string => validierePruefberichtDaten({ ...bericht(pluginQ(H1)).daten, quelle: q }).join(' | ')
  assert.match(mit({ ...pluginQ(H1), version: '1' }), /unbekanntes Feld 'version'/)
  assert.match(mit({ ...pluginQ(H1), kopie_hash: 'x' }), /kopie_hash/)
  assert.match(mit({ ...pluginQ(H1), plugin_id: 'kraft' }), /plugin_id/)
  assert.match(mit({ ...pluginQ(H1), commit: 'abc' }), /commit/)
  // Ohne Plugin-Quelle bleibt die Regel „katalog_id oder sammlung_id“.
  assert.match(validierePruefberichtDaten({ ...basis, katalog_id: null, sammlung_id: null }).join(), /katalog_id' oder 'sammlung_id/)
  assert.equal(versionVon(pluginQ(H2)), H2)
})

test('waehleBericht: gleicher kopie_hash gilt, anderer Hash sperrt, NICHT_GEEIGNET sperrt, andere Arten passen nie', () => {
  const a = { art: 'plugin' as const, plugin_id: 'kraft@markt', kopie_hash: H1 }
  assert.equal(waehleBericht([bericht(pluginQ(H1))], a).sperre, null)
  assert.equal(waehleBericht([bericht(pluginQ(H1), 'MIT_AUFLAGEN')], a).sperre, null)
  assert.match(waehleBericht([bericht(pluginQ(H2))], a).sperre ?? '', /nur für/)
  assert.match(waehleBericht([bericht(pluginQ(H1), 'NICHT_GEEIGNET')], a).sperre ?? '', /NICHT_GEEIGNET/)
  assert.match(waehleBericht([bericht(pluginQ(H1, 'ander@markt'))], a).sperre ?? '', /ohne Prüfbericht/)
  assert.match(waehleBericht([{ artefakt_id: 'pruefbericht-x', version: 1, daten: basis }], a).sperre ?? '', /ohne Prüfbericht/)
  // Neuester gilt: v2 NICHT_GEEIGNET nach v1 GEEIGNET.
  const neu = bericht(pluginQ(H1), 'NICHT_GEEIGNET', 2)
  neu.daten = { ...neu.daten, erstellt_am: '2099-01-01T00:00:00.000Z' }
  assert.match(waehleBericht([bericht(pluginQ(H1)), neu], a).sperre ?? '', /NICHT_GEEIGNET/)
})

test('pluginBerichtSchluessel: Form p-<slug>-<hash8>, eindeutig auch bei gleichem Slug (N13)', () => {
  const a = pluginBerichtSchluessel('kraft@markt')
  assert.match(a, /^pruefbericht-p-kraft-markt-[0-9a-f]{8}$/)
  assert.notEqual(pluginBerichtSchluessel('kraft.markt@x'), pluginBerichtSchluessel('kraft@markt.x'))
})
