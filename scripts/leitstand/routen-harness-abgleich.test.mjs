/**
 * Datei: scripts/leitstand/routen-harness-abgleich.test.mjs
 *
 * Zweck: F45 B1b-2 (Beleg 12) — Servertest des Harness-Abgleichs über den echten HTTP-Pfad mit einer Attrappe für
 * fuehreAufgabeDurch (Muster scripts/leitstand-arbeitsordner.test.mjs), gegen echte Wegwerf-Git-Repos:
 * - Kettenende: ein Ein-Schritt-Ablauf (Fast-Lane) läuft im Arbeitsordner bis „fertig“; danach liegt das Kern-Artefakt
 *   'harness-abgleich-<id>' gültig vor (Bezug = Ausführungslauf + Inhalts-Hash des Prüfergebnisses, Prüfschritt GRÜN
 *   zitiert, Review fehlt im Ablauf → bewusst nicht, bestanden), GET …/harness-abgleich liefert es (quelle artefakt);
 * - eine neue Version des Prüfergebnisses (ROT) macht das Artefakt unpassend → GET rechnet live (nicht geschrieben),
 *   „npm run check“ ist offen (negativer Beleg), nicht bestanden;
 * - ein Lauf, der einen Agent im Arbeitsordner anlegt: der Agent ist offen, die Datei steht unter
 *   geaenderte_harness_dateien;
 * - 404 ohne Workflow, 400 bei unzulässiger ID; GET /api/harness trägt abgleich ohne Laufbelege (bestanden null);
 * - GET /api/zustand trägt cliHinweis aus dem Speicher (Handler-Option);
 * - „Prüfung wiederholen“: erster Prüfbefehl ROT → KLAERUNG_ERFORDERLICH (kein Artefakt), Wiederholung GRÜN am Ende
 *   der Kette → neue Version des Artefakts, GET liefert sie (quelle artefakt);
 * - ein ungetrackter Agent im Projektordner, den der Lauf nicht berührt, gilt nicht als „im Lauf entfernt“.
 *
 * Wird aufgerufen von: npm run test (node --test).
 */

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, describe, it } from 'node:test'
import { dodId, validiereHarnessAbgleichDaten } from '../../src/harness-abgleich/index.ts'
import { ladeArtefaktVersion, listeVersionen, registriereKernArtefakt } from '../../src/lineage-registry/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../../src/startvorlage/index.ts'
import { registriereWorkflow } from '../../src/workflow/index.ts'
import { raeumeVerzeichnis } from '../_aufraeumen.ts'
import { skaliert } from '../_zeitfaktor.ts'
import { erzeugeRequestHandler } from '../leitstand-server.mjs'

const INSTALLATION = join(import.meta.dirname, '..', '..')
const NPM_CHECK = dodId('`npm run check` → Exit 0')
const aufraeumen = []
after(() => {
  for (const pfad of aufraeumen) raeumeVerzeichnis(pfad)
})

/** git für Testaufbauten (Tests liegen außerhalb des Git-Starter-Gates). */
function git(cwd, argumente) {
  return execFileSync('git', argumente, { cwd, encoding: 'utf8' })
}

/** Wartet, bis pruefen() einen Wert ungleich null/false liefert (Grenze skalierbar, AIW_TEST_ZEITFAKTOR). */
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
 * Projekt-Repo mit der CLAUDE.md von ai-workforce und leerer settings.json; Startvorlage mit Prüfbefehl.
 * @param pruefSkript - Inline-Skript des Prüfbefehls (Standard: grün); ZAEHLER wird durch eine Zählerdatei ersetzt
 */
