/**
 * Datei: features/F45/nachweise/b2b3b2b2a3/render/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweis F45 B2b-3b-2b-2a-3 „Rückfrage-Kanal: Abnahme“ gegen die Testinstanz
 * features/F45/nachweise/b2b3b2b2a3/instanz.mjs (Port 4408, neutrale Umgebung, Terminalmarken vom echten Evaluator). Fälle:
 * - a1-verweigert   : Lauf-Detail VERWEIGERT mit Abgleich-Grund „Deine Ablehnung nicht bestätigt“ statt „Ursache in Klartext“, Block mit Zählung.
 * - a2-erfolg       : Lauf-Detail ERFOLGREICH mit voller Zählung (Antworten, bestätigt, unbeantwortet).
 * - a3-r3           : Lauf-Detail mit R3-Meldung (rot, `<img>`-Text als Text, U+202E als Marke).
 * - a4-sichtung     : Workflow im F-760-Halt auf lauf-kanal-verweigert — Sichtungs-Notiz mit Kanal-Grund (Workflow-Detail als feste Antwort,
 *   Lauf-Detail echt von der Instanz).
 * - a7-r3-lang (de 390, Zoom 200 %): R3-Grund mit 500 Zeichen ohne Leerzeichen; a8-timeout: FEHLGESCHLAGEN mit Zählung („nicht ausgewertet“).
 * - a5-entscheidungen / a6-startfehler (#/ausfuehrungen) : R3-Startfehler als „Protokoll-Abweichung“ mit Link. Der Startfehler-Eintrag wird als feste Antwort
 *   in /api/zustand eingesetzt (Form wie der Server ihn schreibt; den Server-Weg belegt Gate f45-b2b3b2b1a-rest (r3)).
 * Ansichten a1–a3: de 1440 (dunkel), de 1440 hell, de 390, tr 390, ru 390, de 1440 Zoom 200 %; a4–a6: de 1440 dunkel/hell, de 390. Die Pfadprobe des
 * Render-Helfers prüft vor jedem Bild den sichtbaren Text und vor dem Schreiben das Protokoll (F-1125).
 *
 * Aufruf: node features/F45/nachweise/b2b3b2b2a3/render/erzeuge-nachweis.mjs [basis]
 * Wird aufgerufen von: Hand. Nicht Teil von `npm run check`.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const [basis = 'http://127.0.0.1:4408'] = process.argv.slice(2)
const ziel = dirname(fileURLToPath(import.meta.url))
const wurzel = resolve(ziel, '../../../../..')
const CHAT_ZU = { 'leitstand-chat-offen': 'false' }

const BEOBACHTUNG = {
  texte: [
    { name: 'Notiz', selector: '#lauf-notiz .lauf-notiz-fehler > strong, #lauf-notiz .lauf-notiz-erfolg > strong' },
    { name: 'Kanal-Grund', selector: '.kanal-grund' },
    { name: 'Was tun', selector: '.kanal-was-tun' },
    { name: 'R3-Titel', selector: '.rueckfrage-abweichung > strong' },
    { name: 'Sichtungs-Satz', selector: '#workflow-bedienung .wf-sichtung > p' },
    { name: 'Chip R3', selector: '.entscheidung-karte.art-startproblem .art-chip' },
    { name: 'Knopf R3', selector: '.entscheidung-karte.art-startproblem .entscheidung-karte-aktionen a' },
  ],
  vorhanden: [
    { name: 'Block „Rückfrage-Kanal im Lauf“', selector: '#lauf-notiz .rueckfrage-abnahme' },
    { name: 'R3-Meldung', selector: '#lauf-notiz .rueckfrage-abweichung' },
    { name: 'Maske sichtbar', selector: '.rueckfrage-abweichung .rueckfrage-maske' },
    { name: '<img> gerendert (soll false)', selector: '#lauf-notiz img, #attention-liste img' },
    { name: '„Ursache in Klartext“ (VERWEIGERT mit Kanal-Grund: false)', selector: '#lauf-notiz .lauf-notiz-fehler .kommt, #lauf-notiz .lauf-notiz-fehler .badge-kommt' },
    { name: 'Sichtung mit Kanal-Grund', selector: '#workflow-bedienung .wf-sichtung .kanal-grund' },
    { name: 'Startfehler mit Protokoll-Abweichung', selector: '#startfehler .startfehler-zeile .art-chip' },
  ],
  ueberlauf: true,
}

const ANSICHTEN = {
  'de-1440': { viewport: { breite: 1440, hoehe: 1600 } },
  'de-1440-hell': { viewport: { breite: 1440, hoehe: 1600 }, farbschema: 'light' },
  'de-390': { viewport: { breite: 390, hoehe: 2400 } },
  'tr-390': { viewport: { breite: 390, hoehe: 2400 }, localStorageSetzen: { 'leitstand-sprache': 'tr' } },
  'ru-390': { viewport: { breite: 390, hoehe: 2400 }, localStorageSetzen: { 'leitstand-sprache': 'ru' } },
  'de-1440-zoom200': { viewport: { breite: 1440, hoehe: 1600 }, zoom: 2 },
}
const KLEIN = { 'de-1440': ANSICHTEN['de-1440'], 'de-1440-hell': ANSICHTEN['de-1440-hell'], 'de-390': ANSICHTEN['de-390'] }

// Zustand der Instanz plus der R3-Startfehler in der Form, die der Server schreibt (leitstand-server.mjs, rueckfrageZugang).
const echterZustand = await (await fetch(`${basis}/api/zustand`)).json()
const R3_STARTFEHLER = {
  zeitstempel: '2026-10-17T10:05:00.000Z',
  laufId: 'lauf-kanal-r3',
  fehler: "Rückfrage-Protokoll von Lauf 'lauf-kanal-r3' nicht bestätigt — Ablehnungen durch Stefan zählen nicht: Länge abweichend (Speicher 2, Datei 3)",
  art: 'rueckfrage_abweichung',
}
const ZUSTAND_R3 = { ...echterZustand, startfehler: [R3_STARTFEHLER] }

const schritt = (id, rolle, status, nachfolger, laufId) => ({ schritt_id: id, rolle, worker: rolle === 'ausfuehrung' ? 'claude-code' : 'codex', modell: 'claude-sonnet', freigabe: 'KEINE', status, nachfolger, lauf_id: laufId, zeitgrenze_ms: 900000 })
const WF = {
  daten: {
    workflow_id: 'nw-kanal',
    auftrag_id: 'nw-kanal-a',
    version: 1,
    ziel: 'Export-Funktion veröffentlichen',
    status: 'KLAERUNG_ERFORDERLICH',
    aktiver_schritt_id: 's1',
    grund: "Lauf endete VERWEIGERT (ohne Bypass-Verdacht). Abgelehnte Befehle: npm publish --access public — menschliche Sichtung vor Fortsetzung (F-760, Schritt 's1', Lauf 'lauf-kanal-verweigert')",
    schritte: [schritt('s1', 'ausfuehrung', 'VERWEIGERT', 's2', 'lauf-kanal-verweigert'), schritt('s2', 'code-reviewer', 'OFFEN', null, null)],
  },
  versionSequenz: 2,
  verstoesse: [],
  naechster: { art: 'haltKlaerung', grund: 'F-760', schrittId: 's1' },
  architekturEntscheidung: null,
  empfehlung: null,
}
const WF_LISTE = [{ workflowId: 'nw-kanal', auftragId: 'nw-kanal-a', ziel: WF.daten.ziel, versionSequenz: 2, status: WF.daten.status, aktiverSchrittId: 's1', grund: WF.daten.grund, schritteAnzahl: 2, naechster: WF.naechster }]
const WF_ABNAHME = { workflowStatus: 'KLAERUNG_ERFORDERLICH', freigabeHalt: null, entscheidung: { status: 'nicht_vorhanden' }, urteil: { status: 'noch_nicht_gelaufen' }, aenderungsuebersicht: { status: 'nicht_vorhanden' }, pruefergebnis: { status: 'nicht_vorhanden' } }

const warte = (selector, timeoutMs = 15000) => ({ warteAufSelector: { selector, timeoutMs } })
const folgen = {}
const lauf = (laufId, ansicht, einstellung, label, warteAuf) => ({
  url: `${basis}/#/runs/${laufId}`,
  ...einstellung,
  screenshotVollseite: true,
  localStorageSetzen: { ...CHAT_ZU, ...(einstellung.localStorageSetzen ?? {}) },
  beobachtete: BEOBACHTUNG,
  schritte: [{ label: `${label} — ${ansicht}`, ...warte(warteAuf), screenshot: `01-${ansicht}.webp` }],
})
for (const [ansicht, einstellung] of Object.entries(ANSICHTEN)) {
  folgen[`a1-verweigert-${ansicht}`] = lauf('lauf-kanal-verweigert', ansicht, einstellung, 'VERWEIGERT mit Kanal-Grund statt Standardsatz', '#lauf-notiz .kanal-grund')
  folgen[`a2-erfolg-${ansicht}`] = lauf('lauf-kanal-erfolg', ansicht, einstellung, 'ERFOLGREICH mit Zählung', '#lauf-notiz .rueckfrage-abnahme')
  folgen[`a3-r3-${ansicht}`] = lauf('lauf-kanal-r3', ansicht, einstellung, 'R3-Meldung escaped mit Maske', '#lauf-notiz .rueckfrage-abweichung')
}
for (const [ansicht, einstellung] of Object.entries(KLEIN)) {
  folgen[`a4-sichtung-${ansicht}`] = {
    url: `${basis}/#/workflows/nw-kanal`,
    ...einstellung,
    screenshotVollseite: true,
    localStorageSetzen: CHAT_ZU,
    anfragenAntworten: [
      { muster: '**/api/zustand', json: { ...echterZustand, workflows: WF_LISTE } },
      { muster: '**/api/workflows/nw-kanal', json: WF },
      { muster: '**/api/workflows/nw-kanal/abnahme', json: WF_ABNAHME },
    ],
    beobachtete: BEOBACHTUNG,
    schritte: [{ label: `F-760-Sichtung mit Kanal-Grund (nach dem Nachladen des Lauf-Details) — ${ansicht}`, ...warte('#workflow-bedienung .wf-sichtung .kanal-grund'), screenshot: `01-${ansicht}.webp` }],
  }
  folgen[`a5-entscheidungen-${ansicht}`] = {
    url: `${basis}/#/attention`,
    ...einstellung,
    screenshotVollseite: true,
    localStorageSetzen: CHAT_ZU,
    anfragenAntworten: [{ muster: '**/api/zustand', json: ZUSTAND_R3 }],
    beobachtete: BEOBACHTUNG,
    schritte: [{ label: `„Deine Entscheidungen“: R3 als Protokoll-Abweichung mit „Lauf ansehen“ — ${ansicht}`, ...warte('.entscheidung-karte.art-startproblem a.button'), screenshot: `01-${ansicht}.webp` }],
  }
  folgen[`a6-startfehler-${ansicht}`] = {
    url: `${basis}/#/ausfuehrungen`,
    ...einstellung,
    screenshotVollseite: true,
    localStorageSetzen: CHAT_ZU,
    anfragenAntworten: [{ muster: '**/api/zustand', json: ZUSTAND_R3 }],
    beobachtete: BEOBACHTUNG,
    schritte: [{ label: `Ausführungen: Startfehler-Zeile mit Protokoll-Abweichung und Link — ${ansicht}`, ...warte('#ausfuehrungen-abschnitt:not([hidden]) #startfehler .startfehler-zeile .art-chip'), screenshot: `01-${ansicht}.webp` }],
  }
}

