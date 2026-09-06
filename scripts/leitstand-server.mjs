/**
 * Datei: scripts/leitstand-server.mjs
 *
 * Zweck: F10-Leitstand. Lesend liefert der Server kontrollzustand/
 * (F1-Checkpoints, F2-Lineage-Einträge, seit WS-1 zusätzlich der echte
 * F1B-Laufstatus, AK8) als JSON an eine statische Seite unter
 * public/leitstand/. Seit WS-1 (F10-Feature-Akte) hat der Server zusätzlich
 * einen Schreibpfad: POST /api/laeufe nimmt einen Startauftrag entgegen und
 * löst ihn ausschließlich über F8s fuehreAufgabeDurch aus (AK2) — der
 * Server selbst schreibt nie nach kontrollzustand/ (Scope-Grenze aus der
 * F10-Akte). AusfuehrungsOptionen wird nie aus dem Body gelesen (AK3,
 * Options-Sperre). Der Server bindet ausschließlich auf 127.0.0.1 (AK4,
 * löst F-120). Eine laufId wird synchron vor dem fuehreAufgabeDurch-Aufruf
 * reserviert (AK5) und bei Fehlschlag der Kette wieder freigegeben. Ein
 * Wurf aus fuehreAufgabeDurch beendet den Prozess nicht (AK6) — er landet
 * in einer flüchtigen In-Memory-Liste unter GET /api/startfehler.
 *
 * Wird aufgerufen von: `npm run leitstand`, scripts/check-f10-leitstand.mjs
 *
 * Wichtig: Kein eigener Schreibzugriff auf kontrollzustand/ hinzufügen —
 * jede Schreibwirkung läuft ausschließlich mittelbar über
 * fuehreAufgabeDurch (F8 → F5/F6a/F7/F1B). erzeugeRequestHandler hält ihren
 * eigenen In-Memory-Zustand (angenommene laufIds, Startfehler) pro Aufruf
 * isoliert — wichtig für parallele Gate-Tests (scripts/check-f10-
 * leitstand.mjs), die eigene Serverinstanzen gegen ein Testverzeichnis
 * starten, ohne sich gegenseitig zu beeinflussen. Seed-Daten kommen separat
 * aus scripts/leitstand-seed.mjs, nicht aus diesem Server.
 *
 * F11 WS-1 (Option B, state/plan-v1-f11-auftrag-ws1.md Abschnitt 2.4):
 * auftragstext ist jetzt Pflichtfeld eines Startauftrags (AK2 macht es zum
 * Pflichtfeld von AusfuehrungsEingaben) — ERLAUBTE_STARTAUFTRAG_FELDER/
 * PFLICHT_STARTAUFTRAG_FELDER/pruefeStartauftrags eingaben-Rückgabe
 * entsprechend erweitert. Reine Formprüfung, keine Verhaltens-/Routen-
 * Änderung.
 */

import { createServer } from 'node:http'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ladeGueltigeCheckpoints, stelleLaufstatusFest } from '../src/checkpoint-store/index.ts'
import { pruefeStale } from '../src/lineage-registry/index.ts'
import { fuehreAufgabeDurch } from '../src/execution-controller/index.ts'

const PORT = Number(process.env.LEITSTAND_PORT ?? 4173)
const BASISVERZEICHNIS = 'kontrollzustand'
const PUBLIC_VERZEICHNIS = join(import.meta.dirname, '..', 'public', 'leitstand')
const DATEINAME_MUSTER = /^(\d+)-([0-9a-f]{64})\.json$/
const STILLER_SCHREIBER = () => {}

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
}

/**
 * F9-Erweiterung: die innere daten.daten (F2s registriereKernArtefakt-
 * Parameter 'daten') trägt bei Human-Transport-Artefakten ihren eigenen
 * Diskriminator (bedarf_schema/transport_schema) — daten.art ist bei
 * jedem kern-erzeugten Artefakt unverändert "artefakt_version" (F2s
 * eigener Diskriminator, eine Ebene höher), nie "bedarf"/"transportpaket".
 */
function humanTransportFelder(innereDaten) {
  if (typeof innereDaten !== 'object' || innereDaten === null) return {}
  if (innereDaten.bedarf_schema === 'v0') {
    return { humanTransportArt: 'bedarf', beschreibung: innereDaten.beschreibung, werkzeugAuswahl: innereDaten.werkzeug_auswahl }
  }
  if (innereDaten.transport_schema === 'v0') {
    return {
      humanTransportArt: 'transportpaket',
      transportStatus: innereDaten.status,
      executor: innereDaten.executor,
      bezugBedarf: innereDaten.bezieht_sich_auf_bedarf,
    }
  }
  return {}
}

