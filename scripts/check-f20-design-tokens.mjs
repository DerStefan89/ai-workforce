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
 * F44 WS-1a (Tokens der Vorlage V10 dunkel und hell): Abschnitt (4) prüft den
 * Kontrast nach WCAG 2.x in beiden Themes. Grundlage sind die Token-Blöcke von
 * style.css: dunkel = :root (plus :root[data-theme='dark'], falls vorhanden), hell =
 * :root überschrieben von :root[data-theme='light']. Aufgelöst werden var() (mit
 * Rückfallwert), Hex mit und ohne Alpha, rgb()/rgba() und color-mix(in srgb, …)
 * einschließlich transparent. Eine Fläche mit Alpha wird auf --color-bg gelegt, ein
 * Text mit Alpha auf seine Fläche. Paare und Schwellen stehen in KONTRAST_PAARE:
 * Text, Muted und Subtle auf bg/surface/surface-muted je 4,5:1, *-text auf
 * *-bg, accent-text auf accent und brand-text auf brand je 4,5:1. Ein Paar, das die
 * Vorlage selbst vorgibt und das durchfällt, wird nicht umgestaltet, sondern steht
 * begründet in KONTRAST_AUSNAHMEN (mit Finding); eine Ausnahme, die inzwischen besteht,
 * ist selbst ein Befund. Abschnitt (5) ist der Rot/Grün-Selbsttest dazu.
 *
 * Wird aufgerufen von: `npm run check`
 *
 * Wichtig — bekannte Grenzen:
 * - Kontrast (4): Nur die Paare in KONTRAST_PAARE, nicht jede Kombination, die eine
 *   Regel im Stylesheet tatsächlich bildet; der Browser-Nachweis bleibt Sache von
 *   render-nachweis und design-guardian. color-mix nur im Farbraum srgb.
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

// ─── (4) Kontrast nach WCAG in beiden Themes (F44 WS-1a) ───────────────────────────
// Paare: [Text-Token, Flächen-Token, Mindestkontrast]. Auch --color-text-subtle braucht 4,5:1 —
// es färbt kleinen Fließtext (.leer, .unbekannt, Zeitstempel), nicht nur großen Text (WCAG 1.4.3).
const KONTRAST_PAARE = [
  ...['--color-text', '--color-text-muted', '--color-text-subtle'].flatMap((text) => ['--color-bg', '--color-surface', '--color-surface-muted'].map((flaeche) => [text, flaeche, 4.5])),
  ...['success', 'danger', 'warning', 'info'].map((art) => [`--color-${art}-text`, `--color-${art}-bg`, 4.5]),
  // Akzent als Link-/Textfarbe (a { color: var(--color-accent) }) und Statusfarben als Text auf
  // gewöhnlichen Flächen (.fehler, .erfolg, Status-Punkte mit Text) — Code-Review WS-1a.
  ...['--color-accent', '--color-success-text', '--color-danger-text', '--color-warning-text'].flatMap((text) => ['--color-bg', '--color-surface'].map((flaeche) => [text, flaeche, 4.5])),
  ['--color-accent-text', '--color-accent', 4.5],
  ['--color-brand-text', '--color-brand', 4.5],
]

// Begründete Ausnahmen: Paare, die die Vorlage selbst vorgibt und die durchfallen. Form:
// { theme: 'dunkel'|'hell', text, flaeche, grund, finding }. Leer, solange alle Paare bestehen.
const KONTRAST_AUSNAHMEN = []

/**
 * Liest die Custom Properties eines Token-Blocks.
 * @param block - Text eines Token-Blocks inklusive Selektor und Klammern
 * @returns Map Name → Rohwert
 */
function leseCustomProperties(block) {
  const werte = new Map()
  const inhalt = block.slice(block.indexOf('{') + 1, block.lastIndexOf('}'))
  for (const deklaration of inhalt.split(';')) {
    const treffer = deklaration.match(/^\s*(--[\w-]+)\s*:\s*([\s\S]*?)\s*$/)
    if (treffer) werte.set(treffer[1], treffer[2])
  }
  return werte
}

/**
 * Baut die Token-Tabellen beider Themes aus einem Stylesheet.
 * @param rohtext - CSS-Quelltext (Token-Quelle)
 * @returns { dunkel: Map, hell: Map }
 */
