/**
 * Datei: src/faehigkeiten/vorschlag.test.ts
 *
 * Zweck: Tests der Erkennung der Fähigkeit-Vorschläge (F45 FB-1a, features/F45/plan-fb1-v2.md): gültiger Skill/Agent mit
 * demselben Hash wie beim Start, Gründe (Name, Frontmatter, Dateinamen, Verknüpfung, Grenzen, eingebauter Name), kein Lesen
 * durch Verknüpfungen, ziel_existiert ohne Unterschied der Schreibweise, ziel_ignoriert über echtes git.
 *
 * Wird aufgerufen von: npm run test (node --test)
 *
 * Wichtig: Fixtures in os.tmpdir(), Pfade nur über join (plattformneutral, keine Windows-Literale). Verknüpfungen als
 * Junction (Windows) bzw. Symlink (sonst); lässt das System keine Verknüpfung zu, wird der Fall übersprungen.
 */

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, describe, it } from 'node:test'
import { raeumeVerzeichnis } from '../../scripts/_aufraeumen.ts'
import { ermittleProjektFaehigkeiten } from './index.ts'
import { erkenneFaehigkeitVorschlaege, FAEHIGKEIT_VORSCHLAG_REGEL, pruefeZielIgnoriert, VORSCHLAG_GRENZEN, zielPfad } from './vorschlag.ts'

// qa FB-1a 7: check-ignore liest sonst die globale/System-Konfiguration des Entwicklers (z. B. core.excludesFile mit .claude/).
const gitKonfig = mkdtempSync(join(tmpdir(), 'fb1a-gitcfg-'))
process.env.GIT_CONFIG_GLOBAL = join(gitKonfig, 'leer')
process.env.GIT_CONFIG_NOSYSTEM = '1'
// Der Git-Starter (fuehreGitAsync) entfernt jede GIT_*-Variable — für pruefeZielIgnoriert zeigen HOME und XDG_CONFIG_HOME
// deshalb zusätzlich auf einen leeren Ordner (globale Konfiguration); die System-Konfiguration der git-Installation gilt dort mit.
process.env.HOME = gitKonfig
process.env.XDG_CONFIG_HOME = gitKonfig

const ordner: string[] = [gitKonfig]
after(() => {
  for (const o of ordner) raeumeVerzeichnis(o)
})

/** Neue leere Wurzel. @returns Pfad */
function wurzel(): string {
  const w = mkdtempSync(join(tmpdir(), 'fb1a-'))
  ordner.push(w)
  return w
}

const skillText = (name: string, zusatz = ''): string => `---\nname: ${name}\ndescription: Prüft etwas.\n${zusatz}---\n\nInhalt\n`
const agentText = (name: string, zusatz = ''): string => `---\nname: ${name}\ndescription: Liest Code.\ntools: Read, Grep, Glob\n${zusatz}---\n\nDu liest.\n`

/** Legt einen Skill-Vorschlag an. @param w - Wurzel @param name - Ordnername @param dateien - relativer Pfad → Inhalt */
function skill(w: string, name: string, dateien: Record<string, string> = { 'SKILL.md': skillText(name) }): string {
  const o = join(w, 'vorschlaege', 'faehigkeiten', 'skills', name)
  mkdirSync(o, { recursive: true })
  for (const [rel, inhalt] of Object.entries(dateien)) {
    const voll = join(o, ...rel.split('/'))
    mkdirSync(join(voll, '..'), { recursive: true })
    writeFileSync(voll, inhalt)
  }
  return o
}

/** Legt einen Agent-Vorschlag an. @param w - Wurzel @param datei - Dateiname @param inhalt - Inhalt @returns Pfad */
function agent(w: string, datei: string, inhalt: string): string {
  const o = join(w, 'vorschlaege', 'faehigkeiten', 'agents')
  mkdirSync(o, { recursive: true })
  writeFileSync(join(o, datei), inhalt)
  return join(o, datei)
}

/**
 * Verknüpfung anlegen (Ordner: Junction unter Windows, sonst Symlink); false, wenn das System es nicht zulässt.
 * @param ziel - Ziel
 * @param pfad - Ort der Verknüpfung
 * @param art - 'dir' | 'file'
 * @returns angelegt?
 */
