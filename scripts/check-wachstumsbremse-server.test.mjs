/**
 * Datei: scripts/check-wachstumsbremse-server.test.mjs
 *
 * Zweck: node:test-Fälle des Gates F45 W1 „Wachstumsbremse Leitstand-Server“ (scripts/check-wachstumsbremse-server.mjs,
 * features/F45/plan-w1-v2.md): jeder Fall (a1)–(a3), (b1)–(b3), (f) einzeln rot und sein Gegenstück grün, an Texten im
 * Speicher und mit injiziertem git — rein, ohne Schreiben. Ein Fall liest die echte Serverdatei und die echte JSON (Bestand =
 * Erhebung, straffe Ratsche).
 *
 * Wird aufgerufen von:
 * - npm run test (node --test)
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { BREMSE_PFAD, erhebeRouten, ladeBremse, leseReferenz, pruefeBremseForm, pruefeWachstumsbremse, SERVER_PFAD, zaehleZeilen } from './check-wachstumsbremse-server.mjs'

const SERVER = [
  "if (pfad === '/api/a') {}",
  "if (req.method === 'GET' && pfad.startsWith('/api/b/') && pfad.endsWith('/c')) {}",
  'const t = /^\\/api\\/d\\/([^/]+)\\/e$/.exec(pfad)',
  "if (typeof e?.pfad === 'string') {}",
  "// pfad === '/api/kommentar'",
  "  * pfad.startsWith('/api/kommentar/')",
  'const fuellung = 0',
  '',
].join('\n')
/** Füllzeile: ersetzt ⇒ gleiche Zeilenzahl, entfernt ⇒ eine Zeile weniger. */
const FUELLUNG = 'const fuellung = 0\n'
const ROUTEN = { gleich: ['/api/a'], beginnt: ['/api/b/'], endet: ['/c'], muster: ['/^\\/api\\/d\\/([^/]+)\\/e$/'] }
const BREMSE = { obergrenze_zeilen: 7, routen: ROUTEN }
const kopie = (wert) => structuredClone(wert)
const pruefe = (serverText, bremse = BREMSE, bremseMain = null) => pruefeWachstumsbremse({ serverText, bremse, bremseMain })
/** Präfixe (a1)… der Befunde. */
const faelle = (befunde) => befunde.map((b) => b.slice(0, 4))

test('zaehleZeilen: CRLF und LF gleich; letzte Zeile ohne Umbruch zählt', () => {
  assert.equal(zaehleZeilen('a\nb\n'), 2)
  assert.equal(zaehleZeilen('a\r\nb\r\n'), 2)
  assert.equal(zaehleZeilen('a\nb'), 2)
  assert.equal(zaehleZeilen(''), 0)
})

test('erhebeRouten: vier Arten, nur Literale mit /, Kommentarzeilen und fremde pfad-Felder zählen nicht', () => {
  assert.deepEqual(erhebeRouten(SERVER), ROUTEN)
  assert.deepEqual(erhebeRouten("if (pfad !== '/x' || '/y' === pfad) {}").gleich, ['/x', '/y'])
  assert.deepEqual(erhebeRouten('const m = /^\\/z$/i.test(pfad)').muster, ['/^\\/z$/i'])
  // Korrekturrunde (code-reviewer 2, qa 4): ==, Backtick ohne ${, case, pfad.match; Template mit ${ zählt nicht.
  assert.deepEqual(erhebeRouten("if (pfad == '/l') {}\nif (pfad === `/t`) {}\nswitch (pfad) { case '/c': }\nif (pfad === `/x/${id}`) {}").gleich, ['/c', '/l', '/t'])
  assert.deepEqual(erhebeRouten('const t = pfad.match(/^\\/api\\/m$/)').muster, ['/^\\/api\\/m$/'])
  // CRLF-Arbeitskopie: dieselbe Erhebung.
  assert.deepEqual(erhebeRouten(SERVER.replace(/\n/g, '\r\n')), ROUTEN)
})

test('Ausgangslage grün: Zeilen = Grenze, Routen = Bestand, Referenz gleich', () => {
  assert.deepEqual(pruefe(SERVER, BREMSE, BREMSE), [])
})

test('(a1) eine Zeile über der Grenze ⇒ rot', () => {
  assert.deepEqual(faelle(pruefe(`${SERVER}const neu = 1\n`)), ['(a1)'])
})

