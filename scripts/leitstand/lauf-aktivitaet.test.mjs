/**
 * Datei: scripts/leitstand/lauf-aktivitaet.test.mjs
 *
 * Zweck: Tests des Ringpuffers der Live-Aktivität (F46 D5, löst F-977): Abbildung Werkzeug → Art,
 * Puffergrenze 50, Reset bei Start und Ende, fremde laufId, Kürzung, berührte Dateien, keine
 * wachsende Struktur. Dazu ein HTTP-Test gegen erzeugeRequestHandler: das Feld aktivitaet in
 * GET /api/laeufe/<laufId> nur für den aktiven Lauf, nach Laufende null.
 *
 * Wird aufgerufen von: `npm run test` (node --test)
 */

import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import test from 'node:test'
import { registriereAuftrag } from '../../src/auftrag/index.ts'
import { schreibeWirkungsmarke } from '../../src/checkpoint-store/index.ts'
import { raeumeVerzeichnis } from '../_aufraeumen.ts'
import { erzeugeRequestHandler } from '../leitstand-server.mjs'
import { AKTIVITAET_GRENZE, BERUEHRT_GRENZE, erzeugeAktivitaetsSpeicher, kuerze, WERKZEUG_ART, werkzeugArt, ZIEL_MAX_ZEICHEN } from './lauf-aktivitaet.mjs'

test('werkzeugArt bildet die Werkzeuge nach Tabelle ab, MCP als Fähigkeit, Unbekanntes als sonstiges', () => {
  const erwartet = {
    Write: 'aendert',
    Edit: 'aendert',
    MultiEdit: 'aendert',
    NotebookEdit: 'aendert',
    Bash: 'befehl',
    PowerShell: 'befehl',
    Read: 'liest',
    Glob: 'liest',
    Grep: 'liest',
    WebFetch: 'liest',
    Skill: 'faehigkeit',
    Task: 'faehigkeit',
    Agent: 'faehigkeit',
    mcp__playwright__browser_click: 'faehigkeit',
    TodoWrite: 'sonstiges',
    constructor: 'sonstiges',
    toString: 'sonstiges',
  }
  for (const [werkzeug, art] of Object.entries(erwartet)) assert.equal(werkzeugArt(werkzeug), art, werkzeug)
  assert.equal(werkzeugArt(null), 'sonstiges')
  for (const art of Object.values(WERKZEUG_ART)) assert.ok(['aendert', 'befehl', 'liest', 'faehigkeit'].includes(art))
})

test('Puffergrenze: höchstens 50 Einträge, neueste zuerst, Gesamtzahl zählt weiter', () => {
  let n = 0
  const speicher = erzeugeAktivitaetsSpeicher({ jetzt: () => `2026-10-03T10:00:${String(n++ % 60).padStart(2, '0')}Z` })
  speicher.starte('lauf-a')
  for (let i = 0; i < 120; i++) speicher.melde('lauf-a', { werkzeug: 'Read', ziel: `datei-${i}.md` })
  const stand = speicher.lese('lauf-a')
  assert.equal(stand.eintraege.length, AKTIVITAET_GRENZE)
  assert.equal(stand.anzahlGesamt, 120)
  assert.equal(stand.grenze, 50)
  assert.equal(stand.eintraege[0].ziel, 'datei-119.md')
  assert.equal(stand.eintraege.at(-1).ziel, 'datei-70.md')
  assert.deepEqual(Object.keys(stand.eintraege[0]).sort(), ['art', 'werkzeug', 'zeit', 'ziel'])
})

