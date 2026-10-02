/**
 * Datei: features/F46/nachweise/d2/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweise F46 D2 „Entscheidungen und Entscheiden“ — alles mit festen Antworten
 * (page.route), kein Modell-Lauf, keine Schreibanfrage (jeder POST auf /api/workflows/** bekäme 409
 * mit der Marke „NACHWEIS: POST erkannt“, die dann in einer Meldung sichtbar wäre):
 * - Matrix je Seite #/attention (gemischte Arten inkl. Abnahme), #/workflows/<id> im Zustand
 *   Freigabe und im Zustand Abnahme (mit einem nicht erfüllten AK): 1440 dunkel, 1440 hell,
 *   390 dunkel, 1440 dunkel mit 200 % Zoom, 1440 ru — ganze Seite;
 * - Klicktabellen: Filter-Chips und Rückweg auf #/attention; Freigabe: Option gewählt, Begründung
 *   leer → Absenden gesperrt, Begründung → „Freigeben bestätigen“ → bestehender Freigabedialog mit der
 *   Begründung; Stand ändert sich bei offenem Dialog → Dialog schließt mit Hinweis; Abnahme:
 *   Begründung leer → gesperrt, „Alle Nachweise“, „Der Weg zum Ergebnis“ aufklappen;
 * - Zustände: defekte Quelle auf #/attention, Leerzustand, Escape-Fall (HTML in Ziel, Grund, Beleg).
 * Die Folgen laufen über scripts/render-nachweis.mjs (klickfolge.json je Unterordner). Screenshots als
 * WebP. Vor dem Lauf leert das Skript die Ausgabeordner GENAU der Folgen, die es neu erzeugt
 * (fs.rmSync) — nie etwas anderes.
 *
 * Wird aufgerufen von: Hand, gegen einen laufenden Leitstand dieses Worktrees —
 *   LEITSTAND_PORT=4199 node scripts/leitstand-server.mjs
 *   node features/F46/nachweise/d2/erzeuge-nachweis.mjs [basis] [nurOrdner]
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

const PROJEKTE = { projekte: [{ id: 'ai-workforce', name: 'AI Workforce', repo_pfad: 'C:\\Nachweis\\ai-workforce', status: 'IN_ENTWICKLUNG', laufAktiv: false }] }
const LAUF_FEHL = '9f8e7d6c-5b4a-4321-8fed-cba987654321'

/**
 * Workflow-Kopfdaten wie GET /api/zustand (F46 D2: mit abnahme).
 * @param felder - workflowId, auftragId, status, ziel, grund, naechster, abnahme
 * @returns Kopfdaten
 */
const wf = (felder) => ({ grund: null, aktiverSchrittId: null, schritteAnzahl: 3, versionSequenz: 4, abnahme: { offen: false, status: 'nicht_faellig' }, ...felder })
const WORKFLOWS = [
  wf({ workflowId: 'w-frei', auftragId: 'a-frei', status: 'WARTET_FREIGABE', ziel: 'Opportunity Scanner: Datenquellen anbinden', grund: 'Schritt s2 (Umsetzung) wartet auf Freigabe (ZWINGEND).', naechster: { art: 'haltFreigabe', schrittId: 's2' } }),
  wf({ workflowId: 'w-abn', auftragId: 'a-abn', status: 'ABGESCHLOSSEN', ziel: 'Design-Nachbau: Entscheidungen', naechster: { art: 'fertig' }, abnahme: { offen: true, status: 'nicht_vorhanden' } }),
  wf({ workflowId: 'w-rueck', auftragId: 'a-rueck', status: 'KLAERUNG_ERFORDERLICH', ziel: 'Projektkontext für den Architekten', grund: 'Der Architekt braucht eine Entscheidung zu 1 Frage.', naechster: { art: 'haltKlaerung' } }),
  wf({ workflowId: 'w-alt', auftragId: 'a-alt', status: 'ABGESCHLOSSEN', ziel: 'Nutzung je Feature', naechster: { art: 'fertig' }, abnahme: { offen: true, status: 'veraltet' } }),
  wf({ workflowId: 'w-fertig', auftragId: 'a-fertig', status: 'ABGESCHLOSSEN', ziel: 'Bereits abgenommen', naechster: { art: 'fertig' }, abnahme: { offen: false, status: 'ok' } }),
]
const ZUSTAND = {
  laeufe: [{ laufId: LAUF_FEHL, laufStatus: { status: 'ABGESCHLOSSEN' }, ergebnis: 'FEHLGESCHLAGEN', zeitpunkt: '2026-10-02T07:40:00.000Z', auftragsbezug: { auftragId: 'a-rueck', titel: 'Projektkontext für den Architekten' }, anzahlCheckpoints: 2, kettenintegritaet: true, kenntnisgenommen: false }],
  startfehler: [{ zeitstempel: '2026-10-02T08:05:00.000Z', laufId: 'b1c2d3e4-0000-4000-8000-000000000001', fehler: 'Startziel nicht gefunden' }],
  workflows: WORKFLOWS,
  fehler: [],
  aktiverLauf: { aktiv: false, laufId: null },
  pruefbefehl: null,
  istAiWorkforce: true,
}
const ZUSTAND_LEER = { ...ZUSTAND, laeufe: [], startfehler: [], workflows: [WORKFLOWS[4]] }
const ZUSTAND_DEFEKT = { ...ZUSTAND, workflows: null, fehler: [{ quelle: 'workflows', grund: 'Testfehler' }] }

