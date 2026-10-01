/**
 * Datei: features/F44/nachweise/ws6b/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweise F44 WS-6b „Nutzung“ (`#/nutzung`, Vorlage V10 d_nutzung, Abgleich F-725
 * I1–I3) und Nachtrag F-947 (Kartentitel auf `#/projekte-uebersicht`) — nur die geänderten Seiten, mit
 * festen Antworten von GET …/verbrauch (nie im Produkt):
 * - je Darstellung (1440 dunkel und hell, 390 dunkel, 1440 dunkel mit 200 % Zoom, 1440 ru) EINE Folge:
 *   Seite mit 30 Tagen (Standard); Aufschlüsselung und Erklärung „Nicht erfasst“ offen; „Letzte 7 Tage“
 *   mit anderen Zahlen (Fokus bleibt auf dem Register-Knopf);
 * - 390 hell und reduzierte Bewegung (1440 dunkel): Seite und offene Aufschlüsselung;
 * - Zustände (1440 dunkel): „Gesamter Zeitraum“ ohne Läufe (Leerzustand bei zugeklappter Aufschlüsselung);
 *   alle Ausführungen ohne Nutzungsdaten („—“ statt 0);
 *   Abruf scheitert (Fehler mit „Erneut versuchen“); „Erneut versuchen“ lädt den aktiven Zeitraum neu;
 * - F-947 (1440 dunkel, 390 dunkel, 390 en): Liste „Alle Produkte“ mit langem Produktnamen (Trennstrich statt Bruch
 *   mitten im Wort).
 * Baut je Folge eine klickfolge.json in einem Unterordner und ruft scripts/render-nachweis.mjs auf;
 * Screenshots als WebP. Vor dem Lauf leert das Skript die Ausgabeordner GENAU der Folgen, die es neu
 * erzeugt (fs.rmSync, recursive, force) — fremde Ordner und das Skript selbst bleiben unberührt.
 *
 * Wird aufgerufen von: Hand, gegen einen laufenden Leitstand dieses Worktrees —
 *   LEITSTAND_PORT=4199 node scripts/leitstand-server.mjs
 *   node features/F44/nachweise/ws6b/erzeuge-nachweis.mjs [basis] [nurOrdner]
 *   basis:     Standard http://127.0.0.1:4199
 *   nurOrdner: optional, nur diese Folge (Name des Unterordners)
 * Nicht Teil von `npm run check`.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const basis = process.argv[2] ?? 'http://127.0.0.1:4199'
const nur = process.argv[3]
const ziel = 'features/F44/nachweise/ws6b'

/** Chatspalte eingeklappt (Vorlage: Chat als Dock, WS-8) — ab 1280 px bleibt sie trotzdem sichtbar. */
const CHAT_ZU = { 'leitstand-chat-offen': 'false' }

const BEOBACHTUNG = {
  texte: [
    { name: 'Ansicht', selector: '[data-view]:not([hidden])', attribut: 'data-view' },
    { name: 'data-theme', selector: 'html', attribut: 'data-theme' },
    { name: 'lang', selector: 'html', attribut: 'lang' },
    { name: 'Fokus-ID', selector: ':focus', attribut: 'id' },
    { name: 'Fokus-Zeitraum', selector: ':focus', attribut: 'data-verbrauch-zeitraum' },
    { name: 'Zeitraum aktiv', selector: '#view-nutzung [aria-pressed="true"]' },
    { name: 'Werte', selector: '#view-nutzung .nutzung-kennzahlen' },
    { name: 'Gelesen', selector: '#view-nutzung .nutzung-flaeche .nutzung-gross' },
  ],
  vorhanden: [
    { name: 'Aufschlüsselung offen', selector: '#nutzung-aufschluesselung[open]' },
    { name: 'Erklärung „Nicht erfasst“ sichtbar', selector: '#nutzung-hilfe-text:not([hidden])' },
    { name: 'Leerzustand', selector: '#nutzung-aufschluesselung .leer' },
    { name: 'Fehler mit „Erneut versuchen“', selector: '#nutzung-fehler [data-aktion="erneut"]' },
    { name: 'zweite Live-Region (muss fehlen)', selector: '#view-nutzung [aria-live]' },
  ],
  ueberlauf: true,
}

