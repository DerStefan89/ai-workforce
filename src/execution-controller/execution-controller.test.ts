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
 *
 * WS-2a (state/tasks/f8-execution-controller-ws2a.md) ergänzt AK4/AK6 und
 * den Delta-1-Wurfpfad. Die beiden neuen Starter-Attrappen erzeugen
 * VERWEIGERT mit bypass_verdacht_anzahl 1 bzw. 0 (Vertrag SCOPE Punkt 5,
 * einmal vorab im Test 'Attrappen-Vorprüfung' belegt, F-103-Muster). Der
 * Delta-1-Wurftest löst den Wurf über einen realen Vorbedingungsbruch aus
 * (F9s erzeugeTransportpaket, human-transport/index.ts:114-117): ein
 * schreiber-Hook löscht das gerade von erfasseBedarf geschriebene
 * BEDARF_V0-Lineage-Verzeichnis unmittelbar nach dessen
 * 'lineage_registriert'-Ereignis, sodass der nachfolgende
 * erzeugeTransportpaket-Aufruf die Version real nicht mehr findet — kein
 * Modul-Mock (D1), reine Filesystem-Manipulation über den ohnehin
 * öffentlichen optionen.schreiber-Injektionspunkt.
 *
 * F-109 (Windows-Pfadlänge): alle WS-2a-Test-laufIds verwenden ein Präfix
 * von höchstens 4 Zeichen (Vertrag SCOPE Punkt 5).
 *
 * WS-2b (state/tasks/f8-execution-controller-ws2b.md) ergänzt AK7: die
 * KLAERUNG_ERFORDERLICH-Fixture ruft starteGateway direkt auf und lässt
 * klassifiziereLauf bewusst aus, damit ein offenes run_prepared stehen
 * bleibt; die FEHLGESCHLAGEN-Fixture nutzt die bestehende F6a-Attrappe
 * attrappeOhneErgebnisobjekt über einen echten fuehreAufgabeDurch-Lauf.
 * Beide AK7-positiv-Fälle prüfen den Lineage-Verweis gegen die real
 * geladene Vorgänger-Laufakte (AK6-2-Muster) und belegen die Isolation
 * des Vorgängerlaufs über einen echten Vorher/Nachher-Vergleich statt
 * einer Grep-Prüfung über die mehrzeilige starteGateway-Aufrufstelle
 * (Vertrag SCOPE Punkt 4, Begründung SCOPE Punkt 4/OUTPUT).
 */

import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { attrappeMitValidemErgebnis, attrappeOhneErgebnisobjekt } from '../claude-code-gateway/prozessstart.ts'
import { baueAufruf, starteGateway } from '../claude-code-gateway/index.ts'
import type { Starter } from '../claude-code-gateway/types.ts'
import { baueKontextpaket } from '../context-builder/index.ts'
import { istWirkungsmarkePayload, kanonischesJson, ladeGueltigeCheckpoints, sha256Hex, stelleLaufstatusFest } from '../checkpoint-store/index.ts'
import type { ProfilReferenz } from '../checkpoint-store/types.ts'
import { erfasseBedarf, erzeugeTransportpaket, haendigeAus } from '../human-transport/index.ts'
import { ermittleIstZustand } from '../invocation-policy/index.ts'
import { ladeArtefaktVersion } from '../lineage-registry/index.ts'
import { klassifiziereLauf } from '../result-evaluator/index.ts'
import { fuehreAufgabeDurch } from './index.ts'
import type { AusfuehrungsEingaben } from './types.ts'

const KONTROLLZUSTAND_BASIS = 'kontrollzustand-test'
const PROFIL_REFERENZ: ProfilReferenz = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
const GUELTIGES_STARTZIEL = [process.execPath]

function neueLaufId(praefix: string): string {
  return `${praefix}-${randomUUID()}`
}