const P0P1 = { workitems: [{ quelle: 'finding', typ: 'BUG', id: 'F-991', titel: 'Abnahmestand im Cache', status: 'OFFEN', prioritaet: 'P1' }], befunde: [], fehler: [] }
const P0P1_LEER = { workitems: [], befunde: [], fehler: [] }
const AUFTRAEGE = [
  { auftragId: 'a-frei', titel: 'Opportunity Scanner: Datenquellen anbinden', erstellt_am: '2026-10-02T06:00:00.000Z', workitem_referenz: 'workitem:feature:F30' },
  { auftragId: 'a-abn', titel: 'Design-Nachbau: Entscheidungen', erstellt_am: '2026-10-02T05:00:00.000Z', workitem_referenz: 'workitem:feature:F46' },
  { auftragId: 'a-rueck', titel: 'Projektkontext für den Architekten', erstellt_am: '2026-10-02T04:00:00.000Z' },
]

/**
 * Ein Workflow-Schritt (WORKFLOW_V0).
 * @param schritt_id - Kennung @param rolle - Rolle @param worker - Worker @param felder - Überschreibungen
 * @returns Schritt
 */
const schritt = (schritt_id, rolle, worker, felder = {}) => ({ schritt_id, rolle, worker, modell: worker === 'codex' ? 'gpt-6-astra' : 'claude-sonnet-5', werkzeugsatz: 'lesend', eingaben: [], output_schema: null, freigabe: 'AUTOMATISCH', risiko: 'Kein Schreibzugriff.', zeitgrenze_ms: 600000, nachfolger: null, status: 'OFFEN', lauf_id: null, ...felder })
const EMPFEHLUNG = {
  schrittId: 's2',
  wirdGenutzt: [{ id: 'skill-frontend-design', empfehlungId: 'skill-frontend-design', name: 'frontend-design', grund: 'passt zu Oberflächenarbeit' }],
  passtNichtImLauf: [{ id: 'mcp-playwright', name: 'Playwright MCP', grund: 'Browserprüfung, nicht installiert', installierbar: true }],
  weitereAnzahl: { wirdGenutzt: 0, passtNichtImLauf: 0 },
  nichtFreigebbarAnzahl: 0,
  hinweise: [],
}
/**
 * Detail des Freigabe-Workflows.
 * @param ziel - Ziel @param risiko - Risiko des fälligen Schritts
 * @returns Antwort von GET /api/workflows/w-frei
 */
