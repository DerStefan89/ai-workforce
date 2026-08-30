/**
 * Datei: scripts/check-f3-authorization-boundary.mjs
 *
 * Zweck: Authorization-Boundary-Gate (F3). Legt ein Wegwerf-Git-Repo unter
 * einem Temp-Pfad an (.gitattributes: * -text VOR dem ersten Commit) und
 * prüft pruefeAutorisierung direkt aus src/authorization-boundary/
 * importiert (kein zweiter, von Hand nachgebauter Regelsatz, D5-Muster
 * wie check-f1b-wirkungsmarke.mjs): (a) Grün-Fall, (b) manipulierte
 * Referenz (Divergenz, Rot), (c) fehlender Pfad (Rot), (d) \r\n-
 * Zeilenenden bei korrekt konfiguriertem .gitattributes (Grün — belegt
 * Delta 3/B18).
 *
 * Wird aufgerufen von: `npm run check`, `npm run check:template`
 *
 * Aufruf: node scripts/check-f3-authorization-boundary.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pruefeAutorisierung } from '../src/authorization-boundary/index.ts'
import { sha256Hex } from '../src/checkpoint-store/index.ts'

const befunde = []

console.log('\n=== F3-Authorization-Boundary-Check ===\n')

function git(repoWurzel, argumente) {
  return execFileSync('git', argumente, { cwd: repoWurzel, encoding: 'utf8' })
}

function neuesExternesRepo() {
  const repoWurzel = join(tmpdir(), `check-f3-${randomUUID()}`)
  mkdirSync(repoWurzel, { recursive: true })
  git(repoWurzel, ['init', '--quiet'])
  git(repoWurzel, ['config', 'user.email', 'test@example.invalid'])
  git(repoWurzel, ['config', 'user.name', 'Test'])
  writeFileSync(join(repoWurzel, '.gitattributes'), '* -text\n')
  git(repoWurzel, ['add', '.gitattributes'])
  git(repoWurzel, ['commit', '--quiet', '-m', 'init: Zeilenenden pinnen'])
  return repoWurzel
}

function committeAutorisierung(repoWurzel, laufId, inhalt) {
  const relativerPfad = `autorisierungen/${laufId}.json`
  const zielpfad = join(repoWurzel, relativerPfad)
  mkdirSync(dirname(zielpfad), { recursive: true })
  writeFileSync(zielpfad, inhalt)
  git(repoWurzel, ['add', relativerPfad])
  git(repoWurzel, ['commit', '--quiet', '-m', 'autorisierung'])
  const commitHash = git(repoWurzel, ['rev-parse', 'HEAD']).trim()
  return { pfad: zielpfad, commit_hash: commitHash, datei_hash: sha256Hex(inhalt) }
}

const repoWurzel = neuesExternesRepo()
const stillerSchreiber = () => {}

try {
  // ─── (a) Grün-Fall ──────────────────────────────────────────────────────
  const laufIdGruen = `check-f3-gruen-${randomUUID()}`
  const inhaltGruen = JSON.stringify({ lauf_id: laufIdGruen, entscheidung: 'FREIGEGEBEN', zeitstempel: new Date().toISOString() })
  const referenzGruen = committeAutorisierung(repoWurzel, laufIdGruen, inhaltGruen)
  const ergebnisGruen = pruefeAutorisierung(referenzGruen, { repoWurzel, schreiber: stillerSchreiber })
  if (!ergebnisGruen.ok || ergebnisGruen.entscheidung !== 'FREIGEGEBEN') {
    befunde.push(`Grün-Fall: erwartet ok:true/FREIGEGEBEN, erhalten ${JSON.stringify(ergebnisGruen)}`)
  } else {
    console.log('✓ Grün-Fall: echte, committete Freigabe wird akzeptiert.')
  }

  // ─── (b) Divergenz-Fall (manipulierte Referenz) ────────────────────────
  const laufIdManipuliert = `check-f3-manipuliert-${randomUUID()}`
  const inhaltManipuliert = JSON.stringify({
    lauf_id: laufIdManipuliert,
    entscheidung: 'FREIGEGEBEN',
    zeitstempel: new Date().toISOString(),
  })
  const referenzManipuliert = committeAutorisierung(repoWurzel, laufIdManipuliert, inhaltManipuliert)
  writeFileSync(referenzManipuliert.pfad, JSON.stringify({ manipuliert: true }))
  const ergebnisManipuliert = pruefeAutorisierung(referenzManipuliert, { repoWurzel, schreiber: stillerSchreiber })
  if (ergebnisManipuliert.ok) {
    befunde.push(`Divergenz-Fall: erwartet ok:false, erhalten ${JSON.stringify(ergebnisManipuliert)}`)
  } else {
    console.log(`✓ Divergenz-Fall: manipulierte Referenz abgelehnt (${ergebnisManipuliert.grund}).`)
  }

  // ─── (c) Fehlt-Fall ─────────────────────────────────────────────────────
  const referenzFehlt = {
    pfad: join(tmpdir(), 'nicht-vorhanden', 'autorisierung.json'),
    commit_hash: 'a'.repeat(40),
    datei_hash: 'a'.repeat(64),
  }
  const ergebnisFehlt = pruefeAutorisierung(referenzFehlt, { repoWurzel, schreiber: stillerSchreiber })
  if (ergebnisFehlt.ok) {
    befunde.push(`Fehlt-Fall: erwartet ok:false, erhalten ${JSON.stringify(ergebnisFehlt)}`)
  } else {
    console.log(`✓ Fehlt-Fall: Pfad außerhalb des Repos abgelehnt (${ergebnisFehlt.grund}).`)
  }

  // ─── (d) \r\n-Zeilenenden bei korrekt konfiguriertem .gitattributes ────
  const laufIdCrlf = `check-f3-crlf-${randomUUID()}`
  const inhaltCrlf = `{\r\n  "lauf_id": "${laufIdCrlf}",\r\n  "entscheidung": "FREIGEGEBEN",\r\n  "zeitstempel": "${new Date().toISOString()}"\r\n}`
  const referenzCrlf = committeAutorisierung(repoWurzel, laufIdCrlf, inhaltCrlf)
  const ergebnisCrlf = pruefeAutorisierung(referenzCrlf, { repoWurzel, schreiber: stillerSchreiber })
  if (!ergebnisCrlf.ok || ergebnisCrlf.entscheidung !== 'FREIGEGEBEN') {
    befunde.push(`CRLF-Fall: erwartet ok:true/FREIGEGEBEN trotz \\r\\n-Zeilenenden, erhalten ${JSON.stringify(ergebnisCrlf)}`)
  } else {
    console.log('✓ CRLF-Fall: \\r\\n-Zeilenenden bei gepinntem .gitattributes ändern das Ergebnis nicht (Delta 3/B18).')
  }
} finally {
  rmSync(repoWurzel, { recursive: true, force: true })
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
