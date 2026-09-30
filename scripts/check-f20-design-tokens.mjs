/**
 * Datei: scripts/check-f20-design-tokens.mjs
 *
 * Zweck: F20-WS-1-Gate (AK4) plus F-438-Nachzug (F29 WS-1b). Ursprünglich
 * (AK4) nur public/leitstand/style.css: jede Farbe liegt in der
 * Token-Definition (:root-Block), nirgends sonst im Stylesheet steht ein
 * Farbliteral (Hex, rgb()/rgba(), seit F-725 WS-0 weitere Farbfunktionen, siehe unten). F-438
 * (F29 WS-1b, Auftrag Punkt 2) weitet dieselbe Prüfung auf ALLE
 * layoutrelevanten Dateien unter public/leitstand/ aus — index.html und jede
 * *.js-Datei dort (rekursiv, deckt also auch views/) —, weil ein Farbliteral
 * in einem dieser JS-Module (z. B. ein Inline-style oder eine dynamisch
 * erzeugte Klasse) von der ursprünglichen Prüfung nicht gefunden worden wäre.
 * persona.js/persona-state.js sind bereits über scripts/check-f28-persona.mjs
 * separat abgedeckt (Auftrag: hier nicht doppelt prüfen, aber auch nicht
 * ausschließen — schadet nicht, wenn beide Gates dieselbe Datei sauber
 * befinden). Eine Quelltextprüfung per Regex, kein Rendern — sie belegt,
 * dass der Quelltext die Grenze FÜHRT, nicht, dass ein Browser sie korrekt
 * zeigt. F-468 (Nachzug zu F-467): dieselbe Prüfung zählt zusätzlich in
 * jedem Stylesheet die Vorkommen von '/*' gegen '*\/' — ungleiche Anzahl
 * heißt, ein Kommentar wurde vorzeitig geschlossen oder nie geschlossen und
 * wirft nachfolgenden Quelltext aus der geltenden Regelmenge (F-467: genau
 * das passierte in style.css). Bewusst NUR für CSS, nicht für die
 * *.js/*.html-Dateien unten (Auftrag YAGNI): CSS kennt ausschließlich
 * Block-Kommentare, jedes zufällige '*\/' in Prosa dort ist gefährlich. JS/
 * HTML kommentieren layoutnahe Hinweise überwiegend per '//'/'<!-- -->',
 * wo Verzeichnis-Glob-Prosa (ein Stern als Platzhalter direkt neben einem
 * Schrägstrich, wie bei den view-Dateien oder der feature.md je Vorhaben)
 * harmlos ein unausgeglichenes '/*'-'*\/'-Paar erzeugt (verifiziert:
 * mehrere echte, unauffällige Treffer in app.js/index.html/router.js) — eine
 * blinde Zählung dort wäre kein tragfähiges Gate, sondern Dauer-Rauschen.
 *
 * F-725 WS-0 (Design-Schnitt, Hell/Dunkel-Umschalter der Vorlage V10):
 * - Token-Blöcke sind neben `:root { … }` auch `:root[data-theme="light"]`
 *   und `:root[data-theme="dark"]` (Anführungszeichen einfach, doppelt oder
 *   keine). Ein Selektor `[data-theme="light"] .x { color: … }` mit Literal
 *   bleibt rot — Hell-Werte gehören als Token-Überschreibung in den
 *   :root[data-theme]-Block, nicht in einzelne Regeln.
 * - Innerhalb eines Token-Blocks dürfen Literale nur in Custom-Property-
 *   Deklarationen (`--name: …`) stehen; `:root[data-theme="light"]{background:#fff}`
 *   gestaltet das html-Element direkt und ist rot.
 * - Token-Blöcke gelten nur in style.css (der einen Token-Quelle); style.css
 *   MUSS einen :root-Block tragen. Jede weitere *.css unter public/leitstand/
 *   (rekursiv) wird mit derselben Literal-Regel und derselben Kommentar-
 *   Balance geprüft, darf aber keine eigenen Farb-Tokens definieren.
 * - Farbfunktionen: rgb/rgba, hsl/hsla, hwb, lab, lch, oklab, oklch, color —
 *   ohne Unterscheidung von Groß- und Kleinschreibung.
 * - Ein Rot/Grün-Selbsttest (Abschnitt 3) belegt die Regeln an konstruierten
 *   Stylesheets und an Wegwerf-Dateien in einem Temp-Ordner, nie unter
 *   public/.
 *
 * Wird aufgerufen von: `npm run check`
 *
 * Wichtig — bekannte Grenzen:
 * - Farbnamen (`white`, `red` …) erkennt das Gate nicht.
 * - Ein Funktionsaufruf mit irgendeinem `var(` gilt als Token-Nutzung, auch
 *   wenn daneben feste Kanäle stehen (`rgb(255 0 0 / var(--a))`,
 *   `hsl(var(--h) 80% 40%)`). Das ist bewusst, weil `rgba(var(--x-rgb), 0.4)`
 *   die erlaubte Form für Transparenz ist.
 * - Mit dem i-Flag und den neuen Funktionsnamen würden im JS/HTML-Scan auch
 *   Aufrufe wie `obj.color(`, `new Color(` oder `RGB(` rot (sichere Richtung;
 *   heute kein Treffer). Numerische HTML-Entities wie `&#160;` passen auf das
 *   Hex-Muster. Doppelt verschachtelte Klammern (`rgb(calc(2 * calc(1)) 0 0)`)
 *   erkennt das Muster nicht.
 * - Gescannt werden *.css, *.js und *.html; manifest.webmanifest und *.svg
 *   nicht (das Manifest trägt seine Farben als Literal, A13 im Abgleich).
 * - Ein Token-Block wird als Text bis zur ersten `}` erkannt; eine Selektor-
 *   liste wie `.x, :root { … }` gälte deshalb als Token-Block (kommt nicht
 *   vor).
 *
 * Aufruf: node scripts/check-f20-design-tokens.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const CSS_PFLICHT_ROOT = 'style.css'
const LEITSTAND_VERZEICHNIS = 'public/leitstand'
const befunde = []
console.log('\n=== F20-Design-Tokens-Check (AK4 + F-438 + F-725 WS-0: alle layoutrelevanten Dateien unter public/leitstand/) ===\n')

// Ein Farbliteral: Hex-Code (#fff, #ffffff, mit Alpha) oder ein Farbfunktionsaufruf (rgb/rgba,
// hsl/hsla, hwb, lab, lch, oklab, oklch, color; CSS-Funktionsnamen ohne Groß-/Kleinschreibung) — mit bis
// zu einer Ebene verschachtelter Klammern, damit eine Token-Referenz wie 'rgba(var(--x-rgb), 0.4)'
// als GANZER Aufruf erkannt wird statt nur bis zur ersten schließenden Klammer der var()-Referenz
// (sonst ein falscher Fund). Ein Funktionsaufruf, der 'var(' enthält, ist selbst kein
// Farbliteral, sondern eine erlaubte Token-Nutzung, und wird deshalb ausgeschlossen.
// GRENZE: ein Hex-Muster wie '#facade' würde weiterhin fälschlich als Farbliteral gelten, auch
// wenn es ein ID-Selektor oder ein CSS-Fragment in Prosa wäre — kommt aktuell nicht vor.
const FARB_MUSTER = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\((?:[^()]|\([^()]*\))*\)/gi

// Token-Blöcke: ':root { … }' sowie ':root[data-theme="light"|"dark"] { … }' (F-725 WS-0).
const TOKEN_BLOCK_MUSTER = /:root(?:\[data-theme=(["']?)(?:light|dark)\1\])?\s*\{[^}]*\}/g

// Custom-Property-Deklaration innerhalb eines Token-Blocks ('--name: Wert' bis ';' oder '}').
const CUSTOM_PROPERTY_MUSTER = /--[\w-]+\s*:[^;}]*/g

