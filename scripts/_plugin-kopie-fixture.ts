/**
 * Datei: scripts/_plugin-kopie-fixture.ts
 *
 * Zweck: Fixture-Plugin für die gefilterte Kopie (F45 F-3b-1, Plan features/F45/plan-f3b.md v2.1): „kraft@markt“, ähnlich
 * superpowers — drei übernehmbare Skills (Texte mit git push/merge, gh pr, git worktree add, Subagenten, Inline-Shell), ein
 * Skill mit Hook und einer mit allowed-tools im Frontmatter, ein Agent mit tools und einer ohne, drei Commands (ohne
 * Frontmatter, mit allowed-tools, mit BOM vor dem Frontmatter), hooks/hooks.json, in plugin.json eingebettete hooks und
 * mcpServers, .lsp.json, LICENSE, README, .in_use/ und .git/ (kein Inhalt).
 *
 * Wird aufgerufen von: src/plugin-kopie/kopie.test.ts, scripts/check-f45-f3b1-freigabe.mjs,
 * scripts/leitstand/routen-plugins.test.mjs.
 *
 * Wichtig: Nur Wegwerf-Ordner unter dem übergebenen Pfad; nie unter dem echten ~/.claude.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** Erwartung der Übernahme (Typ:Name) für das unveränderte Fixture. */
export const KRAFT_UEBERNOMMEN: readonly string[] = ['skill:abschluss', 'skill:baeume', 'skill:debuggen', 'agent:pruefer', 'command:plan']

/** Erwartung „nicht übernommen“ (Typ:Name:Grund) für das unveränderte Fixture. */
export const KRAFT_NICHT_UEBERNOMMEN: readonly string[] = [
  'skill:mit-hooks:frontmatter_feld',
  'skill:mit-rechten:allowed_tools',
  'agent:ohne-tools:agent_tools_fehlt',
  'command:bom:frontmatter_unklar',
  'command:review:allowed_tools',
  'hook:SessionStart:hook_nie',
  'hook:PostToolUse:hook_nie',
  'mcp:fern:mcp_spaeter',
  'lsp:ts:lsp_nicht',
]

/**
 * Schreibt eine Datei (Ordner werden angelegt).
 * @param basis - Wurzel
 * @param rel - relativer Pfad mit '/'
 * @param inhalt - Text oder Bytes
 */
export function schreibeFixtureDatei(basis: string, rel: string, inhalt: string | Buffer): void {
  const ziel = join(basis, ...rel.split('/'))
  mkdirSync(join(ziel, '..'), { recursive: true })
  writeFileSync(ziel, inhalt)
}

/**
 * Legt das Plugin „kraft“ unter <wurzel>/kraft an.
 * @param wurzel - leerer Wegwerf-Ordner
 * @returns absoluter Plugin-Ordner
 */
export function legeKraftPluginAn(wurzel: string): string {
  const p = join(wurzel, 'kraft')
  const s = (rel: string, inhalt: string | Buffer): void => schreibeFixtureDatei(p, rel, inhalt)
  s(
    '.claude-plugin/plugin.json',
    JSON.stringify({
      name: 'kraft',
      version: '2.0.0',
      description: 'Kraft für Fixture',
      license: 'MIT',
      author: { name: 'Fixture' },
      hooks: { PostToolUse: [{ matcher: 'Write', hooks: [{ type: 'command', command: 'node nach.js' }] }] },
      mcpServers: { fern: { type: 'http', url: 'https://mcp.example.invalid/mcp' } },
    })
  )
  s('LICENSE', 'MIT License\n')
  s('README.md', '# Kraft\n')
  s('skills/debuggen/SKILL.md', '---\nname: debuggen\ndescription: Use when debugging\n---\n\nFinde die Ursache, bevor du etwas änderst.\n')
  s('skills/debuggen/vorlage.md', 'Starte einen Subagent je Aufgabe.\nDann git push origin main.\n')
  s('skills/abschluss/SKILL.md', '---\nname: abschluss\ndescription: "Use when finishing a branch"\n---\n\nZeile zwei\nRun `git merge feature` and then gh pr create.\nStatus: !`git status`\n')
  s('skills/baeume/SKILL.md', '---\nname: baeume\ndescription: Use when isolating work\n---\n\ngit worktree add ../baum -b x\n')
  s('skills/mit-hooks/SKILL.md', '---\nname: mit-hooks\ndescription: Skill mit Hook\nhooks:\n  PreToolUse: []\n---\n\nText\n')
  s('skills/mit-rechten/SKILL.md', '---\nname: mit-rechten\ndescription: Skill mit Rechten\nallowed-tools: Bash(gh pr comment:*)\n---\n\nText\n')
  s('agents/pruefer.md', '---\nname: pruefer\ndescription: Prüft Code\ntools: Read, Grep\nmodel: inherit\n---\n\nDu prüfst.\n')
  s('agents/ohne-tools.md', '---\nname: ohne-tools\ndescription: Erbt alles\n---\n\nText\n')
  s('commands/plan.md', 'Nutze den Skill kraft:debuggen.\n')
  s('commands/review.md', '---\nallowed-tools: Bash(gh pr comment:*)\ndescription: Review\n---\n\nText\n')
  s('commands/bom.md', '\uFEFF---\nallowed-tools: Bash(gh:*)\n---\n\nText\n')
  s('hooks/hooks.json', JSON.stringify({ hooks: { SessionStart: [{ matcher: 'startup', hooks: [{ type: 'command', command: '"${CLAUDE_PLUGIN_ROOT}/hooks/run" start' }] }] } }))
  s('.lsp.json', JSON.stringify({ ts: { command: 'typescript-language-server', args: ['--stdio'] } }))
  s('.in_use/42', 'marke\n')
  s('.git/HEAD', 'ref: refs/heads/main\n')
  return p
}
