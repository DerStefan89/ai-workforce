#!/usr/bin/env node
/**
 * Datei: scripts/check-f45-fb1-faehigkeit-vorschlag.mjs
 *
 * Zweck: Gate für F45 FB-1a „Fähigkeit bauen – Daten“ (features/F45/plan-fb1-v2.md; F-1069, F-1096). Attrappen entstehen zur
 * Laufzeit (tmp-Repo auf `main`, Arbeitsordner über den echten Startweg mit Attrappen-Worker; nichts eingecheckt, F-1134).
 * (e1) Skill gültig: typ/name/beschreibung, Hash = Hash des Starts (ermittleProjektFaehigkeiten) nach dem Kopieren nach .claude/;
 * (e2) Agent ebenso; (e3) Verknüpfung (Junction/Symlink) als Skill-Ordner ⇒ Grund, nichts durch den Link gelesen (Hash und
 * Beschreibung null); (e4) Name/Frontmatter ungültig (name ≠ Ordner, Feld außerhalb der Positivliste, eingebauter Name) ⇒ Grund;
 * (e5) Dateinamen (.claude-Segment) ⇒ Grund; (e6) Grenzen (Agent zu groß, nicht gelesen; mehr als 20 Vorschläge); (e7)
 * ziel_existiert auch in anderer Schreibweise; (e8) ziel_ignoriert über echtes git (`.claude/` ignoriert ⇒ true, sonst false);
 * (p1) GET …/abnahme mit Vorschlägen im Arbeitsordner ⇒ faehigkeitVorschlaege; (p2) ohne Vorschläge ⇒ Feld fehlt, Antwort sonst
 * gleich der mit Vorschlägen ohne das Feld und gleich der vor dem Anlegen; (p3) ohne Arbeitsordner (Bestand) ⇒ kein Feld, auch
 * wenn der Projektordner vorschlaege/ trägt; (r1) Auftrag der Ausführung im Arbeitsordner trägt die Regelzeile, ohne
 * Arbeitsordner nicht; (r2) Architekten-Auftrag (Modus feature und projekt) trägt die Form-Empfehlung; die Zählung
 * starteWorkflowSchritt( entfiel in F45 W2b-1 (nur check-f15-workflow).
 * Neue Module werden dynamisch importiert: auf main fehlen sie ⇒ Befund je Fall statt Absturz (Rot-Nachweis per git archive,
 * F-1127). (p2)/(p3) sind auf main grün (dort gibt es das Feld nie) — ihr Rot-Nachweis ist eine Sabotage-Kopie (Feld
 * unbedingt bzw. ohne Bedingung „Arbeitsordner“).
 *
 * (e9) unbekannter Eintrag unter vorschlaege/faehigkeiten/ (z. B. agents in Einzahl) ⇒ gemeldet, nicht still übergangen.
 *
 * Wird aufgerufen von: `npm run check:gates` (und damit `npm run check`).
 *
 * Wichtig: weitere Randfälle der Erkennung (Agent als Datei-Verknüpfung, Behälter als Verknüpfung, „Name nicht schlicht“,
 * CLAUDE.md, Zahl der Einträge und Bytes eines Skills, Gesamtgrenze, Projekt-Commands, SKILL.md in anderer Schreibweise,
 * Worktree) belegt src/faehigkeiten/vorschlag.test.ts in derselben Kette (`npm run check`); hier steht je Regel ein Fall.
 * git läuft ohne globale Konfiguration des Entwicklers (GIT_CONFIG_GLOBAL für die Fixtures; HOME/XDG_CONFIG_HOME für den
 * Git-Starter, der GIT_*-Variablen entfernt), sonst hinge (e8) an dessen core.excludesFile.
 *
 * Aufruf: node scripts/check-f45-fb1-faehigkeit-vorschlag.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { baueArchitektAuftragstext } from '../src/architekt/index.ts'
import { ermittleProjektFaehigkeiten } from '../src/faehigkeiten/index.ts'
import { registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { registriereWorkflow } from '../src/workflow/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'
import { erzeugeRequestHandler } from './leitstand-server.mjs'
import { schalteGitWartungAb } from './_wegwerf.ts'

const befunde = []
console.log('\n=== F45-FB-1a-Fähigkeit-Vorschlag-Check ===\n')
const aufraeumen = []
const dienste = []

/**
 * Meldet einen Fall: ✓ bei erfüllter Bedingung, sonst ein Befund.
 * @param bedingung - erfüllt?
 * @param ok - Text bei Erfolg
 * @param fehler - Befundtext
 */
