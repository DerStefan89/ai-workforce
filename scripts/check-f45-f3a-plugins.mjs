/**
 * Datei: scripts/check-f45-f3a-plugins.mjs
 *
 * Zweck: Gate F45 F-3a-1 (Plugin-Bestand aus Stefans Claude Code lesen; Plan features/F45/plan-f3a.md v2 mit Auflagen des
 * Delta-Advisor-Passes). Grün
 * (a) Leser gegen den Fixture-Bestand (scripts/_plugin-fixture.ts: ein Plugin mit allen Bestandteilen inkl. Hook in
 *     plugin.json, eins nur mit Skill, ein @builtin, ein kaputtes): erwartete Liste, Bestandteile, Pins und Risiken exakt;
 *     Hash unabhängig von .in_use/ und gleich berechneInhaltHash ohne Ausschluss-Ordner (N1); eine Junction im Ordner →
 *     kein Hash mit Grund.
 * (b) Kein Schreibzugriff: lstat-Momentaufnahme (Dateien UND Ordner, Art, mtime, Größe) des simulierten ~/.claude vor/nach
 *     Leser und Route gleich.
 * (c) Route GET /api/plugins über den echten Handler: ok mit instanz_pfad, Geheimnisse maskiert (Hook-Befehl, eigenes
 *     args-Element hinter '--api-key', url-Parameter); Leerbestand '[]' → ok ohne Plugins; Läufer Exit 1 /
 *     kein JSON / Zeitgrenze (über listenErgebnisAusProzess mit halbem stdout) → 200 status 'fehler' mit Grund; POST → 405; geteilter Abruf: zwei gleichzeitige GETs = ein
 *     Läufer-Aufruf, der nächste GET danach ein neuer, ein Fehler wird nicht gemerkt; der echte Läufer startet mit cwd =
 *     Projektordner und lehnt ein Startziel ab, das nicht die Claude-CLI ist.
 * (d) Lauf unverändert (F-3a ändert keinen Lauf; seit F-3b-2 nennt nur src/claude-code-gateway '--plugin-dir', gesetzt aus
 *     pluginDirs; ohne pluginDirs bleibt das Argv ohne): kein '--plugin-dir' außerhalb des Gateways in
 *     src/**\/*.ts; baueAufruf() ohne '--plugin-dir'; pruefeInitZeile weist init.plugins ≠ [] weiter ab; kein Import von
 *     src/claude-plugins in Gateway, Fähigkeiten-Start, Execution-Controller und src/ressourcen (Ort-B-Start).
 * (e) starteWorkflowSchritt( genau 6-mal im Server.
 * Rot (Selbsttest, kalibriert)
 * (f) Jede Prüfung aus (a)–(e) schlägt bei einem verfälschten Eingang an.
 *
 * Wird aufgerufen von: npm run check
 *
 * Wichtig: Kein Netz, kein CLI-Start (der echte Läufer wird nur mit einem Startziel geprüft, das vor dem Start abgelehnt
 * wird). Fixture unter tmpdir, nie unter dem echten ~/.claude. Die Prüffunktionen sind rein und nehmen ihre Eingänge als
 * Werte — so kann (f) jede mit einem verfälschten Eingang aufrufen.
 */

import { cpSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { berechnePluginHash, lesePluginBestand, listenErgebnisAusProzess } from '../src/claude-plugins/index.ts'
import { baueAufruf, pruefeInitZeile } from '../src/claude-code-gateway/index.ts'
import { berechneInhaltHash } from '../src/ressourcen/skill-dateien.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'
import { FIXTURE_ARG_GEHEIMNIS, FIXTURE_GEHEIMNIS, FIXTURE_URL_GEHEIMNIS, legePluginFixtureAn } from './_plugin-fixture.ts'
import { echterPluginListenLaeufer } from './leitstand/routen-plugins.mjs'
import { erzeugeRequestHandler } from './leitstand-server.mjs'

const befunde = []
console.log('\n=== F45-F-3a-Plugins-Check ===\n')

const SATZ = JSON.parse(readFileSync('startvorlagen/ai-workforce.json', 'utf8')).werkzeugsaetze.schreibend.erlaubte_werkzeuge
const REFERENZ = { ok: true, referenz: { cli_version: 'gate', agents: ['claude'], plugins: ['cc-plugin-telemetry@builtin'], plugin_skills: [] } }

/** Erwartete Zusammenfassung des Fixture-Bestands (Liste, Bestandteile, Pins, Risiken). */
const ERWARTET = {
  plugins: ['voll@markt', 'nur-skill@markt', 'kaputt@markt'],
  eingebaut: ['cc-plugin-telemetry@builtin', 'cc-plugin-fixture@builtin'],
  voll: {
    zaehlung: { skills: 1, agents: 1, commands: 1, hooks: 2, mcp: 4, lsp: 1 },
    hooks: ['SessionStart@hooks/hooks.json', 'PostToolUse@plugin.json'],
    pins: ['latest:ungepinnt', 'fest:gepinnt', 'fern:entfernt', 'lokal:anderer_befehl'],
    risiken: [
      'hook_befehl hook:SessionStart',
      'hook_befehl hook:PostToolUse',
      'mcp_ungepinnt mcp:latest',
      'mcp_entfernt mcp:fern',
      'rechte_ausserhalb skill:s-eins',
      'externe_wirkung skill:s-eins',
      'rechte_ausserhalb command:c-eins',
      'externe_wirkung command:c-eins',
    ],
    lizenz: true,
  },
  nurSkill: { zaehlung: { skills: 1, agents: 0, commands: 0, hooks: 0, mcp: 0, lsp: 0 }, risiken: [] },
  kaputtFehler: 2,
}

// ─── Reine Prüffunktionen ─────────────────────────────────────────────────────

/** Zählung je Bestandteil-Art. */
const zaehle = (b) => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.length]))
const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b)

/**
 * (a) Vergleicht einen Bestand mit ERWARTET.
 * @param bestand - Ergebnis von lesePluginBestand
 * @returns Befunde
 */
function pruefeBestand(bestand) {
  const b = []
  if (bestand?.status !== 'ok') return [`(a) Bestand nicht ok: ${bestand?.grund ?? '?'}`]
  const ids = bestand.plugins.map((p) => p.id)
  if (!gleich(ids, ERWARTET.plugins)) b.push(`(a) Plugins ${ids.join(', ')} statt ${ERWARTET.plugins.join(', ')}`)
  const eingebaut = bestand.eingebaut.map((e) => e.id)
  if (!gleich(eingebaut, ERWARTET.eingebaut)) b.push(`(a) eingebaut ${eingebaut.join(', ')} statt ${ERWARTET.eingebaut.join(', ')}`)
  const [voll, nurSkill, kaputt] = bestand.plugins
  if (voll !== undefined) {
    if (!gleich(zaehle(voll.bestandteile), ERWARTET.voll.zaehlung)) b.push(`(a) voll: Bestandteile ${JSON.stringify(zaehle(voll.bestandteile))}`)
    const hooks = voll.bestandteile.hooks.map((h) => `${h.ereignis}@${h.quelle}`)
    if (!gleich(hooks, ERWARTET.voll.hooks)) b.push(`(a) voll: Hooks ${hooks.join(', ')} (Hook in plugin.json fehlt?)`)
    const pins = voll.bestandteile.mcp.map((m) => `${m.name}:${m.pin}`)
    if (!gleich(pins, ERWARTET.voll.pins)) b.push(`(a) voll: Pins ${pins.join(', ')}`)
    const risiken = voll.risiken.map((r) => `${r.art} ${r.bestandteil}`)
    if (!gleich(risiken, ERWARTET.voll.risiken)) b.push(`(a) voll: Risiken ${risiken.join(' | ')}`)
    if (voll.lizenz_datei !== ERWARTET.voll.lizenz) b.push('(a) voll: Lizenzdatei nicht erkannt')
    if (!/^[0-9a-f]{64}$/.test(voll.inhalt_hash ?? '')) b.push('(a) voll: kein Inhalts-Hash')
    if (/geheim-im-header|geheim-in-env/.test(JSON.stringify(voll))) b.push('(a) voll: env/headers ausgeliefert')
  }
  if (nurSkill !== undefined && (!gleich(zaehle(nurSkill.bestandteile), ERWARTET.nurSkill.zaehlung) || nurSkill.risiken.length !== 0)) b.push('(a) nur-skill: Bestandteile/Risiken weichen ab')
  if (kaputt !== undefined && kaputt.fehler.length !== ERWARTET.kaputtFehler) b.push(`(a) kaputt: ${kaputt.fehler.length} Teilfehler statt ${ERWARTET.kaputtFehler}`)
  return b
}

