#!/usr/bin/env node
/**
 * Datei: scripts/check-f45-b2b3b1-rueckfrage.mjs
 *
 * Zweck: Gate für F45 B2b-3b-1a „Rückfrage-Kanal, ausgeschaltet“ (features/F45/plan-b2b3b1a-v2.md §6 mit Nachtrag). Nachweis am
 * REALEN Aufrufpfad: echter Leitstand-Server (erzeugeRequestHandler, Port 0; der Handler entsteht nach listen, damit
 * rueckfrage.url den Port kennt), Wegwerf-git-Projekt, echte Arbeitsordner-Vorbereitung (Worktree wf/<id>, npm- und
 * E-183-Attrappen), Auftrag über POST /api/auftraege, Ausführungsschritt über POST …/starten. Der Worker ist eine Attrappe:
 * sie liest die mcp-config aus den Lauf-Eingaben, und das Gate spawnt mit deren command/args/env das echte MCP-Skript
 * (Attrappen-Client, JSON-RPC über stdio). Der Lauf endet erst, wenn das Gate es sagt.
 *
 * Prüft:
 * (g1) Bash ⇒ offen in GET /api/rueckfragen (Befehl wörtlich) ⇒ „einmal erlauben“ ⇒ allow mit updatedInput = Eingabe; Protokoll stefan_erlaubt.
 * (g2) Bash ⇒ „ablehnen“ ⇒ deny; stefan_abgelehnt. (g3) frage_stefan ⇒ Antworttext; frage_beantwortet.
 * (r1) Write außerhalb (absolut und ..) ⇒ sofort deny, keine offene Rückfrage, auto_deny; Bash im Hintergrund ⇒ deny.
 * (r2) ohne/falsches Token ⇒ 403; Client mit falschem Token ⇒ deny.
 * (r3) Antwort über Token-Routen ⇒ 404; Antwort-Route mit Token-Kopf ⇒ 403; „immer“ ⇒ 400; zweite Antwort ⇒ 409;
 *      /api/rueckfragen/anfrage und GET /api/rueckfrage/anfrage ⇒ 404 (A8).
 * (r4) Wartegrenze (Testparameter) ⇒ deny, zeitueberschreitung; Frage ⇒ „keine Antwort von Stefan“.
 * (r4b) Antwort zwischen mehreren Polls geht nicht verloren (A7).
 * (r5) Lauf-Ende bei offener Rückfrage ⇒ deny, lauf_beendet, keine offene Rückfrage, Token danach 403, Antwort auf die ID danach 404.
 * (r6) Leitstand weg bzw. Umgebung fehlt ⇒ deny / „keine Antwort von Stefan“. (r7) jede stdout-Zeile des Skripts ist JSON-RPC.
 * (r9) Body über 64 KiB ⇒ 413, kaputtes JSON ⇒ 400, großer Bash-Befehl ⇒ deny ohne offene Rückfrage; ungültige Frage ⇒ eigene Meldung
 *      „Frage ungültig — nicht an Stefan gestellt“; kaputte JSON-RPC-Eingaben ⇒ Fehlercodes, Prozess lebt (ping).
 * (s)  pruefeStartauftrag und POST /api/laeufe lehnen aufrufEingaben.permissionPromptTool ab (400).
 * (r8) A1: Katalog-MCP mit id 'rueckfrage' ⇒ loeseAusfuehrungsEingabenAuf { ok: false } ohne Wurf; Kanal an ohne url ⇒ Start
 *      abgelehnt, danach startet ein anderer Ablauf (D13 frei).
 * (a1) Schalter aus: kein Kanal, kein --permission-prompt-tool, mcp-config unverändert, Baustein liefert dasselbe Objekt; ohne url
 *      startet der Lauf normal (A2). Mit Schalter an bleiben nicht berechtigte Läufe ohne Kanal (Review, Projektordner).
 * (a2) Schalter an: --permission-prompt-tool mcp__rueckfrage__rechte_pruefen vor -p, rueckfrage (+ Katalog-MCP) in der mcp-config,
 *      frage_stefan in --allowedTools/--tools; pruefeInitZeile mit/ohne rueckfrage.
 * (f)  Quelltext: starteWorkflowSchritt( 6×, F-228 unverändert; seit B2b-3b-2b-2a-1 setzt ein Produktaufrufer die Einschalt-Option nur
 *      über rueckfrageOptionFuer (scripts/_rueckfrage-aus-pruefung.mjs); src/** ohne Tests setzt sie nicht.
 *
 * Wird aufgerufen von: `npm run check:gates` (und damit `npm run check`).
 *
 * Aufruf: node scripts/check-f45-b2b3b1-rueckfrage.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { execFileSync, spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { baueAufruf, pruefeInitZeile } from '../src/claude-code-gateway/index.ts'
import { registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { ergaenzeRueckfrageAufruf, FRAGE_WERKZEUG, RECHTE_WERKZEUG } from '../src/rueckfrage/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { registriereWorkflow } from '../src/workflow/index.ts'
import { pruefeKanalNurUeberOptIn } from './_rueckfrage-aus-pruefung.mjs'
import { raeumeVerzeichnis } from './_aufraeumen.ts'
import { erzeugeRequestHandler, loeseAusfuehrungsEingabenAuf, pruefeStartauftrag, RUECKFRAGE_BODY_MAX_BYTES } from './leitstand-server.mjs'
import { erzeugeRueckfrageVermittlung, KEINE_ANTWORT } from './leitstand/rueckfrage-vermittlung.mjs'

const befunde = []
console.log('\n=== F45-B2b-3b-1a-Rückfrage-Check ===\n')

const SKRIPT = join(process.cwd(), 'scripts', 'leitstand', 'rueckfrage-mcp.mjs')
const aufraeumen = []
const dienste = []
const kinder = []

function pruefe(bedingung, ok, fehler) {
  if (bedingung) console.log(`  ✓ ${ok}`)
  else befunde.push(fehler)
}

function git(cwd, argumente) {
  return execFileSync('git', argumente, { cwd, encoding: 'utf8' })
}

const verzoegerung = (ms) => new Promise((r) => setTimeout(r, ms))

/** Wartet, bis pruefen() einen Wahrheitswert liefert (oder die Zeit abläuft). */
async function warteBis(pruefen, maxMs = 15000) {
  const ende = Date.now() + maxMs
  let wert = await pruefen()
  while (!wert && Date.now() < ende) {
    await verzoegerung(25)
    wert = await pruefen()
  }
  return wert
}

