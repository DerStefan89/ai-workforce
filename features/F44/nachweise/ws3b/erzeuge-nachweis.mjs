/**
 * Datei: features/F44/nachweise/ws3b/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweise F44 WS-3b „Detail & Click-to-Work“ — kleinste Matrix (F-876), nur die
 * geänderten Seiten, mit festen Antworten (nie im Produkt):
 * - Detail Feature (#/workboard/F91): Akte mit Ziel, Nicht-Zielen und drei AKs, verknüpfter,
 *   abgeschlossener Ablauf mit zwei Schritten und offener Abnahme („Ergebnis prüfen“), Meilenstein
 *   aus der Roadmap — 1440 dunkel und hell, 390 dunkel, 1440 dunkel mit 200 % Zoom, 1440 dunkel ru;
 * - Detail Finding (#/workboard/F-9001) im Click-to-Work-Vorschlag: „Auftrag vorbereiten“ →
 *   Auftrag (POST, fest) → Routen (POST, fest) → Vorschlag mit Kette und Katalog-Empfehlung — in
 *   denselben fünf Darstellungen;
 * - Detail Finding mit Konflikt 409 („Es läuft bereits eine Ausführung.“, „Wiederholen“ → erneut 409, E12);
 * - Detail Finding nach „Freigeben“ bis „abgeschlossen“ mit Git-Block (E11, 1440 dunkel und 390 hell),
 *   „Ablehnen“ (verworfen) und Freigabe-Fehler 500; Detail Feature mit reduzierter Bewegung und ru-390;
 * - #/workboard (Kanban-Board) bei 1440 dunkel gegen den laufenden Leitstand (F-919 Sortierung,
 *   „Alle x anzeigen“; F-921 Phase auf der Karte);
 * - #/dashboard bei 1440 dunkel (F-914: Rollennamen in „Aktuelle Rolle“ und „Wer macht was“).
 * Den Ladezustand beim Deep-Link (F-921) belegt projekt-wechsel.test.mjs — eine zurückgehaltene
 * Antwort kann render-nachweis.mjs nicht nachstellen.
 * Baut je Folge eine klickfolge.json in einem Unterordner und ruft scripts/render-nachweis.mjs auf;
 * Screenshots als WebP.
 *
 * Wird aufgerufen von: Hand, gegen einen laufenden Leitstand dieses Worktrees —
 *   node features/F44/nachweise/ws3b/erzeuge-nachweis.mjs [basis] [nurOrdner]
 *   basis:     Standard http://127.0.0.1:4381
 *   nurOrdner: optional, nur diese Folge (Name des Unterordners)
 * Nicht Teil von `npm run check`.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const basis = process.argv[2] ?? 'http://127.0.0.1:4381'
const nur = process.argv[3]
const ziel = 'features/F44/nachweise/ws3b'

/** Chatspalte eingeklappt (Vorlage: Chat als Dock, WS-8) — sonst bestimmt ihre Länge die Vollseite. */
const CHAT_ZU = { 'leitstand-chat-offen': 'false' }

const BEOBACHTUNG = {
  texte: [
    { name: 'Ansicht', selector: '[data-view]:not([hidden])', attribut: 'data-view' },
    { name: 'data-theme', selector: 'html', attribut: 'data-theme' },
    { name: 'lang', selector: 'html', attribut: 'lang' },
    { name: 'Überschrift', selector: '[data-view]:not([hidden]) h1:not(:empty)' },
    { name: 'Fokus', selector: ':focus' },
  ],
  ueberlauf: true,
}

const DETAIL_BEOBACHTUNG = {
  ...BEOBACHTUNG,
  texte: [
    ...BEOBACHTUNG.texte,
    { name: 'Zurück', selector: '#workboard-detail-schliessen' },
    { name: 'Eyebrow', selector: '#workboard-detail-eyebrow' },
    { name: 'Titel', selector: '#workboard-detail-titel' },
    { name: 'Aktion', selector: '#workboard-detail-aktion' },
    { name: 'Statuszeile', selector: '#workboard-detail-status' },
    { name: 'Auftrag', selector: '#workboard-bearbeitung' },
    { name: 'Stand', selector: '#workboard-detail-inhalt .progress-caption' },
    { name: 'erstes AK', selector: '#workboard-detail-inhalt .checklist li' },
    { name: 'Planung', selector: '#workboard-detail-inhalt .workboard-detail-planung' },
  ],
  sichtbarkeit: [
    { name: 'Übersicht (Board/Listen)', id: 'workboard-uebersicht' },
    { name: 'Detail', id: 'workboard-detail' },
  ],
  vorhanden: [
    { name: 'kommt (aria-disabled) im Detail', selector: '#workboard-detail [aria-disabled="true"]' },
    { name: 'Freigeben (wb-freigeben)', selector: '#workboard-bearbeitung .wb-freigeben' },
    { name: 'Ergebnis prüfen', selector: '#workboard-detail-aktion a[href^="#/workflows/"]' },
    { name: 'Beispiel-Insights (muss fehlen)', selector: '#workboard-detail .insight-card' },
  ],
}

