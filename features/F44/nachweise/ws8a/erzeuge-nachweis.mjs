/**
 * Datei: features/F44/nachweise/ws8a/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweise F44 WS-8a „Dock & große Ansicht“ (Vorlage V10 d_jarvis und chatDock aus
 * experience.js; Abgleich F-725 L1, L4–L7, L2/L3 funktional) — nur die geänderten Lagen, alles mit
 * festen Antworten:
 * - `#/chat` je Darstellung (1440 dunkel und hell, 390 dunkel, 1440 dunkel mit 200 % Zoom, 1440 ru):
 *   Jarvis-Register leer (Leerzustand mit Vorschlägen), Product-Coach-Register leer, Product Coach mit
 *   Verlauf (Scope-Entwurf mit „Als Auftrag anlegen“), Jarvis mit Verlauf (letzte zwei Einträge,
 *   „Ganzen Verlauf öffnen“, Auftragsvorschlag); Kontextspalte mit fester Vision und festem
 *   „Nächster Schritt“;
 * - Dock offen auf `#/workboard` (1440 dunkel und hell, 390 dunkel und hell): Blase zu, Dock offen mit
 *   Verlauf, Register Product Coach im Dock;
 * - `#/dashboard` (früher mit Chatspalte gemessen) mit offenem Dock, 1440 dunkel;
 * - Klicktabelle (1440 dunkel): Blase öffnet/schließt, Escape + Fokusrückgabe an Blase und Kopfknopf,
 *   „×“, Moduswechsel im Dock, „↗“ → `#/chat` (Modus bleibt), Pfeiltasten/Pos1/Ende im Register,
 *   Vorschlag füllt nur die Eingabe (POST /api/chat fest 500 — ein Senden würde als Fehler sichtbar),
 *   „Gespräch verkleinern“ → vorige Route mit offenem Dock;
 * - Funktionen L4–L7 und L2/L3 (1440 dunkel, `#/chat`): Verlauf ein-/ausklappen, Senden mit
 *   Tippanzeige und Fortschritt, Lauf abbrechen bis „Lauf abgebrochen.“, Zusammenfassen, Untermodus
 *   Projekt, „Als Auftrag anlegen“ bis „Auftrag angelegt“.
 * - Korrekturrunde (Prüfpass WS-8a): `#/chat` hell 390, Dock bei 200 %, Dock mit laufendem Lauf bei reduzierter
 *   Bewegung (Verlauf am Ende, Tippanzeige sichtbar), Kontext-Zustände (Ziel fehlt/Fehler ohne Grund, nichts offen,
 *   Quelle defekt), Projektwechsel auf `#/chat` mit anschließendem „Gespräch verkleinern“ (Liste statt fremdes Detail).
 * Kein echter Lauf: jeder POST ist fest beantwortet (render-nachweis „methode“), Lauf-Details ebenso.
 * Baut je Folge eine klickfolge.json in einem Unterordner und ruft scripts/render-nachweis.mjs auf;
 * Screenshots als WebP. Vor dem Lauf leert das Skript die Ausgabeordner GENAU der Folgen, die es neu
 * erzeugt (fs.rmSync).
 *
 * Wird aufgerufen von: Hand, gegen einen laufenden Leitstand dieses Worktrees —
 *   LEITSTAND_PORT=4199 node scripts/leitstand-server.mjs
 *   node features/F44/nachweise/ws8a/erzeuge-nachweis.mjs [basis] [nurOrdner]
 * Nicht Teil von `npm run check`.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const basis = process.argv[2] ?? 'http://127.0.0.1:4199'
const nur = process.argv[3]
/** Ausgabe neben diesem Skript, Repo-Wurzel vier Ebenen darüber — unabhängig vom Aufrufverzeichnis. */
const ziel = dirname(fileURLToPath(import.meta.url))
const wurzel = resolve(ziel, '../../../..')

