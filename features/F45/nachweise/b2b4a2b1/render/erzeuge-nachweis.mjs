/**
 * Datei: features/F45/nachweise/b2b4a2b1/render/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweis F45 B2b-4a-2b-1 „Regeln und node_modules“ (features/F45/plan-b2b4a2b.md): #/code de bei 390 und 1440 px (ru bei 390),
 * dunkel und hell — Lage „node_modules ausgelassen“ (Dateiliste mit getrackter node_modules-Datei, Hinweis „node_modules
 * ausgelassen – fehlt in .gitignore“ unter der Liste, Sichern-Block ohne neue node_modules-Dateien und Hinweis „nie in git add“)
 * und Lage „nur node_modules offen“ (eigener Text statt „sauber“). scrollWidth/clientWidth im Protokoll. Gegen die neutrale
 * Testinstanz von 2a-3 (features/F45/nachweise/b2b3b2b2a3/instanz.mjs, Port 4408, neutrales HOME/TEMP — liefert Seite und
 * Zustand); GET …/api/code kommt als feste Antwort mit neutralem Pfad (C:\Projekte\haushaltsbuch). Die Pfadprobe des
 * Render-Helfers prüft vor jedem Bild den sichtbaren Text (F-1125).
 *
 * Aufruf: Testinstanz starten (node features/F45/nachweise/b2b3b2b2a3/instanz.mjs), dann
 * node features/F45/nachweise/b2b4a2b1/render/erzeuge-nachweis.mjs [basis]
 * Wird aufgerufen von: Hand. Nicht Teil von `npm run check`.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const [basis = 'http://127.0.0.1:4408'] = process.argv.slice(2)
const ziel = dirname(fileURLToPath(import.meta.url))
const wurzel = resolve(ziel, '../../../../..')

const ANSICHTEN = {
  'de-390-dunkel': { viewport: { breite: 390, hoehe: 1600 }, farbschema: 'dark' },
  'de-390-hell': { viewport: { breite: 390, hoehe: 1600 }, farbschema: 'light' },
  'de-1440-dunkel': { viewport: { breite: 1440, hoehe: 1100 }, farbschema: 'dark' },
  'de-1440-hell': { viewport: { breite: 1440, hoehe: 1100 }, farbschema: 'light' },
  // Längster Text (Design-Prüfung 6).
  'ru-390-dunkel': { viewport: { breite: 390, hoehe: 1600 }, farbschema: 'dark', sprache: 'ru' },
}

/**
 * Antwort von GET …/api/code wie nach routen-code.mjs leseDateien: 1 532 neue Dateien unter node_modules ausgelassen
 * (nodeModules), die getrackte node_modules/vendored-datum/index.js bleibt in der Liste.
 * @param eintraege - dateien.eintraege
 * @param nodeModules - Anzahl ausgelassener neuer node_modules-Dateien
 * @returns Antwort
 */
function code(eintraege, nodeModules) {
  return {
    status: 'ok',
    absoluterPfad: String.raw`C:\Projekte\haushaltsbuch`,
    arbeitsverzeichnis: { vorhanden: true },
    branch: { status: 'ok', name: 'feat/f45-b2b4a2b1-regeln', losgeloest: false, commit: 'abc1234def5678' },
    basis: { status: 'ok', ref: 'origin/main', voraus: 1, zurueck: 0 },
    remoteWebUrl: { status: 'ok', url: null, origin: true },
    dateien: { status: 'ok', eintraege, anzahl: eintraege.length, gekappt: false, nodeModules },
    verlauf: { status: 'ok', ref: 'origin/main', eintraege: [] },
    freigabeCommit: { status: 'ok', vorhanden: false, alterMinuten: null },
    harness: { status: 'ok', claudeMd: true, settings: true, hooks: 5, agents: 5 },
    startvorlage: { status: 'ok', pfad: 'startvorlagen/beispielprojekt.json', pruefbefehl: 'npm run check', werkzeugsaetze: ['lesend'], worker: ['claude-code'], modell: 'claude-sonnet' },
  }
}

const AUSGELASSEN = code(
  [
    { pfad: 'src/export/monatsuebersicht.ts', art: 'M', xy: ' M', plus: 18, minus: 4 },
    { pfad: 'src/export/kategorien.ts', art: '??', xy: '??', plus: 41, minus: null },
    { pfad: 'node_modules/vendored-datum/index.js', art: 'M', xy: ' M', plus: 2, minus: 2 },
  ],
  1532
)
const NUR_NODE_MODULES = code([], 1532)

const warte = (selector, timeoutMs = 15000) => ({ warteAufSelector: { selector, timeoutMs } })

const BEOBACHTUNG = {
  texte: [
    { name: 'Hinweis unter der Dateiliste', selector: '.code-node-modules' },
    { name: 'Text der leeren Liste', selector: '.code-sauber' },
    { name: 'Sichern, Grund/Hinweis', selector: '.code-sichern .code-sichern-grund' },
    { name: 'Sichern, erster Block, Zeile 3', selector: '.code-sichern .befehlsblock .befehlsblock-zeile:nth-child(3)' },
  ],
  vorhanden: [{ name: 'Sichern-Block', selector: '.code-sichern .befehlsblock' }],
  ueberlauf: true,
}

/**
 * Klickfolge in einer Ansicht.
 * @param ansicht - Ansichtsname
 * @param einstellung - Viewport/Farbschema
 * @returns Klickfolge
 */
function folge(ansicht, { sprache = 'de', ...einstellung }) {
  return {
    url: `${basis}/#/code`,
    ...einstellung,
    screenshotVollseite: true,
    localStorageSetzen: { 'leitstand-chat-offen': 'false', 'leitstand-sprache': sprache },
    anfragenAntworten: [{ muster: '**/api/code', json: AUSGELASSEN }],
    beobachtete: BEOBACHTUNG,
    schritte: [
      { label: `#/code: node_modules ausgelassen — ${ansicht}`, ...warte('.code-node-modules'), screenshot: `01-${ansicht}.webp` },
      { label: `#/code: nur node_modules offen — ${ansicht}`, anfragenAntworten: [{ muster: '**/api/code', json: NUR_NODE_MODULES }], reload: true, ...warte('.code-node-modules'), screenshot: `02-${ansicht}.webp` },
    ],
  }
}

for (const [ansicht, einstellung] of Object.entries(ANSICHTEN)) {
  const verzeichnis = join(ziel, `code-${ansicht}`)
  mkdirSync(verzeichnis, { recursive: true })
  for (const eintrag of readdirSync(verzeichnis)) if (/\.(webp|png)$|^protokoll\./.test(eintrag)) rmSync(join(verzeichnis, eintrag))
  const datei = join(verzeichnis, 'klickfolge.json')
  writeFileSync(datei, `${JSON.stringify(folge(ansicht, einstellung), null, 2)}\n`)
  console.log(`\n=== code-${ansicht} ===`)
  execFileSync(process.execPath, [join(wurzel, 'scripts/render-nachweis.mjs'), datei, verzeichnis], { stdio: 'inherit', cwd: wurzel })
}