/** Zustands-Aggregat für Folgen mit fester Antwort. */
const zustand = (felder) => ({ laeufe: [], startfehler: [], workflows: [], fehler: [], aktiverLauf: { aktiv: false, laufId: null }, pruefbefehl: null, istAiWorkforce: true, ...felder })

const FEATURE = { quelle: 'feature', typ: 'FEATURE', id: 'F91', titel: 'Nachweis: Bauen aus der Akte', status: 'IN_ARBEIT', pfad: 'features/F91/feature.md' }
const FINDING = {
  quelle: 'finding',
  typ: 'BUG',
  id: 'F-9001',
  titel: 'Nachweis: Fehlende Nutzungsdaten kennzeichnen',
  status: 'OFFEN',
  statusRoh: 'offen',
  prioritaet: 'P1',
  beschreibung: 'Wenn Nutzungsdaten einer Ausführung fehlen, zeigt die Anzeige 0 statt „nicht erfasst“. <b>HTML bleibt Text.</b>',
  fundstelle: 'public/leitstand/views/nutzung.js',
  auswirkung: 'Ein unbekannter Verbrauch sieht wie kostenloses Arbeiten aus.',
  massnahme: 'Einen ausdrücklichen Zustand „nicht erfasst“ anzeigen.',
  featureRun: null,
}
const WORKITEMS = { workitems: [FINDING, FEATURE], befunde: [], fehler: [] }
const AUFTRAEGE = [{ auftragId: 'nachweis-a91', titel: 'Bauen aus der Akte', erstellt_am: '2026-10-01T08:00:00Z', workitem_referenz: 'workitem:feature:F91' }]
const WORKFLOW_F91 = { workflowId: 'nachweis-w91', auftragId: 'nachweis-a91', ziel: 'Vom beschriebenen Feature direkt zur freigabefähigen Arbeit, ohne den Auftrag noch einmal aufzubauen.', status: 'ABGESCHLOSSEN', aktiverSchrittId: 's2', grund: null, naechster: null }
const SCHRITTE_F91 = [
  { schritt_id: 's1', rolle: 'ausfuehrung', worker: 'claude-code', modell: 'claude-sonnet', status: 'ERFOLGREICH', freigabe: 'ZWINGEND', nachfolger: 's2', lauf_id: 'l1' },
  { schritt_id: 's2', rolle: 'code-reviewer', worker: 'codex', modell: 'gpt', status: 'ERFOLGREICH', freigabe: 'KEINE', nachfolger: null, lauf_id: 'l2' },
]
const AKTE_F91 = {
  status: 'ok',
  id: 'F91',
  titel: 'Bauen aus der Akte',
  featureStatus: 'IN_ARBEIT',
  ziel: 'Aus einer Feature-Beschreibung direkt einen klaren Auftrag machen.\nDer Ablauf ist vor dem Start sichtbar.',
  nicht_ziele: ['Die Akte im Leitstand bearbeiten.', 'Ohne Freigabe starten.'],
  akzeptanzkriterien: [
    { id: 'AK1', text: 'Ein Auftrag lässt sich aus einer Feature-Datei vorbereiten.' },
    { id: 'AK2', text: 'Der vorgeschlagene Ablauf ist vor dem Start sichtbar.' },
    { id: 'AK3', text: 'Kein schreibender Schritt startet ohne Freigabe; <script> bleibt Text.' },
  ],
}
const ROADMAP = { status: 'ok', vision: 'Nachweis', meilensteine: [{ id: 'm1', titel: 'Verlässlich arbeiten', status: 'LAEUFT', features: [{ id: 'F91', titel: 'Bauen aus der Akte', status: 'IN_ARBEIT' }] }] }
const VORSCHLAG = {
  daten: {
    workflow_id: 'router-nachweis-a1',
    ziel: 'Fehlende Nutzungsdaten kennzeichnen',
    status: 'WARTET_FREIGABE',
    aktiver_schritt_id: 's1',
    schritte: [
      { schritt_id: 's1', rolle: 'ausfuehrung', worker: 'claude-code', modell: 'claude-sonnet', status: 'WARTET_FREIGABE', freigabe: 'ZWINGEND', nachfolger: 's2', lauf_id: null },
      { schritt_id: 's2', rolle: 'code-reviewer', worker: 'codex', modell: 'gpt', status: 'OFFEN', freigabe: 'KEINE', nachfolger: null, lauf_id: null },
    ],
  },
  naechster: { art: 'haltFreigabe', schrittId: 's1' },
  empfehlung: {
    schrittId: 's1',
    wirdGenutzt: [{ id: 'playwright-mcp', name: 'Playwright', typ: 'extern', unterart: 'mcp', grund: 'task_typen_any erfüllt (bugfix)' }],
    passtNichtImLauf: [],
    weitereAnzahl: { wirdGenutzt: 0, passtNichtImLauf: 0 },
    nichtFreigebbarAnzahl: 0,
    hinweise: [],
  },
}

