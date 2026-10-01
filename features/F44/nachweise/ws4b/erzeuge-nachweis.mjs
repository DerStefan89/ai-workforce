/**
 * Datei: features/F44/nachweise/ws4b/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweise F44 WS-4b „Klärung, Reparatur & Abnahme“ — kleinste Matrix (F-876), nur die
 * geänderten Seiten, mit festen Antworten (nie im Produkt):
 * - Abnahme entscheidbar („Passt das Ergebnis?“ über der Timeline) — 1440 dunkel und hell, 390 dunkel
 *   und hell, 1440 dunkel mit 200 % Zoom, 1440 ru;
 * - Abnahme nicht entscheidbar (Freigabe-Halt), vorab (Klärung vor dem Bau, nur Ablehnen/Anpassung) und
 *   entschieden — je 1440 dunkel;
 * - Iteration 2/3 (F18, erzeuger kern) und veraltete Entscheidung — je 1440 dunkel;
 * - Prüfung ROT mit „Prüfung wiederholen“ (Klick, Meldung);
 * - Klärung: Notiz und Dialog „Rückfrage beantworten“ — 1440 dunkel, 390 dunkel und 1440 en (Fokus auf
 *   der vorgewählten Option, Spalte „Fokus-name/Wert“); vorab-Block auch auf Türkisch, dazu der Wechsel
 *   vorab → entschieden nach „Ablehnen“;
 * - Sichtung: Notiz, Dialog, Pflichtmeldung;
 * - Reparatur bei ungültiger Fassung mit offenem Editor;
 * - Workboard-Detail „← zurück“ mit Fokus auf der Karte (F-926, echte Daten des Worktrees);
 * - Freigabedialog im hellen Theme mit Katalog-Empfehlung (Kontrast der Checkbox), 1440 und 390.
 * Baut je Folge eine klickfolge.json in einem Unterordner und ruft scripts/render-nachweis.mjs auf;
 * Screenshots als WebP. Vor dem Lauf leert das Skript die Ausgabeordner GENAU der Folgen, die es neu
 * erzeugt (fs.rmSync, recursive, force) — fremde Ordner und das Skript selbst bleiben unberührt.
 *
 * Wird aufgerufen von: Hand, gegen einen laufenden Leitstand dieses Worktrees —
 *   LEITSTAND_PORT=4381 node scripts/leitstand-server.mjs
 *   node features/F44/nachweise/ws4b/erzeuge-nachweis.mjs [basis] [nurOrdner]
 *   basis:     Standard http://127.0.0.1:4381
 *   nurOrdner: optional, nur diese Folge (Name des Unterordners)
 * Nicht Teil von `npm run check`.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const basis = process.argv[2] ?? 'http://127.0.0.1:4381'
const nur = process.argv[3]
const ziel = 'features/F44/nachweise/ws4b'

/** Chatspalte eingeklappt (Vorlage: Chat als Dock, WS-8) — sonst bestimmt ihre Länge die Vollseite. */
const CHAT_ZU = { 'leitstand-chat-offen': 'false' }

