/**
 * Datei: scripts/leitstand/routen-code.test.mjs
 *
 * Zweck: F46 D4 — Leseroute Code (scripts/leitstand/routen-code.mjs) in einem temporären Git-Repo:
 * Grünfall (Branch, Basis, Dateien mit Art und Zeilen, Verlauf mit Zuordnung, Remote, Commit-
 * Freigabe, Harness), Diff nur für Pfade der aktuellen Liste (außerhalb, '..', absolut, führendes '-'
 * → 400), Kappung, Zeitgrenze, kein Lock und kein Index-Schreiben, kein Git → nicht_verfuegbar, und per
 * echtem HTTP-Aufruf die Host-Prüfung (F-814) vor der Route.
 */

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs'
import { createServer, request } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { raeumeVerzeichnis } from '../_aufraeumen.ts'
import { erzeugeRequestHandler } from '../leitstand-server.mjs'
import {
  baueCodeDiff,
  baueCodeProjektion,
  baueStartvorlageAuszug,
  DIFF_MAX_BYTES,
  findeGitProgramm,
  fuehreGitAus,
  githubWebUrl,
  parseNumstat,
  parseStatus,
  parseZuordnung,
  pruefbefehlAnzeige,
  pruefeCodeHerkunft,
  pruefeDiffPfad,
} from './routen-code.mjs'
import { sicherBefehle } from '../../public/leitstand/code-daten.js'

/** Führt git im Test-Repo aus (nur zum Aufbau der Fixtures). */
function g(repo, ...args) {
  return execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', '-c', 'commit.gpgsign=false', '-c', 'core.autocrlf=false', ...args], { cwd: repo, encoding: 'utf8' })
}

/** Wie g, mit fester Autor- und Committer-Zeit. */
function gZeit(repo, zeit, ...args) {
  return execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', '-c', 'commit.gpgsign=false', ...args], {
    cwd: repo,
    encoding: 'utf8',
    env: { ...process.env, GIT_COMMITTER_DATE: zeit, GIT_AUTHOR_DATE: zeit },
  })
}

/** Dateiname mit HTML-Zeichen (unter Windows sind < und > im Dateinamen verboten). */
const HTML_NAME = "a&b'c.txt"

/**
 * Legt ein Temp-Repo an: main mit zwei Commits, Branch feat/f46-d4-test mit einem Commit, danach
 * Änderungen aller Arten im Arbeitsbaum. Ruft fn auf und räumt auf.
 * @param fn - (repo) => Promise
 */
async function mitRepo(fn) {
  const repo = mkdtempSync(join(tmpdir(), 'f46-code-'))
  try {
    g(repo, 'init', '-q', '-b', 'main')
    writeFileSync(join(repo, 'bleibt.txt'), 'eins\nzwei\n')
    writeFileSync(join(repo, 'weg.txt'), 'weg\n')
    writeFileSync(join(repo, 'alt-name.txt'), 'umbenannt\nbleibt gleich\n')
    mkdirSync(join(repo, 'ordner'))
    writeFileSync(join(repo, 'ordner', 'innen.js'), 'const a = 1\n')
    g(repo, 'add', 'bleibt.txt', 'weg.txt', 'alt-name.txt', 'ordner/innen.js')
    gZeit(repo, '2026-10-02T10:00:00+02:00', 'commit', '-q', '-m', 'F46 D3: Erstes <b>fett</b> (#312)')
    writeFileSync(join(repo, 'zweite.txt'), 'z\n')
    g(repo, 'add', 'zweite.txt')
    gZeit(repo, '2026-10-02T11:30:00+02:00', 'commit', '-q', '-m', 'Fix F-1: Kleinigkeit (#313)')
    g(repo, 'checkout', '-q', '-b', 'feat/f46-d4-test')
    writeFileSync(join(repo, 'ordner', 'innen.js'), 'const a = 1\nconst b = 2\n')
    g(repo, 'add', 'ordner/innen.js')
    g(repo, 'commit', '-q', '-m', 'wip')
    g(repo, 'remote', 'add', 'origin', 'git@github.com:besitzer/repo-name.git')
    // Arbeitsbaum: geändert, gelöscht, umbenannt (gestaged), neu (mit HTML-Zeichen im Namen).
    writeFileSync(join(repo, 'bleibt.txt'), 'eins\nZWEI\ndrei\n')
    rmSync(join(repo, 'weg.txt'))
    g(repo, 'mv', 'alt-name.txt', 'neu-name.txt')
    writeFileSync(join(repo, HTML_NAME), 'x\ny\n')
    mkdirSync(join(repo, 'state'))
    writeFileSync(join(repo, 'state', 'freigabe-commit.md'), 'Freigegeben: 2026-10-02T10:00:00')
    writeFileSync(join(repo, 'CLAUDE.md'), '# x\n')
    await fn(repo)
  } finally {
    raeumeVerzeichnis(repo)
  }
}

