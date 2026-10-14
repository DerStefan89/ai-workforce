/**
 * Datei: scripts/check-f45-f3a2-anzeige.mjs
 *
 * Zweck: Gate F45 F-3a-2 (Reiter „Plugins aus deinem Claude Code“ in der Capability Library; Plan features/F45/plan-f3a2.md).
 * Grün
 * (a) Fixture-Bestand (scripts/_plugin-fixture.ts) über den echten Handler GET /api/plugins → renderPlugins: Liste mit den drei
 *     Plugins (Name, Marketplace, Version, Status), Detail „voll“ mit Hooks (Ereignis, Befehl), MCP gepinnt ja/nein, Hook- und
 *     MCP-Risiko; scope local mit Ordnerbezug statt „an/aus“ (F-1091 (2)).
 * (b) Fester Hinweis (seit F45 F-3b-2 „Im Workforce-Lauf wirksam: …“, vorher F-3b-1 „Im Workforce-Lauf noch nicht wirksam …“
 *     und „Noch nicht im Workforce-Lauf nutzbar …“) im Panel des Reiters (index.html), in
 *     allen vier Wörterbüchern vorhanden; kein sichtbarer Text des Reiters (Wörterbuch plugins.*, Reitername, Panel-Text ohne
 *     Kommentare/Attribute, gerenderte Zustände) enthält eine interne Kennung /\bF-\d/ (Challenger 14.10.2026).
 * (c) Eingebaute getrennt: nicht in der Liste, eigener Block mit Messversion der Referenzliste (F-1091 (1)).
 * (d) Leer (Route ok ohne Plugins) und unlesbar (Läufer Exit 1 → Route status 'fehler') mit Grund.
 * (e) XSS-Rotfall: Plugin-Name (id der CLI-Liste) und Hook-Befehl (hooks.json) mit <script>/Attribut-Einbruch über die echte
 *     Route, Command-Name und Risiko-Text über eine verfälschte Antwort — kein rohes <script/<img im HTML.
 * (f) Kein Abruf ohne Reiterwahl: Steuerung (Erzeugen, Zurücksetzen, Wählen → 0 Abrufe; Reiterwahl/Neu laden → je 1) und
 *     Quelltext (holePlugins nur in api.js und views/plugins.js; ladeCapabilities lädt keine Plugins; der Abruf hängt nur am
 *     Rückruf der Reiterwahl und am gewählten Reiter bei „Neu laden“; Projektwechsel setzt nur zurück).
 * (g) starteWorkflowSchritt( genau 6-mal im Server (kein Lauf geändert).
 * Rot (Selbsttest, kalibriert)
 * (h) Jede Prüffunktion aus (a)–(g) schlägt bei verfälschten Eingängen an — je Einzelprüfung mindestens ein Rotfall
 *     (Code-Review 7).
 *
 * Wird aufgerufen von: npm run check
 *
 * Wichtig: Kein Netz außer 127.0.0.1, kein CLI-Start (Läufer ist eine Attrappe), Fixture unter tmpdir. Die Prüffunktionen sind
 * rein und nehmen ihre Eingänge als Werte — so kann (h) jede mit einem verfälschten Eingang aufrufen.
 */

import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { WOERTERBUECHER } from '../public/leitstand/i18n.js'
import { erzeugePluginSteuerung, renderPlugins } from '../public/leitstand/plugins-anzeige.js'
import { raeumeVerzeichnis } from './_aufraeumen.ts'
import { legePluginFixtureAn } from './_plugin-fixture.ts'
import { erzeugeRequestHandler } from './leitstand-server.mjs'

const befunde = []
console.log('\n=== F45-F-3a-2-Anzeige-Check ===\n')

const BOESE = '" data-boese="1"><img src=x onerror=alert(1)><script>alert(2)</script>'
/** Vereinbarter Hinweis (de) im Panel des Reiters — ohne interne Kennung (Challenger 14.10.2026). */
// F45 F-3b-1: Text angepasst (Freigabe und Zuordnung sind jetzt möglich; der Lauf folgt im nächsten Schritt) — die Prüfung bleibt gleich streng.
const HINWEIS_DE = 'Im Workforce-Lauf wirksam: zugeordnete Skills und Agents laufen in Ausführungsschritten (Claude Code, schreibend) mit, solange die Freigabe gilt.'
const REFERENZ_VERSION = JSON.parse(readFileSync('src/faehigkeiten/eingebaut-referenz.json', 'utf8')).cli_version

