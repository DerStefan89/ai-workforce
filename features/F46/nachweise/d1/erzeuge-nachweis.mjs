/**
 * Datei: features/F46/nachweise/d1/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweise F46 D1 „Produktübersicht, Roadmap, Projektakte“ — alles mit festen
 * Antworten (page.route), kein Modell-Lauf, keine Schreibanfrage:
 * - Matrix je Seite #/dashboard, #/roadmap (Detailpanel offen, ein Feature gewählt) und
 *   #/projektakte: 1440 dunkel, 1440 hell, 390 dunkel, 1440 dunkel mit 200 % Zoom, 1440 ru —
 *   ganze Seite;
 * - Klicktabellen: Rollen-Kreis per Klick und Tastatur (Pfeil, Ende) mit „Rolle im Detail“ und
 *   „In diesem Lauf“; Filter des Arbeitsstands; Roadmap: Abgeschlossene einblenden, Alles aufklappen,
 *   Auswahl eines Features, „Frag Jarvis dazu“ befüllt nur die Chat-Eingabe (kein Senden); Projektakte:
 *   Seitenleiste markiert „Roadmap“, Arbeitsweise aufklappen;
 * - Zustände (Prüfpass D1): Ablauf ohne Feature im Rollen-Kreis; Roadmap-Abruffehler mit „Erneut laden“
 *   auf der Übersicht; lange Texte (Zielsatz, Titel); Projektakte mit fehlender Datei, gekürzter Datei und nicht eindeutigem Versionsziel;
 *   Abruffehler der Projektakte; Escape-Fall (HTML in Titeln und Dateitexten erscheint als Text).
 * Die Folgen laufen über scripts/render-nachweis.mjs (klickfolge.json je Unterordner). Screenshots als
 * WebP. Vor dem Lauf leert das Skript die Ausgabeordner GENAU der Folgen, die es neu erzeugt
 * (fs.rmSync) — nie etwas anderes.
 *
 * Wird aufgerufen von: Hand, gegen einen laufenden Leitstand dieses Worktrees —
 *   LEITSTAND_PORT=4199 node scripts/leitstand-server.mjs
 *   node features/F46/nachweise/d1/erzeuge-nachweis.mjs [basis] [nurOrdner]
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

const LAUF_BUILDER = '7a1c2e90-4b3d-4f6a-8c21-d1e2f3a4b5c6'
const LAUF_PLANNER = '2b9d8c7e-1a2b-4c3d-9e8f-0a1b2c3d4e5f'
const PROJEKTE = { projekte: [{ id: 'ai-workforce', name: 'AI Workforce', repo_pfad: 'C:\\Nachweis\\ai-workforce', status: 'IN_ENTWICKLUNG', laufAktiv: true }] }

const kopfdaten = { laufId: LAUF_BUILDER, laufStatus: { status: 'NICHT_GESTARTET' }, ergebnis: null, zeitpunkt: '2026-10-02T09:12:00.000Z', auftragsbezug: { auftragId: 'a-f46', titel: 'Design-Nachbau D1 umsetzen' }, anzahlCheckpoints: 1, kettenintegritaet: true, kenntnisgenommen: false }
const ZUSTAND = {
  laeufe: [kopfdaten],
  startfehler: [],
  workflows: [
    { workflowId: 'w-f46', auftragId: 'a-f46', status: 'LAEUFT', ziel: 'Design-Nachbau D1 umsetzen', naechster: null, aktiverSchrittId: 's3' },
    { workflowId: 'w-f30', auftragId: 'a-f30', status: 'WARTET_FREIGABE', ziel: 'Scanner vorbereiten', naechster: { art: 'haltFreigabe', schrittId: 's1' } },
  ],
  fehler: [],
  aktiverLauf: { aktiv: true, laufId: LAUF_BUILDER },
  pruefbefehl: null,
  istAiWorkforce: true,
}

const WORKITEMS = {
  workitems: [
    { quelle: 'feature', typ: 'FEATURE', id: 'F46', titel: 'Design-Nachbau', status: 'IN_ARBEIT' },
    { quelle: 'feature', typ: 'FEATURE', id: 'F30', titel: 'Opportunity Scanner', status: 'READY_FOR_TECH' },
    { quelle: 'feature', typ: 'FEATURE', id: 'F44', titel: 'Design-Schnitt', status: 'ABGESCHLOSSEN' },
    { quelle: 'feature', typ: 'FEATURE', id: 'F37', titel: 'Besetzung erklären', status: 'ENTWURF' },
    { quelle: 'finding', typ: 'PROCESS_IMPROVEMENT', id: 'F-936', titel: 'Planende Rollen ohne Projektkontext', status: 'OFFEN', prioritaet: 'P1' },
    { quelle: 'finding', typ: 'HARNESS_IMPROVEMENT', id: 'F-939', titel: 'Mindest-Gates im Projekt-Skelett', status: 'OFFEN', prioritaet: 'P2' },
    { quelle: 'finding', typ: 'BUG', id: 'F-885', titel: 'Offene Eingaben beim Projektwechsel', status: 'OFFEN', prioritaet: 'P2' },
    { quelle: 'finding', typ: 'TECH_DEBT', id: 'F-950', titel: 'Großes Stylesheet aufteilen', status: 'OFFEN', prioritaet: 'P2' },
    { quelle: 'finding', typ: 'BUG', id: 'F-870', titel: 'Fokus springt nach dem Laden', status: 'ERLEDIGT', prioritaet: 'P2' },
  ],
  befunde: [],
  fehler: [],
}
const P0P1 = { workitems: WORKITEMS.workitems.filter((w) => w.status === 'OFFEN' && (w.prioritaet === 'P0' || w.prioritaet === 'P1')), befunde: [], fehler: [] }
const AUFTRAEGE = [
  { auftragId: 'a-f46', titel: 'Design-Nachbau D1 umsetzen', erstellt_am: '2026-10-02T08:00:00.000Z', workitem_referenz: 'workitem:feature:F46' },
  { auftragId: 'a-f30', titel: 'Scanner vorbereiten', erstellt_am: '2026-10-02T08:30:00.000Z', workitem_referenz: 'workitem:feature:F30' },
]

const schritt = (id, rolle, worker, status, laufId, nachfolger) => ({ schritt_id: id, rolle, worker, status, lauf_id: laufId, nachfolger, freigabe: 'ZWINGEND' })
const WORKFLOW_F46 = {
  daten: {
    status: 'LAEUFT',
    aktiver_schritt_id: 's3',
    schritte: [schritt('s1', 'architekt', 'codex', 'ERFOLGREICH', LAUF_PLANNER, 's2'), schritt('s2', 'architecture-advisor', 'claude-code', 'ERFOLGREICH', null, 's3'), schritt('s3', 'ausfuehrung', 'claude-code', 'LAEUFT', LAUF_BUILDER, 's4'), schritt('s4', 'code-reviewer', 'codex', 'OFFEN', null, null)],
  },
  naechster: null,
  empfehlung: null,
}
const ABNAHME_F46 = { workflowStatus: 'LAEUFT', freigabeHalt: null, entscheidung: { status: 'nicht_vorhanden' }, urteil: { status: 'noch_nicht_gelaufen' }, aenderungsuebersicht: { status: 'noch_nicht_gelaufen' }, pruefergebnis: { status: 'noch_nicht_gelaufen' } }
const WORKFLOW_F30 = { daten: { status: 'WARTET_FREIGABE', aktiver_schritt_id: 's1', schritte: [schritt('s1', 'ausfuehrung', 'claude-code', 'WARTET_FREIGABE', null, null)] }, naechster: { art: 'haltFreigabe', schrittId: 's1' }, empfehlung: null }
const ABNAHME_F30 = { workflowStatus: 'WARTET_FREIGABE', freigabeHalt: { schrittId: 's1', grund: null }, entscheidung: { status: 'nicht_vorhanden' } }

const laufDetail = (laufId, laufakte) => ({ laufId, laufStatus: { status: 'ABGESCHLOSSEN' }, aktiv: false, auftrag: { status: 'ok', auftragId: 'a-f46', titel: 'Design-Nachbau D1 umsetzen' }, kontextpaket: { status: 'nicht_vorhanden' }, laufakte, rohstrom: { status: 'laufakte_fehlt' }, checkpoints: [{ sequenz: 1, zeitstempel: '2026-10-02T08:10:00.000Z', gueltig: true, typ: 'wirkungsmarke', wirkungsmarke: { art: 'run_prepared' } }] })
const LAUF_PLANNER_DETAIL = laufDetail(LAUF_PLANNER, { status: 'ok', worker: 'codex', modellBeobachtet: 'gpt-6-astra', beobachtung: { init_skills: [], init_agents: [], init_mcp_server: [], skill_aufrufe: ['advisor-pass'], subagent_aufrufe: [], mcp_aufrufe: [] } })
const LAUF_BUILDER_DETAIL = { ...laufDetail(LAUF_BUILDER, { status: 'nicht_vorhanden' }), aktiv: true, laufStatus: { status: 'NICHT_GESTARTET' } }

const ROADMAP = {
  status: 'ok',
  vision: 'Eine lokale Orchestrierung, die ein Vorhaben von der Idee bis zum abgenommenen Ergebnis führt.',
  meilensteine: [
    { id: 'M3', titel: 'Intelligente Orchestrierung', status: 'ABGESCHLOSSEN', features: [{ id: 'F15', titel: 'Workflow', status: 'ABGESCHLOSSEN' }, { id: 'F16', titel: 'Zweiter Worker', status: 'ABGESCHLOSSEN' }] },
    { id: 'M4', titel: 'Jarvis Workspace', status: 'ABGESCHLOSSEN', features: [{ id: 'F20', titel: 'Jarvis Shell', status: 'ABGESCHLOSSEN' }] },
    {
      id: 'M5',
      titel: 'Projektkontext, Coach, Challenge-Flow, Architektur',
      status: 'LAEUFT',
      features: [
        { id: 'F44', titel: 'Design-Schnitt', status: 'ABGESCHLOSSEN' },
        { id: 'F46', titel: 'Design-Nachbau', status: 'IN_ARBEIT' },
        { id: 'F30', titel: 'Opportunity Scanner', status: 'READY_FOR_TECH' },
        { id: 'F47', status: 'keine_akte' },
      ],
    },
    { id: 'V1-Backlog', titel: 'Gebaut bei erfülltem Auslöser', status: 'GEPLANT', features: [{ id: 'F37', titel: 'Besetzung erklären', status: 'ENTWURF' }] },
  ],
}
const akte = (id, titel, status, zielText) => ({ status: 'ok', id, titel, featureStatus: status, ziel: zielText, nicht_ziele: [], akzeptanzkriterien: [] })
const AKTE_F46 = akte('F46', 'Design-Nachbau', 'IN_ARBEIT', 'Der Leitstand wird nach den neuen Designs umgestaltet — überwiegend Umbau vorhandener Funktionen.')
const AKTE_F30 = akte('F30', 'Opportunity Scanner', 'READY_FOR_TECH', 'Ein eigenständiges Produkt wird mit der Workforce selbst gebaut.')

const NACHWEIS_WURZEL = 'C:\\Nachweis\\ai-workforce'
const datei = (pfad, text, extra = {}) => ({ status: 'ok', pfad, absolut: `${NACHWEIS_WURZEL}\\${pfad.replaceAll('/', '\\')}`, ...(text === undefined ? {} : { text, gekuerzt: false }), ...extra })
const BESCHREIBUNG = `# Projektbeschreibung

## Was es ist

Eine lokale Orchestrierung mit getrennten Rollen.

## Für wen

Ein einziger Nutzer, der zugleich Vorarbeiter und einzige
Entscheidungsinstanz ist. Mehrbenutzerbetrieb in einer Instanz ist kein Ziel.

## Führungsprinzip

Dateien und Git sind der führende Zustand. Der Kontrollzustand eines Projekts liegt in
dessen eigenem Repository, nie zentral.

## Nicht das Ziel

Mehrbenutzerbetrieb in einer Instanz, Hosting, Abrechnung.
`
const ANWEISUNGEN = `# Arbeitsweise

Kurzfassung.

## Positionen und Rollenverträge

Rollen in getrennten Werkzeugprozessen mit eigenem Werkzeugsatz und Rollenvertrag.

## Iterationsprinzip

Jede Iteration ist klein, prüfbar und abgeschlossen.

## Freigaben und Prüfrollen

- Prüfrollen sind reine Leser.
- Kein Commit ohne Freigabe.
`
const LAGEBILD = `# Lagebild — erzeugt

## Aktuelle Phase

Meilenstein M5 läuft. F46 ist in Arbeit, danach das Fixpaket.

## Offene P1-Findings

- F-936 — Planende Rollen ohne Projektkontext
`
const PROJEKTAKTE = {
  dateien: {
    beschreibung: datei('docs/projekt/kontext/beschreibung.md', BESCHREIBUNG),
    anweisungen: datei('docs/projekt/kontext/anweisungen.md', ANWEISUNGEN),
    lagebild: datei('docs/projekt/kontext/lagebild.md', LAGEBILD),
    roadmap: datei('docs/projekt/roadmap.json'),
    zielfassung: datei('docs/projekt/zielfassung.md'),
  },
  versionsziel: { meilenstein: 'M5', status: 'ok', zielsatz: 'Die Workforce führt ein neues Produkt von der Idee bis zum abgenommenen ersten Meilenstein.', kriterien: ['Der Scanner liegt in einem eigenen Repo und ist über Workflows gebaut.', 'Jedes AK hat ein Urteil mit Beleg.'] },
}
const PROJEKTAKTE_LUECKEN = {
  dateien: {
    ...PROJEKTAKTE.dateien,
    beschreibung: { ...datei('docs/projekt/kontext/beschreibung.md', BESCHREIBUNG), gekuerzt: true },
    lagebild: { status: 'fehlt', pfad: 'docs/projekt/kontext/lagebild.md' },
    anweisungen: { status: 'fehler', pfad: 'docs/projekt/kontext/anweisungen.md', grund: 'EACCES' },
  },
  versionsziel: { meilenstein: 'M5', status: 'nicht_eindeutig', treffer: 2 },
}

// Escape-Fall: HTML in Titeln (Workitems, Roadmap) und im Dateitext.
const HTML = '<img src=x onerror=alert(1)> <b>fett</b>'
const WORKITEMS_HTML = { ...WORKITEMS, workitems: WORKITEMS.workitems.map((w) => (w.id === 'F46' || w.id === 'F-939' ? { ...w, titel: `${w.titel} ${HTML}` } : w)) }
const ROADMAP_HTML = { ...ROADMAP, meilensteine: ROADMAP.meilensteine.map((m) => (m.id === 'M5' ? { ...m, titel: `${m.titel} ${HTML}`, features: m.features.map((f) => (f.id === 'F46' ? { ...f, titel: `Design-Nachbau ${HTML}` } : f)) } : m)) }
const PROJEKTAKTE_HTML = { ...PROJEKTAKTE, dateien: { ...PROJEKTAKTE.dateien, beschreibung: datei('docs/projekt/kontext/beschreibung.md', BESCHREIBUNG.replace('Ein einziger Nutzer', `Ein einziger Nutzer ${HTML} <script>alert(2)</script>`)) } }

const get = (muster, json, status = 200) => ({ muster, methode: 'GET', status, json })
/**
 * Grundantworten aller Folgen; spätere Einträge haben Vorrang (Playwright).
 * @param varianten - { workitems, roadmap, projektakte, projektakteStatus }
 * @returns Antwortliste
 */
