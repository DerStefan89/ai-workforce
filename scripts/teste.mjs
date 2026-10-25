/**
 * Datei: scripts/teste.mjs
 *
 * Zweck: Testlauf von `npm run test` (F45 T „Tests stabil“) in zwei Gruppen: alle Testdateien parallel
 * (`--test-concurrency=4`, wie bisher), danach die schweren Dateien aus SERIELL einzeln nacheinander
 * (`--test-concurrency=1`). Schwer heißt: die Datei startet einen echten Server, Worktree oder viele
 * git-/Kindprozesse und fiel unter Last an einer festen Wartegrenze aus (F-1186, F-1209) oder gehört in der Messung
 * zu den teuersten (features/F45/nachweise/t/messung.md).
 *
 * Wird aufgerufen von:
 * - package.json „test“ (Teil von `npm run check`)
 * - scripts/messe-check.mjs (findeTestdateien, gleiche Dateiliste)
 *
 * Wichtig:
 * - SERIELL ist eine explizite Liste ohne Namensmuster. Ein Eintrag, den die Dateierkennung nicht findet
 *   (umbenannt, gelöscht), bricht den Lauf mit Exit 2 ab, bevor ein Test läuft.
 * - findeTestdateien nutzt die Muster von `node --test` ohne Pfadangabe und schließt node_modules aus wie der
 *   Test-Runner von Node, sucht aber nur unter den Dateien, die git kennt: getrackte und ungetrackte, nicht
 *   ignorierte. Gitignorierte zählen nicht (die CI sieht ohnehin nur getrackte); ungetrackte zählen lokal mit,
 *   in der CI erst nach dem Commit. Am 24.10.2026 waren beide Mengen gleich (197 Dateien, Vergleich in der
 *   Messung).
 * - Zusatzargumente (`npm run test -- <datei>`) werden abgewiesen statt still verschluckt; eine einzelne Datei
 *   prüft `node --test <datei>`.
 * - Die Dateipfade gehen als Argumente an `node --test`, das sie als Glob-Muster liest: ein Testdateiname mit
 *   `[ ] * ? { }` oder führendem `-` würde falsch gelesen (heute keiner). Die Windows-Kommandozeile fasst
 *   32 767 Zeichen — bei ≈ 200 Pfaden ≈ 10 KB; ab ≈ 600 Testdateien die Gruppen in Teile schneiden.
 * - Ein Zeitfaktor (AIW_TEST_ZEITFAKTOR, scripts/_zeitfaktor.ts) wird hier NICHT gesetzt: einzeln liefen alle
 *   Dateien in der Messung grün, die Ausfälle kamen nur unter paralleler Last. Wer einen Faktor > 1 einführt,
 *   begründet ihn hier im Kopf.
 */

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, matchesGlob, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fuehreGitSync } from '../src/git-starter/index.ts'

/** Schwere Testdateien, die einzeln nacheinander laufen (Pfade relativ zur Repo-Wurzel, mit „/“). */
export const SERIELL = [
  // Ausfälle unter Last im vollen Lauf (F-1186).
  'scripts/leitstand-arbeitsordner.test.mjs',
  'scripts/leitstand/routen-code.test.mjs',
  'scripts/leitstand/routen-harness-abgleich.test.mjs',
  // Aus der Messung (features/F45/nachweise/t/messung.md): lange Laufzeit oder große Speicherspitze.
  'src/arbeitsordner/arbeitsordner.test.ts',
  'scripts/leitstand/routen-faehigkeit-vorschlag.test.mjs',
  'src/claude-code-gateway/claude-code-gateway.test.ts',
  // Ausfall unter Last (F-1209): Test „fuehreGitAsync … Node-execFile-Wettlauf“ brach am 25.10.2026 zweimal nach 30 s ab,
  // einzeln ≈ 6 s.
  'src/git-starter/git-starter.test.ts',
]

/** Standardmuster von `node --test` (Node 24, Typ-Entfernung an): test, test/**, test-*, *.test, *-test, *_test. */
const STANDARD_MUSTER = '**/{test,test/**/*,test-*,*[._-]test}.{js,mjs,cjs,ts,mts,cts}'

