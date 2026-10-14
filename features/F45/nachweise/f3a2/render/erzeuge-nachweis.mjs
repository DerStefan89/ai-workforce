/**
 * Datei: features/F45/nachweise/f3a2/render/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweis F45 F-3a-2 (Muster features/F45/nachweise/f2b2c/render/erzeuge-nachweis.mjs) gegen die Testinstanz
 * features/F45/nachweise/f3a2/instanz.mjs (Port 4199, Fixture-Bestand, neutrale Pfade):
 * - plugins-*: Capability Library → Reiter „Plugins aus deinem Claude Code“ (vorher: nichts geladen) → Liste → Detail „voll“
 *   (Hook- und MCP-Risiko) → Detail „nur-skill“ (scope local, Ordnerbezug) → Detail „kaputt“ (Teilfehler); Varianten
 *   1440/390, de/en/ru/tr, hell/dunkel, Zoom 200 %;
 * - plugins-leer-*: Antwort-Attrappe ok ohne Plugins (eingebaute bleiben);
 * - plugins-unlesbar-*: Antwort-Attrappe status 'fehler' mit Grund bzw. HTTP 500.
 * Schreibt nur in eigene Unterordner.
 *
 * Wird aufgerufen von: Hand, während instanz.mjs läuft — node features/F45/nachweise/f3a2/render/erzeuge-nachweis.mjs [basis] [nurOrdner]
 * Nicht Teil von `npm run check`.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const basis = process.argv[2] ?? 'http://127.0.0.1:4199'
const nur = process.argv[3]
const ziel = dirname(fileURLToPath(import.meta.url))
const wurzel = resolve(ziel, '../../../../..')

/** GET als JSON. @param pfad - API-Pfad @returns JSON */
async function hole(pfad) {
  const antwort = await fetch(`${basis}${pfad}`)
  if (!antwort.ok) throw new Error(`${pfad}: HTTP ${antwort.status}`)
  return antwort.json()
}

const viewport = (breite) => ({ breite, hoehe: breite < 600 ? 844 : 900 })
const sprache = (code) => ({ 'leitstand-sprache': code })
const ZUR_LIBRARY = [
  { label: 'Workforce geladen', warteAufSelector: { selector: '#werkstatt-reiter-faehigkeiten', timeoutMs: 15000 } },
  { label: 'Capability Library', klick: '#werkstatt-reiter-faehigkeiten' },
]
const BEOBACHTUNG = {
  texte: [
    { name: 'lang', selector: 'html', attribut: 'lang' },
    { name: 'Zustand', selector: '#plugins [data-pl-zustand]', attribut: 'data-pl-zustand' },
    { name: 'Hinweis Lauf', selector: '[data-pl-hinweis="f3b"] strong' },
    { name: 'Aktiv (Detail)', selector: '#plugins-detail [data-pl-aktiv]', attribut: 'data-pl-aktiv' },
    { name: 'Fokus', selector: ':focus', attribut: 'data-plugin-index' },
  ],
  vorhanden: [
    { name: 'Tabelle', selector: '#plugins table.pl-tabelle' },
    { name: 'Hook-Risiko', selector: '#plugins-detail [data-pl-risiko="hook_befehl"]' },
    { name: 'MCP-Risiko', selector: '#plugins-detail [data-pl-risiko="mcp_ungepinnt"]' },
    { name: 'Teilfehler', selector: '#plugins-detail [data-pl-fehler]' },
    { name: 'Eingebaut', selector: '#plugins [data-pl-eingebaut]' },
  ],
  ueberlauf: true,
}
// Ab der Korrekturrunde mit Reiterleiste (design-guardian 1) und hoch genug für das ganze Detail bei 390 px (design-guardian 9).
const AUSSCHNITT = { selector: '#werkstatt-bereich-faehigkeiten', hoehe: 4200 }

