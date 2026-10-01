/**
 * Datei: features/F44/nachweise/ws2b/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweise F44 WS-2b „Übersicht“ — kleinste Matrix (F-876), nur die geänderten
 * Seiten:
 * - #/dashboard bei 1440 dunkel und hell (ganzer Hauptbereich — ab 1280 px steht die Chatspalte bis
 *   WS-8 immer daneben und bestimmte sonst die Seitenhöhe), 390 dunkel (ganze Seite), 1440 dunkel mit
 *   200 % Zoom und 1440 dunkel auf ru (ganze Seite);
 * - #/dashboard im Leerzustand B14 (feste Antworten: keine Workitems, Roadmap nicht_vorhanden),
 *   mit blockierter Roadmap (die übrigen Blöcke bleiben sichtbar) und mit defektem Aggregat
 *   („nicht verfügbar“, feste Antwort für …/zustand);
 * - #/nutzung bei 1440 dunkel (Verbrauch, F-880);
 * - #/attention bei 1440 dunkel mit „+ x weitere“ vor und nach dem Aufklappen (F-898);
 * - #/workboard bei 1440 dunkel als Regressionsbild des Bento nach dem Umzug in fokus-daten.js.
 * Nach den Challenger-Entscheidungen (F-903, F-905) zusätzlich: Leerzustand B14 mit wartendem
 * Workflow (feste Antworten — die normalen Blöcke erscheinen, B7 zeigt die Freigabe).
 * Nach der Korrekturrunde zusätzlich: 200 % Zoom als ganze Seite, reduzierte Bewegung und die
 * Tastaturbedienung der Übersicht (kommt-Knopf mit Enter und Leertaste ohne Wirkung, Sprung
 * „Entwicklungsstand ansehen“ mit Fokus auf der Überschrift, Direktaktion in B7 öffnet das Ziel).
 * Baut je Folge eine klickfolge.json in einem Unterordner und ruft scripts/render-nachweis.mjs
 * auf; Screenshots als WebP.
 *
 * Wird aufgerufen von: Hand, gegen einen laufenden Leitstand dieses Worktrees —
 *   node features/F44/nachweise/ws2b/erzeuge-nachweis.mjs [basis] [nurOrdner]
 *   basis:     Standard http://127.0.0.1:4381
 *   nurOrdner: optional, nur diese Folge (Name des Unterordners)
 * Nicht Teil von `npm run check`.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const basis = process.argv[2] ?? 'http://127.0.0.1:4381'
const nur = process.argv[3]
const ziel = 'features/F44/nachweise/ws2b'

/** Chatspalte eingeklappt (Vorlage: Chat als Dock, WS-8) — sonst bestimmt ihre Länge die Vollseite. */
const CHAT_ZU = { 'leitstand-chat-offen': 'false' }

const BEOBACHTUNG = {
  texte: [
    { name: 'Ansicht', selector: '[data-view]:not([hidden])', attribut: 'data-view' },
    { name: 'data-theme', selector: 'html', attribut: 'data-theme' },
    { name: 'lang', selector: 'html', attribut: 'lang' },
    { name: 'Überschrift', selector: '[data-view]:not([hidden]) h1' },
    { name: 'aktiv in der Nav', selector: '#shell-sidebar [aria-current="page"]' },
    { name: 'Fokus', selector: ':focus' },
  ],
  ueberlauf: true,
}

