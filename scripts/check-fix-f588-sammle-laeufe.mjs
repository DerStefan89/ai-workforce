/**
 * Datei: scripts/check-fix-f588-sammle-laeufe.mjs
 *
 * Zweck: Gate für den F-588-Fix (sammleLaeufe, scripts/leitstand-server.mjs) — eine
 * "lineage-"-Denylist überspringt Auftrags-/Kontextpaket-/Entscheidungs-/Workflow-Ketten VOR der
 * Kopfdaten-Cache-Stempelbildung, statt sie erst danach über istLaufkette auszufiltern. Kosten
 * wuchsen vorher mit der GESAMTEN Verzeichniszahl unter kontrollzustand/, nicht nur mit echten
 * Läufen (state/messung-f588-zustand.md). Zwei Teile:
 *
 * (1) Äquivalenz: dieselben echten Läufe, ob "lineage-"-Verzeichnisse daneben liegen oder
 *     nicht — GET /api/laeufe liefert exakt dieselbe Liste (deep-equal), unabhängig davon, wie
 *     viele "lineage-"-Verzeichnisse zusätzlich existieren.
 * (2) Rotfall-Regression: ein Nicht-Lauf-Verzeichnis OHNE "lineage-"-Präfix (z. B. eine reine
 *     F2-Lineage-Kette mit abweichender Namenskonvention) muss weiterhin über istLaufkette
 *     ausgefiltert werden — die Denylist ersetzt NICHT den bestehenden inhaltsbasierten Filter
 *     (F-137 AK1), sie ergänzt ihn nur um einen billigen Vorab-Ausschluss.
 *
 * Die reale Vor/Nach-Messung gegen den echten kontrollzustand/-Bestand (Median kalt/warm) ist
 * NICHT Teil dieses Gates (Muster check-fix-zustand-poll-kosten.mjs Kopfkommentar: nicht
 * reproduzierbar/portabel) — sie steht in state/messung-f588-zustand.md.
 *
 * Wird aufgerufen von: npm run check.
 *
 * Aufruf: node scripts/check-fix-f588-sammle-laeufe.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { erzeugeRequestHandler } from './leitstand-server.mjs'
import { schreibeWirkungsmarke } from '../src/checkpoint-store/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []
console.log('\n=== F-588-Fix-Check (sammleLaeufe: "lineage-"-Denylist vor der Stempelbildung) ===\n')

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

/** Legt ein Verzeichnis mit checkpoints/-Unterordner an, das rein NAMENTLICH einer F2-Lineage-Kette gleicht (Muster real: kontrollzustand/lineage-auftrag-<id>/checkpoints/1-<hash>.json) — der Inhalt ist für diesen Test irrelevant, weil die Denylist rein namensbasiert VOR jedem Lesezugriff greift. @param basisVerzeichnis - Kontrollzustand-Wurzel @param name - voller Verzeichnisname */
function legeScheinVerzeichnisAn(basisVerzeichnis, name) {
  const checkpointsPfad = join(basisVerzeichnis, name, 'checkpoints')
  mkdirSync(checkpointsPfad, { recursive: true })
  writeFileSync(join(checkpointsPfad, '1-schein.json'), JSON.stringify({ schein: true }))
}

