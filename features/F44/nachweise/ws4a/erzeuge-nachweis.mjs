/**
 * Datei: features/F44/nachweise/ws4a/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweise F44 WS-4a „Ablauf & Freigabe“ — kleinste Matrix (F-876), nur die
 * geänderten Seiten, mit festen Antworten (nie im Produkt):
 * - Liste #/runs (Seitenkopf, „Aufträge“ mit Lage je Zeile, Startfehler und Läufe darunter) —
 *   1440 dunkel und hell, 390 dunkel, 1440 dunkel mit 200 % Zoom, 1440 ru; bei 1440 dunkel dazu
 *   Zeile → Detail → „← Alle Aufträge“ (history.back, Fokus auf der Zeile, F-926-Muster);
 * - Detail im Freigabe-Halt mit Katalog-Empfehlung, Dialog „Nächsten Schritt freigeben“ offen —
 *   in denselben fünf Darstellungen;
 * - Dialog mit Freigabefehler 409 (Dialog bleibt offen, Meldung im Dialog);
 * - Dialog schließt bei Stand-Änderung (Begründung angefangen, der Poll meldet einen neuen Stand);
 * - Ablehnen (Freigabe-Veto) mit Pflichtbegründung → Meldung am Ablauf;
 * - Stoppen-Dialog (Pflichtmeldung bei leerer Begründung, Escape schließt ohne Wirkung);
 * - Detail „läuft“ (aktiver Lauf, nur „Ausführung stoppen“);
 * - Detail KLAERUNG_ERFORDERLICH mit Architekt-Frage (alter Bedienblock sichtbar, nur 1440 dunkel);
 * - F12 „Technischer Ablauf & Serverentscheidung“ aufgeklappt;
 * - reduzierte Bewegung (Detail im Freigabe-Halt).
 * Baut je Folge eine klickfolge.json in einem Unterordner und ruft scripts/render-nachweis.mjs auf;
 * Screenshots als WebP.
 *
 * Wird aufgerufen von: Hand, gegen einen laufenden Leitstand dieses Worktrees —
 *   node features/F44/nachweise/ws4a/erzeuge-nachweis.mjs [basis] [nurOrdner]
 *   basis:     Standard http://127.0.0.1:4381
 *   nurOrdner: optional, nur diese Folge (Name des Unterordners)
 * Nicht Teil von `npm run check`.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const basis = process.argv[2] ?? 'http://127.0.0.1:4381'
const nur = process.argv[3]
const ziel = 'features/F44/nachweise/ws4a'

/** Chatspalte eingeklappt (Vorlage: Chat als Dock, WS-8) — sonst bestimmt ihre Länge die Vollseite. */
const CHAT_ZU = { 'leitstand-chat-offen': 'false' }

const BEOBACHTUNG = {
  texte: [
    { name: 'Ansicht', selector: '[data-view]:not([hidden])', attribut: 'data-view' },
    { name: 'data-theme', selector: 'html', attribut: 'data-theme' },
    { name: 'lang', selector: 'html', attribut: 'lang' },
    { name: 'Fokus', selector: ':focus' },
    { name: 'Fokus-ID', selector: ':focus', attribut: 'id' },
    { name: 'Titel', selector: '#workflow-detail-titel' },
    { name: 'Aktionen', selector: '#workflow-aktionen' },
    { name: 'Auf einen Blick', selector: '#workflow-blick' },
    { name: 'Meldung', selector: '#workflow-bedienung-meldung' },
    { name: 'Dialog offen', selector: '#workflow-dialog', attribut: 'open' },
    { name: 'Dialogtitel', selector: '#workflow-dialog-titel' },
    { name: 'Dialogmeldung', selector: '#workflow-dialog-meldung' },
  ],
  sichtbarkeit: [
    { name: 'Kopf + Liste', id: 'runs-kopf' },
    { name: 'Startfehler', id: 'startfehler-abschnitt' },
    { name: 'Läufe', id: 'laeufe' },
    { name: 'Detailseite', id: 'workflow-detail' },
  ],
  vorhanden: [
    { name: 'Freigeben & starten mit data-empfehlung-ids', selector: '#workflow-dialog [data-aktion="freigeben"][data-empfehlung-ids]' },
    { name: 'Ablehnen im Dialog', selector: '#workflow-dialog [data-aktion="ablehnen"]' },
    { name: 'Freigeben & installieren im Dialog', selector: '#workflow-dialog [data-installation-aktion]' },
    { name: 'aria-live im Dialog (muss fehlen)', selector: '#workflow-dialog [aria-live], #workflow-dialog[aria-live]' },
    { name: 'alter Bedienblock (Architekt)', selector: '#workflow-bedienung .wf-architektur-entscheidung' },
    { name: 'Begründung im Feld', selector: '#wf-freigabe-begruendung:not(:placeholder-shown)' },
  ],
  ueberlauf: true,
}