// ─── Reine Prüffunktionen ─────────────────────────────────────────────────────

/**
 * (a) Liste und Detail aus der Fixture-Antwort.
 * @param liste - renderPlugins ohne Auswahl
 * @param voll - renderPlugins mit Auswahl „voll“
 * @param lokal - renderPlugins mit Auswahl „nur-skill“ (scope local)
 * @returns Befunde
 */
function pruefeListeDetail(liste, voll, lokal) {
  const b = []
  const zeilen = (liste.match(/<tr class="library-zeile"/g) ?? []).length
  if (zeilen !== 3) b.push(`(a) Liste: ${zeilen} Zeilen statt 3`)
  for (const [name, re] of [
    ['Name voll', />voll<\/button>/],
    ['Marketplace', /<td data-spalte="[^"]*">markt<\/td>/],
    ['Version', /<td data-spalte="[^"]*">1\.0\.0<\/td>/],
    ['Status an', /data-plugin-status="an"/],
  ])
    if (!re.test(liste)) b.push(`(a) Liste: ${name} fehlt`)
  for (const [name, re] of [
    ['Hook SessionStart mit Befehl', /data-pl-teil="hooks"[\s\S]*SessionStart[\s\S]*node start\.js/],
    ['MCP latest nicht gepinnt', /data-pl-mcp="latest" data-pl-gepinnt="nein"/],
    ['MCP fest gepinnt', /data-pl-mcp="fest" data-pl-gepinnt="ja"/],
    ['Hook-Risiko', /data-pl-risiko="hook_befehl"/],
    ['MCP-Risiko', /data-pl-risiko="mcp_ungepinnt"/],
    ['Command mit allowed-tools', /data-pl-teil="commands"[\s\S]*c-eins[\s\S]*gh pr comment/],
  ])
    if (!re.test(voll)) b.push(`(a) Detail voll: ${name} fehlt`)
  if (!/data-plugin-status="ordner"/.test(liste) || !/data-pl-aktiv="ordner"[\s\S]*data-pl-hinweis="gemessen"/.test(lokal)) b.push('(a) scope local als Stand dieses Projekts gezeigt oder ohne Hinweis auf die Messung (F-1091 (2))')
  return b
}

/**
 * (b) Fester Hinweis zum Lauf im Panel und in den Wörterbüchern; keine interne Kennung im sichtbaren Text.
 * @param html - index.html
 * @param buecher - Wörterbücher
 * @param gerendert - gerenderte Zustände des Reiters (HTML)
 * @returns Befunde
 */
function pruefeHinweis(html, buecher, gerendert) {
  const b = []
  const panel = html.match(/<div id="faehigkeiten-bereich-plugins"[\s\S]*?<div id="plugins"/)?.[0] ?? ''
  if (!/data-pl-hinweis="f3b"[\s\S]*data-i18n="plugins\.hinweisF3b"/.test(panel)) b.push('(b) Hinweis F-3b fehlt im Panel des Reiters')
  if (!/id="faehigkeiten-reiter-plugins"[^>]*aria-controls="faehigkeiten-bereich-plugins"/.test(html)) b.push('(b) Reiter fehlt im Register')
  if (buecher.de?.['plugins.hinweisF3b'] !== HINWEIS_DE) b.push('(b) de: Hinweis weicht vom vereinbarten Text ab')
  for (const [code, buch] of Object.entries(buecher)) if (String(buch['plugins.hinweisF3b'] ?? '').trim() === '') b.push(`(b) ${code}: Hinweis fehlt`)
  // Sichtbarer Text: Panel ohne Kommentare und Tags, Wörterbuchwerte des Reiters, gerenderte Zustände ohne Tags.
  const sichtbar = (h) => h.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]*>/g, ' ')
  const texte = [['Panel', sichtbar(panel)], ['gerendert', sichtbar(gerendert)]]
  for (const [code, buch] of Object.entries(buecher)) for (const [k, v] of Object.entries(buch)) if (k.startsWith('plugins.') || k === 'werkstatt.reiter.plugins') texte.push([`${code}.${k}`, JSON.stringify(v)])
  const mitKennung = texte.filter(([, t]) => /\bF-\d/.test(t)).map(([wo]) => wo)
  if (mitKennung.length > 0) b.push(`(b) interne Kennung im sichtbaren Text: ${mitKennung.slice(0, 5).join(', ')}`)
  return b
}

/**
 * (c) Eingebaute getrennt mit Messversion.
 * @param html - renderPlugins
 * @param version - erwartete Messversion
 * @returns Befunde
 */