function verknuepfe(ziel: string, pfad: string, art: 'dir' | 'file'): boolean {
  try {
    symlinkSync(ziel, pfad, art === 'dir' ? 'junction' : 'file')
    return true
  } catch {
    return false
  }
}

const KONTEXT = { katalog: new Map(), einstellungen: { an: [], aus: [], inhalt_freigaben: {} }, werkzeugNamen: ['Read', 'Grep', 'Glob'], referenz: { cli_version: '', agents: [], plugins: [], plugin_skills: [] } }

describe('erkenneFaehigkeitVorschlaege', () => {
  it('ohne Ordner ⇒ leer', () => {
    assert.deepEqual(erkenneFaehigkeitVorschlaege(wurzel()), [])
  })

  it('gültiger Skill und Agent: Felder und derselbe Hash wie beim Start nach dem Kopieren nach .claude/', () => {
    const w = wurzel()
    skill(w, 'pruefen', { 'SKILL.md': skillText('pruefen'), 'hilfe/notiz.txt': 'x\n' })
    agent(w, 'leser.md', agentText('leser'))
    const v = erkenneFaehigkeitVorschlaege(w)
    assert.equal(v.length, 2)
    const [s, a] = v
    assert.deepEqual({ ...s, hash: typeof s.hash }, { typ: 'skill', name: 'pruefen', pfad: 'vorschlaege/faehigkeiten/skills/pruefen', beschreibung: 'Prüft etwas.', hash: 'string', ziel_existiert: false, grund: null })
    assert.deepEqual({ ...a, hash: typeof a.hash }, { typ: 'agent', name: 'leser', pfad: 'vorschlaege/faehigkeiten/agents/leser.md', beschreibung: 'Liest Code.', hash: 'string', ziel_existiert: false, grund: null })
    const ziel = wurzel()
    cpSync(join(w, 'vorschlaege', 'faehigkeiten'), join(ziel, '.claude'), { recursive: true })
    const start = ermittleProjektFaehigkeiten(ziel, KONTEXT)
    assert.equal(start.eintraege.find((e) => e.schluessel === 'skill:pruefen')?.hash, s.hash)
    assert.equal(start.eintraege.find((e) => e.schluessel === 'agent:leser')?.hash, a.hash)
  })

  it('Gründe: Name ≠ Ordner, Feld außerhalb der Positivliste, Name nicht schlicht, SKILL.md fehlt, eingebauter Name', () => {
    const w = wurzel()
    skill(w, 'anders', { 'SKILL.md': skillText('falsch') })
    skill(w, 'feld', { 'SKILL.md': skillText('feld', 'allowed-tools: Bash\n') })
    skill(w, 'a b', { 'SKILL.md': skillText('a b') })
    skill(w, 'leer', { 'notiz.txt': 'x' })
    skill(w, 'code-review', { 'SKILL.md': skillText('code-review') })
    agent(w, 'Explore.md', agentText('Explore'))
    agent(w, 'werkzeug.md', agentText('werkzeug').replace('Read, Grep, Glob', 'Read, Agent'))
    const g = Object.fromEntries(erkenneFaehigkeitVorschlaege(w).map((e) => [e.name, e.grund]))
    assert.match(g.anders ?? '', /≠ Ordnername/)
    assert.match(g.feld ?? '', /nicht erlaubt/)
    assert.match(g['a b'] ?? '', /nicht schlicht/)
    assert.match(g.leer ?? '', /SKILL\.md fehlt/)
    assert.match(g['code-review'] ?? '', /eingebauten Skills/)
    assert.match(g.Explore ?? '', /eingebauten Agents/)
    assert.match(g.werkzeug ?? '', /außerhalb des Werkzeugsatzes: Agent/)
  })

  it('agent.tools nur der Form nach: ein Werkzeug außerhalb eines Werkzeugsatzes ist kein Grund', () => {
    const w = wurzel()
    agent(w, 'schreiber.md', agentText('schreiber').replace('Read, Grep, Glob', 'Read, Write'))
    assert.equal(erkenneFaehigkeitVorschlaege(w)[0].grund, null)
  })

  it('Dateinamen: .claude-Segment und CLAUDE.md im Skill ⇒ Grund', () => {
    const w = wurzel()
    skill(w, 'harness', { 'SKILL.md': skillText('harness'), '.claude/settings.json': '{}' })
    skill(w, 'kopf', { 'SKILL.md': skillText('kopf'), 'CLAUDE.md': '# x' })
    for (const e of erkenneFaehigkeitVorschlaege(w)) assert.match(e.grund ?? '', /\.claude\/ bzw\. CLAUDE\.md/)
  })

  it('Agent: keine .md, Unterordner, zu groß (nicht gelesen, Hash null)', () => {
    const w = wurzel()
    agent(w, 'notiz.txt', 'x')
    mkdirSync(join(w, 'vorschlaege', 'faehigkeiten', 'agents', 'unter'))
    agent(w, 'gross.md', 'x'.repeat(VORSCHLAG_GRENZEN.agentBytes + 1))
    const g = Object.fromEntries(erkenneFaehigkeitVorschlaege(w).map((e) => [e.name, e]))
    // Ohne .md bleibt der Name der volle Dateiname; mit Grund bekommt der Eintrag kein Ziel in check-ignore.
    assert.match(g['notiz.txt']?.grund ?? '', /keine \.md-Datei/)
    assert.match(g.unter?.grund ?? '', /Unterordner/)
    assert.match(g.gross?.grund ?? '', /größer als/)
    assert.equal(g.gross?.hash, null)
  })

  it('Grenzen: zu viele Einträge im Skill-Ordner, mehr als 20 Vorschläge', () => {
    const w = wurzel()
    const dateien: Record<string, string> = { 'SKILL.md': skillText('viel') }
    for (let i = 0; i < VORSCHLAG_GRENZEN.skillEintraege; i++) dateien[`d${i}.txt`] = 'x'
    skill(w, 'viel', dateien)
    assert.match(erkenneFaehigkeitVorschlaege(w)[0].grund ?? '', /mehr als 200 Einträge/)
    const w2 = wurzel()
    for (let i = 0; i < VORSCHLAG_GRENZEN.vorschlaege + 3; i++) agent(w2, `a${String(i).padStart(2, '0')}.md`, agentText(`a${String(i).padStart(2, '0')}`))
    const v = erkenneFaehigkeitVorschlaege(w2)
    assert.equal(v.length, VORSCHLAG_GRENZEN.vorschlaege + 1)
    assert.match(v.at(-1)?.grund ?? '', /3 weitere nicht geprüft/)
  })

  it('Grenzen: Skill über 1 MiB, alle Vorschläge zusammen über 4 MiB', () => {
    const w = wurzel()
    skill(w, 'gross', { 'SKILL.md': skillText('gross'), 'daten.bin': 'x'.repeat(VORSCHLAG_GRENZEN.skillBytes) })
    assert.match(erkenneFaehigkeitVorschlaege(w)[0].grund ?? '', /größer als 1 MiB/)
    const w2 = wurzel()
    const teil = 'x'.repeat(VORSCHLAG_GRENZEN.agentBytes - 1024)
    const anzahl = Math.ceil(VORSCHLAG_GRENZEN.gesamtBytes / teil.length) + 1
    for (let i = 0; i < anzahl; i++) agent(w2, `g${String(i).padStart(2, '0')}.md`, agentText(`g${String(i).padStart(2, '0')}`) + teil)
    const v = erkenneFaehigkeitVorschlaege(w2)
    assert.ok(v.slice(0, anzahl - 2).every((e) => e.grund === null))
    assert.match(v.at(-1)?.grund ?? '', /zusammen größer als 4 MiB/)
    assert.equal(v.at(-1)?.hash, null)
  })

  it('unbekannte Einträge unter vorschlaege/faehigkeiten/ werden gemeldet', () => {
    const w = wurzel()
    agent(w, 'leser.md', agentText('leser'))
    writeFileSync(join(w, 'vorschlaege', 'faehigkeiten', 'leser.md'), agentText('leser'))
    mkdirSync(join(w, 'vorschlaege', 'faehigkeiten', 'skill'))
    const v = erkenneFaehigkeitVorschlaege(w)
    assert.deepEqual(
      v.map((e) => [e.pfad, e.grund?.startsWith('unbekannter Eintrag') ?? false]),
      [
        ['vorschlaege/faehigkeiten/leser.md', true],
        ['vorschlaege/faehigkeiten/skill', true],
        ['vorschlaege/faehigkeiten/agents/leser.md', false],
      ]
    )
  })

  it('Skill: Name eines Projekt-Commands, SKILL.md in anderer Schreibweise', () => {
    const w = wurzel()
    skill(w, 'deploy')
    skill(w, 'klein', { 'skill.md': skillText('klein') })
    mkdirSync(join(w, '.claude', 'commands'), { recursive: true })
    writeFileSync(join(w, '.claude', 'commands', 'Deploy.md'), '# Deploy\n')
    const g = Object.fromEntries(erkenneFaehigkeitVorschlaege(w).map((e) => [e.name, e.grund]))
    assert.match(g.deploy ?? '', /Projekt-Commands/)
    assert.match(g.klein ?? '', /gefunden 'skill\.md' — die Datei muss genau SKILL\.md heißen/)
  })

  it('Zielordner als Verknüpfung ⇒ ziel_existiert true, ohne durch den Link zu lesen', (t) => {
    const fremd = wurzel()
    const w = wurzel()
    agent(w, 'leser.md', agentText('leser'))
    if (!verknuepfe(fremd, join(w, '.claude'), 'dir')) return t.skip('keine Verknüpfung möglich')
    assert.equal(erkenneFaehigkeitVorschlaege(w)[0].ziel_existiert, true)
  })

  it('ziel_existiert ohne Unterschied der Schreibweise', () => {
    const w = wurzel()
    agent(w, 'qa.md', agentText('qa'))
    skill(w, 'pruefen')
    mkdirSync(join(w, '.claude', 'agents'), { recursive: true })
    writeFileSync(join(w, '.claude', 'agents', 'QA.md'), agentText('QA'))
    mkdirSync(join(w, '.claude', 'skills', 'Pruefen'), { recursive: true })
    assert.deepEqual(
      erkenneFaehigkeitVorschlaege(w).map((e) => e.ziel_existiert),
      [true, true]
    )
  })

  it('Verknüpfung als Skill-Ordner, im Skill-Ordner und als Behälter ⇒ Grund, nichts durch den Link gelesen', (t) => {
    const fremd = wurzel()
    writeFileSync(join(fremd, 'SKILL.md'), skillText('link'))
    const w = wurzel()
    skill(w, 'echt')
    if (!verknuepfe(fremd, join(w, 'vorschlaege', 'faehigkeiten', 'skills', 'link'), 'dir')) return t.skip('keine Verknüpfung möglich')
    verknuepfe(fremd, join(w, 'vorschlaege', 'faehigkeiten', 'skills', 'echt', 'innen'), 'dir')
    const g = Object.fromEntries(erkenneFaehigkeitVorschlaege(w).map((e) => [e.name, e]))
    assert.match(g.link?.grund ?? '', /Verknüpfung/)
    assert.equal(g.link?.hash, null)
    assert.equal(g.link?.beschreibung, null)
    assert.match(g.echt?.grund ?? '', /Verknüpfung/)
    const w2 = wurzel()
    mkdirSync(join(w2, 'vorschlaege', 'faehigkeiten'), { recursive: true })
    verknuepfe(fremd, join(w2, 'vorschlaege', 'faehigkeiten', 'skills'), 'dir')
    assert.deepEqual(erkenneFaehigkeitVorschlaege(w2), [{ typ: 'skill', name: null, pfad: 'vorschlaege/faehigkeiten/skills', beschreibung: null, hash: null, ziel_existiert: null, grund: 'Verknüpfung (Symlink/Junction) — abgelehnt' }])
  })

  it('Agent als Datei-Verknüpfung ⇒ Grund, Hash null', (t) => {
    const fremd = wurzel()
    writeFileSync(join(fremd, 'x.md'), agentText('link'))
    const w = wurzel()
    mkdirSync(join(w, 'vorschlaege', 'faehigkeiten', 'agents'), { recursive: true })
    if (!verknuepfe(join(fremd, 'x.md'), join(w, 'vorschlaege', 'faehigkeiten', 'agents', 'link.md'), 'file')) return t.skip('Datei-Verknüpfung nicht erlaubt (Windows ohne Entwicklermodus)')
    const [e] = erkenneFaehigkeitVorschlaege(w)
    assert.match(e.grund ?? '', /Verknüpfung/)
    assert.equal(e.hash, null)
  })
})