/** Zustands-Aggregat für Folgen mit fester Antwort. */
const zustand = (felder) => ({ laeufe: [], startfehler: [], workflows: [], fehler: [], aktiverLauf: { aktiv: false, laufId: null }, pruefbefehl: null, istAiWorkforce: true, ...felder })

/** Verdikt, solange der Cursor-Schritt schon einen Lauf trägt (src/workflow/index.ts: ein gelaufener Schritt startet nicht zweimal) — die Lage zeigt trotzdem „läuft“ (status LAEUFT hat Vorrang). */
const LAEUFT_GRUND = "Schritt 's2' trägt bereits den Lauf 'nachweis-l2' und wird nicht erneut gestartet"

/** Die Liste „Aufträge“: je Lage ein Eintrag, dazu ein langer Titel ohne Leerzeichen (Umbruch). */
const LISTE = [
  { workflowId: 'nachweis-w1', auftragId: 'nachweis-a1', ziel: 'Fehlende Nutzungsdaten kennzeichnen', versionSequenz: 1, status: 'WARTET_FREIGABE', aktiverSchrittId: 's2', grund: null, schritteAnzahl: 3, naechster: { art: 'haltFreigabe', schrittId: 's2' } },
  { workflowId: 'nachweis-w2', auftragId: 'nachweis-a2', ziel: 'Bauen aus der Akte', versionSequenz: 2, status: 'LAEUFT', aktiverSchrittId: 's2', grund: null, schritteAnzahl: 3, naechster: { art: 'haltKlaerung', grund: LAEUFT_GRUND } },
  { workflowId: 'nachweis-w3', auftragId: 'nachweis-a3', ziel: 'Fehler verständlich erklären', versionSequenz: 1, status: 'KLAERUNG_ERFORDERLICH', aktiverSchrittId: 's1', grund: 'Der Architekt hat 1 offene Frage gestellt — ohne Entscheidung setzt die Kette nicht fort. <b>bleibt Text</b>', schritteAnzahl: 3, naechster: { art: 'haltKlaerung', schrittId: 's1' } },
  { workflowId: 'nachweis-w4', auftragId: 'nachweis-a4', ziel: null, versionSequenz: 3, status: 'ABGESCHLOSSEN', aktiverSchrittId: null, grund: null, schritteAnzahl: 2, naechster: { art: 'fertig', schrittId: null } },
  { workflowId: 'nachweis-w5-sehr-lang', auftragId: 'nachweis-a5', ziel: 'EinSehrLangerTitelOhneLeerzeichenDerDasLayoutNichtSprengenDarfAuchNichtBeiDreihundertneunzigPixeln', versionSequenz: 1, status: 'GESTOPPT', aktiverSchrittId: 's1', grund: 'Gestoppt durch Stefan: falscher Ansatz.', schritteAnzahl: 2, naechster: { art: 'haltGestoppt', schrittId: null } },
]

