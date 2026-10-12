/**
 * Datei: src/sammlung/pruefbericht.test.ts
 *
 * Zweck: Tests des Prüfberichts (F45 F-2b-2): Validator gegen Schema-Beispiele (grün/rot) und gegen den Pin (typ/Version),
 * Payload, waehleBericht (ohne/veraltet/NICHT_GEEIGNET → Sperre, passend → frei, neuester gilt, Skill-Pfad an Segmentgrenze,
 * npm Version + Integrity) und die Ablage im Kontrollzustand.
 *
 * Wird aufgerufen von: npm run test (node --test).
 */

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { raeumeVerzeichnis } from '../../scripts/_aufraeumen.ts'
import { type GespeicherterBericht, ladePruefberichte, type PruefberichtDaten, type PruefQuelle, registrierePruefbericht, validiereErgebnisEignungspruefung, validierePruefberichtDaten, vergleicheInhalt, versionVon, waehleBericht } from './pruefbericht.ts'

const BEISPIELE = join(import.meta.dirname, '..', '..', 'schemas', 'examples')
const lese = (name: string): unknown => JSON.parse(readFileSync(join(BEISPIELE, name), 'utf8'))

test('Validator: Beispiele grün und rot', () => {
  assert.deepEqual(validiereErgebnisEignungspruefung(lese('ergebnis-eignungspruefung.valid.json')), [])
  assert.match(validiereErgebnisEignungspruefung(lese('ergebnis-eignungspruefung.invalid-auflagen-leer.json')).join(), /mindestens einen Eintrag/)
  assert.match(validiereErgebnisEignungspruefung(lese('ergebnis-eignungspruefung.invalid-bereich.json')).join(), /bereich/)
  assert.match(validiereErgebnisEignungspruefung({ ...(lese('ergebnis-eignungspruefung.valid.json') as object), extra: 1 }).join(), /unbekanntes Feld 'extra'/)
  assert.deepEqual(validiereErgebnisEignungspruefung(null), ['Ergebnis muss ein Objekt sein'])
})

/** Ein gültiger Payload (Beispieldatei) mit Überschreibungen. */
function bericht(teile: { quelle?: PruefQuelle; urteil?: string; erstellt?: string; katalog?: string | null }, version = 1, id = 'pruefbericht-x'): GespeicherterBericht {
  const basis = lese('kontrollzustand-pruefbericht-payload.valid.json') as PruefberichtDaten
  const quelle = teile.quelle ?? basis.quelle
  const daten: PruefberichtDaten = {
    ...basis,
    quelle,
    typ: quelle.art === 'git' ? 'skill' : 'mcp',
    katalog_id: teile.katalog === undefined ? basis.katalog_id : teile.katalog,
    erstellt_am: teile.erstellt ?? basis.erstellt_am,
    ergebnis: { ...basis.ergebnis, typ: quelle.art === 'git' ? 'skill' : 'mcp', gepinnte_version: versionVon(quelle), urteil: (teile.urteil ?? 'GEEIGNET') as PruefberichtDaten['ergebnis']['urteil'], auflagen: teile.urteil === 'MIT_AUFLAGEN' ? ['a'] : [] },
  }
  assert.deepEqual(validierePruefberichtDaten(daten), [])
  return { artefakt_id: id, version, daten }
}

const SHA_A = 'a'.repeat(40)
const SHA_B = 'b'.repeat(40)
const git = (sha: string, pfad = ''): PruefQuelle => ({ art: 'git', repo: 'https://github.com/Owner/Repo.git', ref: 'HEAD', sha, pfad })
const npmQ = (version: string, integrity = 'sha512-x'): PruefQuelle => ({ art: 'npm', paket: '@upstash/context7-mcp', version, integrity })

test('Payload: Beispiele grün und rot (Version ≠ Quelle)', () => {
  assert.deepEqual(validierePruefberichtDaten(lese('kontrollzustand-pruefbericht-payload.valid.json')), [])
  assert.match(validierePruefberichtDaten(lese('kontrollzustand-pruefbericht-payload.invalid-version.json')).join(), /gepinnte Version/)
  assert.match(validierePruefberichtDaten({ ...(lese('kontrollzustand-pruefbericht-payload.valid.json') as object), katalog_id: null }).join(), /katalog_id' oder 'sammlung_id/)
})