/** Gruppe wie GET …/verbrauch sie liefert. */
const gruppe = (rolle, worker, modell, anzahlLaeufe, ohneBeobachtung, [ein, aus, lesen, schreiben]) => ({
  rolle,
  worker,
  modell,
  auftragId: 'a-nw',
  anzahlLaeufe,
  ohneBeobachtung,
  verbrauch: { inputTokens: ein, outputTokens: aus, cacheReadTokens: lesen, cacheWriteTokens: schreiben, dauerMs: 1000 },
})

const VERBRAUCH_30 = {
  status: 'ok',
  laeufeGesamt: 28,
  ohneBeobachtungGesamt: 4,
  gruppen: [
    gruppe('ausfuehrung', 'claude-code', 'claude-sonnet-4-5', 14, 1, [182400, 96500, 812000, 121300]),
    gruppe('ausfuehrung', 'claude-code', null, 2, 2, [0, 0, 0, 0]),
    gruppe('code-reviewer', 'codex', 'gpt-5-codex', 8, 0, [64200, 21800, 0, 0]),
    gruppe('qa', 'claude-code', 'claude-sonnet-4-5', 3, 0, [21000, 9100, 88000, 14000]),
    gruppe(null, 'claude-code', null, 1, 1, [0, 0, 0, 0]),
  ],
}
const VERBRAUCH_7 = {
  status: 'ok',
  laeufeGesamt: 5,
  ohneBeobachtungGesamt: 1,
  gruppen: [gruppe('ausfuehrung', 'claude-code', 'claude-sonnet-4-5', 4, 1, [31200, 18800, 140500, 20100]), gruppe('code-reviewer', 'codex', 'gpt-5-codex', 1, 0, [9100, 2600, 0, 0])],
}
const VERBRAUCH_LEER = { status: 'ok', laeufeGesamt: 0, ohneBeobachtungGesamt: 0, gruppen: [] }

/** 30 und 7 Tage tragen ?von=, „gesamt“ keinen Filter (verbrauch-zeitraum.js). */
const mitFilter = (json, status = 200) => ({ muster: '**/api/verbrauch?*', status, json })
const ohneFilter = (json, status = 200) => ({ muster: '**/api/verbrauch', status, json })

const ANTWORTEN = [{ muster: '**/api/zustand', json: { laeufe: [], startfehler: [], workflows: [], fehler: [], aktiverLauf: { aktiv: false, laufId: null }, pruefbefehl: null, istAiWorkforce: true } }, mitFilter(VERBRAUCH_30), ohneFilter(VERBRAUCH_LEER)]

/**
 * Eine Folge. Seitenbilder als Ausschnitt der Ansicht ab 1280 CSS-px, sonst Vollseite.
 * @param optionen - hash, schritte, antworten, farbschema, breite, hoehe, zoom, sprache, ausschnitt
 * @returns Klickfolge
 */
function folge({ hash = '#/nutzung', schritte, antworten = [], farbschema = 'dark', breite = 1440, hoehe = 1000, zoom = 1, sprache, ausschnitt = '#view-nutzung', reduzierteBewegung = false }) {
  const breit = breite / zoom >= 1280
  return {
    url: `${basis}/${hash}`,
    viewport: { breite, hoehe },
    farbschema,
    zoom,
    ...(reduzierteBewegung ? { reduzierteBewegung: true } : {}),
    screenshotQualitaet: 0.7,
    ...(breit ? { screenshotVollseite: true, screenshotAusschnitt: { selector: ausschnitt } } : { screenshotVollseite: true }),
    localStorageSetzen: { ...CHAT_ZU, ...(sprache ? { 'leitstand-sprache': sprache } : {}) },
    anfragenAntworten: [...ANTWORTEN, ...antworten],
    beobachtete: BEOBACHTUNG,
    schritte,
  }
}

