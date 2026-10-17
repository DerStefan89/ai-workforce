/**
 * Datei: features/F45/nachweise/b2b3b2b2b1/render/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweis F45 B2b-3b-2b-2b-1 Punkt 1 „E-R3-Sichtung = B“ gegen die neutrale Testinstanz von 2a-3
 * (features/F45/nachweise/b2b3b2b2a3/instanz.mjs, Port 4408, Terminalmarken vom echten Evaluator). Fälle (Workflow-Detail als feste Antwort,
 * Lauf-Detail echt von der Instanz):
 * - b1-ohne-r3   : F-760-Halt auf lauf-kanal-verweigert (Kanal-Grund, keine Abweichung) — Dialog mit „Sichtung bestätigt – weiter“ (ein Klick).
 * - b3-r3 (01)    : F-760-Halt auf lauf-kanal-r3 — Schritt 1: Hinweis vor dem Pflichtfeld, keine Bestätigung, „Protokoll-Abweichung ansehen“.
 * - b3-r3 (02/03) : dazu Klick ⇒ R3-Meldung (escaped, `<img>` als Text, U+202E als Marke) und „Abweichung gesehen – Sichtung bestätigt –
 *   weiter“; zweites Bild nach mehr als zwei Poll-Takten (Schritt 2 bleibt, Begründung bleibt).
 * Ansichten: de 1440 dunkel/hell, de 390 dunkel/hell, tr 390, ru 390, de 1440 Zoom 200 % (design-guardian 5). Die Pfadprobe des Render-Helfers prüft vor jedem Bild den sichtbaren Text (F-1125).
 *
 * Aufruf: Testinstanz starten (node features/F45/nachweise/b2b3b2b2a3/instanz.mjs), dann
 * node features/F45/nachweise/b2b3b2b2b1/render/erzeuge-nachweis.mjs [basis]
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
    { name: 'Dialogtitel', selector: '#workflow-dialog-titel' },
    { name: 'Hauptknopf', selector: '#workflow-dialog .dialog-actions .button.primary' },
    { name: 'R3-Hinweis', selector: '#workflow-dialog .wf-sichtung-r3-hinweis' },
    { name: 'Schritt 2', selector: '#wf-sichtung-r3-meldung > p strong' },
    { name: 'R3-Titel', selector: '#wf-sichtung-r3-meldung .rueckfrage-abweichung > strong' },
    { name: 'Begründung', selector: '#wf-sichtung-begruendung' },
  ],
  vorhanden: [
    { name: 'Bestätigung „sichtung“ im Dialog', selector: '#workflow-dialog [data-aktion="sichtung"]' },
    { name: 'Knopf „Protokoll-Abweichung ansehen“', selector: '#workflow-dialog [data-aktion="sichtung-r3"]' },
    { name: 'R3-Meldung in Schritt 2', selector: '#wf-sichtung-r3-meldung .rueckfrage-abweichung' },
    { name: 'Maske sichtbar', selector: '#wf-sichtung-r3-meldung .rueckfrage-maske' },
    { name: '<img> gerendert (soll false)', selector: '#workflow-dialog img' },
  ],
  ueberlauf: true,
}

const ANSICHTEN = {
  'de-1440': { viewport: { breite: 1440, hoehe: 1100 } },
  'de-1440-hell': { viewport: { breite: 1440, hoehe: 1100 }, farbschema: 'light' },
  'de-390': { viewport: { breite: 390, hoehe: 1600 } },
  'de-390-hell': { viewport: { breite: 390, hoehe: 1600 }, farbschema: 'light' },
  'de-1440-zoom200': { viewport: { breite: 1440, hoehe: 1100 }, zoom: 2 },
  'tr-390': { viewport: { breite: 390, hoehe: 1600 }, localStorageSetzen: { 'leitstand-sprache': 'tr' } },
  'ru-390': { viewport: { breite: 390, hoehe: 1600 }, localStorageSetzen: { 'leitstand-sprache': 'ru' } },
}

const echterZustand = await (await fetch(`${basis}/api/zustand`)).json()
const schritt = (id, rolle, status, nachfolger, laufId) => ({ schritt_id: id, rolle, worker: rolle === 'ausfuehrung' ? 'claude-code' : 'codex', modell: 'claude-sonnet', freigabe: 'KEINE', status, nachfolger, lauf_id: laufId, zeitgrenze_ms: 900000 })

/**
 * Workflow im F-760-Halt auf einem Lauf der Instanz (Form wie GET /api/workflows/<id>).
 * @param workflowId - Kennung
 * @param laufId - Lauf des VERWEIGERT-Schritts
 * @returns { wf, liste, abnahme }
 */
