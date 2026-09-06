/**
 * Datei: scripts/check-f11-auftrag.mjs
 *
 * Zweck: Auftrag-Gate (F11 WS-1, state/plan-v1-f11-auftrag-ws1.md, state/
 * tasks/f11-auftrag-ws1.md). (a) drei Payload-Fixtures unter
 * schemas/examples/kontrollzustand-auftrag*.json gegen validiereAuftragDaten
 * (direkt aus src/auftrag/index.ts importiert, D5-Muster). (b) AK3-Grep +
 * Selbsttest (Muster check-f8-execution-controller.mjs, D4): kein Vorkommen
 * von 'auftragstext' im Teil von src/execution-controller/index.ts, der die
 * anfragen-Liste für den baueKontextpaket-Aufruf konstruiert — nur im
 * nachfolgenden Prompt-Zusammensetzungsteil.
 *
 * Bewusste Abweichung vom Vertragswortlaut (state/tasks/f11-auftrag-ws1.md
 * Punkt 9(b) beschreibt eine Teilung der GESAMTEN Datei am baueKontextpaket-
 * Marker): FUNKTIONSSTART_MARKER grenzt den geprüften "vorAufruf"-Bereich
 * zusätzlich auf den Funktionskörper ein. Ohne diese Eingrenzung meldet das
 * Gate einen Falsch-Befund gegen sich selbst — der Dateikopf-Kommentar von
 * src/execution-controller/index.ts erwähnt 'auftragstext' bereits in Prosa,
 * lange vor der Funktion (real beobachtet, Reviewer-Pass 06.09.2026).
 *
 * Bekannte Grenze (Reviewer-/QA-Pass 06.09.2026, kein Blocker für WS-1): das
 * Gate ist ein reiner Substring-Vergleich, keine AST-/Semantikprüfung. Ein
 * künftiger, nicht-adversarialer Refactor (z. B. eine ausgelagerte
 * Hilfsfunktion oder Modulkonstante außerhalb dieses Fensters, die
 * eingaben.auftragstext indirekt weiterreicht, ohne den Bezeichner selbst im
 * geprüften Bereich zu nennen) würde vom Gate NICHT erkannt. Ebenso deckt
 * `indexOf` nur das ERSTE Vorkommen von BAUEKONTEXTPAKET_AUFRUF_MARKER ab —
 * ein künftiger zweiter baueKontextpaket-Aufruf weiter unten in derselben
 * Datei läge unbeprüft in abAufruf. Das Gate ersetzt keine tiefere Prüfung,
 * sondern deckt genau den einen, in AK3 benannten Verstoßtyp mechanisch ab.
 *
 * Wird aufgerufen von: `npm run check`, `npm run check:template`
 *
 * Aufruf: node scripts/check-f11-auftrag.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { validiereAuftragDaten } from '../src/auftrag/index.ts'

const befunde = []
const EXECUTION_CONTROLLER_INDEX = join('src', 'execution-controller', 'index.ts')
const FUNKTIONSSTART_MARKER = 'export async function fuehreAufgabeDurch('
const BAUEKONTEXTPAKET_AUFRUF_MARKER = 'const kontextpaketErgebnis = baueKontextpaket('

console.log('\n=== F11-Auftrag-Check (WS-1) ===\n')

// ─── (a) Drei Payload-Fixtures gegen validiereAuftragDaten ─────────────────
const fixtures = [
  { pfad: 'schemas/examples/kontrollzustand-auftrag.valid.json', sollGueltigSein: true },
  { pfad: 'schemas/examples/kontrollzustand-auftrag.invalid-falscher-schema-wert.json', sollGueltigSein: false },
  { pfad: 'schemas/examples/kontrollzustand-auftrag.invalid-leerer-auftragstext.json', sollGueltigSein: false },
]

for (const { pfad, sollGueltigSein } of fixtures) {
  if (!existsSync(pfad)) {
    befunde.push(`${pfad}: Datei fehlt`)
    continue
  }
  let obj
  try {
    obj = JSON.parse(readFileSync(pfad, 'utf-8'))
  } catch (fehler) {
    befunde.push(`${pfad}: kein gültiges JSON (${fehler.message})`)
    continue
  }
  const verstoesse = validiereAuftragDaten(obj)
  if (sollGueltigSein && verstoesse.length > 0) {
    befunde.push(`${pfad}: sollte gültig sein, aber verletzt: ${verstoesse.join('; ')}`)
  }
  if (!sollGueltigSein && verstoesse.length === 0) {
    befunde.push(`${pfad}: sollte ungültig sein, aber keine Regelverletzung gefunden`)
  }
}
if (befunde.length === 0) {
  console.log(`✓ ${fixtures.length} Payload-Fixture(s) geprüft.`)
}

// ─── (b) AK3-Grep + Selbsttest: 'auftragstext' nie vor dem baueKontextpaket-Aufruf ──

/**
 * Teilt inhalt in den anfragen-Konstruktionsblock (ab FUNKTIONSSTART_MARKER,
 * ausschließlich Dateikopf-Kommentare/Imports) und den Prompt-
 * Zusammensetzungsteil (ab BAUEKONTEXTPAKET_AUFRUF_MARKER). Liefert null,
 * wenn einer der beiden Marker fehlt.
 * @param inhalt - zu prüfender Quelltext
 * @returns { vorAufruf, abAufruf } oder null
 */
