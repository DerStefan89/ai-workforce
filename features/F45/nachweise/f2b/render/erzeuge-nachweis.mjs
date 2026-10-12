/**
 * Datei: features/F45/nachweise/f2b/render/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweis F45 F-2b-1 (Sammlung im Leitstand, F-1060 (6); Muster features/F45/nachweise/f2a/render/
 * erzeuge-nachweis.mjs) gegen eine laufende Leitstand-Testinstanz — die erneut gestartete Instanz des F-2a-Nachweises
 * (features/F45/nachweise/f2a/instanz-erneut.mjs, Port 4391: echtes Wegwerf-Projekt mit den Läufen L1/L2, Installation =
 * dieses Repo, also die echte Sammlung und der echte Katalog):
 * - sammlung-<sprache>-<breite>: Seite Workforce → Capability Library → Unterreiter „Sammlung“, echte Antwort von
 *   GET /api/sammlung (Liste nach Art, Kennzahlen, Filter);
 * - sammlung-filter: Chip Urteil „Nur Ausnahme“ und Suche „scraper“;
 * - sammlung-detail-zugeordnet / -ausgeschlossen / -bibliothek: aufgeklapptes Detail (Playwright: Katalog playwright-mcp,
 *   „ohne Prüfbericht (vor F-2b freigegeben)“; Vayne: ausgeschlossen mit Grund; Shadcn.ui: Bibliothek, nicht auswählbar);
 * - sammlung-auswaehlbar: Detail eines auswählbaren Repos mit Knopf „Auswählen“ (kommt, F-2b-2);
 * - sammlung-selbstpruefung / sammlung-ladefehler: Band bei Zählabweichung bzw. Fehlerstand (Antwort-Attrappen);
 * - lauf-detail-l1-hash: Lauf-Detail L1, „Fähigkeiten im Lauf“, voller Hash aufgeklappt (F-1060 (6)); -tastatur: per Tastatur
 *   geöffnet und „Kopieren“ (Korrekturrunde, QA 1/7);
 * - sammlung-detail-ausnahme-auswaehlbar, sammlung-filter-lange-urteile, sammlung-tastatur (Korrekturrunde);
 * - scout-karte-sammlung: Scout-Karten mit „Laut Sammlung“, Abweichung und „aus dem Web“ über Antwort-Attrappen;
 * - Varianten für die Design-Prüfung: 390 px (de, ru), hell, Zoom 200 %.
 * Schreibt nur in eigene Unterordner.
 *
 * Wird aufgerufen von: Hand, während instanz-erneut.mjs den Server offen hält —
 *   node features/F45/nachweise/f2b/render/erzeuge-nachweis.mjs [basis] [nurOrdner]
 * Nicht Teil von `npm run check`.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const basis = process.argv[2] ?? 'http://127.0.0.1:4391'
const nur = process.argv[3]
const ziel = dirname(fileURLToPath(import.meta.url))
const wurzel = resolve(ziel, '../../../../..')
const ablaufF2a = JSON.parse(readFileSync(join(wurzel, 'features', 'F45', 'nachweise', 'f2a', 'ablauf.json'), 'utf8'))

/** GET als JSON. @param pfad - API-Pfad @returns JSON */
async function hole(pfad) {
  const antwort = await fetch(`${basis}${pfad}`)
  if (!antwort.ok) throw new Error(`${pfad}: HTTP ${antwort.status}`)
  return antwort.json()
}

const echt = await hole('/api/sammlung')
if (echt.status !== 'ok') throw new Error(`GET /api/sammlung: ${echt.grund}`)
const selbstpruefung = { ...echt, selbstpruefung: ['Selbstprüfung: die Datei nennt 177 Zeilen, gelesen wurden 176', "Selbstprüfung: 'Pilot' — die Datei nennt 18, gelesen wurden 17"] }

