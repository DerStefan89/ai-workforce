/**
 * Datei: scripts/check-f7-result-evaluator.mjs
 *
 * Zweck: Result-Evaluator-Gate (F7). Importiert klassifiziereLauf direkt aus
 * src/result-evaluator/index.ts (kein zweiter, von Hand nachgebauter
 * Regelsatz, D5-Muster wie F4/F6a): (a) AK4-Grep — kein Codepfad in
 * src/result-evaluator/*.ts (ohne *.test.ts), der ein Ergebnis aus
 * Konsolen-/Fließtext ableitet (.includes(/.match(/.indexOf(/.search(/
 * RegExp-.test(), mit Selbsttest gegen fünf verschiedene simulierte
 * Verstoßformen — je einer pro erfasstem Methodennamen (F-060-Lehre: ein
 * einziger Selbsttestfall deckt Lücken nicht zuverlässig auf); das Lesen
 * von permission_denials ist hier
 * ausdrücklich erlaubt (anders als F6as AK12) — es ist F7s Aufgabe. (b)
 * Fixture-Prüfung: die realen TP-03d/TP-01e-Auszüge (F6as
 * attrappeMitValidemErgebnis/attrappeOhneErgebnisobjekt wörtlich
 * wiederverwendet, D5) laufen durch klassifiziereLauf und liefern das
 * erwartete ergebnis. (c) Ende-zu-Ende-Beleg: RUN_PREPARED (F1B) →
 * klassifiziereLauf schreibt Terminal → stelleLaufstatusFest liefert
 * ABGESCHLOSSEN mit demselben ergebnis — belegt mechanisch, dass F7
 * ausschließlich über F1B schreibt (AK6), kein eigener
 * Wirkungsmarken-Schreibcode.
 *
 * Wird aufgerufen von: `npm run check`, `npm run check:template`
 *
 * Aufruf: node scripts/check-f7-result-evaluator.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { randomUUID } from 'node:crypto'
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { attrappeMitValidemErgebnis, attrappeOhneErgebnisobjekt } from '../src/claude-code-gateway/prozessstart.ts'
import { schreibeWirkungsmarke, sha256Hex, stelleLaufstatusFest } from '../src/checkpoint-store/index.ts'
import { klassifiziereLauf } from '../src/result-evaluator/index.ts'

const befunde = []
const KONTROLLZUSTAND_BASIS = 'kontrollzustand-test'
const ROH_BASIS = join(tmpdir(), `check-f7-${randomUUID()}`)
const PROFIL_REFERENZ = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }

console.log('\n=== F7-Result-Evaluator-Check ===\n')

function neueLaufId(praefix) {
  return `${praefix}-${randomUUID()}`
}

function raeumeKette(laufId) {
  rmSync(join(KONTROLLZUSTAND_BASIS, laufId), { recursive: true, force: true })
}

function schreibeRohstrom(laufId, prozessErgebnis) {
  const verzeichnis = join(ROH_BASIS, laufId)
  mkdirSync(verzeichnis, { recursive: true })
  const inhalt = JSON.stringify(prozessErgebnis)
  const pfad = join(verzeichnis, 'rohstrom.json')
  writeFileSync(pfad, inhalt, 'utf8')
  return { pfad, inhalts_hash: sha256Hex(inhalt) }
}

function baueLaufakte(laufId, rohstromReferenz, beobachtungsbasisVollstaendig) {
  return {
    laufakte_schema: 'v0',
    lauf_id: laufId,
    werkzeug_version_deklariert: '2.1.241',
    berechtigungskontext: 'profil-standard',
    arbeitsverzeichnis_pfad: 'C:\\Users\\stefa\\Projekte\\ai-workforce',
    modell_beobachtet: null,
    beobachtungsbasis_vollstaendig: beobachtungsbasisVollstaendig,
    rohstrom_referenz: rohstromReferenz,
    erstellt_am: new Date().toISOString(),
  }
}

// ─── (a) AK4: kein Codepfad, der ein Ergebnis aus Konsolen-/Fließtext ableitet ──
const resultEvaluatorDir = join('src', 'result-evaluator')
const ak4Muster = /\.(includes|match|indexOf|search|test)\(/
let ak4Verstoss = null
for (const datei of readdirSync(resultEvaluatorDir)) {
  if (!datei.endsWith('.ts') || datei.endsWith('.test.ts')) continue
  const inhalt = readFileSync(join(resultEvaluatorDir, datei), 'utf-8')
  if (ak4Muster.test(inhalt)) {
    ak4Verstoss = datei
    break
  }
}
if (ak4Verstoss !== null) {
  befunde.push(`AK4: verbotenes Muster (Konsolentext-Ableitung) in src/result-evaluator/${ak4Verstoss} gefunden`)
} else {
  console.log('✓ AK4: kein Codepfad in src/result-evaluator/*.ts leitet ein Ergebnis aus Konsolen-/Fließtext ab (permission_denials-Lesen ausdrücklich erlaubt, F7s Aufgabe).')
}
// Selbsttest: das Muster muss mehrere verschiedene simulierte Verstoßformen erkennen (F-060-Lehre — ein einziger Testfall deckt Lücken nicht auf).
const simulierteVerstoesse = [
  "if (stdout.includes('ERFOLGREICH')) { ... }",
  "const treffer = result.match(/ERFOLG/)",
  "if (stdoutText.indexOf('VERWEIGERT') !== -1) { ... }",
  "const istErfolg = /ERFOLG/.test(result)",
  "if (result.search('ERFOLG') !== -1) { ... }",
]
let ak4SelbsttestVerstoss = null
for (const simuliert of simulierteVerstoesse) {
  if (!ak4Muster.test(simuliert)) {
    ak4SelbsttestVerstoss = simuliert
    break
  }
}
if (ak4SelbsttestVerstoss !== null) {
  befunde.push(`AK4-Selbsttest: Muster erkennt eine simulierte Verstoßform NICHT ("${ak4SelbsttestVerstoss}") — Grep-Regel ist wirkungslos`)
} else {
  console.log(`✓ AK4-Selbsttest: alle ${simulierteVerstoesse.length} simulierten Verstoßformen (.includes/.match/.indexOf/RegExp-.test) werden vom Muster erkannt.`)
}

// ─── (b) Fixture-Prüfung: reale TP-03d/TP-01e-Auszüge liefern das erwartete ergebnis ──
const messfall1 = await attrappeMitValidemErgebnis([])
const messfall2Stdout = JSON.stringify({
  type: 'result',
  permission_denials: [
    {
      tool_name: 'WebSearch',
      tool_use_id: 'toolu_015PBDumsC2FBva8TjNrQyTv',
      tool_input: { query: 'example.com "This domain is for use in illustrative examples"' },
    },
  ],
  result: 'Ich habe keinen Zugriff auf ein WebFetch-Tool in dieser Umgebung, und die Nutzung von WebSearch wurde nicht freigegeben.',
})
const messfall3Stdout = JSON.stringify({
  type: 'result',
  permission_denials: [{ tool_name: 'Bash', tool_use_id: 'toolu_01245zrQBLYwK3VjtkruxRWK', tool_input: { command: 'npm run allowlist-redfall-probe' } }],
  result: 'Der Befehl wurde nicht ausgeführt — er benötigt eine explizite Genehmigung, die ich nicht erhalten habe.',
})
const messfallA = await attrappeOhneErgebnisobjekt([])

const fixtureFaelle = [
  { name: 'TP-03d Messfall 1 (permission_denials leer)', prozessErgebnis: messfall1, beobachtungsbasisVollstaendig: true, erwartet: 'ERFOLGREICH' },
  { name: 'TP-03d Messfall 2 (tool_input mit query)', prozessErgebnis: { stdout: messfall2Stdout, stderr: '', exitCode: 0 }, beobachtungsbasisVollstaendig: true, erwartet: 'VERWEIGERT' },
  { name: 'TP-03d Messfall 3 (tool_input mit command, kein Verbotswert)', prozessErgebnis: { stdout: messfall3Stdout, stderr: '', exitCode: 0 }, beobachtungsbasisVollstaendig: true, erwartet: 'VERWEIGERT' },
  { name: 'TP-01e Messfall A (kein Ergebnisobjekt)', prozessErgebnis: messfallA, beobachtungsbasisVollstaendig: false, erwartet: 'FEHLGESCHLAGEN' },
]

for (const fall of fixtureFaelle) {
  const laufId = neueLaufId('fixture')
  try {
    const rohstromReferenz = schreibeRohstrom(laufId, fall.prozessErgebnis)
    const laufakte = baueLaufakte(laufId, rohstromReferenz, fall.beobachtungsbasisVollstaendig)
    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    if (ergebnis.ergebnis !== fall.erwartet) {
      befunde.push(`Fixture '${fall.name}': erwartet ${fall.erwartet}, erhalten ${ergebnis.ergebnis}`)
    } else {
      console.log(`✓ Fixture '${fall.name}': ${ergebnis.ergebnis} wie erwartet.`)
    }
  } finally {
    raeumeKette(laufId)
  }
}

// ─── (c) Ende-zu-Ende: RUN_PREPARED → klassifiziereLauf schreibt Terminal → stelleLaufstatusFest liefert ABGESCHLOSSEN (AK6) ──
const laufIdE2E = neueLaufId('e2e')
try {
  schreibeWirkungsmarke(laufIdE2E, PROFIL_REFERENZ, 'run_prepared', {}, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
  const rohstromReferenz = schreibeRohstrom(laufIdE2E, messfall1)
  const laufakte = baueLaufakte(laufIdE2E, rohstromReferenz, true)
  klassifiziereLauf(laufIdE2E, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
  const status = stelleLaufstatusFest(laufIdE2E, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
  if (status.status !== 'ABGESCHLOSSEN' || status.ergebnis !== 'ERFOLGREICH') {
    befunde.push(`Ende-zu-Ende-Lauf: erwartet ABGESCHLOSSEN/ERFOLGREICH, erhalten ${JSON.stringify(status)}`)
  } else {
    console.log('✓ Ende-zu-Ende-Lauf: RUN_PREPARED → klassifiziereLauf schreibt Terminal über F1B → stelleLaufstatusFest liefert ABGESCHLOSSEN/ERFOLGREICH (AK6).')
  }
} finally {
  raeumeKette(laufIdE2E)
  rmSync(ROH_BASIS, { recursive: true, force: true })
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