/** Feste Antworten des Feature-Details. */
const ANTWORTEN_FEATURE = [
  { muster: '**/api/workitems*', json: WORKITEMS },
  { muster: '**/api/auftraege', json: AUFTRAEGE },
  { muster: '**/api/zustand', json: zustand({ workflows: [WORKFLOW_F91] }) },
  { muster: '**/api/workflows/nachweis-w91', json: { daten: { ...WORKFLOW_F91, schritte: SCHRITTE_F91 }, naechster: null } },
  { muster: '**/api/workflows/nachweis-w91/abnahme', json: { workflowStatus: 'ABGESCHLOSSEN', freigabeHalt: null, entscheidung: { status: 'fehlt' } } },
  { muster: '**/api/features/F91/akte', json: AKTE_F91 },
  { muster: '**/api/roadmap', json: ROADMAP },
]

/**
 * Feste Antworten des Finding-Details bis zum Vorschlag.
 * @param routen - Antwort auf POST …/routen ({ status, json })
 * @returns Antwortliste (spätere Einträge haben Vorrang)
 */
function antwortenFinding(routen = { status: 202, json: { laufId: 'router-nachweis-a1-1' } }) {
  return [
    { muster: '**/api/workitems*', json: WORKITEMS },
    { muster: '**/api/auftraege', methode: 'GET', json: [] },
    { muster: '**/api/auftraege', methode: 'POST', status: 201, json: { auftragId: 'nachweis-a1' } },
    { muster: '**/api/auftraege/nachweis-a1/routen', methode: 'POST', ...routen },
    { muster: '**/api/zustand', json: zustand({}) },
    { muster: '**/api/workflows/router-nachweis-a1', json: VORSCHLAG },
  ]
}

/**
 * Folge über ein Detail in einer Darstellung.
 * @param optionen - id, antworten, schritte, farbschema, breite, hoehe, zoom, sprache
 * @returns Klickfolge
 */
function detail({ id, antworten, schritte, farbschema = 'dark', breite = 1440, hoehe = 1000, zoom = 1, sprache }) {
  const vollseite = breite / zoom >= 1280
  return {
    url: `${basis}/#/workboard/${encodeURIComponent(id)}`,
    viewport: { breite, hoehe },
    farbschema,
    zoom,
    screenshotQualitaet: 0.7,
    ...(vollseite ? { screenshotVollseite: true, screenshotAusschnitt: { selector: '#view-workboard' } } : { screenshotVollseite: false }),
    localStorageSetzen: { ...CHAT_ZU, ...(sprache ? { 'leitstand-sprache': sprache } : {}) },
    anfragenAntworten: antworten,
    beobachtete: DETAIL_BEOBACHTUNG,
    schritte,
  }
}

const WARTE_FEATURE = { warteAufSelector: { selector: '#workboard-detail-inhalt .checklist li, #workboard-detail-inhalt .progress-track', timeoutMs: 15000 } }
const WARTE_FEATURE_VOLL = { warteAufSelector: { selector: '#workboard-detail-aktion a', timeoutMs: 15000 } }
const WARTE_VORSCHLAG = { warteAufSelector: { selector: '#workboard-bearbeitung .wb-freigeben', timeoutMs: 15000 } }

