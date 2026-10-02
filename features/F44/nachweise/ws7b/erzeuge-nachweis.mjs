/**
 * Datei: features/F44/nachweise/ws7b/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweise F44 WS-7b „Scout“ (`#/capabilities`, Register Fähigkeiten › Rollen & Besetzung; Vorlage V10
 * d_faehigkeiten_scout und d_faehigkeiten; Abgleich F-725 J10) — nur diese Seite, alles mit festen Antworten:
 * - je Darstellung (1440 dunkel und hell, 390 dunkel, 1440 dunkel mit 200 % Zoom, 1440 ru) EINE Folge: Kopf mit
 *   „Fähigkeit entdecken“ (kommt) und gekürzten Kacheln; „Kandidaten suchen“ an der Lücke von qa (POST …/auftraege,
 *   POST …/laeufe und GET …/laeufe/<id> fest beantwortet) → „läuft“ mit gesperrten übrigen Knöpfen; Ergebnis als
 *   Karten (Kollision, ungültige Quelle, leere Risiken, ohne Lizenz); „Vormerken“ (POST …/auftraege und
 *   …/route fest) → vorgemerkt mit Link zum Ablauf;
 * - Zustände (1440 dunkel): leeres Ergebnis; Lauf scheitert (VERWEIGERT) als Fehlernotiz; Start scheitert (409);
 *   Projektwechsel mitten im Lauf setzt das Panel zurück und gibt die Knöpfe frei (F-955);
 * - Vormerken (1440 dunkel): Routen scheitert → Fehler mit „Erneut versuchen“ → derselbe Auftrag wird geroutet;
 * - lange Namen bei 390 px: Kachel-Detail mit Volltext; Kandidat mit langem Namen, langer Empfehlung und langer Quelle.
 * Kein echter Lauf: Jeder POST ist fest beantwortet (render-nachweis „methode“); fehlt eine Route, scheitert der
 * Schritt sichtbar, statt den Server zu erreichen — deshalb steht die feste POST-Antwort in jeder Folge ganz oben.
 * Baut je Folge eine klickfolge.json in einem Unterordner und ruft scripts/render-nachweis.mjs auf; Screenshots als
 * WebP. Vor dem Lauf leert das Skript die Ausgabeordner GENAU der Folgen, die es neu erzeugt (fs.rmSync).
 *
 * Wird aufgerufen von: Hand, gegen einen laufenden Leitstand dieses Worktrees —
 *   LEITSTAND_PORT=4199 node scripts/leitstand-server.mjs
 *   node features/F44/nachweise/ws7b/erzeuge-nachweis.mjs [basis] [nurOrdner]
 * Nicht Teil von `npm run check`.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const basis = process.argv[2] ?? 'http://127.0.0.1:4199'
const nur = process.argv[3]
/** Ausgabe neben diesem Skript, Repo-Wurzel vier Ebenen darüber — unabhängig vom Aufrufverzeichnis. */
const ziel = dirname(fileURLToPath(import.meta.url))
const wurzel = resolve(ziel, '../../../..')

const CHAT_ZU = { 'leitstand-chat-offen': 'false' }

const BEOBACHTUNG = {
  texte: [
    { name: 'Ansicht', selector: '[data-view]:not([hidden])', attribut: 'data-view' },
    { name: 'data-theme', selector: 'html', attribut: 'data-theme' },
    { name: 'lang', selector: 'html', attribut: 'lang' },
    { name: 'Unterreiter', selector: '#faehigkeiten-register [aria-selected="true"]' },
    { name: 'Entdecken aria-disabled', selector: '#werkstatt-entdecken', attribut: 'aria-disabled' },
    { name: 'Scout-Panel', selector: '#capabilities-scout' },
  ],
  vorhanden: [
    { name: 'Knopf qa gesperrt', selector: '.werkstatt-rolle[data-rolle="qa"] .capabilities-scout-link[disabled]' },
    { name: 'Knopf architekt gesperrt', selector: '.werkstatt-rolle[data-rolle="architekt"] .capabilities-scout-link[disabled]' },
    { name: 'Knopf architekt frei', selector: '.werkstatt-rolle[data-rolle="architekt"] .capabilities-scout-link:not([disabled])' },
    { name: 'Karten', selector: '.scout-karte' },
    { name: 'Kollisionshinweis', selector: '.scout-kollision' },
    { name: 'ungültige Quelle unverlinkt', selector: '.scout-quelle-text' },
    { name: 'javascript:-Link (muss fehlen)', selector: '#capabilities-scout a[href^="javascript"]' },
    { name: 'Link ohne noopener (muss fehlen)', selector: '#capabilities-scout a[target="_blank"]:not([rel="noopener noreferrer"])' },
    { name: 'vorgemerkt mit Ablauf-Link', selector: '.scout-vormerken-zelle a[href^="#/workflows/"]' },
    { name: 'Fehlernotiz', selector: '#capabilities-scout .note.red' },
  ],
  ueberlauf: true,
}

