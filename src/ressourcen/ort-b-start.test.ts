/**
 * Datei: src/ressourcen/ort-b-start.test.ts
 *
 * Zweck: node:test-Fälle für src/ressourcen/ort-b-start.ts (F36 WS-5b): V4a-Bausteine exakt (add-dir,
 * Sperrregeln in S4b-Form, settings), Projekt-Skill-Namen aus Ordner und Frontmatter, und jeder
 * fail-closed-Grund vor dem Spawn (inhalt_hash, Layout, Namenskollision eingebaut/Projekt/Ort-B,
 * verschachteltes .claude inkl. node_modules, .git übersprungen). Wegwerf-Ordner unter os.tmpdir().
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 */

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { raeumeVerzeichnis } from '../../scripts/_aufraeumen.ts'
import { baueOrtBSkillStart, leseProjektSkillNamen, scanneVerschachtelteClaudeOrdner } from './ort-b-start.ts'
import { berechneInhaltHash } from './skill-dateien.ts'
import type { Ressource } from './types.ts'

/** Legt <cap>/<id>/.claude/skills/<name>/SKILL.md an und liefert den Katalogeintrag dazu. */
function ortBSkill(capWurzel: string, id: string, name: string, frontmatterName = name): Ressource {
  const ordner = join(capWurzel, id, '.claude', 'skills', name)
  mkdirSync(ordner, { recursive: true })
  writeFileSync(join(ordner, 'SKILL.md'), `---\nname: ${frontmatterName}\ndescription: Test.\n---\n`)
  return {
    id,
    typ: 'extern',
    name: id,
    beschreibung: 'Test.',
    unterart: 'skill',
    capabilities: ['X'],
    freigabe: 'FREIGEGEBEN',
    herkunft: { art: 'extern', url: 'https://github.com/o/r' },
    installation: { pfad: ordner, version: 'a'.repeat(40), inhalt_hash: berechneInhaltHash(ordner) },
  }
}

/** Wegwerf-Umgebung: cap-Wurzel und Projekt mit Projekt-Skills ponytail (Ordner = name) und ordner-x (name: anders-x). */
function umgebung(): { cap: string; projekt: string; ende: () => void } {
  const cap = mkdtempSync(join(tmpdir(), 'ws5b-cap-'))
  const projekt = mkdtempSync(join(tmpdir(), 'ws5b-projekt-'))
  mkdirSync(join(projekt, '.claude', 'skills', 'ponytail'), { recursive: true })
  writeFileSync(join(projekt, '.claude', 'skills', 'ponytail', 'SKILL.md'), '---\nname: ponytail\ndescription: P.\n---\n')
  mkdirSync(join(projekt, '.claude', 'skills', 'ordner-x'), { recursive: true })
  writeFileSync(join(projekt, '.claude', 'skills', 'ordner-x', 'SKILL.md'), '---\nname: anders-x\ndescription: X.\n---\n')
  mkdirSync(join(projekt, '.claude', 'agents'), { recursive: true })
  return {
    cap,
    projekt,
    ende() {
      raeumeVerzeichnis(cap)
      raeumeVerzeichnis(projekt)
    },
  }
}

test('baueOrtBSkillStart: zwei Skills → add-dir je cap-Ordner, Sperrregeln S4b-Form + .claude + design/doctor/Projekt, settings', () => {
  const u = umgebung()
  try {
    const a = ortBSkill(u.cap, 'fd', 'frontend-design')
    const b = ortBSkill(u.cap, 'pruef', 'pruef-skill')
    const e = baueOrtBSkillStart([a, b], u.projekt, u.cap)
    assert.ok(e.ok, e.ok ? '' : e.grund)
    const s4b = (id: string) => join(u.cap, id).replaceAll('\\', '/')
    assert.deepEqual(e.start.addDirs, [join(u.cap, 'fd'), join(u.cap, 'pruef')])
    assert.deepEqual(e.start.disallowedTools, [
      `Write(${s4b('fd')}/**)`,
      `Edit(${s4b('fd')}/**)`,
      `Write(${s4b('pruef')}/**)`,
      `Edit(${s4b('pruef')}/**)`,
      'Write(**/.claude/**)',
      'Edit(**/.claude/**)',
      'Skill(design)',
      'Skill(doctor)',
      'Skill(anders-x)',
      'Skill(ordner-x)',
      'Skill(ponytail)',
    ])
    assert.ok(!e.start.disallowedTools.some((r) => r.startsWith('Write(//')), 'nicht die //C:/-Form (S4c)')
    assert.deepEqual(JSON.parse(e.start.settings), { disableBundledSkills: true, skillOverrides: { design: 'off', doctor: 'off', 'anders-x': 'off', 'ordner-x': 'off', ponytail: 'off' } })
    assert.deepEqual(e.start.skillNamen, ['frontend-design', 'pruef-skill'])
    assert.deepEqual(e.start.gesperrteNamen, ['design', 'doctor', 'anders-x', 'ordner-x', 'ponytail'], 'F-831: dieselbe Menge wie Skill(…)/skillOverrides')
    assert.equal(e.start.settings.includes('enabledPlugins'), false)
  } finally {
    u.ende()
  }
})

