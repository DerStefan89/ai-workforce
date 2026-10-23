#!/usr/bin/env node
/**
 * Datei: scripts/check-f45-b5a1-akte.mjs
 *
 * Zweck: Gate für F45 B5a-1 „Akte schreiben“ (features/F45/plan-b5a1-v2.md, Advisor features/F45/advisor-b5a1.md; E-F45-1,
 * F-912, F-995). Attrappen entstehen zur Laufzeit (Projekt und Kontrollzustand im tmp, nichts eingecheckt). Echter Handler
 * über HTTP, dazu der Multi-Projekt-Dispatcher für die Präfix-Proben.
 * (a) PUT mit abweichendem Hash ⇒ 409 mit aktuellem Hash, Datei bytegleich;
 * (b) Sperre: ein offener Ablauf, dessen Auftrag feature_ref = <id> trägt ⇒ 409 mit workflowId, Datei bytegleich;
 *     Gegenprobe: nur ein ABGESCHLOSSENER Ablauf auf dem Feature ⇒ 200;
 * (c) grund leer ⇒ 400, Datei bytegleich;
 * (d) bytegleich außerhalb von Ziel, Nicht-Zielen, AKs und „## Änderungen“ bei LF und bei CRLF, Zeilenende erhalten (keine
 *     nackte LF in der CRLF-Akte), Änderungszeile angehängt, neuer Hash = Hash der Datei, Git-Block in Blockform;
 *     Gegenprobe: der Vergleich erkennt ein geändertes Byte außerhalb;
 * (e) Anlage aus Coach-Scope ⇒ 201, Status ENTWURF; zweite Anlage ⇒ neue ID, erste Akte bytegleich; Anlage auf eine belegte
 *     ID (veraltete ID-Sicht) ⇒ 409, Datei bytegleich;
 * (f) nächste freie ID über Ordner unter features/ UND roadmap.json;
 * (g) GET …/akte liefert entscheidungen[] (nur E-Kennungen am Bullet-Anfang) und hash;
 * (h) Ergebnis bestünde das Feature-Akte-Gate nicht ⇒ 422 mit verstoesse, Datei bytegleich;
 * (i) CSRF: fremde Herkunft (Origin bzw. Sec-Fetch-Site) ⇒ 403 für PUT …/akte und POST /api/features, direkt und über
 *     /api/projekte/<id>/…, nichts geschrieben; gleiche Herkunft über den Präfix erreicht die Routen;
 * (k) falsche Methode ⇒ 405 (GET /api/features, DELETE …/akte, PUT /api/features);
 * (l) Server: erkenneAkteRoute( genau einmal, kein eigener Regex-Dispatch für …/akte mehr.
 * Randfälle der reinen Funktionen belegen src/feature-auftrag/akte-schreiben.test.ts, src/product-coach/product-coach.test.ts
 * und scripts/leitstand/routen-f35.test.mjs in derselben Kette.
 *
 * Wird aufgerufen von: `npm run check:gates` (und damit `npm run check`).
 *
 * Aufruf: node scripts/check-f45-b5a1-akte.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { createHash, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { registriereAuftrag } from '../src/auftrag/index.ts'
import { findeAbschnitt } from '../src/feature-auftrag/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { registriereWorkflow } from '../src/workflow/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'
import { fuehreAkteRouteDurch } from './leitstand/routen-f35.mjs'
import { erzeugeMultiProjektDispatcher, erzeugeRequestHandler } from './leitstand-server.mjs'

const befunde = []
console.log('\n=== F45-B5a-1-Akte-schreiben-Check ===\n')
const dienste = []

/**
 * Meldet einen Fall: ✓ bei erfüllter Bedingung, sonst ein Befund.
 * @param bedingung - erfüllt?
 * @param ok - Text bei Erfolg
 * @param fehler - Befundtext
 */
function pruefe(bedingung, ok, fehler) {
  if (bedingung) console.log(`  ✓ ${ok}`)
  else befunde.push(fehler)
}

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')

