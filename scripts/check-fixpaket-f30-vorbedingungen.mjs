#!/usr/bin/env node
/**
 * Datei: scripts/check-fixpaket-f30-vorbedingungen.mjs
 *
 * Zweck: Gate für das Fixpaket vor dem F35-Reallauf/F30 (state/findings.md F-689, F-713, F-683,
 * F-734; F-718 ist in src/workflow/workflow.test.ts belegt). Damit der Reallauf und später F30
 * nicht gegen bekannte Fehler messen.
 *
 * (a)–(e) laufen als ECHTER HTTP-Rundlauf (Muster scripts/check-f35-ws3-adjust-automatik.mjs): je
 * Fall ein Wegwerf-Git-Repo als "Fremdprojekt", ein echter Testserver, ein zweistufiger Workflow
 * (ausfuehrung ZWINGEND mit erteilter Freigabe -> code-reviewer AUTOMATISCH), gestubbter Worker.
 * Der ausfuehrung-Stub verändert das Repo real und registriert eine echte Laufakte mit Ergebnistext
 * — Änderungsübersicht, Rückfrage-Heuristik und Prüfketten-Vergleich laufen also am realen
 * Nachlauf-Pfad des Servers (starteLaufUndVergiss → ermittleNaechstenSchritt).
 * (a) ausfuehrung ohne Dateiänderung, Text endet mit "Wie soll ich vorgehen?" → KLAERUNG_ERFORDERLICH,
 *     der Grund nennt die Fragezeile, der Review startet nicht (F-689). Der Stub legt dabei einen
 *     untracked Eintrag unter kontrollzustand/ an — wie jeder Lauf, wenn ai-workforce an sich selbst
 *     arbeitet; Ausnahme-Pfade der Startprüfung zählen nicht als Dateiänderung.
 * (b) ausfuehrung mit Dateiänderung und einem "?" im Text → kein Halt durch F-689, Review startet.
 * (c) ausfuehrung ändert package.json scripts → Halt durch Regel 1j (F-713).
 * (d) ausfuehrung ändert eine bestehende scripts/check-x.mjs → Halt durch Regel 1j.
 * (e) ausfuehrung legt nur eine neue scripts/check-neu.mjs an → kein Halt durch 1j, Review startet.
 * (f) zusätzlich über HTTP, (g) auf Unit-Ebene:
 * (f) GET /api/laeufe/<laufId> eines Servers mit repoWurzel ≠ installWurzel (Fremdprojekt) liefert
 *     die Rohstrom-Projektion 'ok' — die Datei liegt unter der installWurzel (F-683). Ein Rückfall an
 *     der Aufrufstelle (repoWurzel statt installWurzel) würde hier 'nicht_verfuegbar' liefern.
 * (g) validiereWorkflowDaten lehnt einen schreibenden AUTOMATISCH-Schritt ab (F-734); jede Vorlage
 *     unter workflow-vorlagen/ bleibt gültig.
 *
 * (h)–(l) F-735 (Regel 1j stack-unabhängig), ebenfalls als echter HTTP-Rundlauf:
 * (h) Umbenennung scripts/check-x.mjs → tools/x.mjs (git mv) → Halt 1j über alter_pfad.
 * (i) Änderung an einer bestehenden biome.json → Halt 1j (Default-Liste).
 * (j) Fremdprojekt mit pruefketten_pfade ["pyproject.toml", "tests/**"], Änderung an pyproject.toml → Halt 1j.
 * (k) Dasselbe Fremdprojekt, nur eine neue tests/test_neu.py → kein Halt, Review startet.
 * (l) Stack-Entscheidung erfasst, CLAUDE.md+ADR gepflegt, Startvorlage ohne pruefketten_pfade →
 *     Halt 1h mit eigenem Grund (Grün-Gegenfall: check-f42-projekt-harness.mjs (h3)).
 * (l2) Wie (l), aber pruefketten_pfade: [] → ebenfalls Halt 1h (eine leere Liste erfüllt die Pflicht nicht).
 * (m) Startvorlage liegt committet im Repo, der Lauf trägt selbst pruefketten_pfade ein → Halt 1j.
 *
 * Wichtig: Jeder HTTP-Fall bekommt ein EIGENES Wegwerf-Repo und einen eigenen Server — die
 * Änderungsübersicht vergleicht gegen HEAD, ein geteiltes Repo trüge Änderungen eines Falls in den
 * nächsten. Der schreibende Schritt trägt 'ZWINGEND' mit bereits erteilter Freigabe (F-734).
 *
 * Wird aufgerufen von: `npm run check`.
 *
 * Aufruf: node scripts/check-fixpaket-f30-vorbedingungen.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { schreibeWirkungsmarke, sha256Hex } from '../src/checkpoint-store/index.ts'
import { ladeArtefaktVersion, registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { registriereWorkflow, validiereWorkflowDaten } from '../src/workflow/index.ts'
import { registriereWorkflowEntscheidung } from './leitstand/routen-f39.mjs'
import { erzeugeRequestHandler } from './leitstand-server.mjs'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []
console.log('\n=== Fixpaket-F30-Vorbedingungen-Check ===\n')

const STILL = () => {}
const INSTALL_WURZEL = process.cwd()

/** Führt einen git-Befehl im Wegwerf-Repo aus. @returns stdout */
function git(repoWurzel, argumente) {
  return execFileSync('git', argumente, { cwd: repoWurzel, encoding: 'utf8' })
}

