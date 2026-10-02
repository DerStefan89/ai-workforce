/**
 * Datei: features/F44/nachweise/ws8b/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweise F44 WS-8b „Coach & Befehle“ (Vorlage V10 d_jarvis_coach; Abgleich F-725
 * L2/L3; Befehlsblock, Kopf-Knöpfe VS Code | Terminal | GitHub, „Lieber mit dem Coach besprechen“,
 * stiller Punkt bei neuer Antwort) — alles mit festen Antworten, kein Modell-Lauf:
 * - `#/chat` Product Coach leer und mit Entwurf (Hinweiskarte): 1440 dunkel/hell, 390 dunkel,
 *   1440 dunkel mit 200 % Zoom, 1440 ru;
 * - Jarvis-Antwort mit zwei Befehlsblöcken (einer mit Platzhalter) in großer Ansicht und Dock:
 *   1440 dunkel/hell, 390 dunkel;
 * - Kopfzeile mit den drei Knöpfen: 1600 dunkel (beschriftet), 1440 dunkel/hell, 390 dunkel (Knöpfe im
 *   mobilen Menü), 200 % (720 CSS-px: Knöpfe in der Sidebar);
 * - `#/projekt` → „Lieber mit dem Coach besprechen“ → Dock im Coach mit Entwurf;
 * - Klicktabellen: Coach-Knöpfe wählen den Untermodus, „Kopieren“ (Zwischenablage im Testbrowser),
 *   Platzhalter-Chip, VS-Code-href, Terminal/GitHub „kommt“, stiller Punkt und sein Verschwinden,
 *   „Gespräch verkleinern“ nach dem Coach-Interview → `#/projekte-uebersicht`, „What needs me?“ (en)
 *   → lokale Antwort ohne Lauf.
 * - Korrekturrunde (Prüfpass WS-8b): „Kopieren“ ohne Clipboard-API (Markieren + Strg+C-Hinweis),
 *   „Lieber mit dem Coach besprechen“ bei schon gefüllter Chat-Eingabe (Entwurf wird angehängt),
 *   Kopfzeile bei 1300 px (nur Symbole). Reduzierte Bewegung: WS-8b führt keine Animation ein; der
 *   Lauf dazu steht in ws8a (dock-lauf-reduziert-1440).
 * Jeder Chat-POST ist fest beantwortet (500, falls etwas ungewollt sendet), Lauf-Details ebenso.
 * Baut je Folge eine klickfolge.json in einem Unterordner und ruft scripts/render-nachweis.mjs auf;
 * Screenshots als WebP. Vor dem Lauf leert das Skript die Ausgabeordner GENAU der Folgen, die es neu
 * erzeugt (fs.rmSync).
 *
 * Wird aufgerufen von: Hand, gegen einen laufenden Leitstand dieses Worktrees —
 *   LEITSTAND_PORT=4199 node scripts/leitstand-server.mjs
 *   node features/F44/nachweise/ws8b/erzeuge-nachweis.mjs [basis] [nurOrdner]
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
    { name: 'data-theme', selector: 'html', attribut: 'data-theme' },
    { name: 'lang', selector: 'html', attribut: 'lang' },
    { name: 'Fokus', selector: ':focus', attribut: 'id' },
    { name: 'Reiter gewählt', selector: '#chat-register [aria-selected="true"]' },
    { name: 'Coach Feature aria-pressed', selector: '#chat-coach-feature-btn', attribut: 'aria-pressed' },
    { name: 'Coach Projekt aria-pressed', selector: '#chat-coach-projekt-btn', attribut: 'aria-pressed' },
    { name: 'Untermodus Projekt aria-pressed', selector: '#chat-untermodus-projekt-btn', attribut: 'aria-pressed' },
    { name: 'Platzhalter Eingabe', selector: '#chat-eingabe', attribut: 'placeholder' },
    { name: 'Fehler', selector: '#chat-fehler:not([hidden])' },
  ],
  sichtbarkeit: [
    { name: 'Dock/Ansicht sichtbar', id: 'shell-chat-spalte' },
    { name: 'Leerzustand', id: 'chat-leer' },
    { name: 'Untermodus-Umschalter', id: 'chat-untermodus-auswahl' },
    { name: '„So gehen wir vor“', id: 'chat-kontext-vorgehen-eintrag' },
    { name: '„Nächster Schritt“', id: 'chat-kontext-naechster-eintrag' },
  ],
  vorhanden: [
    { name: 'große Ansicht', selector: '#shell.chat-gross #shell-chat-spalte.chat-grossansicht' },
    { name: 'Eingabe leer', selector: '#chat-eingabe:placeholder-shown' },
    { name: 'Nutzerblase', selector: '.chat-bubble-reihe-nutzer' },
    { name: 'Entwurfskarte', selector: '.chat-entwurf-karte .button.primary' },
    { name: 'zwei Befehlsblöcke', selector: '.befehlsblock ~ .befehlsblock' },
    { name: 'Platzhalter-Chip', selector: '.befehlsblock-platzhalter' },
    { name: 'javascript:-Link (muss fehlen)', selector: '#view-chat a[href^="javascript"]' },
  ],
  ueberlauf: true,
}

/** Zusätzliche Spalten der Kopf- und Klickfolgen. */
const KOPF_BEOBACHTUNG = {
  ...BEOBACHTUNG,
  texte: [
    ...BEOBACHTUNG.texte,
    { name: 'VS Code href', selector: '#shell-kopf [data-werkzeug-vscode]', attribut: 'href' },
    { name: 'VS Code aria-disabled', selector: '#shell-kopf [data-werkzeug-vscode]', attribut: 'aria-disabled' },
    { name: 'Terminal aria-disabled', selector: '#shell-kopf .kopf-werkzeug.kommt-knopf', attribut: 'aria-disabled' },
    { name: 'Kopieren-Knopf (1)', selector: '.befehlsblock .befehlsblock-kopieren' },
    { name: 'Blase aria-label', selector: '#chat-blase', attribut: 'aria-label' },
    { name: 'Kopfknopf aria-label', selector: '#chat-umschalter', attribut: 'aria-label' },
    { name: 'letzte Antwort (Kopf)', selector: '#chat-verlauf > .chat-bubble-reihe-jarvis:last-child .chat-bubble-kopf' },
    { name: 'Eingabe (Wert)', selector: '#chat-eingabe', eigenschaft: 'value' },
    { name: 'Strg+C-Hinweis', selector: '.befehlsblock-hinweis:not([hidden])' },
  ],
  sichtbarkeit: [
    ...BEOBACHTUNG.sichtbarkeit,
    { name: 'Produktliste', id: 'projekte-uebersicht-seite' },
    { name: 'Anlegeseite', id: 'projekte-anlegen-seite' },
  ],
  vorhanden: [
    ...BEOBACHTUNG.vorhanden,
    { name: 'Punkt an der Blase', selector: '.chat-blase.hat-neue-antwort' },
    { name: 'Punkt am Kopfknopf', selector: '#chat-umschalter.hat-neue-antwort' },
  ],
  getroffen: [
    { name: 'VS Code im Kopf sichtbar', selector: '#shell-kopf [data-werkzeug-vscode]' },
    { name: 'VS Code in Sidebar/Menü sichtbar', selector: '.menue-werkzeuge [data-werkzeug-vscode]' },
    { name: 'Projektauswahl sichtbar', selector: '#kopf-projekt-auswahl' },
  ],
}

