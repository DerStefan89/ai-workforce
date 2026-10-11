/**
 * Datei: scripts/leitstand/zustand-caches.test.mjs
 *
 * Zweck: Cache-Invalidierung der F45-P-Caches (F-556, Event-Loop) über HTTP gegen einen Wegwerf-Bestand:
 * - GET /api/auftraege (auftragKopfdatenCache): ein neu registrierter Auftrag erscheint im nächsten Aufruf; ein
 *   unveränderter Bestand liefert dieselbe Antwort wie der erste (gefüllte) Aufruf.
 * - GET /api/workitems (workitemParseCache): ein geändertes state/findings.md erscheint im nächsten Aufruf —
 *   auch bei gleicher Dateigröße und sofortigem Neuschreiben (Datei-mtime ändert sich unter Windows dabei oft
 *   nicht; der Stempel ist deshalb der Inhalt). Ebenso eine neue Akte unter features/; ein Akten-Ordner ohne
 *   feature.md und ein gelöschtes findings.md brechen nichts.
 * - GET /api/zustand (Lauf-Stempel) und GET /api/laeufe (synchrone Fassung, gleiche Liste): eine entscheidung-Kette, die NACH dem ersten Poll entsteht, macht den
 *   Lauf im nächsten Poll „kenntnisgenommen“ (Existenzprüfung über die Verzeichnisliste, bildeLaufStempel); zwei
 *   gleichzeitige Polls liefern dasselbe wie nacheinander.
 *
 * Wird aufgerufen von: `npm run test` (node --test)
 *
 * Wichtig: Arbeitet nur unter os.tmpdir() (eigene Wegwerf-Ordner), nie auf kontrollzustand/ des Repos.
 */

import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { registriereAuftrag } from '../../src/auftrag/index.ts'
import { schreibeWirkungsmarke } from '../../src/checkpoint-store/index.ts'
import { registriereKernArtefakt } from '../../src/lineage-registry/index.ts'
import { raeumeVerzeichnis } from '../_aufraeumen.ts'
import { erzeugeRequestHandler } from '../leitstand-server.mjs'

const PROFIL_REFERENZ = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
const STILL = () => {}
const wurzel = mkdtempSync(join(tmpdir(), 'f45p-caches-'))
after(() => raeumeVerzeichnis(wurzel))

/**
 * Startet einen Testserver auf einem eigenen Bestand unter der Wegwerf-Wurzel.
 * @returns { basisUrl, basisVerzeichnis, repoWurzel, schliessen }
 */
async function starteTestserver() {
  const repoWurzel = join(wurzel, randomUUID())
  const basisVerzeichnis = join(repoWurzel, 'kontrollzustand')
  mkdirSync(basisVerzeichnis, { recursive: true })
  const server = createServer(erzeugeRequestHandler({ basisVerzeichnis, repoWurzel }))
  await new Promise((weiter) => server.listen(0, '127.0.0.1', weiter))
  return {
    basisUrl: `http://127.0.0.1:${server.address().port}`,
    basisVerzeichnis,
    repoWurzel,
    schliessen: () => new Promise((weiter) => server.close(weiter)),
  }
}

/** @param url - Adresse @returns geparste JSON-Antwort (wirft bei Nicht-2xx) */
async function holeJson(url) {
  const antwort = await fetch(url)
  assert.equal(antwort.status, 200, url)
  return antwort.json()
}

test('GET /api/auftraege: ein neuer Auftrag erscheint im nächsten Aufruf (Stempel der Auftragskette)', async () => {
  const server = await starteTestserver()
  try {
    const optionen = { basisVerzeichnis: server.basisVerzeichnis, schreiber: STILL }
    registriereAuftrag('auftrag-a', PROFIL_REFERENZ, 'Erster', 'Text A', optionen)
    const erste = await holeJson(`${server.basisUrl}/api/auftraege`)
    assert.deepEqual(erste.map((a) => a.auftragId), ['auftrag-a'])
    assert.deepEqual(await holeJson(`${server.basisUrl}/api/auftraege`), erste, 'unveränderter Bestand: gleiche Antwort aus dem Cache')
    registriereAuftrag('auftrag-b', PROFIL_REFERENZ, 'Zweiter', 'Text B\nworkitem:findings:F-1', optionen)
    const zweite = await holeJson(`${server.basisUrl}/api/auftraege`)
    assert.deepEqual(zweite.map((a) => a.auftragId).sort(), ['auftrag-a', 'auftrag-b'])
    assert.equal(zweite.find((a) => a.auftragId === 'auftrag-b').workitem_referenz, 'workitem:findings:F-1')
  } finally {
    await server.schliessen()
  }
})

