/**
 * Datei: scripts/verify-rename-atomicity.mjs
 *
 * Zweck: Einmaliger, manueller Nachweis (kein Teil von `npm run check`/
 * `check:template`, kein CI, kein Dauerbetrieb) fuer die Windows-
 * Rename-Atomaritaet, die der Checkpoint Store fuer sein
 * Temp+Rename-Schreibmuster voraussetzt (D4,
 * state/plan-v1-feature1-checkpoint-store.md Abschnitt 4.4). Prueft
 * die Dateisystem-Primitive selbst, nicht spaeteren Modulcode unter
 * src/checkpoint-store/ (das Modul existiert zum Zeitpunkt dieses
 * Nachweises noch nicht).
 *
 * Stefans Entscheidung (Option B, Nachtrag 2026-08-29 zu
 * state/tasks/f1-checkpoint-store.md): einige hundert Rename-Zyklen,
 * waehrend eines Teils davon ein offenes Read-Handle auf der Zieldatei
 * (simulierter Virenscanner-/Backup-Lock), EPERM/EBUSY zaehlen. Ein
 * unabhaengiger Leser-Kindprozess liest waehrend der gesamten Laufzeit
 * parallel und prueft, ob er je eine leere oder unvollstaendige
 * Zieldatei sieht - das ist der eigentliche Atomaritaetsnachweis.
 *
 * Bekannte Grenze, ehrlich dokumentiert statt verschwiegen: Node oeffnet
 * Lesehandles auf Windows standardmaessig mit FILE_SHARE_READ|WRITE|
 * DELETE. Ein von diesem Skript aus Node heraus gehaltenes Read-Handle
 * reproduziert damit moeglicherweise NICHT dieselbe Sperre wie ein
 * Virenscanner/Backup-Tool, das exklusiver oeffnet. EPERM/EBUSY = 0 ist
 * deshalb kein Beleg, dass echte Drittsperren nie auftreten - nur, dass
 * dieses Skript sie mit Node-eigenen Mitteln nicht ausloesen konnte.
 * Der Leser-Nachweis (leere/unvollstaendige Datei) ist davon unabhaengig
 * und bleibt der eigentliche Beleg fuer D4.
 *
 * Aufruf: node scripts/verify-rename-atomicity.mjs
 * Exit 0 = kein Leser hat je eine leere/unvollstaendige Datei gesehen
 * Exit 1 = mindestens ein Leser hat eine leere/unvollstaendige Datei
 *          gesehen, oder ein unerwarteter (nicht EPERM/EBUSY) Fehler trat auf
 */

import { writeFileSync, renameSync, openSync, closeSync, mkdtempSync, rmSync, existsSync } from 'node:fs'
import { tmpdir, platform } from 'node:os'
import { join } from 'node:path'
import { fork } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ZYKLEN = 300
const SPERR_INTERVALL = 3 // jeder dritte Zyklus simuliert ein offenes Read-Handle

