#!/usr/bin/env node
/**
 * Datei: scripts/check-f22-click-to-work.mjs
 *
 * Zweck: Click-to-Work-Gate (F22 WS-1, features/F22/feature.md). Prüft die
 * serverseitigen Bausteine des neuen Router-Endpunkts
 * (`POST /api/auftraege/<auftragId>/routen`, `scripts/leitstand-server.mjs`):
 *
 * (0) `entferneCodezaun` als reine Funktion (Bauauftrag Punkt 2: "eigene
 *     reine Funktion + Unit-Test").
 * (a) AK7 der Akte ("ein Workflow-Vorschlag ohne persistiertes
 *     Router-Artefakt wird abgelehnt") ist STRUKTURELL, nicht laufzeit-
 *     geprüft: kein Codepfad in diesem Workstream registriert einen
 *     Workflow, ohne zuvor ein Router-Ergebnis-Artefakt zu registrieren
 *     (Advisor-Pass 14.09.2026, state/plan-v2-f22-ws1.md Korrektur D). Der
 *     Grünfall unten belegt die Kopplung direkt an `verarbeiteRouterErgebnis`
 *     (exportiert aus `scripts/leitstand-server.mjs`) mit präparierten
 *     Daten — kein Mock des Werkzeuglaufs, echte Artefakt-Registrierung
 *     gegen ein Wegwerf-`basisVerzeichnis`.
 * (b) 409 bei aktivem Lauf (D13) — real gegen einen laufenden Testserver
 *     (Muster `scripts/check-f15-workflow.mjs` Rotfall 2).
 * (c) Eine schemawidrige Klassifikation erzeugt weder Router- noch
 *     Workflow-Artefakt, sondern einen Ablehnungsgrund — direkt an
 *     `verarbeiteRouterErgebnis` mit präparierten Rohstrom-Daten (kein
 *     Mock des Werkzeuglaufs).
 * (d) `leseWorkitemReferenz` als reine Funktion (Unit-Test, Muster (0)) —
 *     mit/ohne Referenzzeile, mehrere Kandidatenzeilen (erste gewinnt,
 *     festgenagelt statt zufällig, QA-Pass 14.09.2026).
 * (e) Korrektur 2 der Akte, je ein Vertreter beider Zweige real geprüft
 *     (QA-Pass 14.09.2026): ein zweites Routen desselben Auftrags ERSETZT
 *     einen Bestand-Workflow im Status OFFEN (neue Version, dieselbe
 *     workflow_id), wird aber ABGELEHNT, wenn der Bestand LAEUFT trägt —
 *     stellvertretend für die gesamte Sperrmenge
 *     GESPERRTE_ERSETZUNGS_STATUS (reine Set-Prüfung, kein Sonderfall je
 *     Status). Das Router-Ergebnis-Artefakt entsteht in beiden Fällen, nur
 *     die Workflow-Registrierung unterscheidet sich.
 * (f) `workitem_referenz`-Verdrahtung bis zum echten `GET /api/auftraege`-
 *     Response (Reviewer-/QA-Pass 14.09.2026, ergänzt (d): dort nur die
 *     reine Funktion).
 *
 * Aufbau gespiegelt von scripts/check-f15-workflow.mjs (starteTestserver-
 * Helfer, Rotfall-Muster) und scripts/check-f18-router.mjs (Beispiel-
 * Fixtures gegen einen handgeschriebenen Validator).
 *
 * Wird aufgerufen von: `npm run check`.
 *
 * Aufruf: node scripts/check-f22-click-to-work.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import { ladeArtefaktVersion } from '../src/lineage-registry/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { validiereRouterErgebnisDaten } from '../src/router/index.ts'
import { registriereWorkflow } from '../src/workflow/index.ts'
import { entferneCodezaun, erzeugeRequestHandler, leseWorkitemReferenz, verarbeiteRouterErgebnis } from './leitstand-server.mjs'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []

console.log('\n=== F22-Click-to-Work-Check (WS-1) ===\n')

/** @param optionen - an erzeugeRequestHandler durchgereicht @returns { basisUrl, schliessen } eines echten HTTP-Testservers (Muster check-f15-workflow.mjs) */
async function starteTestserver(optionen) {
  const server = createServer(erzeugeRequestHandler(optionen))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  return {
    basisUrl: `http://127.0.0.1:${port}`,
    schliessen: () => new Promise((resolve) => server.close(resolve)),
  }
}

