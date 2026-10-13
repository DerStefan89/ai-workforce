/**
 * Datei: scripts/leitstand/routen-faehigkeiten.test.mjs
 *
 * Zweck: Servertests der Fähigkeiten-Routen (F45 F-1) gegen eine echte erzeugeRequestHandler-Instanz mit
 * Wegwerf-Projekt und Wegwerf-Pfad für faehigkeiten.lokal.json:
 * - GET /api/faehigkeiten: Projekt-Agent qa nach Inhalt freigegeben (Katalog), nicht eingeschaltet; nach dem
 *   Einschalten aktiv; Katalog-MCP abschaltbar;
 * - POST /api/faehigkeiten/aktivierung: Opt-in, Formfehler 400, unbekannt 404;
 * - POST /api/faehigkeiten/freigabe: Hash-Wechsel seit der Anzeige → 409, sonst gesetzt;
 * - kaputte Datei → GET zeigt ungueltig, POST 409, Datei unverändert;
 * - aktiver Lauf → POST 409 (E-F45-8); Instanz ohne Pfad → POST 500.
 * F45 F-2a: Status mit beschreibung/pfad/lauf_aktiv/fremd_geaendert; Wächter der lokalen Datei (F-1055 (1)); Bindung der
 * Projekt-Fähigkeiten an die Anzeige (F-1054 (1)) in Empfehlung, bereiteEmpfehlungFuerStartVor und im Ordner des Laufs
 * (loeseAusfuehrungsEingabenAuf, konflikt, Advisor A4); neue Gründe (F-1054 (2)); B8 (F-1054 (7)) — gegen eine
 * Wegwerf-Installationswurzel, unabhängig von dem, was auf dem Rechner installiert ist.
 *
 * F45 F-2b-2c (F-1061 (1)): bekannter Stand über Neustarts (faehigkeiten.stand.json neben der lokalen Datei) — Neustart nach
 * Fremdänderung → Band + Sperre, ohne Änderung frei, leerer/kaputter/fremder Stand bei vorhandener Datei gesperrt.
 *
 * Wird aufgerufen von: npm run test (node --test)
 *
 * Wichtig: Nie ~/.ai-workforce — jede Instanz bekommt einen Pfad in os.tmpdir().
 */

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, describe, it } from 'node:test'
import { hashLokaleDatei, katalogFreigaben, ladeFaehigkeitenLokal } from '../../src/faehigkeiten/index.ts'
import { ladeArtefaktVersion, registriereKernArtefakt } from '../../src/lineage-registry/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../../src/startvorlage/index.ts'
import { registriereWorkflow } from '../../src/workflow/index.ts'
import { empfehlungIdsFuerFreigabe as empfehlungIdsAus } from '../../public/leitstand/empfehlung-anzeige.js'
import { raeumeVerzeichnis } from '../_aufraeumen.ts'
import { bereiteEmpfehlungFuerStartVor, ermittleAusfuehrungsEmpfehlung, erzeugeRequestHandler, loeseAusfuehrungsEingabenAuf, loeseSchrittEingabenAuf } from '../leitstand-server.mjs'
import { standPfadFuer } from '../../src/faehigkeiten/stand.ts'
import { baueFaehigkeitenStatus, erzeugeLokalWaechter, fremdGeaendert } from './routen-faehigkeiten.mjs'

const INSTALLATION = join(import.meta.dirname, '..', '..')
const SKELETT = join(INSTALLATION, 'vorlagen', 'projekt-skelett', '.claude')
const aufraeumen = []
after(() => {
  for (const pfad of aufraeumen) raeumeVerzeichnis(pfad)
})

/** git für Testaufbauten. */
function git(cwd, argumente) {
  return execFileSync('git', argumente, { cwd, encoding: 'utf8' })
}

/** Projekt mit Skelett-Agent qa und Skill ponytail; Pfad der lokalen Datei in tmp. */
function baueUmgebung() {
  const basis = join(tmpdir(), `fk-srv-${randomUUID().slice(0, 8)}`)
  aufraeumen.push(basis)
  const repoWurzel = join(basis, 'projekt')
  mkdirSync(join(repoWurzel, '.claude', 'agents'), { recursive: true })
  mkdirSync(join(repoWurzel, '.claude', 'skills', 'ponytail'), { recursive: true })
  copyFileSync(join(SKELETT, 'agents', 'qa.md'), join(repoWurzel, '.claude', 'agents', 'qa.md'))
  for (const d of ['SKILL.md', 'LICENSE']) copyFileSync(join(SKELETT, 'skills', 'ponytail', d), join(repoWurzel, '.claude', 'skills', 'ponytail', d))
  writeFileSync(join(repoWurzel, '.claude', 'settings.json'), '{}\n')
  git(repoWurzel, ['init', '--quiet'])
  return { basis, repoWurzel, lokalPfad: join(basis, 'ai-workforce-home', 'faehigkeiten.lokal.json'), basisVerzeichnis: join(basis, 'kontrollzustand') }
}