const BEOBACHTUNG = {
  texte: [
    { name: 'Ansicht', selector: '[data-view]:not([hidden])', attribut: 'data-view' },
    { name: 'data-theme', selector: 'html', attribut: 'data-theme' },
    { name: 'lang', selector: 'html', attribut: 'lang' },
    { name: 'Fokus', selector: ':focus' },
    { name: 'Fokus-ID', selector: ':focus', attribut: 'id' },
    { name: 'Fokus-Klasse', selector: ':focus', attribut: 'class' },
    { name: 'Fokus-data-id', selector: ':focus', attribut: 'data-id' },
    { name: 'Fokus-name/Wert', selector: ':focus', attribut: 'value' },
    { name: 'Titel', selector: '#workflow-detail-titel' },
    { name: 'Notizen', selector: '#workflow-bedienung' },
    { name: 'Abnahme (oben)', selector: '#workflow-abnahme' },
    { name: 'Abnahme (unten)', selector: '#workflow-abnahme-stand' },
    { name: 'Aktionen', selector: '#workflow-aktionen' },
    { name: 'Auf einen Blick', selector: '#workflow-blick' },
    { name: 'Meldung', selector: '#workflow-bedienung-meldung' },
    { name: 'Abnahme-Meldung', selector: '#workflow-abnahme-meldung' },
    { name: 'Dialog offen', selector: '#workflow-dialog', attribut: 'open' },
    { name: 'Dialogtitel', selector: '#workflow-dialog-titel' },
    { name: 'Dialogmeldung', selector: '#workflow-dialog-meldung' },
  ],
  sichtbarkeit: [
    { name: 'Detailseite', id: 'workflow-detail' },
    { name: 'Reparatureditor', id: 'workflow-reparatur' },
  ],
  vorhanden: [
    { name: 'Überschrift „Bedienung“ (muss fehlen)', selector: '#workflow-bedienung h3' },
    { name: 'Abnahme-Abschnitt über der Timeline', selector: '#workflow-abnahme .abnahme-abschnitt' },
    { name: 'Pflichtfeld wf-abnahme-begruendung', selector: '#wf-abnahme-begruendung' },
    { name: 'Abnahme-Knöpfe (.wf-abnahme-aktion)', selector: '.wf-abnahme-aktion' },
    { name: 'Prüfung wiederholen', selector: '.wf-pruefung-wiederholen' },
    { name: 'Notiz Rückfrage', selector: '#workflow-bedienung .wf-klaerung' },
    { name: 'Notiz Sichtung', selector: '#workflow-bedienung .wf-sichtung' },
    { name: 'Notiz Reparatur', selector: '#workflow-bedienung .wf-reparatur-notiz' },
    { name: 'Empfehlung vorgewählt', selector: '#workflow-dialog input[type="radio"][value="Browser-Freigabe"]:checked' },
    { name: 'Pflichtfeld wf-sichtung-begruendung', selector: '#workflow-dialog #wf-sichtung-begruendung' },
    { name: 'Reparatureditor offen', selector: '#wf-reparatur-entwurf' },
    { name: 'aria-live im Dialog (muss fehlen)', selector: '#workflow-dialog [aria-live], #workflow-dialog[aria-live]' },
  ],
  ueberlauf: true,
}

/** Zustands-Aggregat für Folgen mit fester Antwort. */
const zustand = (felder) => ({ laeufe: [], startfehler: [], workflows: [], fehler: [], aktiverLauf: { aktiv: false, laufId: null }, pruefbefehl: null, istAiWorkforce: true, ...felder })

const schritt = (id, rolle, worker, status, nachfolger, laufId, freigabe = 'KEINE') => ({ schritt_id: id, rolle, worker, modell: worker === 'codex' ? 'gpt-5' : 'claude-sonnet', freigabe, status, nachfolger, lauf_id: laufId, zeitgrenze_ms: 900000 })

/** Fertiger Ablauf: Architekt, Umsetzung, Review — alles erfolgreich. */
const SCHRITTE_FERTIG = [schritt('s1', 'architekt', 'codex', 'ERFOLGREICH', 's2', 'nw-l1'), schritt('s2', 'ausfuehrung', 'claude-code', 'ERFOLGREICH', 's3', 'nw-l2', 'ZWINGEND'), schritt('s3', 'code-reviewer', 'codex', 'ERFOLGREICH', null, 'nw-l3')]

/** Detail eines Workflows (WORKFLOW_V0 plus Verdikt). */
const detail = (id, ziel, status, schritte, naechster, felder = {}) => ({
  daten: { workflow_id: id, auftrag_id: `${id}-a`, version: 1, ziel, status, aktiver_schritt_id: felder.cursor ?? null, grund: felder.grund ?? null, schritte },
  versionSequenz: 2,
  verstoesse: felder.verstoesse ?? [],
  naechster,
  architekturEntscheidung: felder.architekturEntscheidung ?? null,
  empfehlung: felder.empfehlung ?? null,
})

