/**
 * Datei: scripts/check-feature.mjs
 *
 * Zweck: Feature-Akte-Gate. Prüft jede Akte in features/<id>/feature.md.
 * Das Status-Feld wird immer geprüft (muss vorhanden und aus der gültigen
 * Menge sein). Bei `Status: READY_FOR_TECH` werden zusätzlich die vier
 * Pflichtabschnitte Ziel, Nicht-Ziele, Akzeptanzkriterien und Dependencies
 * verlangt (state/plan-v2-af-f001-feature-akte.md §2.2, §6).
 *
 * gueltigeStatusWerte kommt seit F21 WS-1 (AK2) aus src/workboard/
 * feature-status.ts — EINE Quelle für dieses Gate und für
 * src/workboard/features.ts, Abhängigkeitsrichtung bleibt scripts/ → src/
 * (D5, kein zweiter Regelsatz, kein umgekehrter Import aus src/).
 *
 * F39 WS-3a (Auftrags-Vorgabe Punkt 3): zusätzlich, unabhängig vom Status, die neun
 * optionalen technischen Abschnitte (Architekturentscheidung, Komponenten/Module,
 * Datenmodell, Interfaces/Contracts, State/Persistenz, Security/Permissions,
 * Datenflüsse, Migration, Red-/Green-Cases) — pruefeOptionaleAbschnitte,
 * src/workboard/feature-abschnitte.ts. Nur wenn ein Abschnitt vorhanden ist, wird
 * geprüft, dass er nicht leer ist; eine Akte ohne diese Abschnitte bleibt gültig
 * (Rückwärtskompatibilität). Rot-/Grünfälle in
 * src/workboard/feature-abschnitte.test.ts.
 *
 * F45 B5a-1: die Regeln liegen in pruefeFeatureAkteInhalt (src/workboard/feature-akte-pruefung.ts);
 * dieses Skript liest nur die Akten und meldet. Meldungstexte unverändert.
 *
 * Aufruf: node scripts/check-feature.mjs   (Teil von npm run check)
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { pruefeFeatureAkteInhalt } from '../src/workboard/feature-akte-pruefung.ts'

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

// Die Regeln (Status, Pflichtabschnitte bei READY_FOR_TECH, optionale technische Abschnitte) stehen seit
// F45 B5a-1 in pruefeFeatureAkteInhalt (src/workboard/feature-akte-pruefung.ts) — dieselbe Funktion prüft
// PUT/POST der Akte im Leitstand, bevor geschrieben wird.
for (const ordner of featureOrdner) {
  const pfad = join(featuresDir, ordner, 'feature.md')

  if (!existsSync(pfad)) {
    befunde.push(`${pfad}: feature.md fehlt`)
    continue
  }

  for (const befund of pruefeFeatureAkteInhalt(readFileSync(pfad, 'utf-8'))) befunde.push(`${pfad}: ${befund}`)
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