function antworten({ workitems = WORKITEMS, roadmap = ROADMAP, roadmapStatus = 200, projektakte = PROJEKTAKTE, projektakteStatus = 200, zustand = ZUSTAND } = {}) {
  return [
    get('**/api/zustand', zustand),
    get('**/api/projekte', PROJEKTE),
    get('**/api/roadmap', roadmap, roadmapStatus),
    get('**/api/workitems', workitems),
    get('**/api/workitems?status=OFFEN', P0P1),
    get('**/api/auftraege', AUFTRAEGE),
    get('**/api/projektakte', projektakte, projektakteStatus),
    get('**/api/workflows/w-f46', WORKFLOW_F46),
    get('**/api/workflows/w-f46/abnahme', ABNAHME_F46),
    get('**/api/workflows/w-f30', WORKFLOW_F30),
    get('**/api/workflows/w-f30/abnahme', ABNAHME_F30),
    get(`**/api/laeufe/${LAUF_PLANNER}`, LAUF_PLANNER_DETAIL),
    get(`**/api/laeufe/${LAUF_BUILDER}`, LAUF_BUILDER_DETAIL),
    get('**/api/features/F46/akte', AKTE_F46),
    get('**/api/features/F30/akte', AKTE_F30),
    get('**/api/chat', { verlauf: [] }),
    // Senden darf nicht passieren: ein POST bekäme 409 mit Marke, der Chat zeigte dann #chat-fehler.
    { muster: '**/api/chat', methode: 'POST', status: 409, json: { grund: 'NACHWEIS: Senden erkannt' } },
    { muster: '**/api/sparring', methode: 'POST', status: 409, json: { grund: 'NACHWEIS: Senden erkannt' } },
  ]
}

