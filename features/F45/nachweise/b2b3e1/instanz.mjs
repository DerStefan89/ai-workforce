#!/usr/bin/env node
/**
 * Datei: features/F45/nachweise/b2b3e1/instanz.mjs
 *
 * Zweck: Leitstand-Testinstanz für den Nachweis F45 B2b-3e-1 „keine persönlichen Pfade in Render-Screenshots“ (F-1125,
 * render/erzeuge-nachweis.mjs). Erste Instanz mit neutraler Umgebung: der erste Import richtet HOME/USERPROFILE/TEMP/TMP auf
 * einen Laufordner unter `C:\aiw-nachweis` (bzw. AIW_NEUTRAL_WURZEL) ein und entfernt ihn beim Beenden. Wegwerf-Projekt unter
 * `tmpdir()` mit CLAUDE.md dieses Repos (Muster b2b3d, ohne Ablauf) — „Wo gearbeitet wird“ in `#/projekt` zeigt so nur den
 * neutralen Pfad. Gibt os.tmpdir()/os.homedir() und das Ergebnis der Pfadprobe darauf aus.
 *
 * Wird aufgerufen von: Hand — `node features/F45/nachweise/b2b3e1/instanz.mjs`; bleibt offen bis Strg+C. Nicht Teil von
 * `npm run check`.
 */

import '../../../../scripts/neutrale-umgebung-starten.mjs'
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { homedir, tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { findePersoenlichePfade } from '../../../../scripts/render-pfadprobe.mjs'
import { erzeugeRequestHandler } from '../../../../scripts/leitstand-server.mjs'
import { fuehreGitSync } from '../../../../src/git-starter/index.ts'
import { ladeStartvorlage } from '../../../../src/startvorlage/index.ts'

const INSTALL = join(import.meta.dirname, '..', '..', '..', '..')
const PORT = Number(process.env.B2B3E1_PORT ?? 4405)
const wurzel = mkdtempSync(join(tmpdir(), 'f45-b2b3e1-render-'))
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
const orte = { tmpdir: tmpdir(), homedir: homedir(), projekt }
console.log(`os.tmpdir() = ${orte.tmpdir}`)
console.log(`os.homedir() = ${orte.homedir}`)
console.log(`Projekt = ${orte.projekt}`)
console.log(`Pfadprobe darauf: ${JSON.stringify(Object.values(orte).flatMap((p) => findePersoenlichePfade(p)))}`)
console.log(`Testinstanz B2b-3e-1 offen: http://127.0.0.1:${PORT}/#/projekt (beenden mit Strg+C)`)
// Belegt das Aufräumen am echten Lauf: mit B2B3E1_ENDE_NACH_MS endet die Instanz selbst über process.exit — der exit-Handler
// der neutralen Umgebung entfernt dann den Laufordner (ein von außen hart beendeter Prozess hinterließe ihn).
const endeNachMs = Number(process.env.B2B3E1_ENDE_NACH_MS ?? 0)
if (endeNachMs > 0) setTimeout(() => process.exit(0), endeNachMs)
