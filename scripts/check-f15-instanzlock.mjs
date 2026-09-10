/**
 * Datei: scripts/check-f15-instanzlock.mjs
 *
 * Zweck: Gate für den Instanz-Lock des Leitstand-Servers (F15 WS-2c-
 * Vorbereitung, löst state/findings.md F-201). Belegt, dass
 * `belegeInstanzLock` aus scripts/leitstand-server.mjs zwei Serverprozesse
 * aus demselben Arbeitsverzeichnis auseinanderhält, ohne den Heilungspfad
 * nach einem harten Absturz zuzumauern:
 *
 * (a) Liegt eine Lock-Datei mit einer LEBENDEN PID (hier: die eigene),
 *     wirft der zweite Belegungsversuch — der CLI-Bindeblock bricht damit
 *     vor server.listen mit Exit 1 ab. Die Meldung nennt PID, Port,
 *     Startzeit und den Dateipfad, damit ein Mensch die Datei nach einem
 *     Absturz selbst entfernen kann.
 * (b) Liegt eine Lock-Datei mit einer garantiert TOTEN PID (ein real
 *     gestarteter und bereits beendeter Kindprozess, nicht eine geratene
 *     Zahl), wird sie übernommen und der Start läuft normal weiter.
 * (c) Dasselbe für eine unlesbare/kaputte Lock-Datei — kein Abbruch.
 * (d) Vertragsprüfung zur harten Auflage aus dem Bauauftrag: der Lock darf
 *     NICHT in erzeugeRequestHandler oder den Request-Handler wandern.
 *     Der Kommentar dort sagt parallelen, unabhängigen Serverinstanzen im
 *     Test ausdrücklich zu, dass sie möglich bleiben —
 *     scripts/check-f10-leitstand.mjs (und f13/f14) hängen daran. Geprüft
 *     wird am Quelltext: der einzige Aufruf liegt hinter dem CLI-Bindeblock.
 * (e) Ein real gestarteter Kindprozess belegt den Lock und endet regulär —
 *     danach ist seine Lock-Datei weg (echter 'exit'-Hook, keine Nachbildung).
 * (f) Der Abbruchzweig aus (a) lässt die vorgefundene Datei BYTEGLEICH liegen.
 *     Seit dem Umbau auf exklusives Anlegen ('wx') entfernt der Heilungspfad
 *     die vorgefundene Datei — im Abbruchzweig wäre genau das ein Freigeben
 *     des Locks einer lebenden Instanz.
 * (g) Der SIGINT-Handler (Ctrl+C-Pfad) räumt die eigene Lock-Datei auf.
 *     Signale lösen 'exit' nicht aus; ohne eigenen Handler bliebe nach jedem
 *     normalen Beenden eine Datei liegen und der nächste Start meldete
 *     "verwaist übernommen" — eine Warnung, die bei fast jedem Start kommt,
 *     warnt nicht mehr. Geprüft wird der Handlerpfad, nicht die Zustellung
 *     durch das Betriebssystem (Begründung am Fall selbst).
 * (h) Der Aufräumer lässt eine inzwischen FREMDE, lebende Lock-Datei liegen.
 *     Die Bedingung pid === process.pid ist sein ganzer Zweck; (e) allein
 *     bliebe bei einem Rückfall auf bedingungsloses Löschen grün.
 * (i) Dasselbe wie (g) für SIGTERM — auf Linux/CI der Normalweg zum Beenden.
 *
 * Es wird bewusst KEIN echter Server gebunden — alle Fälle laufen gegen ein
 * Wegwerf-Basisverzeichnis unter os.tmpdir(), kein Port wird belegt.
 *
 * Wird aufgerufen von: `npm run check`
 *
 * Aufruf: node scripts/check-f15-instanzlock.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { belegeInstanzLock } from './leitstand-server.mjs'

const befunde = []
console.log('\n=== F15-Instanz-Lock-Check (WS-2c-Vorbereitung, F-201) ===\n')

/** Legt ein leeres Wegwerf-Basisverzeichnis an. @returns absoluter Pfad */
function frischesBasisverzeichnis() {
  return mkdtempSync(join(tmpdir(), 'f15-instanzlock-'))
}

/** Schreibt eine Lock-Datei mit vorgegebenem Inhalt. @param basis - Basisverzeichnis @param inhalt - Dateiinhalt als Zeichenkette @returns Pfad der Lock-Datei */
function schreibeLock(basis, inhalt) {
  const pfad = join(basis, '.leitstand.lock')
  writeFileSync(pfad, inhalt, 'utf8')
  return pfad
}

