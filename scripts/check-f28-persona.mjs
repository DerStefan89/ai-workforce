/**
 * Datei: scripts/check-f28-persona.mjs
 *
 * Zweck: F28-Gate (Persona v1 WS-1, v2 WS-2). Drei Teile: (1) keine
 * Farbliterale (Hex oder rgb()/rgba() ohne var()) in public/leitstand/
 * persona.js, public/leitstand/persona-state.js oder public/leitstand/
 * index.html — dasselbe Regex-Muster wie scripts/check-f20-design-tokens.mjs,
 * dort aber NUR auf style.css angewendet; dieses Gate deckt die drei
 * Dateien, die jenes Gate nicht liest (Auftrag: "ein Literal im SVG würde
 * vom Gate nicht gefunden"). index.html wird komplett geprüft, nicht nur ein
 * ausgezeichneter "Persona-Block" — es gibt aktuell an keiner Stelle der
 * Datei ein Farbliteral, ein enger geschnittener Block wäre hier nur
 * zusätzliche Komplexität ohne zusätzlichen Schutz (state/findings.md
 * F-438: die generelle Gate-Lücke — kein Farbliteral-Check für JS-Dateien
 * außerhalb dieser drei — bleibt offen, dieses Gate mitigiert sie nur für
 * die Persona-Dateien). (2) leitePersonaZustandAb (persona-state.js)
 * liefert für kalibrierte Eingaben die vier erwarteten Zustände —
 * inklusive zweier null-Quellen (defekte Quelle wirft nicht) und der
 * Prioritätskollision error+waiting_for_human (error gewinnt). (3) F28
 * WS-2: CONTENT_TYPES (scripts/leitstand-server.mjs) liefert für
 * 'persona-gesicht.webp' real 'image/webp' statt des generischen
 * 'application/octet-stream'-Fallbacks — Rot-Fall-kalibriert gegen eine
 * bewusst UNregistrierte Endung, die genau diesen Fallback auslösen muss
 * (beweist, dass eine fehlende Zuordnung im Grünfall real auffiele), plus
 * ein Existenz-Check der Bilddatei selbst.
 *
 * Wird aufgerufen von: npm run check.
 *
 * Aufruf: node scripts/check-f28-persona.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { createServer } from 'node:http'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { erzeugeRequestHandler } from './leitstand-server.mjs'
import { raeumeVerzeichnis } from './_aufraeumen.ts'
import { leitePersonaZustandAb } from '../public/leitstand/persona-state.js'

const befunde = []
console.log('\n=== F28-Check (Persona: Design-Tokens, Zustandsableitung, WS-2 Bildausspielung) ===\n')

// ─── (1) Keine Farbliterale in persona.js/persona-state.js/index.html ──────
{
  const befundeVor1 = befunde.length
  // Muster wie scripts/check-f20-design-tokens.mjs: ein rgb()/rgba()-Aufruf, der 'var(' enthält,
  // ist eine erlaubte Token-Nutzung (z. B. 'rgba(var(--x-rgb), 0.4)'), kein Farbliteral.
  const FARB_MUSTER = /#[0-9a-fA-F]{3,8}\b|\brgba?\((?:[^()]|\([^()]*\))*\)/g
  const dateien = ['public/leitstand/persona.js', 'public/leitstand/persona-state.js', 'public/leitstand/index.html']
  for (const pfad of dateien) {
    const inhalt = readFileSync(pfad, 'utf8')
    const treffer = (inhalt.match(FARB_MUSTER) ?? []).filter((fund) => !(fund.startsWith('rgb') && fund.includes('var(')))
    if (treffer.length > 0) {
      befunde.push(`(1) ${treffer.length} Farbliteral(e) in ${pfad}: ${[...new Set(treffer)].join(', ')}`)
    }
  }
  if (befunde.length === befundeVor1) {
    console.log('✓ (1) Keine Farbliterale in persona.js, persona-state.js oder index.html.')
  }
}

// ─── (2) leitePersonaZustandAb: kalibrierte Fälle, strikte Priorität ───────
{
  const befundeVor2 = befunde.length
  const LEER = { fehler: [], startfehler: [], laeufe: [], workflows: [], aktiverLauf: { aktiv: false, laufId: null } }
  const AUFMERKSAMKEIT_LAUF = { ergebnis: 'FEHLGESCHLAGEN', kenntnisgenommen: false }
  const AUFMERKSAMKEIT_WORKFLOW = { naechster: { art: 'haltFreigabe' } }

  const faelle = [
    { name: 'idle: leeres Aggregat', eingabe: LEER, erwartet: 'idle' },
    { name: 'thinking: aktiverLauf.aktiv === true', eingabe: { ...LEER, aktiverLauf: { aktiv: true, laufId: 'x' } }, erwartet: 'thinking' },
    { name: 'waiting_for_human: ein Workflow mit haltFreigabe', eingabe: { ...LEER, workflows: [AUFMERKSAMKEIT_WORKFLOW] }, erwartet: 'waiting_for_human' },
    { name: 'error: zustand.fehler nicht leer', eingabe: { ...LEER, fehler: [{ quelle: 'laeufe', grund: 'x' }] }, erwartet: 'error' },
    { name: 'error: zustand.startfehler nicht leer', eingabe: { ...LEER, startfehler: [{ laufId: 'x' }] }, erwartet: 'error' },
    { name: 'error: ein fehlgeschlagener, nicht kenntnisgenommener Lauf', eingabe: { ...LEER, laeufe: [AUFMERKSAMKEIT_LAUF] }, erwartet: 'error' },
    // Prioritätskollision: error UND waiting_for_human gleichzeitig erfüllt — error muss gewinnen.
    { name: 'Prioritätskollision error+waiting_for_human: error gewinnt', eingabe: { ...LEER, fehler: [{ quelle: 'x', grund: 'x' }], workflows: [AUFMERKSAMKEIT_WORKFLOW] }, erwartet: 'error' },
    // Prioritätskollision: waiting_for_human UND thinking gleichzeitig erfüllt — waiting_for_human muss gewinnen.
    { name: 'Prioritätskollision waiting_for_human+thinking: waiting_for_human gewinnt', eingabe: { ...LEER, workflows: [AUFMERKSAMKEIT_WORKFLOW], aktiverLauf: { aktiv: true, laufId: 'x' } }, erwartet: 'waiting_for_human' },
    // null-Quellen (defekte Quelle, Muster sammleZustandsQuelle) — dürfen nicht werfen.
    { name: 'null-Quelle laeufe wirft nicht, bleibt idle ohne weitere Signale', eingabe: { ...LEER, laeufe: null }, erwartet: 'idle' },
    { name: 'null-Quelle workflows wirft nicht, bleibt idle ohne weitere Signale', eingabe: { ...LEER, workflows: null }, erwartet: 'idle' },
    { name: 'null-Quellen laeufe+workflows gleichzeitig, dennoch error über zustand.fehler', eingabe: { ...LEER, laeufe: null, workflows: null, fehler: [{ quelle: 'laeufe', grund: 'x' }] }, erwartet: 'error' },
    // QA-Pass 18.09.2026 (TC-03): aktiverLauf fehlt komplett im Aggregat (Altbestand vor F28,
    // nicht nur { aktiv: false }) — darf nicht werfen, muss wie 'kein aktiver Lauf' behandelt werden.
    { name: 'idle: aktiverLauf-Feld fehlt komplett (Altbestand)', eingabe: (() => { const { aktiverLauf: _weg, ...rest } = LEER; return rest })(), erwartet: 'idle' },
  ]

  for (const fall of faelle) {
    let ergebnis
    try {
      ergebnis = leitePersonaZustandAb(fall.eingabe)
    } catch (fehlerObjekt) {
      befunde.push(`(2) Fall '${fall.name}': leitePersonaZustandAb wirft (${fehlerObjekt.message}) — darf laut Auftrag nie werfen.`)
      continue
    }
    if (ergebnis !== fall.erwartet) {
      befunde.push(`(2) Fall '${fall.name}': erwartet '${fall.erwartet}', erhalten '${ergebnis}'.`)
    }
  }

  if (befunde.length === befundeVor2) {
    console.log(`✓ (2) leitePersonaZustandAb: alle ${faelle.length} kalibrierten Fälle korrekt (vier Zustände, Prioritätskollisionen, null-Quellen).`)
  }
}

// ─── (3) F28 WS-2: CONTENT_TYPES liefert '.webp' real, persona-gesicht.webp existiert ──
{
  const befundeVor3 = befunde.length
  const BILD_PFAD = 'public/leitstand/persona-gesicht.webp'

  if (!existsSync(BILD_PFAD)) {
    befunde.push(`(3) ${BILD_PFAD} fehlt — F28 WS-2 baut auf diese von Stefan bereitgestellte Datei, keine Ersatzgrafik (Auftrag: bei fehlender Datei abbrechen und melden).`)
  } else {
    const repoWurzel = mkdtempSync(join(tmpdir(), 'f28-persona-webp-repowurzel-'))
    try {
      const publicVerzeichnis = join(repoWurzel, 'public-leitstand')
      mkdirSync(publicVerzeichnis, { recursive: true })
      writeFileSync(join(publicVerzeichnis, 'persona-gesicht.webp'), readFileSync(BILD_PFAD))
      // Rot-Fall-Kalibrierung: eine Datei mit einer NICHT in CONTENT_TYPES registrierten Endung
      // fällt auf den generischen 'application/octet-stream'-Fallback zurück — beweist, dass eine
      // fehlende Zuordnung real auffiele (genau der Zustand vor diesem Fix für '.webp').
      writeFileSync(join(publicVerzeichnis, 'unregistriert.xyz'), 'x')

      const server = createServer(erzeugeRequestHandler({ publicVerzeichnis }))
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
      const { port } = server.address()
      const basisUrl = `http://127.0.0.1:${port}`
      try {
        const rotAntwort = await fetch(`${basisUrl}/unregistriert.xyz`)
        const rotTyp = rotAntwort.headers.get('content-type')
        if (rotTyp !== 'application/octet-stream') {
          befunde.push(`(3) Rot-Fall-Kalibrierung: eine unregistrierte Endung sollte 'application/octet-stream' liefern (Beleg, dass der Fallback real greift) — erhalten '${rotTyp}'.`)
        }

        const gruenAntwort = await fetch(`${basisUrl}/persona-gesicht.webp`)
        if (gruenAntwort.status !== 200) {
          befunde.push(`(3) GET /persona-gesicht.webp sollte 200 liefern — erhalten ${gruenAntwort.status}.`)
        }
        const gruenTyp = gruenAntwort.headers.get('content-type')
        if (gruenTyp !== 'image/webp') {
          befunde.push(`(3) GET /persona-gesicht.webp sollte Content-Type 'image/webp' liefern (CONTENT_TYPES-Eintrag) — erhalten '${gruenTyp}'.`)
        }
      } finally {
        await new Promise((resolve) => server.close(resolve))
      }
    } finally {
      raeumeVerzeichnis(repoWurzel)
    }
  }

  if (befunde.length === befundeVor3) {
    console.log("✓ (3) persona-gesicht.webp existiert und wird real mit Content-Type 'image/webp' ausgeliefert; eine unregistrierte Endung fällt weiterhin auf 'application/octet-stream' zurück (Rot-Fall-Beleg).")
  }
}

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