function pruefe(bedingung, ok, fehler) {
  if (bedingung) console.log(`  ✓ ${ok}`)
  else befunde.push(fehler)
}

/** Importiert ein neues Modul; fehlt es (main), null. @param pfad - relativer Pfad @returns Modul oder null */
async function neuesModul(pfad) {
  try {
    return await import(pfad)
  } catch (fehler) {
    console.error(`  (Modul ${pfad} nicht ladbar: ${fehler.message})`)
    return null
  }
}

const vorschlag = await neuesModul('../src/faehigkeiten/vorschlag.ts')
const FEHLT = 'src/faehigkeiten/vorschlag.ts fehlt'

/** Neues tmp-Verzeichnis. @param name - Präfix @returns Pfad */
function tmp(name) {
  const p = join(tmpdir(), `f45-fb1-${name}-${randomUUID().slice(0, 8)}`)
  mkdirSync(p, { recursive: true })
  aufraeumen.push(p)
  return p
}

// qa FB-1a 7: check-ignore ohne globale/System-git-Konfiguration des Entwicklers (gilt auch für die Kindprozesse des Servers).
const gitKonfig = tmp('gitcfg')
process.env.GIT_CONFIG_GLOBAL = join(gitKonfig, 'leer')
process.env.GIT_CONFIG_NOSYSTEM = '1'
// Der Git-Starter (fuehreGitAsync) entfernt jede GIT_*-Variable — für pruefeZielIgnoriert zeigen HOME und XDG_CONFIG_HOME
// deshalb zusätzlich auf einen leeren Ordner (globale Konfiguration); die System-Konfiguration der git-Installation gilt dort mit.
process.env.HOME = gitKonfig
process.env.XDG_CONFIG_HOME = gitKonfig

const skillText = (name, zusatz = '') => `---\nname: ${name}\ndescription: Prüft etwas.\n${zusatz}---\n\nInhalt\n`
const agentText = (name) => `---\nname: ${name}\ndescription: Liest Code.\ntools: Read, Grep\n---\n\nDu liest.\n`

/** Schreibt Dateien unter wurzel (relativer Pfad mit '/' → Inhalt). @param wurzel - Wurzel @param dateien - Dateien */
function lege(wurzel, dateien) {
  for (const [rel, inhalt] of Object.entries(dateien)) {
    const voll = join(wurzel, ...rel.split('/'))
    mkdirSync(join(voll, '..'), { recursive: true })
    writeFileSync(voll, inhalt)
  }
}

/** Erkennung als Objekt name → Eintrag. @param wurzel - Wurzel @returns Objekt */
const nachName = (wurzel) => Object.fromEntries(vorschlag.erkenneFaehigkeitVorschlaege(wurzel).map((e) => [e.name, e]))

const VS = 'vorschlaege/faehigkeiten'
const KONTEXT = { katalog: new Map(), einstellungen: { an: [], aus: [], inhalt_freigaben: {} }, werkzeugNamen: ['Read', 'Grep'], referenz: { cli_version: '', agents: [], plugins: [], plugin_skills: [] } }

