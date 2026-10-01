/**
 * Datei: scripts/check-f44-i18n.mjs
 *
 * Zweck: i18n-Gate des Leitstands (F44 WS-1a, E-F44-2 = B, Abgleich F-725 §5.4).
 * Prüft die vier Wörterbücher public/leitstand/i18n/{de,en,tr,ru}.js und die
 * t()-Aufrufe unter public/leitstand/:
 *   (1) gleiche Schlüsselmenge in allen vier Sprachen;
 *   (2) je Schlüssel dieselben Platzhalter `{name}` (bei Pluralobjekten: die
 *       Vereinigung über alle Kategorien);
 *   (3) Pluralobjekte vollständig nach
 *       new Intl.PluralRules(sprache).resolvedOptions().pluralCategories, ohne
 *       fremde Kategorien; jeder Wert ist ein String oder ein solches Objekt, und zwar
 *       in allen Sprachen dieselbe Art (Plural in de heißt Plural überall);
 *   (4) keine leeren Werte (auch keine leere Pluralkategorie);
 *   (5) kein `#` gefolgt von Ziffern oder 3–8 Hex-Zeichen — dasselbe Hex-Muster wie
 *       scripts/check-f20-design-tokens.mjs, das jede *.js unter public/leitstand
 *       scannt (ein „PR #145“ im Wörterbuch wäre dort ein Farbliteral);
 *   (6) jeder literale Aufruf t('…') oder tHtml('…') in den Laufzeitmodulen (*.js) unter
 *       public/leitstand existiert in de. F44 WS-4b (F-940): tHtml (escapeHtml(t(…)), i18n.js)
 *       ersetzt die früheren lokalen tx() der Views, deren Schlüssel das Gate nicht sah. Testdateien (*.test.mjs) sind ausgenommen — sie prüfen den Rückfall
 *       absichtlich mit fehlenden Schlüsseln. F44 WS-1b: dasselbe gilt für die Attribute
 *       data-i18n, data-i18n-aria-label und data-i18n-title in *.html (statische Shell-Texte,
 *       übersetzt von uebersetzeDokument() in i18n.js) — derselbe Schlüssel-Vertrag, nur ein
 *       anderer Aufrufort.
 * Abschnitt (7) ist ein Rot/Grün-Selbsttest: je Regel ein konstruierter Rotfall, der
 * genau diese Regel auslösen muss, und ein sauberer Grünfall.
 *
 * Wird aufgerufen von: `npm run check`
 *
 * Wichtig — bekannte Grenzen:
 * - (6) erkennt nur literale Schlüssel ('…', "…" oder `…` ohne ${}) in t( und tHtml(. Ein dynamischer
 *   Schlüssel (t(variable), t(`a.${b}`)) wird nicht geprüft; zur Laufzeit fällt er
 *   auf den Schlüssel selbst zurück und console.warn meldet ihn (i18n.js).
 * - Das Gate prüft Vollständigkeit, nicht die Qualität der Übersetzung (F-866).
 * - Die Wörterbücher werden über public/leitstand/i18n.js importiert; das belegt
 *   nebenbei, dass der i18n-Kern in Node ohne DOM und Storage importierbar ist.
 *
 * Aufruf: node scripts/check-f44-i18n.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { readFileSync, readdirSync } from 'node:fs'
import { SPRACHEN, WOERTERBUECHER, aktuelleSprache } from '../public/leitstand/i18n.js'

const LEITSTAND_VERZEICHNIS = 'public/leitstand'
const BASIS_SPRACHE = 'de'

// Dasselbe Hex-Muster wie FARB_MUSTER in check-f20-design-tokens.mjs, dazu '#' vor einer Ziffer.
const RAUTE_MUSTER = /#(?:\d|[0-9a-fA-F]{3,8}\b)/
const PLATZHALTER_MUSTER = /\{(\w+)\}/g
// Literaler t()- bzw. tHtml()-Aufruf, nicht als Methode (.t) oder Teil eines Namens (split(, holeT(,
// txHtml(). F-940: tHtml zählt mit — sonst fiele ein fehlender Schlüssel still auf den Schlüsseltext zurück.
const T_AUFRUF_MUSTER = /(?<![\w$.])(?:t|tHtml)\(\s*(?:'([^'\\\n]*)'|"([^"\\\n]*)"|`([^`$\\]*)`)/g
// F44 WS-1b: Schlüssel in HTML-Attributen (uebersetzeDokument in i18n.js).
const HTML_SCHLUESSEL_MUSTER = /\bdata-i18n(?:-aria-label|-title)?="([^"]*)"/g

console.log('\n=== F44-i18n-Check (Wörterbücher de/en/tr/ru, t()- und tHtml()-Aufrufe) ===\n')

/**
 * Liefert die Texte eines Wörterbucheintrags (String oder alle Werte eines Pluralobjekts).
 * @param wert - Eintrag
 * @returns Liste der Texte (leer, wenn der Typ ungültig ist)
 */
