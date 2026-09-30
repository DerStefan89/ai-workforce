#!/usr/bin/env node
/**
 * Datei: features/F43/nachweis-ws1/erzeuge-nachweis.mjs
 *
 * Zweck: realer Durchlauf und Render-Nachweis für F43 „Projekt aufrufen/anzeigen“ (Regel F-622).
 * Legt drei Wegwerf-Testprojekte im Temp-Verzeichnis an, schreibt ein Projektregister dafür und
 * baut den Leitstand wie der CLI-Bindeblock (ladeProjektregister → baueProjektHandlerMap →
 * erzeugeMultiProjektDispatcher; ohne Instanz-Lock, damit kein Lock im Arbeitsbaum zurückbleibt)
 * auf Port 4175. Nichts ist gestubbt: die startbefehle laufen real als Node-Prozesse, die Vorschau
 * von f43-demo ist ein echter lokaler HTTP-Server, die von f43-offline ein geschlossener Port.
 *   - f43-demo:    vorschau_url erreichbar, startbefehl schreibt ergebnis.md (mit HTML zum Escapen);
 *   - f43-offline: vorschau_url nicht erreichbar, startbefehl hängt → Zeitgrenze 2 s;
 *   - f43-lang:    startbefehl läuft 4 s — Neuladen während des Aufrufs (AK10);
 *   - f43-leer:    weder vorschau_url noch startbefehl → beide Hinweise.
 * Danach dieselbe Übersicht mit 400 px Breite (klickfolge-mobil.json → mobil/, AK13).
 * Danach fährt scripts/render-nachweis.mjs die Klickfolge (klickfolge.json) im echten Browser ab.
 *
 * Aufruf: node features/F43/nachweis-ws1/erzeuge-nachweis.mjs (nicht Teil von npm run check —
 * braucht Chromium, Muster features/F34/nachweis-fixpaket-ui/erzeuge-nachweis.mjs).
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
const WURZEL = join(tmpdir(), `f43-nachweis-${randomUUID().slice(0, 8)}`)
const PORT = 4175
const VORSCHAU_PORT = 4391
const GESCHLOSSENER_PORT = 4392
const BASIS_VORLAGE = JSON.parse(readFileSync(join(REPO_WURZEL, 'startvorlagen/beispielprojekt.json'), 'utf8'))

const ERGEBNIS_SKRIPT = `import { writeFileSync } from 'node:fs'
const zeilen = ['# Ergebnis des Aufrufs', '', 'Erzeugt: ' + new Date().toISOString(), '', '- Chancen gefunden: 3', '- <b>HTML im Projektinhalt</b> wird nur als Text gezeigt', '']
writeFileSync('ergebnis.md', zeilen.join('\\n'))
console.log('Scanner-Attrappe: 3 Einträge geschrieben nach ergebnis.md')
console.error('Hinweis auf stderr: <script>alert(1)</script>')`

/**
 * Legt ein Testprojekt an.
 * @param id - Projekt-id und Ordnername
 * @param felder - Aufruf-Felder der Startvorlage
 * @param skripte - Dateiname → Inhalt
 */
function legeProjektAn(id, felder, skripte = {}) {
  const repo = join(WURZEL, id)
  mkdirSync(join(repo, 'kontrollzustand'), { recursive: true })
  mkdirSync(join(repo, 'startvorlagen'), { recursive: true })
  writeFileSync(join(repo, 'startvorlagen', `${id}.json`), JSON.stringify({ ...BASIS_VORLAGE, profilPfad: join(REPO_WURZEL, BASIS_VORLAGE.profilPfad), ...felder }, null, 2))
  for (const [datei, inhalt] of Object.entries(skripte)) writeFileSync(join(repo, datei), inhalt)
}

legeProjektAn('f43-demo', { startbefehl: [process.execPath, 'erzeuge-ergebnis.mjs'], startZeitgrenzeMs: 10000, ergebnis_datei: 'ergebnis.md' }, { 'erzeuge-ergebnis.mjs': ERGEBNIS_SKRIPT })
legeProjektAn('f43-offline', { startbefehl: [process.execPath, 'haengt.mjs'], startZeitgrenzeMs: 2000 }, { 'haengt.mjs': 'setTimeout(() => {}, 60000)' })
legeProjektAn('f43-lang', { startbefehl: [process.execPath, 'lang.mjs'], startZeitgrenzeMs: 10000 }, { 'lang.mjs': "setTimeout(() => console.log('nach 4 s fertig'), 4000)" })
legeProjektAn('f43-leer', {})
const eintrag = (id, name, extra = {}) => ({ id, name, repo_pfad: join(WURZEL, id), startvorlage_pfad: `startvorlagen/${id}.json`, profil_pfad: 'profiles/x.json', basisverzeichnis: 'kontrollzustand', status: 'IN_ENTWICKLUNG', ...extra })
writeFileSync(
  join(WURZEL, 'projekte.json'),
  JSON.stringify({
    projekte_schema: 'v0',
    projekte: [
      eintrag('f43-demo', 'F43 Demo (Scanner-Attrappe)', { vorschau_url: `http://127.0.0.1:${VORSCHAU_PORT}` }),
      eintrag('f43-offline', 'F43 Offline', { vorschau_url: `http://127.0.0.1:${GESCHLOSSENER_PORT}` }),
      eintrag('f43-lang', 'F43 Langer Aufruf'),
      eintrag('f43-leer', 'F43 ohne Konfiguration'),
    ],
  })
)

const projekte = ladeProjektregister(join(WURZEL, 'projekte.json'))
const globalerLaufZustand = { aktiv: false, laufId: null, abortController: null }
const projektHandlerMap = new Map()
const defaultHandler = erzeugeRequestHandler({ basisVerzeichnis: join(WURZEL, 'kontrollzustand-default'), globalerLaufZustand, projekte, projektHandlerMap })
for (const [id, handler] of baueProjektHandlerMap(projekte, WURZEL, globalerLaufZustand)) projektHandlerMap.set(id, handler)
const server = createServer(erzeugeMultiProjektDispatcher(projektHandlerMap, defaultHandler))
const vorschau = createServer((_req, res) => res.end('<h1>Demo-Projekt</h1>'))
await new Promise((r) => server.listen(PORT, '127.0.0.1', r))
await new Promise((r) => vorschau.listen(VORSCHAU_PORT, '127.0.0.1', r))
console.log(`[erzeuge-nachweis] Leitstand auf http://127.0.0.1:${PORT}, Vorschau f43-demo auf ${VORSCHAU_PORT}`)

/** Fährt eine Klickfolge mit scripts/render-nachweis.mjs ab. @param klickfolge - repo-relativer Pfad @param ziel - Ausgabeverzeichnis */
function renderNachweis(klickfolge, ziel) {
  return new Promise((resolve, reject) => {
    const kind = spawn(process.execPath, ['scripts/render-nachweis.mjs', klickfolge, ziel], { cwd: REPO_WURZEL, stdio: 'inherit' })
    kind.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`render-nachweis.mjs endete mit Exit-Code ${code}`))))
    kind.on('error', reject)
  })
}

try {
  await renderNachweis('features/F43/nachweis-ws1/klickfolge.json', 'features/F43/nachweis-ws1')
  await renderNachweis('features/F43/nachweis-ws1/klickfolge-mobil.json', 'features/F43/nachweis-ws1/mobil')
} finally {
  server.closeAllConnections()
  await new Promise((r) => server.close(r))
  await new Promise((r) => vorschau.close(r))
  raeumeVerzeichnis(WURZEL)
}
console.log('[erzeuge-nachweis] fertig.')
