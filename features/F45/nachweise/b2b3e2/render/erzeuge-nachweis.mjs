/**
 * Datei: features/F45/nachweise/b2b3e2/render/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweis F45 B2b-3e-2 „Budget-Feld + eine Regel für Bereiche“ gegen die Testinstanz
 * features/F45/nachweise/b2b3e2/instanz.mjs (Port 4406, neutrale Umgebung). Je Ansicht de 1440, de 390, ru 390 und de 1440 hell,
 * Ausschnitt
 * `#auftrag-formular`:
 * - f1-felder : „Vereinbarte Bereiche“ und „Token-Budget“ aufgeklappt, Hinweis mit den Standards der drei Kontrolltiefen.
 * - f2-budget : Budget `1,5`, „Ablauf vorbereiten“ ⇒ Fehlerzeile „keine ganze Zahl ab 1“, Feld bleibt aufgeklappt.
 * - f3-muster : Bereich `src/*.ts`, „Ablauf vorbereiten“ ⇒ Fehlerzeile mit dem Grund „Muster“ (F-1123 (9)).
 * Kein Schritt löst einen gültigen POST aus. Die Pfadprobe des Render-Helfers prüft vor jedem Bild den sichtbaren Text
 * der ganzen Seite und vor dem Schreiben das Protokoll (F-1125).
 *
 * Aufruf: node features/F45/nachweise/b2b3e2/render/erzeuge-nachweis.mjs [basis]
 * Wird aufgerufen von: Hand. Nicht Teil von `npm run check`.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const [basis = 'http://127.0.0.1:4406'] = process.argv.slice(2)
const ziel = dirname(fileURLToPath(import.meta.url))
const wurzel = resolve(ziel, '../../../../..')

const BEOBACHTUNG = {
  texte: [
    { name: 'Hinweis Budget', selector: '#auftrag-budget-hinweis' },
    { name: 'Fehlerzeile', selector: '#auftrag-anlegen-fehler' },
    { name: 'Projektordner', selector: '.umgebung-pfad' },
  ],
  vorhanden: [
    { name: 'Bereiche aufgeklappt', selector: '#auftrag-bereiche-bereich[open]' },
    { name: 'Budget aufgeklappt', selector: '#auftrag-budget-bereich[open]' },
    { name: 'Fehlerzeile sichtbar', selector: '#auftrag-anlegen-fehler:not([hidden])' },
  ],
  ueberlauf: true,
}

/** Ansichten; ru-390 und de-1440-hell aus der Korrekturrunde (design-guardian 1: längerer ru-Text, helles Schema). */
const ANSICHTEN = {
  'de-1440': { viewport: { breite: 1440, hoehe: 1600 } },
  'de-390': { viewport: { breite: 390, hoehe: 3600 } },
  'ru-390': { viewport: { breite: 390, hoehe: 3600 }, localStorageSetzen: { 'leitstand-sprache': 'ru' } },
  'de-1440-hell': { viewport: { breite: 1440, hoehe: 1600 }, farbschema: 'light' },
}

/** Gemeinsamer Anfang: Seite geladen, Titel und Ergebnis ausgefüllt, beide Felder aufgeklappt. */
const ANFANG = [
  { label: 'Formular geladen', warteAufSelector: { selector: '#auftrag-budget-bereich > summary', timeoutMs: 10000 }, tippen: { selector: '#auftrag-titel', text: 'CSV-Export' } },
  { label: 'Ergebnis', tippen: { selector: '#auftrag-auftragstext', text: 'Füge einen CSV-Export hinzu.' } },
  { label: 'Bereiche aufklappen', klick: '#auftrag-bereiche-bereich > summary' },
  { label: 'Budget aufklappen', klick: '#auftrag-budget-bereich > summary' },
]

const folgen = {}
for (const [ansicht, einstellung] of Object.entries(ANSICHTEN)) {
  const gemeinsam = { url: `${basis}/#/projekt`, ...einstellung, screenshotVollseite: true, screenshotAusschnitt: { selector: '#auftrag-formular' }, beobachtete: BEOBACHTUNG }
  folgen[`f1-felder-${ansicht}`] = { ...gemeinsam, schritte: [...ANFANG, { label: `Felder mit Hinweis — ${ansicht}`, tippen: { selector: '#auftrag-bereiche', text: 'src/export/\ndocs/' }, screenshot: `01-${ansicht}.webp` }] }
  folgen[`f2-budget-${ansicht}`] = {
    ...gemeinsam,
    schritte: [
      ...ANFANG,
      { label: 'Budget 1,5', tippen: { selector: '#auftrag-budget', text: '1,5' } },
      { label: `„Ablauf vorbereiten“ ⇒ Fehlerzeile Budget — ${ansicht}`, klick: '#auftrag-ablauf-vorbereiten', warteAufSelector: { selector: '#auftrag-anlegen-fehler:not([hidden])', timeoutMs: 5000 }, screenshot: `01-${ansicht}.webp` },
    ],
  }
  folgen[`f3-muster-${ansicht}`] = {
    ...gemeinsam,
    schritte: [
      ...ANFANG,
      { label: 'Bereich src/*.ts', tippen: { selector: '#auftrag-bereiche', text: 'src/*.ts' } },
      { label: `„Ablauf vorbereiten“ ⇒ Fehlerzeile Muster — ${ansicht}`, klick: '#auftrag-ablauf-vorbereiten', warteAufSelector: { selector: '#auftrag-anlegen-fehler:not([hidden])', timeoutMs: 5000 }, screenshot: `01-${ansicht}.webp` },
    ],
  }
}

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
