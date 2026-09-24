/**
 * Datei: scripts/check-f32-verbrauch-ansicht.mjs
 *
 * Zweck: Gate für F32 WS-2 (Verbrauchsansicht im Leitstand). Prüft:
 * (a) berechneVerbrauchsVon (public/leitstand/verbrauch-zeitraum.js) als
 *     reine Funktion: '7t'/'30t' liefern ein ISO-8601-Datum genau 7 bzw.
 *     30 Tage vor einem festen Bezugszeitpunkt, 'gesamt' liefert undefined
 *     (kein Zeitraumfilter).
 * (b) echter HTTP-Aufruf GET /api/verbrauch mit einem client-seitig
 *     gebauten `von`-Wert (Muster check-f33-roadmap-projektion.mjs
 *     Abschnitt (e): erzeugeRequestHandler + echter Testserver) → 200 und
 *     die von scripts/leitstand/routen-verbrauch.mjs dokumentierte
 *     Struktur { status: 'ok', gruppen, laeufeGesamt, ohneBeobachtungGesamt }.
 * (c) Rot-Fall (F-603-Fix): baueVerbrauchsProjektion wirft nie, auch nicht
 *     bei einem realen IO-Fehler — ein `basisVerzeichnis`, das auf eine
 *     Datei statt ein Verzeichnis zeigt, lässt `readdirSync` intern werfen;
 *     die Funktion fängt das ab und liefert { status: 'fehler', grund }.
 * (d) Derselbe Rot-Fall über einen echten HTTP-Aufruf: die Route liefert
 *     weiterhin 200 (kein 500) mit demselben Fachergebnis im Körper.
 * (e) F-518, grün: gültiges von/bis (YYYY-MM-DD, von <= bis) sowie gar kein
 *     von/bis liefern weiterhin { status: 'ok', ... }.
 * (f) F-518, Rot-Fall Format: ein von ODER bis, das kein gültiges Datum ist
 *     (falsches Muster, nicht-existierendes Kalenderdatum), liefert
 *     { status: 'zeitraum_ungueltig', grund } statt eines leeren Ergebnisses.
 * (g) F-518, Rot-Fall Reihenfolge: von > bis liefert ebenfalls
 *     { status: 'zeitraum_ungueltig', grund }.
 * (h) F-518, echter HTTP-Aufruf: dieselben Rot-Fälle (f)/(g) liefern über
 *     GET /api/verbrauch HTTP 400 (Grund im Körper) statt 200.
 *
 * Aufruf: node scripts/check-f32-verbrauch-ansicht.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { berechneVerbrauchsVon } from '../public/leitstand/verbrauch-zeitraum.js'
import { baueVerbrauchsProjektion } from './leitstand/routen-verbrauch.mjs'
import { erzeugeRequestHandler } from './leitstand-server.mjs'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []
console.log('\n=== F32-WS2-Verbrauchsansicht-Check ===\n')

// ─── (a) berechneVerbrauchsVon als reine Funktion ───────────────────────────
{
  const jetzt = new Date('2026-09-22T12:00:00.000Z')

  const von7 = berechneVerbrauchsVon('7t', jetzt)
  if (von7 !== '2026-09-15T12:00:00.000Z') {
    befunde.push(`(a) '7t': erwartet 2026-09-15T12:00:00.000Z, erhalten ${von7}`)
  } else {
    console.log(`✓ (a) '7t' → ${von7} (genau 7 Tage vor dem Bezugszeitpunkt).`)
  }

  const von30 = berechneVerbrauchsVon('30t', jetzt)
  if (von30 !== '2026-08-23T12:00:00.000Z') {
    befunde.push(`(a) '30t': erwartet 2026-08-23T12:00:00.000Z, erhalten ${von30}`)
  } else {
    console.log(`✓ (a) '30t' → ${von30} (genau 30 Tage vor dem Bezugszeitpunkt).`)
  }

  const vonGesamt = berechneVerbrauchsVon('gesamt', jetzt)
  if (vonGesamt !== undefined) {
    befunde.push(`(a) 'gesamt': erwartet undefined (kein Zeitraumfilter), erhalten ${JSON.stringify(vonGesamt)}`)
  } else {
    console.log("✓ (a) 'gesamt' → undefined, kein Zeitraumfilter.")
  }
}

// ─── (b) echter HTTP-Aufruf GET /api/verbrauch mit clientseitig gebautem 'von' ──
{
  const basisVerzeichnis = `kontrollzustand-test-f32-ansicht-${randomUUID()}`
  const globalerLaufZustand = { aktiv: false, laufId: null, abortController: null }
  const handler = erzeugeRequestHandler({ basisVerzeichnis, startvorlagePfad: 'startvorlagen/beispielprojekt.json', globalerLaufZustand })
  const server = createServer(handler)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    const { port } = server.address()
    const von = berechneVerbrauchsVon('30t', new Date())
    const antwort = await fetch(`http://127.0.0.1:${port}/api/verbrauch?von=${encodeURIComponent(von)}`)
    if (antwort.status !== 200) {
      befunde.push(`(b) GET /api/verbrauch?von=...: erwartet 200, erhalten ${antwort.status}`)
    } else {
      const koerper = await antwort.json()
      const hatErwarteteStruktur =
        koerper.status === 'ok' &&
        Array.isArray(koerper.gruppen) &&
        typeof koerper.laeufeGesamt === 'number' &&
        typeof koerper.ohneBeobachtungGesamt === 'number'
      if (!hatErwarteteStruktur) {
        befunde.push(`(b) GET /api/verbrauch?von=...: erwartete Struktur { status: 'ok', gruppen, laeufeGesamt, ohneBeobachtungGesamt } nicht erfüllt, erhalten ${JSON.stringify(koerper)}`)
      } else {
        console.log('✓ (b) echter HTTP-Aufruf GET /api/verbrauch mit client-seitig gebautem von-Wert → 200, erwartete Struktur.')
      }
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (c) Rot-Fall: baueVerbrauchsProjektion wirft nie (F-603-Fix) ───────────
{
  const dateiAlsBasisVerzeichnis = `kontrollzustand-test-f32-ansicht-rotfall-${randomUUID()}.txt`
  writeFileSync(dateiAlsBasisVerzeichnis, 'ich bin ein Verzeichnis, keine Datei', 'utf8')
  try {
    const projektion = baueVerbrauchsProjektion(dateiAlsBasisVerzeichnis)
    if (projektion.status !== 'fehler' || typeof projektion.grund !== 'string' || projektion.grund.length === 0) {
      befunde.push(`(c) Rot-Fall (Datei statt Verzeichnis): erwartet { status: 'fehler', grund }, erhalten ${JSON.stringify(projektion)}`)
    } else {
      console.log(`✓ (c) baueVerbrauchsProjektion wirft nicht bei IO-Fehler → { status: 'fehler', grund: '${projektion.grund}' }.`)
    }
  } finally {
    raeumeVerzeichnis(dateiAlsBasisVerzeichnis)
  }
}

// ─── (d) Derselbe Rot-Fall über einen echten HTTP-Aufruf: kein 500 ─────────
{
  const dateiAlsBasisVerzeichnis = `kontrollzustand-test-f32-ansicht-rotfall-http-${randomUUID()}.txt`
  writeFileSync(dateiAlsBasisVerzeichnis, 'ich bin ein Verzeichnis, keine Datei', 'utf8')
  const globalerLaufZustand = { aktiv: false, laufId: null, abortController: null }
  const handler = erzeugeRequestHandler({ basisVerzeichnis: dateiAlsBasisVerzeichnis, startvorlagePfad: 'startvorlagen/beispielprojekt.json', globalerLaufZustand })
  const server = createServer(handler)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    const { port } = server.address()
    const antwort = await fetch(`http://127.0.0.1:${port}/api/verbrauch`)
    if (antwort.status !== 200) {
      befunde.push(`(d) GET /api/verbrauch (Rot-Fall): erwartet 200 (kein 500), erhalten ${antwort.status}`)
    } else {
      const koerper = await antwort.json()
      if (koerper.status !== 'fehler' || typeof koerper.grund !== 'string') {
        befunde.push(`(d) GET /api/verbrauch (Rot-Fall): erwartet { status: 'fehler', grund }, erhalten ${JSON.stringify(koerper)}`)
      } else {
        console.log("✓ (d) echter HTTP-Aufruf bei IO-Fehler → 200 (kein 500), Fachergebnis { status: 'fehler', grund }.")
      }
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
    raeumeVerzeichnis(dateiAlsBasisVerzeichnis)
  }
}

// ─── (e) F-518, grün: gültiges von/bis und gar kein von/bis bleiben gültig ──
{
  const basisVerzeichnis = `kontrollzustand-test-f32-ansicht-zeitraum-gruen-${randomUUID()}`
  const gueltig = baueVerbrauchsProjektion(basisVerzeichnis, { von: '2026-01-01', bis: '2026-12-31' })
  if (gueltig.status !== 'ok') {
    befunde.push(`(e) gültiges von/bis (YYYY-MM-DD): erwartet { status: 'ok' }, erhalten ${JSON.stringify(gueltig)}`)
  } else {
    console.log("✓ (e) gültiges von/bis (YYYY-MM-DD, von <= bis) → { status: 'ok' }.")
  }

  const ohneZeitraum = baueVerbrauchsProjektion(basisVerzeichnis)
  if (ohneZeitraum.status !== 'ok') {
    befunde.push(`(e) kein von/bis: erwartet { status: 'ok' }, erhalten ${JSON.stringify(ohneZeitraum)}`)
  } else {
    console.log("✓ (e) kein von/bis (beide optional) → weiterhin { status: 'ok' }.")
  }
}

// ─── (f) F-518, Rot-Fall Format: ungültiges von/bis ─────────────────────────
{
  const basisVerzeichnis = `kontrollzustand-test-f32-ansicht-zeitraum-format-${randomUUID()}`
  const ungueltigesVon = baueVerbrauchsProjektion(basisVerzeichnis, { von: 'nicht-datum', bis: '2026-12-31' })
  if (ungueltigesVon.status !== 'zeitraum_ungueltig' || typeof ungueltigesVon.grund !== 'string' || ungueltigesVon.grund.length === 0) {
    befunde.push(`(f) ungültiges 'von' ('nicht-datum'): erwartet { status: 'zeitraum_ungueltig', grund }, erhalten ${JSON.stringify(ungueltigesVon)}`)
  } else {
    console.log(`✓ (f) ungültiges 'von' ('nicht-datum') → { status: 'zeitraum_ungueltig', grund: '${ungueltigesVon.grund}' }.`)
  }

  const nichtExistierendesDatum = baueVerbrauchsProjektion(basisVerzeichnis, { bis: '2026-02-30' })
  if (nichtExistierendesDatum.status !== 'zeitraum_ungueltig') {
    befunde.push(`(f) nicht-existierendes Kalenderdatum ('2026-02-30' als bis): erwartet { status: 'zeitraum_ungueltig' }, erhalten ${JSON.stringify(nichtExistierendesDatum)}`)
  } else {
    console.log("✓ (f) nicht-existierendes Kalenderdatum ('2026-02-30' als bis) → { status: 'zeitraum_ungueltig' }.")
  }
}

// ─── (g) F-518, Rot-Fall Reihenfolge: von > bis ─────────────────────────────
{
  const basisVerzeichnis = `kontrollzustand-test-f32-ansicht-zeitraum-reihenfolge-${randomUUID()}`
  const vertauscht = baueVerbrauchsProjektion(basisVerzeichnis, { von: '2026-12-31', bis: '2026-01-01' })
  if (vertauscht.status !== 'zeitraum_ungueltig' || typeof vertauscht.grund !== 'string' || vertauscht.grund.length === 0) {
    befunde.push(`(g) von > bis: erwartet { status: 'zeitraum_ungueltig', grund }, erhalten ${JSON.stringify(vertauscht)}`)
  } else {
    console.log(`✓ (g) von (2026-12-31) > bis (2026-01-01) → { status: 'zeitraum_ungueltig', grund: '${vertauscht.grund}' }.`)
  }
}

// ─── (h) F-518, echter HTTP-Aufruf: Rot-Fälle liefern 400 ──────────────────
{
  const basisVerzeichnis = `kontrollzustand-test-f32-ansicht-zeitraum-http-${randomUUID()}`
  const globalerLaufZustand = { aktiv: false, laufId: null, abortController: null }
  const handler = erzeugeRequestHandler({ basisVerzeichnis, startvorlagePfad: 'startvorlagen/beispielprojekt.json', globalerLaufZustand })
  const server = createServer(handler)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    const { port } = server.address()

    const formatAntwort = await fetch(`http://127.0.0.1:${port}/api/verbrauch?von=nicht-datum`)
    if (formatAntwort.status !== 400) {
      befunde.push(`(h) GET /api/verbrauch?von=nicht-datum: erwartet 400, erhalten ${formatAntwort.status}`)
    } else {
      const koerper = await formatAntwort.json()
      if (typeof koerper.grund !== 'string' || koerper.grund.length === 0) {
        befunde.push(`(h) GET /api/verbrauch?von=nicht-datum: erwartet Grund im Körper, erhalten ${JSON.stringify(koerper)}`)
      } else {
        console.log(`✓ (h) GET /api/verbrauch?von=nicht-datum → 400, Grund: '${koerper.grund}'.`)
      }
    }

    const reihenfolgeAntwort = await fetch(`http://127.0.0.1:${port}/api/verbrauch?von=2026-12-31&bis=2026-01-01`)
    if (reihenfolgeAntwort.status !== 400) {
      befunde.push(`(h) GET /api/verbrauch?von=2026-12-31&bis=2026-01-01: erwartet 400, erhalten ${reihenfolgeAntwort.status}`)
    } else {
      const koerper = await reihenfolgeAntwort.json()
      if (typeof koerper.grund !== 'string' || koerper.grund.length === 0) {
        befunde.push(`(h) GET /api/verbrauch?von=2026-12-31&bis=2026-01-01: erwartet Grund im Körper, erhalten ${JSON.stringify(koerper)}`)
      } else {
        console.log(`✓ (h) GET /api/verbrauch?von=2026-12-31&bis=2026-01-01 (vertauscht) → 400, Grund: '${koerper.grund}'.`)
      }
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── Ergebnis ───────────────────────────────────────────────────────────────
// process.exitCode statt process.exit() (Muster check-f33-projektkontext.mjs): (b) und (d) öffnen
// und schließen nacheinander zwei reale HTTP-Server im selben Prozess — ein hartes process.exit()
// direkt danach kollidierte real (reproduzierbar, nicht einmalig) mit einem noch schließenden
// libuv-Handle des zweiten Servers ("Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)",
// exit 127, src/win/async.c). process.exitCode setzt nur den Exit-Code und lässt den Prozess über
// die normale Event-Loop-Räumung beenden, statt ihn hart abzuwürgen.
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
