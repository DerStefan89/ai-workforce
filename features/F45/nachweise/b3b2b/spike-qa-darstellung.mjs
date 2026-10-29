// Spike F45 B3b-2b (E-B3B2-1 = A, F-1268): liest der qa-Schritt mit dem Abschnitt „Darstellung“ die Bilder des
// Render-Nachweises per Read, wird ein roter Punkt des Protokolls zum Befund ≥ HOCH, und hält das Schema ergebnis-qa?
// Muster ../b2b2b/spike-qa-schema.mjs (Argv wie baueAufruf für einen lesenden Werkzeugsatz, Schema über
// baueClaudeJsonSchema, Prompt über stdin wie starteGateway). Das Mini-Projekt entsteht in <projekt> (außerhalb des
// Repos): index.html mit einer Tabelle, die bei 390 px waagerecht überläuft; drei Bilder per Playwright im Namensmuster
// des Skeletts (desktop-hell mit Bildfolge 0/400 ms, mobil-hell) und protokoll.md über schreibeProtokoll des Skeletts —
// genau ein roter Punkt. Der Prompt ist baueQaAuftragstext mit darstellung ROT und dem Ausgabe-Ende, wie es das Skelett
// schreibt. Bilddaten (base64) werden im gespeicherten Rohstrom durch ihre Länge ersetzt, danach geschwärzt.
// Aufruf: CLAUDE_EXE=<pfad zu claude.exe> node spike-qa-darstellung.mjs <repo> <projekt> <ausgabe.ndjson> <modell>
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'
import { baueClaudeJsonSchema } from '../../../../src/claude-code-gateway/index.ts'
import { baueQaAuftragstext, validiereErgebnisQa } from '../../../../src/qa/index.ts'
import { bewerte, schreibeProtokoll } from '../../../../vorlagen/projekt-skelett/scripts/render-nachweis.mjs'
import { schwaerze } from '../b2b1b/schwaerze.mjs'

const [repo, projekt, aus, modell] = process.argv.slice(2)

// 1. Mini-Projekt
rmSync(projekt, { recursive: true, force: true })
mkdirSync(join(projekt, '.render-nachweis'), { recursive: true })
writeFileSync(join(projekt, 'CLAUDE.md'), '# Haushaltsbuch\n\nDesign-Regeln: nur Farben aus den Tokens in style.css (`--farbe-*`); jede Ansicht funktioniert bei 390 px Breite ohne waagerechtes Scrollen; Bewegung nur mit `transform`/`opacity`, „Bewegung reduzieren“ schaltet sie ab.\n')
writeFileSync(join(projekt, 'style.css'), [
  ':root { --farbe-text: #1d1d1f; --farbe-flaeche: #ffffff; --farbe-akzent: #0b6bcb; }',
  'body { margin: 0; font: 16px/1.5 system-ui, sans-serif; color: var(--farbe-text); background: var(--farbe-flaeche); }',
  'main { padding: 16px; max-width: 960px; width: 100%; box-sizing: border-box; }',
  'h1 { color: var(--farbe-akzent); animation: einblenden 300ms ease-out both; }',
  '@keyframes einblenden { from { opacity: 0; } to { opacity: 1; } }',
  '@media (prefers-reduced-motion: reduce) { h1 { animation: none; } }',
  '.buchungen { min-width: 640px; border-collapse: collapse; }',
  '.buchungen td, .buchungen th { border: 1px solid #c8c8c8; padding: 8px 12px; text-align: left; }',
  '',
].join('\n'))
writeFileSync(join(projekt, 'index.html'), [
  '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">',
  '<title>Haushaltsbuch</title><link rel="stylesheet" href="style.css"></head><body><main>',
  '<h1>Buchungen im Oktober</h1>',
  '<table class="buchungen"><thead><tr><th>Datum</th><th>Empfänger</th><th>Kategorie</th><th>Betrag</th></tr></thead><tbody>',
  '<tr><td>02.10.</td><td>Stadtwerke</td><td>Wohnen</td><td>-84,20 €</td></tr>',
  '<tr><td>05.10.</td><td>Supermarkt am Platz</td><td>Lebensmittel</td><td>-36,75 €</td></tr>',
  '<tr><td>15.10.</td><td>Gehalt</td><td>Einnahmen</td><td>2.450,00 €</td></tr>',
  '</tbody></table></main></body></html>',
  '',
].join('\n'))