function baueUmgebung(pruefSkript = 'process.exit(0)') {
  const basis = join(tmpdir(), `ha-srv-${randomUUID().slice(0, 8)}`)
  aufraeumen.push(basis)
  const repoWurzel = join(basis, 'projekt')
  mkdirSync(join(repoWurzel, '.claude'), { recursive: true })
  git(repoWurzel, ['init', '--quiet'])
  git(repoWurzel, ['config', 'user.email', 'test@example.invalid'])
  git(repoWurzel, ['config', 'user.name', 'Test'])
  git(repoWurzel, ['config', 'core.autocrlf', 'false'])
  git(repoWurzel, ['checkout', '--quiet', '-b', 'arbeit'])
  writeFileSync(join(repoWurzel, '.claude', 'settings.json'), '{}\n')
  writeFileSync(join(repoWurzel, 'CLAUDE.md'), readFileSync(join(INSTALLATION, 'CLAUDE.md'), 'utf8'))
  git(repoWurzel, ['add', '.'])
  git(repoWurzel, ['commit', '--quiet', '-m', 'init'])
  const basisVorlage = ladeStartvorlage('startvorlagen/beispielprojekt.json')
  const startvorlagePfad = join(basis, 'startvorlage.json')
  const zaehler = join(basis, 'pruef-zaehler.txt')
  writeFileSync(startvorlagePfad, JSON.stringify({ ...basisVorlage, pruefbefehl: [process.execPath, '-e', pruefSkript.replaceAll('ZAEHLER', JSON.stringify(zaehler))], pruefZeitgrenzeMs: skaliert(20000) }, null, 2))
  const basisVerzeichnis = join(basis, 'kontrollzustand')
  return { basis, repoWurzel, startvorlagePfad, basisVerzeichnis, vorlage: ladeStartvorlage(startvorlagePfad), ladeOptionen: { basisVerzeichnis, schreiber: () => {} } }
}

/** Attrappe für fuehreAufgabeDurch: optional eine Datei im cwd, Laufakte mit Beobachtung. */
function baueAttrappe(umgebung, schreibe = () => {}) {
  return async (laufId, profilReferenz, _eingaben, optionen) => {
    schreibe(optionen.cwd ?? umgebung.repoWurzel)
    const rohstromPfad = join(umgebung.basis, `rohstrom-${laufId}.json`)
    writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: 'Fertig.' }) }))
    const beobachtung = { init_tools: [], init_agents: [], init_skills: [], init_mcp_server: [], skill_aufrufe: ['ponytail'], subagent_aufrufe: [], mcp_aufrufe: ['mcp__playwright__browser_navigate'], hintergrund_aufrufe: [] }
    registriereKernArtefakt(`laufakte-${laufId}`, profilReferenz, { erzeuger: 'kern', schritt: 'test' }, { worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad, inhalts_hash: 'x' }, beobachtung }, [], umgebung.ladeOptionen)
    return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH', bypass_verdacht_anzahl: 0 }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
  }
}

/** Startet einen Testserver mit Arbeitsordner an (npm- und E-183-Attrappen). */
async function starteServer(umgebung, fuehreAufgabeDurchFn, zusatz = {}) {
  const server = createServer(
    erzeugeRequestHandler({
      basisVerzeichnis: umgebung.basisVerzeichnis,
      repoWurzel: umgebung.repoWurzel,
      startvorlagePfad: umgebung.startvorlagePfad,
      fuehreAufgabeDurchFn,
      arbeitsordner: true,
      arbeitsordnerNpm: async () => ({ code: 0, stdout: '', stderr: '', zeitueberschritten: false }),
      arbeitsordnerE183: () => ({ ok: true }),
      ...zusatz,
    })
  )
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  return { basisUrl: `http://127.0.0.1:${server.address().port}`, schliessen: () => new Promise((r) => server.close(r)) }
}