const viewport = (breite) => ({ breite, hoehe: breite < 600 ? 844 : 900 })
const sprache = (code) => ({ 'leitstand-sprache': code })
const BEOBACHTUNG = {
  texte: [
    { name: 'lang', selector: 'html', attribut: 'lang' },
    { name: 'Kennzahlen', selector: '#sammlung .sm-kennzahlen' },
    { name: 'Treffer', selector: '#sammlung .sm-treffer' },
    { name: 'Band', selector: '#sammlung .sm-band' },
    { name: 'erste Gruppe', selector: '#sammlung .sm-gruppe h3' },
  ],
  vorhanden: [
    { name: 'Detail offen', selector: '#sammlung details.sm-detail[open]' },
    { name: 'Auswählen (kommt)', selector: '#sammlung details[open] .sm-auswaehlen' },
    { name: 'nicht auswählbar', selector: '#sammlung details[open] .sm-nicht-auswaehlbar' },
    { name: 'ausgeschlossen', selector: '#sammlung details[open] .sm-ausgeschlossen' },
  ],
  ueberlauf: true,
}
const ZUR_SAMMLUNG = [
  { label: 'Workforce geladen', warteAufSelector: { selector: '#werkstatt-reiter-faehigkeiten', timeoutMs: 15000 } },
  { label: 'Capability Library', klick: '#werkstatt-reiter-faehigkeiten' },
]
const sammlungReiter = (screenshot, warte = '#sammlung .sm-gruppe') => ({ label: 'Unterreiter „Sammlung“', klick: '#faehigkeiten-reiter-sammlung', warteAufSelector: { selector: warte, timeoutMs: 15000 }, screenshot })
const detail = (id, screenshot) => ({ label: `Detail ${id} aufgeklappt`, klick: `#sammlung details[data-sm-detail="${id}"] summary`, warteAufSelector: { selector: `#sammlung details[data-sm-detail="${id}"][open]`, timeoutMs: 5000 }, screenshot })

/** Klickfolgen: Name → Konfiguration für scripts/render-nachweis.mjs. */
const FOLGEN = {}
const sammlung = (antwort, schritte, extra = {}) => ({
  url: `${basis}/#/capabilities`,
  viewport: viewport(1440),
  localStorageSetzen: sprache('de'),
  screenshotAusschnitt: { selector: '#faehigkeiten-bereich-sammlung', hoehe: 1300 },
  screenshotVollseite: true,
  beobachtete: BEOBACHTUNG,
  ...(antwort !== null ? { anfragenAntworten: [{ muster: '**/api/sammlung', status: 200, json: antwort }] } : {}),
  schritte: [...ZUR_SAMMLUNG, ...schritte],
  ...extra,
})

