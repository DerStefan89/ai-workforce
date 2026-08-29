/**
 * Datei: scripts/check-datenformate.mjs
 *
 * Zweck: Datenformat-Gate für Feature 0. Prüft, dass `schemas/profile.schema.json`
 * und `schemas/kontrollzustand.schema.json` gültiges JSON sind, dass jedes
 * `*.valid.json`-Beispiel sein Schema erfüllt, dass jedes `*.invalid*.json`-Beispiel
 * sein Schema mit benannter Regelverletzung verletzt, und validiert jede reale
 * Datei unter `profiles/*.json` bzw. `kontrollzustand/*.json`/`*.jsonl`.
 *
 * Kein generischer JSON-Schema-Validator (plan-v1 D5) — die beiden
 * `validiereProfil`/`validiereKontrollzustand`-Funktionen bilden die Pflichtfeld-/
 * Typregeln der Schema-Dateien von Hand nach. Ändert sich ein Schema, müssen
 * beide Stellen synchron gehalten werden.
 *
 * Wird aufgerufen von: `npm run check`, `npm run check:template`
 *
 * Aufruf: node scripts/check-datenformate.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const befunde = []

console.log('\n=== Datenformate-Check ===\n')

/**
 * Prüft ein geparstes Profil gegen schemas/profile.schema.json.
 * @param obj - das geparste JSON-Objekt
 * @returns Liste der Regelverletzungen (leer = gültig)
 */
function validiereProfil(obj) {
  const verstoesse = []
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return ["Wurzel ist kein Objekt"]
  }

  const pflichtfelder = ['projekt', 'version', 'gates', 'dod', 'werkzeuge', 'reviewRegeln']
  for (const feld of pflichtfelder) {
    if (!(feld in obj)) verstoesse.push(`Pflichtfeld '${feld}' fehlt`)
  }

  if ('projekt' in obj && (typeof obj.projekt !== 'string' || obj.projekt.length < 1)) {
    verstoesse.push("'projekt' muss ein nicht-leerer String sein")
  }
  if ('version' in obj && (!Number.isInteger(obj.version) || obj.version < 1)) {
    verstoesse.push("'version' muss ein Integer >= 1 sein")
  }
  for (const feld of ['gates', 'dod', 'werkzeuge', 'reviewRegeln']) {
    if (feld in obj) {
      const wert = obj[feld]
      const istContainer = Array.isArray(wert) || (typeof wert === 'object' && wert !== null)
      if (!istContainer) verstoesse.push(`'${feld}' muss Array oder Objekt sein (Container)`)
    }
  }

  return verstoesse
}

/**
 * Prüft einen geparsten Kontrollzustand gegen schemas/kontrollzustand.schema.json.
 * @param obj - das geparste JSON-Objekt
 * @returns Liste der Regelverletzungen (leer = gültig)
 */
function validiereKontrollzustand(obj) {
  const verstoesse = []
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return ["Wurzel ist kein Objekt"]
  }

  const erlaubteHuellenfelder = new Set(['schema_version', 'typ', 'profil_referenz', 'payload'])
  for (const feld of Object.keys(obj)) {
    if (!erlaubteHuellenfelder.has(feld)) {
      verstoesse.push(`unbekanntes Feld '${feld}' (additionalProperties: false)`)
    }
  }

  for (const feld of ['schema_version', 'typ', 'profil_referenz']) {
    if (!(feld in obj)) verstoesse.push(`Pflichtfeld '${feld}' fehlt`)
  }

  if ('schema_version' in obj && (!Number.isInteger(obj.schema_version) || obj.schema_version < 1)) {
    verstoesse.push("'schema_version' muss ein Integer >= 1 sein")
  }
  if ('typ' in obj && (typeof obj.typ !== 'string' || obj.typ.length < 1)) {
    verstoesse.push("'typ' muss ein nicht-leerer String sein")
  }

  if ('profil_referenz' in obj) {
    const ref = obj.profil_referenz
    if (typeof ref !== 'object' || ref === null || Array.isArray(ref)) {
      verstoesse.push("'profil_referenz' muss ein Objekt sein")
    } else {
      const erlaubteRefFelder = new Set(['pfad', 'hash', 'version'])
      for (const feld of Object.keys(ref)) {
        if (!erlaubteRefFelder.has(feld)) {
          verstoesse.push(`unbekanntes Feld 'profil_referenz.${feld}' (additionalProperties: false)`)
        }
      }
      for (const feld of ['pfad', 'hash', 'version']) {
        if (!(feld in ref)) verstoesse.push(`Pflichtfeld 'profil_referenz.${feld}' fehlt`)
      }
      if ('pfad' in ref && (typeof ref.pfad !== 'string' || ref.pfad.length < 1)) {
        verstoesse.push("'profil_referenz.pfad' muss ein nicht-leerer String sein")
      }
      if ('hash' in ref && (typeof ref.hash !== 'string' || ref.hash.length < 1)) {
        verstoesse.push("'profil_referenz.hash' muss ein nicht-leerer String sein")
      }
      if ('version' in ref && (!Number.isInteger(ref.version) || ref.version < 1)) {
        verstoesse.push("'profil_referenz.version' muss ein Integer >= 1 sein")
      }
    }
  }

  return verstoesse
}

