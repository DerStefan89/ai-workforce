/**
 * Datei: scripts/check-f20-design-tokens.mjs
 *
 * Zweck: F20-WS-1-Gate für AK4 — jede Farbe in public/leitstand/style.css
 * liegt in der Token-Definition (:root-Block), nirgends sonst im
 * Stylesheet steht ein Farbliteral (Hex oder rgb()/rgba()). Eine
 * Quelltextprüfung per Regex, kein Rendern — sie belegt, dass das
 * Stylesheet die Grenze FÜHRT, nicht, dass ein Browser sie korrekt zeigt.
 *
 * Wird aufgerufen von: `npm run check`
 *
 * Aufruf: node scripts/check-f20-design-tokens.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { readFileSync } from 'node:fs'

const PFAD = 'public/leitstand/style.css'
const befunde = []
console.log('\n=== F20-WS-1-Check (AK4, Design-Tokens in public/leitstand/style.css) ===\n')

// Kommentare zuerst raus (Muster scripts/check-f15-workflow-oberflaeche.mjs entferneKommentare):
// sonst löst eine bloße Erwähnung von 'rgb()' oder einem Hex-Beispiel in der Prosa dieser Datei
// selbst einen Befund aus.
const quelltext = readFileSync(PFAD, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ')

// Alle :root-Blöcke (nicht nur den ersten — ein zweiter unter z. B.
// @media (prefers-color-scheme: dark) ist eine legitime Erweiterung der
// Tokens, keine zweite Regelmenge) werden vor der Literal-Suche entfernt.
const rootBloecke = quelltext.match(/:root\s*\{[^}]*\}/g)
if (rootBloecke === null) {
  befunde.push(`Keine :root-Token-Definition in ${PFAD} gefunden.`)
}

let ohneRoot = quelltext
for (const block of rootBloecke ?? []) {
  ohneRoot = ohneRoot.replace(block, ' ')
}

// Ein Farbliteral: Hex-Code (#fff, #ffffff, mit Alpha) oder rgb()/rgba() — mit bis zu einer
// Ebene verschachtelter Klammern, damit eine Token-Referenz wie 'rgba(var(--x-rgb), 0.4)'
// als GANZER Aufruf erkannt wird statt nur bis zur ersten schließenden Klammer der var()-Referenz
// (sonst ein falscher Fund). Ein rgba()/rgb()-Aufruf, der 'var(' enthält, ist selbst kein
// Farbliteral, sondern eine erlaubte Token-Nutzung, und wird deshalb ausgeschlossen.
// GRENZE: ein Hex-Muster wie '#facade' würde weiterhin fälschlich als Farbliteral gelten, auch
// wenn es ein ID-Selektor wäre — kommt in diesem Stylesheet aktuell nicht vor.
const FARB_MUSTER = /#[0-9a-fA-F]{3,8}\b|\brgba?\((?:[^()]|\([^()]*\))*\)/g
const treffer = (ohneRoot.match(FARB_MUSTER) ?? []).filter((fund) => !(fund.startsWith('rgb') && fund.includes('var(')))
if (treffer.length > 0) {
  befunde.push(`${treffer.length} Farbliteral(e) außerhalb der :root-Token-Definition gefunden: ${[...new Set(treffer)].join(', ')}`)
}

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
