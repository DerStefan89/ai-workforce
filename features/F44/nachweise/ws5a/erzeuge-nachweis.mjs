/**
 * Datei: features/F44/nachweise/ws5a/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweise F44 WS-5a „Ausführungen“ — kleinste Matrix (F-876), nur die geänderten
 * Seiten, mit festen Antworten (nie im Produkt):
 * - je Darstellung (1440 dunkel und hell, 390 dunkel, 1440 dunkel mit 200 % Zoom, 1440 ru) EINE Folge
 *   über alle Seiten: Register „Ausführungen“ (#/ausfuehrungen), Reiter „Aufträge“ (#/runs), Lauf-Detail
 *   in Lage a (fehlgeschlagen), c (verweigert mit Bypass-Verdacht, F7) und d (läuft), dazu
 *   #/workflows/<id> mit der Abnahme (Prüfpunkte aus WS-4b: „Ablehnen“ in einer Zeile bei 1440 px,
 *   Werte in „Auf einen Blick“ auf Höhe der Beschriftung bei 200 %, Reviewer-Notiz ohne Schema-Pfad);
 * - Dialog „Fehler zur Kenntnis nehmen“ zusätzlich bei 390 px hell;
 * - Bedienung (1440 dunkel): Kenntnisnahme mit Pflichtmeldung und Erfolg (Zeile statt Knopf), Klärung
 *   auflösen (Lage b) mit 400 im Dialog, Rückfrage beantworten (F7), Lauf abbrechen (G9, ohne
 *   Grundfeld), Liste → Detail → „← Alle Ausführungen“ mit Fokus auf der Zeile (F-926), alle vier
 *   Aufklappbereiche offen, Leer- und Fehlerzustand der Liste, Detail 404.
 * Baut je Folge eine klickfolge.json in einem Unterordner und ruft scripts/render-nachweis.mjs auf;
 * Screenshots als WebP. Vor dem Lauf leert das Skript die Ausgabeordner GENAU der Folgen, die es neu
 * erzeugt (fs.rmSync, recursive, force) — fremde Ordner und das Skript selbst bleiben unberührt.
 *
 * Wird aufgerufen von: Hand, gegen einen laufenden Leitstand dieses Worktrees —
 *   LEITSTAND_PORT=4381 node scripts/leitstand-server.mjs
 *   node features/F44/nachweise/ws5a/erzeuge-nachweis.mjs [basis] [nurOrdner]
 *   basis:     Standard http://127.0.0.1:4381
 *   nurOrdner: optional, nur diese Folge (Name des Unterordners)
 * Nicht Teil von `npm run check`.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const basis = process.argv[2] ?? 'http://127.0.0.1:4381'
const nur = process.argv[3]
const ziel = 'features/F44/nachweise/ws5a'

/** Chatspalte eingeklappt (Vorlage: Chat als Dock, WS-8) — ab 1280 px bleibt sie trotzdem sichtbar. */
const CHAT_ZU = { 'leitstand-chat-offen': 'false' }