const URTEIL = {
  status: 'ok',
  laufId: 'nw-l3',
  urteil: 'BEREIT',
  empfehlung: 'Die vereinbarten Kriterien sind erfüllt. Prüfe, ob das Ergebnis auch deinen Erwartungen entspricht.',
  befunde: [{ schwere: 'NIEDRIG', fundstelle: 'public/leitstand/views/auftrag.js:42', zusammenfassung: 'Ein Kommentar nennt noch den alten Funktionsnamen.', beleg: 'Zeile 42: „siehe baueAuftragAlt“' }],
  ak_urteile: [
    { ak_id: 'AK1', urteil: 'ERFUELLT', beleg: 'Feature F35 erfolgreich in einen Auftrag überführt (auftrag.test.mjs).' },
    { ak_id: 'AK2', urteil: 'ERFUELLT', beleg: 'Umsetzung und Code Review werden vor der Freigabe gezeigt.' },
    { ak_id: 'AK3', urteil: 'ERFUELLT', beleg: 'Schreibende Aktionen bleiben bis zur Freigabe gesperrt (check-f15).' },
  ],
}
const AENDERUNG = {
  status: 'ok',
  laufId: 'nw-l2',
  daten: {
    basis_ref: '493d953',
    gekuerzt: false,
    dateien: [
      { status: 'M', pfad: 'public/leitstand/views/auftrag.js', plus: 48, minus: 12 },
      { status: 'A', pfad: 'public/leitstand/views/auftrag.test.mjs', plus: 96, minus: 0 },
      { status: 'M', pfad: 'public/leitstand/i18n/de.js', plus: 6, minus: 0 },
      { status: 'M', pfad: 'scripts/check-f15-workflow-oberflaeche.mjs', plus: 4, minus: 1 },
    ],
  },
}
const PRUEFUNG_GRUEN = { status: 'ok', laufId: 'nw-l2p', ergebnis: 'GRUEN', exitCode: 0 }
const abnahme = (felder = {}) => ({ workflowStatus: 'ABGESCHLOSSEN', freigabeHalt: null, entscheidung: { status: 'nicht_vorhanden' }, urteil: URTEIL, aenderungsuebersicht: AENDERUNG, pruefergebnis: PRUEFUNG_GRUEN, ...felder })

const FERTIG = { art: 'fertig', grund: 'Alle Schritte abgeschlossen', schrittId: null }
const ZIEL = 'Bauen aus der Akte'

