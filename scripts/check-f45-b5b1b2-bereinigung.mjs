#!/usr/bin/env node
/**
 * Datei: scripts/check-f45-b5b1b2-bereinigung.mjs
 *
 * Zweck: Gate für F45 B5b-1b-2 „Bereinigungsliste“ (features/F45/plan-b5b1b2-v2.md, Advisor features/F45/advisor-b5b1b2.md; F-1010,
 * R1, Entscheidungen B4/B6/O5/A1 = b/A2 = dynamisch in features/F45/feature.md). Die Attrappe entsteht zur Laufzeit im tmp und
 * bildet den heutigen Stand nach (M3/F18 und M4/F20, F21, F22, F25 mit Ausnahme, STATUS.md mit je einer Standardform, F21
 * umbrochen, AF-F001 als ENTWURF ohne Meilenstein). Echter Handler über HTTP, dazu der Multi-Projekt-Dispatcher; der Rückbau-Fall
 * ruft das Routen-Modul direkt (die Schreibfunktion ist nur dort ersetzbar, Advisor C6).
 * (v) vorher: check-akte-meilenstein und check-status-akten laufen in der Attrappe grün (sonst bewiese „danach grün“ nichts);
 * (a) GET listet genau die fünf Abweichungen, „Meilenstein → LAEUFT“ nur bei M3/F18, „Feature → ABGESCHLOSSEN“ bei allen fünf, vier
 *     Hash-Schlüssel = Dateien, Quelle mit STATUS.md-Zeile, seit B5b-2b-2 jeder Vorschlag vorprüfend möglich (moeglich/grund; das
 *     Verhalten je Sperrgrund belegt scripts/leitstand/routen-planung-vorpruefung.test.mjs); echtes Repo (nur lesend): Einträge =
 *     Paare der Ausnahmen-Datei, LAEUFT genau bei Meilensteinen mit einer Abweichung, nur die Form von moeglich/grund (kein
 *     Zeitzünder nach Stefans Bestätigungen);
 * (b) 400: grund leer, unbekannte Entscheidung, zweiter Eintrag (Liste bzw. Feld `eintraege`), Hash-Schlüssel fehlt;
 * (c) 409 Sperre (offener Ablauf an F21);
 * (d) 409 je Datei-Hash (roadmap, ausnahmen, akte, status_md einzeln) mit `abweichend`;
 * (e) 422 STATUS.md: zwei Standardformen für F20, keine für F22 (Konvention vorhanden), CRLF (A1 = b);
 * (f) 422 CRLF in roadmap-ausnahmen.json bzw. roadmap.json (bei LAEUFT);
 * (g) 422: „M4 → LAEUFT“ bei mehreren Abweichungen (B4), Eintrag ohne Abweichung;
 * (h) Erfolg „F20 → ABGESCHLOSSEN“ (CRLF-Akte): Akte = erwarteter Text, STATUS.md nur ein Wort anders, Ausnahme-Zeile weg, Rest
 *     bytegleich, Hashes = Dateien, Git-Block mit drei Pfaden; danach beide Gate-Skripte grün; zweites identisches Senden
 *     (Doppelklick) und Hashes von vor der Bestätigung ⇒ 409, nichts geschrieben (qa 5);
 * (i) Erfolg „M3 → LAEUFT“: roadmap.json nur im Status-Wert, Ausnahme weg, Akte F18 und STATUS.md bytegleich (keine
 *     Änderungszeile), Grund in der Commit-Nachricht; danach beide Gate-Skripte grün;
 * (j) Rückbau: STATUS.md scheitert nach Teilschreiben ⇒ Akte und STATUS.md zurück, Ausnahmen-Datei nie angefasst; Ausnahmen-Datei
 *     scheitert ⇒ alle drei zurück;
 * (r) R1-Semantik (Advisor B3): verwaiste Ausnahme im Meilenstein ⇒ LAEUFT 422 (rot); ein Altbefund in einem anderen Meilenstein
 *     blockiert keine Bestätigung (grün); Abweichung ohne Ausnahme ist bestätigbar (ohne Ausnahmen-Datei im Git-Block);
 * (d2) A2 = dynamisch: nach drei Bestätigungen in M4 bietet GET „M4 → LAEUFT“ für F21; die Sperre gilt auch dafür (409);
 * (n) Fremdprojekt ohne STATUS.md und Ausnahmen-Datei (Hashes null, 200 mit hinweis, nur die Akte geschrieben), ABGEBROCHEN ohne
 *     Vorschlag ⇒ 422, ungültige Ausnahmen-Datei ⇒ GET „ungueltig“/POST 422, ohne Roadmap ⇒ GET „nicht_vorhanden“/POST 422
 *     (Modulaufruf; cr 5, qa 5);
 * (k) CSRF für POST (Origin bzw. Sec-Fetch-Site fremd ⇒ 403, direkt und über den Präfix), fremder Host ⇒ 403 für GET und POST;
 * (l) falsche Methode ⇒ 405 (POST/PUT …/bereinigung, GET …/bestaetigen);
 * (m) Server: erkennePlanungRoute(pfad) genau einmal, routen-planung.mjs ohne `.method`, Zeilenzahl = Grenze.
 * Randfälle der reinen Funktionen belegen src/workboard/status-md.test.ts, src/workboard/roadmap-schreiben.test.ts,
 * src/workboard/roadmap-regeln.test.ts und src/feature-auftrag/akte-abschliessen.test.ts.
 *
 * Wird aufgerufen von: `npm run check:gates` (und damit `npm run check`).
 *
 * Aufruf: node scripts/check-f45-b5b1b2-bereinigung.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { spawnSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { connect } from 'node:net'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { registriereAuftrag } from '../src/auftrag/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { registriereWorkflow } from '../src/workflow/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'
import { fuehrePlanungRouteDurch } from './leitstand/routen-planung.mjs'
import { erzeugeMultiProjektDispatcher, erzeugeRequestHandler } from './leitstand-server.mjs'

const befunde = []
console.log('\n=== F45-B5b-1b-2-Bereinigung-Check ===\n')
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

/** Akte. @param id - Feature-ID @param status - Status @returns Text (LF) */
const akte = (id, status) => [`# ${id} — Gate`, '', '## Status', `Status: ${status}`, '', '## Ziel', 'Ziel.', ''].join('\n')

