/**
 * Datei: public/leitstand/plugins-anzeige.test.mjs
 *
 * Zweck: Tests der Anzeige „Plugins aus deinem Claude Code“ (F45 F-3a-2, Plan features/F45/plan-f3a2.md) gegen den echten
 * Leser über den Fixture-Bestand (scripts/_plugin-fixture.ts): Liste, Detail mit Bestandteilen und Risiken, `aktiv` bei
 * scope local nur mit Ordnerbezug (F-1091 (2)), eingebaute getrennt mit Messversion (F-1091 (1)), leer/unlesbar mit Grund,
 * Escaping fremder Werte (XSS), Steuerung (Abruf nur bei Reiterwahl und „Neu laden“), dynamische i18n-Schlüssel in allen
 * vier Sprachen.
 *
 * Wird aufgerufen von: npm run test (node --test).
 */

import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { lesePluginBestand } from '../../src/claude-plugins/index.ts'
import { raeumeVerzeichnis } from '../../scripts/_aufraeumen.ts'
import { legePluginFixtureAn } from '../../scripts/_plugin-fixture.ts'
import { WOERTERBUECHER } from './i18n.js'
import { DYNAMISCHE_SCHLUESSEL, erzeugePluginSteuerung, renderEingebaut, renderPluginDetail, renderPluginListe, renderPlugins, renderPluginsZustand } from './plugins-anzeige.js'

const WURZEL = mkdtempSync(join(tmpdir(), 'f3a2-anzeige-test-'))
after(() => raeumeVerzeichnis(WURZEL))
const FIXTURE = legePluginFixtureAn(WURZEL)
const INSTANZ = join(WURZEL, 'instanz')
const REFERENZ = { ok: true, referenz: { cli_version: '2.1.296 (Claude Code)', agents: [], plugins: ['cc-plugin-telemetry@builtin'], plugin_skills: [] } }
const BESTAND = await lesePluginBestand({ liste: async () => ({ ok: true, stdout: FIXTURE.listeJson }), claudeOrdner: FIXTURE.claudeOrdner, werkzeugsatz: ['Read'], eingebaut: REFERENZ })
const ANTWORT = { ...BESTAND, instanz_pfad: INSTANZ }

test('Fixture-Bestand ist ok (Voraussetzung)', () => {
  assert.equal(ANTWORT.status, 'ok')
  assert.equal(ANTWORT.plugins.length, 3)
})

test('Liste: Name, Marketplace, Version, Status je Plugin; Auswahl über Index', () => {
  const html = renderPluginListe(ANTWORT, 0)
  for (const name of ['voll', 'nur-skill', 'kaputt']) assert.match(html, new RegExp(`data-plugin-index="\\d"[^>]*>${name}<`))
  assert.match(html, />markt</)
  assert.match(html, />1\.0\.0</)
  assert.match(html, /data-plugin-index="0"[^>]*aria-pressed="true"/)
  assert.match(html, /data-plugin-index="1"[^>]*aria-pressed="false"/)
  // voll: scope user, an; nur-skill: scope local → ordnerbezogen, nicht „an/aus“.
  assert.match(html, /data-plugin-status="an"/)
  assert.match(html, /data-plugin-status="ordner"/)
})