const AKTE = [
  '# F3 — Gate',
  '',
  '## Titel',
  'Gate',
  '',
  '## Status',
  'Status: IN_ARBEIT',
  '',
  '## Ziel',
  'Altes Ziel.',
  '',
  '## Entscheidungen',
  '- **E-F3-1 = A** (Stefan) — gilt.',
  '- **Sammlung als Basis** — Muster E-F3-9 im Text, keine Kennung.',
  '',
  '## Nicht-Ziele',
  '- Nicht A.',
  '',
  '## Akzeptanzkriterien',
  '- AK1: Eins.',
  '- AK2: Zwei',
  '  weiter.',
  '',
  '## Stand X',
  'Bleibt **exakt** so.   ',
  '',
  '## Änderungen',
  '- 2026-10-01 · Ziel · alt',
  '',
].join('\n')

const SCOPE = { titel: 'Neues Feature', problem: 'Etwas fehlt.', ziel: 'Es ist da.', in_scope: ['Teil A'], out_of_scope: ['Teil B'], annahmen: [], offene_fragen: ['Wann?'], erfolgskriterium: 'Stefan sieht es.' }

/** Ein gültiger PUT-Körper. @param hash - gelesener Hash @param teil - Abweichungen @returns Körper */
const putKoerper = (hash, teil = {}) => ({ ziel: 'Neues Ziel.', nicht_ziele: ['Nicht A.'], akzeptanzkriterien: [{ id: 'AK1', text: 'Eins.' }, { id: 'AK2', text: 'Zwei\nweiter.' }, { id: 'AK3', text: 'Drei.' }], grund: 'Gate', hash, ...teil })

/** Text ohne die Spannen der genannten Abschnitte (Überschrift bis vor die nächste). @param text - Akte @param namen - Abschnitte @returns Rest */
function ohneAbschnitte(text, namen) {
  let rest = text
  for (const name of namen) {
    const spanne = findeAbschnitt(rest, name)
    if (spanne === null) continue
    rest = rest.slice(0, spanne.kopfStart) + rest.slice(spanne.koerperEnde)
  }
  return rest
}
const BEARBEITET = ['Ziel', 'Nicht-Ziele', 'Akzeptanzkriterien', 'Änderungen']

const basis = mkdtempSync(join(tmpdir(), 'f45-b5a1-'))
const repoWurzel = join(basis, 'projekt')
const basisVerzeichnis = join(basis, 'kontrollzustand')
const akten = { F3: AKTE, F4: AKTE.replace(/\n/g, '\r\n'), F5: AKTE.replace('Status: IN_ARBEIT', 'Status: UNSINN'), F6: AKTE, F7: AKTE }
for (const [id, inhalt] of Object.entries(akten)) {
  mkdirSync(join(repoWurzel, 'features', id), { recursive: true })
  writeFileSync(join(repoWurzel, 'features', id, 'feature.md'), inhalt)
}
mkdirSync(join(repoWurzel, 'docs', 'projekt'), { recursive: true })
writeFileSync(join(repoWurzel, 'docs', 'projekt', 'roadmap.json'), JSON.stringify({ meilensteine: [{ id: 'M1', features: ['F3', 'F20'] }] }))
const akteLesen = (id) => readFileSync(join(repoWurzel, 'features', id, 'feature.md'))

