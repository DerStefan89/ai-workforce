/**
 * F36 Spike S7 (Wegwerf, später löschbar; F-770, E-F36-8 = B): misst mit der realen Claude-CLI, ob
 * die Ausführung so startbar ist, dass NUR Skills/Agents aus per --add-dir eingebundenen
 * Workforce-Ordnern (Ort B) sichtbar und aufrufbar sind. Ergebnis: state/spike-f36-ws2s.md, Abschnitt S7.
 *
 * Ändert keinen Produktcode: baueAufruf (Tokens) und starteProzess (Spawn) werden unverändert
 * importiert; Zusatzflags (--add-dir, --settings, --disable-slash-commands) werden nur für die Messung
 * vor '-p' eingeschoben, Umgebungsvariablen nur über starteProzess' umgebungsvariablen (Merge).
 * Arbeitsverzeichnis je Lauf: frische Wegwerfkopie von vorlagen/projekt-skelett in os.tmpdir() mit
 * eigenem git init + Commit — nie haushaltsbuch2, nie dieses Repo. Die Skill-, Agent- und Plugin-Quellen
 * unter ~/.claude verändert das Skript nicht: Plugins werden nur per --settings (Quelle „flag“, nur diese
 * Sitzung) abgeschaltet; die Verzeichnislisten ~/.claude/skills(/synced/*), …/agents und …/plugins(/synced)
 * werden vor und nach jedem Lauf verglichen. Sitzungsprotokolle, die die CLI selbst schreibt, sind nicht erfasst.
 *
 * Aufruf: node scripts/spike-f36-s7.mjs <variante…> [--laeufe N]   (Default: alle Varianten, 2 Läufe)
 * Schritt 6b („design“) kam nach Runde 1 (B0, V1, V1b, V2, V3, V4b) dazu.
 * Rohströme: os.tmpdir()/spike-f36-s7/<variante>-<lauf>.ndjson, Zusammenfassung daneben.
 */

import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { baueAufruf } from '../src/claude-code-gateway/index.ts'
import { starteProzess } from '../src/claude-code-gateway/prozessstart.ts'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..')
const vorlage = JSON.parse(readFileSync(join(REPO, 'startvorlagen', 'ai-workforce.json'), 'utf8'))
const WERKZEUGE = [...vorlage.werkzeugsaetze.schreibend.erlaubte_werkzeuge, 'Skill', 'Agent']
const CLI = vorlage.werkzeugStartziel[0]
const LOG = join(tmpdir(), 'spike-f36-s7')
mkdirSync(LOG, { recursive: true })

// Fähigkeiten-Ordner außerhalb jedes Projekts und außerhalb von ~/.claude (Ort B).
const CAP = mkdtempSync(join(tmpdir(), 'spike-f36-s7-cap-'))
const CAP_POSIX = CAP.replaceAll('\\', '/')
mkdirSync(join(CAP, '.claude', 'skills', 'probe-skill'), { recursive: true })
writeFileSync(
  join(CAP, '.claude', 'skills', 'probe-skill', 'SKILL.md'),
  '---\nname: probe-skill\ndescription: Nutzen, wenn nach dem Codewort des Probe-Skills gefragt wird.\n---\n\nDas Codewort lautet KAP-SKILL-4711. Antworte mit genau diesem Codewort.\n'
)
mkdirSync(join(CAP, '.claude', 'agents'), { recursive: true })
writeFileSync(
  join(CAP, '.claude', 'agents', 'probe-agent.md'),
  '---\nname: probe-agent\ndescription: Nennt sein Codewort.\ntools: Read\n---\n\nAntworte ausschließlich mit dem Codewort KAP-AGENT-0815.\n'
)
// Ort-B-Schreibsperre wie im WS-2s-Befund S4b (Form C:/…/**).
const CAP_SPERRE = `Write(${CAP_POSIX}/**),Edit(${CAP_POSIX}/**)`

// V2: leeres Konfigurationsverzeichnis — keine Anmeldedaten kopiert, verschoben oder verlinkt.
const LEERE_KONFIG = mkdtempSync(join(tmpdir(), 'spike-f36-s7-config-'))

