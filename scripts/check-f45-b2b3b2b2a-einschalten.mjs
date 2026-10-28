#!/usr/bin/env node
/**
 * Datei: scripts/check-f45-b2b3b2b2a-einschalten.mjs
 *
 * Zweck: Gate für F45 B2b-3b-2b-2a-1 „Rückfrage-Kanal: Einschalten (Opt-in), Server/Evaluator“ (features/F45/plan-b2b3b2b2a-v2.md,
 * Advisor features/F45/advisor-b2b3b2b2a.md). Prüft:
 * (o1) Schalter (seit F45 B2b-3b-2b-2b-2b-1 Standard an): fehlt oder LEITSTAND_RUECKFRAGE=1 mit gültigem Port ⇒ an; 0 ⇒ aus; jeder
 *      andere Wert ⇒ aus mit Grund (fail-closed); Port 0 ⇒ aus und rueckfrageOptionFuer liefert {} (B3);
 *      Option je Instanz (Workforce …/api, Projekt …/api/projekte/<id>); Startzeile an/aus.
 * (o2) Echter Start (Server, Arbeitsordner, Ausführung): Option aus LEITSTAND_RUECKFRAGE=0 ⇒ kein Kanal, kein --permission-prompt-tool,
 *      Auftragstext ohne Regelzeile; aus leerer Umgebung und aus LEITSTAND_RUECKFRAGE=1 ⇒ Kanal mit url = API-Basis.
 * (r)  Regelzeile frage_stefan: mit Kanal genau einmal im Auftragstext, ohne Kanal nicht (Punkt 4).
 * (o3) Quelltext: CLI-Block und baueProjektHandlerMap setzen rueckfrage nur über rueckfrageOptionFuer (gemeinsame Regel
 *      scripts/_rueckfrage-aus-pruefung.mjs, mit Rotfall je Teilregel); Startzeile im listen-Rückruf. Seit F45 W2b-1 ohne Hash-Pin
 *      der Regeldatei (früher in f45-b2b3b2b2a3/-b2b3b2b2b1 (w)) — DEKLARIERT: eine neue Form in ERLAUBT_HANDLER/ERLAUBT_KARTE
 *      fällt keinem Rotfall auf.
 * (d)  URL-Basis über den echten erzeugeMultiProjektDispatcher: das echte MCP-Skript fragt und wartet (mehrere Poll-Fenster) für die
 *      Workforce-Instanz (…/api) und eine Projektinstanz (…/api/projekte/p1); die Rückfrage steht nur in der Liste der eigenen
 *      Instanz, die Antwort geht über …/projekte/p1/rueckfragen/<id>/antwort; Token einer anderen Instanz ⇒ deny. Rot auf main:
 *      das Skript postet /api/api/… ⇒ 404 ⇒ deny.
 * (i)  Init-Gate Projektweg: loeseAusfuehrungsEingabenAuf mit Fähigkeiten-Kontext (Ort-B) und Kanal ⇒ ortBLauf.mcpServer enthält
 *      rueckfrage; pruefeInitZeile ohne rueckfrage in der init-Zeile ⇒ Verstoß, mit ⇒ ok (auf main ebenso grün).
 * (t)  Terminalmarke über klassifiziereLauf: VERWEIGERT mit Kanal ⇒ daten.rueckfrage_abgleich { art, grund } (Text passt nicht, Umgehungsverdacht,
 *      Abweichung R3, kein Protokoll); Zählung bei ERFOLGREICH/VERWEIGERT; R3 ⇒ rueckfrage_abweichung (gekappt) auch bei ERFOLGREICH;
 *      ohne Kanal keine Kanal-Felder (Negativkontrolle je Fall).
 * Restgrenze (Advisor B7): dass ein Lauf in einer Projektinstanz die Projekt-url in seiner mcp-config bekommt, belegt (d) nicht
 * (baueProjektHandlerMap reicht keine Vermittlung durch) — dafür (o3) am Quelltext und (o1) funktional.
 *
 * Neue Module werden dynamisch importiert: auf main fehlen sie ⇒ Befund statt Absturz (Rot-Nachweis F-1127 per git archive).
 *
 * Wird aufgerufen von: `npm run check:gates` (und damit `npm run check`).
 *
 * Aufruf: node scripts/check-f45-b2b3b2b2a-einschalten.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { execFileSync, spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { baueAufruf, pruefeInitZeile } from '../src/claude-code-gateway/index.ts'
import { kanonischesJson, ladeGueltigeCheckpoints, sha256Hex } from '../src/checkpoint-store/index.ts'
import { ermittleProjektFaehigkeiten, katalogFreigaben, ladeFaehigkeitenLokal, leseEingebautReferenz, projektEinstellungen, projektKennung } from '../src/faehigkeiten/index.ts'
import { registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { klassifiziereLauf } from '../src/result-evaluator/index.ts'
import { RECHTE_WERKZEUG } from '../src/rueckfrage/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { registriereWorkflow } from '../src/workflow/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'
import { erzeugeMultiProjektDispatcher, erzeugeRequestHandler, loeseAusfuehrungsEingabenAuf } from './leitstand-server.mjs'
import { erzeugeRueckfrageVermittlung } from './leitstand/rueckfrage-vermittlung.mjs'
import { schalteGitWartungAb } from './_wegwerf.ts'

const befunde = []
console.log('\n=== F45-B2b-3b-2b-2a-1-Einschalten-Check ===\n')

const SKRIPT = join(process.cwd(), 'scripts', 'leitstand', 'rueckfrage-mcp.mjs')
const aufraeumen = []
const dienste = []
const kinder = []

function pruefe(bedingung, ok, fehler) {
  if (bedingung) console.log(`  ✓ ${ok}`)
  else befunde.push(fehler)
}

/** Dynamischer Import eines Moduls, das es erst seit diesem Paket gibt (auf main ⇒ null mit Befund). */
async function neu(pfad, fall) {
  try {
    return await import(pfad)
  } catch (fehler) {
    befunde.push(`${fall} Modul ${pfad} fehlt: ${fehler.message}`)
    return null
  }
}

