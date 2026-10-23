/**
 * Datei: scripts/leitstand/routen-faehigkeit-vorschlag.test.mjs
 *
 * Zweck: Tests der Projektion der Fähigkeit-Vorschläge (F45 FB-1a: leer ohne Ordner, ziel_ignoriert je Eintrag, Cache je
 * Arbeitsordner; FB-1b: unverändert getrackte Vorschläge fallen weg, Basis nicht lesbar ⇒ Grund) und der Routen übernehmen/
 * verwerfen (FB-1b, features/F45/plan-fb1b-v2.md) mit Attrappen-Kontext auf einem echten tmp-Repo: Erfolg Skill/Agent, Freigabe
 * nach Inhalt ohne Einschalten, Hash-Drift, B3, Phase B liest die Lage frisch und ist synchron, Probe am Ziel (q4) mit Rücknahme,
 * Ablehnung von aendere mit Rücknahme, gescheiterte Rücknahme ⇒ 500, Verwerfen mit Grund, .claude als Verknüpfung, Körper (q9),
 * ignoriertes Ziel (B13), Abnahme-Bedingung; Dateisystem-Annahmen (Ordner-Rename und COPYFILE_EXCL überschreiben nie). FB-2
 * (features/F45/plan-fb2-v2.md): Felder der Abnahme (adressierbar, ungesichert mit echtem git), Cache je Wurzel (Signatur, Fristen,
 * Vergessen nach einer Aktion, Wettlauf), wirft nie, Filter claudePfadeAusStatus.
 *
 * Wird aufgerufen von: npm run test (node --test)
 *
 * Wichtig: Fixtures in os.tmpdir(), Pfade nur über join (plattformneutral). Keine Methoden-Auswertung im Text dieser Datei
 * (check-f813-csrf (4) liest alle *.mjs unter scripts/leitstand/).
 */

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { constants, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { raeumeVerzeichnis } from '../_aufraeumen.ts'
import { erkenneFaehigkeitVorschlaege } from '../../src/faehigkeiten/vorschlag.ts'
import { aendereLokaleDatei, erzeugeLokalWaechter } from './routen-faehigkeiten.mjs'
import { claudePfadeAusStatus } from '../../src/execution-controller/index.ts'
import { BASIS_UNBESTIMMT, baueVorschlagFelder, baueVorschlagProjektion, erkenneVorschlagRoute, fuehreSynchronDurch, fuehreVorschlagAktionDurch, leseClaudeUngesichert, pruefeVorschlagKoerper, vergissVorschlagStand, vorschlagSignatur, ZIEL_IGNORIERT } from './routen-faehigkeit-vorschlag.mjs'

// qa FB-1a 7: ohne globale/System-git-Konfiguration des Entwicklers (core.excludesFile könnte .claude/ ignorieren).
const gitKonfig = mkdtempSync(join(tmpdir(), 'fb1a-gitcfg-'))
process.env.GIT_CONFIG_GLOBAL = join(gitKonfig, 'leer')
process.env.GIT_CONFIG_NOSYSTEM = '1'
// Der Git-Starter (fuehreGitAsync) entfernt jede GIT_*-Variable — für pruefeZielIgnoriert zeigen HOME und XDG_CONFIG_HOME
// deshalb zusätzlich auf einen leeren Ordner (globale Konfiguration); die System-Konfiguration der git-Installation gilt dort mit.
process.env.HOME = gitKonfig
process.env.XDG_CONFIG_HOME = gitKonfig

const ordner = [gitKonfig]
after(() => {
  for (const o of ordner) raeumeVerzeichnis(o)
})

/** git im Repo. @param w - Wurzel @param argumente - Argumente @returns stdout */
const git = (w, argumente) => execFileSync('git', ['-c', 'user.email=t@example.invalid', '-c', 'user.name=T', '-c', 'core.autocrlf=false', ...argumente], { cwd: w, encoding: 'utf8' })

/** Neues tmp-Verzeichnis. @param name - Präfix @returns Pfad */
function tmp(name) {
  const p = mkdtempSync(join(tmpdir(), `fb1b-${name}-`))
  ordner.push(p)
  return p
}

/** Schreibt Dateien (relativer Pfad mit '/' → Inhalt). @param w - Wurzel @param dateien - Dateien */
function lege(w, dateien) {
  for (const [rel, inhalt] of Object.entries(dateien)) {
    const voll = join(w, ...rel.split('/'))
    mkdirSync(join(voll, '..'), { recursive: true })
    writeFileSync(voll, inhalt)
  }
}

const VS = 'vorschlaege/faehigkeiten'
const skillText = (name, zusatz = '') => `---\nname: ${name}\ndescription: Prüft.\n${zusatz}---\n\nInhalt\n`
const agentText = (name, beschreibung = 'Liest.') => `---\nname: ${name}\ndescription: ${beschreibung}\ntools: Read\n---\n`

/** Repo mit Basis-Commit (README) und optional .gitignore. @param gitignore - Inhalt oder null @returns { w, basis } */
function repoMitBasis(gitignore = null) {
  const w = tmp('repo')
  git(w, ['init', '--quiet'])
  lege(w, { 'README.md': 'x\n', ...(gitignore === null ? {} : { '.gitignore': gitignore }) })
  git(w, ['add', '.'])
  git(w, ['commit', '--quiet', '-m', 'basis'])
  return { w, basis: git(w, ['rev-parse', 'HEAD']).trim() }
}

/** Repo mit einem Agent-Vorschlag (FB-1a-Tests). @param gitignore - Inhalt @returns { w, basis } */
function repo(gitignore) {
  const r = repoMitBasis(gitignore)
  lege(r.w, { [`${VS}/agents/leser.md`]: agentText('leser') })
  return r
}

test('ohne Vorschläge ⇒ [] und kein Cache-Eintrag', async () => {
  const w = tmp('leer')
  const cache = new Map()
  assert.deepEqual(await baueVorschlagProjektion(w, { cache }), [])
  assert.equal(cache.size, 0)
})

test('ziel_ignoriert je Eintrag; Cache geteilt in der Frist, neu nach Ablauf und bei neuen Zielen', async () => {
  const { w, basis } = repo('.claude/\n')
  const cache = new Map()
  let zeit = 1000
  const jetzt = () => zeit
  const erste = await baueVorschlagProjektion(w, { basisCommit: basis, cache, jetzt, cacheMs: 100 })
  assert.deepEqual(
    erste.map((e) => [e.name, e.ziel_ignoriert, e.grund]),
    [['leser', true, null]]
  )
  const eintrag = [...cache.values()][0]
  writeFileSync(join(w, '.gitignore'), '')
  await baueVorschlagProjektion(w, { basisCommit: basis, cache, jetzt, cacheMs: 100 })
  assert.equal([...cache.values()][0], eintrag, 'in der Frist geteilt')
  zeit += 100
  assert.equal((await baueVorschlagProjektion(w, { basisCommit: basis, cache, jetzt, cacheMs: 100 }))[0].ziel_ignoriert, false, 'nach Ablauf neu')
  writeFileSync(join(w, ...VS.split('/'), 'agents', 'zweiter.md'), agentText('zweiter'))
  assert.equal((await baueVorschlagProjektion(w, { basisCommit: basis, cache, jetzt, cacheMs: 100 })).length, 2)
  assert.equal(cache.size, 1, 'ein Eintrag je Arbeitsordner')
})

test('FB-1b q1: unverändert getrackter Vorschlag fällt weg, geänderter bleibt; Basis nicht lesbar ⇒ Grund', async () => {
  const { w } = repoMitBasis()
  lege(w, { [`${VS}/agents/alt.md`]: agentText('alt'), [`${VS}/skills/s/SKILL.md`]: skillText('s') })
  git(w, ['add', '.'])
  git(w, ['commit', '--quiet', '-m', 'vorschlaege im Basisstand'])
  const basis = git(w, ['rev-parse', 'HEAD']).trim()
  lege(w, { [`${VS}/agents/neu.md`]: agentText('neu') })
  const namen = async () => (await baueVorschlagProjektion(w, { basisCommit: basis, cache: new Map() })).map((e) => e.name)
  assert.deepEqual(await namen(), ['neu'], 'alt und s liegen unverändert im Basis-Commit')
  lege(w, { [`${VS}/skills/s/teil.txt`]: 'neu\n' })
  writeFileSync(join(w, ...VS.split('/'), 'agents', 'alt.md'), agentText('alt', 'Anders.'))
  assert.deepEqual(await namen(), ['s', 'alt', 'neu'], 'neue Datei im Skill bzw. geänderter Inhalt ⇒ sichtbar')
  const ohneBasis = await baueVorschlagProjektion(w, { basisCommit: null, cache: new Map() })
  assert.ok(ohneBasis.every((e) => e.grund === BASIS_UNBESTIMMT), JSON.stringify(ohneBasis))
})

test('FB-1b Erkenner und Körper (q9, unbekannte Felder)', () => {
  assert.deepEqual(erkenneVorschlagRoute('/api/workflows/wf-1/faehigkeit-vorschlag/uebernehmen'), { rohId: 'wf-1', aktion: 'uebernehmen' })
  assert.deepEqual(erkenneVorschlagRoute('/api/workflows/wf-1/faehigkeit-vorschlag/verwerfen'), { rohId: 'wf-1', aktion: 'verwerfen' })
  assert.equal(erkenneVorschlagRoute('/api/workflows/wf-1/faehigkeit-vorschlag/loeschen'), null)
  assert.equal(erkenneVorschlagRoute('/api/workflows/a/b/faehigkeit-vorschlag/verwerfen'), null)
  const h = 'a'.repeat(64)
  assert.equal(pruefeVorschlagKoerper({ typ: 'skill', name: 'x', hash: h }).ok, true)
  for (const name of ['con', 'NUL.md', 'com1', 'lpt0', 'x.', '.x', 'a b']) assert.equal(pruefeVorschlagKoerper({ typ: 'skill', name, hash: h }).status, 400, name)
  assert.equal(pruefeVorschlagKoerper({ typ: 'skill', name: 'x', hash: h, projekt_id: 'p' }).status, 400)
  assert.equal(pruefeVorschlagKoerper({ typ: 'command', name: 'x', hash: h }).status, 400)
  assert.equal(pruefeVorschlagKoerper({ typ: 'skill', name: 'x', hash: 'A'.repeat(64) }).status, 400)
  assert.equal(pruefeVorschlagKoerper([]).status, 400)
})

const REFERENZ = { ok: true, referenz: { cli_version: '', agents: [], plugins: [], plugin_skills: [] } }

/**
 * Umgebung für die Routen: Repo mit Basis-Commit, lokale Datei, Wächter, Lage-Attrappe.
 * @param lageFelder - Überschreibungen der Lage
 * @returns { w, basis, lokal, kontext, lagen } — lagen: Liste, aus der lage() der Reihe nach liest (leer ⇒ Standard)
 */
function umgebung(lageFelder = {}) {
  const { w, basis } = repoMitBasis()
  const lokal = join(tmp('lokal'), 'faehigkeiten.lokal.json')
  const waechter = erzeugeLokalWaechter(lokal)
  const standard = () => ({ wurzel: w, basisCommit: basis, laufGesperrt: null, abnahme: { faellig: true, offen: true, entscheidungStatus: 'nicht_vorhanden', ergebnis: null }, werkzeugNamen: ['Read', 'Grep'], ...lageFelder })
  const lagen = []
  const kontext = {
    lage: (id) => (id === 'wf' ? (lagen.length > 0 ? lagen.shift() : standard()) : null),
    projektId: 'p',
    lokalPfad: lokal,
    waechter,
    referenz: REFERENZ,
    aendere: (aenderung) => {
      const r = aendereLokaleDatei(lokal, 'p', aenderung, undefined, waechter)
      if (r.ok) waechter.nachRoute(r.hash)
      return r
    },
  }
  return { w, basis, lokal, kontext, lagen, standard }
}

/** Ruft die Route auf. @param kontext - Kontext @param aktion - Aktion @param daten - Körper @returns Antwort */
const rufe = (kontext, aktion, daten) => fuehreVorschlagAktionDurch({ rohId: 'wf', aktion }, { ok: true, daten }, kontext)

/** Eintrag der Erkennung. @param w - Wurzel @param name - Name @returns Eintrag */
const vorschlag = (w, name) => erkenneFaehigkeitVorschlaege(w).find((v) => v.name === name)

/** Lokale Datei als Objekt (oder null). @param pfad - Pfad @returns Objekt */
const lies = (pfad) => (existsSync(pfad) ? JSON.parse(readFileSync(pfad, 'utf8')) : null)

test('FB-1b übernehmen Skill und Agent: Ziel da, Vorschlag weg, Freigabe nach Inhalt, nie eingeschaltet', async () => {
  const u = umgebung()
  lege(u.w, { [`${VS}/skills/pruefen/SKILL.md`]: skillText('pruefen'), [`${VS}/skills/pruefen/teil/n.txt`]: 'n\n', [`${VS}/agents/leser.md`]: agentText('leser') })
  const s = vorschlag(u.w, 'pruefen')
  const a = vorschlag(u.w, 'leser')
  const r1 = await rufe(u.kontext, 'uebernehmen', { typ: 'skill', name: 'pruefen', hash: s.hash })
  assert.equal(r1.status, 200, JSON.stringify(r1))
  assert.equal(r1.koerper.eingeschaltet, false)
  assert.match(r1.koerper.hinweis, /sichern/)
  assert.ok(existsSync(join(u.w, '.claude', 'skills', 'pruefen', 'teil', 'n.txt')) && !existsSync(join(u.w, ...VS.split('/'), 'skills')))
  const r2 = await rufe(u.kontext, 'uebernehmen', { typ: 'agent', name: 'leser', hash: a.hash })
  assert.equal(r2.status, 200, JSON.stringify(r2))
  assert.ok(existsSync(join(u.w, '.claude', 'agents', 'leser.md')) && !existsSync(join(u.w, 'vorschlaege')), 'leere Behälter entfernt')
  const p = lies(u.lokal).projekte.p
  assert.deepEqual(p.inhalt_freigaben, { 'agent:leser': a.hash, 'skill:pruefen': s.hash })
  assert.equal(p.an, undefined, 'nie eingeschaltet')
})

test('FB-1b Hash-Drift ⇒ 409; B3 (eingeschaltet, andere Freigabe) ⇒ 409, nichts bewegt, Datei bitgleich', async () => {
  const u = umgebung()
  lege(u.w, { [`${VS}/agents/leser.md`]: agentText('leser') })
  const a = vorschlag(u.w, 'leser')
  const drift = await rufe(u.kontext, 'uebernehmen', { typ: 'agent', name: 'leser', hash: 'b'.repeat(64) })
  assert.equal(drift.status, 409)
  assert.match(drift.koerper.grund, /geändert/)
  for (const projekt of [{ an: ['agent:Leser'] }, { inhalt_freigaben: { 'agent:leser': 'c'.repeat(64) } }]) {
    writeFileSync(u.lokal, `${JSON.stringify({ faehigkeiten_lokal_schema: 'v0', projekte: { p: projekt } }, null, 2)}\n`)
    u.kontext.waechter.nachRoute(createHash('sha256').update(readFileSync(u.lokal)).digest('hex'))
    const vorher = readFileSync(u.lokal)
    const r = await rufe(u.kontext, 'uebernehmen', { typ: 'agent', name: 'leser', hash: a.hash })
    assert.equal(r.status, 409, JSON.stringify(r))
    assert.match(r.koerper.grund, /eingeschaltet|überschreiben/)
    assert.deepEqual(readFileSync(u.lokal), vorher)
    assert.ok(existsSync(join(u.w, ...VS.split('/'), 'agents', 'leser.md')) && !existsSync(join(u.w, '.claude', 'agents', 'leser.md')))
  }
})

test('FB-1b Phase B liest die Lage frisch (Lauf aktiv / Aufräumen) und ist synchron', async () => {
  const u = umgebung()
  lege(u.w, { [`${VS}/agents/leser.md`]: agentText('leser') })
  const a = vorschlag(u.w, 'leser')
  for (const zweite of [{ ...u.standard(), laufGesperrt: 'ein Lauf ist aktiv' }, { ...u.standard(), wurzel: null }]) {
    u.lagen.push(u.standard(), zweite)
    const r = await rufe(u.kontext, 'uebernehmen', { typ: 'agent', name: 'leser', hash: a.hash })
    assert.equal(r.status, 409, JSON.stringify(r))
    assert.ok(!existsSync(join(u.w, '.claude')), 'nichts angelegt')
  }
  const phaseB = fuehreSynchronDurch('verwerfen', 'wf', { typ: 'agent', name: 'leser', hash: 'd'.repeat(64) }, { wurzel: u.w, basisCommit: u.basis, basis: { ok: true, baum: new Map() }, ignoriert: false }, u.kontext)
  assert.ok(!(phaseB instanceof Promise), 'Phase B ist synchron')
  assert.equal(phaseB.status, 409)
})

test('FB-1b Probe am Ziel (q4): Name kollidiert mit einem Agent in einem Unterordner ⇒ 409, Rücknahme', async () => {
  const u = umgebung()
  lege(u.w, { [`${VS}/agents/leser.md`]: agentText('leser'), '.claude/agents/sub/anders.md': agentText('leser') })
  const a = vorschlag(u.w, 'leser')
  const r = await rufe(u.kontext, 'uebernehmen', { typ: 'agent', name: 'leser', hash: a.hash })
  assert.equal(r.status, 409, JSON.stringify(r))
  assert.match(r.koerper.grund, /würde am Start gesperrt: .*mehrdeutig/)
  assert.ok(existsSync(join(u.w, ...VS.split('/'), 'agents', 'leser.md')) && !existsSync(join(u.w, '.claude', 'agents', 'leser.md')))
  assert.equal(lies(u.lokal), null, 'keine Freigabe geschrieben')
})

test('FB-1b aendere lehnt ab ⇒ 409 mit Rücknahme; Rücknahme scheitert ⇒ 500 mit beiden Orten', async () => {
  const u = umgebung()
  lege(u.w, { [`${VS}/skills/pruefen/SKILL.md`]: skillText('pruefen') })
  const s = vorschlag(u.w, 'pruefen')
  const quelle = join(u.w, ...VS.split('/'), 'skills', 'pruefen')
  u.kontext.aendere = () => ({ ok: false, status: 500, grund: 'nicht schreibbar' })
  const r = await rufe(u.kontext, 'uebernehmen', { typ: 'skill', name: 'pruefen', hash: s.hash })
  assert.equal(r.status, 409, JSON.stringify(r))
  assert.match(r.koerper.grund, /nicht schreibbar — nichts übernommen/)
  assert.ok(existsSync(join(quelle, 'SKILL.md')) && !existsSync(join(u.w, '.claude', 'skills', 'pruefen')))
  // Die Attrappe legt an der Quelle einen nicht leeren Ordner an — der Ordner-Rename zurück scheitert.
  u.kontext.aendere = () => {
    lege(u.w, { [`${VS}/skills/pruefen/fremd.txt`]: 'x\n' })
    return { ok: false, status: 409, grund: 'abgelehnt' }
  }
  const r2 = await rufe(u.kontext, 'uebernehmen', { typ: 'skill', name: 'pruefen', hash: s.hash })
  assert.equal(r2.status, 500, JSON.stringify(r2))
  assert.equal(r2.koerper.quelle, `${VS}/skills/pruefen`)
  assert.equal(r2.koerper.ziel, '.claude/skills/pruefen')
})

test('FB-1b verwerfen (auch mit Grund) ⇒ Vorschlag weg, lokale Datei unberührt; Abnahme-Bedingung gilt nur fürs Übernehmen', async () => {
  const u = umgebung({ abnahme: { faellig: false, offen: false, entscheidungStatus: 'nicht_vorhanden', ergebnis: null } })
  lege(u.w, { [`${VS}/skills/kaputt/SKILL.md`]: skillText('kaputt', 'allowed-tools: Bash\n'), [`${VS}/agents/leser.md`]: agentText('leser') })
  const kaputt = vorschlag(u.w, 'kaputt')
  assert.notEqual(kaputt.grund, null)
  const nein = await rufe(u.kontext, 'uebernehmen', { typ: 'agent', name: 'leser', hash: vorschlag(u.w, 'leser').hash })
  assert.equal(nein.status, 409)
  assert.match(nein.koerper.grund, /offener Abnahme oder nach ANGENOMMEN/)
  const r = await rufe(u.kontext, 'verwerfen', { typ: 'skill', name: 'kaputt', hash: kaputt.hash })
  assert.equal(r.status, 200, JSON.stringify(r))
  assert.ok(!existsSync(join(u.w, ...VS.split('/'), 'skills')) && existsSync(join(u.w, ...VS.split('/'), 'agents', 'leser.md')))
  assert.equal(lies(u.lokal), null)
})

test('FB-1b .claude als Verknüpfung auf einen fremden Ordner ⇒ 409, fremder Ordner unverändert', async (t) => {
  const u = umgebung()
  const fremd = tmp('fremd')
  try {
    symlinkSync(fremd, join(u.w, '.claude'), 'junction')
  } catch {
    t.skip('keine Verknüpfung anlegbar')
    return
  }
  lege(u.w, { [`${VS}/agents/leser.md`]: agentText('leser') })
  const r = await rufe(u.kontext, 'uebernehmen', { typ: 'agent', name: 'leser', hash: vorschlag(u.w, 'leser').hash })
  assert.equal(r.status, 409, JSON.stringify(r))
  assert.ok(!existsSync(join(fremd, 'agents')), 'im fremden Ordner nichts angelegt')
})

test('FB-1b Ziel gitignoriert ⇒ 409 (B13)', async () => {
  const u = umgebung()
  lege(u.w, { '.gitignore': '.claude/\n', [`${VS}/agents/leser.md`]: agentText('leser') })
  const r = await rufe(u.kontext, 'uebernehmen', { typ: 'agent', name: 'leser', hash: vorschlag(u.w, 'leser').hash })
  assert.equal(r.status, 409)
  assert.equal(r.koerper.grund, ZIEL_IGNORIERT)
})

test('FB-1b Phase B streng (qa TC-a/b/c): Basis gewechselt, ignoriert unbestimmt, Lage null bzw. Sperre unförmig ⇒ kein Bewegen', async () => {
  const u = umgebung()
  lege(u.w, { [`${VS}/agents/leser.md`]: agentText('leser') })
  const k = { typ: 'agent', name: 'leser', hash: vorschlag(u.w, 'leser').hash }
  const vorab = { wurzel: u.w, basisCommit: u.basis, basis: { ok: true, baum: new Map() }, ignoriert: false }
  u.lagen.push({ ...u.standard(), basisCommit: 'a'.repeat(40) })
  assert.match(fuehreSynchronDurch('uebernehmen', 'wf', k, vorab, u.kontext).koerper.grund, /während der Prüfung geändert/)
  for (const ignoriert of [undefined, null]) assert.match(fuehreSynchronDurch('uebernehmen', 'wf', k, { ...vorab, ignoriert }, u.kontext).koerper.grund, /nicht bestimmbar/)
  assert.equal(fuehreSynchronDurch('uebernehmen', 'andere-id', k, vorab, u.kontext).status, 404)
  u.lagen.push({ ...u.standard(), laufGesperrt: undefined })
  assert.equal(fuehreSynchronDurch('uebernehmen', 'wf', k, vorab, u.kontext).status, 409)
  assert.ok(!existsSync(join(u.w, '.claude')))
})

test('FB-1b Vorbedingungen der Übernahme (qa TC-f): Werkzeugsatz, Referenz, lokale Datei, Wächter ⇒ 409, nichts bewegt', async () => {
  const u = umgebung()
  lege(u.w, { [`${VS}/agents/leser.md`]: agentText('leser') })
  const k = { typ: 'agent', name: 'leser', hash: vorschlag(u.w, 'leser').hash }
  u.lagen.push({ ...u.standard(), werkzeugNamen: null }, { ...u.standard(), werkzeugNamen: null })
  assert.match((await rufe(u.kontext, 'uebernehmen', k)).koerper.grund, /Werkzeugsatz/)
  assert.match((await rufe({ ...u.kontext, referenz: { ok: false, grund: 'Referenz kaputt' } }, 'uebernehmen', k)).koerper.grund, /Referenz kaputt/)
  assert.match((await rufe({ ...u.kontext, lokalPfad: null }, 'uebernehmen', k)).koerper.grund, /keine faehigkeiten\.lokal\.json/)
  writeFileSync(u.lokal, '{"faehigkeiten_lokal_schema":"v0","projekte":{}}\n')
  assert.match((await rufe(u.kontext, 'uebernehmen', k)).koerper.grund, /außerhalb des Leitstands geändert/)
  assert.ok(!existsSync(join(u.w, '.claude')) && existsSync(join(u.w, ...VS.split('/'), 'agents', 'leser.md')))
})

test('FB-1b Wurf nach dem Bewegen ⇒ Rücknahme und 409 (code-reviewer 1); Hinweis „Review veraltet“ nur bei offener Abnahme (qa TC-g)', async () => {
  const u = umgebung()
  lege(u.w, { [`${VS}/skills/pruefen/SKILL.md`]: skillText('pruefen') })
  const k = { typ: 'skill', name: 'pruefen', hash: vorschlag(u.w, 'pruefen').hash }
  const aendere = u.kontext.aendere
  u.kontext.aendere = () => {
    throw new Error('Rückruf kaputt')
  }
  const r = await rufe(u.kontext, 'uebernehmen', k)
  assert.equal(r.status, 409, JSON.stringify(r))
  assert.match(r.koerper.grund, /unerwartet abgebrochen \(Rückruf kaputt\)/)
  assert.ok(existsSync(join(u.w, ...VS.split('/'), 'skills', 'pruefen', 'SKILL.md')) && !existsSync(join(u.w, '.claude')))
  u.kontext.aendere = aendere
  u.lagen.push(...Array(2).fill({ ...u.standard(), abnahme: { faellig: true, offen: false, entscheidungStatus: 'ok', ergebnis: 'ANGENOMMEN' } }))
  const angenommen = await rufe(u.kontext, 'uebernehmen', k)
  assert.equal(angenommen.status, 200, JSON.stringify(angenommen))
  assert.doesNotMatch(angenommen.koerper.hinweis, /Review/)
  lege(u.w, { [`${VS}/agents/leser.md`]: agentText('leser') })
  const offen = await rufe(u.kontext, 'uebernehmen', { typ: 'agent', name: 'leser', hash: vorschlag(u.w, 'leser').hash })
  assert.match(offen.koerper.hinweis, /Review gilt danach als veraltet/)
})

test('FB-1b Verwerfen bei nicht lesbarem Basis-Commit erlaubt, Übernehmen nicht (qa 3/TC-h)', async () => {
  const u = umgebung({ basisCommit: null })
  lege(u.w, { [`${VS}/agents/leser.md`]: agentText('leser'), [`${VS}/agents/zweiter.md`]: agentText('zweiter') })
  const u1 = await rufe(u.kontext, 'uebernehmen', { typ: 'agent', name: 'leser', hash: vorschlag(u.w, 'leser').hash })
  assert.equal(u1.status, 409)
  assert.equal(u1.koerper.grund, BASIS_UNBESTIMMT)
  const v = await rufe(u.kontext, 'verwerfen', { typ: 'agent', name: 'zweiter', hash: vorschlag(u.w, 'zweiter').hash })
  assert.equal(v.status, 200, JSON.stringify(v))
  assert.ok(!existsSync(join(u.w, ...VS.split('/'), 'agents', 'zweiter.md')))
})

test('Dateisystem-Annahmen (B9): Ordner-Rename auf einen nicht leeren Ordner und COPYFILE_EXCL überschreiben nie', () => {
  const w = tmp('fs')
  lege(w, { 'a/x.txt': 'a\n', 'b/y.txt': 'b\n', 'c.md': 'c\n', 'd.md': 'd\n' })
  assert.throws(() => renameSync(join(w, 'a'), join(w, 'b')))
  assert.equal(readFileSync(join(w, 'b', 'y.txt'), 'utf8'), 'b\n')
  assert.ok(existsSync(join(w, 'a', 'x.txt')))
  assert.throws(() => copyFileSync(join(w, 'c.md'), join(w, 'd.md'), constants.COPYFILE_EXCL))
  assert.equal(readFileSync(join(w, 'd.md'), 'utf8'), 'd\n')
})

// ─── FB-2: Felder der Abnahme, Cache je Wurzel ─────────────────────────────────────────────────────────────────────────

const H = 'a'.repeat(64)

test('FB-2 Felder mit echtem git: sauber ⇒ {}; ungetrackte .claude-Dateien (auch verschachtelt) ⇒ ungesichert; gesichert ⇒ Feld fehlt', async () => {
  const { w, basis } = repoMitBasis()
  const frisch = () => baueVorschlagFelder(w, { basisCommit: basis, cache: new Map() })
  assert.deepEqual(await frisch(), {})
  lege(w, { '.claude/skills/neu/SKILL.md': skillText('neu'), 'pakete/a/.Claude/agents/y.md': agentText('y') })
  const mit = await frisch()
  assert.deepEqual(mit, { faehigkeitUngesichert: { status: 'ok', pfade: ['.claude/skills/neu/SKILL.md', 'pakete/a/.Claude/agents/y.md'], anzahl: 2 } })
  git(w, ['add', '--', '.claude', 'pakete'])
  git(w, ['commit', '--quiet', '-m', 'gesichert'])
  assert.deepEqual(await frisch(), {}, 'gesichert ⇒ bitgleich ohne Feld')
  lege(w, { [`${VS}/agents/leser.md`]: agentText('leser') })
  const v = (await frisch()).faehigkeitVorschlaege
  assert.deepEqual(
    v.map((e) => [e.name, e.adressierbar]),
    [['leser', true]]
  )
})

test('FB-2 adressierbar mit den Prüfungen der Route (Gerätename, fehlender Typ/Hash)', async () => {
  const projektion = async () => [
    { typ: 'agent', name: 'con', hash: H, grund: 'x' },
    { typ: null, name: null, hash: null, grund: 'y', pfad: `${VS}/agents/kaputt` },
    { typ: 'skill', name: 'gut', hash: H, grund: null },
    { typ: 'skill', name: 'kurz', hash: 'abc', grund: null },
  ]
  const f = await baueVorschlagFelder(tmp('adr'), { cache: new Map(), projektion, ungesichert: async () => null })
  assert.deepEqual(
    f.faehigkeitVorschlaege.map((e) => e.adressierbar),
    [false, false, true, false]
  )
})

test('FB-2 Cache: gleiche Signatur geteilt, Fristen je Teil, andere Signatur ersetzt alles, vergissVorschlagStand liest neu', async () => {
  const w = tmp('cache')
  lege(w, { [`${VS}/agents/a.md`]: 'x' })
  const zaehler = { p: 0, u: 0 }
  let zeit = 0
  const optionen = (cache) => ({
    cache,
    jetzt: () => zeit,
    vorschlagCacheMs: 300,
    ungesichertCacheMs: 100,
    projektion: async () => {
      zaehler.p++
      return []
    },
    ungesichert: async () => {
      zaehler.u++
      return null
    },
  })
  const cache = new Map()
  await Promise.all([baueVorschlagFelder(w, optionen(cache)), baueVorschlagFelder(w, optionen(cache))])
  assert.deepEqual(zaehler, { p: 1, u: 1 }, 'gleichzeitige Aufrufe geteilt')
  zeit = 150
  await baueVorschlagFelder(w, optionen(cache))
  assert.deepEqual(zaehler, { p: 1, u: 2 }, 'ungesichert nach seiner Frist neu, Vorschläge nicht')
  writeFileSync(join(w, ...VS.split('/'), 'agents', 'a.md'), 'xy')
  await baueVorschlagFelder(w, optionen(cache))
  assert.deepEqual(zaehler, { p: 2, u: 3 }, 'andere Signatur (Größe) ersetzt den ganzen Eintrag')
  mkdirSync(join(w, '.claude', 'agents'), { recursive: true })
  writeFileSync(join(w, '.claude', 'agents', 'a.md'), 'x')
  await baueVorschlagFelder(w, optionen(cache))
  assert.deepEqual(zaehler, { p: 3, u: 4 }, 'neuer Name unter .claude/agents ändert die Signatur (ziel_existiert)')
  vergissVorschlagStand(w, cache)
  await baueVorschlagFelder(w, optionen(cache))
  assert.deepEqual(zaehler, { p: 4, u: 5 })
  assert.equal(cache.size, 1)
})

test('FB-2 Wettlauf: ein vor dem Vergessen gestarteter Aufruf schreibt nichts zurück', async () => {
  const w = tmp('wett')
  const cache = new Map()
  let loese
  const haengt = new Promise((ok) => {
    loese = ok
  })
  let aufrufe = 0
  const ungesichert = () => (++aufrufe === 1 ? haengt : Promise.resolve({ status: 'ok', pfade: ['.claude/x'], anzahl: 1 }))
  const alt = baueVorschlagFelder(w, { cache, projektion: async () => [], ungesichert })
  vergissVorschlagStand(w, cache)
  loese(null)
  assert.deepEqual(await alt, {})
  assert.deepEqual(await baueVorschlagFelder(w, { cache, projektion: async () => [], ungesichert }), { faehigkeitUngesichert: { status: 'ok', pfade: ['.claude/x'], anzahl: 1 } })
  assert.equal(aufrufe, 2)
})

test('FB-2 wirft nie: Projektion wirft ⇒ ohne Vorschläge; ungesichert wirft ⇒ nicht bestimmbar', async () => {
  const w = tmp('wurf')
  const fehlerLog = console.error
  console.error = () => {}
  try {
    const wirft = (text) => () => {
      throw new Error(text)
    }
    assert.deepEqual(await baueVorschlagFelder(w, { cache: new Map(), projektion: wirft('kaputt'), ungesichert: async () => null }), {})
    assert.deepEqual(await baueVorschlagFelder(w, { cache: new Map(), projektion: async () => [], ungesichert: wirft('git weg') }), { faehigkeitUngesichert: { status: 'nicht_bestimmbar', grund: 'git weg' } })
  } finally {
    console.error = fehlerLog
  }
})

test('FB-2 leseClaudeUngesichert: Abbruch/Exit ≠ 0 ⇒ nicht bestimmbar; höchstens 20 Pfade mit Anzahl; Argumente wie der Laufdiff', async () => {
  const fehlerLog = console.error
  console.error = () => {}
  try {
    assert.equal((await leseClaudeUngesichert('w', async () => ({ code: null, stdout: '', stderr: '', abbruch: 'zeitgrenze' }))).status, 'nicht_bestimmbar')
    assert.equal((await leseClaudeUngesichert('w', async () => ({ code: 128, stdout: '', stderr: 'kein repo' }))).status, 'nicht_bestimmbar')
  } finally {
    console.error = fehlerLog
  }
  let argumente
  const roh = Array.from({ length: 25 }, (_, i) => `?? .claude/skills/s${String(i).padStart(2, '0')}/SKILL.md`).join('\0')
  const r = await leseClaudeUngesichert('w', async (a) => {
    argumente = a
    return { code: 0, stdout: `${roh}\0 M src/x.ts\0`, stderr: '' }
  })
  assert.equal(r.anzahl, 25)
  assert.equal(r.pfade.length, 20)
  assert.deepEqual(argumente, ['--no-optional-locks', '-c', 'core.fsmonitor=false', 'status', '--porcelain=v1', '-z', '--untracked-files=all'])
})

test('FB-2 claudePfadeAusStatus: Umbenennung mit altem Pfad, Schreibweise egal, andere Pfade fallen weg', () => {
  assert.deepEqual(claudePfadeAusStatus('R  .claude/agents/neu.md\0.claude/agents/alt.md\0?? src/a.ts\0 M .CLAUDE/x\0'), ['.claude/agents/neu.md', '.claude/agents/alt.md', '.CLAUDE/x'])
  assert.deepEqual(claudePfadeAusStatus(''), [])
})

test('FB-2 vorschlagSignatur: neue Datei und .gitignore ändern sie; .claude/skills als Datei wirft nicht; zu viele Einträge ⇒ „?“', () => {
  const w = tmp('sig')
  const leer = vorschlagSignatur(w)
  lege(w, { [`${VS}/skills/s/SKILL.md`]: 'x' })
  const mitSkill = vorschlagSignatur(w)
  assert.notEqual(mitSkill, leer)
  lege(w, { '.gitignore': '.claude/\n' })
  assert.notEqual(vorschlagSignatur(w), mitSkill, '.gitignore gehört dazu (ziel_ignoriert)')
  lege(w, { '.claude/skills': 'keine Ordner' })
  assert.equal(typeof vorschlagSignatur(w), 'string', 'kein Wurf, kein Log je Poll (code-reviewer 4)')
  lege(w, Object.fromEntries(Array.from({ length: 4001 }, (_, i) => [`${VS}/skills/s/d${i}.txt`, ''])))
  assert.equal(vorschlagSignatur(w), '?')
})

test('FB-2 Signatur unbestimmt („?“): ungesichert bleibt in seiner Frist geteilt, Vorschläge mit der kurzen Frist (code-reviewer 4)', async () => {
  const w = tmp('viel')
  lege(w, Object.fromEntries(Array.from({ length: 4001 }, (_, i) => [`${VS}/skills/s/d${i}.txt`, ''])))
  const zaehler = { p: 0, u: 0 }
  let zeit = 0
  const optionen = {
    cache: new Map(),
    jetzt: () => zeit,
    projektion: async () => {
      zaehler.p++
      return []
    },
    ungesichert: async () => {
      zaehler.u++
      return null
    },
  }
  await baueVorschlagFelder(w, optionen)
  await baueVorschlagFelder(w, optionen)
  assert.deepEqual(zaehler, { p: 1, u: 1 })
  zeit = 10000
  await baueVorschlagFelder(w, optionen)
  assert.deepEqual(zaehler, { p: 2, u: 2 }, 'Vorschläge nach 10 s statt 30 s neu')
})

test('FB-2 Zeitgrenze von git status ⇒ längere Frist für ungesichert (code-reviewer 5); ziel und Vorschläge bleiben bei einem Wurf (cr 6, 9)', async () => {
  const w = tmp('frist')
  let zeit = 0
  let aufrufe = 0
  const cache = new Map()
  const optionen = {
    cache,
    jetzt: () => zeit,
    projektion: async () => [{ typ: 'agent', name: 'leser', pfad: `${VS}/agents/leser.md`, hash: H, grund: null }],
    ungesichert: async () => {
      aufrufe++
      return { status: 'nicht_bestimmbar', grund: 'zeitgrenze' }
    },
  }
  const erste = await baueVorschlagFelder(w, optionen)
  assert.equal(erste.faehigkeitVorschlaege[0].ziel, '.claude/agents/leser.md')
  zeit = 30000
  await baueVorschlagFelder(w, optionen)
  assert.equal(aufrufe, 1, 'nach 30 s noch in der langen Frist')
  zeit = 60000
  await baueVorschlagFelder(w, optionen)
  assert.equal(aufrufe, 2)
  const fehlerLog = console.error
  console.error = () => {}
  try {
    const wurf = await baueVorschlagFelder(w, {
      ...optionen,
      cache: new Map(),
      ungesichert: () => {
        throw new Error('weg')
      },
    })
    assert.equal(wurf.faehigkeitVorschlaege.length, 1, 'die Vorschläge bleiben')
    assert.deepEqual(wurf.faehigkeitUngesichert, { status: 'nicht_bestimmbar', grund: 'weg' })
  } finally {
    console.error = fehlerLog
  }
})

test('FB-2 jede Aktion mit bekannter Wurzel verwirft den Stand (auch bei 409)', async () => {
  const u = umgebung({ laufGesperrt: 'Ein Lauf ist aktiv' })
  let aufrufe = 0
  const optionen = {
    projektion: async () => {
      aufrufe++
      return []
    },
    ungesichert: async () => null,
  }
  await baueVorschlagFelder(u.w, optionen)
  await baueVorschlagFelder(u.w, optionen)
  assert.equal(aufrufe, 1)
  const r = await rufe(u.kontext, 'verwerfen', { typ: 'agent', name: 'leser', hash: H })
  assert.equal(r.status, 409)
  await baueVorschlagFelder(u.w, optionen)
  assert.equal(aufrufe, 2, 'nach der Aktion neu gelesen')
  vergissVorschlagStand(u.w)
})
