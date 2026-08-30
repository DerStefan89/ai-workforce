/**
 * Datei: src/authorization-boundary/authorization-boundary.test.ts
 *
 * Zweck: node:test-Fälle für die Authorization Boundary (F3,
 * state/plan-v2-f3-authorization-boundary.md +
 * state/tasks/f3-authorization-boundary.md). Deckt AC7 (echte Freigabe,
 * echte Verweigerung inkl. F1B-Terminalartefakt-Beleg, manipulierte
 * Referenz, fehlender geschützter Ort) plus zwei Nachbesserungen aus dem
 * zweiten Advisor-Pass: fehlende .gitattributes (B18) und Verweigerung
 * ohne vorangehende RUN_PREPARED-Marke (B2/B17, Regressionsbeleg gegen
 * F1Bs bestehendes Verhalten). Jeder Testfall legt sein eigenes
 * Wegwerf-Git-Repo unter os.tmpdir() an — kein Zugriff auf den
 * produktiven externen Ort.
 */

import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { schreibeWirkungsmarke, sha256Hex, stelleLaufstatusFest } from '../checkpoint-store/index.ts'
import type { ProfilReferenz } from '../checkpoint-store/types.ts'
import { pruefeAutorisierung, verweigereAutorisierung } from './index.ts'
import type { AutorisierungsReferenz } from './types.ts'

const KONTROLLZUSTAND_BASIS = 'kontrollzustand-test'
const PROFIL_REFERENZ: ProfilReferenz = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }

function neueLaufId(praefix: string): string {
  return `${praefix}-${randomUUID()}`
}

function git(repoWurzel: string, argumente: string[]): string {
  return execFileSync('git', argumente, { cwd: repoWurzel, encoding: 'utf8' })
}

/** Legt ein Wegwerf-Git-Repo mit .gitattributes (* -text) VOR dem ersten Commit an (Delta 3/B18-Startbedingung). */
function neuesExternesRepo(): string {
  const repoWurzel = join(tmpdir(), `f3-autorisierung-test-${randomUUID()}`)
  mkdirSync(repoWurzel, { recursive: true })
  git(repoWurzel, ['init', '--quiet'])
  git(repoWurzel, ['config', 'user.email', 'test@example.invalid'])
  git(repoWurzel, ['config', 'user.name', 'Test'])
  writeFileSync(join(repoWurzel, '.gitattributes'), '* -text\n')
  git(repoWurzel, ['add', '.gitattributes'])
  git(repoWurzel, ['commit', '--quiet', '-m', 'init: Zeilenenden pinnen'])
  return repoWurzel
}

/** Wie neuesExternesRepo, aber OHNE .gitattributes — für den B18-Testfall. */
function neuesExternesRepoOhneGitattributes(): string {
  const repoWurzel = join(tmpdir(), `f3-autorisierung-test-${randomUUID()}`)
  mkdirSync(repoWurzel, { recursive: true })
  git(repoWurzel, ['init', '--quiet'])
  git(repoWurzel, ['config', 'user.email', 'test@example.invalid'])
  git(repoWurzel, ['config', 'user.name', 'Test'])
  return repoWurzel
}

/** Schreibt und committet eine Autorisierungsdatei, liefert die passende Referenz. */
function committeAutorisierung(repoWurzel: string, laufId: string, inhalt: string): AutorisierungsReferenz {
  const relativerPfad = `autorisierungen/${laufId}.json`
  const zielpfad = join(repoWurzel, relativerPfad)
  mkdirSync(dirname(zielpfad), { recursive: true })
  writeFileSync(zielpfad, inhalt)
  git(repoWurzel, ['add', relativerPfad])
  git(repoWurzel, ['commit', '--quiet', '-m', 'autorisierung'])
  const commitHash = git(repoWurzel, ['rev-parse', 'HEAD']).trim()
  return { pfad: zielpfad, commit_hash: commitHash, datei_hash: sha256Hex(inhalt) }
}

function raeumeKette(laufId: string): void {
  rmSync(join(KONTROLLZUSTAND_BASIS, laufId), { recursive: true, force: true })
}

test('echte, committete, unveränderte Freigabe liefert ok:true/FREIGEGEBEN — AC7 Fall 1', () => {
  const repoWurzel = neuesExternesRepo()
  const laufId = neueLaufId('freigabe')
  try {
    const inhalt = JSON.stringify({ lauf_id: laufId, entscheidung: 'FREIGEGEBEN', zeitstempel: new Date().toISOString() })
    const referenz = committeAutorisierung(repoWurzel, laufId, inhalt)

    const ergebnis = pruefeAutorisierung(referenz, { repoWurzel })
    assert.strictEqual(ergebnis.ok, true)
    assert.ok(ergebnis.ok)
    assert.strictEqual(ergebnis.entscheidung, 'FREIGEGEBEN')
    assert.strictEqual(ergebnis.eintrag.lauf_id, laufId)
  } finally {
    rmSync(repoWurzel, { recursive: true, force: true })
  }
})