const verzoegerung = (ms) => new Promise((r) => setTimeout(r, ms))
async function warteBis(pruefen, maxMs = 15000) {
  const ende = Date.now() + maxMs
  let wert = await pruefen()
  while (!wert && Date.now() < ende) {
    await verzoegerung(25)
    wert = await pruefen()
  }
  return wert
}
const git = (cwd, argumente) => execFileSync('git', argumente, { cwd, encoding: 'utf8' })

/** Wegwerf-Projekt (Branch 'arbeit') und Startvorlage mit Bash im schreibenden Werkzeugsatz (Muster Gate b2b3b1). */
function baueUmgebung(kennung) {
  const basis = join(tmpdir(), `f45-b2b3b2b2a-${kennung}-${randomUUID().slice(0, 8)}`)
  aufraeumen.push(basis)
  const repoWurzel = join(basis, 'projekt')
  mkdirSync(join(repoWurzel, '.claude'), { recursive: true })
  git(repoWurzel, ['init', '--quiet'])
  schalteGitWartungAb(repoWurzel)
  git(repoWurzel, ['config', 'user.email', 'test@example.invalid'])
  git(repoWurzel, ['config', 'user.name', 'Test'])
  git(repoWurzel, ['config', 'core.autocrlf', 'false'])
  git(repoWurzel, ['checkout', '--quiet', '-b', 'arbeit'])
  writeFileSync(join(repoWurzel, '.claude', 'settings.json'), '{}\n')
  writeFileSync(join(repoWurzel, 'README.md'), 'Zeile 1\n')
  git(repoWurzel, ['add', '.'])
  git(repoWurzel, ['commit', '--quiet', '-m', 'init'])
  const vorlage = ladeStartvorlage('startvorlagen/beispielprojekt.json')
  const startvorlagePfad = join(basis, 'startvorlage.json')
  const werkzeugsaetze = { ...vorlage.werkzeugsaetze, schreibend: { ...vorlage.werkzeugsaetze.schreibend, erlaubte_werkzeuge: ['Read', 'Grep', 'Glob', 'Write', 'Edit', 'Bash(npm ci)'] } }
  writeFileSync(startvorlagePfad, JSON.stringify({ ...vorlage, werkzeugsaetze }, null, 2))
  return { basis, repoWurzel, startvorlagePfad, basisVerzeichnis: join(basis, 'kontrollzustand'), vorlage: ladeStartvorlage(startvorlagePfad) }
}

/** Server mit Attrappen-Worker; `zusatz(port)` liefert Handler-Optionen (der Port steht vor dem Handler fest). */
async function starteServer(u, zusatz) {
  const aufrufe = []
  const profilReferenz = leiteProfilReferenzAb(u.vorlage)
  async function attrappe(laufId, profil, eingaben) {
    aufrufe.push({ rolle: eingaben.rolle, eingaben })
    const rohstromPfad = join(u.basis, `rohstrom-${laufId}.json`)
    writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: 'Fertig.' }) }))
    registriereKernArtefakt(`laufakte-${laufId}`, profil ?? profilReferenz, { erzeuger: 'check-f45-b2b3b2b2a' }, { worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad, inhalts_hash: 'x' } }, [], { basisVerzeichnis: u.basisVerzeichnis, schreiber: () => {} })
    return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH', bypass_verdacht_anzahl: 0 }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
  }
  let handler = null
  const dienst = createServer((req, res) => handler(req, res))
  await new Promise((r) => dienst.listen(0, '127.0.0.1', r))
  dienste.push(dienst)
  const port = dienst.address().port
  handler = erzeugeRequestHandler({
    basisVerzeichnis: u.basisVerzeichnis,
    repoWurzel: u.repoWurzel,
    startvorlagePfad: u.startvorlagePfad,
    installWurzel: process.cwd(),
    fuehreAufgabeDurchFn: attrappe,
    arbeitsordner: true,
    arbeitsordnerNpm: async () => ({ code: 0, stdout: '', stderr: '', zeitueberschritten: false }),
    arbeitsordnerE183: () => ({ ok: true }),
    standCacheMs: 0,
    ...zusatz(port),
  })
  return { basisUrl: `http://127.0.0.1:${port}`, aufrufe, schliessen: () => new Promise((r) => (dienst.listening ? dienst.close(() => r()) : r())) }
}

