/**
 * Datei: scripts/check-f20-zustand-poll.mjs
 *
 * Zweck: F20-WS-2-Gate für AK3 (ein Poll-Timer statt drei). Drei Teile:
 * (a) Server, Grünfall — GET /api/zustand liefert für laeufe/startfehler/
 *     workflows BYTE-GLEICHE Elemente wie die drei bestehenden
 *     Einzelendpunkte (dieselben sammle*-Funktionen, keine neue Projektion,
 *     kein bestehender Endpunkt geändert — AK1) und fehler[] bleibt leer,
 *     solange alle drei Quellen intakt sind. Läuft mit ECHTEN Fixtures
 *     (ein Lauf, ein Workflow), nicht mit leeren Listen — sonst wäre der
 *     Vergleich durch zwei leere Arrays erfüllbar, ohne dass die Verdrahtung
 *     stimmt.
 * (b) Server, Rot-Fall — basisVerzeichnis zeigt auf eine DATEI statt ein
 *     Verzeichnis. sammleLaeufe/sammleWorkflows rufen darauf
 *     readdirSync(basisVerzeichnis) auf und werfen dabei REAL ENOTDIR (kein
 *     simulierter Wurf). GET /api/zustand antwortet trotzdem mit 200,
 *     laeufe/workflows sind null, fehler[] nennt beide Quellen namentlich;
 *     startfehler bleibt eine Liste, weil dieser In-Memory-Zugriff vom
 *     defekten basisVerzeichnis unberührt bleibt.
 * (c) Client — in public/leitstand/** existiert nach Kommentarentfernung
 *     GENAU EIN 'setInterval('-Aufruf (Regressionsschutz gegen das
 *     Wiederauftreten der drei alten Timer aus runs.js/workflows.js), er
 *     liegt in zustand.js und zielt über holeZustand() (api.js) auf
 *     GET /api/zustand.
 *
 * Wird aufgerufen von: `npm run check`
 *
 * Aufruf: node scripts/check-f20-zustand-poll.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { erzeugeRequestHandler } from './leitstand-server.mjs'
import { schreibeWirkungsmarke } from '../src/checkpoint-store/index.ts'
import { registriereWorkflow } from '../src/workflow/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []
console.log('\n=== F20-WS-2-Check (AK3, Aggregat-Endpunkt und Poll-Konsolidierung) ===\n')

const PROFIL_REFERENZ = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
const STILL = () => {}

/** @param optionen - an erzeugeRequestHandler durchgereicht @returns { basisUrl, schliessen } eines echten HTTP-Testservers auf einem Ephemeral-Loopback-Port (Muster check-f12-leitstand-ansicht.mjs) */
async function starteTestserver(optionen) {
  const server = createServer(erzeugeRequestHandler(optionen))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  return {
    basisUrl: `http://127.0.0.1:${port}`,
    schliessen: () => new Promise((resolve) => server.close(resolve)),
  }
}

function workflowFixture(workflowId) {
  return {
    workflow_schema: 'v0',
    workflow_id: workflowId,
    auftrag_id: 'f20-ws2-test-auftrag',
    version: 1,
    ziel: 'F20-WS-2-Aggregat-Test.',
    status: 'OFFEN',
    aktiver_schritt_id: 'schritt-1',
    grenzen: { max_schritte: 8, max_replans: 2 },
    schritte: [
      {
        schritt_id: 'schritt-1',
        rolle: 'ausfuehrung',
        werkzeugsatz: 'lesend',
        worker: 'claude-code',
        modell: 'f20-ws2-test-modell',
        eingaben: [],
        output_schema: null,
        freigabe: 'AUTOMATISCH',
        risiko: 'F20-WS-2-Aggregat-Test, kein echter Lauf.',
        zeitgrenze_ms: 600000,
        nachfolger: null,
        status: 'OFFEN',
        lauf_id: null,
      },
    ],
  }
}