const workflowFrei = (zielText = WORKFLOWS[0].ziel, risiko = 'Schreibender Werkzeugsatz im freigegebenen Baupfad — Freigabe ist zwingend.') => ({
  daten: {
    workflow_schema: 'v0',
    workflow_id: 'w-frei',
    auftrag_id: 'a-frei',
    version: 1,
    ziel: zielText,
    status: 'WARTET_FREIGABE',
    aktiver_schritt_id: 's2',
    grund: WORKFLOWS[0].grund,
    grenzen: { max_schritte: 6, max_replans: 1 },
    schritte: [
      schritt('s1', 'architekt', 'codex', { status: 'ERFOLGREICH', lauf_id: 'l-plan', nachfolger: 's2', output_schema: 'ergebnis-architektur' }),
      schritt('s2', 'ausfuehrung', 'claude-code', { werkzeugsatz: 'schreibend', freigabe: 'ZWINGEND', status: 'WARTET_FREIGABE', zeitgrenze_ms: 1800000, risiko, nachfolger: 's3' }),
      schritt('s3', 'code-reviewer', 'codex', { output_schema: 'ergebnis-code-reviewer' }),
    ],
  },
  verstoesse: [],
  naechster: { art: 'haltFreigabe', schrittId: 's2', grund: 'Schritt s2 ist ZWINGEND und noch nicht freigegeben.' },
  empfehlung: EMPFEHLUNG,
  versionSequenz: 4,
  architekturEntscheidung: null,
})
const ABNAHME_FREI = { workflowId: 'w-frei', workflowStatus: 'WARTET_FREIGABE', freigabeHalt: { schrittId: 's2', grund: null }, entscheidung: { status: 'nicht_vorhanden' }, urteil: { status: 'noch_nicht_gelaufen', schrittId: 's3' }, aenderungsuebersicht: { status: 'noch_nicht_gelaufen', schrittId: 's2' }, pruefergebnis: { status: 'noch_nicht_gelaufen', schrittId: 's2' } }
// Stand-Änderung bei offenem Dialog: der Ablauf ist inzwischen woanders (Klärung).
const WORKFLOW_FREI_GEAENDERT = { ...workflowFrei(), daten: { ...workflowFrei().daten, status: 'KLAERUNG_ERFORDERLICH', grund: 'Stand geändert (Nachweis).' }, naechster: { art: 'haltKlaerung', grund: 'Stand geändert (Nachweis).' }, empfehlung: null }

/**
 * Detail des abgeschlossenen Workflows.
 * @param zielText - Ziel
 * @returns Antwort von GET /api/workflows/w-abn
 */
const workflowAbn = (zielText = WORKFLOWS[1].ziel) => ({
  daten: {
    workflow_schema: 'v0',
    workflow_id: 'w-abn',
    auftrag_id: 'a-abn',
    version: 1,
    ziel: zielText,
    status: 'ABGESCHLOSSEN',
    aktiver_schritt_id: null,
    grenzen: { max_schritte: 6, max_replans: 1 },
    schritte: [
      schritt('s1', 'ausfuehrung', 'claude-code', { werkzeugsatz: 'schreibend', freigabe: 'ZWINGEND', freigabe_erteilt: true, status: 'ERFOLGREICH', lauf_id: 'l-bau', nachfolger: 's2' }),
      schritt('s2', 'code-reviewer', 'codex', { output_schema: 'ergebnis-code-reviewer', status: 'ERFOLGREICH', lauf_id: 'l-review' }),
    ],
  },
  verstoesse: [],
  naechster: { art: 'fertig', schrittId: null, grund: 'Alle Schritte erledigt.' },
  empfehlung: null,
  versionSequenz: 7,
  architekturEntscheidung: null,
})
/**
 * Abnahme-Projektion (entscheidbar, ein AK nicht erfüllt).
 * @param beleg - Beleg des nicht erfüllten AK
 * @returns Antwort von GET /api/workflows/w-abn/abnahme
 */
