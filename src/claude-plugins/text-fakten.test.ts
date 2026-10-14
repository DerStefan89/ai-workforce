/**
 * Datei: src/claude-plugins/text-fakten.test.ts
 *
 * Zweck: node:test-Fälle der Risiko-Fakten aus Texten und Agent-Frontmatter (F45 F-3b-1, Plan features/F45/plan-f3b.md D):
 * git push/merge und gh pr (veröffentlichen), git worktree add, Subagenten, Inline-Shell (!`…`), je mit Datei, erster Zeile
 * und Zahl der Treffer; Wortgrenzen (ghost ≠ gh); Agent-Werkzeuge außerhalb des Werkzeugsatzes bzw. ohne tools.
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 */

import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { raeumeVerzeichnis } from '../../scripts/_aufraeumen.ts'
import { legeKraftPluginAn } from '../../scripts/_plugin-kopie-fixture.ts'
import { lesePluginOrdner, risikenVon, textTreffer } from './index.ts'

const SATZ = ['Read', 'Grep', 'Glob', 'Write', 'Edit', 'Bash(npm install)']

test('textTreffer: Arten, erste Zeile, Anzahl, Wortgrenzen', () => {
  const t = textTreffer('skills/x/SKILL.md', 'eins\ngit push origin\nghost pr\ngh pr create\nGIT  MERGE x\ngit worktree add ../b\nStarte einen Subagent\nnutze das Task tool\n!`git status`\n')
  const kurz = t.map((x) => `${x.art}@${x.zeile}x${x.anzahl}`)
  assert.deepEqual(kurz, ['text_veroeffentlichen@2x3', 'text_worktree@6x1', 'text_subagenten@7x2', 'text_shell_inline@9x1'])
  assert.deepEqual(textTreffer('a.md', 'ghost prompt\ngithub push\nsubagentur? nein: subagents ja'), [{ art: 'text_subagenten', datei: 'a.md', zeile: 3, anzahl: 1 }])
  assert.deepEqual(textTreffer('a.md', ''), [])
})

test('lesePluginOrdner + risikenVon: Text-Fakten aus SKILL.md und weiteren .md im Skill-Ordner, Agent-Werkzeuge', async () => {
  const wurzel = mkdtempSync(join(tmpdir(), 'aiw-textfakten-'))
  try {
    const gelesen = await lesePluginOrdner(legeKraftPluginAn(wurzel))
    const risiken = risikenVon(gelesen.bestandteile, SATZ).filter((r) => r.art.startsWith('text_') || r.art === 'agent_werkzeuge')
    const kurz = risiken.map((r) => `${r.art} ${r.bestandteil}`)
    assert.ok(kurz.includes('text_veroeffentlichen skill:debuggen'), kurz.join('\n'))
    assert.ok(kurz.includes('text_subagenten skill:debuggen'))
    assert.ok(kurz.includes('text_veroeffentlichen skill:abschluss'))
    assert.ok(kurz.includes('text_shell_inline skill:abschluss'))
    assert.ok(kurz.includes('text_worktree skill:baeume'))
    assert.ok(kurz.includes('agent_werkzeuge agent:ohne-tools'))
    assert.ok(!kurz.includes('agent_werkzeuge agent:pruefer'))
    const vorlage = risiken.find((r) => r.art === 'text_veroeffentlichen' && r.bestandteil === 'skill:debuggen')
    assert.match(vorlage?.text ?? '', /skills\/debuggen\/vorlage\.md:2/)
    const fremd = risikenVon(gelesen.bestandteile, ['Read']).filter((r) => r.art === 'agent_werkzeuge').map((r) => r.bestandteil)
    assert.deepEqual(fremd.sort(), ['agent:ohne-tools', 'agent:pruefer'])
  } finally {
    raeumeVerzeichnis(wurzel)
  }
})
