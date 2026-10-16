#!/usr/bin/env node
/**
 * Datei: scripts/leitstand/rueckfrage-mcp.mjs
 *
 * Zweck: stdio-MCP-Server des Rückfrage-Kanals je Lauf (F45 B2b-3b-1a, features/F45/plan-b2b3b1a-v2.md §2; Muster Spike
 * features/F45/nachweise/b2b3a/mcp-rueckfrage.mjs). Ohne Abhängigkeiten, JSON-RPC 2.0 eine Nachricht je Zeile. Zwei Werkzeuge:
 * - `rechte_pruefen` — Ziel von `--permission-prompt-tool`. Eingabe der CLI { tool_name, input, tool_use_id }; Antwort als
 *   JSON-Text { behavior: 'allow', updatedInput } oder { behavior: 'deny', message }. `updatedInput` ist immer die eigene
 *   Kopie der Eingabe — der Leitstand kann den Befehl nicht verändern.
 * - `frage_stefan(frage, optionen)` — Entscheidungsfrage an Stefan; Antwort ist sein Text oder „keine Antwort von Stefan“.
 * Das Skript entscheidet nichts selbst: es fragt den Leitstand über die Loopback-Route mit dem Token des Laufs und wartet per
 * Long-Poll. Jeder Fehler (Umgebung fehlt, Leitstand nicht erreichbar, Token abgelehnt, kaputte Antwort, Frist) ⇒ deny bzw.
 * „keine Antwort von Stefan“, nie allow (fail closed).
 *
 * Umgebung (aus dem `env` des Servers in der mcp-config, src/rueckfrage ergaenzeRueckfrageAufruf):
 * WORKFORCE_RUECKFRAGE_URL (Basis), WORKFORCE_RUECKFRAGE_TOKEN, WORKFORCE_RUECKFRAGE_FRIST_MS (Gesamtfrist je Rückfrage).
 *
 * Wird aufgerufen von: der Claude-Code-CLI über --mcp-config (erst ab B2b-3b-2 eingeschaltet), scripts/check-f45-b2b3b1-rueckfrage.mjs.
 *
 * Wichtig: stdout gehört ausschließlich dem Protokoll — Diagnose nur auf stderr.
 */
import { request } from 'node:http'
import { createInterface } from 'node:readline'

const URL_BASIS = process.env.WORKFORCE_RUECKFRAGE_URL ?? ''
const TOKEN = process.env.WORKFORCE_RUECKFRAGE_TOKEN ?? ''
const FRIST_MS = Number(process.env.WORKFORCE_RUECKFRAGE_FRIST_MS ?? 660000)
/** Zeitgrenze je HTTP-Anfrage (länger als das Poll-Fenster des Leitstands). */
const ANFRAGE_ZEITGRENZE_MS = 60000
const KEINE_ANTWORT = 'keine Antwort von Stefan'
/** Mindestabstand zwischen zwei Polls — antwortet der Leitstand sofort mit { offen: true }, kreist die Schleife nicht (qa 13). */
const MIN_POLL_ABSTAND_MS = 200

/** Schreibt eine JSON-RPC-Nachricht als eine Zeile auf stdout (einziger stdout-Schreiber). @param {unknown} nachricht */
const sende = (nachricht) => process.stdout.write(`${JSON.stringify(nachricht)}\n`)
/** Diagnose nur auf stderr — stdout gehört dem Protokoll. @param {string} text */
const diagnose = (text) => process.stderr.write(`[rueckfrage-mcp] ${text}\n`)

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
    inputSchema: { type: 'object', properties: { frage: { type: 'string' }, optionen: { type: 'array', items: { type: 'string' } } }, required: ['frage', 'optionen'] },
  },
]

/**
 * Eine POST-Anfrage an den Leitstand.
 * @param {string} pfad - Pfad unter der Basis
 * @param {unknown} body - JSON-Body
 * @returns {Promise<{ status: number, daten: unknown }>} wirft bei Netzfehler, Zeitgrenze oder kaputtem JSON
 */
function post(pfad, body) {
  return new Promise((fertig, fehler) => {
    // Basis + Pfad als Text: ein Präfix der Basis (z. B. /api/projekte/<id>) bleibt erhalten.
    const ziel = new URL(`${URL_BASIS.replace(/\/+$/, '')}${pfad}`)
    const text = JSON.stringify(body)
    const req = request(ziel, { method: 'POST', headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(text), authorization: `Bearer ${TOKEN}` }, timeout: ANFRAGE_ZEITGRENZE_MS }, (res) => {
      let roh = ''
      res.setEncoding('utf8')
      res.on('data', (stueck) => {
        roh += stueck
      })
      res.on('end', () => {
        try {
          fertig({ status: res.statusCode ?? 0, daten: JSON.parse(roh) })
        } catch (e) {
          fehler(new Error(`Antwort kein JSON (Status ${res.statusCode}): ${e instanceof Error ? e.message : e}`))
        }
      })
      res.on('error', fehler)
    })
    req.on('timeout', () => req.destroy(new Error('Zeitgrenze der Anfrage')))
    req.on('error', fehler)
    req.end(text)
  })
}

/**
 * Fragt den Leitstand und wartet per Long-Poll auf die Entscheidung.
 * @param {Record<string, unknown>} anfrage - { art: 'rechte' | 'frage', … }
 * @returns {Promise<Record<string, unknown> | null>} Entscheidung, { ungueltig: grund } bei 400 (Anfrage nicht gestellt), oder null bei
 *   jedem anderen Fehler
 */
