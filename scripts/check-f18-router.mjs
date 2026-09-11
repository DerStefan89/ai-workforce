/**
 * Datei: scripts/check-f18-router.mjs
 *
 * Zweck: Router-Gate (F18 WS-1). Prüft, dass ROLLENVERTRAEGE einen Eintrag
 * 'router' mit der exakt erwarteten Form trägt und dass
 * schemas/ergebnis-router.schema.json gültiges JSON ist, dessen
 * *.valid.json-Beispiel die Schema-Regeln erfüllt und dessen
 * *.invalid-*.json-Beispiele je eine benannte Regel verletzen.
 *
 * Kein generischer JSON-Schema-Validator (Muster check-datenformate.mjs,
 * D5): validiereErgebnisRouter bildet die Pflichtfeld-/Enum-Regeln von
 * schemas/ergebnis-router.schema.json von Hand nach. Ändert sich das
 * Schema, muss diese Funktion synchron gehalten werden.
 *
 * Wird aufgerufen von: npm run check.
 *
 * Aufruf: node scripts/check-f18-router.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { existsSync, readFileSync } from 'node:fs'
import { ROLLENVERTRAEGE } from '../src/rollen/index.ts'

const befunde = []

console.log('\n=== F18-Router-Check ===\n')

// ─── (a) ROLLENVERTRAEGE.router hat die erwartete Form ─────────────────────
const router = ROLLENVERTRAEGE.router
if (!router) {
  befunde.push("ROLLENVERTRAEGE trägt keinen Eintrag 'router'")
} else {
  if (typeof router.zweck !== 'string' || router.zweck.length === 0) {
    befunde.push("router.zweck fehlt oder ist leer")
  }
  if (JSON.stringify(router.erlaubte_werkzeugsatz_arten) !== JSON.stringify(['lesend'])) {
    befunde.push(`router.erlaubte_werkzeugsatz_arten erwartet ['lesend'], erhalten ${JSON.stringify(router.erlaubte_werkzeugsatz_arten)}`)
  }
  if (JSON.stringify([...router.erlaubte_worker].sort()) !== JSON.stringify(['claude-code', 'codex'])) {
    befunde.push(`router.erlaubte_worker erwartet ['claude-code', 'codex'], erhalten ${JSON.stringify(router.erlaubte_worker)}`)
  }
  if (router.erlaubtes_output_schema !== 'ergebnis-router') {
    befunde.push(`router.erlaubtes_output_schema erwartet 'ergebnis-router', erhalten ${JSON.stringify(router.erlaubtes_output_schema)}`)
  }
  if (JSON.stringify(router.ausschlussmuster) !== JSON.stringify(['src/**'])) {
    befunde.push(`router.ausschlussmuster erwartet ['src/**'], erhalten ${JSON.stringify(router.ausschlussmuster)}`)
  }
  if (befunde.length === 0) {
    console.log("✓ (a) Router-Eintrag in ROLLENVERTRAEGE hat alle fünf Felder in der erwarteten Form.")
  }
}

// ─── (b) Schema-Datei ist gültiges JSON ─────────────────────────────────────
const schemaPfad = 'schemas/ergebnis-router.schema.json'
if (!existsSync(schemaPfad)) {
  befunde.push(`${schemaPfad}: Datei fehlt`)
} else {
  try {
    JSON.parse(readFileSync(schemaPfad, 'utf-8'))
    console.log(`✓ (b) ${schemaPfad}: gültiges JSON.`)
  } catch (fehler) {
    befunde.push(`${schemaPfad}: kein gültiges JSON (${fehler.message})`)
  }
}

/**
 * Prüft ein geparstes Router-Ergebnis gegen schemas/ergebnis-router.schema.json.
 * @param obj - das geparste JSON-Objekt
 * @returns Liste der Regelverletzungen (leer = gültig)
 */
