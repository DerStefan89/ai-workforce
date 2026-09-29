#!/usr/bin/env node
/**
 * Datei: scripts/check-f36-ws3-empfehlung.mjs
 *
 * Zweck: Gate für F36 WS-3 „Empfehlung“ (features/F36/feature.md, AK7). Fixture-Katalog in einer
 * Wegwerf-Installationswurzel (ein freigegebener lokaler MCP mit installation, ein extern_lesend-MCP,
 * ein offener externer Skill), Wegwerf-Projekt-Repo, Attrappen-Starter statt Prozess. Belegt:
 * (a) empfohlen und angezeigt → der Lauf trägt den MCP in --mcp-config und seine Einzelnamen in
 *     --allowedTools, der Auftragstext die Empfehlungszeile (Workflow-Freigabe und POST /api/laeufe);
 * (b) nicht anwendbar → --mcp-config '{"mcpServers":{}}';
 * (c) Abweichung zwischen Anzeige und Start → Start abgelehnt (409 bei der Freigabe, nichts
 *     festgehalten; 400 bei POST /api/laeufe), der Starter wird nie aufgerufen;
 * (d) HTTP-Rundlauf: GET /api/workflows/<id> zeigt die Liste am ZWINGEND-Start (beide Listen mit
 *     Grund, Zählzeile), ohne Router-Artefakt mit Hinweis „keine Router-Klassifikation“;
 * (e) leere Liste → Auftragstext bitgenau wie ein Start ohne Anzeige;
 * (f) Stack-Auszug im Architekt-Auftrag nur bei offenem Stack;
 * (g) falsche Form von empfehlungIds → 400 (Freigabe: nichts festgehalten), ABGELEHNT mit veralteten
 *     ids → 200 GESTOPPT (keine Vorprüfung), lesender Ausführungsschritt → keine Empfehlung, ids
 *     ignoriert, --mcp-config leer;
 * (h) kaputtes ressourcen.json → Anzeige mit Fehler, Start ohne ids läuft ohne MCP, Start mit ids
 *     wird abgelehnt (fail-closed).
 *
 * Wichtig: Die Fixture-Installationswurzel ist bewusst eine eigene Wegwerf-Kopie — der echte Katalog
 * hat keinen freigegebenen MCP, (a) wäre gegen ihn nicht prüfbar.
 *
 * Wird aufgerufen von: `npm run check`.
 *
 * Aufruf: node scripts/check-f36-ws3-empfehlung.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { STACK_KANDIDATEN_UEBERSCHRIFT } from '../src/architekt/index.ts'
import { baueAufruf } from '../src/claude-code-gateway/index.ts'
import { ladeArtefaktVersion, registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { registriereWorkflow } from '../src/workflow/index.ts'
import { renderEmpfehlung } from '../public/leitstand/empfehlung-anzeige.js'
import { empfehlungsKennung } from '../src/ressourcen/index.ts'
import { erzeugeRequestHandler } from './leitstand-server.mjs'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []
console.log('\n=== F36-WS-3-Empfehlungs-Check ===\n')

const STILL = () => {}
const vorlage = ladeStartvorlage('startvorlagen/ai-workforce.json')
const AUFTRAGSTEXT = 'GATE-AUFTRAG-F36-WS3'
const ZEILE = 'Freigegebene Katalog-Fähigkeiten in diesem Lauf: gate-mcp (Gate MCP) — nutzen, wo sie passen.'
const LEERE_MCP_CONFIG = '{"mcpServers":{}}'

/** Fixture-Katalog: ein freigegebener lokaler MCP (beide Schlüssel), ein extern_lesend-MCP, ein offener Skill. */
const KATALOG = {
  ressourcen_schema: 'v0',
  ressourcen: [
    {
      id: 'gate-mcp',
      typ: 'extern',
      name: 'Gate MCP',
      beschreibung: 'Fixture.',
      unterart: 'mcp',
      wirkung: 'lokal',
      capabilities: ['GATE'],
      freigabe: 'FREIGEGEBEN',
      herkunft: { art: 'extern', url: 'https://example.invalid/gate-mcp' },
      installation: { version: '1.0.0', mcp_server: { command: 'node', args: ['server.js'] }, werkzeuge: ['mcp__gate-mcp__lesen', 'mcp__gate-mcp__suchen'] },
      anwendbar_wenn: { task_typen_any: ['bugfix'], pfad_muster_any: ['package.json'] },
    },
    {
      id: 'gate-lesend',
      typ: 'extern',
      name: 'Gate lesend',
      beschreibung: 'Fixture.',
      unterart: 'mcp',
      wirkung: 'extern_lesend',
      capabilities: ['GATE'],
      freigabe: 'OFFEN',
      herkunft: { art: 'extern', url: 'https://example.invalid/gate-lesend' },
      anwendbar_wenn: { task_typen_any: ['bugfix'] },
    },
    {
      id: 'gate-skill',
      typ: 'extern',
      name: 'Gate Skill',
      beschreibung: 'Fixture.',
      unterart: 'skill',
      capabilities: ['GATE'],
      freigabe: 'OFFEN',
      herkunft: { art: 'extern', url: 'https://example.invalid/gate-skill' },
      anwendbar_wenn: { task_typen_any: ['bugfix'] },
    },
  ],
}

