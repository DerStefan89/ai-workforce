#!/usr/bin/env node
/**
 * Datei: scripts/check-f36-ws5a-installation.mjs
 *
 * Zweck: Gate für F36 WS-5a „MCP-Installation“ (features/F36/feature.md WS-5a, AK11 für MCP,
 * E-F36-6/7/9, F-786 Teil mcp, F-808). Fixture-Katalog in einer Wegwerf-Installationswurzel (ein
 * installierbarer lokaler MCP `pw-mcp` mit herkunft.paket und installation_vorlage, ein
 * extern_lesend-MCP und ein lokaler MCP ohne paket), Wegwerf-cap- und Laufausgabe-Ordner,
 * Wegwerf-Projekt-Repo, gestubbte Runner (npm, Serverstart) und Attrappen-Starter — kein Netz, kein
 * Prozess, ~/.ai-workforce unberührt. Belegt am HTTP-Rundlauf:
 * (a) Vorbereiten liefert version/integrity/lizenz/kosten/wirkung/werkzeuge/Zielordner und eintragHash;
 *     Installieren mit einem eintragHash, der nicht mehr zum Katalog passt (Vorlage nach der Anzeige
 *     geändert) → 409, nichts installiert;
 * (b) der npm-Aufruf trägt --ignore-scripts, --save-exact und die exakte Version;
 * (c) integrity-Abweichung im Lockfile → abgelehnt, ressourcen.json bitgleich, Zielordner entfernt;
 * (d) bin fehlt → abgelehnt;
 * (e) Serverstart ohne alle werkzeuge → abgelehnt;
 * (f) Erfolg → installation + FREIGEGEBEN, danach steht der Eintrag in „Wird genutzt“;
 * (g) ohne vorschau_url → „Passt, nicht im Lauf“ mit Grund, Lauf mit leerem --mcp-config;
 * (h) mit vorschau_url → --mcp-config mit ersetzten Platzhaltern: --allowed-origins mit Port,
 *     --output-dir unter der Laufausgabe-Wurzel (außerhalb des Projekts), Einzelnamen in --allowedTools;
 * (i) installation nach der Anzeige geändert → Freigabe 409, nichts festgehalten (F-808);
 * (j) wirkung ≠ lokal oder ohne herkunft.paket → 400 (Vorbereiten und Installieren); Anfrage einer
 *     fremden Seite (Sec-Fetch-Site/Origin) → 403;
 * (k) die Adresse jedes browser_navigate steht in der Beobachtung und in der Laufansicht-Zeile;
 * (Cache) die Anzeige der Empfehlung wird zwischengespeichert (Auftrag, Katalog-mtime, HEAD).
 *
 * Wird aufgerufen von: `npm run check`.
 *
 * Aufruf: node scripts/check-f36-ws5a-installation.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { baueAufruf, leseBeobachtung, validiereLaufakteDaten } from '../src/claude-code-gateway/index.ts'
import { ladeArtefaktVersion, registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { PROJEKT_URL_FEHLT, validiereRessourcenDaten } from '../src/ressourcen/index.ts'
import { eintragsKennung } from '../src/ressourcen/installation.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { registriereWorkflow } from '../src/workflow/index.ts'
import { formatiereBeobachtung } from '../public/leitstand/beobachtung-zeile.js'
import { erzeugeRequestHandler, ermittleAusfuehrungsEmpfehlungGecached } from './leitstand-server.mjs'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []
console.log('\n=== F36-WS-5a-Installations-Check ===\n')

const STILL = () => {}
const vorlage = ladeStartvorlage('startvorlagen/ai-workforce.json')
const VERSION = '1.2.3'
const INTEGRITY = 'sha512-R0FURS1GSVhUVVJF'
const PAKET = '@fixture/pw'
const VORSCHAU_URL = 'http://localhost:5173'
const LEERE_MCP_CONFIG = '{"mcpServers":{}}'

/** Fixture-Katalog: installierbarer lokaler MCP, extern_lesend-MCP mit paket, lokaler MCP ohne paket. */
function katalog() {
  const mcp = (id, felder) => ({
    id,
    typ: 'extern',
    name: `Gate ${id}`,
    beschreibung: 'Fixture.',
    unterart: 'mcp',
    wirkung: 'lokal',
    lizenz: 'Apache-2.0 (Fixture)',
    kosten: 'lokal kostenlos (Fixture)',
    capabilities: ['BROWSER_AUTOMATION'],
    freigabe: 'OFFEN',
    herkunft: { art: 'extern', url: `https://example.invalid/${id}`, paket: `npm:${PAKET}` },
    installation_vorlage: {
      bin: 'cli.js',
      args: ['--headless', '--isolated', '--output-dir', '{ausgabe_ordner}', '--allowed-origins', '{projekt_origins}'],
      werkzeuge: [`mcp__${id}__browser_navigate`, `mcp__${id}__browser_snapshot`],
    },
    anwendbar_wenn: { task_typen_any: ['bugfix'] },
    ...felder,
  })
  return {
    ressourcen_schema: 'v0',
    ressourcen: [
      mcp('pw-mcp', {}),
      mcp('lesend-mcp', { wirkung: 'extern_lesend' }),
      mcp('ohne-paket', { herkunft: { art: 'extern', url: 'https://example.invalid/ohne-paket' } }),
    ],
  }
}