/** Schritte des Freigabe-Halts: Architekt fertig, Umsetzung wartet (ZWINGEND), Review offen — absichtlich nicht in Planreihenfolge. */
const SCHRITTE_HALT = [
  { schritt_id: 's3', rolle: 'code-reviewer', worker: 'codex', modell: 'gpt-5', freigabe: 'KEINE', status: 'OFFEN', nachfolger: null, lauf_id: null, zeitgrenze_ms: 900000 },
  { schritt_id: 's1', rolle: 'architekt', worker: 'codex', modell: 'gpt-5', freigabe: 'KEINE', status: 'ERFOLGREICH', nachfolger: 's2', lauf_id: 'nachweis-l1', zeitgrenze_ms: 900000, freigabe_erteilt: false },
  { schritt_id: 's2', rolle: 'ausfuehrung', worker: 'claude-code', modell: 'claude-sonnet', freigabe: 'ZWINGEND', status: 'WARTET_FREIGABE', nachfolger: 's3', lauf_id: null, zeitgrenze_ms: 1800000, freigabe_erteilt: false },
]

const EMPFEHLUNG = {
  schrittId: 's2',
  wirdGenutzt: [{ id: 'playwright-mcp', empfehlungId: 'playwright-mcp', name: 'Playwright', typ: 'extern', unterart: 'mcp', grund: 'task_typen_any erfüllt (bugfix)' }],
  passtNichtImLauf: [{ id: 'axe-mcp', name: 'axe Accessibility', typ: 'extern', unterart: 'mcp', grund: 'freigabe OFFEN', installierbar: true }],
  weitereAnzahl: { wirdGenutzt: 0, passtNichtImLauf: 0 },
  nichtFreigebbarAnzahl: 0,
  hinweise: [],
}

const DATEN_HALT = { workflow_id: 'nachweis-w1', auftrag_id: 'nachweis-a1', version: 1, ziel: LISTE[0].ziel, status: 'WARTET_FREIGABE', aktiver_schritt_id: 's2', grund: null, schritte: SCHRITTE_HALT }
const DETAIL_HALT = { daten: DATEN_HALT, versionSequenz: 1, verstoesse: [], naechster: { art: 'haltFreigabe', grund: 'Schritt s2 ist ZWINGEND und noch nicht freigegeben', schrittId: 's2' }, architekturEntscheidung: null, empfehlung: EMPFEHLUNG }

/** Derselbe Workflow nach der Freigabe: s2 läuft (Lauf aktiv). */
const SCHRITTE_LAEUFT = SCHRITTE_HALT.map((s) => (s.schritt_id === 's2' ? { ...s, status: 'LAEUFT', lauf_id: 'nachweis-l2', freigabe_erteilt: true } : s))
const DETAIL_LAEUFT = { daten: { ...DATEN_HALT, status: 'LAEUFT', schritte: SCHRITTE_LAEUFT }, versionSequenz: 2, verstoesse: [], naechster: { art: 'haltKlaerung', grund: LAEUFT_GRUND }, architekturEntscheidung: null, empfehlung: null }

/** Derselbe Workflow nach „Ablehnen“: gestoppt. */
const DETAIL_GESTOPPT = {
  daten: { ...DATEN_HALT, status: 'GESTOPPT', grund: 'Freigabe abgelehnt: Ansatz passt nicht.', schritte: SCHRITTE_HALT.map((s) => (s.schritt_id === 's2' ? { ...s, status: 'OFFEN' } : s)) },
  versionSequenz: 2,
  verstoesse: [],
  naechster: { art: 'haltGestoppt', grund: 'Workflow gestoppt', schrittId: null },
  architekturEntscheidung: null,
  empfehlung: null,
}

