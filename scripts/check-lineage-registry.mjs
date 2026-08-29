/**
 * Datei: scripts/check-lineage-registry.mjs
 *
 * Zweck: Lineage-Registry-Gate (Feature 2). Prüft die sieben Payload-
 * Fixtures unter schemas/examples/kontrollzustand-lineage*.json gegen
 * validiereLineageEintrag, den AC14-Hauptfall (Stale-Erkennung) und den
 * begruendung-Wurf-Fall bei haltFestStaleEntscheidung — alle direkt aus
 * src/lineage-registry/ importiert (kein zweiter, von Hand nachgebauter
 * Regelsatz). Deckt bewusst NICHT A1/A3/A4/A13 (die sind
 * lineage-registry.test.ts zugeordnet, plan-v2 Delta 2).
 *
 * Wird aufgerufen von: `npm run check`, `npm run check:template`
 *
 * Aufruf: node scripts/check-lineage-registry.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { existsSync, readFileSync, rmSync } from 'node:fs'
import { createHash, randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { haltFestStaleEntscheidung, pruefeStale, registriereKernArtefakt, validiereLineageEintrag } from '../src/lineage-registry/index.ts'

const befunde = []
const BASIS = 'kontrollzustand-test'

console.log('\n=== Lineage-Registry-Check ===\n')

// ─── (a) Sieben Payload-Fixtures gegen validiereLineageEintrag ─────────────
const fixtures = [
  { pfad: 'schemas/examples/kontrollzustand-lineage-kern.valid.json', sollGueltigSein: true },
  { pfad: 'schemas/examples/kontrollzustand-lineage-werkzeug.valid.json', sollGueltigSein: true },
  { pfad: 'schemas/examples/kontrollzustand-lineage-entscheidung.valid.json', sollGueltigSein: true },
  { pfad: 'schemas/examples/kontrollzustand-lineage.invalid-fehlende-artefakt-id.json', sollGueltigSein: false },
  { pfad: 'schemas/examples/kontrollzustand-lineage.invalid-hash-mismatch.json', sollGueltigSein: false },
  { pfad: 'schemas/examples/kontrollzustand-lineage.invalid-daten-bei-werkzeug.json', sollGueltigSein: false },
  { pfad: 'schemas/examples/kontrollzustand-lineage.invalid-entscheidung-ohne-begruendung.json', sollGueltigSein: false },
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
  const verstoesse = validiereLineageEintrag(obj)
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

// ─── (b) AC14-Hauptfall: Stale-Erkennung real durchgespielt ────────────────
const stillerSchreiber = () => {}
const profilReferenz = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
const artefaktIdAc14 = `check-ac14-${randomUUID()}`
try {
  const eingabePfad = 'docs/zitierte-eingabe.md'
  const inhaltsHashAbc = createHash('sha256').update('ABC', 'utf8').digest('hex')
  registriereKernArtefakt(
    artefaktIdAc14,
    profilReferenz,
    { erzeuger: 'kern' },
    { schritt: 1 },
    [{ pfad: eingabePfad, zitierter_bereich: 'Abschnitt 1', inhalts_hash: inhaltsHashAbc }],
    { basisVerzeichnis: BASIS, schreiber: stillerSchreiber }
  )

  const unveraendert = pruefeStale(artefaktIdAc14, 1, { [eingabePfad]: 'ABC' }, { basisVerzeichnis: BASIS, schreiber: stillerSchreiber })
  const geaendert = pruefeStale(artefaktIdAc14, 1, { [eingabePfad]: 'XYZ' }, { basisVerzeichnis: BASIS, schreiber: stillerSchreiber })

  if (unveraendert.stale !== false || unveraendert.geaenderteEingaben.length !== 0) {
    befunde.push(`AC14: erwartet stale:false bei unveränderter Eingabe, erhalten ${JSON.stringify(unveraendert)}`)
  }
  if (geaendert.stale !== true || geaendert.geaenderteEingaben.length !== 1 || geaendert.geaenderteEingaben[0] !== eingabePfad) {
    befunde.push(`AC14: erwartet stale:true mit geaenderteEingaben=["${eingabePfad}"], erhalten ${JSON.stringify(geaendert)}`)
  }
  if (unveraendert.stale === false && geaendert.stale === true && geaendert.geaenderteEingaben[0] === eingabePfad) {
    console.log('✓ AC14-Hauptfall: unveränderte Eingabe → stale:false, geänderte Eingabe → stale:true mit genau diesem Schlüssel.')
  }
} finally {
  rmSync(join(BASIS, `lineage-${artefaktIdAc14}`), { recursive: true, force: true })
}

// ─── (c) begruendung-Wurf-Fall bei haltFestStaleEntscheidung ───────────────
const artefaktIdWurf = `check-wurf-${randomUUID()}`
try {
  registriereKernArtefakt(artefaktIdWurf, profilReferenz, { erzeuger: 'kern' }, { schritt: 1 }, [], {
    basisVerzeichnis: BASIS,
    schreiber: stillerSchreiber,
  })

  let hatGeworfen = false
  try {
    haltFestStaleEntscheidung(artefaktIdWurf, 1, profilReferenz, 'unveraendert_gueltig', undefined, undefined, {
      basisVerzeichnis: BASIS,
      schreiber: stillerSchreiber,
    })
  } catch {
    hatGeworfen = true
  }
  if (!hatGeworfen) {
    befunde.push('haltFestStaleEntscheidung ohne begruendung bei unveraendert_gueltig hat nicht geworfen')
  }

  let hatErfolgreichGeschrieben = false
  try {
    haltFestStaleEntscheidung(artefaktIdWurf, 1, profilReferenz, 'unveraendert_gueltig', 'geprüft, weiterhin gültig', undefined, {
      basisVerzeichnis: BASIS,
      schreiber: stillerSchreiber,
    })
    hatErfolgreichGeschrieben = true
  } catch (fehler) {
    befunde.push(`haltFestStaleEntscheidung mit begruendung sollte erfolgreich schreiben, warf aber: ${fehler.message}`)
  }

  if (hatGeworfen && hatErfolgreichGeschrieben) {
    console.log('✓ haltFestStaleEntscheidung: ohne begruendung wirft, mit begruendung schreibt erfolgreich.')
  }
} finally {
  rmSync(join(BASIS, `lineage-${artefaktIdWurf}`), { recursive: true, force: true })
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
