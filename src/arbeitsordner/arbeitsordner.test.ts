/**
 * Datei: src/arbeitsordner/arbeitsordner.test.ts
 *
 * Zweck: Tests des Arbeitsordners je Ablauf (F45 B1a-1, E-F45-3 = A): Pfad/Branch-Ableitung, Löschpfad-Prüfung
 * und Löschen (F-715: erlaubt, außerhalb, .git, .claude, kontrollzustand, Verzeichnis, Junction/Symlink nach
 * außen), Löschblock im Ergebnistext, Ausführen bzw. Aussetzen der Löschliste nach einer Stefan-Ablehnung (F45 B2b-3b-2a), Artefakt-Validator gegen die Schema-Beispiele, Vorbereitung gegen echte
 * Wegwerf-Repos (Grün, kein Repo, kein Commit, Wiederaufnahme, fremder Pfad, npm ci, E-183-Vorprüfung),
 * E-183 gegen die Settings DES WORKTREES (Grün gleicher Commit, Rot geänderter Hook im Branch; Zeilenenden F45 B2b-3b-2b-2b-2a:
 * autocrlf=true und `text=auto` mit core.eol=crlf ⇒ LF und Grün, alter CRLF-Arbeitsordner ⇒ Aufräum-Rat, frischer mit
 * `eol=crlf` ⇒ kein Rat), Aufräumen
 * (gemergt, nicht gemergt, offene Änderungen ohne/mit Verwerfen) und die Vorbedingung im Worktree.
 *
 * Wird aufgerufen von: npm run test (node --test).
 */

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { raeumeVerzeichnis } from '../../scripts/_aufraeumen.ts'
import { sha256Hex } from '../checkpoint-store/index.ts'
import { ermittleIstZustand, pruefeStartbedingung1 } from '../invocation-policy/index.ts'
import type { NpmRunner } from '../ressourcen/installation.ts'
import {
  bereiteArbeitsordnerVor,
  brauchtArbeitsordner,
  entferneArbeitsordner,
  fuehreLoeschlisteAus,
  LOESCHLISTE_AUSGESETZT,
  leiteArbeitsordnerAb,
  leseArbeitsordnerVorbedingung,
  leseLoeschliste,
  loescheDateien,
  parseWorktreeListe,
  pruefeLoeschpfadText,
  pruefePfadlaengen,
  schreibenderSchrittGelaufen,
  validiereArbeitsordnerDaten,
} from './index.ts'

/** git für Testaufbauten (Tests liegen außerhalb des Git-Starter-Gates). */
function git(cwd: string, argumente: string[]): string {
  return execFileSync('git', argumente, { cwd, encoding: 'utf8' })
}

/** Wegwerf-Wurzel je Test: <tmp>/ao-<uuid>/projekt (+ projekt-laeufe daneben). */
function neueWurzel(): { basis: string; projekt: string } {
  const basis = join(tmpdir(), `ao-${randomUUID().slice(0, 8)}`)
  const projekt = join(basis, 'projekt')
  mkdirSync(projekt, { recursive: true })
  return { basis, projekt }
}

/** Git-Repo mit einem Commit auf 'arbeit' (README + .claude-Harness mit einem Hook). */
function neuesRepo(): { basis: string; projekt: string; settingsInhalt: string; hookInhalt: string } {
  const { basis, projekt } = neueWurzel()
  git(projekt, ['init', '--quiet'])
  git(projekt, ['config', 'user.email', 'test@example.invalid'])
  git(projekt, ['config', 'user.name', 'Test'])
  git(projekt, ['config', 'core.autocrlf', 'false'])
  git(projekt, ['checkout', '--quiet', '-b', 'arbeit'])
  mkdirSync(join(projekt, '.claude', 'hooks'), { recursive: true })
  const settingsInhalt = `${JSON.stringify({ hooks: { PreToolUse: [{ matcher: 'Edit', hooks: [{ type: 'command', command: 'node .claude/hooks/w.js' }] }] } }, null, 2)}\n`
  const hookInhalt = 'echter-hook\n'
  writeFileSync(join(projekt, '.claude', 'settings.json'), settingsInhalt)
  writeFileSync(join(projekt, '.claude', 'hooks', 'w.js'), hookInhalt)
  writeFileSync(join(projekt, 'README.md'), 'Zeile 1\n')
  writeFileSync(join(projekt, '.gitignore'), 'node_modules/\n')
  git(projekt, ['add', '.'])
  git(projekt, ['commit', '--quiet', '-m', 'init'])
  return { basis, projekt, settingsInhalt, hookInhalt }
}

/** E-183 trivial grün (für Tests, die E-183 nicht betrachten). */
const E183_GRUEN = () => ({ ok: true as const })

/** npm-Attrappe: zeichnet Aufrufe auf. */
function npmAttrappe(code: number | null = 0, zeitueberschritten = false): { npm: NpmRunner; aufrufe: string[][] } {
  const aufrufe: string[][] = []
  const npm: NpmRunner = async (args) => {
    aufrufe.push(args)
    return { code, stdout: 'npm-ausgabe', stderr: '', zeitueberschritten }
  }
  return { npm, aufrufe }
}