test('Detail voll: alle Bestandteile, Hooks mit Ereignis und Befehl, MCP gepinnt ja/nein, Risiken als Fakten', () => {
  const html = renderPluginDetail(ANTWORT, 0)
  assert.match(html, /data-pl-teil="skills"[\s\S]*s-eins[\s\S]*Bash\(curl:\*\)/)
  assert.match(html, /data-pl-teil="agents"[\s\S]*a-eins[\s\S]*Grep/)
  assert.match(html, /data-pl-teil="commands"[\s\S]*c-eins[\s\S]*gh pr comment/)
  assert.match(html, /data-pl-teil="hooks"[\s\S]*SessionStart[\s\S]*node start\.js[\s\S]*PostToolUse[\s\S]*node eingebettet\.js/)
  assert.match(html, /data-pl-mcp="latest" data-pl-gepinnt="nein"/)
  assert.match(html, /data-pl-mcp="fest" data-pl-gepinnt="ja"/)
  assert.match(html, /data-pl-mcp="fern" data-pl-gepinnt="nein"/)
  assert.match(html, /data-pl-teil="lsp"[\s\S]*typescript-language-server/)
  assert.equal((html.match(/data-pl-risiko="/g) ?? []).length, ANTWORT.plugins[0].risiken.length)
  assert.match(html, /data-pl-risiko="hook_befehl"/)
  assert.match(html, /data-pl-risiko="mcp_ungepinnt"/)
})

test('Detail kaputt: Teilfehler sichtbar; ohne Auswahl Leertext', () => {
  const html = renderPluginDetail(ANTWORT, 2)
  assert.equal((html.match(/data-pl-fehler/g) ?? []).length, ANTWORT.plugins[2].fehler.length)
  assert.match(renderPluginDetail(ANTWORT, null), /class="leer"/)
  assert.match(renderPluginDetail(ANTWORT, 99), /class="leer"/)
})

test('aktiv bei scope local: Wert nur mit Ordner des Abrufs und Installationsprojekt, nicht als Stand dieses Projekts (F-1091 (2))', () => {
  const html = renderPluginDetail(ANTWORT, 1)
  assert.match(html, /data-pl-aktiv="ordner"/)
  assert.ok(html.includes(INSTANZ), 'instanz_pfad fehlt')
  assert.ok(html.includes(ANTWORT.plugins[1].projekt_pfad), 'projekt_pfad fehlt')
  assert.ok(!/data-pl-aktiv="(an|aus)"/.test(html), 'scope local als an/aus gezeigt')
  assert.match(html, /data-pl-hinweis="gemessen"/)
  assert.match(renderPluginListe(ANTWORT, null), /data-plugin-index="1"[\s\S]*?data-plugin-status="ordner"/)
  // scope user: an/aus direkt
  assert.match(renderPluginDetail(ANTWORT, 0), /data-pl-aktiv="an"/)
})

test('Eingebaute getrennt mit Messversion der Referenzliste; Quelle CLI-Liste ohne Version; Lesefehler mit Grund (F-1091 (1))', () => {
  const html = renderEingebaut(ANTWORT)
  assert.match(html, /data-pl-eingebaut="cc-plugin-telemetry@builtin" data-pl-quelle="referenzliste"/)
  assert.match(html, /data-pl-eingebaut="cc-plugin-fixture@builtin" data-pl-quelle="cli-liste"/)
  assert.ok(html.includes('2.1.296 (Claude Code)'), 'Messversion fehlt')
  const ohne = renderEingebaut({ ...ANTWORT, eingebaut: [], eingebaut_fehler: 'Datei fehlt' })
  assert.match(ohne, /note red[\s\S]*Datei fehlt/)
  // eingebaute erscheinen nie in der Liste der Plugins
  assert.ok(!renderPluginListe(ANTWORT, null).includes('@builtin'))
})

test('Leer: Grund statt Tabelle, eingebaute bleiben sichtbar', () => {
  const leer = { ...ANTWORT, plugins: [] }
  const html = renderPlugins({ art: 'ok', antwort: leer, auswahl: null })
  assert.match(html, /data-pl-zustand="leer"/)
  assert.ok(!html.includes('<table'))
  assert.match(html, /data-pl-eingebaut=/)
})

test('Unlesbar: Grund aus der Route bzw. dem Abruf', () => {
  assert.match(renderPlugins({ art: 'ok', antwort: { status: 'fehler', grund: 'claude plugin list endete mit Exit 1' } }), /data-pl-zustand="fehler"[\s\S]*Exit 1/)
  assert.match(renderPlugins({ art: 'fehler', grund: '500 kaputt' }), /data-pl-zustand="fehler"[\s\S]*500 kaputt/)
  assert.match(renderPluginsZustand('laedt'), /data-pl-zustand="laedt"/)
  assert.match(renderPluginsZustand('nicht_geladen'), /data-pl-zustand="nicht_geladen"/)
})

test('Scope in der Liste: gleiche id in zwei Scopes unterscheidbar, Auswahl bleibt am richtigen Eintrag (F-1091 (4))', async () => {
  const lokal = ANTWORT.plugins[1]
  const drei = { ...ANTWORT, plugins: [{ ...lokal, scope: 'user', aktiv: true, projekt_pfad: null }, lokal, { ...lokal, projekt_pfad: join(WURZEL, 'anderes') }] }
  const html = renderPluginListe(drei, null)
  assert.equal((html.match(/data-pl-scope="local"/g) ?? []).length, 2)
  assert.ok(html.includes(join(WURZEL, 'anderes')) && html.includes(lokal.projekt_pfad), 'Installationsprojekt fehlt in der Liste')
  let antwort = drei
  const s = erzeugePluginSteuerung({ hole: async () => antwort, zeichne: () => {} })
  await s.beiReiterwahl()
  s.waehle(2)
  antwort = { ...drei, plugins: [drei.plugins[2], drei.plugins[0], drei.plugins[1]] }
  await s.neuLaden()
  assert.equal(s.zustand().auswahl, 0)
})

test('Randwerte: scope project/null ohne „gemessen“, aktiv null, Antwort ohne instanz_pfad, Risiko-Anzahl, leerer Name', () => {
  const basis = ANTWORT.plugins[1]
  const mit = (p) => ({ ...ANTWORT, plugins: [p] })
  assert.match(renderPluginDetail(mit({ ...basis, scope: 'project' }), 0), /data-pl-hinweis="ungemessen"/)
  assert.match(renderPluginDetail(mit({ ...basis, scope: null }), 0), /data-pl-aktiv="ordner"[\s\S]*data-pl-hinweis="ungemessen"/)
  assert.match(renderPluginDetail(mit({ ...ANTWORT.plugins[0], aktiv: null }), 0), /data-pl-aktiv="unbekannt"/)
  const ohneInstanz = renderPlugins({ art: 'ok', antwort: { ...ANTWORT, instanz_pfad: undefined }, auswahl: 1 })
  assert.match(ohneInstanz, /<p class="pl-kopf" id="plugins-kopf" tabindex="-1">[^]*?<span class="unbekannt">—<\/span>[^]*?<\/p>/)
  assert.ok(!ohneInstanz.includes('undefined'), 'undefined im HTML')
  assert.ok(renderPluginListe(ANTWORT, null).includes(`data-pl-risiken="${ANTWORT.plugins[0].risiken.length}"`), 'Risiko-Anzahl fehlt')
  assert.ok(renderPluginDetail(mit({ ...basis, name: '' }), 0).includes(`>${basis.id}</h3>`), 'leerer Name: Überschrift ohne id')
})

test('XSS: alle Routenwerte (Name, Command, Hook, MCP, LSP, Pfade, Hash, Gründe) bleiben Text, auch in Attributen', () => {
  const boese = '" data-boese="1"><img src=x onerror=alert(1)><script>alert(2)</script>'
  const p = structuredClone(ANTWORT.plugins[0])
  p.name = boese
  p.id = `${boese}@markt`
  p.marketplace = boese
  p.version = boese
  p.bestandteile.commands[0].name = boese
  p.bestandteile.commands[0].allowed_tools = [boese]
  p.bestandteile.hooks[0].befehl = boese
  p.bestandteile.hooks[0].matcher = boese
  p.bestandteile.mcp[0].name = boese
  p.risiken[0].text = boese
  p.risiken[0].art = boese
  p.fehler = [boese]
  p.commit = boese
  p.inhalt_hash = boese
  p.scope = boese
  p.projekt_pfad = boese
  p.pfad = boese
  p.lizenz_feld = boese
  p.bestandteile.hooks[0].ereignis = boese
  Object.assign(p.bestandteile.mcp[0], { art: boese, paket: boese, befehl: boese, args: [boese] })
  p.bestandteile.mcp[2].url = boese
  Object.assign(p.bestandteile.lsp[0], { name: boese, befehl: boese, args: [boese] })
  p.bestandteile.skills[0].allowed_tools = [boese]
  p.risiken[1].bestandteil = boese
  const q = { ...structuredClone(p), inhalt_hash: null, hash_grund: boese }
  const a = { ...ANTWORT, instanz_pfad: boese, quelle: { befehl: boese }, plugins: [p, q], eingebaut: [{ id: boese, quelle: boese, cli_version: boese }], eingebaut_fehler: boese }
  const html =
    [0, 1].map((i) => renderPlugins({ art: 'ok', antwort: a, auswahl: i, geladen_am: boese })).join('') + renderPlugins({ art: 'fehler', grund: boese }) + renderPlugins({ art: 'ok', antwort: { status: 'fehler', grund: boese } })
  assert.ok(!/<script/i.test(html), 'rohes <script')
  assert.ok(!/<img/i.test(html), 'rohes <img')
  assert.ok(!/\sdata-boese="1"/.test(html), 'Attribut-Einbruch über ein rohes Anführungszeichen')
  assert.ok(html.includes('&quot; data-boese=&quot;1'), 'Nutzlast fehlt')
})

test('Steuerung: Abruf nur bei Reiterwahl und „Neu laden“, überholte Antwort verworfen, Zurücksetzen ohne Abruf', async () => {
  let aufrufe = 0
  const gezeichnet = []
  const antworten = []
  const hole = () => {
    aufrufe++
    return new Promise((r) => antworten.push(r))
  }
  const s = erzeugePluginSteuerung({ hole, zeichne: (z) => gezeichnet.push(z.art) })
  assert.equal(aufrufe, 0, 'Abruf beim Erzeugen')
  s.zuruecksetzen()
  assert.equal(aufrufe, 0, 'Abruf beim Zurücksetzen')
  const erster = s.beiReiterwahl()
  assert.equal(aufrufe, 1)
  const zweiter = s.neuLaden()
  assert.equal(aufrufe, 2)
  antworten[1](ANTWORT)
  await zweiter
  antworten[0]({ status: 'fehler', grund: 'veraltet' })
  await erster
  assert.equal(s.zustand().art, 'ok')
  assert.equal(s.zustand().antwort, ANTWORT)
  s.waehle(1)
  assert.equal(s.zustand().auswahl, 1)
  assert.equal(aufrufe, 2, 'Auswahl ruft ab')
  // Auswahl bleibt nach Neu laden am selben Plugin (nicht am Index)
  const dritter = s.neuLaden()
  antworten[2]({ ...ANTWORT, plugins: [ANTWORT.plugins[1], ANTWORT.plugins[0]] })
  await dritter
  assert.equal(s.zustand().auswahl, 0)
  // Fehler beim Abruf: Grund aus der Ausnahme
  const vierter = s.neuLaden()
  antworten[3](Promise.reject(new Error('Netz weg')))
  await vierter
  assert.deepEqual([s.zustand().art, s.zustand().grund], ['fehler', 'Netz weg'])
  s.zuruecksetzen()
  assert.equal(s.zustand().art, 'nicht_geladen')
  assert.equal(aufrufe, 4)
  assert.deepEqual(gezeichnet.slice(0, 3), ['nicht_geladen', 'laedt', 'laedt'])
})

test('Steuerung: Zurücksetzen (Projektwechsel) während des Abrufs verwirft die späte Antwort', async () => {
  let loese
  const s = erzeugePluginSteuerung({
    hole: () =>
      new Promise((r) => {
        loese = r
      }),
    zeichne: () => {},
  })
  const lauf = s.beiReiterwahl()
  s.zuruecksetzen()
  loese(ANTWORT)
  await lauf
  assert.equal(s.zustand().art, 'nicht_geladen')
  assert.equal(s.zustand().antwort, null)
})

test('Steuerung: Zeitlimit als eigener Text, Ladezeit im Kopf', async () => {
  const fehler = new Error('signal timed out')
  fehler.name = 'TimeoutError'
  let modus = 'zeit'
  const s = erzeugePluginSteuerung({
    hole: async () => {
      if (modus === 'zeit') throw fehler
      return ANTWORT
    },
    zeichne: () => {},
  })
  await s.beiReiterwahl()
  assert.equal(s.zustand().grund, WOERTERBUECHER.de['plugins.zeitlimit'].replace('{sekunden}', '20'))
  modus = 'ok'
  await s.neuLaden()
  assert.match(s.zustand().geladen_am, /^\d{4}-/)
  assert.match(renderPlugins(s.zustand()), / um \d{2}:\d{2}/)
})

test('Dynamische i18n-Schlüssel in allen vier Sprachen', () => {
  assert.ok(DYNAMISCHE_SCHLUESSEL.length > 10)
  for (const [code, buch] of Object.entries(WOERTERBUECHER)) for (const s of DYNAMISCHE_SCHLUESSEL) assert.ok(Object.hasOwn(buch, s), `${code}: ${s} fehlt`)
})
