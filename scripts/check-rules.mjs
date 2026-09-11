/**
 * Datei: scripts/check-rules.mjs
 *
 * Zweck: Architektur-Regel-Gate. Zwei Mechaniken nebeneinander: AST-Regeln
 * über die TypeScript Compiler API (noch leerer Harness) und Textregeln über
 * .ts, .mjs UND .cjs — Letztere, weil die Gate-Skripte des Harness .mjs sind
 * und von einer reinen TS-AST-Mechanik gar nicht erfasst würden.
 * Die AST-Mechanik trägt für jeden TypeScript-Stack unverändert (Next.js,
 * Expo, reines Node). Für Solidity oder andere Sprachen: andere Compiler-API,
 * gleiches Prinzip.
 *
 * Registrierte Textregeln:
 * (R1) Kein rekursives Löschen ohne maxRetries in Tests und Gate-Skripten
 *      (F-257) — mit Rot-Kalibrierung, auch auf die Dateiauswahl.
 *
 * [FÜLLUNG] Die eigentlichen Regeln kommen aus echten Wiederholungen im
 * eigenen Code. Beförderungsregel: Taucht derselbe Fehler dreimal auf, wird
 * er zur Regel — vorher nicht. R1 erfüllt sie mit neun Auftreten.
 *
 * Muster für eine echte Regel (Beispiel aus einem Datenbank-Projekt):
 * "jedes Objekt-Literal mit `take` ohne `skip` im selben Literal ist ein
 * Befund" — per ts.forEachChild über den AST jeder .ts/.tsx-Datei.
 *
 * Aufruf: node scripts/check-rules.mjs   (Teil von npm run check)
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

// Kein statischer Import von 'typescript' hier — das Paket wird erst mit
// der ersten echten Regel als devDependency gebraucht. Der leere Harness
// muss ohne diese Abhängigkeit laufen, siehe dynamischer Import unten.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const befunde = []

console.log('\n=== Regel-Check ===\n')

const ausgeschlosseneVerzeichnisse = new Set([
  'node_modules',
  'dist',
  'build',
  'out',
  '.next',
  '.git',
])

/**
 * Sammelt rekursiv alle Dateien mit einer der angegebenen Endungen. Eine
 * Sammelfunktion für beide Mechaniken (AST und Text) statt zwei fast
 * gleicher — sonst pflegt das nächste Ausschlussverzeichnis zwei Stellen.
 * Pfade werden mit '/' normalisiert, damit Muster unter Windows greifen.
 */
function sammleDateien(dir, endungen, sammlung = []) {
  for (const eintrag of readdirSync(dir, { withFileTypes: true })) {
    if (ausgeschlosseneVerzeichnisse.has(eintrag.name)) continue
    const pfad = join(dir, eintrag.name)
    if (eintrag.isDirectory()) sammleDateien(pfad, endungen, sammlung)
    else if (endungen.some((endung) => pfad.endsWith(endung))) {
      sammlung.push(pfad.split(String.fromCharCode(92)).join('/'))
    }
  }
  return sammlung
}

// ─── [FÜLLUNG] Hier eigene Regeln registrieren ──────────────────────────────
//
// Jede Regel ist eine Funktion (sourceFile, dateiPfad) => void, die bei
// einem Fund `befunde.push(...)` aufruft. Traversal-Vorlage:
//
// function meineRegel(sourceFile, dateiPfad) {
//   function besuche(node) {
//     // z. B.: if (ts.isCallExpression(node) && ...) { befunde.push(...) }
//     ts.forEachChild(node, besuche)
//   }
//   besuche(sourceFile)
// }
//
// const regeln = [meineRegel]
const regeln = []

if (regeln.length > 0) {
  const { default: ts } = await import('typescript')
  const dateien = sammleDateien('.', ['.ts', '.tsx'])
  for (const dateiPfad of dateien) {
    const inhalt = readFileSync(dateiPfad, 'utf-8')
    const sourceFile = ts.createSourceFile(
      dateiPfad,
      inhalt,
      ts.ScriptTarget.Latest,
      true
    )
    for (const regel of regeln) {
      regel(sourceFile, dateiPfad)
    }
  }
}

if (regeln.length === 0) {
  console.log('ⓘ Keine AST-Regeln registriert — leerer AST-Harness (siehe SETUP.md Punkt 4).\n')
}

