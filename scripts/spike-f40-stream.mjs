/**
 * F40 WS-0 Spike (Wegwerf, später löschbar): misst, ob `--output-format
 * stream-json` im `-p`-Einzelschuss der realen Claude-CLI tatsächlich früh
 * sichtbaren Antworttext liefert (TTFT), ob die letzte Zeile (`type:
 * 'result'`) dieselben Felder trägt wie das heutige gepufferte `json`, und
 * was bei einem Prozessbaum-Kill mitten im Stream im Puffer liegen bleibt.
 *
 * Ändert keinen Produktcode: importiert baueAufruf/baueJarvisAuftragstext
 * nur lesend, damit die Flags identisch zu starteJarvisChatLauf sind
 * (settingSources '', mcpConfig leer, Werkzeugsatz 'lesend',
 * MAX_THINKING_TOKENS=0, stdin sofort 'ignore') — einzige Abweichung:
 * `json` → `stream-json` plus das dafür von der CLI verlangte `--verbose`,
 * in Variante B zusätzlich `--include-partial-messages`.
 *
 * Aufruf: node scripts/spike-f40-stream.mjs [logVerzeichnis]
 * Rohzeilen je Lauf landen als <name>.jsonl (je Zeile {t_ms, zeile}) im
 * logVerzeichnis (Default: os.tmpdir()/spike-f40), die Zusammenfassung auf stdout.
 */

import { execFile, spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { baueAufruf } from '../src/claude-code-gateway/index.ts'
import { baueJarvisAuftragstext } from '../src/jarvis/index.ts'

const REPO = 'C:\\Users\\stefa\\Projekte\\ai-workforce'
const vorlage = JSON.parse(readFileSync(join(REPO, 'startvorlagen', 'beispielprojekt.json'), 'utf8'))
const STARTZIEL = vorlage.werkzeugStartziel[0]
const logDir = process.argv[2] ?? join(tmpdir(), 'spike-f40')
mkdirSync(logDir, { recursive: true })

/** Näherung an die F33-Einspeisung (beschreibung/anweisungen/roadmap) — Inhalt vorangestellt, nicht über den echten Kontextpaket-Pfad. */
function kontextBlock() {
  const dateien = ['docs/projekt/kontext/beschreibung.md', 'docs/projekt/kontext/anweisungen.md', 'docs/projekt/roadmap.json']
  return dateien
    .map((p) => {
      try {
        return `--- ${p} ---\n${readFileSync(join(REPO, p), 'utf8')}`
      } catch {
        return ''
      }
    })
    .filter(Boolean)
    .join('\n\n')
}

/** Tokens wie starteJarvisChatLauf, nur json → stream-json (+ --verbose, optional --include-partial-messages). */
function baueTokens(nachricht, partial) {
  // Beginnt bewusst NICHT mit '-': ein -p-Wert mit führendem '-' parst die CLI als unbekannte Option (real beobachtet, erster Spike-Lauf).
  const prompt = `Projektkontext:\n${kontextBlock()}\n\n${baueJarvisAuftragstext(nachricht, [])}`
  const tokens = baueAufruf({
    modell: vorlage.modell,
    prompt,
    werkzeugsatz: { modus: 'DEKLARIERT', erlaubte_werkzeuge: vorlage.werkzeugsaetze.lesend.erlaubte_werkzeuge },
    settingSources: '',
    mcpConfig: '{"mcpServers":{}}',
  })
  const i = tokens.indexOf('json')
  tokens.splice(i, 1, 'stream-json', '--verbose', ...(partial ? ['--include-partial-messages'] : []))
  return tokens
}

/** Sichtbarer Antworttext in dieser Zeile? (assistant-Textblock oder text_delta), nicht init/system/tool_use. */
function hatSichtbarenText(obj) {
  if (obj?.type === 'assistant') return (obj.message?.content ?? []).some((b) => b.type === 'text' && b.text?.trim())
  if (obj?.type === 'stream_event') return obj.event?.type === 'content_block_delta' && obj.event.delta?.type === 'text_delta' && obj.event.delta.text?.length > 0
  return false
}

function killeBaum(kind) {
  kind.kill()
  return new Promise((r) => execFile('taskkill', ['/PID', String(kind.pid), '/T', '/F'], (f, out, err) => r(`${out}${err}`.trim())))
}

/**
 * Ein Lauf. abbruch: { nachMs } (fester Zeitpunkt seit Start) oder
 * { nachErstemTextMs } (relativ zur ersten sichtbaren Textzeile).
 */
function lauf(name, nachricht, { partial = false, abbruch = null } = {}) {
  return new Promise((resolve) => {
    const tokens = baueTokens(nachricht, partial)
    const t0 = performance.now()
    const kind = spawn(STARTZIEL, tokens, { cwd: REPO, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, MAX_THINKING_TOKENS: '0' } })
    const zeilen = []
    let rest = ''
    let chunks = 0
    let stderr = ''
    let ersterText = null
    let abbruchInfo = null
    const toete = async (grund) => {
      if (abbruchInfo) return
      abbruchInfo = { grund, t_ms: Math.round(performance.now() - t0) }
      abbruchInfo.taskkill = await killeBaum(kind)
    }
    if (abbruch?.nachMs) setTimeout(() => toete(`fest ${abbruch.nachMs}ms`), abbruch.nachMs)
    kind.stdout.on('data', (buf) => {
      chunks++
      const t = Math.round(performance.now() - t0)
      rest += buf.toString('utf8')
      let nl
      while ((nl = rest.indexOf('\n')) >= 0) {
        const zeile = rest.slice(0, nl)
        rest = rest.slice(nl + 1)
        if (!zeile.trim()) continue
        let obj = null
        try {
          obj = JSON.parse(zeile)
        } catch {}
        zeilen.push({ t_ms: t, zeile, obj })
        if (ersterText === null && hatSichtbarenText(obj)) {
          ersterText = t
          if (abbruch?.nachErstemTextMs) setTimeout(() => toete(`${abbruch.nachErstemTextMs}ms nach erstem Text`), abbruch.nachErstemTextMs)
        }
      }
    })
    kind.stderr.on('data', (b) => {
      stderr += b.toString('utf8')
    })
    kind.on('close', (code, signal) => {
      const ende = Math.round(performance.now() - t0)
      writeFileSync(join(logDir, `${name}.jsonl`), zeilen.map(({ t_ms, zeile }) => JSON.stringify({ t_ms, zeile })).join('\n') + (rest ? `\n${JSON.stringify({ t_ms: ende, rest })}` : ''))
      const letzte = zeilen.at(-1)?.obj
      const typen = zeilen.map((z) => `${z.t_ms}:${z.obj?.type ?? 'KAPUTT'}${z.obj?.subtype ? `/${z.obj.subtype}` : ''}${z.obj?.type === 'stream_event' ? `/${z.obj.event?.type}` : ''}`)
      const tools = zeilen.flatMap((z) => (z.obj?.type === 'assistant' ? z.obj.message.content.filter((b) => b.type === 'tool_use').map((b) => `${z.t_ms}:${b.name}`) : []))
      resolve({
        name,
        partial,
        exitCode: code,
        signal,
        chunks,
        zeilen: zeilen.length,
        erste_zeile_ms: zeilen[0]?.t_ms ?? null,
        erster_text_ms: ersterText,
        prozessende_ms: ende,
        tools,
        letzte_zeile_typ: letzte ? `${letzte.type}/${letzte.subtype ?? ''}` : null,
        result_felder: letzte?.type === 'result' ? Object.keys(letzte) : null,
        result: letzte?.type === 'result' ? { duration_ms: letzte.duration_ms, num_turns: letzte.num_turns, ttft_ms: letzte.ttft_ms, is_error: letzte.is_error, result_anfang: String(letzte.result).slice(0, 80) } : null,
        unvollstaendiger_rest: rest.length ? { bytes: rest.length, anfang: rest.slice(0, 120) } : null,
        kaputte_zeilen: zeilen.filter((z) => z.obj === null).length,
        abbruch: abbruchInfo,
        stderr: stderr.trim().slice(0, 200),
        verlauf: typen.length > 40 ? [...typen.slice(0, 20), '…', ...typen.slice(-10)] : typen,
      })
    })
  })
}

