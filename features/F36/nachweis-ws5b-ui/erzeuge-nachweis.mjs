#!/usr/bin/env node
/**
 * Datei: features/F36/nachweis-ws5b-ui/erzeuge-nachweis.mjs
 *
 * Zweck: F36 WS-5b (F-622) — Render-Nachweis „Freigeben & installieren“ für einen externen Skill am
 * ZWINGEND-Start (Muster features/F36/nachweis-ws5a-ui/). Je Szenario ein eigener Fixture-Leitstand
 * (Port 4178) mit Wegwerf-Installationswurzel (Fixture-ressourcen.json: installierbarer Skill
 * `frontend-design` mit installation_vorlage, `browser-use` ohne Vorlage), Wegwerf-cap-Ordner,
 * Wegwerf-Projekt-Repo, Auftrag/Router-Artefakt/Workflow (ein ZWINGEND-Ausführungsschritt) und
 * GESTUBBTEM git-Runner (kein Netz; ls-remote liefert eine feste SHA, checkout legt die Fixture-Dateien an):
 * - 'erfolg': Knopf → Bestätigungsblock (Repo, Ref, SHA, skill_pfad, Lizenz, Kosten, Zielordner,
 *   Hinweis) → Installieren → Eintrag in „Wird genutzt“; dazu der Bestätigungsblock bei 400 px;
 * - 'fehler': Quelle ohne SKILL.md → Fehlermeldung, nichts freigegeben.
 *
 * Wird aufgerufen von: Hand (node features/F36/nachweis-ws5b-ui/erzeuge-nachweis.mjs).
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
const PORT = 4178
const WORKFLOW_ID = 'f36-ws5b-nachweis'
const SHA = 'fbe07fb6ce7d51d8e86ca6efdf050059894cdb80'
const QUELLPFAD = 'plugins/frontend-design/skills/frontend-design'

const KATALOG = {
  ressourcen_schema: 'v0',
  ressourcen: [
    {
      id: 'frontend-design',
      typ: 'extern',
      name: 'frontend-design',
      beschreibung: 'Fixture.',
      unterart: 'skill',
      lizenz: 'Apache-2.0 im Plugin-LICENSE',
      kosten: 'Kein separater Pluginpreis; Modellquota',
      capabilities: ['UI_UX_DESIGN'],
      freigabe: 'OFFEN',
      herkunft: { art: 'extern', url: 'https://github.com/anthropics/claude-plugins-official/tree/main/plugins/frontend-design' },
      installation_vorlage: { skill_pfad: 'skills/frontend-design' },
      anwendbar_wenn: { task_typen_any: ['bugfix'] },
    },
    {
      id: 'browser-use',
      typ: 'extern',
      name: 'browser-use',
      beschreibung: 'Fixture.',
      unterart: 'skill',
      capabilities: ['BROWSER_AUTOMATION'],
      freigabe: 'OFFEN',
      herkunft: { art: 'extern', url: 'https://github.com/browser-use/browser-use/tree/main/skills/browser-use' },
      anwendbar_wenn: { task_typen_any: ['bugfix'] },
    },
  ],
}

/**
 * Gestubbter git-Runner (kein Netz): ls-remote → feste SHA; init/fetch → ok; ls-tree → Fixture-Einträge;
 * checkout → legt die Fixture-Dateien im Temp-Repo an. mitSkillMd false → Quelle ohne SKILL.md.
 */
function stubGit(mitSkillMd) {
  const dateien = mitSkillMd
    ? { 'SKILL.md': '---\nname: frontend-design\ndescription: Fixture für den Render-Nachweis.\n---\n# Frontend Design\n', 'LICENSE.txt': 'Apache-2.0' }
    : { 'README.md': 'kein Skill' }
  const ok = (stdout = '') => ({ code: 0, stdout, stderr: '', zeitueberschritten: false })
  return async (args) => {
    const befehl = args.find((a) => ['ls-remote', 'init', 'fetch', 'ls-tree', 'checkout'].includes(a))
    const repo = args[args.indexOf('-C') + 1]
    if (befehl === 'ls-remote') return ok(`${SHA}\trefs/heads/main\n`)
    if (befehl === 'init') {
      mkdirSync(args.at(-1), { recursive: true })
      return ok()
    }
    if (befehl === 'ls-tree') return ok(Object.keys(dateien).map((d) => `100644 blob ${'0'.repeat(40)}\t${QUELLPFAD}/${d}\0`).join(''))
    if (befehl === 'checkout') {
      const ziel = join(repo, ...QUELLPFAD.split('/'))
      mkdirSync(ziel, { recursive: true })
      for (const [d, inhalt] of Object.entries(dateien)) writeFileSync(join(ziel, d), inhalt)
      // Kurze Pause, damit der Fortschrittstext kurz sichtbar ist (reine Anzeige).
      await new Promise((r) => setTimeout(r, 300))
      return ok()
    }
    return ok()
  }
}