/** Die Workflows dieser Nachweise (Liste und Detail). */
const W = {
  ab: detail('nw-ab', ZIEL, 'ABGESCHLOSSEN', SCHRITTE_FERTIG, FERTIG),
  halt: detail('nw-halt', 'Fehlende Nutzungsdaten kennzeichnen', 'WARTET_FREIGABE', [schritt('s1', 'architekt', 'codex', 'ERFOLGREICH', 's2', 'nw-h1'), schritt('s2', 'ausfuehrung', 'claude-code', 'WARTET_FREIGABE', 's3', null, 'ZWINGEND'), schritt('s3', 'code-reviewer', 'codex', 'OFFEN', null, null)], { art: 'haltFreigabe', grund: 'Schritt s2 ist ZWINGEND', schrittId: 's2' }, {
    cursor: 's2',
    empfehlung: {
      schrittId: 's2',
      wirdGenutzt: [{ id: 'playwright-mcp', empfehlungId: 'playwright-mcp', name: 'Playwright', typ: 'extern', unterart: 'mcp', grund: 'task_typen_any erfüllt (bugfix)' }],
      passtNichtImLauf: [{ id: 'axe-mcp', name: 'axe Accessibility', typ: 'extern', unterart: 'mcp', grund: 'freigabe OFFEN', installierbar: true }],
      weitereAnzahl: { wirdGenutzt: 0, passtNichtImLauf: 0 },
      nichtFreigebbarAnzahl: 0,
      hinweise: [],
    },
  }),
  iter: detail('nw-iter', ZIEL, 'WARTET_FREIGABE', [schritt('s1', 'architekt', 'codex', 'ERFOLGREICH', 's2', 'nw-i1'), schritt('s2', 'ausfuehrung', 'claude-code', 'WARTET_FREIGABE', 's3', null, 'ZWINGEND'), schritt('s3', 'code-reviewer', 'codex', 'OFFEN', null, null)], { art: 'haltFreigabe', grund: 'Neubau nach Anpassung', schrittId: 's2' }, { cursor: 's2' }),
  rot: detail('nw-rot', ZIEL, 'KLAERUNG_ERFORDERLICH', [schritt('s1', 'architekt', 'codex', 'ERFOLGREICH', 's2', 'nw-r1'), schritt('s2', 'ausfuehrung', 'claude-code', 'ERFOLGREICH', 's3', 'nw-r2', 'ZWINGEND'), schritt('s3', 'code-reviewer', 'codex', 'OFFEN', null, null)], { art: 'haltKlaerung', grund: 'Prüfung ROT (Exit 1)', schrittId: 's2' }, { cursor: 's2', grund: 'Prüfschritt ROT: 2 Tests fehlgeschlagen (Exit 1)' }),
  klaerung: detail('nw-kl', 'Fehler verständlich erklären', 'KLAERUNG_ERFORDERLICH', [schritt('s1', 'architekt', 'codex', 'ERFOLGREICH', 's2', 'nw-k1'), schritt('s2', 'ausfuehrung', 'claude-code', 'OFFEN', 's3', null, 'ZWINGEND'), schritt('s3', 'code-reviewer', 'codex', 'OFFEN', null, null)], { art: 'haltKlaerung', grund: 'Offene Frage des Architekten (Regel 1c)', schrittId: 's1' }, {
    cursor: 's1',
    grund: 'Der Architekt hat 2 offene Fragen gestellt — ohne Entscheidung setzt die Kette nicht fort.',
    architekturEntscheidung: {
      schrittId: 's1',
      fragen: [
        { frage: 'Welche Fehlermeldung sollen wir zuerst verständlicher machen?', auswirkung_bestand: 'Betrifft nur die Anzeige im Leitstand.', begruendung: 'Die Browser-Freigabe ist der häufigste Abbruch.', empfehlung: 'Browser-Freigabe', optionen: [{ titel: 'Browser-Freigabe', vorteile: ['häufigster Fall', 'klar abgegrenzt'], nachteile: [] }, { titel: 'Zeitgrenze', vorteile: ['einfach'], nachteile: ['selten'] }] },
        { frage: 'Soll die Meldung einen Link zur Hilfe enthalten?', auswirkung_bestand: 'Neue Hilfeseite nötig.', begruendung: 'Ohne Hilfeseite ins Leere.', empfehlung: 'Nein', optionen: [{ titel: 'Ja', vorteile: ['hilft sofort'], nachteile: ['Seite fehlt noch'] }, { titel: 'Nein', vorteile: ['kein toter Link'], nachteile: [] }] },
      ],
    },
  }),
  sichtung: detail('nw-si', 'Abhängigkeiten aktualisieren', 'KLAERUNG_ERFORDERLICH', [schritt('s1', 'ausfuehrung', 'claude-code', 'VERWEIGERT', 's2', 'nw-s1', 'ZWINGEND'), schritt('s2', 'code-reviewer', 'codex', 'OFFEN', null, null)], { art: 'haltKlaerung', grund: 'F-760', schrittId: 's1' }, {
    cursor: 's1',
    grund: "Lauf endete VERWEIGERT (ohne Bypass-Verdacht). Abgelehnte Befehle: npm install --global — menschliche Sichtung vor Fortsetzung (F-760, Schritt 's1', Lauf 'nw-s1')",
  }),
  ungueltig: detail('nw-ug', 'Ablauf mit kaputter Fassung', 'GESTOPPT', [schritt('s1', 'ausfuehrung', 'claude-code', 'FEHLGESCHLAGEN', 's2', 'nw-u1', 'ZWINGEND'), schritt('s2', 'code-reviewer', 'gemini', 'OFFEN', null, null)], null, {
    cursor: 's1',
    grund: 'Gestoppt durch Stefan: Worker gemini ist nicht zugelassen.',
    verstoesse: ["'schritte[1].worker' muss einer von claude-code, codex sein"],
  }),
}
const LISTE = Object.values(W).map((d) => ({ workflowId: d.daten.workflow_id, auftragId: d.daten.auftrag_id, ziel: d.daten.ziel, versionSequenz: d.versionSequenz, status: d.daten.status, aktiverSchrittId: d.daten.aktiver_schritt_id, grund: d.daten.grund, schritteAnzahl: d.daten.schritte.length, naechster: d.naechster }))

const ENTSCHEIDUNG_OK = { status: 'ok', ergebnis: 'ANGENOMMEN', begruendung: 'Passt zu dem, was ich wollte; der Kommentar wird beim nächsten Mal mitgezogen.', entschiedenAm: '2026-10-01T09:12:00.000Z', bezug: null, versionSequenz: 1, erzeuger: 'mensch', automatische_iteration: null }
const ENTSCHEIDUNG_KERN = { status: 'ok', ergebnis: 'ANPASSUNG_ANGEFORDERT', begruendung: 'Review BEREIT_NACH_KORREKTUR: automatische Anpassung (F35 WS-3).', entschiedenAm: '2026-10-01T08:40:00.000Z', bezug: null, versionSequenz: 2, erzeuger: 'kern', automatische_iteration: 2 }
const ENTSCHEIDUNG_VERALTET = { status: 'veraltet', ergebnis: 'ABGELEHNT', begruendung: 'Falscher Ansatz, bitte neu bauen.', entschiedenAm: '2026-09-30T16:05:00.000Z', bezug: null, versionSequenz: 1, erzeuger: 'mensch', automatische_iteration: null }

