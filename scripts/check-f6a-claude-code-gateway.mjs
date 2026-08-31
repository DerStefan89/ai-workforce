/**
 * Datei: scripts/check-f6a-claude-code-gateway.mjs
 *
 * Zweck: Claude-Code-Gateway-Gate, WS1 (F6a). Importiert baueAufruf und
 * pruefeUndVerweigereBeiTreffer direkt aus src/claude-code-gateway/index.ts
 * (kein zweiter, von Hand nachgebauter Regelsatz, D5-Muster wie F4): (a)
 * baueAufruf Grün-Fall (erwartetes Tokens-Array); (b)
 * pruefeUndVerweigereBeiTreffer Grün-Fall (unauffällige Tokens); (c)
 * pruefeUndVerweigereBeiTreffer Rot-Fall (verbotener Aufrufparameter); (d)
 * F-048-Fenster-Rot-Fall (mehrwortiger Verbotseintrag im Tokens-Array); (e)
 * Kontrollzustand-Testfixture aufräumen.
 *
 * Wird aufgerufen von: `npm run check`, `npm run check:template`
 *
 * Aufruf: node scripts/check-f6a-claude-code-gateway.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { randomUUID } from 'node:crypto'
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { baueAufruf, pruefeUndVerweigereBeiTreffer } from '../src/claude-code-gateway/index.ts'

const befunde = []
const KONTROLLZUSTAND_BASIS = 'kontrollzustand-test'
const PROFIL_REFERENZ = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }

console.log('\n=== F6a-Claude-Code-Gateway-Check (WS1) ===\n')

function neueLaufId(praefix) {
  return `${praefix}-${randomUUID()}`
}

function raeumeKette(laufId) {
  rmSync(join(KONTROLLZUSTAND_BASIS, laufId), { recursive: true, force: true })
}

// ─── (a) baueAufruf: Grün-Fall ─────────────────────────────────────────────
const eingaben = { modell: 'sonnet', werkzeugsatz: { modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Read', 'Grep'] } }
const erwartet = ['--model', 'sonnet', '--output-format', 'json', '--setting-sources', 'project', '--tools', 'Read,Grep']
const tokens = baueAufruf(eingaben)
if (JSON.stringify(tokens) !== JSON.stringify(erwartet)) {
  befunde.push(`baueAufruf Grün-Fall: erwartet ${JSON.stringify(erwartet)}, erhalten ${JSON.stringify(tokens)}`)
} else {
  console.log('✓ baueAufruf Grün-Fall: erwartetes Tokens-Array konstruiert.')
}

// ─── (b) pruefeUndVerweigereBeiTreffer: Grün-Fall ──────────────────────────
const laufIdGruen = neueLaufId('gruen')
try {
  const ergebnisGruen = pruefeUndVerweigereBeiTreffer(tokens, laufIdGruen, PROFIL_REFERENZ, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
  if (!ergebnisGruen.ok) {
    befunde.push(`pruefeUndVerweigereBeiTreffer Grün-Fall: erwartet ok:true, erhalten ${JSON.stringify(ergebnisGruen)}`)
  } else {
    console.log('✓ pruefeUndVerweigereBeiTreffer Grün-Fall: unauffällige Tokens akzeptiert.')
  }
} finally {
  raeumeKette(laufIdGruen)
}

// ─── (c) pruefeUndVerweigereBeiTreffer: Rot-Fall (verbotener Aufrufparameter) ──
const laufIdRot = neueLaufId('rot')
try {
  const tokensRot = ['--model', 'sonnet', '--dangerously-skip-permissions']
  const ergebnisRot = pruefeUndVerweigereBeiTreffer(tokensRot, laufIdRot, PROFIL_REFERENZ, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
  if (ergebnisRot.ok) {
    befunde.push(`pruefeUndVerweigereBeiTreffer Rot-Fall: erwartet ok:false, erhalten ${JSON.stringify(ergebnisRot)}`)
  } else {
    console.log(`✓ pruefeUndVerweigereBeiTreffer Rot-Fall: '--dangerously-skip-permissions' abgelehnt (${ergebnisRot.grund}).`)
  }
} finally {
  raeumeKette(laufIdRot)
}

// ─── (d) F-048-Fenster-Rot-Fall ─────────────────────────────────────────────
const laufIdF048 = neueLaufId('rot-f048')
try {
  const tokensF048 = ['--model', 'sonnet', '--permission-mode', 'bypassPermissions', '--output-format', 'json']
  const ergebnisF048 = pruefeUndVerweigereBeiTreffer(tokensF048, laufIdF048, PROFIL_REFERENZ, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
  if (ergebnisF048.ok) {
    befunde.push(`F-048-Fenster-Rot-Fall: erwartet ok:false, erhalten ${JSON.stringify(ergebnisF048)}`)
  } else {
    console.log(`✓ F-048-Fenster-Rot-Fall: '--permission-mode bypassPermissions' als verteiltes Token-Fenster abgelehnt (${ergebnisF048.grund}).`)
  }
} finally {
  raeumeKette(laufIdF048)
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
