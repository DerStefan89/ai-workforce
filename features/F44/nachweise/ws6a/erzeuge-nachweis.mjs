/**
 * Datei: features/F44/nachweise/ws6a/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweise F44 WS-6a „Alle Produkte“ (`#/projekte-uebersicht` und
 * `#/projekte-uebersicht/neu`, Vorlage V10 d_projekte und d_projekt_neu, Abgleich F-725 H1–H7) — nur
 * die geänderte Seite, mit festen Antworten (nie im Produkt). Drei Produkte: „AI Workforce“ (aktiv,
 * Roadmap 2/5, zwei Entscheidungen, Vorschau auf dem Leitstand-Port gesperrt, F-849), „Haushaltsbuch“
 * (Lauf aktiv, keine Roadmap, Vorschau erreichbar, Aufruf konfiguriert) und ein Produkt mit langem
 * Namen und langem Pfad, dessen Roadmap und Workitems scheitern („—“ mit Grund; F-857).
 * - je Darstellung (1440 dunkel und hell, 390 dunkel und hell, 1440 dunkel mit 200 % Zoom, 1440 ru)
 *   EINE Folge: Liste mit Zählern; Technik-Klappe der langen Karte offen; „+ Neues Produkt“ → leere
 *   Unterseite; Name getippt, „Projektordner · optional“ offen mit abgeleiteter ID; „Produkt anlegen“
 *   → 201 → „Nächste Schritte“;
 * - reduzierte Bewegung (1440 dunkel): Liste und Unterseite;
 * - Zustände (1440 dunkel): Technik-Klappen gesperrt (kein Öffnen-Link) und erreichbar (Öffnen-Link);
 *   kyrillischer Name → leere ID, Klappe offen, Fehler, kein POST; 409 mit grund roh; „+“ im Kopf
 *   führt auf die Unterseite (Navigation „Alle Produkte“ markiert); „Schließen“ zurück zur Liste;
 *   leere Liste; GET /api/projekte scheitert.
 * Baut je Folge eine klickfolge.json in einem Unterordner und ruft scripts/render-nachweis.mjs auf;
 * Screenshots als WebP. Vor dem Lauf leert das Skript die Ausgabeordner GENAU der Folgen, die es neu
 * erzeugt (fs.rmSync, recursive, force) — fremde Ordner und das Skript selbst bleiben unberührt.
 *
 * Wird aufgerufen von: Hand, gegen einen laufenden Leitstand dieses Worktrees —
 *   LEITSTAND_PORT=4199 node scripts/leitstand-server.mjs
 *   node features/F44/nachweise/ws6a/erzeuge-nachweis.mjs [basis] [nurOrdner]
 *   basis:     Standard http://127.0.0.1:4199
 *   nurOrdner: optional, nur diese Folge (Name des Unterordners)
 * Nicht Teil von `npm run check`.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const basis = process.argv[2] ?? 'http://127.0.0.1:4199'
const nur = process.argv[3]
const ziel = 'features/F44/nachweise/ws6a'

/** Chatspalte eingeklappt (Vorlage: Chat als Dock, WS-8) — ab 1280 px bleibt sie trotzdem sichtbar. */
const CHAT_ZU = { 'leitstand-chat-offen': 'false' }

