#!/usr/bin/env node
/**
 * Datei: scripts/check-f36-ws2-laufzeit.mjs
 *
 * Zweck: Gate für F36 WS-2 „Laufzeit“ (features/F36/feature.md, AK4/AK5 Token-Teil). Belegt an
 * den unveränderten Aufrufbauern (loeseAusfuehrungsEingabenAuf → baueAufruf), dass
 * (a) ein 'ausfuehrung'-Lauf mit Werkzeugsatz-Art 'schreibend' OHNE mcpEintraege bitgenau dieselben
 *     Tokens trägt wie aus der Startvorlage — insbesondere KEIN 'Skill'/'Agent' in --tools oder
 *     --allowedTools (Spike WS-2s S6: --allowedTools begrenzt Skill/Agent nicht, AK4 bleibt im
 *     Wortlaut); die Startvorlage wird nicht verändert;
 * (b) jede andere Rolle/Art — auch 'ausfuehrung' mit 'lesend' — bitgenau dieselben Tokens trägt
 *     wie ein Aufruf direkt aus dem Werkzeugsatz der Startvorlage, auch mit übergebenen
 *     mcpEintraege (Rolle je einzeln geprüft);
 * (c) optionen.mcpEintraege nur für 'ausfuehrung'/'schreibend' wirkt: ein lokaler MCP erscheint in
 *     --mcp-config und mit seinen Einzelnamen in --allowedTools; ein extern_lesend-Eintrag lehnt
 *     den Start ab (E-F36-4);
 * (d) realer Aufrufpfad (POST /api/workflows/<id>/starten bzw. POST /api/laeufe, Attrappen-Starter
 *     statt Prozess): ein 'ausfuehrung'-Lauf mit 'schreibend' trägt weder Skill/Agent in den
 *     Tokens noch einen Subagenten-Satz im Auftragstext.
 *
 * Wird aufgerufen von: `npm run check`.
 *
 * Aufruf: node scripts/check-f36-ws2-laufzeit.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { baueAufruf } from '../src/claude-code-gateway/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb, loeseWerkzeugsatzAuf } from '../src/startvorlage/index.ts'
import { ladeArtefaktVersion } from '../src/lineage-registry/index.ts'
import { registriereWorkflow } from '../src/workflow/index.ts'
import { erzeugeRequestHandler, loeseAusfuehrungsEingabenAuf } from './leitstand-server.mjs'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []
console.log('\n=== F36-WS-2-Laufzeit-Check ===\n')

const STILL = () => {}
const INSTALL_WURZEL = process.cwd()
const STARTVORLAGE_PFAD = 'startvorlagen/ai-workforce.json'
const vorlage = ladeStartvorlage(STARTVORLAGE_PFAD)
const VORBEDINGUNG_OK = { leseAusfuehrungsVorbedingung: () => ({ ok: true }) }

/** Minimaler eingabenRoh-Teil (Muster check-f17-rollenvertrag). */
function eingabenRoh(rolle, worker = 'claude-code') {
  return {
    rolle,
    worker,
    anfragen: [],
    budget: { maxTurns: 5, zeitgrenzeMs: 60000, maxKostenUsd: 1 },
    aufrufEingaben: { modell: 'claude-sonnet-5', prompt: 'GATE' },
    auftragId: 'gate-auftrag',
  }
}

/** Tokens eines Laufs mit genau dem Werkzeugsatz der Startvorlage — der Vergleichswert „bitgenau wie heute“. */
function basisTokens(werkzeugsatzName, aufrufEingaben = {}) {
  const w = loeseWerkzeugsatzAuf(vorlage, werkzeugsatzName)
  return baueAufruf({ modell: 'claude-sonnet-5', prompt: 'GATE', ...aufrufEingaben, werkzeugsatz: { modus: w.modus, erlaubte_werkzeuge: w.erlaubte_werkzeuge } })
}

/** Wert hinter einem Flag in den Tokens. */
function flagWert(tokens, flag) {
  const i = tokens.indexOf(flag)
  // Leerstring statt undefined: ein fehlendes Flag wird so zum lesbaren Befund statt zum .split-Wurf.
  return i === -1 ? '' : tokens[i + 1]
}