const BEOBACHTUNG = {
  texte: [
    { name: 'Ansicht', selector: '[data-view]:not([hidden])', attribut: 'data-view' },
    { name: 'data-theme', selector: 'html', attribut: 'data-theme' },
    { name: 'lang', selector: 'html', attribut: 'lang' },
    { name: 'Fokus', selector: ':focus' },
    { name: 'Fokus-ID', selector: ':focus', attribut: 'id' },
    { name: 'Fokus-Klasse', selector: ':focus', attribut: 'class' },
    { name: 'Fokus-data-lauf-id', selector: ':focus', attribut: 'data-lauf-id' },
    { name: 'Reiter aktiv', selector: '#runs-register [aria-current="page"]' },
    { name: 'Titel', selector: '#lauf-detail-titel' },
    { name: 'Status', selector: '#lauf-detail-status' },
    { name: 'Notiz', selector: '#lauf-notiz' },
    { name: 'Meldung', selector: '#lauf-meldung' },
    { name: 'Einordnung', selector: '#lauf-einordnung' },
    { name: 'Dialog offen', selector: '#lauf-dialog', attribut: 'open' },
    { name: 'Dialogtitel', selector: '#lauf-dialog-titel' },
    { name: 'Dialogmeldung', selector: '#lauf-dialog-meldung' },
    { name: 'Fehler', selector: '#lauf-detail-fehler' },
    { name: 'Reviewer-Notiz (ohne Schema-Pfad)', selector: '#workflow-abnahme .abnahme-lauf' },
  ],
  sichtbarkeit: [
    { name: 'Register Aufträge', id: 'workflows-abschnitt' },
    { name: 'Register Ausführungen', id: 'ausfuehrungen-abschnitt' },
    { name: 'Lauf-Seite', id: 'lauf-detail' },
    { name: 'Aufklappbereiche', id: 'lauf-aufklapp' },
  ],
  vorhanden: [
    { name: 'Knopf Kenntnisnahme (G6)', selector: '#lauf-notiz [data-aktion="kenntnisnahme-oeffnen"]' },
    { name: 'Zeile „zur Kenntnis genommen“', selector: '#lauf-notiz .lauf-kenntnis-zeile' },
    { name: 'Knopf Fortsetzung (G7)', selector: '#lauf-notiz [data-aktion="fortsetzung"]' },
    { name: 'Knopf Klärung (G8)', selector: '#lauf-notiz [data-aktion="terminal-oeffnen"]' },
    { name: 'Knopf Rückfrage (F7)', selector: '#lauf-notiz [data-aktion="antwort-oeffnen"]' },
    { name: 'Knopf Abbrechen (G9)', selector: '#lauf-notiz [data-aktion="abbrechen-oeffnen"]' },
    { name: 'Grundfeld im Dialog', selector: '#lauf-dialog textarea' },
    { name: 'aria-live im Dialog (muss fehlen)', selector: '#lauf-dialog [aria-live], #lauf-dialog[aria-live]' },
  ],
  ueberlauf: true,
}

/** Zustands-Aggregat für Folgen mit fester Antwort. */
const zustand = (felder) => ({ laeufe: [], startfehler: [], workflows: [], fehler: [], aktiverLauf: { aktiv: false, laufId: null }, pruefbefehl: null, istAiWorkforce: true, ...felder })

const cp = (sequenz, zeit, typ, felder = {}) => ({ sequenz, zeitstempel: `2026-10-01T${zeit}:00.000Z`, gueltig: true, typ, ...felder })
const kontextpaket = (rolle) => ({ status: 'ok', rolle, elemente: [{ pfad: 'features/F35/feature.md' }, { pfad: 'public/leitstand/views/auftrag.js', zitierter_bereich: 'Z. 1–80' }], ausgeschlossen: [{ pfad: '.env', grund: 'geheim' }] })
const laufakte = (worker, modell) => ({ status: 'ok', worker, modellDeklariert: modell, modellBeobachtet: modell, beobachtungsbasisVollstaendig: true, arbeitsverzeichnisPfad: 'C:/arbeit/nw', beobachtung: { geladen: ['playwright-mcp'], aufgerufen: ['playwright-mcp'] } })
const rohstrom = (denials) => ({ status: 'ok', exitCode: 1, startfehler: null, stdoutLaenge: 18234, stderrLaenge: 0, ergebnisobjekt: { status: 'ok', permissionDenials: { anzahl: denials.length, toolNamen: denials } } })

