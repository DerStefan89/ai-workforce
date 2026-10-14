/**
 * Datei: src/plugin-lauf/plugin-lauf.test.ts
 *
 * Zweck: node:test-Fälle für Plugins im Lauf (F45 F-3b-2, Plan features/F45/plan-f3b.md v3.1, Abschnitt G; vor dem Modul
 * geschrieben, roter Lauf als Beleg, F-1092): L1 Zuordnung und Kennungen, L2 Vorbereitung (freigegeben, Worker/Art, ohne
 * Freigabe-Eintrag), L3 Drift und Sperren vor dem Lauf, L4 Lauf-Kopie (nur zugeordnete Teile, Ordnername = Hash,
 * inhaltsadressiert, aus den geprüften Bytes), L5 Datenordner vorher/nachher (nur lesend).
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 */

import assert from 'node:assert/strict'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { raeumeVerzeichnis } from '../../scripts/_aufraeumen.ts'
import { schreibeFixtureDatei } from '../../scripts/_plugin-kopie-fixture.ts'
import { KRAFT_BERICHT, KRAFT_ID, LAUF_SATZ, legeFreigegebenesKraftAn } from '../../scripts/_plugin-lauf-fixture.ts'
import { baueLaufKopie, bereitePluginStartVor, type PluginStartEingabe, erfassePluginDatenordner, pluginKennungen, pluginZuordnungDerRolle, vergleicheLaufKopie, vergleichePluginDatenordner } from './index.ts'

/**
 * Wegwerf-Ordner mit Aufräumen.
 * @param f - Testkörper
 */
async function mitOrdner(f: (wurzel: string) => Promise<void>): Promise<void> {
  const wurzel = mkdtempSync(join(tmpdir(), 'aiw-plugin-lauf-test-'))
  try {
    await f(wurzel)
  } finally {
    raeumeVerzeichnis(wurzel)
  }
}

const ZUORDNUNG = ['skill:kraft@markt:debuggen']
/** Werkzeugnamen des Schritts (Werkzeugsatz 'schreibend' ohne Regeln). */
const NAMEN = [...new Set(LAUF_SATZ.map((r) => r.split('(')[0]))]

/**
 * Eingabe von bereitePluginStartVor für das Fixture.
 * @param k - Fixture
 * @param zuordnung - Zuordnung der Ausführung
 * @returns Eingabe
 */
function eingabe(k: Awaited<ReturnType<typeof legeFreigegebenesKraftAn>>, zuordnung: string[] = ZUORDNUNG): PluginStartEingabe {
  return { projektId: 'testprojekt', rolle: 'ausfuehrung', worker: 'claude-code', art: 'schreibend', leseBestand: k.leseBestand, berichte: k.berichte, kopienWurzel: k.kopienWurzel, kopieWerkzeugsatz: LAUF_SATZ, schrittWerkzeugNamen: NAMEN, lokal: k.lokal(zuordnung) }
}

test('L1 Zuordnung der Rolle und Kennungen: plugin:<typ>:<id>:<name>@<kopie_hash>; ohne Freigabe-Eintrag keine Kennung (wirkt nicht); andere Rolle/Projekt leer', async () => {
  await mitOrdner(async (wurzel) => {
    const k = await legeFreigegebenesKraftAn(wurzel)
    const lokal = k.lokal([...ZUORDNUNG, 'agent:kraft@markt:pruefer'])
    assert.deepEqual(
      pluginZuordnungDerRolle(lokal, 'testprojekt', 'ausfuehrung').map((z) => `${z.typ}|${z.pluginId}|${z.name}`),
      ['skill|kraft@markt|debuggen', 'agent|kraft@markt|pruefer']
    )
    assert.deepEqual(pluginKennungen(lokal, 'testprojekt', 'ausfuehrung'), [`plugin:agent:kraft@markt:pruefer@${k.kopieHash}`, `plugin:skill:kraft@markt:debuggen@${k.kopieHash}`])
    assert.deepEqual(pluginKennungen(lokal, 'anderes', 'ausfuehrung'), [])
    assert.deepEqual(pluginKennungen(lokal, 'testprojekt', 'qa'), [])
    assert.deepEqual(pluginKennungen({ ...lokal, plugin_freigaben: undefined }, 'testprojekt', 'ausfuehrung'), [])
  })
})