async function frageLeitstand(anfrage) {
  if (URL_BASIS === '' || TOKEN === '') {
    diagnose('Umgebung fehlt (WORKFORCE_RUECKFRAGE_URL/TOKEN)')
    return null
  }
  const ende = Date.now() + (Number.isFinite(FRIST_MS) && FRIST_MS > 0 ? FRIST_MS : 660000)
  try {
    const erst = await post('/api/rueckfrage/anfrage', anfrage)
    const daten = /** @type {Record<string, unknown>} */ (erst.daten ?? {})
    if (erst.status === 200 && typeof daten.entscheidung === 'object' && daten.entscheidung !== null) return /** @type {Record<string, unknown>} */ (daten.entscheidung)
    // qa 9: 400 heißt „Anfrage ungültig, Stefan nicht gefragt“ — eigene Meldung statt „keine Antwort“.
    if (erst.status === 400) return { ungueltig: typeof daten.grund === 'string' ? daten.grund : 'Anfrage ungültig' }
    if (erst.status !== 202 || typeof daten.id !== 'string') {
      diagnose(`Anfrage abgelehnt (Status ${erst.status})`)
      return null
    }
    while (Date.now() < ende) {
      const pollStart = Date.now()
      const poll = await post(`/api/rueckfrage/anfrage/${encodeURIComponent(daten.id)}/warten`, {})
      const p = /** @type {Record<string, unknown>} */ (poll.daten ?? {})
      if (poll.status !== 200) {
        diagnose(`Warten abgelehnt (Status ${poll.status})`)
        return null
      }
      if (typeof p.entscheidung === 'object' && p.entscheidung !== null) return /** @type {Record<string, unknown>} */ (p.entscheidung)
      if (p.offen !== true) return null
      const rest = MIN_POLL_ABSTAND_MS - (Date.now() - pollStart)
      if (rest > 0) await new Promise((fertig) => setTimeout(fertig, rest))
    }
    diagnose('Frist erreicht')
    return null
  } catch (fehler) {
    diagnose(`Leitstand nicht erreichbar: ${fehler instanceof Error ? fehler.message : String(fehler)}`)
    return null
  }
}

/**
 * Beantwortet einen tools/call.
 * @param {string} name - Werkzeugname
 * @param {Record<string, unknown>} argumente - arguments
 * @param {Record<string, unknown>} meta - _meta der Anfrage
 * @returns {Promise<string>} Antworttext für content[0].text
 */
async function beantworte(name, argumente, meta) {
  if (name === 'rechte_pruefen') {
    const input = argumente.input
    const entscheidung = await frageLeitstand({ art: 'rechte', tool_name: argumente.tool_name, input, tool_use_id: typeof argumente.tool_use_id === 'string' ? argumente.tool_use_id : null })
    if (entscheidung?.behavior === 'allow' && typeof input === 'object' && input !== null) return JSON.stringify({ behavior: 'allow', updatedInput: structuredClone(input) })
    const message =
      entscheidung?.behavior === 'deny' && typeof entscheidung.message === 'string'
        ? entscheidung.message
        : typeof entscheidung?.ungueltig === 'string'
          ? `Anfrage ungültig — nicht an Stefan gestellt: ${entscheidung.ungueltig}`
          : 'Keine Entscheidung vom Leitstand — abgelehnt.'
    return JSON.stringify({ behavior: 'deny', message })
  }
  if (name === 'frage_stefan') {
    const toolUseId = typeof meta['claudecode/toolUseId'] === 'string' ? meta['claudecode/toolUseId'] : null
    const entscheidung = await frageLeitstand({ art: 'frage', frage: argumente.frage, optionen: argumente.optionen ?? [], tool_use_id: toolUseId })
    if (typeof entscheidung?.ungueltig === 'string') return `Frage ungültig — nicht an Stefan gestellt: ${entscheidung.ungueltig}`
    return typeof entscheidung?.antwort === 'string' ? entscheidung.antwort : KEINE_ANTWORT
  }
  throw new Error(`unbekanntes Werkzeug ${name}`)
}

/** Zeilen-Handler: eine JSON-RPC-Nachricht je Zeile; kaputte Zeilen nur auf stderr, Benachrichtigungen ohne Antwort. */
const zeilen = createInterface({ input: process.stdin })
zeilen.on('line', async (zeile) => {
  if (!zeile.trim()) return
  let nachricht
  try {
    nachricht = JSON.parse(zeile)
  } catch (fehler) {
    diagnose(`kein JSON: ${fehler instanceof Error ? fehler.message : fehler}`)
    return
  }
  const { id, method: methode, params = {} } = nachricht ?? {}
  if (id === undefined || id === null) return // Benachrichtigung (notifications/initialized u. a.)
  try {
    if (methode === 'initialize') {
      sende({ jsonrpc: '2.0', id, result: { protocolVersion: params.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: 'rueckfrage', version: '1.0.0' } } })
    } else if (methode === 'tools/list') {
      sende({ jsonrpc: '2.0', id, result: { tools: WERKZEUGE } })
    } else if (methode === 'tools/call') {
      const text = await beantworte(params.name, params.arguments ?? {}, params._meta ?? {})
      sende({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text }] } })
    } else if (methode === 'ping') {
      sende({ jsonrpc: '2.0', id, result: {} })
    } else {
      sende({ jsonrpc: '2.0', id, error: { code: -32601, message: `Methode ${methode} unbekannt` } })
    }
  } catch (fehler) {
    diagnose(fehler instanceof Error ? fehler.message : String(fehler))
    sende({ jsonrpc: '2.0', id, error: { code: -32603, message: String(fehler instanceof Error ? fehler.message : fehler) } })
  }
})
