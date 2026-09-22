/**
 * Datei: scripts/check-f32-verbrauch-ansicht.mjs
 *
 * Zweck: Gate für F32 WS-2 (Verbrauchsansicht im Leitstand). Prüft:
 * (a) berechneVerbrauchsVon (public/leitstand/verbrauch-zeitraum.js) als
 *     reine Funktion: '7t'/'30t' liefern ein ISO-8601-Datum genau 7 bzw.
 *     30 Tage vor einem festen Bezugszeitpunkt, 'gesamt' liefert undefined
 *     (kein Zeitraumfilter).
 * (b) echter HTTP-Aufruf GET /api/verbrauch mit einem client-seitig
 *     gebauten `von`-Wert (Muster check-f33-roadmap-projektion.mjs
 *     Abschnitt (e): erzeugeRequestHandler + echter Testserver) → 200 und
 *     die von scripts/leitstand/routen-verbrauch.mjs dokumentierte
 *     Struktur { gruppen, laeufeGesamt, ohneBeobachtungGesamt }.
 *
 * Aufruf: node scripts/check-f32-verbrauch-ansicht.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { berechneVerbrauchsVon } from '../public/leitstand/verbrauch-zeitraum.js'
import { erzeugeRequestHandler } from './leitstand-server.mjs'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []
console.log('\n=== F32-WS2-Verbrauchsansicht-Check ===\n')

// ─── (a) berechneVerbrauchsVon als reine Funktion ───────────────────────────
{
  const jetzt = new Date('2026-09-22T12:00:00.000Z')

  const von7 = berechneVerbrauchsVon('7t', jetzt)
  if (von7 !== '2026-09-15T12:00:00.000Z') {
    befunde.push(`(a) '7t': erwartet 2026-09-15T12:00:00.000Z, erhalten ${von7}`)
  } else {
    console.log(`✓ (a) '7t' → ${von7} (genau 7 Tage vor dem Bezugszeitpunkt).`)
  }

  const von30 = berechneVerbrauchsVon('30t', jetzt)
  if (von30 !== '2026-08-23T12:00:00.000Z') {
    befunde.push(`(a) '30t': erwartet 2026-08-23T12:00:00.000Z, erhalten ${von30}`)
  } else {
    console.log(`✓ (a) '30t' → ${von30} (genau 30 Tage vor dem Bezugszeitpunkt).`)
  }

  const vonGesamt = berechneVerbrauchsVon('gesamt', jetzt)
  if (vonGesamt !== undefined) {
    befunde.push(`(a) 'gesamt': erwartet undefined (kein Zeitraumfilter), erhalten ${JSON.stringify(vonGesamt)}`)
  } else {
    console.log("✓ (a) 'gesamt' → undefined, kein Zeitraumfilter.")
  }
}

// ─── (b) echter HTTP-Aufruf GET /api/verbrauch mit clientseitig gebautem 'von' ──
{
  const basisVerzeichnis = `kontrollzustand-test-f32-ansicht-${randomUUID()}`
  const globalerLaufZustand = { aktiv: false, laufId: null, abortController: null }
  const handler = erzeugeRequestHandler({ basisVerzeichnis, startvorlagePfad: 'startvorlagen/beispielprojekt.json', globalerLaufZustand })
  const server = createServer(handler)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    const { port } = server.address()
    const von = berechneVerbrauchsVon('30t', new Date())
    const antwort = await fetch(`http://127.0.0.1:${port}/api/verbrauch?von=${encodeURIComponent(von)}`)
    if (antwort.status !== 200) {
      befunde.push(`(b) GET /api/verbrauch?von=...: erwartet 200, erhalten ${antwort.status}`)
    } else {
      const koerper = await antwort.json()
      const hatErwarteteStruktur =
        Array.isArray(koerper.gruppen) && typeof koerper.laeufeGesamt === 'number' && typeof koerper.ohneBeobachtungGesamt === 'number'
      if (!hatErwarteteStruktur) {
        befunde.push(`(b) GET /api/verbrauch?von=...: erwartete Struktur { gruppen, laeufeGesamt, ohneBeobachtungGesamt } nicht erfüllt, erhalten ${JSON.stringify(koerper)}`)
      } else {
        console.log('✓ (b) echter HTTP-Aufruf GET /api/verbrauch mit client-seitig gebautem von-Wert → 200, erwartete Struktur.')
      }
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
    raeumeVerzeichnis(basisVerzeichnis)
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
