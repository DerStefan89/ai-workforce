/**
 * Datei: src/invocation-policy/invocation-policy.test.ts
 *
 * Zweck: node:test-Fälle für die Invocation Policy (F4,
 * state/plan-v2-f4-invocation-policy.md +
 * state/tasks/f4-invocation-policy.md). Deckt AC10 (vier Fälle: gültige
 * Baseline + gültiger Nachweis → FREIGEGEBEN; manipuliertes/fehlendes
 * Schutzskript → ABGELEHNT E-183; Drift im Gültigkeitsschlüssel → ABGELEHNT
 * E-188; verbotener Aufrufparameter → ABGELEHNT E-182), den
 * F11-Querkonsistenz-Pflichtfall (plan-v2 Delta 1) und AC7
 * (verweigereStart → F1Bs schreibeWirkungsmarke real, Beleg über
 * stelleLaufstatusFest, F3-A4-Muster). Gleiches Wegwerf-Git-Repo-Fixture-
 * Muster wie authorization-boundary.test.ts.
 */

import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { schreibeWirkungsmarke, sha256Hex, stelleLaufstatusFest } from '../checkpoint-store/index.ts'
import type { ProfilReferenz } from '../checkpoint-store/types.ts'
import { pruefeAufrufparameter, pruefeStartbedingung1, pruefeStartbedingung2, pruefeStartfreigabe, verweigereStart } from './index.ts'
import type { BaselineReferenz, IstUebrigeFelder, IstZustand, WirksamkeitsnachweisReferenz } from './types.ts'

const KONTROLLZUSTAND_BASIS = 'kontrollzustand-test'
const PROFIL_REFERENZ: ProfilReferenz = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }

const KONFIG_INHALT = 'konfig-inhalt'
const SKRIPT_A_INHALT = 'skript-a-inhalt'
const SKRIPT_B_INHALT = 'skript-b-inhalt'

const ISTUEBRIGEFELDER: IstUebrigeFelder = {
  werkzeug_version_deklariert: '2.1.241',
  berechtigungskontext: 'profil-standard',
  arbeitsverzeichnis_pfad: 'C:\\Users\\stefa\\Projekte\\ai-workforce',
  startziel_pfad: 'C:\\Program Files\\claude\\claude.exe',
}

function neueLaufId(praefix: string): string {
  return `${praefix}-${randomUUID()}`
}

function git(repoWurzel: string, argumente: string[]): string {
  return execFileSync('git', argumente, { cwd: repoWurzel, encoding: 'utf8' })
}

/** Legt ein Wegwerf-Git-Repo mit .gitattributes (* -text) VOR dem ersten Commit an (F3-Muster). */
function neuesExternesRepo(): string {
  const repoWurzel = join(tmpdir(), `f4-invocation-policy-test-${randomUUID()}`)
  mkdirSync(repoWurzel, { recursive: true })
  git(repoWurzel, ['init', '--quiet'])
  git(repoWurzel, ['config', 'user.email', 'test@example.invalid'])
  git(repoWurzel, ['config', 'user.name', 'Test'])
  writeFileSync(join(repoWurzel, '.gitattributes'), '* -text\n')
  git(repoWurzel, ['add', '.gitattributes'])
  git(repoWurzel, ['commit', '--quiet', '-m', 'init: Zeilenenden pinnen'])
  return repoWurzel
}

/** Schreibt und committet eine Baseline-Datei, liefert die passende Referenz. */
function committeBaseline(repoWurzel: string, baselineId: string, inhalt: string): BaselineReferenz {
  const relativerPfad = `invocation-policy-baseline/${baselineId}.json`
  const zielpfad = join(repoWurzel, relativerPfad)
  mkdirSync(dirname(zielpfad), { recursive: true })
  writeFileSync(zielpfad, inhalt)
  git(repoWurzel, ['add', relativerPfad])
  git(repoWurzel, ['commit', '--quiet', '-m', 'baseline'])
  const commitHash = git(repoWurzel, ['rev-parse', 'HEAD']).trim()
  return { pfad: zielpfad, commit_hash: commitHash, datei_hash: sha256Hex(inhalt) }
}

