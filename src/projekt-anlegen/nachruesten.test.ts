/**
 * Datei: src/projekt-anlegen/nachruesten.test.ts
 *
 * Zweck: F45 B1a-2 — Tests für die Hook-Gruppen-Regel (planeSkelettKopie/kopiereSkelett, Plan v2 P2)
 * und das Nachrüsten (nachruesten.ts, Plan v2 P1/P3): Probelauf schreibt nichts, Anwenden überschreibt
 * nie, Pfade außerhalb/Junction/Worktree/Installation werden abgelehnt, Pflichtzeile zur Startfreigabe.
 * Arbeitet in Wegwerfordnern mit eigenem Mini-Skelett und eigener Mini-Installation.
 *
 * Wird aufgerufen von:
 * - npm run test (node --test)
 */

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { after, test } from 'node:test'
import { raeumeVerzeichnis } from '../../scripts/_aufraeumen.ts'
import { fuehreGitSync } from '../git-starter/index.ts'
import { kopiereSkelett, planeSkelettKopie } from './index.ts'
import { formatiereNachruestBericht, nachruesten, pruefeNachruestZiel } from './nachruesten.ts'

const wurzel = mkdtempSync(join(tmpdir(), 'nachruesten-'))
after(() => raeumeVerzeichnis(wurzel))

const SETTINGS = join('.claude', 'settings.json')
const HOOK = join('.claude', 'hooks', 'guard.js')

/**
 * Schreibt eine Datei samt Elternordnern.
 * @param pfad - absoluter Pfad
 * @param inhalt - Text
 */
function schreibe(pfad: string, inhalt: string): void {
  mkdirSync(join(pfad, '..'), { recursive: true })
  writeFileSync(pfad, inhalt)
}

/**
 * Legt ein Git-Repo mit einem Commit an.
 * @param ordner - Zielordner
 */
