/**
 * Datei: scripts/render-im-lauf.test.mjs
 *
 * Zweck: Servertest des Render-Nachweises im Lauf (F45 B3b-2a-1, F-1256, features/F45/plan-b3b2a-v2.md, Delta-Advisor A3,
 * H-a) über den echten HTTP-Pfad mit einer Attrappe für fuehreAufgabeDurch (Muster scripts/leitstand-arbeitsordner.test.mjs),
 * gegen echte Wegwerf-Git-Repos und mit echtem `npm run check:render` (Stub-Skript, kein Browser — belegt findeNpmCli unter
 * Windows und in der Linux-CI):
 * - Arbeitsordner: Prüfschritt GRÜN ⇒ Render läuft; während des Renders ist die Instanz belegt (D13, 409), danach steht
 *   `render-nachweis-<laufId>` ROT, der Ablauf läuft trotzdem zu Ende (kein Halt, keine Korrekturrunde), GET …/abnahme
 *   liefert `renderNachweis` ok/ROT, danach ist D13 wieder frei (Sonde mit derselben laufId, kein zweiter Lauf);
 * - Projektordner (ohne Arbeitsordner) mit render.json: kein Render, `renderNachweis` 'fehlt';
 * - VERWEIGERT ohne Bypass-Verdacht im Arbeitsordner: Prüfschritt läuft, Render nicht (Prädikat wie die Löschliste).
 *
 * Wird aufgerufen von: npm run test (SERIELL in scripts/teste.mjs).
 */

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import { ladeArtefaktVersion, registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { registriereWorkflow } from '../src/workflow/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'
import { schalteGitWartungAb } from './_wegwerf.ts'
import { skaliert } from './_zeitfaktor.ts'
import { erzeugeRequestHandler } from './leitstand-server.mjs'

/**
 * Stub für `check:render`: wartet auf die Freigabedatei (Pfad in render-freigabe.txt), meldet einen Befund, Exit 1. Die
 * Notbremse nach 30 s (Exit 2) greift nur, wenn ein Test die Freigabe nie schreibt — jeder schreibt sie spätestens im
 * finally; sie ist bewusst nicht an skaliert() gekoppelt (der Stub läuft als eigener Prozess).
 */
const STUB = `const fs = require('fs')
const freigabe = fs.readFileSync('render-freigabe.txt', 'utf8').trim()
const ende = Date.now() + 30000
const t = setInterval(() => {
  if (fs.existsSync(freigabe)) { clearInterval(t); console.log('Befund: Ueberlauf bei 390 px'); process.exit(1) }
  if (Date.now() > ende) { clearInterval(t); process.exit(2) }
}, 50)
`

/** git für Testaufbauten. @param {string} cwd - Ordner @param {string[]} argumente - Argumente @returns {string} Ausgabe */
function git(cwd, argumente) {
  return execFileSync('git', argumente, { cwd, encoding: 'utf8' })
}

/**
 * Wartet, bis pruefen() einen Wert ungleich null/false liefert.
 * @param {() => unknown} pruefen - Prüfung
 * @param {number} maxMs - Grenze
 * @returns {Promise<unknown>} letzter Wert
 */
async function warteBis(pruefen, maxMs = skaliert(20000)) {
  const start = Date.now()
  let wert = await pruefen()
  while (!wert && Date.now() - start < maxMs) {
    await new Promise((r) => setTimeout(r, 50))
    wert = await pruefen()
  }
  return wert
}

/**
 * Repo auf 'arbeit' mit render.json, `.render-nachweis/` in .gitignore, Stub-Skript und Startvorlage mit grünem Prüfbefehl.
 * @returns {{ basis: string, repoWurzel: string, startvorlagePfad: string, basisVerzeichnis: string, freigabe: string, vorlage: object }} Umgebung
 */
function baueUmgebung() {
  const basis = join(tmpdir(), `render-lauf-${randomUUID().slice(0, 8)}`)
  const repoWurzel = join(basis, 'projekt')
  mkdirSync(join(repoWurzel, '.claude'), { recursive: true })
  git(repoWurzel, ['init', '--quiet'])
  schalteGitWartungAb(repoWurzel)
  git(repoWurzel, ['config', 'user.email', 'test@example.invalid'])
  git(repoWurzel, ['config', 'user.name', 'Test'])
  git(repoWurzel, ['config', 'core.autocrlf', 'false'])
  git(repoWurzel, ['checkout', '--quiet', '-b', 'arbeit'])
  const freigabe = join(basis, 'render-freigabe')
  writeFileSync(join(repoWurzel, '.claude', 'settings.json'), '{}\n')
  writeFileSync(join(repoWurzel, '.gitignore'), 'kontrollzustand/\n.render-nachweis/\n')
  writeFileSync(join(repoWurzel, 'render.json'), '{}\n')
  writeFileSync(join(repoWurzel, 'render-stub.js'), STUB)
  writeFileSync(join(repoWurzel, 'render-freigabe.txt'), `${freigabe}\n`)
  writeFileSync(
    join(repoWurzel, 'package.json'),
    `${JSON.stringify({ name: 'stub', private: true, scripts: { 'check:render': 'node render-stub.js' } }, null, 2)}\n`
  )
  git(repoWurzel, ['add', '.'])
  git(repoWurzel, ['commit', '--quiet', '-m', 'init'])
  const startvorlagePfad = join(basis, 'startvorlage.json')
  const basisVorlage = ladeStartvorlage('startvorlagen/beispielprojekt.json')
  writeFileSync(
    startvorlagePfad,
    JSON.stringify(
      { ...basisVorlage, pruefbefehl: [process.execPath, '-e', 'process.exit(0)'], pruefZeitgrenzeMs: 10000 },
      null,
      2
    )
  )
  return {
    basis,
    repoWurzel,
    startvorlagePfad,
    basisVerzeichnis: join(basis, 'kontrollzustand'),
    freigabe,
    vorlage: ladeStartvorlage(startvorlagePfad),
  }
}

/**
 * Attrappe für fuehreAufgabeDurch: schreibt eine Datei, legt Rohstrom und Laufakte an.
 * @param {ReturnType<typeof baueUmgebung>} u - Umgebung
 * @param {'ERFOLGREICH' | 'VERWEIGERT'} ergebnis - Laufergebnis
 * @returns {Function} fuehreAufgabeDurchFn
 */
function baueAttrappe(u, ergebnis = 'ERFOLGREICH') {
  return async (laufId, profilReferenz, _eingaben, optionen) => {
    writeFileSync(join(optionen.cwd ?? u.repoWurzel, 'neu.txt'), 'neu\n')
    const rohstromPfad = join(u.basis, `rohstrom-${laufId}.json`)
    writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: 'Fertig.' }) }))
    registriereKernArtefakt(
      `laufakte-${laufId}`,
      profilReferenz,
      { erzeuger: 'kern', schritt: 'test' },
      { worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad, inhalts_hash: 'x' } },
      [],
      {
        basisVerzeichnis: u.basisVerzeichnis,
        schreiber: () => {},
      }
    )
    return {
      ok: true,
      klassifikation: { ergebnis, bypass_verdacht_anzahl: 0 },
      laufStatus: { status: 'ABGESCHLOSSEN', ergebnis },
    }
  }
}