const DETAIL_KLAERUNG = {
  daten: {
    workflow_id: 'nachweis-w3',
    auftrag_id: 'nachweis-a3',
    version: 1,
    ziel: LISTE[2].ziel,
    status: 'KLAERUNG_ERFORDERLICH',
    aktiver_schritt_id: 's1',
    grund: LISTE[2].grund,
    schritte: [
      { schritt_id: 's1', rolle: 'architekt', worker: 'codex', modell: 'gpt-5', freigabe: 'KEINE', status: 'ERFOLGREICH', nachfolger: 's2', lauf_id: 'nachweis-l31', zeitgrenze_ms: 900000 },
      { schritt_id: 's2', rolle: 'ausfuehrung', worker: 'claude-code', modell: 'claude-sonnet', freigabe: 'ZWINGEND', status: 'OFFEN', nachfolger: 's3', lauf_id: null, zeitgrenze_ms: 1800000 },
      { schritt_id: 's3', rolle: 'code-reviewer', worker: 'codex', modell: 'gpt-5', freigabe: 'KEINE', status: 'OFFEN', nachfolger: null, lauf_id: null, zeitgrenze_ms: 900000 },
    ],
  },
  versionSequenz: 1,
  verstoesse: [],
  naechster: { art: 'haltKlaerung', grund: 'Offene Frage des Architekten (Regel 1c)', schrittId: 's1' },
  architekturEntscheidung: {
    schrittId: 's1',
    fragen: [
      {
        frage: 'Welche Fehlermeldung soll zuerst verbessert werden?',
        auswirkung_bestand: 'Betrifft nur die Anzeige im Leitstand.',
        begruendung: 'Die Browser-Freigabe ist der häufigste Abbruch.',
        empfehlung: 'Browser-Freigabe',
        optionen: [
          { titel: 'Browser-Freigabe', vorteile: ['häufigster Fall'], nachteile: [] },
          { titel: 'Zeitgrenze', vorteile: ['einfach'], nachteile: ['selten'] },
        ],
      },
    ],
  },
  empfehlung: null,
}

const abnahme = (workflowStatus, freigabeHalt = null) => ({
  workflowStatus,
  freigabeHalt,
  entscheidung: { status: 'fehlt' },
  urteil: { status: 'noch_nicht_gelaufen' },
  aenderungsuebersicht: { status: 'noch_nicht_gelaufen' },
  pruefergebnis: { status: 'noch_nicht_gelaufen' },
})

/** Feste Antworten aller Folgen; spätere Einträge (auch je Schritt) haben Vorrang. */
const ANTWORTEN = [
  { muster: '**/api/zustand', json: zustand({ workflows: LISTE }) },
  { muster: '**/api/workflows/nachweis-w1', json: DETAIL_HALT },
  { muster: '**/api/workflows/nachweis-w1/abnahme', json: abnahme('WARTET_FREIGABE', { schrittId: 's2' }) },
  { muster: '**/api/workflows/nachweis-w2', json: { ...DETAIL_LAEUFT, daten: { ...DETAIL_LAEUFT.daten, workflow_id: 'nachweis-w2', ziel: LISTE[1].ziel } } },
  { muster: '**/api/workflows/nachweis-w2/abnahme', json: abnahme('LAEUFT') },
  { muster: '**/api/workflows/nachweis-w3', json: DETAIL_KLAERUNG },
  { muster: '**/api/workflows/nachweis-w3/abnahme', json: abnahme('KLAERUNG_ERFORDERLICH') },
  { muster: '**/api/laeufe/nachweis-l2', json: { aktiv: true } },
]

const DARSTELLUNGEN = {
  'dunkel-1440': { praefix: 'd1440' },
  'hell-1440': { praefix: 'l1440', farbschema: 'light' },
  'dunkel-390': { praefix: 'd390', breite: 390, hoehe: 844, schmal: true },
  'hell-390': { praefix: 'l390', farbschema: 'light', breite: 390, hoehe: 844, schmal: true },
  'dunkel-1440-zoom200': { praefix: 'd1440z2', zoom: 2, schmal: true },
  'ru-1440': { praefix: 'ru1440', sprache: 'ru' },
}

/**
 * Eine Folge in einer Darstellung. Seitenbilder als ganze Ansicht #view-runs ab 1280 CSS-px,
 * Dialogbilder (DIALOG_BILD) als Viewport ohne Ausschnitt (der Dialog liegt über der Seite).
 * @param optionen - hash, schritte, antworten, farbschema, breite, hoehe, zoom, sprache
 * @returns Klickfolge
 */
