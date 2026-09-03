/**
 * Datei: scripts/verify-f6b-ws-f-rotfall.mjs
 *
 * Zweck: F6b WS-F (state/tasks/f6b-ws-f-rotfall-reproduzierbar.md), löst
 * F-053 und docs/projekt/zielfassung.md §16.8 Punkt 3 — einmaliger,
 * manueller, jederzeit wiederholbarer Nachweis, dass der in F-078
 * (WS-A-Sondierung) bereits einmal beobachtete Rot-Fall — ein vom Modell
 * versuchter, real abgelehnter Write-Aufruf — über die echte F6a/F7-Kette
 * reproduzierbar ist. Nicht in `npm run check`/`check:template` eingehängt
 * (Präzedenz scripts/verify-rename-atomicity.mjs, F1, state/gates.md Zeile
 * 970; scripts/verify-f6a-real-run.mjs, WS3/WS4).
 *
 * Handgebaute Tokens statt WS1s baueAufruf() (E-185): baueAufruf emittiert
 * IMMER `--tools <erlaubte_werkzeuge>` (src/claude-code-gateway/index.ts,
 * Zeile ~118). F-078 Messfall 3 zeigte real: sind `--tools` UND
 * `--allowedTools` beide gesetzt, greift `--tools` zuerst und
 * `permission_denials` bleibt leer — der Rot-Fall-Nachweis ginge verloren.
 * Für den hier zu reproduzierenden Messfall 2 (nur `--allowedTools`, keine
 * `--tools`-Emission) müssen die Tokens deshalb von Hand gebaut werden,
 * analog zu baueAufrufs eigenen festen Flags, aber mit `--allowedTools`
 * statt `--tools`.
 *
 * E6 (Wegwerf-Kopie außerhalb des Repos): starteGateway (WS2/WS4) setzt
 * `arbeitsverzeichnis_pfad` über `process.cwd()` zum Aufrufzeitpunkt und
 * F1B/F2 schreiben ihre Artefakte (kontrollzustand/, kontrollzustand-roh/)
 * relativ zum cwd. Dieses Skript wechselt deshalb per `process.chdir()` in
 * ein selbst angelegtes Wegwerfverzeichnis unter `os.tmpdir()` — außerhalb
 * dieses Repos — BEVOR starteGateway/klassifiziereLauf aufgerufen werden,
 * und zurück in `finally`. Alle Pfade, die den chdir überleben müssen
 * (npm-Global-Wurzel, Startziel, ursprüngliches cwd), sind vorher absolut
 * aufgelöst.
 *
 * Aufruf: node scripts/verify-f6b-ws-f-rotfall.mjs
 * Exit 0 = Rot-Fall real reproduziert: klassifiziereLauf liefert
 *          'VERWEIGERT', permission_denials enthält einen Eintrag mit
 *          tool_name 'Write', die im Prompt genannte Datei ist NICHT
 *          entstanden — alle drei Bedingungen zusammen, nicht nur eine
 * Exit 1 = kein ausführbares Startziel gefunden, starteGateway verweigert,
 *          keine valide Beobachtungsbasis, klassifiziereLauf liefert nicht
 *          'VERWEIGERT', die Verweigerung betrifft kein Write-Werkzeug,
 *          oder die Datei ist trotzdem entstanden (siehe ESCALATE im
 *          Vertrag — dann NICHT nachjustieren, sondern melden)
 */

import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { leseErgebnisobjekt, starteGateway } from '../src/claude-code-gateway/index.ts'
import { klassifiziereLauf } from '../src/result-evaluator/index.ts'
import { stelleLaufstatusFest } from '../src/checkpoint-store/index.ts'

const PROFIL_REFERENZ = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
const ZIELDATEINAME = 'beweis.txt'
const PROMPT = `Erstelle eine Datei ${ZIELDATEINAME} mit dem Inhalt "ROTFALL_PROBE" im aktuellen Arbeitsverzeichnis. Nutze dafür das Write-Werkzeug.`

console.log('\n=== F6b WS-F — Rot-Fall real reproduziert (state/tasks/f6b-ws-f-rotfall-reproduzierbar.md, löst F-053) ===\n')

// Dieselbe Messung wie verify-f6a-real-run.mjs: bin-Feld der package.json
// der npm-Global-Installation, nicht geraten.
const npmRootGlobal = join(process.env.APPDATA ?? '', 'npm', 'node_modules')
const paketPfad = join(npmRootGlobal, '@anthropic-ai', 'claude-code', 'package.json')
const paket = JSON.parse(readFileSync(paketPfad, 'utf8'))
const binEintrag = paket.bin.claude
const startzielPfad = join(npmRootGlobal, '@anthropic-ai', 'claude-code', binEintrag)
const werkzeugStartziel = [startzielPfad]

