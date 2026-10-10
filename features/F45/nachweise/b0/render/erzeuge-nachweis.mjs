/**
 * Datei: features/F45/nachweise/b0/render/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweis F45 B0 (Muster features/F46/nachweise/f986/erzeuge-nachweis.mjs) — alles mit
 * festen Antworten, kein Modell-Lauf:
 * - fehler-eintrag: ein vom Server geschriebener Fehler-Eintrag (istFehler, Zeitgrenze) erscheint als
 *   „Lauf nicht erfolgreich“ mit Grund, data-eintrag-art="fehler", ohne Auftrag-Brücke; 1440 dunkel, 390, ru.
 * - nicht-erfolgreich: Senden → Lauf endet FEHLGESCHLAGEN → der Chat lädt den Server-Eintrag nach und
 *   zeigt ihn genau einmal (keine zweite, lokale Fehlanzeige).
 * - start-hinweis: Band oben und Hinweis über dem Eingabefeld (Leitstand aus falschem Ordner, E-188);
 *   Senden bleibt möglich; 1440 dunkel und hell, ru.
 * - reiter-punkt: Jarvis-Lauf läuft, Wechsel zum Product Coach, die Antwort kommt → Punkt am Reiter
 *   „Jarvis“ (aria-label), der Punkt verschwindet beim Wechsel zurück.
 * - neuladen: Neuladen während eines laufenden Jarvis-Laufs → der Chat übernimmt ihn aus aktiverLauf
 *   (Nachricht aus dem Auftrag, Tipp-Punkte, „Lauf abbrechen“, Sperrgrund) und zeigt danach das Ergebnis.
 * - untermodus: Coach-Lauf im Untermodus Projekt, Wechsel auf Feature → die Lauf-Blase bleibt mit dem
 *   Hinweis „Lauf im Untermodus Projekt läuft“, gesperrtes Senden nennt seinen Grund.
 * Vor dem Lauf leert das Skript die Ausgabeordner GENAU der Folgen, die es neu erzeugt — nie etwas anderes.
 *
 * Wird aufgerufen von: Hand, gegen einen laufenden Leitstand aus dem Hauptordner —
 *   LEITSTAND_PORT=4199 node scripts/leitstand-server.mjs
 *   node features/F45/nachweise/b0/render/erzeuge-nachweis.mjs [basis] [nurOrdner]
 * Nicht Teil von `npm run check`.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const basis = process.argv[2] ?? 'http://127.0.0.1:4199'
const nur = process.argv[3]
/** Ausgabe neben diesem Skript, Repo-Wurzel fünf Ebenen darüber — unabhängig vom Aufrufverzeichnis. */
const ziel = dirname(fileURLToPath(import.meta.url))
const wurzel = resolve(ziel, '../../../../..')

const JARVIS_LAUF = 'jarvis-jarvis-chat-0f450b00-0000-4000-8000-000000000b01'
const COACH_LAUF = 'product-coach-product-coach-sparring-0f450b00-0000-4000-8000-000000000b02'
const START_HINWEIS = { art: 'falscherOrdner', istPfad: 'C:\\Users\\stefa\\Projekte\\aiw-main-ansicht', sollPfad: 'C:\\Users\\stefa\\Projekte\\ai-workforce' }
const PROJEKTE = { projekte: [{ id: 'ai-workforce', name: 'AI Workforce', repo_pfad: 'C:/Projekte/ai-workforce', status: 'IN_ENTWICKLUNG', laufAktiv: false }] }
const ROADMAP = { status: 'ok', vision: 'Eine ruhige Kommandozentrale für die Zusammenarbeit mit KI.', meilensteine: [] }

/** Poll-Aggregat (Form wie GET /api/zustand). */
const zustand = ({ aktiverLauf = { aktiv: false, laufId: null }, startHinweis = null } = {}) => ({ laeufe: [], startfehler: [], workflows: [], fehler: [], aktiverLauf, pruefbefehl: null, istAiWorkforce: true, startHinweis })

