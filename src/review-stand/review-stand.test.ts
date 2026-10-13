/**
 * Datei: src/review-stand/review-stand.test.ts
 *
 * Zweck: Unit-Tests des geprüften Stands (F45 B2a-3b): reine Teile (parse…, fingerabdruckAusTeilen, standIstVeraltet) und
 * beide Hüllen an einem Wegwerf-Repo — gleicher Stand, Änderung, neue Datei, Ausschluss kontrollzustand/, Commit
 * derselben Inhalte, nur berührt, CRLF in beiden Lagen (Advisor N3), kein Repo/kein Commit, Kappen, sync = async.
 *
 * Wird aufgerufen von: npm run test (node:test)
 */

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { raeumeVerzeichnis } from '../../scripts/_aufraeumen.ts'
import { fuehreGitSync } from '../git-starter/index.ts'
import { fingerabdruckAusTeilen, leseGeprueftenStandAsync, leseGeprueftenStandSync, parseCheckAttrFilter, parseDiffIndexRaw, parseLsTree, STANDARD_GRENZEN, standIstVeraltet } from './index.ts'

const basis = mkdtempSync(join(tmpdir(), 'review-stand-test-'))
after(() => raeumeVerzeichnis(basis))

/**
 * Legt ein Wegwerf-Repo mit einem Commit an.
 * @param name - Ordnername
 * @param dateien - Pfad → Inhalt
 * @param autocrlf - core.autocrlf
 * @returns Pfad
 */
function repo(name: string, dateien: Record<string, string>, autocrlf = 'false'): string {
  const w = join(basis, name)
  mkdirSync(w, { recursive: true })
  const git = (a: string[]) => fuehreGitSync(a, { cwd: w, encoding: 'utf8' })
  git(['init', '--quiet'])
  for (const [k, v] of [['user.email', 'a@b.invalid'], ['user.name', 'T'], ['core.autocrlf', autocrlf]]) git(['config', k, v])
  for (const [pfad, inhalt] of Object.entries(dateien)) {
    mkdirSync(join(w, pfad, '..'), { recursive: true })
    writeFileSync(join(w, pfad), inhalt)
  }
  git(['add', '--', ...Object.keys(dateien)])
  git(['commit', '--quiet', '-m', 'init'])
  return w
}

/**
 * Stand oder Fehler.
 * @param w - Wurzel
 * @returns Stand
 */
function stand(w: string) {
  const e = leseGeprueftenStandSync(w)
  assert.ok(e.stand !== null, `Stand erwartet: ${e.grund}`)
  return e.stand
}

/**
 * Setzt die mtime einer Datei in die Zukunft (nur berührt).
 * @param pfad - Datei
 */
function beruehre(pfad: string): void {
  const t = new Date(Date.now() + 10_000)
  utimesSync(pfad, t, t)
}

test('parse: ls-tree, diff-index (gelöscht/geändert), check-attr', () => {
  const baum = parseLsTree('100644 blob 422c2b7ab3b3c668038da977e4e93a5fc623169c\ta b.txt\x00160000 commit 422c2b7ab3b3c668038da977e4e93a5fc623169c\tsub\0')
  assert.deepEqual([...baum.keys()], ['a b.txt', 'sub'])
  assert.equal(baum.get('sub')?.typ, 'commit')
  const z = '0'.repeat(40)
  const h = 'a'.repeat(40)
  assert.deepEqual(parseDiffIndexRaw(`:100644 100644 ${h} ${z} M\0x.txt\0:100644 000000 ${h} ${z} D\0y.txt\0`), { geaendert: ['x.txt'], geloescht: ['y.txt'], submodule: [] })
  // Code-Review 4: ein neu hinzugefügtes Submodul (Modus 160000, im HEAD-Baum noch nicht vorhanden) wird erkannt.
  assert.deepEqual(parseDiffIndexRaw(`:000000 160000 ${z} ${h} A\0sub\0`).submodule, ['sub'])
  assert.throws(() => parseDiffIndexRaw('kaputt\0x\0'))
  assert.deepEqual(parseCheckAttrFilter('a\0filter\0unspecified\0b\0filter\0lfs\0c\0filter\0unset\0'), ['b'])
})

