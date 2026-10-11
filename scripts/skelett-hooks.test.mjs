/**
 * Datei: scripts/skelett-hooks.test.mjs
 *
 * Zweck: F45 B1a-2 — Beleg je Hook des Projekt-Skeletts (vorlagen/projekt-skelett/.claude/hooks/,
 * Template-Fassung): Im Workforce-Lauf (`claude -p`) blockiert keiner einen Schritt, den die Workforce
 * braucht (Prüfbefehle, lesendes Git, Schreiben von Projektdateien), und die Bremsen greifen weiter
 * (commit ohne Freigabe, Schreiben auf die settings.json). Jeder Hook läuft als Kindprozess mit dem
 * JSON auf stdin, das Claude Code übergibt, in einem Wegwerfordner ohne package.json (CommonJS wie im
 * Template).
 *
 * Wird aufgerufen von:
 * - npm run test (node --test)
 */

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { fuehreGitSync } from '../src/git-starter/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const HOOKS_QUELLE = join(import.meta.dirname, '..', 'vorlagen', 'projekt-skelett', '.claude', 'hooks')
const ordner = mkdtempSync(join(tmpdir(), 'skelett-hooks-'))
cpSync(HOOKS_QUELLE, join(ordner, 'hooks'), { recursive: true })
// Git-Repo ohne Zwischenstand-Datei: die Hooks erreichen ihre eigentliche Prüfung statt des Fehlerzweigs.
fuehreGitSync(['init', '-q'], { cwd: ordner, encoding: 'utf8' })
fuehreGitSync(['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '--allow-empty', '-q', '-m', 'start'], { cwd: ordner, encoding: 'utf8' })
after(() => raeumeVerzeichnis(ordner))

/**
 * Startet einen Skelett-Hook mit eingabe als JSON auf stdin.
 * @param name - Dateiname unter .claude/hooks/
 * @param eingabe - Hook-Eingabe (wird um cwd ergänzt)
 * @returns { status, ausgabe } — ausgabe ist das geparste stdout-JSON oder null
 */
function starteHook(name, eingabe) {
  const ergebnis = spawnSync(process.execPath, [join(ordner, 'hooks', name)], {
    cwd: ordner,
    input: JSON.stringify({ cwd: ordner, session_id: 'skelett-hooks-test', ...eingabe }),
    encoding: 'utf8',
  })
  const text = ergebnis.stdout.trim()
  return { status: ergebnis.status, ausgabe: text.length > 0 ? JSON.parse(text) : null }
}

const istDeny = (ausgabe) => ausgabe?.hookSpecificOutput?.permissionDecision === 'deny'

test('commit-guard: Prüfbefehle und lesendes Git eines Workforce-Laufs gehen durch', () => {
  for (const command of ['npm run check', 'npm run check:template', 'node --test', 'git status --porcelain', 'git diff --stat', 'git log --oneline -5']) {
    const { status, ausgabe } = starteHook('commit-guard.js', { tool_name: 'Bash', tool_input: { command } })
    assert.equal(status, 0, command)
    assert.equal(istDeny(ausgabe), false, command)
  }
})

test('commit-guard: Bremsen greifen weiter (commit/push ohne Freigabe, settings.json im Befehl)', () => {
  for (const command of ['git commit -m x', 'git push', 'cat .claude/settings.json']) {
    const { ausgabe } = starteHook('commit-guard.js', { tool_name: 'Bash', tool_input: { command } })
    assert.equal(istDeny(ausgabe), true, command)
  }
})

test('guard-settings: Schreiben von Projektdateien geht durch, settings.json bleibt gesperrt', () => {
  assert.equal(istDeny(starteHook('guard-settings.js', { tool_name: 'Write', tool_input: { file_path: join(ordner, 'src', 'x.ts') } }).ausgabe), false)
  assert.equal(istDeny(starteHook('guard-settings.js', { tool_name: 'Edit', tool_input: { file_path: join(ordner, '.claude', 'settings.json') } }).ausgabe), true)
})

test('session-reminder: blockiert nie (nur Hinweis alle 30 Prompts)', () => {
  const { status, ausgabe } = starteHook('session-reminder.js', { prompt: 'x' })
  assert.equal(status, 0)
  assert.equal(ausgabe?.decision, undefined)
})

test('zwischenstand-laden: ohne Zwischenstand-Datei still Exit 0', () => {
  const { status, ausgabe } = starteHook('zwischenstand-laden.js', { hook_event_name: 'SessionStart', source: 'startup' })
  assert.equal(status, 0)
  assert.equal(ausgabe, null)
})

test('zwischenstand-pruefen: automatische Compaction nur Hinweis, manuelle wird gebremst', () => {
  const auto = starteHook('zwischenstand-pruefen.js', { hook_event_name: 'PreCompact', trigger: 'auto' })
  assert.equal(auto.status, 0)
  assert.notEqual(auto.ausgabe?.decision, 'block')
  assert.match(auto.ausgabe?.systemMessage ?? '', /Zwischenstand veraltet oder fehlt/)
  assert.equal(starteHook('zwischenstand-pruefen.js', { hook_event_name: 'PreCompact', trigger: 'manual' }).ausgabe?.decision, 'block')
})
