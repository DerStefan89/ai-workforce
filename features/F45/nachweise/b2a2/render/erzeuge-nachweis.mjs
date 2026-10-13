/**
 * Datei: features/F45/nachweise/b2a2/render/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweis F45 B2a-2 (Muster features/F45/nachweise/b1a1/render/erzeuge-nachweis.mjs) gegen die Testinstanz
 * features/F45/nachweise/b2a2/instanz.mjs (Port 4396):
 * - einrichtung-<…>: Ablauf, der auf die Freigabe des Baus wartet, mit „Einrichtung durch dich“ vor dem Ausführungsschritt
 *   (1440, 390, ru 390 hell); freigabe-abgelehnt: Freigabe über die Entscheidungsspalte und den Dialog → sichtbarer Grund
 *   (409 einrichtungOffen); einrichtung-abhaken: „Erledigt“ je Schritt bis „Alles vor dem Bau erledigt“ (verändert den
 *   Stand, deshalb zuletzt).
 * - entwurf-<…>: Eintrag F-1083, „Auftrag vorbereiten“ → AK-Entwurf aus der Maßnahme, „Kriterium hinzufügen“, leerer
 *   Entwurf → Hinweis (1440, 390). Angelegt wird nichts.
 * Schreibt nur in eigene Unterordner neben diesem Skript.
 *
 * Aufruf: node features/F45/nachweise/b2a2/render/erzeuge-nachweis.mjs <workflowId> [basis]
 * Wird aufgerufen von: Hand. Nicht Teil von `npm run check`.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const [workflowId, basis = 'http://127.0.0.1:4396'] = process.argv.slice(2)
if (workflowId === undefined) throw new Error('Aufruf: <workflowId> [basis]')
const ziel = dirname(fileURLToPath(import.meta.url))
const wurzel = resolve(ziel, '../../../../..')
const ablauf = `${basis}/#/workflows/${encodeURIComponent(workflowId)}`
const eintrag = `${basis}/#/workboard/F-1083`

const BEOBACHTUNG_ABLAUF = {
  texte: [
    { name: 'Einrichtung', selector: '.ablauf-einrichtung' },
    { name: 'Meldung am Ablauf', selector: '#workflow-bedienung-meldung' },
    { name: 'Dialogmeldung', selector: '#workflow-dialog-meldung' },
  ],
  vorhanden: [
    { name: 'Einrichtung offen', selector: '.ablauf-einrichtung.current' },
    { name: 'Einrichtung erledigt', selector: '.ablauf-einrichtung.done' },
    { name: 'Knopf E1 Erledigt', selector: '[data-aktion="einrichtung"][data-id="E1"][data-status="erledigt"]' },
    { name: 'Knopf E1 Wieder öffnen', selector: '[data-aktion="einrichtung"][data-id="E1"][data-status="offen"]' },
  ],
}
const BEOBACHTUNG_ENTWURF = {
  texte: [
    { name: 'Entwurf', selector: '.workboard-entwurf' },
    { name: 'Jetzt-Band', selector: '.jetzt-band' },
  ],
  vorhanden: [
    { name: 'Feld AK1', selector: '#wb-ak-0' },
    { name: 'Feld AK2', selector: '#wb-ak-1' },
    { name: 'Hinweis kein AK', selector: '.workboard-entwurf .note.red' },
  ],
}
const warteEinrichtung = { selector: '.ablauf-einrichtung', timeoutMs: 10000 }
const oeffneEntwurf = [
  { label: 'Detail F-1083', warteAufSelector: { selector: '#workboard-bearbeiten:not([disabled])', timeoutMs: 15000 }, screenshot: '01-detail.webp' },
  { label: 'Auftrag vorbereiten → AK-Entwurf aus der Maßnahme', klick: '#workboard-bearbeiten', warteAufSelector: { selector: '.workboard-entwurf', timeoutMs: 5000 }, screenshot: '02-entwurf.webp' },
  { label: 'Kriterium hinzufügen', klick: '[data-entwurf="hinzu"]', warteAufSelector: { selector: '#wb-ak-1', timeoutMs: 5000 }, screenshot: '03-hinzugefuegt.webp' },
  { label: 'Beide Felder leeren', tippen: { selector: '#wb-ak-0', text: '' } },
  { label: 'Zweites Feld leer', tippen: { selector: '#wb-ak-1', text: '   ' } },
  { label: 'Auftrag anlegen ohne Text → Hinweis, nichts angelegt', klick: '[data-entwurf="anlegen"]', warteAufSelector: { selector: '.workboard-entwurf .note.red', timeoutMs: 5000 }, screenshot: '04-kein-ak.webp' },
]

const folgen = {
  'einrichtung-offen-de-1440': { url: ablauf, viewport: { breite: 1440, hoehe: 1300 }, screenshotVollseite: true, beobachtete: BEOBACHTUNG_ABLAUF, schritte: [{ label: 'Ablauf wartet auf die Freigabe des Baus, Einrichtung offen', warteAufSelector: warteEinrichtung, screenshot: '01-offen.webp' }] },
  'einrichtung-offen-de-390': { url: ablauf, viewport: { breite: 390, hoehe: 2200 }, screenshotVollseite: true, beobachtete: BEOBACHTUNG_ABLAUF, schritte: [{ label: '390 px, langer Text', warteAufSelector: warteEinrichtung, screenshot: '01-offen-390.webp' }] },
  'einrichtung-offen-ru-390-hell': { url: ablauf, viewport: { breite: 390, hoehe: 2200 }, farbschema: 'light', localStorageSetzen: { 'leitstand-sprache': 'ru' }, screenshotVollseite: true, beobachtete: BEOBACHTUNG_ABLAUF, schritte: [{ label: 'ru, 390 px, hell', warteAufSelector: warteEinrichtung, screenshot: '01-ru-390-hell.webp' }] },
  'freigabe-abgelehnt-de-1440': {
    url: ablauf,
    viewport: { breite: 1440, hoehe: 1300 },
    screenshotVollseite: true,
    beobachtete: BEOBACHTUNG_ABLAUF,
    schritte: [
      { label: 'Ablauf mit offener Einrichtung', warteAufSelector: { selector: 'input[name="wf-freigabe-option"][value="freigeben"]', timeoutMs: 10000 } },
      { label: 'Option Freigeben', klick: 'input[name="wf-freigabe-option"][value="freigeben"]' },
      { label: 'Begründung', tippen: { selector: '#wf-entscheidung-begruendung', text: 'Render-Nachweis B2a-2: Bau freigeben.' } },
      { label: 'Bestätigen öffnet den Dialog', klick: '[data-aktion="freigabe-bestaetigen"]', warteAufSelector: { selector: '#workflow-dialog [data-aktion="freigeben"]', timeoutMs: 5000 } },
      { label: 'Freigeben → 409, Grund sichtbar', klick: '#workflow-dialog [data-aktion="freigeben"]', warteAufSelector: { selector: '#workflow-dialog-meldung:not([hidden])', timeoutMs: 8000 }, ohneAusschnitt: true, screenshot: '01-abgelehnt.webp' },
    ],
  },
  'entwurf-de-1440': { url: eintrag, viewport: { breite: 1440, hoehe: 1400 }, screenshotVollseite: true, beobachtete: BEOBACHTUNG_ENTWURF, schritte: oeffneEntwurf },
  'entwurf-de-390': { url: eintrag, viewport: { breite: 390, hoehe: 2600 }, screenshotVollseite: true, beobachtete: BEOBACHTUNG_ENTWURF, schritte: oeffneEntwurf },
  'einrichtung-offen-de-1440-zoom200': { url: ablauf, viewport: { breite: 1440, hoehe: 1300 }, zoom: 2, reduzierteBewegung: true, screenshotVollseite: true, beobachtete: BEOBACHTUNG_ABLAUF, schritte: [{ label: '200 % Zoom, reduzierte Bewegung', warteAufSelector: warteEinrichtung, screenshot: '01-zoom200.webp' }] },
  'einrichtung-timeline-de-1440': {
    url: ablauf,
    viewport: { breite: 1440, hoehe: 1600 },
    screenshotVollseite: true,
    beobachtete: BEOBACHTUNG_ABLAUF,
    schritte: [
      { label: 'Freigabe-Seite', warteAufSelector: warteEinrichtung },
      { label: '„Der Weg zum Ergebnis“ aufklappen: Einrichtung vor dem Ausführungsschritt', klick: '#workflow-ablauf > summary', warteAufSelector: { selector: '.timeline .ablauf-einrichtung', timeoutMs: 5000 }, screenshot: '01-timeline.webp' },
    ],
  },
  'entwurf-de-1440-hell': { url: eintrag, viewport: { breite: 1440, hoehe: 1400 }, farbschema: 'light', screenshotVollseite: true, beobachtete: BEOBACHTUNG_ENTWURF, schritte: oeffneEntwurf },
  'entwurf-de-1440-zoom200': { url: eintrag, viewport: { breite: 1440, hoehe: 1400 }, zoom: 2, reduzierteBewegung: true, screenshotVollseite: true, beobachtete: BEOBACHTUNG_ENTWURF, schritte: oeffneEntwurf.slice(0, 3) },
  'einrichtung-abhaken-de-1440': {
    url: ablauf,
    viewport: { breite: 1440, hoehe: 1300 },
    screenshotVollseite: true,
    beobachtete: BEOBACHTUNG_ABLAUF,
    schritte: [
      { label: 'Vor dem Abhaken', warteAufSelector: warteEinrichtung },
      { label: 'E1 erledigt', klick: '[data-aktion="einrichtung"][data-id="E1"]', warteAufSelector: { selector: '[data-aktion="einrichtung"][data-id="E1"][data-status="offen"]', timeoutMs: 8000 }, screenshot: '01-e1-erledigt.webp' },
      { label: 'E2 erledigt → alles vor dem Bau erledigt', klick: '[data-aktion="einrichtung"][data-id="E2"]', warteAufSelector: { selector: '.ablauf-einrichtung.done', timeoutMs: 8000 }, screenshot: '02-bereit.webp' },
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