/** Feste Antworten aller Folgen; spätere Einträge (auch je Schritt) haben Vorrang. */
const ANTWORTEN = [
  { muster: '**/api/zustand', json: zustand({ workflows: LISTE }) },
  ...Object.values(W).map((d) => ({ muster: `**/api/workflows/${d.daten.workflow_id}`, json: d })),
  { muster: '**/api/workflows/nw-ab/abnahme', json: abnahme() },
  { muster: '**/api/workflows/nw-halt/abnahme', json: abnahme({ workflowStatus: 'WARTET_FREIGABE', freigabeHalt: { schrittId: 's2', grund: null }, urteil: { status: 'noch_nicht_gelaufen' }, aenderungsuebersicht: { status: 'noch_nicht_gelaufen' }, pruefergebnis: { status: 'noch_nicht_gelaufen' } }) },
  { muster: '**/api/workflows/nw-iter/abnahme', json: abnahme({ workflowStatus: 'WARTET_FREIGABE', freigabeHalt: { schrittId: 's2', grund: null }, entscheidung: ENTSCHEIDUNG_KERN, urteil: { ...URTEIL, urteil: 'BEREIT_NACH_KORREKTUR' } }) },
  { muster: '**/api/workflows/nw-rot/abnahme', json: abnahme({ workflowStatus: 'KLAERUNG_ERFORDERLICH', urteil: { status: 'noch_nicht_gelaufen' }, pruefergebnis: { status: 'ok', laufId: 'nw-r2p', ergebnis: 'ROT', exitCode: 1 } }) },
  { muster: '**/api/workflows/nw-kl/abnahme', json: abnahme({ workflowStatus: 'KLAERUNG_ERFORDERLICH', urteil: { status: 'noch_nicht_gelaufen' }, aenderungsuebersicht: { status: 'noch_nicht_gelaufen' }, pruefergebnis: { status: 'noch_nicht_gelaufen' } }) },
  { muster: '**/api/workflows/nw-si/abnahme', json: abnahme({ workflowStatus: 'KLAERUNG_ERFORDERLICH', urteil: { status: 'noch_nicht_gelaufen' }, aenderungsuebersicht: { status: 'nicht_vorhanden' }, pruefergebnis: { status: 'nicht_vorhanden' } }) },
  { muster: '**/api/workflows/nw-ug/abnahme', json: abnahme({ workflowStatus: 'GESTOPPT', urteil: { status: 'noch_nicht_gelaufen' }, aenderungsuebersicht: { status: 'noch_nicht_gelaufen' }, pruefergebnis: { status: 'noch_nicht_gelaufen' } }) },
]

const DARSTELLUNGEN = {
  'dunkel-1440': { praefix: 'd1440' },
  'hell-1440': { praefix: 'l1440', farbschema: 'light' },
  'dunkel-390': { praefix: 'd390', breite: 390, hoehe: 844 },
  'hell-390': { praefix: 'l390', farbschema: 'light', breite: 390, hoehe: 844 },
  'dunkel-1440-zoom200': { praefix: 'd1440z2', zoom: 2 },
  'ru-1440': { praefix: 'ru1440', sprache: 'ru' },
}

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
const DIALOG_AUF = warte('#workflow-dialog[open] #workflow-dialog-titel')
const DIALOG_BILD = { ohneAusschnitt: true, screenshotVollseite: false }

const folgen = {}

for (const [name, { praefix, ...darstellung }] of Object.entries(DARSTELLUNGEN)) {
  folgen[`abnahme-entscheidbar-${name}`] = folge({
    hash: '#/workflows/nw-ab',
    schritte: [
      { label: 'Deep-Link #/workflows/nw-ab (ABGESCHLOSSEN): „Passt das Ergebnis?“ über der Timeline, Entscheidung inline, Review-Urteil und Abnahme in „Auf einen Blick“', ...warte('#workflow-abnahme .abnahme-abschnitt'), screenshot: `${praefix}-abnahme.webp` },
      { label: '„Geänderte Dateien“ und „Prüfbericht & Nachweise“ aufgeklappt', klick: '#workflow-abnahme details.abnahme-details:nth-of-type(1) summary', ...warte('#workflow-abnahme details[open] table'), screenshot: `${praefix}-abnahme-2-dateien.webp` },
    ],
    ...darstellung,
  })
}

