/**
 * Datei: features/F45/nachweise/b2b4a2b2/render/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweis F45 B2b-4a-2b-2 „Bereit zum Sichern – Anzeige“ (features/F45/plan-b2b4a2b2.md §5). Ablaufseite
 * #/workflows/<id> mit der Karte „Wo gearbeitet wird“ und dem Abschnitt „Bereit zum Sichern“ in den Lagen bereit (commit), bereit
 * (push), push-Grund (fremder Branch), push-Grund (ohne origin), node_modules ausgelassen, aufgeräumt (409), GESTOPPT mit Änderungen,
 * ohne Arbeitsordner (Projektordner); Abnahme mit „Kopieren“ (Zwischenablage im Protokoll); Workboard „abgeschlossen“ über
 * Click-to-Work (feste Antworten für Anlegen, Routen, Freigabe und Detail). de 1440/390 hell/dunkel, ru 390; 200 % und reduzierte
 * Bewegung nur für „bereit (commit)“. scrollWidth/clientWidth im Protokoll.
 *
 * Gegen die neutrale Testinstanz von 2a-3 (features/F45/nachweise/b2b3b2b2a3/instanz.mjs, Port 4408, neutrales HOME/TEMP — liefert
 * Seite und Zustand); GET /api/workflows/<id>, …/abnahme und GET …/code?workflow=<id> kommen als feste Antworten mit neutralem Pfad
 * (C:\Projekte\haushaltsbuch-laeufe\…). Die Pfadprobe des Render-Helfers prüft vor jedem Bild den sichtbaren Text (F-1125).
 *
 * Aufruf: Testinstanz starten (node features/F45/nachweise/b2b3b2b2a3/instanz.mjs), dann
 * node features/F45/nachweise/b2b4a2b2/render/erzeuge-nachweis.mjs [basis]
 * Wird aufgerufen von: Hand. Nicht Teil von `npm run check`.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const [basis = 'http://127.0.0.1:4408'] = process.argv.slice(2)
const ziel = dirname(fileURLToPath(import.meta.url))
const wurzel = resolve(ziel, '../../../../..')

const ID = 'w-haushalt-export'
const PFAD = String.raw`C:\Projekte\haushaltsbuch-laeufe\a1b2c3d4`
const BRANCH = `wf/${ID}`
const AO = { status: 'BEREIT', pfad: PFAD, branch: BRANCH, basis_commit: 'abc1234def5678' }
const SCHRITTE = [{ schritt_id: 's1', rolle: 'ausfuehrung', worker: 'claude-code', modell: 'claude-sonnet', freigabe: 'ZWINGEND', status: 'ERLEDIGT', nachfolger: null, lauf_id: null }]

/**
 * Antwort von GET /api/workflows/<id>.
 * @param status - Workflow-Status
 * @param ao - Feld arbeitsordner
 * @param naechster - naechster
 * @returns Detail
 */
const detail = (status, ao = AO, naechster = null) => ({ daten: { ziel: 'Monatsexport als CSV', status, schritte: SCHRITTE }, naechster, arbeitsordner: ao, versionSequenz: 1 })

/**
 * Antwort von GET …/abnahme.
 * @param entschieden - Abnahme entschieden
 * @param status - Workflow-Status
 * @returns Abnahme
 */
const abnahme = (entschieden, status = 'ABGESCHLOSSEN') => ({
  workflowStatus: status,
  freigabeHalt: null,
  entscheidung: entschieden ? { status: 'ok', entscheidung: 'ANGENOMMEN', begruendung: 'passt', versionSequenz: 1 } : { status: 'fehlt' },
  urteil: { status: 'noch_nicht_gelaufen' },
  aenderungsuebersicht: { status: 'noch_nicht_gelaufen' },
  pruefergebnis: { status: 'noch_nicht_gelaufen' },
})

/**
 * Antwort von GET …/code?workflow=<id> (200).
 * @param sichern - ablauf.sichern
 * @param zusatz - { branch, remoteWebUrl, dateien, workflowStatus }
 * @returns Antwort
 */