const FOLGEN = {}
const plugins = (breite, code, extra = {}) => ({
  url: `${basis}/#/capabilities`,
  viewport: viewport(breite),
  localStorageSetzen: sprache(code),
  screenshotAusschnitt: AUSSCHNITT,
  screenshotVollseite: true,
  beobachtete: BEOBACHTUNG,
  schritte: [
    ...ZUR_LIBRARY,
    { label: 'Reiter „Plugins“ gewählt → Liste', klick: '#faehigkeiten-reiter-plugins', warteAufSelector: { selector: '#plugins table.pl-tabelle', timeoutMs: 15000 }, screenshot: '01-liste.png' },
    { label: 'Detail „voll“ (Hook- und MCP-Risiko)', klick: '#plugins .library-name[data-plugin-index="0"]', warteAufSelector: { selector: '#plugins-detail [data-pl-risiko="hook_befehl"]', timeoutMs: 5000 }, screenshot: '02-detail-voll.png' },
    { label: 'Hooks aufgeklappt', klick: '#plugins-detail details[data-pl-teil="hooks"] > summary' },
    { label: 'MCP-Server aufgeklappt', klick: '#plugins-detail details[data-pl-teil="mcp"] > summary', screenshot: '02b-detail-voll-hooks-mcp.png' },
    { label: 'Detail „nur-skill“ (scope local)', klick: '#plugins .library-name[data-plugin-index="1"]', warteAufSelector: { selector: '#plugins-detail [data-pl-aktiv="ordner"]', timeoutMs: 5000 }, screenshot: '03-detail-lokal.png' },
    { label: 'Detail „kaputt“ (Teilfehler)', klick: '#plugins .library-name[data-plugin-index="3"]', warteAufSelector: { selector: '#plugins-detail [data-pl-fehler]', timeoutMs: 5000 }, screenshot: '04-detail-teilfehler.png' },
  ],
  ...extra,
})
FOLGEN['plugins-de-1440'] = plugins(1440, 'de', { farbschema: 'dark' })
FOLGEN['plugins-de-1440-hell'] = plugins(1440, 'de', { farbschema: 'light' })
FOLGEN['plugins-de-390'] = plugins(390, 'de', { farbschema: 'dark' })
FOLGEN['plugins-en-390-hell'] = plugins(390, 'en', { farbschema: 'light' })
FOLGEN['plugins-ru-390'] = plugins(390, 'ru', { farbschema: 'dark' })
FOLGEN['plugins-tr-1440'] = plugins(1440, 'tr', { farbschema: 'dark' })
FOLGEN['plugins-de-1440-zoom200'] = plugins(1440, 'de', { farbschema: 'dark', zoom: 2 })

const echt = await hole('/api/plugins')
const zustand = (breite, code, antworten, warte, extra = {}) => ({
  url: `${basis}/#/capabilities`,
  viewport: viewport(breite),
  localStorageSetzen: sprache(code),
  screenshotAusschnitt: { selector: '#werkstatt-bereich-faehigkeiten', hoehe: 1100 },
  screenshotVollseite: true,
  beobachtete: BEOBACHTUNG,
  anfragenAntworten: antworten,
  schritte: [...ZUR_LIBRARY, { label: 'Reiter „Plugins“ gewählt', klick: '#faehigkeiten-reiter-plugins', warteAufSelector: { selector: warte, timeoutMs: 15000 }, screenshot: '01-zustand.png' }],
  ...extra,
})
const LEER = [{ muster: '**/api/plugins', status: 200, json: { ...echt, plugins: [] } }]
const UNLESBAR = [{ muster: '**/api/plugins', status: 200, json: { status: 'fehler', grund: 'claude plugin list endete mit Exit 1: nicht angemeldet' } }]
const SERVERFEHLER = [{ muster: '**/api/plugins', status: 500, json: { grund: 'interner Fehler' } }]
FOLGEN['plugins-leer-de-1440'] = zustand(1440, 'de', LEER, '#plugins [data-pl-zustand="leer"]', { farbschema: 'dark' })
FOLGEN['plugins-leer-ru-390-hell'] = zustand(390, 'ru', LEER, '#plugins [data-pl-zustand="leer"]', { farbschema: 'light' })
FOLGEN['plugins-unlesbar-de-1440-hell'] = zustand(1440, 'de', UNLESBAR, '#plugins [data-pl-zustand="fehler"]', { farbschema: 'light' })
FOLGEN['plugins-unlesbar-en-390'] = zustand(390, 'en', SERVERFEHLER, '#plugins [data-pl-zustand="fehler"]', { farbschema: 'dark' })

for (const [name, folge] of Object.entries(FOLGEN)) {
  if (nur !== undefined && nur !== name) continue
  const ordner = join(ziel, name)
  mkdirSync(ordner, { recursive: true })
  const datei = join(ordner, 'klickfolge.json')
  writeFileSync(datei, `${JSON.stringify(folge, null, 2)}\n`)
  console.log(`\n=== ${name} ===`)
  execFileSync(process.execPath, [join(wurzel, 'scripts', 'render-nachweis.mjs'), datei, ordner], { stdio: 'inherit', cwd: wurzel })
}
