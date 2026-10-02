/**
 * Datei: features/F46/nachweise/d3/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweise F46 D3 „Eintrag im Detail: Feature und Bug“ — alles mit festen Antworten
 * (page.route), kein Modell-Lauf, keine Schreibanfrage (jeder POST auf /api/auftraege/** und
 * /api/workflows/** bekäme 409 mit der Marke „NACHWEIS: POST erkannt“, die dann im Click-to-Work-Bereich
 * bzw. in einer Meldung sichtbar wäre):
 * - Feature #/workboard/F46 in drei Zuständen: in Arbeit (Builder läuft), Abnahme offen (Jetzt-Band
 *   „Ergebnis prüfen →“, Urteile je AK), ohne Ablauf;
 * - Bug #/workboard/F-991 in zwei Zuständen: offen (Triage, „Jetzt beheben lassen“) und „Fix bereit zur
 *   Bestätigung“ (Abnahme am Bug-Ablauf offen);
 * - ein erledigter Bug (#/workboard/F-973, ohne Triage) und ein TECH_DEBT-Eintrag (#/workboard/F-992, Bug-Gerüst ohne Triage);
 * - Matrix für Feature (Abnahme offen) und Bug (offen): 1440 dunkel, 1440 hell, 390 dunkel,
 *   1440 dunkel mit 200 % Zoom, 1440 ru — ganze Seite;
 * - Klicktabelle: Reiter „Das Was“ per Klick und Pfeiltaste, Rollen-Kreis per Pfeiltaste, „Einplanen …“
 *   (kommt) per Tastatur ohne Wirkung, „Ergebnis prüfen →“ führt zu Entscheiden, Rückweg;
 * - Escape-Fall (HTML in Titel, Ziel, AK, Beleg, Beschreibung, Fundstelle, Feld „Entdeckt“).
 * Die Folgen laufen über scripts/render-nachweis.mjs (klickfolge.json je Unterordner). Screenshots als
 * WebP. Vor dem Lauf leert das Skript die Ausgabeordner GENAU der Folgen, die es neu erzeugt
 * (fs.rmSync) — nie etwas anderes.
 *
 * Wird aufgerufen von: Hand, gegen einen laufenden Leitstand dieses Worktrees —
 *   LEITSTAND_PORT=4199 node scripts/leitstand-server.mjs
 *   node features/F46/nachweise/d3/erzeuge-nachweis.mjs [basis] [nurOrdner]
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

const FEATURE = { quelle: 'feature', typ: 'FEATURE', id: 'F46', titel: 'Design-Nachbau nach neuem Seitenaufbau', status: 'IN_ARBEIT', pfad: 'features/F46/feature.md' }
const befund = (felder) => ({ quelle: 'finding', typ: 'BUG', status: 'OFFEN', statusRoh: 'offen', prioritaet: 'P3', beschreibung: null, fundstelle: null, auswirkung: null, massnahme: null, featureRun: null, zeile: 1, ...felder })
const BUG = befund({
  id: 'F-991',
  prioritaet: 'P2',
  titel: 'Persona, Startfläche und Entwicklung zählen offene Abnahmen nicht.',
  beschreibung: 'Seit F46 D2 stehen offene Abnahmen unter „Deine Entscheidungen“, im Zähler der Seitenleiste und in der Kennzahl der Übersicht. Der Persona-Zustand, der Warte-Hinweis der Startfläche und die Spalte „Braucht dich“ lesen weiter nur Freigabe und Rückfrage.',
  fundstelle: '`public/leitstand/persona-state.js:36`',
  auswirkung: 'Mittel — der Zähler zeigt eine wartende Abnahme, die Persona meldet „nichts“.',
  massnahme: 'Dieselbe Auswahl über filtereOffeneAbnahmen bzw. baueEntscheidungen; Gate f28-persona und Tests mitziehen.',
  featureRun: 'Entdeckt: F46 D2, Prüfpass qa 5 / code-reviewer 2.',
  zeile: 12561,
})
const SCHULD = befund({
  id: 'F-992',
  typ: 'TECH_DEBT',
  titel: 'Markierung der Seitenleiste auf der Seite Entscheiden liegt außerhalb des Routers.',
  beschreibung: '#/workflows/<id> gehört technisch zur View runs; auf einer Freigabe oder Abnahme setzt views/workflows.js die Markierung auf „Entscheidungen“ um.',
  fundstelle: '`public/leitstand/views/workflows.js` (markiereNav), `public/leitstand/router.js` (zeigeView)',
  auswirkung: 'Gering — eine zweite Stelle, die aria-current setzt.',
  massnahme: 'Zustandsabhängige Markierung im Router, dann markiereNav entfernen.',
  featureRun: 'Entdeckt: F46 D2.',
  zeile: 12570,
})
const WEITERE = [
  befund({ id: 'F-973', titel: 'Detailseite zeigt Akzeptanzkriterien ohne Urteil.', status: 'ERLEDIGT', statusRoh: 'erledigt', featureRun: 'Entdeckt: Design-Runde 02.10.2026 / F46 D0.' }),
  befund({ id: 'F-993', typ: 'PROCESS_IMPROVEMENT', titel: 'Freigabe braucht auf der Seite Entscheiden zwei Schritte.', featureRun: 'Entdeckt: F46 D2.' }),
  befund({ id: 'F-958', titel: 'Befund aus F44', featureRun: 'Entdeckt: F44 WS-8.' }),
]
const WORKITEMS = { workitems: [FEATURE, BUG, SCHULD, ...WEITERE], befunde: [], fehler: [] }

const AKTE = {
  status: 'ok',
  id: 'F46',
  titel: FEATURE.titel,
  featureStatus: 'IN_ARBEIT',
  ziel: 'Der Leitstand wird nach den neuen Designs umgestaltet. Das ist überwiegend Umbau vorhandener Funktionen (Layout, Navigation, gemeinsame Bausteine), dazu wenige lesende Serverteile.',
  nicht_ziele: ['Keine neuen Datenformate.', 'Kein Terminal-Panel (E-F46-1).', 'Keine Konfiguration bearbeiten (E-F46-2).', 'Keine neuen Schreibwege außer den bestehenden Entscheidungswegen.', 'Keine Beispieldaten im Produkt.'],
  akzeptanzkriterien: [
    { id: 'AK1', text: 'Alle neuen Texte stehen als Schlüssel in de/en/tr/ru; das i18n-Gate ist grün.' },
    { id: 'AK2', text: 'Keine Farbliterale außerhalb der Token-Blöcke; Ebenen-Farben nur über Tokens.' },
    { id: 'AK3', text: 'Keine Platzhalter aus den Designs im Produkt.' },
    { id: 'AK4', text: 'Fehlendes erscheint als Baustein „kommt“, nie als erfundener Wert.' },
    { id: 'AK5', text: 'Jeder Workstream liefert Render-Nachweise der geänderten Seiten.' },
    { id: 'AK6', text: 'Invarianten unverändert: CSRF/Origin, Host-Allowlist, Pflichtbegründung, Freigabe-Veto, „Anzeige = Start“, ein Lauf zur Zeit, eine Live-Region.' },
    { id: 'AK7', text: 'npm run check ist grün nach jedem Workstream.' },
  ],
}
const ROADMAP = { status: 'ok', vision: 'Ein Leitstand für eine KI-Workforce.', meilensteine: [{ id: 'M5', titel: 'M5', status: 'LAEUFT', features: [{ id: 'F46', status: 'IN_ARBEIT' }] }] }

/**
 * Workflow-Kopfdaten wie GET /api/zustand (F46 D2: mit abnahme).
 * @param felder - workflowId, auftragId, status, ziel, naechster, abnahme
 * @returns Kopfdaten
 */