/** Feste Abdeckung: zwei echte Lücken (qa, architekt), damit die Sperre der übrigen Knöpfe sichtbar wird. */
const ABDECKUNG = {
  startvorlagePfad: 'startvorlagen/beispielprojekt.json',
  rollen: [
    {
      rolle: 'qa',
      benoetigteCapabilities: ['ACCEPTANCE_TEST', 'BROWSER_TEST'],
      workerAbdeckung: [
        { worker: 'claude-code', fehlend: [], f346Ausnahme: false, restFehlend: [] },
        { worker: 'codex', fehlend: ['BROWSER_TEST'], f346Ausnahme: false, restFehlend: ['BROWSER_TEST'] },
      ],
      gedeckt: false,
    },
    { rolle: 'architekt', benoetigteCapabilities: ['DESIGN_REVIEW'], workerAbdeckung: [{ worker: 'codex', fehlend: ['DESIGN_REVIEW'], f346Ausnahme: false, restFehlend: ['DESIGN_REVIEW'] }], gedeckt: false },
  ],
}

const kandidat = (name, typ, fit, aufwand, lizenz, risiken, empfehlung, quelle, unsicherheiten = []) => ({
  name,
  typ,
  quelle_url: quelle,
  capabilities: ['BROWSER_TEST'],
  fit,
  integrationsaufwand: aufwand,
  rechte: 'Browser starten, Seiten lesen',
  lizenz,
  risiken,
  empfehlung,
  unsicherheiten,
})

/** Kandidaten: „Playwright MCP“ kollidiert mit der echten ID playwright-mcp; „Web Checker“ trägt eine ungültige Quelle. */
const KANDIDATEN = [
  kandidat('Playwright MCP', 'extern', 'hoch', 'gering', 'Apache-2.0', ['Startet einen echten Browser', 'Netzzugriff'], 'Deckt Bedienung und Darstellung im Browser ab; bereits im Katalog bekannt.', 'https://github.com/microsoft/playwright-mcp'),
  kandidat('Web Checker', 'skill', 'mittel', 'mittel', null, [], 'Leichter Skill für Seitenprüfungen ohne eigenen Browser.', 'javascript:alert(1)'),
  kandidat('Browser Use', 'extern', 'niedrig', 'hoch', 'MIT', ['Steuert den Browser frei', 'Kosten je Aufruf'], 'Mächtig, aber für reine Prüfungen überdimensioniert.', 'https://github.com/browser-use/browser-use', ['Kostenmodell nicht verifiziert']),
]

const LANG = kandidat(
  'Barrierefreiheits-Prüfwerkzeug-für-Formularvalidierung-und-Fehlermeldungsverständlichkeit',
  'skill',
  'hoch',
  'gering',
  'Creative-Commons-Namensnennung-Weitergabe-unter-gleichen-Bedingungen-4.0-International',
  ['Ein sehr langer Risikotext ohne Leerstellen: https://example.org/ein/sehr/langer/pfad/der/nicht/umbricht/und/trotzdem/nicht/ueberlaufen/darf'],
  'Prüft Formulare, Fehlermeldungen und Tastaturbedienung gegen WCAG-Kriterien – mit ausführlicher Begründung je Befund, Quellenangabe und einem Vorschlag zur Behebung.',
  'https://example.org/barrierefreiheit/pruefwerkzeug/formularvalidierung/fehlermeldungsverstaendlichkeit/version/2026/10/README.md'
)