/** Wert hinter einem Flag in den Tokens ('' wenn es fehlt). */
function flagWert(tokens, flag) {
  const i = tokens.indexOf(flag)
  return i === -1 ? '' : tokens[i + 1]
}

/** Wartet bis zur Bedingung oder bis zum Zeitlimit. @returns true, wenn die Bedingung eintrat */
async function warte(bedingung, ms = 10000) {
  const start = Date.now()
  while (Date.now() - start < ms) {
    if (bedingung()) return true
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  return false
}

/**
 * Ein Durchlauf gegen einen frischen Server: Wegwerf-Installationswurzel mit Fixture-Katalog und
 * Stack-Liste, Wegwerf-Projekt-Repo, Auftrag, optional Router-Artefakt, dann Start über Workflow-
 * Freigabe ('workflow'), Workflow-Start eines architekt-Schritts ('architekt') oder POST /api/laeufe
 * ('direkt'). Alles Angelegte wird im finally abgeräumt.
 * @param fall - Fallkennung für Befundtexte
 * @param o - { art, taskTypen (null = kein Router-Artefakt), empfehlungIds ('angezeigt' | Wert | undefined), claudeMd,
 *   werkzeugsatz (Default 'schreibend'), katalogKaputt, entscheidung (Default 'FREIGEGEBEN') }
 * @returns { detail, startStatus, startGrund, gesehen, entscheidungFestgehalten }
 */
async function durchlauf(fall, o) {
  const basisVerzeichnis = `kontrollzustand-test-f36-ws3-${randomUUID()}`
  const aufraeumen = [basisVerzeichnis]
  const ergebnis = { detail: null, startStatus: null, startGrund: null, gesehen: null, entscheidungFestgehalten: false }
  let server = null
  let gesehenLaufId = null
  try {
    const installWurzel = mkdtempSync(join(tmpdir(), 'f36-ws3-install-'))
    aufraeumen.push(installWurzel)
    writeFileSync(join(installWurzel, 'ressourcen.json'), o.katalogKaputt ? '{ kaputt' : JSON.stringify(KATALOG, null, 2))
    mkdirSync(join(installWurzel, 'docs', 'harness'), { recursive: true })
    copyFileSync(join(process.cwd(), 'docs', 'harness', 'stack-kandidaten.md'), join(installWurzel, 'docs', 'harness', 'stack-kandidaten.md'))

    const repoWurzel = mkdtempSync(join(tmpdir(), 'f36-ws3-repo-'))
    aufraeumen.push(repoWurzel)
    const git = (argumente) => execFileSync('git', argumente, { cwd: repoWurzel, encoding: 'utf8' })
    git(['init', '--quiet', '-b', 'wegwerf-branch'])
    git(['config', 'user.email', 'gate@example.invalid'])
    git(['config', 'user.name', 'Gate'])
    git(['config', 'core.autocrlf', 'false'])
    writeFileSync(join(repoWurzel, 'package.json'), `${JSON.stringify({ name: 'fremd', scripts: { check: 'node -e 0' } }, null, 2)}\n`)
    if (o.claudeMd !== undefined) writeFileSync(join(repoWurzel, 'CLAUDE.md'), o.claudeMd)
    git(['add', '-A'])
    git(['commit', '--quiet', '-m', 'init'])

    const vorlageVerzeichnis = mkdtempSync(join(tmpdir(), 'f36-ws3-vorlage-'))
    aufraeumen.push(vorlageVerzeichnis)
    const startvorlagePfad = join(vorlageVerzeichnis, 'startvorlage.json')
    writeFileSync(startvorlagePfad, JSON.stringify({ ...vorlage, pruefbefehl: [process.execPath, '-e', '0'] }, null, 2))
    const profilReferenz = leiteProfilReferenzAb(ladeStartvorlage(startvorlagePfad))
    const ladeOptionen = { basisVerzeichnis, schreiber: STILL }

    const fuehreAufgabeDurchFn = async (laufId, _profilReferenz, eingaben) => {
      ergebnis.gesehen = eingaben
      gesehenLaufId = laufId
      return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
    }
    server = createServer(erzeugeRequestHandler({ basisVerzeichnis, fuehreAufgabeDurchFn, repoWurzel, installWurzel, startvorlagePfad }))
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    const basisUrl = `http://127.0.0.1:${server.address().port}`

    const auftragAntwort = await fetch(`${basisUrl}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel: `F36-WS-3-Gate ${fall}`, auftragstext: AUFTRAGSTEXT }) })
    const { auftragId } = await auftragAntwort.json().catch(() => ({}))
    if (auftragAntwort.status !== 201) throw new Error(`POST /api/auftraege erwartet 201, erhalten ${auftragAntwort.status}`)
    if (o.taskTypen !== null) {
      const klassifikation = { kontrolltiefe: 'standard', risikoklasse: 'niedrig', task_typen: o.taskTypen, rueckfragen: [], begruendung: 'Gate.' }
      registriereKernArtefakt(
        `router-${auftragId}`,
        profilReferenz,
        { erzeuger: 'kern', schritt: 'router-lauf' },
        { router_ergebnis_schema: 'v0', auftrag_id: auftragId, lauf_id: 'gate', worker: 'claude-code', klassifikation, vorlage: 'standard', beobachtung: null, erstellt_am: new Date().toISOString() },
        [],
        ladeOptionen
      )
    }

    const werkzeugsatz = o.art === 'architekt' ? 'lesend' : (o.werkzeugsatz ?? 'schreibend')
    const schreibend = werkzeugsatz === 'schreibend'
    let workflowId = null
    let antwort
    if (o.art === 'direkt') {
      const body = { laufId: `f36-ws3-${randomUUID()}`, rolle: 'ausfuehrung', anfragen: [], budget: {}, aufrufEingaben: { modell: 'claude-sonnet-5' }, werkzeugsatz, auftragId }
      if (o.empfehlungIds !== undefined) body.empfehlungIds = o.empfehlungIds
      antwort = await fetch(`${basisUrl}/api/laeufe`, { method: 'POST', body: JSON.stringify(body) })
    } else {
      workflowId = `f36-ws3-gate-${randomUUID()}`
      const architekt = o.art === 'architekt'
      const schrittId = architekt ? 'schritt-1-architekt' : 'schritt-1-ausfuehrung'
      registriereWorkflow(
        {
          workflow_schema: 'v0',
          workflow_id: workflowId,
          auftrag_id: auftragId,
          version: 1,
          ziel: 'F36 WS-3 Gate-Fixture.',
          status: 'OFFEN',
          aktiver_schritt_id: schrittId,
          grund: null,
          grenzen: { max_schritte: 4, max_replans: 1 },
          schritte: [
            {
              schritt_id: schrittId,
              // Rolle aus o.art statt als Literal im Ternär (check-f17-rollenvertrag AK1 sucht Rollenlisten).
              rolle: architekt ? o.art : 'ausfuehrung',
              werkzeugsatz,
              worker: 'claude-code',
              modell: 'claude-sonnet-5',
              eingaben: [`artefakt:auftrag-${auftragId}`],
              output_schema: null,
              freigabe: 'ZWINGEND',
              freigabe_erteilt: architekt,
              risiko: 'Gate-Fixture.',
              zeitgrenze_ms: 600000,
              nachfolger: null,
              status: 'OFFEN',
              lauf_id: null,
            },
          ],
        },
        profilReferenz,
        ladeOptionen
      )
      if (architekt) {
        antwort = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
      } else {
        const detailAntwort = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}`)
        ergebnis.detail = await detailAntwort.json()
        const body = { schrittId, entscheidung: o.entscheidung ?? 'FREIGEGEBEN', begruendung: 'Gate-Freigabe' }
        // 'angezeigt' = genau das, was die Oberfläche schickt (empfehlungIdsFuerFreigabe): ohne Anzeige oder bei Fehler kein Feld.
        const anzeige = ergebnis.detail.empfehlung
        if (o.empfehlungIds === 'angezeigt') {
          if (anzeige !== null && anzeige !== undefined && anzeige.fehler === undefined) body.empfehlungIds = anzeige.wirdGenutzt.map((e) => e.empfehlungId)
        } else if (o.empfehlungIds !== undefined) body.empfehlungIds = o.empfehlungIds
        antwort = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/freigabe`, { method: 'POST', body: JSON.stringify(body) })
        ergebnis.entscheidungFestgehalten = ladeArtefaktVersion(`entscheidung-workflow-${workflowId}-${schrittId}`, undefined, ladeOptionen) !== null
      }
    }
    ergebnis.startStatus = antwort.status
    ergebnis.startGrund = (await antwort.json().catch(() => ({}))).grund ?? null

    if (antwort.status === 202) {
      // Nachlauf abwarten (Muster check-f36-ws2-laufzeit): schreibend → Prüfergebnis, sonst Workflow-Status.
      const fertig = await warte(() => {
        if (ergebnis.gesehen === null) return false
        if (schreibend && ladeArtefaktVersion(`pruefergebnis-${gesehenLaufId}`, undefined, ladeOptionen) === null) return false
        const status = workflowId === null ? null : ladeArtefaktVersion(`workflow-${workflowId}`, undefined, ladeOptionen)?.daten?.status
        return status !== 'LAEUFT' && status !== 'OFFEN'
      })
      if (!fertig) befunde.push(`${fall}: Nachlauf nach 10 s nicht abgeschlossen (gesehen: ${ergebnis.gesehen !== null})`)
    } else {
      // Abgelehnter Start: kurz warten, ob der Starter trotzdem aufgerufen wird.
      await new Promise((resolve) => setTimeout(resolve, 300))
    }
  } catch (fehler) {
    befunde.push(`${fall}: Vorbereitung gescheitert: ${fehler.message}`)
  } finally {
    if (server !== null) await new Promise((resolve) => server.close(resolve))
    for (const pfad of aufraeumen) raeumeVerzeichnis(pfad)
  }
  return ergebnis
}

/** Tokens, die der Starter aus den gesehenen Eingaben bauen würde. */
function tokensAus(eingaben) {
  return baueAufruf({ ...eingaben.aufrufEingaben, prompt: 'GATE' })
}

/** Prüft, dass der Lauf genau gate-mcp mit beiden Einzelnamen trägt und der Auftragstext die Zeile. */
function pruefeMitMcp(fall, e) {
  if (e.startStatus !== 202 || e.gesehen === null) {
    befunde.push(`${fall}: erwartet Start 202 mit Starter-Aufruf, erhalten ${e.startStatus} (${e.startGrund})`)
    return
  }
  const tokens = tokensAus(e.gesehen)
  const config = JSON.parse(flagWert(tokens, '--mcp-config') || '{}')
  if (JSON.stringify(Object.keys(config.mcpServers ?? {})) !== '["gate-mcp"]' || config.mcpServers['gate-mcp'].command !== 'node') {
    befunde.push(`${fall}: --mcp-config trägt nicht genau 'gate-mcp': ${flagWert(tokens, '--mcp-config')}`)
  }
  const mcpNamen = flagWert(tokens, '--allowedTools').split(',').filter((w) => w.startsWith('mcp__'))
  if (JSON.stringify(mcpNamen) !== JSON.stringify(['mcp__gate-mcp__lesen', 'mcp__gate-mcp__suchen'])) befunde.push(`${fall}: --allowedTools trägt nicht genau die Einzelnamen: ${JSON.stringify(mcpNamen)}`)
  if (!e.gesehen.auftragstext.includes(`\n\n${ZEILE}`)) befunde.push(`${fall}: Auftragstext trägt die Empfehlungszeile nicht`)
}

// ─── (a) + (d) empfohlen und angezeigt: Liste am ZWINGEND-Start, Lauf trägt den MCP ──
const angezeigt = await durchlauf('(a) workflow', { art: 'workflow', taskTypen: ['bugfix'], empfehlungIds: 'angezeigt' })
{
  const vor = befunde.length
  pruefeMitMcp('(a) workflow', angezeigt)
  // Seit F36 WS-5a (F-808) ist die angezeigte Kennung '<id>@<hash der installation>'.
  const direkt = await durchlauf('(a) direkt', { art: 'direkt', taskTypen: ['bugfix'], empfehlungIds: [empfehlungsKennung(KATALOG.ressourcen[0])] })
  pruefeMitMcp('(a) direkt', direkt)
  if (befunde.length === vor) console.log('✓ (a) Empfohlen und angezeigt: --mcp-config enthält gate-mcp, --allowedTools genau seine Einzelnamen, Auftragstext die Zeile (Freigabe und POST /api/laeufe).')
}
{
  const vor = befunde.length
  const e = angezeigt.detail?.empfehlung
  if (e === null || e === undefined || 'fehler' in e) {
    befunde.push(`(d) GET /api/workflows/<id> trägt am ZWINGEND-Start keine Empfehlung: ${JSON.stringify(e)}`)
  } else {
    if (JSON.stringify(e.wirdGenutzt.map((x) => x.id)) !== '["gate-mcp"]') befunde.push(`(d) wirdGenutzt ist nicht ['gate-mcp']: ${JSON.stringify(e.wirdGenutzt)}`)
    const skill = e.passtNichtImLauf.find((x) => x.id === 'gate-skill')
    if (skill === undefined || !/freigabe OFFEN/.test(skill.grund) || !/erst ab WS-5/.test(skill.grund)) befunde.push(`(d) passtNichtImLauf trägt gate-skill nicht mit Grund: ${JSON.stringify(e.passtNichtImLauf)}`)
    if (e.nichtFreigebbarAnzahl !== 1 || e.passtNichtImLauf.some((x) => x.id === 'gate-lesend')) befunde.push(`(d) extern_lesend nicht nur als Zählzeile: ${JSON.stringify(e)}`)
    const html = renderEmpfehlung(e)
    if (!html.includes('<code>gate-mcp</code>') || !html.includes('1 passende Einträge in V1 nicht freigebbar')) befunde.push('(d) renderEmpfehlung zeigt die Server-Empfehlung nicht vollständig')
  }
  const ohneRouter = await durchlauf('(d) ohne Router', { art: 'workflow', taskTypen: null, empfehlungIds: 'angezeigt' })
  const h = ohneRouter.detail?.empfehlung
  if (!Array.isArray(h?.hinweise) || !h.hinweise.includes('keine Router-Klassifikation') || h.wirdGenutzt.length !== 0) befunde.push(`(d) ohne Router-Artefakt fehlt der Hinweis oder die Liste ist nicht leer: ${JSON.stringify(h)}`)
  if (befunde.length === vor) console.log('✓ (d) HTTP-Rundlauf: GET /api/workflows/<id> zeigt am ZWINGEND-Start beide Listen mit Grund und die Zählzeile; ohne Router-Artefakt „keine Router-Klassifikation“.')
}

// ─── (b) + (e) nicht anwendbar: leere mcp-config, Auftragstext bitgenau ──
{
  const vor = befunde.length
  const leer = await durchlauf('(b) nicht anwendbar', { art: 'workflow', taskTypen: ['dokumentation'], empfehlungIds: 'angezeigt' })
  if (leer.startStatus !== 202 || leer.gesehen === null) {
    befunde.push(`(b) erwartet Start 202, erhalten ${leer.startStatus} (${leer.startGrund})`)
  } else {
    if (flagWert(tokensAus(leer.gesehen), '--mcp-config') !== LEERE_MCP_CONFIG) befunde.push(`(b) --mcp-config ist nicht '${LEERE_MCP_CONFIG}': ${flagWert(tokensAus(leer.gesehen), '--mcp-config')}`)
    if (befunde.length === vor) console.log(`✓ (b) Nicht anwendbar: --mcp-config '${LEERE_MCP_CONFIG}'.`)
    const vorE = befunde.length
    const ohne = await durchlauf('(e) ohne Anzeige', { art: 'workflow', taskTypen: ['dokumentation'], empfehlungIds: undefined })
    if (ohne.gesehen === null) befunde.push('(e) Vergleichslauf ohne Anzeige hat den Starter nicht erreicht')
    else if (ohne.gesehen.auftragstext !== leer.gesehen.auftragstext) befunde.push('(e) Auftragstext bei leerer Liste weicht vom Start ohne Anzeige ab')
    else if (leer.gesehen.auftragstext.includes('Katalog-Fähigkeiten')) befunde.push('(e) Auftragstext trägt bei leerer Liste eine Empfehlungszeile')
    if (befunde.length === vorE) console.log('✓ (e) Leere Liste: Auftragstext bitgenau wie ein Start ohne Anzeige.')
  }
}

// ─── (c) Abweichung zwischen Anzeige und Start: abgelehnt, Starter nie aufgerufen ──
{
  const vor = befunde.length
  const freigabe = await durchlauf('(c) freigabe', { art: 'workflow', taskTypen: ['bugfix'], empfehlungIds: [] })
  if (freigabe.startStatus !== 409 || !/seit der Anzeige geändert/.test(freigabe.startGrund ?? '')) befunde.push(`(c) Freigabe mit abweichender Anzeige: erwartet 409 „seit der Anzeige geändert“, erhalten ${freigabe.startStatus} (${freigabe.startGrund})`)
  if (freigabe.gesehen !== null) befunde.push('(c) Freigabe mit abweichender Anzeige hat den Starter trotzdem aufgerufen')
  if (freigabe.entscheidungFestgehalten) befunde.push('(c) Freigabe mit abweichender Anzeige wurde trotzdem als Entscheidung festgehalten')
  const direkt = await durchlauf('(c) direkt', { art: 'direkt', taskTypen: ['bugfix'], empfehlungIds: ['gate-mcp', 'fremd'] })
  if (direkt.startStatus !== 400 || !/seit der Anzeige geändert/.test(direkt.startGrund ?? '') || direkt.gesehen !== null) befunde.push(`(c) POST /api/laeufe mit abweichender Anzeige: erwartet 400 ohne Starter, erhalten ${direkt.startStatus} (${direkt.startGrund})`)
  if (befunde.length === vor) console.log('✓ (c) Abweichung Anzeige/Start: Freigabe 409 (nichts festgehalten), POST /api/laeufe 400 — Starter nie aufgerufen.')
}

// ─── (f) Stack-Auszug nur bei offenem Stack ──
{
  const vor = befunde.length
  const offen = await durchlauf('(f) Stack offen', { art: 'architekt', taskTypen: null })
  if (offen.gesehen === null) befunde.push(`(f) Stack offen: Starter nicht erreicht (${offen.startStatus} ${offen.startGrund})`)
  else if (!offen.gesehen.auftragstext.includes(`${STACK_KANDIDATEN_UEBERSCHRIFT}\n- shadcn/ui — `) || offen.gesehen.auftragstext.includes('Google Trends')) befunde.push('(f) Stack offen: Auftragstext trägt den Auszug nicht oder mit zurückgestellter Zeile')
  const zu = await durchlauf('(f) Stack entschieden', { art: 'architekt', taskTypen: null, claudeMd: '# Projekt\n\n## Technischer Stack\n\nNode, TypeScript.\n' })
  if (zu.gesehen === null) befunde.push(`(f) Stack entschieden: Starter nicht erreicht (${zu.startStatus} ${zu.startGrund})`)
  else if (zu.gesehen.auftragstext.includes(STACK_KANDIDATEN_UEBERSCHRIFT)) befunde.push('(f) Stack entschieden: Auftragstext trägt trotzdem den Stack-Auszug')
  if (befunde.length === vor) console.log('✓ (f) Stack-Auszug im Architekt-Auftrag nur bei offenem Stack (aus der Installationswurzel, ohne zurückgestellte Zeilen).')
}

// ─── (g) Form, ABGELEHNT, lesender Schritt ──
{
  const vor = befunde.length
  const form = await durchlauf('(g) Form freigabe', { art: 'workflow', taskTypen: ['bugfix'], empfehlungIds: 'gate-mcp' })
  if (form.startStatus !== 400 || !/empfehlungIds/.test(form.startGrund ?? '') || form.entscheidungFestgehalten || form.gesehen !== null) befunde.push(`(g) Freigabe mit empfehlungIds als String: erwartet 400 ohne Festhalten, erhalten ${form.startStatus} (${form.startGrund})`)
  const formDirekt = await durchlauf('(g) Form direkt', { art: 'direkt', taskTypen: ['bugfix'], empfehlungIds: [1] })
  if (formDirekt.startStatus !== 400 || !/empfehlungIds/.test(formDirekt.startGrund ?? '') || formDirekt.gesehen !== null) befunde.push(`(g) POST /api/laeufe mit empfehlungIds [1]: erwartet 400, erhalten ${formDirekt.startStatus} (${formDirekt.startGrund})`)
  const abgelehnt = await durchlauf('(g) ABGELEHNT', { art: 'workflow', taskTypen: ['bugfix'], empfehlungIds: [], entscheidung: 'ABGELEHNT' })
  if (abgelehnt.startStatus !== 200 || abgelehnt.gesehen !== null) befunde.push(`(g) ABGELEHNT mit veralteten ids: erwartet 200 ohne Start, erhalten ${abgelehnt.startStatus} (${abgelehnt.startGrund})`)
  const lesend = await durchlauf('(g) lesend', { art: 'workflow', werkzeugsatz: 'lesend', taskTypen: ['bugfix'], empfehlungIds: ['gate-mcp'] })
  if (lesend.detail?.empfehlung !== null) befunde.push(`(g) lesender Ausführungsschritt: GET trägt eine Empfehlung: ${JSON.stringify(lesend.detail?.empfehlung)}`)
  if (lesend.gesehen === null) befunde.push(`(g) lesender Ausführungsschritt mit ids: Starter nicht erreicht (${lesend.startStatus} ${lesend.startGrund})`)
  else if (flagWert(tokensAus(lesend.gesehen), '--mcp-config') !== LEERE_MCP_CONFIG || lesend.gesehen.auftragstext.includes('Katalog-Fähigkeiten')) befunde.push('(g) lesender Ausführungsschritt: ids nicht ignoriert (MCP oder Zeile im Lauf)')
  if (befunde.length === vor) console.log('✓ (g) Falsche Form von empfehlungIds → 400 (nichts festgehalten); ABGELEHNT mit veralteten ids → 200; lesender Ausführungsschritt: keine Empfehlung, ids ignoriert.')
}

// ─── (h) kaputter Katalog ──
{
  const vor = befunde.length
  const ohneIds = await durchlauf('(h) kaputt, ohne ids', { art: 'workflow', taskTypen: ['bugfix'], empfehlungIds: 'angezeigt', katalogKaputt: true })
  if (typeof ohneIds.detail?.empfehlung?.fehler !== 'string') befunde.push(`(h) GET zeigt bei kaputtem Katalog keinen Fehler: ${JSON.stringify(ohneIds.detail?.empfehlung)}`)
  if (ohneIds.gesehen === null) befunde.push(`(h) Start ohne ids bei kaputtem Katalog nicht erreicht (${ohneIds.startStatus} ${ohneIds.startGrund})`)
  else if (flagWert(tokensAus(ohneIds.gesehen), '--mcp-config') !== LEERE_MCP_CONFIG) befunde.push('(h) Start ohne ids bei kaputtem Katalog trägt einen MCP')
  const mitIds = await durchlauf('(h) kaputt, mit ids', { art: 'workflow', taskTypen: ['bugfix'], empfehlungIds: [], katalogKaputt: true })
  if (mitIds.startStatus !== 409 || !/nicht ermittelbar/.test(mitIds.startGrund ?? '') || mitIds.entscheidungFestgehalten || mitIds.gesehen !== null) befunde.push(`(h) Start mit ids bei kaputtem Katalog: erwartet 409 ohne Festhalten, erhalten ${mitIds.startStatus} (${mitIds.startGrund})`)
  if (befunde.length === vor) console.log('✓ (h) Kaputtes ressourcen.json: Anzeige mit Fehler, Start ohne ids ohne MCP, Start mit ids abgelehnt (409, nichts festgehalten).')
}

if (befunde.length > 0) {
  console.error(`\n✗ ${befunde.length} Befund(e):`)
  for (const befund of befunde) console.error(`  - ${befund}`)
  process.exit(1)
}
console.log('\n✓ F36-WS-3-Empfehlungs-Check sauber.')