test('L2 Vorbereitung: ohne Zuordnung keine; freigegeben → plugins mit Manifest-Name, Teilen, Kennungen; Worker ≠ claude-code / nicht schreibend / ohne Freigabe-Eintrag → nicht geladen', async () => {
  await mitOrdner(async (wurzel) => {
    const k = await legeFreigegebenesKraftAn(wurzel)
    let abgerufen = false
    const zaehlend = async () => ((abgerufen = true), k.leseBestand())
    const keine = await bereitePluginStartVor({ ...eingabe(k, []), leseBestand: zaehlend })
    assert.deepEqual(keine, { art: 'keine' })
    assert.equal(abgerufen, false, 'ohne Zuordnung kein CLI-Abruf')
    const zuordnung = [...ZUORDNUNG, 'agent:kraft@markt:pruefer']
    const s = await bereitePluginStartVor(eingabe(k, zuordnung))
    assert.equal(s.art, 'start', s.art === 'fehler' ? s.grund : '')
    if (s.art !== 'start') return
    assert.equal(s.plugins.length, 1)
    assert.deepEqual(s.nichtGeladen, [])
    const p = s.plugins[0]
    assert.equal(p.pluginId, KRAFT_ID)
    assert.equal(p.name, 'kraft')
    assert.equal(p.kopieHash, k.kopieHash)
    assert.equal(p.pruefbericht, KRAFT_BERICHT)
    assert.deepEqual(p.skills, ['debuggen'])
    assert.deepEqual(p.agents, ['pruefer'])
    assert.deepEqual(s.kennungen, pluginKennungen(k.lokal(zuordnung), 'testprojekt', 'ausfuehrung'))

    abgerufen = false
    const codex = await bereitePluginStartVor({ ...eingabe(k), worker: 'codex', leseBestand: zaehlend })
    assert.ok(codex.art === 'start' && codex.plugins.length === 0)
    assert.deepEqual(codex.art === 'start' ? codex.nichtGeladen.map((e) => `${e.eintrag}|${e.grund}`) : [], ['skill:kraft@markt:debuggen|nur_claude_code'])
    assert.equal(abgerufen, false, 'Codex: kein CLI-Abruf')
    const lesend = await bereitePluginStartVor({ ...eingabe(k), art: 'lesend' })
    assert.deepEqual(lesend.art === 'start' ? lesend.nichtGeladen.map((e) => e.grund) : [], ['nur_schreibend'])
    // Rücknahme (kein Freigabe-Eintrag): wirkt nicht — der Lauf startet ohne das Plugin, sichtbar als nicht geladen.
    const ohne = await bereitePluginStartVor({ ...eingabe(k), lokal: { ...k.lokal(ZUORDNUNG), plugin_freigaben: undefined } })
    assert.ok(ohne.art === 'start' && ohne.plugins.length === 0 && ohne.kennungen.length === 0)
    assert.deepEqual(ohne.art === 'start' ? ohne.nichtGeladen.map((e) => e.grund) : [], ['keine_freigabe'])
  })
})

