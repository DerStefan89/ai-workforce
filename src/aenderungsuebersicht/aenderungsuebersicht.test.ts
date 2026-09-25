/**
 * Datei: src/aenderungsuebersicht/aenderungsuebersicht.test.ts
 *
 * Zweck: node:test-Fälle für die Änderungsübersicht (F23 WS-0,
 * features/F23/feature.md). Jeder Testfall legt sein eigenes
 * Wegwerf-Git-Repo unter os.tmpdir() an (Muster: src/authorization-
 * boundary/authorization-boundary.test.ts) — kein Zugriff auf das
 * Produkt-Repo selbst.
 */

import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  ermittlePruefkettenAenderungen,
  erzeugeAenderungsuebersichtDaten,
  globZuRegExp,
  istAenderungsuebersichtDegradiert,
  leseScriptsStand,
  validiereAenderungsuebersichtDaten,
  wirksamePruefkettenMuster,
} from './index.ts'
import { raeumeVerzeichnis } from '../../scripts/_aufraeumen.ts'

function git(repoWurzel: string, argumente: string[]): string {
  return execFileSync('git', argumente, { cwd: repoWurzel, encoding: 'utf8' })
}

/** Legt ein Wegwerf-Git-Repo mit einem ersten Commit an. */
function neuesRepo(): string {
  const repoWurzel = join(tmpdir(), `f23-aenderungsuebersicht-test-${randomUUID()}`)
  mkdirSync(repoWurzel, { recursive: true })
  git(repoWurzel, ['init', '--quiet'])
  git(repoWurzel, ['config', 'user.email', 'test@example.invalid'])
  git(repoWurzel, ['config', 'user.name', 'Test'])
  writeFileSync(join(repoWurzel, 'bestehend.txt'), 'Zeile 1\nZeile 2\nZeile 3\n')
  writeFileSync(join(repoWurzel, 'zu-loeschen.txt'), 'wird gelöscht\n')
  git(repoWurzel, ['add', 'bestehend.txt', 'zu-loeschen.txt'])
  git(repoWurzel, ['commit', '--quiet', '-m', 'init'])
  return repoWurzel
}

test('geänderte, neue (untracked) und gelöschte Datei erscheinen korrekt klassifiziert — AK1/AK2', () => {
  const repoWurzel = neuesRepo()
  try {
    writeFileSync(join(repoWurzel, 'bestehend.txt'), 'Zeile 1\nZeile 2 geändert\nZeile 3\nZeile 4\n')
    writeFileSync(join(repoWurzel, 'neu.txt'), 'ganz neue Datei, nie committet\n')
    unlinkSync(join(repoWurzel, 'zu-loeschen.txt'))

    const daten = erzeugeAenderungsuebersichtDaten('test-lauf', repoWurzel, 1_000_000)
    assert.deepStrictEqual(validiereAenderungsuebersichtDaten(daten), [])
    assert.strictEqual(daten.aenderungsuebersicht_schema, 'v0')
    assert.match(daten.basis_ref ?? '', /^[0-9a-f]{40}$/)

    const geaendert = daten.dateien.find((d) => d.pfad === 'bestehend.txt')
    assert.strictEqual(geaendert?.status, 'GEAENDERT')
    assert.ok((geaendert?.plus ?? 0) > 0)

    // AK2: eine untracked Datei fehlt in 'git diff' vollständig — sie muss trotzdem als NEU erscheinen.
    const neuDatei = daten.dateien.find((d) => d.pfad === 'neu.txt')
    assert.strictEqual(neuDatei?.status, 'NEU')
    assert.strictEqual(neuDatei?.plus, null)
    assert.strictEqual(neuDatei?.minus, null)

    const geloescht = daten.dateien.find((d) => d.pfad === 'zu-loeschen.txt')
    assert.strictEqual(geloescht?.status, 'GELOESCHT')
  } finally {
    raeumeVerzeichnis(repoWurzel)
  }
})

test('patch wird auf budget_bytes gekürzt, gekuerzt:true — AK3', () => {
  const repoWurzel = neuesRepo()
  try {
    writeFileSync(join(repoWurzel, 'bestehend.txt'), `${'x'.repeat(5000)}\n`)

    const daten = erzeugeAenderungsuebersichtDaten('test-lauf', repoWurzel, 50)
    assert.strictEqual(daten.gekuerzt, true)
    assert.strictEqual(daten.budget_bytes, 50)
    assert.ok(Buffer.byteLength(daten.patch, 'utf8') <= 50)
    assert.deepStrictEqual(validiereAenderungsuebersichtDaten(daten), [])
  } finally {
    raeumeVerzeichnis(repoWurzel)
  }
})

