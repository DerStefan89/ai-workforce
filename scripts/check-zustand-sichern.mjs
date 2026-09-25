#!/usr/bin/env node
/**
 * Datei: scripts/check-zustand-sichern.mjs
 *
 * Zweck: Gate für F-733 (`npm run zustand:sichern`, scripts/zustand-sichern.mjs).
 * Ruft das echte Skript als Kindprozess in einem Wegwerf-Git-Repo im
 * tmp-Verzeichnis auf — je Fall ein frisches Repo mit einem Init-Commit,
 * getracktem `kontrollzustand/` und ignoriertem Lock (wie .gitignore hier).
 *
 * Rot (Exit ≠ 0, passender Abbruchgrund in der Meldung, weder Branch noch
 * Commit entstanden, Index unverändert):
 * (1) Lock `kontrollzustand/.leitstand.lock` vorhanden,
 * (2) fremde Datei außerhalb kontrollzustand/ geändert, (2b) fremde Datei
 *     ungetrackt, (2c) Altlast bereits gestagt,
 * (3) nicht auf main, (3b) main hinter origin/main,
 * (4) keine Änderung in kontrollzustand/.
 * Grün:
 * (5) nur kontrollzustand/ geändert — neu, geändert, gelöscht — plus Altlast
 *     stdin-check.js → Branch zustand/<datum> ist ausgecheckt, gestagt ist
 *     ausschließlich kontrollzustand/ inkl. Löschung, die Altlast bleibt
 *     ungestagt, KEIN Commit entstanden; die Ausgabe enthält keine
 *     Set-Content-Freigabezeile, nur genau einen Freigabe-Hinweis (F-736).
 * (6) Kollision: zustand/<datum> existiert lokal → zustand/<datum>-2;
 *     (6b) dasselbe, wenn er nur als origin/zustand/<datum> bekannt ist.
 * Der Mengenabgleich nach `git add` (OneDrive-Falle) ist ohne echte
 * Reparse-Points nicht nachstellbar und nur im Unit-Test belegt.
 *
 * Wird aufgerufen von: `npm run check`.
 *
 * Aufruf: node scripts/check-zustand-sichern.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { formatiereDatum } from './zustand-sichern.mjs'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const SKRIPT = fileURLToPath(new URL('./zustand-sichern.mjs', import.meta.url))
const DATUM = formatiereDatum(new Date())
const befunde = []
const wegwerf = []

console.log('\n=== Check F-733: zustand:sichern ===\n')

/** Git im Wegwerf-Repo, ohne Shell. */
function git(repo, argumente) {
  return execFileSync('git', argumente, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

/** Frisches Wegwerf-Repo auf main mit einem Init-Commit inkl. kontrollzustand/. */
function neuesRepo() {
  const repo = mkdtempSync(join(tmpdir(), 'check-zustand-sichern-'))
  wegwerf.push(repo)
  git(repo, ['init', '--quiet', '--initial-branch=main'])
  git(repo, ['config', 'user.email', 'test@example.invalid'])
  git(repo, ['config', 'user.name', 'Test'])
  mkdirSync(join(repo, 'kontrollzustand'))
  writeFileSync(join(repo, '.gitignore'), 'kontrollzustand/.leitstand.lock\n')
  writeFileSync(join(repo, 'README.md'), 'init\n')
  writeFileSync(join(repo, 'kontrollzustand', 'alt.json'), '{}\n')
  git(repo, ['add', '--', '.gitignore', 'README.md', 'kontrollzustand/alt.json'])
  git(repo, ['commit', '--quiet', '-m', 'init'])
  return repo
}

/** Legt eine neue Zustandsdatei an. */
function neueZustandsdatei(repo) {
  mkdirSync(join(repo, 'kontrollzustand', 'lauf-1'), { recursive: true })
  writeFileSync(join(repo, 'kontrollzustand', 'lauf-1', 'checkpoint.json'), '{"n":1}\n')
}

/** Startet das echte Skript im Repo. */
function starte(repo) {
  const r = spawnSync(process.execPath, [SKRIPT], { cwd: repo, encoding: 'utf8' })
  return { code: r.status, ausgabe: `${r.stdout}${r.stderr}` }
}

/** Anzahl Commits auf HEAD. */
function commitAnzahl(repo) {
  return Number(git(repo, ['rev-list', '--count', 'HEAD']).trim())
}

/** Gestagte Pfade, sortiert. */
function gestagtePfade(repo) {
  return git(repo, ['diff', '--cached', '--no-renames', '--name-only']).trim().split('\n').filter(Boolean).sort()
}

/** Rot-Fall: erwartet Exit ≠ 0, Grund in der Meldung, keinen neuen Branch/Commit, unveränderten Index. */
function rotFall(name, vorbereiten, grund) {
  const repo = neuesRepo()
  vorbereiten(repo)
  const commitsVorher = commitAnzahl(repo)
  const indexVorher = JSON.stringify(gestagtePfade(repo))
  const { code, ausgabe } = starte(repo)
  const branches = git(repo, ['for-each-ref', '--format=%(refname:short)', 'refs/heads/zustand/']).trim()
  if (code === 0 || !ausgabe.includes(`ABGEBROCHEN (${grund})`)) {
    befunde.push(`${name}: erwartet Abbruch '${grund}', bekam Exit ${code}:\n${ausgabe}`)
  } else if (branches.length > 0 || commitAnzahl(repo) !== commitsVorher) {
    befunde.push(`${name}: Abbruch, aber Branch/Commit entstanden (${branches || 'kein Branch'})`)
  } else if (JSON.stringify(gestagtePfade(repo)) !== indexVorher) {
    befunde.push(`${name}: Abbruch, aber Index verändert`)
  } else {
    console.log(`  ✓ ${name} → Abbruch (${grund})`)
  }
}

try {
  rotFall(
    '(1) Lock vorhanden',
    (repo) => {
      neueZustandsdatei(repo)
      writeFileSync(join(repo, 'kontrollzustand', '.leitstand.lock'), '{"pid":1}\n')
    },
    'lock'
  )
  rotFall(
    '(2) fremde Datei geändert',
    (repo) => {
      neueZustandsdatei(repo)
      writeFileSync(join(repo, 'README.md'), 'geändert\n')
    },
    'fremd'
  )
  rotFall(
    '(3) nicht auf main',
    (repo) => {
      git(repo, ['switch', '--quiet', '-c', 'feat/anderes'])
      neueZustandsdatei(repo)
    },
    'branch'
  )
  rotFall('(4) keine Änderung', () => {}, 'leer')
  rotFall(
    '(2b) fremde Datei ungetrackt',
    (repo) => {
      neueZustandsdatei(repo)
      writeFileSync(join(repo, 'neu.txt'), 'x\n')
    },
    'fremd'
  )
  rotFall(
    '(2c) Altlast bereits gestagt',
    (repo) => {
      neueZustandsdatei(repo)
      writeFileSync(join(repo, 'stdin-check.js'), '// Altlast\n')
      git(repo, ['add', '--', 'stdin-check.js'])
    },
    'fremd'
  )
  rotFall(
    '(3b) main hinter origin/main',
    (repo) => {
      git(repo, ['switch', '--quiet', '-c', 'neuer'])
      writeFileSync(join(repo, 'README.md'), 'neuer\n')
      git(repo, ['add', '--', 'README.md'])
      git(repo, ['commit', '--quiet', '-m', 'neuer'])
      git(repo, ['update-ref', 'refs/remotes/origin/main', 'neuer'])
      git(repo, ['switch', '--quiet', 'main'])
      git(repo, ['branch', '--quiet', '-D', 'neuer'])
      neueZustandsdatei(repo)
    },
    'veraltet'
  )

  // (5) Grünfall — neue, geänderte und gelöschte Zustandsdatei, dazu eine Altlast
  {
    const repo = neuesRepo()
    neueZustandsdatei(repo)
    writeFileSync(join(repo, 'kontrollzustand', 'alt.json'), '{"x":2}\n')
    writeFileSync(join(repo, 'kontrollzustand', 'weg.json'), '{}\n')
    git(repo, ['add', '--', 'kontrollzustand/weg.json'])
    git(repo, ['commit', '--quiet', '-m', 'weg'])
    rmSync(join(repo, 'kontrollzustand', 'weg.json'))
    writeFileSync(join(repo, 'stdin-check.js'), '// Altlast\n')
    const commitsVorher = commitAnzahl(repo)
    const { code, ausgabe } = starte(repo)
    const branch = git(repo, ['rev-parse', '--abbrev-ref', 'HEAD']).trim()
    const gestagt = gestagtePfade(repo)
    const erwartet = ['kontrollzustand/alt.json', 'kontrollzustand/lauf-1/checkpoint.json', 'kontrollzustand/weg.json']
    const altlastUngestagt = git(repo, ['status', '--porcelain=v1', '--', 'stdin-check.js']).startsWith('??')
    if (code !== 0) befunde.push(`(5) Grünfall: Exit ${code}:\n${ausgabe}`)
    else if (branch !== `zustand/${DATUM}`) befunde.push(`(5) Grünfall: Branch '${branch}' statt 'zustand/${DATUM}'`)
    else if (JSON.stringify(gestagt) !== JSON.stringify(erwartet)) befunde.push(`(5) Grünfall: gestagt ${JSON.stringify(gestagt)}`)
    else if (!altlastUngestagt) befunde.push('(5) Grünfall: Altlast stdin-check.js wurde gestagt')
    else if (commitAnzahl(repo) !== commitsVorher) befunde.push('(5) Grünfall: es ist ein Commit entstanden')
    else if (!ausgabe.includes('3 Datei(en) gestagt, davon 1 Löschung(en)') || !ausgabe.includes(`git push -u origin zustand/${DATUM}`)) {
      befunde.push(`(5) Grünfall: Ausgabe ohne Anzahl/Befehle:\n${ausgabe}`)
    } else if (ausgabe.includes('Set-Content') || ausgabe.split('freigabe-commit.md').length - 1 !== 1) {
      befunde.push(`(5) Grünfall: Ausgabe enthält Freigabe-Zeilen statt genau eines Hinweises (F-736):\n${ausgabe}`)
    } else console.log(`  ✓ (5) Grünfall → zustand/${DATUM}, nur kontrollzustand/ gestagt, kein Commit`)
  }

  // (6) Kollision
  {
    const repo = neuesRepo()
    git(repo, ['branch', `zustand/${DATUM}`])
    neueZustandsdatei(repo)
    const { code, ausgabe } = starte(repo)
    const branch = git(repo, ['rev-parse', '--abbrev-ref', 'HEAD']).trim()
    if (code !== 0 || branch !== `zustand/${DATUM}-2`) befunde.push(`(6) Kollision: Exit ${code}, Branch '${branch}':\n${ausgabe}`)
    else console.log(`  ✓ (6) Kollision → zustand/${DATUM}-2`)
  }

  // (6b) Kollision mit einem nur entfernt bekannten Branch
  {
    const repo = neuesRepo()
    git(repo, ['update-ref', `refs/remotes/origin/zustand/${DATUM}`, 'HEAD'])
    neueZustandsdatei(repo)
    const { code, ausgabe } = starte(repo)
    const branch = git(repo, ['rev-parse', '--abbrev-ref', 'HEAD']).trim()
    if (code !== 0 || branch !== `zustand/${DATUM}-2`) befunde.push(`(6b) Remote-Kollision: Exit ${code}, Branch '${branch}':\n${ausgabe}`)
    else console.log(`  ✓ (6b) Remote-Kollision → zustand/${DATUM}-2`)
  }
} catch (fehler) {
  befunde.push(`Unerwarteter Fehler: ${fehler instanceof Error ? fehler.message : String(fehler)}`)
} finally {
  for (const repo of wegwerf) raeumeVerzeichnis(repo)
}

if (befunde.length > 0) {
  console.error(`\n✗ ${befunde.length} Befund(e):\n${befunde.map((b) => `  - ${b}`).join('\n')}`)
  process.exit(1)
}
console.log('\n✓ zustand:sichern: alle Fälle wie erwartet\n')
