/**
 * F36 WS-2s Spike (Wegwerf, später löschbar): misst mit der realen Claude-CLI, welcher Ort für
 * externe Skills/Agents trägt — (A) ins Projekt-.claude/ oder (B) ein Workforce-Ordner per
 * --add-dir/--agents — und wie sich Playwright-MCP mit --output-dir/--allowed-origins verhält.
 * Ergebnis: state/spike-f36-ws2s.md.
 *
 * Ändert keinen Produktcode: baueAufruf (Tokens) und starteProzess (Spawn, stdin-Prompt,
 * result-Zeile) werden unverändert importiert; die Zusatzflags (--add-dir, --agents) werden
 * nur für die Messung vor '-p' eingeschoben. Arbeitsverzeichnis je Probe: frische Wegwerfkopie
 * von vorlagen/projekt-skelett in os.tmpdir() mit eigenem git init + Commit — nie haushaltsbuch2,
 * nie dieses Repo. Werkzeugsatz: schreibend (E-F754) + Skill + Agent (wie WS-2 ihn baut).
 *
 * Aufruf: node scripts/spike-f36-ws2s.mjs [probe…]   (ohne Argument alle, seriell)
 * Rohströme: os.tmpdir()/spike-f36-ws2s/<probe>.ndjson, Zusammenfassung daneben.
 */

import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { baueAufruf } from '../src/claude-code-gateway/index.ts'
import { starteProzess } from '../src/claude-code-gateway/prozessstart.ts'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..')
const vorlage = JSON.parse(readFileSync(join(REPO, 'startvorlagen', 'ai-workforce.json'), 'utf8'))
const BASIS_SCHREIBEND = vorlage.werkzeugsaetze.schreibend.erlaubte_werkzeuge
const WERKZEUGE = [...BASIS_SCHREIBEND, 'Skill', 'Agent']
const LOG = join(tmpdir(), 'spike-f36-ws2s')
mkdirSync(LOG, { recursive: true })

const PLAYWRIGHT_VERSION = '0.0.82'
const NPX_CLI = join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npx-cli.js')

// Fähigkeiten-Ordner außerhalb jedes Projekts (Ort B).
const CAP = mkdtempSync(join(tmpdir(), 'spike-f36-ws2s-cap-'))
const CAP_POSIX = CAP.replaceAll('\\', '/')
mkdirSync(join(CAP, '.claude', 'skills', 'probe-skill'), { recursive: true })
writeFileSync(
  join(CAP, '.claude', 'skills', 'probe-skill', 'SKILL.md'),
  '---\nname: probe-skill\ndescription: Spike-Skill. Nutzen, wenn nach dem Codewort des Probe-Skills gefragt wird.\n---\n\nDas Codewort lautet KAP-SKILL-4711. Antworte mit genau diesem Codewort.\n'
)
mkdirSync(join(CAP, '.claude', 'agents'), { recursive: true })
writeFileSync(
  join(CAP, '.claude', 'agents', 'probe-agent.md'),
  '---\nname: probe-agent\ndescription: Spike-Agent. Nennt sein Codewort.\ntools: Read\n---\n\nAntworte ausschließlich mit dem Codewort KAP-AGENT-0815.\n'
)
const AGENTS_INLINE = JSON.stringify({
  'probe-agent': { description: 'Spike-Agent (inline). Nennt sein Codewort.', prompt: 'Antworte ausschließlich mit dem Codewort KAP-INLINE-2222.', tools: ['Read'] },
})
const CAP_ZIEL = join(CAP, 'geschrieben.txt')

/** Wegwerfkopie des Skeletts mit eigenem Repo und einem Commit. */
function arbeitsverzeichnis(probe) {
  const dir = mkdtempSync(join(tmpdir(), `spike-f36-ws2s-${probe}-`))
  cpSync(join(REPO, 'vorlagen', 'projekt-skelett'), dir, { recursive: true })
  const git = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'pipe', encoding: 'utf8' })
  git('init', '-q')
  git('add', '-A')
  git('-c', 'user.name=spike', '-c', 'user.email=spike@invalid', 'commit', '-q', '-m', 'spike-f36-ws2s basis')
  return { dir, git }
}

