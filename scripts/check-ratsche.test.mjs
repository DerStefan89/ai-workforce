/**
 * Datei: scripts/check-ratsche.test.mjs
 *
 * Zweck: Tests zum Gate scripts/check-ratsche.mjs (F45 W2c-1): Rot-Nachweis je Regel (a)–(g3) und (f), Aktualisieren ohne
 * Erhöhung, Ersterhebung nur über Dateien der merge-base, Parser der Werkzeugausgaben, Kalibrierung mit dem echten Biome in
 * einem Wegwerf-Ordner (Advisor 3, Delta N6) und die Kopplung der Code-Dateien an biome.json `files.includes` (Advisor 4).
 *
 * Wird aufgerufen von: `npm run test` (scripts/teste.mjs, parallele Gruppe).
 *
 * Wichtig: Die tsc-Zeilen sind aus einem echten Lauf (`tsc -p tsconfig.checkjs.json --pretty false`, 28.10.2026)
 * mitgeschnitten; Biome läuft echt.
 */

import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, matchesGlob } from 'node:path'
import { describe, test } from 'node:test'
import { wegwerfOrdner } from './_wegwerf.ts'
import {
  aktualisiere,
  CHECKJS_MUSTER,
  erhebeBiome,
  erhebeZeilen,
  fremdeCodeDateien,
  istCodeDatei,
  ladeBestand,
  leseBiomeJson,
  leseReferenz,
  listeCodeDateien,
  pruefeRatsche,
  RATSCHE_PFAD,
  serialisiere,
  waehleStart,
  werteBiomeAus,
  werteTscAus,
} from './check-ratsche.mjs'

const WURZEL = join(import.meta.dirname, '..')
const BESTAND_MAIN = JSON.stringify({ dateien: { 'scripts/a.mjs': { zeilen: 900 } }, formatiert: ['scripts/f.mjs'] })

/**
 * Nachgebautes git für leseReferenz (Muster check-wachstumsbremse-server.test.mjs): Antworten je Befehl, sonst Wurf.
 * @param antworten - Map „<befehl> <argument>“ → stdout; fehlender Eintrag ⇒ git scheitert
 * @param aufrufe - sammelt die Argumentlisten (optional)
 * @returns git-Funktion
 */
function falschesGit(antworten, aufrufe = []) {
  return (argumente) => {
    aufrufe.push(argumente)
    const schluessel =
      argumente[0] === 'ls-tree' ? `ls-tree ${argumente.at(-1)}` : `${argumente[0]} ${argumente.at(-1)}`
    if (!antworten.has(schluessel)) throw new Error(`git ${argumente.join(' ')} scheitert`)
    return antworten.get(schluessel)
  }
}

/**
 * Antworten eines Repos mit origin/main (merge-base mb1) und main (merge-base mb2).
 * @param zusatz - weitere oder überschriebene Antworten
 * @returns Map für falschesGit
 */
function repoAntworten(zusatz = {}) {
  return new Map(
    Object.entries({
      'rev-parse --show-toplevel': `${WURZEL}\n`,
      'merge-base origin/main': 'mb1\n',
      'merge-base main': 'mb2\n',
      'ls-tree mb1': 'scripts/a.mjs\0scripts/f.mjs\0',
      'ls-tree mb2': 'scripts/anders.mjs\0',
      [`show mb1:${RATSCHE_PFAD}`]: BESTAND_MAIN,
      ...zusatz,
    }).filter(([, wert]) => wert !== null)
  )
}

/**
 * Prüfeingabe mit einem kleinen Bestand; jede Regel verändert genau ein Feld.
 * @param aenderung - überschriebene Felder
 * @returns Eingabe für pruefeRatsche
 */