const warte = (selector, timeoutMs = 15000, zustandWert) => ({ warteAufSelector: { selector, timeoutMs, ...(zustandWert ? { zustand: zustandWert } : {}) } })

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
      { label: 'Letzte 30 Tage (Standard): Kopf, Register, drei Kennzahlen, Was wurde verarbeitet?, Aufschlüsselung zu', ...warte('#view-nutzung .nutzung-kennzahlen'), screenshot: `${praefix}-1-30tage.webp` },
      { label: 'Erklärung „Nicht erfasst“ öffnen (Knopf ?)', klick: '#view-nutzung [data-aktion="hilfe"]', ...warte('#nutzung-hilfe-text:not([hidden])') },
      {
        label: 'Technische Aufschlüsselung offen: Rolle · Worker mit Modell je Zeile, Cache getrennt, „Nach Modell“, unbekannt mit Tooltip',
        klick: '#nutzung-aufschluesselung > summary',
        ...warte('#nutzung-aufschluesselung[open]'),
        screenshot: `${praefix}-2-aufschluesselung.webp`,
      },
      {
        label: '„Letzte 7 Tage“: andere Zahlen, Aufschlüsselung bleibt offen',
        anfragenAntworten: [mitFilter(VERBRAUCH_7)],
        klick: '#view-nutzung [data-verbrauch-zeitraum="7t"]',
        ...warte('#view-nutzung [data-verbrauch-zeitraum="7t"][aria-pressed="true"]'),
      },
      { label: 'Kennzahlen des 7-Tage-Zeitraums geladen', ...warte('#view-nutzung .nutzung-kennzahlen'), screenshot: `${praefix}-3-7tage.webp` },
    ],
    ...darstellung,
  })
}

folgen['bewegung-reduziert'] = folge({
  reduzierteBewegung: true,
  schritte: [
    { label: 'Reduzierte Bewegung: Seite (keine eigene Animation)', ...warte('#view-nutzung .nutzung-kennzahlen'), screenshot: 'd1440-rm-1-seite.webp' },
    { label: 'Reduzierte Bewegung: Aufschlüsselung offen', klick: '#nutzung-aufschluesselung > summary', ...warte('#nutzung-aufschluesselung[open]'), screenshot: 'd1440-rm-2-aufschluesselung.webp' },
  ],
})

folgen['zustaende'] = folge({
  schritte: [
    { label: 'Seite geladen (30 Tage)', ...warte('#view-nutzung .nutzung-kennzahlen') },
    { label: '„Gesamter Zeitraum“ ohne Läufe: Kennzahlen 0, Leerzustand „Keine Läufe im Zeitraum.“ auch bei zugeklappter Aufschlüsselung', klick: '#view-nutzung [data-verbrauch-zeitraum="gesamt"]', ...warte('#view-nutzung .nutzung-leer'), screenshot: 'd1440-zustand-1-leer.webp' },
    {
      label: '„Letzte 7 Tage“: alle Ausführungen ohne Nutzungsdaten — Gelesen/Erzeugt und Tokenzellen „—“ statt 0',
      anfragenAntworten: [mitFilter({ status: 'ok', laeufeGesamt: 3, ohneBeobachtungGesamt: 3, gruppen: [gruppe('ausfuehrung', 'claude-code', null, 3, 3, [0, 0, 0, 0])] })],
      klick: '#view-nutzung [data-verbrauch-zeitraum="7t"]',
      ...warte('#view-nutzung [data-verbrauch-zeitraum="7t"][aria-pressed="true"]'),
    },
    { label: 'Aufschlüsselung öffnen', klick: '#nutzung-aufschluesselung > summary', ...warte('#nutzung-aufschluesselung[open]'), screenshot: 'd1440-zustand-2-ohne-messwerte.webp' },
    {
      label: '„Letzte 30 Tage“ scheitert (500): Fehler mit „Erneut versuchen“, Register bleibt',
      anfragenAntworten: [mitFilter({ grund: 'Laufakten nicht lesbar' }, 500)],
      klick: '#view-nutzung [data-verbrauch-zeitraum="30t"]',
      ...warte('#nutzung-fehler'),
      screenshot: 'd1440-zustand-3-fehler.webp',
    },
    {
      label: '„Erneut versuchen“ lädt den aktiven Zeitraum (30 Tage) neu',
      anfragenAntworten: [mitFilter(VERBRAUCH_30)],
      klick: '#nutzung-fehler [data-aktion="erneut"]',
      ...warte('#view-nutzung .nutzung-kennzahlen'),
      screenshot: 'd1440-zustand-4-erneut.webp',
    },
  ],
})

