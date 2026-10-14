#!/usr/bin/env node
/**
 * Datei: features/F45/nachweise/f3a/gegenprobe.mjs
 *
 * Zweck: F45 F-3a-1 — Leser gegen Stefans echten Bestand: GET /api/plugins über den echten Handler (echter Listenläufer,
 * echtes ~/.claude, nur lesend) und Gegenprobe der Zählungen je Plugin gegen `claude plugin details <id>` (Text der CLI:
 * „Skills (n)“, „Agents (n)“, „Hooks (n)“, „MCP servers (n)“, „LSP servers (n)“). Dazu lstat-Momentaufnahme von
 * ~/.claude/plugins vor/nach dem Abruf. Schreibt gegenprobe.json neben dieses Skript (maskierte Antwort, Zählungen,
 * Abweichungen).
 *
 * Wird aufgerufen von: Hand (`node features/F45/nachweise/f3a/gegenprobe.mjs`), nicht von `npm run check`.
 */

import { execFileSync } from 'node:child_process'
import { lstatSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { ladeStartvorlage } from '../../../../src/startvorlage/index.ts'
import { erzeugeRequestHandler } from '../../../../scripts/leitstand-server.mjs'

const HIER = import.meta.dirname
const INSTALL = join(HIER, '..', '..', '..', '..')
const programm = ladeStartvorlage(join(INSTALL, 'startvorlagen', 'ai-workforce.json')).werkzeugStartziel[0]

function momentaufnahme() {
  const m = new Map()
  const gehe = (p) => {
    const s = lstatSync(p)
    m.set(p, `${s.isDirectory() ? 'd' : 'f'} ${s.mtimeMs} ${s.isDirectory() ? '' : s.size}`)
    if (s.isDirectory()) for (const e of readdirSync(p)) gehe(join(p, e))
  }
  gehe(join(homedir(), '.claude', 'plugins'))
  return m
}

const basis = mkdtempSync(join(tmpdir(), 'f3a-gegenprobe-'))
const server = createServer(erzeugeRequestHandler({ basisVerzeichnis: basis, repoWurzel: INSTALL, installWurzel: INSTALL }))
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const vor = momentaufnahme()
const start = Date.now()
const antwort = await (await fetch(`http://127.0.0.1:${server.address().port}/api/plugins`)).json()
const dauer = Date.now() - start
const nach = momentaufnahme()
await new Promise((r) => server.close(r))
const abweichung = []
for (const [k, v] of vor) if (nach.get(k) !== v) abweichung.push(`~ ${k}`)
for (const k of nach.keys()) if (!vor.has(k)) abweichung.push(`+ ${k}`)

const zaehlungen = []
for (const p of antwort.plugins ?? []) {
  // scope local: details löst das Plugin nur im zugehörigen Projekt auf (gemessen: sonst „not found“).
  let text
  try {
    text = execFileSync(programm, ['plugin', 'details', p.id], { encoding: 'utf8', cwd: p.projekt_pfad ?? INSTALL })
  } catch (fehler) {
    zaehlungen.push({ id: p.id, aktiv: p.aktiv, cli: null, leser: null, gleich: null, grund: String(fehler.stdout ?? fehler.message).trim().slice(0, 200) })
    continue
  }
  const zahl = (wort) => Number(new RegExp(`${wort} \\((\\d+)\\)`).exec(text)?.[1] ?? Number.NaN)
  const cli = { skills: zahl('Skills'), agents: zahl('Agents'), hooks: zahl('Hooks'), mcp: zahl('MCP servers'), lsp: zahl('LSP servers') }
  const leser = { skills: p.bestandteile.skills.length + p.bestandteile.commands.length, agents: p.bestandteile.agents.length, hooks: p.bestandteile.hooks.length, mcp: p.bestandteile.mcp.length, lsp: p.bestandteile.lsp.length }
  zaehlungen.push({ id: p.id, aktiv: p.aktiv, cli, leser, gleich: JSON.stringify(cli) === JSON.stringify(leser) })
}
const ergebnis = { gemessen_am: new Date().toISOString(), dauer_ms: dauer, status: antwort.status, grund: antwort.grund ?? null, zaehlungen, plugins_ordner_abweichung: abweichung, antwort }
writeFileSync(join(HIER, 'gegenprobe.json'), `${JSON.stringify(ergebnis, null, 2)}\n`)
console.log(JSON.stringify({ dauer_ms: dauer, status: antwort.status, zaehlungen, abweichung }, null, 2))
