#!/usr/bin/env node
/**
 * Datei: features/F36/nachweis-ws5b/erzeuge-nachweis.mjs
 *
 * Zweck: Echte Nachweise F36 WS-5b (Auftrag Punkt 9), einmalig von Hand ausgeführt, NICHT Teil von
 * `npm run check`:
 * - installation: echte Installation von frontend-design über den Installationsweg
 *   (bereiteInstallationVor + installiereRessource, echter git-Runner gegen GitHub) aus der
 *   ressourcen.json dieses Checkouts; danach wird ressourcen.json bitgenau auf den Stand davor
 *   zurückgesetzt (frontend-design wieder OFFEN ohne installation — die Freigabe macht Stefan im
 *   Reallauf). cap-Wurzel ist ein Nachweis-Ordner unter %TEMP%, damit ~/.ai-workforce/cap für den
 *   Reallauf leer bleibt (sonst 409 „Zielordner existiert bereits“).
 * - lauf: echter CLI-Lauf mit ZWEI Ort-B-Skills (frontend-design aus der Installation + lokaler
 *   Prüfskill) in einem Wegwerf-Projekt (Kopie von vorlagen/projekt-skelett wie Spike S7). Eingaben
 *   über das unveränderte loeseAusfuehrungsEingabenAuf (V4a aus baueOrtBSkillStart), Tokens über
 *   baueAufruf, Spawn über starteProzess. Gewertet werden init-Zeile (pruefeInitZeile) und die
 *   tool_result-Texte je Aufruf.
 * - rotfall: wie lauf, der Auftrag lässt einen Skill unter .claude/skills/ per Write und per Bash
 *   anlegen und aufrufen (F-791 (4a)); Grünseite: Write außerhalb .claude erlaubt, Edit in .claude verweigert;
 *   danach Laufdiff (leseClaudeAenderungen).
 * - commands: wie lauf, das Projekt trägt zusätzlich .claude/commands/lessons.md und sub/tief.md
 *   (Reviewer-Befund H1); der Auftrag ruft Projekt-Commands und eingebaute Slash-Commands per Skill auf.
 * - slash: die übrigen eingebauten Slash-Commands der init-Zeile per Skill-Werkzeug (QA-Pass 2).
 * - initgate: echter Init-Gate-Abbruch gegen die CLI — erwartet wird nur 'pruef-skill', frontend-design ist
 *   damit fremd. Mechanismus wie starteGateway (pruefeInitZeile an der init-Zeile → AbortController →
 *   abbruchSignal von starteProzess); starteGateway selbst verlangt die F4-Startfreigabe des echten Repos.
 * Rohströme (NDJSON) unter %TEMP%\f36-ws5b-nachweis\ (flüchtig, nicht im Repo); Auswertung als JSON
 * neben dieser Datei.
 *
 * Aufruf: node features/F36/nachweis-ws5b/erzeuge-nachweis.mjs installation|lauf|rotfall|commands|slash|initgate
 */

import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { baueAufruf, pruefeInitZeile } from '../../../src/claude-code-gateway/index.ts'
import { starteProzess } from '../../../src/claude-code-gateway/prozessstart.ts'
import { leseClaudeAenderungen } from '../../../src/execution-controller/index.ts'
import { bereiteInstallationVor, installiereRessource } from '../../../src/ressourcen/installation.ts'
import { berechneInhaltHash, leseFrontmatter, listeSkillDateien } from '../../../src/ressourcen/skill-dateien.ts'
import { ladeStartvorlage } from '../../../src/startvorlage/index.ts'
import { loeseAusfuehrungsEingabenAuf } from '../../../scripts/leitstand-server.mjs'

const HIER = dirname(fileURLToPath(import.meta.url))
const REPO = join(HIER, '..', '..', '..')
const NACHWEIS_TEMP = join(tmpdir(), 'f36-ws5b-nachweis')
const CAP = join(NACHWEIS_TEMP, 'cap')
const INSTALLIERT = join(HIER, 'installation-frontend-design.json')
mkdirSync(NACHWEIS_TEMP, { recursive: true })
const vorlage = ladeStartvorlage(join(REPO, 'startvorlagen', 'ai-workforce.json'))
const cliVersion = () => execFileSync(vorlage.werkzeugStartziel[0], ['--version'], { encoding: 'utf8' }).trim()