test('reine Helfer: GitHub-URL, Status, Numstat, Zuordnung, Pfadprüfung, Prüfbefehl', () => {
  assert.equal(githubWebUrl('https://github.com/DerStefan89/ai-workforce.git\n'), 'https://github.com/DerStefan89/ai-workforce')
  assert.equal(githubWebUrl('git@github.com:o/r.git'), 'https://github.com/o/r')
  assert.equal(githubWebUrl('https://github.com/o/r'), 'https://github.com/o/r')
  assert.equal(githubWebUrl('https://user:token@github.com/o/r.git'), null, 'keine Zugangsdaten in der Ausgabe')
  assert.equal(githubWebUrl('https://gitlab.com/o/r.git'), null)
  assert.equal(githubWebUrl('https://github.com.evil.example/o/r'), null)
  assert.equal(githubWebUrl('javascript:alert(1)//github.com/o/r'), null)
  assert.equal(githubWebUrl('https://github.com/o/r/../x'), null)

  assert.deepEqual(parseStatus(' M a.txt\0R  neu.txt\0alt.txt\0?? x y.txt\0 D weg\0A  neu\0'), [
    { pfad: 'a.txt', art: 'M', xy: ' M' },
    { pfad: 'neu.txt', art: 'R', xy: 'R ', alterPfad: 'alt.txt' },
    { pfad: 'x y.txt', art: '??', xy: '??' },
    { pfad: 'weg', art: 'D', xy: ' D' },
    { pfad: 'neu', art: 'A', xy: 'A ' },
  ])
  const zahlen = parseNumstat('3\t1\ta.txt\0-\t-\tbild.png\0' + '0\t0\t\0alt.txt\0neu.txt\0')
  assert.deepEqual(zahlen.get('a.txt'), { plus: 3, minus: 1 })
  assert.deepEqual(zahlen.get('bild.png'), { plus: null, minus: null })
  assert.deepEqual(zahlen.get('neu.txt'), { plus: 0, minus: 0 })

  assert.deepEqual(parseZuordnung('F46 D3: Eintrag im Detail (#312)'), { feature: 'F46', ws: 'D3', pr: 312 })
  assert.deepEqual(parseZuordnung('F44 WS-7a: Katalog (#305)'), { feature: 'F44', ws: 'WS-7a', pr: 305 })
  assert.deepEqual(parseZuordnung('F25: Projekte'), { feature: 'F25', ws: null, pr: null })
  assert.deepEqual(parseZuordnung('Fix F-986: Chat (#299)'), { feature: null, ws: null, pr: 299 })
  assert.deepEqual(parseZuordnung('Merge branch x'), { feature: null, ws: null, pr: null })

  for (const schlecht of ['', '../x', 'a/../b', '/etc/passwd', 'C:\\x', 'c:x', '\\\\server\\x', '-x', '--output=y', 'a\0b', 'a\nb', 'x'.repeat(5000), null, undefined, 3]) {
    assert.notEqual(pruefeDiffPfad(schlecht), null, JSON.stringify(schlecht))
  }
  assert.equal(pruefeDiffPfad('ordner/a b.txt'), null)
  assert.equal(pruefeDiffPfad('a..b.txt'), null, '".." nur als ganzes Segment verboten')

  assert.equal(pruefbefehlAnzeige(['C:\\Program Files\\nodejs\\node.exe', 'C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js', 'run', 'check']), 'npm run check')
  assert.equal(pruefbefehlAnzeige(['/usr/bin/make', 'test']), 'make test')
  assert.equal(pruefbefehlAnzeige(undefined), null)
})

