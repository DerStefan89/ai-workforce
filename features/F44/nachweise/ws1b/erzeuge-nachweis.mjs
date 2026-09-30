/**
 * Datei: features/F44/nachweise/ws1b/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweise F44 WS-1b „Shell & Einstieg“ — bewusst kleine Matrix (F-876): Shell auf
 * #/dashboard (1440 dunkel/hell, 390 dunkel, 1440 dunkel mit 200 % Zoom, 1440 ru), #/brain
 * (1440 dunkel), Motion der Startfläche (0/800/1600/2400 ms und reduzierte Bewegung) und der
 * Kopf-Persona (0/350/700 ms und reduziert, über den Schritt "animationenBei" von
 * scripts/render-nachweis.mjs), Bedienung der Shell (Checkliste „nichts fällt weg“) und der
 * Projektwechsel über die Kopfauswahl (A → B, Daten von B; dazu Tastatur-Bremse und Wechsel aus
 * einem Detail). Nach der Korrekturrunde zusätzlich: Sidebar ans Ende gescrollt bei 1024 × 800,
 * 1366 × 768 und 200 % Zoom (dunkel und hell, F-865), hell 390, Produktzyklus/Roadmap/Nutzung und
 * das Poll-Fehlerbanner (A9, "anfragenBlockieren"). Baut je Folge eine klickfolge.json in
 * einem Unterordner und ruft dafür scripts/render-nachweis.mjs auf; Screenshots als WebP.
 *
 * Wird aufgerufen von: Hand, gegen zwei laufende Leitstände —
 *   node features/F44/nachweise/ws1b/erzeuge-nachweis.mjs <basisShell> <basisWechsel>
 *   basisShell:   Leitstand dieses Worktrees (Standard http://127.0.0.1:4173)
 *   basisWechsel: Leitstand mit zwei Registereinträgen ai-workforce (A) und projekt-b (B, das
 *                 Testprojekt f25-testprojekt-b aus F25), Standard http://127.0.0.1:4292
 * Nicht Teil von `npm run check`.
 *
 * Wichtig: Die Startfläche erscheint nur beim ersten Laden einer Sitzung mit leerem Hash; die
 * Motion-Folgen setzen deshalb weder Theme noch Speicherwerte (jeder Speicherwert erzwingt ein
 * zweites Laden, danach gilt die Fläche als gezeigt). Dunkel ist ohnehin Standard.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const basisShell = process.argv[2] ?? 'http://127.0.0.1:4173'
const basisWechsel = process.argv[3] ?? 'http://127.0.0.1:4292'
const ziel = 'features/F44/nachweise/ws1b'

const BEOBACHTUNG_BASIS = {
  texte: [
    { name: 'Ansicht', selector: '[data-view]:not([hidden])', attribut: 'data-view' },
    { name: 'data-theme', selector: 'html', attribut: 'data-theme' },
    { name: 'lang', selector: 'html', attribut: 'lang' },
    { name: 'Persona-Status', selector: '#persona-text-status' },
    { name: 'Projekt', selector: '#kopf-projekt-auswahl option:checked' },
    { name: 'aktiv in der Nav', selector: '#shell-sidebar [aria-current="page"]' },
  ],
  ueberlauf: true,
}

/**
 * Folge über eine Route in einer Darstellung.
 * @param route - Hash ohne '#/'
 * @param datei - Screenshot-Dateiname
 * @param optionen - farbschema, breite, hoehe, zoom, sprache
 * @returns Klickfolge
 */
function ansicht(route, datei, { farbschema = 'dark', breite = 1440, hoehe = 1000, zoom = 1, sprache } = {}) {
  return {
    url: `${basisShell}/#/${route}`,
    viewport: { breite, hoehe },
    farbschema,
    zoom,
    screenshotQualitaet: 0.7,
    ...(sprache ? { localStorageSetzen: { 'leitstand-sprache': sprache } } : {}),
    beobachtete: {
      ...BEOBACHTUNG_BASIS,
      texte: [...BEOBACHTUNG_BASIS.texte, { name: 'Wortmarke', selector: '#shell-sidebar .brand' }, { name: 'Frag Jarvis', selector: '#chat-umschalter' }],
      getroffen: [
        { name: 'Projektauswahl klickbar', selector: '#kopf-projekt-auswahl' },
        { name: '„+“ klickbar', selector: '#kopf-neues-projekt' },
        { name: 'Persona klickbar', selector: '#persona-kopf-oeffner' },
        { name: 'Einstellungen (Sidebar) klickbar', selector: '#shell-sidebar a[data-nav-view="einstellungen"]' },
      ],
    },
    schritte: [{ label: `#/${route}`, screenshot: datei }],
  }
}

