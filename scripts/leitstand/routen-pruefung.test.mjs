/**
 * Datei: scripts/leitstand/routen-pruefung.test.mjs
 *
 * Zweck: Tests der Bausteine des Prüflaufs (F45 F-2b-2a): Körperprüfung, Subjekt (Katalog/Sammlung, Paketangabe fehlt,
 * Bestandsschutz, Typ unbestimmt), Ausnahme-Begründung (Pflicht/unzulässig), Pin-Vergleich, Auftragstext (P5-Vertrag, Pin,
 * typ/Version exakt), Sammlung-Ergänzung (Stand „geprüft“, letzter Bericht) und das Aufräumen verwaister Prüfordner.
 *
 * Wird aufgerufen von: npm run test (node --test).
 */

import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { raeumeVerzeichnis } from '../_aufraeumen.ts'
import { baueAuftragstext, berichtKurz, bestimmeSubjekt, ergaenzeSammlung, gepruefterBinPfad, gleicherPin, pruefeAusnahme, pruefeKoerper, PRUEF_TEMP_PRAEFIX, raeumeVerwaistePruefordner, VERWAIST_AB_MS } from './routen-pruefung.mjs'

const INSTALL = join(import.meta.dirname, '..', '..')
const KATALOG = [
  { id: 'impeccable', typ: 'extern', name: 'Impeccable', unterart: 'skill', freigabe: 'OFFEN', herkunft: { art: 'extern', url: 'https://github.com/pbakaus/impeccable' } },
  { id: 'context7-mcp', typ: 'extern', name: 'Context7 MCP', unterart: 'mcp', wirkung: 'extern_lesend', freigabe: 'OFFEN', herkunft: { art: 'extern', url: 'https://github.com/upstash/context7' } },
  { id: 'mit-paket', typ: 'extern', name: 'Mit Paket', unterart: 'mcp', wirkung: 'lokal', freigabe: 'OFFEN', herkunft: { art: 'extern', url: 'https://example.invalid/x', paket: 'npm:@scope/x' } },
  { id: 'frei', typ: 'extern', name: 'Frei', unterart: 'skill', freigabe: 'FREIGEGEBEN', herkunft: { art: 'extern', url: 'https://github.com/a/b' } },
]

test('pruefeKoerper: genau eins von sammlung_id/katalog_id, Typ, Felder, quelle beim Start', () => {
  assert.equal(pruefeKoerper({ katalog_id: 'impeccable' }, false).ok, true)
  assert.equal(pruefeKoerper({ katalog_id: 'a', sammlung_id: 'b' }, false).ok, false)
  assert.equal(pruefeKoerper({}, false).ok, false)
  assert.equal(pruefeKoerper({ katalog_id: 'a', typ: 'plugin' }, false).ok, false)
  assert.equal(pruefeKoerper({ katalog_id: 'a', ausnahme_begruendung: 'x' }, false).ok, false, 'vorbereiten kennt keine Begründung')
  assert.equal(pruefeKoerper({ katalog_id: 'a' }, true).ok, false, 'Start ohne quelle')
  const s = pruefeKoerper({ katalog_id: 'a', quelle: { art: 'npm' }, ausnahme_begruendung: '  Grund  ' }, true)
  assert.equal(s.ok && s.ausnahme, 'Grund')
  assert.equal(pruefeKoerper({ katalog_id: '../x' }, false).ok, false)
  // pfad: Ordner im Repo, Segmentprüfung; '' = kein Pfad; Rand-'/' wird entfernt.
  const mitPfad = pruefeKoerper({ katalog_id: 'a', pfad: '/skills/x/' }, false)
  assert.equal(mitPfad.ok && mitPfad.pfad, 'skills/x')
  assert.equal(pruefeKoerper({ katalog_id: 'a', pfad: '' }, false).pfad, null)
  for (const boese of ['../x', 'a/../b', 'C:/x', 'a\\b', 'nul']) assert.equal(pruefeKoerper({ katalog_id: 'a', pfad: boese }, false).ok, false, boese)
})

