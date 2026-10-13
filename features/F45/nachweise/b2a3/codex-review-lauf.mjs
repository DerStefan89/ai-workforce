#!/usr/bin/env node
/**
 * Datei: features/F45/nachweise/b2a3/codex-review-lauf.mjs
 *
 * Zweck: F45 B2a-3a, Merge-Bedingung (Challenger 13.10.2026, Hintergrund F-638) — echter Codex-Review-Lauf mit dem
 * Ausgabeschema ergebnis-code-reviewer v2 über den Weg der Oberfläche (POST /api/auftraege → Workflow mit genau einem
 * Schritt code-reviewer, Worker codex, output_schema 'ergebnis-code-reviewer', Freigabe AUTOMATISCH → POST
 * /api/workflows/<id>/starten). Damit läuft baueCodexAufruf mit dem neuen Schema (--output-schema) und der Policy im Auftrag.
 * Geprüft wird ein kleiner, echter Ausschnitt dieses Repos (src/review-policy/index.ts aus Commit f912773). Eigene
 * Leitstand-Instanz auf LEITSTAND_PORT (Standard 4199), Wegwerf-Kontrollzustand und Rohstrom in %TEMP%; die Instanz wird am
 * Ende beendet. Ergebnis: codex-review-lauf.json (Laufakten-Auszug, Verbrauch, Dauer, Ergebnis = letzte agent_message,
 * Prüfung gegen den Ausgabevertrag) — kein Rohstrom im Repo.
 *
 * Wird aufgerufen von: Hand (`LEITSTAND_PORT=4199 node features/F45/nachweise/b2a3/codex-review-lauf.mjs`), nicht von
 * `npm run check`. Kostet einen Codex-Lauf (Modell der Vorlage standard.json).
 *
 * Wichtig: schreibt nichts in den Kontrollzustand der Workforce und nichts in ~/.ai-workforce; der Schritt ist lesend.
 */

import { randomUUID } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { leseCodexEreignisse } from '../../../../src/codex-gateway/index.ts'
import { ladeArtefaktVersion } from '../../../../src/lineage-registry/index.ts'
import { pruefeReviewErgebnisFuer } from '../../../../src/review-policy/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../../../../src/startvorlage/index.ts'
import { registriereWorkflow } from '../../../../src/workflow/index.ts'
import { erzeugeRequestHandler } from '../../../../scripts/leitstand-server.mjs'

const HIER = import.meta.dirname
const INSTALL = join(HIER, '..', '..', '..', '..')
const STARTVORLAGE = join(INSTALL, 'startvorlagen', 'ai-workforce.json')
const PORT = Number(process.env.LEITSTAND_PORT ?? 4199)
const AUFTRAG = {
  titel: 'Nachweis B2a-3a: Review von src/review-policy/index.ts',
  auftragstext:
    'Technisches Review einer kleinen, bereits gebauten Änderung: src/review-policy/index.ts (Commit f912773, Funktionen baueReviewPolicyBlock, pruefeReviewErgebnis, pruefeReviewErgebnisFuer) samt src/review-policy/review-policy.test.ts. Prüfe nur diese beiden Dateien und ihre direkten Aufrufer, wenn nötig.',
}

const wurzel = mkdtempSync(join(tmpdir(), 'f45-b2a3-codex-review-'))
const basisVerzeichnis = join(wurzel, 'kontrollzustand')
const ladeOptionen = { basisVerzeichnis, schreiber: () => {} }
console.log(`Wegwerf-Wurzel: ${wurzel}`)

// Review-Schritt wie in workflow-vorlagen/standard.json (Rolle, Werkzeugsatz, Worker, Modell, Schema, Zeitgrenze), ohne
// Eingaben aus einem Ausführungsschritt (es gibt keinen) — er prüft den genannten Bestand.
const vorlage = JSON.parse(readFileSync(join(INSTALL, 'workflow-vorlagen', 'standard.json'), 'utf8'))
const reviewVorlage = vorlage.schritte.find((s) => s.rolle === 'code-reviewer')

