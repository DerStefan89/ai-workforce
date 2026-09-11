/**
 * Datei: scripts/check-f15-automat-real.mjs
 *
 * Zweck: F15-WS-2c-Gate für die beiden Zusagen, die eine Attrappe nicht
 * belegen kann. scripts/check-f15-workflow.mjs ersetzt `fuehreAufgabeDurchFn`
 * durch eine Attrappe und prüft damit den Automatenpfad — dieses Skript
 * spielt stattdessen die GESAMTE reale Kette durch: echter Leitstand-Server,
 * echtes, unmockiertes `fuehreAufgabeDurch` (F8) → `baueKontextpaket` (F5) →
 * `starteGateway` (F6a, inkl. F4s echter `pruefeStartfreigabe`) →
 * `starteProzess` mit einem echten Kindprozess → `klassifiziereLauf` (F7) →
 * `stelleLaufstatusFest` (F1B). Aufbau, Fixture und Begründung sind
 * wortgleich von scripts/check-f14-abbruch.mjs übernommen (D5, kein zweiter
 * Regelsatz); `process.execPath` (node.exe) tritt an die Stelle der echten
 * `claude`-Binary: real, aber kontrolliert.
 *
 * (a) AK6b real: ein ZWEISTUFIGER Workflow läuft nach EINEM
 *     POST /api/workflows/<id>/starten vollständig durch — Schritt 2 startet
 *     ohne einen zweiten Aufruf, mit einer eigenen, realen lauf_id und einer
 *     eigenen Checkpoint-Kette. Die Attrappenfassung derselben Zusage in
 *     check-f15-workflow.mjs belegt den Automaten; erst hier ist belegt, dass
 *     ein real ERFOLGREICH klassifizierter Lauf die Fortsetzung auch auslöst.
 *
 * (b) F-208 (a6 des WS-2c-Auftrags): Schritt 1 wird über den echten
 *     `/abbrechen`-Endpunkt (F14 WS-4) real abgebrochen — danach darf
 *     Schritt 2 NICHT starten. Die Erwartung dahinter war bis hierher eine
 *     ANNAHME: der abgebrochene Lauf wird nicht ERFOLGREICH klassifiziert,
 *     also greift Regel 1 von `ermittleNaechstenSchritt`. Ohne diesen Fall
 *     bliebe sie eine Annahme, und der Automat könnte einen vom Menschen
 *     abgebrochenen Arbeitsstrang fortsetzen, ohne dass etwas anschlägt.
 *
 * (e) F-216 (WS-2c (b2)): `POST /api/workflows/<id>/stoppen` bricht einen
 *     REALEN, hängenden Kindprozess ab; `GESTOPPT` steht sofort und überlebt
 *     die Nachbereitung des noch fliegenden Laufs, Schritt 2 startet nicht.
 *     Anschließend der Reparaturpfad zu Ende: korrigierte Fassung, realer
 *     Start, `ABGESCHLOSSEN`. Die Attrappenfassung in check-f15-workflow.mjs
 *     stellt denselben Ablauf mit einem Riegel deterministisch nach; erst
 *     hier ist belegt, dass ein echter Prozess daran wirklich stirbt.
 *
 * (f) F-216, andere Hälfte: ein Stopp OHNE aktiven Lauf — der Fall, für den
 *     der Endpunkt auf den WORKFLOW zielt und nicht auf eine laufId. 200 mit
 *     `laufAbgebrochen: false`, danach ist der Workflow nicht mehr startbar.
 *
 * (g) F-239: ein Stopp bricht NUR den eigenen Lauf ab. Workflow B wird
 *     gestoppt, während der reale Kindprozess von Workflow A läuft — B ist
 *     danach gestoppt und bezeugt, A läuft unangetastet bis `ABGESCHLOSSEN`
 *     durch. Bis (b2) war das die einzige unbelegte Zusage des Endpunkts: ein
 *     Rückbau der Zugehörigkeitsprüfung auf ein bloßes `laufAktiv` wäre in
 *     beiden F15-Gates grün geblieben und hätte fremde Arbeitsstränge
 *     abgebrochen.
 *
 * Zwei Vorsorgen gegen einen überlebenden Kindprozess (F-231, WS-2c (b2)):
 * ein Wachhund-Timer (`unref()`, feuert nur, wenn den Prozess etwas ANDERES
 * offen hält) beendet die Datei nach fünf Minuten MIT Befund und Exit 1 statt
 * sie hängen zu lassen; und die Blöcke mit `HAENGE_SKRIPT` brechen einen noch
 * fliegenden Lauf in ihrer Aufräumroutine aktiv ab, bevor sie den Testserver
 * schließen. Ohne beides blieb `npm run check` bei der Rot-Kalibrierung zu
 * F-216 wortlos stehen, statt einen Befund zu melden.
 *
 * Wird aufgerufen von: `npm run check`
 * (NICHT `npm run check:template` — stackgebunden, wie check-f14-abbruch.mjs.)
 *
 * Aufruf: node scripts/check-f15-automat-real.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { erzeugeRequestHandler } from './leitstand-server.mjs'
import { sha256Hex, stelleLaufstatusFest } from '../src/checkpoint-store/index.ts'
import { ladeArtefaktVersion } from '../src/lineage-registry/index.ts'
import { ermittleIstZustand } from '../src/invocation-policy/index.ts'
import { registriereAuftrag } from '../src/auftrag/index.ts'
import { registriereWorkflow } from '../src/workflow/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []
console.log('\n=== F15-Automat-Realcheck (WS-2c, AK6b + F-208) ===\n')

// ─── Wachhund (F-231, WS-2c (b2)) ──────────────────────────────────────────
//
// Diese Datei endet über process.exitCode und nicht über process.exit() (Begründung
// am Dateiende). Das hat einen Preis, der bei der Rot-Kalibrierung zu F-216 real
// aufgeschlagen ist: überlebt ein Kindprozess — GENAU der Fall, gegen den Block (e)
// gebaut ist —, hält er die Event-Loop offen, und der Prozess kehrt NIE zurück. Das
// Gate meldete dann nichts; es lief einfach nicht zu Ende, und `npm run check` blieb
// stehen. Ein Gate, das bei der Verletzung seiner eigenen Zusage hängt statt
// fehlzuschlagen, ist genau die Art Behauptung, gegen die F-211 sich richtet.
//
// unref() ist der Punkt: der Timer HÄLT den Prozess nicht offen. Endet die Datei
// normal, ist er wirkungslos und der Normalfall bleibt unverändert. Hält ihn dagegen
// etwas anderes offen — ein überlebender Kindprozess —, feuert er und beendet hart.
//
// Die Frist ist eine Reißleine, kein Zeitlimit für den Test: der vollständige Lauf
// dieser Datei braucht real rund zehn Sekunden (gemessen 10.09.2026, Windows,
// sechs Blöcke). Fünf Minuten sind die dreißigfache Reserve und schlagen auf einer
// deutlich langsameren Maschine immer noch nicht grundlos an.
const WACHHUND_FRIST_MS = 5 * 60 * 1000
const wachhund = setTimeout(() => {
  console.log('')
  console.log('✗ 1 Befund(e):\n')
  console.log(`  - Gate-Wachhund: nicht beendet nach ${WACHHUND_FRIST_MS / 60000} Minuten — vermutlich überlebender Kindprozess`)
  console.log('')
  // Hier ausdrücklich process.exit statt exitCode: es GIBT einen offenen Handle, der
  // den Prozess sonst hält — genau deshalb feuert dieser Timer. Der Windows-Grund für
  // exitCode (libuv-Assertion beim Schließen) betrifft den Normalfall, nicht die
  // Reißleine.
  process.exit(1)
}, WACHHUND_FRIST_MS)
wachhund.unref()

// ─── F4-Startfreigabe-Fixture (übernommen aus check-f14-abbruch.mjs, D5) ────

function git(repoWurzel, argumente) {
  return execFileSync('git', argumente, { cwd: repoWurzel, encoding: 'utf8' })
}

function neuesExternesRepo() {
  const repoWurzel = join(tmpdir(), `f15-ws2c-repo-${randomUUID()}`)
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

/** Real existierende, absolute, endungs- und sperrlistenkonforme Datei — besteht pruefeStartziel ohne Sonderfall. */
const NODE_STARTZIEL_PFAD = process.execPath