folgen['abnahme-pflicht'] = folge({
  hash: '#/workflows/nw-ab',
  schritte: [
    { label: 'Deep-Link (entscheidbar)', ...warte('#workflow-abnahme .abnahme-abschnitt') },
    { label: 'Klick „Ergebnis abnehmen“ ohne Begründung → Pflichtmeldung, Fokus im Feld', klick: '[data-aktion="ANGENOMMEN"]', ...warte('#workflow-abnahme-meldung:not([hidden])', 5000), screenshot: 'd1440-abnahme-pflicht.webp' },
    {
      label: 'Begründung tippen, „Ergebnis abnehmen“ → 200: Abschnitt zu, Entscheidung als Zeile, Meldung mit Fokus',
      tippen: { selector: '#wf-abnahme-begruendung', text: 'Passt zu dem, was ich wollte.' },
      anfragenAntworten: [
        { muster: '**/api/workflows/nw-ab/abnahme', methode: 'POST', json: { ok: true } },
        { muster: '**/api/workflows/nw-ab/abnahme', methode: 'GET', json: abnahme({ entscheidung: ENTSCHEIDUNG_OK }) },
      ],
      klick: '[data-aktion="ANGENOMMEN"]',
      ...warte('#workflow-abnahme-meldung.erfolg', 10000),
      screenshot: 'd1440-abnahme-angenommen.webp',
    },
  ],
})

folgen['abnahme-nicht-entscheidbar'] = folge({
  hash: '#/workflows/nw-halt',
  schritte: [{ label: 'Freigabe-Halt: nur „Deine Abnahme folgt …“ unter den Aktionen, kein Abschnitt, kein Verweis auf „Bedienung“', ...warte('#workflow-abnahme-stand .abnahme-stand'), screenshot: 'd1440-abnahme-folgt.webp' }],
})

folgen['abnahme-vorab'] = folge({
  hash: '#/workflows/nw-kl',
  schritte: [
    { label: 'KLAERUNG_ERFORDERLICH vor dem Bau: kein „Passt das Ergebnis?“, darunter „Auftrag ablehnen oder Anpassung wünschen“ mit nur den erlaubten Knöpfen', ...warte('#workflow-abnahme-stand .abnahme-vorab'), screenshot: 'd1440-abnahme-vorab.webp' },
    { label: 'Klick „Ablehnen“ ohne Begründung → Pflichtmeldung direkt beim Block', klick: '.abnahme-vorab [data-aktion="ABGELEHNT"]', ...warte('#workflow-abnahme-meldung:not([hidden])', 5000), screenshot: 'd1440-abnahme-vorab-2-pflicht.webp' },
    {
      label: 'Begründung tippen, „Ablehnen“ → 200: Block wird zur Entscheidungszeile, Meldung darunter mit Fokus',
      tippen: { selector: '#wf-abnahme-begruendung', text: 'Der Ansatz passt nicht, bitte neu planen.' },
      anfragenAntworten: [
        { muster: '**/api/workflows/nw-kl/abnahme', methode: 'POST', json: { ok: true } },
        { muster: '**/api/workflows/nw-kl/abnahme', methode: 'GET', json: abnahme({ workflowStatus: 'GESTOPPT', entscheidung: { ...ENTSCHEIDUNG_OK, ergebnis: 'ABGELEHNT', begruendung: 'Der Ansatz passt nicht, bitte neu planen.' }, urteil: { status: 'noch_nicht_gelaufen' }, aenderungsuebersicht: { status: 'noch_nicht_gelaufen' }, pruefergebnis: { status: 'noch_nicht_gelaufen' } }) },
      ],
      klick: '.abnahme-vorab [data-aktion="ABGELEHNT"]',
      ...warte('#workflow-abnahme-meldung.erfolg', 10000),
      screenshot: 'd1440-abnahme-vorab-3-entschieden.webp',
    },
  ],
})