/** Lokaler MCP-Katalogeintrag (bereits aufgelöst) für (c). */
function lokalerMcp(ueberschreibung = {}) {
  return {
    id: 'playwright',
    typ: 'extern',
    unterart: 'mcp',
    wirkung: 'lokal',
    capabilities: ['BROWSER_TEST'],
    freigabe: 'FREIGEGEBEN',
    herkunft: { art: 'extern', url: 'https://github.com/microsoft/playwright-mcp' },
    installation: { version: '0.0.41', mcp_server: { command: 'npx', args: ['-y', '@playwright/mcp@0.0.41'] }, werkzeuge: ['mcp__playwright__browser_navigate'] },
    ...ueberschreibung,
  }
}

// ─── (a) ausfuehrung/schreibend ohne mcpEintraege: bitgenau wie die Startvorlage, kein Skill/Agent ──
{
  const vor = befunde.length
  const vorlageVorher = JSON.stringify(vorlage.werkzeugsaetze)
  const ergebnis = loeseAusfuehrungsEingabenAufAusServer(eingabenRoh('ausfuehrung'), 'schreibend', VORBEDINGUNG_OK)
  if (!ergebnis.ok) {
    befunde.push(`(a) ausfuehrung/schreibend: erwartet ok:true, erhalten ${JSON.stringify(ergebnis)}`)
  } else {
    const tokens = baueAufruf(ergebnis.eingaben.aufrufEingaben)
    const ist = JSON.stringify(tokens)
    const soll = JSON.stringify(basisTokens('schreibend'))
    if (ist !== soll) befunde.push(`(a) ausfuehrung/schreibend: Tokens weichen von der Startvorlage ab\n    ist:  ${ist}\n    soll: ${soll}`)
    for (const name of ['Skill', 'Agent']) {
      for (const flag of ['--tools', '--allowedTools']) {
        if (flagWert(tokens, flag).split(',').some((w) => w.split('(')[0] === name)) befunde.push(`(a) '${name}' steht in ${flag} (AK4: ohne Freigabe fehlt es): ${flagWert(tokens, flag)}`)
      }
    }
    if ('mcpConfig' in ergebnis.eingaben.aufrufEingaben) befunde.push('(a) aufrufEingaben.mcpConfig gesetzt, obwohl keine mcpEintraege übergeben wurden')
  }
  if (JSON.stringify(vorlage.werkzeugsaetze) !== vorlageVorher) befunde.push('(a) Startvorlage wurde verändert (Mutation des Werkzeugsatzes)')
  if (befunde.length === vor) console.log("✓ (a) 'ausfuehrung' mit 'schreibend' ohne mcpEintraege: Tokens bitgenau wie aus der Startvorlage, kein Skill/Agent (AK4, Spike WS-2s S6).")
}

// ─── (b) jede andere Rolle/Art: Tokens bitgenau wie aus der Startvorlage ──
{
  const vor = befunde.length
  const faelle = [
    { rolle: 'ausfuehrung', werkzeugsatz: 'lesend' },
    { rolle: 'architekt', werkzeugsatz: 'lesend' },
    { rolle: 'code-reviewer', werkzeugsatz: 'lesend' },
    { rolle: 'qa', werkzeugsatz: 'lesend' },
    { rolle: 'architecture-advisor', werkzeugsatz: 'lesend' },
    { rolle: 'router', werkzeugsatz: 'lesend' },
    { rolle: 'jarvis', werkzeugsatz: 'lesend' },
    { rolle: 'product-coach', werkzeugsatz: 'lesend' },
    { rolle: 'scout', werkzeugsatz: 'recherchierend' },
  ]
  for (const fall of faelle) {
    const ergebnis = loeseAusfuehrungsEingabenAufAusServer(eingabenRoh(fall.rolle), fall.werkzeugsatz, { ...VORBEDINGUNG_OK, mcpEintraege: [lokalerMcp()] })
    if (!ergebnis.ok) {
      befunde.push(`(b) ${fall.rolle}/${fall.werkzeugsatz}: erwartet ok:true, erhalten ${JSON.stringify(ergebnis)}`)
      continue
    }
    const ist = JSON.stringify(baueAufruf(ergebnis.eingaben.aufrufEingaben))
    const soll = JSON.stringify(basisTokens(fall.werkzeugsatz))
    if (ist !== soll) befunde.push(`(b) ${fall.rolle}/${fall.werkzeugsatz}: Tokens weichen ab\n    ist:  ${ist}\n    soll: ${soll}`)
  }
  if (befunde.length === vor) console.log(`✓ (b) ${faelle.length} Rolle/Art-Paare außer ausfuehrung/schreibend: Tokens bitgenau wie aus der Startvorlage (mcpEintraege ignoriert).`)
}

