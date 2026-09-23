#!/usr/bin/env node
/**
 * Datei: features/F34/nachweis-fixpaket-ui/erzeuge-nachweis.mjs
 *
 * Zweck: erzeugt den Render-Nachweis für das F34-Fixpaket (F-624/F-625/F-626, Regel F-622). Startet
 * eine eigene, isolierte Leitstand-Instanz (Port 4174, NICHT der reguläre Dev-Port 4173 — kollidiert
 * dadurch nie mit einer echten laufenden Instanz) mit einem gestubbten fuehreAufgabeDurchFn (Muster
 * scripts/check-f34-product-coach.mjs Abschnitt (f)/(r)/(t)): der erste Sparring-Turn liefert das
 * reale Schema-Beispiel 'ergebnis-product-coach.valid-scope-entwurf.json', der zweite
 * 'valid-projekt-entwurf.json' — deterministisch statt eines echten, nicht-deterministischen
 * LLM-Laufs (F-626-Auftrag erlaubt ausdrücklich eine Fixture-Antwort über den bestehenden Testweg,
 * wenn ein echter Coach-Lauf zu unzuverlässig wäre, genau dieser Fall: OB und WANN ein echter Coach
 * in EINEM Turn 'art: scope_entwurf'/'projekt_entwurf' statt einer Rückfrage liefert, ist nicht
 * steuerbar — ein Render-Nachweis, der genau das UI-Rendering dieser beiden 'art'-Formen UND die
 * Chat→Auftrag-Brücke UND die F-624-Filterung belegen soll, braucht einen deterministischen Turn).
 * Die Nachricht wird trotzdem über ECHTE Browser-Interaktion gesendet (Playwright, tippen + klicken,
 * scripts/render-nachweis.mjs) — nur die Server-Antwort ist gestubbt, HTTP/Render-/Auftrag-Pipeline
 * sind real.
 *
 * Anders als die gestubbten Gate-Abschnitte (f)/(r)/(t) in check-f34-product-coach.mjs (die NUR
 * GET /api/sparring direkt abfragen) fährt dieser Nachweis über den ECHTEN Browser-Client
 * (chat.js pruefeAusstehendenLauf → GET /api/laeufe/<laufId>) — der braucht echte F1B-Wirkungsmarken
 * (run_prepared, dann terminal) unter basisVerzeichnis/<laufId>/, sonst bleibt GET /api/laeufe/<laufId>
 * dauerhaft 404 ("erster Checkpoint fehlt") und der Senden-Button dauerhaft gesperrt (real
 * beobachtet, erster Anlauf dieses Skripts, 23.09.2026 — Playwright-Timeout nach 30s). Der Stub
 * schreibt sie deshalb selbst über src/checkpoint-store (schreibeWirkungsmarke), reihenfolgeecht
 * VOR dem laufakte-Kernartefakt.
 *
 * Aufruf: node features/F34/nachweis-fixpaket-ui/erzeuge-nachweis.mjs
 * (setzt eine gebaute/lauffähige Umgebung voraus, Muster npm run render-nachweis — kein Teil von
 * npm run check, braucht einen echten Browser.)
 */

import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { erzeugeRequestHandler } from '../../../scripts/leitstand-server.mjs'
import { raeumeVerzeichnis } from '../../../scripts/_aufraeumen.ts'

const HIER = dirname(fileURLToPath(import.meta.url))
const REPO_WURZEL = join(HIER, '..', '..', '..')
const BASISVERZEICHNIS = 'kontrollzustand-test-f34-fixpaket-nachweis'
const PORT = 4174
const PROJEKT_ID = 'f34-fixpaket-nachweis'

const scopeErgebnis = JSON.parse(readFileSync(join(REPO_WURZEL, 'schemas/examples/ergebnis-product-coach.valid-scope-entwurf.json'), 'utf-8'))
const projektErgebnis = JSON.parse(readFileSync(join(REPO_WURZEL, 'schemas/examples/ergebnis-product-coach.valid-projekt-entwurf.json'), 'utf-8'))
const fixtureWarteschlange = [scopeErgebnis, projektErgebnis]

async function fuehreAufgabeDurchFn(laufId) {
  const ergebnis = fixtureWarteschlange.shift() ?? scopeErgebnis
  const { mkdirSync, writeFileSync } = await import('node:fs')
  mkdirSync(BASISVERZEICHNIS, { recursive: true })
  const rohstromPfad = join(BASISVERZEICHNIS, `${laufId}-rohstrom.json`)
  writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: JSON.stringify(ergebnis) }) }), 'utf8')
  const profilReferenz = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
  const ladeOptionen = { basisVerzeichnis: BASISVERZEICHNIS, schreiber: () => {} }
  const { schreibeWirkungsmarke } = await import('../../../src/checkpoint-store/index.ts')
  schreibeWirkungsmarke(laufId, profilReferenz, 'run_prepared', {}, ladeOptionen)
  schreibeWirkungsmarke(laufId, profilReferenz, 'terminal', { ergebnis: 'ERFOLGREICH' }, ladeOptionen)
  const { registriereKernArtefakt } = await import('../../../src/lineage-registry/index.ts')
  registriereKernArtefakt(`laufakte-${laufId}`, profilReferenz, { erzeuger: 'f34-fixpaket-nachweis' }, { worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad } }, undefined, ladeOptionen)
  return { ok: true, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
}

raeumeVerzeichnis(BASISVERZEICHNIS)
const server = createServer(erzeugeRequestHandler({ basisVerzeichnis: BASISVERZEICHNIS, projektId: PROJEKT_ID, fuehreAufgabeDurchFn }))

await new Promise((resolve, reject) => {
  server.once('error', reject)
  server.listen(PORT, '127.0.0.1', resolve)
})
console.log(`[erzeuge-nachweis] Fixture-Leitstand läuft auf http://127.0.0.1:${PORT}`)

try {
  await new Promise((resolve, reject) => {
    const kind = spawn('node', ['scripts/render-nachweis.mjs', 'features/F34/nachweis-fixpaket-ui/klickfolge.json', 'features/F34/nachweis-fixpaket-ui'], {
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