/** Lauf-Detail (Form wie GET /api/laeufe/<id>). */
const detail = (laufId, { aktiv, ergebnis = null, auftragstext = null }) => ({
  laufId,
  checkpoints: [],
  laufStatus: aktiv ? { status: 'KLAERUNG_ERFORDERLICH', blockerId: 'x', grund: 'RUN_PREPARED ohne Terminalartefakt' } : { status: 'ABGESCHLOSSEN', ergebnis, terminalSequenz: 3, runPreparedSequenz: 1, terminaleOhneRunPrepared: [] },
  aktiv,
  fortschritt: aktiv ? { werkzeug: 'Read', ziel: 'C:\\Users\\stefa\\Projekte\\ai-workforce\\docs\\STATUS.md' } : null,
  aktivitaet: null,
  verweigertDaten: null,
  nichtGestartet: null,
  startvorlageZeitgrenzeMs: null,
  laufZeitgrenzeMs: laufId.startsWith('jarvis-') ? 180000 : 300000,
  kontextpaket: { status: 'nicht_vorhanden' },
  auftrag: auftragstext === null ? { status: 'kein_auftragsbezug' } : { status: 'ok', auftragId: 'x', titel: 'Jarvis-Chat', auftragstext },
  laufakte: { status: 'nicht_vorhanden' },
  rohstrom: { status: 'laufakte_fehlt' },
  scoutErgebnis: { status: 'nicht_vorhanden' },
})

const ANTWORT = { laufId: 'jarvis-alt-1', nachricht: 'Wo steht mein Projekt?', jarvisAntwort: { art: 'antwort', antwort: 'F45 B0 ist in Arbeit.' }, istZusammenfassung: false, istFehler: false, fehler: null }
/** Server-Fehler-Eintrag (Form wie GET /api/chat nach schreibeRollenChatFehlerEintrag). */
const fehlerEintrag = (laufId, nachricht, fehler, text) => ({ laufId, nachricht, jarvisAntwort: { art: 'antwort', antwort: text }, istZusammenfassung: false, istFehler: true, fehler })
const ZEITGRENZE = fehlerEintrag('jarvis-alt-2', 'Fasse bitte alle Findings zusammen.', { art: 'zeitgrenze', grund: null, zeitgrenzeMs: 180000 }, 'Lauf an der Zeitgrenze (180 s) beendet — keine Antwort.')

