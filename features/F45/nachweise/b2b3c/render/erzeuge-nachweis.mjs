/**
 * Datei: features/F45/nachweise/b2b3c/render/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweis F45 B2b-3c „Budget je Arbeitspaket“ (Muster features/F45/nachweise/b2b2b2/render/) gegen die
 * Testinstanz features/F45/nachweise/b2b3c/instanz.mjs (Port 4403), Seite `#/workflows/<id>`:
 * - halt-* (A): Budget-Halt nach dem Bau — amber Notiz „Budget erreicht“ oben bei den Eingriffen mit Zahlen, neuem Budget,
 *   Hauptknopf „Budget erhöhen“ und nachrangig „Ablauf reparieren“ (Korrekturrunde: design-guardian 1), Zeile
 *   „Verbrauch“ im Blick;
 * - abnahme-* (B): Abnahme „entscheidbar“ mit Verbrauch über dem Budget (Kachel Nachweise und Blick amber, kein Knopf);
 * - korrektur-klick-de-1440 (C): Budget-Halt am Neubau nach der Korrekturrunde → Klick „Budget erhöhen“ → die Freigabe des
 *   Neubaus erscheint (Verdikt wieder Freigabe), keine Reparatur-Notiz (Korrekturrunde: design-guardian 2, qa Q2);
 * - halt-klick-de-1440 (A, zuletzt, verbraucht den Halt): Klick „Budget erhöhen“ → der Review läuft → Abnahme.
 * Ansichten de 1440 dunkel, de 1440 hell, de 390, ru 390 hell, de 1440 200 % für (A); de 1440 und de 390 für (B). In jeder
 * Folge die Überlaufmessung (scrollWidth/clientWidth). Schreibt nur in eigene Unterordner neben diesem Skript.
 *
 * Aufruf: node features/F45/nachweise/b2b3c/render/erzeuge-nachweis.mjs <idA> <idB> <idC> [basis]
 * Wird aufgerufen von: Hand. Nicht Teil von `npm run check`.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const [idA, idB, idC, basis = 'http://127.0.0.1:4403'] = process.argv.slice(2)
if (idC === undefined) throw new Error('Aufruf: <idA> <idB> <idC> [basis]')
const ziel = dirname(fileURLToPath(import.meta.url))
const wurzel = resolve(ziel, '../../../../..')
const url = (id) => `${basis}/#/workflows/${encodeURIComponent(id)}`

const BEOBACHTUNG = {
  texte: [
    { name: 'Budget-Notiz', selector: '.wf-budget-halt' },
    { name: 'Verbrauch im Blick', selector: '.abnahme-blick' },
    { name: 'Meldung', selector: '#workflow-abnahme-meldung' },
  ],
  vorhanden: [
    { name: 'Notiz amber', selector: '.wf-budget-halt.amber' },
    { name: 'Reparatur-Notiz', selector: '.wf-reparatur-notiz' },
    { name: 'Knopf Budget erhöhen (Hauptknopf)', selector: '.wf-budget-erhoehen.primary' },
    { name: 'Blick amber (überschritten)', selector: '[data-budget-ueberschritten="true"]' },
    { name: 'Kachel Nachweise amber', selector: '.entscheiden-kacheln .ablauf-status.warten' },
    { name: 'Abnehmen', selector: '#workflow-entscheidung input[type="radio"][value="ANGENOMMEN"]' },
    { name: 'Freigabe-Spalte', selector: '#workflow-entscheidung input[type="radio"][value="freigeben"]' },
  ],
  ueberlauf: true,
}
const ANSICHTEN = {
  'de-1440': { viewport: { breite: 1440, hoehe: 1600 } },
  'de-1440-hell': { viewport: { breite: 1440, hoehe: 1600 }, farbschema: 'light' },
  'de-390': { viewport: { breite: 390, hoehe: 3600 } },
  'ru-390-hell': { viewport: { breite: 390, hoehe: 3600 }, farbschema: 'light', localStorageSetzen: { 'leitstand-sprache': 'ru' } },
  'de-1440-zoom200': { viewport: { breite: 1440, hoehe: 1600 }, zoom: 2, reduzierteBewegung: true },
}
const LAGEN = {
  halt: { id: idA, warte: '.wf-budget-erhoehen', label: 'Budget-Halt nach dem Bau, Notiz mit Knopf', ansichten: Object.keys(ANSICHTEN) },
  abnahme: { id: idB, warte: '#workflow-entscheidung input[type="radio"][value="ANGENOMMEN"]', label: 'Abnahme mit Verbrauch über dem Budget', ansichten: ['de-1440', 'de-390'] },
}

const folgen = {}
for (const [lage, l] of Object.entries(LAGEN)) {
  for (const ansicht of l.ansichten) {
    folgen[`${lage}-${ansicht}`] = { url: url(l.id), ...ANSICHTEN[ansicht], screenshotVollseite: true, beobachtete: BEOBACHTUNG, schritte: [{ label: `${l.label} — ${ansicht}`, warteAufSelector: { selector: l.warte, timeoutMs: 10000 }, screenshot: `01-${ansicht}.webp` }] }
  }
}
folgen['korrektur-klick-de-1440'] = {
  url: url(idC),
  viewport: { breite: 1440, hoehe: 1600 },
  screenshotVollseite: true,
  beobachtete: BEOBACHTUNG,
  schritte: [
    { label: 'Budget-Halt am Neubau nach der Korrekturrunde', warteAufSelector: { selector: '.wf-budget-erhoehen', timeoutMs: 10000 }, screenshot: '01-vorher.webp' },
    { label: 'Klick „Budget erhöhen“ → Freigabe des Neubaus', klick: '.wf-budget-erhoehen', warteAufSelector: { selector: '#workflow-entscheidung input[type="radio"][value="freigeben"]', timeoutMs: 15000 }, screenshot: '02-nachher.webp' },
  ],
}
folgen['halt-klick-de-1440'] = {
  url: url(idA),
  viewport: { breite: 1440, hoehe: 1600 },
  screenshotVollseite: true,
  beobachtete: BEOBACHTUNG,
  schritte: [
    { label: 'Budget-Halt mit Knopf', warteAufSelector: { selector: LAGEN.halt.warte, timeoutMs: 10000 }, screenshot: '01-vorher.webp' },
    { label: 'Klick „Budget erhöhen“ → Review läuft → Abnahme', klick: '.wf-budget-erhoehen', warteAufSelector: { selector: '#workflow-entscheidung input[type="radio"][value="ANGENOMMEN"]', timeoutMs: 15000 }, screenshot: '02-nachher.webp' },
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
