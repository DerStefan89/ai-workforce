/**
 * Datei: scripts/check-f656-pruefung-wiederholen.mjs
 *
 * Zweck: Gate für F-656 (state/findings.md F-656, BUG P1). Löst "ein
 * ROT/ZEITGRENZE/FEHLER-Prüfergebnis (Regel 1f, src/workflow/index.ts) hält
 * den Workflow endgültig an, obwohl die Ursache oft ein Flake ist — der
 * einzige Ausweg war bis hierher eine neue Workflow-Fassung mit demselben
 * Bau" (real beobachtet, F39 Versuch 4, Lauf 9397a9dd). Prüft den neuen
 * Endpunkt POST /api/workflows/<id>/pruefung-wiederholen:
 *
 * (a) falscher Zustand (Workflow nicht KLAERUNG_ERFORDERLICH) → 409, nichts
 *     geschrieben.
 * (b) KLAERUNG_ERFORDERLICH, aber NICHT aus Regel 1f (der Ausführungsschritt
 *     selbst ist nicht ERFOLGREICH — eine geheilte Ablehnung setzt ihn zurück
 *     auf OFFEN) → 409.
 * (c) Grünfall: derselbe pruefbefehl liefert beim zweiten Versuch GRUEN
 *     (Markerdatei-Trick) — neue Artefaktversion, Review startet automatisch
 *     über den bestehenden Fortsetzungsmechanismus.
 * (d) Rot-bleibt-rot: der Workflow hält erneut auf KLAERUNG_ERFORDERLICH,
 *     eine zweite Prüfergebnis-Version ist registriert, der Review startet
 *     NICHT.
 * (e) Artefakt-Historie: nach (d) trägt 'pruefergebnis-<laufId>' genau ZWEI
 *     Versionen (Append, keine Überschreibung).
 * (f) D13: ein paralleler Startversuch während die Wiederholung noch läuft
 *     wird mit 409 abgelehnt.
 *
 * Testkommandos sind durchgehend kleine node-Einzeiler (process.execPath,
 * keine Shell), Muster scripts/check-f652-pruefschritt.mjs.
 *
 * Aufruf: node scripts/check-f656-pruefung-wiederholen.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ladeArtefaktVersion, listeVersionen } from '../src/lineage-registry/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { registriereWorkflow } from '../src/workflow/index.ts'
import { erzeugeRequestHandler } from './leitstand-server.mjs'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []
console.log('\n=== F-656-Pruefung-Wiederholen-Check ===\n')

function git(repoWurzel, argumente) {
  return execFileSync('git', argumente, { cwd: repoWurzel, encoding: 'utf8' })
}

/** Wegwerf-Git-Repo, NICHT auf main/master (E-F39-1=B), mit einem ersten Commit. Muster check-f652-pruefschritt.mjs neuesRepo. */
function neuesRepo() {
  const repoWurzel = join(tmpdir(), `f656-gate-${randomUUID()}`)
  mkdirSync(repoWurzel, { recursive: true })
  git(repoWurzel, ['init', '--quiet'])
  git(repoWurzel, ['config', 'user.email', 'test@example.invalid'])
  git(repoWurzel, ['config', 'user.name', 'Test'])
  git(repoWurzel, ['branch', '-m', 'wegwerf-branch'])
  mkdirSync(join(repoWurzel, 'schemas'), { recursive: true })
  cpSync('schemas/ergebnis-code-reviewer.schema.json', join(repoWurzel, 'schemas', 'ergebnis-code-reviewer.schema.json'))
  writeFileSync(join(repoWurzel, 'bestehend.txt'), 'Zeile 1\n')
  git(repoWurzel, ['add', 'bestehend.txt', 'schemas/ergebnis-code-reviewer.schema.json'])
  git(repoWurzel, ['commit', '--quiet', '-m', 'init'])
  return repoWurzel
}

/** @returns { basisUrl, schliessen } eines echten HTTP-Testservers (Muster check-f652-pruefschritt.mjs). */
async function starteTestserver(optionen) {
  const server = createServer(erzeugeRequestHandler(optionen))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  return {
    basisUrl: `http://127.0.0.1:${port}`,
    schliessen: () => new Promise((resolve) => server.close(resolve)),
  }
}

