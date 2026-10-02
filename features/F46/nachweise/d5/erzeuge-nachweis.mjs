/**
 * Datei: features/F46/nachweise/d5/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweise F46 D5 „Live-Ansicht, beendeter Lauf, Aufträge-Liste“ — alles mit festen
 * Antworten (page.route), kein Modell-Lauf, keine Schreibanfrage (jeder POST auf /api/laeufe/**,
 * /api/workflows/**, /api/entscheidungen und /api/chat bekäme 409 mit der Marke „NACHWEIS: POST erkannt“):
 * - #/live mit laufendem Lauf: Aktivität gefüllt, Filter, gewählter Eintrag mit „Mehr dazu“,
 *   „Frag Jarvis dazu“ (befüllt nur die Chat-Eingabe), Abbrechen-Dialog (Stopp mit Pflichtbegründung:
 *   leer gesperrt, mit Text frei — nicht abgeschickt);
 * - #/live ohne Lauf („Die Workforce wartet“: Zuletzt, Als Nächstes);
 * - beendeter Lauf #/runs/<laufId> (dieselbe Seite, Bestand: Timeline, Aufklappbereiche);
 * - Fehlerfall (Lauf-Detail 500);
 * - #/runs mit beiden Registern (Aufträge · Ausführungen) und Reiterzeile der Entwicklung;
 * - Live-Chip im Kopf führt auf #/live;
 * - Matrix 1440 dunkel, 1440 hell, 390 dunkel, 1440 mit 200 % Zoom, ru — für #/live (läuft und wartet);
 * - Escape-Fall (HTML in Werkzeugziel, Dateiname, Titel, Kontextpaket).
 * Die Folgen laufen über scripts/render-nachweis.mjs (klickfolge.json je Unterordner). Screenshots als
 * WebP. Vor dem Lauf leert das Skript die Ausgabeordner GENAU der Folgen, die es neu erzeugt.
 *
 * Wird aufgerufen von: Hand, gegen einen laufenden Leitstand dieses Worktrees —
 *   LEITSTAND_PORT=4199 node scripts/leitstand-server.mjs
 *   node features/F46/nachweise/d5/erzeuge-nachweis.mjs [basis] [nurOrdner]
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

// ─── Feste Antworten ────────────────────────────────────────────────────────

const PROJEKTE = { projekte: [{ id: 'ai-workforce', name: 'AI Workforce', repo_pfad: '.', basisverzeichnis: 'kontrollzustand', status: 'IN_ENTWICKLUNG', laufAktiv: false }] }

/** Feste „Jetzt“-Basis: die Zeiten liegen relativ zur Erzeugung, damit „vor n min“ stimmt. */
const JETZT = Date.now()
const vor = (minuten) => new Date(JETZT - minuten * 60000).toISOString()

const LAUF_LIVE = 'lauf-d5-live-7c1e'
const LAUF_FERTIG = 'lauf-d5-fertig-3a9b'
const LAUF_KAPUTT = 'lauf-d5-kaputt-0f00'
const HTML = '<img src=x onerror=alert(1)> <b>fett</b>'

const aufruf = (minuten, werkzeug, zielText, art) => ({ zeit: vor(minuten), werkzeug, ziel: zielText, art })
const AKTIVITAET = {
  eintraege: [
    aufruf(0.2, 'Edit', 'C:\\Users\\stefa\\Projekte\\ai-workforce\\public\\leitstand\\i18n\\de.js', 'aendert'),
    aufruf(1, 'Edit', 'C:\\Users\\stefa\\Projekte\\ai-workforce\\public\\leitstand\\views\\live.js', 'aendert'),
    aufruf(2, 'Bash', 'npm run check', 'befehl'),
    aufruf(4, 'Skill', 'frontend-design', 'faehigkeit'),
    aufruf(6, 'Write', 'C:\\Users\\stefa\\Projekte\\ai-workforce\\public\\leitstand\\views\\live-anzeige.js', 'aendert'),
    aufruf(8, 'Grep', 'laufAktivFortschritt', 'liest'),
    aufruf(9, 'Task', 'code-reviewer', 'faehigkeit'),
    aufruf(12, 'Read', 'C:\\Users\\stefa\\Projekte\\ai-workforce\\docs\\design\\abgleich-f46.md', 'liest'),
    aufruf(15, 'Read', 'C:\\Users\\stefa\\Projekte\\ai-workforce\\features\\F46\\feature.md', 'liest'),
    aufruf(18, 'Read', 'C:\\Users\\stefa\\Projekte\\ai-workforce\\CLAUDE.md', 'liest'),
  ],
  anzahlGesamt: 37,
  grenze: 50,
  beruehrteDateien: [
    'C:\\Users\\stefa\\Projekte\\ai-workforce\\public\\leitstand\\views\\live-anzeige.js',
    'C:\\Users\\stefa\\Projekte\\ai-workforce\\public\\leitstand\\views\\live.js',
    'C:\\Users\\stefa\\Projekte\\ai-workforce\\public\\leitstand\\i18n\\de.js',
  ],
  beruehrteGekappt: false,
}

