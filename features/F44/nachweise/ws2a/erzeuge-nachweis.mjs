/**
 * Datei: features/F44/nachweise/ws2a/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweise F44 WS-2a „Entscheidungen & Roadmap“ — kleinste Matrix (F-876), nur die
 * geänderten Seiten: #/attention und #/roadmap je bei 1440 dunkel und hell, 390 dunkel, 1440
 * dunkel mit 200 % Zoom und 1440 dunkel auf ru. Dazu:
 * - #/attention mit blockiertem Workitems-Abruf → Gruppe „nicht verfügbar“, Hinweis oben, Kachel
 *   „Nicht verfügbar“ (anfragenBlockieren);
 * - #/roadmap mit blockiertem Roadmap-Abruf → Fehlerzustand mit „Erneut laden“ (F-854);
 * - #/roadmap mit den Fachzuständen nicht_vorhanden und ungueltig (anfragenAntworten, weil das
 *   Projekt dieses Worktrees eine gültige Roadmap hat; der ungueltig-Körper ist die echte Antwort
 *   für haushaltsbuch2, siehe F-854);
 * - Sidebar ans Ende gescrollt, 1440 hell (F-891).
 * Nach der Korrekturrunde zusätzlich: Bedienung beider Seiten per Klick und Tastatur (Zeile
 * öffnen, „Erneut laden“, kommt-Elemente ohne Wirkung, Meilenstein aufklappen, Feature öffnen),
 * reduzierte Bewegung, und #/attention mit Startproblem, mit vier leeren Quellen und mit einer
 * defekten Aggregat-Quelle (feste Antworten für …/zustand und …/workitems; das Startproblem ist
 * ein als Nachweis gekennzeichneter Eintrag mit HTML im Fehlertext, der escaped erscheinen muss).
 * Baut je Folge eine klickfolge.json in einem Unterordner und ruft scripts/render-nachweis.mjs
 * auf; Screenshots als WebP, je Folge Seitenanfang und Seitenende (Fokus auf den letzten Link).
 *
 * Wird aufgerufen von: Hand, gegen einen laufenden Leitstand dieses Worktrees —
 *   node features/F44/nachweise/ws2a/erzeuge-nachweis.mjs [basis] [nurOrdner]
 *   basis:     Standard http://127.0.0.1:4381
 *   nurOrdner: optional, nur diese Folge (Name des Unterordners)
 * Nicht Teil von `npm run check`.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const basis = process.argv[2] ?? 'http://127.0.0.1:4381'
const nur = process.argv[3]
const ziel = 'features/F44/nachweise/ws2a'

/** Echte Antwort von GET /api/projekte/haushaltsbuch2/roadmap (30.09./01.10.2026, F-854). */
const HAUSHALTSBUCH2_UNGUELTIG = {
  status: 'ungueltig',
  fehler: [
    "unbekanntes Feld 'auftrag_id' (additionalProperties: false)",
    "Pflichtfeld 'vision' fehlt",
    "unbekanntes Feld 'meilensteine[0].ziel' (additionalProperties: false)",
    "'meilensteine[0].features[0]' muss ein nicht-leerer String sein",
    "'meilensteine[0].features[1]' muss ein nicht-leerer String sein",
    "'meilensteine[0].features[2]' muss ein nicht-leerer String sein",
    "unbekanntes Feld 'meilensteine[1].ziel' (additionalProperties: false)",
    "'meilensteine[1].features[0]' muss ein nicht-leerer String sein",
    "'meilensteine[1].features[1]' muss ein nicht-leerer String sein",
  ],
}

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

const ATTENTION_BEOBACHTUNG = {
  ...BEOBACHTUNG,
  texte: [
    ...BEOBACHTUNG.texte,
    { name: 'erste Zeile', selector: '#attention-liste .entscheidung-zeile h3' },
    { name: 'Kachel Befunde', selector: '#attention-quellen .quelle-kachel:last-child' },
  ],
  sichtbarkeit: [
    { name: 'Hinweis defekt', id: 'attention-hinweis' },
    { name: 'Leerzustand', id: 'attention-leer' },
    { name: 'Gruppe Workflows', id: 'attention-abschnitt-workflows' },
    { name: 'Gruppe Läufe', id: 'attention-abschnitt-laeufe' },
    { name: 'Gruppe Startfehler', id: 'attention-abschnitt-startfehler' },
    { name: 'Gruppe Befunde', id: 'attention-abschnitt-workitems' },
  ],
}