/**
 * Testserver (Arbeitsordner mit npm- und E-183-Attrappen, oder ohne Arbeitsordner).
 * @param {ReturnType<typeof baueUmgebung>} u - Umgebung
 * @param {Function} fn - fuehreAufgabeDurchFn
 * @param {boolean} arbeitsordner - Arbeitsordner je Ablauf
 * @returns {Promise<{ basisUrl: string, schliessen: () => Promise<void> }>} Server
 */
async function starteServer(u, fn, arbeitsordner = true) {
  const server = createServer(
    erzeugeRequestHandler({
      basisVerzeichnis: u.basisVerzeichnis,
      repoWurzel: u.repoWurzel,
      startvorlagePfad: u.startvorlagePfad,
      fuehreAufgabeDurchFn: fn,
      arbeitsordner,
      arbeitsordnerNpm: async () => ({ code: 0, stdout: '', stderr: '', zeitueberschritten: false }),
      arbeitsordnerE183: () => ({ ok: true }),
    })
  )
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  return {
    basisUrl: `http://127.0.0.1:${server.address().port}`,
    schliessen: () => new Promise((r) => server.close(r)),
  }
}

/**
 * Ein-Schritt-Workflow 'ausfuehrung' (schreibend, Freigabe erteilt).
 * @param {ReturnType<typeof baueUmgebung>} u - Umgebung
 * @param {string} auftragId - Auftrag
 * @returns {string} workflowId
 */