/**
 * Eine garantiert tote PID: ein real gestarteter Kindprozess, dessen Ende
 * spawnSync synchron abgewartet hat. Keine geratene Zahl — die könnte auf
 * dieser Maschine zufällig einem fremden, lebenden Prozess gehören und den
 * Test still ins Gegenteil kippen.
 * @returns PID eines beendeten Prozesses
 */
function totePid() {
  const ergebnis = spawnSync(process.execPath, ['-e', '0'])
  if (typeof ergebnis.pid !== 'number' || ergebnis.status !== 0) {
    throw new Error(`Konnte keinen Kindprozess für eine tote PID starten (status=${ergebnis.status}, error=${ergebnis.error?.message})`)
  }
  return ergebnis.pid
}

// ─── (a) Lebende PID → Abbruch ──────────────────────────────────────────────
{
  const basis = frischesBasisverzeichnis()
  try {
    const lockPfad = schreibeLock(basis, JSON.stringify({ pid: process.pid, port: 4173, gestartetAm: '2026-09-10T08:00:00.000Z' }))
    let geworfen = null
    try {
      belegeInstanzLock(basis, 4174)
    } catch (fehler) {
      geworfen = fehler
    }
    if (geworfen === null) {
      befunde.push('(a) Lock-Datei mit lebender PID: belegeInstanzLock hat NICHT geworfen — ein zweiter Serverstart würde durchlaufen.')
    } else {
      const fehlend = [String(process.pid), '4173', '2026-09-10T08:00:00.000Z', lockPfad].filter((teil) => !geworfen.message.includes(teil))
      if (fehlend.length > 0) {
        befunde.push(`(a) Abbruchmeldung nennt nicht alles Nötige — fehlt: ${fehlend.join(', ')}. Meldung: ${geworfen.message}`)
      } else {
        console.log('✓ (a) Lock-Datei mit lebender PID: Start bricht ab; Meldung nennt PID, Port, Startzeit und Dateipfad.')
      }
      const unveraendert = JSON.parse(readFileSync(lockPfad, 'utf8'))
      if (unveraendert.pid !== process.pid || unveraendert.port !== 4173) {
        befunde.push('(a) Der abgebrochene Start hat die fremde Lock-Datei überschrieben — sie muss unangetastet bleiben.')
      }
    }
  } finally {
    rmSync(basis, { recursive: true, force: true })
  }
}

// ─── (b) Tote PID → Übernahme ───────────────────────────────────────────────
{
  const basis = frischesBasisverzeichnis()
  try {
    const gestorbenePid = totePid()
    schreibeLock(basis, JSON.stringify({ pid: gestorbenePid, port: 4173, gestartetAm: '2026-09-10T07:00:00.000Z' }))
    let ergebnis = null
    try {
      ergebnis = belegeInstanzLock(basis, 4174)
    } catch (fehler) {
      befunde.push(`(b) Lock-Datei mit toter PID (${gestorbenePid}): belegeInstanzLock hat geworfen statt zu übernehmen — der Heilungspfad nach einem Absturz ist zugemauert. Meldung: ${fehler.message}`)
    }
    if (ergebnis !== null) {
      if (ergebnis.uebernommen !== true) {
        befunde.push('(b) Übernahme nicht als solche gemeldet (uebernommen !== true).')
      }
      const neu = JSON.parse(readFileSync(ergebnis.lockPfad, 'utf8'))
      if (neu.pid !== process.pid || neu.port !== 4174 || typeof neu.gestartetAm !== 'string' || Number.isNaN(Date.parse(neu.gestartetAm))) {
        befunde.push(`(b) Übernommene Lock-Datei trägt nicht { pid, port, gestartetAm } dieser Instanz: ${JSON.stringify(neu)}`)
      } else {
        console.log(`✓ (b) Lock-Datei mit toter PID (${gestorbenePid}): übernommen, Inhalt auf pid=${neu.pid}/port=${neu.port} gesetzt.`)
      }
    }
  } finally {
    rmSync(basis, { recursive: true, force: true })
  }
}