const profilReferenz = leiteProfilReferenzAb(ladeStartvorlage('startvorlagen/beispielprojekt.json'))
const REPO_WURZEL = process.cwd()

// ─── (0) entferneCodezaun: reine Funktion, eigener Unit-Test ────────────────
{
  const befundeVor = befunde.length
  if (entferneCodezaun('```json\n{"a":1}\n```') !== '{"a":1}') {
    befunde.push("entferneCodezaun: Codezaun mit Sprachtag wurde nicht korrekt entfernt")
  }
  if (entferneCodezaun('```\n{"a":1}\n```') !== '{"a":1}') {
    befunde.push("entferneCodezaun: Codezaun ohne Sprachtag wurde nicht korrekt entfernt")
  }
  if (entferneCodezaun('{"a":1}') !== null) {
    befunde.push("entferneCodezaun: Text ohne Codezaun muss null liefern, nicht durchreichen")
  }
  if (befunde.length === befundeVor) {
    console.log('✓ (0) entferneCodezaun: Codezaun mit/ohne Sprachtag entfernt, unumzäunter Text liefert null.')
  }
}

// ─── (d) leseWorkitemReferenz: reine Funktion, eigener Unit-Test ───────────
{
  const befundeVor = befunde.length
  if (leseWorkitemReferenz('Titel\n\nworkitem:finding:F-353\n\nRest des Texts.') !== 'workitem:finding:F-353') {
    befunde.push('leseWorkitemReferenz: eine Referenzzeile inmitten von Fließtext wurde nicht gefunden')
  }
  if (leseWorkitemReferenz('  workitem:feature:F22  ') !== 'workitem:feature:F22') {
    befunde.push('leseWorkitemReferenz: eine Referenzzeile mit umgebenden Leerzeichen wurde nicht getrimmt erkannt')
  }
  if (leseWorkitemReferenz('Kein Bezug hier, nur Text.') !== null) {
    befunde.push('leseWorkitemReferenz: Text ohne Referenzzeile muss null liefern')
  }
  // Zwei Kandidatenzeilen: die ERSTE gewinnt (Array.find), festgenagelt statt zufällig.
  if (leseWorkitemReferenz('workitem:finding:F-353\nworkitem:feature:F22') !== 'workitem:finding:F-353') {
    befunde.push('leseWorkitemReferenz: bei mehreren Kandidatenzeilen muss die erste gewinnen')
  }
  if (leseWorkitemReferenz(undefined) !== null || leseWorkitemReferenz(42) !== null) {
    befunde.push('leseWorkitemReferenz: ein Nicht-String muss null liefern, nicht werfen')
  }
  if (befunde.length === befundeVor) {
    console.log('✓ (d) leseWorkitemReferenz: Referenzzeile erkannt/getrimmt, fehlende Referenz liefert null, erste von mehreren Kandidaten gewinnt.')
  }
}

