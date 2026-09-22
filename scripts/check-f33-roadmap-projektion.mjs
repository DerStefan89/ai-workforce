/**
 * Datei: scripts/check-f33-roadmap-projektion.mjs
 *
 * Zweck: Gate für F33 WS-2 (Roadmap-Projektion im Leitstand). Prüft:
 * (a) die echte docs/projekt/roadmap.json ergibt über baueRoadmapProjektion
 *     status 'ok', und Meilenstein M5 enthält Feature F40 mit Status
 *     ABGESCHLOSSEN (echter, bereits committeter Datenstand — kein
 *     Fixture, Regressionsschutz gegen ein stillschweigend falsch
 *     verdrahtetes repoWurzel/roadmapPfad).
 * (b) synthetisch: fehlende roadmap.json → { status: 'nicht_vorhanden' }.
 * (c) synthetisch: ungültige roadmap.json (Schemaverstoß) → { status:
 *     'ungueltig', fehler: [...] }, kein Wurf.
 * (d) synthetisch: ein Feature ohne eigene Akte (features/<id>/feature.md
 *     fehlt) → dessen Eintrag trägt status 'keine_akte'.
 * (e) echter HTTP-Aufruf GET /api/roadmap gegen einen über
 *     erzeugeRequestHandler erzeugten Testserver → 200.
 * (f) F-595-Fix, Rot-Fall: eine Feature-id mit einem '../'-Segment
 *     ('../x') wird von validiereRoadmapDaten abgelehnt (Pattern
 *     ^F[0-9]+[A-Za-z]?$) → status 'ungueltig', nie als Pfad aufgelöst.
 *
 * Aufruf: node scripts/check-f33-roadmap-projektion.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { baueRoadmapProjektion } from './leitstand/routen-roadmap.mjs'
import { erzeugeRequestHandler } from './leitstand-server.mjs'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []
console.log('\n=== F33-WS2-Roadmap-Projektion-Check ===\n')

// ─── (a) echte docs/projekt/roadmap.json ────────────────────────────────────
{
  const projektion = baueRoadmapProjektion({ repoWurzel: process.cwd(), roadmapPfad: 'docs/projekt/roadmap.json' })
  if (projektion.status !== 'ok') {
    befunde.push(`(a) echte roadmap.json: erwartet status 'ok', erhalten ${JSON.stringify(projektion)}`)
  } else {
    const m5 = projektion.meilensteine.find((m) => m.id === 'M5')
    const f40 = m5?.features.find((f) => f.id === 'F40')
    if (m5 === undefined) {
      befunde.push('(a) echte roadmap.json: Meilenstein M5 nicht gefunden')
    } else if (f40 === undefined) {
      befunde.push('(a) echte roadmap.json: Feature F40 in M5 nicht gefunden')
    } else if (f40.status !== 'ABGESCHLOSSEN') {
      befunde.push(`(a) echte roadmap.json: F40 sollte Status ABGESCHLOSSEN tragen, war '${f40.status}'`)
    } else {
      console.log("✓ (a) echte roadmap.json: status 'ok', M5 enthält F40 mit Status ABGESCHLOSSEN.")
    }
  }
}

// ─── (b)-(d) synthetisch, eigenes Wegwerf-repoWurzel ────────────────────────
{
  const testWurzel = mkdtempSync(join(tmpdir(), 'check-f33-roadmap-'))
  try {
    // (b) fehlende roadmap.json
    {
      const projektion = baueRoadmapProjektion({ repoWurzel: testWurzel, roadmapPfad: 'docs/projekt/roadmap.json' })
      if (projektion.status !== 'nicht_vorhanden' || Object.keys(projektion).length !== 1) {
        befunde.push(`(b) fehlende Datei: erwartet exakt { status: 'nicht_vorhanden' }, erhalten ${JSON.stringify(projektion)}`)
      } else {
        console.log("✓ (b) fehlende roadmap.json → { status: 'nicht_vorhanden' }, kein Wurf.")
      }
    }

    // (c) ungültige roadmap.json (Schemaverstoß: unbekanntes Feld)
    {
      mkdirSync(join(testWurzel, 'docs', 'projekt'), { recursive: true })
      const pfad = join(testWurzel, 'docs', 'projekt', 'roadmap.json')
      writeFileSync(pfad, JSON.stringify({ roadmap_schema: 'v0', vision: 'Test', meilensteine: [], unbekanntes_feld: 1 }), 'utf8')
      const projektion = baueRoadmapProjektion({ repoWurzel: testWurzel, roadmapPfad: 'docs/projekt/roadmap.json' })
      if (projektion.status !== 'ungueltig' || !Array.isArray(projektion.fehler) || projektion.fehler.length === 0) {
        befunde.push(`(c) ungültige Datei: erwartet { status: 'ungueltig', fehler: [...] }, erhalten ${JSON.stringify(projektion)}`)
      } else {
        console.log(`✓ (c) ungültige roadmap.json → { status: 'ungueltig', fehler }, kein Wurf (${projektion.fehler[0]}).`)
      }
    }

    // (d) Feature ohne eigene Akte — 'F999' erfüllt das F-595-Pattern (^F[0-9]+[A-Za-z]?$), es
    // existiert nur real keine features/F999/feature.md.
    {
      const pfad = join(testWurzel, 'docs', 'projekt', 'roadmap.json')
      writeFileSync(
        pfad,
        JSON.stringify({
          roadmap_schema: 'v0',
          vision: 'Test',
          meilensteine: [{ id: 'M1', titel: 'Meilenstein 1', status: 'LAEUFT', features: ['F999'] }],
        }),
        'utf8'
      )
      const projektion = baueRoadmapProjektion({ repoWurzel: testWurzel, roadmapPfad: 'docs/projekt/roadmap.json' })
      const feature = projektion.status === 'ok' ? projektion.meilensteine[0]?.features[0] : undefined
      if (feature === undefined || feature.status !== 'keine_akte') {
        befunde.push(`(d) Feature ohne Akte: erwartet status 'keine_akte', erhalten ${JSON.stringify(projektion)}`)
      } else {
        console.log("✓ (d) Feature ohne features/<id>/feature.md → status 'keine_akte'.")
      }
    }

    // (f) F-595-Fix, Rot-Fall: '../x' als Feature-id wird von validiereRoadmapDaten abgelehnt
    {
      const pfad = join(testWurzel, 'docs', 'projekt', 'roadmap.json')
      writeFileSync(
        pfad,
        JSON.stringify({
          roadmap_schema: 'v0',
          vision: 'Test',
          meilensteine: [{ id: 'M1', titel: 'Meilenstein 1', status: 'LAEUFT', features: ['../x'] }],
        }),
        'utf8'
      )
      const projektion = baueRoadmapProjektion({ repoWurzel: testWurzel, roadmapPfad: 'docs/projekt/roadmap.json' })
      if (projektion.status !== 'ungueltig' || !Array.isArray(projektion.fehler) || projektion.fehler.length === 0) {
        befunde.push(`(f) Rot-Fall '../x' als Feature-id: erwartet status 'ungueltig', erhalten ${JSON.stringify(projektion)}`)
      } else {
        console.log(`✓ (f) Rot-Fall '../x' als Feature-id → status 'ungueltig' (${projektion.fehler[0]}), nie als Pfad aufgelöst.`)
      }
    }
  } finally {
    raeumeVerzeichnis(testWurzel)
  }
}

// ─── (e) echter HTTP-Aufruf GET /api/roadmap ────────────────────────────────
{
  const basisVerzeichnis = `kontrollzustand-test-f33-roadmap-${randomUUID()}`
  const globalerLaufZustand = { aktiv: false, laufId: null, abortController: null }
  const handler = erzeugeRequestHandler({ basisVerzeichnis, startvorlagePfad: 'startvorlagen/beispielprojekt.json', globalerLaufZustand })
  const server = createServer(handler)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    const { port } = server.address()
    const antwort = await fetch(`http://127.0.0.1:${port}/api/roadmap`)
    if (antwort.status !== 200) {
      befunde.push(`(e) GET /api/roadmap: erwartet 200, erhalten ${antwort.status}`)
    } else {
      const koerper = await antwort.json()
      if (koerper.status !== 'ok') {
        befunde.push(`(e) GET /api/roadmap: erwartet status 'ok' (Standard-repoWurzel = Projektwurzel), erhalten ${JSON.stringify(koerper)}`)
      } else {
        console.log('✓ (e) echter HTTP-Aufruf GET /api/roadmap → 200.')
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
