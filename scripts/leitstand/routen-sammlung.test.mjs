/**
 * Datei: scripts/leitstand/routen-sammlung.test.mjs
 *
 * Zweck: Tests der Sammlungs-Bausteine (F45 F-2b-1): GET /api/sammlung gegen eine echte erzeugeRequestHandler-Instanz
 * (Installation = dieses Repo, Wegwerf-Kontrollzustand), Fehlerstand bei fehlender Sammlung, Scout-Anhang nur für die
 * Rolle scout (Plan v2.1, Delta B3) — über POST /api/laeufe mit einer Attrappe für fuehreAufgabeDurch: der Prompt der
 * Rolle scout trägt den Anhang, der Argv-Teil der Eingaben (aufrufEingaben) bleibt gleich; eine andere Rolle bekommt
 * den Auftragstext unverändert — und der Abgleich eines Scout-Ergebnisses mit der Sammlung.
 *
 * Wird aufgerufen von: npm run test (node --test).
 */

import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { cpSync, mkdirSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, describe, it } from 'node:test'
import { raeumeVerzeichnis } from '../_aufraeumen.ts'
import { erzeugeRequestHandler } from '../leitstand-server.mjs'
import { baueSammlungAntwort, baueScoutSammlungAbgleich, ergaenzeScoutPrompt } from './routen-sammlung.mjs'

const INSTALLATION = join(import.meta.dirname, '..', '..')
const aufraeumen = []
after(() => {
  for (const pfad of aufraeumen) raeumeVerzeichnis(pfad)
})

/** Wegwerf-Ordner. */
function wegwerf() {
  const basis = join(tmpdir(), `sammlung-${randomUUID().slice(0, 8)}`)
  aufraeumen.push(basis)
  mkdirSync(basis, { recursive: true })
  return basis
}

/** Startet eine Instanz über die Installation dieses Repos mit Wegwerf-Kontrollzustand. */
async function starte(zusatz = {}) {
  const basis = wegwerf()
  const gesehen = []
  const fuehreAufgabeDurchFn = async (_laufId, _p, eingaben) => {
    gesehen.push(eingaben)
    return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
  }
  const server = createServer(
    erzeugeRequestHandler({
      basisVerzeichnis: join(basis, 'kontrollzustand'),
      repoWurzel: INSTALLATION,
      startvorlagePfad: join(INSTALLATION, 'startvorlagen', 'ai-workforce.json'),
      installWurzel: INSTALLATION,
      projektId: 'sammlung-test',
      fuehreAufgabeDurchFn,
      ...zusatz,
    })
  )
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const url = `http://127.0.0.1:${server.address().port}`
  const senden = async (pfad, koerper) => {
    const a = await fetch(`${url}${pfad}`, { method: koerper === undefined ? 'GET' : 'POST', ...(koerper === undefined ? {} : { body: JSON.stringify(koerper) }) })
    return { status: a.status, koerper: await a.json().catch(() => ({})) }
  }
  return { senden, gesehen, schliessen: () => new Promise((r) => server.close(r)) }
}

/** Wartet, bis die Attrappe n Läufe gesehen hat. */
async function warteAuf(gesehen, n) {
  for (let i = 0; i < 100 && gesehen.length < n; i++) await new Promise((r) => setTimeout(r, 20))
  assert.equal(gesehen.length, n)
}