test('Startvorlagen-Auszug: Allowlist ohne Startziele und Berechtigungskontext', () => {
  const vorlage = JSON.parse(readFileSync('startvorlagen/ai-workforce.json', 'utf8'))
  const auszug = baueStartvorlageAuszug(vorlage, 'startvorlagen/ai-workforce.json', process.cwd())
  assert.equal(auszug.status, 'ok')
  assert.equal(auszug.modell, 'claude-sonnet-5')
  assert.equal(auszug.pruefbefehl, 'npm run check')
  assert.deepEqual(auszug.worker, ['claude-code', 'codex'])
  assert.deepEqual(auszug.werkzeugsaetze, ['lesend', 'schreibend', 'recherchierend'])
  const text = JSON.stringify(auszug)
  for (const verboten of ['claude.exe', 'codex.exe', 'profil-standard', 'werkzeugStartziel', 'berechtigungskontext', 'erlaubte_werkzeuge']) assert.ok(!text.includes(verboten), verboten)
  assert.equal(baueStartvorlageAuszug(null, null, process.cwd()).status, 'fehler')
})

test('Grünfall im Temp-Repo: Branch, Basis, Dateien, Verlauf, Remote, Freigabe, Harness', async () => {
  await mitRepo(async (repo) => {
    const p = await baueCodeProjektion({ repoWurzel: repo, jetzt: Date.now() })
    assert.equal(p.status, 'ok')
    assert.equal(p.branch.status, 'ok')
    assert.equal(p.branch.name, 'feat/f46-d4-test')
    assert.equal(p.branch.losgeloest, false)
    assert.deepEqual({ ...p.basis }, { status: 'ok', ref: 'main', voraus: 1, zurueck: 0 })
    assert.deepEqual(p.remoteWebUrl, { status: 'ok', url: 'https://github.com/besitzer/repo-name', origin: true })
    assert.equal(p.dateien.status, 'ok')
    assert.equal(p.dateien.gekappt, false)
    const je = Object.fromEntries(p.dateien.eintraege.map((e) => [e.pfad, e]))
    assert.equal(je['bleibt.txt'].art, 'M')
    assert.deepEqual([je['bleibt.txt'].plus, je['bleibt.txt'].minus], [2, 1])
    assert.equal(je['weg.txt'].art, 'D')
    assert.equal(je['neu-name.txt'].art, 'R')
    assert.equal(je['neu-name.txt'].alterPfad, 'alt-name.txt')
    assert.equal(je[HTML_NAME].art, '??')
    assert.deepEqual([je[HTML_NAME].plus, je[HTML_NAME].minus], [2, 0])
    assert.equal(je['state/freigabe-commit.md'].art, '??')
    assert.equal(p.verlauf.status, 'ok')
    assert.equal(p.verlauf.ref, 'main')
    assert.equal(p.verlauf.eintraege.length, 2)
    assert.equal(p.verlauf.eintraege[0].betreff, 'Fix F-1: Kleinigkeit (#313)')
    assert.equal(p.verlauf.eintraege[0].abstandMinuten, 90)
    assert.equal(p.verlauf.eintraege[1].betreff, 'F46 D3: Erstes <b>fett</b> (#312)', 'roh, escaped wird im Client')
    assert.deepEqual(p.verlauf.eintraege[1].zuordnung, { feature: 'F46', ws: 'D3', pr: 312 })
    assert.equal(p.verlauf.eintraege[1].abstandMinuten, null)
    assert.equal(p.freigabeCommit.status, 'ok')
    assert.equal(p.freigabeCommit.vorhanden, true)
    assert.equal(typeof p.freigabeCommit.alterMinuten, 'number')
    assert.ok(!JSON.stringify(p.freigabeCommit).includes('Freigegeben'), 'kein Inhalt')
    assert.deepEqual(p.harness, { status: 'ok', claudeMd: true, settings: false, hooks: 0, agents: 0 })
    assert.deepEqual(p.arbeitsverzeichnis, { status: 'ok', vorhanden: true })
  })
})