/** Fast-Lane-Workflow (ein Schritt 'ausfuehrung', freigegeben). */
function registriereFastLane(umgebung, auftragId) {
  const workflowId = `wf-${randomUUID()}`
  registriereWorkflow(
    {
      workflow_schema: 'v0',
      workflow_id: workflowId,
      auftrag_id: auftragId,
      version: 1,
      ziel: 'Harness-Abgleich-Test.',
      status: 'OFFEN',
      aktiver_schritt_id: 'schritt-1-ausfuehrung',
      grenzen: { max_schritte: 6, max_replans: 1 },
      schritte: [
        { schritt_id: 'schritt-1-ausfuehrung', rolle: 'ausfuehrung', werkzeugsatz: 'schreibend', worker: 'claude-code', modell: 'claude-sonnet-5', eingaben: [], output_schema: null, freigabe: 'ZWINGEND', freigabe_erteilt: true, risiko: 'Test.', zeitgrenze_ms: 600000, nachfolger: null, status: 'OFFEN', lauf_id: null },
      ],
    },
    leiteProfilReferenzAb(umgebung.vorlage),
    umgebung.ladeOptionen
  )
  return workflowId
}

/**
 * Legt Auftrag und Workflow an, startet (Vorbereitung, dann Lauf) und wartet bis ABGESCHLOSSEN.
 * @returns { workflowId, laufId }
 */
async function laufeBisFertig(u, basisUrl, vorDemLauf = () => {}) {
  const { workflowId, koerper } = await starteLauf(u, basisUrl, vorDemLauf)
  const fertig = await warteBis(() => ladeArtefaktVersion(`harness-abgleich-${workflowId}`, undefined, u.ladeOptionen))
  assert.ok(fertig, 'Harness-Abgleich am Kettenende geschrieben')
  return { workflowId, laufId: koerper.laufId }
}

/**
 * Legt Auftrag und Fast-Lane-Workflow an, bereitet den Arbeitsordner vor und startet den Lauf.
 * @param vorDemLauf - Rückruf nach der Vorbereitung, vor dem Start (z. B. Datei im Projektordner)
 * @returns { workflowId, koerper } (koerper = Antwort des zweiten Starts)
 */
async function starteLauf(u, basisUrl, vorDemLauf = () => {}) {
  const auftragId = (await (await fetch(`${basisUrl}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel: 'HA-Test', auftragstext: 'Ändere README.' }) })).json()).auftragId
  const workflowId = registriereFastLane(u, auftragId)
  assert.equal((await fetch(`${basisUrl}/api/workflows/${workflowId}/starten`, { method: 'POST' })).status, 202)
  const bereit = await warteBis(async () => {
    const d = await (await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}`)).json()
    return d.arbeitsordner?.status === 'BEREIT' && d.arbeitsordner.vorbereitungLaeuft === false
  })
  assert.ok(bereit, 'Arbeitsordner wird BEREIT')
  vorDemLauf()
  const zweiter = await fetch(`${basisUrl}/api/workflows/${workflowId}/starten`, { method: 'POST' })
  const koerper = await zweiter.json()
  assert.equal(zweiter.status, 202, JSON.stringify(koerper))
  return { workflowId, koerper }
}