for (const [name, code, breite] of [
  ['sammlung-de-1440', 'de', 1440],
  ['sammlung-de-390', 'de', 390],
  ['sammlung-ru-390', 'ru', 390],
  ['sammlung-en-1440', 'en', 1440],
]) {
  FOLGEN[name] = sammlung(null, [sammlungReiter('01-sammlung.png'), detail('plugins-playwright', '02-detail-playwright.png')], { viewport: viewport(breite), localStorageSetzen: sprache(code) })
}
FOLGEN['sammlung-de-1440-hell'] = { ...FOLGEN['sammlung-de-1440'], farbschema: 'light' }
FOLGEN['sammlung-de-1440-zoom200'] = { ...FOLGEN['sammlung-de-1440'], zoom: 2 }
FOLGEN['sammlung-filter'] = sammlung(null, [
  sammlungReiter('01-alle.png'),
  { label: 'Urteil „Nur Ausnahme“', klick: '#sammlung [data-sm-filter="urteil"][data-sm-wert="Nur Ausnahme"]', warteAufSelector: { selector: '#sammlung [data-sm-wert="Nur Ausnahme"][aria-pressed="true"]', timeoutMs: 5000 }, screenshot: '02-nur-ausnahme.png' },
  { label: 'Urteil zurück auf alle', klick: '#sammlung [data-sm-filter="urteil"][data-sm-wert=""]', warteAufSelector: { selector: '#sammlung [data-sm-filter="urteil"][data-sm-wert=""][aria-pressed="true"]', timeoutMs: 5000 } },
  { label: 'Suche „scraper“', tippen: { selector: '#sammlung-suche', text: 'scraper' }, screenshot: '03-suche.png' },
  { label: 'Suche ohne Treffer', tippen: { selector: '#sammlung-suche', text: 'gibt-es-nicht' }, warteAufSelector: { selector: '#sammlung .sm-leer', timeoutMs: 5000 }, screenshot: '04-keine-treffer.png' },
])
FOLGEN['sammlung-detail-ausgeschlossen'] = sammlung(null, [
  sammlungReiter('01-sammlung.png'),
  { label: 'Urteil „Nur Ausnahme“', klick: '#sammlung [data-sm-filter="urteil"][data-sm-wert="Nur Ausnahme"]', warteAufSelector: { selector: '#sammlung tr[data-sm-id="tools-vayne"]', timeoutMs: 5000 } },
  detail('tools-vayne', '02-detail-vayne.png'),
], { screenshotAusschnitt: { selector: '#sammlung tr[data-sm-id="tools-vayne"]' } })
FOLGEN['sammlung-detail-bibliothek'] = sammlung(null, [sammlungReiter('01-sammlung.png'), detail('ui-shadcn-ui', '02-detail-shadcn.png')], { screenshotAusschnitt: { selector: '#sammlung tr[data-sm-id="ui-shadcn-ui"]' } })
FOLGEN['sammlung-detail-auswaehlbar'] = sammlung(null, [sammlungReiter('01-sammlung.png'), detail('repos-peon', '02-detail-peon.png')], { screenshotAusschnitt: { selector: '#sammlung tr[data-sm-id="repos-peon"]' } })
FOLGEN['sammlung-detail-de-390'] = sammlung(null, [sammlungReiter('01-sammlung.png'), detail('ui-shadcn-ui', '02-detail-shadcn.png')], { viewport: viewport(390), screenshotAusschnitt: { selector: '#sammlung tr[data-sm-id="ui-shadcn-ui"]' } })
// QA 3: ausgeschlossen, aber auswählbar (GitHub-Quelle) — Pflicht-Begründung „Ausnahme“ sichtbar.
FOLGEN['sammlung-detail-ausnahme-auswaehlbar'] = sammlung(
  null,
  [
    sammlungReiter('01-sammlung.png'),
    { label: 'Urteil „Nur Ausnahme“', klick: '#sammlung [data-sm-filter="urteil"][data-sm-wert="Nur Ausnahme"]', warteAufSelector: { selector: '#sammlung tr[data-sm-id="repos-nano-pdf"]', timeoutMs: 5000 } },
    detail('repos-nano-pdf', '02-detail-nano-pdf.png'),
  ],
  { screenshotAusschnitt: { selector: '#sammlung tr[data-sm-id="repos-nano-pdf"]' } }
)
// design-guardian 4: lange Urteile („Ausgeschlossen“, „Zurückstellen“) als Chip in der Tabelle.
FOLGEN['sammlung-filter-lange-urteile'] = sammlung(null, [
  sammlungReiter('01-sammlung.png'),
  { label: 'Urteil „Ausgeschlossen“', klick: '#sammlung [data-sm-filter="urteil"][data-sm-wert="Ausgeschlossen"]', warteAufSelector: { selector: '#sammlung [data-sm-wert="Ausgeschlossen"][aria-pressed="true"]', timeoutMs: 5000 }, screenshot: '02-ausgeschlossen.png' },
  { label: 'Urteil „Zurückstellen“', klick: '#sammlung [data-sm-filter="urteil"][data-sm-wert="Zurückstellen"]', warteAufSelector: { selector: '#sammlung [data-sm-wert="Zurückstellen"][aria-pressed="true"]', timeoutMs: 5000 }, screenshot: '03-zurueckstellen.png' },
])
// QA 7: Bedienung per Tastatur — Chip mit Enter, Detail mit Enter, Suche mit Tippen.
FOLGEN['sammlung-tastatur'] = sammlung(null, [
  sammlungReiter('01-sammlung.png'),
  { label: 'Fokus auf Chip „Pilot“, Enter', fokus: '#sammlung [data-sm-filter="urteil"][data-sm-wert="Pilot"]', taste: 'Enter', warteAufSelector: { selector: '#sammlung [data-sm-wert="Pilot"][aria-pressed="true"]', timeoutMs: 5000 }, screenshot: '02-chip-enter.png' },
  { label: 'Fokus auf „Details“ der ersten Pilot-Zeile, Enter', fokus: '#sammlung tr.sm-zeile details summary', taste: 'Enter', warteAufSelector: { selector: '#sammlung details.sm-detail[open]', timeoutMs: 5000 }, screenshot: '03-detail-enter.png' },
])
FOLGEN['sammlung-selbstpruefung'] = sammlung(selbstpruefung, [sammlungReiter('01-band.png', '#sammlung [data-sm-band="selbstpruefung"]')])
FOLGEN['sammlung-ladefehler'] = sammlung({ status: 'fehler', grund: 'docs/harness/kandidaten-2026-09-15.md: Zeile 142: Tabellenkopf weicht ab (Fixture für den Render-Nachweis)' }, [
  sammlungReiter('01-fehler.png', '#sammlung [data-sm-band="fehler"]'),
])

