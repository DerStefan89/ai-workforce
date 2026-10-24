#!/usr/bin/env node
/**
 * Datei: scripts/check-f45-b5b1b1-planung-schreiben.mjs
 *
 * Zweck: Gate für F45 B5b-1b-1 „Planung schreiben“ (features/F45/plan-b5b1b-v2.md, Advisor features/F45/advisor-b5b1b.md; R6,
 * F-984). Attrappen entstehen zur Laufzeit (Projekt und Kontrollzustand im tmp, nichts eingecheckt). Echter Handler über HTTP,
 * dazu der Multi-Projekt-Dispatcher für die Präfix-Proben; der Rückbau-Fall ruft das Routen-Modul direkt (die Schreibfunktion
 * ist nur dort ersetzbar, Advisor C8).
 * (a) 400: grund leer, meilenstein ohne roadmap_hash, unbekanntes Feld — Dateien bytegleich;
 * (b) Sperre: offener Ablauf mit feature_ref ⇒ 409 mit workflowId; Gegenprobe nur abgeschlossener Ablauf ⇒ 200 (Präfix);
 * (c) abweichender Akte-Hash ⇒ 409 mit aktuellem hash;
 * (d) abweichender roadmap_hash ⇒ 409 mit aktuellem roadmap_hash, Akte und Roadmap bytegleich;
 * (e) 422: Akte-Gate (Formfehler in „## Workstreams“) und R1 neu (Verschieben aus einem ABGESCHLOSSEN-Meilenstein, dessen
 *     Ausnahme verwaiste; Verschieben eines offenen Features in einen ABGESCHLOSSEN-Meilenstein); Akte-Gate über die Route mit
 *     einem schon vorhandenen Befund (nur prioritaet); Einplanen in einen ABGESCHLOSSEN-Meilenstein nennt den echten Status — nichts
 *     geschrieben;
 * (f) Erfolg LF und CRLF: Priorität neu, Schätzung in der Zelle, Änderungszeile; Datei = erwarteter Text (Rest bytegleich),
 *     Zeilenende erhalten, hash = Datei, Git-Block nur mit der Akte, roadmap.json unberührt;
 * (g) Meilenstein-Wechsel mit roadmap_hash aus GET /api/roadmap: ID am Ende des Ziels, roadmap.json = erwarteter Text (nur zwei
 *     Literale), roadmap_hash = Datei, Git-Block mit beiden Pfaden, Änderungszeile „Meilenstein M2 → M3“; Grün-Fall: ein alter
 *     R1-Befund (F19 ohne Ausnahme in M1) blockiert nicht; Einplanen einer ENTWURF-Akte ohne Meilenstein;
 * (h) CRLF in roadmap.json ⇒ 422, nichts geschrieben;
 * (i) Rückbau: roadmap.json scheitert nach Teilschreiben ⇒ 500, Akte UND roadmap.json bytegleich zurück, Antwort nennt beide und
 *     „git diff“; scheitert schon die Akte (Teilschreiben), wird sie zurückgesetzt und roadmap.json nie angefasst; Rücklesen weicht
 *     ohne Wurf ab ⇒ beide zurückgesetzt;
 * (j) Kennzahl: ABGEBROCHEN zählt nicht zur Gesamtmenge „Features abgenommen“, Gegenprobe mit ENTWURF zählt;
 * (k) CSRF: fremde Herkunft (Origin bzw. Sec-Fetch-Site) ⇒ 403 direkt und über /api/projekte/<id>/…; fremder Host ⇒ 403;
 *     nichts geschrieben;
 * (l) falsche Methode ⇒ 405 (GET, POST, DELETE …/planung);
 * (n) Meilenstein = aktueller plus Priorität ⇒ 200 nur mit der Akte; nur gleicher bzw. unbekannter Meilenstein, ABGESCHLOSSEN-Akte ⇒
 *     422; unbekanntes Feature, falsche Groß-/Kleinschreibung ⇒ 404; %ZZ ⇒ 400; ungültige Ausnahmen-Datei ⇒ 422;
 * (m) Server: erkennePlanungRoute(pfad) genau einmal; routen-planung.mjs wertet die Methode nicht aus.
 * Randfälle der reinen Funktionen belegen src/feature-auftrag/planung-schreiben.test.ts und src/workboard/roadmap-schreiben.test.ts.
 *
 * Wird aufgerufen von: `npm run check:gates` (und damit `npm run check`).
 *
 * Aufruf: node scripts/check-f45-b5b1b1-planung-schreiben.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { connect } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { registriereAuftrag } from '../src/auftrag/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { registriereWorkflow } from '../src/workflow/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'
import { fuehrePlanungRouteDurch } from './leitstand/routen-planung.mjs'
import { baueRoadmapProjektion } from './leitstand/routen-roadmap.mjs'
import { erzeugeMultiProjektDispatcher, erzeugeRequestHandler } from './leitstand-server.mjs'

const befunde = []
console.log('\n=== F45-B5b-1b-1-Planung-schreiben-Check ===\n')
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
const DATUM = '2026-10-24' // nur der direkte Modulaufruf (i); über HTTP schreibt der Server sein lokales Datum

/** Akte mit strengem Abschnitt. @param id - Feature-ID @param status - Status @returns Text (LF) */
const akte = (id, status) =>
  [
    `# ${id} — Gate`,
    '',
    '## Status',
    `Status: ${status}`,
    '',
    '## Ziel',
    'Ziel.',
    '',
    '## Workstreams',
    '',
    '| ID | Art | Titel | Status | Schätzung AT | Ist AT | Begonnen | Abgenommen | Notiz |',
    '|---|---|---|---|---|---|---|---|---|',
    '| A | workstream | Eins | geplant | 0,3–0,4 | – | – | – | n |',
    '| B | fixpaket | Zwei | geplant | – | – | – | – | |',
    '',
    '## Änderungen',
    '- 2026-10-01 · Ziel · alt',
    '',
  ].join('\n')

