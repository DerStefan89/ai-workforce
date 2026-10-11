/**
 * Datei: features/F45/nachweise/b1b2/render/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweis F45 B1b-2 (Beleg 12, F-937, F-1044; Muster features/F45/nachweise/p/render/erzeuge-nachweis.mjs)
 * gegen einen laufenden Leitstand aus dem Hauptordner:
 * - workforce-<sprache>-<breite>: Seite Workforce, Register Harness-Aufbau, Abschnitt „Abgleich mit der Zuordnung“
 *   (echte Antwort von GET /api/harness);
 * - workforce-offen-de-1440: derselbe Abschnitt für ein Fixture-Projekt mit absichtlich unbekanntem Agent — die Antwort
 *   rechnet dieses Skript mit derselben Funktion wie der Server (baueHarnessAbgleichOhneLauf) und liefert sie per
 *   anfragenAntworten aus → „offen“ und rot;
 * - abnahme-<sprache>-<breite>: Abnahme des vorhandenen, abgeschlossenen Workflows b1a1-nachweis-325d2a8f mit echten
 *   Laufbelegen (GET …/harness-abgleich live); die vorhandene Entscheidung wird für die Seite „Entscheiden“ ausgeblendet
 *   (GET …/abnahme mit entscheidung 'nicht_vorhanden'), alles andere echt;
 * - abnahme-offen-de-1440: dieselbe Abnahme mit dem Fixture-Harness (unbekannter Agent) — berechnet wie oben;
 * - lauf-detail-de-1440: Lauf-Detail des Ausführungslaufs, Bereich „Tatsächlich verwendete Fähigkeiten“;
 * - startband-cli-de-1440: Band oben mit „CLI-Version geändert“ (GET /api/zustand echt plus cliHinweis) — gelb (Warnung);
 * - Varianten für die Design-Prüfung: abnahme-offen-ru-390, abnahme-offen-de-1440-hell, abnahme-offen-de-1440-zoom200,
 *   workforce-offen-de-1440-hell, workforce-de-1440-bewegung (reduzierte Bewegung), abnahme-vorab-de-1440 (Lage „vorab“:
 *   KLAERUNG_ERFORDERLICH nach dem Bau, Harness im Vorab-Block mit offenem Eintrag).
 * Das Skript schreibt nur in eigene Unterordner (Dateien werden überschrieben, nichts gelöscht) und räumt sein
 * Fixture-Projekt unter os.tmpdir() wieder ab.
 *
 * Wird aufgerufen von: Hand, gegen einen laufenden Leitstand aus dem Hauptordner —
 *   LEITSTAND_PORT=4199 node scripts/leitstand-server.mjs
 *   node features/F45/nachweise/b1b2/render/erzeuge-nachweis.mjs [basis] [nurOrdner]
 * Nicht Teil von `npm run check`.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { raeumeVerzeichnis } from '../../../../../scripts/_aufraeumen.ts'
import { baueHarnessAbgleichOhneLauf, berechneAbgleichFuerWorkflow } from '../../../../../scripts/leitstand/routen-harness-abgleich.mjs'
import { ladeArtefaktVersion } from '../../../../../src/lineage-registry/index.ts'

const basis = process.argv[2] ?? 'http://127.0.0.1:4199'
const nur = process.argv[3]
const ziel = dirname(fileURLToPath(import.meta.url))
const wurzel = resolve(ziel, '../../../../..')
const WORKFLOW = 'b1a1-nachweis-325d2a8f'
const ladeOptionen = { basisVerzeichnis: join(wurzel, 'kontrollzustand'), schreiber: () => {} }

/** GET als JSON vom laufenden Leitstand. @param pfad - API-Pfad @returns JSON */
async function hole(pfad) {
  const antwort = await fetch(`${basis}${pfad}`)
  if (!antwort.ok) throw new Error(`${pfad}: HTTP ${antwort.status}`)
  return antwort.json()
}