test('(a3) straff: eine Zeile unter der Grenze ⇒ rot; Grenze nachgezogen ⇒ grün', () => {
  const kuerzer = SERVER.replace(FUELLUNG, '')
  assert.equal(zaehleZeilen(kuerzer), 6)
  assert.deepEqual(faelle(pruefe(kuerzer)), ['(a3)'])
  assert.deepEqual(pruefe(kuerzer, { ...BREMSE, obergrenze_zeilen: 6 }, BREMSE), [])
})

test('(a2) Grenze gegenüber main angehoben ⇒ rot; gleich oder gesenkt ⇒ kein (a2); ohne Referenz ⇒ kein (a2)', () => {
  const angehoben = { ...BREMSE, obergrenze_zeilen: 8 }
  assert.deepEqual(faelle(pruefe(`${SERVER}x\n`, angehoben, BREMSE)), ['(a2)'])
  assert.deepEqual(pruefe(`${SERVER}x\n`, angehoben, null), [])
  assert.deepEqual(pruefe(SERVER, BREMSE, { ...BREMSE, obergrenze_zeilen: 9 }), [])
})

test('(b1) neue Route im Server ⇒ rot, je Art', () => {
  for (const [zeile, art] of [
    ["if (pfad === '/api/neu') {}", 'gleich'],
    ["if (pfad.startsWith('/api/neu/')) {}", 'beginnt'],
    ["if (pfad.endsWith('/neu')) {}", 'endet'],
    ['const t = /^\\/api\\/neu$/.exec(pfad)', 'muster'],
  ]) {
    // Ersetzt die Füllzeile: gleiche Zeilenzahl, nur (b1) feuert.
    const befunde = pruefe(SERVER.replace(FUELLUNG, `${zeile}\n`))
    assert.deepEqual(faelle(befunde), ['(b1)'], `${art}: ${befunde.join(' | ')}`)
    assert.match(befunde[0], new RegExp(`\\(${art}\\)`))
  }
})

test('(b3) straff: Route aus dem Server entfernt, Bestand nicht nachgezogen ⇒ rot; nachgezogen ⇒ grün', () => {
  const ohne = SERVER.replace("if (pfad === '/api/a') {}", '')
  assert.deepEqual(faelle(pruefe(ohne)), ['(b3)'])
  const nachgezogen = kopie(BREMSE)
  nachgezogen.routen.gleich = []
  assert.deepEqual(pruefe(ohne, nachgezogen, BREMSE), [])
})

test('(b2) Bestand gegenüber main erweitert ⇒ rot (auch wenn der Server die Route trägt); ohne Referenz ⇒ kein (b2)', () => {
  const mitNeu = SERVER.replace(FUELLUNG, "if (pfad === '/api/neu') {}\n")
  const erweitert = kopie(BREMSE)
  erweitert.routen.gleich.push('/api/neu')
  assert.deepEqual(faelle(pruefe(mitNeu, erweitert, BREMSE)), ['(b2)'])
  assert.deepEqual(pruefe(mitNeu, erweitert, null), [])
})

test('(f) Form der Bremse: Grenze positive Ganzzahl, vier Listen von Strings', () => {
  assert.deepEqual(pruefeBremseForm(BREMSE), [])
  assert.notEqual(pruefeBremseForm(null).length, 0)
  assert.notEqual(pruefeBremseForm({ ...BREMSE, obergrenze_zeilen: 0 }).length, 0)
  assert.notEqual(pruefeBremseForm({ ...BREMSE, obergrenze_zeilen: '6' }).length, 0)
  const ohneMuster = kopie(BREMSE)
  delete ohneMuster.routen.muster
  assert.notEqual(pruefeBremseForm(ohneMuster).length, 0)
})