/** Die Läufe dieser Nachweise (Detail je laufId). */
const L = {
  'nw-fehl': {
    laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'FEHLGESCHLAGEN', terminalSequenz: 4 },
    aktiv: false,
    verweigertDaten: null,
    auftrag: { status: 'ok', auftragId: 'a-browser', titel: 'Browser-Prüfung', auftragstext: 'Prüfe die Abnahme-Seite im Browser bei 390 und 1440 px.' },
    kontextpaket: kontextpaket('qa'),
    laufakte: laufakte('codex', 'gpt-5'),
    rohstrom: rohstrom(['mcp__playwright__browser_navigate']),
    checkpoints: [
      cp(1, '10:31', 'wirkungsmarke', { wirkungsmarke: { art: 'run_prepared' } }),
      cp(2, '10:33', 'lineage/artefakt_version', { lineage: { art: 'artefakt_version', artefaktId: 'kontextpaket-nw-fehl', erzeugungsart: 'kern' } }),
      cp(3, '10:40', 'lineage/artefakt_version', { lineage: { art: 'artefakt_version', artefaktId: 'bedarf-nw-fehl-1', erzeugungsart: 'werkzeug', beschreibung: 'Browserzugriff für die Prüfung benötigt.' } }),
      cp(4, '10:42', 'wirkungsmarke', { wirkungsmarke: { art: 'terminal', ergebnis: 'FEHLGESCHLAGEN' } }),
    ],
  },
  'nw-rueck': {
    laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'VERWEIGERT', terminalSequenz: 3 },
    aktiv: false,
    verweigertDaten: { bypassVerdachtAnzahl: 2, isError: false, nonExecutionKind: 'permission_denied' },
    auftrag: { status: 'ok', auftragId: 'a-deps', titel: 'Abhängigkeiten aktualisieren', auftragstext: 'Aktualisiere die Entwicklungsabhängigkeiten.' },
    kontextpaket: kontextpaket('ausfuehrung'),
    laufakte: laufakte('claude-code', 'claude-sonnet'),
    rohstrom: rohstrom(['Bash']),
    checkpoints: [
      cp(1, '09:12', 'wirkungsmarke', { wirkungsmarke: { art: 'run_prepared' } }),
      cp(2, '09:13', 'lineage/artefakt_version', { lineage: { art: 'artefakt_version', artefaktId: 'kontextpaket-nw-rueck', erzeugungsart: 'kern' } }),
      cp(3, '09:20', 'wirkungsmarke', { wirkungsmarke: { art: 'terminal', ergebnis: 'VERWEIGERT' } }),
    ],
  },
  'nw-lauf': {
    laufStatus: { status: 'KLAERUNG_ERFORDERLICH', blockerId: 'blocker-nw-lauf', grund: 'RUN_PREPARED ohne Terminalartefakt', aufloesungsbedingung: 'terminale Entscheidung', resumeZiel: 'lauf', evidenz: { offeneRunPreparedSequenzen: [1] } },
    aktiv: true,
    verweigertDaten: null,
    auftrag: { status: 'ok', auftragId: 'a-bau', titel: 'Bauen aus der Akte', auftragstext: 'Baue Feature F35 aus seiner Akte.' },
    kontextpaket: kontextpaket('ausfuehrung'),
    laufakte: { status: 'nicht_vorhanden' },
    rohstrom: { status: 'laufakte_fehlt' },
    checkpoints: [cp(1, '11:02', 'wirkungsmarke', { wirkungsmarke: { art: 'run_prepared' } }), cp(2, '11:03', 'lineage/artefakt_version', { lineage: { art: 'artefakt_version', artefaktId: 'kontextpaket-nw-lauf', erzeugungsart: 'kern' } })],
  },
  'nw-klaer': {
    laufStatus: { status: 'KLAERUNG_ERFORDERLICH', blockerId: 'blocker-nw-klaer', grund: 'RUN_PREPARED ohne Terminalartefakt', aufloesungsbedingung: 'terminale Entscheidung', resumeZiel: 'lauf', evidenz: { offeneRunPreparedSequenzen: [1] } },
    aktiv: false,
    verweigertDaten: null,
    auftrag: { status: 'kein_auftragsbezug' },
    kontextpaket: { status: 'nicht_vorhanden' },
    laufakte: { status: 'nicht_vorhanden' },
    rohstrom: { status: 'laufakte_fehlt' },
    checkpoints: [cp(1, '08:00', 'wirkungsmarke', { wirkungsmarke: { art: 'run_prepared' } })],
  },
}
const detail = (laufId) => ({ laufId, fortschritt: null, scoutErgebnis: null, ...L[laufId] })

