/**
 * Datei: features/F45/nachweise/f3b1/render/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweis F45 F-3b-1b (Muster features/F45/nachweise/f3a2/render/erzeuge-nachweis.mjs) gegen die Testinstanz
 * features/F45/nachweise/f3b1/instanz.mjs (Port 4199, nur Fixtures, neutrale Pfade, Prüflauf-Attrappe):
 * - f3b1-ablauf-*: echter Klickablauf im Browser je Variante (frischer Durchgang): Reiter „Plugins“ → Detail „kraft“ (übernommen /
 *   nicht übernommen mit Grund) → „Kopie prüfen“ → Prüfbericht MIT_AUFLAGEN → „Freigeben“ → freigegeben → Kästchen
 *   „debuggen · Ausführung“ → zugeordnet. Varianten 1440/390, hell/dunkel, de/ru/en;
 * - f3b1-veraltet-*, f3b1-gesperrt-*, f3b1-fehler-*: Zustände über Antwort-Attrappen, abgeleitet aus dem echten Stand nach
 *   Prüfung/Freigabe/Zuordnung (veraltet mit gespeicherter Zuordnung; Lauf aktiv sperrt; Freigabe 409 mit Grund).
 * Schreibt nur in eigene Unterordner.
 *
 * Wird aufgerufen von: Hand, während instanz.mjs läuft — node features/F45/nachweise/f3b1/render/erzeuge-nachweis.mjs [basis] [nurOrdner]
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

/**
 * Anfrage als JSON.
 * @param methode - GET | POST
 * @param pfad - Pfad
 * @param body - Körper
 * @returns { status, json }
 */
async function anfrage(methode, pfad, body) {
  // Eine vom vorigen Browser-Lauf gehaltene Verbindung kann einmal zurückgesetzt werden — bis zu drei Versuche.
  for (let versuch = 1; ; versuch++) {
    try {
      const a = await fetch(`${basis}${pfad}`, { method: methode, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) })
      return { status: a.status, json: await a.json().catch(() => ({})) }
    } catch (fehler) {
      if (versuch >= 3) throw fehler
      await new Promise((r) => setTimeout(r, 500))
    }
  }
}

const viewport = (breite) => ({ breite, hoehe: breite < 600 ? 844 : 900 })
const sprache = (code) => ({ 'leitstand-sprache': code })
const ZUR_LIBRARY = [
  { label: 'Workforce geladen', warteAufSelector: { selector: '#werkstatt-reiter-faehigkeiten', timeoutMs: 15000 } },
  { label: 'Capability Library', klick: '#werkstatt-reiter-faehigkeiten' },
  { label: 'Reiter „Plugins“ gewählt → Liste', klick: '#faehigkeiten-reiter-plugins', warteAufSelector: { selector: '#plugins table.pl-tabelle', timeoutMs: 15000 } },
]
const BEOBACHTUNG = {
  texte: [
    { name: 'lang', selector: 'html', attribut: 'lang' },
    { name: 'Freigabe', selector: '#plugins-detail [data-pl-freigabe]', attribut: 'data-pl-freigabe' },
    { name: 'Bericht', selector: '#plugins-detail [data-pl-bericht]', attribut: 'data-pl-bericht' },
    { name: 'Aktion', selector: '#plugins-detail [data-pl-aktion-status]', attribut: 'data-pl-aktion-status' },
    { name: 'Hinweis Lauf', selector: '[data-pl-hinweis="f3b"] strong' },
    { name: 'Fokus (Element)', selector: ':focus', attribut: 'data-pl-fokus' },
    { name: 'Fokus (Knopf)', selector: ':focus', attribut: 'data-pl-aktion' },
    { name: 'Fokus (id)', selector: ':focus', attribut: 'id' },
    { name: 'Fokus (Kästchen)', selector: ':focus', attribut: 'data-pl-name' },
    { name: 'Live-Region', selector: '#plugins-status' },
  ],
  vorhanden: [
    { name: 'Übernommen', selector: '#plugins-detail [data-pl-uebernommen]' },
    { name: 'Nicht übernommen (Hook)', selector: '#plugins-detail [data-pl-grund="hook_nie"]' },
    { name: 'Prüfen bedienbar', selector: '#plugins-detail [data-pl-aktion="pruefen"]:not([disabled])' },
    { name: 'Freigeben bedienbar', selector: '#plugins-detail [data-pl-aktion="freigeben"]:not([disabled])' },
    { name: 'Zurücknehmen bedienbar', selector: '#plugins-detail [data-pl-aktion="zuruecknehmen"]:not([disabled])' },
    { name: 'debuggen zugeordnet', selector: '#plugins-detail input[data-pl-name="debuggen"]:checked' },
    { name: 'Kästchen bedienbar', selector: '#plugins-detail input[data-pl-zuordnung]:not([disabled])' },
    { name: 'Sperre', selector: '#plugins-detail [data-pl-sperre]' },
    { name: 'Verwaist', selector: '#plugins [data-pl-verwaist]' },
  ],
  ueberlauf: true,
}
const AUSSCHNITT = { selector: '#werkstatt-bereich-faehigkeiten', hoehe: 5200 }
const KRAFT = '#plugins .library-name[data-plugin-index="0"]'