const PROMPTS = [
  ['p1-kurz', 'Welche Rolle hat Jarvis in diesem Projekt? Ein Satz.'],
  ['p2-roadmap', 'Wo stehen wir gerade in der Roadmap?'],
  ['p3-grep', 'Welche P1-Findings sind in state/findings.md aktuell noch offen?'],
  ['p4-status', 'Was ist laut docs/STATUS.md der aktuelle Phasenstand?'],
  ['p5-mehrtools', 'Was steht in features/F33/feature.md zu WS-2, und ist das in docs/STATUS.md schon erwähnt?'],
]

const ergebnisse = []
// Seriell, damit sich die Läufe nicht gegenseitig verlangsamen (vgl. Systemlast-Vorbehalt in state/nachweis-jarvis-latenz.md).
for (const [name, text] of PROMPTS) ergebnisse.push(await lauf(`A-${name}`, text))
for (const [name, text] of [PROMPTS[0], PROMPTS[2]]) ergebnisse.push(await lauf(`B-${name}-partial`, text, { partial: true }))
ergebnisse.push(await lauf('C-abbruch-2s', PROMPTS[1][1], { abbruch: { nachMs: 2000 } }))
ergebnisse.push(await lauf('D-abbruch-mitten-im-text', PROMPTS[1][1], { partial: true, abbruch: { nachErstemTextMs: 300 } }))

// Referenz: Felder des gepufferten json-Formats aus einem realen Rohstrom.
let referenzFelder = null
try {
  const roh = JSON.parse(readFileSync(join(REPO, 'kontrollzustand-roh', 'jarvis-jarvis-chat-997da0d1-cc50-4dac-bd23-f5dc7145a88a', 'rohstrom.json'), 'utf8'))
  referenzFelder = Object.keys(JSON.parse(roh.stdout))
} catch (f) {
  referenzFelder = `nicht lesbar: ${f.message}`
}

console.log(JSON.stringify({ logDir, referenzFelder, ergebnisse }, null, 1))
