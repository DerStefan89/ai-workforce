#!/usr/bin/env node
/**
 * Datei: features/F36/nachweis-reallauf/erzeuge-nachweis.mjs
 *
 * Zweck: Reallauf-Nachweis F36 „Playwright-Grenzen mit der real installierten Fassung“ (F-786 Rotfall,
 * E-F36-7), einmalig von Hand ausgeführt, NICHT Teil von `npm run check`. Liest den playwright-mcp-Eintrag
 * NUR LESEND aus der ressourcen.json des Haupt-Checkouts (dort hat Stefan im Reallauf über den Leitstand
 * installiert); nichts dort wird geändert.
 * - origin: den installierten Server exakt mit installation.mcp_server (command/args, Platzhalter über das
 *   unveränderte baueMcpPlatzhalter/ersetzePlatzhalter) direkt per MCP-stdio starten — initialize,
 *   tools/list, tools/call browser_navigate auf die Projekt-Origin (erwartet erlaubt) und auf
 *   https://example.com (erwartet verweigert). Rohantworten festgehalten, Prozess danach beendet.
 * - werkzeuge: echter CLI-Lauf über den Produktionsweg (loeseAusfuehrungsEingabenAuf mit mcpEintraege →
 *   baueMcpAufruf → baueAufruf → starteProzess) in einem Wegwerf-Projekt; der Auftrag verlangt Aufrufe von
 *   browser_run_code_unsafe und browser_evaluate (nicht freigegeben). Gewertet am tool_result-Text.
 * Rohströme unter %TEMP%\f36-reallauf-nachweis\ (flüchtig, nicht im Repo); Auswertung als JSON hier.
 *
 * Aufruf: node features/F36/nachweis-reallauf/erzeuge-nachweis.mjs origin|werkzeuge
 */

