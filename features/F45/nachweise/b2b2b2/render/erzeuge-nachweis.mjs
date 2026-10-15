/**
 * Datei: features/F45/nachweise/b2b2b2/render/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweis F45 B2b-2b-2 „qa-Schritt live“ (Muster features/F45/nachweise/b2b2a/render/ und b2b1/render/) gegen
 * die Testinstanz features/F45/nachweise/b2b2b2/instanz.mjs (Port 4402), Seite `#/workflows/<id>`:
 * - bereit-hoch-* (a): Abnahme „entscheidbar“ mit Review-Kachel und Karte „Prüfung aus Nutzersicht“ (amber Hinweis zum
 *   HOCH-Befund, Befunde, drei Testfälle);
 * - halt-* (b): Halt am qa nach Werkzeugausfall — rote Notiz mit Ursache, Ausweg-Satz und Knopf;
 * - blockiert-* (c): Halt am qa mit gültigem BLOCKIERT ohne Korrekturrunde — Urteil, qa-Befunde, neutraler Satz, kein Knopf;
 * - review-beanstandet-de-1440 (d, zweite Runde F-1119 (1)): Halt am qa nach BLOCKIERT des Reviews — zusätzlich die Befunde
 *   des Reviews im Vorab-Block;
 * - halt-klick-de-1440 (zuletzt, verbraucht den Halt): Klick „Prüfung aus Nutzersicht wiederholen“ → nur der qa läuft
 *   erneut → Abnahme.
 * Ansichten de 1440 dunkel, de 1440 hell, de 390, ru 390 hell, de 1440 200 % für (a) und (b); de 1440 und de 390 für (c).
 * In jeder Folge die Überlaufmessung (scrollWidth/clientWidth). Schreibt nur in eigene Unterordner neben diesem Skript.
 *
 * Aufruf: node features/F45/nachweise/b2b2b2/render/erzeuge-nachweis.mjs <idA> <idB> <idC> <idD> [basis]
 * Wird aufgerufen von: Hand. Nicht Teil von `npm run check`.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const [idA, idB, idC, idD, basis = 'http://127.0.0.1:4402'] = process.argv.slice(2)
if (idD === undefined) throw new Error('Aufruf: <idA> <idB> <idC> <idD> [basis]')
const ziel = dirname(fileURLToPath(import.meta.url))
const wurzel = resolve(ziel, '../../../../..')
const url = (id) => `${basis}/#/workflows/${encodeURIComponent(id)}`

const BEOBACHTUNG = {
  texte: [
    { name: 'qa-Notiz', selector: '.abnahme-qa-hinweise' },
    { name: 'Meldung', selector: '#workflow-abnahme-meldung' },
  ],
  vorhanden: [
    { name: 'qa-Karte', selector: '.abnahme-qa-karte' },
    { name: 'Review-Kachel', selector: '.entscheiden-kacheln' },
    { name: 'Hinweis amber', selector: '.abnahme-qa-hinweise.amber' },
    { name: 'Hinweis rot', selector: '.abnahme-qa-hinweise.red' },
    { name: 'Badge amber (Karte)', selector: '.abnahme-qa-karte .ablauf-status.warten' },
    { name: 'Testfälle (3)', selector: '.abnahme-testfaelle > li:nth-child(3)' },
    { name: 'qa-Befundliste da', selector: '.abnahme-qa-hinweise .abnahme-befunde, .abnahme-qa-karte .abnahme-befunde' },
    { name: 'Knopf qa wiederholen', selector: '.wf-pruefer-wiederholen[data-pruefer="qa"]' },
    { name: 'Review-Befunde in der qa-Notiz', selector: '.abnahme-qa-hinweise h4:nth-of-type(2)' },
    { name: 'Zahl im Blick', selector: '[data-qa-hinweise-anzahl]' },
    { name: 'Abnehmen', selector: '#workflow-entscheidung input[type="radio"][value="ANGENOMMEN"]' },
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
  'bereit-hoch': { id: idA, warte: '.abnahme-qa-karte [data-qa-hinweis="schwereBeiBereit"]', label: 'qa bereit mit HOCH-Befund, Karte unter dem Review', ansichten: Object.keys(ANSICHTEN) },
  halt: { id: idB, warte: '.wf-pruefer-wiederholen[data-pruefer="qa"]', label: 'Halt am qa nach Werkzeugausfall, Knopf', ansichten: Object.keys(ANSICHTEN) },
  blockiert: { id: idC, warte: '.abnahme-qa-hinweise [data-qa-hinweis="haltNachQa"]', label: 'Halt am qa mit gültigem BLOCKIERT, Befunde, kein Knopf', ansichten: ['de-1440', 'de-390'] },
  'review-beanstandet': { id: idD, warte: '.abnahme-qa-hinweise [data-qa-hinweis="haltNachQa"]', label: 'Halt am qa nach BLOCKIERT des Reviews, mit den Befunden des Reviews', ansichten: ['de-1440'] },
}

const folgen = {}
for (const [lage, l] of Object.entries(LAGEN)) {
  for (const ansicht of l.ansichten) {
    folgen[`${lage}-${ansicht}`] = { url: url(l.id), ...ANSICHTEN[ansicht], screenshotVollseite: true, beobachtete: BEOBACHTUNG, schritte: [{ label: `${l.label} — ${ansicht}`, warteAufSelector: { selector: l.warte, timeoutMs: 10000 }, screenshot: `01-${ansicht}.webp` }] }
  }
}
folgen['halt-klick-de-1440'] = {
  url: url(idB),
  viewport: { breite: 1440, hoehe: 1600 },
  screenshotVollseite: true,
  beobachtete: BEOBACHTUNG,
  schritte: [
    { label: 'Halt am qa mit Knopf', warteAufSelector: { selector: LAGEN.halt.warte, timeoutMs: 10000 }, screenshot: '01-vorher.webp' },
    { label: 'Klick „Prüfung aus Nutzersicht wiederholen“ → nur der qa läuft erneut → Abnahme', klick: '.wf-pruefer-wiederholen[data-pruefer="qa"]', warteAufSelector: { selector: '#workflow-entscheidung input[type="radio"][value="ANGENOMMEN"]', timeoutMs: 15000 }, screenshot: '02-nachher.webp' },
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
