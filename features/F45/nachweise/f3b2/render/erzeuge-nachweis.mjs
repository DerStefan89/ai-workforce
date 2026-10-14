/**
 * Datei: features/F45/nachweise/f3b2/render/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweis F45 F-3b-2b (Muster features/F45/nachweise/f2a/render/erzeuge-nachweis.mjs und
 * features/F44/nachweise/ws4a/erzeuge-nachweis.mjs) gegen die Testinstanz ../instanz.mjs (Port 4392):
 * - lauf-detail-l1-*: Lauf-Detail des echten Belegs L1, Bereich „Fähigkeiten“ → „Fähigkeiten im Lauf“ mit Quelle „Plugin“,
 *   Aufruf gezählt, Lauf-Kopie (Hashes, nach dem Lauf unverändert) und Plugin-Datenordner unverändert — 1440 dunkel, hell, 200 %,
 *   ru 390;
 * - lauf-detail-l2: echter Beleg L2 ohne Zuordnung (kein Plugin);
 * - lauf-detail-befund-*: L1 mit fester Antwort (Datenordner im Lauf verändert, Lauf-Kopie nach dem Lauf verändert,
 *   zugeordnet ohne Freigabe „wirkt nicht“) — 1440 dunkel, 390 hell;
 * - freigabe-plugins-*: Freigabe-Dialog eines Ausführungsschritts (feste Antworten aus F44 WS-4a) mit dem Block
 *   „Plugin-Fähigkeiten im Lauf“ (ein Eintrag läuft mit, einer ohne Freigabe) — 1440 dunkel, 390 hell, en 1440.
 * Liest die Lauf-ids aus dem Kontrollzustand der Wegwerf-Wurzel; schreibt nur in eigene Unterordner.
 *
 * Wird aufgerufen von: Hand, während instanz.mjs läuft — node features/F45/nachweise/f3b2/render/erzeuge-nachweis.mjs <Wegwerf-Wurzel> [basis] [nurOrdner]
 * Nicht Teil von `npm run check`.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const belegWurzel = process.argv[2]
const basis = process.argv[3] ?? 'http://127.0.0.1:4392'
const nur = process.argv[4]
const ziel = dirname(fileURLToPath(import.meta.url))
const wurzel = resolve(ziel, '../../../../..')
const laufe = readdirSync(join(belegWurzel, 'kontrollzustand')).filter((n) => /^f45-f3b2-L[12]-[0-9a-f-]{36}$/.test(n))
const L1 = laufe.find((n) => n.startsWith('f45-f3b2-L1-'))
const L2 = laufe.find((n) => n.startsWith('f45-f3b2-L2-'))
if (L1 === undefined || L2 === undefined) throw new Error('Läufe L1/L2 im Kontrollzustand nicht gefunden')

/** GET als JSON. @param pfad - API-Pfad @returns JSON */
async function hole(pfad) {
  const antwort = await fetch(`${basis}${pfad}`)
  if (!antwort.ok) throw new Error(`${pfad}: HTTP ${antwort.status}`)
  return antwort.json()
}

const viewport = (breite) => ({ breite, hoehe: breite < 600 ? 844 : 900 })
const sprache = (code) => ({ 'leitstand-sprache': code })
const FOLGEN = {}

const laufDetail = (laufId, extra = {}) => ({
  url: `${basis}/#/runs/${laufId}`,
  viewport: viewport(1440),
  localStorageSetzen: sprache('de'),
  screenshotAusschnitt: { selector: '#lauf-faehigkeiten' },
  screenshotVollseite: true,
  beobachtete: {
    texte: [
      { name: 'Zusammenfassung', selector: '.faehigkeiten-im-lauf-zeile' },
      { name: 'Lauf-Kopie', selector: '.plugins-lauf-kopien' },
      { name: 'Datenordner', selector: '.plugins-datenordner' },
    ],
    ueberlauf: true,
  },
  schritte: [
    { label: 'Lauf-Detail geladen', warteAufSelector: { selector: '#lauf-faehigkeiten', timeoutMs: 15000 } },
    { label: 'Fähigkeiten aufgeklappt', klick: '#lauf-faehigkeiten summary', warteAufSelector: { selector: '.faehigkeiten-im-lauf', timeoutMs: 15000 }, screenshot: '01-faehigkeiten-im-lauf.png' },
  ],
  ...extra,
})
FOLGEN['lauf-detail-l1'] = laufDetail(L1)
FOLGEN['lauf-detail-l1-hell'] = { ...FOLGEN['lauf-detail-l1'], farbschema: 'light' }
FOLGEN['lauf-detail-l1-zoom200'] = { ...FOLGEN['lauf-detail-l1'], zoom: 2 }
FOLGEN['lauf-detail-l1-ru-390'] = { ...FOLGEN['lauf-detail-l1'], viewport: viewport(390), localStorageSetzen: sprache('ru') }
FOLGEN['lauf-detail-l2'] = laufDetail(L2)