describe('Harness-Abgleich (Server)', { concurrency: false }, () => {
  it('Kettenende schreibt das Artefakt; GET liefert es; neues Prüfergebnis → live, negativer Beleg offen', async () => {
    const u = baueUmgebung()
    const { basisUrl, schliessen } = await starteServer(u, baueAttrappe(u))
    try {
      const { workflowId, laufId } = await laufeBisFertig(u, basisUrl)
      const artefakt = ladeArtefaktVersion(`harness-abgleich-${workflowId}`, undefined, u.ladeOptionen)
      const daten = artefakt.daten
      assert.deepEqual(validiereHarnessAbgleichDaten(daten), [])
      assert.equal(ladeArtefaktVersion(`workflow-${workflowId}`, undefined, u.ladeOptionen).daten.status, 'ABGESCHLOSSEN')
      const pruefung = ladeArtefaktVersion(`pruefergebnis-${laufId}`, undefined, u.ladeOptionen)
      assert.deepEqual(daten.bezug, { ausfuehrung_lauf_id: laufId, pruefergebnis_hash: pruefung.inhaltsHash })
      assert.match(daten.wurzel, /projekt-laeufe/, 'Harness des Arbeitsordners gelesen')
      const npm = daten.eintraege.find((e) => e.name === NPM_CHECK)
      assert.deepEqual([npm.status, npm.beleg.ergebnis, npm.beleg.lauf_id], ['wirksam', 'GRUEN', laufId])
      const review = daten.eintraege.find((e) => e.name === dodId('Reviewer-/QA-Pass (Subagenten `code-reviewer` + `qa`, frischer Kontext) vor Freigabe/Commit durchlaufen — nicht optional, nicht retroactiv nachgeholt (F-046)'))
      assert.deepEqual([review.status, review.ersatz.lage], ['bewusst_nicht', 'nicht_im_ablauf'])
      assert.equal(daten.zaehlung.offen, 0)
      assert.equal(daten.bestanden, true)
      assert.deepEqual(daten.faehigkeiten, { lauf_id: laufId, skills: [{ name: 'ponytail', anzahl: 1 }], subagenten: [], mcp_server: [{ name: 'playwright', anzahl: 1 }], hintergrund: 0 })
      assert.deepEqual(daten.geaenderte_harness_dateien, [])

      const antwort = await (await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/harness-abgleich`)).json()
      assert.deepEqual([antwort.status, antwort.quelle, antwort.versionSequenz], ['ok', 'artefakt', artefakt.versionSequenz])

      registriereKernArtefakt(`pruefergebnis-${laufId}`, leiteProfilReferenzAb(u.vorlage), { erzeuger: 'kern', schritt: 'test' }, { ...pruefung.daten, ergebnis: 'ROT', exit_code: 1 }, [], u.ladeOptionen)
      const versionenVorher = listeVersionen(`harness-abgleich-${workflowId}`, u.ladeOptionen).length
      const live = await (await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/harness-abgleich`)).json()
      assert.deepEqual([live.quelle, live.artefaktVeraltet, live.daten.bestanden], ['live', true, false])
      const npmLive = live.daten.eintraege.find((e) => e.name === NPM_CHECK)
      assert.deepEqual([npmLive.status, npmLive.offen_grund, npmLive.grund], ['offen', 'beleg_negativ', 'Prüfergebnis ROT'])
      assert.equal(listeVersionen(`harness-abgleich-${workflowId}`, u.ladeOptionen).length, versionenVorher, 'GET schreibt nicht')

      assert.equal((await fetch(`${basisUrl}/api/workflows/gibt-es-nicht/harness-abgleich`)).status, 404)
      assert.equal((await fetch(`${basisUrl}/api/workflows/a%2Fb/harness-abgleich`)).status, 400)
    } finally {
      await schliessen()
    }
  })

  it('ein im Lauf angelegter Agent ist offen und steht unter den geänderten Harness-Dateien', async () => {
    const u = baueUmgebung()
    const { basisUrl, schliessen } = await starteServer(
      u,
      baueAttrappe(u, (cwd) => {
        mkdirSync(join(cwd, '.claude', 'agents'), { recursive: true })
        writeFileSync(join(cwd, '.claude', 'agents', 'im-lauf-neu.md'), 'x\n')
      })
    )
    try {
      const { workflowId } = await laufeBisFertig(u, basisUrl)
      const daten = ladeArtefaktVersion(`harness-abgleich-${workflowId}`, undefined, u.ladeOptionen).daten
      const offen = daten.eintraege.filter((e) => e.status === 'offen').map((e) => `${e.art}:${e.name}:${e.offen_grund}`)
      assert.deepEqual(offen, ['agent:im-lauf-neu:nicht_in_zuordnung'])
      assert.equal(daten.bestanden, false)
      // Die Änderungsübersicht meldet einen neuen, ungetrackten Ordner als Ordnerpfad (git status ohne -uall).
      assert.deepEqual(daten.geaenderte_harness_dateien, ['.claude/agents/'])
    } finally {
      await schliessen()
    }
  })

  it('Prüfung wiederholen: ROT hält ohne Artefakt, GRÜN am Kettenende schreibt eine neue Version', async () => {
    const u = baueUmgebung("const fs = require('fs'); let n = 0; try { n = Number(fs.readFileSync(ZAEHLER, 'utf8')) } catch {} fs.writeFileSync(ZAEHLER, String(n + 1)); process.exit(n === 0 ? 1 : 0)")
    const { basisUrl, schliessen } = await starteServer(u, baueAttrappe(u))
    try {
      const { workflowId, koerper } = await starteLauf(u, basisUrl)
      const halt = await warteBis(() => ladeArtefaktVersion(`workflow-${workflowId}`, undefined, u.ladeOptionen)?.daten.status === 'KLAERUNG_ERFORDERLICH')
      assert.ok(halt, 'Prüfung ROT hält den Ablauf an')
      assert.equal(ladeArtefaktVersion(`harness-abgleich-${workflowId}`, undefined, u.ladeOptionen), null, 'kein Kettenende, kein Artefakt')
      const wiederholt = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/pruefung-wiederholen`, { method: 'POST' })
      assert.equal(wiederholt.status, 200, await wiederholt.text())
      const artefakt = ladeArtefaktVersion(`harness-abgleich-${workflowId}`, undefined, u.ladeOptionen)
      assert.ok(artefakt, 'Artefakt nach der wiederholten Prüfung geschrieben')
      const pruefung = ladeArtefaktVersion(`pruefergebnis-${koerper.laufId}`, undefined, u.ladeOptionen)
      assert.equal(pruefung.daten.ergebnis, 'GRUEN')
      assert.equal(artefakt.daten.bezug.pruefergebnis_hash, pruefung.inhaltsHash)
      const antwort = await (await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/harness-abgleich`)).json()
      assert.deepEqual([antwort.quelle, antwort.daten.bestanden], ['artefakt', true])
    } finally {
      await schliessen()
    }
  })

  it('ein ungetrackter Agent im Projektordner, den der Lauf nicht berührt, gilt nicht als „im Lauf entfernt“', async () => {
    const u = baueUmgebung()
    const { basisUrl, schliessen } = await starteServer(u, baueAttrappe(u))
    try {
      const { workflowId } = await laufeBisFertig(u, basisUrl, () => {
        mkdirSync(join(u.repoWurzel, '.claude', 'agents'), { recursive: true })
        writeFileSync(join(u.repoWurzel, '.claude', 'agents', 'nebenher.md'), 'x\n')
      })
      const daten = ladeArtefaktVersion(`harness-abgleich-${workflowId}`, undefined, u.ladeOptionen).daten
      assert.equal(daten.eintraege.filter((e) => e.offen_grund === 'im_lauf_entfernt').length, 0)
      assert.equal(daten.bestanden, true)
    } finally {
      await schliessen()
    }
  })

  it('GET /api/harness trägt abgleich ohne Laufbelege; GET /api/zustand trägt cliHinweis aus dem Speicher', async () => {
    const u = baueUmgebung()
    const hinweis = { art: 'cliVersionGeaendert', installiert: '2.1.300 (Claude Code)', deklariert: '2.1.296 (Claude Code)', anleitung: 'docs/harness/startfreigabe-erneuern.md' }
    const { basisUrl, schliessen } = await starteServer(u, baueAttrappe(u), { cliHinweis: hinweis })
    try {
      const harness = await (await fetch(`${basisUrl}/api/harness`)).json()
      assert.equal(harness.abgleich.status, 'ok')
      assert.equal(harness.abgleich.bestanden, null)
      assert.equal(harness.abgleich.zaehlung.offen, 0)
      assert.equal(harness.abgleich.eintraege.find((e) => e.name === NPM_CHECK).beleg.im_lauf, null)
      const zustand = await (await fetch(`${basisUrl}/api/zustand`)).json()
      assert.deepEqual(zustand.cliHinweis, hinweis)
    } finally {
      await schliessen()
    }
  })
})