function texteVon(wert) {
  if (typeof wert === 'string') return [wert]
  if (wert !== null && typeof wert === 'object' && !Array.isArray(wert)) return Object.values(wert).filter((v) => typeof v === 'string')
  return []
}

/**
 * Sammelt die Platzhalternamen eines Eintrags.
 * @param wert - Eintrag
 * @returns sortierte, eindeutige Platzhalternamen
 */
function platzhalterVon(wert) {
  const namen = new Set()
  for (const text of texteVon(wert)) for (const treffer of text.matchAll(PLATZHALTER_MUSTER)) namen.add(treffer[1])
  return [...namen].sort()
}

/**
 * Prüft Wörterbücher gegen die Regeln (1)–(5). Reine Funktion — der Selbsttest ruft sie auf.
 * @param woerterbuecher - { sprache: { schluessel: wert } }
 * @param sprachen - zu prüfende Sprachcodes, der erste ist die Basis
 * @returns Befunde als { regel, text }
 */
export function pruefeWoerterbuecher(woerterbuecher, sprachen) {
  const befunde = []
  const basis = sprachen[0]
  const basisSchluessel = new Set(Object.keys(woerterbuecher[basis] ?? {}))

  for (const sprache of sprachen) {
    const buch = woerterbuecher[sprache]
    if (buch === null || typeof buch !== 'object') {
      befunde.push({ regel: 1, text: `${sprache}: Wörterbuch fehlt oder ist kein Objekt` })
      continue
    }
    const schluessel = new Set(Object.keys(buch))
    // (1) gleiche Schlüsselmenge
    for (const s of basisSchluessel) if (!schluessel.has(s)) befunde.push({ regel: 1, text: `${sprache}: Schlüssel fehlt: ${s}` })
    for (const s of schluessel) if (!basisSchluessel.has(s)) befunde.push({ regel: 1, text: `${sprache}: Schlüssel nicht in ${basis}: ${s}` })

    const kategorien = new Intl.PluralRules(sprache).resolvedOptions().pluralCategories
    for (const [s, wert] of Object.entries(buch)) {
      // (3) Typ und Pluralvollständigkeit
      if (typeof wert !== 'string') {
        if (wert === null || typeof wert !== 'object' || Array.isArray(wert)) {
          befunde.push({ regel: 3, text: `${sprache}.${s}: Wert ist weder Text noch Pluralobjekt` })
          continue
        }
        for (const k of kategorien) if (!(k in wert)) befunde.push({ regel: 3, text: `${sprache}.${s}: Pluralkategorie fehlt: ${k}` })
        for (const k of Object.keys(wert)) if (!kategorien.includes(k)) befunde.push({ regel: 3, text: `${sprache}.${s}: fremde Pluralkategorie: ${k}` })
        for (const [k, v] of Object.entries(wert)) if (typeof v !== 'string') befunde.push({ regel: 3, text: `${sprache}.${s}.${k}: Pluralwert ist kein Text` })
      }
      // (4) keine leeren Werte
      const texte = texteVon(wert)
      if (texte.length === 0 || texte.some((text) => text.trim() === '')) befunde.push({ regel: 4, text: `${sprache}.${s}: leerer Wert` })
      // (5) kein '#' vor Ziffer oder Hex-Folge
      for (const text of texte) {
        const treffer = text.match(RAUTE_MUSTER)
        if (treffer) befunde.push({ regel: 5, text: `${sprache}.${s}: '${treffer[0]}' sähe für das Token-Gate wie ein Farbliteral aus` })
      }
      // (3) dieselbe Art wie die Basis: ein Pluralobjekt in de muss überall ein Pluralobjekt sein
      const basisIstText = typeof woerterbuecher[basis][s] === 'string'
      if (sprache !== basis && basisSchluessel.has(s) && (typeof wert === 'string') !== basisIstText) {
        befunde.push({ regel: 3, text: `${sprache}.${s}: ${typeof wert === 'string' ? 'Text' : 'Pluralobjekt'} statt ${basisIstText ? 'Text' : 'Pluralobjekt'} wie in ${basis}` })
      }
      // (2) gleiche Platzhalter wie die Basis
      if (sprache !== basis && basisSchluessel.has(s)) {
        const eigene = platzhalterVon(wert).join(',')
        const erwartet = platzhalterVon(woerterbuecher[basis][s]).join(',')
        if (eigene !== erwartet) befunde.push({ regel: 2, text: `${sprache}.${s}: Platzhalter {${eigene}} statt {${erwartet}} wie in ${basis}` })
      }
    }
  }
  return befunde
}

