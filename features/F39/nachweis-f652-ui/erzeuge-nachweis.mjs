#!/usr/bin/env node
/**
 * Datei: features/F39/nachweis-f652-ui/erzeuge-nachweis.mjs
 *
 * Zweck: erzeugt den Render-Nachweis für F-652 (state/findings.md F-652, BUG P1, Regel F-622).
 * Startet eine eigene, isolierte Leitstand-Instanz (Port 4176 — kollidiert dadurch nie mit einer
 * echten laufenden Instanz oder den F34-/F39-WS-2b-Nachweisen auf 4174/4175) und legt VOR dem
 * ersten Request direkt einen zweistufigen Workflow an, dessen Ausführungsschritt real
 * ERFOLGREICH gelaufen ist, dessen deterministische Prüfung (src/pruefschritt/index.ts) aber ROT
 * endete — genau der Fall, den Regel 1f (src/workflow/index.ts) real beobachtet abfängt: der
 * Workflow steht auf KLAERUNG_ERFORDERLICH, der Review-Schritt hat NIE gestartet. Kein echter
 * Prozessstart nötig (Muster features/F39/nachweis-ws2b-ui/erzeuge-nachweis.mjs): das
 * 'pruefergebnis-<laufId>'-Artefakt wird direkt über registriereKernArtefakt geschrieben, wie
 * starteLaufUndVergiss es nach einem echten Prüflauf hinterlassen hätte.
 *
 * Die Browser-Interaktion selbst ist echt (Playwright, scripts/render-nachweis.mjs): die neue
 * Zeile "Prüfung: ROT (Exit 1)" im Abnahme-Block wird real im DOM beobachtet, nicht nur im
 * JSON der GET .../abnahme-Antwort — genau die Fehlerklasse (F-622), die ein reiner
 * Quelltext-Scan nicht findet.
 *
 * Aufruf: node features/F39/nachweis-f652-ui/erzeuge-nachweis.mjs
 * (Muster npm run render-nachweis — kein Teil von npm run check, braucht einen echten Browser.)
 */

import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { erzeugeRequestHandler } from '../../../scripts/leitstand-server.mjs'
import { raeumeVerzeichnis } from '../../../scripts/_aufraeumen.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../../../src/startvorlage/index.ts'
import { registriereKernArtefakt } from '../../../src/lineage-registry/index.ts'
import { registriereWorkflow } from '../../../src/workflow/index.ts'

const HIER = dirname(fileURLToPath(import.meta.url))
const REPO_WURZEL = join(HIER, '..', '..', '..')
const BASISVERZEICHNIS = 'kontrollzustand-test-f652-nachweis'
const PORT = 4176
const WORKFLOW_ID = 'f652-nachweis'
const AUSFUEHRUNG_SCHRITT_ID = 'schritt-1-ausfuehrung'
const AUSFUEHRUNG_LAUF_ID = 'f652-nachweis-ausfuehrung-lauf'
const REVIEW_SCHRITT_ID = 'schritt-2-review'

raeumeVerzeichnis(BASISVERZEICHNIS)
mkdirSync(BASISVERZEICHNIS, { recursive: true })

const vorlage = ladeStartvorlage('startvorlagen/beispielprojekt.json')
const profilReferenz = leiteProfilReferenzAb(vorlage)
const ladeOptionen = { basisVerzeichnis: BASISVERZEICHNIS, schreiber: () => {} }

const AUSGABE_ENDE = 'FEHLER: src/beispiel/index.ts(42,7): Type "string" is not assignable to type "number".\nnpm ERR! Test failed. See above for more details.'

registriereKernArtefakt(
  `pruefergebnis-${AUSFUEHRUNG_LAUF_ID}`,
  profilReferenz,
  { erzeuger: 'kern', schritt: 'nach-lauf-pruefschritt' },
  {
    pruefergebnis_schema: 'v0',
    lauf_id: AUSFUEHRUNG_LAUF_ID,
    befehl: ['node', 'npm-cli.js', 'run', 'check'],
    exit_code: 1,
    ergebnis: 'ROT',
    dauer_ms: 42_318,
    ausgabe_ende: AUSGABE_ENDE,
    gestartet_am: new Date().toISOString(),
  },
  [],
  ladeOptionen
)

registriereWorkflow(
  {
    workflow_schema: 'v0',
    workflow_id: WORKFLOW_ID,
    auftrag_id: 'auftrag-f652-nachweis-fixture',
    version: 1,
    ziel: 'F-652-Render-Nachweis: deterministische Prüfung meldet ROT.',
    status: 'KLAERUNG_ERFORDERLICH',
    aktiver_schritt_id: AUSFUEHRUNG_SCHRITT_ID,
    grund: `Schritt '${AUSFUEHRUNG_SCHRITT_ID}' (ausfuehrung): deterministische Prüfung meldet ROT (Exit-Code 1) — kein automatischer Fortschritt zum Review (Lauf '${AUSFUEHRUNG_LAUF_ID}').\nAusgabeende:\n${AUSGABE_ENDE}`,
    grenzen: { max_schritte: 6, max_replans: 1 },
    schritte: [
      {
        schritt_id: AUSFUEHRUNG_SCHRITT_ID,
        rolle: 'ausfuehrung',
        werkzeugsatz: 'schreibend',
        worker: 'claude-code',
        modell: 'claude-sonnet-5',
        eingaben: [],
        output_schema: null,
        freigabe: 'AUTOMATISCH',
        risiko: 'Render-Nachweis-Fixture, kein reales Risiko.',
        zeitgrenze_ms: 600000,
        nachfolger: REVIEW_SCHRITT_ID,
        status: 'ERFOLGREICH',
        lauf_id: AUSFUEHRUNG_LAUF_ID,
      },
      {
        schritt_id: REVIEW_SCHRITT_ID,
        rolle: 'code-reviewer',
        werkzeugsatz: 'lesend',
        worker: 'codex',
        modell: 'gpt-6-astra',
        eingaben: [`artefakt:pruefergebnis-@${AUSFUEHRUNG_SCHRITT_ID}`],
        output_schema: 'ergebnis-code-reviewer',
        freigabe: 'AUTOMATISCH',
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

const server = createServer(erzeugeRequestHandler({ basisVerzeichnis: BASISVERZEICHNIS }))

await new Promise((resolve, reject) => {
  server.once('error', reject)
  server.listen(PORT, '127.0.0.1', resolve)
})
console.log(`[erzeuge-nachweis] Fixture-Leitstand läuft auf http://127.0.0.1:${PORT}`)

try {
  await new Promise((resolve, reject) => {
    const kind = spawn('node', ['scripts/render-nachweis.mjs', 'features/F39/nachweis-f652-ui/klickfolge.json', 'features/F39/nachweis-f652-ui'], {
      cwd: REPO_WURZEL,
      stdio: 'inherit',
    })
    kind.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`render-nachweis.mjs endete mit Exit-Code ${code}`))))
    kind.on('error', reject)
  })
} finally {
  await new Promise((resolve) => server.close(resolve))
  raeumeVerzeichnis(BASISVERZEICHNIS)
}
console.log('[erzeuge-nachweis] fertig.')