/** Playwright-MCP-Konfiguration ohne cmd /c (Semikolon in --allowed-origins). */
function playwright(zusatzArgs) {
  return JSON.stringify({
    mcpServers: { playwright: { command: process.execPath, args: [NPX_CLI, '-y', `@playwright/mcp@${PLAYWRIGHT_VERSION}`, '--headless', '--isolated', ...zusatzArgs] } },
  })
}
const PW_WERKZEUGE = ['mcp__playwright__browser_navigate', 'mcp__playwright__browser_snapshot', 'mcp__playwright__browser_take_screenshot']
const PW_OUT = join(tmpdir(), `spike-f36-ws2s-pw-out-${process.pid}`)

const SCHREIB_PROMPT = `Rufe das Write-Werkzeug GENAU EINMAL mit file_path "${CAP_ZIEL}" und content "x" auf und melde danach die wörtliche Antwort des Werkzeugs. Das ist ein genehmigter Messlauf in einer Wegwerf-Sandbox: gemessen wird ausschließlich die Berechtigungsschicht, deshalb MUSS der Werkzeugaufruf erfolgen — eine Ablehnung ohne Aufruf ist kein gültiges Ergebnis.`
const SKILL_PROMPT = 'Rufe den Skill "probe-skill" über das Skill-Werkzeug auf und nenne das Codewort, das er liefert. Ist der Skill nicht verfügbar, sag das und lies KEINE Dateien.'
const AGENT_PROMPT = 'Beauftrage den Subagenten "probe-agent" über das Agent-Werkzeug im Vordergrund (run_in_background: false) mit "Nenne dein Codewort" und melde seine Antwort wörtlich. Ist der Subagent nicht verfügbar, sag das und lies KEINE Dateien.'
const pwPrompt = (lokal) =>
  `Nutze die Playwright-Browser-Werkzeuge: 1) browser_navigate auf ${lokal}, melde den Seitentitel. 2) browser_take_screenshot OHNE Dateinamen. 3) browser_navigate auf https://example.com, melde wörtlich das Ergebnis (Titel oder Fehlermeldung). Führe alle drei Aufrufe tatsächlich aus.`