test('Reset: starte verwirft den vorigen Lauf, beende löscht den Puffer, die Map hält höchstens einen Lauf', () => {
  const speicher = erzeugeAktivitaetsSpeicher()
  speicher.starte('lauf-a')
  speicher.melde('lauf-a', { werkzeug: 'Edit', ziel: 'a.js' })
  speicher.starte('lauf-b')
  assert.equal(speicher.lese('lauf-a'), null)
  assert.equal(speicher.lese('lauf-b').anzahlGesamt, 0)
  assert.equal(speicher.anzahlLaeufe(), 1)
  // Ein spätes beende des alten Laufs lässt den neuen stehen.
  speicher.beende('lauf-a')
  assert.notEqual(speicher.lese('lauf-b'), null)
  speicher.beende('lauf-b')
  assert.equal(speicher.lese('lauf-b'), null)
  assert.equal(speicher.anzahlLaeufe(), 0)
  // Viele Läufe hintereinander: keine wachsende Struktur.
  for (let i = 0; i < 500; i++) {
    speicher.starte(`lauf-${i}`)
    speicher.melde(`lauf-${i}`, { werkzeug: 'Bash', ziel: 'npm run check' })
    speicher.beende(`lauf-${i}`)
  }
  assert.equal(speicher.anzahlLaeufe(), 0)
})

test('Fremde laufId: melde wird verworfen, lese liefert null', () => {
  const speicher = erzeugeAktivitaetsSpeicher()
  speicher.starte('lauf-a')
  speicher.melde('lauf-alt', { werkzeug: 'Write', ziel: 'fremd.js' })
  assert.equal(speicher.lese('lauf-a').anzahlGesamt, 0)
  assert.deepEqual(speicher.lese('lauf-a').beruehrteDateien, [])
  assert.equal(speicher.lese('lauf-alt'), null)
  // Ohne gestarteten Lauf nimmt der Speicher nichts an.
  const leer = erzeugeAktivitaetsSpeicher()
  leer.melde('lauf-x', { werkzeug: 'Read', ziel: 'x' })
  assert.equal(leer.anzahlLaeufe(), 0)
})

test('Kürzung: Ziel auf 300 Zeichen mit „…“, Werkzeugname begrenzt, kein halbes Ersatzpaar', () => {
  const speicher = erzeugeAktivitaetsSpeicher()
  speicher.starte('lauf-a')
  speicher.melde('lauf-a', { werkzeug: `mcp__${'x'.repeat(500)}`, ziel: 'a'.repeat(1000) })
  const [eintrag] = speicher.lese('lauf-a').eintraege
  assert.equal(Array.from(eintrag.ziel).length, ZIEL_MAX_ZEICHEN)
  assert.ok(eintrag.ziel.endsWith('…'))
  assert.ok(eintrag.werkzeug.length <= 100)
  assert.equal(eintrag.art, 'faehigkeit')
  assert.equal(kuerze('😀😀😀', 2), '😀…')
  assert.equal(kuerze('', 5), null)
  speicher.melde('lauf-a', { werkzeug: 'Glob', ziel: null })
  assert.equal(speicher.lese('lauf-a').eintraege[0].ziel, null)
})

test('Berührte Dateien: nur schreibende Werkzeuge, eindeutig, gekappt bei 100', () => {
  const speicher = erzeugeAktivitaetsSpeicher()
  speicher.starte('lauf-a')
  speicher.melde('lauf-a', { werkzeug: 'Read', ziel: 'gelesen.md' })
  speicher.melde('lauf-a', { werkzeug: 'Edit', ziel: 'a.js' })
  speicher.melde('lauf-a', { werkzeug: 'Write', ziel: 'a.js' })
  speicher.melde('lauf-a', { werkzeug: 'Bash', ziel: 'rm a.js' })
  speicher.melde('lauf-a', { werkzeug: 'Edit', ziel: null })
  assert.deepEqual(speicher.lese('lauf-a').beruehrteDateien, ['a.js'])
  for (let i = 0; i < 150; i++) speicher.melde('lauf-a', { werkzeug: 'Edit', ziel: `f-${i}.js` })
  const stand = speicher.lese('lauf-a')
  assert.equal(stand.beruehrteDateien.length, BERUEHRT_GRENZE)
  assert.equal(stand.beruehrteGekappt, true)
  // lese liefert Kopien: Änderungen am Ergebnis wirken nicht auf den Puffer.
  stand.eintraege[0].ziel = 'manipuliert'
  stand.beruehrteDateien.push('x')
  assert.notEqual(speicher.lese('lauf-a').eintraege[0].ziel, 'manipuliert')
  assert.equal(speicher.lese('lauf-a').beruehrteDateien.length, BERUEHRT_GRENZE)
})

