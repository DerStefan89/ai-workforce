/**
 * Datei: scripts/check-f5-context-builder.mjs
 *
 * Zweck: Context-Builder-Gate (F5). Prüft die fünf Payload-Fixtures unter
 * schemas/examples/kontrollzustand-kontextpaket*.json gegen
 * validiereKontextpaketDaten, einen synthetischen Ende-zu-Ende-Lauf
 * (Anfragen → Kontextpaket → Registrierung → pruefeKontextpaketFrisch),
 * einen Rollenausschluss-Fall und einen Evidenzlücke-Fall — alle direkt aus
 * src/context-builder/ importiert (kein zweiter, von Hand nachgebauter
 * Regelsatz, D5-Muster).
 *
 * Wird aufgerufen von: `npm run check`, `npm run check:template`
 *
 * Aufruf: node scripts/check-f5-context-builder.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { existsSync, readFileSync, rmSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { baueKontextpaket, pruefeKontextpaketFrisch, validiereKontextpaketDaten } from '../src/context-builder/index.ts'

const befunde = []
const BASIS = 'kontrollzustand-test'
const profilReferenz = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
const stillerSchreiber = () => {}

console.log('\n=== F5-Context-Builder-Check ===\n')

function raeumeAuf(laufId) {
  rmSync(join(BASIS, `lineage-kontextpaket-${laufId}`), { recursive: true, force: true })
}

// ─── (a) Fünf Payload-Fixtures gegen validiereKontextpaketDaten ────────────
const fixtures = [
  { pfad: 'schemas/examples/kontrollzustand-kontextpaket-leer.valid.json', sollGueltigSein: true },
  { pfad: 'schemas/examples/kontrollzustand-kontextpaket-befuellt.valid.json', sollGueltigSein: true },
  { pfad: 'schemas/examples/kontrollzustand-kontextpaket.invalid-falscher-schema-wert.json', sollGueltigSein: false },
  { pfad: 'schemas/examples/kontrollzustand-kontextpaket.invalid-fehlende-rolle.json', sollGueltigSein: false },
  { pfad: 'schemas/examples/kontrollzustand-kontextpaket.invalid-grund-ausserhalb-enum.json', sollGueltigSein: false },
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
  const verstoesse = validiereKontextpaketDaten(obj)
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

// ─── (b) Synthetischer Ende-zu-Ende-Lauf: Anfragen → Kontextpaket → Registrierung → frisch ──
const laufIdGruen = `check-f5-gruen-${randomUUID()}`
try {
  const optionen = { basisVerzeichnis: BASIS, schreiber: stillerSchreiber }
  const ergebnis = baueKontextpaket(
    laufIdGruen,
    'qa',
    [
      { pfad: 'features/F5/feature.md', frage: 'Was ist der Scope?', begruendung: 'Akzeptanzkriterien prüfen', inhalt: 'Ziel/Scope/AC-Text' },
      { pfad: 'state/plan-v2-f5-context-builder.md', frage: 'Was ist entschieden?', begruendung: 'Deltas prüfen', inhalt: 'Sechs Deltas' },
    ],
    profilReferenz,
    {},
    optionen
  )
  const frisch = ergebnis.ok
    ? pruefeKontextpaketFrisch(
        laufIdGruen,
        ergebnis.versionSequenz,
        { 'features/F5/feature.md': 'Ziel/Scope/AC-Text', 'state/plan-v2-f5-context-builder.md': 'Sechs Deltas' },
        optionen
      )
    : null

  if (!ergebnis.ok || ergebnis.paket.elemente.length !== 2 || frisch === null || frisch.stale !== false) {
    befunde.push(`Ende-zu-Ende-Lauf: erwartet ok:true mit zwei Elementen und anschließend stale:false, erhalten ${JSON.stringify({ ergebnis, frisch })}`)
  } else {
    console.log('✓ Ende-zu-Ende-Lauf: Anfragen → Kontextpaket → Registrierung → pruefeKontextpaketFrisch liefert stale:false.')
  }
} finally {
  raeumeAuf(laufIdGruen)
}

// ─── (c) Rollenausschluss-Fall ──────────────────────────────────────────────
const laufIdRolle = `check-f5-rolle-${randomUUID()}`
try {
  const optionen = { basisVerzeichnis: BASIS, schreiber: stillerSchreiber }
  const ergebnis = baueKontextpaket(
    laufIdRolle,
    'code-reviewer',
    [{ pfad: 'state/tasks/f5-context-builder.md', frage: 'x', begruendung: 'x', inhalt: 'Vertragstext' }],
    profilReferenz,
    {},
    optionen
  )
  const korrekt = ergebnis.ok && ergebnis.paket.elemente.length === 0 && ergebnis.paket.ausgeschlossen.length === 1 && ergebnis.paket.ausgeschlossen[0].grund === 'rolle'
  if (!korrekt) {
    befunde.push(`Rollenausschluss-Fall: erwartet 0 Elemente, 1 Ausschluss mit grund 'rolle', erhalten ${JSON.stringify(ergebnis)}`)
  } else {
    console.log("✓ Rollenausschluss-Fall: state/tasks/**-Anfrage für 'code-reviewer' ausgeschlossen, mit Grund vermerkt.")
  }
} finally {
  raeumeAuf(laufIdRolle)
}

// ─── (d) Evidenzlücke-Fall ──────────────────────────────────────────────────
const laufIdEvidenz = `check-f5-evidenz-${randomUUID()}`
try {
  const optionen = { basisVerzeichnis: BASIS, schreiber: stillerSchreiber }
  const ergebnis = baueKontextpaket(
    laufIdEvidenz,
    'qa',
    [{ pfad: 'a.md', frage: 'x', begruendung: 'x', inhalt: 'x', notwendig: true }],
    profilReferenz,
    { maxElemente: 0 },
    optionen
  )
  if (ergebnis.ok !== false || ergebnis.grund !== 'EVIDENZLUECKE') {
    befunde.push(`Evidenzlücke-Fall: erwartet ok:false/grund:EVIDENZLUECKE, erhalten ${JSON.stringify(ergebnis)}`)
  } else {
    console.log('✓ Evidenzlücke-Fall: notwendige Anfrage über Budget führt zu EVIDENZLUECKE, kein Teilpaket (Entscheidung 115).')
  }
} finally {
  raeumeAuf(laufIdEvidenz)
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