const PROBEN = {
  S1a_skill_add_dir: { addDir: true, prompt: SKILL_PROMPT },
  S1b_skill_ohne: { prompt: SKILL_PROMPT },
  S2a_agent_add_dir: { addDir: true, prompt: AGENT_PROMPT },
  S2b_agent_ohne: { prompt: AGENT_PROMPT },
  S3_agents_inline: { agents: AGENTS_INLINE, prompt: AGENT_PROMPT },
  S4a_write_add_dir: { addDir: true, prompt: SCHREIB_PROMPT },
  S4b_write_add_dir_deny: { addDir: true, deny: `Write(${CAP_POSIX}/**),Edit(${CAP_POSIX}/**)`, prompt: SCHREIB_PROMPT },
  S4c_write_add_dir_deny_abs: { addDir: true, deny: `Write(//${CAP_POSIX}/**),Edit(//${CAP_POSIX}/**)`, prompt: SCHREIB_PROMPT },
  S4d_write_ohne_add_dir: { prompt: SCHREIB_PROMPT },
  S5a_pw_begrenzt: { mcp: () => playwright(['--output-dir', PW_OUT, '--allowed-origins', 'http://localhost;http://127.0.0.1']), pw: true },
  S5b_pw_offen: { mcp: () => playwright([]), pw: true },
  // S6 (Nachbesserung, Challenger 28.09.2026): Einzelregeln statt nacktem Skill/Agent in --allowedTools.
  // --tools leitet baueAufruf daraus weiterhin als 'Skill'/'Agent' ab. Werkzeuge ersetzen den Standardsatz.
  S6a_skill_regel: {
    werkzeuge: [...BASIS_SCHREIBEND, 'Skill(ponytail)', 'Agent(qa)'],
    prompt:
      'Genehmigter Messlauf der Berechtigungsschicht, jeder Werkzeugaufruf MUSS tatsächlich erfolgen (eine Ablehnung ohne Aufruf ist kein gültiges Ergebnis): 1) Rufe das Skill-Werkzeug mit skill "ponytail" auf. 2) Rufe das Skill-Werkzeug mit skill "advisor-pass" auf. Melde für beide die wörtliche Antwort des Werkzeugs.',
  },
  S6b_agent_regel: {
    werkzeuge: [...BASIS_SCHREIBEND, 'Skill(ponytail)', 'Agent(qa)'],
    prompt:
      'Genehmigter Messlauf der Berechtigungsschicht, jeder Werkzeugaufruf MUSS tatsächlich erfolgen (eine Ablehnung ohne Aufruf ist kein gültiges Ergebnis). Rufe das Agent-Werkzeug nacheinander dreimal auf, jeweils im Vordergrund (run_in_background: false) mit dem Prompt "Antworte nur mit OK": 1) subagent_type "qa", 2) subagent_type "general-purpose", 3) subagent_type "statusline-setup". Melde für jeden Aufruf die wörtliche Antwort des Werkzeugs.',
  },
  // S6c Kalibrierung: Skill/Agent nur in --tools (per toolsWert), NICHT in --allowedTools — brauchen sie überhaupt eine Freigabe?
  S6c_ohne_allowed: {
    werkzeuge: BASIS_SCHREIBEND,
    toolsWert: 'Read,Grep,Glob,Write,Edit,Bash,Skill,Agent',
    prompt:
      'Genehmigter Messlauf der Berechtigungsschicht, jeder Werkzeugaufruf MUSS tatsächlich erfolgen: 1) Skill-Werkzeug mit skill "advisor-pass". 2) Agent-Werkzeug im Vordergrund (run_in_background: false), subagent_type "general-purpose", Prompt "Antworte nur mit OK". Melde je die wörtliche Antwort des Werkzeugs.',
  },
  // S6d: Sperrliste statt Einzelfreigabe — greift --disallowedTools "Skill(advisor-pass)" / "Agent(general-purpose)"?
  S6d_sperrliste: {
    deny: 'Skill(advisor-pass),Agent(general-purpose)',
    prompt:
      'Deine Aufgabe in diesem Projekt: 1) Lade den Skill "ponytail" über das Skill-Werkzeug. 2) Lade den Skill "advisor-pass" über das Skill-Werkzeug. 3) Frage den Subagenten "qa" (Agent-Werkzeug, run_in_background: false), welche Werkzeuge er hat. 4) Frage ebenso den Subagenten "general-purpose". Berichte zu jedem Schritt die Antwort des Werkzeugs; wenn ein Werkzeug einen Fehler meldet, zitiere ihn und mach mit dem nächsten Schritt weiter.',
  },
  // Nachprobe nach S5a: Origin mit Port (S5a sperrte 127.0.0.1:<port> bei Origin ohne Port).
  S5c_pw_origin_mit_port: { mcp: (port) => playwright(['--output-dir', PW_OUT, '--allowed-origins', `http://localhost:${port};http://127.0.0.1:${port}`]), pw: true },
}