const BEOBACHTUNG = {
  texte: [
    { name: 'Ansicht', selector: '[data-view]:not([hidden])', attribut: 'data-view' },
    { name: 'Nav markiert', selector: '[data-nav-view][aria-current="page"]', attribut: 'data-nav-view' },
    { name: 'data-theme', selector: 'html', attribut: 'data-theme' },
    { name: 'lang', selector: 'html', attribut: 'lang' },
    { name: 'Fokus-ID', selector: ':focus', attribut: 'id' },
    { name: 'Intro', selector: '#projekte-uebersicht-intro' },
    { name: 'Chip AI Workforce', selector: '[data-produkt-id="ai-workforce"] [data-teil="lage"]' },
    { name: 'Chip Haushaltsbuch', selector: '[data-produkt-id="haushaltsbuch"] [data-teil="lage"]' },
    { name: 'Entscheidungen lang (title)', selector: '[data-produkt-id="rezeptbuch-familie"] [data-teil="entscheidungen"] [title]', attribut: 'title' },
    { name: 'Fehler Anlegen', selector: '#projekte-anlegen-fehler' },
  ],
  sichtbarkeit: [
    { name: 'Liste', id: 'projekte-uebersicht-seite' },
    { name: 'Unterseite Neues Produkt', id: 'projekte-anlegen-seite' },
    { name: 'Formular', id: 'projekte-anlegen-formular' },
    { name: 'Nächste Schritte', id: 'projekte-anlegen-erfolg' },
    { name: 'Fehler Anlegen', id: 'projekte-anlegen-fehler' },
  ],
  vorhanden: [
    { name: 'Aktive Karte markiert', selector: '.produkt-karte.aktiv[data-produkt-id="ai-workforce"]' },
    { name: 'Öffnen-Link gesperrte Karte (muss fehlen)', selector: '[data-produkt-id="ai-workforce"] a[target="_blank"]' },
    { name: 'Öffnen-Link Haushaltsbuch', selector: '[data-produkt-id="haushaltsbuch"] .projekt-aufruf a[target="_blank"]' },
    { name: '„Produkt bearbeiten“ kommt', selector: '.projekt-technik .kommt-knopf[aria-disabled="true"]' },
    { name: 'Ziel kommt (aria-disabled)', selector: '#projekte-anlegen-ziel[aria-disabled="true"][readonly]' },
    { name: 'Projektordner offen', selector: '#projekte-anlegen-zielordner-details[open]' },
    { name: 'Technik-Klappe offen', selector: '.projekt-technik[open]' },
    { name: 'zweite Live-Region (muss fehlen)', selector: '#view-projekte-uebersicht [aria-live]' },
  ],
  ueberlauf: true,
}

const PROJEKTE = [
  { id: 'ai-workforce', name: 'AI Workforce', repo_pfad: '.', startvorlage_pfad: 'startvorlagen/ai-workforce.json', profil_pfad: 'profiles/ai-workforce.json', basisverzeichnis: 'kontrollzustand', status: 'IN_ENTWICKLUNG', laufAktiv: false },
  { id: 'haushaltsbuch', name: 'Haushaltsbuch', repo_pfad: '../haushaltsbuch', startvorlage_pfad: 'startvorlage.json', profil_pfad: 'profil.json', basisverzeichnis: 'kontrollzustand', status: 'IDEE', laufAktiv: true },
  {
    id: 'rezeptbuch-familie',
    name: 'Familien-Rezeptbuch mit Wochenplanung, Einkaufsliste und Vorratskammer',
    repo_pfad: 'C:/Users/beispiel/Projekte/sehr/tief/verschachtelte/ordnerstruktur/familien-rezeptbuch-mit-wochenplanung-und-einkaufsliste',
    startvorlage_pfad: 'startvorlage.json',
    profil_pfad: 'profil.json',
    basisverzeichnis: 'kontrollzustand',
    status: 'DISCOVERY',
    laufAktiv: false,
  },
]

const feature = (id, status) => ({ id, titel: `Titel ${id}`, status })
const ROADMAP_AIW = {
  status: 'ok',
  vision: 'Arbeit vom klaren Auftrag bis zum abgenommenen Ergebnis verlässlich steuern.',
  meilensteine: [
    { id: 'M1', titel: 'Fassung 1', status: 'LAEUFT', features: [feature('F41', 'ABGESCHLOSSEN'), feature('F43', 'ABGESCHLOSSEN'), feature('F44', 'IN_ARBEIT')] },
    { id: 'M2', titel: 'Fassung 2', status: 'GEPLANT', features: [feature('F45', 'ENTWURF'), feature('F46', 'keine_akte')] },
  ],
}

/** Zustands-Aggregat. */
const zustand = (felder = {}) => ({ laeufe: [], startfehler: [], workflows: [], fehler: [], aktiverLauf: { aktiv: false, laufId: null }, pruefbefehl: null, istAiWorkforce: true, ...felder })
const WF_FREIGABE = { workflowId: 'router-a1', auftragId: 'a1', ziel: 'Login-Seite reparieren', versionSequenz: 1, status: 'WARTET_FREIGABE', aktiverSchrittId: 's1', grund: null, schritteAnzahl: 2, naechster: { art: 'haltFreigabe', grund: 'Schritt s1 verlangt eine Freigabe', schrittId: 's1' } }

const aufruf = (vorschau, felder = {}) => ({ vorschau, startbefehl: null, ergebnis_datei: null, startvorlage: 'startvorlage.json', aktiv: false, letzterAufruf: null, ...felder })

