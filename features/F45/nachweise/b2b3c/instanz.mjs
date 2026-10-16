#!/usr/bin/env node
/**
 * Datei: features/F45/nachweise/b2b3c/instanz.mjs
 *
 * Zweck: Leitstand-Testinstanz für den Render-Nachweis F45 B2b-3c „Budget je Arbeitspaket“ (render/erzeuge-nachweis.mjs,
 * Muster features/F45/nachweise/b2b1/instanz.mjs). Wegwerf-Ablage, Projekt = Wegwerf-Repo mit CLAUDE.md dieses Repos,
 * Startvorlage der Workforce ohne Prüfbefehl, Arbeitspaket-Budget 2 000 000 Tokens je Ablauf. Drei echte Abläufe über den
 * HTTP-Pfad, die Attrappe (kein CLI, kein Netz) registriert Laufakten mit `verbrauch`:
 * - A „halt“: der Bau verbraucht 2 412 345 Tokens ⇒ Budget-Halt vor dem Review (Notiz mit „Budget erhöhen“);
 * - B „abnahme“: Bau 1 200 000 + Review 950 000 ⇒ Überschreitung erst im letzten Schritt, Abnahme mit Verbrauch über Budget;
 * - C „korrektur“: Review BLOCKIERT ⇒ Korrekturrunde, Budget-Halt am Neubau; nach „Budget erhöhen“ die Freigabe des Neubaus.
 *
 * Wird aufgerufen von: Hand — `node features/F45/nachweise/b2b3c/instanz.mjs`; gibt die drei workflowIds aus und bleibt
 * offen, bis der Prozess beendet wird. Nicht Teil von `npm run check`.
 */

import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { erzeugeRequestHandler } from '../../../../scripts/leitstand-server.mjs'
import { optionenAusAuftrag, registriereAuftrag } from '../../../../src/auftrag/index.ts'
import { fuehreGitSync } from '../../../../src/git-starter/index.ts'
import { ladeArtefaktVersion, registriereKernArtefakt } from '../../../../src/lineage-registry/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../../../../src/startvorlage/index.ts'
import { registriereWorkflow } from '../../../../src/workflow/index.ts'

const INSTALL = join(import.meta.dirname, '..', '..', '..', '..')
const PORT = Number(process.env.B2B3C_PORT ?? 4403)
const BUDGET = 2_000_000
const wurzel = mkdtempSync(join(tmpdir(), 'f45-b2b3c-render-'))
const basisVerzeichnis = join(wurzel, 'kontrollzustand')
const ladeOptionen = { basisVerzeichnis, schreiber: () => {} }
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
writeFileSync(startvorlagePfad, JSON.stringify({ ...vorlage, worker: { ...(vorlage.worker ?? {}), codex: { startziel: [String.raw`C:\b2b3c-render\codex.exe`], versionDeklariert: 'codex-cli-render', sandbox: 'read-only' } } }))
const profilReferenz = leiteProfilReferenzAb(ladeStartvorlage(startvorlagePfad))

const BEFUND = { id: 'B1', dimension: 'bugs', schwere: 'HOCH', fundstelle: 'src/export.ts:12', zusammenfassung: 'Trennzeichen in Feldern wird nicht maskiert.', beleg: 'Ein Komma im Titel verschiebt die Spalten.', korrekturrichtung: 'Felder mit Anführungszeichen umschließen.', evidenz: 'confirmed' }
/** Je Ablauf (aktueller Lauf) Token-Mengen und Review-Urteile in Reihenfolge. */
const plan = { tokens: { ausfuehrung: [], 'code-reviewer': [] }, reviews: [] }

/**
 * Attrappe für fuehreAufgabeDurch: registriert je Lauf eine Laufakte mit `verbrauch` aus dem Plan; der Review urteilt nach
 * dem Plan (Standard BEREIT ohne Befunde).
 * @param laufId - Lauf
 * @param _profil - Profilreferenz (ungenutzt)
 * @param eingaben - Eingaben des Laufs
 * @returns Laufergebnis
 */
