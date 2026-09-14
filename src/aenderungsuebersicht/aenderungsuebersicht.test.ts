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
import { erzeugeAenderungsuebersichtDaten, validiereAenderungsuebersichtDaten } from './index.ts'
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
