#!/usr/bin/env node
/**
 * Datei: features/F45/nachweise/f3b2/spike.mjs
 *
 * Zweck: F45 F-3b-2 Spike (Plan features/F45/plan-f3b.md „Plan — F-3b-2“ Punkt 1 und „F-3b-2-Plan (15), ergänzt“) —
 * Plugins als Lauf-Kopie im Ausführungslauf. Echte CLI mit den Startargumenten eines Ausführungslaufs mit Fähigkeiten:
 * Argv aus dem unveränderten baueAufruf() (Werkzeugsatz 'schreibend' der Startvorlage, --setting-sources project,
 * --strict-mcp-config, Bash(git:*)), Sperren und --settings aus dem unveränderten baueFaehigkeitenStart() (ohne
 * Projekt-Einträge); nur für die Messung ergänzt: --plugin-dir je Lauf-Kopie vor -p, enabledPlugins[<name>@inline] = true,
 * Skill(<plugin>:<skill>)/Agent(<plugin>:<agent>) in erlaubte_werkzeuge, Agent(<eingebaut>) gesperrt (wie start.ts mit
 * aktiven Agents). Spawn über das unveränderte starteProzess() mit WORKFORCE_LAUF_UMGEBUNG und Bash-Zeitgrenze.
 * Lauf-Kopien (außerhalb des Arbeitsordners, Wegwerf-Wurzel unter %TEMP%):
 * - A `lauf-kopie-a` (Manifest-name `spike-f3b2`, Ordnername absichtlich anders): Skills `at-gh` (allowed-tools
 *   Bash(gh pr comment:*)), `git-text` (Text mit git merge/git push, ohne allowed-tools), `git-at` (allowed-tools
 *   Bash(git:*)); Agents `tools-todo` (tools: Read, Bash, TodoWrite), `tools-gh` (tools: Read, Bash(gh pr comment:*)).
 * - S `superpowers` (Manifest-name `superpowers`): nur skills/systematic-debugging aus Stefans gepinnter Kopie
 *   (~/.ai-workforce/plugin-kopien, nur gelesen) + Manifest + LICENSE.
 * - D `lauf-kopie-d` (Manifest-name `spike-f3b2-daten`): Skill `data-probe` mit ${CLAUDE_PLUGIN_DATA} im Text (S6-Auslöser).
 * Läufe: P0 git direkt (Kontrolle) · P1 Init (S4/S5/S6 ohne Auslöser) · P2k gh direkt (Kontrolle) · P2 Skill at-gh (S3)
 * · P3a Agent tools-todo (S3) · P3b Agent tools-gh (S3) · P4a Skill git-text · P4b Skill git-at · P6a data-probe (S6
 * Auslöser) · P6b data-probe mit CLAUDE_CODE_PLUGIN_CACHE_DIR (S6 Umlenkung).
 * Externe Wirkung ausgeschlossen: Attrappen-gh vorn im PATH, GH_TOKEN/GITHUB_TOKEN leer, GH_CONFIG_DIR leer, Repo ohne Remote.
 * Ausgabe: zaehlung-<lauf>.json neben diesem Skript (Pfade geschwärzt: <HOME>, <WURZEL>; keine Sitzungs-ids); Rohströme in
 * %TEMP%\spike-f45-f3b2\<lauf>.ndjson (nicht committet, sha256 in der Zählung). Vor/nach jedem Lauf lstat von
 * ~/.claude/plugins (+ umgelenkter Wurzel), vor/nach dem ganzen Spike Ordnernamen unter ~/.claude bis Tiefe 2.
 *
 * Wird aufgerufen von: Hand (`node features/F45/nachweise/f3b2/spike.mjs [P0 P1 …]`), nicht von `npm run check`.
 */

import { createHash } from 'node:crypto'
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { bashZeitgrenzeUmgebung, baueAufruf, WORKFORCE_LAUF_UMGEBUNG } from '../../../../src/claude-code-gateway/index.ts'
import { starteProzess } from '../../../../src/claude-code-gateway/prozessstart.ts'
import { leseEingebautReferenz } from '../../../../src/faehigkeiten/index.ts'
import { baueFaehigkeitenStart } from '../../../../src/faehigkeiten/start.ts'
import { fuehreGitSync } from '../../../../src/git-starter/index.ts'
import { ladeStartvorlage } from '../../../../src/startvorlage/index.ts'