async function attrappe(laufId, _profil, eingaben) {
  const rolle = eingaben.rolle
  const tokens = plan.tokens[rolle]?.shift() ?? 100_000
  const urteil = rolle === 'code-reviewer' ? (plan.reviews.shift() ?? 'BEREIT') : null
  const ergebnis =
    rolle === 'code-reviewer'
      ? JSON.stringify(urteil === 'BEREIT' ? { urteil, befunde: [], empfehlung: 'Keine belastbaren Findings im geprüften Scope.', ak_urteile: [] } : { urteil, befunde: [BEFUND], empfehlung: 'Zurück an den Bau.', ak_urteile: [] })
      : 'Fertig.'
  const rohstromPfad = join(wurzel, `rohstrom-${laufId}.json`)
  writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: ergebnis }) }))
  const verbrauch = { input_tokens: Math.round(tokens * 0.1), output_tokens: Math.round(tokens * 0.05), cache_read_tokens: tokens - Math.round(tokens * 0.1) - Math.round(tokens * 0.05), cache_write_tokens: 0, dauer_ms: 1, dauer_api_ms: null, turns: null, quelle: 'claude-code' }
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

/**
 * Legt Auftrag (mit Budget) und Ablauf Ausführung → Review an, startet ihn und wartet, bis er steht.
 * @param kennung - Teil der workflowId
 * @param titel - Titel des Auftrags
 * @param tokens - { ausfuehrung, review } je Lauf
 * @param reviews - Urteile der Reviews in Reihenfolge
 * @returns workflowId
 */
async function legeAblaufAn(kennung, titel, tokens, reviews) {
  plan.tokens = { ausfuehrung: [...tokens.ausfuehrung], 'code-reviewer': [...tokens.review] }
  plan.reviews = [...reviews]
  const { auftragId } = await (await fetch(`${basis}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel, auftragstext: 'Füge einen CSV-Export der Buchungen hinzu.' }) })).json()
  const auftrag = ladeArtefaktVersion(`auftrag-${auftragId}`, undefined, ladeOptionen).daten
  registriereAuftrag(auftragId, profilReferenz, auftrag.titel, auftrag.auftragstext, { ...optionenAusAuftrag(auftrag), budget_tokens: BUDGET, ...ladeOptionen })
  const workflowId = `wf-b2b3c-${kennung}-${Date.now()}`
  registriereWorkflow(
    {
      workflow_schema: 'v0',
      workflow_id: workflowId,
      auftrag_id: auftragId,
      version: 1,
      ziel: `${titel}.`,
      status: 'OFFEN',
      aktiver_schritt_id: 'schritt-1-ausfuehrung',
      grenzen: { max_schritte: 8, max_replans: 1 },
      schritte: [schritt('schritt-1-ausfuehrung', 'ausfuehrung', 'schreibend', null, 'schritt-2-review', 'ZWINGEND'), schritt('schritt-2-review', 'code-reviewer', 'lesend', 'ergebnis-code-reviewer', null, 'AUTOMATISCH')],
    },
    profilReferenz,
    ladeOptionen
  )
  const start = await fetch(`${basis}/api/workflows/${workflowId}/starten`, { method: 'POST' })
  if (start.status >= 400) console.log(`starten ${kennung} ${start.status} ${await start.text()}`)
  const ende = Date.now() + 30000
  while (Date.now() < ende) {
    const daten = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, ladeOptionen)?.daten
    if (daten !== undefined && daten.status !== 'LAEUFT' && daten.status !== 'OFFEN' && !daten.schritte.some((s) => s.status === 'LAEUFT')) break
    await new Promise((r) => setTimeout(r, 200))
  }
  // Die Korrekturrunde (C) schreibt nach dem Halt des Reviews eine weitere Version — kurz nachwarten.
  await new Promise((r) => setTimeout(r, 500))
  return workflowId
}

const idA = await legeAblaufAn('halt', 'CSV-Export, Bau über Budget', { ausfuehrung: [2_412_345], review: [] }, [])
const idB = await legeAblaufAn('abnahme', 'CSV-Export, Review über Budget', { ausfuehrung: [1_200_000], review: [950_000] }, ['BEREIT'])
const idC = await legeAblaufAn('korrektur', 'CSV-Export, Korrekturrunde über Budget', { ausfuehrung: [1_300_000, 400_000], review: [800_000, 300_000] }, ['BLOCKIERT', 'BEREIT'])
console.log(`Testinstanz B2b-3c offen: ${basis} — ${idA} ${idB} ${idC} (beenden mit Strg+C)`)