test('L3 Drift und Sperren: Quelle geändert, gepinnte Kopie verändert, Bericht NICHT_GEEIGNET, Teil nicht übernommen, Agent-tools außerhalb des Schritts, Plugin fehlt, doppelter Manifest-Name → fehler mit Grund', async () => {
  await mitOrdner(async (wurzel) => {
    const k = await legeFreigegebenesKraftAn(wurzel)
    const basis = eingabe(k)
    const grund = async (o: Partial<PluginStartEingabe>): Promise<string> => {
      const s = await bereitePluginStartVor({ ...basis, ...o })
      return s.art === 'fehler' ? s.grund : `kein Fehler (${s.art})`
    }
    assert.match(await grund({ lokal: k.lokal(['skill:kraft@markt:mit-rechten']) }), /mit-rechten.*nicht.*übernommen/)
    assert.match(await grund({ lokal: k.lokal(['agent:kraft@markt:pruefer']), schrittWerkzeugNamen: ['Read', 'Write'] }), /pruefer.*Grep/)
    assert.match(await grund({ leseBestand: async () => ({ status: 'ok', plugins: [] }) }), /kraft@markt.*quelle_fehlt/)
    assert.match(await grund({ leseBestand: async () => ({ status: 'fehler', plugins: [] }) }), /kraft@markt.*unbestimmbar/)
    assert.match(await grund({ kopienWurzel: null }), /Ablage der Plugin-Kopien in dieser Instanz nicht gesetzt/)
    const ungeeignet = [{ ...k.berichte[0], daten: { ...k.berichte[0].daten, ergebnis: { ...k.berichte[0].daten.ergebnis, urteil: 'NICHT_GEEIGNET' } } }]
    assert.match(await grund({ berichte: ungeeignet as typeof k.berichte }), /kraft@markt.*bericht_fehlt/)

    // gepinnte Kopie verändert
    const datei = join(k.kopienWurzel, KRAFT_ID, k.kopieHash, 'skills', 'debuggen', 'SKILL.md')
    const vorher = readFileSync(datei)
    writeFileSync(datei, `${vorher.toString('utf8')}\nangehängt\n`)
    assert.match(await grund({}), /kraft@markt.*kopie_veraendert/)
    writeFileSync(datei, vorher)
    assert.match(await grund({}), /kein Fehler \(start\)/, 'zurückgesetzt wieder startbar')
    // Quelle geändert (übernommene Datei)
    schreibeFixtureDatei(k.quelle, 'skills/debuggen/vorlage.md', 'neu\n')
    assert.match(await grund({}), /kraft@markt.*veraltet/)
  })
  await mitOrdner(async (wurzel) => {
    // Zwei Plugins mit demselben Manifest-Namen 'kraft' → kein eindeutiges Präfix im Lauf.
    const k = await legeFreigegebenesKraftAn(wurzel)
    const zweiteId = 'kraft@anders'
    cpSync(join(k.kopienWurzel, KRAFT_ID), join(k.kopienWurzel, zweiteId), { recursive: true })
    const bericht2 = { ...k.berichte[0], artefakt_id: 'pruefbericht-p-kraft-anders-00000000', daten: { ...k.berichte[0].daten, quelle: { ...k.berichte[0].daten.quelle, plugin_id: zweiteId } } }
    const lokal = k.lokal([...ZUORDNUNG, `skill:${zweiteId}:baeume`])
    lokal.plugin_freigaben = { ...lokal.plugin_freigaben, [zweiteId]: { kopie_hash: k.kopieHash, pruefbericht: 'pruefbericht-p-kraft-anders-00000000@1', freigegeben_am: 'x' } }
    const s = await bereitePluginStartVor({
      ...eingabe(k),
      lokal,
      leseBestand: async () => ({ status: 'ok', plugins: [k.plugin, { ...k.plugin, id: zweiteId, marketplace: 'anders' }] }),
      berichte: [...k.berichte, bericht2 as (typeof k.berichte)[0]],
    })
    assert.equal(s.art, 'fehler')
    assert.match(s.art === 'fehler' ? s.grund : '', /Manifest-Name 'kraft'.*kraft@markt.*kraft@anders/)
  })
})