const ROADMAP = `{
  "roadmap_schema": "v0",
  "vision": "Gate.",
  "meilensteine": [
    {
      "id": "M1",
      "titel": "Eins",
      "status": "ABGESCHLOSSEN",
      "features": ["F1", "F2"]
    },
    {
      "id": "M3",
      "titel": "Drei",
      "status": "ABGESCHLOSSEN",
      "features": ["F15", "F16", "F17", "F18"]
    },
    {
      "id": "M4",
      "titel": "Vier",
      "status": "ABGESCHLOSSEN",
      "features": ["F20", "F21", "F22", "F23", "F25"]
    },
    {
      "id": "M5",
      "titel": "Fünf",
      "status": "LAEUFT",
      "features": ["F30", "F31"]
    }
  ]
}
`
const GRUND = 'Bereinigung offen — Bestätigung Stefan (Bereinigungsliste)'
const ausnahme = (m, f) => `    { "meilenstein": "${m}", "feature": "${f}", "grund": "${GRUND}" }`
const AUSNAHMEN = `{\n  "schema": "v0",\n  "status_ausnahmen": [\n${[ausnahme('M3', 'F18'), ausnahme('M4', 'F20'), ausnahme('M4', 'F21'), ausnahme('M4', 'F22'), ausnahme('M4', 'F25')].join(',\n')}\n  ]\n}\n`
const STATUS_MD = [
  '# Status',
  '',
  '- F1 (`features/F1/feature.md`, Status `ABGESCHLOSSEN`).',
  '- F2 (`features/F2/feature.md`, Status `ABGESCHLOSSEN`).',
  '- F15–F17 (`features/F15/feature.md`, Status `ABGESCHLOSSEN`; `features/F16/feature.md`, Status `ABGESCHLOSSEN`;',
  '  `features/F17/feature.md`, Status `ABGESCHLOSSEN`).',
  '- F18 — Router (`features/F18/feature.md`, Status `FEATURE_GATE`, AK1–AK7 erfüllt).',
  '',
  '### Meilenstein 4 — abgeschlossen',
  '',
  '- F20 — Akte `features/F20/feature.md`, Status `FEATURE_GATE`, AK7 ACCEPT.',
  '- F21 — Akte `features/F21/',
  '  feature.md`, Status `FEATURE_GATE`, AK8 ACCEPT.',
  '- F22 — Akte `features/F22/feature.md`, Status `FEATURE_GATE`. Nach F21.',
  '- F23 — Akte `features/F23/feature.md`, Status `ABGESCHLOSSEN`.',
  '- F25 — Akte `features/F25/feature.md`, Status `FEATURE_GATE` (WS-2b offen).',
  '- F30, F31 (`features/F30/feature.md`, Status `IN_ARBEIT`; `features/F31/feature.md`, Status `IN_ARBEIT`).',
  '',
].join('\n')

const basis = mkdtempSync(join(tmpdir(), 'f45-b5b1b2-'))
const repoWurzel = join(basis, 'projekt')
const basisVerzeichnis = join(basis, 'kontrollzustand')
const akten = {
  F1: akte('F1', 'ABGESCHLOSSEN'),
  F2: akte('F2', 'ABGESCHLOSSEN'),
  F15: akte('F15', 'ABGESCHLOSSEN'),
  F16: akte('F16', 'ABGESCHLOSSEN'),
  F17: akte('F17', 'ABGESCHLOSSEN'),
  F18: akte('F18', 'FEATURE_GATE'),
  F20: akte('F20', 'FEATURE_GATE').replace(/\n/g, '\r\n'),
  F21: akte('F21', 'FEATURE_GATE'),
  F22: akte('F22', 'FEATURE_GATE'),
  F23: akte('F23', 'ABGESCHLOSSEN'),
  F25: akte('F25', 'FEATURE_GATE'),
  F30: akte('F30', 'IN_ARBEIT'),
  F31: akte('F31', 'IN_ARBEIT'),
  'AF-F001': akte('AF-F001', 'ENTWURF'),
}
for (const [id, inhalt] of Object.entries(akten)) {
  mkdirSync(join(repoWurzel, 'features', id), { recursive: true })
  writeFileSync(join(repoWurzel, 'features', id, 'feature.md'), inhalt)
}
mkdirSync(join(repoWurzel, 'docs', 'projekt'), { recursive: true })
const pfade = {
  roadmap: join(repoWurzel, 'docs', 'projekt', 'roadmap.json'),
  ausnahmen: join(repoWurzel, 'docs', 'projekt', 'roadmap-ausnahmen.json'),
  status_md: join(repoWurzel, 'docs', 'STATUS.md'),
}
writeFileSync(pfade.roadmap, ROADMAP)
writeFileSync(pfade.ausnahmen, AUSNAHMEN)
writeFileSync(pfade.status_md, STATUS_MD)
const lies = (schluessel) => readFileSync(pfade[schluessel])
const akteLesen = (id) => readFileSync(join(repoWurzel, 'features', id, 'feature.md'))
/** Bytes aller Dateien eines Eintrags. @param id - Feature-ID @returns Stand */
const stand = (id) => ({ akte: akteLesen(id), roadmap: lies('roadmap'), ausnahmen: lies('ausnahmen'), status_md: lies('status_md') })
const unveraendert = (vorher, id) => Object.entries(stand(id)).every(([k, v]) => v.equals(vorher[k]))