test('ohne reale Änderungen bleibt dateien leer, gekuerzt:false — Grünfall ohne Diff', () => {
  const repoWurzel = neuesRepo()
  try {
    const daten = erzeugeAenderungsuebersichtDaten('test-lauf', repoWurzel, 1_000_000)
    assert.deepStrictEqual(daten.dateien, [])
    assert.strictEqual(daten.gekuerzt, false)
    assert.deepStrictEqual(validiereAenderungsuebersichtDaten(daten), [])
  } finally {
    raeumeVerzeichnis(repoWurzel)
  }
})

test('kein Git-Repository liefert ein degradiertes, aber schemagültiges Artefakt — wirft nie (Bauauftrag Punkt 4)', () => {
  const keinRepo = join(tmpdir(), `f23-aenderungsuebersicht-test-kein-repo-${randomUUID()}`)
  mkdirSync(keinRepo, { recursive: true })
  try {
    const daten = erzeugeAenderungsuebersichtDaten('test-lauf', keinRepo, 1_000_000)
    assert.deepStrictEqual(daten.dateien, [])
    assert.strictEqual(daten.basis_ref, null)
    assert.ok(daten.stat_text.length > 0)
    assert.deepStrictEqual(validiereAenderungsuebersichtDaten(daten), [])
  } finally {
    raeumeVerzeichnis(keinRepo)
  }
})

test('validiereAenderungsuebersichtDaten: unbekanntes Feld und unbekannter Status werden gemeldet', () => {
  const gueltig = {
    aenderungsuebersicht_schema: 'v0',
    lauf_id: 'l',
    erzeugt_am: '2026-09-14T00:00:00.000Z',
    basis_ref: 'a'.repeat(40),
    dateien: [{ pfad: 'a.ts', status: 'GEAENDERT', plus: 1, minus: 0 }],
    stat_text: '',
    patch: '',
    gekuerzt: false,
    budget_bytes: 100,
  }
  assert.deepStrictEqual(validiereAenderungsuebersichtDaten(gueltig), [])
  assert.ok(validiereAenderungsuebersichtDaten({ ...gueltig, unerwartet: true }).length > 0)
  assert.ok(
    validiereAenderungsuebersichtDaten({ ...gueltig, dateien: [{ pfad: 'a.ts', status: 'UNBEKANNT', plus: 1, minus: 0 }] }).length > 0
  )
  // Regressionsschutz Reviewer-Pass 14.09.2026, kritischer Befund 1: Number.isInteger(Infinity)
  // ist false — ein Number.POSITIVE_INFINITY-Fallback für budget_bytes muss hier durchfallen,
  // sonst wäre der Fehler erneut unbemerkt einbaubar.
  assert.ok(validiereAenderungsuebersichtDaten({ ...gueltig, budget_bytes: Number.POSITIVE_INFINITY }).length > 0)
})

test('Umbenennung (git add -M) erscheint als UMBENANNT mit dem neuen Pfad — Reviewer-/QA-Hinweis auf fehlende Abdeckung', () => {
  const repoWurzel = neuesRepo()
  try {
    execFileSync('git', ['mv', 'bestehend.txt', 'umbenannt.txt'], { cwd: repoWurzel })

    const daten = erzeugeAenderungsuebersichtDaten('test-lauf', repoWurzel, 1_000_000)
    assert.deepStrictEqual(validiereAenderungsuebersichtDaten(daten), [])
    const eintrag = daten.dateien.find((d) => d.pfad === 'umbenannt.txt')
    assert.strictEqual(eintrag?.status, 'UMBENANNT')
    assert.strictEqual(daten.dateien.some((d) => d.pfad === 'bestehend.txt'), false)
    // F-735: der alte Pfad steht zusätzlich im additiven Feld alter_pfad.
    assert.strictEqual(eintrag?.alter_pfad, 'bestehend.txt')
  } finally {
    raeumeVerzeichnis(repoWurzel)
  }
})

