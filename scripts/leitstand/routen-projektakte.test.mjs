/**
 * Datei: scripts/leitstand/routen-projektakte.test.mjs
 *
 * Zweck: F46 D1 — Leseroute der Projektakte (scripts/leitstand/routen-projektakte.mjs) in einem
 * eigenen Temp-Repo: Grünfall, fehlende Datei, zu große Datei (gekürzt), Pfade außerhalb der
 * Repo-Wurzel, Versionsziel eindeutig/nicht eindeutig, und per echtem HTTP-Aufruf, dass kein Pfad
 * von außen gewählt werden kann (Query und Pfadanhang ändern die Antwort nicht).
 */

import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { raeumeVerzeichnis } from '../_aufraeumen.ts'
import { erzeugeRequestHandler } from '../leitstand-server.mjs'
import { baueProjektakteProjektion, findeVersionsziel, leseKontextDatei, MAX_BYTES } from './routen-projektakte.mjs'

const KONTEXT = 'docs/projekt/kontext'
const ROADMAP = 'docs/projekt/roadmap.json'

const ZIELFASSUNG = `# Zielfassung

### 13.6 Meilenstein 5

**Zielsatz M5 (= V1-RC):** Die Workforce führt ein Produkt
bis zur Abnahme.

**Bestehensbedingung M5/V1:**
1. Erstes Kriterium,
   fortgesetzt.
2. Zweites Kriterium.

Danach Fließtext.
`

const ROADMAP_DATEN = {
  roadmap_schema: 'v0',
  vision: 'Testvision',
  meilensteine: [
    { id: 'M4', titel: 'Alt', status: 'ABGESCHLOSSEN', features: [] },
    { id: 'M5', titel: 'Jetzt', status: 'LAEUFT', features: [] },
  ],
}

/**
 * Legt ein Temp-Repo mit Kontextdateien an, ruft fn auf und räumt danach auf.
 * @param fn - (repoWurzel) => void | Promise
 * @param optionen - { ohne: Dateinamen, die fehlen sollen }
 */
async function mitRepo(fn, { ohne = [] } = {}) {
  const repoWurzel = mkdtempSync(join(tmpdir(), 'f46-projektakte-'))
  try {
    mkdirSync(join(repoWurzel, KONTEXT), { recursive: true })
    const dateien = { 'beschreibung.md': '# Beschreibung\n\n## Für wen\n\nEin Nutzer.\n', 'anweisungen.md': '# Arbeitsweise\n\nKlein und prüfbar.\n', 'lagebild.md': '# Lagebild\n\n## Aktuelle Phase\n\nM5 läuft.\n' }
    for (const [name, inhalt] of Object.entries(dateien)) if (!ohne.includes(name)) writeFileSync(join(repoWurzel, KONTEXT, name), inhalt)
    writeFileSync(join(repoWurzel, ROADMAP), JSON.stringify(ROADMAP_DATEN))
    if (!ohne.includes('zielfassung.md')) writeFileSync(join(repoWurzel, 'docs/projekt/zielfassung.md'), ZIELFASSUNG)
    await fn(repoWurzel)
  } finally {
    raeumeVerzeichnis(repoWurzel)
  }
}

