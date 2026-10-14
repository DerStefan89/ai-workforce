/**
 * Datei: public/leitstand/plugins-workforce-anzeige.test.mjs
 *
 * Zweck: Tests des Workforce-Abschnitts im Plugin-Detail (F45 F-3b-1b, Plan features/F45/plan-f3b.md E): echter Stand über
 * ergaenzePluginBestand (Fixture „kraft“) → übernommen / nicht übernommen mit Grund; Zustände der Freigabe; Knöpfe nur, wenn
 * die Aktion zulässig ist (Bericht passt, keine Sperre); Zuordnung nur mit gültiger Freigabe; Sperre ohne Server-Grund; XSS
 * aller Routenwerte des Abschnitts (Name, Grund-Detail, Prüfbericht, Abweichung, Aktionsfehler); Steuerung setzeAktion.
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
import { legeKraftPluginAn } from '../../scripts/_plugin-kopie-fixture.ts'
import { ergaenzePluginBestand } from '../../scripts/leitstand/routen-plugin-freigabe.mjs'
import { erzeugePluginSteuerung, fokusZiele, pluginSperre, renderPluginDetail, renderPluginListe, renderPluginWorkforce, renderPlugins, renderVerwaist, statusText } from './plugins-anzeige.js'

const WURZEL = mkdtempSync(join(tmpdir(), 'f3b1-anzeige-test-'))
after(() => raeumeVerzeichnis(WURZEL))
const PLUGIN = legeKraftPluginAn(WURZEL)
const REFERENZ = { ok: true, referenz: { cli_version: 'test', agents: [], plugins: [], plugin_skills: [] } }
const liste = JSON.stringify([{ id: 'kraft@markt', version: '2.0.0', scope: 'user', enabled: false, installPath: PLUGIN }])
const BESTAND = await lesePluginBestand({ liste: async () => ({ ok: true, stdout: liste }), claudeOrdner: join(WURZEL, 'claude'), werkzeugsatz: ['Read', 'Grep'], eingebaut: REFERENZ })
const ANTWORT = await ergaenzePluginBestand(BESTAND, { lokal: { zustand: 'fehlt', daten: { faehigkeiten_lokal_schema: 'v0', projekte: {} } }, berichte: [], kopienWurzel: null, werkzeugsatz: ['Read', 'Grep'], projektId: 'p', standHash: 'fehlt', laufSperre: { aktiv: false }, fremd: null, pruefenHier: true })
const P = ANTWORT.plugins[0]

/**
 * Antwort mit überschriebenem Workforce-Stand des Plugins.
 * @param wf - Teil-Überschreibung von plugin.workforce
 * @param kopf - Teil-Überschreibung von antwort.workforce
 * @returns Antwort
 */
function mit(wf, kopf = {}) {
  return { ...ANTWORT, workforce: { ...ANTWORT.workforce, ...kopf }, plugins: [{ ...P, workforce: { ...P.workforce, ...wf } }] }
}
const knopf = (html, art) => new RegExp(`data-pl-aktion="${art}"[^>]*>`).exec(html)?.[0] ?? null
const an = (html, art) => knopf(html, art) !== null && !knopf(html, art).includes('disabled')

test('Übernommen und nicht übernommen mit Grund aus dem echten Stand; Commands-Hinweis', () => {
  const html = renderPluginWorkforce(ANTWORT, P, 0, null)
  for (const name of ['debuggen', 'abschluss', 'baeume', 'pruefer', 'plan']) assert.match(html, new RegExp(`<code>${name}</code>`))
  for (const grund of ['hook_nie', 'mcp_spaeter', 'lsp_nicht', 'allowed_tools', 'frontmatter_unklar', 'agent_tools_fehlt']) assert.match(html, new RegExp(`data-pl-grund="${grund}"`))
  assert.match(html, /Hooks laufen nie im Workforce-Lauf/)
  assert.match(html, /keiner Rolle zuordenbar/)
  assert.match(renderPluginDetail(ANTWORT, 0), /data-pl-wf="freigabe"/)
})

