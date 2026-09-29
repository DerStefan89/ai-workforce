/**
 * Datei: src/ressourcen/skill-dateien.test.ts
 *
 * Zweck: node:test-Fälle für src/ressourcen/skill-dateien.ts (F36 WS-5b): zulässige Formen von
 * herkunft.url (zerlegeGithubUrl) und skill_pfad (pruefeSkillPfad), inhalt_hash (Reihenfolge-
 * unabhängig, empfindlich für Pfad und Inhalt, Symlink → Wurf) und leseFrontmatter.
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 */

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { raeumeVerzeichnis } from '../../scripts/_aufraeumen.ts'
import { berechneInhaltHash, EINGEBAUTE_SKILLS_S7, leseFrontmatter, pruefeSkillDateiNamen, pruefeSkillPfad, zerlegeGithubUrl } from './skill-dateien.ts'

test('zerlegeGithubUrl: Repo-Wurzel (Ref HEAD) und /tree/<ref>/<unterpfad>', () => {
  assert.deepEqual(zerlegeGithubUrl('https://github.com/o/r'), { ok: true, repoUrl: 'https://github.com/o/r.git', owner: 'o', repo: 'r', ref: 'HEAD', unterpfad: '' })
  assert.deepEqual(zerlegeGithubUrl('https://github.com/o/r.git/'), { ok: true, repoUrl: 'https://github.com/o/r.git', owner: 'o', repo: 'r', ref: 'HEAD', unterpfad: '' })
  assert.deepEqual(zerlegeGithubUrl('https://github.com/anthropics/claude-plugins-official/tree/main/plugins/frontend-design'), {
    ok: true,
    repoUrl: 'https://github.com/anthropics/claude-plugins-official.git',
    owner: 'anthropics',
    repo: 'claude-plugins-official',
    ref: 'main',
    unterpfad: 'plugins/frontend-design',
  })
  assert.equal(zerlegeGithubUrl('https://github.com/o/r/tree/v1.2').ok, true)
})

test('zerlegeGithubUrl: jede andere Form wird abgelehnt (fail-closed)', () => {
  for (const url of [
    'http://github.com/o/r',
    'https://gitlab.com/o/r',
    'https://github.com/o',
    'https://github.com/o/r/blob/main/x',
    'https://github.com/o/r/tree/-rf/x',
    'https://github.com/o/r/tree/main/../x',
    'https://github.com/o/r/tree/main/a//b',
    'https://github.com/o/r?x=1',
    'https://github.com/o/r#frag',
    'https://github.com/o/../tree/main',
    'https://github.com/o/r/tree/fbe07fb6ce7d51d8e86ca6efdf050059894cdb80/x',
    'https://github.com/o/r/tree/fbe07fb/x',
    'https://github.com/o/r/tree/main/a\\b',
    7,
  ]) {
    const e = zerlegeGithubUrl(url)
    assert.equal(e.ok, false, String(url))
  }
})

test('pruefeSkillPfad: relativ, "/" als Trenner, ohne ".."', () => {
  assert.equal(pruefeSkillPfad('skills/frontend-design'), null)
  assert.equal(pruefeSkillPfad('x'), null)
  for (const p of ['', '/x', 'a/../b', 'a//b', 'a\\b', './x', 'C:/x', 'x/', null]) assert.notEqual(pruefeSkillPfad(p), null, String(p))
})

test('berechneInhaltHash: unabhängig von der Anlegereihenfolge, empfindlich für Pfad und Inhalt', () => {
  const a = mkdtempSync(join(tmpdir(), 'ws5b-hash-a-'))
  const b = mkdtempSync(join(tmpdir(), 'ws5b-hash-b-'))
  try {
    writeFileSync(join(a, 'SKILL.md'), 'eins')
    mkdirSync(join(a, 'sub'))
    writeFileSync(join(a, 'sub', 'z.txt'), 'zwei')
    mkdirSync(join(b, 'sub'))
    writeFileSync(join(b, 'sub', 'z.txt'), 'zwei')
    writeFileSync(join(b, 'SKILL.md'), 'eins')
    mkdirSync(join(b, 'leer'))
    const hash = berechneInhaltHash(a)
    assert.match(hash, /^[0-9a-f]{64}$/)
    assert.equal(berechneInhaltHash(b), hash, 'gleiche Dateien, andere Reihenfolge, leerer Ordner zählt nicht')
    writeFileSync(join(b, 'sub', 'z.txt'), 'zwei!')
    assert.notEqual(berechneInhaltHash(b), hash, 'Inhalt geändert')
    writeFileSync(join(b, 'sub', 'z.txt'), 'zwei')
    writeFileSync(join(b, 'neu.sh'), '')
    assert.notEqual(berechneInhaltHash(b), hash, 'Datei hinzugekommen')
  } finally {
    raeumeVerzeichnis(a)
    raeumeVerzeichnis(b)
  }
})

test('berechneInhaltHash: Symlink/Junction im Ordner → Wurf', (t) => {
  const a = mkdtempSync(join(tmpdir(), 'ws5b-hash-link-'))
  try {
    writeFileSync(join(a, 'SKILL.md'), 'x')
    mkdirSync(join(a, 'ziel'))
    try {
      // Junction braucht unter Windows keine Admin-Rechte.
      symlinkSync(join(a, 'ziel'), join(a, 'verweis'), 'junction')
    } catch {
      t.skip('Verknüpfung auf diesem System nicht anlegbar')
      return
    }
    assert.throws(() => berechneInhaltHash(a), /Symlink\/Junction im Skill-Ordner: 'verweis'/)
  } finally {
    raeumeVerzeichnis(a)
  }
})

test('leseFrontmatter und EINGEBAUTE_SKILLS_S7', () => {
  assert.deepEqual(leseFrontmatter('---\nname: frontend-design\ndescription: D.\nlicense: x\n---\n# X'), { name: 'frontend-design', beschreibung: 'D.' })
  assert.deepEqual(leseFrontmatter('# kein Frontmatter'), { name: null, beschreibung: null })
  assert.deepEqual(leseFrontmatter('---\nname: x\n'), { name: null, beschreibung: null })
  assert.equal(EINGEBAUTE_SKILLS_S7.length, 18)
  for (const n of ['design', 'doctor', 'loop', 'schedule']) assert.ok(EINGEBAUTE_SKILLS_S7.includes(n))
})

test('pruefeSkillDateiNamen: .claude-Segment oder CLAUDE.md (beliebige Schreibweise) im Skill-Ordner → Grund', () => {
  assert.equal(pruefeSkillDateiNamen(['SKILL.md', 'LICENSE.txt', 'docs/claude.md.bak']), null)
  assert.match(pruefeSkillDateiNamen(['SKILL.md', '.Claude/settings.json']) ?? '', /\.Claude\/settings\.json/)
  assert.match(pruefeSkillDateiNamen(['sub/CLAUDE.md']) ?? '', /sub\/CLAUDE\.md/)
  assert.match(pruefeSkillDateiNamen(['claude.MD']) ?? '', /claude\.MD/)
})