test('leseReferenz: Toplevel ≠ Wurzel, kein git, keine Basis, fehlende Datei ⇒ null mit Hinweis; sonst Bremse der merge-base', () => {
  const wurzel = process.cwd()
  const git = (antworten) => (argumente) => {
    const antwort = antworten[argumente.join(' ')]
    if (antwort === undefined) throw new Error('git: nicht gefunden')
    return antwort
  }
  assert.equal(leseReferenz(wurzel, git({})).bremse, null)
  assert.equal(leseReferenz(wurzel, git({ 'rev-parse --show-toplevel': `${join(wurzel, '..')}\n` })).bremse, null)
  assert.match(leseReferenz(wurzel, git({ 'rev-parse --show-toplevel': `${wurzel}\n` })).hinweis, /weder origin\/main noch main/)
  const ohneDatei = leseReferenz(wurzel, git({ 'rev-parse --show-toplevel': `${wurzel}\n`, 'merge-base HEAD origin/main': 'abc1234\n' }))
  assert.equal(ohneDatei.bremse, null)
  assert.match(ohneDatei.hinweis, /vor dem ersten Merge/)
  const mitMain = leseReferenz(wurzel, git({ 'rev-parse --show-toplevel': `${wurzel}\n`, 'merge-base HEAD main': 'def5678\n', [`show def5678:${BREMSE_PFAD}`]: JSON.stringify(BREMSE) }))
  assert.deepEqual(mitMain.bremse, BREMSE)
  assert.match(mitMain.hinweis, /merge-base mit main/)
  // Korrekturrunde: jeder Hinweis ohne Referenz sagt, dass (a2)/(b2) nicht geprüft sind.
  assert.match(ohneDatei.hinweis, /\(a2\)\/\(b2\) nicht geprüft/)
  const basis = { 'rev-parse --show-toplevel': `${wurzel}\n`, 'merge-base HEAD origin/main': 'abc1234\n', 'merge-base HEAD main': 'def5678\n' }
  // Vorrang origin/main vor main.
  const beide = leseReferenz(wurzel, git({ ...basis, [`show abc1234:${BREMSE_PFAD}`]: JSON.stringify(BREMSE), [`show def5678:${BREMSE_PFAD}`]: JSON.stringify({ ...BREMSE, obergrenze_zeilen: 1 }) }))
  assert.equal(beide.bremse?.obergrenze_zeilen, 7)
  // Veraltetes origin/main ohne Datei, lokales main mit Datei ⇒ main (code-reviewer 5b, qa 3).
  assert.match(leseReferenz(wurzel, git({ ...basis, [`show def5678:${BREMSE_PFAD}`]: JSON.stringify(BREMSE) })).hinweis, /merge-base mit main/)
  // Kaputt bzw. unvollständig auf der Basis ⇒ eigener Grund, nicht „fehlt“ (code-reviewer 5a).
  for (const kaputt of ['{', JSON.stringify({ obergrenze_zeilen: 7 })]) {
    const ergebnis = leseReferenz(wurzel, git({ ...basis, [`show abc1234:${BREMSE_PFAD}`]: kaputt }))
    assert.equal(ergebnis.bremse, null)
    assert.match(ergebnis.hinweis, /kein gültiger Stand/)
  }
  // Gestapelter Branch nach Squash-Merge: merge-base ohne Datei, Spitze von origin/main mit Datei (qa 2).
  const spitze = leseReferenz(wurzel, git({ ...basis, [`show origin/main:${BREMSE_PFAD}`]: JSON.stringify(BREMSE) }))
  assert.deepEqual(spitze.bremse, BREMSE)
  assert.match(spitze.hinweis, /Spitze von origin\/main.*main einmergen/)
})

test('(f) ladeBremse: fehlt, kein JSON, unvollständig ⇒ Befund (f) und keine Bremse; gültig ⇒ Bremse', () => {
  for (const text of [null, '{', JSON.stringify({ obergrenze_zeilen: 7 })]) {
    const { bremse, befunde } = ladeBremse(text)
    assert.equal(bremse, null)
    assert.equal(befunde.length > 0 && befunde.every((b) => b.startsWith('(f)')), true, JSON.stringify(befunde))
  }
  assert.deepEqual(ladeBremse(JSON.stringify(BREMSE)), { bremse: BREMSE, befunde: [] })
})

test('Echter Stand: Erhebung des Servers = Bestand der JSON, Zeilen = Grenze (straffe Ratsche, liest die echten Dateien)', () => {
  const wurzel = join(import.meta.dirname, '..')
  const bremse = JSON.parse(readFileSync(join(wurzel, BREMSE_PFAD), 'utf8'))
  assert.deepEqual(pruefe(readFileSync(join(wurzel, SERVER_PFAD), 'utf8'), bremse, null), [])
})