// ─── (c) mcpEintraege nur für ausfuehrung; extern_lesend lehnt ab ──
{
  const vor = befunde.length
  const mitMcp = loeseAusfuehrungsEingabenAufAusServer(eingabenRoh('ausfuehrung'), 'schreibend', { ...VORBEDINGUNG_OK, mcpEintraege: [lokalerMcp()] })
  if (!mitMcp.ok) {
    befunde.push(`(c) ausfuehrung mit lokalem MCP: erwartet ok:true, erhalten ${JSON.stringify(mitMcp)}`)
  } else {
    const tokens = baueAufruf(mitMcp.eingaben.aufrufEingaben)
    const config = JSON.parse(flagWert(tokens, '--mcp-config'))
    if (config.mcpServers?.playwright?.command !== 'npx') befunde.push(`(c) --mcp-config trägt den Server 'playwright' nicht: ${flagWert(tokens, '--mcp-config')}`)
    // AK5: NUR die freigegebenen Einzelnamen — exakte mcp__-Menge, kein Wildcard-/Fremdname daneben.
    const mcpNamen = flagWert(tokens, '--allowedTools').split(',').filter((w) => w.startsWith('mcp__'))
    if (JSON.stringify(mcpNamen) !== JSON.stringify(['mcp__playwright__browser_navigate'])) befunde.push(`(c) mcp__-Einträge in --allowedTools sind nicht genau die freigegebenen Einzelnamen: ${JSON.stringify(mcpNamen)}`)
  }
  const gesperrt = loeseAusfuehrungsEingabenAufAusServer(eingabenRoh('ausfuehrung'), 'schreibend', { ...VORBEDINGUNG_OK, mcpEintraege: [lokalerMcp({ wirkung: 'extern_lesend' })] })
  if (gesperrt.ok !== false || !/E-F36-4/.test(gesperrt.grund)) befunde.push(`(c) extern_lesend: erwartet ok:false mit E-F36-4, erhalten ${JSON.stringify(gesperrt)}`)
  if (befunde.length === vor) console.log("✓ (c) Lokaler MCP erscheint nur bei 'ausfuehrung' in --mcp-config und mit Einzelnamen in --allowedTools; extern_lesend lehnt ab (E-F36-4).")
}

/**
 * Ruft die exportierte Server-Funktion mit der geladenen Startvorlage (ai-workforce.json).
 * @param roh - eingabenRoh (Muster check-f17-rollenvertrag)
 * @param werkzeugsatzName - Name des Werkzeugsatzes in der Startvorlage
 * @param optionen - an loeseAusfuehrungsEingabenAuf durchgereicht (Vorbedingung, mcpEintraege)
 * @returns Ergebnis von loeseAusfuehrungsEingabenAuf
 */
function loeseAusfuehrungsEingabenAufAusServer(roh, werkzeugsatzName, optionen) {
  return loeseAusfuehrungsEingabenAuf(roh, werkzeugsatzName, 'GATE', vorlage, INSTALL_WURZEL, optionen)
}

/**
 * Startet über den echten HTTP-Pfad genau einen 'ausfuehrung'-Lauf mit Attrappen-Starter (kein
 * Prozess) gegen ein Wegwerf-Repo und liefert die Eingaben, die der Starter sah. Alles Angelegte
 * wird im finally abgeräumt, auch wenn die Vorbereitung scheitert.
 * @param fall - Fallkennung für Befundtexte
 * @param art - 'workflow' (POST /api/workflows/<id>/starten) oder 'direkt' (POST /api/laeufe)
 * @param werkzeugsatz - Werkzeugsatz-Name des Laufs
 * @returns die vom Starter gesehenen AusfuehrungsEingaben oder null (Befund bereits gemeldet)
 */
