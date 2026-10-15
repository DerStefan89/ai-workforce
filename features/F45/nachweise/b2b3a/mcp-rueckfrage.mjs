#!/usr/bin/env node
/**
 * Datei: features/F45/nachweise/b2b3a/mcp-rueckfrage.mjs
 *
 * Zweck: Spike F45 B2b-3a (F-1011, F-980 (4)) — Mini-stdio-MCP-Server ohne Abhängigkeit (JSON-RPC 2.0, eine Nachricht
 * je Zeile). Zwei Werkzeuge:
 * - `rechte_pruefen`: Ziel von `--permission-prompt-tool`. Eingabe der CLI { tool_name, input, … }; Antwort als
 *   JSON-Text { behavior: 'allow', updatedInput } oder { behavior: 'deny', message }.
 * - `frage_stefan(frage, optionen)`: eine Entscheidungsfrage an Stefan; Antwort ist ein Text.
 * Antwortet programmgesteuert nach einer Richtliniendatei und protokolliert jeden Aufruf als NDJSON.
 *
 * Aufruf: `node mcp-rueckfrage.mjs <richtlinie.json> <protokoll.ndjson>` (von der CLI über --mcp-config gestartet).
 * Richtlinie: { rechte: { modus: 'allow'|'deny', warte_ms }, frage: { antwort, warte_ms } } — `antwort` ist ein
 * fester Text oder 'letzte_option' (dann die letzte übergebene Option).
 *
 * Wird aufgerufen von: features/F45/nachweise/b2b3a/spike-rueckfrage.mjs (über die CLI), nicht von `npm run check`.
 *
 * Wichtig: stdout gehört ausschließlich dem Protokoll — Diagnose nur ins Protokoll bzw. stderr.
 */
import { appendFileSync, readFileSync } from 'node:fs'
import { createInterface } from 'node:readline'

const [richtlinienPfad, protokollPfad] = process.argv.slice(2)
const richtlinie = JSON.parse(readFileSync(richtlinienPfad, 'utf8'))

/** @param {Record<string, unknown>} eintrag */
const protokolliere = (eintrag) => appendFileSync(protokollPfad, `${JSON.stringify({ zeit: new Date().toISOString(), ...eintrag })}\n`)

/** @param {unknown} nachricht */
const sende = (nachricht) => process.stdout.write(`${JSON.stringify(nachricht)}\n`)

const warte = (ms) => new Promise((fertig) => setTimeout(fertig, ms))

const WERKZEUGE = [
  {
    name: 'rechte_pruefen',
    description: 'Entscheidet über eine Rechte-Anfrage der CLI (permission prompt). Nur für --permission-prompt-tool.',
    inputSchema: { type: 'object', properties: { tool_name: { type: 'string' }, input: { type: 'object' }, tool_use_id: { type: 'string' } }, required: ['tool_name', 'input'] },
  },
  {
    name: 'frage_stefan',
    description:
      'Stellt Stefan (dem Auftraggeber) eine Entscheidungsfrage und liefert seine Antwort. Nutze das Werkzeug, wenn der Auftrag eine Entscheidung offenlässt, die nur Stefan treffen kann — rate nicht. Gib die Frage und 2–4 Optionen an.',
    inputSchema: {
      type: 'object',
      properties: { frage: { type: 'string' }, optionen: { type: 'array', items: { type: 'string' } } },
      required: ['frage', 'optionen'],
    },
  },
]

/**
 * Beantwortet einen tools/call nach der Richtlinie.
 * @param {string} name
 * @param {Record<string, unknown>} argumente
 * @returns {Promise<string>} Antworttext für content[0].text
 */
async function beantworte(name, argumente) {
  if (name === 'rechte_pruefen') {
    const { modus, warte_ms: warteMs = 0 } = richtlinie.rechte ?? { modus: 'deny' }
    await warte(warteMs)
    return JSON.stringify(
      modus === 'allow' ? { behavior: 'allow', updatedInput: argumente.input } : { behavior: 'deny', message: 'Stefan hat abgelehnt (Spike).' }
    )
  }
  if (name === 'frage_stefan') {
    const { antwort, warte_ms: warteMs = 0 } = richtlinie.frage ?? { antwort: 'keine Antwort' }
    await warte(warteMs)
    const optionen = Array.isArray(argumente.optionen) ? argumente.optionen : []
    return antwort === 'letzte_option' ? `Stefan entscheidet: ${optionen.at(-1) ?? 'keine Option übergeben'}` : antwort
  }
  throw new Error(`unbekanntes Werkzeug ${name}`)
}

const zeilen = createInterface({ input: process.stdin })
zeilen.on('line', async (zeile) => {
  if (!zeile.trim()) return
  let nachricht
  try {
    nachricht = JSON.parse(zeile)
  } catch (fehler) {
    protokolliere({ fehler: `kein JSON: ${fehler instanceof Error ? fehler.message : fehler}` })
    return
  }
  const { id, method: methode, params = {} } = nachricht
  protokolliere({ methode, id, params: methode === 'tools/call' ? params : undefined })
  if (id === undefined) return // Benachrichtigung (notifications/initialized u. a.)
  try {
    if (methode === 'initialize') {
      sende({ jsonrpc: '2.0', id, result: { protocolVersion: params.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: 'rueckfrage', version: '0.0.1' } } })
    } else if (methode === 'tools/list') {
      sende({ jsonrpc: '2.0', id, result: { tools: WERKZEUGE } })
    } else if (methode === 'tools/call') {
      const start = Date.now()
      const text = await beantworte(params.name, params.arguments ?? {})
      protokolliere({ antwort_auf: id, name: params.name, text, dauer_ms: Date.now() - start })
      sende({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text }] } })
    } else if (methode === 'ping') {
      sende({ jsonrpc: '2.0', id, result: {} })
    } else {
      sende({ jsonrpc: '2.0', id, error: { code: -32601, message: `Methode ${methode} unbekannt` } })
    }
  } catch (fehler) {
    protokolliere({ fehler: fehler instanceof Error ? fehler.message : String(fehler), id })
    sende({ jsonrpc: '2.0', id, error: { code: -32603, message: String(fehler) } })
  }
})
