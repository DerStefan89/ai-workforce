#!/usr/bin/env node
/**
 * Datei: scripts/check-fixpaket-f36-nachlauf.mjs
 *
 * Zweck: Gate für das Fixpaket PR 1 nach F36 (state/findings.md F-764, F-827, F-768).
 *
 * (a) F-764, Unit: baueBashAllowlistSatz nennt die neuen Regeln (kein cd, ein Befehl, keine
 *     Verkettung/Umleitung/Hintergrund, Prüfskripte nur über npm run check, keine Server, git
 *     unnötig, Read/Glob/Grep statt Shell); baueUmsetzungsInstruktion('feature', true) hängt genau
 *     diesen Satz an. Rotfall: ohne Bash-Regel bleibt die Instruktion bitgenau wie auf main
 *     (sha256 festgeschrieben) und trägt keinen Shell-Satz.
 * (b) F-827, Unit: die Empfehlungszeile nennt die vorschau_url nur mit einem {projekt_origins}-Eintrag
 *     UND einer URL; sonst bitgenau wie vorher. Der reale Startpfad steht in
 *     scripts/check-f36-ws5a-installation.mjs (h).
 * (c) F-768, Anzeige: istSichtungsHaltAnzeige (public/leitstand/sichtung-anzeige.js) und
 *     ermittleSichtungsHalt (Server) stimmen auf Fixtures überein; Zusatzgründe, anderer Status,
 *     Schritt ohne nachfolger, Folgeschritt schon gelaufen → kein Knopf.
 * (d) F-768, HTTP (echter F-760-Halt über POST .../starten): „Sichtung bestätigt – weiter“ über
 *     POST /api/workflows schreibt die Kenntnisnahme 'entscheidung-<laufId>' (art 'kenntnisnahme',
 *     ergebnis VERWEIGERT, Begründung) und eine Fassung mit Cursor auf dem Folgeschritt; der
 *     VERWEIGERT-Schritt und die Terminalmarke bleiben unverändert; 'sichtung_bestaetigt' und
 *     'begruendung' stehen nicht in der gespeicherten Fassung. Zweiter Versuch (Fassung weitergerückt)
 *     → 409 ohne neue Kenntnisnahme. Danach startet POST .../starten den Folgeschritt wirklich (202,
 *     lauf_id gesetzt).
 * (e) F-768, Rotfälle: ohne Begründung → 400; sichtung_bestaetigt ≠ true → 400; VERWEIGERT-Schritt
 *     zurückgesetzt, Freigabe am Folgeschritt abgeschwächt oder ziel geändert → 400; Zusatzgrund am
 *     Halt → 409; Bypass-Verdacht > 0 in der Klassifikation (kein F-760-Halt) → 409; Bypass-Verdacht
 *     > 0 nur in der Terminalmarke → 409; Terminalmarke ohne bypass_verdacht_anzahl → 409; eine
 *     Entscheidung anderer Art zum Lauf → 409. Jeweils nichts geschrieben.
 * (f) F-768, Wiederholung nach Teilfehler: liegt schon eine Kenntnisnahme, wird sie nicht doppelt
 *     geschrieben, nur die Fassung (kenntnisnahme.neu === false).
 *
 * Wichtig: Der sha256 in (a) pinnt die Instruktion ohne Bash-Regel auf den Stand vor F-764
 * (origin/main 1255df1). Ändert sich diese Instruktion gewollt, den Wert bewusst neu setzen und
 * den Grund im Commit nennen — nie einfach übernehmen.
 *
 * Wird aufgerufen von: `npm run check`.
 *
 * Aufruf: node scripts/check-fixpaket-f36-nachlauf.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { execFileSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { baueBashAllowlistSatz, baueUmsetzungsInstruktion } from '../src/architekt/index.ts'
import { schreibeWirkungsmarke, stelleLaufstatusFest } from '../src/checkpoint-store/index.ts'
import { ladeArtefaktVersion, registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { baueEmpfehlungsZeile } from '../src/ressourcen/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { registriereWorkflow } from '../src/workflow/index.ts'
import { baueSichtungsFassung, istSichtungsHaltAnzeige } from '../public/leitstand/sichtung-anzeige.js'
import { erzeugeRequestHandler, ermittleSichtungsHalt } from './leitstand-server.mjs'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []
console.log('\n=== Fixpaket-F36-Nachlauf-Check ===\n')

const STILL = () => {}

// ─── (a) F-764: Shell-Satz ─────────────────────────────────────────────────────
{
  const vor = befunde.length
  const satz = baueBashAllowlistSatz()
  const fragmente = [
    'Shell: Du darfst ausschließlich diese Befehle ausführen',
    'npm run check|lint|typecheck|test|build',
    "kein 'cd'",
    "auch deren Unterskripte wie 'npm run check:<name>'",
    'gehen Anweisungen der Projekt-CLAUDE.md vor',
    'genau ein Befehl je Aufruf',
    'keine Verkettung (&&, ;, |, Zeilenumbruch)',
    'keine Umleitung',
    'run_in_background',
    "nie direkt per 'node'",
    "'npm run dev'",
    'Keine git-Befehle: die Änderungen erhebt die Workforce nach dem Lauf',
    'Read, Glob und Grep statt über die Shell',
    'macht den Lauf zu VERWEIGERT',
  ]
  for (const teil of fragmente) if (!satz.includes(teil)) befunde.push(`(a) Shell-Satz: Fragment ${JSON.stringify(teil)} fehlt`)
  const mit = baueUmsetzungsInstruktion('feature', true)
  const ohne = baueUmsetzungsInstruktion('feature', false)
  if (JSON.stringify(mit) !== JSON.stringify([...ohne, satz])) befunde.push("(a) baueUmsetzungsInstruktion('feature', true) ist nicht genau die Fassung ohne Bash-Regel plus der Shell-Satz")
  // Rotfall: ohne Bash-Regel bitgenau wie origin/main 1255df1 (vor diesem Fix gemessen).
  const hash = createHash('sha256').update(ohne.join('\n')).digest('hex')
  if (hash !== '91afbab0be970b7c6abbd93fe69df36cfc658f37bef7cc1d7a23b400d23fc2f8') befunde.push(`(a) Instruktion ohne Bash-Regel weicht vom Stand vor F-764 ab (sha256 ${hash})`)
  if (ohne.join('\n').includes('Shell:')) befunde.push('(a) Instruktion ohne Bash-Regel trägt einen Shell-Satz')
  if (befunde.length === vor) console.log('✓ (a) F-764: der Shell-Satz nennt cd, Verkettung, Umleitung, Hintergrund, node-Direktaufrufe, Server, git und Read/Glob/Grep; ohne Bash-Regel bitgenau wie vorher.')
}

// ─── (b) F-827: Vorschau in der Empfehlungszeile ───────────────────────────────
{
  const vor = befunde.length
  const eintrag = [{ id: 'pw', name: 'PW', typ: 'extern', unterart: 'mcp', grund: 'g' }]
  const basis = 'Freigegebene Katalog-Fähigkeiten in diesem Lauf: pw (PW) — nutzen, wo sie passen.'
  const ressource = (args) => ({ id: 'pw', installation: { mcp_server: { command: 'node', args } } })
  const mitOrigins = ressource(['s.js', '--allowed-origins', '{projekt_origins}'])
  const url = 'http://localhost:5173'
  const erwartet = `${basis} Projekt-Vorschau: ${url} läuft bereits, zum Prüfen browser_navigate darauf nutzen, nicht selbst starten; keine file://-URLs.`
  if (baueEmpfehlungsZeile(eintrag, url, [mitOrigins]) !== erwartet) befunde.push(`(b) mit {projekt_origins} und URL: ${JSON.stringify(baueEmpfehlungsZeile(eintrag, url, [mitOrigins]))}`)
  if (baueEmpfehlungsZeile(eintrag, null, [mitOrigins]) !== basis) befunde.push('(b) Rotfall ohne vorschau_url: Zeile nicht bitgenau')
  if (baueEmpfehlungsZeile(eintrag, url, [ressource(['s.js'])]) !== basis) befunde.push('(b) Rotfall ohne {projekt_origins}: Zeile nicht bitgenau')
  if (baueEmpfehlungsZeile(eintrag) !== basis) befunde.push('(b) Aufruf ohne neue Argumente: Zeile nicht bitgenau')
  if (befunde.length === vor) console.log('✓ (b) F-827: vorschau_url nur mit {projekt_origins}-Eintrag und URL in der Zeile; sonst bitgenau.')
}

// ─── (c) F-768: Anzeige-Zwilling = Server ──────────────────────────────────────
const LAUF = 'lauf-gate-1'
/** Workflow-Fixture am Halt; grund wie der Server ihn baut. */
function haltDaten(ueberschreiben = {}) {
  return {
    status: 'KLAERUNG_ERFORDERLICH',
    aktiver_schritt_id: 's1',
    grund: `Lauf endete VERWEIGERT (ohne Bypass-Verdacht). Abgelehnte Befehle: Bash: git status | head — menschliche Sichtung vor Fortsetzung (F-760, Schritt 's1', Lauf '${LAUF}')`,
    schritte: [
      { schritt_id: 's1', rolle: 'ausfuehrung', status: 'VERWEIGERT', lauf_id: LAUF, nachfolger: 's2' },
      { schritt_id: 's2', rolle: 'architecture-advisor', status: 'OFFEN', lauf_id: null, nachfolger: null },
    ],
    ...ueberschreiben,
  }
}
{
  const vor = befunde.length
  const gruen = haltDaten()
  const faelle = [
    ['Zusatzgrund', haltDaten({ grund: `${gruen.grund} | Prüfkette durch den Lauf verändert: package.json (F-713)` })],
    ['anderer Status', haltDaten({ status: 'GESTOPPT' })],
    ['Regel-1-Text (Bypass-Verdacht)', haltDaten({ grund: "Schritt 's1' endete VERWEIGERT" })],
    ['ohne nachfolger', haltDaten({ schritte: [{ ...gruen.schritte[0], nachfolger: null }] })],
    ['Schritt ERFOLGREICH', haltDaten({ schritte: [{ ...gruen.schritte[0], status: 'ERFOLGREICH' }, gruen.schritte[1]] })],
    ['Folgeschritt schon gelaufen', haltDaten({ schritte: [gruen.schritte[0], { ...gruen.schritte[1], status: 'ERFOLGREICH', lauf_id: 'lauf-gate-2' }] })],
  ]
  const client = istSichtungsHaltAnzeige(gruen)
  const server = ermittleSichtungsHalt(gruen)
  if (client?.laufId !== LAUF || client?.nachfolger !== 's2' || server?.laufId !== LAUF) befunde.push(`(c) reiner F-760-Halt nicht erkannt: client ${JSON.stringify(client)}, server ${JSON.stringify(server?.laufId)}`)
  for (const [name, daten] of faelle) {
    if (istSichtungsHaltAnzeige(daten) !== null) befunde.push(`(c) Anzeige bietet den Knopf trotz ${name}`)
    if (ermittleSichtungsHalt(daten) !== null) befunde.push(`(c) Server erkennt einen Sichtungs-Halt trotz ${name}`)
  }
  const fassung = baueSichtungsFassung(gruen, client ?? { nachfolger: 's2' })
  if (fassung.aktiver_schritt_id !== 's2' || fassung.status !== 'OFFEN' || JSON.stringify(fassung.schritte) !== JSON.stringify(gruen.schritte)) befunde.push(`(c) Sichtungsfassung falsch: ${JSON.stringify(fassung)}`)
  if (befunde.length === vor) console.log('✓ (c) F-768: Anzeige und Server erkennen nur den reinen F-760-Halt (Zusatzgrund, anderer Status, Regel-1-Text, ohne nachfolger, Folgeschritt gelaufen → kein Knopf); die Fassung setzt nur Cursor/status.')
}