/**
 * (a) Hash: unabhängig von .in_use/, gleich berechneInhaltHash ohne Ausschluss-Ordner.
 * @param hashMit - Hash mit .in_use/.git
 * @param hashMitNeuerMarke - Hash nach neuer .in_use-Datei
 * @param referenz - berechneInhaltHash des Ordners ohne .in_use/.git
 * @returns Befunde
 */
function pruefeHash(hashMit, hashMitNeuerMarke, referenz) {
  const b = []
  if (hashMit !== hashMitNeuerMarke) b.push('(a) Hash hängt von .in_use/ ab')
  if (hashMit !== referenz) b.push('(a) Hash weicht von berechneInhaltHash ab (N1)')
  return b
}

/**
 * lstat-Momentaufnahme eines Ordners (Dateien UND Ordner: Art, mtime, Größe).
 * @param wurzel - Ordner
 * @returns Map Pfad → Zeile
 */
function momentaufnahme(wurzel) {
  const m = new Map()
  const gehe = (p) => {
    const s = lstatSync(p)
    m.set(p, `${s.isDirectory() ? 'd' : 'f'} ${s.mtimeMs} ${s.isDirectory() ? '' : s.size}`)
    if (s.isDirectory()) for (const e of readdirSync(p)) gehe(join(p, e))
  }
  gehe(wurzel)
  return m
}

/**
 * (b) Vergleicht zwei Momentaufnahmen.
 * @param name - Fallname
 * @param vor - Map
 * @param nach - Map
 * @returns Befunde
 */
function pruefeUnberuehrt(name, vor, nach) {
  const d = []
  for (const [k, v] of vor) if (nach.get(k) !== v) d.push(k)
  for (const k of nach.keys()) if (!vor.has(k)) d.push(k)
  return d.length === 0 ? [] : [`(b) ${name}: simuliertes ~/.claude verändert (${d.slice(0, 3).join(', ')})`]
}

/**
 * (c) Prüft eine Fehlerantwort der Route.
 * @param name - Fall
 * @param status - HTTP-Status
 * @param koerper - JSON
 * @returns Befunde
 */
function pruefeFehlerAntwort(name, status, koerper) {
  return status === 200 && koerper?.status === 'fehler' && typeof koerper.grund === 'string' && koerper.grund !== '' ? [] : [`(c) ${name}: erwartet 200 status 'fehler' mit Grund, war ${status} ${JSON.stringify(koerper).slice(0, 120)}`]
}

/**
 * (c) Prüft die ok-Antwort: instanz_pfad, Maskierung aller drei Geheimnisse, Hook-Befehl vorhanden.
 * @param koerper - JSON
 * @param projekt - erwarteter Projektpfad
 * @returns Befunde
 */
function pruefeOkAntwort(koerper, projekt) {
  const b = []
  if (koerper?.status !== 'ok') return [`(c) GET /api/plugins nicht ok: ${JSON.stringify(koerper).slice(0, 160)}`]
  if (koerper.instanz_pfad !== projekt) b.push('(c) instanz_pfad fehlt oder falsch')
  const text = JSON.stringify(koerper)
  for (const [wo, g] of [['Hook-Befehl/Risiko-Text', FIXTURE_GEHEIMNIS], ['args-Element', FIXTURE_ARG_GEHEIMNIS], ['url', FIXTURE_URL_GEHEIMNIS]]) if (text.includes(g)) b.push(`(c) Geheimnis in ${wo} nicht maskiert`)
  if (!text.includes('--token') || !koerper.plugins?.[0]?.risiken?.some((r) => r.art === 'hook_befehl')) b.push('(c) Hook-Befehl fehlt in der Antwort')
  return b
}

/**
 * (c) Leerbestand: ok ohne Plugins (die CLI liefert ohne Plugins '[]', gemessen 14.10.2026).
 * @param koerper - JSON
 * @returns Befunde
 */
