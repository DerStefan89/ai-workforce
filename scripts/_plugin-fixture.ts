/**
 * Datei: scripts/_plugin-fixture.ts
 *
 * Zweck: Fixture-Bestand für den Plugin-Leser (F45 F-3a-1): ein simuliertes `~/.claude` unter einem Wegwerf-Ordner mit
 * - voll@markt: Skill (allowed-tools Read, Bash(curl:*)), Agent (tools Read, Grep), Command (allowed-tools
 *   Bash(gh pr comment:*), Bash(npm run check:*)), hooks/hooks.json (SessionStart, Befehl mit Geheimnis-Muster), Hook
 *   eingebettet in plugin.json (PostToolUse, Advisor H2), .mcp.json (npx …@latest, npx @scope/paket@1.2.3, http mit headers
 *   und Geheimnis in der url,
 *   node mit env und Geheimnis als eigenes args-Element), .lsp.json, LICENSE, .in_use/123 und .git/HEAD (nicht Inhalt);
 * - nur-skill@markt: ein Skill;
 * - kaputt@markt: plugin.json kein JSON, hooks/hooks.json mit falscher Form;
 * - cc-plugin-fixture@builtin als Listeneintrag;
 * dazu installed_plugins.json (Commit für voll) und die passende Ausgabe von `claude plugin list --json`.
 *
 * Wird aufgerufen von: src/claude-plugins/plugins.test.ts, scripts/check-f45-f3a-plugins.mjs.
 *
 * Wichtig: Nur Wegwerf-Ordner unter dem übergebenen Pfad; nie unter dem echten ~/.claude.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** Geheimnis-Muster im Hook-Befehl (GitHub-Token-Form) — die Route muss es maskieren. */
export const FIXTURE_GEHEIMNIS = 'ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123'

/** Geheimnis als eigenes args-Element hinter '--api-key' (QA 1) und als URL-Parameter — die Route muss beide maskieren. */
export const FIXTURE_ARG_GEHEIMNIS = 'argwert-geheim-123456'
export const FIXTURE_URL_GEHEIMNIS = 'urlwert-geheim-654321'

/** Commit-Pin von voll@markt in installed_plugins.json. */
export const FIXTURE_COMMIT = '0123456789abcdef0123456789abcdef01234567'

/**
 * Legt den Fixture-Bestand an.
 * @param wurzel - leerer Wegwerf-Ordner
 * @returns { claudeOrdner, listeJson, pfade: { voll, nurSkill, kaputt } }
 */
export function legePluginFixtureAn(wurzel: string): { claudeOrdner: string; listeJson: string; pfade: { voll: string; nurSkill: string; kaputt: string } } {
  const claudeOrdner = join(wurzel, 'claude')
  const cache = join(claudeOrdner, 'plugins', 'cache', 'markt')
  const schreibe = (basis: string, rel: string, inhalt: string): void => {
    const ziel = join(basis, ...rel.split('/'))
    mkdirSync(join(ziel, '..'), { recursive: true })
    writeFileSync(ziel, inhalt)
  }
  const voll = join(cache, 'voll', '1.0.0')
  schreibe(voll, '.claude-plugin/plugin.json', JSON.stringify({ name: 'voll', version: '1.0.0', license: 'MIT', hooks: { PostToolUse: [{ matcher: 'Write', hooks: [{ type: 'command', command: 'node eingebettet.js' }] }] } }))
  schreibe(voll, 'LICENSE', 'MIT License\n')
  schreibe(voll, 'skills/s-eins/SKILL.md', '---\nname: s-eins\ndescription: Skill eins\nallowed-tools: Read, Bash(curl:*)\n---\n\nText\n')
  schreibe(voll, 'agents/a-eins.md', '---\nname: a-eins\ndescription: Agent eins\ntools:\n  - Read\n  - Grep\n---\n\nText\n')
  schreibe(voll, 'commands/c-eins.md', '---\nallowed-tools: Bash(gh pr comment:*), Bash(npm run check:*)\ndescription: Command eins\n---\n\nText\n')
  schreibe(voll, 'hooks/hooks.json', JSON.stringify({ hooks: { SessionStart: [{ matcher: 'startup', hooks: [{ type: 'command', command: `node start.js --token ${FIXTURE_GEHEIMNIS}` }] }] } }))
  schreibe(
    voll,
    '.mcp.json',
    JSON.stringify({
      mcpServers: {
        latest: { command: 'npx', args: ['-y', 'paket@latest'] },
        fest: { command: 'npx', args: ['-y', '@scope/paket@1.2.3'] },
        fern: { type: 'http', url: `https://mcp.example.invalid/mcp?access_token=${FIXTURE_URL_GEHEIMNIS}`, headers: { Authorization: 'Bearer geheim-im-header' } },
        lokal: { command: 'node', args: ['${CLAUDE_PLUGIN_ROOT}/server.js', '--api-key', FIXTURE_ARG_GEHEIMNIS], env: { SECRET: 'geheim-in-env' } },
      },
    }),
  )
  schreibe(voll, '.lsp.json', JSON.stringify({ ts: { command: 'typescript-language-server', args: ['--stdio'] } }))
  schreibe(voll, '.in_use/123', 'marke\n')
  schreibe(voll, '.git/HEAD', 'ref: refs/heads/main\n')

  const nurSkill = join(cache, 'nur-skill', '0.1.0')
  schreibe(nurSkill, '.claude-plugin/plugin.json', JSON.stringify({ name: 'nur-skill', version: '0.1.0' }))
  schreibe(nurSkill, 'skills/nur/SKILL.md', '---\nname: nur\ndescription: Nur ein Skill\n---\n\nText\n')

  const kaputt = join(cache, 'kaputt', '0.0.1')
  schreibe(kaputt, '.claude-plugin/plugin.json', '{kein json')
  schreibe(kaputt, 'hooks/hooks.json', JSON.stringify({ hooks: 'falsch' }))

  schreibe(claudeOrdner, 'plugins/installed_plugins.json', JSON.stringify({ version: 2, plugins: { 'voll@markt': [{ scope: 'user', installPath: voll, version: '1.0.0', gitCommitSha: FIXTURE_COMMIT }] } }))
  const listeJson = JSON.stringify([
    { id: 'voll@markt', version: '1.0.0', scope: 'user', enabled: true, installPath: voll },
    { id: 'nur-skill@markt', version: '0.1.0', scope: 'local', enabled: false, installPath: nurSkill, projectPath: join(wurzel, 'projekt'), projectEnabled: false },
    { id: 'kaputt@markt', version: '0.0.1', scope: 'user', enabled: true, installPath: kaputt },
    { id: 'cc-plugin-fixture@builtin', version: null, scope: 'builtin', enabled: true, installPath: 'builtin' },
  ])
  return { claudeOrdner, listeJson, pfade: { voll, nurSkill, kaputt } }
}
