/**
 * Datei: features/F45/nachweise/b2b3d/render/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweis F45 B2b-3d „Umfangs-Abgleich + Eingabefeld Bereiche“ (Muster features/F45/nachweise/b2b3c/render/)
 * gegen die Testinstanz features/F45/nachweise/b2b3d/instanz.mjs (Port 4404):
 * - abnahme-* : Seite `#/workflows/<id>`, Abnahme „entscheidbar“ mit dem amber Hinweis „Außerhalb der vereinbarten Bereiche
 *   geändert“ und der Dateiliste (eine mit langem Pfad);
 * - formular-* : Seite `#/projekt` „Auftrag & Start“, „Vereinbarte Bereiche · optional“ aufgeklappt (Platzhalter, Hinweis);
 * - formular-fehler-de-1440 : ein absoluter Pfad im Feld ⇒ Fehlerzeile, nichts angelegt.
 * Ansichten de 1440 dunkel, de 1440 hell, de 390, ru 390 hell, de 1440 200 % für beide Lagen; in jeder Folge die
 * Überlaufmessung (scrollWidth/clientWidth). Schreibt nur in eigene Unterordner neben diesem Skript.
 *
 * Aufruf: node features/F45/nachweise/b2b3d/render/erzeuge-nachweis.mjs <workflowId> [basis]
 * Wird aufgerufen von: Hand. Nicht Teil von `npm run check`.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const [workflowId, basis = 'http://127.0.0.1:4404'] = process.argv.slice(2)
if (workflowId === undefined) throw new Error('Aufruf: <workflowId> [basis]')
const ziel = dirname(fileURLToPath(import.meta.url))
const wurzel = resolve(ziel, '../../../../..')

const BEOBACHTUNG = {
  texte: [
    { name: 'Umfangs-Hinweis', selector: '.abnahme-umfang' },
    { name: 'Feld Bereiche (Bereich)', selector: '#auftrag-bereiche-bereich' },
    { name: 'Fehlerzeile', selector: '#auftrag-anlegen-fehler' },
  ],
  vorhanden: [
    { name: 'Hinweis amber', selector: '.abnahme-umfang.note.amber' },
    { name: 'Abnehmen', selector: '#workflow-entscheidung input[type="radio"][value="ANGENOMMEN"]' },
    { name: 'Bereiche aufgeklappt', selector: '#auftrag-bereiche-bereich[open]' },
    { name: 'Fehlerzeile sichtbar', selector: '#auftrag-anlegen-fehler:not([hidden])' },
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

const folgen = {}
for (const [ansicht, a] of Object.entries(ANSICHTEN)) {
  folgen[`abnahme-${ansicht}`] = {
    url: `${basis}/#/workflows/${encodeURIComponent(workflowId)}`,
    ...a,
    screenshotVollseite: true,
    beobachtete: BEOBACHTUNG,
    schritte: [{ label: `Abnahme mit Umfangs-Hinweis — ${ansicht}`, warteAufSelector: { selector: '.abnahme-umfang', timeoutMs: 10000 }, screenshot: `01-${ansicht}.webp` }],
  }
  folgen[`formular-${ansicht}`] = {
    url: `${basis}/#/projekt`,
    ...a,
    screenshotVollseite: true,
    beobachtete: BEOBACHTUNG,
    schritte: [{ label: `Formular, „Vereinbarte Bereiche“ aufgeklappt — ${ansicht}`, warteAufSelector: { selector: '#auftrag-bereiche-bereich > summary', timeoutMs: 10000 }, klick: '#auftrag-bereiche-bereich > summary', screenshot: `01-${ansicht}.webp` }],
  }
}
folgen['formular-fehler-de-1440'] = {
  url: `${basis}/#/projekt`,
  viewport: { breite: 1440, hoehe: 1600 },
  screenshotVollseite: true,
  beobachtete: BEOBACHTUNG,
  schritte: [
    { label: 'Titel und Ergebnis', warteAufSelector: { selector: '#auftrag-titel', timeoutMs: 10000 }, tippen: { selector: '#auftrag-titel', text: 'CSV-Export' } },
    { label: 'Ergebnis', tippen: { selector: '#auftrag-auftragstext', text: 'Füge einen CSV-Export hinzu.' } },
    { label: 'Bereiche aufklappen', klick: '#auftrag-bereiche-bereich > summary' },
    { label: 'Absoluter Pfad, „Ablauf vorbereiten“ ⇒ Fehlerzeile', tippen: { selector: '#auftrag-bereiche', text: 'src/export/\n/etc/' }, klick: '#auftrag-ablauf-vorbereiten', warteAufSelector: { selector: '#auftrag-anlegen-fehler:not([hidden])', timeoutMs: 5000 }, screenshot: '01-fehler.webp' },
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