// ─── (d)–(f) F-768 über HTTP ───────────────────────────────────────────────────

/**
 * Frische Umgebung: Wegwerf-Repo, Startvorlage, Server. Der Attrappen-Starter beendet den ersten
 * Schritt VERWEIGERT (Rohstrom mit Denial, Laufakte, echte Wirkungsmarken) — bypass je Option.
 * @param o - { bypassKlassifikation, bypassMarke, markeOhneDaten }
 */
async function umgebung(o = {}) {
  const basisVerzeichnis = `kontrollzustand-test-fixpaket-f36-nachlauf-${randomUUID()}`
  const repoWurzel = mkdtempSync(join(tmpdir(), 'fixpaket-f36-nachlauf-repo-'))
  const vorlagenOrdner = mkdtempSync(join(tmpdir(), 'fixpaket-f36-nachlauf-vorlage-'))
  const git = (argumente) => execFileSync('git', argumente, { cwd: repoWurzel, encoding: 'utf8' })
  git(['init', '--quiet', '-b', 'wegwerf-branch'])
  git(['config', 'user.email', 'gate@example.invalid'])
  git(['config', 'user.name', 'Gate'])
  git(['config', 'core.autocrlf', 'false'])
  writeFileSync(join(repoWurzel, 'package.json'), `${JSON.stringify({ name: 'fremd', scripts: { check: 'node -e 0' } }, null, 2)}\n`)
  git(['add', '-A'])
  git(['commit', '--quiet', '-m', 'init'])
  const startvorlagePfad = join(vorlagenOrdner, 'startvorlage.json')
  writeFileSync(startvorlagePfad, JSON.stringify({ ...ladeStartvorlage('startvorlagen/ai-workforce.json'), pruefbefehl: [process.execPath, '-e', '0'] }, null, 2))
  const profilReferenz = leiteProfilReferenzAb(ladeStartvorlage(startvorlagePfad))
  const ladeOptionen = { basisVerzeichnis, schreiber: STILL }
  let aufrufe = 0
  const fuehreAufgabeDurchFn = async (laufId) => {
    aufrufe++
    // Nur der erste Lauf (Ausführung) endet VERWEIGERT; der Folgeschritt nach der Sichtung ERFOLGREICH.
    if (aufrufe > 1) return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
    const rohstromPfad = join(basisVerzeichnis, `${laufId}-rohstrom.json`)
    writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: 'GATE', permission_denials: [{ tool_name: 'Bash', tool_input: { command: 'git status' } }] }) }))
    registriereKernArtefakt(`laufakte-${laufId}`, profilReferenz, { erzeuger: 'kern', schritt: 'gate-fixture' }, { laufakte_schema: 'v0', lauf_id: laufId, worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad } }, [], ladeOptionen)
    schreibeWirkungsmarke(laufId, profilReferenz, 'run_prepared', {}, ladeOptionen)
    schreibeWirkungsmarke(laufId, profilReferenz, 'terminal', o.markeOhneDaten === true ? { ergebnis: 'VERWEIGERT' } : { ergebnis: 'VERWEIGERT', daten: { bypass_verdacht_anzahl: o.bypassMarke ?? 0 } }, ladeOptionen)
    return { ok: true, klassifikation: { ergebnis: 'VERWEIGERT', bypass_verdacht_anzahl: o.bypassKlassifikation ?? 0 }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'VERWEIGERT' } }
  }
  const server = createServer(erzeugeRequestHandler({ basisVerzeichnis, fuehreAufgabeDurchFn, repoWurzel, installWurzel: process.cwd(), startvorlagePfad }))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const basisUrl = `http://127.0.0.1:${server.address().port}`
  const post = async (pfad, body) => {
    const antwort = await fetch(`${basisUrl}${pfad}`, { method: 'POST', body: JSON.stringify(body) })
    return { status: antwort.status, inhalt: await antwort.json().catch(() => ({})) }
  }
  return {
    ladeOptionen,
    profilReferenz,
    post,
    async ende() {
      await new Promise((resolve) => server.close(resolve))
      for (const pfad of [basisVerzeichnis, repoWurzel, vorlagenOrdner]) raeumeVerzeichnis(pfad)
    },
  }
}