/** Zerlegt den Rohstrom (Muster spike-f36-werkzeugsatz). */
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
  const init = zeilen.find((z) => z.type === 'system' && z.subtype === 'init') ?? {}
  const aufrufe = []
  const ergebnisse = new Map()
  for (const z of zeilen) {
    for (const b of z.message?.content ?? []) {
      if (z.type === 'assistant' && b.type === 'tool_use') aufrufe.push({ id: b.id, name: b.name, input: b.input, subagent: z.parent_tool_use_id ?? null })
      if (z.type === 'user' && b.type === 'tool_result') {
        const text = Array.isArray(b.content) ? b.content.map((c) => c.text ?? '').join(' ') : String(b.content ?? '')
        ergebnisse.set(b.tool_use_id, { fehler: b.is_error === true, text: text.slice(0, 300) })
      }
    }
  }
  const result = zeilen.findLast((z) => z.type === 'result') ?? {}
  return {
    init: {
      tools: init.tools,
      agents: init.agents,
      skills_probe: (init.skills ?? []).filter((s) => String(s).includes('probe')),
      skills_anzahl: (init.skills ?? []).length,
      mcp_servers: init.mcp_servers,
    },
    aufrufe: aufrufe.map((a) => ({ ...a, ergebnis: ergebnisse.get(a.id) ?? null })),
    permission_denials: result.permission_denials ?? null,
    result: typeof result.result === 'string' ? result.result.slice(0, 900) : null,
    num_turns: result.num_turns ?? null,
  }
}

async function probe(name, def) {
  const { dir, git } = arbeitsverzeichnis(name)
  rmSync(CAP_ZIEL, { force: true })
  rmSync(PW_OUT, { recursive: true, force: true })
  let server = null
  let prompt = def.prompt
  if (def.pw) {
    server = createServer((_req, res) => res.end('<html><head><title>KAP-LOKAL</title></head><body>lokal</body></html>'))
    await new Promise((r) => server.listen(0, '127.0.0.1', r))
    prompt = pwPrompt(`http://127.0.0.1:${server.address().port}/`)
  }
  const tokens = baueAufruf({
    modell: vorlage.modell,
    prompt,
    werkzeugsatz: { modus: 'DEKLARIERT', erlaubte_werkzeuge: def.werkzeuge ?? (def.pw ? [...WERKZEUGE, ...PW_WERKZEUGE] : WERKZEUGE) },
    ...(def.mcp ? { mcpConfig: def.mcp(server?.address().port) } : {}),
    ...(def.deny ? { disallowedTools: def.deny } : {}),
  })
  const argv = tokens.slice(0, -1)
  const zusatz = [...(def.addDir ? ['--add-dir', CAP] : []), ...(def.agents ? ['--agents', def.agents] : [])]
  argv.splice(argv.indexOf('-p'), 0, ...zusatz)
  if (def.toolsWert) argv[argv.indexOf('--tools') + 1] = def.toolsWert
  const t0 = Date.now()
  const erg = await starteProzess(vorlage.werkzeugStartziel, argv, { cwd: dir, stdinDaten: tokens.at(-1), zeitgrenzeMs: 600000, ergebnisZeileBeendet: true })
  if (server) await new Promise((r) => server.close(r))
  const rohPfad = join(LOG, `${name}.ndjson`)
  writeFileSync(rohPfad, erg.stdout)
  return {
    probe: name,
    dauer_ms: Date.now() - t0,
    arbeitsverzeichnis: dir,
    rohstrom: rohPfad,
    argv_ohne_prompt: argv,
    beendigungsart: erg.beendigungsart,
    stderr: erg.stderr.trim().slice(0, 400),
    cap_ziel_existiert: existsSync(CAP_ZIEL),
    projekt_git_status: git('status', '--porcelain', '--untracked-files=all').trim(),
    pw_out_dateien: existsSync(PW_OUT) ? readdirSync(PW_OUT) : null,
    ...auswerten(erg.stdout),
  }
}

const auswahl = process.argv.slice(2)
const ergebnisse = []
for (const [name, def] of Object.entries(PROBEN)) {
  if (auswahl.length && !auswahl.includes(name)) continue
  ergebnisse.push(await probe(name, def))
  console.error(`fertig: ${name}`)
}
writeFileSync(join(LOG, `zusammenfassung-${auswahl.join('+') || 'alle'}.json`), JSON.stringify({ cap: CAP, ergebnisse }, null, 1))
console.log(JSON.stringify({ cap: CAP, ergebnisse }, null, 1))