/**
 * Wegwerf-"Fremdprojekt" mit package.json-scripts und einem bestehenden Gate, NICHT auf main (E-F39-1=B).
 * @param zusatzDateien - weitere, mit committete Dateien { relativerPfad: inhalt } (F-735: biome.json, pyproject.toml)
 * @returns absoluter Pfad
 */
function baueFremdprojekt(zusatzDateien = {}) {
  const repoWurzel = mkdtempSync(join(tmpdir(), 'fixpaket-f30-repo-'))
  git(repoWurzel, ['init', '--quiet', '-b', 'wegwerf-branch'])
  git(repoWurzel, ['config', 'user.email', 'gate@example.invalid'])
  git(repoWurzel, ['config', 'user.name', 'Gate'])
  git(repoWurzel, ['config', 'core.autocrlf', 'false'])
  writeFileSync(join(repoWurzel, 'package.json'), `${JSON.stringify({ name: 'fremd', scripts: { check: 'node scripts/check-x.mjs' } }, null, 2)}\n`)
  mkdirSync(join(repoWurzel, 'scripts'), { recursive: true })
  writeFileSync(join(repoWurzel, 'scripts', 'check-x.mjs'), "console.log('x')\n")
  writeFileSync(join(repoWurzel, 'bestehend.txt'), 'Zeile 1\n')
  for (const [pfad, inhalt] of Object.entries(zusatzDateien)) {
    mkdirSync(dirname(join(repoWurzel, pfad)), { recursive: true })
    writeFileSync(join(repoWurzel, pfad), inhalt)
  }
  git(repoWurzel, ['add', '-A'])
  git(repoWurzel, ['commit', '--quiet', '-m', 'init'])
  return repoWurzel
}

// Codex braucht einen resolvierbaren (nicht notwendig existierenden) Startziel-Pfad (Muster check-f35-ws3).
const CODEX_BLOCK = { codex: { startziel: [String.raw`C:\fixpaket-f30-gate-dummy\codex.exe`], versionDeklariert: 'codex-cli-gate-fixture', sandbox: 'read-only' } }

/**
 * Schreibt eine Wegwerf-Startvorlage (beispielprojekt + Codex-Block).
 * @param zusatz - weitere Startvorlagenfelder (F-735: pruefketten_pfade)
 * @returns Pfad der Startvorlage
 */
function schreibeStartvorlage(verzeichnis, zusatz = {}) {
  const basis = ladeStartvorlage('startvorlagen/beispielprojekt.json')
  const pfad = join(verzeichnis, `startvorlage-${randomUUID()}.json`)
  writeFileSync(pfad, JSON.stringify({ ...basis, worker: CODEX_BLOCK, ...zusatz }, null, 2))
  return pfad
}

/** Zweistufiger Workflow: ausfuehrung (schreibend, ZWINGEND, Freigabe erteilt) -> code-reviewer (AUTOMATISCH). @returns workflowId */
function baueWorkflowFixture(basisVerzeichnis, profilReferenz, auftragId) {
  const workflowId = `fixpaket-f30-gate-${randomUUID()}`
  registriereWorkflow(
    {
      workflow_schema: 'v0',
      workflow_id: workflowId,
      auftrag_id: auftragId,
      version: 1,
      ziel: 'Fixpaket-F30-Gate-Fixture.',
      status: 'OFFEN',
      aktiver_schritt_id: 'schritt-1-ausfuehrung',
      grenzen: { max_schritte: 6, max_replans: 1 },
      schritte: [
        {
          schritt_id: 'schritt-1-ausfuehrung',
          rolle: 'ausfuehrung',
          werkzeugsatz: 'schreibend',
          worker: 'claude-code',
          modell: 'claude-sonnet-5',
          eingaben: [],
          output_schema: null,
          freigabe: 'ZWINGEND',
          freigabe_erteilt: true,
          risiko: 'Gate-Fixture, kein reales Risiko.',
          zeitgrenze_ms: 600000,
          nachfolger: 'schritt-2-review',
          status: 'OFFEN',
          lauf_id: null,
        },
        {
          schritt_id: 'schritt-2-review',
          rolle: 'code-reviewer',
          werkzeugsatz: 'lesend',
          worker: 'codex',
          modell: 'gpt-6-astra',
          eingaben: [],
          output_schema: 'ergebnis-code-reviewer',
          freigabe: 'AUTOMATISCH',
          risiko: 'Gate-Fixture, kein reales Risiko.',
          zeitgrenze_ms: 600000,
          nachfolger: null,
          status: 'OFFEN',
          lauf_id: null,
        },
      ],
    },
    profilReferenz,
    { basisVerzeichnis, schreiber: STILL }
  )
  return workflowId
}

