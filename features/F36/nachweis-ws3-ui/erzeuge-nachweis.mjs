#!/usr/bin/env node
/**
 * Datei: features/F36/nachweis-ws3-ui/erzeuge-nachweis.mjs
 *
 * Zweck: F36 WS-3 (AK7, F-622) — Render-Nachweis der Katalog-Empfehlung am ZWINGEND-Start. Startet
 * je Szenario einen eigenen Fixture-Leitstand (Port 4176, Muster features/F36/nachweis-ws4-ui/) mit
 * Wegwerf-Installationswurzel (Fixture-ressourcen.json: ein freigegebener lokaler MCP, offene Skills,
 * ein extern_lesend-MCP; schemas/ und workflow-vorlagen/ aus dem Repo kopiert), Wegwerf-Projekt-Repo
 * (package.json, state/findings.md mit einem Finding) und gestubbtem fuehreAufgabeDurchFn:
 * - Router-Lauf → feste Klassifikation (task_typen bugfix), der Server registriert den Workflow selbst;
 * - Ausführung → Promise bleibt offen (Lauf „läuft“, kein Prozess).
 * Szenarien: (1) Workflow-Ansicht 400 px und breit mit Freigabe, (2) Workboard mit Freigabe,
 * (3) Workboard mit Abweichung Anzeige/Start — der Katalog wird im Server-Wrapper genau beim
 * Eintreffen der Freigabe geändert (deterministischer Stellvertreter für „Katalog ändert sich
 * zwischen Anzeige und Klick“).
 *
 * Wird aufgerufen von: Hand (node features/F36/nachweis-ws3-ui/erzeuge-nachweis.mjs).
 * NICHT Teil von `npm run check` (braucht einen echten Browser).
 *
 * Wichtig: Nur Fixture-Daten; der echte Katalog hat keinen freigegebenen MCP.
 */