/**
 * Schreibt ein Ergebnisobjekt nach stdout und endet sofort — die kleinste
 * Ausgabe, die F6as leseErgebnisobjekt annimmt (type === 'result') und die F7
 * ohne permission_denials als ERFOLGREICH klassifiziert. Enthält bewusst keine
 * der VERBOTENE_AUFRUFPARAMETER-Zeichenketten (F4s realer E-182-Zweitcheck
 * liest werkzeugStartziel.slice(1) mit).
 */
const ERFOLG_SKRIPT = 'process.stdout.write(JSON.stringify({ type: "result" }))'

/** Hält den Kindprozess beliebig lange am Leben, bis ihn das reale abbruchSignal beendet. */
const HAENGE_SKRIPT = 'setInterval(function () {}, 1000)'

/**
 * Wie ERFOLG_SKRIPT, aber erst nach zwei Sekunden (F-239, Block (g)).
 *
 * Der Fall dort braucht beides in EINEM Lauf: einen Kindprozess, der beim
 * Stoppen eines FREMDEN Workflows nachweislich noch lebt, und einen, der
 * danach von selbst regulär zu Ende läuft. HAENGE_SKRIPT kann das zweite
 * nicht (es endet nie), ERFOLG_SKRIPT das erste nicht (es ist längst fertig,
 * bevor der Stopp abgesetzt ist). Zwei Sekunden sind lang genug für den
 * Stopp-Aufruf und kurz genug, dass der Block ohne Wartezeit terminiert.
 */
const VERZOEGERTER_ERFOLG_SKRIPT = 'setTimeout(function () { process.stdout.write(JSON.stringify({ type: "result" })) }, 2000)'

const STARTFREIGABE_REPO = neuesExternesRepo()

const PROJEKT_VERZEICHNIS = join(tmpdir(), `f15-ws2c-projekt-${randomUUID()}`)
mkdirSync(join(PROJEKT_VERZEICHNIS, '.claude', 'hooks'), { recursive: true })
writeFileSync(join(PROJEKT_VERZEICHNIS, '.claude', 'hooks', 'guard.js'), 'hook-inhalt-fixture')
const SETTINGS_PFAD = join(PROJEKT_VERZEICHNIS, '.claude', 'settings.json')
writeFileSync(
  SETTINGS_PFAD,
  JSON.stringify({ hooks: { PreToolUse: [{ matcher: 'Edit', hooks: [{ type: 'command', command: 'node .claude/hooks/guard.js' }] }] } })
)

