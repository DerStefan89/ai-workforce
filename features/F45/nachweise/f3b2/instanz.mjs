#!/usr/bin/env node
/**
 * Datei: features/F45/nachweise/f3b2/instanz.mjs
 *
 * Zweck: Testinstanz des Leitstands für den Render-Nachweis F45 F-3b-2 (Muster features/F45/nachweise/f2a/instanz-erneut.mjs):
 * derselbe Code dieses Worktrees, Kontrollzustand und Arbeitsordner der Wegwerf-Wurzel eines beleg.mjs-Laufs (echte Laufakten
 * L1/L2 mit faehigkeiten_im_lauf), Port 4392. Keine Prüfläufe, keine Plugin-Kopie-Wurzel (Standard null), keine lokale Datei
 * von Stefan.
 *
 * Wird aufgerufen von: Hand — node features/F45/nachweise/f3b2/instanz.mjs <Wegwerf-Wurzel des Belegs>; danach
 * render/erzeuge-nachweis.mjs. Nicht Teil von `npm run check`.
 */

import { existsSync } from 'node:fs'
import { createServer } from 'node:http'
import { join } from 'node:path'
import { erzeugeRequestHandler } from '../../../../scripts/leitstand-server.mjs'

const HIER = import.meta.dirname
const INSTALL = join(HIER, '..', '..', '..', '..')
const PORT = Number(process.env.F3B2_PORT ?? 4392)
const wurzel = process.argv[2]
if (wurzel === undefined || !existsSync(join(wurzel, 'kontrollzustand')) || !existsSync(join(wurzel, 'testprojekt'))) {
  console.error('Aufruf: node instanz.mjs <Wegwerf-Wurzel eines beleg.mjs-Laufs>')
  process.exit(1)
}
const leitstand = createServer(
  erzeugeRequestHandler({
    basisVerzeichnis: join(wurzel, 'kontrollzustand'),
    repoWurzel: join(wurzel, 'testprojekt'),
    cwd: join(wurzel, 'testprojekt'),
    installWurzel: INSTALL,
    startvorlagePfad: join(INSTALL, 'startvorlagen', 'ai-workforce.json'),
    projektId: 'testprojekt',
    faehigkeitenLokalPfad: join(wurzel, 'L2-faehigkeiten.lokal.json'),
    laufausgabeWurzel: join(wurzel, 'laufausgabe'),
    rohBasisVerzeichnis: join(wurzel, 'roh'),
  })
)
await new Promise((r) => leitstand.listen(PORT, '127.0.0.1', r))
console.log(`Testinstanz offen: http://127.0.0.1:${PORT}/ (Wurzel ${wurzel}, beenden mit Strg+C)`)