/**
 * Findet alle Testdateien mit den Mustern von `node --test`, aber nur unter den Dateien, die git kennt
 * (getrackt oder ungetrackt, nicht ignoriert). Die eigene Suche von `node --test` läuft durch jedes Verzeichnis,
 * auch durch gitignorierte lokale Reste (kontrollzustand-roh/, kontrollzustand-test*), und brauchte dafür lokal
 * ≈ 96 s (Messung F45 T). git läuft über fuehreGitSync (absoluter Programmpfad, ohne geerbte GIT_*-Variablen).
 * @param wurzel - Verzeichnis im Repo (Standard: aktuelles Verzeichnis)
 * @returns sortierte Pfade relativ zu wurzel, Trenner „/“
 * @throws wenn git ls-files scheitert (kein Repo, kein git)
 */
export function findeTestdateien(wurzel = process.cwd()) {
  let ausgabe
  try {
    ausgabe = fuehreGitSync(['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: wurzel, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] })
  } catch (fehler) {
    const text = fehler instanceof Error ? fehler.message : String(fehler)
    throw new Error(`git ls-files scheitert in ${wurzel}: ${text.trim()}`)
  }
  const pfade = new Set(ausgabe.split('\0').filter((pfad) => pfad !== ''))
  return [...pfade]
    .filter((pfad) => matchesGlob(pfad, STANDARD_MUSTER) && !pfad.split('/').includes('node_modules') && existsSync(join(wurzel, pfad)))
    .sort()
}

/**
 * Teilt die Testdateien in eine parallele und eine serielle Gruppe.
 * @param alle - alle Testdateien (findeTestdateien)
 * @param seriell - Liste der seriellen Dateien
 * @returns { parallel, seriell, fehlend } — fehlend: Einträge der seriellen Liste, die es nicht gibt
 */
export function teileAuf(alle, seriell = SERIELL) {
  const menge = new Set(alle)
  return {
    parallel: alle.filter((datei) => !seriell.includes(datei)),
    seriell: seriell.filter((datei) => menge.has(datei)),
    fehlend: seriell.filter((datei) => !menge.has(datei)),
  }
}

/**
 * Startet `node --test` für eine Gruppe und gibt den Exit-Code zurück.
 * @param dateien - Testdateien der Gruppe
 * @param parallelitaet - Wert für --test-concurrency
 * @returns Exit-Code (1, wenn der Prozess nicht startet oder durch ein Signal endet; der Grund steht auf stderr)
 */
function laufeGruppe(dateien, parallelitaet) {
  if (dateien.length === 0) return 0
  const lauf = spawnSync(process.execPath, ['--test', `--test-concurrency=${parallelitaet}`, ...dateien], { stdio: 'inherit' })
  if (lauf.error) console.error(`teste: node --test startet nicht: ${lauf.error.message}`)
  if (lauf.signal) console.error(`teste: node --test durch Signal ${lauf.signal} beendet (z. B. Speichermangel, F-1154).`)
  return lauf.status ?? 1
}

/**
 * Führt beide Gruppen nacheinander aus — die serielle auch dann, wenn die parallele rot ist.
 * @param gruppen - { parallel, seriell } aus teileAuf
 * @param laufe - Starter je Gruppe (dateien, parallelitaet) → Exit-Code; Standard laufeGruppe
 * @returns { parallel, seriell, exit } — exit = Exit der ersten roten Gruppe, sonst 0
 */
export function fuehreGruppenAus(gruppen, laufe = laufeGruppe) {
  const parallel = laufe(gruppen.parallel, 4)
  const seriell = laufe(gruppen.seriell, 1)
  return { parallel, seriell, exit: parallel !== 0 ? parallel : seriell }
}

const istDirekterAufruf = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (istDirekterAufruf) {
  if (process.argv.length > 2) {
    console.error(`teste: keine Zusatzargumente (${process.argv.slice(2).join(' ')}) — eine einzelne Datei prüft „node --test <datei>“.`)
    process.exit(2)
  }
  let gruppen
  try {
    gruppen = teileAuf(findeTestdateien())
  } catch (fehler) {
    console.error(`teste: Testdateien nicht bestimmbar: ${fehler instanceof Error ? fehler.message : String(fehler)}`)
    process.exit(2)
  }
  if (gruppen.fehlend.length > 0) {
    console.error(`teste: Einträge in SERIELL (scripts/teste.mjs) ohne Testdatei:\n${gruppen.fehlend.map((d) => `  - ${d}`).join('\n')}`)
    process.exit(2)
  }
  console.log(`teste: ${gruppen.parallel.length} Testdateien parallel (4), danach ${gruppen.seriell.length} seriell (1).`)
  const ergebnis = fuehreGruppenAus(gruppen)
  if (ergebnis.exit !== 0) console.error(`teste: rot — parallel Exit ${ergebnis.parallel}, seriell Exit ${ergebnis.seriell}.`)
  process.exit(ergebnis.exit)
}