/**
 * Findet literale t()-Aufrufe in einem Quelltext, deren Schlüssel in der Basis fehlt (Regel 6).
 * @param pfad - Dateipfad für die Meldung
 * @param text - Quelltext
 * @param basisBuch - Wörterbuch der Basissprache
 * @returns Befunde als { regel, text }
 */
export function pruefeTAufrufe(pfad, text, basisBuch) {
  const befunde = []
  for (const treffer of text.matchAll(T_AUFRUF_MUSTER)) {
    const schluessel = treffer[1] ?? treffer[2] ?? treffer[3]
    if (!Object.hasOwn(basisBuch, schluessel)) befunde.push({ regel: 6, text: `${pfad}: ${treffer[0].startsWith('tHtml') ? 'tHtml' : 't'}('${schluessel}') fehlt in ${BASIS_SPRACHE}` })
  }
  for (const treffer of text.matchAll(HTML_SCHLUESSEL_MUSTER)) {
    if (!Object.hasOwn(basisBuch, treffer[1])) befunde.push({ regel: 6, text: `${pfad}: ${treffer[0]} fehlt in ${BASIS_SPRACHE}` })
  }
  return befunde
}

/**
 * Sammelt rekursiv alle Laufzeitmodule (*.js) und Seiten (*.html, F44 WS-1b) unter einem
 * Verzeichnis — ohne *.test.mjs.
 * @param verzeichnis - Wurzel
 * @returns Pfade mit '/'
 */
function sammleSkripte(verzeichnis) {
  const ergebnis = []
  for (const eintrag of readdirSync(verzeichnis, { withFileTypes: true })) {
    const pfad = `${verzeichnis}/${eintrag.name}`
    if (eintrag.isDirectory()) ergebnis.push(...sammleSkripte(pfad))
    else if (eintrag.name.endsWith('.js') || eintrag.name.endsWith('.html')) ergebnis.push(pfad)
  }
  return ergebnis
}

const befunde = []

// ─── (0) Import-Sicherheit: in Node gilt de ───
if (aktuelleSprache() !== BASIS_SPRACHE) befunde.push({ regel: 0, text: `i18n.js: aktuelleSprache() nach dem Import ist ${aktuelleSprache()}, erwartet ${BASIS_SPRACHE}` })
if (SPRACHEN[0] !== BASIS_SPRACHE || SPRACHEN.join(',') !== 'de,en,tr,ru') befunde.push({ regel: 0, text: `i18n.js: SPRACHEN ist ${SPRACHEN.join(',')}, erwartet de,en,tr,ru` })

// ─── (1)–(5) Wörterbücher ───
befunde.push(...pruefeWoerterbuecher(WOERTERBUECHER, SPRACHEN))

// ─── (6) literale t()-Aufrufe ───
let anzahlAufrufe = 0
for (const pfad of sammleSkripte(LEITSTAND_VERZEICHNIS)) {
  const text = readFileSync(pfad, 'utf8')
  anzahlAufrufe += [...text.matchAll(T_AUFRUF_MUSTER)].length + [...text.matchAll(HTML_SCHLUESSEL_MUSTER)].length
  befunde.push(...pruefeTAufrufe(pfad, text, WOERTERBUECHER[BASIS_SPRACHE]))
}