const BEOBACHTUNG = {
  texte: [
    { name: 'Ansicht', selector: '[data-view]:not([hidden])', attribut: 'data-view' },
    { name: 'Nav aktuell', selector: '[aria-current="page"]', attribut: 'data-nav-view' },
    { name: 'data-theme', selector: 'html', attribut: 'data-theme' },
    { name: 'lang', selector: 'html', attribut: 'lang' },
    { name: 'Fokus', selector: ':focus', attribut: 'id' },
    { name: 'Blase aria-expanded', selector: '#chat-blase', attribut: 'aria-expanded' },
    { name: 'Kopfknopf aria-expanded', selector: '#chat-umschalter', attribut: 'aria-expanded' },
    { name: 'Reiter gewählt', selector: '#chat-register [aria-selected="true"]' },
    { name: 'Seitentitel', selector: '#chat-seitentitel' },
    { name: 'Dock-Titel', selector: '#chat-titel' },
    { name: 'Fehler', selector: '#chat-fehler:not([hidden])' },
  ],
  sichtbarkeit: [
    { name: 'Dock/Ansicht sichtbar', id: 'shell-chat-spalte' },
    { name: 'Blase sichtbar', id: 'chat-blase' },
    { name: 'Leerzustand', id: 'chat-leer' },
    { name: 'Abbrechen sichtbar', id: 'chat-abbrechen-btn' },
    { name: 'Untermodus sichtbar', id: 'chat-untermodus-auswahl' },
  ],
  vorhanden: [
    { name: 'große Ansicht', selector: '#shell.chat-gross #shell-chat-spalte.chat-grossansicht' },
    // Der Knopf liegt im Seitenkopf der großen Ansicht — sichtbar genau dann, wenn diese gezeigt wird.
    { name: 'Verkleinern sichtbar', selector: '#shell-chat-spalte.chat-grossansicht:not([hidden]) #chat-verkleinern' },
    { name: 'Eingabe leer', selector: '#chat-eingabe:placeholder-shown' },
    { name: 'Nutzerblase', selector: '.chat-bubble-reihe-nutzer' },
    { name: 'Tippanzeige', selector: '.chat-tippindikator' },
    { name: 'Senden gesperrt', selector: '#chat-senden[disabled]' },
    { name: '„Als Auftrag anlegen“', selector: '.chat-auftrag-oeffnen-btn' },
    { name: 'javascript:-Link (muss fehlen)', selector: '#view-chat a[href^="javascript"]' },
  ],
  ueberlauf: true,
}

const LAUF_ID = 'chat-nachweis-1'
const ZUSAMMENFASSUNG_ID = 'chat-nachweis-2'

/** Fester Zustand: eine Freigabe und ein fehlgeschlagener Lauf — „Nächster Schritt“ zeigt die Freigabe. */
const ZUSTAND = {
  laeufe: [{ laufId: 'lauf-nachweis-9', ergebnis: 'FEHLGESCHLAGEN', kenntnisgenommen: false, auftragsbezug: { titel: 'Tests reparieren' } }],
  startfehler: [],
  workflows: [{ workflowId: 'router-nachweis-1', ziel: 'Anmeldung mit Passkey bauen', naechster: { art: 'haltFreigabe' }, grund: 'Plan wartet auf deine Freigabe.' }],
  fehler: [],
  aktiverLauf: { aktiv: false, laufId: null },
}

const ROADMAP = { status: 'ok', vision: 'Eine ruhige Kommandozentrale für die Zusammenarbeit mit KI.', meilensteine: [] }

const LANG = 'Bitte prüfe den Stand der Anmeldung. Ein sehr langer Satz ohne Umbruch: https://example.org/ein/sehr/langer/pfad/der/nicht/umbricht/und/trotzdem/nicht/ueberlaufen/darf'
const SCOPE = JSON.parse(readFileSync(join(wurzel, 'schemas/examples/ergebnis-product-coach.valid-scope-entwurf.json'), 'utf-8'))