const abnahmeAbn = (beleg = 'Die Liste zeigt Abnahmen erst nach einem Neuladen der Seite.') => ({
  workflowId: 'w-abn',
  workflowStatus: 'ABGESCHLOSSEN',
  workflowVersion: 1,
  freigabeHalt: null,
  entscheidung: { status: 'nicht_vorhanden' },
  urteil: {
    status: 'ok',
    laufId: 'l-review',
    urteil: 'BEREIT_NACH_KORREKTUR',
    empfehlung: 'Bis auf AK2 erfüllt; die Liste muss offene Abnahmen ohne Neuladen zeigen.',
    befunde: [{ schwere: 'MITTEL', fundstelle: 'public/leitstand/views/attention.js:212', zusammenfassung: 'Abnahmen erscheinen verzögert.', beleg: 'Poll-Tick ohne Abnahmestand' }],
    ak_urteile: [
      { ak_id: 'AK1', urteil: 'ERFUELLT', beleg: 'Kein heutiges Verhalten fällt weg — Gates und Tests grün.' },
      { ak_id: 'AK2', urteil: 'NICHT_ERFUELLT', beleg },
      { ak_id: 'AK3', urteil: 'ERFUELLT', beleg: 'Keine Beispielwerte, Gate geprüft.' },
      { ak_id: 'AK4', urteil: 'NICHT_PRUEFBAR', beleg: 'Render-Nachweis fehlt im Lauf.' },
    ],
  },
  aenderungsuebersicht: { status: 'ok', laufId: 'l-bau', daten: { basis_ref: 'add7c94', gekuerzt: false, dateien: [{ status: 'M', pfad: 'public/leitstand/views/attention.js', plus: 120, minus: 40 }, { status: 'A', pfad: 'public/leitstand/entscheidungen-zaehler.js', plus: 50, minus: null }] } },
  pruefergebnis: { status: 'ok', laufId: 'l-bau', ergebnis: 'GRUEN', exitCode: 0 },
})
const PROJEKT_AUFRUF = { startbefehl: null, startvorlage: 'startvorlagen/beispielprojekt.json', ergebnis_datei: null, aktiv: false, letzterAufruf: null, vorschau: { url: 'http://127.0.0.1:3000', erreichbar: true, grund: 'HTTP 200' } }

// Escape-Fall: HTML in Ziel, Grund, Risiko und Beleg.
const HTML = '<img src=x onerror=alert(1)> <b>fett</b>'
const WORKFLOWS_HTML = WORKFLOWS.map((w) => (w.workflowId === 'w-frei' || w.workflowId === 'w-abn' ? { ...w, ziel: `${w.ziel} ${HTML}`, grund: w.grund === null ? null : `${w.grund} ${HTML}` } : w))

const get = (muster, json, status = 200) => ({ muster, methode: 'GET', status, json })
/**
 * Grundantworten aller Folgen; spätere Einträge haben Vorrang (Playwright).
 * @param varianten - Überschreibungen je Quelle
 * @returns Antwortliste
 */
function antworten({ zustand = ZUSTAND, p0p1 = P0P1, frei = workflowFrei(), abn = workflowAbn(), abnahme = abnahmeAbn() } = {}) {
  return [
    get('**/api/zustand', zustand),
    get('**/api/projekte', PROJEKTE),
    get('**/api/workitems?status=OFFEN', p0p1),
    get('**/api/auftraege', AUFTRAEGE),
    get('**/api/workflows/w-frei', frei),
    get('**/api/workflows/w-frei/abnahme', ABNAHME_FREI),
    get('**/api/workflows/w-abn', abn),
    get('**/api/workflows/w-abn/abnahme', abnahme),
    get('**/api/projekte/ai-workforce/projekt-aufruf', PROJEKT_AUFRUF),
    get('**/api/chat', { verlauf: [] }),
    // Kein POST darf passieren: jede Entscheidung bekäme 409 mit Marke (sichtbar in einer Meldung).
    { muster: '**/api/workflows/**', methode: 'POST', status: 409, json: { grund: 'NACHWEIS: POST erkannt' } },
    { muster: '**/api/ressourcen/**', methode: 'POST', status: 409, json: { grund: 'NACHWEIS: POST erkannt' } },
  ]
}