test('Ohne Bericht: prüfen ja, freigeben nein, zurücknehmen fehlt; Zuordnung gesperrt mit Hinweis', () => {
  const html = renderPluginWorkforce(ANTWORT, P, 0, null)
  assert.match(html, /data-pl-freigabe="keine"/)
  assert.match(html, /data-pl-bericht="keiner"/)
  assert.equal(an(html, 'pruefen'), true)
  assert.equal(an(html, 'freigeben'), false)
  assert.equal(knopf(html, 'zuruecknehmen'), null)
  assert.match(html, /data-pl-zuordnung-hinweis/)
  const boxen = html.match(/<input type="checkbox" data-pl-zuordnung[^>]*>/g) ?? []
  assert.ok(boxen.length === 4 && boxen.every((b) => b.includes(' disabled')), `${boxen.length} Kästchen, alle gesperrt erwartet`)
})

test('Bericht passt: freigeben ja; nach Freigabe: Zuordnung bedienbar, zurücknehmen ja; anderer Bericht → Hinweis', () => {
  const bericht = { kennung: 'pruefbericht-p-kraft-markt-0@1', kopie_hash: P.workforce.kopie.kopie_hash, urteil: 'MIT_AUFLAGEN', befunde: [{ bereich: 'modell_anweisungen', schwere: 'mittel', beleg: 'skills/abschluss/SKILL.md' }], auflagen: ['Nur Ausführung'], zusammenfassung: 'Gut.', erstellt_am: '2026-10-14T10:00:00.000Z', passt: true }
  const a = mit({ pruefbericht: bericht, freigabe_sperre: null })
  const html = renderPluginWorkforce(a, a.plugins[0], 0, null)
  assert.equal(an(html, 'freigeben'), true)
  assert.match(html, /Mit Auflagen/)
  assert.match(html, /data-pl-auflage>Nur Ausführung</)
  const frei = mit({ pruefbericht: bericht, freigabe_sperre: null, freigabe: { zustand: 'freigegeben', kopie_hash: bericht.kopie_hash, pruefbericht: bericht.kennung, freigegeben_am: bericht.erstellt_am, abweichung: null }, zuordnung: [{ rolle: 'ausfuehrung', typ: 'skill', name: 'debuggen' }] })
  const h2 = renderPluginWorkforce(frei, frei.plugins[0], 0, null)
  assert.equal(an(h2, 'freigeben'), false)
  assert.equal(an(h2, 'zuruecknehmen'), true)
  assert.match(h2, /data-pl-name="debuggen" data-pl-rolle="ausfuehrung"[^>]* checked \/>/)
  assert.match(h2, /data-pl-name="pruefer" data-pl-rolle="ausfuehrung"[^>]*\/>/)
  assert.ok(!/data-pl-name="pruefer"[^>]*disabled/.test(h2))
  assert.ok(!/data-pl-name="plan"/.test(h2), 'Commands haben kein Kästchen')
  const anders = mit({ pruefbericht: { ...bericht, passt: false, kopie_hash: 'b'.repeat(64) }, freigabe_sperre: 'anderer' })
  const h3 = renderPluginWorkforce(anders, anders.plugins[0], 0, null)
  assert.match(h3, /data-pl-bericht="anderer"/)
  assert.equal(an(h3, 'freigeben'), false)
  // veraltet: gespeicherte Zuordnung bleibt sichtbar angekreuzt und abwählbar, Hinweis „wirkt nicht“.
  const alt = mit({ freigabe: { zustand: 'veraltet', kopie_hash: 'c'.repeat(64), pruefbericht: 'x@1', freigegeben_am: 'x', abweichung: null }, zuordnung: [{ rolle: 'ausfuehrung', typ: 'skill', name: 'debuggen' }] })
  const h4 = renderPluginWorkforce(alt, alt.plugins[0], 0, null)
  assert.match(h4, /Veraltet/)
  assert.match(h4, /wirkt nicht/)
  assert.ok(!/data-pl-name="debuggen"[^>]*disabled/.test(h4))
  assert.match(h4, /data-pl-name="pruefer"[^>]*disabled/)
})