const JARVIS_VERLAUF = {
  verlauf: [
    { laufId: 'chat-alt-1', nachricht: 'Was ist seit gestern passiert?', jarvisAntwort: { art: 'antwort', antwort: 'Zwei Abläufe sind durchgelaufen, einer wartet auf deine Freigabe.' }, istZusammenfassung: false },
    { laufId: 'chat-alt-2', nachricht: LANG, jarvisAntwort: { art: 'antwort', antwort: 'Die Anmeldung ist geplant; der Plan wartet auf deine Freigabe. <script>alert(1)</script> bleibt Text.' }, istZusammenfassung: false },
    {
      laufId: 'chat-alt-3',
      nachricht: 'Mach daraus einen Auftrag.',
      jarvisAntwort: { art: 'auftrag_vorschlag', antwort: 'Hier ist ein Vorschlag für den Auftrag.', auftrag: { titel: 'Anmeldung mit Passkey', text: 'Passkey-Anmeldung nach Plan bauen, mit Tests.' } },
      istZusammenfassung: false,
    },
  ],
}
const COACH_VERLAUF = { verlauf: [{ laufId: 'sparring-alt-1', nachricht: 'Ich möchte die Anmeldung vereinfachen.', coachAntwort: SCOPE, modus: 'feature', auftragErstelltId: null }] }
const LEER = { verlauf: [] }

const get = (muster, json) => ({ muster, methode: 'GET', json })
const post = (muster, status, json) => ({ muster, methode: 'POST', status, json })

/** Grundantworten jeder Folge: fester Zustand und feste Roadmap; jeder Chat-POST fest 500 (sichtbar, falls etwas sendet). */
const GRUND = [
  get('**/zustand', ZUSTAND),
  get('**/roadmap', ROADMAP),
  post('**/chat', 500, { grund: 'Nachweis: Senden ist hier nicht vorgesehen' }),
  post('**/sparring', 500, { grund: 'Nachweis: Senden ist hier nicht vorgesehen' }),
]
const verlauf = (jarvis, coach) => [get('**/chat', jarvis), get('**/sparring', coach)]

const warte = (selector, timeoutMs = 8000, zustandWert) => ({ warteAufSelector: { selector, timeoutMs, ...(zustandWert ? { zustand: zustandWert } : {}) } })

/**
 * Eine Folge.
 * @param optionen - url, schritte, antworten, farbschema, breite, hoehe, zoom, sprache, vollseite, chatOffen, modus
 * @returns Klickfolge
 */
function folge({ url = '#/chat', schritte, antworten = [], farbschema = 'dark', breite = 1440, hoehe = 1000, zoom = 1, sprache, vollseite = false, chatOffen = false, modus = 'jarvis', reduzierteBewegung = false }) {
  return {
    url: `${basis}/${url}`,
    viewport: { breite, hoehe },
    farbschema,
    zoom,
    reduzierteBewegung,
    screenshotQualitaet: 0.7,
    screenshotVollseite: vollseite,
    localStorageSetzen: { 'leitstand-chat-offen': String(chatOffen), 'leitstand-chat-modus': modus, 'leitstand-chat-sparring-untermodus': 'feature', ...(sprache ? { 'leitstand-sprache': sprache } : {}) },
    anfragenAntworten: [...GRUND, ...antworten],
    beobachtete: BEOBACHTUNG,
    schritte,
  }
}

const folgen = {}

