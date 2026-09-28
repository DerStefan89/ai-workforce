/**
 * Datei: public/leitstand/beobachtung-zeile.test.mjs
 *
 * Zweck: F36 WS-4 (AK8) — reine Prüfung der kompakten Beobachtungszeile
 * der Laufdetailansicht (formatiereBeobachtung). Das Markup selbst belegt
 * der Render-Nachweis features/F36/nachweis-ws4-ui/.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatiereBeobachtung } from './beobachtung-zeile.js'

test('formatiereBeobachtung: Zähler und Aufruflisten in Auftretensreihenfolge', () => {
  const text = formatiereBeobachtung({
    init_tools: ['Read', 'Skill'],
    init_agents: ['qa', 'code-reviewer'],
    init_skills: ['ponytail', 'git-flow', 'advisor-pass'],
    init_mcp_server: ['playwright-mcp'],
    skill_aufrufe: ['ponytail', 'ponytail'],
    subagent_aufrufe: ['qa'],
    mcp_aufrufe: ['mcp__playwright-mcp__browser_navigate'],
  })
  assert.strictEqual(
    text,
    'Geladen: 3 Skills · 2 Agents · 1 MCP · Aufgerufen: Skills [ponytail, ponytail] · Subagenten [qa] · MCP [mcp__playwright-mcp__browser_navigate]'
  )
})

test('formatiereBeobachtung: leere Aufruflisten erscheinen als []', () => {
  const leer = { init_tools: [], init_agents: [], init_skills: [], init_mcp_server: [], skill_aufrufe: [], subagent_aufrufe: [], mcp_aufrufe: [] }
  assert.strictEqual(formatiereBeobachtung(leer), 'Geladen: 0 Skills · 0 Agents · 0 MCP · Aufgerufen: Skills [] · Subagenten [] · MCP []')
})

test('formatiereBeobachtung: unvollständiges Objekt (von Hand veränderte Laufakte) wirft nicht', () => {
  assert.strictEqual(formatiereBeobachtung({ skill_aufrufe: ['ponytail'] }), 'Geladen: 0 Skills · 0 Agents · 0 MCP · Aufgerufen: Skills [ponytail] · Subagenten [] · MCP []')
})

test('formatiereBeobachtung: fehlendes Feld (alte Laufakte, Codex) → "nicht beobachtet"', () => {
  assert.strictEqual(formatiereBeobachtung(null), 'nicht beobachtet')
  assert.strictEqual(formatiereBeobachtung(undefined), 'nicht beobachtet')
})