/**
 * Führt ein Gate-Skript als Prozess im Attrappen-Ordner aus (liest Daten relativ zum Arbeitsverzeichnis).
 * @param skript - Dateiname unter scripts/
 * @returns { ok, ausgabe }
 */
function gateInAttrappe(skript) {
  const lauf = spawnSync(process.execPath, [resolve('scripts', skript)], { cwd: repoWurzel, encoding: 'utf8' })
  return { ok: lauf.status === 0, ausgabe: `${lauf.stdout}${lauf.stderr}`.trim().split('\n').slice(-4).join(' | ') }
}
const beideGates = () => [gateInAttrappe('check-akte-meilenstein.mjs'), gateInAttrappe('check-status-akten.mjs')]

/**
 * Rohe HTTP-Anfrage mit frei gewähltem Host-Header (Muster check-f814-host.mjs); liest nur den Status.
 * @param port - Zielport
 * @param art - HTTP-Methode
 * @param pfad - Anfragepfad
 * @param host - Host-Headerwert
 * @param body - JSON-Text oder ''
 * @returns Promise<number> Status
 */
function anfrageMitHost(port, art, pfad, host, body) {
  return new Promise((erledigt, fehlschlag) => {
    const kopf = [`${art} ${pfad} HTTP/1.1`, `Host: ${host}`, 'Connection: close', 'Content-Type: application/json', `Content-Length: ${Buffer.byteLength(body)}`]
    const socket = connect(port, '127.0.0.1', () => socket.end(`${kopf.join('\r\n')}\r\n\r\n${body}`))
    const teile = []
    socket.on('data', (d) => teile.push(d))
    socket.on('error', fehlschlag)
    socket.on('close', () => erledigt(Number(/^HTTP\/1\.[01] (\d{3})/.exec(Buffer.concat(teile).toString('latin1'))?.[1] ?? 0)))
  })
}