// ─── #/chat je Darstellung ──────────────────────────────────────────────────
const CHAT_DARSTELLUNGEN = {
  'dunkel-1440': { praefix: 'd1440' },
  'hell-1440': { praefix: 'l1440', farbschema: 'light' },
  'dunkel-390': { praefix: 'd390', breite: 390, hoehe: 844, vollseite: true },
  'hell-390': { praefix: 'l390', farbschema: 'light', breite: 390, hoehe: 844, vollseite: true },
  'dunkel-1440-zoom200': { praefix: 'd1440z2', zoom: 2, vollseite: true },
  'ru-1440': { praefix: 'ru1440', sprache: 'ru' },
}
for (const [name, { praefix, ...darstellung }] of Object.entries(CHAT_DARSTELLUNGEN)) {
  folgen[`chat-${name}`] = folge({
    antworten: verlauf(LEER, LEER),
    schritte: [
      { label: 'Jarvis-Register, Leerzustand: Persona, Satz, drei Vorschläge; Kontextspalte mit Vision und „Nächster Schritt“ (feste Freigabe)', ...warte('#chat-leer-jarvis'), screenshot: `${praefix}-1-jarvis-leer.webp` },
      { label: 'Register Product Coach (Klick): schlichter Leerzustand, Untermodus Feature | Projekt', klick: '#chat-modus-sparring-btn', ...warte('#chat-leer-coach'), screenshot: `${praefix}-2-coach-leer.webp` },
      { label: 'Mit Verlauf (feste Antworten, Neuladen; der Modus Product Coach bleibt gemerkt): Scope-Entwurf mit „Als Auftrag anlegen“', anfragenAntworten: verlauf(JARVIS_VERLAUF, COACH_VERLAUF), reload: true, ...warte('.chat-scope-block'), screenshot: `${praefix}-3-coach-verlauf.webp` },
      { label: 'Register Jarvis mit Verlauf: letzte zwei Einträge, „Ganzen Verlauf öffnen“, Auftragsvorschlag; Modellausgabe als Text', klick: '#chat-modus-jarvis-btn', ...warte('.chat-auftrag-oeffnen-btn'), screenshot: `${praefix}-4-jarvis-verlauf.webp` },
    ],
    ...darstellung,
  })
}

// ─── Dock offen auf #/workboard ─────────────────────────────────────────────
const DOCK_DARSTELLUNGEN = {
  'dunkel-1440': { praefix: 'd1440' },
  'hell-1440': { praefix: 'l1440', farbschema: 'light' },
  'dunkel-390': { praefix: 'd390', breite: 390, hoehe: 844 },
  'hell-390': { praefix: 'l390', farbschema: 'light', breite: 390, hoehe: 844 },
  'dunkel-1440-zoom200': { praefix: 'd1440z2', zoom: 2 },
}
for (const [name, { praefix, ...darstellung }] of Object.entries(DOCK_DARSTELLUNGEN)) {
  folgen[`dock-${name}`] = folge({
    url: '#/workboard',
    antworten: verlauf(JARVIS_VERLAUF, COACH_VERLAUF),
    schritte: [
      { label: 'Workboard, Dock zu: Blase unten rechts', ...warte('#chat-blase'), screenshot: `${praefix}-1-blase.webp` },
      { label: 'Blase geklickt: Dock offen mit Jarvis-Verlauf, Fokus in der Eingabe', klick: '#chat-blase', ...warte('#shell-chat-spalte .chat-bubble'), screenshot: `${praefix}-2-dock-jarvis.webp` },
      { label: 'Register Product Coach im Dock', klick: '#chat-modus-sparring-btn', ...warte('#shell-chat-spalte .chat-scope-block'), screenshot: `${praefix}-3-dock-coach.webp` },
    ],
    ...darstellung,
  })
}

// ─── Früher mit Chatspalte gemessen: Übersicht mit offenem Dock ────────────
folgen['dashboard-dock-dunkel-1440'] = folge({
  url: '#/dashboard',
  chatOffen: true,
  antworten: verlauf(LEER, LEER),
  schritte: [{ label: 'Produktübersicht mit offenem Dock (Präferenz offen): keine Layoutbreite, Dock überlagert unten rechts; Leerzustand im Dock', ...warte('#chat-leer-jarvis'), screenshot: 'd1440-dashboard-dock.webp' }],
})