/** Startet eine Instanz (projektId hb-test). */
async function starte(u, zusatz = {}) {
  const server = createServer(
    erzeugeRequestHandler({
      basisVerzeichnis: u.basisVerzeichnis,
      repoWurzel: u.repoWurzel,
      startvorlagePfad: join(INSTALLATION, 'startvorlagen', 'ai-workforce.json'),
      installWurzel: INSTALLATION,
      projektId: 'hb-test',
      faehigkeitenLokalPfad: u.lokalPfad,
      ...zusatz,
    })
  )
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const basisUrl = `http://127.0.0.1:${server.address().port}`
  const holen = async (pfad) => {
    const antwort = await fetch(`${basisUrl}${pfad}`)
    return { status: antwort.status, koerper: await antwort.json() }
  }
  const senden = async (pfad, koerper) => {
    const antwort = await fetch(`${basisUrl}${pfad}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(koerper) })
    return { status: antwort.status, koerper: await antwort.json() }
  }
  return { holen, senden, schliessen: () => new Promise((r) => server.close(r)) }
}

describe('Fähigkeiten-Routen (F45 F-1)', () => {
  it('GET zeigt Freigabe nach Inhalt, Opt-in schaltet ein, Katalog-MCP abschaltbar, Formfehler', async () => {
    const u = baueUmgebung()
    const s = await starte(u)
    try {
      const vorher = await s.holen('/api/faehigkeiten')
      assert.equal(vorher.status, 200)
      assert.equal(vorher.koerper.projekt_id, 'hb-test')
      assert.deepEqual(vorher.koerper.lokale_datei, { zustand: 'fehlt', pfad: u.lokalPfad, hash: 'fehlt', fremd_geaendert: null })
      assert.deepEqual(vorher.koerper.lauf_aktiv, { aktiv: false })
      const qa = vorher.koerper.eintraege.find((e) => e.id === 'agent:qa')
      assert.equal(qa.freigabe, 'katalog')
      assert.equal(qa.aktiv, false)
      assert.match(qa.hash, /^[0-9a-f]{64}$/)
      // F45 F-2a: Kurzbeschreibung (Frontmatter description) und Ort im Projektordner; Katalog-Einträge mit Schalterstellung.
      assert.ok(typeof qa.beschreibung === 'string' && qa.beschreibung.length > 0)
      assert.equal(qa.pfad, '.claude/agents/qa.md')
      // Render-Nachweis: description in YAML-Blockform (description: >) zeigt den Text, nicht das Zeichen.
      assert.match(vorher.koerper.eintraege.find((e) => e.id === 'skill:ponytail').beschreibung, /^Forces the laziest solution/)
      const mcp = vorher.koerper.eintraege.find((e) => e.id === 'playwright-mcp')
      assert.equal(mcp.eingeschaltet, true)
      assert.ok(typeof mcp.beschreibung === 'string' && mcp.beschreibung.length > 0)
      assert.ok(vorher.koerper.eintraege.some((e) => e.quelle === 'katalog' && e.typ === 'mcp'), 'Katalog-MCPs sichtbar')

      const ein = await s.senden('/api/faehigkeiten/aktivierung', { eintrag: 'agent:qa', aktiv: true })
      assert.equal(ein.status, 200)
      assert.deepEqual(ein.koerper.an, ['agent:qa'])
      assert.equal((await s.holen('/api/faehigkeiten')).koerper.eintraege.find((e) => e.id === 'agent:qa').aktiv, true)
      const pw = await s.senden('/api/faehigkeiten/aktivierung', { eintrag: 'playwright-mcp', aktiv: false })
      assert.deepEqual(pw.koerper.aus, ['playwright-mcp'])
      assert.deepEqual(JSON.parse(readFileSync(u.lokalPfad, 'utf8')).projekte['hb-test'], { an: ['agent:qa'], aus: ['playwright-mcp'] })

      assert.equal((await s.senden('/api/faehigkeiten/aktivierung', { eintrag: 'qa', aktiv: true })).status, 400, 'interner Agent nur als agent:<name>')
      assert.equal((await s.senden('/api/faehigkeiten/aktivierung', { eintrag: 'claude-code', aktiv: false })).status, 400, 'worker nicht schaltbar')
      assert.equal((await s.senden('/api/faehigkeiten/aktivierung', { eintrag: 'gibt-es-nicht', aktiv: false })).status, 404)
      // QA 2: Einschalten nur für vorhandene Einträge; falsche Schreibweise nennt den vorhandenen Namen; Ausschalten immer.
      const gross = await s.senden('/api/faehigkeiten/aktivierung', { eintrag: 'agent:QA', aktiv: true })
      assert.equal(gross.status, 404)
      assert.match(gross.koerper.grund, /vermutlich 'agent:qa'/)
      assert.equal((await s.senden('/api/faehigkeiten/aktivierung', { eintrag: 'agent:gibtsnicht', aktiv: true })).status, 404)
      assert.equal((await s.senden('/api/faehigkeiten/aktivierung', { eintrag: 'agent:gibtsnicht', aktiv: false })).status, 200)
      assert.equal((await s.senden('/api/faehigkeiten/aktivierung', { eintrag: 'agent:qa', aktiv: 'ja' })).status, 400)
      assert.equal((await s.senden('/api/faehigkeiten/aktivierung', { eintrag: 'agent:qa', aktiv: true, projekt_id: 'fremd' })).status, 400, 'projekt_id nie aus dem Körper')
    } finally {
      await s.schliessen()
    }
  })

  it('Freigabe nach Inhalt: Hash-Wechsel seit der Anzeige → 409, passender Hash → gesetzt', async () => {
    const u = baueUmgebung()
    writeFileSync(join(u.repoWurzel, '.claude', 'agents', 'eigener.md'), '---\nname: eigener\ndescription: x\ntools: Read\n---\nText\n')
    const s = await starte(u)
    try {
      const angezeigt = (await s.holen('/api/faehigkeiten')).koerper.eintraege.find((e) => e.id === 'agent:eigener')
      assert.equal(angezeigt.freigabe, 'keine')
      writeFileSync(join(u.repoWurzel, '.claude', 'agents', 'eigener.md'), '---\nname: eigener\ndescription: x\ntools: Read\n---\nGeändert\n')
      const rot = await s.senden('/api/faehigkeiten/freigabe', { eintrag: 'agent:eigener', hash: angezeigt.hash })
      assert.equal(rot.status, 409)
      assert.match(rot.koerper.grund, /seit der Anzeige geändert/)
      assert.equal(existsSync(u.lokalPfad), false, 'nichts geschrieben')
      const neu = (await s.holen('/api/faehigkeiten')).koerper.eintraege.find((e) => e.id === 'agent:eigener')
      const gruen = await s.senden('/api/faehigkeiten/freigabe', { eintrag: 'agent:eigener', hash: neu.hash })
      assert.equal(gruen.status, 200)
      assert.deepEqual(gruen.koerper.inhalt_freigaben, { 'agent:eigener': neu.hash })
      assert.equal((await s.holen('/api/faehigkeiten')).koerper.eintraege.find((e) => e.id === 'agent:eigener').freigabe, 'projekt')
      assert.equal((await s.senden('/api/faehigkeiten/freigabe', { eintrag: 'agent:fehlt', hash: neu.hash })).status, 404)
    } finally {
      await s.schliessen()
    }
  })

  it('zwei Projekte, eine Datei: Einstellungen getrennt je Projekt-id', async () => {
    const u = baueUmgebung()
    // Wie im echten Server teilen sich die Projektinstanzen EINEN Wächter (sie teilen die Datei, F-1061 (3)).
    const waechter = erzeugeLokalWaechter(u.lokalPfad)
    const a = await starte(u, { faehigkeitenLokalWaechter: waechter })
    const b = await starte(u, { projektId: 'anderes', faehigkeitenLokalWaechter: waechter })
    try {
      assert.equal((await a.senden('/api/faehigkeiten/aktivierung', { eintrag: 'agent:qa', aktiv: true })).status, 200)
      assert.equal((await b.holen('/api/faehigkeiten')).koerper.eintraege.find((e) => e.id === 'agent:qa').eingeschaltet, false)
      assert.equal((await b.senden('/api/faehigkeiten/aktivierung', { eintrag: 'playwright-mcp', aktiv: false })).status, 200)
      assert.deepEqual(JSON.parse(readFileSync(u.lokalPfad, 'utf8')).projekte, { 'hb-test': { an: ['agent:qa'] }, anderes: { aus: ['playwright-mcp'] } })
    } finally {
      await a.schliessen()
      await b.schliessen()
    }
  })

  it('QA 5: letzter_lauf eindeutig — aktiv/benutzt, nicht aktiv, nicht im Lauf, ohne Erfassung', () => {
    const projekt = { eintraege: [{ schluessel: 'agent:qa', typ: 'agent', name: 'qa', pfad: 'agents/qa.md', hash: 'a'.repeat(64), freigabe: 'katalog', katalog_hash: 'a'.repeat(64), eingeschaltet: true, aktiv: true, grund: null }], agentNamen: ['qa'], hindernis: null }
    const lokal = { zustand: 'fehlt', daten: { faehigkeiten_lokal_schema: 'v0', projekte: {} } }
    const status = (daten) => baueFaehigkeitenStatus({ projektId: 'p', lokal, katalog: [], projekt, letzterLauf: daten === undefined ? null : { laufId: 'l', daten }, kennung: () => 'x@y' }).eintraege[0].letzter_lauf
    const feld = (eintraege) => ({ faehigkeiten_im_lauf: { eintraege, fremde_aufrufe: [] } })
    assert.deepEqual(status(feld([{ id: 'agent:qa', aktiv: true, aufrufe: 2, fehlgeschlagen: 1 }])), { im_lauf: 'aktiv', benutzt: true, aufrufe: 2, fehler: 1 })
    assert.deepEqual(status(feld([{ id: 'agent:qa', aktiv: true, aufrufe: 1, fehlgeschlagen: 1 }])), { im_lauf: 'aktiv', benutzt: false, aufrufe: 1, fehler: 1 })
    assert.deepEqual(status(feld([{ id: 'agent:qa', aktiv: false, aufrufe: 0, fehlgeschlagen: 0 }])), { im_lauf: 'nicht_aktiv', benutzt: false, aufrufe: 0, fehler: 0 })
    assert.deepEqual(status(feld([])), { im_lauf: 'nicht_im_lauf', benutzt: false })
    assert.deepEqual(status({}), { im_lauf: 'ohne_erfassung', benutzt: null })
    assert.deepEqual(status(undefined), { im_lauf: 'ohne_erfassung', benutzt: null })
  })

  it('kaputte Datei: GET zeigt ungueltig mit Grund, POST 409, Datei unverändert (E-F45-7)', async () => {
    const u = baueUmgebung()
    mkdirSync(join(u.lokalPfad, '..'), { recursive: true })
    writeFileSync(u.lokalPfad, '{ kaputt')
    const s = await starte(u)
    try {
      const get = await s.holen('/api/faehigkeiten')
      assert.equal(get.koerper.lokale_datei.zustand, 'ungueltig')
      assert.match(get.koerper.lokale_datei.grund, /in allen Projekten/)
      const post = await s.senden('/api/faehigkeiten/aktivierung', { eintrag: 'agent:qa', aktiv: true })
      assert.equal(post.status, 409)
      assert.equal(readFileSync(u.lokalPfad, 'utf8'), '{ kaputt')
    } finally {
      await s.schliessen()
    }
  })

  it('aktiver Lauf → POST 409; Instanz ohne Pfad → POST 500; falsche Methode 405', async () => {
    const u = baueUmgebung()
    const gesperrt = await starte(u, { globalerLaufZustand: { aktiv: true, laufId: 'lauf-x', abortController: null } })
    try {
      assert.equal((await gesperrt.senden('/api/faehigkeiten/aktivierung', { eintrag: 'agent:qa', aktiv: true })).status, 409)
      const get = await gesperrt.holen('/api/faehigkeiten')
      assert.equal(get.status, 200, 'GET bleibt lesbar')
      // F45 F-2a: die Oberfläche sperrt die Schalter vorab mit Grund.
      assert.equal(get.koerper.lauf_aktiv.aktiv, true)
      assert.match(get.koerper.lauf_aktiv.grund, /lauf-x/)
    } finally {
      await gesperrt.schliessen()
    }
    const ohne = await starte(u, { faehigkeitenLokalPfad: null })
    try {
      const post = await ohne.senden('/api/faehigkeiten/aktivierung', { eintrag: 'agent:qa', aktiv: true })
      assert.equal(post.status, 500)
      assert.equal((await ohne.senden('/api/faehigkeiten', {})).status, 405)
    } finally {
      await ohne.schliessen()
    }
  })
})

describe('Wächter der lokalen Datei (F45 F-2a, F-1055 (1))', () => {
  it('erzeugeLokalWaechter: Serverstart bekannt, Route übernimmt den geschriebenen Hash, Fremdänderung gemeldet', () => {
    const u = baueUmgebung()
    mkdirSync(join(u.lokalPfad, '..'), { recursive: true })
    let uhr = 0
    const jetzt = () => `2026-10-12T10:00:0${uhr++}.000Z`
    const w = erzeugeLokalWaechter(u.lokalPfad, jetzt)
    assert.deepEqual(w.bekannt(), { hash: 'fehlt', zeitpunkt: '2026-10-12T10:00:00.000Z', quelle: 'serverstart' })
    assert.equal(fremdGeaendert(w, u.lokalPfad), null, 'fehlt = bekannt')
    writeFileSync(u.lokalPfad, '{"faehigkeiten_lokal_schema":"v0","projekte":{}}\n')
    const fremd = fremdGeaendert(w, u.lokalPfad)
    assert.equal(fremd.quelle, 'serverstart')
    assert.equal(fremd.bekannt_seit, '2026-10-12T10:00:00.000Z')
    assert.match(fremd.geaendert_am, /^\d{4}-\d{2}-\d{2}T/)
    w.nachRoute(hashLokaleDatei(u.lokalPfad))
    assert.equal(fremdGeaendert(w, u.lokalPfad), null)
    assert.equal(w.bekannt().quelle, 'route')
    rmSync(u.lokalPfad)
    assert.equal(fremdGeaendert(w, u.lokalPfad).geaendert_am, null, 'gelöscht: sichtbar ohne Zeitpunkt')
    assert.equal(fremdGeaendert(null, u.lokalPfad), null, 'ohne Wächter nichts')
  })

  it('Server: Route-Schreiben bekannt; Handänderung → fremd_geaendert; POST mit veraltetem stand → 409, mit angezeigtem stand übernommen (QA 1)', async () => {
    const u = baueUmgebung()
    const s = await starte(u)
    try {
      const anfang = (await s.holen('/api/faehigkeiten')).koerper.lokale_datei.hash
      assert.equal(anfang, 'fehlt')
      assert.equal((await s.senden('/api/faehigkeiten/aktivierung', { eintrag: 'agent:qa', aktiv: true, stand: anfang })).status, 200)
      const gesehen = (await s.holen('/api/faehigkeiten')).koerper.lokale_datei
      assert.equal(gesehen.fremd_geaendert, null, 'Route-Schreiben gilt als bekannt')
      // Ein „nach Laufende weiterlebender Prozess“ schreibt die Datei direkt (F-1055 (1)) — NACH dem Laden der Seite.
      writeFileSync(u.lokalPfad, JSON.stringify({ faehigkeiten_lokal_schema: 'v0', projekte: { 'hb-test': { an: ['agent:qa', 'skill:ponytail'] } } }))
      const veraltet = await s.senden('/api/faehigkeiten/aktivierung', { eintrag: 'agent:qa', aktiv: false, stand: gesehen.hash })
      assert.equal(veraltet.status, 409, 'kein Klick übernimmt eine ungesehene Fremdänderung')
      assert.match(veraltet.koerper.grund, /seit der Anzeige geändert/)
      assert.match(readFileSync(u.lokalPfad, 'utf8'), /skill:ponytail/, 'nichts geschrieben')
      const neu = (await s.holen('/api/faehigkeiten')).koerper.lokale_datei
      assert.equal(neu.fremd_geaendert.quelle, 'route')
      assert.match(neu.fremd_geaendert.geaendert_am, /^\d{4}-/)
      // F-1061 (3) rot: auch mit dem angezeigten Stand übernimmt KEIN Schreiben die Fremdänderung (auch nicht ohne stand).
      const ohneBestaetigung = await s.senden('/api/faehigkeiten/aktivierung', { eintrag: 'skill:ponytail', aktiv: false, stand: neu.hash })
      assert.equal(ohneBestaetigung.status, 409)
      assert.match(ohneBestaetigung.koerper.grund, /noch nicht bestätigt/)
      assert.equal((await s.senden('/api/faehigkeiten/aktivierung', { eintrag: 'skill:ponytail', aktiv: false })).status, 409)
      assert.equal((await s.senden('/api/faehigkeiten/bestaetigung', { stand: gesehen.hash })).status, 409, 'Bestätigung nur für den angezeigten, aktuellen Stand')
      assert.equal((await s.senden('/api/faehigkeiten/bestaetigung', { stand: 'kaputt' })).status, 400)
      // grün: „Datei geprüft – Stand übernehmen“ → bekannt; danach schreiben die Routen wieder.
      const bestaetigt = await s.senden('/api/faehigkeiten/bestaetigung', { stand: neu.hash })
      assert.equal(bestaetigt.status, 200)
      assert.equal(bestaetigt.koerper.bekannt.quelle, 'bestaetigt')
      assert.equal((await s.holen('/api/faehigkeiten')).koerper.lokale_datei.fremd_geaendert, null)
      assert.equal((await s.senden('/api/faehigkeiten/bestaetigung', { stand: neu.hash })).status, 409, 'nichts mehr zu bestätigen')
      assert.equal((await s.senden('/api/faehigkeiten/aktivierung', { eintrag: 'skill:ponytail', aktiv: false, stand: neu.hash })).status, 200)
      assert.equal((await s.senden('/api/faehigkeiten/aktivierung', { eintrag: 'agent:qa', aktiv: true, stand: 'kaputt' })).status, 400)
      assert.equal((await s.senden('/api/faehigkeiten/freigabe', { eintrag: 'agent:qa', hash: 'a'.repeat(64), stand: 'b'.repeat(64) })).status, 409)
      // Ungültige Datei von außen: Bestätigung abgelehnt (erst reparieren, E-F45-7).
      writeFileSync(u.lokalPfad, '{ kaputt')
      const kaputt = (await s.holen('/api/faehigkeiten')).koerper.lokale_datei
      const abgelehnt = await s.senden('/api/faehigkeiten/bestaetigung', { stand: kaputt.hash })
      assert.equal(abgelehnt.status, 409)
      assert.match(abgelehnt.koerper.grund, /erst reparieren/)
    } finally {
      await s.schliessen()
    }
  })

  it('F-1061 (3): Bestätigung während eines Laufs → 409 (Laufsperre); falsche Methode 405', async () => {
    const u = baueUmgebung()
    const s = await starte(u, { globalerLaufZustand: { aktiv: true, laufId: 'lauf-x', abortController: null } })
    try {
      assert.equal((await s.senden('/api/faehigkeiten/bestaetigung', { stand: 'fehlt' })).status, 409)
      assert.equal((await s.holen('/api/faehigkeiten/bestaetigung')).status, 405)
    } finally {
      await s.schliessen()
    }
  })
})

/**
 * Wegwerf-Installationswurzel für die Bindung (F45 F-2a): ein lokaler MCP mit installation (command node → verfügbar,
 * anwendbar bei bugfix + package.json) und der interne Agent qa (Katalog-Datei = Skelett-qa) — unabhängig davon, was auf
 * dem Rechner installiert ist.
 */
function baueInstallation(basis) {
  const install = join(basis, 'installation')
  mkdirSync(join(install, '.claude', 'agents'), { recursive: true })
  copyFileSync(join(SKELETT, 'agents', 'qa.md'), join(install, '.claude', 'agents', 'qa.md'))
  const katalog = {
    ressourcen_schema: 'v0',
    ressourcen: [
      { id: 'bind-mcp', typ: 'extern', name: 'Bind MCP', beschreibung: 'Fixture.', unterart: 'mcp', wirkung: 'lokal', capabilities: ['GATE'], freigabe: 'FREIGEGEBEN', herkunft: { art: 'extern', url: 'https://example.invalid/bind' }, installation: { version: '1.0.0', mcp_server: { command: 'node', args: ['s.js'] }, werkzeuge: ['mcp__bind-mcp__lesen'] }, anwendbar_wenn: { task_typen_any: ['bugfix'], pfad_muster_any: ['package.json'] } },
      { id: 'qa', typ: 'agent', capabilities: ['TEST_DESIGN'], freigabe: 'FREIGEGEBEN', herkunft: { art: 'agent', pfad: '.claude/agents/qa.md' }, anwendbar_wenn: { task_typen_any: ['bugfix'] } },
      { id: 'ponytail', typ: 'skill', capabilities: ['CODE_WRITE'], freigabe: 'FREIGEGEBEN', herkunft: { art: 'skill', pfad: '.claude/skills/ponytail' }, anwendbar_wenn: { task_typen_any: ['bugfix'] } },
    ],
  }
  writeFileSync(join(install, 'ressourcen.json'), `${JSON.stringify(katalog, null, 2)}\n`)
  return install
}

describe('Bindung der Projekt-Fähigkeiten an die Anzeige (F45 F-2a, F-1054 (1)/(2)/(7))', () => {
  const STARTVORLAGE = join(INSTALLATION, 'startvorlagen', 'ai-workforce.json')
  const vorlage = ladeStartvorlage(STARTVORLAGE)
  const werkzeugNamen = [...new Set(vorlage.werkzeugsaetze.schreibend.erlaubte_werkzeuge.map((r) => r.split('(')[0]))]
  const zusatz = (an, aus = [], inhalt_freigaben = {}) => ({ aus, faehigkeiten: { einstellungen: { an, aus, inhalt_freigaben }, werkzeugNamen } })

  /** Projekt mit package.json im Index und Router-Klassifikation bugfix für den Auftrag. */
  function umgebung() {
    const u = baueUmgebung()
    writeFileSync(join(u.repoWurzel, 'package.json'), '{}\n')
    git(u.repoWurzel, ['add', '-A'])
    const install = baueInstallation(u.basis)
    const ladeOptionen = { basisVerzeichnis: u.basisVerzeichnis, schreiber: () => {} }
    const auftragId = `bind-${randomUUID().slice(0, 8)}`
    const klassifikation = { kontrolltiefe: 'standard', risikoklasse: 'niedrig', task_typen: ['bugfix'], rueckfragen: [], begruendung: 'Test.' }
    registriereKernArtefakt(`router-${auftragId}`, leiteProfilReferenzAb(vorlage), { erzeuger: 'kern', schritt: 'router-lauf' }, { router_ergebnis_schema: 'v0', auftrag_id: auftragId, lauf_id: 'test', worker: 'claude-code', klassifikation, vorlage: 'standard', beobachtung: null, erstellt_am: new Date().toISOString() }, [], ladeOptionen)
    return { ...u, install, ladeOptionen, auftragId }
  }
  const empfehlung = (u, z) => ermittleAusfuehrungsEmpfehlung(u.auftragId, u.repoWurzel, u.install, STARTVORLAGE, u.ladeOptionen, z)
  const bereite = (u, ids, z) => bereiteEmpfehlungFuerStartVor(ids, u.auftragId, u.repoWurzel, u.install, STARTVORLAGE, u.ladeOptionen, z)

  it('Anzeige: projektFaehigkeiten mit Kennung, Gründe aus dem Projektstand; ohne faehigkeiten bitgleich', () => {
    const u = umgebung()
    const ohne = empfehlung(u, {})
    assert.equal(ohne.ok, true)
    assert.equal('projektFaehigkeiten' in ohne.empfehlung, false, 'ohne zusatz.faehigkeiten kein Feld')
    assert.match(ohne.empfehlung.passtNichtImLauf.find((e) => e.id === 'qa').grund, /je Projekt einschalten/)
    const aus = empfehlung(u, zusatz([]))
    assert.deepEqual(aus.empfehlung.projektFaehigkeiten, [])
    assert.equal(aus.empfehlung.passtNichtImLauf.find((e) => e.id === 'qa').grund, 'aus — je Projekt einschalten (Seite Workforce)')
    const an = empfehlung(u, zusatz(['agent:qa']))
    const qa = an.empfehlung.projektFaehigkeiten.find((e) => e.id === 'agent:qa')
    assert.equal(qa.aktiv, true)
    assert.match(qa.kennung, /^agent:qa@[0-9a-f]{64}$/)
    assert.equal(an.empfehlung.passtNichtImLauf.find((e) => e.id === 'qa'), undefined, 'aktiv → läuft mit, nicht „Passt, nicht im Lauf“')
    assert.deepEqual(an.projektKennungen, [qa.kennung])
  })

  it('Start: angezeigt = beim Start → ok; fehlt, anderer Hash, zusätzlich → „Anzeige veraltet“', () => {
    const u = umgebung()
    const z = zusatz(['agent:qa'])
    const anzeige = empfehlung(u, z)
    const katalogIds = anzeige.empfehlung.wirdGenutzt.map((e) => e.empfehlungId)
    assert.deepEqual(katalogIds.map((id) => id.split('@')[0]), ['bind-mcp'])
    const kennung = anzeige.projektKennungen[0]
    const ok = bereite(u, [...katalogIds, kennung], z)
    assert.equal(ok.ok, true, ok.grund)
    assert.deepEqual(ok.projektKennungen, [kennung])
    for (const ids of [katalogIds, [...katalogIds, `agent:qa@${'0'.repeat(64)}`], [...katalogIds, kennung, `skill:ponytail@${'1'.repeat(64)}`]]) {
      const rot = bereite(u, ids, z)
      assert.equal(rot.ok, false)
      assert.match(rot.grund, /^Anzeige veraltet: Projekt-Fähigkeiten/)
    }
    // Ohne Projektstand (Aufrufer ohne zusatz.faehigkeiten) zählt jede Projekt-Kennung als Abweichung.
    assert.equal(bereite(u, [...katalogIds, kennung], { aus: [] }).ok, false)
  })

  it('B8: aus nach der Anzeige geändert → Start abgebrochen (Katalog-Vergleich)', () => {
    const u = umgebung()
    const katalogIds = empfehlung(u, zusatz([])).empfehlung.wirdGenutzt.map((e) => e.empfehlungId)
    assert.equal(katalogIds.length, 1)
    const rot = bereite(u, katalogIds, zusatz([], ['bind-mcp']))
    assert.equal(rot.ok, false)
    assert.match(rot.grund, /Katalog-Empfehlung hat sich seit der Anzeige geändert/)
  })

  it('Ordner des Laufs: Kennungen weichen ab → konflikt (409 im Workflow); ohne angezeigte Kennungen → abgelehnt (Advisor A4)', () => {
    const u = umgebung()
    const lokalPfad = join(u.basis, 'lokal.json')
    writeFileSync(lokalPfad, JSON.stringify({ faehigkeiten_lokal_schema: 'v0', projekte: { 'hb-test': { an: ['agent:qa'] } } }))
    const roh = { rolle: 'ausfuehrung', anfragen: [], budget: vorlage.standardBudget, aufrufEingaben: { modell: 'claude-sonnet-5' }, auftragId: u.auftragId }
    const kontext = (angezeigt) => ({ lokal: ladeFaehigkeitenLokal(lokalPfad), lokalPfad, projektId: 'hb-test', katalog: katalogFreigaben(JSON.parse(readFileSync(join(u.install, 'ressourcen.json'), 'utf8')).ressourcen, u.install), deaktiviert: [], ...(angezeigt !== undefined ? { angezeigteProjektKennungen: angezeigt } : {}) })
    const loese = (angezeigt) => loeseAusfuehrungsEingabenAuf(roh, 'schreibend', 'AUFTRAG', vorlage, u.repoWurzel, { leseAusfuehrungsVorbedingung: () => ({ ok: true }), installWurzel: u.install, faehigkeitenKontext: kontext(angezeigt) })
    const kennung = empfehlung(u, zusatz(['agent:qa'])).projektKennungen[0]
    assert.equal(loese([kennung]).ok, true)
    const rot = loese([])
    assert.equal(rot.ok, false)
    assert.equal(rot.konflikt, true)
    assert.match(rot.grund, /weichen von der Anzeige ab/)
    // Inhalt im Ordner des Laufs nach der Anzeige geändert (Arbeitsordner trägt anderen Stand): Kennung weicht ab.
    writeFileSync(join(u.repoWurzel, '.claude', 'agents', 'qa.md'), `${readFileSync(join(u.repoWurzel, '.claude', 'agents', 'qa.md'), 'utf8')}\n`)
    writeFileSync(lokalPfad, JSON.stringify({ faehigkeiten_lokal_schema: 'v0', projekte: { 'hb-test': { an: ['agent:qa'], inhalt_freigaben: { 'agent:qa': createHash('sha256').update(readFileSync(join(u.repoWurzel, '.claude', 'agents', 'qa.md'))).digest('hex') } } } }))
    const anderer = loese([kennung])
    assert.equal(anderer.konflikt, true)
    const ohne = loese(undefined)
    assert.equal(ohne.ok, false)
    assert.match(ohne.grund, /angezeigte Projekt-Kennungen fehlen/)
  })
})

describe('Bindung über HTTP: Freigabe-Vorprüfung, Workflow-Start, POST /api/laeufe (F45 F-2a, QA 3, Code-Review 2)', () => {
  it('Projekt-Kennung fehlt → 409 ohne Festhalten; angezeigt = Start → 202 mit Agent im Lauf; eingeschaltet, aber nicht aktiv → 409; POST /api/laeufe → 400', async () => {
    const u = baueUmgebung()
    writeFileSync(join(u.repoWurzel, 'package.json'), '{}\n')
    git(u.repoWurzel, ['add', '-A'])
    // Ausführung nie auf master (Vorbedingung schreibender Läufe).
    git(u.repoWurzel, ['checkout', '-q', '-b', 'arbeit'])
    // Sauberer Arbeitsbaum (Vorbedingung schreibender Läufe) — nur im Wegwerf-Repo unter tmp.
    git(u.repoWurzel, ['-c', 'user.email=t@example.invalid', '-c', 'user.name=Test', 'commit', '-q', '-m', 'init'])
    const install = baueInstallation(u.basis)
    const vorlageEcht = ladeStartvorlage(join(INSTALLATION, 'startvorlagen', 'ai-workforce.json'))
    const startvorlagePfad = join(u.basis, 'startvorlage.json')
    writeFileSync(startvorlagePfad, JSON.stringify({ ...vorlageEcht, pruefbefehl: [process.execPath, '-e', '0'] }, null, 2))
    const profilReferenz = leiteProfilReferenzAb(ladeStartvorlage(startvorlagePfad))
    const ladeOptionen = { basisVerzeichnis: u.basisVerzeichnis, schreiber: () => {} }
    mkdirSync(join(u.lokalPfad, '..'), { recursive: true })
    writeFileSync(u.lokalPfad, JSON.stringify({ faehigkeiten_lokal_schema: 'v0', projekte: { 'hb-test': { an: ['agent:qa'] } } }))
    const gesehen = []
    const fuehreAufgabeDurchFn = async (_laufId, _p, eingaben) => {
      gesehen.push(eingaben)
      return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
    }
    const server = createServer(erzeugeRequestHandler({ basisVerzeichnis: u.basisVerzeichnis, repoWurzel: u.repoWurzel, installWurzel: install, startvorlagePfad, projektId: 'hb-test', faehigkeitenLokalPfad: u.lokalPfad, fuehreAufgabeDurchFn }))
    await new Promise((r) => server.listen(0, '127.0.0.1', r))
    const basis = `http://127.0.0.1:${server.address().port}`
    const post = async (pfad, koerper) => {
      const a = await fetch(`${basis}${pfad}`, { method: 'POST', body: JSON.stringify(koerper) })
      return { status: a.status, koerper: await a.json().catch(() => ({})) }
    }
    try {
      const { auftragId } = (await post('/api/auftraege', { titel: 'Bindung', auftragstext: 'Test.' })).koerper
      const klassifikation = { kontrolltiefe: 'standard', risikoklasse: 'niedrig', task_typen: ['bugfix'], rueckfragen: [], begruendung: 'Test.' }
      registriereKernArtefakt(`router-${auftragId}`, profilReferenz, { erzeuger: 'kern', schritt: 'router-lauf' }, { router_ergebnis_schema: 'v0', auftrag_id: auftragId, lauf_id: 'test', worker: 'claude-code', klassifikation, vorlage: 'standard', beobachtung: null, erstellt_am: new Date().toISOString() }, [], ladeOptionen)
      const workflow = (id) => {
        registriereWorkflow(
          {
            workflow_schema: 'v0',
            workflow_id: id,
            auftrag_id: auftragId,
            version: 1,
            ziel: 'Test.',
            status: 'OFFEN',
            aktiver_schritt_id: 's1',
            grund: null,
            grenzen: { max_schritte: 4, max_replans: 1 },
            schritte: [{ schritt_id: 's1', rolle: 'ausfuehrung', werkzeugsatz: 'schreibend', worker: 'claude-code', modell: 'claude-sonnet-5', eingaben: [`artefakt:auftrag-${auftragId}`], output_schema: null, freigabe: 'ZWINGEND', freigabe_erteilt: false, risiko: 'Test.', zeitgrenze_ms: 600000, nachfolger: null, status: 'OFFEN', lauf_id: null }],
          },
          profilReferenz,
          ladeOptionen
        )
        return id
      }
      const wf = workflow(`bind-${randomUUID().slice(0, 8)}`)
      const detail = await (await fetch(`${basis}/api/workflows/${wf}`)).json()
      const qa = detail.empfehlung.projektFaehigkeiten.find((e) => e.id === 'agent:qa')
      assert.equal(qa.aktiv, true)
      const katalogIds = detail.empfehlung.wirdGenutzt.map((e) => e.empfehlungId)
      // Alter Client: nur Katalog-Kennungen → 409, Entscheidung nicht festgehalten.
      const alt = await post(`/api/workflows/${wf}/freigabe`, { schrittId: 's1', entscheidung: 'FREIGEGEBEN', begruendung: 'x', empfehlungIds: katalogIds })
      assert.equal(alt.status, 409)
      assert.match(alt.koerper.grund, /Anzeige veraltet: Projekt-Fähigkeiten/)
      assert.equal(ladeArtefaktVersion(`entscheidung-workflow-${wf}-s1`, undefined, ladeOptionen), null)
      // POST /api/laeufe: abweichende Projekt-Kennung → 400 (wie die Katalog-Abweichung, F36 WS-3).
      const direkt = await post('/api/laeufe', { laufId: `bind-${randomUUID()}`, rolle: 'ausfuehrung', anfragen: [], budget: {}, aufrufEingaben: { modell: 'claude-sonnet-5' }, werkzeugsatz: 'schreibend', auftragId, empfehlungIds: [...katalogIds, `agent:qa@${'0'.repeat(64)}`] })
      assert.equal(direkt.status, 400)
      assert.match(direkt.koerper.grund, /Anzeige veraltet/)
      // F-1061 (3) rot: Änderung von außen (gleicher Inhalt, andere Bytes) → Freigabe 409, nichts festgehalten.
      writeFileSync(u.lokalPfad, `${JSON.stringify({ faehigkeiten_lokal_schema: 'v0', projekte: { 'hb-test': { an: ['agent:qa'] } } }, null, 2)}\n`)
      const fremd = await post(`/api/workflows/${wf}/freigabe`, { schrittId: 's1', entscheidung: 'FREIGEGEBEN', begruendung: 'x', empfehlungIds: empfehlungIdsAus(detail.empfehlung) })
      assert.equal(fremd.status, 409)
      assert.match(fremd.koerper.grund, /außerhalb des Leitstands geändert und ist noch nicht bestätigt/)
      assert.equal(ladeArtefaktVersion(`entscheidung-workflow-${wf}-s1`, undefined, ladeOptionen), null)
      const fremdDirekt = await post('/api/laeufe', { laufId: `bind-${randomUUID()}`, rolle: 'ausfuehrung', anfragen: [], budget: {}, aufrufEingaben: { modell: 'claude-sonnet-5' }, werkzeugsatz: 'schreibend', auftragId, empfehlungIds: empfehlungIdsAus(detail.empfehlung) })
      assert.equal(fremdDirekt.status, 400)
      assert.match(fremdDirekt.koerper.grund, /noch nicht bestätigt/)
      // grün: Stand bestätigen (genau der angezeigte Hash) → der Start geht.
      const stand = (await (await fetch(`${basis}/api/faehigkeiten`)).json()).lokale_datei.hash
      assert.equal((await post('/api/faehigkeiten/bestaetigung', { stand })).status, 200)
      // Angezeigt = Start → 202, der Lauf trägt Agent(qa).
      const gut = await post(`/api/workflows/${wf}/freigabe`, { schrittId: 's1', entscheidung: 'FREIGEGEBEN', begruendung: 'x', empfehlungIds: empfehlungIdsAus(detail.empfehlung) })
      assert.equal(gut.status, 202, gut.koerper.grund)
      for (let i = 0; i < 50 && gesehen.length === 0; i++) await new Promise((r) => setTimeout(r, 100))
      assert.ok(gesehen[0].aufrufEingaben.werkzeugsatz.erlaubte_werkzeuge.includes('Agent(qa)'))
      for (let i = 0; i < 50 && ladeArtefaktVersion(`workflow-${wf}`, undefined, ladeOptionen)?.daten?.status === 'LAEUFT'; i++) await new Promise((r) => setTimeout(r, 100))
      // Eingeschaltet, aber nicht aktiv (Inhalt im Projektordner geändert) → Vorprüfung 409, nichts festgehalten.
      const qaPfad = join(u.repoWurzel, '.claude', 'agents', 'qa.md')
      writeFileSync(qaPfad, `${readFileSync(qaPfad, 'utf8')}\nGeändert.\n`)
      const wf2 = workflow(`bind-${randomUUID().slice(0, 8)}`)
      const detail2 = await (await fetch(`${basis}/api/workflows/${wf2}`)).json()
      const halt = await post(`/api/workflows/${wf2}/freigabe`, { schrittId: 's1', entscheidung: 'FREIGEGEBEN', begruendung: 'x', empfehlungIds: empfehlungIdsAus(detail2.empfehlung) })
      assert.equal(halt.status, 409)
      assert.match(halt.koerper.grund, /eingeschaltet, aber nicht aktiv/)
      assert.equal(ladeArtefaktVersion(`entscheidung-workflow-${wf2}-s1`, undefined, ladeOptionen), null)
    } finally {
      await new Promise((r) => server.close(r))
    }
  })

  it('loeseSchrittEingabenAuf reicht konflikt durch (Advisor A5)', () => {
    const u = baueUmgebung()
    const lokalPfad = join(u.basis, 'lokal.json')
    writeFileSync(lokalPfad, JSON.stringify({ faehigkeiten_lokal_schema: 'v0', projekte: { 'hb-test': { an: ['agent:qa'] } } }))
    const vorlage = ladeStartvorlage(join(INSTALLATION, 'startvorlagen', 'ai-workforce.json'))
    const install = baueInstallation(u.basis)
    const schritt = { schritt_id: 's1', rolle: 'ausfuehrung', werkzeugsatz: 'schreibend', worker: 'claude-code', modell: 'claude-sonnet-5', eingaben: [], output_schema: null }
    const kontext = { lokal: ladeFaehigkeitenLokal(lokalPfad), lokalPfad, projektId: 'hb-test', katalog: katalogFreigaben(JSON.parse(readFileSync(join(install, 'ressourcen.json'), 'utf8')).ressourcen, install), deaktiviert: [], angezeigteProjektKennungen: [] }
    const ergebnis = loeseSchrittEingabenAuf(schritt, { auftrag_id: 'a' }, undefined, 'AUFTRAG', vorlage, u.repoWurzel, { basisVerzeichnis: u.basisVerzeichnis, schreiber: () => {} }, install, { leseAusfuehrungsVorbedingung: () => ({ ok: true }), installWurzel: install, faehigkeitenKontext: kontext })
    assert.equal(ergebnis.ok, false)
    assert.equal(ergebnis.konflikt, true)
    assert.match(ergebnis.grund, /Fähigkeiten-Start abgelehnt/)
  })
})