// ─── (a) Grünfall: GET /api/zustand liefert BYTE-GLEICHE Elemente wie die drei Einzelendpunkte ──
{
  const basisVerzeichnis = `kontrollzustand-test-f20-ws2-aggregat-${randomUUID()}`
  const laufId = `f20-ws2-lauf-${randomUUID()}`
  schreibeWirkungsmarke(laufId, PROFIL_REFERENZ, 'run_prepared', {}, { basisVerzeichnis, schreiber: STILL })
  registriereWorkflow(workflowFixture(`f20-ws2-workflow-${randomUUID()}`), PROFIL_REFERENZ, { basisVerzeichnis, schreiber: STILL })

  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis })
  try {
    const [zustand, laeufe, startfehler, workflows] = await Promise.all([
      fetch(`${basisUrl}/api/zustand`).then((r) => r.json()),
      fetch(`${basisUrl}/api/laeufe`).then((r) => r.json()),
      fetch(`${basisUrl}/api/startfehler`).then((r) => r.json()),
      fetch(`${basisUrl}/api/workflows`).then((r) => r.json()),
    ])
    if (laeufe.length === 0 || workflows.length === 0) {
      befunde.push('AK3: Fixture griff nicht — laeufe oder workflows sind bereits an den Einzelendpunkten leer, der Vergleich ist damit nicht beweiskräftig.')
    } else if (JSON.stringify(zustand.laeufe) !== JSON.stringify(laeufe)) {
      befunde.push(`AK3: GET /api/zustand.laeufe weicht von GET /api/laeufe ab — erhalten ${JSON.stringify(zustand.laeufe)} vs. ${JSON.stringify(laeufe)}`)
    } else if (JSON.stringify(zustand.startfehler) !== JSON.stringify(startfehler)) {
      befunde.push(`AK3: GET /api/zustand.startfehler weicht von GET /api/startfehler ab — erhalten ${JSON.stringify(zustand.startfehler)} vs. ${JSON.stringify(startfehler)}`)
    } else if (JSON.stringify(zustand.workflows) !== JSON.stringify(workflows)) {
      befunde.push(`AK3: GET /api/zustand.workflows weicht von GET /api/workflows ab — erhalten ${JSON.stringify(zustand.workflows)} vs. ${JSON.stringify(workflows)}`)
    } else if (!Array.isArray(zustand.fehler) || zustand.fehler.length !== 0) {
      befunde.push(`AK3: GET /api/zustand.fehler ist bei drei intakten Quellen nicht leer: ${JSON.stringify(zustand.fehler)}`)
    } else {
      console.log('✓ AK3 Grünfall: GET /api/zustand liefert für laeufe/startfehler/workflows byte-gleiche Elemente wie die drei Einzelendpunkte, fehler[] leer bei intakten Quellen.')
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (b) Rot-Fall: defekte Quelle → null + fehler[]-Eintrag, Antwort bleibt 200 ──
{
  const basisVerzeichnis = `kontrollzustand-test-f20-ws2-defekt-${randomUUID()}`
  writeFileSync(basisVerzeichnis, 'keine Verzeichnis-Datei')

  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis })
  try {
    const antwort = await fetch(`${basisUrl}/api/zustand`)
    const koerper = await antwort.json()
    const quellen = (koerper.fehler ?? []).map((f) => f.quelle).sort()
    if (antwort.status !== 200) {
      befunde.push(`AK3 Rot-Fall: GET /api/zustand antwortet mit ${antwort.status} statt 200 bei einer defekten Quelle — eine defekte Quelle darf die ganze Antwort nicht verweigern.`)
    } else if (koerper.laeufe !== null || koerper.workflows !== null) {
      befunde.push(`AK3 Rot-Fall: laeufe/workflows sind bei defektem basisVerzeichnis nicht null — erhalten laeufe=${JSON.stringify(koerper.laeufe)}, workflows=${JSON.stringify(koerper.workflows)}`)
    } else if (quellen.join(',') !== 'laeufe,workflows') {
      befunde.push(`AK3 Rot-Fall: fehler[] nennt nicht genau 'laeufe' und 'workflows' — erhalten ${JSON.stringify(koerper.fehler)}`)
    } else if (!Array.isArray(koerper.startfehler)) {
      befunde.push(`AK3 Rot-Fall: startfehler ist keine Liste, obwohl diese Quelle vom defekten basisVerzeichnis unberührt bleibt — erhalten ${JSON.stringify(koerper.startfehler)}`)
    } else {
      console.log('✓ AK3 Rot-Fall: eine defekte Quelle (basisVerzeichnis ist eine Datei) liefert laeufe=null und workflows=null mit je einem fehler[]-Eintrag, Antwort bleibt 200 — startfehler bleibt unberührt.')
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (c) Client: in public/leitstand/** existiert GENAU EIN 'setInterval(', in zustand.js ──
{
  const WURZEL = 'public/leitstand'

  /** Muster scripts/check-f15-workflow-oberflaeche.mjs entferneKommentare — sonst löst eine bloße Erwähnung von 'setInterval' in einem Kommentar denselben Befund aus. */
  function entferneKommentare(quelltext) {
    return quelltext.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
  }

  function sammleJsDateien(verzeichnis) {
    const ergebnis = []
    for (const eintrag of readdirSync(verzeichnis, { withFileTypes: true })) {
      const pfad = join(verzeichnis, eintrag.name)
      if (eintrag.isDirectory()) {
        ergebnis.push(...sammleJsDateien(pfad))
      } else if (eintrag.isFile() && eintrag.name.endsWith('.js')) {
        ergebnis.push(pfad)
      }
    }
    return ergebnis
  }

  const treffer = sammleJsDateien(WURZEL)
    .map((pfad) => ({ pfad, anzahl: (entferneKommentare(readFileSync(pfad, 'utf8')).match(/setInterval\(/g) ?? []).length }))
    .filter((eintrag) => eintrag.anzahl > 0)
  const gesamtanzahl = treffer.reduce((summe, eintrag) => summe + eintrag.anzahl, 0)
  const zustandPfad = join(WURZEL, 'zustand.js')

  if (gesamtanzahl !== 1) {
    befunde.push(`AK3 (Client): in ${WURZEL}/** existieren ${gesamtanzahl} 'setInterval('-Aufrufe statt genau einem — Fundstellen: ${treffer.map((t) => `${t.pfad} (${t.anzahl})`).join(', ') || 'keine'}`)
  } else if (treffer[0].pfad !== zustandPfad) {
    befunde.push(`AK3 (Client): der einzige 'setInterval(' liegt in ${treffer[0].pfad}, nicht in ${zustandPfad}`)
  } else {
    console.log(`✓ AK3 (Client): genau ein 'setInterval(' in ${WURZEL}/**, in ${zustandPfad}.`)
  }

  const zustandQuelltext = entferneKommentare(readFileSync(zustandPfad, 'utf8'))
  const apiQuelltext = entferneKommentare(readFileSync(join(WURZEL, 'api.js'), 'utf8'))
  if (!/setInterval\(pollZustand/.test(zustandQuelltext)) {
    befunde.push(`AK3 (Client): ${zustandPfad} führt setInterval nicht über die Poll-Funktion, die das Aggregat holt (erwartet 'setInterval(pollZustand').`)
  }
  if (!/holeZustand\(\)/.test(zustandQuelltext)) {
    befunde.push(`AK3 (Client): ${zustandPfad} ruft holeZustand() nicht auf — der Poll-Timer zielt damit nicht nachweisbar auf das Aggregat.`)
  }
  if (!/export const holeZustand = \(\) => fetch\('\/api\/zustand'\)/.test(apiQuelltext)) {
    befunde.push("AK3 (Client): api.js führt holeZustand nicht als GET /api/zustand — erwartet \"export const holeZustand = () => fetch('/api/zustand')\".")
  } else {
    console.log('✓ AK3 (Client): zustand.js ruft holeZustand() auf, api.js führt holeZustand über GET /api/zustand.')
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
