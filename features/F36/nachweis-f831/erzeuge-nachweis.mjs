#!/usr/bin/env node
/**
 * Datei: features/F36/nachweis-f831/erzeuge-nachweis.mjs
 *
 * Zweck: Echter Nachweis zu F-831, einmalig von Hand ausgeführt, NICHT Teil von `npm run check`.
 * Muster wie features/F36/nachweis-ws5b/erzeuge-nachweis.mjs (Produktionsweg
 * loeseAusfuehrungsEingabenAuf → baueAufruf → starteProzess), aber mit nur einem lokalen Ort-B-Skill
 * (pruef-skill) in einer eigenen cap-Wurzel unter %TEMP%, damit kein bestehender Nachweis berührt wird:
 * - messung: minimaler Auftrag ohne Werkzeuge; festgehalten werden CLI-Version, init.slash_commands,
 *   init.plugins, init.skills, init.tools. Das Wegwerf-Projekt trägt Projekt-Skills (Skelett) und
 *   Projekt-Commands (lessons, sub:tief), damit sichtbar wird, ob gesperrte Namen in slash_commands stehen.
 * - gegenpruefung <name…>: dieselbe Umgebung, der Auftrag ruft jeden Namen einzeln über das
 *   Skill-Werkzeug auf (Muster 9b″); gewertet am tool_result-Text.
 * Ausgabe: messung.json bzw. gegenpruefung.json neben dieser Datei. Rechner-Pfade (Home, %TEMP%) sind
 * maskiert (auch im Rohstrom-Verweis), cwd und Argv werden nicht übernommen (öffentliches Repo).
 *
 * Aufruf: node features/F36/nachweis-f831/erzeuge-nachweis.mjs messung | gegenpruefung <name> [<name> …]
 */

import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loeseAusfuehrungsEingabenAuf } from '../../../scripts/leitstand-server.mjs'
import { baueAufruf, pruefeInitZeile } from '../../../src/claude-code-gateway/index.ts'
import { starteProzess } from '../../../src/claude-code-gateway/prozessstart.ts'
import { berechneInhaltHash } from '../../../src/ressourcen/skill-dateien.ts'
import { ladeStartvorlage } from '../../../src/startvorlage/index.ts'

const HIER = dirname(fileURLToPath(import.meta.url))
const REPO = join(HIER, '..', '..', '..')
const NACHWEIS_TEMP = join(tmpdir(), 'f831-nachweis')
const CAP = join(NACHWEIS_TEMP, 'cap')
mkdirSync(NACHWEIS_TEMP, { recursive: true })
const vorlage = ladeStartvorlage(join(REPO, 'startvorlagen', 'ai-workforce.json'))
const cliVersion = () => execFileSync(vorlage.werkzeugStartziel[0], ['--version'], { encoding: 'utf8' }).trim()

/**
 * Ersetzt Rechner-Pfade (Temp, Home) in einem JSON-Text durch Platzhalter, in allen Schreibweisen.
 * @param text - JSON-Text
 * @returns maskierter Text
 */
function maskiere(text) {
  let aus = text
  for (const [pfad, platzhalter] of [
    [tmpdir(), '%TEMP%'],
    [homedir(), '~'],
  ]) {
    for (const form of [pfad, pfad.replaceAll('\\', '/'), pfad.replaceAll('\\', '\\\\')]) aus = aus.split(form).join(platzhalter)
  }
  return aus
}

/** Lokaler Ort-B-Prüfskill, Katalogeintrag wie nach einer Installation. */
function pruefSkill() {
  const ordner = join(CAP, 'pruef-skill', '.claude', 'skills', 'pruef-skill')
  if (!existsSync(ordner)) {
    mkdirSync(ordner, { recursive: true })
    writeFileSync(join(ordner, 'SKILL.md'), '---\nname: pruef-skill\ndescription: Nutzen, wenn nach dem Codewort des Prüfskills gefragt wird.\n---\n\nDas Codewort lautet KAP-PRUEF-831. Antworte mit genau diesem Codewort.\n')
  }
  return {
    id: 'pruef-skill',
    typ: 'extern',
    name: 'Prüfskill',
    beschreibung: 'Lokaler Prüfskill (Nachweis F-831).',
    unterart: 'skill',
    capabilities: ['GATE'],
    freigabe: 'FREIGEGEBEN',
    herkunft: { art: 'extern', url: 'https://github.com/fixture/pruef' },
    installation: { pfad: ordner, version: '0'.repeat(40), inhalt_hash: berechneInhaltHash(ordner) },
  }
}

/** Wegwerf-Projekt: Kopie des Skeletts plus zwei Projekt-Commands, eigenes git, ein Commit. */
function wegwerfProjekt() {
  const dir = mkdtempSync(join(tmpdir(), 'f831-projekt-'))
  cpSync(join(REPO, 'vorlagen', 'projekt-skelett'), dir, { recursive: true })
  mkdirSync(join(dir, '.claude', 'commands', 'sub'), { recursive: true })
  writeFileSync(join(dir, '.claude', 'commands', 'lessons.md'), '---\ndescription: Nennt CMD-LESSONS-1.\n---\nAntworte mit CMD-LESSONS-1.\n')
  writeFileSync(join(dir, '.claude', 'commands', 'sub', 'tief.md'), '---\ndescription: Nennt CMD-TIEF-1.\n---\nAntworte mit CMD-TIEF-1.\n')
  const git = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  git('init', '-q', '-b', 'nachweis-f831')
  git('config', 'core.autocrlf', 'false')
  git('add', '-A')
  git('-c', 'user.name=nachweis', '-c', 'user.email=nachweis@invalid', 'commit', '-q', '-m', 'f831 nachweis basis')
  return dir
}