const LAUF_ID = 'chat-nachweis-8b-1'

/** Fester Zustand: eine Freigabe — „Nächster Schritt“ (nur Jarvis) zeigt sie. */
const ZUSTAND = {
  laeufe: [],
  startfehler: [],
  workflows: [{ workflowId: 'router-nachweis-1', ziel: 'Anmeldung mit Passkey bauen', naechster: { art: 'haltFreigabe' }, grund: 'Plan wartet auf deine Freigabe.' }],
  fehler: [],
  aktiverLauf: { aktiv: false, laufId: null },
}
const ROADMAP = { status: 'ok', vision: 'Eine ruhige Kommandozentrale für die Zusammenarbeit mit KI.', meilensteine: [] }
const SCOPE = JSON.parse(readFileSync(join(wurzel, 'schemas/examples/ergebnis-product-coach.valid-scope-entwurf.json'), 'utf-8'))

/** Antwort mit zwei Befehlsblöcken (der zweite mit Platzhalter) und einer langen Zeile. */
const BEFEHLE_ANTWORT = [
  'Dein Stand ist sauber. Erst prüfen:',
  '```powershell',
  'cd "C:\\Users\\stefa\\Projekte\\ai workforce"',
  'git status --short',
  'git diff --stat -- public/leitstand/befehlsblock.js public/leitstand/views/chat.js public/leitstand/style.css',
  '```',
  'Dann mit eigener Nachricht committen (Push erst danach, eigener Schritt):',
  '```powershell',
  'git add public/leitstand/befehlsblock.js',
  'git commit -m "<commit-nachricht>"',
  '```',
  'Modellausgabe bleibt Text: <a href="javascript:alert(1)">kein Link</a>',
].join('\n')
const JARVIS_BEFEHLE = { verlauf: [{ laufId: 'chat-befehle-1', nachricht: 'Wie committe ich die Änderung?', jarvisAntwort: { art: 'antwort', antwort: BEFEHLE_ANTWORT }, istZusammenfassung: false }] }
const COACH_ENTWURF = { verlauf: [{ laufId: 'sparring-alt-1', nachricht: 'Ich möchte die Anmeldung vereinfachen.', coachAntwort: SCOPE, modus: 'feature', auftragErstelltId: null }] }
const LEER = { verlauf: [] }