function pruefeEingebaut(html, version) {
  const b = []
  const tabelle = html.match(/<table[\s\S]*<\/table>/)?.[0] ?? ''
  if (tabelle.includes('@builtin')) b.push('(c) eingebautes Plugin in der Liste')
  const block = html.match(/<section class="pl-eingebaut"[\s\S]*<\/section>/)?.[0] ?? ''
  if (!/data-pl-eingebaut="cc-plugin-telemetry@builtin" data-pl-quelle="referenzliste"/.test(block)) b.push('(c) Block der eingebauten fehlt')
  if (!block.includes(version)) b.push('(c) Messversion der Referenzliste fehlt')
  return b
}

/**
 * (d) Leer und unlesbar.
 * @param leer - renderPlugins der leeren Antwort
 * @param unlesbar - renderPlugins der Fehlerantwort
 * @param grund - erwarteter Grund
 * @returns Befunde
 */
function pruefeLeerUnlesbar(leer, unlesbar, grund) {
  const b = []
  if (!/data-pl-zustand="leer"/.test(leer) || /<table/.test(leer)) b.push('(d) Leerzustand fehlt')
  if (!/data-pl-eingebaut=/.test(leer)) b.push('(d) leer: eingebaute verschwinden')
  if (!/data-pl-zustand="fehler"/.test(unlesbar) || !unlesbar.includes(grund)) b.push('(d) unlesbar ohne Grund')
  return b
}

/** Escapte Nutzlast, wie sie als Text im HTML stehen muss. */
const BOESE_ESCAPED = '&quot; data-boese=&quot;1&quot;&gt;&lt;img'

/**
 * (e) XSS je Quelle (Code-Review 1/2): die Route liefert das Plugin mit Nutzlast; Name (Liste), Hook-Befehl (Detail „voll“) und
 * die übrigen Felder tragen die Nutzlast nur escaped; kein rohes <script/<img, kein Attribut über ein rohes Anführungszeichen.
 * @param x - { antwort: Route-Antwort im Modus xss, liste, detailVoll, gesamt }
 * @returns Befunde
 */
function pruefeXss(x) {
  const b = []
  if (x.antwort?.status !== 'ok' || x.antwort.plugins?.length !== 4) b.push('(e) Route liefert das Plugin mit Nutzlast nicht (Prüfung ohne Wirkung)')
  const name = x.liste.match(/<button type="button" class="library-name" data-plugin-index="3"[^>]*>([^<]*)<\/button>/)?.[1] ?? ''
  if (!name.includes(BOESE_ESCAPED)) b.push('(e) Plugin-Name der Route nicht escaped in der Liste')
  if (!x.detailVoll.includes(`node start.js ${BOESE_ESCAPED}`)) b.push('(e) Hook-Befehl der Route nicht escaped im Detail')
  if (/<script/i.test(x.gesamt)) b.push('(e) rohes <script im HTML')
  if (/<img/i.test(x.gesamt)) b.push('(e) rohes <img im HTML')
  if (/\sdata-boese="1"/.test(x.gesamt)) b.push('(e) Attribut-Einbruch über ein rohes Anführungszeichen')
  return b
}

/**
 * (f) Steuerung: Zählung der Abrufe und Zurücksetzen während des Abrufs (QA 2).
 * @param z - { nachErzeugen, nachZuruecksetzen, nachWaehlen, nachReiterwahl, nachNeuLaden, nachSpaeterAntwort }
 * @returns Befunde
 */
function pruefeSteuerung(z) {
  const b = []
  if (z.nachErzeugen + z.nachZuruecksetzen + z.nachWaehlen !== 0) b.push(`(f) Abruf ohne Reiterwahl (Erzeugen ${z.nachErzeugen}, Zurücksetzen ${z.nachZuruecksetzen}, Wählen ${z.nachWaehlen})`)
  if (z.nachReiterwahl !== 1 || z.nachNeuLaden !== 2) b.push(`(f) Reiterwahl/Neu laden: ${z.nachReiterwahl}/${z.nachNeuLaden} statt 1/2`)
  if (z.nachSpaeterAntwort !== 'nicht_geladen') b.push(`(f) späte Antwort nach Projektwechsel übernommen (${z.nachSpaeterAntwort})`)
  return b
}

/**
 * (f) Quelltext: wo abgerufen wird.
 * @param dateien - [{ pfad, text }] aller public/leitstand/**\/*.js ohne Tests
 * @param cap - Text von views/capabilities.js
 * @param view - Text von views/plugins.js
 * @returns Befunde
 */