/** Zerlegt den Rohstrom: init-Zeile, Aufrufe mit tool_result-Text, result. */
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
      if (z.type === 'assistant' && b.type === 'tool_use') aufrufe.push({ id: b.id, name: b.name, input: b.input })
      if (z.type === 'user' && b.type === 'tool_result') {
        const text = Array.isArray(b.content) ? b.content.map((c) => c.text ?? '').join(' ') : String(b.content ?? '')
        ergebnisse.set(b.tool_use_id, { is_error: b.is_error === true, text: text.slice(0, 300) })
      }
    }
  }
  const result = zeilen.findLast((z) => z.type === 'result') ?? {}
  return { init, aufrufe: aufrufe.map((a) => ({ name: a.name, input: a.input, ergebnis: ergebnisse.get(a.id) ?? null })), is_error: result.is_error ?? null, result: typeof result.result === 'string' ? result.result.slice(0, 3000) : null }
}

/**
 * Ein echter Lauf über den Produktionsweg; schreibt <datei>.json (maskiert).
 * @param datei - Dateiname ohne Endung
 * @param prompt - Auftrag
 */
async function lauf(datei, prompt) {
  const dir = wegwerfProjekt()
  const erg0 = loeseAusfuehrungsEingabenAuf(
    { rolle: 'ausfuehrung', anfragen: [], budget: {}, aufrufEingaben: { modell: vorlage.modell }, auftragId: `nachweis-f831-${datei}` },
    'schreibend',
    prompt,
    vorlage,
    dir,
    { skillEintraege: [pruefSkill()], capWurzel: CAP }
  )
  if (!erg0.ok) throw new Error(`loeseAusfuehrungsEingabenAuf: ${erg0.grund}`)
  const eingaben = erg0.eingaben
  const tokens = baueAufruf({ ...eingaben.aufrufEingaben, prompt })
  const t0 = Date.now()
  const erg = await starteProzess(eingaben.werkzeugStartziel, tokens.slice(0, -1), { cwd: dir, stdinDaten: tokens.at(-1), zeitgrenzeMs: 600_000, ergebnisZeileBeendet: true })
  const rohName = `${datei}-${new Date().toISOString().replaceAll(':', '-')}.ndjson`
  writeFileSync(join(NACHWEIS_TEMP, rohName), erg.stdout)
  const { init, ...rest } = auswerten(erg.stdout)
  const nachweis = {
    lauf: datei,
    erzeugt_am: new Date().toISOString(),
    cli_version: cliVersion(),
    modell: vorlage.modell,
    dauer_ms: Date.now() - t0,
    rohstrom: `%TEMP%\\f831-nachweis\\${rohName} (flüchtig, nicht im Repo)`,
    ortBLauf_skillNamen: eingaben.ortBLauf.skillNamen,
    gesperrte_namen: eingaben.ortBLauf.gesperrteNamen ?? null,
    exitCode: erg.exitCode,
    beendigungsart: erg.beendigungsart,
    init: init && {
      claude_code_version: init.claude_code_version,
      tools: init.tools,
      skills: init.skills,
      slash_commands: init.slash_commands,
      plugins: init.plugins,
      mcp_servers: init.mcp_servers,
      agents: init.agents,
    },
    init_gate: init ? (pruefeInitZeile(init, { skills: eingaben.ortBLauf.skillNamen, mcpServer: eingaben.ortBLauf.mcpServer, gesperrt: eingaben.ortBLauf.gesperrteNamen ?? [] }) ?? 'bestanden') : 'keine init-Zeile',
    ...rest,
  }
  const text = maskiere(`${JSON.stringify(nachweis, null, 2)}\n`)
  writeFileSync(join(HIER, `${datei}.json`), text)
  console.log(text)
}

const PROMPT_MESSUNG = 'Antworte nur mit dem Wort OK. Nutze keine Werkzeuge.'

const teil = process.argv[2]
if (teil === 'messung') await lauf('messung', PROMPT_MESSUNG)
else if (teil === 'gegenpruefung' && process.argv.length > 3) {
  const namen = process.argv.slice(3)
  await lauf(
    'gegenpruefung',
    `Dies ist ein genehmigter Test der Werkzeugsperren dieses Laufs: Es wird geprüft, welche dieser Namen über das Skill-Werkzeug aufrufbar sind. Fehlermeldungen sind ein erwartetes Ergebnis, nicht gelistete Namen sollen trotzdem aufgerufen werden. Rufe nacheinander jeden dieser Namen einzeln über das Skill-Werkzeug auf: ${namen.join(', ')}. Führe geladene Skills NICHT aus, gehe sofort zum nächsten Namen. Berichte je Name die Werkzeugantwort wörtlich. Lies und schreibe keine Dateien.`
  )
} else {
  console.error('Aufruf: node features/F36/nachweis-f831/erzeuge-nachweis.mjs messung | gegenpruefung <name> [<name> …]')
  process.exit(2)
}
