/**
 * Datei: features/F45/nachweise/p/render/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweis F45 P Teil 3 (F-1016 c, d; Muster features/F45/nachweise/b0/render/erzeuge-nachweis.mjs) —
 * alles mit festen Antworten, kein Modell-Lauf:
 * - fehler-grund-<sprache>: Verlauf mit Fehler-Einträgen — nie gestartet (Code startfreigabe_abgelehnt plus deutscher
 *   Klartext), verweigert (Code werkzeuggrenze_abgelehnt, Art des Modells im Grund), ein älterer Eintrag ohne Code mit
 *   Grund in Code-Form, ein unbekannter Code, eine Klärung nur mit Klartext. Deutsch zeigt den Klartext, en/tr/ru nur
 *   übersetzte Codes bzw. den Verweis auf das Lauf-Detail — nie deutschen Fließtext.
 * - sperre-anderer-lauf-<…>: /api/zustand meldet einen Baulauf → Senden und Zusammenfassen gesperrt mit Grund; endet
 *   er, wird Senden wieder frei.
 * - sperre-anderer-reiter-<…>: Jarvis-Lauf läuft, Wechsel zum Product Coach → Senden gesperrt mit Grund „Reiter Jarvis“.
 * - senden-409-lauf-aktiv(-en): Senden trifft auf 409 (anderer Lauf, D13) → übersetzte Meldung statt Rohtext.
 * - zusammenfassen-409: 409 mit code kein_verlauf → „Noch kein Verlauf zum Zusammenfassen.“, nicht „anderer Lauf“.
 * Das Skript schreibt nur in eigene Unterordner (Dateien werden überschrieben, nichts gelöscht).
 *
 * Wird aufgerufen von: Hand, gegen einen laufenden Leitstand aus dem Hauptordner —
 *   LEITSTAND_PORT=4199 node scripts/leitstand-server.mjs
 *   node features/F45/nachweise/p/render/erzeuge-nachweis.mjs [basis] [nurOrdner]
 * Nicht Teil von `npm run check`.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const basis = process.argv[2] ?? 'http://127.0.0.1:4199'
const nur = process.argv[3]
/** Ausgabe neben diesem Skript, Repo-Wurzel fünf Ebenen darüber — unabhängig vom Aufrufverzeichnis. */
const ziel = dirname(fileURLToPath(import.meta.url))
const wurzel = resolve(ziel, '../../../../..')

const JARVIS_LAUF = 'jarvis-jarvis-chat-0f450p00-0000-4000-8000-000000000p01'
const BAULAUF = 'ausfuehrung-0f450p00-0000-4000-8000-000000000p02'
const PROJEKTE = { projekte: [{ id: 'ai-workforce', name: 'AI Workforce', repo_pfad: 'C:/Projekte/ai-workforce', status: 'IN_ENTWICKLUNG', laufAktiv: false }] }
const ROADMAP = { status: 'ok', vision: 'Eine ruhige Kommandozentrale für die Zusammenarbeit mit KI.', meilensteine: [] }

/** Poll-Aggregat (Form wie GET /api/zustand). */
const zustand = (aktiverLauf = { aktiv: false, laufId: null }) => ({ laeufe: [], startfehler: [], workflows: [], fehler: [], aktiverLauf, pruefbefehl: null, istAiWorkforce: true, startHinweis: null })

