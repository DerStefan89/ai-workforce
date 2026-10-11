/**
 * Datei: features/F45/nachweise/b1a1/render/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweis F45 B1a-1 (F-954, Muster features/F45/nachweise/p/render/erzeuge-nachweis.mjs) gegen einen
 * laufenden Leitstand auf Port 4199:
 * - freigabe-<…>: Freigabe-Seite eines echten, noch nicht gestarteten Ablaufs mit der Karte „Wo gearbeitet wird“
 *   (real: noch nicht angelegt, offene Änderungen des Projektordners); dazu die Zustände wird vorbereitet, bereit und
 *   fehlgeschlagen (langer Grund) über feste Antworten auf GET /api/workflows/<id> (Rest des Detail echt); 390 px
 *   hell, ru.
 * - detail-aufraeumen: der echte, beendete Nachweis-Ablauf mit Lage des Arbeitsordners und Knopf „Arbeitsordner
 *   aufräumen“; Klick öffnet den Dialog (Pflichtbegründung, „verwerfen“).
 * - auftrag-anlegen: „Wo gearbeitet wird“ in #/projekt mit der Zeile „Eigener Arbeitsordner“ (Muster vor dem Start).
 * - code-liste: Seite Code mit der lesenden Liste der Arbeitsordner.
 * Schreibt nur in eigene Unterordner neben diesem Skript.
 *
 * Aufruf: node features/F45/nachweise/b1a1/render/erzeuge-nachweis.mjs <freigabeWorkflowId> <fertigWorkflowId> [basis]
 * Wird aufgerufen von: Hand. Nicht Teil von `npm run check`.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const [freigabeId, fertigId, basis = 'http://127.0.0.1:4199'] = process.argv.slice(2)
if (freigabeId === undefined || fertigId === undefined) throw new Error('Aufruf: <freigabeWorkflowId> <fertigWorkflowId> [basis]')
const ziel = dirname(fileURLToPath(import.meta.url))
const wurzel = resolve(ziel, '../../../../..')

const echtesDetail = await (await fetch(`${basis}/api/workflows/${encodeURIComponent(freigabeId)}`)).json()
const fertigDetail = await (await fetch(`${basis}/api/workflows/${encodeURIComponent(fertigId)}`)).json()
/** Beendeter Ablauf mit vorhandenem Arbeitsordner (GESTOPPT: Aktionszeile offen, Aufräumen erlaubt). */
const gestopptMitOrdner = {
  ...fertigDetail,
  daten: { ...fertigDetail.daten, status: 'GESTOPPT', grund: 'Vom Menschen gestoppt: Render-Nachweis' },
  naechster: { art: 'haltGestoppt', schrittId: null, grund: 'gestoppt' },
  arbeitsordner: { ...fertigDetail.arbeitsordner, status: 'BEREIT', aufraeumen: null, vorbereitungLaeuft: false, ordnerVorhanden: true, vorbereitung: { worktree_ms: 14658, npm_ci: { ergebnis: 'OK', exit_code: 0, dauer_ms: 38502, ausgabe_ende: '' }, e183_ms: 299 } },
}
const ao = echtesDetail.arbeitsordner
const mitOrdner = (arbeitsordner) => ({ ...echtesDetail, arbeitsordner: { ...ao, ...arbeitsordner } })
const BASIS_COMMIT = '387f1a3e1dbc1581abd8f22a3b0b765825984c11'
const ZUSTAENDE = {
  vorbereitung: mitOrdner({ status: 'IN_VORBEREITUNG', vorbereitungLaeuft: true }),
  bereit: mitOrdner({ status: 'BEREIT', basis_commit: BASIS_COMMIT, vorbereitung: { worktree_ms: 14658, npm_ci: { ergebnis: 'OK', exit_code: 0, dauer_ms: 38502, ausgabe_ende: '' }, e183_ms: 299 }, vorbereitungLaeuft: false, ordnerVorhanden: true }),
  fehlgeschlagen: mitOrdner({
    status: 'FEHLGESCHLAGEN',
    grund: `Im Arbeitsordner wäre der längste Pfad 263 Zeichen lang (Windows-Grenze 259): kontrollzustand/lineage-entscheidung-workflow-router-0c22d6fd-9a03-432c-a1ad-b4d6fc7c665e-schritt-1-ausfuehrung/checkpoints/1-${'f'.repeat(64)}.json — kürzeren Projektpfad wählen oder lange Dateinamen im Repo kürzen`,
    vorbereitungLaeuft: false,
  }),
}