function raeumeKette(laufId: string, eskLaufId?: string, vorgaengerLaufId?: string): void {
  rmSync(join(KONTROLLZUSTAND_BASIS, laufId), { recursive: true, force: true })
  rmSync(join(KONTROLLZUSTAND_BASIS, `lineage-kontextpaket-${laufId}`), { recursive: true, force: true })
  rmSync(join(KONTROLLZUSTAND_BASIS, `lineage-laufakte-${laufId}`), { recursive: true, force: true })
  rmSync(join('kontrollzustand-roh', laufId), { recursive: true, force: true })
  if (eskLaufId !== undefined) {
    rmSync(join(KONTROLLZUSTAND_BASIS, eskLaufId), { recursive: true, force: true })
    rmSync(join(KONTROLLZUSTAND_BASIS, `lineage-bedarf-${eskLaufId}`), { recursive: true, force: true })
    rmSync(join(KONTROLLZUSTAND_BASIS, `lineage-transport-${eskLaufId}`), { recursive: true, force: true })
  }
  // WS-2b (AK7): der Lineage-Verweis liest lineage-laufakte-<vorgaengerLaufId>
  // nur, erzeugt aber keinen neuen Eintrag darunter — trotzdem hier
  // benennbar, damit ein Aufrufer die volle Kette in einem Aufruf aufräumen
  // kann, statt raeumeKette(vorgaengerLaufId) separat zu benötigen.
  if (vorgaengerLaufId !== undefined) {
    rmSync(join(KONTROLLZUSTAND_BASIS, `lineage-laufakte-${vorgaengerLaufId}`), { recursive: true, force: true })
  }
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

// ─── WS-2a: AK4/AK6, Delta 1 ──────────────────────────────────────────────

/** VERWEIGERT-Attrappe (kein bisheriges Fixture erzeugt diese Klassifikation, siehe Vertrag CONTEXT): ein permission_denials-Eintrag mit dem übergebenen command, sonst identisch zu attrappeMitValidemErgebnis geformt (TP-03d-Muster). */
function attrappeVerweigertMitCommand(command: string): Starter {
  return async (_startziel, _tokens) => ({
    stdout: JSON.stringify({
      type: 'result',
      permission_denials: [{ tool_input: { command } }],
      result: 'Verweigert (Testfixture, WS-2a)',
    }),
    stderr: '',
    exitCode: 0,
    startfehler: null,
  })
}

/** (a): verbotener Aufrufparameter (E-182) im tool_input.command → bypass_verdacht_anzahl 1. */
const attrappeVerweigertBypass1 = attrappeVerweigertMitCommand('claude --dangerously-skip-permissions')
/** (b): unauffälliger command → bypass_verdacht_anzahl 0. */
const attrappeVerweigertBypass0 = attrappeVerweigertMitCommand('ls -la')

test('Attrappen-Vorprüfung: attrappeVerweigertBypass1/-0 erzeugen wirklich VERWEIGERT mit bypass_verdacht_anzahl 1 bzw. 0', async () => {
  const laufIdA = neueLaufId('avpa')
  const laufIdB = neueLaufId('avpb')
  try {
    const eingaben = gueltigeEingaben(ISTUEBRIGEFELDER_FIXTURE)

    const gatewayA = await starteGateway(
      {
        laufId: laufIdA,
        profilReferenz: PROFIL_REFERENZ,
        tokens: baueAufruf(eingaben.aufrufEingaben),
        werkzeugStartziel: eingaben.werkzeugStartziel,
        werkzeugVersionDeklariert: eingaben.werkzeugVersionDeklariert,
        berechtigungskontext: eingaben.berechtigungskontext,
      },
      { ...startfreigabeOptionen(), basisVerzeichnis: KONTROLLZUSTAND_BASIS, rohBasisVerzeichnis: 'kontrollzustand-roh', starter: attrappeVerweigertBypass1, schreiber: () => {} }
    )
    assert.strictEqual(gatewayA.ok, true)
    assert.ok(gatewayA.ok)
    const klassifikationA = klassifiziereLauf(laufIdA, PROFIL_REFERENZ, { laufakte: gatewayA.laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS, schreiber: () => {} })
    assert.strictEqual(klassifikationA.ergebnis, 'VERWEIGERT')
    assert.ok(klassifikationA.ergebnis === 'VERWEIGERT')
    assert.strictEqual(klassifikationA.bypass_verdacht_anzahl, 1, 'attrappeVerweigertBypass1 muss real bypass_verdacht_anzahl 1 erzeugen')

    const gatewayB = await starteGateway(
      {
        laufId: laufIdB,
        profilReferenz: PROFIL_REFERENZ,
        tokens: baueAufruf(eingaben.aufrufEingaben),
        werkzeugStartziel: eingaben.werkzeugStartziel,
        werkzeugVersionDeklariert: eingaben.werkzeugVersionDeklariert,
        berechtigungskontext: eingaben.berechtigungskontext,
      },
      { ...startfreigabeOptionen(), basisVerzeichnis: KONTROLLZUSTAND_BASIS, rohBasisVerzeichnis: 'kontrollzustand-roh', starter: attrappeVerweigertBypass0, schreiber: () => {} }
    )
    assert.strictEqual(gatewayB.ok, true)
    assert.ok(gatewayB.ok)
    const klassifikationB = klassifiziereLauf(laufIdB, PROFIL_REFERENZ, { laufakte: gatewayB.laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS, schreiber: () => {} })
    assert.strictEqual(klassifikationB.ergebnis, 'VERWEIGERT')
    assert.ok(klassifikationB.ergebnis === 'VERWEIGERT')
    assert.strictEqual(klassifikationB.bypass_verdacht_anzahl, 0, 'attrappeVerweigertBypass0 muss real bypass_verdacht_anzahl 0 erzeugen')
  } finally {
    raeumeKette(laufIdA)
    raeumeKette(laufIdB)
  }
})

test('AK4-positiv: VERWEIGERT mit bypass_verdacht_anzahl > 0 eskaliert real über F9 unter eigener laufId', async () => {
  const laufId = neueLaufId('ak4p')
  let eskLaufId: string | undefined
  try {
    const ergebnis = await fuehreAufgabeDurch(laufId, PROFIL_REFERENZ, gueltigeEingaben(ISTUEBRIGEFELDER_FIXTURE), {
      ...startfreigabeOptionen(),
      basisVerzeichnis: KONTROLLZUSTAND_BASIS,
      rohBasisVerzeichnis: 'kontrollzustand-roh',
      starter: attrappeVerweigertBypass1,
      schreiber: () => {},
    })

    assert.strictEqual(ergebnis.ok, true)
    assert.ok(ergebnis.ok)
    assert.ok(ergebnis.eskalation !== undefined, 'eskalation muss bei bypass_verdacht_anzahl > 0 gesetzt sein')
    eskLaufId = ergebnis.eskalation.laufId
    assert.notStrictEqual(eskLaufId, laufId, 'Eskalations-laufId muss vom auslösenden Lauf verschieden sein')
    // F-091 auch über den realen fuehreAufgabeDurch-Rückgabepfad belegt
    // (nicht nur über die manuelle Nachbildung im AK6-Testfall) — Schritt 5
    // (stelleLaufstatusFest(laufId)) muss den auslösenden Lauf betreffen,
    // nicht die Eskalation (Reviewer-/QA-Pass, code-reviewer + qa, 04.09.2026).
    assert.strictEqual(ergebnis.laufStatus.status, 'ABGESCHLOSSEN')
    assert.ok(ergebnis.laufStatus.status === 'ABGESCHLOSSEN')
    assert.strictEqual(ergebnis.laufStatus.ergebnis, 'VERWEIGERT')

    const bedarfVersion = ladeArtefaktVersion(`bedarf-${eskLaufId}`, undefined, { basisVerzeichnis: KONTROLLZUSTAND_BASIS, schreiber: () => {} })
    assert.ok(bedarfVersion !== null, 'BEDARF_V0 der Eskalation muss real über F9 geschrieben worden sein')
  } finally {
    raeumeKette(laufId, eskLaufId)
  }
})

test('AK4-negativ: VERWEIGERT mit bypass_verdacht_anzahl === 0 eskaliert nicht', async () => {
  const laufId = neueLaufId('ak4n')
  try {
    const ergebnis = await fuehreAufgabeDurch(laufId, PROFIL_REFERENZ, gueltigeEingaben(ISTUEBRIGEFELDER_FIXTURE), {
      ...startfreigabeOptionen(),
      basisVerzeichnis: KONTROLLZUSTAND_BASIS,
      rohBasisVerzeichnis: 'kontrollzustand-roh',
      starter: attrappeVerweigertBypass0,
      schreiber: () => {},
    })

    assert.strictEqual(ergebnis.ok, true)
    assert.ok(ergebnis.ok)
    assert.strictEqual(ergebnis.klassifikation.ergebnis, 'VERWEIGERT')
    assert.ok(ergebnis.klassifikation.ergebnis === 'VERWEIGERT')
    assert.strictEqual(ergebnis.klassifikation.bypass_verdacht_anzahl, 0)
    assert.strictEqual(ergebnis.eskalation, undefined, 'keine Eskalation bei bypass_verdacht_anzahl === 0')

    // Nichtaufruf-Nachweis ohne Vakuum-Assertion (F-103): Verzeichnisscan
    // statt eines Vergleichs gegen eine (unbekannte) Eskalations-laufId —
    // die eskLaufId trägt randomUUID (D3) und ist bei Nichtaufruf nie
    // beobachtbar. Kalibriert (Bedingung > 0 testweise auf >= 0 gesetzt,
    // siehe Bericht): mit der Kalibrierung liefert dieser Scan einen
    // Treffer und die folgende Assertion wird rot.
    const eskalationsPraefix = `lineage-bedarf-${laufId}-eskalation-`
    const vorhandeneEintraege = existsSync(KONTROLLZUSTAND_BASIS) ? readdirSync(KONTROLLZUSTAND_BASIS) : []
    const gefundeneEskalationsArtefakte = vorhandeneEintraege.filter((eintrag) => eintrag.startsWith(eskalationsPraefix))
    assert.deepStrictEqual(gefundeneEskalationsArtefakte, [], 'kein bedarf-*-Artefakt unter einer von laufId abgeleiteten Eskalations-ID')
  } finally {
    raeumeKette(laufId)
  }
})

test('AK6 (F-091): E-186-Eskalation unter eigener laufId lässt stelleLaufstatusFest(ausloesenderLaufId) vor und nach unverändert ABGESCHLOSSEN/VERWEIGERT', async () => {
  const laufId = neueLaufId('ak6')
  let eskLaufId: string | undefined
  try {
    const eingaben = gueltigeEingaben(ISTUEBRIGEFELDER_FIXTURE)
    const f9Optionen = { basisVerzeichnis: KONTROLLZUSTAND_BASIS, schreiber: () => {} }

    // Schritte 1-4 (F5→F6a→F7) direkt nachvollzogen, nicht über
    // fuehreAufgabeDurch — dessen Rückkehr liegt bereits NACH der
    // Eskalation, die "vorher"-Assertion braucht einen eigenen,
    // unabhängigen Zwischenstand (Vertrag SCOPE Punkt 5).
    const kontextpaketErgebnis = baueKontextpaket(laufId, eingaben.rolle, eingaben.anfragen, PROFIL_REFERENZ, eingaben.budget, f9Optionen)
    assert.ok(kontextpaketErgebnis.ok)
    const gatewayErgebnis = await starteGateway(
      {
        laufId,
        profilReferenz: PROFIL_REFERENZ,
        tokens: baueAufruf(eingaben.aufrufEingaben),
        werkzeugStartziel: eingaben.werkzeugStartziel,
        werkzeugVersionDeklariert: eingaben.werkzeugVersionDeklariert,
        berechtigungskontext: eingaben.berechtigungskontext,
      },
      { ...startfreigabeOptionen(), ...f9Optionen, rohBasisVerzeichnis: 'kontrollzustand-roh', starter: attrappeVerweigertBypass1 }
    )
    assert.strictEqual(gatewayErgebnis.ok, true)
    assert.ok(gatewayErgebnis.ok)
    const klassifikation = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte: gatewayErgebnis.laufakte }, f9Optionen)
    assert.strictEqual(klassifikation.ergebnis, 'VERWEIGERT')
    assert.ok(klassifikation.ergebnis === 'VERWEIGERT')
    assert.strictEqual(klassifikation.bypass_verdacht_anzahl, 1)

    // AK6-1, "vorher": eigener, direkter Aufruf.
    const laufStatusVorher = stelleLaufstatusFest(laufId, f9Optionen)
    assert.strictEqual(laufStatusVorher.status, 'ABGESCHLOSSEN')
    assert.ok(laufStatusVorher.status === 'ABGESCHLOSSEN')
    assert.strictEqual(laufStatusVorher.ergebnis, 'VERWEIGERT')

    // WS-2a-Eskalation, manuell nachvollzogen (Vertrag SCOPE Punkt 4).
    eskLaufId = `${laufId}-eskalation-${randomUUID()}`
    const beschreibung = `E-186-Eskalation: Lauf ${laufId} wurde VERWEIGERT mit bypass_verdacht_anzahl ${klassifikation.bypass_verdacht_anzahl}. Menschliche Prüfung der Genehmigungsverweigerungen erforderlich.`
    const { versionSequenz: bedarfVersionSequenz } = erfasseBedarf(
      eskLaufId,
      PROFIL_REFERENZ,
      beschreibung,
      [
        {
          pfad: `artefakt:laufakte-${laufId}`,
          zitierter_bereich: `LAUFAKTE_V0 versionSequenz ${gatewayErgebnis.versionSequenz}, bypass_verdacht_anzahl ${klassifikation.bypass_verdacht_anzahl}`,
          inhalts_hash: sha256Hex(kanonischesJson(gatewayErgebnis.laufakte)),
        },
      ],
      f9Optionen
    )
    erzeugeTransportpaket(eskLaufId, PROFIL_REFERENZ, bedarfVersionSequenz, kanonischesJson(gatewayErgebnis.laufakte), 'mensch', f9Optionen)
    haendigeAus(eskLaufId, PROFIL_REFERENZ, f9Optionen)

    // AK6-1, "nachher".
    const laufStatusNachher = stelleLaufstatusFest(laufId, f9Optionen)
    assert.strictEqual(laufStatusNachher.status, 'ABGESCHLOSSEN')
    assert.ok(laufStatusNachher.status === 'ABGESCHLOSSEN')
    assert.strictEqual(laufStatusNachher.ergebnis, 'VERWEIGERT')

    // AK6-2 (Lineage) — gegen die real geladene Laufakte, nicht gegen
    // einen im Test nachgebauten Wert.
    const realeLaufakteVersion = ladeArtefaktVersion(`laufakte-${laufId}`, undefined, f9Optionen)
    assert.ok(realeLaufakteVersion !== null)
    const bedarfVersion = ladeArtefaktVersion(`bedarf-${eskLaufId}`, undefined, f9Optionen)
    assert.ok(bedarfVersion !== null)
    assert.strictEqual(bedarfVersion.eingaben.length, 1)
    assert.strictEqual(bedarfVersion.eingaben[0].pfad, `artefakt:laufakte-${laufId}`)
    assert.strictEqual(bedarfVersion.eingaben[0].inhalts_hash, sha256Hex(kanonischesJson(realeLaufakteVersion.daten)))

    // AK6-3: die Eskalation selbst wartet auf eine menschliche Antwort.
    const eskLaufStatus = stelleLaufstatusFest(eskLaufId, f9Optionen)
    assert.strictEqual(eskLaufStatus.status, 'KLAERUNG_ERFORDERLICH')
  } finally {
    raeumeKette(laufId, eskLaufId)
  }
})

