/**
 * Datei: src/execution-controller/execution-controller.test.ts
 *
 * Zweck: node:test-Fälle für den Execution Controller (F8 WS-1,
 * state/tasks/f8-execution-controller-ws1.md). Deckt AK1 (Grün-Durchlauf
 * ruft F5/F6a/F7/F1B je genau einmal), AK2 (F6a-Rot-Fall bricht mit
 * dessen unverändertem Grund ab, kein klassifiziereLauf-Aufruf), den
 * F5-Gegenstück-Rot-Fall (kontextpaket-Abbruch, gleiches Muster wie AK2),
 * AK5 (Terminalstatus nach Grün-Durchlauf) und AK8 (jeder Testfall läuft
 * gegen F6as Prozessstart-Attrappe, kein echter Prozess, kein Netz) ab.
 * AK3/AK9 sind Gate-/Kettenprüfungen, kein Testfall dieser Datei.
 *
 * AK2s Nichtaufruf-Nachweis (kein klassifiziereLauf) prüft NICHT auf
 * Abwesenheit jeder terminal-Wirkungsmarke — F6as eigenes
 * pruefeUndVerweigereBeiTreffer/verweigereStart schreibt bei diesem
 * E-182-Rot-Fall bereits selbst eine (sequenz 1, real belegt, siehe
 * features/F8/journal.md 04.09.2026). Der Beweis liegt in der
 * KETTENLÄNGE: ein zweiter Eintrag (sequenz 2) entstünde nur, wenn F8
 * danach zusätzlich klassifiziereLauf aufriefe — genau das schließt die
 * Assertion aus.
 *
 * "Je genau einmal" (AK1) hat hier keine injizierbare Spy-Stelle wie
 * F6as eigener starter-Parameter — baueKontextpaket/baueAufruf/
 * klassifiziereLauf sind reine Funktionsimporte. Statt eines Modul-Mocks
 * (würde D1 verletzen) wird real belegt: ein zweiter Aufruf von
 * baueKontextpaket/starteGateway würde die jeweilige F2-versionSequenz
 * auf 2 heben (asserted: beide bleiben 1), ein zweiter Aufruf von
 * klassifiziereLauf würde eine zweite Terminalmarke ohne passendes
 * run_prepared hinterlassen (asserted: terminaleOhneRunPrepared bleibt
 * leer). baueAufruf ist laut Abschnitt 0 eine reine, synchrone
 * Konstruktionsfunktion ohne Seiteneffekt; ihr einziger Aufruf im Code
 * ist unbedingt (kein Loop/Zweig) und ihr Ergebnis wird über den
 * AK2-Rot-Fall unten indirekt mitbelegt (derselbe E-182-Grund wie ein
 * direkter Aufruf mit denselben Tokens).
 *
 * Die F4-Startfreigabe-Fixture (Wegwerf-Git-Repo, Baseline,
 * Wirksamkeitsnachweis, Autorisierungsreferenz) ist inhaltlich dasselbe
 * Muster wie claude-code-gateway.test.ts:114 — starteGateway prüft real,
 * kein Ersatzcode hier. Der Ist-Zustand wird über F4s ermittleIstZustand
 * direkt ermittelt (Entscheidung Stefan, 04.09.2026: AK3-Grep erhält
 * dieselbe *.test.ts-Ausnahme wie AK1, siehe features/F8/journal.md) —
 * keine handgebaute Parallelrechnung mehr.
 */

import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { attrappeMitValidemErgebnis } from '../claude-code-gateway/prozessstart.ts'
import { baueAufruf, starteGateway } from '../claude-code-gateway/index.ts'
import type { Starter } from '../claude-code-gateway/types.ts'
import { baueKontextpaket } from '../context-builder/index.ts'
import { istWirkungsmarkePayload, ladeGueltigeCheckpoints, sha256Hex } from '../checkpoint-store/index.ts'
import type { ProfilReferenz } from '../checkpoint-store/types.ts'
import { ermittleIstZustand } from '../invocation-policy/index.ts'
import { ladeArtefaktVersion } from '../lineage-registry/index.ts'
import { fuehreAufgabeDurch } from './index.ts'
import type { AusfuehrungsEingaben } from './types.ts'

