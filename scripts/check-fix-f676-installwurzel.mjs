#!/usr/bin/env node
/**
 * Datei: scripts/check-fix-f676-installwurzel.mjs
 *
 * Zweck: Gate für E-F41-2 (Stefan, 24.09.2026, löst state/findings.md F-676:
 * "Workforce-Assets werden relativ zum Projekt-Repo aufgelöst — neue Projekte
 * nicht lauffähig"). Real beobachtet im F41-WS-3-Reallauf (Projekt
 * haushaltsbuch, Auftrag 1c82e21f-dd90-43bb-8338-78c9a750b002): ein
 * Coach-Turn im Modus 'projekt' scheiterte mit 500 ENOENT
 * '…\haushaltsbuch\ressourcen.json', ein Router-Lauf lieferte eine
 * Klassifikation, die nicht gegen schemas/ergebnis-router.schema.json passte
 * (das Modell erriet Feldnamen, weil es im PROJEKT-cwd kein schemas/ fand).
 *
 * Baut ein "Fremdprojekt ohne Workforce-Assets" (Muster F41 WS-1 — real
 * `kopiereBaseline`/`schreibeStartvorlageUndProfil` aufgerufen, keine
 * Attrappe): ein Wegwerf-Verzeichnis, das NUR die Harness-Baseline trägt
 * (.claude/settings.json + referenzierte Hooks, state/aktuelle-
 * autorisierung.json, startvorlagen/<id>.json, profiles/<id>.json,
 * .gitignore) — EXPLIZIT OHNE ressourcen.json/schemas//workflow-vorlagen/,
 * bitgenau wie ein über POST /api/projekte real angelegtes Projekt.
 *
 * Prüft (LLM-Antworten durchgehend gestubbt/direkt vorbereitet, kein echter
 * Werkzeuglauf nötig — dieser Fund lag VOR jedem Modellaufruf):
 * (0) Rot-Fall — OHNE E-F41-2 (Workforce-Assets gegen die Projekt-repoWurzel
 *     statt installWurzel aufgelöst): `leseRessourcenRoh`-Äquivalent wirft,
 *     `loeseAusgabeSchemaAuf` liefert ok:false, `waehleWorkflowVorlage` wirft
 *     — alle drei real gegen das Fremdprojekt-Verzeichnis kalibriert, damit
 *     dieses Gate den behobenen Fehler auch tatsächlich zeigt (ohne Fix
 *     schlägt der Fall real fehl).
 * (1) Coach-Kontext/Capability-Auszug: dieselbe Aufrufkette wie POST
 *     /api/sparring (Modus 'projekt') und der 'architekt'-Schrittstart —
 *     `leseRessourcenRoh(installWurzel)` → `loeseRessourcenAuf(...,
 *     repoWurzel, startvorlagePfad)` → `baueCapabilityAuszug(...)` — läuft
 *     gegen das Fremdprojekt durch, ohne dass ressourcen.json dort existiert.
 * (2) Router-Validierung + Vorlagenladen für fast-lane/standard/hoch: je
 *     Kontrolltiefe eine gültige Klassifikation gegen `validiereErgebnisRouter`
 *     UND `waehleWorkflowVorlage(..., installWurzel, ...)` — lädt
 *     workflow-vorlagen/<tiefe>.json aus der Installationswurzel, nicht aus
 *     dem (leeren) Fremdprojekt. Für 'hoch' zusätzlich der volle
 *     `verarbeiteRouterErgebnis`-Durchlauf (dieselbe Funktion, die
 *     POST /api/auftraege/<id>/routen real aufruft) mit `repoWurzel` =
 *     Fremdprojekt UND `installWurzel` = Installationswurzel als getrennte
 *     Parameter — beweist die Server-Verdrahtung, nicht nur die reine
 *     Funktion.
 * (3) Architekt-Output-Schema-Auflösung: `loeseSchrittEingabenAuf` für einen
 *     'architekt'-Schritt (worker 'codex', output_schema
 *     'ergebnis-architektur') gegen das Fremdprojekt — der aufgelöste
 *     `ausgabeSchemaPfad` liegt real außerhalb des Fremdprojekt-Verzeichnisses
 *     (in der Installationswurzel).
 *
 * Wird aufgerufen von: `npm run check`.
 *
 * Aufruf: node scripts/check-fix-f676-installwurzel.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { kopiereBaseline, schreibeStartvorlageUndProfil } from '../src/projekt-anlegen/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { loeseRessourcenAuf } from '../src/ressourcen/index.ts'
import { baueCapabilityAuszug } from '../src/product-coach/index.ts'
import { validiereErgebnisRouter, waehleWorkflowVorlage } from '../src/router/index.ts'
import { validiereWorkflowDaten } from '../src/workflow/index.ts'
import { loeseAusgabeSchemaAuf, loeseSchrittEingabenAuf, verarbeiteRouterErgebnis } from './leitstand-server.mjs'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []
console.log('\n=== Fix-Check E-F41-2 (F-676): Workforce-Assets aus der Installationswurzel ===\n')

const INSTALL_WURZEL = process.cwd()
const FREMDPROJEKT = mkdtempSync(join(tmpdir(), 'check-f676-fremdprojekt-'))
const FREMDPROJEKT_ID = 'fremdprojekt'
const FREMD_STARTVORLAGE_PFAD = join(FREMDPROJEKT, 'startvorlagen', `${FREMDPROJEKT_ID}.json`)

/** Klassifikations-Fixture je Kontrolltiefe — real gültig gegen validiereErgebnisRouter. */
function klassifikation(kontrolltiefe) {
  return { kontrolltiefe, risikoklasse: 'mittel', task_typen: ['bugfix'], rueckfragen: [], begruendung: 'Gate-Fixture.' }
}