import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { execFileSync, spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { raeumeVerzeichnis } from '../../../scripts/_aufraeumen.ts'
import { erzeugeRequestHandler } from '../../../scripts/leitstand-server.mjs'
import { schreibeWirkungsmarke, sha256Hex } from '../../../src/checkpoint-store/index.ts'
import { registriereKernArtefakt } from '../../../src/lineage-registry/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../../../src/startvorlage/index.ts'
import { registriereWorkflow } from '../../../src/workflow/index.ts'

const HIER = dirname(fileURLToPath(import.meta.url))
const REPO_WURZEL = join(HIER, '..', '..', '..')
const PORT = 4176
const WORKFLOW_ID = 'f36-ws3-nachweis'

const eintrag = (id, extra) => ({ id, typ: 'extern', name: id, beschreibung: 'Fixture.', capabilities: ['GATE'], freigabe: 'OFFEN', herkunft: { art: 'extern', url: `https://example.invalid/${id}` }, ...extra })
const MCP = eintrag('playwright-lokal', {
  name: 'Playwright (lokal)',
  unterart: 'mcp',
  wirkung: 'lokal',
  freigabe: 'FREIGEGEBEN',
  installation: { version: '1', mcp_server: { command: 'node', args: ['server.js'] }, werkzeuge: ['mcp__playwright-lokal__browser_navigate'] },
  anwendbar_wenn: { task_typen_any: ['bugfix'], pfad_muster_any: ['package.json'] },
})
/** Fixture-Katalog; mitGeaendertemMcp = derselbe Katalog nach der „Änderung“ (MCP wieder OFFEN, ohne installation). */
function katalog(mitGeaendertemMcp = false) {
  const { installation: _entfernt, ...mcpOffen } = MCP
  return {
    ressourcen_schema: 'v0',
    ressourcen: [
      mitGeaendertemMcp ? { ...mcpOffen, freigabe: 'OFFEN' } : MCP,
      eintrag('aa-lang-skill-mit-einer-sehr-langen-kennung-ohne-umbruchstellen', {
        name: 'Ein sehr langer Name für einen offenen externen Skill, der das Layout nicht sprengen darf',
        unterart: 'skill',
        anwendbar_wenn: { task_typen_any: ['bugfix'] },
      }),
      ...['a-skill', 'b-skill', 'c-skill', 'd-skill'].map((id) => eintrag(id, { unterart: 'skill', anwendbar_wenn: { task_typen_any: ['bugfix'] } })),
      eintrag('extern-lesend', { unterart: 'mcp', wirkung: 'extern_lesend', anwendbar_wenn: { task_typen_any: ['bugfix'] } }),
    ],
  }
}

const FINDINGS = `# Findings

**F-001** · \`BUG\` · P2 · offen
Titel: Export bricht bei leeren Monaten ab.
Beschreibung: Fixture-Finding für den Render-Nachweis F36 WS-3.
Status: offen.
`

/**
 * Baut die Umgebung eines Szenarios und startet den Fixture-Leitstand.
 * @param szenario - Kennung (Verzeichnisnamen)
 * @param optionen - { workflow: WORKFLOW_ID direkt registrieren, katalogAendernBeiFreigabe }
 * @returns { schliessen }
 */
async function starteLeitstand(szenario, optionen) {
  const basisVerzeichnis = `kontrollzustand-test-f36-ws3-nachweis-${szenario}`
  raeumeVerzeichnis(basisVerzeichnis)
  const install = mkdtempSync(join(tmpdir(), 'f36-ws3-nachweis-install-'))
  for (const ordner of ['schemas', 'workflow-vorlagen', 'docs/harness']) cpSync(join(REPO_WURZEL, ordner), join(install, ordner), { recursive: true })
  const katalogPfad = join(install, 'ressourcen.json')
  writeFileSync(katalogPfad, JSON.stringify(katalog(), null, 2))

  const repo = mkdtempSync(join(tmpdir(), 'f36-ws3-nachweis-repo-'))
  const git = (a) => execFileSync('git', a, { cwd: repo })
  git(['init', '-q', '-b', 'wegwerf'])
  git(['config', 'user.email', 'nachweis@example.invalid'])
  git(['config', 'user.name', 'Nachweis'])
  git(['config', 'core.autocrlf', 'false'])
  writeFileSync(join(repo, 'package.json'), '{"name":"fixture","scripts":{"check":"node -e 0"}}\n')
  mkdirSync(join(repo, 'state'))
  writeFileSync(join(repo, 'state', 'findings.md'), FINDINGS)
  git(['add', '-A'])
  git(['commit', '-q', '-m', 'init'])

  const vorlageDir = mkdtempSync(join(tmpdir(), 'f36-ws3-nachweis-vorlage-'))
  const startvorlagePfad = join(vorlageDir, 'startvorlage.json')
  writeFileSync(startvorlagePfad, JSON.stringify({ ...ladeStartvorlage(join(REPO_WURZEL, 'startvorlagen/ai-workforce.json')), pruefbefehl: [process.execPath, '-e', '0'] }))
  const profil = leiteProfilReferenzAb(ladeStartvorlage(startvorlagePfad))
  const lo = { basisVerzeichnis, schreiber: () => {} }

  /** Router-Lauf: feste Klassifikation als claude-code-Rohstrom + Laufakte; Ausführung: bleibt offen. */
  const fuehreAufgabeDurchFn = async (laufId, _profil, eingaben) => {
    if (eingaben.rolle !== 'router') return new Promise(() => {})
    const klassifikation = { kontrolltiefe: 'standard', risikoklasse: 'niedrig', task_typen: ['bugfix'], rueckfragen: [], begruendung: 'Fixture.' }
    mkdirSync(basisVerzeichnis, { recursive: true })
    const rohPfad = resolve(basisVerzeichnis, `${laufId}-rohstrom.json`)
    const rohInhalt = JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: JSON.stringify(klassifikation) }) })
    writeFileSync(rohPfad, rohInhalt, 'utf8')
    schreibeWirkungsmarke(laufId, profil, 'run_prepared', {}, lo)
    schreibeWirkungsmarke(laufId, profil, 'terminal', { ergebnis: 'ERFOLGREICH' }, lo)
    registriereKernArtefakt(`laufakte-${laufId}`, profil, { erzeuger: 'f36-ws3-nachweis' }, { worker: 'claude-code', rohstrom_referenz: { pfad: rohPfad, inhalts_hash: sha256Hex(rohInhalt) } }, undefined, lo)
    return { ok: true, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
  }

  const handler = erzeugeRequestHandler({ basisVerzeichnis, projektId: `f36-ws3-${szenario}`, fuehreAufgabeDurchFn, repoWurzel: repo, installWurzel: install, startvorlagePfad })
  const server = createServer((req, res) => {
    // Szenario 3: der Katalog ändert sich genau beim Eintreffen der Freigabe (nach der Anzeige).
    // Jeder neue Router-Lauf (neuer Durchgang der Klickfolge) beginnt wieder mit dem ursprünglichen Katalog.
    if (optionen.katalogAendernBeiFreigabe && req.method === 'POST' && req.url.endsWith('/freigabe')) writeFileSync(katalogPfad, JSON.stringify(katalog(true), null, 2))
    if (optionen.katalogAendernBeiFreigabe && req.method === 'POST' && req.url.endsWith('/routen')) writeFileSync(katalogPfad, JSON.stringify(katalog(), null, 2))
    return handler(req, res)
  })
  await new Promise((ok, fehler) => {
    server.once('error', fehler)
    server.listen(PORT, '127.0.0.1', ok)
  })

  if (optionen.workflow) {
    const auftrag = await (await fetch(`http://127.0.0.1:${PORT}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel: 'Export bei leeren Monaten', auftragstext: 'Fixture' }) })).json()
    registriereKernArtefakt(`router-${auftrag.auftragId}`, profil, { erzeuger: 'kern', schritt: 'router-lauf' }, { klassifikation: { task_typen: ['bugfix'] } }, [], lo)
    registriereWorkflow(
      {
        workflow_schema: 'v0',
        workflow_id: WORKFLOW_ID,
        auftrag_id: auftrag.auftragId,
        version: 1,
        ziel: 'Render-Nachweis F36 WS-3.',
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
  }

  return {
    schliessen: async () => {
      server.closeAllConnections()
      await new Promise((ok) => server.close(ok))
      for (const pfad of [basisVerzeichnis, install, repo, vorlageDir]) raeumeVerzeichnis(pfad)
    },
  }
}

/** Fährt eine Klickfolge per render-nachweis.mjs ab. */
function renderNachweis(klickfolge, ausgabe) {
  return new Promise((ok, fehler) => {
    const kind = spawn('node', ['scripts/render-nachweis.mjs', join('features/F36/nachweis-ws3-ui', klickfolge), join('features/F36/nachweis-ws3-ui', ausgabe)], { cwd: REPO_WURZEL, stdio: 'inherit' })
    kind.on('exit', (code) => (code === 0 ? ok() : fehler(new Error(`render-nachweis.mjs endete mit Exit-Code ${code}`))))
    kind.on('error', fehler)
  })
}

const szenarien = [
  { name: 'workflow', optionen: { workflow: true }, klickfolgen: [['klickfolge-workflow-400.json', 'workflow-400'], ['klickfolge-workflow-breit.json', 'workflow-breit']] },
  { name: 'workboard', optionen: {}, klickfolgen: [['klickfolge-workboard.json', 'workboard']] },
  { name: 'workboard-409', optionen: { katalogAendernBeiFreigabe: true }, klickfolgen: [['klickfolge-workboard-409.json', 'workboard-409'], ['klickfolge-workboard-409-meldung.json', 'workboard-409-meldung']] },
]
for (const szenario of szenarien) {
  const leitstand = await starteLeitstand(szenario.name, szenario.optionen)
  console.log(`[erzeuge-nachweis] Szenario '${szenario.name}' auf http://127.0.0.1:${PORT}`)
  try {
    for (const [klickfolge, ausgabe] of szenario.klickfolgen) await renderNachweis(klickfolge, ausgabe)
  } finally {
    await leitstand.schliessen()
  }
}
console.log('[erzeuge-nachweis] fertig.')
// Offene Ausführungs-Promises des Stubs halten den Prozess sonst am Leben.
process.exit(0)
