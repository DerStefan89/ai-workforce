#!/usr/bin/env node
/**
 * Datei: features/F45/nachweise/b2b2a/instanz.mjs
 *
 * Zweck: Leitstand-Testinstanz für den Render-Nachweis F45 B2b-2a „Review vollständig“ (render/erzeuge-nachweis.mjs,
 * Muster features/F45/nachweise/b2b1/instanz.mjs). Wegwerf-Ablage, Projekt = Wegwerf-Repo mit CLAUDE.md dieses Repos,
 * Startvorlage ohne Prüfbefehl. Beim Start läuft ein echter Ablauf Ausführung → Review über den HTTP-Pfad; der Review ist
 * ein claude-code-Reviewer mit output_schema 'ergebnis-code-reviewer' (seit B2b-2a zulässig, Regel 4b). Die Attrappe
 * (kein CLI, kein Netz) lässt ihn BEREIT mit einem HOCH- und einem NIEDRIG-Befund urteilen — die Abnahme zeigt den
 * amber Hinweis „bereit trotz schwerer Befunde“ und „Claude“ als Reviewer.
 *
 * Wird aufgerufen von: Hand — `node features/F45/nachweise/b2b2a/instanz.mjs`; gibt die workflowId aus und bleibt offen,
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
const PORT = Number(process.env.B2B2A_PORT ?? 4401)
const wurzel = mkdtempSync(join(tmpdir(), 'f45-b2b2a-render-'))
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
writeFileSync(startvorlagePfad, JSON.stringify(vorlage))
const profilReferenz = leiteProfilReferenzAb(ladeStartvorlage(startvorlagePfad))

const BEFUNDE = [
  {
    id: 'B1',
    dimension: 'bugs',
    schwere: 'HOCH',
    fundstelle: 'src/export/csv.ts:42 (sehr/langer/pfad/zur/fundstelle/die/umbrechen/muss/ohne/das/layout/zu/sprengen.ts)',
    zusammenfassung: 'Felder mit Zeilenumbruch werden nicht in Anführungszeichen gesetzt — die Datei zerfällt beim Öffnen in einer Tabellenkalkulation.',
    beleg: 'Statisch: escapeFeld prüft nur Komma und Anführungszeichen.',
    korrekturrichtung: 'Zeilenumbruch in die Bedingung von escapeFeld aufnehmen und mit einem Randfalltest absichern.',
    evidenz: 'confirmed',
  },
  {
    id: 'B2',
    dimension: 'wartbarkeit',
    schwere: 'NIEDRIG',
    fundstelle: 'src/export/csv.ts:7',
    zusammenfassung: 'Das Trennzeichen steht als Literal an zwei Stellen.',
    beleg: 'Zeilen 7 und 31.',
    korrekturrichtung: 'Eine Konstante TRENNZEICHEN.',
    evidenz: 'likely',
  },
]

/**
 * Attrappe für fuehreAufgabeDurch: der Review urteilt BEREIT mit einem HOCH- und einem NIEDRIG-Befund; jede andere Rolle
 * meldet „Fertig.“. Jede Rolle bekommt eine echte Laufakte mit Rohstrom (claude-code-Format).
 * @param laufId - Lauf
 * @param _profil - Profilreferenz (ungenutzt)
 * @param eingaben - Eingaben des Laufs
 * @returns Laufergebnis
 */
async function attrappe(laufId, _profil, eingaben) {
  const rohstromPfad = join(wurzel, `rohstrom-${laufId}.json`)
  const ergebnis =
    eingaben.rolle === 'code-reviewer'
      ? JSON.stringify({ urteil: 'BEREIT', befunde: BEFUNDE, empfehlung: 'Abnehmen ist vertretbar; B1 vor dem nächsten Export beheben.', ak_urteile: [] })
      : 'Fertig.'
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

const titel = 'CSV-Export, Review bereit mit schwerem Befund'
const { auftragId } = await (await fetch(`${basis}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel, auftragstext: 'Füge einen CSV-Export hinzu.' }) })).json()
const workflowId = `wf-b2b2a-bereit-hoch-${Date.now()}`
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
    schritte: [schritt('schritt-1-ausfuehrung', 'ausfuehrung', 'schreibend', null, 'schritt-2-review', 'ZWINGEND'), schritt('schritt-2-review', 'code-reviewer', 'lesend', 'ergebnis-code-reviewer', null, 'AUTOMATISCH')],
  },
  profilReferenz,
  { basisVerzeichnis, schreiber: () => {} }
)
const start = await fetch(`${basis}/api/workflows/${workflowId}/starten`, { method: 'POST' })
console.log(`starten ${start.status} ${start.status >= 400 ? await start.text() : ''}`)
const ende = Date.now() + 30000
let status
while (Date.now() < ende) {
  status = (await (await fetch(`${basis}/api/workflows/${workflowId}`)).json())?.daten?.status
  if (status !== undefined && status !== 'LAEUFT' && status !== 'OFFEN') break
  await new Promise((r) => setTimeout(r, 200))
}
console.log(`Status ${status}`)
console.log(`Testinstanz B2b-2a offen: ${basis} — ${workflowId} (beenden mit Strg+C)`)
