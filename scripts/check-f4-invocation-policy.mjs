/**
 * Datei: scripts/check-f4-invocation-policy.mjs
 *
 * Zweck: Invocation-Policy-Gate (F4). Legt ein Wegwerf-Git-Repo unter einem
 * Temp-Pfad an (.gitattributes: * -text VOR dem ersten Commit, F3-Muster)
 * und prüft pruefeStartbedingung1/pruefeStartbedingung2/pruefeAufrufparameter
 * direkt aus src/invocation-policy/ importiert (kein zweiter, von Hand
 * nachgebauter Regelsatz, D5-Muster): (a) vier Payload-Fixtures unter
 * schemas/examples/kontrollzustand-invocation-policy-*.json gegen
 * validiereBaselineEintrag/validiereWirksamkeitsnachweisEintrag (F5-Muster);
 * (b) Bedingung 1 Grün-Fall + zwei Rot-Fälle (abweichender Schutzskript-Hash,
 * Pfad außerhalb des Repos); (c) Bedingung 2 Grün-Fall + Drift-Fall
 * (F11-Querkonsistenz-Fall — Nachweis mit abweichendem
 * schutzskript_hashes-Eintrag gegenüber demselben, bereits in Bedingung 1
 * verifizierten istZustand); (d) pruefeAufrufparameter Grün-Fall (leere
 * Liste) + Rot-Fall (--dangerously-skip-permissions); (e) AC8-Grep — kein
 * child_process/spawn/exec/execSync in src/invocation-policy/*.ts
 * (F9-Präzedenz); (f) Temp-Pfad aufräumen.
 *
 * Wird aufgerufen von: `npm run check`, `npm run check:template`
 *
 * Aufruf: node scripts/check-f4-invocation-policy.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import {
  pruefeAufrufparameter,
  pruefeStartbedingung1,
  pruefeStartbedingung2,
  validiereBaselineEintrag,
  validiereWirksamkeitsnachweisEintrag,
} from '../src/invocation-policy/index.ts'
import { sha256Hex } from '../src/checkpoint-store/index.ts'

const befunde = []
const KONFIG_INHALT = 'konfig-inhalt'
const SKRIPT_A_INHALT = 'skript-a-inhalt'
const SKRIPT_B_INHALT = 'skript-b-inhalt'
const ISTUEBRIGEFELDER = {
  werkzeug_version_deklariert: '2.1.241',
  berechtigungskontext: 'profil-standard',
  arbeitsverzeichnis_pfad: 'C:\\Users\\stefa\\Projekte\\ai-workforce',
}

console.log('\n=== F4-Invocation-Policy-Check ===\n')

function git(repoWurzel, argumente) {
  return execFileSync('git', argumente, { cwd: repoWurzel, encoding: 'utf8' })
}

function neuesExternesRepo() {
  const repoWurzel = join(tmpdir(), `check-f4-${randomUUID()}`)
  mkdirSync(repoWurzel, { recursive: true })
  git(repoWurzel, ['init', '--quiet'])
  git(repoWurzel, ['config', 'user.email', 'test@example.invalid'])
  git(repoWurzel, ['config', 'user.name', 'Test'])
  writeFileSync(join(repoWurzel, '.gitattributes'), '* -text\n')
  git(repoWurzel, ['add', '.gitattributes'])
  git(repoWurzel, ['commit', '--quiet', '-m', 'init: Zeilenenden pinnen'])
  return repoWurzel
}

function committeBaseline(repoWurzel, baselineId, inhalt) {
  const relativerPfad = `invocation-policy-baseline/${baselineId}.json`
  const zielpfad = join(repoWurzel, relativerPfad)
  mkdirSync(dirname(zielpfad), { recursive: true })
  writeFileSync(zielpfad, inhalt)
  git(repoWurzel, ['add', relativerPfad])
  git(repoWurzel, ['commit', '--quiet', '-m', 'baseline'])
  const commitHash = git(repoWurzel, ['rev-parse', 'HEAD']).trim()
  return { pfad: zielpfad, commit_hash: commitHash, datei_hash: sha256Hex(inhalt) }
}

function gueltigeBaselineInhalt() {
  return JSON.stringify({
    werkzeug_konfiguration: { pfad: '.claude/settings.json', hash: sha256Hex(KONFIG_INHALT) },
    schutzskripte: [
      { pfad: 'skript-a.js', hash: sha256Hex(SKRIPT_A_INHALT) },
      { pfad: 'skript-b.js', hash: sha256Hex(SKRIPT_B_INHALT) },
    ],
  })
}

function gueltigerIstZustand() {
  return {
    werkzeug_konfiguration_hash: sha256Hex(KONFIG_INHALT),
    schutzskript_hashes: [sha256Hex(SKRIPT_A_INHALT), sha256Hex(SKRIPT_B_INHALT)],
  }
}

function gueltigerWirksamkeitsnachweis(istZustand, istUebrigeFelder) {
  return {
    gueltigkeitsschluessel: {
      werkzeug_konfiguration_hash: istZustand.werkzeug_konfiguration_hash,
      schutzskript_hashes: istZustand.schutzskript_hashes,
      werkzeug_version_deklariert: istUebrigeFelder.werkzeug_version_deklariert,
      berechtigungskontext: istUebrigeFelder.berechtigungskontext,
      arbeitsverzeichnis_pfad: istUebrigeFelder.arbeitsverzeichnis_pfad,
    },
    rot_fall_beleg: 'Gate-Skript — kein echter Rot-Fall-Nachweis',
    geprueft_am: new Date().toISOString(),
  }
}

// ─── (a) Vier Payload-Fixtures gegen validiereBaselineEintrag/validiereWirksamkeitsnachweisEintrag ──
const fixtures = [
  { pfad: 'schemas/examples/kontrollzustand-invocation-policy-baseline.valid.json', validiere: validiereBaselineEintrag, sollGueltigSein: true },
  {
    pfad: 'schemas/examples/kontrollzustand-invocation-policy-baseline.invalid-leere-schutzskripte.json',
    validiere: validiereBaselineEintrag,
    sollGueltigSein: false,
  },
  {
    pfad: 'schemas/examples/kontrollzustand-invocation-policy-wirksamkeitsnachweis.valid.json',
    validiere: validiereWirksamkeitsnachweisEintrag,
    sollGueltigSein: true,
  },
  {
    pfad: 'schemas/examples/kontrollzustand-invocation-policy-wirksamkeitsnachweis.invalid-fehlender-rotfallbeleg.json',
    validiere: validiereWirksamkeitsnachweisEintrag,
    sollGueltigSein: false,
  },
]

for (const { pfad, validiere, sollGueltigSein } of fixtures) {
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
  const verstoesse = validiere(obj)
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

const repoWurzel = neuesExternesRepo()

try {
  // ─── (b) pruefeStartbedingung1: Grün-Fall + zwei Rot-Fälle ─────────────
  const baselineReferenz = committeBaseline(repoWurzel, `baseline-${randomUUID()}`, gueltigeBaselineInhalt())
  const istZustand = gueltigerIstZustand()

  const bedingung1Gruen = pruefeStartbedingung1(baselineReferenz, istZustand, { repoWurzel })
  if (!bedingung1Gruen.ok) {
    befunde.push(`Bedingung 1 Grün-Fall: erwartet ok:true, erhalten ${JSON.stringify(bedingung1Gruen)}`)
  } else {
    console.log('✓ Bedingung 1 Grün-Fall: passender istZustand gegen echte, committete Baseline akzeptiert.')
  }

  const istZustandAbweichenderHash = {
    werkzeug_konfiguration_hash: sha256Hex(KONFIG_INHALT),
    schutzskript_hashes: [sha256Hex('skript-a-manipuliert'), sha256Hex(SKRIPT_B_INHALT)],
  }
  const bedingung1RotHash = pruefeStartbedingung1(baselineReferenz, istZustandAbweichenderHash, { repoWurzel })
  if (bedingung1RotHash.ok) {
    befunde.push(`Bedingung 1 Rot-Fall (abweichender Schutzskript-Hash): erwartet ok:false, erhalten ${JSON.stringify(bedingung1RotHash)}`)
  } else {
    console.log(`✓ Bedingung 1 Rot-Fall (abweichender Schutzskript-Hash): abgelehnt (${bedingung1RotHash.grund}).`)
  }

  const baselineReferenzAusserhalb = {
    pfad: join(tmpdir(), 'ausserhalb-des-repos', 'baseline.json'),
    commit_hash: 'a'.repeat(40),
    datei_hash: 'a'.repeat(64),
  }
  const bedingung1RotPfad = pruefeStartbedingung1(baselineReferenzAusserhalb, istZustand, { repoWurzel })
  if (bedingung1RotPfad.ok) {
    befunde.push(`Bedingung 1 Rot-Fall (Pfad außerhalb): erwartet ok:false, erhalten ${JSON.stringify(bedingung1RotPfad)}`)
  } else {
    console.log(`✓ Bedingung 1 Rot-Fall (Pfad außerhalb): abgelehnt (${bedingung1RotPfad.grund}).`)
  }

  // ─── (c) pruefeStartbedingung2: Grün-Fall + Drift-Fall (F11-Querkonsistenz) ──
  const nachweisGruen = gueltigerWirksamkeitsnachweis(istZustand, ISTUEBRIGEFELDER)
  const bedingung2Gruen = pruefeStartbedingung2(nachweisGruen, istZustand, ISTUEBRIGEFELDER)
  if (!bedingung2Gruen.ok) {
    befunde.push(`Bedingung 2 Grün-Fall: erwartet ok:true, erhalten ${JSON.stringify(bedingung2Gruen)}`)
  } else {
    console.log('✓ Bedingung 2 Grün-Fall: Nachweis passt zum Gültigkeitsschlüssel.')
  }

  const nachweisMitVeraltetemHash = gueltigerWirksamkeitsnachweis(istZustand, ISTUEBRIGEFELDER)
  nachweisMitVeraltetemHash.gueltigkeitsschluessel.schutzskript_hashes = [sha256Hex('veralteter-skript-a-inhalt'), sha256Hex(SKRIPT_B_INHALT)]
  const bedingung2Drift = pruefeStartbedingung2(nachweisMitVeraltetemHash, istZustand, ISTUEBRIGEFELDER)
  if (bedingung2Drift.ok) {
    befunde.push(
      `F11-Querkonsistenz-Fall: Bedingung 1 war grün (${JSON.stringify(bedingung1Gruen)}), Bedingung 2 mit veraltetem schutzskript_hashes-Eintrag desselben istZustand erwartet ok:false, erhalten ${JSON.stringify(bedingung2Drift)}`
    )
  } else {
    console.log(`✓ F11-Querkonsistenz-Fall: Bedingung 1 grün, Bedingung 2 lehnt denselben istZustand mit veraltetem Nachweis-Hash ab (${bedingung2Drift.grund}) — kein FREIGEGEBEN trotz grüner Bedingung 1.`)
  }

  // ─── (d) pruefeAufrufparameter: Grün-Fall + Rot-Fall ───────────────────
  const parameterGruen = pruefeAufrufparameter([])
  if (!parameterGruen.ok) {
    befunde.push(`pruefeAufrufparameter Grün-Fall: erwartet ok:true, erhalten ${JSON.stringify(parameterGruen)}`)
  } else {
    console.log('✓ pruefeAufrufparameter Grün-Fall: leere Parameterliste akzeptiert.')
  }

  const parameterRot = pruefeAufrufparameter(['--dangerously-skip-permissions'])
  if (parameterRot.ok) {
    befunde.push(`pruefeAufrufparameter Rot-Fall: erwartet ok:false, erhalten ${JSON.stringify(parameterRot)}`)
  } else {
    console.log(`✓ pruefeAufrufparameter Rot-Fall: '--dangerously-skip-permissions' abgelehnt (${parameterRot.grund}).`)
  }
} finally {
  rmSync(repoWurzel, { recursive: true, force: true })
}

// ─── (e) AC8: kein child_process/spawn/exec/execSync in den Produktionsdateien
// von src/invocation-policy/*.ts. Ausdrücklich NICHT invocation-policy.test.ts:
// AC8 (feature.md) verbietet das Starten "eines Kindprozesses des zu prüfenden
// Werkzeugs" — die Testdatei startet nie das geprüfte Werkzeug, sondern baut
// (wie authorization-boundary.test.ts in F3, andere Modulgrenze, kein eigenes
// AC8-Gate dort) über execFileSync('git', ...) ein Wegwerf-Git-Repo als reine
// Testfixture auf (SCOPE.7-Vorgabe "gleiches Muster wie F3"). Eine ungefilterte
// Grep-Prüfung über *.ts würde diese legitime Fixture fälschlich als Befund
// dieses Gates melden — Executor-Entscheidung, dokumentiert im Bericht.
const invocationPolicyDir = join('src', 'invocation-policy')
const verbotenesMuster = /\b(child_process|spawn|exec|execSync)\b/
let ac8Verstoss = null
for (const datei of readdirSync(invocationPolicyDir)) {
  if (!datei.endsWith('.ts') || datei.endsWith('.test.ts')) continue
  const inhalt = readFileSync(join(invocationPolicyDir, datei), 'utf-8')
  if (verbotenesMuster.test(inhalt)) {
    ac8Verstoss = datei
    break
  }
}
if (ac8Verstoss !== null) {
  befunde.push(`AC8: verbotenes Muster (child_process/spawn/exec/execSync) in src/invocation-policy/${ac8Verstoss} gefunden`)
} else {
  console.log('✓ AC8: kein child_process/spawn/exec/execSync in den Produktionsdateien von src/invocation-policy/*.ts (Testfixture ausgenommen, siehe Kommentar) — F4 startet nie selbst einen Werkzeugprozess.')
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
