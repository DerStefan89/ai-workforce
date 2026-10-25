/**
 * Datei: scripts/leitstand/routen-planung-vorpruefung.test.mjs
 *
 * Zweck: node:test für die Vorprüfung der Bereinigungsliste (F45 B5b-2b-2, F-1189 qa3; features/F45/plan-b5b2b2-v2.md, Advisor
 * features/F45/advisor-b5b2b2.md): GET /api/roadmap/bereinigung trägt je Vorschlag `moeglich`/`grund` aus derselben reinen
 * Vorprüfung wie POST …/bestaetigen. Je Attrappe läuft eine Schleife über ALLE Vorschläge aller Einträge (Advisor B1), jeder in
 * einer frischen Kopie: `moeglich` ⇒ POST 200, sonst POST 422 mit genau diesem `grund` und kein Byte geschrieben. Je erreichbarem
 * Sperrgrund aus dem Block des POST (Tabelle A2 in plan-b5b2b2.md mit den Korrekturen aus v2) ein Fall; dazu die Wege ohne Sperre
 * (STATUS.md fehlt, ohne Standardform, nennt das Feature schon als ABGESCHLOSSEN ⇒ 200 mit hinweis) und die Sperre durch einen
 * offenen Ablauf (GET möglich, POST 409). Modulaufruf fuehrePlanungRouteDurch gegen ein Temp-Repo (Muster Gate b5b1b2 (n)); den
 * HTTP-Weg prüft scripts/check-f45-b5b1b2-bereinigung.mjs.
 * Unerreichbar aus einem GET-Vorschlag (kein Fall): Vorschlag fehlt (geprüft wird je vorhandenem Vorschlag), Akte ohne
 * Status-Zeile (kein Vorschlag), ABGESCHLOSSEN/ABGEBROCHEN (keine Abweichung bzw. kein Vorschlag), Rundlauf-Fehler der Module
 * (Tests der Module), JSON/Schema bzw. ungültige Ausnahmen-Datei (Stand „ungueltig“), „bliebe Abweichung“ (nach ABGESCHLOSSEN bzw.
 * LAEUFT keine Abweichung mehr). „Akte fehlt“ ist nur auf einem Dateisystem ohne Groß-/Kleinunterscheidung erreichbar — der Fall
 * prüft deshalb nur die Äquivalenz.
 * Hinweis: kein Wort für die HTTP-Weiche in dieser Datei (check-f813-csrf (4) liest auch Tests unter scripts/leitstand/).
 *
 * Wird aufgerufen von: `npm test` (node --test über scripts/teste.mjs).
 */

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'
import { after, test } from 'node:test'
import { raeumeVerzeichnis } from '../_aufraeumen.ts'
import { fuehrePlanungRouteDurch } from './routen-planung.mjs'

const wurzeln = []
after(() => {
  for (const w of wurzeln) raeumeVerzeichnis(w)
})

const ROADMAP_PFAD = 'docs/projekt/roadmap.json'
const AUSNAHMEN_PFAD = 'docs/projekt/roadmap-ausnahmen.json'
const STATUS_PFAD = 'docs/STATUS.md'
const GRUND_OFFEN = 'Bereinigung offen — Bestätigung Stefan (Bereinigungsliste)'

/** Akte. @param id - Feature-ID @param status - Status-Zeile (ohne „Status: “) @param zusatz - Zeilen nach der Status-Zeile @returns Text */
const akte = (id, status, zusatz = []) => [`# ${id} — Test`, '', '## Status', `Status: ${status}`, ...zusatz, '', '## Ziel', 'Ziel.', ''].join('\n')

