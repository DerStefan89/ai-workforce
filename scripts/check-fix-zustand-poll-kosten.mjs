/**
 * Datei: scripts/check-fix-zustand-poll-kosten.mjs
 *
 * Zweck: Gate für den Perf-Fix fix/zustand-poll-kosten (sammleLaeufe/
 * sammleWorkflows lasen bei JEDEM Poll-Tick die komplette Lauf-/Workflow-
 * Historie neu von Platte — gemessen gegen einen echten, gewachsenen
 * kontrollzustand/ mit 100 Lauf-Verzeichnissen/541 Dateien: 62,5 s pro
 * GET /api/zustand). Drei Teile:
 *
 * (1) Rot-/Grünfall Lauf-Cache (AK4 des Auftrags): ein neu geschriebener
 *     Checkpoint eines noch LAUFENDEN Laufs muss im nächsten Poll sichtbar
 *     sein — der billige Verzeichnisstempel (Dateianzahl + mtime) darf den
 *     Cache nicht länger als nötig festhalten. Bewusst NICHT der
 *     Kenntnisnahme-Fall (kenntnisgenommen nach entscheidung-<laufId>) —
 *     der ist bereits scharf in scripts/check-f21-workboard.mjs Teil (4)
 *     kalibriert und lief unverändert grün gegen den neuen Cache (Beleg,
 *     dass der Verbundstempel aus eigener Kette + entscheidung-Kette hält).
 * (2) Dasselbe Muster für den Workflow-Cache: eine neue Artefaktversion
 *     (Statuswechsel) muss im nächsten Poll sichtbar sein.
 * (3) Performance-Regressionswächter mit einem synthetischen, aber
 *     realistisch dimensionierten Bestand (150 abgeschlossene Läufe, je
 *     zwei Wirkungsmarken): der zweite (warme) Aufruf von GET /api/zustand
 *     muss deutlich schneller sein als der erste (kalte) — kein Wettlauf
 *     um absolute Millisekunden (Jitter auf CI-Maschinen), sondern ein
 *     grober Faktor, der eine Rückkehr zu O(gesamte Historie) je Poll
 *     zuverlässig auffängt.
 *
 * Die reale Vor/Nach-Messung gegen den echten kontrollzustand/-Bestand
 * dieses Arbeitsverzeichnisses ist NICHT Teil dieses Gates (nicht
 * reproduzierbar/portabel — abhängig von lokalem Entwicklerzustand,
 * Muster ARCHITECTURE.md §2: kein Index als führender, aber auch keine
 * Testabhängigkeit von echtem Lauf-Bestand) — sie steht im Handoff-Bericht.
 *
 * Wird aufgerufen von: npm run check.
 *
 * Aufruf: node scripts/check-fix-zustand-poll-kosten.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { erzeugeRequestHandler } from './leitstand-server.mjs'
import { schreibeWirkungsmarke } from '../src/checkpoint-store/index.ts'
import { registriereWorkflow } from '../src/workflow/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []
console.log('\n=== Perf-Fix-Check (fix/zustand-poll-kosten: Lauf-/Workflow-Kopfdaten-Cache) ===\n')

const PROFIL_REFERENZ = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
const STILL = () => {}

/** @param optionen - an erzeugeRequestHandler durchgereicht @returns { basisUrl, schliessen } eines echten HTTP-Testservers auf einem Ephemeral-Loopback-Port (Muster check-f20-zustand-poll.mjs) */
async function starteTestserver(optionen) {
  const server = createServer(erzeugeRequestHandler(optionen))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  return {
    basisUrl: `http://127.0.0.1:${port}`,
    schliessen: () => new Promise((resolve) => server.close(resolve)),
  }
}