function lineageFelder(daten) {
  return {
    art: daten.art,
    artefaktId: daten.artefakt_id,
    ...(daten.art === 'artefakt_version' ? { erzeugungsart: daten.erzeugungsart } : {}),
    ...(daten.art === 'stale_entscheidung' ? { entscheidung: daten.entscheidung, beziehtSichAuf: daten.bezieht_sich_auf } : {}),
    ...humanTransportFelder(daten.daten),
  }
}

/** F9-Erweiterung: art/ergebnis einer Wirkungsmarke (F1B) — RUN_PREPARED/Terminal, für Status-/Ergebnis-Spalten. */
function wirkungsmarkeFelder(payload) {
  return {
    art: payload.art,
    ...(payload.ergebnis !== undefined ? { ergebnis: payload.ergebnis } : {}),
  }
}

/** Liest den aktuellen Inhalt der referenzierten Dateien live von der Platte — nur lesend, für die Staleness-Live-Prüfung. */
function leseAktuelleEingaben(eingaben) {
  const inhalte = {}
  for (const eingabe of eingaben) {
    if (existsSync(eingabe.pfad)) {
      try {
        inhalte[eingabe.pfad] = readFileSync(eingabe.pfad, 'utf8')
      } catch {
        // Datei existiert laut existsSync, ist aber nicht lesbar — Eingabe einfach auslassen (pruefeStale ignoriert fehlende Pfade ohnehin).
      }
    }
  }
  return inhalte
}

/**
 * Liest alle Checkpoints einer lauf_id, sortiert aufsteigend nach sequenz.
 * Kettenintegrität (gültig/ungültig + Grund) kommt ausschließlich aus der
 * echten F1-Validierung (ladeGueltigeCheckpoints) — keine zweite,
 * selbstgebaute Prüfung. Staleness wird für artefakt_version-Einträge mit
 * Eingaben live über die echte pruefeStale-Funktion berechnet, nicht
 * vorberechnet.
 * @param laufId - Lauf-Kennung
 * @param basisVerzeichnis - Kontrollzustand-Wurzel (Default 'kontrollzustand', überschreibbar für Tests)
 * @returns Checkpoint-Liste, aufsteigend nach sequenz
 */
function sammleCheckpoints(laufId, basisVerzeichnis = BASISVERZEICHNIS) {
  const verzeichnis = join(basisVerzeichnis, laufId, 'checkpoints')
  if (!existsSync(verzeichnis)) return []

  const pfadNachSequenz = new Map()
  for (const datei of readdirSync(verzeichnis)) {
    const treffer = DATEINAME_MUSTER.exec(datei)
    if (treffer) pfadNachSequenz.set(Number(treffer[1]), join(verzeichnis, datei))
  }
  if (pfadNachSequenz.size === 0) return []

  const gruendeNachSequenz = new Map()
  const gueltigeEintraege = ladeGueltigeCheckpoints(laufId, {
    basisVerzeichnis,
    schreiber: (ereignis) => {
      if (ereignis.ereignis === 'checkpoint_validierungsfehler' && ereignis.sequenz !== undefined) {
        gruendeNachSequenz.set(ereignis.sequenz, ereignis.verstoesse ?? [])
      }
    },
  })
  const gueltigNachSequenz = new Map(gueltigeEintraege.map((eintrag) => [eintrag.payload.sequenz, eintrag]))

  const checkpoints = []
  for (const [sequenz, pfad] of pfadNachSequenz) {
    const zeitstempel = statSync(pfad).mtime.toISOString()
    const eintrag = gueltigNachSequenz.get(sequenz)

    if (eintrag === undefined) {
      checkpoints.push({
        sequenz,
        zeitstempel,
        gueltig: false,
        gruende: gruendeNachSequenz.get(sequenz) ?? ['unbekannter Validierungsfehler'],
        typ: '(ungültig)',
      })
      continue
    }

    const daten = eintrag.payload.daten
    const istLineage = typeof daten === 'object' && daten !== null && daten.typ === 'lineage'
    const istStaleFaehig = istLineage && daten.art === 'artefakt_version' && (daten.eingaben?.length ?? 0) > 0
    const istWirkungsmarke = eintrag.typ === 'wirkungsmarke'

    checkpoints.push({
      sequenz,
      zeitstempel,
      gueltig: true,
      typ: istLineage ? `lineage/${daten.art}` : eintrag.typ,
      ...(istLineage ? { lineage: lineageFelder(daten) } : {}),
      ...(istWirkungsmarke ? { wirkungsmarke: wirkungsmarkeFelder(eintrag.payload) } : {}),
      ...(istStaleFaehig
        ? { stale: pruefeStale(daten.artefakt_id, sequenz, leseAktuelleEingaben(daten.eingaben), { basisVerzeichnis, schreiber: STILLER_SCHREIBER }) }
        : {}),
    })
  }
  checkpoints.sort((a, b) => a.sequenz - b.sequenz)
  return checkpoints
}

