/**
 * Datei: features/F44/nachweise/ws1a/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweise F44 WS-1a. Baut die Klickfolgen (je Theme, Breite, Zoom und
 * Sprache sowie Bedienung und Projektwechsel F-860), legt sie als klickfolge.json in je
 * einen Unterordner und ruft dafür scripts/render-nachweis.mjs auf. Screenshots als WebP
 * (klein, F-869); Protokoll je Ordner in protokoll.md.
 *
 * Wird aufgerufen von: Hand, gegen einen laufenden Leitstand mit zwei Registereinträgen:
 *   LEITSTAND_PORT=4291 LEITSTAND_PROJEKTE_PFAD=<Registerkopie mit ai-workforce und projekt-b>
 *   LEITSTAND_PROJEKTE_LOKAL_PFAD=<leer> node scripts/leitstand-server.mjs
 *   node features/F44/nachweise/ws1a/erzeuge-nachweis.mjs http://127.0.0.1:4291
 * projekt-b ist das Testprojekt aus F25 (Nachbarordner f25-testprojekt-b, Muster
 * features/F25/nachweis-ws2a.md). Nicht Teil von `npm run check`.
 *
 * Wichtig: Die Auftrag-IDs unten sind echte Aufträge der beiden Kontrollzustände
 * (je ein Eintrag lineage-auftrag-<id>); ändern sie sich, zeigt die Tabelle „false“.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const basis = process.argv[2] ?? 'http://127.0.0.1:4291'
const ziel = 'features/F44/nachweise/ws1a'

const ROUTEN = ['einstellungen', 'dashboard', 'workboard', 'runs']
const AUFTRAG_A = '00a7e6bf-a744-4eca-be4a-c4290acf2662'
const AUFTRAG_B = '641dd347-d11d-4ce6-b3d9-d9f1ae13608e'

const BEOBACHTUNG_BASIS = {
  texte: [
    { name: 'Ansicht', selector: '[data-view]:not([hidden])', attribut: 'data-view' },
    { name: 'data-theme', selector: 'html', attribut: 'data-theme' },
    { name: 'lang', selector: 'html', attribut: 'lang' },
    { name: 'theme-color', selector: 'meta[name="theme-color"]', attribut: 'content' },
  ],
}

/**
 * Klickfolge über die vier Routen in einer Darstellung.
 * @param kuerzel - Dateipräfix, z. B. d1440
 * @param optionen - farbschema, breite, hoehe, zoom
 * @returns Klickfolge
 */
function routenFolge(kuerzel, { farbschema, breite, hoehe, zoom = 1 }) {
  return {
    url: `${basis}/#/einstellungen`,
    viewport: { breite, hoehe },
    farbschema,
    zoom,
    screenshotQualitaet: 0.7,
    beobachtete: {
      ...BEOBACHTUNG_BASIS,
      texte: [...BEOBACHTUNG_BASIS.texte, { name: 'Überschrift', selector: '[data-view]:not([hidden]) h1, [data-view]:not([hidden]) h2' }],
      ueberlauf: true,
    },
    schritte: ROUTEN.map((route, i) => ({
      label: `#/${route}`,
      ...(i === 0 ? {} : { navigiere: `#/${route}` }),
      screenshot: `${kuerzel}-${route}.webp`,
      // Vollseite nur ohne Chatspalte daneben (CSS-Breite unter 1280 px) — mit ihr wird das Bild über 10 000 px hoch.
      screenshotVollseite: route === 'einstellungen' && breite / zoom < 1280,
    })),
  }
}

/**
 * Klickfolge der Seite Einstellungen in einer Sprache.
 * @param kuerzel - Dateipräfix
 * @param sprache - ru oder tr
 * @param optionen - farbschema, breite, hoehe
 * @returns Klickfolge
 */