test('waehleBericht: ohne / veraltet / NICHT_GEEIGNET sperren, passend gibt frei, neuester gilt', () => {
  const angezeigtGit = { art: 'git' as const, repo: 'https://github.com/owner/repo', sha: SHA_A, quellPfad: 'skills/x' }
  assert.match(String(waehleBericht([], angezeigtGit).sperre), /ohne Prüfbericht/)
  assert.match(String(waehleBericht([bericht({ quelle: git(SHA_B) })], angezeigtGit).sperre), new RegExp(`nur für ${SHA_B}`))
  assert.equal(waehleBericht([bericht({ quelle: git(SHA_A) })], angezeigtGit).sperre, null)
  // Pfad: Bericht über 'skills' passt zu 'skills/x', über 'skill' nicht (Segmentgrenze), über 'skills/y' nicht.
  assert.equal(waehleBericht([bericht({ quelle: git(SHA_A, 'skills') })], angezeigtGit).sperre, null)
  assert.match(String(waehleBericht([bericht({ quelle: git(SHA_A, 'skill') })], angezeigtGit).sperre), /ohne Prüfbericht/)
  assert.match(String(waehleBericht([bericht({ quelle: git(SHA_A, 'skills/y') })], angezeigtGit).sperre), /ohne Prüfbericht/)
  // Neuester gilt: erst GEEIGNET, später NICHT_GEEIGNET → gesperrt; umgekehrt frei.
  const alt = bericht({ quelle: git(SHA_A), erstellt: '2026-10-12T10:00:00.000Z' }, 1, 'pruefbericht-s-skills-x')
  const neu = bericht({ quelle: git(SHA_A), urteil: 'NICHT_GEEIGNET', erstellt: '2026-10-12T11:00:00.000Z' }, 1, 'pruefbericht-impeccable')
  assert.match(String(waehleBericht([alt, neu], angezeigtGit).sperre), /NICHT_GEEIGNET/)
  assert.equal(waehleBericht([{ ...neu, daten: { ...neu.daten, erstellt_am: '2026-10-12T09:00:00.000Z' } }, alt], angezeigtGit).sperre, null)
  // Gleichstand der Zeit: höhere Version gewinnt.
  const v2 = bericht({ quelle: git(SHA_A), urteil: 'NICHT_GEEIGNET', erstellt: alt.daten.erstellt_am }, 2, alt.artefakt_id)
  assert.match(String(waehleBericht([alt, v2], angezeigtGit).sperre), /NICHT_GEEIGNET/)
  // npm: Version UND Integrity müssen passen.
  const angezeigtNpm = { art: 'npm' as const, paket: '@upstash/context7-mcp', version: '4.3.0', integrity: 'sha512-x' }
  assert.equal(waehleBericht([bericht({ quelle: npmQ('4.3.0') })], angezeigtNpm).sperre, null)
  assert.match(String(waehleBericht([bericht({ quelle: npmQ('4.3.0', 'sha512-y') })], angezeigtNpm).sperre), /nur für 4\.3\.0 \(sha512-y…\), angezeigt ist 4\.3\.0 \(sha512-x…\)/)
  assert.match(String(waehleBericht([bericht({ quelle: npmQ('4.2.0') })], angezeigtNpm).sperre), /nur für 4\.2\.0 [^,]*, angezeigt ist 4\.3\.0/)
})

test('registrierePruefbericht/ladePruefberichte: Ablage mit Lineage, alle Versionen, ungültig wird abgelehnt', () => {
  const basis = mkdtempSync(join(tmpdir(), 'aiw-test-pruefbericht-'))
  try {
    const profil = { pfad: 'profiles/test.json', hash: 'a'.repeat(64), version: 1 }
    const b = bericht({ quelle: git(SHA_A) })
    const r1 = registrierePruefbericht('impeccable', b.daten, { inhaltsHash: 'c'.repeat(64) }, profil, { basisVerzeichnis: basis, schreiber: () => {} })
    registrierePruefbericht('impeccable', bericht({ quelle: git(SHA_B) }).daten, null, profil, { basisVerzeichnis: basis, schreiber: () => {} })
    assert.equal(r1.artefakt_id, 'pruefbericht-impeccable')
    const geladen = ladePruefberichte(basis, () => {})
    assert.deepEqual(geladen.map((g) => g.version).sort(), [1, 2])
    assert.throws(() => registrierePruefbericht('x', { ...b.daten, typ: 'agent' }, null, profil, { basisVerzeichnis: basis, schreiber: () => {} }), /ergebnis\.typ/)
    assert.deepEqual(ladePruefberichte(join(basis, 'fehlt')), [])
  } finally {
    raeumeVerzeichnis(basis)
  }
})

