/**
 * Datei: features/F45/nachweise/b2a3b/render/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweis F45 B2a-3b (Muster features/F45/nachweise/b2a3/render/erzeuge-nachweis.mjs) gegen die Testinstanz
 * features/F45/nachweise/b2a3b/instanz.mjs (Port 4199):
 * - veraltet-<…>: `#/workflows/<id>`, Abnahme entscheidbar — Review-Kachel mit „Review veraltet“, Zählzeile im Blick;
 * - unbestimmt-<…>: dasselbe mit „Stand des Reviews nicht bestimmbar: …“ (Laufakte ohne geprüften Stand);
 * - code-<…>: `#/code` — „Sichern“ als zwei Befehlsblöcke (cd + add + commit, cd + push) mit je eigenem „Kopieren“ und
 *   „Prüfstand“ mit cd als erster Zeile; Pfad mit Leerzeichen (gequotet).
 * Schreibt nur in eigene Unterordner neben diesem Skript.
 *
 * Aufruf: node features/F45/nachweise/b2a3b/render/erzeuge-nachweis.mjs <idVeraltet> <idUnbestimmt> [basis]
 * Wird aufgerufen von: Hand. Nicht Teil von `npm run check`.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const [idVeraltet, idUnbestimmt, basis = 'http://127.0.0.1:4199'] = process.argv.slice(2)
if (idUnbestimmt === undefined) throw new Error('Aufruf: <idVeraltet> <idUnbestimmt> [basis]')
const ziel = dirname(fileURLToPath(import.meta.url))
const wurzel = resolve(ziel, '../../../../..')
const ablauf = (id) => `${basis}/#/workflows/${encodeURIComponent(id)}`

const ABNAHME = {
  texte: [
    { name: 'Hinweise zum Review', selector: '.abnahme-review-hinweise' },
    { name: 'Auf einen Blick', selector: '.abnahme-blick' },
  ],
  vorhanden: [
    { name: 'Hinweis amber', selector: '.abnahme-review-hinweise.amber' },
    { name: 'Hinweis rot (darf nicht)', selector: '.abnahme-review-hinweise.red' },
    { name: 'Review veraltet', selector: '[data-review-hinweis="reviewVeraltet"]' },
    { name: 'Stand nicht bestimmbar', selector: '[data-review-hinweis="standUnbestimmt"]' },
    { name: 'Zählzeile im Blick', selector: '[data-review-hinweise-anzahl="1"]' },
  ],
}
const CODE = {
  texte: [
    { name: 'Sichern Block 1', selector: '.code-sichern .befehlsblock code' },
    { name: 'Sichern Block 2', selector: '.code-sichern .befehlsblock + .befehlsblock code' },
    { name: 'Prüfstand', selector: '.code-karte-kopf:has(#code-pruefstand-titel) ~ .befehlsblock code' },
  ],
  vorhanden: [
    { name: 'zwei Blöcke Sichern', selector: '.code-sichern .befehlsblock + .befehlsblock' },
    { name: 'Kopieren je Block', selector: '.code-sichern .befehlsblock + .befehlsblock [data-befehl-kopieren]' },
    { name: 'Prüfstand-Block', selector: '.code-karte-kopf:has(#code-pruefstand-titel) ~ .befehlsblock' },
  ],
}
const warteAbnahme = { selector: '.abnahme-review-hinweise', timeoutMs: 10000 }
const warteCode = { selector: '.code-sichern .befehlsblock', timeoutMs: 15000 }
const abnahme = (label, screenshot) => [{ label, warteAufSelector: warteAbnahme, screenshot }]
const code = (label, screenshot) => [{ label, warteAufSelector: warteCode, screenshot }]
const ru = { 'leitstand-sprache': 'ru' }

const folgen = {
  'veraltet-de-1440': { url: ablauf(idVeraltet), viewport: { breite: 1440, hoehe: 1600 }, screenshotVollseite: true, beobachtete: ABNAHME, schritte: abnahme('Abnahme entscheidbar: „Review veraltet“', '01-veraltet.webp') },
  'veraltet-de-1440-hell': { url: ablauf(idVeraltet), viewport: { breite: 1440, hoehe: 1600 }, farbschema: 'light', screenshotVollseite: true, beobachtete: ABNAHME, schritte: abnahme('hell', '01-veraltet-hell.webp') },
  'veraltet-de-390': { url: ablauf(idVeraltet), viewport: { breite: 390, hoehe: 3200 }, screenshotVollseite: true, beobachtete: ABNAHME, schritte: abnahme('390 px', '01-veraltet-390.webp') },
  'unbestimmt-de-1440': { url: ablauf(idUnbestimmt), viewport: { breite: 1440, hoehe: 1600 }, screenshotVollseite: true, beobachtete: ABNAHME, schritte: abnahme('„Stand des Reviews nicht bestimmbar“', '01-unbestimmt.webp') },
  'unbestimmt-ru-390-hell': { url: ablauf(idUnbestimmt), viewport: { breite: 390, hoehe: 3200 }, farbschema: 'light', localStorageSetzen: ru, screenshotVollseite: true, beobachtete: ABNAHME, schritte: abnahme('ru, 390 px, hell', '01-unbestimmt-ru-390.webp') },
  'code-de-1440': { url: `${basis}/#/code`, viewport: { breite: 1440, hoehe: 1800 }, screenshotVollseite: true, beobachtete: CODE, schritte: code('Sichern: zwei Blöcke mit cd; Prüfstand mit cd', '01-code.webp') },
  'code-de-1440-hell': { url: `${basis}/#/code`, viewport: { breite: 1440, hoehe: 1800 }, farbschema: 'light', screenshotVollseite: true, beobachtete: CODE, schritte: code('hell', '01-code-hell.webp') },
  'code-de-390': { url: `${basis}/#/code`, viewport: { breite: 390, hoehe: 4000 }, screenshotVollseite: true, beobachtete: CODE, schritte: code('390 px', '01-code-390.webp') },
  'code-ru-390': { url: `${basis}/#/code`, viewport: { breite: 390, hoehe: 4000 }, localStorageSetzen: ru, screenshotVollseite: true, beobachtete: CODE, schritte: code('ru, 390 px', '01-code-ru-390.webp') },
}

const nur = process.env.NUR?.split(',') ?? null
for (const [name, folge] of Object.entries(folgen)) {
  if (nur !== null && !nur.includes(name)) continue
  const verzeichnis = join(ziel, name)
  mkdirSync(verzeichnis, { recursive: true })
  const datei = join(verzeichnis, 'klickfolge.json')
  writeFileSync(datei, `${JSON.stringify(folge, null, 2)}\n`)
  console.log(`\n=== ${name} ===`)
  execFileSync(process.execPath, [join(wurzel, 'scripts/render-nachweis.mjs'), datei, verzeichnis], { stdio: 'inherit', cwd: wurzel })
}
