/**
 * Datei: scripts/leitstand-server.mjs
 *
 * Zweck: F10 Leitstand-Prototyp. Rein lesender lokaler HTTP-Server, der
 * kontrollzustand/ (F1-Checkpoints, F2-Lineage-Einträge) als JSON an eine
 * statische Seite unter public/leitstand/ liefert. Kettenintegrität
 * (gültig/ungültig je Checkpoint) kommt ausschließlich aus der echten F1-
 * Funktion ladeGueltigeCheckpoints, Staleness ausschließlich aus der
 * echten F2-Funktion pruefeStale (live pro Request, referenzierte
 * Eingabedateien werden dafür tatsächlich gelesen — reines Lesen, kein
 * Schritt-Auslösen). Bewusst wegwerfbar (kein Vertrag, kein Advisor-
 * Pass) — schreibt selbst nie nach kontrollzustand/.
 *
 * Wird aufgerufen von: `npm run leitstand`
 *
 * Wichtig: Kein Schreibzugriff auf kontrollzustand/ hinzufügen — das wäre
 * ein Scope-Bruch (siehe Auftrag F10). Seed-Daten kommen separat aus
 * scripts/leitstand-seed.mjs, nicht aus diesem Server.
 */

import { createServer } from 'node:http'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'
import { ladeGueltigeCheckpoints } from '../src/checkpoint-store/index.ts'
import { pruefeStale } from '../src/lineage-registry/index.ts'

const PORT = Number(process.env.LEITSTAND_PORT ?? 4173)
const BASISVERZEICHNIS = 'kontrollzustand'
const PUBLIC_VERZEICHNIS = join(import.meta.dirname, '..', 'public', 'leitstand')
const DATEINAME_MUSTER = /^(\d+)-([0-9a-f]{64})\.json$/

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
 */
function sammleCheckpoints(laufId) {
  const verzeichnis = join(BASISVERZEICHNIS, laufId, 'checkpoints')
  if (!existsSync(verzeichnis)) return []

  const pfadNachSequenz = new Map()
  for (const datei of readdirSync(verzeichnis)) {
    const treffer = DATEINAME_MUSTER.exec(datei)
    if (treffer) pfadNachSequenz.set(Number(treffer[1]), join(verzeichnis, datei))
  }
  if (pfadNachSequenz.size === 0) return []

  const gruendeNachSequenz = new Map()
  const gueltigeEintraege = ladeGueltigeCheckpoints(laufId, {
    basisVerzeichnis: BASISVERZEICHNIS,
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
        ? { stale: pruefeStale(daten.artefakt_id, sequenz, leseAktuelleEingaben(daten.eingaben), { basisVerzeichnis: BASISVERZEICHNIS, schreiber: () => {} }) }
        : {}),
    })
  }
  checkpoints.sort((a, b) => a.sequenz - b.sequenz)
  return checkpoints
}

/** Liefert alle lauf_id-Verzeichnisse unter kontrollzustand/ samt ihren Checkpoints. */
function sammleLaeufe() {
  if (!existsSync(BASISVERZEICHNIS)) return []
  return readdirSync(BASISVERZEICHNIS, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
    .map((laufId) => ({ laufId, checkpoints: sammleCheckpoints(laufId) }))
}

function sendeDatei(res, pfad) {
  const inhalt = readFileSync(pfad)
  res.writeHead(200, { 'Content-Type': CONTENT_TYPES[extname(pfad)] ?? 'application/octet-stream' })
  res.end(inhalt)
}

const server = createServer((req, res) => {
  const pfad = new URL(req.url, `http://${req.headers.host}`).pathname

  if (pfad === '/api/laeufe') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(sammleLaeufe()))
    return
  }

  const statischerPfad = join(PUBLIC_VERZEICHNIS, pfad === '/' ? 'index.html' : pfad)
  if (statischerPfad.startsWith(PUBLIC_VERZEICHNIS) && existsSync(statischerPfad) && statSync(statischerPfad).isFile()) {
    sendeDatei(res, statischerPfad)
    return
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end('Nicht gefunden')
})

server.listen(PORT, () => {
  console.log(`Leitstand läuft auf http://localhost:${PORT}`)
})
