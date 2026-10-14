/**
 * Datei: features/F45/nachweise/f3a2/messung-scope-local.mjs
 *
 * Zweck: F45 F-3a-2, F-1091 (2) — hängt `enabled` aus `claude plugin list --json` bei scope local vom Arbeitsordner des
 * CLI-Aufrufs ab? Isolierter Bestand: eigener CLAUDE_CONFIG_DIR unter tmpdir, lokaler Marketplace mit einem Mess-Plugin,
 * zwei Projektordner A und B. Installiert wird mit scope local in A; gelistet wird aus A und aus B (und aus einem dritten
 * Ordner C ohne Bezug), danach einmal in A abgeschaltet und erneut aus A und B gelistet. Kontrolle: lstat-Momentaufnahme
 * von ~/.claude/plugins vor/nach (der echte Bestand bleibt unberührt). Pfade in der Ausgabe geschwärzt (<TMP>, <HOME>).
 * Ergebnis: messung-scope-local.json neben diesem Skript.
 *
 * Wird aufgerufen von: Hand (`node messung-scope-local.mjs <claude.exe>`), nicht von `npm run check`.
 */
import { execFileSync } from 'node:child_process'
import { lstatSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'

const programm = process.argv[2] ?? 'claude'
const wurzel = mkdtempSync(join(tmpdir(), 'f3a2-messung-'))
const echt = join(homedir(), '.claude', 'plugins')
/** Schwärzt Messordner und Home (roh und JSON-escaped). */
const schwaerze = (text) => {
  let t = text
  for (const [p, ersatz] of [[wurzel, '<TMP>'], [homedir(), '<HOME>']]) t = t.split(p).join(ersatz).split(JSON.stringify(p).slice(1, -1)).join(ersatz)
  return t
}

function snap(p, m = new Map()) {
  let s
  try { s = lstatSync(p) } catch { return m }
  m.set(p, `${s.isDirectory() ? 'd' : 'f'} ${s.mtimeMs} ${s.isDirectory() ? '' : s.size}`)
  if (s.isDirectory()) for (const e of readdirSync(p)) snap(join(p, e), m)
  return m
}

const env = { ...process.env, CLAUDE_CONFIG_DIR: join(wurzel, 'config') }
mkdirSync(env.CLAUDE_CONFIG_DIR)
const markt = join(wurzel, 'markt')
mkdirSync(join(markt, '.claude-plugin'), { recursive: true })
mkdirSync(join(markt, 'mess-plugin', '.claude-plugin'), { recursive: true })
mkdirSync(join(markt, 'mess-plugin', 'skills', 'mess-skill'), { recursive: true })
writeFileSync(join(markt, '.claude-plugin', 'marketplace.json'), JSON.stringify({ name: 'mess-markt', owner: { name: 'messung' }, plugins: [{ name: 'mess-plugin', source: './mess-plugin', description: 'Messung F-3a-2' }] }))
writeFileSync(join(markt, 'mess-plugin', '.claude-plugin', 'plugin.json'), JSON.stringify({ name: 'mess-plugin', version: '0.0.1' }))
writeFileSync(join(markt, 'mess-plugin', 'skills', 'mess-skill', 'SKILL.md'), '---\nname: mess-skill\ndescription: Messung\n---\nnur Messung\n')
const ordner = Object.fromEntries(['A', 'B', 'C'].map((n) => [n, join(wurzel, `projekt-${n}`)]))
for (const p of Object.values(ordner)) mkdirSync(p)

const schritte = []
function cli(name, cwd, args) {
  let ausgabe
  let exit = 0
  try {
    ausgabe = execFileSync(programm, args, { cwd, env, encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
  } catch (fehler) {
    exit = fehler.status ?? -1
    ausgabe = `${fehler.stdout ?? ''}${fehler.stderr ?? ''}`
  }
  const zeile = { schritt: name, cwd: schwaerze(cwd), args: args.map(schwaerze), exit }
  if (args[1] === 'list') {
    const liste = JSON.parse(ausgabe)
    zeile.liste = liste.map((p) => ({ id: p.id, scope: p.scope, enabled: p.enabled, projectPath: p.projectPath === undefined ? undefined : schwaerze(String(p.projectPath)), projectEnabled: p.projectEnabled }))
  } else zeile.ausgabe = schwaerze(ausgabe.trim()).slice(0, 400)
  schritte.push(zeile)
  console.log(JSON.stringify(zeile))
}

const vor = snap(echt)
try {
  cli('marketplace add', ordner.A, ['plugin', 'marketplace', 'add', markt])
  cli('install local in A', ordner.A, ['plugin', 'install', 'mess-plugin@mess-markt', '--scope', 'local'])
  cli('list aus A (installiert, an)', ordner.A, ['plugin', 'list', '--json'])
  cli('list aus B (installiert, an)', ordner.B, ['plugin', 'list', '--json'])
  cli('list aus C (installiert, an)', ordner.C, ['plugin', 'list', '--json'])
  cli('disable local in A', ordner.A, ['plugin', 'disable', 'mess-plugin@mess-markt', '--scope', 'local'])
  cli('list aus A (aus)', ordner.A, ['plugin', 'list', '--json'])
  cli('list aus B (aus)', ordner.B, ['plugin', 'list', '--json'])
  cli('version', ordner.C, ['--version'])
} finally {
  const nach = snap(echt)
  const diff = []
  for (const [k, v] of vor) if (nach.get(k) !== v) diff.push(schwaerze(k))
  for (const k of nach.keys()) if (!vor.has(k)) diff.push(schwaerze(k))
  const ergebnis = { gemessen_am: new Date().toISOString(), echter_plugins_ordner: { eintraege: vor.size, abweichungen: diff }, schritte }
  writeFileSync(new URL('./messung-scope-local.json', import.meta.url), `${JSON.stringify(ergebnis, null, 2)}\n`)
  rmSync(wurzel, { recursive: true, force: true })
}