test('Sperre: Lauf aktiv bzw. Datei ungültig sperrt alles, ohne den Server-Grund zu zeigen', () => {
  const s = mit({}, { lauf_sperre: { aktiv: true, grund: 'ein Lauf (E-F45-8) ist aktiv' } })
  assert.equal(pluginSperre(s), 'plugins.wf.gesperrt.lauf')
  const html = renderPluginWorkforce(s, s.plugins[0], 0, null)
  assert.equal(an(html, 'pruefen'), false)
  assert.doesNotMatch(html, /E-F45/)
  assert.match(html, /solange ein Lauf aktiv ist/)
  const d = mit({}, { lokale_datei: { zustand: 'ungueltig', grund: 'kaputt', stand: null } })
  assert.equal(pluginSperre(d), 'plugins.wf.gesperrt.datei')
  assert.equal(an(renderPluginWorkforce(d, d.plugins[0], 0, null), 'pruefen'), false)
  // Laufende Aktion sperrt die Knöpfe; Fehler zeigt den Grund escaped.
  assert.equal(an(renderPluginWorkforce(ANTWORT, P, 0, { art: 'pruefen', phase: 'laeuft' }), 'pruefen'), false)
  assert.match(renderPluginWorkforce(ANTWORT, P, 0, { art: 'pruefen', phase: 'laeuft' }), /Prüfung läuft/)
})

