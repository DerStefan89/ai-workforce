/**
 * Datei: src/ressourcen/skill-installation.test.ts
 *
 * Zweck: node:test-Fälle für src/ressourcen/skill-installation.ts und den Skill-Zweig von
 * installiereRessource (F36 WS-5b). ls-remote-Auswertung mit gestubbtem Runner (nur exakte Refs,
 * mehrdeutig, fehlend); holeSkillQuelle und die ganze Installation mit ECHTEM git gegen ein lokales
 * Wegwerf-Repo (die github-Adresse wird im Runner auf file:// umgeschrieben — kein Netz): Erfolg mit
 * installation { pfad, version, inhalt_hash }, Symlink im Quellbaum, fehlende SKILL.md, SHA nach der
 * Anzeige geändert (409), jeder Fehlschlag ohne Spuren (cap-Ordner weg, ressourcen.json bitgleich).
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 */

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { raeumeVerzeichnis } from '../../scripts/_aufraeumen.ts'
import { validiereRessourcenDaten } from './index.ts'
import { bereiteInstallationVor, ECHTE_RUNNER, gitUmgebung, type InstallationsRunner, installiereRessource, type ProzessErgebnis } from './installation.ts'
import { berechneInhaltHash, zerlegeGithubUrl } from './skill-dateien.ts'
import { GIT_UMGEBUNG_OHNE_KONFIG, type GitRunner, holeSkillQuelle, loeseSkillCommitAuf, pruefeSkillQuelle } from './skill-installation.ts'

const ok = (stdout: string): ProzessErgebnis => ({ code: 0, stdout, stderr: '', zeitueberschritten: false })
const QUELLE = zerlegeGithubUrl('https://github.com/fixture/pack/tree/main/plugins/p') as ReturnType<typeof zerlegeGithubUrl> & { ok: true }
const A = 'a'.repeat(40)
const B = 'b'.repeat(40)

test('loeseSkillCommitAuf: nur exakt refs/heads/<ref>, nicht */<ref> (real beobachtet); Tag gepeelt; SHA-Ref abgelehnt', async () => {
  const runner = (stdout: string): GitRunner => async () => ok(stdout)
  assert.deepEqual(await loeseSkillCommitAuf(QUELLE, runner(`${B}\trefs/heads/daisy/main\n${A}\trefs/heads/main\n`), 1000), { ok: true, sha: A })
  const tag = zerlegeGithubUrl('https://github.com/fixture/pack/tree/v1/x') as typeof QUELLE
  assert.deepEqual(await loeseSkillCommitAuf(tag, runner(`${B}\trefs/tags/v1\n${A}\trefs/tags/v1^{}\n`), 1000), { ok: true, sha: A })
  const mehrdeutig = await loeseSkillCommitAuf(QUELLE, runner(`${A}\trefs/heads/main\n${B}\trefs/tags/main\n`), 1000)
  assert.equal(mehrdeutig.ok, false)
  assert.match(mehrdeutig.ok ? '' : mehrdeutig.grund, /mehrdeutig/)
  const fehlt = await loeseSkillCommitAuf(QUELLE, runner(`${B}\trefs/heads/daisy/main\n`), 1000)
  assert.match(fehlt.ok ? '' : fehlt.grund, /Ref nicht gefunden/)
  const wurzel = zerlegeGithubUrl('https://github.com/fixture/pack') as typeof QUELLE
  assert.deepEqual(await loeseSkillCommitAuf(wurzel, runner(`${A}\tHEAD\n`), 1000), { ok: true, sha: A })
  // Reviewer (Fork-Netz): eine Commit-SHA als Ref lehnt schon zerlegeGithubUrl ab — kein ls-remote-Kurzweg.
  assert.equal(zerlegeGithubUrl(`https://github.com/fixture/pack/tree/${A}/x`).ok, false)
  const kaputt = await loeseSkillCommitAuf(QUELLE, async () => ({ code: 128, stdout: '', stderr: 'fatal: repository not found', zeitueberschritten: false }), 1000)
  assert.equal(kaputt.ok ? 0 : kaputt.status, 502)
})