try {
  // ── Abläufe: F6 offen (sperrt), F7 nur abgeschlossen (sperrt nicht) ────────────────────────────────────────────────
  const profilReferenz = leiteProfilReferenzAb(ladeStartvorlage('startvorlagen/beispielprojekt.json'))
  const ladeOptionen = { basisVerzeichnis, schreiber: () => {} }
  const SCHRITT = { schritt_id: 'schritt-1-ausfuehrung', rolle: 'ausfuehrung', werkzeugsatz: 'schreibend', worker: 'claude-code', modell: 'claude-sonnet-5', eingaben: [], output_schema: null, freigabe: 'ZWINGEND', freigabe_erteilt: false, risiko: 'Gate-Fixture.', zeitgrenze_ms: 600000, nachfolger: null, status: 'OFFEN', lauf_id: null }
  const ablauf = (featureRef, status) => {
    const auftragId = randomUUID()
    registriereAuftrag(auftragId, profilReferenz, `Gate ${featureRef}`, 'Gate-Auftrag.', { ...ladeOptionen, feature_ref: featureRef })
    const workflowId = `f45-b5a1-${featureRef}-${randomUUID()}`
    const schritt = status === 'ABGESCHLOSSEN' ? { ...SCHRITT, status: 'ABGESCHLOSSEN', lauf_id: 'gate-lauf' } : SCHRITT
    registriereWorkflow({ workflow_schema: 'v0', workflow_id: workflowId, auftrag_id: auftragId, version: 1, ziel: `Gate ${featureRef}.`, status, aktiver_schritt_id: status === 'ABGESCHLOSSEN' ? null : SCHRITT.schritt_id, grenzen: { max_schritte: 6, max_replans: 1 }, schritte: [schritt] }, profilReferenz, ladeOptionen)
    return workflowId
  }
  const offenF6 = ablauf('F6', 'OFFEN')
  ablauf('F7', 'ABGESCHLOSSEN')

  const handler = erzeugeRequestHandler({ basisVerzeichnis, repoWurzel, installWurzel: process.cwd() })
  const dienst = createServer((req, res) => handler(req, res))
  await new Promise((r) => dienst.listen(0, '127.0.0.1', r))
  dienste.push(dienst)
  const direkt = `http://127.0.0.1:${dienst.address().port}/api`
  const dispatcher = createServer(erzeugeMultiProjektDispatcher(new Map([['p1', handler]]), handler))
  await new Promise((r) => dispatcher.listen(0, '127.0.0.1', r))
  dienste.push(dispatcher)
  // Der Dispatcher setzt den Rest nach der Projekt-id wieder mit '/api' zusammen: …/api/projekte/p1/features ⇒ /api/features.
  const praefix = `http://127.0.0.1:${dispatcher.address().port}/api/projekte/p1`

  /** HTTP-Aufruf. @returns { status, koerper } */
  const rufe = async (url, art, koerper, kopf = {}) => {
    const antwort = await fetch(url, { method: art, headers: { 'content-type': 'application/json', ...kopf }, body: koerper === undefined ? undefined : JSON.stringify(koerper) })
    return { status: antwort.status, koerper: await antwort.json().catch(() => ({})) }
  }
  const akteUrl = (b, id) => `${b}/features/${id}/akte`

  // ── (g) Lesen mit hash und entscheidungen ────────────────────────────────────────────────────────────────────────
  const gelesen = await rufe(akteUrl(direkt, 'F3'), 'GET')
  pruefe(
    gelesen.status === 200 && gelesen.koerper.hash === sha(akteLesen('F3')) && JSON.stringify(gelesen.koerper.entscheidungen) === JSON.stringify([{ id: 'E-F3-1', text: '**E-F3-1 = A** (Stefan) — gilt.' }]),
    '(g) GET …/akte liefert hash der Dateibytes und entscheidungen[] (nur E-Kennung am Bullet-Anfang).',
    `(g) ${JSON.stringify(gelesen)}`
  )

  // ── (a) Hash-409 ─────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const vorher = akteLesen('F3')
    const r = await rufe(akteUrl(direkt, 'F3'), 'PUT', putKoerper('b'.repeat(64)))
    pruefe(r.status === 409 && r.koerper.hash === sha(vorher) && akteLesen('F3').equals(vorher), '(a) abweichender Hash ⇒ 409 mit aktuellem Hash, Datei bytegleich.', `(a) ${JSON.stringify(r)}`)
  }

  // ── (b) Sperre-409 und Gegenprobe ────────────────────────────────────────────────────────────────────────────────
  {
    const vorher = akteLesen('F6')
    const r = await rufe(akteUrl(direkt, 'F6'), 'PUT', putKoerper(sha(vorher)))
    pruefe(r.status === 409 && r.koerper.workflowId === offenF6 && akteLesen('F6').equals(vorher), '(b) offener Ablauf mit feature_ref ⇒ 409 mit workflowId, Datei bytegleich.', `(b) ${JSON.stringify(r)}`)
    const g = await rufe(akteUrl(praefix, 'F7'), 'PUT', putKoerper(sha(akteLesen('F7'))))
    pruefe(g.status === 200, '(b) Gegenprobe: nur ein ABGESCHLOSSENER Ablauf ⇒ 200 (über den Projekt-Präfix).', `(b) Gegenprobe ${JSON.stringify(g)}`)
  }

  // ── (c) grund leer ───────────────────────────────────────────────────────────────────────────────────────────────
  {
    const vorher = akteLesen('F3')
    const r = await rufe(akteUrl(direkt, 'F3'), 'PUT', putKoerper(sha(vorher), { grund: '  ' }))
    pruefe(r.status === 400 && /grund/.test(r.koerper.grund) && akteLesen('F3').equals(vorher), '(c) grund leer ⇒ 400, Datei bytegleich.', `(c) ${JSON.stringify(r)}`)
  }

  // ── (d) bytegleich außerhalb, LF und CRLF ────────────────────────────────────────────────────────────────────────
  for (const [id, eol] of [
    ['F3', '\n'],
    ['F4', '\r\n'],
  ]) {
    const vorher = akteLesen(id).toString('utf8')
    const r = await rufe(akteUrl(direkt, id), 'PUT', putKoerper(sha(Buffer.from(vorher))))
    const nachher = akteLesen(id).toString('utf8')
    const ausserhalbGleich = ohneAbschnitte(nachher, BEARBEITET) === ohneAbschnitte(vorher, BEARBEITET)
    const zeilenende = eol === '\r\n' ? !/[^\r]\n/.test(nachher) : !nachher.includes('\r')
    const zeile = nachher.includes(`- 2026-10-01 · Ziel · alt${eol}- `) && /· Ziel, Akzeptanzkriterien · Gate/.test(nachher)
    const git = Array.isArray(r.koerper.git) && r.koerper.git[0] === '& {' && r.koerper.git.at(-1) === '}' && r.koerper.git.some((z) => z === `git add -- features/${id}/feature.md`)
    pruefe(
      r.status === 200 && ausserhalbGleich && zeilenende && zeile && git && r.koerper.hash === sha(akteLesen(id)) && JSON.stringify(r.koerper.geaendert) === '["Ziel","Akzeptanzkriterien"]',
      `(d) ${eol === '\n' ? 'LF' : 'CRLF'}: nur Ziel und AKs ersetzt, Rest bytegleich, Zeilenende erhalten, Änderungszeile, Hash, Git-Block.`,
      `(d) ${id}: ${JSON.stringify({ status: r.status, ausserhalbGleich, zeilenende, zeile, git, koerper: r.koerper })}`
    )
  }
  {
    const vorher = AKTE
    const verfaelscht = vorher.replace('Bleibt **exakt** so.', 'Bleibt **exakt** so!')
    pruefe(ohneAbschnitte(verfaelscht, BEARBEITET) !== ohneAbschnitte(vorher, BEARBEITET), '(d) Gegenprobe: ein geändertes Byte außerhalb wird erkannt.', '(d) Gegenprobe: Vergleich blind')
  }

  // ── (h) 422 mit Verstößen ────────────────────────────────────────────────────────────────────────────────────────
  {
    const vorher = akteLesen('F5')
    const r = await rufe(akteUrl(direkt, 'F5'), 'PUT', putKoerper(sha(vorher)))
    pruefe(r.status === 422 && Array.isArray(r.koerper.verstoesse) && r.koerper.verstoesse.includes('Status fehlt oder unbekannt') && akteLesen('F5').equals(vorher), '(h) Ergebnis bestünde check-feature nicht ⇒ 422 mit verstoesse, Datei bytegleich.', `(h) ${JSON.stringify(r)}`)
  }

  // ── (i) CSRF ─────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const vorher = akteLesen('F3')
    const proben = []
    for (const b of [direkt, praefix]) {
      for (const kopf of [{ origin: 'https://boese.example' }, { 'sec-fetch-site': 'cross-site' }]) {
        proben.push(await rufe(akteUrl(b, 'F3'), 'PUT', putKoerper(sha(vorher), { ziel: 'Böse.' }), kopf))
        proben.push(await rufe(`${b}/features`, 'POST', { scope: SCOPE }, kopf))
      }
    }
    pruefe(proben.length === 8 && proben.every((p) => p.status === 403) && akteLesen('F3').equals(vorher) && !existsSync(join(repoWurzel, 'features', 'F21')), '(i) fremde Herkunft ⇒ 403 für PUT …/akte und POST /api/features, direkt und über den Präfix, nichts geschrieben.', `(i) ${JSON.stringify(proben.map((p) => p.status))}`)
  }

  // ── (e)(f) Anlage, nächste freie ID, nie überschreiben ───────────────────────────────────────────────────────────
  {
    const erste = await rufe(`${praefix}/features`, 'POST', { scope: SCOPE })
    const pfad21 = join(repoWurzel, 'features', 'F21', 'feature.md')
    const inhalt21 = existsSync(pfad21) ? readFileSync(pfad21) : Buffer.alloc(0)
    pruefe(erste.status === 201 && erste.koerper.id === 'F21' && inhalt21.toString('utf8').includes('\nStatus: ENTWURF\n') && erste.koerper.hash === sha(inhalt21), '(e)(f) POST /api/features ⇒ 201, F21 (höchste ID F20 aus roadmap.json, nicht F8 aus den Ordnern), Status ENTWURF, Hash.', `(e) ${JSON.stringify(erste)}`)
    const zweite = await rufe(`${direkt}/features`, 'POST', { scope: SCOPE })
    pruefe(zweite.status === 201 && zweite.koerper.id === 'F22' && readFileSync(pfad21).equals(inhalt21), '(e) zweite Anlage ⇒ neue ID F22, F21 bytegleich.', `(e) zweite ${JSON.stringify(zweite)}`)
    const veraltet = await fuehreAkteRouteDurch({ art: 'anlegen', aktion: 'anlegen' }, { ok: true, daten: { scope: SCOPE } }, { repoWurzel, bestehendeIds: () => ({ features: ['F20'], meilensteine: [] }) })
    pruefe(veraltet.status === 409 && readFileSync(pfad21).equals(inhalt21), '(e) Anlage auf belegte ID ⇒ 409, nichts überschrieben.', `(e) veraltet ${JSON.stringify(veraltet)}`)
  }

  // ── (k) 405 ──────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const proben = [await rufe(`${direkt}/features`, 'GET'), await rufe(akteUrl(direkt, 'F3'), 'DELETE'), await rufe(`${direkt}/features`, 'PUT', { scope: SCOPE })]
    pruefe(proben.every((p) => p.status === 405), '(k) falsche Methode ⇒ 405 (GET /api/features, DELETE …/akte, PUT /api/features).', `(k) ${JSON.stringify(proben.map((p) => p.status))}`)
  }

  // ── (l) Server ───────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const server = readFileSync('scripts/leitstand-server.mjs', 'utf8')
    const aufrufe = server.split('erkenneAkteRoute(pfad)').length - 1
    pruefe(aufrufe === 1 && !server.includes('featureAkteTreffer'), '(l) erkenneAkteRoute(pfad) genau einmal im Server, kein eigener Regex-Dispatch für …/akte.', `(l) erkenneAkteRoute(pfad) ${aufrufe}×, featureAkteTreffer ${server.includes('featureAkteTreffer')}`)
  }
} catch (fehler) {
  befunde.push(`Gate-Ausführung gescheitert: ${fehler.stack ?? fehler}`)
} finally {
  for (const d of dienste) if (d.listening) await new Promise((r) => d.close(() => r()))
  raeumeVerzeichnis(basis)
}

if (befunde.length > 0) {
  console.error(`\n✗ ${befunde.length} Befund(e):`)
  for (const b of befunde) console.error(`  - ${b}`)
  process.exit(1)
}
console.log('\n✓ Keine Befunde.')
