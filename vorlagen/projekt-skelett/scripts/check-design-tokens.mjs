#!/usr/bin/env node
/**
 * Datei: scripts/check-design-tokens.mjs
 *
 * Zweck: Design-Gate für UI-Projekte (F45 B3b-1). Prüft alle `*.css` des Projekts ohne Abhängigkeit:
 * (1) Farbliterale (Hex, rgb/rgba, hsl/hsla, hwb, lab, lch, oklab, oklch, color()) stehen nur als Custom Property
 *     (`--name: …`) in einem Token-Block: `:root`, `:root[data-theme…]`, `:root:not([data-theme…])` (auch als Kommaliste)
 *     direkt auf oberster Ebene oder in `@media (prefers-color-scheme: light|dark)`. Überall sonst: `var(--name)`.
 * (2) Gibt es irgendwo Bewegung (`@keyframes`, `animation…`, `transition…` außer `none`), braucht das Projekt mindestens
 *     einen Block `@media (prefers-reduced-motion: reduce)` oder `(… : no-preference)` (Bewegung nur auf Wunsch). Ob der
 *     Block die Bewegung wirklich abschaltet, prüft erst der Render-Nachweis (`npm run check:render`).
 * (3) Ungleiche Anzahl `/*` und `*\/` in einer Datei ⇒ rot (ein offener Kommentar verschluckt still alle Regeln danach).
 * Keine CSS-Datei ⇒ grün mit Hinweis „kein UI“.
 *
 * Nicht geprüft: `node_modules` und Punkt-Ordner in jeder Tiefe (`.git`, `.next`, `.render-nachweis` …), `dist`/`build`/
 * `coverage` an der Wurzel (erzeugte Ausgabe — geprüft wird die Quelle), symbolische Links. Fremd-CSS außerhalb davon oder
 * andere Token-Container (z. B. Tailwind `@theme`, `@layer`) nur mit Begründung in AUSNAHMEN.
 * Grenzen: benannte Farben (`red`) erkennt das Gate nicht; Farben in HTML-`style`, JS und SVG prüft es nicht; `/*` in einem
 * String zählt beim Kommentarabgleich mit; `.scss`/CSS-in-JS nicht. Rot, obwohl vertretbar: Tokens in `@supports`,
 * `@layer`, `@theme`, `.dark`, `[data-theme]` ohne `:root`, `@property initial-value` (dann AUSNAHMEN). Andere
 * Ausgabe-Ordner (`out/`, `storybook-static/`) gehören in UEBERSPRUNGEN_WURZEL. Es fängt die häufigste Drift, es ist kein
 * CSS-Parser.
 *
 * Wird aufgerufen von: `npm run check` (package.json), direkt nach check-dateigroesse.
 *
 * Aufruf: node scripts/check-design-tokens.mjs
 * Exit 0 = sauber oder kein UI, 1 = mindestens ein Befund
 */

import { readdirSync, readFileSync, realpathSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Ordner, die nur direkt unter der Wurzel übersprungen werden (erzeugte Ausgaben). */
const UEBERSPRUNGEN_WURZEL = new Set(['dist', 'build', 'coverage'])

/**
 * Ausnahmen nur mit Begründung: ['pfad/relativ/zur/wurzel.css', 'Grund'] (Schrägstrich als Trenner).
 * @type {ReadonlyMap<string, string>}
 */
export const AUSNAHMEN = new Map([])

/** Farbliteral: Hex mit 3/4/6/8 Ziffern oder eine Farbfunktion (nicht `color-mix(in oklab, …)`). */
const FARBE = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i

/** Ein Teil eines Token-Selektors: `:root` mit optionalem `[data-theme…]` bzw. `:not([data-theme…])`. */
const ROOT = /^:root(?:\[data-theme[^\]]*\]|:not\(\[data-theme[^\]]*\]\))*$/

/** Erlaubte Hülle um einen Token-Block: genau `@media (prefers-color-scheme: light|dark)`. */
const FARBSCHEMA = /^@media \(prefers-color-scheme: ?(?:light|dark)\)$/i
/**
 * Block für reduzierte Bewegung: `reduce` (abschalten) oder `no-preference` (Bewegung nur auf Wunsch), nicht mit `not`
 * verneint. Geprüft wird nur, dass es den Block gibt — nicht, was darin steht.
 */