const BEOBACHTUNG = {
  texte: [
    { name: 'Karte', selector: '#freigabe-arbeitsordner' },
    { name: 'Lage', selector: '.arbeitsordner-karte .arbeitsordner-lage' },
    { name: 'Aktion', selector: '.arbeitsordner-aktion' },
    { name: 'Dialogtitel', selector: '#workflow-dialog-titel' },
  ],
  vorhanden: [
    { name: 'Karte Wo gearbeitet wird', selector: '.arbeitsordner-karte' },
    { name: 'Knopf aufräumen', selector: '[data-aktion="aufraeumen-oeffnen"]' },
    { name: 'Dialog Begründung', selector: '#wf-aufraeumen-begruendung' },
    { name: 'Dialog verwerfen', selector: '#wf-aufraeumen-verwerfen' },
  ],
}

const folgen = {
  'freigabe-real-de-1440': {
    url: `${basis}/#/workflows/${encodeURIComponent(freigabeId)}`,
    viewport: { breite: 1440, hoehe: 1100 },
    screenshotVollseite: true,
    beobachtete: BEOBACHTUNG,
    schritte: [{ label: 'Freigabe, Arbeitsordner noch nicht angelegt (echt)', warteAufSelector: { selector: '.arbeitsordner-karte', timeoutMs: 8000 }, screenshot: '01-noch-nicht-angelegt.webp' }],
  },
  ...Object.fromEntries(
    Object.entries(ZUSTAENDE).map(([name, detail]) => [
      `freigabe-${name}-de-1440`,
      {
        url: `${basis}/#/workflows/${encodeURIComponent(freigabeId)}`,
        viewport: { breite: 1440, hoehe: 1100 },
        screenshotVollseite: true,
        anfragenAntworten: [{ muster: `**/api/workflows/${freigabeId}`, status: 200, json: detail }],
        beobachtete: BEOBACHTUNG,
        schritte: [{ label: `Freigabe, Arbeitsordner ${name}`, warteAufSelector: { selector: '.arbeitsordner-karte', timeoutMs: 8000 }, screenshot: `01-${name}.webp` }],
      },
    ])
  ),
  'freigabe-fehlgeschlagen-ru-390-hell': {
    url: `${basis}/#/workflows/${encodeURIComponent(freigabeId)}`,
    viewport: { breite: 390, hoehe: 1400 },
    farbschema: 'light',
    localStorageSetzen: { 'leitstand-sprache': 'ru' },
    screenshotVollseite: true,
    anfragenAntworten: [{ muster: `**/api/workflows/${freigabeId}`, status: 200, json: ZUSTAENDE.fehlgeschlagen }],
    beobachtete: BEOBACHTUNG,
    schritte: [{ label: 'ru, 390 px, hell, langer Grund', warteAufSelector: { selector: '.arbeitsordner-karte', timeoutMs: 8000 }, screenshot: '01-ru-390-hell.webp' }],
  },
  'freigabe-bereit-de-390': {
    url: `${basis}/#/workflows/${encodeURIComponent(freigabeId)}`,
    viewport: { breite: 390, hoehe: 1400 },
    screenshotVollseite: true,
    anfragenAntworten: [{ muster: `**/api/workflows/${freigabeId}`, status: 200, json: ZUSTAENDE.bereit }],
    beobachtete: BEOBACHTUNG,
    schritte: [{ label: '390 px, bereit', warteAufSelector: { selector: '.arbeitsordner-karte', timeoutMs: 8000 }, screenshot: '01-390-bereit.webp' }],
  },
  'abnahme-aufgeraeumt-de-1440': {
    url: `${basis}/#/workflows/${encodeURIComponent(fertigId)}`,
    viewport: { breite: 1440, hoehe: 1000 },
    screenshotVollseite: true,
    beobachtete: BEOBACHTUNG,
    schritte: [{ label: 'Abnahme-Seite des echten Ablaufs: Karte offen, Löschliste, aufgeräumt (echt)', warteAufSelector: { selector: '.arbeitsordner-karte', timeoutMs: 8000 }, screenshot: '01-abnahme-aufgeraeumt.webp' }],
  },
  'abnahme-bereit-offen-de-1440': {
    url: `${basis}/#/workflows/${encodeURIComponent(fertigId)}`,
    viewport: { breite: 1440, hoehe: 1000 },
    screenshotVollseite: true,
    anfragenAntworten: [{ muster: `**/api/workflows/${fertigId}`, status: 200, json: { ...fertigDetail, arbeitsordner: gestopptMitOrdner.arbeitsordner } }],
    beobachtete: BEOBACHTUNG,
    schritte: [{ label: 'Abnahme offen: Ergebnis liegt nur im Arbeitsordner, kein Aufräumen-Knopf', warteAufSelector: { selector: '.arbeitsordner-karte', timeoutMs: 8000 }, screenshot: '01-abnahme-offen.webp' }],
  },
  ...Object.fromEntries(
    [
      ['detail-aufraeumen-de-1440', { breite: 1440, hoehe: 1000 }],
      ['detail-aufraeumen-de-390', { breite: 390, hoehe: 1600 }],
    ].map(([name, viewport]) => [
      name,
      {
        url: `${basis}/#/workflows/${encodeURIComponent(fertigId)}`,
        viewport,
        screenshotVollseite: true,
        anfragenAntworten: [{ muster: `**/api/workflows/${fertigId}`, status: 200, json: gestopptMitOrdner }],
        beobachtete: BEOBACHTUNG,
        schritte: [
          { label: 'Beendeter (gestoppter) Ablauf mit Arbeitsordner', warteAufSelector: { selector: '[data-aktion="aufraeumen-oeffnen"]', timeoutMs: 8000 }, screenshot: '01-detail.webp' },
          { label: 'Dialog aufräumen', klick: '.arbeitsordner-aktion [data-aktion="aufraeumen-oeffnen"]', warteAufSelector: { selector: '#wf-aufraeumen-begruendung', timeoutMs: 5000 }, ohneAusschnitt: true, screenshot: '02-dialog.webp' },
          { label: 'Ohne Begründung bestätigen', klick: '[data-aktion="aufraeumen"]', screenshot: '03-pflicht.webp', ohneAusschnitt: true },
        ],
      },
    ])
  ),
  'freigabe-bestand-de-1440': {
    url: `${basis}/#/workflows/${encodeURIComponent(freigabeId)}`,
    viewport: { breite: 1440, hoehe: 1100 },
    screenshotVollseite: true,
    anfragenAntworten: [{ muster: `**/api/workflows/${freigabeId}`, status: 200, json: { ...echtesDetail, arbeitsordner: { status: 'bestand' } } }],
    beobachtete: BEOBACHTUNG,
    schritte: [{ label: 'Bestand: arbeitet weiter im Projektordner', warteAufSelector: { selector: '.arbeitsordner-karte', timeoutMs: 8000 }, screenshot: '01-bestand.webp' }],
  },
  'freigabe-bereit-de-1440-zoom200': {
    url: `${basis}/#/workflows/${encodeURIComponent(freigabeId)}`,
    viewport: { breite: 1440, hoehe: 1100 },
    zoom: 2,
    screenshotVollseite: true,
    anfragenAntworten: [{ muster: `**/api/workflows/${freigabeId}`, status: 200, json: ZUSTAENDE.bereit }],
    beobachtete: BEOBACHTUNG,
    schritte: [{ label: '200 % Zoom, bereit', warteAufSelector: { selector: '.arbeitsordner-karte', timeoutMs: 8000 }, screenshot: '01-zoom200.webp' }],
  },
  'code-liste-de-390-hell': {
    url: `${basis}/#/code`,
    viewport: { breite: 390, hoehe: 1400 },
    farbschema: 'light',
    screenshotVollseite: true,
    screenshotAusschnitt: { selector: '#code-arbeitsordner', hoehe: 900 },
    beobachtete: { texte: [{ name: 'Liste', selector: '#code-arbeitsordner' }] },
    schritte: [{ label: 'Seite Code 390 px hell, Liste', warteAufSelector: { selector: '.arbeitsordner-liste, #code-arbeitsordner .subtle', timeoutMs: 10000 }, screenshot: '01-code-liste-390.webp' }],
  },
  'auftrag-anlegen-de-1440': {
    url: `${basis}/#/projekt`,
    viewport: { breite: 1440, hoehe: 1300 },
    screenshotVollseite: true,
    beobachtete: { texte: [{ name: 'Wo gearbeitet wird', selector: '#wo-titel' }, { name: 'Felder', selector: '.umgebung-felder' }, { name: 'Warnung', selector: '.umgebung-warnung' }] },
    schritte: [{ label: 'Auftrag anlegen, Zeile Eigener Arbeitsordner', warteAufSelector: { selector: '.arbeitsordner-pfad', timeoutMs: 10000 }, screenshot: '01-auftrag-anlegen.webp' }],
  },
  'code-liste-de-1440': {
    url: `${basis}/#/code`,
    viewport: { breite: 1440, hoehe: 1300 },
    screenshotVollseite: true,
    screenshotAusschnitt: { selector: '#code-arbeitsordner', hoehe: 700 },
    beobachtete: { texte: [{ name: 'Liste', selector: '#code-arbeitsordner' }] },
    schritte: [{ label: 'Seite Code, Liste der Arbeitsordner', warteAufSelector: { selector: '.arbeitsordner-liste, #code-arbeitsordner .subtle', timeoutMs: 10000 }, screenshot: '01-code-liste.webp' }],
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