/** Meilenstein als JSON-Block im Muster der echten roadmap.json. @returns Text */
const meilenstein = (id, status, features) => `    {\n      "id": "${id}",\n      "titel": "${id}",\n      "status": "${status}",\n      "features": [${features.map((f) => `"${f}"`).join(', ')}]\n    }`
const roadmap = (bloecke) => `{\n  "roadmap_schema": "v0",\n  "vision": "Test.",\n  "meilensteine": [\n${bloecke.join(',\n')}\n  ]\n}\n`
const ausnahme = (m, f) => `    { "meilenstein": "${m}", "feature": "${f}", "grund": "${GRUND_OFFEN}" }`
const ausnahmen = (zeilen) => `{\n  "schema": "v0",\n  "status_ausnahmen": [\n${zeilen.join(',\n')}\n  ]\n}\n`
const statusZeile = (id, status) => `- ${id} (\`features/${id}/feature.md\`, Status \`${status}\`).`

/**
 * Grundstand: M3 (abgeschlossen, F18 offen, Ausnahme), M4 (abgeschlossen, F20 und F22 offen mit Ausnahme, F23 fertig), M5 läuft.
 * Ergibt drei Einträge: M3/F18 (beide Entscheidungen), M4/F20, M4/F22 (je „Feature → ABGESCHLOSSEN“) — alle möglich.
 * @returns { relPfad: string | Buffer }
 */
function grundstand() {
  return {
    [ROADMAP_PFAD]: roadmap([meilenstein('M3', 'ABGESCHLOSSEN', ['F18']), meilenstein('M4', 'ABGESCHLOSSEN', ['F20', 'F22', 'F23']), meilenstein('M5', 'LAEUFT', ['F30'])]),
    [AUSNAHMEN_PFAD]: ausnahmen([ausnahme('M3', 'F18'), ausnahme('M4', 'F20'), ausnahme('M4', 'F22')]),
    [STATUS_PFAD]: ['# Status', '', statusZeile('F18', 'FEATURE_GATE'), statusZeile('F20', 'FEATURE_GATE'), statusZeile('F22', 'FEATURE_GATE'), statusZeile('F23', 'ABGESCHLOSSEN'), statusZeile('F30', 'IN_ARBEIT'), ''].join('\n'),
    'features/F18/feature.md': akte('F18', 'FEATURE_GATE'),
    'features/F20/feature.md': akte('F20', 'FEATURE_GATE'),
    'features/F22/feature.md': akte('F22', 'FEATURE_GATE'),
    'features/F23/feature.md': akte('F23', 'ABGESCHLOSSEN'),
    'features/F30/feature.md': akte('F30', 'IN_ARBEIT'),
  }
}

/** Legt ein Temp-Repo an. @param dateien - { relPfad: Inhalt } (undefined = Datei fehlt) @returns Wurzel */
function baue(dateien) {
  const wurzel = mkdtempSync(join(tmpdir(), 'f45-b5b2b2-vorpruefung-'))
  wurzeln.push(wurzel)
  for (const [rel, inhalt] of Object.entries(dateien)) {
    if (inhalt === undefined) continue
    mkdirSync(dirname(join(wurzel, rel)), { recursive: true })
    writeFileSync(join(wurzel, rel), inhalt)
  }
  return wurzel
}

/** Bytes aller Dateien unter der Wurzel. @param wurzel - Wurzel @returns Map relPfad → Buffer */
function bytes(wurzel) {
  const stand = new Map()
  const stapel = [wurzel]
  while (stapel.length > 0) {
    const ordner = stapel.pop()
    for (const name of readdirSync(ordner)) {
      const pfad = join(ordner, name)
      if (statSync(pfad).isDirectory()) stapel.push(pfad)
      else stand.set(relative(wurzel, pfad), readFileSync(pfad))
    }
  }
  return stand
}
const gleich = (a, b) => a.size === b.size && [...a].every(([k, v]) => b.has(k) && b.get(k).equals(v))

/** Kontext ohne Abläufe, festes Datum. @param repoWurzel - Wurzel @param teil - Überschreibungen @returns Kontext */
const kontext = (repoWurzel, teil = {}) => ({ repoWurzel, roadmapPfad: ROADMAP_PFAD, workflows: async () => [], auftraege: async () => [], datum: '2026-10-25', ...teil })
const liste = async (wurzel, teil) => fuehrePlanungRouteDurch({ art: 'bereinigung' }, null, kontext(wurzel, teil))
const bestaetige = async (wurzel, daten, teil) => fuehrePlanungRouteDurch({ art: 'bestaetigen' }, { ok: true, daten }, kontext(wurzel, teil))