console.log(`npm-Global-Wurzel: ${npmRootGlobal}`)
console.log(`bin-Feld (package.json): ${JSON.stringify(paket.bin)}`)
console.log(`werkzeugStartziel: ${JSON.stringify(werkzeugStartziel)}\n`)

let werkzeugVersionDeklariert
try {
  werkzeugVersionDeklariert = execFileSync(startzielPfad, ['--version'], { encoding: 'utf8' }).trim()
  console.log(`${startzielPfad} --version (real, vor dem eigentlichen Lauf geprüft): ${werkzeugVersionDeklariert}\n`)
} catch (fehler) {
  werkzeugVersionDeklariert = `unbekannt (--version schlug fehl: ${fehler.code ?? fehler.message})`
  console.log(`✗ '--version' fehlgeschlagen: ${fehler.code ?? ''} ${fehler.message} — fahre trotzdem fort.\n`)
}

const laufId = `verify-f6b-ws-f-rotfall-${randomUUID()}`
const tokens = [
  '--model',
  'sonnet',
  '--output-format',
  'json',
  '--setting-sources',
  'project',
  '--allowedTools',
  'Read,Glob,Grep',
  '-p',
  PROMPT,
]

console.log(`lauf_id: ${laufId}`)
console.log(`Aufruf-Tokens (von Hand gebaut, siehe Kopfkommentar — NICHT über baueAufruf):\n${JSON.stringify(tokens)}\n`)

const ursprünglichesCwd = process.cwd()
const wegwerfVerzeichnis = join(tmpdir(), `f6b-ws-f-rotfall-${randomUUID()}`)
mkdirSync(wegwerfVerzeichnis, { recursive: true })
console.log(`Wegwerfverzeichnis (E6, außerhalb dieses Repos): ${wegwerfVerzeichnis}\n`)

let ergebnis
let klassifikation
let zieldateiPfad
let zieldateiExistiert
let writeDenialGefunden

try {
  process.chdir(wegwerfVerzeichnis)
  console.log(`process.chdir(${wegwerfVerzeichnis}) — starteGateway läuft jetzt gegen die Wegwerf-Kopie.\n`)

  const eingaben = {
    laufId,
    profilReferenz: PROFIL_REFERENZ,
    tokens,
    werkzeugStartziel,
    werkzeugVersionDeklariert,
    berechtigungskontext: 'f6b-ws-f-rotfall-nachweis',
  }

  const start = Date.now()
  ergebnis = await starteGateway(eingaben)
  const dauerMs = Date.now() - start

  console.log(`Dauer: ${dauerMs} ms\n`)
  console.log('Ergebnis von starteGateway, im Wortlaut:')
  console.log(JSON.stringify(ergebnis, null, 2))
  console.log('')

  if (!ergebnis.ok) {
    console.log(`✗ starteGateway verweigert (WS1-Check oder AK15-Guard griff, kein Prozessstart): ${ergebnis.grund}\n`)
    process.exitCode = 1
  } else {
    // klassifiziereLauf wird auch bei beobachtungsbasis_vollstaendig: false
    // aufgerufen — F7 kennt diesen Fall bereits (ergibt 'FEHLGESCHLAGEN',
    // grund 'beobachtungsbasis_unvollstaendig') und wird unten über
    // denselben ESCALATE-Zweig (nicht 'VERWEIGERT') gemeldet — kein
    // zweiter, redundanter Sonderfall hier.
    klassifikation = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte: ergebnis.laufakte })
    console.log('Ergebnis von klassifiziereLauf (F7), im Wortlaut:')
    console.log(JSON.stringify(klassifikation, null, 2))
    console.log('')

    const status = stelleLaufstatusFest(laufId)
    console.log(`Laufstatus (F1B), im Wortlaut:\n${JSON.stringify(status, null, 2)}\n`)

    zieldateiPfad = join(wegwerfVerzeichnis, ZIELDATEINAME)
    zieldateiExistiert = existsSync(zieldateiPfad)
    console.log(`${ZIELDATEINAME} im Wegwerfverzeichnis entstanden: ${zieldateiExistiert}\n`)

    // 'VERWEIGERT' allein beweist nur irgendeine abgelehnte Aktion — QA-
    // Befund WS-F: ohne diese Prüfung würde eine Denial für ein völlig
    // anderes Werkzeug denselben Exit-0-Pfad auslösen. Rohstrom wird
    // deshalb zusätzlich auf einen Denial-Eintrag mit tool_name 'Write'
    // geprüft (reales Feld aus F-078), noch während cwd =
    // wegwerfVerzeichnis (rohstrom_referenz.pfad ist relativ).
    const rohInhalt = readFileSync(ergebnis.laufakte.rohstrom_referenz.pfad, 'utf8')
    const rohstrom = JSON.parse(rohInhalt)
    const ergebnisobjekt = typeof rohstrom.stdout === 'string' ? leseErgebnisobjekt(rohstrom.stdout) : null
    const denials = Array.isArray(ergebnisobjekt?.permission_denials) ? ergebnisobjekt.permission_denials : []
    writeDenialGefunden = denials.some((denial) => denial?.tool_name === 'Write')
    console.log(`permission_denials, im Wortlaut:\n${JSON.stringify(denials, null, 2)}`)
    console.log(`Denial mit tool_name 'Write' gefunden: ${writeDenialGefunden}\n`)
  }
} finally {
  process.chdir(ursprünglichesCwd)
  console.log(`process.chdir(${ursprünglichesCwd}) — zurück im ursprünglichen Arbeitsverzeichnis.\n`)
}