function folge({ hash, schritte, antworten = [], farbschema = 'dark', breite = 1440, hoehe = 1000, zoom = 1, sprache }) {
  const vollseite = breite / zoom >= 1280
  return {
    url: `${basis}/${hash}`,
    viewport: { breite, hoehe },
    farbschema,
    zoom,
    screenshotQualitaet: 0.7,
    ...(vollseite ? { screenshotVollseite: true, screenshotAusschnitt: { selector: '#view-runs' } } : { screenshotVollseite: false }),
    localStorageSetzen: { ...CHAT_ZU, ...(sprache ? { 'leitstand-sprache': sprache } : {}) },
    anfragenAntworten: [...ANTWORTEN, ...antworten],
    beobachtete: BEOBACHTUNG,
    schritte,
  }
}

const WARTE_LISTE = { warteAufSelector: { selector: '#workflows .workflow-zeile', timeoutMs: 15000 } }
const WARTE_HALT = { warteAufSelector: { selector: '#workflow-aktionen [data-aktion="freigabe-oeffnen"]', timeoutMs: 15000 } }
const WARTE_TIMELINE = { warteAufSelector: { selector: '#workflow-detail-inhalt .timeline li', timeoutMs: 15000 } }
const DIALOG_AUF = { warteAufSelector: { selector: '#workflow-dialog[open] #workflow-dialog-titel', timeoutMs: 15000 } }
/** Dialogbilder: ganzer Viewport statt Ausschnitt #view-runs. */
const DIALOG_BILD = { ohneAusschnitt: true, screenshotVollseite: false }
const OEFFNE_FREIGABE = { label: 'Klick „Nächsten Schritt freigeben“ → Dialog', klick: '#workflow-aktionen [data-aktion="freigabe-oeffnen"]', ...DIALOG_AUF }

const folgen = {}
for (const [name, { praefix, schmal = false, ...darstellung }] of Object.entries(DARSTELLUNGEN)) {
  const listenSchritte = [{ label: '#/runs: Seitenkopf, „Aufträge“, darunter Startfehler und Läufe', ...WARTE_LISTE, screenshot: `${praefix}-liste.webp` }]
  if (schmal) listenSchritte.push({ label: 'Fokus auf die Zeile mit dem langen Titel (Umbruch)', fokus: '#workflows .workflow-zeile[data-workflow-id="nachweis-w5-sehr-lang"]', screenshot: `${praefix}-liste-2-lang.webp` })
  if (name === 'dunkel-1440') {
    listenSchritte.push(
      { label: 'Klick auf die Zeile „Fehlende Nutzungsdaten kennzeichnen“ → Detail als Seite', klick: '#workflows .workflow-zeile[data-workflow-id="nachweis-w1"]', ...WARTE_TIMELINE },
      { label: 'Klick „← Alle Aufträge“ → history.back(), Liste, Fokus auf der Zeile (F-926-Muster)', klick: '#workflow-detail-schliessen', ...WARTE_LISTE, screenshot: `${praefix}-liste-3-zurueck.webp` }
    )
  }
  folgen[`liste-${name}`] = folge({ hash: '#/runs', schritte: listenSchritte, ...darstellung })

  const freigabeSchritte = [{ label: 'Deep-Link #/workflows/nachweis-w1 (Freigabe-Halt): Timeline, Auf einen Blick, Aktionen', ...WARTE_HALT, screenshot: `${praefix}-halt.webp` }]
  freigabeSchritte.push({ ...OEFFNE_FREIGABE, ...DIALOG_BILD, screenshot: `${praefix}-halt-dialog.webp` })
  if (schmal) freigabeSchritte.push({ label: 'Fokus „Ablehnen“, dann Tab → „Freigeben & starten“ (Tastatur, Fokusring sichtbar)', fokus: '#workflow-dialog [data-aktion="ablehnen"]', taste: 'Tab', ...DIALOG_BILD, screenshot: `${praefix}-halt-dialog-2-knoepfe.webp` })
  folgen[`freigabe-${name}`] = folge({ hash: '#/workflows/nachweis-w1', schritte: freigabeSchritte, ...darstellung })
}

