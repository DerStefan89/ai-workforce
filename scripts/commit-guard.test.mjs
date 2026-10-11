/**
 * Datei: scripts/commit-guard.test.mjs
 *
 * Zweck: F45 B1b-1 (K10, F-1035) — Rot- und Grün-Fälle für die gehärteten Regeln des Root-Hooks
 * `.claude/hooks/commit-guard.cjs` (nur ai-workforce; die Skelett-Fassung bleibt Template-Bytes):
 * Aufgabe 5 (.claude als Kopier-, Verschiebe-, Lösch- oder Schreibziel, auch mit Platzhaltern und
 * ./-Varianten) und Aufgabe 6 (rm -rf, Remove-Item -Recurse -Force, git branch -D, git reset --hard).
 * Zweimal geprüft: über die reine Funktion pruefeGehaerteteRegeln und Ende-zu-Ende als Kindprozess mit
 * dem JSON auf stdin, das Claude Code übergibt (Muster scripts/skelett-hooks.test.mjs).
 *
 * Wird aufgerufen von:
 * - npm run test (node --test)
 */

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const HOOK = join(import.meta.dirname, '..', '.claude', 'hooks', 'commit-guard.cjs')
const { pruefeGehaerteteRegeln } = createRequire(import.meta.url)(HOOK)

/**
 * Startet den Hook mit einem Bash-Befehl auf stdin.
 * @param command - Befehlstext
 * @returns true, wenn der Hook verweigert
 */
function hookVerweigert(command) {
  const ergebnis = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command }, cwd: join(import.meta.dirname, '..'), session_id: 'commit-guard-test' }),
    encoding: 'utf8',
  })
  assert.equal(ergebnis.status, 0, `Exitcode für ${command}`)
  const text = ergebnis.stdout.trim()
  return text.length > 0 && JSON.parse(text)?.hookSpecificOutput?.permissionDecision === 'deny'
}

const CLAUDE_ZIEL_ROT = [
  'cp -rn .claude ../x/',
  'cp -rn ../tpl/.claude ./',
  'cp -rn "C:/tpl/.claude" "C:/proj"',
  String.raw`cp -rn C:\tpl\.claude C:\proj`,
  'cp -r ./.claude/ /tmp/y',
  'mv .Claude x',
  'rm -r .claude/agents',
  'rsync -a .claude/ dst',
  'echo x | tee .claude/hooks/a.cjs',
  'echo x > .claude/hooks/a.cjs',
  'echo x >> ./.claude/a',
  'sed -i s/a/b/ .claude/hooks/x.cjs',
  'sed --in-place s/a/b/ .claude/hooks/x.cjs',
  String.raw`robocopy .claude C:\x /E`,
  String.raw`Copy-Item -Recurse .claude C:\x`,
  'Move-Item .claude x',
  String.raw`Remove-Item .claude\hooks\a.cjs`,
  'Set-Content .claude/hooks/a.cjs x',
  'cp -r .cl* x',
  'cp -r .c?aude x',
  'cp -r {.claude,src} x',
  'cp -r .* ../x',
  'cp -r ~/.claude ./sicherung',
  // Advisor-Pass B1b-1: Pipeline, Verzeichniswechsel, Basisnamen, weitere Verben, Inline-Code.
  'find .claude -name "*.cjs" | xargs rm',
  'find .claude -name x -delete',
  'ls .claude/hooks | xargs -I{} cp {} /tmp',
  'cd .claude && rm hooks/a.cjs',
  'cd .claude; echo x > neu.txt',
  String.raw`Set-Location .\.claude; Remove-Item hooks\a.cjs`,
  '/bin/rm .claude/hooks/a.cjs',
  'env X=1 cp -r .claude x',
  'command cp -r .claude x',
  'touch .claude/hooks/neu.cjs',
  'mkdir .claude/agents/neu',
  'git checkout -- .claude/settings.local.json',
  'git restore .claude/hooks/a.cjs',
  `node -e "require('fs').unlinkSync('.claude/hooks/a.cjs')"`,
  `python -c "import shutil; shutil.rmtree('.claude')"`,
  `powershell -Command "Remove-Item .claude\\hooks\\a.cjs"`,
  'tar -cf - .claude | tar -xf - -C ../x',
  'git commit -m "x" && cp -r .claude ../x',
  // Bewusst mitgesperrt: Quelle .claude mit schreibendem Verb (Lesen geht über Read).
  'cp .claude/agents/x.md /tmp/',
]