test('Delta 1 (Wurf): ein Wurf in erzeugeTransportpaket propagiert unverändert, ausloesender Lauf bleibt ABGESCHLOSSEN', async () => {
  const laufId = neueLaufId('esk')
  let hookAusgeloest = false
  const werferSchreiber = (...args: unknown[]): void => {
    const ereignis = args[0]
    if (typeof ereignis !== 'object' || ereignis === null) return
    const rec = ereignis as Record<string, unknown>
    if (rec.ereignis !== 'lineage_registriert' || typeof rec.artefakt_id !== 'string') return
    const artefaktId = rec.artefakt_id
    if (!artefaktId.startsWith('bedarf-') || !artefaktId.includes('-eskalation-')) return
    // Realer Vorbedingungsbruch (D1, kein Modul-Mock): das gerade
    // geschriebene BEDARF_V0-Lineage-Verzeichnis wird sofort wieder
    // entfernt, sodass erzeugeTransportpaket die Version nicht mehr
    // findet und real wirft (human-transport/index.ts:114-117).
    rmSync(join(KONTROLLZUSTAND_BASIS, `lineage-${artefaktId}`), { recursive: true, force: true })
    hookAusgeloest = true
  }
  try {
    const promise = fuehreAufgabeDurch(laufId, PROFIL_REFERENZ, gueltigeEingaben(ISTUEBRIGEFELDER_FIXTURE), {
      ...startfreigabeOptionen(),
      basisVerzeichnis: KONTROLLZUSTAND_BASIS,
      rohBasisVerzeichnis: 'kontrollzustand-roh',
      starter: attrappeVerweigertBypass1,
      schreiber: werferSchreiber,
    })
    await assert.rejects(promise, /BEDARF_V0 'bedarf-.+' Version \d+ nicht gefunden/)
    assert.strictEqual(hookAusgeloest, true, 'Kalibrierung: der Schreiber-Hook muss real ausgelöst worden sein, sonst beweist der Wurf keinen echten Vorbedingungsbruch')

    const laufStatusNachWurf = stelleLaufstatusFest(laufId, { basisVerzeichnis: KONTROLLZUSTAND_BASIS, schreiber: () => {} })
    assert.strictEqual(laufStatusNachWurf.status, 'ABGESCHLOSSEN')
    assert.ok(laufStatusNachWurf.status === 'ABGESCHLOSSEN')
    assert.strictEqual(laufStatusNachWurf.ergebnis, 'VERWEIGERT')
  } finally {
    raeumeKette(laufId)
  }
})