// ── (e) Erkennung ─────────────────────────────────────────────────────────────────────────────────────────────────────
{
  const w = tmp('e12')
  lege(w, { [`${VS}/skills/pruefen/SKILL.md`]: skillText('pruefen'), [`${VS}/skills/pruefen/teil/notiz.txt`]: 'x\n', [`${VS}/agents/leser.md`]: agentText('leser') })
  const ziel = tmp('e12-ziel')
  cpSync(join(w, ...VS.split('/')), join(ziel, '.claude'), { recursive: true })
  const start = ermittleProjektFaehigkeiten(ziel, KONTEXT)
  const g = vorschlag === null ? {} : nachName(w)
  const startHash = (s) => start.eintraege.find((e) => e.schluessel === s)?.hash
  pruefe(
    g.pruefen?.typ === 'skill' && g.pruefen.grund === null && g.pruefen.beschreibung === 'Prüft etwas.' && typeof g.pruefen.hash === 'string' && g.pruefen.hash === startHash('skill:pruefen'),
    '(e1) Skill-Vorschlag gültig, Hash = Hash des Starts nach dem Kopieren nach .claude/skills/.',
    `(e1) ${vorschlag === null ? FEHLT : JSON.stringify({ vorschlag: g.pruefen, start: startHash('skill:pruefen') })}`
  )
  pruefe(
    g.leser?.typ === 'agent' && g.leser.grund === null && g.leser.beschreibung === 'Liest Code.' && typeof g.leser.hash === 'string' && g.leser.hash === startHash('agent:leser'),
    '(e2) Agent-Vorschlag gültig, Hash = Hash des Starts nach dem Kopieren nach .claude/agents/.',
    `(e2) ${vorschlag === null ? FEHLT : JSON.stringify({ vorschlag: g.leser, start: startHash('agent:leser') })}`
  )
}
{
  const fremd = tmp('e3-fremd')
  writeFileSync(join(fremd, 'SKILL.md'), skillText('link'))
  const w = tmp('e3')
  mkdirSync(join(w, ...VS.split('/'), 'skills'), { recursive: true })
  let angelegt = true
  try {
    symlinkSync(fremd, join(w, ...VS.split('/'), 'skills', 'link'), 'junction')
  } catch {
    angelegt = false
  }
  if (!angelegt) console.log('  – (e3) übersprungen: keine Verknüpfung anlegbar')
  else {
    const e = vorschlag === null ? undefined : nachName(w).link
    pruefe(/Verknüpfung/.test(e?.grund ?? '') && e.hash === null && e.beschreibung === null, '(e3) Verknüpfung als Skill-Ordner ⇒ Grund, nichts durch den Link gelesen.', `(e3) ${vorschlag === null ? FEHLT : JSON.stringify(e)}`)
  }
}
{
  const w = tmp('e45')
  lege(w, {
    [`${VS}/skills/anders/SKILL.md`]: skillText('falsch'),
    [`${VS}/skills/feld/SKILL.md`]: skillText('feld', 'allowed-tools: Bash\n'),
    [`${VS}/skills/code-review/SKILL.md`]: skillText('code-review'),
    [`${VS}/skills/harness/SKILL.md`]: skillText('harness'),
    [`${VS}/skills/harness/.claude/settings.json`]: '{}',
  })
  const g = vorschlag === null ? {} : nachName(w)
  pruefe(
    /≠ Ordnername/.test(g.anders?.grund ?? '') && /nicht erlaubt/.test(g.feld?.grund ?? '') && /eingebauten Skills/.test(g['code-review']?.grund ?? ''),
    '(e4) name ≠ Ordner, Feld außerhalb der Positivliste, eingebauter Name ⇒ Grund.',
    `(e4) ${vorschlag === null ? FEHLT : JSON.stringify([g.anders?.grund, g.feld?.grund, g['code-review']?.grund])}`
  )
  pruefe(/\.claude\/ bzw\. CLAUDE\.md/.test(g.harness?.grund ?? ''), '(e5) .claude-Segment im Skill-Ordner ⇒ Grund.', `(e5) ${vorschlag === null ? FEHLT : JSON.stringify(g.harness)}`)
}
{
  const w = tmp('e6')
  const grenzen = vorschlag?.VORSCHLAG_GRENZEN ?? { agentBytes: 256 * 1024, vorschlaege: 20 }
  lege(w, { [`${VS}/agents/aa-gross.md`]: 'x'.repeat(grenzen.agentBytes + 1) })
  for (let i = 0; i < grenzen.vorschlaege; i++) lege(w, { [`${VS}/agents/b${String(i).padStart(2, '0')}.md`]: agentText(`b${String(i).padStart(2, '0')}`) })
  const v = vorschlag === null ? [] : vorschlag.erkenneFaehigkeitVorschlaege(w)
  pruefe(
    /größer als/.test(v[0]?.grund ?? '') && v[0].hash === null && v.length === grenzen.vorschlaege + 1 && /1 weitere nicht geprüft/.test(v.at(-1)?.grund ?? ''),
    '(e6) Agent zu groß ⇒ Grund, nicht gelesen; mehr als 20 Vorschläge ⇒ 20 und ein Eintrag mit Grund.',
    `(e6) ${vorschlag === null ? FEHLT : JSON.stringify({ erster: v[0], anzahl: v.length, letzter: v.at(-1) })}`
  )
}
{
  const w = tmp('e78')
  execFileSync('git', ['init', '--quiet'], { cwd: w })
  schalteGitWartungAb(w)
  lege(w, { '.gitignore': '.claude/agents/\n', [`${VS}/agents/qa.md`]: agentText('qa'), [`${VS}/skills/neu/SKILL.md`]: skillText('neu'), '.claude/agents/QA.md': agentText('QA') })
  const v = vorschlag === null ? [] : vorschlag.erkenneFaehigkeitVorschlaege(w)
  const g = Object.fromEntries(v.map((e) => [e.name, e]))
  pruefe(g.qa?.ziel_existiert === true && g.neu?.ziel_existiert === false, '(e7) ziel_existiert ohne Unterschied der Schreibweise (QA.md vorhanden ⇒ qa existiert).', `(e7) ${vorschlag === null ? FEHLT : JSON.stringify(v)}`)
  const m = vorschlag === null ? new Map() : await vorschlag.pruefeZielIgnoriert(w, v)
  pruefe(m.get(g.qa?.pfad) === true && m.get(g.neu?.pfad) === false, '(e8) ziel_ignoriert über git check-ignore: Regel .claude/agents/ ⇒ Agent true, Skill false.', `(e8) ${vorschlag === null ? FEHLT : JSON.stringify([...m])}`)
}