/** F-947: Liste „Alle Produkte“ mit langem Namen (Mindestantworten je Karte). */
const LANG = 'Familien-Rezeptbuch mit Wochenplanung, Einkaufsliste und Vorratskammer'
folgen['f947-produkte-1440'] = folge({
  hash: '#/projekte-uebersicht',
  ausschnitt: '#view-projekte-uebersicht',
  antworten: [
    {
      muster: '**/api/projekte',
      methode: 'GET',
      json: {
        projekte: [
          { id: 'ai-workforce', name: 'AI Workforce', repo_pfad: '.', status: 'IN_ENTWICKLUNG', laufAktiv: false },
          { id: 'rezeptbuch-familie', name: LANG, repo_pfad: '../rezeptbuch-familie', status: 'DISCOVERY', laufAktiv: false },
        ],
      },
    },
    { muster: '**/api/projekte/*/roadmap', json: { status: 'nicht_vorhanden' } },
    { muster: '**/api/projekte/*/zustand', json: { laeufe: [], startfehler: [], workflows: [], fehler: [] } },
    { muster: '**/api/projekte/*/workitems?status=OFFEN', json: { workitems: [], befunde: [], fehler: [] } },
    { muster: '**/api/projekte/*/projekt-aufruf', methode: 'GET', json: { vorschau: { url: null, erreichbar: null, grund: 'nicht gesetzt' }, startbefehl: null, ergebnis_datei: null, startvorlage: 'startvorlage.json', aktiv: false, letzterAufruf: null } },
  ],
  schritte: [{ label: 'F-947: langer Produktname trennt mit Trennstrich (hyphens: auto, html lang de), kein Überlauf', ...warte('[data-produkt-id="rezeptbuch-familie"] [data-teil="hinweis"]'), screenshot: 'd1440-f947-liste.webp' }],
})

folgen['f947-produkte-390'] = folge({
  breite: 390,
  hoehe: 844,
  hash: '#/projekte-uebersicht',
  ausschnitt: '#view-projekte-uebersicht',
  antworten: [
    {
      muster: '**/api/projekte',
      methode: 'GET',
      json: {
        projekte: [
          { id: 'ai-workforce', name: 'AI Workforce', repo_pfad: '.', status: 'IN_ENTWICKLUNG', laufAktiv: false },
          { id: 'rezeptbuch-familie', name: LANG, repo_pfad: '../rezeptbuch-familie', status: 'DISCOVERY', laufAktiv: false },
        ],
      },
    },
    { muster: '**/api/projekte/*/roadmap', json: { status: 'nicht_vorhanden' } },
    { muster: '**/api/projekte/*/zustand', json: { laeufe: [], startfehler: [], workflows: [], fehler: [] } },
    { muster: '**/api/projekte/*/workitems?status=OFFEN', json: { workitems: [], befunde: [], fehler: [] } },
    { muster: '**/api/projekte/*/projekt-aufruf', methode: 'GET', json: { vorschau: { url: null, erreichbar: null, grund: 'nicht gesetzt' }, startbefehl: null, ergebnis_datei: null, startvorlage: 'startvorlage.json', aktiv: false, letzterAufruf: null } },
  ],
  schritte: [{ label: 'F-947: langer Produktname trennt mit Trennstrich (hyphens: auto, html lang de), kein Überlauf', ...warte('[data-produkt-id="rezeptbuch-familie"] [data-teil="hinweis"]'), screenshot: 'd390-f947-liste.webp' }],
})

folgen['f947-produkte-390-en'] = folge({
  breite: 390,
  hoehe: 844,
  sprache: 'en',
  hash: '#/projekte-uebersicht',
  ausschnitt: '#view-projekte-uebersicht',
  antworten: [
    {
      muster: '**/api/projekte',
      methode: 'GET',
      json: {
        projekte: [
          { id: 'ai-workforce', name: 'AI Workforce', repo_pfad: '.', status: 'IN_ENTWICKLUNG', laufAktiv: false },
          { id: 'rezeptbuch-familie', name: LANG, repo_pfad: '../rezeptbuch-familie', status: 'DISCOVERY', laufAktiv: false },
        ],
      },
    },
    { muster: '**/api/projekte/*/roadmap', json: { status: 'nicht_vorhanden' } },
    { muster: '**/api/projekte/*/zustand', json: { laeufe: [], startfehler: [], workflows: [], fehler: [] } },
    { muster: '**/api/projekte/*/workitems?status=OFFEN', json: { workitems: [], befunde: [], fehler: [] } },
    { muster: '**/api/projekte/*/projekt-aufruf', methode: 'GET', json: { vorschau: { url: null, erreichbar: null, grund: 'nicht gesetzt' }, startbefehl: null, ergebnis_datei: null, startvorlage: 'startvorlage.json', aktiv: false, letzterAufruf: null } },
  ],
  schritte: [{ label: 'F-947: langer Produktname trennt mit Trennstrich (hyphens: auto, html lang de), kein Überlauf', ...warte('[data-produkt-id="rezeptbuch-familie"] [data-teil="hinweis"]'), screenshot: 'en390-f947-liste.webp' }],
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