const BEOBACHTUNG = {
  texte: [
    { name: 'Ansicht', selector: '[data-view]:not([hidden])', attribut: 'data-view' },
    { name: 'data-theme', selector: 'html', attribut: 'data-theme' },
    { name: 'lang', selector: 'html', attribut: 'lang' },
    { name: 'Nav aktiv', selector: '#shell-nav [aria-current="page"]' },
    { name: 'Zähler „Entscheidungen“', selector: '#nav-entscheidungen-zaehler:not([hidden])' },
    { name: 'Filter aktiv', selector: '[data-attention-filter][aria-pressed="true"]' },
    { name: 'Überschrift Entscheiden', selector: '#workflow-detail:not([hidden]) #workflow-detail-titel' },
    // Genau ein Hauptknopf (Leitprinzip): je Seite der erste gefüllte Knopf im sichtbaren Bereich; der Test der Einzigkeit steht in den Unit-Tests.
    { name: 'Hauptknopf Liste (oberste Karte)', selector: '#view-attention:not([hidden]) #attention-liste .button.primary' },
    { name: 'Hauptknopf Spalte', selector: '#workflow-detail:not([hidden]) #workflow-entscheidung:not([hidden]) .button.primary' },
    { name: 'Absenden (Text)', selector: '#workflow-entscheidung .entscheidung-absenden' },
    { name: 'Absenden gesperrt', selector: '#workflow-entscheidung .entscheidung-absenden', eigenschaft: 'disabled' },
    { name: 'Dialog-Begründung', selector: '#wf-freigabe-begruendung', eigenschaft: 'value' },
    { name: 'Meldung am Ablauf (Text „NACHWEIS“ = POST erkannt)', selector: '#workflow-bedienung-meldung:not([hidden])' },
    { name: 'Meldung der Abnahme (muss fehlen)', selector: '#workflow-abnahme-meldung:not([hidden])' },
    { name: 'Meldung im Dialog (muss fehlen)', selector: '#workflow-dialog-meldung:not([hidden])' },
    { name: 'Rückweg', selector: '#workflow-detail-zurueck' },
    { name: 'Fokus (id)', selector: ':focus', attribut: 'id' },
  ],
  vorhanden: [
    { name: 'Freigabedialog offen', selector: '#workflow-dialog[open]' },
    { name: 'aria-live außer Persona (muss fehlen)', selector: '[aria-live]:not(#persona-text-status)' },
    { name: '<img> aus Daten (muss fehlen)', selector: 'main img[src="x"]' },
  ],
  ueberlauf: true,
}

const warte = (selector, timeoutMs = 8000) => ({ warteAufSelector: { selector, timeoutMs } })

/**
 * Eine Folge.
 * @param optionen - url, schritte, farbschema, breite, hoehe, zoom, sprache, varianten, reduzierteBewegung
 * @returns Klickfolge
 */