describe('leiteArbeitsordnerAb', () => {
  it('legt den Geschwisterordner <Projekt>-laeufe/<Kurzname> und den Branch wf/<id> fest (Kurzname fest, 10 Hex)', () => {
    const ergebnis = leiteArbeitsordnerAb(join(tmpdir(), 'x', 'meinprojekt'), 'wf-123')
    assert.equal(ergebnis.ok, true)
    if (ergebnis.ok) {
      assert.match(ergebnis.pfad, /meinprojekt-laeufe[\\/][0-9a-f]{10}$/)
      assert.equal(ergebnis.branch, 'wf/wf-123')
      assert.deepEqual(leiteArbeitsordnerAb(join(tmpdir(), 'x', 'meinprojekt'), 'wf-123'), ergebnis)
      const anderer = leiteArbeitsordnerAb(join(tmpdir(), 'x', 'meinprojekt'), 'wf-124')
      assert.notEqual(anderer.ok && anderer.pfad, ergebnis.pfad)
    }
  })
  it('Pfadlänge: Windows-Grenze verletzt → Grund mit dem längsten Pfad; sonst ok', () => {
    const lang = `kontrollzustand/${'a'.repeat(240)}.json`
    const rot = pruefePfadlaengen('C:\\Users\\x\\projekt-laeufe\\0123456789', ['kurz.txt', lang], 'win32')
    assert.equal(rot.ok, false)
    assert.match(rot.ok ? '' : rot.grund, /Windows-Grenze 259/)
    assert.deepEqual(pruefePfadlaengen('C:\\p', ['kurz.txt'], 'win32'), { ok: true })
    assert.deepEqual(pruefePfadlaengen('/p', [lang, lang + lang], 'linux'), { ok: true })
  })
  it('lehnt IDs ab, die als Ordner- oder Branchname nicht taugen', () => {
    for (const id of ['a:b', 'a b', 'x.lock', 'x.', '-x', 'a'.repeat(81), 'con|x', 'a/b']) {
      assert.equal(leiteArbeitsordnerAb(join(tmpdir(), 'p'), id).ok, false, id)
    }
  })
})

describe('Bedarf und Bestand', () => {
  const art = (name: string) => (name === 'schreibend' ? 'schreibend' : 'lesend')
  it('ein schreibender Schritt begründet den Bedarf', () => {
    assert.equal(brauchtArbeitsordner([{ werkzeugsatz: 'lesend', lauf_id: null }, { werkzeugsatz: 'schreibend', lauf_id: null }], art), true)
    assert.equal(brauchtArbeitsordner([{ werkzeugsatz: 'lesend', lauf_id: 'x' }], art), false)
  })
  it('Bestand nur, wenn ein SCHREIBENDER Schritt schon lief (Replan mit neuem schreibendem Schritt ist kein Bestand)', () => {
    assert.equal(schreibenderSchrittGelaufen([{ werkzeugsatz: 'lesend', lauf_id: 'l1' }, { werkzeugsatz: 'schreibend', lauf_id: null }], art), false)
    assert.equal(schreibenderSchrittGelaufen([{ werkzeugsatz: 'schreibend', lauf_id: 'l1' }], art), true)
  })
})

describe('pruefeLoeschpfadText', () => {
  it('lässt einfache relative Pfade zu (auch mit Backslash)', () => {
    assert.deepEqual(pruefeLoeschpfadText('scripts/alt.test.mjs'), { ok: true, relativ: 'scripts/alt.test.mjs' })
    assert.deepEqual(pruefeLoeschpfadText('docs\\a.md'), { ok: true, relativ: 'docs/a.md' })
  })
  it('lehnt Form-Verstöße und geschützte Bereiche ab', () => {
    const rot = [
      '',
      '../aussen.txt',
      'a/../../b',
      '/etc/passwd',
      'C:\\Windows\\x',
      'C:x',
      'datei.txt:stream',
      'a/./b',
      'ordner./x',
      'x ',
      'a//b',
      '.git',
      '.git/config',
      'sub/.git',
      'a/.Git/HEAD',
      '.GIT/HEAD',
      '.claude/settings.json',
      '.Claude/Settings.json',
      '.claude/settings.local.json',
      '.claude/hooks/w.js',
      '.claude/agents/x.md',
      'kontrollzustand/lauf/x.json',
      'a\u0000b',
      42,
    ]
    for (const pfad of rot) assert.equal(pruefeLoeschpfadText(pfad).ok, false, String(pfad))
  })
})

describe('fuehreLoeschlisteAus (F45 B2b-3b-2a, F-1128 (2))', () => {
  it('kein Block ⇒ undefined; ungültiger Block ⇒ Block-Ablehnung; gültig ⇒ löschen; nach Stefan-Ablehnung ⇒ nichts löschen, nur Hinweis', () => {
    const { basis, projekt } = neueWurzel()
    try {
      const block = (pfade: unknown) => `Fertig.\n\n\`\`\`zu_loeschen\n${JSON.stringify({ zu_loeschen: pfade })}\n\`\`\`\n`
      writeFileSync(join(projekt, 'alt.txt'), 'x')
      assert.equal(fuehreLoeschlisteAus(projekt, null, false), undefined)
      assert.equal(fuehreLoeschlisteAus(projekt, 'Fertig.', true), undefined)
      assert.deepEqual(fuehreLoeschlisteAus(projekt, '```zu_loeschen\nkaputt\n```', true)?.abgelehnt[0].pfad, '(zu_loeschen-Block)')
      const ausgesetzt = fuehreLoeschlisteAus(projekt, block(['alt.txt', 7]), true)
      assert.deepEqual(ausgesetzt, { geloescht: [], abgelehnt: [{ pfad: 'alt.txt', grund: LOESCHLISTE_AUSGESETZT }, { pfad: '7', grund: LOESCHLISTE_AUSGESETZT }] })
      assert.equal(existsSync(join(projekt, 'alt.txt')), true, 'nach einer Stefan-Ablehnung wird nichts gelöscht')
      assert.match(LOESCHLISTE_AUSGESETZT, /Stefan/)
      assert.deepEqual(fuehreLoeschlisteAus(projekt, block(['alt.txt']), false), { geloescht: ['alt.txt'], abgelehnt: [] })
      assert.equal(existsSync(join(projekt, 'alt.txt')), false)
    } finally {
      raeumeVerzeichnis(basis)
    }
  })
})