// ─── (R1) Aufräumen ohne maxRetries in Prüfcode (F-257) ─────────────────────
//
// F-257: neun Auftreten an vier Stellen — ein Wegwerf-Verzeichnis ließ sich
// auf Windows sporadisch nicht entfernen (ENOTEMPTY/EBUSY/EPERM durch ein
// noch gehaltenes Handle). Node hat dafür maxRetries/retryDelay; die
// gemeinsame Fassung steht in scripts/_aufraeumen.ts. Diese Regel hält den
// Zustand: In Prüfcode darf kein nacktes rekursives rmSync zurückkehren.
//
// Nur Prüfcode. Produktcode räumt bewusst ohne stilles Wiederholen auf —
// dort ist ein blockiertes Handle ein Befund, kein Schluckauf.

const PRUEFCODE_ENDUNGEN = ['.ts', '.tsx', '.mjs', '.cjs']

/**
 * Ist diese Datei Prüfcode? Nur dort gilt R1. Diese Datei selbst ist NICHT
 * ausgenommen: Ihre Kalibrierungsfälle sind zusammengesetzt (siehe unten),
 * damit sie im Quelltext nicht als Verstoß dastehen. Eine Prüfdatei, die
 * ihre eigene Regel nicht einhalten muss, wäre eine Ausnahme, die still
 * wächst.
 */
function istPruefcode(pfad) {
  return /\.test\.(ts|mjs|cjs)$/.test(pfad) || /^scripts\/(check|verify|erzeuge)-/.test(pfad)
}

/**
 * Findet jeden rmSync-Aufruf mit `recursive: true`, dem `maxRetries` fehlt.
 * Über die balancierte Klammer statt zeilenweise, damit ein über mehrere
 * Zeilen verteilter Aufruf die Regel nicht unterläuft.
 *
 * @returns Liste der Argumenttexte der beanstandeten Aufrufe.
 */
