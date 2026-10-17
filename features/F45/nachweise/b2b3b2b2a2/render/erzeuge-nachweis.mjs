/**
 * Datei: features/F45/nachweise/b2b3b2b2a2/render/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweis F45 B2b-3b-2b-2a-2 „Rückfrage-Kanal: Oberfläche“ gegen die Testinstanz
 * features/F45/nachweise/b2b3b2b2a2/instanz.mjs (Port 4407, neutrale Umgebung, echter Dispatcher mit Projektinstanz). Fälle:
 * - k1-entscheidungen : „Deine Entscheidungen“ mit Kanal-Band, drei Karten (Befehl mehrzeilig mit Zeilennummern, Befehl mit
 *   `<img>`-Text als Text, Frage mit Masken und gesperrter leerer Option) und „Zuletzt entschieden“ mit „nicht aus dem Browser“.
 * - k2-band           : Übersicht — Band mit Anzahl, nächster Frist und Link, Zahl am Navigationspunkt (Advisor V4).
 * - k3-erlauben       : „Einmal erlauben“ im Browser ⇒ Karte verschwindet, „Zuletzt entschieden“ zeigt „aus dem Browser“ (läuft zuletzt,
 *   weil es die Warteschlange verändert).
 * - k4-freitext       : leere freie Antwort ⇒ Fehlermeldung an der Karte; Freitext getippt (Meldung verschwindet), nach 5 s (> 2 Poll-Takte)
 *   noch da (stabiles DOM, Advisor V2).
 * - k5-band-an        : nach „Ablehnen“ und Antwort per Option das Band „an“ ohne Wartende (läuft zuletzt).
 * Ansichten für k1/k2: de 1440 (dunkel), de 1440 hell, de 390, ru 390, tr 390, de 1440 mit Zoom 200 %. Die Pfadprobe des Render-Helfers prüft vor jedem Bild den sichtbaren Text
 * und vor dem Schreiben das Protokoll (F-1125).
 *
 * Aufruf: node features/F45/nachweise/b2b3b2b2a2/render/erzeuge-nachweis.mjs [basis]
 * Wird aufgerufen von: Hand. Nicht Teil von `npm run check`.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const [basis = 'http://127.0.0.1:4407'] = process.argv.slice(2)
const ziel = dirname(fileURLToPath(import.meta.url))
const wurzel = resolve(ziel, '../../../../..')

const BEOBACHTUNG = {
  texte: [
    { name: 'Band', selector: '#rueckfrage-kanal-hinweis' },
    { name: 'Restzeit erste Karte', selector: '#attention-kanal [data-kanal-restzeit]' },
    { name: 'Umfang erster Befehl', selector: '#attention-kanal .rueckfrage-umfang' },
    { name: 'Zuletzt entschieden (erster Eintrag)', selector: '#attention-kanal-zuletzt .rueckfrage-zuletzt-kopf' },
    { name: 'Zahl am Navigationspunkt', selector: '#nav-entscheidungen-zaehler' },
  ],
  vorhanden: [
    { name: 'Kanal-Karte', selector: '#attention-kanal [data-kanal-id]' },
    { name: 'Maske sichtbar', selector: '#attention-kanal .rueckfrage-maske' },
    { name: 'leere Option gesperrt', selector: '#attention-kanal .rueckfrage-option[disabled]' },
    { name: '„nicht aus dem Browser“', selector: '#attention-kanal-zuletzt .nicht-browser .badge.fehler' },
    { name: '<img> aus dem Befehl gerendert (soll false)', selector: '#attention-kanal img' },
    { name: 'Freitext noch da', selector: '#attention-kanal textarea:not(:placeholder-shown)' },
    { name: 'Fehlermeldung an Karte', selector: '#attention-kanal .rueckfrage-meldung.fehler:not([hidden])' },
    { name: 'Fokus in der Kanal-Liste', selector: '#attention-kanal :focus' },
  ],
  ueberlauf: true,
}

const ANSICHTEN = {
  'de-1440': { viewport: { breite: 1440, hoehe: 1800 } },
  'de-1440-hell': { viewport: { breite: 1440, hoehe: 1800 }, farbschema: 'light' },
  'de-390': { viewport: { breite: 390, hoehe: 4200 } },
  'ru-390': { viewport: { breite: 390, hoehe: 4200 }, localStorageSetzen: { 'leitstand-sprache': 'ru' } },
  'tr-390': { viewport: { breite: 390, hoehe: 4200 }, localStorageSetzen: { 'leitstand-sprache': 'tr' } },
  'de-1440-zoom200': { viewport: { breite: 1440, hoehe: 1800 }, zoom: 2 },
}

const WARTE_KARTEN = { selector: '#attention-kanal [data-kanal-id] [data-kanal-restzeit]:not(:empty)', timeoutMs: 15000 }

const folgen = {}
for (const [ansicht, einstellung] of Object.entries(ANSICHTEN)) {
  folgen[`k1-entscheidungen-${ansicht}`] = {
    url: `${basis}/#/attention`,
    ...einstellung,
    screenshotVollseite: true,
    beobachtete: BEOBACHTUNG,
    schritte: [{ label: `Deine Entscheidungen mit Kanal — ${ansicht}`, warteAufSelector: WARTE_KARTEN, screenshot: `01-${ansicht}.webp` }],
  }
  folgen[`k2-band-${ansicht}`] = {
    url: `${basis}/#/dashboard`,
    ...einstellung,
    beobachtete: BEOBACHTUNG,
    schritte: [{ label: `Übersicht: Band mit Anzahl und Link — ${ansicht}`, warteAufSelector: { selector: '#rueckfrage-kanal-hinweis:not([hidden]) a', timeoutMs: 15000 }, screenshot: `01-${ansicht}.webp` }],
  }
}
// Korrekturrunde (code-reviewer 2, qa 4): Freitext überlebt mehrere Poll-Takte (stabiles DOM, Advisor V2); leere Antwort ⇒ Fehlermeldung an
// der Karte. Das Warten nutzt einen nie vorhandenen Selektor (Zeitablauf wird verschluckt) — 5 s ≈ zwei Takte plus Kanal-Abruf.
folgen['k4-freitext-de-1440'] = {
  url: `${basis}/#/attention`,
  ...ANSICHTEN['de-1440'],
  screenshotVollseite: true,
  beobachtete: BEOBACHTUNG,
  schritte: [
    { label: 'Karten geladen', warteAufSelector: WARTE_KARTEN },
    { label: 'leere freie Antwort senden', klick: '#attention-kanal [data-kanal-aktion="frei"]' },
    { label: 'Freitext tippen', tippen: { selector: '#attention-kanal [data-kanal-frei]', text: 'SQLite — reicht für den Export' } },
    { label: '5 s warten (> 2 Poll-Takte)', warteAufSelector: { selector: '#gibt-es-nicht', timeoutMs: 5000 }, screenshot: '01-de-1440.webp' },
  ],
}
folgen['k3-erlauben-de-1440'] = {
  url: `${basis}/#/attention`,
  ...ANSICHTEN['de-1440'],
  screenshotVollseite: true,
  beobachtete: BEOBACHTUNG,
  schritte: [
    { label: 'Karten geladen', warteAufSelector: WARTE_KARTEN },
    { label: '„Einmal erlauben“ auf der ersten Karte', klick: '#attention-kanal [data-kanal-id] [data-entscheidung="einmal_erlauben"]' },
    { label: 'Zuletzt entschieden: aus dem Browser', warteAufSelector: { selector: '#attention-kanal-zuletzt .rueckfrage-zuletzt-eintrag:not(.nicht-browser)', timeoutMs: 15000 }, screenshot: '01-de-1440.webp' },
  ],
}

// Band „an“ ohne Wartende: zuletzt, nachdem die übrigen Rückfragen beantwortet sind (design-guardian 11).
folgen['k5-band-an-de-1440'] = {
  url: `${basis}/#/attention`,
  ...ANSICHTEN['de-1440'],
  beobachtete: BEOBACHTUNG,
  schritte: [
    { label: 'Karten geladen', warteAufSelector: WARTE_KARTEN },
    { label: 'Befehl ablehnen', klick: '#attention-kanal [data-kanal-id] [data-entscheidung="ablehnen"]' },
    { label: 'nur noch die Frage', warteAufSelector: { selector: '#attention-kanal [data-kanal-id]:only-child [data-option-index="0"]', timeoutMs: 15000 } },
    { label: 'Frage: Option SQLite', klick: '#attention-kanal [data-option-index="0"]' },
    { label: 'Übersicht: Band „an“ ohne Wartende', navigiere: '#/dashboard', warteAufSelector: { selector: "#rueckfrage-kanal-hinweis[data-art='an']", timeoutMs: 15000 }, screenshot: '01-de-1440.webp' },
  ],
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