folgen['freigabe-fehler-409'] = folge({
  hash: '#/workflows/nachweis-w1',
  antworten: [{ muster: '**/api/workflows/nachweis-w1/freigabe', methode: 'POST', status: 409, json: { grund: 'Es läuft bereits ein Lauf (D13): nachweis-fremder-lauf <bleibt Text>' } }],
  schritte: [
    { label: 'Deep-Link (Freigabe-Halt)', ...WARTE_HALT },
    OEFFNE_FREIGABE,
    { label: 'Klick „Freigeben & starten“ ohne Begründung → Pflichtmeldung im Dialog', klick: '#workflow-dialog [data-aktion="freigeben"]', warteAufSelector: { selector: '#workflow-dialog-meldung:not([hidden])', timeoutMs: 5000 }, ...DIALOG_BILD, screenshot: 'd1440-dialog-pflicht.webp' },
    { label: 'Begründung tippen, „Freigeben & starten“ → 409: Meldung im Dialog, Dialog bleibt offen', tippen: { selector: '#wf-freigabe-begruendung', text: 'Ziel und Umfang geprüft.' }, klick: '#workflow-dialog [data-aktion="freigeben"]', warteAufSelector: { selector: '#workflow-dialog-meldung:not([hidden])', timeoutMs: 5000 }, ...DIALOG_BILD, screenshot: 'd1440-dialog-409.webp' },
  ],
})

folgen['dialog-stand-geaendert'] = folge({
  hash: '#/workflows/nachweis-w1',
  schritte: [
    { label: 'Deep-Link (Freigabe-Halt)', ...WARTE_HALT },
    OEFFNE_FREIGABE,
    { label: 'Begründung angefangen', tippen: { selector: '#wf-freigabe-begruendung', text: 'Angefangene Begründung' }, ...DIALOG_BILD, screenshot: 'd1440-stand-1-offen.webp' },
    {
      label: 'Der Server meldet einen neuen Stand (Schritt läuft) → nächster Poll schließt den Dialog mit Meldung, Fokus auf der Meldung',
      anfragenAntworten: [
        { muster: '**/api/workflows/nachweis-w1', json: DETAIL_LAEUFT },
        { muster: '**/api/laeufe/nachweis-l2', json: { aktiv: true } },
      ],
      warteAufSelector: { selector: '#workflow-dialog:not([open])', zustand: 'attached', timeoutMs: 15000 },
      screenshot: 'd1440-stand-2-geschlossen.webp',
    },
  ],
})

folgen['ablehnen'] = folge({
  hash: '#/workflows/nachweis-w1',
  schritte: [
    { label: 'Deep-Link (Freigabe-Halt)', ...WARTE_HALT },
    OEFFNE_FREIGABE,
    { label: 'Begründung für das Veto', tippen: { selector: '#wf-freigabe-begruendung', text: 'Ansatz passt nicht.' }, ...DIALOG_BILD, screenshot: 'd1440-ablehnen-1-dialog.webp' },
    {
      label: 'Klick „Ablehnen“ → POST …/freigabe (ABGELEHNT) 200: Dialog zu, Meldung am Ablauf, Stand gestoppt',
      anfragenAntworten: [
        { muster: '**/api/workflows/nachweis-w1/freigabe', methode: 'POST', status: 200, json: { bezeugt: true } },
        { muster: '**/api/workflows/nachweis-w1', json: DETAIL_GESTOPPT },
        { muster: '**/api/workflows/nachweis-w1/abnahme', json: abnahme('GESTOPPT') },
      ],
      klick: '#workflow-dialog [data-aktion="ablehnen"]',
      warteAufSelector: { selector: '#workflow-bedienung-meldung.erfolg', timeoutMs: 10000 },
      screenshot: 'd1440-ablehnen-2-gestoppt.webp',
    },
  ],
})