test('GET /api/workitems: Inhaltsänderung bei gleicher Größe und neue Akte erscheinen sofort', async () => {
  const server = await starteTestserver()
  try {
    const findingsPfad = join(server.repoWurzel, 'state', 'findings.md')
    mkdirSync(join(server.repoWurzel, 'state'), { recursive: true })
    writeFileSync(findingsPfad, '**F-901** · `BUG` · P1 · offen\nTitel: Alpha.\n')
    const erste = await holeJson(`${server.basisUrl}/api/workitems`)
    assert.equal(erste.workitems.find((w) => w.id === 'F-901')?.titel, 'Alpha.')
    // gleiche Größe, sofort neu geschrieben — mtime kann gleich bleiben
    writeFileSync(findingsPfad, '**F-901** · `BUG` · P1 · offen\nTitel: Gamma.\n')
    const zweite = await holeJson(`${server.basisUrl}/api/workitems`)
    assert.equal(zweite.workitems.find((w) => w.id === 'F-901')?.titel, 'Gamma.')
    // neue Akte
    mkdirSync(join(server.repoWurzel, 'features', 'F99'), { recursive: true })
    writeFileSync(join(server.repoWurzel, 'features', 'F99', 'feature.md'), '# F99 — Probe\n\n## ID\nF99\n\n## Titel\nProbe\n\n## Status\nStatus: ENTWURF\n')
    const dritte = await holeJson(`${server.basisUrl}/api/workitems`)
    assert.ok(dritte.workitems.length + dritte.befunde.length > zweite.workitems.length + zweite.befunde.length, 'die neue Akte muss als Workitem oder Befund erscheinen')
    assert.ok(dritte.workitems.some((w) => w.id === 'F99') || dritte.befunde.some((b) => JSON.stringify(b).includes('F99')), 'die neue Akte F99 muss erscheinen')
    // Filter wirken auf den gecachten Bestand, befunde bleiben voll
    const gefiltert = await holeJson(`${server.basisUrl}/api/workitems?typ=BUG`)
    assert.ok(gefiltert.workitems.every((w) => w.typ === 'BUG'))
    assert.deepEqual(gefiltert.befunde, dritte.befunde)
    // Akten-Ordner ohne feature.md und gelöschtes findings.md: keine 500, F-901 verschwindet
    mkdirSync(join(server.repoWurzel, 'features', 'F98'), { recursive: true })
    raeumeVerzeichnis(join(server.repoWurzel, 'state'))
    const vierte = await holeJson(`${server.basisUrl}/api/workitems`)
    assert.equal(vierte.workitems.find((w) => w.id === 'F-901'), undefined)
  } finally {
    await server.schliessen()
  }
})

test('GET /api/zustand: eine entscheidung-Kette, die nach dem ersten Poll entsteht, zählt im nächsten Poll', async () => {
  const server = await starteTestserver()
  try {
    const laufId = `lauf-${randomUUID()}`
    const optionen = { basisVerzeichnis: server.basisVerzeichnis, schreiber: STILL }
    schreibeWirkungsmarke(laufId, PROFIL_REFERENZ, 'run_prepared', {}, optionen)
    schreibeWirkungsmarke(laufId, PROFIL_REFERENZ, 'terminal', { ergebnis: 'FEHLGESCHLAGEN' }, optionen)
    const vorher = await holeJson(`${server.basisUrl}/api/zustand`)
    const laufVorher = vorher.laeufe.find((l) => l.laufId === laufId)
    assert.ok(laufVorher, 'der Lauf muss in der Liste stehen')
    assert.equal(laufVorher.kenntnisgenommen, false)
    registriereKernArtefakt(
      `entscheidung-${laufId}`,
      PROFIL_REFERENZ,
      { erzeuger: 'mensch', schritt: 'entscheidung-kenntnisnahme' },
      { entscheidung_schema: 'v0', ergebnis: 'FEHLGESCHLAGEN', begruendung: 'F45-P-Test, Kenntnisnahme.', entschieden_am: new Date().toISOString() },
      [],
      optionen
    )
    const nachher = await holeJson(`${server.basisUrl}/api/zustand`)
    assert.equal(nachher.laeufe.find((l) => l.laufId === laufId).kenntnisgenommen, true)
    // GET /api/laeufe (synchrone Fassung, sammleLaeufeSync) liefert dieselbe Liste wie der Poll (asynchron)
    assert.deepEqual(await holeJson(`${server.basisUrl}/api/laeufe`), nachher.laeufe)
    // zwei gleichzeitige Polls (zwei Fenster) liefern dasselbe wie ein einzelner
    const [a, b] = await Promise.all([holeJson(`${server.basisUrl}/api/zustand`), holeJson(`${server.basisUrl}/api/zustand`)])
    assert.deepEqual(a.laeufe, nachher.laeufe)
    assert.deepEqual(b.laeufe, nachher.laeufe)
    assert.deepEqual(a.workflows, b.workflows)
  } finally {
    await server.schliessen()
  }
})