/**
 * Stub-Runner (kein Netz, kein Prozess). npm view liefert VERSION/INTEGRITY; npm install legt Paket und
 * Lockfile an. Abweichungen je Fall über o: lockIntegrity, binFehlt, werkzeuge (was tools/list meldet).
 */
function stubRunner(o = {}) {
  const aufrufe = { npm: [], server: [] }
  const ok = (stdout = '') => ({ code: 0, stdout, stderr: '', zeitueberschritten: false })
  return {
    aufrufe,
    npm: async (args) => {
      aufrufe.npm.push(args)
      if (args[0] === 'view') return ok(JSON.stringify({ version: VERSION, 'dist.integrity': INTEGRITY, license: 'Apache-2.0' }))
      const prefix = args[args.indexOf('--prefix') + 1]
      const paketOrdner = join(prefix, 'node_modules', ...PAKET.split('/'))
      mkdirSync(paketOrdner, { recursive: true })
      if (!o.binFehlt) writeFileSync(join(paketOrdner, 'cli.js'), '')
      writeFileSync(join(prefix, 'package-lock.json'), JSON.stringify({ packages: { [`node_modules/${PAKET}`]: { version: VERSION, integrity: o.lockIntegrity ?? INTEGRITY } } }))
      return ok()
    },
    pruefeServer: async (command, args) => {
      aufrufe.server.push([command, ...args])
      return { ok: true, werkzeuge: o.werkzeuge ?? ['browser_navigate', 'browser_snapshot', 'browser_click'] }
    },
  }
}

/** Wert hinter einem Flag in den Tokens ('' wenn es fehlt). */
function flagWert(tokens, flag) {
  const i = tokens.indexOf(flag)
  return i === -1 ? '' : tokens[i + 1]
}

