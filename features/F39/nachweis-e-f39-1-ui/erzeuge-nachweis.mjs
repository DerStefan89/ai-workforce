#!/usr/bin/env node
/**
 * Datei: features/F39/nachweis-e-f39-1-ui/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweis für E-F39-1=B (löst state/findings.md F-643, Regel F-622). Startet eine
 * eigene, isolierte Leitstand-Instanz (Port 4176) GEGEN EIN ECHTES, ISOLIERTES WEGWERF-GIT-REPO
 * (mkdtempSync, git init -b main — Muster src/authorization-boundary/authorization-boundary.test.ts)
 * statt gegen dieses Projekt-Repo selbst: repoWurzel wird an erzeugeRequestHandler übergeben
 * (scripts/leitstand-server.mjs unterstützt das Feld bereits, Default process.cwd()). So löst der
 * reale Vorbedingungs-Check (E-F39-1=B, loeseAusfuehrungsEingabenAuf) real gegen 'main' aus, ohne
 * den Branch dieser Sitzung anzufassen.
 *
 * Ein Workflow mit einem 'ausfuehrung'-Schritt (Werkzeugsatz 'schreibend', ZWINGEND,
 * freigabe_erteilt: true — die Freigabe ist bereits erteilt, der Klick löst den ECHTEN Start
 * aus) wird direkt über registriereWorkflow angelegt (Muster nachweis-ws2b-ui, kein LLM-Lauf
 * nötig). Die Browser-Interaktion (Playwright, scripts/render-nachweis.mjs) klickt real
 * „Starten" und beobachtet, dass die Fehlermeldung ("Ausführung gesperrt: du bist auf main. …")
 * in #workflow-bedienung-meldung real sichtbar wird (hidden-Attribut real entfernt, nicht nur im
 * JS-Zustand) — genau die F-622-Lehre: ein Reviewer-/QA-Pass allein findet eine überschriebene
 * [hidden]-Regel nicht, nur ein echter Browser-Screenshot.
 *
 * Aufruf: node features/F39/nachweis-e-f39-1-ui/erzeuge-nachweis.mjs
 * (Muster npm run render-nachweis — kein Teil von npm run check, braucht einen echten Browser.)
 */

import { execFileSync, spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { erzeugeRequestHandler } from '../../../scripts/leitstand-server.mjs'
import { raeumeVerzeichnis } from '../../../scripts/_aufraeumen.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../../../src/startvorlage/index.ts'
import { registriereWorkflow } from '../../../src/workflow/index.ts'
import { registriereAuftrag } from '../../../src/auftrag/index.ts'

const HIER = dirname(fileURLToPath(import.meta.url))
const REPO_WURZEL = join(HIER, '..', '..', '..')
const BASISVERZEICHNIS = 'kontrollzustand-test-e-f39-1-nachweis'
const PORT = 4176
const WORKFLOW_ID = 'e-f39-1-nachweis'
const AUSFUEHRUNG_SCHRITT_ID = 'schritt-1-ausfuehrung'

function git(cwd, argumente) {
  execFileSync('git', argumente, { cwd })
}

/** Wegwerf-Git-Repo, real auf 'main', ohne uncommittete Änderungen — der Vorbedingungs-Check muss dennoch ablehnen (Branch main). */
function neuesWegwerfGitRepoAufMain() {
  const repoWurzel = mkdtempSync(join(tmpdir(), 'e-f39-1-nachweis-repo-'))
  git(repoWurzel, ['init', '--quiet', '-b', 'main'])
  git(repoWurzel, ['config', 'user.email', 'test@example.invalid'])
  git(repoWurzel, ['config', 'user.name', 'Test'])
  writeFileSync(join(repoWurzel, 'datei.txt'), 'init\n')
  git(repoWurzel, ['add', 'datei.txt'])
  git(repoWurzel, ['commit', '--quiet', '-m', 'init'])
  return repoWurzel
}

raeumeVerzeichnis(BASISVERZEICHNIS)
mkdirSync(BASISVERZEICHNIS, { recursive: true })
const wegwerfRepoWurzel = neuesWegwerfGitRepoAufMain()

const vorlage = ladeStartvorlage('startvorlagen/beispielprojekt.json')
const profilReferenz = leiteProfilReferenzAb(vorlage)
const ladeOptionen = { basisVerzeichnis: BASISVERZEICHNIS, schreiber: () => {} }

const AUFTRAG_ID = 'e-f39-1-nachweis-fixture'
registriereAuftrag(AUFTRAG_ID, profilReferenz, 'E-F39-1=B-Render-Nachweis', 'Fixture-Auftragstext, kein realer Bau.', ladeOptionen)

registriereWorkflow(
  {
    workflow_schema: 'v0',
    workflow_id: WORKFLOW_ID,
    auftrag_id: AUFTRAG_ID,
    version: 1,
    ziel: 'E-F39-1=B-Render-Nachweis: ein schreibender Schritt wird auf main abgelehnt.',
    status: 'WARTET_FREIGABE',
    aktiver_schritt_id: AUSFUEHRUNG_SCHRITT_ID,
    grund: null,
    grenzen: { max_schritte: 4, max_replans: 1 },
    schritte: [
      {
        schritt_id: AUSFUEHRUNG_SCHRITT_ID,
        rolle: 'ausfuehrung',
        werkzeugsatz: 'schreibend',
        worker: 'claude-code',
        modell: 'claude-sonnet-5',
        eingaben: [],
        output_schema: null,
        freigabe: 'ZWINGEND',
        freigabe_erteilt: true,
        risiko: 'Render-Nachweis-Fixture, kein reales Risiko.',
        zeitgrenze_ms: 600000,
        nachfolger: null,
        status: 'OFFEN',
        lauf_id: null,
      },
    ],
  },
  profilReferenz,
  ladeOptionen
)

const server = createServer(erzeugeRequestHandler({ basisVerzeichnis: BASISVERZEICHNIS, repoWurzel: wegwerfRepoWurzel }))

await new Promise((resolve, reject) => {
  server.once('error', reject)
  server.listen(PORT, '127.0.0.1', resolve)
})
console.log(`[erzeuge-nachweis] Fixture-Leitstand läuft auf http://127.0.0.1:${PORT}, repoWurzel=${wegwerfRepoWurzel} (main, sauber)`)

try {
  await new Promise((resolve, reject) => {
    const kind = spawn('node', ['scripts/render-nachweis.mjs', 'features/F39/nachweis-e-f39-1-ui/klickfolge.json', 'features/F39/nachweis-e-f39-1-ui'], {
      cwd: REPO_WURZEL,
      stdio: 'inherit',
    })
    kind.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`render-nachweis.mjs endete mit Exit-Code ${code}`))))
    kind.on('error', reject)
  })
} finally {
  await new Promise((resolve) => server.close(resolve))
  raeumeVerzeichnis(BASISVERZEICHNIS)
  raeumeVerzeichnis(wegwerfRepoWurzel)
}
console.log('[erzeuge-nachweis] fertig.')
