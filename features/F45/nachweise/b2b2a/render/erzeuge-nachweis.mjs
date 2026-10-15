/**
 * Datei: features/F45/nachweise/b2b2a/render/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweis F45 B2b-2a „Review vollständig“ (Muster features/F45/nachweise/b2b1/render/erzeuge-nachweis.mjs)
 * gegen die Testinstanz features/F45/nachweise/b2b2a/instanz.mjs (Port 4401), Seite `#/workflows/<id>` in der Lage
 * „entscheidbar“: Review (Claude, mit Schema) BEREIT mit einem HOCH-Befund — amber Notiz „Hinweise zum Review“ mit dem
 * Satz zu schweren Befunden, Kachel „Review“ mit „Claude“, Zahl in „Auf einen Blick“. Ansichten de 1440 dunkel, de 1440
 * hell, de 390, ru 390 hell, de 1440 200 %; in jeder Folge die Überlaufmessung (scrollWidth/clientWidth). Schreibt nur in
 * eigene Unterordner neben diesem Skript.
 *
 * Aufruf: node features/F45/nachweise/b2b2a/render/erzeuge-nachweis.mjs <workflowId> [basis]
 * Wird aufgerufen von: Hand. Nicht Teil von `npm run check`.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const [workflowId, basis = 'http://127.0.0.1:4401'] = process.argv.slice(2)
if (workflowId === undefined) throw new Error('Aufruf: <workflowId> [basis]')
const ziel = dirname(fileURLToPath(import.meta.url))
const wurzel = resolve(ziel, '../../../../..')
const url = `${basis}/#/workflows/${encodeURIComponent(workflowId)}`

const BEOBACHTUNG = {
  texte: [
    { name: 'Hinweise zum Review', selector: '.abnahme-review-hinweise' },
    { name: 'Reviewer', selector: '.entscheiden-kachel .ablauf-status + .subtle' },
  ],
  vorhanden: [
    { name: 'Hinweis amber', selector: '.abnahme-review-hinweise.amber' },
    { name: 'Hinweis rot', selector: '.abnahme-review-hinweise.red' },
    { name: 'Hinweis schwere Befunde', selector: '[data-review-hinweis="schwereBeiBereit"]' },
    { name: 'Zahl im Blick', selector: '[data-review-hinweise-anzahl]' },
    { name: 'Abnehmen', selector: '#workflow-entscheidung input[type="radio"][value="ANGENOMMEN"]' },
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

const nur = process.env.NUR?.split(',') ?? null
for (const [variante, einstellung] of Object.entries(VARIANTEN)) {
  const name = `bereit-hoch-${variante}`
  if (nur !== null && !nur.includes(name)) continue
  const folge = {
    url,
    ...einstellung,
    screenshotVollseite: true,
    beobachtete: BEOBACHTUNG,
    schritte: [{ label: `BEREIT mit HOCH-Befund, Claude-Reviewer — ${variante}`, warteAufSelector: { selector: '[data-review-hinweis="schwereBeiBereit"]', timeoutMs: 10000 }, screenshot: `01-${variante}.webp` }],
  }
  const verzeichnis = join(ziel, name)
  mkdirSync(verzeichnis, { recursive: true })
  const datei = join(verzeichnis, 'klickfolge.json')
  writeFileSync(datei, `${JSON.stringify(folge, null, 2)}\n`)
  console.log(`\n=== ${name} ===`)
  execFileSync(process.execPath, [join(wurzel, 'scripts/render-nachweis.mjs'), datei, verzeichnis], { stdio: 'inherit', cwd: wurzel })
}
