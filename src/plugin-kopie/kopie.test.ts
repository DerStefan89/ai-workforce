/**
 * Datei: src/plugin-kopie/kopie.test.ts
 *
 * Zweck: node:test-Fälle der gefilterten, gepinnten Plugin-Kopie (F45 F-3b-1, Plan features/F45/plan-f3b.md v2.1, Abschnitt G;
 * vor dem Modul geschrieben, roter Lauf als Beleg, F-1092): T1 Übernahme des Fixtures, T2 Frontmatter-Varianten, T3 Agents,
 * T4 Manifest und plugin.json-Felder, T5 Inhalt der Bestandteile (Sperrnamen, weitere SKILL.md, Link, binär, zu groß, Grenzen),
 * T6 Hash, T7 Schreiben, T8 Plugin-Id und Name, T9 Auflösung und Freigabe-Zustand (Vorrang).
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 */

import assert from 'node:assert/strict'
import { lstatSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { raeumeVerzeichnis } from '../../scripts/_aufraeumen.ts'
import { KRAFT_NICHT_UEBERNOMMEN, KRAFT_UEBERNOMMEN, legeKraftPluginAn, schreibeFixtureDatei } from '../../scripts/_plugin-kopie-fixture.ts'
import { lesePluginOrdner } from '../claude-plugins/index.ts'
import { GRENZEN } from '../sammlung/inhalt.ts'
import { bestimmeFreigabeZustand, leseKopieQuelle, loesePluginAuf, type Projektion, projiziereKopie, pruefePluginId, schreibeKopie } from './index.ts'

const SATZ = ['Read', 'Grep', 'Glob', 'Write', 'Edit', 'Bash(npm install)', 'Bash(npm run check:*)']

/**
 * Projektion eines Plugin-Ordners wie der Server (Bestandteile über den F-3a-Leser, Dateien über leseKopieQuelle).
 * @param ordner - Plugin-Ordner
 * @param pluginId - id
 * @param werkzeugsatz - Werkzeugsatz 'schreibend' oder null
 * @returns Projektion
 */
async function projiziere(ordner: string, pluginId = 'kraft@markt', werkzeugsatz: readonly string[] | null = SATZ): Promise<Projektion> {
  const gelesen = await lesePluginOrdner(ordner)
  const quelle = await leseKopieQuelle(ordner)
  assert.equal(quelle.ok, true, quelle.ok ? '' : quelle.grund)
  if (!quelle.ok) throw new Error('unerreichbar')
  return projiziereKopie({ pluginId, quelle: quelle.quelle, bestandteile: gelesen.bestandteile, werkzeugsatz })
}

/** @returns 'typ:name' der übernommenen Teile, sortiert wie erwartet */
const uebernommen = (p: Projektion): string[] => (p.ok ? p.uebernommen.map((t) => `${t.typ}:${t.name}`) : [])
/** @returns 'typ:name:grund' der nicht übernommenen Teile */
const nicht = (p: Projektion): string[] => p.nicht_uebernommen.map((t) => `${t.typ}:${t.name}:${t.grund}`)

/**
 * Wegwerf-Ordner mit dem Fixture-Plugin.
 * @returns { wurzel, plugin }
 */
function neuesFixture(): { wurzel: string; plugin: string } {
  const wurzel = mkdtempSync(join(tmpdir(), 'aiw-kopie-test-'))
  return { wurzel, plugin: legeKraftPluginAn(wurzel) }
}

test('T1 Fixture: übernommen 3 Skills, 1 Agent, 1 Command; Hooks/MCP/LSP und gesperrte Teile mit Grund', async () => {
  const { wurzel, plugin } = neuesFixture()
  try {
    const p = await projiziere(plugin)
    assert.equal(p.ok, true)
    assert.deepEqual(uebernommen(p), [...KRAFT_UEBERNOMMEN])
    assert.deepEqual(nicht(p).sort(), [...KRAFT_NICHT_UEBERNOMMEN].sort())
    if (!p.ok) return
    const pfade = p.dateien.map((d) => d.pfad).sort()
    assert.ok(pfade.includes('.claude-plugin/plugin.json'))
    assert.ok(pfade.includes('LICENSE'))
    assert.ok(pfade.includes('skills/debuggen/vorlage.md'))
    for (const verboten of ['hooks/hooks.json', '.lsp.json', 'README.md', 'commands/review.md', 'commands/bom.md', 'agents/ohne-tools.md', 'skills/mit-hooks/SKILL.md', '.in_use/42', '.git/HEAD']) assert.ok(!pfade.includes(verboten), verboten)
  } finally {
    raeumeVerzeichnis(wurzel)
  }
})

test('T2 Frontmatter-Varianten: BOM, "--- " und Leerzeile davor → nicht eindeutig; ohne Frontmatter nur bei Commands', async () => {
  const { wurzel, plugin } = neuesFixture()
  try {
    schreibeFixtureDatei(plugin, 'commands/leer.md', '--- \nallowed-tools: Bash(gh:*)\n---\nText\n')
    schreibeFixtureDatei(plugin, 'commands/zeile.md', '\n---\nallowed-tools: Bash(gh:*)\n---\nText\n')
    schreibeFixtureDatei(plugin, 'commands/crlf.md', '---\r\ndescription: Mit CRLF\r\n---\r\nText\r\n')
    schreibeFixtureDatei(plugin, 'skills/ohne/SKILL.md', 'Kein Frontmatter\n')
    schreibeFixtureDatei(plugin, 'skills/bomskill/SKILL.md', '\uFEFF---\nname: bomskill\ndescription: x\n---\n')
    const p = await projiziere(plugin)
    const n = nicht(p)
    assert.ok(n.includes('command:leer:frontmatter_unklar'))
    assert.ok(n.includes('command:zeile:frontmatter_unklar'))
    assert.ok(n.includes('skill:ohne:frontmatter_fehlt'))
    assert.ok(n.includes('skill:bomskill:frontmatter_unklar'))
    assert.ok(uebernommen(p).includes('command:crlf'))
  } finally {
    raeumeVerzeichnis(wurzel)
  }
})

test('T3 Agents: tools Pflicht, ohne Agent/Task/Skill, im Werkzeugsatz; model nur inherit; Unterordner; Werkzeugsatz unbestimmt', async () => {
  const { wurzel, plugin } = neuesFixture()
  try {
    schreibeFixtureDatei(plugin, 'agents/mit-task.md', '---\nname: mit-task\ndescription: x\ntools: Read, Task\n---\n')
    schreibeFixtureDatei(plugin, 'agents/fremd.md', '---\nname: fremd\ndescription: x\ntools: Read, WebFetch\n---\n')
    schreibeFixtureDatei(plugin, 'agents/modell.md', '---\nname: modell\ndescription: x\ntools: Read\nmodel: sonnet\n---\n')
    schreibeFixtureDatei(plugin, 'agents/haken.md', '---\nname: haken\ndescription: x\ntools: Read\nhooks: x\n---\n')
    schreibeFixtureDatei(plugin, 'agents/tief/innen.md', '---\nname: innen\ndescription: x\ntools: Read\n---\n')
    schreibeFixtureDatei(plugin, 'agents/anders.md', '---\nname: nicht-anders\ndescription: x\ntools: Read\n---\n')
    const n = nicht(await projiziere(plugin))
    assert.ok(n.includes('agent:mit-task:agent_tools_verboten'))
    assert.ok(n.includes('agent:fremd:agent_tools_ausserhalb'))
    assert.ok(n.includes('agent:modell:agent_model'))
    assert.ok(n.includes('agent:haken:frontmatter_feld'))
    assert.ok(n.includes('agent:innen:unterordner'))
    assert.ok(n.includes('agent:anders:name_abweichend'))
    const ohneSatz = await projiziere(plugin, 'kraft@markt', null)
    assert.ok(nicht(ohneSatz).includes('agent:pruefer:werkzeugsatz_unbestimmt'))
    assert.ok(!uebernommen(ohneSatz).some((t) => t.startsWith('agent:')))
  } finally {
    raeumeVerzeichnis(wurzel)
  }
})

test('T4 Manifest neu (nur name/version/description/license), plugin.json-Pfade außerhalb der Standardordner nicht übernommen', async () => {
  const { wurzel, plugin } = neuesFixture()
  try {
    const roh = JSON.parse(readFileSync(join(plugin, '.claude-plugin', 'plugin.json'), 'utf8'))
    writeFileSync(join(plugin, '.claude-plugin', 'plugin.json'), JSON.stringify({ ...roh, skills: './extra', commands: ['./cmds'], lspServers: './x.json' }))
    schreibeFixtureDatei(plugin, 'extra/sonder/SKILL.md', '---\nname: sonder\ndescription: x\n---\n')
    const p = await projiziere(plugin)
    assert.equal(p.ok, true)
    if (!p.ok) return
    const manifest = p.dateien.find((d) => d.pfad === '.claude-plugin/plugin.json')
    assert.ok(manifest !== undefined)
    assert.deepEqual(JSON.parse(manifest.bytes.toString('utf8')), { name: 'kraft', version: '2.0.0', description: 'Kraft für Fixture', license: 'MIT' })
    assert.ok(manifest.bytes.toString('utf8').endsWith('}\n') && !manifest.bytes.includes(13))
    const n = nicht(p)
    assert.ok(n.includes('pfad:skills:nur_standardordner'))
    assert.ok(n.includes('pfad:commands:nur_standardordner'))
    assert.ok(!p.dateien.some((d) => d.pfad.startsWith('extra/')))
  } finally {
    raeumeVerzeichnis(wurzel)
  }
})

test('T5 Inhalt: Sperrname (Normalform), weitere SKILL.md, Link, binär, zu groß; Gesamtgrenze macht das Plugin nicht kopierbar', async () => {
  const { wurzel, plugin } = neuesFixture()
  try {
    schreibeFixtureDatei(plugin, 'skills/sperr/SKILL.md', '---\nname: sperr\ndescription: x\n---\n')
    schreibeFixtureDatei(plugin, 'skills/sperr/unter/Hooks.JSON', '{}')
    schreibeFixtureDatei(plugin, 'skills/claude/SKILL.md', '---\nname: claude\ndescription: x\n---\n')
    schreibeFixtureDatei(plugin, 'skills/claude/CLAUDE.local.md', 'x')
    schreibeFixtureDatei(plugin, 'skills/punkt/SKILL.md', '---\nname: punkt\ndescription: x\n---\n')
    schreibeFixtureDatei(plugin, 'skills/punkt/.claude/settings.json', '{}')
    schreibeFixtureDatei(plugin, 'skills/doppelt/SKILL.md', '---\nname: doppelt\ndescription: x\n---\n')
    schreibeFixtureDatei(plugin, 'skills/doppelt/innen/SKILL.md', '---\nname: innen\ndescription: x\n---\n')
    schreibeFixtureDatei(plugin, 'skills/binaer/SKILL.md', '---\nname: binaer\ndescription: x\n---\n')
    schreibeFixtureDatei(plugin, 'skills/binaer/bild.png', Buffer.from([0x89, 0x50, 0x00, 0x01]))
    schreibeFixtureDatei(plugin, 'skills/gross/SKILL.md', '---\nname: gross\ndescription: x\n---\n')
    schreibeFixtureDatei(plugin, 'skills/gross/daten.txt', Buffer.alloc(GRENZEN.maxDateiBytes + 1, 0x61))
    schreibeFixtureDatei(plugin, 'skills/verlinkt/SKILL.md', '---\nname: verlinkt\ndescription: x\n---\n')
    let link = true
    try {
      symlinkSync(join(plugin, 'skills', 'debuggen'), join(plugin, 'skills', 'verlinkt', 'ziel'), 'junction')
    } catch {
      link = false
    }
    const n = nicht(await projiziere(plugin))
    assert.ok(n.includes('skill:sperr:sperrname'))
    assert.ok(n.includes('skill:claude:sperrname'))
    assert.ok(n.includes('skill:punkt:sperrname'))
    assert.ok(n.includes('skill:doppelt:weitere_skill_md'))
    assert.ok(n.includes('skill:binaer:binaer'))
    assert.ok(n.includes('skill:gross:zu_gross'))
    if (link) assert.ok(n.includes('skill:verlinkt:link'))

    // Gesamtgrenze: mehr übernommene Dateien als GRENZEN.maxDateien → das ganze Plugin ist nicht kopierbar.
    const viele = mkdtempSync(join(tmpdir(), 'aiw-kopie-viele-'))
    try {
      const p2 = legeKraftPluginAn(viele)
      for (let i = 0; i <= GRENZEN.maxDateien; i++) schreibeFixtureDatei(p2, `skills/debuggen/teil/d${i}.md`, 'x')
      const p = await projiziere(p2)
      assert.equal(p.ok, false)
      assert.match(p.ok ? '' : p.grund, /Grenze/)
    } finally {
      raeumeVerzeichnis(viele)
    }
  } finally {
    raeumeVerzeichnis(wurzel)
  }
})

test('T6 Hash: deterministisch, unabhängig von .in_use/.git/README/Hooks, ändert sich mit einer übernommenen Datei', async () => {
  const { wurzel, plugin } = neuesFixture()
  try {
    const a = await projiziere(plugin)
    assert.equal(a.ok, true)
    if (!a.ok) return
    assert.match(a.kopie_hash, /^[0-9a-f]{64}$/)
    schreibeFixtureDatei(plugin, '.in_use/99', 'neu')
    schreibeFixtureDatei(plugin, 'README.md', '# anders')
    schreibeFixtureDatei(plugin, 'hooks/hooks.json', '{"hooks":{}}')
    schreibeFixtureDatei(plugin, 'commands/review.md', '---\nallowed-tools: Bash(x:*)\n---\nanders\n')
    const b = await projiziere(plugin)
    assert.equal(b.ok && b.kopie_hash, a.kopie_hash)
    schreibeFixtureDatei(plugin, 'skills/debuggen/vorlage.md', 'anders\n')
    const c = await projiziere(plugin)
    assert.notEqual(c.ok && c.kopie_hash, a.kopie_hash)
    // Werkzeugsatz ist Teil der Regel (Agent-tools) — derselbe Inhalt mit anderem Satz kann eine andere Kopie ergeben.
    const d = await projiziere(plugin, 'kraft@markt', ['Read'])
    assert.ok(d.ok && nicht(d).includes('agent:pruefer:agent_tools_ausserhalb'))
  } finally {
    raeumeVerzeichnis(wurzel)
  }
})

test('T7 schreibeKopie: neu angelegt, wiederverwendet, verändert → Fehler ohne Überschreiben; Quellordner unverändert', async () => {
  const { wurzel, plugin } = neuesFixture()
  const ziel = mkdtempSync(join(tmpdir(), 'aiw-kopie-ziel-'))
  try {
    const momentaufnahme = (): string => {
      const zeilen: string[] = []
      const gehe = (p: string, rel: string): void => {
        for (const n of readdirSync(p).sort()) {
          const st = lstatSync(join(p, n))
          zeilen.push(`${rel}/${n}:${st.isDirectory() ? 'd' : st.size}:${st.mtimeMs}`)
          if (st.isDirectory()) gehe(join(p, n), `${rel}/${n}`)
        }
      }
      gehe(plugin, '')
      return zeilen.join('\n')
    }
    const vorher = momentaufnahme()
    const p = await projiziere(plugin)
    assert.equal(p.ok, true)
    if (!p.ok) return
    const eins = schreibeKopie(ziel, 'kraft@markt', p)
    assert.equal(eins.ok, true)
    if (!eins.ok) return
    assert.equal(eins.neu, true)
    assert.equal(eins.ordner, join(ziel, 'kraft@markt', p.kopie_hash))
    assert.equal(readFileSync(join(eins.ordner, 'skills', 'debuggen', 'SKILL.md'), 'utf8'), readFileSync(join(plugin, 'skills', 'debuggen', 'SKILL.md'), 'utf8'))
    assert.deepEqual(readdirSync(join(ziel, 'kraft@markt')), [p.kopie_hash])
    const zwei = schreibeKopie(ziel, 'kraft@markt', p)
    assert.equal(zwei.ok && zwei.neu, false)
    writeFileSync(join(eins.ordner, 'skills', 'debuggen', 'SKILL.md'), 'manipuliert')
    const drei = schreibeKopie(ziel, 'kraft@markt', p)
    assert.equal(drei.ok, false)
    assert.equal(drei.ok ? 0 : drei.status, 409)
    assert.equal(readFileSync(join(eins.ordner, 'skills', 'debuggen', 'SKILL.md'), 'utf8'), 'manipuliert')
    rmSync(join(eins.ordner, 'LICENSE'))
    writeFileSync(join(eins.ordner, 'skills', 'debuggen', 'SKILL.md'), readFileSync(join(plugin, 'skills', 'debuggen', 'SKILL.md')))
    assert.equal(schreibeKopie(ziel, 'kraft@markt', p).ok, false)
    assert.equal(momentaufnahme(), vorher)
    assert.equal(schreibeKopie(ziel, '../aus', p).ok, false)
  } finally {
    raeumeVerzeichnis(wurzel)
    raeumeVerzeichnis(ziel)
  }
})

test('T8 Plugin-Id und Name: strenges Muster, pruefePfad, Name im Manifest schlicht', async () => {
  assert.equal(pruefePluginId('kraft@markt'), null)
  assert.equal(pruefePluginId('superpowers@claude-plugins-official'), null)
  for (const falsch of ['kraft', '@markt', 'kraft@', '../x@y', 'a/b@c', 'a@b.', 'con.x@markt', 'a b@c', 'a@b@c']) assert.notEqual(pruefePluginId(falsch), null, falsch)
  const { wurzel, plugin } = neuesFixture()
  try {
    const roh = JSON.parse(readFileSync(join(plugin, '.claude-plugin', 'plugin.json'), 'utf8'))
    writeFileSync(join(plugin, '.claude-plugin', 'plugin.json'), JSON.stringify({ ...roh, name: 'kraft mit leer' }))
    const p = await projiziere(plugin)
    assert.equal(p.ok, false)
    const ungueltig = await projiziere(plugin, 'nicht gültig')
    assert.equal(ungueltig.ok, false)
  } finally {
    raeumeVerzeichnis(wurzel)
  }
})

test('T9 loesePluginAuf und bestimmeFreigabeZustand: Vorrang unbestimmbar > mehrdeutig > quelle_fehlt > keine > bericht_fehlt > kopie_veraendert > veraltet > freigegeben', () => {
  const plugin = { id: 'kraft@markt' } as never
  assert.equal(loesePluginAuf({ status: 'fehler', grund: 'x' }, 'kraft@markt').art, 'unbestimmbar')
  assert.equal(loesePluginAuf({ status: 'ok', plugins: [] } as never, 'kraft@markt').art, 'fehlt')
  assert.equal(loesePluginAuf({ status: 'ok', plugins: [plugin, { id: 'KRAFT@markt' }] } as never, 'kraft@markt').art, 'mehrdeutig')
  assert.equal(loesePluginAuf({ status: 'ok', plugins: [plugin] } as never, 'kraft@markt').art, 'eindeutig')
  const H = 'a'.repeat(64)
  const freigabe = { kopie_hash: H, pruefbericht: 'pruefbericht-p-kraft-markt-12345678@1', freigegeben_am: 'x' }
  const z = (o: Partial<Parameters<typeof bestimmeFreigabeZustand>[0]>): string =>
    bestimmeFreigabeZustand({ aufloesung: 'eindeutig', freigabe, aktuellerHash: H, berichtGefunden: true, kopieAbweichung: null, ...o })
  assert.equal(z({}), 'freigegeben')
  assert.equal(z({ aktuellerHash: 'b'.repeat(64) }), 'veraltet')
  assert.equal(z({ aktuellerHash: null }), 'veraltet')
  assert.equal(z({ kopieAbweichung: 'x', aktuellerHash: 'b'.repeat(64) }), 'kopie_veraendert')
  assert.equal(z({ berichtGefunden: false, kopieAbweichung: 'x' }), 'bericht_fehlt')
  assert.equal(z({ freigabe: undefined, berichtGefunden: false }), 'keine')
  assert.equal(z({ aufloesung: 'fehlt', freigabe: undefined }), 'quelle_fehlt')
  assert.equal(z({ aufloesung: 'mehrdeutig' }), 'mehrdeutig')
  assert.equal(z({ aufloesung: 'unbestimmbar', berichtGefunden: false }), 'unbestimmbar')
})


test('T10 F-3b-2 (Variante A): CLAUDE_PLUGIN_DATA in Skill-, Agent- oder Command-Dateien → nicht übernommen (plugin_daten), auch in Hilfsdateien', async () => {
  const { wurzel, plugin } = neuesFixture()
  try {
    const ohne = await projiziere(plugin)
    schreibeFixtureDatei(plugin, 'skills/daten/SKILL.md', '---\nname: daten\ndescription: x\n---\n\nOrdner: ${CLAUDE_PLUGIN_DATA}/cache\n')
    schreibeFixtureDatei(plugin, 'skills/hilfe/SKILL.md', '---\nname: hilfe\ndescription: x\n---\n\nText\n')
    schreibeFixtureDatei(plugin, 'skills/hilfe/skript.sh', 'echo "$CLAUDE_PLUGIN_DATA"\n')
    schreibeFixtureDatei(plugin, 'agents/datenagent.md', '---\nname: datenagent\ndescription: x\ntools: Read\n---\n\nSchreibe nach ${CLAUDE_PLUGIN_DATA}.\n')
    schreibeFixtureDatei(plugin, 'commands/datencmd.md', 'Nutze ${CLAUDE_PLUGIN_DATA}.\n')
    const p = await projiziere(plugin)
    const n = nicht(p)
    for (const e of ['skill:daten:plugin_daten', 'skill:hilfe:plugin_daten', 'agent:datenagent:plugin_daten', 'command:datencmd:plugin_daten']) assert.ok(n.includes(e), e)
    // Die übrigen Teile und der Hash bleiben wie ohne die neuen Dateien (nicht übernommene Teile zählen nicht).
    assert.deepEqual(uebernommen(p), [...KRAFT_UEBERNOMMEN])
    assert.equal(p.ok && ohne.ok ? p.kopie_hash : 'x', ohne.ok ? ohne.kopie_hash : 'y')
  } finally {
    raeumeVerzeichnis(wurzel)
  }
})
