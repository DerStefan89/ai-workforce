#!/usr/bin/env node
/**
 * Datei: features/F45/nachweise/b2b3e2/instanz.mjs
 *
 * Zweck: Leitstand-Testinstanz für den Render-Nachweis F45 B2b-3e-2 „Budget-Feld + eine Regel für Bereiche“
 * (render/erzeuge-nachweis.mjs). Neutrale Umgebung als erster Import (F-1125, scripts/neutrale-umgebung-starten.mjs):
 * HOME/USERPROFILE/TEMP/TMP zeigen auf einen Laufordner unter `C:\aiw-nachweis` (bzw. AIW_NEUTRAL_WURZEL), der beim Beenden
 * entfernt wird. Wegwerf-Projekt unter `tmpdir()` mit CLAUDE.md dieses Repos, ohne Ablauf (Muster b2b3e1) — `#/projekt`
 * zeigt so das Formular „Auftrag & Start“ mit den neuen Feldern und nur den neutralen Pfad.
 *
 * Wird aufgerufen von: Hand — `node features/F45/nachweise/b2b3e2/instanz.mjs`; bleibt offen bis Strg+C (oder
 * B2B3E2_ENDE_NACH_MS). Nicht Teil von `npm run check`.
 *
 * Wichtig: `neutrale-umgebung-starten.mjs` muss der ERSTE Import bleiben (Gate f45-b2b3e1 (p2b)) — sonst berechnen Module
 * beim Laden Pfade unter dem echten Benutzerordner. Ein hart beendeter Prozess hinterlässt den Laufordner (B2b-3e-3).
 */

import '../../../../scripts/neutrale-umgebung-starten.mjs'
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { erzeugeRequestHandler } from '../../../../scripts/leitstand-server.mjs'
import { fuehreGitSync } from '../../../../src/git-starter/index.ts'
import { ladeStartvorlage } from '../../../../src/startvorlage/index.ts'

const INSTALL = join(import.meta.dirname, '..', '..', '..', '..')
const PORT = Number(process.env.B2B3E2_PORT ?? 4406)
const wurzel = mkdtempSync(join(tmpdir(), 'f45-b2b3e2-render-'))
const projekt = join(wurzel, 'projekt')
for (const datei of ['CLAUDE.md', 'docs/projekt/kontext/beschreibung.md']) {
  mkdirSync(dirname(join(projekt, datei)), { recursive: true })
  copyFileSync(join(INSTALL, datei), join(projekt, datei))
}
writeFileSync(join(projekt, 'README.md'), '# Haushaltsbuch\n')
for (const argumente of [['init', '--quiet'], ['config', 'user.email', 'render@example.invalid'], ['config', 'user.name', 'Render'], ['config', 'core.autocrlf', 'false'], ['checkout', '--quiet', '-b', 'render'], ['add', '.'], ['commit', '--quiet', '-m', 'init']]) {
  fuehreGitSync(argumente, { cwd: projekt, encoding: 'utf8' })
}
const { pruefbefehl: _ohne, ...vorlage } = ladeStartvorlage(join(INSTALL, 'startvorlagen', 'ai-workforce.json'))
const startvorlagePfad = join(wurzel, 'startvorlage.json')
writeFileSync(startvorlagePfad, JSON.stringify(vorlage))

const leitstand = createServer(
  erzeugeRequestHandler({
    basisVerzeichnis: join(wurzel, 'kontrollzustand'),
    repoWurzel: projekt,
    installWurzel: INSTALL,
    startvorlagePfad,
    projektId: 'ai-workforce',
    istWorkforceInstanz: true,
    fuehreAufgabeDurchFn: async () => ({ ok: false, fehler: 'Render-Instanz ohne Ausführung' }),
    laufausgabeWurzel: join(wurzel, 'laufausgabe'),
    rohBasisVerzeichnis: join(wurzel, 'roh'),
  })
)
await new Promise((r) => leitstand.listen(PORT, '127.0.0.1', r))
console.log(`Testinstanz B2b-3e-2 offen: http://127.0.0.1:${PORT}/#/projekt (beenden mit Strg+C)`)
// Mit B2B3E2_ENDE_NACH_MS endet die Instanz selbst über process.exit — der exit-Handler der neutralen Umgebung räumt dann auf.
const endeNachMs = Number(process.env.B2B3E2_ENDE_NACH_MS ?? 0)
if (endeNachMs > 0) setTimeout(() => process.exit(0), endeNachMs)