const server = createServer(
  erzeugeRequestHandler({
    basisVerzeichnis,
    repoWurzel: INSTALL,
    cwd: INSTALL,
    installWurzel: INSTALL,
    startvorlagePfad: STARTVORLAGE,
    projektId: 'ai-workforce',
    istWorkforceInstanz: true,
    rohBasisVerzeichnis: join(wurzel, 'roh'),
    laufausgabeWurzel: join(wurzel, 'laufausgabe'),
    capWurzel: join(wurzel, 'cap'),
  })
)
await new Promise((r) => server.listen(PORT, '127.0.0.1', r))
const basis = `http://127.0.0.1:${PORT}`
const beginn = Date.now()
try {
  const auftragAntwort = await fetch(`${basis}/api/auftraege`, { method: 'POST', body: JSON.stringify(AUFTRAG) })
  const { auftragId } = await auftragAntwort.json()
  const workflowId = `wf-b2a3-codex-review-${randomUUID()}`
  const schritt = { ...reviewVorlage, schritt_id: 'schritt-1-review', eingaben: [], nachfolger: null, status: 'OFFEN', lauf_id: null }
  const profilReferenz = leiteProfilReferenzAb(ladeStartvorlage(STARTVORLAGE))
  registriereWorkflow(
    { workflow_schema: 'v0', workflow_id: workflowId, auftrag_id: auftragId, version: 1, ziel: 'Review von src/review-policy/index.ts (Nachweis B2a-3a).', status: 'OFFEN', aktiver_schritt_id: 'schritt-1-review', grenzen: { max_schritte: 2, max_replans: 0 }, schritte: [schritt] },
    profilReferenz,
    ladeOptionen
  )
  const start = await fetch(`${basis}/api/workflows/${workflowId}/starten`, { method: 'POST' })
  console.log(`starten: ${start.status} ${await start.text()}`)
  let daten = null
  while (Date.now() - beginn < 900_000) {
    daten = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, ladeOptionen)?.daten ?? null
    if (daten !== null && daten.schritte[0].status !== 'LAEUFT' && daten.schritte[0].status !== 'OFFEN') break
    await new Promise((r) => setTimeout(r, 5000))
  }
  const schritt1 = daten?.schritte?.[0] ?? null
  const laufId = schritt1?.lauf_id ?? null
  const laufakte = laufId === null ? null : (ladeArtefaktVersion(`laufakte-${laufId}`, undefined, ladeOptionen)?.daten ?? null)
  let ergebnis = null
  let ereignisse = null
  let argvSchema = null
  let stderrAuszug = null
  try {
    const roh = JSON.parse(readFileSync(laufakte.rohstrom_referenz.pfad, 'utf8'))
    const gelesen = leseCodexEreignisse(String(roh.stdout ?? ''))
    ereignisse = { turnCompleted: gelesen.turnCompleted, turnFailed: gelesen.turnFailed }
    ergebnis = gelesen.letzteAgentMessage === null ? null : JSON.parse(gelesen.letzteAgentMessage)
    const tokens = Array.isArray(roh.tokens) ? roh.tokens : []
    const i = tokens.indexOf('--output-schema')
    argvSchema = i >= 0 ? String(tokens[i + 1]).replace(/^.*[\\/]schemas[\\/]/, 'schemas/') : null
    stderrAuszug = String(roh.stderr ?? '')
      .split('\n')
      .filter((z) => /schema|invalid|error/i.test(z))
      .slice(0, 10)
  } catch (fehler) {
    console.error('Rohstrom nicht lesbar:', fehler)
  }
  const abnahme = await (await fetch(`${basis}/api/workflows/${workflowId}/abnahme`)).json()
  const befunde = Array.isArray(ergebnis?.befunde) ? ergebnis.befunde : []
  const lauf = {
    zeit: new Date().toISOString(),
    workflow_status: daten?.status ?? null,
    workflow_grund: daten?.grund ?? null,
    schritt_status: schritt1?.status ?? null,
    lauf_id: laufId,
    dauer_s: Math.round((Date.now() - beginn) / 1000),
    worker: laufakte?.worker ?? null,
    modell_deklariert: laufakte?.modell_deklariert ?? null,
    verbrauch: laufakte?.verbrauch ?? null,
    review: laufakte?.review ?? null,
    projektkarte: laufakte?.projektkarte ?? null,
    output_schema_im_argv: argvSchema,
    codex_ereignisse: ereignisse,
    stderr_schema_zeilen: stderrAuszug,
    befunde_mit_allen_v2_feldern: befunde.every((b) => ['id', 'dimension', 'evidenz', 'korrekturrichtung'].every((f) => f in b)),
    vertragspruefung: ergebnis === null ? null : pruefeReviewErgebnisFuer(laufakte?.review?.policy_version, ergebnis),
    abnahme_urteil: abnahme?.urteil ?? null,
    ergebnis,
  }
  writeFileSync(join(HIER, 'codex-review-lauf.json'), `${JSON.stringify(lauf, null, 2)}\n`)
  console.log(`Schritt: ${lauf.schritt_status}, Workflow ${lauf.workflow_status}, ${lauf.dauer_s} s, Befunde ${befunde.length}, review ${JSON.stringify(lauf.review)}`)
} finally {
  server.close()
  console.log(`Leitstand-Instanz auf Port ${PORT} beendet. Wegwerf-Wurzel (Rohstrom, Kontrollzustand): ${wurzel}`)
}
process.exit(0)