/** Registriert real eine Laufakte, deren Rohstrom das gegebene Ergebnis trägt (Muster check-f35-ws3 baueAttrappe). */
function registriereLaufakteMitErgebnis(basisVerzeichnis, profilReferenz, laufId, ergebnistext) {
  mkdirSync(basisVerzeichnis, { recursive: true })
  const rohstromPfad = join(basisVerzeichnis, `${laufId}-rohstrom.json`)
  writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: ergebnistext }) }), 'utf8')
  registriereKernArtefakt(`laufakte-${laufId}`, profilReferenz, { erzeuger: 'check-fixpaket-f30-fake' }, { worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad } }, undefined, {
    basisVerzeichnis,
    schreiber: STILL,
  })
}

/** Wartet ms Millisekunden. @returns Promise, das nach ms auflöst */
function verzoegerung(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const REVIEW_BEREIT = JSON.stringify({ urteil: 'BEREIT', befunde: [], empfehlung: 'Gate-Fixture: bereit.', ak_urteile: [] })

/**
 * Führt einen Fall (a)–(e) als echten HTTP-Rundlauf durch.
 * @param bezeichnung - Fallkennung für Befundtexte
 * @param veraendereRepo - Wirkung des ausfuehrung-Stubs auf das Fremdprojekt (repoWurzel) => void
 * @param ergebnistext - Ergebnistext, den der ausfuehrung-Lauf meldet
 * @param optionen - F-735: { zusatzDateien } für baueFremdprojekt, { startvorlageZusatz } für schreibeStartvorlage, { startvorlageImRepo } legt die Startvorlage committet unter startvorlagen/ im Repo ab
 * @returns { status, grund, reviewGestartet } oder null bei Vorbedingungsfehler (dann bereits in befunde)
 */
async function fuehreFallDurch(bezeichnung, veraendereRepo, ergebnistext, optionen = {}) {
  const basisVerzeichnis = `kontrollzustand-test-fixpaket-f30-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const repoWurzel = baueFremdprojekt(optionen.zusatzDateien)
  const verzeichnis = mkdtempSync(join(tmpdir(), 'fixpaket-f30-vorlage-'))
  // F-735 (m): optional liegt die Startvorlage wie bei einem echten Projekt IM Repo (committet).
  const vorlagenOrt = optionen.startvorlageImRepo ? join(repoWurzel, 'startvorlagen') : verzeichnis
  mkdirSync(vorlagenOrt, { recursive: true })
  const startvorlagePfad = schreibeStartvorlage(vorlagenOrt, optionen.startvorlageZusatz)
  if (optionen.startvorlageImRepo) {
    git(repoWurzel, ['add', '-A'])
    git(repoWurzel, ['commit', '--quiet', '-m', 'startvorlage'])
  }
  const profilReferenz = leiteProfilReferenzAb(ladeStartvorlage(startvorlagePfad))
  let reviewGestartet = false

  const fuehreAufgabeDurchFn = async (laufId, _profilReferenz, eingaben) => {
    if (eingaben.rolle === 'ausfuehrung') {
      veraendereRepo(repoWurzel)
      registriereLaufakteMitErgebnis(basisVerzeichnis, profilReferenz, laufId, ergebnistext)
    }
    if (eingaben.rolle === 'code-reviewer') {
      reviewGestartet = true
      registriereLaufakteMitErgebnis(basisVerzeichnis, profilReferenz, laufId, REVIEW_BEREIT)
    }
    return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
  }

  const server = createServer(erzeugeRequestHandler({ basisVerzeichnis, fuehreAufgabeDurchFn, repoWurzel, installWurzel: INSTALL_WURZEL, startvorlagePfad }))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const basisUrl = `http://127.0.0.1:${server.address().port}`
  try {
    const auftragAntwort = await fetch(`${basisUrl}/api/auftraege`, {
      method: 'POST',
      body: JSON.stringify({ titel: `Fixpaket-F30-Gate ${bezeichnung}`, auftragstext: 'GATE-AUFTRAG-FIXPAKET-F30' }),
    })
    const { auftragId } = await auftragAntwort.json().catch(() => ({}))
    if (auftragAntwort.status !== 201 || typeof auftragId !== 'string') {
      befunde.push(`${bezeichnung}: Vorbedingung POST /api/auftraege erwartet 201 mit auftragId, erhalten ${auftragAntwort.status}`)
      return null
    }
    const workflowId = baueWorkflowFixture(basisVerzeichnis, profilReferenz, auftragId)
    const start = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
    if (start.status !== 202) {
      befunde.push(`${bezeichnung}: Vorbedingung POST .../starten erwartet 202, erhalten ${start.status} (${await start.text()})`)
      return null
    }
    const startzeit = Date.now()
    let daten = null
    while (Date.now() - startzeit < 5000) {
      daten = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis, schreiber: STILL })?.daten ?? null
      if (daten !== null && daten.status !== 'LAEUFT' && daten.status !== 'OFFEN') break
      await verzoegerung(50)
    }
    return { status: daten?.status ?? null, grund: daten?.grund ?? null, reviewGestartet }
  } finally {
    await new Promise((resolve) => server.close(resolve))
    raeumeVerzeichnis(basisVerzeichnis)
    raeumeVerzeichnis(repoWurzel)
    raeumeVerzeichnis(verzeichnis)
  }
}

