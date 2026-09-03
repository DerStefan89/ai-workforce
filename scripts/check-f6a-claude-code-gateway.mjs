/**
 * Datei: scripts/check-f6a-claude-code-gateway.mjs
 *
 * Zweck: Claude-Code-Gateway-Gate, WS1 + WS2 + WS4 (F6a). Importiert
 * baueAufruf, pruefeUndVerweigereBeiTreffer und validiereLaufakteDaten
 * direkt aus src/claude-code-gateway/index.ts sowie pruefeStartziel und
 * starteProzess direkt aus prozessstart.ts (kein zweiter, von Hand
 * nachgebauter Regelsatz, D5-Muster wie F4): (a) baueAufruf Grün-Fall
 * (erwartetes Tokens-Array); (b) pruefeUndVerweigereBeiTreffer Grün-Fall
 * (unauffällige Tokens); (c) pruefeUndVerweigereBeiTreffer Rot-Fall
 * (verbotener Aufrufparameter); (d) F-048-Fenster-Rot-Fall (mehrwortiger
 * Verbotseintrag im Tokens-Array); (e) LAUFAKTE_V0-Fixture-Validierung
 * gegen validiereLaufakteDaten; (f) AK14-Grep — kein Shell-String-
 * Zusammenbau (F-057) in src/claude-code-gateway/*.ts, mit Selbsttest,
 * dass das Muster einen simulierten Verstoß auch tatsächlich erkennt; (g)
 * AK12-Grep — kein permission_denials-/non_execution_kind-Auswertungscode
 * im Modul (F7-Grenze), analog F4s AC8; (h) Kontrollzustand-Testfixture
 * aufräumen; (i) AK15 — Hygiene-Guard pruefeStartziel: sieben Rot-Fälle
 * einzeln (relativer Pfad; .cmd; .cmd. mit nachgestelltem Punkt; .cmd mit
 * nachgestelltem Leerzeichen; Sperrlisten-Basisname; Verzeichnis statt
 * Datei; leeres Array) und ein Grün-Fall direkt gegen starteProzess mit
 * [process.execPath] und ['-e', 'process.exit(0)'] als Tokens — nicht
 * über starteGateway, dessen raeumeKette hier nur kontrollzustand-test/
 * aufräumt, nicht kontrollzustand-roh/ (plan-v2 Delta 7). AK15 ist
 * ausdrücklich ein Hygiene-Guard, keine Vertrauensgrenze (plan-v2 Delta 3)
 * — die Vertrauensfrage liegt per E2 beim Aufrufer.
 *
 * Wird aufgerufen von: `npm run check`, `npm run check:template`
 *
 * Aufruf: node scripts/check-f6a-claude-code-gateway.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { baueAufruf, pruefeUndVerweigereBeiTreffer, validiereLaufakteDaten } from '../src/claude-code-gateway/index.ts'
import { pruefeStartziel, starteProzess } from '../src/claude-code-gateway/prozessstart.ts'

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

// ─── (e) LAUFAKTE_V0-Fixture-Validierung ───────────────────────────────────
const laufakteFixtures = [
  { pfad: 'schemas/examples/kontrollzustand-laufakte-vollstaendig.valid.json', sollGueltigSein: true },
  { pfad: 'schemas/examples/kontrollzustand-laufakte-unvollstaendig.valid.json', sollGueltigSein: true },
  { pfad: 'schemas/examples/kontrollzustand-laufakte.invalid-falscher-schema-wert.json', sollGueltigSein: false },
  { pfad: 'schemas/examples/kontrollzustand-laufakte.invalid-fehlender-berechtigungskontext.json', sollGueltigSein: false },
  { pfad: 'schemas/examples/kontrollzustand-laufakte.invalid-modell-beobachtet-falscher-typ.json', sollGueltigSein: false },
]
for (const { pfad, sollGueltigSein } of laufakteFixtures) {
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
  const verstoesse = validiereLaufakteDaten(obj)
  if (sollGueltigSein && verstoesse.length > 0) {
    befunde.push(`${pfad}: sollte gültig sein, aber verletzt: ${verstoesse.join('; ')}`)
  }
  if (!sollGueltigSein && verstoesse.length === 0) {
    befunde.push(`${pfad}: sollte ungültig sein, aber keine Regelverletzung gefunden`)
  }
}
if (befunde.length === 0) {
  console.log(`✓ ${laufakteFixtures.length} LAUFAKTE_V0-Payload-Fixture(s) geprüft.`)
}

// ─── (f) AK14: kein Shell-String-Zusammenbau (F-057) ───────────────────────
// Verbietet .join(' ')-artigen Tokens-Zusammenbau, shell:true bei einem
// Prozessstart und den shell-interpretierenden exec(...) (execFile bleibt
// erlaubt und erwünscht — \bexec\( trifft "execFile(" nicht, weil dort kein
// '(' direkt auf 'exec' folgt).
const claudeCodeGatewayDir = join('src', 'claude-code-gateway')
const shellStringMuster = /\.join\(\s*(['"]) \1\s*\)|shell\s*:\s*true|\bexec\(/
let ak14Verstoss = null
for (const datei of readdirSync(claudeCodeGatewayDir)) {
  if (!datei.endsWith('.ts') || datei.endsWith('.test.ts')) continue
  const inhalt = readFileSync(join(claudeCodeGatewayDir, datei), 'utf-8')
  if (shellStringMuster.test(inhalt)) {
    ak14Verstoss = datei
    break
  }
}
if (ak14Verstoss !== null) {
  befunde.push(`AK14: verbotenes Muster (Shell-String-Zusammenbau) in src/claude-code-gateway/${ak14Verstoss} gefunden`)
} else {
  console.log('✓ AK14: kein Shell-String-Zusammenbau in den Produktionsdateien von src/claude-code-gateway/*.ts (F-057) — Prozessstart bleibt ausschließlich Argv-Array.')
}
// Selbsttest: das Muster muss einen simulierten Verstoß tatsächlich erkennen —
// sonst wäre AK14 oben nur scheinbar geprüft.
const simulierterVerstoss = "const cmd = tokens.join(' '); execFileSyncOderSonstwas(cmd)"
if (!shellStringMuster.test(simulierterVerstoss)) {
  befunde.push('AK14-Selbsttest: Muster erkennt einen simulierten Shell-String-Zusammenbau NICHT — Grep-Regel ist wirkungslos')
} else {
  console.log('✓ AK14-Selbsttest: simulierter Shell-String-Zusammenbau wird vom Muster erkannt.')
}

// ─── (g) AK12: kein permission_denials-/non_execution_kind-Auswertungscode (F7-Grenze) ──
// Analog F4s AC8 (scripts/check-f4-invocation-policy.mjs) — mechanisch per
// Grep, kein Nachbau der F7-Logik hier. Ausdrücklich NICHT
// prozessstart.ts: die Attrappen dort (attrappeMitValidemErgebnis)
// reproduzieren state/tp-nachtrag.md wörtlich als reine, nie ausgewertete
// Fixture-Daten (kein Codepfad liest dort .permission_denials) — dieselbe
// Fixture-Ausnahme wie F4s eigener AC8-Kommentar sie für
// invocation-policy.test.ts begründet.
const verbotenesF7Muster = /permission_denials|non_execution_kind/
let ak12Verstoss = null
for (const datei of readdirSync(claudeCodeGatewayDir)) {
  if (!datei.endsWith('.ts') || datei.endsWith('.test.ts') || datei === 'prozessstart.ts') continue
  const inhalt = readFileSync(join(claudeCodeGatewayDir, datei), 'utf-8')
  if (verbotenesF7Muster.test(inhalt)) {
    ak12Verstoss = datei
    break
  }
}
if (ak12Verstoss !== null) {
  befunde.push(`AK12: verbotenes Muster (permission_denials/non_execution_kind) in src/claude-code-gateway/${ak12Verstoss} gefunden`)
} else {
  console.log('✓ AK12: kein permission_denials-/non_execution_kind-Auswertungscode in den Produktionsdateien von src/claude-code-gateway/*.ts — F6a klassifiziert keinen Lauf (F7-Grenze).')
}

// ─── (i) AK15: Hygiene-Guard pruefeStartziel (F6a WS4) ─────────────────────
const ak15RotFaelle = [
  { name: 'relativer Pfad', startziel: ['claude.exe'], erwarteterGrundteil: 'ist kein absoluter Pfad' },
  { name: '.cmd-Endung', startziel: [join(process.cwd(), 'claude.cmd')], erwarteterGrundteil: 'gesperrte Endung' },
  { name: '.cmd. mit nachgestelltem Punkt', startziel: [join(process.cwd(), 'claude.cmd.')], erwarteterGrundteil: 'gesperrte Endung' },
  { name: '.cmd mit nachgestelltem Leerzeichen', startziel: [join(process.cwd(), 'claude.cmd ')], erwarteterGrundteil: 'gesperrte Endung' },
  { name: 'Sperrlisten-Basisname (cmd.exe)', startziel: [join(process.cwd(), 'cmd.exe')], erwarteterGrundteil: 'Shell-Basisnamen-Sperrliste' },
  { name: 'Verzeichnis statt Datei', startziel: [process.cwd()], erwarteterGrundteil: 'ist keine existierende Datei' },
  { name: 'leeres Array', startziel: [], erwarteterGrundteil: 'ist ein leeres Array' },
]
for (const { name, startziel, erwarteterGrundteil } of ak15RotFaelle) {
  const ergebnis = pruefeStartziel(startziel)
  if (ergebnis.ok) {
    befunde.push(`AK15 Rot-Fall '${name}': erwartet ok:false, erhalten ok:true für ${JSON.stringify(startziel)}`)
  } else if (!ergebnis.grund.includes(erwarteterGrundteil)) {
    befunde.push(`AK15 Rot-Fall '${name}': erwartet Grund mit '${erwarteterGrundteil}', erhalten '${ergebnis.grund}'`)
  } else {
    console.log(`✓ AK15 Rot-Fall '${name}': abgelehnt (${ergebnis.grund}).`)
  }
}

// Grün-Fall direkt gegen starteProzess, nicht starteGateway (Delta 7) —
// process.execPath ist eine reale, absolute, endungs- und
// sperrlistenkonforme Datei; kein Claude-Code-Prozess, kein Netz (AK10).
const ak15GruenErgebnis = await starteProzess([process.execPath], ['-e', 'process.exit(0)'])
if (ak15GruenErgebnis.exitCode !== 0 || ak15GruenErgebnis.startfehler !== null) {
  befunde.push(`AK15 Grün-Fall: erwartet exitCode:0 und startfehler:null, erhalten ${JSON.stringify(ak15GruenErgebnis)}`)
} else {
  console.log('✓ AK15 Grün-Fall: starteProzess mit [process.execPath] + [\'-e\', \'process.exit(0)\'] real gestartet, exitCode 0.')
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
