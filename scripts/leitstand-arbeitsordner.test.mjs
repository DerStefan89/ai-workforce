/**
 * Datei: scripts/leitstand-arbeitsordner.test.mjs
 *
 * Zweck: Servertest des Arbeitsordners je Ablauf (F45 B1a-1, E-F45-3 = A) über den echten HTTP-Pfad mit einer
 * Attrappe für fuehreAufgabeDurch (Muster scripts/check-f652-pruefschritt.mjs), gegen echte Wegwerf-Git-Repos:
 * - volle Kette im Worktree: POST …/starten → 202 vorbereitung ohne Schreibvorgang am Workflow → BEREIT → zweiter
 *   Start läuft mit cwd/settingsPfad im Worktree; Löschliste (erlaubt/außerhalb/geschützt), Änderungsübersicht und
 *   Prüfschritt im Worktree; Projektordner: Arbeitsbaum, Index, Branch unverändert (Invariante); Projektion;
 * - Freigabeweg: 202 vorbereitung hält die Entscheidung NICHT fest, die zweite Einreichung startet;
 * - fehlgeschlagene Vorbereitung (E-183 rot): nichts läuft, Workflow unverändert;
 * - Bestand (schreibender Schritt lief ohne Artefakt): läuft wie bisher im Projektordner;
 * - Regel 1j liest package.json-Skripte des Worktrees; „Prüfung wiederholen“ läuft im Worktree;
 * - Aufräumen: Sperren, offene Änderungen ohne/mit Verwerfen, Branch gelöscht, Liste GET /api/arbeitsordner.
 *
 * Wird aufgerufen von: npm run test (node --test).
 */

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { ladeArtefaktVersion, registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { registriereWorkflow } from '../src/workflow/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'
import { erzeugeRequestHandler } from './leitstand-server.mjs'

/** git für Testaufbauten (Tests liegen außerhalb des Git-Starter-Gates). */
function git(cwd, argumente) {
  return execFileSync('git', argumente, { cwd, encoding: 'utf8' })
}

/** Wartet, bis pruefen() einen Wert ungleich null/false liefert. */
async function warteBis(pruefen, maxMs = 15000) {
  const start = Date.now()
  let wert = await pruefen()
  while (!wert && Date.now() - start < maxMs) {
    await new Promise((r) => setTimeout(r, 50))
    wert = await pruefen()
  }
  return wert
}

/**
 * Baut eine Testumgebung: Repo auf 'arbeit' mit Harness-Dateien, Startvorlage mit Prüfbefehl, der seinen cwd in
 * eine Datei außerhalb schreibt, Kontrollzustand außerhalb des Repos.
 */
function baueUmgebung({ pruefSkript = null, packageJson = null } = {}) {
  const basis = join(tmpdir(), `ao-srv-${randomUUID().slice(0, 8)}`)
  const repoWurzel = join(basis, 'projekt')
  mkdirSync(join(repoWurzel, '.claude'), { recursive: true })
  git(repoWurzel, ['init', '--quiet'])
  git(repoWurzel, ['config', 'user.email', 'test@example.invalid'])
  git(repoWurzel, ['config', 'user.name', 'Test'])
  git(repoWurzel, ['config', 'core.autocrlf', 'false'])
  git(repoWurzel, ['checkout', '--quiet', '-b', 'arbeit'])
  writeFileSync(join(repoWurzel, '.claude', 'settings.json'), '{}\n')
  writeFileSync(join(repoWurzel, 'README.md'), 'Zeile 1\n')
  writeFileSync(join(repoWurzel, 'alt.txt'), 'weg damit\n')
  if (packageJson !== null) writeFileSync(join(repoWurzel, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`)
  git(repoWurzel, ['add', '.'])
  git(repoWurzel, ['commit', '--quiet', '-m', 'init'])
  const cwdDatei = join(basis, 'pruef-cwd.txt')
  const zaehler = join(basis, 'pruef-zaehler.txt')
  const skript =
    pruefSkript ??
    `require('fs').appendFileSync(${JSON.stringify(cwdDatei)}, process.cwd() + '\\n'); process.exit(0)`
  const basisVorlage = ladeStartvorlage('startvorlagen/beispielprojekt.json')
  const startvorlagePfad = join(basis, 'startvorlage.json')
  writeFileSync(startvorlagePfad, JSON.stringify({ ...basisVorlage, pruefbefehl: [process.execPath, '-e', skript.replaceAll('ZAEHLER', JSON.stringify(zaehler)).replaceAll('CWDDATEI', JSON.stringify(cwdDatei))], pruefZeitgrenzeMs: 20000 }, null, 2))
  const basisVerzeichnis = join(basis, 'kontrollzustand')
  return { basis, repoWurzel, startvorlagePfad, basisVerzeichnis, cwdDatei, vorlage: ladeStartvorlage(startvorlagePfad) }
}

/**
 * Attrappe für fuehreAufgabeDurch: schreibt im cwd des Laufs, legt Rohstrom + Laufakte mit Ergebnistext an.
 * @returns { fn, aufrufe }
 */
function baueAttrappe(umgebung, { ergebnistext = 'Fertig.', schreibe = (cwd) => writeFileSync(join(cwd, 'neu.txt'), 'neu\n') } = {}) {
  const aufrufe = []
  const fn = async (laufId, profilReferenz, eingaben, optionen) => {
    aufrufe.push({ laufId, cwd: optionen.cwd, settingsPfad: optionen.settingsPfad, auftragstext: eingaben.auftragstext })
    const wurzel = optionen.cwd ?? umgebung.repoWurzel
    schreibe(wurzel)
    const rohstromPfad = join(umgebung.basis, `rohstrom-${laufId}.json`)
    writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: ergebnistext }) }))
    registriereKernArtefakt(`laufakte-${laufId}`, profilReferenz, { erzeuger: 'kern', schritt: 'test' }, { worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad, inhalts_hash: 'x' } }, [], {
      basisVerzeichnis: umgebung.basisVerzeichnis,
      schreiber: () => {},
    })
    return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH', bypass_verdacht_anzahl: 0 }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
  }
  return { fn, aufrufe }
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
  const basisUrl = `http://127.0.0.1:${server.address().port}`
  return { basisUrl, schliessen: () => new Promise((r) => server.close(r)) }
}

/** Ein-Schritt-Workflow 'ausfuehrung' (schreibend), Freigabe nach Wunsch. */
function registriereFixture(umgebung, auftragId, { freigabeErteilt = true, schritte = null, aktiverSchrittId = 'schritt-1-ausfuehrung', status = 'OFFEN' } = {}) {
  const workflowId = `wf-${randomUUID()}`
  registriereWorkflow(
    {
      workflow_schema: 'v0',
      workflow_id: workflowId,
      auftrag_id: auftragId,
      version: 1,
      ziel: 'Arbeitsordner-Test.',
      status,
      aktiver_schritt_id: aktiverSchrittId,
      grenzen: { max_schritte: 6, max_replans: 1 },
      schritte: schritte ?? [
        {
          schritt_id: 'schritt-1-ausfuehrung',
          rolle: 'ausfuehrung',
          werkzeugsatz: 'schreibend',
          worker: 'claude-code',
          modell: 'claude-sonnet-5',
          eingaben: [],
          output_schema: null,
          freigabe: 'ZWINGEND',
          ...(freigabeErteilt ? { freigabe_erteilt: true } : {}),
          risiko: 'Test.',
          zeitgrenze_ms: 600000,
          nachfolger: null,
          status: 'OFFEN',
          lauf_id: null,
        },
      ],
    },
    leiteProfilReferenzAb(umgebung.vorlage),
    { basisVerzeichnis: umgebung.basisVerzeichnis, schreiber: () => {} }
  )
  return workflowId
}

/** Legt einen Auftrag über die echte Route an. */
async function legeAuftragAn(basisUrl) {
  const antwort = await fetch(`${basisUrl}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel: 'AO-Test', auftragstext: 'Ändere README.' }) })
  return (await antwort.json()).auftragId
}

/** Workflow-Daten und versionSequenz von der Platte. */
function ladeWorkflow(umgebung, workflowId) {
  return ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis: umgebung.basisVerzeichnis, schreiber: () => {} })
}

/** Wartet über GET /api/workflows/<id> auf einen Arbeitsordner-Status. */
async function warteAufArbeitsordner(basisUrl, workflowId, status) {
  return warteBis(async () => {
    const detail = await (await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}`)).json()
    return detail.arbeitsordner?.status === status && detail.arbeitsordner.vorbereitungLaeuft === false ? detail : null
  })
}

