/**
 * Datei: scripts/check-f1b-wirkungsmarke.mjs
 *
 * Zweck: Wirkungsmarke-Gate (F1B). Prüft die sechs Payload-Fixtures unter
 * schemas/examples/kontrollzustand-wirkungsmarke*.json gegen
 * validiereWirkungsmarkeEintrag, einen synthetischen RUN_PREPARED→
 * Terminal-Lauf (KLAERUNG_ERFORDERLICH vor, ABGESCHLOSSEN nach dem
 * Terminal) und eine leere Kette gegen stelleLaufstatusFest — alle direkt
 * aus src/checkpoint-store/ importiert (kein zweiter, von Hand
 * nachgebauter Regelsatz, D5-Muster wie check-checkpoint-store.mjs).
 *
 * Wird aufgerufen von: `npm run check`, `npm run check:template`
 *
 * Aufruf: node scripts/check-f1b-wirkungsmarke.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { existsSync, readFileSync, rmSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { schreibeWirkungsmarke, stelleLaufstatusFest, validiereWirkungsmarkeEintrag } from '../src/checkpoint-store/index.ts'

const befunde = []
const BASIS = 'kontrollzustand-test'

console.log('\n=== F1B-Wirkungsmarke-Check ===\n')

// ─── (a) Sechs Payload-Fixtures gegen validiereWirkungsmarkeEintrag ────────
const fixtures = [
  { pfad: 'schemas/examples/kontrollzustand-wirkungsmarke-run-prepared.valid.json', sollGueltigSein: true },
  { pfad: 'schemas/examples/kontrollzustand-wirkungsmarke-terminal-erfolgreich.valid.json', sollGueltigSein: true },
  { pfad: 'schemas/examples/kontrollzustand-wirkungsmarke-terminal-verweigert.valid.json', sollGueltigSein: true },
  { pfad: 'schemas/examples/kontrollzustand-wirkungsmarke.invalid-fehlendes-ergebnis.json', sollGueltigSein: false },
  { pfad: 'schemas/examples/kontrollzustand-wirkungsmarke.invalid-ergebnis-ausserhalb-enum.json', sollGueltigSein: false },
  { pfad: 'schemas/examples/kontrollzustand-wirkungsmarke.invalid-ergebnis-bei-run-prepared.json', sollGueltigSein: false },
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
  const verstoesse = validiereWirkungsmarkeEintrag(obj)
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

// ─── (b) Synthetischer Lauf: RUN_PREPARED → KLAERUNG_ERFORDERLICH, dann Terminal → ABGESCHLOSSEN ──
const stillerSchreiber = () => {}
const profilReferenz = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
const laufIdSynthetisch = `check-f1b-${randomUUID()}`
try {
  schreibeWirkungsmarke(laufIdSynthetisch, profilReferenz, 'run_prepared', {}, { basisVerzeichnis: BASIS, schreiber: stillerSchreiber })
  const nachRunPrepared = stelleLaufstatusFest(laufIdSynthetisch, { basisVerzeichnis: BASIS, schreiber: stillerSchreiber })
  if (nachRunPrepared.status !== 'KLAERUNG_ERFORDERLICH') {
    befunde.push(`Synthetischer Lauf: erwartet KLAERUNG_ERFORDERLICH nach RUN_PREPARED, erhalten ${nachRunPrepared.status}`)
  }

  schreibeWirkungsmarke(
    laufIdSynthetisch,
    profilReferenz,
    'terminal',
    { ergebnis: 'ERFOLGREICH' },
    { basisVerzeichnis: BASIS, schreiber: stillerSchreiber }
  )
  const nachTerminal = stelleLaufstatusFest(laufIdSynthetisch, { basisVerzeichnis: BASIS, schreiber: stillerSchreiber })
  if (nachTerminal.status !== 'ABGESCHLOSSEN' || nachTerminal.ergebnis !== 'ERFOLGREICH') {
    befunde.push(`Synthetischer Lauf: erwartet ABGESCHLOSSEN/ERFOLGREICH nach Terminal, erhalten ${JSON.stringify(nachTerminal)}`)
  }

  if (nachRunPrepared.status === 'KLAERUNG_ERFORDERLICH' && nachTerminal.status === 'ABGESCHLOSSEN' && nachTerminal.ergebnis === 'ERFOLGREICH') {
    console.log('✓ Synthetischer Lauf: RUN_PREPARED → KLAERUNG_ERFORDERLICH, danach Terminal ERFOLGREICH → ABGESCHLOSSEN.')
  }
} finally {
  rmSync(join(BASIS, laufIdSynthetisch), { recursive: true, force: true })
}

// ─── (c) Leere Kette ────────────────────────────────────────────────────────
const laufIdLeer = `check-f1b-leer-${randomUUID()}`
const leer = stelleLaufstatusFest(laufIdLeer, { basisVerzeichnis: BASIS, schreiber: stillerSchreiber })
if (leer.status !== 'NICHT_GESTARTET') {
  befunde.push(`Leere Kette: erwartet NICHT_GESTARTET, erhalten ${JSON.stringify(leer)}`)
} else {
  console.log('✓ Leere Kette: stelleLaufstatusFest liefert NICHT_GESTARTET, kein Fehler.')
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