const ROADMAP = `{
  "roadmap_schema": "v0",
  "vision": "Gate.",
  "meilensteine": [
    {
      "id": "M1",
      "titel": "Eins",
      "status": "ABGESCHLOSSEN",
      "features": ["F1", "F18", "F19"]
    },
    {
      "id": "M2",
      "titel": "Zwei",
      "status": "LAEUFT",
      "features": ["F3", "F4", "F6", "F7", "F8", "F10"]
    },
    {
      "id": "M3",
      "titel": "Drei",
      "status": "GEPLANT",
      "features": ["F9"]
    }
  ]
}
`
const AUSNAHMEN = `{
  "schema": "v0",
  "status_ausnahmen": [
    { "meilenstein": "M1", "feature": "F18", "grund": "Gate" }
  ]
}
`

const basis = mkdtempSync(join(tmpdir(), 'f45-b5b1b1-'))
const repoWurzel = join(basis, 'projekt')
const basisVerzeichnis = join(basis, 'kontrollzustand')
const akten = {
  F1: akte('F1', 'ABGESCHLOSSEN').replace('Status: ABGESCHLOSSEN\n', 'Status: ABGESCHLOSSEN\nAbgenommen: 2026-10-01\n'),
  F3: akte('F3', 'IN_ARBEIT'),
  F4: akte('F4', 'IN_ARBEIT').replace(/\n/g, '\r\n'),
  F6: akte('F6', 'IN_ARBEIT'),
  F7: akte('F7', 'IN_ARBEIT'),
  F8: akte('F8', 'IN_ARBEIT').replace('| A | workstream | Eins | geplant |', '| A | workstream | Eins | unsinn |'),
  F9: akte('F9', 'ABGEBROCHEN'),
  F10: akte('F10', 'IN_ARBEIT'),
  F11: akte('F11', 'ENTWURF'),
  F12: akte('F12', 'ENTWURF'),
  F20B: akte('F20B', 'IN_ARBEIT'),
  F18: akte('F18', 'FEATURE_GATE'),
  F19: akte('F19', 'FEATURE_GATE'),
}
for (const [id, inhalt] of Object.entries(akten)) {
  mkdirSync(join(repoWurzel, 'features', id), { recursive: true })
  writeFileSync(join(repoWurzel, 'features', id, 'feature.md'), inhalt)
}
mkdirSync(join(repoWurzel, 'docs', 'projekt'), { recursive: true })
const roadmapPfad = join(repoWurzel, 'docs', 'projekt', 'roadmap.json')
writeFileSync(roadmapPfad, ROADMAP)
writeFileSync(join(repoWurzel, 'docs', 'projekt', 'roadmap-ausnahmen.json'), AUSNAHMEN)
const akteLesen = (id) => readFileSync(join(repoWurzel, 'features', id, 'feature.md'))
const roadmapLesen = () => readFileSync(roadmapPfad)