test('fingerabdruckAusTeilen: Ausnahmen fallen weg, gelöscht fällt weg, gehasht überschreibt; nur inhalt zählt', () => {
  const baum = new Map([
    ['a.txt', '1'],
    ['kontrollzustand/x.json', '2'],
  ])
  const ohne = fingerabdruckAusTeilen({ commit: 'c1', baum, geloescht: [], gehasht: new Map() })
  const mitKz = fingerabdruckAusTeilen({ commit: 'c2', baum, geloescht: [], gehasht: new Map([['kontrollzustand/neu.json', '9']]) })
  assert.equal(ohne.inhalt, mitKz.inhalt)
  assert.equal(standIstVeraltet(ohne, mitKz), false, 'anderer Commit, gleicher Inhalt → nicht veraltet')
  const geaendert = fingerabdruckAusTeilen({ commit: 'c1', baum, geloescht: [], gehasht: new Map([['a.txt', '3']]) })
  assert.equal(standIstVeraltet(ohne, geaendert), true)
  const geloescht = fingerabdruckAusTeilen({ commit: 'c1', baum, geloescht: ['a.txt'], gehasht: new Map() })
  assert.equal(standIstVeraltet(ohne, geloescht), true)
  assert.equal(standIstVeraltet(null, ohne), null)
  assert.equal(standIstVeraltet(ohne, undefined), null)
})

test('Hülle: gleicher Stand, geändert, neu, gelöscht, kontrollzustand/, nur berührt, Commit derselben Inhalte', () => {
  const w = repo('grund', { 'a.txt': 'a\n', 'src/b.ts': 'export const b = 1\n' })
  const s0 = stand(w)
  assert.match(s0.commit, /^[0-9a-f]{40}$/)
  assert.match(s0.inhalt, /^[0-9a-f]{64}$/)
  assert.equal(standIstVeraltet(s0, stand(w)), false)
  beruehre(join(w, 'a.txt'))
  assert.equal(standIstVeraltet(s0, stand(w)), false, 'nur berührt')
  mkdirSync(join(w, 'kontrollzustand', 'lauf'), { recursive: true })
  writeFileSync(join(w, 'kontrollzustand', 'lauf', 'x.json'), '{}')
  assert.equal(standIstVeraltet(s0, stand(w)), false, 'kontrollzustand/ ausgenommen')
  writeFileSync(join(w, 'neu.txt'), 'neu\n')
  const sNeu = stand(w)
  assert.equal(standIstVeraltet(s0, sNeu), true, 'neue Datei')
  fuehreGitSync(['add', '--', 'neu.txt'], { cwd: w, encoding: 'utf8' })
  fuehreGitSync(['commit', '--quiet', '-m', 'neu'], { cwd: w, encoding: 'utf8' })
  const sCommit = stand(w)
  assert.notEqual(sCommit.commit, sNeu.commit)
  assert.equal(standIstVeraltet(sNeu, sCommit), false, 'Commit derselben Inhalte')
  writeFileSync(join(w, 'a.txt'), 'b\n')
  assert.equal(standIstVeraltet(sCommit, stand(w)), true, 'geändert')
  writeFileSync(join(w, 'a.txt'), 'a\n')
  rmSync(join(w, 'src', 'b.ts'))
  assert.equal(standIstVeraltet(sCommit, stand(w)), true, 'gelöscht')
})