/** Wegwerf-„GitHub“: ein lokales Repo je Name, der Runner schreibt https://github.com/fixture/<name>.git auf file:// um. */
function wegwerfRemote(): { wurzel: string; git: GitRunner; repo: (name: string, dateien: Record<string, string>, symlinks?: Record<string, string>) => string; commit: (name: string, datei: string, inhalt: string) => string; ende: () => void } {
  const wurzel = mkdtempSync(join(tmpdir(), 'ws5b-remote-'))
  const g = (cwd: string, ...a: string[]) => execFileSync('git', a, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  const url = (name: string) => `file:///${join(wurzel, name).replaceAll('\\', '/')}`
  const git: GitRunner = (args, optionen) => ECHTE_RUNNER.git?.(args.map((a) => a.replace(/^https:\/\/github\.com\/fixture\/([^/]+)\.git$/, (_x, name: string) => url(name))), optionen) as Promise<ProzessErgebnis>
  return {
    wurzel,
    git,
    repo(name, dateien, symlinks = {}) {
      const r = join(wurzel, name)
      mkdirSync(r)
      g(r, 'init', '-q', '-b', 'main')
      g(r, 'config', 'user.email', 't@example.invalid')
      g(r, 'config', 'user.name', 'T')
      g(r, 'config', 'core.autocrlf', 'false')
      for (const [pfad, inhalt] of Object.entries(dateien)) {
        mkdirSync(join(r, pfad, '..'), { recursive: true })
        writeFileSync(join(r, pfad), inhalt)
      }
      g(r, 'add', '-A')
      // Symlink als Git-Eintrag (Modus 120000), ohne ihn im Dateisystem anzulegen.
      for (const [pfad, ziel] of Object.entries(symlinks)) {
        const blob = execFileSync('git', ['hash-object', '-w', '--stdin'], { cwd: r, input: ziel, encoding: 'utf8' }).trim()
        g(r, 'update-index', '--add', '--cacheinfo', `120000,${blob},${pfad}`)
      }
      g(r, 'commit', '-q', '-m', 'init')
      return g(r, 'rev-parse', 'HEAD').trim()
    },
    commit(name, datei, inhalt) {
      const r = join(wurzel, name)
      writeFileSync(join(r, datei), inhalt)
      g(r, 'add', '-A')
      g(r, 'commit', '-q', '-m', 'neu')
      return g(r, 'rev-parse', 'HEAD').trim()
    },
    ende: () => raeumeVerzeichnis(wurzel),
  }
}

const SKILL_MD = '---\nname: gate-skill\ndescription: Test-Skill.\n---\n# Gate\n'

test('holeSkillQuelle: echter Fetch genau der SHA, nur der Skill-Pfad; Symlink im Quellbaum → 422; Pfad fehlt → 422', async () => {
  const r = wegwerfRemote()
  try {
    const sha = r.repo('pack', { 'plugins/p/skills/gate-skill/SKILL.md': SKILL_MD, 'plugins/p/skills/gate-skill/helfer.sh': 'echo hi\n', 'plugins/p/README.md': 'nicht mitnehmen', 'anderes/x.txt': 'x' })
    const geholt = await holeSkillQuelle(QUELLE, sha, 'skills/gate-skill', r.git, 60_000)
    assert.ok(geholt.ok, geholt.ok ? '' : geholt.grund)
    assert.deepEqual(geholt.dateien, ['SKILL.md', 'helfer.sh'])
    assert.equal(readFileSync(join(geholt.quellOrdner, 'SKILL.md'), 'utf8'), SKILL_MD)
    geholt.aufraeumen()
    assert.equal(existsSync(geholt.quellOrdner), false)

    const shaLink = r.repo('mitlink', { 'plugins/p/skills/gate-skill/SKILL.md': SKILL_MD }, { 'plugins/p/skills/gate-skill/geheim': '../../../../etc/passwd' })
    const link = await holeSkillQuelle({ ...QUELLE, repoUrl: 'https://github.com/fixture/mitlink.git' }, shaLink, 'skills/gate-skill', r.git, 60_000)
    assert.equal(link.ok, false)
    assert.match(link.ok ? '' : link.grund, /Symlink im Quellbaum: 'plugins\/p\/skills\/gate-skill\/geheim'/)

    const fehlt = await holeSkillQuelle(QUELLE, sha, 'skills/gibt-es-nicht', r.git, 60_000)
    assert.equal(fehlt.ok ? 0 : fehlt.status, 422)
  } finally {
    r.ende()
  }
})

test('pruefeSkillQuelle: SKILL.md fehlt, kein Frontmatter, ungültiger/eingebauter/belegter Name → 422', () => {
  const ordner = mkdtempSync(join(tmpdir(), 'ws5b-quelle-'))
  try {
    const mit = (inhalt: string | null, belegt: string[] = []) => {
      raeumeVerzeichnis(ordner)
      mkdirSync(ordner, { recursive: true })
      if (inhalt !== null) writeFileSync(join(ordner, 'SKILL.md'), inhalt)
      return pruefeSkillQuelle(ordner, belegt)
    }
    assert.deepEqual(mit(SKILL_MD), { ok: true, name: 'gate-skill', beschreibung: 'Test-Skill.' })
    assert.match((mit(null) as { grund: string }).grund, /SKILL\.md fehlt/)
    assert.match((mit('# ohne Frontmatter') as { grund: string }).grund, /kein vollständiges Frontmatter/)
    assert.match((mit('---\nname: Gross_Name\ndescription: d\n---\n') as { grund: string }).grund, /verletzt/)
    assert.match((mit('---\nname: loop\ndescription: d\n---\n') as { grund: string }).grund, /eingebauten Skill/)
    assert.match((mit(SKILL_MD, ['gate-skill']) as { grund: string }).grund, /anderen Ort-B-Skill/)
  } finally {
    raeumeVerzeichnis(ordner)
  }
})

/** Katalog mit einem installierbaren externen Skill. */
function katalog(url = 'https://github.com/fixture/pack/tree/main/plugins/p'): string {
  return `${JSON.stringify(
    {
      ressourcen_schema: 'v0',
      ressourcen: [
        {
          id: 'gate-skill',
          typ: 'extern',
          name: 'Gate Skill',
          beschreibung: 'Fixture.',
          unterart: 'skill',
          lizenz: 'MIT (Fixture)',
          capabilities: ['X'],
          freigabe: 'OFFEN',
          herkunft: { art: 'extern', url },
          installation_vorlage: { skill_pfad: 'skills/gate-skill' },
          anwendbar_wenn: { task_typen_any: ['bugfix'] },
        },
      ],
    },
    null,
    2
  )}\n`
}

test('installiereRessource (skill): Erfolg schreibt installation { pfad, version = SHA, inhalt_hash } + FREIGEGEBEN; SHA danach geändert → 409 ohne Spuren', async () => {
  const r = wegwerfRemote()
  const installWurzel = mkdtempSync(join(tmpdir(), 'ws5b-install-'))
  const capWurzel = join(mkdtempSync(join(tmpdir(), 'ws5b-capw-')), 'cap')
  try {
    r.repo('pack', { 'plugins/p/skills/gate-skill/SKILL.md': SKILL_MD, 'plugins/p/skills/gate-skill/LICENSE.txt': 'MIT' })
    writeFileSync(join(installWurzel, 'ressourcen.json'), katalog())
    const runner: InstallationsRunner = { npm: async () => ok(''), pruefeServer: async () => ({ ok: false, grund: 'nie' }), git: r.git }
    const kontext = { installWurzel, capWurzel, runner }
    const vor = await bereiteInstallationVor('gate-skill', kontext)
    assert.ok(vor.ok && vor.daten.art === 'skill', JSON.stringify(vor))
    assert.equal(vor.daten.quellPfad, 'plugins/p/skills/gate-skill')
    assert.match(vor.daten.hinweis, /Werkzeugsatz der Ausführung zulässt – lesende Befehle lässt die CLI auch ohne Eintrag zu/)
    assert.equal(existsSync(capWurzel), false, 'Vorbereiten legt nichts an')

    // SHA ändert sich nach der Anzeige (neuer Commit auf main) → 409, nichts angelegt.
    const katalogVorher = readFileSync(join(installWurzel, 'ressourcen.json'), 'utf8')
    r.commit('pack', 'plugins/p/skills/gate-skill/SKILL.md', `${SKILL_MD}\nneu\n`)
    const veraltet = await installiereRessource('gate-skill', { version: vor.daten.version, integrity: undefined, eintragHash: vor.daten.eintragHash }, kontext)
    assert.equal(veraltet.ok ? 0 : veraltet.status, 409)
    assert.match(veraltet.ok ? '' : veraltet.grund, /zeigt inzwischen auf/)
    assert.equal(readFileSync(join(installWurzel, 'ressourcen.json'), 'utf8'), katalogVorher)
    assert.equal(existsSync(join(capWurzel, 'gate-skill')), false)

    const neu = await bereiteInstallationVor('gate-skill', kontext)
    assert.ok(neu.ok)
    const erg = await installiereRessource('gate-skill', { version: neu.daten.version, integrity: undefined, eintragHash: neu.daten.eintragHash }, kontext)
    assert.ok(erg.ok && erg.daten.art === 'skill', JSON.stringify(erg))
    const ziel = join(capWurzel, 'gate-skill', '.claude', 'skills', 'gate-skill')
    assert.equal(erg.daten.zielordner, ziel)
    const daten = JSON.parse(readFileSync(join(installWurzel, 'ressourcen.json'), 'utf8'))
    assert.deepEqual(validiereRessourcenDaten(daten), [])
    const eintrag = daten.ressourcen[0]
    assert.equal(eintrag.freigabe, 'FREIGEGEBEN')
    assert.deepEqual(eintrag.installation, { pfad: ziel, version: neu.daten.version, inhalt_hash: berechneInhaltHash(ziel) })
    // Zweite Installation → 409 (schon installiert).
    const nochmal = await installiereRessource('gate-skill', { version: neu.daten.version, integrity: undefined, eintragHash: neu.daten.eintragHash }, kontext)
    assert.equal(nochmal.ok ? 0 : nochmal.status, 409)
  } finally {
    r.ende()
    raeumeVerzeichnis(installWurzel)
    raeumeVerzeichnis(join(capWurzel, '..'))
  }
})

test('installiereRessource (skill): Form — version keine SHA / eintragHash fehlt → 400; SKILL.md fehlt → 422 ohne Spuren', async () => {
  const r = wegwerfRemote()
  const installWurzel = mkdtempSync(join(tmpdir(), 'ws5b-install-'))
  const capWurzel = join(mkdtempSync(join(tmpdir(), 'ws5b-capw-')), 'cap')
  try {
    r.repo('pack', { 'plugins/p/skills/gate-skill/README.md': 'kein Skill' })
    writeFileSync(join(installWurzel, 'ressourcen.json'), katalog())
    const kontext = { installWurzel, capWurzel, runner: { npm: async () => ok(''), pruefeServer: async () => ({ ok: false as const, grund: 'nie' }), git: r.git } }
    const vor = await bereiteInstallationVor('gate-skill', kontext)
    assert.ok(vor.ok)
    assert.equal((await installiereRessource('gate-skill', { version: '1.2.3', integrity: undefined, eintragHash: vor.daten.eintragHash }, kontext)).ok, false)
    const ohneHash = await installiereRessource('gate-skill', { version: vor.daten.version, integrity: undefined, eintragHash: undefined }, kontext)
    assert.equal(ohneHash.ok ? 0 : ohneHash.status, 400)
    const katalogVorher = readFileSync(join(installWurzel, 'ressourcen.json'), 'utf8')
    const ohneSkillMd = await installiereRessource('gate-skill', { version: vor.daten.version, integrity: undefined, eintragHash: vor.daten.eintragHash }, kontext)
    assert.equal(ohneSkillMd.ok ? 0 : ohneSkillMd.status, 422)
    assert.match(ohneSkillMd.ok ? '' : ohneSkillMd.grund, /SKILL\.md fehlt/)
    assert.equal(readFileSync(join(installWurzel, 'ressourcen.json'), 'utf8'), katalogVorher)
    assert.equal(existsSync(join(capWurzel, 'gate-skill')), false)
  } finally {
    r.ende()
    raeumeVerzeichnis(installWurzel)
    raeumeVerzeichnis(join(capWurzel, '..'))
  }
})

test('git-Umgebung (Reviewer): gitUmgebung entfernt jede GIT_*-Variable; ls-remote läuft mit leerer globaler Konfiguration, ohne credential.helper und ohne Aufwärtssuche', async () => {
  const env = gitUmgebung({ PATH: 'p', GIT_CONFIG_PARAMETERS: "'core.hooksPath=/x'", git_dir: 'y', GIT_SSL_NO_VERIFY: '1' }, { GIT_CONFIG_NOSYSTEM: '1' })
  assert.deepEqual(env, { PATH: 'p', GIT_CONFIG_NOSYSTEM: '1' })
  const gesehen: { args: string[]; env?: Record<string, string> }[] = []
  const runner: GitRunner = async (args, optionen) => {
    gesehen.push({ args, env: optionen.env })
    return ok(`${A}\trefs/heads/main\n`)
  }
  await loeseSkillCommitAuf(QUELLE, runner, 1000)
  const [aufruf] = gesehen
  assert.deepEqual(aufruf.args.slice(0, 3), ['-c', 'credential.helper=', 'ls-remote'])
  assert.equal(aufruf.env?.GIT_CONFIG_NOSYSTEM, '1')
  assert.equal(aufruf.env?.GIT_TERMINAL_PROMPT, '0')
  assert.equal(aufruf.env?.GIT_CEILING_DIRECTORIES, GIT_UMGEBUNG_OHNE_KONFIG.GIT_CEILING_DIRECTORIES)
  assert.match(aufruf.env?.GIT_CONFIG_GLOBAL ?? '', /gitconfig-leer$/)
  assert.equal(existsSync(aufruf.env?.GIT_CONFIG_GLOBAL ?? ''), false, 'leere Konfiguration danach aufgeräumt')
})