/**
 * Motion der Startfläche zu einem Zeitpunkt (oder statisch bei reduzierter Bewegung).
 * @param ms - Zeitpunkt oder null für „reduce“
 * @returns Klickfolge
 */
function startMotion(ms) {
  return {
    url: `${basisShell}/`,
    viewport: { breite: 1440, hoehe: 1000 },
    screenshotQualitaet: 0.8,
    ...(ms === null ? { reduzierteBewegung: true } : {}),
    beobachtete: {
      texte: [
        { name: 'Ansicht', selector: '[data-view]:not([hidden])', attribut: 'data-view' },
        { name: 'data-eingang', selector: 'html', attribut: 'data-eingang' },
        { name: 'Link', selector: '#start-betreten' },
        { name: 'Wartezeile', selector: '#start-warte-hinweis' },
        { name: 'Fokus', selector: ':focus' },
      ],
      getroffen: [{ name: 'Link klickbar', selector: '#start-betreten' }],
    },
    schritte: [{ label: ms === null ? '#/start (reduce)' : `#/start bei ${ms} ms`, ...(ms === null ? {} : { animationenBei: ms }), screenshot: ms === null ? 'start-reduce.webp' : `start-${String(ms).padStart(4, '0')}ms.webp` }],
  }
}

/**
 * Sidebar ans Ende gescrollt (Fokus auf „Workforce“) — Lage der Illustration und Lesbarkeit der
 * unteren Einträge (F-865), dunkel und hell.
 * @param breite - Viewportbreite
 * @param hoehe - Viewporthöhe
 * @param zoom - Browser-Zoom
 * @param datei - Screenshot-Dateiname (dunkel; hell mit Präfix l statt d)
 * @returns Klickfolge
 */
function sidebarGescrollt(breite, hoehe, zoom, datei) {
  return {
    url: `${basisShell}/#/dashboard`,
    viewport: { breite, hoehe },
    farbschema: 'dark',
    zoom,
    screenshotQualitaet: 0.8,
    beobachtete: {
      ...BEOBACHTUNG_BASIS,
      getroffen: [
        { name: 'Alle Produkte klickbar', selector: '#shell-sidebar a[data-nav-view="projekte-uebersicht"]' },
        { name: 'Einstellungen klickbar', selector: '#shell-sidebar a[data-nav-view="einstellungen"]' },
        { name: 'Workforce klickbar', selector: '#shell-sidebar a[data-nav-view="capabilities"]' },
      ],
    },
    schritte: [
      { label: 'Sidebar ans Ende gescrollt (dunkel)', fokus: '#shell-sidebar .secondary-workforce', screenshot: datei },
      { label: 'Theme hell (Kopf)', klick: '#kopf-theme', fokus: '#shell-sidebar .secondary-workforce', screenshot: datei.replace(/^d/, 'l') },
    ],
  }
}

const personaBeobachtung = {
  texte: [
    { name: 'Ansicht', selector: '[data-view]:not([hidden])', attribut: 'data-view' },
    { name: 'Klasse Portrait', selector: '#persona-platzhalter img', attribut: 'class' },
    { name: 'Zustand', selector: '#persona-platzhalter', attribut: 'data-persona-zustand' },
  ],
}