{
  const w = tmp('e9')
  lege(w, { [`${VS}/agent/leser.md`]: agentText('leser') })
  const v = vorschlag === null ? [] : vorschlag.erkenneFaehigkeitVorschlaege(w)
  pruefe(v.length === 1 && v[0].pfad === `${VS}/agent` && /unbekannter Eintrag/.test(v[0].grund ?? ''), '(e9) unbekannter Eintrag (agent/ in Einzahl) ⇒ gemeldet.', `(e9) ${vorschlag === null ? FEHLT : JSON.stringify(v)}`)
}

// ── (r2) Architekten-Auftrag ──────────────────────────────────────────────────────────────────────────────────────────
{
  const satz = 'Bei wiederkehrenden Aufgaben in der zusammenfassung die Form mit Begründung empfehlen: deterministisch/wiederholt → Skript/Gate; Urteil/Wissen → Skill; eigene Rolle mit eigenem Kontext → Agent; fremder Dienst/Daten → MCP (über die Sammlung).'
  pruefe(
    baueArchitektAuftragstext('x').includes(satz) && baueArchitektAuftragstext('x', 'projekt').includes(satz),
    '(r2) Architekten-Auftrag trägt die Form-Empfehlung (Modus feature und projekt).',
    '(r2) Form-Empfehlung fehlt im Architekten-Auftrag'
  )
}

// ── Umgebung: tmp-Repo auf main, Handler mit und ohne Arbeitsordner (Muster check-f45-b2b4a1-sichern) ────────────────────
const basis = tmp('server')
const git = (cwd, argumente) => execFileSync('git', argumente, { cwd, encoding: 'utf8' })
/**
 * tmp-Repo mit einem Commit auf branch (ohne Arbeitsordner sperrt die Vorbedingung den Start auf main).
 * @param name - Ordnername unter basis
 * @param branch - Branch
 * @returns Pfad
 */
function legeRepoAn(name, branch) {
  const wurzel = join(basis, name)
  mkdirSync(join(wurzel, '.claude'), { recursive: true })
  git(wurzel, ['init', '--quiet'])
  schalteGitWartungAb(wurzel)
  git(wurzel, ['config', 'user.email', 'test@example.invalid'])
  git(wurzel, ['config', 'user.name', 'Test'])
  git(wurzel, ['config', 'core.autocrlf', 'false'])
  git(wurzel, ['checkout', '--quiet', '-b', branch])
  writeFileSync(join(wurzel, '.claude', 'settings.json'), '{}\n')
  writeFileSync(join(wurzel, 'README.md'), 'Zeile 1\n')
  git(wurzel, ['add', '.'])
  git(wurzel, ['commit', '--quiet', '-m', 'init'])
  return wurzel
}
const repoMit = legeRepoAn('projekt', 'main')
const repoOhne = legeRepoAn('projekt-ohne', 'arbeit')
const startvorlagePfad = join(basis, 'startvorlage.json')
writeFileSync(startvorlagePfad, JSON.stringify(ladeStartvorlage('startvorlagen/beispielprojekt.json'), null, 2))
const vorlage = ladeStartvorlage(startvorlagePfad)
const profilReferenz = leiteProfilReferenzAb(vorlage)

/** Auftragstexte der Attrappen-Läufe je laufId. */
const auftragstexte = new Map()

/**
 * Handler und Dienst für einen Kontrollzustand.
 * @param basisVerzeichnis - Kontrollzustand
 * @param arbeitsordner - Option Arbeitsordner
 * @param repoWurzel - Projektordner
 * @returns { basisUrl, ladeOptionen }
 */
