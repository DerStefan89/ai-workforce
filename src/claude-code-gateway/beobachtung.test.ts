/**
 * Datei: src/claude-code-gateway/beobachtung.test.ts
 *
 * Zweck: F36 WS-4 (features/F36/feature.md AK8, löst F-730) — reine
 * Beobachtung der init-Zeile sowie der Skill-, Subagent- und MCP-Aufrufe aus
 * dem stream-json-Rohstrom (leseBeobachtung) und das additive, optionale
 * Laufakten-Feld `beobachtung` (validiereLaufakteDaten). Seit F36 WS-5a zusätzlich
 * navigate_adressen (input.url je browser_navigate, E-F36-7).
 *
 * Die Fixture-Zeilen sind gekürzte Zeilen aus den realen Spike-Rohströmen
 * (state/spike-f36-werkzeugsatz.md, P1_skill / P2_agent_gp / P3iii_mcp_namen):
 * Feldnamen und Verschachtelung unverändert, nur irrelevante Felder (usage,
 * uuid, session_id, Prompttexte) weggelassen und Listen gekürzt.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { baueBeobachtungsBlock, ermittleHintergrundAufrufe, leseBeobachtung, NAVIGATE_OHNE_URL, validiereLaufakteDaten, zaehleHintergrundAufrufe } from './index.ts'

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
    navigate_adressen: ['about:blank'],
    // F45 B1b-1: AGENT trägt run_in_background: false — zählt nicht.
    hintergrund_aufrufe: [],
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
    navigate_adressen: [],
    hintergrund_aufrufe: [],
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

test('leseBeobachtung (F36 WS-5a): input.url je browser_navigate irgendeines Servers, in Reihenfolge; ohne url Platzhalter; andere Werkzeuge nicht', () => {
  const navigate = (id: string, server: string, input: Record<string, unknown>): string =>
    JSON.stringify({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'tool_use', id, name: `mcp__${server}__browser_navigate`, input }] }, parent_tool_use_id: null })
  const klick = JSON.stringify({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'tool_use', id: 'k', name: 'mcp__playwright-mcp__browser_click', input: { url: 'http://nicht-zaehlen' } }] } })
  const zurueck = JSON.stringify({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'tool_use', id: 'z', name: 'mcp__playwright-mcp__browser_navigate_back', input: {} }] } })
  const b = leseBeobachtung([INIT, navigate('a', 'playwright-mcp', { url: 'http://localhost:5173/' }), klick, zurueck, navigate('b', 'anderer', {}), navigate('c', 'playwright-mcp', { url: 'https://example.com' })])
  assert.deepStrictEqual(b?.navigate_adressen, ['http://localhost:5173/', NAVIGATE_OHNE_URL, 'https://example.com'])
})

/** F45 B1b-1: tool_use mit run_in_background true (Form wie im Lauf af862c09, F-1026). */
const BASH_HINTERGRUND = JSON.stringify({
  type: 'assistant',
  message: { role: 'assistant', content: [{ type: 'tool_use', id: 'toolu_h1', name: 'Bash', input: { command: 'npm run check', run_in_background: true } }] },
  parent_tool_use_id: null,
})
const AGENT_HINTERGRUND = AGENT.replace('"run_in_background":false', '"run_in_background":true')

test('leseBeobachtung (F45 B1b-1): run_in_background true zählt je Werkzeug, false/fehlend nicht', () => {
  const b = leseBeobachtung([INIT, BASH, BASH_HINTERGRUND, AGENT, AGENT_HINTERGRUND, RESULT])
  assert.deepStrictEqual(b?.hintergrund_aufrufe, ['Bash', 'Agent'])
  assert.deepStrictEqual(leseBeobachtung([INIT, BASH, AGENT, RESULT])?.hintergrund_aufrufe, [])
})

test('zaehleHintergrundAufrufe (F45 B1b-1): zählt auch ohne init-Zeile, String "true" zählt nicht, wirft nie', () => {
  assert.strictEqual(zaehleHintergrundAufrufe([BASH_HINTERGRUND, AGENT_HINTERGRUND, BASH]), 2)
  assert.strictEqual(zaehleHintergrundAufrufe([BASH_HINTERGRUND.replace('"run_in_background":true', '"run_in_background":"true"')]), 0)
  assert.strictEqual(zaehleHintergrundAufrufe(['', 'kein json', '{"type":"assistant"']), 0)
})

/** user-Zeile mit tool_result zu toolUseId; zusatz z. B. tool_use_result. */
function toolResult(toolUseId: string, fehler: boolean, zusatz: Record<string, unknown> = {}): string {
  return JSON.stringify({ type: 'user', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: toolUseId, is_error: fehler, content: 'x' }] }, ...zusatz })
}

test('ermittleHintergrundAufrufe (F45 B1b-1, Advisor A1): automatisches Verschieben ohne run_in_background zählt über tool_use_result.backgroundTaskId (Form af862c09)', () => {
  const bashMitZeitgrenze = BASH.replace('"input":{"command":"npm run check"}', '"input":{"command":"npm run check","timeout":300000}')
  const verschoben = toolResult('toolu_x2', false, { tool_use_result: { stdout: '', stderr: '', interrupted: false, backgroundTaskId: 'bs0ztc3f3', timedOutAfterMs: 300000 } })
  assert.deepStrictEqual(ermittleHintergrundAufrufe([INIT, bashMitZeitgrenze, verschoben, RESULT]), ['Bash'])
  // Ein leerer oder fehlender backgroundTaskId zählt nicht; Text im tool_result wird nicht gelesen.
  assert.deepStrictEqual(ermittleHintergrundAufrufe([INIT, BASH, toolResult('toolu_x2', false, { tool_use_result: { backgroundTaskId: '' } })]), [])
  assert.deepStrictEqual(ermittleHintergrundAufrufe([INIT, BASH, toolResult('toolu_x2', false)]), [])
})