/**
 * Legt Auftrag und Workflow (ausfuehrung → architecture-advisor) an, startet den ersten Schritt und
 * wartet auf den Halt.
 * @returns { workflowId, daten, laufId }
 */
async function amHalt(u) {
  const auftrag = await u.post('/api/auftraege', { titel: 'F36-Nachlauf-Gate', auftragstext: 'GATE-F768' })
  if (auftrag.status !== 201) throw new Error(`POST /api/auftraege erwartet 201, erhalten ${auftrag.status}`)
  const workflowId = `fixpaket-f36-nachlauf-${randomUUID()}`
  // schreibend verlangt ZWINGEND (F-734); die Freigabe gilt als erteilt, damit der Start sofort läuft.
  const schritt = (id, rolle, werkzeugsatz, nachfolger, eingaben) => ({
    schritt_id: id,
    rolle,
    werkzeugsatz,
    worker: 'claude-code',
    modell: 'claude-sonnet-5',
    eingaben,
    output_schema: null,
    ...(werkzeugsatz === 'schreibend' ? { freigabe: 'ZWINGEND', freigabe_erteilt: true } : { freigabe: 'AUTOMATISCH' }),
    risiko: 'Gate-Fixture.',
    zeitgrenze_ms: 600000,
    nachfolger,
    status: 'OFFEN',
    lauf_id: null,
  })
  registriereWorkflow(
    {
      workflow_schema: 'v0',
      workflow_id: workflowId,
      auftrag_id: auftrag.inhalt.auftragId,
      version: 1,
      ziel: 'F-768 Gate-Fixture.',
      status: 'OFFEN',
      aktiver_schritt_id: 's1-ausfuehrung',
      grund: null,
      grenzen: { max_schritte: 4, max_replans: 1 },
      schritte: [
        schritt('s1-ausfuehrung', 'ausfuehrung', 'schreibend', 's2-review', []),
        schritt('s2-review', 'architecture-advisor', 'lesend', null, ['artefakt:aenderungsuebersicht-@s1-ausfuehrung']),
      ],
    },
    u.profilReferenz,
    u.ladeOptionen
  )
  const start = await u.post(`/api/workflows/${encodeURIComponent(workflowId)}/starten`, {})
  if (start.status !== 202) throw new Error(`POST .../starten erwartet 202, erhalten ${start.status} (${start.inhalt.grund})`)
  const laden = () => ladeArtefaktVersion(`workflow-${workflowId}`, undefined, u.ladeOptionen)
  const beginn = Date.now()
  while (Date.now() - beginn < 10000 && ['OFFEN', 'LAEUFT'].includes(laden()?.daten?.status)) await new Promise((resolve) => setTimeout(resolve, 50))
  const version = laden()
  const laufId = version?.daten?.schritte?.[0]?.lauf_id
  if (version?.daten?.status !== 'KLAERUNG_ERFORDERLICH' || typeof laufId !== 'string') throw new Error(`kein Halt erreicht: ${JSON.stringify(version?.daten?.status)}`)
  return { workflowId, daten: version.daten, versionSequenz: version.versionSequenz, laufId }
}

