/**
 * Datei: scripts/check-f15-workflow.mjs
 *
 * Zweck: Workflow-Gate (F15 WS-1, Meilenstein 3, docs/projekt/
 * zielfassung.md §13.4 E-M3-1). Prüft die Payload-Fixtures unter
 * schemas/examples/kontrollzustand-workflow*.json gegen
 * validiereWorkflowDaten (direkt aus src/workflow/index.ts importiert,
 * D5-Muster) — je Datei gegen die erwartete Gültigkeit.
 *
 * Aufbau gespiegelt von scripts/check-f11-auftrag.mjs, Abschnitt (a).
 * Die dortigen Grep-Abschnitte (AK3/AK7) sind auftrags- bzw.
 * serverspezifisch und gehören NICHT hierher — WS-1 liefert Schema,
 * Validator, Gate und Beispieldateien, sonst nichts. Der Schritt-Automat
 * und die Dispatch-Integration in scripts/leitstand-server.mjs (WS-2)
 * sowie die Leitstand-Ansicht (WS-3) bringen ihre eigenen Prüfungen mit.
 *
 * Wichtig: Jede der vier Regeln, die nur validiereWorkflowDaten kennt und
 * JSON Schema nicht ausdrücken kann, hat hier einen eigenen Rotfall —
 * unbekannter nachfolger, doppelte schritt_id, unbekannte
 * aktiver_schritt_id, Zyklus in der nachfolger-Kette (ARCHITECTURE.md §8:
 * eine behauptete Grenze ohne kalibrierten Rot- und Grün-Fall heißt nicht
 * ERZWUNGEN). Wer eine Regel entfernt, ohne den Rotfall anzufassen, lässt
 * hier ein grünes Gate über einer stillen Lücke stehen.
 *
 * Bekannte Grenze der Abdeckung: die Fixtures unten kalibrieren die sechs
 * Regeln mit dem höchsten Vorbildwert je einzeln rot. Die übrige Formprüfung
 * (Enums, Zahlgrenzen, leere Strings, fehlende Pflichtfelder, Nicht-Objekt-/
 * Nicht-Array-Wurzeln) trägt src/workflow/workflow.test.ts tabellengetrieben
 * — dort ist ein Rotfall eine Zeile statt einer Datei. Wer eine Regel
 * ergänzt, ergänzt ihren Rotfall dort, nicht als weitere JSON-Datei.
 *
 * Wird aufgerufen von: `npm run check`
 * (NICHT `npm run check:template` — das Skript importiert src/workflow/,
 * ist also stackgebunden; dieselbe Einordnung wie check-f14-abbruch.mjs.)
 *
 * Aufruf: node scripts/check-f15-workflow.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { existsSync, readFileSync } from 'node:fs'
import { validiereWorkflowDaten } from '../src/workflow/index.ts'

const befunde = []

console.log('\n=== F15-Workflow-Check (WS-1) ===\n')

// ─── Payload-Fixtures gegen validiereWorkflowDaten ──────────────────────────
const fixtures = [
  { pfad: 'schemas/examples/kontrollzustand-workflow.valid.json', sollGueltigSein: true },
  { pfad: 'schemas/examples/kontrollzustand-workflow.invalid-falscher-schema-wert.json', sollGueltigSein: false },
  { pfad: 'schemas/examples/kontrollzustand-workflow.invalid-unbekannter-nachfolger.json', sollGueltigSein: false },
  { pfad: 'schemas/examples/kontrollzustand-workflow.invalid-doppelte-schritt-id.json', sollGueltigSein: false },
  { pfad: 'schemas/examples/kontrollzustand-workflow.invalid-unbekannter-aktiver-schritt.json', sollGueltigSein: false },
  { pfad: 'schemas/examples/kontrollzustand-workflow.invalid-leere-schritte.json', sollGueltigSein: false },
  { pfad: 'schemas/examples/kontrollzustand-workflow.invalid-unbekanntes-feld.json', sollGueltigSein: false },
  { pfad: 'schemas/examples/kontrollzustand-workflow.invalid-zyklus.json', sollGueltigSein: false },
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
  const verstoesse = validiereWorkflowDaten(obj)
  if (sollGueltigSein && verstoesse.length > 0) {
    befunde.push(`${pfad}: sollte gültig sein, aber verletzt: ${verstoesse.join('; ')}`)
  }
  if (!sollGueltigSein && verstoesse.length === 0) {
    befunde.push(`${pfad}: sollte ungültig sein, aber keine Regelverletzung gefunden`)
  }
}
if (befunde.length === 0) {
  console.log(`✓ ${fixtures.length} Payload-Fixture(s) gegen validiereWorkflowDaten geprüft.`)
}

// ─── Das Schema selbst muss gültiges JSON sein (Muster check-datenformate.mjs) ──
const SCHEMA_PFAD = 'schemas/kontrollzustand-workflow-payload.schema.json'
if (!existsSync(SCHEMA_PFAD)) {
  befunde.push(`${SCHEMA_PFAD}: Datei fehlt`)
} else {
  try {
    JSON.parse(readFileSync(SCHEMA_PFAD, 'utf-8'))
    console.log(`✓ ${SCHEMA_PFAD} ist gültiges JSON.`)
  } catch (fehler) {
    befunde.push(`${SCHEMA_PFAD}: kein gültiges JSON (${fehler.message})`)
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
