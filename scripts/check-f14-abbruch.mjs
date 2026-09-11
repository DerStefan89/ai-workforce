/**
 * Datei: scripts/check-f14-abbruch.mjs
 *
 * Zweck: F14-Feature-Gate (AK9, features/F14/feature.md). Anders als
 * scripts/check-f10-leitstand.mjs' WS-4-Blöcke (q)/(r) — die
 * `fuehreAufgabeDurchFn` durch eine Attrappe ersetzen und damit F8/F4 komplett
 * umgehen — spielt dieses Skript die GESAMTE reale Kette einmal end-to-end
 * durch: echter Leitstand-Server, echtes, unmockiertes `fuehreAufgabeDurch`
 * (F8) → `baueKontextpaket` (F5) → `starteGateway` (F6a, inkl. F4s echter
 * `pruefeStartfreigabe`) → `starteProzess` mit einem echten Kindprozess
 * (`process.execPath -e <Hänge-Skript>`, Muster `GUELTIGES_STARTZIEL` aus
 * claude-code-gateway.test.ts/execution-controller.test.ts) → `klassifiziereLauf`
 * (F7) → `stelleLaufstatusFest` (F1B). Kein `starter`-Override — der Prozess
 * wird real über `child_process.execFile` gestartet, real per Timeout bzw.
 * per `abbruchSignal` beendet.
 *
 * `process.execPath` (node.exe) statt der echten `claude`-Binary: real, aber
 * kontrolliert langsam (F14-Auftrag, EMPFEHLUNG) — ein echter, absoluter,
 * endungs- und sperrlistenkonformer Kindprozess (besteht `pruefeStartziel`
 * ohne Sonderfall), der über ein `setInterval` beliebig lange lebt, bis ihn
 * `zeitgrenzeMs` (Fall a) oder das reale `abbruchSignal` aus dem neuen
 * `/abbrechen`-Endpunkt (Fall b) beendet — nicht die echte, langsame und
 * netzabhängige `claude`-CLI. Die extra Argv-Elemente (`-e`, Skripttext)
 * stehen in `werkzeugStartziel[1..]` und laufen unverändert durch F4s realen
 * E-182-Zweitcheck (`pruefeAufrufparameter(eingaben.werkzeugStartziel.slice(1))`)
 * — das Skript enthält bewusst keine der VERBOTENE_AUFRUFPARAMETER-Zeichenketten.
 *
 * Die F4-Startfreigabe-Fixture (Wegwerf-Git-Repo, Baseline,
 * Wirksamkeitsnachweis, Autorisierungsreferenz) ist inhaltlich dasselbe
 * Muster wie claude-code-gateway.test.ts/execution-controller.test.ts (D5,
 * kein neuer Regelsatz) — eigenständig aufgebaut, unabhängig vom echten
 * `state/aktuelle-autorisierung.json` dieses Repos, damit das Gate
 * reproduzierbar bleibt und nicht am realen Autorisierungs-Repo-Zustand
 * dieser Maschine hängt.
 *
 * (a) prüft AK5/AK6: ein Lauf mit sehr niedrigem `zeitgrenzeMs` endet real in
 * FEHLGESCHLAGEN/grund:'timeout' — geprüft über die geschriebene Terminal-
 * Wirkungsmarke (payload.daten.art/grund/beendigungsart), nicht nur über den
 * HTTP-Status oder `laufStatus.ergebnis` allein.
 * (b) prüft AK7: ein Lauf wird über den echten `/abbrechen`-Endpunkt (WS-4)
 * real abgebrochen, endet real in FEHLGESCHLAGEN/grund:'abgebrochen_manuell',
 * ebenfalls über die Terminal-Wirkungsmarke geprüft.
 * (c), je einmal für (a) und (b): POST /api/entscheidungen mit
 * art:'kenntnisnahme' auf der jetzt abgeschlossenen laufId funktioniert
 * wieder normal — Regression gegen AK8 (F14 WS-4), dessen Schreibsperre nur
 * während `aktiv:true` gilt.
 *
 * Wird aufgerufen von: `npm run check`
 *
 * Aufruf: node scripts/check-f14-abbruch.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { erzeugeRequestHandler } from './leitstand-server.mjs'
import { ladeGueltigeCheckpoints, sha256Hex, stelleLaufstatusFest } from '../src/checkpoint-store/index.ts'
import { ermittleIstZustand } from '../src/invocation-policy/index.ts'
import { registriereAuftrag } from '../src/auftrag/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []
console.log('\n=== F14-Abbruch-Check (WS-5, AK9) ===\n')

// ─── F4-Startfreigabe-Fixture (Muster claude-code-gateway.test.ts/execution-controller.test.ts, D5) ──

function git(repoWurzel, argumente) {
  return execFileSync('git', argumente, { cwd: repoWurzel, encoding: 'utf8' })
}

function neuesExternesRepo() {
  const repoWurzel = join(tmpdir(), `f14-ws5-repo-${randomUUID()}`)
  mkdirSync(repoWurzel, { recursive: true })
  git(repoWurzel, ['init', '--quiet'])
  git(repoWurzel, ['config', 'user.email', 'test@example.invalid'])
  git(repoWurzel, ['config', 'user.name', 'Test'])
  writeFileSync(join(repoWurzel, '.gitattributes'), '* -text\n')
  git(repoWurzel, ['add', '.gitattributes'])
  git(repoWurzel, ['commit', '--quiet', '-m', 'init: Zeilenenden pinnen'])
  return repoWurzel
}

function committeDatei(repoWurzel, relativerPfad, inhalt) {
  const zielpfad = join(repoWurzel, relativerPfad)
  mkdirSync(dirname(zielpfad), { recursive: true })
  writeFileSync(zielpfad, inhalt)
  git(repoWurzel, ['add', relativerPfad])
  git(repoWurzel, ['commit', '--quiet', '-m', relativerPfad])
  const commitHash = git(repoWurzel, ['rev-parse', 'HEAD']).trim()
  return { pfad: zielpfad, commit_hash: commitHash, datei_hash: sha256Hex(inhalt) }
}

/** Real existierende, absolute, endungs- und sperrlistenkonforme Datei — besteht pruefeStartziel ohne Sonderfall (Muster GUELTIGES_STARTZIEL aus claude-code-gateway.test.ts). */
const NODE_STARTZIEL_PFAD = process.execPath