function pruefeLeer(koerper) {
  return koerper?.status === 'ok' && Array.isArray(koerper.plugins) && koerper.plugins.length === 0 ? [] : [`(c) Leerbestand: erwartet ok ohne Plugins, war ${JSON.stringify(koerper).slice(0, 120)}`]
}

/**
 * (a) Junction im Plugin-Ordner: kein Hash, Grund nennt den Link (Code-Review 14; Junction geht unter Windows ohne Adminrechte).
 * @param ergebnis - berechnePluginHash-Ergebnis oder null (Junction nicht anlegbar)
 * @returns Befunde
 */
function pruefeJunction(ergebnis) {
  if (ergebnis === null) return ['(a) Junction nicht anlegbar — Fall nicht geprüft']
  return ergebnis.hash === null && /Symlink\/Junction/.test(ergebnis.grund ?? '') ? [] : ['(a) Junction im Plugin-Ordner ergibt trotzdem einen Hash']
}

/**
 * (c) Echter Läufer: startet über starteProzess mit Zeitgrenze, stdin leer und cwd; fremdes Startziel wird abgelehnt.
 * @param quelle - Text von scripts/leitstand/routen-plugins.mjs
 * @param abgelehnt - Ergebnis des Läufers mit einem Startziel, das nicht die Claude-CLI ist
 * @returns Befunde
 */
function pruefeLaeufer(quelle, abgelehnt) {
  const b = []
  if (abgelehnt?.ok !== false || !/nicht die Claude-CLI/.test(abgelehnt.grund)) b.push('(c) echter Läufer startet ein Programm, das nicht die Claude-CLI ist')
  if (!/starteProzess\(startziel, \[\.\.\.PLUGIN_LISTE_ARGUMENTE\], \{ zeitgrenzeMs: PLUGIN_LISTE_ZEITGRENZE_MS, stdinLeer: true, cwd \}\)/.test(quelle)) b.push('(c) echter Läufer nicht über starteProzess mit Zeitgrenze, stdin leer und cwd')
  return b
}

/**
 * (c) Geteilter Abruf: Zählung der Läufer-Aufrufe.
 * @param gleichzeitig - Aufrufe nach zwei gleichzeitigen GETs
 * @param danach - Aufrufe nach einem weiteren GET
 * @param nachFehler - Aufrufe nach Fehler + erneutem GET (Differenz)
 * @returns Befunde
 */
function pruefeGeteilt(gleichzeitig, danach, nachFehler) {
  const b = []
  if (gleichzeitig !== 1) b.push(`(c) zwei gleichzeitige GETs → ${gleichzeitig} Läufer-Aufrufe statt 1`)
  if (danach !== 2) b.push(`(c) GET nach Abschluss → ${danach} Aufrufe gesamt statt 2 (Ergebnis gemerkt?)`)
  if (nachFehler !== 2) b.push(`(c) Fehler gemerkt: nach Fehler und erneutem GET ${nachFehler} statt 2 neue Aufrufe`)
  return b
}

/**
 * (d) Lauf unverändert.
 * @param quellen - [{ pfad, text }] aller src/**\/*.ts
 * @param argv - baueAufruf()-Tokens
 * @param initGrund - pruefeInitZeile-Ergebnis für init.plugins ≠ []
 * @returns Befunde
 */