/** Feste Antworten aller Folgen; spätere Einträge (auch je Schritt) haben Vorrang. */
const ANTWORTEN = [
  { muster: '**/api/zustand', json: zustand() },
  { muster: '**/api/projekte', methode: 'GET', json: { projekte: PROJEKTE } },
  { muster: '**/api/projekte/ai-workforce/roadmap', json: ROADMAP_AIW },
  { muster: '**/api/projekte/ai-workforce/zustand', json: zustand({ workflows: [WF_FREIGABE] }) },
  { muster: '**/api/projekte/ai-workforce/workitems?status=OFFEN', json: { workitems: [{ id: 'F-900', titel: 'Kritischer Befund', prioritaet: 'P0', status: 'OFFEN', quelle: 'finding' }], befunde: [], fehler: [] } },
  {
    muster: '**/api/projekte/ai-workforce/projekt-aufruf',
    methode: 'GET',
    json: aufruf({ url: 'http://127.0.0.1:4199', erreichbar: null, grund: 'nicht zulässig (Leitstand-Port)' }, { startvorlage: 'startvorlagen/ai-workforce.json' }),
  },
  { muster: '**/api/projekte/haushaltsbuch/roadmap', json: { status: 'nicht_vorhanden' } },
  { muster: '**/api/projekte/haushaltsbuch/zustand', json: zustand() },
  { muster: '**/api/projekte/haushaltsbuch/workitems?status=OFFEN', json: { workitems: [], befunde: [], fehler: [] } },
  {
    muster: '**/api/projekte/haushaltsbuch/projekt-aufruf',
    methode: 'GET',
    json: aufruf(
      { url: 'http://127.0.0.1:3000', erreichbar: true, grund: 'HTTP 200' },
      {
        startbefehl: ['C:/Programme/nodejs/node.exe', 'scripts/start.mjs'],
        letzterAufruf: { ausgang: 'GRUEN', exit_code: 0, dauer_ms: 812, zeitgrenze_ms: 30000, stdout_ende: 'Server bereit auf Port 3000', stderr_ende: '', ergebnis_datei: null },
      }
    ),
  },
  { muster: '**/api/projekte/rezeptbuch-familie/roadmap', status: 500, json: { grund: 'roadmap.json nicht lesbar: EACCES' } },
  { muster: '**/api/projekte/rezeptbuch-familie/zustand', json: zustand() },
  { muster: '**/api/projekte/rezeptbuch-familie/workitems?status=OFFEN', status: 500, json: { grund: 'state/findings.md: Parserfehler in Zeile 12' } },
  { muster: '**/api/projekte/rezeptbuch-familie/projekt-aufruf', methode: 'GET', json: aufruf({ url: null, erreichbar: null, grund: 'nicht gesetzt' }) },
]

/** 201 auf POST /api/projekte. */
const anlegen201 = (id, name) => ({
  muster: '**/api/projekte',
  methode: 'POST',
  status: 201,
  json: {
    projekt: { id, name },
    naechste_schritte: {
      git: [`cd ../${id}`, 'git init', 'git add -A', 'git commit -m "Projektgrundlage aus der Harness-Baseline"'],
      hinweis: 'Der Kern führt kein Git aus — die Befehle oben im neuen Projektordner ausführen.',
      trust: { status: 'fehlt', pfad: `../${id}`, hinweis: `Workspace-Trust für ../${id} fehlt noch — beim ersten Öffnen in Claude Code bestätigen.` },
    },
  },
})

/**
 * Eine Folge. Seitenbilder als Ausschnitt #view-projekte-uebersicht ab 1280 CSS-px, sonst Vollseite.
 * @param optionen - hash, schritte, antworten, farbschema, breite, hoehe, zoom, sprache
 * @returns Klickfolge
 */
function folge({ hash = '#/projekte-uebersicht', schritte, antworten = [], farbschema = 'dark', breite = 1440, hoehe = 1000, zoom = 1, sprache, reduzierteBewegung = false }) {
  const breit = breite / zoom >= 1280
  return {
    url: `${basis}/${hash}`,
    viewport: { breite, hoehe },
    farbschema,
    zoom,
    ...(reduzierteBewegung ? { reduzierteBewegung: true } : {}),
    screenshotQualitaet: 0.7,
    ...(breit ? { screenshotVollseite: true, screenshotAusschnitt: { selector: '#view-projekte-uebersicht' } } : { screenshotVollseite: true }),
    localStorageSetzen: { ...CHAT_ZU, ...(sprache ? { 'leitstand-sprache': sprache } : {}) },
    anfragenAntworten: [...ANTWORTEN, ...antworten],
    beobachtete: BEOBACHTUNG,
    schritte,
  }
}

