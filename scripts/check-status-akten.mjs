/**
 * Datei: scripts/check-status-akten.mjs
 *
 * Zweck: Gleicht docs/STATUS.md gegen die Feature-Akten ab (Gedächtnislücken-
 * Auftrag, 29.09.2026, F-794). Maßgeblich ist allein die Standardform
 * „`features/<ID>/feature.md`, Status `<WERT>`“ — Freitext mit der ID allein
 * zählt nicht. Zwei Prüfungen:
 * (a) Für jede Akte features/<ID>/feature.md mit Status IN_ARBEIT,
 *     FEATURE_GATE oder ABGESCHLOSSEN enthält STATUS.md mindestens eine
 *     Standardform-Angabe (Anlassfall: F36 stand nur als Freitext „noch
 *     nicht begonnen“ in STATUS.md).
 * (b) Jede Standardform-Angabe in STATUS.md nennt den Status der Akte
 *     (Anlassfall: F19 „FEATURE_GATE“ statt „ABGESCHLOSSEN“) und zeigt auf
 *     eine existierende Akte.
 *
 * Wird aufgerufen von: npm run check (package.json, direkt nach check-docs);
 * scripts/check-f45-b5b1b2-bereinigung.mjs (als Prozess in der Attrappe).
 * Die Standardform liegt seit F45 B5b-1b-2 in src/workboard/status-md.ts.
 *
 * Wichtig — bekannte Grenzen:
 * - Varianten der Standardform erkennt das Gate nicht: „Status: `X`“ mit
 *   Doppelpunkt, „(Status `X`)“ in Klammern, ein Umbruch mitten in
 *   „features/<ID>“. Eine solche Angabe zählt für (a) nicht und wird in (b)
 *   nicht verglichen. Zeilenumbrüche vor „feature.md“ und vor „Status“ sind
 *   erlaubt.
 * - Freitext neben der Standardform (z. B. „noch nicht begonnen“ in einem
 *   anderen Absatz) prüft das Gate nicht.
 * - Die Akten markieren gemergte Workstreams nicht maschinenlesbar (kein
 *   festes „WS-n gemergt“-Feld). „Jeder gemergte Workstream einer
 *   IN_ARBEIT-Akte steht in STATUS.md“ ist deshalb bewusst nicht gebaut —
 *   es würde raten.
 * - Akten ohne „Status:“-Zeile überspringt dieses Gate; die fängt
 *   scripts/check-feature.mjs.
 * - Findet das Gate keine einzige Akte (falsches Arbeitsverzeichnis), ist
 *   das ein Befund, nicht still grün.
 *
 * Aufruf: node scripts/check-status-akten.mjs [pfad-zu-STATUS.md]
 *   (das optionale Argument dient der Rot-Kalibrierung gegen eine
 *   veränderte Kopie, siehe state/gates.md)
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { sammleStatusMdAngaben } from '../src/workboard/status-md.ts'

const statusPfad = process.argv[2] ?? 'docs/STATUS.md'
const featuresDir = 'features'
const pflichtStatus = new Set(['IN_ARBEIT', 'FEATURE_GATE', 'ABGESCHLOSSEN'])

// Standardform und Zeilenzählung (Beginn des Treffers): eine Regel mit der Bereinigungsliste (F45 B5b-1b-2,
// sammleStatusMdAngaben in src/workboard/status-md.ts).

console.log('\n=== STATUS-Akten-Check ===\n')

/**
 * Liest den Status-Wert einer Akte aus der ersten Zeile „Status: <WERT>“ —
 * wie scripts/check-feature.mjs, aber ohne über ein leeres „Status:“ in die
 * Folgezeile zu lesen.
 * @param {string} inhalt Inhalt von feature.md
 * @returns {string | null} Status-Wert oder null, wenn keine Zeile existiert
 */
function leseAktenStatus(inhalt) {
  const treffer = inhalt.match(/^Status:[ \t]*(\S+)/m)
  return treffer ? treffer[1] : null
}

const befunde = []

if (!existsSync(statusPfad)) {
  befunde.push(`${statusPfad} fehlt`)
} else {
  const angaben = sammleStatusMdAngaben(readFileSync(statusPfad, 'utf-8'))
  const akten = existsSync(featuresDir)
    ? readdirSync(featuresDir, { withFileTypes: true })
        .filter((e) => e.isDirectory() && existsSync(join(featuresDir, e.name, 'feature.md')))
        .map((e) => e.name)
    : []

  if (akten.length === 0) {
    befunde.push(`keine Akte unter ${featuresDir}/*/feature.md gefunden — falsches Arbeitsverzeichnis?`)
  }

  const aktenStatus = new Map()
  for (const id of akten) {
    const aktenPfad = join(featuresDir, id, 'feature.md')
    const status = leseAktenStatus(readFileSync(aktenPfad, 'utf-8'))
    aktenStatus.set(id, status)
    if (status === null || !pflichtStatus.has(status)) continue
    if (!angaben.some((a) => a.id === id)) {
      befunde.push(
        `(a) ${aktenPfad} (Status ${status}): keine Angabe „\`features/${id}/feature.md\`, Status \`${status}\`“ in ${statusPfad} — Standardform nachziehen`
      )
    }
  }

  // Ohne Akten wäre jede Angabe ein Folgebefund des obigen — nicht wiederholen.
  for (const { id, genannt, zeile } of akten.length === 0 ? [] : angaben) {
    const tatsaechlich = aktenStatus.get(id)
    if (tatsaechlich === undefined) {
      befunde.push(`(b) ${statusPfad}:${zeile}: ${id} hat keine Akte unter ${featuresDir}/ — Tippfehler oder gelöschte Akte`)
      continue
    }
    if (tatsaechlich === null) continue
    if (genannt !== tatsaechlich) {
      befunde.push(
        `(b) ${statusPfad}:${zeile}: ${id} steht dort als ${genannt}, die Akte sagt ${tatsaechlich} — STATUS.md nachziehen`
      )
    }
  }
}

if (befunde.length === 0) {
  console.log('✓ Keine Befunde.\n')
  process.exit(0)
}

console.log(`✗ ${befunde.length} Befund(e):\n`)
for (const b of befunde) console.log(`  - ${b}`)
console.log('')
process.exit(1)