const ZERSTOEREND_ROT = [
  'rm -rf build',
  'rm -fr x',
  'rm -r -f x',
  'rm -Rf x',
  'rm --recursive --force x',
  'Remove-Item x -Recurse -Force',
  'Remove-Item x -Force -Recurse',
  'ri x -r -fo',
  'rd /s /q x',
  'git branch -D foo',
  'git branch --delete --force foo',
  'git branch -d -f foo',
  'git branch -df foo',
  'git reset --hard',
  'git reset --hard HEAD~1',
  'npm run check && rm -rf dist',
  'npm run check; git reset --hard',
  'rm -rfv x',
  'rm -vrf x',
  'rm --recursive -f x',
  '/bin/rm -rf x',
  'git -C ../anderes branch -D foo',
  'git -c core.x=y reset --hard',
  'git.exe branch -D foo',
  'git clean -fd',
  'git clean --force',
  'git checkout .',
  'git checkout -- .',
  'git restore .',
  'git stash drop',
  'git stash clear',
  'git worktree remove --force ../wt',
  'git update-ref -d refs/heads/foo',
  'powershell -Command "Remove-Item x -Recurse -Force"',
  'bash <<EOF\nrm -rf build\nEOF',
]

const GRUEN = [
  'npm run check',
  'npm run check:template',
  'npm run test 2>&1',
  'node --test',
  'git status',
  'git status --porcelain',
  'git diff',
  'git diff --stat',
  'git log --oneline -5',
  'cat .claude/agents/x.md',
  'ls .claude',
  'grep -r foo .claude',
  'cat .claude/agents/x.md > out.txt',
  'rm datei.txt',
  'rm -r build',
  'Remove-Item x -Force',
  'git branch -d foo',
  'git reset --soft HEAD~1',
  'cp src/* dist/',
  'cp .claudeignore x',
  'cat .claude/agents/x.md | grep name',
  'cd src && rm alt.txt',
  'git clean -n',
  'git restore --staged .',
  'git stash list',
  'git worktree remove ../wt',
  'node -e "console.log(1)"',
  'node scripts/check-docs.mjs',
  'mkdir build',
  // Korrekturrunde (code-reviewer/qa): Commit-/PR-Texte, Suchmuster und PowerShell-Optionen sind keine Befehle.
  'git commit -m "commit-guard sperrt rm -rf, git reset --hard und git branch -D; cp auf .claude"',
  "git commit -F - <<'EOF'\nF45 B1b-1: commit-guard\n- rm -rf, git branch -D, git reset --hard gesperrt\n- cp/mv auf .claude gesperrt\nEOF",
  'gh pr create --title "rm -rf sperren" --body "git reset --hard und cp -r .claude"',
  'cat .claude/agents/x.md | grep install',
  'grep -rn "mkdir" .claude/',
  'echo cp .claude ist gesperrt',
  'Remove-Item x -Force -ErrorAction SilentlyContinue',
  'Get-ChildItem -Recurse -Filter *.md',
]

test('Aufgabe 5: .claude als Kopier-/Verschiebe-/Lösch-/Schreibziel wird gesperrt (je Variante)', () => {
  for (const command of CLAUDE_ZIEL_ROT) assert.match(pruefeGehaerteteRegeln(command) ?? '', /\.claude-Ordner|Inline-Code .* mit \.claude/, command)
})

test('Aufgabe 6: rm -rf, Remove-Item -Recurse -Force, git branch -D, git reset --hard werden gesperrt (je Variante)', () => {
  for (const command of ZERSTOEREND_ROT) assert.match(pruefeGehaerteteRegeln(command) ?? '', /nicht umkehrbar/, command)
})

