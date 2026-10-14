/**
 * Datei: scripts/_plugin-lauf-fixture.ts
 *
 * Zweck: Fixture für Plugins im Lauf (F45 F-3b-2, Plan features/F45/plan-f3b.md v3): ein freigegebenes Plugin „kraft@markt“ —
 * Quelle (legeKraftPluginAn), gepinnte Kopie unter einer Wegwerf-Kopie-Wurzel (schreibeKopie), passender Prüfbericht im
 * Speicher (GEEIGNET, Dateiliste = Kopie), lokale Datei mit Freigabe und Zuordnung der Ausführung, Bestand wie die CLI-Liste.
 *
 * Wird aufgerufen von: src/plugin-lauf/plugin-lauf.test.ts, scripts/check-f45-f3b2-lauf.mjs.
 *
 * Wichtig: Nur Wegwerf-Ordner unter dem übergebenen Pfad; nie unter dem echten ~/.claude oder ~/.ai-workforce.
 */

import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { lesePluginOrdner } from '../src/claude-plugins/index.ts'
import type { PluginEintrag } from '../src/claude-plugins/types.ts'
import { PLUGIN_ROLLEN } from '../src/faehigkeiten/index.ts'
import type { FaehigkeitenLokal } from '../src/faehigkeiten/types.ts'
import { leseKopieQuelle, projiziereKopie, schreibeKopie } from '../src/plugin-kopie/index.ts'
import type { GespeicherterBericht } from '../src/sammlung/pruefbericht.ts'
import { legeKraftPluginAn } from './_plugin-kopie-fixture.ts'

/** Werkzeugsatz 'schreibend' wie in den Kopie-Tests. */
export const LAUF_SATZ: readonly string[] = ['Read', 'Grep', 'Glob', 'Write', 'Edit', 'Bash(npm install)', 'Bash(npm run check:*)']

/** Plugin-id und Kennung des Fixture-Berichts. */
export const KRAFT_ID = 'kraft@markt'
export const KRAFT_BERICHT = 'pruefbericht-p-kraft-markt-00000000@1'

/** Ergebnis von legeFreigegebenesKraftAn. */
export interface FreigegebenesKraft {
  quelle: string
  kopienWurzel: string
  kopieHash: string
  plugin: PluginEintrag
  berichte: GespeicherterBericht[]
  /** lokale Datei (gültig) mit Freigabe und Zuordnung 'ausfuehrung' → zuordnung */
  lokal: (zuordnung: string[]) => FaehigkeitenLokal
  leseBestand: () => Promise<{ status: string; plugins: PluginEintrag[] }>
}

/**
 * Legt Quelle, gepinnte Kopie und Bericht des Plugins „kraft“ an.
 * @param wurzel - leerer Wegwerf-Ordner
 * @param urteil - Urteil des Berichts (Standard GEEIGNET)
 * @returns FreigegebenesKraft
 */
export async function legeFreigegebenesKraftAn(wurzel: string, urteil = 'GEEIGNET'): Promise<FreigegebenesKraft> {
  const quelle = legeKraftPluginAn(wurzel)
  const gelesen = await lesePluginOrdner(quelle)
  const roh = await leseKopieQuelle(quelle)
  if (!roh.ok) throw new Error(roh.grund)
  const projektion = projiziereKopie({ pluginId: KRAFT_ID, quelle: roh.quelle, bestandteile: gelesen.bestandteile, werkzeugsatz: LAUF_SATZ })
  if (!projektion.ok) throw new Error(projektion.grund)
  const kopienWurzel = join(wurzel, 'plugin-kopien')
  const kopie = schreibeKopie(kopienWurzel, KRAFT_ID, projektion)
  if (!kopie.ok) throw new Error(kopie.grund)
  const plugin = { id: KRAFT_ID, name: 'kraft', marketplace: 'markt', version: '2.0.0', commit: null, scope: 'user', aktiv: true, projekt_pfad: null, projekt_aktiv: null, pfad: quelle, inhalt_hash: null, hash_grund: null, lizenz_datei: true, lizenz_feld: 'MIT', bestandteile: gelesen.bestandteile, risiken: [], fehler: [] } as PluginEintrag
  const bericht = {
    artefakt_id: KRAFT_BERICHT.split('@')[0],
    version: 1,
    daten: {
      quelle: { art: 'plugin', plugin_id: KRAFT_ID, kopie_hash: projektion.kopie_hash, plugin_version: '2.0.0', commit: null },
      ergebnis: { urteil, befunde: [], auflagen: [], zusammenfassung: 'Fixture.' },
      erstellt_am: '2026-10-14T00:00:00.000Z',
      fakten: { uebersprungen: { je_grund: {}, liste: [] } },
      inhalt: { dateien: projektion.dateien.map((d) => ({ pfad: d.pfad, sha256: createHash('sha256').update(d.bytes).digest('hex') })) },
    },
  } as unknown as GespeicherterBericht
  return {
    quelle,
    kopienWurzel,
    kopieHash: projektion.kopie_hash,
    plugin,
    berichte: [bericht],
    lokal: (zuordnung) => ({
      faehigkeiten_lokal_schema: 'v0',
      plugin_freigaben: { [KRAFT_ID]: { kopie_hash: projektion.kopie_hash, pruefbericht: KRAFT_BERICHT, freigegeben_am: '2026-10-14T00:00:00.000Z' } },
      // Rolle als berechneter Schlüssel (Gate f17 AK1: keine zweite Rollenliste außerhalb von src/rollen/).
      projekte: { testprojekt: zuordnung.length > 0 ? { plugin_zuordnung: { [PLUGIN_ROLLEN[0]]: zuordnung } } : {} },
    }),
    leseBestand: async () => ({ status: 'ok', plugins: [plugin] }),
  }
}