/**
 * Äquivalenz-Schleife (Advisor B1): GET auf dem Stand, dann je Vorschlag aller Einträge eine frische Kopie und POST mit den Hashes
 * aus dem GET. Prüft: moeglich ⇒ 200; sonst 422 mit genau dem GET-grund und kein Byte geändert.
 * @param dateien - Stand
 * @param grund - Grund des POST
 * @returns Liste { eintrag, entscheidung, moeglich, grund, status, koerper }
 */
async function aequivalenz(dateien, grund = 'Test') {
  const get = await liste(baue(dateien))
  assert.equal(get.status, 200)
  assert.equal(get.koerper.status, 'ok', JSON.stringify(get.koerper))
  const ergebnisse = []
  for (const e of get.koerper.eintraege) {
    for (const v of e.vorschlaege) {
      assert.equal(typeof v.moeglich, 'boolean', `${e.eintrag} ${v.entscheidung}: moeglich fehlt`)
      assert.equal(v.moeglich, v.grund === null, `${e.eintrag} ${v.entscheidung}: grund genau dann gesetzt, wenn nicht möglich`)
      const wurzel = baue(dateien)
      const vorher = bytes(wurzel)
      const post = await bestaetige(wurzel, { eintrag: e.eintrag, entscheidung: v.entscheidung, grund, hashes: e.hashes })
      if (v.moeglich) assert.equal(post.status, 200, `${e.eintrag} ${v.entscheidung}: GET möglich, POST ${post.status} ${post.koerper.grund}`)
      else {
        assert.equal(post.status, 422, `${e.eintrag} ${v.entscheidung}: GET nicht möglich (${v.grund}), POST ${post.status}`)
        assert.equal(post.koerper.grund, v.grund, `${e.eintrag} ${v.entscheidung}: Grund GET = POST`)
        assert.ok(gleich(vorher, bytes(wurzel)), `${e.eintrag} ${v.entscheidung}: nichts geschrieben`)
      }
      ergebnisse.push({ eintrag: e.eintrag, entscheidung: v.entscheidung, moeglich: v.moeglich, grund: v.grund, status: post.status, koerper: post.koerper })
    }
  }
  return ergebnisse
}

/** Ergebnis eines Vorschlags. @returns Eintrag der Äquivalenz-Liste */
const von = (ergebnisse, eintrag, entscheidung = 'feature_abgeschlossen') => {
  const treffer = ergebnisse.find((x) => x.eintrag === eintrag && x.entscheidung === entscheidung)
  assert.ok(treffer, `${eintrag} ${entscheidung} fehlt in ${JSON.stringify(ergebnisse.map((x) => [x.eintrag, x.entscheidung]))}`)
  return treffer
}
/** true, wenn alle übrigen Vorschläge möglich sind. */
const restMoeglich = (ergebnisse, ausser) => ergebnisse.filter((x) => !ausser.some(([e, d]) => x.eintrag === e && x.entscheidung === d)).every((x) => x.moeglich)

test('Grundstand: alle Vorschläge möglich ⇒ POST 200 (beide Entscheidungen), auch mit feindlichem Grund', async () => {
  const ergebnisse = await aequivalenz(grundstand())
  assert.deepEqual(
    ergebnisse.map((x) => [x.eintrag, x.entscheidung, x.moeglich]),
    [
      ['M3/F18', 'feature_abgeschlossen', true],
      ['M3/F18', 'meilenstein_laeuft', true],
      ['M4/F20', 'feature_abgeschlossen', true],
      ['M4/F22', 'feature_abgeschlossen', true],
    ]
  )
  const feindlich = await aequivalenz(grundstand(), `## Status ABGEBROCHEN \`Status: X\` "x" ${'ä'.repeat(440)}`)
  assert.ok(feindlich.every((x) => x.status === 200))
})

