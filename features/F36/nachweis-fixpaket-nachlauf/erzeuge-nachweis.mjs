#!/usr/bin/env node
/**
 * Datei: features/F36/nachweis-fixpaket-nachlauf/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweis (F-622) für F-768 „Sichtung bestätigt – weiter“. Startet einen
 * Fixture-Leitstand (Wegwerf-Kontrollzustand und -Repo), führt zwei Workflows real bis zum
 * F-760-Halt (Attrappen-Starter: Lauf endet VERWEIGERT ohne Bypass-Verdacht) — einen reinen Halt
 * und einen mit Zusatzgrund — und fährt je eine Klickfolge mit scripts/render-nachweis.mjs ab.
 * Nur der Laufausgang ist gestubbt; HTTP, Halt-Logik, Bedienblock und Schreibweg sind echt.
 *
 * Wird aufgerufen von: Hand (nicht Teil von `npm run check`, braucht Chromium).
 *
 * Wichtig: Die Workflow-IDs sind fest, weil die Klickfolgen sie in der URL tragen.
 *
 * Aufruf: node features/F36/nachweis-fixpaket-nachlauf/erzeuge-nachweis.mjs
 */

import { execFileSync, spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { schreibeWirkungsmarke } from '../../../src/checkpoint-store/index.ts'
import { ladeArtefaktVersion, registriereKernArtefakt } from '../../../src/lineage-registry/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../../../src/startvorlage/index.ts'
import { registriereWorkflow } from '../../../src/workflow/index.ts'
import { erzeugeRequestHandler } from '../../../scripts/leitstand-server.mjs'
import { raeumeVerzeichnis } from '../../../scripts/_aufraeumen.ts'

const HIER = dirname(fileURLToPath(import.meta.url))
const REPO_WURZEL = join(HIER, '..', '..', '..')
const BASISVERZEICHNIS = 'kontrollzustand-test-f36-nachlauf-nachweis'
const PORT = 4175

const fremdRepo = mkdtempSync(join(tmpdir(), 'f36-nachlauf-nachweis-repo-'))
const git = (argumente) => execFileSync('git', argumente, { cwd: fremdRepo, encoding: 'utf8' })
git(['init', '--quiet', '-b', 'wegwerf-branch'])
git(['config', 'user.email', 'nachweis@example.invalid'])
git(['config', 'user.name', 'Nachweis'])
writeFileSync(join(fremdRepo, 'package.json'), '{ "name": "fremd" }\n')
git(['add', '-A'])
git(['commit', '--quiet', '-m', 'init'])
const vorlagenOrdner = mkdtempSync(join(tmpdir(), 'f36-nachlauf-nachweis-vorlage-'))
const startvorlagePfad = join(vorlagenOrdner, 'startvorlage.json')
writeFileSync(startvorlagePfad, JSON.stringify({ ...ladeStartvorlage(join(REPO_WURZEL, 'startvorlagen/ai-workforce.json')), pruefbefehl: [process.execPath, '-e', '0'] }))
const profilReferenz = leiteProfilReferenzAb(ladeStartvorlage(startvorlagePfad))
const ladeOptionen = { basisVerzeichnis: BASISVERZEICHNIS, schreiber: () => {} }

/** Attrappen-Starter: jeder Lauf endet VERWEIGERT ohne Bypass-Verdacht, mit zwei abgelehnten Probebefehlen. */
async function fuehreAufgabeDurchFn(laufId) {
  const rohstromPfad = join(BASISVERZEICHNIS, `${laufId}-rohstrom.json`)
  const denials = [
    { tool_name: 'Bash', tool_input: { command: 'git status && git log' } },
    { tool_name: 'Bash', tool_input: { command: 'npm run dev' } },
  ]
  writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: 'NACHWEIS', permission_denials: denials }) }))
  registriereKernArtefakt(`laufakte-${laufId}`, profilReferenz, { erzeuger: 'kern', schritt: 'nachweis-fixture' }, { laufakte_schema: 'v0', lauf_id: laufId, worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad } }, [], ladeOptionen)
  schreibeWirkungsmarke(laufId, profilReferenz, 'run_prepared', {}, ladeOptionen)
  schreibeWirkungsmarke(laufId, profilReferenz, 'terminal', { ergebnis: 'VERWEIGERT', daten: { bypass_verdacht_anzahl: 0 } }, ladeOptionen)
  return { ok: true, klassifikation: { ergebnis: 'VERWEIGERT', bypass_verdacht_anzahl: 0 }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'VERWEIGERT' } }
}