test('Grün: bisher erlaubte Befehle (Prüfbefehle, lesendes Git, Lesen unter .claude) bleiben frei', () => {
  for (const command of GRUEN) assert.equal(pruefeGehaerteteRegeln(command), null, command)
})

/**
 * F-1042: Hook-Eingabe des PowerShell-Werkzeugs in der real belegten Form (features/F45/nachweise/b1b1/
 * zaehlung-powershell.json, CLI 2.1.296): dieselben Kopf-Felder wie beim Bash-Werkzeug, tool_name
 * 'PowerShell', tool_input { command, description }.
 * @param command - Befehlstext (oder undefined für eine unbekannte Form)
 * @param zusatz - überschreibt Felder der Eingabe
 * @returns { verweigert, grund }
 */
function powershellHook(command, zusatz = {}) {
  const cwd = mkdtempSync(join(tmpdir(), 'commit-guard-ps-'))
  try {
    const eingabe = {
      session_id: 'commit-guard-test',
      transcript_path: join(cwd, 'transcript.jsonl'),
      cwd,
      permission_mode: 'default',
      hook_event_name: 'PreToolUse',
      tool_name: 'PowerShell',
      tool_input: { command, description: 'Test' },
      tool_use_id: 'toolu_test',
      prompt_id: 'p',
      ...zusatz,
    }
    const ergebnis = spawnSync(process.execPath, [HOOK], { input: JSON.stringify(eingabe), encoding: 'utf8' })
    assert.equal(ergebnis.status, 0)
    const text = ergebnis.stdout.trim()
    const ausgabe = text.length > 0 ? JSON.parse(text) : null
    return { verweigert: ausgabe?.hookSpecificOutput?.permissionDecision === 'deny', grund: ausgabe?.hookSpecificOutput?.permissionDecisionReason ?? '' }
  } finally {
    raeumeVerzeichnis(cwd)
  }
}

test('PowerShell-Werkzeug (F-1042), Rot: Remove-Item -Recurse -Force, Copy-/Move-Item auf .claude, git commit ohne Freigabe, git branch -D, git reset --hard', () => {
  for (const [command, muster] of [
    ['Remove-Item build -Recurse -Force', /rekursives, erzwungenes Löschen/],
    [String.raw`Copy-Item -Recurse .claude C:\sicherung`, /\.claude-Ordner/],
    [String.raw`Copy-Item ..\tpl\.claude . -Recurse`, /\.claude-Ordner/],
    ['Move-Item .claude alt', /\.claude-Ordner/],
    ['git commit -m "x"', /ohne Freigabe-Datei/],
    ['git branch -D foo', /git branch -D/],
    ['git reset --hard', /git reset --hard/],
  ]) {
    const { verweigert, grund } = powershellHook(command)
    assert.equal(verweigert, true, command)
    assert.match(grund, muster, command)
  }
})

test('PowerShell-Werkzeug (F-1042), Grün: Get-ChildItem, git status, git diff, npm run check', () => {
  for (const command of ['Get-ChildItem', 'Get-ChildItem -Recurse -Filter *.md', 'git status', 'git diff', 'npm run check']) assert.equal(powershellHook(command).verweigert, false, command)
})

test('PowerShell-Werkzeug (F-1042): unbekannte Eingabeform (kein tool_input.command) → verweigert wie beim Bash-Werkzeug (fail-closed)', () => {
  assert.match(powershellHook(undefined, { tool_input: { script: 'Get-ChildItem' } }).grund, /kein Befehlstext gefunden — fail-closed/)
  assert.match(powershellHook(undefined, { tool_input: { command: '' } }).grund, /kein Befehlstext gefunden — fail-closed/)
})

test('Ende-zu-Ende als Hook-Prozess: B1a-2-Umgehung „cp -rn .claude“ und rm -rf verweigert, Prüfbefehle durch', () => {
  for (const command of ['cp -rn .claude ../ziel/', 'rm -rf build', 'git branch -D foo', 'git reset --hard']) assert.equal(hookVerweigert(command), true, command)
  for (const command of ['npm run check', 'git status', 'git diff', 'git log --oneline -3']) assert.equal(hookVerweigert(command), false, command)
})