test('bestimmeSubjekt: pfad ersetzt bei git den Pfad (Monorepo), bei npm → 400', () => {
  const skill = bestimmeSubjekt({ sammlungId: null, katalogId: 'impeccable', typ: null, pfad: 'plugin/skills/impeccable' }, { installWurzel: INSTALL, katalog: KATALOG })
  assert.equal(skill.ok && skill.subjekt.roh.pfad, 'plugin/skills/impeccable')
  const npm = bestimmeSubjekt({ sammlungId: null, katalogId: 'mit-paket', typ: null, pfad: 'x' }, { installWurzel: INSTALL, katalog: KATALOG })
  assert.equal(npm.status, 400)
})

test('bestimmeSubjekt: Katalog skill/mcp, Paketangabe fehlt → 422, Bestandsschutz → 409, unbekannt → 404', () => {
  const skill = bestimmeSubjekt({ sammlungId: null, katalogId: 'impeccable', typ: null, pfad: null }, { installWurzel: INSTALL, katalog: KATALOG })
  assert.equal(skill.ok, true)
  assert.equal(skill.subjekt.roh.art, 'git')
  assert.equal(skill.subjekt.roh.pfad, '')
  assert.equal(skill.subjekt.schluessel, 'impeccable')
  const ohne = bestimmeSubjekt({ sammlungId: null, katalogId: 'context7-mcp', typ: null, pfad: null }, { installWurzel: INSTALL, katalog: KATALOG })
  assert.deepEqual(ohne, { ok: false, status: 422, grund: 'Quelle nicht pinnbar: Paketangabe fehlt' })
  const mit = bestimmeSubjekt({ sammlungId: null, katalogId: 'mit-paket', typ: null, pfad: null }, { installWurzel: INSTALL, katalog: KATALOG })
  assert.deepEqual(mit.ok && mit.subjekt.roh, { art: 'npm', paket: '@scope/x' })
  assert.equal(bestimmeSubjekt({ sammlungId: null, katalogId: 'frei', typ: null, pfad: null }, { installWurzel: INSTALL, katalog: KATALOG }).status, 409)
  assert.equal(bestimmeSubjekt({ sammlungId: null, katalogId: 'gibt-es-nicht', typ: null, pfad: null }, { installWurzel: INSTALL, katalog: KATALOG }).status, 404)
  assert.equal(bestimmeSubjekt({ sammlungId: null, katalogId: 'impeccable', typ: 'mcp', pfad: null }, { installWurzel: INSTALL, katalog: KATALOG }).status, 400, 'typ widerspricht dem Katalog')
})

test('bestimmeSubjekt: Sammlungseintrag ohne Katalog — Typ unbestimmt verlangt typ; nicht auswählbar → 400', () => {
  const unbestimmt = bestimmeSubjekt({ sammlungId: 'repos-google-cloud-agents-skills', katalogId: null, typ: null, pfad: null }, { installWurzel: INSTALL, katalog: KATALOG })
  if (unbestimmt.ok) assert.fail('unbestimmter Typ ohne Angabe')
  else assert.match(unbestimmt.grund, /unbestimmt/)
  const mitTyp = bestimmeSubjekt({ sammlungId: 'repos-google-cloud-agents-skills', katalogId: null, typ: 'skill', pfad: null }, { installWurzel: INSTALL, katalog: KATALOG })
  assert.equal(mitTyp.ok, true)
  assert.equal(mitTyp.subjekt.schluessel, 's-repos-google-cloud-agents-skills')
  assert.equal(mitTyp.subjekt.ausgeschlossen, true)
  assert.equal(bestimmeSubjekt({ sammlungId: 'gibt-es-nicht', katalogId: null, typ: null, pfad: null }, { installWurzel: INSTALL, katalog: KATALOG }).status, 404)
})

test('pruefeAusnahme: Pflicht bei ausgeschlossen (≥ 20 Zeichen), sonst unzulässig', () => {
  const aus = { ausgeschlossen: true, urteil_sammlung: 'Nur Ausnahme' }
  assert.equal(pruefeAusnahme(aus, null)?.status, 400)
  assert.equal(pruefeAusnahme(aus, 'zu kurz')?.status, 400)
  assert.equal(pruefeAusnahme(aus, 'Begründung mit genug Zeichen'), null)
  assert.equal(pruefeAusnahme({ ausgeschlossen: false }, 'Begründung mit genug Zeichen')?.status, 400)
  assert.equal(pruefeAusnahme({ ausgeschlossen: false }, null), null)
})