// ─── (a) Rückfrage ohne Dateiänderung → Halt, Review startet nicht (F-689) ─────────────────────
{
  const frage = 'Frage an dich: Wie soll ich vorgehen?'
  const legeKontrollzustandAn = (repo) => {
    mkdirSync(join(repo, 'kontrollzustand', 'lineage-laufakte-gate'), { recursive: true })
    writeFileSync(join(repo, 'kontrollzustand', 'lineage-laufakte-gate', 'v1.json'), '{}')
  }
  const ergebnis = await fuehreFallDurch('(a)', legeKontrollzustandAn, `Ich habe den Auftrag geprüft, aber zwei Lesarten gefunden.\n\n${frage}`)
  if (ergebnis !== null) {
    if (ergebnis.status !== 'KLAERUNG_ERFORDERLICH' || ergebnis.reviewGestartet || !(ergebnis.grund ?? '').includes(frage)) {
      befunde.push(`(a) Rückfrage ohne Dateiänderung: erwartet KLAERUNG_ERFORDERLICH, kein Review, Grund mit der Fragezeile — erhalten ${JSON.stringify(ergebnis)}`)
    } else {
      console.log('✓ (a) Rückfrage ohne Dateiänderung hält auf KLAERUNG_ERFORDERLICH, der Grund nennt die Fragezeile, der Review startet nicht (F-689).')
    }
  }
}

// ─── (b) Dateiänderung + "?" im Text → kein Halt durch F-689 ──────────────────────────────────
{
  const ergebnis = await fuehreFallDurch('(b)', (repo) => writeFileSync(join(repo, 'bestehend.txt'), 'Zeile 1\nZeile 2\n'), 'Zeile ergänzt. Passt das so?')
  if (ergebnis !== null) {
    if (!ergebnis.reviewGestartet || /F-689|Rückfrage/.test(ergebnis.grund ?? '')) {
      befunde.push(`(b) Dateiänderung mit "?" im Text: erwartet kein F-689-Halt, Review startet — erhalten ${JSON.stringify(ergebnis)}`)
    } else {
      console.log(`✓ (b) Dateiänderung mit "?" im Text: kein Halt durch F-689, der Review startet (Endstatus ${ergebnis.status}).`)
    }
  }
}

// ─── (c) package.json scripts verändert → Halt 1j (F-713) ─────────────────────────────────────
{
  const ergebnis = await fuehreFallDurch(
    '(c)',
    (repo) => writeFileSync(join(repo, 'package.json'), `${JSON.stringify({ name: 'fremd', scripts: { check: 'node scripts/check-x.mjs && node scripts/check-neu.mjs' } }, null, 2)}\n`),
    'Prüfkette erweitert.'
  )
  if (ergebnis !== null) {
    if (ergebnis.status !== 'KLAERUNG_ERFORDERLICH' || ergebnis.reviewGestartet || !/Prüfkette durch den Lauf verändert: package\.json \(scripts\)/.test(ergebnis.grund ?? '')) {
      befunde.push(`(c) package.json scripts verändert: erwartet Halt durch Regel 1j — erhalten ${JSON.stringify(ergebnis)}`)
    } else {
      console.log('✓ (c) Eine Änderung an package.json scripts hält an (Regel 1j), der Review startet nicht.')
    }
  }
}

// ─── (d) bestehendes Gate verändert → Halt 1j ─────────────────────────────────────────────────
{
  const ergebnis = await fuehreFallDurch('(d)', (repo) => writeFileSync(join(repo, 'scripts', 'check-x.mjs'), "process.exit(0)\n"), 'Gate vereinfacht.')
  if (ergebnis !== null) {
    if (ergebnis.status !== 'KLAERUNG_ERFORDERLICH' || ergebnis.reviewGestartet || !/Prüfkette durch den Lauf verändert: scripts\/check-x\.mjs \(GEAENDERT\)/.test(ergebnis.grund ?? '')) {
      befunde.push(`(d) bestehendes Gate verändert: erwartet Halt durch Regel 1j — erhalten ${JSON.stringify(ergebnis)}`)
    } else {
      console.log('✓ (d) Eine Änderung an einem bestehenden scripts/check-*.mjs hält an (Regel 1j).')
    }
  }
}

// ─── (e) nur ein neues Gate → kein Halt durch 1j ──────────────────────────────────────────────
{
  const ergebnis = await fuehreFallDurch('(e)', (repo) => writeFileSync(join(repo, 'scripts', 'check-neu.mjs'), "console.log('neu')\n"), 'Neues Gate angelegt.')
  if (ergebnis !== null) {
    if (!ergebnis.reviewGestartet || /Prüfkette/.test(ergebnis.grund ?? '')) {
      befunde.push(`(e) nur ein neues Gate: erwartet kein Halt durch Regel 1j, Review startet — erhalten ${JSON.stringify(ergebnis)}`)
    } else {
      console.log(`✓ (e) Ein nur neu angelegtes scripts/check-neu.mjs löst Regel 1j nicht aus, der Review startet (Endstatus ${ergebnis.status}).`)
    }
  }
}