/** Register mit absolutem Pfad (VS Code aktiv) und einem relativen (VS Code aria-disabled). */
const PROJEKTE = {
  projekte: [
    { id: 'ai-workforce', name: 'AI Workforce', repo_pfad: 'C:\\Users\\stefa\\Projekte\\ai workforce', status: 'IN_ENTWICKLUNG', laufAktiv: false },
    { id: 'zweites-projekt', name: 'Zweites Projekt', repo_pfad: '../zweites-projekt', status: 'DISCOVERY', laufAktiv: false },
  ],
}

const get = (muster, json) => ({ muster, methode: 'GET', json })
const post = (muster, status, json) => ({ muster, methode: 'POST', status, json })

/** Grundantworten jeder Folge; jeder Chat-POST fest 500 (sichtbar, falls etwas ungewollt sendet). */
const GRUND = [
  get('**/zustand', ZUSTAND),
  get('**/roadmap', ROADMAP),
  get('**/api/projekte', PROJEKTE),
  post('**/chat', 500, { grund: 'Nachweis: Senden ist hier nicht vorgesehen' }),
  post('**/sparring', 500, { grund: 'Nachweis: Senden ist hier nicht vorgesehen' }),
]
const verlauf = (jarvis, coach) => [get('**/chat', jarvis), get('**/sparring', coach)]
const warte = (selector, timeoutMs = 8000, zustandWert) => ({ warteAufSelector: { selector, timeoutMs, ...(zustandWert ? { zustand: zustandWert } : {}) } })

/**
 * Eine Folge.
 * @param optionen - url, schritte, antworten, farbschema, breite, hoehe, zoom, sprache, vollseite, chatOffen, modus, untermodus, beobachtete, ausschnitt, zwischenablage
 * @returns Klickfolge
 */
function folge({ url = '#/chat', schritte, antworten = [], farbschema = 'dark', breite = 1440, hoehe = 1000, zoom = 1, sprache, vollseite = false, chatOffen = false, modus = 'sparring', untermodus = 'feature', beobachtete = BEOBACHTUNG, ausschnitt, zwischenablage = false, ohneZwischenablage = false }) {
  return {
    url: `${basis}/${url}`,
    viewport: { breite, hoehe },
    farbschema,
    zoom,
    screenshotQualitaet: 0.7,
    screenshotVollseite: vollseite,
    ...(ausschnitt ? { screenshotAusschnitt: ausschnitt } : {}),
    ...(zwischenablage ? { zwischenablage: true } : {}),
    ...(ohneZwischenablage ? { zwischenablageEntfernen: true } : {}),
    localStorageSetzen: { 'leitstand-chat-offen': String(chatOffen), 'leitstand-chat-modus': modus, 'leitstand-chat-sparring-untermodus': untermodus, ...(sprache ? { 'leitstand-sprache': sprache } : {}) },
    anfragenAntworten: [...GRUND, ...antworten],
    beobachtete,
    schritte,
  }
}