// 2. Drei Bilder im Namensmuster des Skeletts, Überlauf wie UEBERLAUF im Skelett gemessen
const ausgabe = join(projekt, '.render-nachweis')
const url = pathToFileURL(join(projekt, 'index.html')).href
const browser = await chromium.launch()
const ergebnisse = []
try {
  for (const v of [{ name: 'desktop-hell', breite: 1440, hoehe: 900, bildfolge: [0, 400] }, { name: 'mobil-hell', breite: 390, hoehe: 844, ueberlauf: true }]) {
    const kontext = await browser.newContext({ viewport: { width: v.breite, height: v.hoehe }, deviceScaleFactor: 1 })
    const seite = await kontext.newPage()
    await seite.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' })
    await seite.goto(url, { waitUntil: 'load' })
    const bilder = []
    for (const ms of v.bildfolge ?? [null]) {
      if (ms !== null) await seite.waitForTimeout(ms)
      const bild = `start-${v.name}${ms === null ? '' : `-${ms}ms`}.png`
      await seite.screenshot({ path: join(ausgabe, bild) })
      bilder.push(bild)
    }
    const ueberlauf = v.ueberlauf ? Boolean(await seite.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth')) : undefined
    const e = { seite: '/', variante: v.name, status: 200, bilder, animationen: 1, laufend: 0, ...(ueberlauf === undefined ? {} : { ueberlauf }) }
    ergebnisse.push({ ...e, befunde: bewerte(e, v, { lcpMs: 2500, bytes: 500000 }), hinweise: [] })
    await kontext.close()
  }
} finally {
  await browser.close()
}
const { befunde } = schreibeProtokoll(ausgabe, { ordner: '.', url: null, seiten: ['/'], bildfolgeMs: [0, 400], budget: { lcpMs: 2500, bytes: 500000 } }, ergebnisse)
console.log('protokoll befunde', JSON.stringify(befunde))
if (befunde.length !== 1) throw new Error('Spike braucht genau einen roten Punkt')
const ausgabeEnde = [...befunde.map((b) => `✗ ${b}`), `✗ Render-Nachweis: ${ergebnisse.length} Ansichten, .render-nachweis/protokoll.md`].join('\n')

// 3. Prompt und Lauf
const schema = baueClaudeJsonSchema(readFileSync(`${repo}/schemas/ergebnis-qa.schema.json`, 'utf8'))
const auftrag = 'Neue Startseite des Haushaltsbuchs: index.html mit der Tabelle der Buchungen des Monats, Stil in style.css.'
const akzeptanzkriterien = [{ id: 'AK1', text: 'Die Startseite zeigt die Buchungen des Monats als Tabelle (Datum, Empfänger, Kategorie, Betrag).' }]
const eingaben = [
  'Eingabe 1 — Änderungsübersicht des Baus: neue Dateien index.html und style.css (siehe Arbeitsordner).',
  'Eingabe 2 — Prüfergebnis des Baus: GRÜN (Exit 0).',
  'Eingabe 3 — Ergebnis des Reviews: {"urteil":"BEREIT","befunde":[],"empfehlung":"Abnehmen."}',
  '',
  'Halte die Prüfung kurz (höchstens 8 Werkzeugaufrufe).',
].join('\n')
const prompt = [baueQaAuftragstext(auftrag, akzeptanzkriterien, ['Keine Filter, keine Sortierung.'], { ergebnis: 'ROT', ausgabe_ende: ausgabeEnde }), '', eingaben].join('\n')
writeFileSync(aus.replace(/\.ndjson$/, '-prompt.txt'), prompt)
const argv = ['--model', modell, '--output-format', 'stream-json', '--verbose', '--setting-sources', 'project',
  '--tools', 'Read,Grep,Glob', '--allowedTools', 'Read,Grep,Glob', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}',
  '--json-schema', schema, '-p']  // Prompt über stdin wie starteGateway (F-642)
const start = Date.now()
const kind = spawn(process.env.CLAUDE_EXE, argv, { cwd: projekt, shell: false, stdio: ['pipe', 'pipe', 'pipe'] })
kind.stdin.end(prompt)
let out = ''
let err = ''
kind.stdout.on('data', (d) => { out += d })
kind.stderr.on('data', (d) => { err += d })
kind.on('close', (code) => {
  // Bilddaten nicht ins Repo: base64 durch die Länge ersetzen, danach schwärzen (HOME, TEMP, PIPE).
  const ohneBilder = out.replace(/"data":"([A-Za-z0-9+/=]{200,})"/g, (_, b64) => `"data":"<base64 entfernt, ${b64.length} Zeichen>"`)
  writeFileSync(aus, schwaerze(ohneBilder))
  console.log('exit', code, 'dauer_ms', Date.now() - start, 'stderr', schwaerze(err).slice(0, 500))
  const zeilen = out.split('\n').filter(Boolean).map((z) => { try { return JSON.parse(z) } catch { return null } }).filter(Boolean)
  const init = zeilen.find((z) => z.type === 'system' && z.subtype === 'init')
  if (init) console.log('init.tools', (init.tools ?? []).join(','), 'version', init.claude_code_version, 'modell', init.model)
  const reads = zeilen.filter((z) => z.type === 'assistant').flatMap((z) => z.message?.content ?? []).filter((c) => c.type === 'tool_use')
  console.log('tool_use', schwaerze(JSON.stringify(reads.map((c) => `${c.name} ${String(c.input?.file_path ?? c.input?.pattern ?? '').replace(/^.*[\\/]\.render-nachweis[\\/]/, '.render-nachweis/')}`))))
  const bildErgebnisse = zeilen.filter((z) => z.type === 'user').flatMap((z) => z.message?.content ?? []).filter((c) => c.type === 'tool_result' && Array.isArray(c.content) && c.content.some((b) => b.type === 'image'))
  console.log('tool_result mit Bild', bildErgebnisse.length)
  const res = zeilen.reverse().find((z) => z.type === 'result')
  if (!res) { console.log('KEIN result'); return }
  console.log('subtype', res.subtype, 'is_error', res.is_error, 'kosten', res.total_cost_usd, 'turns', res.num_turns)
  console.log('structured_output', JSON.stringify(res.structured_output, null, 1))
  if (!res.structured_output) return
  console.log('validiereErgebnisQa', JSON.stringify(validiereErgebnisQa(res.structured_output)))
  const treffer = (res.structured_output.befunde ?? []).filter((b) => ['HOCH', 'KRITISCH'].includes(b.schwere) && /überlauf|390|mobil/i.test(`${b.fundstelle} ${b.zusammenfassung}`))
  console.log('roter Punkt als Befund >= HOCH', treffer.map((b) => `${b.id} ${b.schwere} ${b.fundstelle}`).join('; ') || 'NEIN')
})