// ─── (c) Kaputte Lock-Datei → Übernahme ─────────────────────────────────────
{
  const basis = frischesBasisverzeichnis()
  try {
    schreibeLock(basis, 'kein JSON {{{')
    try {
      const ergebnis = belegeInstanzLock(basis, 4175)
      if (JSON.parse(readFileSync(ergebnis.lockPfad, 'utf8')).pid !== process.pid) {
        befunde.push('(c) Kaputte Lock-Datei wurde nicht übernommen.')
      } else {
        console.log('✓ (c) Unlesbare/kaputte Lock-Datei: übernommen statt Abbruch.')
      }
    } catch (fehler) {
      befunde.push(`(c) Kaputte Lock-Datei führt zum Abbruch statt zur Übernahme: ${fehler.message}`)
    }
  } finally {
    rmSync(basis, { recursive: true, force: true })
  }
}

// ─── (d) Vertragsprüfung: Lock nur im CLI-Bindeblock ────────────────────────
{
  const quelltext = readFileSync(new URL('./leitstand-server.mjs', import.meta.url), 'utf8')
  const bindeblockIndex = quelltext.indexOf('if (process.argv[1] !== undefined')
  const handlerIndex = quelltext.indexOf('function erzeugeRequestHandler')
  // Die Lock-Funktionen stehen zwischen Handler und Bindeblock; ihre eigene Definition ist
  // nicht der geprüfte Bereich, sondern seine Obergrenze.
  const lockDefinitionIndex = quelltext.indexOf('function pidLebt(')
  if (bindeblockIndex < 0 || handlerIndex < 0 || lockDefinitionIndex < 0) {
    befunde.push('(d) CLI-Bindeblock, erzeugeRequestHandler oder die Lock-Definition in scripts/leitstand-server.mjs nicht gefunden — Vertragsprüfung nicht durchführbar.')
  } else if (!(handlerIndex < lockDefinitionIndex && lockDefinitionIndex < bindeblockIndex)) {
    // Ohne diese Reihenfolge wäre der geprüfte Ausschnitt leer und die Prüfung meldete
    // Erfolg, ohne etwas geprüft zu haben (Reviewer-Befund). Lieber laut scheitern.
    befunde.push(`(d) Unerwartete Reihenfolge in scripts/leitstand-server.mjs (erzeugeRequestHandler @${handlerIndex}, Lock-Definition @${lockDefinitionIndex}, CLI-Bindeblock @${bindeblockIndex}) — die Vertragsprüfung wäre nicht aussagekräftig.`)
  } else {
    const handlerAbschnitt = quelltext.slice(handlerIndex, lockDefinitionIndex)
    // (?<!function ) blendet die Definition selbst aus — gesucht sind nur Aufrufstellen.
    const aufrufe = [...quelltext.matchAll(/(?<!function )belegeInstanzLock\(/g)].map((treffer) => treffer.index)
    if (handlerAbschnitt.includes('belegeInstanzLock(') || handlerAbschnitt.includes('.leitstand.lock')) {
      befunde.push('(d) Der Instanz-Lock steht in erzeugeRequestHandler bzw. im Request-Handler. Das bricht die dort zugesagte Unabhängigkeit paralleler Testinstanzen (check-f10-leitstand.mjs) — er gehört ausschließlich in den CLI-Bindeblock.')
    } else if (aufrufe.length === 0) {
      // Ohne diese Forderung wäre das Gate grün, wenn der Aufruf ganz verschwindet —
      // ein Gate, das den abgeschalteten Schutz für erfüllt hält (Reviewer-Befund).
      befunde.push('(d) In scripts/leitstand-server.mjs wird belegeInstanzLock überhaupt nicht mehr aufgerufen — der Instanz-Lock ist abgeschaltet.')
    } else if (!aufrufe.every((stelle) => stelle > bindeblockIndex)) {
      befunde.push('(d) belegeInstanzLock wird außerhalb des CLI-Bindeblocks aufgerufen (Modulebene) — ein bloßer Import dieser Datei (check-f10/f13/f14) würde damit den Lock belegen.')
    } else {
      console.log(`✓ (d) Instanz-Lock: ${aufrufe.length} Aufruf(e), alle im CLI-Bindeblock; nichts davon in erzeugeRequestHandler oder auf Modulebene.`)
    }
  }
}

// ─── (e) Aufräum-Hook entfernt nur die eigene Datei ─────────────────────────
// Realer Kindprozess: er belegt einen Lock in einem Wegwerfverzeichnis und endet
// sauber. Danach muss die Datei weg sein — geprüft wird der echte 'exit'-Hook,
// nicht eine Nachbildung.
{
  const basis = frischesBasisverzeichnis()
  try {
    const skript = `import { belegeInstanzLock } from ${JSON.stringify(new URL('./leitstand-server.mjs', import.meta.url).href)}; belegeInstanzLock(${JSON.stringify(basis)}, 4176)`
    const ergebnis = spawnSync(process.execPath, ['--input-type=module', '-e', skript], { encoding: 'utf8', timeout: 15000 })
    if (ergebnis.status !== 0) {
      befunde.push(`(e) Kindprozess für den Aufräum-Hook endete mit Status ${ergebnis.status}: ${ergebnis.stderr}`)
    } else if (existsSync(join(basis, '.leitstand.lock'))) {
      befunde.push('(e) Nach sauberem Prozessende liegt die eigene Lock-Datei noch da — der nächste Start müsste sie erst als verwaist heilen.')
    } else {
      console.log('✓ (e) Sauberes Prozessende entfernt die eigene Lock-Datei.')
    }
  } finally {
    rmSync(basis, { recursive: true, force: true })
  }
}

// ─── (f) Wettlauf-Zweig lässt die fremde Datei byteweise unangetastet ───────
// Der Erwerb läuft über exklusives Anlegen ('wx') und entfernt im Heilungspfad die
// vorgefundene Datei. Genau das darf im Abbruchzweig NICHT passieren: die Datei gehört
// dort einer lebenden Instanz, ein Unlink im Wettlauf gäbe den Lock frei.
{
  const basis = frischesBasisverzeichnis()
  try {
    const inhalt = JSON.stringify({ pid: process.pid, port: 4173, gestartetAm: '2026-09-10T09:00:00.000Z' }, null, 2)
    const lockPfad = schreibeLock(basis, inhalt)
    const vorher = readFileSync(lockPfad)
    let geworfen = false
    try {
      belegeInstanzLock(basis, 4177)
    } catch {
      geworfen = true
    }
    if (!geworfen) {
      befunde.push('(f) Lock-Datei mit lebender Fremd-PID: belegeInstanzLock hat nicht geworfen.')
    } else if (!existsSync(lockPfad)) {
      befunde.push('(f) Der Abbruchzweig hat die fremde Lock-Datei ENTFERNT — der Lock der lebenden Instanz wäre damit freigegeben.')
    } else if (!readFileSync(lockPfad).equals(vorher)) {
      befunde.push(`(f) Der Abbruchzweig hat die fremde Lock-Datei verändert. Vorher: ${vorher.toString('utf8')} / nachher: ${readFileSync(lockPfad).toString('utf8')}`)
    } else {
      console.log('✓ (f) Abbruch bei lebender Fremd-PID lässt die vorhandene Lock-Datei byteweise unverändert.')
    }
  } finally {
    rmSync(basis, { recursive: true, force: true })
  }
}

// ─── (g) SIGINT-Handler räumt die eigene Lock-Datei auf ─────────────────────
// Signale lösen 'exit' nicht aus — ohne eigenen Handler bliebe nach jedem normalen
// Ctrl+C eine Lock-Datei liegen. Der Kindprozess löst das Signalereignis über
// process.emit aus, NICHT über process.kill(self): unter Windows stellt libuv ein an
// den eigenen Prozess gesendetes SIGINT nicht als Ereignis zu, sondern beendet den
// Prozess hart (real geprüft, Exit 1 ohne Handlerlauf). Ein echtes Ctrl+C kommt dort
// als Konsolen-Steuerereignis herein und läuft durch genau den hier geprüften
// Handler; erzeugen lässt sich ein solches Ereignis aus Node heraus nicht. Geprüft
// wird damit der Handlerpfad (Aufräumen + Exit-Code), nicht die Signalzustellung des
// Betriebssystems.
{
  const basis = frischesBasisverzeichnis()
  try {
    const skript =
      `import { belegeInstanzLock } from ${JSON.stringify(new URL('./leitstand-server.mjs', import.meta.url).href)}; ` +
      `belegeInstanzLock(${JSON.stringify(basis)}, 4178); ` +
      `setInterval(() => {}, 1000); ` +
      `process.emit('SIGINT')`
    const ergebnis = spawnSync(process.execPath, ['--input-type=module', '-e', skript], { encoding: 'utf8', timeout: 15000 })
    if (ergebnis.status !== 0) {
      befunde.push(`(g) Kindprozess endete nach SIGINT mit Status ${ergebnis.status} (erwartet 0, Handler ruft process.exit(0)): ${ergebnis.stderr}`)
    } else if (existsSync(join(basis, '.leitstand.lock'))) {
      befunde.push('(g) Nach SIGINT (Ctrl+C) liegt die eigene Lock-Datei noch da — jeder folgende Start meldete fälschlich "verwaiste Lock-Datei übernommen".')
    } else {
      console.log('✓ (g) SIGINT-Handler (Ctrl+C-Pfad) entfernt die eigene Lock-Datei; der Prozess endet mit 0.')
    }
  } finally {
    rmSync(basis, { recursive: true, force: true })
  }
}

// ─── (h) Aufräumer lässt eine inzwischen FREMDE Lock-Datei liegen ───────────
// Der eigentliche Zweck von raeumeAuf ist die Bedingung pid === process.pid, nicht das
// Löschen. Fällt sie je auf ein bedingungsloses unlinkSync zurück, löschte eine
// endende Instanz den frisch belegten Lock ihrer Nachfolgerin — danach liefen zwei.
// (e) allein bliebe dabei grün (QA-Befund). Der Kindprozess belegt den Lock und
// überschreibt ihn danach mit der PID DIESES Prozesses, die nachweislich lebt.
{
  const basis = frischesBasisverzeichnis()
  try {
    const lockPfad = join(basis, '.leitstand.lock')
    const fremd = `${JSON.stringify({ pid: process.pid, port: 4179, gestartetAm: '2026-09-10T11:00:00.000Z' }, null, 2)}\n`
    const skript =
      `import { belegeInstanzLock } from ${JSON.stringify(new URL('./leitstand-server.mjs', import.meta.url).href)}; ` +
      `import { writeFileSync } from 'node:fs'; ` +
      `belegeInstanzLock(${JSON.stringify(basis)}, 4180); ` +
      `writeFileSync(${JSON.stringify(lockPfad)}, ${JSON.stringify(fremd)}, 'utf8')`
    const ergebnis = spawnSync(process.execPath, ['--input-type=module', '-e', skript], { encoding: 'utf8', timeout: 15000 })
    if (ergebnis.status !== 0) {
      befunde.push(`(h) Kindprozess endete mit Status ${ergebnis.status}: ${ergebnis.stderr}`)
    } else if (!existsSync(lockPfad)) {
      befunde.push('(h) Der Aufräumer hat eine Lock-Datei mit FREMDER, lebender PID gelöscht — eine endende Instanz gibt damit den Lock ihrer Nachfolgerin frei; danach liefen zwei.')
    } else if (readFileSync(lockPfad, 'utf8') !== fremd) {
      befunde.push(`(h) Die fremde Lock-Datei wurde verändert: ${readFileSync(lockPfad, 'utf8')}`)
    } else {
      console.log('✓ (h) Der Aufräumer lässt eine inzwischen fremde (lebende) Lock-Datei unangetastet liegen.')
    }
  } finally {
    rmSync(basis, { recursive: true, force: true })
  }
}

// ─── (i) SIGTERM-Handler räumt ebenfalls auf ────────────────────────────────
// SIGTERM ist auf Linux/CI der Normalweg zum Beenden (`kill`, `docker stop`) und war
// bis hierher ungeprüft (QA-Befund). Dieselbe emit-Begründung wie bei (g).
{
  const basis = frischesBasisverzeichnis()
  try {
    const skript =
      `import { belegeInstanzLock } from ${JSON.stringify(new URL('./leitstand-server.mjs', import.meta.url).href)}; ` +
      `belegeInstanzLock(${JSON.stringify(basis)}, 4181); ` +
      `setInterval(() => {}, 1000); ` +
      `process.emit('SIGTERM')`
    const ergebnis = spawnSync(process.execPath, ['--input-type=module', '-e', skript], { encoding: 'utf8', timeout: 15000 })
    if (ergebnis.status !== 0) {
      befunde.push(`(i) Kindprozess endete nach SIGTERM mit Status ${ergebnis.status} (erwartet 0): ${ergebnis.stderr}`)
    } else if (existsSync(join(basis, '.leitstand.lock'))) {
      befunde.push('(i) Nach SIGTERM liegt die eigene Lock-Datei noch da.')
    } else {
      console.log('✓ (i) SIGTERM-Handler entfernt die eigene Lock-Datei; der Prozess endet mit 0.')
    }
  } finally {
    rmSync(basis, { recursive: true, force: true })
  }
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
