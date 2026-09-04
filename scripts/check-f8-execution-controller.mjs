/**
 * Datei: scripts/check-f8-execution-controller.mjs
 *
 * Zweck: Execution-Controller-Gate (F8 WS-1, state/tasks/f8-execution-
 * controller-ws1.md SCOPE Punkt 3, D4). Zwei Grep-Prüfungen gegen
 * src/execution-controller/*.ts, Muster wie scripts/check-f6a-claude-
 * code-gateway.mjs AK12/AK14: (a) AK1 — kein Vorkommen von Bezeichnern
 * aus F5s/F6as/F7s internen Regel-/Auswertungsfunktionen, ausgenommen
 * *.test.ts (Vertrag SCOPE Punkt 3.1); (b) AK3 — kein Vorkommen von
 * Bezeichnern der F4-Startfreigabeprüfung in den Produktionsdateien,
 * ebenfalls mit *.test.ts-Ausnahme (Entscheidung Stefan, 04.09.2026 —
 * hebt die ursprünglich im Vertrag angelegte Asymmetrie zu AK1 auf, siehe
 * features/F8/journal.md). Beide mit Selbsttest, dass das Muster einen
 * simulierten Verstoß tatsächlich erkennt.
 *
 * Wird aufgerufen von: `npm run check`, `npm run check:template`
 *
 * Aufruf: node scripts/check-f8-execution-controller.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const befunde = []
const EXECUTION_CONTROLLER_DIR = join('src', 'execution-controller')

console.log('\n=== F8-Execution-Controller-Check (WS-1) ===\n')

function alleDateien() {
  return readdirSync(EXECUTION_CONTROLLER_DIR).filter((datei) => datei.endsWith('.ts'))
}

function produktionsdateien() {
  return alleDateien().filter((datei) => !datei.endsWith('.test.ts'))
}

// ─── AK1-Grep: keine F5/F6a/F7-Regelbezeichner im Controller (Produktionsdateien) ──
const ak1Muster = /ROLLEN_AUSSCHLUSSMUSTER|pruefeUndVerweigereBeiTreffer|ermittleErgebnis|permission_denials|non_execution_kind/
let ak1Verstoss = null
for (const datei of produktionsdateien()) {
  const inhalt = readFileSync(join(EXECUTION_CONTROLLER_DIR, datei), 'utf-8')
  if (ak1Muster.test(inhalt)) {
    ak1Verstoss = datei
    break
  }
}
if (ak1Verstoss !== null) {
  befunde.push(`AK1: verbotenes Muster (F5/F6a/F7-Regelbezeichner) in src/execution-controller/${ak1Verstoss} gefunden`)
} else {
  console.log(
    '✓ AK1: kein Vorkommen von ROLLEN_AUSSCHLUSSMUSTER/pruefeUndVerweigereBeiTreffer/ermittleErgebnis/permission_denials/non_execution_kind in den Produktionsdateien von src/execution-controller/*.ts — der Controller baut keine der F5/F6a/F7-Regeln nach.'
  )
}
const ak1SimulierterVerstoss = 'if (permission_denials.length > 0) { /* Verstoss */ }'
if (!ak1Muster.test(ak1SimulierterVerstoss)) {
  befunde.push('AK1-Selbsttest: Muster erkennt einen simulierten Verstoß NICHT — Grep-Regel ist wirkungslos')
} else {
  console.log('✓ AK1-Selbsttest: simulierter Verstoß wird vom Muster erkannt.')
}

// ─── AK3-Grep: keine F4-Startfreigabebezeichner im Controller (Produktionsdateien) ──
const ak3Muster = /pruefeStartfreigabe|ermittleIstZustand|aktuelle-autorisierung/
let ak3Verstoss = null
for (const datei of produktionsdateien()) {
  const inhalt = readFileSync(join(EXECUTION_CONTROLLER_DIR, datei), 'utf-8')
  if (ak3Muster.test(inhalt)) {
    ak3Verstoss = datei
    break
  }
}
if (ak3Verstoss !== null) {
  befunde.push(`AK3: verbotenes Muster (F4-Startfreigabebezeichner) in src/execution-controller/${ak3Verstoss} gefunden`)
} else {
  console.log(
    '✓ AK3: kein Vorkommen von pruefeStartfreigabe/ermittleIstZustand/aktuelle-autorisierung in den Produktionsdateien von src/execution-controller/*.ts.'
  )
}
const ak3SimulierterVerstoss = 'const zustand = ermittleIstZustand(pfad)'
if (!ak3Muster.test(ak3SimulierterVerstoss)) {
  befunde.push('AK3-Selbsttest: Muster erkennt einen simulierten Verstoß NICHT — Grep-Regel ist wirkungslos')
} else {
  console.log('✓ AK3-Selbsttest: simulierter Verstoß wird vom Muster erkannt.')
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