/** Ein Versprechen, das von außen erfüllt wird. */
function aufgeschoben() {
  let erfuelle
  const versprechen = new Promise((r) => {
    erfuelle = r
  })
  return { versprechen, erfuelle }
}

/** Wegwerf-Projekt (Branch 'arbeit', sauber) und Startvorlage mit Bash im schreibenden Werkzeugsatz. */
function baueUmgebung(kennung) {
  const basis = join(tmpdir(), `f45-b2b3b1-${kennung}-${randomUUID().slice(0, 8)}`)
  aufraeumen.push(basis)
  const repoWurzel = join(basis, 'projekt')
  mkdirSync(join(repoWurzel, '.claude'), { recursive: true })
  git(repoWurzel, ['init', '--quiet'])
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

/**
 * Server mit Attrappen-Worker. `halte(eingaben)` darf ein Versprechen liefern — der Lauf endet erst danach.
 * @param u - Umgebung
 * @param zusatz - Handler-Optionen; als Funktion (basisUrl) => Optionen, wenn die url gebraucht wird
 * @returns { basisUrl, aufrufe, schliessen }
 */
async function starteServer(u, zusatz = () => ({}), halte = () => undefined) {
  const aufrufe = []
  const profilReferenz = leiteProfilReferenzAb(u.vorlage)
  async function attrappe(laufId, profil, eingaben, optionen) {
    const aufruf = { laufId, rolle: eingaben.rolle, eingaben, cwd: optionen.cwd, fertig: false }
    aufrufe.push(aufruf)
    await halte(eingaben)
    const rohstromPfad = join(u.basis, `rohstrom-${laufId}.json`)
    writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: 'Fertig.' }) }))
    registriereKernArtefakt(`laufakte-${laufId}`, profil ?? profilReferenz, { erzeuger: 'check-f45-b2b3b1' }, { worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad, inhalts_hash: 'x' } }, [], { basisVerzeichnis: u.basisVerzeichnis, schreiber: () => {} })
    aufruf.fertig = true
    return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH', bypass_verdacht_anzahl: 0 }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
  }
  let handler = null
  const dienst = createServer((req, res) => handler(req, res))
  await new Promise((r) => dienst.listen(0, '127.0.0.1', r))
  dienste.push(dienst)
  const basisUrl = `http://127.0.0.1:${dienst.address().port}`
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
    ...zusatz(basisUrl),
  })
  return { basisUrl, aufrufe, schliessen: () => new Promise((r) => (dienst.listening ? dienst.close(() => r()) : r())) }
}

const SCHRITT_AUSFUEHRUNG = {
  schritt_id: 'schritt-1-ausfuehrung',
  rolle: 'ausfuehrung',
  werkzeugsatz: 'schreibend',
  worker: 'claude-code',
  modell: 'claude-sonnet-5',
  eingaben: [],
  output_schema: null,
  freigabe: 'ZWINGEND',
  freigabe_erteilt: true,
  risiko: 'Gate-Fixture.',
  zeitgrenze_ms: 600000,
  nachfolger: null,
  status: 'OFFEN',
  lauf_id: null,
}
const SCHRITT_REVIEW = { ...SCHRITT_AUSFUEHRUNG, schritt_id: 'schritt-1-review', rolle: 'code-reviewer', werkzeugsatz: 'lesend', freigabe: 'AUTOMATISCH', freigabe_erteilt: undefined }

