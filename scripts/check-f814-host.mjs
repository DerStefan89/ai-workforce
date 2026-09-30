/**
 * Datei: scripts/check-f814-host.mjs
 *
 * Zweck: DNS-Rebinding-Gate (state/findings.md F-814). Der Leitstand beantwortet nur Anfragen, deren
 * Host-Header exakt 127.0.0.1:<port>, localhost:<port> oder [::1]:<port> ist (port = tatsächlich
 * gebundener Port, Hostname ohne Rücksicht auf Groß-/Kleinschreibung) — zentral EINMAL in
 * requestHandler (istUnzulaessigerHost), für jede Methode, vor dem CSRF-Haken (F-813).
 * Prüft gegen einen echten HTTP-Testserver (listen(0)), über einen rohen TCP-Client, weil fetch den
 * Host-Header nicht frei setzen lässt:
 *   (1) Rot: Host evil.example:<port> (auch groß), 127.0.0.1:<anderer Port>, 127.0.0.1 bzw. [::1]
 *       ohne Port, localhost.evil.example:<port>, localhost.:<port>, leer, fehlend (HTTP/1.0 —
 *       erreicht den Handler) je auf GET / und /app.js (statisch), GET/HEAD/POST /api/laeufe, POST /api/workflows/<id>/freigabe, POST /api/ressourcen/<id>/
 *       installation, GET/POST /api/projekte/p1/laeufe → 403 { grund }, kein Lauf, Testbaum
 *       unverändert. Fehlender Host unter HTTP/1.1 weist Node selbst mit 400 ab (requireHostHeader).
 *   (2) Grün: 127.0.0.1:<port>, localhost:<port>, LOCALHOST:<port>, [::1]:<port> → GET / und
 *       GET /api/laeufe 200, POST /api/laeufe 202 + gestarteter Lauf (direkt und über den Projekt-Präfix).
 *   (3) Struktur: istUnzulaessigerHost wird genau einmal aufgerufen, als erste Anweisung in
 *       requestHandler (403 + return) vor istFremdeBrowserAnfrage, nirgends in scripts/leitstand/.
 *       Bewusst nicht abgedeckt: erzeugeMultiProjektDispatcher antwortet vor dem Haken mit 404 bei
 *       unbekannter Projekt-id (F-822) und mit 400 bei ungültiger Anfrage-URI (F-823) — beides
 *       fester Text ohne Zustand.
 *   (4) F-823: roh `GET http://[/` (ungültige absolute Anfrage-URI) über den Dispatcher und direkt
 *       gegen requestHandler → 400 { grund }, der Prozess läuft weiter, GET /api/laeufe danach 200.
 *
 * Wichtig: Den Haken nicht pro Route duplizieren und nicht hinter eine Methodenweiche legen — (3)
 * wird sonst rot, und GET-Routen blieben per Rebinding lesbar.
 *
 * Wird aufgerufen von: npm run check.
 *
 * Aufruf: node scripts/check-f814-host.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { connect } from 'node:net'
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { registriereAuftrag } from '../src/auftrag/index.ts'
import { erzeugeMultiProjektDispatcher, erzeugeRequestHandler } from './leitstand-server.mjs'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []
console.log('\n=== F-814-Host-Check ===\n')

const PROFIL_REFERENZ = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
const TEST_WURZEL = join(tmpdir(), `check-f814-${randomUUID()}`)
const SERVER_QUELLE = fileURLToPath(new URL('./leitstand-server.mjs', import.meta.url))
const LEITSTAND_MODULE = fileURLToPath(new URL('./leitstand/', import.meta.url))

/**
 * Baut eine isolierte Handler-Instanz mit Laufattrappe und registriertem Auftrag (Muster F-813-Gate).
 * @param name - Unterordner unter TEST_WURZEL
 * @returns { handler, auftragId, aufrufe } — aufrufe zählt gestartete Läufe
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
      return { ok: false, stufe: 'gateway', grund: 'attrappe (F-814-Gate)' }
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
  return { handler, auftragId, aufrufe }
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
  laufId: `check-f814-${randomUUID()}`,
  rolle: 'ausfuehrung',
  anfragen: [],
  budget: {},
  aufrufEingaben: { modell: 'test-modell' },
  werkzeugsatz: 'lesend',
  auftragId,
})

/** Wartet ms Millisekunden — der Lauf startet nach der 202-Antwort asynchron. */
const warte = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Schickt eine rohe HTTP-Anfrage über TCP an 127.0.0.1:<port> — nur so ist der Host-Header frei
 * wählbar bzw. weglassbar.
 * @param port - Zielport
 * @param methode - HTTP-Methode
 * @param pfad - Anfragepfad
 * @param host - Host-Headerwert; undefined = Header weglassen
 * @param body - Body-String ('' = keiner)
 * @param version - 'HTTP/1.1' (Standard) oder 'HTTP/1.0'
 * @returns { status, inhalt } — inhalt ist das geparste JSON oder { roh }
 */
