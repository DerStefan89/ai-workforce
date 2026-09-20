/**
 * Datei: scripts/check-f31-gedaechtnis.mjs
 *
 * Zweck: Server-Gate für F31 WS-2 (Gesprächsgedächtnis + "Zusammenfassen & neu
 * starten", löst F-488). Prüft real gegen einen echten HTTP-Server (Muster
 * scripts/check-f26-jarvis.mjs Abschnitt (f), fuehreAufgabeDurchFn-Stub statt
 * echtem Kindprozess):
 * (a) POST /api/chat übergibt ein Verlaufsfenster (bisherige lineage-chat-
 *     Turns) im tatsächlich an den Worker gehenden Auftragstext.
 * (b) POST /api/chat/zusammenfassen: 409 bei D13 (ein anderer Lauf aktiv).
 * (c) POST /api/chat/zusammenfassen: 409 bei leerem Verlauf (nichts zum
 *     Zusammenfassen).
 * (d) POST /api/chat/zusammenfassen: 400 bei unbekanntem Body-Feld.
 * (e) POST /api/chat/zusammenfassen: ein Erfolg schreibt einen Eintrag mit
 *     istZusammenfassung: true; GET /api/chat projiziert das Flag.
 * (f) Der Turn NACH einer Zusammenfassung bekommt im Auftragstext nur die
 *     Zusammenfassung selbst plus die Folgeturns als Verlauf — ältere,
 *     bereits zusammengefasste Turns erscheinen NICHT mehr.
 * (g) Erreichbarkeit über den F25-Dispatcher (erzeugeMultiProjektDispatcher):
 *     '/api/projekte/<id>/chat/zusammenfassen' erreicht denselben Endpunkt.
 * (h) Code-Review-Korrektur: die Zusammenfassung bleibt im Auftragstext gepinnt,
 *     auch wenn danach mehr als (maxTurns - 1) Folgeturns aufgelaufen sind.
 *
 * Unit-Ebene (waehleVerlaufsfenster/baueJarvisAuftragstext-Randfälle) liegt in
 * src/jarvis/jarvis.test.ts — dieses Gate prüft nur die Server-Verdrahtung
 * (Endpunkte, D13, Lineage-Schreib-/Leseweg), keinen zweiten Regelsatz (D5).
 *
 * Aufruf: node scripts/check-f31-gedaechtnis.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { erzeugeMultiProjektDispatcher, erzeugeRequestHandler } from './leitstand-server.mjs'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []
const profilReferenz = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
const STILLER_SCHREIBER = () => {}

console.log('\n=== F31-WS2-Gedaechtnis-Check ===\n')

/** Schreibt einen 'chat-<projektId>'-Turn direkt (ohne echten Lauf) — Muster verarbeiteJarvisChatErgebnis, hier zum Vorbereiten einer Verlaufskette. */
function schreibeTurn(basisVerzeichnis, projektId, laufId, nachricht, antwort, istZusammenfassung = false) {
  registriereKernArtefakt(
    `chat-${projektId}`,
    profilReferenz,
    { quelle: 'jarvis-chat', lauf_id: laufId },
    { nachricht, jarvisAntwort: { art: 'antwort', antwort }, ...(istZusammenfassung ? { istZusammenfassung: true } : {}) },
    undefined,
    { basisVerzeichnis, schreiber: STILLER_SCHREIBER }
  )
}

/** Baut einen fuehreAufgabeDurchFn-Stub (Muster check-f26-jarvis.mjs Abschnitt (f)): schreibt eine Laufakte mit einem gültigen Jarvis-Ergebnis und meldet ABGESCHLOSSEN/ERFOLGREICH — capture(eingaben) sieht dabei die tatsächlich an den Worker gereichten AusfuehrungsEingaben (inkl. auftragstext). */
function baueFuehreAufgabeDurchFn(basisVerzeichnis, capture) {
  return async (laufId, _profilReferenz, eingaben) => {
    capture(eingaben)
    mkdirSync(basisVerzeichnis, { recursive: true })
    const rohstromPfad = join(basisVerzeichnis, `${laufId}-rohstrom.json`)
    const gueltigesErgebnis = { art: 'antwort', antwort: 'Zusammengefasst.' }
    writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: JSON.stringify(gueltigesErgebnis) }) }), 'utf8')
    registriereKernArtefakt(`laufakte-${laufId}`, profilReferenz, { erzeuger: 'check-f31-fake' }, { worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad } }, undefined, {
      basisVerzeichnis,
      schreiber: STILLER_SCHREIBER,
    })
    return { ok: true, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
  }
}

