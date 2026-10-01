/**
 * Datei: features/F44/nachweise/ws5b/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweise F44 WS-5b „Auftrag & Direktstart“ (`#/projekt`, Vorlage V10 d_auftrag_neu,
 * Abgleich F-725 F1, G10, G11; E-F44-3 = A) — kleinste Matrix (F-876), nur die geänderte Seite, mit
 * festen Antworten (nie im Produkt):
 * - je Darstellung (1440 dunkel und hell, 390 dunkel, 1440 dunkel mit 200 % Zoom, 1440 ru) EINE Folge:
 *   leer; ausgefüllt mit offenem Kontext; „Ablauf vorbereiten“ → Schritt 2 wartet; „Neuen Auftrag
 *   beschreiben“ und erneut → 409 (D13) als bernsteinfarbene Notiz; „Erneut versuchen“ → Startfehler
 *   zu genau dieser laufId als rote Notiz; „Fortsetzung vorbereiten“ an einem fehlgeschlagenen Lauf →
 *   Direktstart offen mit Wiederaufnahme-Hinweis und Fokus;
 * - reduzierte Bewegung (1440 dunkel): leer und Schritt 2;
 * - Zustände (1440 dunkel): Anlegefehler am Formular, Schritt 2 mit gesperrtem „Auftrag ohne Ablauf
 *   anlegen“, Ablauf erscheint während der Nutzer woanders ist → „bereit“ → Klick „Ablauf prüfen“,
 *   Lauf-Detail 404 mit „Erneut laden“ (Prüfpunkt WS-5a);
 * - Hauptweg (1440 dunkel): der Ablauf `router-<auftragId>` erscheint im Aggregat → Navigation zu
 *   `#/workflows/<id>`, dort der bestehende Freigabeknopf (keine zweite Freigabe-UI); „Auftrag anlegen“
 *   aus `#/runs` und „← Alle Aufträge“ zurück (history.back()).
 * Baut je Folge eine klickfolge.json in einem Unterordner und ruft scripts/render-nachweis.mjs auf;
 * Screenshots als WebP. Vor dem Lauf leert das Skript die Ausgabeordner GENAU der Folgen, die es neu
 * erzeugt (fs.rmSync, recursive, force) — fremde Ordner und das Skript selbst bleiben unberührt.
 *
 * Wird aufgerufen von: Hand, gegen einen laufenden Leitstand dieses Worktrees —
 *   LEITSTAND_PORT=4382 node scripts/leitstand-server.mjs
 *   node features/F44/nachweise/ws5b/erzeuge-nachweis.mjs [basis] [nurOrdner]
 *   basis:     Standard http://127.0.0.1:4382
 *   nurOrdner: optional, nur diese Folge (Name des Unterordners)
 * Nicht Teil von `npm run check`.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const basis = process.argv[2] ?? 'http://127.0.0.1:4382'
const nur = process.argv[3]
const ziel = 'features/F44/nachweise/ws5b'

/** Chatspalte eingeklappt (Vorlage: Chat als Dock, WS-8) — ab 1280 px bleibt sie trotzdem sichtbar. */
const CHAT_ZU = { 'leitstand-chat-offen': 'false' }

