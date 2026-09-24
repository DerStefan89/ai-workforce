/**
 * Datei: scripts/check-f652-pruefschritt.mjs
 *
 * Zweck: Gate für F-652 (state/findings.md F-652, BUG P1). Löst den im
 * Reallauf F39 WS-3b (Versuch 3c) real beobachteten Blocker: keine Rolle
 * trägt einen Werkzeugsatz mit Bash/npm, eine Rolle kann `npm run check`
 * nach ihrem eigenen Lauf also nicht selbst ausführen — ohne diesen Fix
 * blockiert jede Code-Ausführung, oder sie meldet "fertig", ohne dass etwas
 * verifiziert ist. Prüft:
 *
 * (a) den optionalen Eingabe-Platzhalter 'pruefergebnis-@<schrittId>'
 *     (loeseSchrittEingabenAuf, scripts/leitstand-server.mjs) direkt gegen
 *     die reine Funktion (Muster scripts/check-f39-architekt.mjs (g), kein
 *     HTTP-Server nötig): dieselben drei Schutzregeln wie
 *     'aenderungsuebersicht-@' (Selbstverweis, unbekannte schritt_id, noch
 *     keine lauf_id), UND — als Unterschied zu 'aenderungsuebersicht-@' —
 *     ein fehlendes Artefakt (keine Startvorlage mit pruefbefehl) blockiert
 *     den referenzierenden Schritt NICHT (Bauauftrag Punkt 4).
 * (b)-(f) den echten Dispatch über einen HTTP-Testserver
 *     (fuehreAufgabeDurchFn gestubbt, Muster check-f23-abnahme.mjs (c)/(d)):
 *     grün (Artefakt vorhanden, Review bekommt die Eingabe und startet,
 *     Ausführungs-Instruktion trägt den Hinweissatz), rot (KLAERUNG_ERFORDERLICH,
 *     grund enthält Ergebnis/Exit-Code/Ausgabeende, Review startet NICHT),
 *     Zeitgrenze (ZEITGRENZE, Prozessbaum real beendet — Marker-Datei-Beleg
 *     wie src/pruefschritt/pruefschritt.test.ts), kein pruefbefehl (bitgenau
 *     wie vor F-652: kein Artefakt, kein Hinweissatz, Review startet
 *     unverändert automatisch), lesender Lauf (keine Prüfung, obwohl
 *     pruefbefehl konfiguriert ist).
 * (g) D13: ein Startversuch (POST /api/laeufe) während die Prüfung noch
 *     läuft wird mit 409 abgelehnt — danach (Prüfung fertig) ist der Server
 *     wieder frei.
 * (h) GET /api/workflows/<id>: additive 'pruefergebnis'-Projektion.
 *
 * Testkommandos sind durchgehend kleine node-Einzeiler (process.execPath,
 * keine Shell) — NICHT das echte `npm run check` (Bauauftrag "Tests").
 *
 * Aufruf: node scripts/check-f652-pruefschritt.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { cpSync, existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ladeArtefaktVersion, registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { registriereWorkflow } from '../src/workflow/index.ts'
import { erzeugeRequestHandler, loeseSchrittEingabenAuf } from './leitstand-server.mjs'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []
console.log('\n=== F-652-Pruefschritt-Check ===\n')

function git(repoWurzel, argumente) {
  return execFileSync('git', argumente, { cwd: repoWurzel, encoding: 'utf8' })
}

/**
 * Wegwerf-Git-Repo, NICHT auf main/master (E-F39-1=B), mit einem ersten Commit. Trägt zusätzlich
 * eine Kopie von schemas/ergebnis-code-reviewer.schema.json (loeseAusgabeSchemaAuf löst
 * output_schema IMMER relativ zu repoWurzel auf, nie relativ zum echten Produkt-Repo) — sonst
 * scheitert der zweite Workflow-Schritt (rolle 'code-reviewer', output_schema
 * 'ergebnis-code-reviewer', ROLLENVERTRAEGE.code-reviewer.erlaubtes_output_schema erzwingt genau
 * diesen Wert) schon am Schema-Nachschlag, bevor die eigentliche F-652-Mechanik überhaupt zum
 * Zug kommt.
 */
function neuesRepo() {
  const repoWurzel = join(tmpdir(), `f652-pruefschritt-gate-${randomUUID()}`)
  mkdirSync(repoWurzel, { recursive: true })
  git(repoWurzel, ['init', '--quiet'])
  git(repoWurzel, ['config', 'user.email', 'test@example.invalid'])
  git(repoWurzel, ['config', 'user.name', 'Test'])
  git(repoWurzel, ['branch', '-m', 'wegwerf-branch'])
  mkdirSync(join(repoWurzel, 'schemas'), { recursive: true })
  cpSync('schemas/ergebnis-code-reviewer.schema.json', join(repoWurzel, 'schemas', 'ergebnis-code-reviewer.schema.json'))
  writeFileSync(join(repoWurzel, 'bestehend.txt'), 'Zeile 1\n')
  // Beide Dateien in DENSELBEN ersten Commit (nicht nur 'bestehend.txt') — sonst stünde das
  // Schema als untracked Datei im Arbeitsbaum, und die Ausführungs-Vorbedingung (E-F39-1=B, kein
  // schreibender Schritt auf unsauberem Baum) lehnte den 'ausfuehrung'-Schritt schon deshalb ab.
  git(repoWurzel, ['add', 'bestehend.txt', 'schemas/ergebnis-code-reviewer.schema.json'])
  git(repoWurzel, ['commit', '--quiet', '-m', 'init'])
  return repoWurzel
}