// ─── (f) Rohstrom-Projektion eines Fremdprojekt-Laufs über GET /api/laeufe/<id> (F-683) ─────────
{
  const installWurzel = mkdtempSync(join(tmpdir(), 'fixpaket-f30-install-'))
  const projektWurzel = mkdtempSync(join(tmpdir(), 'fixpaket-f30-projekt-'))
  const basisVerzeichnis = join(projektWurzel, 'kontrollzustand')
  const profilReferenz = leiteProfilReferenzAb(ladeStartvorlage('startvorlagen/beispielprojekt.json'))
  const laufId = `fixpaket-f30-f-${randomUUID()}`
  // Laufkette (Muster check-f12-leitstand-ansicht.mjs (d)): Wirkungsmarke + Laufakte.
  schreibeWirkungsmarke(laufId, profilReferenz, 'run_prepared', {}, { basisVerzeichnis, schreiber: STILL })
  const inhalt = JSON.stringify({ werkzeugStartziel: ['claude'], stdout: '', stderr: '', exitCode: 0, startfehler: null })
  mkdirSync(join(installWurzel, 'kontrollzustand-roh', laufId), { recursive: true })
  writeFileSync(join(installWurzel, 'kontrollzustand-roh', laufId, 'rohstrom.json'), inhalt, 'utf8')
  registriereKernArtefakt(
    `laufakte-${laufId}`,
    profilReferenz,
    { erzeuger: 'kern', schritt: 'check-fixpaket-f30-f-fixture' },
    {
      laufakte_schema: 'v0',
      lauf_id: laufId,
      werkzeug_version_deklariert: 'test-version',
      berechtigungskontext: 'test-kontext',
      arbeitsverzeichnis_pfad: projektWurzel,
      modell_beobachtet: null,
      beobachtungsbasis_vollstaendig: false,
      rohstrom_referenz: { pfad: join('kontrollzustand-roh', laufId, 'rohstrom.json'), inhalts_hash: sha256Hex(inhalt) },
      erstellt_am: new Date().toISOString(),
    },
    [],
    { basisVerzeichnis, schreiber: STILL }
  )
  const server = createServer(erzeugeRequestHandler({ basisVerzeichnis, repoWurzel: projektWurzel, installWurzel }))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    const antwort = await fetch(`http://127.0.0.1:${server.address().port}/api/laeufe/${encodeURIComponent(laufId)}`)
    const koerper = await antwort.json().catch(() => ({}))
    if (antwort.status !== 200 || koerper.rohstrom?.status !== 'ok' || koerper.rohstrom.exitCode !== 0) {
      befunde.push(`(f) GET /api/laeufe/<id> mit repoWurzel ≠ installWurzel: erwartet rohstrom.status 'ok', erhalten ${antwort.status} ${JSON.stringify(koerper.rohstrom)}`)
    } else {
      console.log("✓ (f) GET /api/laeufe/<id> eines Fremdprojekt-Laufs (repoWurzel ≠ installWurzel) findet die Rohstrom-Datei unter der installWurzel ('ok', F-683).")
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
    raeumeVerzeichnis(installWurzel)
    raeumeVerzeichnis(projektWurzel)
  }
}

// ─── (g) Validator: schreibend ⇒ ZWINGEND; alle Vorlagen gültig (F-734) ────────────────────────
{
  const vor = befunde.length
  const schritt = (freigabe) => ({
    schritt_id: 'schritt-1',
    rolle: 'ausfuehrung',
    werkzeugsatz: 'schreibend',
    worker: 'claude-code',
    modell: 'gate-modell',
    eingaben: [],
    output_schema: null,
    freigabe,
    risiko: 'Gate-Fixture.',
    zeitgrenze_ms: 600000,
    nachfolger: null,
    status: 'OFFEN',
    lauf_id: null,
  })
  const workflow = (freigabe) => ({
    workflow_schema: 'v0',
    workflow_id: 'gate-f734',
    auftrag_id: 'gate-f734-auftrag',
    version: 1,
    ziel: 'F-734-Gate.',
    status: 'OFFEN',
    aktiver_schritt_id: 'schritt-1',
    grenzen: { max_schritte: 4, max_replans: 0 },
    schritte: [schritt(freigabe)],
  })
  const rot = validiereWorkflowDaten(workflow('AUTOMATISCH'))
  if (!rot.some((v) => v.includes('F-734'))) befunde.push(`(g) schreibend + AUTOMATISCH: erwartet einen F-734-Verstoß, erhalten ${JSON.stringify(rot)}`)
  const gruen = validiereWorkflowDaten(workflow('ZWINGEND'))
  if (gruen.length !== 0) befunde.push(`(g) schreibend + ZWINGEND: erwartet gültig, erhalten ${JSON.stringify(gruen)}`)
  for (const datei of readdirSync(join(INSTALL_WURZEL, 'workflow-vorlagen')).filter((name) => name.endsWith('.json'))) {
    const vorlage = JSON.parse(readFileSync(join(INSTALL_WURZEL, 'workflow-vorlagen', datei), 'utf8'))
    const verstoesse = validiereWorkflowDaten(vorlage)
    if (verstoesse.length !== 0) befunde.push(`(g) workflow-vorlagen/${datei} ist nicht mehr gültig: ${JSON.stringify(verstoesse)}`)
  }
  if (befunde.length === vor) console.log('✓ (g) Der Validator lehnt einen schreibenden AUTOMATISCH-Schritt ab (F-734); jede Vorlage unter workflow-vorlagen/ bleibt gültig.')
}

