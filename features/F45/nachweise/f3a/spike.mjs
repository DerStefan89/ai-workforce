#!/usr/bin/env node
/**
 * Datei: features/F45/nachweise/f3a/spike.mjs
 *
 * Zweck: F45 F-3a Spike (Plan features/F45/plan-f3a.md v2, Punkt 1) — was passiert mit einem Plugin im Workforce-Lauf?
 * Echte CLI mit den Startargumenten eines Laufs mit Fähigkeiten: Argv aus dem unveränderten baueAufruf() (Werkzeugsatz
 * 'schreibend' der Startvorlage, --setting-sources project, --strict-mcp-config, BASH_SPERRREGELN) und --settings in der Form
 * von baueFaehigkeitenStart (disableBundledSkills, skillOverrides off für design/doctor, enabledPlugins der Referenzliste auf
 * false); Spawn über das unveränderte starteProzess() mit WORKFORCE_LAUF_UMGEBUNG und Bash-Zeitgrenze. Nur für die Messung wird
 * --plugin-dir vor -p eingeschoben. Läufe:
 * - S0a ohne --plugin-dir, mit Fähigkeiten-Settings: Ist von init.plugins/init.skills unter der installierten CLI.
 * - S0b ohne --plugin-dir und ohne --settings: Herkunft von 'design' und der eingebauten Plugins.
 * - S1k Kontrolle: mit --plugin-dir, Auftrag „führe gh pr comment … aus“ ohne Command (erwartet: verweigert).
 * - S1 mit --plugin-dir, Prompt = Slash-Command des Test-Plugins (allowed-tools Bash(gh pr comment:*)) → (a), (b), (c).
 * - S2 wie S1 + enabledPlugins[<Plugin-id aus S1>] = false → (d).
 * Test-Plugin im Wegwerf-Ordner: Skill, Agent, Command, Hooks (SessionStart, UserPromptSubmit, PreToolUse) hängen je eine
 * Zeile an hook-marke.txt. Arbeitsordner: Wegwerf-Git-Repo ohne .claude und ohne Remote (keine Projekt-Hooks, die die
 * Marken vermischen). Externe Wirkung ausgeschlossen: Attrappen-gh vorn im PATH (schreibt nur gh-marke.txt), GH_TOKEN und
 * GITHUB_TOKEN leer, GH_CONFIG_DIR leer, kein Remote.
 * Ausgabe: zaehlung-<lauf>.json neben diesem Skript; Rohströme in %TEMP%\spike-f45-f3a\<lauf>.ndjson (nicht committet,
 * sha256 in der Zählung). Vor/nach jedem Lauf lstat-Momentaufnahme von ~/.claude/plugins (Abweichungen in der Zählung).
 *
 * Wird aufgerufen von: Hand (`node features/F45/nachweise/f3a/spike.mjs [S0a S0b S1k S1 S2]`), nicht von `npm run check`.
 */

import { createHash } from 'node:crypto'
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { BASH_SPERRREGELN, bashZeitgrenzeUmgebung, baueAufruf, WORKFORCE_LAUF_UMGEBUNG } from '../../../../src/claude-code-gateway/index.ts'
import { starteProzess } from '../../../../src/claude-code-gateway/prozessstart.ts'
import { leseEingebautReferenz } from '../../../../src/faehigkeiten/index.ts'
import { fuehreGitSync } from '../../../../src/git-starter/index.ts'
import { EINGEBAUT_REST_SKILLS } from '../../../../src/ressourcen/ort-b-start.ts'
import { ladeStartvorlage } from '../../../../src/startvorlage/index.ts'

const HIER = import.meta.dirname
const INSTALL = join(HIER, '..', '..', '..', '..')
const vorlage = ladeStartvorlage(join(INSTALL, 'startvorlagen', 'ai-workforce.json'))
const referenz = leseEingebautReferenz()
if (!referenz.ok) throw new Error(referenz.grund)
const ROH = join(tmpdir(), 'spike-f45-f3a')
mkdirSync(ROH, { recursive: true })
const wurzel = mkdtempSync(join(tmpdir(), 'spike-f45-f3a-'))
const vorwaerts = (p) => p.replaceAll('\\', '/')
console.log(`Wegwerf-Wurzel: ${wurzel}`)