const ergebnis = (kandidaten) => ({ laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' }, scoutErgebnis: { status: 'ok', ergebnis: { gesuchte_capability: 'BROWSER_TEST', kandidaten } } })
const LAEUFT = { laufStatus: { status: 'LAEUFT' } }

/** Feste POSTs: kein Klick erreicht den Server. */
const POSTS = [
  { muster: '**/auftraege', methode: 'POST', status: 201, json: { auftragId: 'auftrag-nachweis' } },
  { muster: '**/laeufe', methode: 'POST', status: 202, json: {} },
  { muster: '**/auftraege/*/routen', methode: 'POST', status: 202, json: {} },
]
const detail = (json) => ({ muster: '**/laeufe/scout-*', json })

/**
 * Eine Folge. Seitenbilder als Ausschnitt der Ansicht ab 1280 CSS-px, sonst Vollseite (bei 200 % Viewport).
 * @param optionen - schritte, antworten, farbschema, breite, hoehe, zoom, sprache, vollseite, katalog
 * @returns Klickfolge
 */
function folge({ schritte, antworten = [], farbschema = 'dark', breite = 1440, hoehe = 1000, zoom = 1, sprache, vollseite = true }) {
  const breit = breite / zoom >= 1280
  return {
    url: `${basis}/#/capabilities`,
    viewport: { breite, hoehe },
    farbschema,
    zoom,
    screenshotQualitaet: 0.7,
    ...(breit ? { screenshotVollseite: vollseite, screenshotAusschnitt: { selector: '#view-capabilities' } } : { screenshotVollseite: vollseite }),
    localStorageSetzen: { ...CHAT_ZU, ...(sprache ? { 'leitstand-sprache': sprache } : {}) },
    anfragenAntworten: [...POSTS, { muster: '**/ressourcen/abdeckung', json: ABDECKUNG }, detail(LAEUFT), ...antworten],
    beobachtete: BEOBACHTUNG,
    schritte,
  }
}

const warte = (selector, timeoutMs = 15000, zustandWert) => ({ warteAufSelector: { selector, timeoutMs, ...(zustandWert ? { zustand: zustandWert } : {}) } })
const KLICK_QA = '.werkstatt-rolle[data-rolle="qa"] .capabilities-scout-link'

const DARSTELLUNGEN = {
  'dunkel-1440': { praefix: 'd1440' },
  'hell-1440': { praefix: 'l1440', farbschema: 'light' },
  'dunkel-390': { praefix: 'd390', breite: 390, hoehe: 844 },
  // 200 %: Viewport-Bilder (die Vollseite mit allen Kacheln überschreitet die Canvas-Grenze der WebP-Umkodierung).
  'dunkel-1440-zoom200': { praefix: 'd1440z2', zoom: 2, vollseite: false },
  'ru-1440': { praefix: 'ru1440', sprache: 'ru' },
}

const folgen = {}

for (const [name, { praefix, ...darstellung }] of Object.entries(DARSTELLUNGEN)) {
  folgen[`matrix-${name}`] = folge({
    schritte: [
      { label: 'Kopf mit „Neu laden“ und „Fähigkeit entdecken“ (kommt); Kacheln mit höchstens drei Zeilen Beschreibung', ...warte('#capabilities-library .werkzeug-karte'), screenshot: `${praefix}-1-kopf-kacheln.webp` },
      { label: 'Rollen & Besetzung: zwei Lücken, beide „Kandidaten suchen“ frei', klick: '#faehigkeiten-reiter-rollen', ...warte(KLICK_QA) },
      { label: '„Kandidaten suchen“ bei qa (fest beantwortet): läuft, übrige Knöpfe gesperrt', klick: KLICK_QA, ...warte('#capabilities-scout .scout-status'), screenshot: `${praefix}-2-laeuft-gesperrt.webp` },
      { label: 'Lauf fertig (feste Detail-Antwort): Karten mit Kollision, ungültiger Quelle, leeren Risiken, ohne Lizenz; Fokus auf „Vormerken“ scrollt die Karten ins Bild', anfragenAntworten: [detail(ergebnis(KANDIDATEN))], ...warte('.scout-karte'), fokus: '.scout-karte:nth-child(2) .scout-vormerken', screenshot: `${praefix}-3-ergebnis.webp` },
      { label: '„Vormerken“ bei Browser Use (fest beantwortet): vorgemerkt mit Link zum Ablauf', klick: '.scout-karte:nth-child(3) .scout-vormerken', ...warte('.scout-vormerken-zelle a[href^="#/workflows/"]'), screenshot: `${praefix}-4-vorgemerkt.webp` },
    ],
    ...darstellung,
  })
}

/** Zweites Projekt nur für den Projektwechsel (das laufende Register kennt nur ai-workforce). */
const PROJEKTE = {
  projekte: [
    { id: 'ai-workforce', name: 'AI Workforce', repo_pfad: '.', status: 'IN_ENTWICKLUNG', laufAktiv: false },
    { id: 'zweites-projekt', name: 'Zweites Projekt', repo_pfad: '../zweites-projekt', status: 'DISCOVERY', laufAktiv: false },
  ],
}

folgen.zustaende = folge({
  antworten: [
    { muster: '**/api/projekte', methode: 'GET', json: PROJEKTE },
    { muster: '**/projekte/zweites-projekt/ressourcen', json: { startvorlagePfad: 'startvorlage.json', assessedHinweis: 'ASSESSED: fest (Nachweis).', eintraege: [] } },
    { muster: '**/projekte/zweites-projekt/zustand', json: { laeufe: [], startfehler: [], workflows: [], fehler: [], aktiverLauf: { aktiv: false, laufId: null } } },
  ],
  schritte: [
    { label: 'Rollen & Besetzung', klick: '#faehigkeiten-reiter-rollen', ...warte(KLICK_QA) },
    { label: 'Leeres Ergebnis: „Keine Kandidaten gefunden.“', anfragenAntworten: [detail(ergebnis([]))], klick: KLICK_QA, ...warte('.scout-ergebnis .leer'), screenshot: 'd1440-z1-leer.webp' },
    {
      label: 'Neue Suche, Lauf endet VERWEIGERT: Fehlernotiz, Knöpfe wieder frei',
      anfragenAntworten: [detail({ laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'VERWEIGERT' } })],
      klick: KLICK_QA,
      ...warte('#capabilities-scout .note.red'),
      screenshot: 'd1440-z2-lauf-fehler.webp',
    },
    {
      label: 'Start scheitert (409, ein anderer Lauf ist aktiv): Fehlernotiz mit Servergrund roh',
      anfragenAntworten: [{ muster: '**/laeufe', methode: 'POST', status: 409, json: { grund: 'Ein anderer Lauf ist aktiv (D13).' } }],
      klick: KLICK_QA,
      ...warte('#capabilities-scout .note.red'),
      screenshot: 'd1440-z3-start-fehler.webp',
    },
    { label: 'Neue Suche läuft (Start wieder fest 202)', anfragenAntworten: [{ muster: '**/laeufe', methode: 'POST', status: 202, json: {} }, detail(LAEUFT)], klick: KLICK_QA, ...warte('#capabilities-scout .scout-status:not(.red)') },
    { label: 'F-955: Projektwechsel mitten im Lauf (Kopfauswahl) — Panel leer, Knöpfe frei', auswaehlen: { selector: '#kopf-projekt-auswahl', wert: 'zweites-projekt' }, ...warte(KLICK_QA + ':not([disabled])'), screenshot: 'd1440-z4-projektwechsel.webp' },
  ],
})

folgen['lang-390'] = folge({
  breite: 390,
  hoehe: 844,
  schritte: [
    { label: 'Werkzeuge: Kachel-Beschreibung auf drei Zeilen, Detail der ersten Kachel offen mit Volltext', ...warte('#capabilities-library .werkzeug-karte'), klick: '#capabilities-library .werkzeug-detail > summary', screenshot: 'd390-kachel-detail-volltext.webp' },
    { label: 'Rollen & Besetzung', klick: '#faehigkeiten-reiter-rollen', ...warte(KLICK_QA) },
    { label: 'Ergebnis mit langem Namen, langer Lizenz, langer Quelle und langem Risiko bei 390 px: kein waagerechter Scroll', anfragenAntworten: [detail(ergebnis([LANG, ...KANDIDATEN]))], klick: KLICK_QA, ...warte('.scout-karte'), screenshot: 'd390-lang-ergebnis.webp' },
  ],
})

folgen['vormerken-fehler'] = folge({
  schritte: [
    { label: 'Rollen & Besetzung', klick: '#faehigkeiten-reiter-rollen', ...warte(KLICK_QA) },
    { label: 'Suche mit Ergebnis', anfragenAntworten: [detail(ergebnis(KANDIDATEN))], klick: KLICK_QA, ...warte('.scout-karte') },
    {
      label: '„Vormerken“ — Routen scheitert (500): Fehler mit „Erneut versuchen“ in der Karte',
      anfragenAntworten: [{ muster: '**/auftraege/*/routen', methode: 'POST', status: 500, json: { grund: 'Router nicht erreichbar' } }],
      klick: '.scout-karte:nth-child(3) .scout-vormerken',
      ...warte('.scout-karte:nth-child(3) .scout-vormerken-zelle .fehler'),
      screenshot: 'd1440-v1-routen-fehler.webp',
    },
    {
      label: '„Erneut versuchen“ (Routen wieder 202): derselbe Auftrag wird geroutet, vorgemerkt mit Link',
      anfragenAntworten: [{ muster: '**/auftraege/*/routen', methode: 'POST', status: 202, json: {} }],
      klick: '.scout-karte:nth-child(3) .scout-vormerken',
      ...warte('.scout-vormerken-zelle a[href^="#/workflows/"]'),
      screenshot: 'd1440-v2-erneut-vorgemerkt.webp',
    },
  ],
})

const auszufuehren = nur ? { [nur]: folgen[nur] } : folgen
if (nur && !folgen[nur]) throw new Error(`Unbekannte Folge: ${nur}`)

for (const [ordner, klickfolge] of Object.entries(auszufuehren)) {
  const verzeichnis = join(ziel, ordner)
  rmSync(verzeichnis, { recursive: true, force: true })
  mkdirSync(verzeichnis, { recursive: true })
  const datei = join(verzeichnis, 'klickfolge.json')
  writeFileSync(datei, `${JSON.stringify(klickfolge, null, 2)}\n`)
  console.log(`\n── ${ordner} ──`)
  execFileSync(process.execPath, [join(wurzel, 'scripts/render-nachweis.mjs'), datei, verzeichnis], { stdio: 'inherit', cwd: wurzel })
}
