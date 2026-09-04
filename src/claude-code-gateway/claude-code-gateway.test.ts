/**
 * Datei: src/claude-code-gateway/claude-code-gateway.test.ts
 *
 * Zweck: node:test-Fälle für das Claude-Code-Gateway (F6a WS1 + WS2 + WS4,
 * state/tasks/f6a-claude-code-gateway-ws1.md,
 * state/tasks/f6a-ws2-prozessstart.md,
 * state/tasks/f6a-ws4-windows-prozessstart.md). WS1 deckt baueAufruf
 * (Grünfall, Wurf ohne modell) und pruefeUndVerweigereBeiTreffer
 * (Grünfall, Rot-Fall mit realem verweigereStart-Aufruf über F1Bs
 * schreibeWirkungsmarke, Beleg über stelleLaufstatusFest — Muster wie F4s
 * eigener AC7-Test — sowie der F-048-Fenster-Rot-Fall). WS2 deckt
 * starteGateway gegen die TP-03d/TP-01e-Attrappen aus prozessstart.ts
 * (Erfolg, Verweigerung durch WS1s Check ohne Prozessstart, Abbruch ohne
 * Ergebnisobjekt, F2-Registrierung) — kein echter Prozessstart, kein Netz
 * (AK10). WS4 deckt pruefeStartziel (AK15-Guard, Grün-/Rot-Fälle je Regel)
 * und starteProzess (Guard vor optionen.starter, plattformunabhängiger
 * NUL-Byte-Auslöser statt des Windows-only-EINVAL-Falls). Alle Attrappen
 * und Spies sind explizit zweiparametrig (startziel, tokens) — ein
 * Ein-Parameter-Callback würde nach dem WS4-Signaturwechsel still am
 * falschen Argument binden (Delta 10).
 */

import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { schreibeWirkungsmarke, sha256Hex, stelleLaufstatusFest } from '../checkpoint-store/index.ts'
import type { ProfilReferenz } from '../checkpoint-store/types.ts'
import { ermittleIstZustand } from '../invocation-policy/index.ts'
import { ladeArtefaktVersion } from '../lineage-registry/index.ts'
import { baueAufruf, leseModellBeobachtet, pruefeUndVerweigereBeiTreffer, starteGateway } from './index.ts'
import { attrappeMitValidemErgebnis, attrappeOhneErgebnisobjekt, pruefeStartziel, starteProzess } from './prozessstart.ts'
import type { AufrufEingaben, GatewayEingaben, ProzessErgebnis, Starter } from './types.ts'

const KONTROLLZUSTAND_BASIS = 'kontrollzustand-test'
const PROFIL_REFERENZ: ProfilReferenz = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
/** Real existierende, absolute, endungs- und sperrlistenkonforme Datei — besteht pruefeStartziel ohne Sonderfall (F6a WS4). */
const GUELTIGES_STARTZIEL = [process.execPath]

function neueLaufId(praefix: string): string {
  return `${praefix}-${randomUUID()}`
}

function raeumeKette(laufId: string): void {
  rmSync(join(KONTROLLZUSTAND_BASIS, laufId), { recursive: true, force: true })
  rmSync(join(KONTROLLZUSTAND_BASIS, `lineage-laufakte-${laufId}`), { recursive: true, force: true })
  rmSync(join('kontrollzustand-roh', laufId), { recursive: true, force: true })
}