async function starteLeitstand(szenario, mitSkillMd) {
  const basisVerzeichnis = `kontrollzustand-test-f36-ws5b-nachweis-${szenario}`
  raeumeVerzeichnis(basisVerzeichnis)
  const install = mkdtempSync(join(tmpdir(), 'f36-ws5b-nachweis-install-'))
  for (const ordner of ['schemas', 'workflow-vorlagen', 'docs/harness']) cpSync(join(REPO_WURZEL, ordner), join(install, ordner), { recursive: true })
  writeFileSync(join(install, 'ressourcen.json'), `${JSON.stringify(KATALOG, null, 2)}\n`)
  const home = mkdtempSync(join(tmpdir(), 'f36-ws5b-nachweis-home-'))
  const repo = mkdtempSync(join(tmpdir(), 'f36-ws5b-nachweis-repo-'))
  const git = (a) => execFileSync('git', a, { cwd: repo })
  git(['init', '-q', '-b', 'wegwerf'])
  git(['config', 'user.email', 'nachweis@example.invalid'])
  git(['config', 'user.name', 'Nachweis'])
  git(['config', 'core.autocrlf', 'false'])
  writeFileSync(join(repo, 'package.json'), '{"name":"fixture","scripts":{"check":"node -e 0"}}\n')
  git(['add', '-A'])
  git(['commit', '-q', '-m', 'init'])
  const vorlageDir = mkdtempSync(join(tmpdir(), 'f36-ws5b-nachweis-vorlage-'))
  const startvorlagePfad = join(vorlageDir, 'startvorlage.json')
  writeFileSync(startvorlagePfad, JSON.stringify({ ...ladeStartvorlage(join(REPO_WURZEL, 'startvorlagen/ai-workforce.json')), pruefbefehl: [process.execPath, '-e', '0'] }))
  const profil = leiteProfilReferenzAb(ladeStartvorlage(startvorlagePfad))
  const lo = { basisVerzeichnis, schreiber: () => {} }
  const handler = erzeugeRequestHandler({
    basisVerzeichnis,
    projektId: `f36-ws5b-${szenario}`,
    fuehreAufgabeDurchFn: () => new Promise(() => {}),
    repoWurzel: repo,
    installWurzel: install,
    startvorlagePfad,
    capWurzel: join(home, 'cap'),
    laufausgabeWurzel: join(home, 'laufausgabe'),
    installationsRunner: { npm: async () => ({ code: 1, stdout: '', stderr: '', zeitueberschritten: false }), pruefeServer: async () => ({ ok: false, grund: 'kein MCP' }), git: stubGit(mitSkillMd) },
  })
  const server = createServer(handler)
  await new Promise((ok, fehler) => {
    server.once('error', fehler)
    server.listen(PORT, '127.0.0.1', ok)
  })
  const auftrag = await (await fetch(`http://127.0.0.1:${PORT}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel: 'Landingpage gestalten', auftragstext: 'Fixture' }) })).json()
  registriereKernArtefakt(`router-${auftrag.auftragId}`, profil, { erzeuger: 'kern', schritt: 'router-lauf' }, { klassifikation: { task_typen: ['bugfix'] } }, [], lo)
  registriereWorkflow(
    {
      workflow_schema: 'v0',
      workflow_id: WORKFLOW_ID,
      auftrag_id: auftrag.auftragId,
      version: 1,
      ziel: 'Render-Nachweis F36 WS-5b.',
      status: 'OFFEN',
      aktiver_schritt_id: 'schritt-1-ausfuehrung',
      grund: null,
      grenzen: { max_schritte: 4, max_replans: 1 },
      schritte: [
        { schritt_id: 'schritt-1-ausfuehrung', rolle: 'ausfuehrung', werkzeugsatz: 'schreibend', worker: 'claude-code', modell: 'claude-sonnet-5', eingaben: [`artefakt:auftrag-${auftrag.auftragId}`], output_schema: null, freigabe: 'ZWINGEND', freigabe_erteilt: false, risiko: 'Fixture.', zeitgrenze_ms: 600000, nachfolger: null, status: 'OFFEN', lauf_id: null },
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

function renderNachweis(klickfolge, ausgabe) {
  return new Promise((ok, fehler) => {
    const kind = spawn('node', ['scripts/render-nachweis.mjs', join('features/F36/nachweis-ws5b-ui', klickfolge), join('features/F36/nachweis-ws5b-ui', ausgabe)], { cwd: REPO_WURZEL, stdio: 'inherit' })
    kind.on('exit', (code) => (code === 0 ? ok() : fehler(new Error(`render-nachweis.mjs endete mit Exit-Code ${code}`))))
    kind.on('error', fehler)
  })
}

const szenarien = [
  { name: 'erfolg', mitSkillMd: true, klickfolgen: [['klickfolge-erfolg.json', 'erfolg'], ['klickfolge-bestaetigung-400.json', 'bestaetigung-400']] },
  { name: 'fehler', mitSkillMd: false, klickfolgen: [['klickfolge-fehler.json', 'fehler']] },
]
for (const szenario of szenarien) {
  for (const [klickfolge, ausgabe] of szenario.klickfolgen) {
    const leitstand = await starteLeitstand(szenario.name, szenario.mitSkillMd)
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