const checkpoint = (sequenz, minuten, beschreibung, wirkungsmarke = null) => ({
  sequenz,
  zeitstempel: vor(minuten),
  gueltig: true,
  typ: wirkungsmarke ? 'wirkungsmarke' : 'lineage/artefakt_version',
  wirkungsmarke,
  lineage: wirkungsmarke ? null : { beschreibung, artefaktId: `kontextpaket-${sequenz}` },
})

const KONTEXTPAKET = { status: 'ok', rolle: 'ausfuehrung', elemente: [{ pfad: 'CLAUDE.md' }, { pfad: 'features/F46/feature.md' }, { pfad: 'docs/design/abgleich-f46.md' }, { pfad: 'public/leitstand/views/runs.js' }], ausgeschlossen: [] }
const AUFTRAG = { status: 'ok', auftragId: 'auftrag-d5', titel: 'F46 D5 · Live-Ansicht', auftragstext: 'Live-Ansicht nach Bild 08 bauen.' }

const DETAIL_LIVE = {
  laufId: LAUF_LIVE,
  checkpoints: [checkpoint(1, 18, null, { art: 'run_prepared' }), checkpoint(2, 18, 'Kontextpaket für den Bau registriert')],
  laufStatus: { status: 'KLAERUNG_ERFORDERLICH', grund: 'RUN_PREPARED ohne Terminalartefakt', blockerId: 'b-1', aufloesungsbedingung: 'Terminalmarke', resumeZiel: 'lauf', evidenz: { offeneRunPreparedSequenzen: [1] } },
  aktiv: true,
  fortschritt: { werkzeug: 'Edit', ziel: AKTIVITAET.eintraege[0].ziel },
  aktivitaet: AKTIVITAET,
  verweigertDaten: null,
  nichtGestartet: null,
  startvorlageZeitgrenzeMs: 1800000,
  kontextpaket: KONTEXTPAKET,
  auftrag: AUFTRAG,
  laufakte: { status: 'nicht_vorhanden' },
  rohstrom: { status: 'laufakte_fehlt' },
  scoutErgebnis: null,
}

const DETAIL_FERTIG = {
  ...DETAIL_LIVE,
  laufId: LAUF_FERTIG,
  checkpoints: [checkpoint(1, 30, null, { art: 'run_prepared' }), checkpoint(2, 30, 'Kontextpaket für den Bau registriert'), checkpoint(3, 6, null, { art: 'terminal', ergebnis: 'ERFOLGREICH' })],
  laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH', terminalSequenz: 3 },
  aktiv: false,
  fortschritt: null,
  aktivitaet: null,
  laufakte: { status: 'ok', worker: 'claude-code', modellDeklariert: 'claude-sonnet-5', modellBeobachtet: 'claude-sonnet-5', beobachtungsbasisVollstaendig: true, arbeitsverzeichnisPfad: 'C:\\Users\\stefa\\Projekte\\ai-workforce', beobachtung: { init_skills: ['frontend-design'], init_agents: ['code-reviewer', 'qa'], init_mcp_server: [], skill_aufrufe: ['frontend-design'], subagent_aufrufe: ['code-reviewer'], mcp_aufrufe: [] } },
  rohstrom: { status: 'ok', exitCode: 0, startfehler: null, stdoutLaenge: 48211, stderrLaenge: 0, ergebnisobjekt: { status: 'ok', permissionDenials: { anzahl: 0, toolNamen: [] } } },
}