test('ein Dateiname mit Umlaut wird nicht durch git-Quoting verstümmelt — Reviewer-Pass 14.09.2026, kritischer Befund 2', () => {
  const repoWurzel = neuesRepo()
  try {
    writeFileSync(join(repoWurzel, 'ändern.txt'), 'neue Datei mit Umlaut im Namen\n')

    const daten = erzeugeAenderungsuebersichtDaten('test-lauf', repoWurzel, 1_000_000)
    const eintrag = daten.dateien.find((d) => d.pfad === 'ändern.txt')
    assert.notStrictEqual(eintrag, undefined, `'ändern.txt' fehlt oder ist verstümmelt — gefundene Pfade: ${JSON.stringify(daten.dateien.map((d) => d.pfad))}`)
    assert.strictEqual(eintrag?.status, 'NEU')
  } finally {
    raeumeVerzeichnis(repoWurzel)
  }
})

// ─── F-713: Prüfketten-Veränderung (Regel 1j) ─────────────────────────────

/** Default-Liste ohne projektspezifische Ergänzung (F-735). */
const M = wirksamePruefkettenMuster()

const PAKET = (scripts: Record<string, string>): string => JSON.stringify({ name: 'x', scripts })

test('ermittlePruefkettenAenderungen: abweichendes scripts-Objekt wird gemeldet, ein unverändertes (auch bei anderem Rest der Datei) nicht', () => {
  const head = leseScriptsStand(PAKET({ check: 'node a.mjs' }))
  assert.deepEqual(ermittlePruefkettenAenderungen(head, leseScriptsStand(PAKET({ check: 'node a.mjs && node b.mjs' })), [], M), ['package.json (scripts)'])
  assert.deepEqual(ermittlePruefkettenAenderungen(head, leseScriptsStand(JSON.stringify({ name: 'anders', version: '2', scripts: { check: 'node a.mjs' } })), [], M), [])
})

test('ermittlePruefkettenAenderungen: package.json fehlt auf beiden Seiten → keine Abweichung; auf genau einer Seite → Abweichung; unparsebar → Abweichung', () => {
  assert.deepEqual(ermittlePruefkettenAenderungen(leseScriptsStand(null), leseScriptsStand(null), [], M), [])
  assert.deepEqual(ermittlePruefkettenAenderungen(leseScriptsStand(null), leseScriptsStand(PAKET({})), [], M), ['package.json (scripts)'])
  assert.deepEqual(ermittlePruefkettenAenderungen(leseScriptsStand(PAKET({})), leseScriptsStand(null), [], M), ['package.json (scripts)'])
  assert.deepEqual(ermittlePruefkettenAenderungen(leseScriptsStand(PAKET({})), leseScriptsStand('{kaputt'), [], M), ['package.json (scripts)'])
  assert.deepEqual(ermittlePruefkettenAenderungen(leseScriptsStand('{kaputt-a'), leseScriptsStand('{kaputt-b'), [], M), ['package.json (scripts)'])
  assert.deepEqual(ermittlePruefkettenAenderungen(leseScriptsStand('{kaputt'), leseScriptsStand('{kaputt'), [], M), [])
})

test('ermittlePruefkettenAenderungen: reine Umsortierung der scripts-Schlüssel ist keine Änderung; eine UTF-8-BOM verhindert das Erkennen nicht', () => {
  const head = leseScriptsStand(PAKET({ a: 'node a.mjs', b: 'node b.mjs' }))
  assert.deepEqual(ermittlePruefkettenAenderungen(head, leseScriptsStand(PAKET({ b: 'node b.mjs', a: 'node a.mjs' })), [], M), [])
  const bom = String.fromCharCode(0xfeff)
  assert.deepEqual(ermittlePruefkettenAenderungen(leseScriptsStand(bom + PAKET({ a: 'x' })), leseScriptsStand(bom + PAKET({ a: 'y' })), [], M), ['package.json (scripts)'])
  assert.deepEqual(ermittlePruefkettenAenderungen(leseScriptsStand(bom + PAKET({ a: 'x' })), leseScriptsStand(PAKET({ a: 'x' })), [], M), [])
})