function teileAmAufrufMarker(inhalt) {
  const funktionsIndex = inhalt.indexOf(FUNKTIONSSTART_MARKER)
  const aufrufIndex = inhalt.indexOf(BAUEKONTEXTPAKET_AUFRUF_MARKER)
  if (funktionsIndex === -1 || aufrufIndex === -1 || aufrufIndex < funktionsIndex) return null
  return { vorAufruf: inhalt.slice(funktionsIndex, aufrufIndex), abAufruf: inhalt.slice(aufrufIndex) }
}

const inhalt = readFileSync(EXECUTION_CONTROLLER_INDEX, 'utf-8')
const geteilt = teileAmAufrufMarker(inhalt)
if (geteilt === null) {
  befunde.push(`AK3: Marker "${FUNKTIONSSTART_MARKER}"/"${BAUEKONTEXTPAKET_AUFRUF_MARKER}" in ${EXECUTION_CONTROLLER_INDEX} nicht (in dieser Reihenfolge) gefunden — Gate kann nicht prüfen`)
} else {
  const { vorAufruf, abAufruf } = geteilt
  if (/auftragstext/.test(vorAufruf)) {
    befunde.push(`AK3: 'auftragstext' kommt in ${EXECUTION_CONTROLLER_INDEX} im anfragen-Konstruktionsblock (zwischen Funktionsstart und baueKontextpaket-Aufruf) vor — würde in die Anfragenliste durchsickern`)
  } else if (!/auftragstext/.test(abAufruf)) {
    befunde.push(`AK3: 'auftragstext' kommt in ${EXECUTION_CONTROLLER_INDEX} nirgends nach dem baueKontextpaket-Aufruf vor — Prompt-Zusammensetzung scheint auftragstext nicht zu nutzen`)
  } else {
    console.log(
      "✓ AK3: kein Vorkommen von 'auftragstext' im anfragen-Konstruktionsblock von src/execution-controller/index.ts, Vorkommen im Prompt-Zusammensetzungsteil danach vorhanden."
    )
  }
}

// Selbsttest: ein simulierter Verstoß (auftragstext im anfragen-Konstruktionsblock) muss real erkannt werden.
const simulierterVerstoss = `${FUNKTIONSSTART_MARKER}eingaben) {\n  const anfragen = [{ pfad: 'x', frage: eingaben.auftragstext, begruendung: 'x', inhalt: 'x' }]\n  ${BAUEKONTEXTPAKET_AUFRUF_MARKER}anfragen, ...)`
const geteilterVerstoss = teileAmAufrufMarker(simulierterVerstoss)
if (geteilterVerstoss === null || !/auftragstext/.test(geteilterVerstoss.vorAufruf)) {
  befunde.push('AK3-Selbsttest: Muster erkennt einen simulierten Verstoß NICHT — Grep-Regel ist wirkungslos')
} else {
  console.log('✓ AK3-Selbsttest: simulierter Verstoß (auftragstext im anfragen-Konstruktionsblock) wird erkannt.')
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