test('baueOrtBSkillStart: inhalt_hash geändert → kein Start', () => {
  const u = umgebung()
  try {
    const a = ortBSkill(u.cap, 'fd', 'frontend-design')
    writeFileSync(join(u.cap, 'fd', '.claude', 'skills', 'frontend-design', 'nachgelegt.sh'), 'rm -rf /')
    const e = baueOrtBSkillStart([a], u.projekt, u.cap)
    assert.equal(e.ok, false)
    assert.match(e.ok ? '' : e.grund, /inhalt_hash .* weicht .* ab/)
  } finally {
    u.ende()
  }
})

test('baueOrtBSkillStart: Namenskollision eingebaut / Projekt (Ordner und Frontmatter) / Ort-B doppelt → kein Start', () => {
  const u = umgebung()
  try {
    const fall = (skills: Ressource[], muster: RegExp) => {
      const e = baueOrtBSkillStart(skills, u.projekt, u.cap)
      assert.equal(e.ok, false)
      assert.match(e.ok ? '' : e.grund, muster)
    }
    fall([ortBSkill(u.cap, 'l', 'loop')], /eingebauten Skill/)
    fall([ortBSkill(u.cap, 'p', 'ponytail')], /kollidieren mit Projekt-Skills/)
    fall([ortBSkill(u.cap, 'q', 'anders-x')], /kollidieren mit Projekt-Skills/)
    fall([ortBSkill(u.cap, 'd1', 'dup'), ortBSkill(u.cap, 'd2', 'dup')], /doppelt unter den Ort-B-Skills/)
    fall([ortBSkill(u.cap, 'fm', 'ordner', 'anderer-name')], /Frontmatter-name 'anderer-name' ≠ Ordnername 'ordner'/)
  } finally {
    u.ende()
  }
})

test('baueOrtBSkillStart: cap-Ordner mit mehr als .claude/skills/<name> (z. B. Agent, settings.json, zweiter Skill) → kein Start', () => {
  for (const zusatz of [['.claude', 'agents', 'x.md'], ['.claude', 'settings.json'], ['.claude', 'skills', 'zweiter', 'SKILL.md'], ['README.md']]) {
    const u = umgebung()
    try {
      const a = ortBSkill(u.cap, 'fd', 'frontend-design')
      const datei = join(u.cap, 'fd', ...zusatz)
      mkdirSync(join(datei, '..'), { recursive: true })
      writeFileSync(datei, 'x')
      const e = baueOrtBSkillStart([a], u.projekt, u.cap)
      assert.equal(e.ok, false, zusatz.join('/'))
      assert.match(e.ok ? '' : e.grund, /enthält mehr als \.claude\/skills\/frontend-design/)
    } finally {
      u.ende()
    }
  }
})

