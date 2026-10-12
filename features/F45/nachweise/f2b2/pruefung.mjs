#!/usr/bin/env node
/**
 * Datei: features/F45/nachweise/f2b2/pruefung.mjs
 *
 * Zweck: F45 F-2b-2a — echte Prüfläufe über die Wege der Oberfläche (POST /api/sammlung/pruefung/vorbereiten → POST
 * /api/sammlung/pruefung → GET …/pruefung/<laufId>) gegen eine eigene Leitstand-Instanz der Workforce (istWorkforceInstanz,
 * repoWurzel = cwd = diese Installation, echte Startfreigabe der Workforce, Wegwerf-Kontrollzustand und -Rohstrom in %TEMP%):
 * - impeccable (Katalog, Skill, ganzes Repo, Commit-SHA),
 * - context7-mcp (Katalog, MCP, npm @upstash/context7-mcp exakte Version + Integrity — nur prüfen, nicht installieren).
 * Je Lauf: bericht-<id>.json (Payload des Kernartefakts, d. h. Urteil, Befunde, Auflagen, Fakten, Pin, Lineage-Lauf-id) und
 * lauf-<id>.json (Init-Zeile: skills/plugins/mcp_servers/tools/slash_commands, CLI-Version, Verweigerungen, Kosten, Phase),
 * dazu ablauf.json. Kein Rohstrom, kein Inhalt der Quelle (der Prüfordner liegt in %TEMP% und wird nach dem Lauf entfernt).
 *
 * Wird aufgerufen von: Hand (`node features/F45/nachweise/f2b2/pruefung.mjs [impeccable|context7-mcp ...]`), nicht von
 * `npm run check`. Kostet je Eintrag einen Modelllauf (Modell der Startvorlage).
 *
 * Wichtig: schreibt nichts in den Kontrollzustand der Workforce, nicht in ~/.ai-workforce und nicht in ressourcen.json.
 */

import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ladeArtefaktVersion } from '../../../../src/lineage-registry/index.ts'
import { erzeugeRequestHandler } from '../../../../scripts/leitstand-server.mjs'

const HIER = import.meta.dirname
const INSTALL = join(HIER, '..', '..', '..', '..')
const STARTVORLAGE = join(INSTALL, 'startvorlagen', 'ai-workforce.json')
const PORT = Number(process.env.F2B2_PORT ?? 4392)
const ZIELE = process.argv.slice(2).length > 0 ? process.argv.slice(2) : ['impeccable', 'context7-mcp']
/**
 * Ordner im Repo je Ziel (Feld pfad). impeccable ist ein Monorepo (≈ 75 MB, 3 884 Dateien, derselbe Skill in rund 20
 * Werkzeug-Ordnern) — „ganzes Repo“ endet zu Recht an der Grenze (Lauf 1, 12.10.2026); geprüft wird die Claude-Code-Fassung
 * des Skills, die eine Ort-B-Installation kopieren würde.
 */
const PFADE = { impeccable: '.claude/skills/impeccable' }

const wurzel = mkdtempSync(join(tmpdir(), 'f45-f2b2-nachweis-'))
const basisVerzeichnis = join(wurzel, 'kontrollzustand')
const ladeOptionen = { basisVerzeichnis, schreiber: () => {} }
console.log(`Wegwerf-Wurzel: ${wurzel}`)

const server = createServer(
  erzeugeRequestHandler({
    basisVerzeichnis,
    repoWurzel: INSTALL,
    cwd: INSTALL,
    installWurzel: INSTALL,
    startvorlagePfad: STARTVORLAGE,
    projektId: 'ai-workforce',
    istWorkforceInstanz: true,
    rohBasisVerzeichnis: join(wurzel, 'roh'),
    laufausgabeWurzel: join(wurzel, 'laufausgabe'),
    capWurzel: join(wurzel, 'cap'),
  })
)
await new Promise((r) => server.listen(PORT, '127.0.0.1', r))
const basis = `http://127.0.0.1:${PORT}`
const senden = async (methode, pfad, koerper) => {
  const a = await fetch(`${basis}${pfad}`, { method: methode, ...(koerper !== undefined ? { body: JSON.stringify(koerper) } : {}) })
  return { status: a.status, koerper: await a.json().catch(() => ({})) }
}