function findeAufraeumenOhneWiederholung(inhalt) {
  const treffer = []
  const marke = /\brmSync\s*\(/g
  let m = marke.exec(inhalt)
  while (m !== null) {
    let tiefe = 1
    let i = m.index + m[0].length
    while (i < inhalt.length && tiefe > 0) {
      if (inhalt[i] === '(') tiefe++
      else if (inhalt[i] === ')') tiefe--
      i++
    }
    const argumente = inhalt.slice(m.index + m[0].length, i - 1)
    if (/recursive\s*:\s*true/.test(argumente) && !/maxRetries/.test(argumente)) {
      treffer.push(argumente.replace(/\s+/g, ' ').trim())
    }
    marke.lastIndex = i
    m = marke.exec(inhalt)
  }
  return treffer
}

const pruefdateien = sammleDateien('.', PRUEFCODE_ENDUNGEN).filter(istPruefcode)
for (const pfad of pruefdateien) {
  for (const argumente of findeAufraeumenOhneWiederholung(readFileSync(pfad, 'utf-8'))) {
    befunde.push(
      `(R1) ${pfad}: rekursives Löschen (${argumente}) ohne maxRetries — raeumeVerzeichnis() aus scripts/_aufraeumen.ts benutzen (F-257)`
    )
  }
}

// ─── Kalibrierung von (R1) ─────────────────────────────────────────────────
//
// Zwei Hälften, weil die Regel zwei hat: WAS sie erkennt und WO sie
// hinsieht. Ohne die zweite wäre ein kaputtes Pfadmuster still grün — ein
// Gate, das nichts prüft und trotzdem zufrieden meldet (state/gates.md,
// Einleitung). Muster: Gate (a)/(c) in scripts/check-f16-codex-gateway.mjs.
//
// Die Fälle sind zusammengesetzt, damit diese Datei ihre eigene Regel nicht
// verletzt und keine Selbstausnahme braucht.
const AUFRUF = `rm${'Sync'}`
const rotFaelle = [
  `${AUFRUF}(pfad, { recursive: true, force: true })`,
  `${AUFRUF}(join(BASIS, laufId), { recursive: true, force: true })`,
  `${AUFRUF}(\n  pfad,\n  { recursive: true, force: true }\n)`,
]
for (const rot of rotFaelle) {
  if (findeAufraeumenOhneWiederholung(rot).length !== 1) {
    befunde.push(`(R1)-Kalibrierung: konstruierter Verstoß NICHT erkannt: ${JSON.stringify(rot)}`)
  }
}

// Grün-Gegenprobe: die gemeinsame Fassung und ein nicht-rekursives Löschen
// einer einzelnen Datei dürfen KEINEN Befund erzeugen.
const gruenFaelle = [
  `${AUFRUF}(pfad, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })`,
  `${AUFRUF}(pfad, { force: true })`,
]
if (findeAufraeumenOhneWiederholung(gruenFaelle.join('\n')).length !== 0) {
  befunde.push('(R1)-Kalibrierung: Regel schlägt auf einem zulässigen Aufruf an — zu breit')
}

// Kalibrierung der Dateiauswahl: Das Prädikat muss Prüfcode erkennen und
// Produktcode in Ruhe lassen, und die Sammlung muss real etwas finden.
for (const pfad of [
  'src/auftrag/auftrag.test.ts',
  'scripts/check-f16-codex-gateway.mjs',
  'scripts/verify-rename-atomicity.mjs',
]) {
  if (!istPruefcode(pfad)) {
    befunde.push(`(R1)-Kalibrierung: istPruefcode hält Prüfcode NICHT für Prüfcode: ${pfad}`)
  }
}
for (const pfad of ['src/auftrag/index.ts', 'scripts/leitstand-server.mjs', 'scripts/_aufraeumen.ts']) {
  if (istPruefcode(pfad)) {
    befunde.push(`(R1)-Kalibrierung: istPruefcode hält Nicht-Prüfcode für Prüfcode: ${pfad}`)
  }
}
// Die Sammlung muss sich selbst finden: check-rules.mjs ist Prüfcode nach
// dem eigenen Muster und existiert in JEDEM Repo, das dieses Gate hat —
// auch im leeren Template. Damit fängt die Probe einen falschen Startordner
// und eine kaputte Pfadnormalisierung (Backslashes unter Windows), ohne das
// Gate an den Dateibestand genau dieses Projekts zu binden. Eine feste
// Untergrenze wie "mindestens 30 Prüfdateien" täte Letzteres und machte
// check:template im leeren Template rot — dieselbe Klasse wie F-191.
if (!pruefdateien.includes('scripts/check-rules.mjs')) {
  befunde.push(
    `(R1)-Kalibrierung: die Sammlung findet nicht einmal sich selbst (${pruefdateien.length} Prüfdateien) — falscher Startordner oder kaputte Pfadnormalisierung`
  )
}

if (befunde.filter((b) => b.startsWith('(R1)-Kalibrierung')).length === 0) {
  console.log(
    `✓ (R1)-Kalibrierung: drei konstruierte Verstöße (ein- und mehrzeilig) erkannt, zulässige Aufrufe nicht; Dateiauswahl trennt Prüf- von Produktcode und findet ${pruefdateien.length} Prüfdateien.`
  )
}

// Bekannte Grenzen, bewusst dokumentiert statt stillschweigend gelöst. R1
// liest Text, keinen AST — unsichtbar bleiben ihr:
// (1) ein auskommentiertes rekursives Löschen (Fehlalarm, kein Durchschlupf),
// (2) `await rm(pfad, …)` aus node:fs/promises,
// (3) ein umbenannter Import oder ein ausgelagertes Optionsobjekt,
// (4) eine schließende Klammer in einem Pfad-Literal — der Klammerzähler
//     kennt weder Zeichenketten noch Kommentare und schneidet die Argumente
//     dann zu früh ab,
// (5) Prüfcode außerhalb des Pfadmusters: scripts/<unterordner>/, andere
//     Präfixe als check-/verify-/erzeuge-, und .claude/hooks/ (dort wird
//     real gelöscht; commit-guard.cjs wird gesammelt, aber von
//     istPruefcode verworfen, guard-settings.js fällt schon aus der
//     Endungsliste).
// Keine davon ist heute belegt: außerhalb von scripts/_aufraeumen.ts
// existiert im Repo kein rekursives Löschen, und kein Prüfskript benutzt
// node:fs/promises dafür. Tritt eine auf, ist das der Anlass, hier auf AST
// umzustellen — nicht, die Regel als wertlos abzutun.

// ─── Ergebnis ───────────────────────────────────────────────────────────────
if (befunde.length === 0) {
  console.log('✓ Keine Befunde.\n')
  process.exit(0)
}

console.log(`✗ ${befunde.length} Befund(e):\n`)
for (const b of befunde) console.log(`  - ${b}`)
console.log('')
process.exit(1)
