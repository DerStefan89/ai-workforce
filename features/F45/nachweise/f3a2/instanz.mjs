#!/usr/bin/env node
/**
 * Datei: features/F45/nachweise/f3a2/instanz.mjs
 *
 * Zweck: Leitstand-Testinstanz für den Render-Nachweis F45 F-3a-2 (render/erzeuge-nachweis.mjs). Installation = dieses Repo,
 * Ablage im Temp-Ordner; der Plugin-Bestand ist der Fixture-Bestand aus scripts/_plugin-fixture.ts (nie Stefans Plugins),
 * ergänzt um ein Plugin mit langem Namen und Marketplace (Umbruch). GET /api/plugins läuft über den echten Abruf der Route
 * (erzeugePluginAbruf: Leser, Maskierung); danach werden die Wegwerf-Pfade durch den neutralen Ordner C:\fixture ersetzt —
 * keine persönlichen Pfade in den Bildern.
 *
 * Wird aufgerufen von: Hand — `LEITSTAND_PORT=4199 node features/F45/nachweise/f3a2/instanz.mjs`; der Server bleibt offen,
 * bis der Prozess beendet wird. Nicht Teil von `npm run check`.
 */

import { mkdtempSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { legePluginFixtureAn } from '../../../../scripts/_plugin-fixture.ts'
import { erzeugePluginAbruf } from '../../../../scripts/leitstand/routen-plugins.mjs'
import { erzeugeRequestHandler } from '../../../../scripts/leitstand-server.mjs'

const INSTALL = join(import.meta.dirname, '..', '..', '..', '..')
const PORT = Number(process.env.LEITSTAND_PORT ?? 4199)
const NEUTRAL = 'C:\\fixture'
const wurzel = mkdtempSync(join(tmpdir(), 'f45-f3a2-render-'))
const fixture = legePluginFixtureAn(wurzel)
const liste = JSON.parse(fixture.listeJson)
liste.splice(2, 0, { id: 'ein-sehr-langer-plugin-name-fuer-den-umbruch@claude-plugins-official', version: '12.4.0-beta.3', scope: 'user', enabled: false, installPath: fixture.pfade.nurSkill })
const SATZ = ['Read', 'Grep', 'Glob', 'Edit', 'Write', 'Bash(npm run check:*)']

const abruf = erzeugePluginAbruf({ liste: async () => ({ ok: true, stdout: JSON.stringify(liste) }), claudeOrdner: fixture.claudeOrdner, werkzeugsatz: SATZ, projektPfad: join(wurzel, 'projekt-a') })
const handler = erzeugeRequestHandler({ basisVerzeichnis: join(wurzel, 'kontrollzustand'), repoWurzel: INSTALL, installWurzel: INSTALL, projektId: 'ai-workforce', istWorkforceInstanz: true, laufausgabeWurzel: join(wurzel, 'laufausgabe'), rohBasisVerzeichnis: join(wurzel, 'roh') })

/**
 * Ersetzt den Wegwerf-Ordner (roh und JSON-escaped) durch den neutralen Ordner.
 * @param text - JSON-Text
 * @returns Text ohne persönliche Pfade
 */
function neutral(text) {
  return text.split(JSON.stringify(wurzel).slice(1, -1)).join(JSON.stringify(NEUTRAL).slice(1, -1))
}

const server = createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/api/plugins') {
    const koerper = neutral(JSON.stringify(await abruf()))
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    res.end(koerper)
    return
  }
  handler(req, res)
})
await new Promise((r) => server.listen(PORT, '127.0.0.1', r))
console.log(`Testinstanz F-3a-2 offen: http://127.0.0.1:${PORT}/#/capabilities (beenden mit Strg+C)`)