const kopf = (laufId, felder = {}) => {
  const d = L[laufId]
  return { laufId, laufStatus: d.laufStatus, ergebnis: d.laufStatus.ergebnis ?? null, zeitpunkt: d.checkpoints.at(-1).zeitstempel, auftragsbezug: d.auftrag.status === 'ok' ? { auftragId: d.auftrag.auftragId, titel: d.auftrag.titel } : null, anzahlCheckpoints: d.checkpoints.length, kettenintegritaet: true, kenntnisgenommen: false, ...felder }
}
const LAEUFE = [
  kopf('nw-lauf'),
  kopf('nw-fehl'),
  kopf('nw-rueck'),
  { laufId: 'nw-ok', laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' }, ergebnis: 'ERFOLGREICH', zeitpunkt: '2026-10-01T08:44:00.000Z', auftragsbezug: { auftragId: 'a-review', titel: 'Code Review' }, anzahlCheckpoints: 3, kettenintegritaet: true, kenntnisgenommen: false },
  kopf('nw-klaer'),
  { laufId: 'nw-alt-2026-09-12-ein-sehr-langer-lauf-bezeichner', laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'FEHLGESCHLAGEN' }, ergebnis: 'FEHLGESCHLAGEN', zeitpunkt: null, auftragsbezug: null, anzahlCheckpoints: 2, kettenintegritaet: false, kenntnisgenommen: true },
]
const STARTFEHLER = [{ zeitstempel: '2026-10-01T07:58:00.000Z', laufId: 'nw-start', fehler: "Worker 'codex' nicht gefunden (ENOENT: spawn codex)" }]

// Ablauf mit Abnahme (Prüfpunkte WS-4b): Architekt, Umsetzung, Review — alles erfolgreich.
const schritt = (id, rolle, worker, status, nachfolger, laufId, freigabe = 'KEINE') => ({ schritt_id: id, rolle, worker, modell: worker === 'codex' ? 'gpt-5' : 'claude-sonnet', freigabe, status, nachfolger, lauf_id: laufId, zeitgrenze_ms: 900000 })
const WORKFLOW = {
  daten: { workflow_id: 'nw-ab', auftrag_id: 'nw-ab-a', version: 1, ziel: 'Bauen aus der Akte', status: 'ABGESCHLOSSEN', aktiver_schritt_id: null, grund: null, schritte: [schritt('s1', 'architekt', 'codex', 'ERFOLGREICH', 's2', 'nw-l1'), schritt('s2', 'ausfuehrung', 'claude-code', 'ERFOLGREICH', 's3', 'nw-l2', 'ZWINGEND'), schritt('s3', 'code-reviewer', 'codex', 'ERFOLGREICH', null, 'nw-l3')] },
  versionSequenz: 2,
  verstoesse: [],
  naechster: { art: 'fertig', grund: 'Alle Schritte abgeschlossen', schrittId: null },
  architekturEntscheidung: null,
  empfehlung: null,
}
const ABNAHME = {
  workflowStatus: 'ABGESCHLOSSEN',
  freigabeHalt: null,
  entscheidung: { status: 'nicht_vorhanden' },
  urteil: { status: 'ok', laufId: 'nw-l3', urteil: 'BEREIT', empfehlung: 'Die vereinbarten Kriterien sind erfüllt. Prüfe, ob das Ergebnis auch deinen Erwartungen entspricht.', befunde: [], ak_urteile: [{ ak_id: 'AK1', urteil: 'ERFUELLT', beleg: 'auftrag.test.mjs grün.' }] },
  aenderungsuebersicht: { status: 'ok', laufId: 'nw-l2', daten: { basis_ref: '772f4e5', gekuerzt: false, dateien: [{ status: 'M', pfad: 'public/leitstand/views/auftrag.js', plus: 48, minus: 12 }] } },
  pruefergebnis: { status: 'ok', laufId: 'nw-l2p', ergebnis: 'GRUEN', exitCode: 0 },
}
const WORKFLOW_LISTE = [{ workflowId: 'nw-ab', auftragId: 'nw-ab-a', ziel: 'Bauen aus der Akte', versionSequenz: 2, status: 'ABGESCHLOSSEN', aktiverSchrittId: null, grund: null, schritteAnzahl: 3, naechster: WORKFLOW.naechster }]