// ─── (h) Umbenennung AUS scripts/check-* heraus → Halt 1j (F-735, alter_pfad) ─────────────────
{
  const benenneUm = (repo) => {
    mkdirSync(join(repo, 'tools'), { recursive: true })
    git(repo, ['mv', 'scripts/check-x.mjs', 'tools/x.mjs'])
  }
  const ergebnis = await fuehreFallDurch('(h)', benenneUm, 'Gate verschoben.')
  if (ergebnis !== null) {
    if (ergebnis.status !== 'KLAERUNG_ERFORDERLICH' || ergebnis.reviewGestartet || !(ergebnis.grund ?? '').includes('scripts/check-x.mjs → tools/x.mjs (UMBENANNT)')) {
      befunde.push(`(h) Umbenennung scripts/check-x.mjs → tools/x.mjs: erwartet Halt durch Regel 1j mit altem und neuem Pfad — erhalten ${JSON.stringify(ergebnis)}`)
    } else {
      console.log('✓ (h) Eine Umbenennung aus scripts/check-* heraus (tools/x.mjs) hält an — Regel 1j wertet den alten Pfad aus (F-735).')
    }
  }
}

// ─── (i) Änderung an biome.json → Halt 1j über die Default-Liste (F-735) ──────────────────────
{
  const ergebnis = await fuehreFallDurch('(i)', (repo) => writeFileSync(join(repo, 'biome.json'), '{ "linter": { "enabled": false } }\n'), 'Lint entschärft.', {
    zusatzDateien: { 'biome.json': '{ "linter": { "enabled": true } }\n' },
  })
  if (ergebnis !== null) {
    if (ergebnis.status !== 'KLAERUNG_ERFORDERLICH' || ergebnis.reviewGestartet || !(ergebnis.grund ?? '').includes('biome.json (GEAENDERT)')) {
      befunde.push(`(i) Änderung an biome.json: erwartet Halt durch Regel 1j (Default-Liste) — erhalten ${JSON.stringify(ergebnis)}`)
    } else {
      console.log('✓ (i) Eine Änderung an biome.json hält an (Regel 1j, Default-Liste, F-735).')
    }
  }
}

// ─── (j)/(k) Fremdprojekt mit eigenen pruefketten_pfade (F-735) ──────────────────────────────
const PYTHON_OPTIONEN = {
  zusatzDateien: { 'pyproject.toml': '[tool.pytest.ini_options]\naddopts = "-q"\n', 'tests/test_alt.py': 'def test_alt():\n    assert True\n' },
  // 'tests/**' (QA-Befund): (k) legt eine NEUE Datei unter einem gelisteten Muster an — so belegt
  // (k) die NEU-Ausnahme, nicht nur einen Pfad außerhalb aller Muster.
  startvorlageZusatz: { pruefketten_pfade: ['pyproject.toml', 'tests/**'] },
}
{
  const ergebnis = await fuehreFallDurch('(j)', (repo) => writeFileSync(join(repo, 'pyproject.toml'), '[tool.pytest.ini_options]\naddopts = "-q --deselect tests"\n'), 'pytest-Konfiguration angepasst.', PYTHON_OPTIONEN)
  if (ergebnis !== null) {
    if (ergebnis.status !== 'KLAERUNG_ERFORDERLICH' || ergebnis.reviewGestartet || !(ergebnis.grund ?? '').includes('pyproject.toml (GEAENDERT)')) {
      befunde.push(`(j) Fremdprojekt, pruefketten_pfade ["pyproject.toml", "tests/**"], Änderung an pyproject.toml: erwartet Halt durch Regel 1j — erhalten ${JSON.stringify(ergebnis)}`)
    } else {
      console.log('✓ (j) Fremdprojekt mit pruefketten_pfade ["pyproject.toml", "tests/**"]: eine Änderung an pyproject.toml hält an (Regel 1j, F-735).')
    }
  }
}
{
  const ergebnis = await fuehreFallDurch('(k)', (repo) => writeFileSync(join(repo, 'tests', 'test_neu.py'), 'def test_neu():\n    assert True\n'), 'Neuer Test angelegt.', PYTHON_OPTIONEN)
  if (ergebnis !== null) {
    if (!ergebnis.reviewGestartet || /Prüfkette/.test(ergebnis.grund ?? '')) {
      befunde.push(`(k) Fremdprojekt, nur neue Datei tests/test_neu.py: erwartet kein Halt durch Regel 1j, Review startet — erhalten ${JSON.stringify(ergebnis)}`)
    } else {
      console.log(`✓ (k) Dasselbe Fremdprojekt: eine nur neu angelegte tests/test_neu.py löst Regel 1j nicht aus, der Review startet (Endstatus ${ergebnis.status}).`)
    }
  }
}