function eingabe(aenderung = {}) {
  const bestand = {
    dateien: { 'scripts/a.mjs': { zeilen: 900, lint: { 'style/useTemplate': 2 } } },
    formatiert: ['scripts/f.mjs'],
  }
  return {
    ist: { 'scripts/a.mjs': { zeilen: 900, lint: { 'style/useTemplate': 2 } } },
    codeDateien: new Set(['scripts/a.mjs', 'scripts/f.mjs']),
    unformatiert: new Set(['scripts/a.mjs']),
    bestand,
    basis: structuredClone(bestand),
    basisDateien: new Set(['scripts/a.mjs', 'scripts/f.mjs']),
    ...aenderung,
  }
}

/**
 * Erwartet genau einen Befund mit der Regelkennung.
 * @param befunde - Ergebnis von pruefeRatsche
 * @param kennung - z. B. '(a)'
 */
function erwarteEinen(befunde, kennung) {
  assert.equal(befunde.length, 1, befunde.join('\n'))
  assert.ok(befunde[0].startsWith(kennung), befunde[0])
}

describe('pruefeRatsche — Rot-Nachweis je Regel', () => {
  test('grün: Ist = Bestand, Liste unverändert', () => {
    assert.deepEqual(pruefeRatsche(eingabe()), [])
  })
  test('(a) Ist über Bestand', () => {
    erwarteEinen(
      pruefeRatsche(eingabe({ ist: { 'scripts/a.mjs': { zeilen: 901, lint: { 'style/useTemplate': 2 } } } })),
      '(a)'
    )
  })
  test('(b) Ist unter Bestand', () => {
    erwarteEinen(
      pruefeRatsche(eingabe({ ist: { 'scripts/a.mjs': { zeilen: 900, lint: { 'style/useTemplate': 1 } } } })),
      '(b)'
    )
  })
  test('(c) Bestand höher als auf main', () => {
    const basis = {
      dateien: { 'scripts/a.mjs': { zeilen: 899, lint: { 'style/useTemplate': 2 } } },
      formatiert: ['scripts/f.mjs'],
    }
    const befunde = pruefeRatsche(eingabe({ basis }))
    erwarteEinen(befunde, '(c)')
  })
  test('(d) Listeneintrag von main fehlt', () => {
    const befunde = pruefeRatsche(eingabe({ bestand: { ...eingabe().bestand, formatiert: [] } }))
    erwarteEinen(befunde, '(d)')
  })
  test('(e) neuer Befund ohne Eintrag', () => {
    const ist = { 'scripts/a.mjs': { zeilen: 900, lint: { 'style/useTemplate': 2, 'suspicious/noDebugger': 1 } } }
    erwarteEinen(pruefeRatsche(eingabe({ ist })), '(e)')
  })
  test('(g1) gelistete Datei unformatiert', () => {
    erwarteEinen(pruefeRatsche(eingabe({ unformatiert: new Set(['scripts/a.mjs', 'scripts/f.mjs']) })), '(g1)')
  })
  test('(g2) gelisteter Pfad ohne Code-Datei', () => {
    const bestand = { ...eingabe().bestand, formatiert: ['scripts/f.mjs', 'scripts/weg.mjs'] }
    erwarteEinen(pruefeRatsche(eingabe({ bestand })), '(g2)')
  })
  test('(g3) neue Datei nicht in der Liste', () => {
    const codeDateien = new Set(['scripts/a.mjs', 'scripts/f.mjs', 'scripts/neu.mjs'])
    erwarteEinen(pruefeRatsche(eingabe({ codeDateien })), '(g3)')
  })
  test('ohne Referenz: (c)/(d)/(g3) nicht geprüft', () => {
    const codeDateien = new Set(['scripts/a.mjs', 'scripts/f.mjs', 'scripts/neu.mjs'])
    assert.deepEqual(pruefeRatsche(eingabe({ codeDateien, basis: null, basisDateien: null })), [])
  })
})