function pruefeQuelltext(dateien, cap, view) {
  const b = []
  const fremd = dateien.filter((d) => !/(^|[\\/])api\.js$|views[\\/]plugins\.js$/.test(d.pfad) && /holePlugins|\/plugins['"`?]/.test(d.text)).map((d) => d.pfad)
  if (fremd.length > 0) b.push(`(f) holePlugins/'/plugins' außerhalb von api.js und views/plugins.js: ${fremd.join(', ')}`)
  // Code-Review 3: auch die Lade-Wrapper und die Steuerung nur in den drei Dateien des Reiters; kein Timer/Abo in der View.
  const wrapper = dateien.filter((d) => !/views[\\/](capabilities|plugins)\.js$|plugins-anzeige\.js$/.test(d.pfad) && /ladePlugins(BeiReiterwahl|Neu)|setzePluginsZurueck|erzeugePluginSteuerung/.test(d.text)).map((d) => d.pfad)
  if (wrapper.length > 0) b.push(`(f) Lade-Wrapper der Plugins außerhalb des Reiters: ${wrapper.join(', ')}`)
  // F45 F-3b-1 (angepasst): erlaubt ist genau ein setTimeout im Takt von warteAufPruefung — dort wird nach einem Klick auf
  // „Kopie prüfen“ der Prüflauf (GET …/sammlung/pruefung/<id>) abgefragt, nie die Plugin-Liste. Außerhalb dieser Funktion
  // bleibt jeder Timer/jedes Abo ein Befund; in ihr darf weder holePlugins noch ein Neuladen stehen.
  const warte = /async function warteAufPruefung\([^)]*\) \{[\s\S]*?\n\}\n/.exec(view)?.[0] ?? ''
  const ohneWarte = warte === '' ? view : view.replace(warte, '')
  if (/setInterval|setTimeout|abonniere/.test(ohneWarte)) b.push('(f) Timer oder Abo in views/plugins.js')
  if (/holePlugins|neuLaden|setInterval|abonniere/.test(warte) || (warte.match(/setTimeout/g) ?? []).length > 1) b.push('(f) warteAufPruefung lädt Plugins oder trägt mehr als einen Timer')
  // F45 F-3b-1 (Code-Review 3): Neuladen nach einer Aktion nur in derselben Generation (kein Abruf nach einem Projektwechsel) —
  // jedes steuerung.neuLaden() in fuehreAus steht in der Form „if (aktuell()) await steuerung.neuLaden()“.
  const fuehre = /async function fuehreAus\([^)]*\) \{[\s\S]*?\n\}\n/.exec(view)?.[0] ?? ''
  const alle = (fuehre.match(/steuerung\.neuLaden\([^)]*\)/g) ?? []).length
  const bewacht = (fuehre.match(/if \(aktuell\(\)\) await steuerung\.neuLaden\([^)]*\)/g) ?? []).length
  if (fuehre === '' || alle === 0 || alle !== bewacht) b.push('(f) fuehreAus lädt nach einer Aktion neu, ohne die Generation (Projektwechsel) zu prüfen')
  const lade = cap.match(/async function ladeCapabilities\(\)[\s\S]*?\n}\n/)?.[0] ?? ''
  if (lade === '' || /Plugin/.test(lade)) b.push('(f) ladeCapabilities lädt Plugins (oder nicht gefunden)')
  const aufrufe = cap.split('ladePluginsBeiReiterwahl()').length - 1
  if (aufrufe !== 1 || !/if \(\(neuGewaehlt \|\| pluginsNichtGeladen\(\)\) && reiter\?\.id === PLUGINS_REITER\) ladePluginsBeiReiterwahl\(\)/.test(cap)) b.push('(f) Abruf hängt nicht allein an der (neuen) Wahl des Reiters')
  if ((cap.split('ladePluginsNeu()').length - 1 !== 1) || !/if \(pluginsReiterGewaehlt\(\)\) ladePluginsNeu\(\)/.test(cap)) b.push('(f) „Neu laden“ lädt Plugins ohne gewählten Reiter')
  const wechsel = cap.match(/abonniereProjektWechsel\(\(\) => \{[\s\S]*?\n {2}\}\)/)?.[0] ?? ''
  if (!wechsel.includes('setzePluginsZurueck()') || /ladePlugins/.test(wechsel)) b.push('(f) Projektwechsel lädt Plugins oder setzt sie nicht zurück')
  const init = view.match(/export function initPlugins\(\)[\s\S]*?\n}\n/)?.[0] ?? ''
  if (init === '' || /beiReiterwahl|neuLaden|holePlugins/.test(init)) b.push('(f) initPlugins ruft ab')
  return b
}

