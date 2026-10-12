#!/usr/bin/env node
/**
 * Datei: features/F45/nachweise/f2a/instanz-erneut.mjs
 *
 * Zweck: F45 F-2a — startet die Leitstand-Testinstanz eines früheren beleg13.mjs-Laufs erneut (gleicher Wegwerf-Ordner,
 * gleicher Kontrollzustand, gleiche Läufe), ohne neue Läufe zu starten. Damit lassen sich einzelne Render-Bilder nachziehen,
 * die zu denselben Lauf-IDs gehören wie der übrige Nachweis (ablauf.json, zaehlung-*.json).
 *
 * Wird aufgerufen von: Hand — `node features/F45/nachweise/f2a/instanz-erneut.mjs <Wegwerf-Wurzel aus beleg13.mjs>`;
 * der Server bleibt offen, bis der Prozess beendet wird. Nicht Teil von `npm run check`.
 *
 * Wichtig: schreibt nichts außer dem, was die Leitstand-Instanz selbst bei Aufrufen schreibt (Wegwerf-Kontrollzustand);
 * ~/.ai-workforce/faehigkeiten.lokal.json bleibt unberührt (Pfad im Wegwerf-Ordner).
 */

import { existsSync, readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { join } from 'node:path'
import { erzeugeRequestHandler } from '../../../../scripts/leitstand-server.mjs'

const HIER = import.meta.dirname
const INSTALL = join(HIER, '..', '..', '..', '..')
const PORT = Number(process.env.BELEG13_PORT ?? 4391)
const wurzel = process.argv[2]
if (wurzel === undefined || !existsSync(join(wurzel, 'kontrollzustand')) || !existsSync(join(wurzel, 'testprojekt'))) {
  console.error('Aufruf: node instanz-erneut.mjs <Wegwerf-Wurzel eines beleg13.mjs-Laufs>')
  process.exit(1)
}
const projekt = join(wurzel, 'testprojekt')

// Vorschau des Projekts wie in beleg13.mjs (Ziel von {projekt_origins}; für die Anzeige der Empfehlung).
const vorschau = createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
  res.end(readFileSync(join(projekt, 'public', 'index.html')))
})
await new Promise((r) => vorschau.listen(0, '127.0.0.1', r))

const leitstand = createServer(
  erzeugeRequestHandler({
    basisVerzeichnis: join(wurzel, 'kontrollzustand'),
    repoWurzel: projekt,
    cwd: projekt,
    installWurzel: INSTALL,
    startvorlagePfad: join(INSTALL, 'startvorlagen', 'ai-workforce.json'),
    projektId: 'testprojekt',
    vorschauUrl: `http://127.0.0.1:${vorschau.address().port}`,
    faehigkeitenLokalPfad: join(wurzel, 'ai-workforce-home', 'faehigkeiten.lokal.json'),
    laufausgabeWurzel: join(wurzel, 'laufausgabe'),
    settingsPfad: join(wurzel, 'f4', '.claude', 'settings.json'),
    aktuelleAutorisierungPfad: join(wurzel, 'f4', 'aktuelle-autorisierung.json'),
    startfreigabeRepoWurzel: join(wurzel, 'startfreigabe'),
    rohBasisVerzeichnis: join(wurzel, 'roh'),
  })
)
await new Promise((r) => leitstand.listen(PORT, '127.0.0.1', r))
console.log(`Testinstanz erneut offen: http://127.0.0.1:${PORT}/#/capabilities (Wurzel ${wurzel}, beenden mit Strg+C)`)