folgen['abnahme-vorab-tr'] = folge({
  hash: '#/workflows/nw-kl',
  sprache: 'tr',
  schritte: [{ label: 'vorab-Block und Rückfrage-Notiz auf Türkisch', ...warte('#workflow-abnahme-stand .abnahme-vorab'), screenshot: 'tr1440-abnahme-vorab.webp' }],
})

folgen['abnahme-entschieden'] = folge({
  hash: '#/workflows/nw-ab',
  antworten: [{ muster: '**/api/workflows/nw-ab/abnahme', json: abnahme({ entscheidung: ENTSCHEIDUNG_OK }) }],
  schritte: [{ label: 'Entschieden (ANGENOMMEN, erzeuger mensch): kompakte Zeile mit Ergebnis, Begründung und Datum; kein F18', ...warte('#workflow-abnahme-stand .abnahme-stand'), screenshot: 'd1440-abnahme-entschieden.webp' }],
})

folgen['abnahme-iteration'] = folge({
  hash: '#/workflows/nw-iter',
  schritte: [{ label: 'Iteration 2/3 (ANPASSUNG_ANGEFORDERT, erzeuger kern) im Freigabe-Halt: Zeile plus Notiz F18', ...warte('#workflow-abnahme-stand .abnahme-automatisch'), screenshot: 'd1440-abnahme-iteration.webp' }],
})

folgen['abnahme-veraltet'] = folge({
  hash: '#/workflows/nw-ab',
  antworten: [{ muster: '**/api/workflows/nw-ab/abnahme', json: abnahme({ entscheidung: ENTSCHEIDUNG_VERALTET }) }],
  schritte: [{ label: 'Veraltete Entscheidung (früherer Bau): Hinweis im Abschnitt, Abnahme wieder offen', ...warte('#workflow-abnahme .abnahme-frueher'), screenshot: 'd1440-abnahme-veraltet.webp' }],
})

folgen['pruefung-rot'] = folge({
  hash: '#/workflows/nw-rot',
  antworten: [{ muster: '**/api/workflows/nw-rot/pruefung-wiederholen', methode: 'POST', json: { pruefergebnis: 'ROT' } }],
  schritte: [
    { label: 'KLAERUNG_ERFORDERLICH nach Prüfung ROT: kein „Passt das Ergebnis?“, unter der Timeline „Ergebnis ablehnen oder Anpassung wünschen“ mit offenem Prüfbericht und „Prüfung wiederholen“; Notiz „Der Ablauf steht.“', ...warte('.wf-pruefung-wiederholen'), screenshot: 'd1440-pruefung-rot.webp' },
    { label: 'Klick „Prüfung wiederholen“ → 200 (ROT): Meldung „hält weiter“, Fokus auf der Meldung', klick: '.wf-pruefung-wiederholen', ...warte('#workflow-abnahme-meldung.erfolg', 10000), screenshot: 'd1440-pruefung-rot-2-wiederholt.webp' },
  ],
})

const klaerungSchritte = (praefix) => [
  { label: 'KLAERUNG_ERFORDERLICH mit zwei Architekt-Fragen: Notiz „Jarvis braucht deine Entscheidung.“ über der Timeline', ...warte('#workflow-bedienung .wf-klaerung'), screenshot: `${praefix}-klaerung-1-notiz.webp` },
  { label: 'Klick „Rückfrage beantworten“ → Dialog mit Optionen, Empfehlung vorgewählt', klick: '#workflow-bedienung [data-aktion="klaerung-oeffnen"]', ...DIALOG_AUF, ...DIALOG_BILD, screenshot: `${praefix}-klaerung-2-dialog.webp` },
]
folgen['klaerung-dunkel-1440'] = folge({ hash: '#/workflows/nw-kl', schritte: klaerungSchritte('d1440') })
folgen['klaerung-dunkel-390'] = folge({ hash: '#/workflows/nw-kl', breite: 390, hoehe: 844, schritte: klaerungSchritte('d390') })
folgen['klaerung-en-1440'] = folge({ hash: '#/workflows/nw-kl', sprache: 'en', schritte: klaerungSchritte('en1440') })