test('Diff: nur Pfade der aktuellen Liste, Prüfung vor der Allowlist, neue Datei, Kappung', async () => {
  await mitRepo(async (repo) => {
    const ok = await baueCodeDiff({ repoWurzel: repo, pfad: 'bleibt.txt' })
    assert.equal(ok.http, 200)
    assert.equal(ok.koerper.status, 'ok')
    assert.match(ok.koerper.text, /^\+ZWEI$/m)
    assert.equal(ok.koerper.gekuerzt, false)

    const neu = await baueCodeDiff({ repoWurzel: repo, pfad: HTML_NAME })
    assert.equal(neu.koerper.status, 'ok')
    assert.match(neu.koerper.text, /^\+x$/m)

    const umbenannt = await baueCodeDiff({ repoWurzel: repo, pfad: 'neu-name.txt' })
    assert.equal(umbenannt.koerper.status, 'ok')

    // Getrackt, aber unverändert → nicht in der Liste → abgelehnt.
    for (const pfad of ['zweite.txt', 'gibt-es-nicht.txt', '../ausserhalb.txt', 'ordner/../bleibt.txt', join(repo, 'bleibt.txt'), '/etc/passwd', '-p', '--output=x.txt']) {
      const abgelehnt = await baueCodeDiff({ repoWurzel: repo, pfad })
      assert.equal(abgelehnt.http, 400, pfad)
      assert.equal(typeof abgelehnt.koerper.grund, 'string')
    }
    assert.ok(!existsSync(join(repo, 'x.txt')), '--output wurde nicht ausgeführt')

    writeFileSync(join(repo, 'gross.txt'), `${'zeile mit ä\n'.repeat(10000)}`)
    const gross = await baueCodeDiff({ repoWurzel: repo, pfad: 'gross.txt' })
    assert.equal(gross.koerper.status, 'ok')
    assert.equal(gross.koerper.gekuerzt, true)
    assert.ok(Buffer.byteLength(gross.koerper.text) <= DIFF_MAX_BYTES)
    assert.ok(!gross.koerper.text.endsWith('\uFFFD'))
  })
})

test('kein Lock und kein Index-Schreiben durch die Leseroute', async () => {
  await mitRepo(async (repo) => {
    // Eine Datei mit neuer Zeit, gleichem Inhalt: ein normales git status würde den Index auffrischen.
    const datei = join(repo, 'ordner', 'innen.js')
    const spaeter = new Date(Date.now() + 60_000)
    utimesSync(datei, spaeter, spaeter)
    const index = join(repo, '.git', 'index')
    const vorher = { hash: createHash('sha256').update(readFileSync(index)).digest('hex'), mtime: statSync(index).mtimeMs }
    await baueCodeProjektion({ repoWurzel: repo })
    await baueCodeDiff({ repoWurzel: repo, pfad: 'bleibt.txt' })
    assert.ok(!existsSync(join(repo, '.git', 'index.lock')))
    assert.equal(createHash('sha256').update(readFileSync(index)).digest('hex'), vorher.hash)
    assert.equal(statSync(index).mtimeMs, vorher.mtime)
  })
})