// Befund-Zustand aus der echten Antwort abgeleitet (feste Antwort, nie im Produkt).
const echt = await hole(`/api/laeufe/${encodeURIComponent(L1)}`)
const befund = structuredClone(echt)
const feld = befund.laufakte?.faehigkeitenImLauf
if (feld?.plugins === undefined) throw new Error('L1 ohne faehigkeiten_im_lauf.plugins — erst beleg.mjs laufen lassen')
feld.plugins.datenordner = { abweichungen: ['+ superpowers-inline', '~ gitkraken-synced/cache.json'] }
feld.plugins.lauf_kopien[0].abweichung_nachher = 'skills/systematic-debugging/neu.md (zusätzlich)'
feld.eintraege.push({ id: 'agent:anders@markt:pruefer', name: 'pruefer (anders@markt)', typ: 'agent', quelle: 'plugin', aktiv: false, grund: 'keine Freigabe — wirkt nicht', aufrufe: 0, fehlgeschlagen: 0 })
const befundAntwort = [{ muster: `**/api/laeufe/${L1}`, status: 200, json: befund }]
FOLGEN['lauf-detail-befund'] = laufDetail(L1, { anfragenAntworten: befundAntwort })
FOLGEN['lauf-detail-befund-390-hell'] = { ...FOLGEN['lauf-detail-befund'], viewport: viewport(390), farbschema: 'light' }

// Freigabe-Dialog: feste Antworten aus F44 WS-4a (freigabe-dunkel-1440), Empfehlung um pluginFaehigkeiten ergänzt.
const ws4a = JSON.parse(readFileSync(join(wurzel, 'features', 'F44', 'nachweise', 'ws4a', 'freigabe-dunkel-1440', 'klickfolge.json'), 'utf8'))
const antworten = structuredClone(ws4a.anfragenAntworten)
const w1 = antworten.find((a) => a.muster === '**/api/workflows/nachweis-w1')
if (w1?.json?.empfehlung === undefined) throw new Error('WS-4a-Antwort ohne Empfehlung')
w1.json.empfehlung.projektFaehigkeiten = w1.json.empfehlung.projektFaehigkeiten ?? []
w1.json.empfehlung.pluginFaehigkeiten = [
  { id: 'skill:superpowers@claude-plugins-official:systematic-debugging', typ: 'skill', plugin_id: 'superpowers@claude-plugins-official', name: 'systematic-debugging', kennung: `plugin:skill:superpowers@claude-plugins-official:systematic-debugging@${'86c91777'.padEnd(64, '0')}` },
  { id: 'agent:anders@markt:pruefer', typ: 'agent', plugin_id: 'anders@markt', name: 'pruefer', grund: 'keine_freigabe' },
]
FOLGEN['freigabe-plugins-1440'] = {
  ...ws4a,
  url: `${basis}/#/workflows/nachweis-w1`,
  anfragenAntworten: antworten,
  // Seit F44 WS-4a geändert: Option „Freigeben“ wählen, begründen, bestätigen → Freigabedialog mit dem Empfehlungsblock.
  schritte: [
    { label: 'Freigabe-Seite', warteAufSelector: { selector: 'input[name="wf-freigabe-option"]', timeoutMs: 15000 } },
    { label: 'Option „Freigeben“', klick: 'input[name="wf-freigabe-option"][value="freigeben"]' },
    { label: 'Begründung', tippen: { selector: '#wf-entscheidung-begruendung', text: 'Render-Nachweis F-3b-2' } },
    { label: 'Bestätigen → Freigabedialog', klick: '[data-aktion="freigabe-bestaetigen"]', warteAufSelector: { selector: '#workflow-dialog[open] #workflow-dialog-titel', timeoutMs: 15000 }, ohneAusschnitt: true, screenshotVollseite: false, screenshot: '01-dialog.png' },
  ],
  beobachtete: { texte: [{ name: 'Plugin-Block', selector: '#workflow-dialog .empfehlung-liste:last-of-type' }], ueberlauf: true },
}
FOLGEN['freigabe-plugins-390-hell'] = { ...FOLGEN['freigabe-plugins-1440'], viewport: viewport(390), farbschema: 'light' }
FOLGEN['freigabe-plugins-en-1440'] = { ...FOLGEN['freigabe-plugins-1440'], localStorageSetzen: { ...(ws4a.localStorageSetzen ?? {}), ...sprache('en') } }

for (const [name, folge] of Object.entries(FOLGEN)) {
  if (nur !== undefined && nur !== name) continue
  const ordner = join(ziel, name)
  mkdirSync(ordner, { recursive: true })
  const datei = join(ordner, 'klickfolge.json')
  writeFileSync(datei, `${JSON.stringify(folge, null, 2)}\n`)
  console.log(`\n=== ${name} ===`)
  execFileSync(process.execPath, [join(wurzel, 'scripts', 'render-nachweis.mjs'), datei, ordner], { stdio: 'inherit', cwd: wurzel })
  schwaerzeOrdner(ordner)
}

/**
 * Schwärzt Home, Wegwerf-Wurzel und Lauf-ids in den Textdateien eines Folgen-Ordners (klickfolge, protokoll) — die Bilder zeigen
 * nur den Fähigkeiten-Bereich bzw. den Dialog (keine Pfade, keine ids).
 * @param ordnerPfad - Folgen-Ordner
 */
function schwaerzeOrdner(ordnerPfad) {
  const home = process.env.USERPROFILE ?? process.env.HOME ?? ''
  for (const name of readdirSync(ordnerPfad).filter((n) => /\.(json|md)$/.test(n))) {
    const p = join(ordnerPfad, name)
    let s = readFileSync(p, 'utf8')
    for (const [roh, ersatz] of [
      [belegWurzel, '<WURZEL>'],
      [home, '<HOME>'],
    ]) {
      if (roh === '') continue
      for (const form of [roh, roh.replaceAll('\\', '/'), roh.replaceAll('\\', '\\\\'), roh.replaceAll('/', '\\\\')]) s = s.split(form).join(ersatz)
    }
    s = s.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '<ID>')
    writeFileSync(p, s)
  }
}
