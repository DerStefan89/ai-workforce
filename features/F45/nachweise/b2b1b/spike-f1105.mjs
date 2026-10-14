// Spike F-1105: traegt `claude -p --json-schema` das Advisor-Schema real? Argv wie baueAufruf (lesender Werkzeugsatz).
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
const [repo, aus, modell] = process.argv.slice(2)
const roh = JSON.parse(readFileSync(`${repo}/schemas/ergebnis-architecture-advisor.schema.json`, "utf8")); delete roh.$schema; delete roh.$id; const schema = JSON.stringify(roh)
const plan = [
  'Plan v1 (Spike): Neue Funktion zaehleWoerter(text) in src/workflow/index.ts, die Wörter eines Textes zählt.',
  'Sie wird nirgends aufgerufen. Kein Test. Datei-Header bleibt unverändert. Ein globaler Zähler (let) merkt sich die Gesamtzahl über alle Aufrufe.',
].join('\n')
const prompt = [
  "Du bist als Rolle 'architecture-advisor' verantwortlich für die Prüfung eines Plans VOR dem Bau. Nur lesende Werkzeuge (Glob/Grep/Read).",
  'Halte die Prüfung kurz (höchstens 3 Werkzeugaufrufe). Antworte mit dem strukturierten Ergebnis nach dem vorgegebenen Schema.',
  'Urteil: FREIGEGEBEN nur ohne Befunde; FREIGEGEBEN_MIT_AUFLAGEN oder UEBERARBEITEN mit mindestens einem Befund.',
  '', 'Plan:', plan,
].join('\n')
const argv = ['--model', modell, '--output-format', 'stream-json', '--verbose', '--setting-sources', 'project',
  '--tools', 'Read,Grep,Glob', '--allowedTools', 'Read,Grep,Glob', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}',
  '--json-schema', schema, '-p', prompt]
const start = Date.now()
const kind = spawn(process.env.CLAUDE_EXE, argv, { cwd: repo, shell: false, stdio: ['ignore', 'pipe', 'pipe'] })
let out = '', err = ''
kind.stdout.on('data', (d) => { out += d })
kind.stderr.on('data', (d) => { err += d })
kind.on('close', (code) => {
  writeFileSync(aus, out)
  console.log('exit', code, 'dauer_ms', Date.now() - start, 'stderr', err.slice(0, 500))
  const zeilen = out.split('\n').filter(Boolean).map((z) => { try { return JSON.parse(z) } catch { return null } }).filter(Boolean)
  const res = zeilen.reverse().find((z) => z.type === 'result')
  if (!res) { console.log('KEIN result'); return }
  console.log('result-Schluessel', Object.keys(res).join(','))
  console.log('subtype', res.subtype, 'is_error', res.is_error, 'kosten', res.total_cost_usd)
  console.log('structured_output', JSON.stringify(res.structured_output, null, 1))
  console.log('result(text)', String(res.result).slice(0, 400))
})
