#!/usr/bin/env node
/**
 * Datei: scripts/check-f45-b2b3b2b2b2b1-projekt-cli.mjs
 *
 * Zweck: Gate für F45 B2b-3b-2b-2b-2b-1, Teil „Projekt-CLI-Abweichung als Warnung“ (F-1136 (10), Entscheidung Stefan = B):
 * weicht die installierte Claude-Code-Version von `werkzeugVersionDeklariert` der Startvorlage einer Projektinstanz ab,
 * startet der Projektlauf trotzdem — GET /api/zustand trägt dann `projektCliHinweis` in der Form des Workforce-Hinweises
 * ({ art: 'cliVersionGeaendert', installiert, deklariert, anleitung = Projektabschnitt der Anleitung }). Prüft über einen echten Handler (Arbeitsordner,
 * Attrappen-Worker, installierte Version per Handler-Option):
 * (p1) abweichende Version ⇒ Lauf startet (Ausführungsschritt erreicht den Worker), Hinweis vorhanden und vollständig;
 * (p2) gleiche Version ⇒ Lauf startet, kein Hinweis (null);
 * (p3) Version nicht ermittelbar (null) ⇒ Lauf startet, kein Hinweis (null);
 * (p4) Workforce-Instanz (istWorkforceInstanz) ⇒ projektCliHinweis null (dort gilt cliHinweis);
 * (q)  Quelltext: der Server fragt die installierte Version nur im CLI-Bindeblock ab (genau ein `ermittleCliHinweis(`, kein
 *      `frageCliVersion(`), erzeugt den Projekt-Hinweis genau einmal je Handler (nicht in der Route) und liefert ihn in
 *      GET /api/zustand; keine Sperre: `projektCliHinweis()` wird im Server genau einmal aufgerufen (dort).
 *
 * Wird aufgerufen von: `npm run check:gates` (und damit `npm run check`).
 *
 * Aufruf: node scripts/check-f45-b2b3b2b2b2b1-projekt-cli.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { registriereWorkflow } from '../src/workflow/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'
import { ANLEITUNG_PROJEKT_STARTFREIGABE } from './leitstand/cli-version.mjs'
import { erzeugeRequestHandler } from './leitstand-server.mjs'
import { schalteGitWartungAb } from './_wegwerf.ts'

const befunde = []
console.log('\n=== F45-B2b-3b-2b-2b-2b-1-Projekt-CLI-Check ===\n')

const aufraeumen = []
const dienste = []

/**
 * Meldet einen Fall: ✓ bei erfüllter Bedingung, sonst ein Befund.
 * @param bedingung - erfüllt?
 * @param ok - Text bei Erfolg
 * @param fehler - Befundtext
 */
function pruefe(bedingung, ok, fehler) {
  if (bedingung) console.log(`  ✓ ${ok}`)
  else befunde.push(fehler)
}

const verzoegerung = (ms) => new Promise((r) => setTimeout(r, ms))
/**
 * Wartet, bis `pruefen` einen wahren Wert liefert, höchstens maxMs.
 * @param pruefen - (asynchrone) Prüffunktion
 * @param maxMs - Zeitgrenze
 * @returns letzter Wert von pruefen
 */
async function warteBis(pruefen, maxMs = 15000) {
  const ende = Date.now() + maxMs
  let wert = await pruefen()
  while (!wert && Date.now() < ende) {
    await verzoegerung(25)
    wert = await pruefen()
  }
  return wert
}
const git = (cwd, argumente) => execFileSync('git', argumente, { cwd, encoding: 'utf8' })

/**
 * Wegwerf-Projekt (Branch 'arbeit') und Projekt-Startvorlage mit gegebener deklarierter CLI-Version (Muster Gate b2b3b2b2a).
 * @param kennung - Teil des Ordnernamens
 * @param deklariert - werkzeugVersionDeklariert der Projekt-Startvorlage
 */