/**
 * (g) Quelltext des Servers.
 * @param server - Text
 * @returns Befunde
 */
function pruefeServer(server) {
  const n = server.split('starteWorkflowSchritt(').length - 1
  return n === 6 ? [] : [`(g) starteWorkflowSchritt( ${n}-mal statt 6-mal`]
}

// ─── (a)–(e) über den echten Handler ──────────────────────────────────────────
const wurzel = mkdtempSync(join(tmpdir(), 'f45-f3a2-gate-'))
const E = {}
try {
  const f = legePluginFixtureAn(wurzel)
  // XSS über die Route: Plugin-id mit Nutzlast (vierter Eintrag, Ordner von nur-skill) und Hook-Befehl in hooks.json von voll —
  // die Hook-Nutzlast erst vor dem xss-Abruf, damit E.ok sie nicht trägt (Rotfall „Hook-Befehl fehlt“).
  const liste = JSON.parse(f.listeJson)
  let modus = 'ok'
  const laeufer = async () => {
    if (modus === 'exit') return { ok: false, grund: 'claude plugin list endete mit Exit 1: Gate' }
    if (modus === 'leer') return { ok: true, stdout: '[]' }
    if (modus === 'xss') return { ok: true, stdout: JSON.stringify([...liste, { id: `${BOESE}@markt`, version: BOESE, scope: 'user', enabled: true, installPath: f.pfade.nurSkill }]) }
    return { ok: true, stdout: f.listeJson }
  }
  const projekt = join(wurzel, 'projekt')
  const server = createServer(erzeugeRequestHandler({ basisVerzeichnis: join(wurzel, 'kontrollzustand'), repoWurzel: projekt, installWurzel: process.cwd(), pluginListe: laeufer, pluginClaudeOrdner: f.claudeOrdner }))
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const hole = async () => (await fetch(`http://127.0.0.1:${server.address().port}/api/plugins`)).json()
  try {
    E.ok = await hole()
    modus = 'leer'
    E.leer = await hole()
    modus = 'exit'
    E.fehler = await hole()
    modus = 'xss'
    writeFileSync(join(f.pfade.voll, 'hooks', 'hooks.json'), JSON.stringify({ hooks: { SessionStart: [{ matcher: 'startup', hooks: [{ type: 'command', command: `node start.js ${BOESE}` }] }] } }))
    E.xss = await hole()
  } finally {
    await new Promise((r) => server.close(r))
  }
} finally {
  raeumeVerzeichnis(wurzel)
}
const LISTE = renderPlugins({ art: 'ok', antwort: E.ok, auswahl: null })
const VOLL = renderPlugins({ art: 'ok', antwort: E.ok, auswahl: 0 })
const LOKAL = renderPlugins({ art: 'ok', antwort: E.ok, auswahl: 1 })
const LEER = renderPlugins({ art: 'ok', antwort: E.leer, auswahl: null })
const UNLESBAR = renderPlugins({ art: 'ok', antwort: E.fehler })
const xssAntwort = structuredClone(E.xss)
if (xssAntwort?.status === 'ok') {
  const voll = xssAntwort.plugins[0]
  voll.bestandteile.commands[0].name = BOESE
  voll.risiken[0].text = BOESE
}
const XSS = {
  antwort: E.xss,
  liste: renderPlugins({ art: 'ok', antwort: E.xss, auswahl: null }),
  detailVoll: renderPlugins({ art: 'ok', antwort: E.xss, auswahl: 0 }),
  gesamt: [0, 3].map((i) => renderPlugins({ art: 'ok', antwort: xssAntwort, auswahl: i })).join('') + renderPlugins({ art: 'fehler', grund: BOESE }),
}