// ─── (7) Rot/Grün-Selbsttest: je Regel ein Rotfall ───
{
  const sauber = {
    de: { 'a.b': 'Text {name}', 'a.p': { one: '{anzahl} Eintrag', other: '{anzahl} Einträge' } },
    en: { 'a.b': 'Text {name}', 'a.p': { one: '{anzahl} item', other: '{anzahl} items' } },
    ru: { 'a.b': 'Текст {name}', 'a.p': { one: '{anzahl} запись', few: '{anzahl} записи', many: '{anzahl} записей', other: '{anzahl} записи' } },
  }
  const sprachen = ['de', 'en', 'ru']
  /** Tiefe Kopie mit einer Änderung. @param aendere - (kopie) => void @returns geänderte Kopie */
  const mit = (aendere) => {
    const kopie = structuredClone(sauber)
    aendere(kopie)
    return kopie
  }
  const faelle = [
    { name: 'grün', buecher: sauber, regel: null },
    { name: '(1) Schlüssel fehlt in en', buecher: mit((k) => delete k.en['a.b']), regel: 1 },
    { name: '(1) Schlüssel nur in ru', buecher: mit((k) => (k.ru['a.x'] = 'x')), regel: 1 },
    { name: '(2) Platzhalter abweichend', buecher: mit((k) => (k.en['a.b'] = 'Text {nome}')), regel: 2 },
    { name: '(3) ru ohne many', buecher: mit((k) => delete k.ru['a.p'].many), regel: 3 },
    { name: '(3) fremde Kategorie', buecher: mit((k) => (k.de['a.p'].few = 'x {anzahl}')), regel: 3 },
    { name: '(3) Zahl statt Text', buecher: mit((k) => (k.en['a.b'] = 5)), regel: 3 },
    { name: '(3) Text statt Plural', buecher: mit((k) => (k.en['a.p'] = '{anzahl} items')), regel: 3 },
    { name: '(4) leerer Text', buecher: mit((k) => (k.ru['a.b'] = '  ')), regel: 4 },
    { name: '(4) leere Pluralkategorie', buecher: mit((k) => (k.en['a.p'].one = '')), regel: 4 },
    { name: '(5) # mit Ziffern', buecher: mit((k) => (k.de['a.b'] = 'PR #145 {name}')), regel: 5 },
    { name: '(5) # mit Hex', buecher: mit((k) => (k.en['a.b'] = 'see #cafe {name}')), regel: 5 },
  ]
  for (const fall of faelle) {
    const ergebnis = pruefeWoerterbuecher(fall.buecher, sprachen)
    const ok = fall.regel === null ? ergebnis.length === 0 : ergebnis.some((b) => b.regel === fall.regel)
    if (!ok) befunde.push({ regel: 7, text: `Selbsttest ${fall.name}: erwartet ${fall.regel === null ? 'grün' : `rot durch Regel ${fall.regel}`}, erhalten ${ergebnis.length === 0 ? 'grün' : ergebnis.map((b) => `(${b.regel}) ${b.text}`).join(' | ')}` })
  }

  const tFaelle = [
    { text: "t('a.b')", rot: false },
    { text: 't("a.fehlt")', rot: true },
    { text: 't(`a.fehlt`)', rot: true },
    { text: "x = t( 'a.fehlt', { name: 1 })", rot: true },
    { text: 't(`a.${b}`) + split(\'a.fehlt\') + i18n.t(\'a.fehlt\')', rot: false },
    // F-940: tHtml wird wie t geprüft; ein anderer Name, der auf „tHtml(“ endet, oder eine Methode nicht.
    { text: "tHtml('a.b') + tHtml('a.b', { name: 1 }, { x: '<code>' })", rot: false },
    { text: "tHtml('a.fehlt')", rot: true },
    { text: "x = tHtml( 'a.fehlt', {}, { id: '<code>x</code>' })", rot: true },
    { text: "txHtml('a.fehlt') + ztHtml('a.fehlt') + obj.tHtml('a.fehlt')", rot: false },
    { text: '<span data-i18n="a.b">x</span><a data-i18n-aria-label="a.b" data-i18n-title="a.b">', rot: false },
    { text: '<span data-i18n="a.fehlt">x</span>', rot: true },
    { text: '<button data-i18n-aria-label="a.fehlt">', rot: true },
    { text: '<button data-i18n-title="a.fehlt">', rot: true },
  ]
  for (const fall of tFaelle) {
    const ergebnis = pruefeTAufrufe('selbsttest.js', fall.text, sauber.de)
    if ((ergebnis.length > 0) !== fall.rot) befunde.push({ regel: 7, text: `Selbsttest (6) ${fall.text}: erwartet ${fall.rot ? 'rot' : 'grün'}, erhalten ${ergebnis.length > 0 ? 'rot' : 'grün'}` })
  }
}

console.log(`Sprachen: ${SPRACHEN.join(', ')} · Schlüssel in ${BASIS_SPRACHE}: ${Object.keys(WOERTERBUECHER[BASIS_SPRACHE]).length} · literale t()-/tHtml()-Aufrufe und data-i18n-Schlüssel: ${anzahlAufrufe}`)
console.log('')
if (befunde.length === 0) {
  console.log('✓ Keine Befunde (Selbsttest (7): Rot- und Grünfälle je Regel wie erwartet).\n')
  process.exitCode = 0
} else {
  console.log(`✗ ${befunde.length} Befund(e):\n`)
  for (const b of befunde) console.log(`  - (${b.regel}) ${b.text}`)
  console.log('')
  process.exitCode = 1
}
