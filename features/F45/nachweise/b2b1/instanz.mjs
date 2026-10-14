#!/usr/bin/env node
/**
 * Datei: features/F45/nachweise/b2b1/instanz.mjs
 *
 * Zweck: Leitstand-Testinstanz für den Render-Nachweis F45 B2b-1a „Review wiederholen“ (render/erzeuge-nachweis.mjs,
 * Muster features/F45/nachweise/b2a3/instanz.mjs). Wegwerf-Ablage, Projekt = Wegwerf-Repo mit CLAUDE.md dieses Repos,
 * Startvorlage ohne Prüfbefehl. Beim Start läuft ein echter Ablauf Ausführung → Review (Codex) über den HTTP-Pfad;
 * die Attrappe (kein CLI, kein Netz) lässt den ERSTEN Review-Lauf am Werkzeug scheitern (KLAERUNG_ERFORDERLICH,
 * „Review wiederholen“ angeboten) und liefert jedem weiteren Review BEREIT — der Klick im Nachweis zeigt so den ganzen
 * Weg (zurücksetzen, starten, abgeschlossen).
 *
 * Wird aufgerufen von: Hand — `node features/F45/nachweise/b2b1/instanz.mjs`; gibt die workflowId aus und bleibt offen,
 * bis der Prozess beendet wird. Nicht Teil von `npm run check`.
 */

import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { erzeugeRequestHandler } from '../../../../scripts/leitstand-server.mjs'
import { fuehreGitSync } from '../../../../src/git-starter/index.ts'
import { registriereKernArtefakt } from '../../../../src/lineage-registry/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../../../../src/startvorlage/index.ts'
import { registriereWorkflow } from '../../../../src/workflow/index.ts'

const INSTALL = join(import.meta.dirname, '..', '..', '..', '..')
const PORT = Number(process.env.B2B1_PORT ?? 4398)
const wurzel = mkdtempSync(join(tmpdir(), 'f45-b2b1-render-'))
const basisVerzeichnis = join(wurzel, 'kontrollzustand')
const projekt = join(wurzel, 'projekt')
for (const datei of ['CLAUDE.md', '.claude/agents/code-reviewer.md', 'docs/projekt/kontext/beschreibung.md']) {
  mkdirSync(dirname(join(projekt, datei)), { recursive: true })
  copyFileSync(join(INSTALL, datei), join(projekt, datei))
}
for (const argumente of [['init', '--quiet'], ['config', 'user.email', 'render@example.invalid'], ['config', 'user.name', 'Render'], ['config', 'core.autocrlf', 'false'], ['checkout', '--quiet', '-b', 'render'], ['add', '.'], ['commit', '--quiet', '-m', 'init']]) {
  fuehreGitSync(argumente, { cwd: projekt, encoding: 'utf8' })
}
const { pruefbefehl: _ohne, ...vorlage } = ladeStartvorlage(join(INSTALL, 'startvorlagen', 'ai-workforce.json'))
const startvorlagePfad = join(wurzel, 'startvorlage.json')
writeFileSync(startvorlagePfad, JSON.stringify({ ...vorlage, worker: { ...(vorlage.worker ?? {}), codex: { startziel: [String.raw`C:\b2b1-render\codex.exe`], versionDeklariert: 'codex-cli-render', sandbox: 'read-only' } } }))
const profilReferenz = leiteProfilReferenzAb(ladeStartvorlage(startvorlagePfad))

let reviewLaeufe = 0

/**
 * Attrappe für fuehreAufgabeDurch: erster Review-Lauf fällt aus (Werkzeugausfall nach dem ersten Checkpoint, also nicht
 * heilbar), jeder weitere Review urteilt BEREIT ohne Befunde mit Pflichtsatz.
 * @param laufId - Lauf
 * @param _profil - Profilreferenz (ungenutzt)
 * @param eingaben - Eingaben des Laufs
 * @returns Laufergebnis
 */
