/**
 * Datei: scripts/check-skelett-herkunft.mjs
 *
 * Zweck: F45 B1a-2 (F-700) — Drift-Gate Projekt-Skelett ↔ HERKUNFT.md. Jede Datei unter
 * vorlagen/projekt-skelett/ (außer HERKUNFT.md selbst) braucht eine Zeile im Abschnitt „Prüfsummen“ von
 * vorlagen/projekt-skelett/HERKUNFT.md mit ihrem SHA-256 (über die Bytes im Arbeitsbaum; `.gitattributes`
 * `* text=auto eol=lf` macht sie auf Windows und in der CI gleich). Rot, wenn eine Datei keine Zeile hat,
 * eine Zeile auf eine fehlende Datei zeigt oder der Hash abweicht — jede Änderung am Skelett muss also
 * bewusst in HERKUNFT.md nachgezogen werden. Drift zwischen Template-Repo und Skelett prüft dieses Gate
 * nicht (das Template ist in der CI nicht vorhanden); dafür nennt HERKUNFT.md den Template-Commit und
 * je Datei die Herkunft (template / lokal geändert / lokal neu).
 *
 * Pflege: `node scripts/check-skelett-herkunft.mjs --ausgeben` druckt die Tabelle (schreibt nichts);
 * die Spalte Herkunft vergleicht dafür lesend über den Git-Starter mit dem Template-Commit aus
 * HERKUNFT.md (`?`, wenn der Commit lokal fehlt).
 *
 * Wird aufgerufen von: npm run check.
 *
 * Aufruf: node scripts/check-skelett-herkunft.mjs [--ausgeben]
 * Exit 0 = sauber, Exit 1 = Befund
 */

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { fuehreGitSync } from '../src/git-starter/index.ts'
import { sammleSkelettDateien } from '../src/projekt-anlegen/index.ts'

export const SKELETT_WURZEL = join(import.meta.dirname, '..', 'vorlagen', 'projekt-skelett')
const ZEILE = /^\|\s*`([^`]+)`\s*\|\s*`([0-9a-f]{64})`\s*\|\s*([^|]+?)\s*\|\s*$/

/**
 * SHA-256 einer Datei (hex).
 * @param pfad - absoluter Pfad
 * @returns Hash
 */
export function hashDatei(pfad) {
  return createHash('sha256').update(readFileSync(pfad)).digest('hex')
}

/**
 * Liest die Prüfsummen-Tabelle aus HERKUNFT.md.
 * @param herkunftText - Inhalt von HERKUNFT.md
 * @returns Map Pfad ('/'-getrennt) → { hash, herkunft }; doppelte Zeilen landen in doppelt
 */
export function leseProefsummen(herkunftText) {
  const eintraege = new Map()
  const doppelt = []
  const abschnitt = herkunftText.split(/^## Prüfsummen\s*$/m)[1]?.split(/^## /m)[0] ?? ''
  for (const zeile of abschnitt.split(/\r?\n/)) {
    const treffer = zeile.match(ZEILE)
    if (treffer === null) continue
    if (eintraege.has(treffer[1])) doppelt.push(treffer[1])
    eintraege.set(treffer[1], { hash: treffer[2], herkunft: treffer[3] })
  }
  return { eintraege, doppelt }
}

/**
 * Vergleicht das Skelett mit HERKUNFT.md.
 * @param skelettWurzel - Ordner des Skeletts
 * @returns Liste der Befunde (leer = sauber)
 */
export function pruefeSkelettHerkunft(skelettWurzel = SKELETT_WURZEL) {
  const befunde = []
  let text
  try {
    text = readFileSync(join(skelettWurzel, 'HERKUNFT.md'), 'utf8')
  } catch (fehler) {
    return [`HERKUNFT.md nicht lesbar: ${fehler.message}`]
  }
  const { eintraege, doppelt } = leseProefsummen(text)
  if (eintraege.size === 0) befunde.push('HERKUNFT.md: Abschnitt „## Prüfsummen“ fehlt oder hat keine Zeilen')
  for (const pfad of doppelt) befunde.push(`HERKUNFT.md: '${pfad}' steht mehrfach in den Prüfsummen`)
  const dateien = sammleSkelettDateien(skelettWurzel).map((p) => p.split(sep).join('/'))
  for (const pfad of dateien) {
    const eintrag = eintraege.get(pfad)
    if (eintrag === undefined) {
      befunde.push(`'${pfad}' liegt im Skelett, fehlt aber in HERKUNFT.md (Prüfsummen)`)
      continue
    }
    const ist = hashDatei(join(skelettWurzel, pfad))
    if (ist !== eintrag.hash) befunde.push(`'${pfad}': Hash weicht ab (HERKUNFT.md ${eintrag.hash.slice(0, 12)}…, Datei ${ist.slice(0, 12)}…) — Änderung bewusst in HERKUNFT.md nachziehen`)
  }
  for (const pfad of eintraege.keys()) {
    if (!dateien.includes(pfad)) befunde.push(`HERKUNFT.md nennt '${pfad}', die Datei fehlt im Skelett`)
  }
  return befunde
}

/**
 * Druckt die Prüfsummen-Tabelle für die Pflege (schreibt nichts).
 * @param skelettWurzel - Ordner des Skeletts
 * @returns Zeilen
 */
export function baueTabelle(skelettWurzel = SKELETT_WURZEL) {
  const text = readFileSync(join(skelettWurzel, 'HERKUNFT.md'), 'utf8')
  let commit = text.match(/\*\*Commit:\*\*\s*`([0-9a-f]{7,40})`/)?.[1] ?? null
  if (commit !== null) {
    // Commit lokal nicht vorhanden (z. B. ohne Remote „template“) → Herkunft unbekannt ('?'), nicht „lokal neu“.
    try {
      fuehreGitSync(['cat-file', '-e', `${commit}^{commit}`], { cwd: skelettWurzel, encoding: 'utf8', stdio: ['ignore', 'ignore', 'ignore'] })
    } catch {
      commit = null
    }
  }
  const zeilen = ['| Pfad | SHA-256 | Herkunft |', '|---|---|---|']
  for (const pfad of sammleSkelettDateien(skelettWurzel).map((p) => p.split(sep).join('/'))) {
    const hash = hashDatei(join(skelettWurzel, pfad))
    let herkunft = '?'
    if (commit !== null) {
      try {
        const quelle = fuehreGitSync(['show', `${commit}:${pfad}`], { cwd: skelettWurzel, encoding: 'buffer', stdio: ['ignore', 'pipe', 'ignore'] })
        herkunft = createHash('sha256').update(quelle).digest('hex') === hash ? 'template' : 'lokal geändert'
      } catch {
        herkunft = 'lokal neu'
      }
    }
    zeilen.push(`| \`${pfad}\` | \`${hash}\` | ${herkunft} |`)
  }
  return zeilen
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.includes('--ausgeben')) {
    for (const zeile of baueTabelle()) console.log(zeile)
    process.exit(0)
  }
  console.log('\n=== Skelett ↔ HERKUNFT.md ===\n')
  const befunde = pruefeSkelettHerkunft()
  if (befunde.length === 0) {
    console.log('✓ Jede Skelett-Datei steht mit passendem SHA-256 in HERKUNFT.md.\n')
    process.exit(0)
  }
  console.log(`✗ ${befunde.length} Befund(e):\n`)
  for (const befund of befunde) console.log(`  - ${befund}`)
  console.log('')
  process.exit(1)
}