/** Schritte des Feature-Details; bei schmaler Fläche zusätzlich Ausschnitte per Fokus. */
function schritteFeature(praefix, schmal) {
  const schritte = [{ label: 'Deep-Link #/workboard/F91 (Akte, Ablauf, Abnahme offen)', ...WARTE_FEATURE, ...WARTE_FEATURE_VOLL, screenshot: `${praefix}-feature.webp` }]
  if (schmal) {
    schritte.push(
      { label: 'Fokus „Ablauf öffnen“ im Hinweis der Sperre (Statuszeile und gesperrtes „Auftrag vorbereiten“, F-922)', fokus: '#workboard-bearbeitung a', screenshot: `${praefix}-feature-2-auftrag.webp` },
      { label: 'Fokus Link „Auf der Roadmap ansehen“ (Kriterien und Planung)', fokus: '#workboard-detail-inhalt .pm-planning .text-link', screenshot: `${praefix}-feature-3-planung.webp` }
    )
  }
  return schritte
}

/** Schritte des Finding-Details bis zum Click-to-Work-Vorschlag. */
function schritteFinding(praefix, schmal) {
  const schritte = [
    { label: 'Deep-Link #/workboard/F-9001', warteAufSelector: { selector: '#workboard-bearbeiten', timeoutMs: 15000 }, screenshot: `${praefix}-finding.webp` },
    { label: 'Klick „Auftrag vorbereiten“ → Auftrag, Routen, Vorschlag (Detail-Auffrischer)', klick: '#workboard-bearbeiten', ...WARTE_VORSCHLAG, screenshot: `${praefix}-finding-vorschlag.webp` },
  ]
  if (schmal) schritte.push({ label: 'Fokus „Freigeben“ (Vorschlag im Viewport)', fokus: '#workboard-bearbeitung .wb-freigeben', screenshot: `${praefix}-finding-vorschlag-freigeben.webp` })
  return schritte
}

const DARSTELLUNGEN = {
  'dunkel-1440': { praefix: 'd1440' },
  'hell-1440': { praefix: 'l1440', farbschema: 'light' },
  'dunkel-390': { praefix: 'd390', breite: 390, hoehe: 844, schmal: true },
  'dunkel-1440-zoom200': { praefix: 'd1440z2', zoom: 2, schmal: true },
  'ru-1440': { praefix: 'ru1440', sprache: 'ru' },
}

const folgen = {}
for (const [name, { praefix, schmal = false, ...darstellung }] of Object.entries(DARSTELLUNGEN)) {
  folgen[`detail-feature-${name}`] = detail({ id: 'F91', antworten: ANTWORTEN_FEATURE, schritte: schritteFeature(praefix, schmal), ...darstellung })
  folgen[`detail-finding-${name}`] = detail({ id: 'F-9001', antworten: antwortenFinding(), schritte: schritteFinding(praefix, schmal), ...darstellung })
}

folgen['detail-finding-konflikt'] = detail({
  id: 'F-9001',
  antworten: antwortenFinding({ status: 409, json: { grund: 'Es läuft bereits ein Lauf (D13): nachweis-lauf' } }),
  schritte: [
    { label: 'Deep-Link #/workboard/F-9001', warteAufSelector: { selector: '#workboard-bearbeiten', timeoutMs: 15000 } },
    { label: 'Klick „Auftrag vorbereiten“ → Routen 409 (E12)', klick: '#workboard-bearbeiten', warteAufSelector: { selector: '#workboard-bearbeitung .wb-wiederholen', timeoutMs: 15000 }, screenshot: 'd1440-konflikt.webp' },
    // Die feste Antwort bleibt 409: „Wiederholen“ routet erneut (kein zweiter Auftrag) und landet wieder im Konflikt.
    { label: 'Klick „Wiederholen“ → erneut 409, Konflikt bleibt', klick: '#workboard-bearbeitung .wb-wiederholen', warteAufSelector: { selector: '#workboard-bearbeitung .wb-wiederholen', timeoutMs: 15000 }, screenshot: 'd1440-konflikt-wiederholt.webp' },
  ],
})

