/**
 * Datei: scripts/check-f13-entscheiden.mjs
 *
 * Zweck: F13-WS-2-Gate (Entscheidungs-Schreibpfad, features/F13/feature.md
 * AK3-AK7). (a) pruefeEntscheidungsformular-Grün-/Rotfälle: unbekanntes
 * `art` → 400 vor jeder Zustandsänderung (D2), je Art fehlende/ungültige
 * Pflichtfelder, F-162 (begruendung Pflicht bei 'terminal'), laufId mit
 * unzulässigen Zeichen. (b) AK3-Grep + Selbsttest (Muster
 * check-f11-auftrag.mjs): der Handlerblock von POST /api/entscheidungen
 * ruft ausschließlich importiereAntwort/entscheideStale/schreibeWirkungsmarke
 * auf, keine eigene, selbstgebaute Schreibfunktion (D5). (c) reale
 * Live-Server-Testfälle (Muster check-f10-leitstand.mjs): AK3(a)/(b) grüner
 * Weg plus Vorbedingungsverletzung (keine transport-<laufId>-Kette) → 400
 * mit Klartext statt 500, AK3(c)/AK4/F-162 — die geschriebene Wirkungsmarke
 * trägt ergebnis + daten.mensch_begruendung genau wie eingereicht, AK6 (D13)
 * — ein Entscheidungs-POST wird durch einen aktiven Lauf NICHT blockiert.
 *
 * F13 WS-3 (AK5, nur art:'terminal'): (d) erweitert um den Nachweis, dass
 * registriereKernArtefakt( ausschließlich im art:'terminal'-Zweig steht (nie
 * in 'antwort'/'stale') — Grep-Positionsprüfung plus Selbsttest gegen einen
 * simulierten Verstoß. (f) erweitert um den realen Nachweis, dass das
 * geschriebene entscheidung-<laufId>-Lineage-Artefakt ergebnis/begruendung
 * trägt und die Response artefaktId/versionSequenz dafür liefert.
 *
 * Wird aufgerufen von: `npm run check`, `npm run check:template`
 *
 * Aufruf: node scripts/check-f13-entscheiden.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { readFileSync, rmSync } from 'node:fs'
import { erzeugeRequestHandler, pruefeEntscheidungsformular } from './leitstand-server.mjs'
import { ladeArtefaktVersion } from '../src/lineage-registry/index.ts'
import { erfasseBedarf, erzeugeTransportpaket, haendigeAus } from '../src/human-transport/index.ts'

const befunde = []
console.log('\n=== F13-Entscheiden-Check (WS-2) ===\n')

const PROFIL_REFERENZ = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
const STILLER_SCHREIBER = () => {}

// ─── (a) pruefeEntscheidungsformular: Grün-/Rotfälle je Art (AK3, D2, F-162) ──
{
  const gruenAntwort = pruefeEntscheidungsformular({ art: 'antwort', laufId: 'x', antwort: 'Ja.', einstufung: 'ERFOLGREICH' })
  const gruenStale = pruefeEntscheidungsformular({ art: 'stale', laufId: 'x', entscheidung: 'nachtrag' })
  const gruenTerminal = pruefeEntscheidungsformular({ art: 'terminal', laufId: 'x', ergebnis: 'VERWEIGERT', begruendung: 'Werkzeuggrenze real erreicht.' })
  if (gruenAntwort.ok !== true || gruenStale.ok !== true || gruenTerminal.ok !== true) {
    befunde.push(`Grünfälle: alle drei Arten sollten durchgehen, erhalten ${JSON.stringify({ gruenAntwort, gruenStale, gruenTerminal })}`)
  }

  const rotUnbekannteArt = pruefeEntscheidungsformular({ art: 'sonstwas', laufId: 'x' })
  if (rotUnbekannteArt.ok !== false) {
    befunde.push("D2-Rotfall: unbekanntes 'art' sollte abgelehnt werden, wurde durchgelassen")
  }

  const rotLaufIdLeer = pruefeEntscheidungsformular({ art: 'terminal', laufId: '', ergebnis: 'ERFOLGREICH', begruendung: 'x' })
  const rotLaufIdUnsicher = pruefeEntscheidungsformular({ art: 'terminal', laufId: '../ausserhalb', ergebnis: 'ERFOLGREICH', begruendung: 'x' })
  if (rotLaufIdLeer.ok !== false || rotLaufIdUnsicher.ok !== false) {
    befunde.push('Rotfall: leere oder unsichere laufId sollte abgelehnt werden, mindestens eine wurde durchgelassen')
  }

  const rotAntwortLeer = pruefeEntscheidungsformular({ art: 'antwort', laufId: 'x', antwort: '', einstufung: 'ERFOLGREICH' })
  const rotAntwortEinstufung = pruefeEntscheidungsformular({ art: 'antwort', laufId: 'x', antwort: 'Ja.', einstufung: 'UNBEKANNT' })
  if (rotAntwortLeer.ok !== false || rotAntwortEinstufung.ok !== false) {
    befunde.push('Rotfall (antwort): leere antwort oder ungültige einstufung sollten abgelehnt werden, mindestens eine wurde durchgelassen')
  }

  const rotStaleEntscheidung = pruefeEntscheidungsformular({ art: 'stale', laufId: 'x', entscheidung: 'unbekannt' })
  if (rotStaleEntscheidung.ok !== false) {
    befunde.push("Rotfall (stale): ungültige 'entscheidung' sollte abgelehnt werden, wurde durchgelassen")
  }

  // F-162: begruendung ist bei 'terminal' Pflicht — fehlend UND leer sind beide Rotfälle.
  const rotTerminalFehlend = pruefeEntscheidungsformular({ art: 'terminal', laufId: 'x', ergebnis: 'ERFOLGREICH' })
  const rotTerminalLeer = pruefeEntscheidungsformular({ art: 'terminal', laufId: 'x', ergebnis: 'ERFOLGREICH', begruendung: '' })
  const rotTerminalErgebnis = pruefeEntscheidungsformular({ art: 'terminal', laufId: 'x', ergebnis: 'UNBEKANNT', begruendung: 'x' })
  if (rotTerminalFehlend.ok !== false || rotTerminalLeer.ok !== false || rotTerminalErgebnis.ok !== false) {
    befunde.push(
      `F-162-Rotfall: fehlende/leere begruendung oder ungültiges ergebnis bei art 'terminal' sollten abgelehnt werden, erhalten ${JSON.stringify({ rotTerminalFehlend, rotTerminalLeer, rotTerminalErgebnis })}`
    )
  }

  const rotUnbekanntesFeld = pruefeEntscheidungsformular({ art: 'terminal', laufId: 'x', ergebnis: 'ERFOLGREICH', begruendung: 'x', unbekannt: 1 })
  if (rotUnbekanntesFeld.ok !== false) {
    befunde.push('Rotfall: unbekanntes Feld sollte abgelehnt werden, wurde durchgelassen')
  }

  if (befunde.length === 0) {
    console.log('✓ pruefeEntscheidungsformular: Grünfall je Art, unbekanntes art/Feld, unsichere laufId und F-162 (begruendung-Pflicht bei terminal) korrekt abgelehnt.')
  }
}

// ─── (b) AK3-Grep + Selbsttest: Handlerblock ruft ausschließlich die drei Kernverben auf (D5) ──
const LEITSTAND_SERVER_PFAD = 'scripts/leitstand-server.mjs'
const HANDLER_START_MARKER = "pfad === '/api/entscheidungen'"
const STATISCHER_FALLBACK_MARKER = 'const statischerPfad = join(publicVerzeichnis'
// F13 WS-3, AK5: registriereKernArtefakt( ist jetzt erlaubt, aber NUR im art:'terminal'-Zweig
// (entscheidung-<laufId>-Registrierung) — die Positionsprüfung unten (TERMINAL_MARKER) erzwingt das.
const ERLAUBTE_SCHREIBAUFRUFE = ['importiereAntwort(', 'entscheideStale(', 'schreibeWirkungsmarke(', 'registriereKernArtefakt(']
// Bekannte Grenze (Muster check-f11-auftrag.mjs, Kommentar zu FUNKTIONSSTART_MARKER): reiner
// Substring-Vergleich, keine AST-Prüfung — ein indirekter Aufruf über eine ausgelagerte
// Hilfsfunktion außerhalb dieses Fensters würde nicht erkannt.
const VERBOTENE_SCHREIBAUFRUFE = ['haltFestStaleEntscheidung(', 'writeFileSync(', 'registriereAuftrag(']
// Trennt den Handlerblock in "vor terminal" (antwort/stale-Zweige) und "terminal" (Rest inkl.
// catch) — registriereKernArtefakt( darf ausschließlich im zweiten Teil vorkommen (F13 WS-3, AK5).
const TERMINAL_MARKER = "art === 'terminal':"

/**
 * Extrahiert den POST /api/entscheidungen-Handlerblock (von HANDLER_START_MARKER bis
 * STATISCHER_FALLBACK_MARKER, dem nächsten Code nach allen POST-Routen) und prüft: alle
 * erlaubten Schreibaufrufe kommen vor, keiner der verbotenen, und registriereKernArtefakt(
 * steht ausschließlich nach TERMINAL_MARKER (F13 WS-3, AK5 — nur art:'terminal'). @param text -
 * zu prüfender Quelltext @returns true, wenn der D5-Vertrag im Text erkennbar eingehalten ist,
 * false sonst — null, wenn ein Marker fehlt (Gate kann nicht prüfen)
 */