/** Projektordner-Zustand für die Invariante: Arbeitsbaum + Index, Branch, Commit. */
function projektZustand(repoWurzel) {
  return {
    status: git(repoWurzel, ['status', '--porcelain', '--untracked-files=all']),
    branch: git(repoWurzel, ['symbolic-ref', 'HEAD']).trim(),
    kopf: git(repoWurzel, ['rev-parse', 'HEAD']).trim(),
  }
}

describe('Arbeitsordner je Ablauf (Server)', { concurrency: false }, () => {
  it('volle Kette im Worktree: Vorbereitung, Lauf, Löschliste, Übersicht, Prüfschritt; Projektordner unverändert', async () => {
    const u = baueUmgebung({ pruefSkript: 'require("fs").appendFileSync(CWDDATEI, process.cwd() + "\\n"); process.exit(0)' })
    const ergebnistext = 'Fertig.\n\n```zu_loeschen\n{ "zu_loeschen": ["alt.txt", "../aussen.txt", ".claude/settings.json"] }\n```\n'
    writeFileSync(join(u.basis, 'aussen.txt'), 'bleibt\n')
    const attrappe = baueAttrappe(u, {
      ergebnistext,
      schreibe: (cwd) => {
        writeFileSync(join(cwd, 'neu.txt'), 'neu\n')
        writeFileSync(join(cwd, 'README.md'), 'Zeile 1\nZeile 2\n')
      },
    })
    const { basisUrl, schliessen } = await starteServer(u, attrappe.fn)
    try {
      const vorher = projektZustand(u.repoWurzel)
      const workflowId = registriereFixture(u, await legeAuftragAn(basisUrl))
      const sequenzVorher = ladeWorkflow(u, workflowId).versionSequenz

      const erster = await fetch(`${basisUrl}/api/workflows/${workflowId}/starten`, { method: 'POST' })
      const ersterKoerper = await erster.json()
      assert.equal(erster.status, 202)
      assert.equal(ersterKoerper.vorbereitung, true)
      assert.equal(ersterKoerper.versionSequenz, sequenzVorher)
      const detail = await warteAufArbeitsordner(basisUrl, workflowId, 'BEREIT')
      assert.ok(detail, 'Arbeitsordner wird BEREIT')
      assert.equal(ladeWorkflow(u, workflowId).versionSequenz, sequenzVorher, 'Vorbereitung schreibt nichts am Workflow')
      assert.equal(attrappe.aufrufe.length, 0)
      const ao = detail.arbeitsordner
      assert.equal(dirname(ao.pfad), join(u.basis, 'projekt-laeufe'))
      assert.equal(ao.branch, `wf/${workflowId}`)
      assert.equal(ao.basis_commit, vorher.kopf)

      const zweiter = await fetch(`${basisUrl}/api/workflows/${workflowId}/starten`, { method: 'POST' })
      const zweiterKoerper = await zweiter.json()
      assert.equal(zweiter.status, 202, JSON.stringify(zweiterKoerper))
      assert.ok(zweiterKoerper.laufId)
      const pruefergebnis = await warteBis(() => ladeArtefaktVersion(`pruefergebnis-${zweiterKoerper.laufId}`, undefined, { basisVerzeichnis: u.basisVerzeichnis, schreiber: () => {} }))
      assert.ok(pruefergebnis, 'Prüfergebnis registriert')

      assert.equal(attrappe.aufrufe[0].cwd, ao.pfad)
      assert.equal(attrappe.aufrufe[0].settingsPfad, join(ao.pfad, '.claude', 'settings.json'))
      assert.match(attrappe.aufrufe[0].auftragstext, /zu_loeschen/)
      assert.equal(readFileSync(u.cwdDatei, 'utf8').trim(), ao.pfad)

      assert.equal(existsSync(join(ao.pfad, 'alt.txt')), false, 'erlaubte Löschung ausgeführt')
      assert.equal(existsSync(join(u.basis, 'aussen.txt')), true)
      assert.equal(existsSync(join(ao.pfad, '.claude', 'settings.json')), true)
      const uebersicht = ladeArtefaktVersion(`aenderungsuebersicht-${zweiterKoerper.laufId}`, undefined, { basisVerzeichnis: u.basisVerzeichnis, schreiber: () => {} }).daten
      assert.deepEqual(uebersicht.loeschliste.geloescht, ['alt.txt'])
      assert.equal(uebersicht.loeschliste.abgelehnt.length, 2)
      const dateien = Object.fromEntries(uebersicht.dateien.map((d) => [d.pfad, d.status]))
      assert.equal(dateien['alt.txt'], 'GELOESCHT')
      assert.equal(dateien['neu.txt'], 'NEU')
      assert.equal(dateien['README.md'], 'GEAENDERT')

      // Invariante: Arbeitsbaum, Index, Branch und Commit des Projektordners unverändert.
      assert.deepEqual(projektZustand(u.repoWurzel), vorher)
      assert.equal(existsSync(join(u.repoWurzel, 'neu.txt')), false)
      assert.equal(existsSync(join(u.repoWurzel, 'alt.txt')), true)

      // Aufräumen: erst nach der Abnahme; Pflichtbegründung, offene Änderungen ohne Verwerfen abgelehnt, mit Verwerfen entfernt.
      await warteBis(() => ladeWorkflow(u, workflowId).daten.status === 'ABGESCHLOSSEN')
      const vorAbnahme = await fetch(`${basisUrl}/api/workflows/${workflowId}/arbeitsordner-aufraeumen`, { method: 'POST', body: JSON.stringify({ begruendung: 'zu früh', verwerfen: true }) })
      assert.equal(vorAbnahme.status, 409)
      assert.match((await vorAbnahme.json()).grund, /Abnahme ist noch offen/)
      assert.equal(existsSync(ao.pfad), true)
      const abnahme = await fetch(`${basisUrl}/api/workflows/${workflowId}/abnahme`, { method: 'POST', body: JSON.stringify({ ergebnis: 'ABGELEHNT', begruendung: 'Testablauf' }) })
      assert.ok(abnahme.status < 300, await abnahme.text())
      const ohneBegruendung = await fetch(`${basisUrl}/api/workflows/${workflowId}/arbeitsordner-aufraeumen`, { method: 'POST', body: '{}' })
      assert.equal(ohneBegruendung.status, 400)
      const ohneVerwerfen = await fetch(`${basisUrl}/api/workflows/${workflowId}/arbeitsordner-aufraeumen`, { method: 'POST', body: JSON.stringify({ begruendung: 'Test fertig' }) })
      assert.equal(ohneVerwerfen.status, 409)
      assert.match((await ohneVerwerfen.json()).grund, /nicht gesicherte Änderung/)
      assert.equal(existsSync(ao.pfad), true)
      const mitVerwerfen = await fetch(`${basisUrl}/api/workflows/${workflowId}/arbeitsordner-aufraeumen`, { method: 'POST', body: JSON.stringify({ begruendung: 'Test fertig', verwerfen: true }) })
      const aufgeraeumt = await mitVerwerfen.json()
      assert.equal(mitVerwerfen.status, 200, JSON.stringify(aufgeraeumt))
      assert.equal(aufgeraeumt.branchGeloescht, true)
      assert.equal(existsSync(ao.pfad), false)
      assert.equal(git(u.repoWurzel, ['branch', '--list', `wf/${workflowId}`]).trim(), '')
      const liste = await (await fetch(`${basisUrl}/api/arbeitsordner`)).json()
      assert.equal(liste.arbeitsordner.find((e) => e.workflowId === workflowId)?.status, 'ENTFERNT')
      const nochmal = await fetch(`${basisUrl}/api/workflows/${workflowId}/arbeitsordner-aufraeumen`, { method: 'POST', body: JSON.stringify({ begruendung: 'zweimal' }) })
      assert.equal(nochmal.status, 409)
      assert.deepEqual(projektZustand(u.repoWurzel), vorher)
    } finally {
      await schliessen()
      raeumeVerzeichnis(u.basis)
    }
  })

  it('Freigabeweg: 202 vorbereitung hält die Entscheidung nicht fest; die zweite Einreichung startet im Worktree', async () => {
    const u = baueUmgebung()
    const attrappe = baueAttrappe(u)
    const { basisUrl, schliessen } = await starteServer(u, attrappe.fn)
    try {
      const workflowId = registriereFixture(u, await legeAuftragAn(basisUrl), { freigabeErteilt: false })
      const koerper = JSON.stringify({ schrittId: 'schritt-1-ausfuehrung', entscheidung: 'FREIGEGEBEN', begruendung: 'passt' })
      const erste = await fetch(`${basisUrl}/api/workflows/${workflowId}/freigabe`, { method: 'POST', body: koerper })
      assert.equal(erste.status, 202)
      assert.equal((await erste.json()).vorbereitung, true)
      assert.equal(ladeArtefaktVersion(`entscheidung-workflow-${workflowId}-schritt-1-ausfuehrung`, undefined, { basisVerzeichnis: u.basisVerzeichnis, schreiber: () => {} }), null)
      assert.equal(ladeWorkflow(u, workflowId).daten.schritte[0].freigabe_erteilt, undefined)
      // Während der Vorbereitung: idempotent 202.
      const waehrend = await fetch(`${basisUrl}/api/workflows/${workflowId}/freigabe`, { method: 'POST', body: koerper })
      assert.ok([202].includes(waehrend.status))
      await warteAufArbeitsordner(basisUrl, workflowId, 'BEREIT')
      const zweite = await fetch(`${basisUrl}/api/workflows/${workflowId}/freigabe`, { method: 'POST', body: koerper })
      const zweiteKoerper = await zweite.json()
      assert.equal(zweite.status, 202, JSON.stringify(zweiteKoerper))
      assert.ok(zweiteKoerper.laufId)
      await warteBis(() => attrappe.aufrufe.length > 0)
      assert.equal(dirname(attrappe.aufrufe[0].cwd), join(u.basis, 'projekt-laeufe'))
      await warteBis(() => ladeWorkflow(u, workflowId).daten.status === 'ABGESCHLOSSEN')
    } finally {
      await schliessen()
      raeumeVerzeichnis(u.basis)
    }
  })

  it('fehlgeschlagene Vorbereitung (E-183 rot): kein Lauf, Workflow unverändert, Grund sichtbar; Aufräumen erlaubt', async () => {
    const u = baueUmgebung()
    const attrappe = baueAttrappe(u)
    const { basisUrl, schliessen } = await starteServer(u, attrappe.fn, { arbeitsordnerE183: () => ({ ok: false, grund: 'Hash weicht ab (E-183)' }) })
    try {
      const workflowId = registriereFixture(u, await legeAuftragAn(basisUrl))
      const vorher = ladeWorkflow(u, workflowId)
      assert.equal((await fetch(`${basisUrl}/api/workflows/${workflowId}/starten`, { method: 'POST' })).status, 202)
      const detail = await warteAufArbeitsordner(basisUrl, workflowId, 'FEHLGESCHLAGEN')
      assert.match(detail.arbeitsordner.grund, /E-183/)
      assert.equal(attrappe.aufrufe.length, 0)
      assert.equal(ladeWorkflow(u, workflowId).versionSequenz, vorher.versionSequenz)
      const aufraeumen = await fetch(`${basisUrl}/api/workflows/${workflowId}/arbeitsordner-aufraeumen`, { method: 'POST', body: JSON.stringify({ begruendung: 'Vorbereitung gescheitert' }) })
      assert.equal(aufraeumen.status, 200, await aufraeumen.text())
    } finally {
      await schliessen()
      raeumeVerzeichnis(u.basis)
    }
  })

  it('Bestand nach ANPASSUNG: lauf_id zurückgesetzt, Abnahme-Artefakt vorhanden → Korrekturlauf im Projektordner, keine Vorbereitung', async () => {
    const u = baueUmgebung()
    const attrappe = baueAttrappe(u, { schreibe: () => {} })
    const { basisUrl, schliessen } = await starteServer(u, attrappe.fn)
    try {
      const workflowId = registriereFixture(u, await legeAuftragAn(basisUrl))
      registriereKernArtefakt(
        `entscheidung-workflow-${workflowId}-abnahme`,
        leiteProfilReferenzAb(u.vorlage),
        { erzeuger: 'mensch', schritt: 'entscheidung-workflow-abnahme' },
        { entscheidung_schema: 'v0', art: 'abnahme', ergebnis: 'ANPASSUNG_ANGEFORDERT', begruendung: 'nachbessern', entschieden_am: new Date().toISOString(), bezug: { workflow_version: 1, ausfuehrung_lauf_id: 'alter-lauf', review_lauf_id: null } },
        [],
        { basisVerzeichnis: u.basisVerzeichnis, schreiber: () => {} }
      )
      const detail = await (await fetch(`${basisUrl}/api/workflows/${workflowId}`)).json()
      assert.equal(detail.arbeitsordner.status, 'bestand')
      const start = await fetch(`${basisUrl}/api/workflows/${workflowId}/starten`, { method: 'POST' })
      const koerper = await start.json()
      assert.equal(start.status, 202, JSON.stringify(koerper))
      assert.equal(koerper.vorbereitung, undefined)
      await warteBis(() => attrappe.aufrufe.length > 0)
      assert.equal(attrappe.aufrufe[0].cwd, undefined)
      assert.equal(existsSync(join(u.basis, 'projekt-laeufe')), false)
      await warteBis(() => ladeWorkflow(u, workflowId).daten.status !== 'LAEUFT')
    } finally {
      await schliessen()
      raeumeVerzeichnis(u.basis)
    }
  })

  it('Ordner nach BEREIT von Hand gelöscht: kein Lauf im Projektordner, Vorbereitung hält mit Grund, Aufräumen trägt aus', async () => {
    const u = baueUmgebung()
    const attrappe = baueAttrappe(u)
    const { basisUrl, schliessen } = await starteServer(u, attrappe.fn)
    try {
      const workflowId = registriereFixture(u, await legeAuftragAn(basisUrl))
      await fetch(`${basisUrl}/api/workflows/${workflowId}/starten`, { method: 'POST' })
      const detail = await warteAufArbeitsordner(basisUrl, workflowId, 'BEREIT')
      raeumeVerzeichnis(detail.arbeitsordner.pfad)
      const start = await fetch(`${basisUrl}/api/workflows/${workflowId}/starten`, { method: 'POST' })
      assert.equal((await start.json()).vorbereitung, true)
      const fehl = await warteAufArbeitsordner(basisUrl, workflowId, 'FEHLGESCHLAGEN')
      assert.match(fehl.arbeitsordner.grund, /unvollständig|prunable/)
      assert.equal(attrappe.aufrufe.length, 0, 'nie ein Lauf im Projektordner')
      assert.equal(existsSync(join(u.repoWurzel, 'neu.txt')), false)
      const aufraeumen = await fetch(`${basisUrl}/api/workflows/${workflowId}/arbeitsordner-aufraeumen`, { method: 'POST', body: JSON.stringify({ begruendung: 'Ordner fehlte' }) })
      assert.equal(aufraeumen.status, 200, await aufraeumen.text())
    } finally {
      await schliessen()
      raeumeVerzeichnis(u.basis)
    }
  })

  it('veraltetes IN_VORBEREITUNG (Serverneustart) gilt als fehlgeschlagen und wird beim nächsten Start wieder aufgenommen', async () => {
    const u = baueUmgebung()
    const attrappe = baueAttrappe(u)
    const { basisUrl, schliessen } = await starteServer(u, attrappe.fn)
    try {
      const workflowId = registriereFixture(u, await legeAuftragAn(basisUrl))
      const detail0 = await (await fetch(`${basisUrl}/api/workflows/${workflowId}`)).json()
      registriereKernArtefakt(
        `arbeitsordner-${workflowId}`,
        leiteProfilReferenzAb(u.vorlage),
        { erzeuger: 'kern', schritt: 'arbeitsordner' },
        { arbeitsordner_schema: 'v0', workflow_id: workflowId, projekt_wurzel: u.repoWurzel, pfad: detail0.arbeitsordner.pfad, branch: detail0.arbeitsordner.branch, basis_commit: null, status: 'IN_VORBEREITUNG', grund: null, vorbereitung: null, aufraeumen: null, aktualisiert_am: new Date().toISOString() },
        [],
        { basisVerzeichnis: u.basisVerzeichnis, schreiber: () => {} }
      )
      const veraltet = await (await fetch(`${basisUrl}/api/workflows/${workflowId}`)).json()
      assert.equal(veraltet.arbeitsordner.status, 'FEHLGESCHLAGEN')
      assert.match(veraltet.arbeitsordner.grund, /Serverneustart/)
      const liste = await (await fetch(`${basisUrl}/api/arbeitsordner`)).json()
      assert.equal(liste.arbeitsordner[0].status, 'FEHLGESCHLAGEN')
      assert.equal((await (await fetch(`${basisUrl}/api/workflows/${workflowId}/starten`, { method: 'POST' })).json()).vorbereitung, true)
      assert.ok(await warteAufArbeitsordner(basisUrl, workflowId, 'BEREIT'))
    } finally {
      await schliessen()
      raeumeVerzeichnis(u.basis)
    }
  })

  it('zweiter Start während der Vorbereitung: idempotent 202, genau eine Vorbereitung', async () => {
    const u = baueUmgebung({ packageJson: { name: 'x', version: '1.0.0' } })
    writeFileSync(join(u.repoWurzel, 'package-lock.json'), '{"lockfileVersion":3}\n')
    git(u.repoWurzel, ['add', 'package-lock.json'])
    git(u.repoWurzel, ['commit', '--quiet', '-m', 'lock'])
    let freigeben
    const sperre = new Promise((r) => {
      freigeben = r
    })
    let npmAufrufe = 0
    const attrappe = baueAttrappe(u)
    const { basisUrl, schliessen } = await starteServer(u, attrappe.fn, {
      arbeitsordnerNpm: async () => {
        npmAufrufe++
        await sperre
        return { code: 0, stdout: '', stderr: '', zeitueberschritten: false }
      },
    })
    try {
      const workflowId = registriereFixture(u, await legeAuftragAn(basisUrl))
      assert.equal((await (await fetch(`${basisUrl}/api/workflows/${workflowId}/starten`, { method: 'POST' })).json()).vorbereitung, true)
      await warteBis(() => npmAufrufe === 1)
      const zweiter = await fetch(`${basisUrl}/api/workflows/${workflowId}/starten`, { method: 'POST' })
      const zweiterKoerper = await zweiter.json()
      assert.equal(zweiter.status, 202)
      assert.equal(zweiterKoerper.vorbereitung, true)
      assert.equal(zweiterKoerper.arbeitsordner.vorbereitungLaeuft, true)
      freigeben()
      assert.ok(await warteAufArbeitsordner(basisUrl, workflowId, 'BEREIT'))
      assert.equal(npmAufrufe, 1)
      assert.equal(attrappe.aufrufe.length, 0)
    } finally {
      freigeben()
      await schliessen()
      raeumeVerzeichnis(u.basis)
    }
  })

  it('keine Löschung bei VERWEIGERT', async () => {
    const u = baueUmgebung()
    const attrappe = baueAttrappe(u, { ergebnistext: 'x\n\n```zu_loeschen\n{ "zu_loeschen": ["alt.txt"] }\n```\n' })
    const verweigert = async (...argumente) => {
      await attrappe.fn(...argumente)
      return { ok: true, klassifikation: { ergebnis: 'VERWEIGERT', bypass_verdacht_anzahl: 0 }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'VERWEIGERT' } }
    }
    const { basisUrl, schliessen } = await starteServer(u, verweigert)
    try {
      const workflowId = registriereFixture(u, await legeAuftragAn(basisUrl))
      await fetch(`${basisUrl}/api/workflows/${workflowId}/starten`, { method: 'POST' })
      const detail = await warteAufArbeitsordner(basisUrl, workflowId, 'BEREIT')
      await fetch(`${basisUrl}/api/workflows/${workflowId}/starten`, { method: 'POST' })
      await warteBis(() => ladeWorkflow(u, workflowId).daten.status !== 'LAEUFT')
      assert.equal(existsSync(join(detail.arbeitsordner.pfad, 'alt.txt')), true)
    } finally {
      await schliessen()
      raeumeVerzeichnis(u.basis)
    }
  })

  it('der reale Server schaltet den Arbeitsordner ein (CLI-Bindeblock und Projektinstanzen)', () => {
    const quelle = readFileSync('scripts/leitstand-server.mjs', 'utf8')
    const karte = quelle.slice(quelle.indexOf('export function baueProjektHandlerMap'), quelle.indexOf('export function loeseProjektPfade'))
    assert.match(karte, /arbeitsordner: true,/)
    assert.match(quelle, /const defaultHandler = erzeugeRequestHandler\(\{[^\n]*arbeitsordner: true \}\)/)
    assert.match(quelle, /^ {4}arbeitsordner = false,$/m, 'Standard aus für Gate-Instanzen')
  })

  it('Bestand: schreibender Schritt lief ohne Artefakt → Folgeschritt läuft wie bisher im Projektordner', async () => {
    const u = baueUmgebung()
    const attrappe = baueAttrappe(u, { schreibe: () => {} })
    const { basisUrl, schliessen } = await starteServer(u, attrappe.fn)
    try {
      const schritt = (id, nachfolger, extra) => ({
        schritt_id: id,
        rolle: 'ausfuehrung',
        werkzeugsatz: 'schreibend',
        worker: 'claude-code',
        modell: 'claude-sonnet-5',
        eingaben: [],
        output_schema: null,
        freigabe: 'ZWINGEND',
        freigabe_erteilt: true,
        risiko: 'Test.',
        zeitgrenze_ms: 600000,
        nachfolger,
        status: 'OFFEN',
        lauf_id: null,
        ...extra,
      })
      const workflowId = registriereFixture(u, await legeAuftragAn(basisUrl), {
        schritte: [schritt('schritt-1-ausfuehrung', 'schritt-2-ausfuehrung', { status: 'ERFOLGREICH', lauf_id: 'alter-lauf' }), schritt('schritt-2-ausfuehrung', null)],
        aktiverSchrittId: 'schritt-2-ausfuehrung',
        status: 'LAEUFT',
      })
      const detail = await (await fetch(`${basisUrl}/api/workflows/${workflowId}`)).json()
      assert.equal(detail.arbeitsordner.status, 'bestand')
      const start = await fetch(`${basisUrl}/api/workflows/${workflowId}/starten`, { method: 'POST' })
      const startKoerper = await start.json()
      assert.equal(start.status, 202, JSON.stringify(startKoerper))
      assert.ok(startKoerper.laufId, 'startet sofort, ohne Vorbereitung')
      await warteBis(() => attrappe.aufrufe.length > 0)
      assert.equal(attrappe.aufrufe[0].cwd, undefined, 'Kindprozess im Projektordner (Instanz-cwd)')
      assert.equal(attrappe.aufrufe[0].settingsPfad, undefined)
      assert.equal(existsSync(join(u.basis, 'projekt-laeufe')), false)
      await warteBis(() => ladeWorkflow(u, workflowId).daten.status !== 'LAEUFT')
    } finally {
      await schliessen()
      raeumeVerzeichnis(u.basis)
    }
  })

  it('Regel 1j liest die package.json-Skripte des Worktrees (Lauf ändert sie dort → Halt)', async () => {
    const u = baueUmgebung({ packageJson: { name: 'x', version: '1.0.0', scripts: { check: 'node -e 1' } } })
    const attrappe = baueAttrappe(u, {
      schreibe: (cwd) => writeFileSync(join(cwd, 'package.json'), `${JSON.stringify({ name: 'x', version: '1.0.0', scripts: { check: 'node -e 0' } }, null, 2)}
`),
    })
    const { basisUrl, schliessen } = await starteServer(u, attrappe.fn)
    try {
      const workflowId = registriereFixture(u, await legeAuftragAn(basisUrl))
      await fetch(`${basisUrl}/api/workflows/${workflowId}/starten`, { method: 'POST' })
      await warteAufArbeitsordner(basisUrl, workflowId, 'BEREIT')
      await fetch(`${basisUrl}/api/workflows/${workflowId}/starten`, { method: 'POST' })
      const halt = await warteBis(() => {
        const daten = ladeWorkflow(u, workflowId).daten
        return daten.status === 'KLAERUNG_ERFORDERLICH' ? daten : null
      })
      assert.ok(halt, 'Workflow hält an')
      assert.match(halt.grund, /Prüfkette durch den Lauf verändert/)
      assert.match(readFileSync(join(u.repoWurzel, 'package.json'), 'utf8'), /node -e 1/)
    } finally {
      await schliessen()
      raeumeVerzeichnis(u.basis)
    }
  })

  it('„Prüfung wiederholen“ läuft im Worktree', async () => {
    const u = baueUmgebung({
      pruefSkript: 'const fs=require("fs"); fs.appendFileSync(CWDDATEI, process.cwd() + "\\n"); if (!fs.existsSync(ZAEHLER)) { fs.writeFileSync(ZAEHLER, "1"); process.exit(1) } process.exit(0)',
    })
    const attrappe = baueAttrappe(u)
    const { basisUrl, schliessen } = await starteServer(u, attrappe.fn)
    try {
      const workflowId = registriereFixture(u, await legeAuftragAn(basisUrl))
      await fetch(`${basisUrl}/api/workflows/${workflowId}/starten`, { method: 'POST' })
      const detail = await warteAufArbeitsordner(basisUrl, workflowId, 'BEREIT')
      const pfad = detail.arbeitsordner.pfad
      await fetch(`${basisUrl}/api/workflows/${workflowId}/starten`, { method: 'POST' })
      const halt = await warteBis(() => (ladeWorkflow(u, workflowId).daten.status === 'KLAERUNG_ERFORDERLICH' ? true : null))
      assert.ok(halt, 'Workflow hält nach ROT an')
      const wiederholt = await fetch(`${basisUrl}/api/workflows/${workflowId}/pruefung-wiederholen`, { method: 'POST', body: JSON.stringify({ begruendung: 'Flake' }) })
      assert.ok(wiederholt.status < 300, await wiederholt.text())
      const zeilen = await warteBis(() => {
        const z = readFileSync(u.cwdDatei, 'utf8').trim().split('\n')
        return z.length === 2 ? z : null
      })
      assert.ok(zeilen, 'zwei Prüfläufe')
      assert.ok(zeilen.every((zeile) => zeile === pfad), zeilen.join(' | '))
    } finally {
      await schliessen()
      raeumeVerzeichnis(u.basis)
    }
  })
})