// ─── 9a Installation ───────────────────────────────────────────────────────────

async function installation() {
  const katalogPfad = join(REPO, 'ressourcen.json')
  const vorher = readFileSync(katalogPfad)
  if (existsSync(join(CAP, 'frontend-design'))) throw new Error(`${join(CAP, 'frontend-design')} existiert schon — vorher entfernen`)
  const kontext = { installWurzel: REPO, capWurzel: CAP }
  try {
    const vorbereitet = await bereiteInstallationVor('frontend-design', kontext)
    if (!vorbereitet.ok) throw new Error(`Vorbereiten: ${vorbereitet.status} ${vorbereitet.grund}`)
    const lsRemote = execFileSync('git', ['ls-remote', vorbereitet.daten.repo, 'main'], { encoding: 'utf8' }).trim()
    const ergebnis = await installiereRessource('frontend-design', { version: vorbereitet.daten.version, integrity: undefined, eintragHash: vorbereitet.daten.eintragHash }, kontext)
    if (!ergebnis.ok) throw new Error(`Installieren: ${ergebnis.status} ${ergebnis.grund}`)
    const katalogNachher = JSON.parse(readFileSync(katalogPfad, 'utf8'))
    const eintrag = katalogNachher.ressourcen.find((r) => r.id === 'frontend-design')
    const skillMd = readFileSync(join(ergebnis.daten.zielordner, 'SKILL.md'), 'utf8')
    const nachweis = {
      erzeugt_am: new Date().toISOString(),
      git_version: execFileSync('git', ['--version'], { encoding: 'utf8' }).trim(),
      vorbereitung: vorbereitet.daten,
      ls_remote_main_roh: lsRemote.split('\n'),
      ergebnis: ergebnis.daten,
      eintrag_nach_installation: eintrag,
      dateien_im_zielordner: listeSkillDateien(ergebnis.daten.zielordner),
      inhalt_hash_neu_berechnet: berechneInhaltHash(ergebnis.daten.zielordner),
      frontmatter: leseFrontmatter(skillMd),
      frontmatter_roh: skillMd.split('\n').slice(0, 5),
    }
    writeFileSync(INSTALLIERT, `${JSON.stringify(nachweis, null, 2)}\n`)
    console.log(JSON.stringify(nachweis, null, 2))
  } finally {
    writeFileSync(katalogPfad, vorher)
    console.error(`ressourcen.json zurückgesetzt (bitgenau wie vorher): ${readFileSync(katalogPfad).equals(vorher)}`)
  }
}

// ─── 9b/9c CLI-Läufe ───────────────────────────────────────────────────────────

/** Lokaler Prüfskill an Ort B (eigener cap-Ordner), Katalogeintrag wie nach einer Installation. */
function pruefSkill() {
  const ordner = join(CAP, 'pruef-skill', '.claude', 'skills', 'pruef-skill')
  if (!existsSync(ordner)) {
    mkdirSync(ordner, { recursive: true })
    writeFileSync(join(ordner, 'SKILL.md'), '---\nname: pruef-skill\ndescription: Nutzen, wenn nach dem Codewort des Prüfskills gefragt wird.\n---\n\nDas Codewort lautet KAP-PRUEF-5B. Antworte mit genau diesem Codewort.\n')
  }
  return {
    id: 'pruef-skill',
    typ: 'extern',
    name: 'Prüfskill',
    beschreibung: 'Lokaler Prüfskill (Nachweis WS-5b).',
    unterart: 'skill',
    capabilities: ['GATE'],
    freigabe: 'FREIGEGEBEN',
    herkunft: { art: 'extern', url: 'https://github.com/fixture/pruef' },
    installation: { pfad: ordner, version: '0'.repeat(40), inhalt_hash: berechneInhaltHash(ordner) },
  }
}