async function starteAusfuehrung(fall, art, werkzeugsatz) {
  const basisVerzeichnis = `kontrollzustand-test-f36-ws2-${randomUUID()}`
  const aufraeumen = [basisVerzeichnis]
  let server = null
  let gesehen = null
  try {
    const repoWurzel = mkdtempSync(join(tmpdir(), 'f36-ws2-repo-'))
    aufraeumen.push(repoWurzel)
    const git = (argumente) => execFileSync('git', argumente, { cwd: repoWurzel, encoding: 'utf8' })
    git(['init', '--quiet', '-b', 'wegwerf-branch'])
    git(['config', 'user.email', 'gate@example.invalid'])
    git(['config', 'user.name', 'Gate'])
    git(['config', 'core.autocrlf', 'false'])
    writeFileSync(join(repoWurzel, 'package.json'), `${JSON.stringify({ name: 'fremd', scripts: { check: 'node -e 0' } }, null, 2)}\n`)
    git(['add', '-A'])
    git(['commit', '--quiet', '-m', 'init'])
    // Wegwerf-Startvorlage = ai-workforce.json mit No-op-Prüfbefehl (sonst liefe nach dem Lauf 'npm run check' im Wegwerf-Repo).
    const vorlageVerzeichnis = mkdtempSync(join(tmpdir(), 'f36-ws2-vorlage-'))
    aufraeumen.push(vorlageVerzeichnis)
    const startvorlagePfad = join(vorlageVerzeichnis, 'startvorlage.json')
    writeFileSync(startvorlagePfad, JSON.stringify({ ...vorlage, pruefbefehl: [process.execPath, '-e', '0'] }, null, 2))
    const ladeOptionen = { basisVerzeichnis, schreiber: STILL }

    let gesehenLaufId = null
    const fuehreAufgabeDurchFn = async (laufId, _profilReferenz, eingaben) => {
      gesehen = eingaben
      gesehenLaufId = laufId
      return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
    }
    server = createServer(erzeugeRequestHandler({ basisVerzeichnis, fuehreAufgabeDurchFn, repoWurzel, installWurzel: INSTALL_WURZEL, startvorlagePfad }))
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    const basisUrl = `http://127.0.0.1:${server.address().port}`
    const auftragAntwort = await fetch(`${basisUrl}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel: `F36-WS-2-Gate ${fall}`, auftragstext: 'GATE-AUFTRAG-F36-WS2' }) })
    const { auftragId } = await auftragAntwort.json().catch(() => ({}))
    if (auftragAntwort.status !== 201) throw new Error(`POST /api/auftraege erwartet 201, erhalten ${auftragAntwort.status}`)

    let startAntwort
    let workflowId = null
    if (art === 'direkt') {
      const body = { laufId: `f36-ws2-${randomUUID()}`, rolle: 'ausfuehrung', anfragen: [], budget: {}, aufrufEingaben: { modell: 'claude-sonnet-5' }, werkzeugsatz, auftragId }
      startAntwort = await fetch(`${basisUrl}/api/laeufe`, { method: 'POST', body: JSON.stringify(body) })
    } else {
      workflowId = `f36-ws2-gate-${randomUUID()}`
      registriereWorkflow(
        {
          workflow_schema: 'v0',
          workflow_id: workflowId,
          auftrag_id: auftragId,
          version: 1,
          ziel: 'F36 WS-2 Gate-Fixture.',
          status: 'OFFEN',
          aktiver_schritt_id: 'schritt-1-ausfuehrung',
          grund: null,
          grenzen: { max_schritte: 4, max_replans: 1 },
          schritte: [
            {
              schritt_id: 'schritt-1-ausfuehrung',
              rolle: 'ausfuehrung',
              werkzeugsatz,
              worker: 'claude-code',
              modell: 'claude-sonnet-5',
              eingaben: [`artefakt:auftrag-${auftragId}`],
              output_schema: null,
              freigabe: 'ZWINGEND',
              freigabe_erteilt: true,
              risiko: 'Gate-Fixture.',
              zeitgrenze_ms: 600000,
              nachfolger: null,
              status: 'OFFEN',
              lauf_id: null,
            },
          ],
        },
        leiteProfilReferenzAb(ladeStartvorlage(startvorlagePfad)),
        ladeOptionen
      )
      startAntwort = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
    }
    // Nachlauf abwarten, bevor Server und Verzeichnisse abgeräumt werden (Muster check-fixpaket-f35-reallauf).
    // Ein schreibender Lauf löst danach den Kern-Prüfschritt im Wegwerf-Repo aus — erst dessen
    // Prüfergebnis abwarten, sonst hält er das Repo noch offen (EPERM beim Abräumen, F-590).
    const startzeit = Date.now()
    let fertig = false
    while (Date.now() - startzeit < 10000) {
      const status = workflowId === null ? null : ladeArtefaktVersion(`workflow-${workflowId}`, undefined, ladeOptionen)?.daten?.status
      const pruefungFertig = gesehenLaufId !== null && ladeArtefaktVersion(`pruefergebnis-${gesehenLaufId}`, undefined, ladeOptionen) !== null
      if (gesehen !== null && pruefungFertig && status !== 'LAEUFT' && status !== 'OFFEN') {
        fertig = true
        break
      }
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    if (gesehen === null) befunde.push(`${fall}: Attrappen-Starter nie aufgerufen (Start-Status ${startAntwort.status}: ${await startAntwort.text()})`)
    else if (!fertig) befunde.push(`${fall}: Nachlauf nach 10 s nicht abgeschlossen (Prüfergebnis/Workflow-Status fehlt)`)
  } catch (fehler) {
    befunde.push(`${fall}: Vorbereitung gescheitert: ${fehler.message}`)
  } finally {
    if (server !== null) await new Promise((resolve) => server.close(resolve))
    for (const pfad of aufraeumen) raeumeVerzeichnis(pfad)
  }
  return gesehen
}

/**
 * Prüft, dass die gesehenen Eingaben weder Skill noch Agent in --tools/--allowedTools tragen und der
 * Auftragstext keinen Subagenten-Satz enthält.
 * @param fall - Fallkennung für Befundtexte
 * @param eingaben - vom Attrappen-Starter gesehene AusfuehrungsEingaben
 */
function pruefeOhneSkillAgent(fall, eingaben) {
  const tokens = baueAufruf({ ...eingaben.aufrufEingaben, prompt: 'GATE' })
  for (const name of ['Skill', 'Agent']) {
    for (const flag of ['--tools', '--allowedTools']) {
      if (flagWert(tokens, flag).split(',').some((w) => w.split('(')[0] === name)) befunde.push(`${fall}: '${name}' steht in ${flag}: ${flagWert(tokens, flag)}`)
    }
  }
  if (eingaben.auftragstext.includes('run_in_background')) befunde.push(`${fall}: Auftragstext trägt einen Subagenten-Satz`)
}

// ─── (d) realer Start (Workflow-Schritt und POST /api/laeufe), ausfuehrung/schreibend: kein Skill/Agent ──
{
  const vor = befunde.length
  const workflow = await starteAusfuehrung('(d) workflow', 'workflow', 'schreibend')
  if (workflow !== null) pruefeOhneSkillAgent('(d) workflow', workflow)
  const direkt = await starteAusfuehrung('(d) direkt', 'direkt', 'schreibend')
  if (direkt !== null) pruefeOhneSkillAgent('(d) direkt', direkt)
  if (befunde.length === vor) console.log("✓ (d) Realer 'ausfuehrung'-Start mit 'schreibend' (Workflow-Schritt und POST /api/laeufe, Attrappen-Starter): kein Skill/Agent in --tools/--allowedTools, kein Subagenten-Satz.")
}

if (befunde.length > 0) {
  console.error(`\n✗ ${befunde.length} Befund(e):`)
  for (const befund of befunde) console.error(`  - ${befund}`)
  process.exit(1)
}
console.log('\n✓ F36-WS-2-Laufzeit-Check sauber.')
