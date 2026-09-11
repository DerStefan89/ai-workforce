/**
 * Datei: scripts/check-f16-codex-gateway.mjs
 *
 * Zweck: Codex-Gateway-Gate (F16, features/F16/feature.md, AK6 und AK8).
 * Gebaut nach dem Muster von scripts/check-f6a-claude-code-gateway.mjs:
 * importiert baueCodexAufruf direkt aus src/codex-gateway/index.ts statt
 * einen zweiten, von Hand nachgebauten Regelsatz zu führen (D5).
 *
 * (a) Grep über src/codex-gateway/*.ts (ohne Tests): kein
 *     Shell-String-Zusammenbau (F-057) — Muster und Selbsttest wortgleich
 *     aus scripts/check-f6a-claude-code-gateway.mjs übernommen (AK14);
 *     zusätzlich kein Import aus node:child_process: der Prozessstart
 *     läuft ausschließlich über src/claude-code-gateway/prozessstart.ts
 *     (AK7), nie über ein zweites, hier nachgebautes Spawn-Primitiv (D5).
 * (b) baueCodexAufruf führt '--sandbox' und 'read-only' als GETRENNTE
 *     Array-Elemente — ein zusammengesetztes '--sandbox read-only' wäre
 *     ein Shell-Denkfehler und käme bei Codex als ein einziges,
 *     unbekanntes Argument an.
 * (c) Grep: in src/codex-gateway/*.ts steht außerhalb von
 *     codex-argv-allowlist.ts und der Tests kein Token, das mit
 *     '--dangerously' oder '--ignore-' beginnt. Die Allowlist-Datei ist
 *     ausgenommen, weil sie diese Schalter in ihrer Begründung benennen
 *     muss (dort ohne führende Striche geschrieben); die Tests sind
 *     ausgenommen, weil ihre Rot-Fälle genau diese Token brauchen.
 * (d) Alle *.schema.json unter schemas/ sind BOM-frei und LF-terminiert
 *     (ARCHITECTURE.md §7; ein BOM in einer Schemadatei hat im Spike real
 *     einen Codex-Lauf zerstört, state/tp-m3-01-codex.md Lauf 3);
 *     ergebnis-code-reviewer.schema.json trägt zusätzlich
 *     additionalProperties:false auf JEDER Objektebene (rekursiv) — ohne
 *     das antwortet die Modell-API mit HTTP 400 invalid_json_schema.
 * (e) startvorlagen/*.json: kein Startziel (auch nicht
 *     worker.codex.startziel) endet auf .cmd/.bat/.ps1, kein Basisname
 *     ist wsl.exe/cmd.exe/powershell.exe (F-280).
 * (f) Rot-Kalibrierung für (b) und (d) über Wegwerfkopien: eine Grenze,
 *     deren Rot-Fall nie gemessen wurde, heißt nicht ERZWUNGEN
 *     (ARCHITECTURE.md §8).
 * (g) Grep über src/result-evaluator/index.ts (AK8): weder
 *     ermittleErgebnisCodex noch eine von dort aus erreichbare lokale
 *     Hilfsfunktion greift in ihrem ausführbaren Teil auf stderr zu
 *     (ARCHITECTURE.md §7, F-309); die Worker-Weiche steht VOR dem
 *     leseErgebnisobjekt-Aufruf (F-283). Die Aufrufverfolgung ist nötig,
 *     weil ein namensgebundener Grep einen ausgelagerten stderr-Zugriff
 *     durchließe — dafür gibt es eine eigene Rot-Kalibrierung, neben der
 *     für den direkten Zugriff und einer Grün-Gegenprobe gegen die bloße
 *     Kommentarerwähnung.
 *
 * Wird aufgerufen von: `npm run check`
 *
 * Aufruf: node scripts/check-f16-codex-gateway.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { randomUUID } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
// win32.basename statt basename: Startziele sind Windows-Pfade. Unter
// POSIX liefert das plattformabhängige basename() für
// 'c:\windows\powershell.exe' den GANZEN String, der Sperrlisten-Treffer
// entfiele — die Regel wäre aus der Linux-Sicht auf dasselbe Repo blind
// (CLAUDE.md, bekannte Falle: gemountetes Windows-Verzeichnis). win32
// verhält sich auf jeder Plattform gleich.
import { join, win32 } from 'node:path'
import { baueCodexAufruf, pruefeUndVerweigereCodexBeiTreffer } from '../src/codex-gateway/index.ts'

const befunde = []
const CODEX_GATEWAY_DIR = join('src', 'codex-gateway')
const KONTROLLZUSTAND_BASIS = 'kontrollzustand-test'
const PROFIL_REFERENZ = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }

function neueLaufId(praefix) {
  return `${praefix}-${randomUUID()}`
}

function raeumeKette(laufId) {
  rmSync(join(KONTROLLZUSTAND_BASIS, laufId), { recursive: true, force: true })
}

console.log('\n=== F16-Codex-Gateway-Check (WS-1 + WS-2) ===\n')

/** Liefert die Produktionsdateien des Moduls (ohne Tests) als [name, inhalt]-Paare. */
function produktionsdateien(ausnahmen = []) {
  const paare = []
  for (const datei of readdirSync(CODEX_GATEWAY_DIR)) {
    if (!datei.endsWith('.ts') || datei.endsWith('.test.ts') || ausnahmen.includes(datei)) continue
    paare.push([datei, readFileSync(join(CODEX_GATEWAY_DIR, datei), 'utf-8')])
  }
  return paare
}

