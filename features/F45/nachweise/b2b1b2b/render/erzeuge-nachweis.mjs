/**
 * Datei: features/F45/nachweise/b2b1b2b/render/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweis F45 B2b-1b-2b „Anzeige“ (Muster features/F45/nachweise/b2b1/render/erzeuge-nachweis.mjs) gegen
 * die Testinstanz features/F45/nachweise/b2b1b2b/instanz.mjs (Port 4399), Seite `#/workflows/<id>`:
 * - a-<…>: Freigabe des Architekten für Plan v2 — „Plan v1 — wird überarbeitet“ mit dem Satz zu Plan v1, Befunde des
 *   Advisors „gehen an den Architekten“;
 * - b-<…>: Freigabe der Ausführung nach Plan v2 — „Plan, den du freigibst“ (Plan v2), Befunde „eingearbeitet“;
 * - c-<…>: Freigabe der Ausführung mit „Kein Plan v2: …“ (max_replans 0);
 * - d-<…>: Advisor-Halt mit „Advisor wiederholen“; d-klick-de-1440 (zuletzt, verbraucht den Halt): Klick → Freigabe des
 *   Advisors mit Meldung.
 * Je Lage de 1440 dunkel, de 1440 hell, de 390, ru 390 hell, de 1440 200 %; in jeder Folge die Überlaufmessung
 * (scrollWidth/clientWidth, F-1107 (5)). Schreibt nur in eigene Unterordner neben diesem Skript.
 *
 * Aufruf: node features/F45/nachweise/b2b1b2b/render/erzeuge-nachweis.mjs '<JSON der Instanz {a,b,c,d}>' [basis]
 * Wird aufgerufen von: Hand. Nicht Teil von `npm run check`.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const [idsJson, basis = 'http://127.0.0.1:4399'] = process.argv.slice(2)
if (idsJson === undefined) throw new Error('Aufruf: <JSON {a,b,c,d}> [basis]')
const ids = JSON.parse(idsJson)
const ziel = dirname(fileURLToPath(import.meta.url))
const wurzel = resolve(ziel, '../../../../..')
const url = (lage) => `${basis}/#/workflows/${encodeURIComponent(ids[lage])}`

const BEOBACHTUNG = {
  texte: [
    { name: 'Plan-Titel', selector: '#freigabe-plan' },
    { name: 'Hinweis Advisor', selector: '.entscheiden-plan-hinweis' },
    { name: 'Advisor-Notiz', selector: '.wf-advisor-wiederholen' },
    { name: 'Meldung', selector: '#workflow-bedienung-meldung' },
  ],
  vorhanden: [
    { name: 'Plan-Karte', selector: '.entscheiden-plan #freigabe-plan' },
    { name: 'Befund-Karte', selector: '#freigabe-advisor' },
    { name: 'Befunde', selector: '.entscheiden-plan .abnahme-befund' },
    { name: 'Satz Plan v1 behalten', selector: '.entscheiden-plan .subtle' },
    { name: 'Knopf Advisor wiederholen', selector: '[data-aktion="pruefer-wiederholen"]' },
    { name: 'Spalte Freigabe', selector: '#workflow-entscheidung input[name="wf-freigabe-option"]' },
  ],
  ueberlauf: true,
}
const VARIANTEN = {
  'de-1440': { viewport: { breite: 1440, hoehe: 1600 } },
  'de-1440-hell': { viewport: { breite: 1440, hoehe: 1600 }, farbschema: 'light' },
  'de-390': { viewport: { breite: 390, hoehe: 3200 } },
  'ru-390-hell': { viewport: { breite: 390, hoehe: 3200 }, farbschema: 'light', localStorageSetzen: { 'leitstand-sprache': 'ru' } },
  'de-1440-zoom200': { viewport: { breite: 1440, hoehe: 1600 }, zoom: 2, reduzierteBewegung: true },
}
const WARTE = { a: '#freigabe-advisor', b: '#freigabe-advisor', c: '#freigabe-advisor', d: '[data-aktion="pruefer-wiederholen"]' }
const ZEIGT = { a: 'Freigabe Architekt v2 (Plan v1 + Befunde)', b: 'Freigabe Ausführung nach Plan v2', c: '„Kein Plan v2: …“', d: 'Advisor-Halt mit Knopf' }

const folgen = {}
for (const lage of ['a', 'b', 'c', 'd']) {
  for (const [variante, einstellung] of Object.entries(VARIANTEN)) {
    folgen[`${lage}-${variante}`] = {
      url: url(lage),
      ...einstellung,
      screenshotVollseite: true,
      beobachtete: BEOBACHTUNG,
      schritte: [{ label: `${ZEIGT[lage]} — ${variante}`, warteAufSelector: { selector: WARTE[lage], timeoutMs: 10000 }, screenshot: `01-${lage}-${variante}.webp` }],
    }
  }
}
folgen['d-klick-de-1440'] = {
  url: url('d'),
  viewport: { breite: 1440, hoehe: 1600 },
  screenshotVollseite: true,
  beobachtete: BEOBACHTUNG,
  schritte: [
    { label: 'Advisor-Halt mit Knopf', warteAufSelector: { selector: WARTE.d, timeoutMs: 10000 }, screenshot: '01-vorher.webp' },
    { label: 'Klick „Advisor wiederholen“ → Advisor zurückgesetzt, Freigabe des Advisors', klick: '[data-aktion="pruefer-wiederholen"]', warteAufSelector: { selector: '#workflow-entscheidung input[name="wf-freigabe-option"]', timeoutMs: 15000 }, screenshot: '02-nachher.webp' },
  ],
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
