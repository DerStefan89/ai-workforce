#!/usr/bin/env node
/**
 * Datei: features/F36/nachweis-ws5a-ui/erzeuge-nachweis.mjs
 *
 * Zweck: F36 WS-5a (F-622) — Render-Nachweis „Freigeben & installieren“ am ZWINGEND-Start. Startet je
 * Szenario einen eigenen Fixture-Leitstand (Port 4177, Muster features/F36/nachweis-ws3-ui/) mit
 * Wegwerf-Installationswurzel (Fixture-ressourcen.json: installierbarer lokaler MCP `playwright-mcp`
 * mit herkunft.paket und installation_vorlage, ein offener externer Skill), Wegwerf-cap- und
 * Laufausgabe-Ordner, Wegwerf-Projekt-Repo, registriertem Auftrag/Router-Artefakt/Workflow (ein
 * ZWINGEND-Ausführungsschritt) und GESTUBBTEN Installations-Runnern (kein Netz, kein npm):
 * - 'erfolg' (vorschau_url gesetzt): Knopf → Bestätigungsblock → Installieren → Eintrag in „Wird genutzt“;
 *   dazu der Bestätigungsblock bei 400 px;
 * - 'fehler' (ohne vorschau_url, Lockfile-integrity weicht ab): Knopf → Installieren → Fehlermeldung;
 * - 'ohne-url' (ohne vorschau_url, Installation gelingt): Erfolgsmeldung mit Commit-Hinweis, der Eintrag
 *   bleibt wegen fehlender Projekt-URL in „Passt, nicht im Lauf“.
 *
 * Wird aufgerufen von: Hand (node features/F36/nachweis-ws5a-ui/erzeuge-nachweis.mjs).
 * NICHT Teil von `npm run check` (braucht einen echten Browser).
 *
 * Wichtig: Nur Fixture-Daten und Wegwerf-Ordner — echtes ressourcen.json und ~/.ai-workforce bleiben unberührt.
 */

import { execFileSync, spawn } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { raeumeVerzeichnis } from '../../../scripts/_aufraeumen.ts'
import { erzeugeRequestHandler } from '../../../scripts/leitstand-server.mjs'
import { registriereKernArtefakt } from '../../../src/lineage-registry/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../../../src/startvorlage/index.ts'
import { registriereWorkflow } from '../../../src/workflow/index.ts'

const HIER = dirname(fileURLToPath(import.meta.url))
const REPO_WURZEL = join(HIER, '..', '..', '..')
const PORT = 4177
const WORKFLOW_ID = 'f36-ws5a-nachweis'
const VERSION = '0.0.83'
const INTEGRITY = 'sha512-oNcl+Ae2/IAjhfPeP46BfIkSakfmprY+aOtkv5MjrQ4lPav4/yNtPhL0iq8SlIM90oApWgBDUxaNKvktazUKOg=='

const KATALOG = {
  ressourcen_schema: 'v0',
  ressourcen: [
    {
      id: 'playwright-mcp',
      typ: 'extern',
      name: 'Playwright MCP',
      beschreibung: 'Fixture.',
      unterart: 'mcp',
      wirkung: 'lokal',
      lizenz: 'Apache-2.0 (GitHub-Metadaten)',
      kosten: 'Server lokal kostenlos; Browser und Agentenquota',
      capabilities: ['BROWSER_AUTOMATION'],
      freigabe: 'OFFEN',
      herkunft: { art: 'extern', url: 'https://github.com/microsoft/playwright-mcp', paket: 'npm:@playwright/mcp' },
      installation_vorlage: {
        bin: 'cli.js',
        args: ['--headless', '--isolated', '--output-dir', '{ausgabe_ordner}', '--allowed-origins', '{projekt_origins}'],
        werkzeuge: ['mcp__playwright-mcp__browser_navigate', 'mcp__playwright-mcp__browser_snapshot', 'mcp__playwright-mcp__browser_take_screenshot', 'mcp__playwright-mcp__browser_close'],
      },
      anwendbar_wenn: { task_typen_any: ['bugfix'], pfad_muster_any: ['package.json'] },
    },
    {
      id: 'frontend-design',
      typ: 'extern',
      name: 'frontend-design',
      beschreibung: 'Fixture.',
      unterart: 'skill',
      capabilities: ['UI_UX_DESIGN'],
      freigabe: 'OFFEN',
      herkunft: { art: 'extern', url: 'https://example.invalid/frontend-design' },
      anwendbar_wenn: { task_typen_any: ['bugfix'] },
    },
  ],
}