test('ermittlePruefkettenAenderungen: bestehende scripts/check-* und .github/workflows/* mit GEAENDERT/GELOESCHT/UMBENANNT melden, NEU und andere Pfade nicht', () => {
  const gleich = leseScriptsStand(PAKET({}))
  const dateien = [
    { pfad: 'scripts/check-x.mjs', status: 'GEAENDERT' as const, plus: 1, minus: 1 },
    { pfad: '.github/workflows/ci.yml', status: 'GELOESCHT' as const, plus: 0, minus: 3 },
    { pfad: 'scripts/check-umbenannt.mjs', status: 'UMBENANNT' as const, plus: 0, minus: 0 },
    { pfad: 'scripts/check-neu.mjs', status: 'NEU' as const, plus: null, minus: null },
    { pfad: 'scripts/anderes.mjs', status: 'GEAENDERT' as const, plus: 1, minus: 0 },
    { pfad: 'scripts/unter/check-tief.mjs', status: 'GEAENDERT' as const, plus: 1, minus: 0 },
  ]
  assert.deepEqual(ermittlePruefkettenAenderungen(gleich, gleich, dateien, M), ['scripts/check-x.mjs (GEAENDERT)', '.github/workflows/ci.yml (GELOESCHT)', 'scripts/check-umbenannt.mjs (UMBENANNT)'])
})

// ─── F-735: konfigurierbare Prüfketten-Muster, Hilfsdateien, Umbenennungen ──────────────

test('globZuRegExp: * bleibt im Segment, ** überspannt Ordner, abschließendes / ist ein Präfix, andere Zeichen gelten wörtlich', () => {
  assert.ok(globZuRegExp('scripts/check-*').test('scripts/check-x.mjs'))
  assert.ok(!globZuRegExp('scripts/check-*').test('scripts/check-x/tief.mjs'))
  assert.ok(globZuRegExp('.github/workflows/**').test('.github/workflows/ci.yml'))
  assert.ok(globZuRegExp('.github/workflows/**').test('.github/workflows/unter/ci.yml'))
  assert.ok(globZuRegExp('tests/**/conftest.py').test('tests/conftest.py'))
  assert.ok(globZuRegExp('tests/**/conftest.py').test('tests/a/b/conftest.py'))
  assert.ok(globZuRegExp('tools/').test('tools/x/y.sh'))
  assert.ok(!globZuRegExp('tools/').test('toolsx/y.sh'))
  assert.ok(globZuRegExp('pyproject.toml').test('pyproject.toml'))
  assert.ok(!globZuRegExp('pyproject.toml').test('pyprojectxtoml'))
  assert.ok(!globZuRegExp('pyproject.toml').test('sub/pyproject.toml'))
  assert.ok(globZuRegExp('tsconfig*.json').test('tsconfig.build.json'))
})

test('wirksamePruefkettenMuster: Default-Liste immer aktiv, pruefketten_pfade ergänzen sie ohne Dubletten', () => {
  const nurDefault = wirksamePruefkettenMuster()
  for (const erwartet of ['scripts/check-*', 'biome.json', 'tsconfig*.json', 'scripts/_*', '.eslintrc*', 'eslint.config.*', 'vitest.config.*', 'jest.config.*']) {
    assert.ok(nurDefault.includes(erwartet), erwartet)
  }
  const ergaenzt = wirksamePruefkettenMuster(['pyproject.toml', 'biome.json'])
  assert.equal(ergaenzt.length, nurDefault.length + 1)
  assert.ok(ergaenzt.includes('pyproject.toml') && ergaenzt.includes('scripts/check-*'))
})

test('ermittlePruefkettenAenderungen (F-735): Default-Liste erkennt biome.json, tsconfig und scripts/_*; ergänzte Muster greifen; NEU bleibt folgenlos', () => {
  const gleich = leseScriptsStand(PAKET({}))
  const dateien = [
    { pfad: 'biome.json', status: 'GEAENDERT' as const, plus: 1, minus: 1 },
    { pfad: 'tsconfig.json', status: 'GEAENDERT' as const, plus: 1, minus: 0 },
    { pfad: 'scripts/_aufraeumen.ts', status: 'GELOESCHT' as const, plus: 0, minus: 9 },
    { pfad: 'pyproject.toml', status: 'GEAENDERT' as const, plus: 1, minus: 0 },
    { pfad: 'tests/test_neu.py', status: 'NEU' as const, plus: null, minus: null },
  ]
  assert.deepEqual(ermittlePruefkettenAenderungen(gleich, gleich, dateien, M), ['biome.json (GEAENDERT)', 'tsconfig.json (GEAENDERT)', 'scripts/_aufraeumen.ts (GELOESCHT)'])
  assert.deepEqual(ermittlePruefkettenAenderungen(gleich, gleich, dateien, wirksamePruefkettenMuster(['pyproject.toml', 'tests/**'])), [
    'biome.json (GEAENDERT)',
    'tsconfig.json (GEAENDERT)',
    'scripts/_aufraeumen.ts (GELOESCHT)',
    'pyproject.toml (GEAENDERT)',
  ])
})