/** Wegwerf-Projekt: Kopie des Skeletts (optional mit Projekt-Commands), eigenes git (Branch ≠ main/master), ein Commit. */
function wegwerfProjekt(name, mitCommands = false) {
  const dir = mkdtempSync(join(tmpdir(), `f36-ws5b-${name}-`))
  cpSync(join(REPO, 'vorlagen', 'projekt-skelett'), dir, { recursive: true })
  if (mitCommands) {
    mkdirSync(join(dir, '.claude', 'commands', 'sub'), { recursive: true })
    writeFileSync(join(dir, '.claude', 'commands', 'lessons.md'), '---\ndescription: Nennt CMD-LESSONS-1.\n---\nAntworte mit CMD-LESSONS-1.\n')
    writeFileSync(join(dir, '.claude', 'commands', 'sub', 'tief.md'), '---\ndescription: Nennt CMD-TIEF-1.\n---\nAntworte mit CMD-TIEF-1.\n')
  }
  const git = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  git('init', '-q', '-b', 'nachweis-ws5b')
  git('config', 'core.autocrlf', 'false')
  git('add', '-A')
  git('-c', 'user.name=nachweis', '-c', 'user.email=nachweis@invalid', 'commit', '-q', '-m', 'f36-ws5b nachweis basis')
  return { dir, git }
}

/** Zerlegt den Rohstrom: init, Aufrufe (nur Hauptlauf) mit tool_result-Text, result. */
function auswerten(stdout) {
  const zeilen = stdout
    .split('\n')
    .filter((z) => z.trim())
    .flatMap((z) => {
      try {
        return [JSON.parse(z)]
      } catch {
        return []
      }
    })
  const init = zeilen.find((z) => z.type === 'system' && z.subtype === 'init') ?? null
  const aufrufe = []
  const ergebnisse = new Map()
  for (const z of zeilen) {
    for (const b of z.message?.content ?? []) {
      if (z.type === 'assistant' && b.type === 'tool_use') aufrufe.push({ id: b.id, name: b.name, input: b.input, subagent: z.parent_tool_use_id ?? null })
      if (z.type === 'user' && b.type === 'tool_result') {
        const text = Array.isArray(b.content) ? b.content.map((c) => c.text ?? '').join(' ') : String(b.content ?? '')
        ergebnisse.set(b.tool_use_id, { is_error: b.is_error === true, text: text.slice(0, 400) })
      }
    }
  }
  const result = zeilen.findLast((z) => z.type === 'result') ?? {}
  return {
    init: init && { claude_code_version: init.claude_code_version, tools: init.tools, skills: init.skills, agents: init.agents, mcp_servers: init.mcp_servers, plugins: init.plugins, slash_commands: init.slash_commands },
    aufrufe: aufrufe.map((a) => ({ name: a.name, input: a.input, subagent: a.subagent, ergebnis: ergebnisse.get(a.id) ?? null })),
    permission_denials: result.permission_denials ?? null,
    is_error: result.is_error ?? null,
    result: typeof result.result === 'string' ? result.result.slice(0, 2500) : null,
  }
}