describe('loescheDateien', () => {
  it('löscht erlaubte Dateien und meldet jede Ablehnung mit Grund', () => {
    const { basis, projekt } = neueWurzel()
    try {
      mkdirSync(join(projekt, 'docs'), { recursive: true })
      mkdirSync(join(projekt, 'kontrollzustand'), { recursive: true })
      mkdirSync(join(projekt, '.claude'), { recursive: true })
      writeFileSync(join(projekt, 'docs', 'weg.md'), 'x')
      writeFileSync(join(projekt, 'kontrollzustand', 'k.json'), '{}')
      writeFileSync(join(projekt, '.claude', 'settings.json'), '{}')
      writeFileSync(join(projekt, '.git'), 'gitdir: woanders')
      const ergebnis = loescheDateien(projekt, ['docs/weg.md', 'docs/weg.md', 'docs', 'fehlt.txt', '.git', '.claude/settings.json', 'kontrollzustand/k.json', '../x'])
      assert.deepEqual(ergebnis.geloescht, ['docs/weg.md'])
      assert.equal(existsSync(join(projekt, 'docs', 'weg.md')), false)
      assert.equal(existsSync(join(projekt, '.git')), true)
      assert.equal(existsSync(join(projekt, '.claude', 'settings.json')), true)
      assert.equal(existsSync(join(projekt, 'kontrollzustand', 'k.json')), true)
      const gruende = Object.fromEntries(ergebnis.abgelehnt.map((e) => [e.pfad, e.grund]))
      assert.match(gruende.docs, /keine reguläre Datei/)
      assert.match(gruende['fehlt.txt'], /existiert nicht/)
      assert.match(gruende['.git'], /geschützter Bereich/)
      assert.equal(ergebnis.abgelehnt.filter((e) => e.pfad === 'docs/weg.md').length, 1)
    } finally {
      raeumeVerzeichnis(basis)
    }
  })

  it('lehnt eine Datei hinter einer Junction nach außen ab (realpath)', () => {
    const { basis, projekt } = neueWurzel()
    try {
      const aussen = join(basis, 'aussen')
      mkdirSync(aussen, { recursive: true })
      writeFileSync(join(aussen, 'opfer.txt'), 'bleibt')
      symlinkSync(aussen, join(projekt, 'tor'), 'junction')
      const ergebnis = loescheDateien(projekt, ['tor/opfer.txt'])
      assert.deepEqual(ergebnis.geloescht, [])
      assert.match(ergebnis.abgelehnt[0].grund, /außerhalb des Arbeitsordners/)
      assert.equal(readFileSync(join(aussen, 'opfer.txt'), 'utf8'), 'bleibt')
    } finally {
      raeumeVerzeichnis(basis)
    }
  })

  it('wendet die Verbotsliste auch auf den realpath an (Junction auf .claude/)', () => {
    const { basis, projekt } = neueWurzel()
    try {
      mkdirSync(join(projekt, '.claude'), { recursive: true })
      writeFileSync(join(projekt, '.claude', 'settings.json'), '{}')
      symlinkSync(join(projekt, '.claude'), join(projekt, 'harmlos'), 'junction')
      const ergebnis = loescheDateien(projekt, ['harmlos/settings.json'])
      assert.deepEqual(ergebnis.geloescht, [])
      assert.match(ergebnis.abgelehnt[0].grund, /geschützter Bereich '\.claude\/'/)
      assert.equal(existsSync(join(projekt, '.claude', 'settings.json')), true)
    } finally {
      raeumeVerzeichnis(basis)
    }
  })

  it('lehnt eine symbolische Verknüpfung auf eine Datei ab (wenn das System sie anlegen lässt)', (t) => {
    const { basis, projekt } = neueWurzel()
    try {
      writeFileSync(join(basis, 'ziel.txt'), 'bleibt')
      try {
        symlinkSync(join(basis, 'ziel.txt'), join(projekt, 'link.txt'), 'file')
      } catch (fehler) {
        if ((fehler as NodeJS.ErrnoException).code === 'EPERM') {
          t.skip('Datei-Symlinks brauchen hier Rechte')
          return
        }
        throw fehler
      }
      const ergebnis = loescheDateien(projekt, ['link.txt'])
      assert.deepEqual(ergebnis.geloescht, [])
      assert.match(ergebnis.abgelehnt[0].grund, /symbolische Verknüpfung/)
      assert.equal(existsSync(join(basis, 'ziel.txt')), true)
    } finally {
      raeumeVerzeichnis(basis)
    }
  })
})

describe('leseLoeschliste', () => {
  const block = (inhalt: string) => `Fertig.\n\n\`\`\`zu_loeschen\n${inhalt}\n\`\`\`\n`
  it('ohne Block: keine', () => {
    assert.deepEqual(leseLoeschliste('Alles erledigt.'), { status: 'keine' })
    assert.deepEqual(leseLoeschliste(null), { status: 'keine' })
  })
  it('liest das gültige Schema-Beispiel', () => {
    const beispiel = readFileSync('schemas/examples/ergebnis-ausfuehrung-loeschliste.valid.json', 'utf8').trim()
    assert.deepEqual(leseLoeschliste(block(beispiel)), { status: 'ok', pfade: ['scripts/alt.test.mjs', 'docs/veraltet.md'] })
  })
  it('lehnt das ungültige Schema-Beispiel, kaputtes JSON, zwei Blöcke und zu viele Pfade ab', () => {
    const ungueltig = readFileSync('schemas/examples/ergebnis-ausfuehrung-loeschliste.invalid-unbekanntes-feld.json', 'utf8').trim()
    assert.equal(leseLoeschliste(block(ungueltig)).status, 'ungueltig')
    assert.equal(leseLoeschliste(block('{ kein json')).status, 'ungueltig')
    assert.equal(leseLoeschliste(block('["a"]')).status, 'ungueltig')
    assert.equal(leseLoeschliste(block('{"zu_loeschen":["a"]}') + block('{"zu_loeschen":["b"]}')).status, 'ungueltig')
    assert.equal(leseLoeschliste(block(JSON.stringify({ zu_loeschen: Array.from({ length: 201 }, (_, i) => `d${i}`) }))).status, 'ungueltig')
  })
})