const FOLGEN = {}
const ablauf = (breite, code, extra = {}) => ({
  url: `${basis}/#/capabilities`,
  viewport: viewport(breite),
  localStorageSetzen: sprache(code),
  screenshotAusschnitt: AUSSCHNITT,
  screenshotVollseite: true,
  beobachtete: BEOBACHTUNG,
  neuerDurchgang: true,
  schritte: [
    ...ZUR_LIBRARY,
    { label: 'Detail „kraft“: übernommen / nicht übernommen', klick: KRAFT, warteAufSelector: { selector: '#plugins-detail [data-pl-wf="uebernahme"]', timeoutMs: 5000 }, screenshot: '01-detail-uebernahme.png' },
    { label: '„Kopie prüfen“ → Prüfbericht', klick: '#plugins-detail [data-pl-aktion="pruefen"]', warteAufSelector: { selector: '#plugins-detail [data-pl-bericht="passt"]', timeoutMs: 30000 }, screenshot: '02-pruefbericht.png' },
    { label: '„Freigeben“ → freigegeben', klick: '#plugins-detail [data-pl-aktion="freigeben"]', warteAufSelector: { selector: '#plugins-detail [data-pl-freigabe="freigegeben"]', timeoutMs: 15000 }, screenshot: '03-freigegeben.png' },
    { label: 'Kästchen „debuggen · Ausführung“ → zugeordnet', klick: '#plugins-detail input[data-pl-name="debuggen"]', warteAufSelector: { selector: '#plugins-detail input[data-pl-name="debuggen"]:checked', timeoutMs: 15000 }, screenshot: '04-zugeordnet.png' },
  ],
  ...extra,
})
FOLGEN['f3b1-ablauf-de-1440'] = ablauf(1440, 'de', { farbschema: 'dark' })
FOLGEN['f3b1-ablauf-de-1440-hell'] = ablauf(1440, 'de', { farbschema: 'light' })
FOLGEN['f3b1-ablauf-de-390'] = ablauf(390, 'de', { farbschema: 'dark' })
FOLGEN['f3b1-ablauf-ru-390'] = ablauf(390, 'ru', { farbschema: 'dark' })
FOLGEN['f3b1-ablauf-en-390-hell'] = ablauf(390, 'en', { farbschema: 'light' })
FOLGEN['f3b1-ablauf-de-1440-zoom200'] = ablauf(1440, 'de', { farbschema: 'dark', zoom: 2 })
// F-1094 (8): Bedienung nur mit der Tastatur — Fokus auf Knopf, Enter; danach steht der Fokus auf der Meldung (nie body), die
// Live-Region nennt das Ergebnis.
FOLGEN['f3b1-tastatur-de-1440'] = {
  ...ablauf(1440, 'de', { farbschema: 'dark' }),
  schritte: [
    ...ZUR_LIBRARY,
    { label: 'Detail „kraft“ per Tastatur', fokus: KRAFT, taste: 'Enter', warteAufSelector: { selector: '#plugins-detail [data-pl-wf="freigabe"]', timeoutMs: 5000 } },
    { label: 'Fokus „Kopie prüfen“ + Enter → Prüfbericht, Fokus auf der Meldung', fokus: '#plugins-detail [data-pl-aktion="pruefen"]', taste: 'Enter', warteAufSelector: { selector: '#plugins-detail:has([data-pl-bericht="passt"]) [data-pl-aktion-status="ok"]:focus', timeoutMs: 30000 }, screenshot: '01-nach-pruefen.png' },
    { label: 'Fokus „Freigeben“ + Enter → freigegeben, Fokus auf der Meldung', fokus: '#plugins-detail [data-pl-aktion="freigeben"]', taste: 'Enter', warteAufSelector: { selector: '#plugins-detail:has([data-pl-freigabe="freigegeben"]) [data-pl-aktion-status="ok"]:focus', timeoutMs: 15000 }, screenshot: '02-nach-freigeben.png' },
    { label: 'Fokus Kästchen „debuggen“ + Leertaste → zugeordnet, Fokus bleibt auf dem Kästchen', fokus: '#plugins-detail input[data-pl-name="debuggen"]', taste: 'Space', warteAufSelector: { selector: '#plugins-detail input[data-pl-name="debuggen"]:checked:focus', timeoutMs: 15000 }, screenshot: '03-nach-zuordnen.png' },
    { label: 'Fokus „Freigabe zurücknehmen“ + Enter → Fokus auf der Meldung', fokus: '#plugins-detail [data-pl-aktion="zuruecknehmen"]', taste: 'Enter', warteAufSelector: { selector: '#plugins-detail:has([data-pl-freigabe="keine"]) [data-pl-aktion-status="ok"]:focus', timeoutMs: 15000 }, screenshot: '04-nach-zuruecknehmen.png' },
  ],
}
// Nicht mehr installiert: Freigabe und Zuordnung über die Routen, dann „kraft“ aus der Liste; per Tastatur entfernen.
FOLGEN['f3b1-tastatur-verwaist-de-390'] = {
  url: `${basis}/#/capabilities`,
  viewport: viewport(390),
  localStorageSetzen: sprache('de'),
  screenshotAusschnitt: AUSSCHNITT,
  screenshotVollseite: true,
  beobachtete: BEOBACHTUNG,
  farbschema: 'light',
  verwaistVorbereiten: true,
  schritte: [
    ...ZUR_LIBRARY,
    { label: 'Liste mit „Nicht mehr installiert“', warteAufSelector: { selector: '#plugins [data-pl-verwaist="kraft@markt"]', timeoutMs: 5000 }, screenshot: '01-verwaist.png' },
    { label: 'Fokus „Zuordnung entfernen“ + Enter → Fokus auf der Meldung bzw. Liste', fokus: '#plugins [data-pl-verwaist-aktion="zuordnung"]', taste: 'Enter', warteAufSelector: { selector: '#plugins [data-pl-verwaist="kraft@markt"] [data-pl-aktion-status="ok"]:focus, #plugins-verwaist-titel:focus', timeoutMs: 15000 }, screenshot: '02-nach-zuordnung-entfernen.png' },
    { label: 'Fokus „Freigabe zurücknehmen“ + Enter → Eintrag weg, Fokus auf dem Kopf der Liste', fokus: '#plugins [data-pl-verwaist-aktion="zuruecknehmen"]', taste: 'Enter', warteAufSelector: { selector: '#plugins-kopf:focus, #plugins-verwaist-titel:focus', timeoutMs: 15000 }, screenshot: '03-nach-entfernen.png' },
  ],
}