/** Schreibt und committet eine Wirksamkeitsnachweis-Datei, liefert die passende Referenz (F-077/E3). */
function committeWirksamkeitsnachweis(repoWurzel: string, nachweisId: string, inhalt: string): WirksamkeitsnachweisReferenz {
  const relativerPfad = `invocation-policy-wirksamkeitsnachweis/${nachweisId}.json`
  const zielpfad = join(repoWurzel, relativerPfad)
  mkdirSync(dirname(zielpfad), { recursive: true })
  writeFileSync(zielpfad, inhalt)
  git(repoWurzel, ['add', relativerPfad])
  git(repoWurzel, ['commit', '--quiet', '-m', 'wirksamkeitsnachweis'])
  const commitHash = git(repoWurzel, ['rev-parse', 'HEAD']).trim()
  return { pfad: zielpfad, commit_hash: commitHash, datei_hash: sha256Hex(inhalt) }
}

function gueltigeBaselineInhalt(): string {
  return JSON.stringify({
    werkzeug_konfiguration: { pfad: '.claude/settings.json', hash: sha256Hex(KONFIG_INHALT) },
    schutzskripte: [
      { pfad: 'skript-a.js', hash: sha256Hex(SKRIPT_A_INHALT) },
      { pfad: 'skript-b.js', hash: sha256Hex(SKRIPT_B_INHALT) },
    ],
  })
}

function gueltigerIstZustand(): IstZustand {
  return {
    werkzeug_konfiguration_hash: sha256Hex(KONFIG_INHALT),
    schutzskripte: [
      { pfad: 'skript-a.js', hash: sha256Hex(SKRIPT_A_INHALT) },
      { pfad: 'skript-b.js', hash: sha256Hex(SKRIPT_B_INHALT) },
    ],
  }
}

function gueltigerWirksamkeitsnachweis(istZustand: IstZustand, istUebrigeFelder: IstUebrigeFelder) {
  return {
    gueltigkeitsschluessel: {
      werkzeug_konfiguration_hash: istZustand.werkzeug_konfiguration_hash,
      schutzskript_hashes: istZustand.schutzskripte.map((eintrag) => eintrag.hash),
      werkzeug_version_deklariert: istUebrigeFelder.werkzeug_version_deklariert,
      berechtigungskontext: istUebrigeFelder.berechtigungskontext,
      arbeitsverzeichnis_pfad: istUebrigeFelder.arbeitsverzeichnis_pfad,
      startziel_pfad: istUebrigeFelder.startziel_pfad,
    },
    rot_fall_beleg: 'Testfall — kein echter Rot-Fall-Nachweis',
    geprueft_am: new Date().toISOString(),
  }
}

function raeumeKette(laufId: string): void {
  rmSync(join(KONTROLLZUSTAND_BASIS, laufId), { recursive: true, force: true })
}

test('gültige Baseline + gültiger Nachweis liefert FREIGEGEBEN — AC10 Fall 1', () => {
  const repoWurzel = neuesExternesRepo()
  try {
    const baselineReferenz = committeBaseline(repoWurzel, neueLaufId('gruen'), gueltigeBaselineInhalt())
    const istZustand = gueltigerIstZustand()
    const wirksamkeitsnachweisReferenz = committeWirksamkeitsnachweis(
      repoWurzel,
      neueLaufId('nachweis-gruen'),
      JSON.stringify(gueltigerWirksamkeitsnachweis(istZustand, ISTUEBRIGEFELDER))
    )

    const urteil = pruefeStartfreigabe(
      { baselineReferenz, istZustand, wirksamkeitsnachweisReferenz, istUebrigeFelder: ISTUEBRIGEFELDER },
      { repoWurzel }
    )

    assert.strictEqual(urteil.starturteil, 'FREIGEGEBEN')
    assert.ok(urteil.starturteil === 'FREIGEGEBEN')
    assert.strictEqual(urteil.berechtigungskontext, 'profil-standard')
    assert.strictEqual(urteil.werkzeugsatz_begrenzung, 'DEKLARIERT')
  } finally {
    rmSync(repoWurzel, { recursive: true, force: true })
  }
})