function verzoegerung(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Pollt bis pruefen() true liefert oder die Zeit abläuft. @returns der letzte Rückgabewert von pruefen() */
async function warteBis(pruefen, maxWartezeitMs) {
  const start = Date.now()
  let wert = await pruefen()
  while (!wert && Date.now() - start < maxWartezeitMs) {
    await verzoegerung(50)
    wert = await pruefen()
  }
  return wert
}

/** argv-Präfix für einen node-Einzeiler ohne Shell. */
function knotenBefehl(...ausdruecke) {
  return [process.execPath, '-e', ...ausdruecke]
}

const CODEX_BLOCK = { codex: { startziel: [String.raw`C:\f656-gate-dummy\codex.exe`], versionDeklariert: 'codex-cli-gate-fixture', sandbox: 'read-only' } }

function schreibeStartvorlage(verzeichnis, zusatz = {}) {
  const basis = ladeStartvorlage('startvorlagen/beispielprojekt.json')
  const pfad = join(verzeichnis, `startvorlage-${randomUUID()}.json`)
  writeFileSync(pfad, JSON.stringify({ ...basis, worker: CODEX_BLOCK, ...zusatz }, null, 2))
  return pfad
}

/** Startbereiter zweistufiger Workflow (ausfuehrung -> review), Muster check-f652-pruefschritt.mjs baueWorkflowFixture. */
function baueWorkflowFixture(basisVerzeichnis, vorlage, auftragId) {
  const workflowId = `f656-gate-${randomUUID()}`
  registriereWorkflow(
    {
      workflow_schema: 'v0',
      workflow_id: workflowId,
      auftrag_id: auftragId,
      version: 1,
      ziel: 'F-656-Gate-Fixture.',
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
          freigabe: 'AUTOMATISCH',
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
    leiteProfilReferenzAb(vorlage),
    { basisVerzeichnis, schreiber: () => {} }
  )
  return workflowId
}

function ladeWorkflow(workflowId, basisVerzeichnis) {
  return ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis, schreiber: () => {} })?.daten ?? null
}

/** Fire-and-forget-Attrappe: löst SOFORT als real erfolgreich beendeter, ABGESCHLOSSENER Lauf auf (Muster check-f652-pruefschritt.mjs). */
function baueErfolgAttrappe() {
  return async () => ({ ok: true, klassifikation: { ergebnis: 'ERFOLGREICH' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } })
}

/**
 * Attrappe, die den Lauf sofort ablehnt (ok:false, kein Checkpoint) — für Szenario (b):
 * KLAERUNG_ERFORDERLICH, aber NICHT aus Regel 1f. Ohne reale Wirkungsmarke unter
 * '<basisVerzeichnis>/<laufId>' greift die Heilung (scripts/leitstand-server.mjs, Kommentar
 * "Heilung einer verwaisten lauf_id"): der Schritt geht zurück auf OFFEN statt FEHLGESCHLAGEN,
 * der Workflow auf KLAERUNG_ERFORDERLICH — status OFFEN erfüllt die Vorbedingung von F-656
 * ('ausfuehrung' MIT status ERFOLGREICH) so oder so nicht, das Szenario bleibt gültig.
 */
function baueAblehnungAttrappe() {
  return async () => ({ ok: false, grund: 'Gate-F656-Attrappe lehnt synthetisch ab' })
}