const schritt = (id, rolle, worker, modell, status, laufId, zusatz = {}) => ({ schritt_id: id, rolle, werkzeugsatz: rolle === 'ausfuehrung' ? 'schreibend' : 'lesend', worker, modell, eingaben: [], output_schema: null, freigabe: 'AUTOMATISCH', risiko: '-', zeitgrenze_ms: 1800000, nachfolger: null, status, lauf_id: laufId, ...zusatz })
const WORKFLOW = (bauStatus, bauLauf, reviewStatus = 'OFFEN') => ({
  workflowId: 'wf-d5',
  versionSequenz: bauStatus === 'LAEUFT' ? 4 : 6,
  daten: {
    workflow_id: 'wf-d5',
    auftrag_id: 'auftrag-d5',
    ziel: 'F46 D5 · Live-Ansicht',
    status: 'LAEUFT',
    schritte: [
      schritt('schritt-1-architekt', 'architekt', 'codex', 'gpt-6-astra', 'ERFOLGREICH', 'lauf-d5-plan-11aa'),
      schritt('schritt-2-ausfuehrung', 'ausfuehrung', 'claude-code', 'claude-sonnet-5', bauStatus, bauLauf, { freigabe: 'ZWINGEND' }),
      schritt('schritt-3-review', 'code-reviewer', 'codex', 'gpt-6-astra', reviewStatus, null),
    ],
  },
  verstoesse: [],
  naechster: null,
  pruefergebnis: bauStatus === 'LAEUFT' ? { status: 'noch_nicht_gelaufen' } : { status: 'ok', ergebnis: 'GRUEN', exitCode: 0 },
})