const ROADMAP_BEOBACHTUNG = {
  ...BEOBACHTUNG,
  texte: [
    ...BEOBACHTUNG.texte,
    { name: 'Zustand', selector: '#view-roadmap .roadmap-fehler strong, #view-roadmap .empty h2, #view-roadmap .roadmap-aktuell-marke' },
    { name: 'erster offener Meilenstein', selector: '#view-roadmap .roadmap-gruppe[open] strong' },
    { name: 'erster Meilenstein (open)', selector: '#view-roadmap details.roadmap-gruppe', attribut: 'open' },
    { name: 'Noch nicht eingeplant', selector: '#view-roadmap .roadmap-nicht-eingeplant p, #view-roadmap .roadmap-nicht-eingeplant .roadmap-chip' },
  ],
  vorhanden: [
    { name: 'Eintrag erfassen (kommt)', selector: '#view-roadmap .kommt-knopf[aria-disabled="true"]' },
    { name: 'Projektakte (kommt)', selector: '#view-roadmap .tab-kommt[aria-disabled="true"]' },
    { name: 'Balken', selector: '#view-roadmap .gantt-bar' },
    { name: 'Erneut laden', selector: '#view-roadmap [data-roadmap-erneut]' },
    { name: 'Meilenstein eingeklappt', selector: '#view-roadmap details:not([open])' },
  ],
}

/**
 * Folge über eine Route in einer Darstellung.
 * @param route - Hash ohne '#/'
 * @param datei - Screenshot-Dateiname
 * @param optionen - farbschema, breite, hoehe, zoom, sprache, blockieren, antworten
 * @returns Klickfolge
 */
function ansicht(route, datei, { farbschema = 'dark', breite = 1440, hoehe = 1000, zoom = 1, sprache, blockieren, antworten, reduziert, schritte, nurAnfang } = {}) {
  return {
    url: `${basis}/#/${route}`,
    viewport: { breite, hoehe },
    farbschema,
    zoom,
    screenshotQualitaet: 0.7,

    ...(sprache ? { localStorageSetzen: { 'leitstand-sprache': sprache } } : {}),
    ...(blockieren ? { anfragenBlockieren: blockieren } : {}),
    ...(antworten ? { anfragenAntworten: antworten } : {}),
    ...(reduziert ? { reduzierteBewegung: true } : {}),
    beobachtete: route === 'attention' ? ATTENTION_BEOBACHTUNG : ROADMAP_BEOBACHTUNG,
    schritte: schritte ?? [
      { label: `#/${route}`, warteAufSelector: { selector: route === 'attention' ? '#attention-quellen .quelle-kachel' : '#view-roadmap .page-heading', timeoutMs: 8000 }, screenshot: datei },
      // Seitenende (Quellen-Kacheln bzw. Legende und „Noch nicht eingeplant“) über den Fokus des letzten Links.
      ...(nurAnfang ? [] : [{ label: 'Seitenende', fokus: `#view-${route} a:visible >> nth=-1`, screenshot: datei.replace('.webp', '-ende.webp') }]),
    ],
  }
}

const folgen = {}
for (const route of ['attention', 'roadmap']) {
  folgen[`${route}-dunkel-1440`] = ansicht(route, `d1440-${route}.webp`)
  folgen[`${route}-hell-1440`] = ansicht(route, `l1440-${route}.webp`, { farbschema: 'light' })
  folgen[`${route}-dunkel-390`] = ansicht(route, `d390-${route}.webp`, { breite: 390, hoehe: 844 })
  folgen[`${route}-dunkel-1440-zoom200`] = ansicht(route, `d1440z2-${route}.webp`, { zoom: 2 })
  folgen[`${route}-ru-1440`] = ansicht(route, `ru1440-${route}.webp`, { sprache: 'ru' })
}
folgen['attention-workitems-blockiert'] = ansicht('attention', 'd1440-attention-workitems-blockiert.webp', { blockieren: ['**/api/workitems*'] })
folgen['roadmap-blockiert'] = ansicht('roadmap', 'd1440-roadmap-blockiert.webp', { blockieren: ['**/api/roadmap'] })
folgen['roadmap-nicht-vorhanden'] = ansicht('roadmap', 'd1440-roadmap-nicht-vorhanden.webp', { antworten: [{ muster: '**/api/roadmap', json: { status: 'nicht_vorhanden' } }] })
folgen['roadmap-ungueltig'] = ansicht('roadmap', 'd1440-roadmap-ungueltig.webp', { antworten: [{ muster: '**/api/roadmap', json: HAUSHALTSBUCH2_UNGUELTIG }] })
folgen['roadmap-404'] = ansicht('roadmap', 'd1440-roadmap-404.webp', { antworten: [{ muster: '**/api/roadmap', status: 404, json: { grund: "Unbekanntes Projekt 'x'" } }] })
/** Zustands-Aggregat für die Folgen mit fester Antwort (nur im Nachweis, nie im Produkt). */
const zustand = (felder) => ({ laeufe: [], startfehler: [], workflows: [], fehler: [], aktiverLauf: { aktiv: false, laufId: null }, pruefbefehl: null, istAiWorkforce: true, ...felder })
const LEERE_WORKITEMS = { muster: '**/api/workitems*', json: { workitems: [], befunde: [], fehler: [] } }
const warteAufKacheln = { warteAufSelector: { selector: '#attention-quellen .quelle-kachel', timeoutMs: 8000 } }