async function starteDienst(basisVerzeichnis, arbeitsordner, repoWurzel) {
  const ladeOptionen = { basisVerzeichnis, schreiber: () => {} }
  const handler = erzeugeRequestHandler({
    basisVerzeichnis,
    repoWurzel,
    startvorlagePfad,
    installWurzel: process.cwd(),
    fuehreAufgabeDurchFn: async (laufId, profil, eingaben) => {
      auftragstexte.set(laufId, eingaben?.auftragstext ?? '')
      const rohstromPfad = join(basis, `rohstrom-${laufId}.json`)
      writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: 'Fertig.' }) }))
      registriereKernArtefakt(`laufakte-${laufId}`, profil ?? profilReferenz, { erzeuger: 'check-f45-fb1' }, { worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad, inhalts_hash: 'x' } }, [], ladeOptionen)
      return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH', bypass_verdacht_anzahl: 0 }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
    },
    arbeitsordner,
    arbeitsordnerNpm: async () => ({ code: 0, stdout: '', stderr: '', zeitueberschritten: false }),
    arbeitsordnerE183: () => ({ ok: true }),
    standCacheMs: 0,
  })
  const dienst = createServer((req, res) => handler(req, res))
  await new Promise((r) => dienst.listen(0, '127.0.0.1', r))
  dienste.push(dienst)
  return { basisUrl: `http://127.0.0.1:${dienst.address().port}`, ladeOptionen }
}

const SCHREIBEND = { schritt_id: 'schritt-1-ausfuehrung', rolle: 'ausfuehrung', werkzeugsatz: 'schreibend', worker: 'claude-code', modell: 'claude-sonnet-5', eingaben: [], output_schema: null, freigabe: 'ZWINGEND', freigabe_erteilt: true, risiko: 'Gate-Fixture.', zeitgrenze_ms: 600000, nachfolger: null, status: 'OFFEN', lauf_id: null }

/**
 * Auftrag + Workflow registrieren.
 * @param dienst - { basisUrl, ladeOptionen }
 * @param kennung - Teil von Titel und id
 * @param felder - Überschreibungen
 * @returns workflowId
 */
