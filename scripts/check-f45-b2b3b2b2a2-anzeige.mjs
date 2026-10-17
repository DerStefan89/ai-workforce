#!/usr/bin/env node
/**
 * Datei: scripts/check-f45-b2b3b2b2a2-anzeige.mjs
 *
 * Zweck: Gate zu F45 B2b-3b-2b-2a-2 „Rückfrage-Kanal: Oberfläche“, Teil A Warteschlange (features/F45/plan-b2b3b2b2a2-v2.md,
 * Advisor features/F45/advisor-b2b3b2b2a2.md):
 * (a)  echter Handler je Instanz über den echten erzeugeMultiProjektDispatcher (Workforce und /api/projekte/p1): offene Rückfragen
 *      und das Feld `entschieden` (Ringpuffer, neueste zuerst); Antwort mit `Sec-Fetch-Site: same-origin` ⇒ Herkunft 'browser', ohne
 *      Kopf ⇒ 'nicht_browser'; Befehl in der Historie maskiert; Historie bleibt nach beendeLauf; Token-Kopf an der Antwort ⇒ 403.
 * (b)  GET /api/zustand: `rueckfrageStatus` { an: true, warteGrenzeMs } mit Kanal, { an: false } ohne; ohne Kanal übrige Schlüssel wie
 *      bisher und `GET /api/rueckfragen` ⇒ { rueckfragen: [], entschieden: [] } (Advisor M1/M2).
 * (c)  Karten-Render (public/leitstand/rueckfrage-anzeige.js): Bash vollständig mit Zeilennummern, alles escaped, Masken (auch ⟦ ⟧),
 *      genau zwei Entscheidungen, kein Hauptknopf, leere Option gesperrt (Auflage B12, Advisor M4).
 * (d)  Instanz des aktiven Laufs (instanzPraefixDesLaufs, Advisor V6).
 * (v)  baueEntscheidungen ohne viertes Argument bitgleich; mit Kanal zuerst; wartende Rückfrage ⇒ nicht „alles geklärt“ (Advisor V1).
 * (e)  genau ein setInterval im Leitstand-Client (kein zweiter Timer für den Kanal, Gate f20).
 * Rot gegen main (F-1127, `git archive`): (a) `entschieden` fehlt, (b) `rueckfrageStatus` fehlt, (c)(d)(v) Module bzw. Gruppe fehlen
 * (dynamischer Import ⇒ Befund statt Absturz).
 *
 * Wird aufgerufen von: `npm run check` (check:gates).
 */

