#!/usr/bin/env node
/**
 * Datei: features/F45/nachweise/f2a/beleg13.mjs
 *
 * Zweck: F45 F-2a — Beleg 13 im echten Lauf über die Wege der Oberfläche: eine eigene Leitstand-Instanz
 * (erzeugeRequestHandler mit Oberfläche, Wegwerf-Kontrollzustand, Wegwerf-faehigkeiten.lokal.json, Port 4391) für ein
 * Wegwerf-Testprojekt mit Skelett-Harness (wie F-1; nie haushaltsbuch2, nie ai-workforce). Ablauf:
 * - L1: über POST …/faehigkeiten/aktivierung (die Route des Schalters) agent:qa einschalten; playwright-mcp und der
 *   installierte Skill frontend-design bleiben an (Standard). Workflow mit Ausführungsschritt anlegen, GET
 *   /api/workflows/<id> (Freigabeblock), Freigabe mit genau den angezeigten Kennungen (empfehlungIdsFuerFreigabe —
 *   Katalog + Projekt-Kennung) → echter Lauf, der Skill, MCP und Agent nutzt.
 * - L2: agent:qa über dieselbe Route ausschalten → neuer Workflow, gleiche Bitte → qa nicht verfügbar.
 * Danach bleibt der Server für den Render-Nachweis offen (Workforce „Dieses Projekt“, Lauf-Detail), bis der Prozess
 * beendet wird (--ohne-halten: sofort beenden). Schreibt zaehlung-<lauf>.json und ablauf.json neben dieses Skript; die
 * Rohströme und der Kontrollzustand bleiben in %TEMP% (nicht committen).
 *
 * Wird aufgerufen von: Hand (`node features/F45/nachweise/f2a/beleg13.mjs`), nicht von `npm run check`.
 *
 * Wichtig: liest ~/.ai-workforce/cap (installierte playwright-mcp und frontend-design) nur; schreibt nie
 * ~/.ai-workforce/faehigkeiten.lokal.json. Startfreigabe über eine F4-Fixture in tmp (Muster F-1 realer-lauf.mjs).
 */

import { randomUUID } from 'node:crypto'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { sha256Hex } from '../../../../src/checkpoint-store/index.ts'
import { fuehreGitSync } from '../../../../src/git-starter/index.ts'
import { ermittleIstZustand } from '../../../../src/invocation-policy/index.ts'
import { ladeArtefaktVersion, registriereKernArtefakt } from '../../../../src/lineage-registry/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../../../../src/startvorlage/index.ts'
import { registriereWorkflow } from '../../../../src/workflow/index.ts'
import { empfehlungIdsFuerFreigabe } from '../../../../public/leitstand/empfehlung-anzeige.js'
import { erzeugeRequestHandler } from '../../../../scripts/leitstand-server.mjs'

const HIER = import.meta.dirname
const INSTALL = join(HIER, '..', '..', '..', '..')
const MODELL = 'claude-haiku-4-5'
const PORT = Number(process.env.BELEG13_PORT ?? 4391)
const STARTVORLAGE = join(INSTALL, 'startvorlagen', 'ai-workforce.json')
const vorlage = ladeStartvorlage(STARTVORLAGE)
const profilReferenz = leiteProfilReferenzAb(vorlage)
const wurzel = mkdtempSync(join(tmpdir(), 'f45-f2a-beleg13-'))
console.log(`Wegwerf-Wurzel: ${wurzel}`)
const git = (cwd, ...a) => fuehreGitSync(a, { cwd, encoding: 'utf8' })