/** Wartet bis zur Bedingung oder bis zum Zeitlimit. @returns true, wenn die Bedingung eintrat */
async function warte(bedingung, ms = 10000) {
  const start = Date.now()
  while (Date.now() - start < ms) {
    if (bedingung()) return true
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  return false
}

/**
 * Frische Umgebung: Wegwerf-Installationswurzel (Fixture-Katalog), cap- und Laufausgabe-Wurzel,
 * Projekt-Repo, Startvorlage, Server. Alles Angelegte räumt ende() ab.
 * @param o - { vorschauUrl, runner }
 */
async function umgebung(o = {}) {
  const basisVerzeichnis = `kontrollzustand-test-f36-ws5a-${randomUUID()}`
  const aufraeumen = [basisVerzeichnis]
  const ordner = (praefix) => {
    const pfad = mkdtempSync(join(tmpdir(), praefix))
    aufraeumen.push(pfad)
    return pfad
  }
  const installWurzel = ordner('f36-ws5a-install-')
  const katalogPfad = join(installWurzel, 'ressourcen.json')
  writeFileSync(katalogPfad, `${JSON.stringify(katalog(), null, 2)}\n`)
  const capWurzel = join(ordner('f36-ws5a-cap-'), 'cap')
  const laufausgabeWurzel = join(ordner('f36-ws5a-laufausgabe-'), 'laufausgabe')
  const repoWurzel = ordner('f36-ws5a-repo-')
  const git = (argumente) => execFileSync('git', argumente, { cwd: repoWurzel, encoding: 'utf8' })
  git(['init', '--quiet', '-b', 'wegwerf-branch'])
  git(['config', 'user.email', 'gate@example.invalid'])
  git(['config', 'user.name', 'Gate'])
  git(['config', 'core.autocrlf', 'false'])
  writeFileSync(join(repoWurzel, 'package.json'), `${JSON.stringify({ name: 'fremd', scripts: { check: 'node -e 0' } }, null, 2)}\n`)
  git(['add', '-A'])
  git(['commit', '--quiet', '-m', 'init'])
  const startvorlagePfad = join(ordner('f36-ws5a-vorlage-'), 'startvorlage.json')
  writeFileSync(startvorlagePfad, JSON.stringify({ ...vorlage, pruefbefehl: [process.execPath, '-e', '0'] }, null, 2))
  const profilReferenz = leiteProfilReferenzAb(ladeStartvorlage(startvorlagePfad))
  const ladeOptionen = { basisVerzeichnis, schreiber: STILL }
  const gesehen = { eingaben: null, laufId: null }
  const fuehreAufgabeDurchFn = async (laufId, _profilReferenz, eingaben) => {
    gesehen.eingaben = eingaben
    gesehen.laufId = laufId
    return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
  }
  const runner = o.runner ?? stubRunner()
  const server = createServer(
    erzeugeRequestHandler({
      basisVerzeichnis,
      fuehreAufgabeDurchFn,
      repoWurzel,
      installWurzel,
      startvorlagePfad,
      capWurzel,
      laufausgabeWurzel,
      installationsRunner: runner,
      ...(o.vorschauUrl !== undefined ? { vorschauUrl: o.vorschauUrl } : {}),
    })
  )
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const basisUrl = `http://127.0.0.1:${server.address().port}`
  const post = async (pfad, body) => {
    const antwort = await fetch(`${basisUrl}${pfad}`, { method: 'POST', body: JSON.stringify(body ?? {}) })
    return { status: antwort.status, inhalt: await antwort.json().catch(() => ({})) }
  }
  return {
    installWurzel,
    katalogPfad,
    capWurzel,
    laufausgabeWurzel,
    repoWurzel,
    runner,
    gesehen,
    basisUrl,
    post,
    ladeOptionen,
    profilReferenz,
    async ende() {
      await new Promise((resolve) => server.close(resolve))
      for (const pfad of aufraeumen) raeumeVerzeichnis(pfad)
    },
  }
}

/**
 * Legt Auftrag, Router-Artefakt (bugfix) und einen Workflow mit ZWINGEND-Ausführungsschritt (schreibend)
 * an und liefert GET /api/workflows/<id>.
 * @returns { workflowId, schrittId, detail }
 */
async function workflowAmZwingendStart(u) {
  const auftrag = await u.post('/api/auftraege', { titel: 'F36-WS-5a-Gate', auftragstext: 'GATE-AUFTRAG-F36-WS5A' })
  if (auftrag.status !== 201) throw new Error(`POST /api/auftraege erwartet 201, erhalten ${auftrag.status}`)
  const { auftragId } = auftrag.inhalt
  const klassifikation = { kontrolltiefe: 'standard', risikoklasse: 'niedrig', task_typen: ['bugfix'], rueckfragen: [], begruendung: 'Gate.' }
  registriereKernArtefakt(
    `router-${auftragId}`,
    u.profilReferenz,
    { erzeuger: 'kern', schritt: 'router-lauf' },
    { router_ergebnis_schema: 'v0', auftrag_id: auftragId, lauf_id: 'gate', worker: 'claude-code', klassifikation, vorlage: 'standard', beobachtung: null, erstellt_am: new Date().toISOString() },
    [],
    u.ladeOptionen
  )
  const workflowId = `f36-ws5a-gate-${randomUUID()}`
  const schrittId = 'schritt-1-ausfuehrung'
  registriereWorkflow(
    {
      workflow_schema: 'v0',
      workflow_id: workflowId,
      auftrag_id: auftragId,
      version: 1,
      ziel: 'F36 WS-5a Gate-Fixture.',
      status: 'OFFEN',
      aktiver_schritt_id: schrittId,
      grund: null,
      grenzen: { max_schritte: 4, max_replans: 1 },
      schritte: [
        {
          schritt_id: schrittId,
          rolle: ['ausfuehrung'][0],
          werkzeugsatz: 'schreibend',
          worker: 'claude-code',
          modell: 'claude-sonnet-5',
          eingaben: [`artefakt:auftrag-${auftragId}`],
          output_schema: null,
          freigabe: 'ZWINGEND',
          freigabe_erteilt: false,
          risiko: 'Gate-Fixture.',
          zeitgrenze_ms: 600000,
          nachfolger: null,
          status: 'OFFEN',
          lauf_id: null,
        },
      ],
    },
    u.profilReferenz,
    u.ladeOptionen
  )
  const detail = await (await fetch(`${u.basisUrl}/api/workflows/${encodeURIComponent(workflowId)}`)).json()
  return { workflowId, schrittId, detail }
}

/** Freigabe mit genau den angezeigten empfehlungIds; wartet bei 202 auf den Nachlauf. */
async function freigeben(u, wf, empfehlungIds) {
  const antwort = await u.post(`/api/workflows/${encodeURIComponent(wf.workflowId)}/freigabe`, { schrittId: wf.schrittId, entscheidung: 'FREIGEGEBEN', begruendung: 'Gate-Freigabe', empfehlungIds })
  if (antwort.status === 202 || antwort.status === 200) {
    await warte(() => u.gesehen.eingaben !== null && ladeArtefaktVersion(`pruefergebnis-${u.gesehen.laufId}`, undefined, u.ladeOptionen) !== null)
  } else {
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  return { ...antwort, festgehalten: ladeArtefaktVersion(`entscheidung-workflow-${wf.workflowId}-${wf.schrittId}`, undefined, u.ladeOptionen) !== null }
}

/** Was „Vorbereiten“ für pw-mcp anzeigt: version, integrity und eintragHash des aktuellen Katalogs. */
function angezeigt(u) {
  const eintrag = JSON.parse(readFileSync(u.katalogPfad, 'utf8')).ressourcen.find((r) => r.id === 'pw-mcp')
  return { version: VERSION, integrity: INTEGRITY, eintragHash: eintragsKennung(eintrag) }
}

const angezeigteIds = (detail) => (detail.empfehlung?.wirdGenutzt ?? []).map((e) => e.empfehlungId)

// ─── (a) Vorbereiten, (j) nicht installierbar ──
{
  const vor = befunde.length
  const u = await umgebung()
  try {
    const v = await u.post('/api/ressourcen/pw-mcp/installation/vorbereiten')
    const d = v.inhalt
    if (v.status !== 200) befunde.push(`(a) Vorbereiten erwartet 200, erhalten ${v.status} (${d.grund})`)
    else {
      const erwartet = { paket: PAKET, version: VERSION, integrity: INTEGRITY, lizenz: 'Apache-2.0 (Fixture)', kosten: 'lokal kostenlos (Fixture)', wirkung: 'lokal', zielordner: join(u.capWurzel, 'pw-mcp') }
      for (const [feld, wert] of Object.entries(erwartet)) if (d[feld] !== wert) befunde.push(`(a) Vorbereiten: ${feld} erwartet '${wert}', erhalten '${d[feld]}'`)
      if (JSON.stringify(d.werkzeuge) !== JSON.stringify(['mcp__pw-mcp__browser_navigate', 'mcp__pw-mcp__browser_snapshot'])) befunde.push(`(a) Vorbereiten: werkzeuge ${JSON.stringify(d.werkzeuge)}`)
      if (u.runner.aufrufe.npm.some((a) => a[0] !== 'view') || existsSync(u.capWurzel)) befunde.push('(a) Vorbereiten hat mehr als npm view ausgeführt oder den Zielordner angelegt')
      if (!/^[0-9a-f]{64}$/.test(d.eintragHash ?? '')) befunde.push(`(a) Vorbereiten ohne eintragHash: ${d.eintragHash}`)
      // Vorlage ändert sich nach der Anzeige (neues Werkzeug) → Installieren mit dem angezeigten Hash wird abgelehnt.
      const daten = JSON.parse(readFileSync(u.katalogPfad, 'utf8'))
      daten.ressourcen.find((r) => r.id === 'pw-mcp').installation_vorlage.werkzeuge.push('mcp__pw-mcp__browser_run_code_unsafe')
      writeFileSync(u.katalogPfad, `${JSON.stringify(daten, null, 2)}\n`)
      const katalogGeaendert = readFileSync(u.katalogPfad, 'utf8')
      const veraltet = await u.post('/api/ressourcen/pw-mcp/installation', { version: d.version, integrity: d.integrity, eintragHash: d.eintragHash })
      if (veraltet.status !== 409 || !/seit der Anzeige geändert/.test(veraltet.inhalt.grund ?? '')) befunde.push(`(a) Installieren nach geänderter Vorlage: erwartet 409, erhalten ${veraltet.status} (${veraltet.inhalt.grund})`)
      if (u.runner.aufrufe.npm.some((a) => a[0] === 'install') || existsSync(u.capWurzel) || readFileSync(u.katalogPfad, 'utf8') !== katalogGeaendert) befunde.push('(a) geänderte Vorlage: trotzdem installiert oder Katalog geschrieben')
      writeFileSync(u.katalogPfad, `${JSON.stringify(katalog(), null, 2)}\n`)
    }
    if (befunde.length === vor) console.log('✓ (a) Vorbereiten: paket, exakte version, integrity, Lizenz, Kosten, Wirkung, werkzeuge, Zielordner, eintragHash — nur npm view, nichts angelegt; Vorlage nach der Anzeige geändert → Installieren 409, nichts installiert.')

    const vorJ = befunde.length
    const katalogVorher = readFileSync(u.katalogPfad, 'utf8')
    for (const id of ['lesend-mcp', 'ohne-paket']) {
      const vj = await u.post(`/api/ressourcen/${id}/installation/vorbereiten`)
      const ij = await u.post(`/api/ressourcen/${id}/installation`, { version: VERSION, integrity: INTEGRITY, eintragHash: '0'.repeat(64) })
      if (vj.status !== 400 || ij.status !== 400) befunde.push(`(j) ${id}: erwartet 400/400, erhalten ${vj.status}/${ij.status} (${vj.inhalt.grund} | ${ij.inhalt.grund})`)
    }
    if (readFileSync(u.katalogPfad, 'utf8') !== katalogVorher || existsSync(u.capWurzel)) befunde.push('(j) abgelehnte Anfragen haben den Katalog oder den cap-Ordner berührt')
    // Fremde Seite im selben Browser (CSRF): Sec-Fetch-Site cross-site bzw. fremder Origin → 403, nichts gestartet.
    for (const kopf of [{ 'sec-fetch-site': 'cross-site' }, { origin: 'https://boese.example' }]) {
      const antwort = await fetch(`${u.basisUrl}/api/ressourcen/pw-mcp/installation`, { method: 'POST', headers: kopf, body: JSON.stringify(angezeigt(u)) })
      if (antwort.status !== 403) befunde.push(`(j) fremde Seite ${JSON.stringify(kopf)}: erwartet 403, erhalten ${antwort.status}`)
    }
    if (u.runner.aufrufe.npm.some((a) => a[0] === 'install')) befunde.push('(j) Anfrage einer fremden Seite hat npm install ausgelöst')
    const unbekannt = await u.post('/api/ressourcen/gibt-es-nicht/installation/vorbereiten')
    if (unbekannt.status !== 404) befunde.push(`(j) unbekannte id: erwartet 404, erhalten ${unbekannt.status}`)
    if (befunde.length === vorJ) console.log('✓ (j) wirkung ≠ lokal und ohne herkunft.paket → 400 (Vorbereiten und Installieren), unbekannte id 404, Anfrage einer fremden Seite 403; nichts berührt.')
  } catch (fehler) {
    befunde.push(`(a)/(j) Vorbereitung gescheitert: ${fehler.message}`)
  } finally {
    await u.ende()
  }
}

// ─── (c) integrity-Abweichung, (d) bin fehlt, (e) Werkzeuge fehlen ──
for (const [fall, runnerOptionen, muster] of [
  ['(c)', { lockIntegrity: 'sha512-QU5ERVJFUw==' }, /integrity im Lockfile ≠ angezeigte/],
  ['(d)', { binFehlt: true }, /bin 'cli\.js' fehlt/],
  ['(e)', { werkzeuge: ['browser_navigate'] }, /fehlend: mcp__pw-mcp__browser_snapshot/],
]) {
  const vor = befunde.length
  const u = await umgebung({ runner: stubRunner(runnerOptionen) })
  try {
    const katalogVorher = readFileSync(u.katalogPfad, 'utf8')
    const antwort = await u.post('/api/ressourcen/pw-mcp/installation', angezeigt(u))
    if (antwort.status !== 422 || !muster.test(antwort.inhalt.grund ?? '')) befunde.push(`${fall} erwartet 422 mit ${muster}, erhalten ${antwort.status} (${antwort.inhalt.grund})`)
    if (readFileSync(u.katalogPfad, 'utf8') !== katalogVorher) befunde.push(`${fall} ressourcen.json wurde trotz Ablehnung verändert`)
    if (existsSync(join(u.capWurzel, 'pw-mcp'))) befunde.push(`${fall} Zielordner blieb nach der Ablehnung liegen`)
    if (fall === '(e)' && u.runner.aufrufe.server.length !== 1) befunde.push('(e) Serverstart-Prüfung wurde nicht genau einmal aufgerufen')
  } catch (fehler) {
    befunde.push(`${fall} Vorbereitung gescheitert: ${fehler.message}`)
  } finally {
    await u.ende()
  }
  const text = { '(c)': 'integrity im Lockfile ≠ angezeigte', '(d)': 'bin fehlt', '(e)': 'Server bietet nicht alle werkzeuge' }[fall]
  if (befunde.length === vor) console.log(`✓ ${fall} ${text} → 422 mit Klartext-Grund, ressourcen.json bitgleich, Zielordner entfernt.`)
}

// ─── (b) npm-Aufruf, (f) Erfolg → Wird genutzt, (h) Platzhalter im Lauf ──
{
  const u = await umgebung({ vorschauUrl: VORSCHAU_URL })
  try {
    const vorB = befunde.length
    const antwort = await u.post('/api/ressourcen/pw-mcp/installation', angezeigt(u))
    const install = u.runner.aufrufe.npm.find((a) => a[0] === 'install') ?? []
    for (const teil of [`${PAKET}@${VERSION}`, '--ignore-scripts', '--save-exact', '--prefix']) if (!install.includes(teil)) befunde.push(`(b) npm install ohne '${teil}': ${JSON.stringify(install)}`)
    if (install[install.indexOf('--prefix') + 1] !== join(u.capWurzel, 'pw-mcp')) befunde.push(`(b) --prefix ist nicht <cap>/pw-mcp: ${install[install.indexOf('--prefix') + 1]}`)
    const server = u.runner.aufrufe.server[0] ?? []
    if (!server.includes('--allowed-origins') || server.some((a) => /\{[a-z_]+\}/.test(a))) befunde.push(`(b) Serverstart-Prüfung ohne ersetzte Platzhalter: ${JSON.stringify(server)}`)
    if (befunde.length === vorB) console.log('✓ (b) npm install <paket>@<exakte Version> --prefix <cap>/<id> --ignore-scripts --save-exact; Serverstart-Prüfung mit ersetzten Platzhaltern.')

    const vorF = befunde.length
    if (antwort.status !== 200) befunde.push(`(f) Installation erwartet 200, erhalten ${antwort.status} (${antwort.inhalt.grund})`)
    const daten = JSON.parse(readFileSync(u.katalogPfad, 'utf8'))
    const pw = daten.ressourcen.find((r) => r.id === 'pw-mcp')
    if (validiereRessourcenDaten(daten).length > 0) befunde.push(`(f) Katalog nach Installation ungültig: ${validiereRessourcenDaten(daten).join('; ')}`)
    if (pw.freigabe !== 'FREIGEGEBEN' || pw.installation?.version !== VERSION || pw.installation?.mcp_server?.command !== process.execPath) befunde.push(`(f) Eintrag nicht FREIGEGEBEN mit installation: ${JSON.stringify(pw.installation)}`)
    if (!String(pw.installation?.mcp_server?.args?.[0]).endsWith(join('node_modules', '@fixture', 'pw', 'cli.js')) || pw.installation.mcp_server.args.some((a) => /npx/.test(a))) befunde.push(`(f) args[0] ist nicht der bin im cap-Ordner: ${JSON.stringify(pw.installation?.mcp_server?.args)}`)
    const wf = await workflowAmZwingendStart(u)
    const e = wf.detail.empfehlung
    if (JSON.stringify(e?.wirdGenutzt?.map((x) => x.id)) !== '["pw-mcp"]' || !/^pw-mcp@[0-9a-f]{64}$/.test(e.wirdGenutzt[0].empfehlungId ?? '')) befunde.push(`(f) nach Installation nicht in „Wird genutzt“ (mit empfehlungId): ${JSON.stringify(e)}`)
    if (e?.projektUrl !== VORSCHAU_URL) befunde.push(`(f) Empfehlung zeigt die Projekt-URL nicht: ${e?.projektUrl}`)
    if (befunde.length === vorF) console.log('✓ (f) Erfolg: installation (node + bin im cap-Ordner, Vorlagen-args) + FREIGEGEBEN; danach „Wird genutzt“ mit empfehlungId und Projekt-URL.')

    const vorH = befunde.length
    const start = await freigeben(u, wf, angezeigteIds(wf.detail))
    if (start.status !== 202 || u.gesehen.eingaben === null) befunde.push(`(h) Freigabe erwartet 202 mit Starter-Aufruf, erhalten ${start.status} (${start.inhalt.grund})`)
    else {
      const tokens = baueAufruf({ ...u.gesehen.eingaben.aufrufEingaben, prompt: 'GATE' })
      const config = JSON.parse(flagWert(tokens, '--mcp-config') || '{}')
      const args = config.mcpServers?.['pw-mcp']?.args ?? []
      const origins = args[args.indexOf('--allowed-origins') + 1]
      const ausgabe = args[args.indexOf('--output-dir') + 1] ?? ''
      if (origins !== 'http://localhost:5173;http://127.0.0.1:5173') befunde.push(`(h) --allowed-origins ist nicht beide Origins mit Port: ${origins}`)
      if (ausgabe !== join(u.laufausgabeWurzel, u.gesehen.laufId)) befunde.push(`(h) --output-dir ist nicht <laufausgabe>/<laufId>: ${ausgabe}`)
      if (!relative(u.repoWurzel, ausgabe).startsWith('..')) befunde.push(`(h) --output-dir liegt im Projekt: ${ausgabe}`)
      if (args.some((a) => /\{[a-z_]+\}/.test(a))) befunde.push(`(h) Platzhalter nicht ersetzt: ${JSON.stringify(args)}`)
      const mcpNamen = flagWert(tokens, '--allowedTools').split(',').filter((w) => w.startsWith('mcp__'))
      if (JSON.stringify(mcpNamen) !== JSON.stringify(['mcp__pw-mcp__browser_navigate', 'mcp__pw-mcp__browser_snapshot'])) befunde.push(`(h) --allowedTools trägt nicht genau die Einzelnamen: ${JSON.stringify(mcpNamen)}`)
    }
    if (befunde.length === vorH) console.log('✓ (h) Mit vorschau_url: --mcp-config mit ersetzten Platzhaltern (--allowed-origins localhost/127.0.0.1 mit Port, --output-dir <laufausgabe>/<laufId> außerhalb des Projekts), Einzelnamen in --allowedTools.')
  } catch (fehler) {
    befunde.push(`(b)/(f)/(h) Vorbereitung gescheitert: ${fehler.message}`)
  } finally {
    await u.ende()
  }
}

// ─── (g) ohne vorschau_url: nicht im Lauf ──
{
  const vor = befunde.length
  const u = await umgebung()
  try {
    const antwort = await u.post('/api/ressourcen/pw-mcp/installation', angezeigt(u))
    if (antwort.status !== 200) throw new Error(`Installation erwartet 200, erhalten ${antwort.status} (${antwort.inhalt.grund})`)
    const wf = await workflowAmZwingendStart(u)
    const e = wf.detail.empfehlung
    const pw = e?.passtNichtImLauf?.find((x) => x.id === 'pw-mcp')
    if (e?.wirdGenutzt?.length !== 0 || pw === undefined || !pw.grund.includes(PROJEKT_URL_FEHLT)) befunde.push(`(g) ohne vorschau_url nicht „Passt, nicht im Lauf“ mit Grund: ${JSON.stringify(e)}`)
    if (e?.projektUrl !== null) befunde.push(`(g) projektUrl sollte null sein: ${e?.projektUrl}`)
    const start = await freigeben(u, wf, angezeigteIds(wf.detail))
    if (start.status !== 202 || u.gesehen.eingaben === null) befunde.push(`(g) Freigabe erwartet 202, erhalten ${start.status} (${start.inhalt.grund})`)
    else if (flagWert(baueAufruf({ ...u.gesehen.eingaben.aufrufEingaben, prompt: 'GATE' }), '--mcp-config') !== LEERE_MCP_CONFIG) befunde.push('(g) ohne vorschau_url trägt der Lauf trotzdem einen MCP')
    // Selbst ein API-Client, der die Kennung kennt, kommt ohne Projekt-URL nicht durch (Menge weicht ab).
    const kennung = `pw-mcp@${'0'.repeat(64)}`
    const direkt = await u.post('/api/laeufe', { laufId: `f36-ws5a-${randomUUID()}`, rolle: 'ausfuehrung', anfragen: [], budget: {}, aufrufEingaben: { modell: 'claude-sonnet-5' }, werkzeugsatz: 'schreibend', auftragId: wf.detail.daten.auftrag_id, empfehlungIds: [kennung] })
    if (direkt.status !== 400) befunde.push(`(g) POST /api/laeufe mit pw-mcp-Kennung ohne vorschau_url: erwartet 400, erhalten ${direkt.status}`)
  } catch (fehler) {
    befunde.push(`(g) Vorbereitung gescheitert: ${fehler.message}`)
  } finally {
    await u.ende()
  }
  if (befunde.length === vor) console.log(`✓ (g) Ohne vorschau_url: „Passt, nicht im Lauf“ mit „${PROJEKT_URL_FEHLT}“, Lauf mit --mcp-config '${LEERE_MCP_CONFIG}'.`)
}

// ─── (i) installation nach der Anzeige geändert → Start abgelehnt (F-808) ──
{
  const vor = befunde.length
  const u = await umgebung({ vorschauUrl: VORSCHAU_URL })
  try {
    const antwort = await u.post('/api/ressourcen/pw-mcp/installation', angezeigt(u))
    if (antwort.status !== 200) throw new Error(`Installation erwartet 200, erhalten ${antwort.status} (${antwort.inhalt.grund})`)
    const wf = await workflowAmZwingendStart(u)
    const ids = angezeigteIds(wf.detail)
    if (ids.length !== 1) throw new Error(`Anzeige trägt nicht genau eine Kennung: ${JSON.stringify(ids)}`)
    // Gleiche id, gleiche Menge — nur die installation dahinter ändert sich (zusätzliches Argument).
    const daten = JSON.parse(readFileSync(u.katalogPfad, 'utf8'))
    daten.ressourcen.find((r) => r.id === 'pw-mcp').installation.mcp_server.args.push('--caps=vision')
    writeFileSync(u.katalogPfad, `${JSON.stringify(daten, null, 2)}\n`)
    const start = await freigeben(u, wf, ids)
    if (start.status !== 409 || !/seit der Anzeige geändert/.test(start.inhalt.grund ?? '')) befunde.push(`(i) erwartet 409 „seit der Anzeige geändert“, erhalten ${start.status} (${start.inhalt.grund})`)
    if (start.festgehalten || u.gesehen.eingaben !== null) befunde.push('(i) Freigabe trotz geänderter installation festgehalten oder gestartet')
    const direkt = await u.post('/api/laeufe', { laufId: `f36-ws5a-${randomUUID()}`, rolle: 'ausfuehrung', anfragen: [], budget: {}, aufrufEingaben: { modell: 'claude-sonnet-5' }, werkzeugsatz: 'schreibend', auftragId: wf.detail.daten.auftrag_id, empfehlungIds: ids })
    if (direkt.status !== 400 || u.gesehen.eingaben !== null) befunde.push(`(i) POST /api/laeufe mit alter Kennung: erwartet 400 ohne Start, erhalten ${direkt.status}`)
    const neu = await (await fetch(`${u.basisUrl}/api/workflows/${encodeURIComponent(wf.workflowId)}`)).json()
    if (JSON.stringify(angezeigteIds(neu)) === JSON.stringify(ids)) befunde.push('(i) die Anzeige zeigt nach dem abgelehnten Start noch die alte Kennung (Zwischenspeicher nicht erneuert)')
  } catch (fehler) {
    befunde.push(`(i) Vorbereitung gescheitert: ${fehler.message}`)
  } finally {
    await u.ende()
  }
  if (befunde.length === vor) console.log('✓ (i) installation nach der Anzeige geändert (gleiche id): Freigabe 409 (nichts festgehalten), POST /api/laeufe 400, die Anzeige zeigt danach die neue Kennung (F-808).')
}

// ─── (k) browser_navigate-Adresse in der Beobachtung und der Laufansicht ──
{
  const vor = befunde.length
  const init = JSON.stringify({ type: 'system', subtype: 'init', tools: ['Read', 'mcp__pw-mcp__browser_navigate'], mcp_servers: [{ name: 'pw-mcp' }], agents: [], skills: [] })
  const aufruf = (id, name, input) => JSON.stringify({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'tool_use', id, name, input }] }, parent_tool_use_id: null })
  const zeilen = [
    init,
    aufruf('a', 'mcp__pw-mcp__browser_navigate', { url: 'http://localhost:5173/' }),
    aufruf('b', 'mcp__pw-mcp__browser_snapshot', {}),
    aufruf('c', 'mcp__pw-mcp__browser_navigate', { url: 'https://example.com/' }),
  ]
  const beobachtung = leseBeobachtung(zeilen)
  if (JSON.stringify(beobachtung?.navigate_adressen) !== JSON.stringify(['http://localhost:5173/', 'https://example.com/'])) befunde.push(`(k) navigate_adressen: ${JSON.stringify(beobachtung?.navigate_adressen)}`)
  const verstoesse = validiereLaufakteDaten({
    laufakte_schema: 'v0',
    lauf_id: 'lauf-k',
    werkzeug_version_deklariert: '2.1.284',
    berechtigungskontext: 'ausfuehrung',
    arbeitsverzeichnis_pfad: 'C:\\repo',
    modell_beobachtet: null,
    beobachtungsbasis_vollstaendig: true,
    rohstrom_referenz: { pfad: 'C:\\roh\\rohstrom.json', inhalts_hash: 'a'.repeat(64) },
    erstellt_am: new Date().toISOString(),
    beobachtung,
  })
  if (verstoesse.length > 0) befunde.push(`(k) Laufakte mit navigate_adressen ungültig: ${verstoesse.join('; ')}`)
  if (!formatiereBeobachtung(beobachtung).includes('Navigiert: [http://localhost:5173/, https://example.com/]')) befunde.push(`(k) Laufansicht zeigt die Adressen nicht: ${formatiereBeobachtung(beobachtung)}`)
  if (befunde.length === vor) console.log('✓ (k) browser_navigate: input.url je Aufruf in beobachtung.navigate_adressen (Laufakte gültig) und in der Laufansicht („Navigiert: […]“).')
}