/** @returns { basisUrl, schliessen } eines echten HTTP-Testservers (Muster check-f23-abnahme.mjs). */
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

/** argv-Präfix für einen node-Einzeiler ohne Shell (Muster startvorlagen/ai-workforce.json' pruefbefehl). */
function knotenBefehl(...ausdruecke) {
  return [process.execPath, '-e', ...ausdruecke]
}

/** Schreibt eine Wegwerf-Startvorlage auf Basis von beispielprojekt.json, additiv mit pruefbefehl/pruefZeitgrenzeMs. */
// Der Review-Schritt der Fixture (baueWorkflowFixture) trägt worker 'codex' + output_schema
// 'ergebnis-code-reviewer' (Muster workflow-vorlagen/standard.json) — Regel 4b in
// ermittleNaechstenSchritt hält jeden Schritt mit gesetztem output_schema an, dessen Worker NICHT
// 'codex' ist, und loeseAusfuehrungsEingabenAuf verlangt für 'codex' zusätzlich den worker.codex-
// Block in der Startvorlage. beispielprojekt.json (Basis von schreibeStartvorlage) trägt diesen
// Block nicht — die Datei existiert nicht wirklich, fuehreAufgabeDurchFn ist in jedem Testfall
// dieses Gates gestubbt, es wird nie ein echter Codex-Prozess gestartet.
const CODEX_BLOCK = { codex: { startziel: [String.raw`C:\f652-gate-dummy\codex.exe`], versionDeklariert: 'codex-cli-gate-fixture', sandbox: 'read-only' } }

function schreibeStartvorlage(verzeichnis, zusatz = {}) {
  const basis = ladeStartvorlage('startvorlagen/beispielprojekt.json')
  const pfad = join(verzeichnis, `startvorlage-${randomUUID()}.json`)
  writeFileSync(pfad, JSON.stringify({ ...basis, worker: CODEX_BLOCK, ...zusatz }, null, 2))
  return pfad
}

function baueSchritt(overrides = {}) {
  return {
    schritt_id: 'schritt-referenzierend',
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
    status: 'OFFEN',
    lauf_id: null,
    ...overrides,
  }
}

