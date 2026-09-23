#!/usr/bin/env node
/**
 * Datei: features/F39/nachweis-ws2b-ui/erzeuge-nachweis.mjs
 *
 * Zweck: erzeugt den Render-Nachweis für F39 WS-2b (löst state/findings.md F-632 Teil b, Regel
 * F-622). Startet eine eigene, isolierte Leitstand-Instanz (Port 4175 — kollidiert dadurch nie mit
 * einer echten laufenden Instanz oder dem F34-Fixpaket-Nachweis auf Port 4174) und legt VOR dem
 * ersten Request direkt einen Workflow an, der bereits auf KLAERUNG_ERFORDERLICH steht (Regel 1c,
 * src/workflow/index.ts): ein Architektur-Schritt (output_schema 'ergebnis-architektur') ist
 * ERFOLGREICH gelaufen und trägt eine offene Frage in 'entscheidungen_mensch[]'. Kein LLM-Lauf
 * nötig (Muster scripts/check-f39-architekt.mjs (j)/(m), F34-Fixpaket-Nachweis-Kopfkommentar): die
 * Laufakte samt Rohstrom wird direkt über registriereKernArtefakt geschrieben, wie ein echter
 * Architektur-Lauf sie hinterlassen hätte.
 *
 * Die Browser-Interaktion selbst ist echt (Playwright, klicken + tippen, scripts/render-
 * nachweis.mjs): Radio-Auswahl der empfohlenen Option, „Entscheidung speichern" klicken, den
 * Übergang von KLAERUNG_ERFORDERLICH (Architektur-Entscheidung offen) zu WARTET_FREIGABE
 * (Folgeschritt ZWINGEND) real im DOM beobachten — kein Auto-Start (Auftrags-Vorgabe Punkt 3).
 *
 * Aufruf: node features/F39/nachweis-ws2b-ui/erzeuge-nachweis.mjs
 * (Muster npm run render-nachweis — kein Teil von npm run check, braucht einen echten Browser.)
 */

import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { erzeugeRequestHandler } from '../../../scripts/leitstand-server.mjs'
import { raeumeVerzeichnis } from '../../../scripts/_aufraeumen.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../../../src/startvorlage/index.ts'
import { registriereKernArtefakt } from '../../../src/lineage-registry/index.ts'
import { registriereWorkflow } from '../../../src/workflow/index.ts'

const HIER = dirname(fileURLToPath(import.meta.url))
const REPO_WURZEL = join(HIER, '..', '..', '..')
const BASISVERZEICHNIS = 'kontrollzustand-test-f39-ws2b-nachweis'
const PORT = 4175
const WORKFLOW_ID = 'f39-ws2b-nachweis'
const ARCHITEKT_SCHRITT_ID = 'schritt-1-architekt'
const ARCHITEKT_LAUF_ID = 'f39-ws2b-nachweis-architekt-lauf'
const FOLGE_SCHRITT_ID = 'schritt-2-architektur'

const FRAGE = {
  frage: 'Welches Speicherformat für den Chat-Verlauf?',
  optionen: [
    { titel: 'JSONL je Turn', vorteile: ['Passt zum bestehenden Checkpoint-Muster (append-only)', 'Ein Turn ist eine Zeile, leicht zu diffen'], nachteile: ['Viele kleine Dateien bei langen Verläufen'] },
    { titel: 'Ein Objekt je Lauf', vorteile: ['Weniger Dateien'], nachteile: ['Bricht mit dem append-only-Muster der übrigen Ketten', 'Ein Schreibfehler gefährdet den GESAMTEN Verlauf statt eines Turns'] },
  ],
  auswirkung_bestand: 'keine — betrifft nur künftige Schreibvorgänge auf einer neuen Kette.',
  empfehlung: 'JSONL je Turn',
  begruendung: 'Konsistent mit jeder bestehenden Kernartefakt-Kette (Checkpoint Store, F1).',
}

raeumeVerzeichnis(BASISVERZEICHNIS)
mkdirSync(BASISVERZEICHNIS, { recursive: true })

const vorlage = ladeStartvorlage('startvorlagen/beispielprojekt.json')
const profilReferenz = leiteProfilReferenzAb(vorlage)
const ladeOptionen = { basisVerzeichnis: BASISVERZEICHNIS, schreiber: () => {} }

const ergebnisArchitektur = {
  modus: 'feature',
  zusammenfassung: 'Architekturentwurf für den Chat-Verlauf-Speicher — eine offene Grundsatzentscheidung zum Speicherformat.',
  module: [],
  adr_entwuerfe: [],
  schema_entwuerfe: [],
  entscheidungen_mensch: [FRAGE],
  capabilities_bedarf: [],
  evidenz: [{ marker: '[Fakt]', aussage: 'Render-Nachweis-Fixture, F39 WS-2b.' }],
}
const rohstromPfad = join(BASISVERZEICHNIS, `${ARCHITEKT_LAUF_ID}-rohstrom.json`)
writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: JSON.stringify(ergebnisArchitektur) }) }))
registriereKernArtefakt(
  `laufakte-${ARCHITEKT_LAUF_ID}`,
  profilReferenz,
  { erzeuger: 'kern', schritt: 'f39-ws2b-nachweis-fixture' },
  { laufakte_schema: 'v0', lauf_id: ARCHITEKT_LAUF_ID, worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad } },
  [],
  ladeOptionen
)

registriereWorkflow(
  {
    workflow_schema: 'v0',
    workflow_id: WORKFLOW_ID,
    auftrag_id: 'auftrag-f39-ws2b-nachweis-fixture',
    version: 1,
    ziel: 'F39-WS-2b-Render-Nachweis: Architektur-Entscheidung erforderlich.',
    status: 'KLAERUNG_ERFORDERLICH',
    aktiver_schritt_id: ARCHITEKT_SCHRITT_ID,
    grund: "Architektur-Entscheidung erforderlich — Schritt 'schritt-1-architekt' trägt 1 offene Frage(n) in 'entscheidungen_mensch[]', noch keine menschliche Entscheidung erfasst (Lauf 'f39-ws2b-nachweis-architekt-lauf')",
    grenzen: { max_schritte: 6, max_replans: 1 },
    schritte: [
      {
        schritt_id: ARCHITEKT_SCHRITT_ID,
        rolle: 'architekt',
        werkzeugsatz: 'lesend',
        worker: 'codex',
        modell: 'gpt-6-astra',
        eingaben: [],
        output_schema: 'ergebnis-architektur',
        freigabe: 'ZWINGEND',
        risiko: 'Render-Nachweis-Fixture, kein reales Risiko.',
        zeitgrenze_ms: 600000,
        nachfolger: FOLGE_SCHRITT_ID,
        status: 'ERFOLGREICH',
        lauf_id: ARCHITEKT_LAUF_ID,
      },
      {
        schritt_id: FOLGE_SCHRITT_ID,
        rolle: 'architecture-advisor',
        werkzeugsatz: 'lesend',
        worker: 'claude-code',
        modell: 'claude-sonnet-5',
        eingaben: [`artefakt:ergebnis-@${ARCHITEKT_SCHRITT_ID}`, `artefakt:entscheidung-@${ARCHITEKT_SCHRITT_ID}`],
        output_schema: null,
        freigabe: 'ZWINGEND',
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
    const kind = spawn('node', ['scripts/render-nachweis.mjs', 'features/F39/nachweis-ws2b-ui/klickfolge.json', 'features/F39/nachweis-ws2b-ui'], {
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
