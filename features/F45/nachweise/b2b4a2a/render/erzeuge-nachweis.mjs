/**
 * Datei: features/F45/nachweise/b2b4a2a/render/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweis F45 B2b-4a-2a „Blockform“ (features/F45/plan-b2b4a2a.md §5): #/code bei 390 px, de, dunkel und hell —
 * Karte „Sichern“ (commit-Block mit langer git-add-Zeile, push-Block) und „Prüfstand“ in der Blockform „& { Set-Location … }“
 * mit dem Hinweis „Nach dem Einfügen einmal Enter drücken“ unter jedem Block, dazu „Kopieren“ (Zwischenablage im Protokoll) und
 * scrollWidth/clientWidth. Gegen die neutrale Testinstanz von 2a-3 (features/F45/nachweise/b2b3b2b2a3/instanz.mjs, Port 4408 —
 * liefert Seite und Zustand); GET …/api/code kommt als feste Antwort mit neutralem Pfad (C:\Projekte\haushaltsbuch). Die
 * Pfadprobe des Render-Helfers prüft vor jedem Bild den sichtbaren Text (F-1125).
 *
 * Aufruf: Testinstanz starten (node features/F45/nachweise/b2b3b2b2a3/instanz.mjs), dann
 * node features/F45/nachweise/b2b4a2a/render/erzeuge-nachweis.mjs [basis]
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
  'de-390': { viewport: { breite: 390, hoehe: 1600 } },
  'de-390-hell': { viewport: { breite: 390, hoehe: 1600 }, farbschema: 'light' },
}

/** Viele neue Dateien mit langen Pfaden ⇒ eine lange git-add-Zeile (Advisor-Delta 4a 17). */
const EINTRAEGE = [
  ...Array.from({ length: 14 }, (_, i) => ({ pfad: `src/export/monatsuebersicht/formatierung/spalten-${String(i + 1).padStart(2, '0')}-betrag-und-kategorie.ts`, art: '??', xy: '??', plus: 12 + i, minus: null })),
  { pfad: 'docs/haushaltsbuch export (entwurf).md', art: 'M', xy: ' M', plus: 4, minus: 1 },
]
const CODE = {
  status: 'ok',
  absoluterPfad: String.raw`C:\Projekte\haushaltsbuch`,
  arbeitsverzeichnis: { vorhanden: true },
  branch: { status: 'ok', name: 'feat/f45-b2b4a2a-blockform', losgeloest: false, commit: 'abc1234def5678' },
  basis: { status: 'ok', ref: 'origin/main', voraus: 1, zurueck: 0 },
  remoteWebUrl: { status: 'ok', url: null, origin: true },
  dateien: { status: 'ok', eintraege: EINTRAEGE, anzahl: EINTRAEGE.length, gekappt: false },
  verlauf: { status: 'ok', ref: 'origin/main', eintraege: [] },
  freigabeCommit: { status: 'ok', vorhanden: false, alterMinuten: null },
  harness: { status: 'ok', claudeMd: true, settings: true, hooks: 5, agents: 5 },
  startvorlage: { status: 'ok', pfad: 'startvorlagen/beispielprojekt.json', pruefbefehl: 'npm run check', werkzeugsaetze: ['lesend'], worker: ['claude-code'], modell: 'claude-sonnet' },
}

const warte = (selector, timeoutMs = 15000) => ({ warteAufSelector: { selector, timeoutMs } })

const BEOBACHTUNG = {
  texte: [
    { name: 'Sichern, erster Block, Zeile 1', selector: '.code-sichern .befehlsblock .befehlsblock-zeile' },
    { name: 'Enter-Hinweis', selector: '.code-sichern .befehlsblock-enter' },
    { name: 'Anzahl', selector: '.code-sichern .befehlsblock-anzahl' },
    { name: 'Knopf', selector: '.code-sichern .befehlsblock-kopieren' },
  ],
  vorhanden: [
    { name: 'Hinweis unter Prüfstand-Block', selector: '.code-pruef-kacheln ~ .befehlsblock .befehlsblock-enter' },
    { name: 'zweiter Sichern-Block (push)', selector: '.code-sichern .befehlsblock + .befehlsblock' },
  ],
  ueberlauf: true,
}

/**
 * Klickfolge in einer Ansicht.
 * @param ansicht - Ansichtsname
 * @param einstellung - Viewport/Farbschema
 * @returns Klickfolge
 */
function folge(ansicht, einstellung) {
  return {
    url: `${basis}/#/code`,
    ...einstellung,
    screenshotVollseite: true,
    zwischenablage: true,
    localStorageSetzen: { 'leitstand-chat-offen': 'false' },
    anfragenAntworten: [{ muster: '**/api/code', json: CODE }],
    beobachtete: BEOBACHTUNG,
    schritte: [
      { label: `#/code: Sichern und Prüfstand in Blockform — ${ansicht}`, ...warte('.code-sichern .befehlsblock-enter'), screenshot: `01-${ansicht}.webp` },
      { label: `„Kopieren“ am commit-Block — ${ansicht}`, klick: '.code-sichern .befehlsblock-kopieren', ...warte('.code-sichern .befehlsblock-kopieren'), screenshot: `02-${ansicht}.webp` },
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