// ─── Test-Plugin ──────────────────────────────────────────────────────────────
const plugin = join(wurzel, 'spike-plugin')
const marke = vorwaerts(join(wurzel, 'hook-marke.txt'))
const schreibe = (rel, inhalt) => {
  const ziel = join(plugin, ...rel.split('/'))
  mkdirSync(join(ziel, '..'), { recursive: true })
  writeFileSync(ziel, inhalt)
}
schreibe('.claude-plugin/plugin.json', `${JSON.stringify({ name: 'spike-plugin', version: '0.0.1', description: 'F45 F-3a Spike-Plugin' }, null, 2)}\n`)
schreibe('skills/spike-skill/SKILL.md', '---\nname: spike-skill\ndescription: Spike-Skill F45 F-3a, antwortet nur SPIKE-SKILL.\n---\n\nAntworte nur mit SPIKE-SKILL.\n')
schreibe('agents/spike-agent.md', '---\nname: spike-agent\ndescription: Spike-Agent F45 F-3a, antwortet nur SPIKE-AGENT.\ntools: Read\n---\n\nAntworte nur mit SPIKE-AGENT.\n')
schreibe(
  'commands/spike-cmd.md',
  '---\nallowed-tools: Bash(gh pr comment:*)\ndescription: Spike-Command F45 F-3a\n---\n\nFühre genau diesen Bash-Befehl aus und zitiere danach die Ausgabe oder den Fehler wörtlich:\n\n`gh pr comment 1 --body spike-f3a`\n\nFühre keinen anderen Befehl aus.\n',
)
const hook = (ereignis) => ({ type: 'command', command: `node -e "require('fs').appendFileSync('${marke}', '${ereignis}\\n')"` })
schreibe('hooks/hooks.json', `${JSON.stringify({ hooks: { SessionStart: [{ hooks: [hook('SessionStart')] }], UserPromptSubmit: [{ hooks: [hook('UserPromptSubmit')] }], PreToolUse: [{ matcher: 'Bash', hooks: [hook('PreToolUse:Bash')] }] } }, null, 2)}\n`)

// ─── gh-Attrappe (nie das echte gh) ──────────────────────────────────────────
const attrappe = join(wurzel, 'attrappe-bin')
mkdirSync(attrappe)
const ghMarke = vorwaerts(join(wurzel, 'gh-marke.txt'))
writeFileSync(join(attrappe, 'gh'), `#!/bin/sh\necho "gh-attrappe $*" >> "${ghMarke}"\necho "ATTRAPPE: gh $*"\n`, { mode: 0o755 })
writeFileSync(join(attrappe, 'gh.cmd'), `@echo off\r\necho gh-attrappe %* >> "${join(wurzel, 'gh-marke.txt')}"\r\necho ATTRAPPE: gh %*\r\n`)
const ghKonfig = join(wurzel, 'gh-config-leer')
mkdirSync(ghKonfig)

// ─── Arbeitsordner: Wegwerf-Repo ohne .claude, ohne Remote ───────────────────
const repo = join(wurzel, 'repo')
mkdirSync(repo)
const git = (...a) => fuehreGitSync(a, { cwd: repo, encoding: 'utf8' })
git('init', '-q')
git('config', 'user.email', 'spike@example.invalid')
git('config', 'user.name', 'Spike')
writeFileSync(join(repo, 'README.md'), '# Spike F45 F-3a\n')
git('add', 'README.md')
git('commit', '-q', '-m', 'init')