const folgen = {}

// ─── #/chat Product Coach: leer und mit Entwurf ─────────────────────────────
const COACH_DARSTELLUNGEN = {
  'dunkel-1440': { praefix: 'd1440' },
  'hell-1440': { praefix: 'l1440', farbschema: 'light' },
  'dunkel-390': { praefix: 'd390', breite: 390, hoehe: 844, vollseite: true },
  'dunkel-1440-zoom200': { praefix: 'd1440z2', zoom: 2, vollseite: true },
  'ru-1440': { praefix: 'ru1440', sprache: 'ru' },
}
for (const [name, { praefix, ...darstellung }] of Object.entries(COACH_DARSTELLUNGEN)) {
  folgen[`coach-${name}`] = folge({
    antworten: verlauf(LEER, LEER),
    schritte: [
      { label: 'Product Coach leer: „Was möchtest du möglich machen?“, zwei Knöpfe, Platzhalter „Erzähl mir von deiner Idee …“, Kontext „So gehen wir vor“', ...warte('#chat-coach-feature-btn'), screenshot: `${praefix}-1-coach-leer.webp` },
      { label: 'Mit Entwurf (feste Antworten, Neuladen): Hinweiskarte „Dein Entwurf ist bereit.“ mit primärem „Als Auftrag anlegen“; Untermodus-Umschalter wieder sichtbar', anfragenAntworten: verlauf(LEER, COACH_ENTWURF), reload: true, ...warte('.chat-entwurf-karte'), screenshot: `${praefix}-2-coach-entwurf.webp`, screenshotVollseite: true },
    ],
    ...darstellung,
  })
}

// ─── Jarvis-Antwort mit zwei Befehlsblöcken: große Ansicht und Dock ────────
const BEFEHLE_DARSTELLUNGEN = {
  'dunkel-1440': { praefix: 'd1440' },
  'hell-1440': { praefix: 'l1440', farbschema: 'light' },
  'dunkel-390': { praefix: 'd390', breite: 390, hoehe: 844, vollseite: true },
}
for (const [name, { praefix, ...darstellung }] of Object.entries(BEFEHLE_DARSTELLUNGEN)) {
  folgen[`befehle-${name}`] = folge({
    modus: 'jarvis',
    chatOffen: true,
    antworten: verlauf(JARVIS_BEFEHLE, LEER),
    schritte: [
      { label: 'Große Ansicht: Antwort mit zwei Befehlsblöcken (POWERSHELL, Anzahl, „Kopieren“; der zweite mit „Platzhalter ausfüllen“); Link-Text der Modellausgabe bleibt Text', ...warte('.befehlsblock ~ .befehlsblock'), screenshot: `${praefix}-1-gross.webp` },
      { label: 'Dock (Route #/workboard, Präferenz offen): dieselbe Antwort im Dock', navigiere: '#/workboard', ...warte('#shell-chat-spalte:not(.chat-grossansicht) .befehlsblock'), screenshot: `${praefix}-2-dock.webp`, screenshotVollseite: false },
    ],
    ...darstellung,
  })
}

