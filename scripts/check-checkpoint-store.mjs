/**
 * Datei: scripts/check-checkpoint-store.mjs
 *
 * Zweck: Checkpoint-Store-Gate (Feature 1). Prüft die vier Payload-Fixtures
 * unter schemas/examples/kontrollzustand-checkpoint*.json gegen
 * validiereCheckpointEintrag, einen synthetischen Drei-Checkpoint-Lauf
 * (vollständig gültig vs. Checkpoint 3 korrumpiert) und eine leere Kette
 * gegen ladeLetztenGueltigenCheckpoint — beide direkt aus
 * src/checkpoint-store/ importiert (plan-v1 D5: kein zweiter, von Hand
 * nachgebauter Regelsatz, da dieses Feature erstmals echten src/-Code
 * liefert; Abweichung von F0s D5 mit Begründung).
 *
 * Wird aufgerufen von: `npm run check`, `npm run check:template`
 *
 * Aufruf: node scripts/check-checkpoint-store.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import {
  ladeLetztenGueltigenCheckpoint,
  schreibeCheckpoint,
  validiereCheckpointEintrag,
} from '../src/checkpoint-store/index.ts'

const befunde = []
const BASIS = 'kontrollzustand-test'

console.log('\n=== Checkpoint-Store-Check ===\n')

// ─── (a) Vier Payload-Fixtures gegen validiereCheckpointEintrag ────────────
const fixtures = [
  { pfad: 'schemas/examples/kontrollzustand-checkpoint.valid.json', sollGueltigSein: true },
  { pfad: 'schemas/examples/kontrollzustand-checkpoint.invalid-fehlende-sequenz.json', sollGueltigSein: false },
  { pfad: 'schemas/examples/kontrollzustand-checkpoint.invalid-hash-mismatch.json', sollGueltigSein: false },
  { pfad: 'schemas/examples/kontrollzustand-checkpoint.invalid-vorgaenger-bei-sequenz-1.json', sollGueltigSein: false },
]

for (const { pfad, sollGueltigSein } of fixtures) {
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
  const verstoesse = validiereCheckpointEintrag(obj)
  if (sollGueltigSein && verstoesse.length > 0) {
    befunde.push(`${pfad}: sollte gültig sein, aber verletzt: ${verstoesse.join('; ')}`)
  }
  if (!sollGueltigSein && verstoesse.length === 0) {
    befunde.push(`${pfad}: sollte ungültig sein, aber keine Regelverletzung gefunden`)
  }
}
if (befunde.length === 0) {
  console.log(`✓ ${fixtures.length} Payload-Fixture(s) geprüft.`)
}

// ─── (b) Synthetischer Drei-Checkpoint-Lauf: gültig vs. Checkpoint 3 korrumpiert ──
const stillerSchreiber = () => {}
const laufIdGueltig = `check-gueltig-${randomUUID()}`
const profilReferenz = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
try {
  schreibeCheckpoint(laufIdGueltig, profilReferenz, { schritt: 1 }, { basisVerzeichnis: BASIS, schreiber: stillerSchreiber })
  schreibeCheckpoint(laufIdGueltig, profilReferenz, { schritt: 2 }, { basisVerzeichnis: BASIS, schreiber: stillerSchreiber })
  const dritter = schreibeCheckpoint(laufIdGueltig, profilReferenz, { schritt: 3 }, {
    basisVerzeichnis: BASIS,
    schreiber: stillerSchreiber,
  })

  const vollstaendig = ladeLetztenGueltigenCheckpoint(laufIdGueltig, { basisVerzeichnis: BASIS, schreiber: stillerSchreiber })
  if (vollstaendig?.payload.sequenz !== 3) {
    befunde.push(`Drei-Checkpoint-Lauf: erwartet sequenz 3 bei vollständiger Kette, erhalten ${vollstaendig?.payload.sequenz ?? 'null'}`)
  }

  writeFileSync(dritter.pfad, '{ das ist kein gueltiges JSON')
  const korrumpiert = ladeLetztenGueltigenCheckpoint(laufIdGueltig, { basisVerzeichnis: BASIS, schreiber: stillerSchreiber })
  if (korrumpiert?.payload.sequenz !== 2) {
    befunde.push(`Drei-Checkpoint-Lauf: erwartet sequenz 2 nach Korruption von Checkpoint 3, erhalten ${korrumpiert?.payload.sequenz ?? 'null'}`)
  }
  if (vollstaendig?.payload.sequenz === 3 && korrumpiert?.payload.sequenz === 2) {
    console.log('✓ Drei-Checkpoint-Lauf: vollständig gültig → sequenz 3, Checkpoint 3 korrumpiert → sequenz 2.')
  }
} finally {
  rmSync(join(BASIS, laufIdGueltig), { recursive: true, force: true })
}

// ─── (c) Leere Kette ────────────────────────────────────────────────────────
const laufIdLeer = `check-leer-${randomUUID()}`
const leer = ladeLetztenGueltigenCheckpoint(laufIdLeer, { basisVerzeichnis: BASIS, schreiber: stillerSchreiber })
if (leer !== null) {
  befunde.push(`Leere Kette: erwartet null, erhalten ${JSON.stringify(leer)}`)
} else {
  console.log('✓ Leere Kette: ladeLetztenGueltigenCheckpoint liefert null, kein Fehler.')
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