/** Hält den Kindprozess beliebig lange am Leben, bis ihn zeitgrenzeMs oder abbruchSignal real beendet — keine der VERBOTENE_AUFRUFPARAMETER-Zeichenketten (src/invocation-policy/verbotene-aufrufparameter.ts). */
const HAENGE_SKRIPT = 'setInterval(function () {}, 1000)'

const STARTFREIGABE_REPO = neuesExternesRepo()

const PROJEKT_VERZEICHNIS = join(tmpdir(), `f14-ws5-projekt-${randomUUID()}`)
mkdirSync(join(PROJEKT_VERZEICHNIS, '.claude', 'hooks'), { recursive: true })
writeFileSync(join(PROJEKT_VERZEICHNIS, '.claude', 'hooks', 'guard.js'), 'hook-inhalt-fixture')
const SETTINGS_PFAD = join(PROJEKT_VERZEICHNIS, '.claude', 'settings.json')
writeFileSync(
  SETTINGS_PFAD,
  JSON.stringify({ hooks: { PreToolUse: [{ matcher: 'Edit', hooks: [{ type: 'command', command: 'node .claude/hooks/guard.js' }] }] } })
)

const ISTUEBRIGEFELDER_FIXTURE = {
  werkzeug_version_deklariert: 'f14-ws5-test-1.0.0',
  berechtigungskontext: 'profil-standard',
  arbeitsverzeichnis_pfad: process.cwd(),
  startziel_pfad: NODE_STARTZIEL_PFAD,
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

function nachweisInhalt(uebrigeFelder) {
  return JSON.stringify({
    gueltigkeitsschluessel: {
      werkzeug_konfiguration_hash: ISTZUSTAND_FIXTURE.werkzeug_konfiguration_hash,
      schutzskript_hashes: ISTZUSTAND_FIXTURE.schutzskripte.map((eintrag) => eintrag.hash),
      werkzeug_version_deklariert: uebrigeFelder.werkzeug_version_deklariert,
      berechtigungskontext: uebrigeFelder.berechtigungskontext,
      arbeitsverzeichnis_pfad: uebrigeFelder.arbeitsverzeichnis_pfad,
      startziel_pfad: uebrigeFelder.startziel_pfad,
    },
    rot_fall_beleg: 'F14-WS5-Gate — kein echter Rot-Fall-Nachweis',
    geprueft_am: new Date().toISOString(),
  })
}

const WIRKSAMKEITSNACHWEIS_REFERENZ = committeDatei(
  STARTFREIGABE_REPO,
  'invocation-policy-wirksamkeitsnachweis/gueltig.json',
  nachweisInhalt(ISTUEBRIGEFELDER_FIXTURE)
)

const AKTUELLE_AUTORISIERUNG_PFAD = join(PROJEKT_VERZEICHNIS, 'aktuelle-autorisierung.json')
writeFileSync(AKTUELLE_AUTORISIERUNG_PFAD, JSON.stringify({ baselineReferenz: BASELINE_REFERENZ, wirksamkeitsnachweisReferenz: WIRKSAMKEITSNACHWEIS_REFERENZ }))

function startfreigabeOptionen() {
  return { settingsPfad: SETTINGS_PFAD, aktuelleAutorisierungPfad: AKTUELLE_AUTORISIERUNG_PFAD, startfreigabeRepoWurzel: STARTFREIGABE_REPO }
}

function raeumeFixturen() {
  raeumeVerzeichnis(STARTFREIGABE_REPO)
  raeumeVerzeichnis(PROJEKT_VERZEICHNIS)
}

// Reviewer-Befund: ein echter Wurf innerhalb eines Testblocks (nicht nur ein befunde.push) würde das
// Skript sonst mit unbehandelter Exception beenden, BEVOR der explizite raeumeFixturen()-Aufruf am
// Dateiende erreicht wird — STARTFREIGABE_REPO/PROJEKT_VERZEICHNIS blieben dauerhaft im Tempverzeichnis
// liegen. process.exit feuert auch nach einer unbehandelten Exception (Node beendet den Prozess erst
// danach) — dieselbe Aufräum-Garantie wie node:test's after()-Hook in den .test.ts-Vorbildern, ohne den
// gesamten Skriptkörper in ein try/finally umbauen zu müssen. Das Aufräumen ist idempotent (force:true), ein
// zusätzlicher expliziter Aufruf am Dateiende schadet nicht, ist aber wegen dieses Hooks nicht mehr nötig.
process.on('exit', raeumeFixturen)

// ─── Test-Infrastruktur (Muster scripts/check-f10-leitstand.mjs) ────────────

function registriereTestAuftrag(basisVerzeichnis) {
  const auftragId = `f14-ws5-auftrag-${randomUUID()}`
  registriereAuftrag(auftragId, { pfad: 'profiles/beispielprojekt.json', hash: 'a'.repeat(64), version: 1 }, 'Testtitel', 'Testauftragstext', {
    basisVerzeichnis,
    schreiber: () => {},
  })
  return auftragId
}

/** Schreibt eine Wegwerf-Startvorlage aus startvorlagen/beispielprojekt.json, mit den F14-WS5-spezifischen Feldern überschrieben (D5: kein zweites Schema von Hand gepflegt). @returns Pfad der geschriebenen Startvorlage */
function schreibeTestStartvorlage(dateiname, overrides) {
  const basis = JSON.parse(readFileSync('startvorlagen/beispielprojekt.json', 'utf-8'))
  const vorlage = {
    ...basis,
    // '--' stoppt node.exes EIGENE Argv-Auswertung — ohne sie versucht node, baueAufrufs
    // nachfolgende Tokens (--model, --tools, ...) selbst als CLI-Flags zu lesen und bricht sofort
    // mit "bad option" ab (real beobachtet), statt sie unangetastet als process.argv durchzureichen.
    werkzeugStartziel: [NODE_STARTZIEL_PFAD, '-e', HAENGE_SKRIPT, '--'],
    werkzeugVersionDeklariert: ISTUEBRIGEFELDER_FIXTURE.werkzeug_version_deklariert,
    berechtigungskontext: ISTUEBRIGEFELDER_FIXTURE.berechtigungskontext,
    ...overrides,
  }
  const pfad = join('startvorlagen', dateiname)
  writeFileSync(pfad, JSON.stringify(vorlage))
  return pfad
}

async function starteTestserver(optionen) {
  const server = createServer(erzeugeRequestHandler(optionen))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  return { basisUrl: `http://127.0.0.1:${port}`, schliessen: () => new Promise((resolve) => server.close(resolve)) }
}

function verzoegerung(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Pollt stelleLaufstatusFest, bis der Lauf terminal ist oder maxWartezeitMs überschritten ist — kein Timeout-Wurf, der letzte gemessene LaufStatus wird zurückgegeben (Aufrufer entscheidet, ob er terminal genug ist). */
async function warteAufTerminal(laufId, basisVerzeichnis, maxWartezeitMs) {
  const start = Date.now()
  let laufStatus = stelleLaufstatusFest(laufId, { basisVerzeichnis, schreiber: () => {} })
  while (laufStatus.status !== 'ABGESCHLOSSEN' && Date.now() - start < maxWartezeitMs) {
    await verzoegerung(200)
    laufStatus = stelleLaufstatusFest(laufId, { basisVerzeichnis, schreiber: () => {} })
  }
  return laufStatus
}

/** Liest payload.daten der terminalen Wirkungsmarke direkt aus der Checkpoint-Kette (nicht nur den HTTP-Status/laufStatus.ergebnis) — AK9-Vorgabe „geprüft über die geschriebene Terminal-Wirkungsmarke". */
function leseTerminalDaten(laufId, basisVerzeichnis, laufStatus) {
  if (laufStatus.status !== 'ABGESCHLOSSEN') return null
  const kette = ladeGueltigeCheckpoints(laufId, { basisVerzeichnis, schreiber: () => {} })
  const terminal = kette.find((eintrag) => eintrag.typ === 'wirkungsmarke' && eintrag.payload.sequenz === laufStatus.terminalSequenz)
  return terminal?.payload?.daten ?? null
}

const gueltigerStartauftrag = (laufId, auftragId) => ({
  laufId,
  rolle: 'ausfuehrung',
  anfragen: [],
  budget: {},
  aufrufEingaben: { modell: 'f14-ws5-test-modell' },
  werkzeugsatz: 'lesend',
  auftragId,
})

// ─── (a) AK5/AK6: TIMEOUT — echter Kindprozess über die reale Kette F8→F5→F6a(F4)→F7→F1B ──
{
  const basisVerzeichnis = 'kontrollzustand-test-f14-ws5-timeout'
  const startvorlagePfad = schreibeTestStartvorlage('test-f14-ws5-timeout.json', { zeitgrenzeMs: 1500 })
  let schliessen = async () => {}
  let laufId
  try {
    const auftragId = registriereTestAuftrag(basisVerzeichnis)
    const testserver = await starteTestserver({ basisVerzeichnis, startvorlagePfad, ...startfreigabeOptionen() })
    schliessen = testserver.schliessen

    laufId = `f14a-${randomUUID()}`
    const start = await fetch(`${testserver.basisUrl}/api/laeufe`, { method: 'POST', body: JSON.stringify(gueltigerStartauftrag(laufId, auftragId)) })
    if (start.status !== 202) {
      befunde.push(`(a) TIMEOUT: Laufstart erwartet 202, erhalten ${start.status} (${JSON.stringify(await start.json().catch(() => ({})))})`)
    } else {
      const laufStatus = await warteAufTerminal(laufId, basisVerzeichnis, 20000)
      const terminalDaten = leseTerminalDaten(laufId, basisVerzeichnis, laufStatus)
      if (laufStatus.status !== 'ABGESCHLOSSEN' || laufStatus.ergebnis !== 'FEHLGESCHLAGEN' || terminalDaten?.grund !== 'timeout' || terminalDaten?.art !== 'TIMEOUT' || terminalDaten?.beendigungsart !== 'TIMEOUT') {
        befunde.push(
          `(a) TIMEOUT: erwartet ABGESCHLOSSEN/FEHLGESCHLAGEN mit Terminal-Wirkungsmarke daten.grund='timeout'/art='TIMEOUT'/beendigungsart='TIMEOUT', erhalten laufStatus=${JSON.stringify(laufStatus)}, daten=${JSON.stringify(terminalDaten)}`
        )
      } else {
        console.log("✓ (a) AK5/AK6: echter Kindprozess läuft über die reale Kette (F8→F5→F6a inkl. F4→F7→F1B) real in zeitgrenzeMs, Terminal-Wirkungsmarke trägt grund:'timeout'/art:'TIMEOUT'/beendigungsart:'TIMEOUT'.")

        // (c) Regression AK8 (F14 WS-4): auf der jetzt ABGESCHLOSSENEN laufId funktioniert art:'kenntnisnahme' wieder normal.
        const kenntnisnahme = await fetch(`${testserver.basisUrl}/api/entscheidungen`, {
          method: 'POST',
          body: JSON.stringify({ art: 'kenntnisnahme', laufId, begruendung: 'F14-WS5-Gate: Kenntnisnahme nach TIMEOUT' }),
        })
        if (kenntnisnahme.status !== 200) {
          befunde.push(`(c) AK8-Regression (TIMEOUT-Fall): art:'kenntnisnahme' auf abgeschlossener laufId erwartet 200, erhalten ${kenntnisnahme.status} (${JSON.stringify(await kenntnisnahme.json().catch(() => ({})))})`)
        } else {
          console.log("✓ (c) AK8-Regression (TIMEOUT-Fall): POST /api/entscheidungen art:'kenntnisnahme' funktioniert nach Laufende wieder normal (Sperre galt nur während aktiv:true).")
        }
      }
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
    rmSync(startvorlagePfad, { force: true })
  }
}

// ─── (b) AK7: ABBRUCH — echter Kindprozess, real über POST /api/laeufe/<laufId>/abbrechen beendet ──
{
  const basisVerzeichnis = 'kontrollzustand-test-f14-ws5-abbruch'
  // Kein zeitgrenzeMs — der Prozess soll ausschließlich durch den manuellen Abbruch enden, nicht durch einen Timeout-Wettlauf.
  const startvorlagePfad = schreibeTestStartvorlage('test-f14-ws5-abbruch.json', {})
  let schliessen = async () => {}
  let laufId
  try {
    const auftragId = registriereTestAuftrag(basisVerzeichnis)
    const testserver = await starteTestserver({ basisVerzeichnis, startvorlagePfad, ...startfreigabeOptionen() })
    schliessen = testserver.schliessen

    laufId = `f14b-${randomUUID()}`
    const start = await fetch(`${testserver.basisUrl}/api/laeufe`, { method: 'POST', body: JSON.stringify(gueltigerStartauftrag(laufId, auftragId)) })
    if (start.status !== 202) {
      befunde.push(`(b) ABBRUCH: Laufstart erwartet 202, erhalten ${start.status} (${JSON.stringify(await start.json().catch(() => ({})))})`)
    } else {
      // Zeit geben, bis der echte Kindprozess tatsächlich läuft (run_prepared + execFile-Spawn), bevor abgebrochen wird —
      // ein zu früher Abbruch (noch vor dem Spawn) würde ebenfalls als ABBRUCH enden, aber real belegen soll AK7 gerade
      // den Abbruch eines LAUFENDEN Prozesses.
      await verzoegerung(600)
      const abbrechen = await fetch(`${testserver.basisUrl}/api/laeufe/${encodeURIComponent(laufId)}/abbrechen`, { method: 'POST' })
      if (abbrechen.status !== 202) {
        befunde.push(`(b) ABBRUCH: POST .../abbrechen erwartet 202, erhalten ${abbrechen.status} (${JSON.stringify(await abbrechen.json().catch(() => ({})))})`)
      }

      const laufStatus = await warteAufTerminal(laufId, basisVerzeichnis, 20000)
      const terminalDaten = leseTerminalDaten(laufId, basisVerzeichnis, laufStatus)
      if (
        laufStatus.status !== 'ABGESCHLOSSEN' ||
        laufStatus.ergebnis !== 'FEHLGESCHLAGEN' ||
        terminalDaten?.grund !== 'abgebrochen_manuell' ||
        terminalDaten?.art !== 'MANUELL' ||
        terminalDaten?.beendigungsart !== 'ABBRUCH'
      ) {
        befunde.push(
          `(b) ABBRUCH: erwartet ABGESCHLOSSEN/FEHLGESCHLAGEN mit Terminal-Wirkungsmarke daten.grund='abgebrochen_manuell'/art='MANUELL'/beendigungsart='ABBRUCH', erhalten laufStatus=${JSON.stringify(laufStatus)}, daten=${JSON.stringify(terminalDaten)}`
        )
      } else {
        console.log("✓ (b) AK7: echter Kindprozess wird real über POST /api/laeufe/<laufId>/abbrechen beendet, Terminal-Wirkungsmarke trägt grund:'abgebrochen_manuell'/art:'MANUELL'/beendigungsart:'ABBRUCH'.")

        // (c) Regression AK8 (F14 WS-4): dieselbe Prüfung, diesmal für den ABBRUCH-Fall.
        const kenntnisnahme = await fetch(`${testserver.basisUrl}/api/entscheidungen`, {
          method: 'POST',
          body: JSON.stringify({ art: 'kenntnisnahme', laufId, begruendung: 'F14-WS5-Gate: Kenntnisnahme nach ABBRUCH' }),
        })
        if (kenntnisnahme.status !== 200) {
          befunde.push(`(c) AK8-Regression (ABBRUCH-Fall): art:'kenntnisnahme' auf abgeschlossener laufId erwartet 200, erhalten ${kenntnisnahme.status} (${JSON.stringify(await kenntnisnahme.json().catch(() => ({})))})`)
        } else {
          console.log("✓ (c) AK8-Regression (ABBRUCH-Fall): POST /api/entscheidungen art:'kenntnisnahme' funktioniert nach Laufende wieder normal (Sperre galt nur während aktiv:true).")
        }
      }
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
    rmSync(startvorlagePfad, { force: true })
  }
}

// Aufräumen von STARTFREIGABE_REPO/PROJEKT_VERZEICHNIS läuft über den process.on('exit', ...)-Hook
// oben (Reviewer-Befund) — kein expliziter Aufruf hier nötig, deckt auch einen unbehandelten Wurf ab.

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
