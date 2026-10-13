/**
 * Datei: src/sammlung/pruefbericht.test.ts
 *
 * Zweck: Tests des Prüfberichts (F45 F-2b-2): Validator gegen Schema-Beispiele (grün/rot) und gegen den Pin (typ/Version),
 * Payload, waehleBericht (ohne/veraltet/NICHT_GEEIGNET → Sperre, passend → frei, neuester gilt, Skill-Pfad an Segmentgrenze,
 * npm Version + Integrity) und die Ablage im Kontrollzustand. F45 F-2b-2c (F-1078 (b)): übersprungene Dateien sperren, der
 * Inhalts-Abgleich nennt sie.
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
/** Volle sha512-SRI (F-1074 (9)) mit erkennbarem Anfang. */
const sri = (z: string): string => `sha512-${z.repeat(86)}==`
const npmQ = (version: string, integrity = sri('x')): PruefQuelle => ({ art: 'npm', paket: '@upstash/context7-mcp', version, integrity })

test('Payload: Beispiele grün und rot (Version ≠ Quelle)', () => {
  assert.deepEqual(validierePruefberichtDaten(lese('kontrollzustand-pruefbericht-payload.valid.json')), [])
  assert.match(validierePruefberichtDaten(lese('kontrollzustand-pruefbericht-payload.invalid-version.json')).join(), /gepinnte Version/)
  assert.match(validierePruefberichtDaten({ ...(lese('kontrollzustand-pruefbericht-payload.valid.json') as object), katalog_id: null }).join(), /katalog_id' oder 'sammlung_id/)
  // F-1074 (9): Integrity in voller Form (SHA512_INTEGRITY), nicht nur mit Präfix „sha512-“.
  const gueltig = lese('kontrollzustand-pruefbericht-payload.valid.json') as { quelle: object }
  assert.match(validierePruefberichtDaten({ ...gueltig, quelle: { ...gueltig.quelle, integrity: 'sha512-x' } }).join(), /sha512-SRI/)
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
  const angezeigtNpm = { art: 'npm' as const, paket: '@upstash/context7-mcp', version: '4.3.0', integrity: sri('x') }
  assert.equal(waehleBericht([bericht({ quelle: npmQ('4.3.0') })], angezeigtNpm).sperre, null)
  assert.match(String(waehleBericht([bericht({ quelle: npmQ('4.3.0', sri('y')) })], angezeigtNpm).sperre), /nur für 4\.3\.0 \(sha512-y{12}…\), angezeigt ist 4\.3\.0 \(sha512-x{12}…\)/)
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

test('vergleicheInhalt (F-1075): installiert = geprüft (Pfade + sha256), sonst Grund; Unterpfad; node_modules zählt (F-2b-2b)', () => {
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
    // F-2b-2b (b) rot: es gibt keine Ausnahme mehr — eine Datei unter node_modules im installierten Ordner, die nicht im
    // Bericht steht, ist eine Abweichung (früher npm: ohne ['node_modules']).
    mkdirSync(join(ordner, 'node_modules', 'hidden'), { recursive: true })
    writeFileSync(join(ordner, 'node_modules', 'hidden', 'index.js'), 'versteckt')
    assert.match(String(vergleicheInhalt(mit(geprueft), ordner, { unterpfad: '' })), /node_modules\/hidden\/index\.js \(nicht geprüft\)/)
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

/**
 * Bericht mit übersprungenen Dateien (F-1078 (b)).
 * @param quelle - Quelle
 * @param liste - übersprungene Einträge
 * @param jeGrund - Zählung (Standard: aus der Liste)
 * @returns Bericht
 */
function mitUebersprungen(quelle: PruefQuelle, liste: Array<{ pfad: string; grund: string }>, jeGrund?: Record<string, number>): GespeicherterBericht {
  const b = bericht({ quelle })
  const zaehlung = jeGrund ?? liste.reduce<Record<string, number>>((z, e) => ({ ...z, [e.grund]: (z[e.grund] ?? 0) + 1 }), {})
  return { ...b, daten: { ...b.daten, fakten: { ...b.daten.fakten, uebersprungen: { je_grund: zaehlung, liste: liste as PruefberichtDaten['fakten']['uebersprungen']['liste'] } } } }
}

test('waehleBericht (F-1078 (b)): übersprungene Dateien sperren — npm, Skill, höherer Pfad, gekürzte Liste, fehlende Angabe', () => {
  const angezeigtNpm = { art: 'npm' as const, paket: '@upstash/context7-mcp', version: '4.3.0', integrity: sri('x') }
  const npmB = mitUebersprungen(npmQ('4.3.0'), [{ pfad: 'logo.png', grund: 'binaer' }, { pfad: 'dist/big.js', grund: 'zu_gross' }])
  const w = waehleBericht([npmB], angezeigtNpm)
  assert.equal(w.bericht, npmB, 'der Bericht bleibt sichtbar')
  assert.equal(w.sperre, 'Prüflauf hat 2 Dateien übersprungen (binaer 1, zu_gross 1) — nicht installierbar (F-1078)')
  // Skill mit gleichem Pfad: jeder Grund zählt (Symlink bricht die Skill-Installation ohnehin ab).
  const angezeigtGit = { art: 'git' as const, repo: 'https://github.com/owner/repo', sha: SHA_A, quellPfad: 'skills/x' }
  assert.match(String(waehleBericht([mitUebersprungen(git(SHA_A, 'skills/x'), [{ pfad: 'link.md', grund: 'symlink' }])], angezeigtGit).sperre), /1 Datei übersprungen \(symlink 1\)/)
  // Höherer Pfad, Liste vollständig: nur Einträge im installierten Pfad zählen (gleich oder darunter).
  const hoeher = (liste: Array<{ pfad: string; grund: string }>, jeGrund?: Record<string, number>) => mitUebersprungen(git(SHA_A, 'skills'), liste, jeGrund)
  assert.equal(waehleBericht([hoeher([{ pfad: 'y/bild.png', grund: 'binaer' }])], angezeigtGit).sperre, null, 'außerhalb des installierten Pfads')
  assert.match(String(waehleBericht([hoeher([{ pfad: 'x/bild.png', grund: 'binaer' }])], angezeigtGit).sperre), /1 Datei übersprungen/)
  assert.match(String(waehleBericht([hoeher([{ pfad: 'x', grund: 'symlink' }])], angezeigtGit).sperre), /symlink 1/, 'der Ordner selbst')
  assert.equal(waehleBericht([hoeher([{ pfad: 'xy/a.png', grund: 'binaer' }])], angezeigtGit).sperre, null, 'Segmentgrenze')
  // Gekürzte Liste (Summe ≠ Länge): alle zählen (fail-closed).
  assert.match(String(waehleBericht([hoeher([{ pfad: 'y/a.png', grund: 'binaer' }], { binaer: 30 })], angezeigtGit).sperre), /30 Dateien übersprungen/)
  // Ohne lesbare Angabe → Sperre.
  const ohne = bericht({ quelle: npmQ('4.3.0') })
  const kaputt = { ...ohne, daten: { ...ohne.daten, fakten: { ...ohne.daten.fakten, uebersprungen: undefined as unknown as PruefberichtDaten['fakten']['uebersprungen'] } } }
  assert.match(String(waehleBericht([kaputt], angezeigtNpm).sperre), /ohne lesbare Angabe übersprungener Dateien/)
  // NICHT_GEEIGNET bleibt der erste Grund.
  assert.match(String(waehleBericht([{ ...npmB, daten: { ...npmB.daten, ergebnis: { ...npmB.daten.ergebnis, urteil: 'NICHT_GEEIGNET' } } }], angezeigtNpm).sperre), /NICHT_GEEIGNET/)
})

test('vergleicheInhalt (F-1078 (b)): ein im Prüflauf übersprungener Pfad heißt so (auch unter einem Unterpfad)', () => {
  const ordner = mkdtempSync(join(tmpdir(), 'aiw-test-vergleich-ue-'))
  try {
    const h = (s: string) => createHash('sha256').update(s).digest('hex')
    writeFileSync(join(ordner, 'SKILL.md'), 'a')
    writeFileSync(join(ordner, 'logo.png'), 'bild')
    const b = mitUebersprungen(git(SHA_A, 'skills'), [{ pfad: 'x/logo.png', grund: 'binaer' }])
    const mit = { ...b, daten: { ...b.daten, inhalt: { dateien: [{ pfad: 'x/SKILL.md', sha256: h('a') }] } } }
    assert.match(String(vergleicheInhalt(mit, ordner, { unterpfad: 'x' })), /logo\.png \(im Prüflauf übersprungen \(binaer\)\)/)
  } finally {
    raeumeVerzeichnis(ordner)
  }
})

test('uebersprungenSperre (Code-Review F-2b-2c 2a/2b): kaputte Listeneinträge → Sperre statt Wurf; übersprungener Ordner oberhalb zählt', () => {
  const angezeigtGit = { art: 'git' as const, repo: 'https://github.com/owner/repo', sha: SHA_A, quellPfad: 'skills/x/y' }
  const kaputt = mitUebersprungen(git(SHA_A, 'skills'), [{ pfad: 7 as unknown as string, grund: 'binaer' }])
  assert.match(String(waehleBericht([kaputt], angezeigtGit).sperre), /ohne lesbare Angabe übersprungener Dateien/)
  assert.match(String(waehleBericht([mitUebersprungen(git(SHA_A, 'skills'), [{ pfad: 'x', grund: 'symlink' }])], angezeigtGit).sperre), /symlink 1/, 'Ordner x oberhalb von x/y')
  assert.equal(waehleBericht([mitUebersprungen(git(SHA_A, 'skills'), [{ pfad: 'x/z', grund: 'binaer' }])], angezeigtGit).sperre, null, 'Geschwister zählt nicht')
})