const HIER = import.meta.dirname
const INSTALL = join(HIER, '..', '..', '..', '..')
const HOME = homedir()
const CLAUDE_DIR = join(HOME, '.claude')
const vorlage = ladeStartvorlage(join(INSTALL, 'startvorlagen', 'ai-workforce.json'))
const referenz = leseEingebautReferenz()
if (!referenz.ok) throw new Error(referenz.grund)
const ROH = join(tmpdir(), 'spike-f45-f3b2')
mkdirSync(ROH, { recursive: true })
const wurzel = mkdtempSync(join(tmpdir(), 'spike-f45-f3b2-'))
const vorwaerts = (p) => p.replaceAll('\\', '/')
console.log(`Wegwerf-Wurzel: ${wurzel}`)

/** Schwärzt Wegwerf-Wurzel und Home in einem beliebigen JSON-Wert (Strings rekursiv). */
function schwaerze(wert) {
  if (typeof wert === 'string') {
    let s = wert
    for (const [roh, ersatz] of [
      [wurzel, '<WURZEL>'],
      [HOME, '<HOME>'],
    ]) {
      for (const form of [roh, vorwaerts(roh), roh.replaceAll('\\', '\\\\')]) s = s.split(form).join(ersatz)
      s = s.split(form8(roh)).join(ersatz)
    }
    return s
  }
  if (Array.isArray(wert)) return wert.map(schwaerze)
  if (wert !== null && typeof wert === 'object') return Object.fromEntries(Object.entries(wert).map(([k, v]) => [k, schwaerze(v)]))
  return wert
}
/** Kurzname-Form (8.3) ist nicht bekannt — nur Groß-/Kleinschreibung des Laufwerks angleichen. */
function form8(p) {
  return p.length > 1 && p[1] === ':' ? p[0].toLowerCase() + p.slice(1) : p
}

// ─── Lauf-Kopien ─────────────────────────────────────────────────────────────
const kopien = join(wurzel, 'lauf-kopien')
const schreibe = (basis, rel, inhalt) => {
  const ziel = join(basis, ...rel.split('/'))
  mkdirSync(join(ziel, '..'), { recursive: true })
  writeFileSync(ziel, inhalt)
}
const manifest = (name) => `${JSON.stringify({ name, version: '0.0.1', description: `F45 F-3b-2 Spike ${name}` }, null, 2)}\n`

const A = join(kopien, 'lauf-kopie-a')
schreibe(A, '.claude-plugin/plugin.json', manifest('spike-f3b2'))
schreibe(
  A,
  'skills/at-gh/SKILL.md',
  '---\nname: at-gh\ndescription: Spike F45 F-3b-2 — führt einen gh-Befehl in der Testumgebung aus.\nallowed-tools: Bash(gh pr comment:*)\n---\n\nFühre genau diesen Bash-Befehl einmal aus und zitiere danach die Ausgabe oder den Fehler wörtlich:\n\n`gh pr comment 1 --body spike-f3b2-skill`\n\nFühre keinen anderen Befehl aus.\n',
)
schreibe(
  A,
  'skills/git-text/SKILL.md',
  '---\nname: git-text\ndescription: Spike F45 F-3b-2 — Abschluss eines Zweigs (Text nennt git merge und git push).\n---\n\nSchließe den Zweig ab. Führe nacheinander genau diese zwei Bash-Befehle aus (jeden einmal, auch wenn der erste scheitert) und zitiere jede Ausgabe oder jeden Fehler wörtlich:\n\n1. `git merge spike-zweig`\n2. `git push`\n\nFühre keinen anderen Befehl aus.\n',
)
schreibe(
  A,
  'skills/git-at/SKILL.md',
  '---\nname: git-at\ndescription: Spike F45 F-3b-2 — git-Befehl mit allowed-tools Bash(git:*).\nallowed-tools: Bash(git:*)\n---\n\nFühre genau diesen Bash-Befehl einmal aus und zitiere die Ausgabe oder den Fehler wörtlich:\n\n`git merge spike-zweig-zwei`\n\nFühre keinen anderen Befehl aus.\n',
)
schreibe(
  A,
  'agents/tools-todo.md',
  '---\nname: tools-todo\ndescription: Spike F45 F-3b-2 — Agent mit tools Read, Bash, TodoWrite.\ntools: Read, Bash, TodoWrite\n---\n\nTestumgebung (Wegwerf-Repo, gh ist eine lokale Attrappe). Tu genau drei Dinge, ohne nachzufragen:\n1. Nenne die exakten Namen aller Werkzeuge, die dir zur Verfügung stehen, als Liste.\n2. Rufe das Werkzeug TodoWrite einmal mit genau einem Eintrag „spike“ auf (falls vorhanden; sonst schreibe „TodoWrite fehlt“).\n3. Rufe das Bash-Werkzeug einmal mit `gh pr comment 1 --body spike-f3b2-agent-todo` auf und zitiere Ausgabe oder Fehler wörtlich.\n',
)
schreibe(
  A,
  'agents/tools-gh.md',
  '---\nname: tools-gh\ndescription: Spike F45 F-3b-2 — Agent mit tools Read, Bash(gh pr comment:*).\ntools: Read, Bash(gh pr comment:*)\n---\n\nTestumgebung (Wegwerf-Repo, gh ist eine lokale Attrappe). Tu genau zwei Dinge, ohne nachzufragen:\n1. Nenne die exakten Namen aller Werkzeuge, die dir zur Verfügung stehen, als Liste.\n2. Rufe das Bash-Werkzeug einmal mit `gh pr comment 1 --body spike-f3b2-agent-gh` auf und zitiere Ausgabe oder Fehler wörtlich.\n',
)