test('L4 Lauf-Kopie: nur zugeordnete Teile + Manifest + Lizenz, Ordnername = Hash, wiederverwendet; verändert oder gepinnte Kopie verändert → kein Lauf; Vergleich nach dem Lauf', async () => {
  await mitOrdner(async (wurzel) => {
    const k = await legeFreigegebenesKraftAn(wurzel)
    const s = await bereitePluginStartVor(eingabe(k, [...ZUORDNUNG, 'agent:kraft@markt:pruefer']))
    assert.equal(s.art, 'start')
    if (s.art !== 'start') return
    const laufWurzel = join(k.kopienWurzel, '_lauf')
    const a = baueLaufKopie(s.plugins[0], laufWurzel)
    assert.ok(a.ok, a.ok ? '' : a.grund)
    if (!a.ok) return
    assert.equal(a.ordner, join(laufWurzel, a.laufKopieHash))
    assert.match(a.laufKopieHash, /^[0-9a-f]{64}$/)
    assert.notEqual(a.laufKopieHash, k.kopieHash, 'Teilmenge ≠ ganze Kopie')
    const liste = (readdirSync(a.ordner, { recursive: true }) as string[]).map((p) => String(p).replaceAll('\\', '/')).sort()
    assert.deepEqual(liste, ['.claude-plugin', '.claude-plugin/plugin.json', 'LICENSE', 'agents', 'agents/pruefer.md', 'skills', 'skills/debuggen', 'skills/debuggen/SKILL.md', 'skills/debuggen/vorlage.md'])
    assert.equal(JSON.parse(readFileSync(join(a.ordner, '.claude-plugin', 'plugin.json'), 'utf8')).name, 'kraft')
    assert.equal(vergleicheLaufKopie(a), null, 'nach dem Bau unverändert')
    const b = baueLaufKopie(s.plugins[0], laufWurzel)
    assert.ok(b.ok && b.ordner === a.ordner && b.laufKopieHash === a.laufKopieHash && !b.neu, 'wiederverwendet')
    // Lauf-Kopie verändert → Befund nach dem Lauf; beim nächsten Bau Abbruch, nichts überschrieben
    writeFileSync(join(a.ordner, 'skills', 'debuggen', 'neu.md'), 'x')
    assert.match(vergleicheLaufKopie(a) ?? '', /neu\.md/)
    const c = baueLaufKopie(s.plugins[0], laufWurzel)
    assert.equal(c.ok, false)
    assert.match(c.ok ? '' : c.grund, /Lauf-Kopie.*verändert/)
    assert.ok(existsSync(join(a.ordner, 'skills', 'debuggen', 'neu.md')))
    // gepinnte Kopie nach der Vorbereitung verändert → Abbruch (Abgleich mit dem Bericht beim Bau)
    const andereWurzel = join(wurzel, 'lauf2')
    writeFileSync(join(k.kopienWurzel, KRAFT_ID, k.kopieHash, 'skills', 'debuggen', 'vorlage.md'), 'manipuliert\n')
    const d = baueLaufKopie(s.plugins[0], andereWurzel)
    assert.equal(d.ok, false)
    assert.match(d.ok ? '' : d.grund, /Prüfbericht/)
    assert.equal(existsSync(andereWurzel) ? readdirSync(andereWurzel).length : 0, 0, 'nichts geschrieben')
  })
})

test('L5 Datenordner: Momentaufnahme nur lesend, Abweichungen relativ (+ ~ -), fehlender Ordner = leer, über der Grenze und mit umgelenkter Plugin-Wurzel nicht prüfbar', async () => {
  await mitOrdner(async (wurzel) => {
    const ordner = join(wurzel, 'data')
    mkdirSync(join(ordner, 'alt'), { recursive: true })
    writeFileSync(join(ordner, 'alt', 'x.json'), '{}')
    const vorher = erfassePluginDatenordner(ordner, {})
    assert.ok(vorher.ok)
    if (!vorher.ok) return
    assert.deepEqual(vergleichePluginDatenordner(vorher.stand, vorher.stand), [])
    mkdirSync(join(ordner, 'kraft-inline'))
    writeFileSync(join(ordner, 'alt', 'x.json'), '{"x":1}')
    const nachher = erfassePluginDatenordner(ordner, {})
    assert.ok(nachher.ok)
    if (!nachher.ok) return
    const d = vergleichePluginDatenordner(vorher.stand, nachher.stand)
    assert.ok(d.includes('+ kraft-inline'), d.join('; '))
    assert.ok(d.includes('~ alt/x.json'), d.join('; '))
    assert.ok(d.every((z) => !z.includes(wurzel)), 'keine absoluten Pfade')
    const leer = erfassePluginDatenordner(join(wurzel, 'gibt-es-nicht'), {})
    assert.ok(leer.ok && leer.stand.size === 0)
    assert.equal(erfassePluginDatenordner(ordner, {}, 2).ok, false)
    const umgelenkt = erfassePluginDatenordner(ordner, { CLAUDE_CODE_PLUGIN_CACHE_DIR: 'C:/irgendwo' })
    assert.equal(umgelenkt.ok, false)
    assert.match(umgelenkt.ok ? '' : umgelenkt.grund, /CLAUDE_CODE_PLUGIN_CACHE_DIR/)
  })
})