test('Akte: unbekannter Status ⇒ nicht möglich ⇔ 422', async () => {
  const stand = { ...grundstand(), 'features/F20/feature.md': akte('F20', 'WARTET') }
  const e = await aequivalenz(stand)
  assert.equal(von(e, 'M4/F20').moeglich, false)
  assert.match(von(e, 'M4/F20').grund, /unbekannt/)
  assert.ok(restMoeglich(e, [['M4/F20', 'feature_abgeschlossen']]))
})

test('Akte: vorhandene Zeile „Abgenommen:“ ⇒ nicht möglich ⇔ 422', async () => {
  const e = await aequivalenz({ ...grundstand(), 'features/F20/feature.md': akte('F20', 'FEATURE_GATE', ['Abgenommen: 2026-09-14']) })
  assert.equal(von(e, 'M4/F20').moeglich, false)
  assert.match(von(e, 'M4/F20').grund, /Abgenommen/)
})

test('Akte: kein gültiges UTF-8 ⇒ nicht möglich ⇔ 422', async () => {
  const roh = Buffer.concat([Buffer.from(akte('F20', 'FEATURE_GATE'), 'utf8'), Buffer.from([0xff, 0x0a])])
  const e = await aequivalenz({ ...grundstand(), 'features/F20/feature.md': roh })
  assert.equal(von(e, 'M4/F20').moeglich, false)
  assert.match(von(e, 'M4/F20').grund, /UTF-8/)
})

test('Akte: Feature-Akte-Gate schon vorher rot (Planungszeile ungültig) ⇒ nicht möglich ⇔ 422 (Advisor A1)', async () => {
  const e = await aequivalenz({ ...grundstand(), 'features/F20/feature.md': akte('F20', 'FEATURE_GATE', ['Priorität: X']) })
  assert.equal(von(e, 'M4/F20').moeglich, false)
  assert.match(von(e, 'M4/F20').grund, /Feature-Akte-Gate/)
  assert.ok(Array.isArray(von(e, 'M4/F20').koerper.verstoesse))
})

test('Akte fehlt bei abweichender Groß-/Kleinschreibung: falls ein Vorschlag erscheint, dann nicht möglich ⇔ 422', async () => {
  const stand = grundstand()
  stand[ROADMAP_PFAD] = roadmap([meilenstein('M3', 'ABGESCHLOSSEN', ['F18']), meilenstein('M4', 'ABGESCHLOSSEN', ['F20', 'F22', 'F23', 'F7b']), meilenstein('M5', 'LAEUFT', ['F30'])])
  stand['features/F7B/feature.md'] = akte('F7B', 'FEATURE_GATE')
  const e = await aequivalenz(stand)
  // Nur auf einem Dateisystem ohne Groß-/Kleinunterscheidung liest leseAktenStatus einen Status und bietet den Vorschlag an.
  const f7 = e.find((x) => x.eintrag === 'M4/F7b' && x.entscheidung === 'feature_abgeschlossen')
  if (f7 !== undefined) {
    assert.equal(f7.moeglich, false)
    assert.match(f7.grund, /nicht gefunden/)
  }
})

test('STATUS.md: kein gültiges UTF-8 bzw. CRLF ⇒ „Feature → ABGESCHLOSSEN“ nicht möglich, „M3 → LAEUFT“ bleibt möglich', async () => {
  const basis = grundstand()
  const kaputt = await aequivalenz({ ...basis, [STATUS_PFAD]: Buffer.concat([Buffer.from(basis[STATUS_PFAD], 'utf8'), Buffer.from([0xfe])]) })
  const crlf = await aequivalenz({ ...basis, [STATUS_PFAD]: basis[STATUS_PFAD].replace(/\n/g, '\r\n') })
  for (const [e, muster] of [
    [kaputt, /UTF-8/],
    [crlf, /CRLF/],
  ]) {
    for (const id of ['M3/F18', 'M4/F20', 'M4/F22']) {
      assert.equal(von(e, id).moeglich, false)
      assert.match(von(e, id).grund, muster)
    }
    assert.equal(von(e, 'M3/F18', 'meilenstein_laeuft').moeglich, true)
  }
})