folgen['sichtung'] = folge({
  hash: '#/workflows/nw-si',
  schritte: [
    { label: 'F-760-Halt nach dem Bau: Notiz „Abgelehnte Befehle sichten“; unter der Timeline „Ergebnis ablehnen oder Anpassung wünschen“ statt „Passt das Ergebnis?“', ...warte('#workflow-bedienung .wf-sichtung'), screenshot: 'd1440-sichtung-1-notiz.webp' },
    { label: 'Klick „Sichtung bestätigen“ → Dialog mit Pflichtfeld', klick: '#workflow-bedienung [data-aktion="sichtung-oeffnen"]', ...DIALOG_AUF, ...DIALOG_BILD, screenshot: 'd1440-sichtung-2-dialog.webp' },
    { label: 'Klick „Sichtung bestätigt – weiter“ ohne Begründung → Pflichtmeldung im Dialog', klick: '#workflow-dialog [data-aktion="sichtung"]', ...warte('#workflow-dialog-meldung:not([hidden])', 5000), ...DIALOG_BILD, screenshot: 'd1440-sichtung-3-pflicht.webp' },
  ],
})

folgen['reparatur-ungueltig'] = folge({
  hash: '#/workflows/nw-ug',
  schritte: [
    { label: 'Ungültige Fassung: rote Notiz „Dieser Ablauf ist nicht gültig.“ mit „Ablauf reparieren“', ...warte('#workflow-bedienung .wf-reparatur-notiz'), screenshot: 'd1440-reparatur-1-notiz.webp' },
    { label: 'Klick „Ablauf reparieren“ → Editor inline unter der Notiz, Warnungen F-219/F-240', klick: '#workflow-bedienung [data-aktion="reparatur"]', ...warte('#wf-reparatur-entwurf'), screenshot: 'd1440-reparatur-2-editor.webp' },
    { label: 'Drei Sekunden später (Poll-Ticks): der Editor bleibt stehen', ...warte('#gibt-es-nicht-wartezeit', 3000, 'attached'), screenshot: 'd1440-reparatur-3-nach-poll.webp' },
  ],
})

folgen['empfehlung-hell'] = {
  ...folge({
    hash: '#/workflows/nw-halt',
    farbschema: 'light',
    schritte: [
      { label: 'Freigabe-Halt (hell)', ...warte('#workflow-aktionen [data-aktion="freigabe-oeffnen"]') },
      { label: 'Dialog „Nächsten Schritt freigeben“ hell: Ankreuzliste mit disabled-angekreuzter Checkbox (Kontrast)', klick: '#workflow-aktionen [data-aktion="freigabe-oeffnen"]', ...DIALOG_AUF, ...DIALOG_BILD, screenshot: 'l1440-empfehlung-dialog.webp' },
    ],
  }),
}
folgen['empfehlung-hell-390'] = folge({
  hash: '#/workflows/nw-halt',
  farbschema: 'light',
  breite: 390,
  hoehe: 844,
  schritte: [
    { label: 'Freigabe-Halt (hell, 390)', ...warte('#workflow-aktionen [data-aktion="freigabe-oeffnen"]') },
    { label: 'Dialog hell bei 390 px: Ankreuzliste lesbar', klick: '#workflow-aktionen [data-aktion="freigabe-oeffnen"]', ...DIALOG_AUF, ...DIALOG_BILD, screenshot: 'l390-empfehlung-dialog.webp' },
  ],
})

// F-926 Workboard-Teil: echte Workitems dieses Worktrees (keine festen Antworten nötig).
folgen['workboard-zurueck'] = {
  url: `${basis}/#/workboard`,
  viewport: { breite: 1440, hoehe: 1000 },
  farbschema: 'dark',
  zoom: 1,
  screenshotQualitaet: 0.7,
  screenshotVollseite: false,
  localStorageSetzen: { ...CHAT_ZU },
  beobachtete: BEOBACHTUNG,
  schritte: [
    { label: '#/workboard: Board mit Karten', ...warte('#workboard-board .board-item[data-id]'), screenshot: 'd1440-workboard-1-board.webp' },
    { label: 'Klick auf die erste Karte → Detail als Seite', klick: '#workboard-board .board-item[data-id]', ...warte('#workboard-detail:not([hidden]) #workboard-detail-titel') },
    { label: 'Klick „← <Register>“ → history.back(), Board, Fokus auf der Karte (F-926)', klick: '#workboard-detail-schliessen', ...warte('#workboard-board .board-item[data-id]:focus', 10000), screenshot: 'd1440-workboard-2-zurueck-fokus.webp' },
  ],
}

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