// ─── (a) kein Shell-String-Zusammenbau (F-057), kein Prozessstart ──────────
// Muster und Selbsttest wortgleich aus scripts/check-f6a-claude-code-gateway.mjs
// (AK14) — bewusst dieselbe Regel, nicht eine zweite, leicht abweichende.
const shellStringMuster = /\.join\(\s*(['"]) \1\s*\)|shell\s*:\s*true|\bexec\(/
let shellVerstoss = null
for (const [datei, inhalt] of produktionsdateien()) {
  if (shellStringMuster.test(inhalt)) {
    shellVerstoss = datei
    break
  }
}
if (shellVerstoss !== null) {
  befunde.push(`(a): verbotenes Muster (Shell-String-Zusammenbau) in ${CODEX_GATEWAY_DIR}/${shellVerstoss} gefunden`)
} else {
  console.log('✓ (a): kein Shell-String-Zusammenbau in den Produktionsdateien von src/codex-gateway/*.ts (F-057).')
}
// Selbsttest: das Muster muss einen simulierten Verstoß tatsächlich erkennen —
// sonst wäre (a) oben nur scheinbar geprüft.
const simulierterVerstoss = "const cmd = tokens.join(' '); execFileSyncOderSonstwas(cmd)"
if (!shellStringMuster.test(simulierterVerstoss)) {
  befunde.push('(a)-Selbsttest: Muster erkennt einen simulierten Shell-String-Zusammenbau NICHT — Grep-Regel ist wirkungslos')
} else {
  console.log('✓ (a)-Selbsttest: simulierter Shell-String-Zusammenbau wird vom Muster erkannt.')
}

// Das Muster trifft den IMPORT, nicht die bloße Erwähnung: der
// Kopfkommentar von src/codex-gateway/index.ts benennt node:child_process
// ausdrücklich, um festzuhalten, dass es NICHT importiert wird. Ein Grep
// über den nackten Modulnamen würde genau diese Begründung bestrafen und
// damit dazu einladen, sie zu löschen.
const kindProcessMuster = /(?:from|require\()\s*['"]node:child_process['"]/
let kindProcessVerstoss = null
for (const [datei, inhalt] of produktionsdateien()) {
  if (kindProcessMuster.test(inhalt)) {
    kindProcessVerstoss = datei
    break
  }
}
if (kindProcessVerstoss !== null) {
  befunde.push(`(a): Import aus node:child_process in ${CODEX_GATEWAY_DIR}/${kindProcessVerstoss} — der Prozessstart läuft über src/claude-code-gateway/prozessstart.ts, nicht über ein zweites Spawn-Primitiv`)
} else {
  console.log('✓ (a): kein Import aus node:child_process — der Prozessstart läuft über prozessstart.ts.')
}

// ─── (b) '--sandbox' und 'read-only' als getrennte Array-Elemente ──────────
/** Prüft, ob ein Tokens-Array den Sandbox-Schalter und seinen Wert als zwei benachbarte, eigenständige Elemente führt. Reine Funktion, damit (f) exakt dieselbe Prüfung gegen eine Wegwerfkopie fahren kann. */
function fuehrtSandboxGetrennt(tokens) {
  const index = tokens.indexOf('--sandbox')
  return index >= 0 && tokens[index + 1] === 'read-only'
}

const echteTokens = baueCodexAufruf({ modell: 'gpt-5-codex', prompt: 'Prompt', ausgabeSchemaPfad: null })
if (!fuehrtSandboxGetrennt(echteTokens)) {
  befunde.push(`(b): baueCodexAufruf führt '--sandbox' und 'read-only' nicht als getrennte Array-Elemente: ${JSON.stringify(echteTokens)}`)
} else {
  console.log("✓ (b): baueCodexAufruf führt '--sandbox' und 'read-only' als getrennte Array-Elemente.")
}

// ─── (b2) pruefeUndVerweigereCodexBeiTreffer: Grün- und Rot-Fall ───────────
// Muster: scripts/check-f6a-claude-code-gateway.mjs (b)/(c). Dies ist der
// EINZIGE Pfad, der bei einem Allowlist-Treffer real eine Verweigerung über
// F4s verweigereStart schreibt — ohne gemessenen Grün- UND Rot-Fall wäre
// die Durchsetzungshälfte von AK2 nur behauptet (ARCHITECTURE.md §8).
const laufIdGruen = neueLaufId('f16-gruen')
try {
  const ergebnisGruen = pruefeUndVerweigereCodexBeiTreffer(echteTokens, laufIdGruen, PROFIL_REFERENZ, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
  if (!ergebnisGruen.ok) {
    befunde.push(`(b2) Grün-Fall: erwartet ok:true, erhalten ${JSON.stringify(ergebnisGruen)}`)
  } else {
    console.log('✓ (b2) Grün-Fall: ein allowlist-konformes Codex-Argv wird akzeptiert.')
  }
} finally {
  raeumeKette(laufIdGruen)
}

// Rot-Fall mit einem Token, das die Allowlist nicht kennt, UND ein zweiter
// mit einem abwählenden Parameter in WERTPOSITION hinter '--model' — der
// Fall, der die Grammatik vor der Korrektur real passiert hat.
const rotArgvs = [
  ['exec', '--json', '--sandbox', 'read-only', '--model', 'gpt-5-codex', '--skip-git-repo-check', 'Prompt'],
  ['exec', '--json', '--sandbox', 'read-only', '--model', '-c', 'Prompt'],
]
for (const [nr, rotArgv] of rotArgvs.entries()) {
  const laufIdRot = neueLaufId(`f16-rot-${nr}`)
  try {
    const ergebnisRot = pruefeUndVerweigereCodexBeiTreffer(rotArgv, laufIdRot, PROFIL_REFERENZ, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    if (ergebnisRot.ok) {
      befunde.push(`(b2) Rot-Fall ${nr}: erwartet ok:false für ${JSON.stringify(rotArgv)}, erhalten ok:true`)
    } else {
      // Der Rückgabewert allein belegt die Durchsetzung NICHT: entfernte
      // jemand den verweigereStart-Aufruf, bliebe er unverändert
      // ok:false. Geprüft wird deshalb das real geschriebene Artefakt.
      const kettenVerzeichnis = join(KONTROLLZUSTAND_BASIS, laufIdRot, 'checkpoints')
      if (!existsSync(kettenVerzeichnis)) {
        befunde.push(`(b2) Rot-Fall ${nr}: keine Verweigerungs-Wirkungsmarke unter ${kettenVerzeichnis} geschrieben — die Durchsetzung ist nur behauptet`)
      } else {
        console.log(`✓ (b2) Rot-Fall ${nr}: abgelehnt UND Wirkungsmarke geschrieben (${ergebnisRot.grund}).`)
      }
    }
  } finally {
    raeumeKette(laufIdRot)
  }
}

// ─── (c) keine abwählenden Schalternamen außerhalb der Allowlist-Datei ─────
const abwaehlerMuster = /--dangerously|--ignore-/
let abwaehlerVerstoss = null
for (const [datei, inhalt] of produktionsdateien(['codex-argv-allowlist.ts'])) {
  if (abwaehlerMuster.test(inhalt)) {
    abwaehlerVerstoss = datei
    break
  }
}
if (abwaehlerVerstoss !== null) {
  befunde.push(`(c): Token mit Präfix '--dangerously' oder '--ignore-' in ${CODEX_GATEWAY_DIR}/${abwaehlerVerstoss} — außerhalb von codex-argv-allowlist.ts unzulässig`)
} else {
  console.log("✓ (c): kein '--dangerously'/'--ignore-'-Token außerhalb von codex-argv-allowlist.ts und den Tests.")
}
// Selbsttest für (c) nach dem Vorbild von (a): ein Grep, der seinen eigenen
// Verstoß nicht erkennt, ist ein Häkchen ohne Messung.
for (const simuliert of ["const t = '--dangerously-bypass-approvals-and-sandbox'", "const t = '--ignore-user-config'"]) {
  if (!abwaehlerMuster.test(simuliert)) {
    befunde.push(`(c)-Selbsttest: Muster erkennt einen simulierten Verstoß NICHT: ${simuliert}`)
  }
}
if (abwaehlerMuster.test("const t = '--modell-ohne-abwahl'")) {
  befunde.push('(c)-Selbsttest: Muster schlägt auf einem unverdächtigen Token an — zu breit')
} else {
  console.log('✓ (c)-Selbsttest: beide Präfixe werden erkannt, ein unverdächtiges Token nicht.')
}
// Ebenso für die node:child_process-Regel aus (a).
for (const simuliert of ["import { execFile } from 'node:child_process'", "const cp = require('node:child_process')"]) {
  if (!kindProcessMuster.test(simuliert)) {
    befunde.push(`(a)-Selbsttest: Muster erkennt einen simulierten Prozessstart-Import NICHT: ${simuliert}`)
  }
}
// Grün-Gegenprobe: die bloße Erwähnung im Fließtext darf KEINEN Befund
// erzeugen, sonst prüft die Regel die Dokumentation statt des Codes.
if (kindProcessMuster.test(' * Diese Datei importiert nie node:child_process direkt.')) {
  befunde.push('(a)-Selbsttest: Muster schlägt auf einer bloßen Kommentarerwähnung von node:child_process an — zu breit')
} else {
  console.log('✓ (a)-Selbsttest: Import (import/require) wird erkannt, eine bloße Kommentarerwähnung nicht.')
}

// ─── (d) Schemadateien: BOM-frei, LF, additionalProperties rekursiv ────────
/** Prüft eine Schemadatei auf BOM und CRLF. Reine Funktion für (f). */
function pruefeBytes(rohBytes) {
  const maengel = []
  if (rohBytes[0] === 0xef && rohBytes[1] === 0xbb && rohBytes[2] === 0xbf) maengel.push('trägt ein UTF-8-BOM')
  if (rohBytes.includes(0x0d)) maengel.push('enthält CRLF (ARCHITECTURE.md §7: der Kern schreibt ausnahmslos LF)')
  return maengel
}

/**
 * Sammelt rekursiv jede Objektebene eines JSON-Schemas, der
 * additionalProperties:false fehlt. Eine Ebene gilt als Objektebene, wenn
 * sie type:'object' deklariert ODER ein properties-Objekt trägt — beides
 * erzeugt im Strict-Modus der Modell-API denselben HTTP-400.
 */
function ebenenOhneAdditionalPropertiesFalse(knoten, pfad = '(Wurzel)', treffer = []) {
  if (typeof knoten !== 'object' || knoten === null) return treffer
  if (Array.isArray(knoten)) {
    knoten.forEach((eintrag, i) => ebenenOhneAdditionalPropertiesFalse(eintrag, `${pfad}[${i}]`, treffer))
    return treffer
  }
  const istObjektebene = knoten.type === 'object' || typeof knoten.properties === 'object'
  if (istObjektebene && knoten.additionalProperties !== false) treffer.push(pfad)
  for (const [schluessel, wert] of Object.entries(knoten)) {
    if (schluessel === 'additionalProperties' && typeof wert !== 'object') continue
    ebenenOhneAdditionalPropertiesFalse(wert, `${pfad}.${schluessel}`, treffer)
  }
  return treffer
}

const schemaDateien = readdirSync('schemas').filter((d) => d.endsWith('.schema.json'))
let byteBefunde = 0
for (const datei of schemaDateien) {
  const maengel = pruefeBytes(readFileSync(join('schemas', datei)))
  for (const mangel of maengel) {
    befunde.push(`(d): schemas/${datei} ${mangel}`)
    byteBefunde++
  }
}
if (byteBefunde === 0) {
  console.log(`✓ (d): alle ${schemaDateien.length} Schemadatei(en) unter schemas/ sind BOM-frei und LF-terminiert.`)
}

const ROLLENSCHEMA = 'schemas/ergebnis-code-reviewer.schema.json'
let rollenschema = null
try {
  rollenschema = JSON.parse(readFileSync(ROLLENSCHEMA, 'utf-8'))
} catch (fehler) {
  befunde.push(`(d): ${ROLLENSCHEMA} fehlt oder ist kein gültiges JSON (${fehler.message})`)
}
if (rollenschema !== null) {
  const luecken = ebenenOhneAdditionalPropertiesFalse(rollenschema)
  if (luecken.length > 0) {
    befunde.push(`(d): ${ROLLENSCHEMA} — additionalProperties:false fehlt auf Ebene(n): ${luecken.join(', ')}`)
  } else {
    console.log(`✓ (d): ${ROLLENSCHEMA} trägt additionalProperties:false auf jeder Objektebene.`)
  }
}

// ─── (e) Startvorlagen: keine Skript- und keine Shell-Startziele ───────────
const GESPERRTE_ENDUNGEN = ['.cmd', '.bat', '.ps1']
const GESPERRTE_BASISNAMEN = ['wsl.exe', 'cmd.exe', 'powershell.exe']

/** Liefert alle Startziel-Arrays einer Startvorlage, flach benannt — inklusive des genesteten worker.codex.startziel (F16 AK5). */
function alleStartziele(vorlage) {
  const ziele = []
  if (Array.isArray(vorlage.werkzeugStartziel)) ziele.push(['werkzeugStartziel', vorlage.werkzeugStartziel])
  const codexZiel = vorlage.worker?.codex?.startziel
  if (Array.isArray(codexZiel)) ziele.push(['worker.codex.startziel', codexZiel])
  return ziele
}

/** Prüft alle Startziele einer Startvorlage auf gesperrte Endungen und Shell-Basisnamen. Reine Funktion, damit (f) exakt dieselbe Prüfung gegen Wegwerf-Vorlagen fahren kann — auch gegen einen worker.codex-Block, den heute keine reale Vorlage trägt. */
function startzielMaengel(vorlage) {
  const maengel = []
  for (const [feld, startziel] of alleStartziele(vorlage)) {
    const programm = String(startziel[0] ?? '')
    const klein = programm.toLowerCase()
    const endung = GESPERRTE_ENDUNGEN.find((e) => klein.endsWith(e))
    if (endung !== undefined) maengel.push(`${feld}[0] endet auf '${endung}' (F-280): '${programm}'`)
    if (GESPERRTE_BASISNAMEN.includes(win32.basename(klein))) maengel.push(`${feld}[0] ist ein gesperrter Shell-Basisname: '${programm}'`)
  }
  return maengel
}

const vorlagenDateien = readdirSync('startvorlagen').filter((d) => d.endsWith('.json'))
let startzielBefunde = 0
for (const datei of vorlagenDateien) {
  let vorlage
  try {
    vorlage = JSON.parse(readFileSync(join('startvorlagen', datei), 'utf-8'))
  } catch (fehler) {
    befunde.push(`(e): startvorlagen/${datei} ist kein gültiges JSON (${fehler.message})`)
    startzielBefunde++
    continue
  }
  for (const mangel of startzielMaengel(vorlage)) {
    befunde.push(`(e): startvorlagen/${datei} — ${mangel}`)
    startzielBefunde++
  }
}
if (startzielBefunde === 0) {
  console.log(`✓ (e): alle ${vorlagenDateien.length} Startvorlage(n) tragen zulässige Startziele (auch worker.codex.startziel).`)
}
// Rot-Kalibrierung für (e). Nötig, weil heute KEINE reale Vorlage einen
// worker.codex-Block trägt: ohne diese Wegwerf-Objekte liefe der
// Codex-Zweig von alleStartziele nie und das Häkchen oben behauptete mehr
// Deckung, als gemessen wurde.
const eRotFaelle = [
  { name: 'worker.codex.startziel mit .cmd', vorlage: { worker: { codex: { startziel: [String.raw`C:\codex\codex.cmd`] } } } },
  { name: 'worker.codex.startziel = powershell.exe', vorlage: { worker: { codex: { startziel: [String.raw`C:\Windows\powershell.exe`] } } } },
  { name: 'werkzeugStartziel mit .bat', vorlage: { werkzeugStartziel: [String.raw`C:\claude\claude.bat`] } },
]
for (const { name, vorlage } of eRotFaelle) {
  const maengel = startzielMaengel(vorlage)
  if (maengel.length === 0) {
    befunde.push(`(f): Rot-Kalibrierung (e) fehlgeschlagen — '${name}' erzeugt keinen Befund`)
  } else {
    console.log(`✓ (f): Rot-Kalibrierung (e) — '${name}' erkannt (${maengel.join('; ')}).`)
  }
}
// Grün-Gegenprobe: ein zulässiges Codex-Startziel darf KEINEN Befund
// erzeugen, sonst wäre die Regel bloß pauschal.
if (startzielMaengel({ worker: { codex: { startziel: [String.raw`C:\Program Files\codex\codex.exe`] } } }).length !== 0) {
  befunde.push('(f): Grün-Gegenprobe (e) fehlgeschlagen — ein zulässiges codex.exe-Startziel erzeugt einen Befund')
} else {
  console.log('✓ (f): Grün-Gegenprobe (e) — zulässiges codex.exe-Startziel erzeugt keinen Befund.')
}

// ─── (f) Rot-Kalibrierung für (b) und (d) über Wegwerfkopien ───────────────
// Ohne gemessenen Rot-Fall bleibt eine Grenze eine Behauptung
// (ARCHITECTURE.md §8). Die Wegwerfdateien liegen außerhalb des Repos.
const wegwerfVerzeichnis = mkdtempSync(join(tmpdir(), 'f16-gate-'))
try {
  // (b) rot: derselbe Argv, aber Schalter und Wert zu einem Element
  // zusammengesetzt — genau der Fehler, den (b) fangen soll.
  const zusammengesetzt = ['exec', '--json', '--sandbox read-only', '--model', 'gpt-5-codex', 'Prompt']
  if (fuehrtSandboxGetrennt(zusammengesetzt)) {
    befunde.push('(f): Rot-Kalibrierung (b) fehlgeschlagen — ein zusammengesetztes \'--sandbox read-only\' wird NICHT erkannt')
  } else {
    console.log("✓ (f): Rot-Kalibrierung (b) — zusammengesetztes '--sandbox read-only' wird erkannt.")
  }

  // (d) rot, Teil 1: BOM und CRLF in einer Wegwerf-Schemadatei.
  const bomPfad = join(wegwerfVerzeichnis, 'mit-bom.schema.json')
  writeFileSync(bomPfad, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('{\r\n  "type": "object"\r\n}\r\n', 'utf-8')]))
  const byteMaengel = pruefeBytes(readFileSync(bomPfad))
  if (byteMaengel.length !== 2) {
    befunde.push(`(f): Rot-Kalibrierung (d/Bytes) fehlgeschlagen — erwartet BOM- UND CRLF-Befund, erhalten: ${JSON.stringify(byteMaengel)}`)
  } else {
    console.log('✓ (f): Rot-Kalibrierung (d/Bytes) — BOM und CRLF werden beide erkannt.')
  }

  // (d) rot, Teil 2: fehlendes additionalProperties auf einer TIEFEN Ebene
  // (die Wurzel bleibt korrekt) — die Rekursion muss es trotzdem finden.
  const luecke = {
    type: 'object',
    additionalProperties: false,
    properties: { befunde: { type: 'array', items: { type: 'object', properties: { schwere: { type: 'string' } } } } },
  }
  const gefunden = ebenenOhneAdditionalPropertiesFalse(luecke)
  if (gefunden.length === 0) {
    befunde.push('(f): Rot-Kalibrierung (d/additionalProperties) fehlgeschlagen — fehlendes additionalProperties auf tiefer Ebene wird NICHT erkannt')
  } else {
    console.log(`✓ (f): Rot-Kalibrierung (d/additionalProperties) — tiefe Lücke erkannt (${gefunden.join(', ')}).`)
  }
} finally {
  rmSync(wegwerfVerzeichnis, { recursive: true, force: true })
}


// ─── (g) Der Codex-Zweig des Result Evaluators liest kein stderr ───────────
// ARCHITECTURE.md §7 verbietet, ein Laufergebnis aus Konsolentext
// abzuleiten. F-309 zeigt real, warum das hier mehr als Formalismus ist:
// auf stderr stehen ERROR-Zeilen des Modellkatalog-Refresh auch bei einem
// vollständig erfolgreichen Lauf mit Exit-Code 0 — eine stderr-Heuristik
// meldete grüne Läufe als gescheitert. Geprüft wird deshalb mechanisch per
// Grep über genau den Funktionskörper, nicht per Zusicherung im Kommentar.
const EVALUATOR_DATEI = join('src', 'result-evaluator', 'index.ts')
const CODEX_FUNKTION = 'ermittleErgebnisCodex'

/**
 * Schneidet den Körper einer Top-Level-Funktion aus einer Quelldatei:
 * von `function <name>` bis zur ersten schließenden Klammer in Spalte 0.
 * Reine Funktion, damit (g) seine eigene Rot-Kalibrierung gegen einen
 * konstruierten Körper fahren kann.
 */
function funktionsKoerper(quelle, name) {
  const start = quelle.indexOf(`function ${name}(`)
  if (start < 0) return null
  const ende = quelle.indexOf('\n}\n', start)
  return ende < 0 ? quelle.slice(start) : quelle.slice(start, ende + 3)
}

/** Nur der ausführbare Teil: Kommentarzeilen dürfen 'stderr' sehr wohl benennen (die Begründung, warum es NICHT gelesen wird, gehört genau dorthin). */
function ohneKommentare(koerper) {
  return koerper
    .split('\n')
    .filter((zeile) => !zeile.trimStart().startsWith('//') && !zeile.trimStart().startsWith('*'))
    .join('\n')
}

/**
 * Sammelt die Namen aller aus `koerper` heraus aufgerufenen Funktionen
 * (ohne Kommentare). Grob, aber für diesen Zweck ausreichend: gesucht wird
 * jeder Bezeichner unmittelbar vor einer öffnenden Klammer.
 */
function aufgerufeneNamen(koerper) {
  const namen = new Set()
  for (const treffer of ohneKommentare(koerper).matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)) {
    namen.add(treffer[1])
  }
  return namen
}

/**
 * Prüft `ermittleErgebnisCodex` UND jede lokale Funktion, die von dort aus
 * erreichbar ist, auf stderr-Zugriff. Ein namensgebundener Grep über nur
 * eine Funktion wäre zu schwach: eine ausgelagerte Hilfsfunktion, die
 * stderr auswertet, passierte ihn unbemerkt, während AK8 die Aussage über
 * den ganzen Codex-Zweig verlangt. Liefert die Liste der Verstöße plus die
 * tatsächlich geprüften Funktionsnamen (damit das Häkchen benennt, worüber
 * es spricht).
 */
function pruefeZweigAufStderr(quelle, einstieg) {
  const offen = [einstieg]
  const geprueft = []
  const verstoesse = []
  while (offen.length > 0) {
    const name = offen.pop()
    if (geprueft.includes(name)) continue
    const koerper = funktionsKoerper(quelle, name)
    if (koerper === null) continue
    geprueft.push(name)
    if (/stderr/.test(ohneKommentare(koerper))) verstoesse.push(name)
    for (const aufgerufen of aufgerufeneNamen(koerper)) {
      // Nur lokale Funktionen derselben Datei sind hier verfolgbar; alles
      // andere (Importe, eingebaute Methoden) hat keinen Körper zum Prüfen.
      if (!geprueft.includes(aufgerufen) && funktionsKoerper(quelle, aufgerufen) !== null) offen.push(aufgerufen)
    }
  }
  return { verstoesse, geprueft }
}

const evaluatorQuelle = readFileSync(EVALUATOR_DATEI, 'utf-8')
const codexKoerper = funktionsKoerper(evaluatorQuelle, CODEX_FUNKTION)
if (codexKoerper === null) {
  befunde.push(`(g): ${CODEX_FUNKTION} in ${EVALUATOR_DATEI} nicht gefunden — der Codex-Zweig (AK8) fehlt oder heißt anders`)
} else {
  const { verstoesse, geprueft } = pruefeZweigAufStderr(evaluatorQuelle, CODEX_FUNKTION)
  if (verstoesse.length > 0) {
    befunde.push(`(g): stderr-Zugriff im Codex-Zweig von ${EVALUATOR_DATEI}, in: ${verstoesse.join(', ')} (ARCHITECTURE.md §7, F-309)`)
  } else {
    console.log(`✓ (g): kein stderr-Zugriff im Codex-Zweig (geprüft: ${geprueft.join(', ')}) — ARCHITECTURE.md §7, F-309.`)
  }
}

// Die Weiche selbst: sie MUSS vor dem leseErgebnisobjekt-Aufruf stehen
// (F-283) — steht sie danach, scheitert jeder Codex-Lauf an einem
// JSON.parse über das gesamte stdout, und zwar lautlos als
// 'kein_ergebnisobjekt'.
const weicheIndex = evaluatorQuelle.indexOf(`return ${CODEX_FUNKTION}(rohInhalt)`)
const leseErgebnisIndex = evaluatorQuelle.indexOf('leseErgebnisobjekt(rohstrom.stdout)')
if (weicheIndex < 0 || leseErgebnisIndex < 0) {
  befunde.push(`(g): Worker-Weiche oder leseErgebnisobjekt-Aufruf in ${EVALUATOR_DATEI} nicht auffindbar — Reihenfolge nicht prüfbar`)
} else if (weicheIndex > leseErgebnisIndex) {
  befunde.push(`(g): die Worker-Weiche steht NACH dem leseErgebnisobjekt-Aufruf in ${EVALUATOR_DATEI} — jeder Codex-Lauf scheitert dort (F-283)`)
} else {
  console.log('✓ (g): die Worker-Weiche steht vor dem leseErgebnisobjekt-Aufruf (F-283).')
}

// Rot-Kalibrierung für (g): ohne sie wäre das Häkchen oben nur die Aussage
// „der Grep hat nichts gefunden", nicht „der Grep findet etwas, wenn es da
// ist" (ARCHITECTURE.md §8).
const gRotKoerper = [
  'function ermittleErgebnisCodex(rohInhalt) {',
  '  // stderr wird hier nur im Kommentar erwähnt',
  '  if (rohstrom.stderr.includes("ERROR")) return { ergebnis: "FEHLGESCHLAGEN" }',
  '  return { ergebnis: "ERFOLGREICH" }',
  '}',
  '',
].join('\n')
if (pruefeZweigAufStderr(gRotKoerper, CODEX_FUNKTION).verstoesse.length === 0) {
  befunde.push('(g): Rot-Kalibrierung fehlgeschlagen — ein simulierter stderr-Zugriff im Funktionskörper wird NICHT erkannt')
} else {
  console.log('✓ (g): Rot-Kalibrierung — ein simulierter stderr-Zugriff im Funktionskörper wird erkannt.')
}
// Zweite Rot-Kalibrierung, der eigentliche Punkt der Aufrufverfolgung: der
// stderr-Zugriff liegt in einer AUSGELAGERTEN lokalen Hilfsfunktion. Genau
// dieser Fall passierte die frühere, namensgebundene Fassung dieses Gates
// unbemerkt — das Gate belegte dann „diese eine Funktion nennt stderr
// nicht", während AK8 die Aussage über den ganzen Zweig verlangt.
const gRotAusgelagert = [
  'function leseStderrHeuristik(rohstrom) {',
  '  return rohstrom.stderr.length > 0',
  '}',
  '',
  'function ermittleErgebnisCodex(rohInhalt) {',
  '  if (leseStderrHeuristik(JSON.parse(rohInhalt))) return { ergebnis: "FEHLGESCHLAGEN" }',
  '  return { ergebnis: "ERFOLGREICH" }',
  '}',
  '',
].join('\n')
if (!pruefeZweigAufStderr(gRotAusgelagert, CODEX_FUNKTION).verstoesse.includes('leseStderrHeuristik')) {
  befunde.push('(g): Rot-Kalibrierung fehlgeschlagen — ein in eine Hilfsfunktion AUSGELAGERTER stderr-Zugriff wird NICHT erkannt')
} else {
  console.log('✓ (g): Rot-Kalibrierung — auch ein ausgelagerter stderr-Zugriff wird über die Aufrufverfolgung erkannt.')
}
const gGruenKoerper = ['function ermittleErgebnisCodex(rohInhalt) {', '  // liest bewusst kein stderr', '  return { ergebnis: "ERFOLGREICH" }', '}', ''].join('\n')
if (pruefeZweigAufStderr(gGruenKoerper, CODEX_FUNKTION).verstoesse.length > 0) {
  befunde.push('(g): Grün-Gegenprobe fehlgeschlagen — eine bloße Kommentarerwähnung von stderr erzeugt einen Befund')
} else {
  console.log('✓ (g): Grün-Gegenprobe — eine bloße Kommentarerwähnung von stderr erzeugt keinen Befund.')
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