function erfuelltD5Vertrag(text) {
  const startIndex = text.indexOf(HANDLER_START_MARKER)
  const endeIndex = text.indexOf(STATISCHER_FALLBACK_MARKER)
  if (startIndex === -1 || endeIndex === -1 || endeIndex <= startIndex) return null
  const block = text.slice(startIndex, endeIndex)

  const terminalIndex = block.indexOf(TERMINAL_MARKER)
  if (terminalIndex === -1) return null

  const fehltErlaubt = ERLAUBTE_SCHREIBAUFRUFE.filter((a) => !block.includes(a))
  const vorhandenVerboten = VERBOTENE_SCHREIBAUFRUFE.filter((v) => block.includes(v))
  const registriereVorTerminal = block.slice(0, terminalIndex).includes('registriereKernArtefakt(')

  return fehltErlaubt.length === 0 && vorhandenVerboten.length === 0 && !registriereVorTerminal
}

{
  const quelltext = readFileSync(LEITSTAND_SERVER_PFAD, 'utf-8')
  const ergebnis = erfuelltD5Vertrag(quelltext)
  if (ergebnis === null) {
    befunde.push(`AK3: Marker "${HANDLER_START_MARKER}"/"${STATISCHER_FALLBACK_MARKER}" in ${LEITSTAND_SERVER_PFAD} nicht (in dieser Reihenfolge) gefunden — Gate kann nicht prüfen`)
  } else if (!ergebnis) {
    befunde.push(`AK3: Handlerblock von POST /api/entscheidungen in ${LEITSTAND_SERVER_PFAD} ruft nicht ausschließlich importiereAntwort/entscheideStale/schreibeWirkungsmarke auf (D5)`)
  } else {
    console.log('✓ AK3: Handlerblock von POST /api/entscheidungen ruft ausschließlich importiereAntwort/entscheideStale/schreibeWirkungsmarke auf, keine selbstgebaute Schreibfunktion.')
  }

  // Selbsttest (Muster check-f11-auftrag.mjs): ein simulierter Verstoß (verbotener Aufruf im Block) muss real erkannt werden.
  const simulierterVerstoss = `${HANDLER_START_MARKER}\n  importiereAntwort(x)\n  entscheideStale(x)\n  ${TERMINAL_MARKER}\n  schreibeWirkungsmarke(x)\n  registriereKernArtefakt(x)\n  writeFileSync(x)\n${STATISCHER_FALLBACK_MARKER}`
  if (erfuelltD5Vertrag(simulierterVerstoss) !== false) {
    befunde.push('AK3-Selbsttest: Muster erkennt einen simulierten Verstoß (writeFileSync im Handlerblock) NICHT — Grep-Regel ist wirkungslos')
  } else {
    console.log('✓ AK3-Selbsttest: simulierter Verstoß (writeFileSync im Handlerblock) wird erkannt.')
  }

  // F13 WS-3, AK5-Selbsttest: registriereKernArtefakt( VOR dem TERMINAL_MARKER (also im
  // 'antwort'/'stale'-Zweig) muss als Verstoß erkannt werden, auch wenn sonst alles erlaubt ist.
  const simulierterPositionsVerstoss = `${HANDLER_START_MARKER}\n  importiereAntwort(x)\n  registriereKernArtefakt(x)\n  entscheideStale(x)\n  ${TERMINAL_MARKER}\n  schreibeWirkungsmarke(x)\n${STATISCHER_FALLBACK_MARKER}`
  if (erfuelltD5Vertrag(simulierterPositionsVerstoss) !== false) {
    befunde.push("AK5-Selbsttest: registriereKernArtefakt( VOR dem art:'terminal'-Zweig wird NICHT erkannt — Positionsprüfung ist wirkungslos")
  } else {
    console.log("✓ AK5-Selbsttest: registriereKernArtefakt( vor dem art:'terminal'-Zweig (simulierter Verstoß) wird erkannt.")
  }

  // Grünfall-Selbsttest: registriereKernArtefakt( NACH dem TERMINAL_MARKER, sonst nichts Verbotenes — muss durchgehen.
  const simulierterGruenfall = `${HANDLER_START_MARKER}\n  importiereAntwort(x)\n  entscheideStale(x)\n  ${TERMINAL_MARKER}\n  schreibeWirkungsmarke(x)\n  registriereKernArtefakt(x)\n${STATISCHER_FALLBACK_MARKER}`
  if (erfuelltD5Vertrag(simulierterGruenfall) !== true) {
    befunde.push("AK5-Selbsttest: registriereKernArtefakt( NACH dem art:'terminal'-Zweig sollte durchgehen, wurde abgelehnt")
  } else {
    console.log("✓ AK5-Selbsttest: registriereKernArtefakt( nach dem art:'terminal'-Zweig wird korrekt durchgelassen.")
  }
}