// Echter Stand nach Prüfung, Freigabe und Zuordnung (frischer Durchgang, über die Routen) als Grundlage der Attrappen.
await anfrage('POST', '/__neu')
let stand = (await anfrage('GET', '/api/plugins')).json
const kraft = () => stand.plugins.find((p) => p.id === 'kraft@markt')
const start = await anfrage('POST', '/api/plugins/pruefung', { plugin_id: 'kraft@markt', kopie_hash: kraft().workforce.kopie.kopie_hash })
for (let i = 0; i < 100; i++) {
  const z = await anfrage('GET', `/api/sammlung/pruefung/${start.json.laufId}`)
  if (z.json.phase === 'fertig' || z.json.phase === 'fehler') break
  await new Promise((r) => setTimeout(r, 200))
}
stand = (await anfrage('GET', '/api/plugins')).json
await anfrage('POST', '/api/plugins/freigabe', { plugin_id: 'kraft@markt', kopie_hash: kraft().workforce.kopie.kopie_hash, pruefbericht: kraft().workforce.pruefbericht.kennung, stand: stand.workforce.lokale_datei.stand })
stand = (await anfrage('GET', '/api/plugins')).json
await anfrage('POST', '/api/plugins/zuordnung', { plugin_id: 'kraft@markt', rolle: 'ausfuehrung', typ: 'skill', name: 'debuggen', an: true, stand: stand.workforce.lokale_datei.stand })
const fertig = (await anfrage('GET', '/api/plugins')).json
if (fertig.plugins?.[0]?.workforce?.freigabe?.zustand !== 'freigegeben') throw new Error(`Grundlage nicht freigegeben: ${JSON.stringify(fertig.plugins?.[0]?.workforce?.freigabe)}`)
const mitKraft = (wf, kopf = {}) => ({ ...fertig, workforce: { ...fertig.workforce, ...kopf }, plugins: fertig.plugins.map((p) => (p.id === 'kraft@markt' ? { ...p, workforce: { ...p.workforce, ...wf } } : p)) })
const VERALTET = mitKraft({ freigabe: { ...fertig.plugins[0].workforce.freigabe, zustand: 'veraltet' }, pruefbericht: { ...fertig.plugins[0].workforce.pruefbericht, passt: false }, freigabe_sperre: 'anderer Stand' })
const GESPERRT = mitKraft({}, { lauf_sperre: { aktiv: true, grund: 'ein Lauf ist aktiv' } })
const VERWAIST = { ...fertig, plugins: fertig.plugins.filter((p) => p.id !== 'kraft@markt'), workforce: { ...fertig.workforce, verwaist: [{ plugin_id: 'kraft@markt', freigabe: { kopie_hash: fertig.plugins[0].workforce.freigabe.kopie_hash, freigegeben_am: fertig.plugins[0].workforce.freigabe.freigegeben_am }, zuordnung: [{ rolle: 'ausfuehrung', typ: 'skill', name: 'debuggen' }] }] } }
const OHNE_FREIGABE = mitKraft({ freigabe: { zustand: 'keine', kopie_hash: null, pruefbericht: null, freigegeben_am: null, abweichung: null }, zuordnung: [], freigabe_sperre: null })