// ─── (a) Schema-Dateien sind gültiges JSON ──────────────────────────────────
const schemaDateien = ['schemas/profile.schema.json', 'schemas/kontrollzustand.schema.json']
for (const pfad of schemaDateien) {
  if (!existsSync(pfad)) {
    befunde.push(`${pfad}: Datei fehlt`)
    continue
  }
  try {
    JSON.parse(readFileSync(pfad, 'utf-8'))
  } catch (fehler) {
    befunde.push(`${pfad}: kein gültiges JSON (${fehler.message})`)
  }
}

/**
 * Lädt und parst eine JSON-Beispieldatei; meldet einen Befund statt zu werfen.
 * @param pfad - relativer Pfad zur Datei
 * @returns geparstes Objekt oder undefined bei Fehler
 */
function ladeBeispiel(pfad) {
  if (!existsSync(pfad)) {
    befunde.push(`${pfad}: Datei fehlt`)
    return undefined
  }
  try {
    return JSON.parse(readFileSync(pfad, 'utf-8'))
  } catch (fehler) {
    befunde.push(`${pfad}: kein gültiges JSON (${fehler.message})`)
    return undefined
  }
}

// ─── (b)/(c) Beispiele gegen ihr Schema ─────────────────────────────────────
const beispiele = [
  { pfad: 'schemas/examples/profile.valid.json', validator: validiereProfil, sollGueltigSein: true },
  { pfad: 'schemas/examples/profile.invalid.json', validator: validiereProfil, sollGueltigSein: false },
  { pfad: 'schemas/examples/kontrollzustand.valid.json', validator: validiereKontrollzustand, sollGueltigSein: true },
  { pfad: 'schemas/examples/kontrollzustand.invalid-fehlender-pfad.json', validator: validiereKontrollzustand, sollGueltigSein: false },
  { pfad: 'schemas/examples/kontrollzustand.invalid-fehlender-hash.json', validator: validiereKontrollzustand, sollGueltigSein: false },
  { pfad: 'schemas/examples/kontrollzustand.invalid-fehlende-version.json', validator: validiereKontrollzustand, sollGueltigSein: false },
]

for (const { pfad, validator, sollGueltigSein } of beispiele) {
  const obj = ladeBeispiel(pfad)
  if (obj === undefined) continue

  const verstoesse = validator(obj)
  if (sollGueltigSein && verstoesse.length > 0) {
    befunde.push(`${pfad}: sollte gültig sein, aber verletzt: ${verstoesse.join('; ')}`)
  }
  if (!sollGueltigSein && verstoesse.length === 0) {
    befunde.push(`${pfad}: sollte ungültig sein, aber keine Regelverletzung gefunden`)
  }
}

// ─── (d) Reale Dateien unter profiles/ und kontrollzustand/ ─────────────────
/**
 * Zählt und validiert reale Datendateien in einem Verzeichnis. `.json`-Dateien
 * werden als ein Objekt gelesen, `.jsonl`-Dateien zeilenweise (ein Objekt pro
 * nicht-leerer Zeile).
 * @param dir - Verzeichnispfad
 * @param endungen - erlaubte Dateiendungen
 * @param validator - Validierungsfunktion für ein geparstes Objekt
 * @returns Anzahl geprüfter Dateien
 */
function pruefeVerzeichnis(dir, endungen, validator) {
  if (!existsSync(dir)) {
    console.log(`ⓘ ${dir}: Verzeichnis fehlt, 0 Dateien geprüft`)
    return 0
  }

  const dateien = readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && endungen.some((endung) => e.name.endsWith(endung)))
    .map((e) => e.name)

  if (dateien.length === 0) {
    console.log(`ⓘ ${dir}: 0 Dateien geprüft`)
    return 0
  }

  for (const name of dateien) {
    const pfad = join(dir, name)
    const inhalt = readFileSync(pfad, 'utf-8')
    const zeilenweise = name.endsWith('.jsonl')
    const eintraege = zeilenweise
      ? inhalt.split('\n').filter((zeile) => zeile.trim().length > 0)
      : [inhalt]

    eintraege.forEach((eintrag, index) => {
      const bezeichner = zeilenweise ? `${pfad}:${index + 1}` : pfad
      try {
        const obj = JSON.parse(eintrag)
        const verstoesse = validator(obj)
        if (verstoesse.length > 0) {
          befunde.push(`${bezeichner}: ${verstoesse.join('; ')}`)
        }
      } catch (fehler) {
        befunde.push(`${bezeichner}: kein gültiges JSON (${fehler.message})`)
      }
    })
  }

  console.log(`✓ ${dir}: ${dateien.length} Datei(en) geprüft`)
  return dateien.length
}

pruefeVerzeichnis('profiles', ['.json'], validiereProfil)
pruefeVerzeichnis('kontrollzustand', ['.json', '.jsonl'], validiereKontrollzustand)

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