/**
 * Feste Antworten bis zum abgeschlossenen Ablauf: Der Vorschlag meldet bereits ABGESCHLOSSEN, so
 * geht der Detail-Auffrischer nach „Freigeben“ (200) über „gestartet“ zu „abgeschlossen“ mit Git-Block.
 * @param freigabe - Antwort auf POST …/freigabe ({ status, json })
 * @returns Antwortliste
 */
function antwortenAblauf(freigabe = { status: 200, json: { status: 'LAEUFT' } }) {
  // Aggregat und Auftragsliste kennen den Ablauf (sonst widerspräche das Detail dem Click-to-Work-
  // Bereich nur wegen der festen Antworten): verknüpft über die Referenzzeile, abgeschlossen, Abnahme
  // bereits entschieden.
  const fertig = VORSCHLAG.daten.schritte.map((s) => ({ ...s, status: 'ERFOLGREICH' }))
  return [
    ...antwortenFinding(),
    { muster: '**/api/auftraege', methode: 'GET', json: [{ auftragId: 'nachweis-a1', titel: 'Nachweis', erstellt_am: '2026-10-01T08:00:00Z', workitem_referenz: 'workitem:finding:F-9001' }] },
    { muster: '**/api/zustand', json: zustand({ workflows: [{ workflowId: 'router-nachweis-a1', auftragId: 'nachweis-a1', ziel: VORSCHLAG.daten.ziel, status: 'ABGESCHLOSSEN', aktiverSchrittId: 's2', grund: null, naechster: null }] }) },
    { muster: '**/api/workflows/router-nachweis-a1', json: { ...VORSCHLAG, daten: { ...VORSCHLAG.daten, status: 'ABGESCHLOSSEN', schritte: fertig } } },
    { muster: '**/api/workflows/router-nachweis-a1/abnahme', json: { workflowStatus: 'ABGESCHLOSSEN', freigabeHalt: null, entscheidung: { status: 'ok' } } },
    { muster: '**/api/workflows/router-nachweis-a1/freigabe', methode: 'POST', ...freigabe },
  ]
}

const SCHRITTE_BIS_VORSCHLAG = [
  { label: 'Deep-Link #/workboard/F-9001', warteAufSelector: { selector: '#workboard-bearbeiten', timeoutMs: 15000 } },
  { label: 'Klick „Auftrag vorbereiten“ → Vorschlag', klick: '#workboard-bearbeiten', ...WARTE_VORSCHLAG },
]

folgen['detail-finding-ablauf-dunkel-1440'] = detail({
  id: 'F-9001',
  antworten: antwortenAblauf(),
  schritte: [
    ...SCHRITTE_BIS_VORSCHLAG,
    { label: 'Klick „Freigeben“ → gestartet → abgeschlossen mit Git-Block „Commit / Push / PR“ (E11)', klick: '#workboard-bearbeitung .wb-freigeben', warteAufSelector: { selector: '#workboard-bearbeitung .workboard-git pre', timeoutMs: 15000 }, screenshot: 'd1440-ablauf-git.webp' },
  ],
})
folgen['detail-finding-ablauf-hell-390'] = detail({
  id: 'F-9001',
  farbschema: 'light',
  breite: 390,
  hoehe: 844,
  antworten: antwortenAblauf(),
  schritte: [
    ...SCHRITTE_BIS_VORSCHLAG,
    { label: 'Klick „Freigeben“ → abgeschlossen mit Git-Block', klick: '#workboard-bearbeitung .wb-freigeben', warteAufSelector: { selector: '#workboard-bearbeitung .workboard-git pre', timeoutMs: 15000 } },
    { label: 'Fokus „Ablauf öffnen“ (Git-Block im Viewport)', fokus: '#workboard-bearbeitung .workboard-vorschlag a', screenshot: 'l390-ablauf-git.webp' },
  ],
})
folgen['detail-finding-verworfen'] = detail({
  id: 'F-9001',
  antworten: antwortenFinding(),
  schritte: [...SCHRITTE_BIS_VORSCHLAG, { label: 'Klick „Ablehnen“ → verworfen (nichts gestartet)', klick: '#workboard-bearbeitung .wb-ablehnen', screenshot: 'd1440-verworfen.webp' }],
})
folgen['detail-finding-freigabe-fehler'] = detail({
  id: 'F-9001',
  antworten: antwortenAblauf({ status: 500, json: { grund: 'Nachweis: Freigabe nicht gespeichert <x>' } }),
  schritte: [
    ...SCHRITTE_BIS_VORSCHLAG,
    { label: 'Klick „Freigeben“ → 500: Fehlerzustand (Grund escaped)', klick: '#workboard-bearbeitung .wb-freigeben', warteAufSelector: { selector: '#workboard-bearbeitung .note.red', timeoutMs: 15000 }, screenshot: 'd1440-freigabe-fehler.webp' },
  ],
})
folgen['detail-feature-bewegung-reduziert'] = { ...detail({ id: 'F91', antworten: ANTWORTEN_FEATURE, schritte: schritteFeature('d1440rm', false) }), reduzierteBewegung: true }
folgen['detail-feature-ru-390'] = detail({ id: 'F91', antworten: ANTWORTEN_FEATURE, schritte: schritteFeature('ru390', true), sprache: 'ru', breite: 390, hoehe: 844 })