const wf = (felder) => ({ grund: null, aktiverSchrittId: null, schritteAnzahl: 3, versionSequenz: 4, abnahme: { offen: false, status: 'nicht_faellig' }, ...felder })
/**
 * Ein Workflow-Schritt (WORKFLOW_V0).
 * @param schritt_id - Kennung @param rolle - Rolle @param worker - Worker @param felder - Überschreibungen
 * @returns Schritt
 */
const schritt = (schritt_id, rolle, worker, felder = {}) => ({ schritt_id, rolle, worker, modell: worker === 'codex' ? 'gpt-6-astra' : 'claude-sonnet-5', werkzeugsatz: 'lesend', eingaben: [], output_schema: null, freigabe: 'AUTOMATISCH', risiko: 'Kein Schreibzugriff.', zeitgrenze_ms: 600000, nachfolger: null, status: 'OFFEN', lauf_id: null, ...felder })
/**
 * Detail eines Workflows.
 * @param id - workflowId @param status - Status @param schritte - Schritte @param naechster - Verdikt
 * @returns Antwort von GET /api/workflows/<id>
 */
const detail = (id, auftrag, status, schritte, naechster) => ({ daten: { workflow_schema: 'v0', workflow_id: id, auftrag_id: auftrag, version: 1, ziel: 'Ablauf zum Eintrag', status, aktiver_schritt_id: null, grenzen: { max_schritte: 6, max_replans: 1 }, schritte }, verstoesse: [], naechster, empfehlung: null, versionSequenz: 4, architekturEntscheidung: null })

