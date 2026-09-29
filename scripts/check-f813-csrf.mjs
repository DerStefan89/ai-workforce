/**
 * Datei: scripts/check-f813-csrf.mjs
 *
 * Zweck: CSRF-Gate (state/findings.md F-813). Jede zustandsändernde Leitstand-Route lehnt eine
 * Browser-Anfrage einer fremden Seite ab (istFremdeBrowserAnfrage, 403 { grund }), zentral EINMAL
 * vor dem Dispatch aller nicht-lesenden Methoden — nicht pro Route.
 * Prüft gegen einen echten HTTP-Testserver:
 *   (1) Rot: fremder Origin bzw. Sec-Fetch-Site cross-site auf POST /api/laeufe, POST
 *       /api/workflows/<id>/freigabe, POST /api/projekte/<id>/laeufe und …/auftraege (Projekt-
 *       Präfix über erzeugeMultiProjektDispatcher) → 403, kein Lauf, Kontrollzustand unverändert;
 *   (2) Grün: dieselben Anfragen mit gleicher Origin bzw. ohne Origin verhalten sich wie bisher
 *       (Lauf gestartet, Auftrag angelegt, Freigabe erreicht die Route statt 403);
 *   (3) Vollständigkeit: die Menge der schreibenden Routen wird aus dem Quelltext abgeleitet
 *       (jede Bedingung `req.method === 'POST'|'PUT'|'PATCH'|'DELETE'` in leitstand-server.mjs und
 *       scripts/leitstand/*.mjs); jede abgeleitete Route — direkt und über den Projekt-Präfix —
 *       sowie PUT/PATCH/DELETE auf einen beliebigen Pfad muss eine fremde Anfrage mit 403 abweisen;
 *       eine nicht ableitbare Bedingung ist selbst ein Befund;
 *   (4) Struktur: istFremdeBrowserAnfrage wird in requestHandler genau einmal aufgerufen, vor der
 *       ersten Routenbedingung, und nirgends sonst pro Route (auch nicht in scripts/leitstand/*.mjs);
 *       weder die Routenmodule noch erzeugeMultiProjektDispatcher werten die HTTP-Methode selbst aus.
 *
 * Wichtig: Die Kalibrierung "≥ 18 abgeleitete Routen" in (3) nicht senken — sie fängt eine
 * ausgefallene Ableitung ab. Den Haken nicht pro Route duplizieren, (4) wird sonst rot. Die
 * Ableitung in (3) sieht nur einzeilige Bedingungen `req.method === '<X>'`; der eigentliche Schutz
 * gegen still ungeschützte Routen ist (4) zusammen mit den PUT/PATCH/DELETE/OPTIONS-Proben.
 *
 * Wird aufgerufen von: npm run check.
 *
 * Aufruf: node scripts/check-f813-csrf.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { registriereAuftrag } from '../src/auftrag/index.ts'
import { erzeugeMultiProjektDispatcher, erzeugeRequestHandler } from './leitstand-server.mjs'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []
console.log('\n=== F-813-CSRF-Check ===\n')

const PROFIL_REFERENZ = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
const TEST_WURZEL = join(tmpdir(), `check-f813-${randomUUID()}`)
const SCHREIBENDE_METHODEN = ['POST', 'PUT', 'PATCH', 'DELETE']
const SERVER_QUELLE = fileURLToPath(new URL('./leitstand-server.mjs', import.meta.url))
const LEITSTAND_MODULE = fileURLToPath(new URL('./leitstand/', import.meta.url))

/**
 * Baut eine isolierte Handler-Instanz in einem eigenen Temp-Verzeichnis, mit einer Attrappe statt
 * des echten Laufs und einem registrierten Auftrag.
 * @param name - Unterordner unter TEST_WURZEL
 * @returns { handler, basisVerzeichnis, auftragId, aufrufe } — aufrufe zählt gestartete Läufe
 */
