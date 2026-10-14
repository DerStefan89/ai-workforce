/**
 * Datei: features/F45/nachweise/b2b1/render/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweis F45 B2b-1a „Review wiederholen“ (Muster features/F45/nachweise/b2a3/render/erzeuge-nachweis.mjs)
 * gegen die Testinstanz features/F45/nachweise/b2b1/instanz.mjs (Port 4398), Ablauf `#/workflows/<id>`:
 * - ausfall-<…>: KLAERUNG_ERFORDERLICH nach Werkzeugausfall des Reviews — rote Notiz mit dem Satz „du kannst den Review
 *   allein wiederholen“ und dem Knopf „Review wiederholen“ auf eigener Zeile (de/ru, 1440/390, dunkel/hell, 200 %);
 * - klick-de-1440 (zuletzt, verbraucht den Halt): Klick auf „Review wiederholen“ → nur der Review läuft erneut → Abnahme
 *   „Passt das Ergebnis?“ mit Meldung.
 * Schreibt nur in eigene Unterordner neben diesem Skript.
 *
 * Aufruf: node features/F45/nachweise/b2b1/render/erzeuge-nachweis.mjs <workflowId> [basis]
 * Wird aufgerufen von: Hand. Nicht Teil von `npm run check`.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const [workflowId, basis = 'http://127.0.0.1:4398'] = process.argv.slice(2)
if (workflowId === undefined) throw new Error('Aufruf: <workflowId> [basis]')
const ziel = dirname(fileURLToPath(import.meta.url))
const wurzel = resolve(ziel, '../../../../..')
const url = `${basis}/#/workflows/${encodeURIComponent(workflowId)}`

const BEOBACHTUNG = {
  texte: [
    { name: 'Hinweise zum Review', selector: '.abnahme-review-hinweise' },
    { name: 'Meldung', selector: '#workflow-abnahme-meldung' },
  ],
  vorhanden: [
    { name: 'Hinweis rot', selector: '.abnahme-review-hinweise.red' },
    { name: 'Fehlgeschlagen', selector: '[data-review-hinweis="fehlgeschlagen"]' },
    { name: 'Knopf Review wiederholen', selector: '.wf-pruefer-wiederholen' },
    { name: 'Knopf Prüfung wiederholen (F-656)', selector: '.wf-pruefung-wiederholen' },
    { name: 'Abnehmen', selector: '#workflow-entscheidung input[type="radio"][value="ANGENOMMEN"]' },
  ],
}
const warte = { selector: '.wf-pruefer-wiederholen', timeoutMs: 10000 }
const einzeln = (label, screenshot) => [{ label, warteAufSelector: warte, screenshot }]

const folgen = {
  'ausfall-de-1440': { url, viewport: { breite: 1440, hoehe: 1500 }, screenshotVollseite: true, beobachtete: BEOBACHTUNG, schritte: einzeln('Werkzeugausfall: rote Notiz mit „Review wiederholen“', '01-ausfall.webp') },
  'ausfall-de-1440-hell': { url, viewport: { breite: 1440, hoehe: 1500 }, farbschema: 'light', screenshotVollseite: true, beobachtete: BEOBACHTUNG, schritte: einzeln('1440 px, hell', '01-ausfall-hell.webp') },
  'ausfall-de-390': { url, viewport: { breite: 390, hoehe: 2800 }, screenshotVollseite: true, beobachtete: BEOBACHTUNG, schritte: einzeln('390 px', '01-ausfall-390.webp') },
  'ausfall-ru-390-hell': { url, viewport: { breite: 390, hoehe: 2800 }, farbschema: 'light', localStorageSetzen: { 'leitstand-sprache': 'ru' }, screenshotVollseite: true, beobachtete: BEOBACHTUNG, schritte: einzeln('ru, 390 px, hell', '01-ru-390-hell.webp') },
  'ausfall-de-1440-zoom200': { url, viewport: { breite: 1440, hoehe: 1500 }, zoom: 2, reduzierteBewegung: true, screenshotVollseite: true, beobachtete: BEOBACHTUNG, schritte: einzeln('200 % Zoom, reduzierte Bewegung', '01-zoom200.webp') },
  'klick-de-1440': {
    url,
    viewport: { breite: 1440, hoehe: 1500 },
    screenshotVollseite: true,
    beobachtete: BEOBACHTUNG,
    schritte: [
      { label: 'Halt mit Knopf', warteAufSelector: warte, screenshot: '01-vorher.webp' },
      { label: 'Klick „Review wiederholen“ → Review läuft erneut → Abnahme', klick: '.wf-pruefer-wiederholen', warteAufSelector: { selector: '#workflow-entscheidung input[type="radio"][value="ANGENOMMEN"]', timeoutMs: 15000 }, screenshot: '02-nachher.webp' },
    ],
  },
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