// ─── Klicktabelle ───────────────────────────────────────────────────────────
folgen.klicks = folge({
  url: '#/workboard',
  antworten: verlauf(LEER, LEER),
  schritte: [
    { label: 'Start: Workboard, Dock zu', ...warte('#chat-blase') },
    { label: 'Blase öffnet: Dock offen, Fokus #chat-eingabe, aria-expanded true', klick: '#chat-blase', ...warte('#chat-leer-jarvis'), screenshot: 'k01-blase-offen.webp' },
    { label: 'Escape: Dock zu, Fokus zurück auf die Blase', taste: 'Escape' },
    { label: 'Kopfknopf „Frag Jarvis“ öffnet dasselbe Dock', klick: '#chat-umschalter' },
    { label: 'Escape: Dock zu, Fokus zurück auf den Kopfknopf', taste: 'Escape' },
    { label: 'Blase öffnet erneut', klick: '#chat-blase' },
    { label: '„×“ im Dock-Kopf: Dock zu, Fokus auf die Blase', klick: '#chat-schliessen' },
    { label: 'Blase öffnet erneut (für den Moduswechsel)', klick: '#chat-blase' },
    { label: 'Moduswechsel im Dock auf Product Coach', klick: '#chat-modus-sparring-btn', ...warte('#chat-leer-coach') },
    { label: '„↗“ → #/chat: große Ansicht, Modus Product Coach bleibt, Fokus #chat-eingabe', klick: '#chat-gross-oeffnen', ...warte('.chat-grossansicht #chat-seitentitel'), screenshot: 'k02-gross-coach.webp' },
    { label: 'Pfeil links im Register: Jarvis gewählt und fokussiert', fokus: '#chat-modus-sparring-btn', taste: 'ArrowLeft' },
    { label: 'Pfeil rechts: Product Coach', taste: 'ArrowRight' },
    { label: 'Pos1: Jarvis', taste: 'Home' },
    { label: 'Ende: Product Coach', taste: 'End' },
    { label: 'Pfeil rechts läuft um: Jarvis', taste: 'ArrowRight', ...warte('#chat-leer-jarvis') },
    { label: 'Vorschlag „Was braucht mich?“: füllt nur die Eingabe, fokussiert sie; keine Nutzerblase, kein Fehler (POST wäre fest 500)', klick: '[data-vorschlag="chat.vorschlag.braucht"]', screenshot: 'k03-vorschlag-gefuellt.webp' },
    { label: '„Gespräch verkleinern“ → vorige Route #/workboard mit offenem Dock, Eingabe bleibt gefüllt', klick: '#chat-verkleinern', ...warte('#view-workboard'), screenshot: 'k04-verkleinert-dock-offen.webp' },
  ],
})