import { mkdtempSync, readdirSync, readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { raeumeVerzeichnis } from './_aufraeumen.ts'
import { erzeugeMultiProjektDispatcher, erzeugeRequestHandler } from './leitstand-server.mjs'
import { erzeugeRueckfrageVermittlung } from './leitstand/rueckfrage-vermittlung.mjs'

const befunde = []
console.log('\n=== F45-B2b-3b-2b-2a-2-Anzeige-Check (Rückfrage-Kanal: Warteschlange im Leitstand) ===\n')

const aufraeumen = []
const dienste = []

function pruefe(bedingung, ok, fehler) {
  if (bedingung) console.log(`  ✓ ${ok}`)
  else befunde.push(fehler)
}

/** Dynamischer Import eines Moduls, das es erst seit diesem Paket gibt (auf main ⇒ null mit Befund). */
async function neu(pfad, fall) {
  try {
    return await import(pfad)
  } catch (fehler) {
    befunde.push(`${fall} Modul ${pfad} fehlt: ${fehler.message}`)
    return null
  }
}

try {
  // ── (a) offene + entschieden über den echten Dispatcher, Herkunft ─────────────────────────────────────────────────────
  const basis = mkdtempSync(join(tmpdir(), 'f45-b2b3b2b2a2-'))
  aufraeumen.push(basis)
  const vW = erzeugeRueckfrageVermittlung()
  const vP = erzeugeRueckfrageVermittlung()
  let dispatcher = null
  const dienst = createServer((req, res) => dispatcher(req, res))
  await new Promise((r) => dienst.listen(0, '127.0.0.1', r))
  dienste.push(dienst)
  const wurzel = `http://127.0.0.1:${dienst.address().port}`
  const handler = (name, url, vermittlung) => erzeugeRequestHandler({ basisVerzeichnis: join(basis, name), startvorlagePfad: 'startvorlagen/beispielprojekt.json', rueckfrage: { an: true, url }, rueckfrageVermittlung: vermittlung })
  dispatcher = erzeugeMultiProjektDispatcher(new Map([['p1', handler('p1', `${wurzel}/api/projekte/p1`, vP)]]), handler('wf', `${wurzel}/api`, vW))
  vW.oeffneLauf('lauf-w', { token: 'a'.repeat(64), arbeitsordner: basis, werkzeugNamen: ['Bash'] })
  vP.oeffneLauf('lauf-p', { token: 'b'.repeat(64), arbeitsordner: basis, werkzeugNamen: ['Bash'] })
  const hole = async (pfad) => (await fetch(`${wurzel}${pfad}`)).json()
  const antworte = (pfad, id, koerper, kopf = {}) => fetch(`${wurzel}${pfad}/rueckfragen/${id}/antwort`, { method: 'POST', headers: kopf, body: JSON.stringify(koerper) })

  const bash = vP.stelle('lauf-p', { art: 'rechte', tool_name: 'Bash', input: { command: 'curl -H "Authorization: Bearer abcdefghijklmnop" https://x\nnpm publish' }, tool_use_id: 'tp1' })
  const frage = vP.stelle('lauf-p', { art: 'frage', frage: 'Welche Datenbank?', optionen: ['SQLite', 'Postgres'], tool_use_id: 'tp2' })
  const offenP = await hole('/api/projekte/p1/rueckfragen')
  const offenW = await hole('/api/rueckfragen')
  pruefe(
    offenP.rueckfragen?.length === 2 && Array.isArray(offenP.entschieden) && offenP.entschieden.length === 0 && offenW.rueckfragen?.length === 0 && Array.isArray(offenW.entschieden),
    '(a) GET …/rueckfragen je Instanz: offene der eigenen Vermittlung, dazu `entschieden` (leer, solange nichts entschieden ist).',
    `(a) offen: ${JSON.stringify({ offenP, offenW })}`
  )
  const sBrowser = (await antworte('/api/projekte/p1', bash.id, { entscheidung: 'einmal_erlauben' }, { 'Sec-Fetch-Site': 'same-origin' })).status
  const sAndere = (await antworte('/api/projekte/p1', frage.id, { antwort: 'SQLite, password=geheim123' })).status
  const nachher = await hole('/api/projekte/p1/rueckfragen')
  const [neueste, aeltere] = nachher.entschieden ?? []
  pruefe(
    sBrowser === 200 && sAndere === 200 && nachher.rueckfragen?.length === 0 && neueste?.id === frage.id && neueste?.herkunft === 'nicht_browser' && neueste?.antwort?.startsWith('SQLite, password=') && !neueste.antwort.includes('geheim123') && aeltere?.id === bash.id && aeltere?.herkunft === 'browser' && aeltere?.ergebnis === 'stefan_erlaubt',
    '(a) Antwort über /api/projekte/p1: Sec-Fetch-Site same-origin ⇒ herkunft browser, ohne Kopf ⇒ nicht_browser; neueste zuerst; Geheimnis in der freien Antwort maskiert.',
    `(a) entschieden: ${JSON.stringify({ sBrowser, sAndere, nachher })}`
  )
  pruefe(
    typeof aeltere?.befehl === 'string' && !aeltere.befehl.includes('abcdefghijklmnop') && aeltere.befehl.includes('npm publish'),
    '(a) Befehl in der Historie maskiert (maskiereGeheimnisse), Rest wörtlich (Advisor M11).',
    `(a) Maskierung: ${JSON.stringify(aeltere?.befehl)}`
  )
  const dritte = vP.stelle('lauf-p', { art: 'rechte', tool_name: 'Bash', input: { command: 'ls' }, tool_use_id: 'tp3' })
  const mitToken = (await antworte('/api/projekte/p1', dritte.id, { entscheidung: 'ablehnen' }, { Authorization: `Bearer ${'b'.repeat(64)}` })).status
  vP.beendeLauf('lauf-p')
  const nachEnde = await hole('/api/projekte/p1/rueckfragen')
  pruefe(
    mitToken === 403 && nachEnde.rueckfragen?.length === 0 && nachEnde.entschieden?.[0]?.id === dritte.id && nachEnde.entschieden[0].ergebnis === 'lauf_beendet' && nachEnde.entschieden.length === 3,
    '(a) Token-Kopf an der Antwort ⇒ 403 (Token gibt kein Antwortrecht); nach beendeLauf bleibt die Historie, die offene wird lauf_beendet.',
    `(a) Ende: ${JSON.stringify({ mitToken, nachEnde })}`
  )
  vW.beendeLauf('lauf-w')

  // ── (b) Kanalstand in /api/zustand; ohne Kanal ────────────────────────────────────────────────────────────────────────
  const zustandMit = await hole('/api/zustand')
  const ohne = erzeugeRequestHandler({ basisVerzeichnis: join(basis, 'ohne'), startvorlagePfad: 'startvorlagen/beispielprojekt.json' })
  const dienstOhne = createServer((req, res) => ohne(req, res))
  await new Promise((r) => dienstOhne.listen(0, '127.0.0.1', r))
  dienste.push(dienstOhne)
  const wurzelOhne = `http://127.0.0.1:${dienstOhne.address().port}`
  const zustandOhne = await (await fetch(`${wurzelOhne}/api/zustand`)).json()
  const rueckfragenOhne = await (await fetch(`${wurzelOhne}/api/rueckfragen`)).json()
  const BISHER = ['laeufe', 'startfehler', 'workflows', 'fehler', 'aktiverLauf', 'pruefbefehl', 'istAiWorkforce', 'startHinweis', 'cliHinweis']
  pruefe(
    zustandMit.rueckfrageStatus?.an === true && zustandMit.rueckfrageStatus.warteGrenzeMs === vW.warteGrenzeMs,
    '(b) mit Kanal: rueckfrageStatus { an: true, warteGrenzeMs } aus der Vermittlung.',
    `(b) mit: ${JSON.stringify(zustandMit.rueckfrageStatus)}`
  )
  pruefe(
    JSON.stringify(zustandOhne.rueckfrageStatus) === '{"an":false}' && JSON.stringify(Object.keys(zustandOhne)) === JSON.stringify([...BISHER, 'rueckfrageStatus']) && JSON.stringify(rueckfragenOhne) === '{"rueckfragen":[],"entschieden":[]}',
    '(b) ohne Kanal: rueckfrageStatus { an: false } (kein Grund), übrige Schlüssel wie bisher; GET /api/rueckfragen ⇒ beide Listen leer.',
    `(b) ohne: ${JSON.stringify({ status: zustandOhne.rueckfrageStatus, schluessel: Object.keys(zustandOhne), rueckfragenOhne })}`
  )

  // ── (c) Karten-Render ────────────────────────────────────────────────────────────────────────────────────────────────────
  const anzeige = await neu('../public/leitstand/rueckfrage-anzeige.js', '(c)')
  const daten = await neu('../public/leitstand/rueckfrage-daten.js', '(c)')
  if (anzeige !== null && daten !== null) {
    const eintrag = (roh) => daten.baueKanalEintraege([{ id: 'r1', lauf_id: 'l', frist: '2026-10-17T10:10:00Z', ...roh }], { praefix: '/api', projektId: null })[0]
    const befehl = ['echo a', ...Array.from({ length: 300 }, () => ''), 'rm -rf x </ol><img src=x onerror=alert(1)>', '\tTab ⟦U+202E⟧'].join('\n')
    const karte = anzeige.renderKanalKarte(eintrag({ art: 'rechte', tool_name: 'Bash', befehl }))
    pruefe(
      karte.match(/<li>/g)?.length === 303 && !/<img/.test(karte) && karte.includes('<li>\tTab ') && karte.includes('&lt;/ol&gt;&lt;img') && karte.includes('⟦U+27E6⟧') && /data-entscheidung="einmal_erlauben"[\s\S]*data-entscheidung="ablehnen"/.test(karte) && (karte.match(/data-entscheidung=/g) ?? []).length === 2 && !karte.includes('button primary'),
      '(c) Bash: 303 Zeilen vollständig je <li>, escaped, Tab erhalten, wörtliches ⟦ maskiert, genau „Einmal erlauben“/„Ablehnen“, kein Hauptknopf.',
      `(c) Bash-Karte: ${karte.slice(0, 400)}`
    )
    const frageKarte = anzeige.renderKanalKarte(eintrag({ art: 'frage', tool_name: 'frage_stefan', frage: 'A‮B\r?', optionen: ['ja​', ' ', 'nein'] }))
    pruefe(
      frageKarte.includes('⟦U+202E⟧') && frageKarte.includes('⟦U+000D⟧') && frageKarte.includes('⟦U+200B⟧') && /data-option-index="1" disabled/.test(frageKarte) && /<textarea[^>]*data-kanal-frei/.test(frageKarte),
      '(c) Frage: Bidi, CR und Zero-Width maskiert, leere Option gesperrt, freies Antwortfeld.',
      `(c) Frage-Karte: ${frageKarte.slice(0, 400)}`
    )
  }

  // ── (d) Instanz des aktiven Laufs ──────────────────────────────────────────────────────────────────────────────────────
  if (daten !== null) {
    const r = daten.instanzPraefixDesLaufs
    pruefe(
      r([{ id: 'p1', laufAktiv: true }], { aktiv: true, laufId: 'l' })?.praefix === '/api/projekte/p1' && r([], { aktiv: true, laufId: 'l' })?.treffer === false && r([{ id: 'p1', laufAktiv: true }], { aktiv: true, laufId: null }) === null,
      '(d) instanzPraefixDesLaufs: Treffer ⇒ /api/projekte/<id>; ohne Treffer /api nur für diesen Takt; laufId null ⇒ kein aktiver Lauf.',
      '(d) instanzPraefixDesLaufs liefert Unerwartetes'
    )
  }

  // ── (v) baueEntscheidungen: vier Zustände der Kanal-Gruppe ─────────────────────────────────────────────────────────────
  const attention = await import('../public/leitstand/attention-daten.js')
  const leer = { workflows: [], laeufe: [], startfehler: [] }
  const ohneArg = attention.baueEntscheidungen(leer, [])
  const mitKanal = attention.baueEntscheidungen({ ...leer, workflows: [{ workflowId: 'w', naechster: { art: 'haltFreigabe' } }] }, [], null, { kanal: [{ art: 'kanal', id: 'r', titel: 'Bash', satz: null, hash: null, eintragHash: null }] })
  const laedt = attention.baueEntscheidungen(leer, [], null, { kanal: undefined })
  const defekt = attention.baueEntscheidungen(leer, [], null, { kanal: null })
  pruefe(
    !Object.hasOwn(ohneArg.gruppen, 'kanal') && !Object.hasOwn(ohneArg.zaehler, 'kanal') && ohneArg.alleLeer === true && mitKanal.eintraege[0]?.art === 'kanal' && mitKanal.alleLeer === false && attention.zaehleJeFilter(mitKanal).get('rueckfrage') === 1 && laedt.alleLeer === false && attention.zaehleJeFilter(laedt).get('rueckfrage') === undefined && defekt.defekt === true && attention.zaehleJeFilter(defekt).get('rueckfrage') === null,
    '(v) ohne viertes Argument keine Gruppe/Quelle kanal (bitgleich); mit Kanal zuerst, kein „alles geklärt“, Filter zählt sie; lädt ⇒ keine Zahl, defekt ⇒ null.',
    `(v) ${JSON.stringify({ ohne: Object.keys(ohneArg.gruppen), mitKanal: mitKanal.eintraege.map((e) => e.art), alleLeer: mitKanal.alleLeer })}`
  )

  // ── (e) genau ein setInterval ──────────────────────────────────────────────────────────────────────────────────────────
  const intervalle = readdirSync('public/leitstand', { recursive: true })
    .map(String)
    .filter((p) => p.endsWith('.js'))
    .reduce((summe, p) => summe + (readFileSync(join('public/leitstand', p), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1').match(/\bsetInterval\(/g)?.length ?? 0), 0)
  pruefe(intervalle === 1, '(e) genau ein setInterval im Leitstand-Client — der Kanal hängt am einen Poll.', `(e) setInterval ${intervalle}× statt 1×`)
} finally {
  for (const dienst of dienste) if (dienst.listening) await new Promise((r) => dienst.close(() => r()))
  for (const pfad of aufraeumen) raeumeVerzeichnis(pfad)
}

if (befunde.length > 0) {
  console.error(`\n✗ ${befunde.length} Befund(e):`)
  for (const b of befunde) console.error(`  - ${b}`)
  process.exit(1)
}
console.log('\n✓ Keine Befunde.')