describe('validiereArbeitsordnerDaten', () => {
  it('gültiges Beispiel grün, ungültiges rot', () => {
    assert.deepEqual(validiereArbeitsordnerDaten(JSON.parse(readFileSync('schemas/examples/kontrollzustand-arbeitsordner-payload.valid.json', 'utf8'))), [])
    const rot = validiereArbeitsordnerDaten(JSON.parse(readFileSync('schemas/examples/kontrollzustand-arbeitsordner-payload.invalid-unbekannter-status.json', 'utf8')))
    assert.ok(rot.some((v) => v.includes("'status'")))
    assert.ok(validiereArbeitsordnerDaten({}).length > 0)
  })
})

describe('parseWorktreeListe', () => {
  it('liest Pfad, Branch, HEAD und die Marken locked/prunable', () => {
    const roh = 'worktree C:/a\nHEAD 111\nbranch refs/heads/main\n\nworktree C:/b\nHEAD 222\nbranch refs/heads/wf/x\nlocked initializing\n\nworktree C:/c\nHEAD 333\ndetached\nprunable gitdir file points to non-existent location\n'
    const liste = parseWorktreeListe(roh)
    assert.equal(liste.length, 3)
    assert.deepEqual(liste[1], { pfad: 'C:/b', branch: 'refs/heads/wf/x', kopf: '222', gesperrt: true, verwaist: false })
    assert.equal(liste[2].verwaist, true)
    assert.equal(liste[2].branch, null)
  })
})

describe('bereiteArbeitsordnerVor', () => {
  it('Grün: Worktree auf wf/<id> an der Basis, Projektordner unverändert; zweiter Aufruf nimmt wieder auf', async () => {
    const { basis, projekt } = neuesRepo()
    try {
      const statusVorher = git(projekt, ['status', '--porcelain'])
      const kopf = git(projekt, ['rev-parse', 'HEAD']).trim()
      const ergebnis = await bereiteArbeitsordnerVor({ repoWurzel: projekt, workflowId: 'wf-a', vorherigeBasis: null, npm: npmAttrappe().npm, pruefeE183: E183_GRUEN })
      assert.equal(ergebnis.status, 'BEREIT', ergebnis.grund ?? '')
      assert.equal(dirname(ergebnis.pfad), join(basis, 'projekt-laeufe'))
      assert.equal(ergebnis.branch, 'wf/wf-a')
      assert.equal(ergebnis.basis_commit, kopf)
      assert.equal(ergebnis.vorbereitung.npm_ci, null)
      assert.ok((ergebnis.vorbereitung.worktree_ms ?? -1) >= 0)
      assert.equal(git(ergebnis.pfad, ['symbolic-ref', 'HEAD']).trim(), 'refs/heads/wf/wf-a')
      assert.equal(git(projekt, ['status', '--porcelain']), statusVorher)
      assert.equal(git(projekt, ['symbolic-ref', 'HEAD']).trim(), 'refs/heads/arbeit')

      const nochmal = await bereiteArbeitsordnerVor({ repoWurzel: projekt, workflowId: 'wf-a', vorherigeBasis: kopf, npm: npmAttrappe().npm, pruefeE183: E183_GRUEN })
      assert.equal(nochmal.status, 'BEREIT', nochmal.grund ?? '')
      assert.equal(nochmal.basis_commit, kopf)
    } finally {
      raeumeVerzeichnis(basis)
    }
  })

  it('kein Git-Repository und Repo ohne Commit: klarer Halt mit Grund', async () => {
    const ohneRepo = neueWurzel()
    const ohneCommit = neueWurzel()
    try {
      // tmpdir kann selbst in einem Repo liegen — dann meldet die Wurzelprüfung den Fehler; beides ist ein Halt.
      const a = await bereiteArbeitsordnerVor({ repoWurzel: ohneRepo.projekt, workflowId: 'wf-b', vorherigeBasis: null, npm: npmAttrappe().npm, pruefeE183: E183_GRUEN })
      assert.equal(a.status, 'FEHLGESCHLAGEN')
      assert.match(a.grund ?? '', /kein Git-Repository|nicht die Wurzel/)
      git(ohneCommit.projekt, ['init', '--quiet'])
      const b = await bereiteArbeitsordnerVor({ repoWurzel: ohneCommit.projekt, workflowId: 'wf-b', vorherigeBasis: null, npm: npmAttrappe().npm, pruefeE183: E183_GRUEN })
      assert.equal(b.status, 'FEHLGESCHLAGEN')
      assert.match(b.grund ?? '', /noch keinen Commit/)
      assert.equal(existsSync(join(ohneCommit.basis, 'projekt-laeufe')), false)
    } finally {
      raeumeVerzeichnis(ohneRepo.basis)
      raeumeVerzeichnis(ohneCommit.basis)
    }
  })

  it('fremder Ordner am Zielpfad: Halt, nichts überschrieben', async () => {
    const { basis, projekt } = neuesRepo()
    try {
      const abgeleitet = leiteArbeitsordnerAb(projekt, 'wf-c')
      const ziel = abgeleitet.ok ? abgeleitet.pfad : ''
      mkdirSync(ziel, { recursive: true })
      writeFileSync(join(ziel, 'fremd.txt'), 'bleibt')
      const ergebnis = await bereiteArbeitsordnerVor({ repoWurzel: projekt, workflowId: 'wf-c', vorherigeBasis: null, npm: npmAttrappe().npm, pruefeE183: E183_GRUEN })
      assert.equal(ergebnis.status, 'FEHLGESCHLAGEN')
      assert.match(ergebnis.grund ?? '', /kein Arbeitsordner dieses Ablaufs/)
      assert.equal(readFileSync(join(ziel, 'fremd.txt'), 'utf8'), 'bleibt')
    } finally {
      raeumeVerzeichnis(basis)
    }
  })

  it('stehengebliebener Branch mit eigenem Stand: Halt statt Wiederverwendung', async () => {
    const { basis, projekt } = neuesRepo()
    try {
      git(projekt, ['branch', 'wf/wf-d'])
      writeFileSync(join(projekt, 'README.md'), 'Zeile 2\n')
      git(projekt, ['commit', '--quiet', '-am', 'weiter'])
      const ergebnis = await bereiteArbeitsordnerVor({ repoWurzel: projekt, workflowId: 'wf-d', vorherigeBasis: null, npm: npmAttrappe().npm, pruefeE183: E183_GRUEN })
      assert.equal(ergebnis.status, 'FEHLGESCHLAGEN')
      assert.match(ergebnis.grund ?? '', /existiert bereits mit eigenem Stand/)
    } finally {
      raeumeVerzeichnis(basis)
    }
  })

  it('npm ci --ignore-scripts mit package-lock.json; Fehlschlag und E-183-Rot halten an', async () => {
    const { basis, projekt } = neuesRepo()
    try {
      writeFileSync(join(projekt, 'package.json'), '{"name":"x","version":"1.0.0"}\n')
      writeFileSync(join(projekt, 'package-lock.json'), '{"lockfileVersion":3}\n')
      git(projekt, ['add', 'package.json', 'package-lock.json'])
      git(projekt, ['commit', '--quiet', '-m', 'npm'])
      const gruen = npmAttrappe(0)
      const a = await bereiteArbeitsordnerVor({ repoWurzel: projekt, workflowId: 'wf-e', vorherigeBasis: null, npm: gruen.npm, pruefeE183: E183_GRUEN })
      assert.equal(a.status, 'BEREIT', a.grund ?? '')
      assert.equal(a.vorbereitung.npm_ci?.ergebnis, 'OK')
      assert.deepEqual(gruen.aufrufe[0].slice(0, 2), ['ci', '--ignore-scripts'])

      const b = await bereiteArbeitsordnerVor({ repoWurzel: projekt, workflowId: 'wf-f', vorherigeBasis: null, npm: npmAttrappe(1).npm, pruefeE183: E183_GRUEN })
      assert.equal(b.status, 'FEHLGESCHLAGEN')
      assert.match(b.grund ?? '', /npm ci/)

      const c = await bereiteArbeitsordnerVor({ repoWurzel: projekt, workflowId: 'wf-g', vorherigeBasis: null, npm: npmAttrappe(0).npm, pruefeE183: () => ({ ok: false, grund: 'Hash weicht ab (E-183)' }) })
      assert.equal(c.status, 'FEHLGESCHLAGEN')
      assert.match(c.grund ?? '', /E-183/)
      assert.doesNotMatch(c.grund ?? '', /Zeilenenden|aufräumen/)
    } finally {
      raeumeVerzeichnis(basis)
    }
  })
})

