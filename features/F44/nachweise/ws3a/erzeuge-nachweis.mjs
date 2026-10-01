/**
 * Datei: features/F44/nachweise/ws3a/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweise F44 WS-3a „Board & Listen“ — kleinste Matrix (F-876), nur die geänderten
 * Seiten:
 * - #/workboard: das Kanban-Board und danach der Listen-Tab „Bugs“ (Klick auf das Register) bei
 *   1440 dunkel und hell (Ausschnitt #view-workboard in ganzer Höhe — ab 1280 px steht die
 *   Chatspalte bis WS-8 daneben), 390 dunkel, 1440 dunkel mit 200 % Zoom und 1440 dunkel auf ru;
 * - #/workboard mit festen Antworten: ein offenes Finding, dessen Workflow über den Auftrag auf
 *   Freigabe wartet (Spalte „Braucht dich“), und eine defekte Workflow-Quelle (Hinweis, Karten nur
 *   nach Status);
 * - #/workboard Bedienung: Ansicht-Chip „Braucht dich“, „+ x weitere“ springt in den Listen-Tab mit
 *   Spaltenfilter, Suche, Tastatur auf „Kanban · Priorität“ (kommt, ohne Wirkung);
 * - nach dem Prüfpass: Tab „Weitere“ mit Typ-Chips und Parser-Befund (escaped), Tab „Features“ ohne
 *   Prioritätschips, Deep-Link auf #/workboard/<id> mit „Schließen“ und erneutem Öffnen über die
 *   Karte, bei 200 % zusätzlich Karten- und Zeileninhalt (Fokus scrollt sie in den Viewport);
 * - #/dashboard bei 1440 dunkel als Regressionsbild (F-913: „Aktuelle Rolle“ folgt der
 *   Entscheidungsliste).
 * Baut je Folge eine klickfolge.json in einem Unterordner und ruft scripts/render-nachweis.mjs auf;
 * Screenshots als WebP.
 *
 * Wird aufgerufen von: Hand, gegen einen laufenden Leitstand dieses Worktrees —
 *   node features/F44/nachweise/ws3a/erzeuge-nachweis.mjs [basis] [nurOrdner]
 *   basis:     Standard http://127.0.0.1:4381
 *   nurOrdner: optional, nur diese Folge (Name des Unterordners)
 * Nicht Teil von `npm run check`.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const basis = process.argv[2] ?? 'http://127.0.0.1:4381'
const nur = process.argv[3]
const ziel = 'features/F44/nachweise/ws3a'

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

const ENTWICKLUNG_BEOBACHTUNG = {
  ...BEOBACHTUNG,
  texte: [
    ...BEOBACHTUNG.texte,
    { name: 'Register aktiv', selector: '#workboard-tabs [aria-pressed="true"]' },
    { name: 'Ansicht-Chip aktiv', selector: '#workboard-ansicht [aria-pressed="true"]' },
    { name: 'Spalte Geplant (Zahl)', selector: '.board-spalte-geplant .board-column-title' },
    { name: 'Spalte In Arbeit (Zahl)', selector: '.board-spalte-in_arbeit .board-column-title' },
    { name: 'Spalte Braucht dich (Zahl)', selector: '.board-spalte-braucht_dich .board-column-title' },
    { name: 'Spalte Abgenommen (Zahl)', selector: '.board-spalte-abgenommen .board-column-title' },
    { name: 'erste Karte Braucht dich', selector: '.board-spalte-braucht_dich .board-item-titel' },
    { name: '+ x weitere (Geplant)', selector: '.board-spalte-geplant .board-weitere-zeile' },
    { name: 'außerhalb', selector: '#workboard-board .board-ausserhalb' },
    { name: 'Hinweis Verknüpfung', selector: '#workboard-board .note' },
    { name: 'Spaltenfilter', selector: '#workboard-spaltenfilter' },
    { name: 'erste Listenzeile', selector: '#workboard-liste .workboard-zeile-titel, #workboard-liste p' },
    { name: 'Parser-Befunde', selector: '#workboard-befunde' },
  ],
  sichtbarkeit: [
    { name: 'Board-Bereich', id: 'workboard-board-bereich' },
    { name: 'Listen-Bereich', id: 'workboard-listen-bereich' },
    { name: 'Detail', id: 'workboard-detail' },
  ],
  vorhanden: [
    { name: 'kommt (aria-disabled) in der Seite', selector: '#view-workboard [aria-disabled="true"]' },
    { name: 'Bento (muss fehlen)', selector: '#workboard-bento, .bento-fokus, .pipeline' },
    { name: 'Filtergruppe Typ sichtbar', selector: '#workboard-filter .filter-chip-gruppe:not([hidden]) #workboard-filter-typ' },
  ],
}

/** Zustands-Aggregat für Folgen mit fester Antwort (nur im Nachweis, nie im Produkt). */
const zustand = (felder) => ({ laeufe: [], startfehler: [], workflows: [], fehler: [], aktiverLauf: { aktiv: false, laufId: null }, pruefbefehl: null, istAiWorkforce: true, ...felder })