function validiereErgebnisRouter(obj) {
  const verstoesse = []
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return ['Wurzel ist kein Objekt']
  }

  const erlaubteFelder = new Set(['kontrolltiefe', 'risikoklasse', 'task_typen', 'rueckfragen', 'begruendung'])
  for (const feld of Object.keys(obj)) {
    if (!erlaubteFelder.has(feld)) verstoesse.push(`unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }

  for (const feld of erlaubteFelder) {
    if (!(feld in obj)) verstoesse.push(`Pflichtfeld '${feld}' fehlt`)
  }

  const kontrolltiefeWerte = ['fast-lane', 'standard', 'hoch']
  if ('kontrolltiefe' in obj && !kontrolltiefeWerte.includes(obj.kontrolltiefe)) {
    verstoesse.push(`'kontrolltiefe' muss einer von ${JSON.stringify(kontrolltiefeWerte)} sein, ist ${JSON.stringify(obj.kontrolltiefe)}`)
  }

  const risikoklasseWerte = ['niedrig', 'mittel', 'hoch']
  if ('risikoklasse' in obj && !risikoklasseWerte.includes(obj.risikoklasse)) {
    verstoesse.push(`'risikoklasse' muss einer von ${JSON.stringify(risikoklasseWerte)} sein, ist ${JSON.stringify(obj.risikoklasse)}`)
  }

  const taskTypenWerte = ['text-aenderung', 'neues-feature', 'bugfix', 'refactoring', 'dokumentation', 'unklar']
  if ('task_typen' in obj) {
    if (!Array.isArray(obj.task_typen) || obj.task_typen.length === 0) {
      verstoesse.push("'task_typen' muss ein Array mit mindestens einem Eintrag sein")
    } else {
      for (const wert of obj.task_typen) {
        if (!taskTypenWerte.includes(wert)) {
          verstoesse.push(`'task_typen' enthält '${wert}', erlaubt sind nur ${JSON.stringify(taskTypenWerte)}`)
        }
      }
    }
  }

  if ('rueckfragen' in obj) {
    if (!Array.isArray(obj.rueckfragen)) {
      verstoesse.push("'rueckfragen' muss ein Array sein")
    } else if (obj.rueckfragen.some((r) => typeof r !== 'string' || r.length === 0)) {
      verstoesse.push("'rueckfragen' darf nur nicht-leere Strings enthalten")
    }
  }

  if ('begruendung' in obj && (typeof obj.begruendung !== 'string' || obj.begruendung.length === 0)) {
    verstoesse.push("'begruendung' muss ein nicht-leerer String sein")
  }

  return verstoesse
}

// ─── (c) Beispiele gegen das Schema ─────────────────────────────────────────
const beispiele = [
  { pfad: 'schemas/examples/ergebnis-router.valid.json', sollGueltigSein: true },
  { pfad: 'schemas/examples/ergebnis-router.invalid-unbekannte-kontrolltiefe.json', sollGueltigSein: false },
  { pfad: 'schemas/examples/ergebnis-router.invalid-leere-task-typen.json', sollGueltigSein: false },
]

const befundeVorBeispielen = befunde.length
for (const { pfad, sollGueltigSein } of beispiele) {
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

  const verstoesse = validiereErgebnisRouter(obj)
  if (sollGueltigSein && verstoesse.length > 0) {
    befunde.push(`${pfad}: sollte gültig sein, aber verletzt: ${verstoesse.join('; ')}`)
  }
  if (!sollGueltigSein && verstoesse.length === 0) {
    befunde.push(`${pfad}: sollte ungültig sein, aber keine Regelverletzung gefunden`)
  }
}
if (befunde.length === befundeVorBeispielen) {
  console.log('✓ (c) Beispiele: valid.json erfüllt das Schema, beide invalid-*.json verletzen je eine benannte Regel.')
}

// ─── Ergebnis ───────────────────────────────────────────────────────────────
console.log('')
if (befunde.length === 0) {
  console.log('✓ Keine Befunde.\n')
  process.exitCode = 0
} else {
  console.log(`✗ ${befunde.length} Befund(e):\n`)
  for (const b of befunde) console.log(`  - ${b}`)
  console.log('')
  process.exitCode = 1
}