/**
 * Baseline der LF-committeten Settings/Hook-Bytes in einem externen Wegwerf-Repo (`* -text` wie B18) und die
 * echte E-183-Prüfung (pruefeStartbedingung1 über ermittleIstZustand) gegen einen beliebigen Ordner.
 * @param basis - Wegwerf-Wurzel des Tests (das externe Repo entsteht darunter)
 * @param projekt - Projektordner (Pfad der Werkzeugkonfiguration in der Baseline)
 * @param settingsInhalt - LF-Inhalt der committeten Werkzeugkonfiguration
 * @param hookInhalt - LF-Inhalt des committeten Hooks
 * @returns Prüffunktion: Ordner ⇒ Ergebnis von pruefeStartbedingung1
 */
function e183GegenBaseline(basis: string, projekt: string, settingsInhalt: string, hookInhalt: string): (wurzel: string) => ReturnType<typeof pruefeStartbedingung1> {
  const extern = join(basis, 'autorisierung')
  mkdirSync(extern, { recursive: true })
  git(extern, ['init', '--quiet'])
  git(extern, ['config', 'user.email', 'test@example.invalid'])
  git(extern, ['config', 'user.name', 'Test'])
  writeFileSync(join(extern, '.gitattributes'), '* -text\n')
  const baselineInhalt = JSON.stringify({
    werkzeug_konfiguration: { pfad: join(projekt, '.claude', 'settings.json'), hash: sha256Hex(settingsInhalt) },
    schutzskripte: [{ pfad: '.claude/hooks/w.js', hash: sha256Hex(hookInhalt) }],
  })
  mkdirSync(join(extern, 'invocation-policy-baseline'), { recursive: true })
  writeFileSync(join(extern, 'invocation-policy-baseline', 'b.json'), baselineInhalt)
  git(extern, ['add', '.'])
  git(extern, ['commit', '--quiet', '-m', 'baseline'])
  const baselineReferenz = { pfad: join(extern, 'invocation-policy-baseline', 'b.json'), commit_hash: git(extern, ['rev-parse', 'HEAD']).trim(), datei_hash: sha256Hex(baselineInhalt) }
  return (wurzel: string) => pruefeStartbedingung1(baselineReferenz, ermittleIstZustand(join(wurzel, '.claude', 'settings.json')), { repoWurzel: extern })
}

/**
 * Kein CR in Werkzeugkonfiguration und Hook eines Arbeitsordners.
 * @param pfad - Arbeitsordner
 * @param kennung - workflowId für die Fehlermeldung
 */