/** IDs aller aktivierten Plugins aus `claude plugin list --json` (nur lesend). */
function aktivePlugins() {
  try {
    const liste = JSON.parse(execFileSync(CLI, ['plugin', 'list', '--json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }))
    return liste.filter((e) => e.enabled === true).map((e) => e.id)
  } catch (fehler) {
    console.error('plugin list --json fehlgeschlagen:', fehler.message)
    return ['design@synced', 'gitkraken@synced', 'cowork-plugin-management@synced']
  }
}
const PLUGINS_AUS = Object.fromEntries(aktivePlugins().map((id) => [id, false]))

// V2x: Nutzerquelle nachgestellt — CLAUDE_CONFIG_DIR zeigt auf einen Temp-Ordner mit einem Probe-Skill
// und -Agent (das echte ~/.claude bleibt unberührt). Belegt nur das init-Event; die Anmeldung scheitert dort (V2).
const NUTZER_KONFIG = mkdtempSync(join(tmpdir(), 'spike-f36-s7-nutzer-'))
mkdirSync(join(NUTZER_KONFIG, 'skills', 'nutzer-probe-skill'), { recursive: true })
writeFileSync(join(NUTZER_KONFIG, 'skills', 'nutzer-probe-skill', 'SKILL.md'), '---\nname: nutzer-probe-skill\ndescription: Nutzer-Probe.\n---\n\nNUTZER-4242\n')
mkdirSync(join(NUTZER_KONFIG, 'agents'), { recursive: true })
writeFileSync(join(NUTZER_KONFIG, 'agents', 'nutzer-probe-agent.md'), '---\nname: nutzer-probe-agent\ndescription: Nutzer-Probe.\ntools: Read\n---\n\nNUTZER-4343\n')

// V4a: eingebaute Einträge, die nach disableBundledSkills bzw. immer übrig bleiben (B0/V4b, CLI 2.1.284) —
// feste Namensliste. Projekt-Einträge liest der Start aus dem Projekt-.claude/ (vor dem Start bekannt).
const EINGEBAUT_SKILLS = ['design', 'doctor']
const EINGEBAUT_AGENTS = ['claude', 'Explore', 'general-purpose', 'Plan', 'statusline-setup']
/** Einträge unter <dir>/.claude/<sub> (Ordner- bzw. .md-Dateinamen, nicht das Frontmatter-Feld name). */
const namen = (dir, sub, datei) =>
  existsSync(join(dir, '.claude', sub)) ? readdirSync(join(dir, '.claude', sub)).filter((n) => (datei ? n.endsWith('.md') : true)).map((n) => n.replace(/\.md$/, '')) : []
/** V4a-Zusätze aus dem Projektverzeichnis: skillOverrides "off" und Sperrliste. */
function v4aFuerProjekt(dir) {
  const skills = [...EINGEBAUT_SKILLS, ...namen(dir, 'skills', false)]
  const agents = [...EINGEBAUT_AGENTS, ...namen(dir, 'agents', true)]
  return {
    skillOverrides: Object.fromEntries(skills.map((s) => [s, 'off'])),
    deny: [...skills.map((s) => `Skill(${s})`), ...agents.map((a) => `Agent(${a})`)].join(','),
  }
}

/** Varianten: extra = argv vor -p, env = Merge in process.env, settingSources = Wert für baueAufruf. */
const VARIANTEN = {
  B0_heute: {},
  V1_plugins_aus: { settings: { enabledPlugins: PLUGINS_AUS } },
  V1b_plugins_aus_quellen_leer: { settings: { enabledPlugins: PLUGINS_AUS }, settingSources: '' },
  V1c_quellen_local: { settings: { enabledPlugins: PLUGINS_AUS }, settingSources: 'local' },
  V2_config_dir: { env: { CLAUDE_CONFIG_DIR: LEERE_KONFIG } },
  V2x_nutzerquelle: { env: { CLAUDE_CONFIG_DIR: NUTZER_KONFIG } },
  V2y_nutzerquelle_local: { env: { CLAUDE_CONFIG_DIR: NUTZER_KONFIG }, settingSources: 'local' },
  V3_disable_slash: { extra: ['--disable-slash-commands'] },
  V4a_kombi: { settings: { enabledPlugins: PLUGINS_AUS, disableBundledSkills: true }, v4a: true },
  V4b_eingebaut_aus: {
    settings: { enabledPlugins: PLUGINS_AUS, disableBundledSkills: true },
    settingSources: '',
    env: { CLAUDE_CODE_AGENT_SDK_DISABLE_BUILTIN_AGENTS: '1' },
  },
}

// Schlicht formuliert (S6d-Lehre). Je Herkunft ein nicht freigegebener Vertreter.
const PROMPT = [
  'Deine Aufgabe in diesem Projekt, Schritt für Schritt:',
  '1) Lade den Skill "probe-skill" über das Skill-Werkzeug und nenne das Codewort.',
  '2) Frage den Subagenten "probe-agent" über das Agent-Werkzeug (run_in_background: false) nach seinem Codewort.',
  '3) Lade den Skill "ponytail" über das Skill-Werkzeug.',
  '4) Lade den Skill "design:ux-copy" über das Skill-Werkzeug.',
  '5) Lade den Skill "pdf" über das Skill-Werkzeug.',
  '6) Lade den Skill "loop" über das Skill-Werkzeug.',
  '6b) Lade den Skill "design" über das Skill-Werkzeug.',
  '7) Frage den Subagenten "qa" (Agent-Werkzeug, run_in_background: false): "Antworte nur mit OK".',
  '8) Frage ebenso den Subagenten "general-purpose": "Antworte nur mit OK".',
  'Führe geladene Skills nicht weiter aus, sondern gehe zum nächsten Schritt. Berichte zu jedem Schritt die Antwort des Werkzeugs; wenn ein Werkzeug einen Fehler meldet, zitiere ihn und mach mit dem nächsten Schritt weiter. Lies keine Dateien.',
].join('\n')

/** Wegwerfkopie des Skeletts mit eigenem Repo und einem Commit. */
function arbeitsverzeichnis(name) {
  const dir = mkdtempSync(join(tmpdir(), `spike-f36-s7-${name}-`))
  cpSync(join(REPO, 'vorlagen', 'projekt-skelett'), dir, { recursive: true })
  const git = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'pipe', encoding: 'utf8' })
  git('init', '-q')
  git('add', '-A')
  git('-c', 'user.name=spike', '-c', 'user.email=spike@invalid', 'commit', '-q', '-m', 'spike-f36-s7 basis')
  return { dir, git }
}

/** Nur lesender Fingerabdruck der Nutzerquellen (Verzeichnisnamen, keine Inhalte). */
function nutzerSnapshot() {
  const liste = (p) => (existsSync(p) && statSync(p).isDirectory() ? readdirSync(p).sort() : null)
  const h = join(homedir(), '.claude')
  const synced = liste(join(h, 'skills', 'synced')) ?? []
  return JSON.stringify({
    skills: liste(join(h, 'skills')),
    skills_synced: synced.map((d) => [d, liste(join(h, 'skills', 'synced', d))]),
    agents: liste(join(h, 'agents')),
    plugins: liste(join(h, 'plugins')),
    plugins_synced: liste(join(h, 'plugins', 'synced')),
  })
}

/** Zerlegt den Rohstrom: init, Aufrufe mit Ergebnis, Denials. */
function auswerten(stdout) {
  const zeilen = stdout
    .split('\n')
    .filter((z) => z.trim())
    .map((z) => {
      try {
        return JSON.parse(z)
      } catch {
        return {}
      }
    })
  const init = zeilen.find((z) => z.type === 'system' && z.subtype === 'init') ?? null
  const aufrufe = []
  const ergebnisse = new Map()
  for (const z of zeilen) {
    for (const b of z.message?.content ?? []) {
      if (z.type === 'assistant' && b.type === 'tool_use' && z.parent_tool_use_id == null) aufrufe.push({ id: b.id, name: b.name, input: b.input })
      if (z.type === 'user' && b.type === 'tool_result') {
        const text = Array.isArray(b.content) ? b.content.map((c) => c.text ?? '').join(' ') : String(b.content ?? '')
        ergebnisse.set(b.tool_use_id, { fehler: b.is_error === true, text: text.slice(0, 240) })
      }
    }
  }
  const result = zeilen.findLast((z) => z.type === 'result') ?? {}
  return {
    init: init && {
      claude_code_version: init.claude_code_version,
      apiKeySource: init.apiKeySource,
      skills: init.skills,
      agents: init.agents,
      plugins: init.plugins,
      slash_commands_anzahl: (init.slash_commands ?? []).length,
    },
    aufrufe: aufrufe.map((a) => ({
      name: a.name,
      ziel: a.input?.skill ?? a.input?.subagent_type ?? null,
      ergebnis: ergebnisse.get(a.id) ?? null,
    })),
    permission_denials: result.permission_denials ?? null,
    is_error: result.is_error ?? null,
    result: typeof result.result === 'string' ? result.result.slice(0, 1200) : null,
  }
}

/** Ein Lauf einer Variante: Wegwerfprojekt, Tokens + Zusatzflags, Spawn, Rohstrom sichern, auswerten. */
async function lauf(name, def, nr) {
  const { dir, git } = arbeitsverzeichnis(name)
  const v4a = def.v4a ? v4aFuerProjekt(dir) : null
  const settings = v4a ? { ...def.settings, skillOverrides: v4a.skillOverrides } : def.settings
  const deny = [CAP_SPERRE, def.deny, v4a?.deny].filter(Boolean).join(',')
  const tokens = baueAufruf({
    modell: vorlage.modell,
    prompt: PROMPT,
    werkzeugsatz: { modus: 'DEKLARIERT', erlaubte_werkzeuge: WERKZEUGE },
    disallowedTools: deny,
    ...(def.settingSources !== undefined ? { settingSources: def.settingSources } : {}),
  })
  const argv = tokens.slice(0, -1)
  const zusatz = ['--add-dir', CAP, ...(settings ? ['--settings', JSON.stringify(settings)] : []), ...(def.extra ?? [])]
  argv.splice(argv.indexOf('-p'), 0, ...zusatz)
  const vorher = nutzerSnapshot()
  const t0 = Date.now()
  const erg = await starteProzess(vorlage.werkzeugStartziel, argv, {
    cwd: dir,
    stdinDaten: tokens.at(-1),
    zeitgrenzeMs: 600000,
    ergebnisZeileBeendet: true,
    ...(def.env ? { umgebungsvariablen: def.env } : {}),
  })
  const rohPfad = join(LOG, `${name}-${nr}.ndjson`)
  writeFileSync(rohPfad, erg.stdout)
  return {
    variante: name,
    lauf: nr,
    dauer_ms: Date.now() - t0,
    rohstrom: rohPfad,
    argv_ohne_prompt: argv,
    env: def.env ?? null,
    exitCode: erg.exitCode,
    stderr: erg.stderr.trim().slice(0, 600),
    stdout_anfang: erg.stdout.slice(0, 300),
    projekt_git_status: git('status', '--porcelain', '--untracked-files=all').trim(),
    nutzerquellen_unveraendert: vorher === nutzerSnapshot(),
    leere_konfig_inhalt: def.env?.CLAUDE_CONFIG_DIR ? readdirSync(def.env.CLAUDE_CONFIG_DIR) : null,
    ...auswerten(erg.stdout),
  }
}

const lIdx = process.argv.indexOf('--laeufe')
const LAEUFE = lIdx > 0 ? Number(process.argv[lIdx + 1]) : 2
const auswahl = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && all[i - 1] !== '--laeufe')
const ergebnisse = []
for (const [name, def] of Object.entries(VARIANTEN)) {
  if (auswahl.length && !auswahl.includes(name)) continue
  for (let nr = 1; nr <= LAEUFE; nr++) {
    ergebnisse.push(await lauf(name, def, nr))
    console.error(`fertig: ${name} #${nr}`)
  }
}
const ausgabe = { cli: CLI, cap: CAP, plugins_aus: PLUGINS_AUS, ergebnisse }
writeFileSync(join(LOG, `zusammenfassung-${auswahl.join('+') || 'alle'}.json`), JSON.stringify(ausgabe, null, 1))
console.log(JSON.stringify(ausgabe, null, 1))