const pruefe = (name, ergebnis, meldung) => {
  befunde.push(...ergebnis)
  if (ergebnis.length === 0) console.log(`✓ ${meldung}`)
  else console.error(`✗ ${name}`)
}
const INDEX = readFileSync('public/leitstand/index.html', 'utf8')
pruefe('(a)', pruefeListeDetail(LISTE, VOLL, LOKAL), '(a) Fixture über die echte Route: 3 Zeilen; Detail mit Hooks, MCP gepinnt ja/nein, Hook- und MCP-Risiko; scope local mit Ordnerbezug.')
const GERENDERT = [LISTE, VOLL, LOKAL, LEER, UNLESBAR].join('')
pruefe('(b)', pruefeHinweis(INDEX, WOERTERBUECHER, GERENDERT), '(b) Fester Hinweis zum Lauf im Panel, in de/en/tr/ru; keine interne Kennung (F-<Zahl>) im sichtbaren Text.')
pruefe('(c)', pruefeEingebaut(LISTE, REFERENZ_VERSION), `(c) Eingebaute getrennt, Messversion ${REFERENZ_VERSION}.`)
pruefe('(d)', pruefeLeerUnlesbar(LEER, UNLESBAR, 'Exit 1: Gate'), '(d) Leer mit Grund (eingebaute bleiben), unlesbar mit Grund der Route.')
pruefe('(e)', pruefeXss(XSS), '(e) XSS: Plugin-Name und Hook-Befehl über die Route, dazu Version, Command, Risiko-Text, Fehlergrund escaped; kein Attribut-Einbruch.')

// ─── (f) Abruf nur bei Reiterwahl ─────────────────────────────────────────────
let abrufe = 0
const zaehlung = {}
{
  const s = erzeugePluginSteuerung({ hole: async () => (abrufe++, E.ok), zeichne: () => {} })
  zaehlung.nachErzeugen = abrufe
  s.zuruecksetzen()
  zaehlung.nachZuruecksetzen = abrufe
  s.waehle(0)
  zaehlung.nachWaehlen = abrufe
  await s.beiReiterwahl()
  zaehlung.nachReiterwahl = abrufe
  s.waehle(0)
  await s.neuLaden()
  zaehlung.nachNeuLaden = abrufe
  // Projektwechsel während des Abrufs: die späte Antwort wird verworfen (QA 2).
  let loese
  const spaet = erzeugePluginSteuerung({
    hole: () =>
      new Promise((r) => {
        loese = r
      }),
    zeichne: () => {},
  })
  const lauf = spaet.beiReiterwahl()
  spaet.zuruecksetzen()
  loese(E.ok)
  await lauf
  zaehlung.nachSpaeterAntwort = spaet.zustand().art
}
const DATEIEN = []
const sammle = (p) => {
  for (const e of readdirSync(p, { withFileTypes: true })) {
    const voll = join(p, e.name)
    if (e.isDirectory()) sammle(voll)
    else if (e.name.endsWith('.js')) DATEIEN.push({ pfad: voll, text: readFileSync(voll, 'utf8') })
  }
}
sammle('public/leitstand')
const CAP = readFileSync('public/leitstand/views/capabilities.js', 'utf8')
const VIEW = readFileSync('public/leitstand/views/plugins.js', 'utf8')
pruefe('(f)', [...pruefeSteuerung(zaehlung), ...pruefeQuelltext(DATEIEN, CAP, VIEW)], `(f) Kein Abruf ohne Reiterwahl: Steuerung 0/0/0 → 1 → 2, späte Antwort nach Projektwechsel verworfen; Quelltext (${DATEIEN.length} Dateien): Abruf nur über Reiterwahl und „Neu laden“ bei gewähltem Reiter.`)

// ─── (g) Server ───────────────────────────────────────────────────────────────
const SERVER = readFileSync('scripts/leitstand-server.mjs', 'utf8')
pruefe('(g)', pruefeServer(SERVER), '(g) starteWorkflowSchritt( genau 6-mal im Server.')