const kopf = (laufId, minuten, status, titel = AUFTRAG.titel) => ({ laufId, laufStatus: status, ergebnis: status.ergebnis ?? null, zeitpunkt: vor(minuten), auftragsbezug: { auftragId: 'auftrag-d5', titel }, anzahlCheckpoints: 3, kettenintegritaet: true, kenntnisgenommen: false })
const LAEUFE_LIVE = [kopf(LAUF_FERTIG, 40, { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' }, 'F46 D4 · Entwicklung'), kopf(LAUF_LIVE, 0.2, DETAIL_LIVE.laufStatus)]
const LAEUFE_RUHIG = [kopf(LAUF_FERTIG, 6, { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' })]
const WF_KOPF = (status, naechster) => ({ workflowId: 'wf-d5', auftragId: 'auftrag-d5', ziel: 'F46 D5 · Live-Ansicht', status, aktiverSchrittId: 'schritt-2-ausfuehrung', grund: null, naechster, schritteAnzahl: 3, versionSequenz: status === 'LAEUFT' ? 4 : 6, abnahme: { offen: false, status: 'nicht_vorhanden' } })
const WF_FREIGABE = { workflowId: 'wf-d6', auftragId: 'auftrag-d6', ziel: 'F46 D6 · Workforce nach Design 01', status: 'WARTET_FREIGABE', aktiverSchrittId: 's1', grund: 'Schritt s1 wartet auf Freigabe (ZWINGEND).', naechster: { art: 'haltFreigabe', schrittId: 's1', grund: 'Schritt s1 wartet auf Freigabe (ZWINGEND).' }, schritteAnzahl: 2, versionSequenz: 1, abnahme: { offen: false, status: 'nicht_vorhanden' } }

const zustand = (aktiv, laeufe, workflows) => ({ laeufe, startfehler: [], workflows, fehler: [], aktiverLauf: { aktiv, laufId: aktiv ? LAUF_LIVE : null }, pruefbefehl: 'npm run check', istAiWorkforce: true })

const get = (muster, json, status = 200) => ({ muster, methode: 'GET', status, json })
const POST_SPERRE = ['**/api/laeufe**', '**/api/workflows/**', '**/api/entscheidungen', '**/api/chat'].map((muster) => ({ muster, methode: 'POST', status: 409, json: { grund: 'NACHWEIS: POST erkannt' } }))

/**
 * Grundantworten einer Folge; spätere Einträge haben Vorrang (Playwright).
 * @param varianten - { laeuft, detailLive, workflows }
 * @returns Antwortliste
 */
function antworten({ laeuft = true, detailLive = DETAIL_LIVE, laeufe = null, workflows = null } = {}) {
  const wfListe = workflows ?? (laeuft ? [WF_KOPF('LAEUFT', { art: 'warte', schrittId: null, grund: 'Schritt läuft' })] : [WF_KOPF('LAEUFT', { art: 'starte', schrittId: 'schritt-3-review', grund: 'Review ist startbereit (automatisch).' }), WF_FREIGABE])
  return [
    get('**/api/projekte', PROJEKTE),
    get('**/api/zustand', zustand(laeuft, laeufe ?? (laeuft ? LAEUFE_LIVE : LAEUFE_RUHIG), wfListe)),
    get('**/api/workitems', { workitems: [], befunde: [], fehler: [] }),
    get('**/api/workitems?**', { workitems: [], befunde: [], fehler: [] }),
    get('**/api/auftraege', [{ auftragId: 'auftrag-d5', titel: AUFTRAG.titel, workitem_referenz: 'workitem:feature:F46' }]),
    get('**/api/chat', { verlauf: [] }),
    get('**/api/startvorlage/werkzeugsaetze', [{ name: 'lesend', modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Read'] }]),
    get('**/api/workflows/wf-d5', laeuft ? WORKFLOW('LAEUFT', LAUF_LIVE) : WORKFLOW('ERFOLGREICH', LAUF_FERTIG)),
    get('**/api/workflows/wf-d5/abnahme', { workflowStatus: 'LAEUFT', freigabeHalt: null, pruefergebnis: null, entscheidung: null }),
    get(`**/api/laeufe/${LAUF_LIVE}`, detailLive),
    get(`**/api/laeufe/${LAUF_FERTIG}`, { ...DETAIL_FERTIG }),
    get(`**/api/laeufe/${LAUF_KAPUTT}`, { grund: 'Kette nicht lesbar: checkpoints/0003.json ist kein gültiges JSON' }, 500),
    ...POST_SPERRE,
  ]
}

const BEOBACHTUNG = {
  texte: [
    { name: 'Ansicht', selector: '[data-view]:not([hidden])', attribut: 'data-view' },
    { name: 'data-theme', selector: 'html', attribut: 'data-theme' },
    { name: 'lang', selector: 'html', attribut: 'lang' },
    { name: 'Nav aktiv', selector: '#shell-nav [aria-current="page"]' },
    { name: 'Live-Chip Ziel', selector: '#kopf-live-chip', attribut: 'href' },
    { name: 'Live-Chip', selector: '#kopf-live-chip', attribut: 'title' },
    { name: 'Eyebrow', selector: '#lauf-detail-eyebrow' },
    { name: 'Titel', selector: '#lauf-detail:not([hidden]) #lauf-detail-titel, #live-wartet:not([hidden]) #live-wartet-titel' },
    { name: 'Gerade', selector: '#live-gerade:not([hidden])' },
    { name: 'Filter aktiv', selector: '#live-aktivitaet [aria-pressed="true"]' },
    { name: 'Gewählter Aufruf', selector: '#live-aktivitaet .live-zeile[aria-pressed="true"] .live-ziel' },
    { name: 'Mehr dazu: Ziel', selector: '#live-mehr .live-mehr-kopf .live-ziel' },
    { name: 'Abbrechen', selector: '#live-status .lauf-aktion', attribut: 'data-aktion' },
    { name: 'Dialog: Stoppen gesperrt', selector: '#lauf-dialog[open] [data-aktion="stopp"]', attribut: 'disabled' },
    { name: 'Chat-Eingabe', selector: '#chat-eingabe' , attribut: 'value' },
    { name: 'Reiter aktiv (#/runs)', selector: '#runs-entwicklung-tabs [aria-current="page"]' },
    { name: 'Register aktiv', selector: '#runs-register [aria-current="page"]' },
    { name: 'Fokus (id)', selector: ':focus', attribut: 'id' },
  ],
  vorhanden: [
    { name: 'aria-live außer Persona (muss fehlen)', selector: '[aria-live]:not(#persona-text-status)' },
    { name: '<img> aus Daten (muss fehlen)', selector: 'main img[src="x"]' },
    { name: '<b> aus Daten (muss fehlen)', selector: '#lauf-detail b, #live-wartet b' },
  ],
  ueberlauf: true,
}

const warte = (selector, timeoutMs = 8000) => ({ warteAufSelector: { selector, timeoutMs } })

/**
 * Eine Folge.
 * @param optionen - url, schritte, farbschema, breite, hoehe, zoom, sprache, varianten
 * @returns Klickfolge
 */
function folge({ url, schritte, farbschema = 'dark', breite = 1440, hoehe = 1000, zoom = 1, sprache, varianten }) {
  return {
    url: `${basis}/${url}`,
    viewport: { breite, hoehe },
    farbschema,
    zoom,
    screenshotQualitaet: 0.7,
    screenshotVollseite: true,
    localStorageSetzen: { 'leitstand-chat-offen': 'false', ...(sprache ? { 'leitstand-sprache': sprache } : {}) },
    anfragenAntworten: antworten(varianten),
    beobachtete: BEOBACHTUNG,
    schritte,
  }
}

const folgen = {}
const LIVE_DA = '#live-aktivitaet .live-zeile'
const WARTET_DA = '#live-zuletzt .live-felder'

// ─── #/live, laufender Lauf ─────────────────────────────────────────────────
folgen['live-laeuft'] = folge({
  url: '#/live',
  hoehe: 1300,
  schritte: [
    { label: '#/live mit laufendem Lauf: Kopf (Titel, Rolle · Worker, Modell, Werkzeugsatz, Zum Eintrag), Gerade, Status-Block (läuft seit, Zeitgrenze mit Rest, Schätzung kommt, 37 Aufrufe), Ablaufleiste (Plan erledigt, Freigabe erledigt, Bau läuft, Sichern/Merge kommt), Aktivität (neueste oben), Berührte Dateien, Output, Kontextpaket', ...warte(LIVE_DA), screenshot: 'd1440-live-laeuft.webp' },
    { label: 'Klick auf den Aufruf „npm run check“ → Mehr dazu: Werkzeug Bash, Ziel, Zeit; Erklärung/Ausschnitt/Im Umfang kommt', klick: '#live-aktivitaet .live-zeile:has(.live-art[data-art="befehl"])', ...warte('#live-mehr .live-felder'), screenshot: 'k01-mehr-dazu-befehl.webp' },
    { label: 'Klick auf die erste Änderung → Mehr dazu mit „In VS Code öffnen“ und „Änderungen im Code-Reiter“', klick: '#live-aktivitaet li:first-child .live-zeile', screenshot: 'k02-mehr-dazu-aenderung.webp' },
    { label: 'Filter „Fähigkeiten“ → nur Skill und Task', klick: '#live-aktivitaet [data-live-filter="faehigkeit"]', screenshot: 'k03-filter-faehigkeiten.webp' },
    { label: '„Warnungen“ ist kommt: Fokus + Enter ändert nichts', fokus: '#live-aktivitaet .filter-chip[aria-disabled="true"]', taste: 'Enter', screenshot: 'k04-warnungen-kommt.webp' },
    { label: 'Filter „Alle“ zurück', klick: '#live-aktivitaet [data-live-filter="alle"]' },
    { label: '„Frag Jarvis dazu“ → „Wo steht der Lauf?“ füllt nur die Chat-Eingabe (kein POST)', klick: '#live-mehr [data-live-frage="wo"]', screenshot: 'k05-frag-jarvis.webp' },
    { label: 'Chat-Dock schließen (Escape)', taste: 'Escape' },
    { label: '„Abbrechen …“ → Stopp-Dialog mit Pflichtbegründung: leer → „Stoppen“ gesperrt', klick: '#live-status [data-aktion="stopp-oeffnen"]', ...warte('#lauf-dialog[open] #lauf-stopp-begruendung'), screenshot: 'k06-abbrechen-leer-gesperrt.webp' },
    { label: 'Begründung tippen → „Stoppen“ frei (nicht abgeschickt)', tippen: { selector: '#lauf-stopp-begruendung', text: 'Falscher Arbeitsordner — neu starten.' }, screenshot: 'k07-abbrechen-mit-begruendung.webp' },
    { label: 'Dialog schließen (Zurück)', klick: '#lauf-dialog button.lauf-dialog-abbrechen.button' },
    { label: '„Laufakte“ öffnet „Worker, Modell & Herkunft“', klick: '#live-status [data-live-aktion="laufakte"]', screenshot: 'k08-laufakte.webp' },
  ],
})

// ─── #/live, nichts läuft ───────────────────────────────────────────────────
folgen['live-wartet'] = folge({
  url: '#/live',
  varianten: { laeuft: false },
  schritte: [
    { label: '#/live ohne Lauf: „Die Workforce wartet“ — Zuletzt (Titel, Ergebnis, Dauer 24 min, Bericht kommt, Laufakte, Code-Reiter), Als Nächstes (Freigabe F46 D6 → Entscheidungen)', ...warte(WARTET_DA), screenshot: 'd1440-live-wartet.webp' },
    { label: '„Laufakte“ in Zuletzt → beendeter Lauf auf derselben Seite', klick: '#live-zuletzt a[href^="#/runs/"]', ...warte('#lauf-timeline .timeline'), screenshot: 'k01-zuletzt-laufakte.webp' },
  ],
})

// ─── beendeter Lauf ─────────────────────────────────────────────────────────
folgen['lauf-beendet'] = folge({
  url: `#/runs/${LAUF_FERTIG}`,
  varianten: { laeuft: false },
  hoehe: 1300,
  schritte: [
    { label: 'Beendeter Lauf: Eyebrow „Ausführung · beendet“, Status-Block mit Dauer, Ablaufleiste (Bau erledigt, Prüfschritt erledigt, Review offen), Aktivität „nur während des Laufs“, Fähigkeiten aus der Laufakte, Notiz Erfolg, Timeline, Einordnung, vier Aufklappbereiche', ...warte('#lauf-timeline .timeline'), screenshot: 'd1440-lauf-beendet.webp' },
    { label: 'Aufklappbereich „Technisches Protokoll“ geöffnet (Bestand bleibt erreichbar)', klick: '#lauf-protokoll summary', screenshot: 'k01-protokoll.webp' },
  ],
})

// ─── Fehlerfall ─────────────────────────────────────────────────────────────
folgen['lauf-fehler'] = folge({
  url: `#/runs/${LAUF_KAPUTT}`,
  varianten: { laeuft: false, laeufe: [...LAEUFE_RUHIG, kopf(LAUF_KAPUTT, 3, { status: 'ABGESCHLOSSEN', ergebnis: 'FEHLGESCHLAGEN' })] },
  schritte: [{ label: 'Lauf-Detail 500: Fehlernotiz mit Grund und „Erneut laden“, keine leeren Live-Karten', ...warte('#lauf-detail-fehler:not([hidden])'), screenshot: 'd1440-lauf-fehler.webp' }],
})

// ─── #/runs ─────────────────────────────────────────────────────────────────
folgen['runs-register'] = folge({
  url: '#/runs',
  schritte: [
    { label: '#/runs: Reiterzeile der Entwicklung („Aufträge“ aktiv), Register Aufträge · Ausführungen, „+ Auftrag anlegen“', ...warte('#runs-entwicklung-tabs a[aria-current="page"]'), screenshot: 'd1440-runs-auftraege.webp' },
    { label: 'Register „Ausführungen“ → Laufliste', klick: '#runs-register a[data-register="ausfuehrungen"]', ...warte('#laeufe .lauf-zeile'), screenshot: 'k01-runs-ausfuehrungen.webp' },
    { label: 'Live-Chip im Kopf → #/live', klick: '#kopf-live-chip', ...warte(LIVE_DA), screenshot: 'k02-live-chip.webp' },
  ],
})

// ─── Matrix ─────────────────────────────────────────────────────────────────
const DARSTELLUNGEN = {
  'hell-1440': { praefix: 'l1440', farbschema: 'light' },
  'dunkel-390': { praefix: 'd390', breite: 390, hoehe: 844 },
  'dunkel-1440-zoom200': { praefix: 'd1440z2', zoom: 2 },
  'ru-1440': { praefix: 'ru1440', sprache: 'ru' },
}
const MATRIX = {
  laeuft: { url: '#/live', warteAuf: LIVE_DA, text: '#/live mit laufendem Lauf', varianten: {} },
  wartet: { url: '#/live', warteAuf: WARTET_DA, text: '#/live ohne Lauf', varianten: { laeuft: false } },
  beendet: { url: `#/runs/${LAUF_FERTIG}`, warteAuf: '#lauf-timeline .timeline', text: 'Beendeter Lauf', varianten: { laeuft: false } },
}

// ─── Prüfpass D5 (dg 1, dg 13, qa 6): Kopf-Chip ruhig bei 1340 px, reduzierte Bewegung, fremder Lauf ─────
folgen['kopf-1340-ruhig'] = folge({
  url: '#/live',
  breite: 1340,
  varianten: { laeuft: false },
  schritte: [{ label: 'Kopf bei 1340 px im Ruhezustand: Live-Chip „Gerade läuft nichts“ in der D0-Form (7-px-Ecken, gedämpft), kein Überlauf', ...warte(WARTET_DA), screenshot: 'd1340-kopf-ruhig.webp', screenshotVollseite: false }],
})
folgen['live-reduzierte-bewegung'] = { ...folge({ url: '#/live', hoehe: 1300, schritte: [{ label: '#/live mit prefers-reduced-motion: reduce', ...warte(LIVE_DA), screenshot: 'd1440rm-live-laeuft.webp' }] }), reduzierteBewegung: true }
folgen['live-fremder-lauf'] = folge({
  url: '#/live',
  varianten: { laeuft: true, laeufe: LAEUFE_RUHIG },
  schritte: [{ label: 'Aktiver Lauf ohne Seite in diesem Projekt (anderes Projekt, D13): „Die Workforce wartet“, Als Nächstes ohne Startangebot, Hinweis „ein Lauf zur Zeit“; Chip „arbeitet“ → #/ausfuehrungen', ...warte(WARTET_DA), screenshot: 'd1440-live-fremder-lauf.webp' }],
})
for (const [seite, m] of Object.entries(MATRIX)) {
  for (const [dName, { praefix, ...darstellung }] of Object.entries(DARSTELLUNGEN)) {
    folgen[`live-${seite}-${dName}`] = folge({ url: m.url, varianten: m.varianten, schritte: [{ label: m.text, ...warte(m.warteAuf), screenshot: `${praefix}-live-${seite}.webp` }], ...darstellung })
  }
}

// ─── Escape ────────────────────────────────────────────────────────────────
const DETAIL_HTML = {
  ...DETAIL_LIVE,
  auftrag: { ...AUFTRAG, titel: `F46 D5 ${HTML}` },
  kontextpaket: { ...KONTEXTPAKET, elemente: [{ pfad: `docs/${HTML}.md` }] },
  aktivitaet: {
    ...AKTIVITAET,
    eintraege: [aufruf(0.2, 'Edit', `public/${HTML}.js`, 'aendert'), aufruf(1, `mcp__${HTML}`, `"><script>alert(1)</script>`, 'faehigkeit'), ...AKTIVITAET.eintraege.slice(2)],
    beruehrteDateien: [`public/${HTML}.js`],
  },
  fortschritt: { werkzeug: 'Edit', ziel: `public/${HTML}.js` },
}
folgen.escape = folge({
  url: '#/live',
  breite: 1600,
  hoehe: 1300,
  varianten: { detailLive: DETAIL_HTML, laeufe: [kopf(LAUF_LIVE, 0.2, DETAIL_LIVE.laufStatus, `F46 D5 ${HTML}`)] },
  schritte: [
    { label: 'HTML in Werkzeugziel, Werkzeugname, Dateiname, Titel und Kontextpaket erscheint als Text (Liste, Gerade, Berührte Dateien, Kopf); kein <img>, kein <b>', ...warte(LIVE_DA), screenshot: 'd1600-escape-live.webp' },
    { label: 'Gewählter Aufruf mit HTML → Mehr dazu escaped', klick: '#live-aktivitaet li:first-child .live-zeile', screenshot: 'k01-escape-mehr-dazu.webp' },
  ],
})

// ─── Ausführen ─────────────────────────────────────────────────────────────
if (nur && !(nur in folgen)) throw new Error(`Unbekannte Folge: ${nur}`)
const auszufuehren = nur ? { [nur]: folgen[nur] } : folgen

for (const [ordner, klickfolge] of Object.entries(auszufuehren)) {
  const verzeichnis = join(ziel, ordner)
  // Nur ein eigener, direkter Unterordner dieses Skripts (features/F46/nachweise/d5/<folge>) wird geleert — nie etwas anderes.
  if (!/^[a-z0-9-]+$/.test(ordner) || dirname(verzeichnis) !== ziel) throw new Error(`Ausgabeordner außerhalb von ${ziel}: ${verzeichnis}`)
  rmSync(verzeichnis, { recursive: true, force: true })
  mkdirSync(verzeichnis, { recursive: true })
  console.log(`\n── ${ordner} ──`)
  const pfad = join(verzeichnis, 'klickfolge.json')
  writeFileSync(pfad, `${JSON.stringify(klickfolge, null, 2)}\n`)
  execFileSync(process.execPath, [join(wurzel, 'scripts/render-nachweis.mjs'), pfad, verzeichnis], { stdio: 'inherit', cwd: wurzel })
}