// ─── Testserver-Infrastruktur (Muster check-f10-leitstand.mjs) ─────────────
async function starteTestserver(optionen) {
  const server = createServer(erzeugeRequestHandler(optionen))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  return { basisUrl: `http://127.0.0.1:${port}`, schliessen: () => new Promise((resolve) => server.close(resolve)) }
}

function verzoegerung(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Baut eine reale transport-<laufId>-Kette (Bedarf → Transportpaket → RUN_PREPARED) auf, wie sie eine echte E-186-Eskalation hinterlässt (Muster check-f9-human-transport.mjs). */
function baueTransportKette(laufId, basisVerzeichnis) {
  erfasseBedarf(laufId, PROFIL_REFERENZ, 'Werkzeugempfehlung klären', [], { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
  erzeugeTransportpaket(laufId, PROFIL_REFERENZ, 1, 'Bitte prüfen: ...', 'ChatGPT (manueller Kopierblock)', { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
  haendigeAus(laufId, PROFIL_REFERENZ, { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
}

// ─── (c) AK3(a)/AK4: grüner Weg 'antwort' — echte transport-Kette, 200, Antwort real in Version 2 ──
{
  const basisVerzeichnis = 'kontrollzustand-test-f13-ak3a'
  const laufId = `check-f13-ak3a-${randomUUID()}`
  baueTransportKette(laufId, basisVerzeichnis)
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis })
  try {
    const antwort = await fetch(`${basisUrl}/api/entscheidungen`, {
      method: 'POST',
      body: JSON.stringify({ art: 'antwort', laufId, antwort: 'Ja, gibt es.', einstufung: 'ERFOLGREICH' }),
    })
    const koerper = await antwort.json()
    if (antwort.status !== 200 || typeof koerper.versionSequenz !== 'number') {
      befunde.push(`AK3(a): grüner Weg erwartet 200 mit numerischer versionSequenz, erhalten status=${antwort.status}, body=${JSON.stringify(koerper)}`)
    } else {
      const version = ladeArtefaktVersion(`transport-${laufId}`, koerper.versionSequenz, { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
      if (version?.daten?.antwort !== 'Ja, gibt es.' || version?.daten?.status !== 'ANTWORT_EINGETROFFEN') {
        befunde.push(`AK4: reale Transportpaket-Version trägt nicht die eingereichte Antwort, erhalten ${JSON.stringify(version?.daten)}`)
      } else {
        console.log("✓ AK3(a)/AK4: art 'antwort' mit echter transport-Kette → 200, die reale Transportpaket-Version 2 trägt die eingereichte Antwort.")
      }
    }
  } finally {
    await schliessen()
    rmSync(basisVerzeichnis, { recursive: true, force: true })
  }
}

// ─── (d) AK3(a): Vorbedingungsverletzung — keine transport-Kette → 400 mit Klartext, kein 500 ──
{
  const basisVerzeichnis = 'kontrollzustand-test-f13-ak3a-fehlend'
  const laufId = `check-f13-ak3a-fehlend-${randomUUID()}`
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis })
  try {
    const antwort = await fetch(`${basisUrl}/api/entscheidungen`, {
      method: 'POST',
      body: JSON.stringify({ art: 'antwort', laufId, antwort: 'Ja.', einstufung: 'ERFOLGREICH' }),
    })
    const koerper = await antwort.json()
    if (antwort.status !== 400 || typeof koerper.grund !== 'string' || koerper.grund.length === 0) {
      befunde.push(`AK3(a)-Vorbedingung: fehlende transport-Kette erwartet 400 mit Klartext, erhalten status=${antwort.status}, body=${JSON.stringify(koerper)}`)
    } else {
      console.log('✓ AK3(a)-Vorbedingung: eine fehlende transport-<laufId>-Kette wird mit 400 und Klartext beantwortet, kein 500/Absturz.')
    }
  } finally {
    await schliessen()
    rmSync(basisVerzeichnis, { recursive: true, force: true })
  }
}

// ─── (e) AK3(b): grüner Weg 'stale' plus Vorbedingungsverletzung ────────────
{
  const basisVerzeichnis = 'kontrollzustand-test-f13-ak3b'
  const laufId = `check-f13-ak3b-${randomUUID()}`
  baueTransportKette(laufId, basisVerzeichnis)
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis })
  try {
    const antwort = await fetch(`${basisUrl}/api/entscheidungen`, {
      method: 'POST',
      body: JSON.stringify({ art: 'stale', laufId, entscheidung: 'nachtrag' }),
    })
    const koerper = await antwort.json()
    if (antwort.status !== 200 || typeof koerper.versionSequenz !== 'number') {
      befunde.push(`AK3(b): grüner Weg erwartet 200 mit numerischer versionSequenz, erhalten status=${antwort.status}, body=${JSON.stringify(koerper)}`)
    } else {
      console.log("✓ AK3(b): art 'stale' mit echter transport-Kette → 200 (entscheideStale real aufgerufen).")
    }

    const fehlend = await fetch(`${basisUrl}/api/entscheidungen`, {
      method: 'POST',
      body: JSON.stringify({ art: 'stale', laufId: `${laufId}-ohne-kette`, entscheidung: 'nachtrag' }),
    })
    if (fehlend.status !== 400) {
      befunde.push(`AK3(b)-Vorbedingung: fehlende transport-Kette erwartet 400, erhalten ${fehlend.status}`)
    } else {
      console.log('✓ AK3(b)-Vorbedingung: eine fehlende transport-<laufId>-Kette wird mit 400 beantwortet.')
    }

    // F-162-Analogon: haltFestStaleEntscheidung selbst erzwingt begruendung bei 'unveraendert_gueltig' — muss als 400 durchgereicht werden, nicht 500.
    const ohneBegruendung = await fetch(`${basisUrl}/api/entscheidungen`, {
      method: 'POST',
      body: JSON.stringify({ art: 'stale', laufId, entscheidung: 'unveraendert_gueltig' }),
    })
    if (ohneBegruendung.status !== 400) {
      befunde.push(`AK3(b): entscheidung 'unveraendert_gueltig' ohne begruendung erwartet 400 (von haltFestStaleEntscheidung erzwungen), erhalten ${ohneBegruendung.status}`)
    } else {
      console.log("✓ AK3(b): entscheidung 'unveraendert_gueltig' ohne begruendung wird als 400 durchgereicht (haltFestStaleEntscheidung-Vorbedingung), kein 500.")
    }
  } finally {
    await schliessen()
    rmSync(basisVerzeichnis, { recursive: true, force: true })
  }
}

// ─── (f) AK3(c)/AK4/F-162: grüner Weg 'terminal' — echte Wirkungsmarke trägt ergebnis + daten.mensch_begruendung ──
{
  const basisVerzeichnis = 'kontrollzustand-test-f13-ak3c'
  const laufId = `check-f13-ak3c-${randomUUID()}`
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis })
  try {
    const begruendungstext = 'Werkzeuggrenze real erreicht — von Hand geprüft.'
    const antwort = await fetch(`${basisUrl}/api/entscheidungen`, {
      method: 'POST',
      body: JSON.stringify({ art: 'terminal', laufId, ergebnis: 'VERWEIGERT', begruendung: begruendungstext }),
    })
    const koerper = await antwort.json()
    if (antwort.status !== 200 || typeof koerper.pfad !== 'string' || typeof koerper.selbstHash !== 'string') {
      befunde.push(`AK3(c): grüner Weg erwartet 200 mit pfad/selbstHash, erhalten status=${antwort.status}, body=${JSON.stringify(koerper)}`)
    } else {
      const geschrieben = JSON.parse(readFileSync(koerper.pfad, 'utf-8'))
      if (geschrieben.payload.ergebnis !== 'VERWEIGERT' || geschrieben.payload.daten?.mensch_begruendung !== begruendungstext) {
        befunde.push(`AK4/F-162: geschriebene Wirkungsmarke trägt nicht ergebnis/daten.mensch_begruendung wie eingereicht, erhalten ${JSON.stringify(geschrieben.payload)}`)
      } else {
        console.log("✓ AK3(c)/AK4/F-162: art 'terminal' schreibt real eine Wirkungsmarke mit ergebnis und daten.mensch_begruendung wie eingereicht.")
      }

      // F13 WS-3 (AK5, nur art:'terminal'): die Response trägt zusätzlich artefaktId/versionSequenz
      // des entscheidung-<laufId>-Lineage-Artefakts, und dieses Artefakt trägt real ergebnis/begruendung.
      if (koerper.artefaktId !== `entscheidung-${laufId}` || typeof koerper.versionSequenz !== 'number') {
        befunde.push(`AK5: Response von art 'terminal' erwartet artefaktId 'entscheidung-${laufId}' und numerische versionSequenz, erhalten ${JSON.stringify(koerper)}`)
      } else {
        const entscheidungsVersion = ladeArtefaktVersion(`entscheidung-${laufId}`, koerper.versionSequenz, { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
        if (entscheidungsVersion?.daten?.ergebnis !== 'VERWEIGERT' || entscheidungsVersion?.daten?.begruendung !== begruendungstext) {
          befunde.push(`AK5: reales entscheidung-<laufId>-Artefakt trägt nicht ergebnis/begruendung wie eingereicht, erhalten ${JSON.stringify(entscheidungsVersion?.daten)}`)
        } else {
          console.log("✓ AK5: art 'terminal' registriert real ein entscheidung-<laufId>-Lineage-Artefakt mit ergebnis und begruendung wie eingereicht.")
        }
      }
    }

    const ohneBegruendung = await fetch(`${basisUrl}/api/entscheidungen`, {
      method: 'POST',
      body: JSON.stringify({ art: 'terminal', laufId: `${laufId}-ohne-begruendung`, ergebnis: 'ERFOLGREICH' }),
    })
    if (ohneBegruendung.status !== 400) {
      befunde.push(`F-162: art 'terminal' ohne begruendung erwartet 400, erhalten ${ohneBegruendung.status}`)
    } else {
      console.log("✓ F-162: art 'terminal' ohne begruendung wird mit 400 abgelehnt, vor jeder Zustandsänderung.")
    }
  } finally {
    await schliessen()
    rmSync(basisVerzeichnis, { recursive: true, force: true })
  }
}

// ─── (g) AK6 (D13): ein Entscheidungs-POST wird durch einen aktiven Lauf NICHT blockiert ──
{
  const basisVerzeichnis = 'kontrollzustand-test-f13-ak6'
  const fuehreAufgabeDurchFn = async () => {
    await verzoegerung(200)
    return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
  }
  const { registriereAuftrag } = await import('../src/auftrag/index.ts')
  const auftragId = `check-f13-ak6-auftrag-${randomUUID()}`
  registriereAuftrag(auftragId, PROFIL_REFERENZ, 'Testtitel', 'Testauftragstext', { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn })
  try {
    const laufendeLaufId = `check-f13-ak6-laufend-${randomUUID()}`
    const start = await fetch(`${basisUrl}/api/laeufe`, {
      method: 'POST',
      body: JSON.stringify({ laufId: laufendeLaufId, rolle: 'ausfuehrung', anfragen: [], budget: {}, aufrufEingaben: { modell: 'test-modell' }, werkzeugsatz: 'lesend', auftragId }),
    })
    if (start.status !== 202) {
      befunde.push(`AK6-Vorbereitung: Laufstart erwartet 202, erhalten ${start.status}`)
    }

    // Während laufAktiv=true (D13): ein Entscheidungs-POST für eine ANDERE laufId muss trotzdem durchgehen.
    const entscheidungLaufId = `check-f13-ak6-entscheidung-${randomUUID()}`
    const entscheidung = await fetch(`${basisUrl}/api/entscheidungen`, {
      method: 'POST',
      body: JSON.stringify({ art: 'terminal', laufId: entscheidungLaufId, ergebnis: 'ERFOLGREICH', begruendung: 'AK6-Nachweis' }),
    })
    if (entscheidung.status !== 200) {
      befunde.push(`AK6: Entscheidungs-POST während aktivem Lauf (D13) sollte NICHT blockiert werden, erwartet 200, erhalten ${entscheidung.status}`)
    } else {
      console.log('✓ AK6 (D13): ein Entscheidungs-POST wird durch einen aktiven Lauf nicht blockiert — kein Laufstart, D13 gilt hier nicht.')
    }

    await verzoegerung(250)
  } finally {
    await schliessen()
    rmSync(basisVerzeichnis, { recursive: true, force: true })
  }
}

// ─── Ergebnis ───────────────────────────────────────────────────────────────
console.log('')
if (befunde.length === 0) {
  console.log('✓ Keine Befunde.\n')
  process.exit(0)
}

console.log(`✗ ${befunde.length} Befund(e):\n`)
for (const b of befunde) console.log(`  - ${b}`)
console.log('')
process.exit(1)