// Korrekturrunde: langer R3-Grund ohne Leerzeichen (qa 5, design-guardian 5) und FEHLGESCHLAGEN mit Zählung (code-reviewer 2).
for (const ansicht of ['de-390', 'de-1440-zoom200']) folgen[`a7-r3-lang-${ansicht}`] = lauf('lauf-kanal-r3-lang', ansicht, ANSICHTEN[ansicht], 'R3 mit 500 Zeichen ohne Leerzeichen bricht um', '#lauf-notiz .rueckfrage-abweichung')
folgen['a8-timeout-de-1440'] = lauf('lauf-kanal-timeout', 'de-1440', ANSICHTEN['de-1440'], 'FEHLGESCHLAGEN (TIMEOUT) mit Zählung: „nicht ausgewertet“', '#lauf-notiz .rueckfrage-abnahme')

for (const [name, folge] of Object.entries(folgen)) {
  const verzeichnis = join(ziel, name)
  mkdirSync(verzeichnis, { recursive: true })
  // Alte Bilder und Protokolle dieses Falls weg — bei einem Abbruch der Pfadprobe bliebe sonst ein altes Bild stehen (F-1125 (R4)).
  for (const eintrag of readdirSync(verzeichnis)) if (/\.(webp|png)$|^protokoll\./.test(eintrag)) rmSync(join(verzeichnis, eintrag))
  const datei = join(verzeichnis, 'klickfolge.json')
  writeFileSync(datei, `${JSON.stringify(folge, null, 2)}\n`)
  console.log(`\n=== ${name} ===`)
  execFileSync(process.execPath, [join(wurzel, 'scripts/render-nachweis.mjs'), datei, verzeichnis], { stdio: 'inherit', cwd: wurzel })
}