const stoppSchritte = (praefix) => [
  { label: 'Deep-Link #/workflows/nachweis-w2 („läuft“)', warteAufSelector: { selector: '#workflow-aktionen [data-aktion="stopp-oeffnen"]', timeoutMs: 15000 } },
  { label: 'Klick „Ausführung stoppen“ → Dialog', klick: '#workflow-aktionen [data-aktion="stopp-oeffnen"]', ...DIALOG_AUF, ...DIALOG_BILD, screenshot: `${praefix}-stopp-1-dialog.webp` },
  { label: 'Klick „Stoppen“ ohne Begründung → Pflichtmeldung, Fokus im Feld', klick: '#workflow-dialog [data-aktion="stoppen"]', warteAufSelector: { selector: '#workflow-dialog-meldung:not([hidden])', timeoutMs: 5000 }, ...DIALOG_BILD, screenshot: `${praefix}-stopp-2-pflicht.webp` },
  { label: 'Escape → schließt ohne Wirkung', taste: 'Escape', warteAufSelector: { selector: '#workflow-dialog:not([open])', zustand: 'attached', timeoutMs: 5000 }, screenshot: `${praefix}-stopp-3-escape.webp` },
]
folgen['stoppen-dunkel-1440'] = folge({ hash: '#/workflows/nachweis-w2', schritte: stoppSchritte('d1440') })
folgen['stoppen-dunkel-390'] = folge({ hash: '#/workflows/nachweis-w2', breite: 390, hoehe: 844, schritte: stoppSchritte('d390') })

folgen['detail-laeuft'] = folge({
  hash: '#/workflows/nachweis-w2',
  schritte: [{ label: 'Detail „läuft“: Umsetzung läuft jetzt, Verantwortung = Rolle, nur „Ausführung stoppen“', warteAufSelector: { selector: '#workflow-detail-inhalt .timeline li.current', timeoutMs: 15000 }, screenshot: 'd1440-laeuft.webp' }],
})

folgen['detail-klaerung'] = folge({
  hash: '#/workflows/nachweis-w3',
  schritte: [{ label: 'KLAERUNG_ERFORDERLICH: alter Bedienblock (Architekt-Entscheidung) unverändert sichtbar, Verantwortung „Du“', warteAufSelector: { selector: '#workflow-bedienung .wf-architektur-entscheidung', timeoutMs: 15000 }, screenshot: 'd1440-klaerung.webp' }],
})

folgen['f12-aufgeklappt'] = folge({
  hash: '#/workflows/nachweis-w1',
  schritte: [
    { label: 'Deep-Link (Freigabe-Halt)', ...WARTE_HALT },
    { label: 'Klick „Technischer Ablauf & Serverentscheidung“ → Kopfdaten und Schritttabelle', klick: '#workflow-technik summary', warteAufSelector: { selector: '#workflow-technik-inhalt .ablauf-schritte', timeoutMs: 5000 }, screenshot: 'd1440-f12.webp' },
    { label: 'Drei Sekunden später (Poll-Ticks haben den Inhalt ersetzt): der Bereich bleibt offen', warteAufSelector: { selector: '#gibt-es-nicht-wartezeit', zustand: 'attached', timeoutMs: 3000 }, screenshot: 'd1440-f12-nach-poll.webp' },
  ],
})

folgen['detail-404'] = folge({
  hash: '#/workflows/nachweis-unbekannt',
  antworten: [{ muster: '**/api/workflows/nachweis-unbekannt', status: 404, json: { grund: "Workflow 'nachweis-unbekannt' nicht gefunden <bleibt Text>" } }],
  schritte: [
    { label: 'Deep-Link auf einen unbekannten Workflow → 404: Fehlerzustand, keine Aktionen, kein Blick', warteAufSelector: { selector: '#workflow-detail-fehler:not([hidden])', timeoutMs: 15000 }, screenshot: 'd1440-404.webp' },
    { label: 'Drei Sekunden später (Poll-Ticks): der Fehler bleibt stehen, kein Flackern', warteAufSelector: { selector: '#gibt-es-nicht-wartezeit', zustand: 'attached', timeoutMs: 3000 }, screenshot: 'd1440-404-nach-poll.webp' },
  ],
})