const zustand = (breite, code, antworten, schritte, extra = {}) => ({
  url: `${basis}/#/capabilities`,
  viewport: viewport(breite),
  localStorageSetzen: sprache(code),
  screenshotAusschnitt: AUSSCHNITT,
  screenshotVollseite: true,
  beobachtete: BEOBACHTUNG,
  anfragenAntworten: antworten,
  schritte: [...ZUR_LIBRARY, ...schritte],
  ...extra,
})
FOLGEN['f3b1-veraltet-de-1440'] = zustand(1440, 'de', [{ muster: '**/api/plugins', status: 200, json: VERALTET }], [{ label: 'Detail: veraltet, Zuordnung wirkt nicht', klick: KRAFT, warteAufSelector: { selector: '#plugins-detail [data-pl-freigabe="veraltet"]', timeoutMs: 5000 }, screenshot: '01-veraltet.png' }], { farbschema: 'dark' })
FOLGEN['f3b1-veraltet-tr-390'] = zustand(390, 'tr', [{ muster: '**/api/plugins', status: 200, json: VERALTET }], [{ label: 'Detail: veraltet (tr)', klick: KRAFT, warteAufSelector: { selector: '#plugins-detail [data-pl-freigabe="veraltet"]', timeoutMs: 5000 }, screenshot: '01-veraltet.png' }], { farbschema: 'dark' })
FOLGEN['f3b1-gesperrt-de-1440-hell'] = zustand(1440, 'de', [{ muster: '**/api/plugins', status: 200, json: GESPERRT }], [{ label: 'Detail: Lauf aktiv, Zuordnung angekreuzt und gesperrt (hell)', klick: KRAFT, warteAufSelector: { selector: '#plugins-detail [data-pl-sperre]', timeoutMs: 5000 }, screenshot: '01-gesperrt.png' }], { farbschema: 'light' })
FOLGEN['f3b1-verwaist-de-390'] = zustand(390, 'de', [{ muster: '**/api/plugins', status: 200, json: VERWAIST }], [{ label: 'Nicht mehr installiert: Freigabe und Zuordnung entfernbar', warteAufSelector: { selector: '#plugins [data-pl-verwaist]', timeoutMs: 5000 }, screenshot: '01-verwaist.png' }], { farbschema: 'dark' })
FOLGEN['f3b1-gesperrt-ru-390'] = zustand(390, 'ru', [{ muster: '**/api/plugins', status: 200, json: GESPERRT }], [{ label: 'Detail: Lauf aktiv sperrt', klick: KRAFT, warteAufSelector: { selector: '#plugins-detail [data-pl-sperre]', timeoutMs: 5000 }, screenshot: '01-gesperrt.png' }], { farbschema: 'dark' })
FOLGEN['f3b1-fehler-de-390-hell'] = zustand(
  390,
  'de',
  [
    { muster: '**/api/plugins', status: 200, json: { ...OHNE_FREIGABE, plugins: OHNE_FREIGABE.plugins.map((p) => (p.id === 'kraft@markt' ? { ...p, workforce: { ...p.workforce, pruefbericht: { ...p.workforce.pruefbericht, passt: true } } } : p)) } },
    { muster: '**/api/plugins/freigabe', methode: 'POST', status: 409, json: { grund: 'Inzwischen gilt ein anderer Prüfbericht als der angezeigte — neu laden und lesen, nichts freigegeben' } },
  ],
  [
    { label: 'Detail: Bericht passt, nicht freigegeben', klick: KRAFT, warteAufSelector: { selector: '#plugins-detail [data-pl-aktion="freigeben"]:not([disabled])', timeoutMs: 5000 } },
    { label: '„Freigeben“ → 409 mit Grund', klick: '#plugins-detail [data-pl-aktion="freigeben"]', warteAufSelector: { selector: '#plugins-detail [data-pl-aktion-status="fehler"]', timeoutMs: 15000 }, screenshot: '01-fehler.png' },
  ],
  { farbschema: 'light' }
)