function sprachFolge(kuerzel, sprache, { farbschema, breite, hoehe }) {
  return {
    url: `${basis}/#/einstellungen`,
    viewport: { breite, hoehe },
    farbschema,
    localStorageSetzen: { 'leitstand-sprache': sprache },
    screenshotQualitaet: 0.7,
    beobachtete: { ...BEOBACHTUNG_BASIS, texte: [...BEOBACHTUNG_BASIS.texte, { name: 'Titel', selector: '#view-einstellungen h1' }, { name: 'Dropdown-Eintrag', selector: '#nutzerkarte-einstellungen' }], ueberlauf: true },
    schritte: [{ label: `#/einstellungen (${sprache})`, screenshot: `${kuerzel}-einstellungen.webp`, screenshotVollseite: breite < 800 }],
  }
}

const folgen = {
  'dunkel-1440': routenFolge('d1440', { farbschema: 'dark', breite: 1440, hoehe: 1000 }),
  'hell-1440': routenFolge('l1440', { farbschema: 'light', breite: 1440, hoehe: 1000 }),
  'dunkel-390': routenFolge('d390', { farbschema: 'dark', breite: 390, hoehe: 844 }),
  'hell-390': routenFolge('l390', { farbschema: 'light', breite: 390, hoehe: 844 }),
  'dunkel-1440-zoom200': routenFolge('d1440z2', { farbschema: 'dark', breite: 1440, hoehe: 1000, zoom: 2 }),
  'hell-1440-zoom200': routenFolge('l1440z2', { farbschema: 'light', breite: 1440, hoehe: 1000, zoom: 2 }),
  'ru-1440': sprachFolge('ru1440', 'ru', { farbschema: 'dark', breite: 1440, hoehe: 1000 }),
  'ru-390': sprachFolge('ru390', 'ru', { farbschema: 'light', breite: 390, hoehe: 844 }),
  'tr-1440': sprachFolge('tr1440', 'tr', { farbschema: 'light', breite: 1440, hoehe: 1000 }),
  'tr-390': sprachFolge('tr390', 'tr', { farbschema: 'dark', breite: 390, hoehe: 844 }),
  bedienung: {
    url: `${basis}/#/einstellungen`,
    viewport: { breite: 1440, hoehe: 1000 },
    farbschema: 'dark',
    localStorageSetzen: { 'leitstand-reduzierte-bewegung': 'false' },
    screenshotQualitaet: 0.7,
    beobachtete: {
      ...BEOBACHTUNG_BASIS,
      texte: [
        ...BEOBACHTUNG_BASIS.texte,
        { name: 'reduzierte-bewegung', selector: 'html', attribut: 'data-reduzierte-bewegung' },
        { name: 'Dunkel gedrückt', selector: '[data-theme-wahl="dark"]', attribut: 'aria-pressed' },
        { name: 'Hell gedrückt', selector: '[data-theme-wahl="light"]', attribut: 'aria-pressed' },
        { name: 'Schalter Nutzerkarte', selector: '#persona-bewegung-schalter' },
        { name: 'Fokus', selector: ':focus' },
      ],
      sichtbarkeit: [{ name: 'Dropdown offen', id: 'nutzerkarte-dropdown' }],
      vorhanden: [{ name: 'Sanfte Bewegung an', selector: '#einstellungen-bewegung:checked' }],
      getroffen: [
        { name: 'Eintrag Einstellungen klickbar', selector: '#nutzerkarte-einstellungen' },
        { name: 'Schalter Nutzerkarte klickbar', selector: '#persona-bewegung-schalter' },
      ],
    },
    schritte: [
      { label: 'Initial dunkel' },
      { label: 'Klick „Hell“', klick: '[data-theme-wahl="light"]', screenshot: 'bedienung-hell.webp' },
      { label: 'Neu laden (Theme bleibt)', reload: true },
      { label: 'Klick „Dunkel“', klick: '[data-theme-wahl="dark"]' },
      { label: 'Sanfte Bewegung aus', klick: '#einstellungen-bewegung' },
      { label: 'Sanfte Bewegung an', klick: '#einstellungen-bewegung' },
      { label: 'Nutzerkarte öffnen', klick: '#nutzerkarte-oeffner', screenshot: 'bedienung-dropdown.webp' },
      { label: 'Schalter Nutzerkarte (reduzieren)', klick: '#persona-bewegung-schalter' },
      { label: 'Schalter Nutzerkarte (einschalten)', klick: '#persona-bewegung-schalter' },
      { label: 'Nutzerkarte schließen', klick: '#nutzerkarte-oeffner' },
      { label: 'Nach #/dashboard', navigiere: '#/dashboard' },
      { label: 'Dropdown → Einstellungen', klick: '#nutzerkarte-oeffner' },
      { label: 'Klick „Einstellungen“ (Fokus auf h1)', klick: '#nutzerkarte-einstellungen' },
      { label: 'Tastatur: Fokus „Hell“, Enter', fokus: '[data-theme-wahl="light"]', taste: 'Enter' },
      { label: 'Tastatur: Fokus „Dunkel“, Leertaste', fokus: '[data-theme-wahl="dark"]', taste: 'Space' },
      { label: 'Tastatur: Häkchen, Leertaste (aus)', fokus: '#einstellungen-bewegung', taste: 'Space' },
      { label: 'Tastatur: Häkchen, Leertaste (an)', fokus: '#einstellungen-bewegung', taste: 'Space' },
      { label: 'Sprache → English (lädt neu)', klick: '[data-sprache-wahl="en"]', warteAufSelector: { selector: 'html[lang="en"] #view-einstellungen h1', timeoutMs: 30000 }, screenshot: 'bedienung-en.webp' },
      { label: 'Sprache → Deutsch per Tastatur (lädt neu)', fokus: '[data-sprache-wahl="de"]', taste: 'Enter', warteAufSelector: { selector: 'html[lang="de"] #view-einstellungen h1', timeoutMs: 30000 } },
    ],
  },
  'reduzierte-bewegung': {
    url: `${basis}/#/einstellungen`,
    viewport: { breite: 1440, hoehe: 1000 },
    farbschema: 'dark',
    reduzierteBewegung: true,
    beobachtete: {
      ...BEOBACHTUNG_BASIS,
      texte: [
        ...BEOBACHTUNG_BASIS.texte,
        { name: 'reduzierte-bewegung', selector: 'html', attribut: 'data-reduzierte-bewegung' },
        { name: 'Schalter Nutzerkarte', selector: '#persona-bewegung-schalter' },
        { name: 'Beschreibung', selector: '#einstellungen-bewegung-text' },
      ],
      vorhanden: [{ name: 'Häkchen deaktiviert', selector: '#einstellungen-bewegung:disabled' }],
    },
    schritte: [{ label: 'prefers-reduced-motion: reduce', screenshot: 'reduziert-einstellungen.webp' }],
  },
  'theme-kaputt': {
    url: `${basis}/#/einstellungen`,
    viewport: { breite: 1440, hoehe: 1000 },
    localStorageSetzen: { 'leitstand-theme': 'sepia', 'leitstand-sprache': 'xx' },
    beobachtete: { ...BEOBACHTUNG_BASIS, texte: [...BEOBACHTUNG_BASIS.texte, { name: 'Titel', selector: '#view-einstellungen h1' }] },
    schritte: [{ label: 'Speicher: Theme „sepia“, Sprache „xx“' }],
  },
  'dropdown-390': {
    url: `${basis}/#/workboard`,
    viewport: { breite: 390, hoehe: 844 },
    farbschema: 'light',
    screenshotQualitaet: 0.7,
    beobachtete: {
      sichtbarkeit: [{ name: 'Dropdown offen', id: 'nutzerkarte-dropdown' }],
      getroffen: [
        { name: 'Eintrag Einstellungen klickbar', selector: '#nutzerkarte-einstellungen' },
        { name: 'Schalter Nutzerkarte klickbar', selector: '#persona-bewegung-schalter' },
      ],
    },
    schritte: [{ label: '#/workboard, Nutzerkarte öffnen', klick: '#nutzerkarte-oeffner', screenshot: 'dropdown-390-workboard.webp' }],
  },
  'projektwechsel-f860': {
    url: `${basis}/#/projekte-uebersicht`,
    viewport: { breite: 1440, hoehe: 1000 },
    farbschema: 'dark',
    screenshotQualitaet: 0.7,
    beobachtete: {
      texte: [
        { name: 'Aktives Projekt', selector: '#projekt-kontext strong' },
        { name: 'Ansicht', selector: '[data-view]:not([hidden])', attribut: 'data-view' },
        { name: 'Fokus-Karte', selector: '.bento-fokus' },
        { name: 'Filter Typ', selector: '#workboard-filter-typ [aria-pressed="true"]' },
        { name: 'Roadmap-Karte', selector: '.bento-roadmap-karte' },
        { name: 'Kennzahlen', selector: '.dashboard-kennzahlen' },
        { name: 'Erste Auftragsoption', selector: '#start-auftrag option' },
      ],
      vorhanden: [
        { name: 'Workitem-Zeilen', selector: '.workboard-zeile' },
        { name: `Auftrag A (${AUFTRAG_A.slice(0, 8)})`, selector: `#start-auftrag option[value="${AUFTRAG_A}"]` },
        { name: `Auftrag B (${AUFTRAG_B.slice(0, 8)})`, selector: `#start-auftrag option[value="${AUFTRAG_B}"]` },
      ],
    },
    schritte: [
      // Projekt A (ai-workforce) ist in einer neuen Sitzung bereits aktiv — seine Karte trägt „Aktiv“ statt „Öffnen“.
      { label: 'Übersicht (A aktiv)' },
      { label: 'A: #/workboard', navigiere: '#/workboard', screenshot: 'f860-a-workboard.webp' },
      { label: 'A: Filter Typ setzen', klick: '#workboard-filter-typ .filter-chip:nth-child(2)' },
      { label: 'A: #/dashboard', navigiere: '#/dashboard' },
      { label: 'A: #/projekt', navigiere: '#/projekt' },
      { label: 'Zur Übersicht', navigiere: '#/projekte-uebersicht' },
      { label: 'Projekt B öffnen', klick: '.projekt-waehlen[data-id="projekt-b"]' },
      { label: 'Zur Übersicht', navigiere: '#/projekte-uebersicht' },
      { label: 'Projekt A wieder öffnen', klick: '.projekt-waehlen[data-id="ai-workforce"]' },
      { label: 'A: #/workboard (zurück, wartet auf Workitems von A)', navigiere: '#/workboard', warteAufSelector: { selector: '.workboard-zeile', timeoutMs: 60000 } },
      { label: 'Zur Übersicht', navigiere: '#/projekte-uebersicht' },
      { label: 'Projekt B öffnen (zweites Mal)', klick: '.projekt-waehlen[data-id="projekt-b"]' },
      { label: 'B: #/workboard', navigiere: '#/workboard', screenshot: 'f860-b-workboard.webp' },
      { label: 'B: #/dashboard', navigiere: '#/dashboard', screenshot: 'f860-b-dashboard.webp' },
      { label: 'B: #/projekt', navigiere: '#/projekt', screenshot: 'f860-b-projekt.webp' },
    ],
  },
}

const nur = process.argv[3]
for (const [name, folge] of Object.entries(folgen)) {
  if (nur && name !== nur) continue
  const ordner = join(ziel, name)
  mkdirSync(ordner, { recursive: true })
  const pfad = join(ordner, 'klickfolge.json')
  writeFileSync(pfad, `${JSON.stringify(folge, null, 2)}\n`)
  console.log(`\n=== ${name} ===`)
  execFileSync(process.execPath, ['scripts/render-nachweis.mjs', pfad, ordner], { stdio: 'inherit' })
}