const folgen = {
  'dunkel-1440': ansicht('dashboard', 'd1440-dashboard.webp'),
  'hell-1440': ansicht('dashboard', 'l1440-dashboard.webp', { farbschema: 'light' }),
  'dunkel-390': ansicht('dashboard', 'd390-dashboard.webp', { breite: 390, hoehe: 844 }),
  'dunkel-1440-zoom200': ansicht('dashboard', 'd1440z2-dashboard.webp', { zoom: 2 }),
  'ru-1440': ansicht('dashboard', 'ru1440-dashboard.webp', { sprache: 'ru' }),
  'brain-1440': ansicht('brain', 'd1440-brain.webp'),
  'start-0000': startMotion(0),
  'start-0800': startMotion(800),
  'start-1600': startMotion(1600),
  'start-2400': startMotion(2400),
  'start-reduce': startMotion(null),
  'persona-motion': {
    url: `${basisShell}/#/dashboard`,
    viewport: { breite: 1440, hoehe: 1000 },
    farbschema: 'dark',
    screenshotQualitaet: 0.9,
    screenshotAusschnitt: { selector: '#shell-kopf .persona-kopf' },
    beobachtete: personaBeobachtung,
    schritte: [
      { label: 'Seitenwechsel → #/brain, 0 ms', navigiere: '#/brain', animationenBei: 0, screenshot: 'persona-0000ms.webp' },
      { label: 'Seitenwechsel → #/dashboard, 350 ms', navigiere: '#/dashboard', animationenBei: 350, screenshot: 'persona-0350ms.webp' },
      { label: 'Seitenwechsel → #/brain, 700 ms', navigiere: '#/brain', animationenBei: 700, screenshot: 'persona-0700ms.webp' },
    ],
  },
  'persona-reduce': {
    url: `${basisShell}/#/dashboard`,
    viewport: { breite: 1440, hoehe: 1000 },
    farbschema: 'dark',
    reduzierteBewegung: true,
    screenshotQualitaet: 0.9,
    screenshotAusschnitt: { selector: '#shell-kopf .persona-kopf' },
    beobachtete: personaBeobachtung,
    schritte: [{ label: 'Seitenwechsel → #/brain (reduce), 0 ms', navigiere: '#/brain', animationenBei: 0, screenshot: 'persona-reduce.webp' }],
  },
  // Checkliste „nichts fällt weg“ bei 1024 px (unter 1280 ist die Chatspalte umschaltbar).
  bedienung: {
    url: `${basisShell}/#/dashboard`,
    viewport: { breite: 1024, hoehe: 800 },
    farbschema: 'dark',
    localStorageSetzen: { 'leitstand-chat-offen': 'false' },
    screenshotQualitaet: 0.7,
    beobachtete: {
      texte: [
        ...BEOBACHTUNG_BASIS.texte,
        { name: 'Frag Jarvis gedrückt', selector: '#chat-umschalter', attribut: 'aria-pressed' },
        { name: 'data-eingang', selector: 'html', attribut: 'data-eingang' },
        { name: 'Fokus', selector: ':focus' },
        { name: 'Kopf-Sprache', selector: '#kopf-sprache', attribut: 'title' },
      ],
      sichtbarkeit: [
        { name: 'Chatspalte', id: 'shell-chat-spalte' },
        { name: 'Anlegeformular', id: 'projekte-anlegen-formular' },
      ],
    },
    schritte: [
      { label: 'Initial #/dashboard' },
      { label: 'Klick „+“ (F-862)', klick: '#kopf-neues-projekt', screenshot: 'bedienung-plus.webp' },
      { label: 'Klick „Frag Jarvis“ (auf)', klick: '#chat-umschalter' },
      { label: 'Klick „Frag Jarvis“ (zu)', klick: '#chat-umschalter' },
      { label: 'Route #/chat (Chat-Route)', navigiere: '#/chat' },
      { label: 'Sidebar „Ausführungen“', klick: '#shell-sidebar a[data-nav-view="runs"]' },
      { label: 'Sidebar „Auftrag & Start“', klick: '#shell-sidebar a[data-nav-view="projekt"]' },
      { label: 'Sidebar „Einstellungen“ (Bewegungsschalter dort)', klick: '#shell-sidebar a[data-nav-view="einstellungen"]' },
      { label: 'Profil → #/einstellungen (Fokus auf h1)', klick: '#shell-profil' },
      { label: 'Theme-Schalter Kopf → hell', klick: '#kopf-theme', screenshot: 'bedienung-hell.webp' },
      { label: 'Theme-Schalter Kopf → dunkel', klick: '#kopf-theme' },
      { label: 'Brain: „kommt“ per Enter (ohne Wirkung)', navigiere: '#/brain', fokus: '.kommt-knopf', taste: 'Enter' },
      { label: 'Klick Persona → Startfläche', klick: '#persona-kopf-oeffner' },
      { label: 'Tastatur Enter auf „Enter the Rabbit hole“', fokus: '#start-betreten', taste: 'Enter' },
      { label: 'Sprache per Pfeiltaste (noch kein Wechsel)', fokus: '#kopf-sprache', taste: 'ArrowDown' },
      { label: 'Feld verlassen (Tab) → English, lädt neu', taste: 'Tab', warteAufSelector: { selector: 'html[lang="en"] #persona-text-status', timeoutMs: 30000 } },
      { label: 'Sprache per Maus → Deutsch, lädt neu', auswaehlen: { selector: '#kopf-sprache', wert: 'de' }, warteAufSelector: { selector: 'html[lang="de"] #persona-text-status', timeoutMs: 30000 } },
    ],
  },
  'bedienung-390': {
    url: `${basisShell}/#/dashboard`,
    viewport: { breite: 390, hoehe: 844 },
    farbschema: 'dark',
    screenshotQualitaet: 0.7,
    beobachtete: {
      texte: [...BEOBACHTUNG_BASIS.texte, { name: 'Menü offen', selector: '#shell-menue-oeffner', attribut: 'aria-expanded' }],
      getroffen: [{ name: '„Ausführungen“ klickbar', selector: '#shell-sidebar a[data-nav-view="runs"]' }],
    },
    schritte: [
      { label: 'Initial (Menü zu)' },
      { label: 'Menü öffnen', klick: '#shell-menue-oeffner', screenshot: 'd390-menue.webp' },
      // „klickbar“ wird hier während der 0,2-s-Schließbewegung abgelesen; das Bild danach zeigt die Sidebar zu.
      { label: 'Klick „Ausführungen“ (Menü schließt)', klick: '#shell-sidebar a[data-nav-view="runs"]', screenshot: 'd390-runs-menue-zu.webp' },
    ],
  },
  // Korrekturrunde (design-guardian): Illustration und untere Einträge bei typischen Laptop-Höhen und
  // 200 % Zoom — der Fokus auf „Workforce“ scrollt die Sidebar ans Ende.
  'sidebar-1024x800': sidebarGescrollt(1024, 800, 1, 'd1024x800-sidebar.webp'),
  'sidebar-1366x768': sidebarGescrollt(1366, 768, 1, 'd1366x768-sidebar.webp'),
  'sidebar-1440-zoom200': sidebarGescrollt(1440, 1000, 2, 'd1440z2-sidebar.webp'),
  'hell-390': ansicht('dashboard', 'l390-dashboard.webp', { farbschema: 'light', breite: 390, hoehe: 844 }),
  seiten: {
    url: `${basisShell}/#/produktzyklus`,
    viewport: { breite: 1440, hoehe: 1000 },
    farbschema: 'dark',
    screenshotQualitaet: 0.7,
    beobachtete: { ...BEOBACHTUNG_BASIS, texte: [...BEOBACHTUNG_BASIS.texte, { name: 'Überschrift', selector: '[data-view]:not([hidden]) h1' }] },
    schritte: [
      { label: '#/produktzyklus', screenshot: 'd1440-produktzyklus.webp' },
      { label: '#/roadmap', navigiere: '#/roadmap', screenshot: 'd1440-roadmap.webp' },
      { label: '#/nutzung', navigiere: '#/nutzung', screenshot: 'd1440-nutzung.webp' },
    ],
  },
  // A9: Poll-Fehlerbanner — GET …/zustand scheitert mit einem Netzfehler (anfragenBlockieren).
  pollfehler: {
    url: `${basisShell}/#/dashboard`,
    viewport: { breite: 1440, hoehe: 1000 },
    farbschema: 'dark',
    anfragenBlockieren: ['**/api/zustand'],
    screenshotQualitaet: 0.7,
    beobachtete: { ...BEOBACHTUNG_BASIS, texte: [...BEOBACHTUNG_BASIS.texte, { name: 'Banner', selector: '#poll-fehler' }], sichtbarkeit: [{ name: 'Banner sichtbar', id: 'poll-fehler' }] },
    schritte: [{ label: '#/dashboard, Zustand nicht erreichbar', warteAufSelector: { selector: '#poll-fehler:not([hidden])', timeoutMs: 15000 }, screenshot: 'd1440-pollfehler.webp' }],
  },
  projektwechsel: {
    url: `${basisWechsel}/#/projekt`,
    viewport: { breite: 1440, hoehe: 1000 },
    farbschema: 'dark',
    screenshotQualitaet: 0.7,
    beobachtete: {
      texte: [
        ...BEOBACHTUNG_BASIS.texte,
        { name: 'Erste Auftragsoption', selector: '#start-auftrag option' },
        { name: 'Zuletzt geöffnet', selector: '#zuletzt-verlauf' },
      ],
      vorhanden: [
        { name: 'Auftrag B (641dd347)', selector: '#start-auftrag option[value="641dd347-d11d-4ce6-b3d9-d9f1ae13608e"]' },
        { name: 'Option projekt-b im Kopf', selector: '#kopf-projekt-auswahl option[value="projekt-b"]' },
      ],
      sichtbarkeit: [
        { name: 'Zuletzt geöffnet sichtbar', id: 'shell-zuletzt' },
        { name: 'Lauf-Detail offen', id: 'lauf-detail' },
      ],
    },
    schritte: [
      { label: '#/projekt, A aktiv', screenshot: 'wechsel-a.webp' },
      { label: 'Kopfauswahl → Projekt B', auswaehlen: { selector: '#kopf-projekt-auswahl', wert: 'projekt-b' }, warteAufSelector: { selector: '#start-auftrag option[value="641dd347-d11d-4ce6-b3d9-d9f1ae13608e"]', timeoutMs: 15000 }, screenshot: 'wechsel-b.webp' },
      { label: 'Neu laden (B bleibt, sessionStorage)', reload: true },
      { label: 'Kopfauswahl → A', auswaehlen: { selector: '#kopf-projekt-auswahl', wert: 'ai-workforce' } },
      // Tastatur-Bremse (auswahl-bremse.js): Pfeiltaste zeigt B im Feld, aktiv bleibt A (Aufträge von A).
      { label: 'Tastatur: Pfeiltaste im Feld (A bleibt aktiv)', fokus: '#kopf-projekt-auswahl', taste: 'ArrowDown' },
      { label: 'Tastatur: Escape (Anzeige zurück auf A)', taste: 'Escape' },
      { label: 'Tastatur: Pfeiltaste, dann Tab (Wechsel zu B)', taste: 'ArrowDown' },
      { label: '… Tab verlässt das Feld', taste: 'Tab', warteAufSelector: { selector: '#start-auftrag option[value="641dd347-d11d-4ce6-b3d9-d9f1ae13608e"]', timeoutMs: 15000 } },
      { label: 'Kopfauswahl → A (Maus)', auswaehlen: { selector: '#kopf-projekt-auswahl', wert: 'ai-workforce' } },
      { label: 'Aus #/runs/<id> nach B (Liste statt fremdem Detail)', navigiere: '#/runs/lauf-gibt-es-nicht' },
      { label: '… Kopfauswahl → B', auswaehlen: { selector: '#kopf-projekt-auswahl', wert: 'projekt-b' } },
      { label: '… Kopfauswahl → A', auswaehlen: { selector: '#kopf-projekt-auswahl', wert: 'ai-workforce' } },
      { label: 'Alle Produkte → „Öffnen“ B (merkt „Zuletzt geöffnet“)', navigiere: '#/projekte-uebersicht', warteAufSelector: { selector: '.projekt-waehlen[data-id="projekt-b"]', timeoutMs: 15000 } },
      { label: 'Klick „Öffnen“ B', klick: '.projekt-waehlen[data-id="projekt-b"]', screenshot: 'wechsel-zuletzt.webp' },
    ],
  },
}

const nur = process.argv[4]?.split(',') ?? null
for (const [ordner, folge] of Object.entries(folgen)) {
  if (nur !== null && !nur.includes(ordner)) continue
  const verzeichnis = join(ziel, ordner)
  mkdirSync(verzeichnis, { recursive: true })
  const pfad = join(verzeichnis, 'klickfolge.json')
  writeFileSync(pfad, `${JSON.stringify(folge, null, 2)}\n`, 'utf-8')
  console.log(`\n=== ${ordner} ===`)
  execFileSync(process.execPath, ['scripts/render-nachweis.mjs', pfad, verzeichnis], { stdio: 'inherit' })
}