const BEOBACHTUNG = {
  texte: [
    { name: 'Ansicht', selector: '[data-view]:not([hidden])', attribut: 'data-view' },
    { name: 'data-theme', selector: 'html', attribut: 'data-theme' },
    { name: 'lang', selector: 'html', attribut: 'lang' },
    { name: 'Nav aktiv', selector: '#shell-nav [aria-current="page"]' },
    { name: 'Register aktiv', selector: '[data-view]:not([hidden]) .planung-register [aria-current="page"]' },
    { name: 'Rolle gewählt', selector: '[data-view]:not([hidden]) .rollen-kreis [aria-selected="true"]', attribut: 'data-kreis-rolle' },
    { name: 'Rolle im Detail', selector: '[data-view]:not([hidden]) #uebersicht-rolle-detail h2' },
    { name: 'In diesem Lauf', selector: '[data-view]:not([hidden]) #uebersicht-rolle-detail dd:last-of-type' },
    { name: 'Filter Arbeitsstand', selector: '[data-view]:not([hidden]) [data-arbeitsstand-filter][aria-pressed="true"]' },
    { name: 'Roadmap-Detail', selector: '[data-view]:not([hidden]) #rm-detail-titel' },
    { name: 'Abgeschlossene', selector: '[data-view]:not([hidden]) [data-roadmap-abgeschlossene]', attribut: 'aria-pressed' },
    { name: 'Chat-Eingabe', selector: '#chat-eingabe', eigenschaft: 'value' },
    { name: 'Chat-Fehler (Senden erkannt, muss fehlen)', selector: '#chat-fehler:not([hidden])' },
    { name: 'Fokus (id/Rolle)', selector: ':focus', attribut: 'id' },
  ],
  vorhanden: [
    { name: 'Chat-Dock offen', selector: '#shell-chat-spalte:not([hidden])' },
    { name: 'aria-live außer Persona (muss fehlen)', selector: '[aria-live]:not(#persona-text-status)' },
    { name: '<img> aus Daten (muss fehlen)', selector: 'main img[src="x"]' },
    { name: '<script> im Inhalt (muss fehlen)', selector: 'main script' },
  ],
  ueberlauf: true,
}