function workflowFixture(workflowId, status = 'OFFEN') {
  return {
    workflow_schema: 'v0',
    workflow_id: workflowId,
    auftrag_id: 'perf-fix-test-auftrag',
    version: 1,
    ziel: 'Perf-Fix-Cache-Test.',
    status,
    aktiver_schritt_id: 'schritt-1',
    grenzen: { max_schritte: 8, max_replans: 2 },
    schritte: [
      {
        schritt_id: 'schritt-1',
        rolle: 'ausfuehrung',
        werkzeugsatz: 'lesend',
        worker: 'claude-code',
        modell: 'perf-fix-test-modell',
        eingaben: [],
        output_schema: null,
        freigabe: 'AUTOMATISCH',
        risiko: 'Perf-Fix-Cache-Test, kein echter Lauf.',
        zeitgrenze_ms: 600000,
        nachfolger: null,
        status: 'OFFEN',
        lauf_id: null,
      },
    ],
  }
}

// ─── (1) Rot-/Grünfall: neuer Checkpoint eines laufenden Laufs im nächsten Poll sichtbar ──
{
  const befundeVor1 = befunde.length
  const basisVerzeichnis = `kontrollzustand-test-perf-fix-laufend-${randomUUID()}`
  const laufId = `perf-fix-lauf-${randomUUID()}`
  try {
    schreibeWirkungsmarke(laufId, PROFIL_REFERENZ, 'run_prepared', {}, { basisVerzeichnis, schreiber: STILL })

    const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis })
    try {
      const vor = await fetch(`${basisUrl}/api/laeufe`).then((r) => r.json())
      const kopfdatenVor = vor.find((l) => l.laufId === laufId)
      if (kopfdatenVor?.laufStatus?.status === 'ABGESCHLOSSEN') {
        befunde.push(`(1) Fixture griff nicht — Lauf ist vor dem Terminal-Checkpoint bereits ABGESCHLOSSEN: ${JSON.stringify(kopfdatenVor)}`)
      }

      // Derselbe Poll-Zyklus wie ein echter Werkzeuglauf: run_prepared zuerst (oben), jetzt
      // die terminale Wirkungsmarke NACH dem ersten Poll — genau der Fall, den ein Cache mit
      // zu grobem Stempel verpassen würde.
      schreibeWirkungsmarke(laufId, PROFIL_REFERENZ, 'terminal', { ergebnis: 'ERFOLGREICH' }, { basisVerzeichnis, schreiber: STILL })

      const nach = await fetch(`${basisUrl}/api/laeufe`).then((r) => r.json())
      const kopfdatenNach = nach.find((l) => l.laufId === laufId)
      if (kopfdatenNach?.laufStatus?.status !== 'ABGESCHLOSSEN' || kopfdatenNach?.ergebnis !== 'ERFOLGREICH') {
        befunde.push(
          `(1) AK4: ein neu geschriebener Terminal-Checkpoint eines laufenden Laufs ist im nächsten Poll NICHT sichtbar (Cache zu grob) — erhalten ${JSON.stringify(kopfdatenNach)}`
        )
      }
      if (kopfdatenNach?.anzahlCheckpoints !== 2) {
        befunde.push(`(1) anzahlCheckpoints sollte nach dem zweiten Checkpoint 2 sein — erhalten ${JSON.stringify(kopfdatenNach)}`)
      }
    } finally {
      await schliessen()
    }
  } finally {
    raeumeVerzeichnis(basisVerzeichnis)
  }
  if (befunde.length === befundeVor1) {
    console.log('✓ (1) Lauf-Cache: ein Terminal-Checkpoint, der NACH dem ersten Poll geschrieben wird, ist im nächsten Poll sichtbar (kein stale-Cache).')
  }
}

