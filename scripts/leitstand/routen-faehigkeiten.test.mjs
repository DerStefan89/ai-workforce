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
 *
 * Wird aufgerufen von: npm run test (node --test)
 *
 * Wichtig: Nie ~/.ai-workforce — jede Instanz bekommt einen Pfad in os.tmpdir().
 */

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, describe, it } from 'node:test'
import { raeumeVerzeichnis } from '../_aufraeumen.ts'
import { erzeugeRequestHandler } from '../leitstand-server.mjs'
import { baueFaehigkeitenStatus } from './routen-faehigkeiten.mjs'

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
      assert.deepEqual(vorher.koerper.lokale_datei, { zustand: 'fehlt' })
      const qa = vorher.koerper.eintraege.find((e) => e.id === 'agent:qa')
      assert.equal(qa.freigabe, 'katalog')
      assert.equal(qa.aktiv, false)
      assert.match(qa.hash, /^[0-9a-f]{64}$/)
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
    const a = await starte(u)
    const b = await starte(u, { projektId: 'anderes' })
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
    assert.deepEqual(status(feld([{ id: 'agent:qa', aktiv: true, aufrufe: 2, fehlgeschlagen: 1 }])), { im_lauf: 'aktiv', benutzt: true })
    assert.deepEqual(status(feld([{ id: 'agent:qa', aktiv: true, aufrufe: 1, fehlgeschlagen: 1 }])), { im_lauf: 'aktiv', benutzt: false })
    assert.deepEqual(status(feld([{ id: 'agent:qa', aktiv: false, aufrufe: 0, fehlgeschlagen: 0 }])), { im_lauf: 'nicht_aktiv', benutzt: false })
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
      assert.equal((await gesperrt.holen('/api/faehigkeiten')).status, 200, 'GET bleibt lesbar')
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