/**
 * Legt einen Workflow an und fährt ihn über POST .../starten bis zum Halt.
 * @param basisUrl - Fixture-Leitstand
 * @param workflowId - feste ID
 * @returns Workflow-Daten am Halt
 */
async function bisZumHalt(basisUrl, workflowId) {
  const auftrag = await (await fetch(`${basisUrl}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel: 'F-768 Nachweis', auftragstext: 'NACHWEIS' }) })).json()
  const schritt = (id, rolle, werkzeugsatz, nachfolger) => ({
    schritt_id: id,
    rolle,
    werkzeugsatz,
    worker: 'claude-code',
    modell: 'claude-sonnet-5',
    eingaben: [],
    output_schema: null,
    ...(werkzeugsatz === 'schreibend' ? { freigabe: 'ZWINGEND', freigabe_erteilt: true } : { freigabe: 'AUTOMATISCH' }),
    risiko: 'Nachweis.',
    zeitgrenze_ms: 600000,
    nachfolger,
    status: 'OFFEN',
    lauf_id: null,
  })
  registriereWorkflow(
    {
      workflow_schema: 'v0',
      workflow_id: workflowId,
      auftrag_id: auftrag.auftragId,
      version: 1,
      ziel: 'F-768 Render-Nachweis.',
      status: 'OFFEN',
      aktiver_schritt_id: 'schritt-1-ausfuehrung',
      grund: null,
      grenzen: { max_schritte: 4, max_replans: 1 },
      schritte: [schritt('schritt-1-ausfuehrung', 'ausfuehrung', 'schreibend', 'schritt-2-review'), schritt('schritt-2-review', 'architecture-advisor', 'lesend', null)],
    },
    profilReferenz,
    ladeOptionen
  )
  const start = await fetch(`${basisUrl}/api/workflows/${workflowId}/starten`, { method: 'POST' })
  if (start.status !== 202) throw new Error(`Start von '${workflowId}' erwartet 202, erhalten ${start.status} (${await start.text()})`)
  const beginn = Date.now()
  while (Date.now() - beginn < 10000) {
    const daten = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, ladeOptionen)?.daten
    if (daten?.status === 'KLAERUNG_ERFORDERLICH') return daten
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  throw new Error(`Workflow '${workflowId}' erreichte keinen Halt`)
}

/** Fährt eine Klickfolge dieses Ordners mit scripts/render-nachweis.mjs ab. */
function renderNachweis(klickfolge, ausgabe) {
  return new Promise((resolve, reject) => {
    const kind = spawn('node', ['scripts/render-nachweis.mjs', join(HIER, klickfolge), join(HIER, ausgabe)], { cwd: REPO_WURZEL, stdio: 'inherit' })
    kind.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`render-nachweis.mjs endete mit Exit-Code ${code}`))))
    kind.on('error', reject)
  })
}

raeumeVerzeichnis(BASISVERZEICHNIS)
const server = createServer(erzeugeRequestHandler({ basisVerzeichnis: BASISVERZEICHNIS, fuehreAufgabeDurchFn, repoWurzel: fremdRepo, installWurzel: REPO_WURZEL, startvorlagePfad }))
await new Promise((resolve, reject) => {
  server.once('error', reject)
  server.listen(PORT, '127.0.0.1', resolve)
})
const basisUrl = `http://127.0.0.1:${PORT}`
console.log(`[erzeuge-nachweis] Fixture-Leitstand läuft auf ${basisUrl}`)

try {
  await bisZumHalt(basisUrl, 'nachweis-f768-rein')
  const mitZusatz = await bisZumHalt(basisUrl, 'nachweis-f768-zusatzgrund')
  // Zusatzgrund wie ihn der Halt anhängt (Prüfkette, F-713) — dann darf nur die Reparaturfassung erscheinen.
  registriereWorkflow({ ...mitZusatz, grund: `${mitZusatz.grund} | Prüfkette durch den Lauf verändert: package.json (F-713)` }, profilReferenz, ladeOptionen)
  await renderNachweis('klickfolge-rein.json', 'rein')
  await renderNachweis('klickfolge-zusatzgrund.json', 'zusatzgrund')
} finally {
  await new Promise((resolve) => server.close(resolve))
  raeumeVerzeichnis(BASISVERZEICHNIS)
  raeumeVerzeichnis(fremdRepo)
  raeumeVerzeichnis(vorlagenOrdner)
}
console.log('[erzeuge-nachweis] fertig.')
