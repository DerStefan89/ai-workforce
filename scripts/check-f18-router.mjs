/**
 * Datei: scripts/check-f18-router.mjs
 *
 * Zweck: Router-Gate (F18 WS-1/WS-2). Prüft, dass ROLLENVERTRAEGE einen
 * Eintrag 'router' mit der exakt erwarteten Form trägt und dass
 * schemas/ergebnis-router.schema.json gültiges JSON ist, dessen
 * *.valid.json-Beispiel die Schema-Regeln erfüllt und dessen
 * *.invalid-*.json-Beispiele je eine benannte Regel verletzen.
 *
 * Kein generischer JSON-Schema-Validator (Muster check-datenformate.mjs,
 * D5): die Prüfung gegen schemas/ergebnis-router.schema.json läuft über
 * src/router/index.ts' validiereErgebnisRouter — WS-1 trug hier noch eine
 * eigene, von Hand nachgebaute Kopie dieser Funktion (es gab vor WS-2 noch
 * kein src/router/-Modul); seit WS-2 importiert das Gate die reale Funktion,
 * statt einen zweiten Regelsatz zu pflegen (D5).
 *
 * Wird aufgerufen von: npm run check.
 *
 * Aufruf: node scripts/check-f18-router.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { existsSync, readFileSync } from 'node:fs'
import { ROLLENVERTRAEGE } from '../src/rollen/index.ts'
import { validiereErgebnisRouter } from '../src/router/index.ts'

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

// ─── (c) Beispiele gegen das Schema ─────────────────────────────────────────
const beispiele = [
  { pfad: 'schemas/examples/ergebnis-router.valid.json', sollGueltigSein: true },
  { pfad: 'schemas/examples/ergebnis-router.invalid-unbekannte-kontrolltiefe.json', sollGueltigSein: false },
  { pfad: 'schemas/examples/ergebnis-router.invalid-leere-task-typen.json', sollGueltigSein: false },
  { pfad: 'schemas/examples/ergebnis-router.invalid-leeres-rueckfragen-element.json', sollGueltigSein: false },
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
  console.log('✓ (c) Beispiele: valid.json erfüllt das Schema, alle drei invalid-*.json verletzen je eine benannte Regel.')
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