describe('ladeBestand — (f)', () => {
  test('fehlt, kaputt, Form', () => {
    assert.match(ladeBestand(null).befunde[0], /^\(f\).*fehlt/)
    assert.match(ladeBestand('{').befunde[0], /^\(f\).*kein gültiges JSON/)
    assert.match(ladeBestand('{"dateien":{"x":{"zeilen":0}},"formatiert":[]}').befunde[0], /positive Ganzzahl/)
    assert.match(ladeBestand('{"dateien":{},"formatiert":{}}').befunde[0], /'formatiert'/)
    assert.match(ladeBestand('[]').befunde[0], /kein Objekt/)
  })
  test('serialisiere → ladeBestand ist verlustfrei', () => {
    const bestand = {
      dateien: { 'b.mjs': { checkjs: 3 }, 'a.mjs': { zeilen: 801, lint: { z: 1, a: 2 } } },
      formatiert: ['y', 'x'],
    }
    const { bestand: gelesen } = ladeBestand(serialisiere(bestand))
    assert.deepEqual(gelesen, { dateien: bestand.dateien, formatiert: ['x', 'y'] })
  })
})

describe('aktualisiere', () => {
  test('senkt, entfernt Nullen, erhöht nie, nimmt formatierte Dateien auf', () => {
    const start = {
      dateien: { 'scripts/a.mjs': { zeilen: 900, checkjs: 2 }, 'scripts/b.mjs': { checkjs: 1 } },
      formatiert: ['scripts/weg.mjs'],
    }
    const ist = { 'scripts/a.mjs': { zeilen: 950, checkjs: 1, lint: { 'style/useTemplate': 1 } } }
    const codeDateien = new Set(['scripts/a.mjs', 'scripts/b.mjs', 'scripts/neu.mjs'])
    const { bestand } = aktualisiere({
      ist,
      codeDateien,
      unformatiert: new Set(['scripts/a.mjs']),
      start,
      basisDateien: null,
    })
    assert.deepEqual(bestand.dateien, { 'scripts/a.mjs': { zeilen: 900, checkjs: 1 } })
    assert.deepEqual(bestand.formatiert, ['scripts/b.mjs', 'scripts/neu.mjs'])
  })
  test('Ersterhebung: Werte nur für Dateien der merge-base, Liste auch für neue Dateien', () => {
    const ist = { 'scripts/alt.mjs': { zeilen: 900 }, 'scripts/neu.mjs': { lint: { 'suspicious/noDebugger': 1 } } }
    const codeDateien = new Set(['scripts/alt.mjs', 'scripts/neu.mjs', 'scripts/sauber.mjs'])
    const basisDateien = new Set(['scripts/alt.mjs'])
    const { bestand } = aktualisiere({
      ist,
      codeDateien,
      unformatiert: new Set(['scripts/alt.mjs']),
      start: null,
      basisDateien,
    })
    assert.deepEqual(bestand.dateien, { 'scripts/alt.mjs': { zeilen: 900 } })
    assert.deepEqual(bestand.formatiert, ['scripts/neu.mjs', 'scripts/sauber.mjs'])
  })
  test('Ersterhebung ohne merge-base ⇒ Fehler', () => {
    const ergebnis = aktualisiere({
      ist: {},
      codeDateien: new Set(),
      unformatiert: new Set(),
      start: null,
      basisDateien: null,
    })
    assert.ok(ergebnis.fehler)
  })
})