test('manipuliertes Schutzskript liefert ABGELEHNT — AC10 Fall 2, E-183', () => {
  const repoWurzel = neuesExternesRepo()
  try {
    const baselineReferenz = committeBaseline(repoWurzel, neueLaufId('rot-e183'), gueltigeBaselineInhalt())
    const istZustandManipuliert: IstZustand = {
      werkzeug_konfiguration_hash: sha256Hex(KONFIG_INHALT),
      schutzskripte: [
        { pfad: 'skript-a.js', hash: sha256Hex('skript-a-manipuliert') },
        { pfad: 'skript-b.js', hash: sha256Hex(SKRIPT_B_INHALT) },
      ],
    }
    const wirksamkeitsnachweisReferenz = committeWirksamkeitsnachweis(
      repoWurzel,
      neueLaufId('nachweis-rot-e183'),
      JSON.stringify(gueltigerWirksamkeitsnachweis(istZustandManipuliert, ISTUEBRIGEFELDER))
    )

    const urteil = pruefeStartfreigabe(
      { baselineReferenz, istZustand: istZustandManipuliert, wirksamkeitsnachweisReferenz, istUebrigeFelder: ISTUEBRIGEFELDER },
      { repoWurzel }
    )

    assert.strictEqual(urteil.starturteil, 'ABGELEHNT')
    assert.ok(urteil.starturteil === 'ABGELEHNT')
    assert.match(urteil.grund, /E-183/)
    assert.strictEqual(urteil.werkzeugsatz_begrenzung, 'DEKLARIERT')
  } finally {
    rmSync(repoWurzel, { recursive: true, force: true })
  }
})

test('Drift im Gültigkeitsschlüssel (arbeitsverzeichnis_pfad) bei sonst gültiger Baseline liefert ABGELEHNT — AC10 Fall 3, E-188', () => {
  const repoWurzel = neuesExternesRepo()
  try {
    const baselineReferenz = committeBaseline(repoWurzel, neueLaufId('rot-e188'), gueltigeBaselineInhalt())
    const istZustand = gueltigerIstZustand()
    const nachweisMitDrift = gueltigerWirksamkeitsnachweis(istZustand, ISTUEBRIGEFELDER)
    nachweisMitDrift.gueltigkeitsschluessel.arbeitsverzeichnis_pfad = 'C:\\ein\\anderes\\verzeichnis'
    const wirksamkeitsnachweisReferenz = committeWirksamkeitsnachweis(repoWurzel, neueLaufId('nachweis-rot-e188'), JSON.stringify(nachweisMitDrift))

    const urteil = pruefeStartfreigabe(
      { baselineReferenz, istZustand, wirksamkeitsnachweisReferenz, istUebrigeFelder: ISTUEBRIGEFELDER },
      { repoWurzel }
    )

    assert.strictEqual(urteil.starturteil, 'ABGELEHNT')
    assert.ok(urteil.starturteil === 'ABGELEHNT')
    assert.match(urteil.grund, /E-188/)
    assert.match(urteil.grund, /arbeitsverzeichnis_pfad/)
  } finally {
    rmSync(repoWurzel, { recursive: true, force: true })
  }
})