/**
 * Liefert alle lauf_id-Verzeichnisse unter basisVerzeichnis samt ihren
 * Checkpoints und (AK8) dem echten F1B-Laufstatus — direkt aus
 * stelleLaufstatusFest, keine zweite, selbstgebaute Ableitung.
 * @param basisVerzeichnis - Kontrollzustand-Wurzel (Default 'kontrollzustand', überschreibbar für Tests)
 * @returns Liste aller Läufe mit Checkpoints und laufStatus
 */
function sammleLaeufe(basisVerzeichnis = BASISVERZEICHNIS) {
  if (!existsSync(basisVerzeichnis)) return []
  return readdirSync(basisVerzeichnis, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
    .map((laufId) => ({
      laufId,
      checkpoints: sammleCheckpoints(laufId, basisVerzeichnis),
      laufStatus: stelleLaufstatusFest(laufId, { basisVerzeichnis, schreiber: STILLER_SCHREIBER }),
    }))
}

function sendeDatei(res, pfad) {
  const inhalt = readFileSync(pfad)
  res.writeHead(200, { 'Content-Type': CONTENT_TYPES[extname(pfad)] ?? 'application/octet-stream' })
  res.end(inhalt)
}

function sendeJson(res, statusCode, wert) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(wert))
}

/** Top-Level-Felder eines Startauftrags, die AusfuehrungsOptionen (src/execution-controller/types.ts) zuzuordnen sind — AK3, nie aus dem Body gelesen. */
export const VERBOTENE_OPTIONEN_FELDER = new Set([
  'schreiber',
  'basisVerzeichnis',
  'rohBasisVerzeichnis',
  'starter',
  'settingsPfad',
  'aktuelleAutorisierungPfad',
  'startfreigabeRepoWurzel',
])

/** Erlaubte Top-Level-Felder eines Startauftrags (AK2) — laufId/profilReferenz plus die sieben AusfuehrungsEingaben-Felder plus optional vorgaengerLaufId. */
const ERLAUBTE_STARTAUFTRAG_FELDER = new Set([
  'laufId',
  'profilReferenz',
  'rolle',
  'anfragen',
  'budget',
  'aufrufEingaben',
  'werkzeugStartziel',
  'werkzeugVersionDeklariert',
  'berechtigungskontext',
  'auftragstext',
  'vorgaengerLaufId',
])

/** Spiegelt src/checkpoint-store/index.ts' pruefeLaufId (nicht exportiert) — dieselbe rein strukturelle Zeichenregel, kein zweiter fachlicher Regelsatz (D5). Fängt einen unzulässigen Wert ab, BEVOR laufIdBelegt() ihn ungeprüft in einen existsSync-Pfad einsetzt. */
const LAUFID_UNZULAESSIGE_ZEICHEN = /[/\\]|\.\.|[ -]/

const PFLICHT_STARTAUFTRAG_FELDER = [
  'laufId',
  'profilReferenz',
  'rolle',
  'anfragen',
  'budget',
  'aufrufEingaben',
  'werkzeugStartziel',
  'werkzeugVersionDeklariert',
  'berechtigungskontext',
  'auftragstext',
]

/**
 * Prüft einen geparsten Startauftrag-Body gegen AK2/AK3: nur die
 * genannten Felder sind erlaubt, ein AusfuehrungsOptionen-Feld oder ein
 * sonstiges unbekanntes Feld führt zur Ablehnung — nicht stillem
 * Ignorieren. Reine Formprüfung (Pflichtfelder, Grundtypen); die
 * fachliche Prüfung von Rolle/Anfragen/Budget/Aufrufkonstruktion bleibt
 * F5/F6a vorbehalten (D5 — kein zweiter, selbstgebauter Regelsatz).
 * @param body - geparster JSON-Body
 * @returns bei Erfolg laufId/profilReferenz/eingaben, sonst grund der Ablehnung
 */