const harness = await hole('/api/harness')
const abnahmeEcht = await hole(`/api/workflows/${WORKFLOW}/abnahme`)
const abgleichEcht = await hole(`/api/workflows/${WORKFLOW}/harness-abgleich`)
const zustand = await hole('/api/zustand')
const abnahmeOffen = { ...abnahmeEcht, entscheidung: { status: 'nicht_vorhanden' } }

// Fixture-Projekt: CLAUDE.md von ai-workforce, settings.json ohne Hooks, ein unbekannter Agent.
const fixture = mkdtempSync(join(tmpdir(), 'b1b2-render-'))
let harnessMitOffen
let abgleichMitOffen
try {
  mkdirSync(join(fixture, '.claude', 'agents'), { recursive: true })
  writeFileSync(join(fixture, 'CLAUDE.md'), readFileSync(join(wurzel, 'CLAUDE.md'), 'utf8'))
  writeFileSync(join(fixture, '.claude', 'settings.json'), '{}\n')
  writeFileSync(join(fixture, '.claude', 'agents', 'unbekannter-agent.md'), '# Fixture\n')
  harnessMitOffen = { ...harness, abgleich: baueHarnessAbgleichOhneLauf({ repoWurzel: fixture, installWurzel: wurzel }) }
  const fassung = ladeArtefaktVersion(`workflow-${WORKFLOW}`, undefined, ladeOptionen)
  const berechnet = berechneAbgleichFuerWorkflow({ workflowId: WORKFLOW, workflowDaten: fassung.daten, wurzel: fixture, installWurzel: wurzel, ladeOptionen })
  if (!berechnet.ok) throw new Error(berechnet.grund)
  abgleichMitOffen = { status: 'ok', quelle: 'live', versionSequenz: null, artefaktVeraltet: false, daten: berechnet.daten }
} finally {
  raeumeVerzeichnis(fixture)
}
const ausfuehrungLauf = abnahmeEcht.aenderungsuebersicht?.laufId ?? abgleichEcht.daten.bezug.ausfuehrung_lauf_id

const BEOBACHTUNG_WORKFORCE = {
  texte: [
    { name: 'lang', selector: 'html', attribut: 'lang' },
    { name: 'Zählzeile', selector: '#harness-abgleich .harness-abgleich-zeile' },
    { name: 'Hinweis offen', selector: '#harness-abgleich .note.red' },
    { name: 'erste Zeile', selector: '#harness-abgleich tbody tr' },
  ],
  vorhanden: [{ name: 'offen-Zeile', selector: '#harness-abgleich tr[data-status="offen"]' }],
  ueberlauf: true,
}
const BEOBACHTUNG_ABNAHME = {
  texte: [
    { name: 'lang', selector: 'html', attribut: 'lang' },
    { name: 'Zählzeile', selector: '.harness-im-lauf .harness-abgleich-zeile' },
    { name: 'Hinweis offen', selector: '.harness-im-lauf .note.red' },
    { name: 'Kurzliste', selector: '.harness-im-lauf .harness-kurzliste' },
  ],
  vorhanden: [
    { name: 'Tabelle', selector: '.harness-im-lauf table' },
    { name: 'offen-Zeile', selector: '.harness-im-lauf tr[data-status="offen"]' },
  ],
  ueberlauf: true,
}

const viewport = (breite) => ({ breite, hoehe: breite < 600 ? 844 : 900 })
const sprache = (code) => ({ 'leitstand-sprache': code })