/** Feste Antworten aller Folgen; spätere Einträge (auch je Schritt) haben Vorrang. */
const ANTWORTEN = [
  { muster: '**/api/zustand', json: zustand({ laeufe: LAEUFE, startfehler: STARTFEHLER, workflows: WORKFLOW_LISTE, aktiverLauf: { aktiv: true, laufId: 'nw-lauf' } }) },
  ...Object.keys(L).map((laufId) => ({ muster: `**/api/laeufe/${laufId}`, methode: 'GET', json: detail(laufId) })),
  { muster: '**/api/laeufe/nw-weg', methode: 'GET', status: 404, json: { grund: "Lauf 'nw-weg' nicht gefunden" } },
  { muster: '**/api/workflows/nw-ab', json: WORKFLOW },
  { muster: '**/api/workflows/nw-ab/abnahme', json: ABNAHME },
]

/**
 * Eine Folge. Seitenbilder als ganze Ansicht #view-runs ab 1280 CSS-px, sonst Vollseite; Dialogbilder
 * (DIALOG_BILD) als Viewport ohne Ausschnitt.
 * @param optionen - hash, schritte, antworten, farbschema, breite, hoehe, zoom, sprache
 * @returns Klickfolge
 */
function folge({ hash, schritte, antworten = [], farbschema = 'dark', breite = 1440, hoehe = 1000, zoom = 1, sprache }) {
  const breit = breite / zoom >= 1280
  return {
    url: `${basis}/${hash}`,
    viewport: { breite, hoehe },
    farbschema,
    zoom,
    screenshotQualitaet: 0.7,
    ...(breit ? { screenshotVollseite: true, screenshotAusschnitt: { selector: '#view-runs' } } : { screenshotVollseite: true }),
    localStorageSetzen: { ...CHAT_ZU, ...(sprache ? { 'leitstand-sprache': sprache } : {}) },
    anfragenAntworten: [...ANTWORTEN, ...antworten],
    beobachtete: BEOBACHTUNG,
    schritte,
  }
}