// ─── (a) POST /api/chat übergibt das Verlaufsfenster im Auftragstext ───────
{
  const basisVerzeichnis = `kontrollzustand-test-f31-ak-a-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const projektId = 'check-f31-ak-a'

  schreibeTurn(basisVerzeichnis, projektId, 'seed-1', 'Was blockiert mich?', 'Nichts blockiert aktuell.')

  let letzteEingaben = null
  const fuehreAufgabeDurchFn = baueFuehreAufgabeDurchFn(basisVerzeichnis, (eingaben) => {
    letzteEingaben = eingaben
  })
  const server = createServer(erzeugeRequestHandler({ basisVerzeichnis, projektId, fuehreAufgabeDurchFn }))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  const basisUrl = `http://127.0.0.1:${port}`
  try {
    const antwort = await fetch(`${basisUrl}/api/chat`, { method: 'POST', body: JSON.stringify({ nachricht: 'Und jetzt?' }) })
    if (antwort.status !== 202) {
      befunde.push(`(a): erwartet 202, erhalten ${antwort.status} (${await antwort.text()})`)
    } else if (letzteEingaben === null || typeof letzteEingaben.auftragstext !== 'string') {
      befunde.push('(a): fuehreAufgabeDurchFn wurde nicht mit einem auftragstext-tragenden eingaben-Objekt aufgerufen')
    } else if (!letzteEingaben.auftragstext.includes('Was blockiert mich?') || !letzteEingaben.auftragstext.includes('Nichts blockiert aktuell.')) {
      befunde.push(`(a): der Auftragstext sollte den vorherigen Turn enthalten, erhalten: ${letzteEingaben.auftragstext}`)
    } else if (!letzteEingaben.auftragstext.endsWith('Und jetzt?')) {
      befunde.push(`(a): der Auftragstext sollte mit der neuen Nachricht enden, erhalten: ${letzteEingaben.auftragstext}`)
    } else {
      console.log('✓ (a): POST /api/chat übergibt das vorherige Verlaufsfenster UND die neue Nachricht im Auftragstext an den Worker.')
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (b) POST /api/chat/zusammenfassen: 409 bei D13 ────────────────────────
{
  const basisVerzeichnis = `kontrollzustand-test-f31-ak-b-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const projektId = 'check-f31-ak-b'

  schreibeTurn(basisVerzeichnis, projektId, 'seed-1', 'Status?', 'Alles ruhig.')

  // fuehreAufgabeDurchFn löst NIE auf — hält laufAktiv künstlich aktiv, damit /zusammenfassen real auf D13 trifft.
  const fuehreAufgabeDurchFn = async () => new Promise(() => {})
  const server = createServer(erzeugeRequestHandler({ basisVerzeichnis, projektId, fuehreAufgabeDurchFn }))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  const basisUrl = `http://127.0.0.1:${port}`
  try {
    const erste = await fetch(`${basisUrl}/api/chat`, { method: 'POST', body: JSON.stringify({ nachricht: 'Löst einen hängenden Lauf aus' }) })
    if (erste.status !== 202) {
      befunde.push(`(b) Vorbereitung: erwartet 202 von POST /api/chat, erhalten ${erste.status}`)
    }
    const zweite = await fetch(`${basisUrl}/api/chat/zusammenfassen`, { method: 'POST', body: JSON.stringify({}) })
    const koerper = await zweite.json().catch(() => ({}))
    if (zweite.status !== 409 || !/aktiv \(D13\)/.test(koerper.grund ?? '')) {
      befunde.push(`(b): erwartet 409 mit D13-Grund, erhalten ${zweite.status} (${JSON.stringify(koerper)})`)
    } else {
      console.log('✓ (b): POST /api/chat/zusammenfassen lehnt real mit 409 ab, solange ein anderer Lauf über dieselbe Serverinstanz aktiv ist (D13).')
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (c) POST /api/chat/zusammenfassen: 409 bei leerem Verlauf ─────────────
{
  const basisVerzeichnis = `kontrollzustand-test-f31-ak-c-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const projektId = 'check-f31-ak-c'

  const server = createServer(erzeugeRequestHandler({ basisVerzeichnis, projektId }))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  const basisUrl = `http://127.0.0.1:${port}`
  try {
    const antwort = await fetch(`${basisUrl}/api/chat/zusammenfassen`, { method: 'POST', body: JSON.stringify({}) })
    const koerper = await antwort.json().catch(() => ({}))
    if (antwort.status !== 409 || koerper.grund !== 'kein Verlauf zum Zusammenfassen') {
      befunde.push(`(c): erwartet 409 mit grund 'kein Verlauf zum Zusammenfassen', erhalten ${antwort.status} (${JSON.stringify(koerper)})`)
    } else {
      console.log("✓ (c): POST /api/chat/zusammenfassen lehnt real mit 409 'kein Verlauf zum Zusammenfassen' ab, wenn die Chat-Kette leer ist.")
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (d) POST /api/chat/zusammenfassen: 400 bei unbekanntem Body-Feld ──────
{
  const basisVerzeichnis = `kontrollzustand-test-f31-ak-d-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const befundeVor = befunde.length
  const projektId = 'check-f31-ak-d'

  const server = createServer(erzeugeRequestHandler({ basisVerzeichnis, projektId }))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  const basisUrl = `http://127.0.0.1:${port}`
  try {
    const faelle = [
      { body: JSON.stringify({ nachricht: 'x' }), erwartet: /unbekanntes Feld 'nachricht'/, name: 'unerwartetes Feld nachricht' },
      { body: 'kein-json', erwartet: /Body ist kein gültiges JSON/, name: 'kein JSON' },
    ]
    for (const fall of faelle) {
      const antwort = await fetch(`${basisUrl}/api/chat/zusammenfassen`, { method: 'POST', body: fall.body })
      const koerper = await antwort.json().catch(() => ({}))
      if (antwort.status !== 400 || !fall.erwartet.test(koerper.grund ?? '')) {
        befunde.push(`(d) Rotfall '${fall.name}': erwartet 400 mit ${fall.erwartet}, erhalten ${antwort.status} (${JSON.stringify(koerper)})`)
      }
    }
    // Grünfall (Kalibrierung, Muster check-f26-jarvis.mjs): leerer Body ({}) wird NICHT wegen eines
    // Feldes abgelehnt — die 409-Ablehnung (leerer Verlauf) ist hier der erwartete, andere Grund.
    const leer = await fetch(`${basisUrl}/api/chat/zusammenfassen`, { method: 'POST', body: '{}' })
    if (leer.status === 400) {
      befunde.push(`(d) Grünfall: leerer Body ({}) sollte NICHT mit 400 abgelehnt werden, erhalten ${leer.status}`)
    }
    if (befunde.length === befundeVor) {
      console.log("✓ (d): POST /api/chat/zusammenfassen lehnt ein unbekanntes Body-Feld und kaputtes JSON mit 400 ab; leerer Body ({}) wird nicht wegen eines Feldes abgelehnt.")
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (e) Erfolg schreibt istZusammenfassung; GET /api/chat projiziert das Flag ─
{
  const basisVerzeichnis = `kontrollzustand-test-f31-ak-e-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const projektId = 'check-f31-ak-e'

  schreibeTurn(basisVerzeichnis, projektId, 'seed-1', 'Was ist der Plan?', 'Der Plan ist X.')

  const fuehreAufgabeDurchFn = baueFuehreAufgabeDurchFn(basisVerzeichnis, () => {})
  const server = createServer(erzeugeRequestHandler({ basisVerzeichnis, projektId, fuehreAufgabeDurchFn }))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  const basisUrl = `http://127.0.0.1:${port}`
  try {
    const antwort = await fetch(`${basisUrl}/api/chat/zusammenfassen`, { method: 'POST', body: JSON.stringify({}) })
    if (antwort.status !== 202) {
      befunde.push(`(e): erwartet 202, erhalten ${antwort.status} (${await antwort.text()})`)
    } else {
      // nachLauf läuft synchron im .then-Zweig von fuehreAufgabeDurchFn — Muster check-f26-jarvis.mjs (f).
      await new Promise((resolve) => setTimeout(resolve, 30))
      const verlauf = await (await fetch(`${basisUrl}/api/chat`)).json()
      const eintraege = verlauf.verlauf
      if (eintraege.length !== 2) {
        befunde.push(`(e): erwartet genau 2 Einträge (Seed + Zusammenfassung) über GET /api/chat, erhalten ${eintraege.length}`)
      } else {
        const zusammenfassung = eintraege[1]
        if (zusammenfassung.istZusammenfassung !== true) {
          befunde.push(`(e): der zweite Eintrag sollte istZusammenfassung: true tragen, erhalten ${JSON.stringify(zusammenfassung)}`)
        } else if (zusammenfassung.nachricht !== '[Zusammenfassung angefordert]') {
          befunde.push(`(e): die persistierte 'nachricht' eines Zusammenfassungs-Turns sollte fest '[Zusammenfassung angefordert]' sein, erhalten ${JSON.stringify(zusammenfassung.nachricht)}`)
        } else if (eintraege[0].istZusammenfassung !== false) {
          befunde.push(`(e): der Seed-Turn sollte istZusammenfassung: false projizieren (Grünfall-Kalibrierung), erhalten ${JSON.stringify(eintraege[0])}`)
        } else {
          console.log("✓ (e): POST /api/chat/zusammenfassen schreibt real einen Turn mit istZusammenfassung: true und fester nachricht '[Zusammenfassung angefordert]'; GET /api/chat projiziert das Flag (Grünfall: ein normaler Turn projiziert false).")
        }
      }
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (f) Der Turn NACH einer Zusammenfassung bekommt nur Zusammenfassung + Folgeturns ──
{
  const basisVerzeichnis = `kontrollzustand-test-f31-ak-f-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const projektId = 'check-f31-ak-f'

  schreibeTurn(basisVerzeichnis, projektId, 'seed-1', 'ALT: erste Frage', 'ALT: erste Antwort')
  schreibeTurn(basisVerzeichnis, projektId, 'seed-2', '[Zusammenfassung angefordert]', 'ZUSAMMENFASSUNG: bisheriger Stand.', true)
  schreibeTurn(basisVerzeichnis, projektId, 'seed-3', 'NEU: Folgefrage', 'NEU: Folgeantwort')

  let letzteEingaben = null
  const fuehreAufgabeDurchFn = baueFuehreAufgabeDurchFn(basisVerzeichnis, (eingaben) => {
    letzteEingaben = eingaben
  })
  const server = createServer(erzeugeRequestHandler({ basisVerzeichnis, projektId, fuehreAufgabeDurchFn }))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  const basisUrl = `http://127.0.0.1:${port}`
  try {
    const antwort = await fetch(`${basisUrl}/api/chat`, { method: 'POST', body: JSON.stringify({ nachricht: 'Und weiter?' }) })
    if (antwort.status !== 202) {
      befunde.push(`(f): erwartet 202, erhalten ${antwort.status} (${await antwort.text()})`)
    } else if (letzteEingaben === null || typeof letzteEingaben.auftragstext !== 'string') {
      befunde.push('(f): fuehreAufgabeDurchFn wurde nicht mit einem auftragstext-tragenden eingaben-Objekt aufgerufen')
    } else if (letzteEingaben.auftragstext.includes('ALT: erste Frage') || letzteEingaben.auftragstext.includes('ALT: erste Antwort')) {
      befunde.push(`(f): der Auftragstext sollte den bereits zusammengefassten, älteren Turn NICHT mehr enthalten, erhalten: ${letzteEingaben.auftragstext}`)
    } else if (!letzteEingaben.auftragstext.includes('ZUSAMMENFASSUNG: bisheriger Stand.') || !letzteEingaben.auftragstext.includes('NEU: Folgefrage')) {
      befunde.push(`(f): der Auftragstext sollte den Zusammenfassungs-Turn und den Folgeturn enthalten, erhalten: ${letzteEingaben.auftragstext}`)
    } else {
      console.log('✓ (f): der Turn nach einer Zusammenfassung bekommt im Auftragstext nur die Zusammenfassung selbst plus die Folgeturns als Verlauf — ältere Turns davor fallen weg.')
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (h) Zusammenfassung bleibt nach 9 Folgeturns im Auftragstext (Code-Review-Korrektur) ──
//
// Vor der Korrektur konnte die reine maxTurns-Kappung ("letzte maxTurns der Sub-Kette ab
// Zusammenfassung") die Zusammenfassung selbst verdrängen, sobald genug Folgeturns aufgelaufen
// waren — POST /api/chat kappt mit maxTurns 8 (src/jarvis/jarvis.test.ts prüft die reine
// Fensterfunktion isoliert; dieser Abschnitt belegt denselben Fall end-to-end über den echten
// Server-Aufrufpfad). 9 Folgeturns nach der Zusammenfassung sind mehr als (maxTurns - 1 = 7) —
// ohne Pinning wäre die Zusammenfassung hier bereits aus dem Fenster gefallen.
{
  const basisVerzeichnis = `kontrollzustand-test-f31-ak-h-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const projektId = 'check-f31-ak-h'

  schreibeTurn(basisVerzeichnis, projektId, 'seed-zsf', '[Zusammenfassung angefordert]', 'ZUSAMMENFASSUNG: bisheriger Stand.', true)
  for (let i = 1; i <= 9; i++) {
    schreibeTurn(basisVerzeichnis, projektId, `seed-folge-${i}`, `Folgefrage ${i}`, `Folgeantwort ${i}`)
  }

  let letzteEingaben = null
  const fuehreAufgabeDurchFn = baueFuehreAufgabeDurchFn(basisVerzeichnis, (eingaben) => {
    letzteEingaben = eingaben
  })
  const server = createServer(erzeugeRequestHandler({ basisVerzeichnis, projektId, fuehreAufgabeDurchFn }))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  const basisUrl = `http://127.0.0.1:${port}`
  try {
    const antwort = await fetch(`${basisUrl}/api/chat`, { method: 'POST', body: JSON.stringify({ nachricht: 'Und jetzt?' }) })
    if (antwort.status !== 202) {
      befunde.push(`(h): erwartet 202, erhalten ${antwort.status} (${await antwort.text()})`)
    } else if (letzteEingaben === null || typeof letzteEingaben.auftragstext !== 'string') {
      befunde.push('(h): fuehreAufgabeDurchFn wurde nicht mit einem auftragstext-tragenden eingaben-Objekt aufgerufen')
    } else if (!letzteEingaben.auftragstext.includes('ZUSAMMENFASSUNG: bisheriger Stand.')) {
      befunde.push(`(h): die Zusammenfassung sollte trotz 9 Folgeturns (> maxTurns - 1 = 7) im Auftragstext bleiben (gepinnt), erhalten: ${letzteEingaben.auftragstext}`)
    } else if (letzteEingaben.auftragstext.includes('Folgefrage 1\n') || letzteEingaben.auftragstext.includes('Folgefrage 2\n')) {
      befunde.push(`(h): die ältesten Folgeturns (1/2) sollten bei maxTurns 8 (Zusammenfassung + letzte 7 Folgeturns) verworfen sein, erhalten: ${letzteEingaben.auftragstext}`)
    } else if (!letzteEingaben.auftragstext.includes('Folgefrage 9')) {
      befunde.push(`(h): der jüngste Folgeturn (9) sollte im Auftragstext enthalten sein, erhalten: ${letzteEingaben.auftragstext}`)
    } else {
      console.log('✓ (h): die Zusammenfassung bleibt trotz 9 Folgeturns (> maxTurns - 1) im an den Worker übergebenen Auftragstext gepinnt; die ältesten Folgeturns fallen weg, der jüngste bleibt.')
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (g) Erreichbarkeit über den F25-Dispatcher ────────────────────────────
{
  const basisVerzeichnis = `kontrollzustand-test-f31-ak-g-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const projektId = 'check-f31-ak-g'

  const map = new Map([['projekt-g', erzeugeRequestHandler({ basisVerzeichnis, projektId })]])
  const defaultHandler = (_req, res) => {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ grund: 'unbenutzter Default-Handler in diesem Testfall' }))
  }
  const server = createServer(erzeugeMultiProjektDispatcher(map, defaultHandler))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  const basisUrl = `http://127.0.0.1:${port}`
  try {
    // Leere Kette (kein Seed) — der Dispatcher-Kontrakt ist bereits bewiesen, wenn die Antwort
    // die des ECHTEN Endpunkts ist (409 'kein Verlauf zum Zusammenfassen') statt einer 404 des
    // Default-Handlers oder eines Dispatcher-eigenen Fehlers.
    const antwort = await fetch(`${basisUrl}/api/projekte/projekt-g/chat/zusammenfassen`, { method: 'POST', body: JSON.stringify({}) })
    const koerper = await antwort.json().catch(() => ({}))
    if (antwort.status !== 409 || koerper.grund !== 'kein Verlauf zum Zusammenfassen') {
      befunde.push(`(g): POST /api/projekte/<id>/chat/zusammenfassen sollte über den Dispatcher den echten Endpunkt erreichen (409 'kein Verlauf zum Zusammenfassen'), erhalten ${antwort.status} (${JSON.stringify(koerper)})`)
    } else {
      console.log("✓ (g): POST /api/chat/zusammenfassen ist über den F25-Dispatcher unter '/api/projekte/<id>/chat/zusammenfassen' real erreichbar.")
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── Ergebnis ───────────────────────────────────────────────────────────────
console.log('')
if (befunde.length === 0) {
  console.log('✓ Keine Befunde.\n')
  process.exitCode = 0
} else {
  console.log(`✗ ${befunde.length} Befund(e):\n`)
  for (const b of befunde) console.log(`  - ${b}`)
  console.log('')
  process.exitCode = 1
}