// ─── WS-2b: AK7 ──────────────────────────────────────────────────────────

test('AK7-positiv-A (KLAERUNG_ERFORDERLICH): Wiederaufnahme erhält Lineage-Verweis auf den Vorgängerlauf, dieser bleibt unverändert', async () => {
  const vorgaengerLaufId = neueLaufId('k7a')
  const laufId = `${vorgaengerLaufId}-retry-1`
  try {
    const eingaben = gueltigeEingaben(ISTUEBRIGEFELDER_FIXTURE)

    // Fixture "Vorgängerlauf KLAERUNG_ERFORDERLICH" (Vertrag SCOPE Punkt 3):
    // starteGateway direkt aufgerufen, klassifiziereLauf bewusst nicht
    // aufgerufen — offene run_prepared bleibt stehen.
    const vorgaengerGateway = await starteGateway(
      {
        laufId: vorgaengerLaufId,
        profilReferenz: PROFIL_REFERENZ,
        tokens: baueAufruf(eingaben.aufrufEingaben),
        werkzeugStartziel: eingaben.werkzeugStartziel,
        werkzeugVersionDeklariert: eingaben.werkzeugVersionDeklariert,
        berechtigungskontext: eingaben.berechtigungskontext,
      },
      { ...startfreigabeOptionen(), basisVerzeichnis: KONTROLLZUSTAND_BASIS, rohBasisVerzeichnis: 'kontrollzustand-roh', starter: attrappeMitValidemErgebnis, schreiber: () => {} }
    )
    assert.strictEqual(vorgaengerGateway.ok, true)
    assert.ok(vorgaengerGateway.ok)

    const vorherStatus = stelleLaufstatusFest(vorgaengerLaufId, { basisVerzeichnis: KONTROLLZUSTAND_BASIS, schreiber: () => {} })
    assert.strictEqual(vorherStatus.status, 'KLAERUNG_ERFORDERLICH')

    const retryEingaben: AusfuehrungsEingaben = { ...gueltigeEingaben(ISTUEBRIGEFELDER_FIXTURE), vorgaengerLaufId }
    const ergebnis = await fuehreAufgabeDurch(laufId, PROFIL_REFERENZ, retryEingaben, {
      ...startfreigabeOptionen(),
      basisVerzeichnis: KONTROLLZUSTAND_BASIS,
      rohBasisVerzeichnis: 'kontrollzustand-roh',
      starter: attrappeMitValidemErgebnis,
      schreiber: () => {},
    })
    assert.strictEqual(ergebnis.ok, true)
    assert.ok(ergebnis.ok)

    // Gegen die real geladene Vorgänger-Laufakte, nicht gegen einen im Test
    // nachgebauten Wert (AK6-2-Muster).
    const vorgaengerLaufakteVersion = ladeArtefaktVersion(`laufakte-${vorgaengerLaufId}`, undefined, { basisVerzeichnis: KONTROLLZUSTAND_BASIS, schreiber: () => {} })
    assert.ok(vorgaengerLaufakteVersion !== null)

    const kontextpaketVersion = ladeArtefaktVersion(`kontextpaket-${laufId}`, undefined, { basisVerzeichnis: KONTROLLZUSTAND_BASIS, schreiber: () => {} })
    assert.ok(kontextpaketVersion !== null)
    // Index [0], nicht .find(): SCOPE Punkt 2 verlangt wörtlich "vorangestellt"
    // (plan-v1 Abschnitt 2.3) — eine künftige Umkehrung auf Anhängen soll hier rot werden.
    const lineageEintrag = kontextpaketVersion.eingaben[0]
    assert.ok(lineageEintrag !== undefined, 'Kontextpaket-Eingaben sind leer — Lineage-Verweis auf den Vorgängerlauf fehlt')
    assert.strictEqual(lineageEintrag.pfad, `artefakt:laufakte-${vorgaengerLaufId}`, 'Lineage-Verweis muss der Anfragenliste vorangestellt sein (erstes Element)')
    assert.strictEqual(lineageEintrag.inhalts_hash, sha256Hex(kanonischesJson(vorgaengerLaufakteVersion.daten)))

    // Isolationsnachweis (F-091-Muster): echter Vorher/Nachher-Vergleich
    // statt einer Grep-Prüfung über die mehrzeilige starteGateway-Aufrufstelle.
    const nachherStatus = stelleLaufstatusFest(vorgaengerLaufId, { basisVerzeichnis: KONTROLLZUSTAND_BASIS, schreiber: () => {} })
    assert.strictEqual(nachherStatus.status, 'KLAERUNG_ERFORDERLICH', 'Vorgängerlauf muss nach der Wiederaufnahme unverändert KLAERUNG_ERFORDERLICH bleiben')
  } finally {
    raeumeKette(laufId, undefined, vorgaengerLaufId)
    raeumeKette(vorgaengerLaufId)
  }
})