const warte = (selector, timeoutMs = 15000, zustandWert) => ({ warteAufSelector: { selector, timeoutMs, ...(zustandWert ? { zustand: zustandWert } : {}) } })
const DIALOG_AUF = warte('#lauf-dialog[open] #lauf-dialog-titel')
const DIALOG_BILD = { ohneAusschnitt: true, screenshotVollseite: false }
const DETAIL_DA = (lage) => warte(`#lauf-notiz .lauf-notiz-${lage}`)

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
    hash: '#/ausfuehrungen',
    schritte: [
      { label: '#/ausfuehrungen: Reiter „Ausführungen“ aktiv, Hinweisnotiz, Laufliste (läuft, fehlgeschlagen, verweigert, erfolgreich, Klärung nötig, Kettenbruch + zur Kenntnis genommen), Startfehler', ...warte('#laeufe .lauf-zeile'), screenshot: `${praefix}-1-ausfuehrungen.webp` },
      { label: 'Reiter „Aufträge“ → #/runs, Liste „Aufträge“', klick: '#runs-register a[data-register="auftraege"]', ...warte('#workflows .workflow-zeile'), screenshot: `${praefix}-2-auftraege.webp` },
      { label: 'Lage a: #/runs/nw-fehl (FEHLGESCHLAGEN) — rote Notiz, Ursache „kommt“, Kenntnisnahme und Fortsetzung, Timeline, Einordnung, Aufklappbereiche', navigiere: '#/runs/nw-fehl', ...DETAIL_DA('fehler'), screenshot: `${praefix}-3-lage-a-fehler.webp` },
      { label: 'Lage c: #/runs/nw-rueck (VERWEIGERT mit Bypass-Verdacht, F7) — Bypass-Daten, Rückfrage beantworten', navigiere: '#/runs/nw-rueck', ...DETAIL_DA('rueckfrage'), screenshot: `${praefix}-4-lage-c-rueckfrage.webp` },
      { label: 'Lage d: #/runs/nw-lauf (aktiv) — läuft, Stand beim Öffnen, Aktualisieren und Lauf abbrechen', navigiere: '#/runs/nw-lauf', ...DETAIL_DA('laeuft'), screenshot: `${praefix}-5-lage-d-laeuft.webp` },
      { label: 'Prüfpunkte WS-4b: #/workflows/nw-ab — „Ablehnen“ in einer Zeile, Werte in „Auf einen Blick“ auf Höhe der Beschriftung, Reviewer-Notiz ohne Schema-Pfad', navigiere: '#/workflows/nw-ab', ...warte('#workflow-abnahme .abnahme-abschnitt'), screenshot: `${praefix}-6-abnahme.webp` },
    ],
    ...darstellung,
  })
}

folgen['dialog-hell-390'] = folge({
  hash: '#/runs/nw-fehl',
  farbschema: 'light',
  breite: 390,
  hoehe: 844,
  schritte: [
    { label: 'Lage a hell bei 390 px', ...DETAIL_DA('fehler') },
    { label: 'Dialog „Fehler zur Kenntnis nehmen“ hell bei 390 px, Fokus im Pflichtfeld', klick: '#lauf-notiz [data-aktion="kenntnisnahme-oeffnen"]', ...DIALOG_AUF, ...DIALOG_BILD, screenshot: 'l390-dialog-kenntnisnahme.webp' },
  ],
})

folgen['kenntnisnahme'] = folge({
  hash: '#/runs/nw-fehl',
  schritte: [
    { label: 'Lage a', ...DETAIL_DA('fehler') },
    { label: 'Klick „Fehler zur Kenntnis nehmen“ → Dialog, Fokus im Pflichtfeld', klick: '#lauf-notiz [data-aktion="kenntnisnahme-oeffnen"]', ...DIALOG_AUF, ...DIALOG_BILD, screenshot: 'd1440-kenntnis-1-dialog.webp' },
    { label: 'Klick „Zur Kenntnis nehmen“ ohne Begründung → Pflichtmeldung im Dialog', klick: '#lauf-dialog [data-aktion="kenntnisnahme"]', ...warte('#lauf-dialog-meldung:not([hidden])', 5000), ...DIALOG_BILD, screenshot: 'd1440-kenntnis-2-pflicht.webp' },
    {
      label: 'Begründung tippen, bestätigen → 200: Dialog zu, Meldung „Entscheidung gespeichert.“ mit Fokus',
      tippen: { selector: '#entscheidung-kenntnisnahme-begruendung', text: 'Browser-Freigabe fehlte, wird im nächsten Auftrag ergänzt.' },
      anfragenAntworten: [{ muster: '**/api/entscheidungen', methode: 'POST', json: { ok: true } }],
      klick: '#lauf-dialog [data-aktion="kenntnisnahme"]',
      ...warte('#lauf-meldung.erfolg', 10000),
    },
    {
      // Der Server meldet die Kenntnisnahme erst danach im Aggregat — stünde sie schon vor dem Klick dort, schlösse der
      // offene Dialog zu Recht mit „Der Stand hat sich geändert“.
      label: 'Aggregat meldet kenntnisgenommen: die Notiz zeigt „bereits zur Kenntnis genommen“ statt des Knopfs, die Liste das Kennzeichen',
      anfragenAntworten: [{ muster: '**/api/zustand', json: zustand({ laeufe: LAEUFE.map((l) => (l.laufId === 'nw-fehl' ? { ...l, kenntnisgenommen: true } : l)), startfehler: STARTFEHLER, workflows: WORKFLOW_LISTE }) }],
      ...warte('#lauf-notiz .lauf-kenntnis-zeile', 10000),
      screenshot: 'd1440-kenntnis-3-erledigt.webp',
    },
  ],
})