/** Erwartete Rolle des ersten Schritts je Kontrolltiefe-Vorlage (workflow-vorlagen/<tiefe>.json). */
const ERWARTETE_ERSTE_ROLLE = { 'fast-lane': 'ausfuehrung', standard: 'ausfuehrung', hoch: 'architekt' }

try {
  // ─── Setup: Fremdprojekt real wie F41 WS-1 anlegen (kein Attrappen-Baseline) ──────────
  kopiereBaseline(INSTALL_WURZEL, FREMDPROJEKT)
  schreibeStartvorlageUndProfil(FREMDPROJEKT_ID, INSTALL_WURZEL, FREMDPROJEKT)

  const fehlendeAssets = ['ressourcen.json', 'schemas', 'workflow-vorlagen'].filter((p) => existsSync(join(FREMDPROJEKT, p)))
  if (fehlendeAssets.length > 0) {
    befunde.push(`Setup: Fremdprojekt-Fixture trägt Workforce-Assets, die ein echtes F41-Projekt NICHT hat (${fehlendeAssets.join(', ')}) — Fixture nicht repräsentativ.`)
  } else {
    console.log('✓ Setup: Fremdprojekt trägt nur die Harness-Baseline (Muster F41 WS-1) — kein ressourcen.json/schemas//workflow-vorlagen/, genau wie ein echtes neues Projekt.')
  }

  // ─── (0) Rot-Fall: OHNE E-F41-2 (Auflösung gegen die Projekt-repoWurzel statt installWurzel) ──
  {
    const befundeVor = befunde.length
    let leseRessourcenWarf = false
    try {
      JSON.parse(readFileSync(join(FREMDPROJEKT, 'ressourcen.json'), 'utf8'))
    } catch {
      leseRessourcenWarf = true
    }
    if (!leseRessourcenWarf) befunde.push('(0) Rot-Fall: ressourcen.json sollte im Fremdprojekt NICHT lesbar sein — Fixture-Fehler oder Datei existiert doch.')

    const schemaRot = loeseAusgabeSchemaAuf('ergebnis-router', FREMDPROJEKT)
    if (schemaRot.ok !== false) befunde.push(`(0) Rot-Fall: loeseAusgabeSchemaAuf('ergebnis-router', <Fremdprojekt>) sollte ok:false liefern (schemas/ existiert dort nicht), erhalten ${JSON.stringify(schemaRot)}`)

    let vorlageWarf = false
    try {
      waehleWorkflowVorlage(klassifikation('hoch'), 'auftrag-rot', 'Ziel', FREMDPROJEKT)
    } catch {
      vorlageWarf = true
    }
    if (!vorlageWarf) befunde.push('(0) Rot-Fall: waehleWorkflowVorlage(..., <Fremdprojekt>) sollte werfen (workflow-vorlagen/hoch.json existiert dort nicht).')

    if (befunde.length === befundeVor) {
      console.log('✓ (0) Rot-Fall real kalibriert: gegen die Projekt-repoWurzel aufgelöst, schlagen ressourcen.json/Output-Schema/Workflow-Vorlage alle drei fehl — genau der reale F41-WS-3-Befund.')
    }
  }

  // ─── (1) Coach-Kontext/Capability-Auszug (POST /api/sparring Modus 'projekt', Schrittstart 'architekt') ──
  {
    const befundeVor = befunde.length
    let ressourcenRoh
    try {
      ressourcenRoh = JSON.parse(readFileSync(join(INSTALL_WURZEL, 'ressourcen.json'), 'utf8'))
    } catch (fehler) {
      befunde.push(`(1) leseRessourcenRoh(installWurzel) sollte gegen die Installationswurzel gelingen, warf aber: ${fehler.message}`)
    }
    if (ressourcenRoh !== undefined) {
      let aufgeloest
      try {
        aufgeloest = loeseRessourcenAuf(ressourcenRoh.ressourcen, FREMDPROJEKT, FREMD_STARTVORLAGE_PFAD)
      } catch (fehler) {
        befunde.push(`(1) loeseRessourcenAuf(..., <Fremdprojekt>, <Fremdprojekt-Startvorlage>) sollte NICHT werfen, warf aber: ${fehler.message}`)
      }
      if (aufgeloest !== undefined) {
        const auszug = baueCapabilityAuszug(aufgeloest)
        if (typeof auszug !== 'string' || auszug.length === 0) {
          befunde.push(`(1) baueCapabilityAuszug(...) sollte einen nicht-leeren Text liefern, erhalten ${JSON.stringify(auszug)}`)
        }
        // F-676/F-677: ein nicht-leerer Auszug allein beweist NICHT, dass die Worker aufgelöst
        // wurden — "alle Worker nicht verfügbar" ist ebenfalls ein nicht-leerer Text (genau der
        // reale F41-WS-3-Befund, den dieser Fall vor der Verschärfung nicht zeigte). FREMD_
        // STARTVORLAGE_PFAD ist absichtlich schon absolut (Form aus loeseProjektPfade,
        // scripts/leitstand-server.mjs:8100) — der Rot-Fall vor E-F41-2 war join(repoWurzel,
        // <bereits absoluter Pfad>), was unter Windows zu einem verdoppelten, nicht existenten
        // Pfad führte und beide Worker als verfuegbar:false auflöste.
        for (const workerId of ['codex', 'claude-code']) {
          const eintrag = aufgeloest.find((r) => r.id === workerId)
          if (eintrag === undefined) {
            befunde.push(`(1) aufgeloest sollte einen Eintrag '${workerId}' enthalten, erhalten ids ${JSON.stringify(aufgeloest.map((r) => r.id))}`)
          } else if (eintrag.verfuegbar !== true) {
            befunde.push(`(1) loeseRessourcenAuf(..., <Fremdprojekt>, <absoluter Fremdprojekt-Startvorlagenpfad>) sollte '${workerId}' als verfuegbar:true auflösen, erhalten verfuegbar:${eintrag.verfuegbar} (${eintrag.grund})`)
          }
        }
      }
    }
    if (befunde.length === befundeVor) {
      console.log("✓ (1) Coach-Kontext/Capability-Auszug: leseRessourcenRoh(installWurzel) → loeseRessourcenAuf → baueCapabilityAuszug laufen gegen das Fremdprojekt durch, ohne dass ressourcen.json dort existiert (löst den real beobachteten 500 ENOENT) — codex UND claude-code verfuegbar:true trotz absolutem Fremdprojekt-Startvorlagenpfad (F-676/F-677).")
    }
  }

  // ─── (2) Router-Validierung + Vorlagenladen für fast-lane/standard/hoch ────────────────
  for (const tiefe of ['fast-lane', 'standard', 'hoch']) {
    const befundeVor = befunde.length
    const k = klassifikation(tiefe)

    const validierungsVerstoesse = validiereErgebnisRouter(k)
    if (validierungsVerstoesse.length > 0) {
      befunde.push(`(2) ${tiefe}: Klassifikations-Fixture sollte gültig sein, Verstöße: ${validierungsVerstoesse.join('; ')}`)
    }

    let workflow
    try {
      workflow = waehleWorkflowVorlage(k, `auftrag-${tiefe}`, 'Testziel', INSTALL_WURZEL)
    } catch (fehler) {
      befunde.push(`(2) ${tiefe}: waehleWorkflowVorlage(..., installWurzel) sollte workflow-vorlagen/${tiefe}.json aus der Installationswurzel laden, warf aber: ${fehler.message}`)
    }
    if (workflow !== undefined) {
      if (workflow.schritte[0]?.rolle !== ERWARTETE_ERSTE_ROLLE[tiefe]) {
        befunde.push(`(2) ${tiefe}: erster Schritt sollte Rolle '${ERWARTETE_ERSTE_ROLLE[tiefe]}' tragen, erhalten '${workflow.schritte[0]?.rolle}'`)
      }
      const workflowVerstoesse = validiereWorkflowDaten(workflow)
      if (workflowVerstoesse.length > 0) {
        befunde.push(`(2) ${tiefe}: aus der Installationswurzel geladene Vorlage verletzt WORKFLOW_V0: ${workflowVerstoesse.join('; ')}`)
      }
    }
    if (befunde.length === befundeVor) {
      console.log(`✓ (2) ${tiefe}: Klassifikation gültig, workflow-vorlagen/${tiefe}.json aus der Installationswurzel geladen (erster Schritt '${ERWARTETE_ERSTE_ROLLE[tiefe]}'), WORKFLOW_V0-konform.`)
    }
  }

  // ─── (2b) Voller Server-Durchlauf (verarbeiteRouterErgebnis, dieselbe Funktion wie POST /api/auftraege/<id>/routen) für 'hoch' ──
  {
    const basisVerzeichnis = `kontrollzustand-test-f676-${randomUUID()}`
    raeumeVerzeichnis(basisVerzeichnis)
    try {
      const profilReferenz = leiteProfilReferenzAb(ladeStartvorlage('startvorlagen/beispielprojekt.json'))
      const auftragId = `f676-hoch-${randomUUID()}`
      const laufId = `router-${auftragId}-${Date.now()}`
      const rohstromPfad = join(basisVerzeichnis, 'rohstrom.json')
      mkdirSync(basisVerzeichnis, { recursive: true })
      const stdout = `${JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: JSON.stringify(klassifikation('hoch')) } })}\n`
      writeFileSync(rohstromPfad, JSON.stringify({ stdout }), 'utf8')
      const laufakte = { worker: 'codex', rohstrom_referenz: { pfad: rohstromPfad } }
      const auftragVersion = { daten: { titel: 'Gate-Fixture F-676' }, inhaltsHash: 'f'.repeat(64) }
      const ladeOptionen = { basisVerzeichnis, schreiber: () => {} }

      const befundeVor = befunde.length
      // repoWurzel = Fremdprojekt (kein workflow-vorlagen/), installWurzel = Installationswurzel —
      // genau die Parametertrennung, die scripts/leitstand-server.mjs' POST /routen-Route seit
      // E-F41-2 an verarbeiteRouterErgebnis durchreicht.
      const ergebnis = verarbeiteRouterErgebnis(laufakte, auftragId, laufId, auftragVersion, FREMDPROJEKT, profilReferenz, ladeOptionen, INSTALL_WURZEL)
      if (!ergebnis.ok) {
        befunde.push(`(2b) verarbeiteRouterErgebnis gegen das Fremdprojekt (repoWurzel) mit installWurzel=Installationswurzel sollte ok:true liefern, erhalten ok:false (${ergebnis.grund})`)
      } else if (ergebnis.workflowId === undefined) {
        befunde.push(`(2b) verarbeiteRouterErgebnis: ok:true, aber keine workflowId geliefert: ${JSON.stringify(ergebnis)}`)
      }
      if (befunde.length === befundeVor) {
        console.log(`✓ (2b) Voller Server-Durchlauf (verarbeiteRouterErgebnis, 'hoch'): Router-Ergebnis UND Workflow real registriert, repoWurzel=Fremdprojekt/installWurzel=Installationswurzel getrennt übergeben — genau die Produktions-Verdrahtung.`)
      }
    } finally {
      raeumeVerzeichnis(basisVerzeichnis)
    }
  }

  // ─── (3) Architekt-Output-Schema-Auflösung (Workflow-Schrittstart, worker 'codex') ─────
  {
    const befundeVor = befunde.length
    const vorlage = ladeStartvorlage('startvorlagen/ai-workforce.json') // trägt worker.codex (beispielprojekt.json nicht)
    const schritt = {
      schritt_id: 'schritt-1-architekt',
      rolle: 'architekt',
      werkzeugsatz: 'lesend',
      worker: 'codex',
      modell: 'gpt-6-astra',
      eingaben: [],
      output_schema: 'ergebnis-architektur',
    }
    const workflowDaten = { workflow_id: 'wf-f676', auftrag_id: 'auftrag-f676-architekt', schritte: [schritt] }
    const ladeOptionen = { basisVerzeichnis: `kontrollzustand-test-f676-c-${randomUUID()}`, schreiber: () => {} }

    let ergebnis
    try {
      ergebnis = loeseSchrittEingabenAuf(schritt, workflowDaten, undefined, 'Testauftrag', vorlage, FREMDPROJEKT, ladeOptionen, INSTALL_WURZEL)
    } catch (fehler) {
      befunde.push(`(3) loeseSchrittEingabenAuf(..., repoWurzel=<Fremdprojekt>, ..., installWurzel) warf unerwartet: ${fehler.message}`)
    }
    if (ergebnis !== undefined) {
      if (!ergebnis.ok) {
        befunde.push(`(3) loeseSchrittEingabenAuf sollte gegen das Fremdprojekt (repoWurzel) mit installWurzel=Installationswurzel ok:true liefern, erhalten ok:false (${ergebnis.grund})`)
      } else {
        const pfad = ergebnis.eingaben.ausgabeSchemaPfad
        if (typeof pfad !== 'string' || !existsSync(pfad)) {
          befunde.push(`(3) ausgabeSchemaPfad sollte auf eine real existierende Datei zeigen, erhalten ${JSON.stringify(pfad)}`)
        } else if (resolve(pfad).startsWith(resolve(FREMDPROJEKT))) {
          befunde.push(`(3) ausgabeSchemaPfad liegt fälschlich im Fremdprojekt statt in der Installationswurzel: ${pfad}`)
        }
      }
    }
    if (befunde.length === befundeVor) {
      console.log('✓ (3) Architekt-Output-Schema-Auflösung: ein codex/architekt-Schritt gegen das Fremdprojekt löst schemas/ergebnis-architektur.schema.json real aus der Installationswurzel auf, nicht aus dem (leeren) Projekt.')
    }
  }
} finally {
  raeumeVerzeichnis(FREMDPROJEKT)
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