// ─── Kopfzeile mit VS Code | Terminal | GitHub ─────────────────────────────
const KOPF_DARSTELLUNGEN = {
  'dunkel-1600': { praefix: 'd1600', breite: 1600 },
  'dunkel-1440': { praefix: 'd1440' },
  'dunkel-1300': { praefix: 'd1300', breite: 1300 },
  'hell-1440': { praefix: 'l1440', farbschema: 'light' },
  'dunkel-1440-zoom200': { praefix: 'd1440z2', zoom: 2 },
}
for (const [name, { praefix, ...darstellung }] of Object.entries(KOPF_DARSTELLUNGEN)) {
  folgen[`kopf-${name}`] = folge({
    url: '#/dashboard',
    beobachtete: KOPF_BEOBACHTUNG,
    ausschnitt: { selector: '#shell-kopf' },
    antworten: verlauf(LEER, LEER),
    schritte: [
      { label: 'Kopfzeile: VS Code (Link auf den Projektordner), Terminal und GitHub „kommt“, links von „Frag Jarvis“ (ab 1500 px beschriftet, 1340–1499 px Symbol + „kommt“, bis 1279 px in der Sidebar); Projektauswahl ungekürzt', ...warte('[data-werkzeug-vscode][href]', 8000, 'attached'), screenshot: `${praefix}-1-kopf.webp` },
      { label: 'Ganze Seite (Sidebar mit den Werkzeugen, falls schmaler als 1280 CSS-px)', screenshot: `${praefix}-2-seite.webp`, ohneAusschnitt: true },
    ],
    ...darstellung,
  })
}
// 200 % = 720 CSS-px: die Werkzeuge stehen in der Sidebar — Fokus holt sie in den Blick.
folgen['kopf-dunkel-1440-zoom200'].schritte.push({ label: 'Sidebar: Fokus auf VS Code (scrollt die Sidebar), Werkzeuge VS Code · Terminal · GitHub sichtbar', fokus: '.menue-werkzeuge [data-werkzeug-vscode]', screenshot: 'd1440z2-3-sidebar-werkzeuge.webp', ohneAusschnitt: true })

folgen['kopf-dunkel-390'] = folge({
  url: '#/dashboard',
  beobachtete: KOPF_BEOBACHTUNG,
  breite: 390,
  hoehe: 844,
  antworten: verlauf(LEER, LEER),
  schritte: [
    { label: 'Kopfzeile 390 px: Werkzeuge nicht im Kopf (kein Überlauf)', ...warte('#chat-blase'), screenshot: 'd390-1-kopf.webp' },
    { label: 'Mobiles Menü geöffnet: Werkzeuge VS Code · Terminal · GitHub unter „Zuletzt geöffnet“', klick: '#shell-menue-oeffner', ...warte('#shell.menue-offen .menue-werkzeuge [data-werkzeug-vscode]'), screenshot: 'd390-2-menue.webp' },
  ],
})

// ─── #/projekt → „Lieber mit dem Coach besprechen“ ─────────────────────────
folgen['projekt-coach'] = folge({
  url: '#/projekt',
  modus: 'jarvis',
  untermodus: 'projekt',
  beobachtete: KOPF_BEOBACHTUNG,
  antworten: verlauf(LEER, LEER),
  schritte: [
    { label: 'Auftrag & Start: Titel und Ergebnis eingetragen; „Lieber mit dem Coach besprechen“ ist ein echter Knopf', tippen: { selector: '#auftrag-titel', text: 'Anmeldung vereinfachen' }, ...warte('#auftrag-coach') },
    { label: 'Ergebnis eingetragen', tippen: { selector: '#auftrag-auftragstext', text: 'Nutzer melden sich mit Passkey an, ohne Passwort.' } },
    { label: 'Klick: Dock offen im Product Coach, Untermodus Feature, Entwurf (Titel + Ergebnis) in der Eingabe, Fokus dort; nichts gesendet (keine Nutzerblase)', klick: '#auftrag-coach', ...warte('#shell-chat-spalte:not([hidden]) #chat-coach-feature-btn[aria-pressed="true"]'), screenshot: 'd1440-projekt-coach-entwurf.webp' },
  ],
})

// ─── Prüfpass WS-8b (qa S1): gefüllte Chat-Eingabe, dann „Lieber mit dem Coach besprechen“ ──
folgen['projekt-coach-gefuellt'] = folge({
  url: '#/projekt',
  modus: 'jarvis',
  chatOffen: true,
  beobachtete: KOPF_BEOBACHTUNG,
  antworten: verlauf(LEER, LEER),
  schritte: [
    { label: 'Dock offen (Jarvis), Stefan hat schon eine Frage getippt', tippen: { selector: '#chat-eingabe', text: 'Meine angefangene Frage an Jarvis' }, ...warte('#chat-eingabe') },
    { label: 'Titel im Auftragsformular', tippen: { selector: '#auftrag-titel', text: 'Anmeldung vereinfachen' } },
    { label: '„Lieber mit dem Coach besprechen“: Coach/Feature, die getippte Frage bleibt, der Entwurf steht nach einer Leerzeile dahinter; nichts gesendet', klick: '#auftrag-coach', ...warte('#chat-coach-feature-btn[aria-pressed="true"]'), screenshot: 'd1440-projekt-coach-gefuellt.webp' },
  ],
})