function registriereFixture(u, auftragId) {
  const workflowId = `wf-${randomUUID()}`
  const schritt = {
    schritt_id: 'schritt-1-ausfuehrung',
    rolle: 'ausfuehrung',
    werkzeugsatz: 'schreibend',
    worker: 'claude-code',
    modell: 'claude-sonnet-5',
    eingaben: [],
    output_schema: null,
  }
  registriereWorkflow(
    {
      workflow_schema: 'v0',
      workflow_id: workflowId,
      auftrag_id: auftragId,
      version: 1,
      ziel: 'Render-Test.',
      status: 'OFFEN',
      aktiver_schritt_id: 'schritt-1-ausfuehrung',
      grenzen: { max_schritte: 6, max_replans: 1 },
      schritte: [
        {
          ...schritt,
          freigabe: 'ZWINGEND',
          freigabe_erteilt: true,
          risiko: 'Test.',
          zeitgrenze_ms: 600000,
          nachfolger: null,
          status: 'OFFEN',
          lauf_id: null,
        },
      ],
    },
    leiteProfilReferenzAb(u.vorlage),
    { basisVerzeichnis: u.basisVerzeichnis, schreiber: () => {} }
  )
  return workflowId
}

/**
 * Legt Auftrag und Workflow an und startet ihn (im Arbeitsordner: Vorbereitung, dann zweiter Start).
 * @param {string} basisUrl - Server
 * @param {ReturnType<typeof baueUmgebung>} u - Umgebung
 * @param {boolean} arbeitsordner - mit Vorbereitung
 * @returns {Promise<{ workflowId: string, auftragId: string, laufId: string }>} Kennungen
 */