function baueUmgebung(kennung, deklariert) {
  const basis = join(tmpdir(), `f45-b2b3b2b2b2b1-${kennung}-${randomUUID().slice(0, 8)}`)
  aufraeumen.push(basis)
  const repoWurzel = join(basis, 'projekt')
  mkdirSync(join(repoWurzel, '.claude'), { recursive: true })
  git(repoWurzel, ['init', '--quiet'])
  schalteGitWartungAb(repoWurzel)
  git(repoWurzel, ['config', 'user.email', 'test@example.invalid'])
  git(repoWurzel, ['config', 'user.name', 'Test'])
  git(repoWurzel, ['config', 'core.autocrlf', 'false'])
  git(repoWurzel, ['checkout', '--quiet', '-b', 'arbeit'])
  writeFileSync(join(repoWurzel, '.claude', 'settings.json'), '{}\n')
  writeFileSync(join(repoWurzel, 'README.md'), 'Zeile 1\n')
  git(repoWurzel, ['add', '.'])
  git(repoWurzel, ['commit', '--quiet', '-m', 'init'])
  const vorlage = ladeStartvorlage('startvorlagen/beispielprojekt.json')
  const startvorlagePfad = join(basis, 'startvorlage.json')
  writeFileSync(startvorlagePfad, JSON.stringify({ ...vorlage, werkzeugVersionDeklariert: deklariert }, null, 2))
  return { basis, repoWurzel, startvorlagePfad, basisVerzeichnis: join(basis, 'kontrollzustand'), vorlage: ladeStartvorlage(startvorlagePfad) }
}

/**
 * Server mit Attrappen-Worker als Projektinstanz (nicht Workforce, Arbeitsordner an) und gegebener installierter Version.
 * @param u - Umgebung aus baueUmgebung
 * @param installiert - installierte Version (string) oder null (nicht ermittelbar)
 * @param zusatz - weitere Handler-Optionen (p4: istWorkforceInstanz)
 */
async function starteServer(u, installiert, zusatz = {}) {
  const aufrufe = []
  const profilReferenz = leiteProfilReferenzAb(u.vorlage)
  async function attrappe(laufId, profil, eingaben) {
    aufrufe.push({ rolle: eingaben.rolle })
    const rohstromPfad = join(u.basis, `rohstrom-${laufId}.json`)
    writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: 'Fertig.' }) }))
    registriereKernArtefakt(`laufakte-${laufId}`, profil ?? profilReferenz, { erzeuger: 'check-f45-b2b3b2b2b2b1' }, { worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad, inhalts_hash: 'x' } }, [], { basisVerzeichnis: u.basisVerzeichnis, schreiber: () => {} })
    return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH', bypass_verdacht_anzahl: 0 }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
  }
  const handler = erzeugeRequestHandler({
    basisVerzeichnis: u.basisVerzeichnis,
    repoWurzel: u.repoWurzel,
    startvorlagePfad: u.startvorlagePfad,
    installWurzel: process.cwd(),
    fuehreAufgabeDurchFn: attrappe,
    arbeitsordner: true,
    arbeitsordnerNpm: async () => ({ code: 0, stdout: '', stderr: '', zeitueberschritten: false }),
    arbeitsordnerE183: () => ({ ok: true }),
    standCacheMs: 0,
    installierteCliVersion: installiert,
    ...zusatz,
  })
  const dienst = createServer((req, res) => handler(req, res))
  await new Promise((r) => dienst.listen(0, '127.0.0.1', r))
  dienste.push(dienst)
  return { basisUrl: `http://127.0.0.1:${dienst.address().port}`, aufrufe }
}

const SCHRITT = { schritt_id: 'schritt-1-ausfuehrung', rolle: 'ausfuehrung', werkzeugsatz: 'schreibend', worker: 'claude-code', modell: 'claude-sonnet-5', eingaben: [], output_schema: null, freigabe: 'ZWINGEND', freigabe_erteilt: true, risiko: 'Gate-Fixture.', zeitgrenze_ms: 600000, nachfolger: null, status: 'OFFEN', lauf_id: null }

/**
 * Auftrag + Workflow mit einem Ausführungsschritt, Start (mit Arbeitsordner-Vorbereitung).
 * @param u - Umgebung aus baueUmgebung
 * @param s - Server aus starteServer
 * @param kennung - Teil von Titel und Workflow-id
 * @returns Aufruf der Attrappe für die Rolle 'ausfuehrung' oder undefined (Lauf nicht gestartet)
 */