test('echte Verweigerung: verweigereAutorisierung nach vorangehender RUN_PREPARED-Marke liefert ABGESCHLOSSEN/VERWEIGERT über F1B — AC7 Fall 2', () => {
  const repoWurzel = neuesExternesRepo()
  const laufId = neueLaufId('verweigerung')
  try {
    const inhalt = JSON.stringify({
      lauf_id: laufId,
      entscheidung: 'VERWEIGERT',
      zeitstempel: new Date().toISOString(),
      begruendung: 'Testfall',
    })
    const referenz = committeAutorisierung(repoWurzel, laufId, inhalt)

    const pruefung = pruefeAutorisierung(referenz, { repoWurzel })
    assert.strictEqual(pruefung.ok, true)
    assert.ok(pruefung.ok)
    assert.strictEqual(pruefung.entscheidung, 'VERWEIGERT')

    schreibeWirkungsmarke(laufId, PROFIL_REFERENZ, 'run_prepared', {}, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    verweigereAutorisierung(laufId, PROFIL_REFERENZ, referenz, 'Testfall', { basisVerzeichnis: KONTROLLZUSTAND_BASIS })

    const status = stelleLaufstatusFest(laufId, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.strictEqual(status.status, 'ABGESCHLOSSEN')
    assert.ok(status.status === 'ABGESCHLOSSEN')
    assert.strictEqual(status.ergebnis, 'VERWEIGERT')
  } finally {
    raeumeKette(laufId)
    rmSync(repoWurzel, { recursive: true, force: true })
  }
})

test('manipulierte Referenz: Arbeitsbaum nach dem Commit verändert, ohne neuen Commit, liefert ok:false — AC7 Fall 3', () => {
  const repoWurzel = neuesExternesRepo()
  const laufId = neueLaufId('manipuliert')
  try {
    const inhalt = JSON.stringify({ lauf_id: laufId, entscheidung: 'FREIGEGEBEN', zeitstempel: new Date().toISOString() })
    const referenz = committeAutorisierung(repoWurzel, laufId, inhalt)

    // Arbeitsbaum nach dem Commit verändern, OHNE neuen Commit — die
    // Referenz (commit_hash/datei_hash) bleibt auf den alten Inhalt gepinnt.
    writeFileSync(referenz.pfad, JSON.stringify({ lauf_id: laufId, entscheidung: 'FREIGEGEBEN', zeitstempel: 'manipuliert' }))

    const ergebnis = pruefeAutorisierung(referenz, { repoWurzel })
    assert.strictEqual(ergebnis.ok, false)
    assert.ok(!ergebnis.ok)
    assert.match(ergebnis.grund, /weicht von der Referenz ab/)
  } finally {
    rmSync(repoWurzel, { recursive: true, force: true })
  }
})

test('fehlender geschützter Ort: Pfad außerhalb des konfigurierten externen Repos liefert ok:false — AC7 Fall 4', () => {
  const repoWurzel = neuesExternesRepo()
  try {
    const referenz: AutorisierungsReferenz = {
      pfad: join(tmpdir(), 'ausserhalb-des-repos', 'autorisierung.json'),
      commit_hash: 'a'.repeat(40),
      datei_hash: 'a'.repeat(64),
    }

    const ergebnis = pruefeAutorisierung(referenz, { repoWurzel })
    assert.strictEqual(ergebnis.ok, false)
    assert.ok(!ergebnis.ok)
    assert.match(ergebnis.grund, /ausserhalb des erwarteten externen Repos/)
  } finally {
    rmSync(repoWurzel, { recursive: true, force: true })
  }
})

test('externes Repo ohne .gitattributes liefert eine spezifische Fehlermeldung, nicht die generische Divergenz-Meldung — B18', () => {
  const repoWurzel = neuesExternesRepoOhneGitattributes()
  const laufId = neueLaufId('ohne-gitattributes')
  try {
    const inhalt = JSON.stringify({ lauf_id: laufId, entscheidung: 'FREIGEGEBEN', zeitstempel: new Date().toISOString() })
    const referenz = committeAutorisierung(repoWurzel, laufId, inhalt)

    const ergebnis = pruefeAutorisierung(referenz, { repoWurzel })
    assert.strictEqual(ergebnis.ok, false)
    assert.ok(!ergebnis.ok)
    assert.match(ergebnis.grund, /\.gitattributes/)
    assert.doesNotMatch(ergebnis.grund, /weicht von der Referenz ab/)
  } finally {
    rmSync(repoWurzel, { recursive: true, force: true })
  }
})

test('Verweigerung ohne vorangehende RUN_PREPARED-Marke liefert NICHT_GESTARTET/terminaleOhneRunPrepared, kein ABGESCHLOSSEN — B2/B17 Regressionsbeleg', () => {
  const repoWurzel = neuesExternesRepo()
  const laufId = neueLaufId('ohne-run-prepared')
  try {
    const inhalt = JSON.stringify({
      lauf_id: laufId,
      entscheidung: 'VERWEIGERT',
      zeitstempel: new Date().toISOString(),
      begruendung: 'Testfall ohne RUN_PREPARED',
    })
    const referenz = committeAutorisierung(repoWurzel, laufId, inhalt)

    verweigereAutorisierung(laufId, PROFIL_REFERENZ, referenz, 'Testfall ohne RUN_PREPARED', { basisVerzeichnis: KONTROLLZUSTAND_BASIS })

    const status = stelleLaufstatusFest(laufId, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.strictEqual(status.status, 'NICHT_GESTARTET')
    assert.ok(status.status === 'NICHT_GESTARTET')
    assert.deepStrictEqual(status.terminaleOhneRunPrepared, [1])
  } finally {
    raeumeKette(laufId)
    rmSync(repoWurzel, { recursive: true, force: true })
  }
})
