/**
 * Datei: src/claude-code-gateway/beobachtung.test.ts
 *
 * Zweck: F36 WS-4 (features/F36/feature.md AK8, löst F-730) — reine
 * Beobachtung der init-Zeile sowie der Skill-, Subagent- und MCP-Aufrufe aus
 * dem stream-json-Rohstrom (leseBeobachtung) und das additive, optionale
 * Laufakten-Feld `beobachtung` (validiereLaufakteDaten).
 *
 * Die Fixture-Zeilen sind gekürzte Zeilen aus den realen Spike-Rohströmen
 * (state/spike-f36-werkzeugsatz.md, P1_skill / P2_agent_gp / P3iii_mcp_namen):
 * Feldnamen und Verschachtelung unverändert, nur irrelevante Felder (usage,
 * uuid, session_id, Prompttexte) weggelassen und Listen gekürzt.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { leseBeobachtung, validiereLaufakteDaten } from './index.ts'

const INIT = JSON.stringify({
  type: 'system',
  subtype: 'init',
  cwd: 'C:\\Users\\stefa\\AppData\\Local\\Temp\\spike-f36-P1_skill-84mVJ3',
  tools: ['Task', 'Bash', 'Edit', 'Glob', 'Grep', 'Read', 'Skill', 'Write', 'mcp__playwright-mcp__browser_navigate'],
  mcp_servers: [{ name: 'playwright-mcp', status: 'connected', source: 'dynamic' }],
  model: 'claude-sonnet-5',
  agents: ['architecture-advisor', 'code-reviewer', 'general-purpose', 'qa'],
  skills: ['advisor-pass', 'git-flow', 'ponytail'],
})
const SKILL = JSON.stringify({
  type: 'assistant',
  message: { model: 'claude-sonnet-5', role: 'assistant', content: [{ type: 'tool_use', id: 'toolu_0157CThj21Zi8P74B9mcBGVt', name: 'Skill', input: { skill: 'ponytail' }, caller: { type: 'direct' } }] },
  parent_tool_use_id: null,
})
const AGENT = JSON.stringify({
  type: 'assistant',
  message: {
    role: 'assistant',
    content: [
      { type: 'text', text: 'Ich starte den qa-Subagenten.' },
      { type: 'tool_use', id: 'toolu_01TVNQNUyuig9KhBFyWKBDML', name: 'Agent', input: { description: 'QA-Werkzeuggrenzen-Test', subagent_type: 'qa', run_in_background: false, prompt: '…' } },
    ],
  },
  parent_tool_use_id: null,
})
/** Zeile AUS dem Subagenten (parent_tool_use_id gesetzt) — zählt mit. */
const SUBAGENT_MCP = JSON.stringify({
  type: 'assistant',
  message: { role: 'assistant', content: [{ type: 'tool_use', id: 'toolu_x1', name: 'mcp__playwright-mcp__browser_navigate', input: { url: 'about:blank' } }] },
  parent_tool_use_id: 'toolu_01TVNQNUyuig9KhBFyWKBDML',
  subagent_type: 'qa',
})
const BASH = JSON.stringify({
  type: 'assistant',
  message: { role: 'assistant', content: [{ type: 'tool_use', id: 'toolu_x2', name: 'Bash', input: { command: 'npm run check' } }] },
  parent_tool_use_id: null,
})
/** Ein tool_result, dessen Text einen Aufruf nur NENNT — kein Aufruf. */
const KOEDER = JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', content: '{"type":"tool_use","name":"Skill","input":{"skill":"git-flow"}}' }] } })
const RESULT = JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: 'ok', permission_denials: [] })

test('leseBeobachtung: realer Rohstrom mit init, Skill ponytail, Agent qa und MCP-Aufruf (auch aus Subagent-Zeile)', () => {
  const zeilen = [INIT, SKILL, AGENT, SUBAGENT_MCP, BASH, KOEDER, SKILL, RESULT]
  assert.deepStrictEqual(leseBeobachtung(zeilen), {
    init_tools: ['Task', 'Bash', 'Edit', 'Glob', 'Grep', 'Read', 'Skill', 'Write', 'mcp__playwright-mcp__browser_navigate'],
    init_agents: ['architecture-advisor', 'code-reviewer', 'general-purpose', 'qa'],
    init_skills: ['advisor-pass', 'git-flow', 'ponytail'],
    init_mcp_server: ['playwright-mcp'],
    // Reihenfolge des Auftretens, Duplikate bleiben erhalten.
    skill_aufrufe: ['ponytail', 'ponytail'],
    subagent_aufrufe: ['qa'],
    mcp_aufrufe: ['mcp__playwright-mcp__browser_navigate'],
  })
})