const ablauf = { wurzel, basis, zeit: new Date().toISOString(), laeufe: [] }
for (const id of ZIELE) {
  console.log(`\n── ${id} ──`)
  const pfad = PFADE[id]
  const vor = await senden('POST', '/api/sammlung/pruefung/vorbereiten', { katalog_id: id, ...(pfad !== undefined ? { pfad } : {}) })
  console.log(`vorbereiten: ${vor.status} ${vor.koerper.grund ?? JSON.stringify(vor.koerper.quelle)}`)
  const eintrag = { id, vorbereiten: { status: vor.status, grund: vor.koerper.grund ?? null, typ: vor.koerper.typ ?? null, quelle: vor.koerper.quelle ?? null } }
  ablauf.laeufe.push(eintrag)
  if (vor.status !== 200) continue
  const start = await senden('POST', '/api/sammlung/pruefung', { katalog_id: id, ...(pfad !== undefined ? { pfad } : {}), quelle: vor.koerper.quelle })
  console.log(`start: ${start.status} ${start.koerper.laufId ?? start.koerper.grund}`)
  eintrag.start = { status: start.status, lauf_id: start.koerper.laufId ?? null, grund: start.koerper.grund ?? null }
  if (start.status !== 202) continue
  const laufId = start.koerper.laufId
  let zustand = null
  const beginn = Date.now()
  while (Date.now() - beginn < 1_200_000) {
    zustand = (await senden('GET', `/api/sammlung/pruefung/${encodeURIComponent(laufId)}`)).koerper
    if (zustand.phase === 'fertig' || zustand.phase === 'fehler') break
    await new Promise((r) => setTimeout(r, 5000))
  }
  console.log(`Phase: ${zustand?.phase} ${zustand?.grund ?? ''} ${zustand?.bericht?.ergebnis?.urteil ?? ''}`)
  const laufakte = ladeArtefaktVersion(`laufakte-${laufId}`, undefined, ladeOptionen)?.daten ?? null
  let init = null
  let result = null
  try {
    const roh = laufakte === null ? null : JSON.parse(readFileSync(laufakte.rohstrom_referenz.pfad, 'utf8'))
    const zeilen = roh === null ? [] : String(roh.stdout ?? '').split('\n').map((z) => {
      try {
        return JSON.parse(z)
      } catch {
        return null
      }
    })
    init = zeilen.find((z) => z?.type === 'system' && z?.subtype === 'init') ?? null
    result = zeilen.findLast((z) => z?.type === 'result') ?? null
  } catch (fehler) {
    console.error('Rohstrom nicht lesbar:', fehler)
  }
  const lauf = {
    lauf_id: laufId,
    phase: zustand?.phase ?? null,
    grund: zustand?.grund ?? null,
    dauer_s: Math.round((Date.now() - beginn) / 1000),
    cli: init?.claude_code_version ?? null,
    modell: init?.model ?? null,
    init: init === null ? null : { skills: init.skills, plugins: init.plugins, mcp_servers: init.mcp_servers, tools: init.tools, agents: init.agents ?? null, slash_commands_anzahl: Array.isArray(init.slash_commands) ? init.slash_commands.length : null },
    permission_denials: result?.permission_denials ?? null,
    kosten_usd: result?.total_cost_usd ?? null,
    klassifikation: laufakte?.klassifikation ?? null,
    lauf_status: laufakte?.lauf_status ?? null,
  }
  writeFileSync(join(HIER, `lauf-${id}.json`), `${JSON.stringify(lauf, null, 2)}\n`)
  if (zustand?.bericht) writeFileSync(join(HIER, `bericht-${id}.json`), `${JSON.stringify(zustand.bericht, null, 2)}\n`)
  eintrag.ergebnis = { phase: lauf.phase, grund: lauf.grund, urteil: zustand?.bericht?.ergebnis?.urteil ?? null, artefakt: zustand?.bericht?.artefakt_id ?? null, init_skills: lauf.init?.skills ?? null, init_plugins: lauf.init?.plugins ?? null, kosten_usd: lauf.kosten_usd }
}
writeFileSync(join(HIER, 'ablauf.json'), `${JSON.stringify(ablauf, null, 2)}\n`)
console.log(`\nablauf.json geschrieben. Wegwerf-Wurzel (Rohstrom, Kontrollzustand): ${wurzel}`)
server.close()
process.exit(0)