// ─── (2) Rot-/Grünfall: Statuswechsel eines Workflows im nächsten Poll sichtbar ──
{
  const befundeVor2 = befunde.length
  const basisVerzeichnis = `kontrollzustand-test-perf-fix-workflow-${randomUUID()}`
  const workflowId = `perf-fix-workflow-${randomUUID()}`
  try {
    registriereWorkflow(workflowFixture(workflowId, 'OFFEN'), PROFIL_REFERENZ, { basisVerzeichnis, schreiber: STILL })

    const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis })
    try {
      const vor = await fetch(`${basisUrl}/api/workflows`).then((r) => r.json())
      const kopfdatenVor = vor.find((w) => w.workflowId === workflowId)
      if (kopfdatenVor?.status !== 'OFFEN') {
        befunde.push(`(2) Fixture griff nicht — Workflow steht vor dem Statuswechsel nicht auf OFFEN: ${JSON.stringify(kopfdatenVor)}`)
      }

      registriereWorkflow(workflowFixture(workflowId, 'GESTOPPT'), PROFIL_REFERENZ, { basisVerzeichnis, schreiber: STILL })

      const nach = await fetch(`${basisUrl}/api/workflows`).then((r) => r.json())
      const kopfdatenNach = nach.find((w) => w.workflowId === workflowId)
      if (kopfdatenNach?.status !== 'GESTOPPT') {
        befunde.push(`(2) ein Statuswechsel, der NACH dem ersten Poll registriert wird, ist im nächsten Poll NICHT sichtbar (Cache zu grob) — erhalten ${JSON.stringify(kopfdatenNach)}`)
      }
    } finally {
      await schliessen()
    }
  } finally {
    raeumeVerzeichnis(basisVerzeichnis)
  }
  if (befunde.length === befundeVor2) {
    console.log('✓ (2) Workflow-Cache: ein Statuswechsel, der NACH dem ersten Poll registriert wird, ist im nächsten Poll sichtbar (kein stale-Cache).')
  }
}

// ─── (3) Performance-Regressionswächter: warmer Poll deutlich schneller als kalter ──
{
  const basisVerzeichnis = `kontrollzustand-test-perf-fix-last-${randomUUID()}`
  const ANZAHL_LAEUFE = 150
  try {
    for (let i = 0; i < ANZAHL_LAEUFE; i += 1) {
      const laufId = `perf-fix-last-lauf-${i}-${randomUUID()}`
      schreibeWirkungsmarke(laufId, PROFIL_REFERENZ, 'run_prepared', {}, { basisVerzeichnis, schreiber: STILL })
      schreibeWirkungsmarke(laufId, PROFIL_REFERENZ, 'terminal', { ergebnis: 'ERFOLGREICH' }, { basisVerzeichnis, schreiber: STILL })
    }

    const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis })
    try {
      const kaltStart = performance.now()
      const kalt = await fetch(`${basisUrl}/api/zustand`).then((r) => r.json())
      const kaltDauerMs = performance.now() - kaltStart

      const warmStart = performance.now()
      const warm = await fetch(`${basisUrl}/api/zustand`).then((r) => r.json())
      const warmDauerMs = performance.now() - warmStart

      if ((kalt.laeufe?.length ?? 0) !== ANZAHL_LAEUFE) {
        befunde.push(`(3) Fixture griff nicht — erwartet ${ANZAHL_LAEUFE} Läufe im kalten Poll, erhalten ${kalt.laeufe?.length ?? 'null'}.`)
      } else if (JSON.stringify(warm.laeufe) !== JSON.stringify(kalt.laeufe)) {
        befunde.push('(3) der warme Poll liefert ein anderes Ergebnis als der kalte, obwohl sich nichts geändert hat — Cache liefert falschen Inhalt.')
      } else if (warmDauerMs > kaltDauerMs / 2) {
        befunde.push(
          `(3) Perf-Regression: der warme Poll (${warmDauerMs.toFixed(1)} ms) ist nicht deutlich schneller als der kalte (${kaltDauerMs.toFixed(1)} ms) gegen ${ANZAHL_LAEUFE} unveränderte Läufe — der Cache greift nicht.`
        )
      } else {
        console.log(
          `✓ (3) Perf-Regressionswächter: gegen ${ANZAHL_LAEUFE} synthetische, unveränderte Läufe ist der warme Poll (${warmDauerMs.toFixed(1)} ms) deutlich schneller als der kalte (${kaltDauerMs.toFixed(1)} ms).`
        )
      }
    } finally {
      await schliessen()
    }
  } finally {
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
