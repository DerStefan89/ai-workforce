#!/usr/bin/env node
/**
 * Datei: features/F45/nachweise/f2b2/render/instanz.mjs
 *
 * Zweck: Leitstand-Testinstanz der Workforce mit Oberfläche für den Render-Nachweis F45 F-2b-2a (Port 4393): Installation =
 * dieses Repo (echte Sammlung, echter Katalog), Wegwerf-Kontrollzustand in %TEMP%, istWorkforceInstanz. Prüfläufe startet
 * der Nachweis nicht — die Zustände „läuft“ und die Berichte kommen über Antwort-Attrappen (erzeuge-nachweis.mjs).
 * Hält den Server offen, bis der Prozess beendet wird.
 *
 * Wird aufgerufen von: Hand (`node features/F45/nachweise/f2b2/render/instanz.mjs`), nicht von `npm run check`.
 */

import { mkdtempSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { erzeugeRequestHandler } from '../../../../../scripts/leitstand-server.mjs'

const INSTALL = join(import.meta.dirname, '..', '..', '..', '..', '..')
const PORT = Number(process.env.F2B2_RENDER_PORT ?? 4393)
const wurzel = mkdtempSync(join(tmpdir(), 'f45-f2b2-render-'))
const server = createServer(
  erzeugeRequestHandler({
    basisVerzeichnis: join(wurzel, 'kontrollzustand'),
    repoWurzel: INSTALL,
    cwd: INSTALL,
    installWurzel: INSTALL,
    startvorlagePfad: join(INSTALL, 'startvorlagen', 'ai-workforce.json'),
    projektId: 'ai-workforce',
    istWorkforceInstanz: true,
    rohBasisVerzeichnis: join(wurzel, 'roh'),
    laufausgabeWurzel: join(wurzel, 'laufausgabe'),
    capWurzel: join(wurzel, 'cap'),
  })
)
server.listen(PORT, '127.0.0.1', () => console.log(`Leitstand (Render-Instanz F-2b-2a): http://127.0.0.1:${PORT}  ·  Wurzel ${wurzel}`))
