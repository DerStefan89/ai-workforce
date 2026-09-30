#!/usr/bin/env node
/**
 * Datei: features/F36/nachweis-fixpaket-pr2/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweis (F-622) für F-828 — die Lauf-Detailansicht eines AKTIVEN Laufs (nur
 * run_prepared, keine Terminalmarke) zeigt „Klärzustand: läuft“ und keine Maske „Klärung auflösen“;
 * nach dem Ende (Detail neu geöffnet) erscheint die normale Maske. Startet einen Fixture-Leitstand
 * (Wegwerf-Kontrollzustand und -Repo) mit einem Attrappen-Lauf, der bis zur Freigabe durch dieses
 * Skript aktiv bleibt, und fährt je eine Klickfolge mit scripts/render-nachweis.mjs ab. Nur der
 * Laufausgang ist gestubbt; HTTP, Laufstatus und Detailansicht sind echt.
 * Das Bild zu F-826 (Hinweis vor „Freigeben“) stammt aus features/F36/nachweis-ws5a-ui/
 * (Szenario 'erfolg', 01-knopf.png), kopiert als f826-hinweis-vor-freigeben.png.
 *
 * Wird aufgerufen von: Hand (nicht Teil von `npm run check`, braucht Chromium).
 *
 * Wichtig: Die laufId ist fest, weil die Klickfolgen sie in der URL tragen.
 *
 * Aufruf: node features/F36/nachweis-fixpaket-pr2/erzeuge-nachweis.mjs
 */

import { execFileSync, spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { schreibeWirkungsmarke } from '../../../src/checkpoint-store/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../../../src/startvorlage/index.ts'
import { erzeugeRequestHandler } from '../../../scripts/leitstand-server.mjs'
import { raeumeVerzeichnis } from '../../../scripts/_aufraeumen.ts'

const HIER = dirname(fileURLToPath(import.meta.url))
const REPO_WURZEL = join(HIER, '..', '..', '..')
const BASISVERZEICHNIS = 'kontrollzustand-test-f828-nachweis'
const PORT = 4176
const LAUF_ID = 'nachweis-f828-aktiv'

const fremdRepo = mkdtempSync(join(tmpdir(), 'f828-nachweis-repo-'))
const git = (argumente) => execFileSync('git', argumente, { cwd: fremdRepo, encoding: 'utf8' })
git(['init', '--quiet', '-b', 'wegwerf-branch'])
git(['config', 'user.email', 'nachweis@example.invalid'])
git(['config', 'user.name', 'Nachweis'])
writeFileSync(join(fremdRepo, 'package.json'), '{ "name": "fremd" }\n')
git(['add', '-A'])
git(['commit', '--quiet', '-m', 'init'])
const vorlagenOrdner = mkdtempSync(join(tmpdir(), 'f828-nachweis-vorlage-'))
const startvorlagePfad = join(vorlagenOrdner, 'startvorlage.json')
writeFileSync(startvorlagePfad, JSON.stringify(ladeStartvorlage(join(REPO_WURZEL, 'startvorlagen/ai-workforce.json'))))
const profilReferenz = leiteProfilReferenzAb(ladeStartvorlage(startvorlagePfad))
const ladeOptionen = { basisVerzeichnis: BASISVERZEICHNIS, schreiber: () => {} }

let laufFreigeben = () => {}
const laufFreigegeben = new Promise((resolve) => {
  laufFreigeben = resolve
})

/** Attrappen-Lauf: run_prepared sofort, Terminalmarke FEHLGESCHLAGEN erst nach laufFreigeben(). */
async function fuehreAufgabeDurchFn(laufId) {
  schreibeWirkungsmarke(laufId, profilReferenz, 'run_prepared', {}, ladeOptionen)
  await laufFreigegeben
  schreibeWirkungsmarke(laufId, profilReferenz, 'terminal', { ergebnis: 'FEHLGESCHLAGEN', daten: {} }, ladeOptionen)
  return { ok: true, klassifikation: { ergebnis: 'FEHLGESCHLAGEN', bypass_verdacht_anzahl: 0 }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'FEHLGESCHLAGEN' } }
}

/** Fährt eine Klickfolge dieses Ordners mit scripts/render-nachweis.mjs ab. */
function renderNachweis(klickfolge, ausgabe) {
  return new Promise((resolve, reject) => {
    const kind = spawn('node', ['scripts/render-nachweis.mjs', join(HIER, klickfolge), join(HIER, ausgabe)], { cwd: REPO_WURZEL, stdio: 'inherit' })
    kind.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`render-nachweis.mjs endete mit Exit-Code ${code}`))))
    kind.on('error', reject)
  })
}

/** Wartet, bis GET /api/laeufe/<laufId> das erwartete aktiv-Flag meldet. */
async function warteAufAktiv(basisUrl, erwartet) {
  const beginn = Date.now()
  while (Date.now() - beginn < 10000) {
    const antwort = await fetch(`${basisUrl}/api/laeufe/${LAUF_ID}`)
    if (antwort.ok && (await antwort.json()).aktiv === erwartet) return
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  throw new Error(`Lauf '${LAUF_ID}' erreichte aktiv=${erwartet} nicht`)
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
  const auftrag = await (await fetch(`${basisUrl}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel: 'F-828 Nachweis', auftragstext: 'NACHWEIS' }) })).json()
  const start = await fetch(`${basisUrl}/api/laeufe`, {
    method: 'POST',
    body: JSON.stringify({ laufId: LAUF_ID, rolle: 'ausfuehrung', anfragen: [], budget: {}, aufrufEingaben: { modell: 'test-modell' }, werkzeugsatz: 'lesend', auftragId: auftrag.auftragId }),
  })
  if (start.status !== 202) throw new Error(`Laufstart erwartet 202, erhalten ${start.status} (${await start.text()})`)
  await warteAufAktiv(basisUrl, true)
  await renderNachweis('klickfolge-aktiv.json', 'aktiv')
  laufFreigeben()
  await warteAufAktiv(basisUrl, false)
  await renderNachweis('klickfolge-nach-ende.json', 'nach-ende')
} finally {
  laufFreigeben()
  await new Promise((resolve) => server.close(resolve))
  raeumeVerzeichnis(BASISVERZEICHNIS)
  raeumeVerzeichnis(fremdRepo)
  raeumeVerzeichnis(vorlagenOrdner)
}
console.log('[erzeuge-nachweis] fertig.')