const S = join(kopien, 'superpowers')
const gepinnt = join(HOME, '.ai-workforce', 'plugin-kopien', 'superpowers@claude-plugins-official')
const gepinntHash = readdirSync(gepinnt)[0]
const gepinntOrdner = join(gepinnt, gepinntHash)
cpSync(join(gepinntOrdner, '.claude-plugin'), join(S, '.claude-plugin'), { recursive: true })
cpSync(join(gepinntOrdner, 'LICENSE'), join(S, 'LICENSE'))
cpSync(join(gepinntOrdner, 'skills', 'systematic-debugging'), join(S, 'skills', 'systematic-debugging'), { recursive: true })

const D = join(kopien, 'lauf-kopie-d')
schreibe(D, '.claude-plugin/plugin.json', manifest('spike-f3b2-daten'))
schreibe(D, 'skills/data-probe/SKILL.md', '---\nname: data-probe\ndescription: Spike F45 F-3b-2 — nennt den Datenordner des Plugins.\n---\n\nDer Datenordner dieses Plugins ist: ${CLAUDE_PLUGIN_DATA}\n\nAntworte nur mit diesem Pfad, wörtlich. Rufe kein Werkzeug auf.\n')

// ─── gh-Attrappe (nie das echte gh) ──────────────────────────────────────────
const attrappe = join(wurzel, 'attrappe-bin')
mkdirSync(attrappe)
const ghMarke = join(wurzel, 'gh-marke.txt')
writeFileSync(join(attrappe, 'gh'), `#!/bin/sh\necho "gh-attrappe $*" >> "${vorwaerts(ghMarke)}"\necho "ATTRAPPE: gh $*"\n`, { mode: 0o755 })
writeFileSync(join(attrappe, 'gh.cmd'), `@echo off\r\necho gh-attrappe %* >> "${ghMarke}"\r\necho ATTRAPPE: gh %*\r\n`)
const ghKonfig = join(wurzel, 'gh-config-leer')
mkdirSync(ghKonfig)

// ─── Arbeitsordner: Wegwerf-Repo ohne .claude, ohne Remote, zwei Merge-Zweige ─
const repo = join(wurzel, 'repo')
mkdirSync(repo)
const git = (...a) => String(fuehreGitSync(a, { cwd: repo, encoding: 'utf8' })).trim()
git('init', '-q', '-b', 'main')
git('config', 'user.email', 'spike@example.invalid')
git('config', 'user.name', 'Spike')
writeFileSync(join(repo, 'README.md'), '# Spike F45 F-3b-2\n')
git('add', 'README.md')
git('commit', '-q', '-m', 'init')
for (const zweig of ['spike-zweig', 'spike-zweig-zwei', 'spike-zweig-kontrolle']) {
  git('checkout', '-q', '-b', zweig)
  writeFileSync(join(repo, `${zweig}.txt`), `${zweig}\n`)
  git('add', `${zweig}.txt`)
  git('commit', '-q', '-m', zweig)
  git('checkout', '-q', 'main')
}