test('AK7-positiv-B (FEHLGESCHLAGEN): Wiederaufnahme erhält Lineage-Verweis auf den Vorgängerlauf, dieser bleibt unverändert', async () => {
  const vorgaengerLaufId = neueLaufId('k7b')
  const laufId = `${vorgaengerLaufId}-retry-1`
  try {
    // Vorgängerlauf real bis zum Abschluss durchlaufen (bestehende F6a-
    // Attrappe attrappeOhneErgebnisobjekt, TP-01e Messfall A) — erzeugt real
    // FEHLGESCHLAGEN (result-evaluator.test.ts, grund beobachtungsbasis_unvollstaendig).
    const vorgaengerErgebnis = await fuehreAufgabeDurch(vorgaengerLaufId, PROFIL_REFERENZ, gueltigeEingaben(ISTUEBRIGEFELDER_FIXTURE), {
      ...startfreigabeOptionen(),
      basisVerzeichnis: KONTROLLZUSTAND_BASIS,
      rohBasisVerzeichnis: 'kontrollzustand-roh',
      starter: attrappeOhneErgebnisobjekt,
      schreiber: () => {},
    })
    assert.strictEqual(vorgaengerErgebnis.ok, true)
    assert.ok(vorgaengerErgebnis.ok)
    assert.strictEqual(vorgaengerErgebnis.laufStatus.status, 'ABGESCHLOSSEN')
    assert.ok(vorgaengerErgebnis.laufStatus.status === 'ABGESCHLOSSEN')
    assert.strictEqual(vorgaengerErgebnis.laufStatus.ergebnis, 'FEHLGESCHLAGEN')

    const vorherStatus = stelleLaufstatusFest(vorgaengerLaufId, { basisVerzeichnis: KONTROLLZUSTAND_BASIS, schreiber: () => {} })
    assert.strictEqual(vorherStatus.status, 'ABGESCHLOSSEN')
    assert.ok(vorherStatus.status === 'ABGESCHLOSSEN')
    assert.strictEqual(vorherStatus.ergebnis, 'FEHLGESCHLAGEN')

    const retryEingaben: AusfuehrungsEingaben = { ...gueltigeEingaben(ISTUEBRIGEFELDER_FIXTURE), vorgaengerLaufId }
    const ergebnis = await fuehreAufgabeDurch(laufId, PROFIL_REFERENZ, retryEingaben, {
      ...startfreigabeOptionen(),
      basisVerzeichnis: KONTROLLZUSTAND_BASIS,
      rohBasisVerzeichnis: 'kontrollzustand-roh',
      starter: attrappeMitValidemErgebnis,
      schreiber: () => {},
    })
    assert.strictEqual(ergebnis.ok, true)
    assert.ok(ergebnis.ok)

    const vorgaengerLaufakteVersion = ladeArtefaktVersion(`laufakte-${vorgaengerLaufId}`, undefined, { basisVerzeichnis: KONTROLLZUSTAND_BASIS, schreiber: () => {} })
    assert.ok(vorgaengerLaufakteVersion !== null)

    const kontextpaketVersion = ladeArtefaktVersion(`kontextpaket-${laufId}`, undefined, { basisVerzeichnis: KONTROLLZUSTAND_BASIS, schreiber: () => {} })
    assert.ok(kontextpaketVersion !== null)
    // Index [0], nicht .find(): SCOPE Punkt 2 verlangt wörtlich "vorangestellt"
    // (plan-v1 Abschnitt 2.3) — eine künftige Umkehrung auf Anhängen soll hier rot werden.
    const lineageEintrag = kontextpaketVersion.eingaben[0]
    assert.ok(lineageEintrag !== undefined, 'Kontextpaket-Eingaben sind leer — Lineage-Verweis auf den Vorgängerlauf fehlt')
    assert.strictEqual(lineageEintrag.pfad, `artefakt:laufakte-${vorgaengerLaufId}`, 'Lineage-Verweis muss der Anfragenliste vorangestellt sein (erstes Element)')
    assert.strictEqual(lineageEintrag.inhalts_hash, sha256Hex(kanonischesJson(vorgaengerLaufakteVersion.daten)))

    const nachherStatus = stelleLaufstatusFest(vorgaengerLaufId, { basisVerzeichnis: KONTROLLZUSTAND_BASIS, schreiber: () => {} })
    assert.strictEqual(nachherStatus.status, 'ABGESCHLOSSEN')
    assert.ok(nachherStatus.status === 'ABGESCHLOSSEN')
    assert.strictEqual(nachherStatus.ergebnis, 'FEHLGESCHLAGEN', 'Vorgängerlauf muss nach der Wiederaufnahme unverändert FEHLGESCHLAGEN bleiben')
  } finally {
    raeumeKette(laufId, undefined, vorgaengerLaufId)
    raeumeKette(vorgaengerLaufId)
  }
})

test('Vorbedingungsverstoß: vorgaengerLaufId ohne existierende Laufakte wirft mit der laufId im Fehlertext', async () => {
  const laufId = neueLaufId('k7v')
  const nieExistierendeVorgaengerLaufId = neueLaufId('k7ne')
  try {
    const eingaben: AusfuehrungsEingaben = { ...gueltigeEingaben(ISTUEBRIGEFELDER_FIXTURE), vorgaengerLaufId: nieExistierendeVorgaengerLaufId }
    await assert.rejects(
      fuehreAufgabeDurch(laufId, PROFIL_REFERENZ, eingaben, {
        ...startfreigabeOptionen(),
        basisVerzeichnis: KONTROLLZUSTAND_BASIS,
        rohBasisVerzeichnis: 'kontrollzustand-roh',
        starter: attrappeMitValidemErgebnis,
        schreiber: () => {},
      }),
      (error: unknown) => error instanceof Error && error.message.includes(nieExistierendeVorgaengerLaufId)
    )
  } finally {
    raeumeKette(laufId)
    raeumeKette(nieExistierendeVorgaengerLaufId)
  }
})
