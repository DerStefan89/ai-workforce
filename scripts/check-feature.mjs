/**
 * Datei: scripts/check-feature.mjs
 *
 * Zweck: Feature-Akte-Gate. Prüft jede Akte in features/<id>/feature.md.
 * Das Status-Feld wird immer geprüft (muss vorhanden und aus der gültigen
 * Menge sein). Bei `Status: READY_FOR_TECH` werden zusätzlich die vier
 * Pflichtabschnitte Ziel, Nicht-Ziele, Akzeptanzkriterien und Dependencies
 * verlangt (state/plan-v2-af-f001-feature-akte.md §2.2, §6).
 *
 * Aufruf: node scripts/check-feature.mjs   (Teil von npm run check:template)
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const befunde = []

console.log('\n=== Feature-Check ===\n')

const featuresDir = 'features'

if (!existsSync(featuresDir)) {
  console.log('ⓘ kein Feature-Verzeichnis, nichts zu prüfen\n')
  process.exit(0)
}

const featureOrdner = readdirSync(featuresDir, { withFileTypes: true })
  .filter((eintrag) => eintrag.isDirectory())
  .map((eintrag) => eintrag.name)

if (featureOrdner.length === 0) {
  console.log('ⓘ 0 Akten geprüft\n')
  process.exit(0)
}

const gueltigeStatusWerte = [
  'ENTWURF',
  'READY_FOR_TECH',
  'WORKSTREAM_SCHNITT_GENEHMIGT',
  'IN_ARBEIT',
  'FEATURE_GATE',
  'ABGESCHLOSSEN',
  'BLOCKIERT',
  'ABGEBROCHEN',
]

// Entscheidung (löst specs/AF-F001/spec.md §Offene Fragen, Punkt 2):
// Überschriften werden exakt und case-sensitiv erkannt (`## Ziel`, kein
// Toleranzbereich für Groß-/Kleinschreibung oder Synonyme) — hält sich an
// die Konvention der übrigen Feature-Akte-Abschnitte, keine zusätzliche
// Fuzzy-Logik ohne belegten Bedarf.
const pflichtAbschnitte = [
  { name: 'Ziel', muster: /^##\s+Ziel\b/m },
  { name: 'Nicht-Ziele', muster: /^##\s+Nicht-Ziele\b/m },
  { name: 'Akzeptanzkriterien', muster: /^##\s+Akzeptanzkriterien\b/m },
  { name: 'Dependencies', muster: /^##\s+Dependencies\b/m },
]

for (const ordner of featureOrdner) {
  const pfad = join(featuresDir, ordner, 'feature.md')

  if (!existsSync(pfad)) {
    befunde.push(`${pfad}: feature.md fehlt`)
    continue
  }

  const inhalt = readFileSync(pfad, 'utf-8')
  const statusMatch = inhalt.match(/^Status:\s*(\S+)/m)
  const status = statusMatch ? statusMatch[1] : undefined

  if (!status || !gueltigeStatusWerte.includes(status)) {
    befunde.push(`${pfad}: Status fehlt oder unbekannt`)
    continue
  }

  if (status === 'READY_FOR_TECH') {
    for (const abschnitt of pflichtAbschnitte) {
      if (!abschnitt.muster.test(inhalt)) {
        befunde.push(`${pfad}: Abschnitt "${abschnitt.name}" fehlt (Status: READY_FOR_TECH verlangt ihn)`)
      }
    }
  }
}

// ─── Ergebnis ───────────────────────────────────────────────────────────────
if (befunde.length === 0) {
  console.log(`✓ ${featureOrdner.length} Akte(n) geprüft, keine Befunde.\n`)
  process.exit(0)
}

console.log(`✗ ${befunde.length} Befund(e):\n`)
for (const b of befunde) console.log(`  - ${b}`)
console.log('')
process.exit(1)