const UEBERSICHT_BEOBACHTUNG = {
  ...BEOBACHTUNG,
  texte: [
    ...BEOBACHTUNG.texte,
    { name: 'B1 Meilensteinzeile', selector: '#uebersicht-b1 .description' },
    { name: 'B2 Fortschritt', selector: '#uebersicht-cockpit .cockpit-progress' },
    { name: 'B3 Rolle', selector: '#uebersicht-cockpit .cockpit-role h2' },
    { name: 'B5 Werte', selector: '#uebersicht-werte .pm-summary-strip' },
    { name: 'B7 erste Entscheidung', selector: '#uebersicht-fokus .pm-decision h3' },
    { name: 'B8 Workforce', selector: '#uebersicht-fokus .pm-now h2' },
    { name: 'B9 aktueller Meilenstein', selector: '#uebersicht-weg .uebersicht-weg-zeile.aktuell, #uebersicht-weg .note, #uebersicht-weg p' },
    { name: 'B10 erste Zeile', selector: '#uebersicht-stand .pm-status-row, #uebersicht-stand p' },
    { name: 'B11 Jetzt', selector: '#uebersicht-wer .execution-current strong, #uebersicht-wer p' },
    { name: 'B12 Zuletzt', selector: '#uebersicht-zuletzt h2, #uebersicht-zuletzt p' },
    { name: 'B16 Betrieb', selector: '#uebersicht-betrieb' },
  ],
  sichtbarkeit: [
    { name: 'Erster Schritt (B14)', id: 'uebersicht-erster-schritt' },
    { name: 'Blöcke 2–11', id: 'uebersicht-inhalt' },
  ],
  vorhanden: [
    { name: 'kommt-Knöpfe (aria-disabled)', selector: '#view-dashboard .kommt-knopf[aria-disabled="true"]' },
    { name: 'Deployer (aria-disabled)', selector: '#view-dashboard .cockpit-deployer[aria-disabled="true"]' },
    { name: 'Wochenspalten/Gantt', selector: '#view-dashboard .roadmap-wochen, #view-dashboard .gantt-bar' },
    { name: 'Erneut laden (Roadmap)', selector: '#view-dashboard [data-uebersicht-erneut]' },
    { name: 'Verbrauchskarte', selector: '#view-dashboard .verbrauch-karte' },
  ],
}

/** Zustands-Aggregat für die Folge mit fester Antwort (nur im Nachweis, nie im Produkt). */
const zustand = (felder) => ({ laeufe: [], startfehler: [], workflows: [], fehler: [], aktiverLauf: { aktiv: false, laufId: null }, pruefbefehl: null, istAiWorkforce: true, ...felder })

/** Wartet, bis Aggregat und Roadmap da sind und der Fokus-Nachtrag eingetragen ist (oder es keinen gibt). */
const WARTE_UEBERSICHT = { warteAufSelector: { selector: '#uebersicht-cockpit .cockpit-role h2, #uebersicht-erster-schritt .first-step', timeoutMs: 10000 } }
const WARTE_NACHTRAG = { warteAufSelector: { selector: '#uebersicht-wer .execution-triptych, #uebersicht-wer p:not(.subtle), #uebersicht-wer p.subtle:not(:empty)', timeoutMs: 10000 } }

/**
 * Folge über #/dashboard in einer Darstellung.
 * @param datei - Screenshot-Dateiname
 * @param optionen - farbschema, breite, hoehe, zoom, sprache, blockieren, antworten, vollseite
 * @returns Klickfolge
 */
function uebersicht(datei, { farbschema = 'dark', breite = 1440, hoehe = 1000, zoom = 1, sprache, blockieren, antworten, vollseite = true, reduziert, schritte } = {}) {
  return {
    url: `${basis}/#/dashboard`,
    viewport: { breite, hoehe },
    farbschema,
    zoom,
    screenshotQualitaet: 0.7,
    // Ab 1280 px steht die Chatspalte bis WS-8 immer daneben; ihre Historie machte die Vollseite
    // rund 11 000 px hoch. Dort zeigt der Ausschnitt die Übersicht in ganzer Höhe.
    ...(vollseite && breite / zoom >= 1280 ? { screenshotVollseite: true, screenshotAusschnitt: { selector: '#view-dashboard' } } : { screenshotVollseite: vollseite }),
    localStorageSetzen: { ...CHAT_ZU, ...(sprache ? { 'leitstand-sprache': sprache } : {}) },
    ...(blockieren ? { anfragenBlockieren: blockieren } : {}),
    ...(antworten ? { anfragenAntworten: antworten } : {}),
    ...(reduziert ? { reduzierteBewegung: true } : {}),
    beobachtete: UEBERSICHT_BEOBACHTUNG,
    schritte: schritte ?? [
      { label: '#/dashboard', ...WARTE_UEBERSICHT },
      { label: 'Fokus-Nachtrag geladen', ...WARTE_NACHTRAG, screenshot: datei },
    ],
  }
}