test('baueOrtBSkillStart: nicht FREIGEGEBEN, keine Skill-installation, falsches Layout → kein Start', () => {
  const u = umgebung()
  try {
    const a = ortBSkill(u.cap, 'fd', 'frontend-design')
    assert.equal(baueOrtBSkillStart([{ ...a, freigabe: 'OFFEN' }], u.projekt, u.cap).ok, false)
    assert.equal(baueOrtBSkillStart([{ ...a, installation: { pfad: '/x', version: '1' } }], u.projekt, u.cap).ok, false)
    assert.equal(baueOrtBSkillStart([{ ...a, unterart: 'agent' }], u.projekt, u.cap).ok, false)
    const falsch = { ...a, installation: { pfad: join(u.cap, 'fd', 'skills', 'frontend-design'), version: 'a'.repeat(40), inhalt_hash: 'b'.repeat(64) } }
    const layout = baueOrtBSkillStart([falsch], u.projekt, u.cap)
    assert.match(layout.ok ? '' : layout.grund, /Ort-B-Layout/)
    assert.equal(baueOrtBSkillStart([], u.projekt, u.cap).ok, false)
  } finally {
    u.ende()
  }
})

test('scanneVerschachtelteClaudeOrdner: .claude/skills|agents|commands unterhalb der Wurzel (auch node_modules) sind Treffer, .git und die Wurzel nicht', () => {
  const u = umgebung()
  try {
    assert.deepEqual(scanneVerschachtelteClaudeOrdner(u.projekt), [])
    mkdirSync(join(u.projekt, '.git', 'x', '.claude', 'skills'), { recursive: true })
    mkdirSync(join(u.projekt, 'docs', '.claude'), { recursive: true })
    writeFileSync(join(u.projekt, 'docs', '.claude', 'settings.json'), '{}')
    assert.deepEqual(scanneVerschachtelteClaudeOrdner(u.projekt), [], '.git übersprungen, .claude ohne skills/agents/commands ok')
    mkdirSync(join(u.projekt, 'packages', 'a', '.claude', 'skills', 'nachlade'), { recursive: true })
    mkdirSync(join(u.projekt, 'node_modules', 'x', '.claude', 'agents'), { recursive: true })
    mkdirSync(join(u.projekt, 'src', '.claude', 'commands'), { recursive: true })
    assert.deepEqual(scanneVerschachtelteClaudeOrdner(u.projekt).sort(), ['node_modules/x/.claude/agents', 'packages/a/.claude/skills', 'src/.claude/commands'])
    const a = ortBSkill(u.cap, 'fd', 'frontend-design')
    const e = baueOrtBSkillStart([a], u.projekt, u.cap)
    assert.equal(e.ok, false)
    assert.match(e.ok ? '' : e.grund, /verschachtelte \.claude-Ordner .*node_modules\/x\/\.claude\/agents/)
  } finally {
    u.ende()
  }
})

test('leseProjektSkillNamen: Ordnername und Frontmatter-name; nicht sperrbarer Name → Ablehnung', () => {
  const u = umgebung()
  try {
    assert.deepEqual(leseProjektSkillNamen(u.projekt), { ok: true, namen: ['anders-x', 'ordner-x', 'ponytail'] })
    const leer = mkdtempSync(join(tmpdir(), 'ws5b-leer-'))
    assert.deepEqual(leseProjektSkillNamen(leer), { ok: true, namen: [] })
    raeumeVerzeichnis(leer)
    mkdirSync(join(u.projekt, '.claude', 'skills', 'boese'), { recursive: true })
    writeFileSync(join(u.projekt, '.claude', 'skills', 'boese', 'SKILL.md'), '---\nname: a),Bash(*\ndescription: X.\n---\n')
    const e = leseProjektSkillNamen(u.projekt)
    assert.equal(e.ok, false)
  } finally {
    u.ende()
  }
})