/** Auftrag über POST /api/auftraege und ein Workflow mit genau einem Schritt. @returns workflowId */
async function legeAblaufAn(u, s, schritt, kennung) {
  const antwort = await fetch(`${s.basisUrl}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel: `Gate ${kennung}`, auftragstext: 'Lege eine Datei an.' }) })
  const { auftragId } = await antwort.json()
  const workflowId = `f45-b2b3b1-${kennung}-${randomUUID()}`
  const { freigabe_erteilt, ...rest } = schritt
  registriereWorkflow(
    { workflow_schema: 'v0', workflow_id: workflowId, auftrag_id: auftragId, version: 1, ziel: `Gate ${kennung}.`, status: 'OFFEN', aktiver_schritt_id: schritt.schritt_id, grenzen: { max_schritte: 6, max_replans: 1 }, schritte: [{ ...rest, ...(freigabe_erteilt ? { freigabe_erteilt } : {}) }] },
    leiteProfilReferenzAb(u.vorlage),
    { basisVerzeichnis: u.basisVerzeichnis, schreiber: () => {} }
  )
  return workflowId
}

/** Startet einen Schritt; bereitet bei Bedarf zuerst den Arbeitsordner vor (202 vorbereitung → BEREIT → erneut starten). */
async function starteAblauf(s, workflowId) {
  let antwort = await fetch(`${s.basisUrl}/api/workflows/${workflowId}/starten`, { method: 'POST' })
  let koerper = await antwort.json()
  if (koerper.vorbereitung === true) {
    await warteBis(async () => (await (await fetch(`${s.basisUrl}/api/workflows/${workflowId}`)).json()).arbeitsordner?.status === 'BEREIT')
    antwort = await fetch(`${s.basisUrl}/api/workflows/${workflowId}/starten`, { method: 'POST' })
    koerper = await antwort.json()
  }
  return { status: antwort.status, koerper }
}

/**
 * Attrappen-Client: spawnt das MCP-Skript und spricht JSON-RPC.
 * @param server - { command, args, env } aus der mcp-config (oder eigene Werte)
 */
function starteClient(server) {
  const kind = spawn(server.command, server.args, { env: { ...process.env, ...server.env }, stdio: ['pipe', 'pipe', 'pipe'] })
  kinder.push(kind)
  const zeilen = []
  const warter = new Map()
  let rest = ''
  kind.stdout.setEncoding('utf8')
  kind.stdout.on('data', (stueck) => {
    rest += stueck
    for (let i = rest.indexOf('\n'); i >= 0; i = rest.indexOf('\n')) {
      const zeile = rest.slice(0, i)
      rest = rest.slice(i + 1)
      zeilen.push(zeile)
      try {
        const m = JSON.parse(zeile)
        warter.get(m.id)?.(m)
        warter.delete(m.id)
      } catch {
        // gezählt in (r7)
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
  const werkzeug = async (name, args, meta) => (await rufe('tools/call', { name, arguments: args, ...(meta !== undefined ? { _meta: meta } : {}) })).result?.content?.[0]?.text
  const rechte = async (tool_name, input, tool_use_id) => JSON.parse(await werkzeug('rechte_pruefen', { tool_name, input, tool_use_id }))
  const schreibeRoh = (text) => kind.stdin.write(text)
  return { rufe, werkzeug, rechte, zeilen, schreibeRoh, beende: () => kind.kill() }
}

/** Server-Eintrag 'rueckfrage' aus der mcp-config eines Laufs. */
const rueckfrageServer = (eingaben) => JSON.parse(eingaben.aufrufEingaben.mcpConfig).mcpServers.rueckfrage

const offene = async (s) => (await (await fetch(`${s.basisUrl}/api/rueckfragen`)).json()).rueckfragen
const antworte = (s, id, body, kopf = {}) => fetch(`${s.basisUrl}/api/rueckfragen/${id}/antwort`, { method: 'POST', headers: kopf, body: JSON.stringify(body) })

/** (r7): jede stdout-Zeile ist ein JSON-RPC-Objekt. */
const nurJsonRpc = (client) =>
  client.zeilen.every((z) => {
    try {
      return JSON.parse(z).jsonrpc === '2.0'
    } catch {
      return false
    }
  })

try {
  // ── Lauf A: Kanal an, Standard-Grenzen ─────────────────────────────────────────────────────────────────────────
  {
    const u = baueUmgebung('a')
    const protokoll = []
    const ende = aufgeschoben()
    const vermittlung = erzeugeRueckfrageVermittlung({ protokolliere: (_l, e) => protokoll.push(e) })
    const s = await starteServer(u, (basisUrl) => ({ rueckfrage: { an: true, url: `${basisUrl}/api` }, rueckfrageVermittlung: vermittlung }), (eingaben) => (eingaben.rolle === 'ausfuehrung' ? ende.versprechen : undefined))
    const workflowId = await legeAblaufAn(u, s, SCHRITT_AUSFUEHRUNG, 'a')
    const start = await starteAblauf(s, workflowId)
    const lauf = await warteBis(() => s.aufrufe.find((a) => a.rolle === 'ausfuehrung'))
    pruefe(start.status === 202 && lauf, '(Vorbedingung) Ausführung im Arbeitsordner gestartet.', `(Vorbedingung) Start ${start.status} ${JSON.stringify(start.koerper)}`)
    if (lauf) {
      const e = lauf.eingaben
      const server = rueckfrageServer(e)
      const argv = baueAufruf({ ...e.aufrufEingaben, prompt: 'x' })
      const p = argv.indexOf('-p')
      const allowed = argv[argv.indexOf('--allowedTools') + 1].split(',')
      const tools = argv[argv.indexOf('--tools') + 1].split(',')
      pruefe(
        argv.slice(p - 2, p).join(' ') === `--permission-prompt-tool ${RECHTE_WERKZEUG}` && allowed.includes(FRAGE_WERKZEUG) && tools.includes(FRAGE_WERKZEUG) && server.command === process.execPath && server.args[0] === SKRIPT && server.env.WORKFORCE_RUECKFRAGE_URL === `${s.basisUrl}/api`,
        '(a2) Schalter an: --permission-prompt-tool vor -p, frage_stefan in --allowedTools/--tools, Server rueckfrage = Node + Skript der Installation, url des Leitstands.',
        `(a2) Argv/mcp-config: ${JSON.stringify({ vorP: argv.slice(p - 2, p), allowed, server })}`
      )
      pruefe(e.rueckfrageKanal?.arbeitsordner === lauf.cwd && lauf.cwd !== u.repoWurzel, '(a2) Vorentscheidung gegen den Arbeitsordner des Laufs (Worktree), nicht den Projektordner.', `(a2) Kanal-Ordner ${e.rueckfrageKanal?.arbeitsordner}, cwd ${lauf.cwd}`)
      const client = starteClient(server)
      const init = await client.rufe('initialize', { protocolVersion: '2025-06-18' })
      const liste = await client.rufe('tools/list', {})
      pruefe(init.result?.serverInfo?.name === 'rueckfrage' && liste.result?.tools?.map((t) => t.name).join(',') === 'rechte_pruefen,frage_stefan', '(Skript) initialize und tools/list.', `(Skript) ${JSON.stringify({ init, liste })}`)

      // (r1) Pfadgrenze ohne Warteschlange
      const aussen = await client.rechte('Write', { file_path: join(u.basis, 'AUSSERHALB.txt'), content: 'x' }, 'toolu_r1a')
      const relativ = await client.rechte('Write', { file_path: '..\\..\\AUSSERHALB.txt', content: 'x' }, 'toolu_r1b')
      const hintergrund = await client.rechte('Bash', { command: 'node -e 1', run_in_background: true }, 'toolu_r1c')
      pruefe(
        aussen.behavior === 'deny' && relativ.behavior === 'deny' && hintergrund.behavior === 'deny' && (await offene(s)).length === 0 && protokoll.filter((x) => x.art === 'auto_deny').length === 3,
        '(r1) Write außerhalb (absolut, ..) und Bash im Hintergrund ⇒ sofort deny, keine offene Rückfrage, Protokoll auto_deny.',
        `(r1) ${JSON.stringify({ aussen, relativ, hintergrund, protokoll })}`
      )

      // (g1) einmal erlauben
      const befehl = 'node -e "require(\'fs\').writeFileSync(\'BASH_LIEF.txt\', \'x\')"'
      const g1 = client.rechte('Bash', { command: befehl, description: 'Probe' }, 'toolu_g1')
      const offen1 = await warteBis(async () => (await offene(s)).find((o) => o.befehl === befehl))
      pruefe(offen1 && offen1.lauf_id === lauf.laufId && offen1.art === 'rechte', '(g1) Bash steht offen in GET /api/rueckfragen, Befehl wörtlich.', `(g1) offen: ${JSON.stringify(await offene(s))}`)
      if (offen1) {
        const tokenKopf = { authorization: `Bearer ${server.env.WORKFORCE_RUECKFRAGE_TOKEN}` }
        // (r3) Antwortweg mit Token unmöglich
        const s1 = (await fetch(`${s.basisUrl}/api/rueckfrage/anfrage/${offen1.id}/antwort`, { method: 'POST', headers: tokenKopf, body: '{"entscheidung":"einmal_erlauben"}' })).status
        const s2 = (await antworte(s, offen1.id, { entscheidung: 'einmal_erlauben' }, tokenKopf)).status
        const s3 = (await antworte(s, offen1.id, { entscheidung: 'immer' })).status
        const s4 = (await fetch(`${s.basisUrl}/api/rueckfragen/anfrage`, { method: 'POST', body: '{}' })).status
        const s5 = (await fetch(`${s.basisUrl}/api/rueckfrage/anfrage`)).status
        const offenNoch = (await offene(s)).some((o) => o.id === offen1.id)
        pruefe(s1 === 404 && s2 === 403 && s3 === 400 && s4 === 404 && s5 === 404 && offenNoch, '(r3) Token-Route ohne Antwort (404), Antwort mit Token-Kopf 403, „immer“ 400, Präfix-Routen 404 — Rückfrage bleibt offen.', `(r3) Status ${[s1, s2, s3, s4, s5].join('/')}, offen ${offenNoch}`)
        // (r2) Token-Prüfung
        const ohne = (await fetch(`${s.basisUrl}/api/rueckfrage/anfrage`, { method: 'POST', body: '{"art":"rechte","tool_name":"Bash","input":{"command":"ls"}}' })).status
        const falsch = (await fetch(`${s.basisUrl}/api/rueckfrage/anfrage`, { method: 'POST', headers: { authorization: `Bearer ${'0'.repeat(64)}` }, body: '{}' })).status
        const fremd = starteClient({ ...server, env: { ...server.env, WORKFORCE_RUECKFRAGE_TOKEN: 'f'.repeat(64) } })
        const fremdAntwort = await fremd.rechte('Bash', { command: 'ls' }, 'toolu_r2')
        fremd.beende()
        pruefe(ohne === 403 && falsch === 403 && fremdAntwort.behavior === 'deny', '(r2) ohne bzw. mit falschem Token 403; Client mit falschem Token ⇒ deny.', `(r2) ${ohne}/${falsch}/${JSON.stringify(fremdAntwort)}`)

        const ok = (await antworte(s, offen1.id, { entscheidung: 'einmal_erlauben' })).status
        const r1 = await g1
        const zweite = (await antworte(s, offen1.id, { entscheidung: 'ablehnen' })).status
        pruefe(ok === 200 && r1.behavior === 'allow' && JSON.stringify(r1.updatedInput) === JSON.stringify({ command: befehl, description: 'Probe' }) && zweite === 409 && protokoll.at(-1)?.art === 'stefan_erlaubt', '(g1) „einmal erlauben“ ⇒ allow, updatedInput = Eingabe, Protokoll stefan_erlaubt; zweite Antwort 409.', `(g1) ${JSON.stringify({ ok, r1, zweite, letzte: protokoll.at(-1) })}`)
      }

      // (g2) ablehnen
      const g2 = client.rechte('Bash', { command: 'npm publish' }, 'toolu_g2')
      const offen2 = await warteBis(async () => (await offene(s)).find((o) => o.befehl === 'npm publish'))
      if (offen2) await antworte(s, offen2.id, { entscheidung: 'ablehnen' })
      const r2 = await g2
      pruefe(r2.behavior === 'deny' && /abgelehnt/.test(r2.message) && protokoll.at(-1)?.art === 'stefan_abgelehnt', '(g2) „ablehnen“ ⇒ deny, Protokoll stefan_abgelehnt.', `(g2) ${JSON.stringify({ r2, letzte: protokoll.at(-1) })}`)

      // (g3) Frage
      const g3 = client.werkzeug('frage_stefan', { frage: 'Welcher Port?', optionen: ['3000', '8080'] }, { 'claudecode/toolUseId': 'toolu_g3' })
      const offen3 = await warteBis(async () => (await offene(s)).find((o) => o.frage === 'Welcher Port?'))
      if (offen3) await antworte(s, offen3.id, { antwort: 'Port 4711' })
      const r3 = await g3
      pruefe(r3 === 'Port 4711' && JSON.stringify(offen3?.optionen) === '["3000","8080"]' && protokoll.at(-1)?.art === 'frage_beantwortet' && protokoll.at(-1)?.tool_use_id === 'toolu_g3', '(g3) frage_stefan ⇒ Antworttext, Optionen sichtbar, Protokoll frage_beantwortet mit tool_use_id.', `(g3) ${JSON.stringify({ r3, offen3, letzte: protokoll.at(-1) })}`)

      // (r9) Grenzen der Token-Routen und kaputte Eingaben
      const tokenKopf = { authorization: `Bearer ${server.env.WORKFORCE_RUECKFRAGE_TOKEN}` }
      const gross = (await fetch(`${s.basisUrl}/api/rueckfrage/anfrage`, { method: 'POST', headers: tokenKopf, body: JSON.stringify({ art: 'rechte', tool_name: 'Bash', input: { command: 'x'.repeat(RUECKFRAGE_BODY_MAX_BYTES) } }) })).status
      const kaputt = (await fetch(`${s.basisUrl}/api/rueckfrage/anfrage`, { method: 'POST', headers: tokenKopf, body: '{kaputt' })).status
      const grosserBefehl = await client.rechte('Bash', { command: 'x'.repeat(70000) }, 'toolu_r9a')
      const ungueltigeFrage = await client.werkzeug('frage_stefan', { frage: 'x'.repeat(3000), optionen: [] }, { 'claudecode/toolUseId': 'toolu_r9b' })
      pruefe(gross === 413 && kaputt === 400 && grosserBefehl.behavior === 'deny' && /^Frage ungültig — nicht an Stefan gestellt/.test(ungueltigeFrage) && (await offene(s)).length === 0, '(r9) Body über 64 KiB ⇒ 413, kaputtes JSON ⇒ 400, großer Befehl ⇒ deny, ungültige Frage ⇒ „Frage ungültig“, nichts offen.', `(r9) ${JSON.stringify({ gross, kaputt, grosserBefehl, ungueltigeFrage })}`)
      const zeilenVorher = client.zeilen.length
      client.schreibeRoh('{kaputt\n')
      const ohneParams = await client.rufe('tools/call', null)
      const unbekannt = await client.rufe('gibtsnicht', {})
      const fremdesWerkzeug = await client.rufe('tools/call', { name: 'gibtsnicht', arguments: {} })
      const ping = await client.rufe('ping', {})
      pruefe(client.zeilen.length === zeilenVorher + 4 && ohneParams.error?.code === -32603 && unbekannt.error?.code === -32601 && fremdesWerkzeug.error?.code === -32603 && JSON.stringify(ping.result) === '{}', '(r9) kaputte JSON-RPC-Eingaben: keine Antwort auf eine kaputte Zeile, -32603/-32601, Prozess antwortet weiter (ping).', `(r9) ${JSON.stringify({ neu: client.zeilen.length - zeilenVorher, ohneParams, unbekannt, fremdesWerkzeug, ping })}`)

      // (r5) Lauf-Ende bei offener Rückfrage
      const r5 = client.rechte('Bash', { command: 'npm ci' }, 'toolu_r5')
      await warteBis(async () => (await offene(s)).length === 1)
      const r5Id = (await offene(s))[0]?.id
      ende.erfuelle()
      const r5Antwort = await r5
      await warteBis(() => lauf.fertig)
      const nachher = (await fetch(`${s.basisUrl}/api/rueckfrage/anfrage`, { method: 'POST', headers: tokenKopf, body: '{}' })).status
      const spaet = r5Id === undefined ? null : (await antworte(s, r5Id, { entscheidung: 'einmal_erlauben' })).status
      pruefe(r5Antwort.behavior === 'deny' && protokoll.at(-1)?.art === 'lauf_beendet' && (await offene(s)).length === 0 && nachher === 403 && spaet === 404, '(r5) Lauf-Ende ⇒ offene Rückfrage deny, Protokoll lauf_beendet, nichts offen, Token danach 403, späte Antwort 404.', `(r5) ${JSON.stringify({ r5Antwort, letzte: protokoll.at(-1), nachher, spaet })}`)
      pruefe(nurJsonRpc(client) && client.zeilen.length >= 9, '(r7) jede stdout-Zeile des Skripts ist JSON-RPC.', `(r7) stdout: ${client.zeilen.join(' | ').slice(0, 400)}`)
      client.beende()
    }
    ende.erfuelle()
    await s.schliessen()
  }

  // ── Lauf B: Wartegrenze und Poll-Fenster verkürzt ──────────────────────────────────────────────────────────────
  {
    const u = baueUmgebung('b')
    const protokoll = []
    const ende = aufgeschoben()
    const vermittlung = erzeugeRueckfrageVermittlung({ warteGrenzeMs: 1500, pollFensterMs: 50, protokolliere: (_l, e) => protokoll.push(e) })
    const s = await starteServer(u, (basisUrl) => ({ rueckfrage: { an: true, url: `${basisUrl}/api`, warteGrenzeMs: 1500 }, rueckfrageVermittlung: vermittlung }), (eingaben) => (eingaben.rolle === 'ausfuehrung' ? ende.versprechen : undefined))
    await starteAblauf(s, await legeAblaufAn(u, s, SCHRITT_AUSFUEHRUNG, 'b'))
    const lauf = await warteBis(() => s.aufrufe.find((a) => a.rolle === 'ausfuehrung'))
    if (!lauf) befunde.push('(Vorbedingung B) Ausführung nicht gestartet')
    else {
      const server = rueckfrageServer(lauf.eingaben)
      const client = starteClient(server)
      await client.rufe('initialize', { protocolVersion: '2025-06-18' })
      const b1 = client.rechte('Bash', { command: 'npm ci' }, 'toolu_b1')
      const offen = await warteBis(async () => (await offene(s))[0])
      await verzoegerung(300)
      if (offen) await antworte(s, offen.id, { entscheidung: 'einmal_erlauben' })
      const b1Antwort = await b1
      pruefe(b1Antwort.behavior === 'allow' && server.env.WORKFORCE_RUECKFRAGE_FRIST_MS === String(1500 + 60000), '(r4b) Antwort nach mehreren Polls (Fenster 50 ms) geht nicht verloren ⇒ allow; Skript-Frist = Wartegrenze + 60 s.', `(r4b) ${JSON.stringify(b1Antwort)} Frist ${server.env.WORKFORCE_RUECKFRAGE_FRIST_MS}`)
      const start = Date.now()
      const b2 = await client.rechte('Bash', { command: 'npm ci' }, 'toolu_b2')
      const frage = await client.werkzeug('frage_stefan', { frage: 'Noch da?', optionen: [] }, { 'claudecode/toolUseId': 'toolu_b3' })
      pruefe(b2.behavior === 'deny' && Date.now() - start >= 1400 && frage === KEINE_ANTWORT && protokoll.some((x) => x.art === 'zeitueberschreitung' && x.tool_use_id === 'toolu_b2') && protokoll.at(-1)?.art === 'frage_ohne_antwort', '(r4) Wartegrenze ⇒ deny (zeitueberschreitung); Frage ⇒ „keine Antwort von Stefan“.', `(r4) ${JSON.stringify({ b2, frage, protokoll: protokoll.map((x) => x.art) })}`)
      client.beende()
    }
    ende.erfuelle()
    await warteBis(() => lauf?.fertig)
    await s.schliessen()
  }

  // ── (r6) Leitstand weg bzw. Umgebung fehlt ─────────────────────────────────────────────────────────────────────
  {
    const weg = createServer()
    await new Promise((r) => weg.listen(0, '127.0.0.1', r))
    const port = weg.address().port
    await new Promise((r) => weg.close(r))
    const client = starteClient({ command: process.execPath, args: [SKRIPT], env: { WORKFORCE_RUECKFRAGE_URL: `http://127.0.0.1:${port}/api`, WORKFORCE_RUECKFRAGE_TOKEN: 'a'.repeat(64) } })
    const rechte = await client.rechte('Bash', { command: 'ls' }, 'toolu_r6')
    const frage = await client.werkzeug('frage_stefan', { frage: 'x?', optionen: [] })
    client.beende()
    const leer = starteClient({ command: process.execPath, args: [SKRIPT], env: { WORKFORCE_RUECKFRAGE_URL: '', WORKFORCE_RUECKFRAGE_TOKEN: '' } })
    const leerRechte = await leer.rechte('Write', { file_path: 'x' }, 'toolu_r6b')
    leer.beende()
    pruefe(rechte.behavior === 'deny' && frage === KEINE_ANTWORT && leerRechte.behavior === 'deny' && nurJsonRpc(client), '(r6) Leitstand weg bzw. Umgebung fehlt ⇒ deny und „keine Antwort von Stefan“, stdout nur JSON-RPC.', `(r6) ${JSON.stringify({ rechte, frage, leerRechte })}`)
  }

  // ── (r8) A1/A2 und (a1) mit Schalter an: ohne url abgelehnt, D13 frei, nicht berechtigte Läufe ohne Kanal ────────
  {
    const u = baueUmgebung('r8')
    const s = await starteServer(u, () => ({ rueckfrage: { an: true } }))
    const ablehnung = await starteAblauf(s, await legeAblaufAn(u, s, SCHRITT_AUSFUEHRUNG, 'r8'))
    const review = await starteAblauf(s, await legeAblaufAn(u, s, SCHRITT_REVIEW, 'r8-review'))
    const reviewLauf = await warteBis(() => s.aufrufe.find((a) => a.rolle === 'code-reviewer'))
    pruefe(
      ablehnung.status >= 400 && /rueckfrage\.url/.test(ablehnung.koerper.grund ?? '') && !s.aufrufe.some((a) => a.rolle === 'ausfuehrung') && review.status === 202 && reviewLauf,
      '(r8) Kanal an ohne url ⇒ Start im normalen Weg abgelehnt; danach startet ein anderer Ablauf (D13 frei).',
      `(r8) Ablehnung ${ablehnung.status} ${JSON.stringify(ablehnung.koerper)}, Review ${review.status}`
    )
    if (reviewLauf) pruefe(reviewLauf.eingaben.rueckfrageKanal === undefined && reviewLauf.eingaben.aufrufEingaben.permissionPromptTool === undefined, '(a1) Schalter an, Rolle Review ⇒ kein Kanal, kein permission-prompt-tool.', '(a1) Review-Lauf trägt Kanal-Felder')
    await warteBis(() => reviewLauf?.fertig)
    await s.schliessen()
    // A1 direkt: Katalog-MCP mit id 'rueckfrage' ⇒ normaler Ablehnungsweg, kein Wurf
    const katalog = { id: 'rueckfrage', typ: 'extern', unterart: 'mcp', freigabe: 'FREIGEGEBEN', wirkung: 'lokal', installation: { version: '1', mcp_server: { command: 'node', args: [] }, werkzeuge: ['mcp__rueckfrage__x'] } }
    const roh = { rolle: 'ausfuehrung', anfragen: [], budget: u.vorlage.standardBudget, aufrufEingaben: { modell: 'claude-sonnet-5' }, auftragId: 'gate' }
    const kanal = { url: 'http://127.0.0.1:1', token: 'c'.repeat(64), skriptPfad: SKRIPT, nodePfad: process.execPath, warteGrenzeMs: 600000 }
    let ergebnis
    let wurf = null
    try {
      ergebnis = loeseAusfuehrungsEingabenAuf(roh, 'schreibend', 'AUFTRAG', u.vorlage, u.repoWurzel, { leseAusfuehrungsVorbedingung: () => ({ ok: true }), mcpEintraege: [katalog], rueckfrage: kanal })
    } catch (fehler) {
      wurf = fehler
    }
    pruefe(wurf === null && ergebnis?.ok === false && /schon belegt/.test(ergebnis.grund), '(r8) A1: Katalog-MCP „rueckfrage“ ⇒ { ok: false } mit Grund, kein Wurf.', `(r8) ${wurf?.message ?? JSON.stringify(ergebnis)}`)
    const mitKatalog = loeseAusfuehrungsEingabenAuf(roh, 'schreibend', 'AUFTRAG', u.vorlage, u.repoWurzel, { leseAusfuehrungsVorbedingung: () => ({ ok: true }), mcpEintraege: [{ ...katalog, id: 'katalog', installation: { ...katalog.installation, werkzeuge: ['mcp__katalog__x'] } }], rueckfrage: kanal })
    const server = mitKatalog.ok ? Object.keys(JSON.parse(mitKatalog.eingaben.aufrufEingaben.mcpConfig).mcpServers) : []
    pruefe(mitKatalog.ok && server.join(',') === 'katalog,rueckfrage' && mitKatalog.eingaben.aufrufEingaben.werkzeugsatz.erlaubte_werkzeuge.includes('mcp__katalog__x'), '(a2) Katalog-MCP und rueckfrage gemeinsam in der mcp-config.', `(a2) ${JSON.stringify(mitKatalog.ok ? server : mitKatalog.grund)}`)
  }

  // ── (a1) Schalter an, Projektordner ohne Arbeitsordner ⇒ kein Kanal ────────────────────────────────────────────────
  {
    const u = baueUmgebung('a1p')
    const s = await starteServer(u, (basisUrl) => ({ arbeitsordner: false, rueckfrage: { an: true, url: `${basisUrl}/api` } }))
    const start = await starteAblauf(s, await legeAblaufAn(u, s, SCHRITT_AUSFUEHRUNG, 'a1p'))
    const lauf = await warteBis(() => s.aufrufe.find((a) => a.rolle === 'ausfuehrung'))
    pruefe(start.status === 202 && lauf && lauf.cwd === undefined && lauf.eingaben.rueckfrageKanal === undefined && lauf.eingaben.aufrufEingaben.permissionPromptTool === undefined && lauf.eingaben.aufrufEingaben.mcpConfig === undefined, '(a1) Schalter an, Ausführung im Projektordner ⇒ kein Kanal, Argv ohne Rückfrage-Teile.', `(a1) Projektordner: ${start.status} ${JSON.stringify(lauf?.eingaben?.aufrufEingaben)}`)
    await warteBis(() => lauf?.fertig)
    await s.schliessen()
  }

  // ── (a1) Schalter aus (Standard), Arbeitsordner, keine url ⇒ Lauf normal, Argv bitgleich ─────────────────────────
  {
    const u = baueUmgebung('a1')
    const s = await starteServer(u)
    const start = await starteAblauf(s, await legeAblaufAn(u, s, SCHRITT_AUSFUEHRUNG, 'a1'))
    const lauf = await warteBis(() => s.aufrufe.find((a) => a.rolle === 'ausfuehrung'))
    if (!lauf) befunde.push(`(a1) Schalter aus: kein Lauf (${start.status} ${JSON.stringify(start.koerper)})`)
    else {
      const a = lauf.eingaben.aufrufEingaben
      const argv = baueAufruf({ ...a, prompt: 'x' })
      const baustein = ergaenzeRueckfrageAufruf(a, undefined)
      pruefe(
        start.status === 202 && lauf.cwd !== undefined && lauf.eingaben.rueckfrageKanal === undefined && a.permissionPromptTool === undefined && a.mcpConfig === undefined && !a.werkzeugsatz.erlaubte_werkzeuge.includes(FRAGE_WERKZEUG) && !argv.includes('--permission-prompt-tool') && argv[argv.indexOf('--mcp-config') + 1] === '{"mcpServers":{}}',
        '(a1) Schalter aus: Lauf im Arbeitsordner ohne url startet normal, kein Kanal, kein --permission-prompt-tool, mcp-config Standard.',
        `(a1) ${JSON.stringify({ status: start.status, a })}`
      )
      pruefe(baustein.ok && baustein.aufrufEingaben === a && JSON.stringify(baueAufruf({ ...baustein.aufrufEingaben, prompt: 'x' })) === JSON.stringify(argv), '(a1) Baustein ohne Kanal liefert dasselbe Objekt, Argv bitgleich.', '(a1) Baustein ohne Kanal verändert die Eingaben')
    }
    await warteBis(() => lauf?.fertig)
    await s.schliessen()
  }

  // ── (s) Body-Sperre für permissionPromptTool (Plan §9, qa 1 / code-reviewer 1) ──────────────────────────────────────
  {
    const body = { laufId: randomUUID(), auftragId: 'gate-auftrag', werkzeugsatz: 'lesend', rolle: 'ausfuehrung', anfragen: [], budget: { maxElemente: 5 }, aufrufEingaben: { modell: 'gate-modell', permissionPromptTool: 'mcp__katalog__x' } }
    const direkt = pruefeStartauftrag(body)
    const u = baueUmgebung('s')
    const s = await starteServer(u)
    const antwort = await fetch(`${s.basisUrl}/api/laeufe`, { method: 'POST', body: JSON.stringify(body) })
    const koerper = await antwort.json().catch(() => ({}))
    await s.schliessen()
    pruefe(direkt.ok === false && /permissionPromptTool/.test(direkt.grund ?? '') && antwort.status === 400 && /permissionPromptTool/.test(koerper.grund ?? '') && s.aufrufe.length === 0, '(s) pruefeStartauftrag und POST /api/laeufe lehnen aufrufEingaben.permissionPromptTool ab (400, kein Lauf).', `(s) ${JSON.stringify({ direkt, status: antwort.status, koerper })}`)
  }

  // ── (a2) Init-Gate kennt den Rückfrage-Server ──────────────────────────────────────────────────────────────────
  {
    const init = (mcp) => ({ skills: [], slash_commands: [], tools: [], plugins: [], mcp_servers: mcp.map((name) => ({ name })) })
    const mit = pruefeInitZeile(init(['rueckfrage']), { skills: [], mcpServer: ['rueckfrage'] })
    const ohne = pruefeInitZeile(init([]), { skills: [], mcpServer: ['rueckfrage'] })
    const fremd = pruefeInitZeile(init(['rueckfrage']), { skills: [], mcpServer: [] })
    pruefe(mit === null && /fehlend: rueckfrage/.test(ohne ?? '') && /fremd: rueckfrage/.test(fremd ?? ''), '(a2) pruefeInitZeile: rueckfrage als übergeben ⇒ ok; fehlt bzw. nicht übergeben ⇒ Verstoß.', `(a2) ${JSON.stringify({ mit, ohne, fremd })}`)
  }

  // ── (f) Quelltext-Invarianten ───────────────────────────────────────────────────────────────────────────────────
  {
    const quelltext = readFileSync('scripts/leitstand-server.mjs', 'utf8')
    const starts = quelltext.split('starteWorkflowSchritt(').length - 1
    const schreiber = quelltext.split(`${'schreibeWorkflow'}${'Fortschritt'}(`).length - 1
    const gelesen = quelltext.split(`.${'eingefroren'}`).length - 1
    pruefe(starts === 6 && schreiber === 14 && gelesen === 13, '(f) starteWorkflowSchritt( 6×, Workflow-Schreiber 14 / GESTOPPT-Schutz 13 (F-228 unverändert).', `(f) Zählungen ${starts} / ${schreiber} / ${gelesen} (erwartet 6 / 14 / 13)`)
    // B2b-3b-2b-2a-1 (Advisor B1/B2): „kein Produktaufrufer setzt die Einschalt-Option“ gilt mit dem Opt-in absichtlich nicht mehr;
    // gleich streng: jeder erzeugeRequestHandler(-/baueProjektHandlerMap(-Aufruf nennt rueckfrage… nur über rueckfrageOptionFuer, und
    // rueckfrageStand stammt genau einmal aus rueckfrageBasisAusUmgebung(process.env, PORT) (ohne LEITSTAND_RUECKFRAGE=1 ⇒ {}).
    const leitstandModule = readdirSync('scripts/leitstand').filter((n) => n.endsWith('.mjs') && !n.endsWith('.test.mjs')).map((n) => `scripts/leitstand/${n}`)
    const optIn = pruefeKanalNurUeberOptIn([{ pfad: 'scripts/leitstand-server.mjs', text: quelltext }, ...leitstandModule.map((pfad) => ({ pfad, text: readFileSync(pfad, 'utf8') }))])
    pruefe(optIn.handlerAufrufe >= 2 && optIn.befunde.length === 0, `(f) Kanal nur über das Opt-in (${optIn.handlerAufrufe} Aufrufe von erzeugeRequestHandler(; rueckfrage nur über rueckfrageOptionFuer).`, `(f) ${optIn.befunde.join('; ') || `nur ${optIn.handlerAufrufe} Aufrufe gefunden`}`)
    // src/** (ohne Tests): erzeugt keinen Handler, setzt permissionPromptTool nur im Baustein.
    const srcDateien = []
    const sammle = (ordner) => {
      for (const name of readdirSync(ordner)) {
        const pfad = join(ordner, name)
        if (statSync(pfad).isDirectory()) sammle(pfad)
        else if (name.endsWith('.ts') && !name.endsWith('.test.ts')) srcDateien.push(pfad)
      }
    }
    sammle('src')
    const verdacht = srcDateien.filter((pfad) => {
      const text = readFileSync(pfad, 'utf8')
      const imBaustein = pfad.replaceAll('\\', '/').endsWith('src/rueckfrage/index.ts')
      return text.includes('erzeugeRequestHandler(') || /\brueckfrage:\s*\{/.test(text) || (!imBaustein && /permissionPromptTool:\s*['"`]/.test(text))
    })
    pruefe(verdacht.length === 0, `(f) src/** (${srcDateien.length} Dateien ohne Tests) setzt die Einschalt-Option nicht; permissionPromptTool nur im Baustein.`, `(f) Verdacht in ${verdacht.join(', ')}`)
    const zuweisung = quelltext.indexOf('rueckfrage: { url: rueckfrage.url')
    const bedingung = quelltext.lastIndexOf('if (rueckfrageAn && ', zuweisung)
    pruefe(zuweisung > 0 && quelltext.split('rueckfrage: { url:').length === 2 && bedingung > 0 && zuweisung - bedingung < 800, '(f) die einzige Einschalt-Zuweisung in leitstand-server.mjs steht hinter „if (rueckfrageAn && …“.', `(f) Zuweisung ${zuweisung}, Bedingung ${bedingung}`)
  }
} finally {
  for (const kind of kinder) kind.kill()
  for (const dienst of dienste) if (dienst.listening) await new Promise((r) => dienst.close(() => r()))
  for (const pfad of aufraeumen) {
    try {
      // Worktrees zuerst abmelden, sonst bleibt der Ordner gesperrt (Windows).
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