// ─── Funktionen L4–L7, L2/L3 ────────────────────────────────────────────────
const laufDetail = (id, json) => get(`**/laeufe/${id}`, json)
folgen.funktionen = folge({
  antworten: [
    ...verlauf(JARVIS_VERLAUF, COACH_VERLAUF),
    post('**/chat', 202, { laufId: LAUF_ID }),
    laufDetail(LAUF_ID, { aktiv: true, fortschritt: { werkzeug: 'Read', ziel: 'C:/Projekte/ai-workforce/docs/STATUS.md' } }),
    post(`**/laeufe/${LAUF_ID}/abbrechen`, 202, {}),
  ],
  schritte: [
    { label: 'L7: Verlauf zeigt die letzten zwei Einträge, „Ganzen Verlauf öffnen“', ...warte('.chat-auftrag-oeffnen-btn'), screenshot: 'f1-verlauf-eingeklappt.webp' },
    { label: 'L7: „Ganzen Verlauf öffnen“ → alle drei Einträge, Knopf heißt „Verlauf einklappen“', klick: '#chat-ganzen-verlauf-link', screenshot: 'f2-verlauf-offen.webp' },
    { label: 'L4: Senden (POST fest 202) → Tippanzeige mit Fortschritt „liest …/STATUS.md“, Senden gesperrt, „Lauf abbrechen“ sichtbar', tippen: { selector: '#chat-eingabe', text: 'Wo steht die Anmeldung?' }, klick: '#chat-senden', ...warte('.chat-fortschritt'), screenshot: 'f3-tippanzeige-fortschritt.webp' },
    { label: 'L6: „Lauf abbrechen“ (POST fest 202) → „Abbruch angefordert“', klick: '#chat-abbrechen-btn', screenshot: 'f4-abbruch-angefordert.webp' },
    {
      label: 'L6: Lauf endet FEHLGESCHLAGEN (feste Detail-Antwort) → „Lauf abgebrochen.“, Sperre frei',
      anfragenAntworten: [laufDetail(LAUF_ID, { aktiv: false, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'FEHLGESCHLAGEN' } })],
      ...warte('#chat-senden:not([disabled])'),
      screenshot: 'f5-lauf-abgebrochen.webp',
    },
    {
      label: 'L5: „Zusammenfassen & neu starten“ (POST fest 202) → ausstehender Zusammenfassungs-Turn mit Trenner',
      anfragenAntworten: [post('**/chat/zusammenfassen', 202, { laufId: ZUSAMMENFASSUNG_ID }), laufDetail(ZUSAMMENFASSUNG_ID, { aktiv: true, fortschritt: null })],
      klick: '#chat-zusammenfassen-btn',
      ...warte('.chat-zusammenfassung-trenner'),
      screenshot: 'f6-zusammenfassen.webp',
    },
    { label: 'L2: Register Product Coach, Untermodus Feature mit Scope-Entwurf', klick: '#chat-modus-sparring-btn', ...warte('.chat-scope-block') },
    {
      label: 'L3: „Als Auftrag anlegen“ → vorbefüllter Dialog',
      klick: '.chat-auftrag-oeffnen-btn',
      ...warte('#chat-auftrag-titel'),
      screenshot: 'f7-auftrag-dialog.webp',
    },
    {
      label: 'L3: „Anlegen“ (POST fest 201) → „Auftrag angelegt“ mit Link',
      anfragenAntworten: [post('**/auftraege', 201, { auftragId: 'auftrag-nachweis-1' }), post('**/sparring/*/auftrag', 200, {})],
      klick: '[data-auftrag-anlegen]',
      ...warte('.chat-auftrag-dialog-erfolg'),
      screenshot: 'f8-auftrag-angelegt.webp',
    },
    { label: 'L2: Untermodus Projekt (aria-pressed) — eigener, hier leerer Verlauf', klick: '#chat-untermodus-projekt-btn', screenshot: 'f9-untermodus-projekt.webp' },
  ],
})

// ─── Korrekturrunde (Prüfpass WS-8a): Dock mit laufendem Lauf, Kontext-Zustände, Projektwechsel ──
folgen['dock-lauf-reduziert-1440'] = folge({
  url: '#/workboard',
  reduzierteBewegung: true,
  antworten: [...verlauf(JARVIS_VERLAUF, COACH_VERLAUF), post('**/chat', 202, { laufId: LAUF_ID }), laufDetail(LAUF_ID, { aktiv: true, fortschritt: { werkzeug: 'Grep', ziel: 'Anmeldung' } })],
  schritte: [
    { label: 'Dock offen: Verlauf steht am Ende (neueste Antwort mit „Als Auftrag anlegen“ sichtbar)', klick: '#chat-blase', ...warte('#shell-chat-spalte .chat-auftrag-oeffnen-btn'), screenshot: 'r1-dock-am-ende.webp' },
    { label: 'Senden im Dock (POST fest 202): Tippanzeige mit Fortschritt am Ende sichtbar, ohne Animation (reduzierte Bewegung)', tippen: { selector: '#chat-eingabe', text: 'Und die Tests?' }, klick: '#chat-senden', ...warte('#shell-chat-spalte .chat-fortschritt'), screenshot: 'r2-dock-tippanzeige.webp' },
  ],
})