/** Sichtungs-Body aus der aktuellen Fassung. */
function sichtungsBody(daten, felder = { sichtung_bestaetigt: true, begruendung: 'Nur Probebefehle, gesichtet.' }) {
  const sichtung = istSichtungsHaltAnzeige(daten) ?? { nachfolger: daten.schritte[0].nachfolger }
  return { ...baueSichtungsFassung(daten, sichtung), ...felder }
}

/** Prüft, dass weder Kenntnisnahme noch neue Fassung entstanden sind. */
function nichtsGeschrieben(fall, u, halt) {
  if (ladeArtefaktVersion(`entscheidung-${halt.laufId}`, undefined, u.ladeOptionen) !== null) befunde.push(`${fall}: Kenntnisnahme trotz Ablehnung geschrieben`)
  const jetzt = ladeArtefaktVersion(`workflow-${halt.workflowId}`, undefined, u.ladeOptionen)
  if (jetzt?.versionSequenz !== halt.versionSequenz) befunde.push(`${fall}: neue Fassung trotz Ablehnung geschrieben`)
}

// (d) Grünfall + zweiter Versuch
{
  const vor = befunde.length
  const u = await umgebung()
  try {
    const halt = await amHalt(u)
    if (istSichtungsHaltAnzeige(halt.daten) === null) befunde.push(`(d) realer F-760-Halt wird nicht als Sichtungs-Halt erkannt (grund ${JSON.stringify(halt.daten.grund)})`)
    const antwort = await u.post('/api/workflows', sichtungsBody(halt.daten))
    if (antwort.status !== 201 || antwort.inhalt.kenntnisnahme?.neu !== true) befunde.push(`(d) erwartet 201 mit neuer Kenntnisnahme, erhalten ${antwort.status} ${JSON.stringify(antwort.inhalt)}`)
    const entscheidung = ladeArtefaktVersion(`entscheidung-${halt.laufId}`, undefined, u.ladeOptionen)
    const e = entscheidung?.daten
    if (e?.art !== 'kenntnisnahme' || e.ergebnis !== 'VERWEIGERT' || e.begruendung !== 'Nur Probebefehle, gesichtet.') befunde.push(`(d) Kenntnisnahme falsch: ${JSON.stringify(e)}`)
    const neu = ladeArtefaktVersion(`workflow-${halt.workflowId}`, undefined, u.ladeOptionen)?.daten
    const s1 = neu?.schritte?.[0]
    if (neu?.aktiver_schritt_id !== 's2-review' || neu.status !== 'OFFEN' || s1?.status !== 'VERWEIGERT' || s1.lauf_id !== halt.laufId) befunde.push(`(d) Fassung falsch: ${JSON.stringify({ cursor: neu?.aktiver_schritt_id, status: neu?.status, s1 })}`)
    if (neu !== undefined && ('sichtung_bestaetigt' in neu || 'begruendung' in neu)) befunde.push('(d) Transportfeld steht in der gespeicherten Fassung')
    const lauf = stelleLaufstatusFest(halt.laufId, u.ladeOptionen)
    if (lauf.status !== 'ABGESCHLOSSEN' || lauf.ergebnis !== 'VERWEIGERT') befunde.push(`(d) Terminalmarke verändert: ${JSON.stringify(lauf)}`)
    const nochmal = await u.post('/api/workflows', sichtungsBody(halt.daten))
    if (nochmal.status !== 409) befunde.push(`(d) zweiter Versuch nach weitergerückter Fassung: erwartet 409, erhalten ${nochmal.status}`)
    if (ladeArtefaktVersion(`entscheidung-${halt.laufId}`, undefined, u.ladeOptionen)?.versionSequenz !== entscheidung?.versionSequenz) befunde.push('(d) zweiter Versuch schrieb eine weitere Kenntnisnahme')
    // „weiter“ wirklich belegt: der Folgeschritt startet nach der Sichtung.
    const start = await u.post(`/api/workflows/${encodeURIComponent(halt.workflowId)}/starten`, {})
    if (start.status !== 202) {
      befunde.push(`(d) POST .../starten nach der Sichtung: erwartet 202, erhalten ${start.status} (${start.inhalt.grund})`)
    } else {
      const laden = () => ladeArtefaktVersion(`workflow-${halt.workflowId}`, undefined, u.ladeOptionen)?.daten
      const beginn = Date.now()
      while (Date.now() - beginn < 10000 && typeof laden()?.schritte?.[1]?.lauf_id !== 'string') await new Promise((resolve) => setTimeout(resolve, 50))
      const s2 = laden()?.schritte?.[1]
      if (typeof s2?.lauf_id !== 'string') befunde.push(`(d) Folgeschritt nach der Sichtung nicht gestartet: ${JSON.stringify(s2)}`)
      if (laden()?.schritte?.[0]?.status !== 'VERWEIGERT') befunde.push('(d) VERWEIGERT-Schritt nach dem Folgestart verändert')
    }
  } catch (fehler) {
    befunde.push(`(d) Vorbereitung gescheitert: ${fehler.message}`)
  } finally {
    await u.ende()
  }
  if (befunde.length === vor) console.log("✓ (d) F-768: Sichtung am echten F-760-Halt → Kenntnisnahme (VERWEIGERT, Begründung) + Fassung mit Cursor auf dem Folgeschritt; Schritt und Terminalmarke bleiben VERWEIGERT, kein Transportfeld gespeichert; zweiter Versuch 409; danach startet der Folgeschritt.")
}