test('STATUS.md: Konvention vorhanden, 2× bzw. 0× für die ID ⇒ nicht möglich ⇔ 422', async () => {
  const basis = grundstand()
  const doppelt = await aequivalenz({ ...basis, [STATUS_PFAD]: `${basis[STATUS_PFAD]}${statusZeile('F20', 'FEATURE_GATE')}\n` })
  assert.equal(von(doppelt, 'M4/F20').moeglich, false)
  assert.match(von(doppelt, 'M4/F20').grund, /2×/)
  assert.ok(restMoeglich(doppelt, [['M4/F20', 'feature_abgeschlossen']]))
  const keine = await aequivalenz({ ...basis, [STATUS_PFAD]: basis[STATUS_PFAD].replace(statusZeile('F22', 'FEATURE_GATE'), '- F22 ohne Standardform.') })
  assert.equal(von(keine, 'M4/F22').moeglich, false)
  assert.match(von(keine, 'M4/F22').grund, /0×/)
  assert.ok(restMoeglich(keine, [['M4/F22', 'feature_abgeschlossen']]))
})

test('STATUS.md fehlt, ohne Standardform oder nennt das Feature schon als ABGESCHLOSSEN ⇒ kein Sperrgrund, 200 mit hinweis', async () => {
  const basis = grundstand()
  const faelle = [
    [{ ...basis, [STATUS_PFAD]: undefined }, /fehlt/],
    [{ ...basis, [STATUS_PFAD]: '# Status\n\nFreitext ohne Standardform.\n' }, /keine Standardform/],
    [{ ...basis, [STATUS_PFAD]: basis[STATUS_PFAD].replace(statusZeile('F20', 'FEATURE_GATE'), statusZeile('F20', 'ABGESCHLOSSEN')) }, /schon als ABGESCHLOSSEN/],
  ]
  for (const [stand, muster] of faelle) {
    const e = await aequivalenz(stand)
    assert.ok(e.every((x) => x.moeglich && x.status === 200))
    assert.match(von(e, 'M4/F20').koerper.hinweis ?? '', muster)
  }
})

test('roadmap.json: CRLF bzw. "status" vor "id" ⇒ „M3 → LAEUFT“ nicht möglich ⇔ 422 (Advisor A2)', async () => {
  const basis = grundstand()
  const crlf = await aequivalenz({ ...basis, [ROADMAP_PFAD]: basis[ROADMAP_PFAD].replace(/\n/g, '\r\n') })
  assert.equal(von(crlf, 'M3/F18', 'meilenstein_laeuft').moeglich, false)
  assert.match(von(crlf, 'M3/F18', 'meilenstein_laeuft').grund, /CRLF/)
  assert.ok(restMoeglich(crlf, [['M3/F18', 'meilenstein_laeuft']]))
  const vorId = basis[ROADMAP_PFAD].replace('      "id": "M3",\n      "titel": "M3",\n      "status": "ABGESCHLOSSEN",', '      "status": "ABGESCHLOSSEN",\n      "id": "M3",\n      "titel": "M3",')
  assert.notEqual(vorId, basis[ROADMAP_PFAD])
  const lage = await aequivalenz({ ...basis, [ROADMAP_PFAD]: vorId })
  assert.equal(von(lage, 'M3/F18', 'meilenstein_laeuft').moeglich, false)
  assert.ok(restMoeglich(lage, [['M3/F18', 'meilenstein_laeuft']]))
})