folgen['klaerung'] = folge({
  hash: '#/runs/nw-klaer',
  schritte: [
    { label: 'Lage b: KLAERUNG_ERFORDERLICH, nicht aktiv — bernsteinfarbene Notiz mit grund roh, Klärung auflösen, Fortsetzung', ...DETAIL_DA('klaerung'), screenshot: 'd1440-klaerung-1-notiz.webp' },
    { label: 'Klick „Klärung auflösen“ → Dialog mit Ergebnis und Pflichtbegründung', klick: '#lauf-notiz [data-aktion="terminal-oeffnen"]', ...DIALOG_AUF, ...DIALOG_BILD, screenshot: 'd1440-klaerung-2-dialog.webp' },
    {
      label: 'Begründung tippen, speichern → 400 vom Server: Meldung im offenen Dialog',
      auswaehlen: { selector: '#entscheidung-terminal-ergebnis', wert: 'FEHLGESCHLAGEN' },
      tippen: { selector: '#entscheidung-terminal-begruendung', text: 'Lauf ist abgebrochen, Ergebnis festhalten.' },
      anfragenAntworten: [{ muster: '**/api/entscheidungen', methode: 'POST', status: 400, json: { grund: "art 'terminal' ist nur bei Status KLAERUNG_ERFORDERLICH erlaubt (F-167)" } }],
      klick: '#entscheidung-terminal-speichern',
      ...warte('#lauf-dialog-meldung:not([hidden])', 10000),
      ...DIALOG_BILD,
      screenshot: 'd1440-klaerung-3-400.webp',
    },
    { label: 'Escape schließt den Dialog ohne Wirkung', taste: 'Escape', ...warte('#lauf-dialog', 5000, 'hidden') },
  ],
})

folgen['rueckfrage'] = folge({
  hash: '#/runs/nw-rueck',
  schritte: [
    { label: 'Lage c', ...DETAIL_DA('rueckfrage') },
    { label: 'Klick „Rückfrage beantworten“ → Dialog mit Antwort (Pflicht) und Einstufung', klick: '#lauf-notiz [data-aktion="antwort-oeffnen"]', ...DIALOG_AUF, ...DIALOG_BILD, screenshot: 'd1440-rueckfrage-1-dialog.webp' },
    {
      label: 'Antwort tippen, speichern → 200: Dialog zu, Meldung „Entscheidung gespeichert.“',
      tippen: { selector: '#entscheidung-antwort-text', text: 'Der Befehl war nötig und freigegeben.' },
      anfragenAntworten: [{ muster: '**/api/entscheidungen', methode: 'POST', json: { ok: true } }],
      klick: '#lauf-dialog [data-aktion="antwort"]',
      ...warte('#lauf-meldung.erfolg', 10000),
      screenshot: 'd1440-rueckfrage-2-gespeichert.webp',
    },
  ],
})