const SCHRITT = { schritt_id: 'schritt-1-ausfuehrung', rolle: 'ausfuehrung', werkzeugsatz: 'schreibend', worker: 'claude-code', modell: 'claude-sonnet-5', eingaben: [], output_schema: null, freigabe: 'ZWINGEND', freigabe_erteilt: true, risiko: 'Gate-Fixture.', zeitgrenze_ms: 600000, nachfolger: null, status: 'OFFEN', lauf_id: null }

/** Auftrag + Workflow mit einem Ausführungsschritt, Start (mit Arbeitsordner-Vorbereitung); liefert den Lauf der Attrappe. */
async function starteAusfuehrung(u, s, kennung) {
  const { auftragId } = await (await fetch(`${s.basisUrl}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel: `Gate ${kennung}`, auftragstext: 'Lege eine Datei an.' }) })).json()
  const workflowId = `f45-b2b3b2b2a-${kennung}-${randomUUID()}`
  registriereWorkflow(
    { workflow_schema: 'v0', workflow_id: workflowId, auftrag_id: auftragId, version: 1, ziel: `Gate ${kennung}.`, status: 'OFFEN', aktiver_schritt_id: SCHRITT.schritt_id, grenzen: { max_schritte: 6, max_replans: 1 }, schritte: [SCHRITT] },
    leiteProfilReferenzAb(u.vorlage),
    { basisVerzeichnis: u.basisVerzeichnis, schreiber: () => {} }
  )
  let koerper = await (await fetch(`${s.basisUrl}/api/workflows/${workflowId}/starten`, { method: 'POST' })).json()
  if (koerper.vorbereitung === true) {
    await warteBis(async () => (await (await fetch(`${s.basisUrl}/api/workflows/${workflowId}`)).json()).arbeitsordner?.status === 'BEREIT')
    koerper = await (await fetch(`${s.basisUrl}/api/workflows/${workflowId}/starten`, { method: 'POST' })).json()
  }
  return warteBis(() => s.aufrufe.find((a) => a.rolle === 'ausfuehrung'))
}

/** Attrappen-Client des MCP-Skripts (JSON-RPC über stdio, Muster Gate b2b3b1). */
function starteClient(env) {
  const kind = spawn(process.execPath, [SKRIPT], { env: { ...process.env, ...env }, stdio: ['pipe', 'pipe', 'pipe'] })
  kinder.push(kind)
  const warter = new Map()
  let rest = ''
  kind.stdout.setEncoding('utf8')
  kind.stdout.on('data', (stueck) => {
    rest += stueck
    for (let i = rest.indexOf('\n'); i >= 0; i = rest.indexOf('\n')) {
      const zeile = rest.slice(0, i)
      rest = rest.slice(i + 1)
      try {
        const m = JSON.parse(zeile)
        warter.get(m.id)?.(m)
        warter.delete(m.id)
      } catch {
        // keine JSON-Zeile — Gate b2b3b1 (r7) prüft das
      }
    }
  })
  kind.stderr.resume()
  let naechsteId = 1
  const rufe = (method, params) =>
    new Promise((ok, fehl) => {
      const id = naechsteId++
      const zeit = setTimeout(() => fehl(new Error(`Zeitgrenze ${method}`)), 30000)
      warter.set(id, (m) => {
        clearTimeout(zeit)
        ok(m)
      })
      kind.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`)
    })
  const rechte = async (tool_name, input, tool_use_id) => JSON.parse((await rufe('tools/call', { name: 'rechte_pruefen', arguments: { tool_name, input, tool_use_id } })).result?.content?.[0]?.text ?? '{}')
  return { rechte, beende: () => kind.kill() }
}

const einschalten = await neu('./leitstand/rueckfrage-einschalten.mjs', '(o1)')
const optInPruefung = await neu('./_rueckfrage-aus-pruefung.mjs', '(o3)')
const regelModul = await import('../src/rueckfrage/index.ts')
const REGEL = Array.isArray(regelModul.RUECKFRAGE_REGEL) ? regelModul.RUECKFRAGE_REGEL.join('\n') : null
if (REGEL === null) befunde.push('(r) RUECKFRAGE_REGEL fehlt in src/rueckfrage/index.ts')