function tokenTabellen(rohtext) {
  const quelltext = rohtext.replace(/\/\*[\s\S]*?\*\//g, ' ')
  // Basis = nur :root; jedes Theme = Basis plus seine eigenen Überschreibungen. So erbt hell nie
  // Werte eines :root[data-theme='dark']-Blocks, die im Browser dort nicht gelten.
  const basis = new Map()
  const dunkelUeberschreibungen = new Map()
  const hellUeberschreibungen = new Map()
  for (const block of quelltext.match(TOKEN_BLOCK_MUSTER) ?? []) {
    const selektor = block.slice(0, block.indexOf('{'))
    const ziel = /^:root\s*$/.test(selektor) ? basis : /dark/.test(selektor) ? dunkelUeberschreibungen : hellUeberschreibungen
    for (const [n, w] of leseCustomProperties(block)) ziel.set(n, w)
  }
  return { dunkel: new Map([...basis, ...dunkelUeberschreibungen]), hell: new Map([...basis, ...hellUeberschreibungen]) }
}

/**
 * Ersetzt alle var()-Verweise eines Ausdrucks rekursiv durch ihre Werte.
 * @param ausdruck - CSS-Wert
 * @param tabelle - Token-Tabelle des Themes
 * @param tiefe - Rekursionsschutz
 * @returns Ausdruck ohne var()
 */
function loeseVarAuf(ausdruck, tabelle, tiefe = 0) {
  if (tiefe > 20) throw new Error(`var()-Kette zu tief: ${ausdruck}`)
  const start = ausdruck.search(/var\(/)
  if (start === -1) return ausdruck
  let ebene = 0
  let ende = start + 4
  for (; ende < ausdruck.length; ende++) {
    if (ausdruck[ende] === '(') ebene++
    else if (ausdruck[ende] === ')') {
      if (ebene === 0) break
      ebene--
    }
  }
  const innen = ausdruck.slice(start + 4, ende)
  const komma = innen.indexOf(',')
  const name = (komma === -1 ? innen : innen.slice(0, komma)).trim()
  const rueckfall = komma === -1 ? undefined : innen.slice(komma + 1).trim()
  const wert = tabelle.get(name) ?? rueckfall
  if (wert === undefined) throw new Error(`Token nicht definiert: ${name}`)
  return loeseVarAuf(ausdruck.slice(0, start) + wert + ausdruck.slice(ende + 1), tabelle, tiefe + 1)
}

/**
 * Teilt eine Argumentliste an Kommas der obersten Ebene.
 * @param text - Inhalt zwischen den Klammern einer Funktion
 * @returns Argumente (getrimmt)
 */
function teileArgumente(text) {
  const teile = []
  let ebene = 0
  let anfang = 0
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '(') ebene++
    else if (text[i] === ')') ebene--
    else if (text[i] === ',' && ebene === 0) {
      teile.push(text.slice(anfang, i).trim())
      anfang = i + 1
    }
  }
  teile.push(text.slice(anfang).trim())
  return teile
}

/**
 * Wertet einen var()-freien Farbausdruck aus.
 * @param ausdruck - Hex, rgb()/rgba(), transparent oder color-mix(in srgb, …)
 * @returns { r, g, b, a } mit Kanälen 0–255 und Alpha 0–1
 */
