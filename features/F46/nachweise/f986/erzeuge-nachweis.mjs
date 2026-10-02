/**
 * Datei: features/F46/nachweise/f986/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweis F-986 (b) — das Chat-Dock hört bei einem nie gestarteten Lauf auf zu warten
 * und zeigt „Lauf nicht gestartet: <Grund>“. Alles mit festen Antworten, kein Modell-Lauf:
 * POST …/chat → 202 mit laufId; GET …/laeufe/<laufId> → NICHT_GESTARTET mit terminaler Marke
 * ohne RUN_PREPARED und detail.nichtGestartet.grund (E-188, wie in der Diagnose real beobachtet).
 * Folgen: 1440 dunkel (de), 1440 dunkel ru, Escape-Fall (Grund mit HTML erscheint als Text), Startfehler
 * ohne Detail (GET …/laeufe/<laufId> 404, Startfehler-Eintrag im Poll — z. B. F5-Ablehnung).
 * Die Folgen laufen über scripts/render-nachweis.mjs (klickfolge.json je Unterordner), Screenshots als
 * WebP. Vor dem Lauf leert das Skript die Ausgabeordner GENAU der Folgen, die es neu erzeugt
 * (fs.rmSync) — nie etwas anderes.
 *
 * Wird aufgerufen von: Hand, gegen einen laufenden Leitstand dieses Worktrees —
 *   LEITSTAND_PORT=4199 node scripts/leitstand-server.mjs
 *   node features/F46/nachweise/f986/erzeuge-nachweis.mjs [basis] [nurOrdner]
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

const LAUF_ID = 'jarvis-jarvis-chat-0f986000-0000-4000-8000-000000000986'
const GRUND_E188 = "Drift im Gültigkeitsschlüssel: 'arbeitsverzeichnis_pfad' (E-188)"
const GRUND_HTML = '<img src=x onerror=alert(1)> Grund mit <b>HTML</b>'

const STARTFEHLER_F5 = { zeitstempel: '2026-10-02T15:01:22.000Z', laufId: LAUF_ID, fehler: 'F5-Ablehnung (unbekannte_rolle)' }
const ZUSTAND = { laeufe: [], startfehler: [], workflows: [], fehler: [], aktiverLauf: { aktiv: false, laufId: null }, pruefbefehl: null, istAiWorkforce: true }
const PROJEKTE = { projekte: [{ id: 'ai-workforce', name: 'AI Workforce', repo_pfad: 'C:/Projekte/ai-workforce', status: 'IN_ENTWICKLUNG', laufAktiv: false }] }
const ROADMAP = { status: 'ok', vision: 'Eine ruhige Kommandozentrale für die Zusammenarbeit mit KI.', meilensteine: [] }

/** Lauf-Detail eines verweigerten, nie gestarteten Laufs (Form wie GET /api/laeufe/<id>). */
const detail = (grund) => ({
  laufId: LAUF_ID,
  checkpoints: [{ sequenz: 1, zeitstempel: '2026-10-02T15:01:22.032Z', gueltig: true, typ: 'wirkungsmarke', wirkungsmarke: { art: 'terminal', ergebnis: 'VERWEIGERT' } }],
  laufStatus: { status: 'NICHT_GESTARTET', terminaleOhneRunPrepared: [1] },
  aktiv: false,
  fortschritt: null,
  verweigertDaten: null,
  nichtGestartet: { ergebnis: 'VERWEIGERT', grund },
  startvorlageZeitgrenzeMs: 1800000,
  kontextpaket: { status: 'nicht_vorhanden' },
  auftrag: { status: 'nicht_vorhanden' },
  laufakte: { status: 'nicht_vorhanden' },
  rohstrom: { status: 'laufakte_fehlt' },
  scoutErgebnis: { status: 'nicht_vorhanden' },
})

const BEOBACHTUNG = {
  texte: [
    { name: 'lang', selector: 'html', attribut: 'lang' },
    { name: 'Persona-Status (Live-Region)', selector: '#persona-text-status' },
    { name: 'Letzte Antwort im Verlauf', selector: '#chat-verlauf .chat-bubble-reihe-jarvis:last-of-type .chat-bubble-text' },
    { name: 'Eingabe disabled', selector: '#chat-eingabe', attribut: 'disabled' },
  ],
  sichtbarkeit: [
    { name: '„Lauf abbrechen“', id: 'chat-abbrechen-btn' },
    { name: 'Chat-Dock', id: 'shell-chat-spalte' },
  ],
  vorhanden: [
    { name: 'aria-live außer Persona (muss fehlen)', selector: '[aria-live]:not(#persona-text-status)' },
    { name: 'eingeschleustes <img src=x> im Verlauf (muss fehlen)', selector: '#chat-verlauf img[src="x"]' },
  ],
}