/** Lauf-Detail (Form wie GET /api/laeufe/<id>), nur das, was der Chat liest. */
const detail = (laufId, aktiv) => ({
  laufId,
  checkpoints: [],
  laufStatus: aktiv ? { status: 'KLAERUNG_ERFORDERLICH', blockerId: 'x', grund: 'RUN_PREPARED ohne Terminalartefakt' } : { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH', terminalSequenz: 3, runPreparedSequenz: 1, terminaleOhneRunPrepared: [] },
  aktiv,
  fortschritt: null,
  aktivitaet: null,
  verweigertDaten: null,
  nichtGestartet: null,
  startvorlageZeitgrenzeMs: null,
  laufZeitgrenzeMs: 180000,
  kontextpaket: { status: 'nicht_vorhanden' },
  auftrag: { status: 'kein_auftragsbezug' },
  laufakte: { status: 'nicht_vorhanden' },
  rohstrom: { status: 'laufakte_fehlt' },
  scoutErgebnis: { status: 'nicht_vorhanden' },
})

const ANTWORT = { laufId: 'jarvis-alt-1', nachricht: 'Wo steht mein Projekt?', jarvisAntwort: { art: 'antwort', antwort: 'F45 P ist im Bau.' }, istZusammenfassung: false, istFehler: false, fehler: null }
/** Server-Fehler-Eintrag (Form wie GET /api/chat nach schreibeRollenChatFehlerEintrag). */
const fehlerEintrag = (laufId, nachricht, fehler) => ({ laufId, nachricht, jarvisAntwort: { art: 'antwort', antwort: 'Lauf nicht erfolgreich (deutscher Rückfalltext des Servers)' }, istZusammenfassung: false, istFehler: true, fehler })
const FEHLER_EINTRAEGE = [
  ANTWORT,
  fehlerEintrag('jarvis-alt-2', 'Starte bitte den Lauf.', { art: 'nicht_gestartet', grund: 'F6a-Ablehnung: Arbeitsverzeichnis weicht vom Wirksamkeitsnachweis ab (E-188)', code: 'startfreigabe_abgelehnt' }),
  fehlerEintrag('jarvis-alt-3', 'Lies bitte die Datei.', { art: 'verweigert', grund: 'permission_denied', code: 'werkzeuggrenze_abgelehnt' }),
  fehlerEintrag('jarvis-alt-4', 'Älterer Eintrag (F45 B0, ohne Code).', { art: 'nicht_erfolgreich', grund: 'beobachtungsbasis_unvollstaendig' }),
  fehlerEintrag('jarvis-alt-5', 'Eintrag mit neuem, unbekanntem Code.', { art: 'nicht_erfolgreich', grund: 'neuer_grund', code: 'neuer_grund' }),
  fehlerEintrag('jarvis-alt-6', 'Lauf hält.', { art: 'klaerung', grund: 'RUN_PREPARED ohne Terminalartefakt', code: null }),
]

const BEOBACHTUNG = {
  texte: [
    { name: 'lang', selector: 'html', attribut: 'lang' },
    { name: 'Sperrgrund', selector: '#chat-sperrgrund' },
    { name: 'Senden disabled', selector: '#chat-senden', attribut: 'disabled' },
    { name: 'Senden title', selector: '#chat-senden', attribut: 'title' },
    { name: 'Zusammenfassen disabled', selector: '#chat-zusammenfassen-btn', attribut: 'disabled' },
    { name: 'Fehlerzeile', selector: '#chat-fehler' },
    { name: 'Letzter Fehler-Eintrag', selector: '#chat-verlauf [data-eintrag-art="fehler"]:last-of-type .chat-bubble' },
  ],
  sichtbarkeit: [
    { name: 'Sperrgrund sichtbar', id: 'chat-sperrgrund' },
    { name: 'Fehlerzeile sichtbar', id: 'chat-fehler' },
  ],
  vorhanden: [
    { name: 'Fehler-Eintrag', selector: '#chat-verlauf [data-eintrag-art="fehler"]' },
    { name: 'Tipp-Punkte', selector: '#chat-verlauf .chat-tippindikator' },
  ],
}

const antwort = (muster, methode, json, status = 200) => ({ muster, methode, status, json })
const grundAntworten = (zustandWert, chatVerlauf, sparringVerlauf = []) => [
  antwort('**/api/zustand', 'GET', zustandWert),
  antwort('**/api/roadmap', 'GET', ROADMAP),
  antwort('**/api/projekte', 'GET', PROJEKTE),
  antwort('**/chat', 'GET', { verlauf: chatVerlauf }),
  antwort('**/sparring', 'GET', { verlauf: sparringVerlauf }),
]

/**
 * Gemeinsamer Rahmen einer Folge.
 * @param optionen - sprache, farbschema, breite, modus, antworten, schritte
 * @returns Klickfolge
 */
function folge({ sprache, farbschema = 'dark', breite = 1440, modus = 'jarvis', antworten, schritte }) {
  return {
    url: `${basis}/#/chat`,
    viewport: { breite, hoehe: breite < 600 ? 844 : 900 },
    farbschema,
    screenshotQualitaet: 0.8,
    localStorageSetzen: { 'leitstand-chat-offen': 'true', 'leitstand-chat-modus': modus, ...(sprache ? { 'leitstand-sprache': sprache } : {}) },
    anfragenAntworten: antworten,
    beobachtete: BEOBACHTUNG,
    schritte,
  }
}

const fehlerGrundFolge = (opt) =>
  folge({
    ...opt,
    antworten: grundAntworten(zustand(), FEHLER_EINTRAEGE),
    schritte: [{ label: 'Fehler-Einträge mit Grund-Code: nie gestartet, verweigert, älterer Eintrag ohne Code, unbekannter Code, Klärung nur mit Klartext', warteAufSelector: { selector: '#chat-verlauf [data-eintrag-art="fehler"]', timeoutMs: 8000 }, screenshot: '01-fehler-gruende.webp' },
      { label: 'Ganzen Verlauf öffnen: alle Grund-Arten sichtbar', klick: '#chat-ganzen-verlauf-link', screenshot: '02-ganzer-verlauf.webp', screenshotVollseite: true },
    ],
  })

const andererLaufFolge = (opt) =>
  folge({
    ...opt,
    antworten: grundAntworten(zustand({ aktiv: true, laufId: BAULAUF }), [ANTWORT]),
    schritte: [
      { label: 'Ein Baulauf ist aktiv (aktiverLauf) → Senden und Zusammenfassen gesperrt, Sperrgrund „anderer Lauf“', warteAufSelector: { selector: '#chat-sperrgrund:not([hidden])', timeoutMs: 8000 }, screenshot: '01-gesperrt.webp' },
      { label: 'Der Baulauf endet → Senden wieder frei, Sperrgrund weg', anfragenAntworten: [antwort('**/api/zustand', 'GET', zustand())], warteAufSelector: { selector: '#chat-sperrgrund[hidden]', zustand: 'attached', timeoutMs: 8000 }, screenshot: '02-frei.webp' },
    ],
  })

const andererReiterFolge = (opt) =>
  folge({
    ...opt,
    antworten: [...grundAntworten(zustand(), [ANTWORT]), antwort('**/chat', 'POST', { laufId: JARVIS_LAUF, auftragId: 'x' }, 202), antwort(`**/laeufe/${JARVIS_LAUF}`, 'GET', detail(JARVIS_LAUF, true))],
    schritte: [
      { label: 'Jarvis: senden, Lauf läuft', tippen: { selector: '#chat-eingabe', text: 'Was ist der Stand von F45?' }, klick: '#chat-senden', warteAufSelector: { selector: '#chat-verlauf .chat-tippindikator', timeoutMs: 5000 } },
      { label: 'Wechsel zum Reiter Product Coach → Senden gesperrt, Sperrgrund nennt den Reiter Jarvis (ohne auf den Poll zu warten)', klick: '#chat-modus-sparring-btn', screenshot: '01-anderer-reiter.webp' },
    ],
  })

const folgen = {
  'fehler-grund-de-1440': fehlerGrundFolge({}),
  'fehler-grund-en-1440': fehlerGrundFolge({ sprache: 'en' }),
  'fehler-grund-tr-390': fehlerGrundFolge({ sprache: 'tr', breite: 390 }),
  'fehler-grund-ru-390': fehlerGrundFolge({ sprache: 'ru', breite: 390 }),
  'sperre-anderer-lauf-de-1440': andererLaufFolge({}),
  'sperre-anderer-lauf-en-1440-hell': andererLaufFolge({ sprache: 'en', farbschema: 'light' }),
  'sperre-anderer-lauf-ru-390': andererLaufFolge({ sprache: 'ru', breite: 390 }),
  'sperre-anderer-reiter-de-1440': andererReiterFolge({}),
  'sperre-anderer-reiter-tr-390': andererReiterFolge({ sprache: 'tr', breite: 390 }),
  'senden-409-lauf-aktiv': folge({
    antworten: [...grundAntworten(zustand(), [ANTWORT]), antwort('**/chat', 'POST', { grund: 'ein anderer, projektübergreifend gestarteter Lauf ist noch aktiv (D13)' }, 409)],
    schritte: [{ label: 'Senden, bevor der Poll den anderen Lauf zeigt → 409 → übersetzte Meldung „Ein anderer Lauf ist aktiv …“ statt Rohtext', tippen: { selector: '#chat-eingabe', text: 'Wie ist der Stand?' }, klick: '#chat-senden', warteAufSelector: { selector: '#chat-fehler:not([hidden])', timeoutMs: 5000 }, screenshot: '01-lauf-aktiv.webp' }],
  }),
  'senden-409-lauf-aktiv-en': folge({
    sprache: 'en',
    antworten: [...grundAntworten(zustand(), [ANTWORT]), antwort('**/chat', 'POST', { grund: 'ein anderer, projektübergreifend gestarteter Lauf ist noch aktiv (D13)' }, 409)],
    schritte: [{ label: 'wie oben, englisch — kein deutscher Rohtext', tippen: { selector: '#chat-eingabe', text: 'What is the status?' }, klick: '#chat-senden', warteAufSelector: { selector: '#chat-fehler:not([hidden])', timeoutMs: 5000 }, screenshot: '01-lauf-aktiv.webp' }],
  }),
  'zusammenfassen-409': folge({
    antworten: [...grundAntworten(zustand(), [ANTWORT]), antwort('**/chat/zusammenfassen', 'POST', { grund: 'kein Verlauf zum Zusammenfassen', code: 'kein_verlauf' }, 409)],
    schritte: [{ label: 'Zusammenfassen → 409 kein_verlauf → „Noch kein Verlauf zum Zusammenfassen.“ (nicht „anderer Lauf“)', klick: '#chat-zusammenfassen-btn', warteAufSelector: { selector: '#chat-fehler:not([hidden])', timeoutMs: 5000 }, screenshot: '01-kein-verlauf.webp' }],
  }),
}

if (nur && !(nur in folgen)) throw new Error(`Unbekannte Folge: ${nur}`)
const auszufuehren = nur ? { [nur]: folgen[nur] } : folgen

for (const [ordner, klickfolge] of Object.entries(auszufuehren)) {
  const verzeichnis = join(ziel, ordner)
  mkdirSync(verzeichnis, { recursive: true })
  console.log(`\n── ${ordner} ──`)
  const datei = join(verzeichnis, 'klickfolge.json')
  writeFileSync(datei, `${JSON.stringify(klickfolge, null, 2)}\n`)
  execFileSync(process.execPath, [join(wurzel, 'scripts/render-nachweis.mjs'), datei, verzeichnis], { stdio: 'inherit', cwd: wurzel })
}