test('HTTP: GET /api/laeufe/<laufId> liefert aktivitaet nur für den aktiven Lauf und nach Laufende null', async () => {
  const basisVerzeichnis = `kontrollzustand-test-f46-d5-${randomUUID()}`
  const profil = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
  const fremdId = `f46-d5-fremd-${randomUUID()}`
  schreibeWirkungsmarke(fremdId, profil, 'run_prepared', {}, { basisVerzeichnis, schreiber: () => {} })
  /** Der Ersatz-Lauf meldet drei Aufrufe und endet erst, wenn der Test es sagt. */
  let beendeLauf
  const laufEnde = new Promise((resolve) => {
    beendeLauf = resolve
  })
  let gestarteteLaufId = null
  const fuehreAufgabeDurchFn = async (laufId, profilReferenz, _eingaben, optionen) => {
    gestarteteLaufId = laufId
    schreibeWirkungsmarke(laufId, profilReferenz, 'run_prepared', {}, { basisVerzeichnis, schreiber: () => {} })
    optionen.beiWerkzeugaufruf({ werkzeug: 'Read', ziel: 'CLAUDE.md' })
    optionen.beiWerkzeugaufruf({ werkzeug: 'Edit', ziel: 'public/leitstand/<b>x</b>.js' })
    optionen.beiWerkzeugaufruf({ werkzeug: 'Bash', ziel: 'npm run check' })
    await laufEnde
    return { ok: false, grund: 'Testende' }
  }
  const auftragId = `f46-d5-auftrag-${randomUUID()}`
  registriereAuftrag(auftragId, profil, 'Ringpuffer-Test', 'Ringpuffer-Test', { basisVerzeichnis, schreiber: () => {} })
  const server = createServer(erzeugeRequestHandler({ basisVerzeichnis, fuehreAufgabeDurchFn, startvorlagePfad: 'startvorlagen/beispielprojekt.json' }))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const basis = `http://127.0.0.1:${server.address().port}`
  try {
    const start = await fetch(`${basis}/api/laeufe`, {
      method: 'POST',
      body: JSON.stringify({ laufId: `f46-d5-lauf-${randomUUID()}`, rolle: 'ausfuehrung', anfragen: [], budget: {}, aufrufEingaben: { modell: 'test-modell' }, werkzeugsatz: 'lesend', auftragId }),
    })
    assert.equal(start.status, 202, await start.text())
    for (let i = 0; i < 50 && gestarteteLaufId === null; i++) await new Promise((r) => setTimeout(r, 20))
    const detail = await (await fetch(`${basis}/api/laeufe/${gestarteteLaufId}`)).json()
    assert.equal(detail.aktiv, true)
    assert.equal(detail.aktivitaet.anzahlGesamt, 3)
    assert.deepEqual(
      detail.aktivitaet.eintraege.map((e) => [e.werkzeug, e.art]),
      [
        ['Bash', 'befehl'],
        ['Edit', 'aendert'],
        ['Read', 'liest'],
      ]
    )
    assert.deepEqual(detail.aktivitaet.beruehrteDateien, ['public/leitstand/<b>x</b>.js'])
    assert.deepEqual(detail.fortschritt, { werkzeug: 'Bash', ziel: 'npm run check' })
    const fremd = await (await fetch(`${basis}/api/laeufe/${fremdId}`)).json()
    assert.equal(fremd.aktivitaet, null)

    beendeLauf()
    for (let i = 0; i < 50; i++) {
      const stand = await (await fetch(`${basis}/api/laeufe/${gestarteteLaufId}`)).json()
      if (stand.aktiv === false) {
        assert.equal(stand.aktivitaet, null)
        assert.equal(stand.fortschritt, null)
        return
      }
      await new Promise((r) => setTimeout(r, 20))
    }
    assert.fail('Lauf wurde nicht als beendet gemeldet')
  } finally {
    beendeLauf()
    await new Promise((resolve) => server.close(resolve))
    raeumeVerzeichnis(basisVerzeichnis)
  }
})