const antwort = (muster, methode, json, status = 200) => ({ muster, methode, status, json })

/**
 * Eine Folge: Dock offen, Nachricht senden, auf die Fehlanzeige warten.
 * @param optionen - sprache, grund, erwartet (Textanfang der Fehlanzeige in dieser Sprache), ohneDetail (404 + Startfehler)
 * @returns Klickfolge
 */
function folge({ sprache, grund, erwartet, ohneDetail = false }) {
  return {
    url: `${basis}/#/dashboard`,
    viewport: { breite: 1440, hoehe: 900 },
    farbschema: 'dark',
    screenshotQualitaet: 0.8,
    localStorageSetzen: { 'leitstand-chat-offen': 'true', 'leitstand-chat-modus': 'jarvis', ...(sprache ? { 'leitstand-sprache': sprache } : {}) },
    anfragenAntworten: [
      antwort('**/api/zustand', 'GET', ohneDetail ? { ...ZUSTAND, startfehler: [STARTFEHLER_F5] } : ZUSTAND),
      antwort('**/api/roadmap', 'GET', ROADMAP),
      antwort('**/api/projekte', 'GET', PROJEKTE),
      antwort('**/chat', 'GET', { verlauf: [] }),
      antwort('**/chat', 'POST', { laufId: LAUF_ID, auftragId: LAUF_ID.replace('jarvis-', '') }, 202),
      ohneDetail ? antwort(`**/laeufe/${LAUF_ID}`, 'GET', { grund: `Lauf '${LAUF_ID}' nicht gefunden` }, 404) : antwort(`**/laeufe/${LAUF_ID}`, 'GET', detail(grund)),
    ],
    beobachtete: BEOBACHTUNG,
    schritte: [
      { label: 'Start #/dashboard, Chat-Dock offen, leerer Verlauf', warteAufSelector: { selector: '#chat-eingabe', timeoutMs: 8000 }, screenshot: '01-dock-leer.webp' },
      { label: 'Nachricht senden → POST …/chat 202; das Lauf-Detail meldet NICHT_GESTARTET mit terminaler Marke (VERWEIGERT, E-188)', tippen: { selector: '#chat-eingabe', text: 'Kurzer Test: antworte bitte nur mit OK.' }, klick: '#chat-senden' },
      { label: `Fehlanzeige „${erwartet} …“ statt endloser Tipp-Punkte; „Lauf abbrechen“ verborgen, Eingabe frei, keine zweite Live-Region`, warteAufSelector: { selector: `#chat-verlauf .chat-bubble-text:has-text("${erwartet}")`, timeoutMs: 8000 }, screenshot: '02-lauf-nicht-gestartet.webp' },
    ],
  }
}

const folgen = {
  'dunkel-1440': folge({ grund: GRUND_E188, erwartet: 'Lauf nicht gestartet' }),
  'ru-1440': folge({ sprache: 'ru', grund: GRUND_E188, erwartet: 'Запуск не начат' }),
  'escape-grund': folge({ grund: GRUND_HTML, erwartet: 'Lauf nicht gestartet' }),
  'startfehler-ohne-detail': folge({ erwartet: 'Lauf nicht gestartet: F5-Ablehnung', ohneDetail: true }),
}

if (nur && !(nur in folgen)) throw new Error(`Unbekannte Folge: ${nur}`)
const auszufuehren = nur ? { [nur]: folgen[nur] } : folgen

for (const [ordner, klickfolge] of Object.entries(auszufuehren)) {
  const verzeichnis = join(ziel, ordner)
  rmSync(verzeichnis, { recursive: true, force: true })
  mkdirSync(verzeichnis, { recursive: true })
  console.log(`\n── ${ordner} ──`)
  const datei = join(verzeichnis, 'klickfolge.json')
  writeFileSync(datei, `${JSON.stringify(klickfolge, null, 2)}\n`)
  execFileSync(process.execPath, [join(wurzel, 'scripts/render-nachweis.mjs'), datei, verzeichnis], { stdio: 'inherit', cwd: wurzel })
}