// ─── (m) Startvorlage im Repo, der Lauf trägt selbst pruefketten_pfade ein → Halt 1j (F-735) ────
// QA-/Review-Befund: sonst könnte ein Lauf Regel 1h selbst erfüllen oder Muster unbemerkt ändern.
{
  const setzeFeldSelbst = (repo) => {
    const ordner = join(repo, 'startvorlagen')
    const datei = join(ordner, readdirSync(ordner)[0])
    writeFileSync(datei, JSON.stringify({ ...JSON.parse(readFileSync(datei, 'utf8')), pruefketten_pfade: ['nichts'] }, null, 2))
  }
  const ergebnis = await fuehreFallDurch('(m)', setzeFeldSelbst, 'Startvorlage ergänzt.', { startvorlageImRepo: true })
  if (ergebnis !== null) {
    if (ergebnis.status !== 'KLAERUNG_ERFORDERLICH' || ergebnis.reviewGestartet || !/Prüfkette durch den Lauf verändert: startvorlagen\/startvorlage-[^ ]+\.json \(GEAENDERT\)/.test(ergebnis.grund ?? '')) {
      befunde.push(`(m) Lauf ändert die im Repo liegende Startvorlage: erwartet Halt durch Regel 1j — erhalten ${JSON.stringify(ergebnis)}`)
    } else {
      console.log('✓ (m) Ändert ein Lauf die im Projekt-Repo liegende Startvorlage (z. B. pruefketten_pfade), hält Regel 1j an (F-735).')
    }
  }
}