async function attrappe(laufId, _profil, eingaben) {
  if (eingaben.rolle === 'code-reviewer') {
    reviewLaeufe += 1
    if (reviewLaeufe === 1) {
      mkdirSync(join(basisVerzeichnis, laufId), { recursive: true })
      return { ok: false, grund: 'Render-Attrappe: Werkzeugausfall' }
    }
  }
  const rohstromPfad = join(wurzel, `rohstrom-${laufId}.json`)
  const ergebnis =
    eingaben.rolle === 'code-reviewer' ? JSON.stringify({ urteil: 'BEREIT', befunde: [], empfehlung: 'Keine belastbaren Findings im geprüften Scope.', ak_urteile: [] }) : 'Fertig.'
  writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: ergebnis }) }))
  const daten = { worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad, inhalts_hash: 'x' }, ...(eingaben.review !== undefined ? { review: eingaben.review } : {}) }
  registriereKernArtefakt(`laufakte-${laufId}`, profilReferenz, { erzeuger: 'kern', schritt: 'render-attrappe' }, daten, [], { basisVerzeichnis, schreiber: () => {} })
  return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH', bypass_verdacht_anzahl: 0 }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
}

const leitstand = createServer(
  erzeugeRequestHandler({
    basisVerzeichnis,
    repoWurzel: projekt,
    installWurzel: INSTALL,
    startvorlagePfad,
    projektId: 'ai-workforce',
    istWorkforceInstanz: true,
    fuehreAufgabeDurchFn: attrappe,
    laufausgabeWurzel: join(wurzel, 'laufausgabe'),
    rohBasisVerzeichnis: join(wurzel, 'roh'),
  })
)
await new Promise((r) => leitstand.listen(PORT, '127.0.0.1', r))
const basis = `http://127.0.0.1:${PORT}`
const schritt = (id, rolle, werkzeugsatz, worker, outputSchema, nachfolger, freigabe) => ({
  schritt_id: id,
  rolle,
  werkzeugsatz,
  worker,
  modell: worker === 'codex' ? 'gpt-6-astra' : 'claude-sonnet-5',
  eingaben: [],
  output_schema: outputSchema,
  freigabe,
  ...(freigabe === 'ZWINGEND' ? { freigabe_erteilt: true } : {}),
  risiko: 'Render-Nachweis.',
  zeitgrenze_ms: 600000,
  nachfolger,
  status: 'OFFEN',
  lauf_id: null,
})

const titel = 'CSV-Export, Review fällt einmal aus'
const { auftragId } = await (await fetch(`${basis}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel, auftragstext: 'Füge einen CSV-Export hinzu.' }) })).json()
const workflowId = `wf-b2b1-ausfall-${Date.now()}`
registriereWorkflow(
  {
    workflow_schema: 'v0',
    workflow_id: workflowId,
    auftrag_id: auftragId,
    version: 1,
    ziel: `${titel}.`,
    status: 'OFFEN',
    aktiver_schritt_id: 'schritt-1-ausfuehrung',
    grenzen: { max_schritte: 6, max_replans: 1 },
    schritte: [schritt('schritt-1-ausfuehrung', 'ausfuehrung', 'schreibend', 'claude-code', null, 'schritt-2-review', 'ZWINGEND'), schritt('schritt-2-review', 'code-reviewer', 'lesend', 'codex', 'ergebnis-code-reviewer', null, 'AUTOMATISCH')],
  },
  profilReferenz,
  { basisVerzeichnis, schreiber: () => {} }
)
const start = await fetch(`${basis}/api/workflows/${workflowId}/starten`, { method: 'POST' })
console.log(`starten ${start.status} ${start.status >= 400 ? await start.text() : ''}`)
const ende = Date.now() + 30000
while (Date.now() < ende) {
  const status = (await (await fetch(`${basis}/api/workflows/${workflowId}`)).json())?.status
  if (status !== undefined && status !== 'LAEUFT' && status !== 'OFFEN') break
  await new Promise((r) => setTimeout(r, 200))
}
console.log(`Testinstanz B2b-1a offen: ${basis} — ${workflowId} (beenden mit Strg+C)`)