const folgen = {
  'dashboard-dunkel-1440': uebersicht('d1440-dashboard.webp'),
  'dashboard-hell-1440': uebersicht('l1440-dashboard.webp', { farbschema: 'light' }),
  'dashboard-dunkel-390': uebersicht('d390-dashboard.webp', { breite: 390, hoehe: 844 }),
  'dashboard-dunkel-1440-zoom200': uebersicht('d1440z2-dashboard.webp', { zoom: 2 }),
  'dashboard-reduziert': uebersicht('d1440-dashboard-reduziert.webp', { reduziert: true, vollseite: false }),
  'dashboard-bedienung': uebersicht('d1440-dashboard-bedienung.webp', {
    vollseite: false,
    schritte: [
      { label: '#/dashboard', ...WARTE_UEBERSICHT },
      // Playwright klickt aria-disabled-Knöpfe nicht an; die Sperre für Klicks belegt kommt.test.mjs.
      { label: 'Tastatur: Enter auf „Produkt bearbeiten“ (kommt: keine Wirkung, Ansicht bleibt)', fokus: '#uebersicht-b1 .kommt-knopf', taste: 'Enter' },
      { label: 'Tastatur: Leertaste auf „+ Eintrag erfassen“ (kommt: keine Wirkung)', fokus: '#uebersicht-b1 .kommt-knopf.primary', taste: 'Space', screenshot: 'd1440-dashboard-bedienung-1.webp' },
      { label: 'Tastatur: Enter auf „Entwicklungsstand ansehen“ (Sprung, Fokus auf der Überschrift)', fokus: '#uebersicht-cockpit [data-sprung]', taste: 'Enter', screenshot: 'd1440-dashboard-bedienung-2.webp' },
      { label: 'Tastatur: Enter auf der ersten Direktaktion in B7 öffnet das Ziel', fokus: '#uebersicht-fokus .pm-decision a', taste: 'Enter', screenshot: 'd1440-dashboard-bedienung-3.webp' },
    ],
  }),
  'dashboard-ru-1440': uebersicht('ru1440-dashboard.webp', { sprache: 'ru' }),
  'dashboard-leer': uebersicht('d1440-dashboard-leer.webp', {
    antworten: [
      { muster: '**/api/workitems*', json: { workitems: [], befunde: [], fehler: [] } },
      { muster: '**/api/roadmap', json: { status: 'nicht_vorhanden' } },
    ],
  }),
  'dashboard-b14-wartender-workflow': uebersicht('d1440-dashboard-b14-wartender-workflow.webp', {
    antworten: [
      { muster: '**/api/workitems*', json: { workitems: [], befunde: [], fehler: [] } },
      { muster: '**/api/roadmap', json: { status: 'nicht_vorhanden' } },
      {
        muster: '**/api/zustand',
        json: zustand({ workflows: [{ workflowId: 'nachweis-w1', auftragId: null, ziel: 'Nachweis: erster Auftrag wartet auf Freigabe', status: 'LAEUFT', aktiverSchrittId: 's1', grund: null, naechster: { art: 'haltFreigabe', schrittId: 's1' } }] }),
      },
      { muster: '**/workflows/nachweis-w1', json: { daten: { schritte: [{ schritt_id: 's1', rolle: 'ausfuehrung', status: 'WARTET_FREIGABE', nachfolger: null }] } } },
    ],
  }),
  'dashboard-roadmap-blockiert': uebersicht('d1440-dashboard-roadmap-blockiert.webp', { blockieren: ['**/api/roadmap'] }),
  'dashboard-aggregat-defekt': uebersicht('d1440-dashboard-aggregat-defekt.webp', {
    antworten: [
      {
        muster: '**/api/zustand',
        json: zustand({ workflows: null, laeufe: null, startfehler: null, aktiverLauf: null, fehler: [{ quelle: 'workflows', grund: 'Nachweis' }] }),
      },
    ],
  }),
  'nutzung-dunkel-1440': {
    url: `${basis}/#/nutzung`,
    viewport: { breite: 1440, hoehe: 1000 },
    farbschema: 'dark',
    localStorageSetzen: CHAT_ZU,
    screenshotQualitaet: 0.7,
    screenshotVollseite: true,
    beobachtete: {
      ...BEOBACHTUNG,
      texte: [...BEOBACHTUNG.texte, { name: 'Zeitraum aktiv', selector: '#view-nutzung .btn-primary' }, { name: 'Läufe gesamt', selector: '#view-nutzung .verbrauch-gesamt .stat-wert' }],
    },
    schritte: [{ label: '#/nutzung', warteAufSelector: { selector: '#view-nutzung .verbrauch-gesamt, #view-nutzung .fehler', timeoutMs: 10000 }, screenshot: 'd1440-nutzung.webp' }],
  },
  'attention-weitere-1440': {
    url: `${basis}/#/attention`,
    viewport: { breite: 1440, hoehe: 1000 },
    farbschema: 'dark',
    localStorageSetzen: CHAT_ZU,
    screenshotQualitaet: 0.7,
    beobachtete: {
      ...BEOBACHTUNG,
      texte: [
        ...BEOBACHTUNG.texte,
        { name: 'Knopf', selector: '#attention-liste .attention-mehr' },
        { name: 'aria-expanded (fokussierter Knopf)', selector: ':focus', attribut: 'aria-expanded' },
        { name: 'Kachel Befunde', selector: '#attention-quellen .quelle-kachel:last-child' },
      ],
    },
    schritte: [
      { label: '#/attention', warteAufSelector: { selector: '#attention-liste .attention-mehr', timeoutMs: 10000 } },
      { label: 'Fokus auf „+ x weitere“ (eingeklappt)', fokus: '#attention-liste .attention-mehr >> nth=-1', screenshot: 'd1440-attention-weitere-zu.webp' },
      { label: 'Enter: Gruppe aufgeklappt, Fokus bleibt auf dem Knopf', taste: 'Enter', screenshot: 'd1440-attention-weitere-auf.webp' },
    ],
  },
  'workboard-dunkel-1440': {
    url: `${basis}/#/workboard`,
    viewport: { breite: 1440, hoehe: 1000 },
    farbschema: 'dark',
    localStorageSetzen: CHAT_ZU,
    screenshotQualitaet: 0.7,
    beobachtete: {
      ...BEOBACHTUNG,
      texte: [...BEOBACHTUNG.texte, { name: 'Fokus-Karte', selector: '#workboard-bento .bento-fokus' }, { name: 'Pipeline', selector: '#workboard-bento .pipeline-schritt' }],
    },
    schritte: [{ label: '#/workboard', warteAufSelector: { selector: '#workboard-bento .pipeline-schritt, #workboard-bento .bento-leer', timeoutMs: 10000 }, screenshot: 'd1440-workboard.webp' }],
  },
}

for (const [ordner, klickfolge] of Object.entries(folgen)) {
  if (nur !== undefined && ordner !== nur) continue
  const verzeichnis = join(ziel, ordner)
  mkdirSync(verzeichnis, { recursive: true })
  const pfad = join(verzeichnis, 'klickfolge.json')
  writeFileSync(pfad, `${JSON.stringify(klickfolge, null, 2)}\n`)
  console.log(`— ${ordner}`)
  execFileSync(process.execPath, ['scripts/render-nachweis.mjs', pfad, verzeichnis], { stdio: 'inherit' })
}
