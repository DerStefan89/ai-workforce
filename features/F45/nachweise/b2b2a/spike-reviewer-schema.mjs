// Spike F45 B2b-2a (F-1085 (2)): trägt `claude --json-schema` das Review-Schema ergebnis-code-reviewer?
// Muster spike-f1105-stdin.mjs (B2b-1b-1): Argv wie baueAufruf für einen lesenden Werkzeugsatz, Schema über
// baueClaudeJsonSchema (ohne $schema/$id), Prompt über stdin wie starteGateway (F-642), Review-Policy aus src/review-policy.
// Aufruf: CLAUDE_EXE=<pfad zu claude.exe> node spike-reviewer-schema.mjs <repo> <ausgabe.ndjson> <modell>
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { baueClaudeJsonSchema } from '../../../../src/claude-code-gateway/index.ts'
import { baueReviewPolicyBlock, pruefeReviewErgebnis } from '../../../../src/review-policy/index.ts'
import { schwaerze } from '../b2b1b/schwaerze.mjs'

const [repo, aus, modell] = process.argv.slice(2)
const schema = baueClaudeJsonSchema(readFileSync(`${repo}/schemas/ergebnis-code-reviewer.schema.json`, 'utf8'))
const diff = [
  'Änderung (Spike, nicht im Repo): neue Datei src/spike/teile.ts',
  '```ts',
  'export function teile(a: number, b: number): number {',
  '  return a / b',
  '}',
  'export function mittelwert(werte: number[]): number {',
  '  let summe = 0',
  '  for (let i = 0; i <= werte.length; i++) summe += werte[i]',
  '  return teile(summe, werte.length)',
  '}',
  '```',
  'Kein Test. Aufrufer: keiner.',
].join('\n')
const prompt = [
  "Du bist als Rolle 'code-reviewer' verantwortlich für den Review nach dem Bau. Nur lesende Werkzeuge (Glob/Grep/Read).",
  'Halte die Prüfung kurz (höchstens 3 Werkzeugaufrufe). Antworte mit dem strukturierten Ergebnis nach dem vorgegebenen Schema.',
  'Der Auftrag trägt keine strukturierten Akzeptanzkriterien: ak_urteile ist ein leeres Array.',
  '',
  baueReviewPolicyBlock(),
  '',
  diff,
].join('\n')
const argv = ['--model', modell, '--output-format', 'stream-json', '--verbose', '--setting-sources', 'project',
  '--tools', 'Read,Grep,Glob', '--allowedTools', 'Read,Grep,Glob', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}',
  '--json-schema', schema, '-p']  // Prompt über stdin wie starteGateway (F-642)
const start = Date.now()
const kind = spawn(process.env.CLAUDE_EXE, argv, { cwd: repo, shell: false, stdio: ['pipe', 'pipe', 'pipe'] })
kind.stdin.end(prompt)
let out = ''
let err = ''
kind.stdout.on('data', (d) => { out += d })
kind.stderr.on('data', (d) => { err += d })
kind.on('close', (code) => {
  writeFileSync(aus, schwaerze(out))  // Schwärzung beim Schreiben (HOME, PIPE)
  console.log('exit', code, 'dauer_ms', Date.now() - start, 'stderr', schwaerze(err).slice(0, 500))
  const zeilen = out.split('\n').filter(Boolean).map((z) => { try { return JSON.parse(z) } catch { return null } }).filter(Boolean)
  const init = zeilen.find((z) => z.type === 'system' && z.subtype === 'init')
  if (init) console.log('init.tools', (init.tools ?? []).join(','), 'version', init.claude_code_version)
  const res = zeilen.reverse().find((z) => z.type === 'result')
  if (!res) { console.log('KEIN result'); return }
  console.log('subtype', res.subtype, 'is_error', res.is_error, 'kosten', res.total_cost_usd, 'turns', res.num_turns)
  console.log('structured_output', JSON.stringify(res.structured_output, null, 1))
  let ausText = null
  try { ausText = JSON.parse(String(res.result)) } catch { /* result ist kein JSON */ }
  console.log('result == structured_output', JSON.stringify(ausText) === JSON.stringify(res.structured_output))
  if (res.structured_output) console.log('pruefeReviewErgebnis', JSON.stringify(pruefeReviewErgebnis(res.structured_output)))
})