const REDUZIERT = /^@media\b(?!.*\bnot\b).*prefers-reduced-motion: ?(?:reduce|no-preference)/i
/** Eigenschaften, die Bewegung erzeugen (Wert `none` zählt nicht). */
const BEWEGUNG = /^(?:animation|transition)(?:-[a-z-]+)?$/i

/**
 * Sammelt alle CSS-Dateien unter einem Ordner (relativ, mit Schrägstrich).
 * @param {string} wurzel - Startordner
 * @param {string} ordner - aktueller Ordner
 * @param {string[]} ergebnis - Sammelliste (wird ergänzt)
 * @returns {string[]} relative Pfade
 */
function sammleCssDateien(wurzel, ordner = wurzel, ergebnis = []) {
  for (const eintrag of readdirSync(ordner, { withFileTypes: true })) {
    const pfad = join(ordner, eintrag.name)
    if (eintrag.isDirectory()) {
      const uebersprungen =
        eintrag.name === 'node_modules' ||
        eintrag.name.startsWith('.') ||
        (ordner === wurzel && UEBERSPRUNGEN_WURZEL.has(eintrag.name))
      if (!uebersprungen) sammleCssDateien(wurzel, pfad, ergebnis)
    } else if (eintrag.isFile() && eintrag.name.toLowerCase().endsWith('.css')) {
      ergebnis.push(relative(wurzel, pfad).split(sep).join('/'))
    }
  }
  return ergebnis
}

/**
 * Ersetzt jedes Zeichen außer Zeilenumbrüchen durch ein Leerzeichen (Zeilennummern bleiben gleich).
 * @param {string} treffer - zu leerender Text
 * @returns {string} gleich langer Leertext
 */
function leeren(treffer) {
  return treffer.replace(/[^\n]/g, ' ')
}

/**
 * Darf an dieser Stelle ein Farb-Token definiert werden?
 * @param {string[]} stapel - Präludien der umschließenden Blöcke, außen zuerst
 * @returns {boolean} true in einem Token-Block
 */
function istTokenBlock(stapel) {
  const istRoot = (/** @type {string | undefined} */ selektor) =>
    (selektor ?? '').split(',').every((teil) => ROOT.test(teil.trim()))
  if (stapel.length === 1) return istRoot(stapel[0])
  return stapel.length === 2 && FARBSCHEMA.test(stapel[0] ?? '') && istRoot(stapel[1])
}

/**
 * Prüft eine CSS-Datei.
 * @param {string} pfad - relativer Pfad (nur für die Befundtexte)
 * @param {string} text - Dateiinhalt
 * @returns {{ befunde: string[], bewegung: boolean, reduziert: boolean }} Befunde und Bewegungsangaben dieser Datei
 */