// ─── Prüfpass WS-8b (dg 2): „Kopieren“ ohne Clipboard-API ───────────────────
folgen['klicks-ohne-zwischenablage'] = folge({
  modus: 'jarvis',
  ohneZwischenablage: true,
  beobachtete: KOPF_BEOBACHTUNG,
  antworten: verlauf(JARVIS_BEFEHLE, LEER),
  schritte: [
    { label: 'Jarvis mit zwei Befehlsblöcken; navigator.clipboard entfernt', ...warte('.befehlsblock ~ .befehlsblock') },
    { label: '„Kopieren“ ohne Clipboard-API: Code markiert, Hinweis „Mit Strg+C kopieren“ sichtbar, Knopf bleibt „Kopieren“', klick: '.befehlsblock .befehlsblock-kopieren', ...warte('.befehlsblock-hinweis:not([hidden])'), screenshot: 'k08-ohne-zwischenablage.webp' },
  ],
})

// ─── Klicktabelle: Coach-Knöpfe, Kopieren, Platzhalter, Kopf-Knöpfe ────────
folgen.klicks = folge({
  beobachtete: KOPF_BEOBACHTUNG,
  zwischenablage: true,
  antworten: verlauf(JARVIS_BEFEHLE, LEER),
  schritte: [
    { label: 'Start: Product Coach leer, Untermodus Feature (aria-pressed), Umschalter ausgeblendet', ...warte('#chat-coach-feature-btn') },
    { label: '„Ein neues Projekt durchdenken“: Untermodus Projekt, Fokus #chat-eingabe, nichts gesendet', klick: '#chat-coach-projekt-btn', screenshot: 'k01-coach-projekt.webp' },
    { label: '„Eine Feature-Idee schärfen“: Untermodus Feature, Fokus #chat-eingabe, nichts gesendet', klick: '#chat-coach-feature-btn' },
    { label: 'Register Jarvis: Antwort mit zwei Befehlsblöcken, Platzhalter-Chip am zweiten', klick: '#chat-modus-jarvis-btn', ...warte('.befehlsblock ~ .befehlsblock') },
    { label: '„Kopieren“ am ersten Block: Zwischenablage = die drei Zeilen, Knopf „Kopiert“', klick: '.befehlsblock .befehlsblock-kopieren', screenshot: 'k02-kopiert.webp' },
    { label: '„Kopieren“ am zweiten Block (mit Platzhalter): Zwischenablage = beide Zeilen inkl. <commit-nachricht>', klick: '.befehlsblock ~ .befehlsblock .befehlsblock-kopieren' },
    { label: 'Terminal („kommt“) per Enter ausgelöst (Playwright klickt aria-disabled nicht): keine Wirkung, Ansicht bleibt', fokus: '#shell-kopf .kopf-werkzeug.kommt-knopf', taste: 'Enter' },
    { label: 'GitHub („kommt“) per Leertaste: keine Wirkung, Ansicht bleibt', fokus: '#shell-kopf .kopf-werkzeug.kommt-knopf:last-child', taste: ' ' },
    {
      label: 'Projektwechsel auf „Zweites Projekt“ (relativer repo_pfad): VS Code ohne href, aria-disabled',
      anfragenAntworten: verlauf(LEER, LEER),
      auswaehlen: { selector: '#kopf-projekt-auswahl', wert: 'zweites-projekt' },
      ...warte('#shell-kopf [data-werkzeug-vscode][aria-disabled="true"]', 8000, 'attached'),
      screenshot: 'k03-vscode-ohne-ordner.webp',
    },
  ],
})