/** Empfehlung nach der Installation: axe-mcp steht jetzt in „Wird genutzt“. */
const EMPFEHLUNG_NACH_INSTALLATION = { ...EMPFEHLUNG, wirdGenutzt: [...EMPFEHLUNG.wirdGenutzt, { id: 'axe-mcp', empfehlungId: 'axe-mcp', name: 'axe Accessibility', typ: 'extern', unterart: 'mcp', grund: 'installiert und freigegeben' }], passtNichtImLauf: [] }
folgen['installation-im-dialog'] = folge({
  hash: '#/workflows/nachweis-w1',
  antworten: [
    { muster: '**/api/ressourcen/axe-mcp/installation/vorbereiten', methode: 'POST', json: { art: 'mcp', id: 'axe-mcp', name: 'axe Accessibility', paket: '@axe-core/mcp', version: '1.2.3', integrity: 'sha512-nachweis', lizenz: 'MPL-2.0', lizenzRegistry: null, kosten: 'lokal kostenlos', wirkung: 'Barrierefreiheit prüfen', werkzeuge: ['analyze'], zielordner: '.ai-workforce/cap/axe-mcp', herkunftUrl: null, eintragHash: 'e'.repeat(64) } },
  ],
  schritte: [
    { label: 'Deep-Link (Freigabe-Halt)', ...WARTE_HALT },
    OEFFNE_FREIGABE,
    { label: 'Begründung tippen, dann „Freigeben & installieren“ → Bestätigungsblock im Dialog', tippen: { selector: '#wf-freigabe-begruendung', text: 'Barrierefreiheit gleich mitprüfen.' }, klick: '#workflow-dialog [data-installation-aktion="vorbereiten"]', warteAufSelector: { selector: '#workflow-dialog [data-installation-aktion="installieren"]', timeoutMs: 10000 }, ...DIALOG_BILD, screenshot: 'd1440-installation-1-bestaetigung.webp' },
    {
      label: '„Installieren“ → 200, die Empfehlung ändert sich: Dialog schließt mit eigener Meldung (Begründung gerettet)',
      anfragenAntworten: [
        { muster: '**/api/ressourcen/axe-mcp/installation', methode: 'POST', json: { art: 'mcp', id: 'axe-mcp', paket: '@axe-core/mcp', version: '1.2.3', werkzeugeGefunden: ['analyze'] } },
        { muster: '**/api/workflows/nachweis-w1', json: { ...DETAIL_HALT, empfehlung: EMPFEHLUNG_NACH_INSTALLATION } },
      ],
      klick: '#workflow-dialog [data-installation-aktion="installieren"]',
      warteAufSelector: { selector: '#workflow-dialog:not([open])', zustand: 'attached', timeoutMs: 15000 },
      screenshot: 'd1440-installation-2-geschlossen.webp',
    },
    { ...OEFFNE_FREIGABE, label: 'Erneut „Nächsten Schritt freigeben“: Begründung steht wieder im Feld, axe-mcp in „Wird genutzt“, Erfolgsmeldung im Block', ...DIALOG_BILD, screenshot: 'd1440-installation-3-wieder-offen.webp' },
  ],
})

folgen['bewegung-reduziert'] = {
  ...folge({ hash: '#/workflows/nachweis-w1', schritte: [{ label: 'Detail im Freigabe-Halt mit prefers-reduced-motion: reduce', ...WARTE_HALT, screenshot: 'd1440rm-halt.webp' }, { ...OEFFNE_FREIGABE, ...DIALOG_BILD, screenshot: 'd1440rm-halt-dialog.webp' }] }),
  reduzierteBewegung: true,
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