test('Zeitgrenze: ein hängender Git-Aufruf endet als Fehler, nicht als Hänger', async () => {
  const repo = mkdtempSync(join(tmpdir(), 'f46-code-zeit-'))
  try {
    g(repo, 'init', '-q')
    const start = Date.now()
    // hash-object --stdin wartet auf die Standardeingabe, die execFile offen hält.
    const ergebnis = await fuehreGitAus(repo, ['hash-object', '--stdin'], { zeitgrenzeMs: 300 })
    assert.equal(ergebnis.ok, false)
    assert.equal(ergebnis.art, 'zeit')
    assert.ok(Date.now() - start < 4000)
  } finally {
    raeumeVerzeichnis(repo)
  }
  // In der Projektion wird ein Zeitfehler zum Feldstatus.
  const zeitGit = async (_repo, args) => (args[0] === 'rev-parse' && args[1] === '--show-toplevel' ? { ok: true, stdout: Buffer.from(process.cwd()), gekuerzt: false } : { ok: false, art: 'zeit', grund: 'Zeitgrenze von 5000 ms überschritten' })
  const p = await baueCodeProjektion({ repoWurzel: process.cwd(), git: zeitGit })
  assert.equal(p.status, 'ok')
  assert.equal(p.dateien.status, 'fehler')
  assert.equal(p.branch.status, 'fehler')
  assert.equal(p.verlauf.status, 'fehler')
})

test('kein Git: Ordner ohne Repo, Unterordner eines Repos, fehlendes git', async () => {
  const leer = mkdtempSync(join(tmpdir(), 'f46-code-leer-'))
  try {
    const p = await baueCodeProjektion({ repoWurzel: leer })
    assert.equal(p.status, 'nicht_verfuegbar')
    assert.equal(p.absoluterPfad, leer)
    const d = await baueCodeDiff({ repoWurzel: leer, pfad: 'a.txt' })
    assert.equal(d.koerper.status, 'nicht_verfuegbar')
  } finally {
    raeumeVerzeichnis(leer)
  }
  await mitRepo(async (repo) => {
    const p = await baueCodeProjektion({ repoWurzel: join(repo, 'ordner') })
    assert.equal(p.status, 'nicht_verfuegbar', 'Git darf nicht gegen das umgebende Repo laufen')
  })
  const ohneGit = async () => ({ ok: false, art: 'fehlt', grund: 'git ist nicht installiert oder nicht im PATH' })
  const p = await baueCodeProjektion({ repoWurzel: process.cwd(), git: ohneGit })
  assert.equal(p.status, 'nicht_verfuegbar')
  assert.match(p.grund, /nicht installiert/)
})

test('HTTP: Host-Prüfung greift vor der Route; Diff-Parameter wird geprüft', async () => {
  await mitRepo(async (repo) => {
    const basisVerzeichnis = `kontrollzustand-test-f46-code-${randomUUID()}`
    const handler = erzeugeRequestHandler({ basisVerzeichnis, startvorlagePfad: 'startvorlagen/beispielprojekt.json', repoWurzel: repo, globalerLaufZustand: { aktiv: false, laufId: null, abortController: null } })
    const server = createServer(handler)
    await new Promise((ok) => server.listen(0, '127.0.0.1', ok))
    try {
      const { port } = server.address()
      const basis = `http://127.0.0.1:${port}`
      const normal = await fetch(`${basis}/api/code`)
      assert.equal(normal.status, 200)
      const koerper = await normal.json()
      assert.equal(koerper.status, 'ok')
      assert.equal(koerper.startvorlage.status, 'ok')

      const fremd = await new Promise((ok, fehler) => {
        const anfrage = request({ host: '127.0.0.1', port, path: '/api/code', headers: { host: 'evil.example' } }, (antwort) => {
          antwort.resume()
          ok(antwort.statusCode)
        })
        anfrage.on('error', fehler)
        anfrage.end()
      })
      assert.equal(fremd, 403)

      const diff = await fetch(`${basis}/api/code/diff?pfad=${encodeURIComponent('bleibt.txt')}`)
      assert.equal(diff.status, 200)
      const ausserhalb = await fetch(`${basis}/api/code/diff?pfad=${encodeURIComponent('../x')}`)
      assert.equal(ausserhalb.status, 400)
      const ohne = await fetch(`${basis}/api/code/diff`)
      assert.equal(ohne.status, 400)
      const post = await fetch(`${basis}/api/code`, { method: 'POST', body: '{}', headers: { origin: basis } })
      assert.notEqual(post.status, 200, 'nur GET')
    } finally {
      await new Promise((ok) => server.close(ok))
      raeumeVerzeichnis(basisVerzeichnis)
    }
  })
})

