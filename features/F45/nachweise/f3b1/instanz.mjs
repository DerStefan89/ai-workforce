#!/usr/bin/env node
/**
 * Datei: features/F45/nachweise/f3b1/instanz.mjs
 *
 * Zweck: Leitstand-Testinstanz für den Render-Nachweis F45 F-3b-1b (render/erzeuge-nachweis.mjs). Installation = dieses Repo,
 * alles Übrige im Temp-Ordner: Plugin-Bestand aus Fixtures (scripts/_plugin-kopie-fixture.ts „kraft“ und
 * scripts/_plugin-fixture.ts „nur-skill“ — nie Stefans Plugins), lokale Fähigkeiten-Datei, Ablage der Plugin-Kopien und
 * Kontrollzustand je Durchgang neu. Der Prüflauf ist eine Attrappe (kein Modell): sie liest die gepinnte Version aus dem Auftrag
 * und legt ein Ergebnis MIT_AUFLAGEN ab. GET /api/plugins wird um die Wegwerf-Pfade bereinigt (neutraler Ordner C:\fixture).
 * POST /__neu startet einen frischen Durchgang (neue Ablagen), POST /__ohne-kraft nimmt „kraft“ aus der CLI-Liste (Plugin nicht mehr
 * installiert, F-1094 (8)) — nur diese Testinstanz kennt diese Pfade.
 *
 * Wird aufgerufen von: Hand — `LEITSTAND_PORT=4199 node features/F45/nachweise/f3b1/instanz.mjs`; offen bis zum Prozessende.
 * Nicht Teil von `npm run check`.
 */

import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { sha256Hex, schreibeWirkungsmarke } from '../../../../src/checkpoint-store/index.ts'
import { registriereKernArtefakt } from '../../../../src/lineage-registry/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../../../../src/startvorlage/index.ts'
import { legeKraftPluginAn } from '../../../../scripts/_plugin-kopie-fixture.ts'
import { legePluginFixtureAn } from '../../../../scripts/_plugin-fixture.ts'
import { erzeugeRequestHandler } from '../../../../scripts/leitstand-server.mjs'

const INSTALL = join(import.meta.dirname, '..', '..', '..', '..')
const PORT = Number(process.env.LEITSTAND_PORT ?? 4199)
const NEUTRAL = 'C:\\fixture'
const wurzel = mkdtempSync(join(tmpdir(), 'f45-f3b1-render-'))
const STILL = () => {}
const startvorlagePfad = join(INSTALL, 'startvorlagen', 'ai-workforce.json')
const profilReferenz = leiteProfilReferenzAb(ladeStartvorlage(startvorlagePfad))

/**
 * Ein frischer Durchgang: Plugins, lokale Datei, Kopien, Kontrollzustand neu.
 * @param n - laufende Nummer
 * @returns Handler
 */