async function starteAusfuehrung(u, s, kennung) {
  const { auftragId } = await (await fetch(`${s.basisUrl}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel: `Gate ${kennung}`, auftragstext: 'Lege eine Datei an.' }) })).json()
  const workflowId = `f45-b2b3b2b2b2b1-${kennung}-${randomUUID()}`
  registriereWorkflow(
    { workflow_schema: 'v0', workflow_id: workflowId, auftrag_id: auftragId, version: 1, ziel: `Gate ${kennung}.`, status: 'OFFEN', aktiver_schritt_id: SCHRITT.schritt_id, grenzen: { max_schritte: 6, max_replans: 1 }, schritte: [SCHRITT] },
    leiteProfilReferenzAb(u.vorlage),
    { basisVerzeichnis: u.basisVerzeichnis, schreiber: () => {} }
  )
  const koerper = await (await fetch(`${s.basisUrl}/api/workflows/${workflowId}/starten`, { method: 'POST' })).json()
  if (koerper.vorbereitung === true) {
    await warteBis(async () => (await (await fetch(`${s.basisUrl}/api/workflows/${workflowId}`)).json()).arbeitsordner?.status === 'BEREIT')
    await fetch(`${s.basisUrl}/api/workflows/${workflowId}/starten`, { method: 'POST' })
  }
  return warteBis(() => s.aufrufe.find((a) => a.rolle === 'ausfuehrung'))
}

const DEKLARIERT = '2.1.296 (Claude Code)'

try {
  for (const [fall, installiert, erwartet] of [
    ['p1', '2.1.300 (Claude Code)', { art: 'cliVersionGeaendert', installiert: '2.1.300 (Claude Code)', deklariert: DEKLARIERT, anleitung: ANLEITUNG_PROJEKT_STARTFREIGABE }],
    ['p2', `${DEKLARIERT}\n`, null],
    ['p3', null, null],
  ]) {
    const u = baueUmgebung(fall, DEKLARIERT)
    const s = await starteServer(u, installiert)
    const vorher = (await (await fetch(`${s.basisUrl}/api/zustand`)).json()).projektCliHinweis
    const lauf = await starteAusfuehrung(u, s, fall)
    const nachher = (await (await fetch(`${s.basisUrl}/api/zustand`)).json()).projektCliHinweis
    const text = { p1: 'abweichende Version ⇒ Lauf startet, projektCliHinweis vollständig', p2: 'gleiche Version ⇒ Lauf startet, kein Hinweis', p3: 'Version nicht ermittelbar ⇒ Lauf startet, kein Hinweis' }[fall]
    pruefe(lauf !== undefined && isDeepStrictEqual(vorher, erwartet) && isDeepStrictEqual(nachher, erwartet), `(${fall}) ${text}.`, `(${fall}) ${JSON.stringify({ gestartet: lauf !== undefined, vorher, nachher })}`)
  }

  // ── (p4) Workforce-Instanz: projektCliHinweis null (dort gilt cliHinweis; kein doppeltes Band, code-reviewer V5 / qa L5) ──
  {
    const u = baueUmgebung('p4', DEKLARIERT)
    const s = await starteServer(u, '2.1.300 (Claude Code)', { istWorkforceInstanz: true })
    const zustand = await (await fetch(`${s.basisUrl}/api/zustand`)).json()
    pruefe(zustand.projektCliHinweis === null && 'cliHinweis' in zustand, '(p4) Workforce-Instanz: projektCliHinweis null trotz abweichender Version (Hinweis dort über cliHinweis).', `(p4) ${JSON.stringify(zustand.projektCliHinweis)}`)
  }

  // ── (q) Quelltext ────────────────────────────────────────────────────────────────────────────────────────────────────
  const server = readFileSync('scripts/leitstand-server.mjs', 'utf8')
  const vorkommen = (muster) => server.split(muster).length - 1
  pruefe(
    vorkommen('ermittleCliHinweis(') === 1 && vorkommen('frageCliVersion(') === 0 && vorkommen('erzeugeProjektCliHinweis(') === 1 && vorkommen('projektCliHinweis: istWorkforceInstanz ? null : projektCliHinweis()') === 1 && vorkommen('projektCliHinweis()') === 1 && vorkommen('const projektCliHinweis =') === 1,
    '(q) Version nur im CLI-Bindeblock abgefragt; Projekt-Hinweis einmal je Handler erzeugt und in GET /api/zustand geliefert; keine weitere Verwendung (keine Sperre).',
    `(q) ${JSON.stringify({ ermittle: vorkommen('ermittleCliHinweis('), frage: vorkommen('frageCliVersion('), erzeuge: vorkommen('erzeugeProjektCliHinweis('), zustand: vorkommen('projektCliHinweis: istWorkforceInstanz ? null : projektCliHinweis()'), aufrufe: vorkommen('projektCliHinweis()'), deklaration: vorkommen('const projektCliHinweis =') })}`
  )
} finally {
  for (const dienst of dienste) if (dienst.listening) await new Promise((r) => dienst.close(() => r()))
  for (const pfad of aufraeumen) {
    try {
      execFileSync('git', ['worktree', 'prune'], { cwd: join(pfad, 'projekt'), stdio: 'ignore' })
    } catch {
      // ohne Repo nichts zu tun
    }
    raeumeVerzeichnis(pfad)
  }
}

if (befunde.length > 0) {
  console.error(`\n✗ ${befunde.length} Befund(e):`)
  for (const b of befunde) console.error(`  - ${b}`)
  process.exit(1)
}
console.log('\n✓ Keine Befunde.')