const BEOBACHTUNG = {
  texte: [
    { name: 'Ansicht', selector: '[data-view]:not([hidden])', attribut: 'data-view' },
    { name: 'data-theme', selector: 'html', attribut: 'data-theme' },
    { name: 'lang', selector: 'html', attribut: 'lang' },
    { name: 'Fokus-ID', selector: ':focus', attribut: 'id' },
    { name: 'Schritt aktuell', selector: '#auftrag-schritte [aria-current="step"]' },
    { name: 'Notiz Schritt 2', selector: '#auftrag-vorbereitung-notiz' },
    { name: 'Notiz-Klasse', selector: '#auftrag-vorbereitung-notiz', attribut: 'class' },
    { name: 'Fehler Anlegen', selector: '#auftrag-anlegen-fehler' },
    { name: 'Ablauf-Titel', selector: '#workflow-detail-titel' },
  ],
  sichtbarkeit: [
    { name: 'Formular (Schritt 1)', id: 'auftrag-formular' },
    { name: 'Schritt 2', id: 'auftrag-vorbereitung' },
    { name: 'Wiederaufnahme-Hinweis', id: 'start-wiederaufnahme-hinweis' },
    { name: 'Ablauf-Seite', id: 'workflow-detail' },
    { name: 'Sperrhinweis „ohne Ablauf“', id: 'direktstart-anlegen-gesperrt' },
    { name: 'Lauf-Fehlerzustand', id: 'lauf-detail-fehler' },
  ],
  vorhanden: [
    { name: 'Coach „kommt“ (aria-disabled)', selector: '#auftrag-aktionen .kommt-knopf[aria-disabled="true"]' },
    { name: 'Knopf „Erneut versuchen“', selector: '#auftrag-vorbereitung [data-aktion="erneut"]' },
    { name: 'Direktstart offen', selector: '#direktstart[open]' },
    { name: '„Auftrag ohne Ablauf anlegen“ gesperrt', selector: '#auftrag-anlegen:disabled' },
    { name: 'Knopf „Erneut laden“ (Lauf-Detail)', selector: '#lauf-detail-fehler [data-aktion="erneut-laden"]' },
    { name: 'Freigabe auf der Ablauf-Seite', selector: '#workflow-aktionen [data-aktion="freigabe-oeffnen"]' },
    { name: 'zweite Live-Region (muss fehlen)', selector: '#view-projekt [aria-live]' },
  ],
  ueberlauf: true,
}

/** Zustands-Aggregat für Folgen mit fester Antwort. */
const zustand = (felder) => ({ laeufe: [], startfehler: [], workflows: [], fehler: [], aktiverLauf: { aktiv: false, laufId: null }, pruefbefehl: null, istAiWorkforce: true, ...felder })

/** Aufträge der Auswahl im Direktstart (G11). */
const AUFTRAEGE = [
  { auftragId: 'a-browser', titel: 'Browser-Prüfung', erstellt_am: '2026-10-01T10:30:00.000Z' },
  { auftragId: 'a-login', titel: 'Login-Seite reparieren', erstellt_am: '2026-10-01T09:12:00.000Z' },
]
const WERKZEUGSAETZE = [
  { name: 'lesen', modus: 'nur_lesen', erlaubte_werkzeuge: ['Read', 'Grep', 'Glob'] },
  { name: 'bearbeiten', modus: 'schreiben', erlaubte_werkzeuge: ['Read', 'Edit', 'Write'] },
]

/** Fehlgeschlagener Lauf für „Fortsetzung vorbereiten“ (Wiederaufnahme, D-F10-1). */
const cp = (sequenz, zeit, typ, felder = {}) => ({ sequenz, zeitstempel: `2026-10-01T${zeit}:00.000Z`, gueltig: true, typ, ...felder })
const LAUF_FEHL = {
  laufId: 'nw-fehl',
  fortschritt: null,
  scoutErgebnis: null,
  laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'FEHLGESCHLAGEN', terminalSequenz: 2 },
  aktiv: false,
  verweigertDaten: null,
  auftrag: { status: 'ok', auftragId: 'a-browser', titel: 'Browser-Prüfung', auftragstext: 'Prüfe die Abnahme-Seite im Browser.' },
  kontextpaket: { status: 'ok', rolle: 'qa', elemente: [{ pfad: 'artefakt:kontext-nw' }, { pfad: 'features/F35/feature.md' }, { pfad: 'public/leitstand/views/projekt.js' }], ausgeschlossen: [] },
  laufakte: { status: 'nicht_vorhanden' },
  rohstrom: { status: 'laufakte_fehlt' },
  checkpoints: [cp(1, '10:31', 'wirkungsmarke', { wirkungsmarke: { art: 'run_prepared' } }), cp(2, '10:42', 'wirkungsmarke', { wirkungsmarke: { art: 'terminal', ergebnis: 'FEHLGESCHLAGEN' } })],
}
const LAEUFE = [{ laufId: 'nw-fehl', laufStatus: LAUF_FEHL.laufStatus, ergebnis: 'FEHLGESCHLAGEN', zeitpunkt: '2026-10-01T10:42:00.000Z', auftragsbezug: { auftragId: 'a-browser', titel: 'Browser-Prüfung' }, anzahlCheckpoints: 2, kettenintegritaet: true, kenntnisgenommen: false }]