/** Klickfolgen: Name → Konfiguration für scripts/render-nachweis.mjs. */
const FOLGEN = {}
for (const [name, code, breite] of [
  ['workforce-de-1440', 'de', 1440],
  ['workforce-de-390', 'de', 390],
  ['workforce-en-1440', 'en', 1440],
]) {
  FOLGEN[name] = {
    url: `${basis}/#/capabilities`,
    viewport: viewport(breite),
    localStorageSetzen: sprache(code),
    screenshotAusschnitt: { selector: '.harness-abgleich-bereich' },
    screenshotVollseite: true,
    beobachtete: BEOBACHTUNG_WORKFORCE,
    schritte: [
      { label: 'Harness-Aufbau geladen (nichts offen → Tabelle zu)', warteAufSelector: { selector: '#harness-abgleich .harness-abgleich-zeile', timeoutMs: 15000 }, screenshot: '01-abgleich.png' },
      { label: 'Tabelle aufgeklappt', klick: '#harness-abgleich details summary', screenshot: '02-aufgeklappt.png' },
    ],
  }
}
FOLGEN['workforce-offen-de-1440'] = {
  ...FOLGEN['workforce-de-1440'],
  anfragenAntworten: [{ muster: '**/api/harness', status: 200, json: harnessMitOffen }],
  schritte: [{ label: 'Fixture: unbekannter Agent', warteAufSelector: { selector: '#harness-abgleich tr[data-status="offen"]', timeoutMs: 15000 }, screenshot: '01-offen.png' }],
}
for (const [name, code, breite] of [
  ['abnahme-de-1440', 'de', 1440],
  ['abnahme-de-390', 'de', 390],
  ['abnahme-en-1440', 'en', 1440],
]) {
  FOLGEN[name] = {
    url: `${basis}/#/workflows/${WORKFLOW}`,
    viewport: viewport(breite),
    localStorageSetzen: sprache(code),
    anfragenAntworten: [{ muster: `**/api/workflows/${WORKFLOW}/abnahme`, status: 200, json: abnahmeOffen }],
    screenshotAusschnitt: { selector: '.harness-im-lauf' },
    screenshotVollseite: true,
    beobachtete: BEOBACHTUNG_ABNAHME,
    schritte: [
      { label: 'Abnahme mit Harness im Lauf', warteAufSelector: { selector: '.harness-im-lauf .harness-abgleich-zeile', timeoutMs: 15000 }, screenshot: '01-zeile.png' },
      { label: 'Tabelle aufgeklappt', klick: '.harness-im-lauf details summary', screenshot: '02-tabelle.png' },
    ],
  }
}
FOLGEN['abnahme-offen-de-1440'] = {
  ...FOLGEN['abnahme-de-1440'],
  anfragenAntworten: [
    { muster: `**/api/workflows/${WORKFLOW}/abnahme`, status: 200, json: abnahmeOffen },
    { muster: `**/api/workflows/${WORKFLOW}/harness-abgleich`, status: 200, json: abgleichMitOffen },
  ],
  schritte: [
    { label: 'Fixture: unbekannter Agent im Lauf (Tabelle aufgeklappt)', warteAufSelector: { selector: '.harness-im-lauf .note.red', timeoutMs: 15000 }, screenshot: '01-offen.png' },
    { label: 'Tabelle zugeklappt', klick: '.harness-im-lauf details summary', screenshot: '02-zugeklappt.png' },
  ],
}
FOLGEN['lauf-detail-de-1440'] = {
  url: `${basis}/#/runs/${ausfuehrungLauf}`,
  viewport: viewport(1440),
  localStorageSetzen: sprache('de'),
  screenshotAusschnitt: { selector: '#lauf-faehigkeiten' },
  screenshotVollseite: true,
  beobachtete: { texte: [{ name: 'Harness', selector: '#lauf-harness-abgleich .harness-abgleich-zeile' }, { name: 'Bereich', selector: '#lauf-harness-abgleich p' }], ueberlauf: true },
  schritte: [
    { label: 'Lauf-Detail geladen', warteAufSelector: { selector: '#lauf-aufklapp', timeoutMs: 15000 } },
    { label: 'Fähigkeiten aufgeklappt', klick: '#lauf-faehigkeiten summary', warteAufSelector: { selector: '#lauf-harness-abgleich .harness-abgleich-zeile', timeoutMs: 15000 }, screenshot: '01-faehigkeiten.png' },
  ],
}
FOLGEN['abnahme-offen-ru-390'] = { ...FOLGEN['abnahme-offen-de-1440'], viewport: viewport(390), localStorageSetzen: sprache('ru') }
FOLGEN['abnahme-offen-de-1440-hell'] = { ...FOLGEN['abnahme-offen-de-1440'], farbschema: 'light' }
FOLGEN['abnahme-offen-de-1440-zoom200'] = { ...FOLGEN['abnahme-offen-de-1440'], zoom: 2 }
FOLGEN['workforce-offen-de-1440-hell'] = { ...FOLGEN['workforce-offen-de-1440'], farbschema: 'light' }
FOLGEN['workforce-de-1440-bewegung'] = { ...FOLGEN['workforce-de-1440'], reduzierteBewegung: true }
FOLGEN['abnahme-vorab-de-1440'] = {
  ...FOLGEN['abnahme-offen-de-1440'],
  anfragenAntworten: [
    { muster: `**/api/workflows/${WORKFLOW}/abnahme`, status: 200, json: { ...abnahmeOffen, workflowStatus: 'KLAERUNG_ERFORDERLICH', freigabeHalt: null } },
    { muster: `**/api/workflows/${WORKFLOW}/harness-abgleich`, status: 200, json: abgleichMitOffen },
  ],
  screenshotAusschnitt: { selector: '.abnahme-vorab' },
  schritte: [{ label: 'Lage vorab: Harness im Vorab-Block', warteAufSelector: { selector: '.abnahme-vorab .harness-im-lauf .note.red', timeoutMs: 15000 }, screenshot: '01-vorab.png' }],
}
FOLGEN['abnahme-offen-de-1440-kachel'] = {
  ...FOLGEN['abnahme-offen-de-1440'],
  screenshotAusschnitt: { selector: '.entscheiden-kacheln' },
  screenshotVollseite: true,
  schritte: [{ label: 'Kachel „Nachweise“ mit Harness-Zeile', warteAufSelector: { selector: '.entscheiden-kacheln .ablauf-status.fehler', timeoutMs: 15000 }, screenshot: '01-kachel.png' }],
}
FOLGEN['startband-cli-de-1440'] = {
  url: `${basis}/#/dashboard`,
  viewport: viewport(1440),
  localStorageSetzen: sprache('de'),
  anfragenAntworten: [{ muster: '**/api/zustand', status: 200, json: { ...zustand, cliHinweis: { art: 'cliVersionGeaendert', installiert: '2.1.300 (Claude Code)', deklariert: '2.1.296 (Claude Code)', anleitung: 'docs/harness/startfreigabe-erneuern.md' } } }],
  screenshotAusschnitt: { selector: '#start-hinweis' },
  beobachtete: { texte: [{ name: 'Band', selector: '#start-hinweis' }, { name: 'Art', selector: '#start-hinweis', attribut: 'data-art' }], sichtbarkeit: [{ name: 'Band sichtbar', id: 'start-hinweis' }] },
  schritte: [{ label: 'Band mit CLI-Hinweis', warteAufSelector: { selector: '#start-hinweis:not([hidden])', timeoutMs: 15000 }, screenshot: '01-band.png' }],
}

for (const [name, folge] of Object.entries(FOLGEN)) {
  if (nur !== undefined && nur !== name) continue
  const ordner = join(ziel, name)
  mkdirSync(ordner, { recursive: true })
  const datei = join(ordner, 'klickfolge.json')
  writeFileSync(datei, `${JSON.stringify(folge, null, 2)}\n`)
  console.log(`\n=== ${name} ===`)
  execFileSync(process.execPath, [join(wurzel, 'scripts', 'render-nachweis.mjs'), datei, ordner], { stdio: 'inherit', cwd: wurzel })
}