test('Drift im Gültigkeitsschlüssel (startziel_pfad) bei sonst gültiger Baseline liefert ABGELEHNT — E-188', () => {
  const repoWurzel = neuesExternesRepo()
  try {
    const baselineReferenz = committeBaseline(repoWurzel, neueLaufId('rot-e188-startziel'), gueltigeBaselineInhalt())
    const istZustand = gueltigerIstZustand()
    const nachweisMitDrift = gueltigerWirksamkeitsnachweis(istZustand, ISTUEBRIGEFELDER)
    nachweisMitDrift.gueltigkeitsschluessel.startziel_pfad = 'C:\\ein\\anderes\\werkzeug.exe'
    const wirksamkeitsnachweisReferenz = committeWirksamkeitsnachweis(repoWurzel, neueLaufId('nachweis-rot-e188-startziel'), JSON.stringify(nachweisMitDrift))

    const urteil = pruefeStartfreigabe(
      { baselineReferenz, istZustand, wirksamkeitsnachweisReferenz, istUebrigeFelder: ISTUEBRIGEFELDER },
      { repoWurzel }
    )

    assert.strictEqual(urteil.starturteil, 'ABGELEHNT')
    assert.ok(urteil.starturteil === 'ABGELEHNT')
    assert.match(urteil.grund, /E-188/)
    assert.match(urteil.grund, /startziel_pfad/)
  } finally {
    rmSync(repoWurzel, { recursive: true, force: true })
  }
})

test('verbotener Aufrufparameter liefert ok:false — AC10 Fall 4, E-182', () => {
  const ergebnisGruen = pruefeAufrufparameter(['--model', 'sonnet'])
  assert.strictEqual(ergebnisGruen.ok, true)

  const ergebnisRot = pruefeAufrufparameter(['--model', 'sonnet', '--dangerously-skip-permissions'])
  assert.strictEqual(ergebnisRot.ok, false)
  assert.match(ergebnisRot.grund ?? '', /E-182/)
})

test('F-048: mehrwortiger Verbotseintrag als Tokens-Array liefert ok:false — E-182', () => {
  const ergebnis = pruefeAufrufparameter(['--permission-mode', 'bypassPermissions'])
  assert.strictEqual(ergebnis.ok, false)
  assert.match(ergebnis.grund ?? '', /E-182/)
  assert.match(ergebnis.grund ?? '', /--permission-mode bypassPermissions/)
})

test('F-048: mehrwortiger Verbotseintrag eingebettet in ein größeres Tokens-Array liefert ok:false — E-182', () => {
  const ergebnis = pruefeAufrufparameter(['--model', 'x', '--permission-mode', 'bypassPermissions', '--output-format', 'json'])
  assert.strictEqual(ergebnis.ok, false)
  assert.match(ergebnis.grund ?? '', /E-182/)
  assert.match(ergebnis.grund ?? '', /--permission-mode bypassPermissions/)
})

test('Querkonsistenz zwischen Bedingung 1 und 2 über denselben istZustand: Nachweis mit abweichendem schutzskript_hashes-Eintrag driftet trotz grüner Bedingung 1 — F11', () => {
  const repoWurzel = neuesExternesRepo()
  try {
    const baselineReferenz = committeBaseline(repoWurzel, neueLaufId('f11'), gueltigeBaselineInhalt())
    const istZustand = gueltigerIstZustand()

    const bedingung1 = pruefeStartbedingung1(baselineReferenz, istZustand, { repoWurzel })
    assert.strictEqual(bedingung1.ok, true)

    const nachweisMitVeraltetemHash = gueltigerWirksamkeitsnachweis(istZustand, ISTUEBRIGEFELDER)
    nachweisMitVeraltetemHash.gueltigkeitsschluessel.schutzskript_hashes = [sha256Hex('veralteter-skript-a-inhalt'), sha256Hex(SKRIPT_B_INHALT)]
    const wirksamkeitsnachweisReferenz = committeWirksamkeitsnachweis(repoWurzel, neueLaufId('f11-nachweis'), JSON.stringify(nachweisMitVeraltetemHash))

    const bedingung2 = pruefeStartbedingung2(wirksamkeitsnachweisReferenz, istZustand, ISTUEBRIGEFELDER, { repoWurzel })
    assert.strictEqual(bedingung2.ok, false)
    assert.ok(!bedingung2.ok)
    assert.match(bedingung2.grund, /schutzskript_hashes/)
  } finally {
    rmSync(repoWurzel, { recursive: true, force: true })
  }
})