// ─── (h) Rot-Selbsttest ───────────────────────────────────────────────────────
{
  const vor = befunde.length
  const ohneZeile = LISTE.replace(/<tr class="library-zeile"[\s\S]*?<\/tr>/, '')
  const rot = [
    ['Zeile fehlt', pruefeListeDetail(ohneZeile, VOLL, LOKAL)],
    ['Hook-Risiko fehlt', pruefeListeDetail(LISTE, VOLL.replaceAll('data-pl-risiko="hook_befehl"', 'data-pl-risiko="x"'), LOKAL)],
    ['MCP-Pin falsch', pruefeListeDetail(LISTE, VOLL.replace('data-pl-mcp="latest" data-pl-gepinnt="nein"', 'data-pl-mcp="latest" data-pl-gepinnt="ja"'), LOKAL)],
    ['scope local als an', pruefeListeDetail(LISTE, VOLL, LOKAL.replaceAll('data-pl-aktiv="ordner"', 'data-pl-aktiv="an"'))],
    ['Hinweis fehlt im Panel', pruefeHinweis(INDEX.replace('data-pl-hinweis="f3b"', ''), WOERTERBUECHER, GERENDERT)],
    ['Hinweis leer (ru)', pruefeHinweis(INDEX, { ...WOERTERBUECHER, ru: { ...WOERTERBUECHER.ru, 'plugins.hinweisF3b': ' ' } }, GERENDERT)],
    ['Hinweis-Text de abweichend', pruefeHinweis(INDEX, { ...WOERTERBUECHER, de: { ...WOERTERBUECHER.de, 'plugins.hinweisF3b': 'Kommt bald.' } }, GERENDERT)],
    ['Kennung im Wörterbuch (tr)', pruefeHinweis(INDEX, { ...WOERTERBUECHER, tr: { ...WOERTERBUECHER.tr, 'plugins.hinweisF3b': 'F-3b ile gelecek.' } }, GERENDERT)],
    ['Kennung im Panel-Text', pruefeHinweis(INDEX.replace('data-pl-hinweis="f3b">', 'data-pl-hinweis="f3b"><span>siehe F-3b</span>'), WOERTERBUECHER, GERENDERT)],
    ['Kennung im Render', pruefeHinweis(INDEX, WOERTERBUECHER, `${GERENDERT}<p>folgt mit F-3b</p>`)],
    ['eingebaut in der Liste', pruefeEingebaut(LISTE.replace('</tbody>', '<tr><td>cc-plugin-telemetry@builtin</td></tr></tbody>'), REFERENZ_VERSION)],
    ['Messversion fehlt', pruefeEingebaut(LISTE.replaceAll(REFERENZ_VERSION, ''), REFERENZ_VERSION)],
    ['leer ohne Zustand', pruefeLeerUnlesbar(LISTE, UNLESBAR, 'Exit 1: Gate')],
    ['unlesbar ohne Grund', pruefeLeerUnlesbar(LEER, renderPlugins({ art: 'fehler', grund: '' }), 'Exit 1: Gate')],
    ['rohes <script', pruefeXss({ ...XSS, gesamt: `${XSS.gesamt}<script>` })],
    ['rohes <img', pruefeXss({ ...XSS, gesamt: `${XSS.gesamt}<img src=x>` })],
    ['Attribut über rohes Anführungszeichen', pruefeXss({ ...XSS, gesamt: `${XSS.gesamt}<span title="" data-boese="1">` })],
    ['Route liefert Nutzlast nicht', pruefeXss({ antwort: E.ok, liste: LISTE, detailVoll: VOLL, gesamt: LISTE })],
    ['Name nur halb escaped', pruefeXss({ ...XSS, liste: XSS.liste.replaceAll('&quot; data-boese', '" data-boese') })],
    ['Hook-Befehl fehlt', pruefeXss({ ...XSS, detailVoll: VOLL })],
    ['Name fehlt', pruefeListeDetail(LISTE.replace('>voll</button>', '>x</button>'), VOLL, LOKAL)],
    ['Status an fehlt', pruefeListeDetail(LISTE.replaceAll('data-plugin-status="an"', 'data-plugin-status="aus"'), VOLL, LOKAL)],
    ['Hook ohne Befehl', pruefeListeDetail(LISTE, VOLL.replaceAll('node start.js', 'x'), LOKAL)],
    ['scope local in der Liste als an', pruefeListeDetail(LISTE.replaceAll('data-plugin-status="ordner"', 'data-plugin-status="an"'), VOLL, LOKAL)],
    ['MCP fest nicht gepinnt', pruefeListeDetail(LISTE, VOLL.replace('data-pl-mcp="fest" data-pl-gepinnt="ja"', 'data-pl-mcp="fest" data-pl-gepinnt="nein"'), LOKAL)],
    ['MCP-Risiko fehlt', pruefeListeDetail(LISTE, VOLL.replaceAll('data-pl-risiko="mcp_ungepinnt"', 'data-pl-risiko="x"'), LOKAL)],
    ['Command fehlt', pruefeListeDetail(LISTE, VOLL.replaceAll('gh pr comment', 'x'), LOKAL)],
    ['Marketplace fehlt', pruefeListeDetail(LISTE.replaceAll('">markt</td>', '">x</td>'), VOLL, LOKAL)],
    ['Version fehlt', pruefeListeDetail(LISTE.replace('">1.0.0</td>', '">x</td>'), VOLL, LOKAL)],
    ['local ohne Messhinweis', pruefeListeDetail(LISTE, VOLL, LOKAL.replace('data-pl-hinweis="gemessen"', 'data-pl-hinweis="ungemessen"'))],
    ['Reiter fehlt im Register', pruefeHinweis(INDEX.replace('id="faehigkeiten-reiter-plugins"', 'id="x"'), WOERTERBUECHER, GERENDERT)],
    ['Block der eingebauten fehlt', pruefeEingebaut(LISTE.replace(/<section class="pl-eingebaut"[\s\S]*<\/section>/, ''), REFERENZ_VERSION)],
    ['leer: eingebaute verschwinden', pruefeLeerUnlesbar(LEER.replaceAll('data-pl-eingebaut=', 'data-x='), UNLESBAR, 'Exit 1: Gate')],
    ['Reiterwahl ruft zweimal ab', pruefeSteuerung({ ...zaehlung, nachReiterwahl: 2 })],
    ['späte Antwort übernommen', pruefeSteuerung({ ...zaehlung, nachSpaeterAntwort: 'ok' })],
    ['Wrapper im Poll', pruefeQuelltext([...DATEIEN, { pfad: 'public/leitstand/zustand.js', text: "import { ladePluginsNeu } from './views/plugins.js'\nladePluginsNeu()" }], CAP, VIEW)],
    ['Timer in der View', pruefeQuelltext(DATEIEN, CAP, `${VIEW}\nsetInterval(ladePluginsNeu, 5000)\n`)],
    ['Neuladen nach Projektwechsel', pruefeQuelltext(DATEIEN, CAP, VIEW.replace('if (aktuell()) await steuerung.neuLaden({ still: true })', 'await steuerung.neuLaden({ still: true })'))],
    ['setTimeout außerhalb von warteAufPruefung', pruefeQuelltext(DATEIEN, CAP, `${VIEW}\nsetTimeout(ladePluginsNeu, 5000)\n`)],
    ['Plugins laden im Warten auf den Prüflauf', pruefeQuelltext(DATEIEN, CAP, VIEW.replace('async function warteAufPruefung(laufId, gen) {', 'async function warteAufPruefung(laufId, gen) {\n  void holePlugins()'))],
    ['erneuter Klick lädt', pruefeQuelltext(DATEIEN, CAP.replace('if ((neuGewaehlt || pluginsNichtGeladen()) && reiter?.id === PLUGINS_REITER)', 'if (reiter?.id === PLUGINS_REITER)'), VIEW)],
    ['Abruf beim Erzeugen', pruefeSteuerung({ ...zaehlung, nachErzeugen: 1 })],
    ['Abruf beim Wählen', pruefeSteuerung({ ...zaehlung, nachWaehlen: 1 })],
    ['holePlugins im Poll', pruefeQuelltext([...DATEIEN, { pfad: 'public/leitstand/zustand.js', text: "fetch('/api/plugins')" }], CAP, VIEW)],
    ['ladeCapabilities lädt Plugins', pruefeQuelltext(DATEIEN, CAP.replace('  void ladeSammlung()\n', '  void ladeSammlung()\n  ladePluginsNeu()\n'), VIEW)],
    ['Neu laden ohne Reiter', pruefeQuelltext(DATEIEN, CAP.replace('if (pluginsReiterGewaehlt()) ladePluginsNeu()', 'ladePluginsNeu()'), VIEW)],
    ['Projektwechsel lädt', pruefeQuelltext(DATEIEN, CAP.replace('    setzePluginsZurueck()\n', '    setzePluginsZurueck()\n    ladePluginsBeiReiterwahl()\n'), VIEW)],
    ['initPlugins ruft ab', pruefeQuelltext(DATEIEN, CAP, VIEW.replace('  zeichne(steuerung.zustand())\n', '  zeichne(steuerung.zustand())\n  void steuerung.beiReiterwahl()\n'))],
    ['starteWorkflowSchritt( siebenmal', pruefeServer(`${SERVER}\nstarteWorkflowSchritt(`)],
  ]
  for (const [name, ergebnis] of rot) if (ergebnis.length === 0) befunde.push(`(h) Rotfall '${name}' wird nicht erkannt`)
  if (befunde.length === vor) console.log(`✓ (h) Rot-Selbsttest: ${rot.length} verfälschte Eingänge erkannt.`)
}

if (befunde.length > 0) {
  console.error(`\n✗ ${befunde.length} Befund(e):`)
  for (const befund of befunde) console.error(`  - ${befund}`)
  process.exit(1)
}
console.log('\n✓ Keine Befunde.')
