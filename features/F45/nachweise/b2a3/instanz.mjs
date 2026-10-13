#!/usr/bin/env node
/**
 * Datei: features/F45/nachweise/b2a3/instanz.mjs
 *
 * Zweck: Leitstand-Testinstanz für den Render-Nachweis F45 B2a-3a (render/erzeuge-nachweis.mjs). Installation und Projekt =
 * ein Wegwerf-Repo mit CLAUDE.md und Checkliste dieses Repos, Ablage in einem Wegwerf-Ordner, Startvorlage ohne Prüfbefehl (sonst liefe nach der Ausführung real
 * `npm run check`). Beim Start laufen drei echte Abläufe Ausführung → Review (Codex) über den HTTP-Pfad; Ausführung und
 * Review spielt eine Attrappe (kein CLI, kein Netz), die eingaben.review und eingaben.projektkarte in die Laufakte spiegelt
 * wie die Gateways:
 * - befunde: BEREIT mit drei Befunden v2 (KRITISCH, HOCH ohne Korrekturrichtung, NIEDRIG) → ABGESCHLOSSEN, Abnahme
 *   entscheidbar mit „Review-Vertrag unvollständig“ und ggf. Kontextlücken;
 * - vertrag: BEREIT ohne Befunde und ohne den Pflichtsatz → Regel 1k hält (KLAERUNG_ERFORDERLICH, Lage 'vorab');
 * - ausfall: Review-Lauf FEHLGESCHLAGEN (Werkzeugausfall) → KLAERUNG_ERFORDERLICH, „fehlgeschlagen“ mit Grund.
 *
 * Wird aufgerufen von: Hand — `node features/F45/nachweise/b2a3/instanz.mjs`; gibt die drei workflowIds aus und bleibt
 * offen, bis der Prozess beendet wird. Nicht Teil von `npm run check`.
 */

import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fuehreGitSync } from '../../../../src/git-starter/index.ts'
import { registriereKernArtefakt } from '../../../../src/lineage-registry/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../../../../src/startvorlage/index.ts'
import { registriereWorkflow } from '../../../../src/workflow/index.ts'
import { erzeugeRequestHandler } from '../../../../scripts/leitstand-server.mjs'

const INSTALL = join(import.meta.dirname, '..', '..', '..', '..')
const PORT = Number(process.env.B2A3_PORT ?? 4397)
const wurzel = mkdtempSync(join(tmpdir(), 'f45-b2a3-render-'))
const basisVerzeichnis = join(wurzel, 'kontrollzustand')
// Projekt = sauberes Wegwerf-Repo mit den Prüfmaßstäben dieses Repos (ein schreibender Schritt verlangt einen sauberen
// Arbeitsbaum); ARCHITECTURE.md fehlt bewusst → Lücke in der Projektkarte des Reviews („Kontext unvollständig“).
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
writeFileSync(startvorlagePfad, JSON.stringify({ ...vorlage, worker: { ...(vorlage.worker ?? {}), codex: { startziel: [String.raw`C:\b2a3-render\codex.exe`], versionDeklariert: 'codex-cli-render', sandbox: 'read-only' } } }))
const profilReferenz = leiteProfilReferenzAb(ladeStartvorlage(startvorlagePfad))

const REVIEWS = {
  befunde: {
    urteil: 'BEREIT_NACH_KORREKTUR',
    befunde: [
      { id: 'B1', dimension: 'sicherheit', schwere: 'KRITISCH', fundstelle: 'scripts/leitstand-server.mjs:7612', zusammenfassung: 'Ein Pfad aus der Anfrage wird ungeprüft an das Dateisystem gegeben (sehr langer Text, damit der Umbruch im schmalen Fenster sichtbar wird).', beleg: 'GET mit ../ im Segment liest außerhalb des Ordners.', korrekturrichtung: 'Segment gegen LAUFID_UNZULAESSIGE_ZEICHEN prüfen, wie in den Nachbarrouten.', evidenz: 'confirmed' },
      { id: 'B2', dimension: 'bugs', schwere: 'HOCH', fundstelle: 'src/review-policy/index.ts:90', zusammenfassung: 'Leere Empfehlung wird nicht erkannt.', beleg: 'Statische Begründung.', korrekturrichtung: null, evidenz: 'likely' },
      { id: 'B3', dimension: 'wartbarkeit', schwere: 'NIEDRIG', fundstelle: 'public/leitstand/views/workflow-abnahme.js:180', zusammenfassung: 'Zwei ähnliche Listen.', beleg: 'Vergleich der Funktionen.', korrekturrichtung: 'Eine Hilfsfunktion.', evidenz: 'needs-validation' },
    ],
    empfehlung: 'Checkliste: 9 von 10 erfüllt, 1 nicht anwendbar (Harness-Abgleich). B1 vor der Abnahme beheben.',
    ak_urteile: [],
  },
  vertrag: { urteil: 'BEREIT', befunde: [], empfehlung: 'Checkliste: alles erfüllt. Fehlerfrei.', ak_urteile: [] },
}

/**
 * Attrappe für fuehreAufgabeDurch: die Art des Review-Ergebnisses steht im Auftragstext ([befunde]/[vertrag]/[ausfall]).
 * @param laufId - Lauf
 * @param _profil - Profilreferenz (ungenutzt)
 * @param eingaben - Eingaben des Laufs
 * @returns Laufergebnis
 */
async function attrappe(laufId, _profil, eingaben) {
  const art = /\[(befunde|vertrag|ausfall)\]/.exec(eingaben.auftragstext ?? '')?.[1] ?? 'befunde'
  if (eingaben.rolle === 'code-reviewer' && art === 'ausfall') {
    mkdirSync(join(basisVerzeichnis, laufId), { recursive: true })
    return { ok: false, grund: 'Render-Attrappe: Werkzeugausfall' }
  }
  const rohstromPfad = join(wurzel, `rohstrom-${laufId}.json`)
  const ergebnis = eingaben.rolle === 'code-reviewer' ? JSON.stringify(REVIEWS[art]) : 'Fertig.'
  writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: ergebnis }) }))
  const daten = {
    worker: 'claude-code',
    rohstrom_referenz: { pfad: rohstromPfad, inhalts_hash: 'x' },
    ...(eingaben.projektkarte !== undefined ? { projektkarte: eingaben.projektkarte } : {}),
    ...(eingaben.review !== undefined ? { review: eingaben.review } : {}),
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
  ['befunde', 'CSV-Export mit Review-Befunden'],
  ['vertrag', 'CSV-Export, Review ohne Pflichtsatz'],
  ['ausfall', 'CSV-Export, Review fällt aus'],
]) {
  const { auftragId } = await (await fetch(`${basis}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel, auftragstext: `Füge einen CSV-Export hinzu. [${art}]` }) })).json()
  const workflowId = `wf-b2a3-${art}-${Date.now()}`
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
  console.log(`${art}: starten ${start.status} ${start.status >= 400 ? await start.text() : ""}`)
  ids[art] = workflowId
  // nacheinander: ein Lauf zur Zeit (D13)
  const ende = Date.now() + 30000
  while (Date.now() < ende) {
    const status = (await (await fetch(`${basis}/api/workflows/${workflowId}`)).json())?.status
    if (status !== undefined && status !== 'LAEUFT' && status !== 'OFFEN') break
    await new Promise((r) => setTimeout(r, 200))
  }
}
console.log(`Testinstanz B2a-3a offen: ${basis} — ${JSON.stringify(ids)} (Wurzel ${wurzel}, beenden mit Strg+C)`)