describe('Werkzeugausgaben', () => {
  test('leseBiomeJson: unvollständig oder unlesbar ⇒ Fehler', () => {
    const summe = { errors: 1, warnings: 0, infos: 0, diagnosticsNotPrinted: 0 }
    assert.equal(leseBiomeJson(JSON.stringify({ summary: summe, diagnostics: [{}] })).fehler.length, 0)
    assert.equal(leseBiomeJson(JSON.stringify({ summary: summe, diagnostics: [] })).fehler.length, 1)
    assert.equal(
      leseBiomeJson(JSON.stringify({ summary: { ...summe, diagnosticsNotPrinted: 3 }, diagnostics: [{}] })).fehler
        .length,
      1
    )
    assert.equal(leseBiomeJson(JSON.stringify({ summary: { errors: 1 }, diagnostics: [{}] })).fehler.length, 1)
    assert.equal(leseBiomeJson('kein json').fehler.length, 1)
  })
  test('werteBiomeAus: Windows-Pfad, JSON-Datei ignoriert, fremde Kategorie und Diagnose ohne Datei ⇒ Fehler', () => {
    const diagnosen = [
      { category: 'lint/style/useTemplate', location: { path: 'scripts\\a.mjs' } },
      { category: 'format', location: { path: 'scripts\\daten.json' } },
      { category: 'parse', location: { path: 'src/b.ts' } },
      { category: 'internalError/fs', location: {} },
    ]
    const ergebnis = werteBiomeAus(diagnosen, 'lint')
    assert.deepEqual([...ergebnis.lint.get('scripts/a.mjs')], [['style/useTemplate', 1]])
    assert.equal(ergebnis.fehler.length, 2)
  })
  test('werteTscAus: echte Zeilen; nur gelistete Dateien zählen; Fehler ohne Datei ⇒ Fehler', () => {
    const ausgabe = [
      "scripts/leitstand/kennung.mjs(32,37): error TS7006: Parameter 'roh' implicitly has an 'any' type.",
      "scripts/leitstand/routen-f41.mjs(26,15): error TS2304: Cannot find name 'ok'.",
      "scripts/leitstand/routen-f41.mjs(26,17): error TS1005: '}' expected.",
      "public/leitstand/api.js(62,44): error TS7006: Parameter 'praefix' implicitly has an 'any' type.",
      "scripts/leitstand/kennung.test.mjs(1,1): error TS7006: Parameter 'x' implicitly has an 'any' type.",
      "error TS2688: Cannot find type definition file for 'node'.",
      '  The file is in the program because:',
    ].join('\r\n')
    const { checkjs, fehler } = werteTscAus(ausgabe)
    assert.deepEqual(Object.fromEntries(checkjs), {
      'scripts/leitstand/kennung.mjs': 1,
      'scripts/leitstand/routen-f41.mjs': 2,
    })
    assert.equal(fehler.length, 1)
  })
  test('Kalibrierung mit echtem Biome: Befund gezählt, unformatierte Datei erkannt, JSON und saubere Datei still', () => {
    const ordner = wegwerfOrdner('ratsche')
    for (const teil of ['scripts', 'src', 'public']) mkdirSync(join(ordner, teil))
    copyFileSync(join(WURZEL, 'biome.json'), join(ordner, 'biome.json'))
    writeFileSync(join(ordner, 'scripts', 'sauber.mjs'), "export const gruss = 'hallo'\n")
    writeFileSync(join(ordner, 'scripts', 'befund.mjs'), 'export function f() {\n  debugger\n}\n')
    writeFileSync(join(ordner, 'scripts', 'unformatiert.mjs'), 'export const x = {a:1}\n')
    writeFileSync(join(ordner, 'scripts', 'daten.json'), '{"a":1}')
    const ergebnis = erhebeBiome(ordner, WURZEL)
    assert.deepEqual(ergebnis.fehler, [])
    assert.deepEqual(
      Object.fromEntries([...ergebnis.lint].map(([pfad, regeln]) => [pfad, Object.fromEntries(regeln)])),
      {
        'scripts/befund.mjs': { 'suspicious/noDebugger': 1 },
      }
    )
    assert.deepEqual([...ergebnis.unformatiert], ['scripts/unformatiert.mjs'])
  })
})