async function starte(basisUrl, u, arbeitsordner) {
  const antwort = await fetch(`${basisUrl}/api/auftraege`, {
    method: 'POST',
    body: JSON.stringify({ titel: 'Render', auftragstext: 'Baue die Seite.' }),
  })
  const { auftragId } = await antwort.json()
  const workflowId = registriereFixture(u, auftragId)
  const erster = await fetch(`${basisUrl}/api/workflows/${workflowId}/starten`, { method: 'POST' })
  let koerper = await erster.json()
  if (arbeitsordner) {
    const bereit = await warteBis(async () => {
      const detail = await (await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}`)).json()
      return detail.arbeitsordner?.status === 'BEREIT' && detail.arbeitsordner.vorbereitungLaeuft === false
        ? detail
        : null
    })
    assert.ok(bereit, 'Arbeitsordner wird BEREIT')
    koerper = await (await fetch(`${basisUrl}/api/workflows/${workflowId}/starten`, { method: 'POST' })).json()
  }
  assert.ok(koerper.laufId, JSON.stringify(koerper))
  return { workflowId, auftragId, laufId: koerper.laufId }
}

/**
 * D13-Sonde ohne neuen Lauf: ein Ad-hoc-Start mit der laufId des Ausführungslaufs. Solange er aktiv ist, lehnt der Server
 * mit 409 „… noch aktiv (D13)“ ab; danach mit 409 „laufId … bereits vergeben“ — es startet nie ein weiterer Lauf.
 * @param {string} basisUrl - Server
 * @param {string} auftragId - Auftrag
 * @param {string} laufId - laufId des Ausführungslaufs
 * @returns {Promise<{ status: number, grund: string }>} Antwort
 */
async function d13Sonde(basisUrl, auftragId, laufId) {
  const antwort = await fetch(`${basisUrl}/api/laeufe`, {
    method: 'POST',
    body: JSON.stringify({
      laufId,
      rolle: 'code-reviewer',
      anfragen: [],
      budget: {},
      aufrufEingaben: { modell: 'claude-sonnet-5' },
      auftragId,
      werkzeugsatz: 'lesend',
    }),
  })
  return { status: antwort.status, grund: (await antwort.json()).grund ?? '' }
}

describe('Render-Nachweis im Lauf (Server)', { concurrency: false }, () => {
  it('Arbeitsordner: Render nach GRÜN, D13 während des Renders, ROT ohne Halt, Projektion in der Abnahme', async () => {
    const u = baueUmgebung()
    const { basisUrl, schliessen } = await starteServer(u, baueAttrappe(u))
    const lade = (id) =>
      ladeArtefaktVersion(id, undefined, { basisVerzeichnis: u.basisVerzeichnis, schreiber: () => {} })
    try {
      const { workflowId, auftragId, laufId } = await starte(basisUrl, u, true)
      assert.ok(await warteBis(() => lade(`pruefergebnis-${laufId}`)), 'Prüfergebnis registriert')
      // Der Stub wartet auf die Freigabe: jetzt läuft der Render, nicht mehr der Prüfschritt.
      assert.equal(lade(`render-nachweis-${laufId}`), null)
      const waehrend = await d13Sonde(basisUrl, auftragId, laufId)
      assert.equal(waehrend.status, 409)
      assert.match(waehrend.grund, /noch aktiv \(D13\)/, 'D13: während des Renders belegt')
      writeFileSync(u.freigabe, '')
      const render = await warteBis(() => lade(`render-nachweis-${laufId}`))
      assert.ok(render, 'Render-Nachweis registriert')
      assert.equal(render.daten.ergebnis, 'ROT', render.daten.ausgabe_ende)
      assert.equal(render.daten.exit_code, 1)
      assert.deepEqual(render.daten.befehl.slice(-2), ['run', 'check:render'])
      assert.match(render.daten.ausgabe_ende, /Befund: Ueberlauf bei 390 px/)
      const abgeschlossen = await warteBis(() =>
        lade(`workflow-${workflowId}`)?.daten.status === 'ABGESCHLOSSEN' ? true : null
      )
      assert.ok(abgeschlossen, 'kein Halt: der Ablauf läuft zu Ende')
      const abnahme = await (await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/abnahme`)).json()
      assert.equal(abnahme.renderNachweis.status, 'ok')
      assert.equal(abnahme.renderNachweis.ergebnis, 'ROT')
      assert.match(abnahme.renderNachweis.ausgabe_ende, /Befund: Ueberlauf/)
      assert.equal(abnahme.pruefergebnis.ergebnis, 'GRUEN')
      assert.equal(typeof abnahme.pruefergebnis.versionSequenz, 'number')
      const detail = await (await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}`)).json()
      assert.equal(detail.pruefergebnis.ergebnis, 'GRUEN')
      // Nach dem Render ist der Lauf nicht mehr der aktive (D13 frei) — gelesen, ohne einen weiteren Lauf zu starten.
      const frei = async () => /bereits vergeben/.test((await d13Sonde(basisUrl, auftragId, laufId)).grund)
      assert.ok(await warteBis(async () => ((await frei()) ? true : null)), 'nach dem Render wieder frei')
    } finally {
      writeFileSync(u.freigabe, '')
      await schliessen()
      raeumeVerzeichnis(u.basis)
    }
  })

  it('Projektordner mit render.json: kein Render, renderNachweis fehlt', async () => {
    const u = baueUmgebung()
    writeFileSync(u.freigabe, '')
    const { basisUrl, schliessen } = await starteServer(u, baueAttrappe(u), false)
    const lade = (id) =>
      ladeArtefaktVersion(id, undefined, { basisVerzeichnis: u.basisVerzeichnis, schreiber: () => {} })
    try {
      const { workflowId, laufId } = await starte(basisUrl, u, false)
      assert.ok(
        await warteBis(() => (lade(`workflow-${workflowId}`)?.daten.status === 'ABGESCHLOSSEN' ? true : null)),
        'Ablauf läuft zu Ende'
      )
      assert.ok(lade(`pruefergebnis-${laufId}`), 'Prüfschritt lief')
      assert.equal(lade(`render-nachweis-${laufId}`), null)
      assert.equal(existsSync(join(u.repoWurzel, '.render-nachweis')), false)
      const abnahme = await (await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/abnahme`)).json()
      assert.deepEqual(abnahme.renderNachweis, { status: 'fehlt' })
    } finally {
      await schliessen()
      raeumeVerzeichnis(u.basis)
    }
  })

  it('VERWEIGERT ohne Bypass-Verdacht im Arbeitsordner: Prüfschritt ja, Render nein', async () => {
    const u = baueUmgebung()
    writeFileSync(u.freigabe, '')
    const { basisUrl, schliessen } = await starteServer(u, baueAttrappe(u, 'VERWEIGERT'))
    const lade = (id) =>
      ladeArtefaktVersion(id, undefined, { basisVerzeichnis: u.basisVerzeichnis, schreiber: () => {} })
    try {
      const { workflowId, laufId } = await starte(basisUrl, u, true)
      assert.ok(
        await warteBis(() => (lade(`workflow-${workflowId}`)?.daten.status !== 'LAEUFT' ? true : null)),
        'Lauf beendet'
      )
      assert.ok(lade(`pruefergebnis-${laufId}`), 'Prüfschritt lief')
      assert.equal(lade(`render-nachweis-${laufId}`), null)
    } finally {
      await schliessen()
      raeumeVerzeichnis(u.basis)
    }
  })
})
