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
 * Wird aufgerufen von: npm run check (package.json, direkt nach check-docs).
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

const statusPfad = process.argv[2] ?? 'docs/STATUS.md'
const featuresDir = 'features'
const pflichtStatus = new Set(['IN_ARBEIT', 'FEATURE_GATE', 'ABGESCHLOSSEN'])

// Standardform; \s* erlaubt die Umbrüche, mit denen STATUS.md Fließtext umbricht.
const standardForm = /features\/([A-Za-z0-9-]+)\/\s*feature\.md`,?\s*Status\s*`([A-Z_]+)`/g

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

/**
 * Sammelt alle Standardform-Angaben aus STATUS.md.
 * @param {string} text Inhalt von STATUS.md
 * @returns {{ id: string, genannt: string, zeile: number }[]} je Angabe ID,
 *   genannter Status und 1-basierte Zeilennummer
 */
function sammleAngaben(text) {
  return [...text.matchAll(standardForm)].map((t) => ({
    id: t[1],
    genannt: t[2],
    zeile: text.slice(0, t.index).split('\n').length,
  }))
}

const befunde = []

if (!existsSync(statusPfad)) {
  befunde.push(`${statusPfad} fehlt`)
} else {
  const angaben = sammleAngaben(readFileSync(statusPfad, 'utf-8'))
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
