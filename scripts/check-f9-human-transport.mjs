/**
 * Datei: scripts/check-f9-human-transport.mjs
 *
 * Zweck: Human-Transport-Gate (F9). Prüft die acht Payload-Fixtures unter
 * schemas/examples/kontrollzustand-bedarf*.json und
 * schemas/examples/kontrollzustand-transport*.json gegen
 * validiereBedarfDaten/validiereTransportpaketDaten, einen synthetischen
 * Ende-zu-Ende-Lauf (Bedarf → Transportpaket → RUN_PREPARED → gültige
 * Antwort → Terminal ERFOLGREICH), einen Schemaverstoß-Fall
 * (→ FEHLGESCHLAGEN) und einen STALE-Fall (blockiert bis entscheideStale)
 * — alle direkt aus src/human-transport/ importiert (kein zweiter, von
 * Hand nachgebauter Regelsatz, D5-Muster). Zusätzlich AC10: kein
 * fetch/HTTP-Client/Browsersteuerung in src/human-transport/ (Grep-Nachweis,
 * Muster wie F1Bs TEMP-ROT-FALL-Beleg).
 *
 * Wird aufgerufen von: `npm run check`, `npm run check:template`
 *
 * Aufruf: node scripts/check-f9-human-transport.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { stelleLaufstatusFest } from '../src/checkpoint-store/index.ts'
import {
  entscheideStale,
  erzeugeTransportpaket,
  erfasseBedarf,
  haendigeAus,
  importiereAntwort,
  pruefeUndEntscheideStale,
  validiereBedarfDaten,
  validiereTransportpaketDaten,
} from '../src/human-transport/index.ts'

const befunde = []
const BASIS = 'kontrollzustand-test'
const profilReferenz = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
const stillerSchreiber = () => {}

console.log('\n=== F9-Human-Transport-Check ===\n')

function raeumeAuf(laufId) {
  rmSync(join(BASIS, `lineage-bedarf-${laufId}`), { recursive: true, force: true })
  rmSync(join(BASIS, `lineage-transport-${laufId}`), { recursive: true, force: true })
  rmSync(join(BASIS, laufId), { recursive: true, force: true })
}

// ─── (a) Acht Payload-Fixtures gegen validiereBedarfDaten/validiereTransportpaketDaten ──
const fixtures = [
  { pfad: 'schemas/examples/kontrollzustand-bedarf-leer.valid.json', validator: validiereBedarfDaten, sollGueltigSein: true },
  { pfad: 'schemas/examples/kontrollzustand-bedarf-befuellt.valid.json', validator: validiereBedarfDaten, sollGueltigSein: true },
  { pfad: 'schemas/examples/kontrollzustand-bedarf.invalid-fehlende-beschreibung.json', validator: validiereBedarfDaten, sollGueltigSein: false },
  { pfad: 'schemas/examples/kontrollzustand-bedarf.invalid-falscher-schema-wert.json', validator: validiereBedarfDaten, sollGueltigSein: false },
  { pfad: 'schemas/examples/kontrollzustand-transport-erstellt.valid.json', validator: validiereTransportpaketDaten, sollGueltigSein: true },
  { pfad: 'schemas/examples/kontrollzustand-transport-antwort.valid.json', validator: validiereTransportpaketDaten, sollGueltigSein: true },
  { pfad: 'schemas/examples/kontrollzustand-transport.invalid-fehlender-bezug.json', validator: validiereTransportpaketDaten, sollGueltigSein: false },
  { pfad: 'schemas/examples/kontrollzustand-transport.invalid-status-ausserhalb-enum.json', validator: validiereTransportpaketDaten, sollGueltigSein: false },
]

for (const { pfad, validator, sollGueltigSein } of fixtures) {
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
  const verstoesse = validator(obj)
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

// ─── (b) Synthetischer Ende-zu-Ende-Lauf: Bedarf → Paket → RUN_PREPARED → gültige Antwort → ERFOLGREICH ──
const laufIdGruen = `check-f9-gruen-${randomUUID()}`
try {
  erfasseBedarf(laufIdGruen, profilReferenz, 'Werkzeugempfehlung klären', [], { basisVerzeichnis: BASIS, schreiber: stillerSchreiber })
  erzeugeTransportpaket(laufIdGruen, profilReferenz, 1, 'Bitte prüfen: ...', 'ChatGPT (manueller Kopierblock)', {
    basisVerzeichnis: BASIS,
    schreiber: stillerSchreiber,
  })
  haendigeAus(laufIdGruen, profilReferenz, { basisVerzeichnis: BASIS, schreiber: stillerSchreiber })
  const importErgebnis = importiereAntwort(laufIdGruen, profilReferenz, { antwort: 'Ja, gibt es.' }, 'ERFOLGREICH', {
    basisVerzeichnis: BASIS,
    schreiber: stillerSchreiber,
  })
  const status = stelleLaufstatusFest(laufIdGruen, { basisVerzeichnis: BASIS, schreiber: stillerSchreiber })

  if (!importErgebnis.ok || status.status !== 'ABGESCHLOSSEN' || status.ergebnis !== 'ERFOLGREICH') {
    befunde.push(`Ende-zu-Ende-Lauf: erwartet ABGESCHLOSSEN/ERFOLGREICH, erhalten ${JSON.stringify({ importErgebnis, status })}`)
  } else {
    console.log('✓ Ende-zu-Ende-Lauf: Bedarf → Transportpaket → RUN_PREPARED → gültige Antwort → Terminal ERFOLGREICH.')
  }
} finally {
  raeumeAuf(laufIdGruen)
}

// ─── (c) Schemaverstoß-Fall → FEHLGESCHLAGEN, keine Version 2 ──────────────
const laufIdRot = `check-f9-rot-${randomUUID()}`
try {
  erfasseBedarf(laufIdRot, profilReferenz, 'Werkzeugempfehlung klären', [], { basisVerzeichnis: BASIS, schreiber: stillerSchreiber })
  erzeugeTransportpaket(laufIdRot, profilReferenz, 1, 'Bitte prüfen: ...', 'ChatGPT (manueller Kopierblock)', {
    basisVerzeichnis: BASIS,
    schreiber: stillerSchreiber,
  })
  haendigeAus(laufIdRot, profilReferenz, { basisVerzeichnis: BASIS, schreiber: stillerSchreiber })
  const importErgebnis = importiereAntwort(laufIdRot, profilReferenz, { unbekanntesFeld: 'x' }, 'ERFOLGREICH', {
    basisVerzeichnis: BASIS,
    schreiber: stillerSchreiber,
  })
  const status = stelleLaufstatusFest(laufIdRot, { basisVerzeichnis: BASIS, schreiber: stillerSchreiber })

  if (importErgebnis.ok !== false || status.status !== 'ABGESCHLOSSEN' || status.ergebnis !== 'FEHLGESCHLAGEN') {
    befunde.push(`Schemaverstoß-Fall: erwartet ok:false und ABGESCHLOSSEN/FEHLGESCHLAGEN, erhalten ${JSON.stringify({ importErgebnis, status })}`)
  } else {
    console.log('✓ Schemaverstoß-Fall: keine Registrierung, Terminal FEHLGESCHLAGEN (D4).')
  }
} finally {
  raeumeAuf(laufIdRot)
}

// ─── (d) STALE-Fall: blockiert, bis entscheideStale real aufgerufen wurde (D6) ──
const laufIdStale = `check-f9-stale-${randomUUID()}`
try {
  const optionen = { basisVerzeichnis: BASIS, schreiber: stillerSchreiber }
  erfasseBedarf(laufIdStale, profilReferenz, 'ursprüngliche Beschreibung', [], optionen)
  erzeugeTransportpaket(laufIdStale, profilReferenz, 1, 'Bitte prüfen: ...', 'ChatGPT (manueller Kopierblock)', optionen)
  erfasseBedarf(laufIdStale, profilReferenz, 'geänderte Beschreibung', [], optionen)

  const vorEntscheidung = pruefeUndEntscheideStale(laufIdStale, {}, optionen)
  const staleErkanntVorEntscheidung = vorEntscheidung.stale === true && vorEntscheidung.freigegeben === false

  let entscheidungHatGeworfen = false
  try {
    entscheideStale(laufIdStale, profilReferenz, 'nachtrag', undefined, optionen)
  } catch {
    entscheidungHatGeworfen = true
  }

  const nachEntscheidung = pruefeUndEntscheideStale(laufIdStale, {}, optionen)
  const bleibtBlockiertOhneNeuenBedarf = nachEntscheidung.stale === true && nachEntscheidung.freigegeben === false

  if (!staleErkanntVorEntscheidung || entscheidungHatGeworfen || !bleibtBlockiertOhneNeuenBedarf) {
    befunde.push(
      `STALE-Fall: erwartet stale:true/freigegeben:false vor UND nach entscheideStale (Entscheidung ändert den Vergleich nicht rückwirkend), entscheideStale ohne Wurf, erhalten ${JSON.stringify({ vorEntscheidung, entscheidungHatGeworfen, nachEntscheidung })}`
    )
  } else {
    console.log('✓ STALE-Fall: pruefeUndEntscheideStale blockiert (freigegeben:false), entscheideStale hält die menschliche Entscheidung fest, ohne den Vergleich rückwirkend zu ändern (D6).')
  }
} finally {
  raeumeAuf(laufIdStale)
}

// ─── (e) AC10: kein fetch/HTTP-Client/Browsersteuerung in src/human-transport/ ──
const humanTransportDir = join('src', 'human-transport')
const verbotenesMuster = /\b(fetch|XMLHttpRequest|puppeteer|playwright|axios|node-fetch|http\.request|https\.request)\b/i
let ac10Verstoss = null
for (const datei of readdirSync(humanTransportDir)) {
  if (!datei.endsWith('.ts')) continue
  const inhalt = readFileSync(join(humanTransportDir, datei), 'utf-8')
  if (verbotenesMuster.test(inhalt)) {
    ac10Verstoss = datei
    break
  }
}
if (ac10Verstoss !== null) {
  befunde.push(`AC10: verbotenes Muster (fetch/HTTP-Client/Browsersteuerung) in src/human-transport/${ac10Verstoss} gefunden`)
} else {
  console.log('✓ AC10: kein fetch/HTTP-Client/Browsersteuerung in src/human-transport/.')
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