test('Wirksamkeitsnachweis-Referenz außerhalb des externen Repos liefert ABGELEHNT — E-188, F-077', () => {
  const repoWurzel = neuesExternesRepo()
  try {
    const istZustand = gueltigerIstZustand()
    const wirksamkeitsnachweisReferenzAusserhalb: WirksamkeitsnachweisReferenz = {
      pfad: join(tmpdir(), 'ausserhalb-des-repos', 'nachweis.json'),
      commit_hash: 'a'.repeat(40),
      datei_hash: 'a'.repeat(64),
    }

    const bedingung2 = pruefeStartbedingung2(wirksamkeitsnachweisReferenzAusserhalb, istZustand, ISTUEBRIGEFELDER, { repoWurzel })
    assert.strictEqual(bedingung2.ok, false)
    assert.ok(!bedingung2.ok)
    assert.match(bedingung2.grund, /ausserhalb/)
  } finally {
    rmSync(repoWurzel, { recursive: true, force: true })
  }
})

test('Wirksamkeitsnachweis in externem Repo ohne pinnende .gitattributes liefert ABGELEHNT — E-188, F-077', () => {
  const repoWurzel = join(tmpdir(), `f4-invocation-policy-test-nogitattr-${randomUUID()}`)
  mkdirSync(repoWurzel, { recursive: true })
  git(repoWurzel, ['init', '--quiet'])
  git(repoWurzel, ['config', 'user.email', 'test@example.invalid'])
  git(repoWurzel, ['config', 'user.name', 'Test'])
  try {
    const istZustand = gueltigerIstZustand()
    const wirksamkeitsnachweisReferenz = committeWirksamkeitsnachweis(
      repoWurzel,
      neueLaufId('nachweis-ohne-gitattributes'),
      JSON.stringify(gueltigerWirksamkeitsnachweis(istZustand, ISTUEBRIGEFELDER))
    )

    const bedingung2 = pruefeStartbedingung2(wirksamkeitsnachweisReferenz, istZustand, ISTUEBRIGEFELDER, { repoWurzel })
    assert.strictEqual(bedingung2.ok, false)
    assert.ok(!bedingung2.ok)
    assert.match(bedingung2.grund, /gitattributes/)
  } finally {
    rmSync(repoWurzel, { recursive: true, force: true })
  }
})

test('Wirksamkeitsnachweis mit abweichendem Arbeitsbaum-Inhalt liefert ABGELEHNT — E-188, F-077', () => {
  const repoWurzel = neuesExternesRepo()
  try {
    const istZustand = gueltigerIstZustand()
    const wirksamkeitsnachweisReferenz = committeWirksamkeitsnachweis(
      repoWurzel,
      neueLaufId('nachweis-arbeitsbaum-abweichung'),
      JSON.stringify(gueltigerWirksamkeitsnachweis(istZustand, ISTUEBRIGEFELDER))
    )
    writeFileSync(wirksamkeitsnachweisReferenz.pfad, JSON.stringify({ manipuliert: true }))

    const bedingung2 = pruefeStartbedingung2(wirksamkeitsnachweisReferenz, istZustand, ISTUEBRIGEFELDER, { repoWurzel })
    assert.strictEqual(bedingung2.ok, false)
    assert.ok(!bedingung2.ok)
    assert.match(bedingung2.grund, /weicht von der Referenz ab/)
  } finally {
    rmSync(repoWurzel, { recursive: true, force: true })
  }
})