const W_BAU = wf({ workflowId: 'w-bau', auftragId: 'a-bau', status: 'LAEUFT', ziel: 'F46 D3 bauen', naechster: { art: 'haltKlaerung', schrittId: null }, aktiverSchrittId: 's2' })
const DETAIL_BAU = detail('w-bau', 'a-bau', 'LAEUFT', [
  schritt('s1', 'architekt', 'codex', { status: 'ERFOLGREICH', lauf_id: 'l-plan', nachfolger: 's2' }),
  schritt('s2', 'ausfuehrung', 'claude-code', { werkzeugsatz: 'schreibend', freigabe: 'ZWINGEND', freigabe_erteilt: true, status: 'LAEUFT', lauf_id: 'l-bau', nachfolger: 's3' }),
  schritt('s3', 'code-reviewer', 'codex'),
], { art: 'haltKlaerung', schrittId: null, grund: 'Schritt s2 läuft.' })
const ABNAHME_BAU = { workflowId: 'w-bau', workflowStatus: 'LAEUFT', freigabeHalt: null, entscheidung: { status: 'nicht_vorhanden' }, urteil: { status: 'noch_nicht_gelaufen', schrittId: 's3' }, aenderungsuebersicht: { status: 'noch_nicht_gelaufen' }, pruefergebnis: { status: 'noch_nicht_gelaufen' } }

const W_ABN = wf({ workflowId: 'w-abn', auftragId: 'a-abn', status: 'ABGESCHLOSSEN', ziel: 'F46 D3 bauen', naechster: { art: 'fertig', schrittId: null }, abnahme: { offen: true, status: 'nicht_vorhanden' } })
const DETAIL_ABN = detail('w-abn', 'a-abn', 'ABGESCHLOSSEN', [
  schritt('s1', 'architekt', 'codex', { status: 'ERFOLGREICH', lauf_id: 'l-plan', nachfolger: 's2' }),
  schritt('s2', 'ausfuehrung', 'claude-code', { werkzeugsatz: 'schreibend', freigabe: 'ZWINGEND', freigabe_erteilt: true, status: 'ERFOLGREICH', lauf_id: 'l-bau', nachfolger: 's3' }),
  schritt('s3', 'code-reviewer', 'codex', { output_schema: 'ergebnis-code-reviewer', status: 'ERFOLGREICH', lauf_id: 'l-review' }),
], { art: 'fertig', schrittId: null, grund: 'Alle Schritte erledigt.' })
/**
 * Abnahme-Projektion des abgeschlossenen Ablaufs (entscheidbar).
 * @param beleg - Beleg des nicht erfüllten AK
 * @returns Antwort von GET /api/workflows/w-abn/abnahme
 */