// ─── (1) Äquivalenz: "lineage-"-Verzeichnisse daneben ändern GET /api/laeufe nicht ───────────
{
  const befundeVor = befunde.length
  const basisVerzeichnis = `kontrollzustand-test-f588-aequivalenz-${randomUUID()}`
  const laufId = `f588-echter-lauf-${randomUUID()}`
  try {
    schreibeWirkungsmarke(laufId, PROFIL_REFERENZ, 'run_prepared', {}, { basisVerzeichnis, schreiber: STILL })
    schreibeWirkungsmarke(laufId, PROFIL_REFERENZ, 'terminal', { ergebnis: 'ERFOLGREICH' }, { basisVerzeichnis, schreiber: STILL })

    const { basisUrl: url1, schliessen: schliessen1 } = await starteTestserver({ basisVerzeichnis })
    let vorher
    try {
      vorher = await fetch(`${url1}/api/laeufe`).then((r) => r.json())
    } finally {
      await schliessen1()
    }
    if (vorher.length !== 1 || vorher[0]?.laufId !== laufId) {
      befunde.push(`(1) Fixture griff nicht — vor den "lineage-"-Verzeichnissen liefert GET /api/laeufe nicht genau den einen echten Lauf: ${JSON.stringify(vorher)}`)
    }

    // 40 "lineage-"-Scheinverzeichnisse verschiedener realer Präfixe daneben anlegen.
    const praefixe = ['lineage-auftrag-', 'lineage-kontextpaket-', 'lineage-entscheidung-workflow-', 'lineage-workflow-']
    for (let i = 0; i < 40; i += 1) {
      legeScheinVerzeichnisAn(basisVerzeichnis, `${praefixe[i % praefixe.length]}${randomUUID()}`)
    }

    const { basisUrl: url2, schliessen: schliessen2 } = await starteTestserver({ basisVerzeichnis })
    let nachher
    try {
      nachher = await fetch(`${url2}/api/laeufe`).then((r) => r.json())
    } finally {
      await schliessen2()
    }

    if (JSON.stringify(nachher) !== JSON.stringify(vorher)) {
      befunde.push(`(1) Äquivalenz verletzt — 40 zusätzliche "lineage-"-Verzeichnisse verändern GET /api/laeufe: vorher ${JSON.stringify(vorher)}, nachher ${JSON.stringify(nachher)}`)
    }
    if (nachher.some((l) => l.laufId.startsWith('lineage-'))) {
      befunde.push(`(1) ein "lineage-"-Scheinverzeichnis erscheint in GET /api/laeufe als Lauf: ${JSON.stringify(nachher.filter((l) => l.laufId.startsWith('lineage-')))}`)
    }
  } finally {
    raeumeVerzeichnis(basisVerzeichnis)
  }
  if (befunde.length === befundeVor) {
    console.log('✓ (1) Äquivalenz: 40 zusätzliche "lineage-"-Verzeichnisse verändern GET /api/laeufe nicht — derselbe eine echte Lauf, keines der Scheinverzeichnisse erscheint.')
  }
}

// ─── (2) Rotfall-Regression: ein Nicht-Lauf-Verzeichnis OHNE "lineage-"-Präfix bleibt gefiltert ──
{
  const befundeVor = befunde.length
  const basisVerzeichnis = `kontrollzustand-test-f588-istlaufkette-${randomUUID()}`
  const laufId = `f588-echter-lauf-${randomUUID()}`
  try {
    schreibeWirkungsmarke(laufId, PROFIL_REFERENZ, 'run_prepared', {}, { basisVerzeichnis, schreiber: STILL })
    // Kein "lineage-"-Präfix, aber auch keine Wirkungsmarke — muss weiterhin über istLaufkette
    // (F-137 AK1, inhaltsbasiert) ausgefiltert werden, NICHT über die neue Denylist.
    legeScheinVerzeichnisAn(basisVerzeichnis, `kein-lineage-praefix-${randomUUID()}`)

    const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis })
    try {
      const laeufe = await fetch(`${basisUrl}/api/laeufe`).then((r) => r.json())
      if (laeufe.length !== 1 || laeufe[0]?.laufId !== laufId) {
        befunde.push(`(2) ein Nicht-Lauf-Verzeichnis ohne "lineage-"-Präfix erscheint fälschlich als Lauf, oder der echte Lauf fehlt: ${JSON.stringify(laeufe)}`)
      } else {
        console.log('✓ (2) Rotfall-Regression: ein Nicht-Lauf-Verzeichnis ohne "lineage-"-Präfix bleibt weiterhin über istLaufkette ausgefiltert.')
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