// ─── F4-Startfreigabe-Fixture (Muster features/F45/nachweise/f1/realer-lauf.mjs) ──
const STARTFREIGABE_REPO = join(wurzel, 'startfreigabe')
mkdirSync(STARTFREIGABE_REPO)
git(STARTFREIGABE_REPO, 'init', '-q')
git(STARTFREIGABE_REPO, 'config', 'user.email', 'nachweis@example.invalid')
git(STARTFREIGABE_REPO, 'config', 'user.name', 'Nachweis')
writeFileSync(join(STARTFREIGABE_REPO, '.gitattributes'), '* -text\n')
git(STARTFREIGABE_REPO, 'add', '.gitattributes')
git(STARTFREIGABE_REPO, 'commit', '-q', '-m', 'init')
function committe(relativ, inhalt) {
  const ziel = join(STARTFREIGABE_REPO, relativ)
  mkdirSync(dirname(ziel), { recursive: true })
  writeFileSync(ziel, inhalt)
  git(STARTFREIGABE_REPO, 'add', relativ)
  git(STARTFREIGABE_REPO, 'commit', '-q', '-m', relativ)
  return { pfad: ziel, commit_hash: git(STARTFREIGABE_REPO, 'rev-parse', 'HEAD').trim(), datei_hash: sha256Hex(inhalt) }
}
const F4 = join(wurzel, 'f4')
mkdirSync(join(F4, '.claude', 'hooks'), { recursive: true })
writeFileSync(join(F4, '.claude', 'hooks', 'guard.js'), 'hook-fixture')
const SETTINGS = join(F4, '.claude', 'settings.json')
writeFileSync(SETTINGS, JSON.stringify({ hooks: { PreToolUse: [{ matcher: 'Edit', hooks: [{ type: 'command', command: 'node .claude/hooks/guard.js' }] }] } }))
const IST = ermittleIstZustand(SETTINGS)
const UEBRIG = { werkzeug_version_deklariert: vorlage.werkzeugVersionDeklariert, berechtigungskontext: vorlage.berechtigungskontext, arbeitsverzeichnis_pfad: process.cwd(), startziel_pfad: vorlage.werkzeugStartziel[0] }
const BASELINE = committe('baseline.json', JSON.stringify({ werkzeug_konfiguration: { pfad: '.claude/settings.json', hash: IST.werkzeug_konfiguration_hash }, schutzskripte: IST.schutzskripte }))
const NACHWEIS = committe('nachweis.json', JSON.stringify({ gueltigkeitsschluessel: { werkzeug_konfiguration_hash: IST.werkzeug_konfiguration_hash, schutzskript_hashes: IST.schutzskripte.map((e) => e.hash), ...UEBRIG }, rot_fall_beleg: 'F45 F-2a Beleg 13 — Fixture', geprueft_am: new Date().toISOString() }))
const AUTORISIERUNG = join(F4, 'aktuelle-autorisierung.json')
writeFileSync(AUTORISIERUNG, JSON.stringify({ baselineReferenz: BASELINE, wirksamkeitsnachweisReferenz: NACHWEIS }))

// ─── Testprojekt (Skelett-.claude, eine HTML-Seite für playwright/frontend-design) ──
const projekt = join(wurzel, 'testprojekt')
mkdirSync(join(projekt, 'public'), { recursive: true })
cpSync(join(INSTALL, 'vorlagen', 'projekt-skelett', '.claude'), join(projekt, '.claude'), { recursive: true })
writeFileSync(join(projekt, 'CLAUDE.md'), '# Testprojekt F45 F-2a (Beleg 13)\n')
writeFileSync(join(projekt, 'package.json'), `${JSON.stringify({ name: 'f45-f2a-beleg13', private: true, scripts: { check: 'node -e 0' } }, null, 2)}\n`)
writeFileSync(join(projekt, 'public', 'index.html'), '<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Beleg 13 Testseite</title></head><body><h1>Beleg 13</h1></body></html>\n')
git(projekt, 'init', '-q', '-b', 'arbeit')
git(projekt, 'config', 'user.email', 'nachweis@example.invalid')
git(projekt, 'config', 'user.name', 'Nachweis')
git(projekt, 'config', 'core.autocrlf', 'false')
git(projekt, 'add', '-A')
git(projekt, 'commit', '-q', '-m', 'init')