/** Liest git status --porcelain (Prüfhilfe). */
function porcelain(repo) {
  return g(repo, 'status', '--porcelain=v1', '--untracked-files=all')
    .split('\n')
    .filter((z) => z !== '')
}

/** PowerShell, falls vorhanden (Windows: powershell, sonst pwsh), sonst null. */
function powershell() {
  for (const programm of process.platform === 'win32' ? ['powershell', 'pwsh'] : ['pwsh']) {
    try {
      execFileSync(programm, ['-NoProfile', '-NonInteractive', '-Command', 'exit 0'], { stdio: 'ignore' })
      return programm
    } catch {
      // nächster Kandidat
    }
  }
  return null
}

test('Sichern ausgeführt (PowerShell): git add der Leseroute staged alles — Umbenennung, gestagte und ungestagte Löschung, Sonderzeichen (Prüfpass qa 1)', async (t) => {
  const ps = powershell()
  if (ps === null) {
    t.skip('keine PowerShell auf diesem Rechner')
    return
  }
  await mitRepo(async (repo) => {
    g(repo, 'config', 'core.autocrlf', 'false')
    // Zusätzlich: gestagte Löschung (git rm) und Namen mit Leerzeichen, Umlaut, Apostroph, führendem „-“, Glob-Zeichen.
    g(repo, 'rm', '-q', 'zweite.txt')
    for (const name of ['leer zeichen.txt', 'ä.txt', "o'k.txt", '-x.txt', 'a[1].txt', 'x’y.txt']) writeFileSync(join(repo, name), 'n\n')
    const p = await baueCodeProjektion({ repoWurzel: repo })
    const befehle = sicherBefehle(p)
    assert.ok(Array.isArray(befehle.zeilen), JSON.stringify(befehle))
    const adds = befehle.zeilen.filter((z) => z.startsWith('git add '))
    assert.ok(adds.length >= 1)
    for (const zeile of adds) execFileSync(ps, ['-NoProfile', '-NonInteractive', '-Command', `${zeile}; exit $LASTEXITCODE`], { cwd: repo, stdio: 'pipe' })
    // Danach ist nichts mehr ungestaged oder ungetrackt.
    const rest = porcelain(repo).filter((z) => z[1] !== ' ')
    assert.deepEqual(rest, [], 'nach git add ist alles gestaged')
    assert.ok(porcelain(repo).some((z) => z.startsWith('D ') && z.endsWith('zweite.txt')), 'gestagte Löschung bleibt gestaged')
  })
})

test('Randfälle der Route: detached HEAD, ohne origin, ohne Commits, mehr als 500 Dateien, fehlender Ordner', async () => {
  await mitRepo(async (repo) => {
    g(repo, 'remote', 'remove', 'origin')
    g(repo, 'checkout', '-q', '--detach')
    const p = await baueCodeProjektion({ repoWurzel: repo })
    assert.equal(p.branch.losgeloest, true)
    assert.equal(p.branch.name, null)
    assert.deepEqual(p.remoteWebUrl, { status: 'ok', url: null, origin: false })
    assert.equal(sicherBefehle(p).grund, 'keinBranch')
  })
  const leer = mkdtempSync(join(tmpdir(), 'f46-code-unborn-'))
  try {
    g(leer, 'init', '-q', '-b', 'main')
    writeFileSync(join(leer, 'a.txt'), 'a\n')
    g(leer, 'add', 'a.txt')
    const p = await baueCodeProjektion({ repoWurzel: leer })
    assert.equal(p.status, 'ok')
    assert.deepEqual(p.verlauf, { status: 'ok', ref: null, eintraege: [] }, 'ohne Commits ein Leerzustand')
    assert.equal(p.dateien.eintraege[0].xy, 'A ')
    for (let i = 0; i < 505; i++) writeFileSync(join(leer, `n${String(i).padStart(3, '0')}.txt`), 'x')
    const viele = await baueCodeProjektion({ repoWurzel: leer })
    assert.equal(viele.dateien.gekappt, true)
    assert.equal(viele.dateien.anzahl, 506)
    assert.equal(viele.dateien.eintraege.length, 500)
    assert.equal(sicherBefehle(viele).grund, 'gekappt')
  } finally {
    raeumeVerzeichnis(leer)
  }
  const fehlt = await baueCodeProjektion({ repoWurzel: join(tmpdir(), `f46-gibt-es-nicht-${randomUUID()}`) })
  assert.equal(fehlt.status, 'nicht_verfuegbar')
  assert.deepEqual(fehlt.arbeitsverzeichnis, { status: 'ok', vorhanden: false })
})