const laufDetail = (extra = {}) => ({
  url: `${basis}/#/runs/${ablaufF2a.laeufe.l1}`,
  viewport: viewport(1440),
  localStorageSetzen: sprache('de'),
  screenshotAusschnitt: { selector: '#lauf-faehigkeiten' },
  screenshotVollseite: true,
  beobachtete: { texte: [{ name: 'erster voller Hash', selector: '.faehigkeiten-im-lauf .fp-hash-voll[open] code' }], vorhanden: [{ name: 'Hash aufgeklappt', selector: '.faehigkeiten-im-lauf .fp-hash-voll[open]' }], ueberlauf: true },
  schritte: [
    { label: 'Lauf-Detail geladen', warteAufSelector: { selector: '#lauf-faehigkeiten', timeoutMs: 15000 } },
    { label: 'Fähigkeiten aufgeklappt', klick: '#lauf-faehigkeiten summary', warteAufSelector: { selector: '.faehigkeiten-im-lauf', timeoutMs: 15000 }, screenshot: '01-faehigkeiten-im-lauf.png' },
    { label: 'Voller Hash per Klick auf „ganzer Hash“', klick: '.faehigkeiten-im-lauf .fp-hash-voll summary', warteAufSelector: { selector: '.faehigkeiten-im-lauf .fp-hash-voll[open]', timeoutMs: 5000 }, screenshot: '02-hash-voll.png' },
  ],
  ...extra,
})
FOLGEN['lauf-detail-l1-hash'] = laufDetail()
FOLGEN['lauf-detail-l1-hash-tastatur'] = laufDetail({
  beobachtete: {
    texte: [{ name: 'Knopf', selector: '.faehigkeiten-im-lauf .fp-hash-voll[open] .hash-kopieren' }],
    vorhanden: [{ name: 'Hash aufgeklappt', selector: '.faehigkeiten-im-lauf .fp-hash-voll[open]' }, { name: 'Hinweis Strg+C sichtbar', selector: '.faehigkeiten-im-lauf .hash-kopieren-hinweis:not([hidden])' }],
    ueberlauf: true,
  },
  schritte: [
    { label: 'Lauf-Detail geladen', warteAufSelector: { selector: '#lauf-faehigkeiten', timeoutMs: 15000 } },
    { label: 'Fähigkeiten aufgeklappt', klick: '#lauf-faehigkeiten summary', warteAufSelector: { selector: '.faehigkeiten-im-lauf', timeoutMs: 15000 } },
    { label: 'Fokus „ganzer Hash“, Enter', fokus: '.faehigkeiten-im-lauf .fp-hash-voll summary', taste: 'Enter', warteAufSelector: { selector: '.faehigkeiten-im-lauf .fp-hash-voll[open]', timeoutMs: 5000 }, screenshot: '01-hash-enter.png' },
    { label: 'Fokus „Kopieren“, Enter (ohne Freigabe der Zwischenablage → markiert + Hinweis bzw. „Kopiert“)', fokus: '.faehigkeiten-im-lauf .fp-hash-voll[open] .hash-kopieren', taste: 'Enter', screenshot: '02-kopieren.png' },
  ],
})
FOLGEN['lauf-detail-l1-hash-390'] = laufDetail({ viewport: viewport(390) })
FOLGEN['lauf-detail-l1-hash-zoom200'] = laufDetail({ zoom: 2 })