test('leseProjektSkillNamen (Reviewer H1, real gemessen: Commands per Skill-Werkzeug aufrufbar): .claude/commands/**.md → Dateiname, Unterordner als Namensraum sub:name, Frontmatter-name; Verknüpfung → Ablehnung', (t) => {
  const u = umgebung()
  try {
    mkdirSync(join(u.projekt, '.claude', 'commands', 'sub'), { recursive: true })
    writeFileSync(join(u.projekt, '.claude', 'commands', 'lessons.md'), '---\ndescription: L.\n---\n')
    writeFileSync(join(u.projekt, '.claude', 'commands', 'sub', 'tief.md'), '---\nname: tief-anders\ndescription: T.\n---\n')
    writeFileSync(join(u.projekt, '.claude', 'commands', 'notiz.txt'), 'kein Command')
    assert.deepEqual(leseProjektSkillNamen(u.projekt), { ok: true, namen: ['anders-x', 'lessons', 'ordner-x', 'ponytail', 'sub:tief', 'tief-anders'] })
    const e = baueOrtBSkillStart([ortBSkill(u.cap, 'fd', 'frontend-design')], u.projekt, u.cap)
    assert.ok(e.ok)
    for (const n of ['lessons', 'sub:tief', 'tief-anders']) {
      assert.ok(e.start.disallowedTools.includes(`Skill(${n})`), n)
      assert.equal(JSON.parse(e.start.settings).skillOverrides[n], 'off')
    }
    assert.match((baueOrtBSkillStart([ortBSkill(u.cap, 'l2', 'lessons')], u.projekt, u.cap) as { grund: string }).grund, /kollidieren mit Projekt-Skills\/-Commands/)
    mkdirSync(join(u.projekt, 'ziel'))
    try {
      symlinkSync(join(u.projekt, 'ziel'), join(u.projekt, '.claude', 'commands', 'verweis'), 'junction')
    } catch {
      t.skip('Verknüpfung nicht anlegbar')
      return
    }
    assert.match((leseProjektSkillNamen(u.projekt) as { grund: string }).grund, /Verknüpfung unter \.claude\/commands: verweis/)
  } finally {
    u.ende()
  }
})

test('baueOrtBSkillStart (Reviewer): installation.pfad an <capWurzel>/<id> gebunden; unsicherer cap-Pfad für die Sperrregel; .claude/CLAUDE.md im Skill-Ordner → kein Start', () => {
  const u = umgebung()
  try {
    const a = ortBSkill(u.cap, 'fd', 'frontend-design')
    const fremdeWurzel = mkdtempSync(join(tmpdir(), 'ws5b-fremd-'))
    assert.match((baueOrtBSkillStart([a], u.projekt, fremdeWurzel) as { grund: string }).grund, /liegt nicht unter <cap>\/fd/)
    assert.match((baueOrtBSkillStart([{ ...a, id: 'andere-id' }], u.projekt, u.cap) as { grund: string }).grund, /liegt nicht unter <cap>\/andere-id/)
    raeumeVerzeichnis(fremdeWurzel)
    const leerzeichen = mkdtempSync(join(tmpdir(), 'ws5b mit leer,zeichen-'))
    const b = ortBSkill(leerzeichen, 'fd', 'frontend-design')
    assert.match((baueOrtBSkillStart([b], u.projekt, leerzeichen) as { grund: string }).grund, /brechen würden/)
    raeumeVerzeichnis(leerzeichen)
    for (const [datei, muster] of [[['.claude', 'settings.json'], /\.claude\/settings\.json/], [['CLAUDE.md'], /CLAUDE\.md/]] as const) {
      const c = ortBSkill(mkdtempSync(join(tmpdir(), 'ws5b-cap2-')), 'x', 'x-skill')
      const skillOrdner = (c.installation as { pfad: string }).pfad
      mkdirSync(join(skillOrdner, ...datei.slice(0, -1)), { recursive: true })
      writeFileSync(join(skillOrdner, ...datei), '{}')
      const cap = join(skillOrdner, '..', '..', '..', '..')
      const e = baueOrtBSkillStart([{ ...c, installation: { ...(c.installation as { pfad: string; version: string }), inhalt_hash: berechneInhaltHash(skillOrdner) } }], u.projekt, cap)
      assert.match(e.ok ? '' : e.grund, muster)
      raeumeVerzeichnis(cap)
    }
  } finally {
    u.ende()
  }
})

test('scanneVerschachtelteClaudeOrdner: Groß-/Kleinschreibung egal (NTFS) — sub/.Claude/Skills ist ein Treffer', () => {
  const u = umgebung()
  try {
    mkdirSync(join(u.projekt, 'sub', '.Claude', 'Skills'), { recursive: true })
    assert.deepEqual(scanneVerschachtelteClaudeOrdner(u.projekt), ['sub/.Claude/Skills'])
  } finally {
    u.ende()
  }
})