// ─── Klicktabelle: stiller Punkt ───────────────────────────────────────────
const laufDetail = (id, json) => get(`**/laeufe/${id}`, json)
folgen['klicks-punkt'] = folge({
  url: '#/workboard',
  modus: 'jarvis',
  beobachtete: KOPF_BEOBACHTUNG,
  antworten: [...verlauf(LEER, LEER), post('**/chat', 202, { laufId: LAUF_ID }), laufDetail(LAUF_ID, { aktiv: true, fortschritt: null })],
  schritte: [
    { label: 'Start: Workboard, Dock zu, kein Punkt', ...warte('#chat-blase') },
    { label: 'Blase öffnet, Nachricht senden (POST fest 202): Lauf läuft', klick: '#chat-blase' },
    { label: 'Senden', tippen: { selector: '#chat-eingabe', text: 'Wo steht die Anmeldung?' }, klick: '#chat-senden', ...warte('.chat-tippindikator') },
    { label: '„×“: Dock zu, Lauf läuft weiter, noch kein Punkt', klick: '#chat-schliessen' },
    {
      label: 'Antwort trifft ein (Detail fest ERFOLGREICH, Verlauf mit Antwort): stiller Punkt an Blase und Kopfknopf, aria-label „Frag Jarvis, neue Antwort“',
      anfragenAntworten: [laufDetail(LAUF_ID, { aktiv: false, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }), get('**/chat', JARVIS_BEFEHLE)],
      ...warte('.chat-blase.hat-neue-antwort'),
      screenshot: 'k04-punkt.webp',
    },
    { label: 'Blase öffnet: Punkt weg, aria-label entfernt, Antwort sichtbar', klick: '#chat-blase', ...warte('#shell-chat-spalte .befehlsblock'), screenshot: 'k05-punkt-weg.webp' },
  ],
})

// ─── Klicktabelle: „Gespräch verkleinern“ nach dem Coach-Interview ─────────
const ANGELEGT = { projekt: { id: 'neues-produkt', name: 'Neues Produkt', repo_pfad: 'C:\\Projekte\\neues-produkt' }, naechste_schritte: { hinweis: 'Nachweis: fest beantwortet.', git: ['git init'] } }
folgen['klicks-verkleinern'] = folge({
  url: '#/projekte-uebersicht/neu',
  modus: 'jarvis',
  beobachtete: KOPF_BEOBACHTUNG,
  antworten: [...verlauf(LEER, LEER), post('**/api/projekte', 201, ANGELEGT)],
  schritte: [
    { label: 'Start: Anlegeseite #/projekte-uebersicht/neu', tippen: { selector: '#projekte-anlegen-name', text: 'Neues Produkt' }, ...warte('#projekte-anlegen-absenden') },
    { label: 'Anlegen (POST fest 201): Erfolg mit „Zum Coach-Interview“', klick: '#projekte-anlegen-absenden', ...warte('#projekte-anlegen-coach') },
    { label: '„Zum Coach-Interview“: #/chat, Product Coach, Untermodus Projekt', klick: '#projekte-anlegen-coach', ...warte('.chat-grossansicht #chat-seitentitel') },
    { label: '„Gespräch verkleinern“: #/projekte-uebersicht (Produktliste, nicht das leere Anlegeformular), Dock offen', klick: '#chat-verkleinern', ...warte('#shell-chat-spalte:not(.chat-grossansicht)'), screenshot: 'k06-verkleinert-produktliste.webp' },
  ],
})

// ─── Klicktabelle: „What needs me?“ (en) → lokale Antwort ohne Lauf ────────
folgen['klicks-vorfilter-en'] = folge({
  modus: 'jarvis',
  sprache: 'en',
  beobachtete: KOPF_BEOBACHTUNG,
  antworten: [...verlauf(LEER, LEER), get('**/workitems*', { workitems: [{ id: 'f-1', prioritaet: 'P1' }], befunde: [], fehler: [] })],
  schritte: [
    { label: 'Jarvis leer (en)', ...warte('#chat-leer-jarvis') },
    { label: 'Vorschlag „What needs me?“ füllt die Eingabe', klick: '[data-vorschlag="chat.vorschlag.braucht"]' },
    { label: 'Senden: lokale Antwort „Jarvis (answered locally)“, kein Lauf (POST /chat wäre fest 500 → Fehler)', klick: '#chat-senden', ...warte('.chat-bubble-reihe-nutzer'), screenshot: 'k07-vorfilter-en.webp' },
  ],
})

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