function folge({ url, schritte, farbschema = 'dark', breite = 1440, hoehe = 1000, zoom = 1, sprache, varianten, reduzierteBewegung = false }) {
  return {
    reduzierteBewegung,
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
  entscheidungen: { url: '#/attention', warteAuf: '#attention-abnahmen .entscheidung-karte', text: '#/attention: Freigabe, Rückfrage, zwei Abnahmen (eine veraltet), Lauf-Fehler, Startproblem, Befund P1; Chips mit Zahl, Geprüfte Quellen, Zähler 6 an „Entscheidungen“' },
  freigabe: { url: '#/workflows/w-frei', warteAuf: '#workflow-entscheidung:not([hidden]) .entscheidung-absenden', text: 'Entscheiden · Freigabe: Was startet (Architekt erledigt, Umsetzung fällig, Code Review), Kennzahlen, Arbeitspaket „kommt“, Empfehlung nur lesend; rechts „Deine Entscheidung“' },
  abnahme: { url: '#/workflows/w-abn', warteAuf: '#workflow-entscheidung:not([hidden]) .entscheidung-absenden', text: 'Entscheiden · Abnahme: AK2 nicht erfüllt, AK4 nicht prüfbar, Prüfung GRÜN, Review, Nachweise, Produkt öffnen, Nachweise im Einzelnen; rechts „Deine Entscheidung“' },
}
for (const [seite, s] of Object.entries(SEITEN)) {
  for (const [dName, { praefix, ...darstellung }] of Object.entries(DARSTELLUNGEN)) {
    folgen[`${seite}-${dName}`] = folge({ url: s.url, schritte: [{ label: s.text, ...warte(s.warteAuf), screenshot: `${praefix}-${seite}.webp` }], ...darstellung })
  }
}

// Reduzierte Bewegung (Checkliste design-guardian 9): D2 führt keine Animation ein — Beleg je Seite.
folgen['reduzierte-bewegung'] = folge({
  url: '#/attention',
  reduzierteBewegung: true,
  schritte: [
    { label: '#/attention mit reduzierter Bewegung', ...warte('#attention-abnahmen .entscheidung-karte'), screenshot: 'd1440rb-entscheidungen.webp' },
    { label: 'Freigabe mit reduzierter Bewegung', navigiere: '#/workflows/w-frei', ...warte('#workflow-entscheidung:not([hidden]) .entscheidung-absenden'), screenshot: 'd1440rb-freigabe.webp' },
  ],
})

// ─── Klicktabellen ─────────────────────────────────────────────────────────
folgen['klicks-entscheidungen'] = folge({
  url: '#/attention',
  schritte: [
    { label: 'Start: alle Arten, nur die oberste Karte (Freigabe) trägt den gefüllten Hauptknopf', ...warte('#attention-abnahmen .entscheidung-karte') },
    { label: 'Chip „Abnahmen · 2“ → nur die beiden Abnahmen; „Zum Eintrag“ nur mit bekannter Verknüpfung (F46)', klick: '[data-attention-filter="abnahme"]', screenshot: 'k01-filter-abnahmen.webp' },
    { label: 'Chip „Sichern“ ist „kommt“ (aria-disabled): Fokus + Enter ändert nichts, Filter bleibt „Abnahmen“', fokus: '.filter-chip[aria-disabled="true"]', taste: 'Enter', screenshot: 'k02-sichern-kommt.webp' },
    { label: 'Chip „Fehler · 2“ → Lauf-Fehler und Startproblem', klick: '[data-attention-filter="fehler"]', screenshot: 'k03-filter-fehler.webp' },
    { label: 'Chip „Alle“, dann „Ergebnis prüfen“ der Abnahme → #/workflows/w-abn, Rückweg „Deine Entscheidungen“', klick: '[data-attention-filter="alle"]', ...warte('[data-attention-filter="alle"][aria-pressed="true"]') },
    { label: '„Ergebnis prüfen“ → Entscheiden · Abnahme', klick: '#attention-abnahmen .entscheidung-karte a[href="#/workflows/w-abn"]', ...warte('#workflow-entscheidung:not([hidden])'), screenshot: 'k04-zur-abnahme.webp' },
    { label: '„← Deine Entscheidungen“ → zurück nach #/attention (history.back)', klick: '#workflow-detail-schliessen', ...warte('#view-attention:not([hidden])'), screenshot: 'k05-zurueck.webp' },
  ],
})

folgen['klicks-freigabe'] = folge({
  url: '#/workflows/w-frei',
  hoehe: 900,
  schritte: [
    { label: 'Start: Absenden gesperrt („Option wählen“), „Freigeben & installieren“ wählbar (installierbarer Vorschlag)', ...warte('#workflow-entscheidung:not([hidden]) .entscheidung-absenden'), screenshot: 'k01-start.webp' },
    { label: 'Option „Freigeben“ gewählt, Begründung leer → Absenden weiter gesperrt („Freigeben bestätigen“, disabled)', klick: '#workflow-entscheidung input[value="freigeben"]', screenshot: 'k02-begruendung-leer-gesperrt.webp' },
    { label: 'Begründung eingetragen → Absenden frei', tippen: { selector: '#wf-entscheidung-begruendung', text: 'Plan geprüft, Risiko benannt.' }, screenshot: 'k03-begruendung-frei.webp' },
    { label: '„Freigeben bestätigen“ → bestehender Freigabedialog (Anzeige = Start), Begründung übernommen, Fokus auf „Freigeben & starten“; kein POST', klick: '#workflow-entscheidung .entscheidung-absenden', ...warte('#workflow-dialog[open]'), screenshot: 'k04-dialog.webp', ohneAusschnitt: true },
    {
      label: 'Stand ändert sich bei offenem Dialog (nächster Poll: Klärung statt Freigabe) → Dialog schließt, Hinweis „Der Stand hat sich geändert“',
      anfragenAntworten: antworten({ frei: WORKFLOW_FREI_GEAENDERT, zustand: { ...ZUSTAND, workflows: WORKFLOWS.map((w) => (w.workflowId === 'w-frei' ? { ...w, status: 'KLAERUNG_ERFORDERLICH', naechster: { art: 'haltKlaerung' } } : w)) } }),
      ...warte('#workflow-bedienung-meldung:not([hidden])', 10000),
      screenshot: 'k05-stand-geaendert.webp',
    },
  ],
})

folgen['klicks-abnahme'] = folge({
  url: '#/workflows/w-abn',
  hoehe: 900,
  schritte: [
    { label: 'Start: Abnahme, Absenden gesperrt', ...warte('#workflow-entscheidung:not([hidden]) .entscheidung-absenden') },
    { label: 'Option „Anpassung anfordern“, Begründung leer → gesperrt', klick: '#workflow-entscheidung input[value="ANPASSUNG_ANGEFORDERT"]', screenshot: 'k01-begruendung-leer-gesperrt.webp' },
    { label: 'Begründung eingetragen → „Anpassung anfordern“ frei (nicht abgeschickt)', tippen: { selector: '#wf-abnahme-begruendung', text: 'AK2 nachbessern.' }, screenshot: 'k02-begruendung-frei.webp' },
    { label: '„Alle Nachweise“ → Sprung zu „Nachweise im Einzelnen“ (Fokus auf der Überschrift)', klick: '.abnahme-nachweise-zeigen', screenshot: 'k03-alle-nachweise.webp', ohneAusschnitt: true },
    { label: '„Der Weg zum Ergebnis“ aufklappen → Timeline, „Auf einen Blick“, Aktionen; nichts fällt weg', klick: '#workflow-ablauf > summary', screenshot: 'k04-weg-aufgeklappt.webp' },
  ],
})

// ─── Zustände ──────────────────────────────────────────────────────────────
folgen['entscheidungen-defekt'] = folge({
  url: '#/attention',
  varianten: { zustand: ZUSTAND_DEFEKT },
  schritte: [{ label: 'Workflows-Quelle defekt → Hinweis, „nicht verfügbar“, Chips und Quellen „–“ (keine Entwarnung), Zähler verborgen', ...warte('#attention-hinweis:not([hidden])'), screenshot: 'd1440-entscheidungen-defekt.webp' }],
})
folgen['entscheidungen-leer'] = folge({
  url: '#/attention',
  varianten: { zustand: ZUSTAND_LEER, p0p1: P0P1_LEER },
  schritte: [{ label: 'Alle Quellen leer (eine Abnahme bereits entschieden) → Leerzustand, Zähler verborgen', ...warte('#attention-leer:not([hidden])'), screenshot: 'd1440-entscheidungen-leer.webp' }],
})
folgen['escape'] = folge({
  url: '#/attention',
  breite: 1600,
  varianten: { zustand: { ...ZUSTAND, workflows: WORKFLOWS_HTML }, frei: workflowFrei(`${WORKFLOWS[0].ziel} ${HTML}`, `Risiko ${HTML}`), abn: workflowAbn(`${WORKFLOWS[1].ziel} ${HTML}`), abnahme: abnahmeAbn(`Beleg ${HTML}`) },
  schritte: [
    { label: '#/attention: HTML in Ziel und Grund erscheint als Text', ...warte('#attention-abnahmen .entscheidung-karte'), screenshot: 'd1600-escape-entscheidungen.webp' },
    { label: 'Freigabe: HTML in Ziel (Eyebrow) und Risiko als Text', navigiere: '#/workflows/w-frei', ...warte('#workflow-entscheidung:not([hidden])'), screenshot: 'd1600-escape-freigabe.webp' },
    { label: 'Abnahme: HTML im Beleg als Text', navigiere: '#/workflows/w-abn', ...warte('#workflow-entscheidung:not([hidden]) .wf-abnahme-aktion'), screenshot: 'd1600-escape-abnahme.webp' },
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