function werteFarbeAus(ausdruck) {
  const text = ausdruck.trim()
  if (text === 'transparent') return { r: 0, g: 0, b: 0, a: 0 }
  const hex = text.match(/^#([0-9a-f]{3,8})$/i)
  if (hex) {
    let ziffern = hex[1]
    if (ziffern.length === 3 || ziffern.length === 4) ziffern = [...ziffern].map((z) => z + z).join('')
    if (ziffern.length !== 6 && ziffern.length !== 8) throw new Error(`Hex ungültig: ${text}`)
    const kanal = (i) => Number.parseInt(ziffern.slice(i, i + 2), 16)
    return { r: kanal(0), g: kanal(2), b: kanal(4), a: ziffern.length === 8 ? kanal(6) / 255 : 1 }
  }
  const rgb = text.match(/^rgba?\(([\s\S]*)\)$/i)
  if (rgb) {
    const zahlen = rgb[1].split(/[\s,/]+/).filter(Boolean).map(Number)
    if (zahlen.length < 3 || zahlen.some(Number.isNaN)) throw new Error(`rgb ungültig: ${text}`)
    return { r: zahlen[0], g: zahlen[1], b: zahlen[2], a: zahlen[3] ?? 1 }
  }
  const mix = text.match(/^color-mix\(([\s\S]*)\)$/i)
  if (mix) {
    const [raum, erster, zweiter] = teileArgumente(mix[1])
    if (!/^in\s+srgb$/i.test(raum)) throw new Error(`color-mix nur in srgb unterstützt: ${text}`)
    const teil = (arg) => {
      const prozent = arg.match(/\s(\d+(?:\.\d+)?)%$/)
      return { farbe: werteFarbeAus(prozent ? arg.slice(0, prozent.index) : arg), anteil: prozent ? Number(prozent[1]) / 100 : null }
    }
    const a = teil(erster)
    const b = teil(zweiter)
    const pa = a.anteil ?? (b.anteil === null ? 0.5 : 1 - b.anteil)
    const pb = b.anteil ?? 1 - pa
    const alpha = a.farbe.a * pa + b.farbe.a * pb
    if (alpha === 0) return { r: 0, g: 0, b: 0, a: 0 }
    // CSS color-mix interpoliert mit vormultipliziertem Alpha.
    const kanal = (k) => (a.farbe[k] * a.farbe.a * pa + b.farbe[k] * b.farbe.a * pb) / alpha
    return { r: kanal('r'), g: kanal('g'), b: kanal('b'), a: alpha }
  }
  throw new Error(`Farbausdruck nicht auswertbar: ${text}`)
}

/**
 * Legt eine Farbe mit Alpha auf einen deckenden Grund.
 * @param oben - Farbe mit Alpha
 * @param grund - deckende Farbe
 * @returns deckende Mischfarbe
 */
function legeAuf(oben, grund) {
  const k = (c) => oben[c] * oben.a + grund[c] * (1 - oben.a)
  return { r: k('r'), g: k('g'), b: k('b'), a: 1 }
}

/**
 * Relative Leuchtdichte nach WCAG 2.x.
 * @param farbe - deckende Farbe
 * @returns Leuchtdichte 0–1
 */
function leuchtdichte(farbe) {
  const lin = (c) => {
    const s = c / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(farbe.r) + 0.7152 * lin(farbe.g) + 0.0722 * lin(farbe.b)
}

/**
 * Prüft die Kontrastpaare beider Themes. Reine Funktion — auch der Selbsttest ruft sie auf.
 * @param rohtext - CSS der Token-Quelle
 * @param paare - [text, flaeche, mindestkontrast][]
 * @param ausnahmen - begründete Ausnahmen (siehe KONTRAST_AUSNAHMEN)
 * @returns { befunde: string[], zeilen: string[], ausnahmenGenutzt: string[] }
 */
function pruefeKontrast(rohtext, paare, ausnahmen) {
  const befunde = []
  const zeilen = []
  const ausnahmenGenutzt = []
  const tabellen = tokenTabellen(rohtext)
  for (const [theme, tabelle] of [['dunkel', tabellen.dunkel], ['hell', tabellen.hell]]) {
    const farbe = (name) => werteFarbeAus(loeseVarAuf(`var(${name})`, tabelle))
    let grund
    try {
      grund = farbe('--color-bg')
      if (grund.a < 1) befunde.push(`(4) ${theme}: --color-bg ist nicht deckend`)
      grund = legeAuf(grund, { r: 255, g: 255, b: 255, a: 1 })
    } catch (fehler) {
      befunde.push(`(4) ${theme}: --color-bg nicht auswertbar (${fehler.message})`)
      continue
    }
    for (const [text, flaeche, minimum] of paare) {
      let verhaeltnis
      try {
        const hinten = legeAuf(farbe(flaeche), grund)
        const vorne = legeAuf(farbe(text), hinten)
        const [hell, dunkel] = [leuchtdichte(vorne), leuchtdichte(hinten)].sort((x, y) => y - x)
        verhaeltnis = (hell + 0.05) / (dunkel + 0.05)
      } catch (fehler) {
        befunde.push(`(4) ${theme}: ${text} auf ${flaeche} nicht auswertbar (${fehler.message})`)
        continue
      }
      const ausnahme = ausnahmen.find((a) => a.theme === theme && a.text === text && a.flaeche === flaeche)
      const besteht = verhaeltnis >= minimum
      zeilen.push(`${theme.padEnd(6)} ${text} auf ${flaeche}: ${verhaeltnis.toFixed(2)}:1 (min ${minimum})${besteht ? '' : ausnahme ? ' — Ausnahme' : ' — ZU NIEDRIG'}`)
      if (!besteht && ausnahme) ausnahmenGenutzt.push(`${theme}: ${text} auf ${flaeche} ${verhaeltnis.toFixed(2)}:1 — ${ausnahme.grund} (${ausnahme.finding})`)
      else if (!besteht) befunde.push(`(4) ${theme}: ${text} auf ${flaeche} hat ${verhaeltnis.toFixed(2)}:1, verlangt ${minimum}:1`)
      else if (ausnahme) befunde.push(`(4) ${theme}: Ausnahme für ${text} auf ${flaeche} ist veraltet — das Paar besteht (${verhaeltnis.toFixed(2)}:1); Ausnahme streichen`)
    }
  }
  return { befunde, zeilen, ausnahmenGenutzt }
}

{
  const kontrast = pruefeKontrast(readFileSync(`${LEITSTAND_VERZEICHNIS}/${CSS_PFLICHT_ROOT}`, 'utf8'), KONTRAST_PAARE, KONTRAST_AUSNAHMEN)
  console.log('Kontrast (WCAG) je Theme:')
  for (const zeile of kontrast.zeilen) console.log(`  ${zeile}`)
  for (const ausnahme of kontrast.ausnahmenGenutzt) console.log(`  Ausnahme: ${ausnahme}`)
  befunde.push(...kontrast.befunde)
}

// ─── (5) Rot/Grün-Selbsttest zur Kontrastprüfung (F44 WS-1a) ───
{
  const paare = [['--t', '--f', 4.5]]
  const faelle = [
    { name: 'grün: Schwarz auf Weiß', css: ':root{--color-bg:#fff;--t:#000;--f:#fff}', rot: false },
    { name: 'rot: Grau auf Grau', css: ':root{--color-bg:#fff;--t:#999;--f:#fff}', rot: true },
    { name: 'rot nur im hellen Theme', css: ":root{--color-bg:#000;--t:#fff;--f:#000}:root[data-theme='light']{--color-bg:#fff;--f:#fff}", rot: true },
    { name: 'grün: color-mix mit var() und Rückfall', css: ':root{--color-bg:#fff;--x:#000;--t:color-mix(in srgb, var(--x) 90%, var(--nichtda, #fff));--f:#fff}', rot: false },
    { name: 'rot: Text mit Alpha verblasst', css: ':root{--color-bg:#fff;--t:#00000030;--f:#fff}', rot: true },
    // Fläche mit Alpha liegt auf --color-bg: #00000010 auf Weiß bleibt fast weiß → Weiß darauf ist rot.
    // Würde das Alpha ignoriert (Schwarz), wäre Weiß darauf grün — der Fall belegt das Übereinanderlegen.
    { name: 'rot: Fläche mit Alpha wird auf --color-bg gelegt', css: ':root{--color-bg:#fff;--t:#fff;--f:#00000010}', rot: true },
    { name: 'grün: color-mix mit zwei Prozentangaben', css: ':root{--color-bg:#fff;--t:color-mix(in srgb, #000 60%, #fff 40%);--f:#fff}', rot: false },
    { name: 'grün: dunkler Block wirkt nicht ins helle Theme', css: ":root{--color-bg:#fff;--t:#000;--f:#fff}:root[data-theme='dark']{--color-bg:#000;--t:#fff;--f:#000}:root[data-theme='light']{--f:#fff}", rot: false },
    { name: 'rot: dunkler Block mit schlechtem Paar', css: ":root{--color-bg:#fff;--t:#000;--f:#fff}:root[data-theme='dark']{--f:#000}", rot: true },
    { name: 'rot: nicht auflösbares Token', css: ':root{--color-bg:#fff;--t:var(--fehlt);--f:#fff}', rot: true },
  ]
  for (const fall of faelle) {
    const ergebnis = pruefeKontrast(fall.css, paare, [])
    if ((ergebnis.befunde.length > 0) !== fall.rot) befunde.push(`(5) Selbsttest Kontrast „${fall.name}“: erwartet ${fall.rot ? 'rot' : 'grün'}, erhalten ${ergebnis.befunde.length > 0 ? ergebnis.befunde.join(' | ') : 'grün'}`)
  }
  const ausnahme = ['dunkel', 'hell'].map((theme) => ({ theme, text: '--t', flaeche: '--f', grund: 'Test', finding: 'F-0' }))
  if (pruefeKontrast(':root{--color-bg:#fff;--t:#999;--f:#fff}', paare, ausnahme).befunde.length !== 0) befunde.push('(5) Selbsttest Kontrast: eine begründete Ausnahme muss das durchfallende Paar grün machen')
  if (pruefeKontrast(':root{--color-bg:#fff;--t:#000;--f:#fff}', paare, ausnahme).befunde.length === 0) befunde.push('(5) Selbsttest Kontrast: eine Ausnahme für ein bestehendes Paar muss als veraltet rot werden')
}

console.log('')
if (befunde.length === 0) {
  console.log('✓ Keine Befunde (Selbsttests (3) und (5): Rot- und Grünfälle wie erwartet).\n')
  process.exitCode = 0
} else {
  console.log(`✗ ${befunde.length} Befund(e):\n`)
  for (const b of befunde) console.log(`  - ${b}`)
  console.log('')
  process.exitCode = 1
}