test('Grünfall: drei Kontextdateien mit Text, Quellen mit Status, Versionsziel des laufenden Meilensteins', async () => {
  await mitRepo((repoWurzel) => {
    const p = baueProjektakteProjektion({ repoWurzel, kontextPfad: KONTEXT, roadmapPfad: ROADMAP })
    for (const schluessel of ['beschreibung', 'anweisungen', 'lagebild']) {
      assert.strictEqual(p.dateien[schluessel].status, 'ok')
      assert.strictEqual(p.dateien[schluessel].pfad, `${KONTEXT}/${schluessel}.md`)
      assert.strictEqual(p.dateien[schluessel].gekuerzt, false)
    }
    assert.match(p.dateien.beschreibung.text, /## Für wen\n\nEin Nutzer\./)
    assert.strictEqual(p.dateien.roadmap.status, 'ok')
    assert.strictEqual(p.dateien.roadmap.text, undefined, 'roadmap.json kommt über GET /api/roadmap, nicht hier')
    assert.strictEqual(p.dateien.zielfassung.status, 'ok')
    assert.strictEqual(p.dateien.zielfassung.text, undefined, 'die Zielfassung geht nicht als Text in die Antwort')
    assert.deepStrictEqual(p.versionsziel, { meilenstein: 'M5', status: 'ok', zielsatz: 'Die Workforce führt ein Produkt bis zur Abnahme.', kriterien: ['Erstes Kriterium, fortgesetzt.', 'Zweites Kriterium.'] })
  })
})

test('fehlende Datei: Feldstatus fehlt, die übrigen bleiben ok; ohne Zielfassung ist das Versionsziel fehlt', async () => {
  await mitRepo(
    (repoWurzel) => {
      const p = baueProjektakteProjektion({ repoWurzel, kontextPfad: KONTEXT, roadmapPfad: ROADMAP })
      assert.deepStrictEqual(p.dateien.lagebild, { status: 'fehlt', pfad: `${KONTEXT}/lagebild.md` })
      assert.strictEqual(p.dateien.beschreibung.status, 'ok')
      assert.strictEqual(p.dateien.zielfassung.status, 'fehlt')
      assert.deepStrictEqual(p.versionsziel, { status: 'fehlt', meilenstein: null })
    },
    { ohne: ['lagebild.md', 'zielfassung.md'] }
  )
})

test('zu große Datei: höchstens MAX_BYTES, Kennzeichen gekuerzt, kein halbes Mehrbyte-Zeichen am Ende', async () => {
  await mitRepo((repoWurzel) => {
    // 'ü' hat zwei Bytes; mit führendem 'a' fällt die Grenze mitten in ein Zeichen.
    writeFileSync(join(repoWurzel, KONTEXT, 'lagebild.md'), `a${'ü'.repeat(MAX_BYTES)}`)
    const eintrag = leseKontextDatei(repoWurzel, `${KONTEXT}/lagebild.md`)
    assert.strictEqual(eintrag.status, 'ok')
    assert.strictEqual(eintrag.gekuerzt, true)
    assert.ok(Buffer.byteLength(eintrag.text, 'utf8') <= MAX_BYTES)
    assert.ok(!eintrag.text.endsWith(String.fromCharCode(0xfffd)))
  })
})

test('Pfade außerhalb der Repo-Wurzel werden nicht gelesen (Konfigurationsfehler → fehler)', async () => {
  await mitRepo((repoWurzel) => {
    for (const pfad of ['../geheim.md', 'docs/../../geheim.md', join(tmpdir(), 'geheim.md'), 'C:/Windows/win.ini', '']) {
      const eintrag = leseKontextDatei(repoWurzel, pfad)
      assert.strictEqual(eintrag.status, 'fehler', pfad)
      assert.strictEqual(eintrag.text, undefined, pfad)
    }
    const p = baueProjektakteProjektion({ repoWurzel, kontextPfad: '../ausserhalb', roadmapPfad: ROADMAP })
    assert.strictEqual(p.dateien.beschreibung.status, 'fehler')
  })
})

test('Verknüpfung (Junction/Symlink) aus dem Kontextordner nach außen: fehler, kein Text (realpath-Prüfung)', async (t) => {
  const draussen = mkdtempSync(join(tmpdir(), 'f46-projektakte-draussen-'))
  try {
    writeFileSync(join(draussen, 'beschreibung.md'), 'GEHEIM')
    await mitRepo((repoWurzel) => {
      const verknuepft = join(repoWurzel, 'docs/projekt/verknuepft')
      try {
        symlinkSync(draussen, verknuepft, 'junction')
      } catch (fehler) {
        t.skip(`Verknüpfung nicht anlegbar: ${fehler.message}`)
        return
      }
      const eintrag = leseKontextDatei(repoWurzel, 'docs/projekt/verknuepft/beschreibung.md')
      assert.strictEqual(eintrag.status, 'fehler')
      assert.strictEqual(eintrag.text, undefined)
      rmSync(verknuepft, { recursive: false, force: true })
    })
  } finally {
    raeumeVerzeichnis(draussen)
  }
})

test('ein echtes Ersatzzeichen am Ende einer ungekürzten Datei bleibt stehen', async () => {
  await mitRepo((repoWurzel) => {
    writeFileSync(join(repoWurzel, KONTEXT, 'lagebild.md'), `Text${String.fromCharCode(0xfffd)}`)
    const eintrag = leseKontextDatei(repoWurzel, `${KONTEXT}/lagebild.md`)
    assert.strictEqual(eintrag.gekuerzt, false)
    assert.ok(eintrag.text.endsWith(String.fromCharCode(0xfffd)))
  })
})

test('ein Ordner statt einer Datei ist fehler, nicht ok', async () => {
  await mitRepo((repoWurzel) => {
    assert.strictEqual(leseKontextDatei(repoWurzel, KONTEXT).status, 'fehler')
  })
})

test('Versionsziel: keine oder mehrere Fundstellen → nicht_eindeutig, nichts geraten', () => {
  assert.deepStrictEqual(findeVersionsziel('Kein Zielsatz hier.', 'M5'), { status: 'nicht_eindeutig', treffer: 0 })
  const doppelt = '**Zielsatz M5:** A\n\n**Zielsatz M5 (neu):** B\n'
  assert.deepStrictEqual(findeVersionsziel(doppelt, 'M5'), { status: 'nicht_eindeutig', treffer: 2 })
  // M5 darf nicht auf M50 oder M5-alt passen.
  assert.strictEqual(findeVersionsziel('**Zielsatz M50:** X\n', 'M5').status, 'nicht_eindeutig')
  assert.strictEqual(findeVersionsziel('**Zielsatz M5-alt:** X\n', 'M5').status, 'nicht_eindeutig')
  // Zielsatz eindeutig, Bestehensbedingung fehlt → kriterien null (Ansicht: kommt).
  assert.deepStrictEqual(findeVersionsziel('**Zielsatz M5:** Nur das.\n', 'M5'), { status: 'ok', zielsatz: 'Nur das.', kriterien: null })
})

test('HTTP: GET /api/projektakte liest keinen Anfrageteil — Query und Pfadanhang wählen keine Datei', async () => {
  await mitRepo(async (repoWurzel) => {
    writeFileSync(join(repoWurzel, 'geheim.md'), 'GEHEIM')
    const basisVerzeichnis = `kontrollzustand-test-f46-projektakte-${randomUUID()}`
    const handler = erzeugeRequestHandler({ basisVerzeichnis, startvorlagePfad: 'startvorlagen/beispielprojekt.json', repoWurzel, globalerLaufZustand: { aktiv: false, laufId: null, abortController: null } })
    const server = createServer(handler)
    await new Promise((ok) => server.listen(0, '127.0.0.1', ok))
    try {
      const { port } = server.address()
      const basis = `http://127.0.0.1:${port}`
      const normal = await fetch(`${basis}/api/projektakte`)
      assert.strictEqual(normal.status, 200)
      const koerper = await normal.json()
      assert.strictEqual(koerper.dateien.beschreibung.status, 'ok')
      const erwartet = JSON.stringify(koerper)
      for (const query of ['?pfad=geheim.md', '?datei=../geheim.md&kontextPfad=.', '?roadmapPfad=geheim.md']) {
        const antwort = await fetch(`${basis}/api/projektakte${query}`)
        assert.strictEqual(antwort.status, 200)
        const text = await antwort.text()
        assert.strictEqual(text, erwartet, query)
        assert.ok(!text.includes('GEHEIM'), query)
      }
      const anhang = await fetch(`${basis}/api/projektakte/geheim.md`)
      assert.notStrictEqual(anhang.status, 200)
      assert.ok(!(await anhang.text()).includes('GEHEIM'))
      const post = await fetch(`${basis}/api/projektakte`, { method: 'POST', body: '{}', headers: { origin: basis } })
      assert.notStrictEqual(post.status, 200, 'nur GET')
    } finally {
      await new Promise((ok) => server.close(ok))
      raeumeVerzeichnis(basisVerzeichnis)
    }
  })
})