async function legeAblaufAn(dienst, kennung, felder = {}) {
  const { auftragId } = await (await fetch(`${dienst.basisUrl}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel: `Gate ${kennung}`, auftragstext: 'Baue einen Skill.' }) })).json()
  const workflowId = `f45-fb1-${kennung}-${randomUUID()}`
  registriereWorkflow({ workflow_schema: 'v0', workflow_id: workflowId, auftrag_id: auftragId, version: 1, ziel: `Gate ${kennung}.`, status: 'OFFEN', aktiver_schritt_id: SCHREIBEND.schritt_id, grenzen: { max_schritte: 6, max_replans: 1 }, schritte: [SCHREIBEND], ...felder }, profilReferenz, dienst.ladeOptionen)
  return workflowId
}

/** Wartet, bis pruefen wahr ist (höchstens 20 s). @param pruefen - asynchrone Prüfung @returns letzter Wert */
async function warteBis(pruefen) {
  const ende = Date.now() + 20000
  let wert = await pruefen()
  while (!wert && Date.now() < ende) {
    await new Promise((r) => setTimeout(r, 25))
    wert = await pruefen()
  }
  return wert
}

const json = async (url, optionen) => await (await fetch(url, optionen)).json()

try {
  const mit = await starteDienst(join(basis, 'kontrollzustand'), true, repoMit)
  const ohne = await starteDienst(join(basis, 'kontrollzustand-ohne'), false, repoOhne)

  // ── (p1)(p2)(r1) Ablauf mit Arbeitsordner ───────────────────────────────────────────────────────────────────────────
  const w1 = await legeAblaufAn(mit, 'w1')
  await fetch(`${mit.basisUrl}/api/workflows/${w1}/starten`, { method: 'POST' })
  await warteBis(async () => (await json(`${mit.basisUrl}/api/workflows/${w1}`)).arbeitsordner?.status === 'BEREIT')
  const ao = (await json(`${mit.basisUrl}/api/workflows/${w1}`)).arbeitsordner
  await fetch(`${mit.basisUrl}/api/workflows/${w1}/starten`, { method: 'POST' })
  const fertig = await warteBis(async () => (await json(`${mit.basisUrl}/api/workflows/${w1}`)).daten?.status === 'ABGESCHLOSSEN')
  const laufId = (await json(`${mit.basisUrl}/api/workflows/${w1}`)).daten?.schritte?.[0]?.lauf_id
  if (!fertig || typeof ao?.pfad !== 'string' || !existsSync(ao.pfad)) befunde.push(`(p0) Ablauf mit Arbeitsordner nicht abgeschlossen: ${JSON.stringify({ fertig, ao })}`)
  const regel = vorschlag?.FAEHIGKEIT_VORSCHLAG_REGEL ?? 'Fähigkeit bauen: Agents/Skills nie unter .claude/'
  pruefe((auftragstexte.get(laufId) ?? '').includes(regel), '(r1) Auftrag der Ausführung im Arbeitsordner trägt die Regelzeile zum Vorschlagsordner.', `(r1) Regelzeile fehlt im Auftrag (Lauf ${laufId})`)

  const abnahme = async (dienst, id) => await json(`${dienst.basisUrl}/api/workflows/${id}/abnahme`)
  const vorher = await abnahme(mit, w1)
  lege(ao.pfad, { [`${VS}/skills/pruefen/SKILL.md`]: skillText('pruefen'), [`${VS}/agents/leser.md`]: agentText('leser') })
  const mitVorschlag = await abnahme(mit, w1)
  const p = mitVorschlag.faehigkeitVorschlaege
  pruefe(
    Array.isArray(p) && isDeepStrictEqual(p.map((e) => [e.typ, e.name, e.grund, typeof e.hash, e.ziel_existiert, typeof e.ziel_ignoriert]), [['skill', 'pruefen', null, 'string', false, 'boolean'], ['agent', 'leser', null, 'string', false, 'boolean']]),
    '(p1) GET …/abnahme mit Vorschlägen im Arbeitsordner ⇒ faehigkeitVorschlaege (typ, name, hash, ziel_existiert, ziel_ignoriert).',
    `(p1) ${JSON.stringify(p)}`
  )
  raeumeVerzeichnis(join(ao.pfad, 'vorschlaege'))
  const nachher = await abnahme(mit, w1)
  const { faehigkeitVorschlaege: _weg, ...mitOhneFeld } = mitVorschlag
  pruefe(
    !('faehigkeitVorschlaege' in vorher) && !('faehigkeitVorschlaege' in nachher) && isDeepStrictEqual(vorher, nachher) && isDeepStrictEqual(mitOhneFeld, vorher),
    '(p2) ohne Vorschläge fehlt das Feld; die Antwort ist sonst gleich (vor dem Anlegen, nach dem Entfernen, mit Vorschlägen ohne das Feld).',
    `(p2) ${JSON.stringify({ vorher: Object.keys(vorher), nachher: Object.keys(nachher), gleich: isDeepStrictEqual(vorher, nachher), mitOhneFeld: isDeepStrictEqual(mitOhneFeld, vorher) })}`
  )

  // ── (p3)(r1) ohne Arbeitsordner ──────────────────────────────────────────────────────────────────────────────────────
  const w2 = await legeAblaufAn(ohne, 'w2')
  await fetch(`${ohne.basisUrl}/api/workflows/${w2}/starten`, { method: 'POST' })
  await warteBis(async () => (await json(`${ohne.basisUrl}/api/workflows/${w2}`)).daten?.status === 'ABGESCHLOSSEN')
  const laufOhne = (await json(`${ohne.basisUrl}/api/workflows/${w2}`)).daten?.schritte?.[0]?.lauf_id
  lege(repoOhne, { [`${VS}/agents/leser.md`]: agentText('leser') })
  const abnahmeOhne = await abnahme(ohne, w2)
  pruefe(
    typeof laufOhne === 'string' && !(auftragstexte.get(laufOhne) ?? regel).includes(regel) && abnahmeOhne.workflowId === w2 && !('faehigkeitVorschlaege' in abnahmeOhne),
    '(p3) ohne Arbeitsordner: keine Regelzeile im Auftrag und kein Feld in der Abnahme, auch wenn der Projektordner vorschlaege/ trägt.',
    `(p3) ${JSON.stringify({ laufOhne, regel: (auftragstexte.get(laufOhne) ?? '').includes(regel), felder: Object.keys(abnahmeOhne) })}`
  )
} finally {
  for (const d of dienste) if (d.listening) await new Promise((r) => d.close(() => r()))
  for (const pfad of aufraeumen) raeumeVerzeichnis(pfad)
}

if (befunde.length > 0) {
  console.error(`\n✗ ${befunde.length} Befund(e):`)
  for (const b of befunde) console.error(`  - ${b}`)
  process.exit(1)
}
console.log('\n✓ Keine Befunde.')