// ─── Zwischenspeicher der Anzeige (Poll-Last aus WS-3) ──
{
  const vor = befunde.length
  const u = await umgebung({ vorschauUrl: VORSCHAU_URL })
  try {
    const wf = await workflowAmZwingendStart(u)
    const auftragId = wf.detail.daten.auftrag_id
    const holen = () => ermittleAusfuehrungsEmpfehlungGecached(auftragId, u.repoWurzel, u.installWurzel, 'egal', u.ladeOptionen, { vorschauUrl: VORSCHAU_URL })
    const eins = holen()
    if (holen() !== eins) befunde.push('(Cache) zweiter Aufruf ohne Änderung rechnet neu (anderes Objekt)')
    // Katalog ändern (Größe/mtime) → neu gerechnet; neuer Commit im Projekt (HEAD) → neu gerechnet.
    writeFileSync(u.katalogPfad, `${readFileSync(u.katalogPfad, 'utf8')}\n`)
    const zwei = holen()
    if (zwei === eins) befunde.push('(Cache) geänderter Katalog liefert das alte Ergebnis')
    execFileSync('git', ['commit', '--quiet', '--allow-empty', '-m', 'neu'], { cwd: u.repoWurzel })
    if (holen() === zwei) befunde.push('(Cache) neuer HEAD liefert das alte Ergebnis')
  } catch (fehler) {
    befunde.push(`(Cache) Vorbereitung gescheitert: ${fehler.message}`)
  } finally {
    await u.ende()
  }
  if (befunde.length === vor) console.log('✓ (Cache) Anzeige zwischengespeichert: gleicher Auftrag/Katalog/HEAD → dasselbe Ergebnis; geänderter Katalog oder neuer HEAD → neu gerechnet.')
}

if (befunde.length > 0) {
  console.error(`\n✗ ${befunde.length} Befund(e):`)
  for (const befund of befunde) console.error(`  - ${befund}`)
  process.exit(1)
}
console.log('\n✓ F36-WS-5a-Installations-Check sauber.')