const ROADMAP_FEHLER = { muster: '**/roadmap', methode: 'GET', status: 500, json: {} }
folgen['kontext-zustaende'] = folge({
  antworten: verlauf(LEER, LEER),
  schritte: [
    {
      label: 'Kontext: Roadmap ohne Vision → „Noch kein Ziel festgehalten“; Zustand ohne Freigabe/Lauf → Hinweis und „Alle Entscheidungen“',
      anfragenAntworten: [get('**/roadmap', { status: 'nicht_vorhanden' }), get('**/zustand', { ...ZUSTAND, workflows: [], laeufe: [] })],
      reload: true,
      ...warte('#chat-kontext-naechster a[href="#/attention"]'),
      screenshot: 'z1-ziel-fehlt-nichts-offen.webp',
    },
    {
      label: 'Kontext: Roadmap 500 ohne Grund → „Ziel nicht ladbar.“; Workflows-Quelle defekt → „Gerade nicht verfügbar.“',
      anfragenAntworten: [ROADMAP_FEHLER, get('**/zustand', { ...ZUSTAND, workflows: null, laeufe: [] })],
      reload: true,
      ...warte('#chat-kontext-naechster a[href="#/attention"]'),
      screenshot: 'z2-ziel-fehler-defekt.webp',
    },
  ],
})

/** Zweites Projekt nur für den Projektwechsel (das laufende Register kennt nur ai-workforce). */
const PROJEKTE = {
  projekte: [
    { id: 'ai-workforce', name: 'AI Workforce', repo_pfad: '.', status: 'IN_ENTWICKLUNG', laufAktiv: false },
    { id: 'zweites-projekt', name: 'Zweites Projekt', repo_pfad: '../zweites-projekt', status: 'DISCOVERY', laufAktiv: false },
  ],
}
folgen.projektwechsel = folge({
  url: '#/runs/lauf-nachweis-9',
  antworten: [...verlauf(JARVIS_VERLAUF, LEER), get('**/api/projekte', PROJEKTE), get('**/laeufe/lauf-nachweis-9', { aktiv: false, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'FEHLGESCHLAGEN' } })],
  schritte: [
    { label: 'Start: Lauf-Detail #/runs/<id> des Projekts AI Workforce (wird als Rückkehrziel gemerkt)', ...warte('#chat-blase') },
    { label: '„Frag Jarvis“ öffnet das Dock; „↗“ → #/chat', klick: '#chat-umschalter' },
    { label: '„↗“ → #/chat', klick: '#chat-gross-oeffnen', ...warte('.chat-grossansicht #chat-seitentitel') },
    {
      label: 'Projektwechsel im Kopf auf „Zweites Projekt“ (fester leerer Verlauf): Kontext und Verlauf zeigen das neue Projekt',
      anfragenAntworten: verlauf(LEER, LEER),
      auswaehlen: { selector: '#kopf-projekt-auswahl', wert: 'zweites-projekt' },
      ...warte('#chat-leer-jarvis'),
      screenshot: 'p1-gross-nach-wechsel.webp',
    },
    { label: '„Gespräch verkleinern“ → Liste #/ausfuehrungen statt des Details des alten Projekts, Dock offen mit „Zweites Projekt“', klick: '#chat-verkleinern', ...warte('#shell-chat-spalte:not(.chat-grossansicht)'), screenshot: 'p2-verkleinert-liste.webp' },
  ],
})
folgen.projektwechsel.beobachtete = { ...BEOBACHTUNG, texte: [...BEOBACHTUNG.texte, { name: 'Dock-Projekt', selector: '#chat-dock-projekt' }, { name: 'Kontext-Projekt', selector: '#chat-kontext-projekt' }] }

const auszufuehren = nur ? { [nur]: folgen[nur] } : folgen
if (nur && !folgen[nur]) throw new Error(`Unbekannte Folge: ${nur}`)

for (const [ordner, klickfolge] of Object.entries(auszufuehren)) {
  const verzeichnis = join(ziel, ordner)
  rmSync(verzeichnis, { recursive: true, force: true })
  mkdirSync(verzeichnis, { recursive: true })
  const datei = join(verzeichnis, 'klickfolge.json')
  writeFileSync(datei, `${JSON.stringify(klickfolge, null, 2)}\n`)
  console.log(`\n── ${ordner} ──`)
  execFileSync(process.execPath, [join(wurzel, 'scripts/render-nachweis.mjs'), datei, verzeichnis], { stdio: 'inherit', cwd: wurzel })
}
