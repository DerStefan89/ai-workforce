#!/usr/bin/env node
/**
 * Datei: features/F45/nachweise/b2b3d/instanz.mjs
 *
 * Zweck: Leitstand-Testinstanz für den Render-Nachweis F45 B2b-3d „Umfangs-Abgleich + Eingabefeld Bereiche“
 * (render/erzeuge-nachweis.mjs, Muster features/F45/nachweise/b2b3c/instanz.mjs). Wegwerf-Ablage, Projekt = Wegwerf-Repo mit
 * CLAUDE.md dieses Repos und getrackten Ordnern, Startvorlage der Workforce ohne Prüfbefehl. Ein echter Ablauf über den
 * HTTP-Pfad: Auftrag über POST /api/auftraege mit den Bereichen `src/export/` (wie aus dem Formular), Ausführung → Review;
 * die Attrappe (kein CLI, kein Netz) ändert im Projekt eine Datei innerhalb und drei außerhalb der Bereiche (eine mit
 * langem Pfad) — die echte Änderungsübersicht hält den Abgleich fest, die Abnahme zeigt den Hinweis.
 *
 * Wird aufgerufen von: Hand — `node features/F45/nachweise/b2b3d/instanz.mjs`; gibt die workflowId aus und bleibt offen,
 * bis der Prozess beendet wird. Nicht Teil von `npm run check`.
 */

import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { erzeugeRequestHandler } from '../../../../scripts/leitstand-server.mjs'
import { fuehreGitSync } from '../../../../src/git-starter/index.ts'
import { ladeArtefaktVersion, registriereKernArtefakt } from '../../../../src/lineage-registry/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../../../../src/startvorlage/index.ts'
import { registriereWorkflow } from '../../../../src/workflow/index.ts'

const INSTALL = join(import.meta.dirname, '..', '..', '..', '..')
const PORT = Number(process.env.B2B3D_PORT ?? 4404)
const LANGER_ORDNER = 'lib/abgleich-der-umsatzsteuer-voranmeldung/hilfsfunktionen-fuer-den-export-in-mehrere-formate'
const wurzel = mkdtempSync(join(tmpdir(), 'f45-b2b3d-render-'))
const basisVerzeichnis = join(wurzel, 'kontrollzustand')
const ladeOptionen = { basisVerzeichnis, schreiber: () => {} }
const projekt = join(wurzel, 'projekt')
for (const datei of ['CLAUDE.md', '.claude/agents/code-reviewer.md', 'docs/projekt/kontext/beschreibung.md']) {
  mkdirSync(dirname(join(projekt, datei)), { recursive: true })
  copyFileSync(join(INSTALL, datei), join(projekt, datei))
}
// Getrackte Ordner, damit neue Dateien einzeln (nicht als Ordner) in der Änderungsübersicht stehen.
for (const [pfad, inhalt] of [['src/export/index.ts', 'export {}\n'], ['README.md', '# Haushaltsbuch\n'], [`${LANGER_ORDNER}/index.ts`, 'export {}\n']]) {
  mkdirSync(dirname(join(projekt, pfad)), { recursive: true })
  writeFileSync(join(projekt, pfad), inhalt)
}
for (const argumente of [['init', '--quiet'], ['config', 'user.email', 'render@example.invalid'], ['config', 'user.name', 'Render'], ['config', 'core.autocrlf', 'false'], ['checkout', '--quiet', '-b', 'render'], ['add', '.'], ['commit', '--quiet', '-m', 'init']]) {
  fuehreGitSync(argumente, { cwd: projekt, encoding: 'utf8' })
}
const { pruefbefehl: _ohne, ...vorlage } = ladeStartvorlage(join(INSTALL, 'startvorlagen', 'ai-workforce.json'))
const startvorlagePfad = join(wurzel, 'startvorlage.json')
writeFileSync(startvorlagePfad, JSON.stringify({ ...vorlage, worker: { ...(vorlage.worker ?? {}), codex: { startziel: [String.raw`C:\b2b3d-render\codex.exe`], versionDeklariert: 'codex-cli-render', sandbox: 'read-only' } } }))
const profilReferenz = leiteProfilReferenzAb(ladeStartvorlage(startvorlagePfad))