// ─── Leser-Kindprozess-Modus ────────────────────────────────────────────────
// Dieses Skript startet sich selbst mit --leser <pfad> als Kindprozess neu.
if (process.argv[2] === '--leser') {
  const zielpfad = process.argv[3]
  const befunde = []
  let lesevorgaenge = 0

  function istVollstaendigesJson(text) {
    if (text.length === 0) return false
    try {
      const geparst = JSON.parse(text)
      return typeof geparst.zyklus === 'number' && typeof geparst.fuellung === 'string'
    } catch {
      return false
    }
  }

  const { readFileSync } = await import('node:fs')

  const intervall = setInterval(() => {
    if (!existsSync(zielpfad)) return
    let text
    try {
      text = readFileSync(zielpfad, 'utf8')
    } catch (fehler) {
      if (fehler.code === 'ENOENT') return // Rename-Fenster, Datei kurzzeitig weg - erwartet
      befunde.push(`Lesefehler ${fehler.code}: ${fehler.message}`)
      return
    }
    lesevorgaenge++
    if (!istVollstaendigesJson(text)) {
      befunde.push(`unvollstaendiger/leerer Inhalt gesehen: ${JSON.stringify(text)}`)
    }
  }, 0)

  process.on('message', (nachricht) => {
    if (nachricht === 'stop') {
      clearInterval(intervall)
      process.send({ lesevorgaenge, befunde })
      process.exit(0)
    }
  })
  process.send('bereit')
  // Kindprozess laeuft weiter, bis 'stop' empfangen wird.
} else {
  // ─── Schreiber/Orchestrator-Modus ─────────────────────────────────────────
  console.log('\n=== Windows-Rename-Atomaritaetsnachweis ===\n')
  console.log(`Plattform: ${platform()}`)
  console.log(`Zyklen: ${ZYKLEN}, simulierte Sperre jeden ${SPERR_INTERVALL}. Zyklus\n`)

  const arbeitsverzeichnis = mkdtempSync(join(tmpdir(), 'rename-atomaritaet-'))
  const zielpfad = join(arbeitsverzeichnis, 'ziel.json')
  const tempPfad = join(arbeitsverzeichnis, 'ziel.json.tmp')

  function inhaltFuer(zyklus) {
    const fuellung = 'x'.repeat(50 + (zyklus % 50))
    return JSON.stringify({ zyklus, fuellung })
  }

  writeFileSync(tempPfad, inhaltFuer(0))
  renameSync(tempPfad, zielpfad)

  const eigenerPfad = fileURLToPath(import.meta.url)
  const leser = fork(eigenerPfad, ['--leser', zielpfad], { stdio: 'inherit' })

  // Wartet, bis der Leser-Kindprozess bereit ist (eigener Prozessstart
  // dauert laenger als ein einzelner Schreib-/Rename-Zyklus) - sonst
  // laeuft der Schreiber-Loop durch, bevor der Leser ueberhaupt einmal
  // gelesen hat, und der Nachweis waere wertlos (real beobachtet: 1
  // Lesevorgang bei 300 Zyklen ohne dieses Warten).
  await new Promise((resolve) => leser.once('message', resolve))

  function schlafeSynchron(ms) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
  }

  let epermEbusyAnzahl = 0
  let unerwarteteFehlerAnzahl = 0
  const unerwarteteFehlerDetails = []

  for (let zyklus = 1; zyklus <= ZYKLEN; zyklus++) {
    schlafeSynchron(5) // gibt dem Leser-Prozess Zeit fuer mehrere Lesevorgaenge pro Zyklus
    writeFileSync(tempPfad, inhaltFuer(zyklus))

    const mitSperre = zyklus % SPERR_INTERVALL === 0
    let offenerHandle = null
    if (mitSperre) {
      try {
        offenerHandle = openSync(zielpfad, 'r')
      } catch {
        offenerHandle = null
      }
    }

    try {
      renameSync(tempPfad, zielpfad)
    } catch (fehler) {
      if (fehler.code === 'EPERM' || fehler.code === 'EBUSY') {
        epermEbusyAnzahl++
      } else {
        unerwarteteFehlerAnzahl++
        unerwarteteFehlerDetails.push(`Zyklus ${zyklus}: ${fehler.code}: ${fehler.message}`)
      }
    } finally {
      if (offenerHandle !== null) closeSync(offenerHandle)
    }
  }

  const leserErgebnis = await new Promise((resolve) => {
    leser.once('message', resolve)
    leser.send('stop')
  })

  rmSync(arbeitsverzeichnis, { recursive: true, force: true })

  console.log(`Leser-Lesevorgaenge: ${leserErgebnis.lesevorgaenge}`)
  console.log(`Simulierte Sperr-Zyklen (offenes Read-Handle waehrend Rename): ${Math.floor(ZYKLEN / SPERR_INTERVALL)}`)
  console.log(`EPERM/EBUSY beobachtet: ${epermEbusyAnzahl}`)
  console.log(`Unerwartete Fehler (Schreiber): ${unerwarteteFehlerAnzahl}`)
  for (const detail of unerwarteteFehlerDetails) console.log(`  - ${detail}`)
  console.log(`Leser-Befunde: ${leserErgebnis.befunde.length}`)
  for (const befund of leserErgebnis.befunde) console.log(`  - ${befund}`)
  console.log('')

  if (leserErgebnis.befunde.length > 0 || unerwarteteFehlerAnzahl > 0) {
    console.log('✗ Nachweis fehlgeschlagen.\n')
    process.exit(1)
  }

  console.log(
    `✓ Kein Leser sah je eine leere oder unvollstaendige Zieldatei ueber ${ZYKLEN} Zyklen ` +
      `(davon ${Math.floor(ZYKLEN / SPERR_INTERVALL)} mit simuliertem Read-Handle).\n`
  )
  process.exit(0)
}