test('Hülle: CRLF in HEAD bei text=auto und autocrlf=true mit LF in HEAD — nur berührt bleibt unverändert (Advisor N3)', () => {
  const crlf = repo('crlf-head', { 'c.txt': 'a\r\nb\r\n' })
  writeFileSync(join(crlf, '.gitattributes'), '* text=auto eol=lf\n')
  fuehreGitSync(['add', '--', '.gitattributes'], { cwd: crlf, encoding: 'utf8' })
  fuehreGitSync(['commit', '--quiet', '-m', 'attr'], { cwd: crlf, encoding: 'utf8' })
  const s1 = stand(crlf)
  beruehre(join(crlf, 'c.txt'))
  assert.equal(standIstVeraltet(s1, stand(crlf)), false)
  const lf = repo('lf-head-autocrlf', { 'f.txt': 'a\nb\n' }, 'true')
  const s2 = stand(lf)
  writeFileSync(join(lf, 'f.txt'), 'a\r\nb\r\n')
  beruehre(join(lf, 'f.txt'))
  assert.equal(standIstVeraltet(s2, stand(lf)), false)
  writeFileSync(join(lf, 'f.txt'), 'a\r\nc\r\n')
  assert.equal(standIstVeraltet(s2, stand(lf)), true)
})

test('Hülle: Filter-Treiber, kein Repo an der Wurzel, kein Commit, Kappe → null mit Grund', () => {
  const w = repo('filter', { 'a.txt': 'a\n' })
  writeFileSync(join(w, '.gitattributes'), '*.bin filter=lfs\n')
  writeFileSync(join(w, 'x.bin'), 'binär')
  assert.match(leseGeprueftenStandSync(w).grund ?? '', /Filter-Treiber/)
  const unter = join(w, 'unterordner')
  mkdirSync(unter)
  assert.match(leseGeprueftenStandSync(unter).grund ?? '', /kein eigenes Git-Repo/)
  const leer = join(basis, 'leer')
  mkdirSync(leer)
  fuehreGitSync(['init', '--quiet'], { cwd: leer, encoding: 'utf8' })
  assert.match(leseGeprueftenStandSync(leer).grund ?? '', /kein Commit/)
  const viele = repo('kappe', { 'a.txt': 'a\n' })
  writeFileSync(join(viele, 'n1.txt'), '1')
  writeFileSync(join(viele, 'n2.txt'), '2')
  assert.match(leseGeprueftenStandSync(viele, { ...STANDARD_GRENZEN, maxPfade: 1 }).grund ?? '', /zu viele geänderte Dateien/)
  assert.match(leseGeprueftenStandSync(viele, { ...STANDARD_GRENZEN, maxBytes: 1 }).grund ?? '', /zu groß/)
  assert.match(leseGeprueftenStandSync(viele, { ...STANDARD_GRENZEN, maxAusgabe: 10 }).grund ?? '', /Ausgabe zu groß/)
})

test('async = sync, auch für null mit Grund', async () => {
  const w = repo('async', { 'a.txt': 'a\n' })
  writeFileSync(join(w, 'neu.txt'), 'n')
  assert.deepEqual(await leseGeprueftenStandAsync(w), leseGeprueftenStandSync(w))
  writeFileSync(join(w, '.gitattributes'), '*.bin filter=lfs\n')
  writeFileSync(join(w, 'x.bin'), 'binär')
  const a = await leseGeprueftenStandAsync(w)
  assert.match(a.grund ?? '', /Filter-Treiber/)
  assert.deepEqual(a, leseGeprueftenStandSync(w))
  assert.equal((await leseGeprueftenStandAsync(w, { ...STANDARD_GRENZEN, maxAusgabe: 10 })).grund, 'Git-Ausgabe zu groß')
})

test('Zeitgrenze: erschöpftes Gesamtbudget → null mit Grund, sync und async (qa 4)', async () => {
  const w = repo('zeit', { 'a.txt': 'a\n' })
  const grenzen = { ...STANDARD_GRENZEN, zeitgrenzeMs: 1 }
  assert.match(leseGeprueftenStandSync(w, grenzen).grund ?? '', /Zeitgrenze von 1 ms überschritten/)
  assert.match((await leseGeprueftenStandAsync(w, grenzen)).grund ?? '', /Zeitgrenze von 1 ms überschritten/)
})
