#!/usr/bin/env node
/**
 * Datei: features/F45/nachweise/b2a3b/instanz.mjs
 *
 * Zweck: Leitstand-Testinstanz für den Render-Nachweis F45 B2a-3b (render/erzeuge-nachweis.mjs; Muster b2a3/instanz.mjs).
 * Projekt = Wegwerf-Repo „mein projekt“ (Pfad mit Leerzeichen → gequotete cd-Zeile) mit origin-Remote (nur Text, kein Netz)
 * und einem harmlosen Prüfbefehl (npm --version), Ablage in einem Wegwerf-Ordner. Beim Start laufen zwei echte Abläufe
 * Ausführung → Review (Codex) über den HTTP-Pfad; Ausführung und Review spielt eine Attrappe (kein CLI, kein Netz), die
 * eingaben.review in die Laufakte spiegelt wie die Gateways:
 * - veraltet: Review mit geprüftem Stand; danach ändert die Instanz eine Datei im Projekt → „Review veraltet“;
 * - unbestimmt: Laufakte ohne geprueft_stand (wie ein Lauf vor B2a-3b) → „Stand des Reviews nicht bestimmbar“.
 * Die geänderte Datei liefert zugleich die Blöcke „Sichern“ in #/code.
 *
 * Wird aufgerufen von: Hand — `LEITSTAND_PORT=4199 node features/F45/nachweise/b2a3b/instanz.mjs`; gibt die workflowIds aus
 * und bleibt offen, bis der Prozess beendet wird. Nicht Teil von `npm run check`.
 */

import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fuehreGitSync } from '../../../../src/git-starter/index.ts'
import { registriereKernArtefakt } from '../../../../src/lineage-registry/index.ts'
import { KEINE_BEFUNDE_SATZ } from '../../../../src/review-policy/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../../../../src/startvorlage/index.ts'
import { registriereWorkflow } from '../../../../src/workflow/index.ts'
import { erzeugeRequestHandler } from '../../../../scripts/leitstand-server.mjs'

const INSTALL = join(import.meta.dirname, '..', '..', '..', '..')
const PORT = Number(process.env.LEITSTAND_PORT ?? 4199)
const wurzel = mkdtempSync(join(tmpdir(), 'f45-b2a3b-render-'))
const basisVerzeichnis = join(wurzel, 'kontrollzustand')
const projekt = join(wurzel, 'mein projekt')
for (const datei of ['CLAUDE.md', 'ARCHITECTURE.md', '.claude/agents/code-reviewer.md', 'docs/projekt/kontext/beschreibung.md']) {
  mkdirSync(dirname(join(projekt, datei)), { recursive: true })
  copyFileSync(join(INSTALL, datei), join(projekt, datei))
}
mkdirSync(join(projekt, 'src'), { recursive: true })
writeFileSync(join(projekt, 'src', 'export.ts'), 'export const trenner = ";"\n')
for (const argumente of [
  ['init', '--quiet'],
  ['config', 'user.email', 'render@example.invalid'],
  ['config', 'user.name', 'Render'],
  ['config', 'core.autocrlf', 'false'],
  ['checkout', '--quiet', '-b', 'feat/f45-b2a3b-csv-export'],
  ['remote', 'add', 'origin', 'https://github.com/example/mein-projekt.git'],
  ['add', '.'],
  ['commit', '--quiet', '-m', 'init'],
]) {
  fuehreGitSync(argumente, { cwd: projekt, encoding: 'utf8' })
}
const vorlage = ladeStartvorlage(join(INSTALL, 'startvorlagen', 'ai-workforce.json'))
const startvorlagePfad = join(wurzel, 'startvorlage.json')
// Prüfbefehl: npm aus der Startvorlage dieses Repos, aber „--version“ statt „run check“ (läuft nach der Ausführung real).
writeFileSync(startvorlagePfad, JSON.stringify({ ...vorlage, pruefbefehl: [...vorlage.pruefbefehl.slice(0, 2), '--version'], worker: { ...(vorlage.worker ?? {}), codex: { startziel: [String.raw`C:\b2a3b-render\codex.exe`], versionDeklariert: 'codex-cli-render', sandbox: 'read-only' } } }))
const profilReferenz = leiteProfilReferenzAb(ladeStartvorlage(startvorlagePfad))
const REVIEW = { urteil: 'BEREIT', befunde: [], empfehlung: `Checkliste: alles erfüllt. ${KEINE_BEFUNDE_SATZ}.`, ak_urteile: [] }

/**
 * Attrappe für fuehreAufgabeDurch: die Art steht im Auftragstext ([veraltet]/[unbestimmt]).
 * @param laufId - Lauf
 * @param _profil - Profilreferenz (ungenutzt)
 * @param eingaben - Eingaben des Laufs
 * @returns Laufergebnis
 */
async function attrappe(laufId, _profil, eingaben) {
  const art = /\[(veraltet|unbestimmt)\]/.exec(eingaben.auftragstext ?? '')?.[1] ?? 'veraltet'
  const rohstromPfad = join(wurzel, `rohstrom-${laufId}.json`)
  const ergebnis = eingaben.rolle === 'code-reviewer' ? JSON.stringify(REVIEW) : 'Fertig.'
  writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: ergebnis }) }))
  let review = eingaben.review
  if (review !== undefined && art === 'unbestimmt') review = { policy_version: review.policy_version }
  const daten = {
    worker: 'claude-code',
    rohstrom_referenz: { pfad: rohstromPfad, inhalts_hash: 'x' },
    ...(eingaben.projektkarte !== undefined ? { projektkarte: eingaben.projektkarte } : {}),
    ...(review !== undefined ? { review } : {}),
  }
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

const ids = {}
for (const [art, titel] of [
  ['veraltet', 'CSV-Export, danach weiter geändert'],
  ['unbestimmt', 'CSV-Export aus einem älteren Lauf'],
]) {
  const { auftragId } = await (await fetch(`${basis}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel, auftragstext: `Füge einen CSV-Export hinzu. [${art}]` }) })).json()
  const workflowId = `wf-b2a3b-${art}-${Date.now()}`
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
  console.log(`${art}: starten ${start.status} ${start.status >= 400 ? await start.text() : ''}`)
  ids[art] = workflowId
  // nacheinander: ein Lauf zur Zeit (D13)
  const ende = Date.now() + 30000
  while (Date.now() < ende) {
    const status = (await (await fetch(`${basis}/api/workflows/${workflowId}/abnahme`)).json())?.workflowStatus
    if (status !== undefined && status !== 'LAEUFT' && status !== 'OFFEN') break
    await new Promise((r) => setTimeout(r, 200))
  }
}
// Erst nach beiden Abläufen (ein schreibender Schritt verlangt einen sauberen Arbeitsbaum): Änderung → „veraltet“ und „Sichern“.
writeFileSync(join(projekt, 'src', 'export.ts'), 'export const trenner = ","\n')
writeFileSync(join(projekt, 'src', 'csv export.ts'), 'export const kopf = ["Datum", "Betrag"]\n')
console.log(`Testinstanz B2a-3b offen: ${basis} — ${JSON.stringify(ids)} (Wurzel ${wurzel}, beenden mit Strg+C)`)