function code(sichern, zusatz = {}) {
  const eintraege = zusatz.eintraege ?? [
    { pfad: 'src/export/monatsuebersicht.ts', art: 'M', xy: ' M', plus: 18, minus: 4 },
    { pfad: 'src/export/csv-export.ts', art: '??', xy: '??', plus: 41, minus: null },
  ]
  return {
    status: 'ok',
    absoluterPfad: PFAD,
    arbeitsverzeichnis: { vorhanden: true },
    branch: { status: 'ok', name: BRANCH, losgeloest: false, commit: 'def5678abc1234', ...(zusatz.branch ?? {}) },
    basis: { status: 'ok', ref: 'origin/main', voraus: sichern.voraus ?? 0, zurueck: 0 },
    remoteWebUrl: { status: 'ok', url: 'https://github.com/beispiel/haushaltsbuch', origin: true, ...(zusatz.remoteWebUrl ?? {}) },
    dateien: { status: 'ok', eintraege, anzahl: eintraege.length, gekappt: false, nodeModules: zusatz.nodeModules ?? 0 },
    verlauf: { status: 'ok', ref: 'origin/main', eintraege: [] },
    freigabeCommit: { status: 'ok', vorhanden: false, alterMinuten: null },
    harness: { status: 'ok', claudeMd: true, settings: true, hooks: 5, agents: 5 },
    startvorlage: { status: 'ok', pfad: 'startvorlagen/beispielprojekt.json', pruefbefehl: 'npm run check', werkzeugsaetze: ['lesend'], worker: ['claude-code'], modell: 'claude-sonnet' },
    ablauf: { workflowId: ID, bedarf: 'pflicht', workflowStatus: zusatz.workflowStatus ?? 'ABGESCHLOSSEN', arbeitsordner: { pfad: PFAD, branch: BRANCH }, sichern: { bereit: true, art: 'commit', grund: null, offeneAenderungen: eintraege.length, voraus: 0, ...sichern } },
  }
}

const get = (muster, json, status = 200) => ({ muster, status, json, methode: 'GET' })
/**
 * Feste Antworten einer Lage der Ablaufseite.
 * @param d - Detail
 * @param a - Abnahme
 * @param c - Antwort auf …/code?workflow= (json) und status
 * @returns anfragenAntworten
 */
const lage = (d, a, c, cStatus = 200) => [get(`**/api/workflows/${ID}`, d), get(`**/api/workflows/${ID}/abnahme`, a), get('**/api/code?workflow=**', c, cStatus)]

const LAGEN = [
  ['01-bereit-commit', lage(detail('ABGESCHLOSSEN'), abnahme(true), code({}))],
  ['02-bereit-push', lage(detail('ABGESCHLOSSEN'), abnahme(true), code({ art: 'push', offeneAenderungen: 0, voraus: 3 }, { eintraege: [] }))],
  ['03-push-grund-branch', lage(detail('ABGESCHLOSSEN'), abnahme(true), code({ voraus: 1 }, { branch: { name: 'feat/anderer-branch' } }))],
  ['04-push-grund-origin', lage(detail('ABGESCHLOSSEN'), abnahme(true), code({ voraus: 1 }, { remoteWebUrl: { origin: false, url: null } }))],
  ['05-node-modules', lage(detail('ABGESCHLOSSEN'), abnahme(true), code({}, { nodeModules: 1532 }))],
  ['06-aufgeraeumt-409', lage(detail('ABGESCHLOSSEN', { ...AO, status: 'ENTFERNT', aufraeumen: { branch_geloescht: true } }), abnahme(true), { grund: 'Der Arbeitsordner des Ablaufs ist aufgeräumt', grund_schluessel: 'aufgeraeumt' }, 409)],
  ['07-gestoppt-aenderungen', lage(detail('GESTOPPT'), abnahme(false, 'GESTOPPT'), code({ bereit: false, art: null, grund: 'nichtAbgeschlossen', offeneAenderungen: 3, voraus: 0 }, { workflowStatus: 'GESTOPPT' }))],
  ['08-ohne-arbeitsordner', lage(detail('ABGESCHLOSSEN', { status: 'bestand' }), abnahme(true), code({}))],
]

const warte = (selector, timeoutMs = 15000) => ({ warteAufSelector: { selector, timeoutMs } })

const BEOBACHTUNG = {
  texte: [
    { name: 'Lage/erste Zeile', selector: '#workflow-entscheiden .sichern-abschnitt p, #workflow-entscheiden .sichern-satz' },
    { name: 'Aufräumen', selector: '#workflow-entscheiden [data-sichern-aufraeumen]' },
    { name: 'Schritt 2', selector: '#workflow-entscheiden .sichern-schritt:nth-child(2)' },
    { name: 'Schritt 3', selector: '#workflow-entscheiden .sichern-schritt:nth-child(3)' },
    { name: 'node_modules', selector: '#workflow-entscheiden .code-node-modules' },
  ],
  vorhanden: [
    { name: 'Abschnitt', selector: '#workflow-entscheiden [data-sichern-abschnitt]' },
    { name: 'Befehlsblock', selector: '#workflow-entscheiden .befehlsblock' },
    { name: 'Knopf Aufräumen in der Karte', selector: '#workflow-entscheiden [data-aktion="aufraeumen-oeffnen"]' },
    { name: 'Fehlerfarbe im Abschnitt', selector: '#workflow-entscheiden .sichern-abschnitt .fehler' },
  ],
  ueberlauf: true,
}