const warte = (selector, timeoutMs = 8000) => ({ warteAufSelector: { selector, timeoutMs } })

/**
 * Eine Folge.
 * @param optionen - url, schritte, farbschema, breite, hoehe, zoom, sprache, antworten
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

// ─── Matrix ────────────────────────────────────────────────────────────────
const DARSTELLUNGEN = {
  'dunkel-1440': { praefix: 'd1440' },
  'hell-1440': { praefix: 'l1440', farbschema: 'light' },
  'dunkel-390': { praefix: 'd390', breite: 390, hoehe: 844 },
  'dunkel-1440-zoom200': { praefix: 'd1440z2', zoom: 2 },
  'ru-1440': { praefix: 'ru1440', sprache: 'ru' },
}
const SEITEN = {
  uebersicht: { url: '#/dashboard', warteAuf: '#uebersicht-rolle-detail', text: 'Produktübersicht: vier Kopfkarten (Rollen-Kreis: Planner/Advisor fertig, Builder läuft), Kennzahlen, Weg („kommt“), Kacheln, Arbeitsstand, Zuletzt umgesetzt' },
  roadmap: { url: '#/roadmap', warteAuf: '#rm-detail-titel', text: 'Roadmap: Kennzahlen, Baum mit M5 oben, Detailpanel F30 gewählt (Ziel aus der Akte), Entwicklungsstand', klick: '[data-roadmap-waehlen="feature"][data-id="F30"]', warteNach: '#rm-detail-titel' },
  projektakte: { url: '#/projektakte', warteAuf: '.akte-empfaenger', text: 'Projektakte: Vision, Für wen, Führungsprinzip, Ziel M5 mit Kriterien, Arbeitsweise, Lage; Empfänger und Quellen' },
}
for (const [seite, s] of Object.entries(SEITEN)) {
  for (const [dName, { praefix, ...darstellung }] of Object.entries(DARSTELLUNGEN)) {
    const schritte = [{ label: s.text, ...warte(s.warteAuf), ...(s.klick ? {} : { screenshot: `${praefix}-${seite}.webp` }) }]
    if (s.klick) schritte.push({ label: 'Feature F30 gewählt — Detailpanel mit „Frag Jarvis dazu“ und „Anpassen“ (kommt)', klick: s.klick, ...warte(s.warteNach), screenshot: `${praefix}-${seite}.webp` })
    folgen[`${seite}-${dName}`] = folge({ url: s.url, schritte, ...darstellung })
  }
}

// ─── Klicktabellen ─────────────────────────────────────────────────────────
folgen['klicks-uebersicht'] = folge({
  url: '#/dashboard',
  schritte: [
    { label: 'Start: Builder vorgewählt (läuft), „In diesem Lauf“ — (Lauf ohne Laufakte)', ...warte('#rollen-kreis-tab-builder[aria-selected="true"]') },
    { label: 'Klick auf Planner → Rolle im Detail Planner, „In diesem Lauf“ aus der Beobachtung (Skills: advisor-pass)', klick: '#rollen-kreis-tab-planner', ...warte('#uebersicht-rolle-detail[aria-labelledby="rollen-kreis-tab-planner"]'), screenshot: 'k01-planner.webp' },
    { label: 'Tastatur: Pfeil rechts → Advisor gewählt und fokussiert', taste: 'ArrowRight', screenshot: 'k02-pfeil-advisor.webp' },
    { label: 'Tastatur: Ende → design-guardian (Satellit, offen, keine Quelle)', taste: 'End', screenshot: 'k03-ende-satellit.webp' },
    { label: 'Filter Arbeitsstand „Braucht dich“ → nur diese Spalte (F30 wartet auf Freigabe)', klick: '[data-arbeitsstand-filter="braucht_dich"]', screenshot: 'k04-filter-braucht-dich.webp' },
    { label: 'Klick „Zu den Entscheidungen“ → #/attention', klick: '.uebersicht-braucht .text-link', ...warte('#view-attention:not([hidden])'), screenshot: 'k05-zu-entscheidungen.webp' },
  ],
})

folgen['klicks-roadmap'] = folge({
  url: '#/roadmap',
  schritte: [
    { label: 'Start: M5 oben aufgeklappt, F46 (in Arbeit) im Detailpanel, abgeschlossene ausgeblendet', ...warte('#rm-detail-titel') },
    { label: 'Klick „Einblenden“ → M3/M4 unten sichtbar, Knopf aria-pressed true', klick: '[data-roadmap-abgeschlossene]', screenshot: 'k01-einblenden.webp' },
    { label: 'Klick „Alles aufklappen“ → alle Meilensteine offen', klick: '[data-roadmap-alles]', screenshot: 'k02-alles-auf.webp' },
    { label: 'Klick auf Meilenstein M5 → Detail Meilenstein (Inhalt x Features)', klick: '[data-roadmap-waehlen="meilenstein"][data-id="M5"]', screenshot: 'k03-meilenstein.webp' },
    { label: 'Klick auf F30 → Detail Feature mit Ziel aus der Akte', klick: '[data-roadmap-waehlen="feature"][data-id="F30"]', screenshot: 'k04-feature.webp' },
    { label: '„Warum diese Reihenfolge?“ → Chat-Dock offen, Eingabe befüllt, nichts gesendet', klick: '[data-roadmap-jarvis-frage="reihenfolge"]', ...warte('#shell-chat-spalte:not([hidden])'), screenshot: 'k05-frag-jarvis.webp', ohneAusschnitt: true },
    { label: 'Kopf „Jarvis zur Roadmap fragen“ → Roadmap-Frage kommt hinter den vorhandenen Entwurf (Getipptes bleibt, F44 WS-8b), nichts gesendet', klick: '[data-roadmap-jarvis-kopf]', screenshot: 'k06-kopf-jarvis.webp', ohneAusschnitt: true },
  ],
})

folgen['klicks-projektakte'] = folge({
  url: '#/projektakte',
  schritte: [
    { label: 'Start #/projektakte: Seitenleiste markiert „Roadmap“, Register „Projektakte“ aktuell', ...warte('.akte-empfaenger') },
    { label: '„Ganze Arbeitsweise lesen“ aufklappen', klick: '.akte-mehr summary', screenshot: 'k01-arbeitsweise-offen.webp' },
    { label: 'Register „Roadmap“ → #/roadmap', klick: '.planung-register a[href="#/roadmap"]', ...warte('#rm-detail-titel'), screenshot: 'k02-zur-roadmap.webp' },
    { label: 'Register „Überblick“ → #/dashboard', klick: '.planung-register a[href="#/dashboard"]', ...warte('#uebersicht-rolle-detail'), screenshot: 'k03-zum-ueberblick.webp' },
  ],
})

// ─── Zustände ──────────────────────────────────────────────────────────────
folgen['projektakte-luecken'] = folge({
  url: '#/projektakte',
  varianten: { projektakte: PROJEKTAKTE_LUECKEN },
  schritte: [{ label: 'Lagebild fehlt, Arbeitsweise nicht lesbar, Beschreibung gekürzt, Versionsziel nicht eindeutig → „kommt“; Quellen mit Status', ...warte('.akte-empfaenger'), screenshot: 'd1440-projektakte-luecken.webp' }],
})
folgen['projektakte-abruffehler'] = folge({
  url: '#/projektakte',
  varianten: { projektakte: { grund: 'Testfehler' }, projektakteStatus: 500 },
  schritte: [{ label: 'GET …/projektakte antwortet 500 → Fehlerhinweis mit „Erneut laden“, Vision (Roadmap) bleibt', ...warte('[data-akte-erneut]'), screenshot: 'd1440-projektakte-abruffehler.webp' }],
})
folgen['uebersicht-ohne-zielsatz'] = folge({
  url: '#/dashboard',
  varianten: { projektakte: PROJEKTAKTE_LUECKEN },
  schritte: [{ label: 'Kein eindeutiges Versionsziel → Karte Produktmanagement zeigt „kommt“, nichts Geratenes', ...warte('#uebersicht-rolle-detail'), screenshot: 'd1440-uebersicht-ohne-zielsatz.webp' }],
})
// Prüfpass D1 (qa 2): kein Feature in Arbeit, aber ein laufender Bug-Ablauf — der Kreis zeigt ihn.
const ZUSTAND_BUG = { ...ZUSTAND, workflows: [{ workflowId: 'w-f46', auftragId: 'a-bug', status: 'LAEUFT', ziel: 'Fokus nach dem Laden halten', naechster: null, aktiverSchrittId: 's3' }] }
folgen['uebersicht-ablauf-ohne-feature'] = folge({
  url: '#/dashboard',
  varianten: { zustand: ZUSTAND_BUG, workitems: { ...WORKITEMS, workitems: WORKITEMS.workitems.map((w) => (w.id === 'F46' ? { ...w, status: 'FEATURE_GATE' } : w)) }, roadmap: { ...ROADMAP, meilensteine: ROADMAP.meilensteine.map((m) => ({ ...m, features: m.features.map((f) => (f.id === 'F46' ? { ...f, status: 'FEATURE_GATE' } : f)) })) } },
  schritte: [{ label: 'Kein Feature in Arbeit, Bug-Ablauf läuft → Kreis „Ablauf ohne Feature“ mit Ziel, Builder läuft', ...warte('#rollen-kreis-tab-builder[data-status="jetzt"]'), screenshot: 'd1440-ablauf-ohne-feature.webp' }],
})
// Prüfpass D1 (qa 5): Roadmap-Abruffehler — die Übersicht bietet „Erneut laden“.
folgen['uebersicht-roadmap-fehler'] = folge({
  url: '#/dashboard',
  varianten: { roadmap: { grund: 'Testfehler' }, roadmapStatus: 500 },
  schritte: [{ label: 'GET …/roadmap 500 → Fortschritt „nicht verfügbar“ mit „Erneut laden“', ...warte('[data-uebersicht-erneut]'), screenshot: 'd1440-roadmap-fehler.webp' }],
})
// Prüfpass D1 (qa 6): lange Texte — Zielsatz mit 2000 Zeichen, Feature-Titel mit 300 Zeichen.
const LANG = 'Sehr langer Text ohne Ende '.repeat(80).slice(0, 2000)
folgen['lange-texte'] = folge({
  url: '#/dashboard',
  breite: 390,
  hoehe: 844,
  varianten: {
    projektakte: { ...PROJEKTAKTE, versionsziel: { ...PROJEKTAKTE.versionsziel, zielsatz: LANG } },
    workitems: { ...WORKITEMS, workitems: WORKITEMS.workitems.map((w) => (w.id === 'F46' ? { ...w, titel: LANG.slice(0, 300) } : w)) },
    roadmap: { ...ROADMAP, meilensteine: ROADMAP.meilensteine.map((m) => ({ ...m, features: m.features.map((f) => (f.id === 'F46' ? { ...f, titel: LANG.slice(0, 300) } : f)) })) },
  },
  schritte: [
    { label: '390 px: Zielsatz auf sechs Zeilen begrenzt, Titel in der Kreismitte gekürzt, kein Überlauf', ...warte('#uebersicht-rolle-detail'), screenshot: 'd390-lange-texte-uebersicht.webp' },
    { label: '390 px Roadmap: langer Featuretitel bricht um, kein Überlauf', navigiere: '#/roadmap', ...warte('#rm-detail-titel'), screenshot: 'd390-lange-texte-roadmap.webp' },
  ],
})
folgen['escape'] = folge({
  url: '#/dashboard',
  breite: 1600,
  varianten: { workitems: WORKITEMS_HTML, roadmap: ROADMAP_HTML, projektakte: PROJEKTAKTE_HTML },
  schritte: [
    { label: 'Übersicht: HTML in Feature- und Befundtiteln erscheint als Text (kein <img>)', ...warte('#uebersicht-rolle-detail'), screenshot: 'd1600-escape-uebersicht.webp' },
    { label: 'Roadmap: HTML in Meilenstein- und Featuretitel als Text', navigiere: '#/roadmap', ...warte('#rm-detail-titel'), screenshot: 'd1600-escape-roadmap.webp' },
    { label: 'Projektakte: HTML und <script> im Dateitext als Text', navigiere: '#/projektakte', ...warte('.akte-empfaenger'), screenshot: 'd1600-escape-projektakte.webp' },
  ],
})

// ─── Ausführen ─────────────────────────────────────────────────────────────
if (nur && !(nur in folgen)) throw new Error(`Unbekannte Folge: ${nur}`)
const auszufuehren = nur ? { [nur]: folgen[nur] } : folgen

for (const [ordner, klickfolge] of Object.entries(auszufuehren)) {
  const verzeichnis = join(ziel, ordner)
  rmSync(verzeichnis, { recursive: true, force: true })
  mkdirSync(verzeichnis, { recursive: true })
  console.log(`\n── ${ordner} ──`)
  const pfad = join(verzeichnis, 'klickfolge.json')
  writeFileSync(pfad, `${JSON.stringify(klickfolge, null, 2)}\n`)
  execFileSync(process.execPath, [join(wurzel, 'scripts/render-nachweis.mjs'), pfad, verzeichnis], { stdio: 'inherit', cwd: wurzel })
}