function baueInstanz(name) {
  const repoWurzel = join(TEST_WURZEL, name)
  const basisVerzeichnis = join(repoWurzel, 'kontrollzustand')
  mkdirSync(basisVerzeichnis, { recursive: true })
  const auftragId = `auftrag-${randomUUID()}`
  registriereAuftrag(auftragId, PROFIL_REFERENZ, 'Titel', 'Auftragstext', { basisVerzeichnis, schreiber: () => {} })
  const aufrufe = []
  const handler = erzeugeRequestHandler({
    fuehreAufgabeDurchFn: async (laufId) => {
      aufrufe.push(laufId)
      return { ok: false, stufe: 'gateway', grund: 'attrappe (F-813-Gate)' }
    },
    basisVerzeichnis,
    startvorlagePfad: 'startvorlagen/beispielprojekt.json',
    repoWurzel,
    settingsPfad: join(repoWurzel, '.claude', 'settings.json'),
    aktuelleAutorisierungPfad: join(repoWurzel, 'state', 'aktuelle-autorisierung.json'),
    cwd: repoWurzel,
    startfreigabeRepoWurzel: repoWurzel,
    projekteLokalPfad: join(repoWurzel, 'projekte.lokal.json'),
  })
  return { handler, basisVerzeichnis, auftragId, aufrufe }
}

/**
 * Fingerabdruck eines Verzeichnisbaums (relative Pfade + Inhalte) — Nachweis "keine Zustandsänderung".
 * @param wurzel - zu erfassendes Verzeichnis
 * @returns stabiler String
 */
function fingerabdruck(wurzel) {
  if (!existsSync(wurzel)) return ''
  return readdirSync(wurzel, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => join(e.parentPath ?? e.path, e.name))
    .sort()
    .map((p) => `${p}\n${readFileSync(p, 'utf8')}`)
    .join('\n--\n')
}

/** Gültiger Startauftrag für POST /api/laeufe mit frischer laufId. */
const startauftrag = (auftragId) => ({
  laufId: `check-f813-${randomUUID()}`,
  rolle: 'ausfuehrung',
  anfragen: [],
  budget: {},
  aufrufEingaben: { modell: 'test-modell' },
  werkzeugsatz: 'lesend',
  auftragId,
})

const AUFTRAG_FORMULAR = { titel: 'CSRF-Probe', auftragstext: 'darf von fremder Seite nicht angelegt werden' }

/** Wartet ms Millisekunden — der Lauf startet nach der 202-Antwort asynchron. */
const warte = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Leitet aus den Routenbedingungen im Quelltext je schreibender Route eine Beispiel-URL ab.
 * Erkannt: `pfad === '<literal>'`, `pfad.startsWith('<a>') && pfad.endsWith('<b>')` und ein
 * Regex-Treffer (Regex-Literal in der Zeile oder in `const <x>Treffer = /…/.exec(pfad)`).
 * @returns { routen: {datei, zeile, methode, pfad}[], nichtAbleitbar: string[] }
 */