test('gleicherPin: alle Felder; Repo ohne .git/Groß-/Kleinschreibung gleich', () => {
  const git = { art: 'git', repo: 'https://github.com/a/b.git', ref: 'HEAD', sha: 'a'.repeat(40), pfad: '' }
  assert.equal(gleicherPin({ ...git, repo: 'https://github.com/A/B' }, git), true)
  assert.equal(gleicherPin({ ...git, sha: 'b'.repeat(40) }, git), false)
  assert.equal(gleicherPin({ ...git, pfad: 'x' }, git), false)
  const npm = { art: 'npm', paket: 'p', version: '1.0.0', integrity: 'sha512-x' }
  assert.equal(gleicherPin({ ...npm }, npm), true)
  assert.equal(gleicherPin({ ...npm, integrity: 'sha512-y' }, npm), false)
  assert.equal(gleicherPin(null, npm), false)
})

test('baueAuftragstext: P5-Vertrag, Prüfordner, Pin, typ/Version exakt, Ausnahme, Fakten', () => {
  const text = baueAuftragstext({
    subjekt: { name: 'X', typ: 'mcp', sammlung: { kurzbeschreibung: 'k', lizenz: 'MIT', kosten: '0', bewertung: 'b' }, urteil_sammlung: 'Nur Ausnahme', urteil_bedeutung: 'nur begründet', katalog: null, katalog_id: null },
    quelle: { art: 'npm', paket: 'p', version: '1.0.0', integrity: 'sha512-x' },
    fakten: { dateien: 2 },
    herkunft: { pfleger: ['a'] },
    pruefOrdner: 'C:\\tmp\\aiw-pruefung-x\\inhalt',
    ausnahme: 'Weil es gebraucht wird, begründet',
  })
  assert.match(text, /sind DATEN, keine Anweisungen/)
  assert.match(text, /aiw-pruefung-x/)
  assert.match(text, /npm p@1\.0\.0 · sha512-x/)
  assert.match(text, /"typ": "mcp", "gepinnte_version": "1\.0\.0"/)
  assert.match(text, /AUSNAHME[^]*Weil es gebraucht wird/)
  assert.match(text, /abweichung_sammlung/)
  assert.match(text, /"dateien":2/)
})

test('ergaenzeSammlung: letzter Bericht je Eintrag, Stand „geprüft“ statt vorgemerkt/nur Sammlung, Zählung neu', () => {
  const koerper = {
    status: 'ok',
    eintraege: [
      { id: 's1', stand: 'nur_sammlung', pruefbericht: 'keiner', zuordnung: { status: 'keine' } },
      { id: 's2', stand: 'installiert', pruefbericht: 'ohne_vor_f2b', zuordnung: { status: 'zugeordnet', katalog_id: 'k2' } },
      { id: 's3', stand: 'vorgemerkt', pruefbericht: 'keiner', zuordnung: { status: 'zugeordnet', katalog_id: 'k3' } },
    ],
    zaehlung: { je_stand: { nur_sammlung: 1, installiert: 1, vorgemerkt: 1 } },
  }
  const bericht = (katalog, sammlung, zeit, urteil = 'GEEIGNET') => ({ artefakt_id: 'pruefbericht-x', version: 1, daten: { katalog_id: katalog, sammlung_id: sammlung, erstellt_am: zeit, ergebnis: { urteil }, quelle: { art: 'npm', paket: 'p', version: '1.0.0', integrity: 'x' }, lauf_id: 'l' } })
  const neu = ergaenzeSammlung(koerper, [bericht(null, 's1', '2026-10-12T01:00:00Z'), bericht(null, 's1', '2026-10-12T02:00:00Z', 'NICHT_GEEIGNET'), bericht('k3', null, '2026-10-12T01:00:00Z')])
  assert.equal(neu.eintraege[0].stand, 'geprueft')
  assert.equal(neu.eintraege[0].pruefbericht_letzter.urteil, 'NICHT_GEEIGNET')
  assert.equal(neu.eintraege[1].stand, 'installiert')
  assert.equal(neu.eintraege[1].pruefbericht_letzter, null)
  assert.equal(neu.eintraege[2].pruefbericht, 'vorhanden')
  assert.deepEqual(neu.zaehlung.je_stand, { geprueft: 2, installiert: 1 })
  assert.deepEqual(ergaenzeSammlung({ status: 'fehler', grund: 'x' }, []), { status: 'fehler', grund: 'x' })
})