function pruefeLaufUnveraendert(quellen, argv, initGrund) {
  const b = []
  // F45 F-3b-2: baueAufruf setzt --plugin-dir aus pluginDirs (Gateway, Typen, Test) — überall sonst bleibt es ein Befund.
  const mitPluginDir = quellen.filter((q) => q.text.includes('--plugin-dir') && !/src[\\/]claude-code-gateway[\\/]/.test(q.pfad)).map((q) => q.pfad)
  if (mitPluginDir.length > 0) b.push(`(d) '--plugin-dir' in ${mitPluginDir.join(', ')}`)
  if (argv.includes('--plugin-dir')) b.push('(d) baueAufruf() setzt --plugin-dir')
  if (initGrund === null || !/init\.plugins nicht leer/.test(initGrund)) b.push('(d) pruefeInitZeile lässt init.plugins ≠ [] zu')
  // Code-Review 15: nur Importe (nicht jede Erwähnung wie claude-plugins-official), dazu src/ressourcen (Start an Ort B).
  const lauf = quellen.filter((q) => /src[\\/](claude-code-gateway|faehigkeiten|execution-controller|ressourcen)[\\/]/.test(q.pfad) && /from\s+['"][^'"]*claude-plugins\//.test(q.text)).map((q) => q.pfad)
  if (lauf.length > 0) b.push(`(d) Lauf-Code importiert src/claude-plugins: ${lauf.join(', ')}`)
  return b
}

/**
 * (e) Quelltext des Servers.
 * @param server - Text
 * @returns Befunde
 */
function pruefeServer(server) {
  const n = server.split('starteWorkflowSchritt(').length - 1
  return n === 6 ? [] : [`(e) starteWorkflowSchritt( ${n}-mal statt 6-mal`]
}

// ─── (a) + (b) Leser ──────────────────────────────────────────────────────────
const wurzel = mkdtempSync(join(tmpdir(), 'f45-f3a-gate-'))
let BESTAND = null
let HASHES = null
let SNAP = null
let JUNCTION = null
let ABGELEHNT = null
let ROUTEN_QUELLE = ''
try {
  const f = legePluginFixtureAn(wurzel)
  const vor = momentaufnahme(f.claudeOrdner)
  BESTAND = await lesePluginBestand({ liste: async () => ({ ok: true, stdout: f.listeJson }), claudeOrdner: f.claudeOrdner, werkzeugsatz: SATZ, eingebaut: REFERENZ })
  const nachLeser = momentaufnahme(f.claudeOrdner)
  const vorA = befunde.length
  befunde.push(...pruefeBestand(BESTAND))
  if (befunde.length === vorA) console.log('✓ (a) Fixture: 3 Plugins, 2 eingebaute, Bestandteile/Pins/Risiken exakt (Hook in plugin.json erkannt), kaputtes Plugin mit 2 Teilfehlern.')

  // Hash: Kopie ohne .in_use/.git als Referenz (eigene Kopie, damit das simulierte ~/.claude unberührt bleibt).
  const ohne = join(wurzel, 'ohne')
  cpSync(f.pfade.voll, ohne, { recursive: true })
  raeumeVerzeichnis(join(ohne, '.in_use'))
  raeumeVerzeichnis(join(ohne, '.git'))
  const hashMit = (await berechnePluginHash(f.pfade.voll)).hash
  const kopie = join(wurzel, 'kopie')
  cpSync(f.pfade.voll, kopie, { recursive: true })
  writeFileSync(join(kopie, '.in_use', '999'), 'neue marke')
  HASHES = { hashMit, hashNeu: (await berechnePluginHash(kopie)).hash, referenz: berechneInhaltHash(ohne) }
  const vorH = befunde.length
  befunde.push(...pruefeHash(HASHES.hashMit, HASHES.hashNeu, HASHES.referenz))
  if (befunde.length === vorH) console.log('✓ (a) Hash unabhängig von .in_use/ und gleich berechneInhaltHash ohne .git/.in_use (N1).')
  // Junction (Ordner-Link, unter Windows ohne Adminrechte anlegbar) in einer eigenen Kopie.
  mkdirSync(join(wurzel, 'link-ziel'))
  try {
    symlinkSync(join(wurzel, 'link-ziel'), join(ohne, 'skills', 'link'), 'junction')
    JUNCTION = await berechnePluginHash(ohne)
  } catch (fehler) {
    console.error(`[check-f45-f3a] Junction nicht anlegbar: ${fehler.message}`)
  }
  const vorJ = befunde.length
  befunde.push(...pruefeJunction(JUNCTION))
  if (befunde.length === vorJ) console.log('✓ (a) Junction im Plugin-Ordner → kein Hash, Grund nennt den Link.')

  // ─── (c) Route ────────────────────────────────────────────────────────────
  const projekt = join(wurzel, 'projekt')
  let aufrufe = 0
  let modus = 'ok'
  let freigabe = null
  const liste = async () => {
    aufrufe++
    if (freigabe !== null) await freigabe
    if (modus === 'exit') return { ok: false, grund: 'claude plugin list endete mit Exit 1: kaputt' }
    if (modus === 'kein-json') return { ok: true, stdout: 'Fehler: nicht angemeldet' }
    if (modus === 'zeitgrenze') return listenErgebnisAusProzess({ stdout: '[{"id":"voll@markt","installPath":', stderr: '', exitCode: null, startfehler: null, beendigungsart: 'TIMEOUT' })
    if (modus === 'leer') return { ok: true, stdout: '[]' }
    return { ok: true, stdout: f.listeJson }
  }
  const basis = join(wurzel, 'kontrollzustand')
  const server = createServer(erzeugeRequestHandler({ basisVerzeichnis: basis, repoWurzel: projekt, installWurzel: process.cwd(), pluginListe: liste, pluginClaudeOrdner: f.claudeOrdner }))
  // Code-Review 16: Ankünfte zählen statt fester Wartezeit (geteilter Abruf).
  let ankuenfte = 0
  server.on('request', () => {
    ankuenfte++
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const url = `http://127.0.0.1:${server.address().port}/api/plugins`
  const hole = async () => {
    const r = await fetch(url)
    return { status: r.status, koerper: await r.json() }
  }
  try {
    const vorC = befunde.length
    befunde.push(...pruefeOkAntwort((await hole()).koerper, projekt))
    modus = 'leer'
    befunde.push(...pruefeLeer((await hole()).koerper))
    for (const m of ['exit', 'kein-json', 'zeitgrenze']) {
      modus = m
      const { status, koerper } = await hole()
      befunde.push(...pruefeFehlerAntwort(m, status, koerper))
    }
    modus = 'ok'
    const post = await fetch(url, { method: 'POST', body: '{}' })
    if (post.status !== 405) befunde.push(`(c) POST → ${post.status} statt 405`)
    // Geteilter Abruf.
    aufrufe = 0
    let loese
    freigabe = new Promise((r) => {
      loese = r
    })
    ankuenfte = 0
    const zwei = Promise.all([hole(), hole()])
    const frist = Date.now() + 10_000
    while ((ankuenfte < 2 || aufrufe < 1) && Date.now() < frist) await new Promise((r) => setTimeout(r, 5))
    for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r))
    loese()
    freigabe = null
    await zwei
    const gleichzeitig = aufrufe
    await hole()
    const danach = aufrufe
    modus = 'exit'
    aufrufe = 0
    await hole()
    modus = 'ok'
    await hole()
    befunde.push(...pruefeGeteilt(gleichzeitig, danach, aufrufe))
    if (befunde.length === vorC) console.log('✓ (c) GET /api/plugins: ok mit instanz_pfad, drei Geheimnisse maskiert, Leerbestand ok; Exit 1/kein JSON/Zeitgrenze (halbes stdout) → 200 mit Grund; POST 405; geteilter Abruf (1 Aufruf für 2 GETs, danach neu, Fehler nicht gemerkt).')
  } finally {
    await new Promise((r) => server.close(r))
  }
  // Echter Läufer: Startziel, das nicht die Claude-CLI ist, wird vor dem Start abgelehnt (kein Prozess).
  const vorL = befunde.length
  ABGELEHNT = await echterPluginListenLaeufer([process.execPath], projekt)()
  ROUTEN_QUELLE = readFileSync('scripts/leitstand/routen-plugins.mjs', 'utf8')
  befunde.push(...pruefeLaeufer(ROUTEN_QUELLE, ABGELEHNT))
  if (befunde.length === vorL) console.log('✓ (c) Echter Läufer: über starteProzess mit cwd = Projektordner; fremdes Startziel abgelehnt.')

  SNAP = { vor, nachLeser, nachRoute: momentaufnahme(f.claudeOrdner) }
  const vorB = befunde.length
  befunde.push(...pruefeUnberuehrt('Leser', SNAP.vor, SNAP.nachLeser), ...pruefeUnberuehrt('Route', SNAP.vor, SNAP.nachRoute))
  if (befunde.length === vorB) console.log(`✓ (b) Simuliertes ~/.claude unverändert (${SNAP.vor.size} Einträge, Dateien und Ordner mit mtime) nach Leser und Route.`)
} finally {
  raeumeVerzeichnis(wurzel)
}

// ─── (d) Lauf unverändert ─────────────────────────────────────────────────────
const QUELLEN = []
const sammle = (p) => {
  for (const e of readdirSync(p, { withFileTypes: true })) {
    const voll = join(p, e.name)
    if (e.isDirectory()) sammle(voll)
    else if (e.name.endsWith('.ts')) QUELLEN.push({ pfad: voll, text: readFileSync(voll, 'utf8') })
  }
}
sammle('src')
const ARGV = baueAufruf({ modell: 'm', werkzeugsatz: { modus: 'DEKLARIERT', erlaubte_werkzeuge: SATZ }, prompt: 'p', ortB: { addDirs: ['x'], settings: '{}' } })
const INIT = { skills: [], slash_commands: [], tools: ['Read'], mcp_servers: [], plugins: [{ name: 'p', source: 'p@m' }] }
const INIT_GRUND = pruefeInitZeile(INIT, { skills: [], mcpServer: [], slashCommandsReferenz: new URL('../src/claude-code-gateway/slash-commands-referenz.json', import.meta.url) })
{
  const vor = befunde.length
  befunde.push(...pruefeLaufUnveraendert(QUELLEN, ARGV, INIT_GRUND))
  if (befunde.length === vor) console.log(`✓ (d) Lauf unverändert: kein --plugin-dir in ${QUELLEN.length} src-Dateien und im Argv, init.plugins ≠ [] bleibt Verstoß, kein Import von src/claude-plugins im Lauf-Code.`)
}

// ─── (e) Server ───────────────────────────────────────────────────────────────
const SERVER = readFileSync('scripts/leitstand-server.mjs', 'utf8')
{
  const vor = befunde.length
  befunde.push(...pruefeServer(SERVER))
  if (befunde.length === vor) console.log('✓ (e) starteWorkflowSchritt( genau 6-mal im Server.')
}

// ─── (f) Rot-Selbsttest ───────────────────────────────────────────────────────
{
  const vor = befunde.length
  const ok = BESTAND?.status === 'ok' ? BESTAND : null
  const mitVoll = (aendern) => (ok === null ? { status: 'fehler', grund: 'kein Bestand' } : { ...ok, plugins: [aendern(structuredClone(ok.plugins[0])), ...ok.plugins.slice(1)] })
  const snapGeaendert = SNAP === null ? new Map() : new Map([...SNAP.vor].map(([k, v], i) => [k, i === 1 ? `${v}1` : v]))
  const snapNeu = SNAP === null ? new Map() : new Map([...SNAP.vor, [join('x', '.in_use', 'neu'), 'f 1 1']])
  const rot = [
    ['Hook in plugin.json fehlt', pruefeBestand(mitVoll((p) => ({ ...p, bestandteile: { ...p.bestandteile, hooks: p.bestandteile.hooks.slice(0, 1) } })))],
    ['Pin-Regel @latest = gepinnt', pruefeBestand(mitVoll((p) => ({ ...p, bestandteile: { ...p.bestandteile, mcp: p.bestandteile.mcp.map((m) => (m.name === 'latest' ? { ...m, pin: 'gepinnt' } : m)) } })))],
    ['Hook-Risiko fehlt', pruefeBestand(mitVoll((p) => ({ ...p, risiken: p.risiken.filter((r) => r.art !== 'hook_befehl') })))],
    ['externe Wirkung fehlt', pruefeBestand(mitVoll((p) => ({ ...p, risiken: p.risiken.filter((r) => r.art !== 'externe_wirkung') })))],
    ['env ausgeliefert', pruefeBestand(mitVoll((p) => ({ ...p, env: { SECRET: 'geheim-in-env' } })))],
    ['@builtin als Plugin', pruefeBestand(ok === null ? null : { ...ok, eingebaut: ok.eingebaut.slice(0, 1) })],
    ['Hash mit .in_use', pruefeHash(HASHES?.hashMit ?? 'a', 'b', HASHES?.referenz ?? 'a')],
    ['Hash ≠ berechneInhaltHash', pruefeHash('a', 'a', 'b')],
    ['Datei im simulierten ~/.claude berührt', pruefeUnberuehrt('rot', SNAP?.vor ?? new Map([['a', '1']]), snapGeaendert.size > 0 ? snapGeaendert : new Map([['a', '2']]))],
    ['neuer Eintrag im simulierten ~/.claude', pruefeUnberuehrt('rot', SNAP?.vor ?? new Map(), snapNeu.size > 0 ? snapNeu : new Map([['a', '1']]))],
    ['kaputt ohne Teilfehler', pruefeBestand(ok === null ? null : { ...ok, plugins: [...ok.plugins.slice(0, 2), { ...ok.plugins[2], fehler: [] }] })],
    ['Junction ergibt Hash', pruefeJunction({ hash: 'a'.repeat(64), grund: null })],
    ['Junction nicht geprüft', pruefeJunction(null)],
    ['Route ohne Grund', pruefeFehlerAntwort('rot', 200, { status: 'fehler' })],
    ['Leerbestand als Fehler', pruefeLeer({ status: 'fehler', grund: 'x' })],
    ['instanz_pfad falsch', pruefeOkAntwort({ status: 'ok', instanz_pfad: 'anders', plugins: [{ risiken: [{ art: 'hook_befehl', text: '--token ••••' }] }] }, 'p')],
    ['Hook-Befehl fehlt', pruefeOkAntwort({ status: 'ok', instanz_pfad: 'p', plugins: [{ risiken: [] }] }, 'p')],
    ['args-Geheimnis unmaskiert', pruefeOkAntwort({ status: 'ok', instanz_pfad: 'p', plugins: [{ risiken: [{ art: 'hook_befehl', text: '--token ••••' }], args: ['--api-key', FIXTURE_ARG_GEHEIMNIS] }] }, 'p')],
    ['url-Geheimnis unmaskiert', pruefeOkAntwort({ status: 'ok', instanz_pfad: 'p', plugins: [{ risiken: [{ art: 'hook_befehl', text: '--token ••••' }], url: `x?access_token=${FIXTURE_URL_GEHEIMNIS}` }] }, 'p')],
    ['Läufer startet fremdes Programm', pruefeLaeufer(ROUTEN_QUELLE, { ok: true, stdout: '[]' })],
    ['Läufer ohne cwd', pruefeLaeufer(ROUTEN_QUELLE.replace('stdinLeer: true, cwd }', 'stdinLeer: true }'), ABGELEHNT)],
    ['Route 500', pruefeFehlerAntwort('rot', 500, { status: 'fehler', grund: 'x' })],
    ['Geheimnis unmaskiert', pruefeOkAntwort({ status: 'ok', instanz_pfad: 'p', plugins: [{ risiken: [{ art: 'hook_befehl', text: `--token ${FIXTURE_GEHEIMNIS}` }] }] }, 'p')],
    ['geteilter Abruf läuft doppelt', pruefeGeteilt(2, 3, 2)],
    ['Fehler gemerkt', pruefeGeteilt(1, 2, 1)],
    ['--plugin-dir in src', pruefeLaufUnveraendert([...QUELLEN, { pfad: 'src/x.ts', text: "args.push('--plugin-dir', d)" }], ARGV, INIT_GRUND)],
    ['--plugin-dir im Argv', pruefeLaufUnveraendert(QUELLEN, [...ARGV, '--plugin-dir', 'x'], INIT_GRUND)],
    ['init.plugins ≠ [] zugelassen', pruefeLaufUnveraendert(QUELLEN, ARGV, null)],
    ['Lauf-Code importiert claude-plugins', pruefeLaufUnveraendert([...QUELLEN, { pfad: join('src', 'faehigkeiten', 'start.ts'), text: "import { x } from '../claude-plugins/index.ts'" }], ARGV, INIT_GRUND)],
    ['starteWorkflowSchritt( siebenmal', pruefeServer(`${SERVER}\nstarteWorkflowSchritt(`)],
  ]
  for (const [name, ergebnis] of rot) if (ergebnis.length === 0) befunde.push(`(f) Rotfall '${name}' wird nicht erkannt`)
  if (befunde.length === vor) console.log(`✓ (f) Rot-Selbsttest: ${rot.length} verfälschte Eingänge erkannt.`)
}

if (befunde.length > 0) {
  console.error(`\n✗ ${befunde.length} Befund(e):`)
  for (const befund of befunde) console.error(`  - ${befund}`)
  process.exit(1)
}
console.log('\n✓ Keine Befunde.')