function assertOhneCr(pfad: string, kennung: string): void {
  for (const datei of [join('.claude', 'settings.json'), join('.claude', 'hooks', 'w.js')]) {
    assert.equal(readFileSync(join(pfad, datei)).includes(0x0d), false, `${kennung}: ${datei} enthält CR`)
  }
}

describe('E-183 gegen die Settings des Worktrees', () => {
  it('Grün bei gleichem Commit, Rot nach geändertem Hook im Branch', async () => {
    const { basis, projekt, settingsInhalt, hookInhalt } = neuesRepo()
    try {
      const pruefe = e183GegenBaseline(basis, projekt, settingsInhalt, hookInhalt)

      const vorbereitet = await bereiteArbeitsordnerVor({ repoWurzel: projekt, workflowId: 'wf-h', vorherigeBasis: null, npm: npmAttrappe().npm, pruefeE183: pruefe })
      assert.equal(vorbereitet.status, 'BEREIT', vorbereitet.grund ?? '')
      assert.deepEqual(pruefe(vorbereitet.pfad), { ok: true })

      writeFileSync(join(vorbereitet.pfad, '.claude', 'hooks', 'w.js'), 'geaenderter-hook\n')
      git(vorbereitet.pfad, ['commit', '--quiet', '-am', 'hook im branch'])
      const rot = pruefe(vorbereitet.pfad)
      assert.equal(rot.ok, false)
      assert.match(rot.ok ? '' : rot.grund, /E-183/)
      assert.deepEqual(pruefe(projekt), { ok: true })
    } finally {
      raeumeVerzeichnis(basis)
    }
  })

  it('core.autocrlf=true im Projekt: Arbeitsordner bekommt LF-Bytes, E-183 besteht (neuer und vorhandener Branch, F45 B2b-3b-2b-2b-2a)', async () => {
    // Mutationsprobe: ohne `-c core.autocrlf=false` an beiden `worktree add` checkt git CRLF aus — E-183 wird rot.
    const { basis, projekt, settingsInhalt, hookInhalt } = neuesRepo()
    try {
      git(projekt, ['config', 'core.autocrlf', 'true'])
      const pruefe = e183GegenBaseline(basis, projekt, settingsInhalt, hookInhalt)
      git(projekt, ['branch', 'wf/wf-crlf-b'])
      for (const workflowId of ['wf-crlf-a', 'wf-crlf-b']) {
        const ergebnis = await bereiteArbeitsordnerVor({ repoWurzel: projekt, workflowId, vorherigeBasis: null, npm: npmAttrappe().npm, pruefeE183: pruefe })
        assert.equal(ergebnis.status, 'BEREIT', ergebnis.grund ?? '')
        assertOhneCr(ergebnis.pfad, workflowId)
      }
    } finally {
      raeumeVerzeichnis(basis)
    }
  })

  it('Projekt-.gitattributes `* text=auto` ohne eol und core.eol=crlf: Arbeitsordner trotzdem LF, E-183 besteht', async () => {
    // Mutationsprobe: ohne `-c core.eol=lf` checkt git Dateien mit text-Attribut nach core.eol (hier crlf) aus — E-183 rot.
    const { basis, projekt, settingsInhalt, hookInhalt } = neuesRepo()
    try {
      writeFileSync(join(projekt, '.gitattributes'), '* text=auto\n')
      git(projekt, ['add', '.gitattributes'])
      git(projekt, ['commit', '--quiet', '-m', 'attribute'])
      git(projekt, ['config', 'core.autocrlf', 'true'])
      git(projekt, ['config', 'core.eol', 'crlf'])
      const pruefe = e183GegenBaseline(basis, projekt, settingsInhalt, hookInhalt)
      git(projekt, ['branch', 'wf/wf-eol-b'])
      for (const workflowId of ['wf-eol-a', 'wf-eol-b']) {
        const ergebnis = await bereiteArbeitsordnerVor({ repoWurzel: projekt, workflowId, vorherigeBasis: null, npm: npmAttrappe().npm, pruefeE183: pruefe })
        assert.equal(ergebnis.status, 'BEREIT', ergebnis.grund ?? '')
        assertOhneCr(ergebnis.pfad, workflowId)
      }
    } finally {
      raeumeVerzeichnis(basis)
    }
  })

  it('Wiederaufnahme eines CRLF-Arbeitsordners von vor der Korrektur: Halt mit Zeilenenden- und Aufräum-Hinweis', async () => {
    const { basis, projekt, settingsInhalt, hookInhalt } = neuesRepo()
    try {
      git(projekt, ['config', 'core.autocrlf', 'true'])
      const pruefe = e183GegenBaseline(basis, projekt, settingsInhalt, hookInhalt)
      const abgeleitet = leiteArbeitsordnerAb(projekt, 'wf-alt')
      const ziel = abgeleitet.ok ? abgeleitet.pfad : ''
      // Wie vor F-1143 angelegt: worktree add ohne Optionen, autocrlf=true ⇒ CRLF.
      git(projekt, ['worktree', 'add', '--quiet', '-b', 'wf/wf-alt', ziel, 'HEAD'])
      assert.equal(readFileSync(join(ziel, '.claude', 'settings.json')).includes(0x0d), true, 'Vorbedingung: alter Arbeitsordner hat CRLF')
      const ergebnis = await bereiteArbeitsordnerVor({ repoWurzel: projekt, workflowId: 'wf-alt', vorherigeBasis: null, npm: npmAttrappe().npm, pruefeE183: pruefe })
      assert.equal(ergebnis.status, 'FEHLGESCHLAGEN')
      assert.match(ergebnis.grund ?? '', /E-183/)
      assert.match(ergebnis.grund ?? '', /Windows-Zeilenenden \(CRLF\).*Arbeitsordner aufräumen/)
    } finally {
      raeumeVerzeichnis(basis)
    }
  })

  it('Wiederaufnahme eines LF-Arbeitsordners mit rotem E-183: kein Zeilenenden-Rat', async () => {
    const { basis, projekt } = neuesRepo()
    try {
      const rot = () => ({ ok: false as const, grund: 'Hash weicht ab (E-183)' })
      const erst = await bereiteArbeitsordnerVor({ repoWurzel: projekt, workflowId: 'wf-lf', vorherigeBasis: null, npm: npmAttrappe().npm, pruefeE183: E183_GRUEN })
      assert.equal(erst.status, 'BEREIT', erst.grund ?? '')
      const ohneCr = await bereiteArbeitsordnerVor({ repoWurzel: projekt, workflowId: 'wf-lf', vorherigeBasis: erst.basis_commit, npm: npmAttrappe().npm, pruefeE183: rot })
      assert.equal(ohneCr.status, 'FEHLGESCHLAGEN')
      assert.doesNotMatch(ohneCr.grund ?? '', /Zeilenenden|aufräumen/)
    } finally {
      raeumeVerzeichnis(basis)
    }
  })

  it('Wiederaufnahme eines alten Arbeitsordners, nur der Hook mit CRLF: Rat erwartet (Hooks werden mitgeprüft)', async () => {
    const { basis, projekt, settingsInhalt, hookInhalt } = neuesRepo()
    try {
      // Werkzeugkonfiguration ohne Umwandlung (-text), der Hook nicht: ein Checkout vor F-1143 gibt nur dem Hook CRLF.
      writeFileSync(join(projekt, '.gitattributes'), '.claude/settings.json -text\n')
      git(projekt, ['add', '.gitattributes'])
      git(projekt, ['commit', '--quiet', '-m', 'attribute'])
      git(projekt, ['config', 'core.autocrlf', 'true'])
      const pruefe = e183GegenBaseline(basis, projekt, settingsInhalt, hookInhalt)
      const abgeleitet = leiteArbeitsordnerAb(projekt, 'wf-hook')
      const ziel = abgeleitet.ok ? abgeleitet.pfad : ''
      git(projekt, ['worktree', 'add', '--quiet', '-b', 'wf/wf-hook', ziel, 'HEAD'])
      assert.equal(readFileSync(join(ziel, '.claude', 'settings.json')).includes(0x0d), false, 'Vorbedingung: Werkzeugkonfiguration LF')
      assert.equal(readFileSync(join(ziel, '.claude', 'hooks', 'w.js')).includes(0x0d), true, 'Vorbedingung: Hook CRLF')
      const ergebnis = await bereiteArbeitsordnerVor({ repoWurzel: projekt, workflowId: 'wf-hook', vorherigeBasis: null, npm: npmAttrappe().npm, pruefeE183: pruefe })
      assert.equal(ergebnis.status, 'FEHLGESCHLAGEN')
      assert.match(ergebnis.grund ?? '', /E-183.*Windows-Zeilenenden \(CRLF\).*Arbeitsordner aufräumen/)
    } finally {
      raeumeVerzeichnis(basis)
    }
  })

  it('frisch angelegter Arbeitsordner mit CR aus dem Projekt (`eol=crlf`): E-183 rot ohne Aufräum-Rat (Aufräumen hülfe nicht)', async () => {
    const { basis, projekt, settingsInhalt, hookInhalt } = neuesRepo()
    try {
      writeFileSync(join(projekt, '.gitattributes'), '.claude/** text eol=crlf\n')
      git(projekt, ['add', '.gitattributes'])
      git(projekt, ['commit', '--quiet', '-m', 'attribute'])
      const pruefe = e183GegenBaseline(basis, projekt, settingsInhalt, hookInhalt)
      const ergebnis = await bereiteArbeitsordnerVor({ repoWurzel: projekt, workflowId: 'wf-crlf-attr', vorherigeBasis: null, npm: npmAttrappe().npm, pruefeE183: pruefe })
      assert.equal(readFileSync(join(ergebnis.pfad, '.claude', 'settings.json')).includes(0x0d), true, 'Vorbedingung: Attribut erzeugt CR')
      assert.equal(ergebnis.status, 'FEHLGESCHLAGEN')
      assert.match(ergebnis.grund ?? '', /E-183/)
      assert.doesNotMatch(ergebnis.grund ?? '', /Zeilenenden|aufräumen/)
    } finally {
      raeumeVerzeichnis(basis)
    }
  })
})