const ISTUEBRIGEFELDER_FIXTURE = {
  werkzeug_version_deklariert: 'f15-ws2c-test-1.0.0',
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

const WIRKSAMKEITSNACHWEIS_REFERENZ = committeDatei(
  STARTFREIGABE_REPO,
  'invocation-policy-wirksamkeitsnachweis/gueltig.json',
  JSON.stringify({
    gueltigkeitsschluessel: {
      werkzeug_konfiguration_hash: ISTZUSTAND_FIXTURE.werkzeug_konfiguration_hash,
      schutzskript_hashes: ISTZUSTAND_FIXTURE.schutzskripte.map((eintrag) => eintrag.hash),
      werkzeug_version_deklariert: ISTUEBRIGEFELDER_FIXTURE.werkzeug_version_deklariert,
      berechtigungskontext: ISTUEBRIGEFELDER_FIXTURE.berechtigungskontext,
      arbeitsverzeichnis_pfad: ISTUEBRIGEFELDER_FIXTURE.arbeitsverzeichnis_pfad,
      startziel_pfad: ISTUEBRIGEFELDER_FIXTURE.startziel_pfad,
    },
    rot_fall_beleg: 'F15-WS2c-Gate — kein echter Rot-Fall-Nachweis',
    geprueft_am: new Date().toISOString(),
  })
)

const AKTUELLE_AUTORISIERUNG_PFAD = join(PROJEKT_VERZEICHNIS, 'aktuelle-autorisierung.json')
writeFileSync(AKTUELLE_AUTORISIERUNG_PFAD, JSON.stringify({ baselineReferenz: BASELINE_REFERENZ, wirksamkeitsnachweisReferenz: WIRKSAMKEITSNACHWEIS_REFERENZ }))

function startfreigabeOptionen() {
  return { settingsPfad: SETTINGS_PFAD, aktuelleAutorisierungPfad: AKTUELLE_AUTORISIERUNG_PFAD, startfreigabeRepoWurzel: STARTFREIGABE_REPO }
}

// Aufräumen auch nach einem unbehandelten Wurf (Reviewer-Befund aus F14 WS-5).
process.on('exit', () => {
  raeumeVerzeichnis(STARTFREIGABE_REPO)
  raeumeVerzeichnis(PROJEKT_VERZEICHNIS)
})

// ─── Test-Infrastruktur ────────────────────────────────────────────────────

const STILL = () => {}

function registriereTestAuftrag(basisVerzeichnis) {
  const auftragId = `f15-ws2c-auftrag-${randomUUID()}`
  registriereAuftrag(auftragId, { pfad: 'profiles/beispielprojekt.json', hash: 'a'.repeat(64), version: 1 }, 'Testtitel', 'Testauftragstext', {
    basisVerzeichnis,
    schreiber: STILL,
  })
  return auftragId
}

/** Wegwerf-Startvorlage aus startvorlagen/beispielprojekt.json, mit dem Kindprozess-Startziel überschrieben (D5: kein zweites Schema von Hand gepflegt). @returns Pfad der geschriebenen Startvorlage */
function schreibeTestStartvorlage(dateiname, skript) {
  const basis = JSON.parse(readFileSync('startvorlagen/beispielprojekt.json', 'utf-8'))
  const vorlage = {
    ...basis,
    // '--' stoppt node.exes EIGENE Argv-Auswertung — ohne sie liest node baueAufrufs
    // nachfolgende Tokens (--model, --tools, ...) als CLI-Flags und bricht ab.
    werkzeugStartziel: [NODE_STARTZIEL_PFAD, '-e', skript, '--'],
    werkzeugVersionDeklariert: ISTUEBRIGEFELDER_FIXTURE.werkzeug_version_deklariert,
    berechtigungskontext: ISTUEBRIGEFELDER_FIXTURE.berechtigungskontext,
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

/**
 * Beendet einen ggf. noch laufenden Kindprozess über den realen Abbruch-Endpunkt,
 * BEVOR der Testserver geschlossen wird (F-231, WS-2c (b2)).
 *
 * `schliessen()` schließt nur den HTTP-Server — der Kindprozess eines noch fliegenden
 * Laufs überlebt das und hält die Event-Loop offen. Die Blöcke, die mit HAENGE_SKRIPT
 * arbeiten, räumen deshalb erst den Lauf ab und dann den Server.
 *
 * Best effort und bewusst still: ein 404 ('kein aktiver Lauf') ist der Normalfall,
 * wenn der Lauf ordentlich geendet hat, und ein Wurf hier darf einen bestandenen
 * Block nicht nachträglich rot färben. Wirkt der Abbruch NICHT — die Manipulation,
 * gegen die diese Vorsorge gebaut ist —, greift der Wachhund oben.
 * @param basisUrl - Basis-URL des Testservers
 * @param laufId - laufId des möglicherweise noch aktiven Laufs
 */
async function beendeLaufFallsAktiv(basisUrl, laufId) {
  if (typeof laufId !== 'string' || laufId.length === 0) return
  try {
    await fetch(`${basisUrl}/api/laeufe/${encodeURIComponent(laufId)}/abbrechen`, { method: 'POST' })
    // Dem Kindprozess einen Moment zum Sterben geben: der Endpunkt antwortet sofort,
    // ohne auf das Laufende zu warten.
    await verzoegerung(300)
  } catch {
    // still, siehe oben
  }
}

function ladeWorkflow(workflowId, basisVerzeichnis) {
  return ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis, schreiber: STILL })?.daten ?? null
}

/** Pollt den Workflow-Zustand, bis er einen der erwarteten Status trägt oder die Zeit abgelaufen ist. @returns der zuletzt gelesene Datensatz */
async function warteAufWorkflowStatus(workflowId, basisVerzeichnis, erwartete, maxWartezeitMs) {
  const start = Date.now()
  let daten = ladeWorkflow(workflowId, basisVerzeichnis)
  while (!erwartete.includes(daten?.status) && Date.now() - start < maxWartezeitMs) {
    await verzoegerung(200)
    daten = ladeWorkflow(workflowId, basisVerzeichnis)
  }
  return daten
}

function schrittFixture(schrittId, nachfolger, zeitgrenzeMs, felder = {}) {
  return {
    schritt_id: schrittId,
    rolle: 'ausfuehrung',
    werkzeugsatz: 'lesend',
    worker: 'claude-code',
    modell: 'f15-ws2c-test-modell',
    eingaben: [],
    output_schema: null,
    freigabe: 'AUTOMATISCH',
    risiko: 'Realcheck-Fixture.',
    zeitgrenze_ms: zeitgrenzeMs,
    nachfolger,
    status: 'OFFEN',
    lauf_id: null,
    ...felder,
  }
}

/** Legt einen zweistufigen Workflow direkt über registriereWorkflow an (am Endpunkt vorbei — der ist in check-f15-workflow.mjs geprüft). @param schritt2Felder - Abweichungen am zweiten Schritt, z. B. freigabe 'ZWINGEND' @returns workflowId */
function legeZweistufigenWorkflowAn(basisVerzeichnis, auftragId, zeitgrenzeMs, schritt2Felder = {}) {
  const workflowId = `f15-ws2c-workflow-${randomUUID()}`
  registriereWorkflow(
    {
      workflow_schema: 'v0',
      workflow_id: workflowId,
      auftrag_id: auftragId,
      version: 1,
      ziel: 'Realcheck: zwei Schritte, ein Startaufruf.',
      status: 'OFFEN',
      aktiver_schritt_id: 'schritt-1',
      grenzen: { max_schritte: 8, max_replans: 0 },
      schritte: [schrittFixture('schritt-1', 'schritt-2', zeitgrenzeMs), schrittFixture('schritt-2', null, zeitgrenzeMs, schritt2Felder)],
    },
    leiteProfilReferenzAb(ladeStartvorlage('startvorlagen/beispielprojekt.json')),
    { basisVerzeichnis, schreiber: STILL }
  )
  return workflowId
}

// ─── (a) AK6b real: EIN Startaufruf, zwei reale Läufe ──────────────────────
{
  const basisVerzeichnis = 'kontrollzustand-test-f15-ws2c-auto'
  raeumeVerzeichnis(basisVerzeichnis)
  const startvorlagePfad = schreibeTestStartvorlage('test-f15-ws2c-auto.json', ERFOLG_SKRIPT)
  let schliessen = async () => {}
  try {
    const auftragId = registriereTestAuftrag(basisVerzeichnis)
    const workflowId = legeZweistufigenWorkflowAn(basisVerzeichnis, auftragId, 30000)
    const testserver = await starteTestserver({ basisVerzeichnis, startvorlagePfad, ...startfreigabeOptionen() })
    schliessen = testserver.schliessen

    const start = await fetch(`${testserver.basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
    if (start.status !== 202) {
      befunde.push(`(a) AK6b: der einzige Startaufruf erwartet 202, erhalten ${start.status} (${JSON.stringify(await start.json().catch(() => ({})))})`)
    } else {
      // KEIN zweiter POST .../starten. Was danach auf der Platte steht, hat der Automat
      // selbst geschrieben.
      const daten = await warteAufWorkflowStatus(workflowId, basisVerzeichnis, ['ABGESCHLOSSEN', 'KLAERUNG_ERFORDERLICH', 'GESTOPPT'], 60000)
      const [schritt1, schritt2] = daten?.schritte ?? []
      if (daten?.status !== 'ABGESCHLOSSEN' || schritt1?.status !== 'ERFOLGREICH' || schritt2?.status !== 'ERFOLGREICH') {
        befunde.push(
          `(a) AK6b: erwartet Workflow ABGESCHLOSSEN mit beiden Schritten ERFOLGREICH nach EINEM Aufruf, erhalten ${JSON.stringify({ status: daten?.status, grund: daten?.grund, s1: schritt1?.status, s2: schritt2?.status })}`
        )
      } else if (schritt2.lauf_id === null || schritt1.lauf_id === schritt2.lauf_id) {
        befunde.push(`(a) AK6b: Schritt 2 braucht eine eigene, reale lauf_id, erhalten ${JSON.stringify({ s1: schritt1.lauf_id, s2: schritt2.lauf_id })}`)
      } else {
        // Der Beleg, dass Schritt 2 wirklich real gelaufen ist und nicht nur als ERFOLGREICH
        // eingetragen wurde: unter seiner lauf_id liegt eine eigene, terminale Checkpoint-Kette.
        const laufStatus2 = stelleLaufstatusFest(schritt2.lauf_id, { basisVerzeichnis, schreiber: STILL })
        if (laufStatus2.status !== 'ABGESCHLOSSEN' || laufStatus2.ergebnis !== 'ERFOLGREICH') {
          befunde.push(`(a) AK6b: der automatisch gestartete Schritt 2 hat keine terminale ERFOLGREICH-Kette, erhalten ${JSON.stringify(laufStatus2)}`)
        } else {
          console.log('✓ (a) AK6b: ein zweistufiger Workflow läuft über die REALE Kette (F8→F5→F6a inkl. F4→F7→F1B) nach EINEM POST .../starten vollständig durch — Schritt 2 mit eigener lauf_id und eigener terminaler Kette, ohne zweiten Aufruf.')
        }
      }
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
    rmSync(startvorlagePfad, { force: true })
  }
}

// ─── (b) F-208: ein abgebrochener Schritt 1 setzt NICHT auf Schritt 2 fort ──
{
  const basisVerzeichnis = 'kontrollzustand-test-f15-ws2c-abbruch'
  // Gegen den Stand VOR diesem Block geprüft, nicht gegen die globale Liste (Reviewer-Pass
  // 10.09.2026): sonst unterdrückte ein Befund aus (a) die Erfolgsmeldung von (b), obwohl (b)
  // bestanden hat — und der Bericht sagte weniger, als der Lauf belegt.
  const befundeVorAbbruch = befunde.length
  raeumeVerzeichnis(basisVerzeichnis)
  const startvorlagePfad = schreibeTestStartvorlage('test-f15-ws2c-abbruch.json', HAENGE_SKRIPT)
  let schliessen = async () => {}
  // Für die Aufräumroutine (F-231): dieser Block startet einen Kindprozess, der von sich
  // aus nie endet. Schlägt der Abbruch fehl, überlebt er das Ende dieses Blocks.
  let basisUrl = null
  let laufIdDesBlocks = null
  try {
    const auftragId = registriereTestAuftrag(basisVerzeichnis)
    // Sehr große Zeitgrenze: der Lauf soll ausschließlich durch den manuellen Abbruch enden,
    // nicht durch einen Timeout-Wettlauf — sonst prüfte der Fall den Timeout-Pfad aus F14.
    const workflowId = legeZweistufigenWorkflowAn(basisVerzeichnis, auftragId, 600000)
    const testserver = await starteTestserver({ basisVerzeichnis, startvorlagePfad, ...startfreigabeOptionen() })
    schliessen = testserver.schliessen
    basisUrl = testserver.basisUrl

    const start = await fetch(`${testserver.basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
    const startKoerper = await start.json().catch(() => ({}))
    laufIdDesBlocks = startKoerper.laufId
    if (start.status !== 202) {
      befunde.push(`(b) F-208: Startaufruf erwartet 202, erhalten ${start.status} (${JSON.stringify(startKoerper)})`)
    } else {
      // Zeit geben, bis der echte Kindprozess läuft (run_prepared + execFile-Spawn) — ein
      // Abbruch VOR dem Spawn endete ebenfalls im Halt, belegte aber nicht den Abbruch eines
      // laufenden Schritts.
      await verzoegerung(600)
      const abbrechen = await fetch(`${testserver.basisUrl}/api/laeufe/${encodeURIComponent(startKoerper.laufId)}/abbrechen`, { method: 'POST' })
      if (abbrechen.status !== 202) {
        befunde.push(`(b) F-208: POST .../abbrechen erwartet 202, erhalten ${abbrechen.status} (${JSON.stringify(await abbrechen.json().catch(() => ({})))})`)
      }

      // Laufende abwarten: der Abbruch-Endpunkt antwortet SOFORT, der abgebrochene Lauf fliegt
      // noch. Erst danach ist die Frage entscheidbar, ob der Automat fortgesetzt hat.
      const daten = await warteAufWorkflowStatus(workflowId, basisVerzeichnis, ['KLAERUNG_ERFORDERLICH', 'ABGESCHLOSSEN', 'GESTOPPT'], 60000)
      const [schritt1, schritt2] = daten?.schritte ?? []
      if (daten?.status !== 'KLAERUNG_ERFORDERLICH') {
        befunde.push(`(b) F-208: nach dem Abbruch erwartet Workflow KLAERUNG_ERFORDERLICH, erhalten ${JSON.stringify({ status: daten?.status, grund: daten?.grund })}`)
      }
      if (schritt1?.status === 'ERFOLGREICH') {
        befunde.push(`(b) F-208: ein abgebrochener Schritt darf nie ERFOLGREICH klassifiziert werden, erhalten ${JSON.stringify(schritt1)}`)
      }
      // Der eigentliche Befund: Schritt 2 ist unangetastet. Kein Lauf, kein Status.
      if (schritt2?.lauf_id !== null || schritt2?.status !== 'OFFEN') {
        befunde.push(`(b) F-208: nach dem Abbruch von Schritt 1 darf Schritt 2 NICHT gestartet sein, erhalten ${JSON.stringify(schritt2)}`)
      }
      // Und eine zweite Sicht auf dieselbe Tatsache, unabhängig vom Workflow-Artefakt: es gibt
      // im Kontrollzustand genau EINE Lauf-Kette, nämlich die des abgebrochenen Schritts.
      const laufStatus1 = stelleLaufstatusFest(startKoerper.laufId, { basisVerzeichnis, schreiber: STILL })
      if (laufStatus1.status === 'ABGESCHLOSSEN' && laufStatus1.ergebnis === 'ERFOLGREICH') {
        befunde.push(`(b) F-208: der abgebrochene Lauf wurde real als ERFOLGREICH klassifiziert — die Annahme hinter der Zusage trägt nicht, erhalten ${JSON.stringify(laufStatus1)}`)
      }
      if (befunde.length === befundeVorAbbruch) {
        console.log(
          `✓ (b) F-208: ein über POST /api/laeufe/<laufId>/abbrechen real abgebrochener Schritt 1 endet ${laufStatus1.ergebnis ?? laufStatus1.status}, der Workflow steht auf KLAERUNG_ERFORDERLICH, und Schritt 2 ist NICHT gestartet (Regel 1 von ermittleNaechstenSchritt greift).`
        )
      }
    }
  } finally {
    // Erst den Kindprozess, dann den Server (F-231): schliessen() allein ließe einen noch
    // fliegenden Lauf und damit einen node.exe weiterlaufen.
    await beendeLaufFallsAktiv(basisUrl, laufIdDesBlocks)
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
    rmSync(startvorlagePfad, { force: true })
  }
}

// ─── (c) AK7 real: ZWINGEND-Halt, Freigabe, Kette läuft zu Ende ────────────
//
// Der Governance-Fall, der bis (b1) nicht durchführbar war: ein Workflow mit einem
// ZWINGEND-Schritt war nach dem Halt endgültig zugemauert (F-207), AK10 wäre nur über
// einen Workflow ganz OHNE ZWINGEND-Schritt erreichbar gewesen — also am Zweck vorbei.
// Hier steht er über der realen Kette: echter Kindprozess für Schritt 1, echter Halt,
// EINE menschliche Freigabe, echter Kindprozess für Schritt 2.
{
  const basisVerzeichnis = 'kontrollzustand-test-f15-ws2c-freigabe'
  const befundeVorFreigabe = befunde.length
  raeumeVerzeichnis(basisVerzeichnis)
  const startvorlagePfad = schreibeTestStartvorlage('test-f15-ws2c-freigabe.json', ERFOLG_SKRIPT)
  let schliessen = async () => {}
  try {
    const auftragId = registriereTestAuftrag(basisVerzeichnis)
    const workflowId = legeZweistufigenWorkflowAn(basisVerzeichnis, auftragId, 30000, { freigabe: 'ZWINGEND' })
    const testserver = await starteTestserver({ basisVerzeichnis, startvorlagePfad, ...startfreigabeOptionen() })
    schliessen = testserver.schliessen

    const start = await fetch(`${testserver.basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
    if (start.status !== 202) {
      befunde.push(`(c) AK7: der Startaufruf erwartet 202, erhalten ${start.status} (${JSON.stringify(await start.json().catch(() => ({})))})`)
    } else {
      const imHalt = await warteAufWorkflowStatus(workflowId, basisVerzeichnis, ['WARTET_FREIGABE', 'KLAERUNG_ERFORDERLICH', 'GESTOPPT', 'ABGESCHLOSSEN'], 60000)
      if (imHalt?.status !== 'WARTET_FREIGABE' || imHalt?.aktiver_schritt_id !== 'schritt-2') {
        befunde.push(`(c) AK7: der Automat muss real auf WARTET_FREIGABE vor 'schritt-2' anhalten, erhalten ${JSON.stringify({ status: imHalt?.status, cursor: imHalt?.aktiver_schritt_id, grund: imHalt?.grund })}`)
      } else if (imHalt.schritte[1].lauf_id !== null) {
        befunde.push(`(c) AK7: der ZWINGEND-Schritt darf vor der Freigabe NICHT gelaufen sein, erhalten ${JSON.stringify(imHalt.schritte[1])}`)
      } else {
        const freigabe = await fetch(`${testserver.basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/freigabe`, {
          method: 'POST',
          body: JSON.stringify({ schrittId: 'schritt-2', entscheidung: 'FREIGEGEBEN', begruendung: 'Realcheck: Schritt 2 ist geprüft und freigegeben.' }),
        })
        if (freigabe.status !== 202) {
          befunde.push(`(c) AK7: POST .../freigabe erwartet 202, erhalten ${freigabe.status} (${JSON.stringify(await freigabe.json().catch(() => ({})))})`)
        } else {
          const daten = await warteAufWorkflowStatus(workflowId, basisVerzeichnis, ['ABGESCHLOSSEN', 'KLAERUNG_ERFORDERLICH', 'GESTOPPT'], 60000)
          const schritt2 = daten?.schritte?.[1]
          if (daten?.status !== 'ABGESCHLOSSEN' || schritt2?.status !== 'ERFOLGREICH') {
            befunde.push(`(c) AK7: nach der Freigabe muss die Kette bis zum Ende weiterlaufen, erhalten ${JSON.stringify({ status: daten?.status, grund: daten?.grund, s2: schritt2?.status })}`)
          } else if (schritt2.freigabe_erteilt !== true || schritt2.freigabe !== 'ZWINGEND') {
            befunde.push(`(c) AK7: freigabe_erteilt muss am Schritt stehen und 'freigabe' unverändert bleiben, erhalten ${JSON.stringify(schritt2)}`)
          } else {
            // Wie in (a): der Beleg, dass Schritt 2 real gelaufen ist, kommt aus der
            // Checkpoint-Kette, nicht aus dem Eintrag im Workflow-Artefakt.
            const laufStatus2 = stelleLaufstatusFest(schritt2.lauf_id, { basisVerzeichnis, schreiber: STILL })
            const entscheidung = ladeArtefaktVersion(`entscheidung-workflow-${workflowId}-schritt-2`, undefined, { basisVerzeichnis, schreiber: STILL })
            if (laufStatus2.status !== 'ABGESCHLOSSEN' || laufStatus2.ergebnis !== 'ERFOLGREICH') {
              befunde.push(`(c) AK7: der freigegebene Schritt 2 hat keine terminale ERFOLGREICH-Kette, erhalten ${JSON.stringify(laufStatus2)}`)
            } else if (entscheidung?.daten?.ergebnis !== 'FREIGEGEBEN') {
              befunde.push(`(c) AK7: die Freigabe muss als Entscheidungsartefakt festgehalten sein, erhalten ${JSON.stringify(entscheidung?.daten)}`)
            } else if (befunde.length === befundeVorFreigabe) {
              console.log(
                '✓ (c) AK7: ein Workflow mit ZWINGEND-Schritt hält über die REALE Kette auf WARTET_FREIGABE an, EIN POST .../freigabe (FREIGEGEBEN) löst den Halt, und Schritt 2 läuft mit eigener terminaler Kette zu Ende — das Entscheidungsartefakt liegt vor.'
              )
            }
          }
        }
      }
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
    rmSync(startvorlagePfad, { force: true })
  }
}

// ─── (d) AK7 real: ABGELEHNT stoppt — und der Reparaturpfad ist begehbar ───
//
// Die andere Hälfte der Freigabe. Ohne sie wäre „die Freigabe entscheidet" durch ein
// „alles startet" erfüllbar. Zusätzlich real geprüft: GESTOPPT ist nach der Ablehnung
// KEINE Sackgasse — eine korrigierte Fassung wird angenommen. Das ist der Grund, aus
// dem die Ablehnung GESTOPPT setzt und nicht KLAERUNG_ERFORDERLICH.
{
  const basisVerzeichnis = 'kontrollzustand-test-f15-ws2c-ablehnung'
  const befundeVorAblehnung = befunde.length
  raeumeVerzeichnis(basisVerzeichnis)
  const startvorlagePfad = schreibeTestStartvorlage('test-f15-ws2c-ablehnung.json', ERFOLG_SKRIPT)
  let schliessen = async () => {}
  try {
    const auftragId = registriereTestAuftrag(basisVerzeichnis)
    const workflowId = legeZweistufigenWorkflowAn(basisVerzeichnis, auftragId, 30000, { freigabe: 'ZWINGEND' })
    const testserver = await starteTestserver({ basisVerzeichnis, startvorlagePfad, ...startfreigabeOptionen() })
    schliessen = testserver.schliessen

    await fetch(`${testserver.basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
    const imHalt = await warteAufWorkflowStatus(workflowId, basisVerzeichnis, ['WARTET_FREIGABE', 'KLAERUNG_ERFORDERLICH', 'GESTOPPT', 'ABGESCHLOSSEN'], 60000)
    if (imHalt?.status !== 'WARTET_FREIGABE') {
      befunde.push(`(d) AK7: erwartet WARTET_FREIGABE vor der Ablehnung, erhalten ${JSON.stringify({ status: imHalt?.status, grund: imHalt?.grund })}`)
    } else {
      const abgelehnt = await fetch(`${testserver.basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/freigabe`, {
        method: 'POST',
        body: JSON.stringify({ schrittId: 'schritt-2', entscheidung: 'ABGELEHNT', begruendung: 'Realcheck: Schritt 2 so nicht.' }),
      })
      if (abgelehnt.status !== 200) {
        befunde.push(`(d) AK7: ABGELEHNT erwartet 200, erhalten ${abgelehnt.status} (${JSON.stringify(await abgelehnt.json().catch(() => ({})))})`)
      }
      await verzoegerung(300)
      const daten = ladeWorkflow(workflowId, basisVerzeichnis)
      if (daten?.status !== 'GESTOPPT' || daten?.aktiver_schritt_id !== null) {
        befunde.push(`(d) AK7: nach ABGELEHNT erwartet GESTOPPT mit Cursor null, erhalten ${JSON.stringify({ status: daten?.status, cursor: daten?.aktiver_schritt_id })}`)
      }
      if (daten?.schritte?.[1]?.lauf_id !== null) {
        befunde.push(`(d) AK7: ein abgelehnter Schritt darf NICHT gelaufen sein, erhalten ${JSON.stringify(daten?.schritte?.[1])}`)
      }
      if (typeof daten?.grund !== 'string' || !daten.grund.includes('Realcheck: Schritt 2 so nicht.')) {
        befunde.push(`(d) AK7: die Begründung des Menschen muss im Artefakt stehen, erhalten ${JSON.stringify(daten?.grund)}`)
      }

      // Der Reparaturpfad, real: dieselbe workflow_id, korrigierter Plan.
      const repariert = await fetch(`${testserver.basisUrl}/api/workflows`, {
        method: 'POST',
        body: JSON.stringify({
          ...daten,
          status: 'KLAERUNG_ERFORDERLICH',
          aktiver_schritt_id: 'schritt-2',
          ziel: 'Realcheck: korrigierte Fassung nach Ablehnung.',
          schritte: [daten.schritte[0], { ...daten.schritte[1], risiko: 'Nach Ablehnung überarbeitet.' }],
        }),
      })
      if (repariert.status !== 201) {
        befunde.push(`(d) AK7: nach einer Ablehnung muss eine korrigierte Fassung angenommen werden, erhalten ${repariert.status} (${await repariert.text()})`)
      } else {
        // Der Reparaturpfad wird ZU ENDE gegangen, nicht bei der 201 abgebrochen (QA-Pass
        // 10.09.2026, Fehler 2): eine Zusage „der Mensch kommt wieder heraus", die nur belegt,
        // dass ein POST angenommen wird, ist durch ein „POST wird immer angenommen" erfüllbar.
        //
        // Die korrigierte Fassung steht auf KLAERUNG_ERFORDERLICH mit dem Cursor auf dem
        // weiterhin ZWINGEND-Schritt — also OHNE persistiertes WARTET_FREIGABE. Dass die
        // Freigabe hier trotzdem greift, ist genau der Punkt: sie hängt am Urteil von
        // ermittleNaechstenSchritt, nicht am abgelegten Status. Hinge sie am Status, wäre
        // jede Reparaturfassung mit ZWINGEND-Schritt unbedienbar.
        const zweiteFreigabe = await fetch(`${testserver.basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/freigabe`, {
          method: 'POST',
          body: JSON.stringify({ schrittId: 'schritt-2', entscheidung: 'FREIGEGEBEN', begruendung: 'Realcheck: überarbeitete Fassung freigegeben.' }),
        })
        if (zweiteFreigabe.status !== 202) {
          befunde.push(
            `(d) AK7: die korrigierte Fassung muss freigebbar sein (ohne persistiertes WARTET_FREIGABE), erhalten ${zweiteFreigabe.status} (${JSON.stringify(await zweiteFreigabe.json().catch(() => ({})))})`
          )
        } else {
          const fertig = await warteAufWorkflowStatus(workflowId, basisVerzeichnis, ['ABGESCHLOSSEN', 'KLAERUNG_ERFORDERLICH', 'GESTOPPT'], 60000)
          const schritt2 = fertig?.schritte?.[1]
          if (fertig?.status !== 'ABGESCHLOSSEN' || schritt2?.status !== 'ERFOLGREICH') {
            befunde.push(
              `(d) AK7: nach der Freigabe der korrigierten Fassung muss die Kette real zu Ende laufen, erhalten ${JSON.stringify({ status: fertig?.status, grund: fertig?.grund, s2: schritt2?.status })}`
            )
          } else {
            const laufStatus2 = stelleLaufstatusFest(schritt2.lauf_id, { basisVerzeichnis, schreiber: STILL })
            if (laufStatus2.status !== 'ABGESCHLOSSEN' || laufStatus2.ergebnis !== 'ERFOLGREICH') {
              befunde.push(`(d) AK7: der nach der Reparatur gelaufene Schritt 2 hat keine terminale ERFOLGREICH-Kette, erhalten ${JSON.stringify(laufStatus2)}`)
            }
          }
        }
      }
      if (befunde.length === befundeVorAblehnung) {
        console.log(
          '✓ (d) AK7: eine reale ABGELEHNT-Entscheidung stoppt den Workflow (GESTOPPT, Cursor null, Begründung im Artefakt), der abgelehnte Schritt läuft NICHT — und der Reparaturpfad wird ZU ENDE begangen: korrigierte Fassung angenommen, erneut freigegeben (ohne persistiertes WARTET_FREIGABE) und real bis ABGESCHLOSSEN durchgelaufen.'
        )
      }
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
    rmSync(startvorlagePfad, { force: true })
  }
}

// ─── (e) F-216 real: Stopp MITTEN im Schritt, mit echtem Kindprozess ──────
//
// Die Zusage, die eine Attrappe nicht belegen kann: der Stopp bricht einen REALEN,
// hängenden Kindprozess ab, und der GESTOPPT-Schutz hält, während der abgebrochene
// Lauf noch fliegt und Sekunden später seine Nachbereitung durchläuft. In
// check-f15-workflow.mjs ist derselbe Ablauf mit einem Riegel nachgestellt — dort
// deterministisch, hier echt.
//
// Der zweite Teil desselben Blocks ist der Reparaturpfad: nach dem Stopp eine
// korrigierte Fassung einreichen und real starten. Ohne ihn wäre „der Mensch kommt
// wieder heraus" eine Behauptung.
{
  const basisVerzeichnis = 'kontrollzustand-test-f15-ws2c-stopp'
  const befundeVorStopp = befunde.length
  raeumeVerzeichnis(basisVerzeichnis)
  const haengePfad = schreibeTestStartvorlage('test-f15-ws2c-stopp-haengt.json', HAENGE_SKRIPT)
  const erfolgPfad = schreibeTestStartvorlage('test-f15-ws2c-stopp-erfolg.json', ERFOLG_SKRIPT)
  let schliessen = async () => {}
  // Für die Aufräumroutine (F-231), wie in (b): der hängende Kindprozess dieses Blocks
  // überlebt das Blockende, wenn der Stopp seinen Abbruch nicht auslöst — genau die
  // Manipulation, mit der dieser Block rot kalibriert wird.
  let basisUrl = null
  let laufIdDesBlocks = null
  try {
    const auftragId = registriereTestAuftrag(basisVerzeichnis)
    // Sehr große Zeitgrenze wie in (b): der Lauf soll ausschließlich durch den Stopp enden,
    // nicht durch einen Timeout-Wettlauf.
    const workflowId = legeZweistufigenWorkflowAn(basisVerzeichnis, auftragId, 600000)
    const testserver = await starteTestserver({ basisVerzeichnis, startvorlagePfad: haengePfad, ...startfreigabeOptionen() })
    schliessen = testserver.schliessen
    basisUrl = testserver.basisUrl

    const start = await fetch(`${testserver.basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
    const startKoerper = await start.json().catch(() => ({}))
    laufIdDesBlocks = startKoerper.laufId
    if (start.status !== 202) {
      befunde.push(`(e) F-216: Startaufruf erwartet 202, erhalten ${start.status} (${JSON.stringify(startKoerper)})`)
    } else {
      // Zeit geben, bis der echte Kindprozess läuft (run_prepared + Spawn) — ein Stopp VOR
      // dem Spawn belegte nicht den Abbruch eines laufenden Schritts.
      await verzoegerung(600)
      const antwort = await fetch(`${testserver.basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/stoppen`, {
        method: 'POST',
        body: JSON.stringify({ begruendung: 'Realcheck: die Kette soll stehen.' }),
      })
      const koerper = await antwort.json().catch(() => ({}))
      if (antwort.status !== 200 || koerper.laufAbgebrochen !== true) {
        befunde.push(`(e) F-216: ein Stopp mit real laufendem Schritt erwartet 200 mit laufAbgebrochen:true, erhalten ${antwort.status} (${JSON.stringify(koerper)})`)
      }
      // F-233: die Bezeugung. Eine Begründung, die nur im überschreibbaren grund der
      // Workflow-Version steht, ist als Spur einer Menschenentscheidung wertlos — GESTOPPT
      // ist ausdrücklich ersetzbar. Geprüft wird deshalb das Artefakt selbst, nicht nur das
      // Feld in der Antwort: sonst wäre die Zusage durch ein 'bezeugt: true' erfüllbar.
      if (koerper.bezeugt !== true || koerper.artefaktId !== `entscheidung-workflow-${workflowId}-stopp`) {
        befunde.push(`(e) F-233: die 200-Antwort muss die Bezeugung nennen, erhalten ${JSON.stringify(koerper)}`)
      }
      const bezeugung = ladeArtefaktVersion(`entscheidung-workflow-${workflowId}-stopp`, undefined, { basisVerzeichnis, schreiber: STILL })
      if (bezeugung === null) {
        befunde.push('(e) F-233: der Stopp muss ein Entscheidungsartefakt hinterlassen, es liegt keines vor')
      } else if (
        bezeugung.daten?.ergebnis !== 'GESTOPPT' ||
        bezeugung.daten?.begruendung !== 'Realcheck: die Kette soll stehen.' ||
        typeof bezeugung.daten?.entschieden_am !== 'string'
      ) {
        befunde.push(`(e) F-233: das Entscheidungsartefakt trägt nicht Ergebnis, Begründung und Zeitstempel, erhalten ${JSON.stringify(bezeugung.daten)}`)
      }
      // Der Stopp steht SOFORT, ohne auf das Laufende zu warten.
      const sofort = ladeWorkflow(workflowId, basisVerzeichnis)
      if (sofort?.status !== 'GESTOPPT' || sofort?.aktiver_schritt_id !== null) {
        befunde.push(`(e) F-216: der Stopp muss sofort auf der Platte stehen, erhalten ${JSON.stringify({ status: sofort?.status, cursor: sofort?.aktiver_schritt_id })}`)
      }

      // Laufende abwarten: die Nachbereitung des abgebrochenen Laufs kommt Sekunden später
      // und ist der eigentliche Prüfpunkt. Erkennbar daran, dass der Schritt LAEUFT verlässt.
      const start1 = Date.now()
      let daten = ladeWorkflow(workflowId, basisVerzeichnis)
      while (daten?.schritte?.[0]?.status === 'LAEUFT' && Date.now() - start1 < 60000) {
        await verzoegerung(200)
        daten = ladeWorkflow(workflowId, basisVerzeichnis)
      }
      const [schritt1, schritt2] = daten?.schritte ?? []
      if (daten?.status !== 'GESTOPPT') {
        befunde.push(`(e) F-216: GESTOPPT muss die Nachbereitung des abgebrochenen Laufs überleben, erhalten ${JSON.stringify({ status: daten?.status, grund: daten?.grund })}`)
      }
      if (typeof daten?.grund !== 'string' || !daten.grund.includes('Realcheck: die Kette soll stehen.')) {
        befunde.push(`(e) F-216: die Begründung des Menschen darf nicht überschrieben werden, erhalten ${JSON.stringify(daten?.grund)}`)
      }
      if (schritt1?.status === 'LAEUFT' || schritt1?.status === 'ERFOLGREICH') {
        befunde.push(`(e) F-216: der abgebrochene Schritt muss seinen tatsächlichen Ausgang bekommen (nicht LAEUFT, nicht ERFOLGREICH), erhalten ${JSON.stringify(schritt1)}`)
      }
      if (schritt2?.status !== 'OFFEN' || schritt2?.lauf_id !== null) {
        befunde.push(`(e) F-216: nach dem Stopp darf Schritt 2 NICHT gestartet sein, erhalten ${JSON.stringify(schritt2)}`)
      }
      const laufStatus1 = stelleLaufstatusFest(startKoerper.laufId, { basisVerzeichnis, schreiber: STILL })
      if (laufStatus1.status === 'ABGESCHLOSSEN' && laufStatus1.ergebnis === 'ERFOLGREICH') {
        befunde.push(`(e) F-216: der gestoppte Lauf wurde real als ERFOLGREICH klassifiziert, erhalten ${JSON.stringify(laufStatus1)}`)
      }

      // Der Reparaturpfad, real und zu Ende: GESTOPPT ist ersetzbar, die korrigierte Fassung
      // läuft. Eigene Serverinstanz mit der ERFOLG-Startvorlage — dieselbe Ablage.
      //
      // Vor dem Serverwechsel derselbe Abbruch wie in der Aufräumroutine (F-231): der Lauf
      // dieses Blocks ist hier zwar geendet, aber die Zusicherung soll nicht davon abhängen,
      // dass er es getan hat — nach dem Wechsel kennt keine Instanz mehr seinen Controller.
      await beendeLaufFallsAktiv(basisUrl, laufIdDesBlocks)
      await schliessen()
      const zweiter = await starteTestserver({ basisVerzeichnis, startvorlagePfad: erfolgPfad, ...startfreigabeOptionen() })
      schliessen = zweiter.schliessen
      basisUrl = zweiter.basisUrl
      laufIdDesBlocks = null
      const repariert = await fetch(`${zweiter.basisUrl}/api/workflows`, {
        method: 'POST',
        body: JSON.stringify({
          ...daten,
          status: 'KLAERUNG_ERFORDERLICH',
          aktiver_schritt_id: 'schritt-1',
          ziel: 'Realcheck: korrigierte Fassung nach dem Stopp.',
          schritte: [
            { ...daten.schritte[0], status: 'OFFEN', lauf_id: null },
            { ...daten.schritte[1], status: 'OFFEN', lauf_id: null },
          ],
        }),
      })
      if (repariert.status !== 201) {
        befunde.push(`(e) F-216: nach einem Stopp muss eine korrigierte Fassung angenommen werden, erhalten ${repariert.status} (${await repariert.text()})`)
      } else {
        const erneut = await fetch(`${zweiter.basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
        if (erneut.status !== 202) {
          befunde.push(`(e) F-216: die korrigierte Fassung muss real startbar sein, erhalten ${erneut.status} (${await erneut.text()})`)
        } else {
          const fertig = await warteAufWorkflowStatus(workflowId, basisVerzeichnis, ['ABGESCHLOSSEN', 'KLAERUNG_ERFORDERLICH', 'GESTOPPT'], 60000)
          if (fertig?.status !== 'ABGESCHLOSSEN' || fertig?.schritte?.[1]?.status !== 'ERFOLGREICH') {
            befunde.push(
              `(e) F-216: nach der Reparatur muss die Kette real bis ABGESCHLOSSEN laufen, erhalten ${JSON.stringify({ status: fertig?.status, grund: fertig?.grund, s2: fertig?.schritte?.[1]?.status })}`
            )
          }
        }
      }
      if (befunde.length === befundeVorStopp) {
        console.log(
          '✓ (e) F-216: POST /api/workflows/<id>/stoppen bricht einen REALEN, hängenden Kindprozess ab (200, laufAbgebrochen:true), GESTOPPT steht sofort und überlebt die Nachbereitung des noch fliegenden Laufs samt Begründung, Schritt 1 bekommt seinen tatsächlichen Ausgang, Schritt 2 startet NICHT — und der Reparaturpfad wird zu Ende begangen: korrigierte Fassung angenommen, real gestartet, bis ABGESCHLOSSEN durchgelaufen. F-233: die Entscheidung liegt als Artefakt entscheidung-workflow-<id>-stopp vor (ergebnis GESTOPPT, Begründung, Zeitstempel).'
        )
      }
    }
  } finally {
    // Erst den Kindprozess, dann den Server (F-231), wie in (b).
    await beendeLaufFallsAktiv(basisUrl, laufIdDesBlocks)
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
    rmSync(haengePfad, { force: true })
    rmSync(erfolgPfad, { force: true })
  }
}

// ─── (f) F-216 real: Stopp OHNE aktiven Lauf ───────────────────────────────
//
// Der Fall, für den der Endpunkt überhaupt auf den WORKFLOW zielt und nicht auf eine
// laufId: zwischen zwei Schritten läuft nichts, und POST /api/laeufe/<id>/abbrechen
// wäre hier gar nicht bedienbar. Es darf trotzdem gestoppt werden — und es darf dabei
// nichts abgebrochen werden, was jemand anderem gehört.
{
  const basisVerzeichnis = 'kontrollzustand-test-f15-ws2c-stopp-leer'
  const befundeVorLeer = befunde.length
  raeumeVerzeichnis(basisVerzeichnis)
  const startvorlagePfad = schreibeTestStartvorlage('test-f15-ws2c-stopp-leer.json', ERFOLG_SKRIPT)
  let schliessen = async () => {}
  try {
    const auftragId = registriereTestAuftrag(basisVerzeichnis)
    const workflowId = legeZweistufigenWorkflowAn(basisVerzeichnis, auftragId, 30000)
    const testserver = await starteTestserver({ basisVerzeichnis, startvorlagePfad, ...startfreigabeOptionen() })
    schliessen = testserver.schliessen

    const antwort = await fetch(`${testserver.basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/stoppen`, {
      method: 'POST',
      body: JSON.stringify({ begruendung: 'Realcheck: Stopp vor dem ersten Schritt.' }),
    })
    const koerper = await antwort.json().catch(() => ({}))
    if (antwort.status !== 200 || koerper.laufAbgebrochen !== false) {
      befunde.push(`(f) F-216: ein Stopp ohne aktiven Lauf erwartet 200 mit laufAbgebrochen:false, erhalten ${antwort.status} (${JSON.stringify(koerper)})`)
    }
    const daten = ladeWorkflow(workflowId, basisVerzeichnis)
    if (daten?.status !== 'GESTOPPT' || daten?.aktiver_schritt_id !== null || daten?.schritte?.[0]?.lauf_id !== null) {
      befunde.push(`(f) F-216: erwartet GESTOPPT mit Cursor null und ungelaufenen Schritten, erhalten ${JSON.stringify({ status: daten?.status, cursor: daten?.aktiver_schritt_id, s1: daten?.schritte?.[0] })}`)
    }
    // Und danach ist wirklich Schluss: der Start prallt an Regel 0 ab.
    const start = await fetch(`${testserver.basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
    const startKoerper = await start.json().catch(() => ({}))
    if (start.status !== 409 || startKoerper.art !== 'haltGestoppt') {
      befunde.push(`(f) F-216: ein gestoppter Workflow darf nicht mehr startbar sein, erhalten ${start.status} (${JSON.stringify(startKoerper)})`)
    }
    if (befunde.length === befundeVorLeer) {
      console.log(
        '✓ (f) F-216: ein Workflow ohne aktiven Lauf lässt sich stoppen (200, laufAbgebrochen:false, GESTOPPT mit Cursor null, kein Schritt angefasst) — und ist danach nicht mehr startbar (409, haltGestoppt).'
      )
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
    rmSync(startvorlagePfad, { force: true })
  }
}

// ─── (g) F-239: ein Stopp bricht NUR den eigenen Lauf ab ───────────────────
//
// Die tragende Zusage des Stopp-Endpunkts und bis (b2) die einzige unbelegte:
// abgebrochen wird nur, wenn der aktive Lauf laut ARTEFAKT zu DIESEM Workflow
// gehört — ein Schritt auf LAEUFT, dessen lauf_id die des aktiven Laufs ist. In
// allen anderen Fällen dieser Datei ist entweder kein Lauf aktiv oder der aktive
// gehört zum gestoppten Workflow; beide Male liefert ein bloßes `laufAktiv`
// dasselbe Ergebnis, und ein Rückbau auf `laufAktiv` bliebe unbemerkt (QA-Pass
// 10.09.2026, Fehler 1). Nach ARCHITECTURE.md §8 galt die Grenze damit als nicht
// erzwungen.
//
// Der Fall braucht zwingend die REALE Kette: dass ein fremder Kindprozess den
// Stopp überlebt und danach regulär zu Ende läuft, kann eine Attrappe nicht
// belegen — sie hat keinen Prozess, den man versehentlich töten könnte.
//
// Workflow B startet NICHTS, und das ist kein Versäumnis des Falls, sondern
// seine Voraussetzung: D13 lässt genau einen aktiven Arbeitsstrang zu. Der
// Mensch, der B stoppt, während A läuft, ist der Normalfall — nicht die
// Ausnahme.
{
  const basisVerzeichnis = 'kontrollzustand-test-f15-ws2c-fremdlauf'
  const befundeVorFremdlauf = befunde.length
  raeumeVerzeichnis(basisVerzeichnis)
  const startvorlagePfad = schreibeTestStartvorlage('test-f15-ws2c-fremdlauf.json', VERZOEGERTER_ERFOLG_SKRIPT)
  let schliessen = async () => {}
  let basisUrl = null
  let laufIdVonA = null
  try {
    const auftragId = registriereTestAuftrag(basisVerzeichnis)
    const workflowA = legeZweistufigenWorkflowAn(basisVerzeichnis, auftragId, 30000)
    const workflowB = legeZweistufigenWorkflowAn(basisVerzeichnis, auftragId, 30000)
    const testserver = await starteTestserver({ basisVerzeichnis, startvorlagePfad, ...startfreigabeOptionen() })
    schliessen = testserver.schliessen
    basisUrl = testserver.basisUrl

    const start = await fetch(`${testserver.basisUrl}/api/workflows/${encodeURIComponent(workflowA)}/starten`, { method: 'POST' })
    const startKoerper = await start.json().catch(() => ({}))
    laufIdVonA = startKoerper.laufId
    if (start.status !== 202) {
      befunde.push(`(g) F-239: der Start von Workflow A erwartet 202, erhalten ${start.status} (${JSON.stringify(startKoerper)})`)
    } else {
      // Warten, bis der echte Kindprozess von A wirklich läuft — sonst belegte der Fall nur,
      // dass ein Stopp einen noch nicht gestarteten Lauf nicht abbricht.
      await verzoegerung(600)

      const antwort = await fetch(`${testserver.basisUrl}/api/workflows/${encodeURIComponent(workflowB)}/stoppen`, {
        method: 'POST',
        body: JSON.stringify({ begruendung: 'Realcheck: B stoppen, während A läuft.' }),
      })
      const koerper = await antwort.json().catch(() => ({}))
      if (antwort.status !== 200 || koerper.laufAbgebrochen !== false) {
        befunde.push(`(g) F-239: ein Stopp darf einen FREMDEN Lauf nicht abbrechen — erwartet 200 mit laufAbgebrochen:false, erhalten ${antwort.status} (${JSON.stringify(koerper)})`)
      }

      // B ist gestoppt — die Wirkung auf den adressierten Workflow bleibt vollständig.
      const bDaten = ladeWorkflow(workflowB, basisVerzeichnis)
      if (bDaten?.status !== 'GESTOPPT' || bDaten?.aktiver_schritt_id !== null) {
        befunde.push(`(g) F-239: der adressierte Workflow B muss gestoppt sein, erhalten ${JSON.stringify({ status: bDaten?.status, cursor: bDaten?.aktiver_schritt_id })}`)
      }

      // A ist unangetastet: weder gestoppt noch angehalten, und sein Schritt läuft noch.
      const aWaehrend = ladeWorkflow(workflowA, basisVerzeichnis)
      if (aWaehrend?.status === 'GESTOPPT') {
        befunde.push(`(g) F-239: der Stopp von B darf Workflow A nicht stoppen, erhalten ${JSON.stringify({ status: aWaehrend?.status, grund: aWaehrend?.grund })}`)
      }
      if (aWaehrend?.schritte?.[0]?.status !== 'LAEUFT') {
        befunde.push(`(g) F-239: der Schritt von A muss beim Stopp von B noch laufen, erhalten ${JSON.stringify(aWaehrend?.schritte?.[0])}`)
      }

      // Und der eigentliche Beleg: A läuft REGULÄR zu Ende. Wäre sein Kindprozess vom Stopp
      // getroffen worden, endete er nicht ERFOLGREICH — der Abbruch ist an dieser Stelle
      // nicht durch einen Statuseintrag vorgetäuscht, sondern am Prozess selbst entschieden.
      const aFertig = await warteAufWorkflowStatus(workflowA, basisVerzeichnis, ['ABGESCHLOSSEN', 'KLAERUNG_ERFORDERLICH', 'GESTOPPT'], 60000)
      if (aFertig?.status !== 'ABGESCHLOSSEN' || aFertig?.schritte?.[0]?.status !== 'ERFOLGREICH' || aFertig?.schritte?.[1]?.status !== 'ERFOLGREICH') {
        befunde.push(
          `(g) F-239: Workflow A muss nach dem Stopp von B real zu Ende laufen, erhalten ${JSON.stringify({ status: aFertig?.status, grund: aFertig?.grund, s1: aFertig?.schritte?.[0]?.status, s2: aFertig?.schritte?.[1]?.status })}`
        )
      } else {
        const laufStatusA = stelleLaufstatusFest(startKoerper.laufId, { basisVerzeichnis, schreiber: STILL })
        if (laufStatusA.status !== 'ABGESCHLOSSEN' || laufStatusA.ergebnis !== 'ERFOLGREICH') {
          befunde.push(`(g) F-239: der Lauf von A muss eine terminale ERFOLGREICH-Kette haben, erhalten ${JSON.stringify(laufStatusA)}`)
        }
      }
      // Der Stopp von B ist trotzdem bezeugt — ein Stopp ohne fremden Lauf ist ein voller Stopp.
      const bezeugungB = ladeArtefaktVersion(`entscheidung-workflow-${workflowB}-stopp`, undefined, { basisVerzeichnis, schreiber: STILL })
      if (bezeugungB?.daten?.ergebnis !== 'GESTOPPT') {
        befunde.push(`(g) F-239: auch dieser Stopp muss bezeugt sein, erhalten ${JSON.stringify(bezeugungB?.daten)}`)
      }
      if (befunde.length === befundeVorFremdlauf) {
        console.log(
          '✓ (g) F-239: ein Stopp von Workflow B bricht den REALEN Lauf von Workflow A nicht ab (200, laufAbgebrochen:false) — B ist gestoppt und bezeugt, A läuft unangetastet weiter und real bis ABGESCHLOSSEN durch, mit terminaler ERFOLGREICH-Kette.'
        )
      }
    }
  } finally {
    await beendeLaufFallsAktiv(basisUrl, laufIdVonA)
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
    rmSync(startvorlagePfad, { force: true })
  }
}

// ─── Ergebnis ───────────────────────────────────────────────────────────────
console.log('')
if (befunde.length === 0) {
  console.log('✓ Keine Befunde.\n')
  process.exitCode = 0
} else {
  console.log(`✗ ${befunde.length} Befund(e):\n`)
  for (const b of befunde) console.log(`  - ${b}`)
  console.log('')
  process.exitCode = 1
}