export function pruefeStartauftrag(body) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, grund: 'Body muss ein JSON-Objekt sein' }
  }

  for (const feld of Object.keys(body)) {
    if (VERBOTENE_OPTIONEN_FELDER.has(feld)) {
      return { ok: false, grund: `Feld '${feld}' gehört zu AusfuehrungsOptionen und wird nicht aus dem Body gelesen (AK3)` }
    }
    if (!ERLAUBTE_STARTAUFTRAG_FELDER.has(feld)) {
      return { ok: false, grund: `unbekanntes Feld '${feld}'` }
    }
  }

  for (const feld of PFLICHT_STARTAUFTRAG_FELDER) {
    if (!(feld in body)) {
      return { ok: false, grund: `Pflichtfeld '${feld}' fehlt` }
    }
  }

  if (typeof body.laufId !== 'string' || body.laufId.length === 0) {
    return { ok: false, grund: "'laufId' muss ein nicht-leerer String sein" }
  }
  if (LAUFID_UNZULAESSIGE_ZEICHEN.test(body.laufId)) {
    return { ok: false, grund: `'laufId' enthält unzulässige Zeichen: ${JSON.stringify(body.laufId)}` }
  }
  if (typeof body.profilReferenz !== 'object' || body.profilReferenz === null || Array.isArray(body.profilReferenz)) {
    return { ok: false, grund: "'profilReferenz' muss ein Objekt sein" }
  }
  if (!Array.isArray(body.werkzeugStartziel) || body.werkzeugStartziel.some((t) => typeof t !== 'string')) {
    return { ok: false, grund: "'werkzeugStartziel' muss ein Array von Strings sein" }
  }
  if (body.vorgaengerLaufId !== undefined && typeof body.vorgaengerLaufId !== 'string') {
    return { ok: false, grund: "'vorgaengerLaufId' muss ein String sein" }
  }

  return {
    ok: true,
    laufId: body.laufId,
    profilReferenz: body.profilReferenz,
    eingaben: {
      rolle: body.rolle,
      anfragen: body.anfragen,
      budget: body.budget,
      aufrufEingaben: body.aufrufEingaben,
      werkzeugStartziel: body.werkzeugStartziel,
      werkzeugVersionDeklariert: body.werkzeugVersionDeklariert,
      berechtigungskontext: body.berechtigungskontext,
      auftragstext: body.auftragstext,
      ...(body.vorgaengerLaufId !== undefined ? { vorgaengerLaufId: body.vorgaengerLaufId } : {}),
    },
  }
}

/** Baut einen lesbaren Ablehnungsgrund aus einem ok:false-AusfuehrungsErgebnis (F5- oder F6a-Stufe). @param ergebnis - ok:false-Zweig von AusfuehrungsErgebnis @returns lesbarer Text für die Startfehlerliste */
function beschreibeAblehnung(ergebnis) {
  if (ergebnis.stufe === 'kontextpaket') {
    return `F5-Ablehnung (${ergebnis.ergebnis.grund})`
  }
  return `F6a-Ablehnung: ${ergebnis.grund}`
}

/** Sammelt den Request-Body eines eingehenden Requests als Text. @param req - eingehender Request @returns Body als Text */
function leseBody(req) {
  return new Promise((resolve, reject) => {
    let daten = ''
    req.on('data', (chunk) => {
      daten += chunk
    })
    req.on('end', () => resolve(daten))
    req.on('error', reject)
  })
}

/**
 * Baut den Request-Handler des Leitstands. Eigener, in sich
 * abgeschlossener In-Memory-Zustand je Aufruf (angenommene laufIds,
 * Startfehlerliste) — erlaubt parallele, voneinander unabhängige
 * Serverinstanzen in Tests (scripts/check-f10-leitstand.mjs).
 * @param optionen - fuehreAufgabeDurchFn (Default: die echte F8-Funktion, austauschbar für Tests, Muster wie F6as Starter), basisVerzeichnis (Default 'kontrollzustand'), publicVerzeichnis (Default public/leitstand)
 * @returns Node-http-Request-Handler
 */