function workflow(workflowId, laufId) {
  const daten = {
    workflow_id: workflowId,
    auftrag_id: `${workflowId}-a`,
    version: 1,
    ziel: 'Export-Funktion veröffentlichen',
    status: 'KLAERUNG_ERFORDERLICH',
    aktiver_schritt_id: 's1',
    grund: `Lauf endete VERWEIGERT (ohne Bypass-Verdacht). Abgelehnte Befehle: npm publish --access public — menschliche Sichtung vor Fortsetzung (F-760, Schritt 's1', Lauf '${laufId}')`,
    schritte: [schritt('s1', 'ausfuehrung', 'VERWEIGERT', 's2', laufId), schritt('s2', 'code-reviewer', 'OFFEN', null, null)],
  }
  const naechster = { art: 'haltKlaerung', grund: 'F-760', schrittId: 's1' }
  return {
    wf: { daten, versionSequenz: 2, verstoesse: [], naechster, architekturEntscheidung: null, empfehlung: null },
    liste: [{ workflowId, auftragId: daten.auftrag_id, ziel: daten.ziel, versionSequenz: 2, status: daten.status, aktiverSchrittId: 's1', grund: daten.grund, schritteAnzahl: 2, naechster }],
    abnahme: { workflowStatus: 'KLAERUNG_ERFORDERLICH', freigabeHalt: null, entscheidung: { status: 'nicht_vorhanden' }, urteil: { status: 'noch_nicht_gelaufen' }, aenderungsuebersicht: { status: 'nicht_vorhanden' }, pruefergebnis: { status: 'nicht_vorhanden' } },
  }
}

const warte = (selector, timeoutMs = 15000) => ({ warteAufSelector: { selector, timeoutMs } })
/** Wartet länger als zwei Poll-Takte (2 s): ein Selektor, den es nie gibt, mit Zeitgrenze — der Helfer verschluckt das Ausbleiben. */
const pause = (ms) => ({ warteAufSelector: { selector: '#gibt-es-nicht-b2b3b2b2b1', timeoutMs: ms } })

/**
 * Klickfolge: Workflow öffnen, Sichtungs-Dialog öffnen, Begründung tippen, optional Schritt 2.
 * @param workflowId - Workflow
 * @param laufId - Lauf
 * @param ansicht - Ansichtsname
 * @param einstellung - Viewport/Sprache
 * @param mitSchritt2 - true: „Protokoll-Abweichung ansehen“ klicken und nach einer Pause erneut abbilden
 * @returns Klickfolge
 */
function folge(workflowId, laufId, ansicht, einstellung, mitSchritt2) {
  const { wf, liste, abnahme } = workflow(workflowId, laufId)
  // 'tippen' läuft im Helfer vor 'klick' desselben Schritts — deshalb Öffnen und Tippen getrennt.
  const schritte = [
    { label: `Sichtungs-Notiz geladen — ${ansicht}`, ...warte('#workflow-bedienung .wf-sichtung [data-aktion="sichtung-oeffnen"]') },
    { label: `Dialog geöffnet — ${ansicht}`, klick: '#workflow-bedienung [data-aktion="sichtung-oeffnen"]', ...warte('#wf-sichtung-begruendung') },
    { label: `Begründung getippt — ${ansicht}`, tippen: { selector: '#wf-sichtung-begruendung', text: 'Abgelehnte Befehle gesichtet.' }, screenshot: `01-${ansicht}.webp` },
  ]
  if (mitSchritt2) {
    schritte.push({ label: `Schritt 2: R3-Meldung und Bestätigung — ${ansicht}`, klick: '#workflow-dialog [data-aktion="sichtung-r3"]', ...warte('#wf-sichtung-r3-meldung .rueckfrage-abweichung'), screenshot: `02-${ansicht}.webp` })
    schritte.push({ label: `nach mehr als zwei Poll-Takten: Schritt 2 und Begründung bleiben — ${ansicht}`, ...pause(5000), screenshot: `03-${ansicht}.webp` })
  }
  return {
    url: `${basis}/#/workflows/${workflowId}`,
    ...einstellung,
    screenshotVollseite: true,
    localStorageSetzen: { ...CHAT_ZU, ...(einstellung.localStorageSetzen ?? {}) },
    anfragenAntworten: [
      { muster: '**/api/zustand', json: { ...echterZustand, workflows: liste } },
      { muster: `**/api/workflows/${workflowId}`, json: wf },
      { muster: `**/api/workflows/${workflowId}/abnahme`, json: abnahme },
    ],
    beobachtete: BEOBACHTUNG,
    schritte,
  }
}

const folgen = {}
for (const [ansicht, einstellung] of Object.entries(ANSICHTEN)) {
  folgen[`b1-ohne-r3-${ansicht}`] = folge('nw-sichtung', 'lauf-kanal-verweigert', ansicht, einstellung, false)
  folgen[`b3-r3-${ansicht}`] = folge('nw-sichtung-r3', 'lauf-kanal-r3', ansicht, einstellung, true)
}

for (const [name, klickfolge] of Object.entries(folgen)) {
  const verzeichnis = join(ziel, name)
  mkdirSync(verzeichnis, { recursive: true })
  for (const eintrag of readdirSync(verzeichnis)) if (/\.(webp|png)$|^protokoll\./.test(eintrag)) rmSync(join(verzeichnis, eintrag))
  const datei = join(verzeichnis, 'klickfolge.json')
  writeFileSync(datei, `${JSON.stringify(klickfolge, null, 2)}\n`)
  console.log(`\n=== ${name} ===`)
  execFileSync(process.execPath, [join(wurzel, 'scripts/render-nachweis.mjs'), datei, verzeichnis], { stdio: 'inherit', cwd: wurzel })
}