/**
 * Frischer Durchgang mit Prüfung, Freigabe und Zuordnung von „kraft“ über die Routen, danach „kraft“ aus der CLI-Liste.
 */
async function bereiteVerwaistVor() {
  await anfrage('POST', '/__neu')
  let z = (await anfrage('GET', '/api/plugins')).json
  const k = () => z.plugins.find((p) => p.id === 'kraft@markt')
  const s = await anfrage('POST', '/api/plugins/pruefung', { plugin_id: 'kraft@markt', kopie_hash: k().workforce.kopie.kopie_hash })
  for (let i = 0; i < 100; i++) {
    const p = await anfrage('GET', `/api/sammlung/pruefung/${s.json.laufId}`)
    if (p.json.phase === 'fertig' || p.json.phase === 'fehler') break
    await new Promise((r) => setTimeout(r, 200))
  }
  z = (await anfrage('GET', '/api/plugins')).json
  await anfrage('POST', '/api/plugins/freigabe', { plugin_id: 'kraft@markt', kopie_hash: k().workforce.kopie.kopie_hash, pruefbericht: k().workforce.pruefbericht.kennung, stand: z.workforce.lokale_datei.stand })
  z = (await anfrage('GET', '/api/plugins')).json
  await anfrage('POST', '/api/plugins/zuordnung', { plugin_id: 'kraft@markt', rolle: 'ausfuehrung', typ: 'skill', name: 'debuggen', an: true, stand: z.workforce.lokale_datei.stand })
  await anfrage('POST', '/__ohne-kraft')
}

for (const [name, folge] of Object.entries(FOLGEN)) {
  if (nur !== undefined && nur !== name) continue
  if (folge.neuerDurchgang === true) await anfrage('POST', '/__neu')
  if (folge.verwaistVorbereiten === true) await bereiteVerwaistVor()
  const { neuerDurchgang: _n, verwaistVorbereiten: _v, ...klickfolge } = folge
  const ordner = join(ziel, name)
  mkdirSync(ordner, { recursive: true })
  const datei = join(ordner, 'klickfolge.json')
  writeFileSync(datei, `${JSON.stringify(klickfolge, null, 2)}\n`)
  console.log(`\n=== ${name} ===`)
  execFileSync(process.execPath, [join(wurzel, 'scripts', 'render-nachweis.mjs'), datei, ordner], { stdio: 'inherit', cwd: wurzel })
}