try {
  // ── (o1) Opt-in als Wert ──────────────────────────────────────────────────────────────────────────────────────────
  if (einschalten !== null) {
    const { rueckfrageBasisAusUmgebung: basisAus, rueckfrageOptionFuer: option, rueckfrageStartzeile: startzeile } = einschalten
    // F45 B2b-3b-2b-2b-2b-1 (Kanal Standard an): alt „nur '1' ⇒ an; 0/true/leer/' 1'/fehlt ⇒ aus“; neu „fehlt/'1' ⇒ an; '0' ⇒ aus;
    // true/leer/' 1'/sonstiges ⇒ aus mit Grund ‚unbekannter Wert …‘ (fail-closed); Port 0 ⇒ aus“.
    const an = basisAus({ LEITSTAND_RUECKFRAGE: '1' }, 4173)
    const fehlt = basisAus({}, 4173)
    const null0 = basisAus({ LEITSTAND_RUECKFRAGE: '0' }, 4173)
    const unbekannt = ['true', '', ' 1', '1 ', 'an'].map((w) => basisAus({ LEITSTAND_RUECKFRAGE: w }, 4173))
    const port0 = basisAus({ LEITSTAND_RUECKFRAGE: '1' }, 0)
    const port0Fehlt = basisAus({}, 0)
    pruefe(
      an.an === true && an.basis === 'http://127.0.0.1:4173/api' && isDeepStrictEqual(fehlt, an) &&
        null0.an === false && /LEITSTAND_RUECKFRAGE=0/.test(null0.grund) &&
        unbekannt.every((a) => a.an === false && /^unbekannter Wert .*nur 0 schaltet aus/.test(a.grund)) &&
        port0.an === false && port0Fehlt.an === false && JSON.stringify(option(port0.basis)) === '{}' && JSON.stringify(option(null0.basis)) === '{}' && JSON.stringify(option(unbekannt[0].basis)) === '{}',
      '(o1) fehlt/1 mit gültigem Port ⇒ an; 0 ⇒ aus; true/leer/Leerzeichen/sonstiges ⇒ aus mit Grund „unbekannter Wert“; Port 0 ⇒ aus; Option {} bei aus.',
      `(o1) ${JSON.stringify({ an, fehlt, null0, unbekannt, port0, port0Fehlt })}`
    )
    pruefe(
      option(an.basis).rueckfrage?.url === 'http://127.0.0.1:4173/api' && option(an.basis, 'p1').rueckfrage?.url === 'http://127.0.0.1:4173/api/projekte/p1' && JSON.stringify(option(an.basis, '../x')) === '{}' && /: an /.test(startzeile(an)) && /: aus \(/.test(startzeile(port0)),
      '(o1) Option je Instanz (…/api bzw. …/api/projekte/<id>), ungültige id ⇒ {}; Startzeile an/aus.',
      `(o1) Option/Startzeile: ${JSON.stringify([option(an.basis), option(an.basis, 'p1'), startzeile(an), startzeile(port0)])}`
    )
  }

  // ── (o2)/(r) echter Start: Option aus LEITSTAND_RUECKFRAGE=0 bzw. aus leerer Umgebung und aus LEITSTAND_RUECKFRAGE=1 ──────────
  // F45 B2b-3b-2b-2b-2b-1: alt „aus = leere Umgebung, an = '1'“; neu „aus = '0', an = leere Umgebung (Standard) und '1'“.
  if (einschalten !== null) {
    const { rueckfrageBasisAusUmgebung: basisAus, rueckfrageOptionFuer: option } = einschalten
    for (const [fall, env] of [
      ['aus', { LEITSTAND_RUECKFRAGE: '0' }],
      ['an', {}],
      ['an', { LEITSTAND_RUECKFRAGE: '1' }],
    ]) {
      const u = baueUmgebung(`o2-${fall}`)
      const s = await starteServer(u, (port) => option(basisAus(env, port).basis))
      const lauf = await starteAusfuehrung(u, s, `o2-${fall}`)
      if (!lauf) {
        befunde.push(`(o2) ${fall}: kein Ausführungslauf`)
      } else {
        const a = lauf.eingaben.aufrufEingaben
        const argv = baueAufruf({ ...a, prompt: 'x' })
        const text = lauf.eingaben.auftragstext
        const vorkommen = REGEL === null ? -1 : text.split(REGEL).length - 1
        if (fall === 'aus') {
          pruefe(lauf.eingaben.rueckfrageKanal === undefined && a.permissionPromptTool === undefined && !argv.includes('--permission-prompt-tool') && argv[argv.indexOf('--mcp-config') + 1] === '{"mcpServers":{}}', '(o2) Option aus LEITSTAND_RUECKFRAGE=0 ⇒ kein Kanal, kein --permission-prompt-tool, mcp-config Standard.', `(o2) aus: ${JSON.stringify(a)}`)
          pruefe(vorkommen === 0 && !/frage_stefan/.test(text), '(r) ohne Kanal keine Regelzeile im Auftragstext.', `(r) aus: Regelzeile ${vorkommen}×`)
        } else {
          const url = JSON.parse(a.mcpConfig ?? '{}').mcpServers?.rueckfrage?.env?.WORKFORCE_RUECKFRAGE_URL
          pruefe(lauf.eingaben.rueckfrageKanal !== undefined && a.permissionPromptTool === RECHTE_WERKZEUG && url === `${s.basisUrl}/api`, `(o2) ${JSON.stringify(env)} ⇒ Kanal mit url = API-Basis der Instanz (…/api).`, `(o2) an ${JSON.stringify(env)}: url ${url}, ppt ${a.permissionPromptTool}`)
          pruefe(vorkommen === 1, '(r) mit Kanal genau eine Regelzeile frage_stefan im Auftragstext.', `(r) an: Regelzeile ${vorkommen}×`)
        }
      }
      await s.schliessen()
    }
  }

  // ── (o3) Quelltext ────────────────────────────────────────────────────────────────────────────────────────────────
  if (optInPruefung !== null) {
    const server = readFileSync('scripts/leitstand-server.mjs', 'utf8')
    const ergebnis = optInPruefung.pruefeKanalNurUeberOptIn([{ pfad: 'scripts/leitstand-server.mjs', text: server }])
    const rotFest = optInPruefung.pruefeKanalNurUeberOptIn([{ pfad: 'scripts/leitstand-server.mjs', text: server.replace('...rueckfrageOptionFuer(rueckfrageStand.basis)', "rueckfrage: { an: true, url: 'http://127.0.0.1:1/api' }") }])
    const rotKarte = optInPruefung.pruefeKanalNurUeberOptIn([{ pfad: 'scripts/leitstand-server.mjs', text: server.replace('rueckfrageBasis: rueckfrageStand.basis', "rueckfrageBasis: 'http://x'") }])
    const rotVermittlung = optInPruefung.pruefeKanalNurUeberOptIn([{ pfad: 'scripts/leitstand-server.mjs', text: server.replace('...rueckfrageOptionFuer(rueckfrageStand.basis)', '...rueckfrageOptionFuer(rueckfrageStand.basis), rueckfrageVermittlung: x') }])
    // code-reviewer 1/6, qa M3: weitere Rotfälle — zweite Stand-Quelle, veränderter Stand, Live-Form, vorab gebautes Optionsobjekt,
    // Vorgabe „an“.
    const rot = (alt, neuText) => optInPruefung.pruefeKanalNurUeberOptIn([{ pfad: 'scripts/leitstand-server.mjs', text: server.replace(alt, () => neuText) }]).befunde.length
    const weitere = {
      standQuelle: rot('const rueckfrageStand = rueckfrageBasisAusUmgebung(process.env, PORT)', "const rueckfrageStand = rueckfrageBasisAusUmgebung({ LEITSTAND_RUECKFRAGE: '1' }, PORT)"),
      standVeraendert: rot('const rueckfrageStand = rueckfrageBasisAusUmgebung(process.env, PORT)', "const rueckfrageStand = rueckfrageBasisAusUmgebung(process.env, PORT)\nrueckfrageStand.basis = 'http://x'"),
      liveForm: rot('rueckfrageBasis: istWorkforceInstanz && rueckfrageAn ? rueckfrage.url : undefined', 'rueckfrageBasis: rueckfrage?.url'),
      vorabObjekt: rot('  const defaultHandler = erzeugeRequestHandler({', "  const kanalOption = { rueckfrage: { an: true, url: 'http://x' } }\n  const defaultHandler = erzeugeRequestHandler({"),
      vorgabe: rot('    rueckfrage = undefined,', "    rueckfrage = { an: true, url: 'http://x' },"),
      // F45 W2b-1 (Advisor): die zweite Vorgabe der Regel (rueckfrageBasis) hatte keinen Rotfall.
      vorgabeBasis: rot('rueckfrageBasis = undefined } = optionen', "rueckfrageBasis = 'http://x' } = optionen"),
    }
    pruefe(
      ergebnis.befunde.length === 0 && ergebnis.handlerAufrufe >= 2 && rotFest.befunde.length > 0 && rotKarte.befunde.length > 0 && rotVermittlung.befunde.length > 0 && Object.values(weitere).every((n) => n > 0),
      '(o3) rueckfrage nur über rueckfrageOptionFuer bzw. rueckfrageStand.basis; feste Adresse, fremde Basis, injizierte Vermittlung, andere Stand-Quelle, veränderter Stand, Live-Form, vorab gebautes Objekt, Vorgabe „an“ (rueckfrage, rueckfrageBasis) ⇒ rot.',
      `(o3) ${JSON.stringify({ befunde: ergebnis.befunde, rot: [rotFest.befunde.length, rotKarte.befunde.length, rotVermittlung.befunde.length], weitere })}`
    )
    pruefe(server.includes('console.log(rueckfrageStartzeile(rueckfrageStand))'), '(o3) Startzeile im listen-Rückruf.', '(o3) Startzeile fehlt')
  }

  // ── (d) URL-Basis über den echten Multi-Projekt-Dispatcher ────────────────────────────────────────────────────────────
  {
    const basis = mkdtempSync(join(tmpdir(), 'f45-b2b3b2b2a-d-'))
    aufraeumen.push(basis)
    const vW = erzeugeRueckfrageVermittlung({ pollFensterMs: 300 })
    const vP = erzeugeRueckfrageVermittlung({ pollFensterMs: 300 })
    let dispatcher = null
    const dienst = createServer((req, res) => dispatcher(req, res))
    await new Promise((r) => dienst.listen(0, '127.0.0.1', r))
    dienste.push(dienst)
    const wurzel = `http://127.0.0.1:${dienst.address().port}`
    const handler = (name, url, vermittlung) => erzeugeRequestHandler({ basisVerzeichnis: join(basis, name), startvorlagePfad: 'startvorlagen/beispielprojekt.json', rueckfrage: { an: true, url }, rueckfrageVermittlung: vermittlung })
    dispatcher = erzeugeMultiProjektDispatcher(new Map([['p1', handler('p1', `${wurzel}/api/projekte/p1`, vP)]]), handler('wf', `${wurzel}/api`, vW))
    const tW = 'a'.repeat(64)
    const tP = 'b'.repeat(64)
    vW.oeffneLauf('lauf-w', { token: tW, arbeitsordner: basis, werkzeugNamen: ['Bash'] })
    vP.oeffneLauf('lauf-p', { token: tP, arbeitsordner: basis, werkzeugNamen: ['Bash'] })
    const liste = async (pfad) => (await (await fetch(`${wurzel}${pfad}`)).json()).rueckfragen ?? []

    // Projektinstanz: Anfrage, Warten über mehrere Poll-Fenster, Antwort über den Dispatcher.
    const clientP = starteClient({ WORKFORCE_RUECKFRAGE_URL: `${wurzel}/api/projekte/p1`, WORKFORCE_RUECKFRAGE_TOKEN: tP })
    const antwortP = clientP.rechte('Bash', { command: 'npm publish' }, 'toolu_dp')
    const offenP = await warteBis(async () => (await liste('/api/projekte/p1/rueckfragen'))[0], 5000)
    const inWorkforce = (await liste('/api/rueckfragen')).length
    await verzoegerung(800) // > 2 Poll-Fenster: das Skript wartet mehrfach über …/warten
    const statusP = offenP ? (await fetch(`${wurzel}/api/projekte/p1/rueckfragen/${offenP.id}/antwort`, { method: 'POST', body: JSON.stringify({ entscheidung: 'einmal_erlauben' }) })).status : 0
    const ergebnisP = await antwortP
    pruefe(
      offenP?.befehl === 'npm publish' && inWorkforce === 0 && statusP === 200 && ergebnisP.behavior === 'allow',
      '(d) Projektinstanz (…/api/projekte/p1): Anfrage und Warten über den Dispatcher, nur in der eigenen Liste, Antwort ⇒ allow.',
      `(d) Projekt: ${JSON.stringify({ offenP, inWorkforce, statusP, ergebnisP })}`
    )
    // Workforce-Instanz (…/api): dasselbe mit Ablehnung.
    const clientW = starteClient({ WORKFORCE_RUECKFRAGE_URL: `${wurzel}/api`, WORKFORCE_RUECKFRAGE_TOKEN: tW })
    const antwortW = clientW.rechte('Bash', { command: 'git push' }, 'toolu_dw')
    const offenW = await warteBis(async () => (await liste('/api/rueckfragen'))[0], 5000)
    const inProjekt = (await liste('/api/projekte/p1/rueckfragen')).length
    await verzoegerung(800)
    const statusW = offenW ? (await fetch(`${wurzel}/api/rueckfragen/${offenW.id}/antwort`, { method: 'POST', body: JSON.stringify({ entscheidung: 'ablehnen' }) })).status : 0
    const ergebnisW = await antwortW
    pruefe(
      offenW?.befehl === 'git push' && inProjekt === 0 && statusW === 200 && ergebnisW.behavior === 'deny' && /^Stefan hat den Befehl abgelehnt\. \(Ref /.test(ergebnisW.message ?? ''),
      '(d) Workforce-Instanz (…/api): Anfrage und Warten, nur in der eigenen Liste, Ablehnung mit Stefans Text.',
      `(d) Workforce: ${JSON.stringify({ offenW, inProjekt, statusW, ergebnisW })}`
    )
    // Token der Workforce an der Projektinstanz ⇒ 403 ⇒ deny (fail closed, Advisor B4).
    const fremd = starteClient({ WORKFORCE_RUECKFRAGE_URL: `${wurzel}/api/projekte/p1`, WORKFORCE_RUECKFRAGE_TOKEN: tW })
    const ergebnisFremd = await fremd.rechte('Bash', { command: 'ls' }, 'toolu_df')
    pruefe(ergebnisFremd.behavior === 'deny' && (await liste('/api/projekte/p1/rueckfragen')).length === 0, '(d) Token einer anderen Instanz ⇒ deny, keine offene Rückfrage.', `(d) fremd: ${JSON.stringify(ergebnisFremd)}`)
    for (const c of [clientP, clientW, fremd]) c.beende()
    vW.beendeLauf('lauf-w')
    vP.beendeLauf('lauf-p')
  }

  // ── (i) Init-Gate Projektweg (Ort-B über den Fähigkeiten-Kontext) ───────────────────────────────────────────────────
  {
    const INSTALL = process.cwd()
    const vorlage = ladeStartvorlage('startvorlagen/ai-workforce.json')
    const katalog = katalogFreigaben(JSON.parse(readFileSync(join(INSTALL, 'ressourcen.json'), 'utf8')).ressourcen, INSTALL)
    const wurzel = mkdtempSync(join(tmpdir(), 'f45-b2b3b2b2a-i-'))
    aufraeumen.push(wurzel)
    cpSync(join(INSTALL, 'vorlagen', 'projekt-skelett', '.claude'), join(wurzel, '.claude'), { recursive: true })
    const lokalPfad = join(wurzel, 'faehigkeiten.lokal.json')
    writeFileSync(lokalPfad, JSON.stringify({ faehigkeiten_lokal_schema: 'v0', projekte: { gate: { an: ['agent:qa'] } } }))
    const lokal = ladeFaehigkeitenLokal(lokalPfad)
    const referenz = leseEingebautReferenz()
    const werkzeugNamen = [...new Set(vorlage.werkzeugsaetze.schreibend.erlaubte_werkzeuge.map((r) => r.split('(')[0]))]
    const ermittelt = ermittleProjektFaehigkeiten(wurzel, { katalog, einstellungen: projektEinstellungen(lokal.daten, 'gate'), werkzeugNamen, referenz: referenz.ok ? referenz.referenz : { cli_version: '', agents: [], plugins: [], plugin_skills: [] } })
    const angezeigt = ermittelt.eintraege.filter((e) => e.aktiv).flatMap((e) => projektKennung(e) ?? [])
    const roh = { rolle: 'ausfuehrung', anfragen: [], budget: vorlage.standardBudget, aufrufEingaben: { modell: 'claude-sonnet-5' }, auftragId: 'gate' }
    const kanal = { url: 'http://127.0.0.1:1/api/projekte/p1', token: 'c'.repeat(64), skriptPfad: SKRIPT, nodePfad: process.execPath, warteGrenzeMs: 600000 }
    const e = loeseAusfuehrungsEingabenAuf(roh, 'schreibend', 'AUFTRAG', vorlage, wurzel, { leseAusfuehrungsVorbedingung: () => ({ ok: true }), faehigkeitenKontext: { lokal, lokalPfad, projektId: 'gate', katalog, deaktiviert: [], angezeigteProjektKennungen: angezeigt }, rueckfrage: kanal })
    const gate = e.ok ? e.eingaben.ortBLauf : undefined
    if (gate === undefined) befunde.push(`(i) kein ortBLauf: ${e.ok ? 'Start ok ohne Init-Gate' : e.grund}`)
    else {
      const erwartet = { skills: gate.skillNamen, mcpServer: gate.mcpServer, gesperrt: gate.gesperrteNamen, agents: gate.agents }
      const init = (mcp) => ({ type: 'system', subtype: 'init', tools: ['Task', 'Bash', 'Edit', 'Glob', 'Grep', 'Read', 'Write'], agents: ['architecture-advisor', 'claude', 'code-reviewer', 'Explore', 'general-purpose', 'Plan', 'qa', 'statusline-setup'], skills: [], slash_commands: [], mcp_servers: mcp.map((name) => ({ name })), plugins: [] })
      const mit = pruefeInitZeile(init(['rueckfrage']), erwartet)
      const ohne = pruefeInitZeile(init([]), erwartet)
      pruefe(gate.mcpServer.includes('rueckfrage') && mit === null && /fehlend: rueckfrage/.test(ohne ?? ''), '(i) Projektweg (Ort-B): rueckfrage im Soll des Init-Gates; fehlt er in der init-Zeile ⇒ Verstoß.', `(i) ${JSON.stringify({ mcpServer: gate.mcpServer, mit, ohne })}`)
    }
  }

  // ── (t) Terminalmarke ──────────────────────────────────────────────────────────────────────────────────────────────
  {
    const kontroll = mkdtempSync(join(tmpdir(), 'f45-b2b3b2b2a-t-'))
    aufraeumen.push(kontroll)
    const profil = leiteProfilReferenzAb(ladeStartvorlage('startvorlagen/beispielprojekt.json'))
    const TEXT = 'Stefan hat den Befehl abgelehnt. (Ref t)'
    const DENIAL = { tool_name: 'Bash', tool_use_id: 'toolu_t', tool_input: { command: 'npm publish' } }
    const stdout = (denials, text = TEXT) =>
      `${JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'toolu_t', content: text, is_error: true }] } })}\n${JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: 'fertig', permission_denials: denials })}`
    const protokoll = (laufId) => ({ rueckfragen_schema: 'v1', lauf_id: laufId, ab: 0, eintraege: [{ tool_use_id: 'toolu_t', tool_name: 'Bash', input_hash: sha256Hex(kanonischesJson(DENIAL.tool_input)), art: 'stefan_abgelehnt', grund: 'Stefan hat abgelehnt', zeit: '2026-10-17T10:00:00.000Z', befehl: 'npm publish', ablehnung_hash: sha256Hex(TEXT) }] })
    const klassifiziere = (text, zusatz) => {
      const laufId = `gate-t-${randomUUID()}`
      const pfad = join(kontroll, `roh-${laufId}.json`)
      const roh = JSON.stringify({ stdout: text, stderr: '', exitCode: 0 })
      writeFileSync(pfad, roh)
      const laufakte = { worker: 'claude-code', beobachtungsbasis_vollstaendig: true, rohstrom_referenz: { pfad, inhalts_hash: sha256Hex(roh) } }
      const e = klassifiziereLauf(laufId, profil, { laufakte, ...zusatz(laufId) }, { basisVerzeichnis: kontroll })
      const daten = ladeGueltigeCheckpoints(laufId, { basisVerzeichnis: kontroll }).find((c) => c.payload.selbst_hash === e.wirkungsmarke.selbstHash)?.payload.daten
      return { ergebnis: e.ergebnis, daten }
    }
    const zaehlung = { stefan_erlaubt: 1, stefan_abgelehnt: 1, frage_beantwortet: 0, nicht_browser: 1 }
    const statisch = 'Permission to use Bash with command npm publish has been denied.'
    const faelle = [
      ['Text passt nicht', stdout([DENIAL], statisch), (l) => ({ rueckfragen: protokoll(l) }), { art: 'abgleich', grund: 'ablehnungstext_passt_nicht' }],
      ['Abweichung R3', stdout([DENIAL]), () => ({ rueckfragen: null, rueckfrageAbweichung: 'Eintrag 0 weicht ab (art)' }), { art: 'abweichung', grund: 'Eintrag 0 weicht ab (art)' }],
      ['kein Protokoll', stdout([DENIAL]), () => ({ rueckfragen: null }), { art: 'kein_protokoll', grund: 'keine_rueckfrage_oder_nicht_lesbar' }],
      ['Umgehungsverdacht', stdout([{ tool_name: 'Bash', tool_use_id: 'toolu_v', tool_input: { command: 'npm run test --dangerously-skip-permissions' } }]), (l) => ({ rueckfragen: protokoll(l) }), { art: 'nicht_geprueft', grund: 'umgehungsverdacht' }],
    ]
    for (const [name, text, zusatz, erwartet] of faelle) {
      const mit = klassifiziere(text, (l) => ({ ...zusatz(l), rueckfrageZaehlung: zaehlung }))
      const ohne = klassifiziere(text, () => ({}))
      pruefe(
        mit.ergebnis === 'VERWEIGERT' && isDeepStrictEqual(mit.daten?.rueckfrage_abgleich, erwartet) && isDeepStrictEqual(mit.daten?.rueckfrage_zaehlung, zaehlung) && ohne.ergebnis === 'VERWEIGERT' && Object.keys(ohne.daten ?? {}).every((k) => !k.startsWith('rueckfrage_')),
        `(t) ${name}: VERWEIGERT mit rueckfrage_abgleich ${erwartet.art}/${erwartet.grund} und Zählung; ohne Kanal keine Kanal-Felder.`,
        `(t) ${name}: ${JSON.stringify({ mit, ohne })}`
      )
    }
    const erfolg = klassifiziere(stdout([DENIAL]), (l) => ({ rueckfragen: protokoll(l), rueckfrageZaehlung: zaehlung }))
    const r3 = klassifiziere(stdout([]), () => ({ rueckfragen: null, rueckfrageAbweichung: 'y'.repeat(900) }))
    const ohneKanal = klassifiziere(stdout([]), () => ({}))
    pruefe(
      erfolg.ergebnis === 'ERFOLGREICH' && erfolg.daten?.abgelehnt_durch_stefan === 1 && isDeepStrictEqual(erfolg.daten?.rueckfrage_zaehlung, zaehlung) && erfolg.daten?.rueckfrage_abgleich === undefined && r3.ergebnis === 'ERFOLGREICH' && r3.daten?.rueckfrage_abweichung === 'y'.repeat(500) && ohneKanal.daten === undefined,
      '(t) ERFOLGREICH mit Kanal ⇒ Zählung, kein Abgleich-Grund; R3 auch bei ERFOLGREICH dauerhaft in daten (gekappt 500); ohne Kanal keine daten.',
      `(t) ${JSON.stringify({ erfolg, r3: { ergebnis: r3.ergebnis, laenge: r3.daten?.rueckfrage_abweichung?.length }, ohneKanal })}`
    )
  }
} finally {
  for (const kind of kinder) kind.kill()
  for (const dienst of dienste) if (dienst.listening) await new Promise((r) => dienst.close(() => r()))
  for (const pfad of aufraeumen) {
    try {
      execFileSync('git', ['worktree', 'prune'], { cwd: join(pfad, 'projekt'), stdio: 'ignore' })
    } catch {
      // ohne Repo nichts zu tun
    }
    raeumeVerzeichnis(pfad)
  }
}

if (befunde.length > 0) {
  console.error(`\n✗ ${befunde.length} Befund(e):`)
  for (const b of befunde) console.error(`  - ${b}`)
  process.exit(1)
}
console.log('\n✓ Keine Befunde.')
