#!/usr/bin/env node
/**
 * Datei: features/F36/nachweis-ws4-ui/erzeuge-nachweis.mjs
 *
 * Zweck: F36 WS-4 (AK8, F-622) — Render-Nachweis der Zeile „Beobachtung“ in
 * der Laufdetailansicht. Startet einen Fixture-Leitstand (Muster
 * features/F34/nachweis-fixpaket-ui/erzeuge-nachweis.mjs) mit zwei Läufen:
 * einer mit Laufakten-Feld `beobachtung` (erzeugt über das echte
 * leseBeobachtung aus gekürzten Spike-Rohstromzeilen), einer ohne (alte
 * Laufakte) — und fährt die drei Klickfolgen per scripts/render-nachweis.mjs ab.
 *
 * Aufruf: node features/F36/nachweis-ws4-ui/erzeuge-nachweis.mjs
 * NICHT Teil von `npm run check` (braucht einen echten Browser).
 */

import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { raeumeVerzeichnis } from '../../../scripts/_aufraeumen.ts'
import { erzeugeRequestHandler } from '../../../scripts/leitstand-server.mjs'
import { leseBeobachtung } from '../../../src/claude-code-gateway/index.ts'
import { schreibeWirkungsmarke, sha256Hex } from '../../../src/checkpoint-store/index.ts'
import { registriereKernArtefakt } from '../../../src/lineage-registry/index.ts'

const HIER = dirname(fileURLToPath(import.meta.url))
const REPO_WURZEL = join(HIER, '..', '..', '..')
const BASISVERZEICHNIS = 'kontrollzustand-test-f36-ws4-nachweis'
const PORT = 4175

/** Gekürzte Zeilen aus den Spike-Rohströmen (state/spike-f36-werkzeugsatz.md), dieselbe Form wie src/claude-code-gateway/beobachtung.test.ts. */
const ZEILEN = [
  { type: 'system', subtype: 'init', tools: ['Task', 'Bash', 'Read', 'Skill', 'mcp__playwright-mcp__browser_navigate'], mcp_servers: [{ name: 'playwright-mcp', status: 'connected' }], agents: ['architecture-advisor', 'code-reviewer', 'general-purpose', 'qa'], skills: ['advisor-pass', 'git-flow', 'ponytail'] },
  { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Skill', input: { skill: 'ponytail' } }] }, parent_tool_use_id: null },
  { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Agent', input: { subagent_type: 'qa', description: 'QA' } }] }, parent_tool_use_id: null },
  { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'mcp__playwright-mcp__browser_navigate', input: { url: 'about:blank' } }] }, parent_tool_use_id: 'toolu_1' },
  { type: 'result', subtype: 'success', is_error: false, result: 'ok', permission_denials: [] },
].map((z) => JSON.stringify(z))

/** Legt einen abgeschlossenen Lauf mit Laufakte an; beobachtung nur, wenn übergeben. */
function legeLaufAn(laufId, beobachtung) {
  const optionen = { basisVerzeichnis: BASISVERZEICHNIS, schreiber: () => {} }
  const profilReferenz = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
  mkdirSync(BASISVERZEICHNIS, { recursive: true })
  const rohPfad = resolve(BASISVERZEICHNIS, `${laufId}-rohstrom.json`)
  const rohInhalt = JSON.stringify({ stdout: ZEILEN.join('\n'), stderr: '', exitCode: 0, startfehler: null, beendigungsart: null })
  writeFileSync(rohPfad, rohInhalt, 'utf8')
  schreibeWirkungsmarke(laufId, profilReferenz, 'run_prepared', {}, optionen)
  schreibeWirkungsmarke(laufId, profilReferenz, 'terminal', { ergebnis: 'ERFOLGREICH' }, optionen)
  registriereKernArtefakt(
    `laufakte-${laufId}`,
    profilReferenz,
    { erzeuger: 'kern', schritt: 'claude-code-gateway-lauf' },
    {
      laufakte_schema: 'v0',
      lauf_id: laufId,
      werkzeug_version_deklariert: '2.1.283',
      berechtigungskontext: 'ausfuehrung',
      arbeitsverzeichnis_pfad: 'C:\\Users\\stefa\\Projekte\\beispiel',
      modell_beobachtet: 'claude-sonnet-5',
      beobachtungsbasis_vollstaendig: true,
      rohstrom_referenz: { pfad: rohPfad, inhalts_hash: sha256Hex(rohInhalt) },
      erstellt_am: new Date().toISOString(),
      worker: 'claude-code',
      ...(beobachtung !== null ? { beobachtung } : {}),
    },
    [],
    optionen
  )
}

/** Fährt eine Klickfolge per render-nachweis.mjs ab. */
function renderNachweis(klickfolge, ausgabe) {
  return new Promise((ok, fehler) => {
    const kind = spawn('node', ['scripts/render-nachweis.mjs', join('features/F36/nachweis-ws4-ui', klickfolge), join('features/F36/nachweis-ws4-ui', ausgabe)], { cwd: REPO_WURZEL, stdio: 'inherit' })
    kind.on('exit', (code) => (code === 0 ? ok() : fehler(new Error(`render-nachweis.mjs endete mit Exit-Code ${code}`))))
    kind.on('error', fehler)
  })
}

raeumeVerzeichnis(BASISVERZEICHNIS)
legeLaufAn('f36-ws4-mit-beobachtung', leseBeobachtung(ZEILEN))
legeLaufAn('f36-ws4-ohne-beobachtung', null)
const server = createServer(erzeugeRequestHandler({ basisVerzeichnis: BASISVERZEICHNIS, projektId: 'f36-ws4-nachweis' }))
await new Promise((ok, fehler) => {
  server.once('error', fehler)
  server.listen(PORT, '127.0.0.1', ok)
})
console.log(`[erzeuge-nachweis] Fixture-Leitstand läuft auf http://127.0.0.1:${PORT}`)
try {
  await renderNachweis('klickfolge-mit.json', 'mit')
  await renderNachweis('klickfolge-ohne.json', 'ohne')
  await renderNachweis('klickfolge-mit-mobil.json', 'mobil')
} finally {
  await new Promise((ok) => server.close(ok))
  raeumeVerzeichnis(BASISVERZEICHNIS)
}
console.log('[erzeuge-nachweis] fertig.')