/** Gestubbte Runner: npm view/install ohne Netz; lockIntegrity weicht im Fehlerszenario ab. */
function stubRunner(lockIntegrity) {
  return {
    npm: async (args) => {
      if (args[0] === 'view') return { code: 0, stdout: JSON.stringify({ version: VERSION, 'dist.integrity': INTEGRITY, license: 'Apache-2.0' }), stderr: '', zeitueberschritten: false }
      const prefix = args[args.indexOf('--prefix') + 1]
      mkdirSync(join(prefix, 'node_modules', '@playwright', 'mcp'), { recursive: true })
      writeFileSync(join(prefix, 'node_modules', '@playwright', 'mcp', 'cli.js'), '')
      writeFileSync(join(prefix, 'package-lock.json'), JSON.stringify({ packages: { 'node_modules/@playwright/mcp': { version: VERSION, integrity: lockIntegrity } } }))
      // Kurze Pause, damit der Fortschrittstext kurz sichtbar ist (reine Anzeige).
      await new Promise((r) => setTimeout(r, 300))
      return { code: 0, stdout: '', stderr: '', zeitueberschritten: false }
    },
    pruefeServer: async () => ({ ok: true, werkzeuge: ['browser_navigate', 'browser_snapshot', 'browser_take_screenshot', 'browser_close', 'browser_click'] }),
  }
}

/**
 * Baut die Umgebung eines Szenarios und startet den Fixture-Leitstand.
 * @param szenario - Kennung
 * @param optionen - { vorschauUrl, lockIntegrity }
 * @returns { schliessen }
 */
