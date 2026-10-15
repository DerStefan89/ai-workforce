// Spike F45 B2b-2b (F-820, F-1113 (2)): trägt `claude --json-schema` das qa-Schema ergebnis-qa — mit einem realistischen
// Auftrag MIT Akzeptanzkriterien, damit 'testfaelle' nicht leer bleibt? Muster ../b2b2a/spike-reviewer-schema.mjs: Argv wie
// baueAufruf für einen lesenden Werkzeugsatz, Schema über baueClaudeJsonSchema (ohne $schema/$id), Prompt über stdin wie
// starteGateway (F-642). Der Prompt ist der Produkttext baueQaAuftragstext (src/qa) plus die drei Eingaben, die der
// qa-Schritt im Ablauf bekommt (Änderungsübersicht, Prüfergebnis, Review-Ergebnis) — als Text nachgebildet.
// Aufruf: CLAUDE_EXE=<pfad zu claude.exe> node spike-qa-schema.mjs <repo> <ausgabe.ndjson> <modell>
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { baueClaudeJsonSchema } from '../../../../src/claude-code-gateway/index.ts'
import { baueQaAuftragstext, validiereErgebnisQa } from '../../../../src/qa/index.ts'
import { schwaerze } from '../b2b1b/schwaerze.mjs'

const [repo, aus, modell] = process.argv.slice(2)
const schema = baueClaudeJsonSchema(readFileSync(`${repo}/schemas/ergebnis-qa.schema.json`, 'utf8'))
const akzeptanzkriterien = [
  { id: 'AK1', text: 'formatiereBetrag(1234) liefert "12,34 €"; formatiereBetrag(5) liefert "0,05 €".' },
  { id: 'AK2', text: 'Negative Beträge tragen ein führendes Minus: formatiereBetrag(-50) liefert "-0,50 €".' },
  { id: 'AK3', text: 'Eine ungültige Eingabe (NaN, Infinity, keine ganze Zahl) wirft einen Fehler mit lesbarer Meldung statt eines Textes.' },
]
const auftrag = 'Neue Funktion formatiereBetrag(cent: number): string in src/spike/betrag.ts — formatiert einen Betrag in Cent für die Anzeige im Haushaltsbuch (Komma als Dezimaltrenner, Euro-Zeichen am Ende).'
const eingaben = [
  'Eingabe 1 — Änderungsübersicht des Baus (Spike, nicht im Repo): neue Datei src/spike/betrag.ts',
  '```ts',
  'export function formatiereBetrag(cent: number): string {',
  '  const euro = Math.floor(cent / 100)',
  "  const rest = String(cent % 100).padStart(2, '0')",
  '  return `${euro},${rest} €`',
  '}',
  '```',
  'Eingabe 2 — Prüfergebnis des Baus: GRÜN (Exit 0); es gibt keinen Test für betrag.ts.',
  'Eingabe 3 — Ergebnis des Reviews: {"urteil":"BEREIT_NACH_KORREKTUR","befunde":[{"id":"B1","schwere":"MITTEL","fundstelle":"src/spike/betrag.ts","zusammenfassung":"Kein Test für formatiereBetrag.","beleg":"Keine Testdatei in der Änderungsübersicht.","korrekturrichtung":"Unit-Test mit den Beispielen aus dem Auftrag ergänzen.","evidenz":"confirmed"}],"empfehlung":"Test ergänzen."}',
  '',
  'Die Datei src/spike/betrag.ts existiert nur in dieser Änderungsübersicht, nicht im Arbeitsordner. Halte die Prüfung kurz (höchstens 3 Werkzeugaufrufe).',
].join('\n')
const prompt = [baueQaAuftragstext(auftrag, akzeptanzkriterien, ['Keine Währungsumrechnung, keine Tausendertrennzeichen.']), '', eingaben].join('\n')
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
  writeFileSync(aus, schwaerze(out))  // Schwärzung beim Schreiben (HOME, TEMP, PIPE)
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
  if (res.structured_output) console.log('validiereErgebnisQa', JSON.stringify(validiereErgebnisQa(res.structured_output)))
})