const abnahmeAbn = (beleg = 'Die Persona zählt Abnahmen noch nicht (F-991).') => ({
  workflowId: 'w-abn',
  workflowStatus: 'ABGESCHLOSSEN',
  workflowVersion: 1,
  freigabeHalt: null,
  entscheidung: { status: 'nicht_vorhanden' },
  urteil: {
    status: 'ok',
    laufId: 'l-review',
    urteil: 'BEREIT_NACH_KORREKTUR',
    empfehlung: 'Bis auf AK2 erfüllt.',
    befunde: [],
    ak_urteile: [
      { ak_id: 'AK1', urteil: 'ERFUELLT', beleg: 'i18n-Gate grün.' },
      { ak_id: 'AK2', urteil: 'NICHT_ERFUELLT', beleg },
      { ak_id: 'AK3', urteil: 'ERFUELLT', beleg: 'Keine Platzhalter gefunden.' },
      { ak_id: 'AK5', urteil: 'NICHT_PRUEFBAR', beleg: 'Render-Nachweis fehlt im Lauf.' },
    ],
  },
  aenderungsuebersicht: { status: 'ok', laufId: 'l-bau', daten: { basis_ref: 'ec3b831', gekuerzt: false, dateien: [{ status: 'M', pfad: 'public/leitstand/views/workboard-detail.js', plus: 400, minus: 300 }] } },
  pruefergebnis: { status: 'ok', laufId: 'l-bau', ergebnis: 'GRUEN', exitCode: 0 },
})

const W_FIX = wf({ workflowId: 'w-fix', auftragId: 'a-fix', status: 'ABGESCHLOSSEN', ziel: 'F-991 beheben', naechster: { art: 'fertig', schrittId: null }, abnahme: { offen: true, status: 'nicht_vorhanden' } })
const DETAIL_FIX = detail('w-fix', 'a-fix', 'ABGESCHLOSSEN', [
  schritt('s1', 'ausfuehrung', 'claude-code', { werkzeugsatz: 'schreibend', freigabe: 'ZWINGEND', freigabe_erteilt: true, status: 'ERFOLGREICH', lauf_id: 'l-fix', nachfolger: 's2' }),
  schritt('s2', 'code-reviewer', 'codex', { status: 'ERFOLGREICH', lauf_id: 'l-fix-review' }),
], { art: 'fertig', schrittId: null, grund: 'Alle Schritte erledigt.' })
const ABNAHME_FIX = { ...abnahmeAbn(), workflowId: 'w-fix', urteil: { status: 'ok', laufId: 'l-fix-review', urteil: 'BEREIT', empfehlung: 'Fix vollständig.', befunde: [], ak_urteile: [] } }

const auftrag = (auftragId, referenz) => ({ auftragId, titel: `Auftrag ${auftragId}`, erstellt_am: '2026-10-02T08:00:00.000Z', workitem_referenz: referenz })
const zustand = (workflows) => ({ laeufe: [], startfehler: [], workflows, fehler: [], aktiverLauf: { aktiv: false, laufId: null }, pruefbefehl: null, istAiWorkforce: true })

/** Zustände: Workflows im Poll und Aufträge (Verknüpfung über die Referenzzeile). */
const ZUSTAENDE = {
  'in-arbeit': { workflows: [W_BAU], auftraege: [auftrag('a-bau', 'workitem:feature:F46')] },
  abnahme: { workflows: [W_ABN], auftraege: [auftrag('a-abn', 'workitem:feature:F46')] },
  ohne: { workflows: [], auftraege: [] },
  fix: { workflows: [W_FIX], auftraege: [auftrag('a-fix', 'workitem:finding:F-991')] },
}

// Escape-Fall: HTML in Titel, Ziel, AK, Beleg, Beschreibung, Fundstelle und Feld „Entdeckt“.
const HTML = '<img src=x onerror=alert(1)> <b>fett</b>'
const WORKITEMS_HTML = { ...WORKITEMS, workitems: [{ ...FEATURE, titel: `${FEATURE.titel} ${HTML}` }, { ...BUG, titel: `${BUG.titel} ${HTML}`, beschreibung: `${BUG.beschreibung} ${HTML}`, fundstelle: `\`a/b.js\` ${HTML}`, featureRun: `F46 ${HTML}` }, SCHULD, ...WEITERE] }
const AKTE_HTML = { ...AKTE, ziel: `${AKTE.ziel} ${HTML}`, akzeptanzkriterien: AKTE.akzeptanzkriterien.map((ak, i) => (i === 0 ? { ...ak, text: `${ak.text} ${HTML}` } : ak)) }