const ANSICHTEN = {
  'de-1440-hell': { viewport: { breite: 1440, hoehe: 1100 }, farbschema: 'light' },
  'de-1440-dunkel': { viewport: { breite: 1440, hoehe: 1100 }, farbschema: 'dark' },
  'de-390-hell': { viewport: { breite: 390, hoehe: 1600 }, farbschema: 'light' },
  'de-390-dunkel': { viewport: { breite: 390, hoehe: 1600 }, farbschema: 'dark' },
  'ru-390-dunkel': { viewport: { breite: 390, hoehe: 1600 }, farbschema: 'dark', sprache: 'ru' },
  'de-1440-200prozent': { viewport: { breite: 1440, hoehe: 1100 }, farbschema: 'dark', zoom: 2, nur: ['01-bereit-commit'] },
  'de-390-reduziert': { viewport: { breite: 390, hoehe: 1600 }, farbschema: 'dark', reduzierteBewegung: true, nur: ['01-bereit-commit'] },
}

/**
 * Klickfolge der Ablaufseite in einer Ansicht.
 * @param ansicht - Name
 * @param einstellung - Viewport, Farbschema, Sprache, Zoom, nur
 * @returns Klickfolge
 */
function folgeAblauf(ansicht, { sprache = 'de', nur, ...einstellung }) {
  const lagen = LAGEN.filter(([name]) => nur === undefined || nur.includes(name))
  return {
    url: `${basis}/#/workflows/${ID}`,
    ...einstellung,
    screenshotVollseite: true,
    localStorageSetzen: { 'leitstand-chat-offen': 'false', 'leitstand-sprache': sprache },
    anfragenAntworten: lagen[0][1],
    beobachtete: BEOBACHTUNG,
    schritte: lagen.map(([name, antworten]) => ({ label: `Ablaufseite: ${name} — ${ansicht}`, anfragenAntworten: antworten, reload: true, ...warte('#workflow-entscheiden .sichern-abschnitt .sichern-fuss, #workflow-entscheiden .sichern-satz'), screenshot: `${name}-${ansicht}.webp` })),
  }
}

/** Abnahme offen (Modus „abnahme“): Abschnitt mit „nach deiner Abnahme“, dann Klick auf „Kopieren“ des commit-Blocks. */
function folgeAbnahme(ansicht, { sprache = 'de', ...einstellung }) {
  return {
    url: `${basis}/#/workflows/${ID}`,
    ...einstellung,
    screenshotVollseite: true,
    zwischenablage: true,
    localStorageSetzen: { 'leitstand-chat-offen': 'false', 'leitstand-sprache': sprache },
    anfragenAntworten: lage(detail('ABGESCHLOSSEN'), abnahme(false), code({})),
    beobachtete: { ...BEOBACHTUNG, texte: [...BEOBACHTUNG.texte, { name: 'Knopf Kopieren', selector: '#workflow-entscheiden [data-befehl-kopieren]' }] },
    schritte: [
      { label: `Abnahme offen — ${ansicht}`, reload: true, ...warte('#workflow-entscheiden .sichern-fuss'), screenshot: `09-abnahme-${ansicht}.webp` },
      { label: `Abnahme: Kopieren commit-Block — ${ansicht}`, klick: '#workflow-entscheiden [data-befehl-kopieren]', screenshot: `10-abnahme-kopiert-${ansicht}.webp` },
    ],
  }
}

const RID = 'router-A-nachweis'
const FINDING = { quelle: 'finding', typ: 'TECH_DEBT', id: 'F-9100', titel: 'Monatsexport als CSV', status: 'OFFEN', statusRoh: 'offen', prioritaet: 'P2', beschreibung: 'Der Monatsexport fehlt.', massnahme: 'CSV-Export je Monat anlegen.' }
const WB_DETAIL = { daten: { ziel: 'Monatsexport als CSV', status: 'ABGESCHLOSSEN', schritte: SCHRITTE }, naechster: { art: 'haltFreigabe', schrittId: 's1' }, arbeitsordner: { ...AO, branch: `wf/${RID}` }, versionSequenz: 1 }
const WB_CODE = (() => {
  const c = code({})
  return { ...c, branch: { ...c.branch, name: `wf/${RID}` }, ablauf: { ...c.ablauf, workflowId: RID, arbeitsordner: { pfad: PFAD, branch: `wf/${RID}` } } }
})()