// ─── Vorschau des Projekts (Ziel von playwright, {projekt_origins}) ──
const vorschau = createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
  res.end(readFileSync(join(projekt, 'public', 'index.html')))
})
await new Promise((r) => vorschau.listen(0, '127.0.0.1', r))
const vorschauUrl = `http://127.0.0.1:${vorschau.address().port}`

// ─── Leitstand-Instanz mit Oberfläche ──
const basisVerzeichnis = join(wurzel, 'kontrollzustand')
const ladeOptionen = { basisVerzeichnis, schreiber: () => {} }
const lokalPfad = join(wurzel, 'ai-workforce-home', 'faehigkeiten.lokal.json')
const leitstand = createServer(
  erzeugeRequestHandler({
    basisVerzeichnis,
    repoWurzel: projekt,
    // Wie baueProjektHandlerMap (cwd: pfade.cwd): der Lauf startet im Projekt. Ohne diese Angabe liefe die CLI im
    // Prozessordner (ai-workforce) — real beobachtet am 12.10.2026: das Init-Gate brach den Lauf ab (design-guardian/scout).
    cwd: projekt,
    installWurzel: INSTALL,
    startvorlagePfad: STARTVORLAGE,
    projektId: 'testprojekt',
    vorschauUrl,
    faehigkeitenLokalPfad: lokalPfad,
    laufausgabeWurzel: join(wurzel, 'laufausgabe'),
    settingsPfad: SETTINGS,
    aktuelleAutorisierungPfad: AUTORISIERUNG,
    startfreigabeRepoWurzel: STARTFREIGABE_REPO,
    rohBasisVerzeichnis: join(wurzel, 'roh'),
  })
)
await new Promise((r) => leitstand.listen(PORT, '127.0.0.1', r))
const basis = `http://127.0.0.1:${PORT}`
console.log(`Leitstand (Testinstanz): ${basis}  ·  Vorschau: ${vorschauUrl}`)
const holen = async (pfad) => (await fetch(`${basis}${pfad}`)).json()
const senden = async (pfad, koerper) => {
  const antwort = await fetch(`${basis}${pfad}`, { method: 'POST', body: JSON.stringify(koerper) })
  return { status: antwort.status, koerper: await antwort.json().catch(() => ({})) }
}
const warte = async (bedingung, ms) => {
  const start = Date.now()
  while (Date.now() - start < ms) {
    if (bedingung()) return true
    await new Promise((r) => setTimeout(r, 2000))
  }
  return false
}

const ablauf = { wurzel, vorschauUrl, basis, schritte: [] }

/**
 * Ein Lauf über den Weg der Oberfläche: Auftrag + Router-Klassifikation, Workflow mit ZWINGEND-Ausführungsschritt,
 * GET (Freigabeblock), Freigabe mit den angezeigten Kennungen; wartet auf das Ende und schreibt die Zählung.
 */