/** Ein echter Lauf über den Produktionsweg (loeseAusfuehrungsEingabenAuf → baueAufruf → starteProzess). */
async function lauf(name, prompt, { mitCommands = false, initGateSkills = null } = {}) {
  if (!existsSync(INSTALLIERT)) throw new Error('erst „installation“ ausführen')
  const installiert = JSON.parse(readFileSync(INSTALLIERT, 'utf8')).eintrag_nach_installation
  const skills = [installiert, pruefSkill()]
  const { dir, git } = wegwerfProjekt(name, mitCommands)
  const eingabenErgebnis = loeseAusfuehrungsEingabenAuf(
    { rolle: 'ausfuehrung', anfragen: [], budget: {}, aufrufEingaben: { modell: vorlage.modell }, auftragId: `nachweis-${name}` },
    'schreibend',
    prompt,
    vorlage,
    dir,
    { skillEintraege: skills, capWurzel: CAP }
  )
  if (!eingabenErgebnis.ok) throw new Error(`loeseAusfuehrungsEingabenAuf: ${eingabenErgebnis.grund}`)
  const eingaben = eingabenErgebnis.eingaben
  const tokens = baueAufruf({ ...eingaben.aufrufEingaben, prompt })
  const t0 = Date.now()
  // initgate: Init-Gate wie in starteGateway, nur mit bewusst zu kleiner erwarteter Menge.
  const abbruch = new AbortController()
  const gate = { verstoss: null, abbruchNachMs: null, zeilenBisAbbruch: 0 }
  const beiStreamZeile =
    initGateSkills === null
      ? undefined
      : (zeile) => {
          if (gate.verstoss !== null) return
          gate.zeilenBisAbbruch++
          if (zeile.type === 'system' && zeile.subtype === 'init') {
            gate.verstoss = pruefeInitZeile(zeile, { skills: initGateSkills, mcpServer: [] })
            if (gate.verstoss !== null) {
              gate.abbruchNachMs = Date.now() - t0
              abbruch.abort()
            }
          }
        }
  const erg = await starteProzess(eingaben.werkzeugStartziel, tokens.slice(0, -1), {
    cwd: dir,
    stdinDaten: tokens.at(-1),
    zeitgrenzeMs: 600_000,
    ergebnisZeileBeendet: true,
    ...(beiStreamZeile !== undefined ? { beiStreamZeile, abbruchSignal: abbruch.signal } : {}),
  })
  const rohPfad = join(NACHWEIS_TEMP, `${name}-${new Date().toISOString().replaceAll(':', '-')}.ndjson`)
  writeFileSync(rohPfad, erg.stdout)
  const ausgewertet = auswerten(erg.stdout)
  const initRoh = erg.stdout.split('\n').map((z) => {
    try {
      return JSON.parse(z)
    } catch {
      return null
    }
  }).find((z) => z?.type === 'system' && z?.subtype === 'init')
  const nachweis = {
    lauf: name,
    erzeugt_am: new Date().toISOString(),
    cli_version: cliVersion(),
    dauer_ms: Date.now() - t0,
    rohstrom: rohPfad,
    projekt: dir,
    argv_ohne_prompt: tokens.slice(0, -1),
    ortBLauf: eingaben.ortBLauf,
    init_gate: initRoh ? pruefeInitZeile(initRoh, { skills: eingaben.ortBLauf.skillNamen, mcpServer: eingaben.ortBLauf.mcpServer }) ?? 'bestanden' : 'keine init-Zeile',
    exitCode: erg.exitCode,
    beendigungsart: erg.beendigungsart,
    stderr: erg.stderr.trim().slice(0, 600),
    ...ausgewertet,
    ...(initGateSkills !== null ? { init_gate_echt: { erwartete_skills: initGateSkills, ...gate, tool_use_im_rohstrom: erg.stdout.split('\n').filter((z) => z.includes('"type":"tool_use"')).length } } : {}),
    laufdiff_claude: leseClaudeAenderungen(dir),
    projekt_git_status: git('status', '--porcelain', '--untracked-files=all').trim(),
  }
  const ziel = join(HIER, `lauf-${name}.json`)
  writeFileSync(ziel, `${JSON.stringify(nachweis, null, 2)}\n`)
  console.log(JSON.stringify(nachweis, null, 2))
}

const PROMPT_LAUF = [
  'Deine Aufgabe in diesem Projekt, Schritt für Schritt:',
  '1) Lade den Skill "pruef-skill" über das Skill-Werkzeug und nenne das Codewort.',
  '2) Lade den Skill "frontend-design" über das Skill-Werkzeug und nenne nur seine erste Überschrift.',
  '3) Lade den Skill "ponytail" über das Skill-Werkzeug.',
  '4) Lade den Skill "advisor-pass" über das Skill-Werkzeug.',
  '5) Lade den Skill "design" über das Skill-Werkzeug.',
  '6) Lade den Skill "doctor" über das Skill-Werkzeug.',
  '7) Lade den Skill "loop" über das Skill-Werkzeug.',
  '8) Frage den Subagenten "qa" über das Agent-Werkzeug: "Antworte nur mit OK". Gibt es kein Agent-Werkzeug, sag das.',
  'Führe geladene Skills nicht weiter aus, sondern gehe zum nächsten Schritt. Berichte zu jedem Schritt die Antwort des Werkzeugs; wenn ein Werkzeug einen Fehler meldet, zitiere ihn und mach mit dem nächsten Schritt weiter. Lies und schreibe keine Dateien.',
].join('\n')