const KONTROLLZUSTAND_BASIS = 'kontrollzustand-test'
const PROFIL_REFERENZ: ProfilReferenz = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
const GUELTIGES_STARTZIEL = [process.execPath]

function neueLaufId(praefix: string): string {
  return `${praefix}-${randomUUID()}`
}

function raeumeKette(laufId: string): void {
  rmSync(join(KONTROLLZUSTAND_BASIS, laufId), { recursive: true, force: true })
  rmSync(join(KONTROLLZUSTAND_BASIS, `lineage-kontextpaket-${laufId}`), { recursive: true, force: true })
  rmSync(join(KONTROLLZUSTAND_BASIS, `lineage-laufakte-${laufId}`), { recursive: true, force: true })
  rmSync(join('kontrollzustand-roh', laufId), { recursive: true, force: true })
}

function gueltigeEingaben(uebrigeFelder: { werkzeug_version_deklariert: string; berechtigungskontext: string }): AusfuehrungsEingaben {
  return {
    rolle: 'ausfuehrung',
    anfragen: [{ pfad: 'test/anfrage.md', frage: 'Testfrage', begruendung: 'Testbegruendung', inhalt: 'Testinhalt', notwendig: true }],
    budget: {},
    aufrufEingaben: { modell: 'sonnet', werkzeugsatz: { modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Read'] } },
    werkzeugStartziel: GUELTIGES_STARTZIEL,
    werkzeugVersionDeklariert: uebrigeFelder.werkzeug_version_deklariert,
    berechtigungskontext: uebrigeFelder.berechtigungskontext,
  }
}

// ─── F4-Startfreigabe-Fixture (siehe Kopfkommentar) ─────────────────────────

function git(repoWurzel: string, argumente: string[]): string {
  return execFileSync('git', argumente, { cwd: repoWurzel, encoding: 'utf8' })
}

function neuesExternesRepo(): string {
  const repoWurzel = join(tmpdir(), `f8-controller-test-${randomUUID()}`)
  mkdirSync(repoWurzel, { recursive: true })
  git(repoWurzel, ['init', '--quiet'])
  git(repoWurzel, ['config', 'user.email', 'test@example.invalid'])
  git(repoWurzel, ['config', 'user.name', 'Test'])
  writeFileSync(join(repoWurzel, '.gitattributes'), '* -text\n')
  git(repoWurzel, ['add', '.gitattributes'])
  git(repoWurzel, ['commit', '--quiet', '-m', 'init: Zeilenenden pinnen'])
  return repoWurzel
}

function committeDatei(repoWurzel: string, relativerPfad: string, inhalt: string): { pfad: string; commit_hash: string; datei_hash: string } {
  const zielpfad = join(repoWurzel, relativerPfad)
  mkdirSync(dirname(zielpfad), { recursive: true })
  writeFileSync(zielpfad, inhalt)
  git(repoWurzel, ['add', relativerPfad])
  git(repoWurzel, ['commit', '--quiet', '-m', relativerPfad])
  const commitHash = git(repoWurzel, ['rev-parse', 'HEAD']).trim()
  return { pfad: zielpfad, commit_hash: commitHash, datei_hash: sha256Hex(inhalt) }
}

const STARTFREIGABE_REPO = neuesExternesRepo()

const PROJEKT_VERZEICHNIS = join(tmpdir(), `f8-controller-projekt-${randomUUID()}`)
const HOOK_INHALT = 'hook-inhalt-fixture'
mkdirSync(join(PROJEKT_VERZEICHNIS, '.claude', 'hooks'), { recursive: true })
writeFileSync(join(PROJEKT_VERZEICHNIS, '.claude', 'hooks', 'guard.js'), HOOK_INHALT)
const SETTINGS_PFAD = join(PROJEKT_VERZEICHNIS, '.claude', 'settings.json')
const SETTINGS_INHALT = JSON.stringify({
  hooks: { PreToolUse: [{ matcher: 'Edit', hooks: [{ type: 'command', command: 'node .claude/hooks/guard.js' }] }] },
})
writeFileSync(SETTINGS_PFAD, SETTINGS_INHALT)

const ISTUEBRIGEFELDER_FIXTURE = {
  werkzeug_version_deklariert: '2.1.241',
  berechtigungskontext: 'profil-standard',
  arbeitsverzeichnis_pfad: process.cwd(),
  startziel_pfad: GUELTIGES_STARTZIEL[0],
}

const ISTZUSTAND_FIXTURE = ermittleIstZustand(SETTINGS_PFAD)
const WERKZEUG_KONFIGURATION_HASH = ISTZUSTAND_FIXTURE.werkzeug_konfiguration_hash
const SCHUTZSKRIPTE = ISTZUSTAND_FIXTURE.schutzskripte

const BASELINE_REFERENZ = committeDatei(
  STARTFREIGABE_REPO,
  'invocation-policy-baseline/gueltig.json',
  JSON.stringify({
    werkzeug_konfiguration: { pfad: '.claude/settings.json', hash: WERKZEUG_KONFIGURATION_HASH },
    schutzskripte: SCHUTZSKRIPTE,
  })
)

function nachweisInhalt(uebrigeFelder: typeof ISTUEBRIGEFELDER_FIXTURE): string {
  return JSON.stringify({
    gueltigkeitsschluessel: {
      werkzeug_konfiguration_hash: WERKZEUG_KONFIGURATION_HASH,
      schutzskript_hashes: SCHUTZSKRIPTE.map((eintrag) => eintrag.hash),
      werkzeug_version_deklariert: uebrigeFelder.werkzeug_version_deklariert,
      berechtigungskontext: uebrigeFelder.berechtigungskontext,
      arbeitsverzeichnis_pfad: uebrigeFelder.arbeitsverzeichnis_pfad,
      startziel_pfad: uebrigeFelder.startziel_pfad,
    },
    rot_fall_beleg: 'Testfall — kein echter Rot-Fall-Nachweis',
    geprueft_am: new Date().toISOString(),
  })
}

const WIRKSAMKEITSNACHWEIS_REFERENZ = committeDatei(
  STARTFREIGABE_REPO,
  'invocation-policy-wirksamkeitsnachweis/gueltig.json',
  nachweisInhalt(ISTUEBRIGEFELDER_FIXTURE)
)

const AUTORISIERUNGSREFERENZ_PFAD = join(PROJEKT_VERZEICHNIS, 'autorisierungsreferenz.json')
writeFileSync(AUTORISIERUNGSREFERENZ_PFAD, JSON.stringify({ baselineReferenz: BASELINE_REFERENZ, wirksamkeitsnachweisReferenz: WIRKSAMKEITSNACHWEIS_REFERENZ }))

after(() => {
  rmSync(STARTFREIGABE_REPO, { recursive: true, force: true })
  rmSync(PROJEKT_VERZEICHNIS, { recursive: true, force: true })
})

function startfreigabeOptionen() {
  return {
    settingsPfad: SETTINGS_PFAD,
    aktuelleAutorisierungPfad: AUTORISIERUNGSREFERENZ_PFAD,
    startfreigabeRepoWurzel: STARTFREIGABE_REPO,
  }
}

// ─── AK1/AK5/AK8: Grün-Durchlauf ─────────────────────────────────────────────

test('AK1/AK5/AK8: Grün-Durchlauf ruft F5/F6a/F7/F1B je genau einmal und liefert ABGESCHLOSSEN mit dem F7-Ergebnis', async () => {
  const laufId = neueLaufId('gruen')
  try {
    const ergebnis = await fuehreAufgabeDurch(laufId, PROFIL_REFERENZ, gueltigeEingaben(ISTUEBRIGEFELDER_FIXTURE), {
      ...startfreigabeOptionen(),
      basisVerzeichnis: KONTROLLZUSTAND_BASIS,
      rohBasisVerzeichnis: 'kontrollzustand-roh',
      starter: attrappeMitValidemErgebnis,
      schreiber: () => {},
    })

    assert.strictEqual(ergebnis.ok, true)
    assert.ok(ergebnis.ok)
    assert.strictEqual(ergebnis.klassifikation.ergebnis, 'ERFOLGREICH')
    assert.strictEqual(ergebnis.laufStatus.status, 'ABGESCHLOSSEN')
    assert.ok(ergebnis.laufStatus.status === 'ABGESCHLOSSEN')
    assert.strictEqual(ergebnis.laufStatus.ergebnis, ergebnis.klassifikation.ergebnis)
    // Kein Doppelaufruf: FIFO-Paarung ohne Waisen bedeutet genau ein
    // run_prepared (starteGateway) und genau ein terminal (klassifiziereLauf).
    assert.strictEqual(ergebnis.laufStatus.terminaleOhneRunPrepared.length, 0)

    // Kein Doppelaufruf von baueKontextpaket/starteGateway: F2-versionSequenz
    // bliebe bei einem zweiten Aufruf nicht bei 1.
    const kontextpaketVersion = ladeArtefaktVersion(`kontextpaket-${laufId}`, undefined, { basisVerzeichnis: KONTROLLZUSTAND_BASIS, schreiber: () => {} })
    assert.ok(kontextpaketVersion)
    assert.strictEqual(kontextpaketVersion.versionSequenz, 1)
    const laufakteVersion = ladeArtefaktVersion(`laufakte-${laufId}`, undefined, { basisVerzeichnis: KONTROLLZUSTAND_BASIS, schreiber: () => {} })
    assert.ok(laufakteVersion)
    assert.strictEqual(laufakteVersion.versionSequenz, 1)
  } finally {
    raeumeKette(laufId)
  }
})

// ─── AK2/AK8: F6a-Rot-Fall ────────────────────────────────────────────────────

test('AK2/AK8: F6a-Rot-Fall bricht mit dem unveränderten Gateway-Grund ab, kein klassifiziereLauf-Aufruf', async () => {
  const laufId = neueLaufId('rot')
  const referenzLaufId = `${laufId}-referenz`
  let starterAufgerufen = false
  const spyStarter: Starter = async (startziel, tokens) => {
    starterAufgerufen = true
    return attrappeMitValidemErgebnis(startziel, tokens)
  }
  try {
    const eingaben = gueltigeEingaben(ISTUEBRIGEFELDER_FIXTURE)
    // Verbotener Aufrufparameter (E-182) über die Werkzeugliste eingeschleust
    // — baueAufruf reicht erlaubte_werkzeuge unverändert in --tools/--allowedTools durch.
    eingaben.aufrufEingaben = { modell: 'sonnet', werkzeugsatz: { modus: 'DEKLARIERT', erlaubte_werkzeuge: ['--dangerously-skip-permissions'] } }

    // Unabhängiger Referenzaufruf mit identischen Eingaben (eigene laufId,
    // damit er die zu prüfende Kette nicht mitbeschreibt): beweist
    // Grund-Identität über die Modulgrenze hinweg, nicht nur Inhaltsähnlichkeit.
    const referenzTokens = baueAufruf(eingaben.aufrufEingaben)
    const referenzErgebnis = await starteGateway(
      {
        laufId: referenzLaufId,
        profilReferenz: PROFIL_REFERENZ,
        tokens: referenzTokens,
        werkzeugStartziel: eingaben.werkzeugStartziel,
        werkzeugVersionDeklariert: eingaben.werkzeugVersionDeklariert,
        berechtigungskontext: eingaben.berechtigungskontext,
      },
      { basisVerzeichnis: KONTROLLZUSTAND_BASIS, schreiber: () => {} }
    )
    assert.strictEqual(referenzErgebnis.ok, false)
    assert.ok(!referenzErgebnis.ok)

    // Kein Startfreigabe-Fixture nötig — pruefeUndVerweigereBeiTreffer lehnt
    // die Tokens vor jeder F4-Prüfung ab (E-182, Ablauf laut Abschnitt 0/2.1).
    const ergebnis = await fuehreAufgabeDurch(laufId, PROFIL_REFERENZ, eingaben, {
      basisVerzeichnis: KONTROLLZUSTAND_BASIS,
      rohBasisVerzeichnis: 'kontrollzustand-roh',
      starter: spyStarter,
      schreiber: () => {},
    })

    assert.strictEqual(starterAufgerufen, false, 'starteProzess darf bei Verweigerung nie aufgerufen werden')
    assert.strictEqual(ergebnis.ok, false)
    assert.ok(!ergebnis.ok)
    assert.ok(ergebnis.stufe === 'gateway')
    // Grund-Identität statt Teilstring-Ähnlichkeit: derselbe Wert, den
    // starteGateway unabhängig mit denselben Eingaben liefert.
    assert.strictEqual(ergebnis.grund, referenzErgebnis.grund)

    // kein klassifiziereLauf-Aufruf: die Kette trägt nur die eine
    // terminal-Wirkungsmarke, die F6as eigenes verweigereStart bereits vor
    // jeder F8-Beteiligung schreibt (sequenz 1) — kein zweiter Eintrag
    // (sequenz 2), der nur bei einem zusätzlichen klassifiziereLauf-Aufruf
    // entstünde. Siehe Kopfkommentar.
    const kette = ladeGueltigeCheckpoints(laufId, { basisVerzeichnis: KONTROLLZUSTAND_BASIS, schreiber: () => {} })
    const terminalEintraege = kette.filter((eintrag) => eintrag.typ === 'wirkungsmarke' && istWirkungsmarkePayload(eintrag.payload) && eintrag.payload.art === 'terminal')
    assert.strictEqual(terminalEintraege.length, 1)
  } finally {
    raeumeKette(laufId)
    raeumeKette(referenzLaufId)
  }
})

// ─── F5-Gegenstück zu AK2: kontextpaket-Rot-Fall ─────────────────────────────

test('F5-Abbruchzweig: kontextpaket-Rot-Fall bricht sofort ab, Grund unverändert durchgereicht, kein Starter-Aufruf, keine Laufakte', async () => {
  const laufId = neueLaufId('kontextpaket-rot')
  let starterAufgerufen = false
  const spyStarter: Starter = async (startziel, tokens) => {
    starterAufgerufen = true
    return attrappeMitValidemErgebnis(startziel, tokens)
  }
  try {
    const eingaben = gueltigeEingaben(ISTUEBRIGEFELDER_FIXTURE)
    eingaben.rolle = 'unbekannte-rolle-fixture'

    // Unabhängiger Referenzaufruf mit identischen Eingaben — Grund-Identität
    // wie im AK2-Rot-Fall (Muster oben), hier für F5s Ablehnung.
    const referenzErgebnis = baueKontextpaket(laufId, eingaben.rolle, eingaben.anfragen, PROFIL_REFERENZ, eingaben.budget, {
      basisVerzeichnis: KONTROLLZUSTAND_BASIS,
      schreiber: () => {},
    })
    assert.strictEqual(referenzErgebnis.ok, false)

    const ergebnis = await fuehreAufgabeDurch(laufId, PROFIL_REFERENZ, eingaben, {
      basisVerzeichnis: KONTROLLZUSTAND_BASIS,
      rohBasisVerzeichnis: 'kontrollzustand-roh',
      starter: spyStarter,
      schreiber: () => {},
    })

    assert.strictEqual(starterAufgerufen, false, 'starteProzess darf beim F5-Abbruch nie aufgerufen werden')
    assert.strictEqual(ergebnis.ok, false)
    assert.ok(!ergebnis.ok)
    assert.ok(ergebnis.stufe === 'kontextpaket')
    assert.deepStrictEqual(ergebnis.ergebnis, referenzErgebnis)

    const laufakteVersion = ladeArtefaktVersion(`laufakte-${laufId}`, undefined, { basisVerzeichnis: KONTROLLZUSTAND_BASIS, schreiber: () => {} })
    assert.strictEqual(laufakteVersion, null)
  } finally {
    raeumeKette(laufId)
  }
})