/** Vorgeschlagener Ablauf des Hauptwegs (Freigabe-Halt am ersten Schritt, ZWINGEND). */
const WORKFLOW_H = {
  daten: { workflow_id: 'router-nw-h', auftrag_id: 'nw-h', version: 1, ziel: 'Login-Seite reparieren', status: 'WARTET_FREIGABE', aktiver_schritt_id: 's1', grund: null, schritte: [{ schritt_id: 's1', rolle: 'ausfuehrung', worker: 'claude-code', modell: 'claude-sonnet', freigabe: 'ZWINGEND', status: 'WARTET_FREIGABE', nachfolger: 's2', lauf_id: null, zeitgrenze_ms: 900000 }, { schritt_id: 's2', rolle: 'code-reviewer', worker: 'codex', modell: 'gpt-5', freigabe: 'KEINE', status: 'OFFEN', nachfolger: null, lauf_id: null, zeitgrenze_ms: 900000 }] },
  versionSequenz: 1,
  verstoesse: [],
  naechster: { art: 'haltFreigabe', grund: 'Schritt s1 verlangt eine Freigabe', schrittId: 's1' },
  architekturEntscheidung: null,
  empfehlung: null,
}
const ABNAHME_H = { workflowStatus: 'WARTET_FREIGABE', freigabeHalt: { schrittId: 's1' }, entscheidung: { status: 'fehlt' }, urteil: { status: 'noch_nicht_gelaufen' }, aenderungsuebersicht: { status: 'noch_nicht_gelaufen' }, pruefergebnis: { status: 'noch_nicht_gelaufen' } }
const WORKFLOW_LISTE_H = [{ workflowId: 'router-nw-h', auftragId: 'nw-h', ziel: 'Login-Seite reparieren', versionSequenz: 1, status: 'WARTET_FREIGABE', aktiverSchrittId: 's1', grund: null, schritteAnzahl: 2, naechster: WORKFLOW_H.naechster }]

/** Feste Antworten aller Folgen; spätere Einträge (auch je Schritt) haben Vorrang. */
const ANTWORTEN = [
  { muster: '**/api/zustand', json: zustand({ laeufe: LAEUFE }) },
  { muster: '**/api/auftraege', methode: 'GET', json: AUFTRAEGE },
  { muster: '**/api/startvorlage/werkzeugsaetze', json: WERKZEUGSAETZE },
  { muster: '**/api/laeufe/nw-fehl', methode: 'GET', json: LAUF_FEHL },
  { muster: '**/api/workflows/router-nw-h', json: WORKFLOW_H },
  { muster: '**/api/workflows/router-nw-h/abnahme', json: ABNAHME_H },
]

/**
 * Eine Folge. Seitenbilder als Ausschnitt #view-projekt ab 1280 CSS-px, sonst Vollseite.
 * @param optionen - hash, schritte, antworten, farbschema, breite, hoehe, zoom, sprache
 * @returns Klickfolge
 */