async function lauf(name, auftragstext) {
  const auftrag = await senden('/api/auftraege', { titel: `F45 F-2a Beleg 13 ${name}`, auftragstext })
  const auftragId = auftrag.koerper.auftragId
  const klassifikation = { kontrolltiefe: 'standard', risikoklasse: 'niedrig', task_typen: ['neues-feature'], rueckfragen: [], begruendung: 'Beleg 13.' }
  registriereKernArtefakt(`router-${auftragId}`, profilReferenz, { erzeuger: 'kern', schritt: 'router-lauf' }, { router_ergebnis_schema: 'v0', auftrag_id: auftragId, lauf_id: 'beleg13', worker: 'claude-code', klassifikation, vorlage: 'standard', beobachtung: null, erstellt_am: new Date().toISOString() }, [], ladeOptionen)
  const workflowId = `f45-f2a-beleg13-${name}-${randomUUID().slice(0, 8)}`
  const schrittId = 'schritt-1-ausfuehrung'
  registriereWorkflow(
    {
      workflow_schema: 'v0',
      workflow_id: workflowId,
      auftrag_id: auftragId,
      version: 1,
      ziel: `Beleg 13 ${name}`,
      status: 'OFFEN',
      aktiver_schritt_id: schrittId,
      grund: null,
      grenzen: { max_schritte: 4, max_replans: 1 },
      schritte: [{ schritt_id: schrittId, rolle: 'ausfuehrung', werkzeugsatz: 'schreibend', worker: 'claude-code', modell: MODELL, eingaben: [`artefakt:auftrag-${auftragId}`], output_schema: null, freigabe: 'ZWINGEND', freigabe_erteilt: false, risiko: 'Beleg 13, Wegwerf-Projekt.', zeitgrenze_ms: 600000, nachfolger: null, status: 'OFFEN', lauf_id: null }],
    },
    profilReferenz,
    ladeOptionen
  )
  const detail = await holen(`/api/workflows/${encodeURIComponent(workflowId)}`)
  const empfehlungIds = empfehlungIdsFuerFreigabe(detail.empfehlung)
  const freigabe = await senden(`/api/workflows/${encodeURIComponent(workflowId)}/freigabe`, { schrittId, entscheidung: 'FREIGEGEBEN', begruendung: 'Beleg 13 (Oberfläche: angezeigte Kennungen)', ...(empfehlungIds !== undefined ? { empfehlungIds } : {}) })
  console.log(`${name}: Freigabe ${freigabe.status} ${freigabe.koerper.grund ?? ''}`)
  let laufId = null
  const fertig = await warte(() => {
    const wf = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, ladeOptionen)?.daten
    laufId = wf?.schritte?.[0]?.lauf_id ?? null
    return laufId !== null && wf.status !== 'LAEUFT' && ladeArtefaktVersion(`laufakte-${laufId}`, undefined, ladeOptionen) !== null
  }, 900000)
  const laufakte = laufId === null ? null : (ladeArtefaktVersion(`laufakte-${laufId}`, undefined, ladeOptionen)?.daten ?? null)
  const roh = laufakte === null ? null : JSON.parse(readFileSync(laufakte.rohstrom_referenz.pfad, 'utf8'))
  const zeilen = roh === null ? [] : roh.stdout.split('\n').map((z) => { try { return JSON.parse(z) } catch { return null } })
  const result = zeilen.findLast((z) => z?.type === 'result') ?? null
  const init = zeilen.find((z) => z?.type === 'system' && z?.subtype === 'init') ?? null
  const zaehlung = {
    lauf: name,
    lauf_id: laufId,
    workflow_id: workflowId,
    fertig,
    modell: MODELL,
    cli: init?.claude_code_version ?? null,
    freigabe: { status: freigabe.status, grund: freigabe.koerper.grund ?? null },
    angezeigt: { wird_genutzt: detail.empfehlung?.wirdGenutzt?.map((e) => e.empfehlungId) ?? null, projekt_faehigkeiten: detail.empfehlung?.projektFaehigkeiten ?? null, deaktiviert: detail.empfehlung?.deaktiviert ?? null, passt_nicht_im_lauf: detail.empfehlung?.passtNichtImLauf ?? null },
    empfehlung_ids_gesendet: empfehlungIds ?? null,
    init: init === null ? null : { tools: init.tools, agents: init.agents, skills: init.skills, plugins: init.plugins, mcp_servers: init.mcp_servers },
    beobachtung: laufakte?.beobachtung ?? null,
    faehigkeiten_im_lauf: laufakte?.faehigkeiten_im_lauf ?? null,
    workflow_status: ladeArtefaktVersion(`workflow-${workflowId}`, undefined, ladeOptionen)?.daten?.status ?? null,
    permission_denials: result?.permission_denials ?? null,
    ergebnistext: result?.result ?? null,
  }
  writeFileSync(join(HIER, `zaehlung-${name}.json`), `${JSON.stringify(zaehlung, null, 2)}\n`)
  console.log(`\n=== ${name} ===\n${JSON.stringify({ lauf_id: laufId, faehigkeiten_im_lauf: zaehlung.faehigkeiten_im_lauf, ergebnistext: zaehlung.ergebnistext }, null, 2)}`)
  return zaehlung
}