// ─── Schema-Beispiele gegen validiereRouterErgebnisDaten (Muster check-f18-router.mjs) ──
{
  const befundeVor = befunde.length
  const schemaPfad = 'schemas/kontrollzustand-router-ergebnis-payload.schema.json'
  if (!existsSync(schemaPfad)) {
    befunde.push(`${schemaPfad}: Datei fehlt`)
  } else {
    try {
      JSON.parse(readFileSync(schemaPfad, 'utf-8'))
    } catch (fehler) {
      befunde.push(`${schemaPfad}: kein gültiges JSON (${fehler.message})`)
    }
  }

  const beispiele = [
    { pfad: 'schemas/examples/kontrollzustand-router-ergebnis-payload.valid.json', sollGueltigSein: true },
    { pfad: 'schemas/examples/kontrollzustand-router-ergebnis-payload.invalid-unbekannter-worker.json', sollGueltigSein: false },
    { pfad: 'schemas/examples/kontrollzustand-router-ergebnis-payload.invalid-unbekannte-vorlage.json', sollGueltigSein: false },
    { pfad: 'schemas/examples/kontrollzustand-router-ergebnis-payload.invalid-unbekanntes-feld.json', sollGueltigSein: false },
  ]
  for (const { pfad, sollGueltigSein } of beispiele) {
    if (!existsSync(pfad)) {
      befunde.push(`${pfad}: Datei fehlt`)
      continue
    }
    let obj
    try {
      obj = JSON.parse(readFileSync(pfad, 'utf-8'))
    } catch (fehler) {
      befunde.push(`${pfad}: kein gültiges JSON (${fehler.message})`)
      continue
    }
    const verstoesse = validiereRouterErgebnisDaten(obj)
    if (sollGueltigSein && verstoesse.length > 0) {
      befunde.push(`${pfad}: sollte gültig sein, aber verletzt: ${verstoesse.join('; ')}`)
    }
    if (!sollGueltigSein && verstoesse.length === 0) {
      befunde.push(`${pfad}: sollte ungültig sein, aber keine Regelverletzung gefunden`)
    }
  }
  if (befunde.length === befundeVor) {
    console.log('✓ Schema-Beispiele: valid.json erfüllt validiereRouterErgebnisDaten, alle drei invalid-*.json verletzen je eine benannte Regel.')
  }
}

/** Schreibt einen Rohstrom-Fixture (Muster: äußere Gateway-Hülle mit 'stdout') und liefert dessen Pfad. */
function schreibeRohstromFixture(basisVerzeichnis, dateiname, stdout) {
  mkdirSync(basisVerzeichnis, { recursive: true })
  const pfad = join(basisVerzeichnis, dateiname)
  writeFileSync(pfad, JSON.stringify({ stdout }), 'utf8')
  return pfad
}