const WARTE_BOARD = { warteAufSelector: { selector: '#workboard-board .pm-board, #workboard-board .note.red', timeoutMs: 15000 } }
const WARTE_LISTE = { warteAufSelector: { selector: '#workboard-liste .workboard-zeile, #workboard-liste .leer:not(:empty)', timeoutMs: 15000 } }

/**
 * Folge über #/workboard in einer Darstellung.
 * @param optionen - farbschema, breite, hoehe, zoom, sprache, antworten, schritte, praefix, vollseite
 *   (false bei 390 px und 200 %: die ganze Seite überschreitet dort die WebP-Höchsthöhe von 16 383 px)
 * @returns Klickfolge
 */
function entwicklung({ farbschema = 'dark', breite = 1440, hoehe = 1000, zoom = 1, sprache, antworten, schritte, praefix, vollseite = true } = {}) {
  return {
    url: `${basis}/#/workboard`,
    viewport: { breite, hoehe },
    farbschema,
    zoom,
    screenshotQualitaet: 0.7,
    ...(vollseite && breite / zoom >= 1280 ? { screenshotVollseite: true, screenshotAusschnitt: { selector: '#view-workboard' } } : { screenshotVollseite: vollseite }),
    localStorageSetzen: { ...CHAT_ZU, ...(sprache ? { 'leitstand-sprache': sprache } : {}) },
    ...(antworten ? { anfragenAntworten: antworten } : {}),
    beobachtete: ENTWICKLUNG_BEOBACHTUNG,
    schritte: schritte ?? [
      { label: '#/workboard (Kanban-Board)', ...WARTE_BOARD, screenshot: `${praefix}-board.webp` },
      { label: 'Klick Register „Bugs“', klick: '#workboard-tabs [data-tab="bugs"]', ...WARTE_LISTE, screenshot: `${praefix}-bugs.webp` },
    ],
  }
}

const FINDING_WARTEND = { quelle: 'finding', typ: 'BUG', id: 'F-9001', titel: 'Nachweis: Finding, dessen Workflow auf Freigabe wartet', status: 'OFFEN', statusRoh: 'offen', prioritaet: 'P1' }
const FEATURE_GEPLANT = { quelle: 'feature', typ: 'FEATURE', id: 'F90', titel: 'Nachweis: geplantes Feature', status: 'ENTWURF', pfad: 'features/F90/feature.md' }
const FEATURE_IN_ARBEIT = { quelle: 'feature', typ: 'FEATURE', id: 'F91', titel: 'Nachweis: Feature in Arbeit mit einem sehr langen Titel, der in der Karte umbrechen muss, ohne das Raster zu sprengen', status: 'IN_ARBEIT', pfad: 'features/F91/feature.md' }
const FINDING_ERLEDIGT = { quelle: 'finding', typ: 'HARNESS_IMPROVEMENT', id: 'F-9002', titel: 'Nachweis: erledigtes Finding', status: 'ERLEDIGT', statusRoh: 'erledigt', prioritaet: 'P2' }
const WORKITEMS_FEST = { workitems: [FINDING_WARTEND, FEATURE_GEPLANT, FEATURE_IN_ARBEIT, FINDING_ERLEDIGT], befunde: [], fehler: [] }
const AUFTRAEGE_FEST = [{ auftragId: 'nachweis-a1', titel: 'Nachweis-Auftrag', erstellt_am: '2026-10-01T08:00:00Z', workitem_referenz: 'workitem:finding:F-9001' }]
const WORKFLOW_WARTEND = { workflowId: 'nachweis-w1', auftragId: 'nachweis-a1', ziel: 'Nachweis', status: 'LAEUFT', aktiverSchrittId: 's1', grund: null, naechster: { art: 'haltFreigabe', schrittId: 's1' } }

