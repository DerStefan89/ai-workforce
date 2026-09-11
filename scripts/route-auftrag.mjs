#!/usr/bin/env node
/**
 * Datei: scripts/route-auftrag.mjs
 *
 * Zweck: F18 WS-2 Glue-Skript (CLI, kein neuer HTTP-Endpunkt). Nimmt die
 * lauf_id eines bereits ABGESCHLOSSENEN/ERFOLGREICHEN Laufs der Rolle
 * 'router' (src/rollen/index.ts), liest dessen Laufakte (Muster: F1Bs
 * stelleLaufstatusFest für den Terminalstatus, F7s Rohstrom-Lesepfad für den
 * Inhalt — beides bestehende Checkpoint-Store-/Result-Evaluator-Leser, kein
 * neuer Regelsatz), validiert das im Rohstrom enthaltene Ergebnis gegen
 * schemas/ergebnis-router.schema.json (validiereErgebnisRouter,
 * src/router/index.ts), wählt darüber via waehleWorkflowVorlage eine
 * Workflow-Vorlage und registriert sie über den bestehenden
 * POST /api/workflows am laufenden Leitstand-Server (scripts/leitstand-
 * server.mjs) — startet NICHTS.
 *
 * Aufruf: node scripts/route-auftrag.mjs <lauf_id> <auftrag_id> <ziel> [--server <basis-url>]
 *
 * auftrag_id/ziel kommen als eigene CLI-Argumente, nicht aus einer
 * automatischen Herleitung aus dem Router-Lauf: schemas/ergebnis-router
 * trägt bewusst kein auftrag_id/ziel-Feld (die Klassifikation äußert sich
 * nur zu Kontrolltiefe/Risiko/Rückfragen, siehe Kopfkommentar dort), und die
 * Laufakte selbst (LaufakteV0Daten) trägt ebenso wenig eine auftrag_id
 * (F7-Grenze, AK12). Wer route-auftrag.mjs aufruft, hat den Auftrag gerade
 * selbst angelegt (POST /api/auftraege) und kennt beide Werte bereits.
 *
 * NUR worker 'claude-code' wird ausgewertet: ein Router-Lauf über den
 * direkten POST /api/laeufe-Pfad (kein Workflow-Schritt) kann strukturell
 * gar keinen anderen Worker tragen — 'worker' und 'ausgabeSchemaPfad'
 * stehen nicht in ERLAUBTE_STARTAUFTRAG_FELDER
 * (scripts/leitstand-server.mjs) und kommen ausschließlich aus einem
 * geplanten Workflow-Schritt. Der Router-Lauf für diesen Nachweis läuft
 * deshalb notwendig als claude-code, und die Klassifikation muss aus dem
 * Freitext-'result'-Feld des Claude-Code-Ergebnisobjekts gelesen werden
 * (leseErgebnisobjekt, src/claude-code-gateway/index.ts) — es gibt dafür
 * keinen '--output-schema'-Mechanismus wie bei Codex.
 */

import { readFileSync } from 'node:fs'
import { leseErgebnisobjekt } from '../src/claude-code-gateway/index.ts'
import { stelleLaufstatusFest } from '../src/checkpoint-store/index.ts'
import { ladeArtefaktVersion } from '../src/lineage-registry/index.ts'
import { validiereErgebnisRouter, waehleWorkflowVorlage } from '../src/router/index.ts'

function leseServerArgument(argv) {
  const index = argv.indexOf('--server')
  if (index === -1) return 'http://127.0.0.1:4173'
  const wert = argv[index + 1]
  if (typeof wert !== 'string' || wert.length === 0) {
    throw new Error("'--server' verlangt einen Wert")
  }
  return wert
}