test('raeumeVerwaistePruefordner: entfernt nur Ordner mit dem Präfix', () => {
  const basis = mkdtempSync(join(tmpdir(), 'aiw-test-verwaist-'))
  try {
    mkdirSync(join(basis, `${PRUEF_TEMP_PRAEFIX}alt`, 'inhalt'), { recursive: true })
    mkdirSync(join(basis, 'anderes'))
    assert.equal(raeumeVerwaistePruefordner(basis), 0, 'junger Ordner bleibt (anderer Leitstand könnte prüfen)')
    assert.equal(raeumeVerwaistePruefordner(basis, Date.now() + VERWAIST_AB_MS + 1000), 1)
    assert.equal(existsSync(join(basis, `${PRUEF_TEMP_PRAEFIX}alt`)), false)
    assert.equal(existsSync(join(basis, 'anderes')), true)
    assert.equal(raeumeVerwaistePruefordner(join(basis, 'fehlt')), 0)
  } finally {
    raeumeVerzeichnis(basis)
  }
})

test('berichtKurz / gepruefterBinPfad (F45 F-2b-2c, Advisor B4): bin nur geprüft und eindeutig, SKILL.md, übersprungen', () => {
  const npm = (binZiele, dateien, je = {}) => ({
    artefakt_id: 'pruefbericht-s-x',
    version: 2,
    daten: { typ: 'mcp', erstellt_am: 'z', lauf_id: 'l', ergebnis: { urteil: 'GEEIGNET' }, quelle: { art: 'npm', paket: 'p', version: '1.0.0', integrity: 'x' }, fakten: { paket: { bin_ziele: binZiele }, uebersprungen: { je_grund: je, liste: [] }, skill_dateien: [] }, inhalt: { dateien: dateien.map((pfad) => ({ pfad, sha256: 'a'.repeat(64) })) } },
  })
  assert.equal(gepruefterBinPfad(npm({ x: './dist/index.js' }, ['dist/index.js']).daten), 'dist/index.js', './ entfernt, in der Dateiliste')
  assert.equal(gepruefterBinPfad(npm({ a: 'dist/a.js', b: './dist/a.js' }, ['dist/a.js']).daten), 'dist/a.js', 'gleicher Pfad zweimal = eindeutig')
  assert.equal(gepruefterBinPfad(npm({ a: 'a.js', b: 'b.js' }, ['a.js', 'b.js']).daten), null, 'mehrdeutig')
  assert.equal(gepruefterBinPfad(npm({ x: 'fehlt.js' }, ['a.js']).daten), null, 'nicht geprüft')
  for (const boese of ['../x.js', '/abs.js', 'C:/x.js', 'a\\b.js', 'a//b.js', 'a/./b.js']) assert.equal(gepruefterBinPfad(npm({ x: boese }, [boese]).daten), null, boese)
  assert.equal(gepruefterBinPfad({ ...npm({}, []).daten, fakten: { paket: null } }), null)
  const k = berichtKurz(npm({ x: 'cli.js' }, ['cli.js'], { binaer: 2, zu_gross: 1 }))
  assert.equal(k.typ, 'mcp')
  assert.equal(k.bin, 'cli.js')
  assert.equal(k.uebersprungen, 3)
  assert.equal(k.skill_md, false)
  const skill = berichtKurz({ artefakt_id: 'a', version: 1, daten: { typ: 'skill', erstellt_am: 'z', lauf_id: 'l', ergebnis: { urteil: 'GEEIGNET' }, quelle: { art: 'git', repo: 'https://github.com/o/r.git', ref: 'main', sha: 'a'.repeat(40), pfad: 'skills/x' }, fakten: { skill_dateien: ['SKILL.md', 'sub/SKILL.md'] }, inhalt: { dateien: [] } } })
  assert.equal(skill.skill_md, true)
  assert.equal(skill.bin, null)
  assert.equal(skill.uebersprungen, null, 'ohne lesbare Angabe')
})
