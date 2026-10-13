/**
 * Datei: features/F45/nachweise/b2a3/render/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweis F45 B2a-3a (Muster features/F45/nachweise/b2a2/render/erzeuge-nachweis.mjs) gegen die Testinstanz
 * features/F45/nachweise/b2a3/instanz.mjs (Port 4397), je Ablauf `#/workflows/<id>`:
 * - befunde-<…>: ABGESCHLOSSEN, Abnahme entscheidbar — Review-Kachel mit „Hinweise zum Review“ (Vertrag unvollständig,
 *   Kontext unvollständig), Befunde v2 (ID, Dimension, Evidenz, Korrekturrichtung, KRITISCH) unter „Nachweise im Einzelnen“;
 * - vertrag-<…>: KLAERUNG_ERFORDERLICH nach Regel 1k — Lage 'vorab' mit „Review-Vertrag verletzt“, „Auf einen Blick“;
 * - ausfall-<…>: KLAERUNG_ERFORDERLICH nach einem Werkzeugausfall — „Review-Lauf … endete FEHLGESCHLAGEN“.
 * Schreibt nur in eigene Unterordner neben diesem Skript.
 *
 * Aufruf: node features/F45/nachweise/b2a3/render/erzeuge-nachweis.mjs <idBefunde> <idVertrag> <idAusfall> [basis]
 * Wird aufgerufen von: Hand. Nicht Teil von `npm run check`.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const [idBefunde, idVertrag, idAusfall, basis = 'http://127.0.0.1:4397'] = process.argv.slice(2)
if (idAusfall === undefined) throw new Error('Aufruf: <idBefunde> <idVertrag> <idAusfall> [basis]')
const ziel = dirname(fileURLToPath(import.meta.url))
const wurzel = resolve(ziel, '../../../../..')
const ablauf = (id) => `${basis}/#/workflows/${encodeURIComponent(id)}`

const BEOBACHTUNG = {
  texte: [
    { name: 'Hinweise zum Review', selector: '.abnahme-review-hinweise' },
    { name: 'Befund v2', selector: '.abnahme-befund-v2' },
    { name: 'Auf einen Blick', selector: '.abnahme-blick' },
  ],
  vorhanden: [
    { name: 'Hinweis rot', selector: '.abnahme-review-hinweise.red' },
    { name: 'Hinweis amber', selector: '.abnahme-review-hinweise.amber' },
    { name: 'Vertrag verletzt', selector: '[data-review-hinweis="vertragVerletzt"]' },
    { name: 'Vertrag unvollständig', selector: '[data-review-hinweis="vertragUnvollstaendig"]' },
    { name: 'Kontext unvollständig', selector: '[data-review-hinweis="kontextUnvollstaendig"]' },
    { name: 'Fehlgeschlagen', selector: '[data-review-hinweis="fehlgeschlagen"]' },
    { name: 'Befund KRITISCH', selector: '.abnahme-befund .ablauf-status.fehler' },
  ],
}
const warte = { selector: '.abnahme-review-hinweise', timeoutMs: 10000 }
const einzeln = (label, screenshot) => [{ label, warteAufSelector: warte, screenshot }]
const befundeMitNachweisen = [
  { label: 'Abnahme entscheidbar, Review-Kachel mit Hinweisen', warteAufSelector: warte, screenshot: '01-kachel.webp' },
  { label: '„Alle Nachweise“ → Befunde v2', klick: '.abnahme-nachweise-zeigen', warteAufSelector: { selector: '.abnahme-befund-v2', timeoutMs: 5000 }, screenshot: '02-befunde.webp' },
]

const folgen = {
  'befunde-de-1440': { url: ablauf(idBefunde), viewport: { breite: 1440, hoehe: 1600 }, screenshotVollseite: true, beobachtete: BEOBACHTUNG, schritte: befundeMitNachweisen },
  'befunde-de-390': { url: ablauf(idBefunde), viewport: { breite: 390, hoehe: 3200 }, screenshotVollseite: true, beobachtete: BEOBACHTUNG, schritte: befundeMitNachweisen },
  'befunde-de-1440-hell': { url: ablauf(idBefunde), viewport: { breite: 1440, hoehe: 1600 }, farbschema: 'light', screenshotVollseite: true, beobachtete: BEOBACHTUNG, schritte: befundeMitNachweisen },
  'vertrag-de-1440': { url: ablauf(idVertrag), viewport: { breite: 1440, hoehe: 1500 }, screenshotVollseite: true, beobachtete: BEOBACHTUNG, schritte: einzeln('Halt nach Regel 1k: Lage vorab mit „Review-Vertrag verletzt“', '01-vorab.webp') },
  'vertrag-de-390': { url: ablauf(idVertrag), viewport: { breite: 390, hoehe: 2800 }, screenshotVollseite: true, beobachtete: BEOBACHTUNG, schritte: einzeln('390 px', '01-vorab-390.webp') },
  'vertrag-ru-390-hell': { url: ablauf(idVertrag), viewport: { breite: 390, hoehe: 2800 }, farbschema: 'light', localStorageSetzen: { 'leitstand-sprache': 'ru' }, screenshotVollseite: true, beobachtete: BEOBACHTUNG, schritte: einzeln('ru, 390 px, hell', '01-ru-390-hell.webp') },
  'ausfall-de-1440': { url: ablauf(idAusfall), viewport: { breite: 1440, hoehe: 1500 }, screenshotVollseite: true, beobachtete: BEOBACHTUNG, schritte: einzeln('Werkzeugausfall: „Review-Lauf … endete FEHLGESCHLAGEN“', '01-ausfall.webp') },
  'vertrag-de-1440-zoom200': { url: ablauf(idVertrag), viewport: { breite: 1440, hoehe: 1500 }, zoom: 2, reduzierteBewegung: true, screenshotVollseite: true, beobachtete: BEOBACHTUNG, schritte: einzeln('200 % Zoom, reduzierte Bewegung', '01-zoom200.webp') },
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