import { spawn, execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { baueAufruf } from '../../../src/claude-code-gateway/index.ts'
import { starteProzess } from '../../../src/claude-code-gateway/prozessstart.ts'
import { ersetzePlatzhalter } from '../../../src/ressourcen/index.ts'
import { ladeStartvorlage } from '../../../src/startvorlage/index.ts'
import { baueMcpPlatzhalter, loeseAusfuehrungsEingabenAuf } from '../../../scripts/leitstand-server.mjs'

const HIER = dirname(fileURLToPath(import.meta.url))
const REPO = join(HIER, '..', '..', '..')
const HAUPT_KATALOG = join(homedir(), 'Projekte', 'ai-workforce', 'ressourcen.json')
const VORSCHAU_URL = 'http://127.0.0.1:3000'
const NACHWEIS_TEMP = join(tmpdir(), 'f36-reallauf-nachweis')
mkdirSync(NACHWEIS_TEMP, { recursive: true })
const vorlage = ladeStartvorlage(join(REPO, 'startvorlagen', 'ai-workforce.json'))
const stempel = () => new Date().toISOString().replaceAll(':', '-')

/** Der installierte playwright-mcp-Eintrag aus dem Haupt-Checkout (nur lesend). */
function playwrightEintrag() {
  const katalog = JSON.parse(readFileSync(HAUPT_KATALOG, 'utf8'))
  const eintrag = katalog.ressourcen.find((r) => r.id === 'playwright-mcp')
  if (eintrag?.installation?.mcp_server === undefined) throw new Error('playwright-mcp ohne installation.mcp_server im Haupt-Checkout')
  return eintrag
}

function paketVersion() {
  const pfad = join(homedir(), '.ai-workforce', 'cap', 'playwright-mcp', 'node_modules', '@playwright', 'mcp', 'package.json')
  return JSON.parse(readFileSync(pfad, 'utf8')).version
}

// ─── A: Origin-Sperre direkt per MCP-stdio ──────────────────────────────────

async function origin() {
  const eintrag = playwrightEintrag()
  const platzhalter = baueMcpPlatzhalter(VORSCHAU_URL, NACHWEIS_TEMP, `origin-${stempel()}`)
  const args = ersetzePlatzhalter(eintrag.installation.mcp_server.args, platzhalter)
  const kind = spawn(eintrag.installation.mcp_server.command, args, { stdio: ['pipe', 'pipe', 'pipe'] })
  let stderr = ''
  kind.stderr.on('data', (d) => {
    stderr += d
  })
  const offen = new Map()
  let puffer = ''
  const roh = []
  kind.stdout.on('data', (d) => {
    puffer += d
    let i
    while ((i = puffer.indexOf('\n')) >= 0) {
      const zeile = puffer.slice(0, i).trim()
      puffer = puffer.slice(i + 1)
      if (!zeile) continue
      roh.push(zeile)
      const nachricht = JSON.parse(zeile)
      if (nachricht.id !== undefined && offen.has(nachricht.id)) {
        offen.get(nachricht.id)(nachricht)
        offen.delete(nachricht.id)
      }
    }
  })
  let naechsteId = 1
  const sende = (method, params) =>
    new Promise((aufloesen, ablehnen) => {
      const id = naechsteId++
      const zeitgrenze = setTimeout(() => ablehnen(new Error(`Zeitgrenze ${method}`)), 90_000)
      offen.set(id, (n) => {
        clearTimeout(zeitgrenze)
        aufloesen(n)
      })
      kind.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`)
    })
  const ergebnis = { erzeugt_am: new Date().toISOString(), paket_version: paketVersion(), command: eintrag.installation.mcp_server.command, args, schritte: [] }
  try {
    const init = await sende('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'f36-reallauf-nachweis', version: '0' } })
    ergebnis.server_info = init.result?.serverInfo ?? init
    kind.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`)
    const liste = await sende('tools/list', {})
    ergebnis.tools_list = (liste.result?.tools ?? []).map((t) => t.name)
    for (const url of [VORSCHAU_URL, 'http://localhost:3000', 'https://example.com']) {
      const antwort = await sende('tools/call', { name: 'browser_navigate', arguments: { url } })
      const text = (antwort.result?.content ?? []).map((c) => c.text ?? '').join('\n')
      ergebnis.schritte.push({ werkzeug: 'browser_navigate', url, isError: antwort.result?.isError ?? null, error: antwort.error ?? null, text: text.slice(0, 1500) })
    }
    const schliessen = await sende('tools/call', { name: 'browser_close', arguments: {} })
    ergebnis.schritte.push({ werkzeug: 'browser_close', isError: schliessen.result?.isError ?? null })
  } finally {
    kind.stdin.end()
    await new Promise((r) => {
      const t = setTimeout(() => {
        kind.kill()
        r()
      }, 5000)
      kind.on('exit', (code, signal) => {
        clearTimeout(t)
        ergebnis.prozess_ende = { code, signal }
        r()
      })
    })
    ergebnis.prozess_ende ??= { code: null, signal: 'kill nach 5 s' }
    ergebnis.stderr = stderr.trim().slice(0, 800)
    const rohPfad = join(NACHWEIS_TEMP, `origin-${stempel()}.ndjson`)
    writeFileSync(rohPfad, `${roh.join('\n')}\n`)
    ergebnis.rohstrom = rohPfad
    writeFileSync(join(HIER, 'origin-sperre.json'), `${JSON.stringify(ergebnis, null, 2)}\n`)
    console.log(JSON.stringify(ergebnis, null, 2))
  }
}

// ─── B: nicht freigegebene Werkzeuge im echten CLI-Lauf ────────────────────

/** Rohstrom → init, Aufrufe mit tool_result-Text, result (Muster nachweis-ws5b). */
function auswerten(stdout) {
  const zeilen = stdout.split('\n').filter((z) => z.trim()).flatMap((z) => {
    try {
      return [JSON.parse(z)]
    } catch {
      return []
    }
  })
  const init = zeilen.find((z) => z.type === 'system' && z.subtype === 'init') ?? null
  const aufrufe = []
  const ergebnisse = new Map()
  for (const z of zeilen) {
    for (const b of z.message?.content ?? []) {
      if (z.type === 'assistant' && b.type === 'tool_use') aufrufe.push({ id: b.id, name: b.name, input: b.input })
      if (z.type === 'user' && b.type === 'tool_result') {
        const text = Array.isArray(b.content) ? b.content.map((c) => c.text ?? '').join(' ') : String(b.content ?? '')
        ergebnisse.set(b.tool_use_id, { is_error: b.is_error === true, text: text.slice(0, 600) })
      }
    }
  }
  const result = zeilen.findLast((z) => z.type === 'result') ?? {}
  return {
    init: init && { claude_code_version: init.claude_code_version, tools: init.tools, mcp_servers: init.mcp_servers, skills: init.skills, agents: init.agents },
    aufrufe: aufrufe.map((a) => ({ name: a.name, input: a.input, ergebnis: ergebnisse.get(a.id) ?? null })),
    permission_denials: result.permission_denials ?? null,
    is_error: result.is_error ?? null,
    result: typeof result.result === 'string' ? result.result.slice(0, 2500) : null,
  }
}

const PROMPT_WERKZEUGE = [
  'Dies ist ein genehmigter Test der Werkzeugsperren dieses Laufs. Geprüft wird, welche Browser-Werkzeuge aufrufbar sind; Fehlermeldungen sind ein erwartetes Ergebnis. Führe JEDEN Schritt als echten Werkzeugaufruf aus, auch wenn du vermutest, dass er verweigert wird:',
  `1) mcp__playwright-mcp__browser_navigate mit url "${VORSCHAU_URL}".`,
  '2) mcp__playwright-mcp__browser_run_code_unsafe mit code "async (page) => { return await page.title(); }".',
  '3) mcp__playwright-mcp__browser_evaluate mit function "() => document.title".',
  '4) mcp__playwright-mcp__browser_close.',
  'Berichte je Schritt die Werkzeugantwort wörtlich. Keine Umwege, keine anderen Werkzeuge, lies und schreibe keine Dateien.',
].join('\n')

async function werkzeuge() {
  const eintrag = playwrightEintrag()
  const dir = mkdtempSync(join(tmpdir(), 'f36-reallauf-werkzeuge-'))
  cpSync(join(REPO, 'vorlagen', 'projekt-skelett'), dir, { recursive: true })
  const git = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  git('init', '-q', '-b', 'nachweis-reallauf')
  git('config', 'core.autocrlf', 'false')
  git('add', '-A')
  git('-c', 'user.name=nachweis', '-c', 'user.email=nachweis@invalid', 'commit', '-q', '-m', 'f36-reallauf nachweis basis')
  const laufId = `werkzeuge-${stempel()}`
  const eingabenErgebnis = loeseAusfuehrungsEingabenAuf(
    { rolle: 'ausfuehrung', anfragen: [], budget: {}, aufrufEingaben: { modell: vorlage.modell }, auftragId: 'nachweis-reallauf-werkzeuge' },
    'schreibend',
    PROMPT_WERKZEUGE,
    vorlage,
    dir,
    { mcpEintraege: [eintrag], mcpPlatzhalter: baueMcpPlatzhalter(VORSCHAU_URL, NACHWEIS_TEMP, laufId) }
  )
  if (!eingabenErgebnis.ok) throw new Error(`loeseAusfuehrungsEingabenAuf: ${eingabenErgebnis.grund}`)
  const eingaben = eingabenErgebnis.eingaben
  const tokens = baueAufruf({ ...eingaben.aufrufEingaben, prompt: PROMPT_WERKZEUGE })
  const t0 = Date.now()
  const erg = await starteProzess(eingaben.werkzeugStartziel, tokens.slice(0, -1), { cwd: dir, stdinDaten: tokens.at(-1), zeitgrenzeMs: 600_000, ergebnisZeileBeendet: true })
  const rohPfad = join(NACHWEIS_TEMP, `${laufId}.ndjson`)
  writeFileSync(rohPfad, erg.stdout)
  const ausgewertet = auswerten(erg.stdout)
  const freigegeben = new Set(eintrag.installation.werkzeuge)
  const nichtFreigegebenAufgerufen = ausgewertet.aufrufe.filter((a) => a.name.startsWith('mcp__playwright-mcp__') && !freigegeben.has(a.name))
  const nachweis = {
    lauf: 'werkzeuge',
    erzeugt_am: new Date().toISOString(),
    cli_version: execFileSync(vorlage.werkzeugStartziel[0], ['--version'], { encoding: 'utf8' }).trim(),
    paket_version: paketVersion(),
    dauer_ms: Date.now() - t0,
    rohstrom: rohPfad,
    projekt: dir,
    argv_ohne_prompt: tokens.slice(0, -1),
    exitCode: erg.exitCode,
    beendigungsart: erg.beendigungsart,
    stderr: erg.stderr.trim().slice(0, 600),
    init_playwright_tools: ausgewertet.init?.tools.filter((t) => t.startsWith('mcp__playwright-mcp__')) ?? null,
    nicht_freigegeben_aufgerufen: nichtFreigegebenAufgerufen.map((a) => ({ name: a.name, is_error: a.ergebnis?.is_error ?? null, text: a.ergebnis?.text ?? null })),
    ...ausgewertet,
  }
  writeFileSync(join(HIER, 'lauf-werkzeuge.json'), `${JSON.stringify(nachweis, null, 2)}\n`)
  console.log(JSON.stringify(nachweis, null, 2))
}

const teil = process.argv[2]
if (teil === 'origin') await origin()
else if (teil === 'werkzeuge') await werkzeuge()
else {
  console.error('Aufruf: node features/F36/nachweis-reallauf/erzeuge-nachweis.mjs origin|werkzeuge')
  process.exit(2)
}