const warte = (selector, timeoutMs = 15000, zustandWert) => ({ warteAufSelector: { selector, timeoutMs, ...(zustandWert ? { zustand: zustandWert } : {}) } })
/** Alle Zähler geladen: Ring der aktiven Karte (2/5 → 40), „—“ der langen Karte, Aufruf-Bereich mit Knopf. */
const ZAEHLER_GELADEN = [
  { label: 'Ring AI Workforce 2/5 geladen', ...warte('[data-produkt-id="ai-workforce"] .bubble-fill[stroke-dasharray="40 100"]', 15000, 'attached') },
  { label: 'Entscheidungen der langen Karte gescheitert („—“ mit Grund)', ...warte('[data-produkt-id="rezeptbuch-familie"] [data-teil="entscheidungen"] [title]', 15000, 'attached') },
  { label: 'Aufruf-Bereich Haushaltsbuch geladen', ...warte('[data-produkt-id="haushaltsbuch"] .projekt-aufrufen', 15000, 'attached') },
]

const DARSTELLUNGEN = {
  'dunkel-1440': { praefix: 'd1440' },
  'hell-1440': { praefix: 'l1440', farbschema: 'light' },
  'dunkel-390': { praefix: 'd390', breite: 390, hoehe: 844 },
  'hell-390': { praefix: 'l390', breite: 390, hoehe: 844, farbschema: 'light' },
  'dunkel-1440-zoom200': { praefix: 'd1440z2', zoom: 2 },
  'ru-1440': { praefix: 'ru1440', sprache: 'ru' },
}

const folgen = {}

for (const [name, { praefix, ...darstellung }] of Object.entries(DARSTELLUNGEN)) {
  folgen[`matrix-${name}`] = folge({
    schritte: [
      ...ZAEHLER_GELADEN.slice(0, -1),
      { ...ZAEHLER_GELADEN.at(-1), label: 'Liste: Kopf, Zeile „3 Produkte · Ausführung aktiv · …“, drei Karten (Entscheidung / Läuft / Bereit mit „—“)', screenshot: `${praefix}-1-liste.webp` },
      {
        label: 'Technik-Klappe der langen Karte offen: ID, voller Pfad umbrechend (F-857), Status roh, „Produkt bearbeiten“ kommt, Vorschau nicht gesetzt',
        klick: '[data-produkt-id="rezeptbuch-familie"] .projekt-technik > summary',
        ...warte('[data-produkt-id="rezeptbuch-familie"] .projekt-technik[open]'),
        screenshot: `${praefix}-2-technik-offen.webp`,
      },
      { label: '„+ Neues Produkt“ → #/projekte-uebersicht/neu, leer, Fokus im Namen', klick: '#projekte-anlegen-oeffnen', ...warte('#projekte-anlegen-seite:not([hidden])'), screenshot: `${praefix}-3-neu-leer.webp` },
      { label: 'Name tippen (ID wird abgeleitet)', tippen: { selector: '#projekte-anlegen-name', text: 'Größe & Übersicht' } },
      { label: '„Projektordner · optional“ öffnen: ID groesse-uebersicht', klick: '#projekte-anlegen-zielordner-details > summary', ...warte('#projekte-anlegen-zielordner-details[open]'), screenshot: `${praefix}-4-neu-ausgefuellt.webp` },
      {
        label: '„Produkt anlegen“ → 201: „Nächste Schritte“ auf der Unterseite, Fokus auf der Überschrift',
        anfragenAntworten: [anlegen201('groesse-uebersicht', 'Größe & Übersicht')],
        klick: '#projekte-anlegen-absenden',
        ...warte('#projekte-anlegen-erfolg:not([hidden])'),
        screenshot: `${praefix}-5-erfolg.webp`,
      },
    ],
    ...darstellung,
  })
}

folgen['bewegung-reduziert'] = folge({
  reduzierteBewegung: true,
  schritte: [
    ...ZAEHLER_GELADEN.slice(0, -1),
    { ...ZAEHLER_GELADEN.at(-1), label: 'Reduzierte Bewegung: Liste (die Seite hat keine eigene Animation)', screenshot: 'd1440-rm-1-liste.webp' },
    { label: 'Reduzierte Bewegung: Unterseite', klick: '#projekte-anlegen-oeffnen', ...warte('#projekte-anlegen-seite:not([hidden])'), screenshot: 'd1440-rm-2-neu.webp' },
  ],
})

