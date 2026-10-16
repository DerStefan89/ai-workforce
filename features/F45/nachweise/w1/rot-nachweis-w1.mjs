/**
 * Datei: features/F45/nachweise/w1/rot-nachweis-w1.mjs
 *
 * Zweck: Treiber des Rot-Nachweises F45 W1 (features/F45/nachweise/w1/rot-nachweis.md) — lässt das Gate
 * scripts/check-wachstumsbremse-server.mjs je Fall gegen eine präparierte Kopie laufen (git archive, kein Worktree, F-1127).
 * Modus `datei`: je Fall eine frische Kopie ohne git unter <w1>/datei/<fall>; Modus `repo`: alle Fälle im Mini-Repo <w1>/repo,
 * nach jedem Fall Server, Gate und JSON zurückgesetzt. Der Server kommt aus der unberührten Abzugskopie <w1>/rein.
 *
 * Wird aufgerufen von: Hand (Nachweis), nicht von npm run check.
 *
 * Aufruf: node features/F45/nachweise/w1/rot-nachweis-w1.mjs <w1-ordner> <repo-wurzel> datei|repo
 */
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [w1, projekt, modus] = process.argv.slice(2)
const SERVER = 'scripts/leitstand-server.mjs'
const JSON_PFAD = 'scripts/wachstumsbremse-server.json'

function bereite(ordner) {
  // Server unverändert aus der unberührten Abzugskopie <w1>/rein (git archive HEAD = main).
  mkdirSync(join(ordner, 'scripts'), { recursive: true })
  copyFileSync(join(w1, 'rein', SERVER), join(ordner, SERVER))
  for (const d of ['scripts/check-wachstumsbremse-server.mjs', JSON_PFAD]) copyFileSync(join(projekt, d), join(ordner, d))
}
const aendere = (ordner, pfad, f) => writeFileSync(join(ordner, pfad), f(readFileSync(join(ordner, pfad), 'utf8')))
const ersetzeLeerzeile = (text, zeile) => text.replace(/\n\n/, `\n${zeile}\n`)
const entferneLeerzeile = (text) => text.replace(/\n\n/, '\n')
const bremse = (f) => (text) => `${JSON.stringify(f(JSON.parse(text)), null, 2)}\n`

const FAELLE = [
  ['g0 Ausgangslage', 0, () => {}],
  ['a1 Server +1 Zeile', 1, (o) => aendere(o, SERVER, (t) => `${t}// w1-probe\n`)],
  ['a3 Server -1 Zeile (Grenze nicht gesenkt)', 1, (o) => aendere(o, SERVER, entferneLeerzeile)],
  ['a2 Server +1 und Grenze +1', 1, (o) => {
    aendere(o, SERVER, (t) => `${t}// w1-probe\n`)
    aendere(o, JSON_PFAD, bremse((b) => ({ ...b, obergrenze_zeilen: b.obergrenze_zeilen + 1 })))
  }],
  ['b1 neue Route im Server (Leerzeile ersetzt)', 1, (o) => aendere(o, SERVER, (t) => ersetzeLeerzeile(t, "if (pfad === '/api/w1-probe') {}"))],
  ['b3 Route aus dem Server entfernt, Bestand nicht nachgezogen', 1, (o) => aendere(o, SERVER, (t) => t.replace("pfad === '/api/verbrauch'", 'pfad === pfadVerbrauch'))],
  ['b2 Probe-Route in Server und Bestand', 1, (o) => {
    aendere(o, SERVER, (t) => ersetzeLeerzeile(t, "if (pfad === '/api/w1-probe') {}"))
    aendere(o, JSON_PFAD, bremse((b) => ({ ...b, routen: { ...b.routen, gleich: [...b.routen.gleich, '/api/w1-probe'].sort() } })))
  }],
  ['g1 Probe-Route nur in scripts/leitstand/routen-w1probe.mjs', 0, (o) => {
    mkdirSync(join(o, 'scripts/leitstand'), { recursive: true })
    writeFileSync(join(o, 'scripts/leitstand/routen-w1probe.mjs'), "export const behandle = (pfad) => pfad === '/api/w1-probe'\n")
  }],
  ['g2 Route entfernt, Bestand und Grenze nachgezogen', 0, (o) => {
    aendere(o, SERVER, (t) => t.replace("pfad === '/api/verbrauch'", 'pfad === pfadVerbrauch'))
    aendere(o, JSON_PFAD, bremse((b) => ({ ...b, routen: { ...b.routen, gleich: b.routen.gleich.filter((r) => r !== '/api/verbrauch') } })))
  }],
]

const zeilen = [`Modus ${modus}`]
for (const [name, erwartet, praepariere] of FAELLE) {
  const ordner = modus === 'repo' ? join(w1, 'repo') : join(w1, 'datei', name.split(' ')[0])
  bereite(ordner)
  praepariere(ordner)
  const lauf = spawnSync(process.execPath, ['scripts/check-wachstumsbremse-server.mjs'], { cwd: ordner, encoding: 'utf8' })
  const ausgabe = `${lauf.stdout}${lauf.stderr}`
  const befunde = ausgabe.split('\n').filter((z) => /^\s+- \(/.test(z)).map((z) => z.trim().slice(2))
  const referenz = ausgabe.split('\n').find((z) => /Referenz/.test(z))?.trim() ?? ''
  zeilen.push(`| ${name} | ${lauf.status} ${lauf.status === erwartet ? '(wie erwartet)' : `(ERWARTET ${erwartet})`} | ${befunde.join('<br>') || '—'} | ${referenz} |`)
  if (modus === 'repo') {
    bereite(ordner)
    rmSync(join(ordner, 'scripts/leitstand/routen-w1probe.mjs'), { force: true })
  }
}
console.log(zeilen.join('\n'))