/** Workboard „abgeschlossen“ über Click-to-Work mit festen Antworten (Anlegen, Routen, Freigabe, Detail). */
function folgeWorkboard(ansicht, { sprache = 'de', ...einstellung }) {
  return {
    url: `${basis}/#/workboard/F-9100`,
    ...einstellung,
    screenshotVollseite: true,
    zwischenablage: true,
    localStorageSetzen: { 'leitstand-chat-offen': 'false', 'leitstand-sprache': sprache },
    anfragenAntworten: [
      get('**/api/workitems', { workitems: [FINDING], befunde: [], fehler: [] }),
      get('**/api/workitems?**', { workitems: [FINDING], befunde: [], fehler: [] }),
      get('**/api/auftraege', []),
      { muster: '**/api/auftraege', methode: 'POST', status: 201, json: { auftragId: 'A-nachweis' } },
      { muster: '**/api/auftraege/*/routen', methode: 'POST', status: 202, json: { laufId: 'L-nachweis', auftragId: 'A-nachweis' } },
      { muster: `**/api/workflows/${RID}/freigabe`, methode: 'POST', status: 200, json: { status: 'LAEUFT' } },
      get(`**/api/workflows/${RID}`, WB_DETAIL),
      get('**/api/code?workflow=**', WB_CODE),
    ],
    beobachtete: {
      texte: [
        { name: 'Abschnitt Lage', selector: '#workboard-bearbeitung .sichern-abschnitt p' },
        { name: 'Aufräumen', selector: '#workboard-bearbeitung [data-sichern-aufraeumen]' },
      ],
      vorhanden: [
        { name: 'Abschnitt', selector: '#workboard-bearbeitung [data-sichern-abschnitt]' },
        { name: 'Projektordner-Block (alt)', selector: '#workboard-git-titel' },
      ],
      ueberlauf: true,
    },
    schritte: [
      { label: 'Workboard: Detail', reload: true, ...warte('#workboard-bearbeiten') },
      { label: 'Click-to-Work: Bearbeiten', klick: '#workboard-bearbeiten', ...warte('.wb-ak-anlegen') },
      { label: 'Click-to-Work: Auftrag anlegen', klick: '.wb-ak-anlegen', ...warte('.wb-freigeben', 20000) },
      { label: 'Click-to-Work: Freigeben', klick: '.wb-freigeben', ...warte('#workboard-bearbeitung .sichern-fuss', 20000) },
      { label: `Workboard abgeschlossen — ${ansicht}`, screenshot: `11-workboard-${ansicht}.webp` },
      { label: `Workboard: Kopieren — ${ansicht}`, klick: '#workboard-bearbeitung [data-befehl-kopieren]' },
    ],
  }
}

/**
 * Führt eine Klickfolge in einem eigenen Verzeichnis aus.
 * @param name - Verzeichnisname
 * @param folge - Klickfolge
 */
function lauf(name, folge) {
  const verzeichnis = join(ziel, name)
  mkdirSync(verzeichnis, { recursive: true })
  for (const eintrag of readdirSync(verzeichnis)) if (/\.(webp|png)$|^protokoll\./.test(eintrag)) rmSync(join(verzeichnis, eintrag))
  const datei = join(verzeichnis, 'klickfolge.json')
  writeFileSync(datei, `${JSON.stringify(folge, null, 2)}\n`)
  console.log(`\n=== ${name} ===`)
  execFileSync(process.execPath, [join(wurzel, 'scripts/render-nachweis.mjs'), datei, verzeichnis], { stdio: 'inherit', cwd: wurzel })
}

for (const [ansicht, einstellung] of Object.entries(ANSICHTEN)) lauf(`ablauf-${ansicht}`, folgeAblauf(ansicht, einstellung))
for (const ansicht of ['de-1440-hell', 'de-390-dunkel', 'ru-390-dunkel']) {
  const { nur: _nur, ...einstellung } = ANSICHTEN[ansicht]
  lauf(`abnahme-${ansicht}`, folgeAbnahme(ansicht, einstellung))
  lauf(`workboard-${ansicht}`, folgeWorkboard(ansicht, einstellung))
}
