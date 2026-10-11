#!/usr/bin/env node
/**
 * Datei: features/F45/nachweise/b1b1/powershell-eingabe.mjs
 *
 * Zweck: F45 B1b-1 Nachtrag (F-1042) — belegt die echte Hook-Eingabe des PowerShell-Werkzeugs von Claude Code
 * und die Wirkung des Root-commit-guard darauf, in einem echten `claude -p`-Lauf gegen einen Wegwerf-Ordner
 * unter os.tmpdir() (nie gegen ein Projekt von Stefan). Das Wegwerf-Projekt trägt eine settings.json mit
 * PreToolUse-Matcher "PowerShell|Bash" und zwei Hooks: protokoll.cjs (schreibt die rohe Hook-Eingabe nach
 * hook-eingaben.jsonl, entscheidet nichts) und eine dateiweise Kopie von .claude/hooks/commit-guard.cjs.
 * Anweisung: PowerShell Get-ChildItem (grün), PowerShell Remove-Item -Recurse -Force (rot), Bash echo (Vergleich).
 * Schreibt zaehlung-powershell.json (Hook-Eingaben, Werkzeugaufrufe, Ergebnis) und rohstrom-powershell.json
 * (lokal, gitignoriert) neben dieses Skript; die Wegwerf-Wurzel wird danach entfernt.
 *
 * Wird aufgerufen von: Hand (`node features/F45/nachweise/b1b1/powershell-eingabe.mjs`), nicht von `npm run check`.
 */

import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { leseErgebnisobjekt, leseVerbrauch, WORKFORCE_LAUF_UMGEBUNG } from '../../../../src/claude-code-gateway/index.ts'
import { fuehreUmgebungZusammen } from '../../../../src/claude-code-gateway/prozessstart.ts'
import { ladeStartvorlage } from '../../../../src/startvorlage/index.ts'
import { raeumeVerzeichnis } from '../../../../scripts/_aufraeumen.ts'

const HIER = import.meta.dirname
const INSTALLATION = join(HIER, '..', '..', '..', '..')
const STARTZIEL = ladeStartvorlage(join(INSTALLATION, 'startvorlagen', 'ai-workforce.json')).werkzeugStartziel
const wurzel = mkdtempSync(join(tmpdir(), 'b1b1-ps-'))
const projekt = join(wurzel, 'projekt')
const hooks = join(projekt, '.claude', 'hooks')
mkdirSync(hooks, { recursive: true })
mkdirSync(join(projekt, 'ziel', 'unter'), { recursive: true })
writeFileSync(join(projekt, 'ziel', 'unter', 'datei.txt'), 'x\n')
const protokollPfad = join(projekt, 'hook-eingaben.jsonl')
writeFileSync(
  join(hooks, 'protokoll.cjs'),
  `let e="";process.stdin.on("data",d=>e+=d);process.stdin.on("end",()=>{require("fs").appendFileSync(${JSON.stringify(protokollPfad)},e.replace(/\\r?\\n/g," ")+"\\n");process.exit(0)});\n`
)
copyFileSync(join(INSTALLATION, '.claude', 'hooks', 'commit-guard.cjs'), join(hooks, 'commit-guard.cjs'))
writeFileSync(
  join(projekt, '.claude', 'settings.json'),
  `${JSON.stringify({ hooks: { PreToolUse: [{ matcher: 'PowerShell|Bash', hooks: [{ type: 'command', command: 'node .claude/hooks/protokoll.cjs' }, { type: 'command', command: 'node .claude/hooks/commit-guard.cjs' }] }] } }, null, 2)}\n`
)

const prompt = [
  'Testlauf. Führe genau diese drei Schritte nacheinander aus, ohne Rückfrage. Wird ein Schritt abgelehnt, mache mit dem nächsten weiter und versuche keinen anderen Weg.',
  '1. PowerShell-Werkzeug: Get-ChildItem',
  '2. PowerShell-Werkzeug: Remove-Item ziel -Recurse -Force',
  '3. Bash-Werkzeug: echo hallo',
  'Antworte danach mit einer Zeile je Schritt: angenommen oder abgelehnt.',
].join('\n')
const argv = ['--model', 'claude-haiku-4-5', '--output-format', 'stream-json', '--verbose', '--setting-sources', 'project', '--tools', 'PowerShell,Bash', '--allowedTools', 'PowerShell,Bash', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '-p']
const umgebung = fuehreUmgebungZusammen(process.env, { ...WORKFORCE_LAUF_UMGEBUNG, CLAUDE_CODE_USE_POWERSHELL_TOOL: '1' })
const start = Date.now()
const lauf = spawnSync(STARTZIEL[0], [...STARTZIEL.slice(1), ...argv], { cwd: projekt, input: prompt, env: umgebung, encoding: 'utf8', timeout: 240000, maxBuffer: 64 * 1024 * 1024 })
const dauerMs = Date.now() - start
writeFileSync(join(HIER, 'rohstrom-powershell.json'), JSON.stringify({ werkzeugStartziel: STARTZIEL, argv, prompt, stdout: lauf.stdout, stderr: lauf.stderr, exitCode: lauf.status }))

const aufrufe = []
const ergebnisse = new Map()
for (const text of (lauf.stdout ?? '').split('\n')) {
  let z
  try {
    z = JSON.parse(text)
  } catch {
    continue
  }
  for (const b of z?.message?.content ?? []) {
    if (z.type === 'assistant' && b.type === 'tool_use') aufrufe.push({ id: b.id, name: b.name, eingabe: b.input })
    if (z.type === 'user' && b.type === 'tool_result') ergebnisse.set(b.tool_use_id, { is_error: b.is_error === true, text: (typeof b.content === 'string' ? b.content : JSON.stringify(b.content)).slice(0, 300) })
  }
}
const hookEingaben = existsSync(protokollPfad)
  ? readFileSync(protokollPfad, 'utf8')
      .split('\n')
      .filter((zeile) => zeile.trim().length > 0)
      .map((zeile) => {
        const e = JSON.parse(zeile)
        return { hook_event_name: e.hook_event_name, tool_name: e.tool_name, tool_input: e.tool_input, felder: Object.keys(e).sort() }
      })
  : []
const ergebnis = leseErgebnisobjekt(lauf.stdout ?? '')
const zaehlung = {
  modell: 'claude-haiku-4-5',
  exitCode: lauf.status,
  dauer_ms_wand: dauerMs,
  verbrauch: leseVerbrauch(ergebnis),
  hook_eingaben: hookEingaben,
  werkzeugaufrufe: aufrufe.map((a) => ({ ...a, ergebnis: ergebnisse.get(a.id) ?? null })),
  ordner_ziel_existiert_noch: existsSync(join(projekt, 'ziel', 'unter', 'datei.txt')),
  permission_denials: ergebnis?.permission_denials ?? null,
  ergebnistext: ergebnis?.result ?? null,
}
writeFileSync(join(HIER, 'zaehlung-powershell.json'), `${JSON.stringify(zaehlung, null, 2)}\n`)
console.log(JSON.stringify(zaehlung, null, 2))
raeumeVerzeichnis(wurzel)