// ─── (l) Stack-Entscheidung ohne pruefketten_pfade in der Startvorlage → Halt 1h (F-735) ────────
// Muster scripts/check-f42-projekt-harness.mjs (h): Architekt-Schritt mit 'kategorie: stack' und
// erfasster menschlicher Entscheidung, danach der ausfuehrung-Schritt. Der Stub pflegt CLAUDE.md UND
// ein referenzierendes ADR (F-714 erfüllt) — der einzige offene Punkt ist das fehlende
// pruefketten_pfade. Der Grün-Gegenfall (Feld gesetzt → durch) steht dort als (h3). (l2): eine LEERE
// Liste erfüllt die Pflicht ebenfalls nicht (QA-Befund) — 1j sähe sonst wieder nur die Node-Default-Liste.
for (const [kennung, startvorlageZusatz] of [
  ['(l)', {}],
  ['(l2)', { pruefketten_pfade: [] }],
]) {
  const vor = befunde.length
  const basisVerzeichnis = `kontrollzustand-test-fixpaket-f30-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const repoWurzel = baueFremdprojekt({ 'CLAUDE.md': '# Projekt\n\n## 🏗️ Technischer Stack [FÜLLUNG]\n\nNoch nicht entschieden.\n' })
  const verzeichnis = mkdtempSync(join(tmpdir(), 'fixpaket-f30-vorlage-'))
  const startvorlagePfad = schreibeStartvorlage(verzeichnis, startvorlageZusatz)
  const profilReferenz = leiteProfilReferenzAb(ladeStartvorlage(startvorlagePfad))
  const ladeOptionen = { basisVerzeichnis, schreiber: STILL }
  const workflowId = `fixpaket-f30-gate-l-${randomUUID()}`
  const entscheidungArtefaktId = `workflow-entscheidung-${workflowId}`
  const STACK_ENTSCHEIDUNG = {
    frage: 'Welcher Stack?',
    optionen: [
      { titel: 'Python', vorteile: ['x'], nachteile: [] },
      { titel: 'TypeScript auf Node', vorteile: [], nachteile: ['x'] },
    ],
    auswirkung_bestand: 'keine',
    empfehlung: 'Python',
    begruendung: 'Gate-Fixture.',
    kategorie: 'stack',
  }
  const fuehreAufgabeDurchFn = async (laufId, _profilReferenz, eingaben) => {
    if (eingaben.rolle === 'ausfuehrung') {
      writeFileSync(join(repoWurzel, 'CLAUDE.md'), '# Projekt\n\n## 🏗️ Technischer Stack\n\nPython (Gate (l)).\n')
      mkdirSync(join(repoWurzel, 'docs', 'adr'), { recursive: true })
      writeFileSync(join(repoWurzel, 'docs', 'adr', '0001-stack.md'), `# ADR 0001: Stack\n\nEntscheidung: ${entscheidungArtefaktId}\n`)
      registriereLaufakteMitErgebnis(basisVerzeichnis, profilReferenz, laufId, 'Stack gepflegt.')
    }
    return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
  }
  const server = createServer(erzeugeRequestHandler({ basisVerzeichnis, fuehreAufgabeDurchFn, repoWurzel, installWurzel: INSTALL_WURZEL, startvorlagePfad }))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const basisUrl = `http://127.0.0.1:${server.address().port}`
  try {
    const auftragAntwort = await fetch(`${basisUrl}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel: 'Fixpaket-F30-Gate (l)', auftragstext: 'GATE-AUFTRAG-FIXPAKET-F30-L' }) })
    const { auftragId } = await auftragAntwort.json().catch(() => ({}))
    if (auftragAntwort.status !== 201 || typeof auftragId !== 'string') throw new Error(`POST /api/auftraege erwartet 201, erhalten ${auftragAntwort.status}`)

    const architektLaufId = `${workflowId}-architekt-lauf`
    const ergebnisArchitektur = {
      modus: 'feature',
      zusammenfassung: 'Gate-Fixture (F-735).',
      module: [],
      adr_entwuerfe: [],
      schema_entwuerfe: [],
      entscheidungen_mensch: [STACK_ENTSCHEIDUNG],
      capabilities_bedarf: [],
      evidenz: [{ marker: '[Fakt]', aussage: 'Gate-Fixture.' }],
    }
    registriereLaufakteMitErgebnis(basisVerzeichnis, profilReferenz, architektLaufId, JSON.stringify(ergebnisArchitektur))
    registriereWorkflowEntscheidung(basisVerzeichnis, workflowId, profilReferenz, 'schritt-1-architekt', [{ frage: STACK_ENTSCHEIDUNG.frage, gewaehlt: STACK_ENTSCHEIDUNG.empfehlung }], new Date().toISOString(), [])
    const gemeinsam = { risiko: 'Gate-Fixture.', zeitgrenze_ms: 600000 }
    registriereWorkflow(
      {
        workflow_schema: 'v0',
        workflow_id: workflowId,
        auftrag_id: auftragId,
        version: 1,
        ziel: 'Gate-Fixture (F-735, Regel 1h).',
        status: 'LAEUFT',
        aktiver_schritt_id: 'schritt-2-ausfuehrung',
        grund: null,
        grenzen: { max_schritte: 4, max_replans: 1 },
        schritte: [
          { schritt_id: 'schritt-1-architekt', rolle: 'architekt', werkzeugsatz: 'lesend', worker: 'codex', modell: 'gpt-6-astra', eingaben: [], output_schema: 'ergebnis-architektur', freigabe: 'ZWINGEND', ...gemeinsam, nachfolger: 'schritt-2-ausfuehrung', status: 'ERFOLGREICH', lauf_id: architektLaufId },
          {
            schritt_id: 'schritt-2-ausfuehrung',
            rolle: 'ausfuehrung',
            werkzeugsatz: 'schreibend',
            worker: 'claude-code',
            modell: 'claude-sonnet-5',
            eingaben: ['artefakt:ergebnis-@schritt-1-architekt', 'artefakt:entscheidung-@schritt-1-architekt'],
            output_schema: null,
            freigabe: 'ZWINGEND',
            freigabe_erteilt: true,
            ...gemeinsam,
            nachfolger: null,
            status: 'OFFEN',
            lauf_id: null,
          },
        ],
      },
      profilReferenz,
      ladeOptionen
    )
    const start = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
    if (start.status !== 202) throw new Error(`POST .../starten erwartet 202, erhalten ${start.status} (${await start.text()})`)
    const startzeit = Date.now()
    let daten = null
    while (Date.now() - startzeit < 5000) {
      daten = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, ladeOptionen)?.daten ?? null
      if (daten !== null && daten.status !== 'LAEUFT' && daten.status !== 'OFFEN') break
      await verzoegerung(50)
    }
    const grund = String(daten?.grund ?? '')
    if (daten?.status !== 'KLAERUNG_ERFORDERLICH' || !grund.includes('Stack entschieden, aber pruefketten_pfade in der Startvorlage fehlt') || grund.includes('F-714')) {
      befunde.push(`${kennung} Stack-Entscheidung, CLAUDE.md+ADR gepflegt, Startvorlage mit ${JSON.stringify(startvorlageZusatz)}: erwartet KLAERUNG_ERFORDERLICH allein mit dem F-735-Grund — erhalten status=${daten?.status} grund=${JSON.stringify(daten?.grund)}`)
    }
  } catch (fehler) {
    befunde.push(`${kennung} Vorbedingung gescheitert: ${fehler.message}`)
  } finally {
    await new Promise((resolve) => server.close(resolve))
    raeumeVerzeichnis(basisVerzeichnis)
    raeumeVerzeichnis(repoWurzel)
    raeumeVerzeichnis(verzeichnis)
  }
  if (befunde.length === vor) console.log(`✓ ${kennung} Stack entschieden, CLAUDE.md und ADR gepflegt, aber pruefketten_pfade ${kennung === '(l)' ? 'fehlt' : 'ist leer'} in der Startvorlage → Halt durch Regel 1h mit eigenem Grund (F-735).`)
}

// process.exitCode statt process.exit() (Muster check-f17-rollenvertrag.mjs): HTTP-Testserver
// haben zuvor geschrieben — ein hartes exit reißt unter Windows sonst schließende Handles weg.
console.log('')
if (befunde.length === 0) {
  console.log('✓ Keine Befunde.\n')
  process.exitCode = 0
} else {
  console.log(`✗ ${befunde.length} Befund(e):\n`)
  for (const b of befunde) console.log(`  - ${b}`)
  console.log('')
  process.exitCode = 1
}