function folge({ hash, schritte, antworten = [], farbschema = 'dark', breite = 1440, hoehe = 1000, zoom = 1, sprache, ausschnitt = '#view-projekt', reduzierteBewegung = false }) {
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
const routen = (auftragId, status, json) => ({ muster: `**/api/auftraege/${auftragId}/routen`, methode: 'POST', status, json })
const anlegen = (auftragId) => ({ muster: '**/api/auftraege', methode: 'POST', status: 201, json: { auftragId } })

const DARSTELLUNGEN = {
  'dunkel-1440': { praefix: 'd1440' },
  'hell-1440': { praefix: 'l1440', farbschema: 'light' },
  'dunkel-390': { praefix: 'd390', breite: 390, hoehe: 844 },
  'dunkel-1440-zoom200': { praefix: 'd1440z2', zoom: 2 },
  'ru-1440': { praefix: 'ru1440', sprache: 'ru' },
}

const folgen = {}

for (const [name, { praefix, ...darstellung }] of Object.entries(DARSTELLUNGEN)) {
  folgen[`matrix-${name}`] = folge({
    hash: '#/projekt',
    schritte: [
      { label: 'Leer: Eyebrow, Frage, Schrittanzeige (1 aktuell), Titel, Ergebnis, Kontext zu, Notiz, „Ablauf vorbereiten“, Coach „kommt“, Direktstart zu', ...warte('#start-auftrag option[value="a-browser"]', 15000, 'attached'), screenshot: `${praefix}-1-leer.webp` },
      {
        label: 'Ausgefüllt, „Kontext hinzufügen · optional“ offen',
        tippen: { selector: '#auftrag-titel', text: 'Login-Seite reparieren' },
      },
      { label: 'Ergebnis tippen', tippen: { selector: '#auftrag-auftragstext', text: 'Nach dem Login landet man wieder auf der Übersicht, auch bei abgelaufener Sitzung.' } },
      { label: 'Kontext öffnen', klick: '#auftrag-kontext-bereich summary' },
      { label: 'Kontext tippen', tippen: { selector: '#auftrag-kontext', text: 'Betrifft public/leitstand/app.js; Fehlerbild im Ticket vom 30.09.' }, screenshot: `${praefix}-2-ausgefuellt-kontext.webp` },
      {
        label: 'Klick „Ablauf vorbereiten“ → 201, routen → 202: Schritt 2 „Jarvis bereitet den Ablauf vor …“ mit Auftrag und laufId, Fokus auf der Notiz',
        anfragenAntworten: [anlegen('nw-a1'), routen('nw-a1', 202, { laufId: 'router-nw-a1-1759312800000' })],
        klick: '#auftrag-ablauf-vorbereiten',
        ...warte('#auftrag-vorbereitung-notiz [data-aktion="neu"]'),
        screenshot: `${praefix}-3-schritt2-wartet.webp`,
      },
      { label: '„Neuen Auftrag beschreiben“ → Schritt 1, Text steht noch', klick: '#auftrag-vorbereitung [data-aktion="neu"]', ...warte('#auftrag-formular') },
      {
        label: 'Erneut „Ablauf vorbereiten“ → 201, routen → 409 (D13): bernsteinfarbene Notiz mit grund roh, „Erneut versuchen“',
        anfragenAntworten: [anlegen('nw-a2'), routen('nw-a2', 409, { grund: "ein anderer, über diese Serverinstanz gestarteter Lauf ('router-a-bau-1759310000000') ist noch aktiv (D13) — genau ein aktiver Arbeitsstrang" })],
        klick: '#auftrag-ablauf-vorbereiten',
        ...warte('#auftrag-vorbereitung .note.amber'),
        screenshot: `${praefix}-4-konflikt-409.webp`,
      },
      {
        label: '„Erneut versuchen“ routet denselben Auftrag → 202; das Aggregat meldet einen Startfehler zu genau dieser laufId: rote Notiz, Fehler roh',
        anfragenAntworten: [
          routen('nw-a2', 202, { laufId: 'router-nw-a2-1759312900000' }),
          { muster: '**/api/zustand', json: zustand({ laeufe: LAEUFE, startfehler: [{ zeitstempel: '2026-10-01T10:55:00.000Z', laufId: 'router-nw-a2-1759312900000', fehler: "Router-Lauf 'router-nw-a2-1759312900000' ok:true, aber Laufakte 'laufakte-router-nw-a2-1759312900000' nicht gefunden" }] }) },
        ],
        klick: '#auftrag-vorbereitung [data-aktion="erneut"]',
        ...warte('#auftrag-vorbereitung .note.red', 15000),
        screenshot: `${praefix}-5-startfehler.webp`,
      },
      { label: 'Zum fehlgeschlagenen Lauf', navigiere: '#/runs/nw-fehl', ...warte('#lauf-notiz [data-aktion="fortsetzung"]') },
      {
        label: '„Fortsetzung vorbereiten“ → #/projekt, Direktstart offen mit Wiederaufnahme-Hinweis, Auftrag und Evidenzdateien vorbelegt, Fokus auf dem Direktstart',
        klick: '#lauf-notiz [data-aktion="fortsetzung"]',
        ...warte('#direktstart[open] #start-wiederaufnahme-hinweis'),
        screenshot: `${praefix}-6-direktstart-wiederaufnahme.webp`,
      },
    ],
    ...darstellung,
  })
}

folgen['hauptweg'] = folge({
  hash: '#/runs',
  ausschnitt: '#view-runs',
  schritte: [
    { label: '#/runs (Register „Aufträge“)', ...warte('#view-runs a[href="#/projekt"]') },
    { label: 'Klick „Auftrag anlegen“ → #/projekt', klick: '#view-runs a[href="#/projekt"]', ...warte('#auftrag-formular') },
    { label: 'Klick „← Alle Aufträge“ → history.back(), zurück auf #/runs', klick: '#auftrag-zurueck', ...warte('#view-runs:not([hidden])') },
    { label: 'Wieder #/projekt', navigiere: '#/projekt', ...warte('#auftrag-formular') },
    { label: 'Titel tippen', tippen: { selector: '#auftrag-titel', text: 'Login-Seite reparieren' } },
    { label: 'Ergebnis tippen', tippen: { selector: '#auftrag-auftragstext', text: 'Nach dem Login landet man wieder auf der Übersicht.' } },
    {
      label: '„Ablauf vorbereiten“ → 201, 202: Schritt 2 wartet',
      anfragenAntworten: [anlegen('nw-h'), routen('nw-h', 202, { laufId: 'router-nw-h-1759313000000' })],
      klick: '#auftrag-ablauf-vorbereiten',
      ...warte('#auftrag-vorbereitung-notiz'),
      ohneAusschnitt: true,
      screenshotVollseite: false,
      screenshot: 'd1440-hauptweg-1-wartet.webp',
    },
    {
      label: 'Das Aggregat zeigt den Ablauf router-nw-h → Navigation zu #/workflows/router-nw-h; dort der bestehende Freigabeknopf (F3), keine zweite Freigabe-UI',
      anfragenAntworten: [{ muster: '**/api/zustand', json: zustand({ laeufe: LAEUFE, workflows: WORKFLOW_LISTE_H }) }],
      ...warte('#workflow-aktionen [data-aktion="freigabe-oeffnen"]', 15000),
      screenshot: 'd1440-hauptweg-2-ablauf.webp',
    },
    { label: 'Zurück auf #/projekt: wieder Schritt 1, Felder geleert (Bild als Viewport)', navigiere: '#/projekt', ...warte('#auftrag-formular'), ohneAusschnitt: true, screenshotVollseite: false, screenshot: 'd1440-hauptweg-3-geleert.webp' },
  ],
})

folgen['bewegung-reduziert'] = folge({
  hash: '#/projekt',
  reduzierteBewegung: true,
  schritte: [
    { label: 'Reduzierte Bewegung: leer (die Seite hat keine eigene Animation)', ...warte('#start-auftrag option[value="a-browser"]', 15000, 'attached'), screenshot: 'd1440-rm-1-leer.webp' },
    { label: 'Titel tippen', tippen: { selector: '#auftrag-titel', text: 'Login-Seite reparieren' } },
    { label: 'Ergebnis tippen', tippen: { selector: '#auftrag-auftragstext', text: 'Nach dem Login landet man wieder auf der Übersicht.' } },
    {
      label: 'Reduzierte Bewegung: Schritt 2 wartet',
      anfragenAntworten: [anlegen('nw-rm'), routen('nw-rm', 202, { laufId: 'router-nw-rm-1759313100000' })],
      klick: '#auftrag-ablauf-vorbereiten',
      ...warte('#auftrag-vorbereitung-notiz'),
      screenshot: 'd1440-rm-2-wartet.webp',
    },
  ],
})

folgen['zustaende'] = folge({
  hash: '#/projekt',
  schritte: [
    { label: 'Seite geladen', ...warte('#start-auftrag option[value="a-browser"]', 15000, 'attached') },
    { label: 'Nur Ergebnis, kein Titel', tippen: { selector: '#auftrag-auftragstext', text: 'Ohne Titel.' } },
    {
      label: '„Ablauf vorbereiten“ → 400: Fehler am Formular mit Fokus, Eingaben bleiben, Schritt 1',
      anfragenAntworten: [{ muster: '**/api/auftraege', methode: 'POST', status: 400, json: { grund: "'titel' muss ein nicht-leerer String sein" } }],
      klick: '#auftrag-ablauf-vorbereiten',
      ...warte('#auftrag-anlegen-fehler:not([hidden])', 10000),
      screenshot: 'd1440-zustand-1-anlegefehler.webp',
    },
    { label: 'Titel nachtragen', tippen: { selector: '#auftrag-titel', text: 'Login-Seite reparieren' } },
    {
      label: '„Ablauf vorbereiten“ → 201, 202: Schritt 2; Direktstart öffnen — „Auftrag ohne Ablauf anlegen“ gesperrt mit Hinweis',
      anfragenAntworten: [anlegen('nw-b'), routen('nw-b', 202, { laufId: 'router-nw-b-1759313200000' })],
      klick: '#auftrag-ablauf-vorbereiten',
      ...warte('#auftrag-vorbereitung-notiz'),
    },
    { label: 'Direktstart öffnen', klick: '#direktstart-titel', ...warte('#direktstart-anlegen-gesperrt'), screenshot: 'd1440-zustand-2-schritt2-gesperrt.webp' },
    { label: 'Woanders hin (#/dashboard)', navigiere: '#/dashboard', ...warte('#view-dashboard:not([hidden])') },
    {
      label: 'Der Ablauf erscheint im Aggregat, während der Nutzer woanders ist — kein Sprung',
      anfragenAntworten: [{ muster: '**/api/zustand', json: zustand({ laeufe: LAEUFE, workflows: [{ ...WORKFLOW_LISTE_H[0], workflowId: 'router-nw-b', auftragId: 'nw-b' }] }) }, { muster: '**/api/workflows/router-nw-b', json: { ...WORKFLOW_H, daten: { ...WORKFLOW_H.daten, workflow_id: 'router-nw-b', auftrag_id: 'nw-b' } } }, { muster: '**/api/workflows/router-nw-b/abnahme', json: ABNAHME_H }],
      // Die Übersicht verlinkt den wartenden Ablauf, sobald ein Poll-Tick das neue Aggregat gebracht hat.
      ...warte('#view-dashboard a[href="#/workflows/router-nw-b"]', 15000, 'attached'),
    },
    { label: 'Zurück auf #/projekt: „Der Ablauf ist vorbereitet“ mit „Ablauf prüfen“', navigiere: '#/projekt', ...warte('#auftrag-vorbereitung [data-aktion="pruefen"]', 15000), screenshot: 'd1440-zustand-3-bereit.webp' },
    { label: 'Klick „Ablauf prüfen“ → #/workflows/router-nw-b mit dem bestehenden Freigabeknopf', klick: '#auftrag-vorbereitung [data-aktion="pruefen"]', ...warte('#workflow-aktionen [data-aktion="freigabe-oeffnen"]', 15000) },
    { label: 'Zurück auf #/projekt: Schritt 1, Felder leer', navigiere: '#/projekt', ...warte('#auftrag-formular'), screenshot: 'd1440-zustand-4-nach-pruefen.webp' },
    {
      label: 'Lauf-Detail 404 → Fehlerzustand mit „Erneut laden“ (Prüfpunkt WS-5a)',
      anfragenAntworten: [{ muster: '**/api/laeufe/nw-weg', methode: 'GET', status: 404, json: { grund: "Lauf 'nw-weg' nicht gefunden" } }],
      navigiere: '#/runs/nw-weg',
      ...warte('#lauf-detail-fehler [data-aktion="erneut-laden"]', 10000),
      ohneAusschnitt: true,
      screenshotVollseite: false,
      screenshot: 'd1440-zustand-5-lauf-erneut-laden.webp',
    },
    {
      label: 'Klick „Erneut laden“ → jetzt ladbar: das Detail erscheint, der Fehler verschwindet',
      anfragenAntworten: [{ muster: '**/api/laeufe/nw-weg', methode: 'GET', json: { ...LAUF_FEHL, laufId: 'nw-weg' } }],
      klick: '#lauf-detail-fehler [data-aktion="erneut-laden"]',
      ...warte('#lauf-notiz [data-aktion="fortsetzung"]', 10000),
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