// (e) Rotfälle
{
  const vor = befunde.length
  const u = await umgebung()
  try {
    const halt = await amHalt(u)
    const ohneBegruendung = await u.post('/api/workflows', sichtungsBody(halt.daten, { sichtung_bestaetigt: true, begruendung: '  ' }))
    if (ohneBegruendung.status !== 400) befunde.push(`(e) ohne Begründung: erwartet 400, erhalten ${ohneBegruendung.status}`)
    const falschesFlag = await u.post('/api/workflows', sichtungsBody(halt.daten, { sichtung_bestaetigt: 'ja', begruendung: 'x' }))
    if (falschesFlag.status !== 400) befunde.push(`(e) sichtung_bestaetigt 'ja': erwartet 400, erhalten ${falschesFlag.status}`)
    const manipuliert = sichtungsBody(halt.daten)
    manipuliert.schritte = manipuliert.schritte.map((s, i) => (i === 0 ? { ...s, status: 'OFFEN', lauf_id: null } : s))
    const antwortManipuliert = await u.post('/api/workflows', manipuliert)
    if (antwortManipuliert.status !== 400) befunde.push(`(e) VERWEIGERT-Schritt zurückgesetzt: erwartet 400, erhalten ${antwortManipuliert.status}`)
    // Der Sichtungsweg nimmt keine weitere Planänderung mit (Reviewer-/QA-Befund).
    const anderesZiel = { ...sichtungsBody(halt.daten), ziel: 'Heimlich geändert.' }
    const antwortZiel = await u.post('/api/workflows', anderesZiel)
    if (antwortZiel.status !== 400) befunde.push(`(e) geändertes ziel: erwartet 400, erhalten ${antwortZiel.status}`)
    const andereFreigabe = sichtungsBody(halt.daten)
    andereFreigabe.schritte = andereFreigabe.schritte.map((s, i) => (i === 1 ? { ...s, rolle: 'code-reviewer', freigabe: 'ZWINGEND' } : s))
    const antwortFreigabe = await u.post('/api/workflows', andereFreigabe)
    if (antwortFreigabe.status !== 400) befunde.push(`(e) geänderter Folgeschritt: erwartet 400, erhalten ${antwortFreigabe.status}`)
    nichtsGeschrieben('(e) Begründung/Flag/Fassung', u, halt)

    // Zusatzgrund am Halt: nur die Reparaturfassung, kein Sichtungsweg.
    const mitZusatz = { ...halt.daten, grund: `${halt.daten.grund} | Prüfkette durch den Lauf verändert: package.json (F-713)` }
    const zusatzVersion = registriereWorkflow(mitZusatz, u.profilReferenz, u.ladeOptionen)
    const zusatz = await u.post('/api/workflows', sichtungsBody(mitZusatz))
    if (zusatz.status !== 409 || !String(zusatz.inhalt.grund).includes('reinen F-760-Halt')) befunde.push(`(e) Zusatzgrund: erwartet 409 (kein reiner F-760-Halt), erhalten ${zusatz.status} (${zusatz.inhalt.grund})`)
    nichtsGeschrieben('(e) Zusatzgrund', u, { ...halt, versionSequenz: zusatzVersion.versionSequenz })
  } catch (fehler) {
    befunde.push(`(e) Vorbereitung gescheitert: ${fehler.message}`)
  } finally {
    await u.ende()
  }
  for (const [fall, o, grundTeil] of [
    ['(e) Bypass-Verdacht in der Klassifikation', { bypassKlassifikation: 1, bypassMarke: 1 }, 'reinen F-760-Halt'],
    ['(e) Bypass-Verdacht nur in der Terminalmarke', { bypassKlassifikation: 0, bypassMarke: 1 }, 'Bypass-Verdacht'],
    ['(e) Terminalmarke ohne bypass_verdacht_anzahl (unbekannt)', { bypassKlassifikation: 0, markeOhneDaten: true }, 'keinen belegten Bypass-Verdacht 0'],
  ]) {
    const w = await umgebung(o)
    try {
      const halt = await amHalt(w)
      const antwort = await w.post('/api/workflows', sichtungsBody(halt.daten))
      if (antwort.status !== 409 || !String(antwort.inhalt.grund).includes(grundTeil)) befunde.push(`${fall}: erwartet 409 mit '${grundTeil}', erhalten ${antwort.status} (${antwort.inhalt.grund})`)
      nichtsGeschrieben(fall, w, halt)
    } catch (fehler) {
      befunde.push(`${fall}: Vorbereitung gescheitert: ${fehler.message}`)
    } finally {
      await w.ende()
    }
  }
  // Eine Entscheidung anderer Art zum Lauf wird nicht überlagert.
  {
    const w = await umgebung()
    try {
      const halt = await amHalt(w)
      const terminal = registriereKernArtefakt(
        `entscheidung-${halt.laufId}`,
        w.profilReferenz,
        { erzeuger: 'mensch', schritt: 'entscheidung-terminal' },
        { entscheidung_schema: 'v0', art: 'terminal', ergebnis: 'VERWEIGERT', begruendung: 'Gate.', entschieden_am: new Date().toISOString() },
        [],
        w.ladeOptionen
      )
      const antwort = await w.post('/api/workflows', sichtungsBody(halt.daten))
      if (antwort.status !== 409 || !String(antwort.inhalt.grund).includes("der Art 'terminal'")) befunde.push(`(e) Entscheidung anderer Art: erwartet 409, erhalten ${antwort.status} (${antwort.inhalt.grund})`)
      if (ladeArtefaktVersion(`entscheidung-${halt.laufId}`, undefined, w.ladeOptionen)?.versionSequenz !== terminal.versionSequenz) befunde.push('(e) Entscheidung anderer Art wurde überlagert')
      if (ladeArtefaktVersion(`workflow-${halt.workflowId}`, undefined, w.ladeOptionen)?.versionSequenz !== halt.versionSequenz) befunde.push('(e) Entscheidung anderer Art: neue Fassung trotz Ablehnung geschrieben')
    } catch (fehler) {
      befunde.push(`(e) Entscheidung anderer Art: Vorbereitung gescheitert: ${fehler.message}`)
    } finally {
      await w.ende()
    }
  }
  if (befunde.length === vor) console.log('✓ (e) F-768 Rotfälle: ohne Begründung/falsches Flag/zurückgesetzter Schritt/geändertes ziel/geänderter Folgeschritt 400; Zusatzgrund, Bypass-Verdacht > 0 (Klassifikation oder Terminalmarke), unbekannter Bypass-Verdacht und Entscheidung anderer Art 409 — jeweils nichts geschrieben.')
}