describe('pruefeZielIgnoriert', () => {
  /** Neues git-Repo. @param gitignore - Inhalt oder null @returns Pfad */
  function repo(gitignore: string | null): string {
    const w = wurzel()
    execFileSync('git', ['init', '--quiet'], { cwd: w })
    if (gitignore !== null) writeFileSync(join(w, '.gitignore'), gitignore)
    skill(w, 'pruefen')
    agent(w, 'leser.md', agentText('leser'))
    return w
  }

  it('.claude/ ignoriert ⇒ true; Regel nur für agents ⇒ Skill false; ohne Regel ⇒ false', async () => {
    for (const [regel, erwartet] of [['.claude/\n', [true, true]], ['.claude/agents/\n', [false, true]], [null, [false, false]]] as const) {
      const w = repo(regel)
      const v = erkenneFaehigkeitVorschlaege(w)
      const m = await pruefeZielIgnoriert(w, v)
      assert.deepEqual(v.map((e) => m.get(e.pfad)), [...erwartet], String(regel))
    }
  })

  it('im echten Worktree (git worktree add) wie im Repo; Einträge mit Grund ohne Ziel', async () => {
    const w = repo('.claude/agents/\n')
    execFileSync('git', ['-c', 'user.email=t@example.invalid', '-c', 'user.name=T', 'commit', '--quiet', '--allow-empty', '-m', 'init'], { cwd: w })
    execFileSync('git', ['add', '.gitignore'], { cwd: w })
    execFileSync('git', ['-c', 'user.email=t@example.invalid', '-c', 'user.name=T', 'commit', '--quiet', '-m', 'regel'], { cwd: w })
    const wt = join(wurzel(), 'wt')
    execFileSync('git', ['worktree', 'add', '--quiet', wt], { cwd: w })
    skill(wt, 'pruefen')
    agent(wt, 'leser.md', agentText('leser'))
    agent(wt, 'falsch.md', agentText('anders'))
    const v = erkenneFaehigkeitVorschlaege(wt)
    const m = await pruefeZielIgnoriert(wt, v)
    assert.deepEqual(
      v.map((e) => [e.name, m.get(e.pfad)]),
      [
        ['pruefen', false],
        ['falsch', undefined],
        ['leser', true],
      ]
    )
  })

  it('git nicht ausführbar (Ordner fehlt) ⇒ null; Abbruch durch die Zeitgrenze ⇒ null', async () => {
    const w = repo('.claude/\n')
    const v = erkenneFaehigkeitVorschlaege(w)
    const m = await pruefeZielIgnoriert(join(wurzel(), 'fehlt'), v)
    assert.deepEqual([...m.values()], [null, null])
    // fuehreGitAsync: Zeitgrenze 0 heißt sofortiger Abbruch (abbruch 'zeitgrenze'), nie eine Teilausgabe.
    assert.deepEqual([...(await pruefeZielIgnoriert(w, v, 0)).values()], [null, null])
  })

  it('zielPfad und Regelzeile', () => {
    assert.equal(zielPfad({ typ: 'skill', name: 'x' }), '.claude/skills/x/SKILL.md')
    assert.equal(zielPfad({ typ: 'agent', name: 'x' }), '.claude/agents/x.md')
    assert.equal(zielPfad({ typ: 'agent', name: 'a b' }), null)
    assert.ok(!FAEHIGKEIT_VORSCHLAG_REGEL.startsWith('- [x]'))
    for (const teil of ['vorschlaege/faehigkeiten/skills/<name>/', 'vorschlaege/faehigkeiten/agents/<name>.md', 'nie unter .claude/', 'argument-hint', 'ohne Agent, Task, Skill', 'model nur inherit']) assert.ok(FAEHIGKEIT_VORSCHLAG_REGEL.includes(teil), teil)
  })
})