test('ermittleHintergrundAufrufe (F45 B1b-1, Advisor A2): abgelehnter Hintergrund-Versuch (is_error) zählt nicht, angenommener zählt', () => {
  assert.deepStrictEqual(ermittleHintergrundAufrufe([INIT, BASH_HINTERGRUND, toolResult('toolu_h1', true)]), [])
  assert.deepStrictEqual(ermittleHintergrundAufrufe([INIT, BASH_HINTERGRUND, toolResult('toolu_h1', false)]), ['Bash'])
  assert.deepStrictEqual(leseBeobachtung([INIT, BASH_HINTERGRUND, toolResult('toolu_h1', true), RESULT])?.hintergrund_aufrufe, [])
})

test('ermittleHintergrundAufrufe (F45 B1b-1, Korrekturrunde): mehrere tool_results in einer Zeile mit backgroundTaskId → alle zählen (fail-closed); Subagent-Zeile zählt mit', () => {
  const zwei = JSON.stringify({
    type: 'assistant',
    message: { role: 'assistant', content: [{ type: 'tool_use', id: 'a', name: 'Bash', input: { command: 'npm run check' } }, { type: 'tool_use', id: 'b', name: 'Bash', input: { command: 'npm run test' } }] },
    parent_tool_use_id: 'toolu_sub',
  })
  const ergebnisse = JSON.stringify({
    type: 'user',
    message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'a', content: 'x' }, { type: 'tool_result', tool_use_id: 'b', content: 'y' }] },
    tool_use_result: { backgroundTaskId: 'bg1' },
    parent_tool_use_id: 'toolu_sub',
  })
  assert.deepStrictEqual(ermittleHintergrundAufrufe([INIT, zwei, ergebnisse]), ['Bash', 'Bash'])
})

test('validiereLaufakteDaten (F45 B1b-1): hintergrund_aufrufe optional, falsch typisiert ungültig', () => {
  const gueltig = leseBeobachtung([INIT, BASH_HINTERGRUND])
  assert.ok(gueltig !== null)
  assert.deepStrictEqual(validiereLaufakteDaten({ ...ALTE_LAUFAKTE, beobachtung: gueltig }), [])
  const { hintergrund_aufrufe: _weg, ...ohne } = gueltig
  assert.deepStrictEqual(validiereLaufakteDaten({ ...ALTE_LAUFAKTE, beobachtung: ohne }), [])
  assert.ok(validiereLaufakteDaten({ ...ALTE_LAUFAKTE, beobachtung: { ...gueltig, hintergrund_aufrufe: 1 } }).some((v) => v.includes('hintergrund_aufrufe')))
})

test('validiereLaufakteDaten (F36 WS-5a): navigate_adressen optional, falsch typisiert ungültig', () => {
  const gueltig = leseBeobachtung([INIT])
  assert.ok(gueltig !== null)
  const { navigate_adressen: _weg, ...ohneAdressen } = gueltig
  assert.deepStrictEqual(validiereLaufakteDaten({ ...ALTE_LAUFAKTE, beobachtung: ohneAdressen }), [])
  assert.ok(validiereLaufakteDaten({ ...ALTE_LAUFAKTE, beobachtung: { ...gueltig, navigate_adressen: [3] } }).some((v) => v.includes('navigate_adressen')))
})

test('baueBeobachtungsBlock (F45 B1b-1, F-937): geladen gegen aufgerufen, dedupliziert mit Anzahl, keine URLs/Werkzeugliste', () => {
  const b = leseBeobachtung([INIT, SKILL, AGENT, SUBAGENT_MCP, SKILL, BASH_HINTERGRUND, RESULT])
  const block = baueBeobachtungsBlock(b)
  assert.match(block, /^Beobachtung des Ausführungslaufs \(geladen gegen aufgerufen/)
  assert.match(block, /Skills geladen: advisor-pass, git-flow, ponytail · aufgerufen: ponytail \(2×\)/)
  assert.match(block, /Subagenten geladen: architecture-advisor, code-reviewer, general-purpose, qa · aufgerufen: qa/)
  assert.match(block, /MCP-Server geladen: playwright-mcp · aufgerufen \(Server\): playwright-mcp/)
  assert.match(block, /Hintergrund-Aufrufe: 1/)
  assert.doesNotMatch(block, /about:blank|Bash|Write|rohstrom/i)
})

test('baueBeobachtungsBlock (F45 B1b-1): ohne Beobachtung klarer Satz; leere Listen „—“; alte Laufakte ohne Feld; Kürzung ab 21 Namen', () => {
  for (const fehlt of [null, undefined]) assert.match(baueBeobachtungsBlock(fehlt), /keine Beobachtung \(Codex-Lauf oder Lauf ohne init-Zeile\)/)
  const leer = leseBeobachtung([JSON.stringify({ type: 'system', subtype: 'init' })])
  assert.ok(leer !== null)
  assert.match(baueBeobachtungsBlock(leer), /Skills geladen: — · aufgerufen: —/)
  assert.match(baueBeobachtungsBlock(leer), /Hintergrund-Aufrufe: 0/)
  const { hintergrund_aufrufe: _weg, ...alt } = leer
  assert.match(baueBeobachtungsBlock(alt), /Hintergrund-Aufrufe: nicht erfasst/)
  const viele = { ...leer, init_skills: Array.from({ length: 25 }, (_, i) => `s${i}`) }
  assert.match(baueBeobachtungsBlock(viele), /s19 … und 5 weitere · aufgerufen/)
})