folgen['board-dunkel-1440'] = {
  url: `${basis}/#/workboard`,
  viewport: { breite: 1440, hoehe: 1000 },
  farbschema: 'dark',
  screenshotQualitaet: 0.7,
  screenshotVollseite: true,
  screenshotAusschnitt: { selector: '#view-workboard' },
  localStorageSetzen: CHAT_ZU,
  beobachtete: {
    ...BEOBACHTUNG,
    texte: [
      ...BEOBACHTUNG.texte,
      { name: 'Spalte Geplant (Zahl)', selector: '.board-spalte-geplant .board-column-title' },
      { name: 'erste Karte Geplant', selector: '.board-spalte-geplant .board-item' },
      { name: 'Alle x anzeigen (Geplant)', selector: '.board-spalte-geplant .board-weitere-zeile' },
    ],
  },
  schritte: [
    { label: '#/workboard (F-919 Sortierung, „Alle x anzeigen“)', warteAufSelector: { selector: '#workboard-board .pm-board', timeoutMs: 15000 }, screenshot: 'd1440-board.webp' },
    { label: 'Sichtbarer Ausschnitt (Karten lesbar: Typ, Priorität, Titel, Phase bzw. Status, ID — F-921)', screenshotVollseite: false, screenshot: 'd1440-board-ausschnitt.webp' },
    { label: 'Klick „Alle x anzeigen“ in Geplant: Listen-Tab mit Spaltenfilter', klick: '.board-spalte-geplant .board-weitere >> nth=0', warteAufSelector: { selector: '#workboard-liste .workboard-zeile', timeoutMs: 15000 }, screenshot: 'd1440-board-alle.webp' },
  ],
}

folgen['dashboard-dunkel-1440'] = {
  url: `${basis}/#/dashboard`,
  viewport: { breite: 1440, hoehe: 1000 },
  farbschema: 'dark',
  screenshotQualitaet: 0.7,
  screenshotVollseite: true,
  screenshotAusschnitt: { selector: '#view-dashboard' },
  localStorageSetzen: CHAT_ZU,
  anfragenAntworten: [
    { muster: '**/api/zustand', json: zustand({ workflows: [{ ...WORKFLOW_F91, status: 'LAEUFT', aktiverSchrittId: 's2', naechster: { art: 'starte', schrittId: 's2' } }] }) },
    { muster: '**/api/workflows/nachweis-w91', json: { daten: { ...WORKFLOW_F91, status: 'LAEUFT', schritte: [SCHRITTE_F91[0], { ...SCHRITTE_F91[1], status: 'LAEUFT' }] }, naechster: { art: 'starte', schrittId: 's2' } } },
    { muster: '**/api/workflows/nachweis-w91/abnahme', json: { workflowStatus: 'LAEUFT', freigabeHalt: null, entscheidung: { status: 'fehlt' } } },
  ],
  beobachtete: {
    ...BEOBACHTUNG,
    texte: [
      ...BEOBACHTUNG.texte,
      { name: 'B3 Rolle', selector: '#uebersicht-cockpit .cockpit-role h2' },
      { name: 'B11 Wer macht was', selector: '.execution-triptych' },
    ],
  },
  schritte: [
    {
      label: '#/dashboard (F-914: Rollennamen statt IDs)',
      warteAufSelector: { selector: '.execution-triptych', timeoutMs: 15000 },
      screenshot: 'd1440-dashboard.webp',
    },
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