test('roadmap-ausnahmen.json: CRLF sperrt nur Einträge mit Ausnahme', async () => {
  const stand = { ...grundstand(), [AUSNAHMEN_PFAD]: ausnahmen([ausnahme('M3', 'F18'), ausnahme('M4', 'F20')]).replace(/\n/g, '\r\n') }
  const e = await aequivalenz(stand)
  for (const [id, d] of [
    ['M3/F18', 'feature_abgeschlossen'],
    ['M3/F18', 'meilenstein_laeuft'],
    ['M4/F20', 'feature_abgeschlossen'],
  ]) {
    assert.equal(von(e, id, d).moeglich, false)
    assert.match(von(e, id, d).grund, /CRLF/)
  }
  assert.equal(von(e, 'M4/F22').moeglich, true)
})

test('roadmap-ausnahmen.json: Paar über mehrere Zeilen bzw. Rundlauf scheitert ⇒ nicht möglich ⇔ 422 (Advisor A2)', async () => {
  const mehrzeilig = `    {\n      "meilenstein": "M4", "feature": "F20",\n      "grund": "${GRUND_OFFEN}"\n    }`
  const e = await aequivalenz({ ...grundstand(), [AUSNAHMEN_PFAD]: ausnahmen([ausnahme('M3', 'F18'), mehrzeilig, ausnahme('M4', 'F22')]) })
  assert.equal(von(e, 'M4/F20').moeglich, false)
  assert.match(von(e, 'M4/F20').grund, /einzeilige/)
  // F22 ist einzeilig das letzte Element, das Element davor mehrzeilig: dessen Endkomma bleibt, das JSON wird ungültig.
  assert.equal(von(e, 'M4/F22').moeglich, false)
  assert.match(von(e, 'M4/F22').grund, /roadmap-ausnahmen\.json/)
  assert.equal(von(e, 'M3/F18').moeglich, true)
})

test('R1 neu: verwaiste Ausnahme im Meilenstein ⇒ „M3 → LAEUFT“ nicht möglich ⇔ 422', async () => {
  const stand = grundstand()
  stand[ROADMAP_PFAD] = roadmap([meilenstein('M3', 'ABGESCHLOSSEN', ['F17', 'F18']), meilenstein('M4', 'ABGESCHLOSSEN', ['F20', 'F22', 'F23']), meilenstein('M5', 'LAEUFT', ['F30'])])
  stand[AUSNAHMEN_PFAD] = ausnahmen([ausnahme('M3', 'F17'), ausnahme('M3', 'F18'), ausnahme('M4', 'F20'), ausnahme('M4', 'F22')])
  stand['features/F17/feature.md'] = akte('F17', 'ABGESCHLOSSEN')
  const e = await aequivalenz(stand)
  assert.equal(von(e, 'M3/F18', 'meilenstein_laeuft').moeglich, false)
  assert.match(von(e, 'M3/F18', 'meilenstein_laeuft').grund, /Status-Regel R1/)
  assert.ok(restMoeglich(e, [['M3/F18', 'meilenstein_laeuft']]))
})

test('Sperre durch einen offenen Ablauf: GET möglich, POST 409 mit workflowId, nichts geschrieben (A1)', async () => {
  const sperre = { workflows: async () => [{ workflowId: 'wf-f20', auftragId: 'a1', status: 'LAEUFT' }], auftraege: async () => [{ auftragId: 'a1', feature_ref: 'F20' }] }
  const wurzel = baue(grundstand())
  const get = await liste(wurzel, sperre)
  const f20 = get.koerper.eintraege.find((x) => x.eintrag === 'M4/F20')
  assert.deepEqual(
    f20.vorschlaege.map((v) => [v.entscheidung, v.moeglich, v.grund]),
    [['feature_abgeschlossen', true, null]]
  )
  const vorher = bytes(wurzel)
  const post = await bestaetige(wurzel, { eintrag: 'M4/F20', entscheidung: 'feature_abgeschlossen', grund: 'Test', hashes: f20.hashes }, sperre)
  assert.equal(post.status, 409)
  assert.equal(post.koerper.workflowId, 'wf-f20')
  assert.ok(gleich(vorher, bytes(wurzel)))
})
