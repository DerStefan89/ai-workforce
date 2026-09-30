#!/usr/bin/env node
/**
 * Datei: features/F43/nachweis-f849/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweis für F-849 (Regel F-622): die Projektkarte zeigt eine vorschau_url auf dem
 * Leitstand-Port als „nicht zulässig (Leitstand-Port)“, ohne Anfrage und ohne „Öffnen“; eine
 * vorschau_url auf einem anderen (geschlossenen) Port bleibt unverändert „nicht erreichbar“ mit
 * „Öffnen“. Aufbau wie features/F43/nachweis-ws1/erzeuge-nachweis.mjs (echter Registerlader,
 * baueProjektHandlerMap, Dispatcher) auf Port 4177; danach fährt scripts/render-nachweis.mjs die
 * Klickfolgen (klickfolge.json, klickfolge-mobil.json → mobil/) im echten Browser ab.
 *
 * Aufruf: node features/F43/nachweis-f849/erzeuge-nachweis.mjs (nicht Teil von npm run check —
 * braucht Chromium).
 */

import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { raeumeVerzeichnis } from '../../../scripts/_aufraeumen.ts'
import { baueProjektHandlerMap, erzeugeMultiProjektDispatcher, erzeugeRequestHandler } from '../../../scripts/leitstand-server.mjs'
import { ladeProjektregister } from '../../../src/projekte/index.ts'

const HIER = dirname(fileURLToPath(import.meta.url))
const REPO_WURZEL = join(HIER, '..', '..', '..')
const WURZEL = join(tmpdir(), `f849-nachweis-${randomUUID().slice(0, 8)}`)
const PORT = 4177
const GESCHLOSSENER_PORT = 4393
const BASIS_VORLAGE = JSON.parse(readFileSync(join(REPO_WURZEL, 'startvorlagen/beispielprojekt.json'), 'utf8'))

/** Legt ein Testprojekt ohne startbefehl an. @param id - Projekt-id und Ordnername */
function legeProjektAn(id) {
  const repo = join(WURZEL, id)
  mkdirSync(join(repo, 'kontrollzustand'), { recursive: true })
  mkdirSync(join(repo, 'startvorlagen'), { recursive: true })
  writeFileSync(join(repo, 'startvorlagen', `${id}.json`), JSON.stringify({ ...BASIS_VORLAGE, profilPfad: join(REPO_WURZEL, BASIS_VORLAGE.profilPfad) }, null, 2))
}

legeProjektAn('f849-leitstand')
legeProjektAn('f849-anderer-port')
const eintrag = (id, name, vorschauUrl) => ({ id, name, repo_pfad: join(WURZEL, id), startvorlage_pfad: `startvorlagen/${id}.json`, profil_pfad: 'profiles/x.json', basisverzeichnis: 'kontrollzustand', status: 'IN_ENTWICKLUNG', vorschau_url: vorschauUrl })
writeFileSync(
  join(WURZEL, 'projekte.json'),
  JSON.stringify({
    projekte_schema: 'v0',
    projekte: [eintrag('f849-leitstand', 'F-849 vorschau_url = Leitstand-Port', `http://localhost:${PORT}`), eintrag('f849-anderer-port', 'F-849 anderer Port', `http://127.0.0.1:${GESCHLOSSENER_PORT}`)],
  })
)

const projekte = ladeProjektregister(join(WURZEL, 'projekte.json'))
const globalerLaufZustand = { aktiv: false, laufId: null, abortController: null }
const projektHandlerMap = new Map()
const defaultHandler = erzeugeRequestHandler({ basisVerzeichnis: join(WURZEL, 'kontrollzustand-default'), globalerLaufZustand, projekte, projektHandlerMap })
for (const [id, handler] of baueProjektHandlerMap(projekte, WURZEL, globalerLaufZustand)) projektHandlerMap.set(id, handler)
const server = createServer(erzeugeMultiProjektDispatcher(projektHandlerMap, defaultHandler))
await new Promise((r) => server.listen(PORT, '127.0.0.1', r))
console.log(`[erzeuge-nachweis] Leitstand auf http://127.0.0.1:${PORT}`)

/** Fährt eine Klickfolge mit scripts/render-nachweis.mjs ab. @param klickfolge - repo-relativer Pfad @param ziel - Ausgabeverzeichnis */
function renderNachweis(klickfolge, ziel) {
  return new Promise((resolve, reject) => {
    const kind = spawn(process.execPath, ['scripts/render-nachweis.mjs', klickfolge, ziel], { cwd: REPO_WURZEL, stdio: 'inherit' })
    kind.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`render-nachweis.mjs endete mit Exit-Code ${code}`))))
    kind.on('error', reject)
  })
}

try {
  await renderNachweis('features/F43/nachweis-f849/klickfolge.json', 'features/F43/nachweis-f849')
  await renderNachweis('features/F43/nachweis-f849/klickfolge-mobil.json', 'features/F43/nachweis-f849/mobil')
} finally {
  server.closeAllConnections()
  await new Promise((r) => server.close(r))
  raeumeVerzeichnis(WURZEL)
}
console.log('[erzeuge-nachweis] fertig.')
