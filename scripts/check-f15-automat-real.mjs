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

const befunde = []
console.log('\n=== F15-Automat-Realcheck (WS-2c, AK6b + F-208) ===\n')

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
  rmSync(STARTFREIGABE_REPO, { recursive: true, force: true })
  rmSync(PROJEKT_VERZEICHNIS, { recursive: true, force: true })
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

function schrittFixture(schrittId, nachfolger, zeitgrenzeMs) {
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
  }
}

/** Legt einen zweistufigen Workflow direkt über registriereWorkflow an (am Endpunkt vorbei — der ist in check-f15-workflow.mjs geprüft). @returns workflowId */
function legeZweistufigenWorkflowAn(basisVerzeichnis, auftragId, zeitgrenzeMs) {
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
      schritte: [schrittFixture('schritt-1', 'schritt-2', zeitgrenzeMs), schrittFixture('schritt-2', null, zeitgrenzeMs)],
    },
    leiteProfilReferenzAb(ladeStartvorlage('startvorlagen/beispielprojekt.json')),
    { basisVerzeichnis, schreiber: STILL }
  )
  return workflowId
}

// ─── (a) AK6b real: EIN Startaufruf, zwei reale Läufe ──────────────────────
{
  const basisVerzeichnis = 'kontrollzustand-test-f15-ws2c-auto'
  rmSync(basisVerzeichnis, { recursive: true, force: true })
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
    rmSync(basisVerzeichnis, { recursive: true, force: true })
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
  rmSync(basisVerzeichnis, { recursive: true, force: true })
  const startvorlagePfad = schreibeTestStartvorlage('test-f15-ws2c-abbruch.json', HAENGE_SKRIPT)
  let schliessen = async () => {}
  try {
    const auftragId = registriereTestAuftrag(basisVerzeichnis)
    // Sehr große Zeitgrenze: der Lauf soll ausschließlich durch den manuellen Abbruch enden,
    // nicht durch einen Timeout-Wettlauf — sonst prüfte der Fall den Timeout-Pfad aus F14.
    const workflowId = legeZweistufigenWorkflowAn(basisVerzeichnis, auftragId, 600000)
    const testserver = await starteTestserver({ basisVerzeichnis, startvorlagePfad, ...startfreigabeOptionen() })
    schliessen = testserver.schliessen

    const start = await fetch(`${testserver.basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
    const startKoerper = await start.json().catch(() => ({}))
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
    await schliessen()
    rmSync(basisVerzeichnis, { recursive: true, force: true })
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