// ─── (a) 'pruefergebnis-@<schrittId>': dieselben drei Schutzregeln wie 'aenderungsuebersicht-@', PLUS der Unterschied bei fehlendem Artefakt ──
{
  const vorlage = ladeStartvorlage('startvorlagen/beispielprojekt.json')
  const repoWurzel = process.cwd()

  // (a1) unbekannte schritt_id
  {
    const ladeOptionen = { basisVerzeichnis: `kontrollzustand-test-f652-a1-${randomUUID()}`, schreiber: () => {} }
    const schritt = baueSchritt({ eingaben: ['artefakt:pruefergebnis-@schritt-existiert-nicht'] })
    const workflowDaten = { workflow_id: 'gate-f652-a1', schritte: [schritt] }
    const ergebnis = loeseSchrittEingabenAuf(schritt, workflowDaten, undefined, 'Gate-Auftragstext.', vorlage, repoWurzel, ladeOptionen)
    if (ergebnis.ok !== false || !ergebnis.grund.includes('keine bekannte schritt_id')) {
      befunde.push(`(a1) unbekannte schritt_id: erwartet ok:false mit 'keine bekannte schritt_id', erhalten ${JSON.stringify(ergebnis)}`)
    } else {
      console.log("✓ (a1) 'pruefergebnis-@' mit unbekannter schritt_id: Schritt-Start wird abgelehnt.")
    }
  }

  // (a2) bekannte schritt_id, aber lauf_id noch null (Zielschritt noch nicht gestartet)
  {
    const ladeOptionen = { basisVerzeichnis: `kontrollzustand-test-f652-a2-${randomUUID()}`, schreiber: () => {} }
    const referenzierterSchritt = baueSchritt({ schritt_id: 'schritt-1', rolle: 'ausfuehrung', lauf_id: null })
    const schritt = baueSchritt({ eingaben: ['artefakt:pruefergebnis-@schritt-1'] })
    const workflowDaten = { workflow_id: 'gate-f652-a2', schritte: [referenzierterSchritt, schritt] }
    const ergebnis = loeseSchrittEingabenAuf(schritt, workflowDaten, undefined, 'Gate-Auftragstext.', vorlage, repoWurzel, ladeOptionen)
    if (ergebnis.ok !== false || !ergebnis.grund.includes('noch keine lauf_id')) {
      befunde.push(`(a2) Zielschritt noch nicht gestartet: erwartet ok:false mit 'noch keine lauf_id', erhalten ${JSON.stringify(ergebnis)}`)
    } else {
      console.log("✓ (a2) 'pruefergebnis-@' auf einen noch nicht gestarteten Schritt: Schritt-Start wird abgelehnt.")
    }
  }

  // (a3) Selbstreferenz
  {
    const ladeOptionen = { basisVerzeichnis: `kontrollzustand-test-f652-a3-${randomUUID()}`, schreiber: () => {} }
    const schritt = baueSchritt({ schritt_id: 'schritt-selbst', eingaben: ['artefakt:pruefergebnis-@schritt-selbst'], lauf_id: 'vorheriger-versuch-lauf-1' })
    const workflowDaten = { workflow_id: 'gate-f652-a3', schritte: [schritt] }
    const ergebnis = loeseSchrittEingabenAuf(schritt, workflowDaten, undefined, 'Gate-Auftragstext.', vorlage, repoWurzel, ladeOptionen)
    if (ergebnis.ok !== false || !ergebnis.grund.includes('verweist auf sich selbst')) {
      befunde.push(`(a3) Selbstreferenz: erwartet ok:false mit 'verweist auf sich selbst', erhalten ${JSON.stringify(ergebnis)}`)
    } else {
      console.log("✓ (a3) 'pruefergebnis-@'-Selbstreferenz wird abgelehnt.")
    }
  }

  // (a4) bekannte, gestartete schritt_id, aber KEIN 'pruefergebnis-<lauf_id>'-Artefakt registriert
  // (Startvorlage ohne pruefbefehl) — bleibt bewusst FOLGENLOS (Bauauftrag Punkt 4), anders als
  // bei 'aenderungsuebersicht-@' oben.
  {
    const basisVerzeichnis = `kontrollzustand-test-f652-a4-${randomUUID()}`
    raeumeVerzeichnis(basisVerzeichnis)
    const ladeOptionen = { basisVerzeichnis, schreiber: () => {} }
    const referenzierterSchritt = baueSchritt({ schritt_id: 'schritt-1', rolle: 'ausfuehrung', lauf_id: 'lauf-ohne-pruefergebnis' })
    const schritt = baueSchritt({ eingaben: ['artefakt:pruefergebnis-@schritt-1'] })
    const workflowDaten = { workflow_id: 'gate-f652-a4', schritte: [referenzierterSchritt, schritt] }
    const ergebnis = loeseSchrittEingabenAuf(schritt, workflowDaten, undefined, 'Gate-Auftragstext.', vorlage, repoWurzel, ladeOptionen)
    if (ergebnis.ok !== true || ergebnis.eingaben.anfragen.some((a) => a.pfad.startsWith('artefakt:pruefergebnis-'))) {
      befunde.push(`(a4) fehlendes pruefergebnis-Artefakt sollte den Schritt-Start NICHT blockieren und keine Anfrage erzeugen, erhalten ${JSON.stringify(ergebnis)}`)
    } else {
      console.log("✓ (a4) fehlendes 'pruefergebnis-<lauf_id>'-Artefakt (kein pruefbefehl konfiguriert) bleibt folgenlos — der Platzhalter entfällt still, der Schritt startet trotzdem.")
    }
    raeumeVerzeichnis(basisVerzeichnis)
  }

  // (a5) Grünfall: ein real registriertes 'pruefergebnis-<lauf_id>'-Artefakt wird korrekt aufgelöst.
  {
    const basisVerzeichnis = `kontrollzustand-test-f652-a5-${randomUUID()}`
    raeumeVerzeichnis(basisVerzeichnis)
    const ladeOptionen = { basisVerzeichnis, schreiber: () => {} }
    const zielLaufId = 'lauf-mit-pruefergebnis'
    registriereKernArtefakt(
      `pruefergebnis-${zielLaufId}`,
      leiteProfilReferenzAb(vorlage),
      { erzeuger: 'kern', schritt: 'nach-lauf-pruefschritt' },
      { pruefergebnis_schema: 'v0', lauf_id: zielLaufId, befehl: ['node'], exit_code: 0, ergebnis: 'GRUEN', dauer_ms: 5, ausgabe_ende: 'ok', gestartet_am: new Date().toISOString() },
      [],
      ladeOptionen
    )
    const referenzierterSchritt = baueSchritt({ schritt_id: 'schritt-1', rolle: 'ausfuehrung', lauf_id: zielLaufId })
    const schritt = baueSchritt({ eingaben: ['artefakt:pruefergebnis-@schritt-1'] })
    const workflowDaten = { workflow_id: 'gate-f652-a5', schritte: [referenzierterSchritt, schritt] }
    const ergebnis = loeseSchrittEingabenAuf(schritt, workflowDaten, undefined, 'Gate-Auftragstext.', vorlage, repoWurzel, ladeOptionen)
    const treffer = ergebnis.ok === true ? ergebnis.eingaben.anfragen.find((a) => a.pfad === `artefakt:pruefergebnis-${zielLaufId}`) : undefined
    if (ergebnis.ok !== true || treffer === undefined || !treffer.inhalt.includes('GRUEN')) {
      befunde.push(`(a5) real registriertes Prüfergebnis sollte aufgelöst werden, erhalten ${JSON.stringify(ergebnis)}`)
    } else {
      console.log("✓ (a5) ein real registriertes 'pruefergebnis-<lauf_id>'-Artefakt wird über 'pruefergebnis-@' korrekt aufgelöst.")
    }
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

/**
 * Baut einen startbereiten zweistufigen Workflow (ausfuehrung, freigabe AUTOMATISCH -> review)
 * an, registriert ihn und liefert die IDs — Muster workflow-vorlagen/standard.json, freigabe
 * AUTOMATISCH statt ZWINGEND, damit POST .../starten ohne zusätzlichen Freigabeschritt auslöst.
 */
function baueWorkflowFixture(basisVerzeichnis, vorlage, auftragId) {
  const workflowId = `f652-gate-${randomUUID()}`
  registriereWorkflow(
    {
      workflow_schema: 'v0',
      workflow_id: workflowId,
      auftrag_id: auftragId,
      version: 1,
      ziel: 'F-652-Gate-Fixture.',
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
          eingaben: ['artefakt:pruefergebnis-@schritt-1-ausfuehrung'],
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

/** Fire-and-forget-Attrappe: löst SOFORT als real erfolgreich beendeter, ABGESCHLOSSENER Lauf auf, fängt eingaben.auftragstext für die Instruktions-Prüfung ab (Muster check-f39-architekt.mjs (n)). */
function baueAttrappe(auftragstexte) {
  return async (laufId, _profilReferenz, eingaben) => {
    auftragstexte.set(laufId, eingaben.auftragstext ?? null)
    return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
  }
}

/** Legt Auftrag + Workflow an und startet ihn über den echten HTTP-Pfad. @returns { workflowId, ausfuehrungLaufId } */
async function starteFixture(basisUrl, basisVerzeichnis, vorlage) {
  const auftragAntwort = await fetch(`${basisUrl}/api/auftraege`, {
    method: 'POST',
    body: JSON.stringify({ titel: 'F-652-Gate', auftragstext: 'Gate-Auftragstext.' }),
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

// ─── (b) Grün: pruefbefehl mit Exitcode 0 ────────────────────────────────────────────────────
{
  const basisVerzeichnis = `kontrollzustand-test-f652-b-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const repoWurzel = neuesRepo()
  const verzeichnis = mkdtempSync(join(tmpdir(), 'f652-gate-b-'))
  // Prüft zusätzlich real, dass LEITSTAND_*-Variablen den Kindprozess nicht erreichen (Bauauftrag
  // "Tests": eigenständiger Integrationsbeleg über die volle Kette, zusätzlich zum Modultest in
  // src/pruefschritt/pruefschritt.test.ts) — nur GRUEN, wenn KEINE LEITSTAND_*-Variable ankommt.
  const startvorlagePfad = schreibeStartvorlage(verzeichnis, {
    pruefbefehl: knotenBefehl(
      'const l = Object.keys(process.env).filter(k => k.startsWith("LEITSTAND_")); ' +
        'if (l.length > 0) { console.error("LEITSTAND_-Variablen angekommen: " + l.join(",")); process.exit(1) } process.exit(0)'
    ),
    pruefZeitgrenzeMs: 10000,
  })
  const vorlage = ladeStartvorlage(startvorlagePfad)
  const auftragstexte = new Map()
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn: baueAttrappe(auftragstexte), repoWurzel, startvorlagePfad })
  try {
    const { workflowId, ausfuehrungLaufId } = await starteFixture(basisUrl, basisVerzeichnis, vorlage)
    if (ausfuehrungLaufId === null) {
      befunde.push('(b) Vorbedingung: Ausführungsschritt hat nach dem Start keine lauf_id bekommen')
    } else {
      const pruefergebnis = await warteBis(() => ladeArtefaktVersion(`pruefergebnis-${ausfuehrungLaufId}`, undefined, { basisVerzeichnis, schreiber: () => {} }), 5000)
      const workflowNachPruefung = await warteBis(() => {
        const daten = ladeWorkflow(workflowId, basisVerzeichnis)
        return daten?.schritte?.[1]?.lauf_id !== null ? daten : null
      }, 5000)
      if (pruefergebnis === null || pruefergebnis.daten.ergebnis !== 'GRUEN' || pruefergebnis.daten.exit_code !== 0) {
        befunde.push(`(b) grün: erwartet ein registriertes Prüfergebnis mit ergebnis 'GRUEN'/exit_code 0, erhalten ${JSON.stringify(pruefergebnis?.daten)}`)
      } else if (workflowNachPruefung?.schritte?.[1]?.lauf_id === null || workflowNachPruefung?.schritte?.[1]?.lauf_id === undefined) {
        befunde.push('(b) grün: der Review-Schritt sollte nach GRUEN automatisch starten (lauf_id gesetzt), tat es aber nicht')
      } else if (!(auftragstexte.get(ausfuehrungLaufId) ?? '').includes('Tests und Checks führt das System nach deinem Lauf deterministisch selbst aus')) {
        befunde.push(`(b) grün: der Ausführungs-Auftragstext sollte den F-652-Hinweissatz tragen (pruefbefehl ist konfiguriert), erhalten: ${JSON.stringify(auftragstexte.get(ausfuehrungLaufId))}`)
      } else {
        console.log('✓ (b) grün: pruefbefehl mit Exitcode 0 registriert ein GRUEN-Prüfergebnis, der Review-Schritt startet automatisch, die Ausführungs-Instruktion trägt den Hinweissatz, keine LEITSTAND_-Variable erreichte den Prüfprozess.')
      }

      // (h) GET /api/workflows/<id>: additive 'pruefergebnis'-Projektion spiegelt den Grünfall.
      const projektionAntwort = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}`)
      const projektion = await projektionAntwort.json()
      if (projektion.pruefergebnis?.status !== 'ok' || projektion.pruefergebnis?.ergebnis !== 'GRUEN' || projektion.pruefergebnis?.exitCode !== 0) {
        befunde.push(`(h) GET .../<id>: erwartet pruefergebnis {status:'ok', ergebnis:'GRUEN', exitCode:0}, erhalten ${JSON.stringify(projektion.pruefergebnis)}`)
      } else {
        console.log("✓ (h) GET /api/workflows/<id> liefert additiv die 'pruefergebnis'-Projektion (status 'ok', ergebnis 'GRUEN').")
      }
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
    raeumeVerzeichnis(repoWurzel)
    raeumeVerzeichnis(verzeichnis)
  }
}

// ─── (c) Rot: pruefbefehl mit Exitcode 1 — KLAERUNG_ERFORDERLICH, kein Review-Start ──────────
{
  const basisVerzeichnis = `kontrollzustand-test-f652-c-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const repoWurzel = neuesRepo()
  const verzeichnis = mkdtempSync(join(tmpdir(), 'f652-gate-c-'))
  const startvorlagePfad = schreibeStartvorlage(verzeichnis, {
    pruefbefehl: knotenBefehl('console.error("FEHLER: Gate-Rotfall irgendwas ist kaputt"); process.exit(1)'),
    pruefZeitgrenzeMs: 10000,
  })
  const vorlage = ladeStartvorlage(startvorlagePfad)
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn: baueAttrappe(new Map()), repoWurzel, startvorlagePfad })
  try {
    const { workflowId, ausfuehrungLaufId } = await starteFixture(basisUrl, basisVerzeichnis, vorlage)
    const workflowNachPruefung = await warteBis(() => {
      const daten = ladeWorkflow(workflowId, basisVerzeichnis)
      return daten?.status === 'KLAERUNG_ERFORDERLICH' ? daten : null
    }, 5000)
    const pruefergebnis = ausfuehrungLaufId === null ? null : ladeArtefaktVersion(`pruefergebnis-${ausfuehrungLaufId}`, undefined, { basisVerzeichnis, schreiber: () => {} })
    if (pruefergebnis === null || pruefergebnis.daten.ergebnis !== 'ROT' || pruefergebnis.daten.exit_code !== 1) {
      befunde.push(`(c) rot: erwartet ein registriertes Prüfergebnis mit ergebnis 'ROT'/exit_code 1, erhalten ${JSON.stringify(pruefergebnis?.daten)}`)
    } else if (workflowNachPruefung?.status !== 'KLAERUNG_ERFORDERLICH') {
      befunde.push(`(c) rot: Workflow sollte auf KLAERUNG_ERFORDERLICH stehen, erhalten status '${workflowNachPruefung?.status}'`)
    } else if (!workflowNachPruefung.grund?.includes('ROT') || !workflowNachPruefung.grund?.includes('Gate-Rotfall irgendwas ist kaputt')) {
      befunde.push(`(c) rot: grund sollte 'ROT' und das Ausgabeende enthalten, erhalten ${JSON.stringify(workflowNachPruefung?.grund)}`)
    } else if (workflowNachPruefung.schritte?.[1]?.lauf_id !== null) {
      befunde.push(`(c) rot: der Review-Schritt sollte NICHT starten, hat aber lauf_id '${workflowNachPruefung.schritte?.[1]?.lauf_id}'`)
    } else {
      console.log('✓ (c) rot: pruefbefehl mit Exitcode 1 registriert ein ROT-Prüfergebnis, der Workflow geht auf KLAERUNG_ERFORDERLICH (grund enthält Ergebnis + Ausgabeende), der Review-Schritt startet NICHT.')
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
    raeumeVerzeichnis(repoWurzel)
    raeumeVerzeichnis(verzeichnis)
  }
}

// ─── (d) Zeitgrenze: pruefbefehl überschreitet pruefZeitgrenzeMs — ZEITGRENZE, Prozessbaum real beendet ──
{
  const basisVerzeichnis = `kontrollzustand-test-f652-d-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const repoWurzel = neuesRepo()
  const verzeichnis = mkdtempSync(join(tmpdir(), 'f652-gate-d-'))
  const markerPfad = join(verzeichnis, 'marker.txt').replace(/\\/g, '\\\\')
  // Großer Abstand (200ms Zeitgrenze vs. 6s Marker) statt einer knappen Wanduhr-Assertion (Muster
  // src/pruefschritt/pruefschritt.test.ts): unter Systemlast kann selbst ein real gekillter
  // Prozess länger als eine knappe Sekunde bis zur endgültigen Auflösung brauchen.
  const startvorlagePfad = schreibeStartvorlage(verzeichnis, {
    pruefbefehl: knotenBefehl(`setTimeout(() => { require('node:fs').writeFileSync('${markerPfad}', 'zu spaet'); process.exit(0) }, 6000)`),
    pruefZeitgrenzeMs: 200,
  })
  const vorlage = ladeStartvorlage(startvorlagePfad)
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn: baueAttrappe(new Map()), repoWurzel, startvorlagePfad })
  try {
    const { workflowId, ausfuehrungLaufId } = await starteFixture(basisUrl, basisVerzeichnis, vorlage)
    const pruefergebnis = ausfuehrungLaufId === null ? null : await warteBis(() => ladeArtefaktVersion(`pruefergebnis-${ausfuehrungLaufId}`, undefined, { basisVerzeichnis, schreiber: () => {} }), 5000)
    const workflowNachPruefung = ladeWorkflow(workflowId, basisVerzeichnis)
    // Nachlauffrist für den real gemessenen Kill (Windows-Jobobjekt/taskkill, prozessstart.ts).
    await verzoegerung(300)
    if (pruefergebnis === null || pruefergebnis.daten.ergebnis !== 'ZEITGRENZE' || pruefergebnis.daten.exit_code !== null) {
      befunde.push(`(d) Zeitgrenze: erwartet ein Prüfergebnis mit ergebnis 'ZEITGRENZE'/exit_code null, erhalten ${JSON.stringify(pruefergebnis?.daten)}`)
    } else if (workflowNachPruefung?.status !== 'KLAERUNG_ERFORDERLICH') {
      befunde.push(`(d) Zeitgrenze: Workflow sollte auf KLAERUNG_ERFORDERLICH stehen, erhalten status '${workflowNachPruefung?.status}'`)
    } else if (existsSync(join(verzeichnis, 'marker.txt'))) {
      befunde.push('(d) Zeitgrenze: Markerdatei existiert — der Prüfprozess lief trotz Zeitgrenze bis zum Ende durch, statt real beendet zu werden')
    } else {
      console.log('✓ (d) Zeitgrenze: ein die Zeitgrenze überschreitender pruefbefehl liefert ZEITGRENZE, der Workflow geht auf KLAERUNG_ERFORDERLICH, der Prozessbaum wurde real beendet (Markerdatei nie geschrieben).')
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
    raeumeVerzeichnis(repoWurzel)
    raeumeVerzeichnis(verzeichnis)
  }
}

// ─── (e) kein pruefbefehl: bitgenau wie vor F-652 ────────────────────────────────────────────
{
  const basisVerzeichnis = `kontrollzustand-test-f652-e-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const repoWurzel = neuesRepo()
  const verzeichnis = mkdtempSync(join(tmpdir(), 'f652-gate-e-'))
  // Keine pruefbefehl/pruefZeitgrenzeMs im zusatz — bitgenau die alte Form, nur additiv um den
  // worker.codex-Block ergänzt (Muster schreibeStartvorlage-Kommentar: die Fixture braucht ihn
  // für den 'codex'-Review-Schritt, unabhängig von F-652).
  const startvorlagePfad = schreibeStartvorlage(verzeichnis)
  const vorlage = ladeStartvorlage(startvorlagePfad)
  const auftragstexte = new Map()
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn: baueAttrappe(auftragstexte), repoWurzel, startvorlagePfad })
  try {
    const { workflowId, ausfuehrungLaufId } = await starteFixture(basisUrl, basisVerzeichnis, vorlage)
    const workflowNachLauf = await warteBis(() => {
      const daten = ladeWorkflow(workflowId, basisVerzeichnis)
      return daten?.schritte?.[1]?.lauf_id !== null ? daten : null
    }, 2000)
    const pruefergebnis = ausfuehrungLaufId === null ? null : ladeArtefaktVersion(`pruefergebnis-${ausfuehrungLaufId}`, undefined, { basisVerzeichnis, schreiber: () => {} })
    if (pruefergebnis !== null) {
      befunde.push(`(e) kein pruefbefehl: es sollte KEIN Prüfergebnis-Artefakt entstehen, erhalten ${JSON.stringify(pruefergebnis.daten)}`)
    } else if (workflowNachLauf?.schritte?.[1]?.lauf_id === null || workflowNachLauf?.schritte?.[1]?.lauf_id === undefined) {
      befunde.push('(e) kein pruefbefehl: der Review-Schritt sollte unverändert automatisch starten')
    } else if ((auftragstexte.get(ausfuehrungLaufId) ?? '').includes('Tests und Checks führt das System')) {
      befunde.push('(e) kein pruefbefehl: der Ausführungs-Auftragstext sollte den F-652-Hinweissatz NICHT tragen')
    } else {
      console.log('✓ (e) ohne pruefbefehl bleibt der Ablauf bitgenau wie vor F-652: kein Prüfergebnis-Artefakt, kein Hinweissatz, der Review-Schritt startet unverändert automatisch.')
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
    raeumeVerzeichnis(repoWurzel)
    raeumeVerzeichnis(verzeichnis)
  }
}

// ─── (f) lesender Lauf: keine Prüfung, obwohl pruefbefehl konfiguriert ist ───────────────────
{
  const basisVerzeichnis = `kontrollzustand-test-f652-f-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const verzeichnis = mkdtempSync(join(tmpdir(), 'f652-gate-f-'))
  const startvorlagePfad = schreibeStartvorlage(verzeichnis, { pruefbefehl: knotenBefehl('process.exit(0)'), pruefZeitgrenzeMs: 10000 })
  const vorlage = ladeStartvorlage(startvorlagePfad)
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn: baueAttrappe(new Map()), startvorlagePfad })
  try {
    const auftragAntwort = await fetch(`${basisUrl}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel: 'F-652-Gate-lesend', auftragstext: 'Gate-Auftragstext.' }) })
    const { auftragId } = await auftragAntwort.json()
    const laufId = `f652-gate-lesend-${randomUUID()}`
    const startAntwort = await fetch(`${basisUrl}/api/laeufe`, {
      method: 'POST',
      body: JSON.stringify({ laufId, rolle: 'code-reviewer', anfragen: [], budget: {}, aufrufEingaben: { modell: 'claude-sonnet-5' }, auftragId, werkzeugsatz: 'lesend' }),
    })
    if (startAntwort.status !== 202) {
      befunde.push(`(f) Vorbedingung: POST /api/laeufe (lesend) erwartet 202, erhalten ${startAntwort.status} (${await startAntwort.text()})`)
    } else {
      await verzoegerung(150)
      const pruefergebnis = ladeArtefaktVersion(`pruefergebnis-${laufId}`, undefined, { basisVerzeichnis, schreiber: () => {} })
      if (pruefergebnis !== null) {
        befunde.push(`(f) lesender Lauf: es sollte KEIN Prüfergebnis-Artefakt entstehen (nur schreibende Werkzeugsätze), erhalten ${JSON.stringify(pruefergebnis.daten)}`)
      } else {
        console.log('✓ (f) ein lesender Lauf löst KEINE Prüfung aus, obwohl die Startvorlage einen pruefbefehl trägt.')
      }
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
    raeumeVerzeichnis(verzeichnis)
  }
}

// ─── (g) D13: ein Startversuch während die Prüfung noch läuft wird abgelehnt ─────────────────
{
  const basisVerzeichnis = `kontrollzustand-test-f652-g-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const repoWurzel = neuesRepo()
  const verzeichnis = mkdtempSync(join(tmpdir(), 'f652-gate-g-'))
  // 600ms Prüfdauer — lang genug, um sicher einen Request währenddessen abzusetzen, kurz genug
  // für einen schnellen Gate-Lauf.
  const startvorlagePfad = schreibeStartvorlage(verzeichnis, { pruefbefehl: knotenBefehl('setTimeout(() => process.exit(0), 600)'), pruefZeitgrenzeMs: 10000 })
  const vorlage = ladeStartvorlage(startvorlagePfad)
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn: baueAttrappe(new Map()), repoWurzel, startvorlagePfad })
  try {
    const auftragAntwort = await fetch(`${basisUrl}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel: 'F-652-Gate-D13', auftragstext: 'Gate-Auftragstext.' }) })
    const { auftragId } = await auftragAntwort.json()
    const workflowId = baueWorkflowFixture(basisVerzeichnis, vorlage, auftragId)
    const startAntwort = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
    if (startAntwort.status !== 202) {
      befunde.push(`(g) Vorbedingung: POST .../starten erwartet 202, erhalten ${startAntwort.status}`)
    } else {
      // Der Ausführungslauf ist über die Attrappe SOFORT "beendet" — die Prüfung selbst läuft
      // jetzt real 600ms. Ein zweiter Start MUSS in diesem Fenster mit 409 (D13) abgelehnt
      // werden, weil laufAktiv erst NACH der Prüfung zurückgesetzt wird (Bauauftrag Punkt 3).
      await verzoegerung(150)
      const zweiterLaufId = `f652-gate-d13-zweitversuch-${randomUUID()}`
      const zweiterVersuch = await fetch(`${basisUrl}/api/laeufe`, {
        method: 'POST',
        body: JSON.stringify({ laufId: zweiterLaufId, rolle: 'code-reviewer', anfragen: [], budget: {}, aufrufEingaben: { modell: 'claude-sonnet-5' }, auftragId, werkzeugsatz: 'lesend' }),
      })
      if (zweiterVersuch.status !== 409) {
        befunde.push(`(g) D13: ein Startversuch während der laufenden Prüfung sollte mit 409 abgelehnt werden, erhalten ${zweiterVersuch.status} (${await zweiterVersuch.text()})`)
      } else {
        // Nach Prüfungsende muss der Server wieder frei sein — sonst wäre D13 nicht nur
        // gehalten, sondern dauerhaft (nie wieder freigegeben) verletzt.
        const freiDanach = await warteBis(async () => {
          const antwort = await fetch(`${basisUrl}/api/laeufe`, {
            method: 'POST',
            body: JSON.stringify({ laufId: `f652-gate-d13-danach-${randomUUID()}`, rolle: 'code-reviewer', anfragen: [], budget: {}, aufrufEingaben: { modell: 'claude-sonnet-5' }, auftragId, werkzeugsatz: 'lesend' }),
          })
          return antwort.status === 202 ? true : null
        }, 3000)
        if (!freiDanach) {
          befunde.push('(g) D13: der Server sollte nach Ende der Prüfung wieder frei sein (202 auf einen neuen Start), blieb aber gesperrt')
        } else {
          console.log('✓ (g) D13: ein Startversuch während der laufenden Prüfung wird mit 409 abgelehnt; nach Prüfungsende ist der Server wieder frei.')
        }
      }
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
    raeumeVerzeichnis(repoWurzel)
    raeumeVerzeichnis(verzeichnis)
  }
}

// ─── (i) F-654 (state/findings.md F-654, BUG P1, schließt ein Fail-open-Loch in F-652) ───────
//
// Ist vorlage.pruefbefehl gesetzt, aber die Registrierung von 'pruefergebnis-<laufId>' scheitert
// (Schemaverstoß oder ein Wurf aus registriereKernArtefakt/fuehrePruefungDurch), darf der
// Workflow NICHT ungeprüft zum Review durchlaufen — vor dem Fix blieb 'pruefergebnis' in diesem
// Fall undefined, Regel 1f griff nicht (fail open). Erzwungen über eine reale Schreibkollision:
// registriereKernArtefakt schreibt nach '<basisVerzeichnis>/lineage-pruefergebnis-<laufId>/
// checkpoints' (src/checkpoint-store/index.ts checkpointVerzeichnis) — eine vorab angelegte
// DATEI genau an der Stelle des Verzeichnisses lässt mkdirSync(..., {recursive:true}) real mit
// ENOTDIR scheitern, kein simulierter/gestubbter Fehler.
{
  const basisVerzeichnis = `kontrollzustand-test-f652-i-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const repoWurzel = neuesRepo()
  const verzeichnis = mkdtempSync(join(tmpdir(), 'f652-gate-i-'))
  // 300ms Verzögerung im Prüfbefehl selbst — gibt dem Test genug Zeit, die Schreibkollision zu
  // legen, BEVOR starteLaufUndVergiss registriereKernArtefakt aufruft (kein Rennen nötig, anders
  // als bei (g)/(d) reicht hier kein bloßer Zeitabstand zwischen zwei HTTP-Requests).
  const startvorlagePfad = schreibeStartvorlage(verzeichnis, { pruefbefehl: knotenBefehl('setTimeout(() => process.exit(0), 300)'), pruefZeitgrenzeMs: 10000 })
  const vorlage = ladeStartvorlage(startvorlagePfad)
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn: baueAttrappe(new Map()), repoWurzel, startvorlagePfad })
  try {
    const auftragAntwort = await fetch(`${basisUrl}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel: 'F-654-Gate', auftragstext: 'Gate-Auftragstext.' }) })
    const { auftragId } = await auftragAntwort.json()
    const workflowId = baueWorkflowFixture(basisVerzeichnis, vorlage, auftragId)
    const startAntwort = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
    if (startAntwort.status !== 202) {
      befunde.push(`(i) Vorbedingung: POST .../starten erwartet 202, erhalten ${startAntwort.status}`)
    } else {
      const { laufId } = await startAntwort.json()
      mkdirSync(basisVerzeichnis, { recursive: true })
      writeFileSync(join(basisVerzeichnis, `lineage-pruefergebnis-${laufId}`), 'blockiert-das-verzeichnis')

      const workflowNachPruefung = await warteBis(() => {
        const daten = ladeWorkflow(workflowId, basisVerzeichnis)
        return daten?.status === 'KLAERUNG_ERFORDERLICH' ? daten : null
      }, 5000)
      const pruefergebnisVersion = ladeArtefaktVersion(`pruefergebnis-${laufId}`, undefined, { basisVerzeichnis, schreiber: () => {} })
      if (pruefergebnisVersion !== null) {
        befunde.push(`(i) Vorbedingung verletzt: das Prüfergebnis-Artefakt wurde trotz der Schreibkollision registriert, erhalten ${JSON.stringify(pruefergebnisVersion.daten)}`)
      } else if (workflowNachPruefung?.status !== 'KLAERUNG_ERFORDERLICH') {
        befunde.push(`(i) F-654: eine gescheiterte Prüfergebnis-Registrierung sollte den Workflow fail-closed auf KLAERUNG_ERFORDERLICH halten, erhalten status '${workflowNachPruefung?.status}'`)
      } else if (!workflowNachPruefung.grund?.includes('FEHLER') || !workflowNachPruefung.grund?.includes('Prüfergebnis fehlt')) {
        befunde.push(`(i) F-654: grund sollte 'FEHLER' und den Hinweis auf das fehlende Prüfergebnis nennen, erhalten ${JSON.stringify(workflowNachPruefung?.grund)}`)
      } else if (workflowNachPruefung.schritte?.[1]?.lauf_id !== null) {
        befunde.push(`(i) F-654: der Review-Schritt sollte NICHT starten (fail closed), hat aber lauf_id '${workflowNachPruefung.schritte?.[1]?.lauf_id}'`)
      } else {
        console.log("✓ (i) F-654: eine gescheiterte Prüfergebnis-Registrierung (reale Schreibkollision trotz konfiguriertem pruefbefehl) hält den Workflow fail-closed auf KLAERUNG_ERFORDERLICH, statt ungeprüft zum Review durchzulassen.")
      }
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