folgen['attention-startproblem'] = ansicht('attention', 'd1440-attention-startproblem.webp', {
  antworten: [
    { muster: '**/api/zustand', json: zustand({ startfehler: [{ zeitstempel: '2026-10-01T08:00:00.000Z', laufId: 'nachweis-startproblem-1', fehler: 'Nachweis: Start abgelehnt <b>nicht fett</b>' }] }) },
    LEERE_WORKITEMS,
  ],
  nurAnfang: true,
})
folgen['attention-leer'] = ansicht('attention', 'd1440-attention-leer.webp', { antworten: [{ muster: '**/api/zustand', json: zustand({}) }, LEERE_WORKITEMS] })
folgen['attention-aggregat-defekt'] = ansicht('attention', 'd1440-attention-aggregat-defekt.webp', {
  antworten: [{ muster: '**/api/zustand', json: zustand({ workflows: null, fehler: [{ quelle: 'workflows', grund: 'Nachweis' }] }) }, LEERE_WORKITEMS],
  nurAnfang: true,
})
folgen['attention-reduziert'] = ansicht('attention', 'd1440-attention-reduziert.webp', { reduziert: true })
folgen['roadmap-reduziert'] = ansicht('roadmap', 'd1440-roadmap-reduziert.webp', { reduziert: true })
folgen['attention-bedienung'] = ansicht('attention', 'd1440-attention-bedienung.webp', {
  blockieren: ['**/api/workitems*'],
  schritte: [
    { label: '#/attention, Workitems blockiert', ...warteAufKacheln, screenshot: 'd1440-attention-bedienung-1.webp' },
    { label: 'Klick „Erneut laden“ (weiter blockiert: Hinweis bleibt)', klick: '#attention-erneut', ...warteAufKacheln, screenshot: 'd1440-attention-bedienung-2.webp' },
    { label: 'Tastatur: Enter auf der ersten Zeile öffnet das Ziel (Ablauf-Detail #/workflows/<id>, Ansicht runs)', fokus: '#attention-liste a.entscheidung-zeile', taste: 'Enter', screenshot: 'd1440-attention-bedienung-3.webp' },
  ],
})
folgen['roadmap-bedienung'] = ansicht('roadmap', 'd1440-roadmap-bedienung.webp', {
  schritte: [
    { label: '#/roadmap', warteAufSelector: { selector: '#view-roadmap .roadmap-gruppe', timeoutMs: 8000 } },
    // Ein Mausklick ist hier nicht nachstellbar: Playwright klickt aria-disabled-Knöpfe nicht an. Die
    // Sperre für Klicks belegt kommt.test.mjs; hier die Tastatur (Enter und Leertaste).
    { label: 'Tastatur: Leertaste auf „Eintrag erfassen“ (kommt: keine Wirkung)', fokus: '#view-roadmap .kommt-knopf', taste: 'Space' },
    { label: 'Tastatur: Enter auf „Projektakte“ (kommt: keine Wirkung)', fokus: '#view-roadmap .tab-kommt', taste: 'Enter' },
    { label: 'Klick auf den ersten eingeklappten Meilenstein', klick: '#view-roadmap details:not([open]) > summary', screenshot: 'd1440-roadmap-bedienung-1.webp' },
    { label: 'Tastatur: Enter auf dem ersten Feature öffnet das Workboard-Detail', fokus: '#view-roadmap a.roadmap-feature', taste: 'Enter', screenshot: 'd1440-roadmap-bedienung-2.webp' },
  ],
})
folgen['roadmap-blockiert-erneut'] = ansicht('roadmap', 'd1440-roadmap-blockiert-erneut.webp', {
  blockieren: ['**/api/roadmap'],
  schritte: [
    { label: '#/roadmap, Abruf blockiert', warteAufSelector: { selector: '#view-roadmap [data-roadmap-erneut]', timeoutMs: 8000 } },
    { label: 'Klick „Erneut laden“ (weiter blockiert: Fehler bleibt, Fokus auf der Überschrift)', klick: '#view-roadmap [data-roadmap-erneut]', warteAufSelector: { selector: '#view-roadmap [data-roadmap-erneut]', timeoutMs: 8000 }, screenshot: 'd1440-roadmap-blockiert-erneut.webp' },
  ],
})

folgen['sidebar-hell-1440'] = {
  url: `${basis}/#/attention`,
  viewport: { breite: 1440, hoehe: 1000 },
  farbschema: 'light',
  screenshotQualitaet: 0.8,
  screenshotAusschnitt: { selector: '#shell-sidebar', hoehe: 1000 },
  beobachtete: {
    ...BEOBACHTUNG,
    getroffen: [
      { name: 'Alle Produkte klickbar', selector: '#shell-sidebar a[data-nav-view="projekte-uebersicht"]' },
      { name: 'Nutzung klickbar', selector: '#shell-sidebar a[data-nav-view="nutzung"]' },
      { name: 'Einstellungen klickbar', selector: '#shell-sidebar a[data-nav-view="einstellungen"]' },
    ],
  },
  schritte: [
    { label: 'Sidebar hell (F-891)', fokus: '#shell-sidebar .secondary-workforce', screenshot: 'l1440-sidebar.webp' },
    { label: 'Sidebar dunkel (Vergleich)', klick: '#kopf-theme', fokus: '#shell-sidebar .secondary-workforce', screenshot: 'd1440-sidebar.webp' },
  ],
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