const folgen = {
  'entwicklung-dunkel-1440': entwicklung({ praefix: 'd1440' }),
  'entwicklung-hell-1440': entwicklung({ farbschema: 'light', praefix: 'l1440' }),
  'entwicklung-dunkel-390': entwicklung({ breite: 390, hoehe: 844, praefix: 'd390', vollseite: false }),
  'entwicklung-dunkel-1440-zoom200': entwicklung({
    zoom: 2,
    vollseite: false,
    schritte: [
      { label: '#/workboard (Kanban-Board)', ...WARTE_BOARD, screenshot: 'd1440z2-board.webp' },
      // Fokus scrollt die erste Karte bzw. Listenzeile in den Viewport — so ist der Inhalt bei 200 % belegt.
      { label: 'Fokus erste Karte (Board-Inhalt bei 200 %)', fokus: '.board-spalte-geplant .board-item >> nth=0', screenshot: 'd1440z2-board-karten.webp' },
      { label: 'Klick Register „Bugs“', klick: '#workboard-tabs [data-tab="bugs"]', ...WARTE_LISTE, screenshot: 'd1440z2-bugs.webp' },
      { label: 'Fokus erste Listenzeile (Listeninhalt bei 200 %)', fokus: '#workboard-liste .workboard-zeile >> nth=0', screenshot: 'd1440z2-bugs-zeilen.webp' },
    ],
  }),
  'entwicklung-ru-1440': entwicklung({ sprache: 'ru', praefix: 'ru1440' }),
  'entwicklung-braucht-dich': entwicklung({
    antworten: [
      { muster: '**/api/workitems*', json: WORKITEMS_FEST },
      { muster: '**/api/auftraege', json: AUFTRAEGE_FEST },
      { muster: '**/api/zustand', json: zustand({ workflows: [WORKFLOW_WARTEND] }) },
    ],
    schritte: [
      { label: '#/workboard', warteAufSelector: { selector: '.board-spalte-braucht_dich .board-item', timeoutMs: 15000 }, screenshot: 'd1440-braucht-dich.webp' },
      { label: 'Klick Karte unter „Braucht dich“ öffnet das bestehende Detail', klick: '.board-spalte-braucht_dich .board-item', warteAufSelector: { selector: '#workboard-detail:not([hidden]) #workboard-detail-inhalt h3', timeoutMs: 5000 }, screenshot: 'd1440-braucht-dich-detail.webp' },
    ],
  }),
  'entwicklung-weitere-befunde': entwicklung({
    antworten: [
      {
        muster: '**/api/workitems*',
        json: {
          workitems: [
            ...WORKITEMS_FEST.workitems,
            { quelle: 'finding', typ: 'TECH_DEBT', id: 'F-9003', titel: 'Nachweis: technische Schuld', status: 'OFFEN', statusRoh: 'offen', prioritaet: 'P2' },
            { quelle: 'finding', typ: 'PROCESS_IMPROVEMENT', id: 'F-9004', titel: 'Nachweis: Prozessverbesserung', status: 'SONSTIGES', statusRoh: 'zurückgestellt', prioritaet: 'P3' },
          ],
          befunde: [{ quelle: 'finding', art: 'nicht_parsebare_kopfzeile', meldung: 'Nachweis: Kopfzeile <b>nicht</b> lesbar (Zeile 7)' }],
          fehler: [],
        },
      },
      { muster: '**/api/auftraege', json: AUFTRAEGE_FEST },
    ],
    schritte: [
      { label: '#/workboard mit Parser-Befund (E6, HTML escaped)', ...WARTE_BOARD, screenshot: 'd1440-befunde-board.webp' },
      { label: 'Klick Register „Weitere“ (Typ-Chips TECH_DEBT/PROCESS_IMPROVEMENT, E5)', klick: '#workboard-tabs [data-tab="weitere"]', ...WARTE_LISTE, screenshot: 'd1440-weitere.webp' },
      { label: 'Klick Register „Features“ (keine Prioritätschips)', klick: '#workboard-tabs [data-tab="features"]', ...WARTE_LISTE, screenshot: 'd1440-features.webp' },
    ],
  }),
  'entwicklung-deeplink': {
    ...entwicklung({
      antworten: [
        { muster: '**/api/workitems*', json: WORKITEMS_FEST },
        { muster: '**/api/auftraege', json: AUFTRAEGE_FEST },
      ],
      schritte: [
        { label: 'Deep-Link #/workboard/F-9001 (Detail nach dem Laden nachgerendert)', warteAufSelector: { selector: '#workboard-detail:not([hidden]) #workboard-detail-inhalt h3', timeoutMs: 15000 }, screenshot: 'd1440-deeplink.webp' },
        { label: 'Schließen, dann dieselbe Karte erneut: Detail öffnet wieder', klick: '#workboard-detail-schliessen' },
        { label: 'Klick Karte F-9001', klick: '.board-spalte-geplant .board-item >> nth=0', warteAufSelector: { selector: '#workboard-detail:not([hidden])', timeoutMs: 5000 }, screenshot: 'd1440-deeplink-wieder.webp' },
      ],
    }),
    url: `${basis}/#/workboard/F-9001`,
  },
  'entwicklung-workflows-defekt': entwicklung({
    antworten: [
      { muster: '**/api/workitems*', json: WORKITEMS_FEST },
      { muster: '**/api/auftraege', json: AUFTRAEGE_FEST },
      { muster: '**/api/zustand', json: zustand({ workflows: null, fehler: [{ quelle: 'workflows', grund: 'Nachweis' }] }) },
    ],
    schritte: [{ label: '#/workboard, Workflow-Quelle defekt', warteAufSelector: { selector: '#workboard-board .note.amber', timeoutMs: 15000 }, screenshot: 'd1440-workflows-defekt.webp' }],
  }),
  'entwicklung-bedienung': entwicklung({
    schritte: [
      { label: '#/workboard', ...WARTE_BOARD },
      // Playwright klickt aria-disabled-Knöpfe nicht an; die Sperre für Klicks belegt kommt.test.mjs.
      { label: 'Tastatur: Enter auf „Kanban · Priorität“ (kommt: keine Wirkung, Board bleibt)', fokus: '#workboard-modi [aria-disabled="true"] >> nth=0', taste: 'Enter', screenshot: 'd1440-bedienung-1-kommt.webp' },
      { label: 'Ansicht-Chip „Braucht dich“: nur diese Spalte', klick: '#workboard-ansicht [data-ansicht="braucht_dich"]', screenshot: 'd1440-bedienung-2-ansicht.webp' },
      { label: 'Ansicht-Chip „Geplant“', klick: '#workboard-ansicht [data-ansicht="geplant"]' },
      { label: 'Klick erster Sprung „+ x weitere“: Listen-Tab mit Spaltenfilter', klick: '.board-spalte-geplant .board-weitere >> nth=0', ...WARTE_LISTE, screenshot: 'd1440-bedienung-3-weitere.webp' },
      { label: 'Suche „akte“ (ohne Groß-/Kleinschreibung)', tippen: { selector: '#workboard-suche', text: 'akte' }, screenshot: 'd1440-bedienung-4-suche.webp' },
      { label: 'Spaltenfilter entfernen', klick: '#workboard-spaltenfilter [data-spalte-entfernen]', screenshot: 'd1440-bedienung-5-ohne-spalte.webp' },
    ],
  }),
  'dashboard-dunkel-1440': {
    url: `${basis}/#/dashboard`,
    viewport: { breite: 1440, hoehe: 1000 },
    farbschema: 'dark',
    screenshotQualitaet: 0.7,
    screenshotVollseite: true,
    screenshotAusschnitt: { selector: '#view-dashboard' },
    localStorageSetzen: CHAT_ZU,
    beobachtete: {
      ...BEOBACHTUNG,
      texte: [
        ...BEOBACHTUNG.texte,
        { name: 'B3 Rolle', selector: '#uebersicht-cockpit .cockpit-role h2' },
        { name: 'B7 erste Entscheidung', selector: '#uebersicht-fokus .pm-decision h3' },
      ],
    },
    schritte: [
      {
        label: '#/dashboard (Regression F-913)',
        warteAufSelector: { selector: '#uebersicht-cockpit .cockpit-role h2, #uebersicht-erster-schritt .first-step', timeoutMs: 15000 },
        screenshot: 'd1440-dashboard.webp',
      },
    ],
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