test('vergleicheInhalt (F-1075): installiert = geprüft (Pfade + sha256), sonst Grund; node_modules ausgenommen; Unterpfad', () => {
  const ordner = mkdtempSync(join(tmpdir(), 'aiw-test-vergleich-'))
  try {
    const h = (s: string) => createHash('sha256').update(s).digest('hex')
    mkdirSync(join(ordner, 'dist'), { recursive: true })
    writeFileSync(join(ordner, 'SKILL.md'), 'a')
    writeFileSync(join(ordner, 'dist', 'x.js'), 'b')
    const mit = (dateien: Array<{ pfad: string; sha256: string }>) => ({ ...bericht({ quelle: git(SHA_A) }), daten: { ...bericht({ quelle: git(SHA_A) }).daten, inhalt: { dateien } } })
    const geprueft = [{ pfad: 'SKILL.md', sha256: h('a') }, { pfad: 'dist/x.js', sha256: h('b') }]
    // Grün: genau gleich.
    assert.equal(vergleicheInhalt(mit(geprueft), ordner, { unterpfad: '' }), null)
    // Grün: Bericht über den höheren Pfad, installiert ist der Unterordner.
    assert.equal(vergleicheInhalt(mit(geprueft.map((d) => ({ ...d, pfad: `skills/x/${d.pfad}` }))), ordner, { unterpfad: 'skills/x' }), null)
    // Rot: anderer Hash, zusätzliche Datei, fehlende Datei.
    assert.match(String(vergleicheInhalt(mit([{ pfad: 'SKILL.md', sha256: h('anders') }, geprueft[1]]), ordner, { unterpfad: '' })), /SKILL\.md \(Inhalt anders als geprüft\)/)
    assert.match(String(vergleicheInhalt(mit([geprueft[0]]), ordner, { unterpfad: '' })), /dist\/x\.js \(nicht geprüft\)/)
    assert.match(String(vergleicheInhalt(mit([...geprueft, { pfad: 'fehlt.md', sha256: h('c') }]), ordner, { unterpfad: '' })), /fehlt\.md \(geprüft, aber nicht installiert\)/)
    // node_modules der obersten Ebene (npm: Abhängigkeiten) gehört nicht zum geprüften Paket.
    mkdirSync(join(ordner, 'node_modules', 'dep'), { recursive: true })
    writeFileSync(join(ordner, 'node_modules', 'dep', 'i.js'), 'd')
    assert.match(String(vergleicheInhalt(mit(geprueft), ordner, { unterpfad: '' })), /node_modules\/dep\/i\.js \(nicht geprüft\)/)
    assert.equal(vergleicheInhalt(mit(geprueft), ordner, { unterpfad: '', ohne: ['node_modules'] }), null)
    // F-1075 Runde 3 rot: trägt der Bericht selbst einen node_modules-Pfad, gibt es keine Ausnahme — Abbruch.
    assert.match(String(vergleicheInhalt(mit([...geprueft, { pfad: 'node_modules/dep/i.js', sha256: h('d') }]), ordner, { unterpfad: '', ohne: ['node_modules'] })), /ausgenommene Ordner/)
  } finally {
    raeumeVerzeichnis(ordner)
  }
})

test('Validator: typ und gepinnte_version müssen dem Pin entsprechen', () => {
  const gueltig = lese('ergebnis-eignungspruefung.valid.json') as { typ: string; gepinnte_version: string }
  assert.deepEqual(validiereErgebnisEignungspruefung(gueltig, { typ: 'skill', version: gueltig.gepinnte_version }), [])
  assert.match(validiereErgebnisEignungspruefung(gueltig, { typ: 'agent', version: gueltig.gepinnte_version }).join(), /vorgegeben war 'agent'/)
  assert.match(validiereErgebnisEignungspruefung(gueltig, { typ: 'skill', version: 'a'.repeat(40) }).join(), /gepinnte_version/)
})