/** Legt Auftrag + Workflow an und startet ihn über den echten HTTP-Pfad. @returns { workflowId, ausfuehrungLaufId } */
async function starteFixture(basisUrl, basisVerzeichnis, vorlage) {
  const auftragAntwort = await fetch(`${basisUrl}/api/auftraege`, {
    method: 'POST',
    body: JSON.stringify({ titel: 'F-656-Gate', auftragstext: 'Gate-Auftragstext.' }),
  })
  const { auftragId } = await auftragAntwort.json()
  const workflowId = baueWorkflowFixture(basisVerzeichnis, vorlage, auftragId)
  const startAntwort = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
  if (startAntwort.status !== 202) {
    throw new Error(`POST .../starten erwartet 202, erhalten ${startAntwort.status} (${await startAntwort.text()})`)
  }
  const geladen = await warteBis(() => {
    const daten = ladeWorkflow(workflowId, basisVerzeichnis)
    return daten?.schritte?.[0]?.lauf_id !== null ? daten : null
  }, 2000)
  const ausfuehrungLaufId = geladen?.schritte?.[0]?.lauf_id ?? null
  return { workflowId, ausfuehrungLaufId }
}

// ─── (a) falscher Zustand: Workflow nicht KLAERUNG_ERFORDERLICH → 409 ────────────────────────
{
  const basisVerzeichnis = `kontrollzustand-test-f656-a-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const repoWurzel = neuesRepo()
  const verzeichnis = mkdtempSync(join(tmpdir(), 'f656-gate-a-'))
  const startvorlagePfad = schreibeStartvorlage(verzeichnis, { pruefbefehl: knotenBefehl('process.exit(1)'), pruefZeitgrenzeMs: 10000 })
  const vorlage = ladeStartvorlage(startvorlagePfad)
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn: baueErfolgAttrappe(), repoWurzel, startvorlagePfad })
  try {
    const auftragAntwort = await fetch(`${basisUrl}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel: 'F-656-Gate-a', auftragstext: 'Gate-Auftragstext.' }) })
    const { auftragId } = await auftragAntwort.json()
    const workflowId = baueWorkflowFixture(basisVerzeichnis, vorlage, auftragId)
    // Workflow ist frisch angelegt (OFFEN), nie gestartet — kein Halt, erst recht keiner aus Regel 1f.
    const antwort = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/pruefung-wiederholen`, { method: 'POST' })
    const inhalt = await antwort.json().catch(() => ({}))
    const workflowDanach = ladeWorkflow(workflowId, basisVerzeichnis)
    if (antwort.status !== 409 || !String(inhalt.grund ?? '').includes('KLAERUNG_ERFORDERLICH')) {
      befunde.push(`(a) falscher Zustand: erwartet 409 mit Hinweis auf KLAERUNG_ERFORDERLICH, erhalten ${antwort.status} ${JSON.stringify(inhalt)}`)
    } else if (workflowDanach?.status !== 'OFFEN') {
      befunde.push(`(a) falscher Zustand: der Workflow sollte unverändert OFFEN bleiben, erhalten status '${workflowDanach?.status}'`)
    } else {
      console.log('✓ (a) Workflow nicht KLAERUNG_ERFORDERLICH: 409, nichts geschrieben.')
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
    raeumeVerzeichnis(repoWurzel)
    raeumeVerzeichnis(verzeichnis)
  }
}

// ─── (b) KLAERUNG_ERFORDERLICH, aber NICHT aus Regel 1f (Ausführungsschritt nicht ERFOLGREICH) → 409 ──
{
  const basisVerzeichnis = `kontrollzustand-test-f656-b-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const repoWurzel = neuesRepo()
  const verzeichnis = mkdtempSync(join(tmpdir(), 'f656-gate-b-'))
  const startvorlagePfad = schreibeStartvorlage(verzeichnis, { pruefbefehl: knotenBefehl('process.exit(0)'), pruefZeitgrenzeMs: 10000 })
  const vorlage = ladeStartvorlage(startvorlagePfad)
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn: baueAblehnungAttrappe(), repoWurzel, startvorlagePfad })
  try {
    const { workflowId } = await starteFixture(basisUrl, basisVerzeichnis, vorlage)
    const workflowNachLauf = await warteBis(() => {
      const daten = ladeWorkflow(workflowId, basisVerzeichnis)
      return daten?.status === 'KLAERUNG_ERFORDERLICH' ? daten : null
    }, 2000)
    if (workflowNachLauf?.schritte?.[0]?.status === 'ERFOLGREICH') {
      befunde.push(`(b) Vorbedingung: Ausführungsschritt sollte NICHT ERFOLGREICH sein (geheilte Ablehnung, Muster check-f652-pruefschritt.mjs), erhalten status '${workflowNachLauf?.schritte?.[0]?.status}'`)
    } else {
      const antwort = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/pruefung-wiederholen`, { method: 'POST' })
      const inhalt = await antwort.json().catch(() => ({}))
      if (antwort.status !== 409 || !String(inhalt.grund ?? '').includes('Regel 1f')) {
        befunde.push(`(b) Halt nicht aus Regel 1f: erwartet 409 mit Hinweis auf Regel 1f, erhalten ${antwort.status} ${JSON.stringify(inhalt)}`)
      } else {
        console.log('✓ (b) KLAERUNG_ERFORDERLICH, aber der Halt kommt nicht aus Regel 1f (Ausführungsschritt nicht ERFOLGREICH): 409.')
      }
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
    raeumeVerzeichnis(repoWurzel)
    raeumeVerzeichnis(verzeichnis)
  }
}

// ─── (c)+(e) Grünfall: zweiter Versuch liefert GRUEN, Review startet, 2 Artefaktversionen ─────
{
  const basisVerzeichnis = `kontrollzustand-test-f656-c-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const repoWurzel = neuesRepo()
  const verzeichnis = mkdtempSync(join(tmpdir(), 'f656-gate-c-'))
  const markerPfad = join(verzeichnis, 'marker.txt').replace(/\\/g, '\\\\')
  // Markerdatei-Trick: existiert sie noch nicht, schreibt der Befehl sie und meldet ROT (simuliert
  // "Bau war kaputt") — existiert sie bereits (zweiter Aufruf über den F-656-Endpunkt), meldet er
  // GRUEN (simuliert "der Flake ist beim Retry weg", real beobachtete Situation aus F39 Versuch 4).
  const startvorlagePfad = schreibeStartvorlage(verzeichnis, {
    pruefbefehl: knotenBefehl(
      `const fs=require('node:fs'); const m='${markerPfad}'; if (!fs.existsSync(m)) { fs.writeFileSync(m,'x'); console.error('FEHLER: Gate-F656 noch nicht behoben'); process.exit(1) } process.exit(0)`
    ),
    pruefZeitgrenzeMs: 10000,
  })
  const vorlage = ladeStartvorlage(startvorlagePfad)
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn: baueErfolgAttrappe(), repoWurzel, startvorlagePfad })
  try {
    const { workflowId, ausfuehrungLaufId } = await starteFixture(basisUrl, basisVerzeichnis, vorlage)
    const nachErstemLauf = await warteBis(() => {
      const daten = ladeWorkflow(workflowId, basisVerzeichnis)
      return daten?.status === 'KLAERUNG_ERFORDERLICH' ? daten : null
    }, 2000)
    if (nachErstemLauf?.status !== 'KLAERUNG_ERFORDERLICH' || ausfuehrungLaufId === null) {
      befunde.push(`(c) Vorbedingung: erster Lauf sollte ROT auf KLAERUNG_ERFORDERLICH halten, erhalten status '${nachErstemLauf?.status}'`)
    } else {
      const antwort = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/pruefung-wiederholen`, { method: 'POST' })
      const inhalt = await antwort.json().catch(() => ({}))
      const workflowNachRetry = ladeWorkflow(workflowId, basisVerzeichnis)
      const versionen = listeVersionen(`pruefergebnis-${ausfuehrungLaufId}`, { basisVerzeichnis, schreiber: () => {} })
      if (antwort.status !== 202 || inhalt.pruefergebnis !== 'GRUEN') {
        befunde.push(`(c) Grünfall: erwartet 202 mit pruefergebnis GRUEN, erhalten ${antwort.status} ${JSON.stringify(inhalt)}`)
      } else if (workflowNachRetry?.schritte?.[1]?.lauf_id === null || workflowNachRetry?.schritte?.[1]?.lauf_id === undefined) {
        befunde.push('(c) Grünfall: der Review-Schritt sollte nach GRUEN automatisch starten, tat es aber nicht')
      } else if (versionen.length !== 2) {
        befunde.push(`(e) Artefakt-Historie: erwartet GENAU 2 Versionen von 'pruefergebnis-${ausfuehrungLaufId}' (Append, keine Überschreibung), erhalten ${versionen.length}`)
      } else if (versionen[0].daten.ergebnis !== 'ROT' || versionen[1].daten.ergebnis !== 'GRUEN') {
        befunde.push(`(e) Artefakt-Historie: erwartet Version 1 ROT, Version 2 GRUEN, erhalten ${JSON.stringify(versionen.map((v) => v.daten.ergebnis))}`)
      } else {
        console.log('✓ (c) Grünfall: zweiter Versuch liefert GRUEN, der Review-Schritt startet automatisch über den bestehenden Fortsetzungsmechanismus.')
        console.log("✓ (e) Artefakt-Historie: 'pruefergebnis-<laufId>' trägt nach der Wiederholung genau zwei Versionen (ROT, dann GRUEN) — Append, keine Überschreibung.")
      }
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
    raeumeVerzeichnis(repoWurzel)
    raeumeVerzeichnis(verzeichnis)
  }
}

// ─── (d) Rot bleibt rot: erneuter Halt mit neuem Grund, Review startet NICHT ─────────────────
{
  const basisVerzeichnis = `kontrollzustand-test-f656-d-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const repoWurzel = neuesRepo()
  const verzeichnis = mkdtempSync(join(tmpdir(), 'f656-gate-d-'))
  const startvorlagePfad = schreibeStartvorlage(verzeichnis, {
    pruefbefehl: knotenBefehl('console.error("FEHLER: Gate-F656 bleibt kaputt"); process.exit(1)'),
    pruefZeitgrenzeMs: 10000,
  })
  const vorlage = ladeStartvorlage(startvorlagePfad)
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn: baueErfolgAttrappe(), repoWurzel, startvorlagePfad })
  try {
    const { workflowId } = await starteFixture(basisUrl, basisVerzeichnis, vorlage)
    await warteBis(() => {
      const daten = ladeWorkflow(workflowId, basisVerzeichnis)
      return daten?.status === 'KLAERUNG_ERFORDERLICH' ? daten : null
    }, 2000)
    const laufIdVorher = ladeWorkflow(workflowId, basisVerzeichnis)?.schritte?.[0]?.lauf_id ?? null
    const antwort = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/pruefung-wiederholen`, { method: 'POST' })
    const inhalt = await antwort.json().catch(() => ({}))
    const workflowNachRetry = ladeWorkflow(workflowId, basisVerzeichnis)
    const versionen = laufIdVorher === null ? [] : listeVersionen(`pruefergebnis-${laufIdVorher}`, { basisVerzeichnis, schreiber: () => {} })
    if (antwort.status !== 200 || inhalt.pruefergebnis !== 'ROT') {
      befunde.push(`(d) rot bleibt rot: erwartet 200 mit pruefergebnis ROT, erhalten ${antwort.status} ${JSON.stringify(inhalt)}`)
    } else if (workflowNachRetry?.status !== 'KLAERUNG_ERFORDERLICH') {
      befunde.push(`(d) rot bleibt rot: Workflow sollte erneut auf KLAERUNG_ERFORDERLICH stehen, erhalten status '${workflowNachRetry?.status}'`)
    } else if (versionen.length !== 2) {
      befunde.push(`(d) rot bleibt rot: erwartet GENAU 2 Prüfergebnis-Versionen (Append, keine Überschreibung), erhalten ${versionen.length}`)
    } else if (workflowNachRetry.schritte?.[1]?.lauf_id !== null) {
      befunde.push(`(d) rot bleibt rot: der Review-Schritt sollte NICHT starten, hat aber lauf_id '${workflowNachRetry.schritte?.[1]?.lauf_id}'`)
    } else {
      console.log('✓ (d) rot bleibt rot: erneuter Halt auf KLAERUNG_ERFORDERLICH (zweite Prüfergebnis-Version registriert), der Review-Schritt startet nicht.')
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
    raeumeVerzeichnis(repoWurzel)
    raeumeVerzeichnis(verzeichnis)
  }
}

// ─── (f) D13: ein paralleler Startversuch während der Wiederholung wird abgelehnt ────────────
{
  const basisVerzeichnis = `kontrollzustand-test-f656-f-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const repoWurzel = neuesRepo()
  const verzeichnis = mkdtempSync(join(tmpdir(), 'f656-gate-f-'))
  // 600ms Prüfdauer im pruefbefehl SELBST (Muster check-f652-pruefschritt.mjs Szenario (g)) —
  // lang genug, um sicher einen zweiten Request in das D13-Fenster zu legen, kurz genug für
  // einen schnellen Gate-Lauf. Ein pruefbefehl, der sofort exitet, ließe das Fenster zu knapp
  // für eine zuverlässige Anfrage-Reihenfolge werden.
  const startvorlagePfad = schreibeStartvorlage(verzeichnis, {
    pruefbefehl: knotenBefehl('setTimeout(() => { console.error("FEHLER: Gate-F656 D13"); process.exit(1) }, 600)'),
    pruefZeitgrenzeMs: 10000,
  })
  const vorlage = ladeStartvorlage(startvorlagePfad)
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn: baueErfolgAttrappe(), repoWurzel, startvorlagePfad })
  try {
    const { workflowId, auftragId } = await (async () => {
      const auftragAntwort = await fetch(`${basisUrl}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel: 'F-656-Gate-D13', auftragstext: 'Gate-Auftragstext.' }) })
      const { auftragId } = await auftragAntwort.json()
      const workflowId = baueWorkflowFixture(basisVerzeichnis, vorlage, auftragId)
      const startAntwort = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
      if (startAntwort.status !== 202) throw new Error(`POST .../starten erwartet 202, erhalten ${startAntwort.status}`)
      return { workflowId, auftragId }
    })()
    await warteBis(() => {
      const daten = ladeWorkflow(workflowId, basisVerzeichnis)
      return daten?.status === 'KLAERUNG_ERFORDERLICH' ? daten : null
    }, 2000)

    // Die Wiederholung selbst dauert jetzt real 600ms (pruefbefehl oben) — der zweite Request
    // wird währenddessen abgeschickt, gut innerhalb des D13-Fensters (laufAktiv bleibt bis zum
    // Ende des awaits in fuehrePruefungDurch gesetzt).
    const ersteAnfrage = fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/pruefung-wiederholen`, { method: 'POST' })
    await verzoegerung(150)
    const zweiterLaufId = `f656-gate-d13-zweitversuch-${randomUUID()}`
    const zweiterVersuch = await fetch(`${basisUrl}/api/laeufe`, {
      method: 'POST',
      body: JSON.stringify({ laufId: zweiterLaufId, rolle: 'code-reviewer', anfragen: [], budget: {}, aufrufEingaben: { modell: 'claude-sonnet-5' }, auftragId, werkzeugsatz: 'lesend' }),
    })
    const antwortEins = await ersteAnfrage
    if (antwortEins.status !== 200 && antwortEins.status !== 202) {
      befunde.push(`(f) Vorbedingung: die Wiederholungs-Anfrage selbst sollte durchgehen (200/202), erhalten ${antwortEins.status}`)
    } else if (zweiterVersuch.status !== 409) {
      befunde.push(`(f) D13: ein Startversuch während der laufenden Wiederholung sollte mit 409 abgelehnt werden, erhalten ${zweiterVersuch.status} (${await zweiterVersuch.text()})`)
    } else {
      console.log('✓ (f) D13: ein paralleler Startversuch während der Wiederholung wird mit 409 abgelehnt.')
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
    raeumeVerzeichnis(repoWurzel)
    raeumeVerzeichnis(verzeichnis)
  }
}

// ─── Ergebnis ───────────────────────────────────────────────────────────────
console.log('')
if (befunde.length === 0) {
  console.log('✓ Keine Befunde.\n')
  process.exit(0)
}

console.log(`✗ ${befunde.length} Befund(e):\n`)
for (const b of befunde) console.log(`  - ${b}`)
console.log('')
process.exit(1)