function sendeRoh(port, methode, pfad, host, body = '', version = 'HTTP/1.1') {
  return new Promise((resolve, reject) => {
    const kopf = [`${methode} ${pfad} ${version}`]
    if (host !== undefined) kopf.push(`Host: ${host}`)
    kopf.push('Connection: close', 'Content-Type: application/json', `Content-Length: ${Buffer.byteLength(body)}`)
    const socket = connect(port, '127.0.0.1', () => socket.end(`${kopf.join('\r\n')}\r\n\r\n${body}`))
    const teile = []
    socket.on('data', (d) => teile.push(d))
    socket.on('error', reject)
    socket.on('close', () => {
      const roh = Buffer.concat(teile)
      const trenner = roh.indexOf('\r\n\r\n')
      if (trenner < 0) {
        resolve({ status: 0, inhalt: { roh: roh.toString('utf8') } })
        return
      }
      const kopfText = roh.subarray(0, trenner).toString('utf8')
      const status = Number(/^HTTP\/1\.[01] (\d{3})/.exec(kopfText)?.[1] ?? 0)
      let rumpfBytes = roh.subarray(trenner + 4)
      // sendeJson antwortet ohne Content-Length, also chunked — Chunk-Längen zählen Bytes, deshalb
      // auf dem Buffer zusammensetzen (sonst zerschneidet ein Umlaut im grund die Chunks).
      if (/\r\ntransfer-encoding:\s*chunked/i.test(kopfText)) {
        const chunks = []
        let rest = rumpfBytes
        for (let laenge = Number.parseInt(rest.toString('latin1', 0, 16), 16); laenge > 0; laenge = Number.parseInt(rest.toString('latin1', 0, 16), 16)) {
          const anfang = rest.indexOf('\r\n') + 2
          chunks.push(rest.subarray(anfang, anfang + laenge))
          rest = rest.subarray(anfang + laenge + 2)
        }
        rumpfBytes = Buffer.concat(chunks)
      }
      const rumpf = rumpfBytes.toString('utf8')
      let inhalt
      try {
        inhalt = JSON.parse(rumpf)
      } catch {
        inhalt = { roh: rumpf }
      }
      resolve({ status, inhalt })
    })
  })
}

mkdirSync(TEST_WURZEL, { recursive: true })
const standard = baueInstanz('standard')
const projekt = baueInstanz('projekt-p1')
const server = createServer(erzeugeMultiProjektDispatcher(new Map([['p1', projekt.handler]]), standard.handler))
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const { port } = server.address()
const schliessen = () => new Promise((resolve) => server.close(resolve))
const andererPort = port === 65535 ? port - 1 : port + 1

// Rot: fremde Domain (Rebinding, auch in Großbuchstaben), anderer lokaler Port, fehlender Port (auch
// [::1]), Präfix-Täuschung, abschließender Punkt, leer. '' setzt voraus, dass Node einen leeren Host
// unter HTTP/1.1 selbst durchlässt (heute so); lehnt eine künftige Node-Version ihn vorher mit 400 ab,
// wird dieser Fall rot, obwohl der Schutz wirkt. undefined = Header fehlt (HTTP/1.0, damit die
// Anfrage den Handler erreicht).
const FREMDE_HOSTS = [
  `evil.example:${port}`,
  `EVIL.EXAMPLE:${port}`,
  `127.0.0.1:${andererPort}`,
  '127.0.0.1',
  '[::1]',
  `localhost.evil.example:${port}`,
  `localhost.:${port}`,
  '',
  undefined,
]
const ZULAESSIGE_HOSTS = [`127.0.0.1:${port}`, `localhost:${port}`, `LOCALHOST:${port}`, `[::1]:${port}`]
/** true, wenn die Antwort die Ablehnung des Host-Hakens ist (403 { grund: '…Host…abgelehnt' }). */
const ist403Host = (a) => a.status === 403 && /Host.*abgelehnt/.test(a.inhalt.grund ?? '')