const BITTE = (mitQa) =>
  [
    'Testlauf ohne Codeänderung. Führe diese Schritte nacheinander aus, ohne Rückfrage. Wird ein Schritt abgelehnt oder ist ein Werkzeug nicht verfügbar, notiere es und mache weiter; ändere keine Dateien.',
    '1. Lade den Skill "frontend-design" über das Skill-Werkzeug; führe ihn nicht weiter aus.',
    `2. Öffne mit dem Playwright-MCP (browser_navigate) die Projekt-URL ${vorschauUrl} und nenne den Seitentitel.`,
    `3. Frage den Subagenten "qa" über das Agent-Werkzeug (run_in_background: false): "Antworte nur mit OK-QA".${mitQa ? '' : ' Ist er nicht verfügbar, nenne die Fehlermeldung wörtlich.'}`,
    '4. Antworte mit einer Zeile je Schritt: Ergebnis oder Fehlermeldung wörtlich.',
  ].join('\n')

try {
  // L1: Schalter wie in der Oberfläche — qa ein; MCP und Skill bleiben an (Standard).
  const status0 = await holen('/api/faehigkeiten')
  ablauf.schritte.push({ schritt: 'vorher', eintraege: status0.eintraege.filter((e) => e.installiert).map((e) => ({ id: e.id, aktiv: e.aktiv, eingeschaltet: e.eingeschaltet })) })
  const ein = await senden('/api/faehigkeiten/aktivierung', { eintrag: 'agent:qa', aktiv: true })
  ablauf.schritte.push({ schritt: 'qa einschalten', status: ein.status, antwort: ein.koerper })
  const l1 = await lauf('l1-alle-an', BITTE(true))
  const status1 = await holen('/api/faehigkeiten')
  ablauf.schritte.push({ schritt: 'nach L1', letzter_lauf_id: status1.letzter_lauf_id, eintraege: status1.eintraege.filter((e) => ['playwright-mcp', 'frontend-design', 'agent:qa'].includes(e.id)).map((e) => ({ id: e.id, aktiv: e.aktiv, letzter_lauf: e.letzter_lauf })) })
  // L2: qa aus → nächster Lauf: nicht verfügbar.
  const aus = await senden('/api/faehigkeiten/aktivierung', { eintrag: 'agent:qa', aktiv: false })
  ablauf.schritte.push({ schritt: 'qa ausschalten', status: aus.status, antwort: aus.koerper })
  const l2 = await lauf('l2-qa-aus', BITTE(false))
  const status2 = await holen('/api/faehigkeiten')
  ablauf.schritte.push({ schritt: 'nach L2', letzter_lauf_id: status2.letzter_lauf_id, eintraege: status2.eintraege.filter((e) => ['playwright-mcp', 'frontend-design', 'agent:qa'].includes(e.id)).map((e) => ({ id: e.id, aktiv: e.aktiv, letzter_lauf: e.letzter_lauf })) })
  ablauf.laeufe = { l1: l1.lauf_id, l2: l2.lauf_id }
  writeFileSync(join(HIER, 'ablauf.json'), `${JSON.stringify(ablauf, null, 2)}\n`)
} catch (fehler) {
  console.error('Beleg 13 abgebrochen:', fehler)
  process.exitCode = 1
}

if (process.argv.includes('--ohne-halten')) {
  leitstand.close()
  vorschau.close()
} else {
  console.log(`\nServer bleibt für den Render-Nachweis offen: ${basis}/#/capabilities  (beenden mit Strg+C)`)
}