function durchgang(n) {
  const d = join(wurzel, `d${n}`)
  const claude = join(d, 'claude')
  const kraft = join(claude, 'plugins', 'cache', 'markt', 'kraft', '2.0.0')
  mkdirSync(join(kraft, '..'), { recursive: true })
  cpSync(legeKraftPluginAn(join(d, 'quelle')), kraft, { recursive: true })
  const andere = legePluginFixtureAn(join(d, 'fixture'))
  let liste = JSON.stringify([
    { id: 'kraft@markt', version: '2.0.0', scope: 'user', enabled: false, installPath: kraft },
    { id: 'nur-skill@markt', version: '0.1.0', scope: 'user', enabled: true, installPath: andere.pfade.nurSkill },
  ])
  const basisVerzeichnis = join(d, 'kontrollzustand')
  const fuehreAufgabeDurchFn = async (laufId, _p, eingaben) => {
    const version = /"gepinnte_version": "([^"]+)"/.exec(eingaben.auftragstext)?.[1]
    const e = { urteil: 'MIT_AUFLAGEN', typ: 'plugin', gepinnte_version: version, befunde: [{ bereich: 'modell_anweisungen', schwere: 'mittel', beleg: 'skills/abschluss/SKILL.md, Zeile 6: „git merge … gh pr create“ — die Workforce führt Git selbst.' }], auflagen: ['Nur der Ausführung zuordnen; abschluss nicht zuordnen.'], zusammenfassung: 'Drei Skills und ein Agent sind schlicht und ohne Hooks; abschluss nennt Veröffentlichen.' }
    schreibeWirkungsmarke(laufId, profilReferenz, 'run_prepared', {}, { basisVerzeichnis, schreiber: STILL })
    const roh = join(basisVerzeichnis, `roh-${laufId}`)
    mkdirSync(roh, { recursive: true })
    const rohInhalt = JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: JSON.stringify(e) }) })
    writeFileSync(join(roh, 'rohstrom.json'), rohInhalt)
    registriereKernArtefakt(`laufakte-${laufId}`, profilReferenz, { erzeuger: 'kern', schritt: 'nachweis' }, { laufakte_schema: 'v0', lauf_id: laufId, werkzeug_version_deklariert: 'nachweis', berechtigungskontext: 'nachweis', arbeitsverzeichnis_pfad: INSTALL, modell_beobachtet: null, worker: 'claude-code', beobachtungsbasis_vollstaendig: true, rohstrom_referenz: { pfad: join(roh, 'rohstrom.json'), inhalts_hash: sha256Hex(rohInhalt) }, erstellt_am: new Date().toISOString() }, [], { basisVerzeichnis, schreiber: STILL })
    return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
  }
  ohneKraft = () => {
    liste = JSON.stringify(JSON.parse(liste).filter((e) => e.id !== 'kraft@markt'))
  }
  return erzeugeRequestHandler({
    basisVerzeichnis,
    fuehreAufgabeDurchFn,
    repoWurzel: INSTALL,
    installWurzel: INSTALL,
    projektId: 'ai-workforce',
    istWorkforceInstanz: true,
    capWurzel: join(d, 'cap'),
    laufausgabeWurzel: join(d, 'laufausgabe'),
    rohBasisVerzeichnis: join(d, 'roh'),
    faehigkeitenLokalPfad: join(d, 'faehigkeiten.lokal.json'),
    pluginListe: async () => ({ ok: true, stdout: liste }),
    pluginClaudeOrdner: claude,
    pluginKopienWurzel: join(d, 'plugin-kopien'),
  })
}

let nummer = 0
/** Nimmt im aktuellen Durchgang „kraft“ aus der Liste. */
let ohneKraft = () => {}
let handler = durchgang(nummer)

/**
 * Ersetzt den Wegwerf-Ordner (roh und JSON-escaped) durch den neutralen Ordner.
 * @param text - JSON-Text
 * @returns Text ohne persönliche Pfade
 */
function neutral(text) {
  const ersetze = (t, von, nach) => t.split(JSON.stringify(von).slice(1, -1)).join(JSON.stringify(nach).slice(1, -1))
  // Auch der Projektordner der Instanz (= dieses Repo, instanz_pfad) trägt einen persönlichen Pfad.
  return ersetze(ersetze(text, wurzel, NEUTRAL), INSTALL, `${NEUTRAL}\\ai-workforce`)
}

const server = createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/__neu') {
    handler = durchgang(++nummer)
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ durchgang: nummer }))
    return
  }
  if (req.method === 'POST' && req.url === '/__ohne-kraft') {
    ohneKraft()
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    res.end('{}')
    return
  }
  if (req.method === 'GET' && req.url === '/api/plugins') {
    // Antwort des echten Handlers abfangen und bereinigen.
    const teile = []
    let status = 200
    const fang = { writeHead: (s) => (status = s), setHeader: () => {}, getHeader: () => undefined, write: (c) => teile.push(String(c)), end: (c) => {
      if (c !== undefined) teile.push(String(c))
      res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
      res.end(neutral(teile.join('')))
    } }
    handler(req, fang)
    return
  }
  handler(req, res)
})
await new Promise((r) => server.listen(PORT, '127.0.0.1', r))
console.log(`Testinstanz F-3b-1 offen: http://127.0.0.1:${PORT}/#/capabilities (beenden mit Strg+C)`)