describe('Stand der lokalen Datei über Neustarts (F45 F-2b-2c, F-1061 (1))', () => {
  const GUELTIG = JSON.stringify({ faehigkeiten_stand_schema: 'v0', projekte: {} })
  /** Uhr für die Tests. @returns ISO-Zeit-Quelle */
  const uhr = () => {
    let n = 0
    return () => `2026-10-13T10:00:${String(n++).padStart(2, '0')}.000Z`
  }

  it('Neustart nach Fremdänderung → Band (quelle neustart) + Sperre; Bestätigung hält über den nächsten Neustart', async () => {
    const u = baueUmgebung()
    const standPfad = standPfadFuer(u.lokalPfad)
    const erster = erzeugeLokalWaechter(u.lokalPfad, uhr(), standPfad)
    assert.equal(erster.bekannt().hash, 'fehlt', 'Datei und Stand fehlen → fehlt gilt als bekannt')
    assert.equal(JSON.parse(readFileSync(standPfad, 'utf8')).hash, 'fehlt', 'erster Start schreibt den Stand')
    const s1 = await starte(u, { faehigkeitenLokalWaechter: erster })
    try {
      assert.equal((await s1.senden('/api/faehigkeiten/aktivierung', { eintrag: 'agent:qa', aktiv: true, stand: 'fehlt' })).status, 200)
    } finally {
      await s1.schliessen()
    }
    const nachRoute = JSON.parse(readFileSync(standPfad, 'utf8'))
    assert.equal(nachRoute.quelle, 'route')
    assert.equal(nachRoute.hash, hashLokaleDatei(u.lokalPfad))
    assert.equal(nachRoute.pfad, join(u.lokalPfad))
    assert.ok(!readFileSync(standPfad, 'utf8').includes(String.fromCharCode(13)), 'nur LF')
    // Leitstand gestoppt: jemand ändert die Datei. Neustart.
    writeFileSync(u.lokalPfad, JSON.stringify({ faehigkeiten_lokal_schema: 'v0', projekte: { 'hb-test': { an: ['agent:qa', 'skill:ponytail'] } } }))
    const zweiter = erzeugeLokalWaechter(u.lokalPfad, uhr(), standPfad)
    const s2 = await starte(u, { faehigkeitenLokalWaechter: zweiter })
    try {
      const datei = (await s2.holen('/api/faehigkeiten')).koerper.lokale_datei
      assert.equal(datei.fremd_geaendert.quelle, 'neustart')
      assert.equal(datei.fremd_geaendert.bekannt_seit, nachRoute.zeitpunkt)
      const gesperrt = await s2.senden('/api/faehigkeiten/aktivierung', { eintrag: 'skill:ponytail', aktiv: false, stand: datei.hash })
      assert.equal(gesperrt.status, 409, 'Schalter gesperrt bis zur Bestätigung')
      assert.match(gesperrt.koerper.grund, /außerhalb des Leitstands geändert/)
      assert.equal((await s2.senden('/api/faehigkeiten/bestaetigung', { stand: datei.hash })).status, 200)
      assert.equal((await s2.holen('/api/faehigkeiten')).koerper.lokale_datei.fremd_geaendert, null)
    } finally {
      await s2.schliessen()
    }
    assert.equal(JSON.parse(readFileSync(standPfad, 'utf8')).quelle, 'bestaetigt')
    const dritter = erzeugeLokalWaechter(u.lokalPfad, uhr(), standPfad)
    assert.equal(fremdGeaendert(dritter, u.lokalPfad), null, 'bestätigter Stand gilt nach dem nächsten Neustart')
  })

  it('Neustart ohne Änderung → frei (gespeicherter Zeitpunkt und quelle bleiben)', () => {
    const u = baueUmgebung()
    const standPfad = standPfadFuer(u.lokalPfad)
    erzeugeLokalWaechter(u.lokalPfad, uhr(), standPfad)
    writeFileSync(u.lokalPfad, GUELTIG)
    const w = erzeugeLokalWaechter(u.lokalPfad, uhr(), standPfad)
    // Datei kam ohne Route dazu → der zweite Start sperrt; nach der Bestätigung ist jeder weitere Neustart frei.
    assert.equal(fremdGeaendert(w, u.lokalPfad).quelle, 'neustart')
    w.bestaetige(hashLokaleDatei(u.lokalPfad))
    const danach = erzeugeLokalWaechter(u.lokalPfad, () => '2026-10-13T11:00:00.000Z', standPfad)
    assert.equal(fremdGeaendert(danach, u.lokalPfad), null)
    assert.equal(danach.bekannt().quelle, 'bestaetigt')
    assert.notEqual(danach.bekannt().zeitpunkt, '2026-10-13T11:00:00.000Z', 'Zeitpunkt aus der Ablage, nicht der Startzeit')
  })

  it('Stand fehlt, ist kaputt oder gehört zu einem anderen Pfad, Datei vorhanden → unbekannt, gesperrt (Advisor A1/A2)', () => {
    const u = baueUmgebung()
    mkdirSync(join(u.lokalPfad, '..'), { recursive: true })
    writeFileSync(u.lokalPfad, GUELTIG)
    const standPfad = standPfadFuer(u.lokalPfad)
    const leer = erzeugeLokalWaechter(u.lokalPfad, uhr(), standPfad)
    assert.equal(fremdGeaendert(leer, u.lokalPfad).quelle, 'unbekannt', 'leerer Stand übernimmt nichts still')
    assert.equal(fremdGeaendert(leer, u.lokalPfad).bekannt_seit, null, 'unbekannt hat keinen bekannten Zeitpunkt (Code-Review 5)')
    assert.equal(existsSync(standPfad), false, 'unbekannter Stand wird nicht geschrieben')
    writeFileSync(standPfad, '{kaputt')
    assert.equal(fremdGeaendert(erzeugeLokalWaechter(u.lokalPfad, uhr(), standPfad), u.lokalPfad).quelle, 'unbekannt')
    writeFileSync(standPfad, JSON.stringify({ faehigkeiten_stand_schema: 'v0', pfad: join(u.basis, 'anders.json'), hash: hashLokaleDatei(u.lokalPfad), zeitpunkt: '2026-10-13T09:00:00.000Z', quelle: 'route' }))
    assert.equal(fremdGeaendert(erzeugeLokalWaechter(u.lokalPfad, uhr(), standPfad), u.lokalPfad).quelle, 'unbekannt', 'Stand einer anderen Datei gilt nicht')
    // Bestätigen löst die Sperre und schreibt den Stand für diesen Pfad.
    const w = erzeugeLokalWaechter(u.lokalPfad, uhr(), standPfad)
    w.bestaetige(hashLokaleDatei(u.lokalPfad))
    assert.equal(fremdGeaendert(erzeugeLokalWaechter(u.lokalPfad, uhr(), standPfad), u.lokalPfad), null)
  })

  it('ohne Stand-Pfad (Gates, Tests) bleibt alles im Speicher wie bisher', () => {
    const u = baueUmgebung()
    mkdirSync(join(u.lokalPfad, '..'), { recursive: true })
    writeFileSync(u.lokalPfad, GUELTIG)
    const w = erzeugeLokalWaechter(u.lokalPfad, uhr())
    assert.equal(fremdGeaendert(w, u.lokalPfad), null)
    w.nachRoute(hashLokaleDatei(u.lokalPfad))
    assert.equal(existsSync(standPfadFuer(u.lokalPfad)), false)
  })
})