describe('Sammlung (F45 F-2b-1)', () => {
  it('GET /api/sammlung: 176 Einträge, 172 mit Link, Zuordnung und Stand; 405 bei POST', async () => {
    const s = await starte()
    try {
      const { status, koerper } = await s.senden('/api/sammlung')
      assert.equal(status, 200)
      assert.equal(koerper.status, 'ok')
      assert.deepEqual(koerper.quelle, { zeilen: 176, mit_link: 172, pfad: 'docs/harness/kandidaten-2026-09-15.md' })
      assert.deepEqual(koerper.selbstpruefung, [])
      const playwright = koerper.eintraege.find((e) => e.zuordnung.katalog_id === 'playwright-mcp')
      assert.equal(playwright.typ, 'mcp')
      assert.equal(playwright.pruefbericht, 'ohne_vor_f2b')
      assert.ok(['installiert', 'aktiv', 'benutzt', 'vorgemerkt'].includes(playwright.stand))
      assert.ok(typeof koerper.urteil_bedeutung['Nur Ausnahme'] === 'string')
      assert.equal((await s.senden('/api/sammlung', {})).status, 405)
    } finally {
      await s.schliessen()
    }
  })

  it('baueSammlungAntwort: fehlende Sammlung → Fehlerstand (200), kein Wurf', () => {
    const antwort = baueSammlungAntwort({ installWurzel: wegwerf(), katalog: [], projektId: 'x', lokal: { zustand: 'fehlt' }, letzterLauf: null, kennung: () => 'x@0' })
    assert.equal(antwort.http, 200)
    assert.equal(antwort.koerper.status, 'fehler')
    assert.match(antwort.koerper.grund, /nicht lesbar/)
  })

  it('ergaenzeScoutPrompt: nur scout bekommt den Anhang; fehlt die Sammlung → Hinweis', () => {
    assert.equal(ergaenzeScoutPrompt('router', 'TEXT', INSTALLATION), 'TEXT')
    assert.equal(ergaenzeScoutPrompt('jarvis', 'TEXT', INSTALLATION), 'TEXT')
    const mit = ergaenzeScoutPrompt('scout', 'TEXT', INSTALLATION)
    assert.ok(mit.startsWith('TEXT\n\nSammlung zuerst (verbindlich)'))
    assert.match(mit, /Sammlung \(176 Einträge\)/)
    const ohne = wegwerf()
    mkdirSync(join(ohne, 'docs', 'harness'), { recursive: true })
    assert.match(ergaenzeScoutPrompt('scout', 'TEXT', ohne), /^TEXT\n\nSammlung nicht verfügbar \(/)
  })

  it('POST /api/laeufe: scout-Prompt mit Anhang, aufrufEingaben gleich; andere Rolle unverändert', async () => {
    const s = await starte()
    try {
      const { auftragId } = (await s.senden('/api/auftraege', { titel: 'Scout', auftragstext: 'Recherchiere UI_VISUAL_TESTING.' })).koerper
      const scout = await s.senden('/api/laeufe', { laufId: `scout-${randomUUID()}`, rolle: 'scout', anfragen: [], budget: {}, aufrufEingaben: { modell: 'sonnet' }, werkzeugsatz: 'recherchierend', auftragId })
      assert.equal(scout.status, 202, JSON.stringify(scout.koerper))
      await warteAuf(s.gesehen, 1)
      const [e] = s.gesehen
      assert.ok(e.auftragstext.startsWith('Recherchiere UI_VISUAL_TESTING.\n\nSammlung zuerst (verbindlich)'))
      assert.deepEqual(Object.keys(e.aufrufEingaben).sort(), ['modell', 'werkzeugsatz'])
      assert.equal(e.aufrufEingaben.zusatzOrdner, undefined)
      const qa = await s.senden('/api/laeufe', { laufId: `qa-${randomUUID()}`, rolle: 'qa', anfragen: [], budget: {}, aufrufEingaben: { modell: 'sonnet' }, werkzeugsatz: 'lesend', auftragId })
      assert.equal(qa.status, 202, JSON.stringify(qa.koerper))
      await warteAuf(s.gesehen, 2)
      assert.equal(s.gesehen[1].auftragstext, 'Recherchiere UI_VISUAL_TESTING.')
    } finally {
      await s.schliessen()
    }
  })

  it('baueScoutSammlungAbgleich: je Kandidat Treffer und Abweichung; Sammlung fehlt → null', () => {
    const ergebnis = {
      gesuchte_capability: 'X',
      hinweis_untrusted: true,
      kandidaten: [
        { name: 'Playwright', quelle_url: 'https://github.com/microsoft/playwright-mcp', quelle: 'sammlung', urteil_sammlung: 'Aufnehmen' },
        { name: 'Neu', quelle_url: 'https://github.com/neu/neu', quelle: 'web' },
      ],
    }
    const abgleich = baueScoutSammlungAbgleich(ergebnis, INSTALLATION)
    assert.equal(abgleich[0].treffer.urteil, 'Aufnehmen')
    assert.equal(abgleich[0].abweichung, false)
    assert.deepEqual(abgleich[1], { treffer: null, abweichung: false })
    assert.equal(baueScoutSammlungAbgleich(ergebnis, wegwerf()), null)
  })
})

// Kopie der Sammlung in einen fremden Ordner bleibt lesbar (dieselbe Datei, andere Installation).
it('leseSammlungDateien über eine kopierte Installation', () => {
  const ziel = wegwerf()
  cpSync(join(INSTALLATION, 'docs', 'harness'), join(ziel, 'docs', 'harness'), { recursive: true })
  assert.match(ergaenzeScoutPrompt('scout', 'T', ziel), /Sammlung \(176 Einträge\)/)
})