// ─── Hilfen ──────────────────────────────────────────────────────────────────
/** lstat-Momentaufnahme eines Baums (Pfad → Art/mtime/Größe). */
function momentaufnahme(basis) {
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
  gehe(basis)
  return m
}
function abweichung(vor, nach) {
  const d = []
  for (const [k, v] of vor) if (!nach.has(k)) d.push(`- ${k}`)
  else if (nach.get(k) !== v) d.push(`~ ${k}`)
  for (const k of nach.keys()) if (!vor.has(k)) d.push(`+ ${k}`)
  return d
}
/** Ordnernamen unter ~/.claude bis Tiefe 2. */
function ordnerClaude() {
  const s = new Set()
  for (const e of readdirSync(CLAUDE_DIR, { withFileTypes: true })) {
    s.add(e.name + (e.isDirectory() ? '/' : ''))
    if (e.isDirectory()) {
      try {
        for (const f of readdirSync(join(CLAUDE_DIR, e.name), { withFileTypes: true })) if (f.isDirectory()) s.add(`${e.name}/${f.name}/`)
      } catch {}
    }
  }
  return s
}
const lesen = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '')
const sha = (s) => createHash('sha256').update(s).digest('hex')

/** Start-Bausteine wie ein Ausführungslauf mit Fähigkeiten (unverändert) + Plugin-Zusätze nur für die Messung. */
function startBausteine(plugins, zusatzWerkzeuge) {
  const start = baueFaehigkeitenStart({ projekt: [], agentNamen: [], projektWurzel: repo, referenz: referenz.referenz, installation: { projektOrdner: repo, installWurzel: INSTALL } })
  if (!start.ok) throw new Error(start.grund)
  const settings = JSON.parse(start.start.settings)
  settings.enabledPlugins = { ...settings.enabledPlugins, ...Object.fromEntries(plugins.map((p) => [`${p.name}@inline`, true])) }
  const agentSperre = zusatzWerkzeuge.some((w) => w.startsWith('Agent(')) ? referenz.referenz.agents.map((n) => `Agent(${n})`) : []
  return { settings: JSON.stringify(settings), disallowed: [...start.start.disallowedTools, ...agentSperre].join(',') }
}

const PA = { name: 'spike-f3b2', ordner: A }
const PS = { name: 'superpowers', ordner: S }
const PD = { name: 'spike-f3b2-daten', ordner: D }
const SKILLS_A = ['Skill(spike-f3b2:at-gh)', 'Skill(spike-f3b2:git-text)', 'Skill(spike-f3b2:git-at)']
const AGENTS_A = ['Agent(spike-f3b2:tools-todo)', 'Agent(spike-f3b2:tools-gh)']
const SKILL_S = ['Skill(superpowers:systematic-debugging)']
const TESTUMGEBUNG = 'Test in einem Wegwerf-Repo ohne Remote; `gh` ist eine lokale Attrappe, es wird nichts veröffentlicht. Nicht nachfragen.'

/**
 * Ein Lauf: Argv bauen, --plugin-dir je Kopie einschieben, starten, auswerten.
 * @param name - Laufname
 * @param o - { prompt, plugins: [{name, ordner}], werkzeuge: string[], umgebung?: Record<string,string>, pluginWurzel?: string }
 */