function gitRepo(ordner: string): void {
  mkdirSync(ordner, { recursive: true })
  fuehreGitSync(['init', '-q'], { cwd: ordner, encoding: 'utf8' })
  fuehreGitSync(['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '--allow-empty', '-q', '-m', 'start'], { cwd: ordner, encoding: 'utf8' })
}

/** Basis mit Mini-Installation (eigenes Git-Repo, Mini-Skelett). */
const basis = join(wurzel, 'basis')
const install = join(basis, 'ai-workforce')
const skelett = join(install, 'vorlagen', 'projekt-skelett')
gitRepo(install)
schreibe(join(skelett, SETTINGS), '{"hooks":{}}\n')
schreibe(join(skelett, HOOK), 'module.exports = {}\n')
schreibe(join(skelett, 'CLAUDE.md'), '# Skelett\n')
schreibe(join(skelett, 'docs', 'x.md'), 'x\n')
schreibe(join(skelett, 'HERKUNFT.md'), 'nicht kopieren\n')
schreibe(join(skelett, 'package.json'), '{"name":"skelett"}\n')
schreibe(join(skelett, '.gitignore'), 'node_modules/\n')
const optionen = { installWurzel: install, basis }

let zaehler = 0
/**
 * Neues Projekt (Git-Repo) unter der Basis.
 * @param dateien - relative Pfade → Inhalt
 * @returns Projektordner
 */
function projekt(dateien: Record<string, string> = {}): string {
  const ordner = join(basis, `projekt-${++zaehler}`)
  gitRepo(ordner)
  for (const [pfad, inhalt] of Object.entries(dateien)) schreibe(join(ordner, pfad), inhalt)
  return ordner
}

/**
 * Momentaufnahme aller Dateien (ohne .git): Pfad → Inhalt + mtime.
 * @param ordner - Projektordner
 * @returns Map
 */
function aufnahme(ordner: string): Map<string, string> {
  const ergebnis = new Map<string, string>()
  const lauf = (aktuell: string): void => {
    for (const eintrag of readdirSync(aktuell, { withFileTypes: true })) {
      if (eintrag.name === '.git') continue
      const pfad = join(aktuell, eintrag.name)
      if (eintrag.isDirectory()) lauf(pfad)
      else ergebnis.set(relative(ordner, pfad), `${readFileSync(pfad, 'utf8')}|${statSync(pfad).mtimeMs}`)
    }
  }
  lauf(ordner)
  return ergebnis
}

test('Hook-Gruppe: Ziel ohne settings.json bekommt die ganze Gruppe (kopiereSkelett)', () => {
  const ziel = projekt()
  const kopiert = kopiereSkelett(install, ziel)
  assert.deepEqual([...kopiert].sort(), [SETTINGS, HOOK, 'CLAUDE.md', join('docs', 'x.md'), 'package.json', '.gitignore'].sort())
})

test('Hook-Gruppe: Ziel mit settings.json (Baseline) bekommt keine Skelett-Hooks, settings.json bleibt', () => {
  const ziel = projekt({ [SETTINGS]: '{"baseline":true}\n' })
  const kopiert = kopiereSkelett(install, ziel)
  assert.equal(kopiert.includes(HOOK), false)
  assert.equal(readFileSync(join(ziel, SETTINGS), 'utf8'), '{"baseline":true}\n')
  assert.equal(planeSkelettKopie(skelett, ziel).hookGruppe, 'vorhanden')
})

test('Hook-Gruppe: fremder Hook allein → ganze Gruppe übersprungen (teilweise vorhanden)', () => {
  const ziel = projekt({ [HOOK]: '// fremd\n' })
  const plan = planeSkelettKopie(skelett, ziel)
  assert.equal(plan.hookGruppe, 'teilweise_vorhanden')
  assert.deepEqual(plan.gruppeUebersprungen, [SETTINGS])
  assert.equal(kopiereSkelett(install, ziel).includes(SETTINGS), false)
})

test('Probelauf schreibt nichts und meldet fehlt/gleich/weicht ab', () => {
  // CLAUDE.md mit CRLF (Windows-Checkout mit core.autocrlf=true) gilt als gleich.
  const ziel = projekt({ 'CLAUDE.md': '# Skelett\r\n', [join('docs', 'x.md')]: 'eigen\n' })
  const vorher = aufnahme(ziel)
  const bericht = nachruesten(ziel, false, optionen)
  assert.deepEqual(aufnahme(ziel), vorher)
  const zustand = Object.fromEntries(bericht.dateien.map((d) => [d.pfad, d.zustand]))
  assert.deepEqual(zustand, {
    '.claude/hooks/guard.js': 'fehlt',
    '.claude/settings.json': 'fehlt',
    '.gitignore': 'nie_kopiert',
    'CLAUDE.md': 'gleich',
    'docs/x.md': 'weicht_ab',
    'package.json': 'nie_kopiert',
  })
  assert.deepEqual(bericht.kopiert, [])
  assert.equal(bericht.startfreigabeNeu, true)
  assert.ok(formatiereNachruestBericht(bericht, false).some((z) => z.includes('würde neu → nach --anwenden Startfreigabe')))
})

test('--anwenden kopiert nur Fehlendes und überschreibt keine vorhandene Datei', () => {
  const ziel = projekt({ [join('docs', 'x.md')]: 'eigen\n', 'package.json': '{"scripts":{"check":"x"}}\n' })
  const vorher = aufnahme(ziel)
  const bericht = nachruesten(ziel, true, optionen)
  const nachher = aufnahme(ziel)
  for (const [pfad, wert] of vorher) assert.equal(nachher.get(pfad), wert, pfad)
  assert.deepEqual([...bericht.kopiert].sort(), ['.claude/hooks/guard.js', '.claude/settings.json', 'CLAUDE.md'])
  assert.deepEqual(bericht.fehler, [])
  assert.ok(formatiereNachruestBericht(bericht, true).includes('.claude/settings.json neu → Startfreigabe für dieses Projekt neu erteilen'))
  assert.equal(readFileSync(join(ziel, 'docs', 'x.md'), 'utf8'), 'eigen\n')
  assert.ok(bericht.hinweise.some((h) => h.includes("'lint' fehlt")))
  assert.ok(bericht.hinweise.some((h) => h.includes('check-gates')))
})

test('Settings vorhanden → keine Pflichtzeile zur Startfreigabe', () => {
  const ziel = projekt({ [SETTINGS]: '{}\n' })
  const bericht = nachruesten(ziel, true, optionen)
  assert.equal(bericht.startfreigabeNeu, false)
  assert.equal(formatiereNachruestBericht(bericht, true).some((z) => z.includes('Startfreigabe')), false)
})

test('type: module → Hook-Gruppe übersprungen (Template-Hooks sind CommonJS)', () => {
  const ziel = projekt({ 'package.json': '{"type":"module"}\n' })
  const bericht = nachruesten(ziel, true, optionen)
  assert.equal(bericht.hookGruppe, 'type_module')
  assert.equal(bericht.kopiert.includes('.claude/settings.json'), false)
  assert.equal(bericht.startfreigabeNeu, false)
  assert.ok(bericht.hinweise.some((h) => h.includes('"type": "module"')))
})

test('Pfad außerhalb der Basis wird abgelehnt', () => {
  const aussen = join(wurzel, 'aussen')
  gitRepo(aussen)
  const pruefung = pruefeNachruestZiel(aussen, optionen)
  assert.equal(pruefung.ok, false)
  assert.match(pruefung.ok ? '' : pruefung.grund, /außerhalb der erlaubten Basis/)
})

test('Installation selbst, *-laeufe-Ordner, Unterordner, kein Git-Repo, nicht vorhanden → abgelehnt', () => {
  const ohneGit = join(basis, 'ohne-git')
  mkdirSync(ohneGit, { recursive: true })
  const laeufe = join(basis, 'x-laeufe', 'abc')
  gitRepo(laeufe)
  const unter = join(projekt(), 'unter')
  mkdirSync(unter)
  for (const [pfad, muster] of [
    [install, /Installation/],
    [laeufe, /-laeufe/],
    [unter, /nicht die Wurzel/],
    // Nur der eigene Text, nicht git's Wortlaut (git kann lokalisiert antworten).
    [ohneGit, /kein nutzbares Git-Repo \(/],
    [join(basis, 'fehlt'), /kein vorhandener Ordner/],
  ] as const) {
    const pruefung = pruefeNachruestZiel(pfad, optionen)
    assert.equal(pruefung.ok, false, pfad)
    assert.match(pruefung.ok ? '' : pruefung.grund, muster, pfad)
  }
})

test('verknüpfter Worktree → abgelehnt, Hauptordner desselben Projekts erlaubt', () => {
  const haupt = projekt()
  const worktree = join(basis, `wt-${zaehler}`)
  fuehreGitSync(['worktree', 'add', '-q', '--detach', worktree], { cwd: haupt, encoding: 'utf8' })
  const pruefung = pruefeNachruestZiel(worktree, optionen)
  assert.match(pruefung.ok ? '' : pruefung.grund, /verknüpfter Git-Worktree/)
  assert.equal(pruefeNachruestZiel(haupt, optionen).ok, true)
})

test('Junction als Projektordner und Junction im Projekt nach außen → abgelehnt, nichts geschrieben', () => {
  const ziel = projekt()
  const verweis = join(basis, 'verweis')
  symlinkSync(ziel, verweis, 'junction')
  assert.match((p => (p.ok ? '' : p.grund))(pruefeNachruestZiel(verweis, optionen)), /Symlink/)

  const draussen = join(wurzel, 'draussen')
  mkdirSync(draussen)
  symlinkSync(draussen, join(ziel, 'docs'), 'junction')
  assert.throws(() => nachruesten(ziel, true, optionen), /außerhalb des Projekts/)
  assert.deepEqual(readdirSync(draussen), [])
  assert.equal(readdirSync(ziel).includes('CLAUDE.md'), false)
})

test('package.json und .gitignore werden nie angelegt, auch wenn sie fehlen', () => {
  const ziel = projekt()
  const bericht = nachruesten(ziel, true, optionen)
  assert.equal(readdirSync(ziel).includes('package.json'), false)
  assert.equal(readdirSync(ziel).includes('.gitignore'), false)
  assert.ok(bericht.hinweise.some((h) => h.includes('package.json fehlt')))
  assert.ok(formatiereNachruestBericht(bericht, true).some((z) => z.startsWith('Fehlt, wird aber nie angelegt')))
})

test('Kopierfehler mittendrin: Rest läuft weiter, Bericht nennt Kopiertes und Fehler', () => {
  // Eine DATEI namens docs verhindert docs/x.md (mkdir scheitert); die übrigen Dateien werden kopiert.
  const ziel = projekt({ docs: 'ich bin eine Datei\n' })
  const bericht = nachruesten(ziel, true, optionen)
  assert.equal(bericht.fehler.length, 1)
  assert.match(bericht.fehler[0], /^docs\/x\.md: /)
  assert.ok(bericht.kopiert.includes('.claude/settings.json'))
  assert.equal(bericht.startfreigabeNeu, true)
  assert.equal(readFileSync(join(ziel, 'docs'), 'utf8'), 'ich bin eine Datei\n')
  assert.ok(formatiereNachruestBericht(bericht, true).some((z) => z.startsWith('NICHT kopiert (Fehler): 1')))
})

test('Kopierfehler in der Hook-Gruppe → Hinweis „Hook-Gruppe UNVOLLSTÄNDIG“', () => {
  // Eine DATEI namens .claude/hooks verhindert den Hook; settings.json wird trotzdem kopiert.
  const ziel = projekt({ [join('.claude', 'hooks')]: 'Datei statt Ordner\n' })
  const bericht = nachruesten(ziel, true, optionen)
  assert.ok(bericht.fehler.some((f) => f.startsWith('.claude/hooks/guard.js: ')))
  assert.ok(bericht.hinweise.some((h) => h.startsWith('Hook-Gruppe UNVOLLSTÄNDIG')))
})

test('verwaiste Junction im Projekt: gilt als vorhanden, Schreiben dahinter abgelehnt, nichts geschrieben', () => {
  const ziel = projekt()
  const weg = join(wurzel, `weg-${zaehler}`)
  mkdirSync(weg)
  symlinkSync(weg, join(ziel, 'docs'), 'junction')
  raeumeVerzeichnis(weg)
  assert.throws(() => nachruesten(ziel, true, optionen), /außerhalb des Projekts/)
  assert.equal(readdirSync(ziel).includes('CLAUDE.md'), false)
})

test('Projektpfad mit Leerzeichen und Umlaut, unter Windows auch in anderer Schreibweise', () => {
  const ordner = join(basis, 'Mein Projekt Ä')
  gitRepo(ordner)
  assert.equal(pruefeNachruestZiel(ordner, optionen).ok, true)
  if (process.platform === 'win32') assert.equal(pruefeNachruestZiel(ordner.toUpperCase(), optionen).ok, true)
})