const get = (muster, json, status = 200) => ({ muster, methode: 'GET', status, json })
/**
 * Grundantworten aller Folgen; spätere Einträge haben Vorrang (Playwright).
 * @param varianten - { stand: Schlüssel aus ZUSTAENDE, workitems, akte, abnahme }
 * @returns Antwortliste
 */
function antworten({ stand = 'abnahme', workitems = WORKITEMS, akte = AKTE, abnahme = abnahmeAbn() } = {}) {
  const { workflows, auftraege } = ZUSTAENDE[stand]
  return [
    get('**/api/zustand', zustand(workflows)),
    get('**/api/projekte', PROJEKTE),
    get('**/api/workitems', workitems),
    get('**/api/workitems?**', workitems),
    get('**/api/auftraege', auftraege),
    get('**/api/roadmap', ROADMAP),
    get('**/api/features/F46/akte', akte),
    get('**/api/workflows/w-bau', DETAIL_BAU),
    get('**/api/workflows/w-bau/abnahme', ABNAHME_BAU),
    get('**/api/workflows/w-abn', DETAIL_ABN),
    get('**/api/workflows/w-abn/abnahme', abnahme),
    get('**/api/workflows/w-fix', DETAIL_FIX),
    get('**/api/workflows/w-fix/abnahme', ABNAHME_FIX),
    get('**/api/projekte/ai-workforce/projekt-aufruf', { startbefehl: null, startvorlage: null, ergebnis_datei: null, aktiv: false, letzterAufruf: null, vorschau: null }),
    get('**/api/chat', { verlauf: [] }),
    // Kein POST darf passieren: jede Schreibanfrage bekäme 409 mit Marke (sichtbar im Bereich).
    { muster: '**/api/auftraege**', methode: 'POST', status: 409, json: { grund: 'NACHWEIS: POST erkannt' } },
    { muster: '**/api/workflows/**', methode: 'POST', status: 409, json: { grund: 'NACHWEIS: POST erkannt' } },
    { muster: '**/api/features/**', methode: 'POST', status: 409, json: { grund: 'NACHWEIS: POST erkannt' } },
  ]
}