describe('leseArbeitsordnerVorbedingung', () => {
  it('Grün auf wf/<id>, Rot auf anderem Branch oder ohne Ordner', async () => {
    const { basis, projekt } = neuesRepo()
    try {
      const v = await bereiteArbeitsordnerVor({ repoWurzel: projekt, workflowId: 'wf-i', vorherigeBasis: null, npm: npmAttrappe().npm, pruefeE183: E183_GRUEN })
      writeFileSync(join(v.pfad, 'README.md'), 'geaendert\n')
      assert.deepEqual(leseArbeitsordnerVorbedingung(v.pfad, 'wf/wf-i'), { ok: true })
      assert.equal(leseArbeitsordnerVorbedingung(v.pfad, 'wf/anderer').ok, false)
      assert.equal(leseArbeitsordnerVorbedingung(join(basis, 'gibt-es-nicht'), 'wf/wf-i').ok, false)
    } finally {
      raeumeVerzeichnis(basis)
    }
  })
})

describe('entferneArbeitsordner', () => {
  it('gesperrter Worktree (abgebrochenes Anlegen): ohne Verwerfen Grund, mit Verwerfen entsperrt und entfernt', async () => {
    const { basis, projekt } = neuesRepo()
    try {
      const v = await bereiteArbeitsordnerVor({ repoWurzel: projekt, workflowId: 'wf-m', vorherigeBasis: null, npm: npmAttrappe().npm, pruefeE183: E183_GRUEN })
      git(projekt, ['worktree', 'lock', '--reason', 'initializing', v.pfad])
      const ohne = await entferneArbeitsordner({ repoWurzel: projekt, pfad: v.pfad, branch: v.branch, verwerfen: false })
      assert.equal(ohne.ok, false)
      assert.match(ohne.ok ? '' : ohne.grund, /gesperrt/)
      const mit = await entferneArbeitsordner({ repoWurzel: projekt, pfad: v.pfad, branch: v.branch, verwerfen: true })
      assert.equal(mit.ok, true, mit.ok ? '' : mit.grund)
      assert.equal(existsSync(v.pfad), false)
    } finally {
      raeumeVerzeichnis(basis)
    }
  })

  it('Ordner von Hand gelöscht: Eintrag wird ausgetragen, Branch wie sonst behandelt', async () => {
    const { basis, projekt } = neuesRepo()
    try {
      const v = await bereiteArbeitsordnerVor({ repoWurzel: projekt, workflowId: 'wf-n', vorherigeBasis: null, npm: npmAttrappe().npm, pruefeE183: E183_GRUEN })
      raeumeVerzeichnis(v.pfad)
      const ergebnis = await entferneArbeitsordner({ repoWurzel: projekt, pfad: v.pfad, branch: v.branch, verwerfen: false })
      assert.equal(ergebnis.ok, true, ergebnis.ok ? '' : ergebnis.grund)
      assert.doesNotMatch(git(projekt, ['worktree', 'list']), /wf-n/)
    } finally {
      raeumeVerzeichnis(basis)
    }
  })

  it('stehengebliebener Branch auf HEAD ohne Worktree wird wieder ausgecheckt (Wiederaufnahme)', async () => {
    const { basis, projekt } = neuesRepo()
    try {
      git(projekt, ['branch', 'wf/wf-o'])
      const v = await bereiteArbeitsordnerVor({ repoWurzel: projekt, workflowId: 'wf-o', vorherigeBasis: null, npm: npmAttrappe().npm, pruefeE183: E183_GRUEN })
      assert.equal(v.status, 'BEREIT', v.grund ?? '')
      assert.equal(git(v.pfad, ['symbolic-ref', 'HEAD']).trim(), 'refs/heads/wf/wf-o')
    } finally {
      raeumeVerzeichnis(basis)
    }
  })

  it('gemergt (nichts committet): Worktree weg, Branch gelöscht', async () => {
    const { basis, projekt } = neuesRepo()
    try {
      const v = await bereiteArbeitsordnerVor({ repoWurzel: projekt, workflowId: 'wf-j', vorherigeBasis: null, npm: npmAttrappe().npm, pruefeE183: E183_GRUEN })
      const ergebnis = await entferneArbeitsordner({ repoWurzel: projekt, pfad: v.pfad, branch: v.branch, verwerfen: false })
      assert.deepEqual(ergebnis, { ok: true, branchGeloescht: true, hinweis: null })
      assert.equal(existsSync(v.pfad), false)
      assert.equal(git(projekt, ['branch', '--list', 'wf/wf-j']).trim(), '')
    } finally {
      raeumeVerzeichnis(basis)
    }
  })

  it('nicht gemergt: Worktree weg, Branch bleibt mit Hinweis (nie -D)', async () => {
    const { basis, projekt } = neuesRepo()
    try {
      const v = await bereiteArbeitsordnerVor({ repoWurzel: projekt, workflowId: 'wf-k', vorherigeBasis: null, npm: npmAttrappe().npm, pruefeE183: E183_GRUEN })
      writeFileSync(join(v.pfad, 'neu.txt'), 'x')
      git(v.pfad, ['add', 'neu.txt'])
      git(v.pfad, ['commit', '--quiet', '-m', 'im branch'])
      const ergebnis = await entferneArbeitsordner({ repoWurzel: projekt, pfad: v.pfad, branch: v.branch, verwerfen: false })
      assert.equal(ergebnis.ok, true)
      if (ergebnis.ok) {
        assert.equal(ergebnis.branchGeloescht, false)
        assert.match(ergebnis.hinweis ?? '', /nicht gemergt/)
      }
      assert.equal(existsSync(v.pfad), false)
      assert.equal(git(projekt, ['branch', '--list', 'wf/wf-k']).trim(), 'wf/wf-k')
    } finally {
      raeumeVerzeichnis(basis)
    }
  })

  it('offene Änderungen: ohne Verwerfen abgelehnt (Ordner bleibt), mit Verwerfen entfernt', async () => {
    const { basis, projekt } = neuesRepo()
    try {
      const v = await bereiteArbeitsordnerVor({ repoWurzel: projekt, workflowId: 'wf-l', vorherigeBasis: null, npm: npmAttrappe().npm, pruefeE183: E183_GRUEN })
      writeFileSync(join(v.pfad, 'README.md'), 'nicht gesichert\n')
      const abgelehnt = await entferneArbeitsordner({ repoWurzel: projekt, pfad: v.pfad, branch: v.branch, verwerfen: false })
      assert.equal(abgelehnt.ok, false)
      assert.match(abgelehnt.ok ? '' : abgelehnt.grund, /nicht gesicherte Änderung/)
      assert.equal(existsSync(v.pfad), true)
      const verworfen = await entferneArbeitsordner({ repoWurzel: projekt, pfad: v.pfad, branch: v.branch, verwerfen: true })
      assert.equal(verworfen.ok, true)
      assert.equal(existsSync(v.pfad), false)
      assert.equal(existsSync(dirname(v.pfad)), true)
    } finally {
      raeumeVerzeichnis(basis)
    }
  })
})