function gueltigeEingaben(): AufrufEingaben {
  return { modell: 'sonnet', werkzeugsatz: { modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Read', 'Grep'] } }
}

// ─── F4-Startfreigabe-Fixture (F6b WS-G): starteGateway ruft ab jetzt bei
// jedem Aufruf real pruefeStartfreigabe auf — jeder starteGateway-Test
// braucht deshalb eine zu istUebrigeFelder/istZustand passende Baseline +
// einen passenden Wirksamkeitsnachweis in einem Wegwerf-Git-Repo (Muster
// invocation-policy.test.ts), plus eine Attrappen-Referenzdatei
// (aktuelle-autorisierung.json), einmal modul-weit aufgebaut und über
// startfreigabeOptionen() an jeden starteGateway-Aufruf gereicht. ───────────

function git(repoWurzel: string, argumente: string[]): string {
  return execFileSync('git', argumente, { cwd: repoWurzel, encoding: 'utf8' })
}

function neuesExternesRepo(): string {
  const repoWurzel = join(tmpdir(), `f6a-gateway-test-${randomUUID()}`)
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

// Wegwerf-"Projektverzeichnis" mit eigenem .claude/settings.json + Hook —
// GENAU das misst ermittleIstZustand, unabhängig vom echten Repo dieses
// Prozesses (dessen .claude/settings.json/Hooks sich ändern könnten, ohne
// dass dieser Test mitziehen soll).
const PROJEKT_VERZEICHNIS = join(tmpdir(), `f6a-gateway-projekt-${randomUUID()}`)
const HOOK_INHALT = 'hook-inhalt-fixture'
mkdirSync(join(PROJEKT_VERZEICHNIS, '.claude', 'hooks'), { recursive: true })
writeFileSync(join(PROJEKT_VERZEICHNIS, '.claude', 'hooks', 'guard.js'), HOOK_INHALT)
const SETTINGS_PFAD = join(PROJEKT_VERZEICHNIS, '.claude', 'settings.json')
writeFileSync(
  SETTINGS_PFAD,
  JSON.stringify({ hooks: { PreToolUse: [{ matcher: 'Edit', hooks: [{ type: 'command', command: 'node .claude/hooks/guard.js' }] }] } })
)

const ISTUEBRIGEFELDER_FIXTURE = {
  werkzeug_version_deklariert: '2.1.241',
  berechtigungskontext: 'profil-standard',
  arbeitsverzeichnis_pfad: process.cwd(),
  startziel_pfad: GUELTIGES_STARTZIEL[0],
}

const ISTZUSTAND_FIXTURE = ermittleIstZustand(SETTINGS_PFAD)

const BASELINE_REFERENZ = committeDatei(
  STARTFREIGABE_REPO,
  'invocation-policy-baseline/gueltig.json',
  JSON.stringify({
    werkzeug_konfiguration: { pfad: '.claude/settings.json', hash: ISTZUSTAND_FIXTURE.werkzeug_konfiguration_hash },
    schutzskripte: ISTZUSTAND_FIXTURE.schutzskripte,
  })
)

function nachweisInhalt(istUebrigeFelder: typeof ISTUEBRIGEFELDER_FIXTURE): string {
  return JSON.stringify({
    gueltigkeitsschluessel: {
      werkzeug_konfiguration_hash: ISTZUSTAND_FIXTURE.werkzeug_konfiguration_hash,
      schutzskript_hashes: ISTZUSTAND_FIXTURE.schutzskripte.map((eintrag) => eintrag.hash),
      werkzeug_version_deklariert: istUebrigeFelder.werkzeug_version_deklariert,
      berechtigungskontext: istUebrigeFelder.berechtigungskontext,
      arbeitsverzeichnis_pfad: istUebrigeFelder.arbeitsverzeichnis_pfad,
      startziel_pfad: istUebrigeFelder.startziel_pfad,
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

const AKTUELLE_AUTORISIERUNG_PFAD = join(PROJEKT_VERZEICHNIS, 'aktuelle-autorisierung.json')
writeFileSync(
  AKTUELLE_AUTORISIERUNG_PFAD,
  JSON.stringify({ baselineReferenz: BASELINE_REFERENZ, wirksamkeitsnachweisReferenz: WIRKSAMKEITSNACHWEIS_REFERENZ })
)

// Zweite, mit ISTUEBRIGEFELDER_FIXTURE NICHT übereinstimmende Referenzdatei
// (E-188-Drift bei sonst gültiger Baseline) für den ABGELEHNT-Rot-Fall.
const NACHWEIS_MIT_DRIFT_REFERENZ = committeDatei(
  STARTFREIGABE_REPO,
  'invocation-policy-wirksamkeitsnachweis/drift.json',
  nachweisInhalt({ ...ISTUEBRIGEFELDER_FIXTURE, berechtigungskontext: 'ein-anderes-profil' })
)
const AKTUELLE_AUTORISIERUNG_MIT_DRIFT_PFAD = join(PROJEKT_VERZEICHNIS, 'aktuelle-autorisierung-drift.json')
writeFileSync(
  AKTUELLE_AUTORISIERUNG_MIT_DRIFT_PFAD,
  JSON.stringify({ baselineReferenz: BASELINE_REFERENZ, wirksamkeitsnachweisReferenz: NACHWEIS_MIT_DRIFT_REFERENZ })
)

// Valides JSON, aber falsche Form (kein baselineReferenz/wirksamkeitsnachweisReferenz
// mit den erwarteten String-Feldern) — deckt die Formprüfung in
// leseAktuelleAutorisierung ab, nicht nur "Datei fehlt".
const AKTUELLE_AUTORISIERUNG_FALSCHE_FORM_PFAD = join(PROJEKT_VERZEICHNIS, 'aktuelle-autorisierung-falsche-form.json')
writeFileSync(AKTUELLE_AUTORISIERUNG_FALSCHE_FORM_PFAD, JSON.stringify({ baselineReferenz: {}, wirksamkeitsnachweisReferenz: null }))

after(() => {
  rmSync(STARTFREIGABE_REPO, { recursive: true, force: true })
  rmSync(PROJEKT_VERZEICHNIS, { recursive: true, force: true })
})

function startfreigabeOptionen() {
  return {
    settingsPfad: SETTINGS_PFAD,
    aktuelleAutorisierungPfad: AKTUELLE_AUTORISIERUNG_PFAD,
    startfreigabeRepoWurzel: STARTFREIGABE_REPO,
  }
}

function gueltigeGatewayEingaben(laufId: string): GatewayEingaben {
  return {
    laufId,
    profilReferenz: PROFIL_REFERENZ,
    tokens: baueAufruf(gueltigeEingaben()),
    werkzeugStartziel: GUELTIGES_STARTZIEL,
    werkzeugVersionDeklariert: ISTUEBRIGEFELDER_FIXTURE.werkzeug_version_deklariert,
    berechtigungskontext: ISTUEBRIGEFELDER_FIXTURE.berechtigungskontext,
  }
}

test('baueAufruf liefert das erwartete Tokens-Array — Grünfall', () => {
  const tokens = baueAufruf(gueltigeEingaben())
  assert.deepStrictEqual(tokens, [
    '--model',
    'sonnet',
    '--output-format',
    'json',
    '--setting-sources',
    'project',
    '--tools',
    'Read,Grep',
    '--allowedTools',
    'Read,Grep',
  ])
})

test('baueAufruf wirft ohne modell', () => {
  const eingaben = { modell: '', werkzeugsatz: { modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Read'] } } as AufrufEingaben
  assert.throws(() => baueAufruf(eingaben))
})

test('pruefeUndVerweigereBeiTreffer liefert ok:true bei unauffälligen Tokens — Grünfall', () => {
  const tokens = baueAufruf(gueltigeEingaben())
  const ergebnis = pruefeUndVerweigereBeiTreffer(tokens, neueLaufId('gruen'), PROFIL_REFERENZ, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
  assert.strictEqual(ergebnis.ok, true)
})

test('pruefeUndVerweigereBeiTreffer verweigert bei verbotenem Aufrufparameter und schreibt eine reale VERWEIGERT-Terminalmarke — Rot-Fall', () => {
  const laufId = neueLaufId('rot')
  try {
    schreibeWirkungsmarke(laufId, PROFIL_REFERENZ, 'run_prepared', {}, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    const tokens = ['--model', 'sonnet', '--dangerously-skip-permissions']
    const ergebnis = pruefeUndVerweigereBeiTreffer(tokens, laufId, PROFIL_REFERENZ, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })

    assert.strictEqual(ergebnis.ok, false)
    assert.ok(!ergebnis.ok)
    assert.match(ergebnis.grund, /E-182/)

    const status = stelleLaufstatusFest(laufId, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.strictEqual(status.status, 'ABGESCHLOSSEN')
    assert.ok(status.status === 'ABGESCHLOSSEN')
    assert.strictEqual(status.ergebnis, 'VERWEIGERT')
  } finally {
    raeumeKette(laufId)
  }
})

test('pruefeUndVerweigereBeiTreffer verweigert beim F-048-Fenster-Fall (mehrwortiger Verbotseintrag im Tokens-Array)', () => {
  const laufId = neueLaufId('rot-f048')
  try {
    schreibeWirkungsmarke(laufId, PROFIL_REFERENZ, 'run_prepared', {}, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    const tokens = ['--model', 'sonnet', '--permission-mode', 'bypassPermissions', '--output-format', 'json']
    const ergebnis = pruefeUndVerweigereBeiTreffer(tokens, laufId, PROFIL_REFERENZ, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })

    assert.strictEqual(ergebnis.ok, false)
    assert.ok(!ergebnis.ok)
    assert.match(ergebnis.grund, /E-182/)
    assert.match(ergebnis.grund, /--permission-mode bypassPermissions/)

    const status = stelleLaufstatusFest(laufId, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.strictEqual(status.status, 'ABGESCHLOSSEN')
    assert.ok(status.status === 'ABGESCHLOSSEN')
    assert.strictEqual(status.ergebnis, 'VERWEIGERT')
  } finally {
    raeumeKette(laufId)
  }
})

// ─── WS2: starteGateway ──────────────────────────────────────────────────────

test('starteGateway liefert eine vollständige Laufakte bei validem Ergebnisobjekt (TP-03d) — Grünfall', async () => {
  const laufId = neueLaufId('gateway-gruen')
  try {
    const ergebnis = await starteGateway(gueltigeGatewayEingaben(laufId), {
      ...startfreigabeOptionen(),
      basisVerzeichnis: KONTROLLZUSTAND_BASIS,
      rohBasisVerzeichnis: 'kontrollzustand-roh',
      starter: attrappeMitValidemErgebnis,
      schreiber: () => {},
    })

    assert.strictEqual(ergebnis.ok, true)
    assert.ok(ergebnis.ok)
    assert.strictEqual(ergebnis.laufakte.beobachtungsbasis_vollstaendig, true)
    // TP-03d Messfall 1 trägt kein modelUsage-Feld (real gemessen vor der
    // CLI-Version aus SCOPE 7) — modell_beobachtet bleibt null, F-059/F-061-Muster.
    assert.strictEqual(ergebnis.laufakte.modell_beobachtet, null)
    assert.strictEqual(ergebnis.versionSequenz, 1)

    // Kein Terminalausgang durch das Gateway selbst (AK5/AK12) — der Lauf
    // bleibt bis F7 bewusst KLAERUNG_ERFORDERLICH.
    const status = stelleLaufstatusFest(laufId, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.strictEqual(status.status, 'KLAERUNG_ERFORDERLICH')
  } finally {
    raeumeKette(laufId)
  }
})

test('starteGateway verweigert bei verbotenem Aufrufparameter — WS1-Check greift, kein Prozessstart', async () => {
  const laufId = neueLaufId('gateway-rot')
  let starterAufgerufen = false
  const spyStarter: Starter = async (startziel, tokens) => {
    starterAufgerufen = true
    return attrappeMitValidemErgebnis(startziel, tokens)
  }
  try {
    const eingaben: GatewayEingaben = {
      ...gueltigeGatewayEingaben(laufId),
      tokens: ['--model', 'sonnet', '--dangerously-skip-permissions'],
    }
    const ergebnis = await starteGateway(eingaben, {
      ...startfreigabeOptionen(),
      basisVerzeichnis: KONTROLLZUSTAND_BASIS,
      rohBasisVerzeichnis: 'kontrollzustand-roh',
      starter: spyStarter,
      schreiber: () => {},
    })

    assert.strictEqual(ergebnis.ok, false)
    assert.ok(!ergebnis.ok)
    assert.match(ergebnis.grund, /E-182/)
    assert.strictEqual(starterAufgerufen, false, 'starteProzess darf bei Verweigerung nie aufgerufen werden')

    // Kein RUN_PREPARED wurde vor der Prüfung geschrieben (starteGateway
    // prüft zuerst, schreibt erst danach) — verweigereStart hinterlässt
    // damit eine Terminalmarke ohne vorangehendes RUN_PREPARED. F1B
    // wertet das als "keine RUN_PREPARED-Marke kam vor" → NICHT_GESTARTET,
    // nicht ABGESCHLOSSEN (anders als WS1s eigener Rot-Fall-Test, der ein
    // RUN_PREPARED bewusst vorher von Hand schreibt).
    const status = stelleLaufstatusFest(laufId, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.strictEqual(status.status, 'NICHT_GESTARTET')
  } finally {
    raeumeKette(laufId)
  }
})

test('starteGateway kennzeichnet die Laufakte als unvollständig bei einem Fehllauf ohne Ergebnisobjekt (TP-01e)', async () => {
  const laufId = neueLaufId('gateway-abbruch')
  try {
    const ergebnis = await starteGateway(gueltigeGatewayEingaben(laufId), {
      ...startfreigabeOptionen(),
      basisVerzeichnis: KONTROLLZUSTAND_BASIS,
      rohBasisVerzeichnis: 'kontrollzustand-roh',
      starter: attrappeOhneErgebnisobjekt,
      schreiber: () => {},
    })

    assert.strictEqual(ergebnis.ok, true)
    assert.ok(ergebnis.ok)
    assert.strictEqual(ergebnis.laufakte.beobachtungsbasis_vollstaendig, false)

    // Auch hier keine Terminal-Wirkungsmarke — derselbe KLAERUNG_ERFORDERLICH-Zustand wie im Grünfall.
    const status = stelleLaufstatusFest(laufId, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.strictEqual(status.status, 'KLAERUNG_ERFORDERLICH')
  } finally {
    raeumeKette(laufId)
  }
})

test('starteGateway verweigert bei Drift im F4-Gültigkeitsschlüssel — kein Prozessstart, kein RUN_PREPARED (F6b WS-G, E-188)', async () => {
  const laufId = neueLaufId('gateway-rot-f4-drift')
  let starterAufgerufen = false
  const spyStarter: Starter = async (startziel, tokens) => {
    starterAufgerufen = true
    return attrappeMitValidemErgebnis(startziel, tokens)
  }
  try {
    const ergebnis = await starteGateway(gueltigeGatewayEingaben(laufId), {
      ...startfreigabeOptionen(),
      aktuelleAutorisierungPfad: AKTUELLE_AUTORISIERUNG_MIT_DRIFT_PFAD,
      basisVerzeichnis: KONTROLLZUSTAND_BASIS,
      rohBasisVerzeichnis: 'kontrollzustand-roh',
      starter: spyStarter,
      schreiber: () => {},
    })

    assert.strictEqual(ergebnis.ok, false)
    assert.ok(!ergebnis.ok)
    assert.match(ergebnis.grund, /E-188/)
    assert.strictEqual(starterAufgerufen, false, 'starteProzess darf bei ABGELEHNT nie aufgerufen werden')

    const status = stelleLaufstatusFest(laufId, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.strictEqual(status.status, 'NICHT_GESTARTET')
  } finally {
    raeumeKette(laufId)
  }
})

test('starteGateway verweigert, wenn die Autorisierungs-Referenzdatei fehlt — kein Absturz, klarer Grund (F6b WS-G)', async () => {
  const laufId = neueLaufId('gateway-rot-referenzdatei-fehlt')
  let starterAufgerufen = false
  const spyStarter: Starter = async (startziel, tokens) => {
    starterAufgerufen = true
    return attrappeMitValidemErgebnis(startziel, tokens)
  }
  try {
    const ergebnis = await starteGateway(gueltigeGatewayEingaben(laufId), {
      ...startfreigabeOptionen(),
      aktuelleAutorisierungPfad: join(PROJEKT_VERZEICHNIS, 'existiert-nicht.json'),
      basisVerzeichnis: KONTROLLZUSTAND_BASIS,
      rohBasisVerzeichnis: 'kontrollzustand-roh',
      starter: spyStarter,
      schreiber: () => {},
    })

    assert.strictEqual(ergebnis.ok, false)
    assert.ok(!ergebnis.ok)
    assert.match(ergebnis.grund, /Referenzdatei fehlt/)
    assert.strictEqual(starterAufgerufen, false, 'starteProzess darf ohne Referenzdatei nie aufgerufen werden')
  } finally {
    raeumeKette(laufId)
  }
})

test('starteGateway verweigert, wenn die Autorisierungs-Referenzdatei valides JSON aber die falsche Form hat — kein Absturz (F6b WS-G)', async () => {
  const laufId = neueLaufId('gateway-rot-referenzdatei-falsche-form')
  let starterAufgerufen = false
  const spyStarter: Starter = async (startziel, tokens) => {
    starterAufgerufen = true
    return attrappeMitValidemErgebnis(startziel, tokens)
  }
  try {
    const ergebnis = await starteGateway(gueltigeGatewayEingaben(laufId), {
      ...startfreigabeOptionen(),
      aktuelleAutorisierungPfad: AKTUELLE_AUTORISIERUNG_FALSCHE_FORM_PFAD,
      basisVerzeichnis: KONTROLLZUSTAND_BASIS,
      rohBasisVerzeichnis: 'kontrollzustand-roh',
      starter: spyStarter,
      schreiber: () => {},
    })

    assert.strictEqual(ergebnis.ok, false)
    assert.ok(!ergebnis.ok)
    assert.match(ergebnis.grund, /nicht die erwartete Form/)
    assert.strictEqual(starterAufgerufen, false, 'starteProzess darf bei falsch geformter Referenzdatei nie aufgerufen werden')
  } finally {
    raeumeKette(laufId)
  }
})

test('starteGateway verweigert, wenn .claude/settings.json am gemessenen Pfad fehlt — kein Absturz, keine ungefangene Exception (F6b WS-G)', async () => {
  const laufId = neueLaufId('gateway-rot-settings-fehlt')
  let starterAufgerufen = false
  const spyStarter: Starter = async (startziel, tokens) => {
    starterAufgerufen = true
    return attrappeMitValidemErgebnis(startziel, tokens)
  }
  try {
    const ergebnis = await starteGateway(gueltigeGatewayEingaben(laufId), {
      ...startfreigabeOptionen(),
      settingsPfad: join(PROJEKT_VERZEICHNIS, '.claude', 'settings-existiert-nicht.json'),
      basisVerzeichnis: KONTROLLZUSTAND_BASIS,
      rohBasisVerzeichnis: 'kontrollzustand-roh',
      starter: spyStarter,
      schreiber: () => {},
    })

    assert.strictEqual(ergebnis.ok, false)
    assert.ok(!ergebnis.ok)
    assert.match(ergebnis.grund, /Ist-Zustand/)
    assert.strictEqual(starterAufgerufen, false, 'starteProzess darf ohne messbaren Ist-Zustand nie aufgerufen werden')

    const status = stelleLaufstatusFest(laufId, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.strictEqual(status.status, 'NICHT_GESTARTET')
  } finally {
    raeumeKette(laufId)
  }
})

test('starteGateway registriert die Laufakte über F2 (Lineage) mit dem exakten Inhalt', async () => {
  const laufId = neueLaufId('gateway-lineage')
  try {
    const ergebnis = await starteGateway(gueltigeGatewayEingaben(laufId), {
      ...startfreigabeOptionen(),
      basisVerzeichnis: KONTROLLZUSTAND_BASIS,
      rohBasisVerzeichnis: 'kontrollzustand-roh',
      starter: attrappeMitValidemErgebnis,
      schreiber: () => {},
    })
    assert.ok(ergebnis.ok)

    const geladen = ladeArtefaktVersion(`laufakte-${laufId}`, undefined, { basisVerzeichnis: KONTROLLZUSTAND_BASIS, schreiber: () => {} })
    assert.ok(geladen)
    assert.strictEqual(geladen.erzeugungsart, 'kern')
    assert.deepStrictEqual(geladen.daten, ergebnis.laufakte)
  } finally {
    raeumeKette(laufId)
  }
})

test('starteProzess-Attrappe attrappeOhneErgebnisobjekt liefert kein parsebares "type":"result"-Objekt (TP-01e-Fixture-Selbsttest)', async () => {
  const ergebnis: ProzessErgebnis = await attrappeOhneErgebnisobjekt([], [])
  assert.strictEqual(ergebnis.stdout, '')
  assert.strictEqual(ergebnis.exitCode, 137)
})

// ─── F6a AK8/F-059: leseModellBeobachtet (FOLGT-Klausel WS4, real gemessen SCOPE 7) ──

test('leseModellBeobachtet liefert den Modellnamen bei genau einem modelUsage-Schlüssel — real gemessene Form aus SCOPE 7', () => {
  const ergebnisObjekt = { type: 'result', modelUsage: { 'claude-sonnet-5': { canonicalModel: 'claude-sonnet-5' } } }
  assert.strictEqual(leseModellBeobachtet(ergebnisObjekt), 'claude-sonnet-5')
})

test('leseModellBeobachtet liefert null bei mehreren modelUsage-Schlüsseln — mehrdeutig, nicht geraten', () => {
  const ergebnisObjekt = { type: 'result', modelUsage: { 'claude-sonnet-5': {}, 'claude-haiku-4-5': {} } }
  assert.strictEqual(leseModellBeobachtet(ergebnisObjekt), null)
})

test('leseModellBeobachtet liefert null ohne modelUsage-Feld', () => {
  assert.strictEqual(leseModellBeobachtet({ type: 'result' }), null)
})

test('leseModellBeobachtet liefert null bei null-Ergebnisobjekt', () => {
  assert.strictEqual(leseModellBeobachtet(null), null)
})

// ─── WS4: pruefeStartziel (AK15-Guard) ───────────────────────────────────────

test('pruefeStartziel akzeptiert ein absolutes, endungs- und sperrlistenkonformes, existierendes Startziel — Grünfall', () => {
  const ergebnis = pruefeStartziel(GUELTIGES_STARTZIEL)
  assert.strictEqual(ergebnis.ok, true)
})

test('pruefeStartziel lehnt ein leeres Array ab', () => {
  const ergebnis = pruefeStartziel([])
  assert.strictEqual(ergebnis.ok, false)
})

test('pruefeStartziel lehnt einen relativen Pfad ab', () => {
  const ergebnis = pruefeStartziel(['claude.exe'])
  assert.strictEqual(ergebnis.ok, false)
})

test('pruefeStartziel lehnt eine .cmd-Endung ab', () => {
  const ergebnis = pruefeStartziel([join(process.cwd(), 'claude.cmd')])
  assert.strictEqual(ergebnis.ok, false)
})

test('pruefeStartziel lehnt einen Shell-Basisnamen ab (Sperrliste, auch bei .exe-Endung)', () => {
  const ergebnis = pruefeStartziel([join(process.cwd(), 'cmd.exe')])
  assert.strictEqual(ergebnis.ok, false)
  assert.ok(!ergebnis.ok)
  assert.match(ergebnis.grund, /Shell-Basisnamen-Sperrliste/)
})

test('pruefeStartziel lehnt ein Verzeichnis statt einer Datei ab', () => {
  const ergebnis = pruefeStartziel([process.cwd()])
  assert.strictEqual(ergebnis.ok, false)
})

// ─── WS4: starteProzess (Guard vor optionen.starter, C2-Ergebnisform) ───────

test('starteProzess prüft das Startziel vor optionen.starter — Rot-Fall, Spy-Starter wird nie aufgerufen (Delta 9)', async () => {
  let starterAufgerufen = false
  const spyStarter: Starter = async (startziel, tokens) => {
    starterAufgerufen = true
    return attrappeMitValidemErgebnis(startziel, tokens)
  }
  const ergebnis = await starteProzess([], [], { starter: spyStarter })
  assert.strictEqual(starterAufgerufen, false, 'starter darf bei ungültigem Startziel nie aufgerufen werden')
  assert.strictEqual(ergebnis.exitCode, null)
  assert.ok(ergebnis.startfehler)
})

test('starteProzess resolved statt zu werfen, wenn execFile synchron wirft — NUL-Byte-Token, plattformunabhängig (Delta 5/6)', async () => {
  const ergebnis = await starteProzess(GUELTIGES_STARTZIEL, ['a\u0000b'])
  assert.strictEqual(ergebnis.exitCode, null)
  assert.ok(ergebnis.startfehler, 'startfehler muss bei einem synchronen execFile-Wurf gesetzt sein')
  assert.ok(ergebnis.startfehler.message.length > 0)
})

// ─── WS4: starteGateway mit ungültigem Startziel (Delta 11) ─────────────────

test('starteGateway verweigert bei ungültigem werkzeugStartziel — kein RUN_PREPARED, stelleLaufstatusFest liefert NICHT_GESTARTET', async () => {
  const laufId = neueLaufId('gateway-rot-startziel')
  let starterAufgerufen = false
  const spyStarter: Starter = async (startziel, tokens) => {
    starterAufgerufen = true
    return attrappeMitValidemErgebnis(startziel, tokens)
  }
  try {
    const eingaben: GatewayEingaben = {
      ...gueltigeGatewayEingaben(laufId),
      werkzeugStartziel: [],
    }
    const ergebnis = await starteGateway(eingaben, {
      ...startfreigabeOptionen(),
      basisVerzeichnis: KONTROLLZUSTAND_BASIS,
      rohBasisVerzeichnis: 'kontrollzustand-roh',
      starter: spyStarter,
      schreiber: () => {},
    })

    assert.strictEqual(ergebnis.ok, false)
    assert.ok(!ergebnis.ok)
    assert.strictEqual(starterAufgerufen, false, 'starteProzess darf bei ungültigem Startziel nie aufgerufen werden')

    const status = stelleLaufstatusFest(laufId, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.strictEqual(status.status, 'NICHT_GESTARTET')
  } finally {
    raeumeKette(laufId)
  }
})

// ─── starteGateway prüft werkzeugStartziel[1..n] gegen E-182 (F-119) ───────

test('starteGateway verweigert bei verbotenem Aufrufparameter in werkzeugStartziel[1] — kein Prozessstart (F-119)', async () => {
  const laufId = neueLaufId('gateway-rot-startziel-argv')
  let starterAufgerufen = false
  const spyStarter: Starter = async (startziel, tokens) => {
    starterAufgerufen = true
    return attrappeMitValidemErgebnis(startziel, tokens)
  }
  try {
    const eingaben: GatewayEingaben = {
      ...gueltigeGatewayEingaben(laufId),
      werkzeugStartziel: [...GUELTIGES_STARTZIEL, '--dangerously-skip-permissions'],
    }
    const ergebnis = await starteGateway(eingaben, {
      ...startfreigabeOptionen(),
      basisVerzeichnis: KONTROLLZUSTAND_BASIS,
      rohBasisVerzeichnis: 'kontrollzustand-roh',
      starter: spyStarter,
      schreiber: () => {},
    })

    assert.strictEqual(ergebnis.ok, false)
    assert.ok(!ergebnis.ok)
    assert.match(ergebnis.grund, /E-182/)
    assert.strictEqual(starterAufgerufen, false, 'starteProzess darf bei verbotenem werkzeugStartziel[1..n] nie aufgerufen werden')

    const status = stelleLaufstatusFest(laufId, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.strictEqual(status.status, 'NICHT_GESTARTET')
  } finally {
    raeumeKette(laufId)
  }
})

test('starteGateway lässt ein gültiges mehrgliedriges werkzeugStartziel weiterhin durch — Regression (F-119)', async () => {
  const laufId = neueLaufId('gateway-gruen-startziel-argv')
  try {
    const eingaben: GatewayEingaben = {
      ...gueltigeGatewayEingaben(laufId),
      werkzeugStartziel: [...GUELTIGES_STARTZIEL, '--harmless-flag'],
    }
    const ergebnis = await starteGateway(eingaben, {
      ...startfreigabeOptionen(),
      basisVerzeichnis: KONTROLLZUSTAND_BASIS,
      rohBasisVerzeichnis: 'kontrollzustand-roh',
      starter: attrappeMitValidemErgebnis,
      schreiber: () => {},
    })

    assert.strictEqual(ergebnis.ok, true)
    assert.ok(ergebnis.ok)
  } finally {
    raeumeKette(laufId)
  }
})

test('starteGateway trägt werkzeugStartziel und startfehler im Rohstrom (F-071)', async () => {
  const laufId = neueLaufId('gateway-rohstrom-startfehler')
  try {
    const ergebnis = await starteGateway(gueltigeGatewayEingaben(laufId), {
      ...startfreigabeOptionen(),
      basisVerzeichnis: KONTROLLZUSTAND_BASIS,
      rohBasisVerzeichnis: 'kontrollzustand-roh',
      starter: attrappeOhneErgebnisobjekt,
      schreiber: () => {},
    })
    assert.ok(ergebnis.ok)

    const rohInhalt = JSON.parse(readFileSync(ergebnis.laufakte.rohstrom_referenz.pfad, 'utf8'))
    assert.deepStrictEqual(rohInhalt.werkzeugStartziel, GUELTIGES_STARTZIEL)
    assert.strictEqual(rohInhalt.startfehler, null)
  } finally {
    raeumeKette(laufId)
  }
})