test('Wirksamkeitsnachweis-Referenz mit Pfad, der im referenzierten Commit nicht existiert, liefert ABGELEHNT — E-188, F-077', () => {
  const repoWurzel = neuesExternesRepo()
  try {
    const initCommitHash = git(repoWurzel, ['rev-parse', 'HEAD']).trim()
    const istZustand = gueltigerIstZustand()
    const wirksamkeitsnachweisReferenz = committeWirksamkeitsnachweis(
      repoWurzel,
      neueLaufId('nachweis-pfad-fehlt-im-commit'),
      JSON.stringify(gueltigerWirksamkeitsnachweis(istZustand, ISTUEBRIGEFELDER))
    )
    const referenzMitFruehemCommit: WirksamkeitsnachweisReferenz = { ...wirksamkeitsnachweisReferenz, commit_hash: initCommitHash }

    const bedingung2 = pruefeStartbedingung2(referenzMitFruehemCommit, istZustand, ISTUEBRIGEFELDER, { repoWurzel })
    assert.strictEqual(bedingung2.ok, false)
    assert.ok(!bedingung2.ok)
    assert.match(bedingung2.grund, /nicht auffindbar/)
  } finally {
    rmSync(repoWurzel, { recursive: true, force: true })
  }
})

test('Wirksamkeitsnachweis-Datei mit Schema-Verstoß liefert ABGELEHNT — E-188, F-077', () => {
  const repoWurzel = neuesExternesRepo()
  try {
    const istZustand = gueltigerIstZustand()
    const ungueltigerInhalt = JSON.stringify({ gueltigkeitsschluessel: {} })
    const wirksamkeitsnachweisReferenz = committeWirksamkeitsnachweis(repoWurzel, neueLaufId('nachweis-schema-verstoss'), ungueltigerInhalt)

    const bedingung2 = pruefeStartbedingung2(wirksamkeitsnachweisReferenz, istZustand, ISTUEBRIGEFELDER, { repoWurzel })
    assert.strictEqual(bedingung2.ok, false)
    assert.ok(!bedingung2.ok)
    assert.match(bedingung2.grund, /Schema/)
  } finally {
    rmSync(repoWurzel, { recursive: true, force: true })
  }
})

test('vertauschte Schutzskript-Inhalte (Hash-Menge gleich, Pfad-Zuordnung getauscht) liefert ABGELEHNT — F-047', () => {
  const repoWurzel = neuesExternesRepo()
  try {
    const baselineReferenz = committeBaseline(repoWurzel, neueLaufId('rot-swap'), gueltigeBaselineInhalt())
    const istZustandVertauscht: IstZustand = {
      werkzeug_konfiguration_hash: sha256Hex(KONFIG_INHALT),
      schutzskripte: [
        { pfad: 'skript-a.js', hash: sha256Hex(SKRIPT_B_INHALT) },
        { pfad: 'skript-b.js', hash: sha256Hex(SKRIPT_A_INHALT) },
      ],
    }

    const bedingung1 = pruefeStartbedingung1(baselineReferenz, istZustandVertauscht, { repoWurzel })
    assert.strictEqual(bedingung1.ok, false)
    assert.ok(!bedingung1.ok)
    assert.match(bedingung1.grund, /E-183/)
  } finally {
    rmSync(repoWurzel, { recursive: true, force: true })
  }
})

test('verweigereStart nach vorangehender RUN_PREPARED-Marke liefert ABGESCHLOSSEN/VERWEIGERT über F1B — AC7', () => {
  const laufId = neueLaufId('verweigerung')
  try {
    schreibeWirkungsmarke(laufId, PROFIL_REFERENZ, 'run_prepared', {}, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    verweigereStart(laufId, PROFIL_REFERENZ, 'Testfall', { basisVerzeichnis: KONTROLLZUSTAND_BASIS })

    const status = stelleLaufstatusFest(laufId, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.strictEqual(status.status, 'ABGESCHLOSSEN')
    assert.ok(status.status === 'ABGESCHLOSSEN')
    assert.strictEqual(status.ergebnis, 'VERWEIGERT')
  } finally {
    raeumeKette(laufId)
  }
})