/**
 * Findet Farbliterale in einem Quelltext.
 * @param text - zu durchsuchender Quelltext
 * @returns die gefundenen Farbliterale, Token-Nutzung (Funktion mit var()) ausgeschlossen
 */
function findeFarbliterale(text) {
  return (text.match(FARB_MUSTER) ?? []).filter((fund) => fund.startsWith('#') || !/var\(/i.test(fund))
}

// F-468: ungleiche Anzahl von '/*' und '*/' deutet auf einen vorzeitig geschlossenen (oder nie
// geschlossenen) Kommentar hin, der nachfolgenden Quelltext aus der geltenden Regelmenge wirft
// (F-467: eine Wortkombination im Prosa-Kommentar von style.css bildete zufällig '*/' und schloss
// den Kommentar am Dateianfang vorzeitig — der komplette :root-Block wurde dadurch im Browser
// verworfen, im Quelltext aber unsichtbar). Kein vollständiger Parser (YAGNI): zählt nur
// Vorkommen, prüft nicht Verschachtelung oder String-/Template-Literal-Kontext.
/**
 * Zählt '/*' gegen '*\/' in einem Stylesheet (F-468).
 * @param pfad - geprüfte Datei (für die Befundmeldung)
 * @param text - ihr ungefilterter Quelltext
 * @returns Befundtext oder null
 */
function pruefeKommentarBalance(pfad, text) {
  const offen = (text.match(/\/\*/g) ?? []).length
  const geschlossen = (text.match(/\*\//g) ?? []).length
  if (offen === geschlossen) return null
  return `${pfad}: unausgeglichene Kommentarmarkierungen (${offen}x '/*', ${geschlossen}x '*/') — Hinweis auf einen vorzeitig geschlossenen oder nie geschlossenen Kommentar.`
}

/**
 * Prüft ein Stylesheet: Kommentar-Balance, Farbliterale nur in Custom Properties der Token-Blöcke,
 * bei der Token-Quelle Pflicht eines :root-Blocks. Reine Funktion — auch der Selbsttest ruft sie auf.
 * @param pfad - Pfad für die Befundmeldung
 * @param rohtext - ungefilterter CSS-Quelltext
 * @param istTokenQuelle - true nur für style.css: Token-Blöcke gelten, :root-Block ist Pflicht;
 *   false: jedes Literal ist ein Befund, auch in einem :root-Block
 * @returns Befundtexte (leer = sauber)
 */
function pruefeStylesheet(pfad, rohtext, istTokenQuelle) {
  const ergebnis = []
  const balance = pruefeKommentarBalance(pfad, rohtext)
  if (balance !== null) ergebnis.push(balance)

  // Kommentare zuerst raus (Muster scripts/check-f15-workflow-oberflaeche.mjs entferneKommentare):
  // sonst löst eine bloße Erwähnung von 'rgb()' oder einem Hex-Beispiel in der Prosa selbst einen
  // Befund aus.
  const quelltext = rohtext.replace(/\/\*[\s\S]*?\*\//g, ' ')

  // Alle Token-Blöcke (nicht nur den ersten — ein zweiter unter z. B.
  // @media (prefers-color-scheme: dark) oder als :root[data-theme="light"] ist eine legitime
  // Erweiterung der Tokens, keine zweite Regelmenge) werden vor der Literal-Suche entfernt —
  // genauer: nur ihre Custom-Property-Deklarationen; eine direkte Eigenschaft wie 'background:#fff'
  // im Block bleibt stehen und wird gefunden. Nur in der Token-Quelle (style.css).
  const tokenBloecke = istTokenQuelle ? (quelltext.match(TOKEN_BLOCK_MUSTER) ?? []) : []
  if (istTokenQuelle && !tokenBloecke.some((block) => /^:root\s*\{/.test(block))) {
    ergebnis.push(`Keine :root-Token-Definition in ${pfad} gefunden.`)
  }
  let ohneTokens = quelltext
  // Ersetzung als Funktion: ein $ im Block (z. B. in einem content-String) wird sonst als Ersetzungsmuster gelesen.
  for (const block of tokenBloecke) ohneTokens = ohneTokens.replace(block, () => block.replace(CUSTOM_PROPERTY_MUSTER, ' '))

  const treffer = findeFarbliterale(ohneTokens)
  if (treffer.length > 0) {
    ergebnis.push(`${pfad}: ${treffer.length} Farbliteral(e) außerhalb der Custom Properties der Token-Blöcke (:root, :root[data-theme] in ${CSS_PFLICHT_ROOT}) gefunden: ${[...new Set(treffer)].join(', ')}`)
  }
  return ergebnis
}

/**
 * Sammelt rekursiv alle Dateien mit einer der Endungen.
 * @param verzeichnis - Ordner, rekursiv durchsucht (Pfade mit '/', plattformunabhängig)
 * @param endungen - zulässige Dateiendungen, z. B. ['.css']
 * @returns alle Pfade darunter mit einer dieser Endungen
 */
function sammleDateien(verzeichnis, endungen) {
  const ergebnis = []
  for (const eintrag of readdirSync(verzeichnis, { withFileTypes: true })) {
    const pfad = `${verzeichnis}/${eintrag.name}`
    if (eintrag.isDirectory()) {
      ergebnis.push(...sammleDateien(pfad, endungen))
    } else if (endungen.some((endung) => eintrag.name.endsWith(endung))) {
      ergebnis.push(pfad)
    }
  }
  return ergebnis
}

/**
 * Prüft jede *.css unter einem Ordner; style.css direkt darin muss einen :root-Block tragen.
 * @param verzeichnis - Wurzel des Scans
 * @returns Befundtexte aller Stylesheets
 */
function pruefeAlleStylesheets(verzeichnis) {
  const cssDateien = sammleDateien(verzeichnis, ['.css'])
  const pflichtPfad = `${verzeichnis}/${CSS_PFLICHT_ROOT}`
  const ergebnis = []
  if (!cssDateien.includes(pflichtPfad)) ergebnis.push(`${pflichtPfad} fehlt.`)
  for (const pfad of cssDateien) {
    ergebnis.push(...pruefeStylesheet(pfad, readFileSync(pfad, 'utf8'), pfad === pflichtPfad))
  }
  return ergebnis
}

// ─── (1) alle *.css: Farbliterale nur in Custom Properties der Token-Blöcke von style.css (AK4, F-725 WS-0)
befunde.push(...pruefeAlleStylesheets(LEITSTAND_VERZEICHNIS))

// ─── (2) F-438: alle *.js/*.html unter public/leitstand/ (rekursiv) ────────────────
// Ungefiltert (keine Kommentarentfernung wie bei CSS oben) — Muster
// scripts/check-f28-persona.mjs prüft seine drei Dateien ebenfalls ungefiltert: ein
// Farbliteral in einem JS-Kommentar ist eher ein Indiz für eine versehentlich stehen
// gebliebene Notiz als ein Fund, den man verstecken sollte.
for (const pfad of sammleDateien(LEITSTAND_VERZEICHNIS, ['.js', '.html'])) {
  const text = readFileSync(pfad, 'utf8')
  const treffer = findeFarbliterale(text)
  if (treffer.length > 0) {
    befunde.push(`${pfad}: ${treffer.length} Farbliteral(e): ${[...new Set(treffer)].join(', ')}`)
  }
}

// ─── (3) Rot/Grün-Selbsttest (F-725 WS-0), nur an Wegwerf-Dateien im Temp-Ordner ───
// Muster Rot-Fall-Selbsttest in check-f25-projekte.mjs (2a): eine Regel, die ihren eigenen
// Rotfall nicht erkennt, ist kein Gate. Nichts davon berührt public/.
{
  // rotDurch: das Literal, das der Befund nennen muss — ein beliebiger anderer Befund zählt nicht als Rot.
  const faelle = [
    { css: ':root{--a:#000}:root[data-theme="light"]{--x:#fff}', rotDurch: null },
    { css: ":root{--a:#000}:root[data-theme='dark']{--x:#fff}", rotDurch: null },
    { css: ':root{--a:#000}:root[data-theme=light]{--x:#fff}', rotDurch: null },
    { css: ':root{--a:#000}[data-theme="light"] .a{color:#fff}', rotDurch: '#fff' },
    { css: ':root{--a:#000}:root[data-theme="light"] .a{color:#fff}', rotDurch: '#fff' },
    { css: ':root{--a:#000}:root[data-theme="sepia"]{--x:#fff}', rotDurch: '#fff' },
    { css: `:root{--a:#000}:root[data-theme="light']{--x:#fff}`, rotDurch: '#fff' },
    { css: ':root{--a:#000}:root[data-theme="light"]{background:#fff}', rotDurch: '#fff' },
    { css: ':root{--a:#000}.a{color:hsl(0 0% 100%)}', rotDurch: 'hsl(0 0% 100%)' },
    { css: ':root{--a:#000}.a{color:OKLCH(70% 0.1 200)}', rotDurch: 'OKLCH(70% 0.1 200)' },
    { css: ':root{--a:#000}.a{color:hsla(var(--h),50%,50%,.5)}', rotDurch: null },
    { css: ':root[data-theme="light"]{--x:#fff}', rotDurch: 'Keine :root-Token-Definition' },
  ]
  for (const fall of faelle) {
    const ergebnis = pruefeStylesheet('selbsttest.css', fall.css, true)
    const ok = fall.rotDurch === null ? ergebnis.length === 0 : ergebnis.some((b) => b.includes(fall.rotDurch))
    if (!ok) {
      befunde.push(`(3) Selbsttest ${fall.css}: erwartet ${fall.rotDurch === null ? 'grün' : `rot durch ${fall.rotDurch}`}, erhalten ${ergebnis.length === 0 ? 'grün' : ergebnis.join(' | ')}`)
    }
  }

  // Zweite CSS-Datei (Unterordner) mit Literal → rot; ohne Literal → grün. Belegt den rekursiven Scan.
  const tempWurzel = mkdtempSync(join(tmpdir(), 'f20-tokens-'))
  try {
    const wurzel = tempWurzel.replaceAll('\\', '/')
    writeFileSync(`${wurzel}/style.css`, ':root{--a:#000}.a{color:var(--a)}')
    mkdirSync(`${wurzel}/views`)
    writeFileSync(`${wurzel}/views/zwei.css`, '.b{color:#fff}')
    const rotBefunde = pruefeAlleStylesheets(wurzel)
    if (!rotBefunde.some((b) => b.includes('views/zwei.css'))) {
      befunde.push('(3) Selbsttest zweite CSS-Datei mit #fff: erwartet rot, erhalten grün')
    }
    writeFileSync(`${wurzel}/views/zwei.css`, ':root{--x:#fff}')
    if (!pruefeAlleStylesheets(wurzel).some((b) => b.includes('views/zwei.css'))) {
      befunde.push('(3) Selbsttest zweite CSS-Datei mit eigenem Token-Block: erwartet rot, erhalten grün')
    }
    writeFileSync(`${wurzel}/views/zwei.css`, '.b{color:var(--a)}')
    const gruenBefunde = pruefeAlleStylesheets(wurzel)
    if (gruenBefunde.length > 0) {
      befunde.push(`(3) Selbsttest zweite CSS-Datei ohne Literal: erwartet grün, erhalten ${gruenBefunde.join(' | ')}`)
    }
  } finally {
    raeumeVerzeichnis(tempWurzel)
  }
}

console.log('')
if (befunde.length === 0) {
  console.log('✓ Keine Befunde (Selbsttest (3): Rot- und Grünfälle wie erwartet).\n')
  process.exitCode = 0
} else {
  console.log(`✗ ${befunde.length} Befund(e):\n`)
  for (const b of befunde) console.log(`  - ${b}`)
  console.log('')
  process.exitCode = 1
}
