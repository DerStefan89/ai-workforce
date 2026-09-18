/**
 * Datei: scripts/check-f20-design-tokens.mjs
 *
 * Zweck: F20-WS-1-Gate (AK4) plus F-438-Nachzug (F29 WS-1b). Ursprünglich
 * (AK4) nur public/leitstand/style.css: jede Farbe liegt in der
 * Token-Definition (:root-Block), nirgends sonst im Stylesheet steht ein
 * Farbliteral (Hex oder rgb()/rgba()). F-438 (F29 WS-1b, Auftrag Punkt 2)
 * weitet dieselbe Prüfung auf ALLE layoutrelevanten Dateien unter
 * public/leitstand/ aus — index.html und jede *.js-Datei dort (rekursiv,
 * deckt also auch views/) —, weil ein Farbliteral in einem dieser JS-Module
 * (z. B. ein Inline-style oder eine dynamisch erzeugte Klasse) von der
 * ursprünglichen Prüfung nicht gefunden worden wäre. persona.js/
 * persona-state.js sind bereits über scripts/check-f28-persona.mjs separat
 * abgedeckt (Auftrag: hier nicht doppelt prüfen, aber auch nicht
 * ausschließen — schadet nicht, wenn beide Gates dieselbe Datei sauber
 * befinden). Eine Quelltextprüfung per Regex, kein Rendern — sie belegt,
 * dass der Quelltext die Grenze FÜHRT, nicht, dass ein Browser sie korrekt
 * zeigt.
 *
 * Wird aufgerufen von: `npm run check`
 *
 * Aufruf: node scripts/check-f20-design-tokens.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { readFileSync, readdirSync } from 'node:fs'

const CSS_PFAD = 'public/leitstand/style.css'
const LEITSTAND_VERZEICHNIS = 'public/leitstand'
const befunde = []
console.log('\n=== F20-Design-Tokens-Check (AK4 + F-438: alle layoutrelevanten Dateien unter public/leitstand/) ===\n')

// Ein Farbliteral: Hex-Code (#fff, #ffffff, mit Alpha) oder rgb()/rgba() — mit bis zu einer
// Ebene verschachtelter Klammern, damit eine Token-Referenz wie 'rgba(var(--x-rgb), 0.4)'
// als GANZER Aufruf erkannt wird statt nur bis zur ersten schließenden Klammer der var()-Referenz
// (sonst ein falscher Fund). Ein rgba()/rgb()-Aufruf, der 'var(' enthält, ist selbst kein
// Farbliteral, sondern eine erlaubte Token-Nutzung, und wird deshalb ausgeschlossen.
// GRENZE: ein Hex-Muster wie '#facade' würde weiterhin fälschlich als Farbliteral gelten, auch
// wenn es ein ID-Selektor oder ein CSS-Fragment in Prosa wäre — kommt aktuell nicht vor.
const FARB_MUSTER = /#[0-9a-fA-F]{3,8}\b|\brgba?\((?:[^()]|\([^()]*\))*\)/g

/** @param text - zu durchsuchender Quelltext @returns die gefundenen Farbliterale, Token-Nutzung (rgb(a) mit var()) ausgeschlossen */
function findeFarbliterale(text) {
  return (text.match(FARB_MUSTER) ?? []).filter((fund) => !(fund.startsWith('rgb') && fund.includes('var(')))
}

// ─── (1) style.css: Farbliterale nur AUSSERHALB der :root-Token-Definition (AK4) ───
{
  // Kommentare zuerst raus (Muster scripts/check-f15-workflow-oberflaeche.mjs entferneKommentare):
  // sonst löst eine bloße Erwähnung von 'rgb()' oder einem Hex-Beispiel in der Prosa dieser Datei
  // selbst einen Befund aus.
  const quelltext = readFileSync(CSS_PFAD, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ')

  // Alle :root-Blöcke (nicht nur den ersten — ein zweiter unter z. B.
  // @media (prefers-color-scheme: dark) ist eine legitime Erweiterung der
  // Tokens, keine zweite Regelmenge) werden vor der Literal-Suche entfernt.
  const rootBloecke = quelltext.match(/:root\s*\{[^}]*\}/g)
  if (rootBloecke === null) {
    befunde.push(`Keine :root-Token-Definition in ${CSS_PFAD} gefunden.`)
  }

  let ohneRoot = quelltext
  for (const block of rootBloecke ?? []) {
    ohneRoot = ohneRoot.replace(block, ' ')
  }

  const treffer = findeFarbliterale(ohneRoot)
  if (treffer.length > 0) {
    befunde.push(`${CSS_PFAD}: ${treffer.length} Farbliteral(e) außerhalb der :root-Token-Definition gefunden: ${[...new Set(treffer)].join(', ')}`)
  }
}

// ─── (2) F-438: alle *.js/*.html unter public/leitstand/ (rekursiv) ────────────────
// Ungefiltert (keine Kommentarentfernung wie bei style.css oben) — Muster
// scripts/check-f28-persona.mjs prüft seine drei Dateien ebenfalls ungefiltert: ein
// Farbliteral in einem JS-Kommentar ist eher ein Indiz für eine versehentlich stehen
// gebliebene Notiz als ein Fund, den man verstecken sollte.
/** @param verzeichnis - Ordner, rekursiv durchsucht (Pfade mit '/', plattformunabhängig) @returns alle *.js/*.html-Pfade darunter */
function sammleJsUndHtmlDateien(verzeichnis) {
  const ergebnis = []
  for (const eintrag of readdirSync(verzeichnis, { withFileTypes: true })) {
    const pfad = `${verzeichnis}/${eintrag.name}`
    if (eintrag.isDirectory()) {
      ergebnis.push(...sammleJsUndHtmlDateien(pfad))
    } else if (eintrag.name.endsWith('.js') || eintrag.name.endsWith('.html')) {
      ergebnis.push(pfad)
    }
  }
  return ergebnis
}

for (const pfad of sammleJsUndHtmlDateien(LEITSTAND_VERZEICHNIS)) {
  const treffer = findeFarbliterale(readFileSync(pfad, 'utf8'))
  if (treffer.length > 0) {
    befunde.push(`${pfad}: ${treffer.length} Farbliteral(e): ${[...new Set(treffer)].join(', ')}`)
  }
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