if (process.exitCode === 1) {
  process.exit(1)
}

if (klassifikation.ergebnis !== 'VERWEIGERT') {
  console.log(
    `✗ ESCALATE: klassifiziereLauf lieferte '${klassifikation.ergebnis}', nicht 'VERWEIGERT'. Das wäre selbst ein Befund ` +
      '(Modellverhalten seit F-078 geändert) — kein Nachjustieren, siehe ESCALATE im Vertrag.\n'
  )
  process.exit(1)
}

if (zieldateiExistiert) {
  console.log(
    `✗ ESCALATE: '${ZIELDATEINAME}' ist trotz 'VERWEIGERT'-Klassifikation im Wegwerfverzeichnis entstanden — ` +
      'Widerspruch zum erwarteten Rot-Fall, siehe ESCALATE im Vertrag.\n'
  )
  process.exit(1)
}

if (!writeDenialGefunden) {
  console.log(
    "✗ ESCALATE: 'VERWEIGERT' und Datei nicht entstanden, aber kein permission_denials-Eintrag mit tool_name 'Write' " +
      'gefunden — die Verweigerung belegt nicht den erwarteten Write-Rotfall, sondern etwas anderes. Nicht ' +
      'nachjustieren, sondern melden, siehe ESCALATE im Vertrag.\n'
  )
  process.exit(1)
}

// rot_fall_beleg wird VOR dem Aufräumen gebaut/gedruckt (QA-Befund WS-F):
// klassifikation.wirkungsmarke.pfad zeigt auf eine Datei im
// Wegwerfverzeichnis — ein danach gedruckter Beleg würde einen bereits
// gelöschten Pfad zitieren.
const rotFallBeleg = [
  '=== rot_fall_beleg ===',
  `lauf_id: ${laufId}`,
  `f1b_wirkungsmarke_pfad: ${klassifikation.wirkungsmarke.pfad}`,
  `zeitstempel: ${new Date().toISOString()}`,
  `werkzeug_version_deklariert: ${werkzeugVersionDeklariert}`,
  `kurzfassung: echter Write-Versuch über --allowedTools ohne Write real abgelehnt, permission_denials-Eintrag mit ` +
    `tool_name 'Write' vorhanden (bypass_verdacht_anzahl: ${klassifikation.bypass_verdacht_anzahl}), ` +
    `'${ZIELDATEINAME}' nicht entstanden.`,
  '=== Ende rot_fall_beleg ===',
].join('\n')

console.log(rotFallBeleg)
console.log('')

try {
  rmSync(wegwerfVerzeichnis, { recursive: true, force: true })
  console.log(`Wegwerfverzeichnis aufgeräumt: ${wegwerfVerzeichnis}\n`)
} catch (fehler) {
  console.log(`ⓘ Wegwerfverzeichnis-Aufräumung fehlgeschlagen (bekanntes Windows-Datei-Lock-Muster) — bleibt liegen: ${wegwerfVerzeichnis}`)
  console.log(`  Fehler: ${fehler.message}\n`)
}

console.log(
  "✓ Rot-Fall real reproduziert: echter Write-Versuch über --allowedTools ohne Write real abgelehnt (tool_name 'Write' " +
    'in permission_denials bestätigt).\n'
)
process.exit(0)