const BEOBACHTUNG = {
  texte: [
    { name: 'Ansicht', selector: '[data-view]:not([hidden])', attribut: 'data-view' },
    { name: 'data-theme', selector: 'html', attribut: 'data-theme' },
    { name: 'lang', selector: 'html', attribut: 'lang' },
    { name: 'Nav aktiv', selector: '#shell-nav [aria-current="page"]' },
    { name: 'Eyebrow', selector: '#workboard-detail-eyebrow' },
    { name: 'Titel', selector: '#workboard-detail-titel' },
    { name: 'Jetzt-Band (Zustand)', selector: '#workboard-detail-jetzt', attribut: 'data-zustand' },
    { name: 'Hauptknopf Jetzt-Band', selector: '#workboard-detail-jetzt .button.primary' },
    { name: 'Hauptknopf Click-to-Work', selector: '#workboard-bearbeitung .button.primary' },
    { name: 'Reiter „Das Was“ gewählt', selector: '#workboard-detail [data-was-reiter][aria-selected="true"]' },
    { name: 'Rolle gewählt', selector: '#workboard-detail [data-kreis-rolle][aria-selected="true"]', attribut: 'data-kreis-rolle' },
    { name: 'Click-to-Work (Text „NACHWEIS“ = POST erkannt)', selector: '#workboard-bearbeitung' },
    { name: 'Überschrift Entscheiden', selector: '#workflow-detail:not([hidden]) #workflow-detail-titel' },
    { name: 'Fokus (id)', selector: ':focus', attribut: 'id' },
  ],
  vorhanden: [
    { name: 'mehr als ein gefüllter Hauptknopf (muss fehlen)', selector: '#workboard-detail .button.primary:not([aria-disabled="true"]) ~ .button.primary:not([aria-disabled="true"])' },
    { name: 'aria-live außer Persona (muss fehlen)', selector: '[aria-live]:not(#persona-text-status)' },
    { name: '<img> aus Daten (muss fehlen)', selector: 'main img[src="x"]' },
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

// ─── Zustände (1440 dunkel) ────────────────────────────────────────────────
const ZUSTAND_FOLGEN = {
  'feature-in-arbeit': { url: '#/workboard/F46', stand: 'in-arbeit', warteAuf: '#workboard-detail-inhalt .rollen-kreis [data-status="jetzt"]', text: 'Feature in Arbeit: Builder läuft (Rollen-Kreis), Kurz gesagt „Umsetzung arbeitet (Claude Code)“, „Auftrag vorbereiten“ gesperrt (läuft). Kopfdaten wie der echte Automat bei laufendem Schritt (naechster haltKlaerung) — seit F-996 keine Rückfrage: ruhige Zeile mit „Ablauf ansehen“, Zähler an „Entscheidungen“ ohne den Lauf' },
  'feature-abnahme': { url: '#/workboard/F46', stand: 'abnahme', warteAuf: '#workboard-detail-jetzt .button.primary', text: 'Feature, Abnahme offen: Jetzt-Band mit „Ergebnis prüfen →“, Urteile je AK (erfüllt / nicht erfüllt / nicht prüfbar / noch kein Urteil), Abnahme im Kreis „läuft“' },
  'feature-ohne-ablauf': { url: '#/workboard/F46', stand: 'ohne', warteAuf: '#workboard-bauen.primary', text: 'Feature ohne Ablauf: Kurz gesagt „kein Ablauf“, Kreis ganz offen, alle AKs „noch kein Urteil“, „Auftrag vorbereiten“ frei (einziger Hauptknopf)' },
  'bug-offen': { url: '#/workboard/F-991', stand: 'ohne', warteAuf: '#workboard-bearbeiten.primary', text: 'Bug offen: BUG · F-991 · P2, gefunden, Kurz gesagt aus dem Register, Triage-Band mit „Jetzt beheben lassen“ und drei „kommt“-Knöpfen, Fehlerbild, Behebung „kommt“' },
  'bug-fix-bereit': { url: '#/workboard/F-991', stand: 'fix', warteAuf: '#workboard-detail-jetzt .button.primary', text: 'Bug „Fix bereit zur Bestätigung“: Band „Ist der Bug behoben?“ mit „Ergebnis prüfen →“, Behebung: Beheben/Prüfen/Review erledigt, Bestätigen wartet' },
  'bug-erledigt': { url: '#/workboard/F-973', stand: 'ohne', warteAuf: '#workboard-bearbeiten', text: 'Bug erledigt (Prüfpass qa 1): keine Triage, Einstieg „Auftrag vorbereiten“, Kurz gesagt „Nichts mehr“' },
  'techdebt': { url: '#/workboard/F-992', stand: 'ohne', warteAuf: '#workboard-bearbeiten.primary', text: 'TECH_DEBT: neutraler Typ-Chip, „Worum es geht“, „Umsetzung“ ohne Nachstellen, ruhige Zeile, keine Triage; Fundstelle mit zwei Pfaden → kein VS-Code-Link' },
}
for (const [name, z] of Object.entries(ZUSTAND_FOLGEN)) {
  folgen[name] = folge({ url: z.url, varianten: { stand: z.stand }, schritte: [{ label: z.text, ...warte(z.warteAuf), screenshot: `d1440-${name}.webp` }] })
}

// ─── Matrix (Feature mit offener Abnahme, Bug offen) ──────────────────────
const DARSTELLUNGEN = {
  'hell-1440': { praefix: 'l1440', farbschema: 'light' },
  'dunkel-390': { praefix: 'd390', breite: 390, hoehe: 844 },
  'dunkel-1440-zoom200': { praefix: 'd1440z2', zoom: 2 },
  'ru-1440': { praefix: 'ru1440', sprache: 'ru' },
}
for (const seite of ['feature-abnahme', 'bug-offen']) {
  const z = ZUSTAND_FOLGEN[seite]
  for (const [dName, { praefix, ...darstellung }] of Object.entries(DARSTELLUNGEN)) {
    folgen[`${seite}-${dName}`] = folge({ url: z.url, varianten: { stand: z.stand }, schritte: [{ label: z.text, ...warte(z.warteAuf), screenshot: `${praefix}-${seite}.webp` }], ...darstellung })
  }
}

// ─── Klicktabelle ──────────────────────────────────────────────────────────
folgen['klicks-feature'] = folge({
  url: '#/workboard/F46',
  hoehe: 900,
  varianten: { stand: 'abnahme' },
  schritte: [
    { label: 'Start: Reiter „Abnahmekriterien · 7“ vorgewählt', ...warte('#workboard-detail-jetzt .button.primary') },
    { label: 'Klick auf Reiter „Auftrag“ → Ziel der Akte und Link „Ganze Akte in VS Code öffnen“', klick: '#was-tab-auftrag', screenshot: 'k01-reiter-auftrag.webp' },
    { label: 'Pfeil rechts auf dem Reiter → „Abnahmekriterien“, Fokus wandert mit', taste: 'ArrowRight', screenshot: 'k02-pfeil-ak.webp' },
    { label: 'Ende → „Fertig, wenn“ (kommt, Fixpaket B2)', taste: 'End', screenshot: 'k03-ende-dod.webp' },
    { label: 'Rollen-Kreis: Fokus auf „Abnahme“ (gewählt), Pfeil links → „Reviewer“, Panel „Rolle im Detail“ folgt', fokus: '#detail-kreis-tab-abnahme', taste: 'ArrowLeft', screenshot: 'k04-kreis-pfeil.webp' },
    { label: '„Ergebnis prüfen →“ im Jetzt-Band → Entscheiden · Abnahme (#/workflows/w-abn)', klick: '#workboard-detail-jetzt .button.primary', ...warte('#workflow-entscheidung:not([hidden])'), screenshot: 'k05-ergebnis-pruefen.webp' },
  ],
})
folgen['klicks-bug'] = folge({
  url: '#/workboard/F-991',
  hoehe: 900,
  varianten: { stand: 'ohne' },
  schritte: [
    { label: 'Start: Triage-Band, Hauptknopf „Jetzt beheben lassen“', ...warte('#workboard-bearbeiten.primary') },
    { label: '„Einplanen …“ ist „kommt“ (aria-disabled): Fokus + Enter ändert nichts, kein POST', fokus: '#workboard-bearbeitung .kommt-knopf', taste: 'Enter', screenshot: 'k01-einplanen-kommt.webp' },
    { label: '„Ganzer Eintrag im Register“ aufklappen → alle Felder ungekürzt', klick: '.eintrag-ganz > summary', screenshot: 'k02-ganzer-eintrag.webp' },
    { label: '„← Bugs/Kanban-Board“ → zurück zur Übersicht der Entwicklung', klick: '#workboard-detail-schliessen', ...warte('#workboard-uebersicht:not([hidden])'), screenshot: 'k03-zurueck.webp' },
  ],
})

// ─── Escape ────────────────────────────────────────────────────────────────
folgen.escape = folge({
  url: '#/workboard/F46',
  breite: 1600,
  varianten: { stand: 'abnahme', workitems: WORKITEMS_HTML, akte: AKTE_HTML, abnahme: abnahmeAbn(`Beleg ${HTML}`) },
  schritte: [
    { label: 'Feature: HTML in Titel, Ziel (Kurz gesagt), AK und Beleg erscheint als Text', ...warte('#workboard-detail-jetzt .button.primary'), screenshot: 'd1600-escape-feature.webp' },
    { label: 'Bug: HTML in Titel, Beschreibung, Fundstelle und Feld „Entdeckt“ als Text', navigiere: '#/workboard/F-991', ...warte('#workboard-bearbeiten'), screenshot: 'd1600-escape-bug.webp' },
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