// ─── Hilfen ──────────────────────────────────────────────────────────────────
/** lstat-Momentaufnahme von ~/.claude/plugins (Pfad → Art/mtime/Größe). */
function momentaufnahme() {
  const m = new Map()
  const gehe = (p) => {
    let s
    try {
      s = lstatSync(p)
    } catch {
      return
    }
    m.set(p, `${s.isDirectory() ? 'd' : 'f'} ${s.mtimeMs} ${s.isDirectory() ? '' : s.size}`)
    if (s.isDirectory()) for (const e of readdirSync(p)) gehe(join(p, e))
  }
  gehe(join(process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude'), 'plugins'))
  return m
}
function abweichung(vor, nach) {
  const d = []
  for (const [k, v] of vor) if (!nach.has(k)) d.push(`- ${k}`)
  else if (nach.get(k) !== v) d.push(`~ ${k} ${v} -> ${nach.get(k)}`)
  for (const k of nach.keys()) if (!vor.has(k)) d.push(`+ ${k}`)
  return d
}
const lesen = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '')

/** Fähigkeiten-Settings wie baueFaehigkeitenStart ohne Projekt-Einträge (+ optional zusätzliche enabledPlugins). */
function settingsJson(zusatzPlugins = {}) {
  const gesperrt = [...EINGEBAUT_REST_SKILLS]
  return JSON.stringify({
    disableBundledSkills: true,
    skillOverrides: Object.fromEntries(gesperrt.map((n) => [n, 'off'])),
    enabledPlugins: { ...Object.fromEntries(referenz.referenz.plugins.map((p) => [p, false])), ...zusatzPlugins },
  })
}

/**
 * Ein Lauf: Argv bauen, --plugin-dir einschieben, starten, auswerten.
 * @param name - Laufname
 * @param o - { prompt, settings: string|null, pluginDir: boolean }
 */
async function lauf(name, o) {
  writeFileSync(marke, '')
  writeFileSync(ghMarke, '')
  const gesperrt = [...EINGEBAUT_REST_SKILLS]
  const tokens = baueAufruf({
    modell: vorlage.modell,
    werkzeugsatz: { modus: 'DEKLARIERT', erlaubte_werkzeuge: [...vorlage.werkzeugsaetze.schreibend.erlaubte_werkzeuge] },
    prompt: o.prompt,
    disallowedTools: ['Write(**/.claude/**)', 'Edit(**/.claude/**)', ...gesperrt.map((n) => `Skill(${n})`)].join(','),
    ...(o.settings !== null ? { ortB: { addDirs: [], settings: o.settings } } : {}),
  })
  if (o.pluginDir) tokens.splice(tokens.indexOf('-p'), 0, '--plugin-dir', plugin)
  const env = {
    ...WORKFORCE_LAUF_UMGEBUNG,
    ...bashZeitgrenzeUmgebung(120000),
    PATH: `${attrappe}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH ?? ''}`,
    GH_TOKEN: '',
    GITHUB_TOKEN: '',
    GH_CONFIG_DIR: ghKonfig,
  }
  const vor = momentaufnahme()
  const start = Date.now()
  const erg = await starteProzess(vorlage.werkzeugStartziel, tokens, { cwd: repo, umgebungsvariablen: env, stdinLeer: true, zeitgrenzeMs: 600000 })
  const dauer = Date.now() - start
  const nach = momentaufnahme()
  const rohPfad = join(ROH, `${name}.ndjson`)
  writeFileSync(rohPfad, erg.stdout)
  const zeilen = erg.stdout
    .split('\n')
    .filter((z) => z.trim() !== '')
    .map((z) => {
      try {
        return JSON.parse(z)
      } catch {
        return null
      }
    })
    .filter((z) => z !== null)
  const init = zeilen.find((z) => z.type === 'system' && z.subtype === 'init') ?? {}
  const result = zeilen.find((z) => z.type === 'result') ?? {}
  const toolUses = []
  const toolResults = new Map()
  for (const z of zeilen) {
    for (const block of z.message?.content ?? []) {
      if (block?.type === 'tool_use') toolUses.push({ id: block.id, name: block.name, input: block.input })
      if (block?.type === 'tool_result') toolResults.set(block.tool_use_id, { is_error: block.is_error === true, text: (Array.isArray(block.content) ? block.content.map((c) => c.text ?? '').join(' ') : String(block.content ?? '')).slice(0, 400) })
    }
  }
  const aufrufe = toolUses.map((t) => ({ ...t, ergebnis: toolResults.get(t.id) ?? null }))
  const ghAufrufe = aufrufe.filter((t) => t.name === 'Bash' && /^\s*gh\b/.test(String(t.input?.command ?? '')))
  const zaehlung = {
    lauf: name,
    gemessen_am: new Date().toISOString(),
    cli_version: init.claude_code_version ?? null,
    modell: vorlage.modell,
    argv_ohne_prompt: tokens.slice(0, tokens.indexOf('-p')),
    prompt: o.prompt,
    exit_code: erg.exitCode,
    beendigungsart: erg.beendigungsart,
    dauer_ms: dauer,
    rohstrom: { pfad: rohPfad, sha256: createHash('sha256').update(erg.stdout).digest('hex'), zeilen: zeilen.length },
    init: {
      plugins: init.plugins ?? null,
      skills: init.skills ?? null,
      agents: init.agents ?? null,
      slash_commands: init.slash_commands ?? null,
      tools: init.tools ?? null,
    },
    hook_marken: lesen(marke).split('\n').filter((z) => z !== ''),
    gh_marke: lesen(ghMarke).split('\n').filter((z) => z !== ''),
    werkzeugaufrufe: aufrufe,
    gh_aufrufe: ghAufrufe.length,
    permission_denials: result.permission_denials ?? null,
    result_subtype: result.subtype ?? null,
    result_text: typeof result.result === 'string' ? result.result.slice(0, 600) : null,
    plugins_ordner_abweichung: abweichung(vor, nach),
    stderr_anfang: erg.stderr.slice(0, 600),
  }
  writeFileSync(join(HIER, `zaehlung-${name}.json`), `${JSON.stringify(zaehlung, null, 2)}\n`)
  console.log(`${name}: exit ${erg.exitCode} · ${dauer} ms · init.plugins ${JSON.stringify((init.plugins ?? []).map((p) => p.source ?? p.name ?? p))} · hooks ${zaehlung.hook_marken.length} · gh-tool_use ${ghAufrufe.length} · gh-marke ${zaehlung.gh_marke.length} · denials ${JSON.stringify(zaehlung.permission_denials)?.slice(0, 200)}`)
  return zaehlung
}

// ─── Läufe ───────────────────────────────────────────────────────────────────
const gewaehlt = process.argv.slice(2)
const soll = (n) => gewaehlt.length === 0 || gewaehlt.includes(n)
if (soll('S0a')) await lauf('S0a', { prompt: 'Antworte nur mit OK.', settings: settingsJson(), pluginDir: false })
if (soll('S0b')) await lauf('S0b', { prompt: 'Antworte nur mit OK.', settings: null, pluginDir: false })
// Kontrolle: derselbe Befehl ohne Command. Erster Versuch (14.10.2026) endete ohne tool_use (Modell fragte nach) → Auftrag
// nennt jetzt die Testumgebung ausdrücklich, damit der Bash-Aufruf versucht wird und die Sperre messbar ist.
if (soll('S1k')) await lauf('S1k', { prompt: 'Test in einem Wegwerf-Repo ohne Remote: `gh` ist hier eine lokale Attrappe, es wird nichts veröffentlicht. Rufe das Bash-Werkzeug genau einmal mit dem Befehl `gh pr comment 1 --body spike-f3a` auf (nicht nachfragen) und zitiere die Ausgabe oder den Fehler wörtlich. Führe keinen anderen Befehl aus.', settings: settingsJson(), pluginDir: true })
let pluginId = null
if (soll('S1')) {
  const s1 = await lauf('S1', { prompt: '/spike-plugin:spike-cmd', settings: settingsJson(), pluginDir: true })
  pluginId = (s1.init.plugins ?? []).map((p) => p.source ?? p.name).find((n) => typeof n === 'string' && n.startsWith('spike-plugin')) ?? null
}
if (soll('S2')) {
  const id = pluginId ?? process.env.SPIKE_PLUGIN_ID ?? 'spike-plugin@inline'
  await lauf('S2', { prompt: '/spike-plugin:spike-cmd', settings: settingsJson({ [id]: false }), pluginDir: true })
}