export function pruefeCss(pfad, text) {
  const oeffnend = text.split('/*').length - 1
  const schliessend = text.split('*/').length - 1
  if (oeffnend !== schliessend) {
    return {
      befunde: [`${pfad}: ${oeffnend}× „/*“, aber ${schliessend}× „*/“ — offener Kommentar verschluckt Regeln`],
      bewegung: false,
      reduziert: false,
    }
  }
  const sauber = text
    .replace(/\/\*[\s\S]*?\*\//g, leeren)
    .replace(/"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/g, leeren)
    .replace(/url\([^)]*\)/gi, leeren)
  return scanne(pfad, sauber)
}

/**
 * Klammer-Scanner über CSS ohne Kommentare, Strings und url(): Stapel der Block-Präludien, Deklaration je `;`/`}`.
 * @param {string} pfad - relativer Pfad (nur für die Befundtexte)
 * @param {string} sauber - bereinigter Dateiinhalt (gleiche Zeilen wie das Original)
 * @returns {{ befunde: string[], bewegung: boolean, reduziert: boolean }} Befunde und Bewegungsangaben
 */
function scanne(pfad, sauber) {
  const ergebnis = { befunde: /** @type {string[]} */ ([]), bewegung: false, reduziert: false }
  /** @type {string[]} */
  const stapel = []
  let puffer = ''
  let leer = true
  let zeile = 1
  let startZeile = 1
  for (const zeichen of sauber) {
    if (zeichen === '{') {
      const praeludium = puffer.trim().replace(/\s+/g, ' ')
      ergebnis.bewegung ||= /^@keyframes\b/i.test(praeludium)
      ergebnis.reduziert ||= REDUZIERT.test(praeludium)
      stapel.push(praeludium)
      puffer = ''
      leer = true
    } else if (zeichen === ';' || zeichen === '}') {
      pruefeDeklaration(puffer, stapel, `${pfad}:${startZeile}`, ergebnis)
      if (zeichen === '}') stapel.pop()
      puffer = ''
      leer = true
    } else {
      // Merker statt puffer.trim() je Zeichen: lange geleerte Bereiche (data:-URLs) blieben sonst quadratisch.
      if (leer && zeichen.trim() !== '') {
        startZeile = zeile
        leer = false
      }
      puffer += zeichen
    }
    if (zeichen === '\n') zeile++
  }
  return ergebnis
}

/**
 * Prüft eine Deklaration (`eigenschaft: wert`) und ergänzt das Ergebnis.
 * @param {string} deklaration - Text zwischen `{`/`;` und `;`/`}`
 * @param {string[]} stapel - Präludien der umschließenden Blöcke
 * @param {string} stelle - `pfad:zeile` für den Befund
 * @param {{ befunde: string[], bewegung: boolean }} ergebnis - wird ergänzt
 */
function pruefeDeklaration(deklaration, stapel, stelle, ergebnis) {
  const text = deklaration.trim()
  const doppelpunkt = text.indexOf(':')
  if (doppelpunkt < 0) return
  const eigenschaft = text.slice(0, doppelpunkt).trim()
  const wert = text.slice(doppelpunkt + 1).trim()
  if (BEWEGUNG.test(eigenschaft) && !/^none$/i.test(wert)) ergebnis.bewegung = true
  if (!FARBE.test(wert)) return
  if (eigenschaft.startsWith('--') && istTokenBlock(stapel)) return
  ergebnis.befunde.push(
    `${stelle}: Farbliteral in „${eigenschaft}“ außerhalb eines Token-Blocks — als --token in :root definieren, hier var() nutzen`
  )
}

/**
 * Prüft alle CSS-Dateien unter `wurzel`.
 * @param {string} wurzel - Projektordner
 * @param {ReadonlyMap<string, string>} ausnahmen - Pfad → Begründung
 * @returns {{ dateien: number, befunde: string[] }} Zahl geprüfter Dateien und alle Befunde
 */
export function pruefeDesignTokens(wurzel, ausnahmen = AUSNAHMEN) {
  const dateien = sammleCssDateien(wurzel)
    .filter((pfad) => !ausnahmen.has(pfad))
    .sort()
  const ergebnisse = dateien.map((pfad) => pruefeCss(pfad, readFileSync(join(wurzel, pfad), 'utf8')))
  const befunde = ergebnisse.flatMap((e) => e.befunde)
  if (ergebnisse.some((e) => e.bewegung) && !ergebnisse.some((e) => e.reduziert)) {
    befunde.push(
      'Bewegung (@keyframes, animation, transition) ohne @media (prefers-reduced-motion: reduce) — Block ergänzen, der sie abschaltet'
    )
  }
  return { dateien: dateien.length, befunde }
}

/**
 * Direkter Aufruf? Vergleich über realpath (wie check-dateigroesse.mjs).
 * @returns {boolean} true bei `node scripts/check-design-tokens.mjs`
 */
function istHaupteinstieg() {
  try {
    return realpathSync(process.argv[1] ?? '') === realpathSync(fileURLToPath(import.meta.url))
  } catch {
    return false
  }
}

if (istHaupteinstieg()) {
  const { dateien, befunde } = pruefeDesignTokens(process.cwd())
  if (dateien === 0) {
    console.log('✓ Design-Tokens: keine CSS-Datei (kein UI)')
  } else if (befunde.length === 0) {
    console.log(`✓ Design-Tokens: ${dateien} CSS-Datei(en) ohne Befund`)
  } else {
    for (const befund of befunde) console.error(`✗ ${befund}`)
    console.error(
      'Regeln: docs/harness/gate-vorlage-node.md (Design-Tokens); Ausnahme nur mit Begründung in AUSNAHMEN.'
    )
    process.exitCode = 1
  }
}