test('Git: absoluter Programmpfad, relative PATH-Einträge zählen nicht, GIT_DIR der Umgebung lenkt nicht um (Prüfpass cr 3, cr 9)', async () => {
  const absolut = findeGitProgramm()
  assert.ok(absolut === null || /^(?:[A-Za-z]:[\\/]|\/)/.test(absolut), String(absolut))
  assert.equal(findeGitProgramm('.;relativ;bin', 'win32'), null)
  assert.equal(findeGitProgramm('.:relativ', 'linux'), null)
  await mitRepo(async (repo) => {
    const anderes = mkdtempSync(join(tmpdir(), 'f46-code-anderes-'))
    const vorher = process.env.GIT_DIR
    try {
      g(anderes, 'init', '-q', '-b', 'fremd')
      process.env.GIT_DIR = join(anderes, '.git')
      const p = await baueCodeProjektion({ repoWurzel: repo })
      assert.equal(p.branch.name, 'feat/f46-d4-test')
    } finally {
      if (vorher === undefined) delete process.env.GIT_DIR
      else process.env.GIT_DIR = vorher
      raeumeVerzeichnis(anderes)
    }
  })
})

test('Herkunft: fremde Seite (Sec-Fetch-Site cross-site) bekommt 403, Leitstand selbst und curl nicht', async () => {
  assert.equal(pruefeCodeHerkunft({ headers: {} }), null)
  assert.equal(pruefeCodeHerkunft({ headers: { 'sec-fetch-site': 'same-origin' } }), null)
  assert.equal(pruefeCodeHerkunft({ headers: { 'sec-fetch-site': 'none' } }), null)
  assert.notEqual(pruefeCodeHerkunft({ headers: { 'sec-fetch-site': 'cross-site' } }), null)
  assert.notEqual(pruefeCodeHerkunft({ headers: { 'sec-fetch-site': 'same-site' } }), null)
  await mitRepo(async (repo) => {
    const basisVerzeichnis = `kontrollzustand-test-f46-code-${randomUUID()}`
    const handler = erzeugeRequestHandler({ basisVerzeichnis, startvorlagePfad: 'startvorlagen/beispielprojekt.json', repoWurzel: repo, globalerLaufZustand: { aktiv: false, laufId: null, abortController: null } })
    const server = createServer(handler)
    await new Promise((ok) => server.listen(0, '127.0.0.1', ok))
    try {
      const { port } = server.address()
      const status = (pfad, kopf) =>
        new Promise((ok, fehler) => {
          const anfrage = request({ host: '127.0.0.1', port, path: pfad, headers: kopf }, (antwort) => {
            antwort.resume()
            ok(antwort.statusCode)
          })
          anfrage.on('error', fehler)
          anfrage.end()
        })
      assert.equal(await status('/api/code', { 'sec-fetch-site': 'cross-site' }), 403)
      assert.equal(await status('/api/code/diff?pfad=bleibt.txt', { 'sec-fetch-site': 'cross-site' }), 403)
      assert.equal(await status('/api/code', { 'sec-fetch-site': 'same-origin' }), 200)
      // Gleichzeitige Abrufe teilen sich einen Aufbau — beide bekommen 200.
      const [a, b] = await Promise.all([fetch(`http://127.0.0.1:${port}/api/code`), fetch(`http://127.0.0.1:${port}/api/code`)])
      assert.deepEqual([a.status, b.status], [200, 200])
      assert.equal(JSON.stringify(await a.json()), JSON.stringify(await b.json()))
    } finally {
      await new Promise((ok) => server.close(ok))
      raeumeVerzeichnis(basisVerzeichnis)
    }
  })
})