test('XSS: Namen, Grund-Detail, Prüfbericht, Abweichung, Aktionsfehler und Kopie-Grund bleiben Text', () => {
  const X = '<script>alert(1)</script>"><img src=x onerror=alert(2)>'
  const boese = mit({
    kopie: { ...P.workforce.kopie, uebernommen: [{ typ: 'skill', name: X, pfad: X }], nicht_uebernommen: [{ typ: X, name: X, grund: X, detail: X }] },
    pruefbericht: { kennung: X, kopie_hash: X, urteil: X, befunde: [{ bereich: X, schwere: X, beleg: X }], auflagen: [X], zusammenfassung: X, erstellt_am: X, passt: false },
    freigabe: { zustand: X, kopie_hash: X, pruefbericht: X, freigegeben_am: X, abweichung: X },
  }, { rollen: [X] })
  const html = `${renderPluginWorkforce(boese, boese.plugins[0], 0, { art: 'x', phase: 'fehler', grund: X })}${renderPluginWorkforce(mit({ kopie: { ok: false, grund: X, uebernommen: [], nicht_uebernommen: [] } }), P, 0, null)}`
  assert.doesNotMatch(html, /<script|<img/i)
  assert.doesNotMatch(html, /"><img/)
  assert.match(html, /&lt;script&gt;/)
})

test('Steuerung: setzeAktion zeichnet ohne Abruf, Zurücksetzen verwirft Aktionen', async () => {
  let abrufe = 0
  let letzter = null
  const s = erzeugePluginSteuerung({ hole: async () => (abrufe++, ANTWORT), zeichne: (z) => (letzter = z) })
  await s.beiReiterwahl()
  s.setzeAktion('kraft@markt', { art: 'pruefen', phase: 'laeuft' })
  assert.equal(abrufe, 1)
  assert.equal(letzter.aktionen['kraft@markt'].phase, 'laeuft')
  await s.neuLaden()
  assert.equal(s.zustand().aktionen['kraft@markt'].phase, 'laeuft', 'Aktion überdauert ein Neuladen')
  s.setzeAktion('kraft@markt', null)
  assert.deepEqual(s.zustand().aktionen, {})
  s.setzeAktion('kraft@markt', { art: 'x', phase: 'fehler', grund: 'g' })
  s.zuruecksetzen()
  assert.deepEqual(s.zustand().aktionen, {})
})

test('Korrekturrunde: V10-Knöpfe, keine eigene Live-Region, Freigabe zuerst, nicht übernommen aufklappbar, Hauptknopf folgt dem nächsten Schritt', () => {
  const html = renderPluginWorkforce(ANTWORT, P, 0, { art: 'pruefen', phase: 'fehler', grund: 'x' })
  assert.doesNotMatch(html, /role="(status|alert)"/)
  assert.doesNotMatch(html, /class="btn/)
  assert.match(html, /tabindex="-1" data-pl-fokus="meldung"/)
  assert.ok(html.indexOf('data-pl-wf="freigabe"') < html.indexOf('data-pl-wf="uebernahme"'))
  assert.match(html, /<details class="pl-teil[^"]*" data-pl-nicht-uebernommen-block>/)
  // ohne Bericht: Prüfen ist Hauptknopf; mit passendem Bericht: Freigeben; nach Freigabe: keiner.
  assert.match(renderPluginWorkforce(ANTWORT, P, 0, null), /class="button primary" data-pl-aktion="pruefen"/)
  const bericht = { kennung: 'k@1', kopie_hash: P.workforce.kopie.kopie_hash, urteil: 'GEEIGNET', befunde: [{ bereich: 'herkunft', schwere: 'hoch', beleg: 'b' }], auflagen: [], zusammenfassung: 'z', erstellt_am: 'x', passt: true }
  const a = mit({ pruefbericht: bericht, freigabe_sperre: null })
  const h2 = renderPluginWorkforce(a, a.plugins[0], 0, null)
  assert.match(h2, /class="button primary" data-pl-aktion="freigeben"/)
  assert.match(h2, /class="button" data-pl-aktion="pruefen"/)
  assert.match(h2, /ablauf-status fehler">hoch</)
  const f = mit({ pruefbericht: bericht, freigabe_sperre: null, freigabe: { zustand: 'freigegeben', kopie_hash: 'a', pruefbericht: 'k@1', freigegeben_am: 'x', abweichung: null } })
  assert.doesNotMatch(renderPluginWorkforce(f, f.plugins[0], 0, null), /button primary/)
  // Marke in der Liste nur, wenn nicht „keine“.
  assert.match(renderPluginListe(f, null), /data-pl-freigabe="freigegeben"/)
  assert.doesNotMatch(renderPluginListe(ANTWORT, null), /data-pl-freigabe/)
})

test('Korrekturrunde: Prüfen nur in der Workforce-Ansicht, ohne Skill/Agent kein Prüfen, Fremdänderung sperrt, gesperrte Knöpfe beschrieben', () => {
  const projekt = mit({}, { pruefen_hier: false })
  const h = renderPluginWorkforce(projekt, projekt.plugins[0], 0, null)
  assert.equal(knopf(h, 'pruefen'), null)
  assert.match(h, /data-pl-pruefen-woanders/)
  const leer = mit({ kopie: { ...P.workforce.kopie, uebernommen: [{ typ: 'command', name: 'plan', pfad: 'commands/plan.md' }] } })
  const h2 = renderPluginWorkforce(leer, leer.plugins[0], 0, null)
  assert.equal(an(h2, 'pruefen'), false)
  assert.match(h2, /data-pl-ohne-teile/)
  const fremd = mit({}, { lokale_datei: { zustand: 'gueltig', grund: null, stand: 'x', fremd: true } })
  assert.equal(pluginSperre(fremd), 'plugins.wf.gesperrt.fremd')
  const h3 = renderPluginWorkforce(fremd, fremd.plugins[0], 0, null)
  assert.match(h3, /data-pl-aktion="pruefen"[^>]*disabled aria-describedby="pl-wf-sperre-0"/)
  assert.match(h3, /id="pl-wf-sperre-0"/)
})

test('Korrekturrunde: Zuordnung zu einem Teil, der nicht mehr in der Kopie steht, bleibt sichtbar und abwählbar; verwaiste Plugins', () => {
  const alt = mit({ freigabe: { zustand: 'freigegeben', kopie_hash: 'a', pruefbericht: 'k@1', freigegeben_am: 'x', abweichung: null }, zuordnung: [{ rolle: 'ausfuehrung', typ: 'skill', name: 'weg' }] })
  const h = renderPluginWorkforce(alt, alt.plugins[0], 0, null)
  assert.match(h, /data-pl-zuordnung-verwaist/)
  assert.match(h, /data-pl-name="weg" data-pl-rolle="ausfuehrung"[^>]* checked \/>/)
  assert.doesNotMatch(h, /data-pl-name="weg"[^>]*disabled/)
  const v = { ...ANTWORT, workforce: { ...ANTWORT.workforce, verwaist: [{ plugin_id: 'alt@markt', freigabe: { kopie_hash: 'a', freigegeben_am: 'x' }, zuordnung: [{ rolle: 'ausfuehrung', typ: 'agent', name: 'p' }] }] } }
  const hv = renderVerwaist(v)
  assert.match(hv, /data-pl-verwaist="alt@markt"/)
  assert.match(hv, /data-pl-verwaist-aktion="zuruecknehmen" data-pl-id="alt@markt"/)
  assert.match(hv, /data-pl-verwaist-aktion="zuordnung" data-pl-id="alt@markt" data-pl-rolle="ausfuehrung" data-pl-typ="agent" data-pl-name="p"/)
  assert.equal(renderVerwaist(ANTWORT), '')
  assert.match(renderPlugins({ art: 'ok', antwort: v, auswahl: null, aktionen: {} }), /plugins-verwaist-titel/)
  assert.match(renderVerwaist({ ...v, workforce: { ...v.workforce, lauf_sperre: { aktiv: true } } }), /disabled/)
})

test('Korrekturrunde: Generation steigt beim Projektwechsel', async () => {
  const s = erzeugePluginSteuerung({ hole: async () => ANTWORT, zeichne: () => {} })
  const g = s.generation()
  await s.beiReiterwahl()
  assert.equal(s.generation(), g)
  s.zuruecksetzen()
  assert.equal(s.generation(), g + 1)
})

test('F-1094 (8): Status und Meldungen je Plugin fokussierbar, Erfolgsmeldung, Text der Live-Region', () => {
  const laeuft = renderPluginWorkforce(ANTWORT, P, 0, { art: 'freigeben', phase: 'laeuft' })
  assert.match(laeuft, /<p class="pl-ordner-hinweis" tabindex="-1" data-pl-fokus="status" data-pl-meldung-fuer="kraft@markt" data-pl-aktion-status="laeuft">/)
  const ok = renderPluginWorkforce(ANTWORT, P, 0, { art: 'freigeben', phase: 'ok' })
  assert.match(ok, /tabindex="-1" data-pl-fokus="meldung" data-pl-meldung-fuer="kraft@markt" data-pl-aktion-status="ok">Freigegeben\.</)
  assert.match(renderPluginWorkforce(ANTWORT, P, 0, { art: 'x', phase: 'fehler', grund: 'g' }), /data-pl-fokus="meldung" data-pl-meldung-fuer="kraft@markt" data-pl-aktion-status="fehler"/)
  assert.equal(renderPluginWorkforce(ANTWORT, P, 0, { art: 'unbekannt', phase: 'ok' }).includes('data-pl-aktion-status="ok"'), false)
  assert.equal(statusText({ art: 'pruefen', phase: 'laeuft' }), 'Prüfung läuft … das dauert einige Minuten.')
  assert.equal(statusText({ art: 'zuruecknehmen', phase: 'ok' }), 'Freigabe zurückgenommen.')
  assert.match(statusText({ art: 'freigeben', phase: 'fehler', grund: 'g' }), /Nicht ausgeführt: g/)
  assert.equal(statusText(null), '')
  // Ziele: Überschriften/Kopf fokussierbar (tabindex -1).
  const v = { ...ANTWORT, workforce: { ...ANTWORT.workforce, verwaist: [{ plugin_id: 'alt@markt', freigabe: { kopie_hash: 'a', freigegeben_am: 'x' }, zuordnung: [] }] } }
  assert.match(renderVerwaist(v), /id="plugins-verwaist-titel" class="pl-abschnitt-titel" tabindex="-1"/)
  assert.match(renderVerwaist(v, { 'alt@markt': { art: 'zuruecknehmen', phase: 'laeuft' } }), /data-pl-fokus="status" data-pl-meldung-fuer="alt@markt"/)
  assert.match(renderPlugins({ art: 'ok', antwort: ANTWORT, auswahl: null, aktionen: {} }), /id="plugins-kopf" tabindex="-1"/)
})

test('F-1094 (8): Fokusziele — läuft Status, danach Meldung bzw. nächstes Bedienelement, verwaist die Liste; nie leer', () => {
  const m = '[data-pl-meldung-fuer="kraft@markt"]'
  assert.deepEqual(fokusZiele({ pluginId: 'kraft@markt', art: 'freigeben', phase: 'laeuft', selektor: 'X' }), [`${m}[data-pl-fokus="status"]`, '#plugins-detail', '#plugins-kopf'])
  assert.deepEqual(fokusZiele({ pluginId: 'kraft@markt', art: 'freigeben', phase: 'ok', selektor: 'X' }), [`${m}[data-pl-fokus="meldung"]`, 'X', '#plugins-detail', '#plugins-kopf'])
  assert.deepEqual(fokusZiele({ pluginId: 'kraft@markt', art: 'zuruecknehmen', phase: 'fehler', selektor: null }), [`${m}[data-pl-fokus="meldung"]`, '#plugins-detail', '#plugins-kopf'])
  assert.deepEqual(fokusZiele({ pluginId: 'kraft@markt', art: 'zuordnen', phase: 'ok', selektor: 'K' }), ['K', `${m}[data-pl-fokus="meldung"]`, '#plugins-detail', '#plugins-kopf'])
  assert.deepEqual(fokusZiele({ pluginId: 'alt@markt', art: 'zuruecknehmen', phase: 'ok', verwaist: true }), ['[data-pl-meldung-fuer="alt@markt"][data-pl-fokus="meldung"]', '#plugins-verwaist-titel', '#plugins-kopf'])
  // Anführungszeichen und Backslash in der id werden für den Selektor maskiert: a"b\c@m → a\"b\\c@m.
  assert.equal(fokusZiele({ pluginId: String.raw`a"b\c@m`, art: 'x', phase: 'laeuft' })[0], String.raw`[data-pl-meldung-fuer="a\"b\\c@m"][data-pl-fokus="status"]`)
})

test('F-1094 (8): genau eine feste Live-Region für den Plugin-Reiter, außerhalb des neu gezeichneten #plugins', async () => {
  const { readFileSync } = await import('node:fs')
  const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8')
  const panel = html.slice(html.indexOf('id="faehigkeiten-bereich-plugins"'), html.indexOf('<div id="plugins" class="pl-bereich"></div>'))
  assert.match(panel, /<p id="plugins-status" class="sr-only" aria-live="polite"><\/p>/)
  assert.equal((panel.match(/aria-live/g) ?? []).length, 1)
})

test('F-1094 (8): stilles Neuladen nach einer Aktion — Inhalt und Meldung bleiben bis zur neuen Antwort stehen (kein Ladezustand)', async () => {
  let freigeben = () => {}
  const zustaende = []
  let erster = true
  const s = erzeugePluginSteuerung({
    hole: () => (erster ? ((erster = false), Promise.resolve(ANTWORT)) : new Promise((r) => (freigeben = () => r(ANTWORT)))),
    zeichne: (z) => zustaende.push(z.art),
  })
  await s.beiReiterwahl()
  s.waehle(0)
  s.setzeAktion('kraft@markt', { art: 'freigeben', phase: 'ok' })
  const vorher = zustaende.length
  const laden = s.neuLaden({ still: true })
  assert.equal(s.zustand().art, 'ok', 'während des Abrufs bleibt der alte Inhalt stehen')
  assert.match(renderPlugins(s.zustand()), /data-pl-aktion-status="ok"/)
  freigeben()
  await laden
  assert.ok(!zustaende.slice(vorher).includes('laedt'))
  assert.equal(s.zustand().auswahl, 0)
  // Ohne „still“ (Reiterwahl, „Neu laden“) weiter mit Ladezustand.
  const zweiter = s.neuLaden()
  assert.equal(s.zustand().art, 'laedt')
  freigeben()
  await zweiter
})