describe('Umfang', () => {
  test('erhebeZeilen: Server und i18n ausgenommen, Grenze 800', () => {
    const lies = (pfad) => 'x\n'.repeat(pfad.endsWith('klein.mjs') ? 800 : 801)
    const pfade = [
      'scripts/leitstand-server.mjs',
      'public/leitstand/i18n/de.js',
      'scripts/gross.mjs',
      'scripts/klein.mjs',
    ]
    assert.deepEqual([...erhebeZeilen(pfade, lies)], [['scripts/gross.mjs', 801]])
  })
  test('jede Code-Datei liegt in biome.json files.includes (Kopplung, Advisor 4)', () => {
    const git = (argumente) =>
      execFileSync('git', argumente, { cwd: WURZEL, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    const includes = JSON.parse(readFileSync(join(WURZEL, 'biome.json'), 'utf8')).files.includes
    const dateien = listeCodeDateien(WURZEL, git)
    assert.ok(dateien.length > 500, `nur ${dateien.length} Code-Dateien`)
    assert.ok(dateien.every(istCodeDatei))
    const ausserhalb = dateien.filter((pfad) => !includes.some((muster) => matchesGlob(pfad, muster)))
    assert.deepEqual(ausserhalb, [])
  })
  test('unbekanntes Argument ⇒ Exit 2', () => {
    const lauf = spawnSync(process.execPath, [join(WURZEL, 'scripts', 'check-ratsche.mjs'), '--unbekannt'], {
      encoding: 'utf8',
    })
    assert.equal(lauf.status, 2, lauf.stderr)
  })
})

describe('leseReferenz — Referenzauflösung mit nachgebautem git (Korrekturrunde cr 1/qa 1)', () => {
  test('merge-base mit origin/main: Bestand und Dateiliste von dort, ls-tree nie an der Spitze', () => {
    const aufrufe = []
    const ergebnis = leseReferenz(WURZEL, falschesGit(repoAntworten(), aufrufe))
    assert.deepEqual(ergebnis.basis, JSON.parse(BESTAND_MAIN))
    assert.deepEqual([...ergebnis.basisDateien], ['scripts/a.mjs', 'scripts/f.mjs'])
    const lsTree = aufrufe.filter((argumente) => argumente[0] === 'ls-tree')
    assert.deepEqual(
      lsTree.map((argumente) => argumente.at(-1)),
      ['mb1']
    )
  })
  test('gestapelter Branch: JSON fehlt an der merge-base ⇒ Spitze von origin/main, Dateiliste weiter von der merge-base', () => {
    const antworten = repoAntworten({
      [`show mb1:${RATSCHE_PFAD}`]: null,
      [`show origin/main:${RATSCHE_PFAD}`]: BESTAND_MAIN,
    })
    const ergebnis = leseReferenz(WURZEL, falschesGit(antworten))
    assert.deepEqual(ergebnis.basis, JSON.parse(BESTAND_MAIN))
    assert.match(ergebnis.hinweis, /origin\/main/)
    assert.deepEqual([...ergebnis.basisDateien], ['scripts/a.mjs', 'scripts/f.mjs'])
  })
  test('nur main vorhanden ⇒ merge-base mit main', () => {
    const antworten = repoAntworten({ 'merge-base origin/main': null, [`show mb2:${RATSCHE_PFAD}`]: BESTAND_MAIN })
    const ergebnis = leseReferenz(WURZEL, falschesGit(antworten))
    assert.deepEqual([...ergebnis.basisDateien], ['scripts/anders.mjs'])
    assert.ok(ergebnis.basis)
  })
  test('kaputte JSON auf main ⇒ kein Bestand, (g3) bleibt geprüft', () => {
    const ergebnis = leseReferenz(WURZEL, falschesGit(repoAntworten({ [`show mb1:${RATSCHE_PFAD}`]: '{' })))
    assert.equal(ergebnis.basis, null)
    assert.ok(ergebnis.basisDateien)
    assert.match(ergebnis.hinweis, /\(c\)\/\(d\) nicht geprüft; \(g3\) gegen merge-base/)
  })
  test('vor dem ersten Merge: keine JSON auf main ⇒ (c)/(d) nicht geprüft, (g3) gegen die merge-base', () => {
    const ergebnis = leseReferenz(WURZEL, falschesGit(repoAntworten({ [`show mb1:${RATSCHE_PFAD}`]: null })))
    assert.equal(ergebnis.basis, null)
    assert.deepEqual([...ergebnis.basisDateien], ['scripts/a.mjs', 'scripts/f.mjs'])
  })
  test('ohne git, fremde Wurzel, ohne Refs, ls-tree scheitert ⇒ nichts geprüft', () => {
    const faelle = [
      new Map(),
      repoAntworten({ 'rev-parse --show-toplevel': `${join(WURZEL, 'scripts')}\n` }),
      repoAntworten({ 'merge-base origin/main': null, 'merge-base main': null }),
      repoAntworten({ 'ls-tree mb1': null }),
    ]
    for (const antworten of faelle) {
      const ergebnis = leseReferenz(WURZEL, falschesGit(antworten))
      assert.equal(ergebnis.basis, null)
      assert.equal(ergebnis.basisDateien, null)
      assert.match(ergebnis.hinweis, /\(c\)\/\(d\)\/\(g3\) nicht geprüft/)
    }
  })
})

describe('Korrekturrunde — weitere Randfälle', () => {
  test('waehleStart: lokal vor main; null nur ohne beide', () => {
    const lokal = { dateien: {}, formatiert: ['x'] }
    const basis = { dateien: {}, formatiert: ['y'] }
    assert.equal(waehleStart(lokal, basis), lokal)
    assert.equal(waehleStart(null, basis), basis)
    assert.equal(waehleStart(null, null), null)
  })
  test('(c) Schlüssel, der auf main fehlt, zählt dort als 0', () => {
    const bestand = {
      dateien: { 'scripts/a.mjs': { zeilen: 900, lint: { 'style/useTemplate': 2 } } },
      formatiert: ['scripts/f.mjs'],
    }
    const basis = { dateien: { 'scripts/a.mjs': { zeilen: 900 } }, formatiert: ['scripts/f.mjs'] }
    erwarteEinen(pruefeRatsche(eingabe({ bestand, basis })), '(c)')
  })
  test('aktualisiere behält eine gelistete, unformatierte Datei in der Liste ((g1) bleibt rot)', () => {
    const start = { dateien: {}, formatiert: ['scripts/f.mjs'] }
    const { bestand } = aktualisiere({
      ist: {},
      codeDateien: new Set(['scripts/f.mjs']),
      unformatiert: new Set(['scripts/f.mjs']),
      start,
      basisDateien: null,
    })
    assert.deepEqual(bestand.formatiert, ['scripts/f.mjs'])
  })
  test('ladeBestand: Eintrag kein Objekt, unbekannter Schlüssel, lint kein Objekt ⇒ (f)', () => {
    for (const eintrag of ['null', '5', '{"lnit":{}}', '{"lint":3}']) {
      const { befunde } = ladeBestand(`{"dateien":{"scripts/a.mjs":${eintrag}},"formatiert":[]}`)
      assert.equal(befunde.length, 1, eintrag)
      assert.match(befunde[0], /^\(f\)/)
    }
  })
  test('werteTscAus: Fehler in der Konfiguration (Pfadform) ⇒ Fehler', () => {
    const { fehler } = werteTscAus("tsconfig.checkjs.json(3,5): error TS5023: Unknown compiler option 'x'.")
    assert.equal(fehler.length, 1)
  })
  test('tsconfig.checkjs.json: include und exclude passen zu CHECKJS_MUSTER (cr 6)', () => {
    const konfiguration = JSON.parse(readFileSync(join(WURZEL, 'tsconfig.checkjs.json'), 'utf8'))
    assert.deepEqual(konfiguration.include, [CHECKJS_MUSTER])
    assert.deepEqual(konfiguration.exclude, ['scripts/leitstand/*.test.mjs'])
  })
  test('fremdeCodeDateien: JS/TS-Endung außerhalb von CODE_MUSTER wird gemeldet (cr 7)', () => {
    const ordner = wegwerfOrdner('ratsche-fremd')
    mkdirSync(join(ordner, 'scripts'))
    mkdirSync(join(ordner, 'public'))
    for (const datei of ['scripts/a.cjs', 'scripts/b.mjs', 'public/c.ts']) writeFileSync(join(ordner, datei), '')
    const git = () => 'scripts/a.cjs\0scripts/b.mjs\0public/c.ts\0'
    assert.deepEqual(fremdeCodeDateien(ordner, git), ['public/c.ts', 'scripts/a.cjs'])
  })
})