test('ermittlePruefkettenAenderungen (F-735): Umbenennung AUS scripts/check-* heraus hält über alter_pfad; ohne alter_pfad (Alt-Artefakt) zählt nur der neue Pfad', () => {
  const gleich = leseScriptsStand(PAKET({}))
  const heraus = [{ pfad: 'tools/x.mjs', status: 'UMBENANNT' as const, plus: 0, minus: 0, alter_pfad: 'scripts/check-x.mjs' }]
  assert.deepEqual(ermittlePruefkettenAenderungen(gleich, gleich, heraus, M), ['scripts/check-x.mjs → tools/x.mjs (UMBENANNT)'])
  const altArtefakt = [{ pfad: 'tools/x.mjs', status: 'UMBENANNT' as const, plus: 0, minus: 0 }]
  assert.deepEqual(ermittlePruefkettenAenderungen(gleich, gleich, altArtefakt, M), [])
})

test('Umbenennung aus scripts/check-* heraus: reale Änderungsübersicht trägt alter_pfad, Regel 1j meldet sie (F-735)', () => {
  const repoWurzel = neuesRepo()
  try {
    mkdirSync(join(repoWurzel, 'scripts'), { recursive: true })
    writeFileSync(join(repoWurzel, 'scripts', 'check-x.mjs'), "console.log('x')\n")
    git(repoWurzel, ['add', '-A'])
    git(repoWurzel, ['commit', '--quiet', '-m', 'gate'])
    mkdirSync(join(repoWurzel, 'tools'), { recursive: true })
    git(repoWurzel, ['mv', 'scripts/check-x.mjs', 'tools/x.mjs'])
    const daten = erzeugeAenderungsuebersichtDaten('test-lauf', repoWurzel, 1_000_000)
    assert.deepStrictEqual(validiereAenderungsuebersichtDaten(daten), [])
    const gleich = leseScriptsStand(PAKET({}))
    assert.deepEqual(ermittlePruefkettenAenderungen(gleich, gleich, daten.dateien, M), ['scripts/check-x.mjs → tools/x.mjs (UMBENANNT)'])
  } finally {
    raeumeVerzeichnis(repoWurzel)
  }
})

test('validiereAenderungsuebersichtDaten (F-735): alter_pfad ist optional; ein leerer alter_pfad ist ungültig', () => {
  const basis = erzeugeAenderungsuebersichtDaten('lauf-x', join(tmpdir(), `kein-repo-${randomUUID()}`), 1000)
  const ohne = { ...basis, dateien: [{ pfad: 'a.txt', status: 'UMBENANNT', plus: 0, minus: 0 }] }
  const mit = { ...basis, dateien: [{ pfad: 'a.txt', status: 'UMBENANNT', plus: 0, minus: 0, alter_pfad: 'b.txt' }] }
  const leer = { ...basis, dateien: [{ pfad: 'a.txt', status: 'UMBENANNT', plus: 0, minus: 0, alter_pfad: '' }] }
  assert.deepStrictEqual(validiereAenderungsuebersichtDaten(ohne), [])
  assert.deepStrictEqual(validiereAenderungsuebersichtDaten(mit), [])
  assert.ok(validiereAenderungsuebersichtDaten(leer).length > 0)
})

test('istAenderungsuebersichtDegradiert: ein Artefakt ohne Git-Repo ist degradiert, ein leeres, erfolgreich ermitteltes nicht', () => {
  const ohneRepo = erzeugeAenderungsuebersichtDaten('lauf-degradiert', join(tmpdir(), `kein-repo-${randomUUID()}`), 1000)
  assert.equal(istAenderungsuebersichtDegradiert(ohneRepo), true)
  assert.equal(istAenderungsuebersichtDegradiert({ ...ohneRepo, stat_text: '' }), false)
})