async function lauf(name, o) {
  writeFileSync(ghMarke, '')
  const b = startBausteine(o.plugins, o.werkzeuge)
  const tokens = baueAufruf({
    modell: vorlage.modell,
    werkzeugsatz: { modus: 'DEKLARIERT', erlaubte_werkzeuge: [...vorlage.werkzeugsaetze.schreibend.erlaubte_werkzeuge, ...o.werkzeuge] },
    prompt: o.prompt,
    disallowedTools: b.disallowed,
    ortB: { addDirs: [], settings: b.settings },
  })
  for (const p of o.plugins) tokens.splice(tokens.indexOf('-p'), 0, '--plugin-dir', p.ordner)
  const env = {
    ...(o.umgebung ?? {}),
    ...WORKFORCE_LAUF_UMGEBUNG,
    ...bashZeitgrenzeUmgebung(120000),
    PATH: `${attrappe}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH ?? ''}`,
    GH_TOKEN: '',
    GITHUB_TOKEN: '',
    GH_CONFIG_DIR: ghKonfig,
  }
  const kopfVor = git('rev-parse', 'HEAD')
  const vor = momentaufnahme(join(CLAUDE_DIR, 'plugins'))
  const vorUmgelenkt = o.pluginWurzel !== undefined ? momentaufnahme(o.pluginWurzel) : null
  const start = Date.now()
  const erg = await starteProzess(vorlage.werkzeugStartziel, tokens, { cwd: repo, umgebungsvariablen: env, stdinLeer: true, zeitgrenzeMs: 600000 })
  const dauer = Date.now() - start
  const nach = momentaufnahme(join(CLAUDE_DIR, 'plugins'))
  const nachUmgelenkt = o.pluginWurzel !== undefined ? momentaufnahme(o.pluginWurzel) : null
  const kopfNach = git('rev-parse', 'HEAD')
  writeFileSync(join(ROH, `${name}.ndjson`), erg.stdout)
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
      if (block?.type === 'tool_use') toolUses.push({ id: block.id, name: block.name, input: block.input, im_subagent: z.parent_tool_use_id != null })
      if (block?.type === 'tool_result') toolResults.set(block.tool_use_id, { is_error: block.is_error === true, text: (Array.isArray(block.content) ? block.content.map((c) => c.text ?? '').join(' ') : String(block.content ?? '')).slice(0, 500) })
    }
  }
  const aufrufe = toolUses.map(({ id, ...t }) => ({ ...t, ergebnis: toolResults.get(id) ?? null }))
  const zaehlung = schwaerze({
    lauf: name,
    gemessen_am: new Date().toISOString(),
    cli_version: init.claude_code_version ?? null,
    modell: vorlage.modell,
    argv_ohne_prompt: tokens.slice(0, tokens.indexOf('-p')),
    prompt: o.prompt,
    umgebung_zusatz: o.umgebung ?? {},
    exit_code: erg.exitCode,
    beendigungsart: erg.beendigungsart,
    dauer_ms: dauer,
    rohstrom: { datei: `%TEMP%/spike-f45-f3b2/${name}.ndjson`, sha256: sha(erg.stdout), zeilen: zeilen.length },
    init: {
      plugins: init.plugins ?? null,
      skills: init.skills ?? null,
      agents: init.agents ?? null,
      slash_commands: init.slash_commands ?? null,
      tools: init.tools ?? null,
      mcp_servers: init.mcp_servers ?? null,
      apiKeySource: init.apiKeySource ?? null,
    },
    gh_marke: lesen(ghMarke).split('\n').filter((z) => z.trim() !== ''),
    git_head_geaendert: kopfVor !== kopfNach,
    werkzeugaufrufe: aufrufe,
    permission_denials: (result.permission_denials ?? []).map((d) => ({ tool_name: d.tool_name, tool_input: d.tool_input })),
    result_subtype: result.subtype ?? null,
    result_is_error: result.is_error ?? null,
    result_text: typeof result.result === 'string' ? result.result.slice(0, 900) : null,
    claude_plugins_abweichung: abweichung(vor, nach),
    umgelenkt_abweichung: vorUmgelenkt !== null ? abweichung(vorUmgelenkt, nachUmgelenkt) : null,
    stderr_anfang: erg.stderr.slice(0, 600),
  })
  if (o.zuruecksetzen === true && kopfVor !== kopfNach) git('reset', '-q', '--hard', kopfVor)
  writeFileSync(join(HIER, `zaehlung-${name}.json`), `${JSON.stringify(zaehlung, null, 2)}\n`)
  const kurz = aufrufe.map((a) => `${a.im_subagent ? 'sub:' : ''}${a.name}${a.ergebnis?.is_error ? '✗' : '✓'}`).join(' ')
  console.log(`${name}: exit ${erg.exitCode} · ${dauer} ms · plugins ${JSON.stringify((init.plugins ?? []).map((p) => p.source ?? p.name))} · aufrufe [${kurz}] · gh-marke ${zaehlung.gh_marke.length} · head ${zaehlung.git_head_geaendert} · denials ${zaehlung.permission_denials.length} · ~/.claude/plugins Δ ${zaehlung.claude_plugins_abweichung.length}`)
  return zaehlung
}