function leiteSchreibendeRoutenAb() {
  const dateien = [SERVER_QUELLE, ...readdirSync(LEITSTAND_MODULE).filter((d) => d.endsWith('.mjs')).map((d) => join(LEITSTAND_MODULE, d))]
  const routen = []
  const nichtAbleitbar = []
  const beispielAusRegex = (quelle) => {
    const probe = quelle
      .replace(/^\^|\$$/g, '')
      .replace(/\([^()]*\)\?/g, '')
      .replace(/\(\[\^\/\]\+\)/g, 'csrf-probe')
      .replace(/\\\//g, '/')
    return new RegExp(quelle).test(probe) ? probe : null
  }
  for (const datei of dateien) {
    const text = readFileSync(datei, 'utf8')
    text.split('\n').forEach((zeile, i) => {
      const m = /req\.method\s*===\s*'([A-Z]+)'/.exec(zeile)
      if (m === null || !SCHREIBENDE_METHODEN.includes(m[1])) return
      const ort = `${relative(process.cwd(), datei)}:${i + 1}`
      const pfade = []
      for (const t of zeile.matchAll(/pfad === '([^']+)'/g)) pfade.push(t[1])
      const sw = /pfad\.startsWith\('([^']+)'\)\s*&&\s*pfad\.endsWith\('([^']+)'\)/.exec(zeile)
      if (sw !== null) pfade.push(`${sw[1]}csrf-probe${sw[2]}`)
      let regexQuelle = /\/(\^.*?\$)\//.exec(zeile)?.[1]
      const trefferName = /\b(\w+Treffer)\b/.exec(zeile)?.[1]
      if (regexQuelle === undefined && trefferName !== undefined) {
        regexQuelle = new RegExp(`const ${trefferName} = /(\\^.*?\\$)/\\.exec\\(pfad\\)`).exec(text)?.[1]
      }
      if (regexQuelle !== undefined) {
        const probe = beispielAusRegex(regexQuelle)
        if (probe !== null) pfade.push(probe)
      }
      if (pfade.length === 0) nichtAbleitbar.push(`${ort}: ${zeile.trim()}`)
      for (const pfad of pfade) routen.push({ ort, methode: m[1], pfad })
    })
  }
  return { routen, nichtAbleitbar }
}

/**
 * Startet einen echten HTTP-Server auf einem freien Port.
 * @param handler - Node-Request-Handler
 * @returns { basisUrl, schliessen }
 */
async function starteTestserver(handler) {
  const server = createServer(handler)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  return { basisUrl: `http://127.0.0.1:${port}`, schliessen: () => new Promise((resolve) => server.close(resolve)) }
}

/**
 * Schickt eine Anfrage und liest die Antwort als JSON (sonst roh).
 * @param url - Ziel-URL
 * @param methode - HTTP-Methode
 * @param kopf - zusätzliche Header (Origin, Sec-Fetch-Site)
 * @param body - Body-String
 * @returns { status, inhalt }
 */
async function sende(url, methode, kopf, body) {
  const antwort = await fetch(url, { method: methode, headers: kopf, body })
  const text = await antwort.text()
  let inhalt = {}
  try {
    inhalt = JSON.parse(text)
  } catch {
    inhalt = { roh: text }
  }
  return { status: antwort.status, inhalt }
}

mkdirSync(TEST_WURZEL, { recursive: true })
const standard = baueInstanz('standard')
const projekt = baueInstanz('projekt-p1')
const { basisUrl, schliessen } = await starteTestserver(erzeugeMultiProjektDispatcher(new Map([['p1', projekt.handler]]), standard.handler))
const port = new URL(basisUrl).port
// Köpfe einer fremden Seite: fremde Domain, anderer lokaler Port (same-site — der realistische Fall
// eines zweiten lokalen Entwicklungsservers), localhost gegen Host 127.0.0.1, Origin null (file://,
// sandboxed iframe), ungültiger Origin, passender Origin aber Sec-Fetch-Site cross-site.
const FREMD = [
  { origin: 'https://boese.example' },
  { 'sec-fetch-site': 'cross-site' },
  { origin: 'http://127.0.0.1:5173', 'sec-fetch-site': 'same-site' },
  { 'sec-fetch-site': 'same-site' },
  { origin: `http://localhost:${port}` },
  { origin: 'null' },
  { origin: 'kaputt' },
  { origin: basisUrl, 'sec-fetch-site': 'cross-site' },
]
// Köpfe des Leitstands selbst bzw. eines Nicht-Browser-Clients — müssen wie bisher durchgehen.
const ZULAESSIG = [
  ['gleiche Origin', { origin: basisUrl, 'sec-fetch-site': 'same-origin' }],
  ['nur gleiche Origin', { origin: basisUrl }],
  ['Sec-Fetch-Site none', { 'sec-fetch-site': 'none' }],
  ['ohne Origin', {}],
]
/** true, wenn die Antwort die Ablehnung des zentralen Hakens ist (403 { grund: '…abgelehnt…' }). */
const ist403Fremd = (a) => a.status === 403 && /abgelehnt/.test(a.inhalt.grund ?? '')

try {
  // ─── (1) Rot: fremde Seite → 403, kein Lauf, Kontrollzustand unverändert ──
  {
    const vor = befunde.length
    const faelle = [
      { titel: 'POST /api/laeufe', instanz: standard, url: `${basisUrl}/api/laeufe`, body: () => JSON.stringify(startauftrag(standard.auftragId)) },
      { titel: 'POST /api/workflows/<id>/freigabe', instanz: standard, url: `${basisUrl}/api/workflows/wf-csrf/freigabe`, body: () => JSON.stringify({ begruendung: 'csrf' }) },
      { titel: 'POST /api/projekte/p1/laeufe', instanz: projekt, url: `${basisUrl}/api/projekte/p1/laeufe`, body: () => JSON.stringify(startauftrag(projekt.auftragId)) },
      { titel: 'POST /api/projekte/p1/auftraege', instanz: projekt, url: `${basisUrl}/api/projekte/p1/auftraege`, body: () => JSON.stringify(AUFTRAG_FORMULAR) },
    ]
    for (const fall of faelle) {
      for (const kopf of FREMD) {
        const vorher = fingerabdruck(TEST_WURZEL)
        const aufrufeVorher = fall.instanz.aufrufe.length
        const a = await sende(fall.url, 'POST', kopf, fall.body())
        await warte(50)
        if (!ist403Fremd(a)) befunde.push(`(1) ${fall.titel} ${JSON.stringify(kopf)}: erwartet 403 (fremde Seite), erhalten ${a.status} (${a.inhalt.grund ?? a.inhalt.roh})`)
        if (fall.instanz.aufrufe.length !== aufrufeVorher) befunde.push(`(1) ${fall.titel} ${JSON.stringify(kopf)}: Lauf trotz fremder Seite gestartet`)
        if (fingerabdruck(TEST_WURZEL) !== vorher) befunde.push(`(1) ${fall.titel} ${JSON.stringify(kopf)}: Kontrollzustand verändert`)
      }
    }
    if (befunde.length === vor) console.log(`✓ (1) ${FREMD.length} fremde Köpfe (fremde Domain, anderer Port/same-site, localhost↔127.0.0.1, Origin null/ungültig, cross-site) auf /api/laeufe, …/freigabe und /api/projekte/p1/laeufe, …/auftraege → 403, kein Lauf, Testbaum unverändert.`)
  }

  // ─── (2) Grün: gleiche Origin, Sec-Fetch-Site none, ohne Origin → wie bisher ──
  {
    const vor = befunde.length
    for (const [kopfTitel, kopf] of ZULAESSIG) {
      for (const [titel, instanz, url] of [
        ['POST /api/laeufe', standard, `${basisUrl}/api/laeufe`],
        ['POST /api/projekte/p1/laeufe', projekt, `${basisUrl}/api/projekte/p1/laeufe`],
      ]) {
        const aufrufeVorher = instanz.aufrufe.length
        const a = await sende(url, 'POST', kopf, JSON.stringify(startauftrag(instanz.auftragId)))
        await warte(50)
        if (a.status !== 202 || instanz.aufrufe.length !== aufrufeVorher + 1) befunde.push(`(2) ${titel} (${kopfTitel}): erwartet 202 + gestarteter Lauf, erhalten ${a.status} (${a.inhalt.grund ?? ''}), Läufe +${instanz.aufrufe.length - aufrufeVorher}`)
      }
      // Schreibt real in den Kontrollzustand — kalibriert zugleich den Fingerabdruck aus (1).
      const vorher = fingerabdruck(projekt.basisVerzeichnis)
      const auftrag = await sende(`${basisUrl}/api/projekte/p1/auftraege`, 'POST', kopf, JSON.stringify(AUFTRAG_FORMULAR))
      if (auftrag.status !== 201 || fingerabdruck(projekt.basisVerzeichnis) === vorher) befunde.push(`(2) POST /api/projekte/p1/auftraege (${kopfTitel}): erwartet 201 + neuer Auftrag im Kontrollzustand, erhalten ${auftrag.status} (${auftrag.inhalt.grund ?? ''})`)
      const f = await sende(`${basisUrl}/api/workflows/wf-csrf/freigabe`, 'POST', kopf, JSON.stringify({ begruendung: 'csrf' }))
      if (f.status === 403) befunde.push(`(2) POST …/freigabe (${kopfTitel}): fälschlich 403 (${f.inhalt.grund})`)
    }
    if (befunde.length === vor) console.log('✓ (2) gleiche Origin (mit/ohne Sec-Fetch-Site), Sec-Fetch-Site none und ohne Origin: Lauf gestartet (202), Auftrag angelegt (201, Kontrollzustand geändert), …/freigabe erreicht die Route (kein 403) — Verhalten wie bisher.')
  }

  // ─── (3) Vollständigkeit: alle aus dem Quelltext abgeleiteten schreibenden Routen ──
  {
    const vor = befunde.length
    const { routen, nichtAbleitbar } = leiteSchreibendeRoutenAb()
    for (const eintrag of nichtAbleitbar) befunde.push(`(3) schreibende Routenbedingung nicht ableitbar — Gate erweitern: ${eintrag}`)
    // Kalibrierung: F-813 hat 18 POST-Routen gezählt; weniger heißt, die Ableitung greift nicht mehr.
    if (routen.length < 18) befunde.push(`(3) nur ${routen.length} schreibende Route(n) abgeleitet (erwartet ≥ 18) — Ableitung defekt`)
    const vorher = fingerabdruck(TEST_WURZEL)
    const proben = []
    for (const r of routen) {
      proben.push({ ...r, url: `${basisUrl}${r.pfad}` })
      if (r.pfad !== '/api/projekte') proben.push({ ...r, url: `${basisUrl}/api/projekte/p1${r.pfad.slice('/api'.length)}` })
    }
    for (const methode of ['PUT', 'PATCH', 'DELETE', 'OPTIONS']) proben.push({ ort: '(beliebig)', methode, pfad: '/api/laeufe', url: `${basisUrl}/api/laeufe` })
    // Body '[]': jede Route lehnt ihn ab, falls die Abwehr fehlt — die Probe selbst richtet nichts an.
    for (const p of proben) {
      for (const kopf of FREMD) {
        const a = await sende(p.url, p.methode, kopf, '[]')
        if (!ist403Fremd(a)) befunde.push(`(3) ${p.methode} ${p.url.slice(basisUrl.length)} (${p.ort}) ${JSON.stringify(kopf)}: erwartet 403, erhalten ${a.status}`)
      }
    }
    if (fingerabdruck(TEST_WURZEL) !== vorher) befunde.push('(3) Proben einer fremden Seite haben den Kontrollzustand verändert')
    if (befunde.length === vor) console.log(`✓ (3) ${routen.length} schreibende Routen aus dem Quelltext abgeleitet; ${proben.length} Proben (direkt, über Projekt-Präfix, PUT/PATCH/DELETE/OPTIONS) × ${FREMD.length} fremde Köpfe → 403.`)
  }

  // ─── (4) Struktur: ein zentraler Haken vor der ersten Routenbedingung ──
  {
    const vor = befunde.length
    const text = readFileSync(SERVER_QUELLE, 'utf8')
    const start = text.indexOf('return async function requestHandler(req, res) {')
    // Aufrufstellen, nicht die Definition `function istFremdeBrowserAnfrage(req)`.
    const aufrufe = [...text.matchAll(/(?<!function )istFremdeBrowserAnfrage\(/g)].map((t) => t.index)
    // Routenmodule: kein eigener Einzelaufruf und keine eigene Methodenweiche — sie werden nur aus
    // requestHandler heraus erreicht, also hinter dem Haken.
    for (const d of readdirSync(LEITSTAND_MODULE).filter((n) => n.endsWith('.mjs'))) {
      const modul = readFileSync(join(LEITSTAND_MODULE, d), 'utf8')
      if (/istFremdeBrowserAnfrage\(/.test(modul)) befunde.push(`(4) scripts/leitstand/${d} ruft istFremdeBrowserAnfrage selbst auf — Prüfung gehört zentral in requestHandler`)
      if (/\.method\b/.test(modul)) befunde.push(`(4) scripts/leitstand/${d} wertet die HTTP-Methode selbst aus — Routen gehören hinter den zentralen Haken in requestHandler`)
    }
    // Der Dispatcher reicht nur durch; eine eigene Methodenweiche dort läge VOR dem Haken.
    const dispatcherStart = text.indexOf('export function erzeugeMultiProjektDispatcher(')
    const dispatcher = text.slice(dispatcherStart, text.indexOf('\n}\n', dispatcherStart))
    if (dispatcherStart < 0) befunde.push('(4) erzeugeMultiProjektDispatcher nicht gefunden')
    else if (/\.method\b/.test(dispatcher)) befunde.push('(4) erzeugeMultiProjektDispatcher wertet die HTTP-Methode aus — eine Route dort umginge den zentralen Haken')
    const ersteRoute = text.indexOf('req.method ===', start)
    if (start < 0) befunde.push('(4) requestHandler nicht gefunden')
    else if (aufrufe.length !== 1) befunde.push(`(4) istFremdeBrowserAnfrage(req) ${aufrufe.length}× aufgerufen — erwartet genau einmal, zentral`)
    else if (!(aufrufe[0] > start && aufrufe[0] < ersteRoute)) befunde.push('(4) istFremdeBrowserAnfrage(req) liegt nicht in requestHandler vor der ersten Routenbedingung')
    if (befunde.length === vor) console.log('✓ (4) istFremdeBrowserAnfrage genau einmal, zentral in requestHandler vor der ersten Routenbedingung.')
  }
} catch (fehler) {
  befunde.push(`Gate-Ausführung gescheitert: ${fehler.message}`)
} finally {
  await schliessen()
  raeumeVerzeichnis(TEST_WURZEL)
}

if (befunde.length > 0) {
  console.error(`\n✗ ${befunde.length} Befund(e):`)
  for (const b of befunde) console.error(`  - ${b}`)
  process.exit(1)
}
console.log('\n✓ F-813-CSRF-Check sauber.')