/** Was die Ausführung im Projekt ändert: eine Datei innerhalb von src/export/, drei außerhalb. */
const AENDERUNGEN = [
  ['src/export/csv.ts', 'export const csv = (zeilen: string[]) => zeilen.join("\\n")\n'],
  ['README.md', '# Haushaltsbuch\n\nMit CSV-Export.\n'],
  ['src/konto.ts', 'export const konto = 1\n'],
  [`${LANGER_ORDNER}/zeichensatz-und-trennzeichen-je-gebietsschema-ermitteln.ts`, 'export const trenner = ";"\n'],
]

/**
 * Attrappe für fuehreAufgabeDurch: die Ausführung schreibt die Änderungen ins Projekt; der Review urteilt BEREIT.
 * @param laufId - Lauf
 * @param _profil - Profilreferenz (ungenutzt)
 * @param eingaben - Eingaben des Laufs
 * @returns Laufergebnis
 */
async function attrappe(laufId, _profil, eingaben) {
  const rolle = eingaben.rolle
  if (rolle === 'ausfuehrung') for (const [pfad, inhalt] of AENDERUNGEN) writeFileSync(join(projekt, pfad), inhalt)
  const ergebnis = rolle === 'code-reviewer' ? JSON.stringify({ urteil: 'BEREIT', befunde: [], empfehlung: 'Keine belastbaren Findings im geprüften Scope.', ak_urteile: [] }) : 'Fertig.'
  const rohstromPfad = join(wurzel, `rohstrom-${laufId}.json`)
  writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: ergebnis }) }))
  const verbrauch = { input_tokens: 120_000, output_tokens: 30_000, cache_read_tokens: 900_000, cache_write_tokens: 0, dauer_ms: 1, dauer_api_ms: null, turns: null, quelle: 'claude-code' }
  const daten = { worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad, inhalts_hash: 'x' }, verbrauch, ...(eingaben.review !== undefined ? { review: eingaben.review } : {}) }
  registriereKernArtefakt(`laufakte-${laufId}`, profilReferenz, { erzeuger: 'kern', schritt: 'render-attrappe' }, daten, [], ladeOptionen)
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
const schritt = (id, rolle, werkzeugsatz, outputSchema, nachfolger, freigabe) => ({
  schritt_id: id,
  rolle,
  werkzeugsatz,
  worker: 'claude-code',
  modell: 'claude-sonnet-5',
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

const antwort = await fetch(`${basis}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel: 'CSV-Export der Buchungen', auftragstext: 'Füge einen CSV-Export der Buchungen hinzu.', bereiche: ['src/export/'] }) })
const { auftragId } = await antwort.json()
const workflowId = `wf-b2b3d-umfang-${Date.now()}`
registriereWorkflow(
  {
    workflow_schema: 'v0',
    workflow_id: workflowId,
    auftrag_id: auftragId,
    version: 1,
    ziel: 'CSV-Export der Buchungen.',
    status: 'OFFEN',
    aktiver_schritt_id: 'schritt-1-ausfuehrung',
    grenzen: { max_schritte: 8, max_replans: 1 },
    schritte: [schritt('schritt-1-ausfuehrung', 'ausfuehrung', 'schreibend', null, 'schritt-2-review', 'ZWINGEND'), schritt('schritt-2-review', 'code-reviewer', 'lesend', 'ergebnis-code-reviewer', null, 'AUTOMATISCH')],
  },
  profilReferenz,
  ladeOptionen
)
const start = await fetch(`${basis}/api/workflows/${workflowId}/starten`, { method: 'POST' })
if (start.status >= 400) console.log(`starten ${start.status} ${await start.text()}`)
const ende = Date.now() + 30000
while (Date.now() < ende) {
  const daten = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, ladeOptionen)?.daten
  if (daten !== undefined && daten.status !== 'LAEUFT' && daten.status !== 'OFFEN' && !daten.schritte.some((s) => s.status === 'LAEUFT')) break
  await new Promise((r) => setTimeout(r, 200))
}
console.log(`Testinstanz B2b-3d offen: ${basis} — ${workflowId} (beenden mit Strg+C)`)