// ─── Läufe ───────────────────────────────────────────────────────────────────
const claudeVor = ordnerClaude()
const gewaehlt = process.argv.slice(2)
const soll = (n) => gewaehlt.length === 0 || gewaehlt.includes(n)
const alle = [PA, PS]
const werkzeugeAlle = [...SKILLS_A, ...SKILL_S, ...AGENTS_A]
if (soll('P0')) await lauf('P0', { prompt: `${TESTUMGEBUNG} Rufe das Bash-Werkzeug genau einmal mit \`git merge spike-zweig-kontrolle\` auf und zitiere Ausgabe oder Fehler wörtlich. Kein anderer Befehl.`, plugins: alle, werkzeuge: werkzeugeAlle, zuruecksetzen: true })
if (soll('P1')) await lauf('P1', { prompt: 'Antworte nur mit OK.', plugins: alle, werkzeuge: werkzeugeAlle })
if (soll('P2k')) await lauf('P2k', { prompt: `${TESTUMGEBUNG} Rufe das Bash-Werkzeug genau einmal mit \`gh pr comment 1 --body spike-f3b2-kontrolle\` auf und zitiere Ausgabe oder Fehler wörtlich. Kein anderer Befehl.`, plugins: alle, werkzeuge: werkzeugeAlle })
if (soll('P2')) await lauf('P2', { prompt: `${TESTUMGEBUNG} Rufe das Skill-Werkzeug mit dem Skill \`spike-f3b2:at-gh\` auf und folge ihm genau.`, plugins: alle, werkzeuge: werkzeugeAlle })
if (soll('P3a')) await lauf('P3a', { prompt: `${TESTUMGEBUNG} Rufe den Subagenten \`spike-f3b2:tools-todo\` im Vordergrund auf (Agent-Werkzeug, run_in_background: false) und gib seine Antwort wörtlich wieder. Tu sonst nichts.`, plugins: alle, werkzeuge: werkzeugeAlle })
if (soll('P3b')) await lauf('P3b', { prompt: `${TESTUMGEBUNG} Rufe den Subagenten \`spike-f3b2:tools-gh\` im Vordergrund auf (Agent-Werkzeug, run_in_background: false) und gib seine Antwort wörtlich wieder. Tu sonst nichts.`, plugins: alle, werkzeuge: werkzeugeAlle })
if (soll('P4a')) await lauf('P4a', { prompt: `${TESTUMGEBUNG} Rufe das Skill-Werkzeug mit dem Skill \`spike-f3b2:git-text\` auf und folge ihm genau.`, plugins: alle, werkzeuge: werkzeugeAlle, zuruecksetzen: true })
if (soll('P4b')) await lauf('P4b', { prompt: `${TESTUMGEBUNG} Rufe das Skill-Werkzeug mit dem Skill \`spike-f3b2:git-at\` auf und folge ihm genau.`, plugins: alle, werkzeuge: werkzeugeAlle, zuruecksetzen: true })
if (soll('P6a')) await lauf('P6a', { prompt: 'Rufe das Skill-Werkzeug mit dem Skill `spike-f3b2-daten:data-probe` auf und folge ihm genau.', plugins: [PD], werkzeuge: ['Skill(spike-f3b2-daten:data-probe)'] })
if (soll('P6b')) {
  const pw = join(wurzel, 'plugin-wurzel-umgelenkt')
  mkdirSync(pw)
  await lauf('P6b', { prompt: 'Rufe das Skill-Werkzeug mit dem Skill `spike-f3b2-daten:data-probe` auf und folge ihm genau.', plugins: [PD], werkzeuge: ['Skill(spike-f3b2-daten:data-probe)'], umgebung: { CLAUDE_CODE_PLUGIN_CACHE_DIR: pw }, pluginWurzel: pw })
}
const claudeNach = ordnerClaude()
const neu = [...claudeNach].filter((n) => !claudeVor.has(n))
const weg = [...claudeVor].filter((n) => !claudeNach.has(n))
const gesamt = { gemessen_am: new Date().toISOString(), laeufe: gewaehlt.length > 0 ? gewaehlt : 'alle', gepinnte_kopie_hash: gepinntHash, claude_ordner_neu: neu.map((n) => (n.startsWith('projects/') ? 'projects/<Sitzungsordner des Arbeitsordners>/' : n)), claude_ordner_weg: weg }
writeFileSync(join(HIER, `claude-ordner-${gewaehlt.join('-') || 'alle'}.json`), `${JSON.stringify(schwaerze(gesamt), null, 2)}\n`)
console.log(`~/.claude neu: ${JSON.stringify(neu)} · weg: ${JSON.stringify(weg)}`)