try {
  // ── Abläufe: F21 offen (sperrt) ─────────────────────────────────────────────────────────────────────────────────────
  const profilReferenz = leiteProfilReferenzAb(ladeStartvorlage('startvorlagen/beispielprojekt.json'))
  const ladeOptionen = { basisVerzeichnis, schreiber: () => {} }
  const SCHRITT = { schritt_id: 'schritt-1-ausfuehrung', rolle: 'ausfuehrung', werkzeugsatz: 'schreibend', worker: 'claude-code', modell: 'claude-sonnet-5', eingaben: [], output_schema: null, freigabe: 'ZWINGEND', freigabe_erteilt: false, risiko: 'Gate-Fixture.', zeitgrenze_ms: 600000, nachfolger: null, status: 'OFFEN', lauf_id: null }
  const auftragId = randomUUID()
  registriereAuftrag(auftragId, profilReferenz, 'Gate F21', 'Gate-Auftrag.', { ...ladeOptionen, feature_ref: 'F21' })
  const offenF21 = `f45-b5b1b2-F21-${randomUUID()}`
  registriereWorkflow({ workflow_schema: 'v0', workflow_id: offenF21, auftrag_id: auftragId, version: 1, ziel: 'Gate F21.', status: 'OFFEN', aktiver_schritt_id: SCHRITT.schritt_id, grenzen: { max_schritte: 6, max_replans: 1 }, schritte: [SCHRITT] }, profilReferenz, ladeOptionen)

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
  const liste = async (b = direkt) => rufe(`${b}/roadmap/bereinigung`, 'GET')
  const bestaetige = async (koerper, b = direkt) => rufe(`${b}/roadmap/bereinigung/bestaetigen`, 'POST', koerper)
  /** Aktueller Eintrag aus GET. @param id - 'M/F' @returns Eintrag oder undefined */
  const eintragAus = async (id) => (await liste()).koerper.eintraege?.find((e) => e.eintrag === id)
  const hashesVon = (id) => ({ roadmap: sha(lies('roadmap')), ausnahmen: sha(lies('ausnahmen')), akte: sha(akteLesen(id)), status_md: sha(lies('status_md')) })

  // ── (v) vorher grün ──────────────────────────────────────────────────────────────────────────────────────────────
  {
    const [am, sa] = beideGates()
    pruefe(am.ok && sa.ok, '(v) check-akte-meilenstein und check-status-akten laufen in der Attrappe vorher grün.', `(v) vorher: ${am.ausgabe} / ${sa.ausgabe}`)
  }

  // ── (a) GET Attrappe und echtes Repo ─────────────────────────────────────────────────────────────────────────────
  {
    const r = await liste(praefix)
    const e = r.koerper.eintraege ?? []
    const ids = e.map((x) => x.eintrag)
    const laeuft = e.filter((x) => x.vorschlaege.some((v) => v.entscheidung === 'meilenstein_laeuft')).map((x) => x.eintrag)
    const abgeschlossen = e.every((x) => x.vorschlaege.some((v) => v.entscheidung === 'feature_abgeschlossen' && v.text.includes('heute FEATURE_GATE')))
    const f21 = e.find((x) => x.eintrag === 'M4/F21')
    const hashesOk = e.every((x) => JSON.stringify(x.hashes) === JSON.stringify(hashesVon(x.feature)))
    // F45 B5b-2b-2 (Advisor B5b-2b A1): in der Attrappe sind alle Vorschläge vorprüfend möglich — F21 scheitert nur an der Sperre (c).
    const alleMoeglich = e.every((x) => x.vorschlaege.every((v) => v.moeglich === true && v.grund === null))
    pruefe(
      r.status === 200 && r.koerper.status === 'ok' && JSON.stringify(ids) === JSON.stringify(['M3/F18', 'M4/F20', 'M4/F21', 'M4/F22', 'M4/F25']) && JSON.stringify(laeuft) === '["M3/F18"]' && abgeschlossen && alleMoeglich && hashesOk && f21?.quelle.status_md === 'docs/STATUS.md:12' && f21?.quelle.ausnahme === 'docs/projekt/roadmap-ausnahmen.json' && f21?.quelle.akte === 'features/F21/feature.md',
      '(a) GET (über den Präfix) listet genau die fünf Abweichungen, „Meilenstein → LAEUFT“ nur bei M3/F18, „Feature → ABGESCHLOSSEN“ mit heutigem Status bei allen, jeder Vorschlag vorprüfend möglich (moeglich true, grund null — auch F21 trotz Sperre), vier Hashes = Dateien, Quelle mit STATUS.md-Zeile (F21 umbrochen).',
      `(a) ${JSON.stringify({ status: r.status, ids, laeuft, abgeschlossen, alleMoeglich, hashesOk, f21: f21?.quelle })}`
    )
    const echt = await fuehrePlanungRouteDurch({ art: 'bereinigung' }, null, { repoWurzel: process.cwd(), roadmapPfad: 'docs/projekt/roadmap.json' })
    const paare = JSON.parse(readFileSync('docs/projekt/roadmap-ausnahmen.json', 'utf8')).status_ausnahmen.map((x) => `${x.meilenstein}/${x.feature}`).sort()
    const echteIds = (echt.koerper.eintraege ?? []).map((x) => x.eintrag).sort()
    const zaehle = (m) => echt.koerper.eintraege.filter((x) => x.meilenstein === m).length
    const laeuftEcht = (echt.koerper.eintraege ?? []).every((x) => x.vorschlaege.some((v) => v.entscheidung === 'meilenstein_laeuft') === (zaehle(x.meilenstein) === 1))
    // Nur die Form (kein Zeitzünder): moeglich boolean, grund genau dann ein nicht leerer Text, wenn nicht möglich.
    const formEcht = (echt.koerper.eintraege ?? []).every((x) => x.vorschlaege.every((v) => typeof v.moeglich === 'boolean' && (v.moeglich ? v.grund === null : typeof v.grund === 'string' && v.grund !== '')))
    pruefe(echt.status === 200 && echt.koerper.status === 'ok' && JSON.stringify(echteIds) === JSON.stringify(paare) && laeuftEcht && formEcht, `(a) echtes Repo (nur lesend): ${echteIds.length} Einträge = Paare der Ausnahmen-Datei (${echteIds.join(', ')}), LAEUFT genau bei Meilensteinen mit einer Abweichung, jeder Vorschlag mit moeglich/grund.`, `(a) echt ${JSON.stringify({ status: echt.status, echteIds, paare, laeuftEcht, formEcht })}`)
  }

  // ── (b) 400 ──────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const vorher = stand('F20')
    const h = hashesVon('F20')
    const ohneStatusMd = { roadmap: h.roadmap, ausnahmen: h.ausnahmen, akte: h.akte }
    const proben = [
      await bestaetige({ eintrag: 'M4/F20', entscheidung: 'feature_abgeschlossen', grund: '  ', hashes: h }),
      await bestaetige({ eintrag: 'M4/F20', entscheidung: 'ausplanen', grund: 'g', hashes: h }),
      await bestaetige({ eintrag: ['M4/F20', 'M4/F22'], entscheidung: 'feature_abgeschlossen', grund: 'g', hashes: h }),
      await bestaetige({ eintrag: 'M4/F20', eintraege: ['M4/F22'], entscheidung: 'feature_abgeschlossen', grund: 'g', hashes: h }),
      await bestaetige({ eintrag: 'M4/F20', entscheidung: 'feature_abgeschlossen', grund: 'g', hashes: ohneStatusMd }),
    ]
    pruefe(
      proben.every((p) => p.status === 400) && /grund/.test(proben[0].koerper.grund) && /entscheidung/.test(proben[1].koerper.grund) && /genau ein Eintrag/.test(proben[2].koerper.grund) && /Sammel-Bestätigung/.test(proben[3].koerper.grund) && /hashes/.test(proben[4].koerper.grund) && unveraendert(vorher, 'F20'),
      '(b) 400 bei leerem grund, unbekannter Entscheidung, zweitem Eintrag (Liste bzw. Feld eintraege) und fehlendem Hash-Schlüssel — nichts geschrieben.',
      `(b) ${JSON.stringify(proben.map((p) => [p.status, p.koerper.grund]))}`
    )
  }

  // ── (c) Sperre ───────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const vorher = stand('F21')
    const r = await bestaetige({ eintrag: 'M4/F21', entscheidung: 'feature_abgeschlossen', grund: 'g', hashes: hashesVon('F21') })
    pruefe(r.status === 409 && r.koerper.workflowId === offenF21 && unveraendert(vorher, 'F21'), '(c) offener Ablauf an F21 ⇒ 409 mit workflowId, nichts geschrieben.', `(c) ${JSON.stringify(r)}`)
  }

  // ── (d) 409 je Datei-Hash ────────────────────────────────────────────────────────────────────────────────────────
  {
    const vorher = stand('F20')
    const ergebnisse = []
    for (const schluessel of ['roadmap', 'ausnahmen', 'akte', 'status_md']) {
      const r = await bestaetige({ eintrag: 'M4/F20', entscheidung: 'feature_abgeschlossen', grund: 'g', hashes: { ...hashesVon('F20'), [schluessel]: 'f'.repeat(64) } })
      ergebnisse.push(r.status === 409 && JSON.stringify(r.koerper.abweichend) === JSON.stringify([schluessel]) && r.koerper.hashes?.[schluessel] === hashesVon('F20')[schluessel])
    }
    pruefe(ergebnisse.every(Boolean) && unveraendert(vorher, 'F20'), '(d) je abweichendem Datei-Hash (roadmap, ausnahmen, akte, status_md) ⇒ 409 mit abweichend und aktuellem Hash, nichts geschrieben.', `(d) ${JSON.stringify(ergebnisse)}`)
  }

  // ── (e) STATUS.md mehrdeutig, fehlend, CRLF ──────────────────────────────────────────────────────────────────────
  {
    const fall = async (statusMd, id) => {
      writeFileSync(pfade['status_md'], statusMd)
      const vorher = stand(id)
      const r = await bestaetige({ eintrag: `M4/${id}`, entscheidung: 'feature_abgeschlossen', grund: 'g', hashes: hashesVon(id) })
      const gleich = unveraendert(vorher, id)
      writeFileSync(pfade['status_md'], STATUS_MD)
      return { r, gleich }
    }
    const doppelt = await fall(`${STATUS_MD}- nochmal \`features/F20/feature.md\`, Status \`FEATURE_GATE\`.\n`, 'F20')
    const fehlt = await fall(STATUS_MD.replace('`features/F22/feature.md`, Status `FEATURE_GATE`', 'F22 ohne Standardform'), 'F22')
    const crlf = await fall(STATUS_MD.replace(/\n/g, '\r\n'), 'F20')
    pruefe(
      [doppelt, fehlt].every((f) => f.r.status === 422 && /STATUS\.md von Hand/.test(f.r.koerper.grund) && f.gleich) && /2×/.test(doppelt.r.koerper.grund) && /0×/.test(fehlt.r.koerper.grund) && crlf.r.status === 422 && /CRLF/.test(crlf.r.koerper.grund) && crlf.gleich,
      '(e) STATUS.md mit zwei Standardformen für F20 bzw. ohne für F22 ⇒ 422 „STATUS.md von Hand“; CRLF ⇒ 422 — Akte, STATUS.md und Ausnahmen bytegleich.',
      `(e) ${JSON.stringify([doppelt, fehlt, crlf].map((f) => [f.r.status, f.r.koerper.grund, f.gleich]))}`
    )
  }

  // ── (f) CRLF in den JSON-Schreibzielen ───────────────────────────────────────────────────────────────────────────
  {
    const fall = async (schluessel, koerper, id) => {
      const lf = lies(schluessel)
      writeFileSync(pfade[schluessel], lf.toString('utf8').replace(/\n/g, '\r\n'))
      const vorher = stand(id)
      const r = await bestaetige({ ...koerper, grund: 'g', hashes: hashesVon(id) })
      const gleich = unveraendert(vorher, id)
      writeFileSync(pfade[schluessel], lf)
      return r.status === 422 && /CRLF/.test(r.koerper.grund) && gleich
    }
    const ausnahmenCrlf = await fall('ausnahmen', { eintrag: 'M4/F22', entscheidung: 'feature_abgeschlossen' }, 'F22')
    const roadmapCrlf = await fall('roadmap', { eintrag: 'M3/F18', entscheidung: 'meilenstein_laeuft' }, 'F18')
    pruefe(ausnahmenCrlf && roadmapCrlf, '(f) CRLF in roadmap-ausnahmen.json (F22 → ABGESCHLOSSEN) bzw. roadmap.json (M3 → LAEUFT) ⇒ 422, nichts geschrieben.', `(f) ${JSON.stringify({ ausnahmenCrlf, roadmapCrlf })}`)
  }

  // ── (g) B4 und Eintrag ohne Abweichung ───────────────────────────────────────────────────────────────────────────
  {
    const vorher = stand('F20')
    const r = await bestaetige({ eintrag: 'M4/F20', entscheidung: 'meilenstein_laeuft', grund: 'g', hashes: hashesVon('F20') })
    const keine = await bestaetige({ eintrag: 'M5/F30', entscheidung: 'feature_abgeschlossen', grund: 'g', hashes: hashesVon('F30') })
    pruefe(
      r.status === 422 && /genau eine R1-Abweichung hat \(heute 4\)/.test(r.koerper.grund) && unveraendert(vorher, 'F20') && keine.status === 422 && /keine aktuelle R1-Abweichung/.test(keine.koerper.grund),
      '(g) „M4 → LAEUFT“ bei vier Abweichungen ⇒ 422 mit Ausweg (B4); M5/F30 ist keine Abweichung ⇒ 422 — nichts geschrieben.',
      `(g) ${JSON.stringify([r, keine])}`
    )
  }

  // ── (l) 405 ──────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const proben = [await rufe(`${direkt}/roadmap/bereinigung`, 'POST', {}), await rufe(`${praefix}/roadmap/bereinigung`, 'PUT', {}), await rufe(`${direkt}/roadmap/bereinigung/bestaetigen`, 'GET')]
    pruefe(proben.every((p) => p.status === 405), '(l) falsche Methode ⇒ 405 (POST und PUT …/bereinigung, GET …/bestaetigen).', `(l) ${JSON.stringify(proben.map((p) => p.status))}`)
  }

  // ── (k) CSRF und Host ────────────────────────────────────────────────────────────────────────────────────────────
  {
    const vorher = stand('F20')
    const koerper = { eintrag: 'M4/F20', entscheidung: 'feature_abgeschlossen', grund: 'Böse', hashes: hashesVon('F20') }
    const proben = []
    for (const b of [direkt, praefix]) {
      for (const kopf of [{ origin: 'https://boese.example' }, { 'sec-fetch-site': 'cross-site' }]) proben.push((await rufe(`${b}/roadmap/bereinigung/bestaetigen`, 'POST', koerper, kopf)).status)
    }
    const json = JSON.stringify(koerper)
    proben.push(await anfrageMitHost(direktPort, 'POST', '/api/roadmap/bereinigung/bestaetigen', `evil.example:${direktPort}`, json))
    proben.push(await anfrageMitHost(praefixPort, 'POST', '/api/projekte/p1/roadmap/bereinigung/bestaetigen', `evil.example:${praefixPort}`, json))
    proben.push(await anfrageMitHost(direktPort, 'GET', '/api/roadmap/bereinigung', `evil.example:${direktPort}`, ''))
    proben.push(await anfrageMitHost(praefixPort, 'GET', '/api/projekte/p1/roadmap/bereinigung', `evil.example:${praefixPort}`, ''))
    pruefe(proben.length === 8 && proben.every((s) => s === 403) && unveraendert(vorher, 'F20'), '(k) POST mit fremder Herkunft (Origin, Sec-Fetch-Site) und GET/POST mit fremdem Host ⇒ 403, direkt und über den Präfix, nichts geschrieben.', `(k) ${JSON.stringify(proben)}`)
  }

  // ── (h) Erfolg „F20 → ABGESCHLOSSEN“ (CRLF-Akte) ─────────────────────────────────────────────────────────────────
  {
    const e = await eintragAus('M4/F20')
    const vorher25 = await eintragAus('M4/F25')
    const r = await bestaetige({ eintrag: 'M4/F20', entscheidung: 'feature_abgeschlossen', grund: 'Gate F20', hashes: e?.hashes }, praefix)
    // qa 5: zweites identisches Senden (Doppelklick) und Hashes von vor der Bestätigung ⇒ 409, nichts geschrieben.
    const nachH = stand('F25')
    const doppelt = await bestaetige({ eintrag: 'M4/F20', entscheidung: 'feature_abgeschlossen', grund: 'Gate F20', hashes: e?.hashes })
    const veraltet = await bestaetige({ eintrag: 'M4/F25', entscheidung: 'feature_abgeschlossen', grund: 'g', hashes: vorher25?.hashes })
    pruefe(
      doppelt.status === 409 && JSON.stringify(doppelt.koerper.abweichend) === '["ausnahmen","akte","status_md"]' && veraltet.status === 409 && JSON.stringify(veraltet.koerper.abweichend) === '["ausnahmen","status_md"]' && unveraendert(nachH, 'F25'),
      '(h) zweites identisches Senden ⇒ 409 (ausnahmen, akte, status_md); F25 mit Hashes von vor der Bestätigung ⇒ 409 (ausnahmen, status_md) — nichts geschrieben.',
      `(h) Doppelklick/veraltet ${JSON.stringify([doppelt, veraltet])}`
    )
    const nachher = akteLesen('F20').toString('utf8')
    // Datum = lokales Datum des Servers; der Erwartungstext übernimmt es aus der Datei.
    const datum = /^Abgenommen: (\d{4}-\d{2}-\d{2})\r$/m.exec(nachher)?.[1]
    const erwartet = `${akten.F20.replace('Status: FEATURE_GATE\r\n', `Status: ABGESCHLOSSEN\r\nAbgenommen: ${datum}\r\n`)}\r\n## Änderungen\r\n- ${datum} · Status ABGESCHLOSSEN (Bereinigung M4) · Gate F20\r\n`
    const statusMd = lies('status_md').toString('utf8') === STATUS_MD.replace('`features/F20/feature.md`, Status `FEATURE_GATE`', '`features/F20/feature.md`, Status `ABGESCHLOSSEN`')
    const ausnahmen = lies('ausnahmen').toString('utf8') === AUSNAHMEN.replace(`${ausnahme('M4', 'F20')},\n`, '')
    const git = Array.isArray(r.koerper.git) && r.koerper.git.some((z) => z === 'git add -- features/F20/feature.md docs/STATUS.md docs/projekt/roadmap-ausnahmen.json')
    const [am, sa] = beideGates()
    pruefe(
      r.status === 200 && datum !== undefined && nachher === erwartet && statusMd && ausnahmen && lies('roadmap').toString('utf8') === ROADMAP && git && JSON.stringify(r.koerper.hashes) === JSON.stringify(hashesVon('F20')) && JSON.stringify(r.koerper.geschrieben) === '["features/F20/feature.md","docs/STATUS.md","docs/projekt/roadmap-ausnahmen.json"]' && am.ok && sa.ok,
      '(h) „F20 → ABGESCHLOSSEN“: Akte = erwarteter Text (Status, Abgenommen, Änderungszeile, CRLF erhalten), STATUS.md nur das Wort, Ausnahme-Zeile weg, Roadmap bytegleich, Hashes = Dateien, Git-Block mit drei Pfaden; danach check-akte-meilenstein und check-status-akten grün.',
      `(h) ${JSON.stringify({ status: r.status, koerper: r.koerper, datum, akte: nachher === erwartet, statusMd, ausnahmen, git, am: am.ausgabe, sa: sa.ausgabe })}`
    )
  }

  // ── (i) Erfolg „M3 → LAEUFT“ ─────────────────────────────────────────────────────────────────────────────────────
  {
    const vorher = stand('F18')
    const e = await eintragAus('M3/F18')
    const r = await bestaetige({ eintrag: 'M3/F18', entscheidung: 'meilenstein_laeuft', grund: 'Gate LAEUFT', hashes: e?.hashes })
    const roadmap = lies('roadmap').toString('utf8') === ROADMAP.replace('"id": "M3",\n      "titel": "Drei",\n      "status": "ABGESCHLOSSEN"', '"id": "M3",\n      "titel": "Drei",\n      "status": "LAEUFT"')
    const ausnahmen = lies('ausnahmen').toString('utf8') === vorher.ausnahmen.toString('utf8').replace(`${ausnahme('M3', 'F18')},\n`, '')
    const git = Array.isArray(r.koerper.git) && r.koerper.git.some((z) => z === 'git add -- docs/projekt/roadmap.json docs/projekt/roadmap-ausnahmen.json') && r.koerper.git.some((z) => z.includes('M3/F18: Bereinigung M3 → LAEUFT — Gate LAEUFT'))
    const [am, sa] = beideGates()
    pruefe(
      r.status === 200 && roadmap && ausnahmen && akteLesen('F18').equals(vorher.akte) && lies('status_md').equals(vorher.status_md) && git && am.ok && sa.ok,
      '(i) „M3 → LAEUFT“: roadmap.json nur im Status-Wert, Ausnahme weg, Akte F18 und STATUS.md bytegleich (keine Änderungszeile), Grund in der Commit-Nachricht; danach beide Gate-Skripte grün.',
      `(i) ${JSON.stringify({ status: r.status, koerper: r.koerper, roadmap, ausnahmen, am: am.ausgabe, sa: sa.ausgabe })}`
    )
  }

  // ── (j) Rückbau inkl. der scheiternden Datei ─────────────────────────────────────────────────────────────────────
  {
    const kontext = (scheitertBei) => ({
      repoWurzel,
      roadmapPfad: 'docs/projekt/roadmap.json',
      workflows: async () => [],
      auftraege: async () => [],
      datum: '2026-10-24',
      schreibe: (pfad, bytes) => {
        if (pfad.endsWith(scheitertBei)) {
          writeFileSync(pfad, 'kaputt') // Teilschreiben, dann Fehler
          throw new Error('Gate: Schreiben scheitert')
        }
        writeFileSync(pfad, bytes)
      },
    })
    const vorher = stand('F25')
    const koerper = { ok: true, daten: { eintrag: 'M4/F25', entscheidung: 'feature_abgeschlossen', grund: 'g', hashes: hashesVon('F25') } }
    const r1 = await fuehrePlanungRouteDurch({ art: 'bestaetigen' }, koerper, kontext('STATUS.md'))
    const zwei = JSON.stringify(r1.koerper.rueckbau) === JSON.stringify([{ pfad: 'features/F25/feature.md', zurueckgesetzt: true }, { pfad: 'docs/STATUS.md', zurueckgesetzt: true }])
    const gleich1 = unveraendert(vorher, 'F25')
    const r2 = await fuehrePlanungRouteDurch({ art: 'bestaetigen' }, koerper, kontext('roadmap-ausnahmen.json'))
    const drei = r2.koerper.rueckbau?.length === 3 && r2.koerper.rueckbau.every((x) => x.zurueckgesetzt) && r2.koerper.rueckbau[2].pfad === 'docs/projekt/roadmap-ausnahmen.json'
    pruefe(
      r1.status === 500 && zwei && /git diff/.test(r1.koerper.grund) && gleich1 && r2.status === 500 && drei && unveraendert(vorher, 'F25'),
      '(j) STATUS.md scheitert nach Teilschreiben ⇒ 500, Akte und STATUS.md zurück, Ausnahmen-Datei nie angefasst; Ausnahmen-Datei scheitert ⇒ alle drei zurück — alles bytegleich.',
      `(j) ${JSON.stringify([r1, r2])}`
    )
  }

  // ── (r) R1-Semantik: verwaiste Ausnahme rot, Altbefund grün, Abweichung ohne Ausnahme ───────────────────────────────
  {
    // F2 wird FEATURE_GATE ohne Ausnahme (Altbefund in M1), dazu eine verwaiste Ausnahme M1/F1 (F1 ist ABGESCHLOSSEN).
    writeFileSync(join(repoWurzel, 'features', 'F2', 'feature.md'), akte('F2', 'FEATURE_GATE'))
    writeFileSync(pfade.status_md, lies('status_md').toString('utf8').replace('`features/F2/feature.md`, Status `ABGESCHLOSSEN`', '`features/F2/feature.md`, Status `FEATURE_GATE`'))
    const ohneF1 = lies('ausnahmen')
    writeFileSync(pfade.ausnahmen, ohneF1.toString('utf8').replace('"status_ausnahmen": [\n', `"status_ausnahmen": [\n${ausnahme('M1', 'F1')},\n`))
    const e2 = await eintragAus('M1/F2')
    const vorher2 = stand('F2')
    const rot = await bestaetige({ eintrag: 'M1/F2', entscheidung: 'meilenstein_laeuft', grund: 'g', hashes: e2?.hashes })
    const rotOk = e2?.ausnahme === null && e2?.vorschlaege.some((v) => v.entscheidung === 'meilenstein_laeuft') && rot.status === 422 && rot.koerper.verstoesse?.some((v) => v.includes('M1/F1') && v.includes('LAEUFT')) && unveraendert(vorher2, 'F2')
    const e22 = await eintragAus('M4/F22')
    const gruen = await bestaetige({ eintrag: 'M4/F22', entscheidung: 'feature_abgeschlossen', grund: 'Gate F22', hashes: e22?.hashes })
    writeFileSync(pfade.ausnahmen, lies('ausnahmen').toString('utf8').replace(`${ausnahme('M1', 'F1')},\n`, ''))
    const e2b = await eintragAus('M1/F2')
    const ohne = await bestaetige({ eintrag: 'M1/F2', entscheidung: 'feature_abgeschlossen', grund: 'Gate F2', hashes: e2b?.hashes })
    const ohneOk = ohne.status === 200 && JSON.stringify(ohne.koerper.geschrieben) === '["features/F2/feature.md","docs/STATUS.md"]' && !ohne.koerper.git?.some((z) => z.includes('roadmap-ausnahmen.json'))
    const [am, sa] = beideGates()
    pruefe(
      rotOk && gruen.status === 200 && ohneOk && am.ok && sa.ok,
      '(r) verwaiste Ausnahme M1/F1 ⇒ „M1 → LAEUFT“ 422 (Befundtext ändert sich, fail-closed); Altbefunde in M1 blockieren „F22 → ABGESCHLOSSEN“ nicht (200); M1/F2 ohne Ausnahme bestätigbar, Git-Block ohne Ausnahmen-Datei; danach beide Gate-Skripte grün.',
      `(r) ${JSON.stringify({ e2, rot, gruen, ohne, am: am.ausgabe, sa: sa.ausgabe })}`
    )
  }

  // ── (d2) A2 dynamisch und Sperre bei LAEUFT ──────────────────────────────────────────────────────────────────────
  {
    const e25 = await eintragAus('M4/F25')
    const r25 = await bestaetige({ eintrag: 'M4/F25', entscheidung: 'feature_abgeschlossen', grund: 'Gate F25', hashes: e25?.hashes })
    const e21 = await eintragAus('M4/F21')
    const vorher = stand('F21')
    const r21 = await bestaetige({ eintrag: 'M4/F21', entscheidung: 'meilenstein_laeuft', grund: 'g', hashes: e21?.hashes })
    pruefe(
      r25.status === 200 && e21?.vorschlaege.some((v) => v.entscheidung === 'meilenstein_laeuft' && v.text === 'M4 → LAEUFT') && r21.status === 409 && r21.koerper.workflowId === offenF21 && unveraendert(vorher, 'F21'),
      '(d2) nach drei Einzelbestätigungen in M4 bietet GET „M4 → LAEUFT“ für F21 an (A2 = dynamisch); die Sperre des offenen Ablaufs gilt auch dafür (409).',
      `(d2) ${JSON.stringify({ r25, e21, r21 })}`
    )
  }

  // ── (n) Fremdprojekt, ungültige bzw. fehlende Roadmap, ABGEBROCHEN (cr 5, qa 5; Modulaufruf) ──────────────────────
  {
    const fremd = join(basis, 'fremd')
    const fremdAkte = (id, inhalt) => {
      mkdirSync(join(fremd, 'features', id), { recursive: true })
      writeFileSync(join(fremd, 'features', id, 'feature.md'), inhalt)
    }
    fremdAkte('F1', akte('F1', 'FEATURE_GATE'))
    fremdAkte('F2', akte('F2', 'ABGEBROCHEN'))
    mkdirSync(join(fremd, 'docs', 'projekt'), { recursive: true })
    writeFileSync(join(fremd, 'docs', 'projekt', 'roadmap.json'), '{\n  "roadmap_schema": "v0",\n  "vision": "Fremd.",\n  "meilensteine": [\n    { "id": "M1", "titel": "Eins", "status": "ABGESCHLOSSEN", "features": ["F1", "F2"] }\n  ]\n}\n')
    const kontext = (wurzel) => ({ repoWurzel: wurzel, roadmapPfad: 'docs/projekt/roadmap.json', workflows: async () => [], auftraege: async () => [] })
    const get = (wurzel) => fuehrePlanungRouteDurch({ art: 'bereinigung' }, null, kontext(wurzel))
    const post = (wurzel, daten) => fuehrePlanungRouteDurch({ art: 'bestaetigen' }, { ok: true, daten }, kontext(wurzel))
    const liste1 = await get(fremd)
    const f1 = liste1.koerper.eintraege?.find((x) => x.eintrag === 'M1/F1')
    const f2 = liste1.koerper.eintraege?.find((x) => x.eintrag === 'M1/F2')
    const abgebrochen = await post(fremd, { eintrag: 'M1/F2', entscheidung: 'feature_abgeschlossen', grund: 'g', hashes: f2?.hashes })
    const ok = await post(fremd, { eintrag: 'M1/F1', entscheidung: 'feature_abgeschlossen', grund: 'Fremd', hashes: f1?.hashes })
    const fremdOk =
      f1?.hashes.ausnahmen === null && f1?.hashes.status_md === null && JSON.stringify(f2?.vorschlaege) === '[]' && abgebrochen.status === 422 && JSON.stringify(abgebrochen.koerper.vorschlaege) === '[]' && ok.status === 200 && /fehlt/.test(ok.koerper.hinweis ?? '') && JSON.stringify(ok.koerper.geschrieben) === '["features/F1/feature.md"]'
    writeFileSync(join(fremd, 'docs', 'projekt', 'roadmap-ausnahmen.json'), '{ kaputt')
    const ungueltig = await get(fremd)
    const ungueltigPost = await post(fremd, { eintrag: 'M1/F2', entscheidung: 'meilenstein_laeuft', grund: 'g', hashes: { roadmap: null, ausnahmen: null, akte: null, status_md: null } })
    const leer = join(basis, 'leer')
    mkdirSync(leer, { recursive: true })
    const fehlt = await get(leer)
    const fehltPost = await post(leer, { eintrag: 'M1/F1', entscheidung: 'feature_abgeschlossen', grund: 'g', hashes: { roadmap: null, ausnahmen: null, akte: null, status_md: null } })
    pruefe(
      fremdOk && ungueltig.status === 200 && ungueltig.koerper.status === 'ungueltig' && ungueltigPost.status === 422 && fehlt.status === 200 && fehlt.koerper.status === 'nicht_vorhanden' && fehltPost.status === 422,
      '(n) Fremdprojekt ohne STATUS.md und Ausnahmen-Datei: Hashes null, ABGEBROCHEN ohne Vorschlag ⇒ 422, F1 ⇒ 200 mit hinweis und nur der Akte; ungültige Ausnahmen-Datei ⇒ GET „ungueltig“, POST 422; ohne Roadmap ⇒ GET „nicht_vorhanden“, POST 422.',
      `(n) ${JSON.stringify({ f1: f1?.hashes, f2: f2?.vorschlaege, abgebrochen, ok: ok.koerper, ungueltig: ungueltig.koerper, ungueltigPost, fehlt: fehlt.koerper, fehltPost })}`
    )
  }

  // ── (m) Server ───────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const server = readFileSync('scripts/leitstand-server.mjs', 'utf8')
    const modul = readFileSync('scripts/leitstand/routen-planung.mjs', 'utf8')
    const aufrufe = server.split('erkennePlanungRoute(pfad)').length - 1
    const zeilen = server.split('\n').length - (server.endsWith('\n') ? 1 : 0)
    const grenze = JSON.parse(readFileSync('scripts/wachstumsbremse-server.json', 'utf8')).obergrenze_zeilen
    pruefe(aufrufe === 1 && !modul.includes('.method') && zeilen === grenze, `(m) erkennePlanungRoute(pfad) genau einmal im Server, routen-planung.mjs ohne „.method“, Server ${zeilen} Zeilen = Grenze.`, `(m) ${JSON.stringify({ aufrufe, method: modul.includes('.method'), zeilen, grenze })}`)
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