/**
 * Schickt eine rohe HTTP-Anfrage mit frei gewähltem Host-Header (Muster check-f814-host.mjs) und liest nur den Status.
 * @param port - Zielport
 * @param pfad - Anfragepfad
 * @param host - Host-Headerwert
 * @param body - JSON-Text
 * @returns Promise<number> Status
 */
function putMitHost(port, pfad, host, body) {
  return new Promise((resolve, reject) => {
    const kopf = [`PUT ${pfad} HTTP/1.1`, `Host: ${host}`, 'Connection: close', 'Content-Type: application/json', `Content-Length: ${Buffer.byteLength(body)}`]
    const socket = connect(port, '127.0.0.1', () => socket.end(`${kopf.join('\r\n')}\r\n\r\n${body}`))
    const teile = []
    socket.on('data', (d) => teile.push(d))
    socket.on('error', reject)
    socket.on('close', () => resolve(Number(/^HTTP\/1\.[01] (\d{3})/.exec(Buffer.concat(teile).toString('latin1'))?.[1] ?? 0)))
  })
}

try {
  // ── Abläufe: F6 offen (sperrt), F7 nur abgeschlossen (sperrt nicht) ────────────────────────────────────────────────
  const profilReferenz = leiteProfilReferenzAb(ladeStartvorlage('startvorlagen/beispielprojekt.json'))
  const ladeOptionen = { basisVerzeichnis, schreiber: () => {} }
  const SCHRITT = { schritt_id: 'schritt-1-ausfuehrung', rolle: 'ausfuehrung', werkzeugsatz: 'schreibend', worker: 'claude-code', modell: 'claude-sonnet-5', eingaben: [], output_schema: null, freigabe: 'ZWINGEND', freigabe_erteilt: false, risiko: 'Gate-Fixture.', zeitgrenze_ms: 600000, nachfolger: null, status: 'OFFEN', lauf_id: null }
  const ablauf = (featureRef, status) => {
    const auftragId = randomUUID()
    registriereAuftrag(auftragId, profilReferenz, `Gate ${featureRef}`, 'Gate-Auftrag.', { ...ladeOptionen, feature_ref: featureRef })
    const workflowId = `f45-b5b1b1-${featureRef}-${randomUUID()}`
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
  const direktPort = dienst.address().port
  const direkt = `http://127.0.0.1:${direktPort}/api`
  const dispatcher = createServer(erzeugeMultiProjektDispatcher(new Map([['p1', handler]]), handler))
  await new Promise((r) => dispatcher.listen(0, '127.0.0.1', r))
  dienste.push(dispatcher)
  const praefixPort = dispatcher.address().port
  const praefix = `http://127.0.0.1:${praefixPort}/api/projekte/p1`

  /** HTTP-Aufruf. @returns { status, koerper } */
  const rufe = async (url, art, koerper, kopf = {}) => {
    const antwort = await fetch(url, { method: art, headers: { 'content-type': 'application/json', ...kopf }, body: koerper === undefined ? undefined : JSON.stringify(koerper) })
    return { status: antwort.status, koerper: await antwort.json().catch(() => ({})) }
  }
  const url = (b, id) => `${b}/features/${id}/planung`
  /** Stand von Akte und Roadmap zum Vergleich. @param id - Feature-ID @returns { akte, roadmap } */
  const stand = (id) => ({ akte: akteLesen(id), roadmap: roadmapLesen() })
  const unveraendert = (vorher, id) => akteLesen(id).equals(vorher.akte) && roadmapLesen().equals(vorher.roadmap)

  // ── (a) 400 ──────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const vorher = stand('F3')
    const h = sha(vorher.akte)
    const proben = [
      await rufe(url(direkt, 'F3'), 'PUT', { prioritaet: 'P1', grund: '  ', hash: h }),
      await rufe(url(direkt, 'F3'), 'PUT', { meilenstein: 'M3', grund: 'g', hash: h }),
      await rufe(url(direkt, 'F3'), 'PUT', { prioritaet: 'P1', grund: 'g', hash: h, titel: 'x' }),
    ]
    pruefe(proben.every((p) => p.status === 400) && /grund/.test(proben[0].koerper.grund) && /roadmap_hash/.test(proben[1].koerper.grund) && /unbekannte Felder/.test(proben[2].koerper.grund) && unveraendert(vorher, 'F3'), '(a) 400 bei leerem grund, meilenstein ohne roadmap_hash und unbekanntem Feld, nichts geschrieben.', `(a) ${JSON.stringify(proben)}`)
  }

  // ── (b) Sperre-409 und Gegenprobe ────────────────────────────────────────────────────────────────────────────────
  {
    const vorher = stand('F6')
    const r = await rufe(url(direkt, 'F6'), 'PUT', { prioritaet: 'P1', grund: 'g', hash: sha(vorher.akte) })
    pruefe(r.status === 409 && r.koerper.workflowId === offenF6 && unveraendert(vorher, 'F6'), '(b) offener Ablauf mit feature_ref ⇒ 409 mit workflowId, nichts geschrieben.', `(b) ${JSON.stringify(r)}`)
    const g = await rufe(url(praefix, 'F7'), 'PUT', { prioritaet: 'P2', grund: 'g', hash: sha(akteLesen('F7')) })
    pruefe(g.status === 200 && akteLesen('F7').toString('utf8').includes('\nPriorität: P2\n'), '(b) Gegenprobe: nur ein abgeschlossener Ablauf ⇒ 200 (über den Projekt-Präfix).', `(b) Gegenprobe ${JSON.stringify(g)}`)
  }

  // ── (c) Akte-Hash-409 ────────────────────────────────────────────────────────────────────────────────────────────
  {
    const vorher = stand('F3')
    const r = await rufe(url(direkt, 'F3'), 'PUT', { prioritaet: 'P1', grund: 'g', hash: 'b'.repeat(64) })
    pruefe(r.status === 409 && r.koerper.hash === sha(vorher.akte) && unveraendert(vorher, 'F3'), '(c) abweichender Akte-Hash ⇒ 409 mit aktuellem hash, nichts geschrieben.', `(c) ${JSON.stringify(r)}`)
  }

  // ── (d) Roadmap-Hash-409 ─────────────────────────────────────────────────────────────────────────────────────────
  {
    const vorher = stand('F10')
    const r = await rufe(url(direkt, 'F10'), 'PUT', { meilenstein: 'M3', grund: 'g', hash: sha(vorher.akte), roadmap_hash: 'c'.repeat(64) })
    pruefe(r.status === 409 && r.koerper.roadmap_hash === sha(vorher.roadmap) && unveraendert(vorher, 'F10'), '(d) abweichender roadmap_hash ⇒ 409 mit aktuellem roadmap_hash, Akte und Roadmap bytegleich.', `(d) ${JSON.stringify(r)}`)
  }

  // ── (e) 422: Akte-Gate und R1 neu ────────────────────────────────────────────────────────────────────────────────
  {
    const vorher8 = stand('F8')
    const r1 = await rufe(url(direkt, 'F8'), 'PUT', { workstreams: [{ id: 'B', schaetzung_min: 1, schaetzung_max: 1 }], grund: 'g', hash: sha(vorher8.akte) })
    const vorher18 = stand('F18')
    const r2 = await rufe(url(direkt, 'F18'), 'PUT', { meilenstein: 'M2', grund: 'g', hash: sha(vorher18.akte), roadmap_hash: sha(vorher18.roadmap) })
    const vorher10 = stand('F10')
    const r3 = await rufe(url(direkt, 'F10'), 'PUT', { meilenstein: 'M1', grund: 'g', hash: sha(vorher10.akte), roadmap_hash: sha(vorher10.roadmap) })
    pruefe(
      r1.status === 422 && Array.isArray(r1.koerper.verstoesse) && unveraendert(vorher8, 'F8') &&
        r2.status === 422 && /erst bereinigen/.test(r2.koerper.grund) && r2.koerper.verstoesse?.some((v) => v.includes('M1/F18') && v.includes('veraltet')) && unveraendert(vorher18, 'F18') &&
        r3.status === 422 && r3.koerper.verstoesse?.some((v) => v.includes('F10')) && !r3.koerper.verstoesse?.some((v) => v.includes('F19')) && unveraendert(vorher10, 'F10'),
      '(e) 422: Formfehler in „## Workstreams“; verwaiste Ausnahme beim Verschieben aus M1; offenes Feature in einen ABGESCHLOSSEN-Meilenstein (nur der neue Befund gemeldet) — nichts geschrieben.',
      `(e) ${JSON.stringify([r1, r2, r3])}`
    )
    // Akte-Gate über die Route (cr 2, qa 3): nur prioritaet auf der Akte mit Formfehler ⇒ Gate-Zweig, nicht die Vorprüfung.
    const r4 = await rufe(url(direkt, 'F8'), 'PUT', { prioritaet: 'P1', grund: 'g', hash: sha(vorher8.akte) })
    // Einplanen in einen ABGESCHLOSSEN-Meilenstein (cr 1, qa 2): der Befund nennt den echten Status der neuen ID.
    const vorher12 = stand('F12')
    const r5 = await rufe(url(direkt, 'F12'), 'PUT', { meilenstein: 'M1', grund: 'g', hash: sha(vorher12.akte), roadmap_hash: sha(vorher12.roadmap) })
    pruefe(
      r4.status === 422 && /schon vor der Bearbeitung/.test(r4.koerper.grund) && unveraendert(vorher8, 'F8') && r5.status === 422 && r5.koerper.verstoesse?.some((v) => v.includes('F12') && v.includes('ENTWURF')) && unveraendert(vorher12, 'F12'),
      '(e) Akte-Gate blockiert über die Route auch einen schon vorhandenen Befund (nur prioritaet); Einplanen in M1 meldet den echten Status (ENTWURF) — nichts geschrieben.',
      `(e) Gate/Einplanen ${JSON.stringify([r4, r5])}`
    )
  }

  // ── (f) Erfolg LF und CRLF ───────────────────────────────────────────────────────────────────────────────────────
  for (const [id, eol] of [
    ['F3', '\n'],
    ['F4', '\r\n'],
  ]) {
    const vorher = stand(id)
    const text = vorher.akte.toString('utf8')
    const r = await rufe(url(direkt, id), 'PUT', { prioritaet: 'P1', workstreams: [{ id: 'B', schaetzung_min: 0.5, schaetzung_max: 0.75 }], grund: 'Gate', hash: sha(vorher.akte) })
    const nachher = akteLesen(id).toString('utf8')
    // Datum der Änderungszeile = lokales Datum des Servers; der Erwartungstext übernimmt es aus der Datei.
    const datum = /- (\d{4}-\d{2}-\d{2}) · Priorität P1, Schätzung B · Gate/.exec(nachher)?.[1]
    const zeile = datum !== undefined
    const erwartet = text
      .replace(`Status: IN_ARBEIT${eol}`, `Status: IN_ARBEIT${eol}Priorität: P1${eol}`)
      .replace('| B | fixpaket | Zwei | geplant | – |', '| B | fixpaket | Zwei | geplant | 0,5–0,75 |')
      .replace(`- 2026-10-01 · Ziel · alt${eol}`, `- 2026-10-01 · Ziel · alt${eol}- ${datum} · Priorität P1, Schätzung B · Gate${eol}`)
    const rest = nachher === erwartet
    const zeilenende = eol === '\r\n' ? !/[^\r]\n/.test(nachher) : !nachher.includes('\r')
    const git = Array.isArray(r.koerper.git) && r.koerper.git[0] === '& {' && r.koerper.git.some((z) => z === `git add -- features/${id}/feature.md`)
    pruefe(
      r.status === 200 && zeile && rest && zeilenende && git && r.koerper.hash === sha(akteLesen(id)) && r.koerper.roadmap_hash === undefined && roadmapLesen().equals(vorher.roadmap) && JSON.stringify(r.koerper.geaendert) === '["Priorität","Schätzung"]',
      `(f) ${eol === '\n' ? 'LF' : 'CRLF'}: Priorität neu, Schätzung nur in der Zelle, Änderungszeile, Rest bytegleich, Zeilenende erhalten, hash = Datei (zurückgelesen), Git-Block nur mit der Akte, Roadmap unberührt.`,
      `(f) ${id}: ${JSON.stringify({ status: r.status, zeile, rest, zeilenende, git, koerper: r.koerper })}`
    )
  }

  // ── (g) Meilenstein-Wechsel, Grün-Fall Altbefund, Einplanen ──────────────────────────────────────────────────────
  {
    const projektion = await rufe(`${direkt}/roadmap`, 'GET')
    const vorher = stand('F10')
    const r = await rufe(url(praefix, 'F10'), 'PUT', { meilenstein: 'M3', grund: 'Gate', hash: sha(vorher.akte), roadmap_hash: projektion.koerper.roadmap_hash })
    const erwartet = ROADMAP.replace('"features": ["F3", "F4", "F6", "F7", "F8", "F10"]', '"features": ["F3", "F4", "F6", "F7", "F8"]').replace('"features": ["F9"]', '"features": ["F9", "F10"]')
    const git = Array.isArray(r.koerper.git) && r.koerper.git.some((z) => z === 'git add -- features/F10/feature.md docs/projekt/roadmap.json')
    pruefe(
      projektion.koerper.roadmap_hash === sha(vorher.roadmap) && r.status === 200 && roadmapLesen().toString('utf8') === erwartet && r.koerper.roadmap_hash === sha(roadmapLesen()) && r.koerper.hash === sha(akteLesen('F10')) && git && akteLesen('F10').toString('utf8').includes(' · Meilenstein M2 → M3 · Gate\n'),
      '(g) Meilenstein-Wechsel: F10 am Ende von M3, roadmap.json nur in den zwei Literalen geändert, roadmap_hash = Datei, Git-Block mit beiden Pfaden, Änderungszeile — trotz altem R1-Befund (F19 ohne Ausnahme in M1).',
      `(g) ${JSON.stringify({ r, roadmap: roadmapLesen().toString('utf8') })}`
    )
    const vorher11 = stand('F11')
    const e = await rufe(url(direkt, 'F11'), 'PUT', { meilenstein: 'M2', grund: 'Einplanen', hash: sha(vorher11.akte), roadmap_hash: sha(vorher11.roadmap) })
    pruefe(e.status === 200 && JSON.parse(roadmapLesen().toString('utf8')).meilensteine[1].features.at(-1) === 'F11' && akteLesen('F11').toString('utf8').includes(' · Meilenstein – → M2 · Einplanen\n'), '(g) Einplanen: ENTWURF-Akte ohne Meilenstein landet am Ende von M2.', `(g) Einplanen ${JSON.stringify(e)}`)
  }

  // ── (h) CRLF in roadmap.json ⇒ 422 ───────────────────────────────────────────────────────────────────────────────
  {
    const lf = roadmapLesen()
    writeFileSync(roadmapPfad, lf.toString('utf8').replace(/\n/g, '\r\n'))
    const vorher = stand('F10')
    const r = await rufe(url(direkt, 'F10'), 'PUT', { meilenstein: 'M2', grund: 'g', hash: sha(vorher.akte), roadmap_hash: sha(vorher.roadmap) })
    pruefe(r.status === 422 && /CRLF/.test(r.koerper.grund) && unveraendert(vorher, 'F10'), '(h) CRLF in roadmap.json ⇒ 422 „von Hand“, nichts geschrieben.', `(h) ${JSON.stringify(r)}`)
    writeFileSync(roadmapPfad, lf)
  }

  // ── (i) Rückbau inkl. der scheiternden Datei ─────────────────────────────────────────────────────────────────────
  {
    const kontext = (scheitertBei) => ({
      repoWurzel,
      roadmapPfad: 'docs/projekt/roadmap.json',
      workflows: async () => [],
      auftraege: async () => [],
      datum: DATUM,
      schreibe: (pfad, bytes) => {
        if (pfad.endsWith(scheitertBei)) {
          writeFileSync(pfad, 'kaputt') // Teilschreiben, dann Fehler
          throw new Error('Gate: Schreiben scheitert')
        }
        writeFileSync(pfad, bytes)
      },
    })
    const vorher = stand('F10')
    const koerper = { ok: true, daten: { meilenstein: 'M2', grund: 'g', hash: sha(vorher.akte), roadmap_hash: sha(vorher.roadmap) } }
    const r = await fuehrePlanungRouteDurch({ art: 'planung', rohId: 'F10' }, koerper, kontext('roadmap.json'))
    const beide = JSON.stringify(r.koerper.rueckbau) === JSON.stringify([{ pfad: 'features/F10/feature.md', zurueckgesetzt: true }, { pfad: 'docs/projekt/roadmap.json', zurueckgesetzt: true }])
    pruefe(r.status === 500 && beide && /git diff/.test(r.koerper.grund) && unveraendert(vorher, 'F10'), '(i) roadmap.json scheitert nach Teilschreiben ⇒ 500, Akte und roadmap.json bytegleich zurück, Antwort nennt beide und „git diff“.', `(i) ${JSON.stringify(r)}`)
    const r2 = await fuehrePlanungRouteDurch({ art: 'planung', rohId: 'F10' }, koerper, kontext('feature.md'))
    const nurAkte = JSON.stringify(r2.koerper.rueckbau) === JSON.stringify([{ pfad: 'features/F10/feature.md', zurueckgesetzt: true }])
    pruefe(r2.status === 500 && nurAkte && unveraendert(vorher, 'F10'), '(i) scheitert schon die Akte (Teilschreiben), wird sie selbst zurückgesetzt, roadmap.json nie angefasst.', `(i) Akte ${JSON.stringify(r2)}`)
    // Rücklesen weicht ab, ohne Wurf (cr 6, qa 1).
    const abweichend = { ...kontext('-'), schreibe: (pfad, bytes) => writeFileSync(pfad, pfad.endsWith('roadmap.json') ? Buffer.concat([bytes, Buffer.from('x')]) : bytes) }
    const r3 = await fuehrePlanungRouteDurch({ art: 'planung', rohId: 'F10' }, koerper, abweichend)
    pruefe(r3.status === 500 && /nicht wie erwartet/.test(r3.koerper.grund) && r3.koerper.rueckbau?.length === 2 && r3.koerper.rueckbau.every((e) => e.zurueckgesetzt) && unveraendert(vorher, 'F10'), '(i) Rücklesen weicht ohne Wurf ab ⇒ 500 „nicht wie erwartet“, beide Dateien zurückgesetzt.', `(i) Rücklesen ${JSON.stringify(r3)}`)
  }

  // ── (j) Kennzahl ohne ABGEBROCHEN ────────────────────────────────────────────────────────────────────────────────
  {
    const zaehle = () => baueRoadmapProjektion({ repoWurzel, roadmapPfad: 'docs/projekt/roadmap.json' }).kennzahlen.features_abgenommen
    const roadmapFeatures = JSON.parse(roadmapLesen().toString('utf8')).meilensteine.flatMap((m) => m.features).length
    const mit = zaehle()
    const f9 = akteLesen('F9')
    writeFileSync(join(repoWurzel, 'features', 'F9', 'feature.md'), f9.toString('utf8').replace('Status: ABGEBROCHEN', 'Status: ENTWURF'))
    const gegen = zaehle()
    writeFileSync(join(repoWurzel, 'features', 'F9', 'feature.md'), f9)
    pruefe(mit.gesamt === roadmapFeatures - 1 && gegen.gesamt === roadmapFeatures && mit.abgenommen === 1, `(j) „Features abgenommen“ ${mit.abgenommen}/${mit.gesamt}: F9 (ABGEBROCHEN) nicht in der Gesamtmenge; Gegenprobe als ENTWURF ⇒ ${gegen.gesamt}.`, `(j) ${JSON.stringify({ mit, gegen, roadmapFeatures })}`)
  }

  // ── (k) CSRF und Host ────────────────────────────────────────────────────────────────────────────────────────────
  {
    const vorher = stand('F3')
    const koerper = { prioritaet: 'P0', grund: 'Böse', hash: sha(vorher.akte) }
    const proben = []
    for (const b of [direkt, praefix]) {
      for (const kopf of [{ origin: 'https://boese.example' }, { 'sec-fetch-site': 'cross-site' }]) proben.push((await rufe(url(b, 'F3'), 'PUT', koerper, kopf)).status)
    }
    proben.push(await putMitHost(direktPort, '/api/features/F3/planung', `evil.example:${direktPort}`, JSON.stringify(koerper)))
    proben.push(await putMitHost(praefixPort, '/api/projekte/p1/features/F3/planung', `evil.example:${praefixPort}`, JSON.stringify(koerper)))
    pruefe(proben.length === 6 && proben.every((s) => s === 403) && unveraendert(vorher, 'F3'), '(k) fremde Herkunft (Origin, Sec-Fetch-Site) und fremder Host ⇒ 403, direkt und über den Präfix, nichts geschrieben.', `(k) ${JSON.stringify(proben)}`)
  }

  // ── (l) 405 ──────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const proben = [await rufe(url(direkt, 'F3'), 'GET'), await rufe(url(direkt, 'F3'), 'POST', {}), await rufe(url(praefix, 'F3'), 'DELETE')]
    pruefe(proben.every((p) => p.status === 405), '(l) falsche Methode ⇒ 405 (GET, POST, DELETE …/planung).', `(l) ${JSON.stringify(proben.map((p) => p.status))}`)
  }

  // ── (n) weitere Routenfälle (qa 4, qa 6, cr 3) ─────────────────────────────────────────────────────────────────
  {
    const vorher = stand('F3')
    const gleich = await rufe(url(direkt, 'F3'), 'PUT', { meilenstein: 'M2', prioritaet: 'P3', grund: 'g', hash: sha(vorher.akte), roadmap_hash: sha(vorher.roadmap) })
    const gleichOk = gleich.status === 200 && gleich.koerper.roadmap_hash === sha(vorher.roadmap) && JSON.stringify(gleich.koerper.geschrieben) === '["features/F3/feature.md"]' && JSON.stringify(gleich.koerper.geaendert) === '["Priorität"]' && roadmapLesen().equals(vorher.roadmap)
    const nach = stand('F3')
    const proben = [
      await rufe(url(direkt, 'F3'), 'PUT', { meilenstein: 'M2', grund: 'g', hash: sha(nach.akte), roadmap_hash: sha(nach.roadmap) }),
      await rufe(url(direkt, 'F3'), 'PUT', { meilenstein: 'M9', grund: 'g', hash: sha(nach.akte), roadmap_hash: sha(nach.roadmap) }),
      await rufe(url(direkt, 'F1'), 'PUT', { prioritaet: 'P1', grund: 'g', hash: sha(akteLesen('F1')) }),
      await rufe(url(direkt, 'F77'), 'PUT', { prioritaet: 'P1', grund: 'g', hash: 'a'.repeat(64) }),
      await rufe(url(direkt, 'F20b'), 'PUT', { prioritaet: 'P1', grund: 'g', hash: sha(akteLesen('F20B')) }),
      await rufe(`${direkt}/features/%ZZ/planung`, 'PUT', { prioritaet: 'P1', grund: 'g', hash: 'a'.repeat(64) }),
    ]
    const erwartet = [422, 422, 422, 404, 404, 400]
    const ausnahmenPfad = join(repoWurzel, 'docs', 'projekt', 'roadmap-ausnahmen.json')
    writeFileSync(ausnahmenPfad, '{ "schema": "v0", "status_ausnahmen": [{ "meilenstein": "M1" }] }\n')
    const vorher10 = stand('F10')
    const ungueltig = await rufe(url(direkt, 'F10'), 'PUT', { meilenstein: 'M2', grund: 'g', hash: sha(vorher10.akte), roadmap_hash: sha(vorher10.roadmap) })
    writeFileSync(ausnahmenPfad, AUSNAHMEN)
    pruefe(
      gleichOk && proben.every((p, i) => p.status === erwartet[i]) && akteLesen('F20B').toString('utf8') === akten.F20B && unveraendert(nach, 'F3') && ungueltig.status === 422 && /roadmap-ausnahmen\.json ist ungültig/.test(ungueltig.koerper.grund) && unveraendert(vorher10, 'F10'),
      '(n) Meilenstein = aktueller plus Priorität ⇒ 200 nur mit der Akte (Roadmap bytegleich, roadmap_hash aktuell); nur gleicher Meilenstein, unbekannter Meilenstein, ABGESCHLOSSEN-Akte ⇒ 422; unbekanntes Feature und falsche Groß-/Kleinschreibung (F20b für F20B) ⇒ 404; %ZZ ⇒ 400; ungültige Ausnahmen-Datei ⇒ 422 — nichts geschrieben.',
      `(n) ${JSON.stringify({ gleich, proben: proben.map((p) => [p.status, p.koerper.grund]), ungueltig })}`
    )
  }

  // ── (m) Server ───────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const server = readFileSync('scripts/leitstand-server.mjs', 'utf8')
    const modul = readFileSync('scripts/leitstand/routen-planung.mjs', 'utf8')
    const aufrufe = server.split('erkennePlanungRoute(pfad)').length - 1
    pruefe(aufrufe === 1 && !modul.includes('.method'), '(m) erkennePlanungRoute(pfad) genau einmal im Server, routen-planung.mjs wertet die Methode nicht aus.', `(m) erkennePlanungRoute(pfad) ${aufrufe}×, .method im Modul ${modul.includes('.method')}`)
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
