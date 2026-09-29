#!/usr/bin/env node
/**
 * Datei: features/F36/nachweis-reallauf/auszug-laeufe.mjs
 *
 * Zweck: Auszug der belegenden Zeilen aus den Rohströmen der vier F36-Reallauf-Läufe in haushaltsbuch2
 * (F36 Review-Pass H-B). Einmalig von Hand ausgeführt, NICHT Teil von `npm run check`. Liest nur:
 * die Rohströme `<ai-workforce-Haupt-Checkout>/kontrollzustand-roh/<laufId>/rohstrom.json` (gitignored)
 * und die Laufakten `haushaltsbuch2/kontrollzustand/lineage-laufakte-<laufId>/checkpoints/*.json`.
 * Nichts wird rekonstruiert: Je Lauf stehen im Auszug die sha256 des Rohstroms, die init-Zeile (skills,
 * tools, mcp_servers, slash_commands, agents), jede Skill- und mcp__-tool_use-Zeile samt tool_result,
 * die permission_denials der result-Zeile und die Zählregel (Skill-tool_use außerhalb der Ort-B-Menge).
 *
 * Aufruf: node features/F36/nachweis-reallauf/auszug-laeufe.mjs
 * Ausgabe: features/F36/nachweis-reallauf/auszug-laeufe.json
 */

import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HIER = dirname(fileURLToPath(import.meta.url))
const ROH = join(homedir(), 'Projekte', 'ai-workforce', 'kontrollzustand-roh')
const KZ = join(homedir(), 'Projekte', 'haushaltsbuch2', 'kontrollzustand')
const LAEUFE = [
  { laufId: '1c4a1163-17de-4063-95b3-41eb31352c23', rolle: 'F2 Iteration 1' },
  { laufId: '7b6d0f40-4479-4e88-bf6c-c81487531652', rolle: 'F2 Korrektur (AK4/AK5)' },
  { laufId: '8cee6c98-74ee-4c22-9bbf-e7211af7f401', rolle: 'F3 Iteration 1 (AK12)' },
  { laufId: '74290fb5-1b1c-4aa2-ae81-1587018a9eb0', rolle: 'F3 Korrektur' },
]
/** Ort-B-Menge des Reallaufs (installiert und übergeben): Zählregel „Skill-tool_use außerhalb“. */
const ORT_B = new Set(['frontend-design'])

/**
 * sha256 einer Datei als Hex.
 * @param pfad - Dateipfad
 * @returns Hex-Hash
 */
function sha256(pfad) {
  return createHash('sha256').update(readFileSync(pfad)).digest('hex')
}

/**
 * Kürzt einen tool_result-Inhalt auf lesbaren Text (Liste von Blöcken oder String).
 * @param inhalt - content des tool_result
 * @returns höchstens 400 Zeichen Text
 */
function text(inhalt) {
  const roh = typeof inhalt === 'string' ? inhalt : Array.isArray(inhalt) ? inhalt.map((b) => b.text ?? JSON.stringify(b)).join(' ') : JSON.stringify(inhalt)
  return roh.length > 400 ? `${roh.slice(0, 400)} …` : roh
}

/**
 * Wertet einen Rohstrom aus.
 * @param lauf - { laufId, rolle }
 * @returns Auszug oder { fehlt: true }
 */
function auszug(lauf) {
  const pfad = join(ROH, lauf.laufId, 'rohstrom.json')
  if (!existsSync(pfad)) return { ...lauf, rohstrom: null, fehlt: true }
  const zeilen = JSON.parse(readFileSync(pfad, 'utf8'))
    .stdout.split('\n')
    .filter((z) => z.trim().startsWith('{'))
    .map((z) => {
      try {
        return JSON.parse(z)
      } catch {
        return null
      }
    })
    .filter(Boolean)
  const init = zeilen.find((z) => z.type === 'system' && z.subtype === 'init')
  const aufrufe = new Map()
  const ergebnisse = new Map()
  for (const z of zeilen) {
    for (const block of z.message?.content ?? []) {
      if (block.type === 'tool_use' && (block.name === 'Skill' || block.name.startsWith('mcp__'))) aufrufe.set(block.id, { name: block.name, input: block.input })
      if (block.type === 'tool_result') ergebnisse.set(block.tool_use_id, { is_error: block.is_error === true, text: text(block.content) })
    }
  }
  const werkzeugAufrufe = [...aufrufe].map(([id, a]) => ({ tool_use_id: id, ...a, tool_result: ergebnisse.get(id) ?? null }))
  const result = zeilen.findLast((z) => z.type === 'result')
  const fremd = werkzeugAufrufe.filter((a) => a.name === 'Skill' && !ORT_B.has(String(a.input?.skill ?? a.input?.name ?? '')))
  const laufakteOrdner = join(KZ, `lineage-laufakte-${lauf.laufId}`, 'checkpoints')
  const laufakten = existsSync(laufakteOrdner) ? readdirSync(laufakteOrdner).map((d) => ({ datei: `haushaltsbuch2/kontrollzustand/lineage-laufakte-${lauf.laufId}/checkpoints/${d}`, sha256: sha256(join(laufakteOrdner, d)) })) : []
  return {
    ...lauf,
    rohstrom: { pfad: `ai-workforce/kontrollzustand-roh/${lauf.laufId}/rohstrom.json`, sha256: sha256(pfad), zeilen: zeilen.length },
    laufakten,
    init: init
      ? { claude_code_version: init.claude_code_version, skills: init.skills, tools: init.tools, mcp_servers: init.mcp_servers, slash_commands: init.slash_commands, agents: init.agents, plugins: init.plugins }
      : null,
    werkzeug_aufrufe: werkzeugAufrufe,
    permission_denials: result?.permission_denials?.map((d) => ({ tool_name: d.tool_name, tool_use_id: d.tool_use_id, tool_input: d.tool_input })) ?? null,
    zaehlregel_skill_ausserhalb_ort_b: fremd.length,
  }
}

const ergebnis = { erzeugt: new Date().toISOString(), ort_b_menge: [...ORT_B], laeufe: LAEUFE.map(auszug) }
writeFileSync(join(HIER, 'auszug-laeufe.json'), `${JSON.stringify(ergebnis, null, 2)}\n`)
for (const l of ergebnis.laeufe) {
  console.log(`${l.laufId.slice(0, 8)} ${l.fehlt ? 'ROHSTROM FEHLT' : `skills=${JSON.stringify(l.init?.skills)} mcp=${JSON.stringify(l.init?.mcp_servers)} aufrufe=${l.werkzeug_aufrufe.length} denials=${l.permission_denials?.length} fremd=${l.zaehlregel_skill_ausserhalb_ort_b}`}`)
}