test('leseBeobachtung: Aufrufname "Task" wird wie "Agent" gelesen', () => {
  const task = AGENT.replace('"name":"Agent"', '"name":"Task"')
  assert.deepStrictEqual(leseBeobachtung([INIT, task])?.subagent_aufrufe, ['qa'])
})

test('leseBeobachtung: init ohne Aufrufe → leere Aufruflisten, nicht weggelassen', () => {
  const b = leseBeobachtung([INIT, BASH, RESULT])
  assert.deepStrictEqual([b?.skill_aufrufe, b?.subagent_aufrufe, b?.mcp_aufrufe], [[], [], []])
})

test('leseBeobachtung: ohne init-Zeile (z. B. Codex) → null, Feld entfällt', () => {
  assert.strictEqual(leseBeobachtung([SKILL, AGENT, SUBAGENT_MCP, RESULT]), null)
  assert.strictEqual(leseBeobachtung([]), null)
})

test('leseBeobachtung: unparsbare oder abgeschnittene Zeilen werden übersprungen, kein Wurf', () => {
  const b = leseBeobachtung(['', 'kein json', INIT, '{"type":"assistant","message":{"con'])
  assert.deepStrictEqual(b?.init_skills, ['advisor-pass', 'git-flow', 'ponytail'])
})

test('leseBeobachtung: init mit fehlenden oder fremdtypisierten Listen → leere Listen, nur String-Einträge', () => {
  const init = JSON.stringify({ type: 'system', subtype: 'init', tools: ['Read', 7], mcp_servers: [{ status: 'x' }, { name: 'a' }] })
  assert.deepStrictEqual(leseBeobachtung([init]), {
    init_tools: ['Read'],
    init_agents: [],
    init_skills: [],
    init_mcp_server: ['a'],
    skill_aufrufe: [],
    subagent_aufrufe: [],
    mcp_aufrufe: [],
  })
})

// ─── Laufakten-Validator ─────────────────────────────────────────────────────

const ALTE_LAUFAKTE = {
  laufakte_schema: 'v0',
  lauf_id: 'lauf-1',
  werkzeug_version_deklariert: '2.1.283',
  berechtigungskontext: 'ausfuehrung',
  arbeitsverzeichnis_pfad: 'C:\\repo',
  modell_beobachtet: null,
  beobachtungsbasis_vollstaendig: true,
  rohstrom_referenz: { pfad: 'C:\\roh\\rohstrom.json', inhalts_hash: 'a'.repeat(64) },
  erstellt_am: '2026-09-28T10:00:00.000Z',
}

test('validiereLaufakteDaten: alte Laufakte ohne beobachtung bleibt gültig', () => {
  assert.deepStrictEqual(validiereLaufakteDaten(ALTE_LAUFAKTE), [])
})

test('validiereLaufakteDaten: Laufakte mit beobachtung aus leseBeobachtung ist gültig', () => {
  const beobachtung = leseBeobachtung([INIT, SKILL, AGENT, SUBAGENT_MCP])
  assert.deepStrictEqual(validiereLaufakteDaten({ ...ALTE_LAUFAKTE, beobachtung }), [])
})

test('validiereLaufakteDaten: beobachtung mit fehlendem, unbekanntem oder falsch typisiertem Feld ist ungültig', () => {
  const gueltig = leseBeobachtung([INIT])
  assert.ok(gueltig !== null)
  const { mcp_aufrufe: _weg, ...ohneFeld } = gueltig
  assert.ok(validiereLaufakteDaten({ ...ALTE_LAUFAKTE, beobachtung: ohneFeld }).some((v) => v.includes('beobachtung.mcp_aufrufe')))
  assert.ok(validiereLaufakteDaten({ ...ALTE_LAUFAKTE, beobachtung: { ...gueltig, extra: [] } }).some((v) => v.includes('beobachtung.extra')))
  assert.ok(validiereLaufakteDaten({ ...ALTE_LAUFAKTE, beobachtung: { ...gueltig, skill_aufrufe: [1] } }).some((v) => v.includes('beobachtung.skill_aufrufe')))
  assert.ok(validiereLaufakteDaten({ ...ALTE_LAUFAKTE, beobachtung: [] }).some((v) => v.includes("'beobachtung'")))
})