// (f) Wiederholung nach Teilfehler
{
  const vor = befunde.length
  const u = await umgebung()
  try {
    const halt = await amHalt(u)
    const vorab = await u.post('/api/entscheidungen', { art: 'kenntnisnahme', laufId: halt.laufId, begruendung: 'Vorab gesichtet.' })
    if (vorab.status !== 200) throw new Error(`Kenntnisnahme vorab erwartet 200, erhalten ${vorab.status} (${vorab.inhalt.grund})`)
    const antwort = await u.post('/api/workflows', sichtungsBody(halt.daten))
    if (antwort.status !== 201 || antwort.inhalt.kenntnisnahme?.neu !== false) befunde.push(`(f) erwartet 201 ohne neue Kenntnisnahme, erhalten ${antwort.status} ${JSON.stringify(antwort.inhalt)}`)
    const e = ladeArtefaktVersion(`entscheidung-${halt.laufId}`, undefined, u.ladeOptionen)
    if (e?.versionSequenz !== vorab.inhalt.versionSequenz || e?.daten?.begruendung !== 'Vorab gesichtet.') befunde.push(`(f) Kenntnisnahme doppelt geschrieben: ${JSON.stringify({ v: e?.versionSequenz, b: e?.daten?.begruendung })}`)
    if (ladeArtefaktVersion(`workflow-${halt.workflowId}`, undefined, u.ladeOptionen)?.daten?.aktiver_schritt_id !== 's2-review') befunde.push('(f) Fassung nicht geschrieben')
  } catch (fehler) {
    befunde.push(`(f) Vorbereitung gescheitert: ${fehler.message}`)
  } finally {
    await u.ende()
  }
  if (befunde.length === vor) console.log('✓ (f) F-768: liegt die Kenntnisnahme schon vor, entsteht nur die Fassung (keine zweite Kenntnisnahme).')
}

if (befunde.length > 0) {
  console.error(`\n✗ ${befunde.length} Befund(e):`)
  for (const befund of befunde) console.error(`  - ${befund}`)
  process.exit(1)
}
console.log('\n✓ Fixpaket-F36-Nachlauf-Check sauber.\n')
