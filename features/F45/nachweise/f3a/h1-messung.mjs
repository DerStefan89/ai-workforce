/**
 * Datei: features/F45/nachweise/f3a/h1-messung.mjs
 *
 * Zweck: F45 F-3a, Advisor-Befund H1 — schreibt `claude plugin list --json` unter ~/.claude oder in ~/.claude.json?
 * Momentaufnahme aller Dateien UND Ordner (lstat: Art, mtime, Größe) unter ~/.claude ohne Ausnahme plus ~/.claude.json
 * vor/nach dem Aufruf; neue und gelöschte Einträge zählen mit. Kontrolle (4. Argument 'kontrolle'): gleicher Ablauf mit
 * `node -e ""` statt der CLI — zeigt, was die laufende Claude-Code-Sitzung nebenher schreibt. Rein lesend.
 * Ergebnisse 14.10.2026: h1-kontrolle.json, h1-plugin-list.json (neben diesem Skript).
 *
 * Wird aufgerufen von: Hand (`node h1-messung.mjs <claude.exe> <ausgabe.json> [kontrolle]`), nicht von `npm run check`.
 */
import { execFileSync } from 'node:child_process'
import { lstatSync, readdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const wurzel = join(homedir(), '.claude')
const extra = join(homedir(), '.claude.json')
const programm = process.argv[2]
const aus = process.argv[3]

function snap() {
  const m = new Map()
  const gehe = (p) => {
    let s
    try { s = lstatSync(p) } catch { return }
    m.set(p, `${s.isDirectory() ? 'd' : s.isSymbolicLink() ? 'l' : 'f'} ${s.mtimeMs} ${s.isDirectory() ? '' : s.size}`)
    if (s.isDirectory()) for (const e of readdirSync(p)) gehe(join(p, e))
  }
  gehe(wurzel)
  gehe(extra)
  return m
}
const t0 = Date.now()
const vor = snap()
const t1 = Date.now()
// Kontrolle: gleicher Ablauf ohne CLI (zeigt, was diese Claude-Code-Sitzung selbst nebenher schreibt).
const kontrolle = process.argv[4] === 'kontrolle'
const ausgabe = kontrolle ? (execFileSync(process.execPath, ['-e', ''], { windowsHide: true }), '[]') : execFileSync(programm, ['plugin', 'list', '--json'], { encoding: 'utf8', windowsHide: true })
const t2 = Date.now()
const nach = snap()
const diff = []
for (const [k, v] of vor) if (!nach.has(k)) diff.push(`- ${k} ${v}`); else if (nach.get(k) !== v) diff.push(`~ ${k} ${v} -> ${nach.get(k)}`)
for (const [k, v] of nach) if (!vor.has(k)) diff.push(`+ ${k} ${v}`)
const ergebnis = { gemessen_am: new Date().toISOString(), eintraege_vor: vor.size, eintraege_nach: nach.size, snapshot_ms: t1 - t0, aufruf_ms: t2 - t1, plugins: JSON.parse(ausgabe).length, diff }
writeFileSync(aus, JSON.stringify(ergebnis, null, 2))
console.log(JSON.stringify({ ...ergebnis, diff: diff.slice(0, 40) }, null, 2))