export function erzeugeRequestHandler(optionen = {}) {
  const {
    fuehreAufgabeDurchFn = fuehreAufgabeDurch,
    basisVerzeichnis = BASISVERZEICHNIS,
    publicVerzeichnis = PUBLIC_VERZEICHNIS,
  } = optionen

  /** Synchron VOR dem fuehreAufgabeDurch-Aufruf reservierte laufIds dieser Serverinstanz (AK5) — die erste run_prepared-Marke liegt erst Sekunden später auf der Platte. */
  const angenommeneLaufIds = new Set()
  /** Flüchtige Projektion eines Wurfs aus fuehreAufgabeDurch (AK6) — kein Zustand, keine Datei unter kontrollzustand/, geht bei Serverneustart verloren. */
  const startfehlerListe = []

  /** Prüft AK5(a)+(b): laufId hat bereits ein Verzeichnis unter kontrollzustand/, oder ist in dieser Serverinstanz schon reserviert. @param laufId - zu prüfende laufId @returns true, wenn laufId belegt ist */
  function laufIdBelegt(laufId) {
    return angenommeneLaufIds.has(laufId) || existsSync(join(basisVerzeichnis, laufId))
  }

  return async function requestHandler(req, res) {
    const pfad = new URL(req.url, `http://${req.headers.host}`).pathname

    if (req.method === 'GET' && pfad === '/api/laeufe') {
      sendeJson(res, 200, sammleLaeufe(basisVerzeichnis))
      return
    }

    if (req.method === 'GET' && pfad === '/api/startfehler') {
      sendeJson(res, 200, startfehlerListe)
      return
    }

    if (req.method === 'POST' && pfad === '/api/laeufe') {
      let body
      try {
        const roh = await leseBody(req)
        body = JSON.parse(roh.length === 0 ? '{}' : roh)
      } catch (fehler) {
        sendeJson(res, 400, { grund: `Body ist kein gültiges JSON (${fehler.message})` })
        return
      }

      const startauftrag = pruefeStartauftrag(body)
      if (!startauftrag.ok) {
        sendeJson(res, 400, { grund: startauftrag.grund })
        return
      }

      const { laufId, profilReferenz, eingaben } = startauftrag
      if (laufIdBelegt(laufId)) {
        sendeJson(res, 409, { grund: `laufId '${laufId}' ist bereits vergeben` })
        return
      }

      // Reservierung SYNCHRON vor dem fuehreAufgabeDurch-Aufruf (AK5) — sonst gewinnt bei zwei
      // unmittelbar aufeinanderfolgenden POSTs derselbe laufId-Wert zweimal die Prüfung oben.
      angenommeneLaufIds.add(laufId)
      sendeJson(res, 202, { laufId })

      // Fire-and-forget mit Pflicht-.catch() (AK6) — ein Wurf aus fuehreAufgabeDurch beendet den
      // Server nicht. Bei Ablehnung durch F5/F6a (ok:false) oder Wurf wird die In-Memory-
      // Reservierung wieder freigegeben (AK5). Ein korrigierter Retry unter DERSELBEN laufId
      // gelingt danach nur, wenn die Ablehnung keinen Checkpoint geschrieben hat (reine
      // F5-Ablehnung, oder F6as pruefeStartziel-Zweig) — laufIdBelegt() prüft zusätzlich das
      // Dateisystem, und die meisten F6a-Ablehnungen (Invocation Policy, E-182, fehlende/
      // ungültige Autorisierung, Startfreigabe ABGELEHNT) schreiben über verweigereStart bereits
      // eine reale VERWEIGERT-Wirkungsmarke, BEVOR starteGateway ok:false zurückgibt — die laufId
      // bleibt danach absichtlich belegt (F1s Hash-Kette ist append-only, kein Überschreiben eines
      // persistierten Artefakts, ARCHITECTURE.md §7). Ein Retry braucht dann eine neue laufId.
      fuehreAufgabeDurchFn(laufId, profilReferenz, eingaben)
        .then((ergebnis) => {
          if (ergebnis.ok === false) {
            angenommeneLaufIds.delete(laufId)
            const eintrag = { zeitstempel: new Date().toISOString(), laufId, fehler: beschreibeAblehnung(ergebnis) }
            startfehlerListe.push(eintrag)
            console.error(`[leitstand] Lauf '${laufId}' abgelehnt:`, eintrag.fehler)
          }
        })
        .catch((fehler) => {
          angenommeneLaufIds.delete(laufId)
          const eintrag = { zeitstempel: new Date().toISOString(), laufId, fehler: String(fehler?.message ?? fehler) }
          startfehlerListe.push(eintrag)
          console.error(`[leitstand] Lauf '${laufId}' fehlgeschlagen:`, fehler)
        })
      return
    }

    const statischerPfad = join(publicVerzeichnis, pfad === '/' ? 'index.html' : pfad)
    if (statischerPfad.startsWith(publicVerzeichnis) && existsSync(statischerPfad) && statSync(statischerPfad).isFile()) {
      sendeDatei(res, statischerPfad)
      return
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Nicht gefunden')
  }
}

// Nur beim direkten Aufruf (`npm run leitstand`) tatsächlich binden — ein Import dieser Datei aus
// scripts/check-f10-leitstand.mjs darf keinen echten Server starten.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createServer(erzeugeRequestHandler())
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`Leitstand läuft auf http://127.0.0.1:${PORT}`)
  })
}