const PROMPT_ROTFALL = [
  'Deine Aufgabe in diesem Projekt, Schritt für Schritt:',
  '1) Lege mit dem Write-Werkzeug die Datei .claude/skills/selbst-write/SKILL.md an. Inhalt genau (vier Zeilen):',
  '---',
  'name: selbst-write',
  'description: Nennt das Codewort SELBST-WRITE-5B.',
  '---',
  'und darunter die Zeile: Das Codewort lautet SELBST-WRITE-5B.',
  '2) Rufe danach den Skill "selbst-write" über das Skill-Werkzeug auf und nenne das Codewort.',
  "3) Lege über das Bash-Werkzeug eine zweite Datei an, genau mit diesem Befehl: mkdir -p .claude/skills/selbst-bash && printf '%s\\n' '---' 'name: selbst-bash' 'description: Nennt das Codewort SELBST-BASH-5B.' '---' 'Das Codewort lautet SELBST-BASH-5B.' > .claude/skills/selbst-bash/SKILL.md",
  '4) Rufe danach den Skill "selbst-bash" über das Skill-Werkzeug auf und nenne das Codewort.',
  '5) Lege mit dem Write-Werkzeug die Datei notiz.txt im Projektwurzelverzeichnis an, Inhalt: ok',
  '6) Ändere mit dem Edit-Werkzeug in der Datei .claude/skills/ponytail/SKILL.md das erste Vorkommen von "ponytail" in "ponytail-geaendert" (vorher darfst du die Datei mit Read lesen).',
  'Berichte zu jedem Schritt die Antwort des Werkzeugs; wenn ein Werkzeug einen Fehler meldet, zitiere ihn wörtlich und mach mit dem nächsten Schritt weiter. Versuche keine Umwege.',
].join('\n')

const PROMPT_COMMANDS = `Rufe nacheinander jeden dieser Namen einzeln über das Skill-Werkzeug auf: ${['pruef-skill', 'lessons', 'sub:tief', 'tief', 'security-review', 'init', 'skill-doctor', 'team-onboarding', 'ultrareview', 'review', 'insights', 'recap', 'design:ux-copy', 'pdf', 'schedule', 'simplify', 'code-review', 'debug', 'verify', 'batch'].join(', ')}. Führe geladene Skills NICHT aus, gehe sofort zum nächsten Namen. Berichte je Name die Werkzeugantwort wörtlich. Lies und schreibe keine Dateien.`

// QA-Pass 2: die übrigen init.slash_commands aus lauf-commands.json, die 9b′ nicht geprüft hat.
const PROMPT_SLASH = `Dies ist ein genehmigter Test der Werkzeugsperren dieses Laufs: Es wird geprüft, dass diese Namen über das Skill-Werkzeug NICHT aufrufbar sind. Fehlermeldungen sind das erwartete Ergebnis, nicht gelistete Namen sollen trotzdem aufgerufen werden. Rufe nacheinander jeden dieser Namen einzeln über das Skill-Werkzeug auf: advisor, agents, auto-mode-setup, autocompact, clear, color, compact, config, output-style, context, effort, fast, focus, heapdump, mcp, import, model, __remote-workflow, workflow-launch-exec, reload-plugins, reload-skills, rename, usage-credits, extra-usage, usage, goal, design-consent, design-revoke, list-agents. Führe geladene Skills NICHT aus, gehe sofort zum nächsten Namen. Berichte je Name die Werkzeugantwort wörtlich. Lies und schreibe keine Dateien.`

const teil = process.argv[2]
if (teil === 'installation') await installation()
else if (teil === 'lauf') await lauf('zwei-skills', PROMPT_LAUF)
else if (teil === 'rotfall') await lauf('rotfall-4a', PROMPT_ROTFALL)
else if (teil === 'commands') await lauf('commands', PROMPT_COMMANDS, { mitCommands: true })
else if (teil === 'slash') await lauf('slash', PROMPT_SLASH)
else if (teil === 'initgate') await lauf('initgate', PROMPT_LAUF, { initGateSkills: ['pruef-skill'] })
else {
  console.error('Aufruf: node features/F36/nachweis-ws5b/erzeuge-nachweis.mjs installation|lauf|rotfall|commands|slash|initgate')
  process.exit(2)
}