const abdeckung = await hole('/api/ressourcen/abdeckung')
const mitLuecke = {
  ...abdeckung,
  rollen: abdeckung.rollen.map((rolle, i) => (i === 0 ? { ...rolle, gedeckt: false, workerAbdeckung: rolle.workerAbdeckung.map((w, j) => (j === 0 ? { ...w, fehlend: ['UI_VISUAL_TESTING'], restFehlend: ['UI_VISUAL_TESTING'] } : w)) } : rolle)),
}
const KANDIDAT = (name, url, extra) => ({ name, typ: 'extern', quelle_url: url, capabilities: ['UI_VISUAL_TESTING'], fit: 'hoch', integrationsaufwand: 'mittel', rechte: 'Browser-Steuerung', risiken: [], empfehlung: 'Vergleichen und vormerken.', unsicherheiten: [], ...extra })
const scoutDetail = {
  laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' },
  scoutErgebnis: {
    status: 'ok',
    ergebnis: {
      gesuchte_capability: 'UI_VISUAL_TESTING',
      hinweis_untrusted: true,
      kandidaten: [
        KANDIDAT('Playwright', 'https://github.com/microsoft/playwright-mcp', { lizenz: 'Apache-2.0 (GitHub-Metadaten)', quelle: 'sammlung', urteil_sammlung: 'Aufnehmen' }),
        KANDIDAT('Spline', 'https://spline.design/pricing', { quelle: 'sammlung', urteil_sammlung: 'Optional' }),
        KANDIDAT('Neuer Kandidat', 'https://github.com/beispiel/neu', { quelle: 'web' }),
      ],
    },
  },
  scoutSammlung: [
    { treffer: { id: 'plugins-playwright', name: 'Playwright', urteil: 'Aufnehmen', lizenz: 'Apache-2.0 (GitHub-Metadaten)' }, abweichung: false },
    { treffer: { id: 'ui-spline', name: 'Spline', urteil: 'Nur Ausnahme', lizenz: 'Proprietär' }, abweichung: true },
    { treffer: null, abweichung: false },
  ],
}
FOLGEN['scout-karte-sammlung'] = {
  url: `${basis}/#/capabilities`,
  viewport: viewport(1440),
  localStorageSetzen: sprache('de'),
  screenshotAusschnitt: { selector: '#capabilities-scout' },
  screenshotVollseite: true,
  beobachtete: { texte: [{ name: 'erste Sammlungszeile', selector: '#capabilities-scout .scout-sammlung-zeile' }], vorhanden: [{ name: 'Abweichung', selector: '#capabilities-scout .scout-sammlung-abweichung' }], ueberlauf: true },
  anfragenAntworten: [
    { muster: '**/api/ressourcen/abdeckung', status: 200, json: mitLuecke },
    { muster: '**/api/auftraege', methode: 'POST', status: 201, json: { auftragId: 'render-scout' } },
    { muster: '**/api/laeufe', methode: 'POST', status: 202, json: { laufId: 'scout-render' } },
    { muster: '**/api/laeufe/scout-*', status: 200, json: scoutDetail },
  ],
  schritte: [
    ...ZUR_SAMMLUNG,
    { label: 'Rollen & Besetzung', klick: '#faehigkeiten-reiter-rollen', warteAufSelector: { selector: '.capabilities-scout-link', timeoutMs: 15000 } },
    { label: '„Kandidaten suchen“ (Attrappen für Auftrag, Lauf, Detail)', klick: '.capabilities-scout-link', warteAufSelector: { selector: '#capabilities-scout .scout-karte', timeoutMs: 20000 }, screenshot: '01-scout-karten.png' },
  ],
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