async function main() {
  const [laufId, auftragId, ziel] = process.argv.slice(2)
  if (!laufId || !auftragId || !ziel) {
    console.error('Nutzung: node scripts/route-auftrag.mjs <lauf_id> <auftrag_id> <ziel> [--server <basis-url>]')
    process.exitCode = 1
    return
  }
  let serverBasis
  try {
    serverBasis = leseServerArgument(process.argv.slice(2))
  } catch (fehler) {
    console.error(fehler.message)
    process.exitCode = 1
    return
  }

  const laufStatus = stelleLaufstatusFest(laufId)
  if (laufStatus.status !== 'ABGESCHLOSSEN' || laufStatus.ergebnis !== 'ERFOLGREICH') {
    console.error(`Lauf '${laufId}' ist nicht ABGESCHLOSSEN/ERFOLGREICH — laufStatus: ${JSON.stringify(laufStatus)}`)
    process.exitCode = 1
    return
  }

  const laufakteVersion = ladeArtefaktVersion(`laufakte-${laufId}`)
  if (laufakteVersion === null) {
    console.error(`Laufakte 'laufakte-${laufId}' nicht gefunden`)
    process.exitCode = 1
    return
  }
  const laufakte = laufakteVersion.daten

  const worker = laufakte.worker ?? 'claude-code'
  if (worker !== 'claude-code') {
    console.error(`Worker '${worker}' wird von diesem Skript nicht unterstützt (siehe Kopfkommentar) — erwartet: claude-code`)
    process.exitCode = 1
    return
  }

  let rohInhalt
  try {
    rohInhalt = readFileSync(laufakte.rohstrom_referenz.pfad, 'utf8')
  } catch (fehler) {
    console.error(`Rohstrom '${laufakte.rohstrom_referenz.pfad}' nicht lesbar: ${fehler.message}`)
    process.exitCode = 1
    return
  }

  // Der Rohstrom ist ein zweistufiges JSON: die äußere Hülle
  // ({werkzeugStartziel, stdout, stderr, exitCode, startfehler, beendigungsart},
  // src/claude-code-gateway/prozessstart.ts) trägt in .stdout selbst wieder
  // einen JSON-String — das eigentliche "type":"result"-Objekt, das
  // leseErgebnisobjekt erwartet (Muster src/result-evaluator/index.ts:
  // rohstrom = JSON.parse(rohInhalt); leseErgebnisobjekt(rohstrom.stdout)).
  let rohstrom
  try {
    rohstrom = JSON.parse(rohInhalt)
  } catch (fehler) {
    console.error(`Rohstrom ist kein gültiges JSON: ${fehler.message}`)
    process.exitCode = 1
    return
  }

  const ergebnisobjekt = typeof rohstrom.stdout === 'string' ? leseErgebnisobjekt(rohstrom.stdout) : null
  if (ergebnisobjekt === null || typeof ergebnisobjekt.result !== 'string') {
    console.error("Rohstrom trägt kein type:'result'-Objekt mit einem 'result'-Textfeld")
    process.exitCode = 1
    return
  }

  let klassifikation
  try {
    klassifikation = JSON.parse(ergebnisobjekt.result)
  } catch (fehler) {
    console.error(`Ergebnistext ist kein gültiges JSON: ${fehler.message}\nErgebnistext: ${ergebnisobjekt.result}`)
    process.exitCode = 1
    return
  }

  const verstoesse = validiereErgebnisRouter(klassifikation)
  if (verstoesse.length > 0) {
    console.error(`Klassifikation verstößt gegen schemas/ergebnis-router.schema.json: ${verstoesse.join('; ')}`)
    process.exitCode = 1
    return
  }

  console.log(`Klassifikation (lauf_id '${laufId}'): ${JSON.stringify(klassifikation)}`)

  const workflow = waehleWorkflowVorlage(klassifikation, auftragId, ziel)

  const antwort = await fetch(`${serverBasis}/api/workflows`, { method: 'POST', body: JSON.stringify(workflow) })
  const antwortDaten = await antwort.json().catch(() => ({}))
  if (antwort.status !== 201) {
    console.error(`POST /api/workflows erwartet 201, erhalten ${antwort.status}: ${JSON.stringify(antwortDaten)}`)
    process.exitCode = 1
    return
  }

  console.log(`Workflow registriert: workflow_id '${antwortDaten.workflowId}', versionSequenz ${antwortDaten.versionSequenz} (Kontrolltiefe '${klassifikation.kontrolltiefe}')`)
}

main().catch((fehler) => {
  console.error(fehler)
  process.exitCode = 1
})