folgen['zustaende'] = folge({
  schritte: [
    ...ZAEHLER_GELADEN,
    { label: 'Technik-Klappe AI Workforce öffnen (F-849: gesperrt, kein Öffnen-Link)', klick: '[data-produkt-id="ai-workforce"] .projekt-technik > summary', ...warte('[data-produkt-id="ai-workforce"] .projekt-technik[open]') },
    {
      label: 'Technik-Klappe Haushaltsbuch öffnen (erreichbar, Öffnen-Link über renderVorschau, Aufrufen)',
      klick: '[data-produkt-id="haushaltsbuch"] .projekt-technik > summary',
      ...warte('[data-produkt-id="haushaltsbuch"] .projekt-technik[open]'),
      screenshot: 'd1440-zustand-1-technik-gesperrt-erreichbar.webp',
    },
    { label: '„+“ im Kopf → Unterseite, Navigation „Alle Produkte“ markiert', klick: '#kopf-neues-projekt', ...warte('#projekte-anlegen-seite:not([hidden])') },
    { label: 'Kyrillischer Name', tippen: { selector: '#projekte-anlegen-name', text: 'Домашний бюджет' } },
    { label: '„Produkt anlegen“ → leere ID: Klappe offen, „Bitte eine ID angeben“, Fokus auf der ID, kein POST', klick: '#projekte-anlegen-absenden', ...warte('#projekte-anlegen-fehler:not([hidden])', 5000), screenshot: 'd1440-zustand-2-id-leer.webp' },
    { label: 'ID von Hand', tippen: { selector: '#projekte-anlegen-id', text: 'haushaltsbuch' } },
    {
      label: '„Produkt anlegen“ → 409: Status und grund roh am Formular',
      anfragenAntworten: [{ muster: '**/api/projekte', methode: 'POST', status: 409, json: { grund: "Projekt-id 'haushaltsbuch' ist bereits registriert" } }],
      klick: '#projekte-anlegen-absenden',
      ...warte('#projekte-anlegen-fehler:not([hidden])', 5000),
      screenshot: 'd1440-zustand-3-konflikt-409.webp',
    },
    { label: '„Abbrechen“ → zurück zur Liste', klick: '#projekte-anlegen-abbrechen', ...warte('#projekte-uebersicht-seite:not([hidden])') },
    { label: 'Erneut auf die Unterseite: Formular zurückgesetzt', klick: '#projekte-anlegen-oeffnen', ...warte('#projekte-anlegen-seite:not([hidden])') },
    { label: 'Name tippen', tippen: { selector: '#projekte-anlegen-name', text: 'Reiseplaner' } },
    { label: '„Produkt anlegen“ → 201', anfragenAntworten: [anlegen201('reiseplaner', 'Reiseplaner')], klick: '#projekte-anlegen-absenden', ...warte('#projekte-anlegen-erfolg:not([hidden])') },
    { label: '„Schließen“ → #/projekte-uebersicht', klick: '#projekte-anlegen-erfolg-schliessen', ...warte('#projekte-uebersicht-seite:not([hidden])') },
    {
      label: 'Leere Liste',
      anfragenAntworten: [{ muster: '**/api/projekte', methode: 'GET', json: { projekte: [] } }],
      klick: '#projekte-uebersicht-neu-laden',
      ...warte('#projekte-uebersicht-liste .leer', 5000),
      screenshot: 'd1440-zustand-4-leer.webp',
    },
    {
      label: 'GET /api/projekte scheitert',
      anfragenAntworten: [{ muster: '**/api/projekte', methode: 'GET', status: 500, json: { grund: 'projekte.json nicht lesbar' } }],
      klick: '#projekte-uebersicht-neu-laden',
      ...warte('#projekte-uebersicht-liste .fehler', 5000),
      screenshot: 'd1440-zustand-5-ladefehler.webp',
    },
  ],
})

for (const [ordner, klickfolge] of Object.entries(folgen)) {
  if (nur !== undefined && ordner !== nur) continue
  const verzeichnis = join(ziel, ordner)
  // Nur der eigene Ausgabeordner dieser Folge wird geleert — alte Bilder umbenannter Schritte bleiben nicht liegen.
  rmSync(verzeichnis, { recursive: true, force: true })
  mkdirSync(verzeichnis, { recursive: true })
  const pfad = join(verzeichnis, 'klickfolge.json')
  writeFileSync(pfad, `${JSON.stringify(klickfolge, null, 2)}\n`)
  console.log(`— ${ordner}`)
  execFileSync(process.execPath, ['scripts/render-nachweis.mjs', pfad, verzeichnis], { stdio: 'inherit' })
}
