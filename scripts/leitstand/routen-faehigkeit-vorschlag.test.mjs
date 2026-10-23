/**
 * Datei: scripts/leitstand/routen-faehigkeit-vorschlag.test.mjs
 *
 * Zweck: Tests der Projektion der Fähigkeit-Vorschläge (F45 FB-1a): leer ohne Ordner (ohne git-Aufruf), ziel_ignoriert je
 * Eintrag, Cache je Arbeitsordner (geteilt innerhalb der Frist, neu nach Ablauf, neu bei geänderten Zielen).
 *
 * Wird aufgerufen von: npm run test (node --test)
 *
 * Wichtig: Fixtures in os.tmpdir(), Pfade nur über join (plattformneutral).
 */

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { raeumeVerzeichnis } from '../_aufraeumen.ts'
import { baueVorschlagProjektion } from './routen-faehigkeit-vorschlag.mjs'

// qa FB-1a 7: ohne globale/System-git-Konfiguration des Entwicklers (core.excludesFile könnte .claude/ ignorieren).
const gitKonfig = mkdtempSync(join(tmpdir(), 'fb1a-gitcfg-'))
process.env.GIT_CONFIG_GLOBAL = join(gitKonfig, 'leer')
process.env.GIT_CONFIG_NOSYSTEM = '1'
// Der Git-Starter (fuehreGitAsync) entfernt jede GIT_*-Variable — für pruefeZielIgnoriert zeigen HOME und XDG_CONFIG_HOME
// deshalb zusätzlich auf einen leeren Ordner (globale Konfiguration); die System-Konfiguration der git-Installation gilt dort mit.
process.env.HOME = gitKonfig
process.env.XDG_CONFIG_HOME = gitKonfig

const ordner = [gitKonfig]
after(() => {
  for (const o of ordner) raeumeVerzeichnis(o)
})

/** Repo mit einem Agent-Vorschlag. @param gitignore - Inhalt @returns Pfad */
function repo(gitignore) {
  const w = mkdtempSync(join(tmpdir(), 'fb1a-proj-'))
  ordner.push(w)
  execFileSync('git', ['init', '--quiet'], { cwd: w })
  writeFileSync(join(w, '.gitignore'), gitignore)
  mkdirSync(join(w, 'vorschlaege', 'faehigkeiten', 'agents'), { recursive: true })
  writeFileSync(join(w, 'vorschlaege', 'faehigkeiten', 'agents', 'leser.md'), '---\nname: leser\ndescription: Liest.\ntools: Read\n---\n')
  return w
}

test('ohne Vorschläge ⇒ [] und kein Cache-Eintrag', async () => {
  const w = mkdtempSync(join(tmpdir(), 'fb1a-proj-'))
  ordner.push(w)
  const cache = new Map()
  assert.deepEqual(await baueVorschlagProjektion(w, { cache }), [])
  assert.equal(cache.size, 0)
})

test('ziel_ignoriert je Eintrag; Cache geteilt in der Frist, neu nach Ablauf und bei neuen Zielen', async () => {
  const w = repo('.claude/\n')
  const cache = new Map()
  let zeit = 1000
  const jetzt = () => zeit
  const erste = await baueVorschlagProjektion(w, { cache, jetzt, cacheMs: 100 })
  assert.deepEqual(
    erste.map((e) => [e.name, e.ziel_ignoriert, e.grund]),
    [['leser', true, null]]
  )
  const eintrag = [...cache.values()][0]
  writeFileSync(join(w, '.gitignore'), '')
  await baueVorschlagProjektion(w, { cache, jetzt, cacheMs: 100 })
  assert.equal([...cache.values()][0], eintrag, 'in der Frist geteilt')
  zeit += 100
  assert.equal((await baueVorschlagProjektion(w, { cache, jetzt, cacheMs: 100 }))[0].ziel_ignoriert, false, 'nach Ablauf neu')
  writeFileSync(join(w, 'vorschlaege', 'faehigkeiten', 'agents', 'zweiter.md'), '---\nname: zweiter\ndescription: Liest.\ntools: Read\n---\n')
  assert.equal((await baueVorschlagProjektion(w, { cache, jetzt, cacheMs: 100 })).length, 2)
  assert.equal(cache.size, 1, 'ein Eintrag je Arbeitsordner')
})