async function starteLeitstand(szenario, optionen) {
  const basisVerzeichnis = `kontrollzustand-test-f36-ws5a-nachweis-${szenario}`
  raeumeVerzeichnis(basisVerzeichnis)
  const install = mkdtempSync(join(tmpdir(), 'f36-ws5a-nachweis-install-'))
  for (const ordner of ['schemas', 'workflow-vorlagen', 'docs/harness']) cpSync(join(REPO_WURZEL, ordner), join(install, ordner), { recursive: true })
  writeFileSync(join(install, 'ressourcen.json'), `${JSON.stringify(KATALOG, null, 2)}\n`)
  const home = mkdtempSync(join(tmpdir(), 'f36-ws5a-nachweis-home-'))

  const repo = mkdtempSync(join(tmpdir(), 'f36-ws5a-nachweis-repo-'))
  const git = (a) => execFileSync('git', a, { cwd: repo })
  git(['init', '-q', '-b', 'wegwerf'])
  git(['config', 'user.email', 'nachweis@example.invalid'])
  git(['config', 'user.name', 'Nachweis'])
  git(['config', 'core.autocrlf', 'false'])
  writeFileSync(join(repo, 'package.json'), '{"name":"fixture","scripts":{"check":"node -e 0"}}\n')
  git(['add', '-A'])
  git(['commit', '-q', '-m', 'init'])

  const vorlageDir = mkdtempSync(join(tmpdir(), 'f36-ws5a-nachweis-vorlage-'))
  const startvorlagePfad = join(vorlageDir, 'startvorlage.json')
  writeFileSync(startvorlagePfad, JSON.stringify({ ...ladeStartvorlage(join(REPO_WURZEL, 'startvorlagen/ai-workforce.json')), pruefbefehl: [process.execPath, '-e', '0'] }))
  const profil = leiteProfilReferenzAb(ladeStartvorlage(startvorlagePfad))
  const lo = { basisVerzeichnis, schreiber: () => {} }

  const handler = erzeugeRequestHandler({
    basisVerzeichnis,
    projektId: `f36-ws5a-${szenario}`,
    fuehreAufgabeDurchFn: () => new Promise(() => {}),
    repoWurzel: repo,
    installWurzel: install,
    startvorlagePfad,
    capWurzel: join(home, 'cap'),
    laufausgabeWurzel: join(home, 'laufausgabe'),
    installationsRunner: stubRunner(optionen.lockIntegrity),
    vorschauUrl: optionen.vorschauUrl ?? null,
  })
  const server = createServer(handler)
  await new Promise((ok, fehler) => {
    server.once('error', fehler)
    server.listen(PORT, '127.0.0.1', ok)
  })

  const auftrag = await (await fetch(`http://127.0.0.1:${PORT}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel: 'Export-Ansicht prüfen', auftragstext: 'Fixture' }) })).json()
  registriereKernArtefakt(`router-${auftrag.auftragId}`, profil, { erzeuger: 'kern', schritt: 'router-lauf' }, { klassifikation: { task_typen: ['bugfix'] } }, [], lo)
  registriereWorkflow(
    {
      workflow_schema: 'v0',
      workflow_id: WORKFLOW_ID,
      auftrag_id: auftrag.auftragId,
      version: 1,
      ziel: 'Render-Nachweis F36 WS-5a.',
      status: 'OFFEN',
      aktiver_schritt_id: 'schritt-1-ausfuehrung',
      grund: null,
      grenzen: { max_schritte: 4, max_replans: 1 },
      schritte: [
        {
          schritt_id: 'schritt-1-ausfuehrung',
          rolle: 'ausfuehrung',
          werkzeugsatz: 'schreibend',
          worker: 'claude-code',
          modell: 'claude-sonnet-5',
          eingaben: [`artefakt:auftrag-${auftrag.auftragId}`],
          output_schema: null,
          freigabe: 'ZWINGEND',
          freigabe_erteilt: false,
          risiko: 'Fixture.',
          zeitgrenze_ms: 600000,
          nachfolger: null,
          status: 'OFFEN',
          lauf_id: null,
        },
      ],
    },
    profil,
    lo
  )

  return {
    schliessen: async () => {
      server.closeAllConnections()
      await new Promise((ok) => server.close(ok))
      for (const pfad of [basisVerzeichnis, install, repo, vorlageDir, home]) raeumeVerzeichnis(pfad)
    },
  }
}

/** Fährt eine Klickfolge per render-nachweis.mjs ab. */
function renderNachweis(klickfolge, ausgabe) {
  return new Promise((ok, fehler) => {
    const kind = spawn('node', ['scripts/render-nachweis.mjs', join('features/F36/nachweis-ws5a-ui', klickfolge), join('features/F36/nachweis-ws5a-ui', ausgabe)], { cwd: REPO_WURZEL, stdio: 'inherit' })
    kind.on('exit', (code) => (code === 0 ? ok() : fehler(new Error(`render-nachweis.mjs endete mit Exit-Code ${code}`))))
    kind.on('error', fehler)
  })
}

const szenarien = [
  { name: 'erfolg', optionen: { vorschauUrl: 'http://localhost:5173', lockIntegrity: INTEGRITY }, klickfolgen: [['klickfolge-erfolg.json', 'erfolg'], ['klickfolge-bestaetigung-400.json', 'bestaetigung-400']] },
  { name: 'fehler', optionen: { lockIntegrity: 'sha512-QU5ERVJTLQ==' }, klickfolgen: [['klickfolge-fehler.json', 'fehler']] },
  { name: 'ohne-url', optionen: { lockIntegrity: INTEGRITY }, klickfolgen: [['klickfolge-erfolg-ohne-url.json', 'erfolg-ohne-url']] },
]
for (const szenario of szenarien) {
  // Je Klickfolge ein frischer Leitstand: eine Installation verändert den Fixture-Katalog.
  for (const [klickfolge, ausgabe] of szenario.klickfolgen) {
    const leitstand = await starteLeitstand(szenario.name, szenario.optionen)
    console.log(`[erzeuge-nachweis] Szenario '${szenario.name}' (${klickfolge}) auf http://127.0.0.1:${PORT}`)
    try {
      await renderNachweis(klickfolge, ausgabe)
    } finally {
      await leitstand.schliessen()
    }
  }
}
console.log('[erzeuge-nachweis] fertig.')
process.exit(0)
