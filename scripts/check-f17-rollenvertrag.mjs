/**
 * Datei: scripts/check-f17-rollenvertrag.mjs
 *
 * Zweck: Rollenvertrag-Gate (F17 WS-1). Prüft AK2 (alle vier Rollen mit
 * allen fünf Feldern, byte-gleiche Ausschlussmuster), AK1 (keine zweite
 * Rollenliste im Repo) und AK3 (Context-Builder-Verhalten unverändert nach
 * der Migration) — alle direkt aus src/rollen/ und src/context-builder/
 * importiert (kein zweiter, von Hand nachgebauter Regelsatz, D5-Muster).
 *
 * Aufruf: node scripts/check-f17-rollenvertrag.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { baueKontextpaket } from '../src/context-builder/index.ts'
import { bekannteRollen, ROLLENVERTRAEGE } from '../src/rollen/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []
const BASIS = 'kontrollzustand-test'
const profilReferenz = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
const stillerSchreiber = () => {}

console.log('\n=== F17-Rollenvertrag-Check ===\n')

// ─── (a) AK2: alle vier Rollen, alle fünf Felder, Ausschlussmuster byte-gleich ──
const erwarteteRollen = {
  'architecture-advisor': ['src/**'],
  'code-reviewer': ['state/tasks/**'],
  qa: ['state/tasks/**'],
  ausfuehrung: [],
}

const gefundeneRollen = Object.keys(ROLLENVERTRAEGE).sort()
const erwarteteNamen = Object.keys(erwarteteRollen).sort()
if (JSON.stringify(gefundeneRollen) !== JSON.stringify(erwarteteNamen)) {
  befunde.push(`AK2: ROLLENVERTRAEGE trägt ${JSON.stringify(gefundeneRollen)}, erwartet ${JSON.stringify(erwarteteNamen)}`)
} else {
  for (const [rolle, vertrag] of Object.entries(ROLLENVERTRAEGE)) {
    if (typeof vertrag.zweck !== 'string' || vertrag.zweck.length === 0) {
      befunde.push(`AK2: '${rolle}'.zweck fehlt oder ist leer`)
    }
    if (!Array.isArray(vertrag.erlaubte_werkzeugsatz_arten) || vertrag.erlaubte_werkzeugsatz_arten.length === 0) {
      befunde.push(`AK2: '${rolle}'.erlaubte_werkzeugsatz_arten fehlt oder ist leer`)
    }
    if (!Array.isArray(vertrag.erlaubte_worker) || vertrag.erlaubte_worker.length === 0) {
      befunde.push(`AK2: '${rolle}'.erlaubte_worker fehlt oder ist leer`)
    }
    if (!('erlaubtes_output_schema' in vertrag)) {
      befunde.push(`AK2: '${rolle}'.erlaubtes_output_schema fehlt`)
    }
    if (!Array.isArray(vertrag.ausschlussmuster)) {
      befunde.push(`AK2: '${rolle}'.ausschlussmuster fehlt oder ist kein Array`)
    } else if (JSON.stringify(vertrag.ausschlussmuster) !== JSON.stringify(erwarteteRollen[rolle])) {
      befunde.push(
        `AK2: '${rolle}'.ausschlussmuster ist ${JSON.stringify(vertrag.ausschlussmuster)}, erwartet byte-gleich ${JSON.stringify(erwarteteRollen[rolle])}`
      )
    }
  }
  if (befunde.length === 0) {
    console.log('✓ AK2: alle vier Rollen vorhanden, alle fünf Felder gesetzt, Ausschlussmuster byte-gleich zu den Werten vor der Migration.')
  }
}

// ─── (b) AK1: keine zweite Rollenliste im Repo ─────────────────────────────
const ausgeschlosseneVerzeichnisse = new Set(['node_modules', 'dist', 'build', 'out', '.next', '.git'])
// Eigene Datei ausgenommen — sie nennt ROLLEN_AUSSCHLUSSMUSTER zwangsläufig
// selbst, um genau dessen Abwesenheit zu prüfen.
const eigenerPfad = 'scripts/check-f17-rollenvertrag.mjs'

function sammleDateien(dir, endungen, sammlung = []) {
  for (const eintrag of readdirSync(dir, { withFileTypes: true })) {
    if (ausgeschlosseneVerzeichnisse.has(eintrag.name)) continue
    const pfad = join(dir, eintrag.name)
    if (eintrag.isDirectory()) sammleDateien(pfad, endungen, sammlung)
    else if (endungen.some((endung) => pfad.endsWith(endung))) {
      sammlung.push(pfad.split(String.fromCharCode(92)).join('/'))
    }
  }
  return sammlung
}

const geprueftDateien = [...sammleDateien('src', ['.ts', '.mjs', '.cjs']), ...sammleDateien('scripts', ['.ts', '.mjs', '.cjs'])].filter(
  (pfad) => pfad !== eigenerPfad
)

let altenBezeichnerGefunden = null
for (const pfad of geprueftDateien) {
  if (readFileSync(pfad, 'utf-8').includes('ROLLEN_AUSSCHLUSSMUSTER')) {
    altenBezeichnerGefunden = pfad
    break
  }
}
if (altenBezeichnerGefunden !== null) {
  befunde.push(`AK1: Bezeichner 'ROLLEN_AUSSCHLUSSMUSTER' noch vorhanden in ${altenBezeichnerGefunden}`)
} else {
  console.log("✓ AK1: Bezeichner 'ROLLEN_AUSSCHLUSSMUSTER' kommt in src/ und scripts/ nirgends mehr vor.")
}

// Kein Rollenname aus bekannteRollen() als Objektschlüssel einer zweiten
// Rollenliste außerhalb von src/rollen/.
const zweiteRollenlisteGefunden = []
for (const pfad of geprueftDateien) {
  if (pfad.startsWith('src/rollen/')) continue
  const inhalt = readFileSync(pfad, 'utf-8')
  for (const rolle of bekannteRollen()) {
    const musterAnfuehrungszeichen = new RegExp(`['"]${rolle}['"]\\s*:`, 'm')
    const musterBezeichner = new RegExp(`(?<![\\w'"-])${rolle}\\s*:`, 'm')
    if (musterAnfuehrungszeichen.test(inhalt) || musterBezeichner.test(inhalt)) {
      zweiteRollenlisteGefunden.push(`${pfad} (Rolle '${rolle}')`)
    }
  }
}
if (zweiteRollenlisteGefunden.length > 0) {
  befunde.push(`AK1: möglicher zweiter Rollenlisten-Eintrag außerhalb von src/rollen/: ${zweiteRollenlisteGefunden.join(', ')}`)
} else {
  console.log('✓ AK1: kein Rollenname aus bekannteRollen() als Objektschlüssel außerhalb von src/rollen/.')
}

// ─── (c) AK3: Context-Builder-Verhalten unverändert ────────────────────────
const laufIdUnbekannt = 'check-f17-unbekannte-rolle'
try {
  const optionen = { basisVerzeichnis: BASIS, schreiber: stillerSchreiber }
  const ergebnis = baueKontextpaket(laufIdUnbekannt, 'nicht-existent', [], profilReferenz, {}, optionen)
  if (ergebnis.ok !== false || ergebnis.grund !== 'unbekannte_rolle') {
    befunde.push(`AK3: unbekannte Rolle sollte { ok: false, grund: 'unbekannte_rolle' } liefern, erhalten ${JSON.stringify(ergebnis)}`)
  } else {
    console.log("✓ AK3: unbekannte Rolle → { ok: false, grund: 'unbekannte_rolle' }, unverändert nach der Migration.")
  }
} finally {
  raeumeVerzeichnis(join(BASIS, `lineage-kontextpaket-${laufIdUnbekannt}`))
}

const laufIdAusschluss = 'check-f17-ausschlussmuster'
try {
  const optionen = { basisVerzeichnis: BASIS, schreiber: stillerSchreiber }
  const ergebnis = baueKontextpaket(
    laufIdAusschluss,
    'architecture-advisor',
    [{ pfad: 'src/rollen/index.ts', frage: 'x', begruendung: 'x', inhalt: 'x' }],
    profilReferenz,
    {},
    optionen
  )
  const korrekt = ergebnis.ok && ergebnis.paket.elemente.length === 0 && ergebnis.paket.ausgeschlossen.length === 1 && ergebnis.paket.ausgeschlossen[0].grund === 'rolle'
  if (!korrekt) {
    befunde.push(`AK3: 'architecture-advisor' sollte src/** weiterhin ausschließen, erhalten ${JSON.stringify(ergebnis)}`)
  } else {
    console.log("✓ AK3: Ausschlussmuster 'src/**' für 'architecture-advisor' greift unverändert über ROLLENVERTRAEGE.")
  }
} finally {
  raeumeVerzeichnis(join(BASIS, `lineage-kontextpaket-${laufIdAusschluss}`))
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