// ─── (a) Grünfall: Router-Artefakt und Workflow entstehen gekoppelt ─────────
//
// Belegt AK7 strukturell (siehe Kopfkommentar oben): verarbeiteRouterErgebnis ist der
// EINZIGE Ort in diesem Workstream, der einen Workflow aus einer Router-Klassifikation
// registriert, und er registriert das Router-Ergebnis-Artefakt IMMER zuerst, im selben
// synchronen Durchlauf. Ein Workflow ohne vorheriges Router-Artefakt ist damit nicht ein
// Fall, den ein Rotfall zeigen könnte — er ist mit diesem Code strukturell unerreichbar.
{
  const basisVerzeichnis = `kontrollzustand-test-f22-a-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  try {
    const auftragId = `f22-gruen-${randomUUID()}`
    const laufId = `router-${auftragId}-${Date.now()}`
    const klassifikation = {
      kontrolltiefe: 'standard',
      risikoklasse: 'mittel',
      task_typen: ['bugfix'],
      rueckfragen: [],
      begruendung: 'Gate-Fixture.',
    }
    const rohstromPfad = schreibeRohstromFixture(
      basisVerzeichnis,
      'gruenfall-rohstrom.json',
      `${JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: JSON.stringify(klassifikation) } })}\n`
    )
    const laufakte = { worker: 'codex', rohstrom_referenz: { pfad: rohstromPfad } }
    const auftragVersion = { daten: { titel: 'Gate-Auftrag F22' }, inhaltsHash: 'a'.repeat(64) }
    const ladeOptionen = { basisVerzeichnis, schreiber: () => {} }

    const befundeVor = befunde.length
    const ergebnis = verarbeiteRouterErgebnis(laufakte, auftragId, laufId, auftragVersion, REPO_WURZEL, profilReferenz, ladeOptionen)
    if (!ergebnis.ok) {
      befunde.push(`(a) Grünfall: verarbeiteRouterErgebnis erwartet ok:true, erhalten ok:false (${ergebnis.grund})`)
    } else {
      const routerArtefakt = ladeArtefaktVersion(`router-${auftragId}`, undefined, ladeOptionen)
      const workflowArtefakt = ladeArtefaktVersion(`workflow-${ergebnis.workflowId}`, undefined, ladeOptionen)
      if (routerArtefakt === null) {
        befunde.push('(a) Grünfall: Router-Ergebnis-Artefakt wurde nicht persistiert')
      }
      if (workflowArtefakt === null) {
        befunde.push('(a) Grünfall: Workflow-Artefakt wurde nicht persistiert')
      }
    }
    if (befunde.length === befundeVor) {
      console.log(`✓ (a) AK7 strukturell: Router-Ergebnis ('router-${auftragId}') und Workflow ('${ergebnis.workflowId}') entstehen gekoppelt, im selben Durchlauf.`)
    }
  } finally {
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (c) Rotfall: schemawidrige Klassifikation erzeugt weder Artefakt noch Workflow ──
{
  const basisVerzeichnis = `kontrollzustand-test-f22-c-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  try {
    const auftragId = `f22-rot-${randomUUID()}`
    const laufId = `router-${auftragId}-${Date.now()}`
    // Fence-Stripping gelingt (worker 'claude-code'), das entzäunte JSON ist aber
    // schemawidrig ('kontrolltiefe' unbekannt, Pflichtfelder fehlen) — deckt zugleich den
    // claude-code-Rückfallzweig UND die Schemaprüfung in einem Fixture ab.
    const rohstromPfad = schreibeRohstromFixture(
      basisVerzeichnis,
      'rotfall-rohstrom.json',
      JSON.stringify({ type: 'result', result: '```json\n{"kontrolltiefe":"windig"}\n```' })
    )
    const laufakte = { worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad } }
    const auftragVersion = { daten: { titel: 'Gate-Auftrag F22 Rotfall' }, inhaltsHash: 'b'.repeat(64) }
    const ladeOptionen = { basisVerzeichnis, schreiber: () => {} }

    const ergebnis = verarbeiteRouterErgebnis(laufakte, auftragId, laufId, auftragVersion, REPO_WURZEL, profilReferenz, ladeOptionen)
    if (ergebnis.ok !== false || !ergebnis.grund.includes('ergebnis-router.schema.json')) {
      befunde.push(`(c) Rotfall: erwartet ok:false mit Schema-Verstoß im Grund, erhalten ${JSON.stringify(ergebnis)}`)
    }
    const routerArtefakt = ladeArtefaktVersion(`router-${auftragId}`, undefined, ladeOptionen)
    const workflowArtefakt = ladeArtefaktVersion(`workflow-router-${auftragId}`, undefined, ladeOptionen)
    if (routerArtefakt !== null) {
      befunde.push('(c) Rotfall: trotz schemawidriger Klassifikation wurde ein Router-Ergebnis-Artefakt persistiert')
    }
    if (workflowArtefakt !== null) {
      befunde.push('(c) Rotfall: trotz schemawidriger Klassifikation wurde ein Workflow-Artefakt persistiert')
    }
    if (ergebnis.ok === false && routerArtefakt === null && workflowArtefakt === null) {
      console.log('✓ (c) Schemawidrige Klassifikation: weder Router- noch Workflow-Artefakt, Ablehnungsgrund nennt das verletzte Schema.')
    }
  } finally {
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

/** Minimaler, gültiger WORKFLOW_V0-Datensatz mit genau einem Schritt, für die Bestand-Fixtures unten. */
function baueGueltigenWorkflow(workflowId, auftragId, status) {
  return {
    workflow_schema: 'v0',
    workflow_id: workflowId,
    auftrag_id: auftragId,
    version: 1,
    ziel: 'Gate-Fixture.',
    status,
    aktiver_schritt_id: 'schritt-1',
    grenzen: { max_schritte: 6, max_replans: 1 },
    schritte: [
      {
        schritt_id: 'schritt-1',
        rolle: 'code-reviewer',
        werkzeugsatz: 'lesend',
        worker: 'claude-code',
        modell: 'claude-sonnet-5',
        eingaben: [],
        output_schema: null,
        freigabe: 'AUTOMATISCH',
        risiko: 'Gate-Fixture, kein reales Risiko.',
        zeitgrenze_ms: 600000,
        nachfolger: null,
        status: status === 'OFFEN' ? 'OFFEN' : 'LAEUFT',
        lauf_id: status === 'OFFEN' ? null : `bestand-lauf-${randomUUID()}`,
      },
    ],
  }
}

// ─── (e) Korrektur 2 der Akte: erneutes Routen ersetzt OFFEN, wird bei Bestandsschutz abgelehnt ──
for (const { status, sollErsetzen } of [
  { status: 'OFFEN', sollErsetzen: true },
  { status: 'LAEUFT', sollErsetzen: false },
]) {
  const basisVerzeichnis = `kontrollzustand-test-f22-e-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  try {
    const auftragId = `f22-erneut-${randomUUID()}`
    const laufId = `router-${auftragId}-${Date.now()}`
    const workflowId = `router-${auftragId}` // leiteWorkflowIdAb, src/router/index.ts — deterministisch
    const ladeOptionen = { basisVerzeichnis, schreiber: () => {} }

    // Bestand VOR dem Router-Lauf anlegen — Muster: ein früherer, erfolgreicher Routing-Versuch.
    registriereWorkflow(baueGueltigenWorkflow(workflowId, auftragId, status), profilReferenz, ladeOptionen)

    const klassifikation = {
      kontrolltiefe: 'standard',
      risikoklasse: 'mittel',
      task_typen: ['bugfix'],
      rueckfragen: [],
      begruendung: 'Gate-Fixture.',
    }
    const rohstromPfad = schreibeRohstromFixture(
      basisVerzeichnis,
      'erneut-rohstrom.json',
      `${JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: JSON.stringify(klassifikation) } })}\n`
    )
    const laufakte = { worker: 'codex', rohstrom_referenz: { pfad: rohstromPfad } }
    const auftragVersion = { daten: { titel: 'Gate-Auftrag F22 erneut routen' }, inhaltsHash: 'c'.repeat(64) }

    const befundeVor = befunde.length
    const ergebnis = verarbeiteRouterErgebnis(laufakte, auftragId, laufId, auftragVersion, REPO_WURZEL, profilReferenz, ladeOptionen)
    // Das Router-Ergebnis-Artefakt entsteht IMMER, unabhängig vom Bestandsschutz — nur die
    // Workflow-Registrierung selbst unterscheidet sich (Plan v2, Abschnitt 4).
    if (ladeArtefaktVersion(`router-${auftragId}`, undefined, ladeOptionen) === null) {
      befunde.push(`(e) status '${status}': Router-Ergebnis-Artefakt wurde nicht persistiert, obwohl der Bestandsschutz nur den Workflow betreffen soll`)
    }
    if (sollErsetzen) {
      if (!ergebnis.ok || ergebnis.workflowVersionSequenz !== 2) {
        befunde.push(`(e) status '${status}' (ERSETZEN erwartet): verarbeiteRouterErgebnis sollte ok:true mit workflowVersionSequenz 2 liefern, erhalten ${JSON.stringify(ergebnis)}`)
      }
    } else {
      if (ergebnis.ok !== false || !ergebnis.grund.includes(`status '${status}'`)) {
        befunde.push(`(e) status '${status}' (ABLEHNEN erwartet): verarbeiteRouterErgebnis sollte ok:false mit dem Bestandsstatus im Grund liefern, erhalten ${JSON.stringify(ergebnis)}`)
      }
      const bestand = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, ladeOptionen)
      if (bestand?.versionSequenz !== 1) {
        befunde.push(`(e) status '${status}' (ABLEHNEN erwartet): der Bestand-Workflow wurde trotzdem durch eine neue Version ersetzt (versionSequenz ${bestand?.versionSequenz})`)
      }
    }
    if (befunde.length === befundeVor) {
      console.log(`✓ (e) Korrektur 2, status '${status}': ${sollErsetzen ? 'wird durch eine neue Version ersetzt' : 'wird abgelehnt, Bestand bleibt unverändert'} — Router-Ergebnis-Artefakt entsteht trotzdem.`)
    }
  } finally {
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (f) workitem_referenz-Verdrahtung: GET /api/auftraege liefert das Feld real ────
//
// Ergänzt (d): dort ist nur die reine Funktion leseWorkitemReferenz getestet, hier ihre
// Einbindung in sammleAuftraege bis zum echten HTTP-Response (Reviewer-/QA-Pass 14.09.2026,
// beide unabhängig: ein Tippfehler im Feldnamen oder eine vertauschte Aufrufreihenfolge wäre
// sonst von keinem Gate erkannt worden).
{
  const basisVerzeichnis = `kontrollzustand-test-f22-f-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis })
  try {
    const mitReferenz = await fetch(`${basisUrl}/api/auftraege`, {
      method: 'POST',
      body: JSON.stringify({ titel: 'F22-Gate-Workitem', auftragstext: 'Ziel des Auftrags.\nworkitem:finding:F-353\nWeiterer Text.' }),
    })
    const { auftragId: idMitReferenz } = await mitReferenz.json()
    const ohneReferenz = await fetch(`${basisUrl}/api/auftraege`, {
      method: 'POST',
      body: JSON.stringify({ titel: 'F22-Gate-ohne-Workitem', auftragstext: 'Auftragstext ohne jede Referenzzeile.' }),
    })
    const { auftragId: idOhneReferenz } = await ohneReferenz.json()

    const liste = await (await fetch(`${basisUrl}/api/auftraege`)).json()
    const eintragMitReferenz = liste.find((e) => e.auftragId === idMitReferenz)
    const eintragOhneReferenz = liste.find((e) => e.auftragId === idOhneReferenz)

    if (eintragMitReferenz?.workitem_referenz !== 'workitem:finding:F-353') {
      befunde.push(`(f) GET /api/auftraege: erwartet workitem_referenz 'workitem:finding:F-353', erhalten ${JSON.stringify(eintragMitReferenz?.workitem_referenz)}`)
    }
    if (eintragOhneReferenz?.workitem_referenz !== null) {
      befunde.push(`(f) GET /api/auftraege: Auftrag ohne Referenzzeile erwartet workitem_referenz:null, erhalten ${JSON.stringify(eintragOhneReferenz?.workitem_referenz)}`)
    }
    if (eintragMitReferenz?.workitem_referenz === 'workitem:finding:F-353' && eintragOhneReferenz?.workitem_referenz === null) {
      console.log('✓ (f) workitem_referenz: über GET /api/auftraege real durchgereicht, null ohne Referenzzeile.')
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (b) Rotfall: 409 bei aktivem Lauf (D13) ────────────────────────────────
{
  const basisVerzeichnis = `kontrollzustand-test-f22-b-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  let starts = 0
  let freigeben
  const haengt = new Promise((resolve) => {
    freigeben = resolve
  })
  const fuehreAufgabeDurchFn = async () => {
    starts += 1
    await haengt
    return { ok: true }
  }
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn })
  try {
    const auftragAntwort = await fetch(`${basisUrl}/api/auftraege`, {
      method: 'POST',
      body: JSON.stringify({ titel: 'F22-Gate-D13', auftragstext: 'Auftragstext des Gate-Laufs.' }),
    })
    const auftragId = (await auftragAntwort.json()).auftragId

    const erster = await fetch(`${basisUrl}/api/auftraege/${encodeURIComponent(auftragId)}/routen`, { method: 'POST' })
    if (erster.status !== 202) {
      befunde.push(`(b) D13: der erste Routing-Versuch erwartet 202, erhalten ${erster.status} (${await erster.text()})`)
    }

    const zweiter = await fetch(`${basisUrl}/api/auftraege/${encodeURIComponent(auftragId)}/routen`, { method: 'POST' })
    const grund = (await zweiter.json()).grund ?? ''
    if (zweiter.status !== 409 || !grund.includes('(D13)')) {
      befunde.push(`(b) D13: der zweite Routing-Versuch bei aktivem Lauf erwartet 409 mit D13-Grund, erhalten ${zweiter.status} (${grund})`)
    }
    if (starts !== 1) {
      befunde.push(`(b) D13: es darf nur EIN Werkzeuglauf gestartet worden sein, erhalten ${starts}`)
    }
    if (erster.status === 202 && zweiter.status === 409 && starts === 1) {
      console.log('✓ (b) D13: ein zweiter Routing-Versuch während eines aktiven Laufs wird real mit 409 abgelehnt.')
    }
  } finally {
    freigeben()
    await new Promise((resolve) => setTimeout(resolve, 20))
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── Ergebnis ───────────────────────────────────────────────────────────────
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