const BEOBACHTUNG = {
  texte: [
    { name: 'lang', selector: 'html', attribut: 'lang' },
    { name: 'Letzte Antwort-Blase', selector: '#chat-verlauf .chat-bubble-reihe-jarvis:last-of-type .chat-bubble' },
    { name: 'Band oben', selector: '#start-hinweis' },
    { name: 'Hinweis im Chat', selector: '#chat-start-hinweis' },
    { name: 'Sperrgrund', selector: '#chat-sperrgrund' },
    { name: 'Reiter Jarvis aria-label', selector: '#chat-modus-jarvis-btn', attribut: 'aria-label' },
    { name: 'Senden disabled', selector: '#chat-senden', attribut: 'disabled' },
  ],
  sichtbarkeit: [
    { name: 'Band oben sichtbar', id: 'start-hinweis' },
    { name: 'Hinweis im Chat sichtbar', id: 'chat-start-hinweis' },
    { name: 'Sperrgrund sichtbar', id: 'chat-sperrgrund' },
    { name: '„Lauf abbrechen“', id: 'chat-abbrechen-btn' },
  ],
  vorhanden: [
    { name: 'Fehler-Eintrag', selector: '#chat-verlauf [data-eintrag-art="fehler"]' },
    { name: 'zwei Fehler-Einträge (darf nicht)', selector: '#chat-verlauf [data-eintrag-art="fehler"] ~ [data-eintrag-art="fehler"]' },
    { name: 'Tipp-Punkte', selector: '#chat-verlauf .chat-tippindikator' },
    { name: 'Punkt am Reiter Jarvis', selector: '#chat-modus-jarvis-btn.hat-neue-antwort' },
    { name: 'Punkt am Untermodus Projekt', selector: '#chat-untermodus-projekt-btn.hat-neue-antwort' },
    { name: 'Untermodus-Hinweis', selector: '#chat-verlauf .chat-untermodus-hinweis' },
    { name: 'Auftrag-Brücke an Fehler (darf nicht)', selector: '[data-eintrag-art="fehler"] .chat-auftrag-oeffnen-btn' },
    { name: 'aria-live außer Persona (darf nicht)', selector: '[aria-live]:not(#persona-text-status)' },
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
 * @param optionen - sprache, farbschema, breite, modus, untermodus, antworten, schritte
 * @returns Klickfolge
 */
function folge({ sprache, farbschema = 'dark', breite = 1440, modus = 'jarvis', untermodus = 'feature', zoom, reduzierteBewegung, antworten, schritte }) {
  return {
    ...(zoom ? { zoom } : {}),
    ...(reduzierteBewegung ? { reduzierteBewegung: true } : {}),
    url: `${basis}/#/dashboard`,
    viewport: { breite, hoehe: breite < 600 ? 844 : 900 },
    farbschema,
    screenshotQualitaet: 0.8,
    localStorageSetzen: { 'leitstand-chat-offen': 'true', 'leitstand-chat-modus': modus, 'leitstand-chat-sparring-untermodus': untermodus, ...(sprache ? { 'leitstand-sprache': sprache } : {}) },
    anfragenAntworten: antworten,
    beobachtete: BEOBACHTUNG,
    schritte,
  }
}

const fehlerEintragFolge = (opt) =>
  folge({
    ...opt,
    antworten: grundAntworten(zustand(), [ANTWORT, ZEITGRENZE]),
    schritte: [{ label: 'Verlauf mit einem Server-Fehler-Eintrag (Zeitgrenze 180 s): „Lauf nicht erfolgreich“, Grund, keine Auftrag-Brücke', warteAufSelector: { selector: '#chat-verlauf [data-eintrag-art="fehler"]', timeoutMs: 8000 }, screenshot: '01-fehler-eintrag.webp' }],
  })

const startHinweisFolge = (opt) =>
  folge({
    ...opt,
    antworten: grundAntworten(zustand({ startHinweis: START_HINWEIS }), [ANTWORT]),
    schritte: [{ label: 'Leitstand aus falschem Ordner: Band oben und Hinweis über dem Eingabefeld, Senden möglich', warteAufSelector: { selector: '#chat-start-hinweis', timeoutMs: 8000 }, screenshot: '01-start-hinweis.webp', screenshotVollseite: false }],
  })

const folgen = {
  'fehler-eintrag-dunkel-1440': fehlerEintragFolge({}),
  'fehler-eintrag-dunkel-390': fehlerEintragFolge({ breite: 390 }),
  'fehler-eintrag-ru-1440': fehlerEintragFolge({ sprache: 'ru' }),
  'nicht-erfolgreich-einmal': folge({
    antworten: [...grundAntworten(zustand(), [ANTWORT]), antwort('**/chat', 'POST', { laufId: JARVIS_LAUF, auftragId: 'x' }, 202), antwort(`**/laeufe/${JARVIS_LAUF}`, 'GET', detail(JARVIS_LAUF, { aktiv: true }))],
    schritte: [
      { label: 'Senden → 202, Lauf aktiv (Tipp-Punkte, Sperrgrund)', tippen: { selector: '#chat-eingabe', text: 'Nenne das nächste Arbeitspaket.' }, klick: '#chat-senden', warteAufSelector: { selector: '#chat-verlauf .chat-tippindikator', timeoutMs: 5000 }, screenshot: '01-laeuft.webp' },
      {
        label: 'Lauf endet FEHLGESCHLAGEN, der Server hat den Fehler-Eintrag geschrieben → genau ein Fehler-Eintrag, keine lokale Doppelung',
        anfragenAntworten: [antwort(`**/laeufe/${JARVIS_LAUF}`, 'GET', detail(JARVIS_LAUF, { aktiv: false, ergebnis: 'FEHLGESCHLAGEN' })), antwort('**/chat', 'GET', { verlauf: [ANTWORT, fehlerEintrag(JARVIS_LAUF, 'Nenne das nächste Arbeitspaket.', { art: 'nicht_erfolgreich', grund: 'beobachtungsbasis_unvollstaendig' }, 'Lauf nicht erfolgreich: beobachtungsbasis_unvollstaendig')] })],
        warteAufSelector: { selector: '#chat-verlauf [data-eintrag-art="fehler"]', timeoutMs: 8000 },
        screenshot: '02-fehler-einmal.webp',
      },
    ],
  }),
  'start-hinweis-dunkel-1440': startHinweisFolge({}),
  'start-hinweis-hell-1440': startHinweisFolge({ farbschema: 'light' }),
  'start-hinweis-ru-1440': startHinweisFolge({ sprache: 'ru' }),
  // Prüfpass design (11): Band bei 390 px, 200 % Zoom mit langen Pfaden (de, ru), reduzierte Bewegung, hell.
  'start-hinweis-dunkel-390': startHinweisFolge({ breite: 390 }),
  'start-hinweis-zoom200-de': startHinweisFolge({ zoom: 2 }),
  'start-hinweis-zoom200-ru': startHinweisFolge({ zoom: 2, sprache: 'ru' }),
  'start-hinweis-reduzierte-bewegung': startHinweisFolge({ reduzierteBewegung: true }),
  'fehler-eintrag-hell-1440': fehlerEintragFolge({ farbschema: 'light' }),
  'reiter-punkt': folge({
    antworten: [...grundAntworten(zustand(), [ANTWORT]), antwort('**/chat', 'POST', { laufId: JARVIS_LAUF, auftragId: 'x' }, 202), antwort(`**/laeufe/${JARVIS_LAUF}`, 'GET', detail(JARVIS_LAUF, { aktiv: true }))],
    schritte: [
      { label: 'Jarvis: senden, Lauf läuft', tippen: { selector: '#chat-eingabe', text: 'Was ist der Stand von F45?' }, klick: '#chat-senden', warteAufSelector: { selector: '#chat-verlauf .chat-tippindikator', timeoutMs: 5000 } },
      { label: 'Wechsel zum Reiter Product Coach', klick: '#chat-modus-sparring-btn' },
      {
        label: 'Jarvis-Antwort kommt im Hintergrund → Punkt am Reiter „Jarvis“ (aria-label nennt die neue Antwort)',
        anfragenAntworten: [antwort(`**/laeufe/${JARVIS_LAUF}`, 'GET', detail(JARVIS_LAUF, { aktiv: false, ergebnis: 'ERFOLGREICH' })), antwort('**/chat', 'GET', { verlauf: [ANTWORT, { laufId: JARVIS_LAUF, nachricht: 'Was ist der Stand von F45?', jarvisAntwort: { art: 'antwort', antwort: 'B0 ist im Bau.' }, istZusammenfassung: false, istFehler: false, fehler: null }] })],
        warteAufSelector: { selector: '#chat-modus-jarvis-btn.hat-neue-antwort', timeoutMs: 8000 },
        screenshot: '01-punkt-am-reiter.webp',
      },
      { label: 'Zurück zu Jarvis: Antwort sichtbar, Punkt weg', klick: '#chat-modus-jarvis-btn', screenshot: '02-punkt-weg.webp' },
    ],
  }),
  neuladen: folge({
    antworten: [...grundAntworten(zustand({ aktiverLauf: { aktiv: true, laufId: JARVIS_LAUF } }), [ANTWORT]), antwort(`**/laeufe/${JARVIS_LAUF}`, 'GET', detail(JARVIS_LAUF, { aktiv: true, auftragstext: 'Welche Findings sind für B0 offen?' }))],
    schritte: [
      { label: 'Seite (neu) geladen, während ein Jarvis-Lauf läuft → übernommen: Nachricht aus dem Auftrag, Tipp-Punkte, „Lauf abbrechen“, Sperrgrund', reload: true, warteAufSelector: { selector: '#chat-verlauf .chat-tippindikator', timeoutMs: 8000 }, screenshot: '01-uebernommen.webp' },
      {
        label: 'Lauf endet ERFOLGREICH → Ergebnis im Reiter Jarvis, Senden frei',
        anfragenAntworten: [
          antwort('**/api/zustand', 'GET', zustand()),
          antwort(`**/laeufe/${JARVIS_LAUF}`, 'GET', detail(JARVIS_LAUF, { aktiv: false, ergebnis: 'ERFOLGREICH', auftragstext: 'Welche Findings sind für B0 offen?' })),
          antwort('**/chat', 'GET', { verlauf: [ANTWORT, { laufId: JARVIS_LAUF, nachricht: 'Welche Findings sind für B0 offen?', jarvisAntwort: { art: 'antwort', antwort: 'F-987, F-986 a, F-971, F-544, F-1007, F-1008.' }, istZusammenfassung: false, istFehler: false, fehler: null }] }),
        ],
        warteAufSelector: { selector: '#chat-verlauf .chat-tippindikator', zustand: 'detached', timeoutMs: 8000 },
        screenshot: '02-ergebnis.webp',
      },
    ],
  }),
  untermodus: folge({
    modus: 'sparring',
    untermodus: 'projekt',
    antworten: [...grundAntworten(zustand(), [], []), antwort('**/sparring', 'POST', { laufId: COACH_LAUF, auftragId: 'x' }, 202), antwort(`**/laeufe/${COACH_LAUF}`, 'GET', detail(COACH_LAUF, { aktiv: true }))],
    schritte: [
      { label: 'Coach im Untermodus Projekt: senden, Lauf läuft', tippen: { selector: '#chat-eingabe', text: 'Ein Haushaltsbuch für zwei Personen.' }, klick: '#chat-senden', warteAufSelector: { selector: '#chat-verlauf .chat-tippindikator', timeoutMs: 5000 } },
      { label: 'Wechsel auf Untermodus Feature → Lauf-Blase bleibt mit Hinweis, Sperrgrund nennt den Untermodus', klick: '#chat-untermodus-feature-btn', screenshot: '01-anderer-untermodus.webp' },
      {
        label: 'Lauf endet im Untermodus Projekt, angezeigt ist Feature → Punkt am Knopf „Projekt“ (Prüfpass qa 3)',
        anfragenAntworten: [
          antwort(`**/laeufe/${COACH_LAUF}`, 'GET', detail(COACH_LAUF, { aktiv: false, ergebnis: 'ERFOLGREICH' })),
          antwort('**/sparring', 'GET', { verlauf: [{ laufId: COACH_LAUF, nachricht: 'Ein Haushaltsbuch für zwei Personen.', coachAntwort: { art: 'frage', antwort: 'Wer trägt die Ausgaben ein?' }, modus: 'projekt', auftragErstelltId: null, istFehler: false, fehler: null }] }),
        ],
        warteAufSelector: { selector: '#chat-untermodus-projekt-btn.hat-neue-antwort', timeoutMs: 8000 },
        screenshot: '02-punkt-am-untermodus.webp',
      },
    ],
  }),
}

// Prüfpass design (11): Reiter-Punkt und Sperrgrund auch hell.
folgen['reiter-punkt-hell-1440'] = { ...folgen['reiter-punkt'], farbschema: 'light' }

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