folgen['abbruch'] = folge({
  hash: '#/runs/nw-lauf',
  schritte: [
    { label: 'Lage d', ...DETAIL_DA('laeuft') },
    { label: 'Klick „Lauf abbrechen“ → Bestätigung ohne Grundfeld, Fokus auf „Zurück“', klick: '#lauf-notiz [data-aktion="abbrechen-oeffnen"]', ...DIALOG_AUF, ...DIALOG_BILD, screenshot: 'd1440-abbruch-1-dialog.webp' },
    {
      label: 'Klick „Lauf abbrechen“ im Dialog → 200: Dialog zu, Meldung „Abbruch angefordert.“',
      anfragenAntworten: [{ muster: '**/api/laeufe/nw-lauf/abbrechen', methode: 'POST', json: { ok: true } }],
      klick: '#lauf-dialog [data-aktion="abbrechen"]',
      ...warte('#lauf-meldung.erfolg', 10000),
      screenshot: 'd1440-abbruch-2-angefordert.webp',
    },
  ],
})

folgen['zurueck'] = folge({
  hash: '#/ausfuehrungen',
  schritte: [
    { label: '#/ausfuehrungen', ...warte('#laeufe .lauf-zeile[data-lauf-id="nw-fehl"]') },
    { label: 'Klick auf die Zeile nw-fehl → Detail als Seite, Fokus auf dem Titel', klick: '#laeufe .lauf-zeile[data-lauf-id="nw-fehl"]', ...DETAIL_DA('fehler') },
    { label: 'Klick „← Alle Ausführungen“ → history.back(), Register „Ausführungen“, Fokus auf der Zeile (F-926)', klick: '#lauf-detail-schliessen', ...warte('#laeufe .lauf-zeile[data-lauf-id="nw-fehl"]:focus', 10000), screenshot: 'd1440-zurueck-fokus.webp' },
  ],
})

folgen['aufklapp'] = folge({
  hash: '#/runs/nw-fehl',
  schritte: [
    { label: 'Lage a', ...DETAIL_DA('fehler') },
    { label: '„Auftrag, Kontext & Nachweise“ offen', klick: '#lauf-auftrag summary' },
    { label: '„Worker, Modell & Herkunft“ offen', klick: '#lauf-herkunft summary' },
    { label: '„Technisches Protokoll“ offen', klick: '#lauf-protokoll summary' },
    { label: '„Tatsächlich verwendete Fähigkeiten“ offen (Beobachtung, echt)', klick: '#lauf-faehigkeiten summary', ...warte('#lauf-faehigkeiten[open] .lauf-beobachtung'), screenshot: 'd1440-aufklapp-alle.webp' },
    { label: 'Klick „Aktualisieren“: das Detail lädt neu, die Bereiche bleiben offen', klick: '#lauf-notiz [data-aktion="aktualisieren"]', ...warte('#lauf-protokoll[open] .lauf-checkpoints'), screenshot: 'd1440-aufklapp-nach-aktualisieren.webp' },
  ],
})

folgen['leer-fehler'] = folge({
  hash: '#/ausfuehrungen',
  antworten: [{ muster: '**/api/zustand', json: zustand({ laeufe: [], startfehler: [], workflows: WORKFLOW_LISTE }) }],
  schritte: [
    { label: 'Leerzustand: „Noch keine Ausführungen.“, „Keine Startfehler.“', ...warte('#laeufe .empty'), screenshot: 'd1440-leer.webp' },
    {
      label: 'Fehlerzustand: laeufe und startfehler null → rote Notiz, keine Entwarnung',
      anfragenAntworten: [{ muster: '**/api/zustand', json: zustand({ laeufe: null, startfehler: null, workflows: WORKFLOW_LISTE, fehler: [{ quelle: 'laeufe', grund: 'basisVerzeichnis defekt' }] }) }],
      ...warte('#laeufe .note.red', 10000),
      screenshot: 'd1440-nicht-verfuegbar.webp',
    },
    { label: 'Deep-Link auf einen verschwundenen Lauf: 404 als rote Notiz, nichts Altes bedienbar', navigiere: '#/runs/nw-weg', ...warte('#lauf-detail-fehler:not([hidden])', 10000), screenshot: 'd1440-detail-404.webp' },
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
