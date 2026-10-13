#!/usr/bin/env node
/**
 * Datei: features/F45/nachweise/b2a1/architekt-lauf.mjs
 *
 * Zweck: F45 B2a-1 — echter Architekt-Lauf (Codex, Modus feature) mit Projektkarte gegen dieses Repo, über den Weg der
 * Oberfläche (POST /api/auftraege → Workflow aus workflow-vorlagen/hoch.json → POST /api/workflows/<id>/starten). Nur
 * Schritt 1 (architekt) läuft: Schritt 2 (architecture-advisor) steht auf Freigabe ZWINGEND ohne Erteilung, der Workflow
 * hält danach. Eigene Leitstand-Instanz auf LEITSTAND_PORT (Standard 4199), Wegwerf-Kontrollzustand und Rohstrom in
 * %TEMP%; die Instanz wird am Ende beendet. Ergebnis: karte.md (Kartentext aus dem Auftrag), lauf.json (Projektkarte der
 * Laufakte, Verbrauch, Dauer, Entwurf des Architekten = letzte agent_message) — kein Rohstrom.
 *
 * Wird aufgerufen von: Hand (`LEITSTAND_PORT=4199 node features/F45/nachweise/b2a1/architekt-lauf.mjs`), nicht von
 * `npm run check`. Kostet einen Codex-Lauf (Modell der Vorlage hoch.json).
 *
 * Wichtig: schreibt nichts in den Kontrollzustand der Workforce, nichts in ~/.ai-workforce; kein Arbeitsordner (Option
 * arbeitsordner aus — der Lauf ist lesend, die Karte nennt dann den Projektordner als Schreibort).
 */

import { randomUUID } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { leseCodexEreignisse } from '../../../../src/codex-gateway/index.ts'
import { ladeArtefaktVersion } from '../../../../src/lineage-registry/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../../../../src/startvorlage/index.ts'
import { registriereWorkflow } from '../../../../src/workflow/index.ts'
import { erzeugeRequestHandler } from '../../../../scripts/leitstand-server.mjs'

const HIER = import.meta.dirname
const INSTALL = join(HIER, '..', '..', '..', '..')
const STARTVORLAGE = join(INSTALL, 'startvorlagen', 'ai-workforce.json')
const PORT = Number(process.env.LEITSTAND_PORT ?? 4199)
const AUFTRAG = {
  titel: 'Nachweis B2a-1: Gate für die Abschnittszahl der Projektkarte',
  auftragstext:
    'Plane eine kleine Erweiterung: ein neues Gate soll prüfen, dass die Projektkarte (src/projektkarte) für jede Rolle höchstens die im Zuschnitt erlaubte Zeichenzahl hat, und in die Prüfkette aufgenommen werden. Nur Architekturentwurf, kein Code.',
}

const wurzel = mkdtempSync(join(tmpdir(), 'f45-b2a1-nachweis-'))
const basisVerzeichnis = join(wurzel, 'kontrollzustand')
const ladeOptionen = { basisVerzeichnis, schreiber: () => {} }
console.log(`Wegwerf-Wurzel: ${wurzel}`)

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
  const workflowId = `wf-b2a1-nachweis-${randomUUID()}`
  const vorlageText = readFileSync(join(INSTALL, 'workflow-vorlagen', 'hoch.json'), 'utf8')
    .replaceAll('__WORKFLOW_ID__', workflowId)
    .replaceAll('__AUFTRAG_ID__', auftragId)
    .replaceAll('__ZIEL__', 'Architekturentwurf für ein Gate zur Kartengröße (Nachweis B2a-1).')
  const workflow = JSON.parse(vorlageText)
  // Freigabe von Schritt 1 erteilt (sonst wartet der Workflow auf den Menschen); Schritt 2 bleibt offen → Halt danach.
  workflow.schritte[0].freigabe_erteilt = true
  const profilReferenz = leiteProfilReferenzAb(ladeStartvorlage(STARTVORLAGE))
  registriereWorkflow(workflow, profilReferenz, ladeOptionen)
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
  // Kartentext aus dem Prompt im Rohstrom (Codex: letztes Argv-Element = Prompt) — nur die Karte wird abgelegt; der Entwurf
  // ist die letzte agent_message (derselbe Parser wie das Gateway).
  let karte = null
  let ergebnis = null
  try {
    const roh = JSON.parse(readFileSync(laufakte.rohstrom_referenz.pfad, 'utf8'))
    const text = leseCodexEreignisse(String(roh.stdout ?? '')).letzteAgentMessage
    ergebnis = text === null ? null : JSON.parse(text)
    const prompt = String(roh.tokens?.[roh.tokens.length - 1] ?? '')
    const ab = prompt.indexOf('# Projektkarte\n')
    karte = ab === -1 ? null : prompt.slice(ab)
  } catch (fehler) {
    console.error('Rohstrom nicht lesbar:', fehler)
  }
  if (karte !== null) writeFileSync(join(HIER, 'karte.md'), `${karte}\n`)
  const lauf = {
    zeit: new Date().toISOString(),
    workflow_status: daten?.status ?? null,
    workflow_grund: daten?.grund ?? null,
    schritt1_status: schritt1?.status ?? null,
    lauf_id: laufId,
    dauer_s: Math.round((Date.now() - beginn) / 1000),
    worker: laufakte?.worker ?? null,
    modell_deklariert: laufakte?.modell_deklariert ?? null,
    verbrauch: laufakte?.verbrauch ?? null,
    projektkarte: laufakte?.projektkarte ?? null,
    karte_zeichen: karte?.length ?? null,
    ergebnis,
  }
  writeFileSync(join(HIER, 'lauf.json'), `${JSON.stringify(lauf, null, 2)}\n`)
  console.log(`Schritt 1: ${lauf.schritt1_status}, Workflow ${lauf.workflow_status}, ${lauf.dauer_s} s, Karte ${lauf.projektkarte?.hash ?? '—'}`)
} finally {
  server.close()
  console.log(`Leitstand-Instanz auf Port ${PORT} beendet. Wegwerf-Wurzel (Rohstrom, Kontrollzustand): ${wurzel}`)
}
process.exit(0)