try {
  // ─── (1) Rot: fremder/fehlender Host → 403, kein Lauf, Testbaum unverändert ──
  {
    const vor = befunde.length
    const faelle = [
      { titel: 'GET / (statische Seite)', methode: 'GET', pfad: '/', body: () => '' },
      { titel: 'GET /app.js (statisch)', methode: 'GET', pfad: '/app.js', body: () => '' },
      { titel: 'GET /api/laeufe', methode: 'GET', pfad: '/api/laeufe', body: () => '' },
      { titel: 'HEAD /api/laeufe', methode: 'HEAD', pfad: '/api/laeufe', body: () => '' },
      { titel: 'POST /api/laeufe', methode: 'POST', pfad: '/api/laeufe', body: () => JSON.stringify(startauftrag(standard.auftragId)) },
      { titel: 'POST /api/workflows/<id>/freigabe', methode: 'POST', pfad: '/api/workflows/wf-f814/freigabe', body: () => JSON.stringify({ begruendung: 'rebinding' }) },
      { titel: 'POST /api/ressourcen/<id>/installation', methode: 'POST', pfad: '/api/ressourcen/f814-probe/installation', body: () => '{}' },
      { titel: 'GET /api/projekte/p1/laeufe', methode: 'GET', pfad: '/api/projekte/p1/laeufe', body: () => '' },
      { titel: 'POST /api/projekte/p1/laeufe', methode: 'POST', pfad: '/api/projekte/p1/laeufe', body: () => JSON.stringify(startauftrag(projekt.auftragId)) },
    ]
    for (const fall of faelle) {
      for (const host of FREMDE_HOSTS) {
        const vorher = fingerabdruck(TEST_WURZEL)
        const laeufeVorher = standard.aufrufe.length + projekt.aufrufe.length
        const a = await sendeRoh(port, fall.methode, fall.pfad, host, fall.body(), host === undefined ? 'HTTP/1.0' : 'HTTP/1.1')
        await warte(30)
        const titel = `${fall.titel} Host ${host === undefined ? '(fehlt)' : JSON.stringify(host)}`
        // HEAD hat keinen Rumpf — dort genügt der Status.
        const abgelehnt = fall.methode === 'HEAD' ? a.status === 403 : ist403Host(a)
        if (!abgelehnt) befunde.push(`(1) ${titel}: erwartet 403 (fremder Host), erhalten ${a.status} (${a.inhalt.grund ?? String(a.inhalt.roh ?? '').slice(0, 80)})`)
        if (standard.aufrufe.length + projekt.aufrufe.length !== laeufeVorher) befunde.push(`(1) ${titel}: Lauf trotz fremdem Host gestartet`)
        if (fingerabdruck(TEST_WURZEL) !== vorher) befunde.push(`(1) ${titel}: Testbaum verändert`)
      }
    }
    // Fehlender Host unter HTTP/1.1: Node lehnt selbst ab (requireHostHeader) — nur Nicht-Erfolg prüfen.
    const ohneHost11 = await sendeRoh(port, 'GET', '/api/laeufe', undefined)
    if (ohneHost11.status < 400) befunde.push(`(1) GET /api/laeufe HTTP/1.1 ohne Host: erwartet Ablehnung, erhalten ${ohneHost11.status}`)
    if (befunde.length === vor) console.log(`✓ (1) ${FREMDE_HOSTS.length} fremde/fehlende Hosts × ${faelle.length} Routen (GET/HEAD/POST, direkt und über /api/projekte/p1) → 403, kein Lauf, Testbaum unverändert; HTTP/1.1 ohne Host → ${ohneHost11.status}.`)
  }

  // ─── (2) Grün: zulässige Hosts → Verhalten wie bisher ──
  {
    const vor = befunde.length
    for (const host of ZULAESSIGE_HOSTS) {
      const seite = await sendeRoh(port, 'GET', '/', host)
      if (seite.status !== 200) befunde.push(`(2) GET / Host ${host}: erwartet 200, erhalten ${seite.status}`)
      for (const [praefix, instanz] of [
        ['/api', standard],
        ['/api/projekte/p1', projekt],
      ]) {
        const liste = await sendeRoh(port, 'GET', `${praefix}/laeufe`, host)
        if (liste.status !== 200) befunde.push(`(2) GET ${praefix}/laeufe Host ${host}: erwartet 200, erhalten ${liste.status} (${liste.inhalt.grund ?? ''})`)
        const laeufeVorher = instanz.aufrufe.length
        const start = await sendeRoh(port, 'POST', `${praefix}/laeufe`, host, JSON.stringify(startauftrag(instanz.auftragId)))
        await warte(50)
        if (start.status !== 202 || instanz.aufrufe.length !== laeufeVorher + 1) befunde.push(`(2) POST ${praefix}/laeufe Host ${host}: erwartet 202 + gestarteter Lauf, erhalten ${start.status} (${start.inhalt.grund ?? ''}), Läufe +${instanz.aufrufe.length - laeufeVorher}`)
      }
      const f = await sendeRoh(port, 'POST', '/api/workflows/wf-f814/freigabe', host, JSON.stringify({ begruendung: 'f814' }))
      if (f.status === 403) befunde.push(`(2) POST …/freigabe Host ${host}: fälschlich 403 (${f.inhalt.grund})`)
    }
    if (befunde.length === vor) console.log(`✓ (2) ${ZULAESSIGE_HOSTS.join(', ')}: GET / und /api/laeufe 200, POST /api/laeufe 202 + Lauf (direkt und über /api/projekte/p1), …/freigabe erreicht die Route — wie bisher.`)
  }

  // ─── (3) Struktur: ein Host-Haken, vor dem CSRF-Haken und vor jeder Route ──
  {
    const vor = befunde.length
    const text = readFileSync(SERVER_QUELLE, 'utf8')
    const start = text.indexOf('return async function requestHandler(req, res) {')
    const hostAufrufe = [...text.matchAll(/(?<!function )istUnzulaessigerHost\(/g)].map((t) => t.index)
    const csrfAufruf = text.search(/(?<!function )istFremdeBrowserAnfrage\(req\)/)
    // Der Haken muss die erste Anweisung nach `try {` in requestHandler sein (davor nur Kommentare)
    // und bei Ablehnung mit 403 sofort zurückkehren — so fällt auch eine künftige Weiche davor auf,
    // die nur über pfad/req.url verzweigt.
    const ERSTE_ANWEISUNG =
      /^return async function requestHandler\(req, res\) \{\s*(\/\/[^\n]*\n\s*)*try \{\s*(\/\/[^\n]*\n\s*)*const (\w+) = istUnzulaessigerHost\(req\)\s*if \(\3 !== null\) \{\s*sendeJson\(res, 403, \{ grund: \3 \}\)\s*return\s*\}/
    const alsErsteAnweisung = start >= 0 && ERSTE_ANWEISUNG.test(text.slice(start))
    for (const d of readdirSync(LEITSTAND_MODULE).filter((n) => n.endsWith('.mjs'))) {
      if (/istUnzulaessigerHost\(/.test(readFileSync(join(LEITSTAND_MODULE, d), 'utf8'))) befunde.push(`(3) scripts/leitstand/${d} ruft istUnzulaessigerHost selbst auf — Prüfung gehört zentral in requestHandler`)
    }
    if (start < 0) befunde.push('(3) requestHandler nicht gefunden')
    else if (hostAufrufe.length !== 1) befunde.push(`(3) istUnzulaessigerHost(req) ${hostAufrufe.length}× aufgerufen — erwartet genau einmal, zentral`)
    else if (!(hostAufrufe[0] > start && hostAufrufe[0] < csrfAufruf) || !alsErsteAnweisung) befunde.push('(3) istUnzulaessigerHost(req) ist nicht die erste Anweisung in requestHandler (mit 403 + return, vor dem CSRF-Haken)')
    if (befunde.length === vor) console.log('✓ (3) istUnzulaessigerHost genau einmal, als erste Anweisung in requestHandler (403 + return), vor dem CSRF-Haken.')
  }

  // ─── (4) F-823: ungültige absolute Anfrage-URI → 400, der Prozess läuft weiter ──
  // Ohne die Absicherung wirft `new URL` im synchronen Dispatcher-Listener → uncaughtException →
  // dieses Gate-Skript endet selbst (rot). Der Direktaufruf ohne Dispatcher prüft die zweite Stelle
  // in requestHandler (dort vorher 500 über den catch der Routenkette).
  {
    const vor = befunde.length
    const host = `127.0.0.1:${port}`
    for (const uri of ['http://[/', 'http://[/api/projekte/p1/laeufe']) {
      const a = await sendeRoh(port, 'GET', uri, host)
      if (a.status !== 400 || !/Ungültige Anfrage-URI/.test(a.inhalt.grund ?? '')) befunde.push(`(4) GET ${uri}: erwartet 400 { grund }, erhalten ${a.status} (${a.inhalt.grund ?? String(a.inhalt.roh ?? '').slice(0, 80)})`)
    }
    const direkt = createServer(standard.handler)
    await new Promise((resolve) => direkt.listen(0, '127.0.0.1', resolve))
    const direktPort = direkt.address().port
    const d = await sendeRoh(direktPort, 'GET', 'http://[/', `127.0.0.1:${direktPort}`)
    await new Promise((resolve) => direkt.close(resolve))
    if (d.status !== 400) befunde.push(`(4) requestHandler direkt, GET http://[/: erwartet 400, erhalten ${d.status}`)
    const danach = await sendeRoh(port, 'GET', '/api/laeufe', host)
    if (danach.status !== 200) befunde.push(`(4) GET /api/laeufe nach der ungültigen URI: erwartet 200, erhalten ${danach.status}`)
    if (befunde.length === vor) console.log('✓ (4) F-823: GET http://[/ (Dispatcher und requestHandler direkt) → 400 { grund }, danach GET /api/laeufe weiter 200.')
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
console.log('\n✓ F-814-Host-Check sauber.')
